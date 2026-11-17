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
    datum: '2026-11-17',
    punkte: [
      { text: 'Fundament: Horizontalkraft und Moment zählen als Resultierende (H_tot, M_tot, M_ver gegen die Grenze M_ver,max); die Anteile ständig / veränderlich lenken den Ablauf, sind aber kein eigener Nachweis mehr. Gespeicherte Stände können beim Fundament tiefer liegen.', rechnung: true },
      { text: 'Anschluss Joch am Masten: Stufe «eingespannt bis zur Grenze der Hakenschrauben» unter Auflager wählbar; der Knopf «Grenzfeder K_X suchen» entfällt.', rechnung: true },
      { text: 'Kacheln Fundament, Verformung und Bügelschrauben nennen die massgebende Prüfung; Fussleiste mit derselben Zahl wie die Hauptkachel; Export ohne «Drucken».' },
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
