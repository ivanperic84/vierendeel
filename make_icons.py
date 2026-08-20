#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_icons.py
================================================================================
Erzeugt die Symbole der Anwendung (icons/) aus einer Zeichenvorschrift.

WOZU EIN SKRIPT STATT EINER BILDDATEI
Ein installierbares Web-Programm braucht dasselbe Zeichen in mehreren Grössen
und zweimal in unterschiedlichem Zuschnitt (frei und "maskable" - das Betriebs-
system schneidet dort eine eigene Form heraus). Von Hand gepflegt laufen diese
Fassungen auseinander. Hier steht die Form EINMAL, alles andere fällt ab.

Ohne Fremdbibliotheken: PNG ist ein zlib-Strom mit Zeilenfilter, das schreibt
sich in zwanzig Zeilen. Gezeichnet wird vierfach vergrössert und danach
gemittelt - das ergibt die weichen Kanten der Rundungen.

Das Zeichen: ein Vierendeel-Träger - zwei Gurte, dazwischen Pfosten, keine
Diagonalen. Genau das, was die Anwendung rechnet.

Aufruf:  python3 make_icons.py
================================================================================
"""

import struct
import zlib
from pathlib import Path

WURZEL = Path(__file__).resolve().parent
ZIEL = WURZEL / "icons"

# Farben aus design.js (dunkles Thema), damit das Symbol zur Oberfläche passt.
GRUND = (0x14, 0x16, 0x1C, 255)      # Grundfläche
STAHL = (0x7C, 0x8D, 0xE0, 255)      # Gurte und Pfosten (Akzent)
BLECH = (0xD2, 0x95, 0x3C, 255)      # Bindebleche (Akzentfarbe der Bleche)

UEBER = 4                            # Überabtastung für weiche Kanten


# --- PNG --------------------------------------------------------------------

def png(pfad, breite, hoehe, roh):
    """Schreibt RGBA-Bytes als PNG (Farbtyp 6, 8 bit)."""
    zeilen = b"".join(b"\x00" + bytes(roh[y * breite * 4:(y + 1) * breite * 4])
                      for y in range(hoehe))

    def block(typ, daten):
        return (struct.pack(">I", len(daten)) + typ + daten
                + struct.pack(">I", zlib.crc32(typ + daten) & 0xFFFFFFFF))

    pfad.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + block(b"IHDR", struct.pack(">IIBBBBB", breite, hoehe, 8, 6, 0, 0, 0))
        + block(b"IDAT", zlib.compress(zeilen, 9))
        + block(b"IEND", b""))


# --- Zeichenfläche ----------------------------------------------------------

class Blatt:
    """Zeichenfläche in Einheitskoordinaten (0..1), intern überabgetastet."""

    def __init__(self, kante):
        self.n = kante * UEBER
        self.px = bytearray(self.n * self.n * 4)      # alles durchsichtig

    def _setze(self, x, y, farbe):
        i = (y * self.n + x) * 4
        self.px[i:i + 4] = bytes(farbe)

    def rechteck(self, x0, y0, x1, y1, farbe):
        n = self.n
        a, b = int(x0 * n), int(x1 * n)
        c, d = int(y0 * n), int(y1 * n)
        for y in range(max(c, 0), min(d, n)):
            for x in range(max(a, 0), min(b, n)):
                self._setze(x, y, farbe)

    def rundrechteck(self, x0, y0, x1, y1, r, farbe):
        """Gefülltes Rechteck mit Eckradius r (in Einheitskoordinaten)."""
        n = self.n
        a, b = int(x0 * n), int(x1 * n)
        c, d = int(y0 * n), int(y1 * n)
        rr = r * n
        for y in range(max(c, 0), min(d, n)):
            for x in range(max(a, 0), min(b, n)):
                # Abstand zum inneren Rechteck, das um rr eingerückt ist
                dx = max(a + rr - x - 0.5, 0, x + 0.5 - (b - rr))
                dy = max(c + rr - y - 0.5, 0, y + 0.5 - (d - rr))
                if dx * dx + dy * dy <= rr * rr:
                    self._setze(x, y, farbe)

    def kreis(self, cx, cy, r, farbe):
        n = self.n
        for y in range(n):
            for x in range(n):
                dx, dy = (x + 0.5) / n - cx, (y + 0.5) / n - cy
                if dx * dx + dy * dy <= r * r:
                    self._setze(x, y, farbe)

    def fertig(self):
        """Mittelt die Überabtastung heraus; liefert RGBA in Zielgrösse."""
        k = self.n // UEBER
        aus = bytearray(k * k * 4)
        f = UEBER * UEBER
        for y in range(k):
            for x in range(k):
                sr = sg = sb = sa = 0
                for dy in range(UEBER):
                    zeile = ((y * UEBER + dy) * self.n + x * UEBER) * 4
                    for dx in range(UEBER):
                        i = zeile + dx * 4
                        alpha = self.px[i + 3]
                        # vormultipliziert mitteln, sonst franst die Kante aus
                        sr += self.px[i] * alpha
                        sg += self.px[i + 1] * alpha
                        sb += self.px[i + 2] * alpha
                        sa += alpha
                j = (y * k + x) * 4
                if sa:
                    aus[j] = sr // sa
                    aus[j + 1] = sg // sa
                    aus[j + 2] = sb // sa
                    aus[j + 3] = sa // f
        return aus


# --- Das Zeichen ------------------------------------------------------------

def traeger(bl, x0, x1, y0, y1, felder=4):
    """Vierendeel-Träger: zwei Gurte, dazwischen Pfosten, dazu Bindebleche."""
    h = y1 - y0
    gurt = h * 0.20                  # Gurthöhe
    pfosten = (x1 - x0) * 0.055      # Pfostenbreite

    bl.rechteck(x0, y0, x1, y0 + gurt, STAHL)          # Obergurt
    bl.rechteck(x0, y1 - gurt, x1, y1, STAHL)          # Untergurt

    # Pfosten: die beiden Endschotte stehen bündig, dazwischen gleiche Felder
    for i in range(felder + 1):
        m = x0 + (x1 - x0) * i / felder
        a = min(max(m - pfosten / 2, x0), x1 - pfosten)
        farbe = STAHL if i in (0, felder) else BLECH
        bl.rechteck(a, y0 + gurt, a + pfosten, y1 - gurt, farbe)


def zeichen(kante, rand, rund=True):
    """
    rand: Anteil der Kantenlänge, den das Zeichen frei lässt.
          Für "maskable" grosszügig, damit der Zuschnitt nichts abschneidet.
    """
    bl = Blatt(kante)
    if rund:
        bl.rundrechteck(0, 0, 1, 1, 0.22, GRUND)
    else:
        bl.rechteck(0, 0, 1, 1, GRUND)
    traeger(bl, rand, 1 - rand, 0.5 - (0.5 - rand) * 0.62,
            0.5 + (0.5 - rand) * 0.62)
    return bl.fertig()


SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#14161c"/>
  <g fill="#7c8de0">
    <rect x="12" y="26.4" width="76" height="9.4"/>
    <rect x="12" y="64.2" width="76" height="9.4"/>
    <rect x="12" y="35.8" width="4.2" height="28.4"/>
    <rect x="83.8" y="35.8" width="4.2" height="28.4"/>
  </g>
  <g fill="#d2953c">
    <rect x="30.9" y="35.8" width="4.2" height="28.4"/>
    <rect x="47.9" y="35.8" width="4.2" height="28.4"/>
    <rect x="64.9" y="35.8" width="4.2" height="28.4"/>
  </g>
</svg>
"""


def main():
    ZIEL.mkdir(exist_ok=True)
    auftraege = [
        ("icon-192.png", 192, 0.12, True),
        ("icon-512.png", 512, 0.12, True),
        # maskable: das Betriebssystem schneidet bis zu 20 % ringsum weg,
        # deshalb sitzt das Zeichen kleiner und die Fläche geht bis zum Rand.
        ("icon-maskable-512.png", 512, 0.26, False),
        ("apple-touch-icon.png", 180, 0.12, True),
        ("icon-32.png", 32, 0.06, True),
    ]
    for name, kante, rand, rund in auftraege:
        png(ZIEL / name, kante, kante, zeichen(kante, rand, rund))
        print(f"  {name:26s} {kante}x{kante}")
    (ZIEL / "icon.svg").write_text(SVG, encoding="utf-8")
    print("  icon.svg")


if __name__ == "__main__":
    print("Symbole in icons/:")
    main()
