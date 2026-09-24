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
| Lastenkarte je Tragwerksart (20. Sept.) | «hier ist die windlast in y nicht aufgeführt beim einzelmasten. auch die angabe in der sidebar passt nicht ganz» und «man sollte die tragjoche und masten gleichwertig behandeln und nur die felder auflisten die auch im modell vorkommen». Der Reiter *Lasten* zeigt nur noch, **was bei dieser Art auch wirkt** — gemessen, nicht hergeleitet (Prüfstand 109 rechnet jedes ausgeblendete Feld gegen). Am Einzelmasten fallen die Laufmeterlasten des Jochs weg (g_k, w_k, s_k, Δg_k, Schneeklasse: der Kern rechnet dort L = 0) und der Schalter «Mastwind wirkt auf das Joch» (es gibt kein Jochende; am Abfangjoch ebenso, dort rechnet ein eigener Kern). Die **Windbelastung bleibt**: sie wählt die Zeile der Mastwindtabelle und die Windkräfte der Anbauteile. Der **Mastwind steht in beiden Richtungen** (w_Mast,x Jochachse, w_Mast,y Gleisrichtung) und ist **gesperrt**: er folgt immer der Tabelle (`mastWindBeide` in data.masten.js ist die eine Stelle, aus der Kern und Maske ihn holen) |
| Verformung im Plot und als Diagramm (24. Sept.) | «nimm die verformung in die resultat plot und mache entsprechende diagramme.» Neue Plotgrösse **w** (mm), nur an den Masten — das Joch bleibt grau, wie bei der Querkraft die Gurte. Aufgetragen ist die **Resultierende** aus beiden Richtungen im gezeigten Lastfall; welche Richtung es war, sagt das Diagramm. Neu je Mast ein Diagramm **«Verformung über die Höhe»** mit w_x und w_y in Millimetern und der Grenzlinie L/200. Es steht unter der Ausnutzung — erst was trägt, dann wie weit es sich bewegt |
| Gebrauchstauglichkeit: Plot und Wahl (24. Sept.) | «setze noch ein resultat plott gebrauchstauglichkeit … Tragsicherheit Gebrauchstagulichkeit oder beide.» Auf Rückfrage: (1) Der Plot **«η w»** trägt das η **aus dem Nachweis, je Mast** — eine Farbe über die ganze Höhe, feste Skala 1.25 wie η. Ein Verlauf w(z) gegen L/200 wäre erfunden: die Grenzwerte gelten an **zwei** Stellen, dazwischen ist keiner definiert. Er folgt **nicht** dem Lastfallwähler (Betriebswind ψ 0.70). (2) Die Wahl **Tragsicherheit / Gebrauchstauglichkeit / beide** (Vorgabe **beide**) steht in der **Ergebnisleiste** und zieht die **Plotliste** mit (`modiFuer`, `modusKorrigieren`) — eine Stelle, kein zweiter Wähler. Weg fällt, was ein η der Tragsicherheit zeigt; Schnittgrössen und Hinweise bleiben. Die **Hauptkachel bleibt** — ein Anzeigefilter ändert kein Urteil. Ein Plot ohne `nachweisart` gilt der Tragsicherheit (vergessene Angabe führt zur harmloseren Zuordnung). Das Umschalten **rechnet nicht neu** |
| Mastfundament im Nachweis (24. Sept.) | «die Fundamentzuordnug zu den einzelnen Masttypen … die Fundamente auch noch separat als ausnutzungsbeiwert in die nachweisführung aufnehmen (gesamtheitliche Tragwerksbetrachtung). diesen nachweis auch unter optionen ausschaltbar machen.» Quelle: `Grundlagen/Einwirkungen`, zulässige Standardlasten, **Block bis 14° Geländeneigung** («die Geländeneigung nicht berücksichtigen» — der zweite Block mit den kleineren Werten Richtung fallender Böschung bleibt drausssen; an einer Böschung rechnet das Werkzeug damit auf der unsicheren Seite, der Kachel-Titel sagt es). Acht Zeilen als zweite Tabelle **im Sortiment der Masten** (`data/masten.json`, Tabelle `fundamente`) — sie ist eine Zuordnung zum Masttyp, und so gehen sie ohne Zutun durch Datenpaket, Excel und Abgleich. **Die Zuordnung Masttyp → Profil ist gemessen:** die Windlasten je Einwirkungsklasse in `fl_bauteile.json` (mast-dp20 … mast-dpm24-p) stimmen ziffernweise mit denen der Profile — DP20 = HEB 200, DP22 = HEB 220, DP24 = HEB 240, DP26 = HEB 260, DPM24 = HEM 240. Beim **HEM 240 entscheidet die Stegrichtung mit** (einziges nicht quadratisches Mastprofil): starke Achse quer → HP1a/2.4 (M_q 230), gedreht → HP2a/2.4 (M_q 154); vertauscht wäre der Nachweis um ein Drittel zu schwach. Nachgewiesen wird in `core.fundament.js` über die **charakteristischen und aussergewöhnlichen** Lastfälle (wie beim Anker, alle Beiwerte 1 — Tragsicherheits-Kombinationen bleiben drausssen), **acht Einzelnachweise** am Mastfuss: V, M_q, M_l, H_q, H_l, T sowie **M_q und H_q für den veränderlichen Anteil allein** (eigene, schärfere Spalten der Quelle — am Standardjoch η 0.16 gegen 0.09). **Quer und längs werden nicht überlagert**, so die Quelle ausdrücklich; das Urteil ist das Maximum, keine Interaktionsformel. Der Typ folgt Profil und Stegrichtung, lässt sich in der Mastkachel aber wählen (`MASTFELDER`, gehört dem Masten — ein geteilter Mast hat ein Fundament). Abschaltbar als **Nachweisgruppe `fundament`** (Optionen → Nachweise, Vorgabe **an**) statt als eigener Schalter: dort stehen die abschaltbaren Nachweise schon, und ein nicht geführter zählt von selbst nie als erfüllt |
| Höhe der Fahrdrahtverschiebung (24. Sept.) | «es sollte einen schieber geben welche höhe für die farhdrahtverschiebung massgebend ist.» Neues Feld **`fdHoehe`** (Gruppe *Masten*, Schieber, über dem Mastfuss gemessen). Die Automatik von `messStelle` (höchstes Drahtwerk → höchster Ausleger → Jochauflager) trifft den Regelfall, misst aber am **Anschlusspunkt** eines Teils — der Fahrdraht hängt darunter, und wie weit, weiss die Zeichnung. **0 = automatisch**, damit jeder gespeicherte Stand unverändert weiterrechnet; **über dem Mastkopf gilt die Eingabe nicht** (dort steht keine gerechnete Verschiebung, sie fällt auf die Automatik zurück). Der Nachweistext nennt seither die Höhe («Fahrdraht auf 5.50 m quer zum Gleis») — sonst stünde dieselbe Zeile da, gleichgültig ob 6.20 oder 8.00 m gemeint war. Gemessen am Einzelmast: Automatik 8.00 m → 8 mm, eingetragene 5.50 m → 5 mm, Grenzwert unverändert 40 mm |
| Gemeinsame Kopfzahl bei «beide» (24. Sept.) | «wenn hier beide ausgewählt sind dann müsste es einen globalen ausnutzungfaktor haben der den gebrauchstauglichkeit auch berücksichtigt.» Die Hauptkachel trägt in dieser Stellung das **Maximum über beide Nachweisarten**, mit dem massgebenden Bauteil daneben («Verformung M2»). **Die Farbe folgt ihm** — auf Rückfrage ausdrücklich so entschieden und damit eine Änderung des Entscheids vom 18. September («die Urteilsfarbe folgt allein der Tragsicherheit»); eine Kachel, die η 1.97 zeigt und grün dasteht, ist ein Widerspruch. **Die Aussage wird nicht vermischt:** der Text nennt beide Urteile getrennt («Tragsicherheit erfüllt · Gebrauchstauglichkeit NICHT erfüllt»), denn die Zahlen stehen auf verschiedenen Lastniveaus. In den beiden anderen Stellungen zeigt die Kachel genau das, was darunter steht. **Einzellastfall** und **«nicht geführt»** bleiben unberührt — dort wird nicht geurteilt (`urteilMitGebrauch` in ui.js) |
| Werte im Plot: einmal je Bauteil (24. Sept.) | «Die werteplotts sind nicht gut lesbar», mit dem Bild eines Masten: achtmal «1.97» untereinander. Grössen, die dem **Bauteil** gehören statt der Station, tragen an jedem Abschnitt denselben Wert; die Ausdünnung kannte nur Abstände im Bild, nicht die Frage, ob zwei Zahlen etwas Verschiedenes sagen. `entdoppelteWerte` lässt je Bauteil und gerundetem Wert **eine** Zahl stehen, und zwar die mittlere der Gruppe. Dazu getrennte Deckkraft: das Kästchen bleibt blass (0.62, die Fläche schimmert durch), die **Ziffer** steht mit 0.95 da — eine rote Ziffer mit 0.62 auf rotem Bauteil war nicht zu entziffern. Die Weisung vom 20. Sept. («transparenter») galt der verdeckten Fläche, nicht der Zahl |
| Mastverformung im Gebrauchszustand (24. Sept.) | «Mastfervormung berechnen lassen infolge wind / ständige und deren kombination. die massgebende werte sind Mastspitze 1:100 (wind+ständige) / 1:200 (nur Wind) und auf höhe Fahrdraht oder vereinfacht auf höhe Ausleger / Jochauflager -> hier ist der Grenzwert 40mm. Die Gebrauchstauglichkeit kombination ist in diesem fall der Wind bei 0.70 (Betriebswind Wiederkehrperioda 5 Jahre).» Auf Rückfrage: die **40 mm quer zum Gleis** (Seitenlage des Fahrdrahts), die Spitze in **beiden** Richtungen; die 40 mm gegen den Fall **nur Wind**. Gerechnet in `core.verformung.js` über `mastVerschiebungen` (core.mast.js) — dieselbe Lastliste wie die Schnittgrössen, also **mit** der Haltekraft des Ankers und mit dem Entscheid, ob ein Seil in dieser Kombination trägt. Quer biegt der Mast über `I`, längs über `Iq`. Neu vier Lastfälle **Betriebswind** (`gtbetriebW…`, G mit 1.00, Wind mit ψ = 0.70, `BETRIEBSWIND` in core.lasten.js); «nur Wind» braucht keinen eigenen — die charakteristischen Windfälle mal 0.70 sind exakt derselbe Zustand. Die Messstelle: Fahrdraht, sonst Ausleger, sonst Jochauflager (`messStelle`). Gegengerechnet am nackten Kragarm: w = qL⁴/8EI auf 1e-12. Die Kachel steht **ohne Ampel** — die Urteilsfarbe folgt allein der Tragsicherheit (18. Sept.) |
| Havariefall im Ankernachweis (24. Sept.) | Frage: «wie wirken sich die abfangungen und der havariefall auf die zuganker und Druckstüzen aus?» Gemessen am Einzelmast HEB 240/10 m, NT-Ausleger 8 m, R-FL, Anker a = 4.5 / h = 7.8: der **ständige** Zug einer Abfangung kommt voll am Anker an (einseitig ±49.5 kN gegen −3.8 kN bei durchgehend), und die **Zugrichtung** entscheidet Druck oder Zug — zieht der Leiter zur Ankerseite, hängt ein Seilanker durch (der Mast trägt allein, Entscheid 16. Sept.), eine Druckstütze nimmt 49.5 kN mit Knicken auf (η 0.83 gegen 0.37 bei Zug). Der **Havariefall** dagegen erreichte den Nachweis nicht: `ankerAuswertung` nahm nur die charakteristischen Fälle, die Havariefälle sind «aussergewöhnlich». Am **Abfangjoch** war er immer dabei (er ist einer der drei Fälle dort) — dieselbe Abspannung wurde je nach Tragwerksart verschieden nachgewiesen. Bei **beidseitiger** Abfangung entsteht die grosse Ankerkraft überhaupt erst beim Riss: nachgewiesen wurde mit −3.82 kN (η 0.064), angefallen sind ±45.72 kN — Faktor 12 auf der unsicheren Seite. Entscheid auf Rückfrage: **ja, gegen dieselbe zulässige Kraft** (`ANKER_FALLARTEN` in core.anker.js). Der Anker wird gegen zulässige Kräfte nachgewiesen, und der Havariefall trägt alle Beiwerte 1 — er steht auf demselben Niveau. Die Tragsicherheits-Fälle bleiben draussen (Teilsicherheitsbeiwerte). Danach: beidseitig η 0.763, durchgehend 0.076, einseitig unverändert (der Riss entlastet dort) |
| Leiter: durchgehend / beidseitig / einseitig abgefangen (24. Sept.) | «Die leiter könen als durchgehend / beidseiig abgefangen / einseitig abgefangen definiert werden. bei den durchgehenden wid ein 10% anteil beim Leiterriss gerechnet. bei den beidseitig abgefangenen wid der volle leiterzug einseitig angesezt und beim einseitg abgefangenen, hebt sich der leiterzug auf, dies kann bei mehreren abfangungen an einem abfangträger zu ungünstigen lastfällen dann führen, die massgebend sein können.» Rückgefragt und bestätigt: der Leiterzug wirkt **auch ständig**, und die Wahl gilt **allen vier Tragwerksarten** — bis dahin entschied die Tragwerksart (Abfangjoch voller Zug, Tragjoch/Mast 10 %), jetzt der Leiter. Angesetzt wird (`ABFANGARTEN` in core.lasten.js, gemessen am N-FL mit Z(+5 °C) = 14.9 und Z(−20 °C) = 16.5 kN): **durchgehend** ständig 0, Riss 1.65 kN; **beidseitig** ständig 0 (die Züge heben sich am Anschluss auf), Riss 16.5 kN einseitig; **einseitig** ständig 14.9 kN in seine Richtung, Riss −14.9 (er fällt weg), ohne Riss +1.6 (Z steigt auf −20 °C). Die **Richtung** (+y/−y) gehört dazu — ohne sie kann sich nichts aufheben. Gemessen am J90/20 m mit zwei entgegengesetzten Abfangungen: ständig und bei Wind Σ F_y = 0, beim Riss bleiben 16.5 kN, und der Havariefall wird massgebend (η 1.61 gegen 1.80 bei Wind). Dabei musste das **Vorzeichen des Längszugs aus dem Beiwert in die Kräfte** wandern (`havarieEinsetzen`, `havarieFest`): ein Beiwert −1 gilt allen Leitern des Falls gemeinsam und machte aus dem Wegfall eine zweite Zugkraft (η 18.3 statt 12.1). Die Havarie-Karte zeigt je Leiter Abfangung, Richtung und die **Kräfte als Zahl** — die Frage «wo sieht man den lastanteil?» soll die Karte selbst beantworten. ⚠ Das **Abfangjoch** rechnet noch mit seinem eigenen Weg (`abfangBricht`, alle Leiter faktisch einseitig) und liest die Wahl noch nicht |
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

**24. September 2026** · Prüfstand 5137 Kontrollen grün · `durchlauf.mjs`
ohne Bruch · vier Tragwerksarten (Joch, Einzelmast, Mast mit Tragausleger,
Abfangjoch) · Projektablage mit Einlesen/Ausleiten · COM-Brücke baut und
rechnet (Rechnen nur auf Anweisung).

Letzte Schritte (neueste zuerst; ältere stehen im Git-Verlauf):
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

**Laufende Arbeit (20. Sept.): der Stabwerkslöser, Schritt 2 des Bauplans.**
Er steht seit dem 20. September **im Projekt** (`js/core.stabwerk.js`,
Prüfstand Abschnitt 111) und **hängt noch an keinem Nachweis**. Was er
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
- **Nächster Schritt:** gegen PyNite messen — es **ist** installiert
  (Fassung 3.0.0, Modulname `Pynite` mit kleinem n; meine frühere Aussage
  «nicht installiert» war falsch, ich hatte nur `PyNite` geprüft). Danach
  das Blatt (11 868 Freiheitsgrade) auf Zeit prüfen, dann entscheiden, ob
  Starrkörper als Zwangsbedingung statt als Ersatzsteifigkeit gehören.

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
- **Datenpaket ohne Masten-Sortiment:** ältere Pakete führen es nicht;
  dann fehlt der Mastwind ganz (siehe oben, der Hinweis sagt es). Ein
  neu gesichertes Paket enthält es.
- ⚠ **Abfangjoch und die Abfangarten:** der Abfangjoch-Kern (`core.abfangjoch.js`) rechnet den Havariefall auf seinem eigenen Weg — `abfangBricht(t)` liest den **alten** Merker `t.bruch`, und der volle Leiterzug gilt dort allen Leitern. Damit behandelt er faktisch jeden Leiter als «einseitig abgefangen». Die Wahl vom 24. September erreicht ihn noch nicht. Das ist der nächste Schritt; bis dahin rechnet das Abfangjoch unverändert wie bisher.
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
node pruefung.mjs           # Pruefstand, 5137 Kontrollen - muss gruen bleiben
node durchlauf.mjs          # Durchgang durch alle Wege je Tragwerksart
VIERENDEEL_DATEN=testdaten node durchlauf.mjs   # derselbe ohne Betreiberdaten (Rauchtest, CI)
node testdaten/erzeuge.mjs  # schreibt den erfundenen Testdatensatz neu
node datenpaket.mjs         # Datenstand aus data/ als Paket nach Versand/
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
