# Initialprompt für eine neue Sitzung

Diese Datei ist zum **Einfügen in einen neuen Chat** gedacht (oder zum
Zuruf: «lies INITIALPROMPT.md»). Sie ist die Abkürzung in die Arbeit —
**das Gedächtnis des Projekts ist [CLAUDE.md](CLAUDE.md)**, und die ist ganz
zu lesen, bevor etwas geändert wird.

Stand: **2. Oktober 2026**; Prüfstand 6130 Kontrollen grün,
`durchlauf.mjs` ohne Bruch. Gepusht bis zum 1. Oktober; die Arbeit vom
2. Oktober (Profile) ist committet, **nicht gepusht** - pushen nur auf Weisung.

**Laufend (2. Oktober):** Bauteile bereinigen über markierte Querprofile.
Der Auftraggeber markiert in `Grundlagen/QP` mit PDF-XChange
(`Tragwerk: …`, `Bauteil: …`, `? …`); `python3 qp_markierungen.py` liest sie
nach `Versand/qp_markierungen/`. Danach Abgleichtabelle und gemeinsame
Durchsicht (CLAUDE.md, *Laufende Arbeit*).

**Zuletzt gebaut (Einzelheiten in CLAUDE.md, *Entschieden*):**
- **2. Oktober, unter *Profile*:** Querschnittsklasse je Mast (die des
  Mastnachweises) und Hinweis zur durchgeschweissten Fussnaht; Klick auf
  ein Profil öffnet das **Profilblatt** (`ui.profilblatt.js`): hinterlegte
  Kenndaten ungerundet, massstäblicher Schnitt mit Vermassung und
  Schwerpunkt.
- **2. Oktober, Profile nach Norm:** Ausrundungen in `data/normen.json`
  (Winkel r1/r2 EN 10056-1, HEB/HEM r, UPE-Radien auf 12/13/15 mm
  berichtigt), UNP mit 8 % Flanschneigung; `vergleich_profile.mjs` rechnet
  jede Tabellenzeile aus ihrem Umriss nach. Danach auf Weisung ALLE
  Querschnittswerte aus dem Normumriss (I_t bleibt); J130/30 m Blech
  0.5470 → 0.5579 wegen L 120x80x12. Die UNP der Anker stehen jetzt in
  der Profiltabelle; der Ankerkatalog führt nur Profil und Anzahl.
- **Bericht und Excel auf dem Stabwerksweg**, je ein Bericht auch für
  Abfangjoch und Tragausleger (`export.stabbericht.js`): ganzes Blatt,
  je Bauteil der massgebende Stab mit eingesetzter Formel und die zehn
  höchstbeanspruchten Stäbe, Knicken (SIA 263, Gl. 50) mit den Kräften des
  Stabwerks, ohne gültiges Stabwerk rechnet der Knopf zuerst. Excel mit den
  Blättern Urteil, Massgebend, Stabwerk, Masten, Reaktionen. Der Bericht des
  Ersatzbalkens bleibt nur beim Rechenverfahren «Ersatzbalken».
- **Bindeblech mit Schub** im Stabwerk (σ_v, vorher ohne τ: J90/20 m
  0.3634 → 0.3715).
- **Ankerfuss mit einem Gelenk** für beide Profile; Seil und Ersatzstab
  hängen jetzt auch im eigenen Löser gelenkig (Mastfuss M_l +10 % bei U12
  quer).
- **Jochreihe:** Zwischenmast schieben hält die Reihe zusammen, neues Joch
  ohne Kragarm, Kragarm am Zwischenmasten erlaubt.
- Kleine Befunde: Namen in der Reihenzeile, Anschlusshöhe im Dialog
  «Neues Tragwerk», Fangrand am Anker, Mastlänge im Namen, Mastdialog,
  `serve.py` weist einen belegten Port ab.
- Davor (30. Sept./1. Okt.): F_z der Eingabe und der Fuss-/Auflagerkräfte
  nach oben (rechte Hand), Strg-Kopie beim Ziehen, Vorlage überschreiben
  oder neu, Hinweise des Reaktionsblatts bearbeitbar.

**Warten auf den Auftraggeber (Wortlaut in CLAUDE.md, *Offene Punkte*):**
Signalbauer mit Bildern; «+ Bauteil aus
der Lasttabelle»; «Fahrleitung als Auflager» nur mit Leiter;
Rückstellkraft der Leiter am Joch («Halt in y, begrenzt», 10 %).
Entscheide offen (⚠): Tragausleger am Masten eines Jochs im Stabwerk;
Tragausleger mit Auslegerwind (Mast η 1.054); die 15–20 % gegen AxisVM
(Angaben nötig); der Reiter *Schnitt* im Stabwerk; ältere AxisVM-Messungen
mit falscher Linklage; PyNite-Links.

⚠ **Betreiberdaten öffentlich einbauen** ist verweigert worden
(Sicherheitsprüfung) und bleibt dem Auftraggeber selbst.

---

## Der Prompt

> Ich arbeite am Werkzeug **Vierendeel** in diesem Verzeichnis — einer
> Browser-Anwendung zur Bemessung gegliederter Vierendeel-Träger aus
> vier Winkelprofilen (Fahrleitungs-Tragjoche), reine ES-Module ohne
> Abhängigkeiten.
>
> Lies zuerst `CLAUDE.md` ganz — besonders *Stand*, *Offene Punkte* und
> *Entschieden*; dort stehen die Entscheide, die nicht wieder aufzumachen
> sind. Dann `git log --oneline -15` und `git status`. Danach
> `node pruefung.mjs` — der muss grün sein, bevor du etwas änderst.
>
> Halte dich an die stehenden Vorgaben: **nicht pushen ohne meine Weisung**;
> kein Projektmaterial des Betreibers in verfolgte Dateien (keine
> Zeichnungs- oder Projektnummern, kein Betreibername, nicht `data/*.json`,
> nicht `Grundlagen/`, `Versand/`, `pruefung_axisvm/`); AxisVM rechnet nur
> auf meine Anweisung; Antworten, Kommentare und Commit-Texte auf Deutsch,
> Commit-Texte in ASCII-Umschrift; Kommentare nicht kürzen.
> **Behauptungen werden gemessen, nicht hergeleitet** — mit Zahlen vorher →
> nachher an einem benannten Beispiel. Änderungen an der Oberfläche im
> Browser nachprüfen (Prüfseite in `Versand/`, die meinen Arbeitsstand im
> Browser nicht anfasst, danach löschen), nicht nur am Prüfstand. Ist eine
> Weisung mehrdeutig, frag mit konkreten Varianten zurück, statt zu raten.
> Eine unerklärte Änderung im Arbeitsstand zuerst bei mir erfragen.
>
> Was offen ist, steht oben in `INITIALPROMPT.md` und in `CLAUDE.md`,
> *Offene Punkte*. Frag mich, womit wir weitermachen.

---

## Wenn die nächste Sitzung unter einem anderen Konto läuft

**Am Projekt ändert sich nichts** — es liegt nicht im Benutzerordner. Auf
demselben Rechner sind `data/*.json`, `Grundlagen/`, `Versand/` und
`pruefung_axisvm/` weiter da (sie stehen nur nicht in der Ablage), AxisVM
antwortet weiter über COM, und die Git-Anmeldung hängt am Windows-Benutzer,
nicht am Konto — pushen geht also, **aber nur auf Weisung**.

Zwei Dinge wandern nicht mit:

- **Ein persönlicher Gedächtnisspeicher des Werkzeugs.** Deshalb steht alles,
  was zählt, in `CLAUDE.md`, in den Commit-Texten und hier — und deshalb
  gehört jede neue Weisung sofort dorthin, nicht erst am Sitzungsende.
- **`.claude/settings.local.json`** (die erteilten Berechtigungen). Ein
  anderes Konto auf demselben Windows-Benutzer liest sie weiter; ein anderer
  **Windows**-Benutzer nicht — dann fragt das Werkzeug wieder bei jedem
  Schritt, und die persönlichen globalen Regeln im Benutzerordner
  (`~/.claude/CLAUDE.md`) wären ebenfalls neu zu hinterlegen.

Der Entwicklungsserver der Vorschau (`serve.py`, Port 8731) wird mit der
Sitzung beendet. Seit dem 1. Oktober bricht `serve.py` ab, wenn der Port
schon belegt ist — dann läuft noch einer, und der ist zu beenden.

## Die Werkzeuge

```bash
node pruefung.mjs           # Pruefstand, 6130 Kontrollen - muss gruen bleiben
node durchlauf.mjs          # Durchgang durch alle Wege je Tragwerksart
python3 build_html.py       # buendelt js/ + css/ -> vierendeel_tool.html
python3 serve.py            # Modulversion: http://localhost:8731/index.html
node vergleich_axisvm.mjs com/AxisVM_Einzel_J90_20m.json      # Loeser gegen AxisVM
node vergleich_starrheit.mjs com/AxisVM_Einzel_J90_20m.json   # Starrfaktor und Drehprobe
node vergleich_anschluss.mjs com/AxisVM_Einzel_J90_20m.json   # Kraefte der Konsolen am Masten
```

Nach **jeder** Änderung an `js/` oder `css/` neu bündeln; nach jeder
Änderung an `data/*.json` `node datenpaket.mjs`. Die AxisVM-Modelle in
`com/` sind gitignoriert — bei einem Rechnerwechsel neu rechnen lassen
(Einzeljoch rund 11, Reihe rund 20 Minuten).
