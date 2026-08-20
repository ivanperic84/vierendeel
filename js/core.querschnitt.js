/**
 * core.querschnitt.js
 * ---------------------------------------------------------------------------
 * RECHENKERN: Aufteilung der Schnittgrössen auf die vier Eckwinkel und die
 * vier Bindeblechebenen. Reine Funktionen, kein DOM.
 *
 * TORSION - SCHUBFLUSS
 * --------------------
 * Das Joch ist ein geschlossener Kasten: vier Ebenen (zwei vertikale
 * Seitenflächen, zwei horizontale Ober-/Unterflächen), jede über Bindebleche
 * zu einem Vierendeel-Rahmen geschlossen. Ein Torsionsmoment T läuft deshalb
 * als umlaufender SCHUBFLUSS nach Bredt:
 *
 *      q_T = T / (2 * A_m)        mit  A_m = b * h  (umschlossene Fläche)
 *
 * Daraus die Querkraft je Ebene:
 *      Vertikalebene   V_T = q_T * h = T / (2b)
 *      Horizontalebene V_T = q_T * b = T / (2h)
 *
 * Kontrolle: die beiden Wände einer Richtung bilden ein Kräftepaar, sein
 * Moment ist Kraft mal Hebelarm (nicht zweimal):
 *      V_vert * b  +  V_horiz * h  =  T/2 + T/2  =  T
 * Der Schubfluss trägt sich also je zur Hälfte über die vertikalen und die
 * horizontalen Ebenen ab und wird dort mit der Querkraft aus Eigengewicht,
 * Schnee und Wind ÜBERLAGERT.
 *
 * Alternativ lässt sich die konservative Annahme des ursprünglichen
 * Auftrags rechnen ('nurVertikal'): die gesamte Torsion wird als Kräftepaar
 * allein den beiden Vertikalebenen zugewiesen, V_T = T / b. Das ist doppelt
 * so gross wie der Schubflussanteil und vernachlässigt die Mitwirkung der
 * Horizontalebenen.
 * ---------------------------------------------------------------------------
 */

import { U, RECHTECK } from './core.constants.js';
import { lokaleQuerkraft } from './core.anbauteile.js';
import { winkelwerteFuer, randspannung } from './core.winkel.js';

/**
 * WIE SICH DIE EBENENQUERKRAFT AUF DIE BEIDEN GURTE EINER EBENE VERTEILT.
 *
 * In einer Vertikalebene stehen ein OBER- und ein UNTERGURT nebeneinander -
 * bei den meisten Jochtypen mit VERSCHIEDENEN Profilen. Im Vierendeel-Rahmen
 * teilt sich die Querkraft dann nach der Biegesteifigkeit, nicht hälftig:
 * der steifere Gurt zieht Moment an sich.
 *
 * Der Vergleich mit einem AxisVM-Stabmodell (Signaljoch, L 100x100x10 oben,
 * L 80x80x8 unten, I-Verhältnis 2.45) zeigt es deutlich: hälftig gerechnet
 * wird der Obergurt um rund 30 % UNTERSCHÄTZT.
 *
 * Drei Wege:
 *   gleich        wie bisher, je die Hälfte
 *   steifigkeit   I_Gurt / ΣI - der Obergurt trifft damit auf wenige Prozent,
 *                 der Untergurt wird dafür bis 25 % zu klein
 *   huellend      je Gurt der ungünstigere der beiden - nie schlechter als
 *                 bisher und beim steiferen Gurt richtig
 *
 * In den HORIZONTALEBENEN stehen zwei GLEICHE Gurte nebeneinander; dort ist
 * hälftig immer richtig und die Einstellung ohne Wirkung.
 */
export const GURTAUFTEILUNGEN = [
  { key: 'huellend', label: 'einhüllend – je Gurt der ungünstigere Anteil (empfohlen)' },
  { key: 'steifigkeit', label: 'nach Biegesteifigkeit I/ΣI' },
  { key: 'gleich', label: 'hälftig (bisheriges Verhalten)' },
];

/**
 * Anteil eines Gurtes an der Querkraft seiner VERTIKALEBENE.
 * @returns {{OG:number, UG:number}}
 */
export function gurtanteile(m, art = 'huellend') {
  if (art === 'gleich') return { OG: 0.5, UG: 0.5 };
  // Für die Rahmenbiegung in der Vertikalebene zählt das Trägheitsmoment um
  // die schenkelparallele Achse - dieselbe Achse, mit der auch der Nachweis
  // geführt wird (I = i_y² · A).
  const I = (p) => p.iy * p.iy * p.A;
  const iOG = I(m.profOG), iUG = I(m.profUG);
  const summe = iOG + iUG;
  if (!(summe > 0)) return { OG: 0.5, UG: 0.5 };
  const st = { OG: iOG / summe, UG: iUG / summe };
  if (art === 'steifigkeit') return st;
  return { OG: Math.max(0.5, st.OG), UG: Math.max(0.5, st.UG) };
}

/**
 * WIE DIE SPANNUNG IM WINKEL ERMITTELT WIRD.
 *
 * schenkel   σ = N/A + M_y/W_y + M_z/W_z, alle drei als Beträge addiert.
 *            Einfach und nachvollziehbar, aber ein Winkel hat seine
 *            Hauptachsen unter 45 Grad - die wirkliche Randspannung ist bei
 *            schenkelparalleler Biegung rund 30 % grösser.
 *
 * punkte     Schiefe Biegung, ausgewertet an den sechs Eckpunkten des
 *            Winkels (core.winkel.js). Das ist, was ein Stabwerksprogramm
 *            führt - und was der Vergleich mit AxisVM verlangt.
 *
 * WARUM «schenkel» TROTZDEM DIE VORGABE BLEIBT
 * Der Faktor 1.30 ist echt - aber er allein macht den Vergleich mit einem
 * Stabmodell SCHLECHTER, nicht besser. Am Signaljoch:
 *
 *      einhüllend / schenkel     mittlere Abweichung 12 %
 *      einhüllend / punkte       mittlere Abweichung 30 %
 *
 * Der Grund: das örtliche Gurtmoment des Ersatzbalkens ist seinerseits zu
 * gross, und die beiden Fehler heben sich in der bisherigen Form teilweise
 * auf. Wer nur einen davon behebt, verschlechtert die Summe. «punkte» ist
 * die richtige Spannungsermittlung und steht bereit - sie wird erst dann zur
 * Vorgabe, wenn das Momentenmodell gegen ein Rahmenmodell nachgeführt ist.
 */
export const SPANNUNGSMODELLE = [
  { key: 'schenkel', label: 'über W schenkelparallel (Vorgabe, an AxisVM abgeglichen)' },
  { key: 'punkte', label: 'an den Querschnittspunkten – schiefe Biegung, Faktor ≈ 1.30' },
];

export const TORSIONSVERTEILUNGEN = [
  { key: 'schubfluss', label: 'Schubfluss im geschlossenen Kasten (Bredt)' },
  { key: 'nurVertikal', label: 'ganze Torsion in die Vertikalebenen (konservativ)' },
];

/** Die vier Eckwinkel: Gurt (OG/UG) und Seite (L/R). */
export const ECKEN = [
  { id: 'OG_L', gurt: 'OG', seite: 'L', label: 'Obergurt links' },
  { id: 'OG_R', gurt: 'OG', seite: 'R', label: 'Obergurt rechts' },
  { id: 'UG_L', gurt: 'UG', seite: 'L', label: 'Untergurt links' },
  { id: 'UG_R', gurt: 'UG', seite: 'R', label: 'Untergurt rechts' },
];

export const EBENEN_UEBERLAGERUNG = [
  { key: 'huellkurve',
    label: 'Hüllkurve – jede Ebene mit dem ungünstigsten Wert' },
  { key: 'vorzeichen',
    label: 'vorzeichenrichtig – Schubfluss addiert auf einer Seite, zieht auf der anderen ab' },
];

/**
 * Die vier Bindeblechebenen.
 *
 * `vorz` ist der DREHSINN DES SCHUBFLUSSES auf dieser Ebene, hergeleitet aus
 * der Rechtsschraube um +x (y nach z):
 *
 *      T_x > 0  ->  rechte Wand +z · Oberseite −y · linke Wand −z · Unterseite +y
 *
 * Für die Vertikalebenen zählt die z-Richtung (dort liegt auch V_z), für die
 * Horizontalebenen die y-Richtung (dort liegt V_y). Daraus:
 *
 *      V_V_R = V_z/2 + q_T·h        V_V_L = V_z/2 − q_T·h
 *      V_H_U = V_y/2 + q_T·b        V_H_O = V_y/2 − q_T·b
 *
 * Anschaulich: eine Kraft in y, die UNTERHALB der Jochachse angreift - eine
 * Hängestütze -, erzeugt T > 0; ihr Schubfluss läuft unten in derselben
 * Richtung wie die Balkenquerkraft und oben dagegen. Die untere Ebene ist
 * dann die stärker beanspruchte. Bei einem Aufsatz über dem Joch dreht sich
 * beides um. Genau diesen Unterschied zeigt ein FEM-Modell.
 *
 * Derselbe Wert steuert die Richtung der Pfeile im Modellfenster.
 */
export const EBENEN = [
  { id: 'V_L', art: 'vertikal', vorz: +1, label: 'Vertikalebene links' },
  { id: 'V_R', art: 'vertikal', vorz: -1, label: 'Vertikalebene rechts' },
  { id: 'H_O', art: 'horizontal', vorz: +1, label: 'Horizontalebene oben' },
  { id: 'H_U', art: 'horizontal', vorz: -1, label: 'Horizontalebene unten' },
];

/**
 * Querkraftanteil je Ebene aus Torsion.
 * @returns {{qT:number, vertikal:number, horizontal:number}}
 *          qT [kN/m], vertikal/horizontal [kN] je Ebene
 */
export function torsionsSchubfluss(Tx, b, h, modell = 'schubfluss') {
  const T = Math.abs(Tx);
  if (modell === 'nurVertikal') {
    return { qT: T / (2 * b * h), vertikal: T / b, horizontal: 0, modell };
  }
  const qT = T / (2 * b * h);
  return { qT, vertikal: qT * h, horizontal: qT * b, modell };
}

/**
 * Querkraft je Ebene: Anteil aus der Balkenquerkraft plus Torsionsanteil.
 *
 * ZWEI WEGE, siehe EBENEN_UEBERLAGERUNG:
 *
 * 'huellkurve' (bisher, Vorgabe)
 *      max = |V_Balken|/2 + |V_Torsion| + |V_lokal|
 *      und dieser eine Wert gilt für BEIDE Ebenen einer Richtung. Nie
 *      unsicher, aber die günstigere Ebene wird überschätzt - Ober- und
 *      Unterblech bekommen unvermeidlich dasselbe η.
 *
 * 'vorzeichen'
 *      Der Schubfluss läuft um: er addiert sich auf der Ebene, zu der die
 *      Last exzentrisch sitzt, und zieht auf der gegenüberliegenden ab
 *      (Herleitung bei EBENEN). Das ist, was ein FEM-Modell zeigt.
 *
 * DER ÖRTLICHE ANTEIL BLEIBT IN BEIDEN WEGEN ADDITIV.
 * Er stammt aus der Lasteinleitung der Anbauteile und wird bewusst zur
 * Ebenenquerkraft addiert, statt gegen den St-Venant-Schubfluss abgeglichen
 * zu werden (siehe lokaleQuerkraft in core.anbauteile.js). Diesen Abgleich
 * vorzeichenrichtig zu führen ist eine eigene Frage; solange sie offen ist,
 * bleibt der Anteil auf der sicheren Seite.
 *
 * Ohne Drehsinn kein Vorzeichen: die Torsions-Hüllkurve summiert Beträge, dort
 * fällt der Weg 'vorzeichen' auf 'huellkurve' zurück.
 */
export function ebenenQuerkraefte(sg, m, x = null) {
  const sf = torsionsSchubfluss(sg.Tx, m.b, m.h, m.torsionsverteilung);
  const vzHalb = Math.abs(sg.Vz) / 2;
  const vyHalb = Math.abs(sg.Vy) / 2;

  // Örtliche Zusatzkraft aus der Lasteinleitung der Anbauteile. Sie hängt
  // davon ab, an wie vielen Gurten ein Teil angeschlagen ist (siehe
  // core.anbauteile.js) und verteilt sich nach Hebelarm auf die beiden
  // benachbarten Blechstationen.
  const stationen = m.stationsX
    ?? (m.stationsListe ? m.stationsListe.map((s) => s.x) : null);
  const oertlich = (ebene) => (x === null || !m.lokal?.length
    ? 0 : lokaleQuerkraft(m.lokal, x, ebene, stationen));
  const lokV = oertlich('vertikal');
  const lokH = oertlich('horizontal');

  // Vorzeichenrichtig nur, wenn beides da ist: der Wunsch und ein Drehsinn.
  const drehsinn = Number.isFinite(sg.TxVz) ? Math.sign(sg.TxVz) : 0;
  const vorzeichentreu = m.ebenenUeberlagerung === 'vorzeichen' && drehsinn !== 0;

  const jeEbene = {};
  EBENEN.forEach((e) => {
    const istV = e.art === 'vertikal';
    const torsion = istV ? sf.vertikal : sf.horizontal;
    const lokal = istV ? lokV : lokH;
    // BEIDE Anteile mit Vorzeichen, sonst stimmt ihr Verhältnis nicht.
    //
    // Das war der Fallstrick: Querkraft UND Torsion wechseln am Lastangriff
    // das Vorzeichen (beide laufen von dort zu den Auflagern). Nimmt man die
    // Querkraft als Betrag und die Torsion vorzeichenbehaftet, springt die
    // massgebende Ebene am Anbauteil auf die andere Seite - im Stabmodell
    // tut sie das nicht. Mit beiden Vorzeichen ist das Ergebnis wieder
    // symmetrisch, wie es sein muss.
    const balkenVz = istV ? (sg.Vz ?? 0) / 2 : (sg.Vy ?? 0) / 2;
    const balken = istV ? vzHalb : vyHalb;
    const V_Ebene = vorzeichentreu
      ? Math.abs(balkenVz + drehsinn * e.vorz * torsion) + lokal
      : balken + torsion + lokal;
    jeEbene[e.id] = { anteilBalken: balken, anteilTorsion: torsion,
                      anteilLokal: lokal, vorzeichentreu,
                      dreht: vorzeichentreu ? drehsinn * e.vorz : +1, V_Ebene };
  });

  return {
    schubfluss: sf, vorzeichentreu, drehsinn, jeEbene,
    vertikal: { anteilBalken: vzHalb, anteilTorsion: sf.vertikal, anteilLokal: lokV,
                max: vzHalb + sf.vertikal + lokV,
                min: Math.abs(vzHalb - sf.vertikal) },
    horizontal: { anteilBalken: vyHalb, anteilTorsion: sf.horizontal, anteilLokal: lokH,
                  max: vyHalb + sf.horizontal + lokH,
                  min: Math.abs(vyHalb - sf.horizontal) },
  };
}

/**
 * Normalkräfte der vier Eckwinkel.
 *
 * Hauptbiegung M_y: Kräftepaar Obergurt/Untergurt im Abstand h. Die Gurtkraft
 * ist M_y/h unabhängig vom Flächenverhältnis (reines Kräftepaar), je Winkel
 * also M_y/(2h). Vorzeichen: M_y positiv (Feldmoment) -> Obergurt Druck.
 *
 * Windbiegung M_z: Kräftepaar der beiden Vertikalebenen im Abstand b. Die
 * Kraft M_z/b einer Ebene teilt sich flächenproportional auf ihre beiden
 * Winkel auf; bei gleichen Profilen ergibt das wieder M_z/(2b).
 */
export function eckNormalkraefte(sg, m) {
  const N_My = sg.My / (2 * m.h);
  const Asum = m.profOG.A + m.profUG.A;
  const anteil = { OG: m.profOG.A / Asum, UG: m.profUG.A / Asum };
  // Normalkraft in Jochachse: flächenproportional auf alle vier Winkel.
  const Agesamt = 2 * m.profOG.A + 2 * m.profUG.A;

  return ECKEN.map((e) => {
    const nMy = e.gurt === 'OG' ? -N_My : +N_My;          // Feldmoment: OG Druck
    const nMz = (e.seite === 'R' ? -1 : +1) * (sg.Mz / m.b) * anteil[e.gurt];
    const p = e.gurt === 'OG' ? m.profOG : m.profUG;
    const nAx = ((sg.Nx ?? 0) * p.A) / Agesamt;
    return { ...e, N_My: nMy, N_Mz: nMz, N_ax: nAx, N: nMy + nMz + nAx };
  });
}

/**
 * Weiten der beiden Felder, die an eine Station grenzen.
 *
 * Die Blecheinteilung der Mass-Tabelle ist NICHT gleichmässig: beim J70 über
 * 10 m sind die äusseren Felder 0.75 m breit, die inneren 0.66-0.67 m. Mit
 * der mittleren Feldweite gerechnet, fällt das Blechmoment an den breiten
 * Feldern rund 6 % zu klein aus - auf der unsicheren Seite.
 *
 * Am Jochende grenzt nur EIN Feld an; die fehlende Seite zählt als 0.
 *
 * @returns {{links:number, rechts:number, summe:number, max:number}|null}
 *          null, wenn die Stationen unbekannt sind (dann gilt die mittlere
 *          Feldweite wie bisher)
 */
export function nachbarfeldweiten(m, x) {
  const xs = m.stationsX ?? m.stationsListe?.map((s) => s.x);
  if (!xs?.length || x === null || x === undefined) return null;
  const i = xs.findIndex((v) => Math.abs(v - x) < 1e-6);
  if (i < 0) return null;
  const links = i > 0 ? xs[i] - xs[i - 1] : 0;
  const rechts = i < xs.length - 1 ? xs[i + 1] - xs[i] : 0;
  if (!(links > 0) && !(rechts > 0)) return null;
  return { links, rechts, summe: links + rechts, max: Math.max(links, rechts) };
}

/**
 * Vollständige Auswertung eines Schnitts: Kräfte und Spannungen für jeden
 * der vier Eckwinkel und jede der vier Bindeblechebenen.
 *
 * @param {object} sg Schnittgrössen an der Stelle (My, Vz, Mz, Vy, Tx)
 * @param {object} m  Modell
 * @param {object} bleche {vertikal, horizontal} Blechdaten an dieser Station
 */
export function schnittAuswertung(sg, m, bleche, nachbarfelder = 2, x = null) {
  const q = ebenenQuerkraefte(sg, m, x);
  const a1 = m.a1eff ?? m.a1;

  // ÖRTLICHE FELDWEITEN STATT DES MITTELS
  // Gurt: massgebend ist das BREITERE der beiden Nachbarfelder - dort ist sein
  // Endmoment am grössten.
  // Blech: es nimmt die Gurtmomente BEIDER angrenzender Felder auf, also die
  // SUMME der beiden Weiten. Bei gleich breiten Feldern ist das genau das
  // frühere n · a₁; am Jochende, wo nur ein Feld angrenzt, genau a₁.
  const felder = nachbarfeldweiten(m, x);
  const aGurt = felder ? felder.max : a1;
  const aBlech = felder ? felder.summe : nachbarfelder * a1;

  // Lokale Vierendeel-Momente im GURT: die Ebenenquerkraft teilt sich auf die
  // zwei Gurte der Ebene, Momentennullpunkt in Feldmitte, Hebelarm a1/2.
  //
  // STEIFER KNOTENBEREICH IM GURT
  // Am Knoten überlappt das Bindeblech den Gurtwinkel und ist mit ihm
  // verschweisst; über die Blechbreite b_Bl wirkt die Verbindung biegesteif.
  // Massgebend ist deshalb nicht das Moment auf der Knotenachse, sondern das
  // am ANSCHNITT des Blechs. Der Momentenverlauf im Gurt ist linear mit
  // Nullpunkt in Feldmitte, also
  //
  //      M_Anschnitt = M_Knoten · (a₁ − b_Bl) / a₁
  //
  // Das ist dieselbe Überlegung wie beim Blech (dort M_R = M_K · L_c/h) und
  // macht die Behandlung der Knoten symmetrisch: beide Stäbe werden am Rand
  // des starren Bereichs nachgewiesen, nicht auf ihrer Schwerachse.
  //
  // Die beiden Richtungen bekommen ihre eigene Blechbreite: M_y kommt aus den
  // Vertikalebenen, M_z aus den Horizontalebenen.
  const anschnitt = (blech) => {
    const bBl = blech?.breite ? blech.breite / U.m__mm : 0;
    return aGurt > 0 ? Math.max(0, Math.min(1, (aGurt - bBl) / aGurt)) : 1;
  };
  const fMy = anschnitt(bleche?.vertikal);
  const fMz = anschnitt(bleche?.horizontal);
  // AUFTEILUNG AUF DIE GURTE EINER EBENE, siehe GURTAUFTEILUNGEN.
  // In der Vertikalebene stehen OG und UG nebeneinander und teilen die
  // Querkraft nach Steifigkeit; in der Horizontalebene sind es zwei gleiche
  // Gurte, dort bleibt es hälftig.
  const anteil = gurtanteile(m, m.gurtaufteilung ?? 'huellend');
  const My_KnotenG = { OG: q.vertikal.max * anteil.OG * (aGurt / 2),
                       UG: q.vertikal.max * anteil.UG * (aGurt / 2) };
  // Für Anzeige und Rückwärtsvergleich: der bisherige hälftige Wert.
  const My_Knoten = (q.vertikal.max / 2) * (aGurt / 2);
  const Mz_Knoten = (q.horizontal.max / 2) * (aGurt / 2);
  const My_lokal = My_Knoten * fMy;
  const Mz_lokal = Mz_Knoten * fMz;
  const My_lokalG = { OG: My_KnotenG.OG * fMy, UG: My_KnotenG.UG * fMy };

  // --- Eckwinkel -----------------------------------------------------------
  const punkteModell = m.spannungsmodell === 'punkte';
  const ecken = eckNormalkraefte(sg, m).map((e) => {
    const p = e.gurt === 'OG' ? m.profOG : m.profUG;
    const myG = My_lokalG[e.gurt];
    const sig_N = (Math.abs(e.N) * U.kN_cm2__N_mm2) / p.A;
    // Die beiden Anteile über W bleiben stehen: sie sind die verständliche
    // Zerlegung, die in Tabelle und Bericht gezeigt wird. Massgebend ist
    // je nach Modell ihre Summe oder die Randspannung an den Eckpunkten.
    const sig_My = (myG * U.kNm_cm3__N_mm2) / p.Wy;
    const sig_Mz = (Mz_lokal * U.kNm_cm3__N_mm2) / p.Wz;
    let sig_v = sig_N + sig_My + sig_Mz;
    let punkt = null;
    if (punkteModell) {
      const r = randspannung(winkelwerteFuer(p), e.N, myG, Mz_lokal);
      sig_v = r.sig;
      punkt = r.punkt;
    }
    return {
      ...e, profil: p.name, A: p.A, Wy: p.Wy, Wz: p.Wz,
      art: e.N < 0 ? 'Druck' : 'Zug',
      My_lokal: myG, Mz_lokal, gurtanteil: anteil[e.gurt],
      sig_N, sig_My, sig_Mz, sig_v, randpunkt: punkt,
      spannungsmodell: punkteModell ? 'punkte' : 'schenkel',
      eta: sig_v / m.fyd,
    };
  });

  // --- Bindebleche ---------------------------------------------------------
  /**
   * Nachweis eines Bindeblechs.
   *
   * Am Rahmenknoten treffen die Gurtmomente der angrenzenden Felder zusammen;
   * das Blech muss ihre Summe aufnehmen:
   *      M_Blech = V_Ebene · Σa_Nachbarfelder / 4
   * Bei zwei gleich breiten Feldern ist das V·a1/2, am Rand die Hälfte. Die
   * Summe steht dort, wo früher n · a1 stand: die Mass-Tabelle teilt ungleich,
   * und das Mittel liegt an den breiten Feldern auf der unsicheren Seite.
   *
   * Das Blech selbst hat an beiden Enden dieses Moment (doppelte Krümmung,
   * Wendepunkt in Blechmitte). Aus seinem eigenen Gleichgewicht folgt
   *      V_Blech = 2 · M_Blech / Hebelarm
   * Das entspricht der Regel für gegliederte Stäbe nach EN 1993-1-1 Bild 6.11
   * (dort T = V·a/(2·h0) bei ZWEI Blechen je Knoten - hier liegt je Ebene nur
   * EIN Blech, also der doppelte Wert).
   *
   * Nachgewiesen wird das Blech am ANSCHNITT des Gurtes, nicht auf der
   * Schwerachse - im Überlappungsbereich ist es mit dem Gurt verschweisst und
   * wirkt dort biegesteif (siehe unten).
   */
  const blechNachweis = (art, blech, V_Ebene, hebelarm) => {
    if (!blech) return null;
    const breite = blech.breite;      // Abmessung entlang der Jochachse [mm]
    const dicke = blech.dicke;
    // AM KNOTEN TRÄGT DAS BLECH DIE SUMME DER GURTMOMENTE beider Nachbarfelder.
    // Ist die Aufteilung auf die Gurte ungleich, sind die beiden Blechenden
    // ungleich belastet; massgebend ist das grössere. Die QUERKRAFT bleibt
    // davon unberührt: sie folgt aus der Summe beider Endmomente, und die
    // Anteile ergänzen sich zu eins.
    const gurtMax = art === 'vertikal'
      ? Math.max(anteil.OG, anteil.UG) : 0.5;
    const M_K = V_Ebene * aBlech * gurtMax / 2;                  // [kNm] am Knoten
    const V = (V_Ebene * aBlech) / (2 * hebelarm);               // [kN]

    // STEIFER KNOTENBEREICH
    // Das Blech überlappt am Knoten den Gurtwinkel und ist dort mit ihm
    // verschweisst - die Überlagerung wirkt biegesteif. Massgebend ist deshalb
    // nicht das Moment auf der Schwerachse, sondern das am RAND des steifen
    // Bereichs, also am Anschnitt des Gurtes. Zwischen den beiden steifen
    // Enden liegt die lichte Blechlänge L_c (Mass der Stückliste).
    //
    //   M_K = M_R + V·(h − L_c)/2   und   V = 2·M_R/L_c
    //   =>  M_R = M_K · L_c / h                (V bleibt unverändert)
    //
    // Ohne Längenangabe (manuelle Bleche) wird nicht abgemindert.
    const Lc = blech.laenge ? blech.laenge / U.m__mm : hebelarm;
    const steif = Math.max(0, (hebelarm - Lc) / 2);              // [m] je Ende
    const faktor = hebelarm > 0 ? Math.min(1, Lc / hebelarm) : 1;
    const M = M_K * faktor;                                      // [kNm] am Anschnitt

    const W = (dicke * breite * breite) / RECHTECK.W_NENNER;     // [mm3]
    const A = dicke * breite;                                    // [mm2]
    const sig = (M * U.kNm__Nmm) / W;
    const tau = (RECHTECK.TAU_FAKTOR * V * U.kN__N) / A;
    const sig_v = Math.sqrt(sig * sig + 3 * tau * tau);
    return {
      art, pos: blech.pos, breite, dicke, laenge: blech.laenge,
      V_Ebene, nachbarfelder, aBlech,
      M_Knoten: M_K, M, V, W, A, sig, tau, sig_v, eta: sig_v / m.fyd,
      hebelarm, lichteLaenge: Lc, steifeLaenge: steif, abminderung: faktor,
    };
  };

  const ebenen = EBENEN.map((e) => {
    const istVert = e.art === 'vertikal';
    const je = q.jeEbene[e.id];
    const blech = istVert ? bleche?.vertikal : bleche?.horizontal;
    const nw = blechNachweis(e.art, blech, je.V_Ebene, istVert ? m.h : m.b);
    return { ...e, ...je, ...(nw ?? { eta: null }), blechFehlt: !nw };
  });

  const etaEcken = Math.max(...ecken.map((e) => e.eta));
  const etaBleche = ebenen.some((e) => e.eta !== null)
    ? Math.max(...ebenen.filter((e) => e.eta !== null).map((e) => e.eta)) : 0;

  return {
    q, My_lokal, Mz_lokal, My_Knoten, Mz_Knoten,
    felder, aGurt, aBlech,
    anschnittMy: fMy, anschnittMz: fMz, ecken, ebenen,
    massgebendeEcke: ecken.reduce((a, b) => (b.eta > a.eta ? b : a)),
    massgebendeEbene: ebenen.filter((e) => e.eta !== null)
      .reduce((a, b) => (b.eta > a.eta ? b : a), { eta: -1 }),
    etaEcken, etaBleche, eta: Math.max(etaEcken, etaBleche),
  };
}
