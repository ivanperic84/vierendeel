/* ===========================================================================
 * core.stabgurtknick.js
 * ---------------------------------------------------------------------------
 * KNICKEN DER GURTWINKEL ZWISCHEN DEN BINDEBLECHEN (18. November).
 *
 * Gemeldet mit Bild: «hier zeigt die app das das knicken noch offen ist
 * obwohl berechnet» - offen war «Knicken Joch» (Gesamtstab und
 * Einzelwinkel). Auf Rückfrage gewählt: «Gesamt über 2. Ordnung +
 * Einzelwinkel neu»: der Gesamtstab gilt mit der Theorie 2. Ordnung oder
 * α_cr ≥ 10 als geführt (app.js), die Einzelwinkel bekommen hier einen
 * Ersatzstabnachweis.
 *
 * JE GURTFELD: die Gurtstäbe zwischen zwei Knoten, an denen ein Bindeblech
 * (BV_, BH_) anschliesst. Knicklänge = Abstand dieser Knoten (Achsabstand
 * der Bleche, EN 1993-1-1, 6.4.3.1), Ausweichen um die schwächste Achse
 * des Winkels (i_v aus I_y, I_z, I_yz). N_Ed = grösste Druckkraft in den
 * Stäben des Feldes über die Nachweis-Kombinationen - aus dem Stabwerk,
 * mit eingeschalteter Theorie 2. Ordnung also nach 2. Ordnung.
 *
 *   λ̄ = L_cr / i_v / (π √(E / f_y)),  Knickspannungskurve b (α = 0.34,
 *   Winkel nach EN 1993-1-1, Tab. 6.2 bzw. SIA 263),
 *   χ = 1 / (Φ + √(Φ² − λ̄²)),  Φ = 0.5 (1 + α (λ̄ − 0.2) + λ̄²),
 *   N_b,Rd = χ A f_y / γ_M1,  η = N_Ed / N_b,Rd.
 *
 * WAS ES NICHT ENTHÄLT: die Biegemomente des Gurts im Feld (der
 * Querschnittsnachweis trägt sie, die Interaktion mit dem Knicken nicht),
 * Biegedrillknicken des Winkels, die Knicklänge in Blechebene (Vierendeel:
 * der Gurt ist an den Blechen biegesteif gehalten; die schwächste Achse
 * mit dem Blechabstand ist die übliche Annahme).
 * ========================================================================= */
import { anteileFuer, kraefteAusAnteilen } from './core.stabnachweis.js';

export const KNICKKURVE_WINKEL = { kurve: 'b', alpha: 0.34 };

export function chiKnick(lq, alpha = KNICKKURVE_WINKEL.alpha) {
  if (!(lq > 0.2)) return 1;
  const phi = 0.5 * (1 + alpha * (lq - 0.2) + lq * lq);
  return Math.min(1, 1 / (phi + Math.sqrt(phi * phi - lq * lq)));
}

/** i_v des Winkels aus den Querschnittswerten der Datei (m). */
export function ivAus(q) {
  if (!(q?.A > 0)) return null;
  const m = (q.Iy + q.Iz) / 2;
  const r = Math.sqrt(((q.Iy - q.Iz) / 2) ** 2 + (q.Iyz ?? 0) ** 2);
  const imin = m - r;
  return imin > 0 ? Math.sqrt(imin / q.A) : null;
}

/**
 * Gurtfelder des Stabmodells: je Gurtlinie (z. B. `T1_OGL`) die Felder
 * zwischen den Blechknoten, mit ihren Stäben und der Knicklänge.
 */
export function gurtFelder(dat) {
  const kn = new Map(dat.knoten.map((k) => [k.name, k]));
  const blechKnoten = new Set();
  dat.staebe.forEach((s) => {
    if (/(?:^|_)B[VH]_/.test(s.name)) { blechKnoten.add(s.von); blechKnoten.add(s.bis); }
  });
  const linien = new Map();
  dat.staebe.forEach((s) => {
    const m = /^((?:(?:MT|[TA])\d+_)?(?:OG|UG)[LR])_S\d+$/.exec(s.name);
    if (!m || (s.art || 'stab') !== 'stab') return;
    const a = kn.get(s.von); const b = kn.get(s.bis);
    if (!a || !b) return;
    const [u, o] = a.x <= b.x ? [a, b] : [b, a];
    if (!linien.has(m[1])) linien.set(m[1], []);
    linien.get(m[1]).push({ stab: s.name, querschnitt: s.querschnitt, von: u, bis: o });
  });
  const felder = [];
  linien.forEach((l, linie) => {
    l.sort((p, q) => p.von.x - q.von.x);
    let akt = null;
    const schliessen = (bis) => {
      if (akt && akt.staebe.length) {
        const dx = bis.x - akt.start.x, dy = bis.y - akt.start.y, dz = bis.z - akt.start.z;
        felder.push({ ...akt, ende: bis, L: Math.hypot(dx, dy, dz) });
      }
    };
    l.forEach((g) => {
      if (!akt) akt = { linie, start: g.von, staebe: [], querschnitt: g.querschnitt };
      if (blechKnoten.has(g.von.name) && akt.staebe.length) {
        schliessen(g.von);
        akt = { linie, start: g.von, staebe: [], querschnitt: g.querschnitt };
      }
      akt.staebe.push(g.stab);
    });
    if (akt) schliessen(l[l.length - 1].bis);
  });
  return felder;
}

/**
 * Ersatzstabnachweis je Gurtfeld über die Nachweis-Kombinationen.
 * @returns {Map<string, object>} je Präfix ('' oder 'T1_') das massgebende Feld
 *   { eta, linie, L, iv, lq, chi, NEd, NbRd, fall, bez, stab, felder }
 */
export function gurtKnicken(dat, lsg, faelle, fy, gammaM1 = 1.05) {
  const qs = new Map(dat.querschnitte.map((q) => [q.name, q]));
  const E = Number(dat.material?.E) || 210000;          // N/mm2
  const lambda1 = Math.PI * Math.sqrt(E / fy);
  const felder = gurtFelder(dat).map((f) => {
    const q = qs.get(f.querschnitt);
    const iv = ivAus(q);
    const lq = iv ? f.L / iv / lambda1 : null;
    const chi = lq === null ? null : chiKnick(lq);
    const NbRd = chi === null ? null : (chi * q.A * 1e6 * fy) / gammaM1 / 1000;   // kN
    return { ...f, iv, lq, chi, NbRd, A: q?.A };
  }).filter((f) => f.NbRd > 0);
  const best = new Map();
  faelle.forEach((lf) => {
    const kr = kraefteAusAnteilen(lsg, anteileFuer(lf, dat));
    felder.forEach((f) => {
      let N = 0; let wo = f.staebe[0];
      f.staebe.forEach((s) => {
        const fk = kr.get(s);
        if (!fk) return;
        const c = Math.max(0, fk[0], -fk[6]);
        if (c > N) { N = c; wo = s; }
      });
      const eta = N / f.NbRd;
      const praefix = /^((?:MT|[TA])\d+_)?/.exec(f.linie)[1] ?? '';
      const alt = best.get(praefix);
      if (!alt || eta > alt.eta) {
        best.set(praefix, { eta, linie: f.linie, L: f.L, iv: f.iv, lq: f.lq, chi: f.chi,
                            NEd: N, NbRd: f.NbRd, A: f.A, fall: lf.key, bez: lf.bez, stab: wo,
                            kurve: KNICKKURVE_WINKEL.kurve, gammaM1, fy,
                            felder: felder.filter((x) => (x.linie.startsWith(praefix) || !praefix)).length });
      }
    });
  });
  return best;
}
