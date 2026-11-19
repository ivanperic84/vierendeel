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
import {
  ZL_PUNKTE, ZL_AUS_MODUS, zustandAussen, zustandIntern, ZL_EBENEN, ZL_NAME, zlEinheit, ZL_REAKTION, zustandWert, zustandSicht, zustandReihe, zustandDarstellbar, zustandEbeneAuto, zustandBlick, zustandWo, zustandBauen,
} from './core.zustandwerte.js';

// Die reinen Teile stehen seit dem 19. November in core.zustandwerte.js (für den Viewer).
export {
  ZL_PUNKTE, ZL_AUS_MODUS, zustandAussen, zustandIntern, ZL_EBENEN, ZL_NAME, zlEinheit, ZL_REAKTION, zustandWert, zustandSicht, zustandReihe, zustandDarstellbar, zustandEbeneAuto, zustandBlick, zustandWo, zustandBauen,
};

const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return l > 1e-6 ? a.map((c) => c / l) : null; };
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
