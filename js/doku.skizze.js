/**
 * doku.skizze.js
 * ---------------------------------------------------------------------------
 * DIE ZEICHENBAUSTEINE DER SKIZZEN - PFEIL, MASS, KNOTEN, FEDER.
 *
 * >>> WARUM EIN EIGENES MODUL. <<<
 *
 * Weisung vom 9. September: «mach bei der darstellung der Auflager, eine
 * ansicht und schnitt, so im stil wie im handbuch hinterlegt.»
 *
 * «Im Stil des Handbuchs» heisst nicht: nachgezeichnet, sondern MIT
 * DENSELBEN BAUSTEINEN. Ein Pfeil, der hier anders aussieht als dort, ist
 * ein zweiter Pfeil - und zwei Pfeile, die dasselbe meinen, laufen mit der
 * Zeit auseinander. Sie standen bis jetzt als lokale Konstanten in
 * `doku.handbuch.js`; hier stehen sie einmal, und beide zeichnen damit.
 *
 * DER STIL: Strichzeichnung, keine Farben im Quelltext. Gezeichnet wird mit
 * KLASSEN (`b` Bauteil, `d` Achse, `k` Kraft, `m` Mass, `dim` Beschriftung),
 * die das Blatt einfaerbt - so folgt jede Skizze dem hellen wie dem dunklen
 * Thema, und die Bauteilfarben sind dieselben wie im Modell.
 *
 * Reine Darstellung: kein Rechnen, kein Zustand.
 * ---------------------------------------------------------------------------
 */

/**
 * Der Rahmen einer Skizze: Bild und Unterschrift.
 *
 * Die Klasse `skizze` traegt die Zeichenregeln, die zweite (`hb-skizze`,
 * `al-skizze`) die Groesse am jeweiligen Ort - im Handbuch ueber die
 * Textbreite, in der Maske schmal.
 */
export const skizze = (titel, viewBox, inhalt, kl = 'hb-skizze') =>
  `<figure class="skizze ${kl}">
     <svg viewBox="${viewBox}" role="img" aria-label="${titel}">${inhalt}</svg>
     ${titel ? `<figcaption>${titel}</figcaption>` : ''}
   </figure>`;

/** Linie mit Pfeilspitze. Die Spitze wird gerechnet, nicht ueber einen Marker
 *  gelegt - Marker erben die Farbe nicht zuverlaessig. */
export const pf = (x1, y1, x2, y2, kl = 'k') => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const L = 7.5, w = 3.2;
  const px = x2 - L * Math.cos(a), py = y2 - L * Math.sin(a);
  const p1 = `${(px + w * Math.sin(a)).toFixed(1)},${(py - w * Math.cos(a)).toFixed(1)}`;
  const p2 = `${(px - w * Math.sin(a)).toFixed(1)},${(py + w * Math.cos(a)).toFixed(1)}`;
  return `<line class="${kl}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>` +
         `<path class="${kl}f" d="M${x2} ${y2}L${p1}L${p2}z"/>`;
};

/** Masslinie mit Pfeilen an beiden Enden und Text in der Mitte. */
export const mass = (x1, y1, x2, y2, text, dy = -4) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const senk = Math.abs(x2 - x1) < Math.abs(y2 - y1);
  return pf(mx, my, x1, y1, 'm') + pf(mx, my, x2, y2, 'm') +
    `<text class="dim" x="${senk ? mx + 5 : mx}" y="${senk ? my + 3 : my + dy}"` +
    ` text-anchor="${senk ? 'start' : 'middle'}">${text}</text>`;
};

/** Anschlusspunkt / Knoten. */
export const knoten = (x, y, r = 4) => `<circle class="kn" cx="${x}" cy="${y}" r="${r}"/>`;

/** Eckwinkel im Querschnitt, als kleines Quadrat auf der Schwerachse. */
export const winkel = (x, y, s = 9) =>
  `<rect class="st" x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}"/>`;

/** Kraft aus der Ebene heraus (⊙) bzw. in sie hinein (⊗). */
export const raus = (x, y, r = 6, kl = 'k') =>
  `<circle class="${kl}" cx="${x}" cy="${y}" r="${r}" fill="none"/>` +
  `<circle class="${kl}f" cx="${x}" cy="${y}" r="1.8"/>`;
export const rein = (x, y, r = 6, kl = 'k') =>
  `<circle class="${kl}" cx="${x}" cy="${y}" r="${r}" fill="none"/>` +
  `<line class="${kl}" x1="${x - r * 0.7}" y1="${y - r * 0.7}" x2="${x + r * 0.7}" y2="${y + r * 0.7}"/>` +
  `<line class="${kl}" x1="${x + r * 0.7}" y1="${y - r * 0.7}" x2="${x - r * 0.7}" y2="${y + r * 0.7}"/>`;

export const txt = (x, y, s, kl = '', anker = 'middle') =>
  `<text class="${kl}" x="${x}" y="${y}" text-anchor="${anker}">${s}</text>`;

/**
 * Eine Schraubenfeder als Zickzack, von (x,y) in die Richtung (dx,dy).
 *
 * Sie steht dort, wo eine Halterung KEINE ist, sondern eine Zahl - das
 * Zeichen dafuer, dass der Punkt nachgibt. Vier Windungen reichen, um sie
 * auf zwanzig Bildpunkten als Feder zu erkennen.
 */
export const feder = (x, y, dx, dy, laenge = 22, kl = 'k', windungen = 4) => {
  const n = Math.hypot(dx, dy) || 1;
  const ux = dx / n, uy = dy / n;          // laengs
  const qx = -uy, qy = ux;                 // quer
  const a = laenge * 0.22;                 // gerades Stueck an beiden Enden
  const s = (laenge - 2 * a) / windungen;  // Schrittweite je Windung
  const w = 3.4;                           // Ausschlag
  const p = [[x, y], [x + ux * a, y + uy * a]];
  for (let i = 0; i < windungen; i += 1) {
    const t = a + s * (i + 0.5);
    const v = (i % 2 === 0 ? 1 : -1) * w;
    p.push([x + ux * t + qx * v, y + uy * t + qy * v]);
  }
  p.push([x + ux * (laenge - a), y + uy * (laenge - a)]);
  p.push([x + ux * laenge, y + uy * laenge]);
  return `<polyline class="${kl}" fill="none" points="${
    p.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ')}"/>`;
};
