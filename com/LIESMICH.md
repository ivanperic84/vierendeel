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

Ergebnis: **`AxisVM_schnittstelle.txt`** neben dem Skript. Diese Datei
zurückschicken — daraus entsteht die eigentliche Brücke.

Falls nichts passiert: Windows blockiert PowerShell-Skripte standardmässig.
Die `.cmd` umgeht das für diesen einen Aufruf (`-ExecutionPolicy Bypass`) und
ändert nichts am Rechner.

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
