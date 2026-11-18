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
