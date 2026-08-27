# COM-Brücke zu AxisVM

Ein Browser kann COM nicht bedienen — eine Seite hat keinen Zugriff darauf.
Der Weg läuft deshalb über eine **örtliche Brücke** auf dem Windows-Rechner:

```
Tragjoch-App          →  Modell als JSON  →  PowerShell  →  AxisVM (COM)
(Ausleiten → JSON)                           baut ein NEUES Modell auf
```

Kein Python nötig — PowerShell ist auf jedem Windows vorhanden und kann COM
von Haus aus.

---

## Schritt 1 — Schnittstelle erkunden (einmalig)

Die Namen der COM-Objekte und ihrer Methoden verschieben sich zwischen den
AxisVM-Fassungen. Ein Skript, das gegen die falsche Fassung geschrieben ist,
scheitert erst mitten im Modellaufbau. Deshalb wird einmal ausgelesen, was
**diese** Fassung anbietet:

> Doppelklick auf **`AxisVM_pruefen.cmd`**

Das Skript startet AxisVM, legt ein **leeres** Modell an, liest die Namen der
Objekte und Methoden aus und räumt wieder auf. Es öffnet, ändert und speichert
keine Datei.

Ergebnis: **`AxisVM_aufbau_bericht.txt`** neben dem Skript. Diese Datei
zurückschicken — daraus entsteht die eigentliche Brücke.

Windows blockiert PowerShell-Skripte standardmässig. Die `.cmd` umgeht das für
diesen einen Aufruf (`-ExecutionPolicy Bypass`) und ändert nichts am Rechner;
sie hebt ausserdem die Markierung «aus dem Internet» der Dateien daneben auf.

### Wenn das Fenster sich sofort schliesst

Sollte es doch einmal vorkommen — dann sind die beiden `.cmd` nicht im selben
Ordner wie die `.ps1`. Dann von Hand, in einem **schon offenen** Fenster:

```
cd <Ordner>
powershell -NoProfile -ExecutionPolicy Bypass -File AxisVM_aufbauen.ps1 -NurPruefen
```

So bleibt jede Meldung stehen. Der Verlauf steht zusätzlich in
`AxisVM_aufbau_protokoll.txt`.

---

## Schritt 2 — Modell ausleiten

In der Anwendung: **AxisVM-Ausleitung** (Symbol im Banner) → Format
**«JSON für die COM-Brücke»**. Die Datei enthält dasselbe Stabmodell wie die
SAF-Mappe — vier Gurte, die Bindebleche jeder Station, die Gabellagerung mit
Drehfeder, die Anbauteile am wirklichen Angriffspunkt — nur in einer Form, die
ein Skript ohne Tabellenkalkulation liest.

Aufbau (`format: "tragjoch-stabmodell"`, `version: 1`):

| Block | Inhalt |
|---|---|
| `material` | eine Stahlgüte, E, G, ν, ρ |
| `querschnitte` | Winkel, Bleche, steife Stäbe — Parameter in mm |
| `knoten` | Name, x/y/z in m |
| `staebe` | von/bis, Querschnitt, lokale z-Richtung |
| `auflager` | Gabellagerung, Drehfeder in kNm/rad |
| `lastfaelle` | einer je Einwirkungsgruppe |
| `lasten` | Punkt-, Moment- und Streckenlasten, **charakteristisch** |

Achsen wie im Werkzeug: **x** Jochachse, **y** Gleisrichtung, **z** lotrecht
nach oben. Kräfte in kN, Momente in kNm, Längen in m.

Kombiniert wird **in AxisVM** — die Lasten laufen je Einwirkungsgruppe
getrennt und charakteristisch heraus.

---

## Schritt 3 — Modell aufbauen

**Ohne Aufräumen.** Die Modelldatei wird am **Inhalt** erkannt
(`format = 'tragjoch-stabmodell'`), nicht an der Anzahl der `*.json` im
Ordner — die Zuordnung und die Ergebnisdateien fallen damit von selbst weg.
Liegen mehrere Modelldateien da, gilt die **jüngste**; welche genommen und
welche übergangen wurde, steht im Bericht.

**Ziehen statt kopieren.** Die Datei lässt sich auf `AxisVM_aufbauen.cmd`
ziehen — dann muss sie gar nicht erst in diesen Ordner. Windows übergibt den
Pfad als erstes Argument; die `.cmd` macht daraus `-Json <pfad>` und reicht
weitere Schalter mit durch.

**Alles zu einem Modell liegt beim Modell:**

```
<modell>.json            die Ausleitung
<modell>.axs             das AxisVM-Modell
<modell>_zuordnung.json  welche Linie welcher Stab ist
<modell>_bericht.txt     was gebaut wurde und was nicht
<modell>_ergebnisse.json die Schnittgroessen (beim Auslesen)
```

**Ein ganzer Projektordner auf einmal.** Wird statt einer Datei ein **Ordner**
gezogen, baut das Skript jede Modelldatei darin — **je Modell ein eigenes
AxisVM-Modell** und eine eigene `.axs` daneben. Umgesetzt als ein Lauf je
Datei: das Skript ruft sich selbst mit `-Stapel` auf, wartet dann nicht auf
Enter und schliesst AxisVM nach dem Speichern. Der Sammelbericht
(`AxisVM_stapel_bericht.txt`) liegt im Ordner und nennt je Datei Erfolg oder
Fehlschlag; ein Fehlschlag hält den Stapel nicht an.

**`Quit()` schliesst AxisVM nicht.** Zweimal gemessen, beide Male blieben
die Instanzen stehen — `Quit()` allein, und auch `AskCloseAll = 0` plus
`Models.Delete` davor. AxisVM schliesst sich über die **Verweiszählung**:

| Eigenschaft | im Stapel | sonst |
|---|---|---|
| `CloseOnLastReleased` | **1** | 0 |
| `AskCloseOnLastReleased` | 0 | 0 |
| `AskCloseAll` | 0 | 1 |

Danach `ReleaseComObject` in der Schleife bis auf null, `GC::Collect` — und
das Fenster geht. Ausserhalb des Stapels bleibt es offen; dort soll ja
weitergearbeitet werden. Ob es geglückt ist, zählt der **Elternlauf** am Ende
des Stapels: im Lauf selbst ist die eigene Instanz noch am Beenden, wenn der
Bericht geschrieben wird.

Warum ein eigener Prozess je Modell und keine Schleife: der Aufbau läuft
linear von oben nach unten und trägt Zustand in Skriptvariablen. Eine
Schleife müsste zwischen zwei Modellen jede davon von Hand zurücksetzen — ein
einziges Vergessen würde still das zweite Modell mit Resten des ersten bauen.

Früher hiessen Bericht, Zuordnung und Ergebnisse immer gleich und lagen neben
dem Skript. Das geht für ein Tragwerk; bei mehreren Projekten mit je mehreren
Jochen überschreibt sich dort alles. Dieser Ordner bleibt damit **das
Werkzeug, nicht das Archiv**.


> Doppelklick auf **`AxisVM_aufbauen.cmd`**

Liegt genau eine `*.json` daneben, wird sie genommen; sonst mit
`-Json <datei>` auswählen. Das Skript legt ein neues Modell an und schreibt
Material, Querschnitte, Knoten, Stäbe, Auflager, Lastfälle und Lasten.

**Gerechnet wird nicht.** Lastkombinationen und Berechnung bleiben Ihre
Entscheidung im Programm — die Lasten laufen je Einwirkungsgruppe getrennt und
charakteristisch heraus, damit hinterher ablesbar bleibt, welcher Anteil woher
kommt.

### Was die beiden Prüfläufe ergeben haben (21./22. August 2026)

AxisVM **18 r1m De**, PowerShell 5.1, 64-bit. Der zweite Lauf hat die
Typbibliothek zur Laufzeit übersetzt — **1643 Typen** — und damit alles
gemessen, was vorher Vermutung war:

| Frage | gemessen |
|---|---|
| Geht ein Verbund-Typ spät gebunden durch? | **ja** — `Lines.Add(i,j,0,$g)` trägt, keine frühe Bindung nötig |
| `AddL` in mm oder m? | **Meter**. `AddL(100,…)` → `Ax = 1900 m²`, `AddL(0.1,…)` → `0.0019 m²` |
| Wie bekommt ein Stab sein Material? | `Lines.Item(i).DefineAsBeam(mat, qs, qs, RPoint3d, RPoint3d)` |
| Welche Federsätze gibt es? | 11, **deutsch** benannt — `IndexOfName('Rigid - Translational')` = 0 |

Der letzte Punkt wäre eine Falle gewesen: die Anleitung von AxisVM zeigt
`SpringParams.IndexOfName("Soft - Rotational")`, und auf einer deutschen
Installation heisst der Satz «Weich - Verdrehung». Der Bauweg umgeht das —
`AddNodalGlobal(RStiffnesses, …)` nimmt **Federzahlen unmittelbar**, ohne
benannte Sätze und damit ohne Sprachabhängigkeit. Die Drehfeder mit
12 452 kNm/rad geht ohnehin nur so hinein.


Der Lauf vom 23. August hat die letzten drei Fragen beantwortet — Achsen,
Starrkörper, Linkelemente:

| Frage | gemessen |
|---|---|
| Wie kommt die Referenz an den Stab? | `Lines.Item(i).Reference = n` — ein schlichtes Int32 |
| Wie sieht `RReference` innen aus? | `ReferenceType` (rtPoint/rtVector/rtAxis/rtPlane/rtBeta/rtNone) und `ReferenceData` mit **fünf Zweigen nebeneinander**. Gelesen wird nur der, auf den `ReferenceType` zeigt |
| Starrelemente? | `RigidBodies.Add(Int32[] LineIds)` — nimmt **Linien-Nummern**; die Linie bleibt stehen, sie braucht kein `DefineAsBeam` |
| Gelenkige Anschlüsse? | `LinkElements.AddNN(RNNLinkElementRec)`. Die Linie muss vorher liegen (Feld `LineId`), die Kraftübertragung steht je Richtung in `Stiffnesses` |
| Steifigkeit eines Stabes hochdrehen? | **Nicht** über `StiffnessReduction_A/_I` — gesetzt 1000, gelesen 1, ohne Fehlermeldung. Es ist eine Reduktion. Stattdessen ein eigenes Material über `Materials.AddSteel_EuroCode(...)` |
| Welche Einheit haben die Materialkennwerte? | `Ex = 2.1e8`, also **kN/m²**. Gelesen wird das Katalogmaterial und mit dem Faktor neu angelegt — dann stellt sich die Frage gar nicht |

Der Lauf vom **27. August** hat eine einzige Frage gestellt, weil der Mast ins
Modell kam:

| Frage | gemessen |
|---|---|
| Wie legt man ein I-Profil an? | `CrossSections.AddI(Name, h, b, tw, tf, R, Process)` — dieselbe Bauart wie `AddL`, also in **Metern**. Daneben stehen `AddAsymmetricI`, `AddBox`, `AddC`, `AddIFB`, `AddIHaunched` und `AddFromCatalog` |

Der **Ausrundungsradius R** steht in keiner Profiltabelle dieses Werkzeugs —
er folgt aber eindeutig aus der Fläche:

```
A = 2·b·tf + (h − 2·tf)·tw + (4 − π)·R²
```

Nach R aufgelöst ergibt das für HEB 200/220/240/260 und HEM 240 der Reihe nach
**18.1, 17.9, 21.0, 23.9, 21.0 mm** — genau die Radien der Norm. Ausgeleitet
wird der unrunde Wert, damit die Rückmessung der Fläche (Schritt 4) auf die
Zahl der Tabelle trifft statt auf die zwei Prozent, die beim Winkel bleiben.

### Ein Verbund-Typ verträgt keinen Umweg

Derselbe `RReference`, der auf Skriptebene mit Rückgabe 1 durchgeht,
scheiterte über einen Kandidatenblock von `Versuche` mit
`DISP_E_BADVARTYPE`. Wird ein Verbund-Typ durch fremde Gültigkeitsbereiche
gereicht, kommt er am COM-Marshaller nicht mehr als Satz an.

**Regel:** Sätze unmittelbar übergeben. Wo es ohnehin nur eine Schreibweise
gibt — `References.Add`, `AddNN`, `RigidBodies.Add` —, ist das Durchprobieren
sinnlos und schädlich zugleich.

Dazu die zweite Hälfte derselben Lehre: `GetNewClosure()` legt ein **neues
dynamisches Modul** an. Darin zeigt `$script:` auf dessen Modulscope, nicht
mehr auf das Skript — `$script:m` war leer, und `.References` lief auf einem
Null. Lokale Variablen werden dagegen mitkopiert.

### Starrkörper werden zusammengelegt

Die Zahl der Körper hängt nicht daran, wie viele angelegt wurden, sondern
daran, wie viele zusammenhängende Gruppen entstehen: 700 einzeln angelegte
Stummel ergaben **118**, und 476 ebenfalls 118. AxisVM legt Starrkörper, die
sich einen Knoten teilen, zu einem zusammen. Das ist richtig so: was am selben
Knoten hängt, ist ohnehin starr verbunden.

Die Anzahl taugt deshalb nicht als Kontrolle. Gefragt wird stattdessen je
Linie nach `RigidBodyId` — trägt jede einen Körper? Am Signaljoch: 476
angelegt, **0 ohne Körper**.

Weil die **Gurtabschnitte Stäbe bleiben**, kann die Verschmelzung eine
Station nicht über ihre Grenze hinaus starr machen.

### Was sich nicht durch Ausprobieren klären lässt

Eine falsche Einheit bei den Querschnitten **wirft keinen Fehler**. Sie
liefert still einen tausendfach falschen Querschnitt, und das Modell rechnet
klaglos Unsinn. Schritt 4 liest deshalb jede Fläche zurück und vergleicht sie
mit dem Profiltabellenwert:

```
GURT_OG          A =   0.001900 m2   Tabelle   0.001920    -1.0 %
```

Ein bis zwei Prozent Rest sind richtig so — die Ausrundungen `r1`/`r2` stehen
in unserer Datei auf null, in der Profiltabelle nicht. Weicht ein Querschnitt
um mehr als 5 % ab, hält das Skript an.

### Lokale Stabachsen

Ohne Referenz legt AxisVM die lokale z-Achse in die **Vertikalebene**. Für die
Gurte trifft das unsere Vorgabe `[0,0,1]`. Für die **Bindebleche** nicht: deren
Rechteck muss mit der Breite in der Jochachse liegen, also `z` nach `[1,0,0]`.
Stünde ein 160 × 10 mm Blech hochkant, läge seine Biegesteifigkeit um
(160/10)² ≈ 256-fach daneben — und das Modell rechnete klaglos Unsinn.

`References` trägt genau **eine** Add-Methode, und die nimmt einen Verbund-Typ:

```
Add(RReference Item)
```

Weil meine erste Fassung nur Methoden mit einfachen Parametern in Betracht zog,
fand sie keine — 0 von 942 Stäben bekamen eine Achse. Der Bericht sagte das
deutlich, statt still weiterzurechnen.

Wie `RReference` innen aussieht, wird jetzt **gelesen** statt geraten:
`SatzAufbau` klappt den Typ mitsamt Untersätzen und Aufzählungsnamen im Bericht
aus, `SatzSetzen` schreibt über Reflexion hinein. Das ist nötig, weil
`$r.Point1.x = 1` bei einem Wertetyp ins Leere läuft — PowerShell holt sich eine
Kopie. Gefüllt wird nach Bedeutung: das Aufzählungsfeld auf die Vektor-Art, die
erste Dreiergruppe `x`/`y`/`z` auf die Richtung.

Geprüft wurde vorher, dass **kein** Stab parallel zu seiner Referenz steht — das
kleinste Kreuzprodukt über alle 942 liegt bei 1,0. Die Richtung ist also überall
eindeutig.

Nach dem Zuweisen liest das Skript an vier Stäben zurück, was wirklich drinsteht.
Eine COM-Eigenschaft kann eine Zuweisung klaglos schlucken und doch bei 0
bleiben; gesetzt heisst nicht angekommen.

### Warum das Skript nachschlägt statt Fehler abzufangen

AxisVM meldet Fehler **nicht als Ausnahme**, sondern als negative Zahl. Beim
ersten Aufbau lief alles durch — und lieferte `S235 als Nummer -102`. Die
COM-Referenz sagt *„if successful the result is > 0"*; `-102` ist ein
Fehlercode, und er wanderte als Materialnummer in alle 746 Stäbe.

Was welche Zahl bedeutet, steht in keiner Anleitung im Netz. Es steht aber in
der **Typbibliothek**, die das Skript ohnehin lädt. Also wird dort
nachgeschlagen, statt eine Liste von Hand zu pflegen — sie stimmt damit
immer zur laufenden Fassung:

```
Material   AddFromCatalog(ndcSwiss_SIA26x, 'S235')  ->  Rueckgabe -102 = errNotFound
Material   AddFromCatalog(ndcEuroCode, 'S235')
```

Dasselbe gilt für die **Parameternamen**. `Get-Member` zeigt am COM-Objekt nur
Typen — `AddSteel_EuroCode(string, string, string, uint, uint, double, double,
…)`, vierzehn namenlose Zahlen. Die Interop-Baugruppe kennt die Namen aus der
Typbibliothek. Findet der Katalog den Stahl nicht, schreibt das Skript die
Signatur mit Namen in den Bericht, und der Stahl lässt sich von Hand setzen,
ohne die Referenz aufzuschlagen.

### Woher die Kenntnis der Schnittstelle stammt

Die COM-Referenz von AxisVM ist ein PDF über 10 MB, und die Wissensdatenbank
führt unter «API» zwei Artikel. Ergiebiger sind die **quelloffenen Projekte
von InterCAD selbst** — sie bauen Modelle über dieselbe Schnittstelle:

| Projekt | Sprache | Lizenz | was es zeigt |
|---|---|---|---|
| [pyaxisvm](https://github.com/AxisVM/pyaxisvm) | Python | MIT | Anbindung über `comtypes`, Typbibliothek automatisch |
| [GrasshopperToAxisVM](https://github.com/AxisVM/GrasshopperToAxisVM) | C# | GPL-3 | Knoten, Linien, `DefineAsBeam`, **Aufbau von `RReleases`** |
| [DynamoToAxisVM](https://github.com/AxisVM/DynamoToAxisVM) | C# | GPL-3 | Lastfälle, Punktlasten, `AddNodalGlobal` |

Aus den beiden C#-Projekten ist **kein Code übernommen** — sie sind GPL, diese
Anwendung ist es nicht. Übernommen ist allein die Kenntnis, wie die
Schnittstelle aussieht; das ist keine Schöpfungshöhe, sondern eine Tatsache
über fremde Software.

Der entscheidende Fund dort: **`RReleases` ist verschachtelt.** Die sechs
Felder `x, y, z, xx, yy, zz` sind je ein `RRelease` mit einem Feld
`ReleaseType` — nicht der blosse Aufzählungswert, wie hier zuerst angenommen.
Gesetzt werden alle sechs: die freien auf `rtFree`, die übrigen ausdrücklich
auf `rtRigid`. Ein nicht gesetztes Feld trüge den Nullwert der Struktur, und
was der bedeutet, ist nirgends gesagt.

Beide Projekte bestätigen ausserdem die Lasten und die Auflager Zeile für
Zeile — `AddNodalForce(RLoadNodalForce)` mit `ReferenceId = 0`, und
`AddNodalGlobal(RStiffnesses, RNonLinearity, RResistances, Knoten)`.

### Falls PowerShell doch nicht mag: PyAxisVM

AxisVM pflegt eine quelloffene Python-Anbindung — [AxisVM/pyaxisvm]
(https://github.com/AxisVM/pyaxisvm), **MIT-Lizenz**, auf `comtypes`
aufgesetzt. Der Haken: `pip install axisvm` verlangt Python 3.8–3.10, und
installieren lässt sich auf einem Firmenrechner nicht immer. PowerShell ist
schon da.

Massgebend für beide: [COM-Referenz zur AxisVM Library 18.1]
(https://download.axisvm.eu/com/axisvm_com_18100.pdf) und
[Creation of a simple model using AxisVM COM server]
(https://axisvm.eu/docs/creation-of-a-simple-model-using-axisvm-com-server/).

### Das Skript findet sich selbst

Die Namen der COM-Methoden verschieben sich zwischen den AxisVM-Fassungen: was
in der einen `Lines.Add` heisst, heisst in der nächsten anders oder nimmt
andere Argumente. Ein Skript mit fest angenommener Schreibweise scheitert
mitten im Aufbau und lässt ein halbes Modell zurück.

Dieses probiert je Schritt **mehrere bekannte Schreibweisen** durch, merkt sich
die erste, die trägt, und schreibt am Ende `AxisVM_aufbau_bericht.txt`. Findet
es für einen Schritt gar nichts, listet es auf, was das betreffende COM-Objekt
**wirklich** anbietet, und hält an — statt weiterzubauen.

> **Es ist gegen keine laufende AxisVM-Fassung erprobt.** Der erste Lauf ist
> deshalb zugleich der Versuch: er baut das Modell, oder er sagt genau, woran
> es liegt. Den Bericht zurückschicken — mit ihm ist die Lücke in Minuten
> geschlossen.

Nur erkunden, ohne zu bauen:

```
powershell -ExecutionPolicy Bypass -File AxisVM_aufbauen.ps1 -NurPruefen
```

---

## Warum nicht SAF, warum nicht DXF

| Weg | was ankommt | Haken |
|---|---|---|
| **SAF** (Excel) | alles: Geometrie, Querschnitte, Auflager, Lasten | Import ist bei AxisVM ein **kostenpflichtiges Modul** |
| **DXF** | nur die Geometrie | keine Querschnitte, keine Auflager, keine Lasten — damit ist nichts nachzurechnen |
| **COM** | alles | braucht Windows und AxisVM auf demselben Rechner |

Die SAF-Mappe und die DXF-Ausleitung bleiben im Werkzeug — wer das Modul hat
oder nur die Geometrie braucht, ist damit schneller. Der Weg, der ohne
Zusatzlizenz ein **vollständiges** Modell liefert, ist COM.

---

## Schritt 4 — zurück vergleichen

In AxisVM die Spannungen je Lastfall ausgeben (Blätter `vm <Name>`), dann:

```
node vergleich_werkzeug.mjs meine_ablage.json vergleich_werkzeug.json
python3 vergleich_axisvm.py Export.xlsx vergleich_werkzeug.json
```

Die Zuordnung der Stäbe, der Versatz zwischen den Koordinatensystemen und die
Zuordnung der Lastfälle findet das Werkzeug selbst; wo es rät, sagt es das.
