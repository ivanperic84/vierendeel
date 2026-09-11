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

/* ===========================================================================
 * DER LIEGENDE TRAEGER - IN DRAUFSICHT
 * ===========================================================================
 *
 * Weisung vom 11. September: «Die hier aufgefuehrten diagramme sind auf ihre
 * richtigkeit zu ueberpruefen.»
 *
 * Sie waren es nicht. Die Kurven des Abfangjochs trugen die Bilder des
 * TRAGJOCHS: unter «M Rahmenebene» stand «M_y biegt das Joch lotrecht … oben
 * Druck, unten Zug», unter «N Kraeftepaar» das Bild der Ebenenquerkraft, und
 * unter «M Torsion» der umlaufende Schubfluss eines geschlossenen Kastens.
 *
 * Das Abfangjoch hat weder vier Ebenen noch einen Ober- und einen Untergurt.
 * Es LIEGT: zwei Gurte NEBENEINANDER, die Rahmenebene waagrecht. Deshalb ein
 * eigener Baustein - dieselbe Bildsprache, aber von oben gesehen.
 * ========================================================================= */

/** Der liegende Traeger in DRAUFSICHT: zwei Gurte nebeneinander, Bleche. */
function liegend(y0 = 26, y1 = 54) {
  let g = `<line class="sk-stahl" x1="18" y1="${y0}" x2="182" y2="${y0}"/>`
        + `<line class="sk-stahl" x1="18" y1="${y1}" x2="182" y2="${y1}"/>`;
  for (let i = 0; i <= 6; i++) {
    const x = 18 + (164 * i) / 6;
    g += `<line class="sk-blech" x1="${x.toFixed(1)}" y1="${y0}"`
       + ` x2="${x.toFixed(1)}" y2="${y1}"/>`;
  }
  // Die Auflager liegen an den Enden - der Mast steht darunter, nicht daneben.
  g += `<rect class="sk-eck" x="14" y="${(y0 + y1) / 2 - 4}" width="8" height="8"/>`
     + `<rect class="sk-eck" x="178" y="${(y0 + y1) / 2 - 4}" width="8" height="8"/>`;
  return g;
}

/* ===========================================================================
 * DAS ACHSENKREUZ - WORAUF MAN SCHAUT
 * ===========================================================================
 *
 * Weisung vom 11. September: «ich verstehe diese abbildung nicht ganz, kann
 * man zusaetzlich noch die achsen anzeigen zur orientierung.»
 *
 * Ein Bild des liegenden Traegers sieht in der Draufsicht genauso aus wie
 * eines des stehenden in der Seitenansicht - zwei parallele Linien mit
 * Pfosten dazwischen. Ohne Achsen ist nicht zu sehen, WELCHE Ebene gemeint
 * ist, und genau das entscheidet ueber alles Weitere.
 *
 * Die Achsen des Werkzeugs: x die Jochachse (quer zum Gleis), y die
 * Gleisrichtung, z lotrecht. Das Kreuz steht unten links und nennt die
 * beiden Achsen, die in der Bildebene liegen.
 * ========================================================================= */
/**
 * EINE KRAFT SENKRECHT ZUR BILDEBENE.
 *
 * `raus` true: sie zeigt auf den Betrachter zu (Kreis mit Punkt),
 * false: von ihm weg (Kreis mit Kreuz). Die uebliche Konvention.
 *
 * Gebraucht im QUERSCHNITT: ein Moment um die lotrechte Achse erzeugt ein
 * Kraeftepaar in TRAEGERRICHTUNG - und die steht dort senkrecht auf dem
 * Papier. Hier stand zuerst ein Pfeilpaar in der Bildebene; es zeigte nach
 * innen und las sich als Druck auf beide Ebenen, was ein Kraeftepaar
 * gerade nicht ist.
 */
function quer(cx, cy, raus, kl = 'sk-k', r = 6) {
  const g = `<circle class="${kl}" cx="${cx}" cy="${cy}" r="${r}"`
          + ` fill="none"/>`;
  if (raus) return g + `<circle class="${kl}-f" cx="${cx}" cy="${cy}" r="2"/>`;
  const d = r * 0.7;
  return g
    + `<line class="${kl}" x1="${cx - d}" y1="${cy - d}" x2="${cx + d}"`
    + ` y2="${cy + d}"/>`
    + `<line class="${kl}" x1="${cx + d}" y1="${cy - d}" x2="${cx - d}"`
    + ` y2="${cy + d}"/>`;
}

function achsen(a1, a2, x = 16, y = 74) {
  const L = 11;
  return pf(x, y, x + L, y, 'sk-achse')
       + pf(x, y, x, y - L, 'sk-achse')
       + txt(x + L + 5, y + 3, a1, 'sk-t3')
       + txt(x - 1, y - L - 3, a2, 'sk-t3');
}

const bild = (inhalt, text) => ({ svg:
  `<svg viewBox="0 0 200 90" role="img" class="sk">${inhalt}</svg>`, text });

/**
 * Ein Kraftbild je Grösse. Der Schlüssel steht an der Serie des Diagramms
 * (siehe render.charts.js), damit Kurve und Bild nicht auseinanderlaufen.
 */
export const SKIZZEN = {
  /*
   * >>> ZUG UND DRUCK ZEIGEN GEGENEINANDER. <<<
   *
   * Weisung vom 11. September: «sollte der zug nich pfeile zeigen die
   * entgegen gerichtet sind als anders als beim druck.»
   *
   * Er sollte, und er tat es nicht: beide Reihen liefen von aussen nach
   * innen. Fuer den gedrueckten Gurt ist das richtig - die Kraefte druecken
   * ihn zusammen -, fuer den gezogenen ist es das Gegenteil dessen, was
   * geschieht. Der Fehler stand hier, seit es das Bild gibt.
   *
   *   DRUCK   Pfeile zeigen IN den Gurt hinein     -->   <--
   *   ZUG     Pfeile zeigen AUS dem Gurt heraus    <--   -->
   */
  My: () => bild(
    balken() + pf(60, 8, 60, 22) + pf(140, 8, 140, 22)
    + txt(60, 6, 'F') + txt(140, 6, 'F')
    + pf(30, 40, 60, 40, 'sk-druck') + pf(170, 40, 140, 40, 'sk-druck')
    + txt(100, 24, 'Druck', 'sk-t2')
    + txt(100, 68, 'Zug', 'sk-t2')
    + pf(60, 50, 30, 50, 'sk-zug') + pf(140, 50, 170, 50, 'sk-zug')
    + achsen('x', 'z'),
    'Seitenansicht des stehenden Jochs. M_y biegt es lotrecht; das Moment '
    + 'wird als Kräftepaar zwischen Ober- und Untergurt abgetragen: '
    + 'N = M_y/h. Der Obergurt wird GEDRÜCKT (Pfeile nach innen), der '
    + 'Untergurt GEZOGEN (Pfeile nach aussen).'),

  Vz: () => bild(
    balken() + pf(100, 8, 100, 22) + txt(100, 6, 'F')
    + pf(45, 30, 45, 50, 'sk-quer') + pf(155, 50, 155, 30, 'sk-quer')
    + txt(45, 74, 'V_z', 'sk-t2') + txt(155, 74, 'V_z', 'sk-t2')
    + txt(100, 74, 'getragen von den zwei Vertikalebenen', 'sk-t2')
    + achsen('x', 'z'),
    'V_z ist die lotrechte Querkraft. Sie läuft über die beiden SEITLICHEN '
    + 'Ebenen zu den Auflagern, je zur Hälfte.'),

  /*
   * >>> DAS KRAEFTEPAAR STEHT SENKRECHT AUF DEM PAPIER. <<<
   *
   * M_z dreht um die LOTRECHTE Achse; sein Kraeftepaar wirkt damit in
   * Traegerrichtung - und die zeigt im Querschnitt aus dem Bild heraus.
   * Hier standen zwei Pfeile IN der Bildebene, beide nach innen: das las
   * sich als Druck auf beide Ebenen, und ein Kraeftepaar ist das nicht.
   * Dazu ein Pfeil der Laenge null, der nur einen Fleck hinterliess.
   */
  Mz: () => bild(
    kasten() + bogen(100, 42, 22, -1.2, 1.2, 'sk-quer')
    + txt(100, 12, 'M_z', 'sk-t2')
    + quer(54, 42, false, 'sk-druck') + quer(146, 42, true, 'sk-zug')
    + txt(54, 78, 'Ebene links: Druck', 'sk-t2')
    + txt(146, 78, 'Ebene rechts: Zug', 'sk-t2')
    + txt(100, 66, 'Kräftepaar über b', 'sk-t2')
    + achsen('y', 'z'),
    'QUERSCHNITT, Blick in die Jochachse. M_z biegt das Joch im Grundriss - '
    + 'Wind in Gleisrichtung. Das Kräftepaar wirkt in TRÄGERRICHTUNG, also '
    + 'senkrecht zum Papier: ⊗ drückt vom Betrachter weg, ⊙ zieht auf ihn '
    + 'zu. Die beiden seitlichen Ebenen stehen im Abstand b.'),

  Tx: () => bild(
    kasten()
    + bogen(100, 42, 34, -2.5, 2.2, 'sk-tors')
    + pf(54, 30, 146, 30, 'sk-fluss') + pf(146, 54, 54, 54, 'sk-fluss')
    + txt(100, 20, 'q_T = T_x / (2·b·h)', 'sk-t2')
    + txt(100, 80, 'läuft um: oben und unten gegenläufig', 'sk-t2')
    + achsen('y', 'z'),
    'T_x dreht das Joch um seine Achse. Der Schubfluss LÄUFT UM den '
    + 'geschlossenen Kasten - er addiert sich auf einer Ebene und zieht auf '
    + 'der gegenüberliegenden ab.'),

  Vebene: () => bild(
    kasten()
    + pf(54, 30, 146, 30, 'sk-fluss') + pf(146, 54, 54, 54, 'sk-fluss')
    + pf(54, 24, 146, 24, 'sk-quer') + pf(54, 60, 146, 60, 'sk-quer')
    + txt(100, 16, 'V_Balken/2 (beide gleich)', 'sk-t2')
    + txt(100, 80, '+ Schubfluss: einmal dazu, einmal weg', 'sk-t2')
    + achsen('y', 'z'),
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
    + txt(100, 76, 'M am Anschnitt, nicht auf der Achse', 'sk-t2')
    + achsen('x', 'z'),
    'Im Vierendeel-Feld biegt die Ebenenquerkraft den Gurt zwischen zwei '
    + 'Blechen. Nachgewiesen wird am ANSCHNITT des Blechs: M = M_Knoten · '
    + '(a₁ − b_Bl)/a₁.'),

  /* =========================================================================
   * DIE BILDER DES ABFANGJOCHS
   * =========================================================================
   *
   * Schluessel mit `abf`, damit sie sich von denen des Tragjochs
   * unterscheiden - sie sahen einander sonst zu aehnlich, und genau das ist
   * am 11. September schiefgegangen.
   * ======================================================================= */

  /** Das Kraeftepaar der waagrechten Rahmenebene. */
  /*
   * >>> DER LEITERZUG STEHT AUF DER ZUGSEITE. <<<
   *
   * Weisung vom 11. September: «den leiterzug wuerde ich immer auf die
   * zuseite nehmen.»
   *
   * Er stand oben, mit Pfeilen AUF den Traeger zu - und las sich damit wie
   * ein Druck von aussen. Ein abgefangener Leiter ZIEHT aber: er haengt am
   * Traeger und zieht in seine Richtung. Auf der Zugseite angesetzt und vom
   * Traeger WEG gerichtet sagt der Pfeil, was wirklich geschieht.
   *
   * Und die Biegung bleibt dieselbe: eine Kraft, die nach unten zieht, biegt
   * den Traeger nach unten - gleichgueltig, an welcher Faser man den Pfeil
   * ansetzt. Der abgewandte Gurt wird gedrueckt, der zugewandte gezogen.
   */
  abfN: () => bild(
    /*
     * DIE HOEHEN SIND ABGEZAEHLT. Der Traeger liegt zwischen y = 26 und 54;
     * darueber der Druck, darunter der Zug, ganz unten der Leiterzug. Bei
     * 84 Pixeln Bildhoehe ueberlappen zwei Textzeilen sonst sofort - und
     * eine Beschriftung, die man nicht lesen kann, ist keine.
     */
    liegend()
    + txt(100, 12, 'abgewandter Gurt: Druck', 'sk-t2')
    // Druck: nach innen. Zug: nach aussen. Siehe den Kasten bei `My`.
    + pf(42, 20, 72, 20, 'sk-druck') + pf(158, 20, 128, 20, 'sk-druck')
    + `<line class="sk-mass" x1="34" y1="26" x2="34" y2="54"/>`
    + txt(40, 43, 'e', 'sk-t2', 'start')
    + pf(72, 62, 42, 62, 'sk-zug') + pf(128, 62, 158, 62, 'sk-zug')
    + txt(100, 74, 'Gurt auf der Zugseite: Zug', 'sk-t2')
    // Der Leiterzug greift am Gurt der Zugseite an und zieht von ihm weg.
    + pf(70, 54, 70, 68, 'sk-zug') + pf(130, 54, 130, 68, 'sk-zug')
    + txt(100, 84, 'Leiterzug in Gleisrichtung — er ZIEHT', 'sk-t2')
    + achsen('x', 'y', 14, 20),
    'DRAUFSICHT auf den liegenden Träger — von oben gesehen. x ist die '
    + 'Jochachse (quer zum Gleis), y die Gleisrichtung. Der Leiterzug zieht '
    + 'in y und biegt den Träger in seiner WAAGRECHTEN Rahmenebene. Das '
    + 'Moment wird zum Kräftepaar zwischen den beiden Gurten: '
    + 'N = M_Rahmen/e, mit e als Abstand der Schwerachsen. Der Gurt auf der '
    + 'Zugseite wird GEZOGEN (Pfeile nach aussen), der abgewandte '
    + 'GEDRÜCKT (Pfeile nach innen).'),

  /** Die Querkraft derselben Ebene. */
  abfV: () => bild(
    liegend()
    + pf(90, 12, 110, 12, 'sk-quer')
    + txt(100, 8, 'V_Rahmen', 'sk-t2')
    /*
     * DER NULLPFEIL IST RAUS. Hier stand `pf(30, 40, 30, 40)` - Anfang und
     * Ende derselbe Punkt. `Math.atan2(0, 0)` gibt null, die Spitze fiel
     * auf den Schaft, und im Bild blieb ein Fleck ohne Bedeutung stehen.
     *
     * DIE BEIDEN PFEILE an den Enden sind das VORZEICHENPAAR der Querkraft:
     * links laeuft sie in die eine, rechts in die andere Richtung - so wie
     * die Kurve im Diagramm daneben durch null geht.
     */
    + pf(45, 20, 45, 60, 'sk-quer')
    + pf(155, 60, 155, 20, 'sk-quer')
    + txt(100, 44, 'auf beide Gurte, je zur Hälfte', 'sk-t2')
    + txt(100, 76, 'sie biegt den Gurt zwischen zwei Blechen', 'sk-t2')
    + achsen('x', 'y'),
    'Die Querkraft der waagrechten Rahmenebene läuft über beide Gurte zu den '
    + 'Auflagern. Sie ist es, die den Gurt ÖRTLICH zwischen zwei Blechen '
    + 'biegt.'),

  /** Die lotrechte Biegung - quer zur Rahmenebene, im Schnitt gezeigt. */
  abfMvert: () => bild(
    `<rect class="sk-eck" x="56" y="30" width="10" height="24"/>`
    + `<rect class="sk-eck" x="134" y="30" width="10" height="24"/>`
    + `<line class="sk-blech" x1="61" y1="42" x2="139" y2="42"/>`
    + pf(61, 10, 61, 26) + pf(139, 10, 139, 26)
    + txt(61, 7, 'q/2', 'sk-t2') + txt(139, 7, 'q/2', 'sk-t2')
    + txt(100, 46, 'e', 'sk-t2')
    + txt(100, 70, 'jeder Gurt für sich, über seine starke Achse', 'sk-t2')
    + achsen('y', 'z'),
    'Schnitt quer zur Trägerachse. Eigengewicht und Schnee wirken lotrecht — '
    + 'quer zur Rahmenebene. Jeder Gurt trägt die HALBE Last über seine '
    + 'starke Achse; ein Kräftepaar gibt es dafür nicht.'),

  /** Die Woelbkrafttorsion: gegenlaeufige lotrechte Gurtbiegung. */
  abfTors: () => bild(
    `<rect class="sk-eck" x="56" y="30" width="10" height="24"/>`
    + `<rect class="sk-eck" x="134" y="30" width="10" height="24"/>`
    + `<line class="sk-blech" x1="61" y1="42" x2="139" y2="42"/>`
    + bogen(100, 42, 30, -2.6, 2.3, 'sk-tors')
    /*
     * NICHT IN ZUG-/DRUCKFARBEN. Die beiden Kraefte ±T/e sind ein
     * KRAEFTEPAAR - gegenlaeufige LOTRECHTE Kraefte, keine Normalkraefte
     * im Gurt. Gruen und rot daneben laesen sie als Zug und Druck, und
     * das sind sie nicht: sie erzeugen erst die Biegung, aus der die
     * Normalspannung folgt.
     */
    + pf(61, 26, 61, 8, 'sk-quer') + pf(139, 58, 139, 74, 'sk-quer')
    + txt(61, 5, '+T/e', 'sk-t2') + txt(139, 80, '−T/e', 'sk-t2')
    + txt(100, 20, 'T', 'sk-t2')
    + achsen('y', 'z'),
    'WÖLBKRAFTTORSION, nicht St. Venant: der offene Träger ist dafür zu '
    + 'weich. Das Torsionsmoment wird zum gegenläufigen Kräftepaar ±T/e — die '
    + 'beiden Gurte biegen sich lotrecht GEGENEINANDER. Im einen Gurt addiert '
    + 'es sich zur Biegung, im anderen zieht es ab.'),

  /** Die oertliche Biegung zwischen zwei Blechen, in Draufsicht. */
  abfOertl: () => bild(
    `<line class="sk-stahl" x1="20" y1="26" x2="180" y2="26"/>`
    + `<line class="sk-stahl" x1="20" y1="58" x2="180" y2="58"/>`
    + `<rect class="sk-blech-f" x="60" y="26" width="12" height="32"/>`
    + `<rect class="sk-blech-f" x="128" y="26" width="12" height="32"/>`
    + pf(90, 16, 110, 16, 'sk-quer')
    + txt(100, 12, 'V_Rahmen', 'sk-t2')
    + bogen(66, 26, 9, 3.4, 5.6) + bogen(134, 58, 9, 0.4, 2.6)
    + txt(100, 44, 'a', 'sk-t2')
    + txt(100, 76, 'am ANSCHNITT des Blechs, nicht auf der Achse', 'sk-t2')
    + achsen('x', 'y'),
    'Draufsicht auf ein Rahmenfeld. Die Querkraft der Rahmenebene biegt den '
    + 'Gurt zwischen zwei Bindeblechen. Nachgewiesen wird am ANSCHNITT: über '
    + 'die Blechbreite ist die Verbindung biegesteif. Das Randfeld ist '
    + 'breiter, und die Biegung wächst quadratisch mit der Feldweite.'),

  /* =========================================================================
   * DIE BILDER DES MASTEN UND SEINER STUETZE
   * ======================================================================= */

  /** Der Mast als Kragarm mit dem Anker als Stuetzpunkt. */
  mastM: () => bild(
    `<line class="sk-stahl" x1="70" y1="10" x2="70" y2="70"/>`
    + `<path class="sk-aufl" d="M62 70h16M64 74l4-4M70 74l4-4M76 74l4-4"/>`
    + `<line class="sk-blech" x1="70" y1="22" x2="130" y2="62"/>`
    + `<rect class="sk-eck" x="126" y="58" width="8" height="8"/>`
    + pf(48, 16, 68, 16, 'sk-quer')
    + txt(40, 19, 'F', 'sk-t2')
    + txt(104, 34, 'Anker', 'sk-t2')
    + txt(70, 8, 'Kopf', 'sk-t2')
    + txt(150, 74, 'Fundament', 'sk-t2')
    + achsen('x', 'z', 186, 20),
    'Der Mast ist ein Kragarm: am Fuss eingespannt, oben belastet. Trägt er '
    + 'einen Anker, ist er dort zusätzlich GEHALTEN — ein Zweifeldsystem. '
    + 'Das Moment knickt am Ankerpunkt, und die Normalkraft springt dort.'),

  /** Die Knickrichtungen der Stuetze - die eine gerechnet, die andere nicht. */
  ankerKnick: () => bild(
    `<line class="sk-stahl" x1="30" y1="30" x2="170" y2="30"/>`
    + `<line class="sk-stahl" x1="30" y1="54" x2="170" y2="54"/>`
    + `<rect class="sk-blech-f" x="76" y="30" width="8" height="24"/>`
    + `<rect class="sk-blech-f" x="116" y="30" width="8" height="24"/>`
    + pf(20, 42, 30, 42, 'sk-druck') + pf(180, 42, 170, 42, 'sk-druck')
    + txt(100, 20, 'in der Spreizebene: mehrteilig, 6.4', 'sk-t2')
    + txt(100, 72, 'senkrecht dazu: I konstant — gerechnet', 'sk-t2')
    + bogen(100, 42, 16, 3.6, 5.8, 'sk-tors'),
    'Die Stütze kann in zwei Ebenen ausweichen. SENKRECHT zur Spreizebene '
    + 'biegen sich beide Profile um ihre eigene starke Achse — I ist '
    + 'konstant, und das rechnet das Werkzeug. IN der Spreizebene ist es ein '
    + 'mehrteiliger Druckstab nach EN 1993-1-1 6.4; diese Richtung ist '
    + 'massgebend und steckt im Bemessungsdiagramm.'),

  /** Die zulaessige Kraft ueber die Laenge - die Kurve des Blattes. */
  ankerKurve: () => bild(
    `<line class="sk-blech" x1="24" y1="66" x2="184" y2="66"/>`
    + `<line class="sk-blech" x1="24" y1="66" x2="24" y2="12"/>`
    + `<path class="sk-k" fill="none" d="M30 18 Q80 26 110 42 T180 60"/>`
    + `<line class="sk-grenze" x1="24" y1="48" x2="184" y2="48"/>`
    + txt(170, 44, 'vorhanden', 'sk-t2')
    + `<circle class="sk-eck" cx="96" cy="48" r="4"/>`
    + txt(100, 78, 'L [m]', 'sk-t2')
    + txt(14, 18, 'N', 'sk-t2'),
    'Das Bemessungsdiagramm des Blattes: die zulässige Druckkraft fällt mit '
    + 'der Länge. Der Punkt ist die Stütze dieser Anordnung. Es sind '
    + 'ZULÄSSIGE Kräfte aus dem Verfahren der zulässigen Spannungen — zu '
    + 'vergleichen mit der CHARAKTERISTISCHEN Stabkraft, nicht mit einem '
    + 'Bemessungswert.'),

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
