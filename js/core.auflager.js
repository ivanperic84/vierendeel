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
export function mastSteifigkeit(inp, ende = 'A') {
  // Zwei Maste sind der Normalfall, nicht die Ausnahme: verschiedene Profile,
  // verschiedene Höhen (Gelände!), verschiedene Stegrichtungen. Fehlt die
  // zweite Angabe, gilt für beide Enden derselbe Mast.
  const zwei = ende === 'B' && inp.mastZwei === true;
  const p = getMastprofil(zwei ? (inp.mastProfilB ?? inp.mastProfil) : inp.mastProfil);
  const sr = getStegrichtung(zwei ? (inp.mastStegB ?? inp.mastSteg) : inp.mastSteg);
  const H = zwei ? (inp.mastHB ?? inp.mastH) : inp.mastH;
  const I_cm4 = sr.achse === 'y' ? p.Iy : p.Iz;
  const W_cm3 = sr.achse === 'y' ? p.Wy : p.Wz;
  const I = I_cm4 * 1e-8;                       // cm4 -> m4
  const an = MASTANSCHLUESSE.find((a) => a.key === (inp.mastAnschluss ?? 'durchlaufend'))
    ?? MASTANSCHLUESSE[0];
  const cKragarm = (E_STAHL * I) / H;           // kNm/rad
  // Die ANDERE Achse: sie trägt die Biegung des Mastes in GLEISRICHTUNG und
  // bestimmt damit, wie der Mastkopf sich um die JOCHACHSE verdrehen kann.
  const Iq_cm4 = sr.achse === 'y' ? p.Iz : p.Iy;
  const Iq = Iq_cm4 * 1e-8;
  return { profil: p, stegrichtung: sr, I_cm4, W_cm3, I, H, ende,
           anschluss: an.key, faktor: an.faktor,
           cKragarm, cPhi: an.faktor * cKragarm,
           Iq_cm4, Iq, cTorsion: (an.faktor * E_STAHL * Iq) / H };
}

/**
 * TORSION AUS DEM WIND AUF DEN MAST IN GLEISRICHTUNG.
 *
 * Dieser Wind biegt den Mast quer zur Jochachse. Am Jochende kommt davon
 * zweierlei an:
 *
 * 1. Eine VERSCHIEBUNG des Auflagerpunktes in Gleisrichtung. Sie richtet im
 *    Joch nichts an. Im Grundriss ist das Joch an beiden Enden gelenkig
 *    gelagert und ohne Drehfeder (die Verdrehung um die Hochachse würde die
 *    Torsionssteifigkeit des offenen Mastprofils beanspruchen, siehe oben).
 *    Ein statisch bestimmtes System bekommt aus Auflagerverschiebungen keine
 *    Schnittgrössen - auch aus ungleichen nicht: das Joch dreht sich im
 *    Grundriss als Ganzes.
 *
 * 2. Eine VERDREHUNG des Mastkopfes um die JOCHACHSE:
 *
 *        φ₀ = w_quer · H³ / (6 · E · I_quer)
 *
 *    Und die richtet etwas an - aber nur, wenn die beiden Enden sich
 *    UNGLEICH verdrehen. Gleiche Maste verdrehen sich gleich, das Joch dreht
 *    sich starr mit, und es entsteht keine Torsion. Stehen die Enden auf
 *    verschiedenen Masten, wird das Joch zwischen ihnen verwunden.
 *
 * DAS JOCH WIRD DABEI ALS TORSIONSSTARR ANGENOMMEN. Der Differenzwinkel geht
 * dann ganz auf die beiden Mastfedern, in Reihe geschaltet:
 *
 *        T₀ = (φ₀B − φ₀A) / (1/c_TA + 1/c_TB)
 *
 * Das ist die OBERE SCHRANKE - ein nachgiebiges Joch nimmt weniger auf. Am
 * nachgerechneten Signaljoch (HEB 260 / 7.8 m gegen HEM 240 / 12.0 m) sind es
 * 2.32 kNm gegenüber 2.04 kNm mit der Torsionssteifigkeit des Jochs, also
 * 14 % mehr.
 *
 * Die Drehfeder um die Jochachse bekommt denselben Anschlussfaktor wie die
 * vertikale Einspannung. Gemessen wurde er für jene; hier wirkt er auf der
 * sicheren Seite, weil eine steifere Feder MEHR Torsion einleitet.
 *
 * @param {object} mastA Ergebnis aus mastSteifigkeit(), Ende A
 * @param {object} mastB dito, Ende B
 * @param {number} wQuer Windlast je Laufmeter Mast in Gleisrichtung [kN/m]
 * @returns {{phiA:number, phiB:number, T0:number, gleich:boolean}}
 */
export function mastVerdrehung(mastA, mastB, wQuer) {
  const w = Number.isFinite(wQuer) ? wQuer : 0;
  const leer = { phiA: 0, phiB: 0, T0: 0, gleich: true };
  if (!mastA || !mastB || !(w > 0)) return leer;
  const dreh = (m) => (m.Iq > 0 && m.H > 0
    ? (w * m.H ** 3) / (6 * E_STAHL * m.Iq) : 0);
  const phiA = dreh(mastA), phiB = dreh(mastB);
  const nachgiebig = (mastA.cTorsion > 0 ? 1 / mastA.cTorsion : Infinity)
                   + (mastB.cTorsion > 0 ? 1 / mastB.cTorsion : Infinity);
  const T0 = Number.isFinite(nachgiebig) && nachgiebig > 0
    ? (phiB - phiA) / nachgiebig : 0;
  return { phiA, phiB, T0, gleich: Math.abs(phiB - phiA) < 1e-12, wQuer: w };
}

/**
 * VERDREHUNG DES MASTKOPFES AUS DEM WIND AUF DEN MAST.
 *
 * Der Wind quer zum Gleis - also IN DER JOCHACHSE - drückt gegen den Mast.
 * Der Mast biegt sich, sein Kopf verdreht sich, und weil das Jochende dort
 * angeschlossen ist, wird diese Verdrehung dem Joch AUFGEZWUNGEN. Das ist
 * keine Last auf dem Joch, sondern eine Auflagerverdrehung:
 *
 *      Kragmast, Fuss eingespannt, Gleichlast w über die Höhe H
 *      -> Kopfverdrehung  θ₀ = w·H³ / (6·E·I)
 *
 * Am Jochende wirkt dann statt M = −c·θ das Federgesetz
 *
 *      M = −c·(θ − θ₀)
 *
 * Hält das Joch den Kopf vollständig (θ = 0), ist das eingeleitete Moment
 * M₀ = c·θ₀ = w·H²/6 - genau das Moment, das ein am Fuss eingespannter und
 * am Kopf drehfest gehaltener Mast unter Gleichlast am Kopf abgibt. Der
 * Ersatzbalken bekommt damit die richtige obere Schranke.
 *
 * WARUM DAS NÖTIG IST
 * Ohne diesen Anteil fehlt dem Lastfall Wind in Jochachse die grösste
 * Einwirkung. Am nachgerechneten Signaljoch trägt der Wind auf die beiden
 * Maste 6.10 kN gegenüber 6.42 kN auf den Anbauteilen - also die Hälfte der
 * gesamten Einwirkung. Das Werkzeug lag in diesem Lastfall rund 80 % zu tief.
 *
 * GRENZE
 * Beim Anschluss 'durchlaufend' wird die Feder mit 1.45 angesetzt, θ₀ aber
 * unverändert aus dem Kragmast genommen. Der Kopf eines durchlaufenden
 * Mastes verdreht sich etwas weniger; das eingeleitete Moment fällt hier
 * also eher zu gross aus - auf der sicheren Seite.
 *
 * NICHT ENTHALTEN ist der Wind auf den Mast in GLEISRICHTUNG. Er verschiebt
 * die Mastköpfe quer und verdreht sie um die Jochachse; das Joch bekommt
 * daraus eine Auflagerverschiebung und eine Torsion, nicht eine Biegung.
 * Der Ersatzbalken hat für beides keine Entsprechung.
 *
 * @param {object} mast Ergebnis aus mastSteifigkeit()
 * @param {number} wMast Windlast je Laufmeter Mast [kN/m], in der Jochachse
 * @returns {{theta0:number, M0:number, wMast:number}}
 */
export function mastKopfdrehung(mast, wMast) {
  const w = Number.isFinite(wMast) ? wMast : 0;
  if (!mast || !(w > 0) || !(mast.I > 0) || !(mast.H > 0)) {
    return { theta0: 0, M0: 0, wMast: 0 };
  }
  const theta0 = (w * mast.H ** 3) / (6 * E_STAHL * mast.I);
  return { theta0, M0: mast.cPhi * theta0, wMast: w };
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
      const mastA = mastSteifigkeit(inp, 'A');
      const mastB = mastSteifigkeit(inp, 'B');
      const zwei = inp.mastZwei === true;
      return { cA: mastA.cPhi, cB: mastB.cPhi,
               mast: mastA, mastA, mastB, zweiMaste: zwei,
               art: `teilweise (Mast${zwei ? 'e' : ''}, `
                  + `${mastA.faktor === 1 ? 'Kragarm' : 'durchlaufend'})` };
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
export function begrenzeFeder({ L, qd, P, M, EI, cA, cB, h, Fgrenz,
                                theta0A = 0, theta0B = 0, MkA = 0, MkB = 0 }) {
  const kraft = (Mst) => (h > 0 ? Math.abs(Mst) / h : 0);
  let a = cA, b = cB, durchgaenge = 0, begrenzt = false;
  let auf = auflagermomente({ L, qd, P, M, EI, cA: a, cB: b, theta0A, theta0B, MkA, MkB });

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
    auf = auflagermomente({ L, qd, P, M, EI, cA: a, cB: b, theta0A, theta0B, MkA, MkB });
  }
  return { cA: a, cB: b, MA: auf.MA, MB: auf.MB,
           FA: kraft(auf.MA), FB: kraft(auf.MB), begrenzt, durchgaenge };
}

export function auflagermomente({ L, qd, P, M, EI, cA, cB,
                                  theta0A = 0, theta0B = 0,
                                  MkA = 0, MkB = 0 }) {
  const F = fem({ L, qd, P, M });
  const K = EI / L;

  const a11 = 4 * K + cA, a12 = 2 * K;
  const a21 = 2 * K, a22 = 4 * K + cB;
  const det = a11 * a22 - a12 * a21;

  // Rechte Seite: FEM und, falls der Auflagerpunkt selbst verdreht ist
  // (Wind auf den Mast, mastKopfdrehung), der Anteil c·θ₀ daraus.
  //     M_AB = −c_A·(θ_A − θ₀A)  =>  (4K+c_A)θ_A + 2K θ_B = −FEM_AB + c_A θ₀A
  // Kragarmmomente wirken unmittelbar auf den Knoten: hängt am Auflager ein
  // Kragarm, gibt er sein Endmoment dort ab, ganz gleich wie weich die Feder
  // ist. Bei c = 0 bleibt genau M_A = M_kA übrig - der Gelenkträger mit
  // Kragarm.
  const rA = -F.AB + cA * (theta0A ?? 0) - (MkA ?? 0);
  const rB = -F.BA + cB * (theta0B ?? 0) + (MkB ?? 0);

  const thetaA = (rA * a22 - rB * a12) / det;
  const thetaB = (rB * a11 - rA * a21) / det;

  const M_AB = 2 * K * (2 * thetaA + thetaB) + F.AB;
  const M_BA = 2 * K * (2 * thetaB + thetaA) + F.BA;

  // Stützmomente (Zug oben) aus den Stabendmomenten
  const MA = -M_AB;
  const MB = +M_BA;

  const MAvoll = -F.AB + (MkA ?? 0);
  const MBvoll = +F.BA + (MkB ?? 0);
  const M0A = cA * (theta0A ?? 0);
  const M0B = cB * (theta0B ?? 0);
  return {
    MA, MB,
    kappaA: Math.abs(MAvoll) > 1e-12 ? MA / MAvoll : 0,
    kappaB: Math.abs(MBvoll) > 1e-12 ? MB / MBvoll : 0,
    thetaA, thetaB, MAvoll, MBvoll,
    theta0A: theta0A ?? 0, theta0B: theta0B ?? 0, M0A, M0B,
    MkA: MkA ?? 0, MkB: MkB ?? 0,
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
