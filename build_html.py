#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_html.py
================================================================================
Bündelt die ES-Module aus js/ und das Stylesheet aus css/ zu EINER
eigenständigen Datei "vierendeel_tool.html", die sich per Doppelklick öffnen
lässt (file:// erlaubt keine Modul-Imports).

Die Module bleiben die Quelle - hier wird nur gebündelt:
  * import-Zeilen werden in Zugriffe auf eine Modultabelle umgeschrieben
  * jedes Modul läuft in einer eigenen Funktion, damit gleichnamige lokale
    Hilfsfunktionen (esc, n, rect, ...) sich nicht in die Quere kommen
  * die Reihenfolge ergibt sich aus einer topologischen Sortierung

Aufruf:  python3 build_html.py
================================================================================
"""

import hashlib
import re
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

WURZEL = Path(__file__).resolve().parent
JS = WURZEL / "js"
CSS = WURZEL / "css" / "style.css"
QUELLE_HTML = WURZEL / "index.html"
DB_JSON = WURZEL / "data" / "tragjoche.json"
AT_JSON = WURZEL / "data" / "anbauteile.json"
FL_JSON = WURZEL / "data" / "fl_bauteile.json"
ZIEL = WURZEL / "vierendeel_tool.html"
EINSTIEG = "app.js"
SW = WURZEL / "sw.js"
MANIFEST = WURZEL / "manifest.webmanifest"
ICONS = WURZEL / "icons"

RE_IMPORT_NAMED = re.compile(
    r"^\s*import\s*\{([^}]*)\}\s*from\s*['\"]\./([\w.\-]+)['\"]\s*;?\s*$", re.M)
RE_IMPORT_NS = re.compile(
    r"^\s*import\s*\*\s*as\s+(\w+)\s+from\s*['\"]\./([\w.\-]+)['\"]\s*;?\s*$", re.M)
RE_IMPORT_BARE = re.compile(
    r"^\s*import\s*['\"]\./([\w.\-]+)['\"]\s*;?\s*$", re.M)

RE_EXPORT_DECL = re.compile(
    r"^\s*export\s+(?:(async)\s+)?(const|let|var|function|class)\s+(\w+)", re.M)
RE_EXPORT_LISTE = re.compile(r"^\s*export\s*\{([^}]*)\}\s*;?\s*$", re.M)


def abhaengigkeiten(text):
    d = []
    d += [m.group(2) for m in RE_IMPORT_NAMED.finditer(text)]
    d += [m.group(2) for m in RE_IMPORT_NS.finditer(text)]
    d += [m.group(1) for m in RE_IMPORT_BARE.finditer(text)]
    return d


def sortiere(module):
    """Topologische Sortierung; erkennt Zyklen und meldet sie."""
    fertig, offen, reihenfolge = set(), set(), []

    def besuche(name):
        if name in fertig:
            return
        if name in offen:
            raise SystemExit(f"Zirkuläre Abhängigkeit bei {name}")
        if name not in module:
            raise SystemExit(f"Modul nicht gefunden: {name}")
        offen.add(name)
        for d in abhaengigkeiten(module[name]):
            besuche(d)
        offen.discard(name)
        fertig.add(name)
        reihenfolge.append(name)

    besuche(EINSTIEG)
    return reihenfolge


def umschreiben(name, text):
    """Ein Modul in eine Fabrikfunktion verwandeln."""
    exporte = []

    def merke_decl(m):
        exporte.append(m.group(3))
        vorne = f"{m.group(1)} " if m.group(1) else ""
        return f"{vorne}{m.group(2)} {m.group(3)}"

    def merke_liste(m):
        for teil in m.group(1).split(","):
            teil = teil.strip()
            if not teil:
                continue
            # "a as b" -> exportiert wird b
            exporte.append(teil.split(" as ")[-1].strip())
        return ""

    def benannter_import(m):
        # "a as b" ist gültige Import-, aber KEINE gültige Destrukturierungs-
        # syntax: dort heisst es "a: b". Ohne diese Umschreibung bricht das
        # Bundle mit einem Syntaxfehler, während die Modulversion läuft - ein
        # Fehler, der sich erst in der ausgelieferten Datei zeigt.
        teile = []
        for teil in m.group(1).split(","):
            teil = teil.strip()
            if not teil:
                continue
            teile.append(re.sub(r"\s+as\s+", ": ", teil))
        return f"const {{ {', '.join(teile)} }} = __M['{m.group(2)}'];"

    text = RE_IMPORT_NAMED.sub(benannter_import, text)
    text = RE_IMPORT_NS.sub(
        lambda m: f"const {m.group(1)} = __M['{m.group(2)}'];", text)
    text = RE_IMPORT_BARE.sub(lambda m: f"__M['{m.group(1)}'];", text)
    text = RE_EXPORT_DECL.sub(merke_decl, text)
    text = RE_EXPORT_LISTE.sub(merke_liste, text)

    if re.search(r"^\s*export\s", text, re.M):
        rest = [l for l in text.splitlines() if re.match(r"^\s*export\s", l)]
        raise SystemExit(f"{name}: nicht umgeschriebene export-Zeile:\n  " + "\n  ".join(rest))

    exporte = sorted(set(exporte))
    rueck = "return {" + ", ".join(exporte) + "};"
    return (f"__M['{name}'] = (function () {{\n"
            f"/* ===== {name} ===== */\n{text}\n{rueck}\n}})();\n")


def pruefe_syntax(js):
    """Das gebündelte Skript durch node --check schicken, falls vorhanden."""
    node = shutil.which("node")
    if not node:
        print("Hinweis: node nicht gefunden – Bundle nicht syntaxgeprüft.")
        return
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False,
                                     encoding="utf-8") as f:
        f.write(js)
        pfad = f.name
    try:
        e = subprocess.run([node, "--check", pfad], capture_output=True, text=True)
        if e.returncode:
            meldung = (e.stderr or "").strip().splitlines()
            raise SystemExit("Das gebündelte Skript ist nicht lauffähig:\n  "
                             + "\n  ".join(meldung[:12]))
    finally:
        os.unlink(pfad)


# --- Dienstarbeiter ---------------------------------------------------------

# Der erzeugte Block in sw.js. Von Hand gepflegt liefe die Liste den Modulen
# hinterher; genau dann fehlte offline eine Datei.
RE_SW_BLOCK = re.compile(
    r"(// === von build_html\.py erzeugt[^\n]*\n).*?(// === Ende erzeugter Block)",
    re.S)


def schale():
    """
    Alles, was die Anwendung zum Starten braucht - in Ladereihenfolge.

    OHNE data/. Die drei Datenbanken sind KEINE Voraussetzung für den Start:
    sie können als Datenpaket im Browser hinterlegt sein und dann gibt es die
    Dateien gar nicht (öffentliche Ablage). Sie hier aufzuführen hiesse, bei
    jeder Einrichtung drei Fehlschläge zu erzeugen. Liegen sie doch daneben,
    nimmt der Dienstarbeiter sie beim ersten Gebrauch von selbst auf - danach
    ist auch dieser Weg offline vollständig.
    """
    dateien = ["./", "index.html", "css/style.css", "manifest.webmanifest"]
    dateien += ["js/" + p.name for p in sorted(JS.glob("*.js"))]
    dateien += ["icons/" + p.name for p in sorted(ICONS.glob("*"))
                if p.suffix in (".png", ".svg")]
    return dateien


def schreibe_sw():
    """
    Trägt Dateiliste und Fassung in sw.js ein.

    Die Fassung ist ein Kurzabdruck über den Inhalt aller abgelegten Dateien:
    sie ändert sich genau dann, wenn sich etwas geändert hat. Ein Datum oder
    eine Nummer von Hand wäre entweder zu oft oder zu selten neu - beides
    liefert dem Benutzer den falschen Stand.
    """
    if not SW.exists():
        print("Hinweis: sw.js fehlt - kein Dienstarbeiter erzeugt.")
        return
    liste = schale()
    h = hashlib.sha256()
    for rel in liste:
        pfad = WURZEL / rel
        if pfad.is_file():
            h.update(rel.encode("utf-8"))
            h.update(pfad.read_bytes())
    fassung = h.hexdigest()[:12]

    eintraege = "\n".join(f"  '{rel}'," for rel in liste)
    block = (f"const VERSION = '{fassung}';\n"
             f"const SCHALE = [\n{eintraege}\n];\n")

    text = SW.read_text(encoding="utf-8")
    neu, n = RE_SW_BLOCK.subn(lambda m: m.group(1) + block + m.group(2), text)
    if n != 1:
        raise SystemExit("sw.js: erzeugter Block nicht gefunden "
                         "(Markierungen '=== von build_html.py erzeugt' / "
                         "'=== Ende erzeugter Block').")
    if neu != text:
        SW.write_text(neu, encoding="utf-8")
    print(f"Dienstarbeiter: sw.js, Fassung {fassung}, {len(liste)} Dateien abgelegt")


def main(ohne_daten=False):
    """
    ohne_daten: die drei Datenbanken NICHT einbetten. Ergibt eine Ausgabe, die
    ohne Zahlen des Betreibers weitergegeben werden kann; die Anwendung fragt
    dann beim Start nach einem Datenpaket (js/data.paket.js).
    """
    module = {p.name: p.read_text(encoding="utf-8") for p in sorted(JS.glob("*.js"))}
    if EINSTIEG not in module:
        raise SystemExit(f"Einstiegsmodul {EINSTIEG} fehlt in {JS}")

    reihenfolge = sortiere(module)
    ungenutzt = sorted(set(module) - set(reihenfolge))
    if ungenutzt:
        print("Hinweis: nicht eingebundene Module:", ", ".join(ungenutzt))

    bundle = ["(function () {\n'use strict';\nconst __M = {};\n"]
    for name in reihenfolge:
        bundle.append(umschreiben(name, module[name]))
    bundle.append("})();\n")
    js = "".join(bundle)

    html = QUELLE_HTML.read_text(encoding="utf-8")
    TAG_CSS = '<link rel="stylesheet" href="css/style.css">'
    TAG_JS = '<script type="module" src="js/app.js"></script>'
    for tag in (TAG_CSS, TAG_JS):
        if tag not in html:
            raise SystemExit(f"Platzhalter fehlt in index.html:\n  {tag}")

    # Rohe Steuerzeichen überleben das Einbetten in <script> nicht - der
    # HTML-Parser ersetzt oder verschluckt sie. In der Modulversion fällt das
    # nicht auf, im Bundle bricht der Code. Deshalb hier hart abweisen.
    roh = {ord(c) for c in js if ord(c) < 0x20 and c not in "\n\r\t"}
    if roh:
        stellen = []
        for zeile, inhalt in enumerate(js.splitlines(), 1):
            if any(ord(c) < 0x20 and c not in "\t" for c in inhalt):
                stellen.append(f"    Zeile {zeile}: {inhalt.strip()[:70]!r}")
        raise SystemExit(
            "Rohe Steuerzeichen im Bundle ("
            + ", ".join(f"0x{c:02X}" for c in sorted(roh)) + ").\n"
            + "Als \\xNN-Escape schreiben statt als rohes Zeichen.\n"
            + "\n".join(stellen[:5]))

    # Typendatenbank einbetten, damit die eigenständige Datei ohne fetch auskommt
    TAG_DB = '<script type="application/json" id="tragjoch-db"></script>'
    if TAG_DB not in html:
        raise SystemExit(f"Platzhalter fehlt in index.html:\n  {TAG_DB}")
    # OHNE DATEN AUCH OHNE DATEIEN.
    # In einer öffentlichen Ablage liegen die drei Datenbanken nicht bei
    # (siehe .gitignore). Der Bau darf daran nicht scheitern - er erzeugt dann
    # eben die datenfreie Ausgabe, und die Anwendung fragt beim Start nach
    # einem Datenpaket.
    if not ohne_daten and not all(p.exists() for p in (DB_JSON, AT_JSON, FL_JSON)):
        fehlend = [p.name for p in (DB_JSON, AT_JSON, FL_JSON) if not p.exists()]
        print("Hinweis: " + ", ".join(fehlend) + " fehlt/fehlen – "
              "es wird OHNE DATEN gebaut.")
        ohne_daten = True

    dbtext = DB_JSON.read_text(encoding="utf-8") if DB_JSON.exists() else "{}"
    if "</script" in dbtext:
        raise SystemExit("tragjoche.json enthält '</script' – das bricht die Einbettung.")
    if not ohne_daten:
        html = html.replace(
            TAG_DB,
            '<script type="application/json" id="tragjoch-db">\n' + dbtext + "\n</script>")

    TAG_AT = '<script type="application/json" id="anbauteil-db"></script>'
    if TAG_AT not in html:
        raise SystemExit(f"Platzhalter fehlt in index.html:\n  {TAG_AT}")
    attext = AT_JSON.read_text(encoding="utf-8") if AT_JSON.exists() else "{}"
    if "</script" in attext:
        raise SystemExit("anbauteile.json enthält '</script' – das bricht die Einbettung.")
    if not ohne_daten:
        html = html.replace(
            TAG_AT,
            '<script type="application/json" id="anbauteil-db">\n' + attext + "\n</script>")

    # Lasttabelle der Fahrleitungsbauteile
    TAG_FL = '<script type="application/json" id="fl-bauteil-db"></script>'
    if TAG_FL not in html:
        raise SystemExit(f"Platzhalter fehlt in index.html:\n  {TAG_FL}")
    fltext = FL_JSON.read_text(encoding="utf-8") if FL_JSON.exists() else "{}"
    if "</script" in fltext:
        raise SystemExit("fl_bauteile.json enthält '</script' – das bricht die Einbettung.")
    if not ohne_daten:
        html = html.replace(
            TAG_FL,
            '<script type="application/json" id="fl-bauteil-db">\n' + fltext + "\n</script>")

    # Die Einzeldatei hat keine Nachbardateien: kein Manifest, keine Symbole,
    # kein Dienstarbeiter. Ohne diese Zeile meldet der Browser nur ein
    # fehlendes Manifest; js/pwa.js erkennt an ihrem Fehlen ausserdem, dass es
    # sich um die gebündelte Fassung handelt, und hält still.
    TAG_MANIFEST = '<link rel="manifest" href="manifest.webmanifest">'
    if TAG_MANIFEST not in html:
        raise SystemExit(f"Platzhalter fehlt in index.html:\n  {TAG_MANIFEST}")
    html = html.replace(TAG_MANIFEST, "")

    html = html.replace(TAG_CSS, "<style>\n" + CSS.read_text(encoding="utf-8") + "\n</style>")
    html = html.replace(TAG_JS, "<script>\n" + js + "\n</script>")

    # Die datenfreie Ausgabe bekommt einen eigenen Namen, damit sie die
    # vollständige nicht überschreibt.
    ziel = ZIEL.with_name(ZIEL.stem + "_ohne_daten" + ZIEL.suffix) if ohne_daten else ZIEL
    # SYNTAXPRÜFUNG DES BUNDLES
    # Die Modulversion verträgt Schreibweisen, die das Bundle nicht verträgt
    # (siehe benannter_import). Ein Syntaxfehler zeigt sich dort erst beim
    # Öffnen der Datei - eine weisse Seite ohne Fehlermeldung. Deshalb hier
    # prüfen, bevor geschrieben wird.
    pruefe_syntax(js)

    ziel.write_text(html, encoding="utf-8")
    kb = ziel.stat().st_size / 1024
    print("=" * 70)
    print(f"Eigenständige Datei erzeugt: {ziel.name}  ({kb:.0f} kB)"
          + ("  OHNE DATEN – Datenpaket beim Start laden" if ohne_daten else ""))
    print(f"Module gebündelt ({len(reihenfolge)}): " + " -> ".join(reihenfolge))
    print("=" * 70)


if __name__ == "__main__":
    # Der Dienstarbeiter gehört zur Modulversion (index.html) und wird bei
    # jedem Bauen aufgefrischt, unabhängig davon, welche Einzeldatei entsteht.
    schreibe_sw()
    sys.exit(main(ohne_daten="--ohne-daten" in sys.argv))
