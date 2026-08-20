/**
 * render.skizzen.js
 * ---------------------------------------------------------------------------
 * KLEINE KRAFTBILDER zu den Kurven der Verläufe.
 *
 * WOZU
 * «T_x,ed = 0.83 kNm» ist eine Zahl; was sie am Joch anrichtet, steht nicht
 * dabei. Im Handbuch ist es gezeichnet, aber das Handbuch liegt in einem
 * anderen Fenster und man liest es nicht, während man am Träger schraubt.
 * Deshalb hier dasselbe Bild in klein: ein Klick auf eine Kurve in der
 * Legende, und darunter steht, welche Kräfte diese Grösse meint.
 *
 * Die Skizzen sind aus denselben Grössen aufgebaut wie die Formeln und tragen
 * deren Bezeichnungen - keine eigenen. Gezeichnet wird mit Klassen statt
 * festen Farben, damit sie dem hellen wie dem dunklen Thema folgen.
 * ---------------------------------------------------------------------------
 */

/** Linie mit gerechneter Pfeilspitze - Marker erben die Farbe nicht sicher. */
function pf(x1, y1, x2, y2, kl = 'sk-k') {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const L = 6, w = 2.6;
  const px = x2 - L * Math.cos(a), py = y2 - L * Math.sin(a);
  const p1 = `${(px + w * Math.sin(a)).toFixed(1)},${(py - w * Math.cos(a)).toFixed(1)}`;
  const p2 = `${(px - w * Math.sin(a)).toFixed(1)},${(py + w * Math.cos(a)).toFixed(1)}`;
  return `<line class="${kl}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`
       + `<path class="${kl}-f" d="M${x2} ${y2}L${p1}L${p2}z"/>`;
}

/** Bogenpfeil, für Momente und Torsion. */
function bogen(cx, cy, r, von, bis, kl = 'sk-k') {
  const p = (w) => [cx + r * Math.cos(w), cy + r * Math.sin(w)];
  const [x1, y1] = p(von), [x2, y2] = p(bis);
  const gross = Math.abs(bis - von) > Math.PI ? 1 : 0;
  const t = bis - 0.001 * Math.sign(bis - von);
  const [tx, ty] = p(t);
  const a = t + (Math.PI / 2) * Math.sign(bis - von);
  const L = 6, w = 2.6;
  const px = tx - L * Math.cos(a), py = ty - L * Math.sin(a);
  return `<path class="${kl}" fill="none" d="M${x1.toFixed(1)} ${y1.toFixed(1)}`
       + ` A${r} ${r} 0 ${gross} ${bis > von ? 1 : 0} ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`
       + `<path class="${kl}-f" d="M${tx.toFixed(1)} ${ty.toFixed(1)}`
       + `L${(px + w * Math.sin(a)).toFixed(1)},${(py - w * Math.cos(a)).toFixed(1)}`
       + `L${(px - w * Math.sin(a)).toFixed(1)},${(py + w * Math.cos(a)).toFixed(1)}z"/>`;
}

const txt = (x, y, s, kl = 'sk-t', anker = 'middle') =>
  `<text class="${kl}" x="${x}" y="${y}" text-anchor="${anker}">${s}</text>`;

/** Träger in Seitenansicht: zwei Gurte, Pfosten, zwei Auflager. */
function balken(y0 = 26, y1 = 54) {
  let g = `<line class="sk-stahl" x1="18" y1="${y0}" x2="182" y2="${y0}"/>`
        + `<line class="sk-stahl" x1="18" y1="${y1}" x2="182" y2="${y1}"/>`;
  for (let i = 0; i <= 6; i++) {
    const x = 18 + (164 * i) / 6;
    g += `<line class="sk-blech" x1="${x.toFixed(1)}" y1="${y0}" x2="${x.toFixed(1)}" y2="${y1}"/>`;
  }
  g += `<path class="sk-aufl" d="M18 ${y1}l-5 9h10z"/>`
     + `<path class="sk-aufl" d="M182 ${y1}l-5 9h10z"/>`;
  return g;
}

/** Querschnitt: der geschlossene Kasten aus vier Ebenen. */
function kasten(cx = 100, cy = 42, b = 46, h = 26) {
  return `<rect class="sk-kasten" x="${cx - b}" y="${cy - h}" width="${2 * b}"`
       + ` height="${2 * h}"/>`
       + [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sy, sz]) =>
           `<rect class="sk-eck" x="${cx + sy * b - 4}" y="${cy + sz * h - 4}"`
           + ` width="8" height="8"/>`).join('');
}

const bild = (inhalt, text) => ({ svg:
  `<svg viewBox="0 0 200 84" role="img" class="sk">${inhalt}</svg>`, text });

/**
 * Ein Kraftbild je Grösse. Der Schlüssel steht an der Serie des Diagramms
 * (siehe render.charts.js), damit Kurve und Bild nicht auseinanderlaufen.
 */
export const SKIZZEN = {
  My: () => bild(
    balken() + pf(60, 8, 60, 22) + pf(140, 8, 140, 22)
    + txt(60, 6, 'F') + txt(140, 6, 'F')
    + pf(30, 40, 60, 40, 'sk-druck') + pf(170, 40, 140, 40, 'sk-druck')
    + txt(100, 24, 'Druck', 'sk-t2')
    + txt(100, 68, 'Zug', 'sk-t2')
    + pf(30, 50, 60, 50, 'sk-zug') + pf(170, 50, 140, 50, 'sk-zug'),
    'M_y biegt das Joch lotrecht. Es wird als Kräftepaar zwischen Ober- und '
    + 'Untergurt abgetragen: N = M_y/h, oben Druck, unten Zug.'),

  Vz: () => bild(
    balken() + pf(100, 8, 100, 22) + txt(100, 6, 'F')
    + pf(45, 30, 45, 50, 'sk-quer') + pf(155, 50, 155, 30, 'sk-quer')
    + txt(45, 74, 'V_z', 'sk-t2') + txt(155, 74, 'V_z', 'sk-t2')
    + txt(100, 74, 'getragen von den zwei Vertikalebenen', 'sk-t2'),
    'V_z ist die lotrechte Querkraft. Sie läuft über die beiden SEITLICHEN '
    + 'Ebenen zu den Auflagern, je zur Hälfte.'),

  Mz: () => bild(
    kasten() + pf(100, 6, 100, 14, 'sk-quer')
    + pf(30, 20, 60, 20) + pf(170, 20, 140, 20)
    + txt(100, 12, 'M_z', 'sk-t2')
    + pf(54, 42, 54, 42) + txt(54, 78, 'Ebene links', 'sk-t2')
    + txt(146, 78, 'Ebene rechts', 'sk-t2')
    + txt(100, 46, 'Kräftepaar über b', 'sk-t2'),
    'M_z biegt das Joch im Grundriss - Wind in Gleisrichtung. Kräftepaar '
    + 'zwischen den beiden SEITLICHEN Ebenen im Abstand b.'),

  Tx: () => bild(
    kasten()
    + bogen(100, 42, 34, -2.5, 2.2, 'sk-tors')
    + pf(54, 30, 146, 30, 'sk-fluss') + pf(146, 54, 54, 54, 'sk-fluss')
    + txt(100, 20, 'q_T = T_x / (2·b·h)', 'sk-t2')
    + txt(100, 80, 'läuft um: oben und unten gegenläufig', 'sk-t2'),
    'T_x dreht das Joch um seine Achse. Der Schubfluss LÄUFT UM den '
    + 'geschlossenen Kasten - er addiert sich auf einer Ebene und zieht auf '
    + 'der gegenüberliegenden ab.'),

  Vebene: () => bild(
    kasten()
    + pf(54, 30, 146, 30, 'sk-fluss') + pf(146, 54, 54, 54, 'sk-fluss')
    + pf(54, 24, 146, 24, 'sk-quer') + pf(54, 60, 146, 60, 'sk-quer')
    + txt(100, 16, 'V_Balken/2 (beide gleich)', 'sk-t2')
    + txt(100, 80, '+ Schubfluss: einmal dazu, einmal weg', 'sk-t2'),
    'Die Ebenenquerkraft ist die Summe aus halber Balkenquerkraft und dem '
    + 'Schubfluss aus Torsion. Weil der Schubfluss umläuft, ist EINE Ebene '
    + 'stärker beansprucht als die gegenüberliegende.'),

  Mlokal: () => bild(
    `<line class="sk-stahl" x1="20" y1="26" x2="180" y2="26"/>`
    + `<line class="sk-stahl" x1="20" y1="58" x2="180" y2="58"/>`
    + `<rect class="sk-blech-f" x="60" y="26" width="12" height="32"/>`
    + `<rect class="sk-blech-f" x="128" y="26" width="12" height="32"/>`
    + pf(90, 16, 110, 16, 'sk-quer')
    + txt(100, 12, 'V_Ebene', 'sk-t2')
    + bogen(66, 26, 9, 3.4, 5.6) + bogen(134, 58, 9, 0.4, 2.6)
    + txt(100, 44, 'a₁', 'sk-t2')
    + txt(100, 76, 'M am Anschnitt, nicht auf der Achse', 'sk-t2'),
    'Im Vierendeel-Feld biegt die Ebenenquerkraft den Gurt zwischen zwei '
    + 'Blechen. Nachgewiesen wird am ANSCHNITT des Blechs: M = M_Knoten · '
    + '(a₁ − b_Bl)/a₁.'),

  eta: () => bild(
    `<rect class="sk-bar" x="20" y="34" width="120" height="16"/>`
    + `<rect class="sk-bar-voll" x="20" y="34" width="96" height="16"/>`
    + `<line class="sk-grenze" x1="140" y1="26" x2="140" y2="58"/>`
    + txt(140, 22, 'η = 1', 'sk-t2')
    + txt(80, 46, 'σ_v / f_yd', 'sk-t3')
    + txt(100, 76, 'Ausnutzung: erreicht σ_v die Fliessgrenze?', 'sk-t2'),
    'η ist die Ausnutzung: Vergleichsspannung geteilt durch die '
    + 'Bemessungsfestigkeit f_yd = f_y/γ_M0. Bis 1 ist der Nachweis erfüllt.'),
};

/** Skizze zu einem Serienschlüssel; null, wenn es keine gibt. */
export function skizzeFuer(key) {
  const s = SKIZZEN[key];
  return s ? s() : null;
}
