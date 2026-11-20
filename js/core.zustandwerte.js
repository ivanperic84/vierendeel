/**
 * core.zustandwerte.js - die reinen Teile der Zustandslinien (19. November).
 *
 * Herausgelöst aus core.zustandslinien.js, damit die Viewer-Datei (js/viewer.js)
 * die Zustandslinie zeichnen kann, ohne Löser und Nachweise mitzubündeln
 * (Weisung 19. November: «darstellungsbutton liniendiagramm / bei der explosion
 * das liniendiagramm auch darstellen»). Keine Importe. Gerechnet werden die
 * Werte weiter in core.zustandslinien.js (zustandFall); hier stehen Auswahl,
 * Ebenen, Hülle und der Aufbau der Linien für den Renderer (zustandBauen).
 */

export const ZL_PUNKTE = 11;

/** Die Plotgrössen der App, die eine Zustandslinie haben, und ihre Grösse hier. */
export const ZL_AUS_MODUS = { eta: 'eta', sig_v: 'sig', M: 'M', V: 'V', N: 'N', T: 'T' };

const ACHSE = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return l > 1e-6 ? a.map((c) => c / l) : null; };
const skalar = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * >>> «NACH AUSSEN» JE STAB (18. November). <<< Weisung: «die
 * diagrammdarstellung linie bei den bindeblechen sinngemäss jeweils gegen
 * aussen darstellen wie bei den gurten, so dass diese besser lesbar sind.»
 * Je Stab die Richtung vom Tragwerk weg (Einheitsvektor) oder null:
 *   - Gurte: Obergurt nach oben, Untergurt nach unten (17. November);
 *   - liegende Bleche (Stab quer zur Höhe): nach oben bzw. unten, je nachdem,
 *     ob sie über oder unter der Mitte der Gurte ihres Tragwerks liegen;
 *   - stehende Bleche (Stab lotrecht): zur Seite, auf der sie stehen (y).
 * Die Mitte je Tragwerk aus seinen Gurtstäben (Präfix T1_, MT1_ …).
 * Das Diagramm zeigt dann mit dem Betrag nach aussen, sofern es in einer
 * Ebene steht, die diese Richtung enthält; das Vorzeichen sagen Farbe und
 * Anschrift.
 */
export function zustandAussen(geo) {
  const praefix = (n) => /^((?:MT|[TA])\d+_)?/.exec(String(n))[1] ?? '';
  const mitte = new Map();
  geo.forEach((s) => {
    if (!/^gurt/.test(s.r ?? '')) return;
    const k = praefix(s.n);
    const m = mitte.get(k) ?? { y: 0, z: 0, n: 0 };
    m.y += (s.a[1] + s.b[1]) / 2; m.z += (s.a[2] + s.b[2]) / 2; m.n += 1;
    mitte.set(k, m);
  });
  return geo.map((s) => {
    const gurt = /^gurt/.test(s.r ?? '') ? /(^|_)(OG|UG)[LR]_/.exec(s.n)?.[2] : null;
    if (gurt) return [0, 0, gurt === 'OG' ? 1 : -1];
    if (s.r !== 'blech') return null;
    const m = mitte.get(praefix(s.n));
    if (!m?.n) return null;
    const my = (s.a[1] + s.b[1]) / 2 - m.y / m.n, mz = (s.a[2] + s.b[2]) / 2 - m.z / m.n;
    const d = [s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]];
    const L = Math.hypot(...d) || 1;
    // Stehend: Stab vorwiegend lotrecht -> zur Seite; liegend -> nach oben / unten.
    if (Math.abs(d[2]) / L > 0.7) return Math.abs(my) > 1e-3 ? [0, Math.sign(my), 0] : null;
    return Math.abs(mz) > 1e-3 ? [0, 0, Math.sign(mz)] : null;
  });
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
/** Bezugsgrösse des Massstabs je Art (19. November): darunter wird nicht vergrössert. */
export const ZL_BEZUG = { M: 10, V: 5, N: 10, T: 1, sig: 50, eta: 0.2 };
export function zlBezug(k) {
  if (k === 'sig' || k === 'eta' || k === 'N' || k === 'T') return ZL_BEZUG[k];
  return /^[Mm]/.test(k) ? ZL_BEZUG.M : ZL_BEZUG.V;
}
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
  // N und T in der lotrechten Ebene wie σ_v (19. November, «diese liniendiagramme
  // normalkraft vertikal ausrichten») - örtlich z lag an den Winkeln schräg.
  const lok = { N: [0, s.dSig ?? s.ez], T: [3, s.dSig ?? s.ez], vy: [1, s.ey], vz: [2, s.ez], my: [4, s.ez], mz: [5, s.ey] }[k];
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
  if (s.r === '__aus') return false;   // über die Ebenen ausgeblendet (zustandBauen)
  if (teile === 'alle') return true;
  // Mehrere Gruppen mit «|» (Bericht: «gurt:OGL,UGL|mast»).
  if (teile.includes('|')) return teile.split('|').some((t) => zustandSicht(s, t));
  if (teile.startsWith('gurt')) {
    // Auch mehrere, durch Komma getrennt («gurt:OGL,UGL» = die vorderen Gurte).
    const g = teile.split(':')[1];
    return /^gurt/.test(s.r) && (!g || g.split(',').some((x) => new RegExp(`(^|_)${x}_`).test(s.n)));
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


/**
 * Baut die Linien fuer den Renderer (`ansicht.zustand`) aus Geometrie und
 * Werten der Faelle - ohne Loeser, auch in der Viewer-Datei.
 * @param {object} o  { geo, aussen, faelle, groesse, eb, teile, ax, dx, dz, fyd }
 *                    eb 'auto' oder eine Ebene aus ZL_EBENEN; faelle: zustandFall
 *                    (oder dieselbe Gestalt aus der Viewer-Datei)
 */
export function zustandBauen(o) {
  const { geo, aussen, faelle, groesse } = o;
  const teile = o.teile ?? 'alle', ax = o.ax ?? 'global';
  const dx = o.dx ?? 0, dz = o.dz ?? 0, fyd = o.fyd ?? 1;
  if (!faelle?.length || !groesse) return null;
  const spannung = groesse === 'sig' || groesse === 'eta';
  const geoS = o.sicht ? geo.map((s) => (o.sicht(s) ? s : { ...s, r: '__aus' })) : geo;
  const ebAuto = zustandEbeneAuto(groesse, faelle, geoS, teile, ax);
  const eb = (o.eb && o.eb !== 'auto' && ZL_EBENEN[ax].includes(o.eb)) ? o.eb : ebAuto;
  const k = zustandIntern(groesse, eb, ax);
  const huelle = faelle.length > 1;
  // Bei σ_v / η zählt nur der Grösstwert (immer positiv).
  const arten = huelle ? (spannung ? ['max'] : ['max', 'min']) : ['eins'];
  const zFuss = Math.min(...geo.map((s) => Math.min(s.a[2], s.b[2])));
  const reihen = [];
  let vmax = 0, gmax = null, gmin = null;
  geo.forEach((s, i) => {
    if (!zustandSicht(s, teile) || (o.sicht && !o.sicht(s))) return;
    arten.forEach((art) => {
      const r = zustandReihe(k, faelle, i, s, art, fyd);
      if (!r.some((x) => x.d && x.v !== null)) return;
      reihen.push({ s, i, r });
      r.forEach((x, p) => {
        if (!x.d || x.v === null) return;
        vmax = Math.max(vmax, Math.abs(x.v));
        if (!gmax || x.v > gmax.v) gmax = { ...x, s, p };
        if (!gmin || x.v < gmin.v) gmin = { ...x, s, p };
      });
    });
  });
  // Massstab: der grösste Betrag wird 8 % der Modellgrösse.
  const xs = geo.flatMap((s) => [s.a[0], s.b[0]]), zs = geo.flatMap((s) => [s.a[2], s.b[2]]);
  const groesseM = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), 1);
  /*
   * >>> KLEINE WERTE KLEIN ZEICHNEN (19. November). <<< Weisung: «es werden
   * zum teil sehr kleine schnittkräfte beim liniendiagramm im 3d sehr gross
   * dargestellt, dass sollte nicht sein, da diese zum teil praktisch null
   * sind. man sollte hier einen grenzwert oder sowas einführen.» Der
   * Massstab bezieht sich auf den grössten Wert, aber mindestens auf eine
   * Bezugsgrösse je Art (ZL_BEZUG): 0.04 kNm stehen dann als Strich da.
   */
  const bezug = zlBezug(k);
  const skal = vmax > 1e-9 ? 0.08 * groesseM / Math.max(vmax, bezug) : 0;
  const linien = reihen.map(({ s, r, i }) => ({
    name: s.n,
    pkt: r.map((x, p) => {
      const t = p / (ZL_PUNKTE - 1);
      const P = [s.a[0] + (s.b[0] - s.a[0]) * t + dx, s.a[1] + (s.b[1] - s.a[1]) * t, s.a[2] + (s.b[2] - s.a[2]) * t + dz];
      /*
       * NAHE NULL IST NULL (21. November, «wenn spannungen nahe null, bei
       * der liniendiagramm darstellung berücksichtigen»): unter 2 % der
       * Bezugsgrösse zeichnet die Linie auf der Stabachse (σ_v: 1 N/mm²).
       */
      const v0 = x.v ?? 0;
      const v = Math.abs(v0) < 0.02 * bezug ? 0 : v0;
      const d = x.d ?? s.ez;
      /*
       * >>> OBERGURT NACH OBEN, UNTERGURT NACH UNTEN (17. November). <<<
       * «die diagramm auswertung bei den ober und untergurten nach oben und
       * unten darstellen, so dass sich diese nicht überdecken» - auf
       * Rückfrage «Betrag nach aussen»: steht das Diagramm eines Gurts in
       * einer lotrechten Ebene, zeigt es mit dem Betrag vom Joch weg; das
       * Vorzeichen sagen Farbe (rot +, blau −) und Anschrift.
       */
      let off = d.map((c) => c * v * skal);
      // Seit dem 18. November auch die Bindebleche nach aussen (`zustandAussen`).
      const au = aussen?.[i];
      const proj = au ? d[0] * au[0] + d[1] * au[1] + d[2] * au[2] : 0;
      const oa = au ? off[0] * au[0] + off[1] * au[1] + off[2] * au[2] : 0;
      if (au && Math.abs(proj) > 0.3 && oa < 0 && Math.abs(oa) > 1e-12) off = off.map((c) => -c);
      // Bindebleche IMMER nach aussen, in jeder Ebene: ihr Diagramm liegt sonst
      // oft in Jochachse (Ebene «quer») und überdeckt das des Nachbarblechs.
      else if (au && s.r === 'blech') off = au.map((c) => c * Math.abs(v) * skal);
      return { p: P, o: off, v: v0, leer: x.v === null || !x.d };
    }),
  }));
  const mg = gmax && gmin ? (Math.abs(gmin.v) > Math.abs(gmax.v) ? gmin : gmax) : gmax;
  const gg = mg === gmin ? gmax : gmin;
  return {
    k, spannung, fyd, linien, reaktionen: [],
    name: ZL_NAME[k], einheit: zlEinheit(k), eb, ebAuto: !o.eb || o.eb === 'auto',
    vmax, groesseM, bezug, klein: vmax < bezug,
    mg: mg ? { v: mg.v, wo: zustandWo(mg.s, mg.p, zFuss), f: mg.f } : null,
    // Bei σ_v und η gibt es keinen Gegenwert (immer positiv).
    gg: !spannung && gg && Math.abs(gg.v) > 1e-3 ? { v: gg.v, wo: zustandWo(gg.s, gg.p, zFuss) } : null,
    reakText: '', huelle,
  };
}
