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
  20. September, afcb590). Der Zweig `github-stand-vor-push` ist der alte, von Hand
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
| Jochreihe gesamtheitlich (19. Sept.) | «die zusammenhängenden jochtragwerke sind als gesamtheitliches tragwerk zu betrachten». Gewählt: **gekoppelt** (ein Stabwerk: Joche und Masten der Reihe, Mastköpfe verschieblich, jeder Mast mit den Kräften aller anschliessenden Joche); ständig, Wind, Schnee **gleichzeitig** auf der ganzen Reihe; **Havarie örtlich**: «dieser kann entweder auf die joche wirken und die kraft teilt sich dann auf die beiden masten, oder wenn es zu einem leiterbruch am masten kommt ist dann nur dieser selbst betroffen»; Seitenleiste mit **Urteil der Reihe** (Maximum mit Namen). **Auch das Einzeljoch** läuft künftig über das Stabwerk («ja einzeljoch auch übers stabwerk»), ein Rechenweg. Umsetzung offen, siehe *Laufende Arbeit* |
| Geteilter Mast, Sofortmassnahme (19. Sept.) | «ja sofortmassnahme zuerst»: bis zum gekoppelten Modell trägt der geteilte Mast die **Jochkräfte aller anschliessenden Tragwerke** im selben Lastfall (`core.nachbarn.js`, `rechensatzMitNachbarn`, in `mastLasten` als `nachbarjoch`); Mastköpfe starr. Havarie örtlich: der Nachbar nur ständig. Nachbar-Abfangjoch über Leiteinwirkung und Windrichtung zugeordnet |
| `MAST_UNVERSCHIEBLICH` (19. Sept.) | **entfällt im gekoppelten Modell** («mast_unverschieblich entfällt»); bis dahin bleibt er im Einzelfeld-Kern |
| Havarie je Leiter (19. Sept.) | «nur ein leiter [kann] im havariefall rissen», «als einzelner leiter zählt auch das kettenwerk Fd + Ts», Übersicht mit Auswahl: unter **Lasten → Havarie** je Leiter «kann reissen» und der Zug bei −20 °C in **+y und −y** (leer: Reglagetabelle). Je angehaktem Leiter ein Fall ±y, nur er reisst, dazu «ohne Leiterbruch»; Hülle. Tragjoch/Mast 10 %, Abfangjoch voller Leiterzug (je Kandidat eine Auswertung). Kettenwerk = Module gleicher Bezeichnung. AxisVM: je Leiter `HavarieX|…` (Korrektur), `HavarieY|…|p/m`, Namen kurz «Havarie L1 …». Alte Merker «Bruch» werden beim Laden zur Auswahl (`havarieAnheben`) |
| Havariefall abschaltbar (20. Sept.) | «den havarielastfall deaktivierbar machen (nachweis / export)»: Schalter **«Havariefall rechnen (Nachweis und Export)»** unter *Lasten → Havarie* (`havarieAus`, Vorgabe **ein**). Aus: keine aussergewöhnlichen Lastfälle (`havarieVorhanden` false) — kein Havarienachweis, keine Havariezeile in der Hülle und im Bericht; die AxisVM-Ausleitung führt weder die Gruppen `HavarieX/Y` noch die Fälle je Leiter, noch deren Lasten und Kombinationen; das Abfangjoch rechnet nur Wind und Schnee leitend (`ohneHavarie`, keine Läufe je Kandidat). Ein Hinweis nennt die Abschaltung, damit sie im Nachweis nicht untergeht |
| Abfangjoch im Blattmodell (20. Sept.) | «checke die abfangjoch ausleitung auf denselben fehler» → Befund: auf einem Blatt mit mehreren Tragwerken wurde ein Abfangjoch als **Tragjoch** gebaut (vier Winkel L 90×90×9 statt zweier liegender Walzprofile mit Gabel und Kröpfung). Entscheid: **richtig einbauen**. Es baut jetzt sein eigenes Modell (`abfangBau`), örtlich 0…jt, das Blatt verschiebt; Masten unter dem Blattnamen (`MAST_<Stelle>_S<n>`, damit ein geteilter Mast verschmilzt). Lastgruppen: **Leiterzug → G_Ablenk** (ständig und waagrecht wie die Ablenkkräfte), **WindJoch → WindY** («nur ±y, wie die eigene Ausleitung»), SchneeJoch → Schnee, G/G_Anbau/WindX/WindY unverändert. Havarie («gleich mit einbauen»): im Blatt bleibt der Nachbar ständig (örtliche Havarie, 19. Sept.); die **eigene** Abfangjoch-Ausleitung legt je Leiter einen Fall an — geschrieben wird die **Änderung** gegenüber dem ständigen Leiterzug (gerissener −Z(+5 °C), übrige Z(−20 °C) − Z(+5 °C)), die Kombination greift beides mit γ = 1.0 ohne veränderliche Lasten. Sie steht auch dann da, wenn die Änderung null ist (fehlende Reglagetabelle, pauschale Abfangkraft) — die Beiwerte unterscheiden sie von der Tragsicherheit |
| Abfangjoch: Masten und Länge (20. Sept.) | «die masten werden nach innen gesetzt wenn primär ein jochtyp und länge ausgewählt wurde. wenn aber die masten schon vorhanden sind sollte sich der jochtyp daran richten und wenn notwendig den nächst längeren joch auswählen.» Das Sortiment führt je Länge einen **Bereich zulässiger Stützweiten** (Überstand 0.25–0.495 m je Seite). Vorgabe ist die **grösste** Stützweite, also 25 cm Überstand je Seite (`abfangUeberstand`). Die **Lage eines Abfangjochs ist sein erster Mast** (`lageOrtsnull` = Lage − Überstand), der Träger kragt darüber hinaus — sonst könnte es nie einen Masten mit dem Nachbarjoch teilen. Mastabstand = js = jt − 2·ü. Passt der Abstand vorhandener Masten nicht in den Bereich, nennt ein Hinweis das passende Joch (`abfangFuerStuetzweite`, kürzeste Länge des Typs, sonst nächster Typ); geändert wird nichts von selbst («Warnen, Berichtigung auf Klick») |
| Vorlagen nach Ort (19. Sept.) | «die anbauteile template auf die tragwerksarten anpassen», «nach ort trennen»: Spalte `ort` (joch / mast / beide; leer: mit Träger Joch, sonst beide). **Am Masten:** Rückleiter direkt, Lampe LED/alt mit Rohr (Rohr vorläufig = Hängerohr, Baustein «Lampenrohr»), Fahrdrahtabzug mit Konsole 1 m (Fd ohne Gewicht), NT- und Rohrausleger (1.25 / 2.50 m wie am Joch), Traverse mit Zusatzleiter. Kachelliste am Einzelmast nur Mast-Vorlagen, am Joch alle (Gruppe «Am Masten») |
| Teile am Masten: Weg und Skizze (19. Sept.) | Weg: auf der **Anschlusshöhe waagrecht** (y, dann x), dann lotrecht auf z (`anbauKette`, `amMast`) — nicht den Masten entlang (Starrstab auf der Mastachse). Skizze: «mach eine ansicht in xz und eine draufsicht in xy»; x an beiden Enden global |
| Lastgenerator (18. Sept.) | nur bei Tragwerken mit Träger; am Einzelmast ausgeblendet |
| Testdaten (19. Sept., A3) | `testdaten/` ist **frei erfunden** und öffentlich (Typ «TEST-80», runde Werkstattgrössen, keine Zahl aus den Unterlagen); sie tragen nur den Rauchtest, nie eine Bemessung |
| Kommentare (19. Sept., A4) | **nicht kürzen** — die Weisungszitate und das Warum bleiben im Code |
| Erklärtexte (19. Sept., U4) | abschaltbar in Optionen → Darstellung → Bedienung, **Vorgabe ein**; gerechnete Notizen bleiben immer |
| Tragausleger (18. Sept.) | bis zum Kragarm-Modell **Warnung statt Sperre**: «Tragausleger NICHT nachgewiesen», gelb, kein Urteil, Bericht nimmt ihn nicht |
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

**20. September 2026** · Prüfstand 4865 Kontrollen grün · `durchlauf.mjs`
ohne Bruch · vier Tragwerksarten (Joch, Einzelmast, Mast mit Tragausleger,
Abfangjoch) · Projektablage mit Einlesen/Ausleiten · COM-Brücke baut und
rechnet (Rechnen nur auf Anweisung).

Letzte Schritte (neueste zuerst; ältere stehen im Git-Verlauf):
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

**Laufende Arbeit (19. Sept.): Jochreihe als gekoppeltes Tragwerk.**
Entscheide siehe *Entschieden* («Jochreihe gesamtheitlich»). Noch nicht
begonnen; Bauplan: (1) messen ✔, (2) räumlicher Stabwerkslöser im Kern,
gegen PyNite gemessen, (3) Reihenmodell aus dem Blatt, (4) Lastfälle auf
der ganzen Reihe, Havarie je Aufhängung, (5) Schnittgrössen in die
Gurt-/Blechauswertung, Masten aus dem Stabwerk, Urteil der Reihe,
(6) Bericht/Excel/Ausleitung, Vergleich mit AxisVM. Der Kern kennt heute
nur das Einzelfeld (Ersatzbalken mit Drehfedern, `core.statics`/
`core.auflager`). `MAST_UNVERSCHIEBLICH` entfällt dort. **Sofortmassnahme
erledigt** (Nachbarkräfte am geteilten Masten, siehe *Entschieden*).

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

**Datenstand:** `data/anbauteile.json` trägt seit 19. Sept. die Spalte `ort`
und fünf Mast-Vorlagen, `data/fl_bauteile.json` den Baustein
`anbauteil-lampenrohr` (Sicherungen davor in `data/sicherung/…_2026-09-19`).
`data/tragjoche.json` trägt seit 18. Sept. die J60-Bleche
(Sicherung davor: `data/sicherung/tragjoche_vor_J60_2026-09-18.json`). Wer
die Anwendung mit einem Datenpaket nutzt (GitHub Pages, andere Rechner),
braucht ein **neu gesichertes Paket** — ältere Pakete kennen J60 ohne Bleche.

## Offene Punkte

Mit ⚠ markierte Punkte brauchen einen Entscheid des Auftraggebers.

**Fachlich**
- **Nachweisbericht:** Tragausleger fehlt noch (wartet auf die Modellfrage
  unten); die Systemskizze ist die Längsansicht des Modells, keine
  vermasste Zeichnung; ein Handbuchkapitel zum Bericht fehlt.
- **Mast mit Tragausleger — Ergebnisse auf der unsicheren Seite** (seit
  18. Sept. als «NICHT nachgewiesen» gekennzeichnet, gelb, ohne Urteil;
  offen bleibt das Kragarm-Modell). Der
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
- **Spannweitenkategorien:** Tabelle Radius ↔ zulässige Spannweite je EK.
- **Örtlicher Anteil:** die Verteilung dicht an der Klemme (überschätzt dort
  bis Faktor 19).
- **Reglagetabelle** für weitere fix abgespannte Leiter; ohne sie stehen
  Schnee- und Havariefall zu günstig da.
- ⚠ **Schnitt D-D:** die Bemassung 6 / 8 / (92) / 8 / 6 deutet auf Bleche der
  Positionen 5–9, die 6 mm zurückgesetzt sind (Hebelarm 100 statt 112 mm).
  Im Modell sitzen alle bündig.

- **Geteilter Mast:** seit der Sofortmassnahme (19. Sept.) mit den
  Jochkräften der Nachbarn; es fehlt noch die Rahmenwirkung (gekoppeltes
  Modell). Rechenzeit je Eingabe mit zwei Nachbarn ≈ 80 ms.
- **Geteilter Mast im Nachweis** (19. Sept. nachgeprüft): seine Teile am
  Masten zählen in **beiden** Rechnungen (seit 2./18. Sept., `mastAnbauteile`
  mit `mastId`) — der frühere offene Punkt «Bauteil gehört nur einem
  Tragwerk» war veraltet. Es fehlt aber die **Jochreaktion der Nachbarseite**
  im Mastnachweis und die Rahmenwirkung über die Reihe (Hinweis in
  `core.checks.js`). ⚠ Vorschlag «Mast als eigenständiges Element»
  vorgelegt; Entscheid 19. Sept.: gekoppeltes Gesamtmodell (siehe
  *Laufende Arbeit*).

**AxisVM / COM**
- Lastfallnamen «Havarie L1 …» in AxisVM nicht erprobt — die Modelle wurden
  aufgebaut, aber ohne Havariefälle.
- Am Einzelmasten nennt die Kopfzeile der ausgeleiteten Datei das aktive
  Tragwerk als «Tragjoch frei L=0.00 m», und der Dateiname folgt dem Joch
  des Blattes. Der Inhalt stimmt, die Anschrift nicht.
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
node pruefung.mjs           # Pruefstand, 4865 Kontrollen - muss gruen bleiben
node durchlauf.mjs          # Durchgang durch alle Wege je Tragwerksart
VIERENDEEL_DATEN=testdaten node durchlauf.mjs   # derselbe ohne Betreiberdaten (Rauchtest, CI)
node testdaten/erzeuge.mjs  # schreibt den erfundenen Testdatensatz neu
python3 build_html.py       # buendelt js/ + css/ -> vierendeel_tool.html
python3 serve.py            # Modulversion: http://localhost:8731/index.html
```

Nach **jeder** Änderung an `js/` oder `css/` neu bündeln — die eigenständige
Datei veraltet sonst still.

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

Nichts davon gehört in einen persönlichen Gedächtnisspeicher des Werkzeugs;
er wandert beim Kontowechsel nicht mit. Die Datei ist öffentlich: keine
Betreibernamen, Zeichnungsnummern oder persönlichen Pfade.
