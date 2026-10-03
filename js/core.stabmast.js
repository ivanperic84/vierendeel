/**
 * core.stabmast.js
 * ---------------------------------------------------------------------------
 * KNICKEN UND FUNDAMENT DES MASTEN MIT DEN KRÄFTEN DES STABWERKS.
 *
 * Entscheid vom 28. September zum Tragausleger: «Knicken und Fundament am
 * Mast des Auslegers: aus dem Stabwerk». Der Kern rechnet den Ausleger noch
 * als Einfeldträger mit einem erfundenen Auflager am freien Ende - seine
 * Mastkräfte gelten dort nicht.
 *
 * >>> DIE REGELN BLEIBEN IM KERN, NUR DIE KRÄFTE KOMMEN VON HIER. <<<
 *
 * Gerechnet wird mit denselben Funktionen wie am Joch - `mastStabilitaet`
 * (core.mast.js: Rayleigh über die Massen auf ihren Höhen, Interaktion nach
 * SIA 263) und `fundamentNachweis` (core.fundament.js: acht Einzelnachweise
 * gegen die Standardtabelle). Sie bekommen hier ein Mastergebnis in
 * derselben Gestalt, das aus dem Stabwerk gebildet ist:
 *
 *   - die Vertikallasten auf ihren Höhen = die SPRÜNGE der Normalkraft an
 *     den Mastknoten (Anschluss der Gurte, Aufhängung des Seils) - das
 *     Eigengewicht im Feld bleibt verteilt (`gd`), wie im Kern;
 *   - die Schnittgrössen N, M_quer, M_längs an beiden Enden jedes
 *     Mastabschnitts, aus den Endkräften global gedreht;
 *   - am Fuss die Auflagerkräfte für das Fundament.
 *
 * Eine zweite Herleitung der Regeln wäre eine zweite Wahrheit.
 * ---------------------------------------------------------------------------
 */

import { anteileFuer, kraefteAusAnteilen } from './core.stabnachweis.js';
import { mastZug } from './core.stabverformung.js';
import { mastStabilitaet } from './core.mast.js';
import { fundamentNachweis, FUNDAMENT_FALLARTEN } from './core.fundament.js';

/** Einen lokalen Vektor global drehen: R^T · v. */
const global = (R, v) => [0, 1, 2].map((c) => R[0][c] * v[0] + R[1][c] * v[1] + R[2][c] * v[2]);

/**
 * Das Mastergebnis EINER Kombination aus dem Stabwerk, in der Gestalt von
 * `mastSchnitt` (so weit `mastStabilitaet` es liest).
 *
 * @param {object} basis  { profil, stegrichtung } aus dem Kern (Geometrie)
 */
export function mastAusStabwerk(dat, lsg, lf, id, basis) {
  const zug = mastZug(dat, id);
  if (!zug) return null;
  const kraefte = kraefteAusAnteilen(lsg, anteileFuer(lf, dat));
  const el = new Map((lsg.elemente ?? []).map((e) => [e.s.name, e]));
  const stationen = [];
  // Druck positiv, je Abschnitt unten und oben.
  const abschnitte = zug.staebe.map((s) => {
    const f = kraefte.get(s.name) ?? new Float64Array(12);
    const e = el.get(s.name);
    const ende = (k) => ({ N: k === 0 ? f[0] : -f[6],             // Druck +
                           M: global(e.R, k === 0 ? [f[3], f[4], f[5]]
                                                   : [f[9], f[10], f[11]]) });
    const unten = s.unten ? ende(0) : ende(6);
    const oben = s.unten ? ende(6) : ende(0);
    [[s.h0, unten], [s.h1, oben]].forEach(([z, w]) => stationen.push({
      z, N: w.N, Mxx: w.M[0], Myy: w.M[1], Mzz: w.M[2] }));
    return { ...s, unten, oben };
  });
  // Die Lasten, die an den Knoten in den Masten treten.
  const lasten = [];
  for (let i = 0; i < abschnitte.length - 1; i += 1) {
    const P = abschnitte[i].oben.N - abschnitte[i + 1].unten.N;
    if (Math.abs(P) > 1e-6) {
      lasten.push({ name: `Einleitung auf ${abschnitte[i].h1.toFixed(2)} m`,
                    Fz: P, z: abschnitte[i].h1, art: 'anbau' });
    }
  }
  const kopf = abschnitte[abschnitte.length - 1]?.oben.N ?? 0;
  if (Math.abs(kopf) > 1e-6) {
    lasten.push({ name: 'Mastkopf', Fz: kopf, z: zug.kopf, art: 'anbau' });
  }
  // Das Eigengewicht im Feld, mit dem Beiwert der Kombination.
  const eg = (dat.lasten?.strecke ?? []).find((l) => l.lastfall === 'G'
    && l.stab === zug.staebe[0].name && /^EG_/.test(l.name));
  const gG = Number(lf.beiwerte?.G ?? 1) || 0;
  return { profil: basis.profil, stegrichtung: basis.stegrichtung,
           laenge: zug.kopf, H: zug.kopf, lasten, stationen,
           gd: eg ? Math.abs(eg.wert) * gG : 0, fall: lf.key, bez: lf.bez };
}

/**
 * Knicken des Masten über die Nachweis-Kombinationen - das Grösste, mit Fall.
 *
 * @param {object} m   Modell (stahl, gammaM1, tragwerksart) aus dem Kern
 * @param {object} o   { beta, gammaM1 }
 */
export function knickenAusStabwerk(dat, lsg, faelle, id, basis, m, o = {}) {
  let best = null;
  faelle.forEach((lf) => {
    const s = mastAusStabwerk(dat, lsg, lf, id, basis);
    if (!s) return;
    const st = mastStabilitaet(s, m, o);
    if (st && Number.isFinite(st.eta) && (!best || st.eta > best.eta)) {
      best = { ...st, fall: lf.key, bez: lf.bez, quelle: 'stabwerk' };
    }
  });
  return best;
}

/**
 * Das Fundament mit den charakteristischen Fusskräften des Stabwerks - über
 * `fundamentNachweis`, dem ein Ergebnis in der Gestalt von
 * `vergleichKombinationen` gereicht wird (Ende A, eine Station am Fuss).
 */
/**
 * >>> DAS BEMESSUNGSDIAGRAMM DES GITTERMASTS ALS KONTROLLE (3. Oktober). <<<
 *
 * Entscheid «Stabwerk + Diagramm als Kontrolle»: nachgewiesen wird je Stab;
 * daneben steht, was das Bemessungsdiagramm des Sortiments sagt - die
 * zulässigen Momente am Mastfuss «aus sämtlichen Kräften (Wind ∥ oder ⊥)»,
 * geradlinig überlagert:
 *
 *     η = M_a / M_a,zul + M_b / M_b,zul
 *
 * Charakteristisch (zulässige Werte, alle Beiwerte 1 - dieselben Fälle wie
 * Fundament und Anker), die Fussmomente aus den Auflagerkräften des
 * Stabwerks. M_a ist das Moment aus Kräften in Richtung a (die breite
 * Seite des Masts).
 *
 * @param {{a:number, b:number}} zul  zulässige Momente [kNm]
 * @returns {{eta, Ma, Mb, zulA, zulB, fall, bez}|null}
 */
export function gitterDiagramm(dat, lsg, faelle, id, zul) {
  const g = (dat.gittermasten ?? []).find((x) => x.id === id);
  if (!g || !(zul?.a > 0) || !(zul?.b > 0)) return null;
  const fuss = g.achse[0];
  const aInX = Math.abs(g.dirA?.[0] ?? 1) > 0.5;
  let best = null;
  faelle.filter((l) => FUNDAMENT_FALLARTEN.includes(l.art)).forEach((l) => {
    let Mx = 0, My = 0;
    anteileFuer(l, dat).forEach(({ lastfall, faktor }) => {
      if (!faktor || !lsg.u.has(lastfall)) return;
      const r = lsg.auflagerkraefte(lastfall).find((x) => x.knoten === fuss);
      if (!r) return;
      Mx += faktor * (r.fix ?? 0); My += faktor * (r.fiy ?? 0);
    });
    // Kräfte in x biegen um y.
    const Ma = Math.abs(aInX ? My : Mx), Mb = Math.abs(aInX ? Mx : My);
    const eta = Ma / zul.a + Mb / zul.b;
    if (!best || eta > best.eta) {
      best = { eta, Ma, Mb, zulA: zul.a, zulB: zul.b, fall: l.key, bez: l.bez, typ: g.typ };
    }
  });
  return best;
}

export function fundamentAusStabwerk(dat, lsg, faelle, id, basis, satz) {
  const fuss = `MAST_${id}_F`;
  const lf = faelle.filter((l) => FUNDAMENT_FALLARTEN.includes(l.art));
  const ergebnisse = {};
  lf.forEach((l) => {
    const r = { ux: 0, uy: 0, uz: 0, fix: 0, fiy: 0, fiz: 0 };
    anteileFuer(l, dat).forEach(({ lastfall, faktor }) => {
      if (!faktor || !lsg.u.has(lastfall)) return;
      const a = lsg.auflagerkraefte(lastfall).find((x) => x.knoten === fuss);
      if (!a) return;
      Object.keys(r).forEach((k) => { r[k] += faktor * (a[k] ?? 0); });
    });
    /*
     * Die Auflagerkraft IST die Kraft auf das Fundament, mit umgekehrtem
     * Vorzeichen; F_z positiv heisst: der Mast drückt (wie `stationen[0]`
     * im Kern). Die übrigen Grössen zählen als Betrag.
     */
    ergebnisse[l.key] = { mast: { A: { profil: basis.profil, stegrichtung: basis.stegrichtung,
      stationen: [{ Fz: r.uz, Fx: r.ux, Fy: r.uy, Mxx: r.fix, Myy: r.fiy, Mzz: r.fiz }] } } };
  });
  const erg = fundamentNachweis({ lastfaelle: lf, ergebnisse }, satz);
  return erg ? { ...erg, quelle: 'stabwerk' } : null;
}
