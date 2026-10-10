# Initialprompt für eine neue Sitzung

Diese Datei ist zum **Einfügen in einen neuen Chat** gedacht (oder zum
Zuruf: «lies INITIALPROMPT.md»). Sie ist die Abkürzung in die Arbeit —
**das Gedächtnis des Projekts ist [CLAUDE.md](CLAUDE.md)**, und die ist ganz
zu lesen, bevor etwas geändert wird.

## Stand 8. Oktober 2026 - hier weitermachen

Am **Arbeitsrechner** (Windows, AxisVM über COM, Betreiberdaten örtlich in `data/`). Prüfstand
**7167** Kontrollen grün, `durchlauf.mjs` ohne Bruch (Betreiber- und Testdaten).

**Git:** zuletzt gepusht am 9. Oktober («versand nachziehen und pushen»); seither örtliche Commits (Jochanschluss vereinfacht und Summe am Mittelmasten, Lageband, Blatt des Jochanschlusses nur mit dem Massgebenden, Eingabe-Durchgang mit behobenem Havarie-Abbruch am Abfangjoch) - am Abend des 9. Oktober gepusht (Weisung «pushen»); danach bis `f59b949` gepusht (Anker am Tragausleger-Mast, Mastlänge am Abfangjoch, Schiene). Am 10. Oktober EIN örtlicher Commit, nicht gepusht (Lastfalltabelle mit der Zahl des Stabwerks, Vorschau der Ablage mit Leiter / Abzug / Fläche, nur über «Laden»). Offene Befunde des Durchgangs: CLAUDE.md, *Offene Punkte*. `Versand/` trägt Einzeldatei und Datenpaket vom 9. Oktober und die COM_Bruecke gleich `com/`. Weiter gilt: pushen nur auf Weisung.

**Datenstand** (`data/*.json`, örtlich, nie pushen): Datenpaket `Versand/Vierendeel_Datenpaket_2026-10-09.json`
ist aktuell (Einheitswind EK0 aus der Mast-Mappe, Wind Ts/Fd halb/halb, Leiter-Traverse einseitig, Signalsymbole); Einzeldatei
`Versand/vierendeel_tool_2026-10-09.html`; COM-Brücke `Versand/COM_Bruecke` (mit dem neuen Schalter, aber
noch nicht fertig erprobt - siehe unten).

**Gebaut am 8. Oktober:** Einheitswind mit den Werten der alten Mastberechnung (`Grundlagen/Einheitswind`) als EK0 in der Datenbasis - Tragjoche, Abfangjoche A160-A360, Tragausleger, Masten, Leiter, Hängestütze, Jochaufsätze, Ausleger; ein hinterlegter Wert gilt vor der Herleitung und ohne Zuschlag (J90 w_k 0.275 → 0.350). Nachtrag: alte Lampen 0.3 / 0.5 kN, alte Abfangjoche ohne Zuschlag, Gittermast 1.52 kN/m² aus den Tragjochen. **Gittermast IV 45 UL nach der Detailzeichnung berichtigt** (Gurt unten L 100x100x12, Teilung 13 / 15 Stationen, Bleche 12 / 10 mm, Kopf ohne Blech; Beispiel Gurt 0.874 → 0.813, Blech 0.424 → 0.574). ⚠ Lesarten zu bestätigen und offene Punkte zum Gittermast: CLAUDE.md, *Offene Punkte*. Die Datei des Anwenders aus dem Bugreport ist in AxisVM aufgebaut (nur gebaut): läuft durch.

**Gebaut am 8. Oktober: gespreizte Masten DGP24/5.5, DGP26/5.5, DGP24/10, DGP26/10** (Tabelle `gespreizt` in
`data/masten.json`, `export.axisvm.gespreizt.js`; unter der Spreizung zwei T-Hälften mit Bindeblechen, darüber das Walzprofil; Kacheln
«Hälften», «Blech», «Profil»; PyNite 0.000 %; im Browser geprüft). ⚠ Brücke `AddT` in AxisVM nicht erprobt; offene Punkte in CLAUDE.md.

**Gebaut am 8. Oktober:** unter *Lasten* sind mit «Werte bearbeiten» auch w_Mast,x / w_Mast,y frei - je Mast
und Richtung in der Mastliste (`windX`, `windY`); «Tabellenwerte» setzt Joch und alle Masten auf die Datenbank zurück. Null ist eine gültige Eingabe; unten rechts im Bild steht «Lasten von Hand (…)».

**Gebaut am 8. Oktober:** Blatt «Bestandesschutz» (Knopf im Block, Export; neue Teile rot, Auswahl Gesamt / Joch /
Mast / Fundamente; `export.bestand.js`) und am Jochanschluss der Schalter Resultierende je Jochende / Einzelgurte.

**Aufgabenliste:** der Bugreport vom 9. Oktober steht als Liste B1-B9 in CLAUDE.md unter *Offene Punkte* (B1-B7, B9, B10 erledigt; offen B8). Doppelanker seit 9. Oktober mit zwei Seilen und Feld d_A (Vorgabe 3.00 m, bestätigt). Versand ist nachgezogen; der Push wartet weiter auf den Befehl.

**Gegenrechnung AxisVM (9. Oktober):** statt des Berichts in AxisVM liest die App die Ergebnisdatei der Brücke ein (*Export → AxisVM-Ergebnisse
einlesen*) und führt das Kapitel «Gegenrechnung AxisVM» im Nachweisbericht (`core.axisvergleich.js`, `export.gegenrechnung.js`). Der Statikbericht
über COM darunter wird nicht weiterverfolgt.

**Laufende Arbeit: Statikbericht über COM** (Weisungen 7./8. Oktober: «kannst du auch mit hilfe der
abhandlung com ein template für einen statikbericht generieren lassen. so viel wie nötig an plots generieren
lassen», dann «berichtsetzung testen»). Gebaut in `com/AxisVM_aufbauen.ps1`, Funktion `Bericht-Erzeugen`,
Schalter **`-Statikbericht`** (umbenannt von `-Bericht`: PowerShell kennt keine Gross-/Kleinschreibung, und
`$bericht` ist der Pfad der Berichtsdatei) und `-BerichtVorlage <.rep>`. Die App schreibt den Plan in die
Modelldatei (Feld `bericht`, `berichtPlan` in app.axisvm.js). Referenz: `axisvm_com_18100.pdf`
(download.axisvm.eu, vom Auftraggeber genannt).
Testlauf (auf Anweisung), Testmodell `com/AxisVM_Bericht_J90_20m.json` (Kopie des Einzeljochs J90/20 m mit
Plan Wind ±y):
```
powershell -NoProfile -ExecutionPolicy Bypass -File com\AxisVM_aufbauen.ps1 -Json com\AxisVM_Bericht_J90_20m.json -Rechnen -Statikbericht -Stapel
```
Ergebnis der vier Läufe vom 7./8. Oktober:
- **Geht:** Bauen, Rechnen; Modellansichten als Zeichnung (`DrawingsLibrary.AddWindow`) und als EMF
  (`Windows.SaveWindowToMetafile`) in `com/Images_<Modell>/`. Ergebnisanzeige: nur
  **`SetStaticDisplayParameters_V181(Index, RExtendedDisplayParameters_V181, KombiNr, LoadLevel, Int32[])`**
  trägt (Signatur aus der Typbibliothek gelesen; die Referenz nennt fälschlich den Satz _V153). Mit
  `Model.FitInView()` und Ansicht vorn (vFront) ist das Bild M_y unter Wind +y richtig (Max 0.887 /
  Min −0.967 kNm, Werte am Joch, Legende).
- **Offen 1:** im 4. Lauf stürzte AxisVM nach der 9. Zeichnung ab («Der RPC-Server ist nicht verfügbar»,
  HRESULT 0x800706BA) - Ursache unbekannt (je EMF ~3 MB? FitInView? Speicher?). Nächster Schritt: Ursache
  eingrenzen (z. B. EMF nur auf Wunsch, Pause/`Refresh` zwischen den Zeichnungen, weniger Plots je Lauf).
- **Offen 2:** Auflagerkräfte (`rc_nsfRz` …) zeigten im 3. Lauf Max 0 / Min 0 - die richtige Komponente oder
  Anzeigeoption ist noch zu finden; die Verformung `rc_d_eR` ohne Max/Min-Angabe im Kasten.
- **Offen 3:** ein Bericht selbst entsteht nur aus einer Vorlage (.rep, `Reports.NewFromTemplateFile`) -
  einen leeren legt die Schnittstelle nicht an. Der Auftraggeber müsste einmal in AxisVM einen Bericht als
  Vorlage sichern.
- AxisVM rechnet weiter **nur auf Anweisung**; jeder Lauf dauert rund 10 Minuten.

**Offen beim Auftraggeber:** «Verformung ohne Havarie» (meldet sich, wenn es wieder vorkommt); Gewicht
Aldrey 300 (0.01 kN/m angenommen); Lesart «Rohr weglassen» = ganzes Rohr.

### Bisher gebaut (Kurzfassung; Einzelheiten in CLAUDE.md, *Entschieden*)

**Gebaut am 4. Oktober** (Einzelheiten in CLAUDE.md, *Entschieden*, Prüfstand 221-232): direkte
Starrglieder der Anbauteile; alle Tragwerke aus dem Stabwerk gefärbt; Masten am Abfangjoch ziehen;
GZG-Nachweis am Fahrdraht (auch am Tragausleger, als Starrkörper der Station), Mastspitzen an der Figur;
Figur mit ψ und Grundlage; gewählter Lastfall aus dem Stabwerk; **Bestandesschutz** (Kennzeichen «neu» je
Anbauteil, Δη ≤ 0.05 je Bauteil; Schalter unter Lasten bei der Windbelastung, über der Anbauteilliste und
in den Optionen; Notiz bei Einheitswind); Gittermast: Rohr an den Halterippen, Rippen halten **nur
seitlich** (Linkelement, ohne Momente; Spiel nicht abgebildet - entschieden), am Kopf verschraubt;
UL-Rohr mit zwei Wanddicken; **Löser:** Dreibein schräger Stäbe ohne lcsZ berichtigt (traf nur
Probestäbe, keine Zahl der App geändert). Danach (Prüfstand 233-234): Wind am Tragausleger im 3D,
Befestigung am Joch schaltbar, Anbauteile am Tragausleger anklickbar; **Gurt im Stabwerk am Anschnitt**
(Option «Knotenbereich» gilt jetzt auch dort); Befestigung «beide» ohne Träger: **z ab Jochachse**;
Sprung der Seitenleiste nach Klick auf den Masttitel behoben.
**Signalbauer** mit den Signalbildern der Mappe als Kacheln und Knopf «Signal zusammenstellen» (Bilder nur in
`data/anbauteile.json` bzw. im Datenpaket vom 4. Oktober, vertraulich).

**Liste vom 6. Oktober** abgearbeitet und gepusht (Prüfstand 236-239, 6735 grün; Einzelheiten CLAUDE.md, *Entschieden*). Danach gebaut: Wind × 0.74 (allen Wind), Fussversatz am Abfangjoch; Datenbank bleibt örtlich (entschieden). ⚠ Offen mit Rückfrage: Verformung bei y-Versatz, Fundamentflow, Vergleich Bestand/Bau/Projekt, Doppelanker Zug, Schaltposten (CLAUDE.md, *Offene Punkte*).

**Gebaut am 6. Oktober** (am Arbeitsrechner, Prüfstand 236): Teile am Masten an Abfangjoch und Tragausleger im Stabmodell (Knoten auf hMast, Kraft und Moment r × F) und im Bild; am Abfangjoch die Hebel der Jochteile (Jochaufsatz, Hängestütze) als Moment am Achsknoten, Leiterzug zentrisch; Blech-Diagonale (ein Starrglied vom Gurtknoten zum Blechende, J90/20 m 942 → 718 Stäbe). Offen dazu: Havarie je Leiter an Mastteilen dieser Arten, Figur/GZG der Mastteile, AxisVM nicht neu gebaut. ⚠ Das Datenpaket vom 4. Oktober ist am Arbeitsrechner noch nicht eingelesen.

**Gebaut am 6./7. Oktober** (Prüfstand 240-247, 6799 grün, gepusht bis `23078b1`; Einzelheiten CLAUDE.md, *Entschieden*, Zeile «Bedienung und Lasten, 6./7. Oktober»): Stabwerk Echtzeit/Knopf, Bügelschrauben mit Grenzfeder, ψ₀ 0.65 ohne γ_Q, Eigengewicht aus den Stäben wie AxisVM, Gruppen/#Tag, Lastgenerator mit Abstand Mast–Gleis, Drahtwerke nach Typ, Mehrfachauswahl und Kontextfenster der Anbauteile, Trasse in der Fussleiste, Havarie ↔ 3D. Danach (7. Oktober, Prüfstand 248-250): Fundamentablauf mit Gelände über 14° (Schritte 10/12 wie die Zellen der Mappe, bestätigt), Doppelanker, Handbuch Kapitel 21, Drahtwerke je Leiter (Überfahren/Klick/Strg), Gruppe duplizieren, Stahlgüten S450/S460 getrennt für Joch und Masten. Dann Windlasten der Hängestütze je Meter, Gesamtlänge statt Angriffspunkt bei Trägern und Auslegern, Leiter Cu 150 / 2×150 / Aldrey 300 (Prüfstand 251), Gittermast ohne Rohr/Aufsatz als Kästchen (252), Leiterstrich im 3D, Drahtwerke «Einzeln», eigene Vorlagen projektübergreifend (Optionen, 253), Einheitswind mit hinterer Ebene 25 %, Bemessungsvorschlag mit Reserve, Änderungsprotokoll hinter der Fassung (254 - dort bei jeder Änderung einen Punkt ergänzen). Abends (255): Lastgenerator mit Δ je Teil, Jochaufsätzen ohne Gleis, Montagehöhe/Mastlänge; Havarie-Liste wie die Drahtwerke und Kettenwerke Punkt für Punkt; Wind Ts/Fd je die Hälfte der Fahrleitungszeile; Drahtwerke nach Name/x/z, Striche je Anzahl; Griffe nur in der Nähe; Figur rechtwinklig; Reaktionen alter Joche als Resultierende; Verläufe Gittermast. Spät (256): Gittermast-Wind je Richtung (Grösstes über die Höhe), Havarie-Leiter ohne Klick im 3D, Drahtwerke ordnen nach Name/x/z, Brücke -Statikbericht (Plots für den Statikbericht, ⚠ in AxisVM nicht erprobt). Leiter-Traverse am Masten einseitig (Mitte 0.50, Leiter 1.00, ziehbar; 257). 258: Anschnitt ohne Knotenbereich (auch Gittermast), Signalsymbole (abstrakt, örtlich), Tabelle Kräfte am Jochanschluss. ⚠ Wartet: Pfad der AxisVM-Berichtsvorlage (Schalter `-Statikbericht -BerichtVorlage`). ⚠ COM-Material-Rückfall in AxisVM nicht erprobt.

**Laufend (2. Oktober):** Bauteile bereinigen über markierte Querprofile.
Der Auftraggeber markiert in `Grundlagen/QP` mit PDF-XChange
(`Tragwerk: …`, `Bauteil: …`, `? …`); `python3 qp_markierungen.py` liest sie
nach `Versand/qp_markierungen/`. Legende und Beispiel 1 (nachgebaut, als
Ablage-Paket mit eingemessenem Plan, Bündel an der Doppelklemme, `E`
ignoriert) in `Versand/qp_beispiele/`. Regel: was nicht zuzuordnen ist,
fragt nach (manuell oder Vorschlag). QP-Einlesen entschieden: Python-
Werkzeug neben der App, Ergebnis als Ablage-Paket, «Schritten 1–3 für
Masten und Joch anfangen und die Anbauteile danach dazunehmen» - noch
nicht begonnen. Danach Abgleichtabelle und gemeinsame Durchsicht
(CLAUDE.md, *Laufende Arbeit*).

**Zuletzt gebaut (Einzelheiten in CLAUDE.md, *Entschieden*):**
- **4. Oktober:** verjüngte (alte) Joche tragen stehende Starrelemente auch am
  ersten Knick der Ansicht (0.90 m; J120-alt/24 m Blech 0.771 → 0.548).
- **4. Oktober:** Klemmzonen geklärt (`knotenEntflechten`, Wache in der Brücke);
  Druckstützen am Abfangjoch im 3D in Resultatfarbe. ⚠ Beispiel B entflochten
  in AxisVM nicht neu gebaut (nur auf Anweisung).
- **3./4. Oktober, Abfangjoch:** 3D-Bild, Verläufe und Schiene aus dem Stabwerk;
  das berichtigte Blatt mit zwei Abfangjochen und Druckstützen in AxisVM
  nachgerechnet (Gurt, Blech ≤ 0.1 %, Mast M_y 2.7-5 % bei kleinen Werten).
- **3. Oktober, verformte Figur:** erscheint mit dem Plot «w» / «η w», Werte an
  der Figur, Flächen im Plot «w» aus denselben Wegen (`wegeAusFigur`); Knopf δ
  weg.
- **3. Oktober, Abfangjoch, vier Befunde:** zwei Abfangjoche übereinander
  hingen am selben Mastknoten; den Masten fehlte im Stabwerk der Mastwind; das
  Abfangjoch rechnete immer mit EK2 und ohne Spannweite (`mitTrasse`); die
  Bindebleche der Druckstütze standen im Löser quer (Mast gegen AxisVM
  13.6 → 2.9 %). Einseitig abgefangener Leiter: halbe Spannweite.
- **3. Oktober, Durchsicht der Tragwerksarten:** der COM-Knopf leitet bei
  gewähltem Abfangjoch das ganze Blatt aus (`stabwerkDatei`, dieselbe Datei wie
  das Stabwerk); `durchlauf.mjs` fährt das Abfangjoch. ⚠ Offen: Entscheid, ob
  alle Tragwerke des Blattes im 3D gefärbt werden (heute nur das gewählte), und
  die Liste der Uneinheitlichkeiten unter *Offene Punkte*.
- **3. Oktober, Quervergleich AxisVM:** zwei Beispielblätter gebaut und
  gerechnet (`modell_beispiele.mjs`). Fehler gefunden und behoben: das liegende
  Bindeblech des Abfangjochs stand im Löser hochkant (I_y/I_z vertauscht),
  Abfangjoch-η des Stabwerks lagen zu hoch. Danach die starren Blechenden des
  Abfangjochs wirklich starr (Querschnitt STARR): Gurt und Blech gegen AxisVM
  unter 1 %. Klemmzonen am Tragjoch geklärt (4. Oktober: AxisVM verschmolz deckungsgleiche Knoten, Ausleitung entflicht). Handbuch 20 Kapitel; Kopie und Tragwerk-Vorlage
  nehmen die Abfangart der Leiter mit.
- **3. Oktober, Anker:** das Stabmodell des Abfangjochs baut den Anker jetzt
  (fehlte ganz); am geteilten Masten steht er einmal statt je Tragwerk
  (vorher halbe Ankerkraft, unsichere Seite). Anbauteile am Abfangjoch im 3D
  heranfahrbar und greifbar (⚠ Ziehen im Browser nicht bestätigt).
  Einheitswind am Abfangjoch = Profilhöhe; Bemessungsdiagramm der Gittermasten
  unter Verläufe bei Einheitswind.
- **3. Oktober, Einheitswind (alte Norm):** vierte Windstufe «1.0 kN/m², ohne
  Formbeiwert» (intern `EK0`, Regel in `data.fl.js`): Joch auf seine
  Windangriffsfläche, Masten auf die Profilbreite, Anbauteile aus dem
  Tabellenwert / (q · c). Für den Vergleich im Bestandesschutz (5-%-Regel);
  ein Vergleich alt/neu in einem Blick ist nicht gebaut.
- **3. Oktober, Gittermast I 30 UL** (16.00 m, Rohr ø 140 × 6) im Sortiment;
  Anbauteile am Gittermast gemessen (Traverse, Leiter, Lampe, Trafo rechnen).
- **3. Oktober, Abfangjoch:** ein Mast, ein Körper auch bei zwei Abfangträgern
  an denselben Masten (Zeichenplan in `abfangSzene`); vier Vorlagen «Tragseil /
  Fahrdraht N-FL / R-FL abgefangen» (Spalte `abfangung`, setzt die Abfangart
  je Leiter beim Absetzen).
- **3. Oktober, Gittermast (kombinierter Mast):** wählbar als Einzelmast und
  Jochmast; im Stabwerk ein Fachwerk (vier Gurtwinkel, Bindebleche, Schotte,
  Rohr bzw. Mastaufsatz; `export.axisvm.gitter.js`), Nachweis je Stab, das
  Bemessungsdiagramm als Kontrolle, 3D aus dem Stabwerk gefärbt. Gegengerechnet
  mit PyNite (`vergleich_gittermast.mjs`, ≤ 0.005 %) und AxisVM (0.00-0.03 %
  ohne Schubverformung). Wind: Betreiberwerte der Joche je Windangriffsfläche, Rohr 1.2 · q · d (Herleitung im Profilblatt). ⚠ Offen: Wanddicke des Mastaufsatzes nach
  einem anderen Typ; Länge je Typ fest (entschieden), UL-Ausführungen der übrigen Typen nicht erfasst; Knicken später (mit den Tragjochen), kein Fundament; nicht am Abfangjoch
  und Tragausleger (CLAUDE.md, *Offene Punkte*).
- **2. Oktober, Endfeld am Stoss:** in der Jochreihe endet jedes Joch
  5 cm vor der Mastachse, Stationen nach der Standardlänge, das Endfeld
  am Stoss gekürzt (je halb, wenn beide Enden stossen); die Ausleitung
  schiebt nichts mehr. Davor: Lagerung ohne Masten einstellbar,
  Anbauteile alle aus/ein, Resultierende/Einzelgurte, Jochlänge auf die
  Standardlänge, Datenpaket in IndexedDB, Mast im Stabwerk alle 0.5 m.
- **2. Oktober, Mast im 3D ziehen:** Schaft schiebt, Fuss und Kopf ändern
  die Länge, das Joch bleibt in der Höhe (⚠ offen: Ende B ohne eigene
  Länge folgt Ende A). Davor: Reaktionsblatt ohne Kennungen und
  Grundlinie, Achsen «quer/längs zum Gleis», 3D-Werte leiser,
  Lastfallnamen quer/längs zum Gleis, U-Profile in AxisVM als Polygon
  aus dem Normumriss, Profiltafel mit Blechen (Pos) und Blattansicht.
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
> sind. Dann `INITIALPROMPT.md`, `git log --oneline -15` und `git status`. Danach
> `node pruefung.mjs` — der muss grün sein, bevor du etwas änderst.
>
> Halte dich an die stehenden Vorgaben: **gepusht wird nur ein grüner Stand**
> (Prüfstand und Durchgang; meine Weisung vom 2. Oktober) - **den örtlichen
> Commit «Gespreizte Masten DGP» nicht pushen**, bis ich es sage (8. Oktober);
> `data/*.json` nie pushen, Änderungen daran als Datenpaket nach `Versand/`;
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
> Dateien ausserhalb dieses Projekts nur öffnen, wenn ich den Pfad nenne.
> Nach jeder Weisung: Wortlaut mit Datum in `CLAUDE.md` (*Entschieden*),
> Kontrollenzahl und `INITIALPROMPT.md` nachführen, committen.
>
> Was offen ist, steht oben in `INITIALPROMPT.md` (*Nächster Schritt*) und
> in `CLAUDE.md`, *Offene Punkte*. Melde mir kurz den Stand (letzter Commit,
> Prüfstand) und frag mich, womit wir weitermachen.

---

## Wenn die nächste Sitzung unter einem anderen Konto läuft

**Am Projekt ändert sich nichts** — es liegt nicht im Benutzerordner. Auf
demselben Rechner sind `data/*.json`, `Grundlagen/`, `Versand/` und
`pruefung_axisvm/` weiter da (sie stehen nur nicht in der Ablage), AxisVM
antwortet weiter über COM, und die Git-Anmeldung hängt am Windows-Benutzer,
nicht am Konto — pushen geht also (ein grüner Stand, Weisung 2. Oktober).

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
node pruefung.mjs           # Pruefstand, 7167 Kontrollen - muss gruen bleiben
node durchlauf.mjs          # Durchgang durch alle Wege je Tragwerksart
node datenpaket.mjs         # Datenstand aus data/ als Paket nach Versand/
node modell_beispiele.mjs   # Beispielblaetter A/B fuer AxisVM nach com/
node modell_typen.mjs       # alle Tragjoch-Typen pruefen und fuer AxisVM zusammentragen
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
