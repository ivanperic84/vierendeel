/**
 * core.zustandslinien.js - Zustandslinien aus dem Stabwerk (N, V, M, T, σ_v, η)
 * und die Auflagerreaktionen dazu.
 *
 * Weisung vom 14. November, nach der Probe (Versand/probe_spannungen.html):
 * «das haben wir schon in diesem stil in der app. was ich dachte sind die
 * diagramme wie in den statikprogrammen üblich», dann zur Probe: «die linie
 * in gleicher farbe wie diagramme pos neg. die werte transparent. / Inhalt,
 * neben den schnittkräften auch die reaktionen und die vergleichsspannung
 * abilden können … / Ansicht, die navigation soll gliech bleiben mit dem 3d
 * modell. was man überprüfen sollte sind die ausrichtungen der diagramme,
 * beim axis ist es zum teil inkonsistent, wenn man einzelne profile dreht»,
 * «kann man das noch weiter vereinfachen?» und zuletzt «Ja, einbauen».
 *
 * WAS HIER STEHT
 *
 *   - je echtem Stab 11 Stellen (`ZL_PUNKTE`), die sechs örtlichen
 *     Schnittgrössen aus den Endkräften des Lösers und der Streckenlast
 *     (`schnittImStab`, dieselbe Rechnung wie am Masten der Nachweise);
 *   - σ_v je Stelle über `stabNachweise` - dieselbe Regel wie die Kacheln;
 *   - die Auflagerreaktionen je Fall (Kraft bzw. Moment des Lagers auf das
 *     Tragwerk, global);
 *   - die Umrechnung auf GLOBALE Achsen: ein Moment um die Achse a steht in
 *     der Ebene, in der es biegt (Richtung a × Stabachse), eine Querkraft in
 *     ihrer Richtung. Damit ist die Linie unabhängig von der Drehlage des
 *     Profils - gemessen: Mast mit gedrehtem Steg M_x = −59.28 kNm in beiden
 *     Lagen, die vier Gurte (gespiegelte Winkel, vier verschiedene örtliche
 *     z-Achsen) alle M_y −0.096 / −0.094 kNm. Örtlich bleibt wählbar.
 *
 * Kein DOM, keine Zeichnung: das macht render.3d.js (`_zustandMalen`) mit
 * dem, was app.js daraus baut.
 */

import { schnittImStab, stabNachweise, kraefteAusAnteilen, anteileFuer, stabRolle } from './core.stabnachweis.js';
import { dreibein } from './core.stabwerk.js';

export const ZL_PUNKTE = 11;

/** Die Plotgrössen der App, die eine Zustandslinie haben, und ihre Grösse hier. */
export const ZL_AUS_MODUS = { eta: 'eta', sig_v: 'sig', M: 'M', V: 'V', N: 'N', T: 'T' };

const ACHSE = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return l > 1e-6 ? a.map((c) => c / l) : null; };
const skalar = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const r6 = (v) => Math.round(v * 1e6) / 1e6;

/**
 * Die echten Stäbe des Modells mit Lage und Dreibein.
 * @returns {Array<{n, r, a, b, L, ex, ey, ez, dSig}>}
 */
export function zustandGeometrie(dat) {
  const kn = new Map((dat?.knoten ?? []).map((k) => [k.name, k]));
  return (dat?.staebe ?? []).filter((s) => s.art === 'stab' && kn.has(s.von) && kn.has(s.bis)).map((s) => {
    const a = kn.get(s.von), b = kn.get(s.bis);
    const { L, R } = dreibein(b.x - a.x, b.y - a.y, b.z - a.z, s.lcsZ);
    const ex = R[0];
    return { n: s.name, r: stabRolle(s.name, s.art), a: [a.x, a.y, a.z], b: [b.x, b.y, b.z],
             L, ex, ey: R[1], ez: R[2],
             // Die Spannungslinie steht in der lotrechten Ebene, wo es geht.
             dSig: norm(kreuz([0, 1, 0], ex)) ?? norm(kreuz([1, 0, 0], ex)) };
  });
}

/**
 * Die Werte eines Lastfalls: je Stab und Stelle die sechs örtlichen
 * Schnittgrössen [N, V_y, V_z, T, M_y, M_z], auf Wunsch σ_v, dazu die
 * Auflagerreaktionen [R_x, R_y, R_z, M_x, M_y, M_z] je Lagerknoten.
 */
export function zustandFall(dat, lsg, geo, lf, opt = {}) {
  const kraefte = kraefteAusAnteilen(lsg, anteileFuer(lf, dat));
  const w = geo.map((s) => {
    const f = kraefte.get(s.n);
    const pkt = [];
    for (let p = 0; p < ZL_PUNKTE; p += 1) {
      const q = f ? schnittImStab(f, s.L, p / (ZL_PUNKTE - 1)) : new Float64Array(12);
      pkt.push([q[0], q[1], q[2], q[3], q[4], q[5]]);
    }
    return pkt;
  });
  let sig = null;
  if (opt.spannung && opt.fyd) {
    sig = geo.map(() => new Array(ZL_PUNKTE).fill(null));
    for (let p = 0; p < ZL_PUNKTE; p += 1) {
      const k2 = new Map();
      geo.forEach((s) => { const f = kraefte.get(s.n); if (f) k2.set(s.n, schnittImStab(f, s.L, p / (ZL_PUNKTE - 1))); });
      const nw = stabNachweise(dat, k2, opt.fyd, opt.auswertung ?? {});
      geo.forEach((s, i) => { const e = nw.je.get(s.n); if (e && e.eta !== null && Number.isFinite(e.sig)) sig[i][p] = e.sig; });
    }
  }
  const reak = {};
  anteileFuer(lf, dat).forEach(({ lastfall, faktor }) => {
    if (!faktor || !lsg.u.has(lastfall)) return;
    lsg.auflagerkraefte(lastfall).forEach((r) => {
      const z = reak[r.knoten] ?? (reak[r.knoten] = [0, 0, 0, 0, 0, 0]);
      ['ux', 'uy', 'uz', 'fix', 'fiy', 'fiz'].forEach((f2, d) => { z[d] += faktor * (r[f2] ?? 0); });
    });
  });
  Object.keys(reak).forEach((k) => { reak[k] = reak[k].map(r6); });
  return { key: lf.key, bez: lf.bez, w, sig, reak };
}

/**
 * Die innere Grösse aus der Wahl (N, V, M, T, sig, eta) und der Ebene.
 * Global: quer = Ebene des Querprofils (x–z), längs = y–z, dritte =
 * lotrecht (V) bzw. waagrecht (M). Örtlich: Ebene y oder z des Stabes.
 */
export function zustandIntern(g, eb, ax = 'global') {
  if (g === 'N' || g === 'T' || g === 'sig' || g === 'eta') return g;
  if (ax === 'lokal') return (g === 'V' ? 'v' : 'm') + (eb === 'z' ? 'z' : 'y');
  const k = { quer: 0, laengs: 1, dritte: 2 }[eb] ?? 0;
  return g === 'V' ? ['Vx', 'Vy', 'Vz'][k] : ['My', 'Mx', 'Mz'][k];
}
export const ZL_EBENEN = { global: ['quer', 'laengs', 'dritte'], lokal: ['y', 'z'] };
export const ZL_NAME = { N: 'N', T: 'T', sig: 'σ_v', eta: 'η', Vx: 'V_x quer', Vy: 'V_y längs', Vz: 'V_z lotrecht',
  My: 'M_y quer', Mx: 'M_x längs', Mz: 'M_z waagrecht', vy: 'V_y örtlich', vz: 'V_z örtlich',
  my: 'M_y örtlich', mz: 'M_z örtlich' };
export const zlEinheit = (k) => (k === 'eta' ? '' : k === 'sig' ? 'N/mm²' : /^(T|M|m)/.test(k) ? 'kNm' : 'kN');
/** Die Reaktion zum Diagramm: Index in [R_x, R_y, R_z, M_x, M_y, M_z]. */
export const ZL_REAKTION = { N: 2, Vx: 0, Vy: 1, Vz: 2, My: 4, Mx: 3, Mz: 5, T: 5, sig: 2, eta: 2 };

/**
 * Wert und Zeichenrichtung der inneren Grösse k an einem Stab.
 * @param {object} s     Stab aus zustandGeometrie
 * @param {number[]} q   [N, V_y, V_z, T, M_y, M_z] örtlich
 * @param {number|null} sig  σ_v an der Stelle (nur für sig / eta)
 * @returns {[number|null, number[]|null]}  d null = an diesem Stab nicht darstellbar
 */
export function zustandWert(k, s, q, sig = null, fyd = 1) {
  if (k === 'sig' || k === 'eta') return sig === null ? [null, null] : [k === 'eta' ? sig / fyd : sig, s.dSig];
  const lok = { N: [0, s.ez], T: [3, s.ez], vy: [1, s.ey], vz: [2, s.ez], my: [4, s.ez], mz: [5, s.ey] }[k];
  if (lok) return [q[lok[0]], lok[1]];
  const a = ACHSE[k[1].toLowerCase()];
  // Liegt die Achse fast in Stabrichtung (unter 10°), ist die Grösse dort N
  // bzw. T, keine Querkraft und kein Biegemoment (an den verjüngten
  // Gurtenden gab V_x sonst Bruchstücke von 0.14 kN, gemeldet 14. November).
  if (Math.abs(skalar(a, s.ex)) > Math.cos(10 * Math.PI / 180)) return [0, null];
  if (k[0] === 'M') {
    const M = [0, 1, 2].map((j) => q[4] * s.ey[j] + q[5] * s.ez[j]);
    const d = norm(kreuz(a, s.ex));
    return [d ? skalar(M, a) : 0, d];
  }
  const V = [0, 1, 2].map((j) => q[1] * s.ey[j] + q[2] * s.ez[j]);
  const d = norm(a.map((c, j) => c - skalar(a, s.ex) * s.ex[j]));
  return [d ? skalar(V, a) : 0, d];
}

/** Gehört der Stab zu den gewählten Teilen? 'alle' | 'mast' | 'blech' | 'gurt' | 'gurt:OGL' … */
export function zustandSicht(s, teile = 'alle') {
  if (teile === 'alle') return true;
  if (teile.startsWith('gurt')) {
    const g = teile.split(':')[1];
    return /^gurt/.test(s.r) && (!g || new RegExp(`(^|_)${g}_`).test(s.n));
  }
  return s.r === teile;
}

/**
 * Je Stab die Reihe der Werte im Fall (oder Grösst-/Kleinstwert der Hülle).
 * @param {Array} faelle  [zustandFall …]; bei der Hülle alle, sonst einer
 */
export function zustandReihe(k, faelle, i, s, art = 'eins', fyd = 1) {
  if (art === 'eins') {
    const f = faelle[0];
    return f.w[i].map((q, p) => { const [v, d] = zustandWert(k, s, q, f.sig?.[i]?.[p] ?? null, fyd); return { v, d, f: f.bez }; });
  }
  return faelle[0].w[i].map((_, p) => {
    let b = null;
    faelle.forEach((f) => {
      const [v, d] = zustandWert(k, s, f.w[i][p], f.sig?.[i]?.[p] ?? null, fyd);
      if (v === null) return;
      if (!b || (art === 'max' ? v > b.v : v < b.v)) b = { v, d, f: f.bez };
    });
    return b ?? { v: null, d: null, f: '' };
  });
}

/** Lässt sich die Grösse an den gewählten Teilen zeichnen (auch wenn sie null ist)? */
export function zustandDarstellbar(k, geo, teile) {
  const q0 = [0, 0, 0, 0, 0, 0];
  if (k === 'sig' || k === 'eta') return geo.some((s) => zustandSicht(s, teile));
  return geo.some((s) => zustandSicht(s, teile) && zustandWert(k, s, q0)[1]);
}

/**
 * Die Ebene «auto»: die mit dem grössten Betrag an den gewählten Teilen.
 * Nur für V und M; sonst null.
 */
export function zustandEbeneAuto(g, faelle, geo, teile, ax = 'global') {
  if (g !== 'V' && g !== 'M') return null;
  const huelle = faelle.length > 1;
  let best = ZL_EBENEN[ax][0], bv = -1;
  ZL_EBENEN[ax].forEach((eb) => {
    const k = zustandIntern(g, eb, ax);
    let m = 0;
    geo.forEach((s, i) => {
      if (!zustandSicht(s, teile)) return;
      (huelle ? ['max', 'min'] : ['eins']).forEach((art) => zustandReihe(k, faelle, i, s, art).forEach((x) => {
        if (x.d && x.v !== null) m = Math.max(m, Math.abs(x.v));
      }));
    });
    if (m > bv) { bv = m; best = eb; }
  });
  return best;
}

/**
 * Die Ansicht, die auf die Ebene der Linie blickt: 'quer' | 'laengs' | 'oben'
 * (gemittelt über die sichtbaren Stäbe; Normale = Stabachse × Zeichenrichtung).
 */
export function zustandBlick(k, geo, teile) {
  const n = [0, 0, 0];
  const q0 = [0, 0, 0, 0, 0, 0];
  geo.forEach((s) => {
    if (!zustandSicht(s, teile)) return;
    const d = (k === 'sig' || k === 'eta') ? s.dSig : zustandWert(k, s, q0)[1];
    if (!d) return;
    const m = kreuz(s.ex, d);
    [0, 1, 2].forEach((j) => { n[j] += Math.abs(m[j]); });
  });
  const j = n.indexOf(Math.max(...n));
  return n[j] > 0 ? ['quer', 'laengs', 'oben'][j] : null;
}

/**
 * Ortsangabe in Worten: «Mast M1, z = 7.18 m über Fuss», «Untergurt vorn,
 * x = 10.20 m». `zFuss` ist die Höhe des tiefsten Stabpunkts im Modell.
 */
export function zustandWo(s, p, zFuss = 0) {
  const t = p / (ZL_PUNKTE - 1);
  const P = s.a.map((c, j) => c + (s.b[j] - c) * t);
  const m = /MAST_([^_]+)_/.exec(s.n);
  if (m) return `Mast ${m[1]}, z = ${(P[2] - zFuss).toFixed(2)} m über Fuss`;
  const g = /(?:^|_)(OGL|OGR|UGL|UGR)_/.exec(s.n);
  const TEIL = { OGL: 'Obergurt vorn', OGR: 'Obergurt hinten', UGL: 'Untergurt vorn', UGR: 'Untergurt hinten' };
  if (g) return `${TEIL[g[1]]}, x = ${P[0].toFixed(2)} m`;
  return `${s.r === 'blech' ? 'Blech' : s.n}, x = ${P[0].toFixed(2)} m`;
}
