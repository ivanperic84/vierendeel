/**
 * core.auflager.js
 * ---------------------------------------------------------------------------
 * RECHENKERN, TEIL 4: Auflagerbedingungen und Maste.
 * Reine Funktionen, kein DOM.
 *
 * MODELL
 * ------
 * Jedes Jochende ist über eine DREHFEDER c_phi [kNm/rad] gelagert. Damit lassen
 * sich gelenkig (c = 0), teilweise und voll eingespannt (c -> unendlich) mit
 * demselben Formelsatz abbilden.
 *
 * Steht das Joch auf Masten, folgt die Federsteifigkeit aus dem Mast: ein am
 * Fuss eingespannter Kragmast der Höhe H hat am Kopf gegenüber einem Moment die
 * Drehsteifigkeit
 *      c_phi = E * I_Mast / H
 * Massgebend ist die Biegung des Mastes IN DER JOCHACHSE (der Mast muss sich
 * quer zu den Gleisen verformen) - je nach Stegrichtung also I_y oder I_z.
 *
 * NUR VERTIKALE BIEGUNG WIRD EINGESPANNT
 * Die Einspannung wird ausschliesslich auf M_y (Vertikalbiegung) angewendet.
 * Eine Einspannung gegen M_z (Windbiegung) würde die TORSIONSSTEIFIGKEIT des
 * Mastes beanspruchen; bei offenen H-Profilen ist diese so gering, dass das
 * Joch für Wind sinnvollerweise gelenkig gelagert bleibt.
 * ---------------------------------------------------------------------------
 */

import { getMastprofil, getStegrichtung } from './data.masten.js';

/** Elastizitätsmodul Baustahl [kN/m2]. */
export const E_STAHL = 210e6;

/** Praktisch starre Feder für den Fall "voll eingespannt". */
const C_STARR = 1e12;

export const ENDBEDINGUNGEN = [
  { key: 'gelenkig', label: 'gelenkig (c_φ = 0)' },
  { key: 'mast',     label: 'teilweise – Steifigkeit aus Mast' },
  { key: 'manuell',  label: 'teilweise – c_φ manuell' },
  { key: 'voll',     label: 'voll eingespannt (c_φ = ∞)' },
];

/**
 * Biegesteifigkeit EI des gegliederten Jochs um die horizontale Achse.
 * Zwei-Gurt-Idealisierung: I = h^2 * A_o * A_u / (A_o + A_u),
 * mit A_o = 2*A_OG und A_u = 2*A_UG (Eigenträgheitsmomente vernachlässigt,
 * bei gegliederten Trägern ein Anteil von wenigen Prozent).
 *
 * @param {number} h   Schwerpunktsabstand OG/UG [m]
 * @param {object} pOG Profil Obergurt  (A in cm2)
 * @param {object} pUG Profil Untergurt
 * @returns {{I:number, EI:number}}  I [m4], EI [kNm2]
 */
export function biegesteifigkeitJoch(h, pOG, pUG) {
  const Ao = 2 * pOG.A * 1e-4;   // cm2 -> m2
  const Au = 2 * pUG.A * 1e-4;
  const I = (h * h * Ao * Au) / (Ao + Au);
  return { I, EI: E_STAHL * I };
}

/**
 * Anschlussarten des Jochs an den Mast.
 *
 * KRAGARM (c_φ = E·I/H)
 * Der Mast endet am Joch, das Joch greift in einem Punkt an. Ein Kragarm der
 * Länge H, an dessen Spitze ein Moment steht, verdreht sich um M·H/(E·I) -
 * daraus die Federsteifigkeit E·I/H. Das ist die vorsichtige Annahme.
 *
 * DURCHLAUFEND (c_φ = 2·E·I/H)
 * Der Mast läuft über die Anschlussebene hinaus, und das Joch ist über seine
 * ganze Höhe angeschlossen, nicht in einem Punkt.
 *
 * WOHER DER FAKTOR KOMMT
 * Gemessen an einem Stabwerksmodell, in dem der Mast ausmodelliert ist (HEB 260,
 * Fuss eingespannt, H = 7.5 m, J90 über 15.5 m). Gesucht wurde diejenige
 * Drehfeder, die im GLEICHEN Stabmodell dasselbe FELDMOMENT liefert:
 *
 *      Anschluss in einem Punkt        c_φ = 5743 kNm/rad   = 1.37 · E·I/H
 *      Anschluss über die Jochhöhe     c_φ = 6074 kNm/rad   = 1.45 · E·I/H
 *
 * Verglichen wird das Feldmoment, weil Ersatzbalken und Stabmodell dort über
 * den ganzen Federbereich auf 0.2 % übereinstimmen. Das Stützmoment taugt
 * nicht als Massstab: der Ersatzbalken kennt es am Auflager, das Stabmodell
 * erst in der ersten Feldmitte.
 *
 * Dass der Ersatzbalken die Schubweichheit des gegliederten Trägers nicht
 * führt, fällt dabei NICHT ins Gewicht - genau diese Übereinstimmung von
 * 0.2 % zeigt es.
 *
 * GRENZE: DIE FEDER IST LINEAR, DIE VERBINDUNG NICHT
 * Der Anschluss Joch-Mast läuft je GURT über Schrauben. In der Praxis (so die
 * Vorgabe des Auftraggebers und das Vorgehen im AxisVM-Modell) wird die
 * Einspannung ITERATIV bestimmt: so weit, dass die Grenzlast der
 * Verbindungsschrauben nicht überschritten wird. Die wirksame Einspannung
 * hängt damit vom Lastniveau ab und ist nach oben durch die Schrauben
 * begrenzt.
 *
 * Dieses Werkzeug rechnet eine LINEARE Feder ohne Grenze. Das Stützmoment ist
 * deshalb gegen die Tragfähigkeit der Gurtanschlüsse zu prüfen; ist sie
 * kleiner, ist die Feder so weit zu reduzieren, bis das Moment passt - oder
 * gelenkig zu rechnen. Bei der ALTBAUWEISE ist von vornherein ein Gelenk
 * anzusetzen (siehe ui.schema.js, typUebernehmen).
 *
 * Die Wahl bewegt die Nachweise: weicher gerechnet wächst das Feldmoment
 * (beim genannten Joch +15 %), steifer gerechnet das Stützmoment (+31 %).
 * Am verjüngten Ende steht dem Stützmoment nur der kleine Hebelarm gegenüber,
 * dort ist die steifere Annahme die ungünstigere.
 */
export const MASTANSCHLUESSE = [
  { key: 'durchlaufend', faktor: 1.45,
    label: 'Mast durchlaufend, Anschluss über die Jochhöhe (c_φ = 1.45·E·I/H)' },
  { key: 'kragarm', faktor: 1,
    label: 'Kragmast, Anschluss in einem Punkt (c_φ = E·I/H)' },
];

/**
 * Drehsteifigkeit eines Mastes am Jochanschluss.
 * @param {object} inp Eingabe (mastProfil, mastH, mastSteg, mastAnschluss)
 */
export function mastSteifigkeit(inp) {
  const p = getMastprofil(inp.mastProfil);
  const sr = getStegrichtung(inp.mastSteg);
  const I_cm4 = sr.achse === 'y' ? p.Iy : p.Iz;
  const W_cm3 = sr.achse === 'y' ? p.Wy : p.Wz;
  const I = I_cm4 * 1e-8;                       // cm4 -> m4
  const an = MASTANSCHLUESSE.find((a) => a.key === (inp.mastAnschluss ?? 'durchlaufend'))
    ?? MASTANSCHLUESSE[0];
  const cKragarm = (E_STAHL * I) / inp.mastH;   // kNm/rad
  return { profil: p, stegrichtung: sr, I_cm4, W_cm3, I,
           anschluss: an.key, faktor: an.faktor,
           cKragarm, cPhi: an.faktor * cKragarm };
}

/**
 * Drehfedersteifigkeit beider Jochenden nach gewählter Endbedingung.
 * @returns {{cA:number, cB:number, mast:object|null, art:string}}
 */
export function drehfedern(inp) {
  switch (inp.endbedingung) {
    case 'gelenkig': return { cA: 0, cB: 0, mast: null, art: 'gelenkig' };
    case 'voll':     return { cA: C_STARR, cB: C_STARR, mast: null, art: 'voll eingespannt' };
    case 'manuell':  return { cA: inp.cPhi, cB: inp.cPhi, mast: null, art: 'teilweise (manuell)' };
    case 'mast': {
      const mast = mastSteifigkeit(inp);
      return { cA: mast.cPhi, cB: mast.cPhi, mast,
               art: `teilweise (Mast, ${mast.faktor === 1 ? 'Kragarm' : 'durchlaufend'})` };
    }
    default: throw new Error(`Unbekannte Endbedingung: ${inp.endbedingung}`);
  }
}

/**
 * Volleinspann-Momente (FEM) des Einfeldträgers, Drehsinn gegen den
 * Uhrzeigersinn positiv (Drehwinkelverfahren).
 */
function fem({ L, qd, P, M = [] }) {
  let AB = -(qd * L * L) / 12;
  let BA = +(qd * L * L) / 12;
  (P ?? []).forEach((p) => {
    const a = p.x, b = L - p.x;
    AB += -(p.w * a * b * b) / (L * L);
    BA += +(p.w * a * a * b) / (L * L);
  });
  // Eingeprägtes Moment M0 an der Stelle a (Volleinspannmomente, Standardtafel)
  (M ?? []).forEach((mm) => {
    const a = mm.x, b = L - mm.x;
    AB += (mm.w * b * (2 * a - b)) / (L * L);
    BA += (mm.w * a * (2 * b - a)) / (L * L);
  });
  return { AB, BA };
}

/**
 * Auflagermomente aus dem Drehwinkelverfahren mit Drehfedern an beiden Enden.
 *
 * Stabendmoment:  M_AB = 2K(2θ_A + θ_B) + FEM_AB     mit K = EI/L
 * Knotengleichgewicht mit der Drehfeder:  M_AB = -c_A * θ_A
 *
 *   (4K + c_A) θ_A + 2K θ_B = -FEM_AB
 *   2K θ_A + (4K + c_B) θ_B = -FEM_BA
 *
 * @returns {{MA:number, MB:number, kappaA:number, kappaB:number,
 *            thetaA:number, thetaB:number}}
 *          MA, MB = STÜTZMOMENTE (Zug oben), positiv [kNm]
 *          kappa  = Einspanngrad, MA / MA(voll eingespannt)
 */
/**
 * Drehfeder auf die Tragfähigkeit der Gurtverbindung begrenzen.
 *
 * WARUM ITERATIV
 * Der Anschluss Joch-Mast läuft je GURT über Schrauben. Das Stützmoment wird
 * als Kräftepaar zwischen Ober- und Untergurtanschluss abgetragen:
 *
 *      F_Gurt = M_Stütze / h
 *
 * Mehr als ihre Grenzlast können die Schrauben nicht übertragen. Die wirksame
 * Einspannung ist deshalb nicht die geometrische Steifigkeit des Mastes,
 * sondern diejenige, bei der die Verbindung gerade noch trägt - und weil das
 * Stützmoment selbst von der Feder abhängt, ist sie nur iterativ zu finden.
 * So wird es im geprüften FEM-Modell von Hand gemacht.
 *
 * Das Verfahren: mit der geometrischen Feder beginnen, das Stützmoment
 * rechnen, die Gurtkraft daraus, und solange herabsetzen, bis sie die
 * Grenzlast einhält. Weil M_Stütze mit c monoton wächst und unterlinear
 * verläuft, ist die Skalierung mit dem Kraftverhältnis eine Näherung von
 * unten; wenige Durchgänge genügen.
 *
 * Die begrenzte Feder hängt vom LASTNIVEAU ab - je Lastfall kann sie anders
 * ausfallen. Das ist keine Unsauberkeit, sondern die Sache selbst.
 *
 * @param {object} o {L, qd, P, M, EI, cA, cB, h, Fgrenz}
 * @returns {{cA, cB, MA, MB, FA, FB, begrenzt, durchgaenge}}
 */
export function begrenzeFeder({ L, qd, P, M, EI, cA, cB, h, Fgrenz }) {
  const kraft = (Mst) => (h > 0 ? Math.abs(Mst) / h : 0);
  let a = cA, b = cB, durchgaenge = 0, begrenzt = false;
  let auf = auflagermomente({ L, qd, P, M, EI, cA: a, cB: b });

  if (!(Fgrenz > 0) || !(h > 0)) {
    return { cA: a, cB: b, MA: auf.MA, MB: auf.MB, FA: kraft(auf.MA),
             FB: kraft(auf.MB), begrenzt: false, durchgaenge: 0 };
  }

  for (let i = 0; i < 60; i++) {
    const FA = kraft(auf.MA), FB = kraft(auf.MB);
    if (FA <= Fgrenz * (1 + 1e-6) && FB <= Fgrenz * (1 + 1e-6)) break;
    if (FA > Fgrenz) a = Math.max(0, a * (Fgrenz / FA));
    if (FB > Fgrenz) b = Math.max(0, b * (Fgrenz / FB));
    begrenzt = true;
    durchgaenge = i + 1;
    auf = auflagermomente({ L, qd, P, M, EI, cA: a, cB: b });
  }
  return { cA: a, cB: b, MA: auf.MA, MB: auf.MB,
           FA: kraft(auf.MA), FB: kraft(auf.MB), begrenzt, durchgaenge };
}

export function auflagermomente({ L, qd, P, M, EI, cA, cB }) {
  const F = fem({ L, qd, P, M });
  const K = EI / L;

  const a11 = 4 * K + cA, a12 = 2 * K;
  const a21 = 2 * K, a22 = 4 * K + cB;
  const det = a11 * a22 - a12 * a21;

  const thetaA = (-F.AB * a22 + F.BA * a12) / det;
  const thetaB = (-F.BA * a11 + F.AB * a21) / det;

  const M_AB = 2 * K * (2 * thetaA + thetaB) + F.AB;
  const M_BA = 2 * K * (2 * thetaB + thetaA) + F.BA;

  // Stützmomente (Zug oben) aus den Stabendmomenten
  const MA = -M_AB;
  const MB = +M_BA;

  const MAvoll = -F.AB;
  const MBvoll = +F.BA;
  return {
    MA, MB,
    kappaA: Math.abs(MAvoll) > 1e-12 ? MA / MAvoll : 0,
    kappaB: Math.abs(MBvoll) > 1e-12 ? MB / MBvoll : 0,
    thetaA, thetaB, MAvoll, MBvoll,
  };
}

/**
 * Nachweis des Mastes am Fuss.
 *
 * Beansprucht wird der Mast durch
 *   - die Auflagerkraft des Jochs  N = R (Druck)
 *   - das eingeleitete Jochmoment  M_Joch = M_A (Stützmoment)
 *   - die Windlast auf den Mast selbst (Gleichlast w_Mast über die Höhe)
 * Der Fuss wird als voll eingespannt angenommen.
 *
 * @param {object} mast   Ergebnis aus mastSteifigkeit()
 * @param {object} o      {N, MJoch, wMast, H, fyd}
 */
export function mastNachweis(mast, { N, MJoch, wMast, H, fyd }) {
  const M_wind = (wMast * H * H) / 2;                 // Kragarm [kNm]
  const M_Fuss = Math.abs(MJoch) + M_wind;
  const sig_N = (N * 10) / mast.profil.A;             // kN/cm2 -> N/mm2
  const sig_M = (M_Fuss * 1000) / mast.W_cm3;         // kNm/cm3 -> N/mm2
  const sig_v = sig_N + sig_M;
  return {
    N, MJoch: Math.abs(MJoch), M_wind, M_Fuss,
    W: mast.W_cm3, A: mast.profil.A,
    sig_N, sig_M, sig_v, eta: sig_v / fyd, ok: sig_v / fyd <= 1,
  };
}
