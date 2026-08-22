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

### Offen

Die lokale z-Richtung der Stäbe (`lcsZ`) wird nicht gesetzt; AxisVM wählt sie
selbst. Für die Lasten ist das ohne Belang — sie werden global aufgebracht.
Für das **Ablesen** von `My`/`Mz` je Stab ist es zu prüfen.

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
