/**
 * ui.profilblatt.js
 * ---------------------------------------------------------------------------
 * DAS PROFILBLATT: ein Profil der Tafel «Profile dieses Tragwerks», mit allen
 * hinterlegten Kenndaten und einer massstaeblichen Schnittzeichnung samt
 * Vermassung und Lage des Schwerpunkts.
 *
 * Weisung vom 2. Oktober (aus der Liste vom 30. September): «unter profile
 * könnte man da auf die einzelnen profile klicken und ein fenster mit den
 * hinterlegten kenndaten zum profil und eine svg zeichnung des schnitts und
 * mit vermassung und die angabe zur lage des schwerpunktes, so lassen sich
 * die werte mit der fachliteratur abgleichen.»
 *
 * >>> ES ZEIGT, WAS HINTERLEGT IST - NICHTS ANDERES. <<<
 *
 * Der Zweck ist der Abgleich mit der Fachliteratur. Eine Zahl, die hier
 * gerundet, umgerechnet oder nachgerechnet stuende, waere genau die Zahl, die
 * man NICHT abgleichen kann. Die Tabelle fuehrt deshalb jeden Wert so, wie er
 * in der Datenbasis steht, mit der Einheit SEINER Tabelle (die Winkel fuehren
 * Masse in mm und Schwerpunktsabstaende in cm, die Walzprofile alles in cm -
 * so stehen sie in den Normtabellen auch). Wo das Blatt etwas ableitet - I
 * der Winkel aus i und A -, steht es in einer eigenen Zeile und sagt es.
 *
 * Die ZEICHNUNG braucht eine gemeinsame Einheit und rechnet intern in mm. Sie
 * zeichnet nach Profilnorm (Weisung 2. Oktober, siehe «DIE GEOMETRIE»): mit
 * den Ausrundungen aus der Tabelle, beim UNP mit der Flanschneigung. Fehlt
 * ein Radius, bleibt die Ecke scharf, und der Text darunter sagt es.
 * ---------------------------------------------------------------------------
 */

import { esc } from './design.js';

/* ===========================================================================
 * DIE FELDER JE TABELLE - Symbol, Einheit, Bedeutung.
 * ===========================================================================
 *
 * Die Einheit steht hier und nicht am Wert: sie ist eine Eigenschaft der
 * Tabelle. Eine Zeile je hinterlegtem Feld; was die Tabelle nicht fuehrt,
 * steht als Strich da (siehe `zeilen`).
 */
const FELDER = {
  winkel: [
    ['aH', 'a_H', 'mm', 'liegender Schenkel (Horizontalebene)'],
    ['aV', 'a_V', 'mm', 'stehender Schenkel (Vertikalebene)'],
    ['t', 't', 'mm', 'Schenkeldicke'],
    ['r1', 'r₁', 'mm', 'Ausrundung in der Kehle (EN 10056-1)'],
    ['r2', 'r₂', 'mm', 'Ausrundung an der Schenkelspitze (EN 10056-1)'],
    ['A', 'A', 'cm²', 'Querschnittsfläche'],
    ['g', 'g', 'kg/m', 'Gewicht je Meter'],
    ['zsH', 'z_s', 'cm', 'Schwerpunkt ab Aussenfläche des liegenden Schenkels'],
    ['zsV', 'y_s', 'cm', 'Schwerpunkt ab Aussenfläche des stehenden Schenkels'],
    ['iy', 'i_y', 'cm', 'Trägheitsradius, schenkelparallele Achse y'],
    ['iz', 'i_z', 'cm', 'Trägheitsradius, schenkelparallele Achse z'],
    ['imin', 'i_v', 'cm', 'kleinster Trägheitsradius (Hauptachse v–v)'],
    ['Wy', 'W_y', 'cm³', 'el. Widerstandsmoment um die waagrechte Achse (Schenkelspitze)'],
    ['Wz', 'W_z', 'cm³', 'el. Widerstandsmoment um die lotrechte Achse (Schenkelspitze)'],
  ],
  walz: [
    ['h', 'h', 'cm', 'Höhe'],
    ['b', 'b', 'cm', 'Breite'],
    ['tw', 't_w', 'cm', 'Stegdicke'],
    ['tf', 't_f', 'cm', 'Flanschdicke'],
    ['r', 'r', 'cm', 'Ausrundungsradius'],
    ['A', 'A', 'cm²', 'Querschnittsfläche'],
    ['G', 'G', 'kg/m', 'Gewicht je Meter'],
    ['Iy', 'I_y', 'cm⁴', 'Trägheitsmoment, starke Achse'],
    ['Wy', 'W_y', 'cm³', 'el. Widerstandsmoment, starke Achse'],
    ['iy', 'i_y', 'cm', 'Trägheitsradius, starke Achse'],
    ['Iz', 'I_z', 'cm⁴', 'Trägheitsmoment, schwache Achse'],
    ['Wz', 'W_z', 'cm³', 'el. Widerstandsmoment, schwache Achse (kleinerer Wert)'],
    ['iz', 'i_z', 'cm', 'Trägheitsradius, schwache Achse'],
    ['It', 'I_t', 'cm⁴', 'Torsionsträgheitsmoment'],
    ['ey', 'e_y', 'cm', 'Schwerpunkt ab Stegrücken (beim U-Profil)'],
  ],
  mast: [
    ['h', 'h', 'mm', 'Höhe'],
    ['b', 'b', 'mm', 'Breite'],
    ['tw', 't_w', 'mm', 'Stegdicke'],
    ['tf', 't_f', 'mm', 'Flanschdicke'],
    ['r', 'r', 'mm', 'Ausrundung Steg–Flansch (EN 10365)'],
    ['A', 'A', 'cm²', 'Querschnittsfläche'],
    ['g', 'g', 'kg/m', 'Gewicht je Meter'],
    ['Iy', 'I_y', 'cm⁴', 'Trägheitsmoment, starke Achse'],
    ['Wy', 'W_y', 'cm³', 'el. Widerstandsmoment, starke Achse'],
    ['iy', 'i_y', 'cm', 'Trägheitsradius, starke Achse'],
    ['Iz', 'I_z', 'cm⁴', 'Trägheitsmoment, schwache Achse'],
    ['Wz', 'W_z', 'cm³', 'el. Widerstandsmoment, schwache Achse'],
    ['iz', 'i_z', 'cm', 'Trägheitsradius, schwache Achse'],
    ['It', 'I_t', 'cm⁴', 'Torsionsträgheitsmoment'],
  ],
  anker: [
    ['h', 'h', 'mm', 'Höhe des Einzelprofils'],
    ['b', 'b', 'mm', 'Breite des Einzelprofils'],
    ['tw', 't_w', 'mm', 'Stegdicke'],
    ['tf', 't_f', 'mm', 'Flanschdicke (Flanschmitte)'],
    ['r', 'r', 'mm', 'Ausrundungsradius'],
    ['ey', 'e_y', 'cm', 'Schwerpunkt ab Stegrücken'],
    ['AEinzel', 'A', 'cm²', 'Querschnittsfläche, ein Profil'],
    ['IyEinzel', 'I_y', 'cm⁴', 'Trägheitsmoment, starke Achse, ein Profil'],
    ['IzEinzel', 'I_z', 'cm⁴', 'Trägheitsmoment, schwache Achse, ein Profil'],
    ['A', 'ΣA', 'cm²', 'Querschnittsfläche, beide Profile'],
    ['Iy', 'ΣI_y', 'cm⁴', 'Trägheitsmoment starke Achse, beide Profile'],
    ['It', 'ΣI_t', 'cm⁴', 'Torsionsträgheitsmoment, beide Profile'],
    ['G', 'G', 'kg/m', 'Gewicht je Meter, beide Profile'],
  ],
};

/**
 * Die Zahl, wie sie in der Tabelle steht. Kein toFixed: «2.17» bleibt 2.17
 * und «2.1» nicht «2.10» - sonst sähe eine Rundung aus wie ein Messwert.
 */
const roh = (v) => (Number.isFinite(v) ? String(v) : '–');

/* ===========================================================================
 * DIE GEOMETRIE, einheitlich in mm - nach Profilnorm gerundet.
 * ===========================================================================
 *
 * Weisung vom 2. Oktober: «die profile sind gemäss szs c5 oder eurocode zu
 * zeichnen, es fehlen ei vielen querschnitten die ausrundungen. prüfe die
 * angaben mit der berechnungsdatenbank ab». Auf Rückfrage: Normradien in
 * data/normen.json, die Querschnittswerte aus der gezeichneten Geometrie
 * nachrechnen und Abweichungen nur melden.
 *
 * DER UMRISS IST EIN POLYGON MIT EINEM RADIUS JE ECKE (`ecken`), so wie die
 * Profilnormen ihn beschreiben:
 *
 *   WINKEL (EN 10056-1)   r1 in der Kehle, r2 an der Innenkante beider
 *                         Schenkelspitzen; die Aussenecke ist scharf.
 *   I (EN 10365)          r an den vier Kehlen Steg-Flansch.
 *   UPE (EN 10365)        r an den beiden Kehlen; parallele Flansche,
 *                         scharfe Flanschspitzen.
 *   UNP (DIN 1026-1)      geneigte Flansche, Neigung 8 %; t_f gilt im
 *                         Abstand b/2 vom Stegrücken. r1 in der Kehle,
 *                         r2 = r1/2 an der Spitze (so führt die Norm die
 *                         Reihe; die Ankertabelle nennt nur r1).
 *                         GEMESSEN, nicht angenommen: mit t_f in der Mitte
 *                         des freien Flanschteils, (b − t_w)/2 vom Steg,
 *                         lag A beim UNP 120 um +1.51 % und I_y um +2.01 %
 *                         über der Tabelle; mit b/2 vom Rücken −0.07 % und
 *                         +0.09 % (UNP 140: −0.15 / −0.03 %).
 *
 * Fehlt ein Radius in der Tabelle, bleibt die Ecke scharf, und das Blatt
 * sagt es. Aus DEMSELBEN gerundeten Umriss kommen Zeichnung und
 * Querschnittswerte (`querschnittAusUmriss`) - eine Zeichnung, die anders
 * gerundet wäre als die Nachrechnung, bewiese nichts.
 *
 * form   'L' (Winkel), 'U' (Stegrücken links, Öffnung rechts), 'I'
 * ys, zs Schwerpunkt NACH TABELLE im Zeichnungssystem: y nach rechts, z nach
 *        oben, Nullpunkt beim L an der Aussenecke, beim U am Stegrücken in
 *        halber Höhe, beim I in der Mitte.
 * Gibt null zurück, wenn die Masse fehlen - dann steht nur die Tabelle da.
 */
export const UNP_NEIGUNG = 0.08;

export function profilGeometrie(art, p) {
  if (!p) return null;
  const ok = (...v) => v.every((x) => Number.isFinite(x) && x > 0);
  const rad = (v, f = 1) => (Number.isFinite(v) && v > 0 ? v * f : 0);
  let g;
  if (art === 'winkel') {
    if (!ok(p.aH, p.aV, p.t)) return null;
    g = { form: 'L', aH: p.aH, aV: p.aV, t: p.t, r1: rad(p.r1), r2: rad(p.r2),
          ys: Number.isFinite(p.zsV) ? p.zsV * 10 : null,
          zs: Number.isFinite(p.zsH) ? p.zsH * 10 : null };
  } else {
    // Walzprofile in cm, Mast und Anker in mm - so stehen sie in den Tabellen.
    const f = art === 'walz' ? 10 : 1;
    const h = p.h * f, b = p.b * f, tw = p.tw * f, tf = p.tf * f;
    if (!ok(h, b, tw, tf)) return null;
    const r = rad(p.r, f);
    const istU = art === 'anker' || /^U/.test(p.reihe ?? '');
    if (istU) {
      // Der Anker führt UNP (geneigte Flansche), die Walzprofile UPE.
      const unp = art === 'anker' || p.reihe === 'UNP';
      g = { form: 'U', h, b, tw, tf, r, r1: r, r2: unp ? r / 2 : 0,
            neigung: unp ? UNP_NEIGUNG : 0,
            ys: Number.isFinite(p.ey) ? p.ey * 10 : null, zs: 0 };
    } else {
      g = { form: 'I', h, b, tw, tf, r, r1: r, ys: 0, zs: 0 };
    }
  }
  g.ecken = ecken(g);
  return g;
}

/**
 * Die Ecken des Umrisses mit ihrem Radius [y, z, r], auf dem Bildschirm im
 * Uhrzeigersinn (y rechts, z oben: oben links beginnend nach rechts). Die
 * erste Ecke ist immer scharf und liegt an der Bezugskante (L: Aussenecke,
 * U: Stegrücken oben, I: Flansch oben links).
 */
function ecken(g) {
  if (g.form === 'L') {
    return [[0, 0, 0], [0, g.aV, 0], [g.t, g.aV, g.r2], [g.t, g.t, g.r1],
            [g.aH, g.t, g.r2], [g.aH, 0, 0]];
  }
  const o = g.h / 2, u = -g.h / 2;
  if (g.form === 'U') {
    // Innenfläche des Flansches: durch (b/2, o − t_f), steigt zur Spitze hin.
    const ym = g.b / 2;
    const zi = (y) => o - g.tf + g.neigung * (y - ym);
    return [[0, o, 0], [g.b, o, 0], [g.b, zi(g.b), g.r2], [g.tw, zi(g.tw), g.r1],
            [g.tw, -zi(g.tw), g.r1], [g.b, -zi(g.b), g.r2], [g.b, u, 0], [0, u, 0]];
  }
  const w = g.tw / 2, bb = g.b / 2, r = g.r1;
  return [[-bb, o, 0], [bb, o, 0], [bb, o - g.tf, 0], [w, o - g.tf, r],
          [w, u + g.tf, r], [bb, u + g.tf, 0], [bb, u, 0], [-bb, u, 0],
          [-bb, u + g.tf, 0], [-w, u + g.tf, r], [-w, o - g.tf, r], [-bb, o - g.tf, 0]];
}

/**
 * Der gerundete Umriss als Punktfolge [y, z] in mm.
 *
 * Jede Ecke mit Radius wird durch ihren Bogen ersetzt: Tangentenpunkte im
 * Abstand r / tan(θ/2) auf beiden Kanten, Mittelpunkt auf der
 * Winkelhalbierenden. Das gilt für die rechtwinklige Kehle wie für die
 * schiefe am geneigten UNP-Flansch, ohne Fallunterscheidung. `n` Abschnitte
 * je Bogen; 32 geben die Fläche eines Viertelkreises auf 2·10⁻³ genau, und
 * an einem Profil, in dem die Ausrundungen ein paar Prozent der Fläche
 * ausmachen, ist das weit unter der Tabellenrundung.
 */
export function umrissPunkte(g, n = 32) {
  const E = g.ecken;
  const aus = [];
  E.forEach(([y, z, r], i) => {
    if (!(r > 0)) { aus.push([y, z]); return; }
    const [ya, za] = E[(i - 1 + E.length) % E.length];
    const [yb, zb] = E[(i + 1) % E.length];
    const la = Math.hypot(ya - y, za - z), lb = Math.hypot(yb - y, zb - z);
    const u1 = [(ya - y) / la, (za - z) / la], u2 = [(yb - y) / lb, (zb - z) / lb];
    const cosW = Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]));
    const halb = Math.acos(cosW) / 2;
    const d = r / Math.tan(halb);
    const bis = [u1[0] + u2[0], u1[1] + u2[1]];
    const lbis = Math.hypot(bis[0], bis[1]);
    const c = [y + (bis[0] / lbis) * (r / Math.sin(halb)),
               z + (bis[1] / lbis) * (r / Math.sin(halb))];
    const t1 = [y + u1[0] * d, z + u1[1] * d], t2 = [y + u2[0] * d, z + u2[1] * d];
    const a1 = Math.atan2(t1[1] - c[1], t1[0] - c[0]);
    let da = Math.atan2(t2[1] - c[1], t2[0] - c[0]) - a1;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da <= -Math.PI) da += 2 * Math.PI;
    for (let k = 0; k <= n; k++) {
      const a = a1 + (da * k) / n;
      aus.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
    }
  });
  return aus;
}

/**
 * QUERSCHNITTSWERTE AUS DEM UMRISS - die Gegenprobe zur Tabelle.
 *
 * Polygonformeln (Gauss): A, Schwerpunkt, ∫z², ∫y², ∫yz, auf den
 * Schwerpunkt verschoben; daraus die Hauptachsen (beim Winkel i_v) und die
 * elastischen Widerstandsmomente zur am weitesten entfernten Faser - so sind
 * sie auch in der Tabelle definiert (Winkel: Schenkelspitze, U: der
 * kleinere W_z). Ergebnis in cm-Einheiten wie die Tabellen; der
 * Schwerpunkt in mm im Zeichnungssystem.
 *
 * I_t wird NICHT nachgerechnet: es ist keine Polygongrösse, und eine
 * Näherungsformel neben dem Tabellenwert wäre eine zweite Wahrheit.
 */
export function querschnittAusUmriss(g, n = 32) {
  const P = umrissPunkte(g, n);
  let A = 0, Sy = 0, Sz = 0, Iyy = 0, Izz = 0, Iyz = 0;
  for (let i = 0; i < P.length; i++) {
    const [y0, z0] = P[i], [y1, z1] = P[(i + 1) % P.length];
    const c = y0 * z1 - y1 * z0;
    A += c / 2;
    Sy += (y0 + y1) * c / 6;
    Sz += (z0 + z1) * c / 6;
    Iyy += (z0 * z0 + z0 * z1 + z1 * z1) * c / 12;
    Izz += (y0 * y0 + y0 * y1 + y1 * y1) * c / 12;
    Iyz += (y0 * z1 + 2 * y0 * z0 + 2 * y1 * z1 + y1 * z0) * c / 24;
  }
  // Im Uhrzeigersinn umfahren ist die Fläche negativ - alle Integrale mit.
  const s = Math.sign(A);
  A *= s; Sy *= s; Sz *= s; Iyy *= s; Izz *= s; Iyz *= s;
  const yc = Sy / A, zc = Sz / A;
  const Iy = Iyy - A * zc * zc;          // um die waagrechte Achse durch S
  const Iz = Izz - A * yc * yc;          // um die lotrechte Achse durch S
  const Iyzc = Iyz - A * yc * zc;
  const m = (Iy + Iz) / 2, rr = Math.hypot((Iy - Iz) / 2, Iyzc);
  const Iv = m - rr, Iu = m + rr;
  const zMax = Math.max(...P.map((q) => Math.abs(q[1] - zc)));
  const yMax = Math.max(...P.map((q) => Math.abs(q[0] - yc)));
  return {
    A: A / 100, ys: yc, zs: zc,
    Iy: Iy / 1e4, Iz: Iz / 1e4, Iyz: Iyzc / 1e4, Iu: Iu / 1e4, Iv: Iv / 1e4,
    Wy: Iy / zMax / 1e3, Wz: Iz / yMax / 1e3,
    iy: Math.sqrt(Iy / A) / 10, iz: Math.sqrt(Iz / A) / 10, iv: Math.sqrt(Iv / A) / 10,
  };
}

/* ===========================================================================
 * DIE ZEICHNUNG
 * ===========================================================================
 *
 * Der Umriss ist der gerundete Polygonzug aus `umrissPunkte` - derselbe, aus
 * dem `querschnittAusUmriss` rechnet.
 */
function umriss(g, P) {
  return umrissPunkte(g, 12).map(([y, z], i) => {
    const [x, v] = P(y, z);
    return `${i ? 'L' : 'M'} ${x} ${v}`;
  }).join(' ') + ' Z';
}

/** Ausdehnung im Zeichnungssystem [mm]: y0, y1, z0, z1. */
function ausdehnung(g) {
  if (g.form === 'L') return { y0: 0, y1: g.aH, z0: 0, z1: g.aV };
  if (g.form === 'U') return { y0: 0, y1: g.b, z0: -g.h / 2, z1: g.h / 2 };
  return { y0: -g.b / 2, y1: g.b / 2, z0: -g.h / 2, z1: g.h / 2 };
}

/** Eine Zahl in mm für die Vermassung: ganze mm ohne Nachkommastelle. */
const mm = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));

/**
 * Die Schnittzeichnung als SVG.
 *
 * Massstäblich: ein Massstab für beide Richtungen, das Profil füllt ein
 * Feld von rund 230 px. Die Masse stehen aussen (links, unten, rechts), die
 * Dicken mit einer Hinweislinie, der Schwerpunkt S mit seinen beiden
 * Abständen zur Bezugskante.
 */
export function profilSchnittSvg(g, name = '') {
  if (!g) return '';
  const e = ausdehnung(g);
  const B = e.y1 - e.y0, H = e.z1 - e.z0;
  const feld = 230;
  const skala = feld / Math.max(B, H);
  const rand = { l: 48, r: 92, o: 44, u: 52 };
  const W = B * skala + rand.l + rand.r;
  const Ht = H * skala + rand.o + rand.u;
  const P = (y, z) => [+(rand.l + (y - e.y0) * skala).toFixed(2),
                       +(rand.o + (e.z1 - z) * skala).toFixed(2)];

  const teile = [];
  const linie = (a, b, kl = 'pb-mass') =>
    `<line class="${kl}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
  const text = (pt, t, anker = 'middle', dy = 0, kl = 'pb-text') =>
    `<text class="${kl}" x="${pt[0]}" y="${pt[1] + dy}" text-anchor="${anker}">${esc(t)}</text>`;

  // Waagrechtes Mass unter (abstandPx > 0) oder über (< 0) einer Kante z,
  // Wert mittig über der Masslinie.
  const massH = (y0, y1, zKante, abstandPx, wert) => {
    const a = P(y0, zKante), b = P(y1, zKante);
    const yv = a[1] + abstandPx;
    const s = Math.sign(abstandPx);
    teile.push(linie([a[0], a[1] + 3 * s], [a[0], yv + 4 * s], 'pb-hilf'),
               linie([b[0], b[1] + 3 * s], [b[0], yv + 4 * s], 'pb-hilf'),
               linie([a[0], yv], [b[0], yv]),
               linie([a[0] - 3, yv + 3], [a[0] + 3, yv - 3]),
               linie([b[0] - 3, yv + 3], [b[0] + 3, yv - 3]),
               text([(a[0] + b[0]) / 2, yv], wert, 'middle', -4));
  };
  // Lotrechtes Mass links (abstandPx < 0) oder rechts (> 0) einer Kante y.
  const massV = (z0, z1, yKante, abstandPx, wert) => {
    const a = P(yKante, z0), b = P(yKante, z1);
    const xv = a[0] + abstandPx;
    const s = Math.sign(abstandPx);
    teile.push(linie([a[0] + 3 * s, a[1]], [xv + 4 * s, a[1]], 'pb-hilf'),
               linie([b[0] + 3 * s, b[1]], [xv + 4 * s, b[1]], 'pb-hilf'),
               linie([xv, a[1]], [xv, b[1]]),
               linie([xv - 3, a[1] + 3], [xv + 3, a[1] - 3]),
               linie([xv - 3, b[1] + 3], [xv + 3, b[1] - 3]),
               /*
                * Der Wert steht gedreht an der Masslinie, wie auf einer
                * Zeichnung - waagrecht passte «a_V = 130» links nicht in den
                * Rand und wurde abgeschnitten. Gedreht um −90° liegt die
                * Schrift links der Grundlinie; rechts wird sie deshalb um
                * eine Schrifthöhe weiter hinausgesetzt.
                */
               (() => {
                 const x = s < 0 ? xv - 4 : xv + 13, y = (a[1] + b[1]) / 2;
                 return `<text class="pb-text" x="${x}" y="${y}" text-anchor="middle"
                   transform="rotate(-90 ${x} ${y})">${esc(wert)}</text>`;
               })());
  };
  // Dicke mit Hinweislinie: Punkt im Material, Text daneben.
  const dicke = (y, z, dxPx, dyPx, wert) => {
    const a = P(y, z);
    const b = [a[0] + dxPx, a[1] + dyPx];
    teile.push(`<circle class="pb-punkt" cx="${a[0]}" cy="${a[1]}" r="1.8"/>`,
               linie(a, b, 'pb-hilf'),
               text(b, wert, dxPx < 0 ? 'end' : 'start', dyPx < 0 ? -2 : 10));
  };

  if (g.form === 'L') {
    massH(0, g.aH, 0, 22, `a_H = ${mm(g.aH)}`);
    massV(0, g.aV, 0, -26, `a_V = ${mm(g.aV)}`);
    dicke(g.aH * 0.75, g.t / 2, 26, -22, `t = ${mm(g.t)}`);
    // r1 in der Kehle, Hinweislinie weit in den freien Winkel - knapp
    // daneben steht S; r2 an der Spitze des stehenden Schenkels, nach rechts.
    if (g.r1) dicke(g.t + g.r1 * 0.3, g.t + g.r1 * 0.3, 70, -78, `r₁ = ${mm(g.r1)}`);
    if (g.r2) dicke(g.t - g.r2 * 0.3, g.aV - g.r2 * 0.6, 24, 18, `r₂ = ${mm(g.r2)}`);
  } else {
    massH(e.y0, e.y1, e.z0, 22, `b = ${mm(g.b)}`);
    massV(e.z0, e.z1, e.y0, -26, `h = ${mm(g.h)}`);
    const yF = g.form === 'U' ? (g.neigung ? g.b / 2 : g.tw + (g.b - g.tw) / 2) : g.b / 2 * 0.7;
    dicke(yF, e.z1 - g.tf / 2, 18, -16, `t_f = ${mm(g.tf)}`);
    const yW = g.form === 'U' ? g.tw / 2 : 0;
    dicke(yW, -g.h * 0.22, 46, 16, `t_w = ${mm(g.tw)}`);
    // Der Radius an der OBEREN Ausrundung, mit der Hinweislinie in den
    // freien Raum zwischen den Flanschen - unten lief er ins Mass b.
    const zKehle = g.h / 2 - g.tf - (g.neigung ?? 0) * (g.b / 2 - g.tw);
    if (g.r) dicke(g.form === 'U' ? g.tw + g.r * 0.3 : g.tw / 2 + g.r * 0.3,
                   zKehle - g.r * 0.3, 34, 30, `${g.r2 ? 'r₁' : 'r'} = ${mm(g.r)}`);
    if (g.r2) dicke(g.b - g.r2 * 0.4, g.h / 2 - g.tf * 0.55, 10, 44, `r₂ = ${mm(g.r2)}`);
    if (g.neigung) {
      // Rechts neben der Flanschspitze - zwischen den Flanschen stehen r1 und t_w.
      const [xn, yn] = P(g.b, g.h / 2 - g.tf * 0.4);
      teile.push(text([xn + 6, yn], `Neigung ${mm(g.neigung * 100)} %`, 'start', 4, 'pb-achstext'));
    }
  }

  /*
   * DER SCHWERPUNKT. Achsen y und z gestrichelt durch S, über den Umriss
   * hinaus. Beim L und beim U stehen die Abstände zur Bezugskante als Mass
   * dabei - beim doppelt symmetrischen I liegt S in der Mitte, ein Mass
   * wäre dort eine Wiederholung von h/2.
   */
  let sText = '';
  if (Number.isFinite(g.ys) && Number.isFinite(g.zs)) {
    const S = P(g.ys, g.zs);
    const ueber = 14;
    const yl = P(e.y0, g.zs), yr = P(e.y1, g.zs);
    const zo = P(g.ys, e.z1), zu = P(g.ys, e.z0);
    teile.push(
      `<line class="pb-achse" x1="${yl[0] - ueber}" y1="${S[1]}" x2="${yr[0] + ueber}" y2="${S[1]}"/>`,
      `<line class="pb-achse" x1="${S[0]}" y1="${zo[1] - ueber}" x2="${S[0]}" y2="${zu[1] + ueber}"/>`,
      text([yr[0] + ueber + 3, S[1]], 'y', 'start', 4, 'pb-achstext'),
      text([S[0], zo[1] - ueber - 3], 'z', 'middle', 0, 'pb-achstext'),
      `<circle class="pb-s" cx="${S[0]}" cy="${S[1]}" r="4.5"/>`,
      `<line class="pb-s-kreuz" x1="${S[0] - 4.5}" y1="${S[1]}" x2="${S[0] + 4.5}" y2="${S[1]}"/>`,
      `<line class="pb-s-kreuz" x1="${S[0]}" y1="${S[1] - 4.5}" x2="${S[0]}" y2="${S[1] + 4.5}"/>`,
      text([S[0] + 7, S[1] - 6], 'S', 'start', 0, 'pb-s-text'));
    if (g.form === 'L') {
      // y_s ab der Aussenfläche des stehenden Schenkels (links), oben vermasst;
      // z_s ab der Aussenfläche des liegenden Schenkels (unten), rechts.
      massH(0, g.ys, g.aV, -18, `y_s = ${mm(g.ys)}`);
      massV(0, g.zs, g.aH, 30, `z_s = ${mm(g.zs)}`);
      sText = `Schwerpunkt S: y_s = ${mm(g.ys)} mm ab Aussenfläche des stehenden, `
            + `z_s = ${mm(g.zs)} mm ab Aussenfläche des liegenden Schenkels.`;
    } else if (g.form === 'U') {
      massH(0, g.ys, e.z1, -18, `e_y = ${mm(g.ys)}`);
      sText = `Schwerpunkt S: e_y = ${mm(g.ys)} mm ab Stegrücken, in halber Höhe.`;
    } else {
      sText = 'Schwerpunkt S in der Mitte (doppelt symmetrisch).';
    }
  } else {
    sText = 'Lage des Schwerpunkts nicht hinterlegt.';
  }

  const svg = `<svg class="pb-svg" viewBox="0 0 ${W.toFixed(0)} ${Ht.toFixed(0)}"
      width="${W.toFixed(0)}" role="img" aria-label="Schnitt ${esc(name)}">
    <path class="pb-flaeche" d="${umriss(g, P)}"/>
    ${teile.join('\n    ')}
  </svg>`;
  return { svg, sText };
}

/**
 * Die Zeilen der Kenndaten: jedes Feld der Tabelle, in ihrer Einheit, so wie
 * es hinterlegt ist. Dazu, eigens gekennzeichnet, was das Blatt ableitet.
 */
function zeilen(art, p) {
  const z = (FELDER[art] ?? []).map(([k, sym, einheit, text]) => ({
    sym, einheit, text, wert: roh(p?.[k]),
  }));
  /*
   * DIE WINKEL FÜHREN KEIN I. Die Tabellen der Literatur führen es, und
   * damit man es abgleichen kann, steht es hier - aus i² · A gerechnet und
   * als solches angeschrieben, nicht als hinterlegter Wert.
   */
  if (art === 'winkel' && Number.isFinite(p?.A)) {
    for (const [i, sym] of [['iy', 'I_y'], ['iz', 'I_z'], ['imin', 'I_v']]) {
      if (Number.isFinite(p[i])) {
        z.push({ sym, einheit: 'cm⁴', abgeleitet: true,
                 text: `abgeleitet: ${sym.replace('I', 'i')}² · A`,
                 wert: (p[i] ** 2 * p.A).toFixed(2) });
      }
    }
  }
  return z;
}

/** Was unter der Zeichnung zur Ausführung gesagt werden muss. */
function vermerke(art, g) {
  const v = [];
  if (g && !g.r && g.form !== 'L') {
    v.push('Kein Ausrundungsradius hinterlegt — die Ecken zwischen Steg und Flansch sind scharf gezeichnet.');
  }
  if (g?.form === 'L' && !(g.r1 > 0)) {
    v.push('Für diesen Winkel sind keine Ausrundungen hinterlegt — gezeichnet nach Sollgeometrie ohne Rundungen.');
  }
  if (g?.form === 'L' && g.r1 > 0) {
    v.push('Gezeichnet nach EN 10056-1: r₁ in der Kehle, r₂ an den Schenkelspitzen, Aussenecke scharf.');
  }
  if (art === 'anker') {
    v.push('Gezeichnet ist EIN Profil (UNP nach DIN 1026-1: Flanschneigung 8 %, t_f im Abstand b/2 vom Stegrücken, r₂ = r₁/2). Die Stütze besteht aus zweien, gespreizt über die Länge.');
  }
  return v;
}

/**
 * DAS BLATT als HTML für den Dialog.
 *
 * @param {object} e  Eintrag der Profiltafel: { art, p, name, rolle, quelle }
 *                    art: 'winkel' | 'walz' | 'mast' | 'anker'
 */
export function profilBlattHtml(e) {
  if (!e?.p) return '<p class="notiz">Zu diesem Profil sind keine Kenndaten hinterlegt.</p>';
  const g = profilGeometrie(e.art, e.p);
  const zeichnung = g ? profilSchnittSvg(g, e.name) : null;
  const tabelle = zeilen(e.art, e.p);
  const v = vermerke(e.art, g);
  return `
    <div class="pb">
      <div class="pb-bild">
        ${zeichnung ? zeichnung.svg
                    : '<p class="notiz">Keine Masse hinterlegt — keine Zeichnung.</p>'}
        ${zeichnung ? `<p class="notiz pb-s-zeile">${esc(zeichnung.sText)}
          Masse in mm, massstäblich.</p>` : ''}
        ${v.map((t) => `<p class="hinweis" style="margin:3px 0 0">${esc(t)}</p>`).join('')}
      </div>
      <div class="pb-daten">
        <div class="tabellenrahmen"><table class="dt">
          <thead><tr><th>Grösse</th><th class="num">Wert</th><th>Einheit</th>
            <th>Bedeutung</th></tr></thead>
          <tbody>${tabelle.map((r) => `
            <tr${r.abgeleitet ? ' class="pb-abgeleitet"' : ''}>
              <td>${esc(r.sym)}</td><td class="num">${esc(r.wert)}</td>
              <td>${esc(r.einheit)}</td><td>${esc(r.text)}</td></tr>`).join('')}
          </tbody></table></div>
        <p class="notiz" style="margin:4px 0 0">${esc(e.rolle ?? '')}${
          e.quelle ? ` · ${esc(e.quelle)}` : ''}. Die Werte stehen, wie sie in
          der Datenbasis hinterlegt sind (ungerundet, in der Einheit ihrer
          Tabelle) — zum Abgleich mit der Profiltabelle der Literatur.</p>
        ${e.p.hinweis ? `<p class="hinweis" style="margin:3px 0 0">${esc(e.p.hinweis)}</p>` : ''}
      </div>
    </div>`;
}
