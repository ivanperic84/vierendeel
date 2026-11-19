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
/*
 * Geleert am 17. November 2026 (Weisung: «das änderungsprotokoll leeren»);
 * die frühere Liste steht im Git-Verlauf dieser Datei. Neue Einträge oben.
 */
export const AENDERUNGEN = [
  {
    datum: '2026-11-18',
    punkte: [
      { text: 'Neu: «Dimensionieren» rechnet Jochtyp, Mastprofil, Stegrichtung, elastisch/plastisch und Einspannung mit dem Stabwerk durch, mit Diagramm Ausnutzung gegen Materialmasse. «Mast plastisch» gilt jetzt auch im Stabwerk.', rechnung: true },
      { text: 'Knicken Mast (SIA 263) ist bei neuen Querprofilen wieder voreingestellt eingeschaltet.', rechnung: true },
      { text: 'Farbbalken: Ausnutzung bis 1.0, Lastfall darunter, Klick auf den Balken für Farbe (Nachweis / Resultat / frei), Skala und Werte. Liniendiagramm: sehr kleine Werte werden nicht mehr gross gezeichnet. Kachel überfahren hebt den Stab hervor; Leiste oben, solange das Stabwerk rechnet. Knopf «Bauteil setzen» im 3D entfernt.' },
      { text: 'Neu im 3D: Figur schwingt (Knopf «Figur ▶»), Wert unter der Maus, weiche Übergänge bei Plot und Lastfall, Explosion «auf / zu»; nach einer Eingabe zeigen die Kacheln kurz die Änderung von η.' },
      { text: 'Linie im 3D: folgt den Ebenen der Werkzeugleiste (keine Teile-Auswahl mehr), N lotrecht, Modell farbig nach Nachweis / Resultat / frei wählbar; Schieber «Grenze» mit Wert und Einheit, auch für die Linie.' },
      { text: 'Theorie 2. Ordnung: auch Fundament und Anker, Masten knicken dann mit β = 1; Näherung 1/(1 − 1/α_cr) entfernt, Stabilitätsanzeige und Bericht gekürzt.', rechnung: true },
      { text: 'Viewer: Liniendiagramm (auch in der Explosion), Ausnutzung je Bauteil in der Leiste, Lastfälle nur der massgebende je Einwirkungsrichtung, Zusammenfassung des Fundamentnachweises, Hauptkennwerte (EK, Trasse, Reduktion) im Kopf, Lasten voreingestellt aus, Farbbalken der Ausnutzung bis 1.0.' },
      { text: 'Nachweisbericht: das 3D-Bild auf dem Deckblatt wird nicht mehr abgeschnitten (festes Format, an der Szene eingepasst).' },
      { text: 'Neu: Schieber «Auffällig» bei den Resultaten im 3D - was unter der Schwelle liegt (η bzw. Anteil am grössten Wert), tritt stark durchsichtig zurück.' },
      { text: 'Explosionsdarstellung: Zustandslinien werden mit den Teilen auseinandergezogen, die Abstände sind doppelt so gross, die Anbauteile stehen in der Explosion nicht.' },
      { text: 'Werkzeugleiste im 3D ohne «Teil» und «η w»; Erklärtexte unter den Feldern sind bei neuen Querprofilen voreingestellt aus.' },
      { text: 'Neu: Gruppe «Stabilität» in der Nachweiskarte - Kachel «α_cr Gesamtsystem» mit Bewertung (Knopf «α_cr rechnen», Knickfigur) und das Knicken der Masten. «Stabilität Joch» gilt mit α_cr ≥ 10 oder der Theorie 2. Ordnung als geführt, sonst steht sie unter «nicht geführt».' },
      { text: 'Nachweisbericht: in den Grundlagen der Abschnitt «Theorie 2. Ordnung und Stabilität» - gerechnetes Verfahren, Schiefstellung mit allen Grössen und, wenn gerechnet, α_cr mit Bewertung.' },
      { text: 'Neu: Optionen → Nachweise «Theorie 2. Ordnung» - jede Nachweis-Kombination am verformten System mit Schiefstellung der Masten nach EN 1993-1-1, 5.3.2; Nachweise und Urteil lesen dann diese Schnittgrössen (Vorgabe aus, der Knicknachweis der Masten bleibt). Gegen AxisVM nichtlinear nachgerechnet: Wege und Stabkräfte auf 0.5-3 %.', rechnung: true },
      { text: 'Stabilität: unter dem α_cr steht die Ausnutzung mit dem Vergrösserungsfaktor 1/(1 − 1/α_cr) je Kombination (Näherung für Theorie 2. Ordnung nach EN 1993-1-1, 5.2.2; Auskunft, kein Nachweis). Gegen AxisVM nachgerechnet: α_cr stimmt auf 0.1 bzw. 3 % (Werkzeug auf der sicheren Seite).' },
      { text: 'Neu: Stabilität des Stabwerks - in der Stabwerksleiste «Stabilität (α_cr) rechnen» gibt den kleinsten Knick-Eigenwert über die Kombinationen und ob die Theorie 1. Ordnung genügt (Auskunft, kein Nachweis); «Knickfigur zeigen» legt die Eigenform über das Modell.' },
      { text: 'Reiter Anbauteile mit Sprungleiste (Abschnitte und Gruppen, alle zu / auf). Im 3D oben die Grundwerte statt des Lastfallfelds; der Lastfall wird in der Liste gewählt, dort jetzt auch die einzelnen Lasten (ständig, Wind quer / längs, Schnee).' },
      { text: 'Zustandslinie: die Diagramme der Bindebleche zeigen nach aussen (liegende nach oben bzw. unten, stehende zur Seite), damit sie sich nicht überdecken.' },
      { text: 'Lastpfeile im Modell folgen dem gewählten Lastfall jetzt auch am Tragausleger und an den Nachbartragwerken.' },
      { text: 'Die leichte Fassung «Viewer» entfällt (nie benutzt); an ihre Stelle tritt die Viewer-Ausleitung. Die Schulung bleibt.' },
      { text: 'Neu: Export → «Viewer (HTML: Modell, Bericht, Massen)» - eine Datei zum Weitergeben, die das Modell mit allen Lastfällen, den Nachweisbericht und den Massenauszug zeigt und nicht rechnet. Im Bericht führt ein Klick auf ein Bild zur selben Ansicht im Modell.' },
      { text: 'Nachweisbericht: neues Kapitel «Tragwerksteile und Massenauszug» (Querschnitte, Stablängen, Massen je Bauteil).' },
      { text: 'Explosionsdarstellung: die Bindebleche liegen auf einer eigenen Ebene ausserhalb der Gurte, die Anbauteile weiter aussen. Farbe und Werte der Resultate bleiben darin sichtbar.' },
      { text: 'Gespreizte Masten (DGP): die Torsionssteifigkeit der beiden Hälften ist jetzt die Hälfte des Walzprofils (mit Ausrundungen, bisher ohne, 19 % weniger). Gegen AxisVM nachgerechnet; ändert die Zahlen nur bei Torsion am Masten, meist erst in der dritten Stelle.', rechnung: true },
    ],
  },
  {
    datum: '2026-11-17',
    punkte: [
      { text: 'Modell: Explosionsdarstellung (Schieber «Explosion» in der Gruppe Modell, Doppelklick setzt zurück) und stehende / liegende Bindebleche getrennt schaltbar. Nur das Bild.' },
      { text: 'Fundament: Horizontalkraft und Moment zählen als Resultierende (H_tot, M_tot, M_ver gegen die Grenze M_ver,max); die Anteile ständig / veränderlich lenken den Ablauf, sind aber kein eigener Nachweis mehr. Gespeicherte Stände können beim Fundament tiefer liegen.', rechnung: true },
      { text: 'Anschluss Joch am Masten: Stufe «eingespannt bis zur Grenze der Hakenschrauben» unter Auflager wählbar; der Knopf «Grenzfeder K_X suchen» entfällt.', rechnung: true },
      { text: 'Kacheln Fundament, Verformung und Bügelschrauben nennen die massgebende Prüfung; Fussleiste mit derselben Zahl wie die Hauptkachel; Export ohne «Drucken».' },
      { text: 'Handbuch neu geschrieben: technisch, nach dem heutigen Rechenweg (Stabwerk), in 20 Abschnitten.' },
      { text: 'Rechnung immer mit dem Stabwerk: die Wahl «Ersatzbalken» entfällt, der vereinfachte Kern zeigt nur noch vorläufige Werte als «Kontrollrechnung». Gespeicherte Stände mit Ersatzbalken rechnen mit dem Stabwerk.', rechnung: true },
      { text: 'Kein Reiter «Profile» mehr: Profile, Bindebleche und Stückliste stehen zugeklappt unten im Reiter System.' },
      { text: 'Zustandslinie: Obergurt-Diagramme nach oben, Untergurt nach unten (Vorzeichen über Farbe); ohne Reaktionen; statt «Ansicht folgt» ein Knopf «Blick auf die Ebene».' },
    ],
  },
];

const datumText = (d) => d.split('-').reverse().join('.');

/** Das Protokoll als HTML für den Dialog. */
export function aenderungenHtml(esc = (s) => s) {
  return `<p class="notiz" style="margin-top:0">Was sich geändert hat, neueste zuerst.
      <span class="aend-rechnung">Σ</span> = ändert Nachweiszahlen; ein gespeicherter Stand kann
      danach anders dastehen.</p>
    ${AENDERUNGEN.length ? '' : '<p class="notiz">Noch keine Einträge.</p>'}
    ${AENDERUNGEN.map((t) => `<h4 class="aend-tag">${datumText(t.datum)}</h4>
      <ul class="aend-liste">${t.punkte.map((p) => `<li>${p.rechnung
        ? '<span class="aend-rechnung" title="ändert Nachweiszahlen">Σ</span> ' : ''}${esc(p.text)}</li>`).join('')}</ul>`).join('')}`;
}
