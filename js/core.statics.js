/**
 * core.statics.js
 * ---------------------------------------------------------------------------
 * RECHENKERN, TEIL 1: Ersatzbalken.
 * Reine Funktionen - kein DOM, keine globalen Variablen.
 *
 * Statisches System: Einfeldträger der Spannweite L mit DREHFEDERN an beiden
 * Enden (gelenkig / teilweise / voll eingespannt, siehe core.auflager.js).
 *
 *   q_d   vertikale Gleichlast (Eigengewicht + Schnee)
 *   w_d   horizontale Gleichlast (Wind)
 *   P[]   vertikale Einzellasten   {x, w}
 *   H[]   horizontale Einzellasten {x, w}
 *   T[]   Torsionsmomente          {x, w}
 *
 * Die Einspannung wirkt nur auf die VERTIKALE Biegung (Begründung in
 * core.auflager.js). Für Wind und Torsion bleiben die Enden gelenkig bzw.
 * gabelgelagert.
 * ---------------------------------------------------------------------------
 */

import { TOL } from './core.constants.js';
import { anbauteilLasten } from './core.anbauteile.js';

/** Torsionsmodelle. */
export const TORSIONSMODELLE = [
  { key: 'huellkurve', label: 'konstante Hüllkurve (konservativ)' },
  { key: 'verteilt',   label: 'Auflagerverteilung (genauer)' },
];

/**
 * Bemessungswerte aller Einwirkungen.
 *
 * Der Lastfall liefert die vier Beiwerte {G, WindX, WindY, Schnee}; hier wird
 * nur noch multipliziert. Welche Kombination die Beiwerte ergeben (SIA 260,
 * RTE oder eine eigene), entscheidet core.lasten.js.
 *
 * Die Laufmeterlast w_k der Sortimentstabelle ist der Wind auf das JOCH. Er
 * drückt quer zur Jochebene, also in GLEISRICHTUNG - und läuft deshalb in der
 * Gruppe Wind y. In Jochachse hat das Joch selbst kaum Angriffsfläche; dort
 * wirken nur die Anbauteile (Gruppe Wind x).
 *
 * @param {object} i Eingabewerte inkl. gk, sk, wk (charakteristisch) und
 *                   beiwerte = {G, WindX, WindY, Schnee}
 * @param {object[]} anbauteile Anbauteile (siehe core.anbauteile.js)
 * @param {number} h Hebelarm Ober-/Untergurt [m]
 */
export function bemessungslasten(i, anbauteile, h) {
  const q = i.gammaQ ?? 1;
  const b = i.beiwerte
        ?? { G: i.gammaG ?? 1, WindX: q, WindY: q, Schnee: q };
  const qd_g = b.G * i.gk;
  const qd_s = i.schneeAktiv ? b.Schnee * i.sk : 0;
  const wd = (b.WindY ?? 0) * i.wk;
  const at = anbauteilLasten(anbauteile, { ...i, beiwerte: b }, h);
  return { qd_g, qd_s, qd: qd_g + qd_s, wd, beiwerte: b, ...at };
}

/** Auflagerkräfte vertikal. Stützmomente erzeugen den Zusatzanteil (M_A-M_B)/L. */
export function auflagerkraefte({ L, qd, P, M = [], MA = 0, MB = 0 }) {
  // Ein eingeprägtes Moment M0 wird über ein Kräftepaar −M0/L / +M0/L abgetragen.
  const mSum = (M ?? []).reduce((s, m) => s + m.w, 0);
  const RA0 = (qd * L) / 2 + P.reduce((s, p) => s + (p.w * (L - p.x)) / L, 0) - mSum / L;
  const RB0 = (qd * L) / 2 + P.reduce((s, p) => s + (p.w * p.x) / L, 0) + mSum / L;
  const dV = (MA - MB) / L;
  return { RA: RA0 + dV, RB: RB0 - dV, RA0, RB0 };
}

/**
 * Moment und Querkraft eines GELENKTRÄGERS unter Einzellasten.
 *   M(x) = w*(L-x_p)/L * x        für x <= x_p
 *        = w*x_p/L * (L-x)        für x >  x_p
 */
function einzellastSchnitt(lasten, x, L) {
  let M = 0, V = 0;
  lasten.forEach((p) => {
    M += x <= p.x ? (p.w * (L - p.x) * x) / L : (p.w * p.x * (L - x)) / L;
    V += (p.w * (L - p.x)) / L - (x > p.x + TOL ? p.w : 0);
  });
  return { M, V };
}

/**
 * Torsionsmoment an der Stelle x.
 * 'huellkurve' : konstante Summe aller Torsionsmomente (konservativ)
 * 'verteilt'   : Aufteilung auf die Auflager, Gabellagerung vorausgesetzt
 *
 * @returns {{betrag:number, vz:number|null}} vz ist das VORZEICHENBEHAFTETE
 *          Moment (Rechtsschraube um +x) oder null, wenn es keines gibt.
 *          Die Hüllkurve summiert Beträge - dort ist kein Drehsinn mehr da,
 *          und wer ihn bräuchte, bekommt ehrlich null statt einer Zahl, die
 *          nur so aussieht, als wüsste sie es.
 */
export function torsion(x, { L, T, torsionModell }) {
  if (torsionModell === 'huellkurve') {
    return { betrag: T.reduce((s, t) => s + Math.abs(t.w), 0), vz: null };
  }
  let Tx = 0;
  T.forEach((t) => {
    Tx += x < t.x ? -(t.w * (L - t.x)) / L : (t.w * t.x) / L;
  });
  return { betrag: Math.abs(Tx), vz: Tx };
}

/**
 * Schnittgrössen des Ersatzbalkens an der Stelle x.
 * M_y = M_Gelenkträger - [ M_A*(1-x/L) + M_B*(x/L) ]
 */
export function schnittgroessen(x, m) {
  const { L, qd, P, H, M: Mlast = [], N: Nlast = [], Mz: Mzlast = [],
          wd, MA = 0, MB = 0, RA0 } = m;

  // Eingeprägte Momente springen im Verlauf: links vom Angriff wirkt nur der
  // Auflageranteil, rechts davon zusätzlich das Moment selbst.
  const mEingepraegt = Mlast.reduce((s, mm) => s + (x > mm.x ? mm.w : 0), 0);
  const Mss = RA0 * x - (qd * x * x) / 2
    - P.reduce((s, p) => s + p.w * Math.max(0, x - p.x), 0)
    + mEingepraegt;
  const My = Mss - (MA * (1 - x / L) + MB * (x / L));

  // Querkraft: an den Laststellen springt V, deshalb beidseitig auswerten und
  // den betragsmässig grösseren Wert als Bemessungswert nehmen.
  const VGrund = RA0 + (MA - MB) / L - qd * x;
  const Vl = VGrund - P.reduce((s, p) => s + (x > p.x + TOL ? p.w : 0), 0);
  const Vr = VGrund - P.reduce((s, p) => s + (x >= p.x - TOL ? p.w : 0), 0);
  const Vz = Math.abs(Vl) >= Math.abs(Vr) ? Vl : Vr;

  // Wind: Gleichlast + horizontale Einzellasten, Enden gelenkig.
  // Dazu eingeprägte Momente im Grundriss (M_zz der Anbauteile). Sie werden
  // wie die eingeprägten M_y behandelt: Sprung im Verlauf am Angriffsort,
  // abgetragen über das Kräftepaar ∓M/L an den Auflagern.
  const eh = einzellastSchnitt(H, x, L);
  const mzSum = Mzlast.reduce((s, mm) => s + mm.w, 0);
  const mzEin = Mzlast.reduce((s, mm) => s + (x > mm.x ? mm.w : 0), 0);
  const Mz = (wd * x * (L - x)) / 2 + eh.M - (mzSum * x) / L + mzEin;
  const Vy = wd * (L / 2 - x) + eh.V - mzSum / L;

  // Normalkraft in Jochachse: wie die Torsion entweder als Hüllkurve oder
  // mit Aufteilung auf die Auflager.
  const Nx = m.torsionModell === 'huellkurve'
    ? Nlast.reduce((s, nn) => s + Math.abs(nn.w), 0)
    : Math.abs(Nlast.reduce(
        (s, nn) => s + (x < nn.x ? -(nn.w * (L - nn.x)) / L : (nn.w * nn.x) / L), 0));

  const tor = torsion(x, m);
  return { My, Mss, Vz, Mz, Vy, Tx: tor.betrag, TxVz: tor.vz, Nx };
}

/** Kandidatenstellen für Extremwerte: Auflager, Lastangriffe, Nullstellen von V. */
function kandidaten(m) {
  const k = new Set([0, m.L]);
  m.P.forEach((p) => { k.add(p.x); k.add(Math.max(0, p.x - 1e-6)); });
  m.H.forEach((p) => k.add(p.x));
  if (m.qd > 0) {
    // Nullstellen der Querkraft abschnittsweise suchen
    const steps = 400;
    for (let j = 0; j <= steps; j++) k.add((j / steps) * m.L);
  }
  k.add(m.L / 2);
  return [...k].filter((x) => x >= 0 && x <= m.L).sort((a, b) => a - b);
}

/** Exakte Extremwerte, unabhängig vom Knotenraster. */
export function extremwerte(m) {
  let MyMax = -Infinity, xMyMax = 0, MyMin = Infinity, xMyMin = 0;
  let MzMax = 0, xMzMax = 0;
  let VzMax = 0, xVzMax = 0, VyMax = 0, xVyMax = 0, TxMax = 0, xTxMax = 0;
  let NxMax = 0, xNxMax = 0;
  kandidaten(m).forEach((x) => {
    const s = schnittgroessen(x, m);
    if (s.My > MyMax) { MyMax = s.My; xMyMax = x; }
    if (s.My < MyMin) { MyMin = s.My; xMyMin = x; }
    if (Math.abs(s.Mz) > MzMax) { MzMax = Math.abs(s.Mz); xMzMax = x; }
    if (Math.abs(s.Vz) > VzMax) { VzMax = Math.abs(s.Vz); xVzMax = x; }
    if (Math.abs(s.Vy) > VyMax) { VyMax = Math.abs(s.Vy); xVyMax = x; }
    if (Math.abs(s.Tx) > TxMax) { TxMax = Math.abs(s.Tx); xTxMax = x; }
    // Normalkraft in Jochachse (Leiterzug, Wind in x). Sie geht als N_ax
    // flächenproportional in jeden Winkel ein - siehe core.querschnitt.js -
    // und gehört deshalb neben die übrigen Schnittgrössen.
    if (Math.abs(s.Nx) > NxMax) { NxMax = Math.abs(s.Nx); xNxMax = x; }
  });
  return {
    MyMax, xMyMax, MyMin, xMyMin,
    MyBetrag: Math.max(Math.abs(MyMax), Math.abs(MyMin)),
    MzMax, xMzMax, VzMax, xVzMax, VyMax, xVyMax, TxMax, xTxMax,
    NxMax, xNxMax,
  };
}

/**
 * Knotenraster der Bindebleche = Lage der Bleche entlang der Jochachse.
 *
 * AUFBAU NACH KONSTRUKTIONSZEICHNUNG (Schemablatt mit Mass-Tabelle).
 * Die Zeichnung teilt das Joch so:
 *
 *   ┃ 750(-je) │ A_n │ A_n-1 │ … │ A_1 │ A_1 │ … │ A_n-1 │ A_n │ 750(-je) ┃
 *   ├────────────────────────── jt ─────────────────────────────────────────┤
 *
 * A_1 ist das Feld in Jochmitte, A_n liegt am Auflager. Es gilt
 *      jt = 2 · 750 + 2 · ΣA
 * Diese Bedingung wird als Kontrolle jeder Tabellenzeile gerechnet.
 *
 * AM JOCHENDE (Gabel)
 * An beiden Jochenden (x = 0 und x = L) steht nur ein VERTIKALES Bindeblech;
 * ein liegendes gibt es dort NICHT. Das Jochende ist damit oben und unten
 * offen - eine Gabel, mit der das Joch am Mast montiert wird. Die Stückzahlen
 * der Zeichnung belegen das: die Vertikalebene hat je Ebene genau zwei Bleche
 * mehr als die Horizontalebene, und zwar die beiden an den Jochenden.
 *
 * Die Stationsliste enthält deshalb die Jochenden MIT. Ob dort ein Blech liegt,
 * entscheidet die Staffelung des Typs ("pos": null für die Gabel).
 *
 * Liegt die Mass-Tabelle des Typs vor (Feld "abstaende"), wird sie genau
 * übernommen - die Blecheinteilung der Zeichnung ist Bauteilgeometrie und wird
 * nicht angepasst. Ohne Tabelle wird der Bereich zwischen den beiden
 * 750er-Endfeldern gleichmässig geteilt, mit Feldweiten von höchstens a_1.
 *
 * @param {number} L   Jochlänge [m]
 * @param {number} a1  Regelteilung = Endfeld [m]
 * @param {number[]} [abstaende] A_1 … A_n [m], A_1 = Feld in Jochmitte
 * @returns {number[]} Blechstationen [m], einschliesslich x = 0 und x = L
 */
export function knotenraster(L, a1, abstaende = null) {
  if (!(a1 > 0) || !(L > 0)) return [0];
  if (L <= 2 * a1 + TOL) return [0, L / 2, L];
  const innen = [];
  if (abstaende?.length) {
    // Vom linken Jochende nach innen: 750, A_n … A_1  – der letzte Knoten
    // dieser Reihe liegt in Jochmitte. Danach spiegelbildlich A_1 … A_n.
    //
    // Braucht die Zeichnung eine GERADE Feldzahl, schreibt sie das mittlere
    // Feld als zwei halbe A_1 an; dann steht in Jochmitte kein Blech. Erkennbar
    // daran, dass A_1 deutlich kleiner ist als A_2 (z. B. J80 9.00 m: 340/680).
    const halbfeld = abstaende.length > 1 && abstaende[0] < 0.6 * abstaende[1];
    const halb = [...abstaende].reverse();
    innen.push(a1);
    halb.forEach((d, k) => {
      if (halbfeld && k === halb.length - 1) return;      // Mittelknoten entfällt
      innen.push(innen[innen.length - 1] + d);
    });
    abstaende.forEach((d, k) => {
      const s = halbfeld && k === 0 ? 2 * d : d;          // zwei halbe = ein Feld
      innen.push(innen[innen.length - 1] + s);
    });
  } else {
    const frei = L - 2 * a1;
    const n = Math.max(1, Math.ceil(frei / a1 - TOL));
    for (let i = 0; i <= n; i++) innen.push(a1 + (i * frei) / n);
  }
  return [0, ...innen, L];
}

/** Mittlere Feldweite der INNEREN Felder (ohne die beiden Endfelder). */
export function feldweite(L, a1, abstaende = null) {
  if (!(a1 > 0) || !(L > 0)) return a1;
  const xs = knotenraster(L, a1, abstaende);
  if (xs.length < 4) return a1;
  return (xs[xs.length - 2] - xs[1]) / (xs.length - 3);
}

/**
 * Kontrolle einer Mass-Tabellenzeile: 2·a1 + 2·ΣA muss die Jochlänge ergeben.
 * @returns {{ok:boolean, soll:number, ist:number}}
 */
export function pruefeAbstaende(L, a1, abstaende) {
  const summe = (abstaende ?? []).reduce((s, d) => s + d, 0);
  const ist = 2 * a1 + 2 * summe;
  return { ok: Math.abs(ist - L) < 0.002, soll: L, ist };
}
