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
    datum: '2026-10-08',
    punkte: [
      { text: 'Einheitswind (alte Norm): es gelten die Werte der alten Mastberechnung statt der bisherigen Annahmen - Tragjoche J60-J130 0.25 … 0.48 kN/m (J90: 0.35 statt 0.275), Abfangjoche A160-A360 gleich der Profilhöhe (A160: 0.16 statt 0.20), Tragausleger 0.14, Masten, Leiter, Hängestütze, Jochaufsätze, Ausleger. EK1-EK3 bleiben unverändert. Dazu braucht es das Datenpaket vom 8. Oktober.', rechnung: true },
      { text: 'Von Hand gesetzte Lasten stehen unten rechts im Bild als «Lasten von Hand (Joch, Mastwind)». Eine Windlast lässt sich auch auf 0 setzen.' },
      { text: 'Reiter Lasten: mit «Werte bearbeiten» lassen sich neben der Windlast auf das Joch auch die Windlasten auf den Masten ändern (quer und längs zum Gleis, je für den angewählten Masten). «Tabellenwerte» setzt Joch und alle Masten auf die Werte der Datenbank zurück.', rechnung: true },
      { text: 'Neu: gespreizte Masten DGP24/5.5, DGP26/5.5, DGP24/10 und DGP26/10 im Mastwähler. Unter der Spreizung rechnet das Stabwerk zwei Hälften des Profils mit ihren Bindeblechen, darüber das Walzprofil; Kacheln «Hälften», «Blech» und «Profil», Fundament DG1a / DG2a / DG3a nach Typ und Stegrichtung.', rechnung: true },
      { text: 'Gittermast IV 45 UL nach der Detailzeichnung berichtigt: Gurt unten L 100x100x12 (vorher L 120x120x12 angenommen), Teilung 13 Stationen unten und 15 oben (vorher 11 und 16), Bleche unten 12 mm, oben 10 mm dick, am Knick ein Blech von 40 mm, am Kopf nur die Kopfplatte. Am Beispiel (J120-alt 24 m, EK1): Gurt 0.874 → 0.813, Bindeblech 0.424 → 0.574.', rechnung: true },
      { text: 'Einheitswind, Nachtrag: alte Lampen 0.3 kN (mit Befestigung 0.5 kN); alte Abfangjoche (UAP, IPE) mit der Profilhöhe ohne Zuschlag; Gittermast aus den Tragjochen umgerechnet (1.52 kN je m² Angriffsfläche statt 1.25).', rechnung: true },
      { text: 'COM-Brücke: der Aufbau brach seit dem 7. Oktober bei jedem Start ab («System.String kann nicht in SwitchParameter konvertiert werden», Zeile 70). Behoben - bitte die Skripte der Brücke neu aus der internen Ablage holen.' },
    ],
  },
  {
    datum: '2026-10-07',
    punkte: [
      { text: 'Reiter Auflager: Tabelle «Kräfte am Jochanschluss» aus dem Stabwerk - je Mast und Gurt F_x, F_y, F_z (Joch auf den Masten, charakteristisch, min / max).' },
      { text: 'Gurt mit «Anschnitt»: der Knotenbereich (steifer Abschnitt) zählt nicht mehr - massgebend ist der freie Gurt am Blechrand; am Gittermast der Gurt um die halbe Blechhöhe vom Knoten. Verläufe und Bild ohne Knotenbereich, die Bleche des Gittermasts als Stufe je Feld.', rechnung: true },
      { text: 'Signalbauer: abstrakte Symbole für die 26 Signale und Tafeln.' },
      { text: 'Leiter-Traverse am Masten einseitig auskragend: Kraft der Traverse in der Mitte (0.50 m), Zusatzleiter am Ende (1.00 m); das Ende lässt sich im 3D ziehen, der Leiter wandert mit. Bereits gesetzte Traversen bleiben, wie sie sind.', rechnung: true },
      { text: 'Gittermast: der Wind im Ersatzprofil (Maske, vorläufige Anzeige) ist je Richtung das Grösste über die Höhe - am I 30 jetzt 0.305 / 0.441 statt 0.305 / 0.305 kN/m (EK1). Das Stabwerk rechnete schon je Höhe mit der richtigen Fläche und bleibt gleich.' },
      { text: 'Havarie: solange der Reiter Lasten offen ist, stehen alle Leiter im 3D - die angehakten («kann reissen») in der Warnfarbe.' },
      { text: 'Drahtwerke: «Ordnen nach Name / Lage x / Höhe z» in jeder Gliederung, mit den Spalten x und z.' },
      { text: 'COM-Brücke: Schalter -Statikbericht legt die Plots für den Statikbericht an (Zeichnungsbibliothek und EMF-Bilder, mit Vorlage auch den Bericht).' },
      { text: 'Wind auf die Fahrleitung: Tragseil und Fahrdraht einzeln tragen je die Hälfte der Zeile «Fahrleitung mit Fd» (Blatt Windlasten 2), zusammen also wie das Kettenwerk (vorher 15 % weniger).', rechnung: true },
      { text: 'Lastgenerator: Δ zur Gleisachse je Anbauteil; Jochaufsätze nicht mehr ans Gleis gebunden (Anzahl, gleichmässig verteilt oder Abstand Δ zur Jochmitte); Montagehöhe des Jochs und Mastlänge im Dialog.' },
      { text: 'Havarie: die Leiterliste sieht aus wie die Drahtwerke (Leiter, Typ, Lage), Überfahren zeigt den Leiter im 3D; Kettenwerke gleicher Bezeichnung zählen nur an derselben Stelle als ein Leiter (Punkt für Punkt).', rechnung: true },
      { text: 'Drahtwerke: Gliederung nach Name, Lage x und Höhe z; im 3D je Leiter ein Strich (Bündel und Anzahl als mehrere Striche).' },
      { text: 'Griffe am Ende der Anbauteile erscheinen nur, wenn die Maus in der Nähe ist.' },
      { text: 'Verformte Figur: Hängestütze und Ausleger rechtwinklig wie die Bauteile.' },
      { text: 'Reaktionskräfte der alten Fischbauchjoche ohne Masten (auch in der Reihe) als Resultierende je Jochende.' },
      { text: 'Verläufe: der Gittermast über die Höhe (Gurte, Bindebleche, Rohr; Gurtkraft, Moment im Rohr).' },
      { text: 'COM-Brücke: scheitert das Anlegen eines neuen Modells (zweiter Aufbau in derselben AxisVM-Sitzung), wird das offene Modell zuerst neben die Modelldatei gesichert und dann neu angelegt; der Bericht nennt den Fehlercode beim Namen.' },
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
