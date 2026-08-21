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

### Was der erste Lauf ergeben hat (2026-08-21)

AxisVM **18 r1m De**, PowerShell 5.1, 64-bit. Der Bericht teilt die
Schnittstelle sauber in zwei Hälften:

| trägt, mit einfachen Zahlen | braucht Verbund-Typen |
|---|---|
| `Materials.AddFromCatalog(code, name)` | `Lines.Add(i, j, ELineGeomType, ref RLineGeomData)` |
| `CrossSections.AddL(name, 6×double, process)` | `Lines.Item[i].DefineAsBeam(mat, qs, qs, ref RPoint3d, ref RPoint3d)` |
| `CrossSections.AddRectangular(name, h, b, process)` | `NodalSupports.AddNodalGlobal_V153(ref RNodalSupportSpringParams, node)` |
| `Nodes.Add(x, y, z)` | `Loads.AddNodalForce(RLoadNodalForce)` |
| `LoadCases.Add(name, typ)` | `Loads.AddBeamDistributed(RLoadBeamDistributed)` |
| `Loads.AddBeamSelfWeight(line, lc)` | |

Die rechte Spalte ist die, auf die es ankommt — Stäbe, Auflager, **sämtliche**
Lasten. PowerShell kann solche Strukturen nicht von sich aus anlegen; es
braucht die Typbibliothek. Die steckt in der Programmdatei und lässt sich zur
Laufzeit übersetzen (`TypeLibConverter`), ohne Zusatzwerkzeug. Genau das
probiert der zweite Lauf.

Zwei Dinge misst er mit, weil ein Fehler dort **nicht auffliegt**:

- **die Einheit der Querschnittsmasse.** Ob `AddL` mm oder m erwartet, wirft
  keinen Fehler — es entsteht still ein tausendfach falscher Querschnitt. Also
  beide anlegen und die Fläche zurücklesen (`L 100x100x10` → 0.00192 m²).
- **die Federsätze.** AxisVM 18 nimmt beim Auflager keine Federzahl, sondern
  den Index eines **benannten** Federsatzes
  (`SpringParams.IndexOfName('Rigid - Translational')`). Unsere Drehfeder hat
  c = 12 452 kNm/rad — dafür braucht es einen eigenen Satz.

Bis dahin ist der Bauweg **verriegelt**: er bräche sonst nach 607 Knoten bei
Schritt 6 ab und liesse ein halbes Modell zurück.

### Falls PowerShell doch nicht mag: PyAxisVM

AxisVM selbst pflegt eine quelloffene Python-Anbindung — [AxisVM/pyaxisvm]
(https://github.com/AxisVM/pyaxisvm), **MIT-Lizenz**. Sie setzt auf `comtypes`
auf, das die Typbibliothek automatisch übersetzt; die Verbund-Typen und
Aufzählungen liegen dann als `axisvm.com.tlb` bereit. Damit entfällt genau der
Teil, der hier von Hand nachgebaut wird.

Der Haken: `pip install axisvm` verlangt Python 3.8–3.10, und installieren
lässt sich auf einem Firmenrechner nicht immer. PowerShell ist schon da.
Deshalb zuerst dieser Weg — die Python-Variante bleibt als Rückfallebene.

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
