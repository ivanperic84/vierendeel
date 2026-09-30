# Initialprompt für eine neue Sitzung

Diese Datei ist zum **Einfügen in einen neuen Chat** gedacht (oder zum
Zuruf: «lies INITIALPROMPT.md»). Sie ist die Abkürzung in die Arbeit —
**das Gedächtnis des Projekts ist [CLAUDE.md](CLAUDE.md)**, und die ist ganz
zu lesen, bevor etwas geändert wird.

Stand: **30. September 2026**; Prüfstand 5952 Kontrollen grün,
`durchlauf.mjs` ohne Bruch. **Mehrere Commits seit dem letzten Push
(`1873231` … `69c1aba`) sind NICHT gepusht** - pushen nur auf Weisung.
Neu am 29. September abends (Einzelheiten in CLAUDE.md, *Entschieden*):
alte Stände über einen Weg (`standAnheben`), COM-Skripte auf Wunsch in
den Ordner, das **Abfangjoch im Stabwerk** mit Leiterzug je Leiter nach
Abfangart (pauschale Fh weg), Lastfallgruppen ohne die seltenen Fälle,
freie Last als Punkt, Konsole in m, Masten **HEB 260** als Startwert,
lesbarer Werteplot, **Kachel → massgebender Stab** im 3D, Grundwerte
(EK, Spannweite, Radius) im Dialog «Neues Tragwerk».
⚠ **Betreiberdaten öffentlich einbauen** ist verweigert worden
(Sicherheitsprüfung) und bleibt dem Auftraggeber selbst - CLAUDE.md,
*Offene Punkte*. Am 30. September aus der Einwirkungs-Mappe gebaut:
Konsolen/Armaturen wählbar, Trafo 50/100 kVA am Masten, **Wind auf den
Tragausleger** (L 13 m mit Hängestütze: Mast mit Längsanker 0.850 → 1.055).
Dazu der **Signalbauer** (Vorlage «Signal», Dialog mit den 41 Teilen der
Signal-Blätter, Summe wie die Mappe). **Offen mit dem Auftraggeber:** die
Durchsicht der übrigen Karten; später das Galgen-Tragwerk für Signale.
Neue Tragwerke entstehen seit dem 30. September über Kacheln (klicken oder
ins 3D ziehen) und das Kontextmenü, mit Mastwahl im Dialog; die
Tragwerksleiste zeigt nur noch das Lageband.
Später am 30. September: Mastnummer in der Anzeige, Mausrad zoomt,
**Mastspitze L/100** unter Betriebswind (abschaltbar, Unterpunkt
Gebrauchstauglichkeit), Aufhängung des Tragauslegers **0.80 m**; danach
**Grenzwerte Fahrdraht/Mastspitze in den Optionen** (40 mm, L/100 als
Vorgabe), ein zu kurzer Ausleger-Mast zeigt den Ausleger statt des
Ersatzjochs, Tragwerk-Kacheln nur unter dem Zeiger hinterlegt; der Mast
wächst beim Anbau eines Auslegers auf H + b, Anker mit Kontextmenü, Δz_F
am Einzelmasten weg; **Tabelle der Reaktionskräfte** gebaut (Reiter
Auflager und Export «Reaktionskräfte (Blatt)»), gepusht. **Warten auf
Freigabe** («die restlichen aufgaben noch nicht umsetzen»): Neuordnung der
Gebrauchstauglichkeit (Schalter je Grenzwert, Mastverdrehung 5°,
Referenzhöhe in den Optionen), Querschnittsklasse und Fussnaht unter
Profile, Profilfenster mit Kenndaten und Schnittzeichnung, Frage zum
verformten Modell, **Vorzeichen der Eingabe nach dem 3D** - Wortlaut in
CLAUDE.md, Offene Punkte. **Als
Nächstes aus derselben Weisung:** Signalbauer mit Bildern und
Umschaltkacheln, Auswahlfenster «+ Bauteil aus der Lasttabelle»,
«Fahrleitung als Auflager» nur mit Leiter, Rückstellkraft der Leiter am
Joch («Halt in y, begrenzt», 10 %).

Davor (bis 29. September mittags, gepusht): Punkt 1 des Auftrags (I_yz, vorzeichenrichtige Gurtspannung)
und der Anschluss Joch–Mast sind erledigt (die COM-Brücke legte jede
Linkverbindung 0.45 m ausserhalb des Links; Löser koppelt seither in der
Linkmitte). **Neu am 28. September: das Stabwerk führt die Anzeige**
(Entscheid «Stabwerk führt, Knicken ergänzt», automatisch 1 s nach der
letzten Eingabe) — Hauptkachel, Kacheln, Fussleiste, Schiene und Lageband
zeigen eine Zahl, das Knicken steht als eigene Kachel aus dem Kern.
Dazu am 28. September: Gebrauchstauglichkeit aus dem Stabwerk («nur
Wind» heisst jetzt nur Wind), Verformungskacheln mit Ampel, Schnitt mit
Station und Stabliste aus dem Stabwerk.
**Tragausleger Etappe 2 ist erledigt** (Stabmodell im Stabwerk,
Seilkraft gemessen). Etappe 4 ist erledigt: der Tragausleger ist im Stabwerk nachgewiesen
(UPE, Bleche, Aufhängung, Mast mit Wölbspannung, Knicken, Fundament) und
steht so in der Anzeige. Etappe 3 ist erledigt (Maske, Kragarm-Kern lotrecht,
3D-Bild; dazu Seite links/rechts und Lageband). Die Bilder stehen seit dem 29. September auf dem Stabwerk (3D-Plot und
Verläufe, Hülle je Stab). **Als Nächstes:** ⚠ die 15–20 % gegen AxisVM
(Angaben des Auftraggebers nötig, *Offene Punkte*) und der Reiter *Schnitt*; die Mastlänge am
Ausleger ist entschieden (H + b; b und α gekoppelt, ohne Eintrag b
der Tabelle); die Aufhängung hat zwei an der Ankertraverse
gespreizte Seile (Feld «Spreizung», seit 30. Sept. Vorgabe ±0.40 m). Das Knicken der
Jochmasten kommt seit dem 28. September aus dem Stabwerk. ⚠ Welche früheren AxisVM-Entscheide von der
falschen Linklage berührt sind, steht unter *Offene Punkte*.

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
> Der Auftrag steht in `INITIALPROMPT.md` im Projektstamm — drei Punkte in
> dieser Reihenfolge, dazu was beim Wechsel des Kontos zu beachten ist. Lies
> sie mit, fang mit dem ersten offenen Punkt an, und was dabei offen
> bleibt, frag mich.

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
Für **Gurte und Bleche** seit dem Einbau von I_yz unter ständiger Last im
Feld **ja** (Gurt V_y 0.98 %, Blech M_z 2.68 % statt 13.6 / 18.2 %). Was
bleibt, sitzt am **Anschluss Joch–Mast** (Wind längs am Jochende, Mastfuss
M_y ständig) und ändert sich mit I_yz nicht — CLAUDE.md, *Laufende Arbeit
(26. Sept.)*.

## Der Auftrag (entschieden am 26. September)

**1. ~~I_yz in die Elementmatrix~~ — erledigt am 26. September.**
`kLokalSchief` (core.stabwerk.js) rechnet den Winkel in seinen Hauptachsen,
die Ausleitung schreibt I_yz aus `winkelwerteFuer()`, das Vorzeichen ist
gegen AxisVM gemessen (Prüfstand Abschnitt 129). Auf Rückfrage entschieden:
die Gurtspannung im Stabwerk ist seither **vorzeichenrichtig** (Konvention an
der geschlossenen Lösung gemessen, 129 f; J90/20 m Gurt η 0.4684 → 0.3268),
und **vor Punkt 2 kommt der Anschluss Joch–Mast** gegen AxisVM (Wind längs
am Jochende, Mastfuss M_y ständig) — CLAUDE.md, *Laufende Arbeit (26. Sept.)*.

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

- **Zwei Rechenwege:** seit dem 28. September führt das **Stabwerk** die
  Anzeige; **Verläufe, Schnitt, Bericht und Excel** stehen noch auf dem
  Ersatzbalken (Punkt 3 des Auftrags). Das Knicken rechnet weiter mit den
  Schnittgrössen des Kerns — CLAUDE.md, *Offene Punkte*.
- **Die PyNite-Ausleitung steht auf der lokalen Link-Lesart** — der Befund
  vom 26. September ist im Löser behoben, in `export.pynite.js` nicht.
- **`serve.py` prüft den Port nicht** (fünf Server lagen gleichzeitig auf
  8731, die Verbindung landete bei einem toten).
- Tragausleger und Abfangjoch hängen beide am Stabwerksweg (Abfangjoch
  seit dem 29. September); ihr **Bericht** fehlt noch (Punkt 3).

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
node pruefung.mjs           # Pruefstand, 5952 Kontrollen - muss gruen bleiben
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
