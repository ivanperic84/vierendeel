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
  { key: 'mast',     label: 'teilweise. Steifigkeit aus Mast' },
  { key: 'manuell',  label: 'teilweise. C_φ manuell' },
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
/**
 * VERSCHIEBLICH ODER NICHT - DER GRÖSSTE EINZELNE FEHLER DIESER FEDER.
 *
 * c_φ = E·I/H ist die Drehsteifigkeit eines Kragmastes, dessen Kopf sich frei
 * VERSCHIEBEN kann. Ein Joch steht aber auf ZWEI Masten und bindet ihre Köpfe
 * zusammen. Unter symmetrischer Vertikallast entstehen an beiden Enden
 * gleichsinnige Stützmomente; die Querkräfte der beiden Maste heben sich auf,
 * und der Rahmen verschiebt sich NICHT. Dann gilt nicht der Kragmast, sondern
 * der unverschiebliche Stab:
 *
 *      verschieblich      c = 1.0 · E·I/H
 *      unverschieblich    c = 4.0 · E·I/H       (Lehrbuch, Drehwinkelverfahren)
 *
 * GEMESSEN an zwei ganz verschiedenen Rahmen (PyNite, beide Maste
 * ausmodelliert, Füsse eingespannt, Joch an beiden Ebenen angeschlossen):
 *
 *   Signaljoch  18.935 m, HEB 260 / 7.8 m gegen HEM 240 / 12.0 m,
 *               Anschluss mit den wirklichen Federn
 *               θ = 272.5 µrad bei M = 3.28 kNm  ->  c = 12 030  =  3.11 · E·I/H
 *   J90         15.5 m, zwei gleiche HEB 260 / 7.5 m
 *               θ = 358.8 µrad bei M = 4.63 kNm  ->  c = 12 906  =  3.09 · E·I/H
 *
 * Zwei Spannweiten, zwei Mastpaare, gleiche und ungleiche Enden - und
 * derselbe Faktor. Er liegt unter dem Lehrbuchwert 4.00, weil das Joch steif,
 * aber nicht starr ist. Gerechnet wird mit dem gemessenen Wert.
 *
 * DAMIT ÜBERHOLT ist die frühere Kalibrierung des Anschlussfaktors (1.37 für
 * den Punktanschluss, 1.45 über die Jochhöhe). Sie stammt aus einem Modell,
 * dessen Jochende sich VERSCHIEBEN konnte; sie nannte für das J90 ein
 * Feldmoment von 10.27 kNm, der Rahmen mit beiden Masten liefert 8.22 kNm.
 * Für die Vertikallastfälle gilt jetzt der Rahmenwert; die Anschlussfaktoren
 * wirken nur noch im verschieblichen Fall.
 *
 * WANN WELCHER
 *   Vertikallasten (Eigengewicht, Schnee) und Wind in Gleisrichtung
 *      -> symmetrische Stützmomente, kein Verschieben -> UNVERSCHIEBLICH
 *   Wind in JOCHACHSE
 *      -> beide Mastköpfe wollen in dieselbe Richtung, der Rahmen verschiebt
 *         sich -> VERSCHIEBLICH, der Kragmast ist richtig
 *
 * WAS DAS ÄNDERT
 * Bisher galt für beides der Kragmast. Für die Vertikallastfälle war die Feder
 * damit rund dreimal zu weich: das vergrösserte das Feldmoment (sichere Seite)
 * und VERKLEINERTE das Stützmoment - am verjüngten Jochende die unsichere.
 *
 * ENTSCHIEDEN AM 31. AUGUST - 4.00 STATT 3.10
 *
 * Es kam eine zweite Messung dazu, aus einem anderen Programm und mit einer
 * anderen Messgrösse. AxisVM 18, J90 über 20 m, HEB 240 mit H = 7.00 m, Mast
 * ausmodelliert und Fuss eingespannt; aus dem FELDMOMENT zurückgerechnet
 * ergibt sich c = 13 456 kNm/rad = 3.98·E·I/H - der Lehrbuchwert 4.00 auf ein
 * halbes Prozent.
 *
 *      PyNite, Drehung direkt gemessen (θ bei M)      3.09 · 3.11
 *      AxisVM, aus dem Feldmoment zurückgerechnet     3.98
 *      Lehrbuch, volle Einspannung                    4.00
 *
 * WARUM DIE BEIDEN AUSEINANDERLAUFEN, IST NICHT GEKLÄRT. Es sind nicht
 * dieselben Grössen: die eine Messung liest die Drehung am Knoten ab, die
 * andere schliesst aus dem Feldmoment auf die Feder zurück und hängt damit
 * an der ganzen Modellkette. Das bleibt offen und soll offen heissen.
 *
 * >>> ANGESETZT WIRD 4.00. Entscheid des Auftraggebers: AxisVM ist das
 * geprüfte Programm, und dass sein Wert den Lehrbuchwert des unverschieblichen
 * Rahmens trifft, ist für die Nachvollziehbarkeit mehr wert als eine dritte
 * Zahl, die nur aus einem Modell stammt. Voraussetzung ist die VOLLE
 * Einspannung des Fundaments - die hier Weisung ist.
 *
 * Was das ändert: die Feder wird 29 % steifer. Am Feldmoment rund −6 %, am
 * Stützmoment rund +9 % - und das Stützmoment ist am verjüngten Jochende das
 * massgebende. Die Änderung geht dort also zur sicheren Seite. <<<
 */
export const MAST_UNVERSCHIEBLICH = 4.00;

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
export function mastSteifigkeit(inp, ende = 'A', verschieblich = false) {
  // Zwei Maste sind der Normalfall, nicht die Ausnahme: verschiedene Profile,
  // verschiedene Höhen (Gelände!), verschiedene Stegrichtungen. Fehlt die
  // zweite Angabe, gilt für beide Enden derselbe Mast.
  const zwei = ende === 'B' && inp.mastZwei === true;
  const p = getMastprofil(zwei ? (inp.mastProfilB ?? inp.mastProfil) : inp.mastProfil);
  const sr = getStegrichtung(zwei ? (inp.mastStegB ?? inp.mastSteg) : inp.mastSteg);
  const H = zwei ? (inp.mastHB ?? inp.mastH) : inp.mastH;
  /*
   * DIE GESAMTLAENGE traegt nur die Geometrie, nicht die Steifigkeit.
   *
   * In die Drehfeder geht H ein - Fuss bis Jochachse -, denn das ist die
   * Laenge, ueber die sich der Mast unter dem Jochanschluss verbiegt. Was
   * darueber hinausragt, ist ein Kragarm mit eigenen Lasten; er macht die
   * Einspannung des Jochs nicht weicher. `laenge` steht deshalb daneben und
   * nicht an der Stelle von H.
   */
  const laenge = zwei ? (inp.mastLaengeB || inp.mastLaenge || 0)
                      : (inp.mastLaenge || 0);
  const ueberstand = Math.max(0, laenge - H);
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
  // Das Widerstandsmoment der ANDEREN Achse - gebraucht fuer den
  // Mastnachweis: die Biegung in Gleisrichtung geht ueber diese Achse.
  const Wq_cm3 = sr.achse === 'y' ? p.Wz : p.Wy;
  // Verschieblich: der Anschlussfaktor greift, der Kopf kann ausweichen.
  // Unverschieblich: das Joch hält die beiden Mastköpfe zusammen; dann regiert
  // die Rahmenwirkung, nicht die Bauart des Anschlusses.
  return { profil: p, stegrichtung: sr, I_cm4, W_cm3, I, H, laenge, ueberstand, ende,
           anschluss: an.key, faktor: an.faktor,
           cKragarm,
           cVerschieblich: an.faktor * cKragarm,
           cUnverschieblich: MAST_UNVERSCHIEBLICH * cKragarm,
           cPhi: (verschieblich ? an.faktor : MAST_UNVERSCHIEBLICH) * cKragarm,
           Iq_cm4, Iq, Wq_cm3 };
}

/**
 * VERDREHUNG DER MASTKÖPFE - AUS MASTWIND UND AUS DER JOCHLÄNGSKRAFT.
 *
 * Am Jochende wirkt statt M = −c·θ das Federgesetz M = −c·(θ − θ₀): θ₀ ist die
 * Verdrehung, die der Mastkopf ohne das Joch machen würde, und sie wird dem
 * Jochende AUFGEZWUNGEN. Zwei Ursachen bringen sie hervor.
 *
 * 1. DER WIND AUF DEN MAST, in der Jochachse.
 *
 *      Kragmast, Fuss eingespannt, Gleichlast w über die Höhe H
 *      -> θ_w = w·H³/(6·E·I)     δ_w = w·H⁴/(8·E·I)
 *
 * 2. DIE LÄNGSKRAFT DES JOCHS - der grössere Anteil, und lange übersehen.
 *
 * Eine Anbaulast in Jochachse (F_x) läuft im Ersatzbalken als Normalkraft ins
 * Auflager und ist dort zu Ende. In Wirklichkeit ist das Auflager ein
 * MASTKOPF: die Kraft greift auf der Höhe H an, biegt den Mast und verdreht
 * seinen Kopf - und diese Verdrehung geht als Zwang ins Joch zurück.
 *
 *      θ_P = P·H²/(2·E·I)
 *
 * WIE SICH DIE KRAFT AUFTEILT. Das Joch ist in seiner Achse dehnstarr (beim
 * Signaljoch 240-mal steifer als die beiden Mastköpfe zusammen), beide Köpfe
 * haben deshalb DIESELBE Verschiebung δ. Mit der Kopfsteifigkeit des
 * Kragmastes k = 3·E·I/H³:
 *
 *      δ = ( Σ k_i·δ_w,i + F_x ) / Σ k_i          P_i = k_i · (δ − δ_w,i)
 *
 * Die Aufteilung folgt also den Kopfsteifigkeiten, und der Mastwind
 * verschiebt sie zusätzlich: der weichere Mast wird vom steiferen gestützt.
 *
 * GEMESSEN am Signaljoch (PyNite, beide Maste ausmodelliert, Wind längs):
 *
 *      Mast A HEB 260 / 7.80 m   k = 198   P = 5.10 kN   (PyNite 5.11)
 *      Mast B HEM 240 / 12.00 m  k =  89   P = 1.32 kN   (PyNite 1.32)
 *
 *      θ_Wind    0.83 / 1.75 mrad
 *      θ_Kraft   4.95 / 1.86 mrad       <- der Wind ist der kleinere Anteil
 *
 *      M ≈ c·θ   23.2 / 15.3 kNm        gegen PyNite 21.5 / 16.3
 *
 * Ohne den zweiten Anteil rechnete das Werkzeug 3.3 / 6.5 kNm - ein Sechstel
 * bzw. ein Drittel. Der Lastfall Wind in Jochachse lag entsprechend 40 bis
 * 55 % zu tief, auf der unsicheren Seite.
 *
 * GRENZE
 * Beim Anschluss 'durchlaufend' wird die Feder mit 1.45 angesetzt, θ₀ aber
 * unverändert aus dem Kragmast genommen. Der Kopf eines durchlaufenden
 * Mastes verdreht sich etwas weniger; das eingeleitete Moment fällt hier
 * also eher zu gross aus - auf der sicheren Seite.
 *
 * NICHT ENTHALTEN ist der Wind auf den Mast in GLEISRICHTUNG (Handbuch 4.4).
 *
 * @param {object} mastA Ergebnis aus mastSteifigkeit(), Ende A
 * @param {object} mastB dito, Ende B (fehlt er, gilt A für beide)
 * @param {object} lasten {wMast [kN/m], Fx [kN]} - beide bereits mit den
 *        Beiwerten des Lastfalls
 * @returns {{delta:number, A:object, B:object, wMast:number, Fx:number}}
 */
export function mastKoepfe(mastA, mastB, { wMast = 0, wMastB = null, Fx = 0 } = {}) {
  const leer = { theta0: 0, thetaWind: 0, thetaKraft: 0, P: 0, M0: 0 };
  const A = mastA, B = mastB ?? mastA;
  const w = Number.isFinite(wMast) ? wMast : 0;
  const F = Number.isFinite(Fx) ? Fx : 0;
  if (!A || !(A.I > 0) || !(A.H > 0) || !B || !(B.I > 0) || !(B.H > 0)) {
    return { delta: 0, A: leer, B: leer, wMast: 0, Fx: 0 };
  }
  // Zwei verschiedene Maste fangen verschieden viel Wind: der Wert für Ende B
  // darf abweichen, sonst gilt derselbe für beide.
  const wB = Number.isFinite(wMastB) ? wMastB : w;
  const je = (m, wi) => ({
    I: m.I, H: m.H, cPhi: m.cPhi,
    k: (3 * E_STAHL * m.I) / m.H ** 3,
    dw: (wi * m.H ** 4) / (8 * E_STAHL * m.I),
    tw: (wi * m.H ** 3) / (6 * E_STAHL * m.I),
  });
  const a = je(A, w), b = je(B, wB);
  const K = a.k + b.k;
  const delta = K > 0 ? (a.k * a.dw + b.k * b.dw + F) / K : 0;
  const ende = (e) => {
    const P = e.k * (delta - e.dw);
    const thetaKraft = (P * e.H ** 2) / (2 * E_STAHL * e.I);
    const theta0 = e.tw + thetaKraft;
    return { P, thetaWind: e.tw, thetaKraft, theta0, M0: e.cPhi * theta0 };
  };
  return { delta, A: ende(a), B: ende(b), wMast: w, wMastB: wB, Fx: F };
}

/**
 * STEHT EIN MAST IM MODELL?
 *
 * >>> WEISUNG DES AUFTRAGGEBERS, 28. August: «hier nicht abhängig machen, ob
 * Mast im Modell aufgeführt wird oder nicht. Die Haupttragwerke sollten
 * global gesteuert werden.» <<<
 *
 * Bis dahin waren zwei Fragen eine: die Auswahl «Endauflager» entschied
 * zugleich, WIE das Joch gelagert ist UND OB es überhaupt einen Masten gibt.
 * Wer gelenkig rechnen wollte, verlor damit den Masten aus dem Modell — samt
 * seinem Wind, seinen Anbauteilen, seinem Nachweis und seiner Ausleitung.
 * Und wer den Masten sehen wollte, musste seine Steifigkeit ansetzen.
 *
 * Es sind zwei Fragen:
 *   `mastVorhanden`   ob er dasteht — Bauteil, Bild, Ausleitung, Nachweis
 *   `endbedingung`    woher die Drehfeder des Jochendes kommt
 *
 * ALTE DATEIEN RECHNEN UNVERÄNDERT. Fehlt `mastVorhanden`, gilt der frühere
 * Zusammenhang: es gab einen Masten genau dann, wenn die Endbedingung ihn
 * verlangte. Ohne diesen Rückfall bekäme jedes gespeicherte Tragwerk mit
 * gelenkigem Auflager still einen Masten dazu.
 */
export const mastImModell = (inp) =>
  (typeof inp?.mastVorhanden === 'boolean'
    ? inp.mastVorhanden : inp?.endbedingung === 'mast');

/**
 * Drehfedersteifigkeit beider Jochenden nach gewählter Endbedingung.
 *
 * Die MASTGEOMETRIE wird davon unabhängig geführt: sie steht im Ergebnis,
 * sobald ein Mast angegeben ist, auch wenn die Feder aus einer anderen
 * Quelle kommt.
 *
 * @returns {{cA:number, cB:number, mast:object|null, art:string}}
 */
export function drehfedern(inp, verschieblich = false) {
  const da = mastImModell(inp);
  const mastA = da ? mastSteifigkeit(inp, 'A', verschieblich) : null;
  const mastB = da ? mastSteifigkeit(inp, 'B', verschieblich) : null;
  const zwei = inp.mastZwei === true;
  // Die Geometrie hängt an `mastVorhanden`, nicht an der Endbedingung.
  const geo = da
    ? { mast: mastA, mastA, mastB, zweiMaste: zwei, verschieblich }
    : { mast: null };

  switch (inp.endbedingung) {
    case 'gelenkig': return { cA: 0, cB: 0, ...geo, art: 'gelenkig' };
    case 'voll':     return { cA: C_STARR, cB: C_STARR, ...geo,
                              art: 'voll eingespannt' };
    case 'manuell':  return { cA: inp.cPhi, cB: inp.cPhi, ...geo,
                              art: 'teilweise (manuell)' };
    case 'mast': {
      /*
       * OHNE MASTEN GIBT ES KEINE STEIFIGKEIT AUS DEM MASTEN.
       *
       * Dann wird gelenkig gerechnet - und zwar laut: die Bezeichnung sagt
       * es, und `hinweise()` schreibt es in die Liste. Still eine Feder aus
       * einem Bauteil zu bilden, das nicht dasteht, wäre die schlimmere
       * Antwort.
       */
      if (!da) {
        return { cA: 0, cB: 0, ...geo,
                 art: 'gelenkig (kein Mast im Modell)', mastFehlt: true };
      }
      return { cA: mastA.cPhi, cB: mastB.cPhi, ...geo,
               art: `teilweise (Mast${zwei ? 'e' : ''}, `
                  + `${verschieblich
                        ? (mastA.faktor === 1 ? 'Kragarm' : 'durchlaufend')
                        : 'unverschieblich'})` };
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
  // JE GURT, NICHT JE GURTEBENE (Weisung). Das Kräftepaar trägt jede Ebene
  // mit ZWEI Gurten; die Grenzlast ist die eines Anschlusses, also der
  // halben Ebenenkraft. Zuvor stand hier M/h - das Doppelte, und damit ein
  // Nachweis, der bei jedem zweiten Joch grundlos anschlug.
  const kraft = (Mst) => (h > 0 ? Math.abs(Mst) / (2 * h) : 0);
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

