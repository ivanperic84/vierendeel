# Übergabe — Stand der Arbeit

Dieses Blatt fasst zusammen, was in der letzten Arbeitssitzung geschehen ist und
was offen bleibt. Es ist als Einstieg für die Fortsetzung an einem neuen Ort
gedacht; die fachliche Beschreibung steht im [README](README.md), die Herleitung
des Rechenwegs im **Handbuch in der Anwendung** (Knopf `ⓘ` im Banner, Quelle
`js/doku.handbuch.js`).

**Stand:** 1670 Kontrollen bestanden, 0 gefallen · Bundle 1275 kB · Ablage-Format v2 · COM-Brücke vollständig (Modell, lokale Achsen, Starrkörper, Linkelemente) · **installierbar mit Dateiannahme und Sprungliste** · **Modellnavigation mit Fingern** · **NT-Ausleger als Kragarm** · **Mast im AxisVM-Modell mit Anbauteilen** · **Zeichnung hinterlegbar, Tragwerk selbst erkannt**

---

## Arbeiten am Projekt

```bash
python3 serve.py            # Modulversion:  http://localhost:8731/index.html
python3 build_html.py       # bündelt js/ + css/ -> vierendeel_tool.html
                            # und frischt sw.js auf (Ablageliste + Fassung)
node pruefung.mjs           # Prüfstand, 1670 Kontrollen
```

Der Port kommt aus der Umgebungsvariablen `PORT`, sonst aus dem Aufruf, sonst
8731. Nach jeder Änderung an `js/` oder `css/` **neu bündeln** — die
eigenständige Datei wird sonst still veraltet.

---

## Diese Sitzung

### Die Leiste wird ein Aufriss (2. September)

Weisung: «Die masten in der tragwerkdarstellung klarer ausbilden, nicht als
stummel.» Sie standen als neun Pixel langer Strich unter der Achse — ein
Teilungsstrich auf einem Massstab, kein Bauteil.

Jetzt: **Schaft** vom Joch herunter, **Fundamentklötzchen** unten,
**Geländelinie** darunter. Die Leiste liest sich damit als kleiner Aufriss
des Querprofils — Joche oben, Masten darunter, Boden zuunterst. Der
**geteilte Mast** hat ein breiteres Fundament: er trägt zwei Tragwerke, und
das ist der Unterschied, den man in einer Reihe sofort sehen will.

### Am Masten ziehen ändert den Abstand (2. September)

Weisung: «wie kann ich nachträglich die mastabstände bzw. jochlängen
anpassen?» Man konnte es — über das Feld «Jochlänge jt» drei Abschnitte
tiefer. Nur ist der Mastabstand dort keine Frage nach einem *Abstand*,
sondern nach einer Bauteillänge.

Jetzt am Masten selbst:

| gezogener Mast | was sich ändert |
|---|---|
| Ende A eines Jochs | die **Lage** des Tragwerks, es wandert ganz |
| Ende B eines Jochs | seine **Länge**, das andere Ende bleibt |
| ein **geteilter** Mast | beides: das linke Joch wird länger, das rechte wandert mit |

Der letzte Fall ist der einer Jochreihe an ihrem Zwischenmasten. Im Browser
nachgemessen: den geteilten Masten nach rechts gezogen → T1 von 20.00 auf
**24.85 m**, T2 von x₀ 20.00 auf **24.85** bei unveränderter eigener Länge.

Die Länge bleibt im Sortiment: gezogen wird nur innerhalb des Bereichs, den
der Jochtyp führt.

### Zwei Joche dürfen sich berühren, nicht durchdringen (2. September)

Weisung: «das überschneiden der joche sollte nicht möglich sein.»

**Berühren schon** — das *ist* die Jochreihe, und genau diese Stelle muss
erreichbar bleiben. Verboten ist das Stück davor. `freieLage` schiebt auf die
nächstgelegene erlaubte Stelle statt abzuweisen: wer ein Joch an seinen
Nachbarn heranzieht, meint «bis dorthin». Es gilt für das Ziehen *und* für
das Zahlenfeld — zwei Wege zur selben Angabe mit zwei verschiedenen Regeln
wären eine Einladung, den ungeschützten zu nehmen.

### Was nicht gerechnet wird, redet leiser (2. September)

Weisung: «beim anklicken eines tragwerks beim inaktiven die texte entweder
ganz schwach darstellen oder komplett ausbilden.»

Auf einer Jochreihe standen die Titel aller Tragwerke gleich laut
nebeneinander. **Gedämpft, nicht weg:** ein Titel, der ganz verschwindet,
nimmt die Orientierung mit — man sähe zwar, *wo* ein Nachbar steht, aber
nicht mehr, *was* er ist, und genau das braucht man, um ihn anzuklicken.
Ohne Kasten und in der Randfarbe steht er da wie eine Anschrift auf dem Plan.

Die **Bemassungen** eines nicht gerechneten Tragwerks fallen dagegen ganz
weg: eine Masszahl ist kein Name, sondern eine Angabe — und sie ist
anklickbar, führt also auf ein Eingabefeld, das dem Nachbarn gar nicht
gehört.

### Ein Tragwerk beiseitelegen (2. September)

Weisung: «wie könnte man einzelne tragabschnitte komplett ausblenden im
modell / Anbauteile / nachweis?»

**Ausgeblendet heisst: es ist nicht da.** Nicht durchsichtig, nicht grau —
weg aus Bild, Bauteilliste, Ausleitung und Nachweis. Sonst blendet man einen
Abschnitt aus und findet seine Zahlen weiter in der Auswertung.

Im **Datensatz** bleibt es. Das ist der Unterschied zum Entfernen: die
Eingaben stehen weiter da. Auf einem langen Querprofil arbeitet man so an
einem Abschnitt, ohne die anderen zu verlieren.

Drei Regeln, die daran hängen:

* Das **gerechnete** Tragwerk lässt sich nicht ausblenden — man sähe eine
  Auswertung ohne ihren Gegenstand. Wer es ausblendet, schaltet damit auf das
  nächste sichtbare um.
* Ein **geteilter Mast** verschwindet nicht: der Nachbar bringt ihn ebenfalls
  mit. Nur der eigene Mast des ausgeblendeten Tragwerks fällt weg.
* Die **Ausleitung nennt, wer fehlt** (`blatt.versteckt`) — und zwar gerade
  auch dann, wenn nur noch ein Tragwerk übrig ist: eine solche Datei sieht
  sonst aus wie die eines Blattes, auf dem nie mehr stand.

In der Leiste bleibt es als **gestrichelter Umriss** an seiner Stelle stehen.
Ganz zu verschwinden wäre die falsche Antwort — dann wüsste niemand mehr, wie
man es zurückholt. Ein Klick holt es zurück und macht es zum gerechneten.


### Ein Bauteil am Masten gehört dem Masten (2. September)

Weisung: «das bauteil am geteilten masten beheben».

Anbauteile standen je **Tragwerk**. Am Joch ist das richtig — ein Bauteil auf
dem Joch gehört diesem Joch. Am **Masten** nicht: den mittleren Masten einer
Jochreihe teilen sich zwei Tragwerke. Eine Traverse an ihm war vom Nachbarn
aus unsichtbar, und — schwerer — wurde der Nachbar gerechnet, fehlte ihre
Last. Der Mast trägt sie, gleichgültig welches Joch man gerade nachweist.

Dieselbe Sache, die den Masten selbst betraf, eine Ebene tiefer. Der Weg ist
deshalb derselbe:

* **Ableiten statt festschreiben.** `mastAnbauVon` liest die Blattliste
  `mastAnbauteile` *und* holt nach, was in alten Dateien noch in den
  Tragwerken steckt (`ort: 'mastA'|'mastB'`). Gespeicherte Dateien öffnen
  unverändert und wandern beim ersten Schreiben von selbst hinüber.
* **Projizieren statt umschreiben.** `anbauteileFuer` gibt einem Tragwerk,
  was es sieht: seine Jochteile plus alles an seinen beiden Masten, mit `ort`
  auf das jeweilige Ende gesetzt. Der Rechenkern liest weiter
  `inp.anbauteile` und merkt von alldem nichts.
* **`tragwerkTeil` räumt auf.** Ein weggelegtes Tragwerk trägt keine
  Mastteile mehr — sonst stünde die Projektion beim nächsten Umschalten als
  eigene Angabe wieder da, als Kopie, die nicht mehr mitbekommt, was am
  Masten geschieht.

#### Und die Last wird nicht zweimal gezählt

Für den **Nachweis** gehört das Bauteil in *beide* Rechnungen. Für die
**Ausleitung** nicht: dort stehen beide Tragwerke in *einem* Modell, und der
Zwischenmast ist *ein* Mast. `stabmodellBlatt` führt deshalb einen Vermerk
mit, welche Masten schon bedient sind; das erste Tragwerk von links nimmt
ihre Bauteile mit, die weiteren lassen sie aus.

Gemessen, mit und ohne diese Sperre:

```
ohne   4 Arm-Stäbe, 10 Punktlasten     ← die Traverse zweimal am selben Masten
mit    2 Arm-Stäbe,  5 Punktlasten
```

Man hätte es der Datei nicht angesehen.

#### Der Hinweis sagt jetzt genauer, was fehlt

Er lautete «Er trägt von beiden Seiten; gerechnet ist bisher eine». Das
stimmt so nicht mehr: die Anbauteile trägt er in beiden Rechnungen. Was
fehlt, ist die **Jochreaktion** der Nachbarseite — und die Rahmenwirkung.
Genau das steht jetzt da.


### Die Querprofil-Leiste (2. September)

Weisung: «kann man aus diesen eingaben nicht etwas interaktiveres machen? es
ist alles etwas verstreut. ich verstehe nicht ganz all die einzelnen buttons
und kacheln.»

Berechtigt. Im Block «Tragwerke» standen **vier Bedienelemente**:
Tragwerkskacheln mit je einem Masten-Schalter und einem Kreuz, darunter eine
Reihe Mastkacheln, darunter vier Knöpfe zum Hinzufügen, darunter ein
Zahlenfeld «Lage auf dem Querprofil». Alle beantworten dieselbe Frage — *was
steht auf diesem Blatt und wo* —, und keines **zeigt** es. Sie beschreiben
die Anordnung in Worten («x₀ = 20.00 m»), während der Anwender ein Querprofil
vor sich hat, auf dem sie zu sehen ist.

An ihrer Stelle steht jetzt **eine massstäbliche Leiste**: die x-Achse des
Blattes, jedes Tragwerk ein Balken auf seiner Lage, jeder Mast eine Marke an
seiner Stelle, darunter die Zahlen. Anklicken wählt, Ziehen verschiebt (auf
5 cm gerastet, mit der Lage als Zahl daneben). Darunter eine Zeile mit dem,
was am Gewählten zu tun ist: `+ Tragwerk ▾`, `Masten`, `× entfernen`.

**Das Zahlenfeld bleibt.** Ziehen ist grob — ein Pixel sind auf 240 Punkten
Breite und vierzig Metern Blatt rund siebzehn Zentimeter. Wer eine Lage auf
den Zentimeter kennt, tippt sie. Das Bild gibt die Übersicht, das Feld die
Genauigkeit.

**HTML, nicht SVG:** die Balken sind Knöpfe. In HTML sind sie das von selbst,
mit Fokus, Tastatur und Titel; in SVG müsste jedes davon nachgebaut werden.
Die Lage ist ein Prozentwert, und den rechnet CSS.

Ein Fehler beim Bauen, der teuer geworden wäre: die erste Fassung schrieb
beim Ziehen `leiste.outerHTML` neu. Damit verschwindet genau das Element, das
den Zeiger gefangen hält — der Zug bricht nach dem ersten Pixel ab, und man
hielte es für ein hakendes Ziehen statt für einen Fehler. Verschoben wird
jetzt nur die Lage dieses einen Knopfes.

### Der Klick traf das falsche Joch (2. September)

Weisung: «Die eingabe der bauteile auf die tragwerke funktioniert nicht ganz.»

Sie tat es nicht, und zwar so: Die Ansicht zeigt alle Tragwerke an ihrer Lage
und liefert **Blattkoordinaten**. Die Bauteillage zählt ab dem **linken Ende
ihres Tragwerks**. Beides war gleichgesetzt — richtig, solange nur eines
dastand.

Im Browser nachgestellt und aus dem gespeicherten Stand belegt: aktiv war das
rechte Joch (x₀ = 20), geklickt wurde auf das **linke** bei x = 1.54, abgelegt
wurde am **rechten** bei dessen 1.54 — auf dem Blatt bei 21.54 m. Zwanzig
Meter neben dem Zeiger. Und auf dem rechten liess sich überhaupt nichts
absetzen: dort liegen die Blattkoordinaten 20…40, geprüft wurde gegen 0…L.

Behoben mit `blattNachLokal`. Dazu: ein Klick auf ein anderes Joch **schaltet
selbst darauf um**, statt «daneben» zu melden — dieselbe Antwort auf dieselbe
Geste wie ausserhalb des Setzens.

### Zwei Befunde am Knicknachweis (2. September)

**Die falsche Achse, unsichere Seite.** Gerechnet wurde in Bauachsen — «quer»
und «längs» — und 6.61/6.62 der Reihe nach daraufgelegt. Steht der Steg quer
zum Gleis, ist das dasselbe. Beim **gedrehten** Steg nimmt die schwache Achse
das Quermoment: der Widerstand W wurde getauscht, χ und k nicht. Am HEB 260
über 12 m, N 11 kN, M_quer 40 kNm, M_längs 8 kNm: η 0.443 statt 0.532, also
**20 % zu klein**. EN 1993-1-1, 6.3.3 kennt nur Profilachsen; die Momente
werden jetzt zuerst dorthin gedreht.

**Die Knicklänge endet an der Krafteinleitung.** Bisher L_cr = β · Gesamtlänge
mit dem Fusswert der Normalkraft. Über dem Jochanschluss trägt der Mast aber
nichts als sein Eigengewicht, und was dort nicht drückt, kann dort auch nicht
ausknicken. Ein Kragstab der Länge L mit einer Druckkraft in der Höhe *a*
knickt mit π²EI/(2a)² — keine Näherung, das Stück darüber nimmt am
Eigenwertproblem nicht teil. Am Regelmasten (HEB 260, 12.00 m, Anschluss
9.00 m): L_cr 24.00 → 18.00 m, χ_z 0.059 → 0.101, η 1.276 → 1.065, also
**16.5 % weniger**.

Der Prüfstand fing dabei einen zweiten Fehler: die erste Fassung nahm den
**Angriffspunkt** der Last. Eine Hängestütze auf 7.00 m trägt ihren Fahrdraht
aber 1.35 m tiefer — die Knicklänge wäre auf 11.3 statt 14.0 m gefallen, und
das ist die unsichere Seite. In den Masten kommt die Kraft an der
**Befestigung**; die Lasten tragen dafür jetzt `zAnschluss` neben `z`.

**Was weiterhin nicht geführt wird:** Biegedrillknicken (χ_LT = 1.0). Das
sekundäre Moment aus der Auslenkung steckt in χ und den Interaktionsbeiwerten
k_ij — das ist der Zweck des Ersatzstabverfahrens; ein zusätzlich angesetztes
N·δ wäre dieselbe Wirkung ein zweites Mal.

### Offen aus dem Bauteil-Durchlauf

* Ein Bauteil am **geteilten Masten** gehört nur einem Tragwerk. Vom Nachbarn
  aus unsichtbar — und wenn der gerechnet wird, fehlt die Last, obwohl sie am
  selben Masten hängt.
* Der Anbauteile-Reiter sagt nicht, zu welchem Tragwerk die Liste gehört.
* `+ Tragwerk` kopiert die Anbauteile des aktiven mit, ohne den Namen zu
  unterscheiden.


### Drei Masten, drei Kacheln (2. September)

Die Frage des Auftraggebers war knapp: **«Wie kann man drei verschiedene
Masttypen eingeben?»** Sie liess sich beantworten, und die Antwort war der
Grund, es zu ändern.

Auf einer Jochreihe stehen drei Masten unter zwei Jochen — der mittlere
gehört beiden. Die Eingabe kannte sie nur als *Ende A* und *Ende B* **je
Tragwerk**: vier Enden für drei Masten. Wer drei Profile wollte, musste das
erste Joch anwählen, «Ende B abweichend» ankreuzen, zwei Profile eintippen,
auf das zweite Joch umschalten, dort wieder ankreuzen — und dabei wissen,
dass das *Ende A* des zweiten Jochs derselbe Mast ist wie das *Ende B* des
ersten. Fünf Felder, eine Falle.

Jetzt steht unter den Tragwerkskacheln eine **zweite Reihe: ein Eintrag je
Mast des Blattes**, mit Nummer, Lage und Profil. Ein Klick wählt ihn an, die
Mastfelder darunter gelten ihm. Der geteilte trägt seine beiden Tragwerke als
Text — wer ihn ändert, ändert beide, und das soll man vorher lesen.
`mastZwei`, `mastProfilB`, `mastLaengeB` und `mastStegB` bleiben im
Datensatz und im Rechenkern; als **Frage** stehen sie nicht mehr da.

Der Schalter **«Masten im Modell»** sitzt jetzt an der Tragwerkskachel
(Weisung: «nimm das aktiv inaktiv schalten der masten oben zu den kacheln»).
Er gilt dem Tragwerk und nicht dem einzelnen Masten — einen von zwei
wegzuschalten kennt das Datenmodell nicht, und es wäre auch kein Tragwerk.

#### Zwei Fehler, die dabei ans Licht kamen

**Die Mastenliste gehörte keinem Tragwerk, stand aber in keinem
Blattfeld.** `tragwerkTeil` nimmt alles mit, was nicht in `BLATT_FELDER`
steht — die Masten wanderten beim Umschalten in das weggelegte Tragwerk, und
aus dem angewählten kam eine alte Liste zurück oder gar keine. Ein Mast, dem
man gerade ein Profil gegeben hatte, stand nach einem Klick auf das
Nachbarjoch wieder mit dem alten da. `masten` und `mastAktiv` sind jetzt
Blattangaben.

**Ein abgeschalteter Mast vererbte seinem Nachbarn das Profil.** Im Browser
gemessen: drei Masten (HEB 260 / HEB 240 / HEM 240), dann die Masten des
linken Jochs ausgeschaltet. Die Nummern werden **laufend** vergeben — der
übrig gebliebene Mast bei x = 20 hiess danach `M1` und bekam über die Id das
Profil des verschwundenen: HEB 260 statt HEB 240. Ein Mast mit einem fremden
Profil, und man sieht es ihm nicht an.

Seither entscheidet in `mastenVon` die **Stelle**, nicht die Nummer, in zwei
Durchgängen: erst gleiche Stelle auf den Zentimeter, dann die nächstgelegene,
global nach Abstand geordnet. Der zweite Durchgang fängt das verschobene
Joch — gibt man einer Reihe (Masten bei 0, 20, 35) die Lage x₀ = 21, stehen
sie danach bei 0, 20, 21 und 36; der gespeicherte Eintrag von 35 gehört zu
dem bei 36, und das sagt der Abstand, nicht die Reihenfolge.

#### Die Anschlusshöhe bekommt ihren eigenen Schalter

`mastZwei` hiess zweierlei auf einmal: «der Mast am Ende B ist ein anderer»
**und** «das Joch schliesst dort anders hoch an». Solange man beide Masten
über dieselbe Maske eintippte, fiel das nicht auf.

Mit den Kacheln fällt es auf, und zwar teuer: `mastenProjizieren` setzt
`mastZwei`, sobald sich die beiden Masten in **irgendeiner** Angabe
unterscheiden. Wer dem rechten Masten ein anderes Profil gibt, hätte damit
still `mastHB` scharfgeschaltet — ein Feld mit dem Standardwert 7.50 m, das
niemand angefasst hat, mitten in der Drehfeder. Genau dieser Fehler ist am
2. September schon einmal aufgetreten.

Also **`mastHZwei`**, mit einer Aufgabe. Fehlt er — jede bisher gespeicherte
Datei —, gilt `mastZwei`: dieselbe Höhe wie zuvor, kein Unterschied im
Ergebnis. Geprüft wird beides.

### Das abgelegte Querprofil nachträglich schieben (2. September)

Weisung: «es wäre daher noch gut das abgelegte QP Bild schieben zu können
nachträglich, falls die Lage der Abstraktion nicht ganz gleicht bei einer
Jochreihe.»

Zwei Klicks messen das Bild über **einem** Tragwerk ein. Auf einer Jochreihe
steht daneben ein zweites Joch, und dessen Lage kommt nicht aus dem Bild,
sondern aus x₀ der Eingabe. Passt beides nicht zusammen, gab es bisher nur
eine Antwort: neu einmessen — die gute Lage wegwerfen, um die schlechte zu
ersetzen.

Im Zeichnungsmenü steht jetzt **«Verschieben»**: ziehen im Bild, Pfeiltasten
5 cm, mit Umschalt 1 cm. Der Balken nennt die Verschiebung als Zahl
(`Δx`, `Δz`) — sie ist zugleich die Probe: weicht sie stark von dem ab, was
man erwartet hat, stimmt eher die Eingabe als das Bild. «zurück» setzt auf
die Lage vor dem Zug, «fertig» sichert.

**Der Massstab bleibt unangetastet.** Ein gezogener Massstab wäre eine
zweite, unsichtbare Kalibrierung; die eingemessene ist die belastbare.
Gerechnet wird über dasselbe Rechteck, das `_zeichnungMalen` zeichnet — die
Umrechnung Bildschirm → Welt ist damit genau die, die man sieht.

Ein frisch eingelegtes Bild darf man auch schieben, obwohl es noch nicht
eingemessen ist: es liegt dann vorläufig da, und gerade dort will man es
zurechtrücken. Am Zustand ändert das nichts — «noch nicht eingemessen» steht
weiter daneben, denn geschoben ist nicht gemessen.

### Der Vorbehalt am Einzelmasten war stehengeblieben (2. September)

Die Auswertung des Einzelmasten sagte weiter «Querschnitt erfüllt ·
Stabilität nicht geführt», und die Kopfzahl war `mast.eta` — die
Querschnittsausnutzung. Seit dem Biegeknicknachweis ist die Stabilität
geführt **und am Regelmasten das grössere von beiden** (0.1465 gegen
0.1360). Der Satz behauptete eine Lücke, die es nicht mehr gibt, und die
Zahl daneben hielt den massgebenden Nachweis heraus.

Jetzt steht dort der Nachweis — `etaNachweis`, das grössere von Querschnitt
und Knicken — und die Zeile nennt, **was** massgebend war. Das
Biegedrillknicken bleibt ausdrücklich aussen vor (χ_LT = 1.0); das steht im
Bericht, nicht in dieser Zeile.


### Der Weg von der Ausleitung in AxisVM (27. August)

Die Brücke verlangte vor jedem Bau ein Aufräumen: erst die neue JSON in
`com/` kopieren, dann die alte löschen. Der Grund stand im Skript selbst —
es nahm **«die einzige `*.json` daneben»**, legte beim Bauen aber selbst
`AxisVM_zuordnung.json` dorthin. Ab dem zweiten Lauf lagen also immer zwei
da, und es hielt an. Kein Schutz, eine Hürde.

**Drei Dinge sind jetzt anders:**

1. **Die Datei wird am Inhalt erkannt.** Nur `format = 'tragjoch-stabmodell'`
   zählt; die Zuordnung und die Ergebnisdateien fallen von selbst weg.
   Gelesen werden dafür 800 Byte, nicht die ganze Datei.
2. **Von mehreren gilt die jüngste** — man leitet aus und baut, das ist die
   Reihenfolge. Welche genommen wurde und welche übergangen, steht im
   Bericht.
3. **Die Datei lässt sich auf `AxisVM_aufbauen.cmd` ziehen.** Dann muss sie
   gar nicht erst in den Ordner. Weitere Schalter kommen mit — daran hängt
   `AxisVM_auslesen.cmd`, das die Datei als `<datei> -Auslesen` weiterreicht.

**Und alles, was zu einem Modell gehört, liegt beim Modell.** Bericht,
Zuordnung und Ergebnisse hiessen früher immer gleich und lagen neben dem
Skript; bei mehreren Projekten mit je mehreren Jochen überschreibt sich dort
alles. Jetzt heissen sie wie die Modelldatei und liegen in deren Ordner:

```
<modell>.json            die Ausleitung
<modell>.axs             das AxisVM-Modell
<modell>_zuordnung.json  welche Linie welcher Stab ist
<modell>_bericht.txt     was gebaut wurde und was nicht
<modell>_ergebnisse.json die Schnittgroessen (beim Auslesen)
```

Damit bleibt `com/` das, was es sein soll: **das Werkzeug, nicht das Archiv.**

### Masten und Joch selbst erkennen (27. August)

**Weisung:** eine automatische Erkennung von Masten und Jochen, und die
Zeichnung danach selbst ausrichten.

> **Sie schlägt vor, sie entscheidet nicht.** Eine Zeichnung ist kein
> Datensatz: was darauf steht, steht dort für einen Menschen. Jede Erkennung
> ist eine Vermutung, und eine Vermutung, die sich als Messung ausgibt, wäre
> schlimmer als gar keine. Das Ergebnis wird **vorgelegt** — der Balken sagt,
> dass gerechnet und nicht gemessen wurde, und die zwei Klicks stehen einen
> Knopfdruck entfernt.

**Woran man ein Tragwerk erkennt.** Die Masten sind die **längsten
Senkrechten** des Blattes: sie laufen vom Joch bis zum Fundament, über die
halbe Blatthöhe. Nichts sonst auf einem Querprofil ist so lang und so
senkrecht — ein Lichtraumprofil ist rund, eine Bemassungslinie kurz, ein
Schriftfeld flach. Zwischen ihnen liegt das Joch.

Damit sind genau die beiden Punkte gefunden, die das Einmessen braucht: die
Mastachsen auf Höhe der Jochachse, also x = 0 und x = L.

**Drei Störenfriede, drei Regeln — alle drei gemessen, nicht vermutet:**

* **Der Blattrahmen ist kein Mast.** Er läuft über die ganze Höhe und schlägt
  jeden Masten an Länge. Der äusserste Rand zählt deshalb nicht mit, und was
  nur einen Strich breit ist, ist kein Profil.
* **Die obere Rahmenkante ist keine Jochachse.** Sie läuft über die ganze
  Breite und schlägt jeden Gurt an Tinte — der erste Versuch fand die
  Blattkante. Gesucht wird deshalb nur **auf der Länge der Masten**: was
  über ihren Köpfen oder unter ihren Füssen durchläuft, gehört nicht zum
  Tragwerk. Das nimmt zugleich das Schriftfeld unten heraus.
* **Die Masskette darüber zieht die Achse nicht an sich** — der Prüfstand
  vergleicht ein Blatt mit und ohne Kette und verlangt dasselbe Ergebnis.

> **Der Mastkopf war der falsche Anker.** Die erste Fassung suchte das Joch in
> einem Fenster um den Mastkopf — «das Joch sitzt auf den Masten». Dann kam
> ein Querprofil *J70 E / 15 m auf DP26/12.5 und DPM24/12.5*, dessen Masten
> **über das Joch hinauslaufen**: oben trägt jeder eine Traverse mit einem
> 95Cu. Die Erkennung fand die Traverse — Jochachse **103 statt 282**,
> Zutrauen 0.10. Verworfen hat sie den Vorschlag damit richtigerweise selbst;
> geholfen hat sie nicht.
>
> Gewertet wird jetzt nicht mehr die stärkste ZEILE in einem Fenster, sondern
> das **tintenreichste durchlaufende BAND** auf der ganzen Mastlänge. Das ist
> das eigentliche Merkmal: eine Traverse spannt ein Zehntel des Streifens
> zwischen den Masten, ein Lichtraumprofil ein Viertel, eine Terrainlinie gut
> die Hälfte — nur das Joch spannt ihn ganz, und zwar zweimal, mit Füllstäben
> dazwischen. Am selben Blatt danach: **281.6 gegen 282**, Zutrauen 1.0.
>
> Das trägt auch den Fall, den kein Fenster mehr auffangen könnte: eine
> **Masskette zwischen Mastkopf und Joch**. Sie füllt den Streifen so ganz
> wie ein Gurt und verliert trotzdem — ein Joch ist zwei Gurte, eine
> Masskette ein Strich.

**Die Achse liegt zwischen den Gurten, nicht auf einem.** Vom stärksten Strich
aus wächst ein Band nach oben und unten, solange noch Tinte da ist; die
Füllstäbe halten es zusammen. Mit einer Schwelle von 12 % blieb es am
Obergurt hängen — die Stäbe tragen nur rund 5 % der Tinte eines Gurtes. Bei
3 % trifft es die Mitte: am nachgebauten Joch **188.07 gegen 188.5**.

**Rot ist dunkel.** Auf einem Querprofil ist das Neue rot gezeichnet, und der
Mast ist oft genau das. Reines Rot hat eine wahrgenommene Helligkeit von 76 —
deutlich unter der Schwelle, obwohl sein Rotkanal voll ausgesteuert ist. Wer
nur den Rotkanal prüfte, sähe es als hell.

**Die Schranke ist der Abstand zum Dritten:** um wieviel kürzer der
nächstlängste Senkrechte ist als der kürzere Mast. Ein Viertel genügt, und das
ist gemessen: auf einem Blatt sind die nächstlängsten Senkrechten die
Lichtraumprofile, und die kamen auf 260 von 432 Punkten — 40 % kürzer. Ein
dritter, ebenso langer Strich drückt den Wert auf 0.06, und dann sind zwei
Klicks ehrlicher.

> **Die Zahl brauchte ihren Namen.** Der Balken sagte zuerst «Zutrauen 39 %» —
> das las sich wie Unsicherheit, wo ein deutliches Ergebnis stand. Jetzt
> steht dort, was die Zahl bedeutet: «die beiden Masten heben sich ab
> (nächster Strich 39 % kürzer)».

Gerechnet wird auf einer **Maske**, nicht auf Farben — damit ist die Erkennung
im Prüfstand nachrechenbar, ohne Browser und ohne Bild. Die Maske fällt beim
Verkleinern ohnehin ab; sie aus dem JPEG zu lesen wäre sogar schlechter,
dessen Artefakte an den Linienrändern sind genau das, was eine Schwelle nicht
braucht.

### Die Querprofil-Zeichnung hinter dem Modell (27. August)

**Weisung:** die Zeichnung transparent hinterlegen, um Bauteile und Masten
zuzuordnen und Längen abzugreifen, ohne im PDF-Reader zu messen. In der
Ablage, verkleinert als JPEG; beim Projektexport die Bilder in den
Ablageordner.

**Kein Fremdcode.** Die Modellansicht ist ein 2D-Canvas mit eigener
Projektion — ein Bild lässt sich mit `drawImage` und einer Matrix
hineinzeichnen, also liegt es in **derselben Ebene wie das Modell**: gleicher
Zoom, gleiche Fahrt, gleicher Klick. Ein PDF wäre eine DOM-Ebene dahinter,
die nichts davon mitmacht, und es zu rastern hiesse, einen PDF-Leser
einzubacken.

**Der Weg hinein ist das Einfügen.** Bildschirmausschnitt, ins Modell,
Strg+V. Eine Datei hineinziehen geht ebenso; nach dem Einlesen ist beides
dasselbe Bild. Verkleinert auf 2000 Punkte Breite, als JPEG mit Güte 0.82 —
aus drei Megabyte werden rund zweihundert Kilobyte, und beim Klicken merkt
man keinen Unterschied.

**Zuerst liegt es grob da.** Ein frisch eingefügtes Bild hat keine Lage im
Raum — und ein Bild ohne Lage kann man auch nicht anklicken, um ihm eine zu
geben. Es bekommt deshalb sofort eine vorläufige, auf die Jochlänge
gestreckt. Von dort setzen es **zwei Klicks** genau:

```
Klick auf das linke Jochende    ->  x = 0,  z = Jochachse
Klick auf das rechte Jochende   ->  x = L,  z = Jochachse
```

Daraus folgen Massstab **und** Lage in einem. Eingetippt wird nichts: die
Jochlänge steht schon in der Eingabe. Wahlweise dieselben zwei Klicks am
Masten (Fuss und Kopf, Mass ist die Masthöhe).

> **Der Massstab kommt aus der längeren Richtung.** Klickt man die beiden
> Jochenden, liegen sie waagrecht weit auseinander und lotrecht fast
> übereinander; nähme man die lotrechte Differenz, stünde im Nenner fast nur
> das Klickrauschen. Vier Punkte schief ändern so am Massstab nichts und an
> der Höhe nur die Hälfte des Fehlers — beide Klicks tragen zur Lage bei.

**Nur in der Längsansicht.** Ein Querprofil ist ein flaches Bild in der
x-z-Ebene; in der Isometrie stünde es schief im Raum, in der Draufsicht wäre
es eine Kante. Die Ebene hat einen eigenen Schalter in der Modellgruppe, der
ohne Bild ausgegraut stehenbleibt — so sieht man, dass es ihn gibt.

> **Zur Benennung:** die *Querprofil*-Zeichnung ist in den Achsen dieser
> Anwendung die **Längsansicht** — Blick entlang des Gleises, man sieht
> Jochlänge x und Höhe z. Der Knopf «Que» zeigt den Jochquerschnitt, also die
> vier Winkel.

**In IndexedDB, in eigenem Speicher.** Die Ablage ist ohnehin IndexedDB — sie
nimmt Binärdaten unmittelbar und kennt die enge Schranke nicht, an der
localStorage scheitern würde. Eigener Speicher, weil das Auflisten der
Ablage sonst sämtliche Bilder mitbrächte; gelesen wird nur beim Laden des
Tragwerks. Mit dem Tragwerk gelöscht wird sie auch.

**Das Ausleiten ist jetzt ein Paket.** Ein ZIP mit `ablage.json` und einem
Ordner `zeichnungen/`, eine Datei je Tragwerk. Geschrieben mit dem
ZIP-Schreiber, der ohnehin im Werkzeug steht — eine `.xlsx` **ist** ein ZIP.
Dazu ein Leser für gespeicherte Einträge; Sicherungen der früheren Fassung
(reine JSON) werden weiterhin gelesen, unterschieden an den ersten zwei
Zeichen.

### Träger neben den Bindeblechen, Lage auf 10 cm (27. August)

**Weisung:** «Die Hängestütze und Jochaufsätze dürfen sich nicht mit den
Verbindungsblechen berühren. Diese sind automatisch nebenan zu schieben.»
Dazu: «x auch auf 10 cm runden.»

Betroffen sind wieder genau die **Träger**, und wieder steht das in den Daten:
`rolle: 'traeger'` tragen die drei Jochaufsätze und die Hängestütze — eben
das, was am Joch angeschlagen wird. Ein Drahtwerk hängt an einem Aufbau und
berührt das Joch nie.

**Die Lage wird in drei Schritten gesetzt**, und die Reihenfolge ist die
Aussage:

```
1. auf 10 cm runden      niemand baut auf den Millimeter
2. auf die Masskette     falls eine da ist - 2.09 steht so auf der Zeichnung
3. am Blech vorbei       keine Vorliebe, sondern eine Unmoeglichkeit
```

**Zwei Klemmen, nicht eine.** Ein Träger hängt im Abstand `raster`; beide
Klemmen müssen an einem Blech vorbei. Deshalb ist eine Lage nicht schon
deshalb verboten, weil ein Blech darunter liegt — die Baugruppe darf es
**überspannen**. Im Browser nachgemessen, Station bei 4.40 m, Blech 80 mm,
Raster 400 mm:

```
x = 4.40  ->  4.40     Klemmen bei 4.20 und 4.60, beide frei
x = 4.60  ->  4.559    linke Klemme saesse auf dem Blech
x = 7.137 ->  7.1      gerundet
```

**Erst weiten, dann weichen** — die Weisung nennt die Reihenfolge selbst:
«die Joche sind fix, die Anbauteile werden drum herum angebracht», und wenn
die Klemmen in den Knotenbereich fielen, «ist der Abstand entsprechend zu
vergrössern».

1. **Klemmenabstand weiten, Lage bleibt.** Das ist die gebaute Abhilfe: die
   Stütze bleibt, wo sie hingehört, ihre Klemmen überspannen das Blech.
2. Erst wenn das nicht geht, **weicht die Lage** aus. Der Fahrdraht darf das:
   10 bis 20 cm laufen unter die Modellunschärfe (Auftraggeber).

Die Suche nach dem Raster ist **exakt, nicht tastend**: eine Klemme bei
x − r/2 fällt genau dann in ein Blech [von, bis], wenn r in
[2(x − bis), 2(x − von)] liegt. Aus den Blechen werden so verbotene
RASTERWERTE, und gesucht ist der kleinste erlaubte ab 0.40 m.

Wie weit die Suche reichen muss, sagt die Geometrie: bei Teilung a und
Blechbreite b sperrt jede Klemme 2b von je 2a, beide zusammen höchstens 4b
von 2a — bei 0.75 m und 100 mm also 0.40 von 1.50. In jedem Abschnitt von
0.40 m liegt ein freier Wert. Gesucht wird bis 0.40 + 0.40 m.

**Beide Klemmen müssen auf dem Joch bleiben.** Am wirklichen Querprofil
aufgefallen: ein Mass 16 cm vor dem Jochende — dort läge die geweitete Klemme
jenseits des Jochs, ein Anschluss an nichts. Die Weitung ist dort keine
Abhilfe, und ein Träger mit 0.40 m Klemmenabstand kann dort überhaupt nicht
sitzen; das meldet schon Prüfung P1.

Wird verschoben, dann zur näheren Kante, auf ganze Millimeter und **einen
Millimeter darüber hinaus**: genau auf die Kante gerundet würde das Bauteil
sie berühren, und nach innen gerundet stünde es wieder auf dem Blech.

Verschoben wird in der Eingabe und beim Setzen; **Prüfung P8** ist der
Nachweis. Sie fängt, was auf anderem Weg hereinkommt — eine eingelesene
Datei, eine geänderte Blecheinteilung, ein nachträglich verstelltes Joch. Bei
allen dreien wandern die Bleche unter dem Bauteil weg, ohne dass jemand die
Lage angefasst hätte.

> **Zwei Fehler, die erst der Browser gefunden hat.** Der Prüfstand war grün,
> und die Anwendung tat trotzdem nichts:
>
> * Der Handler rief `teilVon` — einen Helfer, der zu einer *anderen*
>   Funktion der Maske gehört. Jeder Tastendruck warf still einen
>   ReferenceError, und der Wert wurde nie gespeichert.
> * Und die Zeile, die das gerechnete Modell an die Maske reicht, war in die
>   falsche Funktion geraten: der Einfügeanker kam zweimal vor, und die
>   erste Fundstelle war die Diagrammbühne. Dieselbe Verwechslung hatte
>   vorher schon die **Masskette** nie ankommen lassen.
>
> Beides ist nur im laufenden Programm sichtbar. Was in Modulen richtig
> aussieht, läuft nicht zwangsläufig — dieselbe Lehre wie beim Bündeln.

### Bauteil setzen: erst wohin, dann was (27. August)

**Weisung:** nicht auf das Herauslesen von Text aus der Zeichnung
konzentrieren, sondern auf das **Einsetzen der Bauteile an Joch oder Masten** —
so einfach und selbstverständlich wie möglich.

Bisher hiess ein Bauteil einsetzen: Reiter wechseln, in vierzehn gleich
aussehenden Kacheln die richtige finden, im Dialog eine Zahl eintippen, die
man vorher auf der Zeichnung gemessen hat. Drei Schritte, von denen keiner
mit dem Tragwerk zu tun hat.

Jetzt sind es **zwei Klicks**: ins Modell, wohin es gehört — dann erscheint,
was dort sein kann.

```
Knopf "Bauteil setzen" -> ins Modell klicken
   am Joch      ->  "Was kommt am Joch bei x = 4.95 m?"      14 Vorlagen
   am Masten    ->  "Was kommt am Mast Ende A, 5.15 m
                     ueber Fundament?"                        6 Vorlagen
```

**Die Stelle sagt schon, was in Frage kommt.** Am Masten gibt es keinen
Träger — die vier Hängestützen und Jochaufsätze fallen weg, übrig bleiben
Traverse, Lampe, die drei Leiter und «Frei definiert». Das ist dieselbe
Regel wie Prüfung P6, nur **vorwärts angewandt** statt nur prüfend.

**Sortiert nach Rolle:** was trägt, steht vorn — man baut von unten nach
oben. Die Kette Stütze → Ausleger → Kettenwerk baut sich ohnehin selbst: die
Vorlagen tragen sie in sich.

**Am Joch fängt die Lage auf der Masskette**, wenn eine eingetragen ist —
sonst gilt der geklickte Wert.

#### Die Umkehrung der Projektion

Damit ein Klick eine Stelle wird, braucht die Ansicht den Weg zurück:
Bildschirmpunkt → Punkt im Tragwerk. Gerechnet als **Strahl vom Auge durch
den Bildpunkt, geschnitten mit der Ebene y = 0** — der Ebene, in der Joch und
Masten stehen. Ohne diese Einschränkung wäre ein Bildschirmpunkt kein Punkt,
sondern ein Strahl; in der Tiefe läge unendlich viel hintereinander.

Der Strahlenschnitt gilt in **jeder** Ansicht, auch in der Isometrie — nicht
nur dort, wo die Ebene zufällig parallel zum Bildschirm liegt. Im Browser
nachgemessen: waagrechte Bildmitte → x = 10.00 m bei einem Joch von 20 m,
Viertelpunkte → 3.02 und 16.98 m.

**Wer daneben klickt, erfährt wohin.** Der Balken sagt dann nicht «daneben»,
sondern «dort ist x = –0.94 m, z = –2.35 m» — man sieht, in welche Richtung
zu zielen ist, und ob überhaupt das Modell gemeint war.

### Die Masskette der Zeichnung als Fanglinien (27. August)

Am Schulungsbeispiel gesehen: über dem Joch steht auf **jedem** Querprofil
eine Kette von Massen in Zentimetern ab dem linken Jochende —

```
0 · 15 · 209 · 474 · 735 · 885 · 983 · 1185 · 1200
```

Das sind die Stellen, an denen wirklich etwas hängt — genau die Zahl, die
jede Baugruppe als Lage `x` braucht.

> **Sie ist NICHT auf jedem Blatt vorhanden** (Auftraggeber, 27. August — er
> hatte es zunächst anders gesagt und gleich darauf berichtigt). Die Kette ist
> deshalb eine **Beigabe, kein Weg**: wo sie steht, spart sie das Abgreifen;
> wo sie fehlt, muss auf der Zeichnung gemessen werden. Alles hier
> Beschriebene ist optional — ohne Eintrag gibt es keine Fanglinien, kein
> Fangen und keine Beanstandung.

Wo sie steht, wird sie nicht abgegriffen, sondern **abgeschrieben**, einmal,
als Zeile in ein Feld der Systemgeometrie. Danach

* stehen die Masse im Modell als **lotrechte Fanglinien** mit ihrer Zahl in
  Zentimetern, in der Längsansicht wie die Zeichnung,
* und die **Lage eines Anbauteils fängt darauf**: wer 2.07 einstellt, bekommt
  2.09, weil dort das Bauteil sitzt.

**Die Grenze ist nie grösser als die halbe Lücke zum Nachbarn.** 11.85 und
12.00 liegen 15 cm auseinander; mit einer festen Grenze von 20 cm würde das
eine das andere überdecken, und ein Wert dazwischen fände die falsche Stelle.
Nachgerechnet: 11.92 → 11.85, 11.94 → 12.00.

**Das letzte Mass ist die Gegenprobe.** Es muss die Jochlänge sein. Stimmt es
nicht, ist entweder die Kette aus einer anderen Zeichnung, die Länge falsch
eingestellt, oder es wurden Millimeter abgeschrieben — alle drei würden sonst
still danebenliegen. Der Hinweis nennt beide Zahlen.

Gelesen wird grosszügig: getrennt wird an allem, was keine Zahl ist —
Leerzeichen, Komma, Strichpunkt, Zeilenumbruch. Abgeschrieben wird von Hand.

Rechnerisch ändert die Kette nichts; der Prüfstand hält das fest.

### Zwei Befunde aus einem wirklichen Querprofil (27. August)

Der Auftraggeber hat ein Schulungsbeispiel gezeigt. Zwei Dinge, die ich am
selbstgebauten Prüfbild nicht sehen konnte:

**Die Zeichnung wird auf dunklem Grund umgekehrt.** Ein Querprofil ist schwarz
auf weiss, die Modellansicht weiss auf fast schwarz (`#090a0d`). Unverändert
daruntergelegt wäre das Blatt eine **helle Fläche**, auf der das Modell
verschwindet — und je durchsichtiger man es stellt, desto weniger sieht man
VON DER ZEICHNUNG, während die Fläche bleibt. Umgekehrt gelegt fügt sie sich
ein: dunkler Grund, helle Linien. Entschieden an der Helligkeit des
Hintergrunds, nicht über einen weiteren Schalter.

**Die vorläufige Lage war zweimal geraten und zweimal daneben.** Ein A4-Blatt
zeigt nicht das Joch, sondern die Szene: Masten, Gleise, Lichtraumprofile,
Schriftfeld, Legende. Das Joch nimmt grob die **halbe** Blattbreite ein und
sitzt rund ein **Fünftel** unter der Blattkante — nicht die ganze Breite und
nicht auf einem Drittel.

### Am Masten hängt kein Kettenwerk unmittelbar (27. August)

**Weisung:** «Die Kettenwerke werden nicht direkt am Masten gehängt, ausser
wenn sie abgefangen werden, sondern auf Ausleger. Am Masten werden nur
einzelne Leiter gehängt oder, falls es Zusatzleiter sind, über eine
Traverse.»

Auch das steht in den Daten: ein **Kettenwerk** ist Tragseil UND Fahrdraht,
und die Bauteiltabelle sagt es im Namen — «Ts: StCu 50 / Fd: Cu 107» gegen
«StCu 50» oder «Cu 95». Vier Kettenwerke, acht einzelne Leiter:

| | |
|---|---|
| Kettenwerk | N-FL Ts/Fd (×1, ×2, Cu 150), R-FL Ts/Fd |
| einzelner Leiter | N-FL StCu 50, N-FL Cu 107, R-FL StCu 92, R-FL Cu 107, Cu 95 (×1…×4) |

Zwischen einem Kettenwerk und dem Masten gehört ein **Aufbau** — der
Ausleger. Fehlt er, meldet es Prüfung **P7**.

> **Der Prüfstand hat mich dabei korrigiert.** Ich hielt die Vorlage «Leiter
> N-FL» für einen einzelnen Leiter und schrieb eine Kontrolle, die das
> behauptete. Sie fiel: die Vorlage trägt `drahtwerk-n-fl-ts-stcu-50-fd-cu-107`,
> also Tragseil und Fahrdraht — ein Kettenwerk. Der einzelne Leiter ist der
> Rückleiter (Cu 95).

**Die Ausnahme ist noch nicht gebaut.** Ein abgefangenes Kettenwerk darf
unmittelbar an den Masten; solange die Abfangung nicht modelliert ist, bleibt
P7 ein **Hinweis** und kein Fehler.

### Was noch kommt — Vorgaben des Auftraggebers, festgehalten

Vom 27. August, noch nicht gebaut:

**Abfangjoche in die Bibliothek.** Danach muss sich ein Leiter als
**abgefangen** modellieren lassen: dann geht die gesamte Leiterzugkraft in
das Abfangjoch, oder zum Teil unmittelbar an den Masten.

**Druckstützen und Zuganker.** Sie kommen mit der Abfangung dazu:

| | |
|---|---|
| Neigung | **55° bis 65°**, bezogen auf die Terrainkante |
| Abstand Mastachse – Ankerfundament | **4.5 m** im Normalfall |

**PDF-Import der Querprofilzeichnung.** Die Zeichnung transparent hinter die
Modellansicht legen, um Bauteile und Masten zuzuordnen und Längen abzugreifen,
ohne im PDF-Reader zu messen. Der Vorschlag dazu steht in der Antwort vom
27. August; entschieden ist er noch nicht.

### Anbauteile am Masten (27. August)

**Weisung:** am Masten sollen sich Anbauteile und Leiter ansetzen lassen —
ausser Jochaufsatz und Hängestütze.

Eine Baugruppe hat jetzt einen **Standort**: am Joch, am Mast Ende A oder am
Mast Ende B. Am Joch zählt die Lage `x`, am Masten die **Höhe über
Fundament** — die Angabe, die auf der Zeichnung steht und sich gegen die
Mastlänge prüfen lässt. Befestigung und Raster entfallen dort: das Teil ist
an EINER Stelle angeschraubt, es gibt keinen Ober- und Untergurt.

**Die Ausnahme steht in den Daten, nicht als Verbotsliste im Code.** Die
Bauteiltabelle führt drei Rollen — `traeger`, `aufbau`, `drahtwerk` —, und
`traeger` tragen genau vier Bauteile: die drei Jochaufsätze und die
Hängestütze. Ein Träger **ist** das, was auf dem Joch sitzt oder daran hängt;
am Masten beginnt die Kette am Masten selbst. Kommt einmal ein neuer Träger
in die Tabelle, gilt die Regel für ihn ohne Zutun. Prüfung **P6** fängt, was
auf anderem Weg hereinkommt.

**Was am Masten hängt, geht nicht in den Ersatzbalken.** Der Rechenkern führt
einen Balken — das Joch. Eine Traverse auf halber Masthöhe belastet den
Masten; was davon im Joch ankommt, läuft über die Verdrehung des Mastkopfes
und ist im Ersatzbalken nicht darstellbar. Sie dort als Jochlast anzusetzen
wäre still falsch: die Last sässe auf dem falschen Bauteil, mit dem falschen
Hebelarm. Der Prüfstand hält fest, dass das Stützmoment des Jochs sich nicht
ändert, wenn man ein Teil an den Masten hängt.

**Im Stabmodell mit Mast stehen sie.** Der Mast wird dort **geteilt**, wo
etwas an ihm hängt — aus zwei Stücken werden drei —, und die Kette
(Träger → Aufbau → Drahtwerk) hängt am Mastknoten. Gebaut wird sie mit
demselben `anbauKette` aus dem Rechenkern; zwei Fassungen waren schon einmal
der Grund, warum Bild und Modell verschiedene Tragwerke zeigten. Am Ende B
wird an der Mastachse **gespiegelt**: die Teile tragen ihre Ausladung in +x,
weil sie am Joch nach aussen zeigen, und aussen liegt dort in −x.

Eine Höhe ausserhalb des Mastes ist ein Teil in der Luft. Es wird **nicht**
gebaut — und das steht in der Ausleitung (`anbauMastAus`), statt still zu
fehlen.

#### Nachtrag 28. August: das Bild zeigte sie am Joch

**Weisung:** «Beim Anhängen der Bauteile an Masten ist die Abhängigkeit (Lage
des Mittelpunkts) nicht vom Joch, sondern vom Mastfusspunkt abhängig.»

Die Ausleitung rechnete von Anfang an so — `zFuss + hMast`. Die **Ansicht**
tat es nicht: ihre Zeichenschleife lief über `m.anbauteile`, die rohe Liste
mit Joch- und Mastteilen zusammen, und behandelte jeden Eintrag als Jochteil.
Ein Teil am Masten hat aber `x = 0`, immer. Es stand damit am linken
Jochende, mit vier Anschlusspunkten an Ober- und Untergurt, die es dort nie
hatte — und ohne seine eigenen Teile, denn die liegen in `anbauMastFlach`
und nicht in `m.teile`.

**Ein Nullpunkt je Ort, an allen drei Stellen derselbe.** `hMast` misst ab
Fundament, `z` eines Moduls ab dem Anschlusspunkt auf der Mastachse. Das gilt
jetzt in der Ausleitung, im Bild und auf der Eingabekarte: die Karte trägt
für ein Mastteil eine eigene **Skizze** (Mast mit Fundament, Höhe über
Fundament, z ab Anschluss) statt der Jochskizze mit «Lage in Jochachse
0 … L», und die Zeile in der Liste zeigt `MB 7.00 m` statt `0.00 m`.

Nebenbei gefunden: die Marke im Modell hiess `A{k+1}` über die **gefilterte**
Liste, die Karte `A{i+1}` über die ganze. Ein ausgeschaltetes Teil verschob
jede folgende Nummer um eins — der Klick auf A3 öffnete A4.

### Bauteile setzen: erst wählen, dann zielen (28. August)

**Weisung:** «das absetzen der einzelnen Bauteile [ist] etwas fummelig»; das
Auswahlfenster «weniger transparent»; bei der Auswahl «auf die Sidebar
beziehen, da sind diese schon enthalten»; und «die getätigten Eingaben
Bauteilgruppen auswählen oder auch per Drag and Drop ablegen».

* **Die Reihenfolge ist jetzt frei.** Wer die Stelle zuerst weiss, klickt sie
  an und wählt aus dem Balken. Wer das Bauteil zuerst weiss, zieht es hinein
  oder klickt seine Kachel — dann ist es **vorgewählt**, und ein Klick setzt
  es ohne Zwischenmenü. Die Vorwahl überlebt einen Fehlklick.
* **Abgelegt wird, wo der Zeiger ist.** Vorher wurde aus dem waagrechten
  Anteil der Fensterbreite eine Station geschätzt — das traf nur bei
  frontaler Ansicht, und einen Masten konnte es grundsätzlich nicht treffen.
  Jetzt geht derselbe Strahl durch das Bild wie beim Klicken
  (`weltAusZeiger`).
* **Was schon dasteht, steht zur Wahl.** Eine eigene Spalte «Schon im
  Modell» neben Träger/Aufbau/Drahtwerk. Kopiert wird die **Baugruppe**,
  nicht ihre Vorlage: der zweite Rückleiter ist derselbe wie der erste,
  samt jeder von Hand geänderten Zahl. Gleiche Baugruppen sind zu einem
  Knopf zusammengefasst (`3×`), sonst wäre die Spalte eine zweite Liste.
* **Nach dem Setzen geht die Karte auf.** Quer über ein perspektivisches
  Bild trifft man keine Station auf den Zentimeter — und muss es nicht, wenn
  die Zahl gleich danach im Feld steht.
* **Die Trägerregel gilt auch beim Ziehen.** Die Knopfspalten fragen sie
  vorher ab; beim Ablegen gibt es keine Spalte. Ohne Sperre landete eine
  Hängestütze am Masten — lautlos, denn gezeichnet wird sie ja. Jetzt sagt
  der Balken, warum nicht.
* **Der Balken deckt.** `var(--acc-s)` allein ist durchscheinend; über einer
  eingelegten Zeichnung liefen Bemassungslinien durch die Beschriftung. Der
  Farbton liegt jetzt auf einer deckenden Fläche.

Der Dialog «Lage in Jochachse», der nach dem Klick auf eine Kachel kam, ist
entfallen: er konnte grundsätzlich nur ans Joch setzen.

### Das leere Endfeld: die Beschriftung, nicht die Rechnung (28. August)

**Befund des Auftraggebers:** «Das Endfeld auf einer Seite weist keine
Resultate auf in der App.»

**Nachgemessen an seiner Ausleitung** (J70, 15 m, Mast HEM 240, sechs
Baugruppen am Joch zwischen 4.1 und 12.2 m): der Rechenkern liefert an
**beiden** Enden Werte, jede Blechfläche trägt ihren Kennwert, und die Farbe
war die ganze Zeit da. Es fehlten die **Zahlen**.

**Die Ursache** war die Ausdünnung der Beschriftung. Sie sortierte streng nach
Betrag und setzte die sechzig grössten. Die grossen Werte liegen dort, wo die
Lasten hängen; die kleinen am Auflager. Am nachgestellten Fall beschriftete
die alte Ordnung nur den Bereich **x = 0.00 … 3.79 m** — der ganze Rest des
Jochs blieb ohne Zahl. Und weil die Lasten selten symmetrisch liegen, trifft
es meist **eine** Seite.

**Jetzt reihum über die Bildbreite.** Die Kandidaten werden in vierzehn
Spalten geteilt; aus jeder kommt der grösste, dann der zweitgrösste, und so
weiter. Am selben Fall reicht die Beschriftung nun von **0.38 bis 14.63 m**.
Der Sinn der alten Ordnung bleibt: der grösste Wert des Bildes steht in der
ersten Runde, denn seine Spalte kommt gleich dran.

Die Reihenfolge steht als eigene, prüfbare Funktion
(`beschriftungsReihenfolge` in render.3d.js) — sie war der Grund, und sie
lässt sich ohne Canvas messen.

**Die einzige Stelle ohne Kennwert** ist das **Endblech** bei x = 0 und x = L:
dort gibt es keine Horizontalbleche, nur die beiden Vertikalbleche. Das ist an
beiden Enden gleich und richtig.

### Masten und Auflagerung sind zwei Fragen (28. August)

**Weisung:** «hier nicht abhängig machen, ob Mast im Modell aufgeführt wird
oder nicht. Die Haupttragwerke sollten global gesteuert werden. Später wird
man auch Einzelmasten und Masten mit Tragausleger übergreifend eingeben
können. Zudem noch Zuganker oder Druckstützen am Masten.»

Bis dahin entschied die Auswahl **«Endauflager»** beides zugleich: *wie* das
Joch gelagert ist **und** *ob* es überhaupt einen Masten gibt. Wer gelenkig
rechnen wollte, verlor den Masten aus Bild, Ausleitung, Wind und Nachweis; wer
den Masten sehen wollte, musste seine Steifigkeit ansetzen.

| Angabe | Was sie entscheidet | Wo sie steht |
|---|---|---|
| `mastVorhanden` | ob ein Mast dasteht — Bauteil, Bild, Ausleitung, Wind, Nachweis | Gruppe **Masten** |
| `endbedingung` | woher die Drehfeder des Jochendes kommt | Gruppe **Auflagerung des Jochs** |

**Die Prüfung, die zählt:** ein Mast im Modell darf die **Jochrechnung** nicht
anfassen, solange die Endbedingung ihn nicht als Feder verlangt. Nachgemessen
für gelenkig, voll und manuell — η bleibt auf die zwölfte Stelle gleich,
während Bild, Wind und Mastnachweis dazukommen.

**«Steifigkeit aus Mast» ohne Masten** rechnet gelenkig — und sagt es: die
Bezeichnung der Feder heisst «gelenkig (kein Mast im Modell)», und ein Hinweis
steht in der Liste. Still eine Feder aus einem Bauteil zu bilden, das nicht
dasteht, wäre die schlimmere Antwort; still gelenkig zu rechnen aber auch.

**Alte Dateien rechnen unverändert.** Fehlt `mastVorhanden`, gilt der frühere
Zusammenhang: es gab einen Masten genau dann, wenn die Endbedingung ihn
verlangte (`mastImModell` in core.auflager.js).

**Die Gruppe «Masten»** nimmt alles auf, was zum Masten gehört — Vorhandensein,
Profil, Höhe, Länge, Stegrichtung, zweiter Mast, Wind, plastischer Nachweis.
Bei der Auflagerung bleibt, was Auflagerung ist: Endbedingung, c_φ, Kragarme,
Anschluss ans Joch. Dort wächst später weiter, was der Auftraggeber genannt
hat: **Einzelmasten und Masten mit Tragausleger** als eigene Tragwerksart,
dazu **Zuganker und Druckstützen**.

### Was ein Leiter an dieser Stelle abgibt (28. August)

**Weisung, mit Rückfrage entschieden:** «Bei den Leitern eine Auswahl
einfügen, ob Ständige / Veränderliche / Ständige + Veränderliche wirkt. Es
kann sein, dass der Leiter nur abgezogen wird (bei Fahrdraht der Fall), oder
dass bei der Befestigung am Joch nur das Tragseil eine Ablenkkraft hat und der
Fahrdraht nicht, da dieser Anteil in die Drückstütze geht. Die ständigen aber
beide zum Tragseil gehen.»

> **Die Achse ist nicht «ständig / veränderlich».** Gewicht **und**
> Ablenkkraft sind beide ständig (Gruppe G). Der genannte Fall trennt sie
> trotzdem: das Gewicht kommt am Joch an, die Ablenkung des Fahrdrahts nicht.
> Eine Wahl mit zwei Stellungen träfe ihn also gar nicht.

Getrennt wird nach dem, was wirklich verschiedene Wege geht — **drei Haken je
Drahtwerk**, alle voreingestellt an:

| | |
|---|---|
| **Gewicht** | Eigengewicht des Leiters |
| **Ablenkung** | Kurvenzugkraft Z·c/R — abwählen, wenn sie anderswo hingeht (Drückstütze, Spurhaltertraverse) |
| **Wind/Schnee** | veränderliche Anteile |

Nur **Drahtwerke** führen die Wahl: ein Träger hat keine Ablenkkraft, und wer
sein Gewicht nicht will, schaltet das Modul ab. Fehlt die Angabe, wirkt alles
— alte Baugruppen rechnen unverändert weiter.

Dazu ein Feld **«Kettenwerk»** (Name/Nummer) als Klammer über Tragseil und
Fahrdraht. Es geht in **keine** Rechnung ein; es hält zusammen, was
zusammengehört. Der **Havariefall** — Bruch eines Leiters oder eines ganzen
Kettenwerks, als aussergewöhnliche Einwirkung mit ständigen Lasten
charakteristisch und dem Leiterzug bei −20 °C — wählt später darüber aus. Das
ist noch nicht gebaut; die Klammer ist die Vorbereitung darauf.

### Der Mast wird nachgewiesen (28. August)

**Nachfrage des Auftraggebers:** «Wie erfolgt die Auswertung, wenn die Masten
modelliert sind? Muss man dies einstellen, oder ist das noch nicht vorhanden?
Gut wäre es, wenn man die Spannung und die Kräfte am Masten sinngemäss gleich
wie beim Joch auswerten könnte und in der Sidebar einen zusätzlichen Button
für die Ausnutzung aufnimmt.»

**Antwort war: nicht vorhanden.** Die Nachweisgruppe «Mast» stand mit
`vorhanden: false`, und im Rechenkern stand der Satz «Sein eigener Nachweis
gehört in ein Rahmenmodell … Bis es das gibt, wird er hier ehrlich gar nicht
geführt statt halb.»

**Entschieden auf Rückfrage:** Querschnittsnachweis, elastisch, mit
**optional plastischem Widerstand**; Schnittgrössen **aus dem Ersatzbalken,
jetzt** — nicht erst nach dem Zurücklesen aus AxisVM. Neu:
`js/core.mast.js`.

**Was eingeht:** Auflagerreaktion des Jochs, Einspannmoment, Jochtorsion,
Wind auf den Masten über seine **ganze Länge** (der Überstand trägt mit — bei
12.5 m über 8 m Anschlusshöhe macht er mehr als die Hälfte des Fussmoments
aus), Anbauteile am Masten **mit ihren Ausladungen**, und das Eigengewicht des
Mastes, das im Ersatzbalken nie vorkam.

**Die Längskraft F_x teilt sich nach k = 3EI/H³** auf die beiden Maste — die
Regel, die der Auftraggeber schon früher festgelegt hatte. Das Auflagerblatt
weist sie weiterhin nur als Summe aus; für den Mastnachweis genügte das
nicht, denn sie steht am Fuss mit dem Hebelarm H.

**W_pl kommt aus der Geometrie**, nicht aus dem Gedächtnis. Die
Mastprofiltabelle führt nur elastische Werte; eine Zahl aus dem Kopf in eine
Nachweistabelle zu schreiben verstiesse gegen «massgebend sind die Daten».
Gerechnet wird das idealisierte I-Profil ohne Ausrundung — das
**unterschätzt** den Tabellenwert um zwei bis vier Prozent und liegt damit auf
der sicheren Seite. Trägt die Tabelle einmal eigene `Wply`/`Wplz`, gelten
diese. **Plastisch gilt nur bei Klasse 1 oder 2**; das ist EN 1993-1-1 und
keine Wahl, und der Nachweis sagt es, wenn der Schalter ins Leere greift.

**Die Zahl bleibt getrennt, das Urteil nicht.** η in der Kopfzeile ist
weiterhin die Ausnutzung des **Jochs** — eine gemeinsame Zahl sagte nicht
mehr, was sie ausnutzt. Aber «Tragsicherheit erfüllt» darf nicht
danebenstehen, wenn ein geführter Nachweis überschritten ist: bei η_Mast > 1
steht dort «Joch erfüllt — MAST NICHT (η 1.145)», und die Zeile ist rot.

**Nicht enthalten: die Stabilität.** Kein Biegeknicken, kein
Biegedrillknicken. Das ist ein Bauteilnachweis nach EN 1993-1-1, 6.3, und er
braucht eine Festlegung der **Knicklänge** — Sache des Auftraggebers. Bei
einem schlanken Kragmast kann er massgebend werden. Das steht in der
Nachweisgruppe, im Mastblatt und im Reiter «Nachweise», nicht in einem
Kommentar. Ebensowenig geht die **Torsion** in η ein; sie ist ausgewiesen,
weil der Fundamentplaner sie braucht.

**Ein Nachtrag für bestehende Stände:** wer ein Tragwerk geöffnet hat, das
gespeichert wurde, als es die Gruppe noch nicht gab, findet `mast: false` in
der Datei — der Nachweis ist dann einmal im Reiter «Nachweise»
einzuschalten. Neue Tragwerke führen ihn ab Werk.

### Klemmen: Gurtebene mal Raster (28. August)

**Nachfrage des Auftraggebers:** «man kann die Anbindung der Bauteile über
unter, ober oder beide Gurte vornehmen. Wenn der Raster noch eingegeben ist,
dann verdoppeln sich die Anschlusspunkte. Kannst du das so überprüfen?»

Nachgerechnet — und er hat recht. Der Kern führt das Moment an **zwei
Stationen** ein, x₁ = x − Raster/2 und x₂ = x + Raster/2; dort bildet es das
Kräftepaar. In jeder Gurtebene stehen ausserdem zwei Winkel nebeneinander:

| Befestigung | Gurtebenen | Winkel | Stationen | Klemmen |
|---|---|---|---|---|
| einseitig | 1 | 2 | 2 | **4** |
| durchgehend | 2 | 2 | 2 | **8** |

**Das Bild zeigte etwas anderes:** einen Würfel je (Gurtebene × Winkel), in
der **Mitte**. Die Anzahl stimmte dadurch zufällig — vier bzw. zwei —, die
Stellen aber nicht, und die Vier bedeutete etwas anderes als die Vier im Kern
(dort Station × Gurtebene). Zwei Bedeutungen für dieselbe Zahl, in einem
Werkzeug, das die Lasteinleitung nachweist.

Jetzt stehen die Klemmen dort, wo der Kern rechnet, die Querriegel je
Station, und die Rastermasslinie nennt die Zahl («Raster 400 mm · 8
Klemmen»). Die Auswahl heisst nicht mehr «(4 Punkte)», sondern
«(2 Gurtebenen)» — die Zahl war eine Ebenenzahl, keine Stückzahl.

### Wind auf die Masten steht im Bild (28. August)

**Weisung:** «den Wind auf den Masten darstellen wie beim Joch.»

Die Last gab es seit dem 27. August — in der **Ausleitung**, als Streckenlast
an jedem Maststab, in beiden Richtungen. Im **Bild** war davon nichts zu
sehen. Ein Mast, der nur hält und nie gedrückt wird, sieht vollständig aus
und ist es nicht; und gerade der Wind quer zum Gleis ist die Richtung, über
die Joch und Mast miteinander reden.

Gezeichnet wird wie am Joch: eine Pfeilreihe über die ganze Masthöhe, dazu
die durchscheinende Fläche zwischen Lastordinate und Profil. **Zwei
Richtungen, zwei Lastarten** — `w_M,x` in der Jochachse liegt auf `windX`,
`w_M,y` in Gleisrichtung auf `windY`; einzeln ausblendbar. Der Pfeil steht
auf der Seite, von der der Wind kommt, und ein negativer Beiwert dreht ihn
um.

**Bemessungswerte, nicht charakteristische.** `mastLast` führt beide: die
Ausleitung braucht die charakteristischen (dort steht jede Einwirkung in
ihrem eigenen Lastfall), das Bild die Bemessungswerte — sonst stünden am
Masten charakteristische Pfeile neben den Bemessungspfeilen des Jochs, in
einem Bild, ohne Kennzeichen.

### Ablenkwinkel: Radius oder Grad (28. August)

**Weisung:** «bei der Eingabe von Radius und Spannweite die Grad angeben,
zudem die Möglichkeit geben, die Ablenkung des Winkels anzugeben ohne
Radiuseingabe für die globale.»

Gerechnet wird mit dem **Winkel**; der Radius ist nur ein Weg, an ihn zu
kommen. Auf manchem Querprofil steht kein Radius, sondern eine Ablenkung —
sie über einen Ersatzradius einzugeben hiesse, rückwärts zu rechnen und dabei
eine Zahl zu erfinden, die niemand angegeben hat.

**Drei Stufen, von innen nach aussen:** der Winkel am **Modul**, der Winkel
an der **Trasse**, dann Radius und Spannweite. Die neue Weiche
«Ablenkung der Fahrleitung» blendet den Radius aus, sobald der Winkel gilt;
der Winkel am einzelnen Drahtwerk schlägt beide weiterhin.

**Die Spannweite bleibt in beiden Fällen sichtbar.** Sie ist nicht nur
Rechenweg zum Winkel, sondern Einflusslänge für Eigengewicht und Wind auf das
Drahtwerk.

**Der Grad steht am Feld.** Eine `notiz` — gerechnet, immer offen, in
Akzentfarbe, im Unterschied zum aufklappbaren Hinweistext — nennt an Radius,
Winkel und Spannweite dieselbe Zahl: `α = −4.525° bei L_FL = 30.00 m ·
Umlenkung in −x`, am Winkelfeld umgekehrt der zugehörige Bogen. Wer den
Winkel nicht sieht, gibt zwei Zahlen ein und erfährt die dritte erst am
Ergebnis — und ein Vorzeichenfehler im Radius fällt dort nicht mehr auf,
sondern nur noch an einer Umlenkkraft, die in die falsche Richtung zeigt.
`notiz` ist ein neuer Feldzusatz im Schema und wird in `aktualisiereMaske`
mitgeführt; stehengeblieben wäre sie schlimmer als keine.

### Was am 28. August noch dazukam

**Weisungen des Auftraggebers, der Reihe nach:**

* **x ist global, an beiden Enden.** «Beim Eingeben von x sich an die globale
  Ausrichtung des Achsensystems halten, das gilt für alle Eingaben bei allen
  Bauteilen.» Am Mast B wurde bisher an der Mastachse **gespiegelt** — mit der
  Begründung, die Teile trügen ihre Ausladung «nach aussen». Damit hatte
  dasselbe Feld zwei Bedeutungen: x = +1.5 zeigte am Mast A nach rechts und am
  Mast B nach links. Die Spiegelung ist raus, in Bild **und** Ausleitung.
* **Masten als Startwert.** `endbedingung` steht neu auf `mast`. `gelenkig`
  war der vorsichtige Wert aus der Zeit, als der Mast nur eine Randbedingung
  war; er ist seither Teil des Tragwerks. Eine Prüfung im Prüfstand, die ein
  Gleichgewichtsargument am Einfeldträger führt, setzt jetzt ausdrücklich
  `gelenkig` — die Randbedingung gehört dorthin und nicht in die
  Voreinstellung.
* **Radius und Winkel nebeneinander**, statt einer Auswahl davor. Wer den
  Radius eintippt, sieht den Winkel; wer den Winkel eintippt, den Radius.
  **Geführt wird nur eine Zahl: der Radius.** Der Winkel wird aus ihm gezeigt
  (neues Schemafeld `wertAus`) und beim Tippen zurückgeschrieben. Zwei
  gespeicherte Zahlen für dieselbe Grösse liefen sonst auseinander —
  spätestens beim Öffnen einer älteren Datei, in der nur der Radius steht;
  dann zeigte das eine Feld 300 km Bogen und das andere −4.5°, und beide sähen
  richtig aus. Bei sehr grossen Bögen ist die Rückrechnung unscharf
  (dR/dα = R/α); auf die Umlenkkraft wirkt sich das nicht aus, und der
  Prüfstand misst genau das.
* **Die Masten sind eine eigene Ebene** im Modell-Menü. Sie lagen bei
  `auflager` — dort, wo Auflagerdreieck, Feder und Kragarmmarke stehen. Der
  Mast ist aber ein Bauteil, und weil er hoch ist, verdeckt er in der
  Längsansicht das halbe Joch: man muss ihn allein wegnehmen können, ohne die
  Lagerung zu verlieren.
* **Jeder Lastpfeil bleibt sichtbar.** «Auch hier werden die Lastvektoren
  nicht angezeigt.» Sie *waren* da — nur zu kurz zum Sehen: die Länge ist auf
  die grösste Kraft im Modell bezogen, und ein Rückleiter mit 0.30 kN neben
  einem Kettenwerk mit 5 kN ergab einen Pfeil von wenigen Zentimetern. Eine
  Last, die gerechnet wird und nicht zu sehen ist, ist schlimmer als keine
  Darstellung: man hält die Stelle für unbelastet. Jetzt gilt eine
  Mindestlänge von 22 % der Bezugslänge; die grossen Pfeile bleiben
  untereinander massstäblich.
* **Die zwei Handlungsknöpfe nur mit Symbolen** — sie nahmen die halbe Breite
  des Modellfensters ein, und dort liegt bei eingelegter Zeichnung das
  Tragwerk.
* **Die Infoboxen zu Schnitt und Feld dezent** — Text auf dem Verlauf statt
  zwei gerahmter Kästen; beim Überfahren treten sie hervor.
* **«Leiter-Traverse» statt «Leiter-Traverse am Joch»**, und ihre Länge als
  Lastwert auf 1.00 m (war 1.50 m).

### Die Grenzlast der Gurtverbindung gilt je Gurt (27. August)

Nachgefragt und entschieden. Zwei Dinge waren daran falsch:

**F = M/h war das Doppelte.** Jede Gurtebene hängt an ZWEI Gurten; die
Grenzlast ist die eines Anschlusses, also der halben Ebenenkraft. Jetzt
`F = M/(2h)` — in `begrenzeFeder` wie im Nachweis A1, denn zwei Wege, die
verschiedene Kräfte für dieselbe Verbindung ausweisen, sind schlimmer als
einer, der irrt.

**Und die Anwendung sagte zweierlei zugleich.** Gemessen am J90/20 m,
HEB 240, F_Grenz 24 kN, mit dem alten Startwert:

```
Feder geometrisch    10472 kNm/rad
Feder im Nachweis     3140 kNm/rad   <- herabgesetzt
M_A des Nachweises    10.78 kNm  ->  F = 24.00 kN   genau die Grenze
Pruefung A1 meldete   20.49 kNm  ->  F = 45.60 kN   eta 1.90  VERLETZT
```

Der Rechenkern setzte die Feder herab, DAMIT die Verbindung ihre Grenzlast
einhält — und A1 wies gleichzeitig die Kraft aus der ungebremsten Feder als
überschritten aus. Beides aus demselben Lauf, und beides angeblich wahr.

Entschieden ist: **die geometrische Feder gilt, die Schraubengrenze ist ein
eigener Nachweis.** Der Schalter «Einspannung durch die Gurtverbindung
begrenzen» steht im **Startwert auf AUS**. Er bleibt erhalten — wer die
weichere Annahme rechnen will, schaltet ihn ein und weiss dann, dass A1 sich
auf ein anderes System bezieht.

### Der Mast trägt seinen Wind selbst (27. August)

**Weisung: der Wind auf den Mast ist keine Option.** Steht der Mast im
Stabmodell, ist er ein Teil des Tragwerks und wird belastet wie das Joch —
nicht «wirkt er auf das Joch?», sondern: er trägt seine Last, und was davon im
Joch ankommt, rechnet das Modell aus.

Damit stehen auf jedem Maststab zwei Streckenlasten, je eine Richtung in
ihrem Lastfall. Beide Werte stammen aus **derselben Tabellenzeile**; die
Stegrichtung entscheidet nur, welche Spalte quer und welche längs ist:

| HEM 240, EK 2 | Steg in Jochachse | Steg gedreht |
|---|---|---|
| quer zum Gleis (`WindX`) | 0.38 kN/m | 0.42 kN/m |
| in Gleisrichtung (`WindY`) | 0.42 kN/m | 0.38 kN/m |

Beim HEM 240 fällt der Unterschied auf — es ist das einzige Profil der
Tabelle, das nicht quadratisch ist. Die übrigen fangen in beiden Richtungen
gleich viel.

Gelesen wird **beides aus der Tabelle**, nicht nur die Gleisrichtung. `wMast`
im Eingabestand ist zwar der Wert quer zum Gleis, wird aber erst von der
Bedienoberfläche nachgeführt; das Modell selbst zu fragen ist der Unterschied
zwischen «stimmt, wenn der Aufrufer es vorher getan hat» und «stimmt». Von
Hand gesetzt gilt nur, was ausdrücklich von Hand gesetzt ist.

**Und der Schalter «Mastwind wirkt auf das Joch» steht im Startwert auf AUS.**
Der Ersatzbalken kann den Mastwind nur als aufgezwungene Auflagerverdrehung
fassen — eine Ersatzgrösse für etwas, das im Stabmodell schlicht eine Last
auf dem Masten ist. Beides zusammen wäre derselbe Wind zweimal.

### Ein ganzer Projektordner auf einmal (27. August)

**Weisung: je Modell ein AxisVM-Modell.** Nicht alle Tragwerke eines Projekts
in eine Datei, sondern jedes einzeln in ein eigenes Modell und eine eigene
`.axs` neben seiner Ausleitung.

Einen **Ordner** auf `AxisVM_aufbauen.cmd` ziehen genügt. Erkannt wird er an
`%ERSTES%\*` — ein blosses `exist` unterscheidet Datei und Ordner nicht.

Umgesetzt als **ein Lauf je Datei**: das Skript ruft sich selbst auf. Nicht
der schnellste Weg, aber der einzige belastbare — der Aufbau läuft linear von
oben nach unten und trägt Zustand in Skriptvariablen. Ihn in eine Schleife zu
legen hiesse, zwischen zwei Modellen jede dieser Variablen von Hand
zurückzusetzen; ein einziges Vergessen würde still das zweite Modell mit
Resten des ersten bauen. Ein eigener Prozess je Modell kennt das Problem
nicht.

Jeder Lauf trägt `-Stapel`: **kein «Weiter mit Enter»**, und AxisVM wird nach
dem Speichern **geschlossen**. Sonst stünden am Ende zwanzig Fenster offen.
Ausserhalb des Stapels bleibt AxisVM offen — dort will man ja weiterarbeiten.

Der **Sammelbericht** liegt im Ordner (`AxisVM_stapel_bericht.txt`) und nennt
je Datei Erfolg oder Fehlschlag; die Einzelberichte liegen bei ihren Modellen.
Ein fehlgeschlagenes Modell hält den Stapel nicht an — es wird gezählt, und am
Ende steht, wie viele von wie vielen standen.

> **`Quit()` schliesst AxisVM nicht.** Zweimal gemessen, beide Male blieben
> die Instanzen stehen:
>
> ```
> Quit() allein                          -> 2 von 2 offen
> AskCloseAll=0, Models.Delete, Quit()   -> 2 von 2 offen
> ```
>
> AxisVM schliesst sich über die **Verweiszählung**: `CloseOnLastReleased = 1`
> und `AskCloseOnLastReleased = 0`, dann geht das Fenster, sobald der letzte
> COM-Verweis fallengelassen ist — `ReleaseComObject` in der Schleife, dann
> `GC::Collect`. Ausserhalb des Stapels bleibt die Eigenschaft auf 0: dort
> soll das Modell ja offen bleiben.
>
> Die Kontrolle «ist wirklich zu?» sass zuerst im einzelnen Lauf und meldete
> prompt einen Fehlalarm — dort ist die eigene Instanz noch am Beenden, wenn
> der Bericht geschrieben wird. Gezählt wird jetzt am **Ende des Stapels**.

### Die Verortung: Linie, Ort, KM (27. August)

Ein Projekt hat eine Reihe von Tragwerken — ohne Verortung heissen sie alle
«J90, 20.00 m». Drei neue Eingabefelder zuoberst im Reiter *System*:
**Liniennummer**, **Ortschaft**, **KM-Position** — in dieser Reihenfolge
(Weisung): vom Groben zum Feinen. Die Linie sagt, wo im Netz; der Ort, wo an
der Linie; der Kilometer, wo genau. Sie gehen in keine Rechnung
ein (der Prüfstand hält das fest) und erscheinen in

* der Modellüberschrift und damit im Ausdruck,
* dem Excel-Bericht (Kopfzeile und Dateiname),
* der AxisVM-Ausleitung — als eigene Felder **und** in der `bezeichnung`,
  die der Bericht der Brücke als Kopfzeile trägt,
* dem **Dateinamen**, und zwar **vorne**:
  `AxisVM_L000_Bahnhof-Nord_KM012.345_J90_L20.0m_anschnitt_gurte.json`

So stehen die Tragwerke eines Projekts im Ordner beieinander, statt sich nach
dem Jochtyp zu sortieren — und man sieht der Datei an, welches Bauwerk sie
ist, bevor man sie öffnet.

> **Text, nicht Zahl.** Die Liniennummer führt führende Nullen, die KM-Angabe
> drei Nachkommastellen mit Punkt. Als Zahlenfeld wäre aus «012.345» still
> «12.345» geworden. Dafür gibt es jetzt die Feldart `text`.

Der Dateiname nennt ausserdem **Knoten- und Auflagermodell** — die ändern das
Tragwerk, nicht nur eine Einstellung. Unter demselben Namen legte der Browser
die zweite Ausleitung als «… (1).json» ab, und die Brücke nimmt die jüngste.

### Der Mast steht im Modell (27. August)

**Weisung:** je Gurtebene ein Starrkörper über die beiden Gurte, von dort ein
Linkelement an den Mast — **Kräfte starr, Momente frei** —, und der Mast bis
zum Fundament, dort **starr eingespannt**.

Damit gibt es ein viertes Auflagermodell, `mast`. Die teilweise Einspannung
ist darin keine Zahl mehr: sie folgt aus der Biegung des Mastes zwischen
Ober- und Untergurthöhe.

```
je Jochende:
    Mastachse in der Jochendebene (x = 0 bzw. x = L), y = 0
    Knoten auf Hoehe Obergurt, Untergurt und Fundament
    je Gurtebene:  Starrkoerper OGL + OGR  ->  Anschlusspunkt
                   Linkelement  Anschlusspunkt -> Mast
    Auflager am Mastfuss: alle sechs Freiheitsgrade gehalten
```

**Warum der Anschlusspunkt 10 cm einwärts sitzt.** Ein Linkelement braucht in
AxisVM eine Linie, und eine Linie braucht Länge; läge der Anschlusspunkt auf
der Mastachse, wäre sie null. Verschoben wird deshalb der **Anschlusspunkt
nach innen**, nicht die Mastachse nach aussen — die Stützweite bleibt damit
die des Rechenkerns. 10 cm ist dasselbe Mass, das schon für die Linkelemente
der Anbauteile gilt.

**Der Längsanker gilt hier nicht.** In den drei anderen Modellen hält genau
ein Knoten das Joch in seiner Achse. Hier halten beide Fundamente — aber über
die Biegung zweier Maste, also weich. Das ist das wirkliche Tragwerk und kein
Zwang: dehnt sich das Joch, geben die Mastköpfe nach.

#### Das Modell steht gegen die Theorie — und die Anwendung daneben

Gebaut, gerechnet und ausgelesen (AxisVM 18 r1k). J90 über 20 m, Schnee
1.0 kN/m, HEB 240 mit H = 7.00 m, Steg in Jochachse:

| | Feldmoment |
|---|---|
| Modell mit Mast | **27.60 kNm** |
| Anwendung (c_φ = 3.10·E·I/H) | 29.51 kNm |

Aus dem Feldmoment rückgerechnet beträgt die wirksame Drehfeder des gebauten
Mastes **13 456 kNm/rad = 3.98·E·I/H**. Das ist der **Lehrbuchwert 4.00** des
unverschieblichen Rahmens auf ein halbes Prozent genau. Damit ist dieser
Aufbau gegen die Theorie belegt: Geometrie, Querschnitt, Anschluss und
Einspannung stimmen.

> **Entschieden am 31. August: der Rechenkern nimmt 4,00.** Damit rechnet die
> Anwendung **27,57 kNm** im Feld gegen die gemessenen 27,60 — eine
> Übereinstimmung auf ein Promille, wo vorher 6,5 % Abstand lagen.
>
> Begründung des Auftraggebers: AxisVM ist das geprüfte Programm, und dass
> sein Wert den Lehrbuchwert des unverschieblichen Rahmens trifft, wiegt für
> die Nachvollziehbarkeit schwerer als eine Zahl aus einem einzelnen Modell.
> Voraussetzung bleibt die **volle Einspannung** des Fundaments — die hier
> Weisung ist.
>
> Die beiden PyNite-Messungen (3,09 und 3,11) bleiben als Tatsache stehen.
> Warum die Programme auseinanderlaufen, ist **nicht geklärt**: es sind nicht
> dieselben Messgrössen — die eine liest die Drehung am Knoten ab, die andere
> schliesst aus dem Feldmoment zurück und hängt an der ganzen Modellkette.

**Was die Brücke dazu lernen musste:** ein I-Profil legt AxisVM mit
`CrossSections.AddI(Name, h, b, tw, tf, R, Process)` an — vermessen, nicht
geraten. Der Ausrundungsradius R steht in keiner Profiltabelle des Werkzeugs,
folgt aber eindeutig aus der Fläche; für HEB 200/220/240/260 und HEM 240
ergibt das 18.1, 17.9, 21.0, 23.9, 21.0 mm — genau die Radien der Norm.

**Noch nicht im Modell:** der **Wind auf den Mast**. Der Rechenkern setzt ihn
als aufgezwungene Auflagerverdrehung an (`mastKopfdrehung`); im Modell müsste
er als Streckenlast auf den Maststäben stehen. Das ist eine Lastdefinition und
damit vorher zu fragen — die Zahl (`wMast`, kN/m) liegt bereit.

### Ein Längshalt statt vier — und die Ungleichheit ist weg (27. August)

Der offene Befund der letzten Sitzung ist entschieden. **Weisung: nur ein
Knoten hält in Jochachse.** Mehr verlangt das Gleichgewicht in Jochrichtung
nicht, und jeder weitere Halt ist ein Zwang — zwei auf verschiedener Höhe
sperren die Drehung um y, zwei auf verschiedener Seite die um z.

Gemessen in AxisVM, beide Läufe am selben Modell (J90 über 20 m, Schnee
1.0 kN/m, c_φ = 12 951 kNm/rad), Momente aus dem Kräftepaar der Gurte:

| Gurtmodell | Ende A | Feldmitte | Ende B |
|---|---|---|---|
| vier Längshalte (vorher) | −42.68 | 26.33 | +2.78 |
| **ein Längshalt (jetzt)** | **+3.69** | **49.11** | **+3.69** |

Symmetrisch, und mit 49.11 gegen 50.00 kNm des gelenkigen Balkens
(−1.8 %) ist das Ende jetzt wirklich biegeweich — genau das, was der Vermerk
im Code seit je behauptet hatte. Gegengeprüft über das Gesamtmoment:
Kräftepaar 49.11 plus örtliche Gurtbiegung −0.02 = 49.09 gegen q L²/8 = 50.

Die Regel gilt für **alle drei** Auflagermodelle. Bei `mitte` hielten zwei
Knoten je Ende in x, was die Drehung um z zweifach sperrt; bei `punkt` war es
ohnehin schon einer.

> **Beim Aufsummieren aufpassen.** Die vier Gurte tragen das Kräftepaar zu
> zweit je Ebene. Der Hebel greift an der SUMME beider Gurte einer Ebene an,
> nicht an ihrem Mittel — mit dem Mittel kommt genau die Hälfte heraus, und
> 24.55 statt 49.11 sieht plausibel genug aus, um unbemerkt zu bleiben. Die
> Kontrolle dagegen ist das Gleichgewicht gegen q L²/8.

### Drei Ausleitungen, die das Auflagermodell übergingen

Beim Gegenlesen kamen drei Stellen derselben Bauart heraus — gefragt wurde
nach dem ENDBUCHSTABEN, nicht nach dem Lager:

* **PyNite** hatte eine zweite, selbstgebaute Lagerungsregel: jeder
  Auflagerknoten y/z/Torsion gehalten plus Drehfeder, gleich welches Modell
  `stabmodell` gebaut hatte. Beim Gurtmodell waren das acht voll gehaltene
  Knoten samt acht Federn statt vier Untergurthalten ohne Feder — PyNite
  rechnete ein anderes Tragwerk als AxisVM aus derselben Ausleitung. Dabei
  fiel auch der Achsentausch auf: PyNites Y ist unser z.
* **Das DXF-Begleitblatt** rief `stuetzung(m, a.ende)` und beschrieb deshalb
  den Ersatzbalken, während die DXF-Datei daneben das Gurtmodell trug — acht
  Zeilen, alle falsch benannt und alle «Auflager A».
* **Der DXF-Weg** liess `auflagerModell` und `starrModell` unterwegs fallen,
  dieselbe Lücke, die einst `axisvmMappe` hatte.

Alle drei behoben und mit Kontrollen belegt.

### Der NT-Ausleger ist ein Kragarm (26. August)

**Weisung des Auftraggebers, im Wortlaut:**

> **Der NT ist ein Kragarm**, das heisst dieser hat min. einen Angriffspunkt,
> der **1.2 m in x-Richtung versetzt** ist. Das Kettenwerk ist dann am Ende des
> Kragarms **2.4 m** gehängt. Daher soll die **Windlast zu 50 % auf den
> Anschlusspunkt Ausleger/Hängestütze** gehen und der Rest geht quasi in das
> Kettenwerk.

Damit ist die offene Frage nach dem Versatz beantwortet: er steht **in
Jochachse** (Modul-`x`), nicht in Gleisrichtung. Die Vorlage `hs-nt-ausleger`
führt jetzt

| Modul | x | e_v |
|---|---|---|
| Hängestütze od. Hängerohr | 0 | 1.35 m |
| Ausleger Typ NT | **1.20 m** | 2.70 m |
| R-FL Kettenwerk | **2.40 m** | 2.70 m |

dazu `windAufTraeger: true, windAnteil: 50`. Der Umlagerungsschalter war
bisher standardmässig aus; für diese Vorlage ist er jetzt an.

**Der Rohrausleger ist derselbe Fall** — nachgereichte Weisung:

> Der Rohrausleger wird **wie der NT-Ausleger an der Hängestütze befestigt**
> und stützt das Kettenwerk. Hierarchisch aufbaubar wie beim NT-Ausleger.
> **1.5 m und 3.0 m.**

Die Vorlage `ausleger-rohr` hatte gar keine Hängestütze: der Ausleger hing
unmittelbar am Joch, an zwei Punkten (`befestigung: unten`). Sie ist jetzt wie
die übrigen Hängestützen-Vorlagen gebaut — Träger, Aufbau, Drahtwerk,
`durchgehend` über vier Punkte, Farbe *hängend*, Name **Hängestütze mit
Rohrausleger**. Die Kennung `ausleger-rohr` bleibt, damit bestehende
Baugruppen ihre Vorlage weiter finden.

| Modul | x | e_v |
|---|---|---|
| Hängestütze od. Hängerohr | 0 | 1.35 m |
| Ausleger Typ Rohr | **1.50 m** | 2.70 m |
| N-FL Kettenwerk | **3.00 m** | 2.70 m |

### Wo ein Mass hinzeigt: Schwerpunkt, nicht Ende

**Weisung, im Wortlaut:**

> Der Endpunkt der Hängestütze und der Ausleger markiert den **Schwerpunkt
> (halbe Länge)**, da werden die Lasten angesetzt — ausser die Ausnahme für
> den Wind in Längsrichtung für die Ausleger, wie schon definiert. So wird
> zum Beispiel die Hängestütze auf −1.5 m in z definiert und der Ausleger
> kommt dann auf z −3.0 m und 1.5 m in x; der Angriffspunkt der Leiter ist
> somit z −3.0 m und 3.0 m in x.

Damit ist die Frage aus dem letzten Abschnitt beantwortet, und zwar aus den
Daten selbst: die Lasttabelle führt für die Hängestütze **`L,rep = 2.7 m`**.
Schwerpunkt also 1.35 m — genau das e_v, das alle vier Hängestützen-Vorlagen
tragen — und **Ende bei 2.70 m**. Dort hängt der Ausleger.

```
Träger      e_v = L/2         seine eigene Last greift auf halber Länge an
  └ Aufbau  e_v = 2 · e_v,Träger      er sitzt am ENDE des Trägers
      x = L_Arm/2                     und greift selbst auf halber Länge an
      └ Drahtwerk  x = 2 · x_Aufbau   am ENDE des Kragarms
```

Der NT-Ausleger erfüllte das schon (1.35 → 2.70, x 1.2 → 2.4). Beim
Rohrausleger standen noch 1.20 und 1.50 aus der Zeit, als er unmittelbar am
Joch hing — er sass damit *über* dem Angriffspunkt seines eigenen Trägers.
Korrigiert auf 2.70 m.

Der Prüfstand rechnet die Regel jetzt gegen `L,rep` aus der Lasttabelle nach,
damit Vorlage und Lastwerte nicht auseinanderlaufen.

### Die Auflager: was eingegeben wird, was es bewirkt, was ankam

Systematisch durchgegangen. Erst die Eingaben und ihre Wirkung:

| Eingabe | wirkt auf | Wirkung |
|---|---|---|
| `endbedingung` | c_A, c_B | gelenkig 0 · voll 10¹² · manuell c_φ · Mast E·I/H × Faktor |
| `mastProfil`, `mastH`, `mastSteg` | c | I_y oder I_z, je Stegrichtung |
| `mastAnschluss` | Faktor 1.00 / 1.45 | **nur im verschieblichen Fall** |
| `mastZwei`, `…B` | c je Ende | zwei verschiedene Maste sind der Normalfall |
| `schraubenGrenze`, `F_Grenz` | senkt c iterativ | bis F = M/h ≤ F_Grenz |
| `wMast`, `mastWindAufJoch` | θ₀ | aufgezwungene Kopfverdrehung |
| `kragA`, `kragB` | Stützweite, M_k | Kragarmmoment wirkt unmittelbar am Knoten |

Drei Dinge daran sind nicht offensichtlich und stehen jetzt in den
Hinweistexten:

**Verschieblich oder nicht entscheidet der LASTFALL, nicht der Benutzer.**
Vertikallasten und Wind in Gleisrichtung → das Joch hält die beiden Mastköpfe
zusammen, Rahmenwert **3.10**·E·I/H. Wind in Jochachse oder eine Längskraft →
beide Köpfe wollen in dieselbe Richtung, Kragmast, **1.00 oder 1.45**. Der
Eingabewert *Anschluss ans Joch* wirkt damit nur im zweiten Fall. Sein
Hinweistext nannte bisher «Faktor 2» — den gibt es nicht mehr.

**Eingespannt wird nur die Vertikalbiegung.** M_z bleibt immer gelenkig; eine
Einspannung dagegen liefe über die Torsionssteifigkeit des Mastes, und die ist
bei offenen Profilen zu gering.

**Die wirksame Feder hängt am Lastfall.** Am nachgerechneten Beispiel (J90,
20 m, HEB 260 / 7.5 m):

```
gk       8011      wyk     12951      windXm    1901   kNm/rad
```

Faktor 7 zwischen den Enden, weil die Schraubengrenze in den meisten Fällen
greift. Die Feder ist damit keine Eigenschaft des Bauwerks allein.

### Die teilweise Einspannung stand nicht im AxisVM-Modell

Und das ist der Befund, der zählt. Der Rechenkern lagert das Jochende über
eine Drehfeder. Im ausgeleiteten Stabmodell gab es die **nur** im
Auflagermodell `punkt` — und das ist ausdrücklich der Ersatzbalken, die
Vergleichsbasis der Kalibrierung, nicht das Bauwerk.

Im Modell `gurte`, der **Vorgabe für die neue Bauweise**, war der Obergurt
lotrecht *frei*. Das ist ein Gelenk. Gemessen am selben Beispiel:

| | Anwendung | ausgeleitetes Modell |
|---|---|---|
| M_A (Bemessungskombination) | **10.78 kNm** | **0** |

**Übersetzung.** Eine Endverdrehung θ hebt den Obergurt gegenüber dem
Untergurt um θ·h. Hält je Obergurtknoten eine Feder k, ist die Kraft k·θ·h und
das Moment beider zusammen 2·k·h²·θ. Gleichgesetzt mit c_φ·θ:

```
k = c_φ / (2 h²)          je Obergurtknoten [kN/m]
```

Dieselbe Zwei-Gurt-Vorstellung, auf der `biegesteifigkeitJoch` und das
Kräftepaar der Anbauteile stehen. Der Prüfstand misst die Übersetzung und den
Rückweg (2·k·h² = c_φ), dazu die Grenzfälle: gelenkig → Obergurt frei, voll →
Obergurt starr.

Beim Modell `mitte` bleibt es beim Gelenk: die beiden Halterungen sitzen auf
halber Höhe, ein Kräftepaar über diesen kurzen Hebel wäre irreführend. Das
Modell ist für die Altbauweise, und dort setzt die Anwendung das Endlager
ohnehin gelenkig.

Das Stabmodell ist **eins** und trägt die Feder der Bemessungskombination.
Wer einen anderen Lastfall untersuchen will, stellt ihn vor dem Ausleiten ein.
Die Modelldatei trägt dafür das neue Merkmal `gurtfeder`; fehlt es, sagt die
COM-Brücke laut, dass das Jochende gelenkig ankommt.

### Selbst gebaut, selbst gerechnet — und die eigene Änderung widerlegt

Auf Weisung: Modell in AxisVM aufbauen und nachprüfen. Dafür wurde die
stehende Regel «gerechnet wird nicht» geöffnet — als **ausdrücklicher
Schalter** `-Rechnen`, nicht als Vorgabe. Ohne ihn ändert sich nichts.

**Drei Modelle gebaut, gerechnet und ausgelesen** (AxisVM 18 r1k, J90 über
20 m, Schnee 1.0 kN/m als ausdrücklich ausgeleitete Streckenlast,
c_φ = 12951 kNm/rad). Momente aus dem Kräftepaar der Gurte, M = h·N:

| Modell | Ende A | Feldmitte | Ende B |
|---|---|---|---|
| `gurte` **ohne** Feder | −42.58 | 26.30 | +2.85 |
| `gurte` **mit** Gurtfeder k = c/(2h²) | −42.65 | 26.30 | +2.80 |
| `punkt`, Drehfeder | −16.70 | 28.28 | −16.71 |
| Anwendung (Ersatzbalken) | 22.12 | 27.88 | 22.12 |

**Die Gurtfeder bewegte 0.07 kNm von 42. Sie ist zurückgenommen.** Der
Gedanke stimmt für sich — eine Endverdrehung θ hebt den Obergurt um θ·h,
also k = c_φ/(2h²) —, trägt hier aber nicht: der lotrechte Halt sitzt am
**Untergurt**, nicht auf der Jochachse. Die Endscheibe dreht sich um den
Untergurt, die Jochachse hebt sich dabei mit; ein anderes System als der
Ersatzbalken, dessen Feder am Auflagerpunkt der Achse sitzt. Eine Feder, die
nichts bewegt, ist schlimmer als keine — sie sieht aus wie eine Übertragung.

**`punkt` dagegen trägt sie, nachgemessen:** Feldmoment 28.28 gegen 27.88 kNm
der Anwendung (**+1.4 %**), und über das Gleichgewicht
M_A = 50.00 − 28.28 = 21.72 gegen 22.12 (**−1.8 %**). Wer eine teilweise
Einspannung im Stabmodell braucht, nimmt dieses Auflagermodell.

### Der schwerere Befund: das Gurtmodell ist an den Enden ungleich

Beim Nachrechnen kam etwas heraus, das mit der Feder nichts zu tun hat und
schon vorher da war. Unter **symmetrischer** Last steht

```
Ende A   −42.6 kNm   nahezu eingespannt
Ende B    +2.9 kNm   nahezu gelenkig
```

Der Grund: am Ende A sind alle vier Gurtknoten in Jochachse gehalten, am Ende
B keiner («ein Ende längs frei»). Eine Verdrehung um y verschiebt Ober- und
Untergurt aber **gegenläufig in x** — vier Festhaltungen sperren sie damit
weitgehend. Der Vermerk im Code («ohne lotrechten Halt am Obergurt entsteht
kein Kräftepaar, das Ende bleibt biegeweich») trifft nur auf Ende B zu.

**Das ist eine Frage an den Auftraggeber** und nicht nebenbei zu entscheiden.
Der Prüfstand hält den Zustand fest, damit die Ungleichheit nicht unbemerkt
wandert.

### Was die COM-Brücke dabei gelernt hat

**Rechnen, nur auf Weisung.** `-Rechnen` ruft
`Calculation.LinearAnalysis(cuiNoUserInteractionWithAutoCorrectNoShow)` und
prüft danach, ob wirklich Ergebnisse vorliegen — eine Rückgabe allein ist
keines.

**Im selben Lauf lesen.** Jeder Aufruf von `New-Object -ComObject` bringt eine
**eigene** AxisVM-Instanz hervor. Rechnet man in einem Lauf und liest im
nächsten, sitzt das Auslesen an einer anderen Instanz: die kennt die
gespeicherte Datei, also die Geometrie, aber keine Ergebnisse. Genau so ist es
passiert — 904 Stäbe gefunden, 0 Ergebnisfälle. Das Auslesen ist jetzt eine
Funktion und aus beiden Wegen erreichbar.

**Der Ergebnissatz muss vorher dastehen.** PowerShell kann für einen
Verbund-Rückgabeparameter keine Instanz erzeugen: `[ref]$null` auf ein
`RLineForceValues` endet in einer NullReferenceException, und beim Feldweg
(SAFEARRAY) **stirbt der Prozess** — beides gemessen. Mit einem vorher
angelegten Satz (`NeuerSatz`, derselbe Helfer wie beim Aufbau) geht es.
Gelesen wird deshalb Stab für Stab statt in einem Feld: langsamer (rund vier
Minuten für 904 Stäbe), dafür belastbar. Diese Lesewege waren nie zuvor mit
echten Ergebnissen gelaufen.

### Die geometrische Feder ins Modell, die Schraubengrenze als Nachweis

**Entscheid des Auftraggebers**, auf die offene Frage hin. Umgesetzt:

*Ins Stabmodell* geht `federn.roh` — E·I/H mal Rahmenfaktor, die Steifigkeit
des **Bauwerks**, unabhängig vom Lastfall. Vorher wäre es die je Lastfall auf
die Schraubengrenze herabgesetzte gewesen; ein Stabmodell gibt es aber nur
eines, und es hätte die Feder eines einzelnen Lastfalls getragen. Die Datei
sagt es jetzt selbst (`tragwerk.federArt`), und die COM-Brücke schreibt beide
Werte in den Bericht.

*Als Nachweis* rechnet die Anwendung ein **zweites Mal** mit der ungebremsten
Feder und weist den Gurtanschluss aus:

```
Prüfung A1   Gurtanschluss am Mast – Kräftepaar M/h aus der geometrischen Feder
             M_St 16.75 kNm / h 0.449 m  →  F = 37.28 kN  gegen  24 kN   η 1.55
```

Das Ergebnis geht **nicht** in die Schnittgrössen des Jochs ein — dort gilt
weiterhin die begrenzte Feder, wie bisher. A1 beantwortet die Frage, die das
ausgeleitete Modell stellt: es trägt die steifere Feder, also auch deren
Stützmoment.

Am nachgerechneten Beispiel ist der Anschluss damit **um 55 % überschritten**.
Das stand vorher nirgends: die Begrenzung hatte es per Konstruktion
eingehalten, und man sah nie, was die Verbindung mit der wirklichen
Maststeifigkeit zu tragen hätte.

`voll eingespannt` bleibt aussen vor — eine Idealisierung zum Vergleich, keine
ausgeführte Verbindung. Dieselbe Ausnahme gilt schon für die Begrenzung.

### Die Konstruktionsprüfungen stehen jetzt da

Das Urteil sagte «1 Prüfung(en) verletzt» und liess den Benutzer damit stehen —
*welche* stand nur in der Excel-Ausleitung. In der Übersicht steht jetzt eine
aufklappbare Liste, Verletztes zuoberst; sie öffnet sich von selbst, wenn
etwas verletzt ist.

### Zwei Nebenbefunde in derselben Ecke

**Das SAF-Blatt ignorierte das Auflagermodell.** Es rief `stuetzung(m, a.ende)`
— also nur den *Buchstaben* des Endes. Damit war `lager.ux` undefiniert und
jedes Lager fiel in die Ersatz-Gabellagerung: volle Haltung in allen
Richtungen plus Drehfeder. Bei vier Gurtknoten je Ende wurde daraus ein
**vierfach eingespanntes** Jochende.

**`axisvmMappe` reichte die Einstellungen nicht durch.** `auflagerModell` und
`starrModell` fielen unterwegs weg; der Dialog bot sie an, die SAF-Ausleitung
nahm dann doch die Vorgabe. Der Datei sah man es nicht an, weil die
Knotennamen aus demselben Aufbau stammen.

### Ein Lastschalter formte die Geometrie um

Gemeldet am Bild: mit ausgeschaltetem «Fahrleitung als Auflager» sah die
Baugruppe anders aus. Sie tat es auch — und der Grund war grundsätzlich.

Die Kette verband **Lastpunkte**, und ein Lastpunkt liegt im *Schwerpunkt*
seines Bauteils, nicht an dessen Ende. Zwischen Hängestütze (−1.35 m) und
Ausleger (−2.70 m, 1.5 m aussen) lief deshalb eine **Diagonale quer durch den
Raum**, wo in Wirklichkeit die Stütze senkrecht bis −2.70 m hinunterläuft und
der Ausleger dort waagrecht ansetzt.

Sichtbar wurde es an einem Schalter, der damit nichts zu tun hat: bei
eingeschaltetem Lasteintrag entsteht ein Hilfspunkt auf der Stützenachse, und
der lag **zufällig genau im Knick**. Die Kette sah richtig aus — und fiel in
sich zusammen, sobald man den Schalter löste.

```
vorher, Schalter AUS      jetzt, in beiden Stellungen
 (0, −1.35)                (0, −1.35)
      ╲                         │
       ╲                   (0, −2.70)
        ╲                       └────── (1.5, −2.70) ── (3.0, −2.70)
     (1.5, −2.70) ── (3.0, −2.70)
```

Der Knick ist **gerechnet, nicht geraten**: er ist die Projektion des nächsten
Punktes auf die Achse des tragenden Glieds. Keine Annahme über Bauteillängen —
die Höhe des nächsten Punktes steht in den Daten. Liegt der nächste Punkt
schon auf dieser Achse (Jochaufsatz und Traverse übereinander), entsteht kein
Knick.

Der Prüfstand hält beides fest: dass die Kette in beiden Schalterstellungen
dieselbe ist, und dass **jedes Glied entlang einer Achse läuft** — eine
Diagonale ändert zwei Koordinaten gleichzeitig.

### Die Vorlagendatei spricht jetzt das Achsensystem von AxisVM

Bis Fassung 2.3 stand in `data/anbauteile.json` ein Abstand **zur Jochachse,
positiv nach unten** (`e_v`). Eingabekarte, Ausleitung und AxisVM zählen z
**nach oben**. Dieselbe Höhe stand damit an drei Stellen mit zwei Vorzeichen,
und ein Jochaufsatz las sich in der Datei als `ev: -1.0`, obwohl er nach oben
ragt:

| | Hängestütze | Jochaufsatz |
|---|---|---|
| Datei bis 2.3 | `ev: 1.35` | `ev: -1.0` |
| Datei ab 2.4, Karte, Ausleitung, AxisVM | `z: -1.35` | `z: 1.0` |

Aus dieser Familie stammen beide teuren Fehler dieser Sitzung: der
Jochaufsatz, der in der Ausleitung eine ganze Jochhöhe zu tief sass, und der
Ausleger auf halber statt ganzer Stützenhöhe.

**Gelesen wird die alte Schreibweise weiter** — Datenpakete von früher müssen
sich öffnen lassen. Die Umsetzung steht an einer Stelle (`zVon`/`yVon` in
`data.anbauteile.js`) statt wie bisher an fünf.

*Beweis, dass sich nichts bewegt:* alle 14 Vorlagen wurden im selben Lauf
zweimal durchgerechnet — einmal aus der alten Datei, einmal aus der neuen —
und auf η, sämtliche Schnittgrössen, jeden aufgelösten Angriffspunkt, jeden
Knoten des Stabmodells und jede ausgeleitete Last verglichen. Null Differenz.

### Den Kragarm spiegeln, die Leiter mitziehen

Ein Ausleger steht nach der einen oder der anderen Seite aus, und das wechselt
von Joch zu Joch. Von Hand wären es zwei Vorzeichen — und das zweite, die
Leiter am *Ende* des Arms, vergisst man.

Am Ausleger steht deshalb ein Knopf **`x ⇄`**. Er spiegelt an der Achse der
Hängestütze: diesen Ausleger und alles, was auf derselben Seite **weiter
aussen** sitzt. Ein zweiter Ausleger nach der anderen Seite bleibt, wo er ist;
einer weiter innen ebenso. Geändert wird nur das Vorzeichen von x — Höhe,
Lasten und Rolle bleiben.

Der Knopf erscheint nur an einem Modul der Rolle *Aufbau*, das wirklich
aussteht (x ≠ 0).

### Ein Modulfeld zeigte vor und nach der Rechnung Verschiedenes

Zwei Stellen schreiben in dieselben Felder: der **Aufbau** der Karte und das
**Auffrischen** bei jeder Rechnung. Sie waren sich uneinig — der Aufbau setzte
`?? 0`, das Auffrischen machte aus einem fehlenden Wert ein leeres Feld. Ein
Modul ohne eigenes `x` zeigte deshalb erst «0» und war nach der ersten
Rechnung leer. In der Vorlage steht `x` gar nicht, also traf es **jede
Hängestütze** — genau so im Bild des Auftraggebers zu sehen.

Die Vorgabe je Feld steht jetzt an einer Stelle (`MODUL_VORGABE`), und alle
drei Wege lesen sie: Aufbau, Auffrischen und der Rückweg beim Tippen. Ein
geleertes Lagefeld legt seither **0** ab statt `null`. Leer bleibt nur, wo
leer etwas *bedeutet*: beim Ablenkwinkel heisst es «aus Radius und
Spannweite».

**Drei Dinge folgten daraus, und alle drei waren nötig.**

**1. Der Windanteil ging an die falsche Stelle.** `windAufTraeger` setzte die
verbleibende Hälfte bisher nur **in y** auf die Achse des Trägers zurück — das
genügte, solange jedes Teil auf der Jochachse sass. Beim Kragarm blieb sie
1.2 m draussen stehen. Jetzt rückt sie auf den Anschlusspunkt in **beiden**
waagrechten Richtungen.

**2. Der Kragarm lädt das Joch an seiner WURZEL.** Das Joch berührt er
draussen nicht — getragen wird er von der Hängestütze, und die hängt über
ihren Raster an *einer* Station. Die Last kommt dort an, und der Versatz
erscheint als Kräftepaar:

```
C = r × F      mit  r = (d, e_x, −e_v)
C_y = −e_v·F_x + d·F_z        Biegung um y
C_z =            d·F_y        Biegung im Grundriss
```

Bis dahin wurde die Last an ihrer eigenen Station aufs Joch gesetzt. Global
ist das fast dasselbe; **örtlich** nicht: das Kräftepaar tritt über den
Anschlussraster ein und belastet die beiden Bindebleche dort — beim
NT-Ausleger 3.84 kNm über 0.40 m.

*Die Probe ist das Gleichgewicht*: dieselbe Last, einmal über den Kragarm und
einmal unmittelbar auf dem Joch an der versetzten Stelle, muss dieselbe
Auflagerkraft ergeben. Ohne Kräftepaar unterscheiden sie sich um F·d/L, mit
falschem Vorzeichen um das Doppelte — das legt das Vorzeichen eindeutig fest,
und der Prüfstand hält es fest.

**3. Die Ausleitung verschluckte den Versatz.** Sie setzte alle Kettenknoten
auf die Station der Baugruppe. Ein Kragarm wäre im AxisVM als senkrechte
Gerade angekommen.

### Bild und Ausleitung bauen jetzt dieselbe Kette

Die Kette stand zweimal im Code — einmal in der Ausleitung, einmal gar nicht:
die Modellansicht zeichnete **einen** Ständer von der obersten zur untersten
Stelle. Ein gerader Strich zeigt von einer Hängestütze mit Ausleger dasselbe
wie von drei Teilen nebeneinander, und genau deshalb blieb wochenlang
unbemerkt, dass im AxisVM alles einzeln am Joch hing: *das Bild konnte den
Unterschied nicht darstellen.*

`anbauKette()` steht jetzt in `js/core.anbauteile.js` und wird von beiden
gelesen. Innerhalb einer Stufe wird nach aussen gereiht — beim NT stehen dort
zwei Punkte (Anschluss Ausleger/Stütze und Angriffspunkt des Kragarms), und
das Kettenwerk hängt am äusseren.

### Ein aufgesetztes Teil sass in der Ausleitung eine Jochhöhe zu tief

Bei `durchgehend` nahm die Ausleitung **immer** den Untergurt als Bezugsebene.
Der Rechenkern misst z dort, wo man es am Bauteil abgreift (`anschlussGurt`):
was nach oben ragt, ab Obergurt. Ein Jochaufsatz sass im ausgeleiteten Modell
deshalb um die ganze Jochhöhe zu tief — beim J90 gemessene **0.449 m**. Für
die vertikale Last folgenlos, für die waagrechte nicht: ihr Hebelarm zur
Jochachse und damit die Torsion war um F_y·h daneben.

Der Prüfstand vergleicht das jetzt über die **ganze Vorlagendatenbank** (24
Lastpunkte): jeder ausgeleitete Lastpunkt muss auf der Höhe sitzen, die der
Kern rechnet.

### Neun Verbesserungen aus einer Sitzung als Nutzer

Ein Joch mit fünf Baugruppen von Hand aufgebaut und dabei mitgeschrieben.
Alles Folgende ist umgesetzt und in Abschnitt 33 des Prüfstands festgehalten.

| Was | Vorher | Jetzt |
|---|---|---|
| Kette im Bild | ein gerader Ständer | ein Glied je Kettenstufe |
| Rolle und Träger | standen nirgends | Plakette und «hängt an …» in der Karte, Warnung bei gleichem Punkt |
| Name der Baugruppe | auf ~4 Zeichen gekürzt («L..») | Untergrenze 84 px; die Kräftezeile weicht |
| Kraftspalte | `x · y · z` neben der Station `x` | `F_x · F_y · F_z` |
| Modellspalte | fiel bei 886 px auf 92 px | Mindestbreite 320 px, Startbreiten aus der Fensterbreite |
| Splitter | fest auf 640 px je Seite | begrenzt durch das, was der Mitte bleiben muss |
| Fenster verkleinern | nur die Mitte schrumpfte | die Schubladen geben nach |
| Ansicht nach dem Ein-/Ausfahren | Joch lief aus dem Bild | fährt am Ende der Bewegung heraus (nie heran) |
| Kraftbeschriftungen | jede, die Platz fand | Budget wie bei den Marken, nach Betrag |
| Gleiszuordnung | nur aus dem Lastgenerator | Feld in der Karte |
| η > 1 | «und welcher Typ dann?» | Sortiment durchrechnen (der Typ wechselt **nicht** von selbst) |

Eine Stolperstelle beim Einbauen, weil sie nicht offensichtlich ist:
`--sp-links` / `--sp-rechts` werden in `style.css` **auf `.ws` selbst**
vorbelegt. Eine eigene Festlegung am Element gewinnt gegen die geerbte von
`:root` — solange das Skript dieselben 386/380 px schrieb, fiel das nie auf.
Die Breiten werden jetzt am Arbeitsblatt gesetzt.


### Anbauteile hingen einzeln am Joch statt in einer Kette (26. August)

Am gerechneten Modell im AxisVM gesehen: statt **Joch → Hängestütze →
Ausleger → Kettenwerk** hing jedes Stück einzeln senkrecht am Joch. Aus der
ausgeleiteten Datei:

```
ARM0  AT0_UG (z −0.33) → AL0 (z −1.58)
ARM3  AT3_UG (z −0.33) → AL3 (z +1.78)     Jochaufsatz
ARM4  AT4_UG (z −0.33) → AL4 (z +3.78)     sein Zusatzleiter — auch direkt am Joch
```

`ARM4` hätte an `ARM3` hängen müssen.

**Der Grund** stand in der Gruppierung: die Ausleitung fasste die aufgelösten
Teile nach **Koordinaten** zusammen (`[x, y, z, Befestigung, Raster]`). Module
*derselben* Baugruppe auf verschiedenen Höhen fielen damit auseinander — und
das ist der Normalfall: die Hängestütze auf −1.35 m, der Ausleger darunter auf
−2.70 m. Jedes bekam seinen eigenen Arm vom Gurt herunter.

**Die Vorlage sagt die Kette bereits** — über die Rolle ihrer Module:

| Modul | Rolle | z |
|---|---|---|
| Hängestütze | `traeger` | −1.35 m |
| Ausleger Typ NT | `aufbau` | −2.70 m |
| R-FL Kettenwerk | `drahtwerk` | −2.70 m |

Gruppiert wird jetzt nach **Baugruppe**, und die Rollen bilden die Stufen:
jede Stufe hängt an der vorigen. Mehrere Teile derselben Stufe hängen
nebeneinander an derselben Vorgängerstufe — zwei Ausleger an einer Stütze sind
eine Gabel, keine Reihe. Wer keine Rolle trägt, bleibt auf Stufe 0, unmittelbar
am Anschluss: wo die Daten keine Kette nennen, wird keine erfunden.

Nachher, dieselbe Baugruppe:

```
AT0_UG (Untergurt)
  └ ARM0_0 → AL0_0  (z −1.57)   Hängestütze
       └ ARM0_1 → AL0_1  (z −2.92)   Ausleger
                    └ Kettenwerk am selben Knoten
```

**Zwei Feinheiten, beide teuer, wenn man sie übersieht:**

* **Fällt ein Punkt mit seinem Vorgänger zusammen** — Ausleger und Kettenwerk
  liegen beide auf −2.70 m —, entsteht **kein** Stab der Länge null; das Teil
  hängt am selben Knoten. Seine Lasten greifen ohnehin dort an.
* **Je Punkt ein Knoten, nicht je Teil.** Ein Anbauteil steht in
  `anbauteileFlach` je Modul *und* je Lastblock einmal. Beim ersten Anlauf
  bekam jeder Lastblock seinen eigenen Arm — zwei steife Arme nebeneinander,
  die die örtliche Einleitung künstlich versteift hätten. Der Prüfstand hat
  das gefangen; genau dafür stand die Regel dort.

**Die Ergebnisse ändern sich dadurch nicht.** Alle Glieder sind Starrkörper am
selben Anschlusskörper, und ein starrer Stern überträgt dieselbe Resultante wie
eine starre Kette. Nachgemessen: Summe F_z −2.70 kN und F_y 1.25 kN, in beiden
Fassungen genau die Werte der Bauteile. Erst wenn ein Gelenk gesetzt wird
(`anbauGelenk`) oder wenn man die Armkräfte selbst liest, macht die Kette einen
Unterschied — dann aber einen grossen.

**Dabei mit herausgefallen:** die alte Fassung erzeugte einen **Stab der Länge
null**, wenn der Lastpunkt auf der Anschlussebene lag. Die Prüfung dazu stand
in einem anderen Abschnitt mit anderer Vorrichtung und hat ihn nie gesehen.

Prüfstand: Abschnitt 32, **14 neue Kontrollen** (Rollen der Vorlage, Kette
statt Stern, Aufsatz steigt, Einzelteil bleibt einzeln, kein Glied der Länge
null, Lastsummen unverändert).

### Der Schnitt im Modell und die angeschriebenen Werte (24. August)

Beim Durchgehen der beiden Werkzeuge kamen zwei Fehler heraus und zwei
Fragen, die der Auftraggeber entscheiden muss.

#### Der Längsschnitt zeigte sieben von dreiunddreissig Blechen

Der Nachweisschnitt kennt drei Orientierungen. **Quer** liegt an einer Stelle;
ihn heranzuholen und das Joch dafür auf drei Felder aufzutrennen ist genau
richtig. **Vertikal** und **horizontal** dagegen legen die Bleche *einer*
Ebene über die ganze Spannweite frei — sie sind da, damit sich deren
Schnittkräfte nebeneinander ablesen lassen.

`zeigeSchnitt()` schnitt aber in allen drei Fällen auf ±2.13 m zu. Gemessen am
Regeljoch: der Längsschnitt beschriftet **33 Bleche**, im Fenster lagen
**sieben**. Die Schnittebene selbst ist vom Ausschnitt ausgenommen und lief
deshalb sichtbar über das abgeschnittene Modell hinaus ins Leere.

Jetzt entscheidet die Orientierung: quer wird herangefahren, längs zeigt das
ganze Joch — und zwar von der Seite bzw. von oben, denn nur so stehen die
Bleche flächig im Bild und ihre Beschriftungen in einer Reihe. Der
Orientierungswechsel richtet die Ansicht mit aus; bisher blieb schlicht
stehen, was vorher da war.

**Nur einmal, nicht bei jedem Klick.** Der Feldschieber ruft bei jedem Schritt
in `zeigeSchnitt()` herein. Beim Längsschnitt ändert er aber nur die Stelle
der Auswertung, nicht das Bild — bedingungslos geschwenkt hätte es einem die
Ansicht bei jedem Klick zurückgerissen.

#### Aus 118 wurde am Bildrand ein lesbares 18

`_werte` setzte die Zahl an den Schwerpunkt der projizierten Fläche, ohne zu
prüfen, ob sie noch aufs Bild passt. Am Rand schnitt der Canvas sie ab. Eine
halbe Zahl ist schlimmer als keine: das Bauteil dazu liegt ohnehin halb
draussen. `_imBild()` misst jetzt dasselbe Rechteck, das `_beschriftung()`
zeichnet, und lässt weg, was nicht ganz hineinpasst.

Dabei fiel ein zweites Sieb auf: `_werte` prüfte den Ausschnitt nach
`punkte[0][0]`, während die Flächen zuvor nach `f.xMitte` gesiebt wurden. Der
erste Eckpunkt eines Gurtstücks liegt bis zu einer halben Feldweite neben
seiner Mitte — am Rand des Ausschnitts fielen dadurch Zahlen von Bauteilen
weg, die sehr wohl im Bild standen.

#### Vier Zeichengänge, vier eigene Freihaltelisten

`V V_L = 1.8 kN` legte sich im Längsschnitt quer über genau die Blechzeile,
die man dort lesen will. Grund: `_marken` und `_masse` teilen sich eine
Freihalteliste (`this._belegt`) und weichen einander aus — die
Pfeilbeschriftungen (`_vektoren`) und die angeschriebenen Werte (`_werte`)
führten dagegen je eine **eigene**. Jeder wich nur sich selbst aus und schrieb
den anderen quer darüber.

Die Rangfolge hat der Auftraggeber festgelegt: **Bemassung und Marken
gewinnen, Pfeile und Werte weichen aus.**

Ausweichen kann aber nur, wer *nach* dem anderen zeichnet — und die Pfeiltexte
kamen bisher zuerst. Deshalb zeichnet `_vektoren` jetzt nur noch die **Pfeile**
und legt seine Texte beiseite; Marken und Bemassung belegen unterdessen ihre
Plätze, und ein neuer Gang `_texte()` setzt zum Schluss, was frei geblieben
ist:

| Rang | Gang | warum dort |
|---|---|---|
| 1 | Bemassung | anklickbar, führt in ihr Eingabefeld |
| 2 | Marken | Auflager, Anbauteile, Blechspannungen |
| 3 | Pfeiltexte | die Grösse einer Last |
| 4 | Werte | stehen ohnehin schon als Farbe am Bauteil |

Der **Abstand der Werte unter sich** bleibt dabei unverändert (das gewohnte
Raster von 42 × 13 px) — geändert hat sich nur, dass sie den anderen dreien
ausweichen.

#### Eine Frage bleibt offen

**Wie dicht dürfen die angeschriebenen Werte stehen?** `_werte` setzt höchstens
60 Zahlen mit festem Raster, unabhängig von der Zoomstufe. `_markenBudget()`
gibt es bereits und rechnet genau das aus dem Massstab aus — es wird hier
nicht benutzt.

#### Und ein Fehler, den erst die Reparatur erzeugte

`zeigeSchnitt()` ändert beim Längsschnitt die Blickrichtung, läuft aber **nach**
`neuRechnen()` — und dort ist die Werkzeugleiste bereits gezeichnet. Im
Blick-Feld leuchtete deshalb noch die vorige Richtung: die Kamera stand
richtig, die Anzeige log. `zeigeSchnittImModell()` zieht die Leiste nach.

Prüfstand: Abschnitt 29, **24 neue Kontrollen** (Ausdehnung der Schnittebene je
Orientierung, Blechmarken über die Länge, Entscheidung in `zeigeSchnitt`, kein
zweiter Schwenk, Randprüfung der Beschriftung, Reihenfolge der Zeichengänge,
Ausweichen gegen einen belegten Platz).

### Navigation im Modell und die installierte Fassung (24. August)

Zwei Dinge, die nichts mit der Statik zu tun haben und trotzdem darüber
entscheiden, ob mit dem Werkzeug gearbeitet wird: wie man sich im Modell
bewegt, und ob es sich auf einem Gerät installieren lässt.

#### Auf einem Tablett liess sich nicht zoomen

Die Ansicht kannte **einen** Zeiger. Ein Finger drehte — und das war alles.
Kein Kneifen, kein Zweifingerwischen; auf einem Tablett gab es schlicht keinen
Weg, näher heranzukommen. Am Schreibtisch fiel das nie auf, weil dort das Rad
zoomt.

Jetzt liegen alle aufliegenden Zeiger in einer `Map`, und die Geste ergibt
sich aus ihrer Anzahl:

| | |
|---|---|
| ein Finger / linke Taste | drehen (mit Umschalt in 15°-Schritten) |
| zwei Finger | **kneifen zoomt, wischen schiebt** |
| rechte oder mittlere Taste, Alt + links | schieben |
| Rad | zoomen; quer und auf dem Trackpad schieben |
| Doppelklick / **Doppeltipp** | das getroffene Bauteil in die Mitte holen |
| Pfeile, `+`/`−`, `0` | drehen bzw. schieben, zoomen, ganzes Joch |

Drei Dinge, die dabei zu bedenken waren:

* **Hebt beim Kneifen ein Finger ab, wird die Geste neu angesetzt.** Führte
  man sie fort, spränge das Bild um den halben Fingerabstand — der
  verbliebene Finger liegt ja nicht dort, wo die Mitte war.
* **`dblclick` gibt es für Finger nicht verlässlich.** Der Doppeltipp wird
  deshalb selbst erkannt, und zwar für Maus und Finger über denselben Weg.
  Zwei Wege für dieselbe Geste hiessen zwei Verhalten.
* **`setPointerCapture` kann werfen**, wenn der Zeiger schon wieder weg ist.
  Ohne Fang weiterlaufen ist besser als mitten in der Geste abzubrechen.

#### Bewegung: nichts springt

Auf Wunsch des Auftraggebers fährt jetzt jeder Zustandswechsel, den man sonst
nur als «vorher / nachher» sähe:

| | vorher | jetzt |
|---|---|---|
| Dialog | erschien und verschwand schlagartig | fährt auf und zu; das Wegräumen wartet auf die Bewegung |
| Bannerschublade | fuhr auf, war aber plötzlich weg | fährt auch zu |
| Reiter | der Unterstrich sprang von durchsichtig auf Farbe | läuft mit |
| Nachweispillen | Farbstreifen sprang | läuft in 0.22 s |
| Fassungsbalken | stand plötzlich da | fährt von unten herein |

**Zwei Grenzen, die dabei gelten und im Stylesheet stehen:**

* **Zahlen werden nicht gefahren.** Ein η, das von 0.58 auf 1.33 hochzählt,
  zeigt unterwegs Werte, die nie gerechnet wurden — in einem Nachweiswerkzeug
  ist das keine Zierde, sondern eine Falschaussage. Bewegt wird die **Farbe**
  und die **Lage** einer Anzeige, nie ihre Ziffer.
* **Das Arbeitsblatt wird nicht überblendet.** Auswertung und Maske bauen sich
  bei jedem Rechnen neu auf, und gerechnet wird beim Ziehen eines Schiebers
  sechzigmal in der Sekunde. Eine Überblendung darüber wäre Schmieren, nicht
  Führen.

**`prefers-reduced-motion` wird geachtet** — abgeschaltet wird aber auf einen
Wimpernschlag (0.01 ms) und nicht auf null: bei `0s` fällt in manchen Browsern
`transitionend` aus, und daran hängt `weich()` beim Ein- und Ausklappen der
Bereiche. Der Bereich bliebe sonst in der Klasse `animiert` stehen.

**Eine Dauer an zwei Orten** — im Skript (`DIALOG_ZU_MS`, `SCHUBLADE_ZU_MS`)
und im Stylesheet. Laufen sie auseinander, räumt das Skript zu früh weg (es
springt doch) oder zu spät (es hängt). Der Prüfstand liest beide Zahlen aus
den Dateien und vergleicht sie: 140 ms und 160 ms.

Am laufenden Programm nachgemessen: Dialog auf, Dialog zu, weggeräumt; ein
zweiter Dialog, der 40 ms nach dem Schliessen des ersten aufgeht, wird vom
nachlaufenden Zeitgeber **nicht** mitgerissen; Schublade auf, zu, verborgen;
Escape räumt über denselben Weg auf.

Prüfstand: Abschnitt 31, **22 neue Kontrollen**.

#### Der Lastfall-Wähler baute sich beim Wählen selbst neu

Im Edge blinkte die Auswahlliste beim Anklicken auf. Der Grund ist kein
Darstellungsfehler des Browsers, sondern ein Kreis in der Verdrahtung:

```
onchange  →  neuRechnen()  →  zeichneEinwirkungswahl()  →  n.innerHTML = …
```

Der `<select>`-Knoten wurde also zerstört und neu erzeugt — mitten in die
eben erst geschlossene Liste hinein. Im Chrome fällt das kaum auf, im Edge
blendet die Liste beim Schliessen nach, und der Knotentausch wird als
Aufblinken sichtbar.

Dieselbe Regel, die für die Eingabemaske längst gilt (`maskenSignatur`: solange
sich die Struktur nicht ändert, bleiben die Felder stehen), gilt jetzt auch
hier. Die Struktur ist die Liste der Lastfälle; ändert sie sich nicht, wird nur
der gewählte Punkt nachgezogen. Nachgemessen über vier Wechsel: **kein
Knotentausch**. Und die Liste bleibt trotzdem lebendig — Schnee ein: 14 → 19
Lastfälle, Schnee aus: wieder 14.

Dazu eine Kleinigkeit im Stylesheet: der Grund eines Feldes wechselte beim
Fokussieren hart um eine Stufe, weil nur die Randfarbe geführt wurde. Jetzt
läuft beides über denselben Übergang.

**Und dieselbe Ursache auf dem Schnittblatt.** Dort war es die Auswahlliste
*Orientierung im Modell* — und der Feldschieber gleich mit: `zeichneSchnitt()`
baute das ganze Blatt neu, also auch den Knoten, den man gerade bediente. An
der Liste blinkte es, am Schieber riss der Zug ab, sobald die erste Rechnung
durch war.

Das Blatt ist jetzt zweigeteilt: oben `#schnitt-steuerung`, das **stehen
bleibt**, unten `#schnitt-zahlen`, das sich bei jeder Rechnung erneuert. Neu
gebaut wird die Bedienung nur bei geänderter Struktur — andere Feldzahl
(Schieberende) oder andere Orientierungsliste. Verdrahtet wird dabei nur
einmal; sonst hingen nach zehn Rechnungen zehn Zuhörer am selben Schieber.

Nachgemessen: Orientierung dreimal wechseln, Schieber dreimal bewegen —
**derselbe Knoten** durchweg, und die Anschriften ziehen nach («Feld 15 von
28», «x = 10.35 m»). Jochlänge 20 → 12 m: Feldzahl 28 → 16, Schieberende
27 → 15, Bedienung **neu gebaut**.

#### Das Modell flackerte bei jedem Schritt der Bereichsfahrt

Beim Ein- und Ausfahren eines Bereichs meldet der Grössenwächter zwölfmal eine
neue Breite. `cv.width` zu setzen **leert die Zeichenfläche** — das ist so
festgelegt —, und gezeichnet wurde erst im *nächsten* Bild, weil `zeichne()`
über `requestAnimationFrame` sammelt. Dazwischen lag also jedes Mal ein fertig
zusammengesetztes Bild mit leerem Grund. Gemessen: **12 Grössenwechsel, 12
leere Bilder**.

Der Grössenwächter läuft nach dem Layout und **vor** dem Zusammensetzen des
Bildes. Dort sofort zu zeichnen heisst deshalb: in demselben Bild, in dem die
Fläche geleert wurde, steht sie auch wieder voll. Danach: **0 leere Bilder**.

#### Und es zoomte, statt sich nur zu verschieben

Jeder Grössenschritt rief `passeEin()`, und das rechnet den Kameraabstand aus
dem Seitenverhältnis. Der Massstab hängt aber allein an der **Höhe** der
Fläche (`f = (h/2)/tan(fov/2)`); wird nur die Breite schmaler, bleibt das Joch
gleich gross und man sieht seitlich weniger davon. Genau das wollte der
Auftraggeber. Eingepasst wird jetzt nur beim ersten Mal, wenn die Fläche noch
die Grösse aus dem Stylesheet trägt.

Nachgemessen: Fläche 1412 → 2776 Gerätepixel breit, die senkrechte Ausdehnung
des Jochs bleibt bei **555 px**. Nebenbei behält damit auch eine selbst
gewählte Ansicht ihren Ausschnitt, wenn man das Fenster grösser zieht.

#### Weich wird es erst, wenn während der Fahrt weniger gezeichnet wird

Die Fahrt selbst ist flüssig — das Zeichnen ist es nicht. Gemessen an
derselben Bewegung:

| | Bildfolge |
|---|---|
| mit Modell | 67 ms je Bild (≈15/s), lange Aufgaben von 50–60 ms |
| ohne Modell (alle drei Gruppen aus) | 16.7 ms (60/s), keine lange Aufgabe |

Ein volles Bild kostet 50 bis 60 ms — 1568 Körper, jeder gefüllt und
umrandet — und zwar unabhängig von der Flächengrösse. Zwölf davon machen aus
einer Bewegung von 300 ms eine Folge von vier Standbildern.

**Während einer Folge von Grössenschritten wird deshalb sparsam gezeichnet:**
keine Körper, keine Beschriftungen. Die **Schwerachsen** tragen feldweise
dieselben Kennwerte und dieselbe Einfärbung (so ist es in `_linien` von
Anfang an angelegt) — das Bild sagt dasselbe, nur ohne Volumen. Für die Dauer
der Fahrt werden sie auch dann gezeichnet, wenn ihr Einzelschalter aus ist;
der **Hauptschalter** der Gruppe gilt weiter.

Erkannt wird die Folge an den Abständen: ein einzelner Schritt — der erste
Aufbau, ein einmaliger Griff an den Fensterrand — bekommt das volle Bild.
Folgt Schritt auf Schritt, läuft eine Bewegung. Steht sie, kommt das volle
Bild 110 ms später nach.

Gemessen an derselben Bewegung: **Median 67 ms → 16.8 ms**, sparsames Bild
rund 5 ms statt 50–60. Die Bildpunkte in der Mittelzeile gehen während der
Fahrt von 243 auf 177 zurück (Achsen statt Körper) und stehen danach wieder
bei 243.

Die Kurve der Bereichsfahrt ist zugleich weicher geworden: 0.3 s statt 0.24 s
und `cubic-bezier(.22,1,.3,1)` — sie nimmt früh Fahrt auf und läuft lange
sanft aus, statt erst spät zu bremsen.

Prüfstand: Abschnitt 31 um **8 Kontrollen** gewachsen.

#### Die Karte fuhr auf dem Layout statt auf dem Compositor

Die verschiebbare Legende setzte bei **jeder** Zeigerbewegung `left` und
`top`. Zwei Dinge daran kosten:

* `left/top` heisst Layout — der Browser rechnet neu, wo alles liegt, für
  einen Kasten, der sich nur verschiebt. Ein `transform` ist Sache des
  Compositors und kostet keins.
* Ein Zeiger schickt mehr Ereignisse, als der Bildschirm Bilder zeigt. Jedes
  sofort auszuführen heisst, mehrfach für dasselbe Bild zu arbeiten.

Jetzt fährt die Karte über `translate3d`, und geschrieben wird **höchstens
einmal je Bild**; festgeschrieben wird `left/top` erst beim Loslassen, denn
die gemerkte Lage muss ohne Versatz gelten. Nachgemessen mit 24 Bewegungen in
einem Bild: **null** Schreibvorgänge während der Ereignisse, danach ein
einziges `translate3d(−120px, −48px, 0)`.

Dabei mit herausgefallen: ein blosser Klick auf den Griff löste die Karte aus
der Ecke, ohne dass man sie bewegt hatte. Jetzt zählt sie erst ab zwei Pixeln
Weg als verschoben. Und abgebrochene Zeiger (`pointercancel`) räumen mit auf.

**Die Schublade** fährt länger und weicher — 0.3 s statt 0.2 s, ein grösserer
Weg und eine Kurve, die sanft ausbremst statt am Ende noch Tempo zu haben.

#### Die Hauptschalter waren Zierrat

«Lasten aus» liess die Wind- und Schneeflächen stehen. Der Grund reicht
weiter: nach den drei Hauptschaltern der Werkzeuggruppen fragten nur einzelne
Zeichengänge — die Kraftpfeile und ein Teil der Marken. Die **Volumenkörper**
und die **Lastflächen** taten es nicht. Mit allen drei Schaltern aus stand das
Joch samt Wind- und Schneefläche unverändert im Bild.

Statt die eine gemeldete Stelle zu flicken, hängt jede Ebene jetzt an einer
Tabelle (`HAUPTSCHALTER`) und einer Prüfung (`_ebeneAn`) — an einer Stelle
statt an sieben:

| Gruppe | Ebenen |
|---|---|
| Modell | Gurtprofile, Bindebleche, Schwerachsen, Auflager, Bemassung, Bodenraster |
| Lasten | Lastflächen, Lastpfeile, Lastwürfel der Anbauteile |
| Resultate | Schnittkräfte, Schnittebene |

Was dort nicht steht (`marken`, `anbau`), hat keinen Hauptschalter über sich
und folgt allein seinem Einzelschalter — wie bisher.

Nachgemessen am Anteil bemalter Bildpunkte: 93 ‰ mit allem, 76 ‰ ohne Modell,
68 ‰ ohne Lasten, 84 ‰ ohne Resultate — und **0 ‰ mit allen dreien aus**. Der
Einzelschalter behält dabei das letzte Wort in die andere Richtung: was er
ausschaltet, bleibt aus, auch wenn die Gruppe an ist.


**Und die Anbauteile bleiben dabei stehen.** Sie lagen bisher mit in der Ebene
`last` und verschwanden mit ihr — wer die Lasten global abstellte, um das Joch
zu sehen, verlor damit auch den *Weg*, auf dem die Last hereinkommt: Ständer,
Ausleger, Traverse. Die sind aber Tragwerk, keine Last.

Der Körper hat deshalb eine eigene Ebene `anbau` in der Gruppe **Modell**, mit
eigenem Schalter. In der Ebene `last` bleibt nur, was die Last selbst
darstellt:

| bleibt bei «Lasten aus» | geht mit |
|---|---|
| Ständer, Ausleger, Traverse, Anschlüsse (180 Flächen) | Würfel am Angriffspunkt (48 Flächen) |
| Positionsnummer A1, A2, … | Lastknoten-Marke, Kraftpfeile, Lastflächen |

Nachgemessen mit vier Baugruppen am Joch: 147 ‰ bemalt mit allem, 105 ‰ ohne
Lasten, 100 ‰ ohne Lasten *und* ohne Anbauteile.

Eine Falle steckt darin, und der Prüfstand ist zuerst hineingelaufen: eine
Ebene, die in `HAUPTSCHALTER` steht, aber keinen Anfangswert in `this.ebenen`
hat, ist von Anfang an unsichtbar — `_ebeneAn` liest `undefined` und antwortet
nein. Eine Kontrolle vergleicht die beiden Listen jetzt.

Prüfstand: Abschnitt 30, **23 neue Kontrollen**.

#### Das Drehen war spiegelverkehrt — auf einer Achse

Beim Drehen folgte das Modell der Hand nur **senkrecht**. Waagrecht lief es
ihr entgegen: `az -= dx` dreht die *Kamera* in die Zugrichtung, und damit das
Modell dagegen. Dass die beiden Achsen sich widersprachen, ist das, was sich
spiegelverkehrt anfühlt — eine Diagonalbewegung kippte das Modell in eine
Richtung, die mit keiner der beiden zu tun hatte.

Nachgerechnet über `_projektor()` am zugewandten Punkt `Ziel + vor·r`, also an
genau der Stelle, die man beim Ziehen anfasst:

| gezogen | Bildpunkt vorher | nachher |
|---|---|---|
| 60 px nach rechts | **−88 px** (entgegen) | **+88 px** (folgt) |
| 60 px nach unten | +96 px (folgt) | +96 px (folgt) |

Ein Vorzeichen, `az += dx * s`. Am laufenden Modell nachgemessen: ein Zug von
160 px nach rechts verschiebt den Helligkeitsschwerpunkt um 194 Gerätepixel
nach rechts.

**Warum das so lange durchging:** die Prüfung dazu lautete «nach rechts
gezogen dreht sich die Ansicht» und sah nur, *dass* sich `az` ändert — nicht,
*wohin* sich das Bild bewegt. Sie steht jetzt am Projektor und prüft alle vier
Zugrichtungen einzeln, dazu die gleiche Empfindlichkeit beider Achsen
(88 px waagrecht gegen 96 px senkrecht).

#### Gezoomt wird auf den Zeiger, nicht auf die Mitte

Bisher kam einem beim Heranfahren die Bildmitte entgegen. Wer eine Ecke des
Jochs ansehen wollte, musste nach **jedem** Radschritt nachschieben.

`_zoome(faktor, px, py)` hält den Weltpunkt unter dem Zeiger fest. Der
Bildpunkt liegt von der Mitte aus bei `rechts·ex·w` und `hoch·(−ey)·w`, wobei
`w` das Weltmass je Pixel in der Zielebene ist; mit dem Abstand skaliert auch
`w`. Damit derselbe Weltpunkt wieder unter dem Zeiger liegt, wandert das
Blickziel um die **Differenz** der beiden Weltmasse — `w·(1−f)`.

Festgehalten wird der Punkt in der **Zielebene**. Davor und dahinter bleibt
eine Restbewegung; perspektivisch lässt sich das nicht vermeiden, weil dort
jede Tiefe ihren eigenen Massstab hat.

Der Prüfstand rechnet das nicht nach, sondern **projiziert**: derselbe
`_projektor()`, mit dem auch gezeichnet wird, muss den Punkt nach dem Zoomen
wieder auf dieselben Bildkoordinaten legen. Stimmt auf 10⁻⁶ Pixel, hin und
zurück.

#### Zwei stille Fehler nebenbei

* **Radschritte im Zeilenmodus wirkten fast nicht.** Firefox und viele Mäuse
  melden `deltaMode = 1` und `deltaY = 3`. Der Faktor `exp(3·0.0012)` ist
  1.0036 — man dreht und dreht und nichts geschieht. Jetzt werden Zeilen und
  Seiten in Pixel umgerechnet.
* **Die Zoomschranken waren fest** (0.4 bis 400 m). Sie passen entweder zum
  6-Meter-Joch oder zum 20-Meter-Joch, nie zu beiden. Jetzt an der Diagonale
  der Hüllbox gemessen.

#### Die installierte Fassung war eine Seite im eigenen Fenster

Dienstarbeiter, Manifest und der Installierknopf standen. Was fehlte, waren
die Funktionen, für die sich das Installieren überhaupt lohnt.

**Dateien öffnen.** Das Manifest trägt `file_handlers`; die installierte
Anwendung erscheint im *Öffnen mit* des Dateimanagers. Der Browser fragt bei
der Installation um Erlaubnis — ohne sie kommt die Frage gar nicht erst, und
zur Standard-Anwendung für `.json` wird sie nie von selbst. Derselbe Rückruf
nimmt Dateien an, die man **auf das Fenster zieht**; das geht auch im Reiter
und ohne Installation.

Was hereinkommt, wird an seinem Kopf erkannt und *dann* gefragt:

| Kennung | Antwort |
|---|---|
| `format: tragjoch-daten` | Datenpaket laden — Anzahl je Teil und Stand vorgelegt |
| `art: tragjoch-ablage` | Ablage einlesen — Anzahl Tragwerke und Vorlagen vorgelegt |
| `format: tragjoch-stabmodell` | «Das ist eine Ausleitung» — sie führt hinaus, nicht herein |
| alles andere | benannt, nicht verschluckt |

**Gefragt wird immer.** Eine Ablage einzulesen legt Einträge an, ein
Datenpaket tauscht die ganze Datenbasis; beides darf nicht dadurch geschehen,
dass jemand danebengreift.

Der Empfang wird **vor** der Datenprüfung in `start()` eingerichtet. Fehlt die
Datenbasis, steigt `start()` aus — und genau dann ist das Hineinziehen des
Datenpakets der Weg, der gebraucht wird. Der Prüfstand hält die Reihenfolge
fest.

**Sprungliste.** `shortcuts` im Manifest rufen dieselbe Seite mit `?los=neu`,
`?los=ablage`, `?los=handbuch`. `startWunsch()` liest den Wunsch aus und
**entfernt ihn aus der Adresse** — bliebe er stehen, führte jedes Neuladen
wieder in denselben Dialog, und ein Lesezeichen auf «Handbuch» wäre keines auf
die Anwendung.

**Ein echter Fehler:** `window-controls-overlay` stand im `display_override`,
aber das Stylesheet hielt den Streifen der Fensterknöpfe nicht frei. Im
eigenen Fenster lagen Minimieren, Maximieren und Schliessen genau über
`#kopf-werkzeuge` — der Installierknopf war nicht mehr erreichbar.
`env(titlebar-area-x/width/height)` räumt den Streifen; die Kopfleiste zieht
das Fenster (`app-region: drag`), alles Anklickbare darin ist ausgenommen.

**Und ein alter, der beim Bauen der neuen Dialoge auffiel:** `dialog()` band
nur den **ersten** `[data-zu]` — und das ist immer das Kreuz in der Kopfzeile.
Jedes «Abbrechen» im Fuss war seit jeher tot. Jetzt `querySelectorAll`.

Dazu eine Kleinigkeit, die man vermisst, sobald man sie kennt: die Fusszeile
schreibt `· ohne Netz`, wenn keine Verbindung besteht. Gerechnet wird
unverändert weiter — es geschieht ohnehin alles im Browser —, aber eine neue
Fassung kommt dann eben nicht.

Prüfstand: Abschnitte 27 und 28, **57 neue Kontrollen** (Zoom hin und zurück
über den Projektor, Schranken am Modell, Schieben verhältnisgleich zum
Abstand, Rasten auf 15°, Polbegrenzung, Manifest, Ablageliste des
Dienstarbeiters, Reihenfolge in `start()`).

### Der erste Lauf auf dem Windows-Rechner (23. August)

AxisVM steht jetzt neben der Anwendung, und der Botengang entfällt. Was
vorher je einen Durchlauf gekostet hätte, war an einem Nachmittag zu klären.

#### Die lokalen Stabachsen sitzen — 942 von 942

Der letzte offene Punkt des Aufbaus. Zurückgelesen an vier Stäben: gesetzt 1,
gelesen 1. **Drei Fehler lagen übereinander**, jeder hat den nächsten verdeckt:

| Irrtum | Wahrheit |
|---|---|
| `$script:m` gilt auch im Closure | `GetNewClosure()` legt ein **neues dynamisches Modul** an; darin zeigt `$script:` auf dessen Modulscope. Das Modell war leer, nicht das Argument — daher «Methode für einen Ausdruck, der den NULL hat» |
| Die erste x/y/z-Gruppe im Satz trägt die Richtung | Sie gehört zu `Point`, gesetzt war aber `rtVector`. Unter `ReferenceData` liegen **fünf Zweige nebeneinander**, und AxisVM liest nur den, auf den `ReferenceType` zeigt. Jetzt `Vector.P1` → Ursprung, `Vector.P2` → Richtung |
| Ein Verbund-Typ verträgt den Umweg über `Versuche` | Derselbe Satz, der auf Skriptebene mit Rückgabe 1 durchgeht, scheiterte über den Kandidatenblock mit `DISP_E_BADVARTYPE`. Durch fremde Gültigkeitsbereiche gereicht, kommt er am Marshaller nicht mehr als Satz an |

**Regel:** wo es ohnehin nur eine Schreibweise gibt, ist Durchprobieren nicht
bloss überflüssig, sondern schädlich. Der Aufruf geht unmittelbar.

Die Schnittstelle wurde dabei erst am **Prüfstand** geklärt und nicht am
942-Stab-Modell: ein Probemodell mit zwei Knoten und einer Linie beantwortet
dieselbe Frage in dreissig Sekunden.

#### Die Vertikalbleche stehen lotrecht

Am halbfertigen Modell gesehen: die Bleche standen 4 mm aus dem Lot. Ursache
ist `schenkelVersatz` — die Blechachse sitzt je Gurt um `zs_V − t/2` neben
dessen Schwerachse, und Ober- und Untergurt tragen verschiedene Profile.

Vorgabe des Auftraggebers, im Wortlaut:

> **Die vertikalen Bleche sind nicht ganz lotrecht. Dies sollte aber auf jeden
> Fall sein — das heisst, die unteren Gurte sind entsprechend in der
> y-Richtung auszurichten, dass die Schenkel ausgerichtet sind mit denen von
> den Obergurten.**

Gebaut in `gurtKnoten` (`js/export.axisvm.js`): die Untergurte rücken um
`dy_OG − dy_UG` — am Signaljoch 4.6 mm. Alle 58 Vertikalbleche laufen jetzt
lotrecht.

**Der Rechenkern bleibt unangetastet.** Auf Nachfrage entschieden: die
Ausrichtung betrifft allein den Aufbau im AxisVM-Modell, `hebelarme()` rechnet
weiter mit einem gemeinsamen b.

#### Starrelemente als das, was sie sind

Vorgabe des Auftraggebers:

> **Die Starrelemente sind auch als solche in AxisVM zu modellieren.** In den
> Optionen der App anpassbar, falls man dicke Stäbe mit Qualität starr
> anwenden will. **Bei den gelenkigen Anschlüssen die Linkelemente einsetzen,
> bei denen kann man die Kraftübertragung einstellen.**

Vermessen und gebaut:

| | |
|---|---|
| ohne Gelenk | `RigidBodies.Add(Int32[] LineIds)` — nimmt Linien-Nummern; die Linie braucht kein `DefineAsBeam` |
| mit Gelenk | `LinkElements.AddNN(RNNLinkElementRec)` — Linie muss vorher liegen (`LineId`), Kraftübertragung je Richtung in `Stiffnesses` |

**Nicht jeder steife Stab wird ein Starrkörper.** Das war der Befund, der den
ersten Versuch zum Abbruch brachte: 224 der 700 STARR-Stäbe sind
Gurtabschnitte im Knotenbereich, und auf ihnen liegen **168 der 344
Streckenlasten**. Ein Starrkörper kann keine tragen.

Entschieden (Weisung) und in `starrArt` gebaut:

| Rolle | Anzahl | wird |
|---|---|---|
| `verbindung` — Stummel Gurtachse → Blechachse, Anbauteil-Anschluss | 244 | Starrkörper bzw. Linkelement |
| `blechende` — steifer Teil des Blechs im Knotenbereich | 232 | ebenso |
| `gurtabschnitt` — steifer Teil des **Gurtes** | 224 | bleibt Stab: er ist Teil des Bauteils und trägt Last |

**Offen, auf Wunsch später:** auch die Gurtabschnitte als Starrkörper, mit
Umlegung ihrer Streckenlasten auf die Nachbarstäbe oder in Knotenlasten. Die
Umlegung wäre selbst eine Modellannahme und ist deshalb nicht gebaut.

Neue Option im Ausleitungsdialog: **Starrelemente** — «als Starrkörper und
Linkelemente» (Vorgabe) oder «als steife Stäbe» (die frühere Bauweise).

#### Zählen ist die falsche Kontrolle

476 angelegte Starrkörper ergeben **118** im Modell — und dieselben 118 auch
bei 700 angelegten. AxisVM legt zusammen, was sich einen Knoten teilt, und
das ist richtig so. Weil die Gurtabschnitte Stäbe bleiben, kann die
Verschmelzung eine Station nicht über ihre Grenze hinaus starr machen.

Gefragt wird deshalb je Linie nach `RigidBodyId`: **476 angelegt, 0 ohne
Körper.**

#### Die Bauteile stehen, wie sie gebaut werden (24. August)

Vier Weisungen aus der Durchsicht am Modell, alle umgesetzt:

**Bleche um 90° um die lokale x-Achse gedreht.** Bestätigt am Modell. Gedreht
wird über das Kreuzprodukt aus Stabrichtung und bisheriger z-Richtung, nicht
über eine Fallunterscheidung — für ein stehendes Blech wandert z damit von der
Jochachse in die Gleisrichtung, für ein liegendes in die Lotrechte.

**Die vier Gurtwinkel stehen spiegelbildlich.** Nach dem Schnitt A-A des
Sortiments: liegender Schenkel aussen, stehender innen, in jeder Ecke anders
herum. Ein L lässt sich in AxisVM nicht spiegeln — beim gleichschenkligen
Winkel ist das Spiegelbild aber eine Drehung um 90°, und die steuert die
Referenzrichtung:

| Schenkel zeigen nach | Drehung | Referenz |
|---|---|---|
| +y, +z | 0° | `[0, 0, 1]` |
| −y, +z | 90° | `[0,−1, 0]` |
| −y, −z | 180° | `[0, 0,−1]` |
| +y, −z | 270° | `[0, 1, 0]` |

Wohin die Schenkel einer Ecke zeigen, sagt die Einbaulage: der liegende nach
`ecke.sy · lg`, der stehende nach `ecke.sz · st`. Damit folgt die Lage der
Eingabe und ist nicht fest verdrahtet.

**Die steifen Gurtabschnitte tragen den Querschnitt ihres Gurtes.** Weisung:
gleiche Querschnitte, Steifigkeit im Hintergrund hochdrehen — dann stimmen
Eigengewicht und Darstellung. Ein Ersatzrechteck von 500 × 500 mm wöge das
Fünfzigfache und stünde als Klotz in der Ansicht.

Hochgedreht wird über ein eigenes **Material** mit tausendfachem E-Modul und
unveränderter Dichte. **Nicht** über `StiffnessReduction`: gemessen nimmt
AxisVM dort keinen Wert über 1 an — gesetzt 1000, gelesen 1, ohne
Fehlermeldung. Es ist eine Reduktion, keine Steigerung. Die Kennwerte kommen
vom Katalogmaterial statt aus unserer Datei, damit sich die Frage der Einheit
gar nicht stellt (gemessen: `Ex = 2.1e8`, also kN/m²).

**Anbauteile gehören nicht in den steifen Knotenbereich.** Was dort zu liegen
käme, wird herausgeschoben und mit **10 cm Abstand** zum angrenzenden starren
Gurt gesetzt. Geschoben wird die Mitte der Baugruppe, die Reihen folgen ihr im
Raster — sie einzeln zu schieben risse das Raster auseinander. Am Signaljoch
betrifft das sechs Teile (150 mm und 70 mm); die Verschiebungen stehen als
`tragwerk.ausKnoten` in der Ausleitung.

**Der Übergang Gurt → Anbauteil läuft über ein vertikales Linkelement** von
10 cm, am Obergurt nach oben, am Untergurt nach unten angesetzt. Der
Anschlusskörper ist ein Starrkörper und sitzt um diese Länge neben der
Gurtebene; der Lastpunkt bleibt, wo er ist.

**Die Freigabe der zweiten Reihe ist damit ins Link gewandert.** Sie stand
vorher im Ast des Anschlusskörpers, weil dort «lokal x» eindeutig war. Das
Link stellt seine Kraftübertragung global (`sysGlobal`) — «x» ist die
Jochachse, ebenso eindeutig, aber ohne den Umweg.

#### Nach der zweiten Durchsicht am Modell

**Das Link überträgt Kräfte, keine Momente.** Weisung im Wortlaut: *«so
eingeben, dass nur die Kräfte in x y z und nicht die Momente übertragen
werden, was der Sinn ist, warum wir die Linkelemente eingesetzt haben.»*
Also `K_X`, `K_Y`, `K_Z` gehalten, `K_XX`, `K_YY`, `K_ZZ` frei — und in der
zweiten Reihe zusätzlich die Längskraft frei.

**Das Anbauteil selbst ist ein Starrkörper**, nicht nur sein Anschlusskörper.
Es trägt keine Streckenlast — seine Lasten sitzen als Punktlasten am
Lastknoten —, also geht dabei nichts verloren. Ist ein Gelenk gesetzt, bleibt
es ein Stab: ein Starrkörper kennt keine Freigabe.

**Die steifen Gurtabschnitte standen verdreht.** `lcs()` erkannte den Gurt am
Querschnittsnamen, und der heisst beim steifen Abschnitt noch `STARR` — der
Tausch gegen `GURT_OG`/`GURT_UG` geschieht erst danach in `gurtSteif()`.
Jetzt zählt die **Rolle**, nicht der Name; die Knotenklötze stehen wie ihre
Gurte.

#### Ein Anschluss, der einen Freiheitsgrad offen lässt

Zwei Vorgaben treffen sich hier: Links ohne Momente, und Anschlüsse mit zwei
Punkten. Hängt ein Anbauteil an **einer Reihe in einer Ebene**, liegen seine
beiden Punkte auf einer Geraden in Gleisrichtung — und um diese Gerade hält
ihn nichts. Eine Drehung dorthin bewegt keinen der Punkte, weckt also keine
Kraft: der Starrkörper kippt.

AxisVM meldet das erst beim Rechnen, als singuläre Matrix. Deshalb sagt es die
Brücke vorher: `tragwerk.pendelnd` führt die betroffenen Teile, und der
Bericht nennt sie mit Ort und Ebene.

**Am Signaljoch tritt der Fall nicht auf** — alle drei Anbauteile sind
durchgehend befestigt und hängen an vier Punkten in zwei Höhen; das Kräftepaar
zwischen Ober- und Untergurt hält die Drehung. Bei einem einseitig
befestigten Teil mit nur einer Reihe wäre zu entscheiden: das Moment um die
Querachse doch halten, oder den Anschluss auf zwei Reihen führen.

Prüfstand: zwölf neue Kontrollen, **943 bestanden**.

#### Ein Prüfjoch mit gemischten Anbauteilen

Zum Prüfen der Modellierungseinstellungen gebaut: **J90 über 24 m**,
Trasseeradius **600 m** (also mit Ablenkkräften), zwei **gleiche**
Anschlussmaste HEB 260 / 8.5 m, und drei verschiedene Baugruppen —
Jochaufsatz einfach, Hängestütze mit NT-Ausleger, Leiter am Joch.

```
540 Stäbe · 575 Starrelemente (135 Körper) · 36 Linkelemente
1151 Referenzen · 18 Punkt- und 206 Streckenlasten  ->  Pruefjoch_COM.axs
```

Die drei Baugruppen zerfallen in **fünf Angriffspunkte** — der Jochaufsatz
trägt seinen Zusatzleiter eine Ebene höher, die Hängestütze ihren Ausleger
tiefer. Drei davon tragen eine **Ablenkkraft in der Jochachse** (zusammen
2.81 kN), und zwar genau die drei mit einem Drahtwerk. Fünf Teile sind aus
Knotenbereichen herausgerückt (je 140 mm).

Weil alle drei Baugruppen ein Raster über 25 mm haben, entstehen hier echte
**zwei Reihen** je Ebene — anders als am Signaljoch, wo das Raster von 20 mm
zusammenfällt. Damit ist auch die Längsfreigabe der zweiten Reihe im Modell
wirksam, und `pendelnd` bleibt leer.

**Die Lage der Verbindung** steht bei allen Linkelementen auf **0.5**
(Weisung); ohne Angabe stünde sie auf 0, also am Anfangsknoten.

#### Die ständige Last ist dreigeteilt

Weisung: im AxisVM-Modell zu trennen nach Joch, Anbauteilen und
Ablenkkräften. Im Rechenkern bleibt «G» **eine** Einwirkungsgruppe — geteilt
wird nur in der Ausleitung:

| Lastfall | trägt |
|---|---|
| `G` · Ständig · Joch | Eigengewicht der Stäbe, Zuschlag |
| `G_Anbau` · Ständig · Anbauteile | Gewicht der Baugruppen |
| `G_Ablenk` · Ständig · Ablenkkräfte | Z·c/R an den Drahtwerken |

Erkannt wird die Ablenkkraft an ihrer **Richtung**: sie ist die einzige
ständige Last in der Jochachse. Die Kombinationen setzen alle drei mit
demselben Beiwert an — zusammen sind sie das G des Rechenkerns.

Die Trennung gilt **nur für die COM-Ausleitung** (`gTrennen`). Die SAF-Mappe
und die DXF-Zuordnung schreiben ihre Lastfallliste selbst; dort verwiese eine
Last sonst auf einen Fall, den es nicht gibt — der Prüfstand hat genau das
sofort gemeldet.

#### Die Sprache folgt AxisVM

Was dort im Dialog «Verbindungselement» heisst, heisst jetzt auch bei uns so —
in der Oberfläche und im Bericht der Brücke. Die COM-Namen (`LinkElements`)
bleiben unverändert; sie sind keine Beschriftung, sondern die Schnittstelle.

Der Ausleitungsdialog nennt ausserdem, was seit der COM-Brücke mitgeht:
Eigengewicht der Stäbe als Last, die Lastkombinationen dieser Anwendung, und
die dreigeteilte ständige Last.

#### Eigengewicht, Kombinationen, Schnee

**Das Eigengewicht der Stäbe steht jetzt als Last im Modell** (Weisung) —
`Loads.AddBeamSelfWeight(LineId, LoadCaseId)` je Stab, im ständigen Lastfall.
Starrkörper bekommen keins: sie sind keine Stabelemente, und ihr
Ersatzquerschnitt wäre frei erfunden. Die steifen Gurtabschnitte dagegen
tragen mit — sie führen den Querschnitt ihres Gurtes und dessen Dichte.

**Die Kombinationen kommen aus der Anwendung**, nicht aus AxisVM:

```
LoadCombinations.Add(Name, ECombinationType, Double[] Faktoren, Int32[] Ids)
```

Ein Lastfall der Anwendung ist ein Satz Beiwerte über den vier
Einwirkungsgruppen — genau die Form, die diese Methode erwartet. Gruppen mit
Beiwert null bleiben draussen. Die Art entscheidet den Typ: Tragsicherheit als
ULS, Gebrauchstauglichkeit und die charakteristischen Einzelfälle als SLS. Am
Prüfjoch sind es **18 angelegt, 18 im Modell**.

Der Kombinationstyp wird **nachgeschlagen, nicht gesetzt**: neu `Aufzaehlung`,
dieselbe Überlegung wie bei `FehlerName`. Ein falscher Typ wirft keinen
Fehler — er legt die Kombination nur in die falsche Familie.

**Schnee stand auf aus.** `schneeAktiv` ist in `standardwerte()` false; im
Prüfjoch war er deshalb leer. Eingeschaltet trägt er 208 Streckenlasten.

#### Die Fahrleitung als Auflager — nachgemessen

Weisung: bei Wind y stützt die Fahrleitung den Ausleger, die halbe Windlast
geht auf die Hängestütze; für die ständigen Lasten gilt das **nicht**, aus
ihnen folgt über den Abstand ein Moment.

Genau das leistet `windAufTraeger()` schon, und am Modell ist es jetzt
sichtbar. Der Ausleger sitzt 1.20 m seitlich:

| Punkt | y | trägt |
|---|---|---|
| Ausleger | **1.20 m** | ständig G_z −2.200 und G_x 1.833 (Ablenkung), Wind x |
| Windanteil | **0.00** (Stützenachse) | nur Wind y **0.275 kN** = die Hälfte von 0.55 |

Die ständigen Lasten behalten ihren Abstand und damit ihr Moment; nur der
halbe Wind rückt auf die Achse, die andere Hälfte verlässt das Joch. Die Höhe
bleibt bei beiden gleich — der Hebelarm zur Jochachse ändert sich nicht.

**Ein Modul führt `y` und `z`**, nicht `ev`/`ex`. Letzteres ist die alte
Sprache der Vorlagen und wird in `neuesAnbauteil()` umgesetzt; wer `ex` von
aussen setzt, setzt ins Leere.

#### Zwei Punkte brauchen das Moment um y

Weisung: *«Es gibt Befestigungen, die nur über zwei Punkte angeschlossen
werden, am Ober- oder am Untergurt je nachdem. Bei diesen müssen die
Linkelemente ein Moment um die y-Achse aufnehmen können.»*

Genau der Fall, den die Brücke zuvor als offenen Freiheitsgrad gemeldet hat —
jetzt ist er konstruktiv gelöst statt nur angezeigt. Hängt ein Teil an einer
Reihe in einer Ebene, hält sein Link zusätzlich `K_YY`; bei vier Punkten
bleibt es bei den drei Kräften. Der Bericht führt die Stellen auf: es ist die
einzige, an der ein Link mehr als Kräfte überträgt.

#### Ein Alttyp zum Gegenlesen

Neben dem J90 über 24 m ist dasselbe mit **J100-alt über 20 m** gebaut. Die
Altbauweise schlägt an zwei Stellen durch, beide ohne Zutun:

| | J90 (neu) | J100-alt |
|---|---|---|
| Auflagermodell | `gurte`, 8 Knoten | **`mitte`, 4 Knoten** |
| Endbedingung | Einspannung ins Mast | **gelenkig** |
| Stäbe / Starrelemente | 544 / 578 | 472 / 482 |

Beim Aufbau des Prüfjochs ist mir dabei ein eigener Fehler unterlaufen: das
Testskript setzte `endbedingung` **nach** `typUebernehmen()` und überschrieb
damit die Vorgabe. Beim Alttyp ist `gelenkig` keine Voreinstellung, sondern
eine stehende Vorgabe — sie darf nicht von aussen überschrieben werden.

#### `ausleiten.mjs` liess die Bauteil-Datenbank fallen

Beim Bau des Prüfjochs kam es heraus: das Skript lud `data.fl_bauteile.js`
und rief `setzeFlBauteilDB` — beides gibt es nicht. Das Modul heisst
`data.fl.js`, die Funktion `setzeFlDB`. Ein `try/catch` schluckte den Fehler,
und die Bauteil-Datenbank kam **nie** an.

Folge: jedes Anbauteil, das seine Lasten aus dieser Datenbank zieht, wog
**null**. Das Prüfjoch kam zuerst mit *0 Punktlasten* heraus, nach der
Korrektur mit 18.

Am Signaljoch fiel es nie auf, weil dessen Signale ihre Lasten unmittelbar
mitbringen (`vorlage: 'direkt'`); seine Ausleitung ist vor und nach der
Korrektur dieselbe. Geladen wird jetzt **ohne Netz** — fehlt die Datei, soll
es scheitern statt still falsch zu rechnen.

**Regel:** ein `try/catch` um das Laden von Grundlagen verbirgt genau den
Fehler, der am teuersten ist.

#### Der Lauf am Signaljoch

```
464 Stäbe · 482 Starrelemente (119 Körper) · 12 Linkelemente
958 Referenzen in 5 Richtungen · 8 Auflager · 4 Lastfälle
9 Punkt- und 348 Streckenlasten   ->  AxisVM_Signaljoch_COM.axs
```

Angelegt und zurückgelesen stimmen überein: 12 Links angelegt, 12 im Modell;
482 Starrelemente, **0 ohne Körper**.

#### Node fehlte auf dem Rechner

`pruefung.mjs` und `ausleiten.mjs` liefen nicht. Node 24.19.0 ist über
`winget --scope user` installiert — **ohne Administratorrechte**.

Dabei kam ein Portabilitätsfehler ans Licht: `pruefung.mjs` gab `import()`
einen **Windows-Pfad**, und ein solcher ist kein gültiges URL-Schema
(`ERR_UNSUPPORTED_ESM_URL_SCHEME`). Unter macOS ging der blosse Pfad zufällig
durch. Jetzt `new URL(...).href` wie in `ausleiten.mjs` und
`vergleich_werkzeug.mjs`.


### AxisVM über COM — die Brücke steht (21./22. August)

Der SAF-Weg ist verlassen. Gebaut wird jetzt **unmittelbar über COM**:
`com/AxisVM_aufbauen.ps1` liest die JSON-Ausleitung und baut daraus das ganze
Modell. Gemessen am 22.08. um 22:04 auf dem Arbeitsrechner:

```
827 Knoten · 942 Stäbe · 14 Querschnitte · 8 Auflager
4 Lastfälle · 377 Lasten · 6 Freigaben  ->  .axs gespeichert
```

Danach `SaveToFile` — **gerechnet wird nicht**. Lastkombinationen und
Berechnung bleiben die Entscheidung des Auftraggebers im Programm.

#### Die Schnittstelle wird vermessen, nicht geraten

Das ist die Lehre des ersten Abends. Die COM-Referenz von AxisVM ist ein PDF
über 10 MB, die Namen verschieben sich zwischen den Fassungen, und ein blind
geschriebenes Skript scheitert erst mitten im Modellaufbau — nach einer halben
Stunde Bauzeit. Deshalb drei Vorkehrungen:

* **Die Typbibliothek wird zur Laufzeit gelesen.** `LoadTypeLibEx` aus der
  laufenden Programmdatei, dann `TypeLibConverter.ConvertTypeLibToAssembly` —
  1643 Typen, ohne SDK und ohne `tlbimp`. Erst dadurch kennt das Skript die
  **Parameternamen**: `Get-Member` zeigt an einem COM-Objekt nur die Typen,
  also vierzehn namenlose Zahlen.
* **`Versuche`** probiert mehrere Schreibweisen durch und schreibt in den
  Bericht, welche getragen hat. Am Schluss steht die Liste aller gefundenen
  Schreibweisen — das ist die Vermessung, die beim nächsten Mal gilt.
* **`AxisVM_pruefen.cmd`** baut nichts, sondern listet nur Signaturen. Zwei
  Minuten, und die offene Frage ist beantwortet, ohne ein Modell anzufassen.

Was die Fassung 18 r1m tatsächlich trägt, steht in `com/LIESMICH.md`. Das
Wichtigste:

| | |
|---|---|
| Material | `AddFromCatalog(ndcEuroCode, 'S 235')` — **mit Leerzeichen** |
| Querschnitt | `AddL(Name, a, b, tw, tf, r1, r2, cspRolled)`, Masse in **Metern** |
| Stab | `Lines.Add(i, j, lgtStraightLine, RLineGeomData)` + `DefineAsBeam` |
| Auflager | `AddNodalGlobal(RStiffnesses, RNonLinearity, RResistances, Knoten)` |
| Gelenk | `SetStartReleases(RReleases)` — **verschachtelt**, jedes Feld ein `RRelease` mit `.ReleaseType` |
| Referenz | `References.Add(RReference Item)` — genau eine Methode, Verbund-Typ |

#### AxisVM meldet Fehler als negative Zahl, nicht als Ausnahme

Beim ersten Aufbau lief alles durch — und lieferte `S235 als Nummer -102`. Das
ist `EGeneralError.errNotFound`, und es wanderte als Materialnummer in alle 746
Stäbe. Die COM-Referenz sagt *„if successful the result is > 0"*.

Seither prüft der Schalter `-Positiv` jeden Add-Schritt, und `FehlerName`
durchsucht alle Aufzählungen der Typbibliothek nach dem negativen Wert. Der
Bericht sagt dann nicht „Fehler", sondern `-102 = EGeneralError.errNotFound`.

**Regel:** bei COM nie den Rückgabewert übergehen. Was aussieht wie eine
Nummer, kann ein Fehlercode sein.

#### Die Geometrie nach Ihrer Durchsicht am halbfertigen Modell

Vier Beobachtungen, vier Korrekturen:

1. **Die Blechachsen liegen versetzt.** Nach dem Detailschnitt der
   Werkstattzeichnung stehen die
   **stehenden** Bleche in der Flucht der Schenkel der L-Profile, die
   **liegenden** zusätzlich 10 mm nach innen, damit sie sich schweissen lassen.
   Gebaut in `schenkelVersatz` (`js/export.axisvm.js`); die Vorzeichen kommen
   aus `AUSRICHTUNGEN` in `geometry.js` und nicht aus einer Annahme — meine
   erste Fassung hatte y verkehrt herum, was Ihnen an der Skizze aufgefallen
   ist, bevor es ins Modell ging.
2. **Die Auflager am Jochende.** Die Aussteifung über Kreuz verfälscht die
   Reaktionen, wenn in einem Punkt gelagert wird. Gebaut sind jetzt **drei**
   Modelle, wählbar im Ausleitungsdialog, Vorgabe nach Bauweise:
   `gurte` (Untergurte x/y/z, Obergurte x/y — kein Kräftepaar, für die neuen
   Joche), `mitte` (Gurtebene vorn und hinten, Gelenk um y — Altbauweise) und
   `punkt` (ein Punkt je Ende mit Drehfeder, für den Abgleich mit dem
   Ersatzbalken).
3. **Die Hängestütze war doppelt geführt.** Jetzt ein durchgehender Stab, der
   Anschluss rechtwinklig zu den Gurtachsen, der Übergang gelenkig.
4. **Die Starrelemente enden zu früh.** Sie laufen jetzt bis an die Blechkanten.

#### Der Anschluss der Hängestütze im Einzelnen

Das ist die Stelle, an der das System zweimal zum Mechanismus geworden ist —
beide Male von Ihnen am Modell gesehen, nicht von mir gerechnet.

* **Zwei Punkte** (nur Ober- oder nur Untergurt): Variante A, biegesteif um y.
* **Vier Punkte** (oben und unten je zwei Reihen längs der Jochachse): die
  **erste Reihe x/y/z**, die **zweite y/z**. Die zweite Reihe ist längs frei,
  sonst zwängt der Anschluss im Gurt.

Die Freigabe sitzt deshalb im **Ast des Anschlusskörpers** und nicht im
Querstummel: der Ast liegt in der Jochachse, dort ist „lokal x" eindeutig. Im
Querstummel wäre dieselbe Freigabe eine andere Richtung — und ein Gelenk um
alle drei Momente an einem einzelnen Knoten macht aus der Stütze ein Pendel.

#### Zu enge Schnitte werden zusammengelegt

Sie haben zwei Linien dicht nebeneinander gesehen. Ursache: die beiden Reihen
eines Anbauteils liegen 20 mm auseinander, und dazwischen entstand ein
Gurtstück von 10 mm mit dem Ersatzquerschnitt. So etwas verdirbt die Kondition
der Steifigkeitsmatrix, ohne dass die Rechnung abbricht.

`schnitteZusammenlegen` trennt jetzt **feste** Schnitte (Enden, Stationen,
Blechkanten — die sind Geometrie und dürfen nicht wandern) von **beweglichen**
(Anbauteilpositionen). Bewegliche Schnitte näher als 25 mm rasten auf ihren
Nachbarn ein:

```
x  6.290 ->  6.300  +10.0 mm      x  6.310 ->  6.300  -10.0 mm
x 11.390 -> 11.400  +10.0 mm      x 11.410 -> 11.400  -10.0 mm
x 15.490 -> 15.500  +10.0 mm      x 15.510 -> 15.500  -10.0 mm
```

Rasten beide Reihen auf denselben Punkt, wird aus dem Anschluss **eine** starre
Verbindung nach Variante A — ohne zweiten Ast und ohne Längsfreigabe. Das
kürzeste Gurtstück misst jetzt 30 statt 10 mm, das Modell 942 statt 990 Stäbe.
Die Verschiebungen stehen in `tragwerk.verschoben` und werden im Bericht
aufgeführt; sie bleiben nachvollziehbar.

**Das ist keine Anpassung der Blecheinteilung** — verschoben werden nur
Anbauteilpositionen, und zwar um 10 mm. Die Jochgeometrie bleibt unangetastet.

#### Offen: die lokalen Stabachsen

Der **einzige** noch nicht getragene Schritt. Ohne Referenz legt AxisVM die
lokale z-Achse in die Vertikalebene. Für die Gurte trifft das unsere Vorgabe
`[0,0,1]`; für die Bindebleche nicht — deren Rechteck muss mit der Breite in
der Jochachse liegen, also `z` nach `[1,0,0]`. Stünde ein 160 × 10 mm Blech
hochkant, läge seine Biegesteifigkeit um (160/10)² ≈ **256-fach** daneben, und
das Modell rechnete klaglos Unsinn.

Der Lauf vom 22.08. hat die Antwort geliefert: `References` trägt genau **eine**
Add-Methode, und die nimmt einen Verbund-Typ. Meine erste Fassung suchte nur
Methoden mit einfachen Parametern und fand deshalb keine — 0 von 942 Stäben
bekamen eine Achse. Der Bericht sagte das als Warnung, statt still weiterzubauen.

Seither wird der Aufbau von `RReference` **gelesen**: `SatzAufbau` klappt den
Typ mitsamt Untersätzen und Aufzählungsnamen im Bericht aus, `SatzSetzen`
schreibt über Reflexion hinein. Letzteres ist nötig, weil `$r.Point1.x = 1` bei
einem Wertetyp ins Leere läuft — PowerShell holt sich eine Kopie.

Geprüft ist, dass **kein** Stab parallel zu seiner Referenz steht: das kleinste
Kreuzprodukt über alle 942 liegt bei 1,0. Nach dem Zuweisen liest das Skript an
vier Stäben zurück, was wirklich drinsteht — eine COM-Eigenschaft kann eine
Zuweisung klaglos schlucken und doch bei 0 bleiben.

**Der nächste Lauf entscheidet das.** Er ist vorbereitet; das Modell-JSON ist
unverändert, nur die `.ps1` ist neu.

#### Wo ich mich geirrt habe

Der Vollständigkeit halber, weil es dasselbe Muster ist:

| Irrtum | Wahrheit |
|---|---|
| `IsBeam` prüft den Elementtyp | Es prüft die **Lage**; ein senkrechtes Blech ist eine Stütze. Richtig ist `LineType == ltBeam` |
| Das freie Gelenk heisst `rtFree` | Es heisst **`rtHinged`** — `rtFree` gibt es nicht |
| `RReleases` ist eine flache Aufzählung | Es ist **verschachtelt**: jedes Feld ein `RRelease` mit `.ReleaseType` |
| Die Blechlänge lässt sich herleiten | Sie steht im **Sortiment** (`blechAnStation`, J90: 320 mm). Sie selbst herzuleiten war ein Verstoss gegen die stehende Vorgabe |

Jedes Mal hat der Bericht den Irrtum **gezeigt**, statt still etwas Falsches zu
bauen. Das ist der Grund, warum jeder Durchlauf etwas gebracht hat — und der
Grund, den Aufwand für die Selbstauskunft weiter zu treiben statt Fehler
abzufangen.

#### Nebenher entstanden

* **`ausleiten.mjs`** (Ablagewurzel) — schreibt das COM-JSON ohne Browser:
  `node ausleiten.mjs <ablage.json> <ziel.json> [auflagermodell]`. Damit lässt
  sich die Ausleitung aus einem Skript heraus erneuern.
* **`vergleich_werkzeug.mjs`** — der Abgleich gegen ein FEM-Modell ist jetzt
  ein Werkzeug und kein Wegwerfskript.
* Der Prüfstand ist von 881 auf **934 Kontrollen** gewachsen.

---

## Sitzung vom 20. August

### PyNite-Messung der Gurtendmomente — die I-Aufteilung war zu scharf

Die Signaljoch-Geometrie durch PyNite gerechnet (746 Stäbe) und die
**Gurtendmomente an 26 Stationen je Lastfall direkt abgelesen**, statt sie aus
Spannungen rückzurechnen. Das trennt Momentenaufteilung und
Spannungsermittlung sauber — und beendet das Ratespiel.

**Anteil des Obergurtes an der Biegung der Vertikalebene** (I_OG/I_UG = 2.45):

| | Anteil Obergurt |
|---|---|
| hälftig (bis vorgestern) | 50.0 % |
| **PyNite gemessen** | **55.6 … 60.1 %**, Mittel **57.4 %** |
| nach I/ΣI (was ich eingebaut hatte) | 71.1 % |

**Die reine Steifigkeitsaufteilung ist also viel zu scharf.** Der Rahmen
gleicht aus: Bleche und Knotennachgiebigkeit ziehen die Aufteilung zur Hälfte
zurück. Neue Einstellung `gemessen`:

```
Anteil = 0.5 + k · (I_Gurt/ΣI − 0.5)        k = 0.35
0.5 + 0.35 · 0.211 = 0.574                  gegen 0.574 gemessen
```

> **k ist gefittet, nicht hergeleitet** — ein Modell, ein
> Steifigkeitsverhältnis. Bei anderen Verhältnissen ist es unbelegt.

**Damit erklärt sich auch, warum `einhüllend` so gut aussah.** Der zu scharfe
Anteil (0.711 statt 0.574, Faktor 1.24) hob den fehlenden Hauptachsenfaktor
(1.30) fast genau auf. Zwei Fehler, die sich aufhoben — der Abgleich stimmte
aus dem falschen Grund.

Am Signaljoch, mittlere Abweichung über vier Lastfälle und beide Gurte:

| Aufteilung / Spannungsmodell | Obergurt | Untergurt | mittlere \|Δ\| |
|---|---|---|---|
| gleich / schenkel (Stand vorgestern) | −30 … 19 % | 12 … 16 % | 19 % |
| einhüllend / schenkel (**Vorgabe**) | −4 … 31 % | 12 … 16 % | 12 % |
| **gemessen / schenkel** | −21 … 23 % | **−2 … 8 %** | **11 %** |
| gleich / punkte | −12 … 25 % | 19 … 46 % | 25 % |
| gemessen / punkte | −0 … 28 % | 17 … 27 % | 15 % |
| steifigkeit / punkte | 20 … 32 % | −12 … 13 % | 17 % |

**Vorgabe bleibt `einhüllend`.** `gemessen` ist der besser belegte Wert und
trifft den Untergurt auf −2 … +8 % — aber er **senkt** ihn, und der Untergurt
regiert η_gesamt bei jedem Katalogtyp:

| Typ | η einhüllend → gemessen | |
|---|---|---|
| J60 / J80 / J90 (gleiche Gurte) | unverändert | 0.0 % |
| J100 | 0.625 → 0.579 | −7.3 % |
| J120 | 0.461 → 0.447 | −3.0 % |
| J130 | 0.606 → 0.555 | −8.5 % |
| J100-alt | 0.731 → 0.680 | −6.9 % |
| J130-alt | 0.678 → 0.583 | **−14.1 %** |

Bemessungswerte um bis zu 14 % zu senken ist eine Entscheidung des
Auftraggebers, nicht meine — **das ist abzustimmen.**

Prüfstand: Abschnitt 24 um vier Kontrollen erweitert.

### Hauptachsen des Winkels — gebaut, aber NICHT Vorgabe

Neu `js/core.winkel.js`: Spannung durch schiefe Biegung, ausgewertet an den
sechs Eckpunkten des Winkels. Option `spannungsmodell` (`schenkel` /
`punkte`), **Vorgabe bleibt `schenkel`**.

**Die Querschnittswerte stimmen.** I_yz steht in keiner Profiltabelle dieses
Werkzeugs, folgt aber aus I₂ = i_min²·A und der Invarianz der Spur. Gegen die
AxisVM-Werte derselben Profile:

| | A | I_y | **I_yz** | I₁ | I₂ |
|---|---|---|---|---|---|
| L 100x100x10 | 0.23 % | 0.44 % | **0.75 %** | 0.55 % | 0.01 % |
| L 80x80x8 | 0.26 % | −0.29 % | **−0.62 %** | −0.41 % | 0.18 % |

Das wirksame Widerstandsmoment bei schenkelparalleler Biegung liegt damit um
**Faktor 1.30** unter dem tabellierten (nicht 1.39 — meine frühere Schätzung
aus W₁/W₂ war eine obere Schranke, weil sie unterstellt, dass beide
Hauptachsenanteile am selben Punkt ihr Maximum haben).

**Und jetzt der unbequeme Teil.** Der Faktor ist echt, aber er allein macht den
Abgleich mit dem Stabmodell **schlechter**:

| Gurtaufteilung / Spannungsmodell | Obergurt | Untergurt | mittlere \|Δ\| |
|---|---|---|---|
| gleich / schenkel (Stand vorher) | −30 … 19 % | 12 … 16 % | 19 % |
| **einhüllend / schenkel (heute)** | **−4 … 31 %** | **12 … 16 %** | **12 %** |
| gleich / punkte | −12 … 25 % | 19 … 46 % | 25 % |
| steifigkeit / punkte | 20 … 32 % | −12 … 13 % | 17 % |
| einhüllend / punkte | 20 … 32 % | 19 … 46 % | 30 % |

Der Grund: **das örtliche Gurtmoment des Ersatzbalkens ist seinerseits zu
gross**, und die beiden Fehler heben sich in der bisherigen Form teilweise
auf. Wer nur einen davon behebt, verschlechtert die Summe. Die frühere Aussage
im Vergleichsbericht — «Hauptachsen sind ein systematischer Fehler von 39 %,
dessen Behebung hilft» — war in der Schlussfolgerung falsch: der Fehler ist
da, aber er ist nicht der einzige, und er zeigt in die andere Richtung als der
zweite.

**Was daraus folgt.** `punkte` wird erst dann zur Vorgabe, wenn das
Momentenmodell nachgeführt ist. Der nächste ehrliche Schritt ist **nicht** eine
weitere Näherung, sondern eine Messung: die Signaljoch-Geometrie durch PyNite
laufen lassen und die **Gurtendmomente je Station direkt ablesen**, statt sie
aus Spannungen rückzurechnen. Erst das trennt Momentenaufteilung und
Spannungsermittlung sauber.

Prüfstand: Abschnitt 25, 25 Kontrollen.

### Nach dem AxisVM-Vergleich: drei Korrekturen

Grundlage ist `Vergleich_AxisVM_Signaljoch.md` (nicht in der Ablage — nennt
Bauteilmasse aus dem Projekt). Umgesetzt sind die drei Punkte mit dem besten
Verhältnis von Wirkung zu Aufwand.

**1 · Einbaulage des stehenden Schenkels wirkt jetzt auf den Hebelarm.**
`hebelarme()` rechnete b immer als `(jbb − 2·ja) + 2·zs` — das gilt für nach
INNEN zeigende Schenkel. Zeigen sie nach aussen, ist `b = jbb − 2·zs`. Beim
Signaljoch sind das **363 gegen 456 mm**, ein Fünftel Hebelarm. `ausrOG`/
`ausrUG` gab es längst in der Eingabe, sie griffen nur nicht in die Rechnung.

Dazu **stehen h und b jetzt in der Maske** (`hebelarmUebersicht` in `ui.js`,
Gruppe Systemgeometrie) mit ihrer Herleitung und einer Schranke: liegt h
ausserhalb `jd − 2·max(zs) … jd`, sagt es das rot und nennt den häufigsten
Grund — jd als Aussenmass über die Anschlussbleche statt Winkelrücken zu
Winkelrücken. Genau dieser Fehler hat mir beim ersten Nachbau 20–50 %
eingebrockt, ohne dass irgendetwas verdächtig ausgesehen hätte.

**2 · Querkraft auf die Gurte einer Vertikalebene nach Steifigkeit.**
Neue Option `gurtaufteilung` (`core.querschnitt.js`, `GURTAUFTEILUNGEN`):

| | |
|---|---|
| `huellend` (**Vorgabe**) | je Gurt der ungünstigere der beiden Anteile |
| `steifigkeit` | I_Gurt / ΣI |
| `gleich` | hälftig, das bisherige Verhalten |

In einer Vertikalebene stehen Ober- und Untergurt nebeneinander, bei den
meisten Typen mit **verschiedenen Profilen**. Hälftig gerechnet wird der
steifere um rund 30 % unterschätzt. Wirkung am Signaljoch:

| Lastfall | Obergurt vorher | jetzt |
|---|---|---|
| self weight | −29.9 % | **−4.5 %** |
| added weight | −22.9 % | **−1.6 %** |
| snow | −28.5 % | **−2.6 %** |

Die reine I-Aufteilung träfe den Obergurt noch besser, macht aber den
Untergurt bis 25 % zu klein — deshalb einhüllend als Vorgabe: **nie schlechter
als bisher.** Katalogweit nachgefahren: bei gleichen Gurten (J60–J90) ändert
sich **nichts**, bei ungleichen steigt η des Obergurts um 6–24 %, das Blech
bis 45 % (Altbauweise), und **η_gesamt bleibt in jedem Fall gleich** — es
regierte immer der Untergurt. Die Blechquerkraft ist unberührt: die Anteile
ergänzen sich zu eins.

**3 · Zwei verschiedene Maste.** `mastZwei` mit `mastProfilB`, `mastHB`,
`mastStegB`; `drehfedern()` liefert cA und cB getrennt. Die beiden Enden eines
Jochs stehen selten auf demselben Mast — im Vergleichsmodell HEB 260 (9.0 m)
gegen HEM 240 (13.0 m), rund 10 % Unterschied auf die Vertikallastfälle.

Prüfstand: Abschnitt 24, **23 neue Kontrollen** (Hebelarm gegen das Stabmodell
auf 1 ‰, Anteile ergänzen sich, einhüllend nie günstiger, Blechquerkraft
unverändert, zweiter Mast wirkungslos ohne Schalter).


### Installierbar und ohne Netz (PWA)

Neu: `manifest.webmanifest`, `sw.js`, `js/pwa.js`, `icons/` (aus
`make_icons.py`). Die Modulversion lässt sich auf dem Gerät **installieren**
und startet danach **ohne Verbindung**. Abgelegt wird die ganze Schale —
`index.html`, Stylesheet, alle Module, die vier `data/*.json`, die Symbole.

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

### COM-Brücke zu AxisVM — halb gebaut (überholt)

> Die Notiz unten hält den Stand vom 20. August fest. Was daraus geworden
> ist, steht oben unter *„AxisVM über COM — die Brücke steht"*. Insbesondere
> gibt es `AxisVM_pruefen.ps1` nicht mehr: das Vermessen steckt in
> `AxisVM_aufbauen.ps1 -NurPruefen`, und `AxisVM_pruefen.cmd` ruft nur noch
> dorthin. Dass die alte `.cmd` auf ein gelöschtes Skript zeigte, war der
> Grund, weshalb sich das Fenster sofort wieder schloss.

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

### Vorzeichenrichtige Überlagerung je Blechebene — gebaut

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

Dazu die Regeln aus der Durchsicht des Modells (22. August), im Wortlaut:

> **Die stehenden Bleche sind in der Flucht der Schenkel der L-Profile. Die
> liegenden sind theoretisch noch 10 mm nach innen versetzt, um sie besser
> schweissen zu können.** (Detailschnitt der Werkstattzeichnung; die Nummer
> steht im Projektmaterial, das ausserhalb der Ablage liegt)

> **Bei Hängestützen, die nur an zwei Punkten gehalten werden** am Unter- oder
> Obergurt, **nach Variante A ausbilden** (biegesteif um y).

> **Bei vier Punkten** im Ober- und Untergurt ist **die erste Reihe x y z und
> die zweite y z gehalten. So entsteht keine Zwängung innerhalb des Gurts.**
> Das gilt für Untergurt und Obergurt gleichermassen.

> **Die Starrelemente sind bis zum Anfang / Ende der Bleche zu führen.**

Zur Norm: **Eurocode für Material und Querschnitte ist gesetzt** — diese Norm
wird in der Schweiz ohnehin in ein bis zwei Jahren übernommen.

Der Auftraggeber ist zugleich derjenige, der die Prüfregeln nach dem Stand der
Technik festlegt.

---

## Bereit für Push und Versand

**Ablage** — die Ablage liegt seit dem 24. August auf GitHub, **öffentlich**,
auf Weisung des Auftraggebers. Vorher lag dort eine hochgeladene, gebündelte
Fassung (`index.html` als umbenanntes `vierendeel_tool_ohne_daten.html`, dazu
das Handbuch) mit eigener, unverwandter Geschichte; sie ist beim Push
überschrieben worden — ebenfalls auf Weisung. Der alte Stand liegt örtlich im
Zweig `github-stand-vor-push`, beide Dateien sind aus der Anwendung
reproduzierbar.

Ausgeliefert wird damit jetzt die **Modulversion**: `index.html` lädt `js/`
und `css/` nach. `data/` bleibt draussen, die Anwendung fragt also beim Start
nach dem Datenpaket — der Weg ist durchgespielt (siehe unten).

58 Dateien, geprüft auf Betreiberbezüge: **keine**. Draussen bleiben über
`.gitignore`:

| | |
|---|---|
| `data/*.json` | die vier Datenbanken — sie machen die Ablage sonst nicht-öffentlich |
| `Grundlagen/`, `*.axs`, `*.axe`, `*.pdf`, `*.docx`, `*.xlsx` | Projektunterlagen |
| `vierendeel_tool*.html` | Erzeugnisse von build_html.py; die vollständige trägt die Zahlen eingebettet |
| `generate_vierendeel_L_SZS_C5.py` und die zwei Excel-Prüfer | nennen Betreiber und Zeichnungsnummern im Klartext, ausserdem nicht mehr synchron |
| `Versand/`, `.claude/settings.local.json` | Erzeugnisse und örtliche Einstellungen |

**Entschieden: die Ablage wird ÖFFENTLICH.** Die Datenbanken bleiben draussen
und werden von Hand örtlich eingespielt. Der Weg ist durchgespielt worden —
`data/` beiseite geschoben, Seite neu geladen:

1. Die Anwendung meldet «Diese Ausgabe enthält keine Daten» und verlangt ein
   Paket.
2. `Tragjoch_Datenpaket_2026-08-20.json` gewählt → 14 Typen, 14 Vorlagen,
   60 Bauteile.
3. Nach dem Neuladen ist alles da; das Paket liegt im Browser und bleibt.

Dazu zwei Anpassungen, die dieser Weg nötig gemacht hat:

* `build_html.py` bricht bei fehlenden Datenbanken nicht mehr ab, sondern baut
  von selbst die datenfreie Ausgabe.
* **Die Ablageliste des Dienstarbeiters führt `data/` nicht mehr.** Die drei
  Dateien sind keine Voraussetzung für den Start — sie können im Browser
  hinterlegt sein und dann gibt es sie gar nicht. Sie aufzuführen hiesse, bei
  jeder Einrichtung drei Fehlschläge zu erzeugen. Liegen sie doch daneben,
  nimmt der Dienstarbeiter sie beim ersten Gebrauch von selbst auf.

`build_html.py` verträgt jetzt fehlende Datenbanken: es baut dann von selbst
die datenfreie Ausgabe statt abzubrechen. Für GitHub Pages muss die Datei
`index.html` heissen — sie heisst so.

`pruefung.mjs` **braucht** die vier `data/*.json`. In einer öffentlichen Ablage
laufen die Kontrollen erst, wenn das Datenpaket örtlich danebenliegt. Das steht
so im README.

**Versand** — der Ordner ist frisch:

```
Versand/
  index.html                          681 kB  Doppelklick, keine Installation
  Tragjoch_Datenpaket_2026-08-21.json 140 kB  14 Typen, 14 Vorlagen, 60 Bauteile
  Tragjoch_Handbuch.html              108 kB  mit den Abschnitten 5.3 und 7.5
  LIESMICH.txt                                Inbetriebnahme in drei Schritten
  AxisVM_Signaljoch_COM.json          290 kB  das Modell für die COM-Brücke
  Beispiel_Signaljoch_AxisVM.json       6 kB  kleines Joch zum Ausprobieren
  LIESMICH_Beispiel_Signaljoch.md              dazu die Erklärung
```

Die beiden letzten Dateien sind für die COM-Brücke hinzugekommen: das kleine
Joch ist zum Ausprobieren gedacht, bevor der Ernstfall läuft.

Das Handbuch ist neu gesetzt und trägt jetzt beides: die **Überlagerung je
Blechebene** (5.3, mit der Warnung, dass beide Anteile das Vorzeichen tragen
müssen) und die **Fahrleitung als Auflager** (7.5). Auf Betreiberbezüge
geprüft: keine.

---

## Fortsetzung auf einem Windows-Rechner mit AxisVM

Bisher lief die Arbeit auf einem Mac, und jede Erkenntnis über die
COM-Schnittstelle kostete einen Botengang: Skript schreiben, hinüberkopieren,
laufen lassen, Bericht zurückholen. **Ein Befund pro Durchlauf.**

Auf einem Rechner mit AxisVM entfällt das. Der Gewinn liegt fast ganz in den
zwei Phasen, die noch kommen:

| Phase | heute | dort |
|---|---|---|
| **Lokale Stabachsen** abschliessen | ein bis zwei Durchläufe | Minuten |
| **Ergebnisse zurücklesen** — die Ergebnisschnittstelle ist noch **gar nicht** vermessen, das ist derselbe Suchvorgang wie beim Aufbau | mehrere Durchläufe | ein Nachmittag |
| **Kalibrieren** von `GURT_DAEMPFUNG`, `MAST_UNVERSCHIEBLICH`, `ENDFELD_ZUSCHLAG` gegen das neue Modell — ändern, rechnen, vergleichen, von vorn | mühsam | die Schleife läuft örtlich |

Nichts bringt es dagegen für die Ingenieurentscheide — Blecheinteilung,
Auflagermodell, Anschlussregeln. Die kommen aus den Plänen und aus dem Urteil
des Auftraggebers, und daran ändert der Rechner nichts. Ebenso wenig für das
Rechnen selbst: Lastkombinationen und Startknopf bleiben dessen Entscheidung.

### Was der Ordner mitbringt

Der Projektordner wird als **Kopie** übernommen. Damit kommt `.git` mit — die
Geschichte bleibt erhalten — und ebenso das Projektmaterial, das ausserhalb der
Ablage liegt. Die Trennung ist sauber und muss sauber bleiben:

* **58 Dateien** sind verfolgt und für die öffentliche Ablage bestimmt.
* Draussen bleiben über `.gitignore`: `Grundlagen/`, `data/`, `pruefung_axisvm/`,
  `Versand/`, die `.axs`/`.axe`/PDF, die Excel-Dateien,
  `Vergleich_AxisVM_Signaljoch.md`, `com/AxisVM_Signaljoch_COM.json` und
  `com/AxisVM_aufbau_bericht.txt`.

Das gilt auf dem neuen Rechner unverändert weiter. **Die Ablage wird
öffentlich; das Projektmaterial des Betreibers darf nie hinein.**

### Was vorhanden sein muss

| | wofür |
|---|---|
| **Node** | `pruefung.mjs` (1670 Kontrollen), `ausleiten.mjs`, `vergleich_werkzeug.mjs` |
| **Python 3** | `serve.py`, `build_html.py`, `vergleich_axisvm.py` |
| **Git** | die Geschichte fortschreiben |
| PowerShell 5.1 | ist auf jedem Windows, vermessen |
| AxisVM | vermessen an Fassung 18 r1m (X8) |

Ein AxisVM-Platz sollte auch mal zehnmal hintereinander geöffnet werden dürfen —
beim Vermessen einer Schnittstelle ist das der Normalfall.

`pruefung.mjs` **braucht** die vier `data/*.json`. Liegen sie nicht daneben,
laufen die Kontrollen nicht.

### Das Erste, was dort zu tun ist

1. `node pruefung.mjs` — 934 bestanden, 0 gefallen. Zeigt, dass die Kopie
   vollständig ist und die Datenbanken daneben liegen.
2. `python3 build_html.py` — bündelt neu; die eigenständige Datei veraltet
   sonst still.
3. `com\AxisVM_pruefen.cmd` — vermisst die Schnittstelle, ohne ein Modell
   anzufassen. Zeigt zugleich, dass COM auf diesem Rechner erreichbar ist.
4. `com\AxisVM_aufbauen.cmd` — baut das Modell. Danach im Bericht den Abschnitt
   **6b** lesen: dort steht, ob die lokalen Achsen sitzen.

### Was eine neue Sitzung wissen muss

Der Gesprächsverlauf zieht nicht mit um. Was zählt, steht deshalb im Projekt:

* **dieses Blatt** — Stand, Entscheide und ihre Begründung,
* **`com/LIESMICH.md`** — die vermessene Schnittstelle im Einzelnen,
* **`README.md`** — die fachliche Beschreibung,
* das **Handbuch in der Anwendung** — die Herleitung des Rechenwegs,
* und die Kommentare im Quelltext, die absichtlich das *Warum* tragen und nicht
  das *Was*.

---

## Offene Punkte

| Punkt | Stand |
|---|---|
| **Sammelaktionen** in der Anbauteil-Übersicht („alle Teile dieser Vorlage bearbeiten", z. B. bei allen Hängestützen auf einmal den Winkel setzen) | aus dem angenommenen Vorschlag noch nicht gebaut |
| **Angepasstes Joch als eigenen Typ speichern** | offen |
| **Excel-Generator** (`generate_vierendeel_L_SZS_C5.py`, `js/export.xlsx.js`) | nicht mit dem aktuellen Kern synchron |
| **AxisVM über COM** | Modell wird vollständig aufgebaut und gespeichert. Offen: die lokalen Stabachsen (Abschnitt 6b), nächster Lauf vorbereitet |
| **Ergebnisse zurücklesen** | **gebaut** (`-Auslesen`, ab Zeile 767). Am 3. September vermessen und der Rechenweg durchgestochen: `Calculation.LinearAnalysis(cuiNoUserInteractionWithAutoCorrectNoShow)` läuft, 25 Ergebnisfälle. Offen: ein sauberer Durchstich des Auslesens — siehe *AxisVM rechnet über COM*|
| **Prüffähiger Nachweisbericht** | pendent. Excel, Druckansicht und Handbuch decken es nicht — siehe *Pendent: der prüffähige Nachweisbericht* |
| **Havariefall** | Bruch einzelner Leiter oder ganzer Kettenwerke: aussergewöhnliche Einwirkung, ständige Lasten **charakteristisch**, Leiterzug bei **−20 °C** (Basiskraft). Die Klammer «Kettenwerk» am Drahtwerk ist seit dem 28. August da; die Lastfälle und die Basiskraft fehlen |
| **Spannweitenkategorien** | Tabelle Radius ↔ zulässige Spannweite in Abhängigkeit der EK (zulässiger Windabtrieb des Fahrdrahts). Die Spannweite steht seit dem 28. August als erstes Feld der Trassegruppe; die Tabelle kommt darüber |
| **Einzelmast, Tragausleger, Zuganker** | Die Gruppe «Masten» ist seit dem 28. August angelegt und entkoppelt. Was fehlt: die Tragwerksart (Joch / Einzelmast / Mast mit Tragausleger) als übergreifende Wahl, und Zuganker bzw. Druckstützen als Tragglieder am Masten — sie ändern die Statik des Mastes, sind also keine Anbauteile |
| **Kennwerte nachziehen** | `GURT_DAEMPFUNG` und `ENDFELD_ZUSCHLAG` sind seit dem 29. August **gemessen** (80 PyNite-Laeufe, `kalibrieren.mjs`) — siehe *Die Kalibrierung der beiden gefitteten Kennwerte*. `GURT_DAEMPFUNG` ist am 31. August auf **0,45** nachgezogen (gemessen 0,449). Am 1. September kam ein vierter dazu: `SCHIEFE_DAEMPFUNG` = **0,70** (509 Messstellen, Gegenprobe 0,994) — siehe *SCHIEFE_DAEMPFUNG*. `ENDFELD_ZUSCHLAG` am 31. August auf **0,50** gesetzt (gemessen 0,48, Spanne 0,41–0,64) — er mindert jetzt ab, statt zu erhöhen. `MAST_UNVERSCHIEBLICH` steht seit dem 31. August auf **4,00** (vorher 3,10) — siehe *Die Drehfeder des Mastes*. Damit sind alle drei Kennwerte entschieden |
| **AxisVM-Export über SAF** | gebaut, aber vom COM-Weg überholt. Der SAF-Import ist nie gelaufen |
| **Vorzeichenrichtige Überlagerung je Blechebene** | gebaut als Option, an PyNite kalibriert — Vorgabe bleibt die Hüllkurve |
| **Örtlicher Anteil vorzeichenrichtig** | offen — er wird weiter auf beiden Ebenen addiert |
| **Abfangjoch** | Sortiment seit dem 3. September vollständig in der Maske (17 Typen, gegliedert nach aktuell/alt) — siehe *Das Sortiment der Abfangjoche*. Der **Rechenkern fehlt**: zweigurtiger Träger mit Sprossen, nicht vier Winkelgurte. Die Auswertung sagt es mit dem gewählten Typ im Hinweis |

## Das Sortiment der Abfangjoche (3. September)

**Weisung:** „weiter mit dem aufbau der abfangjoche gehen. die zeichnungen sind
unter den grundlagen, beachte dass es hier auch ein sortiment aktuell und alt
gibt. beim dropdown sollte man das etwas gliedern, das man es besser finden
kann."

`data/abfangjoche.json` führt **17 Typen** aus den Sortimentsblättern:

| Sortiment | Typen | Benennung |
|---|---|---|
| aktuell | A160, A200, A240 (UPE) · A270, A300, A330, A360 (IPE) | A-Nummer = Höhe des Gurtprofils in mm |
| Altbauweise | UAP 130 · 150 · 175 · 200 · 220 · 250 · UAP 300 · IPE 270 · 330 · 360 | nach dem **Profil** |

Je Typ stehen darin: Gurtprofil, Längenbereich, Gewicht je Laufmeter, die
Konstruktionsmasse (Bauhöhe im Feld und am Ende, Sprossenteilung, abweichende
Endprofile) und die Schnee- und Windlasten je Laufmeter nach Klasse.

**Die Altbauweise führt nur eine grösste Länge.** Auf ihren Blättern steht
„jt max." und keine kleinste. Eine erfundene Untergrenze wäre eine Angabe, die
niemand gemacht hat; `abfangLaengenbereich` nimmt deshalb die kleinste Länge,
die das Sortiment überhaupt führt, und schreibt „bis 9.5 m" statt einer Spanne.

**Warum es Paare gibt, die dasselbe Profil führen.** A270 und IPE 270 tragen
beide ein IPE 270 und wiegen 98 gegen 111 kg/m. Auf Nachfrage: „die altbaujoche
sind so beschriftet und die abweichung ergibt sich aus dem zusammenbau."

### Der Typ steht in einem eigenen Feld — nicht in `typ`

Der erste Versuch war eine Liste mit zwei Sortimenten, je nach Tragwerksart.
Das sah aufgeräumt aus und brach sofort: `typ` ist die Angabe, mit der der
**Rechenkern** sein Joch aus der Typendatenbank holt (`getTragjoch`). Ein
«A160» darin warf *Unbekannter Tragjochtyp* — und zwar beim blossen **Ziehen an
einer Mastmarke**, weit weg von der Eingabe, weil `mastGrenzen` den
Längenbereich über denselben Weg sucht.

Jetzt: `abfangTyp` neben `typ`, sichtbar ist immer nur eines. `mastGrenzen`
fragt über `bereichVonTyp` das Sortiment der jeweiligen Art. Der Prüfstand hält
beides fest — dass die Felder einander ausschliessen und dass keine Mastmarke
des Blattes beim Ziehen wirft.

### Es ist ein LIEGENDER Vierendeelträger (Korrektur, 3. September)

Meine erste Lesart der Blätter — „zweigurtiger Träger, der Kern passt darauf
nicht" — war **falsch**. Weisung: „Die Abfangjoche sind liegende
Vierendeelträger." Der Schnitt A-A bestätigt es: zwei Profile **Rücken an
Rücken** (UPE, ab A270 IPE), lichter Abstand `d`, verbunden durch Sprossen im
500er-Raster. Gurte und Pfosten ohne Diagonalen — ein Vierendeel-Rahmen, nur in
**einer** Ebene statt in zweien, und diese Ebene **liegt**.

| | Rahmenebene | Vierendeel-Wirkung trägt | quer dazu |
|---|---|---|---|
| Tragjoch | senkrecht | Gewicht, Schnee | Wind |
| Abfangjoch | **waagrecht** | **Leiterzug**, Wind in Gleisrichtung | Gewicht, Schnee |

Der Rechenweg ist damit **derselbe**: zwei Gurte statt vier, eine Blechebene
statt zweier. Einfacher Balken, Umrechnung auf die einzelnen Gurte, Nachweis
über Bleche und Nachweisschnitt — jeder Träger für sich allein.

### Gerechnet wird er noch nicht, und das sagt die Auswertung

Solange der Kern im Bau ist, steht in den Hinweisen, dass nicht er gerechnet
wird, **mit dem gewählten Typ im Text**:

> Abfangjoch «UAP 250» gewählt — gerechnet wird weiterhin das Tragjoch. […]
> Der gewählte Typ benennt das Bauteil, alle folgenden Zahlen gelten dem Joch.

Der Typ geht in die **Bezeichnung** («A160 · H 7.50 m» in der Leiste statt
«Abfangjoch · H 7.50 m») und in die Ausleitung, nicht in den Nachweis.

**Offen bleibt der Rechenkern** — die Weisung dazu steht in *Der Abfangjoch-
Rechenkern* weiter unten.

### Die Bauteilauswahl: gegliedert, kompakter, mit Direktknopf (3. September)

Vierzehn gleich aussehende Kacheln untereinander sind eine **Liste**, keine
Auswahl — man liest jede, um die eine zu finden. Jetzt vier Gruppen mit je
einem Zeichen im Kopf: *Hängestützen und Ausleger* (5), *Jochaufsätze* (3),
*Leiter und Traversen* (4), *Übrige* (1).

**Was keine Gruppe trägt, verschwindet nicht.** Eine eigene Vorlage aus dem
Editor hat keine, eine neue aus dem Katalog könnte eine unbekannte tragen —
beide landen unter *Übrige*. Lieber an der falschen Stelle sichtbar als
richtig einsortiert und weg.

**Der häufigste Griff steht oben.** „sonst muss man immer erst die liste öffnen
und die kachel frei definiert zu unterst auswählen" — ein Knopf **Bauteil
zuweisen** neben dem Lastgenerator setzt die Vorlage *frei* unmittelbar. Die
Kachel bleibt zusätzlich in der Liste, wer sie dort gewohnt ist, findet sie
weiter.

Kompakter: Polster von 7 auf 5 px, Zeilenabstand enger, Kachelhöhe **50 px** —
die vierzehn passen damit in eine Bildschirmhöhe statt in zwei.

**Der Regelfall steht vorn.** Weisung: „die leiter für die R-FL und N-FL
Kettenwerke und die Rückleiter sind primär interessant, die aldrey kommen ab
und zu vor, den rest als zusatz nehmen." `rang` sagt es je Vorlage — 1
Regelfall, 2 gewöhnlich, 3 Zusatz. Die Leiter-Gruppe steht damit als *N-FL ·
R-FL · Rückleiter · Traverse*. Bei gleichem Rang bleibt die Reihenfolge des
Katalogs; eine zweite Sortierung nach Namen würde eine Ordnung erfinden, die
niemand gewollt hat.

**Aldrey fehlt als Vorlage.** Die Reglagetabelle führt Ald 300 mm² mit 6 kN
(unterschieden nach c ≤ 35 m und c > 35 m); im Bauteilkatalog gibt es dazu
nichts. Es gehört als Vorlage mit Rang 2 dazu, sobald die Kennwerte vorliegen.

### Drei Kleinigkeiten an der Leiste (3. September)

**Der Mastklick schaltet auf sein Tragwerk.** „Dieser Wert wird immernoch nicht
nachgezogen wenn ich einzelne masten anklicke in der schemadarstellung" — gemeint
war *Lage auf dem Querprofil x₀*, das Feld unmittelbar unter der Leiste. Es stand
still, weil `mastAktiv` nur den **Masten** umschaltete. Auf einer Jochreihe stand
danach zweierlei in einer Maske: die Mastfelder galten M1, Lage und Jochtyp
weiterhin dem gerechneten Tragwerk P2. Zwei Bezüge nebeneinander, und dem Bild
sieht man nicht an, welcher gilt — schlimmer als ein Feld, das nicht nachzieht.

Der **geteilte Mast bleibt, wo er ist**: hängt er schon am gerechneten Tragwerk,
wird nicht umgeschaltet. Sonst spränge das Blatt beim Anklicken des
Zwischenmastes aufs Nachbarjoch, ohne dass jemand darum gebeten hat.

**Die Beschriftung überlebt die Nachführung.** Die Marke `[data-tragwerkfeld]`
sass am **äusseren** Feldrahmen, und `leisteNachfuehren` setzt dessen `innerHTML`
neu. Damit fiel bei jedem Mastklick „Tragwerke auf diesem Querprofil" weg und der
Hinweis darunter mit ihr — die Maske sackte um zwei Zeilen zusammen und beim
nächsten vollen Neubau wieder auseinander. Die Marke sitzt jetzt **um den Inhalt**;
`feldHtml` ist dafür ausgeführt, damit der Prüfstand die Reihenfolge festnagelt.

**Zwei zutreffendere Symbole.** Die Ausschnitt-Knöpfe trugen eine **Lupe** und
**vier Ecken nach aussen** — beides sagt „zoom", keines sagt *worauf*. Die Frage
ist aber der Ausschnitt, nicht die Vergrösserung. Jetzt zeigen sie dasselbe
Bauwerk, einmal als Reihe (`querprofilGanz`) und einmal einzeln, von Eckklammern
gefasst (`querprofilEines`).

### Die Ausschnitt-Knöpfe separieren wirklich (3. September)

Gemeldet mit Bild: „hier der screenshot mit den überstehenden lastflächen und
schwerelinien, die nicht sauber ausgeblendet werden."

**Der Verdacht war, die Teile seien nicht je Jochträger zugeschnitten.
Nachgemessen sind sie es** — nur die halbe Blech- und Mastdicke ragt über die
Grenze (±0.12 m), und das muss sie: ein Bauteil auf der Achse steht zur Hälfte
davor. Was fehlte, war das **Ausblenden**: der Knopf *Nur das gerechnete
Tragwerk* fuhr bloss die Kamera heran, der Nachbar stand weiter da — mit seiner
Jochachse und den Flächen seiner Linienlasten, die von der Seite ins Bild
ragten.

Die beiden Knöpfe sind jetzt ein Paar und rufen, was es längst gibt:

| Knopf | Handlung |
|---|---|
| *Ganzes Querprofil* | `alleZeigen()` + Gesamtansicht — nur wenn wirklich etwas beiseitegelegt ist, sonst schriebe jeder Klick einen Verlaufsschritt |
| *Nur das gerechnete Tragwerk* | `nurDiesesZeigen()` + heranfahren |

Eine Prüfstand-Kontrolle hält die gemessene Aussage fest: liefe je eine Linie
oder Lastfläche über ihr Tragwerk hinaus, wäre das Ausblenden wieder
wirkungslos — und man sähe es dort.

**Die Nebenwirkung ist behoben.** Beim Separieren wurden die Masten
umnummeriert — aus M2/M3 wurde M1/M2 —, weil die Id die Laufnummer über die
**sichtbaren** Tragwerke war. Weisung: „namen über ausblenden hinweg stabil
halten, sonst führt es zu missverständnissen." Gezählt wird jetzt über **alle**
Tragwerke des Blattes; was von einem ausgeblendeten kommt, trägt `versteckt`
und wird erst **nach** der Nummernvergabe weggelassen. Ein geteilter Mast
bleibt sichtbar, sobald ihn ein sichtbares Tragwerk trägt, und behält seine
Angaben — die Zuordnung läuft über die Stelle und passiert vor dem Filtern.

## Die Reglagetabelle — Leiterzugkräfte (Fund vom 3. September)

Unter `Grundlagen/Einwirkungen` liegen drei Blätter, die noch nirgends
eingeflossen sind: *zulässige Standardlasten auf Fundamente*,
*Gewichtslasten* und die **Reglagetabelle Leiterzugkräfte**. Die letzte ist
die Grundlage, die dem Abfangjoch und dem Havariefall fehlt.

Sie gibt die Zugkraft **je Regliertemperatur** von −20 bis +40 °C, für
Einzelleiter und für Kettenwerke:

| Bauart | Tragseil `cp` | Fahrdraht `fc` | H_Fd | Systemhöhe `sh` | Ts |
|---|---|---|---|---|---|
| Cat. N | StCu 50 | Cu 107 | 8.5 kN | 2.40 m | 6 kN |
| Cat. N | StCu 50 | Cu 107 | 8.5 kN | 1.90 m | 8 kN |
| Cat. N (Bestand) | StCu 92 | Cu 107 | 8.5 kN | 2.40 / 1.90 m | 6 / 8 kN |
| Cat. NL (Gotthard) | StCu 92 | Cu 150 | 10 kN | — | 10 kN |

Einzelleiter: Cu 95 → 6 kN (Speiseleitung, Feeder, Rückleiter), Cu 150 → 9 kN
normal bzw. 6 kN reduziert, Ald 300 → 6 kN, unterschieden nach c ≤ 35 m und
c > 35 m.

**Damit ist die Aufteilung Tragseil / Fahrdraht vollständig belegt** — sie ist
noch **nicht gebaut**. Heute steht ein Kettenwerk als *ein* Bauteil in der
Datenbank (`Ts: StCu 50 / Fd: Cu 107`), und `istKettenwerk()` erkennt es nur am
Namen. Was die Tabelle liefert und was zum Bauen fehlt:

* der Fahrdraht trägt eine **eigene, konstante** Zugkraft (8.5 bzw. 10 kN)
* das Tragseil eine **temperaturabhängige** aus der Tabelle
* beide hängen um die **Systemhöhe** auseinander — **1.90 oder 2.40 m**, nicht
  die 1.35 m, mit denen der Knicklängen-Fix gerechnet hat

> **Nur die belasteten Zustände zählen.** Weisung vom 3. September: „Die
> unbelasteten zustände der Leiter sind nur für die montage interessant nicht
> für uns hier." Die Spalten *Ts unbelastet* bleiben also aussen vor — sie
> gehören zur Reglage auf der Baustelle, nicht in den Nachweis.

### Die massgebenden Regliertemperaturen — entschieden

Weisung vom 3. September: „für havarie ist −20° und für die bemessung
tragsicherheit die +5° bei schnee leiteinwirkung −5°"

| Fall | T | warum |
|---|---|---|
| **Tragsicherheit** | **+5 °C** | Regelfall der Bemessung |
| **Schnee leitend** | **−5 °C** | Schnee fällt bei Frost — die Schneelast trifft auf einen straffer gezogenen Leiter |
| **Havarie** | **−20 °C** | Bruchfall bei grösster Zugkraft |

Der Leiterzug wächst mit sinkender Temperatur; die grösste Kraft steht bei
−20 °C im Draht. Das ist nicht immer der ungünstigste Fall — deshalb drei
Festlegungen und nicht eine. `REGLIERTEMPERATUREN` in `data.fl.js` führt sie;
`reglierTemperatur(key)` gibt ohne Treffer die Tragsicherheit zurück, weil eine
erfundene Temperatur schlimmer wäre als die häufigste.

## Der Abfangjoch-Rechenkern — die Weisung vom 3. September

> „Die Abfangjoche sind liegende Vierendeelträger. diese sollte auch wenn
> möglich als einfacher balken abgebildet werden und mit der umrechnung auf
> die einzelne gurte. der nachweis erfolgt dann über die vorhandenen bleche
> und den nachweisschnitt wie beim tragjoch. das heisst jeder träger wird für
> sich alleine nachgewiesen."

### Was entschieden ist

| Frage | Entscheid |
|---|---|
| **Hebelarm** der Vierendeel-Wirkung | **k**, das Aussenmass im Feld (`d + 2b`). Die Gurte stehen nebeneinander, die Rahmenebene **liegt**. |
| **Leiterzug** greift an | **in der Trägermittelebene** — keine planmässige Torsion, beide Gurte gleich beansprucht |
| **Eigengewicht / Schnee** | **jeder Gurt für sich, halbe Last**, über seine starke Achse. Kein Rahmen quer zur Ebene. |
| **Auflager** | Drehachse global um **y und z frei**, um x gehalten — einfacher Balken, Torsion um die Trägerachse gehalten |
| **Kopplung** von Hängestützen an zwei Abfangjochen | **weggelassen**, bis die Vergleichsrechnungen mit PyNite und AxisVM tragen |
| **Sprossen-/Blechmasse** | aus den **Konstruktionszeichnungen** unter `Grundlagen/Abfangjoche` |

### Was die Zeichnungen ergeben haben

Es sind **Bindebleche wie beim Tragjoch**, nicht „Sprossen" — die Stückliste
nennt sie beim Namen: *Gurt · Verstärkung · Bindeblech L · Bindeblech ·
Bindeblech R*. Je eines oben und unten (Schnitt A-A), Regelteilung **500**.
Kein anderes Bauprinzip, nur **eine** Blechebene statt zweier.

**Die Gabel am Jochende** (Weisung: „beachte noch die verstärkung zu den
jochenden") ist ein aufgesetztes Gurtstück **gleichen Profils** — bei A160 ein
UPE 160 × 660, zweimal. Es **verdoppelt den Gurtquerschnitt im
Anschlussbereich**, und genau dort liegt der Nachweisschnitt am Auflager. Wer
sie weglässt, weist den schwächsten Querschnitt an der Stelle nach, an der der
stärkste steht.

**h und k sind zwei verschiedene Masse.** `k` ist das Aussenmass im **Feld**,
`h` das am **Jochende** (Spreizung + 2b). Bei A160 sind beide 420, weil der
Träger gerade durchläuft; ab A200 ist er **gekropft** (Spreizung 280/400), und
dort sind sie verschieden. Sie zu verwechseln hiesse, mit dem falschen
Hebelarm zu rechnen — der Prüfstand hält beide Beziehungen fest.

### Stand der Datenerfassung — das aktuelle Sortiment ist vollständig

| Typ | Gurt | k [mm] | Längen | Endverstärkung | QV-Bereiche |
|---|---|---|---|---|---|
| A160 | UPE 160 | 420 | 15 (5.5–12.5 m) | Gabel UPE 160 × 660 | 1 |
| A200 | UPE 200 | 560 | 23 (6.0–17.0 m) | Gabel UPE 200 × 600 | 1 |
| A240 | UPE 240 | 780 | 24 (8.0–19.5 m) | Gabel UPE 240 × 615 | 1–5 |
| A270 | IPE 270 | 870 | 26 (10.0–22.5 m) | Deckblech 260/10 | 1–6 |
| A300 | IPE 300 | 900 | 24 (13.0–24.5 m) | Deckblech 290/10 | 1–6 |
| A330 | IPE 330 | 920 | 23 (15.5–26.5 m) | Deckblech 320/10 | 1–6 |
| A360 | IPE 360 | 940 | 23 (17.5–28.5 m) | Deckblech 350/10 | 1–7 |

**158 Längen**, jede mit erstem Blechfeld A1, Regelteilung 500, den
Vierendeel-Bereichen QV, den Überhöhungsabschnitten S und der Überhöhung Pf
(Soll/max) — aus den Schemablättern gelesen, nicht hergeleitet.

**Ab A270 wechselt die Bauweise am Jochende.** A160 bis A240 setzen ein
Gurtstück gleichen Profils auf — die *Gabel*. Ab A270 tritt an seine Stelle
ein **Deckblech**, und zwar asymmetrisch: 1450 mm am linken, 650 mm am rechten
Jochende. Derselbe Zweck, andere Bauart. `abfangEndverstaerkung` gibt beides
zurück und nennt die Art — wer nur nach `verstaerkung` fragt, findet bei den
vier grossen Typen nichts und weist den unverstärkten Querschnitt an der
Stelle nach, an der der verstärkte steht.

Dazu ab A270: **Verstärkungsrippen** 80/10 (28 Stück) und **Querversteifungen**
aus dem Gurtprofil, die die QV-Bereiche voneinander trennen. Erfasst, aber
noch nicht im Rechenmodell abgebildet.

**Die Altbauweise (10 Typen) führt nichts davon** — für sie liegen keine
Konstruktionszeichnungen vor. Die Auswahlliste schreibt ihr „Masse
unvollständig" an; wer wählt, soll das sehen, statt es an einer ausbleibenden
Zahl zu merken.

**Massgebend sind die Daten, nicht die Herleitung.** `QV1 = jt − 4.0 m`
bestätigt jede erfasste Zeile, und `A1` wechselt zwischen 250 und 500 — beides
steht als **Kontrolle** im Prüfstand, nicht als Rechenweg. `abfangMasse` gibt
für eine Zwischenlänge `null` zurück statt einer erfundenen Einteilung.

### Der Gurtkatalog — und zwei Fehler, die er aufgedeckt hat (3. September)

Der Profilkatalog führte **nur Winkel** — das Tragjoch ist ein Vierendeelträger
aus vier gleichschenkligen Winkeln. Die sieben UPE/IPE-Gurte des Abfangjochs
fehlten vollständig; ohne sie kein Querschnittswert und damit kein Nachweis.
`GURTPROFILE` in `data.profiles.js` führt sie jetzt, mit **Normwerten**
(EN 10365 / DIN 1026-2) — sie gehen in den Nachweis ein und **gehören
gegengelesen**.

Geprüft ist bisher, ob sie zu sich selbst passen: **A × 7.85 gegen das
Laufmetergewicht**, alle sieben auf ±0.2 %. Und die Summe zweier Gurte plus
Bindebleche gegen das Jochgewicht der Sortimentstabelle — A160 kommt auf
41.6 gegen 43 kg/m im Blatt, A200 auf 57.7 gegen 58; der Rest ist
Endverstärkung und Schweissnaht.

**Erster Fehler: `c` ist die Flanschdicke, nicht die Stegdicke.** Ich hatte es
falsch benannt. Gegenprobe an allen sieben gegen die Profilnorm: UPE 160 führt
c = 9.5 — das ist t_f, t_w wäre 5.5. Fast die halbe Dicke.

**Zweiter Fehler, der schwerere: der Hebelarm ist nicht k.** `k` ist das
Aussenmass über beide Gurte; der Hebelarm der Vierendeel-Wirkung ist der
Abstand der **Schwerachsen**.

| | Lage der Achse | Hebelarm | A160 | A270 |
|---|---|---|---|---|
| UPE | um e_y innerhalb des Stegrückens | `k − 2·e_y` | 38.3 statt 42.0 cm | — |
| IPE | in der Profilmitte | `k − b` ( = `d + b`) | — | 73.5 statt 87.0 cm |

**Neun bis fünfzehn Prozent, und sie gehen voll ins Moment.** Mit k gerechnet
läge der Nachweis auf der unsicheren Seite. `gurtAchsabstand` macht den Abzug;
der Prüfstand hält ihn für jeden Typ fest.

### Der Rechenkern — erster Baustein (3. September)

`js/core.abfangjoch.js` steht. Er kapselt, was der Nachweis über Querschnitt
und Lastaufteilung wissen muss; die Nachweise selbst folgen darauf.

| Funktion | was sie liefert |
|---|---|
| `abfangQuerschnitt(typ)` | Hebelarm `e`, Flächen, `I_rahmen` mit Steiner-Anteil, `I_vert` je Gurt |
| `abfangGurtkraefte(M, e)` | **die Umrechnung auf die Gurte**: N = ± M / e |
| `abfangLastQuer(q)` | halbe Last je Gurt, quer zur Rahmenebene |
| `abfangStuetzweite(typ, jt)` | `js` aus der Mass-Tabelle — **nicht** `jt` |
| `abfangBlechstationen(typ, jt)` | Stationen und Blechzahl **aus der Stückliste** |
| `abfangRechenbar(typ, jt)` | ob die Daten für eine Rechnung reichen |

Die Querschnittswerte über das Sortiment:

| Typ | Gurt | k [cm] | **e [cm]** | I_rahmen [cm⁴] |
|---|---|---|---|---|
| A160 | UPE 160 | 42.0 | **38.3** | 16 323 |
| A200 | UPE 200 | 56.0 | **51.8** | 39 203 |
| A240 | UPE 240 | 78.0 | **73.2** | 103 773 |
| A270 | IPE 270 | 87.0 | **73.5** | 124 822 |
| A300 | IPE 300 | 90.0 | **75.0** | 152 521 |
| A330 | IPE 330 | 92.0 | **76.0** | 182 365 |
| A360 | IPE 360 | 94.0 | **77.0** | 217 605 |

Der **Steiner-Anteil ist hier alles**: bei A160 stehen 85 cm⁴ Eigenanteil gegen
16 100 cm⁴ Steiner — das Zweihundertfache. Der Prüfstand hält für jeden Typ
fest, dass er das Zehnfache übersteigt; fällt er darunter, stimmt etwas an der
Geometrie nicht.

#### Ein Fehlversuch, der die stehende Vorgabe bestätigt hat

Die Blecheinteilung leitete ich zuerst **ab** — QV1 = jt − 4.0 m, erstes Feld
A1, dann 500er Raster. Das sah schlüssig aus und lag gegen die Stückliste der
Konstruktionszeichnung **durchweg 4 bis 6 Bleche zu tief** (A160/9.5 m: 22
gegen 26), über alle fünfzehn Längen.

> „Massgebend sind die Daten, nicht die Herleitung. Führt das Sortiment eine
> Länge, gilt sie — auch wenn sie sich rechnerisch bestätigen lässt."

Jetzt kommt die Zahl aus der Stückliste (`laengen[].bleche`), und der Prüfstand
vergleicht **alle fünfzehn** gegen die Zeichnung. Ohne erfasste Stückzahl
liefert `abfangBlechstationen` **null** statt einer geratenen Einteilung — eine
erfundene wäre die Grundlage eines Nachweisschnitts, der nirgends steht. Die
**Lage** der Reihe bleibt vorerst eine Näherung (`randGenau: false`), weil die
Randmasse nur für A160 erfasst sind.

**Erfasst sind die Stückzahlen bisher nur für A160.** Für A200 bis A360 stehen
sie auf den Konstruktionszeichnungen und müssen nachgetragen werden.

### Der Gurtnachweis — und was er ausdrücklich nicht führt

Drei Anteile treffen sich im Gurt, aus zwei Richtungen:

| Anteil | Herkunft | Widerstand |
|---|---|---|
| `N` | Kräftepaar aus dem Moment **in** der Rahmenebene | A des Gurtes |
| `M_vert` | halbe Querlast, **quer** dazu | W_y (starke Achse) |
| `M_örtl` | Gurt zwischen zwei Bindeblechen, aus V in der Rahmenebene | W_z (schwache Achse) |

**Der örtliche Anteil ist ungedämpft angesetzt.** Beim Tragjoch mindert ihn
`GURT_DAEMPFUNG` = 0.45, gemessen an 80 PyNite-Läufen — der Wert gilt für
**vier Winkelgurte mit zwei Blechebenen** und ist auf zwei Walzprofile nicht
übertragbar. Bis er für das Abfangjoch gemessen ist, steht
`ABFANG_GURT_DAEMPFUNG` = 1.0: der volle Anteil, also die sichere Seite.

#### Knicken wird nicht geführt — und das steht im Ergebnis

> Weisung vom 3. September: „die knicklänge hinten anstellen und mit axis
> kalibrieren. die 500mm sind zu unkonservativ da sich der gesamte träger
> biegt in der horizontal und vertikal ebene."

Der Druckgurt trägt dieselbe Kraft wie der Zuggurt, kann aber ausweichen. Der
**Bindeblechabstand als Knicklänge wäre die naheliegende und genau die falsche
Annahme**: der Gurt weicht nicht zwischen zwei Blechen aus, sondern mit dem
ganzen Träger. Die massgebende Länge ist ein Vielfaches und wird **gemessen,
nicht gesetzt**.

`abfangGurtnachweis` gibt deshalb `knickenGefuehrt: false` samt Grund zurück,
und die Auswertung schreibt es beim Abfangjoch als Hinweis an.

**Ein Denkfehler auf dem Weg dahin:** zuerst legte ich dafür eine
Nachweisgruppe *Knicken Abfanggurt* an. Vier Prüfstand-Kontrollen fielen —
zu Recht, denn die Gruppe hätte auch am **Tragjoch** unter den nicht geführten
Nachweisen gestanden, und das hat gar keinen Abfanggurt. Der Hinweis gehört
dorthin, wo die Tragwerksart bekannt ist.

### Was noch aussteht

* der Rechenkern selbst: Balkenmodell, Umrechnung auf die Gurte,
  Nachweisschnitt mit der Gabel am Auflager
* die Lasten: Leiterzug in beiden Gleisrichtungen getrennt anordenbar,
  Jochaufsätze, durchgehende Fahrleitung
* Vergleichsrechnung PyNite / AxisVM, danach erst die Kopplung zweier
  Abfangjoche über gemeinsame Hängestützen

## Das Modell landete nicht neben dem Skript (3. September)

Gemeldet: „Ich finde das vorherige axismodell nicht unter dem com ordner, ich
denke es wurde nicht gespeichert." Der Bericht meldete
`Speichern -> .\AxisVM_J100_….axs` — und der Ordner blieb leer.

**Ursache: ein relativer Pfad.** `$axs = ChangeExtension($Json, '.axs')`
übernahm den Pfad so, wie er hereinkam; bei `.\Joch.json` blieb daraus
`.\Joch.axs`. **AxisVM ist ein eigener Prozess mit eigenem
Arbeitsverzeichnis** und löst `.\` gegen *seines* auf — die Datei landet im
Programmordner, nicht neben dem Skript.

Behoben mit `GetFullPath`. Und, dieselbe Lehre wie bei `LinearAnalysis`:
**die Probe ist die Datei, nicht die Rückgabe.** Nach dem Speichern wird
`Test-Path` gefragt und die Grösse ausgegeben; meldet `SaveToFile` Erfolg und
es liegt nichts da, steht das als laute Warnung im Bericht. Ein Skript, das
sagt, es habe gespeichert, während nichts existiert, ist die schlimmste Art
von Erfolgsmeldung.

## AxisVM rechnet über COM (3. September)

Auf die Frage „kann man über die com schnittstelle nicht noch einen befehl zum
durchrechnen geben?" — **ja, und es war schon gebaut.** Meine Aussage, das
Zurücklesen sei „vermessen, aber nicht gebaut", stammte aus einer veralteten
Notiz in dieser Datei und war falsch: `-Rechnen` steht seit längerem in
`AxisVM_aufbauen.ps1` (Zeile 2244), das Auslesen ab Zeile 767.

**Vermessen, nicht geraten** (die Erkundung liefert es):

```
ELongBoolean LinearAnalysis  (ECalculationUserInteraction)
ELongBoolean LinearAnalysis2 (ECalculationUserInteraction, ELongBoolean, string)

ECalculationUserInteraction
  0  cuiUserInteraction                          Dialog
  1  cuiNoUserInteractionWithAutoCorrect
  2  cuiNoUserInteractionWithoutAutoCorrect
  3  cuiNoUserInteractionWithAutoCorrectNoShow   ← das Skript nimmt diese
  4  cuiNoUserInteractionWithoutAutoCorrectNoShow
```

Durchgestochen am Tragjoch: **25 Ergebnisfälle**, linear statisch.

**Die Rückgabe ist mehrdeutig und darf nicht als Erfolgsprobe dienen.**
`LinearAnalysis` gab **0** zurück, während 25 Ergebnisfälle vorlagen — bei
`ELongBoolean` wäre 0 „falsch". Geprüft wird deshalb an der **Zahl der
Ergebnisfälle**, nicht am Rückgabewert. Die Regel „Fehler kommen als negative
Zahl" trägt hier nicht.

**Zwei Instanzen vertragen sich nicht.** Ein zweiter Skriptstart für das
Auslesen, während die erste Instanz das Modell noch offen hält, führt zu
„Datei öffnen nicht möglich" und hängt AxisVM auf — am 3. September so
passiert. Das Auslesen gehört an die **laufende** Instanz; der Ablauf ist:

1. `AxisVM_aufbauen.cmd -Rechnen` — baut, speichert, rechnet
2. AxisVM **offen lassen**
3. `AxisVM_auslesen.cmd` — holt die Schnittgrössen

Ob Schritt 3 in einem Zug mit Schritt 1 laufen kann, ist noch nicht geprüft;
das wäre der nächste Schritt und spart den Instanzkonflikt ganz.

## Die Kalibrierung der beiden gefitteten Kennwerte (29. August)

`GURT_DAEMPFUNG` 0,42 und `ENDFELD_ZUSCHLAG` 2,0 standen auf **einer**
Messung an **einem** Modell mit **einer** Lastanordnung. Beide sind jetzt
über das Sortiment und über fünf Lastanordnungen vermessen —
`kalibrieren.mjs`, 80 PyNite-Läufe, Ergebnisse in
`kalibrierung_daempfung.txt` und `kalibrierung_endfeld.txt`.

Beide Zahlen sind am 31. August nachgezogen worden — auf **0,45** und
**0,48**. Die Messung stand vorher für sich; die Entscheide fielen getrennt,
weil sie nachweisrelevant sind. Was unten in den beiden Abschnitten steht, ist
die Messung, nicht der Entscheid.

### Warum nur vier Typen gemessen werden

Die Dämpfung wirkt nur, wo Ober- und Untergurt verschieden sind. Das
Sortiment führt genau drei solche Verhältnisse:

| Typ | OG / UG | I_OG/I_UG | Rolle |
|---|---|---|---|
| J60 · J70 · J80 · J90 | gleich | 1,00 | k ohne Wirkung → **Gegenprobe** |
| J120 | L120 / L100 | 2,04 | Fit |
| J100 | L100 / L80 | 2,46 | der alte Messfall |
| J130 | L130 / L120x80 | 4,15 | bis dahin unbelegt |

Ein Fit über Verhältnisse, die im Sortiment nicht vorkommen, wäre Zierde.

### Die Gegenprobe hat die erste Messmethode verworfen

Bei gleichen Gurten muss jede richtige Methode 50,0 % liefern. Der erste
Anlauf las den Obergurtanteil unmittelbar ab und fiel durch — und legte dabei
**zwei echte Effekte** frei, die keine Steifigkeitseffekte sind:

* **Endfeld.** An den zwei äussersten Feldern zieht das Auflager die
  Aufteilung auf 46 / 52 %, obwohl beide Gurte gleich sind.
* **Angriffsort.** Eine Hängestütze hängt am **Untergurt**; ihre Windlast
  läuft dort ein, wo sie angreift, nicht nach Steifigkeit: 43 statt 50 %.
  Ohne Anbauteile verschwindet der Effekt restlos — dann steht dort exakt
  50,0 %.

Die Formel `Anteil = 0,5 + k·(I/ΣI − 0,5)` kennt beides nicht. Wer sie in k
hineinmittelt, misst das Falsche — und genau das ist der alten Messung
passiert, die deshalb 58,8 % fand.

**Gemessen wird deshalb die Differenz.** Jeder Fall läuft zweimal: einmal mit
den wirklichen Gurten, einmal mit dem Obergurtprofil auf beiden Lagen, bei
gleicher Länge, gleicher Blecheinteilung, gleichen Lasten.

```
k = (Anteil_wirklich − Anteil_gleich) / (I_OG/ΣI − 0,5)
```

Jede Störung, die in beiden Läufen gleich wirkt, fällt heraus. Zwei weitere
Fallen, beide von der Gegenprobe gefunden und beide im Werkzeug dokumentiert:
die Schwelle muss sich auf den grössten Wert des **ganzen Laufs** beziehen
(sonst bleibt Querwind ohne hängende Last mit 0,03 kN drin und reisst den Fit
auf k = −1,29), und die Querkraft ist als **Mittel beider Stabenden**
abzulesen (am Stabanfang schlägt die aufliegende Schneelast voll durch).

### GURT_DAEMPFUNG — die 0,42 hält

Gegenprobe bestanden: 636 Messstellen, grösste Abweichung von 50,0 %
**1,47 Pp** über die Querkraft, **1,68 Pp** über das Moment. Ganz auf 50,0
kommt sie nicht und soll es nicht: der Schnee liegt physisch auf dem
Obergurt, ein Rest von rund 1,5 Pp gehört dorthin.

| Typ | I_OG/I_UG | k über das **Moment** | k über die Querkraft | n |
|---|---|---|---|---|
| J120 | 2,04 | **0,436** (0,31…0,50) | 0,177 | 25 |
| J100 | 2,46 | **0,446** (0,37…0,60) | 0,244 | 28 |
| J130 | 4,15 | **0,465** (−0,15…0,55) | 0,225 | 25 |
| **über alle** | | **0,449** | 0,217 | 78 |

**k wandert nicht:** über das Moment 0,436 → 0,465 zwischen den äussersten
Verhältnissen, Unterschied 0,029. Die lineare Form der Formel bewährt sich —
auch beim J130, dessen Verhältnis 4,15 vorher unbelegt war.

Dass die zwei Messwege auseinanderlaufen, ist erklärt: die Querkraft im Gurt
nimmt die unmittelbar aufliegende Last mit, das Endmoment nicht. **Massgebend
ist das Moment**, denn daraus kommt die Spannung des Nachweises.

> **Entschieden am 31. August: auf 0,45 nachgezogen.** Der Unterschied
> beträgt am J100 rund 0,4 Prozentpunkte im Gurtanteil — ohne Folge für eine
> Bemessung, aber die Zahl ist jetzt belegt statt geschätzt. Der Prüfstand
> hält sie zwischen den gemessenen Randwerten 0,436 und 0,465 fest.

### ENDFELD_ZUSCHLAG — 0,48 gemessen gegen 2,0 angesetzt

Der Vergleich läuft gegen ein PyNite-Modell mit **demselben Knotenmodell**,
das der Nachweis benutzt (`anschnitt`). Damit fällt die Vermischung weg, die
die alte Messung belastete: dort steckten im Faktor 2,71 noch 1,3 bis 1,6 aus
dem Unterschied Achse-zu-Achse gegen Anschnitt. Was hier übrig bleibt, **ist**
die örtliche Einleitung. Verglichen wird gegen das Werkzeug mit
abgeschaltetem Zuschlag.

| Fall | Verhältnis FEM / Werkzeug im Endfeld |
|---|---|
| **Querwind — hier greift der Zuschlag** | **k_E = 0,48** (0,41…0,64, 24 Fälle) |
| Vertikallast, alle Anordnungen | 0,90 (0,76…1,04, 48 Fälle) |

**Wo der Zuschlag greift, ist er um Faktor 4 zu hoch.** Bei Querwind steht der
Torsionsanteil auf 100 %, der Zuschlag wirkt also voll — gemessen nötig wären
0,48, angesetzt sind 2,0. Das Werkzeug ist dort ohnehin schon konservativ,
weil es die Bredt-Torsion als Hüllkurve auf alle vier Ebenen legt; der
Zuschlag verdoppelt darüber hinaus.

Wo er nicht greift, wird er auch nicht gebraucht: bei Vertikallast liegt das
Werkzeug mit 0,90 bereits **über** dem FEM.

Gemessen wird nur dort, wo der Torsionsanteil über 50 % liegt.
`k_E = 1 + (Verhältnis − 1)/Torsionsanteil` hat den Anteil im Nenner; bei
kleinem Anteil verstärkt der Quotient jede Abweichung ins Masslose — mit einer
Schwelle von 5 % lieferten dieselben Messungen Werte von +1,18 bis −1,03. Das
ist Arithmetik, keine Physik.

> **Entschieden am 31. August: auf 0,50 gesetzt.** Gemessen sind 0,48; die
> zweite Nachkommastelle wäre bei einer Streuung von 0,41 bis 0,64
> Scheingenauigkeit, und die Rundung geht zur sicheren Seite. An den Stellen am oberen Rand der Spanne liegt das
> Werkzeug damit knapp *unter* dem FEM; wer die Messung nirgends
> unterschreiten will, stellt im Optionsdialog **0,65** ein — das Feld nimmt
> jetzt Werte unter 1 an, 1,0 schaltet die Sache ab.
>
> Weil der Faktor unter 1 liegen kann, mussten drei Stellen ihre
> Richtungsannahme verlieren: der Hinweis in `core.checks.js` löste auf
> `kE > 1` aus und verstummte beim Abmindern; der Prüfstand prüfte, dass die
> Ausnutzung *steigt*; und das Eingabefeld stand auf `min: 1` und hätte 0,48
> gar nicht angenommen. Handbuchkapitel 6.2.2 ist neu geschrieben.

### SCHIEFE_DAEMPFUNG — 0,70 gemessen, weil die Herleitung voll ansetzt

Nachfrage des Auftraggebers am 1. September: *«Warum wurde dies eingebaut? Bei
welchen Vergleichen zu AxisVM oder PyNite hat dies aufgezeigt? Ich würde es
rausnehmen oder sicher deaktiviert lassen als Startwert. Ich will nicht zu
konservativ werden. Wir waren bei den letzten paar Vergleichen rund 10 bis
15 Prozent über dem Wert aus AxisVM.»*

**Warum der Term drin ist.** Ohne ihn rechnet das Werkzeug für die
Horizontalbleche unter reiner Vertikallast **exakt null** — durch deren Ebenen
läuft keine vertikale Querkraft. Das geprüfte FEM zeigt dort rund 11 N/mm²,
mit dem Verlauf der Querkraftlinie. Abschalten ist also keine Abstufung,
sondern ein Loch; bei Querwind auf die Vertikalbleche liegt das Werkzeug schon
*mit* dem Term 25 % **unter** AxisVM, ohne ihn 44 %.

**Was die Herleitung offenlässt.** Sie setzt die *volle* Behinderung an — der
Gurt bleibe im Mittel gerade. Das ist ihr einziger freier Punkt, und er fällt
zugunsten der Sicherheit aus.

**Der Messweg.** Ein Stabmodell mit I_y und I_z in den *Schenkelachsen* kann
den Vorgang nicht zeigen: beide Richtungen sind darin entkoppelt, I_yz kommt
nicht vor. Mit den **Hauptachsen** und 45° Drehung zeigt PyNite ihn exakt. Am
Kragarm nachgerechnet lag die Querverschiebung bei 0,5885 — genau |I_yz|/I_z —
und die Vertikalverschiebung traf auf alle Stellen den Wert mit I\*. Also je
Fall zwei Läufe, Gurte schenkelparallel und gedreht; die Differenz ist der
reine Effekt.

| | |
|---|---|
| Messstellen | **509**, vier Typen, je zwei Blecheinteilungen, drei Lastanordnungen |
| Mittelwert | **k_S = 0,705** |
| Spanne | 0,52 … 0,96 (5- und 95-Prozent-Punkt) |
| nach Typ | 0,56 (J90) · 0,65 (J120) · 0,73 (J100) · 0,82 (J130) |

Gemessen wird nur unter **Vertikallast**. Dort trägt das Horizontalblech ohne
den Zusatz fast nichts — der Ausgangswert liegt im Mittel bei 11 % der
Differenz. Unter Wind ist es umgekehrt: die Vertikalbleche tragen Torsion, der
Zusatz ist ein Aufschlag darauf, und die Differenz misst vor allem, wie die
gedrehten Gurte die Torsion anders verteilen — dort streute k_S von −0,28 bis
1,29 statt eng um 0,70.

Ein Faktor auf β statt auf das Moment wurde mitgerechnet und **verworfen**:
die Streuung bleibt damit grösser (24 statt 22 %), die Systematik lässt sich
so also nicht erklären.

> **Entschieden am 1. September: k_S = 0,70.** Die Gegenprobe nach dem Einbau
> liefert 0,994 — das Werkzeug liegt jetzt auf der Messung. Am J90 über 15 m
> fällt die Ausnutzung des Bindeblechs von 0,432 auf **0,415**; ohne den Term
> wären es 0,380.

**Offen, und das ist wichtig.** Der Vergleich am Signaljoch gegen AxisVM
(Handbuch 6.2.3) fand das Werkzeug *mit* dem vollen Term nur 9 bis 20 % zu
hoch. Diese Messung sagt, der Term allein sei 30 % zu gross. **Beides zusammen
geht nicht auf.** Der Unterschied liegt vermutlich darin, dass das Stabmodell
die Gurte auf ihren Schwerachsen führt, während der Winkel wirklich mit
*einem* Schenkel am Blech hängt. Wer es genau wissen will, misst denselben
Fall in AxisVM nach — die Messoption dafür steht im PyNite-Export
(`gurteSchief`), sie ändert die Ausleitung nicht.

Die 10 bis 15 %, die der Auftraggeber gegenüber AxisVM misst, sind mit
k_S = 0,70 **nicht vollständig erklärt**: am gemessenen Fall bringt der Faktor
knapp 4 % auf die Gesamtausnutzung. Wo der Rest herkommt, ist ungeklärt.

### Eine Fehldiagnose und was sie gelehrt hat

Zwischenzeitlich stand hier, ein Querversatz erzeuge im Rechenkern keine
Torsion — `ex = a.y ?? a.ex ?? 0` in `anbauteilLasten` greife ins Leere.
**Das war falsch, und die Stelle ist in Ordnung.** Nachgemessen am J90 mit
0,65 kN auf y = 1,2 m liefert der Kern 0,78 kNm, genau Kraft mal Hebel; das
aufgelöste Anbauteil trägt sein y korrekt.

Der Fehler lag im Vergleich. Der charakteristische Lastfall `gk` trägt
`nur: 'joch'` und blendet **sämtliche** Anbaulasten aus — sie stehen im
eigenen Lastfall `ak`. PyNite dagegen rechnet alles, was im Modell steht.
Verglichen wurden also zwei verschiedene Tragwerke, und die fehlende Anbaulast
sah aus wie eine fehlende Torsion. Sichtbar wurde es daran, dass der
ausgewiesene Torsionsanteil bei Eigengewicht auf 0 % stand; nach der Korrektur
steht er auf 32 %.

Der Endfeldteil setzt die Beiwerte deshalb unmittelbar (`beiwerteFest`) statt
einen benannten Lastfall zu nehmen — damit entfällt das Ausblenden, und beide
Seiten rechnen dasselbe Tragwerk.

**Die Lehre für jeden weiteren Abgleich mit einem FEM:** die Lastfälle des
Werkzeugs sind nach *Lastart* getrennt (`gk` Joch, `ak` Anbauteile), die eines
FEM nach *Einwirkung*. Wer sie über den Namen zuordnet, vergleicht
Verschiedenes. Die Zahlen der Dämpfungsmessung sind davon nicht berührt — sie
stellt zwei PyNite-Läufe gegeneinander, das Werkzeug kommt dort nicht vor.

### Das Werkzeug

```bash
node kalibrieren.mjs                  # beide Kennwerte, rund 80 Läufe
node kalibrieren.mjs --nur daempfung
node kalibrieren.mjs --nur endfeld
node kalibrieren.mjs --schnell        # ein Fall je Gruppe, zum Probieren
```

Gerechnete Läufe werden wiederverwendet; `KALIB_NEU=1` erzwingt neu. Die
Rohläufe liegen ausserhalb der Ablage (`KALIB_ORDNER`), hier bleiben nur die
Messtabellen. Die Gegenprobe steht am Anfang und sagt laut, wenn sie fällt —
ohne sie wären beide Fehlmessungen unentdeckt geblieben.

## Was von BlockCalc übernommen wird (1. September)

Der Auftraggeber betreibt ein zweites Werkzeug für Blockfundamente nach
SIA 267 und fand dessen Projektablage **aufgeräumter**. Der Eindruck stimmt,
und er lässt sich benennen.

### Was dort besser gelöst ist

**Eine Speicherebene statt drei.** BlockCalc führt einen einzigen
Key-Value-Store (IndexedDB, ein Objektspeicher `kv`), der beim Start
vollständig in den Arbeitsspeicher geladen wird; danach ist jeder Zugriff
synchron. Alles liegt darin — Einträge unter `proj_*`, Vorlagen, Einstellungen,
Entwurf. Hier verteilt sich dasselbe auf localStorage (Sitzung) und mehrere
IndexedDB-Speicher mit asynchronem Zugriff.

**Das Projekt ist kein Objekt, sondern ein Feld.** Es gibt keine
Projektverwaltung; `p_name` steht am Eintrag, und die Projektliste wird aus den
vorhandenen Einträgen zusammengesetzt. Kein Anlegen, kein Aufräumen verwaister
Projekte. Unsere Ablage kennt mit `nachProjekt()` und `projektUmbenennen()`
bereits dasselbe Prinzip.

**Der Speicherzustand ist sichtbar** (`_markSaved` / `_checkDirty` /
`_updateDirtyUI`): der Knopf trägt eine Markierung, sobald der Stand vom
zuletzt gesicherten abweicht, und sein Titel sagt, was ein Druck bewirken
würde. Dazu ein Auto-Entwurf (`bc_draft`) mit Zeitstempel, der einen Absturz
überlebt, aber vom bewussten Speichern getrennt bleibt.

**Der Datenaustausch ist auswählbar** (`_EXCHANGE_PARTS`): man hakt an, was
hinaus soll; der Import zeigt erst eine Übersicht des Dateiinhalts samt
Kollisionswarnung und schreibt erst nach Bestätigung.

**Und ein Fallback:** fehlt IndexedDB (privates Fenster, enge WebViews), wandert
der ganze Store als ein JSON-Eintrag in localStorage.

### Was NICHT übernommen wird

BlockCalc ist **eine Datei** mit 1,1 MB Inline-Skript. Für die Bedienung
aufgeräumt, für die Pflege nicht. Dieses Werkzeug ist in 37 Module getrennt und
hat einen Prüfstand mit über 2000 Kontrollen — genau deshalb liessen sich in
dieser Woche zwei Kennwerte messen, nachziehen und die Änderung an einer Stelle
durchschlagen. Das wird nicht eingetauscht.

### Gebaut: der sichtbare Speicherzustand

Die Frage «wird schon bei der Eingabe gespeichert oder muss man drücken?» war
keine Wissenslücke, sondern ein Mangel der Oberfläche. **Beides stimmt:**

| | |
|---|---|
| **Arbeitsstand** | bei jeder Eingabe, ein Stand, überschreibt sich (localStorage) |
| **Ablage** | benannter Eintrag, erst auf Knopfdruck (IndexedDB) |

Sichtbar war davon nichts. Jetzt trägt der Projektknopf einen Punkt, sobald der
Stand von dem abweicht, was zuletzt gesichert oder geladen wurde, und sein
Titel nennt drei Dinge:

```
Projektablage und Vorlagen öffnen
Arbeitsstand gesichert 07:45 (bei jeder Eingabe)
In der Ablage steht noch der Stand von zuletzt – hier speichern
```

Der Vergleich läuft über eine Signatur der Eingabewerte, aus der die flüchtigen
Felder ausgenommen sind (Bearbeiten-Sperren, Schnittfenster) — sonst meldete
das blosse Aufklappen eines Feldes eine ungesicherte Änderung.

**Eine Falle dabei:** `baueKopf()` läuft bei *jeder* Änderung. Stünde der
Bezugspunkt unbedingt dort, setzte er sich bei jeder Eingabe auf den eben
getippten Stand, und nichts wäre je ungesichert. Er wird deshalb nur gesetzt,
solange die Signatur noch `null` ist — sowie nach Sichern, Laden und Neubeginn.

### Nebenfund: `node --check` prüft zu schwach

Beim Einbau entstand ein mehrzeiliger String in einfachen Anführungszeichen.
`node --check js/app.js` sagte **Syntax in Ordnung**; dieselbe Datei mit der
Endung `.mjs` geprüft fiel sofort durch. Im Browser war die Anwendung tot —
eine leere Seite und eine Meldung ohne Datei und Zeile.

Zwei Lücken kamen zusammen: die Endung entschied über den Prüfmodus, und
**`app.js` und `ui.js` prüft sonst niemand** — der Prüfstand lädt sie nie, weil
sie ein DOM brauchen.

`build_html.py` prüft deshalb jetzt **jede Moduldatei einzeln als Modul**, bevor
gebündelt wird, und nennt dabei den Dateinamen. Gegenprobe gefahren: ein
absichtlich eingebauter Fehler stoppt den Bündler.

### Umgesetzt am 1. September

**Fachliche Merkmale in der Ablageliste.** Die Zeile trug Typ, Länge,
Ausnutzung und Datum, also die Rechnung. Gesucht wird aber nach dem Ort: ein
J90 über 15.5 m gibt es dutzendfach, den Kilometer 16.661 auf Linie 600 genau
einmal. Voran stehen jetzt Linie, Kilometer und Ortschaft, danach die
Rechenwerte. Sie kommen aus den Eingabewerten des Eintrags, den `liste()`
ohnehin mitliefert.

**Auswahl beim Ausleiten, Vorschau beim Einlesen.** Bisher ging immer alles
hinaus: wer zwei Tragwerke schicken wollte, schickte die ganze Ablage samt
jedem Bild. `alsPaket(wahl, ids)` nimmt jetzt eine Auswahl aus `PAKETTEILE`.
Umgekehrt schrieb der Import sofort; man sah erst hinterher, was hereinkam,
und ein zweites Einlesen derselben Datei legte alles ein zweites Mal an.
`paketInhalt()` liest nur und meldet Anzahl, Erzeugungsdatum und Kollisionen.
Als Kollision gilt gleicher Name im gleichen Projekt, nicht die Id: die wird
beim Einlesen ohnehin neu vergeben.

**Ersatzspeicher ohne IndexedDB.** Im privaten Fenster und in engen WebViews
scheiterte bisher jeder Zugriff auf die Ablage, und weil das erst beim
Speichern auffiel, war die Arbeit getan. Der Ersatz hält dieselben Speicher
als ein JSON in localStorage und bedient put, get, getAll und delete; ein
Index wird nirgends gebraucht. Was er nicht kann, sagt er: Zeichnungen sind
Binärdaten, und ein Bildschirmausschnitt in Base64 füllt die 5-MB-Schranke im
Alleingang. Sie werden abgewiesen, das Tragwerk selbst wird gespeichert.

### Entschieden — nicht wieder aufmachen

Zwei Fragen, die mehrfach gestellt wurden und die der Auftraggeber am
28. August entschieden hat. Beide Entscheide bedeuten: **so lassen, wie es
ist.**

| Frage | Entscheid |
|---|---|
| Soll die Mastwahl beide Namen zeigen, «DP26 (HEB 260)»? | **Nein — der Profilname genügt.** Die Zuordnung DP↔HEB ist über zwei unabhängige Spalten belegt (Eigengewicht und Windlasten, DP20/22/24/26 und DPM24), aber sie gehört nicht in den Wähler. Wer nach DP sucht, findet die Zuordnung im Bauteilsatz |
| War das **Klemmenraster von 20 mm** so gewollt? | **Nein, ein Versehen.** Entscheid vom 31. August: die Raster sind meist mit 400 mm anzusetzen, Ausnahmen kommen vor. Gesperrt wird deshalb nichts — `core.checks.js` meldet seither ein Raster unter 100 mm als Hinweis, damit ein Vertipper nicht still durchläuft. Der Ausleiter legt Reihen unter 25 mm ohnehin zu einem Anschluss zusammen |
| Soll die **Stabilität des Mastes** (Biegeknicken, Biegedrillknicken) geführt werden? | **Nein, bis auf weiteres nicht.** Entscheid vom 31. August: Knicken ist beim Masten wegen der verhältnismässig kleinen Lasten nie massgebend. Der Querschnittsnachweis in `core.mast.js` bleibt und genügt. Die Frage nach der Knicklänge erübrigt sich damit |
| Soll `DP18` in `data.masten.js` aufgenommen werden? | **Noch nicht.** Das Profil steht in `fl_bauteile.json` (0,512 kN/m = HEB 180), das zugehörige HEB 180 fehlt in `data.masten.js`. Das ist kein Versehen und wird nicht ergänzt, bis der Auftraggeber es verlangt |


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

### Stand des AxisVM-Exports über SAF (überholt)

> Der SAF-Weg ist vom COM-Weg abgelöst worden; die Notiz bleibt stehen, weil
> die Überlegungen zum Knotenmodell weiter gelten. Der Import über SAF ist nie
> gelaufen und muss es auch nicht mehr.

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

### Der Weg dorthin: zwei Rechenwege, eine Anwendung

**Richtungsentscheid des Auftraggebers, 28. August.** Werden die Ergebnisse
aus AxisVM zurückgelesen, sollen sie **in der Anwendung dargestellt** werden,
und ein Schalter trennt die beiden Herkünfte:

| Stellung | Woher die Schnittgrössen kommen |
|---|---|
| **Vereinfachte Vordimensionierung** | der Ersatzbalken dieser Anwendung, wie heute |
| **Berechnet mit FEM (AxisVM)** | zurückgelesen aus dem gerechneten Stabmodell |

Damit hat das Werkzeug eine zweite Rolle: nicht mehr nur rechnen, sondern
auch **anzeigen und nachweisen, was ein anderes Programm gerechnet hat**. Die
Nachweisformeln bleiben dieselben; nur die Schnittgrössen wechseln die
Quelle.

**Drei Dinge sind vor dem Bauen zu entscheiden — sie hängen alle an derselben
Gefahr: dass eine Zahl aussieht, als käme sie von woanders her.**

1. **Jede angezeigte Grösse muss ihre Herkunft mitführen**, nicht nur der
   Schalter oben. Ein η aus dem Ersatzbalken neben einem M_y aus AxisVM wäre
   die schlimmste Mischung, die dieses Werkzeug erzeugen kann — sie sähe aus
   wie ein Ergebnis und wäre eine Collage. Die Herkunft gehört an den Wert,
   nicht an die Ansicht.
2. **Der zurückgelesene Stand muss zum Modell passen.** Ändert jemand die
   Jochlänge, nachdem AxisVM gerechnet hat, sind die Ergebnisse verwaist. Das
   Modell braucht einen Fingerabdruck (Geometrie, Lasten, Lastfälle), der mit
   den Ergebnissen zurückkommt und beim Laden verglichen wird. Passt er
   nicht, gilt der FEM-Stand als ungültig — angezeigt, aber nicht verwendet.
3. **Fehlt ein Ergebnis, wird nicht ersatzweise gerechnet.** Sonst stünde
   unter «FEM» stillschweigend der Ersatzbalken. Dieselbe Regel wie bei den
   nicht geführten Nachweisen: lieber eine Lücke, die man sieht, als eine
   Zahl, die eine andere vortäuscht.

**Was dafür noch fehlt:** das Zurücklesen selbst. `Results.NodalSupportForces`,
`GetAllNodalSupportForces`, `Reactions` und `LineForces` sind in
`AxisVM_aufbauen.ps1` **vermessen**, aber nicht gebaut. Das braucht einen Lauf
an einer lizenzierten AxisVM-Sitzung — dort werden die Signaturen abgenommen,
nicht geraten.

### Pendent: der prüffähige Nachweisbericht

Ebenfalls festgehalten am 28. August. Heute gibt es drei Ausgaben, aber keinen
Bericht, den man einer Prüfstelle vorlegt:

* die **Excel-Ausleitung** — Zwischenwerte je Station, für die Nachrechnung
* die **gedruckte Übersicht** — der Stand auf einer Seite
* das **Handbuch** — Herleitung und Modellgrenzen, ohne Projektbezug

Ein prüffähiger Bericht müsste beides verbinden: System, Einwirkungen,
Lastfälle, Schnittgrössen, Nachweise mit Formel und Zwischenwert — und, das
ist der Teil, der schon steht, die ausdrückliche Angabe, **welche Nachweise
geführt wurden und welche nicht** (`NACHWEISGRUPPEN` in `core.checks.js`).
Mit dem Schalter oben kommt eine zweite Angabe dazu: **womit** gerechnet
wurde.

---

## Lehren aus dieser Sitzung

### Ein Schreibfehler leert die Datei, bevor er auffliegt

`open(pfad, 'w')` **kürzt die Datei auf null**, und zwar bevor der erste Byte
geschrieben wird. Läuft danach der Encoding-Schritt auf einen Fehler — ein
Sonderzeichen in einer Datei, die reines ASCII sein muss — bleibt eine Datei
von 0 Byte zurück. So ist `com/AxisVM_aufbauen.ps1` einmal vollständig
verschwunden; wiederhergestellt wurde sie aus der Ablage.

**Regel:** Text erst kodieren, dann in eine Nebendatei schreiben, dann
`os.replace`. Das Hilfsskript macht es seither so — und hat den Fehler danach
noch zweimal abgefangen:

```python
def schreibe(pfad, text):
    text.encode('ascii')                  # scheitert VOR dem Schreiben
    open(pfad + '.neu', 'w', encoding='ascii', newline='').write(text)
    os.replace(pfad + '.neu', pfad)       # unteilbar
```

Zusammen mit der Lehre über `str.replace` weiter unten ergibt das dieselbe
Regel in zwei Fassungen: **erst prüfen, dann schreiben — nie umgekehrt.**

### PowerShell bindet Variablen, nicht Werte

Eine Liste von Kandidatenblöcken, in einer Schleife gefüllt, sah am Ende alle
denselben letzten Wert — jeder Block greift auf *die Variable* zu, nicht auf
ihren damaligen Inhalt. Alle Versuche liefen deshalb mit den Parametern des
letzten Kandidaten. Behoben mit `.GetNewClosure()` an jedem Block.

Verwandt: bei einem Wertetyp (Verbund/`struct`) liefert `$satz.Feld` eine
**Kopie**. `$r.Point1.x = 1` läuft ins Leere, ohne zu klagen. Deshalb schreibt
`SatzSetzen` über Reflexion und legt den geänderten Untersatz wieder in den
Obersatz zurück.

---

## Zwei Lehren aus der Sitzung vom 20. August

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
