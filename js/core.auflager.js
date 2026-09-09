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

/*
 * >>> DIE AUFLAGERBEDINGUNG DARF DIE ENDBEDINGUNG SEIN. <<<
 *
 * Weisung vom 9. September, als Frage: «kann man die Endauflager auswahl mit
 * dem untern diagramm und der definition der ober untergurte …» - der Satz
 * bricht ab; auf Rueckfrage entschieden: eine neue Wahl, die c_phi aus der
 * Auflagerbedingung nimmt.
 *
 * >>> WAS BISHER NEBENEINANDER STAND. <<<
 *
 * Die Endbedingung setzte die Drehfeder des ERSATZBALKENS - damit rechnet
 * die Anwendung. Die Matrix darunter setzte die LINKELEMENTE - die gehen in
 * die AxisVM-Ausleitung. Zwei Beschreibungen desselben Jochendes, und die
 * Zahl, die aus den Gurtfedern folgt (`linkEinspannung`), stand da, ohne
 * gerechnet zu werden. Wer die Federn nach einem gemessenen Modell einstellt,
 * bekam sie im Nachweis nicht zu sehen.
 *
 * >>> UND WARUM DER MAST IN REIHE DAZUKOMMT. <<<
 *
 * Der Anschluss ist nicht das Einzige, was nachgibt. Steht ein Mast im
 * Modell, sitzen ZWEI Federn hintereinander - der Gurtanschluss und der
 * Mast -, und hintereinander addieren sich die Nachgiebigkeiten:
 *
 *      1/c_ges = 1/c_Anschluss + 1/c_Mast
 *
 * Ohne diesen Schritt hiesse «beide Gurte starr» voll eingespannt, obwohl
 * der Mast sich biegt - die unsichere Annahme, und zwar am verjuengten
 * Jochende, wo das Stuetzmoment massgebend ist. Es ist eine Ausfuehrungs-
 * entscheidung zur Weisung; beide Zahlen liegen vor, und nur zusammen
 * beschreiben sie das Ende.
 */
export const ENDBEDINGUNGEN = [
  { key: 'gelenkig', label: 'gelenkig (c_φ = 0)' },
  { key: 'mast',     label: 'teilweise. Steifigkeit aus Mast' },
  { key: 'links',    label: 'teilweise. aus der Auflagerbedingung am Masten' },
  { key: 'manuell',  label: 'teilweise. C_φ manuell' },
  { key: 'voll',     label: 'voll eingespannt (c_φ = ∞)' },
];

/**
 * Die Drehfeder aus der eingestellten Auflagerbedingung.
 *
 * @param {object} inp  Eingabesatz
 * @param {object|null} mast  Mastangabe (fuer die Reihenschaltung), oder null
 * @returns {{c:number, art:string}}
 */
export function federAusLinks(inp, mast = null) {
  const art = inp?.tragwerksart ?? 'joch';
  const h = Number(inp?.h) || (Number(inp?.jd) || 0) / 1000;
  const e = linkEinspannung(inp, art, h);
  // Ein Gelenk bleibt ein Gelenk, gleichgueltig wie steif der Mast ist.
  if (e.art === 'gelenk') return { c: 0, art: 'gelenkig (aus der Bedingung)' };
  const cAn = e.art === 'eingespannt' ? Infinity : e.cPhi;
  const cM = Number(mast?.cPhi);
  if (!Number.isFinite(cM) || cM <= 0) {
    return { c: Number.isFinite(cAn) ? cAn : C_STARR,
             art: Number.isFinite(cAn)
               ? 'teilweise (Gurtfedern)' : 'voll eingespannt (Gurtfedern starr)' };
  }
  if (!Number.isFinite(cAn)) return { c: cM, art: 'teilweise (Mast, Gurte starr)' };
  return { c: 1 / (1 / cAn + 1 / cM), art: 'teilweise (Gurtfedern und Mast)' };
}

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

/**
 * >>> DER UEBERSTAND ZAEHLT AB OBERKANTE OBERGURT. <<<
 *
 * Weisung vom 5. September, entschieden: «ab ok obergurt den ueberstand
 * ansetzen, und die maten auf 0.50 m schritte anlegen.»
 *
 * Das ist die aeltere der beiden Regeln - dieselbe, die die Modellansicht
 * seit je haelt und das Handbuch beschreibt. Sie gilt jetzt ueberall, und
 * die kurzlebige Fassung «0.50 m ueber der Jochachse» ist weg.
 *
 * H misst vom Fundament bis zur JOCHACHSE; die Oberkante des Obergurts
 * liegt um die halbe Bauhoehe darueber. Also
 *
 *      L_M = H + jd/2 + 0.50 m,   aufgerundet auf den halben Meter
 *
 * >>> UND ZWAR AUFGERUNDET, NIE AB. <<<
 *
 * Das Sortiment fuehrt die Masten im Halbmeterraster (DP22 / 10.50 m), und
 * ein Mast, den es nicht gibt, waere eine Zeichnung ohne Bauteil.
 * Abgerundet wuerde der Mindestueberstand unterschritten - deshalb immer
 * nach oben.
 */
export const MAST_UEBERSTAND_VORGABE = 0.50;

/** Das Raster der Mastlaengen im Sortiment [m]. */
export const MAST_RASTER = 0.50;

/**
 * Die vorgegebene Gesamtlaenge [m].
 *
 * @param {number} H   Anschlusshoehe, Fundament bis Jochachse [m]
 * @param {number} jd  Bauhoehe des Jochs, Aussenmass [mm]
 */
export function mastLaengeVorgabe(H, jd = 0) {
  const roh = (Number(H) || 0) + (Number(jd) || 0) / 2000
            + MAST_UEBERSTAND_VORGABE;
  return Math.round(Math.ceil(roh / MAST_RASTER) * MAST_RASTER * 1000) / 1000;
}

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
  /*
   * >>> DIE HOEHE FOLGT IHREM EIGENEN SCHALTER. <<<
   *
   * `mastZwei` sagt, dass der MAST am Ende B ein anderer ist - Profil,
   * Laenge, Stegrichtung. Ob das Joch dort auch anders hoch anschliesst,
   * ist eine zweite Frage, und seit die Masten einzeln anwaehlbar sind eine
   * getrennte: `mastenProjizieren` setzt `mastZwei` schon, wenn sich bloss
   * die Profile unterscheiden. Ohne die Trennung wuerde damit `mastHB`
   * scharf - ein Feld mit dem Standardwert 7.50 m, das niemand angefasst
   * hat, mitten in der Drehfeder. Ausfuehrlich in core.constants.js,
   * anschlusshoehe().
   *
   * Fehlt `mastHZwei`, gilt `mastZwei` - jede bisher gespeicherte Datei
   * rechnet damit unveraendert weiter.
   */
  const zweiH = ende === 'B' && (inp.mastHZwei ?? inp.mastZwei) === true;
  const H = zweiH ? (inp.mastHB ?? inp.mastH) : inp.mastH;
  /*
   * DIE GESAMTLAENGE traegt nur die Geometrie, nicht die Steifigkeit.
   *
   * In die Drehfeder geht H ein - Fuss bis Jochachse -, denn das ist die
   * Laenge, ueber die sich der Mast unter dem Jochanschluss verbiegt. Was
   * darueber hinausragt, ist ein Kragarm mit eigenen Lasten; er macht die
   * Einspannung des Jochs nicht weicher. `laenge` steht deshalb daneben und
   * nicht an der Stelle von H.
   */
  /*
   * >>> OHNE ANGABE FOLGT DIE LAENGE DER ANSCHLUSSHOEHE. <<<
   *
   * Weisung vom 5. September: «das feld Mastlaenge mit der Anschlusshoehe
   * koppeln, die Mastlaenge als voreinstellwert 0.5m laenger auf
   * anschlusshoehe bezogen.»
   *
   * Bis hierher stand `0` fuer «keine Angabe», und `0` hiess im Modell:
   * KEIN Ueberstand, der Mast endet am Obergurt. Im BILD galt daneben eine
   * andere Regel - mindestens 0.50 m ueber die Oberkante des Obergurts -,
   * und beide wussten nichts voneinander. Dasselbe Tragwerk hatte damit im
   * Bild einen Mastkopf und im ausgeleiteten Modell keinen.
   *
   * Jetzt traegt EINE Zahl beide: ohne Angabe ist die Laenge H + 0.50 m.
   */
  const rohLaenge = zwei ? (inp.mastLaengeB || inp.mastLaenge || 0)
                         : (inp.mastLaenge || 0);
  const laenge = rohLaenge > 0 ? rohLaenge : mastLaengeVorgabe(H, inp?.jd);
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
    /*
     * DIE FEDERN DER GURTANSCHLUESSE, in Reihe mit dem Masten - siehe den
     * Vermerk bei ENDBEDINGUNGEN. Beide Enden tragen dieselbe Bedingung
     * (die Maske fuehrt einen Satz je Gurtebene); die MASTFEDER kann
     * verschieden sein, deshalb je Ende gerechnet.
     */
    case 'links': {
      const a = federAusLinks(inp, mastA);
      const b = federAusLinks(inp, mastB);
      return { cA: a.c, cB: b.c, ...geo, art: a.art };
    }
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

/**
 * WO DIE MASTACHSE STEHT, UND WIE WEIT SIE NACH INNEN DARF.
 *
 * Der Mast steht nicht zwingend am Gurtende. Rueckt er nach innen, liegen
 * die Anschlusspunkte nicht mehr an der Stirn, sondern auf den Gurten; das
 * Joch kragt darueber hinaus. `kragA` und `kragB` fuehren dieses Mass seit
 * je, der Ersatzbalken rechnet damit - die Ausleitung setzte den Mast aber
 * bis zum 1. September starr auf x = 0 und x = L.
 *
 * DIE GRENZE IST BERUEHRUNG, GEMESSEN AM FLANSCHRAND (Weisung): der Mast
 * darf so weit nach innen, bis sein Flansch am Bindeblech anliegt. Kein
 * Mindestabstand, kein Spiel - anliegend ist zulaessig, ueberschneidend
 * nicht.
 *
 * Massgebend ist die Ausdehnung des Mastes IN DER JOCHACHSE. Sie haengt an
 * der Stegrichtung: steht der Steg in Jochachse, ist es die Profilhoehe h,
 * sonst die Flanschbreite b. Beim HEB 260 ist beides gleich, beim HEM 240
 * nicht.
 */

/** Mastangaben des Endes, oder null ohne Mast. */
function mastVon(m, ende) {
  const f = m?.federn ?? {};
  return (ende === 'B' ? (f.mastB ?? f.mast) : (f.mastA ?? f.mast)) ?? null;
}

/** Ausdehnung des Mastes in Jochachse [m]. */
export function mastTiefe(m, ende = 'A') {
  const md = mastVon(m, ende);
  if (!md?.profil) return 0;
  const p = md.profil;
  return ((md.stegrichtung?.achse === 'y' ? p.h : p.b) ?? 0) / 1000;
}

/** Lage der Mastachse [m] - am Gurtende, oder um den Kragarm nach innen. */
export function mastAchse(m, ende = 'A') {
  const L = m?.L ?? 0;
  return ende === 'A' ? Math.max(0, m?.kragA ?? 0)
                      : L - Math.max(0, m?.kragB ?? 0);
}

/**
 * Freiraum der Mastachse zwischen Jochende und erstem Bindeblech.
 *
 * @returns {null|{achse, tiefe, grenze, blech, frei, ueberschnitt}}
 *   grenze       weiteste zulaessige Lage der Achse [m]
 *   blech        Kante des ersten stoerenden Blechs [m], oder null
 *   frei         Weg, der noch bleibt [m]; negativ heisst Ueberschneidung
 *   ueberschnitt true, wenn der Flansch im Blech steht
 */
export function mastFreiraum(m, ende = 'A', sperren = null) {
  const md = mastVon(m, ende);
  if (!md?.profil) return null;
  const halb = mastTiefe(m, ende) / 2;
  const achse = mastAchse(m, ende);
  const innen = ende === 'A' ? +1 : -1;          // Richtung nach Feldmitte
  // Bleche in Jochachse, ohne Zugabe: anliegend ist zulaessig.
  const liste = sperren ?? (m.stationsListe ?? []).map((s) => {
    const b = ((s.vertikal?.breite ?? 0) / 1000) / 2;
    return b > 0 ? { von: s.x - b, bis: s.x + b } : null;
  }).filter(Boolean);

  // Das erste Blech, auf das der Mast trifft, wenn er nach innen wandert.
  const kanten = liste
    .map((s) => (innen > 0 ? s.von : s.bis))
    .filter((k) => (innen > 0 ? k >= -1e-9 : k <= m.L + 1e-9));
  if (!kanten.length) return { achse, tiefe: halb * 2, grenze: null,
                               blech: null, frei: Infinity, ueberschnitt: false };
  // Nach innen: die kleinste Kante rechts der Stirn; nach aussen umgekehrt.
  const blech = innen > 0 ? Math.min(...kanten) : Math.max(...kanten);
  const grenze = blech - innen * halb;
  const frei = innen > 0 ? grenze - achse : achse - grenze;
  return { achse, tiefe: halb * 2, grenze, blech, frei,
           ueberschnitt: frei < -1e-9 };
}

/* ===========================================================================
 * DIE AUFLAGERBEDINGUNG AM MASTEN - JE GURTEBENE EINE
 * ===========================================================================
 *
 * Weisung vom 5. September, nach zwei Bildschirmausschnitten aus AxisVM:
 *
 *   «der obere ausschnitt ist die halterung der zwei obergurte und die
 *    untere abbildung ist die der untergurte. diese einstellung der
 *    freiheitsgrade gilt in diesem beispiel bei den alten Tragjochen, da
 *    diese verjuengt sind in den enden. wir sollten aber den aufbau gleich
 *    gestalten fuer die restlichen jocharten. die Auflagerbedingung sollten
 *    anpassbar sein in der app.»
 *
 * >>> WAS IN DEN BEIDEN AUSSCHNITTEN STAND. <<<
 *
 *              K_X       K_Y       K_Z      K_XX  K_YY  K_ZZ
 *   OBERGURT     0     1E+10     1E+10        0     0     0
 *   UNTERGURT  1E+10   1E+10     1E+10        0     0     0
 *
 * 1E+10 ist das «starr» der Feder, 0 die echte Freigabe. Der UNTERGURT
 * haelt also in allen drei Richtungen, der OBERGURT laesst die Jochachse
 * los.
 *
 * >>> WARUM GERADE DIE LAENGSRICHTUNG AM OBERGURT. <<<
 *
 * Eine Verdrehung des Jochendes um y verschiebt Ober- und Untergurt
 * GEGENLAEUFIG in x. Haelt man beide, sperrt man die Verdrehung - das Ende
 * steht dann nahezu eingespannt da, ohne dass es jemand eingestellt haette.
 * Genau dieser Befund steht seit dem 27. August in `export.axisvm.js` bei
 * den Modellen `gurte` und `mitte` («vier Festhaltungen sperrten sie
 * weitgehend»); dort loest ihn ein einzelner Laengsanker. Am Masten loest
 * ihn die Freigabe am Obergurt - dasselbe Prinzip, an der richtigen Stelle.
 *
 * Beim ALTEN Tragjoch kommt der zweite Grund dazu: seine Enden sind
 * verjuengt, die Gurte laufen dort zusammen, und der kurze Hebel zwischen
 * ihnen wuerde jede Laengshaltung in ein grosses Moment uebersetzen.
 *
 * >>> DIE EINSTELLUNG IST EINE EINGABE, KEINE FESTLEGUNG. <<<
 *
 * Sie gilt «in diesem Beispiel» - fuer die alten, verjuengten Joche. Der
 * Aufbau soll fuer alle Jocharten derselbe sein, die Freiheitsgrade nicht
 * zwingend. Deshalb steht hier eine VORGABE je Art und daneben ein Weg, sie
 * zu ueberschreiben; entschieden wird in der Maske, nicht hier.
 * =========================================================================== */

/** Die sechs Freiheitsgrade eines Linkelements, in der Reihenfolge des Dialogs. */
export const LINK_GRADE = [
  { key: 'x', sym: 'K_X', art: 'kraft', einheit: 'kN/m',
    label: 'Längs — in der Jochachse',
    hinweis: 'Frei geben, wo die Endverdrehung Ober- und Untergurt '
           + 'gegenläufig verschiebt. Beide Ebenen zu halten spannt das '
           + 'Jochende ein, ohne dass es jemand einstellt.' },
  { key: 'y', sym: 'K_Y', art: 'kraft', einheit: 'kN/m',
    label: 'Quer — in Gleisrichtung',
    hinweis: 'Trägt den Winddruck und den Leiterzug in den Masten.' },
  { key: 'z', sym: 'K_Z', art: 'kraft', einheit: 'kN/m',
    label: 'Lotrecht',
    hinweis: 'Trägt Eigengewicht und Schnee ab.' },
  { key: 'xx', sym: 'K_XX', art: 'moment', einheit: 'kNm/rad',
    label: 'Torsion um die Jochachse',
    hinweis: 'Zwei Anschlüsse im Abstand der Jochhöhe halten die Torsion '
           + 'schon über ihr Kräftepaar — hier gehalten wäre sie doppelt.' },
  { key: 'yy', sym: 'K_YY', art: 'moment', einheit: 'kNm/rad',
    label: 'Biegung um die Querachse',
    hinweis: 'Die teilweise Einspannung entsteht aus dem Kräftepaar der '
           + 'beiden Gurtebenen, nicht aus dieser Feder.' },
  { key: 'zz', sym: 'K_ZZ', art: 'moment', einheit: 'kNm/rad',
    label: 'Biegung um die Hochachse',
    hinweis: 'Wie K_YY: aus dem Kräftepaar, nicht aus der Feder.' },
];

/**
 * DIE GURTEBENEN EINER TRAGWERKSART.
 *
 * Das Tragjoch hat zwei Ebenen UEBEREINANDER - Ober- und Untergurt, je zwei
 * Winkel. Das Abfangjoch hat zwei Gurte NEBENEINANDER; sein Kraeftepaar
 * steht waagrecht, und «oben/unten» gibt es dort nicht.
 */
export const LINK_EBENEN = {
  joch: [{ key: 'OG', label: 'Obergurte', achse: 'z' },
         { key: 'UG', label: 'Untergurte', achse: 'z' }],
  tragausleger: [{ key: 'OG', label: 'Obergurte', achse: 'z' },
                 { key: 'UG', label: 'Untergurte', achse: 'z' }],
  /*
   * `achse` sagt, WORIN die beiden Ebenen auseinanderliegen: beim Tragjoch
   * in z (uebereinander), beim Abfangjoch in y (nebeneinander). Daran haengt,
   * welche Drehung ihr Kraeftepaar sperrt - und damit, welcher
   * Freiheitsgrad loslassen muss, damit ein Gelenk eines wird.
   */
  abfangjoch: [{ key: 'V', label: 'Gurt vorn', achse: 'y' },
               { key: 'H', label: 'Gurt hinten', achse: 'y' }],
};

/* ===========================================================================
 * DIE EINSPANNUNG FOLGT AUS DEN WEGFEDERN
 * ===========================================================================
 *
 * Weisung vom 5. September, als Frage gestellt: «die drehfeder ergibt sich
 * aus den angaben zu den einfachen federn, man koennte diese auch weglassen,
 * was denkst du? man koennte diese anzeige auch dazu nutzen, damit man sieht
 * welche einspannung im modell wirkt bei der eingabe der obigen einfachen
 * wegfeder.»
 *
 * >>> JA - UND ZWAR AUS ZWEI GRUENDEN. <<<
 *
 * ERSTENS ist die Drehfeder am Linkelement hier wirkungslos. Der Anschluss
 * besteht aus ZWEI Punkten im Abstand der Jochhoehe; ihre beiden Wegfedern
 * bilden ein Kraeftepaar, und das ist die Einspannung. Eine Drehfeder am
 * einzelnen Punkt kaeme daneben und beschriebe eine Steifigkeit, die das
 * Bauteil nicht hat - der Anschluss ist eine Schraubverbindung, kein
 * eingespanntes Ende.
 *
 * ZWEITENS ist sie in jedem gemessenen Modell FREI. Die Ausschnitte aus
 * AxisVM zeigen K_XX = K_YY = K_ZZ = 0 an beiden Ebenen, und der Aufbau des
 * Werkzeugs setzt sie seit je so.
 *
 * >>> WAS AN IHRE STELLE TRITT. <<<
 *
 * Die WIRKSAME Drehsteifigkeit, gerechnet aus dem, was dasteht:
 *
 *      c_phi = k_OG · k_UG / (k_OG + k_UG) · h²      [kNm/rad]
 *
 * Zwei Federn in Reihe ueber den Hebelarm h. Ist eine von beiden starr,
 * bleibt die andere; sind beide starr, ist der Anschluss eingespannt; ist
 * eine frei, ist er ein Gelenk. Genau das soll man beim Eintippen sehen.
 *
 * >>> WELCHE RICHTUNG. <<<
 *
 * Die Ebenen liegen in z (Tragjoch) oder in y (Abfangjoch) auseinander, und
 * die Feder, die das Paar bildet, ist die in der JOCHACHSE - dieselbe, die
 * `linkGelenk` benennt. Der Hebelarm ist ihr Abstand.
 *
 * @param {object} inp    Eingabesatz
 * @param {string} art    Tragwerksart
 * @param {number} h      Abstand der beiden Ebenen [m]
 * @returns {{cPhi:number|null, art:string, k:number[], h:number}}
 *          cPhi null heisst: unendlich, also eingespannt
 */
export function linkEinspannung(inp, art, h) {
  const g = linkGelenk(art);
  const eb = linkEbenen(art);
  const k = eb.map((e) => linkBedingung(inp, art, e.key)[g.gibtFrei]);
  const hebel = Number(h) || 0;
  if (k.some((v) => v === 'Free')) {
    return { cPhi: 0, art: 'gelenk', k, h: hebel, um: g.sperrt };
  }
  if (k.every((v) => v === 'Rigid')) {
    return { cPhi: null, art: 'eingespannt', k, h: hebel, um: g.sperrt };
  }
  // Mindestens eine Feder mit Zahl: Reihenschaltung ueber den Hebelarm.
  const z = k.map((v) => (v === 'Rigid' ? Infinity : Number(v)));
  const reihe = 1 / (1 / z[0] + 1 / z[1]);
  return { cPhi: reihe * hebel * hebel, art: 'feder', k, h: hebel,
           um: g.sperrt };
}

/**
 * Welche Drehung das Kraeftepaar der beiden Ebenen sperrt - und welcher
 * Freiheitsgrad sie freigibt.
 *
 *   Ebenen in z (Tragjoch)     Paar sperrt φ_y   ->   x muss loslassen
 *   Ebenen in y (Abfangjoch)   Paar sperrt φ_z   ->   x muss loslassen
 *
 * In beiden Faellen ist es x - die Jochachse. Das ist kein Zufall: die
 * Ebenen liegen quer zur Traegerachse, und eine Drehung um ihre
 * Verbindungslinie verschiebt sie laengs.
 */
export function linkGelenk(art) {
  const achse = (LINK_EBENEN[art] ?? LINK_EBENEN.joch)[0]?.achse ?? 'z';
  return { paarAchse: achse, sperrt: achse === 'z' ? 'yy' : 'zz', gibtFrei: 'x' };
}

/** Die Ebenen, die eine Tragwerksart führt. */
export const linkEbenen = (art) => LINK_EBENEN[art] ?? LINK_EBENEN.joch;

/*
 * DIE VORGABE - so, wie die Ausschnitte es zeigen.
 *
 * TRAGJOCH: Untergurt fest, Obergurt laengs frei. Die beiden Ebenen liegen
 * UEBEREINANDER; eine Verdrehung des Endes um y verschiebt sie gegenlaeufig
 * in x. Beide zu halten sperrt die Verdrehung - das Ende steht dann
 * eingespannt da, ohne dass es jemand eingestellt haette.
 *
 * >>> ABFANGJOCH: DASSELBE, UM NEUNZIG GRAD GEDREHT. <<<
 *
 * Weisung vom 5. September:
 *
 *   «bei den Abfangjochen wird man zudem noch die vorderen und hinteren
 *    auflager unterschiedlich einstellen koennen, da wir eine Drehfeder um
 *    die z achse als gelenk ausbilden wollen, um nicht die
 *    biegebeanspruchung in den masten als torsion zu uebertragen. der
 *    einzige torsionsanteil resultiert aus der exzentrizitaet des
 *    anschlusspunktes (mastachse / auflagerpunkt).»
 *
 * Seine beiden Gurte liegen NEBENEINANDER, in y - der Gleisrichtung. Eine
 * Drehung des Jochendes um z (lotrecht) verschiebt sie deshalb gegenlaeufig
 * in x, der Jochachse:
 *
 *      Punkt bei (0, ±e/2)   ->   Δx = ∓ φ_z · e/2
 *
 * >>> UND DARIN LIEGT DIE FALLE. <<<
 *
 * K_ZZ = 0 an beiden Links sieht nach einem Gelenk aus und ist keines:
 * halten BEIDE Gurte in x, sperrt ihr Kraeftepaar die Drehung um z trotzdem.
 * Das Biegemoment des Jochs in der waagrechten Ebene - aus dem Leiterzug -
 * laeuft dann als TORSION in den Masten.
 *
 * Das Gelenk entsteht erst, wenn EIN Gurt in x loslaesst. Dann bleibt als
 * Torsion nur, was aus der Exzentrizitaet zwischen Mastachse und
 * Auflagerpunkt folgt - genau das, was die Weisung stehen laesst.
 *
 * WELCHER der beiden loslaesst, ist eine Wahl und keine Ableitung: das Joch
 * ist zu seiner Achse symmetrisch. Vorgegeben ist der VORDERE; die Maske
 * laesst beide getrennt einstellen.
 */
const VOLL = { x: 'Rigid', y: 'Rigid', z: 'Rigid',
               xx: 'Free', yy: 'Free', zz: 'Free' };
const LAENGS_FREI = { ...VOLL, x: 'Free' };

export const LINK_VORGABEN = {
  joch: { OG: LAENGS_FREI, UG: VOLL },
  tragausleger: { OG: LAENGS_FREI, UG: VOLL },
  abfangjoch: { V: LAENGS_FREI, H: VOLL },
};

/**
 * Die Auflagerbedingung einer Gurtebene - Vorgabe oder gesetzter Wert.
 *
 * `inp.auflagerLinks` traegt, was in der Maske eingestellt ist:
 *
 *     { OG: { x: 'Free', y: 'Rigid', ... }, UG: { ... } }
 *
 * Ein Freiheitsgrad kann drei Dinge sein: 'Rigid', 'Free' oder eine ZAHL -
 * dann ist es eine Feder mit diesem Wert. Was nicht dasteht, kommt aus der
 * Vorgabe; eine halb gefuellte Eingabe soll nicht in eine halbe Lagerung
 * fallen.
 *
 * @param {object} inp   Eingabesatz
 * @param {string} art   Tragwerksart
 * @param {string} ebene 'OG' | 'UG' | 'V' | 'H'
 * @returns {{x,y,z,xx,yy,zz}} je 'Rigid' | 'Free' | number
 */
export function linkBedingung(inp, art, ebene) {
  const vorgabe = linkVorgabe(inp, art, ebene);
  const gesetzt = inp?.auflagerLinks?.[ebene] ?? null;
  if (!gesetzt) return { ...vorgabe };
  const o = {};
  LINK_GRADE.forEach(({ key, art: a }) => {
    // Die Drehungen sind keine Eingabe mehr - siehe LINK_DREH_FREI.
    if (a === 'moment') { o[key] = 'Free'; return; }
    const v = gesetzt[key];
    o[key] = (v === 'Rigid' || v === 'Free' || Number.isFinite(v))
      ? v : vorgabe[key];
  });
  return o;
}

/**
 * >>> DIE VORGABE STEHT UNTER OPTIONEN. <<<
 *
 * Weisung vom 5. September: «Die Voreinstellung der Auflagerbedingungen
 * sollte noch unter optionen aufgefuehrt sein und anpassbar.»
 *
 * Drei Stufen, von aussen nach innen:
 *
 *   1  was am TRAGWERK eingestellt ist   `auflagerLinks`
 *   2  was unter OPTIONEN steht          `auflagerVorgabe`
 *   3  was eingebaut ist                 `LINK_VORGABEN`
 *
 * Stufe 2 ist neu. Wer im Haus immer denselben Anschluss baut, setzt ihn
 * dort einmal - und jedes neue Tragwerk startet damit, ohne dass jemand
 * eine Zeile Quelltext aendert. Was am einzelnen Tragwerk davon abweicht,
 * bleibt am Tragwerk.
 */
/* ===========================================================================
 * DIE DREHFEDERN AM LINKELEMENT SIND KEINE EINGABE
 * ===========================================================================
 *
 * Weisung vom 9. September, als Frage: «macht es sinn die drehsteifigkeit
 * hier noch eingeben zu koennen, die einzelnen gurte sind gelenkig gelagert?
 * welche auswirkung hat es?» - Entschieden: ganz raus, fest auf frei.
 *
 * >>> AM BAUTEIL. <<<
 *
 * Der Gurtanschluss ist eine Schraubverbindung an EINEM Punkt. Er nimmt kein
 * Moment auf; die Einspannung des Jochendes entsteht aus dem KRAEFTEPAAR der
 * beiden Anschluesse im Abstand h. Eine Drehfeder am einzelnen Link
 * beschreibt eine Steifigkeit, die die Verbindung nicht hat - und sie kommt
 * zum Kraeftepaar HINZU, spannt das Ende also doppelt ein.
 *
 * >>> WAS SIE ANRICHTETE. <<<
 *
 * Im Modell wirkte sie voll: `linkBedingung` reichte alle sechs Grade an die
 * Ausleitung durch, AxisVM rechnete damit. Steifer gerechnet heisst
 * groesseres Stuetzmoment - und am verjuengten Jochende ist genau das die
 * UNSICHERE Seite, weil dort dem Moment nur der kleine Hebelarm
 * gegenuebersteht.
 *
 * In der Anzeige und im Nachweis wirkte sie dagegen gar nicht:
 * `linkEinspannung` liest nur die Wegfeder in der Jochachse. Gemessen:
 *
 *     K_YY = Free     angezeigt: eingespannt   ins Modell: Free
 *     K_YY = 50000    angezeigt: eingespannt   ins Modell: 50000
 *
 * Anwendung und AxisVM rechneten dann VERSCHIEDENE Systeme, und man sah es
 * keiner der beiden Zahlen an. Das ist der eigentliche Grund: nicht dass die
 * Eingabe nichts taete, sondern dass sie an einer Stelle etwas tat und an
 * der anderen nicht.
 *
 * >>> UND DIE MESSUNG SAGT DASSELBE. <<<
 *
 * In jedem vermessenen Modell stehen sie auf null - die Ausschnitte aus
 * AxisVM zeigen K_XX = K_YY = K_ZZ = 0 an beiden Ebenen.
 *
 * `linkBedingung` und `linkVorgabe` geben sie deshalb IMMER frei, auch wenn
 * ein alter Stand eine Zahl mitbringt. Die Grade bleiben in LINK_GRADE
 * stehen: die Ausleitung schreibt sechs Werte, und der sechste heisst dann
 * eben 0.
 */
export const LINK_DREH_FREI = true;

export function linkVorgabe(inp, art, ebene) {
  const eingebaut = (LINK_VORGABEN[art] ?? LINK_VORGABEN.joch)[ebene] ?? VOLL;
  const ausOptionen = inp?.auflagerVorgabe?.[art]?.[ebene]
                   ?? inp?.auflagerVorgabe?.[ebene] ?? null;
  if (!ausOptionen) return { ...eingebaut };
  const o = {};
  LINK_GRADE.forEach(({ key, art: a }) => {
    if (a === 'moment') { o[key] = 'Free'; return; }
    const v = ausOptionen[key];
    o[key] = (v === 'Rigid' || v === 'Free' || Number.isFinite(v))
      ? v : eingebaut[key];
  });
  return o;
}

/** Weicht die Einstellung von der Vorgabe ab? Fuer den Hinweis in der Maske. */
export function linkAbweichend(inp, art) {
  return linkEbenen(art).some(({ key }) => {
    const ist = linkBedingung(inp, art, key);
    const soll = linkVorgabe(inp, art, key);
    return LINK_GRADE.some(({ key: g }) => ist[g] !== soll[g]);
  });
}

/* ===========================================================================
 * IST DAS SYSTEM UEBERHAUPT GEHALTEN?
 * ===========================================================================
 *
 * Weisung vom 9. September: «zudem noch warnung wenn system labil gelagert».
 *
 * >>> WARUM DAS NOETIG IST. <<<
 *
 * Jeder einzelne Freiheitsgrad hier ist eine sinnvolle Eingabe - der
 * Obergurt laesst laengs los, der vordere Gurt gibt die Torsion frei -, und
 * jeder fuer sich sieht harmlos aus. LABIL wird das System erst aus der
 * SUMME: gibt keine Ebene mehr in y, steht das Joch in Gleisrichtung auf
 * nichts. Das sieht man den sechs Schaltern nicht an, und ein
 * Stabwerksprogramm meldet es erst beim Rechnen - mit einer Fehlermeldung
 * ueber eine singulaere Matrix, aus der niemand liest, WELCHE Bewegung frei
 * geblieben ist.
 *
 * >>> WIE GERECHNET WIRD. <<<
 *
 * Das Joch ist ein STARRKOERPER mit sechs Freiheitsgraden; der Mast ist der
 * Boden. Jede gehaltene Richtung an jedem Anschlusspunkt ist eine
 * Bedingungsgleichung an diese sechs:
 *
 *      u_P = u + phi × r        (Verschiebung eines Punktes im Abstand r)
 *
 *      Halt in x   [ 1  0  0    0   r_z  -r_y ]
 *      Halt in y   [ 0  1  0  -r_z   0    r_x ]
 *      Halt in z   [ 0  0  1   r_y  -r_x   0  ]
 *      Halt um x   [ 0  0  0    1    0     0  ]   (und entsprechend y, z)
 *
 * Der RANG dieser Matrix sagt, wie viele der sechs Bewegungen gesperrt sind.
 * Rang 6 heisst gehalten; jede fehlende Einheit ist eine Bewegung, die das
 * Joch als Ganzes ausfuehren kann, ohne dass eine Feder sich dehnt. Der
 * NULLRAUM sagt WELCHE - und genau das ist der Satz, den die Warnung
 * braucht.
 *
 * >>> WARUM OHNE MASSE. <<<
 *
 * Gerechnet wird mit normierten Abstaenden (Stuetzweite 1, Ebenenabstand 1).
 * Der Rang haengt nicht von den Betraegen ab, nur davon, ob die Punkte
 * auseinanderliegen - und das tun sie immer. Die Pruefung braucht deshalb
 * keine Geometrie und gilt fuer jedes Joch gleich.
 *
 * >>> WAS SIE NICHT IST. <<<
 *
 * Kein Nachweis. Sie prueft die KINEMATIK der Lagerung, nicht ihre
 * Steifigkeit: eine sehr weiche Feder haelt hier als «gehalten», auch wenn
 * das System praktisch nachgiebig ist. Und sie sieht nur die Linkelemente -
 * der Ersatzbalken des Rechenkerns traegt seine eigene Drehfeder.
 */

/** Haelt dieser Freiheitsgrad? Eine Feder haelt, eine Feder mit 0 nicht. */
const linkHaelt = (v) => v === 'Rigid' || (Number.isFinite(v) && v > 0);

/** Die sechs Bewegungen, in der Reihenfolge der Spalten. */
const LABIL_NAMEN = {
  x: 'in der Jochachse x (quer zum Gleis)',
  y: 'in Gleisrichtung y',
  z: 'lotrecht (z)',
  xx: 'um die Jochachse x — Torsion',
  yy: 'um die Querachse y — Vertikalbiegung',
  zz: 'um die Hochachse z — Biegung im Grundriss',
};

/**
 * Die Bedingungsmatrix auf Zeilenstufenform bringen; Rang und Nullraum.
 *
 * Gauss-Jordan mit Spaltenpivotierung, sechs Spalten - klein genug, dass
 * eine Bibliothek mehr Aufwand waere als die zwanzig Zeilen hier.
 */
function nullraum6(zeilen) {
  const N = 6;
  const A = zeilen.map((r) => r.slice());
  const pivotSpalten = [];
  let r = 0;
  for (let c = 0; c < N && r < A.length; c += 1) {
    let best = r;
    for (let i = r; i < A.length; i += 1) {
      if (Math.abs(A[i][c]) > Math.abs(A[best][c])) best = i;
    }
    if (Math.abs(A[best][c]) < 1e-9) continue;
    [A[r], A[best]] = [A[best], A[r]];
    const p = A[r][c];
    for (let j = 0; j < N; j += 1) A[r][j] /= p;
    for (let i = 0; i < A.length; i += 1) {
      if (i === r || Math.abs(A[i][c]) < 1e-12) continue;
      const f = A[i][c];
      for (let j = 0; j < N; j += 1) A[i][j] -= f * A[r][j];
    }
    pivotSpalten.push(c);
    r += 1;
  }
  const frei = [];
  for (let c = 0; c < N; c += 1) if (!pivotSpalten.includes(c)) frei.push(c);
  // Je freie Spalte ein Basisvektor des Nullraums.
  const basis = frei.map((fc) => {
    const v = new Array(N).fill(0);
    v[fc] = 1;
    pivotSpalten.forEach((pc, i) => { v[pc] = -A[i][fc]; });
    return v;
  });
  return { rang: pivotSpalten.length, basis };
}

/**
 * Ist die Lagerung kinematisch ausreichend?
 *
 * @param {object} inp  Eingabesatz
 * @param {string} art  Tragwerksart
 * @param {object} opt  { einPunkt, lies } - `lies(ebene)` liefert die
 *                      Bedingung; ohne Angabe `linkBedingung`.
 * @returns {{labil:boolean, rang:number, fehlend:number,
 *           moden:{achse:string, art:string, text:string}[]}}
 */
export function linkLabilitaet(inp, art, opt = {}) {
  const eb = linkEbenen(art);
  const g = linkGelenk(art);
  const lies = opt.lies ?? ((ebene) => linkBedingung(inp, art, ebene));
  // Bei einem Punktanschluss traegt nur die letzte Ebene - so, wie das Bild
  // es zeigt.
  const ebenen = opt.einPunkt ? eb.slice(-1) : eb;

  const zeilen = [];
  ebenen.forEach((e) => {
    const b = lies(e.key);
    /*
     * Die beiden Ebenen liegen in `paarAchse` auseinander, die beiden Enden
     * in x. Vier Punkte, an beiden Enden dieselbe Bedingung - so steht es
     * in der Ausleitung (export.axisvm.js, Linkelemente je Gurtebene).
     */
    const versatz = eb.indexOf(e) === 0 ? 0.5 : -0.5;
    [-0.5, 0.5].forEach((xE) => {
      const rV = { x: xE, y: 0, z: 0 };
      rV[g.paarAchse] = versatz;
      if (linkHaelt(b.x)) zeilen.push([1, 0, 0, 0, rV.z, -rV.y]);
      if (linkHaelt(b.y)) zeilen.push([0, 1, 0, -rV.z, 0, rV.x]);
      if (linkHaelt(b.z)) zeilen.push([0, 0, 1, rV.y, -rV.x, 0]);
      if (linkHaelt(b.xx)) zeilen.push([0, 0, 0, 1, 0, 0]);
      if (linkHaelt(b.yy)) zeilen.push([0, 0, 0, 0, 1, 0]);
      if (linkHaelt(b.zz)) zeilen.push([0, 0, 0, 0, 0, 1]);
    });
  });

  const { rang, basis } = nullraum6(zeilen);
  const schluessel = ['x', 'y', 'z', 'xx', 'yy', 'zz'];
  const moden = basis.map((v) => {
    /*
     * Der groesste Anteil benennt die Bewegung. Eine DREHUNG zaehlt vor
     * einer Verschiebung: eine Drehung um einen entfernten Punkt traegt
     * immer auch Verschiebungsanteile, umgekehrt nicht.
     */
    const dreh = [3, 4, 5].reduce((a, i) =>
      (Math.abs(v[i]) > Math.abs(v[a]) ? i : a), 3);
    const schieb = [0, 1, 2].reduce((a, i) =>
      (Math.abs(v[i]) > Math.abs(v[a]) ? i : a), 0);
    const i = Math.abs(v[dreh]) > 1e-9 ? dreh : schieb;
    const k = schluessel[i];
    return { achse: k, art: i >= 3 ? 'drehung' : 'verschiebung',
             text: LABIL_NAMEN[k] };
  });
  return { labil: rang < 6, rang, fehlend: 6 - rang, moden };
}

/*
 * >>> DER MAST DARF EINWAERTS STEHEN - UND DURFTE ES SCHON. <<<
 *
 * Weisung vom 5. September: «als offsett habe ich den versatz des masten zum
 * jochende hin gemeint. die auflagerpunkte blieben bis jetzt immer an den
 * gurtenden, so koennen sie nun auch innerhalb des endfeldstaebe liegen.»
 *
 * Das Mass traegt `kragA` / `kragB` - «Abstand der Mastachse vom Gurtende,
 * Stuetzweite = L - kragA - kragB». `mastAchse` oben liest es, der
 * Ersatzbalken rechnet damit, und die Ausleitung setzt seit dem
 * 1. September einen FESTEN Schnitt auf die Mastachse, damit die
 * Starrkoerper nicht zwischen zwei Gurtstaeben haengen.
 *
 * Hier stand kurzzeitig ein zweites Feld `mastVersatz`. Es ist wieder weg:
 * eine Laenge, die an zwei Orten steht, steht bald an zwei Orten
 * verschieden.
 */
