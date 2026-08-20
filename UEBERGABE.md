# Übergabe — Stand der Arbeit

Dieses Blatt fasst zusammen, was in der letzten Arbeitssitzung geschehen ist und
was offen bleibt. Es ist als Einstieg für die Fortsetzung an einem neuen Ort
gedacht; die fachliche Beschreibung steht im [README](README.md), die Herleitung
des Rechenwegs im **Handbuch in der Anwendung** (Knopf `ⓘ` im Banner, Quelle
`js/doku.handbuch.js`).

**Stand:** 615 Kontrollen bestanden, 0 gefallen · Bundle 845 kB (674 kB ohne Daten) · Ablage-Format v2 · installierbar (PWA)

---

## Arbeiten am Projekt

```bash
python3 serve.py            # Modulversion:  http://localhost:8731/index.html
python3 build_html.py       # bündelt js/ + css/ -> vierendeel_tool.html
                            # und frischt sw.js auf (Ablageliste + Fassung)
node pruefung.mjs           # Prüfstand, 615 Kontrollen
```

Der Port kommt aus der Umgebungsvariablen `PORT`, sonst aus dem Aufruf, sonst
8731. Nach jeder Änderung an `js/` oder `css/` **neu bündeln** — die
eigenständige Datei wird sonst still veraltet.

---

## Diese Sitzung

### Installierbar und ohne Netz (PWA)

Neu: `manifest.webmanifest`, `sw.js`, `js/pwa.js`, `icons/` (aus
`make_icons.py`). Die Modulversion lässt sich auf dem Gerät **installieren**
und startet danach **ohne Verbindung**. Abgelegt wird die ganze Schale —
`index.html`, Stylesheet, alle Module, die drei `data/*.json`, die Symbole.

Zwei Entscheide, die man kennen muss:

* **Die Ablageliste wird erzeugt, nicht gepflegt.** `build_html.py` schreibt
  Dateiliste und eine Fassungskennung (Kurzabdruck über den Inhalt) in den
  markierten Block in `sw.js`. Von Hand gepflegt liefe die Liste den Modulen
  hinterher — genau dann fehlte offline eine Datei. **Folge: nach jeder
  Änderung `python3 build_html.py`**, sonst liefert der Dienstarbeiter alt aus.
* **Auf localhost meldet sich der Dienstarbeiter ab, nicht an.** Beim Arbeiten
  an den Modulen wäre eine Ablage mit altem Stand nur eine Fehlerquelle. Zum
  Ausprobieren `?sw=1`, zum Aufräumen `?sw=0`.

Eine neue Fassung übernimmt **erst auf Zuruf**: unten rechts erscheint ein
Balken «Eine neue Fassung ist bereit», und erst der Druck auf *Neu laden*
tauscht aus. Ein Rechenstand darf nicht mitten in einer Eingabe wechseln.

Die gebündelte Einzeldatei bleibt aussen vor: `build_html.py` entfernt die
Manifest-Zeile, `js/pwa.js` erkennt daran, dass es still zu bleiben hat.

**Zur Frage nach GitHub Pages:** ja, die Datei muss `index.html` heissen. Der
Ordner wird abgelegt, wie er ist; `start_url` und `scope` sind relativ und
tragen deshalb auch einen Unterpfad.

### COM-Brücke zu AxisVM — halb gebaut

Die Lizenzfrage, an der der SAF-Weg gescheitert ist, stellt sich hier nicht:
der Auftraggeber nutzt die COM-Schnittstelle bereits mit anderer Software.
Gerechnet wird gegen die **neuste AxisVM-Fassung**, aufgebaut wird ein **neues
Modell**.

**Kein Python auf dem Windows-Rechner** — deshalb PowerShell. Das ist auf jedem
Windows vorhanden, kann COM von Haus aus und braucht keine Installation. Der
frühere Python-Prüfer ist gelöscht.

Gebaut:

* **`com/AxisVM_pruefen.ps1`** + `.cmd` (Doppelklick). Startet AxisVM, legt ein
  LEERES Modell an, liest über `Get-Member` die Typbibliothek aus und schreibt
  `AxisVM_schnittstelle.txt`. Erkundend — öffnet, ändert und speichert keine
  Datei. Grund: die Namen der COM-Objekte verschieben sich zwischen den
  Fassungen; ein blind geschriebenes Skript scheitert erst mitten im
  Modellaufbau.
* **JSON-Ausleitung** (`stabmodellJson` / `exportiereJson` in
  `js/export.axisvm.js`, im Ausleitungsdialog als eigenes Format). Dasselbe
  Stabmodell wie SAF und DXF — eine Quelle, jetzt vier Verpackungen. J90 über
  20 m: 566 Knoten, 680 Stäbe, 8 Querschnitte, 4 Lastfälle.
* **`com/LIESMICH.md`** mit dem Ablauf in drei Schritten.

**Offen: `AxisVM_aufbauen.ps1`** — das Skript, das das JSON liest und das Modell
aufbaut. Es braucht die Ausgabe aus Schritt 1; ohne sie wären die Methodennamen
geraten.

### Vorzeichenrichtige Überlagerung je Blechebene — gebaut### Vorzeichenrichtige Überlagerung je Blechebene — gebaut

Neue Option `ebenenUeberlagerung` (Optionen → Torsion), **Vorgabe bleibt die
Hüllkurve**. Vorzeichenrichtig gerechnet unterscheiden sich Ober- und
Unterblech wie im FEM.

**Die Vorzeichen sind nicht hergeleitet, sondern an PyNite kalibriert.** Zwei
Läufe, J70 über 10 m, Stabmodell mit 714 Stäben:

| Fall | PyNite | Werkzeug |
|---|---|---|
| Wind y, Angriff 1.35 m **unter** der Achse | Unterblech trägt 63–82 % | 66–75 % |
| Vertikallast, 1.20 m **seitlich** versetzt | rechte Ebene trägt 64 % | 62.5 % |

Der Anteil je Ebene trifft auf 1–4 Prozentpunkte; die Summe beider Ebenen auf
0.6–10 %. Nahe am Anbauteil ist kein Vergleich möglich — dort verspannt das
starre Anschlusskreuz des Ausleitungsmodells die Bleche (bekannter offener
Punkt).

**Zwei Fallstricke, beide unterwegs gefunden:**

1. *Die Querkraft muss MIT Vorzeichen in die Überlagerung.* Erst stand dort
   `|V|/2` und nur die Torsion vorzeichenbehaftet — dann sprang die
   massgebende Ebene am Anbauteil auf die andere Seite. Falsch: Querkraft und
   Torsion wechseln dort **gemeinsam** das Vorzeichen (beide laufen vom
   Angriff zu den Auflagern), ihr Verhältnis bleibt. PyNite zeigt dieselbe
   Ebene auf beiden Jochhälften.
2. *Der Drehsinn war zweimal falsch geraten* — einmal bei den Horizontal-,
   einmal bei den Vertikalebenen. Beide Male hat erst der Stablauf entschieden.

**Was sich NICHT ändert: das höchste η.** Auf der Ebene, wo Querkraft und
Schubfluss gleichsinnig laufen, ist `|V + T| = |V| + T` — genau die Hüllkurve.
Vorzeichenrichtig zu rechnen entlastet also nur die andere Ebene und senkt
niemals den massgebenden Nachweis. Das steht als Prüfung im Prüfstand
(Abschnitt 23, neun Kontrollen), zusammen mit der Spiegelsymmetrie und dem
Rückfall auf die Hüllkurve, wenn der Torsionsverlauf selbst eine Hüllkurve ist.

Der **örtliche Anteil** aus der Lasteinleitung bleibt in beiden Wegen additiv
auf beiden Ebenen — sein Vorzeichenabgleich gegen den St-Venant-Schubfluss ist
eine eigene, noch offene Frage.

### Oberfläche — Suchfeld, Lage-Schieber, Diagramme

* **Suchfeld folgte dem Thema nicht.** `input[type=search]` fehlte in der
  Auswahlliste der Formularfelder — der Browser zeichnete es selbst, weiss auf
  dunkel. Dazu setzt `uebertrageTokens` jetzt `color-scheme`, damit auch
  Rollbalken, Kreuzchen und aufgeklappte Listen mitgehen.
* **Lage x als Schieber** in der Anbauteil-Karte, Bereich 0 … Jochlänge, über
  die ganze Kartenbreite. Zahlenfeld und Schieber tragen denselben `data-k`;
  `aktualisiereMaske` hält sie von selbst zusammen.
* **Diagramme: das ganze Bild ist der Knopf.** Ein Klick irgendwo ins Diagramm
  holt es ins Modellfenster. Das Symbol oben rechts bleibt (es sagt, dass es
  geht) und ist von 12 auf 15 px gewachsen, mit einem Aufziehen-Zeichen statt
  der Lupe.
* **Kraftbilder zu den Kurven** (`js/render.skizzen.js`): ein Klick auf einen
  Legendeneintrag klappt unter dem Diagramm eine kleine Skizze auf — was M_y,
  V_z, M_z, T_x, die Ebenenquerkraft, das örtliche Gurtmoment und η am Joch
  bedeuten. Dieselbe Bildsprache wie im Handbuch, aber dort, wo man gerade
  hinschaut.
* **Klick auf ein Bauteil im Modell** — geprüft: öffnet dessen Karte, schliesst
  alle übrigen, wechselt auf den Reiter «Anbauteile», fährt die Schublade aus,
  falls sie eingeklappt war, und zoomt auf das Teil. Funktioniert wie gedacht.

### Ausleger: Wind über die Fahrleitung abtragen

`windAufTraeger()` in `js/data.anbauteile.js`, Schalter **«Fahrleitung als
Auflager ansetzen»** in der Anbauteil-Karte unter «Lasteintrag des Auslegers».
Er erscheint nur, wo die Baugruppe einen **Träger** (Rolle `traeger`) UND einen
**Aufbau** (Rolle `aufbau`) hat — ohne beides gibt es keinen Zweifeldträger.

**Das Modell** (vom Auftraggeber vorgegeben, hier nur umgesetzt): das äussere
Ende des Auslegers hält die Fahrleitung; die ist durch den Leiterzug seitlich
gespannt und wirkt dort als **Auflager**. Der Wind auf den Ausleger verteilt
sich damit auf zwei Auflager — die eine Hälfte nimmt die Fahrleitung auf und
trägt sie längs zu den Nachbaraufhängungen ab, die andere geht in den Träger.

Was das im Rechenkern heisst:

* Die WindY-Kraft der **Aufbauten** wird auf den eingestellten Anteil
  reduziert. Der Rest verlässt dieses Joch — er kommt an den
  Nachbaraufhängungen an.
* Der Eintrag rückt **in y** auf die Achse des Trägers. **Die Höhe z bleibt**,
  wo der Ausleger sitzt; sein Hebelarm zur Jochachse ändert sich nicht.
* Unangetastet: Eigengewicht, Schnee, Wind in x — und die **Drahtwerke**.
  Deren Windlast ist über `L_FL` bereits der Anteil, der an DIESER Aufhängung
  ankommt; sie ein zweites Mal zu halbieren wäre doppelt gezählt.

J90 / 20 m, Hängestütze mit NT-Ausleger in Jochmitte: `T_x` 2.033 → 1.430 kNm,
**η 0.821 → 0.648**. Bei 100 % ändert sich nichts — dann nimmt die Fahrleitung
nichts ab.

> **Frühere Fassung war falsch.** Zuerst hatte ich die Kraft in **z** zum Joch
> hin verschoben und dabei ihren Betrag erhalten. Das verkürzt den Hebelarm,
> statt die Last aufzuteilen, und widerspricht dem Bild vom Zweifeldträger.
> Richtig ist: der Hebelarm bleibt, die Kraft wird kleiner.

Der Anteil ist eine **zulässige Modellannahme, kein gerechneter Wert** —
deshalb von Hand zu setzen und standardmässig aus. Prüfstand Abschnitt 22,
zwölf Kontrollen.

### Bemassung im Modell: Zahl in der Flucht der Masslinie

Die Masszahlen standen waagrecht in einem gerahmten Kästchen und trugen bei
Anbauteilen zusätzlich den Bauteilnamen (`Hängestütze od. Hängerohr: z = …`).
Über einer schrägen Masslinie braucht das ein Vielfaches an Fläche, und bei
mehreren Höhen derselben Baugruppe lagen die Kästchen ineinander.

Jetzt:

* **Kein Name mehr in der Bemassung** — sie sagt das Mass. Der Name steht als
  Marke am Teil und im Tooltip.
* **In der Flucht der Masslinie** gedreht, nie auf dem Kopf (Winkel auf
  ±90° gefaltet). Eine Zeichnung liest sich von links und von unten.
* **Kein Kasten**, sondern ein Saum in der Hintergrundfarbe — dieselbe Lösung
  wie bei den Bauteilanschriften.
* **Gemeinsame Freihaltung**: `this._belegt` wird je Bild einmal angelegt und
  von Bemassung UND Anschriften genutzt. Vorher hatte jede ihre eigene Liste
  und wusste nichts von der anderen. Was keinen Platz findet, entfällt.

### Lastmarkierungen durchsichtiger

Der Würfel am Angriffspunkt ist eine **Marke, kein Bauteil**; als voller Körper
deckte er den Gurt darunter zu. Er wird jetzt immer mit mindestens 62 %
Durchsicht gezeichnet (`punkt: true` in `render.3d.js`), auch wenn die
Darstellung sonst undurchsichtig ist. Der Ring des Lastknotens sitzt auf
halber Deckkraft in `on2` statt voll in `on`.

### Normalkraft in Jochachse war nirgends abzulesen

Sie wurde immer schon gerechnet — flächenproportional als `N_ax` in jedem
Winkel (`core.querschnitt.js`) —, stand aber in **keiner Auswertung**: weder in
den Kacheln der Übersicht noch in denen des Schnitts. Man konnte nicht einmal
sehen, ob sie null ist.

Jetzt: `extremwerte()` führt `NxMax`/`xNxMax` mit, die Übersicht zeigt
`max N_x` (und `max V_y`, die ebenso fehlte), der Schnitt `N_x,ed` und
`V_y,ed`, und unter der Eckwinkeltabelle steht, dass die Spalte `N` diesen
Anteil enthält. Prüfstand: Abschnitt 21, neun Prüfungen — Aufteilung auf die
Auflager, Summe über die vier Winkel, und dass sie ohne Längslast null bleibt.

### Oberfläche — drei kleine Dinge

* **Vorlagenkacheln gleich gross.** `.kacheln` bekommt `grid-auto-rows: 1fr`,
  Kachel und Hülle füllen ihre Zelle (`width/height: 100%`). Vorher war ein
  `<button>` so breit wie sein Inhalt: 90 bis 167 px nebeneinander.
* **Lange Hilfetexte klappen ein.** `hinweisHtml()` in `ui.js` zeigt den
  **ersten Satz** und hängt «mehr» an; der Rest kommt auf Klick, der Zustand
  hängt am gemeinsamen Klapp-Gedächtnis. Ein einzelner langer Satz wird
  **nicht** zerschnitten. Betrifft alle Schemafelder (Radius, Spannweite …)
  und die Anbauteile; der Achsen-Text im Vorrat ist eine eigene Klappe
  geworden, damit die Kacheln oben stehen.
* **Farbbalken der Legende war zu kurz.** Er war fest 132 px breit, der Kasten
  aber so breit wie seine Fussnote (~200 px) — der Balken sass kurz darin und
  die Skalenwerte standen nicht über seinen Enden. Jetzt `width: 100%` bei
  fester Fussnotenbreite: gleiche Breite bei jedem Plot.

### Rechenkern — örtliche Feldweiten statt des Mittels

`M_K` des Bindeblechs und `M_Knoten` des Gurtes rechneten mit `a1eff`, der
**mittleren** Feldweite. Die Mass-Tabelle teilt aber ungleich (J70 über 10 m:
aussen 0.75 m, innen 0.66–0.67 m). Jetzt zählt für das **Blech die Summe** der
beiden Nachbarfelder, für den **Gurt das breitere** von beiden; am Jochende das
eine vorhandene. Bei gleichen Feldern kommt die frühere Form heraus.

Wirkung: **+5.9 % bei 10 m, +3.4 % bei 16 m, nichts ab etwa 24 m** — vorher lag
es an den breiten Feldern auf der unsicheren Seite. Gefunden beim Aufschlüsseln
der Horizontalebenen für den AxisVM-Vergleich.

### Ausleitungen gebaut — drei Wege

`js/export.axisvm.js` schreibt **SAF** (Excel, offen, von AxisVM lesbar) und
**DXF**; `js/export.pynite.js` schreibt ein lauffähiges **PyNite-Skript**.
Alle drei verpacken dasselbe Stabmodell aus `stabmodell()`.

**SAF scheitert an der Lizenz:** AxisVM meldet beim Import „SAF-Interface ist in
dieser Konfiguration nicht enthalten" — das Interface ist ein kostenpflichtiges
Modul. Deshalb der DXF-Weg (Geometrie auf Querschnittsebenen, Zuweisung von
Hand nach dem Blatt `Zuordnung`) und die PyNite-Gegenrechnung.

**PyNite ist gelaufen und stimmt**: J70 über 10 m, fünf Feldschnitte, je
Einwirkungsgruppe — `M_y` und `M_z` auf **0.1 %**, `V_z` und `V_y` auf 0.6 %,
`T_x` auf 3–5 %. Biegung und Querkraft des Ersatzbalkens sind damit unabhängig
bestätigt. PyNite bleibt **kein geprüftes Programm**; für die Abgabe ist AxisVM
die Instanz.

### Farblegende gegen die Plots geprüft

Die Skalenenden der vier gerechneten Plots (σ_v, σ, M, V) treffen den
Höchstwert im Modell auf die letzte Stelle; η hat bewusst eine feste Skala bis
1.25. Zwei Mängel gefunden und behoben:

* **Der M-Plot zeigte am Gurt nur `M_y`.** Sobald der Wind regiert, ist `M_z`
  das grössere (beim J90 über 20 m: 0.997 gegen 0.951 kNm) — der Gurt wurde zu
  günstig eingefärbt. Jetzt wird das grössere der beiden aufgetragen, und die
  Fussnote sagt es.
* **σ_v heisst am Gurt etwas anderes als am Blech.** Am Gurt ist es die Summe
  der Normalspannungen (N + örtliche Biegung), am Blech von Mises aus σ und τ.
  Dieselbe Legende für zwei Grössen — jetzt steht es als Fussnote dabei.

Dazu trägt η jetzt den Vermerk, dass 1.25 die Marke ist und nicht das Maximum.
Nur die **Einfärbung** war betroffen, keine Nachweiszahl.

### Handbuch als eigenständige Datei

`handbuchDatei()` in `js/doku.handbuch.js`, Knopf **Als Datei sichern** im
Handbuch-Dialog. Ein vollständiges HTML-Dokument mit Verzeichnis als echten
Sprungmarken, allen elf Abschnitten und zehn Skizzen, rund 99 kB.

Fallstrick, der beim Prüfen auffiel: die Farbtokens setzt die Anwendung zur
Laufzeit per JS auf `:root`. Eine eigenständige Datei führt kein Skript aus —
ohne den eingebetteten `:root`-Block stand dunkler Text auf dunklem Grund.
Genommen wird das **helle** Thema; die Datei ist zum Lesen und Drucken.

### Ablage: umbenennen und Projekte

`umbenennen(id, {name, projekt, bemerkung})` und `projektUmbenennen(alt, neu)`
in `js/store.js`, dazu zwei Dialoge und je ein Stift-Knopf in der
Bannerschublade — einer je Eintrag, einer je Projektgruppe. Die Eingabewerte
bleiben dabei unangetastet; geändert wird nur die Beschriftung. Mehrere Joche
unter einem Projekt konnte die Ablage schon vorher, es liess sich nur nichts
nachträglich ändern.

### Datenpaket: Anwendung ohne Betreiberdaten weitergeben

`js/data.paket.js` und `python3 build_html.py --ohne-daten`. Die datenfreie
Ausgabe (`vierendeel_tool_ohne_daten.html`, 647 kB) fragt beim Start nach einem
Datenpaket; es wird nur im Browser hinterlegt. Knopf **Datenbasis** im Banner
zum Laden, Sichern und Löschen.

**Alle Betreiber- und Zeichnungsnummern sind aus dem Code entfernt** (25
Stellen in `js/`, dazu Handbuch-Abschnitt 1) und ebenso aus README und
Übergabeblatt. Sie stehen jetzt ausschliesslich in den Daten.

Vor jeder Weitergabe gegenprüfen — die eigenen Kürzel und Zeichnungsnummern in
das Muster einsetzen:

```bash
grep -rniE "betreiber|abteilung|[0-9]{4}\.[0-9]{4}" js/ index.html *.md
```

Zu erwarten ist ein Fehltreffer: das Wort `ANGRIFFSPUNKT` enthält das Kürzel
einer Bahngesellschaft als Teilwort.

### Mastanschluss wählbar: Kragarm oder durchlaufend

Neue Option `mastAnschluss` (`core.auflager.js`, `MASTANSCHLUESSE`):
`kragarm` = `E·I/H` wie bisher (Voreinstellung), `durchlaufend` = `2·E·I/H`.

Anlass: der Abgleich mit einem geprüften AxisVM-Bericht (J90, 15.5 m, HEB 260).
Dort läuft der Mast 1.0 m über die Anschlussebene hinaus und das Joch ist über
seine ganze Höhe angeschlossen — der Anschluss verhält sich wie rund
8000 kNm/rad, `E·I/H` liefert 4178. Mit dem Faktor 2 trifft unsere
Momentenaufteilung das FEM (4.71 / 9.51 gegen 4.44 / 9.31 kNm), ohne ihn nicht
(3.13 / 11.09).

**Voreinstellung ist `durchlaufend`** (auf Weisung).

**Der Faktor ist 1.45, nicht 2.** Gemessen an einem PyNite-Modell mit
ausmodelliertem Mast: gesucht wurde die Drehfeder, die im gleichen Stabmodell
dasselbe Feldmoment liefert — 5743 kNm/rad bei Anschluss in einem Punkt
(1.37 · E·I/H), 6074 bei Anschluss über die Jochhöhe (1.45).

Die frühere Zahl 2 stammte aus einem Vergleich unseres Ersatzbalkens mit dem
AxisVM-Bericht, bei dem ich das «Stützmoment» des Stabmodells aus der ersten
FELDMITTE gelesen habe — der Ersatzbalken kennt es am Auflager. Der Vergleich
war damit falsch aufgesetzt; die Zahl 2 ist zurückgezogen.

**Die Schubweichheit braucht es nicht.** Ersatzbalken und Vierendeel-Stabmodell
liefern bei gleicher Drehfeder über den ganzen Federbereich dasselbe Feldmoment
(0.2 %). Der zuvor vermutete Fehlbetrag existiert nicht.

### Endschott: tragend, nur die Ausgabe schaltbar

`stabmodell({ schottAusblenden: true })` und ein Häkchen im Ausleitungsdialog.
Das Schott bleibt **immer** im Modell — es ist ein tragendes Bauteil; geschaltet
wird nur, ob seine Stäbe in den Resultattabellen erscheinen.

Es steift den Endbereich aus und zieht Querkraft und Torsion im Randfeld an
sich: dort weicht das Stabmodell bis +34 % (`V_y`) und −20 % (`T_x`) vom
Ersatzbalken ab, während Moment und Querkraft auf 0.2 % stimmen.

### Altbauweise: Gelenk am Auflager

Vorgabe des Auftraggebers. Die Wahl eines Alttyps setzt die Endbedingung auf
`gelenkig` (`typUebernehmen`); wird sie von Hand geändert, meldet
`core.checks.js` einen Hinweis. Der Anschluss der alten Joche ans Mast trägt
kein Einspannmoment.

### Drehfeder durch die Gurtverbindung begrenzt (gebaut)

`begrenzeFeder()` in `core.auflager.js`, aufgerufen aus `modell()`. Das
Stützmoment tritt als Kräftepaar zwischen Ober- und Untergurtanschluss in den
Mast (`F = M_Stütze / h`); die Feder wird iterativ herabgesetzt, bis die
Grenzlast eingehalten ist. Zwei neue Eingaben: Schalter
`schraubenGrenze` (an) und `schraubenFgrenz` (**24 kN**, Horizontalkraft je
Gurtanschluss). «Voll eingespannt» ist ausgenommen.

Die Feder hängt damit vom **Lastniveau** ab und kann je Lastfall anders
ausfallen. Wirkung (HEB 260, H 7.5 m, massgebender Lastfall, mit Hängestütze):
J70 12 m und J90 15.5 m unberührt (14.7 bzw. 18.4 kN), J90 24 m auf 1765 und
J130 30 m auf 2151 kNm/rad herabgesetzt — bei den langen Jochen bestimmt die
Verbindung die Einspannung fast allein.

**Offen:** ob 24 kN je Gurt der richtige Wert ist und ob die Grenzlast als
Horizontalkraft oder als Moment am Anschluss zu führen ist, ist mit dem
Auftraggeber zu bestätigen.

### Frühere Notiz zur Grenze der Drehfeder

Der Anschluss Joch–Mast läuft **je Gurt** über Schrauben. Im AxisVM-Modell wird
die Einspannung **iterativ** bestimmt — so weit, dass deren Grenzlast nicht
überschritten wird. Unsere Feder ist linear und kennt diese Grenze nicht: das
Stützmoment ist gegen die Tragfähigkeit der Gurtanschlüsse zu prüfen und die
Feder nötigenfalls zu reduzieren. Als Modellgrenze in `core.auflager.js` und im
README vermerkt; **eine Begrenzung im Rechenkern ist nicht gebaut** — das wäre
der nächste Schritt, wenn die Schraubenwerte vorliegen.

### Voreinstellung Torsionsverlauf

`torsionModell` startet neu auf **`verteilt`** statt `huellkurve`. Grund: der
Vergleich mit AxisVM lag damit deutlich näher (rund 15 % an den massgebenden
Horizontalblechen statt weit mehr). Gespeicherte Stände behalten ihre eigene
Einstellung. **Setzt Gabellagerung voraus** — beim Joch auf Masten zu prüfen.

---

## Frühere Sitzung

### Rechenkern — drei Änderungen, die Zahlen bewegen

Alle drei wurden vorgängig mit dem Auftraggeber abgestimmt.

1. **z zählt ab der Anschlussebene** (`core.anbauteile.js`, `hebelarmZuAchse`).
   `e_v = −(z_A + z)` mit `z_A = ±h/2`. Vorher mass die Rechnung ab der
   Jochachse, die Zeichnung ab der Gurtschwerachse — beim J90 225 mm
   Unterschied. Torsion einer Hängestütze `z = −1.35 m`: **+17 %**.

2. **Lasteinleitung linear auf die zwei Nachbarbleche** (`stationsAnteil`).
   Vorher fiel alles im Fenster ±a₁/2 auf ein Blech; η sprang um über 25 %,
   wenn 5 cm mehr Raster die Einleitung ins Nachbarfeld kippen liessen. Jetzt
   ist der grösste Schritt über den Bereich 0.60–0.80 m **rund 5 %**.

3. **Gurtmoment am Anschnitt** (`core.querschnitt.js`).
   `M_Anschnitt = M_Knoten · (a₁ − b_Bl)/a₁`, je Richtung mit der Blechbreite
   ihrer Ebene. Damit werden Blech **und** Gurt symmetrisch behandelt: beide am
   Rand des steifen Knotenbereichs. Beim J90 **−14 %**.

### Einwirkungen

* **Vier Gruppen** statt drei: `G`, `WindX`, `WindY`, `Schnee`. Der Wind läuft in
  zwei Richtungen, die nie gleichzeitig wirken; jede geht mit `+` und `−` in die
  Kombination. Der frühere Schalter „günstig / ungünstig" ist damit entfallen.
* **Radius und Ablenkwinkel vorzeichenbehaftet** — die Bogenseite steckt in der
  Geometrie, nicht in einem Schalter. `U = Z·L/R` ist exakt, keine Näherung.
* **Acht Standardlastfälle**: zwei charakteristische (kein Nachweis) und je
  Windrichtung sowie Schnee einer mit beiden Vorzeichen.
* Lasteingabe gegliedert in **Angriffspunkt / Kraft / Moment**.

### Oberfläche

* Sidebars klappen auf schmale **Schienen** ein; rechts stehen dort die
  Hauptnachweise senkrecht angeschrieben.
* **Bannerschublade** mit Projektablage und Vorlagen ganzer Tragwerke.
* 3D-Werkzeuge nach **Modell / Lasten / Resultate** gruppiert, je mit
  Hauptschalter; ausgeschaltete Gruppen bleiben ausgegraut stehen.
* **Layersteuerung folgt dem Lastfall** — was im gewählten Fall nicht vorkommt,
  ist tot geschaltet.
* **Übersicht der Anbauteile**: eine Zeile je Teil, nach Gleis gruppiert, nur die
  angeklickte Karte offen; ab vier Teilen ein Suchfeld, das im Browser filtert.
* **Vorlagen anpassbar** über Stift oder Rechtsklick (Katalog bleibt unverändert,
  es entsteht eine eigene Kopie). Leiter **N-FL, R-FL, RL** (Rückleiter Cu 95)
  als Kacheln.
* **Esc** räumt von aussen nach innen ab: Dialog → Schublade → Einzelheit →
  Auswahl → Diagramm → Zoom.
* Legende verschiebbar, Werte anschreibbar, Gurtachsen in Plotfarbe.

### Modellansicht — Beschriftung und Leistung

* **Kurzbenennung der Anbauteile**: nur die Position (`A1`), 8.5 px, ohne Rahmen,
  lesbar über einen Saum in der Hintergrundfarbe. Angeklickt kommt der Name dazu.
* **Anbauteile einfarbig grau** — ausgenommen der Plot „Positionen", dort *ist*
  die Farbe die Aussage.
* **Zoomen entstockt** (war nach der Marken-Ausdünnung ins Stocken geraten):
  * `zeichne()` fordert nur noch ein Bild an, gemalt wird höchstens einmal je
    Bildwechsel (vorher malte **jedes** Radereignis ein volles Bild),
  * Schriftfamilie und Textbreiten werden gemerkt statt je Text neu erhoben
    (`getComputedStyle` / `measureText` fielen vorher hundertfach je Bild an),
  * Flächennormale, Schattierung und Füllfarbe hängen nicht an der Kamera und
    bleiben stehen; die Projektion rechnet ohne Zwischenvektoren,
  * Umrisse unter 2.5 px fallen weg — man sieht sie nicht, sie kosten aber je
    einen Zeichenbefehl.
  * Gemessen am J130, 34.5 m, 47 Stationen: **12.8 ms je Bild statt 19 ms**.

### Handbuch (neu)

`js/doku.handbuch.js` — elf Abschnitte mit mitlaufendem Verzeichnis, druckbar
(beim Drucken nur das Handbuch). Abschnitt 10 **Modellgrenzen** zählt auf, was
das Werkzeug nicht rechnet und in welche Richtung jede Vereinfachung wirkt.
**Zehn SVG-Skizzen**, aus den Grössen der Formeln gebaut und mit deren
Bezeichnungen angeschrieben, themenfolgend gefärbt.

---

## Stehende Vorgaben des Auftraggebers

> **Die Geometrie der Jochträger (neu wie alt) ist im Detail zu übernehmen —
> eine Anpassung der Blecheinteilung ist nicht zulässig.**

> **Entscheide, die für die Auswertung der Spannungsverläufe bzw. die Nachweise
> erheblich sind, vorgängig nachfragen** statt selbst festzulegen.

Beides ist mehrfach bestätigt worden und gilt weiter.

---

## Bereit für Push und Versand

**Ablage** — `git init` ist gelaufen, ein Stand ist eingecheckt, **kein Remote,
kein Push**. Das bleibt Ihre Entscheidung.

52 Dateien, geprüft auf Betreiberbezüge: **keine**. Draussen bleiben über
`.gitignore`:

| | |
|---|---|
| `data/*.json` | die drei Datenbanken — sie machen die Ablage sonst nicht-öffentlich |
| `Grundlagen/`, `*.axs`, `*.axe`, `*.pdf`, `*.docx`, `*.xlsx` | Projektunterlagen |
| `vierendeel_tool*.html` | Erzeugnisse von build_html.py; die vollständige trägt die Zahlen eingebettet |
| `generate_vierendeel_L_SZS_C5.py` und die zwei Excel-Prüfer | nennen Betreiber und Zeichnungsnummern im Klartext, ausserdem nicht mehr synchron |
| `Versand/`, `.claude/settings.local.json` | Erzeugnisse und örtliche Einstellungen |

> **Eine Entscheidung steht noch aus:** öffentlich oder privat. So wie es jetzt
> steht, ist die Ablage **öffentlich tragbar** — ohne Daten, ohne
> Betreiberbezug. Für eine **private** Ablage die vier Zeilen um `data/*.json`
> aus der `.gitignore` nehmen; dann liegt alles beisammen und `build_html.py`
> bettet die Zahlen wieder ein.

`build_html.py` verträgt jetzt fehlende Datenbanken: es baut dann von selbst
die datenfreie Ausgabe statt abzubrechen. Für GitHub Pages muss die Datei
`index.html` heissen — sie heisst so.

`pruefung.mjs` **braucht** die drei `data/*.json`. In einer öffentlichen Ablage
laufen die Kontrollen erst, wenn das Datenpaket örtlich danebenliegt. Das steht
so im README.

**Versand** — der Ordner ist frisch:

```
Versand/
  vierendeel_tool_ohne_daten.html   681 kB   Doppelklick, keine Installation
  Tragjoch_Datenpaket_2026-08-20.json 137 kB 14 Typen, 14 Vorlagen, 60 Bauteile
  Tragjoch_Handbuch.html            108 kB   mit den neuen Abschnitten 5.3 und 7.5
  LIESMICH.txt                               Inbetriebnahme in drei Schritten
```

Das Handbuch ist neu gesetzt und trägt jetzt beides: die **Überlagerung je
Blechebene** (5.3, mit der Warnung, dass beide Anteile das Vorzeichen tragen
müssen) und die **Fahrleitung als Auflager** (7.5). Auf SBB-Bezüge geprüft:
keine.

---

## Offene Punkte

| Punkt | Stand |
|---|---|
| **Sammelaktionen** in der Anbauteil-Übersicht („alle Teile dieser Vorlage bearbeiten", z. B. bei allen Hängestützen auf einmal den Winkel setzen) | aus dem angenommenen Vorschlag noch nicht gebaut |
| **Angepasstes Joch als eigenen Typ speichern** | offen |
| **Excel-Generator** (`generate_vierendeel_L_SZS_C5.py`, `js/export.xlsx.js`) | nicht mit dem aktuellen Kern synchron |
| **AxisVM-Export** | gebaut (`js/export.axisvm.js`, SAF). Der Import in AxisVM ist noch nie gelaufen — siehe unten |
| **Vorzeichenrichtige Überlagerung je Blechebene** | gebaut als Option, an PyNite kalibriert — Vorgabe bleibt die Hüllkurve |
| **Örtlicher Anteil vorzeichenrichtig** | offen — er wird weiter auf beiden Ebenen addiert |

### Warum Ober- und Unterblech in der Hüllkurve dasselbe η haben

Im FEM unterscheiden sich die beiden Blechverbindungen einer Richtung deutlich;
hier nie. Das ist **gewollt und dokumentiert, aber grob**: `ebenenQuerkraefte()`
in `core.querschnitt.js` bildet

```
max = |V_Balken|/2 + |V_Torsion| + |V_lokal|
```

und `schnittAuswertung()` gibt **allen vier Ebenen denselben Wert** — jede Ebene
bekommt die Hüllkurve der ungünstigsten. `EBENEN` trägt bereits ein Feld
`vorz: ±1`, und `ebenenQuerkraefte` rechnet bereits ein `min` aus; **beides wird
nirgends benutzt**.

Physikalisch ist die Sache einfach: der Bredt-Schubfluss LÄUFT UM. Er addiert
sich auf der Ebene, zu der die Last exzentrisch sitzt, und zieht auf der
gegenüberliegenden ab:

```
V_H,oben  = V_y/2 + T/(2h)
V_H,unten = V_y/2 − T/(2h)
```

Wie gross der Unterschied ist, zeigt derselbe Schnitt (J90 / 20 m, Hängestütze
mit NT-Ausleger, x = 0.38 m): Vertikalebenen `max = 7.34 kN`, `min = 2.13 kN` —
**Faktor 3.4**. Beide Ebenen werden derzeit mit 7.34 kN nachgewiesen.

Das liegt auf der sicheren Seite und stimmt für die massgebende Ebene mit dem
FEM überein; die zweite wird überschätzt. **Der vorzeichenrichtige Weg ist
inzwischen gebaut** (Option `ebenenUeberlagerung`, siehe oben) — die Hüllkurve
bleibt die Vorgabe.

### Stand des AxisVM-Exports

Gebaut ist der **Einwegpfad**: das Werkzeug schreibt eine SAF-Mappe
(Structural Analysis Format, offen und von AxisVM lesbar), AxisVM rechnet, die
Ergebnisse werden im Blatt `Vergleich` gegen die eigenen Zahlen gestellt.
Beschreibung im [README](README.md), Abschnitt *AxisVM-Export*.

Das **Knotenmodell** ist als Wahl gebaut, nicht als Annahme: `anschnitt`
(steife Knotenbereiche, entspricht diesem Werkzeug) und `schwerachsen`
(AxisVM ohne Zutun). Für einen Vergleich beide rechnen.

**Was noch aussteht:**

* Der **Import in AxisVM ist noch nie gelaufen**. Die Blattnamen und Spalten
  folgen der SAF-Spezifikation (saf.guide), sind aber gegen kein AxisVM
  gehalten worden — hier ist mit einer Runde Nacharbeit zu rechnen. Der erste
  Lauf gehört auf ein kleines Joch, nicht auf den Ernstfall.
* Die **Drehrichtung der Blechquerschnitte** ist am eingelesenen Modell zu
  kontrollieren; SAF legt die lokale Achse nicht eindeutig fest.
* Ob mit `torsionModell: 'verteilt'` verglichen wird, ist nachweisrelevant und
  mit dem Auftraggeber abzustimmen (siehe die Zerlegung weiter unten).

### Zur Frage FEM oder AxisVM

Empfehlung war: **AxisVM-Export ja, eigenes FEM nein.** Ein selbstgebautes FEM
kostet den entscheidenden Vorteil des heutigen Wegs — dass jede Zahl mit
Taschenrechner und Handbuch nachrechenbar ist — und bringt für den Feldnachweis
wenig, weil die Vierendeel-Wirkung bei diesem regelmässigen Tragwerk mit den
Ersatzformeln gut erfasst ist. Der Export dagegen liefert die Verifizierung
durch ein geprüftes Programm und den Zugang zu Stabilität und Verformung.

Vor dem Bauen ist **das Knotenmodell im Einzelnen abzuklären** — es ist die
Entscheidung, an der alles hängt: Gurtstäbe an den Rand des steifen Bereichs,
verbunden über Starrelemente zur Blechachse, sonst rechnet AxisVM auf den
Schwerachsen und liefert systematisch andere Momente. Bleche zunächst als Stäbe
mit Rechteckquerschnitt (direkte Entsprechung zum heutigen Nachweis), Lasten je
Einwirkungsgruppe **getrennt** ausgeben, dazu ein Vergleichsblatt M_y / V_z / T
beider Rechnungen je Station.

---

## Zwei Lehren aus dieser Sitzung

### Das Bundle verträgt weniger als die Modulversion

`import { FARBEN as farben }` ist gültiges ES-Modul, aber der Bündler macht
daraus `const { FARBEN as farben } = …` — und **das** ist ein Syntaxfehler.
Folge: die Modulversion lief einwandfrei, die ausgelieferte HTML zeigte eine
tote, ungestylte Seite ohne Fehlermeldung in der Konsole.

Behoben an drei Stellen:

* `build_html.py` schreibt `a as b` jetzt zu `a: b` um,
* der Build schickt das fertige Skript vor dem Schreiben durch `node --check`
  und **bricht ab**, statt eine kaputte Datei abzulegen,
* die Prüfung ist gegengeprüft: mit absichtlich zerstörtem Code bricht der
  Build tatsächlich.

**Regel:** nach jeder Änderung an `js/` nicht nur `serve.py` ansehen, sondern
die gebündelte Datei einmal öffnen. Was in Modulen läuft, läuft nicht
zwangsläufig gebündelt.

## Eine Lehre aus einer früheren Sitzung

Ein Hilfsskript hat `js/ui.js` zerstört: eine Textersetzung, deren Suchmuster aus
einem Ausschnitt abgeleitet war und leer blieb — Pythons `str.replace('', neu)`
fügt den Ersatz dann **zwischen jedes Zeichen** der Datei ein (280 MB). Die
Operation war umkehrbar und die Datei wurde unversehrt wiederhergestellt.

**Regel:** kein `str.replace` mit einem Muster, dessen Nichtleerheit nicht
geprüft ist; Änderungen an Quelldateien über das Edit-Werkzeug oder mit
`assert s.count(alt) == 1` davor.
