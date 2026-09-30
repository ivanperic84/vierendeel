# Vierendeel (Tragjoch-Werkzeug)

Browser-Anwendung zur Bemessung gegliederter Vierendeel-Träger aus vier
Winkelprofilen (Fahrleitungs-Tragjoche). Reine ES-Module, kein Bündler zur
Laufzeit; `build_html.py` erzeugt daraus eine eigenständige HTML-Datei.

**Diese Datei ist das Gedächtnis des Projekts.** Sie wird so geführt, dass
eine neue Sitzung — auch unter einem anderen Konto, ohne Gesprächsverlauf und
ohne persönlichen Gedächtnisspeicher — ohne Verlust weiterarbeiten kann. Was
nur im Chat steht, ist beim nächsten Wechsel weg; was zählt, gehört hierher
oder in einen Commit-Text.

## Einstieg in einer neuen Sitzung

1. Diese Datei ganz lesen, besonders *Stand*, *Offene Punkte* und
   *Entschieden*.
2. `git log --oneline -15` — die Commit-Texte sind das Protokoll im Kleinen.
3. `git status` — liegt unfertige Arbeit herum, zuerst beim Auftraggeber
   nachfragen, was damit geschehen soll.
4. `node pruefung.mjs` — muss grün sein, bevor etwas geändert wird. Fehlen
   `data/*.json`, siehe *Umgebung*.
5. Erst dann die neue Aufgabe angehen.

Ein **Initialprompt** zum Einfügen in einen neuen Chat — Stand, offene
Punkte und der nächste Schritt in Kurzform — steht in
**[INITIALPROMPT.md](INITIALPROMPT.md)**. Er ist eine Abkürzung in die
Arbeit, kein Ersatz für diese Datei.

Weiterführend: **[README.md](README.md)** (Modell, Rechenweg, Dateien),
**[com/LIESMICH.md](com/LIESMICH.md)** (vermessene AxisVM-Schnittstelle),
das Handbuch in der Anwendung (`js/doku.handbuch.js`, Herleitung). Die
ausführliche Vorgeschichte bis 18. September 2026 — Messreihen, Studien,
Befunde, Wortlaut der Weisungen — steht in der früheren Übergabe:
`git show a4d56e2:UEBERGABE.md` (8500 Zeilen; mit `grep` darin suchen).

## Arbeitsweise mit dem Auftraggeber

- Der Auftraggeber ist die Fachperson für Fahrleitungstragwerke und legt die
  Prüfregeln nach dem Stand der Technik fest. Weisungen kommen knapp, oft
  klein und ohne Satzzeichen; sie werden **im Wortlaut** mit Datum in den
  Commit-Text bzw. hierher übernommen.
- **Ist eine Weisung mehrdeutig, mit konkreten Varianten zurückfragen**
  (Werkzeug für Rückfragen), statt zu raten. Das gilt immer, wenn die
  Antwort Spannungsverläufe oder Nachweise berührt.
- **Behauptungen werden gemessen, nicht hergeleitet**: am Prüfstand, an
  PyNite (`kalibrieren*.mjs`) oder am AxisVM-Modell, mit Zahlen vorher →
  nachher an einem benannten Beispiel (z. B. «J90 / 20 m, HEB 240»).
- Änderungen an der Oberfläche im Browser nachprüfen (`serve.py`, dann die
  Modulversion öffnen), nicht nur am Prüfstand — er war schon grün, während
  ein Knopf nichts tat.
- Ehrlich melden: was nicht ging, was nicht geprüft wurde, wo die Anwendung
  auf der unsicheren Seite lag.
- **Eine unerklärte Änderung im Arbeitsstand zuerst beim Auftraggeber
  erfragen** (Weisung 30. Sept.: «ich habe die länge vorher geändert. bitte
  schreibe das für das nächste mal, rückfrage an user»). Er arbeitet im
  selben Browser mit; eine Zahl, die sich zwischen zwei Blicken geändert
  hat, kann seine Eingabe sein. Erst fragen, dann suchen.
- Dateien und Verzeichnisse ausserhalb dieses Projekts nur öffnen, wenn der
  Auftraggeber den Pfad genannt hat.
- **Committen** nach jedem abgeschlossenen Schritt, auf `main`, Text auf
  Deutsch (ASCII-Umschrift wie in den bisherigen Commits). **Pushen nur auf
  ausdrückliche Weisung.**

## Umgebung

- Windows 10, Git Bash und PowerShell; Node 24, Python 3.12 (`python3`).
- AxisVM auf demselben Rechner, angesprochen über COM (`com/`).
- **GitHub:** `origin` ist die öffentliche Ablage `vierendeel` (Zweig
  `main`), mit **GitHub Pages** — die Modulversion `index.html` läuft dort
  ohne Daten und fragt beim Start nach einem Datenpaket. Eine Action:
  `.github/workflows/rauchtest.yml` (seit 19. Sept., A3) fährt bei jedem
  Push den Durchgang auf den **erfundenen Testdaten** (`testdaten/`) und
  bündelt ohne Daten. Keine `gh`-CLI; Anmeldung über den Git Credential
  Manager von Windows.
  Seit dem 24. August wurde auf Weisung laufend gepusht (zuletzt
  29. September, «pushen com und bauteildatei nachziehen falls notwendig»). Der Zweig `github-stand-vor-push` ist der alte, von Hand
  hochgeladene Stand, nur örtlich von Wert.
- **`Grundlagen/`** (im Projekt, nicht in der Ablage) — die fachliche
  Quelle der Daten: Sortimentsblätter und Werkstattzeichnungen der Tragjoche
  J60–J130, Konstruktions- und Schemazeichnungen der Abfangjoche A160–A360
  (neu und alt), Zeichnungen der Tragausleger, Bemessungsblätter der Zug-/
  Druckstützen und Seilanker, unter `Einwirkungen` zulässige Standardlasten
  auf Fundamente, Gewichtslasten und die Reglagetabelle der Leiterzugkräfte,
  eine Excel-Mappe der Einwirkungen auf Fahrleitungstragwerke, eine
  Sammelmappe der Joche in Altbauweise, unter `QP` Beispiel-Querprofile
  und Kursaufgaben, unter `AxisVM` Testjoche (DXF, Zuordnungstabellen,
  PyNite-Skripte) und unter `Blockcalc` die Schwester-App, deren
  Projektablage übernommen wurde. **Zahlen daraus gehören in `data/*.json`,
  nie in verfolgte Dateien.** Die Excel-Rechenwerkzeuge für Masten und Joche
  liegen ausserhalb dieses Projekts im übergeordneten `Statiktools`.
- **Nicht in der Ablage und bei einem Rechnerwechsel von Hand
  mitzunehmen:** `data/*.json` (Betreiberdaten; ohne sie läuft der
  Prüfstand nicht — sie lassen sich aus einem Datenpaket
  `Tragjoch_Datenpaket_*.json` wiederherstellen, das die Anwendung unter
  *Datenbasis → sichern* schreibt), `Grundlagen/` (Zeichnungen, Reglagetabelle,
  Einwirkungen), `Versand/`, `pruefung_axisvm/`, `.claude/settings.local.json`.
  Ein Kontowechsel auf **demselben** Rechner berührt nichts davon.

## Stehende Vorgaben des Auftraggebers

Diese Regeln sind mehrfach bestätigt und binden jede Änderung:

> **Die Geometrie der Jochträger (neu wie alt) ist im Detail zu übernehmen —
> eine Anpassung der Blecheinteilung ist nicht zulässig.**

> **Entscheide, die für die Auswertung der Spannungsverläufe bzw. die
> Nachweise erheblich sind, vorgängig nachfragen** statt selbst festzulegen.

Der Auftraggeber ist zugleich derjenige, der die Prüfregeln nach dem Stand
der Technik festlegt. Aus der Durchsicht des Modells (22. August), im Wortlaut:

> **Die stehenden Bleche sind in der Flucht der Schenkel der L-Profile. Die
> liegenden sind theoretisch noch 10 mm nach innen versetzt, um sie besser
> schweissen zu können.** (Detailschnitt der Werkstattzeichnung)

> **Bei Hängestützen, die nur an zwei Punkten gehalten werden** am Unter- oder
> Obergurt, **nach Variante A ausbilden** (biegesteif um y).

> **Bei vier Punkten** im Ober- und Untergurt ist **die erste Reihe x y z und
> die zweite y z gehalten. So entsteht keine Zwängung innerhalb des Gurts.**

> **Die Starrelemente sind bis zum Anfang / Ende der Bleche zu führen** — und
> in AxisVM als Starrkörper zu modellieren; gelenkige Anschlüsse als
> Linkelemente.

**Eurocode für Material und Querschnitte ist gesetzt.** Die Stabilität
(Knicken) läuft nach SIA 263 und wird im Bericht so aufgeführt.

**Massgebend sind die Daten, nicht die Herleitung.** Führt das Sortiment eine
Länge, gilt sie — auch wenn sie sich rechnerisch bestätigen lässt. Eine
eigene Herleitung an ihre Stelle zu setzen verstösst gegen die erste Regel.

## Entschieden — nicht wieder aufmachen

Jeder Punkt ist vom Auftraggeber entschieden, meist nach einer Messung.
Ändern nur auf seine Weisung.

| Frage | Entscheid |
|---|---|
| Tabelle der Reaktionskräfte (30. Sept.) | Weisung (Wortlaut in `js/core.reaktionen.js`): die Zusammenfassung der Einwirkungs-Mappe als Output - charakteristisch, Wind ohne 0.7, bei einer Jochreihe alle Auflager, Übersichtsskizze, Hinweise, Achssystem, **Druck positiv**. Auf Rückfrage **Havarie als eigene Zeile** und **«Beides»** (Reiter Auflager oben, Blatt im Export «Reaktionskräfte (Blatt)», druckbar A4 quer). Aus dem **Stabwerk** (alle Auflager des Blattes in einem Modell): je Mastfuss, Ankerfundament und Längsanker V min/max, ±M_q, ±H_q, ±M_l, ±H_l, ±T mit massgebendem Fall, Anteil ständig/veränderlich am Moment quer, darunter die Standardlasten des Fundamenttyps. Zustände: G = beide ständigen Hälften zusammen, ständig + Wind/Schnee; Betriebswind und die G-Hälften allein zählen nicht. Skizze = echte Stäbe und Seile des Stabmodells in x–z. Gemessen: J90/20 m M1 V 12.825 kN, M_q 11.235, M_l 43.091 kNm - auf die Stelle wie der Fundamentnachweis; Reihe 2 × J90/20 m mit Anker: M1, Ankerfundament, geteilter M2 (M_l 70.014), M3. Ohne gültiges Stabwerk keine Tabelle, der Grund steht da. **Überarbeitet am selben Tag** («Das LA auflager (beim tragausleger) verwirrt die lesart, hier die aufhängeseile anzeigen. Die tabelle sollte geordneter daherkommen (gleiche zellenbreiten bei den werten. überarbeite das design. dazu noch die benennung der reatktionskräfte mit dem achsystem ergänzen wie in der exceltabelle. mach ein einspannsymbol beim Mastfuss. beim Anker die Mastzahl nehmen und ein A vornedran machen. die Reaktion sollte dann beim Ankerfundament eine y und z komponente enthalten (wenn in längsrichtung angesetzt). deute den anker noch in der obigen scheaskizze an.»): Köpfe F_z (V), ±M_y (M,q), ±F_x (H,q), ±M_x (M,l), ±F_y (H,l), ±M_z (T) unter «Lastfall quer / längs zum Gleis»; festes Raster, Wertespalten gleich breit; Anker «A14» nur mit V und der Horizontalkraft seiner Richtung; Skizze mit Einspannung am Mastfuss, Anbauteilen (lange Starrglieder, blau), Seilen gestrichelt, Anker als Strebe mit Gelenk (längs: umgeklappt und so angeschrieben), kein Lagersymbol am Längsanker; Havarie knapp («Leiterriss, Längszug +y»), der Leiter steht in den Hinweisen. Im Reiter die **gestürzte Form** (je Auflager Grössen als Zeilen, Einwirkung / Havarie / zulässig als Spalten) - zehn Spalten waren in der Seitenleiste unlesbar. Beispiel «Jochreihe 2 × J90/20 m» (Masten 12/13/14, Hängestützen, Jochaufsätze, Zusatzleiter und Rückleiter an 12, NT-Ausleger und Rückleiter an 14, Anker längs an 14, ein Leiter reisst): 12 V 16.77/17.29, M_y 40.23, M_x 51.80; geteilter 13 M_x 87.45 kNm; 14 V 2.69/34.31; A14 V −15.80/15.83, F_y 8.84 kN |
| Mast wächst beim Anbau des Tragauslegers (30. Sept.) | «beim anbau von tragauslegern den mast automatisch verlängern und mit info versehen wie bis anhin am oberen bildschimrand» - beantwortet die Frage (a) automatisch / (b) Warnung. Nach «Setzen» im Dialog (neu oder Artwechsel) bringt `auslegerMastAnbau` (app.js) den Masten auf H + b (halber Meter), wenn seine eingetragene Länge nicht reicht oder ein anderes Tragwerk ihn trägt; Meldung im Balken oben. Danach bleibt die Länge dem Nutzer (kürzer gestellt: Warnung). Im Browser: Mast 14 auf 9 m, zweiter Ausleger L 10 m an Mast 14 → «Mast 14 auf 12.50 m verlängert (war 9.00 m)». Die Stabwerk-Sperre für einen Ausleger an einem geteilten Masten bleibt (*Offene Punkte*) |
| Kleinigkeiten 30. Sept. (Anker, Masten-Schalter, Δz_F, Berichtsleiste) | «kontext menue beim anker auch ergänzen»: Rechtsklick auf Stab oder Fundament des Ankers → «Anker bearbeiten …», Seitenleiste, zoomen, entfernen, darunter die Einträge des Masten (`kontextAnker`). «diese option bei einem tragausleger entfernen» → «Tragwerk steht auf Masten» und «Masten … ausschalten» nicht beim Ausleger; alte Stände mit aus stehen wieder auf dem Masten. Δz_F am Einzelmasten auf Rückfrage **«Ausblenden»** (gemessen: mit Länge kein η, ohne Länge eine zweite Tür zur Länge); ein gespeicherter Versatz wird in die Länge überführt und auf 0 gesetzt (`einzelmastFussAnheben`), gleiches η. «die msten werden meist mit ganzen zahlen ohne punkt beschriftet» → Beispiel im Hinweis «z. B. 14». Leiste des Nachweisberichts weicht im installierten Fenster den Fensterknöpfen aus (Window Controls Overlay; im Browserbereich nicht prüfbar) |
| Grenzwerte der Gebrauchstauglichkeit (30. Sept.) | «unter den optionen sollte man noch die grenzwerte definieren können für fahrdraht und mastspitze»: zwei Felder unter *Optionen → Nachweise*, unter der Gebrauchstauglichkeit - `gzgGrenzeFahrdraht` [mm], Vorgabe 40, und `gzgGrenzeSpitze` (n in L/n), Vorgabe 100; leer oder ≤ 0 = Vorgabe. Eine Stelle (`verformungGrenzen`, core.verformung.js); der Kern gibt die Zahlen im Ergebnis mit (`grenzen`), Stabwerk, Kachelkopf und Bericht lesen sie dort. Im Browser: 30 mm / L/150 → Kopf «η = w / 30 mm bzw. L/150», Kachel «Mastspitze 12.50 m · 83 mm zulässig» |
| Tragausleger mit zu kurzem Mast (30. Sept.) | Gemeldet: «checke die mastschieber beim tragausleger, wenn ich da eine grenze über oder unterschreite blendet sich ein jochtragwerk ein». Befund: bei Mastlänge < H + b brach `tragauslegerModell` ab, das 3D fiel aufs Ersatzjoch (vier Winkel, zwei Masten) und die Seitenleiste zeigte Obergurt L 90×90×9, «Ende B», Anker, Fundament und η des Phantomjochs. Jetzt: das Bild baut weiter (`opt.bild`), zeigt den Masten in seiner eingetragenen Länge und die Warnung «MAST ZU KURZ FÜR DIE AUFHÄNGUNG · mindestens …» in der Fehlfarbe; die Seitenleiste zeigt «Tragausleger – nicht gerechnet», η «–», keine Mast-/Anker-/Fundament-/Verformungszahlen, keine Schnittgrössen oder Stellen des Ersatzjochs. Rechnen (Kern, Stabwerk, AxisVM) bricht weiter ab wie am 28. Sept. entschieden |
| Kacheln und Farbpunkte (30. Sept.) | «mach den hintergrund highlight aus und nur an wenn man darüberfährt mit dem zeiger» - die Tragwerk-Kacheln sind durchsichtig, unter dem Zeiger `--acc-s`. Zu den Anbauteil-Vorlagen «ich verstehe die farbzuweisung hier nicht»: der Punkt ist die Befestigungsart (Feld `farbe` im Sortiment: hängend, aufgesetzt, seitlich, direkt) - jetzt als Titel am Punkt und als Legende über den Kacheln. **Vorgemerkt:** Symbolbilder statt Punkte, «diese könnte man aus den querprofilen ableiten»; danach eine «maschine … die automatisch die querprofile interpretieren kann und ein modell daraus ableiten kann» - ausdrücklich erst nach den offenen Punkten |
| Mastspitze L/100 (30. Sept.) | «bei der gebrauchstauglichkeit die mastspize auslenkung infolge wind 1:100 anwenden. und unter den optionen deaktivierbar machen als unterpunkt». Auf Rückfrage **«Betriebswind ψ 0.70»**: nur Wind, charakteristisch × 0.70 (dieselben Fälle wie die 40 mm am Fahrdraht), in Gleis- und in Querrichtung, Grenzwert Mastlänge/100. Nachweisgruppe `spitzeMast` (Vorgabe an) als Unterpunkt «Gebrauchstauglichkeit» in *Optionen → Nachweise*; aus = Auskunft wie seit dem 26. Sept. `spitzeNachweis` (core.verformung.js) für Kern und Stabwerk. Ändert die Weisung vom 26. Sept. («lassen wir den nachweis für die mastspitze weg») für die Spitze unter Wind. Gemessen J90/20 m Standard (Kern): 78.3 / 85.0 mm, η 0.921 statt Fahrdraht 0.122 |
| Aufhängung Tragausleger 0.80 m (30. Sept.) | «der abstand der beiden aufhängungen beim tragausleger ist 0.80 m anstatt die 2m die ich mal angegeben habe»: Vorgabe ±0.40 m (`TA_SPREIZUNG_VORGABE`), Schieber bis 1 m; gespeicherte 1.0 werden einmal zu 0.4 (`spreizungAngehoben`). Gemessen: ±1.0 und ±0.4 geben dieselben η (Seile starr), kein Seil gedrückt |
| Bedienung 30. Sept. (Kacheln, Schieber, Rad, Mastnummer) | Aus einer Sammelweisung: Kacheln ohne doppelten Kreis, einzeilig, Einzelmast mit einfachem Ausleger, Anker durchgezogen, Tragausleger als einfache Linie; Auflagerskizzen nebeneinander; **Klick auf die Stegskizze dreht den Mast**, auch im Kontextmenü («Steg drehen»); Schieberbalken transparenter; **echte Mastnummer statt M1** (Feld `mastNummer` je Mast, Anzeige überall über `mastAnzeigeText`, Rechnung weiter mit M1…; auf Rückfrage «Überall in der Anzeige»); **Mausrad zoomt** statt zu schieben (waagrecht wischen schiebt, Touch unverändert). Lageband: «diese schemaskizze kann etwas höher sein, dann wirkt sie nicht so gestaucht» - Mast und Anker im Band 1.6-fach. **Noch offen aus derselben Weisung:** Signalbauer mit Bildern, Vorschau und Umschaltkacheln; «+ Bauteil aus der Lasttabelle» als Auswahlfenster; «Fahrleitung als Auflager ansetzen» nur mit Leiter; Rückstellkraft der Leiter am Joch (auf Rückfrage **«Halt in y, begrenzt»**: Halt in Gleislängsrichtung bis p · Z, Vorgabe 10 %, nur durchgehend/beidseitig abgefangen, nicht im Havariefall) |
| Nachweise aus dem Stabwerk, Seil nur Zug (30. Sept.) | «nachweis so wie vorgeschlagen umbauen» (Vorschlag: Anker, Fundament, Knicken für alle Tragwerksarten aus dem Stabwerk). Knicken und Fundament jetzt für JEDEN Masten aus dem Stabwerk (Fundament je Mast mit seinem Typ, `fundamentJe`), der Anker je Ende (`ankerJe`, core.stabseil.js: Seil = wirksame Kraft, Stütze = Fundamentreaktion auf der Achse, Regel `ankerAuswertung`). **Befund dabei, unsichere Seite:** das lineare Stabwerk liess den Seilanker DRÜCKEN (Einzelmast HEB 240, SA20 quer: Fundament Kern 0.300, Stabwerk 0.218; betraf auch die Mastkachel). Jetzt nach dem Entscheid vom 16. Sept.: je Seil ein Hilfslastfall (Kräftepaar an den Seilenden), in jeder Kombination mit Druck im Seil mit dem Faktor zugemischt, der die Seilkraft aufhebt - exakt linear, alle Nachweise lesen es über `anteileFuer`. Probe: hängt das Seil, trägt der Mastfuss wie ohne Anker (Rest ≤ 0.2 kNm = Eigengewicht des Seils); danach Fundament 0.299 (Kern 0.300). Anker SA20: Stabwerk 1.4 kN Zug (elastisches Seil), Kern 2.2 kN (steifer) |
| Kachel-Symbole, Schieber, Ausleger am Joch (30. Sept.) | «kannst du hier die kacheln mit symbolzeichnung noch versehen den text kann man dann kleiner unterhalb des symbols aufführen. theoretisch kann ein Tragausleger auch an ein bestehendes Jochtragwerk auf die aussenseite angehängt werden, kann man in diesem fall die kachel für diesen fall auch nutzen? mach die schieber hier überall da wo es sinn macht. und mach den balken etwas heller als den punkt.» Kacheln mit Strichsymbol (`TW_SYMBOLE`: Vierendeel-Joch, Einzelmast, Ausleger mit Seil, Abfangjoch als zwei Träger übereinander, Anker als Strebe), Anschrift klein darunter. Schieber selbst gezeichnet: Punkt in der Akzentfarbe, Balken bis zum Wert heller (`--schieber-fuell`, `schieberFuellen`); neu als Schieber Kragarm A/B (rastet 0.5 m), Konsole, Spannweite der Fahrleitung (Radius und Lage x₀ bleiben Zahl: grosser bzw. offener Bereich). Ausleger an einem Jochmasten: Kachel oder Mastwahl - er zeigt von selbst nach aussen; ⚠ **das Stabwerk sperrt einen Ausleger am Masten eines anderen Tragwerks noch** (siehe *Offene Punkte*) |
| Neues Tragwerk: Kontextmenü, Mastwahl, Kacheln (30. Sept.) | Weisung: «das kontextmenue beim 3d mit den optionen aus dem tragwerk (sidebar) ergänzen den Punkt Abfangjoch darüber setzen könnte man weglassen. das ist äusserst selten. was man aber machen könnte ist die auswahl der Masten anbieten wo der träger zu liegen kommen soll. man hat den fall das man schon zwei oder drei masten hat und dann ein joch dazwischen legen will. was ich mir auch vorstellen könnte ist, dass wir wieder auf die kacheln beim tragwerk gehen, diese könnte man dann per drag and drop auf die 3d fläche ziehen und man bekommt ein modalfenster mit den relevantesten eingaben zum tragwerk. was denkst du ist der kleverere weg?» Empfohlen: Kontextmenü mit Mastwahl (Masten sind feste Ziele, Ziehen landet auf 0.5 m); auf Rückfrage **«Beides»**. Gebaut: Dialog «Neues Tragwerk» mit **«Zwischen den Masten … und …»** (Tragausleger «An Mast»), Lage und Stützweite folgen (Tragjoch L = Abstand, sonst der erste passende Typ; Abfangjoch `abfangFuerStuetzweite`); Rechtsklick auf Mast/Grund bietet «… zwischen Mx und My …» bzw. öffnet den Dialog mit den Nachbarmasten vorgewählt (`vorbelegungAnStelle`), dazu die Einträge der Tragwerke; «Abfangjoch darüber setzen» ist weg. **Kacheln** statt «+ Tragwerk»: vier Arten und Zuganker/Druckstütze, anklicken oder ins 3D ziehen (Anker auf einen Masten, 2 m Fang) |
| Tragwerksleiste ohne Baum (30. Sept.) | «in der Tragwerkgruppe sehe ich infos, die ich schon im 3d oder nebenan in der resultat sidebar sehe», auf Rückfrage **«Lageband behalten, Baum weg»**. Weg: Zeilen je Tragwerk und Mast mit η, Auge, Anker-Chip. Anklicken im Band wählt (ein Mast sein Tragwerk mit), Ausblenden im Kontextmenü, Anker als Strich im Band, η in der Resultatspalte |
| Lampen und Trafos: Gruppe (30. Sept.) | «die lampen udn trafos in die gruppe übrige schieben»: die Vorlagen Lampe LED/alt mit Rohr und Trafo 50/100 kVA stehen unter «Übrige» statt «Am Masten» (`gruppe: 'uebrige'` in `data/anbauteile.json`, Sicherung `anbauteile_vor_gruppe_uebrige_2026-09-30.json`). Angeboten werden sie weiter nur am Masten - das regelt `ort`, nicht die Gruppe |
| Signalbauer (30. Sept.) | Auf Rückfrage: **«Signal-Anbauteil, wieder bearbeitbar»** und **«Im Signalbauer, eigene Gruppe»** für die Tragwerksteile. Vorlage «Signal (Signalbauer)» (Gruppe «Signale», am Joch und am Masten); ihr Modul ist ein freies Bauteil mit `signalbauer`, die Auswahl steht am Modul (`signal: [{id, anzahl, laenge}]`). Gewicht und Flächen werden bei jeder Rechnung aus der Tabelle `signalteile` (Sortiment Anbauteile, 41 Teile aus den Signal-Blättern der Mappe) summiert (`signalFlaeche`): G = n · Masse (· L) / 100 kN wie die Mappe (10 N/kg), A = n · Fläche (· L), Wind = A · q_ref · 1.4 (`SIGNAL_CW`). «Fläche längs» der Mappe ist die Fläche, die der Wind längs zum Gleis trifft (Q_y), «quer» die für Q_x - die Mappe zählt x in Gleisrichtung. Der Dialog «Signalbauer» (app.dialoge.js) zeigt Signale/Tafeln und Arbeitskorb/Schutz offen, die Tragwerksteile eingeklappt mit Länge; den Angriffspunkt setzt man in der Karte. Gegengerechnet an der Summenzeile der Mappe: G 1.65 kN, A 0.78 / 1.30 m², Wind EK2 1.2012 / 2.002 kN |
| Einwirkungs-Mappe: was gebaut wird (30. Sept.) | Auf Rückfrage gewählt: **Konsolen und Armaturen** (Spurhalter-/Auslegerkonsole, Abfangarmatur ohne/mit Nachspannrädern, Abfangrohr, Spurhalterbefestigung) als wählbare Bausteine (Rolle `aufbau` statt `stumm` in `fl_bauteile.json`); **Trafo 50/100 kVA** als Vorlagen am Masten (`mast-trafo-50/100`, Schwerpunkt vorläufig 0.50 m neben der Mastachse); **Wind auf den Tragausleger** (siehe eigene Zeile). **Doppelmast 2 RRW: «Später».** Zu den Signalteilen im Wortlaut: «die signaleteile zu einem separatem signalbauer, da kann man die teile auswählen und die resultierende last wird dann daraus berechnet und man muss nur noch den angriffspunkt wie bei den übrigen bauteilen definieren. Die Tragwerksteile für die Signalaufhängung können auch separat aufgeführt werden, da diese nur in ausnahmen an die FL-Tragwerke montiert werden. wir werden zu einem späteren zeitpunkt noch einen galgen tragwerk erstellen für die signale.» - ⚠ offen, siehe *Offene Punkte* |
| Wind auf den Tragausleger (30. Sept.) | Aus der Mappe, Zeile «Tragausleger übergreifend (fix)»: 0.23 / 0.28 / 0.33 kN/m je EK, **nur längs zum Gleis** (quer führt die Tabelle nichts). Im Stabmodell als Streckenlast in y, halb auf jede UPE, Lastfall WindY (`TA_WIND_BAUSTEIN` in export.axisvm.tragausleger.js); das Eigengewicht der Zeile bleibt draussen (steht im Sortiment). Gemessen (EK1, L 13 m, Hängestütze): **mit Längsanker** Mast 0.850 → **1.055**, Blech zwei Seile 0.208 → 0.288, Längsanker 0.54 → 2.00 kN; **ohne Längsanker** Mast 2.115 → **5.827**, Fundament 1.445 → 5.421, Knicken 1.107 → 1.552; L 8 m Fahrleitung direkt UPE 0.064 → 0.387. **Berichtigt am 30. Sept. (gemessen):** Torsion bekommt der Mast nur OHNE Längsanker (Hülle 33.1 kNm = Σ F_y · x des ganzen Auslegerwinds); MIT Längsanker 0.09 kNm. Dort teilt sich der Wind in Gleisrichtung zwischen Längsanker (2.00 kN char.) und Mastanschluss (~1.5 kN auf Höhe H) - der Ausleger wirkt im Grundriss fast wie ein Balken auf zwei Stützen, weil der offene Mast gegen Verdrehung weich ist; der Rest biegt den Masten in Gleisrichtung (MAST_MT1_S1 am Fuss unter «Wind +y»: M_y 66.8, M_z 52.2, T 0.09 kNm, N 22.3 kN; η 1.054). Nur ein Gurt in x gehalten gäbe 1.57 kNm Torsion (Seildruckkraft ausmittig) und Mast 1.205 |
| Startwert der Masten (29. Sept.) | «setze noch als startwert die HEB 260 Masten»: Feld, Ende B und Mastdialog starten mit **HEB 260**. Gemessen J90/20 m, Stabwerk Mast M1: HEB 240 η 0.786 → HEB 260 0.671. Der Prüfstand hält seine gemessenen Zahlen ausdrücklich auf HEB 240 fest (`standardwerte` in pruefung.mjs), Abschnitt 157 prüft die neue Vorgabe |
| Werteplot im 3D (29. Sept.) | «die werteplotts im 3d sichtbarer machen»: die Ziffer **fett in der Textfarbe**, einen Punkt grösser, auf fast deckendem Kästchen; die Skalenfarbe als **Streifen und Rahmen** (`_wertMarke`). Ändert die Deckkraft-Weisung vom 20./24. Sept. («transparenter») - blaue Ziffern auf blassem Grund vor blauem Gurt waren bei kleinem η kaum zu sehen. Der Schalter «Werte anschreiben» bleibt voreingestellt aus |
| Nachweiskachel → Stab (29. Sept.) | «beim anklicken der nachweiskachel auf massgebenden stab im modell klicken»: jede Kachel aus dem Stabwerk trägt ihren massgebenden Stab (`wo` der Hülle, `kachel(…, { stab })`); ein Klick fährt im 3D dorthin und umrandet ihn mit «massgebend: …» (`zeigeStab` in render.3d.js). Die Flächen der Szene kennen dafür ihre Stäbe (`staebe`, render.stabwerk.js / render.tragausleger.js). Steht der Stab nicht im Bild (Ersatzbalken), sagt es eine Meldung. Kacheln des Kerns fahren wie bisher an die Station |
| Grundwerte beim neuen Tragwerk (29. Sept.) | «die EK Eingabe die Spannweite und Radius eingabe, diese könnte man beim erstellen eines neuen tragwerks in einem modall festhalten als eingabeparameter und eine checkbox nicht mehr nachfragen in deisem projekt»: der Dialog «Neues Tragwerk» zeigt EK, Spannweite der Fahrleitung und Radius und schreibt sie ins **Blatt** (sie gelten allen Tragwerken). Das Kästchen «In diesem Projekt nicht mehr nachfragen» setzt das Blattfeld `grundwerteFragen` = false; danach nennt der Dialog die Werte nur. Wieder einzuschalten unter *Lasten → Trasse* |
| Abfangjoch: Leiterzug je Leiter (29. Sept.) | Auf Rückfrage: «Jeder Leiter (Tragseil, Fahrdraht, Kettenwerk) zieht nach seiner Abfangart, gleichgültig woran er hängt … angesetzt zentrisch in der Trägermittelebene an seiner Stelle x … Die pauschale Fh entfällt überall (auch in AxisVM). Die Zugrichtung wählt man am Leiter (+y / −y) wie beim Tragjoch.» Dazu: «bei den fixpunkten … wird dann bei einem leiterbruch die kettenwerklast angesetzt» (= beidseitig). `abfangZugNachArt` (core.abfangjoch.js): einseitig ständig Z, Riss 0; beidseitig ständig 0, Riss Z; durchgehend ständig 0, Riss 0.1 Z. Im Havariefall reisst **ein** Leiter (`bruchLeiter`). Ohne Richtung am Leiter gilt die Seite der Anbindung; der alte Verlauf «durchgehend» gilt als Art, solange am Leiter keine steht. Kern, Bild und Ausleitung lesen dieselbe Stelle |
| Abfangjoch im Stabwerk (29. Sept.) | «abfangjoch im stabwerk anschliessen»: in `ARTEN_MIT_STABMODELL`, Masten im Einzelfall und im Blatt, Gabel (2 × UPE) als Gurt mit Doppel-U-Querschnitt, Bleche als Blech; Kacheln Gurt/Blech aus dem Stabwerk. Gemessen A160/11 m, N-FL einseitig 14.9 kN: Kern Gurt 1.495, Stabwerk 2.227 - der Unterschied ist die örtliche Biegung um die schwache Achse am Angriff des Leiters (8.2 gegen 2.8 kNm), die der Kern nicht sieht |
| Freie Last (29. Sept.) | Frage «kann man bei der freien last verschiedene lastarten eingeben …», auf Rückfrage **(b)**: ein Punkt, darunter eine Zeile je Lastart. Ohne Formatwechsel - jeder Block behält Lage und eine Einwirkungsgruppe, gleiche Kennung `punkt` = ein Punkt in der Karte |
| Lastfallgruppen (29. Sept.) | «Die Gruppennamen wie vorgeschlagen, und die seltenen Fälle weglassen»: «Charakteristisch — Anker, Fundament, Aufhängung», «Gebrauchstauglichkeit — Verformung (Betriebswind)»; die acht Fälle «Gebrauchstauglichkeit selten» sind weg (kein Nachweis las sie) - auch aus AxisVM-Datei und Bericht |
| Felder des Ersatzbalkens (29. Sept.) | «Endauflager nur Ersatzbalken, sonst ausblenden bei stabwerk»: Endauflager (samt c_φ), «Anschluss ans Joch» und «Einspannung begrenzen» stehen nur beim Rechenverfahren Ersatzbalken (`nurErsatzbalken`); gemessen ändern sie am Stabwerk keine Stelle |
| Konsole in m (29. Sept.) | «können wir die konsole in m angeben?»: Feld `auflagerKonsoleM` [m], alte Stände in mm werden beim Laden umgesetzt (`standAnheben`); unter 5 mm wird mit 5 mm gerechnet (unter 1 mm brach das Stabwerk ab) |
| Ablenkung je Leiter (29. Sept.) | «ob man einen individuellen ablenkwinkel eintragen will oder die spannweite, am besten zugeklappt»: Aufklappteil «Ablenkung» mit der Wahl Trasse / Winkel / Spannweite; die andere Angabe wird geleert |
| COM-Skripte mitliefern (29. Sept.) | «beim exportieren der axis modells, fragen ob man die scriptdatein … mit generieren will im ausgewähltem ordner wie die json datei»: Kästchen «Skriptdateien mitliefern» beim Format JSON; mit Ordnerwahl (Chrome/Edge) liegen Modelldatei und Skripte zusammen, sonst als Downloads. `js/export.comskripte.js`; die Einzeldatei bettet die Skripte ein (CR LF) |
| Alte Stände laden (29. Sept.) | Gemeldet «Ich konnte heute die alten Modell nicht alle laden»: **ein** Weg zum Anheben (`standAnheben`) für Start, Ablage und Vorlage; Teile am Masten in alter Form gehen beim Tragwerkswechsel nicht mehr verloren (gemessen am geteilten M2 1.4870 → 1.4383 ohne Berichtigung, unsichere Seite); ein Ladefehler stellt den vorigen Stand wieder her und nennt den Grund. Dazu der Absturz am Einzelmasten (`kombi` vor der Erklärung), der jeden Einzelmast als «lässt sich nicht laden» erscheinen liess |
| Gurtspannung im Stabwerk (26. Sept.) | Auf Rückfrage nach dem Einbau von I_yz: **vorzeichenrichtig, nach Messung**. Die Hülle über ±M_y, ±M_z in `randspannung()` war für den Ersatzbalken gebaut (er führt Beträge); das Stabwerk kennt die Vorzeichen, und seit I_yz sind beide Komponenten gross (J90/20 m: Hülle η 0.4684, vorzeichenrichtig 0.3268). Zuerst wird die Vorzeichenkonvention (Endkräfte des Lösers ↔ Formel von `randspannung`) an einer geschlossenen Lösung im Prüfstand gemessen, dann im Stabwerksweg umgestellt. **Der Ersatzbalken behält die Hülle** — er kennt die Vorzeichen nicht |
| Nach I_yz zuerst der Anschluss (26. Sept.) | Auf die Frage, womit es weitergeht: **zuerst der Anschluss Joch–Mast gegen AxisVM** (Wind längs am Jochende, Mastfuss M_y ständig), danach Punkt 2 (Tragausleger). Ohne neuen AxisVM-Lauf, solange die Ergebnisse reichen |
| e_y des UPE 160 (26. Sept.) | Befund: 1.84 statt 2.27 cm in `data/normen.json` (aus den Normmassen gerechnet; UPE 200/240 stimmen). Auf Rückfrage: **«Berichtigen»** — Wirkung am A160 vorher → nachher gemessen, siehe *Letzte Schritte* |
| Tragausleger: Modell und Nachweise (26. Sept.) | Auf Rückfrage: **Aufhängung als EIN Pendelstab mittig** (gelenkiges Starrelement vom Mast zur Mitte der Ankertraverse bei c₁, die Traverse verteilt starr auf beide Gurte). **Anschluss am Mast wie beim Abfangjoch** (Konsole 150 mm, Links 50 mm je Gurt): die Gurte liegen nebeneinander, deshalb ist der Anschluss um die Querachse von selbst gelenkig — wie es die Kontrollformel der Zeichnung voraussetzt, V = Σ(F_V·x)/c₁ + Σ(F_H·z)/c₁. **Nachweise:** UPE und Bindebleche (wie Abfangjoch), **Aufhängung gegen V_zul = 5 kN** (Kontrollwert der Zeichnung, darüber «separate statische Berechnung erforderlich»), Mast und Fundament. **Kern für die Anzeige: den Abfangjoch-Kern anpassen** (Gelenk am Mast, Seilauflager bei c₁, Kragarm c₂); das Urteil bleibt beim Stabwerk. **Längsverankerung** im Wortlaut: «1, wobei hier die 10m regel nicht berücksichtig werden soll. die längsverankerung ist entweder zuzuschalten mit angabe zur stelle x oder die gehängten kettenwerke oder rückleiter wirken stabilisierend (rückstellkraft) wie man diese am besten bestimmen könnte, können wir noch festlegen, ich stelle mir eine rückrechnung vor, die aus den einwirkungen resultiert und gemessen an den basiszugkräften der jeweiligen leiter eine prozentzahl ausgibt.» Also: **zuschaltbar mit Stelle x**, keine 10-m-Regel; die Rückstellkraft der Leiter ist ⚠ noch festzulegen |
| Tragausleger: Bauform und Aufhängung (26. Sept.) | «die tragstruktur ist ähnlich der abfangjoche und der anschluss auch» und «die aufhängung kann über starrelemente erfolgen, die aber gelenkig angeschlossen sind». Nach Zeichnung (Übersicht Tragausleger, Werkstattzeichnung UPE 140): **liegender Vierendeelträger aus zwei UPE 140**, 280 mm licht (410 mm aussen), Bindebleche FL 100×10, L = 280 mm, **oben und unten** (bei L = 6 m 6 Stellen × 2 = 12 Stück), Raster a + n·b + 60 mm nach Tabelle; am Masten als **Gabel** um den Mast geklemmt wie das Abfangjoch. Aufgehängt an einem **Schrägseil** (2 × Stahlkupferseil 50 mm²) vom Mast in der Höhe b über dem Ausleger zum Punkt im Abstand c₁, dann Auskragung c₂ (L 6–13 m: b 2.35–6.35, c₁ 3.97–10.88, c₂ 1.78–1.87 m). Die Aufhängung wird als **Starrelement mit gelenkigen Anschlüssen** abgebildet (Pendelstab, nur Längskraft) |
| Weiter mit dem Tragausleger (26. Sept.) | «weiter mit punkt 2 tragausleger. die zeichnung ist unter grundlagen zu finden.» (Nachricht danach abgebrochen) — Auftrag Punkt 2: eigener Kragarm-Kern für die Anzeige, Stabwerk für das Urteil, zwei UPE 140 nach Sortiment; die Quelle der Geometrie ist die Zeichnung unter `Grundlagen/` |
| Linkkopplung im Löser (26. Sept.) | «ja löser auf linkmitte umstellen»: der Löser koppelt jedes Linkelement in der **Mitte des Links** (Hebel L/2 an beiden Knoten), wie die berichtigte COM-Brücke (`Position` = halbe Linklänge) und wie die Weisung «halbe Länge» es meint. Vorher: Arm am i-Ende, Gelenk am Gurtknoten. Gemessen am Torsionsmodell gegen AxisVM: G Mast M_y 11.1 → 0.2 %, Umlenkung Blech M_z 98 → 3.6 %; am Urteil Einzeljoch Mast 0.7708 → 0.7713, Reihe 1.3493 → 1.3490 |
| Tragausleger: zwei Seile, gespreizt (28. Sept.) | Mit zwei Bildern (Anschluss am Masten, 3D): «beim auflager sollten die gurte um die z achse beim joch eingespannt sein, da sie vor und hinter dem masten gehalten sind. würde das das letzte blech entlasten? und würde es etwas bringen, wenn man wie in der normzeichnung zwei seilanker ansetzt die in einem abstand von 2 m jeweils 1 m ab kragarm achse in gleislängsrichtung? die frage ist wie man es im axis modellieren will, dass es nur zug aufnimmt und kein druck», dazu die Skizze der Ankertraverse (Detail W: die Seile greifen an ihren Enden an). Gemessen (Studie), dann auf Rückfrage: **zz am Link «Frei lassen»** - die Einspannung hilft dem Blech nicht (L 13 m mit Längsanker 1.029 → 1.035, ohne 1.208 → 1.155), es trägt die Torsion als gegengleiche Biegung der oberen und unteren Blechebene. **Zwei Seile «Ja, Spreizung als Eingabe»** - Feld `auslegerSpreizung` (je Seite, Vorgabe 1 m, 0 = ein Seil in der Achse); die Traverse ragt starr aus, je ein Seil an ihren Enden, am Masten ein Punkt; V_zul gegen die Summe der senkrechten Anteile. **Nur Zug:** linear gerechnet, das Eigengewicht spannt vor; gemessen bleibt jedes Seil in jedem Fall gezogen (kleinste 3.06 kN bei L 13); drückte eines, meldet es der Nachweis. In AxisVM hiesse echtes «nur Zug» nichtlineare Rechnung je Kombination - nicht gebaut. **Lageband:** zuerst «Seil ab Ausleger massstäblich» (Weisung «diese proportion ist zu verzerrt vom mast zu ausleger»), dann «das sieht nicht stimmig aus, in bezug auf die restlichen darstellungen der tragwerksteile. mach gegehvorschlag für den oberen teil.» - auf drei Gegenvorschläge **«A ausführen»**: der Ausleger ist eine Linie in einer Bahn wie ein Joch (Endmarke nur am Masten, Name darüber), die Aufhängung eine hängende Marke bei c₁, Seil, b, α und Seilzahl im Titel |
| Bilder im Stabwerksweg (29. Sept.) | Auf Rückfrage: **3D-Plot «Alles als Hülle je Stab»** - η, σ und N, V, M, T je Stab als Maximum über alle Kombinationen, feiner als je Feld (je Stababschnitt); nur bei gewählter Hülle, ein Einzellastfall zeigt den Kern. **Verläufe «Stabwerk, Ersatzbalken eingeklappt»** - oben η der Gurte (Treppe je Stab), Bindebleche je Station, Gurtkraft, je Mast η und Schnittgrössen über die Höhe; der Ersatzbalken eingeklappt darunter. Über den Reiter *Schnitt* ist jetzt neu zu entscheiden (Entscheid «Schnitt und Bilder», 28. Sept.) |
| Abfangung des Leiters beim Bauteil (29. Sept.) | «wie gibt man bei einem joch leiter ein die abgefangen sind (nivht durchgehend. die eingabe über die leiter sollte direkt bei den bauteilen erfolgen.» Die Bauteilkarte trägt je Leiter «Abfangung» (durchgehend / beidseitig / einseitig) und bei einseitig die Zugrichtung (am Abfangjoch ohne Richtung, sie kommt dort aus der Anbindung); die Havarie-Karte zeigt es nur noch an. Gespeichert wie bisher unter `werte.havarie[leiterKennung]` |
| Tragausleger neben anderen Tragwerken (29. Sept.) | Gemeldet: «ich kann keinen tragausleger bauen, es kommen nur die joche als auswahl.» Der Dialog «Neues Tragwerk» führt beim Ausleger seine Längen und die Seite. Befund der Prüfung danach: ein Ausleger auf einem Blatt mit anderem Tragwerk wurde nie gerechnet und sperrte das Joch daneben mit. Gerechnet wird jetzt die **zusammenhängende Gruppe** (Tragwerke mit gemeinsamem Masten, `verbundeneTragwerke`); am geteilten Masten bleibt die Sperre |
| Aufbau des Tragauslegers in AxisVM (28. Sept.) | «checken mit aufbau in axisvm, optimieren und pushen» - Anweisung für den AUFBAU (gebaut, nicht gerechnet), Behebungen, dann Push. Befunde und Behebungen siehe *Letzte Schritte* |
| Tragausleger im 3D: Titel und b-Mass (28. Sept.) | Mit zwei Bildern: «hier auch kurzform bei Tragausleger wie bei den restlichen bauteilen. die vertikale vermassung weiter weg vom bauteil setzen.» Auf Rückfrage **«TA · 2 × UPE 140 · 11.00 m»** (eigenes Kürzel, damit er sich vom Masten MT1 unterscheidet); das Mass b steht 1.0 statt 0.4 m neben dem Masten, auf der Seite ohne Ausleger |
| Knicken: Joch aus dem Stabwerk; Ausleger geklärt (28. Sept.) | «kannst du noch das knicken nachziehen und die com schnittstelle und die bauteildaten datei aktualisiseren». Auf Rückfrage: **«Joch: Knicken aus dem Stabwerk»** - dieselbe Regel (`mastStabilitaet`, SIA 263) mit den Kräften des Stabwerks für jeden Masten, der ein Tragjoch trägt (`knick` in rechneStabwerk; Kachel, Gruppe, Schiene, Tragwerksliste, Urteil); Einzelmast und Abfangjoch bleiben beim Kern. Und **«Tragausleger: Knicken 1.027 klären»** - gemessen, kein Fehler, keine Änderung (siehe *Letzte Schritte*). COM: die Seile tragen «nur Zug» für AxisVM; das Datenpaket liegt neu in `Versand/` |
| Tragausleger: Aufhängung b und Mastlänge (28. Sept.) | Mit einer Skizze: «der mast hat eine gesamtlänge l oder h, am besten gleich geschriftet wie bei den übrigen masten. man muss aber den abschnitt b eingeben können. in der normzeichnung ist der winkel mit 30° angegeben, diesen wert kann man als start nehmen. es kann aber sein das man spezialfälle hat wo dieser winkel kleiner oder grösser ist.» Auf Rückfrage: **«Beide gekoppelt»** - Felder b und α unter dem Ausleger, gespeichert wird allein der Winkel (`auslegerWinkel`, Vorgabe **30°**, Schieber auf 5°), b = c₁ · tan α (c₁ nach Sortiment); wer b eintippt, setzt den Winkel. **Nachgefragt:** das b der Tabelle entspricht 30.1–30.6°, genau 30° gab b um 3–10 cm kürzer - Antwort **«b der Tabelle»** (Regel «Massgebend sind die Daten»): ohne Eintrag (gespeichert 0) gilt die Spalte b des Sortiments und der Winkel wird daraus angezeigt; ein eingetragener Winkel oder ein getipptes b überschreibt, 0 kehrt zur Tabelle zurück. **«H + b, halber Meter»** - die Mastlänge heisst wie bei den übrigen Masten und ist ohne Eintrag H + b, auf den halben Meter aufgerundet (`mastLaengeFuer`, eine Stelle für Maske, Kern, Stabwerk, Bild); eine eingetragene Länge unter H + b wird als **«Mast zu kurz für die Aufhängung»** gemeldet (Notiz am Feld, Hinweisliste; Kern und Stabwerk rechnen dann nicht) |
| Tragausleger: Maske, Seite, Lageband (28. Sept.) | Mit Bild der Seitenleiste: «oben beim Mastsymbol noch einen Ausleger mit Aufhängung ergänzen. der Ausleger kann zudem links oder rechts sein. bei der Eingabe der Länge steht noch Jochtyp. Die Masse sollten unter profile wandern. beim auflager ist auch noch alles mit joch benannt und die auflagerskizze sollte die vom abfangjoch übernommen werden, da die Bedingungen gleich sind. es stellt sich noch die frage ob man die Anschlusshöe besser unter dem auslger laufen lässt anstatt beim masten.» Auf Rückfrage: **Seite «Ganz spiegeln»** (Kern, Stabwerk, AxisVM, 3D, Lageband), präzisiert: «es soll nur die geometrie gespiegelt werden. die einwirkungen das trasse bleiben so wie definiert. der masten kann somit in der kurven innen oder aussenseite stehen.» - Feld `auslegerSeite` (Vorgabe rechts) und **Anschlusshöhe «Beim Ausleger»** (Feld «Höhe Ausleger über Fundament» in der Gruppe des Auslegers). Ebenso der Längsanker: «diese Angaben gehören auch zum Tragausleger und nicht zum Masten» - Schalter und Stelle stehen unter dem Ausleger, gleich unter der Höhe. Die Auflagerskizze führt Gurt vorn / hinten mit der Vorgabe «A» (`LINK_VORGABEN.tragausleger`, eine Stelle für Skizze und Modell) |
| Tragausleger: Kragarm-Kern (28. Sept.) | Auf Rückfrage zum Umfang des Kerns (Etappe 3b): **«Lotrecht»** - nur die lotrechte Ebene: Gelenk am Masten, Seil bei c₁, Kragarm, Eigengewicht des Sortiments und Anbauteile; das ist die Kontrollformel der Zeichnung. Vorläufig stehen UPE (Biegung + Druck aus dem Seil), Aufhängung, Mast und Fundament auf seinen Kräften; **Bindebleche, Torsion und Längsanker nur im Stabwerk** (Kacheln «nur im Stabwerk»). Gemessen: Seil 1-2 % über dem Stabwerk, Mast weit darunter (L 13 m mit Hängestütze 0.590 gegen 2.103) - deshalb nur vorläufig und ohne Stabwerk «NICHT nachgewiesen» |
| Tragausleger: x auf die Länge (28. Sept.) | «ich habe die 6 eingetragen als test. die x werte sollten auf die länge limitiert werden.» Die Stelle des Längsankers (jetzt ein Schieber) und die Lage der Anbauteile am Ausleger enden am **Kragarmende L − 0.25** (`kragarmEnde`); eine grössere Eingabe wird darauf begrenzt, und wird der Ausleger kürzer, rückt der Längsanker mit |
| Tragausleger: Längsanker (28. Sept.) | «beim tragausleger wid ein längsanker angebracht am ende des kragarms um die torsionseinwirkung abzufangen.» Auf Rückfrage: **«Regelfall, abschaltbar»** (Feld `laengsverankerung`, Vorgabe an; `laengsverankerungX`, 0 = Kragarmende) und **«Nur Zug, beidseitig»** — zwei Seile ±y ohne Vorspannung, im linearen Stabwerk ein fester Halt in y (es trägt das Seil, zu dem hin gezogen wird). Ersetzt die Vorgabe vom 26. September («zuschaltbar»). Die Seilkraft steht als **Auskunft** (kein Widerstand im Sortiment); die Neigung der Seile ist nicht berücksichtigt |
| Tragausleger: Seil und Torsion (28. Sept.) | **Seil gegen V_zul: «Nur wirkliche Zustände»** — ganzes G, G + Wind je Richtung, Havarie; nicht die beiden Hälften von G («Ständig (Tragwerk)», «Ablenkkräfte ständig») und nicht Wind allein. Gemessen L = 8 m mit Hängestütze: Tragwerkshälfte allein S_v 5.54 kN, ganzes G 4.73 kN, die Ablenkhälfte allein drückte das Seil. **Hängestützen am Tragausleger:** zuerst «Fahrleitung hängt direkt», dann präzisiert: «es gibt hängestützen die den fahrdraht abziehen. die torsion entsteht dann aus dem wind auf die mitte der hängestütze.» Beide Fälle sind Prüfbeispiele; so setzt die Vorlage `hs-fahrdraht` den Wind der Stütze auch an (Modul bei z = −1.35 m, die Fahrleitung trägt in Gleisrichtung keinen Wind) |
| Tragausleger: Nachweise vor dem Kern (28. Sept.) | Seit «Stabwerk führt» liefert der Kern nur noch die vorläufige Anzeige und das Knicken. Auf Rückfrage: **«Erst Nachweise im Stabwerk»** — Etappe 4 (UPE-Gurte, Bindebleche, Aufhängung, Mast, Fundament) vor Etappe 3 (Kern). **Aufhängung gegen V_zul = 5 kN: «Charakteristisch»** — senkrechter Anteil der Seilkraft aus dem Stabwerk über die charakteristischen Fälle (alle Beiwerte 1, wie Anker und Fundament); ein gedrücktes Seil ist ein eigener Befund. **Knicken und Fundament am Mast des Auslegers: «Aus dem Stabwerk»** — der Kern rechnet den Ausleger mit einem erfundenen Auflager am freien Ende, seine Mastkräfte gelten dort nicht |
| Schnitt und Bilder im Stabwerksweg (28. Sept.) | Nach dem Einbau von «Station + Stabliste»: «ich bin mir nicht sicher ob der schnitt wirklich sinn macht, man sieht die ausnutzung und spannungsverteilung besser über visuelle abbildungen so wie unter verläufe oder dirkt im 3d beim resultat plott.» Befund dazu: **Verläufe und 3D-Resultatplot zeigen noch den Ersatzbalken**, während die Kacheln aus dem Stabwerk stehen. Auf Rückfrage: **«Erst Tragausleger»** — der Schnitt bleibt vorerst, wie er ist; danach die Bilder aufs Stabwerk (η/σ je Stab im 3D, Verläufe je Teil), und dann ist über den Schnitt neu zu entscheiden (Varianten: zurück auf den Ersatzbalken, nur Stabliste, im Stabwerksweg ausblenden) |
| Knicken Mast: Vorgabe aus (28. Sept.) | Frage: «ist das knicken über die optionen auch beim stabmodell möglich?» — ja, die Knick-Kachel des Stabwerkswegs kommt aus dem Kern und fällt mit dem Schalter weg. Weisung: **«den knicknachweis deaktiviern beim start»** — `knickenMast` ist voreingestellt **aus** (`standard: false` in `NACHWEISGRUPPEN`). Ändert die Vorgabe vom 15. September («er bleibt voreingestellt an»). Ein neues Dokument trägt die Wahl ausdrücklich; gespeicherte Stände rechnen weiter mit ihrer. Nicht geführt heisst wie überall: steht unter «nicht geführt», zählt nie als erfüllt. ⚠ Wer es aus lässt, weist einen schlanken Masten um bis zu rund 8 % zu günstig nach (Messung HEB 260/12 m, 2. Sept.) — die Weisung vom 15. September begründet es mit den stabilisierenden Leitern. Der Prüfstand rechnet das Knicken weiter mit (er prüft die Rechnung selbst) |
| «Nur Wind» im Verformungsnachweis (28. Sept.) | Befund beim Überführen ins Stabwerk: die Auswahl «nur Wind» nahm auch die vier Fälle «Ständig + Wind» (gwk…, G = 1) mit und rechnete 0.7·G + 0.7·W; massgebend war genau so ein Fall. Auf Rückfrage: **«Nur Wind»** — wie am 24. September entschieden. Eine Stelle für Kern und Stabwerk (`nurWindFaelle` in core.verformung.js). Gemessen am J90/20 m, quer auf 7.50 m: Kern 5.474 → **4.886 mm**, Stabwerk 5.309 → **4.897 mm**; am Randmast der Reihe Stabwerk 5.727 → 4.897. Damit stimmen Kern und Stabwerk überall auf 0.2 % — der ganze Unterschied sass im ständigen Anteil |
| Gebrauchstauglichkeit ins Stabwerk (28. Sept.) | Frage des Auftraggebers: «wurde die gebrauchstauglichkeit auch in die stab nachweis methode überführt?» — nein, sie kam aus dem Ersatzbalken (gemessen 26. Sept.: am geteilten Masten der Reihe quer 4.89 statt 5.81 mm, −16 %, unsichere Seite). Auf Rückfrage: **«Ins Stabwerk»** — die Verschiebung an der Referenzhöhe kommt aus den Knotenwegen des Lösers unter den Betriebswind-Fällen (ψ 0.70), zwischen den Mastknoten nach der Biegelinie; ohne gültiges Stabwerk der Kern, «vorläufig» |
| Verformung mit Ampel (28. Sept.) | «die kacheln haben keine farbe unter übersicht». Auf Rückfrage: **«Verformung mit Ampel»** — die Verformungskacheln tragen die Ampel wie die Nachweise (η = w / 40 mm). **Ändert den Entscheid vom 24. September** («Kachel ohne Ampel», «färbt kein Urteil») für die Kacheln |
| Schnitt im Stabwerksweg (28. Sept.) | «könnte man schnitt überarbeiten, dass es einen grösseren nutzen hat bei methode stab berechnung?» Auf Rückfrage: **«Station + Stabliste»** — an der gewählten Station die Schnittgrössen der vier Gurte und der Bleche aus dem Stabwerk mit Randspannung und η (statt der Aufteilung des Ersatzbalkens); darunter je Teil die zehn höchstbeanspruchten Stäbe mit Kombination, ein Klick fährt ins Modell |
| Tragausleger: Anschluss am Masten (28. Sept.) | Auf Rückfrage mit zwei Varianten: **«A»** — **beide Gurte halten x, y, z und K_XX** (yy, zz frei). Die Gurte liegen 0.32 m nebeneinander; nur ihr Kräftepaar in x hält die Drehung um die Lotrechte (die Aufhängung liegt in der Ebene x–z und trägt quer dazu nichts). Seitenwind auf den Ausleger geht damit als **Torsion** in den Masten; um die Querachse bleibt der Anschluss gelenkig, wie die Kontrollformel der Zeichnung es voraussetzt. Variante B (nur ein Gurt in x) wäre ohne weitere Halterung ein Mechanismus. Im Code `TA_LINK_VORGABE` (export.axisvm.tragausleger.js) |
| Anzeige: Stabwerk führt (28. Sept.) | Frage des Auftraggebers mit Bild der Seitenleiste: «diese auswertung ist etwas irreführend wenn ich für stabwerk modell und balken verschieden ausnutzungwerte in einer maske sehe? wollen wir nach der berechnung nur auf die stabwerk ausnutzung setzen? was spricht dagegen?» Auf Rückfrage: **«Stabwerk führt, Knicken ergänzt»** — nach der Berechnung stehen Hauptkachel und Kacheln Joch/Mast aus dem Stabwerk; das **Knicken** des Masten bleibt beim Kern (der Löser rechnet keine Stabilität) als eigene Zeile, das Urteil ist das Maximum mit Quelle; Gebrauchstauglichkeit, Anker, Fundament vorerst aus dem Kern, als «Ersatzbalken» beschriftet; ohne gültiges Stabwerk der Kern mit Vermerk «vorläufig». **Auslösung automatisch, verzögert** (~1 s nach der letzten Eingabe; der Knopf bleibt für «jetzt rechnen») — das ändert die Weisung vom 25. September (nur Knopf). **Reihenfolge: erst die Anzeige**, dann der Tragausleger |
| Torsionsmodell rechnen (26. Sept.) | Nach dem Zeigen der Modelldatei: **«ok rechnen lassen»** — Anweisung für EINEN AxisVM-Lauf von `com/AxisVM_Torsion_J90_20m.json` (bauen, linear statisch, auslesen), erstmals mit der berichtigten Lage der Linkverbindung |
| Torsionsfall für den AxisVM-Vergleich (26. Sept.) | Vorschlag des Auftraggebers: «wäre es nicht noch interessant ein anbauteil zu legen das zusätzlich torsion im joch provoziert». Auf Rückfrage: eine quer versetzte Hängestütze «gibt es nicht, hier wäre eine hängestütze senkrecht und eine last zum beispiel infolge windangriff zu sezten. der fall mit einer zusätzlichen ausleger und leiter mit ablenkung wäre sicher auch interessant für die lokalen einwirkungen in die gurte.» Also zwei Fälle — **(1) senkrechte Hängestütze mit waagrechter Last (Wind) an ihrem Ende**, Torsion über den Hebel unter der Jochachse; **(2) Hängestütze mit Ausleger und Leiter mit Ablenkkraft**, örtliche Einleitung in die Gurte —, je **nahe am Jochende und in Feldmitte**, je ein eigener Lastfall. Gerechnet **nach der Auswertung** des Laufs mit den Knotenwegen |
| Anschluss: AxisVM-Wege auslesen (26. Sept.) | Nach dem Eingrenzen (`vergleich_anschluss.mjs`, alle naheliegenden Modellgrössen gemessen ausgeschlossen) auf Rückfrage: **«Brücke erweitern und rechnen»** — die Auslesung um Knotenverschiebungen (und Linkkräfte, soweit die Schnittstelle sie hergibt) erweitern und das Einzeljoch J90/20 m in AxisVM neu rechnen (~11 Minuten). Das ist die ausdrückliche Anweisung für diesen einen Lauf |
| Reihenfolge der nächsten Arbeiten (26. Sept.) | **Zuerst I_yz im Löserkern**, dann der Tragausleger, dann die Nachweise. Auf die Frage, womit anzufangen sei, ausdrücklich so gewählt — obwohl der Tragausleger heute auf der unsicheren Seite liegt. Der Grund trägt: die Ursache der 13–25 % ist benannt und billig zu messen (die AxisVM-Ergebnisse liegen in `com/`, **kein neuer Lauf nötig**), und solange der Löser die Gurte falsch rechnet, übernimmt jeder weitere Schritt diesen Fehler — auch der Tragausleger, der ins selbe Stabwerk soll |
| Tragausleger: beide Wege (26. Sept.) | **Eigener Kragarm-Kern für die Anzeige, Stabwerk für das Urteil** — wie heute beim Joch. Der Kern liefert Hauptkacheln, Verläufe und Bericht ohne Umbau der Oberfläche, das Stabwerk das Einspannmoment am Masten aus dem System statt aus einer zweiten Herleitung. Nach Sortiment besteht der Ausleger aus **zwei UPE 140**, nicht aus vier Winkeln; heute rechnet der Kern ihn als Einfeldträger mit einem Phantom-Auflager am freien Ende (L = 12 m: M_A 10.9 statt 57.3 kNm) und ist deshalb als «NICHT nachgewiesen» gekennzeichnet |
| Nachweise auf den Löser (26. Sept.) | «in den nachweisen die löser abbildungen übernehmen», dazu **Bericht und Excel auf den Stabwerksweg** (Schritt 6 des Bauplans) und ein **Bericht für Tragausleger und Abfangjoch** — damit ist der Entscheid vom 18. September («den abfangjoch weglassen») aufgehoben. ⚠ **Der Knicknachweis kann nicht mitwandern:** die Stabilität rechnet allein der Ersatzbalken (`core.mast.js`), der Löser führt sie nicht. Wer ganz umschaltet, weist einen schlanken Masten rund 8 % zu günstig nach. Die Abbildungen und Schnittgrössen kommen aus dem Löser, das Knicken bleibt beim Kern — und der Bericht muss sagen, woher welche Zahl stammt |
| Lagerung Tragjoch (16. Sept.) | Obergurt x y, Untergurt y z, **K_XX gehalten**. Studie mit 13 Varianten: Mast B 568 → 190 N/mm². Option «zweite Flanschkante quer halten» nur quer — lotrecht zwängt sie den Gurt |
| Lagerung Abfangjoch (17. Sept.) | **K_XX gehalten** auch hier (140 → 96 N/mm²) |
| Längshalt (27. Aug.) | **nur ein Knoten** hält in Jochachse; jeder weitere ist ein Zwang |
| Drehfedern am Linkelement (9. Sept.) | **ganz raus, fest frei.** Die Einspannung kommt aus dem Kräftepaar der Anschlüsse |
| Gurtverbindung (27. Aug.) | Grenzlast **je Gurt**, F = M/(2h). Die **geometrische Feder gilt**, die Schraubengrenze ist ein eigener Nachweis; «Einspannung begrenzen» steht im Startwert AUS |
| Kennwerte (gemessen an PyNite/AxisVM) | `GURT_DAEMPFUNG` 0.45 · `ENDFELD_ZUSCHLAG` 0.50 · `SCHIEFE_DAEMPFUNG` 0.70 · `MAST_UNVERSCHIEBLICH` 4.00 (AxisVM ist das geprüfte Programm) |
| Überlagerung je Blechebene | Vorgabe bleibt die **Hüllkurve**; vorzeichenrichtig nur als Option |
| Örtlicher Anteil (17. Sept.) | **additiv**, abgemindert mit 0.45 (einseitig) bzw. 0.25 (durchgehend). Die vorzeichenrichtigen Formen wären stellenweise unsicher (Minimum 0.47) |
| Regliertemperaturen (3. Sept.) | Tragsicherheit **+5 °C**, Schnee leitend **−5 °C**, Havarie **−20 °C**. Unbelastete Zustände zählen nicht |
| Havariefall Tragjoch/Mast (17. Sept.) | halbe Ablenkung bei −20 °C, **10 %** des Leiterzugs längs. Abfangjoch: voller Leiterzug, eigener Fall |
| Wind (17. Sept.) | in **±x und ±y**, überall, auch für Masten und Anker; Überlagerung mit den ständigen Abfangkräften |
| Seilanker (16. Sept.) | trägt **nur Zug**; müsste er drücken, fällt er aus und der Mast trägt allein |
| Gesamturteil (17. Sept.) | **Maximum über alle geführten Bauteile, mit Namen** |
| Urteilsfarbe | folgt allein der Tragsicherheit; verletzte Konstruktionsprüfungen färben nicht, werden aber in Kachel **und** Fussleiste genannt (18. Sept., `urteilFusszeile`) |
| Nachweisbericht (18. Sept.) | **Druckbericht → PDF**, Hauptteil + Anhang, Umfang einstellbar (nur massgebend / mit Anhang / vollständig), vier Bilder einzeln abschaltbar; zuerst Tragjoch mit Masten. Der Bericht **rechnet nicht**: `export.nachweisbericht.js` schreibt die Zwischenwerte des Kerns in die Formeln, der Prüfstand (Abschnitt 82) rechnet jede Formel nach |
| Nachweisbericht, Umfang (18. Sept.) | **Tragjoch und Einzelmast**; das **Abfangjoch bleibt draussen** («den abfangjoch weglassen»). Bilder im **hellen** Design, auch wenn die Anwendung dunkel steht. Kapitel fortlaufend nummeriert |
| Einzelmast (18. Sept.) | Seitenleiste wie beim Tragjoch: Urteil auf der Bemessung über alle Kombinationen, Reiter Übersicht/Verläufe/Auflager. **Kein Ende B** im Mastnachweis; keine Joch-Nachweise unter «nicht geführt» |
| Charakteristische Einzelfälle | «Ständig (Tragwerk)» + «Ablenkkräfte ständig» = ganzes G: Masteigengewicht nur im ersten, Ablenkkraft nur im zweiten — auch an den Teilen am Masten |
| Joch entfernen (18. Sept.) | Kontextmenü «… entfernen, Masten als Einzelmasten behalten»: an jeder freien Maststelle ein Einzelmast mit **derselben Länge** (ausdrücklich eingetragen), Profil/Anker/Teile am Masten bleiben, die Teile des Jochs gehen mit (`jochZuEinzelmasten`) |
| Artwechsel auf Einzelmast | die **Anbauteile des Jochs werden gelöscht**, die am Masten bleiben; auch die Vorlage «Einzelmast» ohne Jochteil. Ein alter Stand mit Jochteilen: der Kern rechnet sie nicht und sagt es |
| Lagerangabe im 3D (18./19. Sept.) | **nicht mehr angeschrieben** («die bennenung hier gelenkig und k weglassen», 19. Sept.); die Marke bleibt in der Szene, gezeichnet wird sie nicht. Die Lagerung steht in der Maske |
| Teile am Masten (18. Sept.) | gehören dem Masten an seiner **Stelle**, nicht der Laufnummer `M…`; Mastliste und Teile werden nur gemeinsam geschrieben (`mastenFest`) |
| Wind nie diagonal (18. Sept.) | «da wind sich nicht in x und y überlagern kann»: **je eine Richtung**, ±y oder ±x. Tragjoch/Einzelmast: Ständig + Wind ±y, ±x statt LF7–LF10 (ersatzlos gestrichen hätte der Anker G und Wind nie zusammen gesehen). Abfangjoch («beim abfangjoch auch angleichen»): Fälle `wind+y`, `-y`, `+x`, `-x`; η des Trägers unverändert, F_x fällt aus den y-Fällen |
| Export-Knopf (19. Sept.) | «lege alle relevanten buttons in einen export»: **ein Knopf «Export» mit Aufklappmenü** ganz links im Band — AxisVM (COM-Brücke, SAF, DXF), PyNite, Nachweisbericht, Excel, Drucken (`exportMenue`). Die AxisVM-Formate öffnen den bisherigen Dialog, das Format vorgewählt |
| Kette am Aufbau (19. Sept.) | «wenn leiter koordinate x und z wert haben, dann extrudiert der arm auf den z wert»: nur ein **Träger** (Stütze, Aufsatz) wird bis zum nächsten Punkt verlängert; an einem **Aufbau** (Traverse, Ausleger) zuerst waagrecht, dann senkrecht. Starre Glieder — Kräfte an der Wurzel unverändert |
| Kette y vor x (19. Sept.) | «dass der y wert zuerst abgefahren wird falls eingegeben vor dem x»: liegt ein Punkt in x **und** y versetzt, fährt die Kette zuerst y, dann x ab — an Stütze, Aufbau und direkt am Joch |
| Raster weiten (19. Sept.) | immer vom **Normalmass** der Baugruppe aus (`rasterNorm`), frei sitzend gilt wieder das Normalmass. Von Hand gesetztes Raster ist das neue Normalmass |
| Namen nach dem Typ (19. Sept.) | «mach die bennenung entsprechend dem typ T A M MT»: **T** Tragjoch, **A** Abfangjoch, **M** Einzelmast, **MT** Mast mit Tragausleger, je Typ von links gezählt (`tragwerkPos`). Ein Einzelmast heisst wie sein Mast (eine M-Zählung für Einzel- und Jochmasten), der Mast des Tragauslegers MT… (`mastName`). P1… ist weg |
| Tragwerksliste (19. Sept.) | «A mit dem Band»: **ein Lageband** für alle Lagen (Joche in Bahnen, Masten mit Namen), darunter **Baum** — je Tragwerk eine Zeile, seine Masten eingerückt, geteilter Mast einmal beim ersten mit «auch …», Lage als Zahl rechts. Löst die Mastzeilen vom 13. Sept. ab (Typ, Länge, H, η bleiben je Mast); die x-Anschrift unter dem Mast (13. Sept.) steht jetzt in der Lagespalte, im Band steht der Name |
| Jochreihe gesamtheitlich (19. Sept.) | «die zusammenhängenden jochtragwerke sind als gesamtheitliches tragwerk zu betrachten». Gewählt: **gekoppelt** (ein Stabwerk: Joche und Masten der Reihe, Mastköpfe verschieblich, jeder Mast mit den Kräften aller anschliessenden Joche); ständig, Wind, Schnee **gleichzeitig** auf der ganzen Reihe; **Havarie örtlich**: «dieser kann entweder auf die joche wirken und die kraft teilt sich dann auf die beiden masten, oder wenn es zu einem leiterbruch am masten kommt ist dann nur dieser selbst betroffen»; Seitenleiste mit **Urteil der Reihe** (Maximum mit Namen). **Auch das Einzeljoch** läuft künftig über das Stabwerk («ja einzeljoch auch übers stabwerk»), ein Rechenweg. **Umgesetzt am 25. September** im Stabwerksweg (Etappe 3): der Knopf rechnet das ganze Blatt in einem Stabwerk, die geteilten Masten verschmolzen; gemessen am geteilten Masten einer Reihe 2 × J90/20 m η 0.7708 → **1.3465**. Der Ersatzbalken bleibt beim Einzelfeld mit der Sofortmassnahme |
| Geteilter Mast, Sofortmassnahme (19. Sept.) | «ja sofortmassnahme zuerst»: bis zum gekoppelten Modell trägt der geteilte Mast die **Jochkräfte aller anschliessenden Tragwerke** im selben Lastfall (`core.nachbarn.js`, `rechensatzMitNachbarn`, in `mastLasten` als `nachbarjoch`); Mastköpfe starr. Havarie örtlich: der Nachbar nur ständig. Nachbar-Abfangjoch über Leiteinwirkung und Windrichtung zugeordnet |
| `MAST_UNVERSCHIEBLICH` (19. Sept.) | **entfällt im gekoppelten Modell** («mast_unverschieblich entfällt»); bis dahin bleibt er im Einzelfeld-Kern |
| Havarie je Leiter (19. Sept.) | «nur ein leiter [kann] im havariefall rissen», «als einzelner leiter zählt auch das kettenwerk Fd + Ts», Übersicht mit Auswahl: unter **Lasten → Havarie** je Leiter «kann reissen» und der Zug bei −20 °C in **+y und −y** (leer: Reglagetabelle). Je angehaktem Leiter ein Fall ±y, nur er reisst, dazu «ohne Leiterbruch»; Hülle. Tragjoch/Mast 10 %, Abfangjoch voller Leiterzug (je Kandidat eine Auswertung). Kettenwerk = Module gleicher Bezeichnung. AxisVM: je Leiter `HavarieX|…` (Korrektur), `HavarieY|…|p/m`, Namen kurz «Havarie L1 …». Alte Merker «Bruch» werden beim Laden zur Auswahl (`havarieAnheben`) |
| Havariefall abschaltbar (20. Sept.) | «den havarielastfall deaktivierbar machen (nachweis / export)»: Schalter **«Havariefall rechnen (Nachweis und Export)»** unter *Lasten → Havarie* (`havarieAus`, Vorgabe **ein**). Aus: keine aussergewöhnlichen Lastfälle (`havarieVorhanden` false) — kein Havarienachweis, keine Havariezeile in der Hülle und im Bericht; die AxisVM-Ausleitung führt weder die Gruppen `HavarieX/Y` noch die Fälle je Leiter, noch deren Lasten und Kombinationen; das Abfangjoch rechnet nur Wind und Schnee leitend (`ohneHavarie`, keine Läufe je Kandidat). Ein Hinweis nennt die Abschaltung, damit sie im Nachweis nicht untergeht |
| Abfangjoch im Blattmodell (20. Sept.) | «checke die abfangjoch ausleitung auf denselben fehler» → Befund: auf einem Blatt mit mehreren Tragwerken wurde ein Abfangjoch als **Tragjoch** gebaut (vier Winkel L 90×90×9 statt zweier liegender Walzprofile mit Gabel und Kröpfung). Entscheid: **richtig einbauen**. Es baut jetzt sein eigenes Modell (`abfangBau`), örtlich 0…jt, das Blatt verschiebt; Masten unter dem Blattnamen (`MAST_<Stelle>_S<n>`, damit ein geteilter Mast verschmilzt). Lastgruppen: **Leiterzug → G_Ablenk** (ständig und waagrecht wie die Ablenkkräfte), **WindJoch → WindY** («nur ±y, wie die eigene Ausleitung»), SchneeJoch → Schnee, G/G_Anbau/WindX/WindY unverändert. Havarie («gleich mit einbauen»): im Blatt bleibt der Nachbar ständig (örtliche Havarie, 19. Sept.); die **eigene** Abfangjoch-Ausleitung legt je Leiter einen Fall an — geschrieben wird die **Änderung** gegenüber dem ständigen Leiterzug (gerissener −Z(+5 °C), übrige Z(−20 °C) − Z(+5 °C)), die Kombination greift beides mit γ = 1.0 ohne veränderliche Lasten. Sie steht auch dann da, wenn die Änderung null ist (fehlende Reglagetabelle, pauschale Abfangkraft) — die Beiwerte unterscheiden sie von der Tragsicherheit |
| Abfangjoch: Masten und Länge (20. Sept.) | «die masten werden nach innen gesetzt wenn primär ein jochtyp und länge ausgewählt wurde. wenn aber die masten schon vorhanden sind sollte sich der jochtyp daran richten und wenn notwendig den nächst längeren joch auswählen.» Das Sortiment führt je Länge einen **Bereich zulässiger Stützweiten** (Überstand 0.25–0.495 m je Seite). Vorgabe ist die **grösste** Stützweite, also 25 cm Überstand je Seite (`abfangUeberstand`). Die **Lage eines Abfangjochs ist sein erster Mast** (`lageOrtsnull` = Lage − Überstand), der Träger kragt darüber hinaus — sonst könnte es nie einen Masten mit dem Nachbarjoch teilen. Mastabstand = js = jt − 2·ü. Passt der Abstand vorhandener Masten nicht in den Bereich, nennt ein Hinweis das passende Joch (`abfangFuerStuetzweite`, kürzeste Länge des Typs, sonst nächster Typ); geändert wird nichts von selbst («Warnen, Berichtigung auf Klick») |
| Lastenkarte je Tragwerksart (20. Sept.) | «hier ist die windlast in y nicht aufgeführt beim einzelmasten. auch die angabe in der sidebar passt nicht ganz» und «man sollte die tragjoche und masten gleichwertig behandeln und nur die felder auflisten die auch im modell vorkommen». Der Reiter *Lasten* zeigt nur noch, **was bei dieser Art auch wirkt** — gemessen, nicht hergeleitet (Prüfstand 109 rechnet jedes ausgeblendete Feld gegen). Am Einzelmasten fallen die Laufmeterlasten des Jochs weg (g_k, w_k, s_k, Δg_k, Schneeklasse: der Kern rechnet dort L = 0) und der Schalter «Mastwind wirkt auf das Joch» (es gibt kein Jochende; am Abfangjoch ebenso, dort rechnet ein eigener Kern). Die **Windbelastung bleibt**: sie wählt die Zeile der Mastwindtabelle und die Windkräfte der Anbauteile. Der **Mastwind steht in beiden Richtungen** (w_Mast,x Jochachse, w_Mast,y Gleisrichtung) und ist **gesperrt**: er folgt immer der Tabelle (`mastWindBeide` in data.masten.js ist die eine Stelle, aus der Kern und Maske ihn holen) |
| Gelenkige Anschluesse in PyNite (24. Sept.) | «die links als stabendfreigaben in pynite nachrüsten». Die Linkelemente gehen als `def_releases` hinaus, **am Ende beim Gurt (j)** — dort landet kein Restmoment im nachgewiesenen Bauteil, sondern im starren Anschlussstiel. **Nur an einem Ende:** eine Feder hält ihre sechs Komponenten unabhängig, ein Balken nicht (V = dM/dx) — an beiden Enden freigegeben fiele mit dem Moment auch die **Querkraft** aus, und der Anschluss trüge gar nichts mehr. Die freien **Verschiebungen** (z am Obergurt, x am Untergurt) werden dadurch exakt; die freien **Verdrehungen** bei starrer Querkraft bleiben eine Näherung mit dem Restmoment M = V·L. Gemessen an PyNites Stabkräften: am freigegebenen Ende steht **0.00000 kNm** in jedem Lastfall, am anderen ist M/(V·L) = **1.000**, grösstes Restmoment **0.0253 kNm** gegen Fussmomente von 24 kNm — der Fehler ist die Linklänge, und die ist 0.05 m. Danach stimmen beide Löser am J90/8 m auf **0.005–0.25 %** in den Auflagerkräften (vorher bis 53 %), am J90/20 m auf 0.0007–0.4 %. Die **Kalibrierung ist nicht berührt**: ihr Modell rechnet ohne Masten und führt daher **null** Linkelemente — gemessen, die Blechmomente sind bitweise dieselben |
| Verformung im Plot und als Diagramm (24. Sept.) | «nimm die verformung in die resultat plot und mache entsprechende diagramme.» Neue Plotgrösse **w** (mm), nur an den Masten — das Joch bleibt grau, wie bei der Querkraft die Gurte. Aufgetragen ist die **Resultierende** aus beiden Richtungen im gezeigten Lastfall; welche Richtung es war, sagt das Diagramm. Neu je Mast ein Diagramm **«Verformung über die Höhe»** mit w_x und w_y in Millimetern und der Grenzlinie L/200. Es steht unter der Ausnutzung — erst was trägt, dann wie weit es sich bewegt |
| Gebrauchstauglichkeit: Plot und Wahl (24. Sept.) | «setze noch ein resultat plott gebrauchstauglichkeit … Tragsicherheit Gebrauchstagulichkeit oder beide.» Auf Rückfrage: (1) Der Plot **«η w»** trägt das η **aus dem Nachweis, je Mast** — eine Farbe über die ganze Höhe, feste Skala 1.25 wie η. Ein Verlauf w(z) gegen L/200 wäre erfunden: die Grenzwerte gelten an **zwei** Stellen, dazwischen ist keiner definiert. Er folgt **nicht** dem Lastfallwähler (Betriebswind ψ 0.70). (2) Die Wahl **Tragsicherheit / Gebrauchstauglichkeit / beide** (Vorgabe **beide**) steht in der **Ergebnisleiste** und zieht die **Plotliste** mit (`modiFuer`, `modusKorrigieren`) — eine Stelle, kein zweiter Wähler. Weg fällt, was ein η der Tragsicherheit zeigt; Schnittgrössen und Hinweise bleiben. Die **Hauptkachel bleibt** — ein Anzeigefilter ändert kein Urteil. Ein Plot ohne `nachweisart` gilt der Tragsicherheit (vergessene Angabe führt zur harmloseren Zuordnung). Das Umschalten **rechnet nicht neu** |
| Abfangarten auch am Abfangjoch (24. Sept.) | «abfangjoch abfangarten nachziehen». Der Abfangjoch-Kern rechnete auf seinem eigenen Weg und behandelte damit jeden Leiter als «einseitig». Er liest die Wahl jetzt je Leiter (`abfangLeiterart`, `o.havarie` aus `core.nachbarn.js`) und wendet dieselbe Regel an wie das Tragjoch — sie steht weiter an einer Stelle (`ABFANGARTEN`, `HAVARIE_LAENGSZUG` in core.lasten.js) und ist hier nur angewendet. **Die Richtung kommt am Abfangjoch aus der Anbindung** (vorn/hinten), nicht aus dem «±y» der Havarie-Karte: sie steht dort längst, ist im Bild sichtbar, und dieselbe Angabe zweimal zu führen hiesse, auf den Tag zu warten, an dem sie sich widersprechen. **Die Vorgabe ist hier «einseitig», nicht «durchgehend»** (`abfangVorgabeFuer` in core.lasten.js): ein Abfangjoch heisst so, weil der Leiter dort endet — und ohne diese Ausnahme hätte jedes gespeicherte Abfangjoch von einem Tag auf den anderen **ohne ständigen Leiterzug** gerechnet, eine Entlastung um die grösste Last des Bauwerks, sichtbar nur an einem kleineren η. Gemessen am A240/12.5 m mit zwei Fahrleitungen (Z(+5) = 14.9, Z(−20) = 16.5 kN), Summe beider Auflagerkräfte: **einseitig** ständig 29.8 / Riss 16.5 (η 0.740, wie bisher); **beidseitig** 0 / 16.5 (η 0.365); **durchgehend** 0 / 1.65 (η 0.114) |
| Bericht: Gebrauchstauglichkeit und Fundament (24. Sept.) | «checke die berichte auf vollständigkeit und richtigkeit der verschiedenen tragwersarten. nimm noch die auswertung der verformung (Gebrauchstauglichkeit) mit.» Die Durchsicht fand **vier Befunde**: (1) die **Verformung fehlte ganz** — neues Kapitel «Gebrauchstauglichkeit — Mastverformung», ein eigenes und kein Abschnitt unter den Nachweisen (anderes Lastniveau, anderes Mass, färbt kein Urteil); (2) das **Fundament fehlte** — neuer Abschnitt im Nachweiskapitel neben dem Anker; (3) «**Kräfte am Mastfuss**» kündigte die Bemessungswerte als «Übergabe an den Fundamentnachweis» an — der rechnet aber charakteristisch, die Zahlen liegen um 1.3 auseinander (dieselbe Falle wie am 11. Sept. beim Anker); (4) das **Lastfallkapitel** nannte nur die Tragsicherheit als Nachweisgrundlage, obwohl Anker und Fundament auf den charakteristischen und die Verformung auf dem Betriebswind stehen. Alle vier berichtigt. **Zwei Arten haben weiter keinen Bericht:** das Abfangjoch (Entscheid 18. Sept., «den abfangjoch weglassen») und der Tragausleger (wartet auf das Kragarm-Modell) |
| Vier neue Diagramme im Bericht (24. Sept.) | «kann man noch zusätzliche diagramme ergänzen, die aber auch gegengeprüft werden müssen auf richtigkeit (vektor richtung etc.).» Neuer Baustein **`balkenDiagramm`** (`render.charts.js`): eine Aufzählung ist keine Strecke, als Linie gezeichnet behäuptete sie eine Steigung zwischen zwei Balken. **Die Achse läuft durch die Null**, auch wenn alle Werte positiv sind — das ist der Kern der Auflage. Darauf: **Ausnutzung je Bauteil** (die gesamtheitliche Betrachtung als Bild, Marke bei η = 1.00), **Fundament je Nachweis** (acht unabhängige Nachweise nebeneinander), **Mastfusskräfte je Lastfall** (M_quer, **mit Vorzeichen**). Dazu das vorhandene Verformungsdiagramm ins neue GZG-Kapitel. Alle vier einzeln abschaltbar wie die vier davor (jetzt acht Bilder). `render.charts.js` importiert weiter nichts — die **Ampelfarbe kommt als Funktion herein**, sonst stünden die Schwellen 0.90/1.00 ein zweites Mal da. Gegengeprüft (Prüfstand 117): Zahl, Name und Reihenfolge je Balken gegen den Kern, das echte Minuszeichen, das Längenverhältnis, die Grenzmarke im Bild — und die **Richtung**: Wind +x gibt +10.84 kNm, Wind −x gibt −10.84, und die beiden Balken liegen auf verschiedenen Seiten der Nulllinie |
| Mastfundament im Nachweis (24. Sept.) | «die Fundamentzuordnug zu den einzelnen Masttypen … die Fundamente auch noch separat als ausnutzungsbeiwert in die nachweisführung aufnehmen (gesamtheitliche Tragwerksbetrachtung). diesen nachweis auch unter optionen ausschaltbar machen.» Quelle: `Grundlagen/Einwirkungen`, zulässige Standardlasten, **Block bis 14° Geländeneigung** («die Geländeneigung nicht berücksichtigen» — der zweite Block mit den kleineren Werten Richtung fallender Böschung bleibt drausssen; an einer Böschung rechnet das Werkzeug damit auf der unsicheren Seite, der Kachel-Titel sagt es). Acht Zeilen als zweite Tabelle **im Sortiment der Masten** (`data/masten.json`, Tabelle `fundamente`) — sie ist eine Zuordnung zum Masttyp, und so gehen sie ohne Zutun durch Datenpaket, Excel und Abgleich. **Die Zuordnung Masttyp → Profil ist gemessen:** die Windlasten je Einwirkungsklasse in `fl_bauteile.json` (mast-dp20 … mast-dpm24-p) stimmen ziffernweise mit denen der Profile — DP20 = HEB 200, DP22 = HEB 220, DP24 = HEB 240, DP26 = HEB 260, DPM24 = HEM 240. Beim **HEM 240 entscheidet die Stegrichtung mit** (einziges nicht quadratisches Mastprofil): starke Achse quer → HP1a/2.4 (M_q 230), gedreht → HP2a/2.4 (M_q 154); vertauscht wäre der Nachweis um ein Drittel zu schwach. Nachgewiesen wird in `core.fundament.js` über die **charakteristischen und aussergewöhnlichen** Lastfälle (wie beim Anker, alle Beiwerte 1 — Tragsicherheits-Kombinationen bleiben drausssen), **acht Einzelnachweise** am Mastfuss: V, M_q, M_l, H_q, H_l, T sowie **M_q und H_q für den veränderlichen Anteil allein** (eigene, schärfere Spalten der Quelle — am Standardjoch η 0.16 gegen 0.09). **Quer und längs werden nicht überlagert**, so die Quelle ausdrücklich; das Urteil ist das Maximum, keine Interaktionsformel. Der Typ folgt Profil und Stegrichtung, lässt sich in der Mastkachel aber wählen (`MASTFELDER`, gehört dem Masten — ein geteilter Mast hat ein Fundament). Abschaltbar als **Nachweisgruppe `fundament`** (Optionen → Nachweise, Vorgabe **an**) statt als eigener Schalter: dort stehen die abschaltbaren Nachweise schon, und ein nicht geführter zählt von selbst nie als erfüllt |
| Höhe der Fahrdrahtverschiebung (24. Sept.) | «es sollte einen schieber geben welche höhe für die farhdrahtverschiebung massgebend ist.» Neues Feld **`fdHoehe`** (Gruppe *Masten*, Schieber, über dem Mastfuss gemessen). Die Automatik von `messStelle` (höchstes Drahtwerk → höchster Ausleger → Jochauflager) trifft den Regelfall, misst aber am **Anschlusspunkt** eines Teils — der Fahrdraht hängt darunter, und wie weit, weiss die Zeichnung. **0 = automatisch**, damit jeder gespeicherte Stand unverändert weiterrechnet; **über dem Mastkopf gilt die Eingabe nicht** (dort steht keine gerechnete Verschiebung, sie fällt auf die Automatik zurück). Der Nachweistext nennt seither die Höhe («Fahrdraht auf 5.50 m quer zum Gleis») — sonst stünde dieselbe Zeile da, gleichgültig ob 6.20 oder 8.00 m gemeint war. Gemessen am Einzelmast: Automatik 8.00 m → 8 mm, eingetragene 5.50 m → 5 mm, Grenzwert unverändert 40 mm |
| Gemeinsame Kopfzahl bei «beide» (24. Sept.) | «wenn hier beide ausgewählt sind dann müsste es einen globalen ausnutzungfaktor haben der den gebrauchstauglichkeit auch berücksichtigt.» Die Hauptkachel trägt in dieser Stellung das **Maximum über beide Nachweisarten**, mit dem massgebenden Bauteil daneben («Verformung M2»). **Die Farbe folgt ihm** — auf Rückfrage ausdrücklich so entschieden und damit eine Änderung des Entscheids vom 18. September («die Urteilsfarbe folgt allein der Tragsicherheit»); eine Kachel, die η 1.97 zeigt und grün dasteht, ist ein Widerspruch. **Die Aussage wird nicht vermischt:** der Text nennt beide Urteile getrennt («Tragsicherheit erfüllt · Gebrauchstauglichkeit NICHT erfüllt»), denn die Zahlen stehen auf verschiedenen Lastniveaus. In den beiden anderen Stellungen zeigt die Kachel genau das, was darunter steht. **Einzellastfall** und **«nicht geführt»** bleiben unberührt — dort wird nicht geurteilt (`urteilMitGebrauch` in ui.js) |
| Werte im Plot: einmal je Bauteil (24. Sept.) | «Die werteplotts sind nicht gut lesbar», mit dem Bild eines Masten: achtmal «1.97» untereinander. Grössen, die dem **Bauteil** gehören statt der Station, tragen an jedem Abschnitt denselben Wert; die Ausdünnung kannte nur Abstände im Bild, nicht die Frage, ob zwei Zahlen etwas Verschiedenes sagen. `entdoppelteWerte` lässt je Bauteil und gerundetem Wert **eine** Zahl stehen, und zwar die mittlere der Gruppe. Dazu getrennte Deckkraft: das Kästchen bleibt blass (0.62, die Fläche schimmert durch), die **Ziffer** steht mit 0.95 da — eine rote Ziffer mit 0.62 auf rotem Bauteil war nicht zu entziffern. Die Weisung vom 20. Sept. («transparenter») galt der verdeckten Fläche, nicht der Zahl |
| Mastverformung im Gebrauchszustand (24. Sept.) | «Mastfervormung berechnen lassen infolge wind / ständige und deren kombination. die massgebende werte sind Mastspitze 1:100 (wind+ständige) / 1:200 (nur Wind) und auf höhe Fahrdraht oder vereinfacht auf höhe Ausleger / Jochauflager -> hier ist der Grenzwert 40mm. Die Gebrauchstauglichkeit kombination ist in diesem fall der Wind bei 0.70 (Betriebswind Wiederkehrperioda 5 Jahre).» Auf Rückfrage: die **40 mm quer zum Gleis** (Seitenlage des Fahrdrahts), die Spitze in **beiden** Richtungen; die 40 mm gegen den Fall **nur Wind**. Gerechnet in `core.verformung.js` über `mastVerschiebungen` (core.mast.js) — dieselbe Lastliste wie die Schnittgrössen, also **mit** der Haltekraft des Ankers und mit dem Entscheid, ob ein Seil in dieser Kombination trägt. Quer biegt der Mast über `I`, längs über `Iq`. Neu vier Lastfälle **Betriebswind** (`gtbetriebW…`, G mit 1.00, Wind mit ψ = 0.70, `BETRIEBSWIND` in core.lasten.js); «nur Wind» braucht keinen eigenen — die charakteristischen Windfälle mal 0.70 sind exakt derselbe Zustand. Die Messstelle: Fahrdraht, sonst Ausleger, sonst Jochauflager (`messStelle`). Gegengerechnet am nackten Kragarm: w = qL⁴/8EI auf 1e-12. Die Kachel steht **ohne Ampel** — die Urteilsfarbe folgt allein der Tragsicherheit (18. Sept.) **Geändert am 26. September:** «lassen wir den nachweis für die mastspitze weg bei der verformung und nutzen nur die referenzhöhe (fahrdraht)» — der NACHWEIS ist nur noch der an der Referenzhöhe (40 mm quer). Die Spitzenverschiebung bleibt als **Auskunft** im Kacheltitel, ohne Grenzwert und ohne η. Ohne Referenzhöhe gibt es keinen Nachweis mehr, und die Anzeige sagt es |
| Havariefall im Ankernachweis (24. Sept.) | Frage: «wie wirken sich die abfangungen und der havariefall auf die zuganker und Druckstüzen aus?» Gemessen am Einzelmast HEB 240/10 m, NT-Ausleger 8 m, R-FL, Anker a = 4.5 / h = 7.8: der **ständige** Zug einer Abfangung kommt voll am Anker an (einseitig ±49.5 kN gegen −3.8 kN bei durchgehend), und die **Zugrichtung** entscheidet Druck oder Zug — zieht der Leiter zur Ankerseite, hängt ein Seilanker durch (der Mast trägt allein, Entscheid 16. Sept.), eine Druckstütze nimmt 49.5 kN mit Knicken auf (η 0.83 gegen 0.37 bei Zug). Der **Havariefall** dagegen erreichte den Nachweis nicht: `ankerAuswertung` nahm nur die charakteristischen Fälle, die Havariefälle sind «aussergewöhnlich». Am **Abfangjoch** war er immer dabei (er ist einer der drei Fälle dort) — dieselbe Abspannung wurde je nach Tragwerksart verschieden nachgewiesen. Bei **beidseitiger** Abfangung entsteht die grosse Ankerkraft überhaupt erst beim Riss: nachgewiesen wurde mit −3.82 kN (η 0.064), angefallen sind ±45.72 kN — Faktor 12 auf der unsicheren Seite. Entscheid auf Rückfrage: **ja, gegen dieselbe zulässige Kraft** (`ANKER_FALLARTEN` in core.anker.js). Der Anker wird gegen zulässige Kräfte nachgewiesen, und der Havariefall trägt alle Beiwerte 1 — er steht auf demselben Niveau. Die Tragsicherheits-Fälle bleiben draussen (Teilsicherheitsbeiwerte). Danach: beidseitig η 0.763, durchgehend 0.076, einseitig unverändert (der Riss entlastet dort) |
| Leiter: durchgehend / beidseitig / einseitig abgefangen (24. Sept.) | «Die leiter könen als durchgehend / beidseiig abgefangen / einseitig abgefangen definiert werden. bei den durchgehenden wid ein 10% anteil beim Leiterriss gerechnet. bei den beidseitig abgefangenen wid der volle leiterzug einseitig angesezt und beim einseitg abgefangenen, hebt sich der leiterzug auf, dies kann bei mehreren abfangungen an einem abfangträger zu ungünstigen lastfällen dann führen, die massgebend sein können.» Rückgefragt und bestätigt: der Leiterzug wirkt **auch ständig**, und die Wahl gilt **allen vier Tragwerksarten** — bis dahin entschied die Tragwerksart (Abfangjoch voller Zug, Tragjoch/Mast 10 %), jetzt der Leiter. Angesetzt wird (`ABFANGARTEN` in core.lasten.js, gemessen am N-FL mit Z(+5 °C) = 14.9 und Z(−20 °C) = 16.5 kN): **durchgehend** ständig 0, Riss 1.65 kN; **beidseitig** ständig 0 (die Züge heben sich am Anschluss auf), Riss 16.5 kN einseitig; **einseitig** ständig 14.9 kN in seine Richtung, Riss −14.9 (er fällt weg), ohne Riss +1.6 (Z steigt auf −20 °C). Die **Richtung** (+y/−y) gehört dazu — ohne sie kann sich nichts aufheben. Gemessen am J90/20 m mit zwei entgegengesetzten Abfangungen: ständig und bei Wind Σ F_y = 0, beim Riss bleiben 16.5 kN, und der Havariefall wird massgebend (η 1.61 gegen 1.80 bei Wind). Dabei musste das **Vorzeichen des Längszugs aus dem Beiwert in die Kräfte** wandern (`havarieEinsetzen`, `havarieFest`): ein Beiwert −1 gilt allen Leitern des Falls gemeinsam und machte aus dem Wegfall eine zweite Zugkraft (η 18.3 statt 12.1). Die Havarie-Karte zeigt je Leiter Abfangung, Richtung und die **Kräfte als Zahl** — die Frage «wo sieht man den lastanteil?» soll die Karte selbst beantworten. Seit dem 24. September liest das **Abfangjoch** sie ebenfalls (siehe die eigene Zeile darunter) |
| Anbauteile tragen keine Ausnutzung (24. Sept.) | «rohr / Mastaufsatz selbst ist als anbauteil zu verstehen, keine Ausnutzung bestimmen von diesen bauteilen.» Ein Anbauteil ist **nicht Gegenstand des Nachweises**, sondern der Weg, auf dem die Last ans Tragwerk kommt — das gilt auch für das Rohr, das einen Masten verlängert. Der Rechenweg entsprach dem schon: `bauteilUrteil` führt Joch/Abfangjoch, Mast und Anker, kein Anbauteil (gemessen am Einzelmast mit Rohr über der Spitze: im Urteil steht allein «Mast M1», η 0.228). Geändert hat sich der **Hinweis**: er sagte «das Rohr selbst ist nicht nachgewiesen» und las sich damit wie ein Mangel, der noch zu beheben wäre. Er nennt jetzt die Regel. Was er weiter sagt, ist die Stelle: ein Lastpunkt über der Mastspitze hat einen Hebelarm, den man beim Lesen des Modells kennen soll. Eine Wache im Prüfstand schlägt an, sobald ein Anbauteil ins Urteil käme |
| Lasten über der Mastspitze (20./24. Sept.) | «lasten oberhalb mastspitze zulassen.» Präzisiert am 24. September: «der anschlusspunkt liegt innerhalb der mastlänge, aber es sollte dann möglich sein die z koordinate des anbauteils oberhalb der mastspitze anzusetzen (Mastverlängerung mit Rohr)». Also: der **Anschluss bleibt am Masten** — der Höhenregler endet wieder an der Mastspitze (`mastReglerHoehe` = `mastKopfHoehe`; meine erste Lesart liess ihn zwei Meter darüber hinaus laufen und stellte damit den Anschluss in die Luft). Was hinausragt, ist die **z-Koordinate des Moduls**; die Kette baut dafür ein starres Glied auf der Mastachse — das Rohr. Gemessen am Einzelmast 8.50 m, Anschluss 8.00 m, Modul z = +1.85: der Lastpunkt steht bei 9.85 m, seine Lasten stehen dort, der Mast endet an seiner Spitze, und nichts fällt aus dem Modell. Der **Hinweis misst seither den Lastpunkt** (hMast + z), nicht mehr den Anschluss — sonst bliebe er genau im gemeinten Fall stumm. Für einen **nachträglich gekürzten** Masten (Anschluss dann über der Spitze) trägt weiterhin ein `MASTAUFSATZ_<Ende>_<n>`, damit Nachweis und Ausleitung nicht auseinanderlaufen. **Unter** der Fundamentkote bleibt es beim Vermerk. Das Rohr selbst ist **nicht nachgewiesen**; der Hinweis sagt es |
| Kette: Reihenfolge der Eingabe (20./24. Sept.) | «bei den koordinaten der anbauteile, zuerst die z komponente afahren» (20. Sept.), präzisiert am 24.: «die reihenfolge beachten, jenachdem welcher wert zuerst eingegeben wird, wird dieser auch abgefahren. dies sollte dann global in der app gelten.» Die Kette fährt die drei Achsen **in der Reihenfolge ab, in der sie eingetippt wurden**. Die Folge kann sie nicht aus den Zahlen ablesen, also hält das Modul sie als Zeichenkette fest (`folge`, z. B. «xz»); `achsfolge` in core.anbauteile.js ist die eine Stelle, die die Regel kennt: beim **ersten** Setzen wird die Achse angehängt, Nachjustieren legt den Weg nicht um, auf null gestellt fällt sie heraus. Was nicht darin steht — alter Stand, nie gesetztes Feld — folgt in der Vorgabe **z, y, x** (das ist die Regel vom 20. September, jetzt als Rückfall). Gemessen an einem Leiter (1.2 m aussen, 0.45 m höher): zuerst x getippt → (1.2, 0, 0) → (1.2, 0, 0.45); dieselben Zahlen ohne Folge → (0, 0, 0.45) → (1.2, 0, 0.45). **Global** gilt es ohne zweite Stelle: Bild, Ausleitung und Rechenkern holen ihre Kette alle aus `anbauKette`. **Was bleibt:** gestreckt wird nur ein *Träger* (der Jochaufsatz wird nicht länger, Befund vom 19. September), und kein Glied läuft schräg in x und y zugleich |
| Auslegerwind auf den Masten (20. Sept.) | «bei den auslegern den windanteil auf den masten wirken lassen (ähnlich wie bei der hängestütze), da die leiter als quasi auflager wirken.» `windAufTraeger` setzte den halben Auslegerwind bisher nur auf die Achse einer **Hängestütze** ab und kehrte ohne sie um — genau die Ausleger **am Masten** haben keine, der Schalter stand da und tat nichts. Ohne Träger ist der Bezug jetzt die Achse des Tragwerks: am Masten die **Mastachse** (y = 0, Station der Baugruppe). Die beiden Vorlagen «NT-Ausleger am Mast» und «Rohrausleger am Mast» tragen `windAufTraeger` / 50 % wie die Hängestützen-Vorlagen (Sicherung `data/sicherung/anbauteile_vor_mastwind_2026-09-20.json`). Gemessen: NT 0.55 → 0.275 kN, und der Angriffspunkt rückt von 1.25 m aussen auf die Mastachse; Rohr 0.30 → 0.15 kN. Dabei fiel ein älterer Fehler auf: ein Teil, dessen Punkt **auf der Kettenwurzel** liegt, erbte den Anschlusskörper und damit dessen 0.1 m Versatz unter dem Gurt (−0.3246 statt −0.2246) — es bekommt jetzt seinen eigenen Knoten |
| Darstellung im Modell (20. Sept.) | Fünf Weisungen auf einmal: «diese darstellung auch für die restlichen tragwerksarten verwenden. die werte beim plot in der farbe der skala machen und die werte transparenter gestalten. die dichte der werte etwas zurücknehmen. beim 3d fenster die schattierung beim unteren rand wegnehmen. die skala farben verschieben, ab einer ausnutzung von 1 sollte es schon rot sein und nicht orange.» (1) **Die Gleis-Draufsicht der Stegrichtung gilt für alle vier Tragwerksarten** — das Gleis hat jede, ein Tragjoch nur das Tragjoch. Die Joch-Draufsicht vom 17. September ist damit abgelöst (ihr Massstabsentscheid wird gegenstandslos, nicht widerrufen; die Gabel zeigt weiterhin das 3D-Modell). Dabei fiel auf: sie zeichnete **vier Schwellen, von denen zwei ganz ausserhalb des Rahmens lagen** — gezeichnet wird jetzt, was hineinpasst. (2) Die **Zahlen am Plot tragen die Farbe ihres Werts** (dieselbe Rampe wie die Fläche, `etaFarbe`) und stehen mit 62 % Deckkraft da — Saum und Schrift zusammen, denn verdeckt wird das Bauteil vom Saum. (3) **Dichte zurückgenommen:** 34 statt 60 Zahlen, Raster 54 × 19 statt 42 × 13 px; am schlanken Einzelmasten reihten sie sich dicht übereinander und verdeckten, was sie beschriften. (4) Die **Schattierung am unteren Rand** des 3D-Fensters ist weg (`.viewer-fuss`) — sie legte sich über das untere Fünftel der Szene und verdunkelte dort die Bauteilfarben. (5) Die **Ausnutzungsskala ist ab η = 1.00 rot**: die Stützstellen sassen auf Bruchteilen der 1.25 statt auf den Werten, die etwas bedeuten, und η = 1.00 traf das Orange — ein überschrittener Nachweis sah aus wie ein knapper. Sie stehen jetzt dort, wo `ampel()` ihre Grenzen zieht (0.90 orange = warn, 1.00 rot = fail, 1.25 dunkelrot), und der Legendenbalken trägt dieselben |
| Daten: ein Fenster (20. Sept.) | «das einlesen der daten ist etwas komplizier, können wir dies vereinfachen.» Es gab zwei Türen mit ähnlichen Namen: das **Datenpaket** (Optionen → Datenbasis, ersetzt die ganze Basis) und das **Einlesen** je Sortiment (Fenster Bauteildaten, mit Abgleich). Gewählt: **ein Fenster für alles.** Ansehen, einlesen, laden und sichern stehen im Fenster *Bauteildaten*; der Knopf «Datenpaket laden …» nimmt **jede** Datei und erkennt selbst, was es ist (`dateiAnnehmen`). Der Reiter *Datenbasis* sagt nur noch, was hinterlegt ist, und führt dorthin. Der **Abgleichbericht** ist kurz: oben eine Zeile je geändertem Sortiment, die Tabellen klappen auf; Sortimente ohne Änderung stehen nur als Namen darunter. Fehler und «geprüfte Sätze ändern sich» bleiben offen — die soll niemand aufklappen müssen. **Weiter gebündelt** («kannst du die buttons weiter bündeln unter bauteildaten»): nur noch **«Daten laden …»** und **«Daten sichern ▾»**. Laden nimmt jede Datei — `leseDatei` liest Excel-Mappe, einzelne `data/…json` **und** ein ganzes Datenpaket, immer über den Abgleich. Sichern ist ein Aufklappmenü: *Datenpaket (.json)* zum Mitnehmen, *Alle Tabellen (Excel)* zum Bearbeiten. Über den Knöpfen steht in zwei Zeilen, wann man was nimmt — die Frage «wann muss man einlesen und datenpaket drücken» soll die Anwendung selbst beantworten. Die Datenbasis **rundweg zu ersetzen** bleibt der seltene Weg: beim Start ohne Daten und durch Hineinziehen der Datei |
| Vorlagen nach Ort (19. Sept.) | «die anbauteile template auf die tragwerksarten anpassen», «nach ort trennen»: Spalte `ort` (joch / mast / beide; leer: mit Träger Joch, sonst beide). **Am Masten:** Rückleiter direkt, Lampe LED/alt mit Rohr (Rohr vorläufig = Hängerohr, Baustein «Lampenrohr»), Fahrdrahtabzug mit Konsole 1 m (Fd ohne Gewicht), NT- und Rohrausleger (1.25 / 2.50 m wie am Joch), Traverse mit Zusatzleiter. Kachelliste am Einzelmast nur Mast-Vorlagen, am Joch alle (Gruppe «Am Masten») |
| Teile am Masten: Weg und Skizze (19. Sept.) | Weg: auf der **Anschlusshöhe waagrecht** (y, dann x), dann lotrecht auf z (`anbauKette`, `amMast`) — nicht den Masten entlang (Starrstab auf der Mastachse). **Seit dem 20./24. September anders** (siehe «Kette: Reihenfolge der Eingabe»): abgefahren wird in der Reihenfolge der Eingabe, ohne Angabe z, y, x — auch am Masten. Skizze: «mach eine ansicht in xz und eine draufsicht in xy»; x an beiden Enden global |
| Lastgenerator (18. Sept.) | nur bei Tragwerken mit Träger; am Einzelmast ausgeblendet |
| Testdaten (19. Sept., A3) | `testdaten/` ist **frei erfunden** und öffentlich (Typ «TEST-80», runde Werkstattgrössen, keine Zahl aus den Unterlagen); sie tragen nur den Rauchtest, nie eine Bemessung |
| Kommentare (19. Sept., A4) | **nicht kürzen** — die Weisungszitate und das Warum bleiben im Code |
| Erklärtexte (19. Sept., U4) | abschaltbar in Optionen → Darstellung → Bedienung, **Vorgabe ein**; gerechnete Notizen bleiben immer |
| Tragausleger (18. Sept.) | bis zum Kragarm-Modell **Warnung statt Sperre**: «Tragausleger NICHT nachgewiesen», gelb, kein Urteil, Bericht nimmt ihn nicht. **Seit dem 28. September gilt das nur noch ohne gültiges Stabwerk** (Rechenverfahren «Ersatzbalken» oder noch nicht gerechnet); mit dem Stabwerk ist er nachgewiesen (Etappe 4) |
| Fundamentkote | **keine Last darunter**: die Eingabe hebt ein Teil auf die kleinste zulässige Höhe (`haengeTiefe`) und meldet es; ein alter Stand darunter steht als Hinweis |
| Mast am Joch (18. Sept.) | Vorgabe: Mastachse **genau am Jochende**. Am Jochende stehen nur **stehende** Bleche (Seitenebenen, Gabel). P9 prüft nur die **liegenden** Bleche; P10 prüft die lichte Weite zwischen den Gurten (Grundriss verjüngt bei J60–J90 von 340 auf 260 mm) |
| Stabilität am Masten (18. Sept.) | jede Masse auf ihrer **eigenen Höhe**, Jochlast auf H, Eigengewicht verteilt |
| NT- und Rohrausleger (26. Aug.) | **Kragarm**, Versatz in Jochachse (NT 1.20/2.40 m, Rohr 1.5/3.0 m), 50 % Wind auf den Anschluss |
| Abfangjoch-Kern (3. Sept.) | einfacher Balken, Umrechnung auf die Gurte, Hebelarm **k**; Leiterzug in der Trägermittelebene; jeder Träger für sich nachgewiesen; die Gabel am Ende zählt im Nachweisschnitt |
| Vertikalbleche in AxisVM | lotrecht; die Untergurte rücken dafür. Der Rechenkern bleibt bei einem gemeinsamen b |
| Mastwähler (28. Aug.) | nur der **Profilname**, nicht «DP26 (HEB 260)» |
| DP18 / HEB 180 | **noch nicht** aufnehmen, bis der Auftraggeber es verlangt |
| Klemmenraster | meist 400 mm; unter 100 mm nur ein Hinweis, gesperrt wird nichts |

## Stand

**30. September 2026** · Prüfstand 5952 Kontrollen grün · `durchlauf.mjs`
ohne Bruch · vier Tragwerksarten (Joch, Einzelmast, Mast mit Tragausleger,
Abfangjoch) · Projektablage mit Einlesen/Ausleiten · COM-Brücke baut und
rechnet (Rechnen nur auf Anweisung).

Letzte Schritte (neueste zuerst; ältere stehen im Git-Verlauf):
- **30. Sept., Reaktionsblatt: Wahl der Zeilen, Titel in der Skizze;
  Lageband mindestens 20 m** (Prüfstand 169 c). Weisungen: «beim output noch
  bestimmen können ob man den havariefall / standardlasten / Hinweistext mit
  plotten will» - drei Kästchen in der Leiste des Blatts, ein Klick baut es
  neu, die Hinweise folgen der Wahl; «die bauteiltypen und die längen sollten
  noch ergänzt werden in der skizze sinngemäss wie beim 3d textbox» - die
  Titel des 3D mit Mastnummer; «wenn ich einen tragausleger bei x 60m habe
  und dann auf 0 das x stelle, entsteht ein überlanger ausleger in der
  tragweksskizze» - gemessen 12 % der Bandbreite bei x 60, 76 % bei x 0
  (massstäblich, das Band schrumpfte auf −1.5 … 11.3 m); jetzt mindestens
  20 m breit (`qpBereich`), bei x 0 42 %. Frage beantwortet: «ständig /
  veränderlich» = |M_y| unter dem ganzen G gegen das grösste |M_y| aus Wind
  oder Schnee allein, gezeigt ständig / (ständig + veränderlich); steht
  jetzt auch in den Hinweisen. Nicht gepusht.
- **30. Sept., Reaktionstabelle überarbeitet** (Prüfstand 169 b, siehe
  *Entschieden*). Beispielblatt der Jochreihe nur örtlich in
  `Versand/Beispiel_Reaktionskraefte_Jochreihe.html` (nicht in der Ablage).
  Nicht gepusht.
- **30. Sept., Tabelle der Reaktionskräfte** (Entscheid siehe *Entschieden*,
  Prüfstand 169, neue Module `core.reaktionen.js`, `export.reaktionen.js`).
  Im Browser (eigener Tab, Speichern abgeschaltet; Stand des Auftraggebers:
  Ausleger an Mast 14): Reiter Auflager «14 · DP2a / 2.0 · V 15.12 · M_q
  43.68 · M_l 36.01 · 36 / 64 %», Längsanker H_l 1.22 kN; Blatt mit Skizze,
  Achssystem und Hinweisen. Auf Weisung «pushen nach dem bau der tabelle»
  gepusht.
- **30. Sept., Mast wächst mit dem Ausleger, Anker im Kontextmenü, Δz_F am
  Einzelmasten weg, Berichtsleiste** (Prüfstand 168). Browserprobe in einem
  eigenen Tab mit abgeschaltetem Speichern. **Beobachtet, nicht behoben:**
  der Stab des Ankers ist im 3D nur rund 2 px dick und mit der Maus schwer
  zu treffen; bei zwei Auslegern am selben Masten nennt das Kontextmenü
  das zweite Tragwerk mit der alten Mastlänge («HEB 260 · 9.00 m»), der
  bekannte Punkt «Geteilter Mast mit zwei verschiedenen Mastlängen».
  Entschieden und noch zu bauen: Tabelle der Reaktionskräfte (Rückfragen
  «Mit Havarie getrennt», «Beides») und das Vorzeichen der Eingabe
  («Eingabe nach 3D»), siehe *Offene Punkte*.
- **30. Sept., Grenzwerte GZG in den Optionen, Ausleger mit zu kurzem Mast,
  Kacheln** (Entscheide siehe *Entschieden*, Prüfstand 167). Im Browser in
  einem zweiten Tab mit abgeschaltetem Speichern geprüft - der Auftraggeber
  arbeitete zugleich im ersten (Auslegerlänge 10 m, Mastlänge 12.5 m, seine
  Eingaben; nicht angefasst). Mast 9 m → Ausleger im 3D, rote Warnung,
  «η –»; 12.5 m → wieder gerechnet. Dabei der Berichtstext der
  Gebrauchstauglichkeit berichtigt (nannte noch L/100 mit G und L/200).
- **30. Sept., Mastspitze L/100, Aufhängung 0.80 m, Lageband höher**
  (Entscheide siehe *Entschieden*, Prüfstand 165, 166). Im Browser
  (Einzelmast 16.9, HEB 260/8.50 m, Anker SA20, Stabwerk): Kachel
  «Verformung 16.9 · 22 mm · Mastspitze 8.50 m · 85 mm zulässig»,
  Fahrdraht 9 / 40 mm; Optionen zeigen den Unterpunkt eingerückt.
- **30. Sept., neue Tragwerke über Masten, Kontextmenü und Kacheln; Leiste
  ohne Baum** (Entscheide siehe *Entschieden*, Prüfstand 161; die
  Kontrollzahl sank auf 5838, weil die Kontrollen des Baums entfielen).
  Im Browser: M1 0 / M2 20 / Einzelmast M3 38, Rechtsklick bei x 20 →
  «Tragjoch …» mit M2/M3 → L 18.00, gesetzt teilt T2 beide Masten; eine
  Abfangjoch-Kachel zwischen M1 und M2 abgelegt → A270 L 20.50. **Befund:**
  der Längenbereich im Dialog las `j.laengen`, das es nicht gibt (immer
  4–40 m) - jetzt `laengenbereich`. Gemessen: bleibt das Einzelmast-
  Tragwerk an einem Masten stehen, den ein neues Joch übernimmt, liegt der
  Mast bei 0.760 statt 0.755 (siehe *Offene Punkte*).
- **30. Sept., der Signalbauer** (Entscheid siehe *Entschieden*,
  Prüfstand 160). Neue Tabelle `signalteile` in `data/anbauteile.json`
  (Sicherung `data/sicherung/anbauteile_vor_signal_2026-09-30.json`),
  Katalogabschnitt «Signalteile» (jetzt 14 Abschnitte), Vorlage «Signal».
  Im Browser: Signal ans J90/20 m gesetzt, Beispiel der Mappe → G 1.65,
  W_x 0.98, W_y 1.64 kN (EK1); dazu Ausleger RRW L 3 m → G 3.90, A quer
  1.53 m². **Befund am Weg:** die Karte blieb nach «Übernehmen» auf
  «0 Posten» stehen (Auswahl fehlte in der Signatur der Maske) - behoben.
  Mit dem Signal an Feldmitte stieg das Bindeblech des J90/20 m von 0.48
  auf 1.27 (Torsion aus 1.64 kN Wind auf 1.5 m Hebel) - nur gesehen,
  nicht weiter untersucht. Der Arbeitsstand ist wiederhergestellt.
- **30. Sept., Einwirkungs-Mappe erster Teil** (Entscheide siehe
  *Entschieden*, Prüfstand 159): Konsolen und Armaturen wählbar, Trafo
  50/100 kVA als Vorlage am Masten, Wind auf den Tragausleger.
  Sicherungen davor: `data/sicherung/fl_bauteile_vor_konsolen_2026-09-30.json`,
  `anbauteile_vor_trafo_2026-09-30.json`; Datenpaket neu in `Versand/`.
  Zwanzig Kontrollen zum Tragausleger tragen den neuen Messwert mit dem
  alten im Kommentar. ⚠ Der Browser-Blick auf die neuen Vorlagen steht
  noch aus (Sicherheitsprüfung lieferte kein Urteil).
- **29. Sept. abends, acht Commits, nicht gepusht** (`1873231` …
  `69c1aba`; die Entscheide stehen oben in *Entschieden*, die Messungen
  in den Commit-Texten). Alte Stände über einen Weg (`standAnheben`);
  COM-Skripte auf Wunsch in den Ordner; Einzelmast-Absturz behoben;
  Durchsicht der Systemkarte (Ersatzbalken-Felder, Konsole in m,
  Ablenkung je Leiter, Kopfzahl des Einzelmasten); Lastfallgruppen,
  seltene Fälle weg; freie Last als Punkt; **Abfangjoch im Stabwerk**
  mit Leiterzug je Leiter nach Abfangart (pauschale Fh weg); Masten
  HEB 260 als Startwert, Werteplot lesbar, Kachel → Stab, Grundwerte im
  Dialog «Neues Tragwerk». Alles im Browser geprüft; der Arbeitsstand
  des Auftraggebers (J90/20 m) ist danach wiederhergestellt.
  **Nicht getan:** die Betreiberdaten öffentlich einzubauen (siehe
  *Offene Punkte*).
- **29. Sept., COM nachgezogen, gepusht** (Weisung «pushen com und
  bauteildatei nachziehen falls notwendig»). Blatt J90/20 m + Ausleger
  frei bei 40 m ausgeleitet: 909 Knoten, 1045 Stäbe, beide Seile «nur
  Zug», kein Verweis ins Leere. **Befund:** im Blatt nannte die Kopfzeile
  den Ausleger ohne Profil und Seilzahl (`bau.tragausleger` fehlt dort) -
  jetzt aus Sortiment und Satz, «Tragausleger 2 × UPE 140 L=6.00 m,
  2 Seile»; der Durchlauf prüft es. **Bauteildatei:** die Sortimente sind
  seit dem 26. September unverändert, das Paket vom 28. September in
  `Versand/` ist aktuell - nicht neu geschrieben.
- **29. Sept., fertig gebaut und geprüft** (Weisungen «Fertig bauen»,
  «checke nach dem fertig bauen die funktionalität des tragauslegers»,
  Abfangung beim Bauteil, AxisVM-Vergleich; Prüfstand 148–151).
  **Dialog «Neues Tragwerk»:** beim Ausleger die Längen des Sortiments
  (6–13 m) und die Seite statt der Joch-Typen. **Befund:** ein Ausleger
  neben einem anderen Tragwerk wurde nie gerechnet (und sperrte das Joch
  mit) - jetzt die zusammenhängende Gruppe (`rechenWerte`); im Browser
  J90/20 m + Ausleger 10 m links bei 40 m: Gurt 0.087, Blech 0.009,
  Aufhängung 0.390, Mast 0.532. **Abfangung beim Bauteil** (Bauteilkarte;
  Havarie-Karte nur Anzeige), im Browser: einseitig −y → G_y −14.90 kN.
  **3D-Plot aus dem Stabwerk** (neu `render.stabwerk.js`; J90/20 m je Gurt
  28 → 86 Prismen, grösstes η im Bild = Kachel: Gurt 0.3268, Blech
  0.3634, Mast M1 0.7862; Legende «aus dem Stabwerk …»). **Verläufe aus
  dem Stabwerk** (Treppe je Stab, Maximum = Kachel), Ersatzbalken
  eingeklappt. **Durchlauf fährt den Tragausleger** (7 Varianten, neben
  Joch, am Jochmasten): kein Befund; links R −600 = rechts R +600, ein
  Seil Blech 1.029 / zwei 0.208, ohne Längsanker Mast 2.115.
  **AxisVM, 15–20 % höhere Spannungen im Joch (gemeldet):** neues
  Werkzeug `vergleich_spannung.mjs` - dieselbe Spannungsformel mit AxisVMs
  Kräften und mit denen des Lösers am Torsionslauf J90/20 m: Maxima
  gleich auf 0.6–2.1 % (1.3(G+Wind y): Gurt 76.3 / 75.9, Blech 81.7 /
  81.1 N/mm²), Schub ändert nichts. Die Kräfte erklären es nicht - siehe
  *Offene Punkte*.
- **28. Sept., der Tragausleger in AxisVM aufgebaut** (Weisung «checken
  mit aufbau in axisvm, optimieren und pushen»; nur gebaut, nicht
  gerechnet; Arbeitsstand L 11 m, HEB 260, Hängestütze, Längsanker, zwei
  Seile; `com/AxisVM_Tragausleger_MT1_11m.json` / `.axs`). **Drei
  Befunde, alle behoben** (Prüfstand 147):
  (1) **Die Ausleitung baute das Phantomjoch.** `stabmodell` verzweigte
  nur mit `opt.satz`, COM/SAF/DXF reichen den Satz als `opt.eingabe` - die
  Datei trug vier Winkel-Links, Masten A und B und kein Seil (516 Knoten /
  589 Stäbe), während das Stabwerk der Anwendung den richtigen Ausleger
  rechnete. Jetzt `satz ?? eingabe`, PyNite reicht ihn mit: 91 Knoten /
  116 Stäbe. Betraf auch das Abfangjoch auf diesem Weg.
  (2) **Die Brücke setzte kein Punktmoment.** Ihr `switch` kannte nur
  'X'/'Y'/'Z', die Datei schreibt 'Mx'/'My'/'Mz' (auch am Tragjoch) - das
  Moment blieb null, AxisVM wies die Last ab (Rückgabe −100031, Abbruch 9).
  Jetzt beide Schreibweisen, eine unbekannte bricht mit Namen ab. Bisher
  hatte offenbar kein gebautes Modell ein Punktmoment.
  (3) **Kopfzeile:** «Tragjoch J90 L=11.00 m» mit der Drehfeder des Jochs
  → «Tragausleger 2 × UPE 140 L=11.00 m, 2 Seile», ohne Drehfeder; der
  Eigengewichtsfall «Ständig · Tragausleger»; am Einzelmasten «Einzelmast»
  statt «Tragjoch frei L=0.00 m».
  **Der Aufbau danach:** 58 Stäbe, 54 Starrkörper, 4 Verbindungselemente
  (V/H nach «A», zwei Seile lnlTensionOnly im Ortssystem), Auflager Fuss
  voll und Längsanker in y, 8 Punktlasten, 2 Punktmomente, 8 Streckenlasten,
  Eigengewicht an 58 Stäben, 24 Kombinationen. UPE-Fläche −3.4 % gegen die
  Tabelle (Ausrundungen, wie beim Winkel); die Linkfreiheitsgrade lassen
  sich weiter nicht zurücklesen (7b, bekannt).
- **28. Sept., 3D-Bild des Auslegers: Titel «TA · …», b-Mass weiter weg**
  (Entscheid siehe *Entschieden*, Prüfstand 147). Im Browser geprüft. Der
  Ausleger-Mast trägt im 3D keine Masse H und L_M (anders als die
  Jochmasten) - nicht Teil der Weisung, nicht ergänzt.
- **28. Sept., Knicken: Joch aus dem Stabwerk; Ausleger geklärt; COM;
  Lageband «A»** (Entscheide siehe *Entschieden*, Prüfstand 131, 144,
  147). **Joch:** Knicken je Mast aus dem Stabwerk, Einzeljoch J90/20 m
  Mast M1 0.8386 (Kern) → **0.8351**, Reihe 2 × J90/20 m geteilter M2
  1.4839 (Kern, Sofortmassnahme) → **1.4791** (gekoppelt); im Browser
  (Standarddokument J90/20 m, 8.50 m) 0.890 → **0.870**, Kachel «Knicken
  M1 · Stabwerk», Gruppe «Stabwerk», Schiene KM1/KM2 0.87, Fussleiste
  «η 0.870 (Knicken M2)»; ohne Knick-Schalter rechnet das Stabwerk keins.
  **Ausleger, Knicken 1.027 geklärt** (L 13 m, Hängestütze, Längsanker,
  zwei Seile, HEB 240, 14.00 m): N/N_K 0.126 + M_y 0.330 + M_z **0.571**;
  β = 2, z_N 9.77 m, L_cr 19.5 m, χ_z 0.075. Das Längsmoment am Fuss (28.8
  kNm char. unter Wind y) ist mit Längsanker **ganz der Wind auf den Mast
  selbst** (29.4 kNm aus seiner Streckenlast). **β = 2 gemessen bestätigt:**
  1 kN in y am Seilpunkt gibt 107.40 mm (mit Längsanker und zwei Seilen)
  gegen 107.50 mm am freien Kragarm - der Ausleger hält den Kopf nicht,
  weil sich der offene Mast verdreht und der Ausleger mitdreht. Hebel sind
  Profil (HEB 260 0.880, HEM 240 0.569) oder Mastlänge; Steg quer ist
  schlechter (1.884, Wind x auf der schwachen Achse). Mein Verdacht eines
  Fehlers in `mastAusStabwerk` bei gedrehtem Steg war falsch (anderer Fall
  massgebend). **COM:** die Seile der Aufhängung tragen `nichtlinear: {x:
  'nurZug'}` wie der Seilkopf des Seilankers; die Brücke setzt daraus
  lnlTensionOnly (nur nichtlinear wirksam) und brauchte keine Änderung.
  **Datenpaket** `Versand/Vierendeel_Datenpaket_2026-09-28.json` (351 kB,
  alle sechs Sortimente). **Lageband «A»** im Browser geprüft. Der
  Arbeitsstand ist nach dem Joch-Test Zeichen für Zeichen zurück.
- **28. Sept., Tragausleger: zwei gespreizte Seile; Lageband massstäblich**
  (Entscheide siehe *Entschieden*, Prüfstand Abschnitt 147). Zuerst eine
  Studie ohne Änderung am Projekt (Stabwerk, L 8 / 13 m mit Hängestütze):
  **zz am Link** Blech mit Längsanker 1.005 / 1.029 → 1.010 / 1.035, ohne
  1.135 / 1.208 → 1.087 / 1.155 - bleibt frei. **Zwei Seile ±1 m** an den
  Enden der Ankertraverse: Blech mit Längsanker 1.005 / 1.029 →
  **0.193 / 0.208**, ohne 1.135 / 1.208 → **0.295 / 0.316**; UPE L 13 ohne
  Anker 0.374 → 0.272; Mast, Knicken, Fundament praktisch gleich (S_v
  gleich, Mast 0.8498 → 0.8486). Eingebaut: `tragauslegerSpreizung`
  (data.abfangjoche.js), Knoten `TRAVERSE_P/N`, Links `AUFHAENGUNG_P/N`
  (export.axisvm.tragausleger.js), `aufhaengungNachweis` summiert die
  Seile und meldet Druck je Seil, der Kern zeigt den Seilzug je Seil, das
  3D-Bild zwei Seile und die ausragende Traverse. Die Abschnitte 136-140
  rechnen ausdrücklich mit einem Seil (sie halten den Befund des
  Pendelstabs fest); 144 prüft die Vorgabe (links R +600 UPE 0.372 →
  0.331). **Lageband:** die Höhe b steht im Massstab der Lage (Platzhalter
  mit `aspect-ratio`, `qp-ta-luft`), im Browser 258 × 124 px für 10.75 ×
  5.15 m, der Arm auf dem Mastsymbol. Im Browser geprüft (Feld «Spreizung»
  1 m, Notiz «2 Seile … 2.00 m auseinander», Kachel Aufhängung «2 Seile,
  das stärkere 3.50 kN Zug»); der Arbeitsstand bekam nur das neue Feld.
  Nebenbei: in Abschnitt 139 stand `twId: 'MT1'` hinter einem Kommentar
  und wirkte nicht - berichtigt.
- **28. Sept., Tragausleger: b und Winkel gekoppelt, Mastlänge H + b**
  (Entscheid siehe *Entschieden*, Prüfstand Abschnitt 146). Unter dem
  Ausleger stehen «Aufhängung über dem Ausleger b» und «Winkel Seil –
  Ausleger α»; gespeichert ist nur α, b = c₁ · tan α
  (`tragauslegerAufhaengung` in data.abfangjoche.js), **ohne Eintrag
  (0) b der Tabelle** (nachgefragt, siehe *Entschieden*; die Notiz am
  Winkel sagt «nach Sortiment» bzw. «eingetragen … 0 setzt zurück»).
  Kern, Stabmodell, Bild und Übersicht lesen b von dort. Die
  Mastlänge ohne Eintrag ist H + b auf den halben Meter
  (`tragauslegerMastVorgabe`, `mastLaengeFuer` in core.auflager.js) - der
  Befund vom Vormittag (Stabmodell 13.85 m, Kern und Maske 8.50 m) ist
  damit weg. **Gemessen** L 13 m, H 7.5 m, Hängestütze (Stabwerk; Mast
  ohne Eintrag jetzt 14.00 m statt 13.85): ohne Längsanker Mast mit σ_ω
  2.103 → **2.1146**, Knicken 1.091 → **1.1069**; mit Längsanker Mast
  0.838 → **0.8498**, Fundament 0.671 → **0.6765**; Kern Mast 0.590 →
  **0.922** (vorher mit 8.50 m). Der Winkel ändert am Masten nichts: das
  Kräftepaar aus Gelenk und Seilpunkt ist H·b = S_v·c₁ - gemessen mit
  30° und mit b der Tabelle dieselben vier Stellen. Er ändert die
  Seilkraft: L 8 m unter G 3.280 kN (b Tabelle) gegen 3.326 kN (30°),
  UPE L 8 0.07011 gegen 0.07026. Eine Länge unter
  H + b: Notiz am Feld «MAST ZU KURZ FÜR DIE AUFHÄNGUNG: mindestens …»,
  in der Hinweisliste «Tragausleger — Mast zu kurz für die Aufhängung …»,
  Kern und Stabwerk rechnen nicht. **Im Browser** (Arbeitsstand L 11 m):
  b 5.15 / α 30° / Mast 13.00; b = 6 → α 33.93°, Vorgabe 14.00; Mast 12
  → Meldung «mindestens 13.50 m»; α 20° → b 3.247, Meldung weg. Dabei
  zwei Befunde an der Maske behoben: der Hinweis unter der Mastlänge
  wurde nur beim Aufbau geschrieben (stand nach b = 6 weiter auf
  «13.00 m») - die Zahl steht jetzt in der nachgeführten Notiz; und das
  Zahlenfeld b zeigte «6.000004» (jetzt auf den Millimeter). Der
  Arbeitsstand ist danach Zeichen für Zeichen wiederhergestellt; er trägt
  noch α = 30 (die Vorgabe vom Vormittag, eingetragen beim Laden) - 0 im
  Winkelfeld stellt ihn auf die Tabelle. Im Browser: 0 → «nach Sortiment:
  b 5.20 m, α 30.24°», Mast 13.00; b 6 → «eingetragen … 0 setzt zurück»,
  Mast 14.00; 0 → wieder Sortiment.
- **28. Sept., Tragausleger Etappe 3c: das 3D-Bild** (Weisung «mit 3c
  weitermachen», Prüfstand Abschnitt 145, neues Modul
  `render.tragausleger.js`). Die Szene kommt aus `tragauslegerModell` -
  dieselben Knoten und Stäbe wie im Stabwerk, samt der Seite: zwei UPE
  (Öffnung aussen), Bindebleche oben und unten, Ankertraverse,
  Aufhängung, Anschluss am Masten, Längsanker (zwei Seile ±y), die
  Anbauteile mit ihrer Kette (`anbauKette`) und ihren Kräften (global,
  nicht gespiegelt), der Mast über `mastKoerper` mit dem Nachweis des
  Kerns. **Gefärbt aus dem Stabwerk**, wenn es gilt (`jeStab`; das
  grösste η im Bild ist das der Kachel, 1.029 gemessen), sonst neutral.
  Ohne Modell (Länge ausserhalb des Sortiments) bleibt das Ersatzbild.
  Im Browser: rechts und links im Iso-Blick, Mast «13.85 m». Dazu der
  Längsanker unter dem Ausleger statt beim Masten (Weisung «diese Angaben
  gehören auch zum Tragausleger und nicht zum Masten»).
  **Befund** (seither entschieden, siehe den Eintrag darüber): ohne
  eingetragene Mastlänge rechnete das Stabmodell mit H + b (13.85 m), der
  Kern und die Maske mit der Vorgabe des Tragjochs H + jd/2 + 0.5
  (8.50 m) - auch für die Knicklänge.
- **28. Sept., Tragausleger links oder rechts; im Lageband** (Prüfstand
  Abschnitt 144). Feld `auslegerSeite`. Gespiegelt wird die GEOMETRIE, die
  Einwirkungen bleiben global (Trasse wie definiert): das Modell wird
  örtlich gebaut und an der Mastachse gespiegelt (`spiegeln` in
  export.axisvm.tragausleger.js; die Gurte laufen dabei umgekehrt, damit
  die UPE ihre Stege innen behalten), die Kräfte der Anbauteile gehen
  vorher gespiegelt hinein und kommen damit global unverändert an; der
  Kern spiegelt für sich zurück. **Die Probe:** «links, R −600» ist das
  Spiegelbild von «rechts, R +600» - Kern auf zwölf Stellen gleich,
  Stabwerk auf 1e-5 (die sechste Stelle streut, Rechengenauigkeit des
  Lösers). **Gemessen** L 13 m mit Hängestütze und Längsanker, R +600:
  rechts Seil 4.121 kN, UPE 0.259, Mast 0.838; links (Mast auf der
  anderen Kurvenseite) Seil 4.722 kN, UPE 0.372, Mast 0.765. Im
  **Lageband** steht der Ausleger über dem Mastsymbol zu seiner Seite, mit
  der Aufhängung gestrichelt vom Mastkopf zum Seilpunkt c₁; der Bereich
  des Bandes reicht bis zum Kragarmende. Im Browser geprüft (rechts/links,
  Stabwerk rechnet neu; der Arbeitsstand steht wieder auf rechts).
- **28. Sept., Tragausleger: Maske ohne Joch, Auflager wie am Abfangjoch**
  (Weisung und Rückfragen siehe *Entschieden*, Prüfstand Abschnitt 143).
  Gruppe «Ausleger und Geometrie» (`titelJe`) mit Länge und «Höhe Ausleger
  über Fundament» (`gruppeAus` am Feld `mastH`); die Sortimentszeile steht
  unter *Profile*, die Profiltafel zeigt 2 × UPE 140 und nur den Mast MT1.
  Im *Auflager* entfallen «Anschluss ans Joch» und die Konsole (beide
  wirkten beim Ausleger nicht). **Befund:** die Auflagerskizze des
  Auslegers war die des Tragjochs (OG/UG), die Ausleitung las aber V/H -
  was man dort einstellte, kam nie im Modell an. Jetzt V/H wie am
  Abfangjoch, die Vorgabe «A» steht in `LINK_VORGABEN.tragausleger` (die
  Kopie `TA_LINK_VORGABE` ist weg); die Zahlen der Abschnitte 137-140
  sind unverändert. Im Browser geprüft (Maske, Skizze, *Profile*).
- **28. Sept., Tragausleger Etappe 3b: der Kragarm-Kern** (Entscheid
  «Lotrecht», Prüfstand Abschnitt 142, neues Modul `core.tragausleger.js`).
  Die Lasten liest er aus dem Stabmodell (`tragauslegerModell`), Kern und
  Stabwerk sehen dieselben; S_v aus den Momenten um das Gelenk, H = S_v·c₁/b
  drückt die UPE. Der Mast bekommt zwei Kräfte (Gelenk auf H, Seil auf
  H + b, `auslegerAuflager` in core.mast.js, je auf ihrer Höhe auch für das
  Knicken); kein Phantom-Mast B mehr. Anker, Verformung und Fundament lesen
  die Liste des Kerns (`auslegerKombi`). Anzeige ohne gültiges Stabwerk:
  Gruppe «Tragausleger» (η Gurt lotrecht, Aufhängung; Bindeblech und
  Längsanker «nur im Stabwerk»), Schiene UPE/Se, Schnittgrössen des Kerns,
  keine Tabelle der Stellen und keine Konstruktionsprüfungen des Ersatzjochs
  mehr. **Gemessen** (Kern / Stabwerk, ohne Längsanker): Fahrleitung direkt
  L 8 Seil 2.884 / 2.827 kN, UPE 0.070 / 0.064, Mast 0.360 / 0.492;
  Hängestütze L 13 Seil 4.168 / 4.121, UPE 0.245 / 0.374, Mast 0.590 /
  2.103. Die Kontrollformel geht an der Einzellast auf die Stelle auf.
  **Weisung dazu:** «die x werte sollten auf die länge limitiert werden» -
  Längsanker und Anbauteile enden am Kragarmende (siehe *Entschieden*); im
  Browser 20 → 12.75 m und 15 → 12.75 m, auch im Zahlenfeld der Anbauteile.
  **Befund am Weg:** der Mast des Abfangjochs bekam den Knick-Schalter nicht
  mit (`optM` ohne `knicken`) - seit der Vorgabe «Knicken aus» stand dort
  das Knicken im η, während «nicht geführt» dastand. A200/15 m: 0.6617 →
  **0.6156**; mit Knicken an unverändert. Jetzt `mastOptionen` für beide.
  **Im Browser:** Ersatzbalken-Verfahren → η 0.784 (Aufhängung, S_v 3.92 kN),
  Gurt 0.236, Mast MT1 0.519, Fundament 0.459; zurück auf Stabwerk → η 1.060
  (Bindeblech), Aufhängung einmal. Der Arbeitsstand steht wieder auf den
  Werten des Auftraggebers (Ausleger 13 m, Anbauteil 10 m, Längsanker 6 m).
  ⚠ Noch vom Ersatzjoch: Verläufe, Auflagerblatt, Gruppe *Auflager* der
  Maske und das 3D-Bild (3c).
- **28. Sept., Tragausleger Etappe 3a: die Maske nach seinem Sortiment**
  (Prüfstand Abschnitt 141; vorher auf Weisung gepusht: «pushen und weiter
  mit etappe 3», `740a02d..6ce4020`). Beim Ausleger stand «Tragjoch-Typ
  J90» mit Bauhöhe, Gurtbreiten, Endfeld, Masskette und Winkelgurten, dazu
  die Blechübersicht und Stückliste des Tragjochs; die Länge lief über den
  Bereich des Tragjochs, und ein Artwechsel liess die Jochlänge stehen
  (20 m gibt es nicht - das Stabmodell verweigerte sich). Jetzt: Feld
  «Auslegerlänge», Schieber 6 … 13 m, jede Eingabe rastet auf die nächste
  geführte Länge (`tragauslegerNaechsteLaenge`), der Artwechsel setzt sie
  (`artVorgabe`); die Felder des Tragjochs stehen nicht mehr da, an ihrer
  Stelle unter «Masse aus dem Sortiment» die Zeile des Sortiments
  (`auslegerUebersichtHtml`: 2 × UPE 140, e, Bleche, b, c₁, c₂, Raster,
  V_zul). **Befund am Weg, auch am Abfangjoch:** das Zahlenfeld zeigte nach
  dem Einrasten weiter die getippte Zahl («11.4», gerechnet mit 11 m) - das
  Feld mit dem Fokus wird beim Nachführen übersprungen. Beim Verlassen
  zeigt es jetzt den gespeicherten Wert. **Im Browser:** Joch 21.5 m →
  Artwechsel → Ausleger 13 m, Tafel 13 × 2 Bleche, b 6.35, c₁ 10.88, Raster
  1300 + 12·970 + 60 = 13 000 mm; Eingabe 9.6 → Feld und Speicher 10.
  Noch vom Tragjoch: die Gruppe *Auflager* (Anschluss ans Joch) und das
  3D-Bild - Etappe 3b/3c.
- **28. Sept., der Längsanker am Kragarmende** (Entscheid siehe
  *Entschieden*, Prüfstand Abschnitt 140). Regelfall, abschaltbar, Stelle
  wählbar; linear ein fester Halt in Gleisrichtung. `laengsankerKraft`
  gibt die Seilkraft (charakteristisch über die wirklichen Zustände, dazu
  der Bemessungswert) mit der Seite, die zieht; Kachel «Längsanker» ohne
  Ampel. **Gemessen L = 13 m mit Hängestütze, ohne → mit:** Mast 2.103 →
  **0.838**, Fundament 1.445 (T) → **0.671** (H_q), Knicken 1.091 →
  1.011, Bindeblech 1.209 → **1.029**, UPE 0.374 → 0.259, Seil 0.824
  (praktisch unverändert); Längsanker 0.538 kN charakteristisch (0.699
  Bemessung). L = 8 m: Mast 1.274 → 0.497, Blech 1.135 → 1.005. Das Blech
  bleibt knapp über 1: der Anker auf Achshöhe nimmt die Kraft in y, nicht
  das Torsionsmoment aus dem Wind in der Mitte der Hängestütze. Im Browser
  geprüft (Schalter aus → Mast 2.103 und Fundament 1.445 zurück); der
  Arbeitsstand ist wiederhergestellt, die Anwendung ergänzt beim Laden nur
  die zwei neuen Felder mit ihrer Vorgabe. Die Abschnitte 137–139 rechnen
  ausdrücklich ohne Anker (sie halten diesen Zustand fest).
- **28. Sept., Tragausleger Etappe 4c: nachgewiesen im Stabwerk, in der
  Anzeige** (Prüfstand Abschnitt 139). Die Sperre ist aufgehoben
  (`ARTEN_MIT_STABMODELL`), in einer Reihe bleibt sie (Aufhängung, Knicken
  und Fundament rechnet `rechneStabwerk` nur für den Ausleger allein).
  Mit gültigem Stabwerk trägt es das ganze Urteil: Gurt UPE, Bindeblech,
  Aufhängung, Mast, Knicken, Fundament; der Phantom-Mast B des Kerns und
  der Vermerk «NICHT nachgewiesen» fallen weg (`urteilMitStabwerk` in
  ui.js, auch in Fussleiste, Schiene und Tragwerksliste). Der Mast heisst
  im Modell wie in den Kacheln (`federn.namen`, «MT1»). Der Hinweis des
  Kerns sagt jetzt, dass das Stabwerk nachweist. **Im Browser** (Stand
  vorher gesichert und danach Zeichen für Zeichen wiederhergestellt):
  Ausleger L 13 m mit Hängestütze — Gurt 0.374, **Bindeblech 1.209**,
  Aufhängung 0.824 (S_v 4.12 / 5.00 kN), **Mast MT1 2.103**, **Fundament
  1.445**; vor dem Stabwerkslauf «nicht nachgewiesen η 0.35», danach
  η 1.21 ohne Schild. Noch vom Kern: die Maske («Tragjoch-Typ … J90») und
  das 3D-Bild zeigen beim Ausleger das Ersatzjoch.
- **28. Sept., Tragausleger Etappe 4b: Knicken und Fundament aus dem
  Stabwerk; Wölbspannung im Stabwerk** (Prüfstand Abschnitt 138, neues
  Modul `core.stabmast.js`). Die Regeln bleiben im Kern
  (`mastStabilitaet`, `fundamentNachweis`); sie bekommen ein Mastergebnis
  aus dem Stabwerk: Vertikallasten = Sprünge der Normalkraft an den
  Mastknoten, Schnittgrössen aus den Endkräften, am Fuss die
  Auflagerkräfte. **Gegenprobe am Joch** J90/20 m, Mast M1: Knicken Kern
  0.8386 / Stabwerk 0.8351, Fundament 0.4029 / 0.4030. **Am Tragausleger**
  (Kern mit Phantomauflager → Stabwerk): Fahrleitung direkt L 8 m Knicken
  0.489 → 0.566, Fundament 0.359 → 0.506; Hängestütze L 13 m Knicken
  0.652 → **1.091**, Fundament 0.391 → **1.445** (massgebend die Torsion T).
  **Befund am Weg: das Stabwerk rechnete am Masten keine Wölbspannung**,
  der Kern schon (Nachweisgruppe «Torsion Mast»). Jetzt dieselbe Funktion
  (`woelbtorsion`) mit der Torsion aus dem Stabwerk, Kopf = zO (sichere
  Seite). Joch: Mast 0.7751 → **0.7862**, Reihe M1/M3 0.7778 → 0.7951,
  geteilter M2 unverändert 1.3528. Ausleger mit Hängestütze: Mast 0.557
  → **1.274** (L 8), 0.899 → **2.103** (L 13) — Wind in Gleisrichtung am
  langen Hebel geht nach Entscheid «A» als Torsion in den Masten. Dazu:
  der Kern schaltete das Knicken bei fehlendem Eintrag noch EIN (`!==
  false`), das Urteil seit heute aus — jetzt beide `=== true`.
- **28. Sept., Tragausleger Etappe 4a: UPE, Bindebleche und Aufhängung im
  Stabwerk** (Prüfstand Abschnitt 137, Entscheide siehe *Entschieden*).
  Neue Rolle `gurtU` für die UPE (V_S…, H_S…); das U rechnet mit den
  Tabellenwerten (W_z = I_z/(b − e_y) = 18.19 cm³ am UPE 140 — mit b/2
  wäre es ein Drittel zu günstig); die Bleche des Auslegers (BL_O…, BL_U…)
  laufen als Bleche. `aufhaengungNachweis`: senkrechter Anteil der
  Seilkraft über die wirklichen charakteristischen Zustände gegen
  V_zul = 5 kN, ein gedrücktes Seil als eigener Befund. Gemessen L = 8 m:
  Fahrleitung direkt UPE 0.064, Blech 0.002, Seil 2.83 kN (η 0.565);
  Hängestütze mit Fahrleitung UPE 0.311, **Blech 1.135**, Seil 3.45 kN
  (0.691) — siehe *Offene Punkte*. Die Anzeige sperrt den Ausleger noch.
- **28. Sept., Tragausleger Etappe 2: das Stabmodell im Stabwerk**
  (Prüfstand Abschnitt 136). `tragauslegerBau` geht denselben Weg wie das
  Abfangjoch: der Umbau aus `abfangBau` ist als `bausteinAusModell`
  herausgelöst (Abfangjoch unverändert, Abschnitt 105 grün), die Lasten
  heissen jetzt `eigeneLasten`, `stabmodell()` zweigt für den Tragausleger
  ab, `rechneStabwerk` reicht den Satz im Einzelfall durch. Die Havarie
  bleibt im Ausleger-Modell vorerst draussen (das Blatt führt sie je
  Leiter), ein Hinweis sagt es. **Gemessen am Ausleger L = 8 m** (c₁ 5.95,
  b 3.50 m, HEB 240): Seilkraft unter Eigengewicht **3.2800 kN, Zug**,
  gegen den Freikörper (Momente um die Gelenkachse durch die Linkmitten)
  auf die Stelle; mit 1 kN an der Spitze S_v = 1.2674 kN gegen die
  **Kontrollformel** der Zeichnung V = F·x/c₁ = 1.3025 kN — die Formel
  liegt 2.7 % darüber, weil die Traverse 0.095 m über der Gelenkachse
  sitzt und die waagrechte Seilkomponente über diesen Hebel entlastet.
  Die Anzeige sperrt den Ausleger im Stabwerksweg weiter
  (`ohneStabmodell`), bis die UPE nachgewiesen werden.
- **28. Sept., Befund: im Stabwerksweg fehlte den Masten das
  Eigengewicht.** `rechneStabwerk` rechnet den Löser ohne eigenes
  Eigengewicht, die Lastliste trug mit `eigengewicht: true` aber nur die
  Laufmeterlast des Jochs (g_k). Gemessen am J90/20 m: Summe unter G
  11.773 kN = g_k · L, es fehlten die beiden HEB 240 (13.878 kN). Jetzt
  steht das Eigengewicht der Masten (und bei eigenen Bausteinen jedes
  echten Stabes) aus A · ρ · g in der Liste (`eigengewichtAus`), wie
  AxisVM es selbst rechnet: 25.650 kN. Am Urteil: Einzeljoch Mast
  0.7713 → **0.7751**, Reihe M2 1.3490 → **1.3528**, M1/M3 0.7740 →
  0.7778; die Joche unverändert. Die AxisVM-Ausleitung ist nicht berührt
  (dort ohne `eigengewicht`); die PyNite-Ausleitung bekommt die Masten
  jetzt mit Gewicht. ⚠ Ein Anker (Druckstütze) trägt in der Liste noch
  kein Eigengewicht.
- **28. Sept., Knicken Mast voreingestellt aus** (siehe *Entschieden*,
  Prüfstand Abschnitt 135). Der Prüfstand baut auf dem Standarddokument
  auf und rechnet das Knicken nach; er nimmt es deshalb ausdrücklich
  mit (`standardwerte` in pruefung.mjs), drei Kontrollen der alten
  Vorgabe sind auf die neue gedreht.
- **28. Sept., der Schnitt im Stabwerksweg: Station und Stabliste**
  (Entscheid siehe *Entschieden*, Prüfstand Abschnitt 134). Die Hülle führt
  je Stab den massgebenden Fall mit den zwölf Endkräften und seiner Lage
  (`jeStab` in `stabwerkHuelle`). Der Reiter *Schnitt* zeigt, wenn das
  Stabwerk gilt, zuerst «Stabwerk an der Station»: die vier Gurtstäbe, die
  dort durchlaufen, und die Bleche der beiden Nachbarstationen — je Stab
  η, σ, Kombination und die Endkräfte des Lösers am massgebenden Ende
  (lokal). Darunter je Teil (Obergurt, Untergurt, Bindebleche, Masten) die
  zehn höchsten η; ein Klick auf eine Zeile fährt zur Stelle
  (`springeZu`). Die Aufteilung des Ersatzbalkens bleibt eingeklappt zum
  Vergleich. η und σ stehen vorn — in der schmalen Schublade sonst hinter
  einem Querscroll. **Befund am Weg:** in einer Reihe liegt das Stabwerk
  in Blattkoordinaten, und das rechte Joch ist um die Luft der Endbleche
  gerückt (`lagenEntflechten`): T2 mit Lage 20.0 m hat seine Gurte bei
  20.100 … 40.100 m. Der Versatz kommt deshalb aus dem Anfang der Gurte im
  Stabwerk, nicht aus der Eingabe. Im Browser: Klick auf `OGL_S39`
  (η 0.492 = Kachel Obergurt) setzt den Schnitt auf das Feld bei 8.99 m.
  Nebenbei: die Mastgruppe schreibt «Knicken Ersatzbalken» nur noch, wenn
  das Knicken geführt wird.
- **28. Sept., die Gebrauchstauglichkeit kommt aus dem Stabwerk** (Entscheid
  «Ins Stabwerk», Prüfstand Abschnitt 133, neues Modul
  `core.stabverformung.js`). Dieselben Fälle, dieselbe Messstelle und
  derselbe Grenzwert wie der Kern; nur die Wege kommen aus dem Löser, und
  zwischen den Mastknoten wird mit der Biegelinie interpoliert (Hermite aus
  Weg und Verdrehung, dazu q L⁴/(24EI) ξ²(1−ξ)² für den Mastwind im Feld).
  **Gegen die geschlossene Lösung** (Kragarm 7 m in 4 + 3 m, q und F in x
  und y, starke und schwache Achse) auf alle Stellen; ohne den Feldanteil
  läge sie daneben (2.6595 gegen 2.6738 mm). **Gemessen am J90/20 m**, quer
  auf 7.50 m: Einzeljoch Kern 5.474 → Stabwerk **5.309 mm**; Reihe
  geteilter M2 4.886 → **4.897**, Randmast M3 5.474 → **5.727** (Kern
  −4.4 %, unsicher). Mastspitze wie am 26. Sept. auf 0.1–0.3 %. Die −16 %
  vom 26. September (4.89 / 5.81 mm) stehen so nicht mehr — seither
  rechnet der Löser mit I_yz und koppelt in der Linkmitte. Die Anzeige
  nimmt die Stabwerkswerte, sobald das Stabwerk gilt (Kopf des Blocks
  «… · Stabwerk», Kacheltitel «Wege aus dem Stabwerk»), sonst den Kern
  als «Ersatzbalken · vorläufig». Im Browser geprüft (M1/M2 6 mm auf
  Fahrdraht 6.00 m, Ampel grün, Quelle Stabwerk). Dazu die
  **Verformungskacheln mit Ampel** (Entscheid «Verformung mit Ampel»).
  **Befund dabei:** «nur Wind» nahm auch «Ständig + Wind» mit (0.7·G +
  0.7·W). Auf Rückfrage **«Nur Wind»** (siehe *Entschieden*): danach
  Kern 4.886 / Stabwerk 4.897 mm an allen Masten, auf 0.2 % gleich.
- **28. Sept., Fahrdrahtschieber und Auflagerskizzen** (Prüfstand
  Abschnitt 132). Gemeldet mit Bildern: «diesen schieber checken, diser
  steht vielmals auf 0 und die länge ist nicht auf die mastlänge
  limitiert» und «die skizzen der auflger sind übereinander zu gross».
  (1) `fdHoehe` endet jetzt am **Mastkopf** (`maxAus`, der höhere der
  beiden Masten; vorher 25 m, und alles über dem Kopf wurde verworfen).
  (2) Bei der Automatik (gespeichert 0) zeigt der Schieber die Höhe, die
  gilt, und die Beschriftung sagt «automatisch (Jochauflager)»
  (`setzeFdAutomatik` aus der letzten Rechnung); gespeichert bleibt die 0.
  Im Browser: Grenze 8.5 m, Eingabe 0 → Schieber 7.5 «automatisch
  (Jochauflager)», Nachweis «Jochauflager 7.50 m»; zurück auf 6.00 m.
  `mastKopfHoehe` steht dafür jetzt in ui.schema.js (ui.js reicht sie
  weiter). (3) Die beiden Auflagerskizzen sind auf **340 px** begrenzt und
  zentriert — untereinander wuchsen sie auf die ganze Spaltenbreite.
- **28. Sept., Stabwerk führt die Anzeige, Knicken ergänzt** (Entscheid
  siehe *Entschieden*, Prüfstand Abschnitt 131). Nach der Berechnung stehen
  **Hauptkachel, Kacheln Joch/Mast, Fussleiste, rechte Schiene und
  Lageband** aus dem Stabwerk — eine Maske, ein Satz Zahlen. Der Mast hat
  zwei Kacheln: Querschnitt aus dem Stabwerk, **Knicken** aus dem Kern
  (`bauteileMitStabwerk` in core.stabnachweis.js, jede Zeile mit `quelle`).
  Die Stabwerksleiste zeigt **keine eigene Zahl** mehr (sie war das
  Maximum ohne Knicken, Anker und Fundament — genau die zweite Zahl, die
  der Auftraggeber «irreführend» nannte). Gruppen tragen ihre Quelle
  rechts («Stabwerk», «Stabwerk · Knicken Ersatzbalken», «Ersatzbalken»);
  ohne gültiges Stabwerk steht «vorläufig». **Automatisch, verzögert:**
  1 s nach der letzten Eingabe (`planeStabwerk`, `STABWERK_VERZUG_MS`),
  nur bei «fehlt»/«veraltet»; ein Fehler an einem alten Stand gilt als
  «veraltet» und wird neu versucht. Die Hülle führt neu `teile`
  (je Bauteil Obergurt/Untergurt/Bindeblech/Mast, `stabTeil`).
  **Gemessen am J90/20 m** (Kern → Stabwerk): Einzeljoch Joch 0.3874 →
  **0.3634** (Blech), Mast M1 0.8386 → Querschnitt **0.7713** + Knicken
  **0.8386**; Reihe T2 Mast M2 1.4839 → **1.3490** + Knicken **1.4839**.
  Die Kopfzahl bleibt dort gleich — das Knicken ist massgebend —, nennt
  aber jetzt «Knicken M1». Im Browser (Standarddokument J90/20 m): nach
  dem Laden «Ersatzbalken · vorläufig», nach rund 1 s von selbst
  «Stabwerk», η 0.890 «Knicken M1» in Hauptkachel **und** Fussleiste;
  Jochlänge 20 → 18 m: sofort «vorläufig» (0.831), eine Sekunde später
  Stabwerk (Gurt 0.390/0.405, Blech 0.459, Mast 0.739/0.745, Knicken
  0.820/0.831); zurück auf 20 m. Konsole ohne Fehler.
  Dabei nachgeholt: `sw.js` führte das Tragausleger-Modul vom Vortag
  nicht (dort war nicht gebündelt worden) — der Prüfstand fiel darauf.
- **26. Sept., e_y des UPE 160 berichtigt: 1.84 → 2.27 cm** (Weisung
  «Berichtigen»). Aus den Normmassen nachgerechnet; UPE 200/240 trafen die
  Tabelle, der 160er nicht. Gemessen am A160: Hebelarm 31.68 → 32.54 cm,
  Gurtkraft bei M = 50 kNm 157.83 → 153.66 kN (−2.6 %), η im Beispiel des
  Prüfstands 0.977 → 0.968, Blech-η 1.7485 → 1.7471. Der alte Wert lag auf
  der sicheren Seite. Eine Kontrolle trug 42 − 2·1.84 als feste Zahl; sie
  rechnet jetzt mit 2.27 und nennt den Grund. Datenpaket neu in `Versand/`.
- **26. Sept., Tragausleger Etappe 1: die Daten.** Quelle: die beiden
  Zeichnungen unter `Grundlagen/Tragausleger` (Übersicht und Werkstatt-
  zeichnung UPE 140). **UPE 140** in `data/normen.json` (verfolgt, Norm-
  tabelle): aus den Normmassen h 140, b 65, t_w 5, t_f 9, r 12 gerechnet
  (Raster 0.05 mm) — dieselbe Rechnung trifft UPE 160/200/240 der Tabelle
  in A, I_y, I_z, W, i, G auf die Stelle; I_t = 3.96 cm⁴ (Formel ohne Kehlen
  × 1.079, dem Mittel der drei Tabellenprofile, Spanne ±1.5 %).
  **Tragausleger-Sortiment** als zweite Liste in `data/abfangjoche.json`
  (`tragausleger`, 8 Längen 6–13 m: Blechraster a/b/Endmass, Stückzahl,
  Gewicht, Aufhängung b/c₁/c₂/gts, V_zul 5 kN; Sicherung davor in
  `data/sicherung/`). Beide Gegenproben der Zeichnung gehen bei allen acht
  Zeilen auf: a + n·b + 60 = L und c₁ + c₂ + 0.25 = L (der Ausleger beginnt
  0.25 m hinter der Mastachse). Katalog, Aufbau (`data.tabellen.js`) und
  Zugriff (`tragauslegerTypen`, `getTragausleger`, `tragauslegerBlechachsen`)
  stehen; das Datenpaket in `Versand/` trägt beides.
- **26. Sept., der Löser koppelt jedes Linkelement in der Linkmitte**
  (Weisung «ja löser auf linkmitte umstellen», siehe *Entschieden*;
  `kFeder` mit Hebel an beiden Knoten, Prüfstand Abschnitt 121). Gegen die
  gemessene Arbeitskopie gehalten: dieselben Abweichungen gegen AxisVM auf
  die Stelle (Torsionsmodell, alle 22 Fälle). Am Urteil: Einzeljoch Mast
  0.7708 → 0.7713, Reihe 1.3493 → 1.3490, Havariefälle 53.71 → 52.74 /
  53.87 kN. Die geschlossene Lösung in 121 hielt die alte Kinematik fest
  (B folgt dem ganzen Arm) — sie prüft jetzt die neue (u_B = u_A +
  φ_A·L/2, gemessen 2.6786e-4 m) und dass es die alte nicht mehr ist. Im
  Browser: Reihe 2 × J90/20 m gerechnet, Mast M2 1.414, M3/M1 0.802/0.801,
  Joch T1/T2 0.565/0.560 (vorher 0.800/0.800, 0.561/0.556), Konsole ohne
  Fehler.
- **26. Sept., der Torsionslauf in AxisVM** (Weisung «ok rechnen lassen»;
  `com/AxisVM_Torsion_J90_20m.json`, 22 Lastfälle, erstmals mit der
  berichtigten Linkverbindung, Protokoll: «halbe Linklaenge … 0.0250 m»).
  Erstmals mit **Linkkräften** (40 Links je Fall; der leere Fall HavarieY
  wird richtig als «Lastfall ohne Last» erkannt). Auslesen ≈ 40 Minuten.
  **Befund:** die Lage der Linkverbindung wirkt stark, auch wenn sie AUF
  dem Link liegt. Der Löser koppelt am Gurtknoten, AxisVM jetzt in der
  Linkmitte (0.025 m am Jochanschluss, **0.05 m an den 0.10 m langen
  Anbauteil-Links**). Gemessen, Löser wie heute → Löser mit Kopplung in
  der Linkmitte (Arbeitskopie):

  | gegen AxisVM | Gurtknoten | Linkmitte |
  |---|---|---|
  | G: Mast M_y | 11.1 % | **0.2 %** |
  | G: Gurt M_y / Blech N | 11.2 / 18.0 % | **2.9 / 1.0 %** |
  | WindY: Gurt M_y / V_y | 19.4 / 35.4 % | **4.5 / 8.9 %** |
  | Umlenkung NT_Mitte: Blech M_z | 98.0 % | **3.6 %** |
  | Umlenkung NT_Mitte: Gurt M_y | 82.1 % | **2.1 %** |
  | Umlenkung NT_Ende: Gurt M_y | 74.4 % | **5.8 %** |
  | Torsion HS_Ende: Blech V_z | 87.4 % | **17.9 %** (max 0.048 kN) |

  Mit Kopplung in der Linkmitte bleibt über 8 % nur, was klein ist
  (Torsion und Nebenmomente der Bleche, 0.005–0.05) oder örtlich an den
  Klemmen des NT-Auslegers bei x = 2.0 liegt (Gurt V `OGR_S14` 0.108 gegen
  0.024 kN bei einem grössten Wert von 0.33). **Die Linkkräfte selbst
  stimmen** (NT_Ende oberer Link: 4.749 gegen 4.718 kN in Jochachse,
  0.7 %; AxisVM gibt sie global aus), ebenso die Wege dort (≈ 1 %).
  **Am Urteil ändert die Kopplungslage kaum etwas:** Einzeljoch Mast
  0.7708 → 0.7713, Reihe 1.3493 → 1.3490, Gurt/Blech in der vierten
  Stelle. Örtlich an Anbauteilen aber bis Faktor 2 bei kleinen Werten.
  ⚠ Ob der Löser auf die Linkmitte umstellt, ist zu entscheiden (siehe
  *Offene Punkte*, «Lage der Verbindung im Löser»).
- **26. Sept., der Rest am Anschluss Joch–Mast war ein Fehler des
  AxisVM-Modells, nicht des Lösers** (Prüfstand Abschnitt 130). Auf
  Weisung («Brücke erweitern und rechnen») liest die Brücke jetzt je
  Lastfall die **Knotenwege** (`GetNodalDisplacementByLoadCaseId`, alle
  828 Knoten) und die **Linkkräfte** (`GetLinkElementForcesByLoadCaseId`),
  die Zuordnung führt die Linknummern (`links`). Der Lauf am J90/20 m
  (bauen, rechnen, lesen) gab die Schnittgrössen des Laufs von heute Nacht
  auf 3·10⁻⁶ wieder; Fussknoten null, Mastkopf unter Wind x 8.278 gegen
  8.294 mm — die Wege sind global und brauchbar.
  **Der Befund:** unter G rutschte der Obergurt gegen den «in x starren»
  Link um 1.18 mm (`ANS_M1_OGL` 1.728, `OGL_0.120` 0.552 mm). Die Höhe, auf
  der sich Mast und Gurt in x decken, lag in G **und** in Wind x bei
  **0.500 m über dem Gurtknoten**. Ursache: die Brücke setzte seit dem
  24. August (`72ae25e`) `Position = 0.5` für «halbe Länge» — bei
  `PositionType = brdtLength` sind das **0.5 Meter**. Der Link ist 0.05 m
  lang; die Verbindung lag 0.45 m ausserhalb des Elements.
  **Gegenprobe im Löser** mit genau dieser Lage (Arbeitskopie, nicht im
  Projekt): Mastfuss M_y G 81.1 → **0.6 %**, Gurt M_y Wind y 54.9 →
  **1.1 %**, Blech M_z / V_y Wind y 28.1 / 19.6 → **0.7 / 0.7 %**,
  Masttorsion 5.5 → **0.3 %**; alle nennenswerten Grössen 0.0–1.5 %.
  **Löser und AxisVM rechnen dasselbe Tragwerk gleich.**
  **Berichtigt:** die Brücke setzt die halbe Linklänge aus den Knoten der
  Datei, in Metern (am Jochanschluss 0.025 m); Abschnitt 130 wacht darüber
  und schlägt am alten Stand an. **Noch nicht in AxisVM gelaufen.**
  ⚠ Ein eigener Fehler am Weg: die neue Wache gegen leere Linksätze hielt
  den ersten Lastfall (`HavarieX`, in diesem Modell ohne Last) für einen
  leeren Satz und schaltete die Linkkräfte für alle Fälle ab. Berichtigt
  (leer nur, wenn sich das Tragwerk im selben Fall bewegt); der Lauf hat
  deshalb Wege, aber keine Linkkräfte.
- **26. Sept., die Gurtspannung im Stabwerk ist vorzeichenrichtig**
  (Entscheid siehe *Entschieden*, Prüfstand 123 d und 129 f).
  `randspannung()` hat die Option `vorzeichenrichtig`; nur `stabSpannung`
  (Stabwerksweg) setzt sie, der Ersatzbalken behält die Hülle. Die
  **Normalkraft bleibt beim Betrag** — gemessen, was das Vorzeichen von N
  zusätzlich brächte: Einzeljoch nichts, Reihe 0.3648 → 0.3590 (1.6 %).
  **Die Konvention ist gemessen, nicht angenommen:** Kragarm L 90×90×9,
  Kopflast in acht Richtungen, Spannung aus der Krümmung E(−y v'' − z w'')
  gegen die Spannung aus den Endkräften — auf die Stelle gleich in allen
  acht. Die Hülle liegt in den beiden Richtungen der starken Hauptachse
  darüber (151.3 statt 68.7 N/mm², Faktor 2.2); mit dem falschen relativen
  Vorzeichen fiele die Kontrolle genau dort.
  **Am Urteil** (Stabwerksweg, J90/20 m): Gurt η 0.4684 → **0.3268**; das
  Joch wird jetzt vom Bindeblech bestimmt (0.3633). Reihe: Gurt 0.4775 →
  **0.3648**, Joch T1/T2 0.4406/0.4407 (Blech). Masten unverändert.
  Im Browser: Reihe 2 × J90/20 m (Standardbelegung der Anwendung) gerechnet,
  Reihenzeile «Mast M2 1.414 · Mast M3 0.800 · Mast M1 0.800 · Joch T1
  0.561 · Joch T2 0.556», Konsole ohne Fehler.
- **26. Sept., I_yz steht in der Elementmatrix** (Auftrag Punkt 1,
  Prüfstand Abschnitt 129). `kLokalSchief` in core.stabwerk.js rechnet
  einen Querschnitt mit Deviationsmoment in seinen **Hauptachsen** (dort
  steht die geprüfte Matrix samt Schubverformung schon) und dreht die
  Matrix um die Stabachse zurück; für I_yz = 0 ist es **derselbe Aufruf
  wie vorher**, bitgleich gemessen. Die Zahl schreibt `gurtQuerschnitt`
  aus `winkelwerteFuer()` — derselben Stelle, aus der `randspannung()` sie
  hat. **Das Vorzeichen ist gemessen:** I_yz < 0 (Schenkel nach +y/+z)
  gegen AxisVM, Maximum über alle vier Gurte zugleich:

  | J90/20 m, G, gegen AxisVM | ohne | I_yz < 0 | I_yz > 0 |
  |---|---|---|---|
  | Gurt M_y | 16.98 % | **4.82 %** | 35.17 % |
  | Gurt V_y | 13.63 % | **0.98 %** | 27.69 % |
  | Blech N | 11.12 % | **1.37 %** | 21.07 % |
  | Blech M_z | 18.23 % | **2.68 %** | 38.69 % |

  Reihe 2 × J90/20 m, G: Gurt V_y 14.85 → **3.22 %**, M_y 17.29 →
  **12.05 %**, Blech M_z 18.46 → **6.54 %**. In Feldmitte (`OGL_S43` bis
  `UGR_S43`) stimmen alle vier Gurte auf **1.7 %** — vorher fehlte die
  gekoppelte Komponente ganz (M_y AxisVM 0.1018, Löser −0.0007 kNm).
  Masten unverändert (0.00 / 0.12 %).
  **Am Urteil (Stabwerksweg):** Einzeljoch Gurt η 0.3902 → **0.4684**,
  Blech 0.3422 → 0.3633, Mast 0.7708 unverändert; Reihe Mast M2 1.3465 →
  **1.3493**, Gurt 0.4618 → 0.4775. Der Ersatzbalken ist nicht berührt.
  ⚠ **Die +20 % am Gurt sind zum grossen Teil die Vorzeichen-Hülle** in
  `randspannung()` (±M_y, ±M_z, gebaut für den Ersatzbalken, der Beträge
  führt). Gemessen mit vorzeichenrichtiger Auswertung: **0.3268** statt
  0.4684 (Reihe 0.3648 statt 0.4775); die Hülle trifft genau die
  ungünstige der beiden Kombinationen. Nicht umgestellt — Entscheid des
  Auftraggebers, siehe *Offene Punkte*. **Seither entschieden und
  umgesetzt: vorzeichenrichtig** (siehe den Eintrag darüber).
  ⚠ **Befund am Weg:** die Feldliste in `stabmodellJson` liess das neue
  Feld still fallen — dieselbe Falle wie am 20. September beim `versatz`.
  Abschnitt 129 e hat es gefunden.
  **Die Modelle in `com/` tragen kein I_yz** (älter); neu ausleiten hiesse,
  sie jünger zu machen als ihre Ergebnisse. `deviationNachtragen` trägt es
  in den beiden Vergleichswerkzeugen aus derselben Quelle nach und sagt es.
  **Was bleibt, liegt am Anschluss Joch–Mast und ändert sich mit I_yz
  nicht** — siehe *Laufende Arbeit* und *Offene Punkte*.
- **26. Sept., die Zwangsbedingung ist NICHT die Ursache — gemessen.**
  Weisung: «mit optimierung der Zwangsbedingung weitermachen». Vor dem
  Umbau der billige Test: den **Starrfaktor** hochdrehen. Ändert sich die
  Abweichung gegen AxisVM, ist es die Nachgiebigkeit der Ersatzstäbe, und
  eine echte Zwangsbedingung wäre ihr Grenzfall.

  | Abweichung gegen AxisVM | f = 1 | f = 10 | f = 30 | f = 100 |
  |---|---|---|---|---|
  | ständig, Gurt M_y | 16.98 % | 16.98 % | 16.98 % | 16.98 % |
  | ständig, Blech M_z | 18.23 % | 18.23 % | 18.23 % | 18.23 % |
  | ständig, Gurt V_y | 13.63 % | 13.63 % | 13.63 % | 13.63 % |

  **Nichts ändert sich.** Die Starrelemente sind längst gesättigt; eine
  Zwangsbedingung hätte denselben Wert. Der Umbau wäre Arbeit am falschen
  Ende — und bei f = 1000 bricht die Zerlegung ohnehin ab («nicht positiv
  definit»), was die Konditionierungsgrenze vom 20. September bestätigt.
  ⚠ **DIE RICHTIGE SPUR: das Deviationsmoment des Gurtwinkels.** Vier
  Gurte an derselben Station, ständig, Stabanfang:

  | `OGL_S40` | N | V_y | V_z | M_y | M_z |
  |---|---|---|---|---|---|
  | AxisVM | −30.947 | −0.0088 | 0.0925 | 0.0900 | **0.0653** |
  | Löser | −31.091 | −0.0041 | 0.0925 | 0.0907 | **−0.0019** |

  N und M_y stimmen auf 0.5–0.8 %, V_z exakt — **M_z gar nicht**. Eine
  Achsendrehung erklärt es nicht (um 90°, −90° und 180° geprobt: alle
  ≥ 72 % daneben). Die Erklärung ist das **Deviationsmoment I_yz**: die
  Datei führt je Querschnitt nur A, I_y, I_z und I_t, und `kLokal` koppelt
  y und z deshalb nicht — der Löser rechnet den L-Winkel, als wäre er
  doppelt symmetrisch. AxisVM bekommt ihn als `form: 'Angle'` mit
  `profil: 'L 90x90x9'` und kennt seine Hauptachsen.
  **Das Werkzeug weiss es an einer Stelle schon:** `randspannung()` in
  core.winkel.js rechnet die schiefe Biegung über I_yz (das Projekt leitet
  es dort aus I_1 und I_2 her). Die **Spannung** kennt das Deviations-
  moment also, die **Steifigkeit** nicht — und die Schnittgrössen kommen
  aus der Steifigkeit.
  **Nächster Schritt** (nicht mehr getan): I_yz in die Elementmatrix. Das
  berührt `kLokal` im Kern des Lösers und gehört gemessen, nicht geraten.
- **26. Sept., die Verformung wird nur noch an der Referenzhöhe
  nachgewiesen** (Prüfstand Abschnitt 113 c). Weisung: «lassen wir den
  nachweis für die mastspitze weg bei der verformung und nutzen nur die
  referenzhöhe (fahrdraht)».
  Vorausgegangen war die Frage: «was undurchsichtig ist, wie wir zu so
  hohen verformungen kommen. auf welcher höhe werden die 150mm berechnet?
  und mit welcher kombination?» **Die Antwort, gerechnet:** an der
  Mastspitze (8.50 m = Anschluss 7.50 + Überstand 1.00), in Gleisrichtung,
  unter «Wind +y» charakteristisch × ψ 0.70; Grenzwert L/200 = 43 mm,
  η 3.540. Aufgeschlüsselt am geteilten Masten einer Reihe 2 × J90/20 m:

  | Last | z | F_y | Beitrag |
  |---|---|---|---|
  | Mastwind q = 0.300 kN/m | — | — | 16.6 mm (11 %) |
  | Jochreaktion T2 | 7.50 m | 4.575 kN | 66.9 mm (44.5 %) |
  | Jochreaktion T1 (Nachbar) | 7.50 m | 4.575 kN | 66.9 mm (44.5 %) |
  | | | | **150.5 mm** |

  **89 % kommen aus den beiden Jochreaktionen** — der geteilte Mast trägt
  den Wind beider Joche, steht in Gleisrichtung als freier Kragarm und auf
  seiner **schwachen** Achse (I_q 3923 gegen I 11260 cm⁴; quer wäre er
  2.87-mal steifer, 52 statt 150 mm). Die Zahl war richtig gerechnet — was
  sie nicht war: ein brauchbarer Nachweis.
  **Jetzt:** ein Nachweis, an der Referenzhöhe (40 mm quer). Die
  Spitzenverschiebung steht als **Auskunft** im Kacheltitel, ohne η und
  ohne Anteil am Urteil — wer 150 mm nicht sieht, fragt auch nicht, woher
  sie kommen. Am Standarddokument fällt das Urteil damit von η 3.540 auf
  **0.178**, und die Gebrauchstauglichkeit ist erfüllt.
  **Die Kachel sagt jetzt, WO gemessen wird** («Fahrdraht 5.50 m · 40 mm
  zulässig · quer») — genau das fehlte.
  ⚠ **Zwei Befunde am Weg:**
  (1) **Ohne Referenzhöhe gibt es keinen Nachweis mehr** (ein Einzelmast
  ohne jedes Anbauteil). Still übergangen läse sich eine leere Spalte wie
  «erfüllt» — der Grund steht jetzt da.
  (2) **Eine Fahrdrahthöhe über dem Mastkopf fiel stumm durch.** Der
  Entscheid vom 24. September («über dem Mastkopf gilt die Eingabe nicht»)
  war richtig, wurde aber nicht gesagt: wer 14 m einträgt, bekam einen
  Nachweis auf 7.50 m ohne ein Wort. Seit der Nachweis an dieser EINEN
  Stelle hängt, verschiebt das das einzige η, das es gibt. Die Kachel
  schreibt jetzt «EINGABE VERWORFEN» an und nennt im Titel beide Höhen.
  ⚠ **In eigener Sache:** dieser Befund kam zustande, weil ich beim
  Browserlauf vom 26. September selbst `fdHoehe` im Arbeitsstand auf 14 m
  verstellt hatte. Ich habe ihn auf 5.50 zurückgesetzt — und das Blatt
  trägt seit dem Browserlauf ein **zweites Tragwerk T2**, das ich zum
  Prüfen der Reihenzeile angelegt habe.
- **26. Sept., AxisVM bestätigt die Jochreihe — Etappe 4 ist damit für den
  Masten erfüllt.** Die Reihe (2 × J90/20 m, 1650 Knoten, 1879 Stäbe) ist
  durch AxisVM gelaufen: bauen, linear statisch rechnen, auslesen, rund
  20 Minuten.
  **Die eine Zahl, um die es geht** — das Längsmoment am Fuss des
  **geteilten** Masten unter Wind in Gleisrichtung:

  | | AxisVM | Löser | Abw. |
  |---|---|---|---|
  | Einzeljoch | 43.0908 kNm | 43.0914 kNm | **0.00 %** |
  | Reihe 2 × J90/20 | **74.9685 kNm** | 75.4187 kNm | **0.60 %** |

  **Beide Programme sagen unabhängig dasselbe: der geteilte Mast trägt in
  der Reihe das 1.74-fache Längsmoment** (AxisVM 1.740, Löser 1.750). Die
  Messung vom 19. September hatte +76 % vorhergesagt, Etappe 3 hat es
  gerechnet, und AxisVM bestätigt es jetzt von aussen. Damit steht nicht
  nur der Löser, sondern auch die **Sofortmassnahme** vom 19. September.
  Weiter am Masten: Wind quer M_y 10.8375 kNm **0.00 %** an allen drei
  Masten, V_z 2.5500 kN **0.00 %**, ständig N 18.7005 kN (der geteilte Mast
  trägt zwei Joche) **0.00 %**, Wind längs V_y 1.52 %.
  ⚠ **Was bleibt — und es ist nicht der Mast:** die **Bleche und Gurte**
  laufen unter ständiger Last um 13–18 % auseinander (Gurt N 1.38 %, Gurt V
  14.9 %, Blech N 12.8 %), unter Wind längs die Blechmomente um 25 %. Die
  absoluten Werte sind klein (unter 0.35 kNm bzw. 0.35 kN), aber die
  Blechspannung ist der Grund, aus dem es den Löser gibt — hier ist noch
  nicht fertig gemessen. Verdacht weiterhin: die **Starrelemente** (AxisVM
  echte Starrkörper, Löser steife Stäbe mit `STARR_FAKTOR = 10`).
- **26. Sept., die Linkbedingung gilt GLOBAL — der Löser las sie lokal**
  (Prüfstand Abschnitt 111 c). **Der schwerste Befund dieser Sitzung**, und
  gefunden hat ihn erst AxisVM.
  In `core.stabwerk.js` stand `kFeder(c, db.L)`: die Federzahlen des
  Linkelements wurden als **lokale** Richtungen gelesen und danach mit dem
  Stab gedreht. Gemeint sind sie **global** — das steht an drei Stellen:
  `LINK_GRADE` schreibt sie aus («x Längs, in der Jochachse», «z
  Lotrecht — trägt Eigengewicht und Schnee ab»), die COM-Brücke setzt
  `SystemGLR = sysGlobal`, und der Entscheid vom 16. September («Obergurt
  x y, Untergurt y z») meint die Achsen des Tragwerks.
  **Was der Fehler anrichtete:** der Link am Jochanschluss ist **lotrecht**
  (0.05 m in z). Seine lokale x-Achse ist damit die globale z-Achse — x und
  z waren vertauscht. Der Obergurt, der in z frei sein soll, war in z
  **starr**; der Untergurt, der z tragen soll, war dort **frei**. Die halbe
  Jochlast (5.88 kN) lief am falschen Gurt in den Masten.

  | AxisVM gegen Löser, ständig | vorher | nachher |
  |---|---|---|
  | Mast N | 45.87 % | **0.00 %** |
  | Blech N | 189 % | 11.1 % |
  | Gurt V | 149 % | 13.6 % |
  | Wind längs: Mast T | 167 % | 5.6 % |
  | Wind längs: Gurt N | 12.4 % | 3.2 % |

  **Am Urteil ändert es wenig, und zwar zur günstigeren Seite:** Einzeljoch
  η 0.7756 → 0.7708, Reihe 1.3525 → 1.3465, das Joch selbst 0.493 → 0.462.
  Der Mastnachweis wird vom Biegemoment beherrscht, und die Normalkraft im
  Anschluss trägt wenig bei.
  ⚠ **Warum PyNite es nicht zeigte:** die PyNite-Ausleitung **teilt den
  Fehler** — `def_releases` wirkt in PyNites eigenem Stabsystem, also
  ebenfalls lokal. Zwei Wege mit demselben Fehler bestätigen einander;
  deshalb braucht es den dritten. **Das ist das Argument für Etappe 4 in
  einem Satz.** Die PyNite-Ausleitung steht damit weiter auf der lokalen
  Lesart — ein offener Punkt.
  ⚠ **Die geschlossene Lösung des Prüfstands war auf die falsche Lesart
  gebaut** (ihr Kommentar sagte es selbst: «der Link liegt längs y, seine
  lokale x-Achse ist global y») und fiel um genau den Faktor 4. Sie prüft
  jetzt **beide** Lesarten am selben Tragwerk, so dass sie verschiedene
  Antworten geben müssen — wer sie vertauscht, fällt auf.
  ⚠ Die Schranke des Kraftgleichgewichts ist von 1e-8 auf **5e-8**
  gelockert: die globale Federmatrix hat alle drei S(r)-Komponenten besetzt
  statt zweier, und bei einer Steifigkeitsspanne von 1e15 kostet jede Summe
  Stellen (5.6e-10 vorher, 1.19e-8 nachher). Ein fehlendes Auflager läge
  bei 1e-3, also fünf Grössenordnungen höher.
- **26. Sept., Etappe 4 begonnen: der Löser gegen AxisVM**
  (`vergleich_axisvm.mjs`). Weisung: «mit axis testen». AxisVM baut,
  rechnet linear statisch und liest aus (`AxisVM_aufbauen.cmd -Rechnen
  -Auslesen`); am J90/20 m mit Masten dauert der Durchgang **rund 11
  Minuten** (828 Knoten, 942 Stäbe, 8 Lastfälle).
  **Das Ergebnis, soweit es steht** (verglichen am Stabanfang, Rolle für
  Rolle, bezogen auf den grössten Wert der Grösse im Lastfall):

  | Lastfall | Grösse | max \|AxisVM\| | Abweichung |
  |---|---|---|---|
  | Wind in Jochachse | Mast M_y | 10.8375 kNm | **0.00 %** |
  | Wind in Jochachse | Mast V_z | 2.5500 kN | **0.00 %** |
  | Wind in Gleisrichtung | Mast M_z | 43.0909 kNm | **0.19 %** |
  | Wind in Gleisrichtung | Mast V_y | 6.8505 kN | 2.10 % |
  | Wind in Gleisrichtung | Gurt N | 33.3367 kN | 12.41 % |
  | Wind in Gleisrichtung | Blech V_y | 5.4649 kN | 32.35 % |
  | Ständig | Gurt N | 31.0046 kN | 0.71 % |
  | Ständig | Mast N | 12.8196 kN | 45.87 % |

  **Die massgebenden Grössen am Masten stimmen** — das Fussmoment unter
  Wind quer auf die Stelle, das Längsmoment auf 0.19 %. Die Summe des
  Eigengewichts stimmt ebenfalls (2 × 12.8196 = 25.639 kN, genau der Wert
  des Lösers).
  ⚠ **Was NICHT stimmt und eine eigene Untersuchung braucht:** unter
  **ständiger Last** läuft die Normalkraft im **oberen Mastabschnitt**
  auseinander (AxisVM −0.63, Löser −6.51 kN am `MAST_M2_S4`) — als liefe
  bei mir ein Teil der Jochlast über den **Obergurt**-Anschluss, der in z
  frei sein müsste. Dazu am Jochende die Blechquerkraft unter Wind längs
  (5.46 gegen 3.70 kN). Verdacht: die **Starrelemente** — AxisVM führt sie
  als echte Starrkörper, der Löser als steife Stäbe (`STARR_FAKTOR = 10`).
  Genau die Frage stand seit dem 20. September offen.
  **Auf den Knoten genau nachgemessen** (Normalkraft im Masten M2, ständig,
  von unten nach oben):

  | Abschnitt | z von → bis | AxisVM N | Löser N |
  |---|---|---|---|
  | S1 | −7.50 → −0.32 | −12.820 / −6.958 | −12.819 / −6.958 |
  | S2 | −0.32 → −0.22 | −1.077 / −1.000 | −6.958 / −6.881 |
  | S3 | −0.22 → +0.22 | −1.000 / −0.633 | −6.881 / −6.514 |
  | S4 | +0.22 → +0.32 | −0.633 / −0.555 | −6.514 / −6.436 |
  | S5 | +0.32 → +1.00 | −0.555 / 0.000 | −0.555 / 0.000 |

  **Der unterste und der oberste Abschnitt stimmen an beiden Enden** — nur
  die drei kurzen Anschlussabschnitte dazwischen laufen auseinander. Und
  der Grund steht in der Tabelle: **AxisVM leitet die halbe Jochlast
  (5.88 kN) am UNTERgurt-Anschnitt ein (z = −0.32), der Löser am
  OBERgurt-Anschnitt (z = +0.32)** — dort hängt `KONSOLE_M2_OG`, ein
  Starrelement von 0.12 m, und es trägt genau diese 5.881 kN; die untere
  Konsole trägt 0.000.
  **AxisVM liegt richtig:** vertikal hält allein der Untergurt (Entscheid
  vom 16. September, «Obergurt x y, Untergurt y z»), und der Link am
  Obergurt gibt z frei. Warum die Last am Löser trotzdem dort
  hineinkommt — an welchem Element sie am z-freien Link vorbeiläuft — ist
  die nächste Frage.
  **Was es nicht ändert:** die Auflagerkraft am Fuss (−12.8196 gegen
  −12.8194) und die Gurtkräfte (0.71 %). Das Fussmoment ist beim
  Mastnachweis massgebend, und dort stimmen beide — betroffen ist die
  Normalkraft in drei kurzen Abschnitten.
  ⚠ **Zwei Fehler am Messweg selbst, beide behoben:**
  (1) Mein Erzeuger schrieb das **Eigengewicht als Streckenlast** in die
  Datei, und AxisVM setzt es selbst noch einmal an — Faktor 2 im Lastfall
  G (N im Untergurt 62.35 statt 31.29 kN), alle übrigen Lastfälle
  makellos. Die Datei für den Vergleich geht jetzt **ohne**, der Löser
  steuert seines selbst bei.
  (2) **Die Brücke hielt den zweiten von elf Schnitten für das Stabende.**
  `for ($si = 1; $si -le 2; $si++)` — AxisVM teilt eine Linie in zehn
  Abschnitte, Schnitt 2 liegt bei **x = L/10**. Gemessen am `MAST_M1_S1`
  (L = 7.180 m): der zweite Schnitt stand bei x = 0.718, und dort ist
  M_y 9.08 statt 0.26 kNm. Die Ergebnisdatei behauptete damit ein
  Stabende, das keines war — still. Die Brücke **fragt die Zahl der
  Schnitte jetzt ab** (hochzählen, bis nichts mehr kommt) und liest 1
  und n. **Nachgemessen am 26. September:** die Brücke meldet «Schnitte je
  Stab: 11», der Vermerk «ohne Endschnitt» ist verschwunden, und die Zahl
  der Vergleichspunkte hat sich verdoppelt (688 statt 344 je Gurtgrösse).
  Die Abweichungen bleiben dabei, was sie waren — sie sind also echt und
  kein Ablesefehler. `vergleich_axisvm.mjs` vergleicht das Ende nur, wenn
  der letzte Schnitt auch dort liegt, und sagt sonst, wie viele es hat
  auslassen müssen.
  **Offen:** der Lauf mit der berichtigten Brücke, die **Jochreihe** (1879
  Stäbe) und die Frage nach den Starrelementen.
- **26. Sept., im Browser geprüft — und warum es dreimal nicht ging**
  (Weisung: «im browser prüfen»). Der Entwicklungsserver antwortete nicht,
  weil **fünf `serve.py` gleichzeitig auf Port 8731 lagen**: das Skript
  setzt `allow_reuse_address = True`, und das erlaubt unter Windows
  mehreren Prozessen, denselben Port zu binden. Die Verbindung landete
  zufällig bei einem toten und wurde ohne Antwort geschlossen — genau das
  Bild, das ich zweimal als «Sandbox verweigert» gedeutet habe. Nach dem
  Beenden aller fünf: **HTTP 200**.
  Nachgeprüft und bestätigt: die **Stabwerksleiste** (Knopf, «veraltet»
  ohne η-Zahl, nach dem Klick «gültig» mit η 1.504 und der Reihenzeile
  «Mast M2 1.504 · Mast M1 1.175 · Mast M3 0.766 · Joch T2 0.727 · Joch T1
  0.537», die überschrittenen in der Fehlfarbe), die **Gliederung** der
  Nachweiskarte (Joch · Mast · Fundament; die leere Ankergruppe fällt weg)
  und die **zwei Kästchen** der Nachweisart (beide angekreuzt, Akzentfarbe
  `#7c8de0`, das letzte gesperrt, GZG-Block verschwindet und kommt
  zurück). ⚠ Offen: `serve.py` sollte sich weigern zu starten, wenn der
  Port schon belegt ist.
- **26. Sept., die massgebende Kombination steht an jeder Nachweiszahl**
  (Prüfstand Abschnitt 128 a). Weisung: «was man noch aufführen müsste bei
  den nachweissen, ist die massgebende kombination.» Neue dritte Zeile in
  der Kachel (`.kz-f`), kursiv und durch eine Haarlinie abgesetzt; **kurz**
  angeschrieben («Wind +y» statt «Wind +y (Gleisrichtung) leitend» — die
  Kachel ist 88 px breit), der volle Name im Titel. Sie steht **nur bei
  der Hüllkurve**: beim Einzellastfall gilt sie allen Kacheln gemeinsam
  und steht schon in der Leiste darüber.
  Dafür merkt sich die Hüllkurve jetzt **je Station ihre Kombination**
  (`fall` in `core.vierendeel.js`) — der Mast trug sie längst, die
  Stationen nicht. Bei einer Hüllkurve ist das keine Kleinigkeit: die
  massgebende Kombination kann von Station zu Station wechseln, und dann
  ist sie je Bauteil eine andere. `app.js` reicht den Namensauflöser
  (`fallBez`) an beide Seitenleisten; `ui.js` kennt die Lastfallliste
  nicht und soll sie nicht kennen.
- **26. Sept., die Verformung ist gegen das Stabwerk geprüft** (Abschnitt
  128 b). Weisung: «zudem die verformung auch testen». Punkt für Punkt
  verglichen — dieselbe Höhe, dieselbe Achse, dieselbe Kombination:

  | Mastspitze längs | Kern | Stabwerk | Verh. |
  |---|---|---|---|
  | Einzeljoch, Randmast | 78.29 mm | 78.35 mm | 1.0008 |
  | Reihe, geteilter Mast | 139.94 mm | 139.72 mm | 0.9984 |
  | Reihe, Randmast | 78.29 mm | 78.51 mm | 1.0029 |

  Damit ist auch die **Sofortmassnahme vom 19. September bestätigt**: die
  Jochkräfte der Nachbarn, die sie dem geteilten Masten auflegt, geben in
  Gleisrichtung dasselbe wie das gekoppelte Modell.
  ⚠ **Quer zum Gleis laufen sie auseinander** (Jochauflager, nur Wind):
  Einzeljoch Kern 5.47 / Stabwerk 4.69 mm (Kern +17 %), **Reihe am
  geteilten Masten Kern 4.89 / Stabwerk 5.81 mm — Kern −16 %, also auf der
  unsicheren Seite**. Die Zahlen sind klein (gegen 40 mm zulässig,
  η ≈ 0.14) und ändern kein Urteil; festgehalten ist es trotzdem.
- **26. Sept., Frage des Auftraggebers: wirkt das Joch stabilisierend?**
  (Abschnitt 128 c). **Ja — aber fast nur quer zum Gleis.** Gemessen mit
  1 kN waagrecht am Mastkopf (Steifigkeit, nicht Last — sonst wäre nicht
  zu trennen, was Tragen und was Halten ist), J90/20 m, HEB 240:

  | | Jochachse | Gleisrichtung |
  |---|---|---|
  | Mast allein | 8.669 mm/kN | 24.860 mm/kN |
  | Einzeljoch, Randmast | 4.417 (**Faktor 1.96**) | 24.206 (**2.6 %**) |
  | Reihe, Randmast | 3.009 (**Faktor 2.88**) | 22.847 (8.1 %) |
  | Reihe, Mittelmast | 2.995 | 18.129 (**27 %**) |

  In der **Jochachse** nimmt das Joch den Nachbarmasten auf 96 % mit
  (4.417 gegen 4.252 mm), die Masten teilen sich die Last, und die
  Kopfverschiebung sinkt um die **Anzahl der Masten**. In **Gleisrichtung**
  folgt der Nachbar **nicht** (0.654 von 24.206 mm), und der Gewinn ist
  entsprechend klein. Der Grund steht im Anschluss: die Linkelemente geben
  die Momente um die lotrechte Achse frei (Entscheid vom 9. September,
  «Drehfedern am Linkelement ganz raus»), und das Joch ist in seiner
  eigenen waagrechten Ebene zu weich, um den Nachbarn mitzunehmen. Nur der
  **Mittelmast** einer Reihe gewinnt spürbar — an ihm hängen zwei Joche.
  **Und das ist die ungünstige Hälfte der Antwort:** der HEB 240 ist quer
  2.87-mal steifer als längs — das Joch hilft dort, wo der Mast ohnehin
  stark ist, und nicht in der Richtung, in der der Nachweis fällt.
- **25. Sept., die Nachweisart wird angekreuzt, nicht geschaltet**
  (Prüfstand Abschnitt 115 f). Weisung, mit dem Bild der Leiste: «hier
  anstatt buttons auswahlboxen machen, dann kann man beide auswählen oder
  einzeln. meist rechnet man mit den beiden.» Aus den drei Knöpfen
  «beide | Tragsicherheit | Gebrauchstauglichkeit» werden **zwei
  Kästchen**: «beide» stand als dritte Sorte neben den zwei Sachen, die es
  wirklich gibt. Als **Stellung** bleibt es (`trag` / `gzg` / `beide` —
  daran hängen Plotliste, Kacheln und Hauptzahl), als Knopf nicht;
  `kastenAn` und `artAusKasten` rechnen zwischen beidem um.
  **Das letzte angekreuzte Kästchen ist gesperrt:** beide aus hiesse
  «zeige nichts» — eine leere Auswertungsspalte, der man nicht ansieht, ob
  etwas fehlt oder ob man es weggeklickt hat. Gesperrt und nicht bloss
  zurückgesetzt; ein Kästchen, das beim Klick zurückspringt, sieht aus wie
  ein Fehler. Die Sperren-Kontrolle zählt jetzt **sechs** Stellen.
  ⚠ **Befund am Weg:** `.nw-wahl` trug **zwei** Widgets — diese Leiste
  *und* die Nachweisliste im Optionen-Reiter. Die zweite Regel gewann und
  legte der Optionenliste ein `display: flex` auf, obwohl ihr Erklärtext
  unter dem Kreuz stehen soll. Die Leiste heisst jetzt `.nw-arten`; eine
  Wache prüft, dass `.nw-wahl` nur noch ein Widget trägt.
- **25. Sept., die Nachweiskarte ist gegliedert** (Prüfstand Abschnitt 127).
  Weisung: «ordne die nachweis karte joch mast fundament in der sidebar».
  Auf Rückfrage, wohin Zuganker und Druckstütze gehören: **eine eigene
  Gruppe**. Vier Gruppen mit Überschrift — **Joch** (Ober-/Untergurt,
  Bindeblech; am Abfangjoch seine zwei Gurte), **Mast**, **Anker**,
  **Fundament** — in beiden Seitenleisten, auch am Einzelmasten (dort ohne
  Jochgruppe). Der Grund ist nicht Ordnungsliebe, sondern das
  **Lastniveau**: Gurt, Blech und Mast stehen auf Bemessungswerten, Anker
  und Fundament messen eine charakteristische Kraft gegen eine
  **zulässige** — vier η in einer Reihe sahen aus wie vier vergleichbare
  Zahlen. **Eine leere Gruppe steht nicht da** («nicht gerechnet» und
  «nichts gefunden» sähen sonst gleich aus; was fehlt, sagt «Nicht
  geführte Nachweise»), und bei einer einzigen Gruppe fällt die
  Überschrift weg. Neu `bauteilKachelnJe` und `nachweisGruppenHtml`;
  `bauteilKacheln` gibt weiter die flache Liste.
  ⚠ **Ein eigener Fehler, vom Prüfstand gefunden:** die Kontrolle «beide
  Seitenleisten benutzen die Gruppen» prüfte `zeichneEinzelmastUebersicht`
  — die Funktion heißt `zeichneEinzelmast`. Das leere Quellstück ließ die
  **Verneinung** («nicht mehr die flache Liste») grün durchgehen. Eine
  Wache prüft jetzt zuerst, dass es die Funktion überhaupt gibt.
- **25. Sept., Etappe 3: die Jochreihe ist EIN Stabwerk** (Prüfstand
  Abschnitt 126). Weisung vom 19. September: «die zusammenhängenden
  jochtragwerke sind als gesamtheitliches tragwerk zu betrachten», am 25.
  priorisiert: «Die Jochreihe als gekoppeltes Tragwerk, Die Mastverformung
  mit Rahmenwirkung. angehen und priorisieren.»
  Der Knopf rechnet nicht mehr das aktive Tragwerk, sondern das **ganze
  Blatt**: `rechneStabwerk` baut über `blattWennMehrere` alle sichtbaren
  Tragwerke in ein Modell — dieselbe Stelle, aus der auch AxisVM sein
  Blattmodell bekommt —, die geteilten Masten verschmolzen. **Die
  Rahmenwirkung ist damit keine Zutat, sondern die Folge:** Joch und Mast
  stehen im selben Gleichungssystem.
  **Gemessen** (J90/20 m, HEB 240, Standardbelegung), η des geteilten
  Masten M2:

  | | η M2 | Randmast | Joch |
  |---|---|---|---|
  | Einzeljoch | 0.7708 | 0.7708 | 0.390 |
  | Reihe 2 × J90/20 | **1.3465** (+75 %) | 0.774 | 0.462 |
  | Reihe 3 × J90/20 | **1.3878** | 0.740 | 0.520 |
  | J90/20 + J90/15 | **1.1535** | 0.793 | 0.432 |

  Die Messung vom 19. September hatte +76 % am Längsmoment vorhergesagt;
  das Stabwerk bestätigt sie. **Der Randmast bleibt, was er war** (0.7708 →
  0.7738) — änderte er sich auch, spräche das für einen Modellfehler statt
  für die Rahmenwirkung. Zwei Joche mit je 942 Stäben ergeben **1879**, nicht
  1884: die fünf Abschnitte des gemeinsamen Masten stehen einmal da.
  **Das Urteil der Reihe** (Entscheid 19. Sept., «Maximum mit Namen») steht
  in der Stabwerksleiste: je Joch und je Mast eine Marke mit seiner Zahl,
  absteigend, in der Ampelfarbe; die Kopfzahl nennt das **Bauteil**
  («Mast M2») statt des Stabes («MAST_M2_S1»). Der Mast trägt kein Präfix —
  er gehört der Reihe, nicht einem Joch.
  **Alles oder nichts, mit Namen:** steht ein Tragausleger in der Reihe,
  baute `stabmodell()` an seiner Stelle ein Tragjoch. In EINEM Stabwerk
  fiele das nicht mehr auf. `reiheOhneStabmodell` prüft deshalb **jedes**
  sichtbare Tragwerk und nennt es beim Namen («T3: Der Tragausleger wartet
  auf sein Kragarm-Modell …»).
  ⚠ **Zwei Befunde am Weg, beide auf der unsicheren Seite und beide älter
  als Etappe 3:**
  (1) **Der Leiterriss kam im Stabwerksweg nie an.** `GRUPPEN_JE_BEIWERT`
  bildete den Beiwert `HavarieY` auf den Lastfall `HavarieY` ab; der heisst
  seit dem 19. September `HavarieY|<Leiter>|p`, und der Sammelfall daneben
  ist leer. Gemessen am J90/20 m mit zwei Fahrleitungen, grösste Stabkraft
  je Havariefall: **vorher 39.79 | 39.79 | 39.79 | 39.79 | 39.79**, nachher
  **39.79 | 50.68 | 50.68 | 52.51 | 52.51**. Fünf Fälle, zifferngleich —
  dasselbe Muster wie bei den falschen Feldnamen am 25. September. Dieselbe
  Lücke traf die charakteristischen Einzelfälle (`l.nur`). **Die
  Kombinationen kommen jetzt aus der Datei** (`dat.kombinationen`,
  `anteileFuer`) — derselben Liste, die AxisVM rechnet; eine zweite
  Herleitung derselben Sache ist immer eine zweite Wahrheit.
  (2) **Auf einem Blatt fehlte der Havarie-Lastfall des Nachbarjochs.**
  Jedes Tragwerk schreibt seine Havarie-Lasten, die Lastfall-**Liste** und
  die Kombinationen kamen aber aus dem aktiven allein. Gemessen an zwei
  Jochen mit je einer reissenden Fahrleitung: `HavarieY|<L_links>|p/m`
  **benutzt, aber nicht erklärt** — und in keiner Kombination. Das galt
  auch für die **AxisVM-Datei**: eine Last, die auf einen Lastfall zeigt,
  den es nicht gibt. `stabmodellJson` nimmt jetzt `opt.eingaben` (alle
  Sätze des Blattes); `app.axisvm.js` reicht sie durch, und `durchlauf.mjs`
  hat dafür eine neue Wache bekommen — sie fehlte.
  ⚠ **Nicht im Browser geprüft**: der Entwicklungsserver ist in dieser
  Umgebung nicht erreichbar (Verbindung wird ohne Antwort geschlossen), und
  `file://` auf die gebündelte Datei bleibt verwehrt. Abschnitt 126 h prüft
  das erzeugte HTML (Reihenzeile da / nicht da, Bauteilname statt Stabname,
  je Bauteil eine Marke, Klassen im Stilblatt) — **ein Ersatz, kein
  Gleichwert.**
- **25. Sept., Etappe 2: Rechenverfahren wählbar, Knopf, Rückmeldung**
  (Prüfstand 124 und 125). Weisung: «ersatzbalken als optionales
  rechenverfahren in den optionen auswählbar machen, primär den löser
  nutzen, man könnte einen button zur auslösung der berechnung ansetzen der
  das finale modell berechnet und die werte setzt», dazu «mach eine prüfung
  von verschiedenen tragwerksarten und verschiedenen zusammensetzungen» und
  «mach den button klarer … gib ein visuelles feedback wenn sich das
  tragwerk angepasst hat und noch nicht berechnet wurde».
  **Neu:** `core.stabnachweis.js` (Spannungen je Stab, Hülle über die
  Kombinationen, `RECHENVERFAHREN`), `app.stabwerk.js` (der Knopf), die Wahl
  unter *Optionen → Nachweise* und die Stabwerksleiste in beiden
  Seitenleisten.
  ⚠ **Der Befund der Durchgangsprüfung — und er war schwerwiegend:**
  `stabmodell()` biegt für den Einzelmasten ab, **nicht** für Abfangjoch
  und Tragausleger. Beide bekamen das **Tragjoch-Modell mit 942 Stäben** und
  lieferten ein η (0.8065 / 0.8066) mit `MAST_B_S1` als massgebendem Stab —
  den es in keiner der beiden Arten gibt. Der Knopf hätte ein **fremdes
  Tragwerk** gerechnet. Jetzt gibt `rechneStabwerk` eine Auskunft zurück
  (`ohneStabmodell`), und die Leiste zeigt statt des Knopfes den Grund:
  lieber keine Zahl als eine falsche.
  **Die Rückmeldung:** vier Zustände — *fehlt* (Knopf in Akzentfarbe),
  *veraltet* (Warnfarbe, linker Balken, **die η-Zahl wird weggelassen** —
  eine blasse Zahl liest man trotzdem ab), *gültig* (ruhig, η gross),
  *ohneModell* (grau, ohne Knopf). Die Kennung des Eingabestands erkennt
  das Veralten; dieselbe Falle hatte beim PyNite-Vergleich ein 20-m-Joch
  gegen ein 8-m-Ergebnis gehalten.
  ⚠ **Zwei eigene Fehler:** (1) Das Prüfskript setzte `schnee` und
  `mastStegrichtung` — **beide Felder gibt es nicht**, die Fälle rechneten
  zifferngleich dasselbe wie der Grundfall, und das sah aus wie «geprüft».
  Richtig: `schneeAktiv`, `mastSteg` (Werte `jochachse`/`quer`). (2) Das CSS
  nutzte `var(--li)` und `var(--mu)` — die Variablen heissen `--ol` und
  `--dim`; die Leiste wäre ohne Rahmen dagestanden. Beides hat der
  Prüfstand nachträglich als Wache bekommen.
  ⚠ **Nicht im Browser geprüft**: der Entwicklungsserver antwortet in
  dieser Umgebung nicht, und die gebündelte Datei liess sich nicht öffnen.
  Abschnitt 125 prüft dafür das erzeugte HTML (Knopf da / nicht da, Zahl
  bei *veraltet* weg, Klassen im Stilblatt vorhanden) — **ein Ersatz, kein
  Gleichwert.** Der Blick in den Browser steht noch aus.
- **25. Sept., Kern, Löser und PyNite am selben Blech** (`vergleich_blech.mjs`).
  Weisung: «vorschlag umsetzen und falls notwendig axis beiziehen», nachdem
  der η-Vergleich die Bleche im Stabwerk 22 % höher gezeigt hatte. **Drei
  Rechnungen entscheiden, was zwei nicht können:**
  (1) **Die Schnittgrössen stimmen** — in der jeweils **tragenden** Ebene:
  ständig/vertikal Löser/PyNite **1.0012**, Kern/PyNite **1.0091**; Wind
  längs/horizontal **0.9994** und **0.9842**. Die grossen Verhältnisse (11,
  14) stehen immer in der *nicht* tragenden Ebene, wo die Momente nahe null
  sind. **Die Kalibrierung ist gültig, und der Löser auch.**
  (2) **Der Unterschied kommt aus der Spannung, nicht aus den Kräften.** Am
  massgebenden Blech trägt die Biegung um die **schwache** Achse (M_y)
  23.84 von 81.52 N/mm² bei — 29 %. Ein Balken kann das **strukturell nicht
  sehen**: er führt keine Information darüber, wie ein Blech aus seiner
  Ebene heraus gebogen wird.
  (3) **Und es ist echt.** PyNite zeigt denselben Anteil auf die Stelle
  genau: je Blech gerechnet Löser 5.4 % / PyNite 5.4 % (ständig), 3.1 % /
  3.1 % (Wind längs). ⚠ **Eine Zahl, die ich zuerst falsch rechnete:** der
  erste Anlauf hielt das grösste M_y über alle Bleche gegen das grösste M_z
  über alle Bleche — die stehen an verschiedenen Blechen. Daraus wurden
  23 %; je Blech sind es 5.4.
  (4) **Am Tragwerk mit Masten ist der Anteil viel grösser** (29 % gegen
  5.4 %). Das Kalibriermodell rechnet **ohne Masten** (`kalibrieren.mjs`
  Zeile 216) — und genau dort fehlt die Kopplung Joch–Mast, die dieses M_y
  erzeugt. Derselbe Befund wie beim Biegemoment: der Ersatzbalken sieht das
  Jochende **gelenkig** (`cA = cB = 0`), im Stabwerk ist es teilweise
  eingespannt.
  **AxisVM war dafür nicht nötig** — die Frage war, welcher der beiden Wege
  recht hat, und dafür genügt eine dritte unabhängige Rechnung. Für die
  **Freigabe** des Lösers bleibt AxisVM nötig; das ist Etappe 4.
- **25. Sept., der Löser rechnet die Schubverformung** (Prüfstand Abschnitt
  122). Weisung: «ja die schubweichheit ebenfalls rechnen». Nicht über ein
  abgemindertes I wie die PyNite-Ausleitung (die **muss** so, weil PyNite
  Euler-Bernoulli ist), sondern an der richtigen Stelle: in den vier
  Biegetermen der Elementmatrix, mit φ = 12EI/(GκAL²). Für φ = 0 ist das
  Zeichen für Zeichen die alte Matrix. **Nur echte Stäbe** — dieselbe Regel
  wie beim Eigengewicht: ein Starrelement hätte φ = 6428 und würde damit
  zum Gelenk.
  Gemessen gegen PyNite (J90/8 m): Wege G 4.96e-2 → **1.43e-2**,
  Verdrehungen G 2.48e-2 → **6.54e-3**, Verdrehungen Wind längs
  2.65e-3 → **5.89e-4**; Auflagerkräfte alle ≤ 5.5e-4.
  ⚠ **Zwei eigene Fehler dabei:** (1) Die sechs geschlossenen Lösungen des
  Abschnitts 111 sind **Euler-Bernoulli** und lagen dadurch 0.05–0.77 %
  daneben. Die Schranke zu lockern hätte die Kontrolle entwertet — sie
  fahren jetzt mit `schubweich: false` und messen damit genau die
  Biegematrix. (2) Ich hatte φ für den Masten auf 3e-5 **geschätzt**;
  gemessen sind es 7.7e-3, Faktor 250. Die Kommentarzahlen stehen jetzt
  alle gemessen da.
  **Dabei gelernt:** φ ist eine **Element**grösse, keine Bauteilgrösse — am
  Joch stehen Werte bis 43.9 an den kurzen Abschnitten. Das ist kein
  Fehler: die Schubverformung wächst linear mit der Länge und ist damit
  additiv. Abschnitt 122 misst es (derselbe Kragarm in 1, 2 und 10
  Stücken: dasselbe Ergebnis, obwohl φ je Element 100-fach wächst).
- **25. Sept., das Linkelement hatte seine Länge vergessen** (Prüfstand
  Abschnitt 121). Weisung: «der verdrehung an den blechknoten nachgehen».
  `kFeder` in core.stabwerk.js koppelte die sechs Freiheitsgrade
  **paarweise**, als lägen die beiden Knoten aufeinander — sie liegen
  0.05 m auseinander. Damit verletzte das Element die
  **Starrkörperkinematik**: eine Verdrehung des einen Knotens nahm den
  anderen nicht mit, obwohl beide in fünf Richtungen starr gekoppelt sind.
  Ein starrer Stiel mit einem Bolzen am Ende verhält sich nicht so. Die
  Feder misst jetzt die Relativverformung des **materiellen Punktes**
  (du = u_j − u_i + S(r)·fi_i; der Arm sitzt am i-Ende, das Gelenk am
  j-Ende — dieselbe Aufteilung, die die PyNite-Ausleitung mit
  `def_releases` trifft). Gemessen: die Verdrehung des Jochs
  1.19089e-2 → **9.64742e-3** gegen PyNites 9.65468e-3, also von 23 % auf
  **0.075 %**; die Auflagerkräfte auf 2e-5 bis 5e-4.
  **Der Weg dorthin war Ausschliessen:** die Federsteifigkeit (von 1e8 bis
  1e13 gesättigt), der Starrfaktor, die Torsionskonstanten (identisch) und
  jede einzelne Freigabe — keines erklärte es. Der Hinweis lag in den
  Zahlen: die Differenz war über das ganze Joch **konstant**, während Mast
  und Anschluss auf 0.5 % stimmten.
  ⚠ Der Prüfstand hatte die Kinematik des Links **nie** geprüft — das ist
  die Lücke, durch die es kam. Abschnitt 121 prüft sie jetzt gegen eine
  geschlossene Lösung (Kragarm + starrer Link, u_B = u_A + fi_A·L).
- **24. Sept., die gelenkigen Anschlüsse erreichen PyNite** (Prüfstand
  Abschnitt 120 e, siehe *Entschieden*). Weisung: «die links als
  stabendfreigaben in pynite nachrüsten». Damit ist der letzte grosse
  Unterschied zwischen den beiden Lösern weg: die **Auflagerkräfte**
  stimmen am J90/8 m auf 0.005–0.25 %, am J90/20 m auf 0.0007–0.4 %
  (vorher bis 53 % bzw. 88 %). Das Fussmoment unter Wind quer steht in
  beiden bei 10.84 kNm. Die alte Gegenprobe ist zur **Kontrollgruppe**
  geworden — sie zeigt jetzt, was ohne die Freigaben herauskäme, und ihr
  Kommentar sagt das auch; eine Beschriftung, die noch das Gegenteil
  behauptet hätte, wäre schlimmer als keine.
- **24. Sept., die Mastkopf-Abweichung ist geklärt** (Prüfstand Abschnitt
  120, Einzelheiten in *Laufende Arbeit*). Weisung: «ja der
  mastkopf-abweichung nachgehen». Faktor 7 zwischen Löser und PyNite — und
  **keiner von beiden rechnete falsch**: ein senkrechter Kragarm gegen
  w = FL³/(3EI) traf bei beiden die geschlossene Lösung auf 1.000. Drei
  Befunde in der PyNite-Ausleitung (Mast als Vollquadrat, fehlende
  Drehlage, Blechachsen über den Namen), alle behoben; danach stimmen beide
  in Gleisrichtung auf 1.1 % (Auflager 0.27 %). Was bleibt, ist ein
  **Modellunterschied**, kein Rechenfehler: PyNite bekommt die gelenkigen
  Linkelemente als starre Stäbe (siehe *Offene Punkte*, ⚠). Dazu zwei
  Befunde am Messwerkzeug selbst — es verglich ein 20-m-Joch gegen die
  Ergebnisse eines 8-m-Jochs («Faktor 39»), und es mass Verdrehungen an
  Verschiebungen.
- **24. Sept., die Abfangarten erreichen das Abfangjoch** (Prüfstand
  Abschnitt 118, siehe *Entschieden*). Damit ist der letzte ⚠-Punkt aus
  dem Umbau vom selben Tag erledigt. Ein Befund im Browser, der den Weg
  noch einmal aufhielt: die Havarie-Karte zeigte am Abfangjoch
  «durchgehend», während der Kern «einseitig» rechnete — die Vorgabe lag
  in zwei Dateien. Sie steht jetzt an einer Stelle
  (`abfangVorgabeFuer`), aus der Karte und Kern lesen. Eine Anzeige, die
  etwas anderes behauptet als die Rechnung, ist schlimmer als eine
  fehlende.
- **24. Sept., der Bericht ist durchgesehen und hat vier neue Diagramme**
  (Prüfstand Abschnitt 117, siehe *Entschieden*). Vier Befunde in der
  Durchsicht, zwei davon Textstellen, die seit heute falsch waren: der
  Bericht kannte den Fundamentnachweis noch nicht, den er selbst führt.
  Dabei berichtigt: die Verformungsbilder hiessen **«Ende A»**, während
  die Tabelle daneben **«Mast M1»** sagte — zwei Namen für dasselbe
  Bauteil auf derselben Seite.
- **24. Sept., das Mastfundament wird nachgewiesen** (Prüfstand Abschnitt 116,
  siehe *Entschieden*). Neue Tabelle im Masten-Sortiment, neues Modul
  `core.fundament.js`, neue Nachweisgruppe. Zwei Befunde am Weg, beide von
  den vorhandenen Wachen gefunden: die neue Tabelle brauchte ihren
  **Katalogeintrag** (`data.katalog.js`, sonst «Spalte ohne Katalogeintrag»),
  und **sechs Zeilen kamen über Excel verändert zurück** — sie trugen
  `steg: ""`, und eine leere Zelle liest sich als «nicht gesetzt». Leere
  Felder stehen jetzt gar nicht erst in der Datei.
  ⚠ Offen: die **Doppelmasten** (DGP24, DGP26) stehen in der Tabelle, aber
  das Sortiment der Anwendung führt sie nicht als Profil — ihre Fundamente
  sind nur von Hand wählbar.
- **24. Sept., die Messstelle lässt sich eintragen, und die Kopfzahl umfasst
  beide Arten** (Prüfstand Abschnitte 113 und 115, siehe *Entschieden*).
  Zwei Weisungen aus der Bedienung des Vortags: die Höhe der
  Fahrdrahtverschiebung war bis dahin nur zu erraten (sie stand nirgends
  und liess sich nicht setzen), und bei der Stellung «beide» bezifferte die
  Hauptkachel allein die Tragsicherheit — während darunter ein
  überschrittener Gebrauchswert stand.
- **24. Sept., die Gebrauchstauglichkeit ist eine eigene Gruppe** (Prüfstand
  Abschnitt 115, siehe *Entschieden*). Neue Plotgrösse **η w**, dazu die Wahl
  in der Ergebnisleiste. Der Weg führte über einen Umbau, der für sich schon
  richtig ist: die **Verformungskacheln standen mitten unter den η-Kacheln**
  der Tragsicherheit — anderes Lastniveau, anderes Mass, keine Ampel. Eine
  eigene Gruppe zu sein (`gzgKacheln`, `gzgBlockHtml`) ist die Voraussetzung,
  sie überhaupt weglassen zu können. Gemessen: J90/20 m η w 1.97 an beiden
  Masten, Gurte und Bleche führen den Wert nicht. Zwei Befunde aus der
  Bedienung gleich mit: die **Legende war eine Textwand** (gekürzt), und
  **achtmal dieselbe Zahl** stand am Masten — siehe *Entschieden*.
- **24. Sept., Diagramme liessen sich bei gewissen Tragwerksarten nicht gross machen** (Prüfstand Abschnitt 114). Gemeldet; am **Einzelmasten** tat ein Klick auf «Schnittgrössen über die Masthöhe» gar nichts. Der Grund stand eine Zeile weiter: `diagrammSatz` rief `diagramme(erg)` unbesehen — die Funktion des **Jochs**, die mit `erg.knoten.map(...)` beginnt. Ein Einzelmast hat keinen Ersatzbalken und keine Knoten; sie warf, bevor der Satz gebaut war, und damit fehlten auch die **Mastdiagramme**, die danach hineingekommen wären. Die Seitenleiste machte es richtig (sie übergibt dort `null`), die Bühne nicht. Geprüft wird jetzt die Voraussetzung, nicht die Tragwerksart. Die neue Kontrolle misst den Zusammenhang: jede Kennung, die die Seitenleiste als Knopf anbietet, muss im Satz der Bühne stehen — über alle vier Arten.
- **24. Sept., die Mastverformung wird nachgewiesen** (Prüfstand Abschnitt 113, siehe *Entschieden*). Damit ist ein Satz überholt, der seit je in `core.lasten.js` stand: «Der Nachweis der Gebrauchstauglichkeit selbst — Durchbiegung, Verdrehung, Querverschiebung der Mastköpfe — ist im Werkzeug NICHT geführt.» ⚠ **Befund dabei:** das Standardjoch der Anwendung (J90/20 m, HEB 240, 8.50 m) überschreitet den Wert *Mastspitze, nur Wind* deutlich — 85 mm gegen 43 mm zulässig (L/200), η 1.99. Gerechnet ist der Mast dabei in Gleisrichtung als **freier Kragarm**; die Rahmenwirkung der Jochreihe fehlt noch (siehe *Laufende Arbeit*). Ob der Ansatz so bleibt oder die Reihe mitwirken soll, ist ein Entscheid des Auftraggebers.
- **24. Sept., der Havariefall steht im Ankernachweis** (Prüfstand 112 e). Auf die Frage, wie sich Abfangung und Havarie auf Zuganker und Druckstützen auswirken — siehe *Entschieden*. Der Befund war eine Ungleichbehandlung: am Abfangjoch war der Fall immer dabei, am Tragjoch und am Einzelmasten fiel er aus dem Filter.
- **24. Sept., drei Abfangarten je Leiter** (Prüfstand Abschnitt 112, siehe *Entschieden*). Zwei Befunde am Weg: (1) das **Vorzeichen des Havarie-Längszugs** sass im Beiwert des Lastfalls und gilt damit allen Leitern gemeinsam — bei fester Zugrichtung machte das aus dem Wegfall eine zweite Zugkraft; es steht jetzt in den Kräften, im Kern wie in der Ausleitung. (2) Die **Maskensignatur** kannte die Abfangart nicht, und die Kartenzeile blieb stehen, wie sie war — dieselbe Falle wie am 1. September bei der Stegskizze.
- **24. Sept., Anbauteile tragen keine Ausnutzung** (siehe *Entschieden*). Damit ist der offene Punkt «Aufsatz über der Mastspitze nicht nachgewiesen» keiner mehr — er war von Anfang an eine falsche Erwartung meinerseits, nicht eine Lücke im Nachweis.
- **24. Sept., die Kette folgt der Eingabe, und der Anschluss bleibt am Masten.** Zwei Präzisierungen zu Weisungen vom 20. September, beide in *Entschieden*. Die zweite nimmt meine erste Lesart zurück: ich hatte den Höhenregler zwei Meter über die Spitze laufen lassen und damit den **Anschluss** in die Luft gestellt — gemeint war die z-Koordinate des Moduls. Dabei berichtigt: der Hinweis misst jetzt den **Lastpunkt** (hMast + z) statt des Anschlusses; mit dem Anschluss allein blieb er genau im gemeinten Fall stumm.
- **20. Sept., Darstellung im Modell** (siehe *Entschieden*): Gleis-Skizze für alle Tragwerksarten, Zahlen in Skalenfarbe und dünner gesät, keine Schattierung am unteren Rand, Skala ab η = 1.00 rot.
- **20. Sept., drei Weisungen: über die Mastspitze, Kette zuerst z, Auslegerwind auf den Masten.** Alle drei stehen in *Entschieden*. Dazu zwei Befunde, die dabei auffielen:
  (1) **Ein Teil auf der Kettenwurzel erbte den Anschlusskörper.** Der sitzt 0.1 m neben der Gurtebene (`LINK_LAENGE`), und der Kommentar sagte seit je «der Lastpunkt bleibt, wo er ist» — jedes Teil bekommt dafür seinen eigenen Knoten. Jedes ausser einem, das GENAU auf der Wurzel sitzt; das gab es bis zum neuen Windanteil ohne Träger nicht. Für die waagrechte Kraft ist das ein Hebelarm zur Jochachse.
  (2) **Der Einzelmast zählte Anbauknoten an der Kartengrösse.** `MAST_A_H` plus `mastKn.size - 1` — dieselbe brüchige Zählung, die im Jochmodell schon berichtigt worden war: sobald ein Kopfknoten dazukam, wurde aus `MAST_A_H1` still `MAST_A_H2`.
  **COM-Schnittstelle:** nicht betroffen, und das ist gemessen statt behauptet. Die Ausleitung schreibt den Aufsatz als gewöhnlichen starren Stab (`art: 'starr'`), und die Brücke liest die Art aus dem **Feld** (`StabArt` in AxisVM_aufbauen.ps1), nicht aus dem Namen — der Rückfall über den Querschnittsnamen «STARR» gilt nur alten Dateien. Prüfstand Abschnitt 93 hält es fest und schlägt an, sobald eine Stabart in der Datei steht, die die Brücke nicht kennt (sie würde daraus einen Stab mit dem Ersatzquerschnitt 500×500 mm samt Eigengewicht machen — der Fehler, der das Blattmodell einmal 33 t schwer machte).
- **20. Sept., der Stabwerkslöser ist im Projekt** (`js/core.stabwerk.js`, Prüfstand Abschnitt 111). Er hängt noch an keinem Nachweis. Räumliches Stabwerk, 6 Freiheitsgrade je Knoten, Euler-Bernoulli; er liest **die vorhandene AxisVM-Datei** (`stabmodellJson`), kein zweiter Modellbauer. Starrelemente als Ersatzsteifigkeit (`STARR_FAKTOR = 10`), Linkelemente als Punkt-zu-Punkt-Federn, RCM-Nummerierung, Bandcholesky mit **Jacobi-Skalierung** und **Nachiteration**. Am J90/20 m (4956 Freiheitsgrade, Bandbreite 95): Gleichgewicht in jedem Lastfall auf 5.6·10⁻⁷ %, Lösung unabhängig vom Starrfaktor (1 gegen 10: −6.85053 gegen −6.85053 kN). Der **Rest der Gleichung** wird relativ gemessen, nicht absolut: er sinkt nicht unter rund 1·10⁻⁴ der grössten Knotenkraft (gemessen mit 0 bis 12 Nachiterationen), weil schon das Aufsummieren von K·u bei einer Steifigkeitsspanne von 1e15 die letzten Stellen kostet. Eine absolute Schranke misst dort die Modellgrösse, nicht den Löser.
- **20. Sept., Abfangjoche: alt und neu auseinandergehalten.** Weisung: «nur abfangjoch mit 0.58 nehmen, so wie in den projektierungsdokumenten» und «in der bennenung sollte alt neu unterschieden werden». `abfangjoch-a200` stand **zweimal** in der Lasttabelle (0.66 und 0.58 kN/m) — beim Laden eines Datenpakets fiel es als Fehler auf, im laufenden Betrieb gewann still der erste Treffer. Die Typentabelle unterscheidet längst: neu A160…A360, alt nach dem Profil (UAP 130…250, IPE 270…). Die Lasttabelle tut es jetzt auch; die Gewichte ordnen eindeutig zu (0.66 kN/m = UAP 200 mit 66 kg/m). Sechs Einträge umbenannt, Sicherung `data/sicherung/fl_bauteile_vor_abfang_alt_2026-09-20.json`. Danach: `abfangjoch-a200` → 0.58 kN/m, `abfangjoch-uap200` → 0.66, keine doppelte Kennung mehr, Paket lädt ohne Befund.
- **20. Sept., Datenfenster weiter gebündelt, und der Stand geht nach
  `Versand/`.** Aus vier Knöpfen wurden zwei (siehe *Entschieden*), und
  über ihnen steht, wann man welchen nimmt. Neu `datenpaket.mjs`: es
  schreibt den Stand aus `data/` als Paket nach `Versand/` und sagt,
  wenn ein Sortiment fehlt. Geschrieben und gegengeprüft:
  `Vierendeel_Datenpaket_2026-09-20.json`, 344 kB, alle sechs
  Sortimente; nach dem Laden steht der Mastwind wieder (HEB 220 EK1
  0.28, HEM 240 EK1 längs 0.34 kN/m).
- **20. Sept., `APP_NAME` fehlte — zwei Knöpfe waren tot.** Gemeldet mit
  dem Bild des Optionen-Fensters: «Nichts zu sichern: APP_NAME is not
  defined». Der Knopf «Aktuelle Daten sichern» warf bei jedem Klick
  einen ReferenceError — ausgerechnet der Weg, mit dem man ein
  Datenpaket für eine Fassung ohne `data/` erzeugt. Derselbe Name trägt
  «Handbuch als Datei»; der war ebenso tot. Ursache: beim Herauslösen
  von `app.optionen.js` (A1, 19. Sept.) blieben `APP_NAME` und
  `VERSION` im Text stehen, ohne mitzuwandern — `node --check` sieht das
  nicht, der Bündler auch nicht. Danach **alle 64 Module abgesucht**
  (Werkzeug im Arbeitsordner: grossgeschriebene Namen, die ein Modul
  benutzt, aber weder importiert noch erklärt): 82 Treffer, alle
  nachgesehen, bis auf diesen einen Fehlalarme.
- **20. Sept., Daten: ein Fenster statt zwei** (Weisung, siehe
  *Entschieden*). Dazu der kurze Abgleichbericht.
- **20. Sept., GitHub Pages ohne Mastwind** — kein Fehler im Code: dort
  liegt kein `data/`, die Datenbasis kommt allein aus dem Datenpaket,
  und ein älteres Paket führt keine Masttypen. Der Ladedialog nennt
  jetzt, **was fehlt**, und die Fussleiste schreibt «OHNE
  Masten-Sortiment (kein Mastwind)». Gemessen: ein heute gesichertes
  Paket trägt alle sechs Teile (215 kB), und die Windwerte überstehen
  Hin- und Rückweg unverändert.
- **20. Sept., Durchlauf über den Einzelmasten** (Prüfstand Abschnitt
  110). Weisung: «kannst du zudem ein paar durchläufe bei der
  modellieren und auswertung des einzelmasten vornehmen, es scheint,
  dass wir sehr viele bugs haben.» 367 Aufbauten gefahren (Profil ×
  Länge × Einwirkungsklasse × Stegrichtung × Anbauteile), dazu Anker,
  Schnee, Havarie je Leiter, Kette, Fundamentkote, jeder Lastfall
  einzeln, Symmetrie ±y/±x, Bericht, PyNite und drei Einzelmasten auf
  einem Blatt. **Drei Befunde:**
  (1) **Ohne Masten-Sortiment erfand die Anwendung eine Windlast.**
  Gemeldet: «dieser mast heb 220 zeigt immernochnicht eine windlast in
  y.» Fehlt das Sortiment (altes Datenpaket, Bündel ohne Daten,
  GitHub Pages), fällt `mastprofile()` auf die Normprofile zurück —
  und die tragen keine Windzeile. Der Kern nahm dann den in der
  **Mastliste abgelegten** Wert: am HEB 220 standen 0.30 kN/m, der
  Tabellenwert eines HEB 240, in Gleisrichtung nichts, im Bild kein
  Pfeil, und **kein Wort darüber**. Jetzt bleibt beides leer
  (`fehlt`), und ein Hinweis nennt Ursache und Folge — am
  Einzelmasten ist der Wind in Gleisrichtung die massgebende
  Einwirkung, sein stilles Ausfallen liegt auf der unsicheren Seite.
  (2) **Auf einem Blatt ging die Trennung von G verloren.** Die
  COM-Ausleitung holt ihre Lasten mit `gTrennen` (G / G_Anbau /
  G_Ablenk); lag ein fertiges Blattmodell vor, nahm sie dessen
  `lasten` — ohne die Trennung. Das Gewicht eines Anbauteils stand
  dann in `G`, die Ablenkkraft ebenso. Die Bemessung ändert das nicht
  (alle drei mit demselben Beiwert), die charakteristischen
  Einzelfälle schon. `stabmodellBlatt` führt jetzt beide Formen
  (`lasten`, `lastenGetrennt`).
  (3) **Das Auflager nannte die falsche Lage.** Jedes Tragwerk baut
  bei x = 0, das Blatt schiebt es; das Feld `x` des Auflagers blieb
  stehen — in der Datei stand x = 0 für einen Masten bei x = 60.
  Gerechnet wird damit nichts, gelesen schon.
  Nach den drei Berichtigungen: **kein Befund** in 367 Aufbauten.
- **20. Sept., der Reiter Lasten zeigte Felder, die nichts tun**
  (Prüfstand Abschnitt 109). Gemeldet am Einzelmasten: «hier ist die
  windlast in y nicht aufgeführt … auch die angabe in der sidebar passt
  nicht ganz.» Drei Befunde an derselben Naht, alle nachgemessen:
  (1) Die Maske führte **nur eine** Mastwindlast, die in der Jochachse —
  der Kern rechnet seit dem 27. August mit beiden, und am Einzelmasten
  ist die Gleisrichtung die massgebende (dort hält kein Joch den Kopf).
  (2) Das Feld zeigte den in der **Mastliste abgelegten** Wert, der Kern
  nahm den **Tabellenwert**: an einem HEB 220 standen 0.37 kN/m in der
  Maske und 0.28 kN/m in der Rechnung. (3) «Werte bearbeiten» gab das
  Feld frei, aber `wMastAusTabelle` wird nirgends gesetzt — der
  eingetippte Wert wirkte nie. Nachgemessen, ob er wirken *soll*: nein.
  Es gibt **ein** flaches Feld, aber mehrere Masten; an einem Joch
  HEB 220 / HEM 240 bekämen beide 0.37 statt 0.28 und 0.31 kN/m.
  Beide Felder sind jetzt **angeschrieben und gesperrt** (`nurAnzeige`).
  Am Mast des Auftraggebers (HEM 240, EK1) steht in der Maske 0.31 /
  0.34 kN/m und im Bild w_M,y = 0.44 kN/m (= 1.30 · 0.34).
  **Dann die ganze Karte durchgegangen** («gehe diese karte lasten durch
  und hinterfrage deren richtigkeit auf die verschiedenen tragwerke»):
  je Feld und Tragwerksart gemessen, ob es den Nachweis, nur die
  Anzeige oder gar nichts ändert. Ergebnis in *Entschieden*; was dabei
  offen blieb, steht in *Offene Punkte*.
- **20. Sept., Einzelmast stand auf einem Gelenk** (Prüfstand Abschnitt
  108). Gemeldet mit dem Auflagerdialog aus AxisVM: «der masten soll
  eingespannt sein, dies wurde gebaut». Im aufgebauten Modell trugen die
  beiden **Einzelmastfüsse yy = 0 und zz = 0**, während jeder Jochmastfuss
  1e10 hatte. Grund: `stabmodellEinzelmast` schrieb nur
  `art: 'eingespannt'`, und `stuetzung` kennt die Angabe nicht — es baute
  den **Jochfall** (Auflager auf dem Mastkopf, Verdrehung um y als Feder
  aus c_φ, Torsion frei). Am Einzelmast gibt es keine Jochfeder, also
  c = 0: «frei». Jetzt schreibt er die Volleinspannung aus, und
  `stuetzung` versteht `art: 'eingespannt'`.
  **Dazu die Wachen** («checke die schnittstellen und checks für die com
  schnittstelle modellaufbau»): Prüfstand und `durchlauf.mjs` prüfen jetzt
  jeden Mastfuss auf Volleinspannung, jede Last auf einen vorhandenen
  Stab/Knoten, jeden Stab auf einen vorhandenen Querschnitt und jede
  Kombination auf vorhandene Lastfälle; die **Brücke** meldet einen
  Mastfuss ohne Einspannung laut (Abschnitt 7). Der Feldabgleich
  Datei ↔ Brücke ist vollständig (letzte Lücke war `versatz`).
  **Wind in y am Einzelmast** («keine last generiert»): in der Datei steht
  er, in x wie in y — im damals gebauten Modell hatten die beiden
  Einzelmasten denselben Namen `MAST_A` und verschmolzen, der zweite
  verlor damit seine Lasten (behoben, siehe Abschnitt 107).
- **20. Sept., Abfangjoch: Masten nach innen** (Prüfstand Abschnitt 107).
  Siehe *Entschieden*. Am Blatt des Auftraggebers gemessen: der geteilte
  Mast M3 stand im Modell bei x = 20.15 statt 20 (Mast und Anschluss
  auseinander), jetzt genau bei 20; der zweite Mast des A160/12.5 steht
  auf seiner Stützweite bei 32.00 statt 32.50 — **das Blatt verschiebt
  diesen Masten beim Öffnen um 50 cm**, weil ihn nur dieses Joch hält.
  Davor zwei Fehler behoben, beide älter: (1) **jeder Einzelmast hiess
  `MAST_A`** — auf einem Blatt verschmolzen zwei Einzelmasten zu einem,
  der dann in der Mitte stand (x = 7.14 statt 0 und 10); (2) das
  **Entflechten** schob ein Abfangjoch um 20.1 m, weil es zwei Tragwerke
  am selben Masten für eine Reihe hielt — jetzt nur noch, wenn das linke
  mit Ende B dort endet, wo das rechte mit Ende A beginnt.
- **20. Sept., Blatt mit Abfangjoch in AxisVM aufgebaut.** Dabei fiel auf:
  das Blattmodell schrieb das Feld **`versatz`** des Verbundquerschnitts
  nicht mit — die Brücke baute die beiden U der Gabel übereinander, und
  ihre Flächenprobe brach ab (0.002105 statt 0.004334 m², −51.4 %). Mit dem
  Feld stimmt es: 0.004211 m², −2.8 % wie beim Gurt (Ausrundungen, die das
  Polygon nicht führt). Das Modell steht: 1976 Knoten, 2283 Stäbe, 1143
  Starrkörper, 48 Verbindungselemente, 20 Kombinationen, nicht gerechnet.
  **Lehre:** zuerst in die ausgeleitete Datei sehen, dann in die Brücke —
  der erste Anlauf baute deren Polygonroutine um und traf das Falsche.
- **20. Sept., Havarie je Leiter auch im Abfangjoch** (Prüfstand Abschnitt
  106). Damit ist der offene Punkt vom 19. September erledigt.
  Geschrieben wird die **Änderung** gegenüber dem ständigen Leiterzug.
  Gemessen an A200/15 m mit N-FL (16.5 kN bei −20 °C) und R-FL (22.0 kN):
  ständig 36.9 kN, Fall «N-FL reisst» 22.0 kN, Fall «R-FL reisst»
  16.5 kN — **auf 0.0000 kN** dasselbe wie die Auflagerkräfte des
  Rechenkerns (A + B je Fall).
- **20. Sept., Abfangjoch im Blattmodell** (Prüfstand Abschnitt 105). Siehe
  *Entschieden*. Gemessen an J90/20 m + A200/15 m mit geteiltem Masten: der
  Träger im Blatt ist **Stab für Stab derselbe** wie die Einzelausleitung
  (247 Stäbe, 0 verschieden), nur um die Lage verschoben; der ständige
  Leiterzug steht mit 14.90 kN in G_Ablenk; der geteilte Mast trägt **einen**
  Zug aus 7 Abschnitten (8.50 m, keine deckungsgleichen Stäbe). Dabei fiel
  auf: die Anschlusshöhe heisst **`mastH`**, nicht `H` — `app.axisvm.js` las
  `satz.H`, das es nirgends gibt, und die Abfangjoch-Ausleitung baute
  deshalb **nie einen Masten**, auch wenn im Dialog «Mast im Modell» stand.
- **20. Sept., Blattmodell verlor Starrelemente und Stabachsen** (Prüfstand
  Abschnitt 104). Am aufgebauten AxisVM-Modell gesehen: «das jochmodell sieht
  nicht korrekt aus, hat es die querschnitte verworfen?» Verworfen war
  nichts — aber **sobald mehr als ein Tragwerk auf dem Blatt steht**, tragen
  Stab und Querschnitt das Präfix des Tragwerks («T1_STARR», «T1_OGL_S0»).
  `starrArt` verglich mit «STARR», `lcs` mit «GURT_OG» und «OG…», PyNite mit
  «BLECH…» — alle fielen durch (`gurtSteif` war am 19. Sept. schon so
  berichtigt worden, die übrigen nicht). Folge bei J90/20 m + Einzelmast:
  **476 Starrelemente wurden gewöhnliche Stäbe** mit dem Ersatzquerschnitt
  500×500 mm, samt **327 kN Eigengewicht** (≈ 33 t) im ständigen Lastfall,
  statt 470 Starrkörper; die Gurtwinkel und die Bleche standen **ungedreht**
  (2 statt 5 Achsrichtungen); in PyNite waren stehende und liegende Bleche
  nicht mehr zu unterscheiden. Erkannt wird jetzt am **Rohnamen**
  (`rohName`, `rohQs`, `istBlech`). Die neue Kontrolle vergleicht dasselbe
  Joch **allein und im Blatt**, Stab für Stab: 904 Stäbe, vorher 818
  verschieden, jetzt keiner.
- **20. Sept., Einzelmast: Ausleitung brach ab** (Prüfstand Abschnitt 103).
  Gemeldet: «Die com funktioniert nicht.» — mit einem **Einzelmasten als
  aktivem Tragwerk** meldete die Anwendung «COM-Ausleitung nicht möglich:
  Cannot read properties of undefined (reading 'aH')». Der Fehler lag nicht
  in der Brücke: `berechne` biegt für den Einzelmasten ganz vorn ab
  (`berechneEinzelmast`), **`modell` tat es nicht**. `app.axisvm.js` baut
  `deps` aus `erg.modell` — und das Einzelmast-Modell führt keine
  Gurtprofile; `exportiereJson` holte sich damit den Jochweg und starb in
  `hebelarme` (`pOG.aH`). Dieselbe Weiche steht jetzt in `modell`. Betroffen
  waren alle vier Wege (COM, SAF, DXF, PyNite), alle laufen wieder; am Joch
  und am Tragausleger ändert sich **keine Zahl** (830 Knoten / 943 Stäbe
  vorher wie nachher). Der Durchgang prüft neu den **Weg der Anwendung**
  (deps aus `erg.modell`, Ausleitung holt das Modell selbst) — der kurze Weg
  `AX.stabmodell(erg.modell)` war grün, während der Knopf abbrach.
- **20. Sept., Havariefall abschaltbar** (Prüfstand Abschnitt 102): ein
  Schalter unter *Lasten → Havarie* nimmt den Fall aus Nachweis **und**
  Ausleitung (siehe *Entschieden*). Gemessen an J90/20 m mit einer
  Fahrleitung: LF15/LF16 verschwinden aus der Lastfallliste, die Datei für
  AxisVM trägt keinen Lastfall `Havarie…` und keine aussergewöhnliche
  Kombination mehr; das Abfangjoch behält Wind und Schnee leitend
  (η 0.913 unverändert, der Fall «havarie» und die Läufe je Leiter fallen
  aus den Auflagerfällen).
- **19. Sept., Bedienung** (Prüfstand Abschnitt 94): Anzahl nie negativ,
  ganze Stück (`anzahlZulaessig`); Dialoge schliessen nur, wenn Drücken
  **und** Loslassen auf dem Schleier liegen (Text markieren und über den
  Rand ziehen schloss sie); **Raster wuchs** beim Setzen neben Knoten
  (vom letzten, schon geweiteten Wert aus geweitet — 40 Lagen: 0.40 →
  2.52 m); jetzt vom Normalmass aus (`rasterNorm`, `rasterGesetzt`);
  **Kette:** ein Leiter aussen und höher als die Traverse verlängerte den
  Jochaufsatz bis auf Leiterhöhe — an einem Aufbau (Traverse, Ausleger)
  läuft der Weg jetzt waagrecht, dann senkrecht; Stütze/NT-Ausleger
  unverändert. Bauteile duplizieren: Knopf in der Karte, Rechtsklick auf
  die Zeile, Kontextmenü (`anbauteilDuplizieren`). 3D: kein «A»/«B» mehr
  unter den Mastfüssen (die Masten heissen M1, M2 …), Achsen passiver
  Tragwerke grau wie ihre Körper. **Einzelmast, Eingabewege** (Abschnitt
  99): ein Klick im 3D auf die obersten 0.8 m eines Einzelmasts setzte ein
  **Jochteil** (still nicht gerechnet) — `stelleAus` kennt am Einzelmast
  kein Joch mehr; der Höhenregler reichte nur bis zur ausgeblendeten
  Anschlusshöhe (7.50 statt 8.50 m, `mastKopfHoehe`); Duplizieren am Kopf
  setzt darunter; Masten beim Namen (M1) in Karte, Setzdialog, 3D-Titel;
  Träger am Einzelmast ohne Rat «ans Joch». Danach (Abschnitt 95): Kette fährt
  **erst y, dann x** ab (kein Glied waagrecht schräg), schräge Glieder als
  `schraegerStab` statt Platte; neue eigene Vorlage erscheint sofort
  (Maskensignatur); Knopf «Alle entfernen» in der Anbauteilliste (Rückfrage,
  «Nur die am Joch»); Ebenen am Einzelmast: keine Systemachse ohne Joch,
  Mast-Schwerachse folgt auch «Schwerachsen», Schalter ohne Inhalt
  ausgegraut (`ebenenVorhanden`). **Tragwerksliste neu** (Abschnitt 96):
  Lageband oben, darunter Baum (Masten unter ihrem Tragwerk, geteilter
  einmal mit «auch A1»); Namen nach dem Typ T/A/M/MT statt P1…
- **19. Sept.** COM-Schnittstelle geprüft («checke die com schnittstelle»,
  ohne AxisVM zu starten; Prüfstand Abschnitt 93). Vier Befunde, alle auf
  der unsicheren Seite: (1) die App leitete `app.werte` roh aus statt
  `rechensatz` — am Einzelmast fehlten Anker und Teile am Masten (2 Knoten
  statt 83), am Joch der Seilanker; (2) die Einzelmast-Ausleitung baute
  Anker und Teile am Masten gar nicht (jetzt `ankerBauen`,
  `mastTeileAnhaengen`, gemeinsam mit dem Joch); (3) Jochreihe ohne
  Streckenlasten (Wind/Schnee auf dem Joch, Mastwind) und steife Gurt-
  abschnitte mit Querschnitt ohne Präfix; (4) der geteilte Mast stand
  doppelt im Modell — jetzt einmal, bei verschiedenen Anschlusshöhen aus
  allen Teilpunkten neu aufgereiht (`mastNeuAufreihen`). Menüband: die
  vier Ausgabe-Knöpfe sind ein Knopf «Export» mit Aufklappmenü. Davor: Verbesse-
  rungsliste abgeschlossen (U4 Erklärtexte, A3 Testdaten und CI, A1 Umbau).
- **18. Sept.** Stabilität: Anbauteile am Masten auf ihrer eigenen Höhe, bei
  allen Tragwerken. Einzelmast ohne Anschlusshöhe, die Länge regiert.
  Standortauswahl nur für vorhandene Bauteile. Hintergrundzeichnung:
  Bezugspunkte aus der Szene, Einmessen über Mastlänge oder freies Mass,
  Ausrichten an Punkt. UEBERGABE.md in diese Datei überführt.
  Fussleiste sagt dasselbe wie die Hauptkachel; P9 nur gegen liegende
  Bleche, neu P10 (Mast zwischen den Gurten) — jedes neue Joch J70–J130
  startete vorher mit zwei verletzten Prüfungen. **J60-Bleche erfasst** aus
  der Konstruktionszeichnung (Index c): 5 Blechpositionen, 7 Ausführungen
  je Längenbereich; alle 17 Längen gehen gegen die Stückliste auf. η steigt
  dadurch um 7–8 % (J60/16 m: 0.503 → 0.539), weil der Ersatz mit 100×10
  statt 6 mm dicken, in der Mitte 80 mm breiten Blechen rechnete.
  **Nachweisbericht, erste Fassung** (Tragjoch mit Masten): Knopf im
  Menüband, Dialog für Umfang und Bilder, Bericht als Ebene mit
  eingebettetem Dokument, gedruckt als PDF. Der Hinweis «Mast ist Auflager,
  nicht Bauteil» war seit dem 28. Aug. falsch und ist berichtigt.
  **Einzelmast:** Seitenleiste wie beim Joch — sie zeigte einen Lastfall
  statt der Bemessung (Seilanker Gegenseite: 0.096/0.191 statt 0.272);
  Phantom-Mast B aus dem Urteil entfernt; Joch-Nachweise nicht mehr «nicht
  geführt»; Bericht für den Einzelmast; Bilder hell. Charakteristische
  Fälle Tragwerk/Ablenkung an Joch und Einzelmast entdoppelt. Joch
  entfernen → zwei Einzelmasten; Artwechsel löscht die Jochteile; keine
  Last unter der Fundamentkote. Tragausleger untersucht: unsichere Seite
  (siehe Offene Punkte).
  3D-Einzelmast: ein grauer zweiter Mast B lag über dem gefärbten — weg,
  der Mast zeigt seine Ausnutzung wie am Joch. Fundamentklotz **unter** dem
  Mastfuss (vorher deckte er das unterste Stück zu); Lagerangabe nur noch
  c_φ · κ unter dem Klotz, ohne Profilzeile, nicht am Einzelmast, nicht am
  passiven Tragwerk; kein «L = 0.00 m» am Einzelmast. Neuer Einzelmast
  (Vorlage und «+ Tragwerk») ohne Jochteile, mit Traverse (L − 0.5) und
  Rückleiter (L − 2.0) am Masten.
  **Befunde aus der Bedienung:** (1) Jede Druckstütze unter Druck brach
  die Seitenleiste ab («k.push is not a function») — selbst eingeschleppt
  beim Herauslösen von `bauteilKacheln` (c8011d7); das war «Stütze am
  Einzelmast nicht möglich» und sehr wahrscheinlich auch «bei mehreren
  Masten crasht der Nachweis». (2) **Teile am Masten hingen an der
  Laufnummer** und wanderten beim Hinzufügen/Entfernen von Tragwerken an
  einen fremden Masten (Last beim falschen Tragwerk) — jetzt über die Stelle
  (`mastIdUmsetzung`, `mastenFest`), alte Stände werden beim Laden neu
  projiziert. (3) **w_Mast klebte** an der Windklasse, unter der die
  Mastliste zuletzt geschrieben wurde (EK1 → EK3 blieb 0.30 kN/m, und mit
  ihm die Kopfverschiebung) — gespeichert gilt er nur noch bei «Werte
  bearbeiten». Dazu: kein doppeltes x-Feld am Einzelmast, Stegskizze mit
  Gleis statt Joch, «Mast plastisch» unter den Nachweiskacheln, Knick-
  Kontrollrechnung der Stütze im Nachweisbericht. Ständig + Wind je
  Richtung statt diagonal, auch am Abfangjoch; Lastgenerator nur mit
  Träger; Tragausleger «NICHT nachgewiesen».
- **17. Sept.** Wind ±x/±y überall; Hüllkurve nimmt den Masten aus jedem
  Fall; Einzelmast über alle Kombinationen mit Ankernachweis; Gesamturteil
  mit Bauteil; Havariefall Tragjoch/Mast; örtlicher Anteil abgemindert;
  Projektablage nach BlockCalc; Abfang-Ausleitung ohne freie Knoten, ULS.
- **16. Sept.** Lagerungsstudie in AxisVM → K_XX gehalten; auskragendes Joch
  (Hebelgesetz um die Mastachsen, Anschlussmoment M − M_k); Seilanker nur
  Zug; Menüband in Gruppen, App-Name «Vierendeel»; Daten in Tabellenform.

**Auftrag für die nächste Sitzung (26. Sept., in dieser Reihenfolge entschieden):**

1. ~~**I_yz in die Elementmatrix**~~ — **erledigt am 26. September**
   (siehe *Letzte Schritte*), samt der vorzeichenrichtigen Gurtspannung.
   **Als Nächstes (entschieden): der Anschluss Joch–Mast** gegen AxisVM
   (siehe *Laufende Arbeit*), danach Punkt 2.
2. **Tragausleger:** eigener Kragarm-Kern für die Anzeige, Stabwerk für das
   Urteil (zwei UPE 140, Einspannung am Masten). Danach fällt die Warnung
   «Tragausleger NICHT nachgewiesen».
3. **Nachweise:** die Abbildungen und Schnittgrössen des Lösers übernehmen,
   Bericht und Excel auf den Stabwerksweg, Bericht auch für Tragausleger und
   Abfangjoch. ⚠ Das **Knicken bleibt beim Ersatzbalken** — es ist der einzige
   Nachweis, den der Löser nicht führt.

**Laufende Arbeit (28. Sept.): Tragausleger — Etappe 2 erledigt.**
Das Stabmodell (`export.axisvm.tragausleger.js`) hängt im Stabwerk und ist
gemessen (siehe *Letzte Schritte*, Prüfstand 136, 137): zwei UPE 140,
Bleche oben/unten, Anschluss nach Entscheid «A», Aufhängung als
Pendelstab, Eigengewicht aus der Liste; UPE, Bleche und Aufhängung werden
nachgewiesen (4a). **Nächste Schritte (Reihenfolge entschieden: Nachweise
vor dem Kern):** ~~(4b) Knicken und Fundament aus dem Stabwerk~~,
~~(4c) Anzeige und Sperre~~ (beide erledigt am 28. September). **Offen:**
(3c) das 3D-Bild (zeigt das Ersatzjoch) - ~~die Maske (3a)~~ und ~~der
Kragarm-Kern (3b)~~ erledigt am 28. September; der Ausleger in
einer Reihe; Havarie je Leiter; Wind auf den Ausleger selbst. Offen dazu: Havarie je Leiter im Ausleger,
Feld und Stelle der Längsverankerung in der Maske, die Rückstellkraft
der Leiter (⚠ festzulegen).

**Laufende Arbeit (26. Sept.): Etappe 4 — der Löser gegen AxisVM.**
Schritt (6) des Bauplans der Jochreihe. **Für den Masten ist die Freigabe
erfüllt.** Für Gurte und Bleche ist seit dem Einbau von I_yz (26. Sept.)
die **ständige Last im Feld** in Ordnung; was bleibt, sitzt am **Anschluss
Joch–Mast**.

| Gegen AxisVM gemessen (J90/20 m) | vor I_yz | mit I_yz |
|---|---|---|
| Mast, Fussmoment Wind quer (M_y 10.8375 kNm) | 0.00 % | **0.00 %** |
| Mast, Längsmoment Einzeljoch (43.0908 kNm) | 0.13 % | **0.12 %** |
| Mast, Längsmoment Reihe, geteilter Mast (74.9685 kNm) | 0.60 % | **0.82 %** |
| Mast, ständig N | 0.00 % | **0.00 %** |
| Gurt N / V_y / M_y ständig | 0.78 / 13.6 / 17.0 % | **0.55 / 0.98 / 4.82 %** |
| Blech N / M_z ständig | 11.1 / 18.2 % | **1.37 / 2.68 %** |
| **Blech M_z / V_y Wind längs** | 25.5 / 19.8 % | **28.1 / 19.6 %** |
| **Gurt M_y Wind längs** | 47.1 % | **54.9 %** |
| **Mast M_y ständig** (max 1.656 kNm) | 81.0 % | **81.1 %** |

**Die Zwangsbedingung war es nicht** (Starrfaktor 1–100 ändert keine
Stelle, Teil A von `vergleich_starrheit.mjs`), **das Deviationsmoment
schon** — eingebaut, siehe *Letzte Schritte*.

**Was bleibt: der Anschluss Joch–Mast.** Beide Reste sind vor und nach
I_yz gleich, sie haben also eine andere Ursache:
(1) **Wind längs, Jochende:** AxisVM leitet über den Überstand zwischen
Endblech (x = 0) und Linkanschluss (x = 0.12) ein Kräftepaar — `OGL_S0`
N −1.08 kN, Endblech `BV_L_0_2` V_y 1.08 kN, M_z 0.23 kNm —, der Löser
praktisch nichts (0.008 kN). Das Endblech hängt nur über Starrelemente an
den Gurtknoten; wie AxisVM dort eine Kraft durchleitet, ist offen.
(2) **Ständig, Mastfuss M_y:** AxisVM −1.656, Löser −0.313 kNm — das Joch
spannt den Masten in seiner Ebene bei AxisVM stärker ein.
**Ausgeschlossen, gemessen:** die **Gelenklage im Linkelement** (Arm am
i-Ende wie heute, am j-Ende, halbiert, ohne Länge): i/j/Mitte liegen für
Wind längs Blech M_z bei 28.1 / 25.2 / 26.7 %, Mast M_y ständig bei 81 /
72 / 76 % — keine erklärt es, «ohne Länge» ist klar schlechter.
**Am 26. September weiter eingegrenzt** (`vergleich_anschluss.mjs`, Sprung
der Mastschnittgrössen an den Konsolenknoten, AxisVM / Löser):

| J90/20 m, Mast M1 | Konsole UG | Konsole OG |
|---|---|---|
| G | N 5.8809 / 5.8810, M_y 0.7057 / 0.7057 | **V_z −0.1155 / +0.0508** |
| WindY | V_y 2.151 / 2.034, M_z 0.223 / 0.172 | V_y 2.149 / 2.267, M_z −0.222 / −0.247 |

Unter G ist der **ganze** Unterschied die Kraft in Jochachse am oberen Link,
mit umgekehrtem Vorzeichen: 0.1155 · 7.82 + 0.706 + 0.047 = 1.656 kNm am
Fuss, beim Löser −0.0508 · 7.82 + 0.706 + 0.005 = 0.313. Sie ist statisch
unbestimmt — die Differenz zweier Wege von rund 1 mm (Obergurt des
durchhängenden Jochs nach innen, Mastkopf unter der ausmittigen Jochlast
ebenfalls nach innen). Unter WindY verteilen sich der Wind bei AxisVM
**ungleich** auf die beiden liegenden Bindeblechebenen (oben V 4.96, unten
5.46 kN; Löser 5.15 / 5.11), obwohl er an Ober- und Untergurt gleich
angreift (je 0.215 kN/m) — das Joch verdrillt sich bei AxisVM, und die
Endschleife Stummel–Endblech trägt das Wölbmuster (±1.08 kN).
**Ausgeschlossen, gemessen** — keine dieser Grössen erklärt es, die
Datei ist jeweils die beste oder nahe dran:
I_yz; Schubverformung; Steifigkeit der Gurtabschnitte (Faktor 1 / 10 /
1000); Starrfaktor 1–100; Gelenklage im Link (i / j / Mitte / ohne
Länge); Drehachsen des Links lokal statt global (G Gurt M_y 4.8 → 27 %,
also **widerlegt**); Drehlagerung der Links anders (yy gehalten G Gurt
M_y 302 %, zz gehalten 28 %, xx frei 6.5 %); x am Untergurt bzw. z am
Obergurt zusätzlich gehalten (Mast M_y 788 % bzw. Blech N 94 %).
**Die Starrkörper baut die Brücke je Stummel einzeln** (wie der Löser).
⚠ **Die Linkfreiheitsgrade liessen sich aus AxisVM nicht zurücklesen**
(Bericht 7b: `GetRec` gibt den Satz leer zurück) — belegt ist ihre
Wirkung bei den Verschiebungen (Mast N 0.00 %), bei den Drehungen nur
indirekt (jede andere Lagerung passt schlechter).
**GEKLÄRT am 26. September mit den Wegen:** die Linkverbindung lag im
AxisVM-Modell 0.45 m ausserhalb des Links (siehe *Letzte Schritte*). Mit
dieser Lage im Löser nachgerechnet stimmen alle Grössen auf 0.0–1.5 %.
**Offen:** ein Lauf mit der berichtigten Brücke — zusammen mit dem
Torsionsfall (siehe *Entschieden*), dessen Grundfälle G / Wind x / Wind y
zugleich die Gegenprobe der Berichtigung sind.
**Die Modelldatei steht** (`node modell_torsion.mjs` →
`com/AxisVM_Torsion_J90_20m.json`, 26. Sept., dem Auftraggeber gezeigt):
J90/20 m mit Masten M1/M2 auf dem Weg des Stabwerksknopfs, 968 Knoten,
1110 Stäbe, 40 Links (8 am Jochanschluss, 32 Übergänge zu den Anbauteilen),
22 Lastfälle. Vier Teile: **HS_Ende / HS_Mitte** (`hs-nur` bei x = 1.20 /
10.14, dazu 1.0 kN in y am Fuss, z = −2.925; M_x um die Jochachse
3.791 kNm) und **NT_Ende / NT_Mitte** (`hs-nt-ausleger` bei x = 2.00 /
11.00, R-FL mit Umlenkung 1.833 kN in x aus R = 600 m, c = 50 m). Die
Lasten jedes Teils stehen in eigenen Fällen `<Gruppe>|<Teil>`; G, Wind x
und Wind y tragen dieselben Lasten wie das Einzeljoch-Modell. Das
Grundmodell ist Knoten für Knoten dasselbe; nur die Gurte sind an den
Klemmpunkten feiner geteilt (86 → 100 Abschnitte je Gurt). Der Löser
rechnet die Datei im Gleichgewicht (Torsion 3.791 kNm kommt an den Füssen
an). Am Weg zwei eigene Fehler, beide vor dem Zeigen behoben: der erste
Anlauf ging nicht über `mastNamen` (Masten hiessen A/B, 324 Stäbe und
32 Knoten anders), und Hängestütze und NT-Ausleger hingen an denselben
Klemmen. **Gerechnet wird nur auf Anweisung** (rund 15–20 Minuten bei
22 Lastfällen).
**Gewicht:** unter G am Mastfuss 1.66 gegen 0.31 kNm, bei Fussmomenten aus
Wind von 10.8 (quer) bzw. 43.1 kNm (längs); unter WindY am Gurt des
Jochendes bis 0.38 kNm Unterschied bei einem grössten Gurtmoment von
0.69 kNm.

⚠ **PyNite kennt kein I_yz:** `vergleich_stabwerk.mjs` und
`kalibrieren.mjs` rechnen den Winkel weiter doppelt symmetrisch und
werden am Gurt vom Löser abweichen, ohne dass einer falsch wäre —
dieselbe Lage wie bei der Schubverformung. Der Prüfstand blieb grün (er
hält keine PyNite-Zahl am Gurt fest).

**Die Modelle liegen bereit** (in `com/`, gitignoriert — bei einem
Rechnerwechsel neu rechnen lassen): `AxisVM_Einzel_J90_20m.json` samt
`_ergebnisse.json` (828 Knoten, rund 11 Minuten je Lauf) und
`AxisVM_Reihe_2xJ90_20m.json` (1650 Knoten, 1879 Stäbe, rund 20 Minuten).
Gebaut und gerechnet wird mit
`com\AxisVM_aufbauen.cmd -Json <datei> -Rechnen -Auslesen -Stapel`;
**AxisVM rechnet nur auf Anweisung des Auftraggebers.**

⚠ **Der Arbeitsstand im Browser ist nicht unberührt:** er trägt seit dem
Prüflauf vom 26. September ein **zweites Tragwerk T2**, das ich zum Prüfen
der Reihenzeile angelegt habe, und `fdHoehe` hatte ich dabei auf 14 m
verstellt (auf 5.50 zurückgesetzt). Wer das Standarddokument als Maßstab
nimmt, soll wissen, dass es nicht das ursprüngliche ist.

**Laufende Arbeit (20. Sept.): der Stabwerkslöser, Schritt 2 des Bauplans.**
Er steht seit dem 20. September **im Projekt** (`js/core.stabwerk.js`,
Prüfstand Abschnitt 111). ⚠ **ÜBERHOLT am 25. September:** er hängt seit
Etappe 2 am Nachweis (wählbar unter *Optionen → Nachweise*, Knopf in der
Stabwerksleiste) und rechnet seit Etappe 3 die ganze Reihe. Was der Block
weiter wert ist, sind die **Messungen** — und die Lehren daraus. Was er
kann und was gemessen ist:

- Er frisst **die vorhandene AxisVM-Datei** (`stabmodellJson`) — kein zweiter
  Modellbauer. Räumliches Stabwerk, 6 Freiheitsgrade je Knoten,
  Euler-Bernoulli, Linkelemente als Punkt-zu-Punkt-Federn, Auflager auch als
  Drehfeder. Keine Abhängigkeit, reines ES-Modul.
- **20 von 20 geschlossenen Lösungen exakt** (Kragarm in beiden Achsen,
  Längskraft, Torsion, Gleichlast, Einfeldträger, Rahmen, Drehfeder, Link) —
  Abweichung 1e-14.
- Am **J90/20 m** (852 Knoten, 973 Stäbe, 483 starr): Gleichgewicht auf
  **1e-7 %**, Auflagerkraft 7.12169 kN, Rechenzeit ≈ 140 ms für 8 Lastfälle.
- **Teuer gelernt:** die Zerlegung brach zuerst ab («nicht positiv definit»).
  Kein Mechanismus — die **Konditionierung**: ein 11 mm langes Starrelement
  mit dem Ersatzquerschnitt 500×500 mm trägt 12EI/L³ = 1e17 bei, ein Gurtstab
  1.2e4. Spanne 1e15, Doppelgenauigkeit endet bei 1e16. Zwei Griffe helfen:
  **Jacobi-Skalierung** der Bandmatrix und **Nachiteration** (den Rest noch
  einmal lösen und aufaddieren, K·u aus den Elementen statt einer zweiten
  Matrixkopie). Der Steifigkeitsfaktor der Starrelemente gehört dann **klein**
  (1 bis 10) — darüber wird es nur ungenauer, das Ergebnis ändert sich nicht
  mehr.
- **Begonnen (24. Sept.): der Vergleich gegen PyNite** (`vergleich_stabwerk.mjs`).
  Beide Wege bauen auf demselben `stabmodell()` auf und bekommen denselben
  `bau` gereicht; verglichen werden **Knotenverschiebungen** (die Unbekannte
  des Systems) und **Auflagerreaktionen**. Dafür schreibt das PyNite-Skript
  neu `pynite_knoten.csv` und `pynite_auflager.csv`.
  **Zwei echte Befunde, beide in der Ausleitung, nicht im Löser:**
  (1) **PyNite: Streckenlast in X landete auf der y-Achse.** `const dir =
  q.richtung === 'Z' ? 'FY' : 'FZ'` war für Z und Y richtig und für X
  falsch; `richtungKraft` daneben machte es von Anfang an richtig. Betroffen
  ist jede Streckenlast in Jochachse — am Tragjoch der Wind quer zum Gleis
  auf die Masten. Behoben.
  (2) **Der Löser rechnete ohne Eigengewicht — nachgerüstet am 24. Sept.**
  Die AxisVM-Ausleitung schreibt es nicht als Last: AxisVM erzeugt es
  selbst (`Loads.AddBeamSelfWeight` je Stab), die Datei trägt nur den
  Zuschlag (`gZusatz`). Im Lastfall G stand deshalb überall u = 0. Der
  Löser steuert es jetzt selbst bei (`opt.eigengewicht`, Vorgabe **an**,
  Prüfstand Abschnitt 119), nach der **Regel der Brücke**: nur Stäbe mit
  `art === 'stab'`, Starrkörper und Links nie — ihr Ersatzquerschnitt misst
  500 × 500 mm und wöge am J90/8 m 163 statt 18.8 kN. Gemessen: 18.766 kN
  über 210 Stäbe, und die Auflager tragen auf 1e-6 kN genau dieselbe Summe.
  ⚠ **PyNite wiegt anders:** es setzt nur die Laufmeterlast des Jochs an
  (4.71 kN) und gibt den **Masten gar kein Eigengewicht**. Für den
  Vergleich bekommen deshalb beide die Liste mit `eigengewicht: true`,
  und der Löser lässt seines weg.
- **Die Mastkopf-Abweichung ist geklärt (24. Sept.).** Weisung: «ja der
  mastkopf-abweichung nachgehen». Sie lag **nicht am Löser** — und auch
  nicht an PyNite. Ein senkrechter Kragarm HEB 240, durch beide und gegen
  w = FL³/(3EI), sprach beide frei: jeder traf seine geschlossene Lösung
  auf **1.000**. Sie stellten nur das Profil um 90° verschieden hin.
  **Drei Befunde in der PyNite-Ausleitung, alle behoben:**
  (1) **Der Mast ging als Vollquadrat 240 × 240 mm hinaus.**
  `querschnitte()` baute jeden Querschnitt, der kein Winkel und kein Blech
  ist, aus `parameter[0] × parameter[1]` als Rechteck nach — beim I-Profil
  sind das Höhe und Breite. A 5.4-fach, I_z **7.05-fach** zu gross, und
  7.05 ist genau der gemessene Faktor 7.02. Der Kommentar daneben sagte
  «STARR und ARM sind quadratisch»; das stimmte, als er geschrieben wurde —
  die Masten kamen später dazu. Wer eigene Werte führt, behält sie jetzt.
  (2) **Die Drehlage (`lcsZ`) erreichte PyNite nie.** Sie stand nur als
  45°-Zuschlag an den Gurtwinkeln, und auch das nur unter einer Option.
  Wo sie wirkt, ist gemessen: Gurte und Starrglieder (372 Stück) haben
  I_y = I_z und merken keine Drehung; die **Bleche** (48) hätten
  I_y/I_z = 0.010 — Faktor 100 — und der **Mast** (10) 2.870. Jeder Stab
  bekommt sie jetzt, **und zwar auf PyNites gespiegelten Achsen**. Den
  Winkel rechnet nicht diese Datei aus, sondern das erzeugte Skript aus
  **PyNites eigener Transformationsmatrix** — dann hängt nichts an einer
  Nachbildung seiner Konvention —, und danach misst es jede Achse nach
  und bricht ab, wenn eine schief steht.
  (3) **Die Bleche wurden über ihren Namen ausgerichtet** (BV/BH). Das war
  richtig gerechnet und der Ersatz für die fehlende Drehlage — zusammen
  mit ihr wäre es eine doppelte Drehung gewesen. Die Namensregel ist weg;
  `kalibrieren.mjs` liest die starke Blechbiegung jetzt in **beiden** Lagen
  als `Mz`. **Gemessen, dass das nichts verschiebt:** am Kalibriermodell
  (ohne Masten, wie `kalibrieren.mjs` rechnet) sind die Blechmomente
  unverändert — grösste Abweichung 6·10⁻⁶ kNm bei 0.41 kNm, die Rundung
  der CSV; 236 Zeilen haben nur die Spalte gewechselt. Die Kennwerte
  (GURT_DAEMPFUNG u. a.) stehen unberührt.
  **Danach am J90/8 m:** Wind in Gleisrichtung — Wege **1.1 %**,
  Auflagerkräfte **0.27 %** (vorher Faktor 6 bzw. 3 %). Der Mastkopf:
  59.04 gegen 58.82 mm.
- **Zwei Befunde am Messwerkzeug selbst**, beide behoben:
  (1) Es **prüfte nicht, ob das liegengebliebene PyNite-Ergebnis zum
  gerechneten Modell gehört.** Am 24. September stand dort das Ergebnis
  eines J90/8 m, gerechnet wurde ein J90/20 m — und weil beide Joche
  dieselben Knotennamen tragen, fand der Vergleich zu jedem Namen einen
  Partner und meldete Abweichungen bis **Faktor 39**. Nicht ein Löser war
  falsch, sondern die Gegenprobe. Neben den Ergebnissen steht jetzt eine
  Kennung — Modell **und Prüfsumme des erzeugten Skripts**, denn beim
  ersten Anlauf reichte das Modell nicht: der berichtigte Export hat
  dieselbe Knotenzahl, und das alte Ergebnis wurde klaglos weiterbenutzt.
  (2) Es warf **Wege (m) und Verdrehungen (rad) in einen Topf** und mass
  beide am grössten Weg. So meldete der Lastfall G eine Abweichung von
  1.29 an einer Verdrehung, bezogen auf eine Verschiebung — eine Zahl,
  die über keines von beiden etwas sagt. Zwei Reihen, jede mit ihrem
  eigenen Bezug.
  **Stand der Messung** (J90/8 m, 380 Knoten, 430 Stäbe): in
  Gleisrichtung stimmen beide (Wege 1.1 %, Auflager 0.27 %); in der
  **Jochebene** bleiben G 0.20 und Wind quer 0.53 — das ist der
  Linkelement-Befund oben, keine Frage des Lösers. ⚠ Der Satz «der Löser hängt
  an keinem Nachweis» galt bis zum 25. September; für die Freigabe fehlte der Entscheid, wie
  das Prüfmodell die gelenkigen Anschlüsse führen soll.
- **Damals nächster Schritt, seither erledigt:** gegen PyNite messen — es **ist** installiert
  (Fassung 3.0.0, Modulname `Pynite` mit kleinem n; meine frühere Aussage
  «nicht installiert» war falsch, ich hatte nur `PyNite` geprüft). Danach
  das Blatt (11 868 Freiheitsgrade) auf Zeit prüfen, dann entscheiden, ob
  Starrkörper als Zwangsbedingung statt als Ersatzsteifigkeit gehören. Die
  letzte Frage ist am 26. September **beantwortet: nein** — der Starrfaktor
  ändert keine Stelle (siehe *Laufende Arbeit (26. Sept.)*).

**Laufende Arbeit (19. Sept.): Jochreihe als gekoppeltes Tragwerk.**
Entscheide siehe *Entschieden* («Jochreihe gesamtheitlich»). Bauplan:
(1) messen ✔, (2) räumlicher Stabwerkslöser im Kern, gegen PyNite
gemessen ✔ (25. Sept.), (3) Reihenmodell aus dem Blatt ✔ (25. Sept.,
über `blattWennMehrere`), (4) Lastfälle auf der ganzen Reihe, Havarie je
Aufhängung ✔ (25. Sept., `opt.eingaben`), (5) Schnittgrössen in die
Gurt-/Blechauswertung, Masten aus dem Stabwerk, Urteil der Reihe ✔
(25. Sept., `stabwerkHuelle().reihe`), **(6) Bericht/Excel/Ausleitung,
Vergleich mit AxisVM — offen (Etappe 4).**

Was das heißt: der **Löser** rechnet die Reihe gekoppelt, der
**Ersatzbalken** weiter das Einzelfeld (Drehfedern, `core.statics`/
`core.auflager`) mit der **Sofortmassnahme** vom 19. September
(Nachbarkräfte am geteilten Masten) und `MAST_UNVERSCHIEBLICH`. Beide
Wege stehen nebeneinander, wählbar unter *Optionen → Nachweise*; der
Stabwerksweg braucht keine der beiden Korrekturen, weil die Kopplung bei
ihm echt ist. **Was dem Ersatzbalken bleibt:** die Hauptkacheln, die
Verläufe, der Bericht und die Stabilität (Knicken, `core.mast.js`) — die
rechnet der Löser nicht, und wer das übersieht, weist einen schlanken
Masten um 8 Prozent zu günstig nach.

**Messung 19. Sept.** (Überlagerung bei starren Mastköpfen, also noch
ohne Rahmenwirkung; Nachrechnung = `mastSchnitt` exakt): am geteilten
HEB 240 einer Reihe mit Fahrleitung je Feldmitte fehlt heute die Jochkraft
der Nachbarseite. Längsmoment am Fuss bei Wind ±y: J90/20 + J90/15
**59.3 → 93.9 kNm**, J90/20 + J90/20 **59.3 → 104.4 kNm** (+76 %);
Biegespannung um die schwache Achse 182 → 319 N/mm² — über f_y. Quer
(Wind ±x) 21.7 → 27.3 kNm. **Die Anwendung weist den geteilten Mast
heute auf der unsicheren Seite nach.** Havarie ohne markierten Leiterbruch
wirkt längs nicht (so gebaut: `bruch` je Leiter).

**Frühere Arbeit:** Verbesserungsliste vom 18. Sept. (Durchsicht der
Anwendung), Weisung «kragarm modell zurückstellen zuerst die a und u
aufträge abarbeiten». Erledigt: U1, U2, W1. Reihenfolge des Abarbeitens:
~~A6~~ → ~~A5~~ → ~~U7~~ → ~~U6~~ → ~~U3~~ → ~~U5~~ → U4 (Rückfrage) → ~~A2~~ → ~~A1~~ → A3; A4 nur nach Rückfrage.
Entscheide vom 19. Sept.: **U4** Schalter «Erklärtexte» in den Optionen
(Vorgabe ein) — erledigt. **A3** erfundener Datensatz (öffentlich) +
Rauchtest + CI — erledigt (Anker und Abfangjoch fehlen im Testdatensatz,
siehe Offene Punkte). **A4** nicht kürzen, gestrichen. Die ganze
Verbesserungsliste ist damit abgearbeitet; nächster Punkt wäre das
zurückgestellte Kragarm-Modell des Tragauslegers.

| # | Auftrag |
|---|---|
| U3 | Schrift klein und blass: 7.5–11.5 px in 15 Grössen, Erklärtexte ≈ 2:1 Kontrast (Ziel ≥ 4.5:1) |
| U4 | Sehr viel auf einmal: 87 Knöpfe, 39 Felder sichtbar, Erklärtext unter fast jedem Feld |
| U5 | Laptopbreite (≤ 1280 px): 3D-Bild wird ein Streifen, Leisten und Meldung liegen darüber |
| U6 | 20 Lastfälle ungegliedert — nach Art gliedern (charakteristisch, Tragsicherheit, Havarie, Gebrauch) |
| U7 | Excel, Drucken, Speichern im Kopf nur als Symbole |
| A1 | `app.js` (≈ 9300 Zeilen) in Module teilen: Dialoge, Ablage, Zeichnung — reiner Umbau |
| A2 | Ergebnisse von Hand in `anzeige` übertragen (dreimal vergessen) → eine Funktion + Kontrolle |
| A3 | Prüfstand braucht Betreiberdaten → erfundener Testdatensatz, danach CI möglich |
| A4 | 38–45 % Kommentare, 711 Weisungszitate — Chronik gehört in Git (Geschmackssache, erst fragen) |
| A5 | Versionsanzeige immer «v2.0» → Datum und Commit aus dem Bündeln |
| A6 | README veraltet (Kontrollenzahl, Excel-Skript) |

**Datenstand:** `data/masten.json` trägt seit 24. Sept. die Tabelle `fundamente` (8 Standard-Mastfundamente, Sicherung davor: `data/sicherung/masten_vor_fundamenten_2026-09-24.json`). `data/anbauteile.json` trägt seit 19. Sept. die Spalte `ort`
und fünf Mast-Vorlagen, `data/fl_bauteile.json` den Baustein
`anbauteil-lampenrohr` (Sicherungen davor in `data/sicherung/…_2026-09-19`).
`data/tragjoche.json` trägt seit 18. Sept. die J60-Bleche
(Sicherung davor: `data/sicherung/tragjoche_vor_J60_2026-09-18.json`). Wer
die Anwendung mit einem Datenpaket nutzt (GitHub Pages, andere Rechner),
braucht ein **neu gesichertes Paket** — ältere Pakete kennen J60 ohne Bleche.

## Offene Punkte

Mit ⚠ markierte Punkte brauchen einen Entscheid des Auftraggebers.

**Fachlich**
- **Nächste Wünsche (30. Sept., noch NICHT umgesetzt - Weisung «die
  restlichen aufgaben noch nicht umsetzen, warten bis wir frische tokens
  erhalten»):**
  (1) Gebrauchstauglichkeit in den Optionen neu ordnen, im Wortlaut: «diese
  aufteilung macht wenig sinn, man sollte die beiden grenzwertbetrachtungen
  aktiv inaktiv schalten können. oder zu oberst den kompletten
  gebrauchstauglichkeitnachweis. hinzu kommt noch die mastverdrehung 5° als
  dritte prüfung. dazu noch die eingabe der relevanten höhe, was man auch
  beim fahrdraht in den optionen eingeben sollte können. (fahrdraht /
  Tragjoch / Ausleger oder selbst eingegeben höhe) dann muss man auch nicht
  immer die überprüfung vornehmen in der sidebar. man könnte diese grenze
  auch unter gebauchstauglichkeit in der sidebar übersicht aufführen und
  umschaltbar machen falls notwendig, dann ist man auch nicht so abhängig
  von den automatismen.»
  (2) «beim Mast noch unter profile die querschnittsklasse angeben und
  einen hinweis zur schweissnaht an fussplatte (durchgeschweisst). dies ist
  bei den standardfussplatten schon der fall.»
  (3) «unter profile könnte man da auf die einzelnen profile klicken und
  ein fenster mit den hinterlegten kenndaten zum profil und eine svg
  zeichnung des schnitts und mit vermassung und die angabe zur lage des
  schwerpunktes, so lassen sich die werte mit der fachliteratur
  abgleichen.»
  (4) Frage «ist es möglich ein verformtes modell darzustellen im 3d? oder
  kostet das zu viel performance? es wäre nur ein nice to have» - noch
  nicht beantwortet.
  Dazu offen aus der Sammelweisung: Vorzeichen der Eingabe nach dem 3D
  (siehe unten), «+ Bauteil aus der Lasttabelle», «Fahrleitung als
  Auflager» nur mit Leiter, Signalbauer mit Bildern, Rückstellkraft der
  Leiter am Joch.
- **Tabelle der Reaktionskräfte (30. Sept.) - gebaut**, siehe *Entschieden*.
  Beobachtet: am Ankerfundament rechnet das Stabwerk kleine Momente
  (0.4 kNm an einem U12) - die Tabelle führt dort «–»; ob das Fundament des
  Ankers im Modell gelenkig sein müsste, ist nicht geprüft.
  Bisheriger Wortlaut des Auftrags:
  Weisung: «kannst du noch die mappe wo die reaktionskräfte zusammengefasst
  sind lesen und diese tabelle als output hier in der app anbieten, man
  sollte die charakteristischen lasten hier aufführen (massgebend in quer
  und längsrichtung) ohne abminderung der windlasten mit 0.7 faktor. bei
  einer jochreihe alle Auflager aufführen. und in der tabelle
  zusammentragen auf dem blatt noch eine kleine übersichtskizze zum
  tragwerk aufführen. setze noch die hinweistexte und die konvention des
  achssystem (beachte noch das die druckkräfte positiv sind auf der
  tabelle)». Vorbild: Blatt «Zusammenfassung» der Einwirkungs-Mappe (je
  Mast- und Ankerfundament V min/max, M_q, H_q, M_l, H_l, T, Aufteilung
  ständig/veränderlich, Zeile der Standardlasten; Koordinaten X quer, Y
  längs, Z nach unten). Auf Rückfrage: **Havarie als eigene Zeile**,
  **im Reiter Auflager und als Blatt im Export**.
- **Vorzeichen der lotrechten Eingabe (30. Sept., entschieden, offen).**
  «bei uns ist es auch der fall bei der eingabe, aber die konvention gemäss
  des achssystems im 3d wäre eigentlich negativ, dass sollten wir noch
  berichtigen.» Auf Rückfrage **«Eingabe nach 3D»**: Eingabe und Anzeige
  mit z nach oben (Gewicht negativ), alte Stände und Sortiment beim Laden
  einmal umgerechnet, der Kern rechnet weiter mit dem Betrag; nur die
  Reaktionstabelle zählt Druck positiv wie die Mappe.
- ⚠ **Tragausleger am Masten eines Jochs wird im Stabwerk nicht gerechnet**
  (Sperre in `reiheOhneStabmodell`: Aufhängung, Knicken und Fundament des
  Auslegers rechnet `rechneStabwerk` nur für den Ausleger allein). Setzen
  lässt er sich seit dem 30. Sept. per Kachel/Mastwahl, nach aussen
  gerichtet; gerechnet wird dann nur der Ersatzbalken. Den Ausleger in die
  zusammenhängende Gruppe aufzunehmen ist der nächste Schritt dafür
  (Befragung offen).
- ⚠ **Einzelmast unter einem neuen Joch:** legt man ein Joch auf einen
  Masten, der als eigenes Tragwerk «Einzelmast» steht, bleiben beide
  Tragwerke bestehen; das Stabwerk rechnet «3 Tragwerke, 3 Masten», der
  Einzelmast läuft als Nachbar mit (gemessen M3 0.760 mit, 0.755 ohne; der
  Mastwind zählt nicht doppelt). Zu entscheiden: soll das Einzelmast-
  Tragwerk dabei in den Jochmasten übergehen (Teile am Masten bleiben)?
- **Stabwerksleiste nennt die Tragwerks-Id statt des Namens:** in der
  Reihenzeile stand «Joch T3» für das Joch, das in Leiste und Kacheln «T2»
  heisst (gesehen 30. Sept., nicht berichtigt).
- ⚠ **Betreiberdaten in die Ablage: vom Auftraggeber selbst zu tun.**
  Weisung 29. Sept.: «kannst du die bauteildaten in der jetzigen fassung
  einbauen, so dass ich diese nicht von hand pflegen muss», auf Rückfrage
  «Öffentlich einbauen» und «Quellen neutral, Zahlen rein». Das Entfernen
  von `data/*.json` aus der `.gitignore` hat die Sicherheitsprüfung des
  Werkzeugs verweigert (Veröffentlichung von Betreiberdaten); es wurde
  zurückgenommen und **nicht auf anderem Weg** versucht. Die Dateien in
  `data/` tragen örtlich neutralisierte Quellenangaben und sind weiter
  unverfolgt. Wer sie veröffentlichen will, tut es selbst (`.gitignore`
  anpassen, `git add data/*.json`) - die stehende Regel «nicht
  `data/*.json`» in dieser Datei wäre dann ebenfalls zu ändern.
- **Signalbauer** gebaut am 30. Sept. (siehe *Entschieden*). Offen: das
  **Galgen-Tragwerk** für Signale («zu einem späteren zeitpunkt»); der
  erfundene Testdatensatz führt noch keine Signalteile.
- ⚠ **Tragausleger mit Auslegerwind:** mit Längsanker bei L 13 m und
  Hängestütze Mast η 1.054 (> 1) - aus Biegung in Gleisrichtung, nicht aus
  Torsion (0.09 kNm, gemessen 30. Sept.); ohne Längsanker 5.8 (Torsion
  33 kNm). Zu klären, ob Mastprofil oder Anordnung zu ändern ist.
- ~~**Einwirkungs-Mappe Punkt für Punkt**~~ (Weisung 29. Sept.,
  «einwirkung-mappe punkt für punkt durchgehen was gebaut werden soll»):
  am 30. Sept. entschieden und zum grössten Teil gebaut, Signalbauer offen. Aus der Durchsicht: in der
  Lasttabelle ohne Baustein Spurhalter-/Auslegerkonsole, Abfangarmaturen,
  Abfangrohr, Spurhalterbefestigung, Trafo 50/100 kVA; der Wind auf den
  Tragausleger (0.23/0.28/0.33 kN/m je EK) steht dort, wird aber nicht
  angesetzt; die Signal-Blätter führen 41 Teile, die die Anwendung nicht
  kennt; Doppelmast 2 RRW 200/100/16.
- **Durchsicht der Karten** (Weisung 29. Sept., «bei allen
  tragwerksarten die system karte und deren abbildungen … mit allen
  karten der reihe nach»): Systemkarte Tragjoch und Einzelmast erledigt;
  offen Abfangjoch und Tragausleger, dann Profile, Anbauteile, Lasten.
- **Dialog «Neues Tragwerk»: die Anschlusshöhe wirkt beim NEUEN
  Tragwerk nicht** (nur beim Bearbeiten wird `mastH` geschrieben).
  Gefunden am 29. Sept., nicht berichtigt: der erste Mast eines neuen
  Jochs in einer Reihe ist der geteilte des Nachbarn - seine Höhe zu
  ändern änderte auch diesen. Zu entscheiden, was das Feld dort soll.
- ⚠ **Tragausleger mit Hängestütze OHNE Längsanker: Mast und Fundament
  deutlich überschritten** (28. Sept., Prüfstand 138; mit dem Längsanker,
  seit demselben Tag Regelfall, Mast 0.838 und Fundament 0.671 — offen
  bleiben dann Bindeblech 1.029 und Knicken 1.011 bei L 13 m; seit
  Mastlänge H + b Mast 0.850, Fundament 0.677, Knicken 1.027; seit den
  zwei gespreizten Seilen Blech 0.208 - offen bleibt das Knicken, 1.027:
  gemessen der Wind auf den 14-m-Masten selbst um die schwache Achse,
  β = 2 bestätigt, Abhilfe über das Profil). L 13 m:
  Mastquerschnitt mit σ_ω 2.115, Knicken 1.107, Fundament 1.445
  (Torsion). Ursache ist die
  Torsion aus Wind in Gleisrichtung am langen Hebel des Auslegers, die
  nach Entscheid «A» (beide Gurte x-gehalten) in den Masten geht. Der
  Wind auf den Ausleger selbst fehlt noch (Sortiment ohne Windlast je
  Meter) — er käme dazu. Ob das Sortiment Hängestützen am Ausleger vorsieht
  bzw. wie der Anschluss die Torsion wirklich abgibt, ist zu klären.
- **Erledigt (28. Sept., «Joch: Knicken aus dem Stabwerk»):** Knicken am Joch weiter aus dem Kern. Seit dem 28. September kann
  das Stabwerk das Knicken selbst liefern (`knickenAusStabwerk`); am Joch
  weicht es um 0.4 % ab (Jochlast am Konsolanschnitt). Ob das Joch es
  ebenfalls aus dem Stabwerk nehmen soll — am geteilten Masten der Reihe
  wären die Kräfte die gekoppelten statt die der Sofortmassnahme —, ist
  ein Entscheid des Auftraggebers.
- **Tragausleger mit Hängestütze: das Bindeblech am Masten war
  überschritten** - **erledigt mit den zwei gespreizten Seilen** (28. Sept.,
  Prüfstand 147: 1.029 → 0.208 mit, 1.208 → 0.316 ohne Längsanker). Der
  Befund mit einem Seil (Prüfstand 137): Die Torsion aus dem
  Wind auf die Stütze in ihrer Mitte (0.550 kN auf 1.35 m = 0.743 kNm)
  trägt der Ausleger so: die beiden UPE biegen sich lotrecht gegengleich,
  und das Blechpaar am eingespannten Ende hält das über seine starke Ebene
  (oben und unten gegengleiche Querkraft in x). Gemessen, Blech BL_U0 unter
  Wind +y: L 6 / 8 / 13 m η **1.038 / 1.135 / 1.209**; UPE 0.28–0.37, Seil
  0.66–0.82. Mit der Fahrleitung direkt am Ausleger: Blech 0.002. Das
  Stabwerk hält die Enden durch den Anschluss «A» (beide Gurte x y z,
  K_XX) fest; ob die Gabel am Masten die Verwölbung wirklich so hält, wäre
  am AxisVM-Modell oder an der Zeichnung zu klären. Entscheid des
  Auftraggebers.
- ⚠ **AxisVM zeigt teils 15–20 % höhere Spannungen im Joch** (gemeldet
  29. Sept.). Gemessen (`vergleich_spannung.mjs`, Torsionslauf J90/20 m):
  mit AxisVMs Kräften rechnet unsere Formel dieselben Maxima (0.6–2.1 %),
  einzelne schwach beanspruchte Stäbe bis 14 %. Der Unterschied liegt
  also in der Spannungsanzeige von AxisVM (Querschnittswerte des Polygons
  ohne Ausrundung, Auswertepunkte, Spannungsart) oder im Vergleichswert.
  Gebraucht: welches Modell, welcher Stab/Teil, welche Spannung in AxisVM
  (σ_x, σ_v …), gegen welche Zahl der Anwendung.
- **Verläufe und 3D-Resultatplot im Stabwerksweg** - erledigt am
  29. September für das Tragjoch (Hülle); ein gewählter Einzellastfall,
  Einzelmast und Abfangjoch zeigen weiter den Kern. ⚠ Neu zu entscheiden:
  was der Reiter *Schnitt* im Stabwerksweg zeigt (siehe *Entschieden*,
  «Schnitt und Bilder»).
- ⚠ **Jedes AxisVM-Modell mit Linkelementen seit dem 24. August hatte die
  Verbindung 0.45 m ausserhalb des Links** (`Position = 0.5` als Meter,
  siehe *Letzte Schritte*). Betroffen sind damit Messungen, die sich auf
  AxisVM-Modelle mit Links stützen — soweit ich sehe: die **Lagerungsstudie
  Tragjoch** (16. Sept., 13 Varianten, «Mast B 568 → 190»), **K_XX am
  Abfangjoch** (17. Sept., 140 → 96), die **Drehfedern am Linkelement**
  (9. Sept.), der **Längshalt** (27. Aug.) und `MAST_UNVERSCHIEBLICH`
  («AxisVM ist das geprüfte Programm»). Nicht betroffen: die Kalibrierung
  gegen PyNite (ohne Masten, null Links) und die Mastmomente der Etappe 4
  (0.00 % auch mit dem falschen Modell). Ob die Entscheide stehen, ist
  **nicht nachgemessen** — Entscheid des Auftraggebers, ob und welche.
- ⚠ **PyNite koppelt die Links weiter am Gurtknoten.** Löser und
  COM-Brücke koppeln seit dem 26. September in der Linkmitte; die
  PyNite-Ausleitung gibt die Momente mit `def_releases` am Gurtende frei,
  das entspricht der alten Kinematik. `vergleich_stabwerk.mjs` wird
  deshalb am Anschluss und an den Anbauteil-Links auseinanderlaufen, ohne
  dass einer falsch wäre. Nachziehen hiesse, den Link in PyNite zu teilen
  (Knoten in der Mitte, Freigabe dort) — berührt `kalibrieren.mjs` nicht
  (null Links), aber die PyNite-Gegenprobe. Entscheid offen.
- ⚠ **Die PyNite-Ausleitung steht auf der lokalen Link-Lesart.** Der Befund
  vom 26. September (die Linkbedingung gilt global) ist im Löser behoben, in
  `export.pynite.js` nicht: `def_releases` wirkt in PyNites eigenem
  Stabsystem. Solange das so ist, bestätigen sich beide Wege gegenseitig
  einen Fehler. Der Umbau berührt `kalibrieren.mjs` und damit die
  Kennwerte (`GURT_DAEMPFUNG` u. a.) — deshalb nicht von selbst getan.
- **Bericht: zwei Tragwerksarten fehlen — seit dem 26. September beauftragt.**
  Das **Abfangjoch** war ausdrücklich draussen (18. Sept.), der
  **Tragausleger** wartete auf sein Kragarm-Modell. Beides soll jetzt einen
  Bericht bekommen; der Entscheid vom 18. September ist damit aufgehoben.
- ⚠ **Doppelmasten ohne Fundamentzuordnung:** DGP24 und DGP26 stehen in
  der Fundamenttabelle, aber das Sortiment führt sie nicht als Profil —
  ihre Fundamente (DG1a, DG2a, DG3a) sind nur von Hand wählbar.
- **Nachweisbericht:** Tragausleger fehlt noch (wartet auf die Modellfrage
  unten); die Systemskizze ist die Längsansicht des Modells, keine
  vermasste Zeichnung; ein Handbuchkapitel zum Bericht fehlt.
- **Mast mit Tragausleger — der KERN liegt auf der unsicheren Seite**
  (seit dem 28. September im Stabwerk nachgewiesen, siehe *Letzte
  Schritte*; offen bleibt der Kern für die vorläufige Anzeige, Etappe 3,
  und der Ausleger in einer Reihe). Der
  Kern rechnet den Ausleger als Einfeldträger mit einem zweiten Auflager am
  freien Ende (Phantom «Mast B»). Gemessen an der Vorlage, Fahrleitung an
  der Spitze, G charakteristisch: L = 8 m → Kern M_A = 0, max M_y 5.0 kNm;
  Kragarm von Hand M_A = 28.6 kNm, R_A 6.0 statt 2.4 kN. L = 12 m: 10.9
  gegen 57.3 kNm. Der Mast bekommt kein Einspannmoment aus dem Ausleger.
  Dazu besteht der Tragausleger nach Sortiment aus zwei UPE 140, nicht aus
  vier Winkeln. Braucht ein eigenes Kragarm-Modell.
- **Druckstütze Stufe 2** (mehrteiliger Druckstab, EN 1993-1-1, 6.4): ⚠ es
  fehlen der Bezug des Spreizmasses (`bezug: null`) und die Bindelaschen
  (Anzahl, Abstand, Profil).
- **Datenpaket ohne Masten-Sortiment:** ältere Pakete führen es nicht;
  dann fehlt der Mastwind ganz (siehe oben, der Hinweis sagt es). Ein
  neu gesichertes Paket enthält es.
- ⚠ **Mastwind von Hand:** heute folgt er immer der Tabelle. Eine Eingabe
  müsste **je Mast** stehen (in der Mastkachel), nicht als ein flaches Feld
  für das ganze Blatt — sonst bekämen ein HEB 220 und ein HEM 240 densel-
  ben Wert. Entscheid des Auftraggebers, ob es sie geben soll.
- ⚠ **«Schnee ansetzen» am Einzelmasten und am Abfangjoch:** der Schalter
  legt 9 zusätzliche Lastfälle an (sk, schnee±, schneeX±, gtseltenS…),
  die dort **leer** sind — die Laufmeterlast liegt auf dem Joch. Schnee
  auf Anbauteilen zählt unabhängig davon. Ausblenden würde einen alten
  Stand mit eingeschaltetem Schnee unsichtbar weiterrechnen lassen;
  deshalb steht er noch da, mit einem Hinweis. Entscheid offen.
- ⚠ **Rechenmodelle, die dem Blatt gehören müssten:** `BLATT_FELDER`
  (core.constants.js) führt `mastPlastisch`, aber **nicht**
  `knickBeiwert`, `mastWindAufJoch` und `lastHerkunft`. Auf einem Blatt
  könnten damit zwei Tragwerke mit verschiedenem Knicklängenbeiwert
  gerechnet werden — nach der eigenen Regel der Liste («Zwei Tragwerke
  auf einem Blatt verschieden zu rechnen wäre ein Fehler») gehören sie
  hinein. Nicht von selbst geändert: es verschiebt Werte zwischen den
  Tragwerken alter Stände.
- ⚠ **`ebenenUeberlagerung` = «vorzeichenrichtig»:** am J90/20 m mit
  1.5 m quer versetzter Hängestütze (T_xVz = −1.83 kNm, also Drehsinn
  vorhanden) ändert die Option **keine Zahl** — η der Bleche bleibt
  0.6578. Entweder erreicht `m.ebenenUeberlagerung` die Stelle in
  `core.querschnitt.js` nicht, oder der Blechnachweis liest `jeEbene`
  nicht. Braucht eine eigene Untersuchung; der Entscheid vom
  17. September («Hüllkurve ist Vorgabe») bleibt davon unberührt.
- **Spannweitenkategorien:** Tabelle Radius ↔ zulässige Spannweite je EK.
- **Örtlicher Anteil:** die Verteilung dicht an der Klemme (überschätzt dort
  bis Faktor 19).
- **Reglagetabelle** für weitere fix abgespannte Leiter; ohne sie stehen
  Schnee- und Havariefall zu günstig da.
- ⚠ **Schnitt D-D:** die Bemassung 6 / 8 / (92) / 8 / 6 deutet auf Bleche der
  Positionen 5–9, die 6 mm zurückgesetzt sind (Hebelarm 100 statt 112 mm).
  Im Modell sitzen alle bündig.

- ⚠ **Zwei Rechenwege, zwei Zahlen für denselben Masten.** Seit dem
  25. September rechnet der **Stabwerksweg** die Reihe gekoppelt (η des
  geteilten Masten 0.7708 → 1.3465 an 2 × J90/20 m), der **Ersatzbalken**
  weiter das Einzelfeld mit der Sofortmassnahme vom 19. September.
  **Seit dem 28. September führt das Stabwerk die Anzeige** (Hauptkachel,
  Kacheln, Fussleiste, Schiene, Lageband; siehe *Entschieden*). Auf dem
  Ersatzbalken stehen noch die **Verläufe, der Schnitt, die Tabelle der
  höchstbeanspruchten Stellen, der Bericht und Excel** — das ist Punkt 3
  des Auftrags. Drei Dinge dazu, noch nicht entschieden:
  (1) ~~**Das Knicken rechnet mit den Schnittgrössen des Kerns.**~~ Am
  Tragjoch seit dem 28. September aus dem Stabwerk (geteilter M2 1.4839 →
  1.4791); Einzelmast und Abfangjoch weiter aus dem Kern.
  (2) Die **Hauptkachel urteilt über das aktive Tragwerk** mit seinen
  Masten; die Masten der Nachbarjoche stehen nur in der Reihenzeile der
  Stabwerksleiste.
  (3) Am **Einzelmasten** zeigt die rechte Schiene weiter den Kern
  (Pille «Ma»); Kacheln und Hauptkachel folgen dem Stabwerk.
- **Geteilter Mast:** seit der Sofortmassnahme (19. Sept.) mit den
  Jochkräften der Nachbarn; die **Rahmenwirkung** rechnet seit dem
  25. September der Stabwerksweg (gekoppeltes Blattmodell), der
  Ersatzbalken nicht. Rechenzeit je Eingabe mit zwei Nachbarn ≈ 80 ms,
  eine Reihe im Stabwerk ≈ 420 ms (2 Joche) bzw. 640 ms (3 Joche).
- **Geteilter Mast im Nachweis** (19. Sept. nachgeprüft): seine Teile am
  Masten zählen in **beiden** Rechnungen (seit 2./18. Sept., `mastAnbauteile`
  mit `mastId`) — der frühere offene Punkt «Bauteil gehört nur einem
  Tragwerk» war veraltet. Es fehlt aber die **Jochreaktion der Nachbarseite**
  im Mastnachweis und die Rahmenwirkung über die Reihe (Hinweis in
  `core.checks.js`). ⚠ Vorschlag «Mast als eigenständiges Element»
  vorgelegt; Entscheid 19. Sept.: gekoppeltes Gesamtmodell (siehe
  *Laufende Arbeit*).

- ⚠ **Die PyNite-Ausleitung mindert nur die Bleche ab.** Seit dem
  25. September rechnet der Löser die Schubverformung selbst, für **jeden**
  echten Stab; die Ausleitung behilft sich mit I/(1+φ) und tut das nur bei
  den Blechen. Der Löser rechnet damit **mehr** Schub als PyNite, und der
  Unterschied sitzt an den Gurten: am J90/8 m 1.4 % in den Wegen des
  Lastfalls G, Auflagerkräfte auf 5e-4. Ob die Ausleitung nachziehen soll,
  ist ein Entscheid — `kalibrieren.mjs` liest genau dieses Modell, und die
  Kennwerte (GURT_DAEMPFUNG u. a.) hängen daran.
- ⚠ **Die Schubfläche ist ein Beiwert, kein Querschnittswert.** Gerechnet
  wird mit dem Rechteckwert κ = 5/6 (wie die Ausleitung seit je). Für die
  **Bleche** ist das richtig — sie *sind* Rechtecke. Beim **I-Profil** des
  Masten wäre A_s näherungsweise die Stegfläche, rund ein Drittel davon:
  der lange Mastschaft hätte statt φ = 0.0077 dann rund 0.023, also **1.5 %**
  weniger Biegesteifigkeit. Klein, aber nicht nichts. Wer es genauer
  braucht, muss die Schubfläche in die Datei bringen — AxisVM führt sie je
  Querschnitt.
- **Torsion der gedrungenen Ersatzquerschnitte** (STARR 500×500, ARM):
  der Löser nimmt den exakten Beiwert (0.1406·a⁴ beim Quadrat), der
  PyNite-Export die dünnwandige Näherung — 12 % Unterschied. Ohne Belang
  (beide sind gestättigt steif: die Lösung hängt nicht am Starrfaktor),
  aber es steht hier, damit niemand zweimal danach sucht. Bei dünnen
  Blechen laufen die beiden Formeln zusammen (1.0000).

**AxisVM / COM**
- Lastfallnamen «Havarie L1 …» in AxisVM nicht erprobt — die Modelle wurden
  aufgebaut, aber ohne Havariefälle.
- Am Einzelmasten folgt der Dateiname der ausgeleiteten Datei dem Joch
  des Blattes (die Kopfzeile sagt seit dem 28. September «Einzelmast»).
- ⚠ Abfangjoch zwischen zwei **fremden** Masten (beide von Nachbarjochen
  gehalten): die Länge müsste sich dann nach ihrem Abstand richten
  (nächst längeres Joch). Heute setzt das Abfangjoch stattdessen seinen
  eigenen zweiten Masten auf seine Stützweite; der Hinweis greift nur,
  wenn beide Masten schon zugeordnet sind.
- Seilkopf im nächsten Aufbau prüfen: lokale x-Achse des NN-Links, «nur Zug»
  (wirkt nur nichtlinear).
- Ergebnisse zurücklesen ist gebaut, ein sauberer Durchstich fehlt; lokale
  Stabachsen offen.
- Abfangjoch-Ausleitung führt das Merkmal `anbau-kette` bewusst nicht
  (Anbauteile als Punktlasten am Gurt); die Brücke meldet deshalb «ältere
  Fassung». Die Meldung stimmt, ihr Rat «neu ausleiten» hilft aber nicht.
- Geteilter Mast mit zwei verschiedenen Mastlängen (je Tragwerk
  eingetragen): der Kopf des ersten gilt, der Zug reicht bis zum höheren
  Anschluss. Die Mastliste kennt nur eine Länge je Stelle — Eingabe prüfen.
- «Abfangjoch mit Mast rechnet unsichtbar nicht» liess sich am 17. September
  nicht nachstellen — beobachten.
- Gurtabschnitte als Starrkörper (Umlegung ihrer Streckenlasten) — nur auf
  Wunsch.

**Bedienung**
- **`serve.py` sollte sich weigern zu starten, wenn Port 8731 belegt ist.**
  Es setzt `allow_reuse_address = True`, und das erlaubt unter Windows
  mehreren Prozessen, denselben Port zu binden. Am 26. September lagen fünf
  Server gleichzeitig darauf; die Verbindung landete bei einem toten und
  wurde ohne Antwort geschlossen — ein Bild, das wie eine verweigerte
  Sandbox aussieht und zweimal so gedeutet wurde.
- Der Einzelmast des Durchgangs trägt weder Anbauteile noch Anker (2 Knoten,
  1 Stab) — genau die Stelle, an der zweimal etwas fehlte. Ein Fall mit
  Teilen am Masten wäre die bessere Wache.
- Rauchtest (A3): der erfundene Datensatz führt noch **keinen Anker und
  kein Abfangjoch** — diese Wege laufen nur mit den Betreiberdaten durch.
- Sammelaktionen in der Anbauteil-Übersicht (alle Teile einer Vorlage).
- Angepasstes Joch als eigenen Typ speichern.
- Excel-Generator (`js/export.xlsx.js`, Python-Skript) nicht synchron mit dem
  Kern.
- Der Anbauteile-Reiter nennt sein Tragwerk nicht; `+ Tragwerk` kopiert die
  Anbauteile ohne Umbenennung.
- 3D: «Isometrie» rückt ein Blatt mit zwei Einzelmasten nicht ganz ins
  Bild (der aktive liegt am Rand).
- ⚠ Bauteil-Karte klappbar machen (1237 px hoch, zugleich die Orientierung).

## Die Ablage wird öffentlich

Projektmaterial des Betreibers gehört **nie** hinein: keine Zeichnungs- oder
Projektnummern, kein Betreibername, keine `.axs`/`.axe`/PDF/Excel, nicht
`data/*.json`, nicht `Grundlagen/`, nicht `Versand/`, nicht
`pruefung_axisvm/`. Die `.gitignore` hält das; vor jeder Änderung an
verfolgten Dateien prüfen, ob ein solcher Bezug hineingerät.

Fachliche Anker ohne Nummer sind erlaubt und erwünscht — «Schnitt C-C der
Werkstattzeichnung» benennt die Stelle eindeutig genug.

**Push ist die Entscheidung des Auftraggebers.** Am Remote nichts ändern,
nicht pushen, auch nicht auf Nachfrage einer Werkzeugmeldung.

## Arbeiten

```bash
node pruefung.mjs           # Pruefstand, 5952 Kontrollen - muss gruen bleiben
node durchlauf.mjs          # Durchgang durch alle Wege je Tragwerksart
VIERENDEEL_DATEN=testdaten node durchlauf.mjs   # derselbe ohne Betreiberdaten (Rauchtest, CI)
node testdaten/erzeuge.mjs  # schreibt den erfundenen Testdatensatz neu
node datenpaket.mjs         # Datenstand aus data/ als Paket nach Versand/
node vergleich_axisvm.mjs com/AxisVM_<name>.json      # Loeser gegen AxisVM, Stab fuer Stab
node vergleich_starrheit.mjs com/AxisVM_<name>.json   # Starrfaktor-Reihe und Drehprobe an den Gurten
node vergleich_anschluss.mjs com/AxisVM_<name>.json [M1] [G]   # was die Konsolen in den Masten einleiten
python3 build_html.py       # buendelt js/ + css/ -> vierendeel_tool.html
python3 serve.py            # Modulversion: http://localhost:8731/index.html
```

Nach **jeder** Änderung an `js/` oder `css/` neu bündeln — die eigenständige
Datei veraltet sonst still.

**Nach jeder Änderung an `data/*.json` `node datenpaket.mjs` laufen lassen**
(Weisung, 20. September: «kannst du noch jeweils den aktuellen stand der
daten ablegen nach der modfizierung unter versand»). Es legt den Stand als
`Versand/Vierendeel_Datenpaket_<Datum>.json` ab — die Datei, die eine
Fassung **ohne** `data/` braucht (GitHub Pages, Bündel ohne Daten, anderer
Browser). Das Werkzeug baut sie mit demselben `paketAus` wie der Knopf in
der Anwendung und meldet laut, wenn ein Sortiment fehlt. `Versand/` steht
nicht in der Ablage.

Der Prüfstand prüft **Bausteine**, `durchlauf.mjs` einen **Durchgang**:
Eingabe, Rechnung, Szene, Ausleitung, Bericht — für Joch, Einzelmast und
Jochreihe. Nach einem Umbau an Datenstruktur oder Rechenweg beides laufen
lassen; am 2. September standen 2290 Kontrollen grün, während der
Excel-Knopf am Einzelmasten wortlos nichts tat. `pruefung.mjs` braucht die `data/*.json`
daneben; ohne sie laufen die Kontrollen nicht. Alle Datendateien stehen in Tabellenform (js/data.tabellen.js).
`data/normen.json`
(Querschnittswerte, Stahlgüten) ist verfolgt — sie ist keine Betreiberdatei
und ohne sie rechnet die Anwendung nicht.

Was in Modulen läuft, läuft nicht zwangsläufig gebündelt. Der Bündler prüft
das Ergebnis mit `node --check` und bricht ab, statt eine kaputte Datei
abzulegen. Er schreibt auch `sw.js` neu (Dateiliste und Fassung) und `js/version.js`
(Datum und Fassung für Fussleiste und Bericht, «v2.0 · 18.09.2026 ·
d3f95be») — beide Änderungen gehören mit in den Commit.

### Wo was steht (`js/`, rund 58 000 Zeilen)

| Gruppe | Dateien | Inhalt |
|---|---|---|
| Rechenkern Joch | `core.lasten` (0) → `core.statics` (1, Ersatzbalken) → `core.querschnitt`, `core.vierendeel`, `core.winkel` → `core.auflager` (4) | Einwirkungen, Balken, Aufteilung auf Gurte und Bleche, Spannung im Winkel, Auflager und Jochanteile an die Maste |
| Rechenkern weitere | `core.mast`, `core.abfangjoch`, `core.anbauteile`, `core.trasse`, `core.klassen`, `core.checks`, `core.blechregel`, `core.constants` | Mast (Schnittgrössen, Stabilität), Abfangjoch, Anbauteile, Umlenkkräfte, Klassen, Nachweise und Gesamturteil, Blechregel, Konstanten |
| Daten | `data.*` | Zugriff auf Sortimente (Tabellenform `data.tabellen`), Normwerte, Anker, Leiter (`data.fl`, Reglage), Datenpaket, Einlesen |
| Bild | `geometry`, `render.*`, `bild.*`, `design` | Geometrie, 3D, Diagramme, Abfangjoch, hinterlegte Zeichnung und Erkennung |
| Ausleitung | `export.axisvm*`, `export.pynite`, `export.bericht`, `export.xlsx` | AxisVM (COM-JSON), PyNite, Bericht, Excel |
| Oberfläche | `app` (Verdrahtung: `aendern`, `neuRechnen`, Kopf, Balken, Start), `app.*` (ausgelagert, siehe unten), `ui*`, `store` (Projektablage), `verlauf` (Rückgängig), `pwa`, `doku.*` (Handbuch, Skizzen) | |
| Ausgelagerte Verdrahtung (A1, 19. Sept.) | `app.ablage` (Schublade, Laden/Speichern/Einlesen), `app.axisvm`, `app.bericht`, `app.dialoge` (Mast, Anker, Tragwerk), `app.kontext` (Kontextmenüs), `app.layout` (Werkzeugleisten, Lastfallwahl, Legende, Schubladen), `app.optionen` (Optionen, Sortiment, Handbuch, Lastfälle), `app.setzen` (Bauteil setzen), `app.zeichnung` (hinterlegte Zeichnung); `core.anker` (Anker-/Abfangauswertung) | |

### Architektur

- **Keine Abhängigkeiten, kein Framework.** Reine ES-Module im Browser, DOM
  von Hand (`ui.js`), 3D auf Canvas 2D (`render.3d.js`), Diagramme als SVG.
  Node führt dieselben Module für Prüfstand und Kalibrierung aus.
- **Zwei Auslieferungen aus einer Quelle:** `index.html` lädt `js/` als
  Module (Entwicklung, GitHub Pages); `build_html.py` sortiert die Module
  topologisch, schreibt die `import`-Zeilen auf eine Modultabelle um und
  legt `vierendeel_tool.html` ab (Doppelklick, `file://`). `--ohne-daten`
  lässt die Betreiberdaten weg; `data/normen.json` ist immer eingebettet.
  Nur **statische** Importe — `import()` sieht der Bündler nicht.
- **Hauptzyklus** (`app.js`, rund 4600 Zeilen, nur Verdrahtung): jede
  Eingabe → `aendern(key, wert)` → `neuRechnen()`. Dort, in dieser
  Reihenfolge: Verlauf melden (Rückgängig hängt nur hier) → Grenzen aus dem
  Sortiment → `berechne(rechensatz(werte))` (Kern des Tragjochs, läuft
  immer, weil Bild und Masken an seiner Gestalt hängen) → beim Abfangjoch
  zusätzlich `abfangAuswertung` und der Mast über alle Fälle → ohne Joch
  (Einzelmast) werden Jochschritte **übersprungen, nicht abgesichert** →
  `vergleichKombinationen` (Hüllkurve) → Anker (charakteristisch) →
  Kontrollen, Hinweise, `bauteilUrteil` → `letzte = {…}` → Maske, Auswertung,
  Schienen, Modell, Fussleiste → `speichern()`.
- **`app.js` wird geteilt (A1, seit 19. Sept.):** Reine Rechnung wandert in
  `core.*` (z. B. `core.anker.js`). Zustandsgebundene Teile werden `app.*.js`
  (z. B. `app.bericht.js`) und bekommen das Kontextobjekt `app` aus
  `app.js` als Parameter: Getter auf den Zustand (`app.werte`,
  `app.letzte`, `app.projekt`, `app.thema`, `app.ansicht`) und die
  gemeinsamen Hilfen (`app.dialog`, `app.handlung`, `app.meldeImBalken` …).
  Sie **importieren `app.js` nie** — einen Kreis verträgt der Bündler nicht.
  Wer einem Modul einen weiteren Namen gibt, trägt ihn in `app` ein; wo ein
  Modul Zustand **schreibt**, hat `app` einen Setter (`app.werte = …`).
  Teuer gelernt beim Verschieben: Namen nur im **Code** umschreiben, nie in
  Zeichenketten oder Template-Text (`btn-projekt` wurde sonst
  `btn-app.projekt`); Spread `...werte`, Kurzschreib-Schlüssel `{ werte }`
  und gleichnamige lokale Variablen gesondert behandeln. `node --check`
  prüft eine Datei nicht als Modul — erst der Bündler meldet solche
  Fehler.
- **`erg` und `anzeige`:** `erg` ist der Bemessungsdurchgang, `anzeige` die
  gewählte Kombination bzw. die Hüllkurve. Abfangjoch, Mast und Anker hängen
  an `erg`; `mitBauteilen` (core.checks) legt sie in `anzeige` und in
  `letzte.bemessung` — ein neues Bauteilergebnis gehört **dort** hinein,
  sonst erscheint es nicht in der Spalte (ist dreimal passiert, A2).
- **Datenmodell eines Blattes:** ein flacher Satz `werte` ist das **aktive**
  Tragwerk (`twId`), die übrigen stehen in `werte.weitere`. `tragwerkeVon`,
  `tragwerkSatz`, `tauscheAktives` (ersetzen, nicht überlagern),
  `tragwerkHinzu`/`tragwerkWeg` in `core.constants.js`. Masten sind eine
  eigene Liste (`mastenVon`), Tragwerke teilen sich Masten nach Lage;
  `rechensatz` projiziert Masten und Anbauteile in den Satz, den der Kern
  rechnet. Gerechnet wird nur das aktive Tragwerk (Hüllkurve ≈ 32 ms).
- **Speicher im Browser:** Arbeitsstand in localStorage
  (`tragjoch-stand-v2`, bei jeder Eingabe); Projektablage in IndexedDB
  `tragjoch` (`store.js`, Ersatz über localStorage ohne Zeichnungen);
  Datenpaket in localStorage (`tragjoch-daten-v1`, Format
  `tragjoch-daten` v2 in Tabellenform). Alles unter dem Präfix `tragjoch-`
  — der App-Name wurde «Vierendeel», die Kennungen blieben, damit alte Stände
  laden.
- **Alte Stände rechnen unverändert:** `laden()` hebt ältere Sätze an
  (Windgruppen, Anbauteilform, fehlende Tragwerksart = Joch). Jede
  Formatänderung braucht einen solchen Übergang.
- **Offline/PWA:** `sw.js` mit versionierter Ablage, neue Fassung erst auf
  Zuruf (`pwa.js`); Manifest mit Dateiannahme und Sprungliste.

Prüfwerkzeuge im Stamm: `pruefung.mjs` (Bausteine), `durchlauf.mjs`
(Durchgang), `kalibrieren.mjs` / `kalibrieren_abfang.mjs` (Messung gegen
PyNite, Ergebnisse in `kalibrierung_*`), `vergleich_*` (gegen AxisVM).
`vergleich_starrheit.mjs` ist der billige Test vor einem Umbau am
Löserkern: Starrfaktor-Reihe und Drehprobe an den vier Gurten einer
Station (26. Sept.).

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

Weitere Lehren: PowerShell-Skriptblöcke binden die Variable, nicht den Wert
(`.GetNewClosure()`); `$satz.Feld` an einem Verbund liefert eine Kopie.
Kein `str.replace` mit einem Muster, dessen Nichtleerheit nicht geprüft ist —
ein leeres Muster fügt den Ersatz zwischen jedes Zeichen ein.

## Sprache

Antworten, Kommentare und Commit-Texte auf Deutsch. Kommentare tragen das
*Warum*, nicht das *Was*.

## Diese Datei pflegen — vor jedem Commit, spätestens am Sitzungsende

Ein Kontowechsel kann jederzeit kommen. Deshalb nachführen, **sobald** es
eintritt, nicht erst am Schluss:

- **Neue Weisung oder Entscheid** → Zeile in *Entschieden* (Datum, Entscheid,
  ein Satz Warum bzw. die Messzahl). Der ausführliche Wortlaut in den
  Commit-Text.
- **Neue stehende Vorgabe** → *Stehende Vorgaben*, im Wortlaut.
- **Erledigt** → aus *Offene Punkte* streichen, in *Stand / Letzte Schritte*
  eine Zeile. Dort nur die letzten drei Arbeitstage halten.
- **Neu offen oder eine Frage an den Auftraggeber** → *Offene Punkte*,
  Entscheidungsbedarf mit ⚠.
- **Unterbrochene Arbeit** → *Laufende Arbeit*: was halb fertig ist, welche
  Dateien, was der nächste Schritt wäre. Lieber einen Zwischenstand
  committen als ihn nur im Arbeitsverzeichnis liegen lassen.
- **Teuer gelernte Regel** → zum Abschnitt, den sie betrifft.
- Kontrollenzahl im *Stand* und unter *Arbeiten* nachführen.
- **[INITIALPROMPT.md](INITIALPROMPT.md) mitführen**, sobald sich Stand oder
  nächster Schritt ändern — sie ist der Einstieg in einen neuen Chat, und
  ein veralteter Einstieg führt die nächste Sitzung an die falsche Stelle.

Nichts davon gehört in einen persönlichen Gedächtnisspeicher des Werkzeugs;
er wandert beim Kontowechsel nicht mit. Die Datei ist öffentlich: keine
Betreibernamen, Zeichnungsnummern oder persönlichen Pfade.
