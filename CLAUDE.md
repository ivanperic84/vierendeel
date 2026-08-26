# Tragjoch-Werkzeug

Browser-Anwendung zur Bemessung gegliederter Vierendeel-Träger aus vier
Winkelprofilen (Fahrleitungs-Tragjoche). Reine ES-Module, kein Bündler zur
Laufzeit; `build_html.py` erzeugt daraus eine eigenständige HTML-Datei.

Der fachliche Stand steht in **[UEBERGABE.md](UEBERGABE.md)** — dort zuerst
nachlesen, bevor etwas geändert wird. Die vermessene AxisVM-Schnittstelle
steht in **[com/LIESMICH.md](com/LIESMICH.md)**, die Herleitung des
Rechenwegs im Handbuch in der Anwendung (`js/doku.handbuch.js`).

## Stehende Vorgaben des Auftraggebers

Diese Regeln sind mehrfach bestätigt und binden jede Änderung:

> **Die Geometrie der Jochträger (neu wie alt) ist im Detail zu übernehmen —
> eine Anpassung der Blecheinteilung ist nicht zulässig.**

> **Entscheide, die für die Auswertung der Spannungsverläufe bzw. die
> Nachweise erheblich sind, vorgängig nachfragen** statt selbst festzulegen.

Der Auftraggeber ist zugleich derjenige, der die Prüfregeln nach dem Stand
der Technik festlegt. Die weiteren Regeln zur Blechlage und zum Anschluss der
Hängestützen stehen in UEBERGABE.md, Abschnitt *Stehende Vorgaben*.

**Massgebend sind die Daten, nicht die Herleitung.** Führt das Sortiment eine
Länge, gilt sie — auch wenn sie sich rechnerisch bestätigen lässt. Eine
eigene Herleitung an ihre Stelle zu setzen verstösst gegen die erste Regel.

## Die Ablage wird öffentlich

Projektmaterial des Betreibers gehört **nie** hinein: keine Zeichnungs- oder
Projektnummern, kein Betreibername, keine `.axs`/`.axe`/PDF/Excel, nicht
`data/*.json`, nicht `Grundlagen/`, nicht `Versand/`, nicht
`pruefung_axisvm/`. Die `.gitignore` hält das; vor jeder Änderung an
verfolgten Dateien prüfen, ob ein solcher Bezug hineingerät.

Fachliche Anker ohne Nummer sind erlaubt und erwünscht — «Schnitt C-C der
Werkstattzeichnung» benennt die Stelle eindeutig genug.

**Push ist die Entscheidung des Auftraggebers.** Kein Remote einrichten,
nicht pushen, auch nicht auf Nachfrage einer Werkzeugmeldung.

## Arbeiten

```bash
node pruefung.mjs           # Prüfstand, 1207 Kontrollen - muss gruen bleiben
python3 build_html.py       # buendelt js/ + css/ -> vierendeel_tool.html
python3 serve.py            # Modulversion: http://localhost:8731/index.html
```

Nach **jeder** Änderung an `js/` oder `css/` neu bündeln — die eigenständige
Datei veraltet sonst still. `pruefung.mjs` braucht die drei `data/*.json`
daneben; ohne sie laufen die Kontrollen nicht.

Was in Modulen läuft, läuft nicht zwangsläufig gebündelt. Der Bündler prüft
das Ergebnis mit `node --check` und bricht ab, statt eine kaputte Datei
abzulegen.

## AxisVM über COM (nur Windows)

```
com\AxisVM_pruefen.cmd      vermisst die Schnittstelle, baut nichts
com\AxisVM_aufbauen.cmd     baut das Modell aus com\AxisVM_Signaljoch_COM.json
```

Beide schreiben `com/AxisVM_aufbau_bericht.txt`. **Gerechnet wird nicht** —
Lastkombinationen und Berechnung bleiben die Entscheidung des Auftraggebers
im Programm.

Drei Regeln, teuer gelernt:

* **AxisVM meldet Fehler als negative Zahl, nie als Ausnahme.** Jeden
  Add-Schritt auf einen Wert > 0 prüfen (`-Positiv`), sonst wandert ein
  Fehlercode als Nummer weiter.
* **Die Schnittstelle wird vermessen, nicht geraten.** Die Typbibliothek wird
  zur Laufzeit geladen; Signaturen und Verbund-Typen lassen sich auslesen
  (`Signaturen`, `SatzAufbau`). Raten kostet einen ganzen Durchlauf.
* **Das Skript sagt, was es nicht konnte.** Lieber eine laute Warnung im
  Bericht als ein Modell, das klaglos Unsinn rechnet.

Die `.ps1` muss **reines ASCII** sein. Beim Schreiben erst kodieren, dann in
eine Nebendatei, dann `os.replace` — `open(pfad,'w')` leert die Datei, bevor
ein Encoding-Fehler auffliegt.

## Sprache

Antworten, Kommentare und Commit-Texte auf Deutsch. Kommentare tragen das
*Warum*, nicht das *Was*.
