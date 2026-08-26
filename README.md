# Tragjoch – Bemessung gegliederter Vierendeel-Träger aus 4 Winkelprofilen

Bemessung und konstruktive Überprüfung eines gegliederten Vierendeel-Trägers
aus vier Winkelprofilen mit Bindeblechen, Bauart **Tragjoch Typ J60 – J130**,
nach SZS C5, SIA 260, SIA 261 und SIA 263.

Geometrie und Lastdaten kommen aus dem **Datenpaket** (siehe unten) — Sortiment,
Anbauteil-Vorlagen und Lasttabelle des Betreibers. Die Zeichnungs- und
Regelwerksnummern stehen dort, nicht in diesem Dokument und nicht im Code.

> **Stand der Arbeit und offene Punkte:** [UEBERGABE.md](UEBERGABE.md)

---

## Die zwei Werkzeuge

| | Zweck |
|---|---|
| **`vierendeel_tool.html`** | Eigenständige Datei für Variantenstudien. Doppelklick genügt, es wird nichts nachgeladen. Enthält Zeichnungen, Diagramme und einen `.xlsx`-Export. |
| **`Vierendeel_L_Profil_SZS_C5.xlsx`** | Prüffähige Abgabe. Alle Ergebniszellen sind **lebende Excel-Formeln** – jede Eingabeänderung rechnet in Excel nach, und der Prüfer sieht jede Formel in der Zelle. |

Beide rechnen dasselbe Modell. Dass sie identische Zahlen liefern, wird mit
`vergleich_excel_js.py` nachgewiesen (siehe unten).

---

## Modell

**Statisches System** — Einfeldträger der Spannweite `L`, an beiden Enden über
eine **Drehfeder** gelagert. Damit sind gelenkig (`c_φ = 0`), teilweise und voll
eingespannt (`c_φ → ∞`) mit demselben Formelsatz abgedeckt. Steht das Joch auf
Masten, folgt die Federsteifigkeit aus dem Mast — und zwar je nach **Anschluss**:

| Anschluss | `c_φ` | wann |
|---|---|---|
| **durchlaufend** (Voreinstellung) | `1.45 · E·I / H` | der Mast läuft über die Anschlussebene hinaus, das Joch ist über seine ganze Höhe angeschlossen |
| **Kragmast** | `E·I / H` | der Mast endet am Joch, Anschluss in einem Punkt |

Der Faktor **1.45 ist gemessen**, nicht geschätzt: an einem PyNite-Modell mit
ausmodelliertem Mast (HEB 260, Fuss eingespannt, H = 7.5 m, J90 über 15.5 m)
wurde diejenige Drehfeder gesucht, die im **gleichen Stabmodell** dasselbe
**Feldmoment** liefert:

| Anschluss | gemessen | Faktor |
|---|---|---|
| in einem Punkt | 5743 kNm/rad | 1.37 |
| über die Jochhöhe | 6074 kNm/rad | **1.45** |

Verglichen wird das **Feldmoment**, weil Ersatzbalken und Stabmodell dort über
den ganzen Federbereich auf 0.2 % übereinstimmen. Das Stützmoment taugt nicht
als Massstab: der Ersatzbalken kennt es am Auflager, das Stabmodell erst in der
ersten Feldmitte — ein Vergleich der beiden führt in die Irre.

Dass die **Schubweichheit** des gegliederten Trägers im Ersatzbalken nicht
geführt wird, fällt dabei nicht ins Gewicht — genau diese Übereinstimmung von
0.2 % zeigt es.

Die Wahl bewegt die Nachweise: weicher gerechnet wächst das **Feldmoment**,
steifer das **Stützmoment**. Am verjüngten Ende steht dem Stützmoment nur der
kleine Hebelarm gegenüber — dort ist die steifere Annahme die ungünstigere.

**Die Feder wird durch die Schrauben begrenzt.** Der Anschluss Joch–Mast läuft
**je Gurt** über Schrauben; das Stützmoment tritt als Kräftepaar zwischen Ober-
und Untergurtanschluss in den Mast:

```
F_Gurt = M_Stütze / h        M_Stütze ≤ F_Grenz · h
```

Mehr als ihre Grenzlast können die Schrauben nicht übertragen. Weil das
Stützmoment selbst von der Feder abhängt, wird sie **iterativ** herabgesetzt,
bis die Grenzlast eingehalten ist (`core.auflager.js`, `begrenzeFeder`) — so wie
es im AxisVM-Modell von Hand gemacht wird. Voreingestellt sind **24 kN**
Horizontalkraft je Gurtanschluss; abschaltbar.

Die begrenzte Feder **hängt vom Lastniveau ab** und kann je Lastfall anders
ausfallen. Das ist keine Unsauberkeit, sondern die Sache selbst. Wann sie
eingreift (Mast HEB 260, H = 7.5 m, massgebender Lastfall, mit Hängestütze):

| Joch | F_Gurt | Feder |
|---|---|---|
| J70, 12 m | 14.7 kN | unberührt |
| J90, 15.5 m | 18.4 kN | unberührt |
| J90, 24 m | 24.0 kN | 6058 → **1765** kNm/rad |
| J130, 30 m | 24.0 kN | 6058 → **2151** kNm/rad |

Bei den kurzen Jochen greift sie nicht, bei den langen bestimmt sie die
Einspannung fast allein. **«Voll eingespannt» bleibt ausgenommen** — das ist
eine bewusst gewählte Idealisierung zum Vergleich, keine ausgeführte
Verbindung.

**Altbauweise: immer gelenkig.** Bei den alten Jochen trägt der Anschluss ans
Mast kein Einspannmoment. Die Auswahl eines Alttyps stellt die Endbedingung
deshalb auf «gelenkig»; wird sie von Hand geändert, meldet das Werkzeug einen
Hinweis.

Die Einspannung wirkt **nur auf die Vertikalbiegung**. Eine Einspannung gegen
die Windbiegung würde die Torsionssteifigkeit des Mastes beanspruchen; bei
offenen H-Profilen ist die so gering, dass das Joch für Wind sinnvollerweise
gelenkig gelagert bleibt.

**Einwirkungen**

* Verteilte Lasten wahlweise aus der Sortimentstabelle der Zeichnung oder
  manuell. Die Tabellenwerte sind bereits fertig gerechnete **Laufmeterlasten**
  `[kN/m]` auf das Joch und charakteristisch — sie werden unverändert
  übernommen, es wird nichts mehr mit einer Fläche multipliziert.

  Die Angaben 0.90 / 1.10 / 1.30 kN/m² sind die zugehörigen
  **Referenz-Staudrücke** (hier als EK1 / EK2 / EK3 geführt), 0.90 / 1.25 kN/m²
  die Referenz-Schneelasten. Sie dienen nur der Orientierung und gehen selbst
  nicht in die Rechnung ein: der Staudruck am Standort ist nach SIA 261 zu
  ermitteln und mit der gewählten Klasse zu vergleichen.

  Der Windwert gilt für das Joch selbst und wirkt **in Gleisrichtung**; er
  läuft deshalb in der Gruppe `Wind y`. Wind auf Fahrleitung und Hängestützen
  kommt aus den Anbauteilen.

**Einwirkungsgruppen**

| Gruppe | Art | Inhalt |
|---|---|---|
| `G` | ständig | Eigengewicht Joch und Anbauteile, Umlenkkraft aus dem Leiterzug |
| `WindX` | veränderlich | Windkraft **in Jochachse** (x) |
| `WindY` | veränderlich | Windkraft **in Gleisrichtung** (y): Laufmeterlast `w_k` und `Q_y` |
| `Schnee` | veränderlich | Laufmeterlast und veränderliche Vertikallasten der Anbauteile |

Wind ist keine Einwirkung mit fester Richtung. Die Lasttabelle führt je Bauteil
eine Angriffsfläche quer und eine längs zum Gleis – zwei **Windrichtungen**, die
nicht gemeinsam auftreten. Getrennt geführt geht jede Richtung mit **+ und −**
in die Kombination; die vorgegebenen Lastfälle enthalten beide Vorzeichen.
Ständige Einwirkungen behalten ihre Wirkrichtung und werden nicht gespiegelt.

* Anbauteile als **Baugruppen**: eine Lage am Joch, darunter beliebig viele
  Bauteile aus der Lasttabelle und beliebig viele **freie Lastblöcke**.
  Ein Lastblock beschreibt eine Last vollständig:

  | Block | Felder | Bedeutung |
  |---|---|---|
  | Einwirkung | – | `G` / `WindX` / `WindY` / `Schnee` |
  | Angriffspunkt | `x`, `y`, `z` | relativ zur Befestigung; **z positiv nach oben**, 0 auf der Schwerachse des Anschlussgurtes |
  | Kraft | `F_x`, `F_y`, `F_z` | `F_z` positiv nach unten |
  | Moment | `M_xx`, `M_yy`, `M_zz` | optional; um Jochachse / y / Lotrechte |

  Ein Teil UNTER dem Joch hat also `z < 0`. `z` wird dort gemessen, wo man es
  am Bauteil abgreift — an der Schwerachse des Gurtes, an dem es hängt. Der
  Hebelarm der Torsion zählt dagegen ab der **Jochachse**; dazwischen liegt die
  halbe Jochhöhe:

      z_A = ±h/2      e_v = −(z_A + z)      T = F_y · e_v + F_z · e_x + M_xx

  Bei durchgehender Befestigung entscheidet das Vorzeichen von `z` je Modul,
  an welchem Gurt gemessen wird: was nach oben ragt, am Obergurt; was hängt,
  am Untergurt.

**Trasse: Umlenkkraft im Bogen**

Liegt das Gleis im Bogen, knickt die Fahrleitung an jeder Aufhängung um den
Ablenkwinkel α ab. Die Resultierende der beiden Leiterzugkräfte wirkt quer zum
Gleis, am Joch also in Jochachse:

    α = 2 · arcsin( L / 2R )        U = 2 · Z · sin(α/2) = Z · L/R

Die zweite Gleichheit ist **exakt**, keine Näherung. `U` ist eine **ständige**
Einwirkung und läuft in der Gruppe `G`.

Die Bogenseite steckt im **Vorzeichen**, nicht in einem Schalter: `R > 0` lenkt
in +x, `R < 0` in −x. Am einzelnen Drahtwerk lässt sich statt Radius und
Spannweite direkt der Winkel α eintragen – auch er vorzeichenbehaftet. Der
frühere Schalter «günstig / ungünstig» der Mastberechnung ist entfallen: er war
dort nur nötig, weil der Wind aus einer Richtung angesetzt wurde.

**Nachweise**

* Konstruktive C5-Bedingungen (`a₁/i_min ≤ 50`, Bindeblechhöhen und -dicken)
* Querschnittsklassifizierung `a/t` nach EN 1993-1-1 Tab. 5.2
* Spannungsnachweis **Ober- und Untergurt getrennt** – ab J100 sind die Profile
  unterschiedlich, J130 hat unten sogar einen ungleichschenkligen Winkel
* Bindeblech: Biegung, Schub, von-Mises-Vergleichsspannung
* Mast am Fuss (Normalkraft, Jochmoment, Windmoment)

**Kein Knicknachweis.** Weder Gesamtstab noch Einzelwinkel – bewusst
weggelassen, separat zu führen. Die C5-Regel `a₁/i_min ≤ 50` ist eine
konstruktive Bedingung, kein Stabilitätsnachweis.

---

## Querschnitt und Winkelausrichtung

Nach Schnitt A–A der Zeichnung zeigt der **liegende Schenkel nach aussen** und
bildet mit seiner Aussenfläche Ober- bzw. Unterkante (Mass `jd`); der
**stehende Schenkel zeigt nach innen** und begrenzt die lichte Breite
(`jbb − 2·ja`). Die Ferse liegt damit oben bzw. unten aussen.

Die Ausrichtung ist für Ober- und Untergurt getrennt einstellbar. Das Werkzeug
prüft dabei, ob die Bindebleche noch **in der Flucht der Schenkel** liegen: wenn
die stehenden Schenkel von Ober- und Untergurt nicht in einer Ebene liegen, wäre
das Bindeblech nicht eben – das wird als Warnung mit dem Versatz in mm gemeldet.

Der Querschnitt wird ab der **Ferse** aufgebaut, nicht ab dem Schwerpunkt. Nur so
liegen die Aussenflächen bei ungleichen Profilen für Ober- und Untergurt
automatisch bündig, wie es die Zeichnung verlangt.

---

## Hebelarme: `jd`/`jbb` sind Aussenmasse

Die Zeichnungsmasse sind **nicht** die Schwerpunktsabstände, die in die
Bemessung gehören. Das Werkzeug rechnet deshalb alle drei Varianten parallel
durch und weist die Abweichung aus:

| Variante | Hebelarm | Wirkung |
|---|---|---|
| **Schwerpunkt** (empfohlen) | zwischen den Profilschwerpunkten | statisch korrekt |
| **Aussenmass** | `jd` / `jbb` direkt | grösster Hebelarm, kleinste Gurtkräfte → **unsichere Seite** |
| **Lichtmass** | lichte Innenkanten | kleinster Hebelarm → sichere Seite |

Beim J90 macht das rund 20 % Unterschied in der Ausnutzung. Die gewählte
Variante steuert die ganze Bemessung.

---

## Typendatenbank

Die Typendaten liegen in **`data/tragjoche.json`** — reine Daten, ohne Code.
Dort pflegen, danach `python3 build_html.py`. Enthalten sind je Typ die Profile,
die Aussenmasse, die Tabellenlasten und die **Bindebleche mit ihrer Staffelung**
(Position, Breite × Dicke × Länge).

Die Datenbank führt **zwei Bauweisen**:

| | `bauweise: "neu"` | `bauweise: "alt"` |
|---|---|---|
| Typen | J60 … J130 | J60-alt … J130-alt |
| Quelle | Sortimentsblatt und Konstruktionszeichnungen | Sammelmappe der Altbauweise |
| Bauhöhe | durchgehend gleich | **an beiden Enden verjüngt** |
| Lichte Auflagerbreite | 340 mm | 280 mm |
| Staffelung | eine je Typ | eine je **Ausführung** (Längenbereich) |

Die Blechbreite ist entlang der Spannweite gestaffelt — breit am Auflager,
schmal in Feldmitte. Beim J130 etwa 200 mm am Auflager bis 100 mm in Feldmitte.
Deshalb lässt sich an jeder Stelle das dort tatsächlich vorhandene Blech
nachweisen.

### Verjüngte Enden (Altbauweise)

Der Obergurt läuft durch, der Untergurt steigt vom Knick zum Auflager an, bis
die stehenden Schenkel beider Gurte aufeinanderstossen. Feld `voute`:

```
endJd    Bauhöhe am Jochende = aV,OG + aV,UG
gerade    900 mm   paralleles Endstück
neigung  2100 mm   horizontale Länge der Schräge
knick    3000 mm   ab hier volle Bauhöhe  (= gerade + neigung)
```

Alle sieben Typen sind gleich bemasst. Bei Spannweiten unter 2 · `knick` würden
sich die beiden Vouten überschneiden; sie werden dann proportional gestaucht —
die Schemazeichnungen machen es genauso (beim J60 mit 8.0 m endet die Schräge
bei 2800 statt 3000 mm).

Der **Hebelarm h ist damit ortsabhängig**. Gurtkräfte `M/(2h)`, die lokalen
Vierendeel-Momente und der Torsions-Schubfluss `T/(2bh)` werden an jeder Station
mit dem dortigen h gerechnet. Am Auflager wird h bei der Endbauhöhe abgefangen —
dort wirkt kein Vierendeelträger mehr, sondern ein voller Querschnitt.
`EI` für die Drehfedern bleibt der Feldwert.

Am verjüngten Ende liegen die ersten Stationen **ohne Vertikalblech** (die Gurte
stossen dort zusammen); die Staffelung führt das mit `"pos": null`.

### Selbstprüfung beim Start

* `ja` muss zum Schenkel des Profils passen
* `jba − 2·ja` muss 340 mm ergeben (`neu`) bzw. 280 mm (`alt`)
* Vertikalblechlänge muss `jd − aV,OG − aV,UG` sein
* Horizontalblechlänge muss `jbb − 2·ja` bzw. `jba − 2·ja` sein
* `endJd` muss `aV,OG + aV,UG` sein, `knick` muss `gerade + neigung` sein
* die Ausführungen müssen den Längenbereich lückenlos abdecken

Widersprüche werden oben im Werkzeug gemeldet, statt in die Bemessung
durchzuschlagen.

### Gegenprobe der Altbauweise

Bauhöhe und Feldbreite jedes Alttyps stimmen mit dem gleichnamigen heutigen Typ
überein, obwohl sie aus einer anderen Zeichnung stammen. Zusätzlich muss in
jeder Ausführung die Zahl der Horizontalbleche die der Vertikalbleche um genau
4 übersteigen (je Ende und Ebene ein Blech mehr, weil das Vertikalblech am
verjüngten Ende entfällt). Beides trifft für alle 7 Typen und alle 45
Ausführungen zu — das trägt die Transkription der Stücklisten.

**Offen:** J60 der heutigen Bauweise hat keine Zeichnung im Grundlagenordner,
seine Bleche fehlen. Die Staffelungen der **heutigen** Typen sind aus den
Stückzahlen *abgeleitet*, nicht abgelesen; massgebend ist die Mass-Tabelle der
Schemablatt mit der Mass-Tabelle. Nach der Prüfung `staffelung_geprueft` auf `true`
setzen. Bei der Altbauweise stammt die Staffelung aus den Stücklisten selbst und
ist gesetzt; die *exakte Bindeblechteilung* steht dagegen auf den Schemablättern
den Schemablättern — dort ist die Teilung nicht gleichmässig (erstes Blech 1500 mm
ab Jochende, dann gleiche Felder). Das Werkzeug teilt gleichmässig.

---

## Torsion

Das Joch ist ein geschlossener Kasten aus vier Vierendeel-Ebenen. Ein
Torsionsmoment läuft deshalb als umlaufender **Schubfluss** nach Bredt:

```
q_T = T / (2 · b · h)
Vertikalebene    V_T = q_T · h = T / (2b)
Horizontalebene  V_T = q_T · b = T / (2h)
```

Dieser Anteil wird in jeder Ebene mit der Querkraft aus Eigengewicht, Schnee und
Wind **überlagert** und trägt sich als lokale Biegung in die einzelnen Gurte ab.

Alternativ lässt sich die konservative Annahme rechnen, die ganze Torsion allein
den beiden Vertikalebenen zuzuweisen (`V_T = T/b`) — doppelt so gross, und die
Horizontalebenen bleiben unbeansprucht.

---

## Lasteinleitung der Anbauteile

Global sind die Lasten eines Anbauteils am Ersatzbalken erfasst. **Örtlich**
müssen sie über die Anschlusspunkte in den Querschnitt eintreten, und das
beansprucht die Bindebleche in der Umgebung des Teils zusätzlich.

Wie das Torsionsmoment `T_d` eines Teils eintritt, hängt davon ab, an wie vielen
Gurten es hängt:

| Befestigung | Kräftepaar | getragen von |
|---|---|---|
| durchgehend (4 Punkte) | `ΔF_y = T_d / h` in Gleisrichtung, zwischen Ober- und Untergurt | Horizontalebenen |
| oben oder unten (2 Punkte) | `ΔF_z = T_d / jbb` lotrecht, zwischen den beiden Winkeln derselben Gurtebene | Vertikalebenen |

Der schmalere Hebelarm ist der ungünstigere: bei `jbb < h` ist die einseitige
Befestigung die härtere Beanspruchung — und sie konzentriert sich zudem auf
einen einzigen Gurt. Eingeprägte Momente `M_yy` und `M_zz` treten über den
**Anschlussraster** ein: zwei Punkte im Abstand des Rasters bilden das nötige
Kräftepaar.

**Verteilung auf die Bleche.** Eine Kraft, die zwischen zwei Blechen eintritt,
verteilt sich nach dem Hebelarm auf beide, wie jede Lasteinleitung zwischen zwei
Knoten:

```
Anteil links  = (x_r − p) / (x_r − x_l)
Anteil rechts = (p − x_l) / (x_r − x_l)
```

Ausserhalb der äussersten Stationen fällt alles auf die Randstation; dort gibt
es kein Nachbarblech, das mittragen könnte.

Früher fiel die ganze Einleitung im Fenster ±a₁/2 auf **ein** Blech. Damit hing η
sprunghaft vom Anschlussraster ab: 5 cm mehr Raster liessen die Einleitung ins
Nachbarfeld kippen und η um über 25 % fallen. Mit der Aufteilung nach Hebelarm
beträgt der grösste Schritt über den Bereich 0.60–0.80 m rund 5 %; am Feldrand
liegt die Rechnung auf derselben Seite wie vorher.

Die Anteile werden zur Ebenenquerkraft **addiert, nicht gemittelt**: liegen beide
Einleitungsstellen am selben Blech, muss dieses das ganze Kräftepaar übertragen.
Je Ebene zählt nur die eine Richtung des Paars — die Gegenkraft wirkt am anderen
Gurt und beansprucht dessen Blech gleich stark. Der Anteil wird ausserdem dem
Schubfluss aus der globalen Torsion überlagert statt gegen ihn abgeglichen; das
ist bewusst konservativ.

---

## Überlagerung je Blechebene: Hüllkurve oder vorzeichenrichtig

Der Schubfluss aus Torsion **läuft um** den geschlossenen Kasten. Er addiert
sich auf der Ebene, zu der die Last exzentrisch sitzt, und zieht auf der
gegenüberliegenden ab:

```
V_H,unten = V_y/2 + q_T·b          V_H,oben  = V_y/2 − q_T·b
V_V,links = V_z/2 + q_T·h          V_V,rechts= V_z/2 − q_T·h
```

Die Option **Überlagerung je Blechebene** (Optionen → Torsion) hat zwei
Einstellungen:

| | |
|---|---|
| `Hüllkurve` (Vorgabe) | `max = \|V\|/2 + \|V_T\| + \|V_lokal\|` für **beide** Ebenen einer Richtung. Nie unsicher; Ober- und Unterblech bekommen zwangsläufig dasselbe η. |
| `vorzeichenrichtig` | `\|V/2 ± V_T\| + V_lokal` je Ebene. Ober- und Unterblech unterscheiden sich wie im FEM. |

**Das höchste η ändert sich nicht.** Auf der Ebene, wo Querkraft und Schubfluss
gleichsinnig laufen, ist `|V + T| = |V| + T` — genau die Hüllkurve.
Vorzeichenrichtig zu rechnen entlastet nur die andere Ebene.

Zwei Bedingungen: **beide** Anteile gehen mit Vorzeichen ein (Querkraft und
Torsion wechseln am Lastangriff gemeinsam das Vorzeichen — nimmt man nur eines,
springt die massgebende Ebene dort fälschlich auf die andere Seite), und der
Torsionsverlauf muss `verteilt` sein; die Hüllkurve summiert Beträge und hat
keinen Drehsinn mehr, dort fällt die Einstellung zurück.

Der **örtliche Anteil** aus der Lasteinleitung der Anbauteile bleibt in beiden
Wegen additiv auf beiden Ebenen.

Die Vorzeichen sind an einem PyNite-Stabmodell kalibriert, nicht hergeleitet —
Einzelheiten in [UEBERGABE.md](UEBERGABE.md).

---

## Ausleger: Wind über die Fahrleitung abtragen

Ein Ausleger ist kein Kragarm. Sein äusseres Ende hält die Fahrleitung, und die
ist durch den Leiterzug seitlich gespannt — sie wirkt dort als **Auflager**.
Der Wind auf den Ausleger verteilt sich damit auf zwei Auflager: die eine
Hälfte nimmt die Fahrleitung auf und trägt sie längs zu den
Nachbaraufhängungen ab, die andere geht in den Träger.

Der Schalter **«Fahrleitung als Auflager ansetzen»** in der Anbauteil-Karte
(Abschnitt *Lasteintrag des Auslegers*) setzt das um:

```
WindY der Aufbauten   ->  nur der eingestellte Anteil (Vorgabe 50 %)
Eintrag               ->  in y auf die Achse des Trägers
Höhe z                ->  UNVERÄNDERT, der Hebelarm bleibt
```

Unangetastet bleiben Eigengewicht, Schnee, Wind in x — und die **Drahtwerke**:
deren Windlast ist über `L_FL` bereits der Anteil, der an dieser Aufhängung
ankommt.

J90 über 20 m mit einer Hängestütze mit NT-Ausleger in Jochmitte: `T_x`
2.033 → 1.430 kNm, η 0.821 → 0.648.

> Der Anteil ist eine **zulässige Modellannahme**, kein gerechneter Wert. Er
> ist von Hand zu setzen und standardmässig aus.

---

## Steifer Knotenbereich: Anschnitt statt Achse

Am Knoten überlappt das Bindeblech den Gurtwinkel und ist mit ihm verschweisst;
über die Überlappung wirkt die Verbindung biegesteif. Nachgewiesen wird deshalb
nicht das Moment auf der Knoten- bzw. Schwerachse, sondern das am **Anschnitt**,
am Rand des steifen Bereichs. Das gilt für beide Stäbe des Rahmens — Blech und
Gurt werden damit symmetrisch behandelt.

**Gurt.** Der Momentenverlauf im Gurt ist linear mit Nullpunkt in Feldmitte:

```
M_Knoten    = (V_Ebene / 2) · a₁/2
M_Anschnitt = M_Knoten · (a₁ − b_Bl) / a₁
```

`b_Bl` ist die Blechbreite entlang der Jochachse, je Richtung die der eigenen
Ebene: `M_y` aus den Vertikalebenen, `M_z` aus den Horizontalebenen. Beim J90
sind das rund **−14 %** gegenüber dem Moment auf der Knotenachse.

**Bindeblech.** Zwischen den beiden steifen Enden liegt die lichte Blechlänge
`L_c` (Mass der Stückliste); `h` ist der Hebelarm der Ebene, also die Jochhöhe in
den Vertikal- und die Jochbreite in den Horizontalebenen:

```
M_K = M_R + V·(h − L_c)/2   und   V = 2·M_R / L_c
=>  M_R = M_K · L_c / h
```

Die Querkraft bleibt unverändert, abgemindert wird nur das Moment. Fehlt die
Längenangabe — bei von Hand eingegebenen Blechen — wird nicht abgemindert.

**Welche Feldweite zählt.** Die Mass-Tabelle der Zeichnung teilt **ungleich**:
beim J70 über 10 m sind die äusseren Felder 0.75 m breit, die inneren
0.66–0.67 m. Gerechnet wird deshalb mit den **örtlichen** Weiten, nicht mit
ihrem Mittel:

```
Blech (nimmt beide Nachbarfelder auf)   M_K = V_Ebene · (a_links + a_rechts)/4
Gurt  (massgebend das breitere Feld)    M_Knoten = (V_Ebene/2) · a_max/2
```

Am Jochende grenzt nur ein Feld an; dort zählt dieses allein. Bei gleich
breiten Feldern ergibt sich genau die frühere Form `n · V · a₁/4`. Mit der
mittleren Feldweite gerechnet fiel das Blechmoment an den breiten Feldern
rund 6 % zu klein aus — auf der unsicheren Seite. Betroffen sind die kurzen
Längen (10 m: +5.9 %, 16 m: +3.4 %); ab etwa 24 m teilt die Tabelle
gleichmässig und es ändert sich nichts.

---

## Nachweisschnitt

Über `x_N` lässt sich ein Schnitt an beliebiger Stelle setzen. Er wird in den
Zeichnungen markiert, und die Auswertung zeigt getrennt:

* für jeden der **vier Eckwinkel** die Normalkraft aus `M_y` und aus `M_z`,
  Zug oder Druck, die drei Spannungsanteile und η
* für jede der **vier Blechebenen** das dort tatsächlich vorhandene Blech mit
  Positionsnummer, Abmessung, Ebenenquerkraft, σ, τ und η

---

## Oberfläche

**Drei Bereiche**: Eingabe links, Modell in der Mitte, Auswertung rechts. Die
Trennstege lassen sich ziehen; ein Klick klappt die Schublade auf eine schmale
**Schiene** zusammen, in der die Reiter als Symbole stehen bleiben. Ein Klick auf
ein Symbol fährt die Schublade wieder aus, und zwar auf genau diesen Reiter.

In der rechten Schiene stehen die **Hauptnachweise**: η gesamt und die drei
Einzelnachweise (Obergurt, Untergurt, Bindeblech) mit Ampelfarbe. Wer das
Modell breit macht, rechnet damit nicht im Blindflug.

**Bannerschublade** (Klick auf den Projektnamen): Projekte und gespeicherte
Joche, dazu **Vorlagen ganzer Tragwerke**. Mehrere Joche unter demselben
Projektnamen erscheinen als eine Gruppe. **Umbenennen geht nachträglich** — je
Eintrag über den Stift (Bezeichnung, Projekt, Bemerkung; die Eingabewerte
bleiben unangetastet), und je Projektgruppe über den Stift in der Kopfzeile,
der alle Einträge auf einmal umhängt. So lassen sich verstreute Joche
nachträglich zu einem Projekt zusammenfassen. Eine Vorlage bringt Typ, Profile,
Auflager, Trasse, Anbauteile, Einwirkungen und Lastfälle mit — die **Jochlänge
nicht**, sonst würde das Anwenden das Bauteil umbauen. Ein gespeichertes Joch
wird *geladen* und ersetzt den Stand; eine Vorlage wird *angewendet* und legt
sich darauf.

**Sich im Modell bewegen.** Maus, Trackpad, Finger und Tastatur führen
dieselben vier Bewegungen aus:

| | drehen | schieben | zoomen | heranholen |
|---|---|---|---|---|
| **Maus** | linke Taste | rechte oder mittlere Taste, Alt + links | Rad | Doppelklick |
| **Trackpad** | ziehen | zwei Finger wischen | kneifen | Doppeltipp |
| **Finger** | ein Finger | zwei Finger wischen | zwei Finger kneifen | Doppeltipp |
| **Tastatur** | Pfeile | Umschalt + Pfeile | `+` / `−` | `0` = ganzes Joch |

Das Modell **folgt dabei der Hand**: wer die zugewandte Seite nach rechts
zieht, sieht sie nach rechts wandern — wie beim Drehen eines Werkstücks, das
man in der Hand hält. Auf beiden Achsen gleich.

Zwei Feinheiten, die man nicht sieht, aber merkt:

* **Gedreht wird um die Bildmitte, gezoomt auf den Zeiger.** Um die Mitte zu
  drehen ist die einzige Möglichkeit, die zu einer achszentrierten Projektion
  passt — und die vernünftige dazu: man dreht um das, was man ansieht. Beim
  Zoomen wäre dieselbe Regel eine Plage, denn dann käme einem die Mitte
  entgegen statt der Ecke, die man ansehen wollte. Der Punkt unter dem Zeiger
  bleibt deshalb stehen.
* **Umschalt rastet das Drehen** auf 15°-Schritte — für eine saubere
  Seitenansicht, ohne den Knopf dafür zu suchen.

Ein **Doppelklick auf ein Bauteil** holt es in die Bildmitte und macht es damit
zum Drehpunkt. Ein einfacher Klick wählt aus: eine Station im Joch oder ein
Anbauteil, dessen Karte sich dann öffnet.

**Werkzeuge der Modellansicht**, nach Art geordnet und offen sichtbar:

| Gruppe | Inhalt |
|---|---|
| Blick | Isometrie, Längs, Quer, Draufsicht |
| Modell | Gurtprofile, Bindebleche, **Anbauteile**, Schwerachsen, Auflager, Bemassung, Bodenraster |
| Lasten | Lasten überhaupt · Ständige · Leiterzugkräfte · Wind x · Wind y · Schnee |
| Resultate | Schnittkräfte, Schnittebene, aufgetragene Grösse (η, σ_v, σ, M, V, Positionen, Bauteile) |

**Der Nachweisschnitt hat drei Orientierungen**, und sie zeigen Verschiedenes:

| | was sie freilegt | wie das Modell dazu steht |
|---|---|---|
| **quer** | den Querschnitt an der Nachweisstelle | herangefahren, auf drei Felder aufgetrennt |
| **vertikal** | die stehenden Bindebleche über die ganze Länge | ganzes Joch, von der Seite |
| **horizontal** | die liegenden Bindebleche des Obergurts | ganzes Joch, von oben |

Die beiden Längsschnitte ändern die **Rechnung nicht**. Sie beschriften jedes
Blech ihrer Ebene mit σ_v und η, damit sich die Werte über die Spannweite
nebeneinander lesen lassen — deshalb steht dort das ganze Joch im Bild und
nicht ein Ausschnitt.

Die **Lastarten** sind nicht dasselbe wie die Einwirkungsgruppen der Rechnung:
die Umlenkkraft läuft rechnerisch in der Gruppe `G`, ist beim Betrachten aber
etwas anderes als ein Eigengewicht und steht deshalb als eigene Art da. Jede
Art hat ihre Farbe, sodass im Bild ablesbar ist, woher eine Kraft kommt.

Jede der drei Gruppen **Modell / Lasten / Resultate** hat in ihrer Kopfzeile
einen **Hauptschalter**. Ausgeschaltet verschwindet die ganze Gruppe aus dem
Bild — bei *Lasten* also auch die Wind- und Schneeflächen, nicht nur die
Pfeile —, ihre Einzelschalter bleiben aber ausgegraut stehen: man sieht, dass
sie da sind und gerade nicht gelten, statt sie zu suchen. Umgekehrt behält der
Einzelschalter das letzte Wort: was er ausschaltet, bleibt aus, auch wenn die
Gruppe an ist.

**Die Anbauteile stehen bei den Bauteilen, nicht bei den Lasten.** Ständer,
Ausleger und Traverse sind Tragwerk — der Weg, auf dem die Last ans Joch
kommt. Wer die Lasten abstellt, um das Joch zu betrachten, behält sie deshalb.
Was zur Last gehört — der Würfel am Angriffspunkt, die Kraftpfeile, die Wind-
und Schneeflächen — geht mit den Lasten.

**Die Layersteuerung folgt dem Lastfall.** Ein Lastfall, dessen Beiwert für eine
Einwirkung 0 ist, zeigt von dieser Einwirkung nichts. Einen Schalter anbieten zu
können, der nichts erscheinen lässt, ist eine Falle: der Schalter wird deshalb
ausgegraut und unklickbar, und sein Titel sagt, warum („im gewählten Lastfall
nicht vorhanden"). Bei der **Umhüllenden** ist alles bedienbar, denn dort laufen
alle Lastfälle mit. Weil Umlenkkraft und Eigengewicht beide in der Gruppe `G`
laufen, hängen ihre beiden Schalter am selben Beiwert.

---

## Modellgrenzen

> Die vollständige Fassung steht im **Handbuch** in der Anwendung selbst
> (Knopf `ⓘ` im Banner, Datei `js/doku.handbuch.js`). Es lässt sich dort als
> **eigenständige HTML-Datei** sichern — mit Verzeichnis, allen zehn Skizzen
> und eingebettetem Stylesheet, also als Beilage zur Statik ohne die Anwendung. Dort ist der ganze
> Rechenweg hergeleitet – Einwirkungen, Ersatzbalken, Schubfluss nach Bredt,
> Vierendeel-Wirkung, Lasteinleitung, Nachweise – und Abschnitt 10 zählt auf,
> was das Werkzeug nicht rechnet und in welche Richtung jede Vereinfachung
> wirkt. Die Liste hier nennt die Punkte, die zusätzlich am Code hängen.

* Das Joch ist im Grundriss **geknickt** (Masse `jk` / `jkk` der Zeichnung);
  gerechnet wird mit konstanter Breite. Das gilt auch für die Altbauweise, deren
  Grundriss sich im Auflagerbereich auf 280 mm lichte Breite verengt.
* Bei der Altbauweise ist die **Bindeblechteilung** gleichmässig angesetzt. Die
  Schemablätter setzen das erste Blech auf 1500 mm ab Jochende und teilen erst
  den Rest gleichmässig; die Blechreihenfolge stimmt, die Stationen weichen um
  einige Zentimeter ab.
* Am verjüngten Ende wird der Hebelarm bei der Endbauhöhe abgefangen. Bei
  **eingespannten Enden** ist der Endbereich gesondert zu betrachten: dort steht
  einem Stützmoment nur noch der kleine Hebelarm gegenüber, und der Querschnitt
  wirkt nicht mehr als Vierendeelträger.
* Torsion wahlweise als konstante Hüllkurve (konservativ, Voreinstellung) oder
  mit Auflagerverteilung. Gabellagerung vorausgesetzt.
* Die lokale Vierendeel-Biegung wird hälftig auf die beiden Gurte einer Ebene
  verteilt (Annahme gleicher Rahmensteifigkeit), auch bei ungleichen Profilen.
* Die C5-Bedingungen für Bindebleche stammen aus der Theorie des gegliederten
  **Druckstabs**. Die realen Bleche des Sortiments unterschreiten die dortigen Mindestbreiten
  deutlich — beim J90 sind es 80–100 mm statt der geforderten ~225 mm. Das
  Werkzeug weist die Bedingungen aus, ihre Anwendbarkeit auf einen Biegeträger,
  der an Ober- und Untergurt gehalten wird, ist im Einzelfall zu beurteilen.
* Bei ungleichschenkligen Winkeln beziehen sich die Widerstandsmomente auf die
  schenkelparallelen Achsen, nicht auf die Hauptachsen.
* Querschnittsklasse 4 wird gemeldet, aber weiterhin mit dem Bruttoquerschnitt
  gerechnet – das liegt auf der unsicheren Seite.
* **Die Profil- und Mastwerte sind Nennwerte nach EN 10056-1 bzw. EN 10365.
  Vor der Abgabe gegen die eigene SZS C5 Ausgabe verifizieren.**

---

## AxisVM-Export (SAF)

Zur Verifizierung durch ein geprüftes Programm schreibt das Werkzeug das
Stabmodell als **SAF-Mappe** (Structural Analysis Format) — ein offenes,
Excel-basiertes Format, das AxisVM importieren kann. Kein COM, kein Windows,
keine Fremdbibliothek: geschrieben wird mit demselben XLSX-Schreiber wie der
Bericht (`js/export.axisvm.js`).

**Was in der Mappe steht**

| Blatt | Inhalt |
|---|---|
| `Anleitung` | Einlesen, Achsen, was beim Import zu prüfen bleibt |
| `StructuralMaterial`, `StructuralCrossSection` | Stahl, Gurtwinkel als `Angle`, Bleche als `Rectangle` |
| `StructuralPointConnection`, `StructuralCurveMember` | Knoten und Stäbe |
| `StructuralPointSupport` | Gabellagerung mit Drehfeder |
| `StructuralLoadGroup`, `StructuralLoadCase` | vier Gruppen `G`, `WindX`, `WindY`, `Schnee` |
| `StructuralCurveAction`, `StructuralPointAction`, `StructuralPointMoment` | Lasten |
| `Vergleich` | je Station und Gruppe `M_y`, `V_z`, `M_z`, `V_y`, `T_x` dieses Werkzeugs, daneben leere Spalten für die AxisVM-Werte |

**Wie das Modell gebaut ist.** Vier Gurte als durchlaufende Stabzüge, an jeder
Station die vier Bindebleche als Stäbe, an beiden Enden ein steifes Schott zu
einem Punkt auf der Jochachse — dort hängt das Auflager, damit die
Gabellagerung im Modell steht.

Das Schott ist ein **tragendes Bauteil** und bleibt immer im Modell. Es steift
den Endbereich aus und zieht Querkraft und Torsion im Randfeld an sich — dort
weicht das Stabmodell bis +34 % vom Ersatzbalken ab, der davon nichts weiss.
Damit sich das beim Vergleich auseinanderhalten lässt, können seine Stäbe aus
den **Resultattabellen** ausgeblendet werden; sie tragen weiter mit. Die **Anbauteile** sind steife Arme, die Last
greift am wirklichen Angriffspunkt an. Damit entsteht das Kräftepaar der
Lasteinleitung im Modell von selbst, statt wie im Rechenkern von Hand angesetzt
zu werden — genau die Stelle, an der die beiden Rechnungen auseinanderlaufen
können.

Achsen: **X** Jochachse (0 … L), **Y** Gleisrichtung, **Z** lotrecht nach oben.
Im Rechenkern zeigt `F_z` nach unten; beim Schreiben wird gedreht.

**Lasten je Gruppe getrennt und charakteristisch.** Kombiniert wird in AxisVM.
Nur so lässt sich hinterher sagen, welcher Anteil woher kommt — und nur so ist
die Vorzeichenfrage (Wind je `+` und `−`) dort zu stellen, wo sie hingehört.

**Das Knotenmodell wird gefragt, nicht angenommen.** Es entscheidet über die
Momente und damit über den ganzen Vergleich:

| Wahl | Modell |
|---|---|
| `anschnitt` | der steife, verschweisste Knotenbereich als kurzer Stab mit steifem Querschnitt — im Gurt über die Blechbreite `b_Bl`, im Blech über `(h − L_c)/2` je Ende. Entspricht dem Nachweis dieses Werkzeugs. |
| `schwerachsen` | Stäbe von Schwerachse zu Schwerachse, keine steifen Bereiche. Entspricht dem, was AxisVM ohne Zutun rechnet. |

Für einen Vergleich sind **beide** zu rechnen: erst ihre Differenz trennt die
Frage des Knotenmodells von der Frage des Rechenwegs.

**Was beim Import zu prüfen bleibt** (steht auch im Blatt `Anleitung`): die
Ausrundungsradien der Winkel sind mit 0 angesetzt, weil die Profiltabellen sie
nicht führen — die Fläche fällt dadurch rund 2 % kleiner aus. Die Stäbe `STARR`
und `ARM` sind steife Rechtecke, keine echten Starrelemente; ihr Eigengewicht
ist abzuschalten. Das Eigengewicht des Jochs steckt als Streckenlast im
Lastfall `G` und darf nicht zusätzlich erzeugt werden.

---

## COM-Brücke zu AxisVM

Der dritte Weg neben SAF und DXF: AxisVM baut das Modell über seine
**COM-Schnittstelle** selbst auf. Ein Browser kann COM nicht bedienen — eine
Seite hat keinen Zugriff darauf. Der Weg läuft deshalb über eine örtliche
Brücke:

```
Tragjoch-App          →  Modell als JSON  →  PowerShell  →  AxisVM (COM)
(Ausleiten → JSON)                           baut ein NEUES Modell auf
```

PowerShell statt Python: auf jedem Windows vorhanden, kann COM von Haus aus,
braucht keine Installation.

Der Ausleitungsdialog kennt dafür das Format **«JSON für die COM-Brücke»**
(`format: "tragjoch-stabmodell"`, `version: 1`) — dasselbe Stabmodell wie SAF
und DXF, nur in einer Form, die ein Skript ohne Tabellenkalkulation liest.

Der Ablauf steht in [com/LIESMICH.md](com/LIESMICH.md). Erster Schritt ist
einmalig: `com/AxisVM_pruefen.cmd` liest aus, was die installierte
AxisVM-Fassung an COM-Objekten und Methoden anbietet — diese Namen verschieben
sich zwischen den Fassungen, und ein blind geschriebenes Skript scheitert erst
mitten im Modellaufbau.

---

## PyNite-Gegenrechnung

Das SAF-Interface von AxisVM ist ein **kostenpflichtiges Modul**; fehlt es,
meldet der Import „SAF-Interface ist in dieser Konfiguration nicht enthalten".
Für AxisVM bleibt dann der DXF-Weg mit Handarbeit. Unabhängig davon schreibt
das Werkzeug ein **lauffähiges Python-Skript** für
[PyNite](https://github.com/jwock82/pynite), ein freies 3D-Stabwerksprogramm
(`js/export.pynite.js`):

```bash
pip install PyNiteFEA
```
```bash
python3 PyNite_J70_L10.0m_anschnitt.py
```

Es baut dasselbe Stabmodell, rechnet alle Einwirkungsgruppen einzeln und
schreibt zwei Tabellen: `pynite_staebe.csv` mit den zwölf Endkräften je Stab
und `pynite_stationen.csv` mit den **resultierenden Schnittgrössen je Feld**.

**Geschnitten wird in Feldmitte, nicht am Knoten** — dort hat das lokale
Vierendeel-Moment des Gurtes seinen Nullpunkt, und die Summe über die vier
Gurte ist das reine Querschnittsmoment. Aus demselben Grund legt auch die
Auswertung im Werkzeug ihren Nachweisschnitt immer mittig zwischen zwei Bleche.

**Achsen.** PyNite rechnet mit Y nach oben; die Koordinaten werden beim
Schreiben getauscht (unser Z → PyNite Y, unser Y → PyNite Z), die Ausgabe dreht
zurück. Die Trägheitsmomente folgen den lokalen Stabachsen: beim Gurt ist unser
`I_y` PyNites `Iz`, beim Vertikalblech liegt die starke Achse auf `Iz`, beim
Horizontalblech auf `Iy`.

**Stand des Abgleichs** (J70, 10 m, zwei Anbauteile, Knotenmodell
`schwerachsen`, fünf Feldschnitte, charakteristisch je Gruppe):

| Grösse | Abweichung PyNite ↔ Werkzeug |
|---|---|
| `M_y`, `M_z` | **≤ 0.1 %** |
| `V_z`, `V_y` | **≤ 0.6 %** |
| `T_x` | +2.8 % vor, −5.1 % hinter dem Anbauteil |

Die Summe beider Torsionsanteile trifft das eingeleitete Moment genau
(0.7155 + 0.3557 = 1.071 kNm); die Aufteilung auf die Auflager weicht leicht
von der Balkenlösung ab. Biegung und Querkraft des Ersatzbalkens sind damit
unabhängig bestätigt.

> **PyNite ist kein geprüftes Programm.** Es beantwortet die Fachfragen —
> Knotenmodell, Torsionsverteilung, Lasteinleitung —, ersetzt aber die
> Verifizierung durch AxisVM für die Abgabe nicht.

---

## Datenpaket: Anwendung und Daten trennen

Die Oberfläche und der Rechenkern sind allgemein; die Zahlen darin — das
**Sortiment der Jochtypen**, die **Anbauteil-Vorlagen** und die **Lasttabelle**
der Fahrleitungsbauteile — stammen aus den Unterlagen des Betreibers. Beides
lässt sich trennen:

```bash
python3 build_html.py --ohne-daten
```

erzeugt `vierendeel_tool_ohne_daten.html` (671 kB statt 842 kB) mit **leeren**
Datenblöcken. Diese Ausgabe enthält keine Zahlen des Betreibers und kann
weitergegeben oder öffentlich abgelegt werden.

Beim Start fragt sie nach einem **Datenpaket** — einer JSON-Datei mit allen
drei Datenbanken:

```json
{ "format": "tragjoch-daten", "version": 1, "stand": "2026-08-20",
  "tragjoche": { … }, "anbauteile": { … }, "fl_bauteile": { … } }
```

Fehlt ein Teil, bleibt der bisherige stehen — so lässt sich auch nur das
Sortiment austauschen. Das Paket wird **allein im Browser** hinterlegt
(`localStorage`) und ist beim nächsten Start wieder da; es verlässt den Rechner
nicht. Über den Knopf **Datenbasis** im Banner lässt es sich laden, sichern und
wieder löschen; `paketAus()` schreibt aus den geladenen Datenbanken ein neues.

Die Anwendung selbst nennt **keine Betreiber, Zeichnungs- oder
Regelwerksnummern** — die stehen in den Daten, nicht im Code. Der Fallback auf
`data/*.json` bleibt bestehen: liegt der Ordner neben der Datei, wird von dort
geladen.

---

## Installierbar und ohne Netz (PWA)

Die Modulversion (`index.html`) ist eine **installierbare Anwendung**: einmal
aufgerufen, legt der Browser sie ab und startet sie danach auch **ohne
Verbindung** — im Zug, im Tunnel, auf der Baustelle.

Drei Dateien tragen das:

| Datei | Zweck |
|---|---|
| `manifest.webmanifest` | Name, Farben, Symbole, Startadresse, Sprungliste, Dateiannahme |
| `sw.js` | Dienstarbeiter: legt die Anwendung ab und liefert sie offline aus |
| `js/pwa.js` | Anmeldung, Installationsknopf, Fassungsmeldung, Dateiannahme, Netzzustand |

**Installieren.** Sobald der Browser es anbietet, erscheint im Werkzeugkasten
oben rechts ein Knopf «Auf diesem Gerät installieren». Danach läuft das
Werkzeug in einem eigenen Fenster ohne Adressleiste; die Fusszeile schreibt
dann `· installiert`. Auf iOS gibt es keinen Knopf — dort geht es über
*Teilen → Zum Home-Bildschirm*.

**Was abgelegt wird.** Alles, was zum Starten nötig ist: `index.html`, das
Stylesheet, sämtliche Module aus `js/` und die Symbole — beim Schreiben dieser
Zeilen 43 Dateien. Die drei `data/*.json` stehen bewusst **nicht** in der
Liste: sie sind keine Startvoraussetzung, denn die Datenbasis kann auch als
Datenpaket im Browser hinterlegt sein. Liegen sie doch daneben, nimmt der
Dienstarbeiter sie beim ersten Gebrauch von selbst auf. Die Liste erzeugt `build_html.py`
selbst und trägt sie zusammen mit einem Kurzabdruck über den Inhalt in `sw.js`
ein. Deshalb gilt: **nach jeder Änderung `python3 build_html.py` laufen
lassen**, sonst liefert der Dienstarbeiter den alten Stand aus.

**Dateien öffnen.** Eine Ablage- oder Datenpaketdatei lässt sich **auf das
Fenster ziehen** — das geht auch im Reiter, ohne Installation. Die installierte
Fassung steht zusätzlich im *Öffnen mit* des Dateimanagers; der Browser fragt
bei der Installation, ob sie `.json`-Dateien annehmen darf, und zur
Standard-Anwendung dafür wird sie nie von selbst.

Erkannt wird die Datei an ihrem Kopf, und **gefragt wird immer**: eine Ablage
einzulesen legt Einträge an, ein Datenpaket tauscht die ganze Datenbasis.

| Kennung | was geschieht |
|---|---|
| `format: tragjoch-daten` | Datenpaket laden, mit Anzahl je Teil und Stand |
| `art: tragjoch-ablage` | Ablage einlesen, mit Anzahl Tragwerke und Vorlagen |
| `format: tragjoch-stabmodell` | Hinweis, dass diese Datei hinaus- und nicht hereinführt |

**Sprungliste.** Ein Rechtsklick auf das Programmsymbol führt unmittelbar zu
*Neues Tragjoch*, *Projektablage* oder *Handbuch*.

**Ohne Netz.** Die Fusszeile schreibt `· ohne Netz`, sobald die Verbindung
fehlt. Gerechnet wird unverändert weiter — das geschieht ohnehin vollständig
im Browser —, aber eine neue Fassung kommt dann eben nicht.

**Neue Fassung.** Eine geänderte Fassung wird nicht unter der Hand
eingewechselt — ein Rechenstand darf sich nicht mitten in einer Eingabe
ändern. Stattdessen erscheint unten rechts ein schmaler Balken «Eine neue
Fassung ist bereit» mit *Neu laden* / *Später*. Erst der Druck darauf tauscht
aus und lädt neu; die alte Ablage wird dabei gelöscht.

**Beim Entwickeln ist er aus.** Auf `localhost` meldet sich der Dienstarbeiter
**nicht** an, sondern **ab** — eine Ablage, die beim Arbeiten alte Module
ausliefert, wäre nur eine Fehlerquelle. Zum Ausprobieren:

```bash
python3 serve.py
```

und dann `http://localhost:8731/index.html?sw=1` zum Anmelden,
`?sw=0` zum Abmelden und Leeren.

**Die Einzeldatei bleibt aussen vor.** `vierendeel_tool.html` liegt meist auf
`file://` und hat keine Nachbardateien; `build_html.py` entfernt die
Manifest-Zeile, und `js/pwa.js` erkennt daran, dass es still zu bleiben hat.

**Auf GitHub Pages.** Die Datei muss `index.html` heissen — Pages liefert unter
einer Adresse ohne Dateinamen genau diese aus. Der Ordner wird also so
abgelegt, wie er ist (`index.html`, `css/`, `js/`, `data/`, `icons/`,
`manifest.webmanifest`, `sw.js`); `start_url` und `scope` im Manifest sind
relativ und funktionieren deshalb auch unter einem Unterpfad wie
`benutzer.github.io/tragjoch/`. Ohne HTTPS oder localhost gibt es keinen
Dienstarbeiter — Pages liefert HTTPS, das passt.

**Symbole.** `python3 make_icons.py` erzeugt `icons/` neu (PNG in fünf Grössen
und ein SVG). Die Form steht als Zeichenvorschrift im Skript, nicht als
Bilddatei — sonst laufen die Fassungen auseinander.

---

## Dateien

```
vierendeel_tool.html              eigenständiges Werkzeug (gebündelt, Doppelklick)
index.html                        Modulversion für die Entwicklung (braucht Server)
Vierendeel_L_Profil_SZS_C5.xlsx   prüffähige Mappe mit lebenden Formeln

generate_vierendeel_L_SZS_C5.py   erzeugt die Excel-Mappe
build_html.py                     bündelt js/ + css/ zu vierendeel_tool.html
                                  und schreibt Dateiliste + Fassung in sw.js
make_icons.py                     erzeugt icons/ (PNG und SVG) aus einer Vorschrift
serve.py                          lokaler Server für die Modulversion
com/AxisVM_pruefen.ps1            liest die COM-Schnittstelle von AxisVM aus
com/AxisVM_pruefen.cmd            startet das Skript per Doppelklick
com/LIESMICH.md                   Ablauf der COM-Brücke in drei Schritten

manifest.webmanifest              Name, Farben, Symbole der installierbaren Fassung
sw.js                             Dienstarbeiter: Ablage und Auslieferung ohne Netz
icons/                            Symbole für Reiter, Home-Bildschirm und Fenster
validate_xlsx.py                  prüft alle Excel-Formeln auf #NAME?-Fehler
vergleich_excel_js.py             rechnet Excel und JS durch und vergleicht

pruefung.mjs                      Prüfstand: node pruefung.mjs
UEBERGABE.md                      Stand der Arbeit und offene Punkte

data/tragjoche.json               TYPENDATENBANK – hier pflegen, ohne Code
data/anbauteile.json              Vorlagen für Anbauteile
data/fl_bauteile.json             Lasttabelle der Fahrleitungsbauteile

js/
  data.profiles.js       Winkelprofile, Stahlgüten          reine Daten
  data.tragjoche.js      Sortiment J60–J130                 reine Daten
  data.masten.js         HEB/HEM-Profile                    reine Daten
  data.anbauteile.js     Zugriff auf die Anbauteil-Vorlagen  reine Daten
  data.fl.js             Zugriff auf die FL-Lasttabelle      reine Daten
  data.paket.js          Datenpaket laden, sichern, hinterlegen
  pwa.js                 Dienstarbeiter, Installation, Dateiannahme, Netzzustand
  render.skizzen.js      Kraftbilder zu den Kurven der Verläufe
  core.constants.js      normative Grenzwerte, Einheiten
  core.lasten.js         Herkunft und Kategorien der Einwirkungen
  core.statics.js        Ersatzbalken: Schnittgrössen
  core.auflager.js       Drehfedern, Drehwinkelverfahren, Mast
  core.trasse.js         Umlenkkräfte aus dem Bogen
  core.anbauteile.js     Anbauteile in Lasten umrechnen, örtliche Einleitung
  core.querschnitt.js    Aufteilung auf Eckwinkel und Blechebenen
  core.vierendeel.js     Modellaufbau, Gurt- und Bindeblechnachweis
  core.checks.js         C5-Bedingungen
  core.klassen.js        Querschnittsklassifizierung
  geometry.js            Querschnitts- und Längsgeometrie    kein SVG
  render.svg.js          Zeichnungen                         nur Abbildung
  render.charts.js       Diagramme
  render.3d.js           Modellansicht auf Canvas 2D, ohne Fremdbibliothek
  export.xlsx.js         minimaler XLSX-Schreiber (ohne Bibliothek)
  export.bericht.js      stellt die Exportblätter zusammen
  export.axisvm.js       AxisVM-Ausleitung: SAF-Mappe und DXF
  export.pynite.js       PyNite-Gegenrechnung als Python-Skript
  doku.handbuch.js       Handbuch: Herleitung und Modellgrenzen  nur Text
  design.js              Farben, Abstände, Typografie, Icons, Bausteine
  store.js               Projektablage (IndexedDB), JSON aus und ein
  ui.schema.js           deklaratives Eingabeschema
  ui.js                  DOM-Schicht
  app.js                 Verdrahtung
css/style.css            Farben und Layout, hell und dunkel
```

Der **Rechenkern** (`core.*.js`) besteht aus reinen Funktionen: kein DOM, keine
globalen Variablen, keine Zahlenliterale ausser den benannten Konstanten in
`core.constants.js`. Er lässt sich unverändert in Node testen.

Die Eingabemaske, der Excel-Export und die Standardwerte werden **alle** aus
`ui.schema.js` erzeugt. Ein neues Eingabefeld wird dort ergänzt – sonst nirgends.

---

## Ablage und Weitergabe

Die Ablage ist **öffentlich** und deshalb **ohne die drei Datenbanken**
eingerichtet (`data/*.json` steht in der `.gitignore`); sie nennt weder
Betreiber noch Zeichnungs- oder Regelwerksnummern. Die Zahlen werden von Hand
örtlich eingespielt: beim ersten Start fragt die Anwendung nach einem
Datenpaket, hinterlegt es im Browser und findet es beim nächsten Mal wieder.

> Soll doch alles beisammen liegen, die Zeile `data/*.json` aus der
> `.gitignore` nehmen — dann aber eine **private** Ablage verwenden.

`build_html.py` verträgt fehlende Datenbanken: es baut dann von selbst die
datenfreie Ausgabe. `pruefung.mjs` dagegen **braucht** sie — ohne die drei
JSON-Dateien laufen die Kontrollen nicht.

Weitergegeben wird nicht die Ablage, sondern drei Dateien:

| Datei | erzeugt durch |
|---|---|
| `vierendeel_tool_ohne_daten.html` | `python3 build_html.py --ohne-daten` |
| `Tragjoch_Datenpaket_*.json` | Knopf **Datenbasis → sichern** in der Anwendung |
| `Tragjoch_Handbuch.html` | Knopf **ⓘ → Als Datei sichern** |

---

## Arbeiten am Code

```bash
python3 build_html.py
```

Bündelt die Module zu `vierendeel_tool.html`. Nach jeder Änderung in `js/` oder
`css/` nötig, damit die eigenständige Datei aktuell ist.

Der Build schickt das fertige Skript vor dem Schreiben durch `node --check` und
**bricht ab**, wenn es nicht lauffähig ist. Das ist kein Luxus: das Bundle
verträgt weniger als die Modulversion — `import { A as b }` etwa wird zu einer
Destrukturierung und muss dabei zu `A: b` werden. Ohne die Prüfung zeigte sich
so ein Fehler erst als tote Seite in der ausgelieferten Datei.

```bash
python3 serve.py
```

Startet einen lokalen Server auf `http://localhost:8731/index.html`. Nötig, weil
Browser ES-Module über `file://` nicht laden. Zum Entwickeln bequemer, weil kein
Build-Schritt dazwischen liegt.
Der Port kommt aus der Umgebungsvariablen `PORT`, sonst aus dem Aufruf.

```bash
node pruefung.mjs
```

Prüfstand über den Rechenkern: 1207 Kontrollen, ohne Browser und ohne Bündeln.
Nach jedem Eingriff in `core.*.js` laufen lassen.

```bash
python3 generate_vierendeel_L_SZS_C5.py
python3 validate_xlsx.py
python3 vergleich_excel_js.py
```

Excel-Mappe erzeugen, Formeln auf nicht auflösbare Bezeichner prüfen und beide
Implementierungen gegeneinander halten. Der Vergleich braucht `node` und

```bash
pip3 install openpyxl formulas
```

## Modell nach AxisVM

Drei Wege, einer davon ohne Zusatzlizenz:

| Weg | was ankommt | Haken |
|---|---|---|
| SAF (Excel) | alles | der Import ist bei AxisVM ein kostenpflichtiges Modul |
| DXF | nur die Geometrie | keine Querschnitte, keine Auflager, keine Lasten |
| **COM** | alles | braucht Windows und AxisVM auf demselben Rechner |

Für COM: `Ausleiten → JSON für die COM-Brücke`, die Datei neben
`com/AxisVM_aufbauen.cmd` legen, doppelklicken. Einzelheiten in
`com/LIESMICH.md`.

## Abgleich gegen ein FEM-Modell

Zwei Werkzeuge, beide ohne Projektzahlen:

```bash
node vergleich_werkzeug.mjs <ablage.json> vergleich_werkzeug.json
python3 vergleich_axisvm.py <export.xlsx> vergleich_werkzeug.json
```

`vergleich_werkzeug.mjs` rechnet einen gespeicherten Eingabestand je
**charakteristischem Einzellastfall** durch und schreibt Spannung je
Gurtwinkel und Moment je Bindeblechebene, Station für Station.

`vergleich_axisvm.py` liest die AxisVM-Ausgabe (Blätter `Knoten`, `Stäbe` und
je Lastfall `vm <Name>`) und stellt beides gegenüber. Die Zuordnung der Stäbe,
der Versatz der Koordinatensysteme und die Zuordnung der Lastfälle folgen aus
der Geometrie bzw. den Namen — nichts davon ist einzugeben, und wo geraten
wird, steht es im Kopf der Ausgabe.

`--stationen` zeigt jede Station einzeln statt nur der Zusammenfassung,
`--lastfall "vm snow=sk"` setzt eine Zuordnung von Hand.
