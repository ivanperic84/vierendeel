# Initialprompt für eine neue Sitzung

Diese Datei ist zum **Einfügen in einen neuen Chat** gedacht (oder zum
Zuruf: «lies INITIALPROMPT.md»). Sie ist die Abkürzung in die Arbeit —
**das Gedächtnis des Projekts ist [CLAUDE.md](CLAUDE.md)**, und die ist ganz
zu lesen, bevor etwas geändert wird.

Stand: **26. September 2026**, `main` auf `971d650`, Arbeitsbaum sauber,
Prüfstand 5410 Kontrollen grün.

---

## Der Prompt

> Ich arbeite am Werkzeug **Vierendeel** in diesem Verzeichnis — einer
> Browser-Anwendung zur Bemessung gegliederter Vierendeel-Träger aus
> vier Winkelprofilen (Fahrleitungs-Tragjoche), reine ES-Module ohne
> Abhängigkeiten.
>
> Lies zuerst `CLAUDE.md` ganz — besonders *Stand*, *Laufende Arbeit*,
> *Offene Punkte* und *Entschieden*; dort stehen die Entscheide, die nicht
> wieder aufzumachen sind. Dann `git log --oneline -15` und `git status`.
> Danach `node pruefung.mjs` — der muss grün sein, bevor du etwas änderst.
>
> Halte dich an die stehenden Vorgaben: **nicht pushen ohne meine Weisung**;
> kein Projektmaterial des Betreibers in verfolgte Dateien (keine
> Zeichnungs- oder Projektnummern, kein Betreibername, nicht `data/*.json`,
> nicht `Grundlagen/`, `Versand/`, `pruefung_axisvm/`); AxisVM rechnet nur
> auf meine Anweisung; Antworten, Kommentare und Commit-Texte auf Deutsch,
> Commit-Texte in ASCII-Umschrift; Kommentare nicht kürzen.
> **Behauptungen werden gemessen, nicht hergeleitet** — mit Zahlen vorher →
> nachher an einem benannten Beispiel. Änderungen an der Oberfläche im
> Browser nachprüfen, nicht nur am Prüfstand. Ist eine Weisung mehrdeutig,
> frag mit konkreten Varianten zurück, statt zu raten.
>
> Der Auftrag steht unten in dieser Datei, in drei Punkten und in dieser
> Reihenfolge. Fang mit Punkt 1 an; was dabei offen bleibt, frag mich.

---

## Wo die Arbeit steht

**Der Bauplan der Jochreihe** (Weisung vom 19. September: «die
zusammenhängenden jochtragwerke sind als gesamtheitliches tragwerk zu
betrachten») ist bis Schritt (5) erledigt: der **Stabwerkslöser**
(`js/core.stabwerk.js`) rechnet das ganze Blatt in einem Modell, die
geteilten Masten verschmolzen; das Urteil der Reihe steht in der
Stabwerksleiste. Offen ist Schritt (6): **Bericht, Excel und Ausleitung auf
den Stabwerksweg**, und die Freigabe gegen AxisVM (**Etappe 4**).

**Etappe 4, Stand:** für den **Masten erfüllt** — das Fussmoment unter Wind
quer auf 0.00 %, das Längsmoment am geteilten Masten der Reihe auf 0.60 %,
und damit ist auch die Sofortmassnahme vom 19. September von aussen belegt
(beide Programme sagen unabhängig: 1.74-faches Längsmoment in der Reihe).
Für **Gurte und Bleche nicht**: 13–18 % unter ständiger Last, 25 % bei den
Blechmomenten unter Wind längs.

## Der Auftrag (entschieden am 26. September)

**1. I_yz in die Elementmatrix.** Die Ursache der 13–25 % ist gemessen und
benannt: die Modelldatei führt je Querschnitt nur A, I_y, I_z und I_t, und
`kLokal` koppelt y und z deshalb nicht — der Löser rechnet den L-Winkel, als
wäre er doppelt symmetrisch. `randspannung()` in `core.winkel.js` kennt das
Deviationsmoment längst, also die **Spannung**; die **Steifigkeit** nicht —
und die Schnittgrössen kommen aus der Steifigkeit.

Der Eingriff berührt den **Kern des Lösers**. Vorgehen, Fallen und die
Reihenfolge der Messungen stehen in CLAUDE.md unter *Laufende Arbeit
(26. Sept.)*. **Kein neuer AxisVM-Lauf nötig** — die Ergebnisdateien liegen in
`com/`, und `vergleich_starrheit.mjs` sagt in 30 Sekunden, ob es besser wurde.

**2. Der Tragausleger — beide Wege.** Eigener Kragarm-Kern für die Anzeige
(Hauptkacheln, Verläufe, Bericht), das **Stabwerk für das Urteil**; so steht es
heute schon beim Joch. Nach Sortiment sind es **zwei UPE 140**, nicht vier
Winkel. Heute rechnet der Kern ihn als Einfeldträger mit einem Phantom-Auflager
am freien Ende und verliert damit das Einspannmoment am Masten (L = 12 m: 10.9
statt 57.3 kNm) — deshalb steht er als «NICHT nachgewiesen» da. Diese Warnung
fällt, wenn es stimmt.

**3. Die Nachweise auf den Löser.** Die **Abbildungen und Schnittgrössen des
Lösers** in die Nachweise übernehmen, **Bericht und Excel auf den Stabwerksweg**
(Schritt 6 des Bauplans) und einen **Bericht auch für Tragausleger und
Abfangjoch** — der Entscheid vom 18. September («den abfangjoch weglassen») ist
damit aufgehoben.

⚠ **Eine Sache kann nicht mitwandern: das Knicken.** Die Stabilität rechnet
allein der Ersatzbalken (`core.mast.js`); der Löser führt sie nicht. Wer ganz
umschaltet, weist einen schlanken Masten rund 8 % zu günstig nach. Die
Schnittgrössen kommen aus dem Löser, das Knicken bleibt beim Kern — und der
Bericht muss sagen, woher welche Zahl stammt.

**Nicht die Ursache war die Zwangsbedingung** — gemessen, bevor gebaut
wurde: der Starrfaktor von 1 bis 100 ändert keine Stelle (16.98 % bleibt
16.98 %). Der Test ist als Werkzeug abgelegt:
`node vergleich_starrheit.mjs com/AxisVM_Einzel_J90_20m.json`.

## Was daneben offen bleibt

- **Zwei Rechenwege, zwei Zahlen für denselben Masten:** Hauptkacheln,
  Verläufe und Bericht stehen auf dem **Ersatzbalken**, die Reihe rechnet
  der **Stabwerksweg** (η des geteilten Masten 0.7708 → 1.3465). Welcher Weg
  das Urteil trägt, ist nach der Freigabe zu entscheiden.
- **Die PyNite-Ausleitung steht auf der lokalen Link-Lesart** — der Befund
  vom 26. September ist im Löser behoben, in `export.pynite.js` nicht.
- **`serve.py` prüft den Port nicht** (fünf Server lagen gleichzeitig auf
  8731, die Verbindung landete bei einem toten).
- Der **Tragausleger** wartet auf sein Kragarm-Modell, das **Abfangjoch**
  hängt noch nicht am Stabwerksweg (`abfangBau`).

⚠ **Der Arbeitsstand im Browser ist nicht der ursprüngliche:** er trägt seit
dem Prüflauf vom 26. September ein zweites Tragwerk **T2** (zum Prüfen der
Reihenzeile angelegt), und `fdHoehe` war dabei auf 14 m verstellt — auf 5.50
zurückgesetzt.

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

**Der Entwicklungsserver ist beendet** (Port 8731 frei). Das ist kein Zufall:
`serve.py` setzt `allow_reuse_address = True`, mehrere Prozesse dürfen unter
Windows denselben Port binden, und die Verbindung landet dann bei einem toten
— ein Bild, das wie eine verweigerte Sandbox aussieht. Vor dem Start prüfen,
ob schon einer läuft.

## Die Werkzeuge

```bash
node pruefung.mjs           # Pruefstand, 5410 Kontrollen - muss gruen bleiben
node durchlauf.mjs          # Durchgang durch alle Wege je Tragwerksart
python3 build_html.py       # buendelt js/ + css/ -> vierendeel_tool.html
python3 serve.py            # Modulversion: http://localhost:8731/index.html
node vergleich_axisvm.mjs com/AxisVM_Einzel_J90_20m.json      # Loeser gegen AxisVM
node vergleich_starrheit.mjs com/AxisVM_Einzel_J90_20m.json   # Starrfaktor und Drehprobe
```

Nach **jeder** Änderung an `js/` oder `css/` neu bündeln; nach jeder
Änderung an `data/*.json` `node datenpaket.mjs`. Die AxisVM-Modelle in
`com/` sind gitignoriert — bei einem Rechnerwechsel neu rechnen lassen
(Einzeljoch rund 11, Reihe rund 20 Minuten).
