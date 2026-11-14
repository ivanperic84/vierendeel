/**
 * export.zustandsbild.js - Zustandslinien als Vektorbild für den Bericht.
 *
 * Weisung vom 14. November: «Die diagramme sollten auch in die berichte
 * integriert werden soweit wie sinnvoll.», dann «Ja, Bericht». Dieselbe
 * Rechnung wie im 3D (core.zustandslinien.js), hier als ebene Ansicht:
 * Längsansicht (x nach rechts, z nach oben) oder Querschnitt (y nach rechts).
 * Mit `klappen` wird eine Linie, die aus der Bildebene herausstünde (M_x der
 * Masten in der Längsansicht), in die Bildebene geklappt: sie steht dann
 * quer zum Stab in x, positive Werte nach +x. Das Bild sagt es.
 *
 * Helle Farben wie die übrigen Bilder des Berichts; rot positiv, blau
 * negativ, σ_v nach Ausnutzung.
 */

import { ZL_PUNKTE, ZL_NAME, ZL_REAKTION, zlEinheit, zustandReihe, zustandSicht } from './core.zustandslinien.js';

const POS = [200, 60, 45], NEG = [40, 95, 200];
const rgba = (f, a) => `rgba(${f.join(',')},${a})`;
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * @param {Array} geo     zustandGeometrie(dat)
 * @param {Array} faelle  [zustandFall …] - einer, oder mehrere für die Hülle
 * @param {object} o      { k, teile, blick: 'laengs'|'quer', klappen, breite, hoehe, fyd,
 *                          titel, reaktion: true }
 * @returns {{svg: string, max: number, min: number}|null}
 */
export function zustandSvg(geo, faelle, o = {}) {
  const k = o.k, fyd = o.fyd ?? 1, huelle = faelle.length > 1;
  const sicht = geo.map((s) => zustandSicht(s, o.teile ?? 'alle'));
  const H = o.blick === 'quer' ? 1 : 0;                  // waagrechte Bildachse: x oder y
  const pr = (p) => [p[H], p[2]];
  // Reihen und Grösstwerte.
  // Bei σ_v / η zählt nur der Grösstwert (immer positiv).
  const arten = huelle ? (k === 'sig' || k === 'eta' ? ['max'] : ['max', 'min']) : ['eins'];
  const reihen = [];
  let vmax = 0, hi = -Infinity, lo = Infinity;
  geo.forEach((s, i) => {
    if (!sicht[i]) return;
    arten.forEach((art) => {
      const r = zustandReihe(k, faelle, i, s, art, fyd);
      if (!r.some((x) => x.d && x.v !== null)) return;
      reihen.push({ s, r });
      r.forEach((x) => { if (x.d && x.v !== null) { vmax = Math.max(vmax, Math.abs(x.v)); hi = Math.max(hi, x.v); lo = Math.min(lo, x.v); } });
    });
  });
  if (!reihen.length || vmax < 1e-9) return null;
  // Die Richtung in der Bildebene: wo die Linie aus der Ebene stünde, klappen.
  const richtung = (s, d) => {
    let r = [d[H], d[2]];
    if (o.klappen || Math.hypot(r[0], r[1]) < 0.5) {
      // quer zum Stab in der Bildebene, positive Werte nach +x bzw. +z
      const t = [s.b[H] - s.a[H], s.b[2] - s.a[2]];
      const l = Math.hypot(t[0], t[1]) || 1;
      r = [-t[1] / l, t[0] / l];
      if (r[0] < -1e-9 || (Math.abs(r[0]) < 1e-9 && r[1] < 0)) r = [-r[0], -r[1]];
    } else {
      const l = Math.hypot(r[0], r[1]); r = [r[0] / l, r[1] / l];
    }
    return r;
  };
  // Ausdehnung des Modells (sichtbare Stäbe) und Massstab der Linien.
  // Das Bild umfasst die gezeigten Teile (ein Jochbild ohne die ganzen Masten).
  const allePts = geo.filter((_, i) => sicht[i]).flatMap((s) => [pr(s.a), pr(s.b)]);
  const xMin = Math.min(...allePts.map((p) => p[0])), xMax = Math.max(...allePts.map((p) => p[0]));
  const zMin = Math.min(...allePts.map((p) => p[1])), zMax = Math.max(...allePts.map((p) => p[1]));
  const ausd = Math.max(xMax - xMin, zMax - zMin, 1);
  const skal = 0.09 * ausd / vmax;                       // grösster Wert = 9 % der Modellgrösse
  const rand = Math.max(0.16 * ausd, 1.6 * 0.09 * ausd);
  const B = o.breite ?? 860, x0 = xMin - rand, x1 = xMax + rand, z0 = zMin - rand * 0.6, z1 = zMax + rand * 0.6;
  const m = B / (x1 - x0);
  const Hpx = Math.round((z1 - z0) * m);
  const X = (x) => ((x - x0) * m).toFixed(1), Z = (z) => ((z1 - z) * m).toFixed(1);
  const farbe = (v, a) => {
    if (k !== 'sig' && k !== 'eta') return rgba(v >= 0 ? POS : NEG, a);
    const e = k === 'eta' ? v : v / fyd;
    return rgba(e < 0.6 ? [40, 150, 80] : e < 0.9 ? [200, 150, 20] : POS, a);
  };
  const fmt = (v) => (k === 'eta' ? v.toFixed(3) : Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));
  const teile = [];
  // Alle Stäbe im Ausschnitt grau, die gezeigten dunkler.
  const imBild = (p) => p[0] >= x0 && p[0] <= x1 && p[1] >= z0 && p[1] <= z1;
  geo.forEach((s, i) => {
    const a = pr(s.a), b = pr(s.b);
    if (!sicht[i] && !(imBild(a) && imBild(b))) return;
    teile.push(`<line x1="${X(a[0])}" y1="${Z(a[1])}" x2="${X(b[0])}" y2="${Z(b[1])}" stroke="${sicht[i] ? '#777' : '#d4d4d4'}" stroke-width="${sicht[i] ? 1 : 0.7}"/>`);
  });
  const marken = [];
  reihen.forEach(({ s, r }) => {
    const pk = r.map((x, p) => {
      const t = p / (ZL_PUNKTE - 1);
      const P = [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t, s.a[2] + (s.b[2] - s.a[2]) * t];
      const q = pr(P);
      const d = x.d ? richtung(s, x.d) : [0, 0];
      const v = x.v ?? 0;
      return { q, Q: [q[0] + d[0] * v * skal, q[1] + d[1] * v * skal], v, leer: x.v === null || !x.d };
    });
    for (let p = 0; p < pk.length - 1; p += 1) {
      const a = pk[p], b = pk[p + 1];
      if (a.leer || b.leer) continue;
      const vm = (a.v + b.v) / 2;
      teile.push(`<polygon points="${X(a.q[0])},${Z(a.q[1])} ${X(a.Q[0])},${Z(a.Q[1])} ${X(b.Q[0])},${Z(b.Q[1])} ${X(b.q[0])},${Z(b.q[1])}" fill="${farbe(vm, 0.22)}" stroke="none"/>`);
      teile.push(`<line x1="${X(a.Q[0])}" y1="${Z(a.Q[1])}" x2="${X(b.Q[0])}" y2="${Z(b.Q[1])}" stroke="${farbe(vm, 0.95)}" stroke-width="1.2"/>`);
    }
    const ok = pk.filter((x) => !x.leer);
    if (!ok.length) return;
    const e = ok.reduce((x, y) => (Math.abs(y.v) > Math.abs(x.v) ? y : x));
    if (Math.abs(e.v) >= 0.5 * vmax && Math.abs(e.v) > 1e-3) marken.push({ x: +X(e.Q[0]), y: +Z(e.Q[1]), v: e.v });
  });
  // Lagerwerte am Fuss (Reaktion zur Grösse), wenn gewünscht.
  const fuss = [];
  if (o.reaktion && ZL_REAKTION[k] !== undefined) {
    const idx = ZL_REAKTION[k], einh = idx >= 3 ? 'kNm' : 'kN';
    const kurz = ['R_x', 'R_y', 'R_z', 'M_x', 'M_y', 'M_z'][idx];
    Object.keys(faelle[0].reak).forEach((kn) => {
      const st = geo.filter((s) => s.n.replace(/_S\d+$/, '_F') === kn);
      if (!st.length) return;
      const unten = st.flatMap((s) => [s.a, s.b]).reduce((a, b) => (b[2] < a[2] ? b : a));
      const vs = faelle.map((f) => f.reak[kn]?.[idx] ?? 0);
      const lo2 = Math.min(...vs), hi2 = Math.max(...vs);
      const f2 = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
      const text = `Lager ${kurz} ${huelle ? `${f2(lo2)} / ${f2(hi2)}` : f2(hi2)} ${einh}`;
      fuss.push(`<text x="${X(pr(unten)[0])}" y="${(+Z(pr(unten)[1]) + 26).toFixed(1)}" font-size="10" fill="#333" text-anchor="middle">${esc(text)}</text>`);
    });
  }
  // Anschrift ohne Überlappung, die grössten zuerst.
  const belegt = [];
  marken.sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).forEach((mk) => {
    const t = fmt(mk.v), w = t.length * 5.6 + 4;
    const x = mk.x + 4, y = mk.y;
    if (belegt.some((b) => Math.abs(b.x - x) < (b.w + w) / 2 + 14 && Math.abs(b.y - y) < 16)) return;
    belegt.push({ x, y, w });
    teile.push(`<text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" font-size="10" fill="${farbe(mk.v, 0.95)}">${esc(t)}</text>`);
  });
  const name = ZL_NAME[k] ?? k, einh = zlEinheit(k);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${B} ${Hpx + 18}" width="100%" style="max-width:${B}px;font-family:Arial,sans-serif">
    <g transform="translate(0,4)">${teile.join('')}${fuss.join('')}</g>
    <text x="4" y="${Hpx + 14}" font-size="10" fill="#555">${esc(`${o.blick === 'quer' ? 'Querschnitt (y nach rechts)' : 'Längsansicht (x nach rechts)'} · ${name}${einh ? ` [${einh}]` : ''}${huelle ? ' · Hülle über die Nachweisfälle' : ''}${o.klappen ? ' · in die Bildebene geklappt, positiv nach +x' : ''}`)}</text>
  </svg>`;
  return { svg, max: hi, min: lo };
}
