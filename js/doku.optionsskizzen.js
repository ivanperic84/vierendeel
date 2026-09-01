/**
 * doku.optionsskizzen.js
 * ---------------------------------------------------------------------------
 * EIN BILD ZUR GETROFFENEN WAHL.
 *
 * Manche Einstellungen sind reine Geometrie: wo der Nachweis geschnitten wird,
 * wie der Mast ans Joch kommt, in welche Richtung der Steg steht. Sie standen
 * bisher als Prosa da - über die fünf längsten Hinweistexte gemessen rund
 * dreitausend Zeichen, und jeder einzelne beschreibt eine Lage im Raum.
 *
 * Wer eine Lage im Raum liest statt sieht, baut sie sich im Kopf nach. Das
 * ist genau der Umweg, den eine Skizze abkürzt - und zwar nicht als Zierrat
 * neben dem Text, sondern AN SEINER STELLE.
 *
 * >>> DIE SKIZZE ZEIGT DIE GEWÄHLTE STELLUNG, NICHT DEN SCHALTER. <<<
 *
 * Beide Möglichkeiten nebeneinander abzubilden hiesse, den Vergleich wieder
 * dem Leser zu überlassen. Gezeichnet wird, was gerade gilt; wer die andere
 * Stellung sehen will, schaltet um und sieht sie. Das Bild ist damit auch
 * eine Rückmeldung: es ändert sich, wenn man etwas ändert.
 *
 * DIESELBEN BAUSTEINE WIE IM HANDBUCH. Klassen statt fester Farben, damit die
 * Skizze dem hellen wie dem dunklen Aussehen folgt (`.hb-skizze` in
 * css/style.css). Was hier gezeichnet wird, könnte so im Handbuch stehen -
 * und umgekehrt.
 * ---------------------------------------------------------------------------
 */

/** Rahmen einer Optionsskizze. Kein Titel: die Beschriftung steht am Feld. */
const skizze = (beschriftung, viewBox, inhalt) =>
  `<figure class="hb-skizze opt-skizze">
     <svg viewBox="${viewBox}" role="img" aria-label="${beschriftung}">${inhalt}</svg>
   </figure>`;

/** Waagrechte Masslinie mit Pfeilen und Text darüber. */
const massW = (x1, x2, y, text) =>
  `<line class="m" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>` +
  `<line class="m" x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}"/>` +
  `<line class="m" x1="${x2}" y1="${y - 4}" x2="${x2}" y2="${y + 4}"/>` +
  `<text class="dim" x="${(x1 + x2) / 2}" y="${y - 6}" text-anchor="middle">${text}</text>`;

/*
 * DER KNOTENBEREICH: wo der Gurt nachgewiesen wird.
 *
 * Am Knoten überlappt das Bindeblech den Gurtwinkel und ist mit ihm
 * verschweisst - der Bereich ist biegesteif. Die Frage ist, ob der Nachweis am
 * ANSCHNITT dieses Bereichs geführt wird oder in der Blechachse. Das ist keine
 * Feinheit: zwischen beiden liegt der Faktor (a₁ − b_Bl)/a₁.
 */
const knotenbereich = (wert) => {
  // Die Stellung heisst `schwerachsen`, nicht `achse` - hier stand zuerst der
  // geratene Name, und damit zeigte die Skizze fuer BEIDE Stellungen dasselbe
  // Bild. Ein Bild, das sich nicht aendert, wenn man umschaltet, ist die
  // teuerste Art von falsch: es bestaetigt jede Wahl.
  const steif = wert !== 'schwerachsen';
  const yG = 92, xA = 60, xB = 260, xC = 460;
  const bl = 34;                       // halbe Blechbreite in Bildpunkten
  const stelle = steif ? xB + bl : xB; // Anschnitt oder Achse
  return skizze(
    steif ? 'Nachweis am Anschnitt des steifen Bereichs'
          : 'Nachweis in der Blechachse',
    // Der Rahmen muss den UNTERSTEN Punkt fassen, und das ist die zweite
    // Masslinie bei yG + 96, nicht der Gurt. Zu klein gesetzt schnitt er die
    // Masse einfach ab - sie waren gezeichnet und nicht zu sehen.
    '0 0 520 205', `
    <rect class="steif" x="${xB - bl}" y="${yG - 26}" width="${2 * bl}" height="52"/>
    <line class="b" x1="${xA}" y1="${yG}" x2="${xC}" y2="${yG}"/>
    <line class="d" x1="${xB}" y1="${yG - 44}" x2="${xB}" y2="${yG + 44}"/>
    <text class="dim" x="${xB}" y="${yG - 50}" text-anchor="middle">Blechachse</text>
    <line class="k" x1="${stelle}" y1="${yG - 34}" x2="${stelle}" y2="${yG + 34}"
      stroke-width="2.2"/>
    <text class="acc" x="${stelle + 6}" y="${yG + 48}">${
      steif ? 'Anschnitt – hier wird nachgewiesen' : 'hier wird nachgewiesen'}</text>
    ${massW(xB - bl, xB + bl, yG + 70, 'b_Bl')}
    ${massW(xA, xB, yG + 100, 'a₁')}
    <text class="dim" x="${xC - 4}" y="${yG - 10}" text-anchor="end">Gurt</text>
    <text class="dim" x="${xB - bl - 6}" y="${yG - 34}" text-anchor="end">steifer Bereich</text>
  `);
};

/*
 * DER MASTANSCHLUSS: über einen Punkt oder über die Jochhöhe.
 *
 * Läuft der Mast über die Anschlussebene hinaus und ist das Joch über seine
 * ganze Höhe angeschlossen, hält der Anschluss das Jochende zusätzlich gegen
 * Verdrehen - die Einspannung wird steifer (1.45 statt 1.00 · E·I/H). Der
 * Unterschied ist eine Lage, kein Beiwert: er steht im Bild.
 */
const mastAnschluss = (wert) => {
  const durch = wert !== 'kragarm';
  const xM = 120, zOG = 54, zUG = 116, zFuss = 176;
  return skizze(
    durch ? 'Mast durchlaufend, über die Jochhöhe angeschlossen'
          : 'Kragmast, in einem Punkt angeschlossen',
    '0 0 520 210', `
    <line class="b" x1="${xM}" y1="${durch ? 20 : zOG}" x2="${xM}" y2="${zFuss}"
      stroke-width="7"/>
    <line class="hl" x1="${xM - 26}" y1="${zFuss}" x2="${xM + 26}" y2="${zFuss}"
      stroke-width="2"/>
    ${[0, 1, 2, 3].map((i) => `<line class="hl" x1="${xM - 20 + i * 14}" y1="${zFuss}"
       x2="${xM - 28 + i * 14}" y2="${zFuss + 13}"/>`).join('')}
    <line class="b" x1="${xM + 40}" y1="${zOG}" x2="470" y2="${zOG}"/>
    <line class="b" x1="${xM + 40}" y1="${zUG}" x2="470" y2="${zUG}"/>
    ${[0, 1, 2, 3, 4].map((i) => `<line class="hl" x1="${xM + 76 + i * 66}" y1="${zOG}"
       x2="${xM + 76 + i * 66}" y2="${zUG}" stroke-width="1.4"/>`).join('')}
    ${durch
      ? `<line class="k" x1="${xM + 6}" y1="${zOG}" x2="${xM + 40}" y2="${zOG}" stroke-width="2.4"/>
         <line class="k" x1="${xM + 6}" y1="${zUG}" x2="${xM + 40}" y2="${zUG}" stroke-width="2.4"/>
         <circle class="kn" cx="${xM + 40}" cy="${zOG}" r="4.5"/>
         <circle class="kn" cx="${xM + 40}" cy="${zUG}" r="4.5"/>
         <text class="acc" x="${xM + 50}" y="${zOG - 10}">über die Jochhöhe angeschlossen</text>
         <text class="dim" x="${xM}" y="14" text-anchor="middle">läuft durch</text>`
      : `<line class="k" x1="${xM + 6}" y1="${(zOG + zUG) / 2}" x2="${xM + 40}"
           y2="${(zOG + zUG) / 2}" stroke-width="2.4"/>
         <circle class="kn" cx="${xM + 40}" cy="${(zOG + zUG) / 2}" r="5"/>
         <text class="acc" x="${xM + 50}" y="${(zOG + zUG) / 2 - 10}">ein Anschlusspunkt</text>
         <text class="dim" x="${xM}" y="${zOG - 12}" text-anchor="middle">endet hier</text>`}
    <text class="dim" x="466" y="${zOG - 8}" text-anchor="end">Obergurt</text>
    <text class="dim" x="466" y="${zUG + 16}" text-anchor="end">Untergurt</text>
    <text class="acc" x="${xM + 50}" y="${zFuss - 12}">c_φ = ${
      durch ? '1.45' : '1.00'} · E·I/H</text>
  `);
};

/*
 * DIE STEGRICHTUNG: welche Achse quer zum Gleis steht.
 *
 * Gezeichnet in der DRAUFSICHT. Die Jochachse laeuft waagrecht durchs Bild;
 * sie steht quer zum Gleis, denn das Joch spannt ueber die Gleise. Der Wind,
 * der das Joch trifft, kommt aus Gleisrichtung und drueckt laengs der
 * Jochachse gegen den Mast.
 *
 * WAS FALSCH WAR (1. September). Der Fall «Steg in Jochachse» zeichnete
 * einen SENKRECHTEN Steg, also einen Steg quer zur Jochachse - das Gegenteil
 * seines Namens. Und weil die waagrechte Ausdehnung dabei aus den Flanschen
 * kam, war sie die Flanschbreite b, stand aber als Profilhoehe h
 * angeschrieben. Beide Bilder waren vertauscht und in sich widerspruechlich.
 *
 * SO IST ES RICHTIG. Die Profilhoehe h misst ENTLANG DES STEGS, die
 * Flanschbreite b quer dazu. Liegt der Steg in der Jochachse, misst h
 * waagrecht; die Biegung in dieser Ebene laeuft dann ueber die starke Achse.
 * Das ist der Normalfall: der Steg bildet die Normale zum Gleis.
 */
const mastSteg = (wert) => {
  const inJochachse = wert !== 'quer';
  const cx = 210, cy = 78;
  // Profilmasse im Bild: h entlang des Stegs, b quer dazu.
  const h = 68, b = 60, tf = 7, tw = 10;
  const r = (x, y, w, hh) =>
    `<rect class="st" x="${x}" y="${y}" width="${w}" height="${hh}"/>`;
  const I = inJochachse
    // Steg WAAGRECHT, also in der Jochachse. Die Flansche stehen senkrecht
    // an seinen Enden; h misst damit waagrecht.
    ? r(cx - h / 2, cy - tw / 2, h, tw)
      + r(cx - h / 2, cy - b / 2, tf, b)
      + r(cx + h / 2 - tf, cy - b / 2, tf, b)
    // Steg SENKRECHT, also laengs zum Gleis. Waagrecht misst jetzt b.
    : r(cx - tw / 2, cy - h / 2, tw, h)
      + r(cx - b / 2, cy - h / 2, b, tf)
      + r(cx - b / 2, cy + h / 2 - tf, b, tf);
  return skizze(
    inJochachse ? 'Steg quer zum Gleis, starke Achse quer zum Gleis'
                : 'Steg laengs zum Gleis, schwache Achse quer zum Gleis',
    '0 0 520 160', `
    <line class="d" x1="40" y1="${cy}" x2="480" y2="${cy}"/>
    <text class="dim" x="46" y="${cy - 8}">Jochachse · quer zum Gleis</text>
    ${I}
    <line class="k" x1="330" y1="${cy}" x2="266" y2="${cy}" stroke-width="2.2"/>
    <path class="kf" d="M266 ${cy}L276 ${cy - 4.5}L276 ${cy + 4.5}z"/>
    <text class="acc" x="338" y="${cy + 4}">Wind quer</text>
    <text class="dim" x="${cx}" y="146" text-anchor="middle">${
      inJochachse ? 'Steg quer zum Gleis, h waagrecht · starke Achse'
                  : 'Steg längs zum Gleis, b waagrecht · schwache Achse'}</text>
  `);
};

/** Welche Felder eine Skizze führen. */
const SKIZZEN = {
  knotenbereich,
  mastAnschluss,
  mastSteg,
};

/**
 * Die Skizze zu einem Feld in seiner aktuellen Stellung, oder ''.
 *
 * Gibt eine leere Zeichenkette statt null, damit der Aufrufer sie ohne
 * Fallunterscheidung einsetzen kann.
 */
export function optionsSkizze(key, wert) {
  const f = SKIZZEN[key];
  return f ? f(wert) : '';
}

/** Für den Prüfstand: welche Felder eine Skizze haben. */
export const SKIZZEN_FELDER = Object.keys(SKIZZEN);
