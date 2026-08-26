# Übergabe — Stand der Arbeit

Dieses Blatt fasst zusammen, was in der letzten Arbeitssitzung geschehen ist und
was offen bleibt. Es ist als Einstieg für die Fortsetzung an einem neuen Ort
gedacht; die fachliche Beschreibung steht im [README](README.md), die Herleitung
des Rechenwegs im **Handbuch in der Anwendung** (Knopf `ⓘ` im Banner, Quelle
`js/doku.handbuch.js`).

**Stand:** 1151 Kontrollen bestanden, 0 gefallen · Bundle 1065 kB · Ablage-Format v2 · COM-Brücke vollständig (Modell, lokale Achsen, Starrkörper, Linkelemente) · **installierbar mit Dateiannahme und Sprungliste** · **Modellnavigation mit Fingern** · **NT-Ausleger als Kragarm**

---

## Arbeiten am Projekt

```bash
python3 serve.py            # Modulversion:  http://localhost:8731/index.html
python3 build_html.py       # bündelt js/ + css/ -> vierendeel_tool.html
                            # und frischt sw.js auf (Ablageliste + Fassung)
node pruefung.mjs           # Prüfstand, 1151 Kontrollen
```

Der Port kommt aus der Umgebungsvariablen `PORT`, sonst aus dem Aufruf, sonst
8731. Nach jeder Änderung an `js/` oder `css/` **neu bündeln** — die
eigenständige Datei wird sonst still veraltet.

---

## Diese Sitzung

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
| Ausleger Typ Rohr | **1.50 m** | 1.20 m |
| N-FL Kettenwerk | **3.00 m** | 1.50 m |

Das e_v der Hängestütze ist nicht gewählt, sondern übernommen: **alle vier**
Hängestützen-Vorlagen der Datenbank führen 1.35 m für dieses Bauteil.

**Eine Stelle bleibt zu bestätigen.** Der Rohrausleger greift bei e_v = 1.20 m
an, die Hängestütze bei 1.35 m — der Ausleger sitzt also *über* dem
Angriffspunkt seines eigenen Trägers, und die Kette läuft im Bild 15 cm
zurück nach oben, bevor sie ausschert. Rechnerisch ist das ohne Folge (alle
Glieder sind Starrkörper, am Joch kommt dieselbe Resultante an), aber die
beiden Masse stammen aus der Zeit, als der Rohrausleger noch direkt am Joch
hing. Ob e_v für Ausleger und Kettenwerk so bleibt, ist noch zu sagen.

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
| `data/*.json` | die drei Datenbanken — sie machen die Ablage sonst nicht-öffentlich |
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

`pruefung.mjs` **braucht** die drei `data/*.json`. In einer öffentlichen Ablage
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
| **Node** | `pruefung.mjs` (1151 Kontrollen), `ausleiten.mjs`, `vergleich_werkzeug.mjs` |
| **Python 3** | `serve.py`, `build_html.py`, `vergleich_axisvm.py` |
| **Git** | die Geschichte fortschreiben |
| PowerShell 5.1 | ist auf jedem Windows, vermessen |
| AxisVM | vermessen an Fassung 18 r1m (X8) |

Ein AxisVM-Platz sollte auch mal zehnmal hintereinander geöffnet werden dürfen —
beim Vermessen einer Schnittstelle ist das der Normalfall.

`pruefung.mjs` **braucht** die drei `data/*.json`. Liegen sie nicht daneben,
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
| **Ergebnisse zurücklesen** | noch **gar nicht** vermessen — derselbe Suchvorgang wie beim Aufbau. Danach `vergleich_werkzeug.mjs` / `vergleich_axisvm.py` |
| **Kennwerte nachziehen** | `GURT_DAEMPFUNG` 0,42 · `MAST_UNVERSCHIEBLICH` 3,10 · `ENDFELD_ZUSCHLAG` 2,0 — gegen das neue AxisVM-Modell noch nicht kalibriert |
| **Raster 20 mm bei den Anbauteilen** | ob der Wert so gewollt ist, ist offen. Die zwei Reihen liegen dadurch 20 mm auseinander; siehe *Zu enge Schnitte* |
| **AxisVM-Export über SAF** | gebaut, aber vom COM-Weg überholt. Der SAF-Import ist nie gelaufen |
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
