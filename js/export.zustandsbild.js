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
  /*
   * >>> MASTEN NEBENEINANDER IM QUERSCHNITT (14. November). <<< «kann man für
   * mx die darstellung quer nehmen?» - im Querschnitt stehen die Masten
   * hintereinander; mit `nebeneinander` rückt jeder um einen festen Abstand
   * nach rechts (nach seiner Lage x geordnet) und trägt seinen Namen.
   */
  const versatz = new Map();
  if (o.nebeneinander) {
    const masten = [...new Set(geo.map((s, i) => (sicht[i] ? kurzMast(s.n) : null)).filter(Boolean))];
    const xVon = (m) => Math.min(...geo.filter((s) => kurzMast(s.n) === m).map((s) => s.a[0]));
    masten.sort((a, b) => xVon(a) - xVon(b)).forEach((m, i) => versatz.set(m, i * (o.abstand ?? 7)));
  }
  const off = (s) => (s ? versatz.get(kurzMast(s.n)) ?? 0 : 0);
  const pr = (p, s = null) => [p[H] + off(s), p[2]];
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
  const allePts = geo.filter((_, i) => sicht[i]).flatMap((s) => [pr(s.a, s), pr(s.b, s)]);
  const xMin = Math.min(...allePts.map((p) => p[0])), xMax = Math.max(...allePts.map((p) => p[0]));
  const zMin = Math.min(...allePts.map((p) => p[1])), zMax = Math.max(...allePts.map((p) => p[1]));
  const ausd = Math.max(xMax - xMin, zMax - zMin, 1);
  const skal = 0.09 * ausd / vmax;                       // grösster Wert = 9 % der Modellgrösse
  const rand = Math.max(0.16 * ausd, 1.6 * 0.09 * ausd);
  const B = o.breite ?? 860, x0 = xMin - rand, x1 = xMax + rand, z0 = zMin - rand * 0.6, z1 = zMax + rand * 0.6;
  // Höchstens ~380 px hoch; ein schmales Bild (Masten im Querschnitt) wird
  // dafür schmaler statt riesig (gemeldet 14. November).
  const m = Math.min(B / (x1 - x0), (o.hoeheMax ?? 380) / (z1 - z0));
  const Hpx = Math.round((z1 - z0) * m);
  const Bb = Math.max(Math.round((x1 - x0) * m), 620);   // Platz für die Zeile darunter
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
    const a = pr(s.a, s), b = pr(s.b, s);
    if (!sicht[i] && (o.nebeneinander || !(imBild(a) && imBild(b)))) return;
    teile.push(`<line x1="${X(a[0])}" y1="${Z(a[1])}" x2="${X(b[0])}" y2="${Z(b[1])}" stroke="${sicht[i] ? '#777' : '#d4d4d4'}" stroke-width="${sicht[i] ? 1 : 0.7}"/>`);
  });
  const marken = [];
  reihen.forEach(({ s, r }) => {
    const pk = r.map((x, p) => {
      const t = p / (ZL_PUNKTE - 1);
      const P = [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t, s.a[2] + (s.b[2] - s.a[2]) * t];
      const q = pr(P, s);
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
      const u = pr(unten, st[0]);
      fuss.push(`<text x="${X(u[0])}" y="${(+Z(u[1]) + 26).toFixed(1)}" font-size="10" fill="#333" text-anchor="middle">${esc(text)}</text>`);
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
  // Die Namen über den Masten, wenn sie nebeneinander stehen.
  versatz.forEach((_, m) => {
    const st = geo.filter((s) => kurzMast(s.n) === m);
    const oben = st.flatMap((s) => [s.a, s.b]).reduce((a, b) => (b[2] > a[2] ? b : a));
    const q = pr(oben, st[0]);
    teile.push(`<text x="${X(q[0])}" y="${(+Z(q[1]) - 8).toFixed(1)}" font-size="10.5" font-weight="600" fill="#333" text-anchor="middle">${esc(m)}</text>`);
  });
  const name = ZL_NAME[k] ?? k, einh = zlEinheit(k);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Bb} ${Hpx + 18}" width="100%" style="max-width:${Bb}px;font-family:Arial,sans-serif">
    <g transform="translate(0,4)">${teile.join('')}${fuss.join('')}</g>
    <text x="4" y="${Hpx + 14}" font-size="10" fill="#555">${esc(`${o.blick === 'quer' ? 'Querschnitt (y nach rechts)' : 'Längsansicht (x nach rechts)'} · ${name}${einh ? ` [${einh}]` : ''}${huelle ? ' · Hülle über die Nachweisfälle' : ''}${o.klappen ? ' · in die Bildebene geklappt, positiv nach +x' : ''}${o.nebeneinander ? ' · Masten nebeneinander' : ''}`)}</text>
  </svg>`;
  return { svg, max: hi, min: lo };
}

/* ===========================================================================
 * >>> SYSTEMSKIZZE UND LASTBILDER IM SELBEN STIL (14. November). <<<
 * =========================================================================
 *
 * Weisung: «kann man diese darstellungsart auch für die lasten übernehmen
 * und die querschnitt modelldartellung. das 3d aus der app kann man für die
 * titelseite nutzen». Auf Rückfrage «Bericht, je Lastfall», «Systemskizze als
 * Vektorbild» (Längsansicht und Querschnitt statt Bildschirmfoto) und «Ja,
 * nur Titelseite». Beides aus der Modelldatei des Stabwerks (`roh.dat`).
 */

/** Rahmen eines ebenen Bildes: Massstab und Umrechnung in Bildpunkte. */
function rahmen(punkte, rand, B, mFest = null) {
  const xMin = Math.min(...punkte.map((p) => p[0])), xMax = Math.max(...punkte.map((p) => p[0]));
  const zMin = Math.min(...punkte.map((p) => p[1])), zMax = Math.max(...punkte.map((p) => p[1]));
  const x0 = xMin - rand.l, x1 = xMax + rand.r, z0 = zMin - rand.u, z1 = zMax + rand.o;
  // `mFest`: derselbe Massstab wie ein Nachbarbild (Systemskizze).
  const m = mFest ?? B / (x1 - x0);
  return { m, B: Math.round((x1 - x0) * m), H: Math.round((z1 - z0) * m), X: (x) => +((x - x0) * m).toFixed(1), Z: (z) => +((z1 - z) * m).toFixed(1),
           xMin, xMax, zMin, zMax };
}

const kurzMast = (n) => /MAST_([^_]+)_/.exec(n)?.[1] ?? null;

/** Die Stäbe der Modelldatei: echte Stäbe dunkel, Glieder der Anbauteile dünn. */
function stabSkizze(dat, pr, R, opt = {}) {
  const kn = new Map(dat.knoten.map((k) => [k.name, [k.x, k.y, k.z]]));
  const out = [];
  dat.staebe.forEach((s) => {
    const a = kn.get(s.von), b = kn.get(s.bis);
    if (!a || !b) return;
    const A = pr(a), Bp = pr(b);
    const echt = s.art === 'stab';
    const anbau = /^(?:[^_]+_)?(ARM|AT|AL|KETTE)/.test(s.name);
    if (!echt && !anbau) return;
    out.push(`<line x1="${R.X(A[0])}" y1="${R.Z(A[1])}" x2="${R.X(Bp[0])}" y2="${R.Z(Bp[1])}" `
      + `stroke="${opt.grau ? '#bbb' : echt ? '#333' : '#8a8a8a'}" stroke-width="${echt ? (opt.grau ? 0.8 : 1.2) : 0.7}"/>`);
  });
  return out;
}

/** Einspannung am Lager: Strich mit Schraffur. */
function lagerSymbol(X, Z) {
  const w = 9;
  let s = `<line x1="${X - w}" y1="${Z}" x2="${X + w}" y2="${Z}" stroke="#333" stroke-width="1.6"/>`;
  for (let i = -w; i <= w; i += 4) s += `<line x1="${X + i}" y1="${Z}" x2="${X + i - 4}" y2="${Z + 5}" stroke="#333" stroke-width="0.8"/>`;
  return s;
}

/**
 * Die Systemskizze als Vektorbild: Längsansicht (x nach rechts) und
 * Querschnitt (y nach rechts) nebeneinander; Stäbe, Anbauteile (dünn),
 * Einspannung an den Lagern, Mastnamen, Mastabstände und Mastlängen.
 */
export function systemSvg(dat, o = {}) {
  const B = o.breite ?? 860;
  const kn = new Map(dat.knoten.map((k) => [k.name, k]));
  const bildEines = (H, breite, titel, mFest = null) => {
    const pr = (p) => [p[H], p[2]];
    const pts = dat.knoten.map((k) => pr([k.x, k.y, k.z]));
    const R = rahmen(pts, { l: H === 0 ? 3.6 : 1.2, r: 1.2, u: 2.2, o: 0.8 }, breite, mFest);
    const t = stabSkizze(dat, pr, R);
    const lager = (dat.auflager ?? []).map((a) => {
      const k = kn.get(a.knoten);
      return k ? { n: kurzMast(a.knoten) ?? a.knoten, p: pr([k.x, k.y, k.z]) } : null;
    }).filter(Boolean);
    lager.forEach((l) => {
      t.push(lagerSymbol(R.X(l.p[0]), R.Z(l.p[1])));
      t.push(`<text x="${R.X(l.p[0])}" y="${R.Z(l.p[1]) + 18}" font-size="10" text-anchor="middle" fill="#333">${esc(l.n)}</text>`);
    });
    // Masslinien in der Längsansicht: die Abstände der Masten.
    if (H === 0 && lager.length > 1) {
      const xs = [...new Set(lager.map((l) => +l.p[0].toFixed(3)))].sort((a, b) => a - b);
      const zM = R.Z(R.zMin) + 32;
      for (let i = 0; i < xs.length - 1; i += 1) {
        const a = R.X(xs[i]), b = R.X(xs[i + 1]);
        t.push(`<line x1="${a}" y1="${zM}" x2="${b}" y2="${zM}" stroke="#666" stroke-width="0.7"/>`
          + `<line x1="${a}" y1="${zM - 4}" x2="${a}" y2="${zM + 4}" stroke="#666"/><line x1="${b}" y1="${zM - 4}" x2="${b}" y2="${zM + 4}" stroke="#666"/>`
          + `<text x="${(a + b) / 2}" y="${zM - 3}" font-size="10" text-anchor="middle" fill="#333">${(xs[i + 1] - xs[i]).toFixed(2)} m</text>`);
      }
    }
    // Mastlängen: von Fuss bis zum obersten Punkt des Masts (nur Längsansicht).
    if (H === 0) {
      const masten = new Map();
      dat.staebe.forEach((s) => {
        const m = kurzMast(s.name);
        if (!m || s.art !== 'stab') return;
        [kn.get(s.von), kn.get(s.bis)].forEach((k) => {
          if (!k) return;
          const e = masten.get(m) ?? { lo: k, hi: k };
          if (k.z < e.lo.z) e.lo = k;
          if (k.z > e.hi.z) e.hi = k;
          masten.set(m, e);
        });
      });
      masten.forEach((e, m) => {
        const x = R.X(e.lo.x) - 14;
        t.push(`<line x1="${x}" y1="${R.Z(e.lo.z)}" x2="${x}" y2="${R.Z(e.hi.z)}" stroke="#666" stroke-width="0.7"/>`
          + `<text x="${x - 3}" y="${(R.Z(e.lo.z) + R.Z(e.hi.z)) / 2}" font-size="10" text-anchor="end" fill="#333">${esc(m)} ${(e.hi.z - e.lo.z).toFixed(2)} m</text>`);
      });
    }
    return { svg: t.join(''), w: R.B, h: R.H + 8, titel, m: R.m };
  };
  // Beide Ansichten im selben Massstab: die Längsansicht füllt die Breite
  // neben dem Querschnitt.
  const yAusd = Math.max(...dat.knoten.map((k) => k.y)) - Math.min(...dat.knoten.map((k) => k.y)) + 2.4;
  const xAusd = Math.max(...dat.knoten.map((k) => k.x)) - Math.min(...dat.knoten.map((k) => k.x)) + 4.8;
  const mGem = (B * 0.94) / (xAusd + yAusd);
  const laengs = bildEines(0, null, 'Längsansicht (x quer zum Gleis nach rechts)', mGem);
  const quer = bildEines(1, null, 'Querschnitt', mGem);
  const h = Math.max(laengs.h, quer.h) + 18;
  const dx = laengs.w + Math.round(B * 0.04);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${B} ${h}" width="100%" style="max-width:${B}px;font-family:Arial,sans-serif">
    <g>${laengs.svg}</g><g transform="translate(${dx},0)">${quer.svg}</g>
    <text x="4" y="${h - 4}" font-size="10" fill="#555">${esc(laengs.titel)}</text>
    <text x="${dx}" y="${h - 4}" font-size="10" fill="#555">${esc(quer.titel)}</text>
  </svg>`;
}

const RICHTUNG = { X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1] };

/**
 * Ein Lastbild: die Lasten einiger Lastfallgruppen der Modelldatei auf dem
 * System. Streckenlasten als Band mit Pfeil zum Stab, Einzellasten als
 * Pfeil mit Wert; was in Blickrichtung oder in Stabrichtung wirkt (z. B. das
 * Eigengewicht der Masten), steht nur in der Summe darunter.
 *
 * @param {object} o { gruppen: ['G', …], blick: 'laengs'|'quer', breite, hinweis }
 * @returns {{svg: string, summe: number[]}|null}
 */
export function lastSvg(dat, o = {}) {
  const H = o.blick === 'quer' ? 1 : 0, Hn = H === 0 ? 1 : 0;   // Hn: Blickrichtung
  const pr = (p) => [p[H], p[2]];
  const gr = new Set(o.gruppen ?? []);
  const kn = new Map(dat.knoten.map((k) => [k.name, [k.x, k.y, k.z]]));
  const stab = new Map(dat.staebe.map((s) => [s.name, s]));
  const strecke = (dat.lasten?.strecke ?? []).filter((l) => gr.has(l.lastfall) && stab.has(l.stab));
  const punkt = (dat.lasten?.punkt ?? []).filter((l) => gr.has(l.lastfall) && kn.has(l.knoten));
  if (!strecke.length && !punkt.length) return null;
  const B = o.breite ?? 860;
  const pts = dat.knoten.map((k) => pr([k.x, k.y, k.z]));
  const ausd = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
  const hoehe = Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]));
  // Der Querschnitt im Massstab der Längsansicht - auf die volle Breite
  // skaliert wurde er übergross (gemeldet 14. November).
  const xAusd = Math.max(...dat.knoten.map((k) => k.x)) - Math.min(...dat.knoten.map((k) => k.x));
  const L = Math.max(ausd, xAusd, hoehe, 1);
  const mL = B / (xAusd + 0.24 * L);
  const R = rahmen(pts, { l: 0.12 * L, r: 0.12 * L, u: 0.1 * L, o: 0.14 * L }, B, H === 1 ? mL : null);
  const Bb = Math.max(R.B, 360);
  const t = stabSkizze(dat, pr, R, { grau: true });
  const summe = [0, 0, 0];
  const qmax = Math.max(1e-9, ...strecke.map((l) => Math.abs(l.wert)));
  const fmax = Math.max(1e-9, ...punkt.map((l) => Math.abs(l.wert)));
  const sq = 0.05 * L / qmax, sf = 0.1 * L / fmax;
  const blau = '#2a5fc8', rot = '#c8402d';
  const pfeil = (x1, y1, x2, y2, farbe) => {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${farbe}" stroke-width="1"/>`
      + `<polygon points="${x2.toFixed(1)},${y2.toFixed(1)} ${(x2 - ux * 6 - uy * 3).toFixed(1)},${(y2 - uy * 6 + ux * 3).toFixed(1)} ${(x2 - ux * 6 + uy * 3).toFixed(1)},${(y2 - uy * 6 - ux * 3).toFixed(1)}" fill="${farbe}"/>`;
  };
  const marken = [];
  strecke.forEach((l) => {
    const s = stab.get(l.stab), a = kn.get(s.von), b = kn.get(s.bis);
    const d = RICHTUNG[l.richtung], w = l.wert;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1;
    for (let j = 0; j < 3; j += 1) summe[j] += d[j] * w * len;
    if (Math.abs(d[Hn]) > 0.9) return;                             // in Blickrichtung
    const ex = [(b[0] - a[0]) / len, (b[1] - a[1]) / len, (b[2] - a[2]) / len];
    if (Math.abs(d[0] * ex[0] + d[1] * ex[1] + d[2] * ex[2]) > 0.9) return;   // in Stabrichtung
    const off = (p) => [p[0] - d[0] * w * sq, p[1] - d[1] * w * sq, p[2] - d[2] * w * sq];
    const A = pr(a), Bq = pr(b), A2 = pr(off(a)), B2 = pr(off(b));
    t.push(`<polygon points="${R.X(A[0])},${R.Z(A[1])} ${R.X(A2[0])},${R.Z(A2[1])} ${R.X(B2[0])},${R.Z(B2[1])} ${R.X(Bq[0])},${R.Z(Bq[1])}" fill="rgba(42,95,200,.13)" stroke="none"/>`);
    t.push(`<line x1="${R.X(A2[0])}" y1="${R.Z(A2[1])}" x2="${R.X(B2[0])}" y2="${R.Z(B2[1])}" stroke="${blau}" stroke-width="0.8"/>`);
    const mx = (R.X(A2[0]) + R.X(B2[0])) / 2, my = (R.Z(A2[1]) + R.Z(B2[1])) / 2;
    const tx = (R.X(A[0]) + R.X(Bq[0])) / 2, ty = (R.Z(A[1]) + R.Z(Bq[1])) / 2;
    if (Math.hypot(tx - mx, ty - my) > 7) t.push(pfeil(mx, my, tx, ty, blau));
    // Je Stabzug (Name ohne Abschnittsnummer) nur EINE Anschrift: der grösste Wert.
    const zug = `${l.stab.replace(/_S\d+$/, '')}|${l.richtung}`;
    marken.push({ x: mx, y: my, text: `${Math.abs(w).toFixed(2)} kN/m`, v: Math.abs(w), zug });
  });
  punkt.forEach((l) => {
    const p = kn.get(l.knoten), d = RICHTUNG[l.richtung], w = l.wert;
    for (let j = 0; j < 3; j += 1) summe[j] += d[j] * w;
    if (Math.abs(d[Hn]) > 0.9) return;
    const P = pr(p), S = pr([p[0] - d[0] * w * sf, p[1] - d[1] * w * sf, p[2] - d[2] * w * sf]);
    t.push(pfeil(R.X(S[0]), R.Z(S[1]), R.X(P[0]), R.Z(P[1]), rot));
    marken.push({ x: R.X(S[0]), y: R.Z(S[1]), text: `${Math.abs(w).toFixed(2)} kN`, v: Math.abs(w) + 1e6, farbe: rot });
  });
  // Je Stabzug die mittlere der gleichen Anschriften.
  const zuege = new Map();
  marken.filter((mk) => mk.zug).forEach((mk) => { const z = zuege.get(mk.zug) ?? []; z.push(mk); zuege.set(mk.zug, z); });
  const behalten = new Set([...zuege.values()].map((z) => {
    const vmax = Math.max(...z.map((mk) => mk.v));
    const gleich = z.filter((mk) => mk.v >= vmax - 1e-9);
    return gleich[Math.floor(gleich.length / 2)];
  }));
  // Anschrift ohne Überlappung, Einzellasten zuerst.
  const belegt = [];
  marken.filter((mk) => !mk.zug || behalten.has(mk)).sort((a, b) => b.v - a.v).forEach((mk) => {
    const w = mk.text.length * 5.4 + 4, x = mk.x + 3, y = mk.y - 3;
    if (belegt.some((b) => Math.abs(b.x - x) < (b.w + w) / 2 + 6 && Math.abs(b.y - y) < 12)) return;
    belegt.push({ x, y, w });
    t.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="9.5" fill="${mk.farbe ?? blau}">${esc(mk.text)}</text>`);
  });
  const h = R.H + 22;
  const sumText = `Summe: F_x ${summe[0].toFixed(2)} · F_y ${summe[1].toFixed(2)} · F_z ${summe[2].toFixed(2)} kN`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Bb} ${h}" width="100%" style="max-width:${Bb}px;font-family:Arial,sans-serif">
    ${t.join('')}
    <text x="4" y="${h - 6}" font-size="10" fill="#555">${esc(`${o.blick === 'quer' ? 'Querschnitt (y nach rechts)' : 'Längsansicht (x nach rechts)'} · ${sumText}${o.hinweis ? ` · ${o.hinweis}` : ''}`)}</text>
  </svg>`;
  return { svg, summe };
}
