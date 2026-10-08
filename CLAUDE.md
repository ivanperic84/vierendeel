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
  Seit dem 24. August wurde auf Weisung laufend gepusht (1. Oktober,
  «alles pushen und bereit machen für den account change»; seit dem
  2. Oktober gilt «pushen wenn es eine funktionierenden stand erlaubt»;
  4. Oktober: «alles für übergabe account change vorbereiten und
  startpormpt schreiben» - Arbeitsbaum sauber, gepusht, Einstieg in
  INITIALPROMPT.md). Der Zweig `github-stand-vor-push` ist der alte, von Hand
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
| Blatt Bestandesschutz; Jochanschluss als Resultierende (8. Oktober) | Im Wortlaut: «mach bei den jochreaktionen einen schalter wo man entweder die einzelnen gurte sieht oder die summe davon als resultierende», dann «Führe noch ein Auswertung für den Bestandesschutz als Output, so wie bei den Auflagerreaktionen, markiere die neuen Bauteile Rot in der Übersicht und gib eine Auswahl welche Ausnutzungen man plotten will (Gesamt / Joch / Mast / Fundamente)». **Jochanschluss** (Reiter Auflager, Block «Kräfte am Jochanschluss»): Schalter «Resultierende je Jochende» / «Einzelgurte», Vorgabe Resultierende, dieselbe gemerkte Ansicht wie beim Joch ohne Masten (`tragjoch-reaktionen-gurte`). Die Resultierende wird **je Zustand summiert, dann die Hülle** (`anschlussKraefte(…).resultierende`, core.reaktionen.js) - die Summe der Hüllwerte der Gurte wäre zu gross; dazu die Momente um die Mitte der Anschlusspunkte am Masten (Σ (r − r0) × F + Knotenmomente, global, rechte Hand). Im Browser (J90/20 m, HEB 260, zwei Hängestützen): M1 F_x −0.90 / 0.86, F_y ±4.91, F_z −6.73 / −6.29 kN, M_x ±0.99 kNm. **Blatt Bestandesschutz** (`export.bestand.js`, Knopf im Block «Bestandesschutz» und Export → «Bestandesschutz (Blatt)», A4 quer, druckbar): Übersicht aus dem Stabmodell, **die neuen Bauteile rot** - aus dem Unterschied der beiden Stabmodelle (`neueTeileSkizze`: Anbauteil-Stäbe und -Knoten, die das Modell des Bestands nicht führt); Urteil, Regel, Liste der neuen Teile; je gewählter Gruppe ein Balkenbild (grau Bestand, blau mit neuen, rot über der Grenze) und die Tabelle. Kästchen in der Leiste **Gesamt / Joch / Mast / Fundamente**; jede Zeile des Vergleichs trägt dafür `gruppe`. «Gesamt» = je Gruppe das massgebende Bauteil - **bestätigt** («das ist genügend»); Knicken und Anker stehen beim Masten, die Aufhängung des Tragauslegers beim Joch (meine Lesart). Das Blatt rechnet nicht (Zahlen = Block der Seitenleiste). Im Browser: Hängestütze bei 5 m neu → rot, Joch 0.453 → 0.595 (Δη +0.142, vertiefter Nachweis), Mast M1 0.693 → 0.726, Fundament M1 0.864 → 0.907; «Joch» abgewählt: drei Bilder. ⚠ Teile ohne eigenen Stab im Modell (Teile am Masten von Abfangjoch und Tragausleger: nur Lasten am Knoten) erscheinen nicht rot, stehen aber in der Liste; an Abfangjoch, Tragausleger und in einer Reihe nicht im Browser angesehen. **Nachtrag selber Tag**, mit Bildern: «die beiden boxen kleben aneinander. Welche ausnutzung wird hier aufgeführt? die globale des tragwerks?» - Abstand zwischen Kachel und Blattknopf (8 px). **Befund Projektliste:** die Spalte η führte nur das Joch aus dem Ersatzbalken (`erg.max.etaGesamt`; 0.58 neben «η 0.907 Fundament M1» in der Fussleiste). Jetzt vermerkt das Speichern das **Gesamturteil der Fussleiste** (`urteilKurz`: η, massgebendes Bauteil, Quelle Stabwerk / Ersatzbalken; `kennwerte.eta`, `etaWer`, `etaQuelle`), die Spalte heisst «η max»; auf «Zahl alleine geügt, die liste soll schlank bleiben» steht nur die Zahl da, das Bauteil im Titel der Zelle (im Browser 0.91, Fundament M1). ⚠ Ältere Einträge behalten die Joch-Zahl, bis sie neu gespeichert werden (der Titel der Zelle sagt es). Nicht gepusht. Prüfstand 228, 258 |
| Windlasten auf Joch und Mast von Hand, zurück auf die Datenbank (8. Oktober) | Im Wortlaut: «kannst du noch unter lasten das bearbeiten der Windlasten auf Joch und Mast bearbeitbar machen und wieder zurücksetzen auf Datenbank werte.» **Joch:** bestand - «Werte bearbeiten» im Reiter *Lasten* gibt g_k, w_k, s_k frei (`lastHerkunft: 'manuell'`), «Tabellenwerte» setzt zurück. **Mast:** beantwortet die offene Frage vom 20. September (ein flaches Feld für mehrere Masten): die Zahl steht **je Mast und Richtung** in der Mastliste (`windX` quer, `windY` längs zum Gleis, kN/m charakteristisch; MASTFELDER `mastWindX/Y`, `…B`). Die Felder w_Mast,x / w_Mast,y gelten dem angewählten Masten, sind gesperrt bis «Werte bearbeiten» und zeigen sonst die Tabelle; eine Zahl gilt vor der Tabelle, die andere Richtung bleibt Tabelle. Der Hinweis am Feld sagt «VON HAND» und nennt den Tabellenwert. **«Tabellenwerte» nimmt den Mastwind von Hand an ALLEN Masten weg** (`mastWindZuruecksetzen`, Meldung im Balken). Eine Stelle für alle Leser: `mastWindBeide(…, hand)` (data.masten.js) - Kern (`mastWindSatz`), Abfangjoch und Tragausleger (`mastWindHand`). **Befund beim Bau, vom Prüfstand gefunden:** Ende B erbte die Zahl von Ende A, solange B selbst keine trug (`mastZwei` wird nur gesetzt, wenn beide Werte da sind und abweichen) - jetzt schreibt `rechensatz` alle vier Felder ausdrücklich (null = Tabelle), und B liest nur seine eigenen. **Gemessen** (Prüfbelegung J90/20 m, HEB 240, EK1, Stabwerk): M1 mit 0.50 quer / 0.60 längs statt 0.30 / 0.30 → Mast M1 0.786 → 0.979, M2 praktisch gleich; Summe der Streckenlast am Masten M1 = 0.60 × 8.50 m. Im Browser (eigener Server): entsperrt, w_Mast,y 0.33 → 0.60 und w_k 0.43 → 0.90: η M1 0.693 → 1.365; «Tabellenwerte»: alles zurück, η 0.693. ⚠ Wie bisher bleibt eine Eingabe bei einem Wechsel der Windstufe stehen (sie ist dann kein Tabellenwert mehr). ⚠ Am Abfangjoch gilt die Zahl des Masten am Ende A für beide Masten (dort ein Profil für beide). Das alte flache `wMast` liest niemand. **Nachtrag selber Tag**, im Wortlaut: «kann man so den wert auch auf null setzen beim wind? gib noch einen hinweis unten rechts im feld, dass es sich um angepasste werte handelt» - **Null ist eine Eingabe** (nicht «leer = Tabelle»): im Browser w_Mast,y = 0 an M1 → η M1 0.693 → 0.520, M2 0.691; dazu w_Mast,x = 0 und w_k = 0 → M1 0.052, M2 0.206; bleibt nach dem Neuladen. **Hinweis** in der Zeile der Grundwerte unten rechts im Bild, in der Warnfarbe: «Lasten von Hand (Joch, Mastwind)» - «Joch», solange «Werte bearbeiten» steht (auch mit unveränderten Zahlen: sie folgen dann nicht mehr der Datenbank), «Mastwind», wenn ein Mast des Blattes eine Zahl trägt. Nicht gepusht. Prüfstand 260 |
| Gespreizte Masten DGP (8. Oktober) | Im Wortlaut: «Hier hast du noch die Zeichnungen zu den DGP Masttypen … Grundlagen\Gespreizte Masten Implementiere diese wie die übrigen Masten und führe tests durch. Nach dem beenden der Aufgaben meldung absetzen und auf befehl push warten, ich will zuerst den stand der momentan vorhanden ist weitergeben und testen. Falls du es sinnvoll findest kannst du auch vorgängi die Berichtvorgabe fertigstellen.» **Gelesen** (vier Zeichnungen, Vektor mit Text): ein HEB (240 bzw. 260), im unteren Teil L1 (5.50 bzw. 10.00 m) längs in der Stegmitte geteilt, die Hälften am Fuss auseinandergezogen (Aussenmass über die Flansche 518 bzw. 600 mm), bis L1 geradlinig auf die Profilhöhe; zwischen den Steghälften Bindebleche FLA 120×10 (auf der Fussplatte 150 bzw. 300 breit, auf 1290 mm eines mit 40 mm), Mastlänge 6.0-16.5 m (DGP26/10 bis 18.0 m). **Daten:** neue Tabelle `gespreizt` in `data/masten.json` (örtlich, Sicherung `masten_vor_gespreizt_2026-10-08.json`): Typ, Profil, L1, Fussmass, Fussplatte, Längen, Höhen und Breiten der Bleche, Stückliste; Katalog (17 Abschnitte) und Tabellenaufbau. Die Blechlängen der Stückliste gehen bei allen vier Typen mit «lichte Weite zwischen den Steghälften + 5 mm» auf 1.5 mm auf. Fundamente zugeordnet: DG1a = DGP24, DG2a = DGP26 Steg quer, DG3a = DGP26 Steg in der Jochachse (**meine Lesart** von «DGP26-P» der Fundamenttabelle, wie beim DPM24-P). **Sortiment:** `gespreizteMasten`, `gespreiztGeometrie`, `halbesProfil` (T aus Flansch, halbem Steg und Ausrundungen: Fläche und I_z genau die Hälfte); im Mastwähler als Profil mit den Werten und dem Wind des Walzprofils (`gespreizt`, `basis`). **Stabwerk** (`export.axisvm.gespreizt.js`, letzter Schritt wie beim Gittermast): unter L1 zwei Gurte (T auf der Schwerachse, lokal z = Stegrichtung) und die Bindebleche in der Stegebene mit starren Enden bis zur Stegkante; Schotte am Fuss, bei L1 und an jedem Anschluss dazwischen; darüber das Walzprofil auf der Achse. Ein Blech unter 20 mm lichter Länge ist eine starre Verbindung. Mastwind je zur Hälfte auf die Gurte (**Annahme: Wind wie am Walzprofil** - die Mastberechnung der alten Norm führt denselben Wert). **Nachweis:** Hälften über A, W_y (Stegkante), W_z aus der Datei (`form: 'T'`), mit der Stahlgüte des Masts; Bleche wie am Joch; Profil wie jeder Mast. Fundament aus dem Auflager; **kein Knicken als Vollstab** (wie beim Gittermast). Kern (vorläufige Anzeige): das Walzprofil. **Bild:** zwei Hälften und Bleche unter L1 (`gespreiztFlaechen`), aus dem Stabwerk gefärbt. **Kacheln** «Hälften», «Blech», «Profil»; Bericht mit eigenem Abschnitt. **Brücke:** `AddT` für `form: 'T'` - ⚠ in AxisVM nicht erprobt (Reihenfolge der Masse nach AddI angenommen, Lage des Flansches nicht vermessen); SAF und DXF brechen mit Grund ab. **Gemessen:** Einzelmast 10 m, EK1: HEB 240 Mast 0.271; DGP24/5.5 Hälften 0.271 (Wind quer zum Steg massgebend, dort hilft die Spreizung nicht), Blech 0.052, Profil 0.056, Fundament 0.353 → 0.240 (DG1a statt DP2a). Kopfweg unter 1 kN: quer zum Steg 40.5 mm = F·L³/(3·E·I_z), in Stegrichtung 5.71 mm gegen 14.10 mm ungespreizt. J90/20 m auf zwei Masten (Prüfbelegung): HEB 240 Mast 0.786, Fundament 0.806; DGP24/5.5 Hälften 0.794, Blech 0.053, Profil 0.206, Fundament 0.548. PyNite (`vergleich_gittermast.mjs "DGP24/5.5"`, auch `quer`, DGP26/10): sieben Lastfälle 0.000 %. Im Browser (eigener Server auf anderem Port): Wähler, Kacheln, 3D, Profiltafel, Bericht. **Nicht getan:** die Berichtvorgabe (Statikbericht über COM) - sie braucht AxisVM-Läufe und eine Vorlage .rep. **Nicht gepusht** (Weisung). `Versand/` unberührt: Datenpaket, Einzeldatei und COM_Bruecke dort sind der Stand vor den gespreizten Masten. Prüfstand 259 |
| Gittermast IV 45 UL nach der Detailzeichnung (8. Oktober) | Im Wortlaut: «im Ordner kombinierte Masten unter Grundlagen habe ich dir die detailzeichnung … Typ IV UL45.pdf abgelegt studiere diese und korriegieren den hinterlegten gittermasten wenn nötig.» Gelesen (Scan, Ansichten in beiden Richtungen, Schnitte am Fuss und Kopf, Stückliste). **Abweichungen vom hinterlegten, aus der Übersicht abgeleiteten Typ - alle berichtigt** (beide Einträge 16.2 / 17.7; `data/masten.json` örtlich, Sicherung `masten_vor_IV45UL_zeichnung_2026-10-08.json`): (1) **Gurt unten L 100x100x12** statt L 120x120x12 (oben L 80x80x10 stimmte); (2) **Teilung unten 13 Stationen** (140 / 555 / 9 × 525 / 535 / 545) statt 11 wie am quadratischen Typ, **oben 15 Stationen** (5 × 526 / 10 × 530, dann 70 mm bis zur Kopfplatte) statt 16 × 500; (3) Aussenbreiten je Station aus der Zeichnung (Richtung a 449 … 383 … 300, Richtung b 446 … 240) - die abgeleiteten lagen bis 2 mm daneben; (4) **Bleche unten 100×12, erste Station 160×12, oben 100×10** statt 10 / 8 mm; (5) am Knick ein Blech von 40 mm in Richtung b (mit L 120 stiessen die Schenkel zusammen, eine starre Ersatzverbindung stand im Modell - sie entfällt); (6) **am Kopf kein Bindeblech**, nur die Kopfplatte - neues Feld `kopfBlech: false` (Katalog, `gittermastGeometrie`); (7) Gewicht roh 1067 kg. Bestätigt: Aussenmass 450/450 am Fuss, 383/240 am Knick, 300/240 am Kopf, Höhen 6.50 + 8.00 m. Die Blechlängen der Stückliste gehen mit Aussenbreite − 2 · Schenkel auf (13 Stationen in a, 11 in b; an der Station vor dem Knick nennt sie in b 68 statt 58 mm). **Vereinfacht wie an den übrigen Typen:** am Knick stehen je Seite zwei 50 mm breite Bleche (12 und 10 mm), im Modell eines 50×12. **Nicht auf der Zeichnung:** der Mastaufsatz (bleibt 180 × 180 × 6 aus der Übersicht) und Rippen im Unterteil. **Gemessen** (Beispielblatt J120-alt 24 m auf II 45 und IV 45 UL 17.7, Stabwerk, EK1, vorher → nachher): Mast M2 Gurt 0.874 → **0.813**, Bindeblech 0.424 → **0.574**, Joch 0.706 → 0.719, 1375 / 1754 → 1399 / 1782 Knoten / Stäbe; Ersatzprofil Wind EK1 0.494 / 0.515 → 0.438 / 0.464 kN/m. PyNite (`vergleich_gittermast.mjs`): sieben Lastfälle ≤ 0.005 %. ⚠ Nicht im Browser angesehen; nicht in AxisVM gebaut; die Probe gegen das Bemessungsdiagramm (Durchbiegung je Tonne) nicht neu gemessen. Prüfstand 207 |
| Einheitswind, Nachtrag: Lampen, alte Abfangjoche, Gittermast, Leiter (8. Oktober) | Antwort auf die offenen Punkte, im Wortlaut: «das es sich um alte werte handelt sind die alten lampen damit sicher zu versehen. bei den LED kann man den heutigen wert nehmen und die 1 kN/m2 ansezen und den Formbeiwert von 1.4 redutieren. alte abfangjoche den zuschlag von 1.25 weglassen und die werte der excel auf diese reinterpretieren. Für die Gittermasten ist auf der heutigen logik heraus die umrechnung auf den einheitswind vorzunehmen und bei den leitern auf 1.0 kN/m setzen der formbeiwert ist eh 1.0». **Alte Lampen:** Lampe alt 0.3 kN, Lampe alt + Befestigung 0.5 kN (Zuordnung von «Lampe» und «Lampe auf Joch» der Mappe, bestätigt: «lampen zuordnung passt»). **LED:** Tabellenwert / (q · 1.4) - das ist die bestehende Herleitung, nichts geändert. **Alte Abfangjoche** (UAP 130 … 250, UAP 300, IPE 270 / 330 / 360): Profilhöhe × 1.0 als `wind/1.0` im Sortiment, die Regel im Code ohne den Zuschlag (UAP 200 0.25 → 0.20 kN/m; Sicherung `abfangjoche_vor_einheitswind_alt_2026-10-08.json`). **Gittermast:** **meine Lesart** - dieselbe Rechnung wie für EK1-EK3 (Windlast je Meter des Tragjochs / seine Windangriffsfläche, Mittel J60-J130) mit dem Einheitswind der Tragjoche: 1.584 / 1.621 / 1.509 / 1.589 / 1.480 / 1.418 / 1.452, Mittel **1.52 kN/m²** (`windJeFlaeche/EK0`, `gitterEinheitJeFlaeche`; vorher 1.0 × 1.25; EK1 / (0.9 · 1.4) gäbe 1.51); Rohr und Aufsatz bleiben d bzw. Kante × 1.0. **Leiter ohne Wert der Mappe** (Cu 95 × 3 / × 4, Aldrey 300): Tabellenwert / q, Formbeiwert 1.0 - bestehende Herleitung; die Leiter mit Wert der Mappe bleiben bei diesem (bestätigt: «leiter mit mappenwert belassen»). Gemessen Beispielblatt (J120-alt 24 m, Einheitswind): Mast M1 (II 45) 0.550 → **0.600**, Mast M2 (IV 45 UL) 0.563 → **0.601**. Der Tragausleger hat einen Wert der Mappe; sein Rückfall ohne Eintrag bleibt Profilhöhe × 1.25. Prüfstand 207, 209, 254 |
| Einheitswind: Werte der Mast-Mappe als EK0 (8. Oktober) | Im Wortlaut: «kannst du noch die einheitswind lastdaten aus der excel unter … Grundlagen\Einheitswind herauslesen für die tragwerke und bauteile», dann «die bisherigen angaben bezüglich einheitswind waren annahmen, die werte aus der excel übernehmen und als EK0 hinterlegen in der app global». Quelle: die Mastberechnung nach alter Norm unter `Grundlagen/Einheitswind` (Staudruck 1 kN/m²; Blatt der Mastdaten und Auswahllisten der Lastzeilen), Auszug örtlich in `Versand/Einheitswind_Mappe_Lastdaten.md`. **Ändert die Herleitungen vom 3. und 7. Oktober** (Angriffsfläche, hintere Ebene 25 %): ein hinterlegter Wert gilt vor der Herleitung und **ohne Zuschlag** (meine Lesart: die Mappe ist der Wert der alten Bemessung). **Daten** (örtlich, Sicherungen `…_vor_einheitswind_mappe_2026-10-08.json`): `tragjoche.json` neue Spalte `wind/1.0` (J60-J130 0.25 / 0.28 / 0.29 / 0.35 / 0.39 / 0.43 / 0.48 kN/m, **neu und alt gleicher Nummer** - meine Lesart, die Mappe unterscheidet nicht); `abfangjoche.json` `wind/1.0` für A160-A360 = Profilhöhe (0.16 … 0.36); `masten.json` `wind/quer/EK0`, `wind/laengs/EK0` (HEB 200-260 = Profilbreite, HEM 240 0.248 / 0.27 - Fwx = quer, Fwy = längs, an den Verhältnissen der EK1-Zeile abgelesen); `fl_bauteile.json` Spalte EK0: Fahrleitung 0.020 (auch mit Fd 150 und R-FL; Ts und Fd einzeln je 0.010 nach dem Entscheid vom 7. Oktober), Cu 95 0.0083, 2 × 95 0.0141, Cu 150 0.0105, 2 × 150 0.0178, Hängestütze 0.10 kN/m, Jochaufsatz einfach 0.45 / 0.45, doppelt 0.9 quer / 0.8 längs, alt 0.20 kN/m, Ausleger Rohr 0.3 / NT 0.5 kN längs, Leiter-Traverse 0.08, Tragausleger 0.14 kN/m, dazu die Zeilen der Masten, Trag- und Abfangjoche. **Code:** Katalog führt die Spalten; `charakteristischeLasten` (Tragjoch), `abfangWind`, der Auslegerwind im Stabmodell lesen zuerst den hinterlegten Wert, die Herleitung bleibt der Rückfall (Typ ohne Eintrag, älteres Datenpaket, Testdaten). **Bleibt hergeleitet, weil die Mappe nichts führt:** Gittermast, Abfangjoche alter Bauweise (UAP, IPE; Profilhöhe × 1.25), Lampenrohr, Konsolen, Abfangrohr, Trafo, Cu 95 × 3 / × 4, Aldrey 300, freie Fläche / Signal. ⚠ **Lampen nicht übernommen** - die Mappe führt «Lampe auf Joch 0.5 kN» und «Lampe 0.3 kN», die Lasttabelle Lampe alt / alt + Befestigung / LED / LED + Befestigung; Zuordnung erfragt. **Gemessen** (Stabwerk, HEB 260, Einheitswind, vorher → nachher): J90/20 m mit NT-Ausleger bei 10 m w_k 0.275 → **0.350**, OG 0.444 → 0.467, UG 0.412 → 0.445, Blech 0.530 → 0.544, Mast 0.484 → **0.566**; J130/30 m ohne Teile w_k 0.389 → **0.480**, Blech 0.293 → 0.349, Mast 0.809 → **0.962**; A160 0.20 → 0.16, A360 0.45 → 0.36 kN/m. EK1-EK3 unverändert (J90 0.702, J130 1.167). Die bisherigen Annahmen lagen am Tragjoch also auf der unsicheren Seite. Nicht im Browser angesehen (keine Änderung an der Oberfläche ausser dem Hinweistext). Datenpaket vom 8. Oktober. Prüfstand 209, 210 nachgeführt |
| COM-Brücke brach bei jedem Start ab (8. Oktober) | Bugreport eines Anwenders (Ordner `bugs/`, örtlich; J80-alt 21 m mit Masten), im Wortlaut: «es gab wieder probleme bei einem user mit dem ausleiten, siehe bug report unter dem ordern bug, heute hochgeladen.» Meldung der Brücke: «Der Wert "System.String" kann nicht in den Typ "…SwitchParameter" konvertiert werden», Zeile 70 `$bericht = Join-Path …`. **Befund:** der am 7. Oktober gepushte Schalter hiess `-Bericht`, `$bericht` ist zugleich der Pfad der Berichtsdatei, und PowerShell unterscheidet die Schreibweise nicht - die Zuweisung scheiterte bei JEDEM Aufruf, auch ohne den Schalter, bevor die Modelldatei gelesen war. `origin/main` trug das von `e04c914` bis `0320fad`. Behoben mit der Umbenennung in `-Statikbericht` (örtlich seit dem ersten Testlauf, Parser 0 Fehler); auf «alles offene nachführen und dann pushen» gepusht - **meine Lesart: alles, auch der Statikbericht in Arbeit** (er läuft nur mit `-Statikbericht` und `-Rechnen`). `Versand/COM_Bruecke` ist gleich `com/` und dem Anwender neu abzugeben. ⚠ Die Modelldatei des Anwenders ist in AxisVM nicht gebaut (nur auf Anweisung); ob danach ein zweiter Befund kommt, ist offen. **Lehre:** ein Parameter der Brücke darf nie wie eine Skriptvariable heissen; nach jeder Änderung am Parameterblock die Brücke einmal starten (`AxisVM_pruefen.cmd`), bevor gepusht wird |
| Fundamentablauf, Gelände über 14°, Doppelanker (7. Oktober) | Weisungen: «bei den zulässigen standardlasten gibt es einen flow der bei einer überschreitung der einzelnen werte die kompensation infolge der abminderung der übrigen werte vornimmt. dies ist in einer alten berechnungexcel abgelgt», dann «fundamentflow und gelände >14° einbauen, danach doppelanker». Quelle: `Grundlagen/Mastberechnung alt.xlsm` (Durchsicht in `Versand/Mastberechnung_alt_Durchsicht.md`, örtlich). **Ablauf** (`fundamentAblauf`, core.fundament.js) je Richtung quer/längs, 19 Schritte wie die Mappe: Überschreitung beim veränderlichen Anteil mindert den zulässigen ständigen (red_M), Überschreitung der Horizontalkraft das zulässige Moment (red_H); V, T, M_tot und die Grenze M_ver hart; Ergebnis Basis / mit abgeminderten Werten / grösseres Fundament. Zwei Stellen wie die ZELLEN der Mappe (Schritt 12 addiert, Schritt 10 mit red_M), bestätigt: «schritt 12 und 10 so belassen wie angenommen.» **Daten:** neue Tabelle `fundamentlasten` in `data/masten.json` (örtlich, Sicherung `masten_vor_fundamentlasten_2026-10-07.json`): je Typ und Gelände (bis14 / ueber14 / ueber14fallend) Basis-, Grenz- und Abminderungswerte, Zuordnung zum Profil; bis 14° gleich der bisherigen Tabelle. **Gelände** je Mast (`MASTFELDER` gelaende, Feld «Gelände am Mastfuss»), die Fundamentwahl bietet, was die Tabelle dort führt (kleinster als Vorgabe). Schritt 1 prüft neu auch die ständigen Anteile und die veränderlichen längs: J90/20 m M1 0.473 → **0.947** (H_l veränderlich 8.05 von 8.5 kN), Tragausleger 13 m mit Längsanker 0.6765 → 0.7613 (M_q ständig). Beispiel der Mappe (DP22 auf DP1a/2.1): zulässig in Schritt 6 wie die Mappe. **Doppelanker** (Weisung 6. Okt. «Doppelanker Zug als Funktion aufnehmen»): Typ DA20 im Ankerkatalog (zwei Seile ⌀20, 134 kN, doppelte Fläche; Sicherung `anker_vor_doppelanker_2026-10-07.json`); die Ankerkachel nennt bei Überschreitung auf Zug die nächste Stufe (`ankerReichtZug`: Seilanker → Stütze → Doppelanker → keiner, wie die Mappe). Der Kern rechnet den Anker starr (gleiche Kraft, halbes η), das Stabwerk mit der Seilsteifigkeit. Prüfstand 248, 249 |
| Anschnitt ohne Knotenbereich; Verläufe Gittermast; Signalsymbole (7. Oktober, spät) | Mit Bildern der Verläufe: «kannst du bei diesen darstellungen auf die eingestellten werte plotten (hier sollte ohne die spannung in den knotenbereichen abgebildet werden). könnte man dies auch noch optimieren?» **Befund:** sitzt eine Klemme genau am Blechrand, geht ihre Kraft in den steifen Abschnitt; mit «Anschnitt» wurde dieser an seinem Rand ausgewertet (J90/20 m, Hängestütze bei 8 m: UG 0.686 im Knotenbereich, freier Gurt 0.512). Auf Rückfrage **«Knotenbereich ganz draussen»**: mit «Anschnitt» tragen steife Abschnitte kein η (`imKnoten`, core.stabnachweis.js), stehen aber mit Kräften und Wegen weiter in der Liste; Verläufe lassen sie aus (keine Null-Zacken), Bild ohne η/σ_v dort; «Schwerachsen» wie bisher. **Gittermast** (Rückfrage «Bleche als Stufen je Feld», «Knotenbereich am Fuss weg»): der Gurt wird mit «Anschnitt» um die halbe Blechhöhe vom Knoten weg ausgewertet (`anschnitt` je Gurtknoten in der Meta des Gittermasts), die Bleche im Verlauf als Stufe bis zur nächsten Station. Gemessen alter → neuer Code (Anschnitt): J90/20 m, HEB 260, NT-Ausleger bei 8 m OG 0.627 → **0.523** (massgebend war `OGR_S33`, steif), UG 0.544, Blech 0.622, Masten 0.712 / 0.700 unverändert; Einzelmast Gittermast I 30 Gurt 0.427 → 0.394, I 45 0.260 → 0.246. «hier sind die bilder für die signale unter der einwirkungen excel. kannst du einfache abstrakte symbole daraus machen und nicht die bilder selbst übernehmen»: 26 SVG-Symbole aus Grundformen (Tafel, Lampenschirm, Ziffern) in der Spalte `bild` von `signalteile` (örtlich, Sicherung `anbauteile_vor_signalsymbole_2026-10-07.json`; Erzeuger `Versand/signalsymbole.mjs`, Übersicht `Versand/signalsymbole_uebersicht.html`). «unter Auflager eine Tabelle zu Kräfte am Jochanschluss ergänzen»: `anschlussKraefte` (core.reaktionen.js) - je Link `LINK_<Mast>_<OG|UG><L|R>` die Kraft des Jochs auf den Masten aus k_G·u, global, F_z nach oben, Hülle über «Ständig» und «Ständig + Wind / Schnee»; Block unter den Reaktionskräften (nur mit Stabwerk). Kontrolle J90/20 m: Σ F_z unter «Ständig» −11.774 kN = Joch; OG ohne F_z, UG ohne F_x (Lagerung). Prüfstand 258 |
| Traverse und Konsole am Masten (7. Oktober, spät) | Im Wortlaut: «bei den traversen und konsolen an Mast die abhängigkeit kraft in stabmitte prüfen und ob es mit einem untergeordnetem leiter zusammen den endpunkt teilt um ihn nachträglich ziehen zu können per drag and drop, so wie bei den Auslegern oder hängestützen am Joch der fall ist.» **Befund:** Konsole (Fahrdrahtabzug, Mitte 0.50 / Fahrdraht 1.00) und Ausleger am Masten (1.25 / 2.50) stimmen, Ziehen nimmt den Leiter mit (L 1 → 2: 1.00 / 2.00); die **Leiter-Traverse** stand mit Traverse UND Leiter auf der Mastachse (x 0, ohne Hebel, ohne Endgriff). Auf Rückfrage **«Einseitig auskragend»** und alte Stände **«Belassen»**: Vorlage Traverse x 0.50, Leiter x 1.00 (Sicherung `anbauteile_vor_traverse_einseitig_2026-10-07.json`); gesetzte Traversen bleiben. Gemessen J90/20 m, HEB 260, Traverse an M1 auf 8.00 m (Stabwerk): M1 0.6803 → 0.6808, M2 0.6707 → 0.6691. Der Prüfstand führt die alte Traverse als Prüfvorlage weiter; Abschnitt 257 prüft die Datei, das Ziehen und den Endgriff auf dem Leiterpunkt. ⚠ Das Ziehen am Masten selbst ist im Browser nicht ausgeführt (Griff zu klein im Bild), es läuft über denselben Weg wie am Joch. Antworten davor: Fahrdrahtabzug an Mast B nicht spiegeln; «Verformung ohne Havarie» belassen. Prüfstand 257 |
| Gittermast-Wind je Richtung; Havarie-Leiter ohne Klick; Drahtwerke ordnen; Statikbericht über COM (7. Oktober, spät) | Antworten auf die Rückfragen: **Fahrdrahtabzug an Mast B «nein nicht spiegeln»** (x bleibt global); **«Verformung ohne Havarie» «erstmal belassen»** (meldet sich, wenn es wieder vorkommt). Mit Bild: «ein gittermast i 30 ist asymetrisch in der grundform die windlasten sind hier die gleichen in x und y. ist bei allen gittermasten zu checken», dann «theoretisch sollte beim 30er gittermasten unterschiedliche wind in x und y resulteren, da die angriffsfläche in breitseite grösser ist. was kannst du dagegenhalten?» - **Befund:** das Stabwerk rechnete je Höhe mit der Fläche dieser Höhe (I 30 im Unterteil Wind in a 0.155, in b 0.232 m²/m; Summe Wind X 1.85 / Y 2.32 kN), die Maske und der vorläufige Kern lasen aber das Ersatzprofil mit dem Wert AM KOPF, wo der I 30 quadratisch ist (0.161 / 0.161). Jetzt führt das Ersatzprofil je Richtung das Grösste über die Höhe (`gitterWindflaecheMax`), das Stabwerk skaliert auf denselben Bezug (Summen gleich auf Rundung). EK1 vorher → nachher: I 30 / I 30 UL 0.305 / 0.305 → **0.305 / 0.441**, IV 45 UL 0.334 / 0.372 → 0.494 / 0.515, I 45 0.305 → 0.368, II 45 0.335 → 0.400 kN/m. «kannst du diese darstellung auch für den havariefall übernehmen, ohne das man daraufklicken muss um zu sehen wo die leiter sind»: solange der Reiter Lasten offen ist, stehen alle Leiter der Havarie-Liste im 3D (`havarieLeiterMarken`, Warnfarbe = kann reissen). «hier war mehr die idee das man die ordnung mit name / abschnitt x oder z vornemen kann in der liste und nicht als eigenständige filter»: die Gliederungen wieder Typ / Gruppe / Bauteil / Einzeln, dazu «Ordnen nach Name / Lage x / Höhe z» und die Spalten x, z. «kannst du auch mit hilfe der abhandlung com ein template für einen statikbericht generieren lassen. so viel wie nötig an plots generieren lassen»: Schalter `-Statikbericht` der Brücke (siehe com/LIESMICH.md): Modell, je massgebende Kombination (aus der App, Feld `bericht`) N/V/M/T/σ_v, Verformung unter Betriebswind, Auflagerkräfte; Zeichnungsbibliothek + EMF; ein Bericht nur mit Vorlage .rep (`NewFromTemplateFile` - leere Berichte legt die Schnittstelle nicht an). ⚠ In AxisVM nicht erprobt. **Befund Signalbauer:** in `data/anbauteile.json` (und jedem örtlichen Paket) trägt keines der 41 Signalteile ein Bild - die Bilder kamen am 4. Oktober in der Cloud-Sitzung dazu, das Paket von dort liegt hier nicht; Code und Spalte `bild` sind da. Pfad der Einwirkungs-Mappe erfragt. Frage «wo kann man die auflagerreaktionen bei den jochbefestigungen herauslesen?»: im Stabwerk nur über die Bügelschrauben-Kachel (Kraft x je Gurt); die Klappe «Jochauflager je Gruppe» steht nur beim Ersatzbalken - Rückfrage gestellt. Prüfstand 256 |
| Sammelliste 7. Oktober abends: Lastgenerator, Havarie Punkt für Punkt, Wind Ts/Fd halb/halb, Verläufe Gittermast u. a. | Wortlaut je Punkt im Commit-Text. Auf Rückfrage: **Wind halb/halb** - StCu 50/92 und Cu 107 einzeln je die Hälfte der Zeile «Fahrleitung mit Fd 107 mm²» des Blatts Windlasten 2 (0.010 / 0.012 / 0.0145 kN/m; vorher je 0.0085, zusammen 15 % weniger als das Kettenwerk; Sicherung `fl_bauteile_vor_wind_ts_fd_halb_2026-10-07.json`); **«Bauteildatenbank global» ist gebaut** (eigene Vorlagen, 253), **«Mastaufsatz weglassen» ist gebaut** (252); **Jochaufsätze «Anzahl + Wahl Δ/Verhältnis»**. **Lastgenerator:** Δ zur Gleisachse je Vorlage (`delta`), Jochaufsätze nicht ans Gleis gebunden (`aufsatzLagen`: verteilt L·i/(n+1) oder Abstand Δ symmetrisch zur Jochmitte, Gruppe «Jochaufsätze»), Montagehöhe und Mastlänge im Dialog (leer = bleibt). **Havarie:** Tabelle wie die Drahtwerke (Leiter A1.2, Typ, Lage), Überfahren zeigt den Leiter (`AT<i>#<k>`); «Punkt für Punkt»: ein Kettenwerk ist nur an DERSELBEN Stelle ein Leiter - Kennung `kw:<Name>@joch:<x>` bzw. `@mastA:<Mast>`; alte Wahl `kw:<Name>` gilt für jede Stelle, beim Verschieben wandert die Wahl mit (`havarieNachfuehren`). **Drahtwerke:** Gliederung Name / Lage x / Höhe z; je Leiter ein Strich im 3D, Bündel und Anzahl als mehrere (0.12 m auseinander). **Griff am Ende** nur, wenn die Maus näher als 70 px ist oder das Teil gewählt. **Verformte Figur:** Ketten der Anbauteile rechtwinklig (z, y, x) wie im 3D, Knickpunkte als Starrkörper am Anschluss. **Reaktionen** der alten Joche (`AUF_A_L/R`) als Resultierende je Jochende, auch in der Reihe (J120-alt/24 m ohne Masten Ende A V 10.76 kN statt 2.31 + 8.46 auf zwei Zeilen). **Verläufe Gittermast** über die Höhe (η Gurt/Blech/Rohr, |N| Gurt, |M| Rohr). **Geprüft, nichts zu ändern:** Leiterwind quer = F_x (quer zum Gleis) über die Spannweite; Gittermast-Wind quer/längs (Rechtecktyp I 30: Wind in a trifft die schmale Seite, mit der Stegrichtung getauscht); Auslegerkonsole am Masten (Gesamtlänge 1 m, Punkt in der Mitte, Gewicht 0.25 und Wind längs 0.18 kN/m × 1 m, Fahrdraht am Ende). ⚠ An Mast B zeigt die Vorlage «Fahrdrahtabzug am Mast» nach aussen (x global, Entscheid 19. Sept.) - beim Auftraggeber erfragt. ⚠ «Verformung rechnen, wenn Havarie nicht aktiv»: an der Prüfseite nicht nachzustellen (Kacheln und Figur kommen) - Fall erfragt. Gemessen J90/20 m, HEB 260, Hängestütze mit NT-Ausleger R-FL bei 10 m, EK1: Wind quer der Teile 1.166 → 1.286 kN, η unverändert (Wind längs massgebend). Prüfstand 255 |
| Einheitswind mit hinterer Ebene; Bemessungsvorschlag; Änderungsprotokoll (7. Oktober) | Im Wortlaut: «addiere beim einheitswind (1.0 kN/m2 bei den jochen die hintere ebene mit 25% auf mach das auch bei den gittermasten. die übrigen anbauteile können zurückgerechnet werden, falls keine werte vorhanden sind. beim einheitswind gab es keine formbeiwerte. wir können also die Werte mit dem faktor 1.4 abmindern» - ändert die Weisung vom 3. Oktober («die zweite eben wird nicht … mitgenommen»). Auf Rückfrage: **auch Abfangjoch und Tragausleger**, **Leiter bleiben bei c = 1.0** («Die leiter haben heute schon den formbeiwert 1.0»); die übrigen Anbauteile rechneten schon mit ÷ (q · 1.4) zurück. Eine Konstante `EINHEIT_EBENEN = 1.25` (data.fl.js): Tragjoch w_k = Fläche × 1.0 × 1.25, Abfangjoch Profilhöhe × 1.25, Tragausleger UPE-Höhe × 1.25, Gitter des Gittermasts × 1.25 (Rohr / Aufsatz einfach). Gemessen (Prüfseite J90/20 m, HEB 260, mit Anbauteilen, Stabwerk, Einheitswind): OG 0.516 → 0.519, UG 0.602 → 0.618, Blech 0.618 → 0.624, M1 0.482 → 0.544, M2 0.478 → 0.540; J90/20 m w_k 0.2203 → 0.2754 kN/m, A160 0.16 → 0.20 kN/m. «hier den bemessungvorschlag aufführen von allen relevanten tragwerksteilen», auf Rückfrage «Vorschlagsblock oben … wobei man auch ein feld haben sollte wo man die reserve eingeben kann»: oben im Fenster «Sortiment durchrechnen» je Teil die leichteste Wahl mit η ≤ 1 − Reserve (Jochtyp nach kg/m, Walzprofil je Mast nach kg/m, Fundament aus den Kandidaten zum jetzigen Profil, Anker aus dem Katalog), je ein Teil verändert, gerechnet über `rechneTragwerk` (Kern mit Kombinationen, rund 3 s); «übernehmen» je Zeile, danach rechnet das Stabwerk. Reserve im Browser gemerkt (`tragjoch-vorschlag-reserve`). Im Browser: J70 → Vorschlag J90-alt 0.762, M1/M2 HEB 220 (bzw. HEB 240 mit 10 % Reserve), Fundamente wie jetzt; «übernehmen» setzt M1 auf HEB 240. «verfasse ein änderungsprotokoll wenn man auf die versionsnummer klickt unten rechts»: `doku.aenderungen.js` (Einträge je Tag, Σ = ändert Nachweiszahlen), Klick oder Enter auf die Fassung in der Fussleiste öffnet es. **Bei jeder Änderung, die Anwender betrifft, dort einen Punkt ergänzen.** Prüfstand 254 |
| Leiterstrich, Drahtwerke einzeln, eigene Vorlagen projektübergreifend (7. Oktober) | Im Wortlaut: «deute die leiter mit einem kurzen strich in Gleislängsrichtung an im modell, so kann man diese besser erkennen wo sie stehen bei den anbauteilen. der strich sollte fein sein nicht so dick wie die anbauteile.» - je Leiter (Marke `leiter` am Angriffspunkt, alle Tragwerksarten) ein Strich ±0.6 m in y, 1 px, gedämpft, auch bei ausgeschalteter Lastebene (render.3d.js). «hier noch einzeln aufführen als auswahl» - Gliederung der Drahtwerke «Einzeln» (je Leiter eine Zeile, Lage und z); «Bauteil» fasst seither je Anbauteil und Typ zusammen. «biete die möglichkeit die selbs abgespeicherten anbauteile global zu verwalten. diese sollten projektübergreifend angezeigt werden, in optionen festlegen.» - Sammlung dieses Browsers (localStorage `tragjoch-vorlagen-global`, data.anbauteile.js: `globaleVorlagen…`), Schalter in Optionen → Eigene Vorlagen (Vorgabe an; `tragjoch-vorlagen-global-an`): die Sammlung erscheint in jedem Projekt, neu gesicherte oder angepasste Vorlagen gehen auch dorthin; die Vorlagen des Blattes bleiben (reisen mit der Projektdatei) und gehen bei gleicher id vor. Reiter mit Liste (Name änderbar, Projekt / Sammlung, in Sammlung / aus Sammlung / ins Projekt / löschen) und «Sammlung sichern (.json)» / «Sammlung laden …» für einen anderen Rechner. Im Browser: Vorlage gesichert → Projekt ✓ Sammlung ✓, gelöscht. Prüfstand 253 |
| Gittermast ohne Rohr bzw. Mastaufsatz (7. Oktober) | Im Wortlaut: «biete die möglichkeit beim gittermasten, das rohr bzw. den mastaufsatz wegzulassen.», dann «nicht im mastwähler sondern als separate checkbox». Kästchen «Rohr weglassen» / «Mastaufsatz weglassen» unter dem Mastprofil (Feld `mastGitterOhne`, kein eigener Wert im Stand): es schaltet den Profilnamen des Mastes auf die abgeleitete Variante «Gittermast … ohne Rohr» (`gittermastenAlle`, `gitterOhneObenName`, data.masten.js; das Sortiment bleibt unverändert), Wähler und Mastdialog zeigen nur die Grundtypen (`mastprofileWahl`). Meine Lesart: das Rohr entfällt GANZ, auch sein Stück im Gitter samt Halt an den Rippen; die Länge ist die Höhe des Gitters, kein Wind über dem Kopf; das Gewicht der Tabelle bleibt (sichere Seite, das Stabwerk wiegt die Stäbe); die Diagramm-Kontrolle bleibt die des Typs. Gemessen (Stabwerk): Einzelmast I 45, Gurt 0.2605 → 0.2037; J90/20 m auf zwei I 45 ohne Rohr Gurt M1 0.5407. Im Browser: «Gittermast I 45 ohne Rohr · 10.40 m», Rohr weg, Stabwerk rechnet. Ein anderer Typ im Wähler kommt wieder mit Rohr. Prüfstand 252 |
| Windlasten nach den Blättern; Gesamtlänge statt Angriffspunkt (7. Oktober) | Im Wortlaut: «Nutze für die Windeinwirkungen der leiter die vereinfachten Werte gemäss den hier aufgeführten dokumenten. nimm für die hängestütze die länge mit rein für die bestimmung der lasten. was mehr sinn machen würde bei den tragenden anbauteilen, ist wenn man die gesamtlänge eingibt und der Lastangriffspunkt dann automatisch in der mitte des elements angesetzt wird, so muss man die mitte nicht mehr auf der zeichnung schätzen sonder kann die hängestütze / jochaufsatz / ausleger bis zum ende zihen und bekommt den richtigen angriffspunkt.» Quellen: die Blätter Gewichtslasten, Windlasten 1 und 2 unter `Grundlagen/Einwirkungen`. Abgleich: die Leiter der Lasttabelle stimmten schon mit dem Blatt. Auf Rückfrage: **Gewicht je Stück** (0.5 kN), **Träger und Ausleger**, **alte Stände Länge = 2 × Punkt**, **Leiter ergänzen**. **Daten** (`data/fl_bauteile.json`, örtlich, Sicherung `fl_bauteile_vor_wind_je_meter_2026-10-07.json`): Hängestütze 0.18 / 0.22 / 0.26 und Hängerohr («Lampenrohr») 0.20 / 0.25 / 0.30 kN/m mit `windJeMeter` (Wind × Länge, Gewicht je Stück; vorher fest 0.55 / 0.70 / 0.80 kN); neue Spalte `laengsachse` (z: Stütze, Aufsätze, Rohr; x: Ausleger NT/Rohr, Auslegerkonsole, Spurhalterkonsole, Traverse); neu Cu 150, Cu 150 (x2), Aldrey 300 mit Wind nach Blatt 2 und Zügen der Reglagetabelle (150: Einzelleiter 9 kN, normale Zugkraft; Aldrey c > 35 m) - ⚠ Gewicht Aldrey 300 angenommen 0.01 kN/m (das Blatt nennt keines). **Rechnung:** `teilLaenge` (Gesamtlänge, ohne Eintrag 2 × \|Punkt\|), `teilLaengeSetzen` (Punkt in die Mitte, was am alten Ende hängt oder darüber hinaus liegt, wandert mit; Traverse auf der Achse x = 0 nur die Länge). **Karte:** Feld «Gesamtlänge», der Punkt in dieser Achse steht nur als «Mitte der Länge» da. **3D:** Griff am Ende (`teilende`), Ziehen ändert die Länge; die Mitte ziehen ändert sie doppelt. Gemessen (Kern, J90/20 m, HEB 240, Hängestütze mit NT-Ausleger bei 10 m): η 0.6133 → 0.6035; Hängestütze 2.70 m EK1 Wind 0.55 → 0.486 kN. Im Browser: Länge 2.70 → 3.20 (Ausleger und Leiter auf −3.20, unterer Fahrdraht −4.80), Ende gezogen 3.20 → 3.70 (Mitte −1.85). Der Prüfstand rechnet seine alten Messwerte mit den früheren Werten weiter (`PRUEFBAUTEILE`), die Datei prüft Abschnitt 251 |
| Grundwerte geordnet, Handbuch 21, Drahtwerke je Leiter, Gruppe duplizieren, Stahlgüten Mast/Joch (7. Oktober) | Wortlaut je Punkt im Commit-Text. **Kontextfenster der Trasse** in einem Raster (Spalten 104/132/18 px). **Handbuch Kapitel 21** «Fundamentbestimmung: der Ablauf» (Bild der 19 Schritte, red_M/red_H, Ergebnis/η, die zwei Zellen der Mappe). **Stückliste:** im Stabwerk das Gewicht der Stäbe, der Tabellenwert nur zum Abgleich. **Drahtwerke:** Gliederung Typ / Gruppe / Bauteil, Spalte «× je Stelle» (Multiplikator), Tabelle zugeklappt; dann «die leiter und nicht das bauteil beim überfahren der positionen sichtbar zu machen und wenn man sie anklickt dann kommen die bearbeitunsauswahl … durch ctrl mehrere positionen auswählbar»: Überfahren zeichnet am Angriffspunkt des Moduls einen Leiterstrich ±3 m in Gleisrichtung (Schlüssel `AT<i>#<k>`, `AT_<i+1>#<k>` an Abfangjoch/Ausleger), Klick wählt (Strg mehrere) und zeigt erst dann Typ/Anzahl, Leiste für die Auswahl; Esc klappt zu. **Gruppe duplizieren** (Knopf am Gruppenkopf): Δx oder im Modell antippen, nur Teile am Joch, nächste freie Nummer («Gleis 1» → «Gleis 2», `gruppenKopie`). **S450 / S460** in `normen.json`, Feld «Stahlgüte Joch» und «Stahlgüte Masten» (`stahlMast`, leer = wie Joch; Einzelmast nur Mast): J90/20 m, HEB 240, Mast 0.7770 → 0.3969 mit S460. Prüfstand 250 |
| COM-Skripte nicht mehr aus dem Browser (7. Oktober) | Frage «das abspeichern der com skriptdateien aus der app heraus gab probleme, wenn man diese öffnen wollte, sollen wir diese option wieder löschen?», dann «es war die windows schutzwarnung, wir haben strickte IT security vorgaben bei der sbb». Was Chrome speichert, markiert Windows als «aus dem Internet»; ein .cmd daraus öffnet es nur nach der Schutzwarnung. Das Kästchen «Skriptdateien mitliefern» (29. September) ist weg, der Dialog nennt stattdessen die interne Ablage (`Versand/COM_Bruecke`); der Browser schreibt nur die Modelldatei (`export.comskripte.js` bleibt, die Einzeldatei trägt die Skripte weiter). Dabei behoben: `AxisVM_aufbauen.cmd` und `AxisVM_auslesen.cmd` lagen in der Ablage mit LF - `.gitattributes` erzwingt CR LF für `*.cmd`/`*.ps1`. Prüfstand 154 |
| Bedienung und Lasten, 6./7. Oktober (Sammelliste mit Bildern) | Wortlaut je Punkt im Commit-Text (b327d04 … 23078b1). **Gebaut:** «Höchstbeanspruchte Stellen» aus dem Stabwerk; Legende «Pos» klappbar; Stabwerk **Echtzeit oder Knopf** (Unterpunkte unter Stabwerk, `stabwerkAuslosung`), gerechnet wird nur, wenn sich die Kennung ändert (`OHNE_RECHNUNG`); Bestandesschutz **Δ in % mit Bezug** (`bestandProzent`, `bestandBezug`); **Gruppe/#Tag** je Anbauteil, das Auge der Gruppe schaltet `aktiv` (auf die Frage «warum ausblenden, aber mitrechnen?»: nicht mehr); **Bügelschrauben als eigene Gruppe** (Rückfrage «Ja, Kraft x je Gurt»: Kraft in Jochachse je Gurtanschluss aus dem Stabwerk gegen F_Grenz, `buegelNachweis`) mit Knopf **Grenzfeder K_X suchen / übernehmen** (Bisektion 10²–10⁸ kN/m, abgerundet; J90/20 m, UG K_X 50 000: 25.99 kN > 24 → Grenzfeder ≈ 33 000 kN/m); Achsentext und Hinweise zur Gültigkeit je Rechenverfahren; **Fundament vorgewählt nach Masttyp**, Gittermast «Typ spez. (alt)»; **Profilblatt in mm** mit 10³/10⁶; Anbauteilzeile zweizeilig, Papierkorb statt ×; Minus im Feld Ablenkung; Lastgenerator kurz (Rückfrage «Kurz: typische Gleisausrüstung») mit Skizze und **Abstand Mast–Gleis 3.50 m**; Gruppenkopf ohne Last; Karte *Lasten* nach Einwirkung (Wind, Ständig, Schnee, Bestandesschutz); **ψ₀ = 0.65 ohne γ_Q** (Weisung «es werden nicht beide faktoren angesetzt … so wie bei der sia»; alte Stände `psiAnheben`, RTE-Zahlen unverändert, SIA-Begleitwert 0.75 → 0.60); Optionen-Reiter zusammengelegt; **Eigengewicht im Stabwerk aus den Stäben wie AxisVM** (Rückfrage; J90/20 m = Tabelle, J130/30 m 110.5 statt 116 kg/m - Anschlusswinkel und Stosslaschen sind keine Stäbe; J130 η 0.5228 → 0.4928), dabei doppeltes Gewicht in der COM-Datei behoben; COM-Material: zuerst «S 235», sonst `AddSteel_EuroCode` aus den Werten der Datei (⚠ in AxisVM nicht erprobt); **Drahtwerke nach Typ** mit Anzahl, Hervorheben im 3D (Rückfrage «Liste + Hervorheben»). Am 7. Oktober: **Mehrfachauswahl** (Strg+Klick, Leiste Bearbeiten/Aus-Ein/Löschen), **Kontextfenster der Leiste** (gleichen Typ markieren, Gruppe, kopieren/verschieben auf ein anderes Tragwerk), **Grundwerte der Trasse in der Fussleiste** anklickbar, geleertes Zahlenfeld erst beim Verlassen geschrieben, Havarie-Name hebt im 3D hervor. Die «alte Maststatik»-Mappe in `Grundlagen/` war die falsche (Jochbestimmung, ohne Fundament, Datei abgeschnitten) - der **Fundamentflow** wartet auf die richtige. Prüfstand 240-247 |
| Rückfragen zur Liste vom 6. Oktober | Auf Rückfrage: **Datenbank «Nicht pushen»** - `data/*.json` bleibt örtlich, jede Änderung kommt als Datenpaket nach `Versand/` (die Ausnahme der Weisung wird nicht genutzt). **Reduktionsfaktor «Auf allen Wind»** - Blattfeld `windReduktion`, Schalter unter Lasten; `lastfaelle` multipliziert Wind x / y jedes Falls mit 0.74 (Kern, Stabwerk, GZG, AxisVM), der Abfangjoch-Kern denselben Faktor (`rW`); J90/20 m Mast 0.6705 → 0.4987, Beispiel A Gurt 0.8610 → 0.8456. **Mastfuss am Abfangjoch «Fussversatz wie am Joch»** - Stabmodell mit Höhe je Ende (`hoeheB`), Stabwerk, Blatt und Bild lesen `mastFuss`/`mastFussB`, der Fussgriff ist frei (`einzel: false`); Beispiel A, M1 Fuss +0.50: Fuss −7.50 → −7.00 m, Mast M1 0.1747 → 0.2335 (die Druckstütze sitzt 6.50 m über dem Fuss); im Browser «M1: Fuss +0.00 → +1.10 m, Länge 8.08 → 6.98 m, Joch bleibt». Prüfstand 239 |
| Liste vom 6. Oktober (Bedienung, Vorlagen, Lastfälle) | Weisung: «Das ist noch die vollständige budliste. bearbeite die retlichen punkte ab selbsttändig und commite und pushe alles. falls anpassungen an der datenbank datei notwendig werden, diese direkt mit puschen auf github (ausnahme)». **Gebaut** (Wortlaut je Punkt im Commit-Text): Betriebswind ohne ständige, nur Wind × 0.70 (die vier Fälle G = 0; Nachweiszahlen am Fahrdraht unverändert, sie lasen schon nur Wind); Kettenwerk (Ts + Fd in einem Modul) und ein Fahrdraht, der nur sein Gewicht ans Tragseil gibt, zählen nicht als Fahrdraht (`istFahrdraht`); **Ausleger-Vorlagen** NT (R-FL, Fd 1.60 m unter Ts) und Rohr (N-FL, 2.40 m) mit Tragseil, Fd-Gewicht am Tragseil und Fd auf seiner Höhe (Katalog örtlich, Sicherung `anbauteile_vor_ausleger_ts_fd_2026-10-06.json`; J90/20 m OG 0.5168 → 0.5239, Blech 0.5894 → 0.5930, M1 0.8025 → 0.8007; der Prüfstand führt die alten als Prüfvorlagen); Mastlänge im Dialog 0.50 m, Höhe am Tragausleger 0.10 m; Reaktionskräfte ganzzahlig; **Klick bei geschlossener Leiste** (ReferenceError `ausklappen` seit A1 liess den Griff hängen - das war das «Hinübergehen in Drag and Drop»); Rechtsklick ohne Zoom; Zoom aufs ganze Teil; gewähltes Teil hervorgehoben; Kraftpfeile mit Vorzeichen, F_z nach oben wie die Karte (meine Lesart von «z werte gleiche konvention»); Abfangjoch-Teile als Kette, Pfeile je Modul an ihrem Punkt; Angriffspunkte an Ausleger und Abfangjoch ziehbar; Längsanker ziehbar (im Browser nicht zu Ende geprüft); Lageband: Abfangjoch ab dem Überstand, Profilzeichen H/I unter jedem Masten; Lastfalltabelle: Zeile wählt den Fall; neues Tragwerk der Projektablage öffnet den Parameterdialog mit den Grundwerten; Duplizieren fragt, wohin (dieselben Masten in anderer Höhe oder daneben); Kontextmenü gekürzt (im Bereich eines Tragwerks nur dessen Einträge, Art und Neues Tragwerk als Auswahl; Abfangjoch 17 → 10); Vorlage «Abfangjoch mit Anker» im Startdialog (meine Lesart von 3.5 - 4.5 - 3.5: M1 → Leiter → Leiter → M2, A160 12.00 m, Tragseile N-FL, Druckstütze U12 längs); Havarie-Schalter «Last aufs Tragwerk übertragen» (Kräfte an der Kettenwurzel; M_z am Mastfuss −0.49 → 0.01 kNm). Bauteil am Auslegermast setzen: geht seit dem Einbau der Mastteile (selber Tag). **Nicht gebaut, Rückfrage** (siehe *Offene Punkte*): Datenbank öffentlich pushen, Reduktionsfaktor 0.74, Fussversatz am Abfangjoch, grosse Verformungen bei y-Versatz, Fundamentflow, Vergleich Bestand / Bau / Projekt, Doppelanker Zug, Schaltposten. Prüfstand 236-238 |
| Teile am Masten an Abfangjoch und Tragausleger; Hebel der Jochteile am Abfangjoch; Blech-Diagonale (6. Oktober) | Im Wortlaut: «beim abfangjoch und beim tragausleger modell lassen sich keine anbauteile setezen beim masten. beim abfangjoch liegen die einwirkungen alle auf höhe träger (jochaufsatz / Hängestütze etc.) nimm noch die axis starrelement optimierung auf.» **Befund:** gespeichert und im Kern gerechnet wurden Teile am Masten an beiden Arten (`anbauMastFlach`), das Stabmodell - das das Urteil trägt - aber nicht: der Tragausleger liess sie weg, das Abfangjoch setzte sie mit x = 0 als Last aufs Trägerende (auf den Überstand vor dem Masten, auf Trägerhöhe); im 3D fehlten sie an beiden. Am Abfangjoch standen ausserdem alle Kräfte der Jochteile auf dem Knoten der Trägerachse, ohne Hebel - der Kern rechnet die Torsion daraus (`TG`, `TW`), das Stabmodell nicht. **Jetzt:** (1) `mastTeileEinsetzen` (export.axisvm.js): der Mast bekommt auf hMast einen Knoten (`mastKnotenAuf`, derselbe Schnitt wie für den Anker, aus `abfangAnkerAnbauen` herausgelöst), jedes Modul greift dort mit Kraft und Moment r × F an - statisch dasselbe wie die starre Kette des Tragjochs, ohne Knoten dafür, wie die Jochteile am Tragausleger; aufgelöst wie im Kern. (2) Abfangjoch: nur Teile am Joch auf den Träger; je Jochteil zu G, Wind x und Wind y das Moment r × F der Module am Achsknoten (`lasten.moment`); der Leiterzug bleibt zentrisch (Weisung 4. September). (3) Bild: `zeichneMastteil` aus der Tragjoch-Szene herausgelöst, `mastTeileSzene` hängt die Teile am Masten an Abfangjoch- und Ausleger-Szene (Kette, Angriffspunkte, Pfeile des Kerns; nur am Masten, den diese Szene zeichnet). (4) **Blech-Diagonale** (Weisung 4. Oktober «der fahrweg der einzelnen starrelement verbindungen optimieren auf die variante direkt ... so sparen wir an anzahl elementen», bisher nur an den Anbauteilen gebaut): vom Gurtknoten EIN Starrglied schräg zum Blechende statt Stummel und steifes Stück über Eck (`blechStab`). **Gemessen** (Stabwerk, HEB 260, ohne Teile): J90/20 m Knoten/Stäbe 828/942 → **604/718**, Blech 0.36875 → 0.36877; J120-alt/24 m 908/1038 → 668/798; J60-alt/8 m 356/410 → 276/330; Beispiel B 1613/1992 → 1373/1752, Joch 0.71212 → 0.71211; Beispiel A unverändert (abgefangene Leiter in der Trägermitte, kein Hebel). Prüfblatt A160/12.5 m (Jochaufsatz einfach bei 6 m, Hängestütze mit Fahrdrahtabzug bei 3 m, Leiter-Traverse an M1 auf 5.50 m): Joch 1.214 → **1.274** (Hebel), Mast M1 2.433 → **1.908** (die Traverse sass auf dem Überstand), M2 1.175 → 1.190; Tragausleger L 10 m mit denselben Teilen: Mast MT1 0.772 → **0.779**. Gleichgewicht um den Mastfuss über alle Auflager: ΔM_x 0.467999 / 0.468002 gegen F_y · (5.50 + 0.35) = 0.468 kNm. Im Browser (Prüfseite, gelöscht): Traverse an M1 bzw. MT1 gezeichnet mit Pfeilen; «Bauteil zuweisen» auf den Mast setzt «am Masten M1 / MT1». ⚠ Nicht gebaut: Havarie je Leiter für Teile am Masten dieser Arten; Kette der Mastteile in der verformten Figur und Fahrdraht am Masten im GZG-Nachweis dieser Arten; AxisVM nicht neu gebaut. Beobachtet: ein Klick auf den Masten dicht an der Fläche eines anderen Teils setzte nichts (tiefer am Masten ging es) - nicht untersucht. Prüfstand 236 |
| Signalbauer: Bilder der Mappe als Kacheln; Knopf «Signal zusammenstellen» (4. Oktober) | Mit der Einwirkungs-Mappe, im Wortlaut: «ich finde den signalbauer nicht. kann man bei diesem die signal-bilder aus der excel als symbole hinterlegen um die zusammenstellung schnelle vorzunehmen, da man sonst wissen muss wie jedes signal heisst und ich bin nicht vom fach der signale sondern nur tragwerk.» **Befund:** der Bauer war nur über die Vorlage «Signal (Signalbauer)» in der zugeklappten Vorlagenliste und danach über einen Knopf im Modul der Karte zu erreichen; die Vorlage setzte ein leeres Signal (G 0). **Bilder:** die 26 Bilder der Signal-Blätter (Zellbilder der Mappe, Zeilen der Positionen 16-41) als data:-URL in der neuen Spalte `bild` der Tabelle `signalteile` (nur `data/anbauteile.json`, vertraulich, Sicherung `anbauteile_vor_signalbilder_2026-10-04.json`; Katalogfeld `bild`, Prüfung `istBildUrl` - nur eingebettete Bilder; die Tabellenansicht zeigt sie als Bild). Arbeitskorb und Tragwerksteile haben in der Mappe keine Bilder und bleiben Tabelle. **Dialog:** Signale als Kacheln (Bild auf hellem Feld, Name, − Anzahl +; Klick aufs Bild zählt eins dazu), oben die Auswahl mit Bild, darunter die Summe wie bisher. **Ablauf:** Knopf «Signal zusammenstellen» neben «Bauteil zuweisen» (erst wählen, dann ins Modell klicken; `signalZusammenstellen`, app.setzen.js); die Vorlage öffnet den Bauer vor dem Setzen (erst Stelle, dann Signale); ohne Auswahl wird nichts gesetzt; eine als eigene Vorlage gespeicherte Zusammenstellung öffnet den Bauer mit ihrer Auswahl (im Browser: «2 × Hauptsignal» gespeichert, neu gesetzt, dieselbe Auswahl). Mehrere Signalkonfigurationen auf einem Blatt = mehrere Signal-Anbauteile, jedes mit eigener Auswahl. Im Browser (Modulversion, Betreiberdaten): 26 Kacheln mit Bild; zwei Signale und eine Kennzeichnung gewählt, Summe von G und Flächen gegen die Tabelle von Hand nachgerechnet (stimmt), gesetzt bei x 6.50 m, die Karte zeigt «Signal · 2 Posten». ⚠ Ein älteres Datenpaket hat keine Bilder - dann stehen Positionsnummern auf den Kacheln; das Paket vom 4. Oktober in `Versand/` trägt sie. Prüfstand 235 |
| Stabwerk: Gurt am Anschnitt; «beide» ohne Träger ab Jochachse; Sprung der Seitenleiste (4. Oktober) | (1) Mit Bild der Option «Knotenbereich Gurt/Blech», im Wortlaut: «die nachweise beim stabmodell nehmen die spannungsspitzen bei den gurten als massgebend an. nimm die einstellung für das stabmodell wie beim balken auf, dass man die auswertung am rand zu den blechen als auswahl nehmen kann.» **Befund:** das Stabmodell führt den Gurt über die Blechbreite als steifen Abschnitt (gleicher Winkel, E × 1000, `steifesMaterial`), ausgewertet wurde er an beiden Enden - auch in der Blechachse. Jetzt gilt die Option `knotenbereich` auch im Stabwerk (`OPTIONEN_NUR_ERSATZBALKEN` ohne sie): «Anschnitt» (Vorgabe) wertet am steifen Abschnitt nur das Ende am freien Gurt aus (`stabNachweise`, core.stabnachweis.js), «Schwerachsen» beide Enden wie bisher; das Modell und die COM-Datei bleiben gleich. Gemessen (Betreiberdaten, Stabwerk, HEB 260): J90/20 m mit NT-Ausleger bei 10 m OG 0.5385 → **0.5203**, UG 0.5335 → 0.5192; J90/20 m ohne Teile OG 0.3262 → 0.3235; J120-alt/24 m mit Hängestütze UG 0.5430 → **0.4719**; Bleche und Masten gleich. Abfangjoch und Tragausleger führen keine steifen Gurtabschnitte (nicht betroffen). (2) Mit Bild (freies Bauteil, Befestigung «beide», z = 0 sass auf Untergurthöhe), im Wortlaut: «wenn man befestigungsart beide ausgewählt hat, sollte bei z=0 der angriffspunkt in der mitte sein und nicht an untergurt höhe.» Auf Rückfrage **«Ab Jochachse, nur ohne Träger»**: bei «beide» zählt z ab der Jochachse, wenn die Baugruppe keine Hängestütze und keinen Jochaufsatz trägt (`bezugsEbene`/`bezugsHoehe`, core.anbauteile.js; `mitTraeger` je Teil aus `expandiereAnbauteile`); Kern (Hebelarm), Stabmodell (Wurzel `AT…_ACHSE` auf dem Stab durch den Kasten, `ARM…_DO/_DU`), 3D, Karte («ab Jochachse …») und Skizze. Mit Träger unverändert (gemessen: NT-Ausleger unten = beide, −1.5746 m). Im Browser (Modulversion, Betreiberdaten): Punkt in der Mitte, Pfeil F_y von dort. (3) Gemeldet: «wenn ich einen masten anklicke über den text im 3d um auf die stelle in der sidebar zu gelangen, springt diese dann nach obern wenn ich den masttyp da anpassen will.» **Befund** (gemessen im Browser): die Leiste rollte in 0.4 s auf 1106 px und stand 1.2 s später wieder auf 0 - `zeigeFeld` setzte den Fokus, `focusin` merkte den Anker an der Stelle VOR dem weichen Rollen, der Neuaufbau des Stabwerks rollte dorthin zurück. Jetzt Fokus, Anker lösen, dann rollen (auch beim Sprung auf eine Anbauteilkarte); nachher 1117 px, nach der Profilwahl gleich. Prüfstand 234 |
| Befestigung am Joch schaltet wieder; Anbauteile am Tragausleger anklickbar (4. Oktober) | Gemeldet mit Bild (Karte einer Hängestütze mit NT-Ausleger am Joch), im Wortlaut: «die befestigung an joch lässt sich nicht ändern.» **Befund:** das Nachführen der Karte (`aktualisiereMaske`, ui.js) schrieb den Wert des Teils in jedes Feld der Karte, auch in die drei Radioknöpfe der Befestigung - danach trugen alle drei denselben Wert, und jeder Klick schickte ihn wieder (im Browser am alten Code: nach dem ersten Klick «unten unten unten»). Jetzt wird bei Radioknöpfen nur `checked` und die Markierung nachgeführt; im Browser unten → oben → beide → unten, jede Wahl kommt im Stand an. Dazu, im Wortlaut: «die anbauteile lassen sich nicht anklicken im 3d beim tragausleger» - `auslegerSzene` führte die Liste `anbauteile` und an den Flächen `anbauteil` nicht (daran hängen Klick, Heranfahren, Ziehen, Kontextmenü); jetzt wie am Tragjoch und Abfangjoch. Ziehen rechnet die gespiegelte Seite schon (`anbauteilZiehen`). Im Browser (Betreiberdaten, L 10 m, NT-Ausleger bei 8 m): Klick auf den Ausleger öffnet die Karte A1 im Reiter Anbauteile und fährt heran. Prüfstand 233 |
| Tragausleger: Kette der Anbauteile in der verformten Figur (4. Oktober) | Mit Bild (Plot «w», Tragausleger 10 m, Hängestütze mit NT-Ausleger), im Wortlaut: «beim tragausleger bei der darstellung verformung, wird die hängestütze und ausleger nicht korrekt dargestellt (diagonale). berichtigen, so dass es wie beim Tragjoch dargestellt wird bei der verformungsdarstellung.» Die Figur zog seit dem Fahrdraht-Eintrag desselben Tages einen Strich von der Station zum Fahrdraht. Jetzt führt das Modell je Anbauteil die Glieder der Kette wie am Tragjoch (`direkteGlieder`: Wurzel und echte Punkte) als Hebel von der Mitte der Station (`kettenStarr`, durch Spiegelung, Baustein und Blatt; in der Datei `kettenStarr`, die Brücke liest es nicht); die Figur bewegt jeden Punkt als Starrkörper der Station (`starrPunkt`). Gemessen: NT-Ausleger bei 8 m vier Glieder - Stütze lotrecht bis −1.35 / −2.70 m, Ausleger waagrecht bis 2.50 m, Ende = Fahrdraht. Am Modell nichts (kein Knoten, kein Stab, keine Last). Im Browser (Modulversion, Betreiberdaten): Stütze und Ausleger orange, Ring am Fahrdraht. Prüfstand 231 |
| Tragausleger: Wind auf Mast und Ausleger im 3D (4. Oktober) | Mit Bild (Tragausleger L 10 m, LF3 Wind +y), im Wortlaut: «warum sehe ich im 3d am Modell Tragausleger keine Windlasten am Mastu und Ausleger?» **Befund:** das Stabmodell setzt beide an (Mastwind WindX/WindY je Maststab aus `mastWindBeide`, Wind längs aus der Zeile «Tragausleger übergreifend» halb auf jede UPE), `auslegerSzene` zeichnete aber nur die Pfeile der Anbauteile. Jetzt Pfeile und Fläche aus `d.lasten.strecke` derselben Datei, **charakteristisch** angeschrieben (`w_M,x,k`, `w_M,y,k`, `w_A,k` - der Ausleger als Summe beider UPE), auf der Seite, von der der Wind kommt. Zeichnet ein Joch den Masten, zeichnet es auch dessen Wind (kein zweiter Satz). Am Modell nichts geändert. Im Browser (Modulversion, Betreiberdaten, L 10 m, HEB 260): Pfeile am Masten quer und längs, am Ausleger «w_A,k = 0.23 kN/m». Prüfstand 233 |
| Löser: Dreibein eines schrägen Stabes ohne lcsZ; Kette am Tragausleger (4. Oktober) | Im Wortlaut: «kette berichtigen, falls die com und datenbank nicht betroffen sind. schreibe eine zusammenfassung für die übergabe für neuen chat / account.» **Befund beim Nachmessen:** `dreibein` (core.stabwerk.js) nahm ohne vorgegebene lokale z-Achse die globale z-Achse, ohne sie rechtwinklig zur Stabachse zu stellen - ein schräger Stab in der x-z-Ebene bekam ein nicht orthonormales Dreibein; ein Starrstab gab eine Verdrehung nicht als Verschiebung weiter (Kragarm, Moment um x, Punkt 2.6 m darunter: 0 statt 401 mm). **Berichtigt** (die Vorgabe wird wie eine eingetragene lcsZ gegen die Stabachse rechtwinklig gestellt). **Wen es traf:** nur meine von Hand gebauten Probestäbe - die Dateien der Ausleitung führen lcsZ an jedem Stab (gezählt: Beispiel A/B, Tragausleger, Tragjoch mit NT-Ausleger, kein schräger Stab ohne); Prüfstand und beide Durchgänge danach ohne eine geänderte Zahl. **Kette:** gelesen als «das Fehlerhafte an der Kette berichtigen» - die Unstimmigkeit (UPE 1.056, Fahrdraht längs 9 gegen −450 mm) war dieser Löserfehler; mit berichtigtem Löser ändert eine Kette am Ausleger nichts (UPE 0.257 gegen 0.265, Seitenlage am Fahrdraht gleich). **Nicht ins Modell gebaut** - die COM-Datei bekäme sonst Knoten, Links und Starrkörper dazu; COM-Brücke und Datenbank sind von der Berichtigung nicht betroffen. ⚠ Beobachtet: der Ausleger verdreht sich unter Wind längs charakteristisch um rund 0.17 rad (Beispiel L 10 m, Hängestütze mit NT-Ausleger bei 8 m), der Fahrdraht wandert dabei 0.45 m längs - nicht nachgewiesen (nur quer). Prüfstand 232 |
| Tragausleger: Fahrdraht in Figur und Nachweis (4. Oktober) | Gemeldet mit Bild (Plot «w», Tragausleger 10 m mit Hängestütze, NT-Ausleger und R-FL Cu 107), im Wortlaut: «zu fixen nebenbei, beim tragausleger wird der fahrdraht nicht bei der verformung abgebildet.» **Befund:** das Stabmodell des Auslegers führt die Kette der Anbauteile nicht (Kräfte und Momente an die beiden Gurtknoten der Station, «Starrkörper an EINER Station»); es gab keinen Knoten am Fahrdraht - die Figur fand keinen Punkt, und **der GZG-Nachweis am Fahrdraht fiel am Tragausleger still auf die Referenzhöhe am Masten zurück**. Jetzt nennt das Modell je Fahrdraht die beiden Gurtknoten und den Hebel (`fahrdrahtStarr`, durch Spiegelung, Baustein und Blatt geführt; in der Datei `fahrdraehte[].starr`); der Weg folgt als Starrkörperbewegung der Station (`starrPunkt`, core.stabverformung.js: Mittel der beiden Knotenwege + θ × r, θ quer zur Verbindung aus dem gegenläufigen Weg). Am Modell nichts geändert (kein Knoten, kein Stab, keine Last; AxisVM gleich). Gegenprobe: derselbe Punkt als echter Knoten starr an beiden Gurten im selben Modell - Weg gleich auf 7e-4. Gemessen L 10 m, Hängestütze mit NT-Ausleger bei 8 m, HEB 260, Längsanker: Seitenlage vorher «Jochauflager auf 7.50 m» 16.1 mm, nachher **Fahrdraht auf 4.80 m 17.1 mm** (η 0.427); Urteil der Gebrauchstauglichkeit gleich (Mastspitze 0.813 massgebend). Figur: oranges Glied von der Station zum Fahrdraht mit Ring und Anschrift. Im Browser (Modulversion, Betreiberdaten) geprüft. **Kette am Ausleger:** die Zahlen «UPE 0.265 → 1.056, Fahrdraht quer 24.4 → 8.0 mm» einer ersten Probe kamen aus einem **Löserfehler an den Probestäben** (schräg, ohne lcsZ - siehe Zeile «Löser: Dreibein»), nicht aus dem Tragwerk und nicht aus einer Überkopplung (meine Erklärung vom selben Tag war falsch). Mit berichtigtem Löser ändert die Kette nichts: starr wie mit der Klemmenkopplung des Tragjochs UPE 0.257 (ohne Kette 0.265), Blech 0.171, Mast 0.793, Fahrdraht quer 24.41 mm, längs −449.6 mm = Starrkörperwert. Prüfstand 231 |
| Rippe: Spiel nicht abbilden, nur waagrecht gelagert; Verteilen auf die Arbeitsrechner (4. Oktober) | Im Wortlaut: «spiel nicht abbilden, nur die auflagebedingungen (über linkelemente, so dass nur horizontal gelagert wird und ohne momentübertragung. datenbank und ausleitung nachziehen.» Bestätigt den Stand vom selben Tag: je Rippe unter dem Kopf ein Linkelement `RIPPE_HALT` (global x/y starr, z und alle Drehungen frei, 50 mm lotrecht); das Spiel bleibt draussen. Nachgeprüft an `com/AxisVM_Beispiel_B.json`: drei Rippen-Links mit diesen Freiheitsgraden, keine deckungsgleichen Knoten, kleinster Abstand 13.2 mm; die Brücke setzt die Links global aus den Feldern der Datei (nichts nachzuführen). Datenpaket, COM-Skripte und gebündelte Einzeldatei neu in `Versand/`. Zur Frage nach dem Verteilen: empfohlen GitHub Pages für den Code (aktualisiert sich selbst) und das Datenpaket über einen betriebsinternen Ablageort statt Gmail (vertrauliche Betreiberdaten; Gmail warnt bei HTML-Anhängen mit Skript). ⚠ In der Cloud-Sitzung ist GitHub Pages nicht erreichbar (Proxy 403) - ob Pages den neuesten Stand ausliefert, ist nicht nachgesehen. |
| Bestandesschutz-Schalter unter Lasten und über der Anbauteilliste (4. Oktober) | Im Wortlaut: «ich bin mir nicht sicher ob dies nicht zu versteckt ist. was wäre eine alternative? unter lasten, da ist schon der einheitswind aufgefürht? oder was denkst du?» Auf Rückfrage **«Lasten + Anbauteile»** (ein Schalter, unter *Lasten* direkt unter «Windbelastung» und gespiegelt über der Anbauteilliste; die Optionen behalten ihn) und **«Ja, eine Zeile»** (steht der Einheitswind und ist der Bestandesschutz aus, steht am Schalter die Notiz «Bestand nach alter Norm? Bestandesschutz prüfen»; kein Dialog, nichts schaltet sich von selbst ein). Feld `bestandesschutz` im Schema nur als Anzeige (`wertAus` aus `nachweise`), `aendern` schreibt in `nachweise.bestandesschutz` - kein zweiter Wert im Stand. Über der Anbauteilliste steht der Schalter auch ohne Teile (`data-at-bestand`). Im Browser (Modulversion, Betreiberdaten): Notiz erscheint mit Einheitswind, verschwindet beim Einschalten; der Spiegel ist angekreuzt, die Karten zeigen «neu»; ausgeschaltet über der Liste ist auch das Feld unter Lasten aus; Strg+Z holt ihn zurück. Prüfstand 230 |
| Gittermast: Rippen halten nur seitlich, Rohr am Kopf verschraubt; UL-Rohr mit zwei Wanddicken (4. Oktober) | Im Wortlaut, mit Ausschnitt der Übersicht (Rohrkonstruktion der UL-Ausführung mit zwei Wanddicken und dem Bund am Kopf): «rippe hält nur seitlich, ist sicher auch mit etwas spiel versehen. das gleiche muster anwenden bei den gittermasten, was ändert sind die profile. verwende diese blechstärken beim rohr. der untere teil ist nicht so stark wie der obere.» **Halt:** am Kopf ist das Rohr mit seinem Bund auf die Kopfrippe geschraubt (starr, wie bisher am Achsknoten mit Schott); an jeder tieferen Rippe hat es einen eigenen Knoten 50 mm darüber und ein Linkelement, das nur waagrecht hält (`RIPPE_HALT`, global x/y starr, lotrecht und Drehungen frei; export.axisvm.gitter.js). Das Spiel ist nicht abgebildet (linear: die Rippe hält ab der ersten Bewegung). Gilt für alle Gittermasten mit Rohr, auch ohne Rippenliste (dann der untere Halt bei Kopf − innen). **Profile:** der normale Typ führt nach dem Katalog eine Wanddicke durchgehend, das UL-Rohr unten die dünnere und ab dem Wechsel die dickere; neue Felder `rohr.tOben` und `rohr.wechsel` (Höhe über dem Mastfuss) im Sortiment; den Wechsel habe ich aus der Übersicht abgegriffen (nicht vermasst) - Zahlen nur in `data/masten.json` (vertraulich, Weisung «diese daten nicht öffentlich stellen»). Die einheitliche Wanddicke vom 3. Oktober ist damit abgelöst. **Gemessen** (vorher Rippen starr, UL eine Wanddicke → nachher; Stabwerk): Einzelmast praktisch gleich (das Rohr liegt auf der Achse), I 30 UL Rohr 0.172 → 0.113; am Joch J90/20 m auf zwei Gittermasten: I 30 Gurt 0.965 → 0.940, Blech 0.427 → 0.444, Rohr 0.269 → 0.108; **I 30 UL Gurt 1.016 → 0.987**, Blech 0.440 → 0.456, Rohr 0.280 → 0.127; II 45 Gurt 0.451 → 0.436; I 45 Gurt 0.623 → 0.607; Jochbleche +0.003 bis +0.004. Unter Eigengewicht hängt das Rohr am Kopf (unten keine Längskraft). Der erfundene TEST-G10 trägt jetzt auch zwei Wanddicken. **PyNite** (`vergleich_gittermast.mjs`, die Übersetzung aus der Datei kennt den seitlichen Halt jetzt: steifer Stab, am Ende j axial und in den Drehungen freigegeben): IV 45 UL (ohne Rohr im Gitter) weiter ≤ 0.002 %, die Typen mit Rohr unter Kopflasten und Wind ≤ 1 %, aber **Torsion am Kopf 45 % / Eigengewicht 55 % daneben** - PyNite 3.0.0 gibt für den unbelasteten unteren Rohrabschnitt 0 kNm Torsion am Anfang und −0.62 kNm am Ende aus (nicht im Gleichgewicht), unser Löser 0 im ganzen Rohr bei gleicher Auflagerreaktion; die Abweichung liegt also an PyNites Freigabe, nicht am Modell. Massgebend wäre AxisVM (nicht gebaut). **Dazu:** mit PyNite **3.2.0** bricht der Vergleich auch am alten Stand singulär ab - mit 3.0.0 (Arbeitsrechner) läuft er. Prüfstand 226, 229 |
| Lauf mit den Betreiberdaten; Halterippen eingetragen; COM geprüft; Stand auf main (4. Oktober) | Der Auftraggeber hat das Datenpaket vom 3. Oktober in die Cloud-Sitzung geladen («das ist die letze datenbank datei»), dazu im Wortlaut: «checke den aufbau über com mit den letzten anpassungen ob man etwas aktualisieren müsste und danach stand auf main stellen.» **Prüfstand mit den Betreiberdaten:** zuerst 6589 grün, 5 gefallen - vier Quelltext-Kontrollen, die auf den Wortlaut des Codes vor den Umbauten vom 4. Oktober zeigten (nachgeführt), und ein echter Befund: **die Nachbarszene teilte ihre Gurte nicht an den Stabgrenzen des Stabwerks** (das aktive Joch schon, `gurtTeilung`); ein 4 cm kurzer Gurtstab an der Klemme hatte keine Fläche, das grösste η des Nachbarn fehlte im Bild (Reihe J90 20 + 15 m: 0.4787 gegen 0.4828, Stab bei 10.70-10.74 m). Behoben in `szeneVonNebenanRoh`. **Halterippen** der vier Typen mit Rohr in `data/masten.json` eingetragen (örtlich, Sicherung `masten_vor_halterippen_2026-10-04.json`; aus den Detailzeichnungen abgelesen - die beiden gezeichneten Typen haben die obere Zwischenrippe an verschiedenen Stationen; I 45 wie II 45, I 30 UL wie I 30 angenommen). Gemessen (Stabwerk, vorher zwei Halte im Oberteil → Rippen): Einzelmast Blech je −2 bis −5 %, Gurt +0.1 %; **am Joch (J90/20 m auf zwei Gittermasten) steigt der Gurt am Fuss**: I 30 0.939 → 0.965, **I 30 UL 0.985 → 1.016**, II 45 0.434 → 0.451, I 45 0.603 → 0.623, das Rohr 0.107 → 0.161-0.269; Beispiel B (J120-alt/24 m auf Gittermasten) Mast M1 0.802 → 0.818, M2 0.947 → 0.946. **COM:** an der Brücke nichts nachzuführen - sie liest nur Felder, die sie kennt (`fahrdraehte` stört nicht); die direkten Starrglieder sind gewöhnliche Starrkörper, die Rohrabschnitte `ROHR_I1 …` gewöhnliche Stäbe; Beispiel A/B neu geschrieben (`modell_beispiele.mjs`): jede Last an einem vorhandenen Knoten/Stab, kein Stab der Länge null, keine deckungsgleichen Knoten, kleinster Knotenabstand 13.2 mm (AxisVM trennt 11-12 mm). In AxisVM nicht gebaut (keine Anweisung, in der Cloud nicht möglich). Prüfstand 222 |
| Bestandesschutz mit Kennzeichen «neu» (4. Oktober) | Im Wortlaut: «Kennzeichen «neu» je Anbauteil, diese option sollte aber erst aufgeführt sein, wenn man die auswahl betätigt, bestandesschutz nachweis, da man diesen nachweis nicht so oft führt.» Auf Rückfrage: **«Δη ≤ 0.05 absolut»** (je Bauteil η(Bestand + neue Teile) − η(Bestand) ≤ 0.05, bezogen auf die Grenzausnutzung 1.00) und **«Beide mit der gewählten Stufe»** (die Windstufe unter Lasten gilt beiden Zuständen; für die alte Norm der Einheitswind). Neue Nachweisgruppe `bestandesschutz` (Optionen → Nachweise, **Vorgabe aus**); erst eingeschaltet zeigt die Bauteilkarte das Kennzeichen «neu» (`a.neu`, Teile am Joch und am Masten). Das Stabwerk rechnet dann ein zweites Mal mit den neuen Teilen ausgeschaltet (`ohneNeueTeile`, core.bestand.js; Kern und Stabwerk wie sonst) und vergleicht je Bauteil Joch, Masten, Knicken, Fundament, Anker, Aufhängung (`bestandVergleich`); Block «Bestandesschutz» unter der Gebrauchstauglichkeit: Kachel mit dem grössten Δη und dem Bauteil («kein vertiefter Nachweis» / «vertiefter Nachweis nötig»), Tabelle je Bauteil. Ein Vergleich, kein Urteil - die Hauptkachel bleibt. Gemessen J90/20 m (HEB 240), Hängestütze bei 10 m Bestand, eine zweite bei 5 m neu: Joch 0.467 → 0.627 (+0.160, vertiefter Nachweis), Mast M1 0.816 → 0.861 (+0.045), Fundament M1 0.419 → 0.443. Im Browser (Betreiberdaten): Kennzeichen erscheint erst mit dem Schalter, Klick rechnet neu, ohne neues Teil der Hinweis. Rechenzeit verdoppelt sich nur mit Schalter und neuem Teil (J90/20 m 1.3 s). Prüfstand 228 |
| Gewählter Lastfall aus dem Stabwerk; «u120» bestätigt (4. Oktober) | Im Wortlaut: «als J120-alt gelesen, stimmt wie umgesetzt.» und «was ist mit einzellsastfall gemeint? wenn möglich konsequent auf stabmodell die nachweise führen. ausser man stellt es unter optionen auf balken methode um.» **Einzellastfall** = die Wahl im Feld «Lastfall» oben statt «umhüllend» (z. B. LF13 Wind +x); bis dahin zeigten Kacheln, Bild und Schiene dort den Ersatzbalken. Jetzt wertet das Stabwerk den Fall aus derselben Lösung aus (`imFall` am Ergebnis, app.stabwerk.js: `stabwerkHuelle` mit einer Kombination, Knicken der Masten mit ihren Kräften); eine Stelle `stabwerkAnsicht` (app.js) für Kacheln (`ergebnisFall`, `stabwerkFuehrt`), Bild, Nachbarn, Abfangjoch, Ausleger, Verläufe und Schiene; die Legende sagt «im Fall «…»». Die Kopfzahl des Falls ohne Fundament, Anker, Aufhängung (eigenes Lastniveau, `etaImFall`); diese Kacheln und die Gebrauchstauglichkeit bleiben, wie sie sind. Ein Urteil gibt es im Einzellastfall weiter nicht (16. September). Ohne gültiges Stabwerk der Kern als «vorläufig»; mit Rechenverfahren «Ersatzbalken» wie bisher. Gemessen: die Hülle ist je Teil genau das Grösste der Fälle; im Browser (Betreiberdaten, J90/20 m HEB 260) LF13 Wind +x: Kopf «η 0.336 Joch», Kacheln OG 0.238 / UG 0.239 / Blech 0.336 / M1 0.088 = grösstes η im Bild, Schiene dieselben. Prüfstand 227 |
| Gittermast: Rohr an den Halterippen (4. Oktober) | Zur Weisung «bechte aber, das bei einigen Typen das rohr über die kopfplatte angeschlossen ist und nicht bis zur mastaufweitung nach untern weiter geht. gehe hierfür in die grundlagen und versuche die logik zu verstehen, melde dich wenn du nicht sicher bist.» Der Auftraggeber hat die Grundlagen der kombinierten Masten in die Sitzung geladen, im Wortlaut: «diese daten nicht öffentlich stellen nur für die programmierung nutzen» - **keine Zahl, kein Positions- oder Zeichnungsbezug daraus in verfolgte Dateien**, die Höhen gehören nach `data/masten.json`. **Gelesen:** bei den Typen mit Rohr läuft das Rohr weit ins Unterteil hinunter und ist an Rippen mit Rohrdurchführung gehalten (eine im Unterteil, zwei im Oberteil, eine am Kopf); der Mastaufsatz des langen Typs ist auf den Kopf geflanscht und steckt nicht im Gitter. Auf Rückfrage: «1 wobei ich bei der zeichnung nur drei halterippen sehe» (es sind drei Schnitte, einer davon mit zwei Stück), dann **«Vier Stellen»**; die Werte kommen über ein hochgeladenes Datenpaket («Datenpaket hochladen»). **Gebaut:** neues Feld `rohr.halter` im Sortiment der Gittermasten (Höhen ab Mastfuss, Katalog), `gittermastGeometrie` ordnet, ergänzt den Kopf und meldet Höhen ausserhalb des Gitters; `innen` ist dann Kopf − unterste Rippe. Das Modell (export.axisvm.gitter.js) legt je Rippe einen Achsknoten mit Schott und das Rohr in Abschnitten `ROHR_I1 …` dazwischen; an einem Achsknoten zwischen zwei Rippen (Joch, Anbauteil) hängt es nicht. Ohne Liste gilt wie bisher `innen` (zwei Halte). Profilblatt nennt die Halterungen. **Gemessen** nur am erfundenen TEST-G10 (Testdaten, Einzelmast, Halte 1.5 / 6 / 8 / 10 m gegen 6 / 10 m): Rohr 0.0585 → 0.0745, Gurt 0.3078 → 0.2956, **Blech 0.4773 → 0.3523** - das lange gehaltene Rohr steift das Gitter aus. Im Browser (Testdaten): Rohr im 3D ab 1.50 m, gefärbt, Kacheln = Prüfstand. ⚠ Die Höhen der Betreibertypen sind noch nicht eingetragen (Datenpaket ausstehend). ⚠ Annahme: eine Rippe hält das Rohr starr in allen Richtungen (Schott wie bisher an Knick und Kopf); ob die Durchführung nur seitlich hält, ist nicht geklärt. Abschnitt 207 liest das Rohr jetzt über alle Abschnitte. Prüfstand 226 |
| Verformte Figur mit dem Faktor des Nachweises; Grundlage in der Anschrift (4. Oktober) | Mit Bild (LF13 «Wind +x leitend», Figur «Fd 47.8 mm quer», Kachel «Verformung M1 24 mm · Jochauflager 7.50 m»), im Wortlaut: «die auswertung des gebrauchtauglichkeitsnachweises checken, hier sind werte die nicht ganz nachvollziebar sind. orangfarben soll als text noch aufführen, ob mit oder ohne reduktion abgebildet wird zur besseren verständniss, sonst muss man zuerst die lastfall kombination anschauen gehen.» **Zum Bild:** es lief die installierte Fassung von vor dem 4. Oktober (Fussleiste «e6ec26c»), die Kachel war noch der alte Nachweis an der Referenzhöhe; LF13 ist eine Tragsicherheits-Kombination (ständig und Wind mit Teilsicherheitsbeiwert, ohne ψ), der Nachweis rechnet Wind × 0.70 - die Zahlen passen grob zueinander (47.8 · 0.70 / 1.3 ≈ 26 mm). **Befund im neuen Stand:** bei «umhüllend» zeigte die Figur den massgebenden Fall der Gebrauchstauglichkeit ohne ψ 0.70 (Testdaten: «Spitze M2 87.1 mm», Kachel 61 mm). Jetzt trägt jeder Eintrag des Nachweises seinen Faktor (`faktor`, core.stabverformung.js), Figur und Plot «w» rechnen damit (`wegeAnteile`, app.js): 61.0 mm = Kachel. **Anschrift:** zwei neue Zeilen mit den Beiwerten des Falls (× Faktor) und ihrer Bedeutung (`figurGrundlage`): «mit Reduktion ψ 0.70 - wie der GZG-Nachweis», «Bemessungswerte, ohne Reduktion - nicht der GZG-Nachweis», «charakteristisch, ohne Reduktion (GZG: Wind × 0.70)», «Betriebswind, Reduktion ψ 0.70 enthalten». **Dazu:** der Block Gebrauchstauglichkeit zeigte im Einzellastfall den Kern (ohne Fahrdraht-Kachel), bei «umhüllend» das Stabwerk - jetzt immer das Stabwerk, wenn es gilt (der Nachweis hängt nicht am gewählten Lastfall). Im Browser (Testdaten, Reihe) geprüft. ⚠ Prüfstand mit den Betreiberdaten nicht gelaufen; Abschnitt 225 für sich auf den Testdaten grün. Prüfstand 225 |
| Gebrauchstauglichkeit am Fahrdraht; Mastspitzen an der Figur (4. Oktober) | Zu den Weisungen «ja nachweis auf fahrdrahtpunkt umstellen. falls die masspitzen auch nachgewiesen werden, diese auch als punkt aufführen im verformten stabmodell». **Im Stabwerk** weist «Fahrdraht quer» jetzt die Auslenkung quer zum Gleis (global x) am Knoten jedes Fahrdrahts des Tragwerks nach (`fahrdrahtNachweis`, core.stabverformung.js; Knoten aus `fahrdraehte` der Modelldatei, `istFahrdraht`; im Blatt die des aktiven Tragwerks über das Präfix) - nur Wind × ψ 0.70, Grenze 40 mm (Optionen), wie bisher. Eigener Eintrag `verformung.fahrdraht` neben A/B; Kachel «Seitenlage Fahrdraht» vor den Mastkacheln, Zeile «Fahrdraht» im Bericht. Die Referenzhöhe am Masten steht dann als Auskunft; **ohne Fahrdraht gilt sie weiter** (Rückfall), ebenso im Ersatzbalken (vorläufige Anzeige) - die Wahl «Referenzhöhe» der Optionen gilt also nur noch dort. Gemessen (Testdaten, TEST-80/20 m, HEB 260, Hängestütze mit Fahrdraht in Feldmitte): am Fahrdraht 5.18 mm quer auf 4.89 m gegen 4.82 mm an der Referenzhöhe (Jochauflager 7.50 m). **Figur:** wird die Mastspitze nachgewiesen (`spitzeMast`), steht je Mast ein Quadrat an der Spitze mit der grösseren waagrechten Komponente («Spitze M2 87.1 mm längs»). Im Browser (Testdaten, Reihe): Kachel «Seitenlage Fahrdraht 6 mm · Fahrdraht 4.89 m · 40 mm zulässig · quer», Figur mit drei Spitzen und zwei Fahrdrahtringen. Die Testdaten nennen ihren Fahrdraht jetzt «Test-Fahrdraht» (sonst erkennt `istFahrdraht` ihn nicht). ⚠ Prüfstand mit den Betreiberdaten nicht gelaufen; Abschnitt 223 für sich auf den Testdaten grün. Die Kontrollen 133/172 rechnen am Startdokument ohne Anbauteile und sollten unverändert bleiben (nicht nachgeprüft). Prüfstand 223 |
| Alle Tragwerke aus dem Stabwerk gefärbt; Masten am Abfangjoch ziehen; Testdaten mit Abfangjoch (4. Oktober) | Zu den Weisungen «umhüllen alle stäbe färben» und «beim abfangjoch kann man keine drag and drop befehle ausführen bei den masten». **Färben:** jede Nachbarszene bekommt die Werte ihres Tragwerks aus demselben Stabwerk (`nachbarFaerben`, app.js: bei «umhüllend» die Hülle je Stab, im Plot «w» die Wege des Falls der Figur; ein Einzellastfall färbt den Nachbarn nicht - der Kern rechnet nur das aktive). Der Renderer zeichnet eine passive Fläche mit Stabwerkswert in ihrer Farbe und so deckend wie das aktive Tragwerk (`_passivGrau`, render.3d.js); ohne Wert bleibt sie grau. Ein Einzelmast aus Walzprofil als Nachbar bekommt seinen Masten aus dem Stabwerk (`mastenOhneJoch`), ein Tragausleger als Nachbar seine Werte über `auslegerSzene`. Gemessen (Testdaten, Reihe TEST-80 20 + 15 m, T2 aktiv): T1 im Bild Blech 0.4428 = Stabwerk, M2 0.6596 = Stabwerk, Einzelmast M4 0.2177 = Stabwerk. Was nicht im Stabwerk steht (eine eigene, unverbundene Gruppe neben einem Tragausleger, `rechenWerte`), bleibt grau. **Ziehen:** die Abfangjoch-Szene führt jetzt Griffe (`mastZiehen`, render.abfang.js), Kopf und Lage wie am Einzelmasten, kein Fuss (das Abfangjoch kennt keinen Fussversatz). **Befund dabei** (`mastStelleSetzen`, ui.js; gilt auch fürs Feld x und die Marke im Lageband): am Abfangjoch wurde L = Mastabstand gesetzt; bei einer Länge des Sortiments rückte Mast B danach um 2·ü zurück (Ziel 13.50 m → L 13.5, Mast bei 13.00 m). Jetzt wird die Länge gewählt, deren Mastlage das Ziel trifft (Länge des Sortiments mit Abstand + 2·ü, sonst der Abstand ohne Überstand): 13.50 → L 14, Mast bei 13.50; 13.40 (nicht im Sortiment) → L 13.4. Eine Länge ausserhalb des Sortiments rechnet das Stabwerk weiterhin nicht («Blecheinteilung nicht erfasst»). Im Browser (Modulversion mit den Testdaten, Chromium): Zeiger ↔ / ↕ an den Masten des Abfangjochs, M2 12.00 → 13.40 m, M1 am Kopf 8.08 → 9.58 m; Nachbar T1 farbig. **Testdaten:** erfundenes Abfangjoch TEST-A16 (UPE 160) und eine Vorlage «Test-Leiter abgefangen» (testdaten/erzeuge.mjs) - der Rauchtest fährt das Abfangjoch jetzt mit (Stabwerk, COM-Datei, zwei übereinander); dabei im Durchgang behoben: `getVorlage` warf bei fehlender Vorlage. ⚠ Prüfstand mit den Betreiberdaten nicht gelaufen; Abschnitt 222 für sich auf den Testdaten grün. Prüfstand 222 |
| Antworten auf die offenen Rückfragen (4. Oktober) | Im Wortlaut: «Offene Rückfragen 1. hinten anstellen. 2. umhüllen alle stäbe färben. einseitig immer halbiert die spannweite. Tragseil R-FL ist beweglich abgefangen, der leiterzug ist demfall temperaturunabhängig und konstant. UL Rohr mit 6mm belassen. bechte aber, das bei einigen Typen das rohr über die kopfplatte angeschlossen ist und nicht bis zur mastaufweitung nach untern weiter geht. gehe hierfür in die grundlagen und versuche die logik zu verstehen, melde dich wenn du nicht sicher bist. u120, wo steht das? ist viellicht die u12 druckstüze gemeint? der Bestandesschutznachweis mit kachel finde ich gut, man müsste die neuen bauteile definieren können dafür. ja nachweis auf fahrdrahtpunkt umstellen. falls die masspitzen auch nachgewiesen werden, diese auch als punkt aufführen im verformten stabmodell. die verdrehung bei den signalen um die jochachse ist auch relevant diese könnte man in einem späteren schritt ergänzen, hat aber keine prio, also zurückstellen. 3. so weit wie sinnvoll vereinheitlichen. 4. beim abfangjoch kann man keine drag and drop befehle ausführen bei den masten.» Daraus: (1) AxisVM-Lauf Beispiel B **zurückgestellt**. (2) Bei «umhüllend» **alle Tragwerke des Blattes** aus dem Stabwerk färben. **Einseitig abgefangen: die Spannweite wird immer halbiert**, auch eine am Leiter eingetragene (bestätigt meine Lesart vom 3. Okt.). **Tragseil R-FL beweglich abgefangen**, Leiterzug konstant 12 kN - so rechnet der Code schon (`abfangArt`, data.fl.js), nichts geändert. **UL-Rohr 6 mm bleibt**; ⚠ bei einigen Typen ist das Rohr über die Kopfplatte angeschlossen und läuft nicht bis zur Mastaufweitung hinunter - aus den Grundlagen zu klären (in der Cloud-Sitzung nicht zugänglich). «u120» steht in der Weisung vom 3. Oktober (Beispiel mit zwei Gittermasten, «einem alten u120 joch»), gelesen als J120-alt - beim Auftraggeber rückgefragt. **Bestandesschutz-Kachel gewünscht**, dazu die neuen Bauteile als solche bezeichnen können (⚠ Ausgestaltung offen). **GZG-Nachweis auf die Auslenkung der Fahrdrähte umstellen**; werden die Mastspitzen nachgewiesen, auch sie als Punkt in der verformten Figur. Verdrehung der Signale um die Jochachse **zurückgestellt** (keine Priorität). (3) Tragwerksarten so weit sinnvoll vereinheitlichen. (4) Abfangjoch: Masten im 3D lassen sich nicht ziehen |
| Starrglieder der Anbauteile im Modell direkt statt rechtwinklig (4. Oktober) | Mit Bild (rechtwinkliger Weg schwarz, der gemeinte in Magenta), im Wortlaut: «der fahrweg der einzelnen starrelement verbindungen optimieren auf die variante direkt (markierung auf bild) so sparen wir an anzahl elementen beim aufbau des modells. die berechnung sollte es nicht beeinflussen.» Im Stabmodell (Stabwerk der App und AxisVM-Datei, dieselbe Datei) bekommen die Knickpunkte der Kette keinen Knoten mehr: `direkteGlieder` (core.anbauteile.js) verbindet Wurzel und echte Punkte (Lastpunkte der Teile) direkt, auch schräg; am Joch und am Masten (`ARM…`, `ARMM…`). Die Namen der echten Knoten bleiben (`AL{k}_{nr}`). **Das 3D-Bild zeigt weiter den rechtwinkligen Weg** (`anbauKette` unverändert, Weisungen 19./20./24. Sept.); die verformte Figur liest das Stabmodell und zeigt die Ketten jetzt direkt. Gemessen auf den erfundenen Testdaten (TEST-80/20 m mit Masten), Knoten/Stäbe vorher → nachher: Hängestütze mit Fahrdraht 1.5 m aussen und 0.3 m quer 786/895 → 784/893; zwei Traversen mit Leiter höher und aussen 812/920 → 810/918; Teil am Masten aussen und höher 750/852 → 747/849; Hängestütze ohne Versatz unverändert 772/881. **Rechnung:** Wege alt gegen neu 0.6e-6 (Starrfaktor 1) bis 1.3e-5 (Starrfaktor 30) des grössten Wegs - das alte Modell gegen sich selbst, Starrfaktor 10 gegen 30: 2.5e-5, also Rechenrauschen der Ersatz-Starrstäbe; η in der fünften Stelle (Blech 0.445415 → 0.445424, Gurt 0.401554 → 0.401544, Masten gleich). In AxisVM sind es echte Starrkörper. ⚠ **Prüfstand mit den Betreiberdaten nicht gelaufen** (Sitzung in der Cloud ohne `data/*.json`); Abschnitt 221 für sich auf den Testdaten grün und am alten Code 3 gefallen; Durchgang auf Testdaten ohne Bruch; nicht im Browser angesehen, nicht in AxisVM gebaut. Prüfstand 221 |
| Fahrdrähte an der verformten Figur (4. Oktober) | Mit Bild (Plot «w», J120-alt 23 m, Wind quer), im Wortlaut: «pushen und hier die fahrdrähte auch in orange aufführen und deren auslenkung angeben, dies ist der wert der für die nachweise hauptsächlich gilt. so muss man auch nicht zwingend angeben ob joch oder ausleger relevant sind.» Die verformte Figur führt jetzt auch die starren Ketten der Anbauteile (ARM…, AT…; `verformteFigur`, je Glied zwei Punkte); je Fahrdraht (`istFahrdraht`, core.anbauteile.js: Cu 107 / Cu 150 der Fahrleitung für sich oder im Kettenwerk - nicht das Tragseil allein, nicht die Zusatz- und Rückleiter) ein Ring an der verformten Lage und die Auslenkung QUER zum Gleis («Fd 12.3 mm quer»), immer angeschrieben; die Textzeile nennt den grössten («Fahrdraht quer … mm»). Die Stelle kommt aus der Szene (Marke des Angriffspunkts, `fahrdraht`), der Weg vom nächsten Kettenpunkt der Figur (≤ 0.35 m - das Stabmodell rückt ein Teil aus einem steifen Knotenbereich, die Szene nicht). Am Tragjoch, an Teilen am Masten und am Tragausleger. Im Browser (Prüfseite, gelöscht; J120-alt 23 m, Hängestütze mit Fahrdrahtabzug, Kettenwerk, Hängestütze mit NT-Ausleger): Ketten orange, drei Ringe mit Anschrift; im massgebenden Fall Wind längs steht «Fd 0.0 mm quer». ⚠ **Nur Anzeige:** der Nachweis der Gebrauchstauglichkeit rechnet weiter an der Referenzhöhe am Masten; ob er auf die Auslenkung der Fahrdrähte umgestellt wird, ist beim Auftraggeber erfragt. ⚠ Bei «umhüllend» zeigt die Figur den massgebenden Fall der Gebrauchstauglichkeit - ist das Wind längs, ist die Auslenkung quer null; Wind quer wählt man am Lastfall. Prüfstand 220 |
| Alle Tragjoch-Typen zusammengetragen, verjüngte in AxisVM aufgebaut; Endfeldblech am J120-alt (4. Oktober) | Im Wortlaut: «alle typen zusammentragen und im axis aufbauen für check falls notwendig.» Neues Werkzeug `modell_typen.mjs`: je Typ (14, kürzeste Normlänge, HEB 260, ohne Teile) Stabmodell wie der Stabwerksknopf - Riegelstellen, deckungsgleiche Knoten (keine), η; dazu je Bauweise ein Blatt mit allen sieben Typen nebeneinander (`com/AxisVM_Typen_alt/_neu.json`). Alle sieben verjüngten Typen tragen Riegel bei 0 / 0.9 / L−0.9 / L (J60-alt/8 m auch bei 3 / 5); die neuen Typen keine. **In AxisVM aufgebaut (nicht gerechnet, geschlossen, rund 9 Minuten):** das Blatt «alt», 5020 Knoten, 2894 Stäbe, 2792 Starrelemente, 56 Verbindungselemente, keine verschmolzenen Knoten; `com/AxisVM_Typen_alt.axs`. Das Blatt «neu» liegt als Datei bereit, nicht aufgebaut (unverändert). Dazu gemeldet mit Bild (J120-alt 23 m auf Gittermast, η Bindeblech 1.013, rot das letzte liegende Blech im Endfeld): «kann das mit dem starrelement zusammenhängen? oder ist der aufbau nicht korrekt im stabmodell?» - **ja, es war das fehlende Starrelement am Knick:** gemessen J120-alt/23 m, M1 Gittermast, ohne Teile, vor → nach dem Riegel: liegendes Blech unten bei 0.75 m vom Ende 0.860 → 0.550 (Wind längs), massgebend danach das Blech bei 1.50 m mit 0.605; mit HEB 260 beidseits 0.519. Das Bild des Auftraggebers stammte vom Stand vor der Berichtigung (Seite neu laden) |
| Verjüngte Joche: stehende Starrelemente am Knick der Ansicht (4. Oktober) | Am aufgebauten AxisVM-Modell (J120-alt), mit Bild, im Wortlaut: «im auflagerbereich fehlt bei den "jochtypen verjüngt" starrelemente vertikal beim knick (karkiert)», dann mit Bild der Ansicht: «nicht grundriss knick sondern ansicht». **Befund:** der erste Knick der Voute (Ende des geraden Endstücks, 0.90 m) war kein Schnitt des Stabmodells - der Untergurt lief als ein gerader Stab von 0.81 nach 1.44 m am Knick vorbei, und der Riegel der Weisung vom 5. September («an den enden und beim uebergang zum knick hin») fand dort keinen Knoten; gebaut war er nur für den zweiten Knick (3.00 m), wo meist ein Blech steht. Jetzt sind beide Knicke feste Schnitte (`vouteKnicke`, export.axisvm.js) und tragen je Seite einen Riegel, wo kein stehendes Blech steht. Gilt für Stabwerk der App und AxisVM-Datei (dieselbe Datei). **Gemessen (Stabwerk, ohne Anbauteile, HEB 260):** J120-alt/24 m Blech 0.7708 → **0.5478**, OG 0.4741 → 0.4283, UG 0.5218 → 0.4594, Mast 0.9093 → 0.9097; J90-alt/16 m Blech 0.6482 → 0.6045, UG 0.3868 → 0.3437, OG 0.3487 → 0.3555; J60-alt/8 m (gestaucht, Riegel auch bei 3.00 / 5.00) Blech 0.3017 → 0.2664, **OG 0.2550 → 0.3004**, UG 0.3407 → 0.3499; Beispiel B (J120-alt/24 m auf Gittermasten, mit Teilen) Blech 1.0879 → **0.7133**, UG 0.7315 → 0.6835. J90/20 m (nicht verjüngt) unverändert. Die Bleche der alten Joche standen bisher zu hoch da (sichere Seite), der Obergurt des kurzen J60-alt zu tief. ⚠ Die AxisVM-Ergebnisse des Beispiels B gehören zum Modell ohne diese Riegel; ein neuer Lauf nur auf Anweisung. Der Grundriss-Knick (J60-J90 neu) bekommt keinen Riegel - nicht verlangt. Prüfstand 100 nachgeführt |
| Klemmzonen geklärt: AxisVM verschmilzt deckungsgleiche Knoten; Druckstützen am Abfangjoch in Farbe; COM-Skripte (4. Oktober) | Mit Bild (zwei Abfangjoche mit Druckstützen, daneben ein Tragausleger), im Wortlaut: «werden die com skripte im aktuellen stand geschrieben mit dem befehl unter export axisvm? mach weiter mit dem klemmzonen problem. noch etwas vorweg, die druckstützen werden hier nicht in den resultatfarben dargestellt im 3d modell.» **Klemmzonen - Ursache gefunden:** im Beispiel B sitzen Hängestütze und Kettenwerk an derselben Stelle x; die Mitte des Anschlusskörpers der Stütze (`AT2_UG`) und der Reihenknoten des Kettenwerks (`AT3_UG_R1`) liegen deckungsgleich. Die Datei führt zwei Knoten, der eigene Löser rechnet zwei, **AxisVM gibt beim Anlegen für dieselbe Stelle denselben Knoten zurück** (Zuordnungsdatei: beide Nr. 965; drei solche Paare, je Gleis eines) und macht aus zwei Anbauteilen einen Starrkörper. Der hält den Untergurt an zwei Stationen in x (11.95 und 12.15) und nimmt ihm dazwischen die Gurtkraft ab. **Gegenprobe:** dieselbe Verschmelzung im eigenen Löser (Arbeitskopie) gegen die vorhandenen AxisVM-Ergebnisse, ohne Schub, über das GANZE Joch (ohne ausgenommene Zonen): G Gurt N 87.4 → **1.3 %**, Gurt V 94.0 → **1.7 %**, Gurt M 105.7 → **1.7 %**, Blech V 12.4 → **0.15 %**, Blech M 11.1 → **0.26 %**; Wind längs Gurt N 0.47 %, Blech 0.1-0.4 %. Der Unterschied war also das AxisVM-Modell, nicht der Löser; die Zahlen der App galten dem gemeinten Tragwerk (zwei Teile). **Behoben in der Ausleitung** (`knotenEntflechten`, letzter Schritt von `stabmodellJson`): liegt ein Knoten auf einem anderen, rückt einer um 20 mm zu einem Nachbarn seines eigenen Teils - nur einer, an dem ausschliesslich Starrglieder hängen und weder Last noch Auflager sitzt (im Starrkörper ist seine Lage ohne Belang); was sich so nicht lösen lässt, steht in `deckungsgleich`. Am Urteil des Beispiels nichts (Blech 1.08789 gleich, M1 Gurt 0.80238 → 0.80239). **Die Brücke** meldet jetzt laut, wenn AxisVM mehreren Namen eine Knotennummer gibt (Abschnitt 5 des Berichts). ⚠ Die neue Datei ist in AxisVM nicht gebaut (nur auf Anweisung); dass 20 mm reichen, ist aus den vorhandenen Modellen geschlossen (Knoten im Abstand 11-12 mm bleiben dort getrennt). **Druckstützen:** die Abfangjoch-Szene bekam den Ankernachweis gereicht (`ergAnker`), las ihn aber nicht - jetzt `ankerEta` wie am Tragjoch, mit der Zahl des Stabwerks, wenn es gilt, sonst des Kerns. Im Browser (Prüfseite, gelöscht; zwei A160 mit U12): beide Stützen blau (η 0.31) statt weiss. **COM-Skripte:** die Modulversion holt sie bei jedem Ausleiten frisch aus `com/` (ohne Zwischenspeicher), die gebündelte Einzeldatei trägt den Stand des Bündelns; die installierte App (PWA) hält sie bis zur nächsten Fassung. `Versand/COM_Bruecke` und die Einzeldatei neu abgelegt. Prüfstand 219 |
| Abfangjoch: Bild und Verläufe aus dem Stabwerk; AxisVM-Prüfung des berichtigten Blattes (3./4. Oktober) | Im Wortlaut: «Bild und Verläufe nachziehen und dan axis prüfung». **Bild:** bei «umhüllend» tragen Gurte, Gabel, Bindebleche und Masten des Abfangjochs die Hülle je Stab aus dem Stabwerk (`stabwerkFaerben` mit `abfangStaebe`, render.stabwerk.js; die Szene nennt GURT_V / GURT_H / GABEL / BL_O<k> / BL_U<k>, die Stäbe V_S… / H_S… / GABEL_… / BL_…); ein gewählter Einzellastfall zeigt weiter den Kern. **Verläufe:** Gurte vorn / hinten, Bleche je Station, Gurtkraft und je Mast aus dem Stabwerk, der Ersatzbalken eingeklappt darunter. Gemessen zwei A160/12.5 m mit Druckstützen: grösstes η im Bild Gurt 0.8610 = Kachel, Blech 0.5024 = Kachel, Mast 0.1748 (Kachel 0.1747 / 0.1748). Im Browser (Prüfseite, gelöscht): Legende «aus dem Stabwerk», Reiter Verläufe mit den vier Stabwerksblöcken. **AxisVM** (Anweisung gegeben; `com/AxisVM_Beispiel_A.json` neu gebaut, linear gerechnet, ausgelesen, geschlossen, rund 12 Minuten; 470 Knoten, 582 Stäbe): das Blatt mit allen Berichtigungen des Tages (Mast je Anschlusshöhe geteilt, Mastwind, halbe Spannweite, starre Blechenden, Bindebleche der Druckstütze). Löser ohne Schub gegen AxisVM, je Lastfall die grösste Abweichung bezogen auf den grössten Wert: **Leiterzug** Gurt N 0.04 %, Gurt M_z 0.02 %, Blech V / M 0.02 %, Mast N / V_y / M_z 0.00 %, Mast M_y 3.6 % (von 2.24 kNm), Mast T 0.4 %; **Wind längs** Gurt N 0.03 %, Blech 0.02-0.03 %, Mast M_y 2.7 % (von 0.61 kNm); **Wind quer** Mast M_y 0.00 % (11.57 kNm), V 0.00 %; **Eigengewicht** Gurt M_y 0.03 %, Mast N 0.02 %, M_y 0.23 %; **Havarie** Gurt N 0.06 %, Mast M_y 5.3 % (von 0.24 kNm). Über 5 % nur Grössen, die praktisch null sind (Torsion der Gabel 0.09 kNm, Normalkraft eines Endblechs 0.10 kN mit umgekehrtem Vorzeichen, Nebenmomente unter 0.02 kNm). **Das Abfangjoch gilt damit als gegen AxisVM bestätigt.** Prüfstand 218 |
| Schiene am Abfangjoch aus dem Stabwerk; Stand zur Abgabe (3. Oktober) | Im Wortlaut: «ist die app jetzt in einem produktiven stand? datenbankdatei com? Schiene am Abfangjoch auch auf das Stabwerk umstellen.» Die rechte Schiene zeigt am Abfangjoch Gurt und Bindeblech aus dem Stabwerk, wenn es gilt (app.layout.js, Gruppe «Abfangjoch · Stabwerk»), sonst wie bisher den Kern. Im Browser (Prüfseite, gelöscht): Schiene «G 0.86 · Bl 0.50 · M1 0.17 · M2 0.17 · Ank 0.31» = Kacheln 0.861 / 0.502 / 0.175. Datenpaket, COM-Skripte und die gebündelte Einzeldatei liegen neu in `Versand/` (Sortimente seit dem letzten Paket unverändert; Brücke unverändert). Zur Frage «produktiv» dem Auftraggeber gemeldet: Rechenwege geprüft und grün, aber das Blatt mit zwei Abfangjochen ist seit den Berichtigungen vom Tag nicht in AxisVM nachgerechnet, und die Liste unter *Offene Punkte* gilt. Prüfstand 217 |
| Einseitig abgefangener Leiter: halbe Spannweite (3. Oktober) | Auf die Frage, ob dort die ganze oder die halbe Spannweite gilt, im Wortlaut: «halbe Spannweite gilt beim einseitig abgefangenen leiter». Gewicht, Wind, Schnee und Ablenkung eines Drahtwerks kommen bei «einseitig» aus der halben Spannweite (eine Stelle: `expandiereAnbauteile`, data.anbauteile.js; die Art je Leiter aus `havarie` bzw. `artWahl`, ohne Eintrag die Vorgabe der Tragwerksart `artVorgabe` - am Abfangjoch «einseitig»). Gilt an allen Tragwerksarten und in Kern, Stabwerk, Ausleitung, Bild und Anzeige (Karte und Liste rechnen mit, `trasseVon`; die Modulzeile mit ihrem Index `artIndex`). **Meine Lesart:** auch eine am Leiter eingetragene eigene Spannweite wird halbiert; «beidseitig abgefangen» bleibt bei der ganzen. Gemessen Beispiel A (zwei A160/12.5 m, Druckstützen, Spannweite 40 m), ganze → halbe: EK1 Joch unten 0.880 → **0.861**, oben 0.733 → **0.714**, Mast 0.186 → **0.175**; EK3 0.907 / 0.761 / 0.215 → 0.889 / 0.742 / 0.199; Einheitswind 0.857 / 0.710 / 0.179 → 0.838 / 0.692 / 0.166. Tragseil N-FL abgefangen, 40 m, R 600: G 0.400 → 0.200 kN, Wind quer 0.340 → 0.170, Ablenkung 0.427 → 0.213 kN. Im Browser (Prüfseite, gelöscht): Liste «Fahrdraht Gleis 1 · F_x 0.17 · F_z −0.20 kN». Prüfstand 216 |
| Verformte Figur mit dem Plot «w», Werte an der Figur, Knopf δ weg (3. Oktober) | Mit Bild (Abfangjoch, Wind quer: am Masten 98.4 mm angeschrieben, daneben «grösster Weg 6.8 mm»), im Wortlaut: «die verformung einblenden wenn der verfrmung w und nachweis button aktiviert wird. die werte an die verformte figur anschreiben. der button verformte figur kann dann wieder weg.» Die Figur wird gerechnet, sobald das Stabwerk gilt, und gezeichnet bei «w» und «η w» (`FIGUR_MODI`, render.3d.js); der Knopf δ der unteren Leiste und sein Zustand sind weg (ändert die Weisung vom 30. September «δ zu den unteren Symbolen»). Im Plot «w» stehen die Werte an der verformten Lage (Betrag in mm je Figurpunkt, ausgedünnt wie bisher), auch ohne «Werte anschreiben»; die Zahlen an den Flächen entfallen dort. **Befund im Bild:** die 98.4 mm am Masten kamen aus dem Ersatzbalken (Mastfarbe am Abfangjoch und am Walzprofil-Einzelmasten), die Figur aus dem Stabwerk. Jetzt tragen die Flächen des gerechneten Tragwerks im Plot «w» den Weg des nächsten Figurpunkts (`wegeAusFigur`, app.js) - eine Quelle für Farbe, Zahl und Legende, bei allen Tragwerksarten. Im Browser (Prüfseite, gelöscht; zwei A160 mit Druckstützen, umhüllend): «w» zeigt Figur und Werte 1.3 … 7.0 mm, Legende 0-6.1 «Aus dem Stabwerk …», «η» ohne Figur, «η w» mit Figur, kein Knopf δ. Gesehen, nicht geändert: die rechte Schiene zeigt am Abfangjoch «G 1.14» (Ersatzbalken), die Kachel Gurt 0.880 (Stabwerk). Prüfstand 215 |
| Mast gegen AxisVM 11-14 %: vier Befunde am Abfangjoch (3. Oktober) | Im Wortlaut: «Biegemoment und Querkraft in Jochrichtung weichen noch 11–14 % ab. nachgehen. hängt das mit der einspannung von mast und joch zusammen oder weil die beiden joche eine rahmentragwerk wirken.» **Antwort:** das Moment selbst ist Rahmenwirkung über den Anschluss (nur der hintere Gurt hält längs, an beiden Enden; seine Kraft 0.8 / 2.1 kN greift 0.163 m neben der Mastachse an, verdreht den Masten und biegt ihn in Jochrichtung). **Die Abweichung** kam aus der Druckstütze: (d) ihre **Bindebleche standen im Löser quer** (`I_y`/`I_z` vertauscht, derselbe Fehler wie am Blech des Abfangjochs; AxisVM baut das Rechteck aus den Abmessungen) - die Stütze hielt die Verdrehung des Masts zu wenig (am Ankerpunkt 3.84 statt 2.21 mrad, AxisVM 2.21). Berichtigt: Mast M_y gegen AxisVM 13.6 → **2.9 %** (G_Ablenk), 11.3 → 2.4 % (Wind y), 6.6 → 1.4 % (Havarie); der Starrfaktor ändert nichts (10 bis 10 000 gleich). Am Urteil klein: J90/20 m mit U12 quer Mast M1 0.6755 → 0.6778, Joch 0.4087 → 0.4121. **Dabei drei weitere Befunde, alle behoben:** (a) **zwei Abfangjoche übereinander: das untere hing am Ansatzknoten des oberen** - Kopf und Ansatz hiessen am gemeinsamen Masten gleich (MAST_M1_K / _A), beim Vereinen zählt der erste; das untere Joch hing über einen 1.5 m langen starren Stab am oberen Anschluss, der Mast war dazwischen nicht geteilt (so auch in der in AxisVM gebauten Datei). Jetzt tragen diese Knoten die Anschlusshöhe im Namen wie am Tragjoch (`anschlussNamen`), der Mast wird aus allen Teilpunkten aufgereiht (Fuss, −1.63, −1.50, Anker, −0.13, 0). (b) **Den Masten des Abfangjochs fehlte im Stabwerk der Mastwind** (keine Last an einem Maststab; Kern, Tragjoch und Tragausleger setzen ihn an) - jetzt `mastWindBeide` in beiden Richtungen; dazu fielen Streckenlasten auf Abfangjoch-Masten beim Aufreihen durch (Stab vom Kopf zum Fuss gebaut, `mastNeuAufreihen` verglich von/bis statt unten/oben). (c) **Das Abfangjoch las Windstufe und Trasse aus Feldern, die es nicht gibt** (`ek`, `L_FL`, `R` statt `windKlasse`, `flSpannweite`, `trasseRadius`): es rechnete IMMER mit EK2 und Spannweite 0, in Kern, Bild, Ausleitung und Stabwerk; der Einheitswind kam dort nie an. Jetzt `mitTrasse` (core.lasten.js) an allen sechs Lesern. Gemessen Beispiel A (zwei A160/12.5 m, Druckstützen), vorher bei jeder Windstufe gleich: Joch unten 0.861, oben 0.710, Mast 0.234 / 0.230. Nachher EK1: **0.880 / 0.733 / Mast 0.186**; EK3 0.907 / 0.761 / 0.215 (ohne d: 0.221); Einheitswind 0.857 / 0.710. Der Mast sinkt, weil das untere Joch jetzt unter dem Anker angreift statt darüber; die Joche steigen, weil die Leiter jetzt Wind über die Spannweite tragen. Im Browser (Prüfseite, gelöscht): Gurt 0.880, M1/M2 0.186, Anker 0.309, Fundament 0.455. ⚠ **Die neue Datei ist in AxisVM nicht gebaut** (anderer Mast, Mastwind) - der Vergleich oben ist an der alten Datei geführt; ein neuer Lauf nur auf Anweisung. ⚠ Offen: ein einseitig abgefangener Leiter bekommt Wind und Gewicht über die GANZE Spannweite (er hat nur ein Feld) - nicht geändert, beim Auftraggeber zu erfragen. Prüfstand 214 |
| Durchsicht der vier Tragwerksarten; COM bei gewähltem Abfangjoch; COM und Daten bereitgestellt (3. Oktober) | Mit Bild (zwei Abfangjoche an M1/M2, das untere grau), im Wortlaut: «Was spricht für und dagegen die beiden abfangjoche aktiv zu haben bei der auswertung? Checke die einheitlichkeit und kompletheit der funktionen der einzelnen tragwerkstypen Com und datenbank nachziehen und bereitstellen». **Befund und Behebung:** war ein Abfangjoch gewählt, leitete der COM-Knopf nur dieses eine Joch aus (`exportiereAbfangJson`: 164 Knoten, 206 Stäbe, kein Anker, 3 Kombinationen), das Stabwerk rechnete das Blatt (466 / 578, 168 Ankerstäbe, 20 Kombinationen). Jetzt baut `stabwerkModell` (app.stabwerk.js, aus `rechneStabwerk` herausgelöst) die Datei für beide; `stabwerkDatei` gibt sie ohne Eigengewichtslasten an die Ausleitung. Im Dialog ist beim Abfangjoch «Mast» die Vorgabe, wo einer steht; «auf Punkten» bleibt das Joch allein. Gemessen: die Datei ist bis auf den Zeitstempel die in AxisVM gebaute Beispieldatei A (und B); im Browser (Prüfseite, gelöscht) 466 Knoten, 578 Stäbe, Träger T2 und T3, 20 Kombinationen. **Durchgang:** `durchlauf.mjs` fuhr das Abfangjoch nie - jetzt allein und zwei übereinander mit Druckstützen (Stabwerk, COM-Datei, 3D). **Was uneinheitlich bleibt** (nicht geändert, steht unter *Offene Punkte*): 3D-Färbung, Verläufe und Schnitt aus dem Stabwerk nur am Tragjoch (Tragausleger: 3D ja); SAF / DXF / PyNite nicht für Abfangjoch und Gittermast; Gittermast nicht am Abfangjoch und Tragausleger; Knicken aus dem Stabwerk nicht am Einzelmasten und Abfangjoch. Die Frage nach beiden aktiven Abfangjochen ist beantwortet (Für und Wider), ⚠ Entscheid offen. **Bereitgestellt** in `Versand/`: Datenpaket vom Tag, `COM_Bruecke/` mit den vier Skripten und der Anleitung (Brücke unverändert: sie liest die Stabart aus dem Feld, der Querschnitt eines Starrkörpers ist ihr gleich). Prüfstand 213 |
| Abfangjoch: starre Enden wirklich starr; Aufdoppelung nur am langen Ende (3. Oktober) | Zum Rest von 6-20 % gegen AxisVM, im Wortlaut: «hast du die profilaufdoppelung an den enden beim abfangjoch berücksichtigt hier bei der vergleichsberechnung» - ja, in beiden Modellen gleich, am langen Ende; bestätigt: «verstärkung nur am ende mit der längeren gabel um das grössere moment aufzunehmen.» Dann: «wie sieht es mit den querprofilwerten aus? und wurde eventuell starrelemente im axis in den gurten verbaut?» **Querschnittswerte** stimmen (Gurt, Gabel, Bleche: Datei = AxisVM). **Starrelemente: das war die Ursache.** AxisVM baut aus `art: 'starr'` einen Starrkörper und sieht den Querschnitt nicht an; der eigene Löser rechnet den genannten Querschnitt mal `STARR_FAKTOR`. Am Abfangjoch trugen die starren Blechenden (79 mm von der Gurtachse zum Blech) den Querschnitt des Blechs, die Arme zu Gabel, Anbauteil und Schott den des Gurts - im Löser also ein Flachstahl 100/8 mit zehnfachem E statt eines starren Stücks. Jetzt tragen alle starren Stäbe des Abfangjochs den Ersatzquerschnitt STARR 500x500 wie am Tragjoch (export.axisvm.abfang.js; er steht auch ohne Masten in der Datei). Tragjoch, Tragausleger, Gittermast waren nicht betroffen (gezählt in den Modelldateien). Für AxisVM ändert sich nichts (alte und neue Datei gleich bis auf den Querschnittsnamen von 180 starren Stäben) - **kein neuer AxisVM-Lauf nötig**. Gemessen Beispiel A (zwei A160/12.5 m übereinander), Löser ohne Schub gegen AxisVM: Durchbiegung 36.4 → **25.7 mm** (AxisVM 25.4); Gurt N 6.0 → **0.64 %**, Gurt M_z 19.9 → **0.41 %**, Blech V / M 14.7 → **0.24 / 0.33 %**. Am Urteil: Joch unten 1.013 → **0.861**, oben 0.830 → **0.710**, Masten 0.235 / 0.231 → 0.234 / 0.230 - die Abfangjoch-Zahlen des Stabwerks lagen bisher zu hoch (sichere Seite). ⚠ Bleibt: Mast M_y / V_z 11-14 % (grösster Wert 6.5 kNm; N, V_y, M_z 0.00 %), nicht untersucht. Prüfstand 212 |
| Quervergleich mit AxisVM an zwei Beispielblättern; liegendes Blech des Abfangjochs; Export/Import; Handbuch (3. Oktober) | Im Wortlaut: «Handbuch und optionen aktualisieren. den export und import auf datenvertäglichkeit und funktionalität chekcen - checke den bau im axisvm mit den getesteten tragweken und mach einen qervergleich mit der app bezüglich der auswertung der resultate. - wie wird das joch und die anbauteile am gittermasten befestigt beim axis modell?» **AxisVM** (Anweisung zum Rechnen damit gegeben; gebaut, linear gerechnet, ausgelesen, geschlossen; `modell_beispiele.mjs` schreibt `com/AxisVM_Beispiel_A/_B.json`, 54 und 37 Minuten): **A** zwei A160/12.5 m übereinander mit Druckstützen, **B** J120-alt 24 m auf zwei Gittermasten. **Befund an A, Fehler im Stabwerk der App:** `blechQs` (export.axisvm.abfang.js) führte I_y und I_z des liegenden Bindeblechs vertauscht; AxisVM baut das Rechteck aus den Abmessungen (richtig liegend), der eigene Löser las die Zahlen und rechnete es hochkant - der liegende Vierendeel war in Gleisrichtung fünfmal zu weich (Durchbiegung unter dem Leiterzug 126 mm gegen 25.4 mm in AxisVM), die Gurte trugen fast allein. Berichtigt (I_z = t·b³/12). Am Urteil des Beispiels: Gurt unten 1.459 → **1.013**, oben 1.173 → **0.830**, Blech 0.629 → 0.574 - die bisherigen Abfangjoch-Zahlen des Stabwerks lagen zu hoch (sichere Seite). Danach gegen AxisVM (Löser ohne Schubverformung): Mast N, V_y, M_z 0.00 %, Mast M_y 7-14 %, Gurt N 6 %, Gurt M_z 20 %, Blech V/M 12-15 %; Durchbiegung 36.4 gegen 25.4 mm - ⚠ **Rest nicht geklärt** (die App liegt mit Gurt und Blech darüber); die Schubverformung ist es nicht. **B:** ausserhalb der Klemmzonen der Anbauteile (± 0.6 m um die Hängestützen und den Jochaufsatz) Jochgurte N 0.2-1.0 %, M 1.6-2.0 %, Bleche V 1.1-1.2 % / N bis 5.6 %, Gurte der Gittermasten 0.2 %, Rohr 0.00 %. ⚠ **In den Klemmzonen** weicht es stark ab (Untergurt in Feldmitte: AxisVM N 13.8 / V 31.4 kN, Löser N 114.5 / V 1.9 kN) - AxisVM trägt dort über die Starrkörper der Anbauteile; im Beispiel sitzen Hängestütze und Kettenwerk an derselben Stelle x. Nicht untersucht. `vergleich_axisvm.mjs` kennt neu `--ohne-schub` und `--ausser-x`. **Befestigung am Gittermast im Modell:** an jedem Achsknoten ein Schott (starre Stäbe von der Mastachse zu den vier Gurtknoten); die Konsolen des Jochs, die Anbauteile (starre Kette) und der Anker hängen an diesen Achsknoten, über dem Kopf am Rohr bzw. Aufsatz; in AxisVM sind das Starrkörper, der Jochanschluss selbst Linkelemente wie am Walzprofilmast. **Export/Import:** zwei Lücken behoben - die Tragwerk-Vorlage nahm die Wahl je Leiter nicht mit (`havarie`, `havarieAus` in `VORLAGE_AUS`), und eine Kopie eines Anbauteils (Kopie setzen, Strg-Ziehen) verlor Abfangart und Zugrichtung (`havarieKopieren`) - ein kopierter «einseitig abgefangener» Leiter war am Tragjoch wieder «durchgehend» (unsichere Seite). Geprüft: Datenpaket hin und zurück (Spalte `abfangung`, Typ I 30 UL, Einheitswind), Tabellenform, gespeicherter Stand mit Einheitswind / Gittermast / Abfangart; die Ausleitung nennt die Windstufe 1.0. ⚠ Das Ablage-Paket (ZIP) mit IndexedDB ist nur über seine Bausteine geprüft, nicht im Browser ein- und ausgeleitet. **Handbuch:** vier neue Kapitel (17 Stabwerk, 18 Gittermast, 19 Einheitswind, 20 abgefangene Leiter und Anker), jetzt 20; **Optionen:** der Text zum Rechenverfahren sagt, dass das Stabwerk von selbst rechnet und wofür es nötig ist. Prüfstand 211 |
| Anker am Abfangjoch und am geteilten Masten; Anbauteile am Abfangjoch im 3D; Einheitswind eine Ebene; Bemessungsdiagramm; Reihenmarken (3. Oktober) | Sammelweisung, im Wortlaut: «hast du bei den einseitig abgefangenen Leiter beachtet das beim Tragseil N-FL und R-FL es unterschiedliche Werte anzusetzen sind bei +5° / -20° und bei den Fahrleitungen hat es unterschiedliche Leiterzugkräfte - beachte noch bei dem einheitswind, das die last sich aus der angriffsfläche ergibt bei den jochen, die zweite eben wird nicht wie bei den EK 1 bis 3 mitgenommen. - checke das anbringen von anbauteilen an einem Abfangjoch und die funktion mit dem drag and drop und ob das heranzoomen funktioniert wenn man ein anbauteil auswählt. wie verhält sich das ganze wenn man zwei abfangjoche hat oben und unten? - lese die alten bemessungdiagramme der gittermasten und führe die unter verläufe, wenn einheitswind ausgewält ist. - checke die funktionsweise und den workflow und die plots von Abfangjochen (übereinander für Tragseil und Fahrdraht abfangung) mit ankern. mache das gleiche dann auch noch mit einem beispiel mit zwei gittermasten eins mit lampen und eins mit zusatzleitern am mastaufsatz und einem alten u120 joch mit üblichen anbauteilen. - nimm hier die fahrgen etwas raus, so das der fokus auf die unteren kacheln bleibt.» **(1) Leiterzüge:** hinterlegt sind Tragseil N-FL 6.4 kN (+5 °C) / 8.0 kN (−20 °C, Reglagetabelle, Basis 8 kN), Fahrdraht N-FL 8.5 kN, Tragseil R-FL 12 kN und Fahrdraht R-FL 10 kN (beide ohne Temperaturgang, keine Reglagezeile) - ⚠ ob das Tragseil R-FL einen Temperaturgang braucht, ist beim Auftraggeber erfragt. **(2) Zwei Befunde am Anker, beide behoben:** (a) das Stabmodell des Abfangjochs baute den Anker nicht (`ankerAus` leer) - der Mast trug den Leiterzug allein; jetzt `abfangAnkerAnbauen` (export.axisvm.js): derselbe `ankerBauen` wie am Joch, Mast am Ankerpunkt geteilt bzw. bis dorthin verlängert. Gemessen zwei A160/12.5 m übereinander (oben 2 Tragseile, unten 2 Fahrdrähte N-FL, Druckstütze längs je Mast, h 6.5 / a 4.5): Mast η 2.66 → 0.28, die Stützen tragen 29.17 von 29.80 kN Leiterzug; im Browser Kachel «Anker M1 0.318 · Zug 42.9 kN char.». (b) **Unsichere Seite, älter:** am geteilten Masten (Jochreihe, Abfangjoche übereinander) baute JEDES Tragwerk den Anker - zwei Stützen mit je der halben Kraft; jetzt bekommt ihn das erste Tragwerk (`ankerVergeben` in `stabmodellBlatt`). Gemessen Reihe 2 × J90/20 m, Stütze längs an M2, Wind y: Horizontalkraft am Ankerfundament 7.57 → 15.10 kN. **(3) Anbauteile am Abfangjoch im 3D:** die Szene führte ihre Anbauteile nicht (`anbauteile` mit Bereich und Index) - Heranfahren ging nicht, Ziehen auch nicht; jetzt geführt, die Flächen tragen `anbauteil`, dazu eine Klemme quer über dem Träger als Griff, und `_anbauteilUnter` nimmt ein Teil auch, wenn eine Gurtfläche in der Tiefenfolge davor liegt. Im Browser: Heranfahren beim Anklicken geht (auch mit zwei Abfangjochen übereinander, es gilt das gewählte); der Zeiger zeigt über der Klemme «grab». ⚠ Das Ziehen selbst liess sich mit dem Browserwerkzeug nicht zu Ende führen (nicht bestätigt). **(4) Einheitswind:** bestätigt eine Ebene; am Abfangjoch jetzt Profilhöhe × 1.0 (A160: 0.16 statt 0.208 kN/m, `abfangWind`), am Tragausleger die Höhe der UPE. **(5) Bemessungsdiagramm** der Gittermasten unter *Verläufe*, wenn der Einheitswind gewählt ist (`gitterBemDiagramm`: Gerade der zulässigen Fussmomente, massgebender charakteristischer Zustand aus dem Stabwerk; die Durchbiegungslinien der Blätter sind nicht gezeichnet). **(6) Beispiel 2** - «u120» als J120-alt gelesen (Tasten u/j): J120-alt 24 m auf Gittermast quadratisch nach Zeichnung (zwei Lampen) und dem langen Typ mit Aufsatz (zwei Traversen mit Zusatzleiter am Aufsatz), drei Gleise mit Hängestütze und Kettenwerk, Jochaufsatz: EK1 Bindeblech 1.088, M1 Gurt 0.802, M2 Gurt 0.947; Einheitswind Joch 0.748, M1 0.552, M2 0.534; im Browser gerechnet und gezeichnet. **(7) Reihenmarken** der Stabwerksleiste: Rahmen und Name neutral, die Ampel nur an der Zahl. Beobachtet: bei Masten ohne eingetragene Länge zeigt der Titel am unteren Abfangjoch dessen eigene Höhe (im Prüfblatt 6.00 m), obwohl der Mast das obere trägt - nicht untersucht. Prüfstand 210 |
| Einheitswind der alten Norm als Windstufe (3. Oktober) | Im Wortlaut: «kannt du noch für eine berechnung nach alter norm, den einheitswind unter lasten auswählbar machen. früher wurde nur der winddruck 1.0 kN/m2 angewendet, ohne die 1.4 formbeiwerte und bei den jochen wurde der wind nur auf die jeweilige angriffsfläche angesetzt. sow wie auch bei den masten. wir haben eine Bestandesschutz regelung. diese besagt wenn die lastzunahme nicht höher als 5% bezogen auf die grenzausnutzung überschreitet, kann von einem vertieftem nachweis abgesehen werden, solange man davon ausgehen kann, dass dazumal nach den gültigen normen gerechnet wurde. da wäre somit der einheitswind interesannt für uns. dieser sollte auch auf die anbauteile gelten.» Vierte Stufe im Feld «Windbelastung» (`windKlasse` '1.0', intern `EK0`, Blattfeld wie die übrigen). **w = Angriffsfläche · 1.0 kN/m², kein Formbeiwert** (Regel in data.fl.js: `windWert`, `windWertStufe`, `windAusFlaeche`): **Tragjoch** aus der Geometrie - stehende Gurtschenkel + Vertikalbleche einer Seite je Meter (`jochWindflaeche`, dieselbe Fläche wie beim Gittermast); **Masten** Tabellenwert / (q · 1.4) = Profilbreite (HEB 260: 0.26 kN/m); **Gittermast** A_s(z) · 1.0, Rohr d · 1.0 ohne den Faktor 1.2, Aufsatz Kante · 1.0; **Anbauteile der Lasttabelle** Tabellenwert / (q · c), über EK1-EK3 gemittelt - ⚠ meine Annahmen: c = 1.4 steckt in allen Werten ausser den Drähten (dort c = 1.0, der Einheitswind liegt also 11 % über EK1), gemessen skalieren 72 von 76 Windzeilen mit 0.9 / 1.1 / 1.3 (Ausnahme zwei LED-Lampen-Zeilen); **freie Fläche / Signal** A · 1.0; **Abfangjoch und Tragausleger** aus dem Tabellenwert / (q · 1.4) (A160: 0.208 kN/m, ⚠ über der Profilhöhe 0.16 - nicht aus der Geometrie). Eine Zahl in der Spalte EK0 der Lasttabelle gilt vor der Herleitung. Von Hand eingegebene Windkräfte (freie Lastblöcke, «Lasten manuell») bleiben. Lastbeiwerte, Kombinationen und Nachweise unverändert. Gemessen J90/20 m, HEB 260, Hängestütze mit NT-Ausleger (Stabwerk), EK1 → Einheitswind: w_k Joch 0.43 → 0.220 kN/m, Mastwind 0.33 → 0.26, Joch η 0.595 → 0.530, Mast M1 0.705 → 0.425; Einzelmast HEB 260/10 m 0.247 → 0.196; Einzelmast Gittermast (quadratischer Typ nach Zeichnung) 0.184 → 0.117. Im Browser (Prüfseite, gelöscht): Stufe gewählt, w_k 0.22, w_Mast 0.26 / 0.26, Fussleiste «Einheitswind», Stabwerk rechnet neu. ⚠ Nicht gebaut: ein Vergleich «alt gegen neu» mit der 5-%-Regel in einem Blick (man schaltet die Stufe um). Prüfstand 209 |
| Gittermast: UL-Ausführung aufgenommen; Anbauteile am Gittermast (3. Oktober) | Im Wortlaut: «UL-Ausführungen aufnehmen. als wanddicke die 6mm belassen. rohr ist nur am kopf und knick gehalten. die zwei uL des I 30 zusammenführen.» Neuer Typ **I 30 UL** im Sortiment: Gitter wie I 30 (Gurte, Teilung, Bleche, Bemessungsdiagramm), Rohr 5.60 m über dem Kopf, Gesamthöhe 16.00 m, die zwei Ausführungen der Übersicht als eine. **Meine Lesart der Wanddicke:** das Rohr einheitlich ø 140 × 6 mm (die Übersicht zeigt unten ø 140/131, im oberen, freien Teil ø 140/120 - der freie Teil ist damit dünner gerechnet als gezeichnet, das Stück im Oberteil dicker); gehalten an Knick und Kopf wie bisher. Die Grundtypen behalten ihr Rohr (4.5 mm). Weitere UL-Typen der Übersicht (II 30 UL, III 30 UL) fehlen, weil ihre Grundtypen nicht erfasst sind. Gemessen: Einzelmast I 30 UL ohne Teile η 0.473; PyNite (`vergleich_gittermast.mjs "I 30 UL"`) sieben Lastfälle ≤ 0.003 %. Frage «können traversen / Leiter / Lampen / Trafos am masttyp gittermast angebaut werden?» - **ja, gemessen:** Teile am Masten hängen an einem Achsknoten mit Schott (im Gitter) bzw. am Rohr (über dem Kopf) und werden gerechnet; quadratischer Typ nach Zeichnung, Einzelmast, EK1: ohne Teile 0.184; Traverse am Rohr (13.79 m) 0.226; Rückleiter auf 9.00 m 0.201; Lampe mit Rohr auf der Spitze 0.446; Trafo 50 kVA auf 4.00 m 0.265; NT-Ausleger auf 6.00 m 0.231; alle zusammen 0.565 (Diagramm-Kontrolle 0.477). ⚠ Nur am Prüfstand, nicht im Browser gesetzt; der Anschluss wirkt auf die Mastachse (Schott), die örtliche Einleitung in einen einzelnen Gurt ist nicht abgebildet. Sicherung `masten_vor_I30_UL_2026-10-03.json`, Datenpaket neu. Prüfstand 209 |
| Abfangjoch: ein Mast ein Körper; Vorlagen «abgefangen» (3. Oktober) | Mit Bild (zweiter Abfangträger an denselben Masten), im Wortlaut: «hier werden immernoch zwei masten angezeigt zur auswahl im 3d. was noch fehlt bei den anbauteilen sind die tragseile / fahrdraht einseitig abgefangen für das abfangjoch.» (1) Der Zeichenplan (`mastZeichenplan`) erreichte `abfangSzene` nicht - jedes Abfangjoch baute seine Masten selbst, das nicht gewählte grau mit eigenem Titel darüber. Jetzt reicht app.js den Plan an beide Wege (gewählt, nebenan); sagt er nein, bleibt nur der Bezug. Gemessen A160/12.5 m: 812 → 772 Flächen, kein Masttitel, keine Lagermarke. (2) Vier Vorlagen in der Gruppe Leiter: Tragseil / Fahrdraht N-FL und R-FL «abgefangen» (je ein Drahtwerk der Lasttabelle, z 0, am Träger). Neue Spalte `abfangung` der Vorlagen (Katalog); beim Absetzen schreibt die App die Art je Leiter (`havarie[leiterKennung].art`), wo sie von der Vorgabe der Tragwerksart abweicht - am Abfangjoch ist «einseitig» ohnehin die Vorgabe, am Tragjoch steht sie damit ausdrücklich. Am Abfangjoch Anbindung «Mitte Träger» (Kennung `leiter-…`). Gemessen: Tragseil N-FL ständig 6.40 kN = Z(+5 °C). Im Browser (Prüfseite, gelöscht): zwei Abfangträger an M1/M2, je ein Mast mit einem Titel; Tragseil N-FL bei 6.80 m gesetzt, Karte «einseitig», «vorn abgefangen», Z_ab 6.40 kN im Bild. ⚠ Meine Annahmen: z = 0 (Trägermittelebene), Umlenkung wie bei den übrigen Leitern eingeschaltet; die Zugrichtung wählt man in der Karte (Vorgabe vorn). Das Setzen am Tragjoch ist nur am Prüfstand geprüft. Sicherung `anbauteile_vor_abgefangen_2026-10-03.json`, Datenpaket neu. Prüfstand 208 |
| Gittermast: Länge bleibt fest (3. Oktober) | Auf die Frage, ob die Länge über das Rohr einstellbar werden soll, mit Auszügen der Übersicht (Grundtyp, UL-Ausführungen mit längerer Rohrkonstruktion), im Wortlaut: «es scheint das die gittermasten fixe längen haben jenachdem welche funktion sie übernhemen (Montage Lampen / Zusatzleiter -> UL) hier ein auszug.» - **die Länge bleibt je Typ fest** (`gitterLaengenFest`), kein Kürzen oder Verlängern des Rohrs; eine andere Länge ist ein anderer Typ des Sortiments (Grundtyp bzw. UL mit eigener Rohrkonstruktion: unten dünnwandig, oben dickwandig, weiter über den Kopf hinaus). Nichts am Code geändert. Die UL-Ausführungen der übrigen Typen sind nicht erfasst (siehe *Offene Punkte*) |
| Gittermast: Rohr 1.2 · q · d, Herleitung in der App; Einzellastfall-Plot; Seitenleiste; zweiter Abfangträger (3. Oktober) | Im Wortlaut: «für rohre den faktor 1.2 ansetzen bezüglich des durchmessers. der ansatz mit der völligkeit pro laufmeter passt, so festhalten in der app für die nachvollziehbarkeit.» - bestätigt die Lesart «Windangriffsfläche = Ansichtsfläche der Stäbe»; das Rohr über dem Kopf bekommt w = 1.2 · q · d (q = 0.9 / 1.1 / 1.3, `windStaudruck` im Sortiment; `gitterWindOben`), der Mastaufsatz (Quadratrohr) bleibt bei der Last je m² auf seine Kante (meine Lesart: 1.2 gilt dem Rundrohr). Die Herleitung steht im **Profilblatt des Gittermasts** (`gitterWindHerleitung`: je Stelle und Richtung A_s, Breite, Völligkeit, w je EK, dazu der Text). Gemessen EK1, quadratischer Typ nach Zeichnung: Rohr 0.27 → 0.15 kN/m; Einzelmast Gurt 0.219 → 0.184, Rohr 0.188 → 0.107, Fussmoment 32.2 → 26.7 kNm; J90/20 m auf zwei Gittermasten Gurt 0.466 → 0.416, M längs 63.6 → 58.1 kNm, Diagramm 0.430. Dazu mit Bild (LF1 gewählt, σ_v): «hier wird kein plot der resultate dargestellt beim gittermasten, warum?» - beim Einzellastfall zeigt das Bild den Ersatzbalken, aus dem Stabwerk kam nur die Hülle; jetzt rechnet die App die Stäbe des Gittermasts im gewählten Fall nach (`gitterWerte`, app.js). «vereinzelt springt die sidebar nach oben wenn ich eine auswahl vornehmen will wie zum beispiel beim mastprofil» - der Neubau der Leiste behält die Rollstellung, solange der Reiter derselbe ist (⚠ den Sprung selbst habe ich nicht nachstellen können; im Browser nach der Änderung: Mastprofil gewechselt, Stellung 1424 px blieb). «Checke den workflow der Abfangjoch konstruktion … absetzen eines zusätzlichen abfangträgers bei einem bestehendem Abfangtragwerk mit bestehenden masten?» - Befund: `freieLaenge` zählte beim Abfangjoch den Mastabstand als Trägerlänge; der zweite Träger zwischen M2 und M3 wurde von 12.50 auf 12.00 m gekürzt (Stützweite 11.50) und bekam einen eigenen Masten M4. Jetzt begrenzt die Regel die Stützweite (+ 2 · Überstand). Im Browser: A1 gesetzt, A2 zwischen M2 und M3 auf 6.00 m - drei Masten, 12.50 m, Stützweite 12.00, Stabwerk rechnet (M2 1.147). Das Dialogfeld heisst beim Abfangjoch «Jochlänge (Träger)». Frage «Lässt sich die Mastlänge anpassen bei den Gittermasten?» - heute nein (fest = Gitter + Rohr); entschieden am selben Tag: bleibt fest (Zeile «Länge bleibt fest»). Sicherung `masten_vor_gitter_rohr_1_2_2026-10-03.json`. Prüfstand 207 |
| Gittermast: Wind = Betreiberwerte der Joche je Windangriffsfläche; Normwerte verworfen (3. Oktober) | Im Wortlaut: «die betreiberwerte beibehalten und diese auf den gittermasten übertragen in anlehnung der windangriffsfläche pro m1 die normwerte verwerfen, diese werde ich selbst prüfen». **Gilt; die beiden Zeilen darunter (Norm, Mittel je Bauhöhe) sind überholt.** Die Joche rechnen mit der Tabelle des Betreibers. Für den Gittermast: Windlast je Meter des Tragjochs / seine Windangriffsfläche je Meter (stehende Gurtschenkel + Vertikalbleche, bei 20 m), Mittel über J60–J130: EK1 1.75–2.03 → **1.90**, EK2 **2.31**, EK3 **2.73** kN je m² Angriffsfläche (`windJeFlaeche` im Sortiment der Gittermasten; der Prüfstand rechnet es aus den Tragjochen nach). Der Mast bekommt w(z) = Wert · A_s(z) mit seiner Fläche auf der Höhe z (zwei Gurtschenkel der Seite quer zum Wind + Bindebleche, höchstens die Breite; `gitterWindflaeche`), über dem Kopf der Durchmesser des Rohrs bzw. die Kante des Aufsatzes - **meine Lesart: «Windangriffsfläche» = Ansichtsfläche der Stäbe, und für das Rohr derselbe Wert auf d** (kein Betreiberwert für das Rohr vorhanden). Kein Normbeiwert mehr im Code. Gemessen EK1, quadratischer Typ nach Zeichnung: Wind am Fuss 0.40, am Kopf 0.34, am Rohr 0.27 kN/m; Einzelmast Gurt 0.219, Rohr 0.188, Fussmoment 32.2 kNm; J90/20 m auf zwei Gittermasten Gurt 0.466, Blech 0.256, M längs 63.6 kNm, Diagramm 0.470. Rechteckiger Typ am Joch (breite Seite quer): Gurt 1.000, Diagramm 1.001. Mastaufsatz «6 mm belassen». Sicherung `masten_vor_gitter_wind_betreiber_2026-10-03.json`. Prüfstand 207 |
| Gittermast: Wind nach der Norm für Gittertragwerke; Joche bleiben bei der Tabelle (3. Oktober) | Frage «kannst du die windeinwirkungen an jochen gemäss den aktuellen tragwerksnormen (gitterstruktur) herleiten?» - gerechnet, nichts geändert: w = q · c_f · A_s mit A_s = Ansichtsfläche der Stäbe einer Seite je Meter (stehende Schenkel + Vertikalbleche), φ = A_s / Bauhöhe, c_f = 3.96 · (1 − 1.5 φ + 1.8 φ²) (EN 1993-3-1 Anhang B, quadratisch, kantige Stäbe; ⚠ Formel aus dem Gedächtnis, gegen SIA 261 Anhang C / EN 1991-1-4 Bild 7.34 gegenzulesen; q als Böenstaudruck gelesen; ψ_λ und c_s c_d = 1). Norm / Tabelle des Betreibers: J60 1.21, J70 1.28, J80 1.32, J90 1.26, J100 1.24, J120 1.38, J130 1.41 (φ 0.39–0.51, c_f 2.72–2.78). Darauf im Wortlaut: «wie gross sind die abweichungen zu den hinterlegten betreiberwerten? für den gittermasten die herleitung verwenden für die bestimmung der windeinwirkung. beachte noch das wir oben einen rohrquerschnitt haben beim aufsatz.» und «6 mm belassen». **Die Joche bleiben bei der Tabelle** (kein Auftrag zum Umstellen). **Der Gittermast** rechnet seinen Wind aus der Geometrie (`gitterWindflaeche`, data.masten.js): je Höhe die Seite quer zum Wind (zwei Gurtschenkel + Bindebleche), höchstens der geschlossene Körper 2.1 · Breite (am Oberteil 240 mm massgebend, φ 0.67–0.74); das Rohr als Kreiszylinder 1.2 · d, der Mastaufsatz als Quadratrohr 2.1 · a; q = 0.9 / 1.1 / 1.3 im Sortiment (`windStaudruck`, die Stufen der Tragjoch-Tabelle). Ersetzt das Mittel der Tragjoche vom selben Tag. Gemessen EK1, quadratischer Typ nach Zeichnung: Wind am Kopf 0.21 → 0.45 kN/m, am Rohr 0.12 → 0.15; Einzelmast Gurt 0.131 → 0.234, Fussmoment 18.5 → 33.6 kNm; J90/20 m auf zwei Gittermasten Gurt 0.365 → 0.466, Blech 0.228 → 0.285, M längs 49.9 → 65.0 kNm, Diagramm-Kontrolle 0.480. Rechteckiger Typ am Joch (breite Seite quer): Gurt 1.060, Diagramm 1.035. Sicherung `masten_vor_gitter_wind_norm_2026-10-03.json`. Prüfstand 207 |
| Gittermast: Wind aus den Tragjochen, Knicken später, Wanddicke Aufsatz (3. Oktober) | Mit Bildausschnitt eines anderen Typs (Aufsatzrohre mit Wanddicken), im Wortlaut: «wind aus den tragjochen herleiten für die gittermasten, mittelwert ansetzen. Knicken noch weglassen, das honen wir später nach zusammen mit den tragjochen, wenn wir einen weg finden die gitterstruktur zuverlässig auf knicken (biegung in zwei richtungen) nachzuweisen. die einzige angaben zur blechdicke beim aufsatz habe ich beim typ III UL 30.» (1) **Wind:** Druck auf die Ansichtsfläche = Windlast je Meter des Tragjochs / Bauhöhe, Mittel über die Typen J60–J130 (EK1 0.80–0.92, Mittel 0.86; EK2 1.04; EK3 1.23 kN/m²), im Sortiment der Gittermasten (`windDruck`); ersetzt den Druck der Vollwandmasten (1.25 / 1.54 / 1.83). Gemessen Typ nach Zeichnung (quadratisch), EK1: Einzelmast Gurt 0.185 → 0.131, Fussmoment 26.5 → 18.5 kNm; J90/20 m auf zwei Gittermasten Gurt 0.416 → 0.365, Blech 0.251 → 0.228, M längs 57.9 → 49.9 kNm. (2) **Knicken** des Gittermasts bleibt weg (auch der Gurt zwischen den Blechen), später zusammen mit den Tragjochen. (3) **Mastaufsatz:** die einzige Wanddicke eines Aufsatzes steht bei einem anderen Typ (Rohr mit 5.9 mm Wand) - die 6 mm des Quadratrohrs bleiben, im Sortiment so vermerkt. Sicherung `masten_vor_gitter_wind_tragjoche_2026-10-03.json`. Prüfstand 207 |
| Gittermast im Stabwerk: Mastaufsatz, Schotte, Wind, Kontrolle (3. Oktober) | Mit Bild der Übersicht, im Wortlaut: «hier ist der Mastaufsatz für den typ IV45 enthalten. Teilung nach vorschlag. weitermachen bis zum schluss und prüfung mit pynite vornehmen und danach noch mit axisvm, beachte das eine meldung zur combrücke kommt nach dem schliessen in axis, diese kannst du selbst schliessen, falls notwendig.» (1) **Der lange Typ** steht mit Mastaufsatz in zwei Längen im Sortiment (Quadratrohr auf dem Kopf; ⚠ die WANDDICKE ist eine Annahme - die Übersicht nennt nur das Aussenmass), oben 16 Felder zu 500 mm. (2) **Modell** (export.axisvm.gitter.js, als letzter Schritt in `stabmodellJson`): der Zug auf der Mastachse wird zum Fachwerk - vier Gurtwinkel auf ihren Schwerachsen (Schenkel nach innen, unten konisch; ungleichschenklig in zwei Ecken im Spiegelbild, `winkelGetauscht`), Bindebleche auf vier Seiten über ihre lichte Länge mit starren Enden, **Schott an jedem Achsknoten** (so hängen Joch, Anbauteile, Anker und das EINE voll eingespannte Auflager am Masten - dem Auftraggeber vorgelegt, auf «weitermachen» so gebaut), Rohr im Oberteil an Knick und Kopf gehalten und frei darüber. **Wind auf die Hüllfläche** mit dem Druck der Vollwandmasten (aus deren Tabellenzeilen: Last / Profilbreite), je Abschnitt mit seiner Breite - sichere Seite, Annahme. (3) **Wählbar** wo ein HEB steht (Ersatzprofil in `mastprofile()`, Länge fest = Gitter + Rohr, `gitterLaengenFest`); am Abfangjoch und Tragausleger verweigert das Stabwerk mit Grund; SAF, DXF und die PyNite-Ausleitung des Jochs brechen mit Grund ab (das Fachwerk steht nur in der COM-Datei und im Stabwerk). (4) **Nachweis** je Stab: Gurt (Winkel, vorzeichenrichtig), Blech (mit Schub), Rohr; Kacheln je Teil; **das Bemessungsdiagramm als Kontrolle** (zul. Fussmomente, geradlinig überlagert, charakteristisch; Kachel mit Ampel, zählt nicht zum Urteil); kein Knicken als Vollstab, kein Standardfundament. (5) **Gemessen:** PyNite (`vergleich_gittermast.mjs`, neuer Erzeuger aus der fertigen Datei `export.pynite.datei.js`): fünf Typen × sieben Lastfälle, Wege und Auflager ≤ 0.005 %. AxisVM (gebaut, gerechnet, ausgelesen; der rechteckige Typ und der mit Aufsatz): Knotenwege 0.00–0.03 %, Torsion 0.2–0.3 % - **gegen den Löser OHNE Schubverformung**; AxisVM rechnet die Stäbe schubstarr. Mit Schub (wie die Anwendung rechnet) Biegung +0.1–0.5 %, die Verdrehung unter Torsion +21 bis +39 % (kurze, hohe Bindebleche). Bemessungsdiagramme: Durchbiegung auf 8.00 m je Tonne Modell / Diagramm +4 bis +6 % bei den gezeichneten und dem ersten abgeleiteten Typ, −5 bis −7 % beim langen. Beispiel J90/20 m auf zwei Gittermasten (quadratischer Typ nach Zeichnung): Gurt 0.416, Blech 0.251, Rohr 0.124. **Befund an der Brücke:** `AddL` heisst (Name, h, b, …) - die Datei führt [Schenkel in lokal y, in lokal z], der ungleichschenklige Winkel lag damit in AxisVM um 90° gedreht (betrifft auch den Untergurt L 120x80x12 früherer Modelle); die Brücke misst jetzt Iy/Iz am angelegten Querschnitt und legt ihn mit getauschten Schenkeln neu an. Neu in der Brücke: `AddPipe`, `AddBox` (Signaturen aus der Typbibliothek gelesen). Sicherungen `masten_vor_gitter_aufsatz_…`, `masten_vor_gitter_diagramm_2026-10-03.json`. Prüfstand 207 |
| Gittermast: Teilung, Gurt; Lastgenerator Variante B (3. Oktober) | Im Wortlaut: «teilung nach zeichnung, gurt oben L 70x70x7, lastgenerator variante B». (1) Der Gittermast bekommt die **Teilung der Zeichnung** (nicht die vereinfachte des AxisVM-Beispiels); beim Typ ohne Detailzeichnung gilt oben der **Winkel des Katalogs**, nicht der des Beispielmodells. (2) **Lastgenerator:** je Gleis «Hängestütze mit Fahrdrahtabzug» UND die neue Vorlage «Kettenwerk N-FL (Fahrdraht an Hängestütze)» (`kw-nfl-joch`: Tragseil ganz, vom Fahrdraht nur das Gewicht - `wirktAblenk`/`wirktQ` aus), damit Wind und Umlenkung des Fahrdrahts nicht doppelt zählen; der Dialog warnt, wenn der Fahrdrahtabzug ohne Kettenwerk angehakt ist. Gemessen je Gleis gegen die frühere Vorlage (Kettenwerk an der Stütze): Gewicht 1.500 = 1.500 kN, Umlenkung 1.242 = 1.242 kN (Stütze 0.708 + Kettenwerk 0.533), Wind 1.645 → 1.504 kN (Einzelleiter der Tabelle 2 × 0.0085 statt 0.020 kN/m). Sicherung `anbauteile_vor_kettenwerk_generator_2026-10-03.json`. Prüfstand 205 |
| Kein Seildruck; Jochaufsatz einfach 4 m; Annahmen Gittermast (3. Oktober) | Im Wortlaut: «annahmen ok, mit axis modell auslesen weitermachen. offene punkte zuerst klären. seildruck nicht zulassen in der app. das mit dem lastgenerator habe ich nicht verstanden. jochaufsatz einfach ist bei rund 4m länge was einen angriffspunkt bei 2m ausmacht. die traverse und leiter sind dann auf 4m.» (1) **Annahmen zum Gittermast bestätigt** (zwei Typen ohne Detailzeichnung: Teilung und Breiten wie beim gezeichneten, Bleche = Breite − 2 · Schenkel, oberes Teil 490 mm). (2) **Seile der Aufhängung nur auf Zug** - ändert den Entscheid vom 28. September («linear, gedrücktes Seil als Befund»): sie laufen über denselben Ausfall wie der Seilanker (`seilAnker` nimmt `AUFHAENGUNG[_P/_N]` mit, core.stabseil.js); ein Seil, das drücken müsste, trägt 0, das andere allein, alle Nachweise lesen den Hilfsfall. `aufhaengungNachweis` meldet es als `schlaff` (Auskunft, Kachel «ein Seil fällt aus»); Befund `druck` («Ausleger hebt ab») nur, wenn alle ausfallen. Gemessen L 6 m mit Fahrdrahtabzug: vorher −0.24 kN Druck; nachher UPE 0.167 → 0.177, Blech 0.226 → 0.233, Mast 0.390 → 0.391, Seil η 0.396 gleich. (3) **Jochaufsatz einfach:** Aufsatz z 2.00, Traverse und Leiter z 4.00 (Sicherung `anbauteile_vor_ja_einfach_4m_2026-10-03.json`). (4) Lastgenerator: nicht verstanden - neu erklärt, Entscheid offen. Prüfstand 204 |
| Alter Masttyp: kombinierter Mast als Gittermast (3. Oktober) | Weisung: «Einen alten Masttyp ergänzen, die Grundlagen … Grundlagen\Kombinierte Masten. Es ist ein Gittermast, struktur wie die Joche, mit unterschied das Winkel nach innen und der untere teil konisch ausgebildet ist. Als beispiel beachte noch die axismodell im Grundlagenordner. im oberen teil ist ein rohr der in den oberen teil des gittermasten eingespannt ist.» Auf Rückfrage: **Typen** «1 und falls möglich den IV 45 Typ ableiten aus den Übersichtszeichnungen» (die Typen mit Detailzeichnung - zwei -, dazu I 45 und IV 45 aus Katalog/Übersicht abgeleitet); **Nachweis «Stabwerk + Diagramm als Kontrolle»** (Gurtwinkel und Bindebleche je Stab wie beim Joch, die zulässigen Momente der Bemessungsdiagramme als zweite Kachel); **AxisVM «Ja, nur lesen»** (die beiden Modelle im Ordner über COM öffnen und Aufbau auslesen, nicht rechnen); **Umfang «Einzelmast und Jochmast, Rohr als Teil»** (wählbar, wo heute ein HEB steht; das Rohr oben ein echter Stab, eingespannt, mit Spannungsnachweis). Stand: Daten gelesen (Notiz `Versand/kombinierte_masten_daten.md`, nicht in der Ablage), siehe *Laufende Arbeit* |
| Tragausleger am Jochmasten im Stabwerk; M1 ziehen; Arm in der Höhe; Schwenk (3. Oktober) | Mit drei Bildern: «wenn ich hier den linken masten ziehe dann entzwei ich das modell (joch / tragausleger) - warum wird der ausleger als balken angegeben? den ausleger in der höhe anpassen können per drag and drop, das drahtwerk mitziehen.» Auf Rückfrage **«M2 bleibt, Joch passt sich an»**: trägt ein anderes Tragwerk den Masten am Ende B, bleibt er beim Ziehen von Ende A stehen; das Joch beginnt an der neuen Stelle, L folgt (danach Standardlänge), Teile auf dem Joch und Nachweisstelle behalten ihre Lage auf dem Blatt (`mastStelleSetzen`, ui.js; gilt auch am Endmasten einer Jochreihe). Gemessen: M1 0 → 1.00, Joch x 1 / L 19, M2 bei 20 mit Joch und Ausleger. **«Ja, jetzt anschliessen»**: die Sperre «Tragausleger in einer Reihe» ist weg (`reiheOhneStabmodell`); das Blattmodell baut ihn mit, der geteilte Mast ist ein Zug (8 Abschnitte bis zum Seilpunkt), Aufhängung und Längsanker je Ausleger über den Namen mit Präfix, V_zul aus dem Sortiment, Knicken und Fundament vom Masten. Gemessen J90/20 m (HEB 240 des Prüfstands, Hängestütze) + Ausleger 13 m an M2 (14.00 m): Aufhängung η 0.5908 = allein 0.5909, Mast allein 0.947 → mit Joch **1.375**, Fundament M2 0.599; im Browser (HEB 260, ohne Teile) M2 1.178, Seil 0.49, UPE 0.27 - vorher Ersatzbalken 1.330. **Arm in der Höhe:** ein Punkt, dessen Glied waagrecht an einem senkrechten Träger hängt (Ausleger an der Hängestütze), zieht in z; die folgenden Module auf derselben Höhe weiter aussen wandern mit (`armAmTraeger`, `punktZiehen`); der Leiterpunkt bleibt in x, der NT-Ausleger am Mast auch. Dazu **«wenn button ganzes querprofil, kamera schwenken, nicht springen»**: `schwenkeAufsGanze` (render.3d.js) fährt Ziel, Verschiebung, Abstand und Blickwinkel gemeinsam; Knopf, Taste g, Kontextmenü. Prüfstand 203 |
| Anbauteil-Katalog bereinigt (3. Oktober) | Mit Bild der Kacheln, im Wortlaut: «Hängestütze mit Fahrdrahtabzug nicht Fahrleitung - Jochaufsatz einfach genügt, ohne Zusatzleiter, da dies immer der Fall ist. Jochaufsatz doppelt mein dass es zwei traversen mit ZL hat in der höhe verteilt. - den Jochaufsatz alt kann man auch gleich versehen wie den Jochaufsatz einfach. - Anstatt Leiter Kettenwerk N-FL bzw. R-FL - die leitertraverse kommt meist nur an vertikale bauteile / tragwerke zu liegen. - lampe led mit rohr ist an rohr auf dem masten befestigt, also ein vertikale ausrichtung. - unter übrige kann man ein freies bauteil aufführen - was noch fehlt sind die trafos dies sind an den masten befestigt. man kann hier einen 50 kVA Typ aufführen - die lampe LED kann man wegnehmen, diese ist meist gar nicht relevant.» Auf Rückfrage: **Fahrdraht ohne Gewicht** (`hs-fahrdraht` trägt `drahtwerk-n-fl-cu-107`, `wirktG: false`, wie «Fahrdrahtabzug am Mast»; G 1.500 → 0.500 kN); **doppelt «1 wobei man hier die masse aus den beispielen … herausnehmen kann»** - Kursaufgaben S. 2: H 630, unten Traverse 2.50 m (357 über Joch-OK → z 3.68) mit zwei Bündeln 2× Cu 95 bei ±1.20, oben 1.12 m (503 → z 5.14) mit 1× Cu 95, Leiter 0.77 m unter der Traverse (wie Beispiel 1); **alt «1 wobei man hier eine recherche machen kann …»** - A-15.2 S. 3, Typ 1/362: 3.62 m, Traverse 0.87 m am Kopf, Bündel 2× Cu 95 bei x 0.80; **Lampen «1 lampen sind meist an rohren auf masten oder an jochen»** - beide LED-Vorlagen weg, «Lampe mit Rohr am Mast» und neu «… am Joch», Rohr lotrecht (z 0.5, Lampe z 1.0). Trafo 50 kVA unter «Am Masten», die Vorlage 100 kVA weg (Baustein bleibt), Leiter-Traverse nur am Masten, «Freies Bauteil» als Kachel unter «Übrige». Skizze: ein Stiel beim doppelten (Regel «zwei Stiele» weg), Leiter unter einer Traverse an ihr, Rohr auf der Achse senkrecht, freies Bauteil als Kasten. Sicherung `data/sicherung/anbauteile_vor_vorlagen_bereinigt_2026-10-03.json`, Datenpaket neu. **Der Prüfstand führt die bisherigen `hs-fahrdraht`, LED-Lampen und Trafo 100 als Prüfvorlagen weiter** (`PRUEFVORLAGEN` in pruefung.mjs) - seine Messwerte stehen darauf; der Katalog wird in Abschnitt 202 geprüft. Das Startdokument trägt keine Anbauteile (Zahlen unverändert). ⚠ siehe *Offene Punkte* (Seil gedrückt, Lastgenerator, Höhen des einfachen Aufsatzes) |
| 3D-Plot: Mast in Abschnitten, Verformung mit dem Joch (3. Oktober) | Frage mit zwei Bildern: «ist es möglich den masten in mehrere teile zu plotten, anstatt nur in der massgebenden farbe über die ganze länge. das joch auch bei der verformung mitnehmen.» (1) Im Stabwerksweg trug jede Mastfläche den Wert ihres ganzen Stabes - der unterste reicht vom Fuss bis unter den Anschluss. Jetzt das Grösste des 0.5-m-Verlaufs (`verlaufWerte`, render.stabwerk.js) in der Höhe der Fläche, Ränder linear eingeschaltet; T bleibt der Stabwert, σ aus N anteilig. Gemessen J90/20 m, HEB 240: Mast M1 20 verschiedene η statt eines je Stab, grösstes 0.7862 = Nachweis, am Fuss 0.786 gegen 0.382 in halber Höhe. (2) **Ändert den Entscheid vom 24. September** («das Joch bleibt grau»): im Stabwerksweg trägt jede Fläche - Gurte, Bleche, Mastabschnitte - `w` aus den Knotenwegen des Stabwerks (`wegImStab`, Betrag in mm), im Fall der verformten Figur δ (`wegeFall` in app.js: gewählter Fall, bei «umhüllend» der massgebende der Gebrauchstauglichkeit), auch bei einem Einzellastfall. Gemessen: grösstes w im Bild 124.69 mm = grösster Weg der Figur 124.89 mm, Mastfuss 0.00 mm. Im Browser: σ_v am Masten von Rot am Fuss nach Blau, w mit rotem Joch (bis 106.8 mm, HEB 260), Legende «Aus dem Stabwerk: Betrag des Wegs an Joch und Masten …». Prüfstand 199 |
| Anbauteile schneller finden: was gebaut wird (3. Oktober) | Rückfrage mit vier Hilfen und der Bauteilkarte. Gewählt: **«Suchfeld + Filter»** (über den Vorlagen, sofort gefiltert, Vorlagen und Lasttabelle zusammen, nach Tragwerksart), **«Symbolkacheln»** (Strichskizze je Vorlage, Name einzeilig, ohne Farbpunkt und Legende) und in der Karte **«Bausteinwahl mit Suche»** (Auswahlfenster mit Suchfeld und Gruppen statt der Liste mit 27 Einträgen, nach Ort vorgefiltert, Erklärsätze eingeklappt). Zur Auswahl im 3D an der Stelle im Wortlaut: «die auswahl nur verwenden wenn bauteil setzen aktiv ist, sonst könnte es zu klicky werden, da wir schon ein kontextmenue haben im üblichen 3d. da kann man dann auch zuletzt verwendet aufführen.» - also nur im Modus «Bauteil setzen», dort mit «zuletzt verwendet»; das gewöhnliche Kontextmenü bleibt |
| Mastkopf ziehen am Einzelmasten und am Tragausleger (2. Oktober) | Gemeldet: «beim einzelmast und beim tragauslegermasten lassen sich die höhen nicht per drag and drop anpassen.» Befund im Browser: am Einzelmasten liegen ab Werk Traverse (L − 0.5) und Rückleiter (L − 2.0) über der Kopfzone - ihr Fangrand und ihre Flächen gingen beim Drücken vor (Zeiger «grab»); dem Tragausleger fehlten die Griffe ganz (`render.tragausleger.js` baute keine). Jetzt erkennt `_mastEndeUnter` (render.3d.js) Kopf und Fuss nach der Lage auf der Mastachse innerhalb der Mastbreite, VOR Angriffspunkt und Anbauteil (Zeiger und Drücken); der Schaft bleibt bei der getroffenen Fläche. Der Ausleger bekommt Kopf und Lage wie der Einzelmast; kürzer als H + b wird nicht gesetzt (Meldung «mindestens … m»). Die Meldung sagt «Joch bleibt» nur am Joch, am Ausleger «Ausleger bleibt». Im Browser: Einzelmast 8.50 → 10.60 m; MT1 14.00 → 16.20 m, → 10.80 abgewiesen («mindestens 13.85 m»), Lage 60.00 → 53.40 m; Jochmast M1 8.50 → 9.60 m. Prüfstand 196 |
| QP-Einlesen ruht; Anbauteile schneller finden (2. Oktober) | Im Wortlaut: «diese entwicklung auf stnd by, ich denke der gewinn für diese app ist klein, man sollte mehr in einen intuitiven workflow investieren, der aufbau eines tragwerks gemäss querprofil ist schon gut. was man optimieren könnte ist eine einfacher umgang mit den anbauteilen, wo man schneller die teile ausfindig machen kann um diese dann zu verbauen. es ist zur zeit sehr viel text den man lesen muss um das richtige bauteil zu finden.» - QP-Einlesen (eigener PDF-Leser, Erkennung) **auf Standby**, die Befunde der Sonde stehen in der Zeile darunter. Nächste Arbeit: Anbauteile finden und setzen mit weniger Text |
| QP-Einlesen: nur HTML, eigener PDF-Leser (2. Oktober) | Rückfrage zur Abfrage in Schritt 3, Antwort im Wortlaut: «mir ist nicht klar ob diese art von python mit einer einfachen html laufen kann. die idee ist ausschliesslich html apps zu haben, das war auch der grund warum wir einen selbsständigen löser nachgebaut haben.» - damit ist Variante 1 vom selben Tag (Python-Werkzeug neben der App) überholt. Auf Rückfrage **«Eigener Leser»**: ein eigenes ES-Modul ohne Abhängigkeit liest die Vektorlinien (Farbe, Strichstärke) und zeichnet den Plan selbst; Fotos/Scans und Schriften erscheinen nicht. Befund dazu: die fünf Pläne unter `Grundlagen/QP` nutzen nur FlateDecode (ein Plan zusätzlich JPEG-Bilder), keiner verschlüsselt, drei mit Objekt- und Querverweis-Strömen. Sonde (PyMuPDF) am Kursblatt S. 1: Masten als zwei rote Flanschlinien 0.237 m auseinander (HEB 240), 8.00 / 8.49 m; Joch als vier waagrechte Linien über 21.50 m, Bauhöhe 0.601 m (J100). KM022869: Masten 0.275 / 0.224 m breit, das Joch nicht als durchgehende Linie (aus Teilstücken zusammenzusetzen). Testpläne **«Alle drei»**: Kursaufgaben S. 1, KM022869, «QP Joch 51_52 BP», KM023009 als Gegenprobe. ⚠ Ort (in der App oder eigene HTML-Seite) offen - Auftraggeber fragt nach Vor- und Nachteilen und dem Weg zum ersten Ergebnis |
| Endfeld am Stoss in der Reihe (2. Oktober) | Weisung «mit dem Endfeld am Stoss weitermachen» (zum Entscheid **«Beide Joche je halb, Spalt 10 cm»**, Wortlaut der Weisung in der Zeile «Jochlänge auf die Standardlänge»). Wo zwei Tragjoche auf derselben Anschlusshöhe am selben Masten stossen (`stossEnden`, core.constants.js - `jochStoss` in ui.js liest dieselbe Regel), endet jedes 5 cm vor der Mastachse (`STOSS_LUFT`, `stossMasse`); ein Kragarm an diesem Ende gilt dort nicht (Hinweis). Gespeichert bleibt das Joch bis zur Mastachse - gekürzt wird erst im Kern (`stossAnwenden`, core.vierendeel.js, in `modell` und `berechne`, einmal je Satz), weil der Rechensatz an einigen Stellen als Stand zurückgeschrieben wird. Die Stationen kommen aus der Mass-Tabelle der nächsten Standardlänge L_nenn ≥ Gurt (`stationenX`), was fehlt, fehlt dem Endfeld am Stoss, stossen beide Enden je zur Hälfte; Bleche (Staffelung, Ausführung) und Verjüngung nach L_nenn. Teile auf dem Joch und Nachweisstelle rücken mit, auf dem Blatt bleiben sie. Im Modell steht der Mast am Gurtende; das Blattmodell setzt den geteilten Masten wie bisher mittig (`mastSoll`) - jetzt ohne Schieben: `lagenEntflechten` misst am gekürzten Gurt und findet nichts mehr, die Reihe ist so lang wie eingegeben (vorher +10 cm je Stoss). Im 3D steht der Mast auf der Achse, Titel mit der Sortimentslänge («J90 · 20.00 m»), Mass «L = 19.95 m · Stoss, Joch 20.00 m»; die Fussleiste prüft das Sortiment an L_nenn (19.95 lag in der Lücke 19.5/20 des J90). Gemessen Stabwerk, HEB 240: Reihe 2 × J90/20 m M2 1.3527 → **1.3489**, M1/M3 0.7952 → 0.7940, Joch T1/T2 0.4470 → 0.4460, Endfeld 0.75 → 0.70 m; 3 × J90/20 m M2/M3 1.3954 → 1.3906, Joch T2 (beide Enden) 0.4527 → 0.4358; Mastfüsse 0/20/40, Spalt der Endbleche 0.10 m. Beide Enden bei 17.30 m Mastabstand: Gurt 17.20, Stationen nach 17.50, je Endfeld 0.60 m. Im Browser (Prüfseite): Hinweis «Stoss in der Reihe am Ende A … Endfeld A 0.700 m», die Meldung «Jochenden treffen zusammen» ist weg, ein Mastkörper auf der Achse. Prüfstand 195 (72, 73, 98, 134, 153 auf die neue Lage nachgeführt, alte Werte im Kommentar) |
| Lagerung des Jochs ohne Masten einstellbar (2. Oktober) | Frage «wie kann man die auflagerbedingungen anpassen beim modell ohne masten im stabwerkmodell?» - war fest eingebaut (UG y z, OG y, x am UG links bei Ende A). Auf Rückfrage **«Dieselbe Skizze, je Gurt x/y/z»** und **«Ja, eine Stelle»**: Feld «Auflagerbedingung ohne Masten» (Gruppe Auflager, nur Joch ohne Masten) mit der Matrix Obergurte/Untergurte × X Y Z starr/frei, an beiden Enden gleich, dazu x-Halt Ende A/B; X hält an EINEM Knoten (links) des Gurts am gewählten Ende (Entscheid 27. Aug.). Ohne Halt in x, y oder z hält der Untergurt (Hinweis). Regel `ohneMastLagerung` (core.auflager.js), gelesen von `stabmodell` - Stabwerk, AxisVM, SAF, PyNite. Vorgabe = bisherige Lagerung (Abschnitte 191/193 unverändert). Im Browser: OG z starr und x-Halt Ende B kommen an, die Matrix folgt (Maskensignatur ergänzt). Gemessen J90/20 m: OG z gehalten trägt der Obergurt 6.92 kN lotrecht (vorher 0). Prüfstand 194 |
| Anbauteile alle aus / alle ein (2. Oktober) | «Knopf «alle aus / alle ein» einbauen für die anbauteile»: Knopf in der Anbauteilliste neben «Alle entfernen»; schaltet `aktiv` aller Teile des Tragwerks (aus = nicht gerechnet, nicht gezeichnet, Eingaben bleiben), Strg+Z zurück. Im Browser am Standardjoch hin und zurück |
| Resultierende / Einzelgurte; Befestigung als Knopfreihe; Ziehen sichtbar (2. Oktober) | «hier ein umschalten von resultierende oder einzelgurte. startwert auf resultierende stellen.» - Joch ohne Masten: Umschalter über der Reaktionstabelle, Vorgabe «Resultierende je Jochende», «Einzelgurte» zeigt OG/UG links/rechts je Ende (Ansicht im Browser gemerkt, `tragjoch-reaktionen-gurte`; Blatt, Bericht, Excel folgen). «mach die angaben zur befestigung einfache auswählbar. momentan ist es etwas verstreut und klicky.» - Befestigung als drei Knöpfe Untergurt / Obergurt / beide, das Raster daneben (stand zugeklappt), Gleiszuordnung bleibt zugeklappt (`atBefestigung`). «ein visuelles feedback geben wenn man die richrige stelle hat um per drag and drop die änderung vorzunehmen im 3d.» - über Angriffspunkt, Anbauteil und Masten Zeigerform (grab, ↔ Mast schieben, ↕ Fuss/Kopf), die Mastzone in der Akzentfarbe und ein Satz am Zeiger (`_ziehZiel`, `_hoverMalen`). Im Browser: Mastkopf «Kopf ziehen · Länge ändern, Joch bleibt», Befestigung «Untergurt» kommt im Stand an. Excel-Datei geprüft (XML, Stile, Zeilen-/Zellfolge, Textlängen): kein Befund - beim Auftraggeber nachgefragt; Antwort 2. Oktober: «die excel funktioniert wieder» (erledigt, ohne Änderung an der Ausleitung). Prüfstand 193 |
| Reaktionen und Lastfallwahl; Zeichnung federt zurück (2. Oktober) | Frage «wie soll die logik sein in bezug auf die auswahl zum lastfall?», auf Rückfrage **«Hülle bleibt, dazu der gewählte Fall»**: die Reaktionstabelle zeigt weiter die charakteristische Hülle; ist oben ein Lastfall gewählt, kommt je Auflager «gew. Fall» mit Vorzeichen dazu (Reiter, Blatt, Excel; `reaktionenGewaehlt`, core.reaktionen.js). Mit gültigem Stabwerk fallen die Tabellen des Ersatzbalkens «je Gruppe» im Reiter Auflager weg. Im Browser: LF7 Ständig + Wind +y, M1 M_x 45.79 = Hülle, M_y −0.73. Frage «wie könnte man am intuitivsten die funktion gestalten wenn man bauteile zuordnet und die hintergrundzeichnung eigeblendet hat um beim naviegieren aus der längsansicht zu fallen und neu die eben ausrichten muss um sie wieder zu sehen.», auf Rückfrage **«Federnd zurück»**: von der Längsansicht aus gedreht gleitet die Ansicht nach dem Loslassen in die Längsansicht zurück (Ziel, Verschiebung, Abstand bleiben), nur mit eingemessener, eingeblendeter Zeichnung (`_federtZurZeichnung`, render.3d.js). ⚠ Im Browser noch nicht gesehen (das Laden eines Stands mit Zeichnung gelang in der Prüfseite nicht). Prüfstand 192 |
| Joch ohne Masten: Reaktionen je Jochende; COM-Ordnerdialog (2. Oktober) | Weisung: «kannst du beim joch ohne masten die reaktionskräfte global pro jochende aufführen. im bericht und excel» - die Reaktionstabelle (Reiter, Blatt, Bericht, Excel) führte ohne Masten jeden der vier Gurtknoten je Ende als «Lager». Jetzt je Jochende eine Zeile (`jochendenZusammenfassen`, core.reaktionen.js): Kräfte summiert global, Momente um die Jochachse am Ende (Σ (r − r0) × F + Knotenmomente), Spalten wie am Mastfuss, Fundament «Jochauflager». Verdrahtung gegengerechnet am Stand des Auftraggebers ohne Masten (Ersatzbalken je Gruppe / Stabwerk): ständig F_z A 20.53 / 20.49, B 17.75 / 17.79 kN; Wind y F_y 8.86 / 8.86, 8.38 / 8.38; Wind x F_z ±0.21 / ±0.14; F_x Summe 3.58 und 5.35 gleich. Tabelle danach: Ende A V 20.35 / 20.63, H_q 8.93 (ganz an A, nur dort ein x-Halt), H_l 8.89; Ende B V 17.65 / 17.93, H_l 8.41. Im Browser: Reiter, Bericht und Excel (Blatt Reaktionen) mit «Jochende A/B». Dazu gemeldet: «COM-Ausleitung nicht möglich: Failed to execute 'showDirectoryPicker' on 'Window': File picker already active.» - Ordner zuerst, Modell danach, ein Wähler zur Zeit, sonst herunterladen (Prüfstand 190). Prüfstand 191 |
| Teile am Masten ab der Mastachse; Kettenglied ohne Länge (2. Oktober) | Gemeldet vom Arbeitsrechner: «bei einem jochtragwerk wird nicht mehr gerechnet. Die msten sind grau und die bleche auch. die nachweise stehen auf 0.0000 … wenn ich ein ganz neues joch erzeuge wird gerechnet.» Nachgerechnet am Stand des Auftraggebers (J130/24.5 m, c_A = c_B = 0.20, HEM 240 / HEB 260, Rückleiter an M2 mit x −0.20): die Ausleitung setzte die Teile am Masten ab dem JOCHENDE an (xM = 0 bzw. L) statt ab der Mastachse - seit dem Kragarm (30. Sept.) um c falsch; das 3D rechnete richtig. Der Rückleiter fiel damit genau auf die Mastachse, ein Starrstab der Länge null (`ARMM0_0`), und das ganze Stabwerk wurde NaN (η 0, grau). Jetzt xM = Knoten auf der Mastachse; ein Kettenglied ohne Länge wird zusammengelegt (Mast und Joch, `gleicheLage`). Nachher am Stand: Untergurt 0.827, Mast 51 0.724, M2 0.628, Fundament 51 0.854. Die Anker-Vermutung davor war falsch (der Stand hat keinen Anker); der UNP-Ersatz bleibt als Absicherung. Prüfstand 189 (schlägt am alten Code an) |
| Datenpaket und eingelesener Stand in IndexedDB (2. Oktober) | Gemeldet vom Arbeitsrechner beim Laden des Datenpakets: «failed to execute setlem on storage setting the value of tragjoch-einelesen-v1 exceeded the quota» - danach: «ich musste zuerst den alten stand löschen und dann den neuen laden». Die beiden Kopien des Sortiments (je ~370 000 Zeichen) lagen im localStorage (~5 MB je Herkunft, auf GitHub Pages geteilt mit allen Seiten unter benutzer.github.io). Jetzt in IndexedDB (`data.ablage.js`, Datenbank `tragjoch-daten`), beim Start einmal in den Arbeitsspeicher geholt, alte localStorage-Einträge werden umgezogen und dort gelöscht; ohne IndexedDB wie bisher. Schreiben ist asynchron, vor jedem Neustart wird gewartet. In der Prüfseite: 400 000 Zeichen umgezogen, 3 Mio. geschrieben und gelesen, eingelesener Stand mit allen sechs Sortimenten gespeichert/gelesen/verworfen |
| Anker ohne UNP-Zeile: Ersatz im Code (2. Oktober) | Gemeldet vom Arbeitsrechner: «bei einem jochtragwerk wird nicht mehr gerechnet. Die msten sind grau und die bleche auch. die nachweise stehen auf 0.0000 … wenn ich ein ganz neues joch erzeuge wird gerechnet.» Vermutete Ursache (am Arbeitsrechner nicht nachgesehen): neues Datenpaket (Anker nur Profil/Anzahl) mit älterem Code ohne UNP-Zeile in normen.json (zwischengespeicherte PWA, ältere Einzeldatei) - `ankerQuerschnitt` gab den Anker ohne A und I zurück, die Rechnung lief auf NaN; ein neues Joch hat keinen Anker. Jetzt `UNP_ERSATZ` (Normwerte, gleich der Tabelle, Prüfstand 188). Normwerte gehören zum Code, die Sortimente zum Datenpaket: beides muss zusammen neu sein |
| Jochlänge auf die Standardlänge; Stoss in der Reihe (2. Oktober) | Weisung: «die jochlängen auf die hinterlegten standardlängen anpassen lassen, wenn auskragung oder mastabstände angepasst werden. die ungeraden jochlängen werden nur dann angewendet, wenn eine jochreihe vorkommt und es auf gleicher höhe mehrere joche zu liegen kommen, dann muss das endfeld gekürzt werden jeweils, damit es passt und es einen abstand von min 5 cm bis 10 cm von joch zu joch (stehendes endblech) hat.» Auf Rückfrage **«Aufrunden, Rest als Kragarm»**: nach Kragarm, Stützweite und Mastlage (Ende B) springt L auf die nächste grössere Länge des Sortiments (Raster 0.5 m), die Masten bleiben, der Überschuss geht gleich verteilt in c_A/c_B (`jochAufStandardlaenge`, ui.js; Meldung im Balken). Ein Ende mit **Stoss** (anderes Tragjoch, gleiche Anschlusshöhe, selber Mast; `jochStoss`) bekommt nichts, der Rest geht ans freie Ende. Eine direkt eingetippte Jochlänge bleibt, wie sie ist. Im Browser: Kragarm A 0.30 → L 20.30 → 20.50, c_A 0.40, c_B 0.10, Masten 0 / 20. Der zweite Teil (Rückfrage **«Beide Joche je halb, Spalt 10 cm»**) ist seit dem 2. Oktober gebaut - siehe Zeile «Endfeld am Stoss in der Reihe». Prüfstand 187 |
| QP einlesen: wo das PDF gelesen wird (2. Oktober) | Rückfrage mit drei Varianten (Python-Werkzeug mit Paket für die App / pdf.js im Browser / nur Bild): **«1 wenn wir die app weiter als pwa nutzen können sonst 3»**. Das Python-Werkzeug läuft neben der App und ändert an ihr nichts; sie bleibt PWA und nimmt das Ablage-Paket auf (wie Beispiel 1). Also Variante 1 |
| Mast im Stabwerk zwischen den Enden; Werte im 3D getönt; Knopf Reaktionsblatt (2. Oktober) | Frage zum Verlauf: «warum ist das hier abgetreppt? kann man noch beim Masten eine unterteilung vornehmen bei der auswertung?» - der unterste Maststab reicht vom Fuss bis unter den Anschluss (7.18 m) und wurde nur an den Enden ausgewertet. Jetzt am Masten alle 0.5 m aus Endkräften und Gleichlast des Stabes (`schnittImStab`, core.stabnachweis.js; exakt für Gleichlasten, Einzellasten stehen an Knoten); Verlauf η, M, V, N über die Höhe als Linie; eine Stelle im Feld über beiden Enden zählt fürs η. **Das Modell (und AxisVM) bleibt unverändert.** Gemessen J90/20 m, HEB 240 des Prüfstands: Mast M1 0.7862 vorher wie nachher (Kragarm: das Grösste am Fuss). «dieser einseitige balken im textfeld ist nicht gut … kann man den text ganz leicht in der farbe des resultats machen»: kein Streifen mehr, Ziffer 40 % zur Resultatfarbe gezogen (`wertTon`). «die anzahl plots beim masten etwas zurücknehmen»: am Masten doppelter Abstand in der Höhe (46 statt 21 px). Knopf «Blatt mit Skizze und Hinweisen …» in der Akzentfarbe («mach diesen button etwas farbig»). Berechnungstest im Browser (Prüfseite, J90/20 m, HEB 260): Kacheln OG 0.429, UG 0.443, Blech 0.484, M1 0.696, M2 0.697, Fundament 0.434, Kopf 0.743 (Verformung M2); Bericht (Stabwerk) dieselben Zahlen, GZG 0.743; AxisVM-JSON 852 Knoten / 973 Stäbe (= Stabwerk der App), 8 Lastfälle, 20 Kombinationen, Füsse eingespannt (nicht gerechnet); Reaktionsblatt M1 F_y 7.38 / 17.0 kN = Fundament 0.434. Prüfstand 186 |
| Push und QP-Einlesen (2. Oktober) | «pushen wenn es eine funktionierenden stand erlaubt» - gepusht wird ein grüner Stand (Prüfstand und Durchgang). Zum Vorschlag QP einlesen: «Schritten 1–3 für Masten und Joch anfangen und die Anbauteile danach dazunehmen» (1 PDF hinterlegen und einmessen, 2 Kandidaten lesen, 3 Zuordnungsliste mit Abfrage; Anbauteile später) |
| Mast im 3D ziehen: Lage, Fuss, Kopf (2. Oktober) | Weisung: «ist es möglich beim masten diesen per drag and drop zu schieben und den fusspunkt oder den kopfpunkt zu verlängern oder kürzen? das joch sollte dann an ort bleiben in der höhe.» Drei Griffe am Mastkörper des gerechneten Tragwerks: unteres Stück (15 % der Länge, 0.4-1.0 m) = **Fuss**, oberes = **Kopf**, Schaft = **Lage**; auf 0.10 m, gestrichelte Vorschau mit Weg und neuer Länge; ohne Bewegung bleibt es der Klick (Sprung auf die Anschlusshöhe). Fuss: Fussversatz (positiv nach oben) und Länge gegengleich, Kopf: Länge - die Anschlusshöhe bleibt, das Joch steht still. Lage über `mastStelle` (dieselbe Regel wie die Marke im Lageband). Nie kürzer als `mastLaengeMindestens`, sonst Meldung und nichts geändert. Am Einzelmasten nur Kopf und Lage (Δz_F ausgeblendet, Entscheid 30. Sept.). `mastZiehen` (app.js), `mastZiehen` der Szene (render.3d.js, mit `szeneVerschieben`/`szenenVereinen` mitgeführt - beim ersten Browserlauf fehlte das, der Fuss griff 7.50 m daneben die Lage). Im Browser (Prüfseite, Standarddokument J90/20 m): Kopf M1 8.50 → 10.50 m; Fuss +0.00 → −0.50 m, Länge 8.50 → 9.00 m, H 7.50 bleibt; Lage x 0 → 1.00 (das Joch rückt mit, L 20 bleibt), Strg+Z zurück; Klick ohne Bewegung springt aufs Feld. **Beobachtet:** M2 ohne eigene Länge folgt M1 (bestehende Kopplung «Ende B folgt Ende A») - siehe *Offene Punkte*. Prüfstand 185 |
| Reaktionsblatt und 3D-Werte schlichter (2. Oktober) | Weisungen: «kann man bei den Bauteil Texten jeweils die M1 und T1 herausnehmen. die Masten sind hier relevant und werden schon am Buss beschriftet. nimm noch die strichlierte linie raus. nimm noch das zum Betrachtet weg und beschrifte die achsen klarer ohne die Lastbeispiele und nimm noch die rechte hand hinweis weg.» und «resultatwerte etwas weniger prägnant anschreiben im 3d.» Bauteiltitel der Skizze ohne die Kennung (nur echte Kennungen aus `tragwerkPos`/`mastName` - ein Muster `A\d+` nahm dem Typ «A160» den Namen), keine Grundlinie, Achssystem «X quer zum Gleis», «Y längs zum Gleis», «Z nach unten», Momentzeilen bleiben, ohne Mastachse, «zum Betrachter» und rechte Hand; Bildunterschrift «Achssystem der Tabelle». 3D-Werte: Schrift wie die Lastanschrift, normal statt fett, Kästchen ohne Rahmen (Deckkraft 0.72), Ziffer in `--on2` - ändert die Weisung vom 29. Sept. («sichtbarer») zurück ins Leise |
| Lastfallnamen quer/längs zum Gleis; Hinweistext (2. Oktober) | «für den hinweis nicht jochachse verwenden, sondern jeweils quer und längs zum Gleis» - Lastfälle und Wahlliste «Wind +x (quer zum Gleis)», «Wind +y (längs zum Gleis)» statt Jochachse/Gleisrichtung. «kannst du den vorlagetext so anpassen» (mit Bild der gekürzten Hinweise) - der erzeugte Hinweistext des Reaktionsblatts ist jetzt der gekürzte Text des Auftraggebers |
| QP lesen: Bündel an der Doppelklemme, «E» ignorieren, Typen-Abfrage (2. Oktober) | Mit Bild eines Ausschnitts: das **Bündel 2× 95Cu erkennt man an der Doppelklemme** - Beispiel 1 wieder mit Bündel (`cu-95-x2`; meine Lesart «K = einfach» war falsch). «Ich kann nicht genau sagen was das e zu bedeuten hat, das kann man ignorieren.» - das `E` hinter dem Jochtyp wird nicht gelesen. Stehende Regel für das Einlesen: «wenn das system gewisse typen nicht automatisch zuordnen kann sollte eine abfrage erfolgen für die manuelle zuweisung oder übernahe eines vorschlags» |
| QP lesen: Regeln zu Radius, Spannweite, Leiter, Mastfuss (2. Oktober) | Antworten zu Beispiel 1, im Wortlaut: (1) «Radius in einem ersten schritt für die Zusatzleiter anwenden -> Sichere Seite, Beachte auch die richtung der kurve bei den radien» - ist die Richtung nicht ablesbar, beide rechnen, die ungünstigere gilt (Beispiel 1: r 1600 unter Gleis W, ü = 0; R −1600 m massgebend, Mast 24A 1.177 gegen 1.170). (2) «die zusatzleiter haben im normalfall die gleichen werte für die spannweite wie die fahrleitung.» (3) «zweifach Cu wird auch Bündel benannt, wir können aber die benennung mit 2x fürhren. Rückleiter hat es Cu oder auch aldrey jenachdem. Der Rückleiter haben eine E oder RL bennnung.» Im Plan: Isolator `K` = einfach 95Cu, `L` = Bündel 2× 95Cu (Kursaufgaben S. 5) - **nachgetragen:** das Bündel erkennt man an der Doppelklemme (siehe Zeile darüber). (4) `E` hinter dem Jochtyp: Ausschnitt gezeigt (`Versand/qp_beispiele/E_hinter_dem_Typ.png`, auch bei IPE300 und UPE 240), Bedeutung offen - seither: «das kann man ignorieren». (5) «der mastfuss wird über fundamentschrauben (Bewehrungsstäbe mit gewinde am oberen ende je nach typ als M30 und M36). der übergang ist nicht vermöttelt, dieser dient dazu da, dass man den masten justieren kann.» - die 5 cm zwischen hk und Mastfuss sind der Justierspalt. Beispiel 1 neu: R −1600 m, ~~Cu 95 einfach~~ seit der Doppelklemme wieder Bündel 2× 95Cu, c 40 m bis zur Angabe der FL-Spannweite |
| U-Profile in AxisVM aus dem Normumriss (2. Oktober) | Frage «werden die aktualisiereten Querprofile korrekt in Axis aufgebaut?» Befund aus den Aufbauberichten: `AddL` und `AddI` treffen die Tabelle, **`AddU` baut das U scharfkantig** (Radius verworfen: UPE 140 −3.4 %, UPE 240 und Gabel −2.5 % Fläche - 1780 bzw. 3755 mm² sind genau die Flächen ohne Ausrundung), das UNP mit parallelen Flanschen. Auf Rückfrage **«Ja, als Polygon»**: die Ausleitung schickt je U-Profil die `kontur` des Normumrisses (`core.profilgeometrie.js`, `uKontur`; UNP mit 8 % Neigung), die Brücke baut sie mit `KonturQuerschnitt` (Hilfs-U nur für Lage und Umlaufsinn, dann `AddCustom`) und **prüft die Lage** (starke Achse in derselben Komponente wie das Hilfs-U, sonst alter Weg mit Meldung); die Flächenprobe liest jetzt auch I. **In AxisVM gebaut (nicht gerechnet), auf Freigabe:** A240 Gurt/Gabel A +0.0 %, I +0.1/+0.0 %; Tragausleger UPE 140 A +0.1 %; UNP 120/140 A +0.0 %, I +0.0/−0.1 %; Winkel mit Normradien und HEB/IPE +0.0-0.1 %. Modelle `com/AxisVM_Kontur_*.json` (gitignoriert) |
| Profiltafel: dieses Tragwerk / ganzes Blatt, Bleche mit Position (2. Oktober) | Frage mit Bild: «das j90 joch besteht aus unterschiedlichen flachblechen, wo sind diese aufgeführt?» - die Tafel zeigte nur das AKTIVE Tragwerk (dort der Tragausleger). Auf Rückfrage **«Beides umschaltbar»**: Schalter im Kopf der Tafel, Vorgabe «dieses Tragwerk» (Ansichtssache, localStorage `tragjoch-profilumfang`); «ganzes Blatt» rechnet je Tragwerk über `rechneTragwerk` (derselbe Weg wie der Bericht über das Blatt, einmal je Eingabestand), Spalte Tragwerk, geteilter Mast einmal. Blechzeilen nennen die Position wie Legende und Werkstattzeichnung («Vertikalblech Pos 3 · Horizontalblech Pos 5, 6»). Zeilenaufbau herausgelöst (`profilZeilen`). Im Browser: T1 J90 FL 100×10 (Pos 3/5/6, 40 Stk) und FL 80×10 (Pos 4/7, 72), A1 UPE 160 mit drei Blechen, MT1 UPE 140 / FL 100×10. Prüfstand 6147 |
| Profiltafel: abgeleitete Kennwerte, Bindebleche anklickbar (2. Oktober) | Frage mit Bild der Tafel: «warum fehlen hier gewisse kennwerte und wo sind die falchbleche zum anklicken?» Ursache: die Winkeltabelle führt i, nicht I, und kein I_t; die Tafel zeigte nur Hinterlegtes. Jetzt stehen die Werte da, mit denen gerechnet wird, **kursiv** und im Titel benannt: I = i² · A (wie `winkelwerte`), I_t = (a_H + a_V) · t³ / 3 (neu `winkelIt` in core.winkel.js, dieselbe Funktion nutzt jetzt export.axisvm.js - gemessen 4.374e-8 m⁴ am L 90x90x9, unverändert). **Bindebleche** je Abmessung eine Zeile mit Rollen und Stückzahl (Tragjoch aus den Stationen, Abfangjoch aus `abfangBlechstationen` mit Regel-/Endblechen, Tragausleger aus dem Sortiment), Kennwerte aus b × t (`blechWerte`, kursiv), anklickbar: Profilblatt mit Rechteckschnitt. Am Abfangjoch dazu die Quersteifen (Walzprofil) als eigene Zeile. Im Browser: J90/20 m FL 100×10 (40) und FL 80×10 (72); A160 FL 100×8 (38), Endbleche 120×15 / 100×12; Tragausleger FL 100×10 (24). Prüfstand 6141 |
| QP lesen: Legende, Beispiel 1 nachgebaut (2. Oktober) | Weisung «legende anlegen und beispiel 1 nachbauen. wobie hier zu erwähnen ist, das die beschriftung nicht immer eindeutig ist der h werte. allgemien kann man sagen, dass die ohne z sich auf das referenzgleis beziehen und die restlichen auf den jeweiligen Mastfuss. ich würde aber eher einen Masstab bestimmen und anhand der abbildung selbst diese als bauteil bestimmen und entsprechend den koordinaten ansetzen». **Massgebend ist die Zeichnung:** Massstab bestimmen und an zwei Massen gegenprüfen, Bauteile aus der Geometrie, Zahlen nur zur Kontrolle. Befunde: in allen Plänen unter `Grundlagen/QP` ist die Planschrift als Linien exportiert (kein lesbarer Text, nur Kommentare); Seiten teils um 270° gedreht abgelegt; an Beispiel 1 gilt beidseits ha − haz = (hk − Gleis 0) + 0.054 m (ha/haz = UK Joch ab Gleis/Mastfuss, Mastfuss ~5 cm über hk). Legende und Beispiel örtlich in `Versand/qp_beispiele/` (`QP_Legende.md`, `Beispiel1_Jochbestimmung.zip` = Ablage-Paket mit dem Plan als eingemessener Zeichnung, Kalibrierung aus dem Massstab gerechnet). Gemessen: J100 Gurt 21.50 m, Mastachsen 21.20 m (Kragarm 0.15/0.15), H 7.26, Fuss 24A −0.24, Mast 8.0/8.5 m, drei Jochaufsätze bei 6.15/10.75/15.35 m, fünf Zusatzleiter, vier Rückleiter unter dem Joch, je einer an den Masten. Im Browser (Prüfseite mit localStorage und IndexedDB nur im Arbeitsspeicher, `fake-indexeddb`) über den Einleseweg der Ablage geladen: Masten, Joch und Aufsatz decken sich mit dem Plan. Beim Bau gelernt: ein Stand mit Kragarm braucht `kragMasten: true`, sonst hebt `standAnheben` ihn als alte Form an (L + c_A + c_B); `typUebernehmen` setzt `typ` nicht; der ZIP-Leser der Ablage nimmt nur unkomprimierte Einträge. ⚠ Offene Annahmen siehe Legende (Trasse, Spannweite, Leitertypen, `E` hinter dem Jochtyp, 5 cm am Mastfuss) |
| Bauteile bereinigen über markierte Querprofile (2. Oktober) | Weisung: «Die Bauteile sollten wir bereinigen. wir könnten ein paar querprofile zusammen durchgehen. ich markiere dir die bauteile im Querprofil und die tragwerke damit du besser die logik verstehen kannst. wie könnte man das am einfachsten umsetzen?» Vorschlag angenommen («Grundlagen/QP, ich markiere mit pdf xchange, Bezeichnung wie vorgeschlagen»): der Auftraggeber markiert **im PDF** mit Rechteck-/Wolkenkommentaren, Text `Tragwerk: T1 J90`, `Bauteil: NT-Ausleger, Mast 14`, `? …` für Offenes; ausgelesen mit `qp_markierungen.py` nach `Versand/qp_markierungen/<Plan>/` (Liste JSON/CSV, Ausschnitt je Markierung, Übersicht je Seite). Gezählt nur mit Präfix und ab 1. Oktober 2026 (`--ab`) - die Kursaufgaben tragen 753 Kommentare aus 2014-2016, 27 davon genau «?». **Befund:** KM022869, KM023009 und «QP Joch 51_52 BP» führen keinen lesbaren Text (Schrift als Linien exportiert) - dort ist der Kommentar die einzige Angabe. Danach: Abgleichtabelle Markierung ↔ Planbezeichnung ↔ Vorlage ↔ Befund, Entscheid je Bauteil; erst dann ein Markiermodus in der Anwendung |
| UNP der Anker in die Profiltabelle (2. Oktober) | Weisung «ja anker auch auf die norm bringen, warum stehen diese nicht in der datenbank?» - Antwort: sie kamen am 11. Sept. in den Ankerkatalog, weil die Profiltabelle damals nur Winkel und UPE/IPE führte. Auf Rückfrage **«In normen.json verschieben»**: UNP 120/140 als Zeilen der Profiltabelle (Reihe `UNP`, cm), Werte aus dem Umriss mit 8 % Flanschneigung (UNP 120: A 16.99, I_y 364.3, I_z 43.06, e_y 1.61; UNP 140: 20.37 / 604.8 / 62.48 / 1.76), I_t nach Norm 4.15 / 5.68. Der Anker führt in `data/anker.json` nur noch `profil` und `anzahl` (Zahlen entfernt; Sicherung `data/sicherung/anker_vor_unp_normen_2026-10-02.json`); `ankerQuerschnitt` setzt Einzel- und Verbundwerte zusammen (Verbund = Anzahl · Einzelwert, I_z null), `ankerKnicken` liest über dieselbe Funktion. Ein älteres Paket ohne UNP-Zeile rechnet mit den Katalogzahlen weiter. Gemessen: Knickwiderstand U12/7 m 213.964 → 214.080 kN, U14/12 m 135.475 → 135.413 kN; Achsabstand U12 am Fundament / Masten 136 / 257 → 136.2 / 257.2 mm. Prüfstand 6130 |
| Alle Querschnittswerte aus dem Normumriss (2. Oktober) | Weisung «allle querprofile auf die der norm bringen». Auf Rückfrage **«Alle Querschnittswerte aller Profile»** und **«Aus dem Umriss, Tabellenrundung»**: in `data/normen.json` jede Zeile der Winkel, UPE/IPE und HEB/HEM - A, I, W, i, i_v, Schwerpunkt, Gewicht (A · 0.785) - aus `querschnittAusUmriss` (Normmasse und -radien der Datei), gerundet auf die Stellen der jeweiligen Spalte; **I_t bleibt** der Tabellenwert (kein Umrisswert). 96 Werte geändert, meist in der dritten Stelle; die grössten: L 200x200x20 Schwerpunkt 5.52 → 5.68 cm, W 196.82 → 199.11; L 120x80x12 z_s/y_s 2.05/4.05 → 2.03/4.00, i_v 1.73 → 1.71, W_y 18.9 → 19.14; L 120x120x12 W 42.21 → 42.73. Damit hebt die Weisung «die anderen lassen» vom selben Tag auf. Sicherung `data/sicherung/normen_vor_umriss_2026-10-02.json`. **Gemessen** (Stabwerk, Standardbelegung): J90/20 m Blech 0.3691 → 0.3688, Gurt 0.3264 → 0.3263, Mast 0.6705 unverändert; J120/25 m Blech 0.4572 → 0.4568; **J130/30 m Blech 0.5470 → 0.5579 (+2.0 %), Obergurt 0.4167 → 0.4236, Mast 0.9093 → 0.9179** - Ursache der Untergurt L 120x80x12 (Schwerpunkt und i_v, aus denen das Deviationsmoment folgt; mit seiner alten Zeile 0.5461 / 0.9084), die alte Zeile lag also leicht auf der unsicheren Seite. Kern (Ersatzbalken) in der vierten Stelle. `vergleich_profile.mjs`: 0 von 246 Werten über 1 %. Neun Prüfstand-Kontrollen tragen den neuen Messwert, der alte steht im Kommentar |
| Winkeltabelle: nur L 45x45x5 berichtigt (2. Oktober) | Weisung «L 45x45x5 berichtigen, die anderen lassen». i_y = i_z 1.38 → 1.35, i_v 0.88 → 0.87, W_y = W_z 2.53 → 2.43 (aus dem Umriss mit r1 7 / r2 3.5: 1.350 / 0.871 / 2.434; vorher W 3.8 % auf der unsicheren Seite), Vermerk im Feld `hinweis`; Sicherung `data/sicherung/normen_vor_L45_2026-10-02.json`. **L 200x200x20, L 120x120x12, L 120x80x12 bleiben wie tabelliert** (ihre Abweichungen liegen auf der sicheren Seite). `vergleich_profile.mjs`: 9 von 246 Werten über 1 %, alle an diesen drei. Kein Tragjoch des Sortiments führt den L 45x45x5 |
| Profile nach Norm gezeichnet, gegen die Datenbasis nachgerechnet (2. Oktober) | Weisung: «die profile sind gemäss szs c5 oder eurocode zu zeichnen, es fehlen ei vielen querschnitten die ausrundungen. prüfe die angaben mit der berechnungsdatenbank ab». Auf Rückfrage **«Normwerte, gegen normen.json»** und **«Nur melden»** (keine Querschnittswerte ändern). Radien in `data/normen.json` (Sicherung `data/sicherung/normen_vor_radien_2026-10-02.json`): Winkel `r1`/`r2` nach EN 10056-1 (ausser L 130x80x12, Sollgeometrie), Masten `r` nach EN 10365 (HEB 200/220/240/260, HEM 240: 18/18/21/24/21 mm), **UPE 160/200/240 berichtigt 10/11/12 → 12/13/15 mm** (gemessen: erst die EN-Radien treffen A, I, W, e_y der Tabelle auf 0.02 %, mit den alten lag A 0.7–0.9 % darunter). Das Profilblatt zeichnet den gerundeten Umriss (`umrissPunkte`): Winkel r1 Kehle und r2 an beiden Schenkelspitzen, I/UPE r in den Kehlen, UNP nach DIN 1026-1 mit 8 % Flanschneigung, t_f **bei b/2 vom Stegrücken** (gemessen: in der Mitte des freien Flanschteils lag A +1.51 %, bei b/2 −0.07 %), r2 = r1/2. `querschnittAusUmriss` rechnet aus demselben Umriss A, I, W, i, i_v und den Schwerpunkt; neues Werkzeug `vergleich_profile.mjs`: 246 Werte, 14 über 1 % (siehe *Offene Punkte*). Die feste Radientabelle der Abfangjoch-Ausleitung ist weg (liest `r` der Tabelle); die Gurtwinkel gehen mit den Normradien statt der aus der Fläche zurückgerechneten nach AxisVM (L 90x90x9 10.12/5.06 → 11/5.5 mm). Rechenkern und Löser lesen A, I, W weiter aus der Tabelle - keine Nachweiszahl ändert sich. Prüfstand 50, 184 |
| Profile: Mastklasse, Fussnaht, Profilblatt (2. Oktober) | Weisung «mit punkt 1 und 2 unter profile anfangen» - aus der Liste vom 30. Sept.: «beim Mast noch unter profile die querschnittsklasse angeben und einen hinweis zur schweissnaht an fussplatte (durchgeschweisst). dies ist bei den standardfussplatten schon der fall.» und «unter profile könnte man da auf die einzelnen profile klicken und ein fenster mit den hinterlegten kenndaten zum profil und eine svg zeichnung des schnitts und mit vermassung und die angabe zur lage des schwerpunktes, so lassen sich die werte mit der fachliteratur abgleichen.» (1) Unter der Profiltafel der Block **«Mast: Querschnittsklasse und Fussnaht»**: je Mast die Klasse **des Mastnachweises** (`erg.mast[ende].klasse`, `mastKlasse` unter N_Ed,max - keine zweite Rechnung; ohne Nachweis dieselbe Funktion mit N = 0, angeschrieben), Flansch und Steg c/t gegen die Grenze; dazu der Hinweis: durchgeschweisste Stumpfnaht wie bei den Standardfussplatten, trägt wie der Querschnitt (EN 1993-1-8, 4.7.1), keine eigene Nahtbemessung. Im Browser J90/20 m, HEB 260: Flansch 7.1 / 9.00, Steg 22.5 / 69.13, Klasse 1. (2) **Profilblatt** (neues Modul `ui.profilblatt.js`): Klick auf eine Zeile der Tafel öffnet ein Fenster mit allen **hinterlegten** Werten, ungerundet und in der Einheit ihrer Tabelle (Winkel mm/cm, Walzprofile cm, Masten mm, UNP des Ankers mm), dazu massstäblicher Schnitt mit Vermassung (h, b, t_w, t_f, r bzw. a_H, a_V, t), Achsen y/z und Schwerpunkt S mit Abstand zur Bezugskante (Winkel y_s/z_s, U e_y). I der Winkel steht als «abgeleitet i² · A» gekennzeichnet. Ausrundungen nur, wo r hinterlegt ist (UPE/IPE, UNP); Winkel und Masten scharfkantig mit Vermerk; UNP ohne Flanschneigung, ein Profil. Seilanker ohne Blatt. Prüfstand 184 |
| Bericht und Excel auf dem Stabwerksweg; Berichte für Abfangjoch und Tragausleger (1. Oktober) | Weisung: «Bericht und Excel auf den Stabwerksweg umstellen, dazu je ein Bericht für Abfangjoch und Tragausleger». Auf Rückfrage: **«Formel + Stabliste»** (je Bauteil der massgebende Stab mit Kombination, Endkräften und eingesetzter Spannungsformel, darunter die zehn höchstbeanspruchten Stäbe des Teils), **«Ganzes Blatt»** (ein Bericht über alle Tragwerke und Masten des Stabwerks, geteilte Masten einmal, Urteil des Blattes), **«Weg, ausser Knicken»** (keine Zahl des Ersatzbalkens; Knicken nach SIA 263 Gl. (50) mit den Kräften des Stabwerks), **«Erst rechnen»** (ohne gültiges Stabwerk rechnet der Knopf zuerst). Neues Modul `export.stabbericht.js` (`stabwerkBericht`, `blattUrteil`, `stabFormelHtml`); die Daten stellt `stabwerkBerichtDaten` (app.bericht.js) zusammen: je Tragwerk sein Kern über `rechneTragwerk` (aus `neuRechnen` herausgelöst, derselbe Rumpf) für Lasten, Prüfungen, Hinweise und die Messstelle, je Mast Knicken, Fundament und Anker aus dem Stabwerk (`ankerFuerMast`, `verformungFuer`). Die Zwischenwerte liefern `randspannung`/`stabSpannung` als `detail` (Winkel: A, I_y, I_z, I_yz, Ecke, k_y, k_z; sonst A, W, σ-Anteile). Der Bericht des Ersatzbalkens bleibt, wenn in den Optionen das Rechenverfahren Ersatzbalken steht (nur Tragjoch und Einzelmast); Abfangjoch und Tragausleger haben nur den des Stabwerks. **Excel** auf dem Stabwerksweg (`exportiereStabwerk`): Eingabe, Urteil, Massgebend (Zwischenwerte je Teil), Stabwerk (alle Stäbe), Masten (Knicken, Fundament, Anker), Reaktionen, Konstruktion, Profile; die knotenweise Rechnung und der Massvariantenvergleich entfallen. **Befund dabei, unsichere Seite:** das Stabwerk wies die Bindebleche ohne Schub nach; auf Rückfrage **«σ_v mit τ»** jetzt √(σ² + 3τ²), τ = 1.5 · V / A aus der grösseren Querkraft am Ende (nur Bleche). Gemessen J90/20 m Blech 0.3634 → 0.3715, Reihe 2 × J90/20 m 0.4403 → 0.4475, Tragausleger L 13 m mit Längsanker zwei Seile 0.2880 → 0.3013. Im Browser (Prüfseite): Tragjoch, Reihe (T1/T2, M1-M3), Einzelmast, Tragausleger, Abfangjoch - Deckblatt jeweils mit derselben Zahl wie die Fussleiste; Excel acht Blätter, Zwischenwerte wie im Bericht. Prüfstand 183 |
| Kleine Befunde abgearbeitet (1. Oktober) | Weisung «diese punke angehen». (1) **Reihenzeile** der Stabwerksleiste nennt die Tragwerke wie Lageband und Kacheln (`reiheName` in app.js: Stabname trägt die Kennung, Anzeige `tragwerkPos`; Mast mit Nummer); im Browser `T3_…` → «Joch T1», `T1_…` → «Joch T2». (2) **Anschlusshöhe im Dialog «Neues Tragwerk»** wird geschrieben; die nachgezogene Länge eines geteilten Masten fällt nie unter das, was die übrigen Joche an ihm brauchen (`mastLaengeMindestens`) - im Browser T2 mit H 6.50 an M2: T1 bleibt 7.50, M2 bleibt 8.50 m. (3) **Anker im 3D** mit 6 px Fangrand (`randAbstand`): Rechtsklick trifft ihn auf 18 statt 4 px Zeilenbreite (gemessen, alter gegen neuen Stand). (4) **Mastlänge im Namen** eines Tragwerks aus der Mastliste (`tragwerkName` mit `w`, sonst Vorgabe; beim Ausleger H + b) - die Liste führt eine Länge je Mast, die Rechnung liest sie ohnehin dort. (5) **Ankerfuss** auf Rückfrage **«Ein Gelenk für beide»**: die zwei U-Profile laufen am Fundament auf einen Bolzen (`ANKERGELENK_…_FG`, Link 50 mm in der Achse; die Gelenkstücke je Profil bleiben am Masten). Dabei gefunden: der eigene Löser wertet `gelenkAnfang/gelenkEnde` an ECHTEN Stäben nicht aus - Seil (Fuss) und Ersatzstab (beide Enden) hingen biegesteif; jetzt ebenfalls als Link (`gelenkVor` in export.axisvm.js). Gemessen J90/20 m, Anker an M1 h 6.0 / a 4.0, am Ankerfundament: U12 quer M_l 4.10 → 0.004, T 2.62 → 0.003 kNm; U12 längs M_q 0.35 → 0.002; SA20 quer M_l 0.70 → 0. Dafür Mastfuss M1 M_l 39.33 → **43.31 kNm** (U12 quer, +10 %), SA20 42.38 → 43.09. (6) **serve.py** bindet unter Windows exklusiv (SO_EXCLUSIVEADDRUSE) und bricht bei belegtem Port ab. Prüfstand 182. **Nachgereicht** («mastdialog beheben»): der Mastdialog las `m.H`, das niemand setzt, und zeigte damit die Höhe des GEWÄHLTEN Tragwerks (M1 von T1 zeigte 6.50 von T2); jetzt liest er die Höhe des Tragwerks, das den Masten trägt, an dessen Ende (`anschlusshoehe`), nennt beides im Hinweis und schreibt ins Feld dieses Endes (`mastHB` bei eigener Höhe B). Im Browser: M1 7.50 (T1), M2/M3 6.50 (T2, «Ende B folgt Ende A»); M1 auf 7.00 → T1 7.00, T2 bleibt 6.50 |
| Jochreihe: Zwischenmast schieben, Kragarm (1. Oktober) | Gemeldet: «der fussfehler ist seit letztem mal nicht mehr auf getretten. aber was beobachtet wurde wenn mehrere joche in reihe stehen, dann macht der überstand und das nachträgliche schieben des mittleren masten probleme.» Gemessen (2 × J90, 20 + 15 m): M2 von 20 auf 22 m geschoben ergab T1 0..20 und T2 22..37 - vier Masten, die Reihe auseinander, auch ohne Kragarm (das linke Joch hielt am rechten an, das noch an der alten Stelle stand); nach links ging es. Mit Kragarm am Zwischenmasten riss die Reihe in beide Richtungen; ein angehängtes Joch erbte die Kragarme des gewählten und stand um c_A neben dem Masten. Behoben: der geteilte Mast schiebt beide Joche in einem Zug, der Partner ist kein Hindernis, das rechte rückt höchstens bis an seinen Nachbarn (kein Sprung dahinter; `mastStelleSetzen` in ui.js); die Grenze am Ende B rechnet mit c_B. Auf Rückfrage **«Ohne Kragarm»**: ein neues Joch (Kachel, Dialog, «zwischen den Masten») startet mit c_A = c_B = 0 und schliesst am letzten MASTEN an. **«Erlauben»**: am Zwischenmasten dürfen beide Joche auskragen und sich überdecken - die Kollisionsregeln lesen dafür die Strecke von Mast zu Mast (`bereichVon`), nicht die Gurtlänge. Im Browser (Prüfseite): T1 mit c_A 0.50, T2 angehängt bei 20 (drei Masten), M2 → 22 / 18: geteilt, T1 22.50 m; T2 c_A 0.50, M2 → 20: Lage 19.5, L 21, drei Masten. Prüfstand 181 |
| Tabelle der Reaktionskräfte (30. Sept.) | Weisung (Wortlaut in `js/core.reaktionen.js`): die Zusammenfassung der Einwirkungs-Mappe als Output - charakteristisch, Wind ohne 0.7, bei einer Jochreihe alle Auflager, Übersichtsskizze, Hinweise, Achssystem, **Druck positiv**. Auf Rückfrage **Havarie als eigene Zeile** und **«Beides»** (Reiter Auflager oben, Blatt im Export «Reaktionskräfte (Blatt)», druckbar A4 quer). Aus dem **Stabwerk** (alle Auflager des Blattes in einem Modell): je Mastfuss, Ankerfundament und Längsanker V min/max, ±M_q, ±H_q, ±M_l, ±H_l, ±T mit massgebendem Fall, Anteil ständig/veränderlich am Moment quer, darunter die Standardlasten des Fundamenttyps. Zustände: G = beide ständigen Hälften zusammen, ständig + Wind/Schnee; Betriebswind und die G-Hälften allein zählen nicht. Skizze = echte Stäbe und Seile des Stabmodells in x–z. Gemessen: J90/20 m M1 V 12.825 kN, M_q 11.235, M_l 43.091 kNm - auf die Stelle wie der Fundamentnachweis; Reihe 2 × J90/20 m mit Anker: M1, Ankerfundament, geteilter M2 (M_l 70.014), M3. Ohne gültiges Stabwerk keine Tabelle, der Grund steht da. **Überarbeitet am selben Tag** («Das LA auflager (beim tragausleger) verwirrt die lesart, hier die aufhängeseile anzeigen. Die tabelle sollte geordneter daherkommen (gleiche zellenbreiten bei den werten. überarbeite das design. dazu noch die benennung der reatktionskräfte mit dem achsystem ergänzen wie in der exceltabelle. mach ein einspannsymbol beim Mastfuss. beim Anker die Mastzahl nehmen und ein A vornedran machen. die Reaktion sollte dann beim Ankerfundament eine y und z komponente enthalten (wenn in längsrichtung angesetzt). deute den anker noch in der obigen scheaskizze an.»): Köpfe F_z (V), ±M_y (M,q), ±F_x (H,q), ±M_x (M,l), ±F_y (H,l), ±M_z (T) unter «Lastfall quer / längs zum Gleis»; festes Raster, Wertespalten gleich breit; Anker «A14» nur mit V und der Horizontalkraft seiner Richtung; Skizze mit Einspannung am Mastfuss, Anbauteilen (lange Starrglieder, blau), Seilen gestrichelt, Anker als Strebe mit Gelenk (längs: umgeklappt und so angeschrieben), kein Lagersymbol am Längsanker; Havarie knapp («Leiterriss, Längszug +y»), der Leiter steht in den Hinweisen. Im Reiter die **gestürzte Form** (je Auflager Grössen als Zeilen, Einwirkung / Havarie / zulässig als Spalten) - zehn Spalten waren in der Seitenleiste unlesbar. Beispiel «Jochreihe 2 × J90/20 m» (Masten 12/13/14, Hängestützen, Jochaufsätze, Zusatzleiter und Rückleiter an 12, NT-Ausleger und Rückleiter an 14, Anker längs an 14, ein Leiter reisst): 12 V 16.77/17.29, M_y 40.23, M_x 51.80; geteilter 13 M_x 87.45 kNm; 14 V 2.69/34.31; A14 V −15.80/15.83, F_y 8.84 kN |
| Mast wächst beim Anbau des Tragauslegers (30. Sept.) | «beim anbau von tragauslegern den mast automatisch verlängern und mit info versehen wie bis anhin am oberen bildschimrand» - beantwortet die Frage (a) automatisch / (b) Warnung. Nach «Setzen» im Dialog (neu oder Artwechsel) bringt `auslegerMastAnbau` (app.js) den Masten auf H + b (halber Meter), wenn seine eingetragene Länge nicht reicht oder ein anderes Tragwerk ihn trägt; Meldung im Balken oben. Danach bleibt die Länge dem Nutzer (kürzer gestellt: Warnung). Im Browser: Mast 14 auf 9 m, zweiter Ausleger L 10 m an Mast 14 → «Mast 14 auf 12.50 m verlängert (war 9.00 m)». Die Stabwerk-Sperre für einen Ausleger an einem geteilten Masten bleibt (*Offene Punkte*) |
| Kleinigkeiten 30. Sept. (Anker, Masten-Schalter, Δz_F, Berichtsleiste) | «kontext menue beim anker auch ergänzen»: Rechtsklick auf Stab oder Fundament des Ankers → «Anker bearbeiten …», Seitenleiste, zoomen, entfernen, darunter die Einträge des Masten (`kontextAnker`). «diese option bei einem tragausleger entfernen» → «Tragwerk steht auf Masten» und «Masten … ausschalten» nicht beim Ausleger; alte Stände mit aus stehen wieder auf dem Masten. Δz_F am Einzelmasten auf Rückfrage **«Ausblenden»** (gemessen: mit Länge kein η, ohne Länge eine zweite Tür zur Länge); ein gespeicherter Versatz wird in die Länge überführt und auf 0 gesetzt (`einzelmastFussAnheben`), gleiches η. «die msten werden meist mit ganzen zahlen ohne punkt beschriftet» → Beispiel im Hinweis «z. B. 14». Leiste des Nachweisberichts weicht im installierten Fenster den Fensterknöpfen aus (Window Controls Overlay; im Browserbereich nicht prüfbar). **Nachgemeldet** («Die Fenser steuerung überlagert sich mit den buttons beim nachweisbericht»): die Regel stand im Stilblatt vor der Grundregel der Leiste und wurde von deren `padding` aufgehoben (gleiche Spezifität, die spätere gewinnt) - jetzt dahinter, Prüfstand 168 wacht über die Reihenfolge |
| Verformte Figur im 3D (30. Sept.) | Frage «ist es möglich ein verformtes modell darzustellen im 3d? oder kostet das zu viel performance? es wäre nur ein nice to have», dann «frage zum verformten modell angehen». Schalter «δ» in der Resultatleiste: die echten Stäbe des Stabwerks (5 Punkte je Stab, Biegelinie `wegImStab`; `verformteFigur`) als Linienzug in der Warnfarbe über dem Modell, überhöht auf rund 8 % der Modellgrösse (runde Zahl), Anschrift mit Faktor, Fall und grösstem Weg. Fall: der gewählte, bei «umhüllend» der massgebende der Gebrauchstauglichkeit. Nur mit gültigem Stabwerk (Rohdaten `roh`, nicht aufzählbar, am Ergebnis). Gemessen J90/20 m, Wind +y: 466 Stäbe in 41-147 ms; grösster Weg 124.9 mm in Jochmitte, Mast M1 111.9 mm = Wert des Nachweises |
| Kragarm: Masten bleiben, Joch ragt (30. Sept.) | Befund am Beispielblatt des Auftraggebers: die Mastliste führte die Masten eines Tragjochs mit Kragarm an den Jochenden, Kern, Modell und 3D um c_A / c_B innen - zwei Lagen für denselben Masten. Auf Rückfrage **«Stützweite eingeben»**: die Masten stehen, wo die Liste sie hat; L ist die Gurtlänge = Stützweite + c_A + c_B, `xLage` der Gurtanfang (`kragarme`, `mastLagen`). Kragarm verstellen verlängert das Joch nach aussen (am Ende A beginnt der Gurt früher, Teile auf dem Joch und Nachweisstelle rücken mit); neues Feld «Stützweite (Mastabstand)» (nur mit Kragarm, schreibt L); Mast ziehen und Dialog «zwischen den Masten» rechnen mit den Kragarmen. Alte Stände einmal umgesetzt (`kragMasten`): Gurt um c_A früher, L + c_A + c_B - ihre Masten bleiben, das Joch wird länger und rechnet damit anders. Im Browser am Stand des Auftraggebers: T2 J80 L 14.00 → 14.40, c_A 0.20 → 0.50 gibt L 14.70, Lage 19.00, Masten 19.50 / 33.50 unverändert; Stützweite 13 → L 13.70, M4 32.50 |
| Einzelmast geht im Joch auf (30. Sept.) | Offene Frage «Einzelmast unter einem neuen Joch», auf Rückfrage **«Übergehen»**: trägt ein Joch, Abfangjoch oder Tragausleger den Masten eines Einzelmasten, fällt das Tragwerk «Einzelmast» weg (`einzelmastenAufgehen`); Profil, Länge, Anker und Teile gehören dem Masten und bleiben. Beim Laden (`standAnheben`) und nach jedem Umbau am Blatt (`mastNachfuehrenGlobal`, Meldung im Balken) |
| Strg-Kopie, Vorlage überschreiben, Hinweise des Reaktionsblatts (1. Oktober) | Weisung: «nimm noch die funktion, wenn man ctrl hält und ein element per drag and drop verschiebt direkt eine kopie erstellt wird an der neuen stelle. beim speichern der bauteile frage nach ob man die vorlage überschreiben will oder einen neuen eintrag erstellen will. Die HInweise im Blatt reaktionskräfte überarbeiten, nimm die excel einwirkungen als vorlage. den textblock bearbeitbar machen und man sollte es als vorlage speichern können danach.» (1) **Strg + Ziehen** legt eine Kopie ab: Bauteil (neue Kennung, dahinter in der Liste) oder Angriffspunkt (Modul/Lastblock dahinter); die Vorschau sagt «Kopie». Im Browser: Original 10.00, Kopie 7.70 m. (2) **Als Vorlage speichern**: Dialog statt Namensfeld - stammt das Teil aus einer eigenen Vorlage, «… überschreiben» (Vorgabe) oder «Neue Vorlage anlegen»; Katalogvorlagen nur neu; vergebener Name wird «Name (2)». (3) **Hinweise** nach dem Block der Zusammenfassung der Mappe (Zusammensetzung, längs/quer getrennt, abhebend, Grenzwerte der Gebrauchstauglichkeit - die in der Anwendung eingestellten), ohne Betreibernamen und Regelwerksnummer; der Block ist auf dem Blatt bearbeitbar (übersteht das Umschalten der Kästchen), «Hinweise als Vorlage» speichert ihn im Browser (`tragjoch-vorlage-reaktionshinweise`, gilt für jedes neue Blatt, bereinigt), «Vorlage löschen» kehrt zum erzeugten Text zurück |
| F_z der Eingabe nach oben (1. Oktober) | Umsetzung des Entscheids «Eingabe nach 3D» (30. Sept.) zusammen mit der Weisung «rechte hand regel … output liste / nachweise»: Lastblöcke speichern und zeigen F_z **nach oben** (Gewicht negativ, Feld «F_z ↑»); der Kern rechnet unverändert, umgerechnet wird an EINER Stelle (`expandiereAnbauteile`). Alte Stände einmal (`fzNachObenAnheben`, Merker `fzNachOben` im Blatt, vor dem Normalisieren - die älteste Form baut ihre Blöcke schon nach oben), ebenso eine Tragwerk-Vorlage für sich und die Einträge der Projektliste; ein frischer Stand trägt den Merker. Das Sortiment führt keine Lastblöcke. Anzeige der Lasten nach oben: Gruppenkopf, Zeile und Module der Anbauteile, Lasttabellen in Bericht und Excel; Handbuch Kapitel 2. Die 3D-Pfeile zeigen weiter die Richtung, die Zahl den Betrag. **Fuss- und Auflagerkräfte** auf Rückfrage (meine erste Frage stellte es falsch dar - F_x, F_y und Momente stehen dort als Wirkung, nicht als Reaktion) **«Wirkung, z nach oben»**: Kraft auf Masten bzw. Fundament in Achsrichtung, F_x, F_y und Momente wie bisher, F_z nach oben - Druck negativ (`fzAuf` in ui.js; Mastfuss, Jochauflager, Abfangjoch-Auflager, Masten über die Höhe, Bericht, Excel). Im Browser: Mastfuss −18.58 kN, Jochauflager −6.70 / −6.38. Die Reaktionstabelle und der Fundamentnachweis (V gegen die zulässigen Werte) zählen Druck positiv; «V quer» im Abfangjoch-Gurt ist eine Querkraft und bleibt |
| Sammelweisung 1. Oktober, erster Teil | Wortlaut: «beim absetzen eines bauteils im 3d auf die eingabe in der sidebar fahren. Beim setzen eines neuen tragjochs auswahl, ohne bauteilbelegung. die angriffspunkte auch per drag and drop schieben können, auf den vorgegebenen stabachsen. Eingabe Mastfuss versatz in der höhe funktioniert nicht korrekt. Wenn man beim ersten joch versatz eingibt beim zweiten masten und auf das nächste joch klickt springt der mast auf neutrale position wieder. wurde das behoben mit der letzen spannweiten definition der masten? Nach erfolgter Eingabe springt die sidebar bei einigen stellen. Nach dem duplizieren fragen wo man es absetzen will, dazu das gesamte tragwerksteil zeigen. Beim Absetzen der Bauteile auf 0.10m den x oder z Wert runden. Transparenz der Hintergrundzeichnung einstellen können. Bei der Auswahl der Einwirkungen bei einem Leiter soll nur Wind stehen nicht noch Schnee dazu, dieser ist dann wider eine vertikale belastung.» Danach der Umbau «Eingabe nach 3D» (Auftrag 30. Sept.: «pushen und umbau angehen»). **Absetzen** im 3D fährt die Seitenleiste auf die Karte (`zeigeAnbauteil`, Leiste ausgeklappt und hingerollt). **Runden** beim Absetzen auf 0.10 m (Joch x, Mast Höhe; ein Fang auf die Masskette bleibt genau), ebenso das Ziehen im 3D. **Duplizieren** startet das Setzen mit der Kopie als Vorwahl, das ganze Tragwerk im Bild (`zoomAuf` projiziert den Bereich jetzt wirklich, `_noetigerAbstand`); Esc bricht ein laufendes Setzen ab. **Neues Tragwerk mit Träger:** Wahl «Anbauteile am Träger: ohne / vom gewählten übernehmen», Vorgabe ohne; Teile an den Masten bleiben. **Deckkraft der Zeichnung:** Regler im Zeichnungsmenü (5-100 %, Vorgabe 45), im Blatt gespeichert (`zeichnungDeckkraft`). **Leiter:** der Haken heisst «Wind», Schnee geht mit «Gewicht/Schnee» (lotrecht) - ein Leiter mit abgewähltem Wind trägt jetzt Schnee. **Seitenleiste:** das bediente Feld ist der Anker beim Neuaufbau (`maskenAnkerHalten`); gemessen vorher 9-14 px an einigen Feldern, nachher 0 (der Schalter «Tragwerk steht auf Masten» schrumpft die Leiste so, dass nichts zu halten ist). **Angriffspunkte ziehen:** die Kreise der Angriffspunkte (Module und Lastblöcke) lassen sich im 3D auf der Achse ihres Kettenglieds ziehen (`achseZumPunkt`: Stütze z, Ausleger x; y nicht, die Fangebene ist y = 0), auf 0.10 m, mit Vorschau; geschrieben mit `achsfolge` wie in der Karte. Im Browser: Fahrleitung an der Hängestütze z −2.70 → −4.10 m. **Fussversatz** am geteilten Masten: im heutigen Stand nicht nachstellbar (Mastliste, aktives und passives Tragwerk führen −0.50, im Browser nach dem Wechsel weiter −0.50) - Ablauf beim Auftraggeber erfragt; am 1. Oktober: «der fussfehler ist seit letztem mal nicht mehr auf getretten» |
| Rechte Hand im Kern: Torsion aus Versatz y (30. Sept.) | Zur Weisung «rechte hand regel … nachweise» gemessen: der Kern rechnete T_d = F_y·e_v **+** F_z·y (F_z nach unten) - das zweite Glied mit dem falschen Vorzeichen (nach der rechten Hand dreht eine Last nach unten bei +y um −x). Der Mast (core.mast.js) rechnet alle drei Momente richtig. Berichtigt: T_d = F_y·e_v − F_z·y (core.anbauteile.js, Beschreibung in core.lasten.js). Gemessen J90/20 m, freie Last ständig 5 kN nach unten + 2 kN in +y, 1.35 m unter dem UG: Stabwerk y +0.50 / −0.50 = 0.616 / 1.413; Kern vorher 1.989 / 1.394 (umgekehrt, der ungünstige Fall unter dem Stabwerk), nachher 1.394 / 1.989. Mit Wind ±y blieb die Hülle im Betrag gleich, der Kern nannte aber den falschen Fall massgebend («Wind +y» statt «−y»). Prüfstand 177 |
| Anbauteile ziehen, Esc, Leiter an zwei Punkten, rechte Hand (30. Sept.) | Weisung: «Abgesetzte Anbauteile per drad and drop verschieben können. Beim Esc nach der bauteileingabe nicht herauszoomen. Leiter an Joch sind nur über zwei punkte befestigt, als startwert ansetzen. Beachte beim koordinatensystem die rechte hand regel im modell sowie in der output liste / nachweise.» (1) **Ziehen im 3D:** Druck auf ein Anbauteil des gerechneten Tragwerks greift das Teil (Fläche, sonst sein Umriss mit 6 px Rand - Stützen stehen als Linien da, gemessen hatten nur die Klemmen Flächen); gestrichelte Vorschau auf 5 cm; am Joch längs x (im Tragwerk begrenzt), am Masten die Höhe; geschrieben über `setzeAnbauteile` (Rückgängig). Ohne Bewegung ein Klick. Im Browser: Hängestütze 10.00 → 12.85 m. (2) **Esc** hebt Auswahl und Einzelheitsblick auf, ohne zu zoomen (`auswahlAufheben`); gemessen Kameraabstand gleich. Nachgereicht: «das modell nicht schneiden, auch beim auswahl eines bauteils» - der Blick auf ein Bauteil oder eine Station blendet nichts mehr aus (`_imFokus` immer wahr); der Bereich bestimmt nur noch Kameraabstand und Markenbudget. (3) **Leiter am Joch:** zwei Punkte = eine Reihe in einer Gurtebene (Raster 0); die Vorlagen N-FL, R-FL, Rückleiter im Sortiment 0.40 → 0 (Sicherung `data/sicherung/anbauteile_vor_leiter_zweipunkt_2026-09-30.json`, Datenpaket neu). Gemessen J90/20 m, R-FL bei x 10: Joch 0.3850 → 0.3851, Masten gleich. Die Traverse mit Zusatzleiter bleibt bei 0.60 m. (4) **Rechte Hand im 3D:** die Kamerabasis war rechts = vor × z - das Bild ein Spiegelbild (rechts × oben zeigte vom Betrachter weg). Jetzt rechts = z × vor; Längsansicht von −y (x nach rechts), Querschnitt von +x (y nach rechts), Drehen folgt weiter der Hand; Prüfstand 5 prüft jede Blickrichtung. **Reaktionstabelle:** mit Z nach unten und X wie im 3D zeigt Y zum Betrachter (rechtshändig), keine Zahl ändert sich (± Beträge, V nach unten). Offen: das Vorzeichen der Eingabe (F_z positiv nach unten, Entscheid «Eingabe nach 3D», siehe *Offene Punkte*) |
| Resultatleiste und untere Leiste im Stabwerk (30. Sept.) | «die zwei braucht es nicht wenn stabwerk aktiv …» - bei Verfahren «Stabwerk» (mit Stabmodell, `ohneBalken` in app.js) fehlen «Schnittkräfte am Nachweisschnitt» und «Schnittebene» in der Resultatgruppe, das 3D zeichnet beide Ebenen nicht. Zweiter Anlauf («du hast das mit dem button verformung falsch verstanden. dieser soll unten zu den andern buttons und der schnitt botten soll weg und die info zum schnitt auch, da dieser nicht vorhanden ist beim stabmodell»): «δ» steht in der **unteren Leiste** (`v-verformt`) und tauscht dort mit dem Knopf zum Nachweisschnitt (`untereLeiste`); die Anzeige «Schnitt x = … · Feld …» bleibt im Stabwerk leer. Die Anschrift der Figur steht in drei kurzen Zeilen. «mach die in der gleichen grauen farbe wie den anker»: die Symbole der Tragwerkskacheln im Grau `--on2` |
| Optionen → Rechenmodell im Stabwerk (30. Sept.) | «der eintrag rechenmodell unter optionen macht so nicht wirklich sinn da man diese nur beim modell balken nutzen kann». Gemessen (J90/20 m mit zwei Hängestützen und Jochaufsatz, Stabwerk, jede Wahl): Torsionsverlauf, Torsion auf die Ebenen, Überlagerung je Blechebene, Querkraft auf die Gurte, Spannung im Winkel, Knotenbereich, Endfeldzuschlag, schiefe Biegung ändern keine Stelle - im Stabwerk ausgeblendet (`OPTIONEN_NUR_ERSATZBALKEN`), ein Satz sagt es. **Hebelarme, Herkunft der Blechbreiten, Ausrichtung OG/UG wirken auch im Stabwerk** (sie bauen die Geometrie; Joch η 0.567 → 0.520 bis 0.610) und bleiben |
| Reaktionskräfte am Einzelmasten (30. Sept.) | «warum kann ich hier nicht den reaktionskräfte output generieren bei masten ohne joch?» - der Einzelmast hat einen eigenen Reiter Auflager (`zeichneMastfuss`), der Block hing nur am Joch; jetzt `reaktionsBlockEinfuegen` in beiden. Das Blatt im Export ging schon |
| Gebrauchstauglichkeit neu geordnet (30. Sept.) | «diese aufteilung macht wenig sinn, man sollte die beiden grenzwertbetrachtungen aktiv inaktiv schalten können. oder zu oberst den kompletten gebrauchstauglichkeitnachweis. hinzu kommt noch die mastverdrehung 5° als dritte prüfung. dazu noch die eingabe der relevanten höhe … (fahrdraht / Tragjoch / Ausleger oder selbst eingegeben höhe) … unter gebauchstauglichkeit in der sidebar übersicht aufführen und umschaltbar machen». Auf Rückfrage: **Oberschalter + drei** (Nachweisgruppen `gebrauch`, `fahrdrahtQuer`, `spitzeMast`, `verdrehungMast`; `unterVon` bindet sie an den Oberschalter), Grenzwert je Prüfung auf ihrer Zeile (`gzgGrenzeFahrdraht` mm, `gzgGrenzeSpitze` L/n, `gzgGrenzeVerdrehung` °, Vorgaben 40 / 100 / 5); **Verdrehung um die Mastachse** unter **Betriebswind ψ 0.70**, nur aus dem Stabwerk (Knotenverdrehung um z, linear im Abschnitt, ohne Wölbkrafttorsion = sichere Seite; `mastVerdrehung`), der Ersatzbalken sagt «nur aus dem Stabwerk»; **Referenzhöhe** `gzgReferenz` = auto / fahrdraht / ausleger / joch / eigen (`fdHoehe`), in den Optionen und im GZG-Block der Übersicht, **Schieber unter Masten weg**; fehlt die gewählte Stelle, gilt die Automatik mit Hinweis (`ersatz`); alte Stände mit Höhe → «eigen». Ausgeschaltet bleiben Werte Auskunft. Gemessen J90/15.50 m (M1 mit Signal und NT-Ausleger): automatisch M1 Fahrdraht 3.55 m 7.4 mm, φ 0.865°; Jochauflager 10.5 m 45.7 mm, φ 0.378°; J90/20 m Standard M1 φ 0.188° auf 7.50 m |
| Anschlusshöhe unter dem Joch (30. Sept.) | «diese anschlusshöhe sollte unter der jochgruppe stehen und nicht beim masten»: `mastH`, `mastHZwei`, `mastHB` stehen in der Gruppe «Jochtyp und Geometrie» (`gruppeAus`), beim Tragausleger wie bisher unter dem Ausleger |
| Nachweiskacheln gegengerechnet (30. Sept.) | Frage «sind die stäbe nicht zu weich … ich war mir nicht sicher ob die verdrahtung richtig ist»: jede Kachel = ihre Quelle auf die dritte Stelle, Handrechnung M1 η ≈ 1.41 (Kachel 1.422); plausibel, weil Wind längs den HEB 260 mit Steg in der Jochachse um die schwache Achse biegt. Befund: Ende B erbte die Mastnummer - behoben (`MASTFELDER` eigen) |
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

**8. Oktober 2026** · ⚠ **Sechs Commits sind örtlich und warten auf den Befehl zum Pushen** («Gespreizte Masten DGP», «Windlasten auf Joch und Mast von Hand») (Weisung 8. Oktober: «auf befehl push warten, ich will zuerst den stand der momentan vorhanden ist weitergeben und testen»); `origin/main` = `5dc0ef6`. `Versand/` (Datenpaket, Einzeldatei, COM_Bruecke) ist der Stand von `5dc0ef6` und wird erst mit dem Push nachgezogen. Davor: alles gepusht, auch der Stand zum Statikbericht über COM (Weisung 8. Oktober, nach dem Bugreport zur Brücke: «alles offene nachführen und dann pushen» - hebt «nicht pushen» vom selben Tag auf). Der Statikbericht ist weiter in Arbeit (siehe *Laufende Arbeit* und INITIALPROMPT.md). · Prüfstand 7035 Kontrollen grün (am Arbeitsrechner, örtliche Daten; Datenpaket `Versand/Vierendeel_Datenpaket_2026-10-08.json` und Einzeldatei `Versand/vierendeel_tool_2026-10-08.html` sind aktuell, die COM-Brücke in `Versand/COM_Bruecke` gleich `com/`) · `durchlauf.mjs`
ohne Bruch · vier Tragwerksarten (Joch, Einzelmast, Mast mit Tragausleger,
Abfangjoch) · Projektablage mit Einlesen/Ausleiten · COM-Brücke baut und
rechnet (Rechnen nur auf Anweisung).

Letzte Schritte (neueste zuerst; ältere stehen im Git-Verlauf):
- **8. Okt., Blatt Bestandesschutz (neue Teile rot, Auswahl Gesamt / Joch / Mast / Fundamente); Jochanschluss als Resultierende oder Einzelgurte** (Prüfstand 228, 258; örtlich, nicht gepusht).
- **8. Okt., Mastwind je Mast von Hand, «Tabellenwerte» setzt Joch und Masten zurück** (Prüfstand 260; örtlich, nicht gepusht).
- **8. Okt., gespreizte Masten DGP gebaut, örtlich committet, NICHT gepusht** (Prüfstand 259; siehe *Entschieden*). Davor der Gittermast IV 45 UL 17.7 in AxisVM aufgebaut (nur gebaut): 347 Knoten, 461 Stäbe, Gurt L 100x100x12 mit Fläche +0.0 %.
- **8. Okt., Gittermast IV 45 UL nach der Detailzeichnung berichtigt; Einheitswind-Nachtrag** (Lampen alt, alte Abfangjoche ohne Zuschlag, Gittermast 1.52 kN/m²; siehe *Entschieden*).
- **8. Okt., Einheitswind: Werte der Mast-Mappe als EK0 in der Datenbasis** (Prüfstand 209, 210; siehe *Entschieden*). Davor die Datei des Anwenders (J80-alt, 21 m, drei Gittermasten) in AxisVM aufgebaut, nicht gerechnet: 2277 Knoten, 2861 Stäbe, ohne Abbruch, keine verschmolzenen Knoten (Bericht in `bugs/`).
- **8. Okt., COM-Brücke: Abbruch bei jedem Start behoben und gepusht** (Bugreport eines Anwenders; Schalter `-Bericht` gegen Variable `$bericht`, jetzt `-Statikbericht`; siehe *Entschieden*). Die Datei des Anwenders ist in AxisVM nicht gebaut.
- **6. Okt., Teile am Masten an Abfangjoch und Tragausleger, Hebel der Jochteile am Abfangjoch, Blech-Diagonale** (Prüfstand 236, siehe *Entschieden*). Davor der Stand der Cloud-Sitzung vom 4. Oktober eingespielt (`git pull`); der Prüfstand fiel hier an einer Kontrolle am Quelltext, die LF-Zeilenenden erwartete - `APP_QUELLE` nimmt die CR heraus (Windows checkt mit CR LF aus, `core.autocrlf`).
- **4. Okt., Signalbauer mit Bildkacheln und Knopf «Signal zusammenstellen»** (Prüfstand 235, siehe *Entschieden*).
- **4. Okt., Signalkacheln mit Fläche längs / quer und Masse in der Fusszeile.** Im Wortlaut: «kannst du bei den signalen jeweils noch klein in der fusszeile die fläche längs / quer und das gewicht aufführen, so hat man die möglichkeit bei ähnlichen signalen, die vielleicht nicht aufgeführt sind eine auswahl zu machen.» Je Kachel «A längs … · quer … m²» und «… kg» (je Stück, aus der Tabelle `signalteile`, keine Zahl im Code; `sig-werte`, app.dialoge.js). Masse statt G in kN, wie die Tabellen des Bauers und die Mappe. Im Browser (Betreiberdaten): 26 Kacheln mit Fusszeile, gleich hoch, Werte = Titel. Prüfstand 235.
- **4. Okt., Stabwerk: Gurt am Anschnitt; «beide» ohne Träger ab Jochachse; Sprung der Seitenleiste behoben** (Prüfstand 234, siehe *Entschieden*).
- **4. Okt., Befestigung am Joch schaltet wieder; Anbauteile am Tragausleger im 3D anklickbar** (Prüfstand 233, siehe *Entschieden*).
- **4. Okt., Tragausleger: Kette der Anbauteile in der verformten Figur statt Diagonale** (Prüfstand 231, siehe *Entschieden*).
- **4. Okt., Tragausleger: Wind auf Mast und Ausleger im 3D** (Prüfstand 233, siehe *Entschieden*).
- **4. Okt., Löser: Dreibein schräger Stäbe ohne lcsZ berichtigt; Kette am Ausleger geklärt (nicht gebaut)** (Prüfstand 232, siehe *Entschieden*).
- **4. Okt., Tragausleger: Fahrdraht in der verformten Figur und im GZG-Nachweis** (Prüfstand 231, siehe *Entschieden*).
- **4. Okt., Schalter «Bestandesschutz» unter Lasten und über der Anbauteilliste** (Prüfstand 230, siehe *Entschieden*).
- **4. Okt., Gittermast: Rippen nur seitlich, UL-Rohr mit zwei Wanddicken** (Prüfstand 226, 229, siehe *Entschieden*).
- **4. Okt., Lauf mit den Betreiberdaten; Einzellastfall aus dem Stabwerk; Bestandesschutz; Halterippen
  eingetragen; COM geprüft; Stand auf `main`** (Prüfstand 222, 227, 228, siehe *Entschieden*).
- **4. Okt., Gittermast: Rohr an den Halterippen** (Prüfstand 226, siehe *Entschieden*): Feld
  `rohr.halter`, Modell mit Schott je Rippe; gemessen am erfundenen Gittermast der Testdaten. Die
  Höhen der Betreibertypen stehen seit dem Lauf mit den Betreiberdaten örtlich in `data/masten.json`.
- **4. Okt., Starrglieder der Anbauteile im Modell direkt** (Prüfstand 221, siehe *Entschieden*): je
  Teil mit Knick 2-3 Stäbe weniger, Rechnung gleich bis aufs Rechenrauschen. In einer Cloud-Sitzung
  gebaut: ⚠ `node pruefung.mjs` mit den Betreiberdaten steht aus, ebenso der Blick im Browser.
- **3. Okt., Gittermast im Stabwerk, mit PyNite und AxisVM geprüft** (Prüfstand 207, siehe
  *Entschieden*). Im Browser (Prüfseite, gelöscht): Gittermast am J90/20 m gewählt, Länge 14.29 m
  gesetzt, Fachwerk im 3D aus dem Stabwerk gefärbt, Kacheln Gurt / Blech / Rohr / Diagramm,
  Profiltafel und Bericht (Abschnitte je Teil, Kontrolle nach dem Bemessungsdiagramm). Am
  rechteckigen Typ mit der breiten Seite quer zum Gleis: Gurt 1.005, Diagramm-Kontrolle 0.966.
  Der Einzelmast mit Gittermast ist im Browser nicht eigens angesehen (Prüfstand: gefärbt).
  AxisVM lief zweimal (nach jedem Lauf geschlossen). Gepusht.
- **3. Okt., Ausleger am Jochmasten im Stabwerk, M1 ziehen, Arm in der
  Höhe, Schwenk aufs Ganze** (Prüfstand 203, siehe *Entschieden*). Im
  Browser (Prüfseite, gelöscht): Ausleger an M2 gesetzt, Schiene UPE 0.27 /
  Bl 0.14 / Se 0.49 / M2 1.18 aus dem Stabwerk, kein «Ersatzbalken»; der
  Schwenk mit Zwischenbildern. Das Ziehen von M1 und des Arms im 3D selbst
  nur am Prüfstand, nicht mit der Maus geprüft. Gepusht nach dem
  Seilausfall (Durchgang ohne Befund).
- **3. Okt., Anbauteil-Katalog bereinigt** (Prüfstand 202, siehe
  *Entschieden*). Im Browser die Skizzen aller 20 Vorlagen angesehen
  (Probeseite, gelöscht). Der Durchgang meldet seither einen Befund
  (siehe *Offene Punkte*) - deshalb nicht gepusht.
- **3. Okt., Tragausleger am Jochmasten: ein Mast** (Prüfstand 201).
  Gemeldet: «wenn ich einen tragausleger an einen jochmasten setze, habe
  ich zwei masten übereinander anstatt das sich der vorhandene verlängert
  und der ausleger dann direkt dran hängt.» Verlängert wurde er schon
  (`auslegerMastAnbau`, eine Länge je Mast), aber `auslegerSzene` las den
  Zeichenplan (`mastZeichenplan`) nicht und baute den Masten immer selbst -
  zwei Körper, zwei Titel. Jetzt reicht app.js den Plan an beide Wege
  (gewählt, nebenan); sagt er nein, hängt der Ausleger nur an der Achse
  (Bezug bleibt, Warnung «Mast zu kurz» bleibt). Im Browser (Prüfseite,
  J90/20 m, Ausleger 13 m an M2 → 14.00 m): Ausleger gewählt ein Mast M2
  gefärbt, Joch grau daneben; Joch gewählt ein Mast M2 bis 14.00 m, Ausleger
  grau daran. Dazu gemeldet, die Mastabschnitte im 3D seien nicht zu sehen:
  der Browser lief noch auf der Fassung vom 2. Oktober (vor dem Laden);
  nach dem Neuladen in Ordnung («in der app funktioniert es»).
- **3. Okt., Anbauteile: Symbolkacheln, Suche, Filter** (Prüfstand 197):
  Skizze je Vorlage aus ihren Bausteinen (`ui.anbausymbol.js`), Suchfeld
  (Wortanfänge, ohne Umlaute, auch Bausteinnamen; Enter setzt den ersten
  Treffer), Filter alle / Joch / Mast; Farbpunkt und Legende entfallen.
  Danach (Prüfstand 198): beim «Bauteil setzen» öffnet ein Fenster an der
  geklickten Stelle (`setzWahlZeigen`, app.setzen.js) mit Suche im Fokus,
  «Zuletzt verwendet» (localStorage `tragjoch-zuletzt-vorlagen`, nur was an
  die Stelle passt) und Symbolkacheln nach Rolle; Enter setzt den ersten
  Treffer. Zuletzt (Prüfstand 200) die Bausteinwahl in der Karte: Knopf
  mit der Wahl öffnet ein Fenster mit Suche und den Gruppen der Liste;
  die Liste bleibt verborgen (Regeln, `change`, Rückgängig unverändert).
  Die Erklärsätze der Karte stehen ganz eingeklappt als «Hinweis mehr»
  (`hinweisHtml(…, { zu: true })`). Damit ist der Entscheid vom
  3. Oktober umgesetzt.
- **2. Okt., Endfeld am Stoss in der Reihe** (Prüfstand 195, siehe
  *Entschieden*): Spalt 10 cm im Joch statt Schieben in der Ausleitung.
- **2. Okt., Joch ohne Masten: Lagerung einstellbar; Anbauteile alle
  aus / ein; Resultierende/Einzelgurte; Befestigung als Knopfreihe;
  Datenpaket in IndexedDB; Teile am Masten ab der Mastachse** (Prüfstand
  188-194, siehe *Entschieden*). Gepusht.
- **2. Okt., Jochlänge auf die Standardlänge, Rest als Kragarm**
  (Prüfstand 187, siehe *Entschieden*).
- **2. Okt., Mast im Stabwerk alle 0.5 m ausgewertet, 3D-Werte ohne
  Streifen, Berechnungstest mit Bericht/AxisVM/Reaktionen** (Prüfstand
  186, siehe *Entschieden*). Gepusht auf Weisung «pushen wenn es eine
  funktionierenden stand erlaubt».
- **2. Okt., Mast im 3D ziehen** (Lage, Fuss, Kopf; Prüfstand 185);
  davor Reaktionsblatt und 3D-Werte schlichter, Lastfallnamen quer/längs
  zum Gleis, Hinweistext nach Vorlage, U-Profile in AxisVM aus dem
  Normumriss, Profiltafel mit Blechen und Pos (siehe *Entschieden*). Im
  Browser über eine Prüfseite (gelöscht). Nicht gepusht.
- **2. Okt., Profile nach Norm gezeichnet und gegen die Datenbasis
  nachgerechnet** (Prüfstand 50, 184; `vergleich_profile.mjs`, siehe
  *Entschieden*). Normradien in `data/normen.json`, UPE-Radien
  berichtigt, Datenpaket neu in `Versand/`. Im Browser über eine
  Prüfseite (gelöscht). Danach L 45x45x5 berichtigt, dann auf Weisung
  alle Querschnittswerte aus dem Normumriss (J130/30 m Blech +2.0 %),
  zuletzt die UNP der Anker in die Profiltabelle. Nicht gepusht.
- **2. Okt., Profile: Querschnittsklasse und Fussnaht am Masten,
  Profilblatt mit Kenndaten und Schnitt** (Prüfstand 184, siehe
  *Entschieden*). Im Browser über eine Prüfseite mit abgeschaltetem
  Speicher geprüft (danach gelöscht). Nicht gepusht.
- **1. Okt., Bericht und Excel auf dem Stabwerksweg, Berichte für
  Abfangjoch und Tragausleger, Bindeblech mit Schub** (Prüfstand 183,
  Entscheide siehe *Entschieden*). Alles bis hierher gepusht
  («alles pushen und bereit machen für den account change»).
- **1. Okt., kleine Befunde abgearbeitet** (Reihenzeile, Höhe im Dialog,
  Ankerfang, Mastlänge im Namen, Ankerfuss mit einem Gelenk, serve.py;
  Prüfstand 182, siehe *Entschieden*); danach der Mastdialog.
- **1. Okt., Jochreihe: Zwischenmast schieben und Kragarm** (Prüfstand
  181, Entscheide siehe *Entschieden*).
- **30. Sept., Blattmodell verfälscht bei Einzelmast und Kragarm-Joch am
  selben Masten** (Prüfstand 175). Gemeldet mit einem Beispielblatt: «beim
  export der reaktionskräfte und beim aufbau in axis war der modellaufbau
  verfälscht». Drei Befunde in `stabmodellBlatt` (export.axisvm.js), alle
  behoben: (1) der Höhenversatz las beim Einzelmasten das verborgene
  `mastH` (7.50) statt der Länge, die sein Modell benutzt (2.50) - das Joch
  daneben stand 6 m zu tief (`bezugshoehe`); (2) ein Tragwerk ohne
  gemeinsamen Masten legte seine Jochachse auf die Blattnull statt auf den
  gemeinsamen Boden - zwei Joche mit H 1.50 m standen 1 m versetzt;
  (3) fielen zwei Mastknoten zusammen (Kopf des Einzelmasten, Kopf des
  Jochmasten), entstand ein Stab der Länge null und der Löser gab NaN
  ohne Meldung - jetzt zusammengelegt. Dazu zählen die Anschlussknoten
  (`MAST_M1k…`) zur Mastlage, der geteilte Mast bleibt gerade. Gemessen am
  Blatt des Auftraggebers M1 M_q 14.34 → 19.53, M_l 17.98 → 8.86, M2 M_q
  11.15 → 4.55 kNm; im erfundenen Fall M_q M1/M2 4.01 / 4.41 → 7.13 /
  6.87 kNm (vorher unsichere Seite). Danach auf Rückfrage «Stützweite
  eingeben» und «Übergehen» (siehe *Entschieden*); mit beiden am Blatt des
  Auftraggebers: M1 V 11.23, M_q 19.48, M_l 9.02; M2 12.86 / 4.97 / 11.04;
  M3 7.35 / 13.49 / 4.81; M4 6.65 / 3.93 / 5.24 kNm.
- **30. Sept., verformte Figur im 3D; Reaktionskräfte am Einzelmasten**
  (Prüfstand 173, siehe *Entschieden*). Im Browser geprüft (eigener Tab,
  Speichern abgeschaltet). Nicht gepusht.
- **30. Sept., Gebrauchstauglichkeit neu geordnet, Anschlusshöhe unter dem
  Joch, Kacheln gegengerechnet, Markierung mit Esc** (Prüfstand 170-172,
  siehe *Entschieden*). Im Browser in einem eigenen Tab geprüft; auf
  Weisung «abschluss und push» gepusht.
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
3. ~~**Nachweise:** die Abbildungen und Schnittgrössen des Lösers übernehmen,
   Bericht und Excel auf den Stabwerksweg, Bericht auch für Tragausleger und
   Abfangjoch.~~ — **erledigt am 1. Oktober** (siehe *Entschieden*); das
   Knicken rechnet seit dem 28./30. September mit den Kräften des Stabwerks.

**Laufende Arbeit (8. Okt.): Statikbericht über COM - in Arbeit, seit dem 8. Oktober gepusht (siehe *Entschieden*, «COM-Brücke brach bei jedem Start ab»).** Weisungen im Wortlaut:
«kannst du auch mit hilfe der abhandlung com ein template für einen statikbericht generieren lassen. so
viel wie nötig an plots generieren lassen.» (7. Okt.), «berichtsetzung testen.» und «den neuen stand nach dem
abchlusss des berichtbauers nicht pushen.» (8. Okt.). Gebaut: `Bericht-Erzeugen` in
`com/AxisVM_aufbauen.ps1`, Schalter `-Statikbericht` / `-BerichtVorlage` (com/LIESMICH.md), Plan aus der App
(`berichtPlan`, Feld `bericht` der Modelldatei). Vier Testläufe (auf Anweisung) an
`com/AxisVM_Bericht_J90_20m.json`: (1) Abbruch beim Start - der Schalter hiess `-Bericht` wie die Variable
`$bericht` (Pfad der Berichtsdatei; PowerShell unterscheidet die Schreibweise nicht) → umbenannt; dabei auch
der Fehlerweg, der `Warte` vor seiner Definition rief. (2) Modellansichten als Zeichnung und EMF gingen,
Ergebnisanzeige nicht. (3) **`SetStaticDisplayParameters_V181(Index, RExtendedDisplayParameters_V181,
KombiNr, LoadLevel, Int32[])`** trägt (Typbibliothek; die Referenz nennt den Satz _V153), 30 von 30
Zeichnungen - aber perspektivisch verzerrt am Rand, Auflagerkräfte Max/Min 0. (4) Mit `Model.FitInView()`,
Ansicht vorn und Werten (WriteValuesTo) ist M_y richtig (Wind +y: 0.887 / −0.967 kNm) - dann **AxisVM-Absturz
nach der 9. Zeichnung** («RPC-Server nicht verfügbar»). Nächste Schritte: Absturz eingrenzen; Komponente der
Auflagerkräfte klären; Bericht nur mit Vorlage .rep (Auftraggeber). Bilder in `com/Images_<Modell>/`
(gitignoriert).

**Gittermast: gebaut (3. Okt.).** Etappen 4-7 erledigt (Stabmodell, 3D, Nachweise je Stab mit
Diagramm-Kontrolle, COM-Ausleitung; PyNite und AxisVM gegengerechnet) - siehe *Entschieden*.
Was offen bleibt, steht unter *Offene Punkte*. Der Text darunter ist der Weg dorthin.

**Laufende Arbeit (3. Okt.): Gittermast (kombinierter Mast).** Entscheide in
*Entschieden*. Etappen: (1) Daten - gelesen aus den Scans, in
`Versand/kombinierte_masten_daten.md`; dem Auftraggeber zur Bestätigung
vorgelegt (Annahmen für die zwei Typen ohne Detailzeichnung: Teilung und
Breiten wie beim Typ mit Zeichnung, Bleche = Breite − 2 · Schenkel, Kopfmass
des langen Typs offen) - **bestätigt am 3. Oktober («annahmen ok»)**.
(2) AxisVM-Modelle ausgelesen (`com/AxisVM_modell_lesen.ps1`, nur lesen,
auf einer Kopie; Ergebnis in `Versand/kombinierte_masten_axisvm_*.json`):
vier Gurte als Stabzüge, Lager an den vier Gurtfüssen, Bleche als Stäbe auf
vier Seiten, Teilung im Modell vereinfacht, das Rohr läuft im Oberteil und
ist über kurze Glieder an die Gurte gehalten. Querschnitt je Linie, Lasten
und Freigaben gingen über COM nicht durch. (3) **Sortiment gebaut
(3. Oktober, Prüfstand 206):** dritte Liste `gittermasten` in
`data/masten.json` (Sicherung `masten_vor_gittermasten_2026-10-03.json`),
vier Typen (zwei nach Detailzeichnung, zwei abgeleitet), je Typ Gurte,
Teilung, Aussenbreiten an den Stationen, Bleche, Rohr; `AUFBAU.masten`,
Katalogabschnitt «Gittermasten» (15 Abschnitte), Zugriff und
`gittermastGeometrie` in data.masten.js (Stationen mit Höhe, Aussenmass,
Gurtachse, Blechlänge = Breite − 2 · Schenkel). Zwei Winkel neu in
`normen.json` (aus dem Normumriss; einer davon ungleichschenklig). Gegen
die Stücklisten: beim quadratischen Typ treffen alle Blechlängen, beim
rechteckigen beide Richtungen. **Befund:** der lange abgeleitete Typ ist
RECHTECKIG (in einer Richtung über die ganze Höhe verjüngt) - die Annahme
«Breiten wie der gezeichnete Typ» galt nur für die andere Richtung; die
Geometrie führt deshalb auch im Oberteil veränderliche Breiten
(`breiteAOben`). Sein Mastaufsatz ist offen (ohne Rohr). **Der Mast ist
noch nirgends wählbar** - nächster Schritt ist (4) das Stabmodell. (3) Sortiment in `data/masten.json` (Tabelle
Gittermasten, Winkel in `normen.json` prüfen). (4) Stabmodell: vier Gurte
nach innen, Bleche auf vier Seiten, konisch, Rohr oben eingespannt; als Mast
in Einzelmast und Joch. (5) 3D-Bild. (6) Nachweise je Stab + Diagramm-Kachel.
(7) Ausleitung. Noch nichts am Code.

**Laufende Arbeit (2. Okt.): Bauteile bereinigen über markierte Querprofile.**
Der Auftraggeber markiert Pläne in `Grundlagen/QP` (PDF-XChange, Präfixe
`Tragwerk:` / `Bauteil:` / `?`). Nächster Schritt: `python3 qp_markierungen.py`,
dann je Markierung Planbezeichnung ↔ Vorlage der Anwendung ↔ Befund (passt /
fehlt / doppelt / anders benannt) als Tabelle nach `Versand/`, gemeinsam
durchgehen, Änderungen an `data/*.json` nur mit Freigabe und Sicherung.
Stand: Legende und Beispiel 1 (Kursaufgaben S. 1) in `Versand/qp_beispiele/`;
Rückfragen zu Beispiel 1 beantwortet (siehe *Entschieden*; Bündel an der
Doppelklemme, `E` ignorieren); offen noch die FL-Spannweite (Plan nennt
keine). Regel fürs Einlesen: was nicht zuzuordnen ist, fragt nach
(manuell zuweisen oder Vorschlag übernehmen). Der Vorschlag, wie das
QP-Einlesen an «Zeichnung hinterlegen» und «Bauteile setzen» anschliesst,
ist dem Auftraggeber am 2. Oktober vorgelegt und angenommen: «Schritten 1–3
für Masten und Joch anfangen und die Anbauteile danach dazunehmen».

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

- ⚠ **Einheitswind, Lesarten zu bestätigen** (8. Oktober): J…-alt wie J…; Gittermast 1.52 kN/m² aus den Tragjochen. Bestätigt am selben Tag («lampen zuordnung passt, leiter mit mappenwert belassen»): Lampe alt 0.3 / alt + Befestigung 0.5 kN; Leiter mit Wert der Mappe bleiben bei diesem.
- ⚠ **Gespreizte Masten (DGP), offen** (8. Oktober): (a) Brücke `AddT` in AxisVM nicht erprobt - ein Aufbau nur auf Anweisung; (b) Wind wie am Walzprofil angenommen (auch quer zur gespreizten Seite); (c) kein Knicken als Vollstab; der Kern (vorläufige Anzeige, Rechenverfahren «Ersatzbalken») rechnet das ungespreizte Walzprofil; (d) Zuordnung DG2a / DG3a nach Stegrichtung ist meine Lesart; (e) Mastlänge ausserhalb des Sortiments wird nicht gemeldet (nur «zu kurz für die Spreizung»); (f) das Profilblatt zeigt das Walzprofil, nicht die Spreizung; (g) am Abfangjoch und Tragausleger nicht geprüft; `durchlauf.mjs` und die Testdaten führen keinen gespreizten Masten; (h) nach dem Push: `node datenpaket.mjs`, Einzeldatei und `Versand/COM_Bruecke` nachziehen.
- ⚠ **Gittermast IV 45 UL:** Mastaufsatz weiter aus der Übersicht (180 × 180 × 6); am Knick im Modell ein Blech 50×12 statt zweier 50 mm breiter; nicht im Browser angesehen, nicht in AxisVM gebaut.
- ⚠ **Aus der Liste vom 6. Oktober, offen (Rückfrage):** (1) **«Traverse und Fahrdraht in Y versetzt, grosse Verformungen, da Ecke nicht biegesteif»**: nicht nachgestellt (Joch: Leiter am Jochaufsatz y 0 → 1.0 m, Weg 249.9 → 252.1 mm; Mast-Traverse 71.8 → 73.4 mm) - wo gesehen (App/AxisVM, welches Tragwerk)? (3) **Tragwerke vergleichen (Bestand / Bau / Projekt)**, (5) **Leiter in Gleisquerrichtung → Schaltposten → Tragjoch mit Schaltposten-Ausbau**: Umfang zu klären. Entschieden und gebaut: Datenbank nicht pushen, Faktor 0.74 auf allen Wind, Fussversatz am Abfangjoch; Fundamentablauf, Gelände über 14° und Doppelanker (7. Oktober, *Entschieden*).
- ⚠ **Tragausleger: Verdrehung unter Wind längs** (4. Oktober beobachtet, L 10 m, Hängestütze mit NT-Ausleger): rund 0.17 rad charakteristisch, der Fahrdraht wandert 0.45 m in Gleisrichtung. Nachgewiesen wird nur die Seitenlage quer (17 mm, η 0.43). Ob die Verschiebung längs oder die Verdrehung einen Grenzwert braucht, ist zu entscheiden. Die Kette am Ausleger ändert daran nichts (gemessen).
- ⚠ **Rückfragen vom 4. Oktober (offen):** (1) ~~**UL-Rohr über die Kopfplatte**~~ - gelesen und gebaut (Zeile «Rohr an den
  Halterippen»); Höhen eingetragen; seit dem 4. Oktober halten die Rippen nur seitlich, am Kopf ist das Rohr verschraubt. ~~(2) «u120»~~ = J120-alt, bestätigt.
  ~~(3) Bestandesschutz-Kachel~~ und ~~(4) Einzellastfall aus dem Stabwerk~~ gebaut (siehe *Entschieden*). Zurückgestellt: AxisVM-Lauf Beispiel B; Verdrehung der Signale um die Jochachse.
- ⚠ **Einheitlichkeit der Tragwerksarten** (Durchsicht 3. Oktober, nachgezogen 4. Oktober auf «so weit wie sinnvoll
  vereinheitlichen»; Stabwerk, Nachweiskacheln, Bericht, Excel, Reaktionsblatt, verformte Figur, Anker und COM-Datei des
  Blattes haben alle vier): ~~(0) rechte Schiene am Abfangjoch~~; der Plot «w» überall aus dem Stabwerk; ~~(a) 3D-Färbung~~
  bei «umhüllend» jetzt an allen Arten aus dem Stabwerk (der Walzprofil-Einzelmast seit dem 4. Oktober); ~~(b) Verläufe~~ aus
  dem Stabwerk an allen Arten (Einzelmast nur Masten; ⚠ am Tragausleger ungeprüft, die Testdaten führen keinen); der Reiter
  **Schnitt** steht seit dem 29. September nur beim Ersatzbalken; ~~(c) Einzellastfall~~ seit dem 4. Oktober aus dem Stabwerk (Kacheln, Bild, Schiene);
  (d) **SAF, DXF, PyNite** nicht für Abfangjoch und Gittermast (eigene Ausleitungen, nicht angefasst); ~~(e) Knicken~~ liest
  die Anzeige seit dem 30. September an jedem Masten aus dem Stabwerk (`h.knick`; gemessen 4. Oktober, Testdaten: Abfangjoch
  M1 0.1523 Stabwerk gegen 0.3578 Kern, Kachel «Knicken M1 · Stabwerk» am Einzelmasten); ~~(f) nur das gewählte Tragwerk ist
  gefärbt~~ (seit dem 4. Oktober alle aus dem Stabwerk); (g) Kragarm und Stoss nur am Tragjoch (sachlich so).
- **Wind nach der Norm für Gittertragwerke** (Joche +21-41 % gegen die Tabelle, gerechnet am 3. Oktober):
  verworfen, der Auftraggeber prüft die Normwerte selbst; die Tabelle des Betreibers gilt.
- ⚠ **Gittermast, offen** (3. Okt.): (a) Wanddicke des Mastaufsatzes am langen Typ nach einem anderen
  Typ angesetzt (im Sortiment vermerkt); (b) Mastlänge je Typ fest (entschieden 3. Okt.); die UL-Ausführungen der Typen ohne Aufsatz (längere Rohrkonstruktion mit zwei Wanddicken) sind noch nicht im Sortiment - aufnehmen nur auf Weisung;
  (c) Schotte nur an Knick, Kopf, Fuss und wo etwas anschliesst - die Rippen der Zeichnung im
  Unterteil sind nicht erfasst; (d) kein Knicknachweis (weder Gurt zwischen den Blechen noch der
  Mast als Ganzes) und kein Fundamentnachweis (kein Standardtyp zugeordnet); (e) Gittermast am
  Abfangjoch und Tragausleger nicht gebaut; (f) SAF, DXF und PyNite-Ausleitung aus der App nicht
  mit Gittermast; `durchlauf.mjs` fährt ihn deshalb nicht; (g) der Ersatzbalken (vorläufige
  Anzeige, Rechenverfahren «Ersatzbalken») rechnet ihn als Vollstab mit dem Kopfquerschnitt;
  (h) weitere Typen des Katalogs nicht erfasst (auch II 30 UL, III 30 UL); der Wechsel der Wanddicke am UL-Rohr ist aus der Übersicht abgegriffen, nicht vermasst; das Spiel der Rippen wird nicht abgebildet (entschieden 4. Okt.). (i) ⚠ PyNite-Gegenprobe für den seitlichen Halt des Rohrs unzuverlässig (Torsion/Eigengewicht, siehe *Entschieden*); ein AxisVM-Lauf eines Gittermasts mit Rohr nur auf Anweisung.
- ~~Abfangjoch gegen AxisVM, Rest 6-20 %~~ - geklärt am 3. Oktober (starre Blechenden, siehe *Entschieden*); die
  Mastabweichung 11-14 % ebenfalls (Bindebleche der Druckstütze), Rest 2.9 %. Das berichtigte Blatt mit zwei Abfangjochen ist am
  4. Oktober in AxisVM nachgerechnet (Gurt, Blech ≤ 0.1 %, Mast M_y 2.7-5 % bei kleinen Werten). Einseitig abgefangener Leiter: halbe
  Spannweite (entschieden 3. Oktober). ⚠ `kalibrieren_abfang.mjs` (PyNite) liest dasselbe Modell und ist seither nicht neu
  gelaufen. ~~Klemmzonen der Anbauteile am Tragjoch~~ - geklärt am 4. Oktober (AxisVM verschmolz
  deckungsgleiche Knoten zweier Anbauteile; mit derselben Verschmelzung stimmt der Löser auf 1-2 %). ⚠ Die entflochtene
  Datei des Beispiels B ist in AxisVM nicht neu gebaut. ⚠ Frühere AxisVM-Modelle mit zwei Anbauteilen an derselben Stelle
  (z. B. Hängestütze und Kettenwerk) trugen dieselbe Verschmelzung - Vergleiche daran sind nicht nachgemessen.
- ⚠ **Schubverformung der Bindebleche:** die Anwendung rechnet sie (Entscheid 25. Sept.), AxisVM
  in den gebauten Modellen nicht. Am Gittermast macht das unter Torsion 21-39 % mehr Verdrehung;
  die Schnittgrössen der Gurte unterscheiden sich um wenige Prozent. Ob AxisVM mit
  Schubverformung gebaut werden soll, ist zu entscheiden.
- ⚠ **Ungleichschenklige Winkel in früheren AxisVM-Modellen** lagen um 90° gedreht (siehe
  *Entschieden*, Gittermast im Stabwerk). Betroffen sind Modelle mit dem Untergurt L 120x80x12;
  Vergleiche daran sind nicht nachgemessen.
- ~~Tragausleger kurz mit Fahrdrahtabzug: ein Seil gedrückt~~ - erledigt 3. Okt. (Seile nur auf Zug, siehe *Entschieden*). Bisher: (3. Okt.,
  `durchlauf.mjs` meldet es). L 6 m, Hängestütze mit Fahrdrahtabzug bei
  L − 0.65: `AUFHAENGUNG_N` −0.24 kN unter «Ständig + Wind −y»; mit der
  früheren Vorlage (Kettenwerk mit Gewicht) und mit `hs-nur` kein Druck.
  Linear gerechnet; das Seil hinge real durch. Wie damit umgehen (Hinweis,
  Durchgang auf Kettenwerk, nichtlinear), ist zu entscheiden.
- ~~Lastgenerator setzt je Gleis `hs-fahrdraht`~~ - erledigt 3. Okt. (Variante B). Bisher: **Lastgenerator setzt je Gleis `hs-fahrdraht`** (Vorgabe in
  ui.schema.js) - seit dem 3. Oktober nur noch den Fahrdrahtabzug ohne
  Kettenwerk. Ob er zusätzlich «Kettenwerk N-FL» setzen soll, ist zu
  entscheiden (Achtung: Fahrdraht nicht doppelt umlenken).
- ~~Jochaufsatz einfach: Höhen der Vorlage~~ - erledigt 3. Okt. (2 m / 4 m). Bisher: (Traverse z 2.00, Aufsatz
  z 1.00) weichen von Beispiel 1 ab (h 4.60 m, Traverse 3.82 m über der
  OG-Achse); doppelt und alt stehen jetzt nach den Plänen. Angleichen?
- ~~**Endfeld am Stoss in der Reihe**~~ - gebaut am 2. Oktober (siehe
  *Entschieden*). Offen dabei: der Mast im Kern steht am Gurtende (5 cm
  neben der Achse, im Blattmodell und 3D auf ihr); der Kragarm-Schieber
  am Stossende bleibt bedienbar, gilt aber nicht (Hinweis).
- ⚠ **Mast ziehen: Ende B ohne eigene Länge folgt Ende A** (2. Okt.). Gezogen am Kopf von M1 wurde M2 mitverlängert (bestehende Kopplung, gilt auch fürs Feld). Ob der Zug den Partner festhalten soll (seine heutige Länge eintragen), ist zu entscheiden.
- ~~**Profiltabelle gegen ihre Geometrie**~~ - erledigt am 2. Oktober:
  alle Querschnittswerte aus dem Normumriss (siehe *Entschieden*), 0 von
  246 Werten über 1 %. Der Befund davor, zur Nachverfolgung: **L 200x200x20**
  Schwerpunkt 5.52 gegen 5.683 cm (+3.0 %), W 196.82 gegen 199.11
  (Tabelle sicher); **L 120x120x12** W 42.21 gegen 42.73 (+1.2 %, sicher);
  **L 120x80x12** z_s/y_s 2.05/4.05 gegen 2.026/4.003 (−1.2 %), W_y 18.9
  gegen 19.14 (sicher). Im Sortiment der Tragjoche stehen davon nur
  L 120x120x12 und L 120x80x12.
- **Nächste Wünsche (30. Sept.; (1) bis (4) seither erledigt, siehe
  *Entschieden*):**
  (1) ~~Gebrauchstauglichkeit in den Optionen neu ordnen~~, im Wortlaut: «diese
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
  (2) ~~Querschnittsklasse und Fussnaht unter *Profile*~~ und
  (3) ~~Profilblatt mit Kenndaten und Schnitt~~ - gebaut am 2. Oktober
  (siehe *Entschieden*); seit demselben Tag nach Norm gerundet.
  (4) ~~Frage «ist es möglich ein verformtes modell darzustellen im 3d? oder
  kostet das zu viel performance? es wäre nur ein nice to have»~~ - gebaut
  (Schalter «δ»).
  Dazu offen aus der Sammelweisung: «+ Bauteil aus der Lasttabelle», «Fahrleitung als
  Auflager» nur mit Leiter, Signalbauer mit Bildern, Rückstellkraft der
  Leiter am Joch.
- **Tabelle der Reaktionskräfte (30. Sept.) - gebaut**, siehe *Entschieden*.
  Die Momente am Ankerfundament sind seit dem 1. Oktober weg (ein Gelenk
  am Fuss, siehe *Entschieden*).
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
- ~~Tragausleger am Masten eines Jochs wird im Stabwerk nicht gerechnet~~
  (erledigt 3. Oktober, siehe *Entschieden*). Bisheriger Wortlaut:
  **Tragausleger am Masten eines Jochs wird im Stabwerk nicht gerechnet**
  (Sperre in `reiheOhneStabmodell`: Aufhängung, Knicken und Fundament des
  Auslegers rechnet `rechneStabwerk` nur für den Ausleger allein). Setzen
  lässt er sich seit dem 30. Sept. per Kachel/Mastwahl, nach aussen
  gerichtet; gerechnet wird dann nur der Ersatzbalken. Den Ausleger in die
  zusammenhängende Gruppe aufzunehmen ist der nächste Schritt dafür
  (Befragung offen).
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
- ⚠ **Doppelmasten ohne Fundamentzuordnung:** DGP24 und DGP26 stehen in
  der Fundamenttabelle, aber das Sortiment führt sie nicht als Profil —
  ihre Fundamente (DG1a, DG2a, DG3a) sind nur von Hand wählbar.
- **Nachweisbericht:** die Systemskizze ist die Längsansicht des Modells,
  keine vermasste Zeichnung; ein Handbuchkapitel zum Bericht fehlt. Der
  Bericht des Stabwerks (1. Oktober) zeigt im Kapitel Schnittgrössen die
  Verläufe des aktiven Tragwerks; die Tabelle der Hüllen gilt allen.
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
- ~~Mastwind von Hand~~ - gebaut am 8. Oktober, je Mast und Richtung (siehe *Entschieden*).
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
  Ersatzbalken steht noch die Aufteilung im Reiter *Schnitt* (eingeklappt);
  **Bericht und Excel kommen seit dem 1. Oktober aus dem Stabwerk**.
  Drei Dinge dazu, noch nicht entschieden:
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
- ~~Geteilter Mast mit zwei verschiedenen Mastlängen~~ (1. Oktober): die
  Mastliste führt eine Länge je Mast, Rechnung und jetzt auch die Namen
  lesen sie dort; zwei Längen standen nur in veralteten flachen Feldern
  eines nicht gewählten Tragwerks.
- «Abfangjoch mit Mast rechnet unsichtbar nicht» liess sich am 17. September
  nicht nachstellen — beobachten.
- Gurtabschnitte als Starrkörper (Umlegung ihrer Streckenlasten) — nur auf
  Wunsch.

**Bedienung**
- Der Einzelmast des Durchgangs trägt weder Anbauteile noch Anker (2 Knoten,
  1 Stab) — genau die Stelle, an der zweimal etwas fehlte. Ein Fall mit
  Teilen am Masten wäre die bessere Wache.
- Rauchtest (A3): der erfundene Datensatz führt noch **keinen Anker**
  (das Abfangjoch seit dem 4. Oktober) — dieser Weg läuft nur mit den Betreiberdaten durch.
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
node pruefung.mjs           # Pruefstand, 7035 Kontrollen - muss gruen bleiben
node durchlauf.mjs          # Durchgang durch alle Wege je Tragwerksart
VIERENDEEL_DATEN=testdaten node durchlauf.mjs   # derselbe ohne Betreiberdaten (Rauchtest, CI)
node testdaten/erzeuge.mjs  # schreibt den erfundenen Testdatensatz neu
node datenpaket.mjs         # Datenstand aus data/ als Paket nach Versand/
node vergleich_profile.mjs [1]   # Profiltabellen gegen ihren gerundeten Umriss (nur > 1 %)
node vergleich_gittermast.mjs [<Typ>] [quer] [--axisvm]   # Gittermast: eigener Loeser gegen PyNite; --axisvm schreibt com/AxisVM_Gittermast_<Typ>.json
powershell -File com/AxisVM_modell_lesen.ps1 -Datei <modell.axs> -Aus <aufbau.json>   # AxisVM-Datei nur lesen (Knoten, Linien, Querschnitte, Lager)
python3 qp_markierungen.py [--ab JJJJ-MM-TT] [<pdf>]   # Markierungen in Grundlagen/QP -> Versand/qp_markierungen/
node modell_typen.mjs       # alle 14 Tragjoch-Typen pruefen (Riegel, Knoten, eta) und als com/AxisVM_Typen_alt/_neu.json zusammentragen
node modell_beispiele.mjs   # zwei Beispielblaetter (Abfangjoche mit Ankern; altes Joch auf Gittermasten) als com/AxisVM_Beispiel_A/_B.json
node vergleich_axisvm.mjs com/AxisVM_<name>.json [--ohne-schub] [--ausser-x 6,12:0.6]   # Loeser gegen AxisVM, Stab fuer Stab
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
* **AddU verwirft die Ausrundung** (gemessen 2. Oktober): U-Profile gehen als
  Normkontur über `KonturQuerschnitt`, mit Lagewache.
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
