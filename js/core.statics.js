/**
 * core.statics.js
 * ---------------------------------------------------------------------------
 * RECHENKERN, TEIL 1: Ersatzbalken.
 * Reine Funktionen - kein DOM, keine globalen Variablen.
 *
 * Statisches System: Einfeldträger mit DREHFEDERN an beiden Enden (gelenkig /
 * teilweise / voll eingespannt, siehe core.auflager.js). Die Auflager müssen
 * NICHT an den Gurtenden stehen: liegen sie weiter innen, ragt das Joch als
 * KRAGARM darüber hinaus (x_A > 0 bzw. x_B < L, siehe feldmodell).
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
export function auflagerkraefte({ L, qd, P, M = [], MA = 0, MB = 0,
                                  RkragA = 0, RkragB = 0 }) {
  // Ein eingeprägtes Moment M0 wird über ein Kräftepaar −M0/L / +M0/L abgetragen.
  const mSum = (M ?? []).reduce((s, m) => s + m.w, 0);
  const RA0 = (qd * L) / 2 + P.reduce((s, p) => s + (p.w * (L - p.x)) / L, 0) - mSum / L;
  const RB0 = (qd * L) / 2 + P.reduce((s, p) => s + (p.w * p.x) / L, 0) + mSum / L;
  const dV = (MA - MB) / L;
  // Was auf dem Kragarm steht, läuft unmittelbar ins Auflager.
  return { RA: RA0 + dV + RkragA, RB: RB0 - dV + RkragB, RA0, RB0,
           RkragA, RkragB };
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
export function torsion(x, { L, T, torsionModell, T0 = 0 }) {
  // T0: Torsion aus dem Wind auf UNGLEICHE Maste in Gleisrichtung. Sie wird am
  // einen Ende eingeleitet und am anderen abgegeben, läuft also über die ganze
  // Jochlänge mit gleichem Betrag - anders als die Torsion aus den
  // Anbauteilen, die sich vom Angriff aus auf beide Auflager verteilt.
  // Siehe core.auflager.js, mastVerdrehung.
  if (torsionModell === 'huellkurve') {
    return { betrag: T.reduce((s, t) => s + Math.abs(t.w), 0) + Math.abs(T0),
             vz: null };
  }
  let Tx = T0;
  T.forEach((t) => {
    Tx += x < t.x ? -(t.w * (L - t.x)) / L : (t.w * t.x) / L;
  });
  return { betrag: Math.abs(Tx), vz: Tx };
}

/**
 * KRAGARME: DAS AUFLAGER STEHT NICHT IMMER AM GURTENDE.
 *
 * Die Länge L ist die Länge der GURTE, von Ende zu Ende - das Mass der
 * Zeichnung, an dem auch die Blecheinteilung hängt. Die Auflager stehen aber
 * dort, wo die Maste stehen, und das ist oft weiter innen:
 *
 *      0            x_A                            x_B          L
 *      ├── Kragarm ──┤────────── Spannweite ────────┤── Kragarm ─┤
 *
 * Der Unterschied ist nicht klein. Am nachgerechneten Signaljoch liegen die
 * Mastachsen bei 0.13 und 19.065 m, die Gurte laufen von −0.20 bis 19.80 -
 * die Stützweite ist 18.935 statt 20.00 m. Das sind 5.3 % Länge und rund
 * 11 % auf JEDES globale Moment. Wer L als Stützweite einsetzt, rechnet still
 * zu ungünstig; wer die Stützweite als Gurtlänge einsetzt, still zu günstig.
 *
 * WIE GERECHNET WIRD
 * Der Kragarm ist statisch bestimmt. Seine Lasten geben am Auflager ein festes
 * Moment M_k ab, das im Drehwinkelverfahren wie eine eingeprägte Einwirkung
 * auf den Knoten wirkt (core.auflager.js). Das Feld dazwischen ist der
 * bekannte Einfeldträger mit Drehfedern, nur mit verschobenem Nullpunkt.
 * Innerhalb des Kragarms werden die Schnittgrössen direkt vom freien Ende her
 * gerechnet.
 *
 * Torsions- und Normalkraftanteile, die auf dem Kragarm eingeleitet werden,
 * laufen unmittelbar ins Auflager - das Feld sieht sie nicht.
 *
 * Ohne Kragarme (x_A = 0, x_B = L) fällt alles auf den bisherigen Weg zurück;
 * dann wird dieses Untermodell gar nicht erst gebaut.
 *
 * @param {object} m Balkenmodell mit L, qd, wd, P, H, T, M, Mz, N, xA, xB
 * @returns {object|null} Untermodell des FELDES (L = Stützweite, Lasten auf
 *          das Auflager A bezogen) samt Kragarmmomenten - oder null.
 */
export function feldmodell(m) {
  const xA = Math.max(0, m.xA ?? 0);
  const xB = Math.min(m.L, m.xB ?? m.L);
  if (xA <= TOL && xB >= m.L - TOL) return null;      // keine Kragarme
  const Ls = xB - xA;
  if (!(Ls > 0)) throw new Error('Die Stützweite ist null oder negativ.');

  const imFeld = (p) => p.x >= xA - TOL && p.x <= xB + TOL;
  const links = (p) => p.x < xA - TOL;
  const rechts = (p) => p.x > xB + TOL;
  const rein = (liste) => (liste ?? []).filter(imFeld).map((p) => ({ ...p, x: p.x - xA }));
  const a = xA, b = m.L - xB;

  // Kragarmmomente am Auflager, positiv als Zug oben (wie MA/MB).
  const summe = (liste, arm) => (liste ?? []).reduce((s, p) => s + p.w * arm(p), 0);
  const MkA = (m.qd * a * a) / 2 + summe((m.P ?? []).filter(links), (p) => xA - p.x);
  const MkB = (m.qd * b * b) / 2 + summe((m.P ?? []).filter(rechts), (p) => p.x - xB);
  // Grundriss: Wind-Gleichlast und horizontale Einzellasten auf den Kragarmen.
  const MkzA = (m.wd * a * a) / 2 + summe((m.H ?? []).filter(links), (p) => xA - p.x);
  const MkzB = (m.wd * b * b) / 2 + summe((m.H ?? []).filter(rechts), (p) => p.x - xB);
  // Eingeprägte Momente auf dem Kragarm wirken unmittelbar am Auflager.
  const MeA = summe((m.M ?? []).filter(links), () => 1);
  const MeB = summe((m.M ?? []).filter(rechts), () => 1);

  return {
    xA, xB, Ls, kragA: a, kragB: b,
    MkA: MkA - MeA, MkB: MkB + MeB, MkzA, MkzB,
    // Auflagerkräfte bekommen die Kragarmlasten direkt zugeschlagen.
    RkragA: m.qd * a + (m.P ?? []).filter(links).reduce((s, p) => s + p.w, 0),
    RkragB: m.qd * b + (m.P ?? []).filter(rechts).reduce((s, p) => s + p.w, 0),
    // Untermodell des Feldes: gleiche Struktur, nur L und Lastlagen verschoben.
    feld: { ...m, L: Ls, xA: 0, xB: Ls, feldmodell: null,
            P: rein(m.P), H: rein(m.H), T: rein(m.T),
            M: rein(m.M), Mz: rein(m.Mz), N: rein(m.N) },
  };
}

/** Schnittgrössen im Kragarm, vom freien Ende her gerechnet. */
function kragarmSchnitt(x, m, seite) {
  const auf = seite === 'links'
    ? { von: 0, arm: (p) => x - p.x, drin: (p) => p.x < x - TOL, laenge: x }
    : { von: m.L, arm: (p) => p.x - x, drin: (p) => p.x > x + TOL, laenge: m.L - x };
  const l = auf.laenge;
  const teil = (liste) => (liste ?? []).filter(auf.drin);
  const bieg = (liste) => teil(liste).reduce((s, p) => s + p.w * auf.arm(p), 0);
  const kraft = (liste) => teil(liste).reduce((s, p) => s + p.w, 0);
  const vz = seite === 'links' ? -1 : +1;

  // Kragarm: Zug oben, also negatives Feldmoment in unserer Zählung.
  const My = -((m.qd * l * l) / 2 + bieg(m.P)) + teil(m.M).reduce((s, p) => s + p.w, 0) * vz;
  const Vz = vz * (m.qd * l + kraft(m.P));
  const Mz = (m.wd * l * l) / 2 + bieg(m.H) + teil(m.Mz).reduce((s, p) => s + p.w, 0) * vz;
  const Vy = -vz * (m.wd * l + kraft(m.H));
  // Torsion und Normalkraft laufen vom Angriff unmittelbar ins Auflager.
  // T0 aus ungleichen Masten läuft dagegen durch das ganze Joch.
  const Tx = teil(m.T).reduce((s, p) => s + p.w, 0) + (m.T0 ?? 0);
  const Nx = Math.abs(teil(m.N).reduce((s, p) => s + p.w, 0));
  return { My, Mss: My, Vz, Mz, Vy, Tx: Math.abs(Tx), TxVz: Tx, Nx, kragarm: seite };
}

/**
 * Schnittgrössen des Ersatzbalkens an der Stelle x.
 * M_y = M_Gelenkträger - [ M_A*(1-x/L) + M_B*(x/L) ]
 *
 * Stehen die Auflager innerhalb der Gurtenden, wird ausserhalb der Stützweite
 * der Kragarm gerechnet und innerhalb das verschobene Feld (siehe feldmodell).
 */
export function schnittgroessen(x, m) {
  const fm = m.feldmodell;
  if (fm) {
    if (x < fm.xA - TOL) return kragarmSchnitt(x, m, 'links');
    if (x > fm.xB + TOL) return kragarmSchnitt(x, m, 'rechts');
    return feldSchnitt(x - fm.xA, fm.feld);
  }
  return feldSchnitt(x, m);
}

function feldSchnitt(x, m) {
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
  if (m.feldmodell) {
    k.add(m.feldmodell.xA); k.add(m.feldmodell.xB);
    k.add(Math.max(0, m.feldmodell.xA - 1e-6));
    k.add(Math.min(m.L, m.feldmodell.xB + 1e-6));
  }
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
