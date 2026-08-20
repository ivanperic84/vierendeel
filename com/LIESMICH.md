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

## Schritt 3 — noch zu bauen

`AxisVM_aufbauen.ps1`: liest das JSON, legt ein neues Modell an, schreibt
Material, Querschnitte, Knoten, Stäbe, Auflager, Lastfälle und Lasten, rechnet
und schreibt die Ergebnisse zurück. Fehlt noch — dafür wird die Ausgabe aus
Schritt 1 gebraucht.
