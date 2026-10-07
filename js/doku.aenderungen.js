/**
 * doku.aenderungen.js - das Änderungsprotokoll für die Anwender.
 *
 * Weisung vom 7. Oktober: «verfasse ein änderungsprotokoll wenn man auf die
 * versionsnummer klickt unten rechts.» Ein Klick auf die Fassung in der
 * Fussleiste öffnet diese Liste. Sie sagt in Worten der Bedienung, was sich
 * geändert hat - und, wo eine Zahl sich ändert, in welche Richtung. Das
 * Protokoll im Kleinen bleibt der Git-Verlauf; hier steht, was ein Anwender
 * davon wissen muss. Neue Einträge oben.
 */

/** Je Tag: Titel und Punkte. `rechnung: true` = ändert Nachweiszahlen. */
export const AENDERUNGEN = [
  {
    datum: '2026-10-07',
    punkte: [
      { text: 'Einheitswind (alte Norm): die hintere Ebene zählt mit 25 % dazu - am Tragjoch, Abfangjoch, Tragausleger und am Gitter des Gittermasts. Rohr und Aufsatz über dem Gittermast bleiben einfach, die Leiter bleiben beim Formbeiwert 1.0.', rechnung: true },
      { text: '«Sortiment durchrechnen»: oben ein Bemessungsvorschlag je Teil - Jochtyp, Mastprofil je Mast, Fundament je Mast, Anker - mit einem Feld für die Reserve; je Zeile «übernehmen».' },
      { text: 'Eigene Vorlagen projektübergreifend: Sammlung in diesem Browser, Schalter und Verwaltung unter Optionen → Eigene Vorlagen, Sammlung als Datei sichern und laden.' },
      { text: 'Leiter im Modell als feiner Strich in Gleislängsrichtung; Drahtwerke-Liste mit Gliederung «Einzeln».' },
      { text: 'Gittermast: Kästchen «Rohr weglassen» bzw. «Mastaufsatz weglassen» unter dem Mastprofil.', rechnung: true },
      { text: 'Windlasten nach den Blättern Gewichts- und Windlasten: Hängestütze und Hängerohr mit Wind je Meter × Gesamtlänge (Gewicht je Stück); neu Leiter Cu 150, Cu 150 (x2), Aldrey 300.', rechnung: true },
      { text: 'Tragende Anbauteile (Hängestütze, Jochaufsatz, Ausleger, Konsolen, Traverse): man gibt die Gesamtlänge ein, der Angriffspunkt sitzt in der Mitte; im 3D lässt sich das Ende ziehen, was am Ende hängt, wandert mit.' },
      { text: 'Drahtwerke: Gliederung nach Typ, Gruppe, Bauteil; Überfahren zeigt den Leiter im 3D, Klick (Strg: mehrere) öffnet Typ und Anzahl.' },
      { text: 'Gruppe von Anbauteilen duplizieren (um Δx oder im Modell antippen); Esc klappt offene Karten zu.' },
      { text: 'Stahlgüten S450 und S460; Stahlgüte getrennt für Joch und Masten.', rechnung: true },
      { text: 'Fundament: Ablauf der Fundamentbestimmung mit Abminderung nach der alten Maststatik, Gelände über 14° je Mast; Doppelanker auf Zug und Hinweis auf die nächste Ankerstufe.', rechnung: true },
      { text: 'Handbuch Kapitel 21: Fundamentbestimmung - der Ablauf.' },
      { text: 'Die COM-Skripte kommen nicht mehr aus dem Browser (Schutzwarnung von Windows); sie liegen in der internen Ablage.' },
      { text: 'Anbauteile: Mehrfachauswahl mit Strg, Kontextfenster der Leiste; Grundwerte der Trasse in der Fussleiste anklickbar.' },
      { text: 'Bügelschrauben als eigener Nachweis aus dem Stabwerk, Grenzfeder suchen und übernehmen; Lastgenerator mit Abstand Mast–Gleis.', rechnung: true },
      { text: 'Stabwerk wiegt die Stäbe wie AxisVM; Karte «Lasten» nach Einwirkung gegliedert.', rechnung: true },
    ],
  },
  {
    datum: '2026-10-06',
    punkte: [
      { text: 'Begleitwind ψ₀ = 0.65 ohne γ_Q (wie SIA 260).', rechnung: true },
      { text: 'Schalter «Wind × 0.74» für grossflächige Überbauung; Bestandesschutz mit einstellbarer Grenze.', rechnung: true },
      { text: 'Betriebswind ohne ständige Last (nur Wind × 0.70) für die Gebrauchstauglichkeit.', rechnung: true },
      { text: 'Teile am Masten auch an Abfangjoch und Tragausleger; Hebel der Jochteile am Abfangjoch; Blech-Diagonale spart Elemente im Modell.', rechnung: true },
      { text: 'Ausleger-Vorlagen mit Tragseil und Fahrdraht getrennt; Fussversatz am Abfangjoch.', rechnung: true },
      { text: 'Stabwerk in Echtzeit oder auf Knopf; neu gerechnet nur bei Änderungen.' },
      { text: 'Bedienung: Anbauteilzeile mit Papierkorb, Gruppen mit freiem Namen, Tragwerk duplizieren fragt wohin, Kontextmenü gekürzt, Vorlage «Abfangjoch mit Anker».' },
      { text: 'Profilblatt in mm; Fundament nach Masttyp vorgewählt.' },
    ],
  },
  {
    datum: '2026-10-04',
    punkte: [
      { text: 'Gebrauchstauglichkeit am Fahrdraht statt an der Referenzhöhe; Mastspitzen an der verformten Figur.', rechnung: true },
      { text: 'Bestandesschutz: zweite Rechnung ohne die als «neu» bezeichneten Teile, Δη je Bauteil.' },
      { text: 'Einzellastfall aus dem Stabwerk; alle Tragwerke des Blattes aus dem Stabwerk gefärbt.' },
      { text: 'Gittermast: Rohr an den Halterippen, Rippen halten nur seitlich; UL-Rohr mit zwei Wanddicken.', rechnung: true },
      { text: 'Verjüngte Joche: Starrelemente am Knick der Ansicht.', rechnung: true },
      { text: 'Signalbauer mit Bildern; Tragausleger: Wind, Fahrdraht und Kette im 3D.' },
    ],
  },
  {
    datum: '2026-10-03',
    punkte: [
      { text: 'Gittermast (kombinierter Mast) im Stabwerk mit Kontrolle nach dem Bemessungsdiagramm.', rechnung: true },
      { text: 'Einheitswind der alten Norm als Windstufe.', rechnung: true },
      { text: 'Abfangjoch: Anker, Mastwind, Windstufe und halbe Spannweite einseitig abgefangener Leiter; gegen AxisVM bestätigt.', rechnung: true },
      { text: 'Seile der Aufhängung nur auf Zug; Tragausleger am Jochmasten im Stabwerk.', rechnung: true },
      { text: 'Anbauteile: Symbolkacheln, Suche, Auswahl beim Setzen, Katalog bereinigt.' },
    ],
  },
  {
    datum: '2026-10-02',
    punkte: [
      { text: 'Jochlänge auf die Standardlänge, Rest als Kragarm; Endfeld am Stoss in der Reihe.', rechnung: true },
      { text: 'Joch ohne Masten: Reaktionen je Jochende, Lagerung einstellbar.' },
      { text: 'Masten im 3D ziehen (Lage, Fuss, Kopf); Profile nach Norm mit Profilblatt.' },
    ],
  },
];

const datumText = (d) => d.split('-').reverse().join('.');

/** Das Protokoll als HTML für den Dialog. */
export function aenderungenHtml(esc = (s) => s) {
  return `<p class="notiz" style="margin-top:0">Was sich geändert hat, neueste zuerst.
      <span class="aend-rechnung">Σ</span> = ändert Nachweiszahlen; ein gespeicherter Stand kann
      danach anders dastehen.</p>
    ${AENDERUNGEN.map((t) => `<h4 class="aend-tag">${datumText(t.datum)}</h4>
      <ul class="aend-liste">${t.punkte.map((p) => `<li>${p.rechnung
        ? '<span class="aend-rechnung" title="ändert Nachweiszahlen">Σ</span> ' : ''}${esc(p.text)}</li>`).join('')}</ul>`).join('')}`;
}
