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
 * Vier Wege:
 *   gleich        wie früher, je die Hälfte
 *   steifigkeit   I_Gurt / ΣI - der Obergurt trifft damit auf wenige Prozent,
 *                 der Untergurt wird dafür bis 25 % zu klein
 *   huellend      je Gurt der ungünstigere der beiden - nie schlechter als
 *                 hälftig und beim steiferen Gurt richtig, aber die Summe der
 *                 Anteile ist grösser als eins
 *   gemessen      VORGABE. Gedämpfte Steifigkeitsaufteilung, an einem
 *                 Stabmodell gemessen (siehe GURT_DAEMPFUNG). Die Anteile
 *                 ergänzen sich zu eins, und stellenweise gegen ein zweites
 *                 Programm gehalten trifft sie die Vertikallastfälle auf
 *                 −3 bis +6 %, wo 'huellend' bei +10 bis +21 % liegt.
 *
 * In den HORIZONTALEBENEN stehen zwei GLEICHE Gurte nebeneinander; dort ist
 * hälftig immer richtig und die Einstellung ohne Wirkung.
 */
export const GURTAUFTEILUNGEN = [
  { key: 'gemessen', label: 'gedämpft nach Steifigkeit – an PyNite gemessen (Vorgabe)' },
  { key: 'huellend', label: 'einhüllend – je Gurt der ungünstigere Anteil, hebt den Untergurt' },
  { key: 'steifigkeit', label: 'nach Biegesteifigkeit I/ΣI (ungedämpft)' },
  { key: 'gleich', label: 'hälftig (bisheriges Verhalten)' },
];

/**
 * DÄMPFUNG DER STEIFIGKEITSAUFTEILUNG.
 *
 * Die reine I-Aufteilung ist zu scharf. Gemessen an einem Stabmodell des
 * Signaljochs (PyNite, Gurtendmomente an den Stationen je Lastfall DIREKT
 * abgelesen statt aus Spannungen rückgerechnet):
 *
 *      Verhältnis I_OG/I_UG = 2.45  ->  Anteil Obergurt
 *          hälftig                          50.0 %
 *          GEMESSEN   G 60.3 · Schnee 60.7 · Wind y 56.7 · Wind x 57.4 %
 *                     Mittel 58.8 %, Median 57, Spanne 51 … 71 %
 *          nach I                           71.1 %
 *
 * Der Rahmen gleicht also aus: Bleche und Knotennachgiebigkeit ziehen die
 * Aufteilung zur Hälfte zurück. Mit
 *
 *      Anteil = 0.5 + k · (I_Gurt/ΣI − 0.5),   k = 0.42
 *
 * trifft man die Messung (0.5 + 0.42·0.211 = 0.589).
 *
 * GEGENPROBE: dasselbe Modell mit GLEICHEN Gurten liefert an jeder Station
 * exakt 50.0 % - die Messmethode selbst ist damit bestätigt.
 *
 * ZWEI KORREKTUREN gegenüber der ersten Messung, die 57.4 % nannte:
 *   1. Im Lastfall G war das Vorzeichen der Anbauteillasten falsch gesetzt
 *      (F_z ist positiv nach UNTEN), so dass sich Eigengewicht und Anbaulast
 *      teilweise aufhoben. Schnee und Wind waren nicht betroffen; der Fehler
 *      verschob den Mittelwert um zwei Prozentpunkte nach unten.
 *   2. Das Referenzmodell rechnete die Bindebleche SCHUBSTARR. Sie sind kurz
 *      und gedrungen und arbeiten in doppelter Krümmung; ihr Schubanteil
 *      beträgt 16 bis 45 % (siehe export.pynite.js). Schubweich gerechnet
 *      gleichen sie stärker aus - der Mittelwert sinkt von 59.4 auf 58.8 %.
 *      Deutlich weniger, als die Grössenordnung von φ befürchten liess.
 *
 * NACHGEMESSEN AM 29. AUGUST - k = 0.45 STATT 0.42
 *
 * Die obige Zahl stand auf EINEM Modell mit EINEM Steifigkeitsverhältnis.
 * `kalibrieren.mjs` hat sie über das ganze Sortiment gefahren: 80 Läufe, vier
 * Verhältnisse, zwei Bauarten, fünf Lastanordnungen.
 *
 *      I_OG/I_UG    1.00      2.04      2.46      4.15
 *      k              —       0.436     0.446     0.465
 *
 * Gemessen wird die DIFFERENZ gegen denselben Träger mit gleichen Gurten -
 * nur so bleibt der reine Steifigkeitseffekt übrig. Der erste Anlauf las den
 * Anteil unmittelbar ab und fing sich zwei Störungen ein, die keine
 * Steifigkeitseffekte sind: die Auflagernähe (46/52 % an den äussersten zwei
 * Feldern, bei GLEICHEN Gurten) und den Angriffsort der Last (eine
 * Hängestütze hängt am Untergurt; ihre Windlast läuft dort ein, wo sie
 * angreift - 43 statt 50 %). Genau daran ist die alte Messung mit 58.8 %
 * vorbeigelaufen.
 *
 * Massgebend ist das ENDMOMENT, nicht die Querkraft: die Querkraft im Gurt
 * nimmt die unmittelbar aufliegende Last mit (Schnee liegt auf dem
 * Obergurt), das Moment nicht - und aus dem Moment kommt die Spannung.
 * Über die Querkraft gemessen ergäbe sich 0.22.
 *
 * >>> k WANDERT NICHT: 0.436 beim Verhältnis 2.04 gegen 0.465 bei 4.15,
 * Unterschied 0.029. Die lineare Form der Formel ist damit belegt, auch für
 * das J130, dessen 4.15 vorher unberührt war. Gegenprobe bestanden: 636
 * Messstellen mit gleichen Gurten, grösste Abweichung von 50.0 % nur 1.7
 * Prozentpunkte - und der Rest gehört dorthin, weil der Schnee auf dem
 * Obergurt liegt.
 *
 * Der Mittelwert verdeckt weiterhin eine Spanne über die Stationen. Wer
 * beide Gurte gleichzeitig auf der sicheren Seite haben will, nimmt
 * 'huellend' - dessen Anteile ergänzen sich dann aber zu mehr als eins. <<<
 */
export const GURT_DAEMPFUNG = 0.45;

/**
 * Anteil eines Gurtes an der Querkraft seiner VERTIKALEBENE.
 * @returns {{OG:number, UG:number}}
 */
export function gurtanteile(m, art = 'gemessen') {
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
  if (art === 'huellend') return { OG: Math.max(0.5, st.OG), UG: Math.max(0.5, st.UG) };
  const k = GURT_DAEMPFUNG;
  return { OG: 0.5 + k * (st.OG - 0.5), UG: 0.5 + k * (st.UG - 0.5) };
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
/**
 * KNOTENBEREICH GURT/BLECH.
 *
 * Am Knoten überlappt das Bindeblech den Gurtwinkel und ist mit ihm
 * verschweisst. Ob dieser Bereich als BIEGESTEIF gilt, ist keine Rechenfrage,
 * sondern eine Festlegung des Nachweises.
 *
 * >>> FESTGELEGT: der Knotenbereich ist STEIF. Nachgewiesen wird am
 * ANSCHNITT - im Gurt M·(a₁−b_Bl)/a₁, im Blech M·L_c/h. Das entspricht dem
 * Stand der Technik für gegliederte Stäbe (EN 1993-1-1, Bild 6.11) und ist
 * die Grundlage aller Nachweise dieses Werkzeugs. <<<
 *
 * Die zweite Einstellung ist KEINE Alternative für den Nachweis. Sie rechnet
 * Achse zu Achse, so wie ein Stabwerksprogramm ohne Zutun rechnet, und ist
 * dazu da, einen Vergleich gegen ein Prüfmodell ohne Umbau führen zu können.
 * Der Unterschied ist erheblich - 11 bis 15 % auf die Ausnutzung -, und genau
 * deshalb soll er sichtbar und benennbar sein statt versteckt.
 *
 * Das KNOTENMOMENT ist in beiden Fällen dasselbe; nur die Stelle, an der
 * nachgewiesen wird, ändert sich.
 */
/**
 * ENDFELDZUSCHLAG AUF DIE BINDEBLECHE.
 *
 * In den beiden Endfeldern geht die Torsion des Jochs über die Anschlussebenen
 * in den Mast. Das ist eine ÖRTLICHE KRAFTEINLEITUNG, und ein Ersatzbalken
 * kann sie nicht abbilden - er kennt nur den Rahmenanteil.
 *
 * GEMESSEN am Signaljoch (Wind quer, Moment im Vertikalblech, AxisVM gegen
 * Werkzeug, von aussen nach innen):
 *
 *      Station      0.6 m   2.8 m   4.9 m   7.0 m
 *      Verhältnis    2.71    1.72    1.43    0.96
 *
 * Der Überschuss klingt über rund drei Felder ab. Davon geht ein Teil auf das
 * KNOTENMODELL: AxisVM rechnet Achse zu Achse, dieses Werkzeug weist am
 * Anschnitt nach, und allein das trägt Faktor 1.3 bis 1.6. Bleibt für die
 * Einleitung selbst rund 2.71/1.45 ≈ 1.9.
 *
 * NUR AUF DEN TORSIONSANTEIL. Der Überschuss stammt aus der Einleitung der
 * TORSION in den Mast, nicht aus dem Rahmenanteil. Ein Joch ohne exzentrische
 * Anbaulasten hat kaum Torsion - dort ist auch nichts zuzuschlagen. Angehoben
 * wird deshalb nur der Anteil, der aus dem Torsionsschubfluss kommt:
 *
 *      M = M_Rahmen · ( 1 + (k_E − 1) · Anteil_Torsion / V_Ebene )
 *
 * NACHGEMESSEN AM 31. AUGUST - k_E = 0.48 STATT 2.0, ALSO EINE ABMINDERUNG
 *
 * Die obigen 2.0 stammen aus einem Vergleich, in dem zwei Dinge vermischt
 * waren: die Einleitung selbst und der Unterschied Achse-zu-Achse gegen
 * Anschnitt. `kalibrieren.mjs` misst gegen ein PyNite-Modell mit DEMSELBEN
 * Knotenmodell, das der Nachweis benutzt - damit fällt die Vermischung weg,
 * und es braucht keine Division durch 1.45 mehr.
 *
 *      Querwind, Torsionsanteil 100 %      k_E = 0.48   (0.41 … 0.64, 24 Fälle)
 *      Vertikallast, alle Anordnungen      Verhältnis 0.90 (0.76 … 1.04)
 *
 * Der Ersatzbalken UNTERSCHÄTZT das Endfeld also nicht - er überschätzt es.
 * Der Grund steht schon weiter oben: `schnittAuswertung` legt die
 * Bredt-Torsion als Hüllkurve auf ALLE VIER Ebenen, jede bekommt die
 * ungünstigste. Wo Torsion das Bild bestimmt, ist das rund Faktor zwei; ein
 * Zuschlag von 2.0 darüber ergab in der Summe das Vierfache.
 *
 * Gemessen wird nur, wo der Torsionsanteil über 50 % liegt. k_E folgt aus
 * k_E = 1 + (Verhältnis − 1)/Anteil und hat den Anteil im Nenner; darunter
 * verstärkt der Quotient jede Abweichung ins Masslose (mit 5 % Schwelle
 * streuten dieselben Messungen von +1.18 bis −1.03).
 *
 * >>> ANGESETZT WIRD 0.50. Gemessen sind 0.48 im Mittel, und die zweite
 * Nachkommastelle waere Scheingenauigkeit: die Messung selbst streut von 0.41
 * bis 0.64, also um ein Vielfaches der Rundung. Eine glatte Zahl sagt
 * ehrlicher, wie genau die Sache bekannt ist - und die Herleitung steht
 * daneben, was Nachvollziehbarkeit ausmacht, nicht die Stellenzahl.
 *
 * Die Rundung geht zur SICHEREN Seite: 0.50 liefert mehr Moment als die
 * gemessenen 0.48. An den Stellen am oberen Rand der Spanne liegt das
 * Werkzeug trotzdem knapp unter dem FEM; wer die Messung nirgends
 * unterschreiten will, stellt 0.65 ein. Der Wert ist im Optionsdialog frei
 * einstellbar, 1.0 schaltet die Sache ab. <<<
 *
 * In Feldmitte stimmen Werkzeug, PyNite-Rahmen und AxisVM überein
 * (0.26 / 0.23 / 0.10 kNm) - dort ändert sich ohnehin nichts.
 */
export const ENDFELD_ZUSCHLAG = 0.50;

/** So viele Stationen je Jochende gelten als Endfeld. */
export const ENDFELD_STATIONEN = 2;

/**
 * SCHIEFE BIEGUNG DER WINKELGURTE -> MOMENT IN DEN BINDEBLECHEN.
 *
 * DIE BEOBACHTUNG
 * Unter reiner Vertikallast rechnet der Rahmen für die HORIZONTALBLECHE exakt
 * null - sie liegen in den Ebenen, durch die keine vertikale Querkraft läuft.
 * Das geprüfte FEM-Modell zeigt dort aber Spannung, und zwar mit dem Verlauf
 * der QUERKRAFTLINIE (am Auflager am grössten, in Feldmitte fast null):
 *
 *      Eigengewicht, Horizontalblech   x=0.6: 10.4   x=9.1: 0.8   x=18.3: 11.2
 *      Schnee,       Horizontalblech   x=0.6:  3.5   x=9.1: 0.4   x=18.3:  3.6
 *
 * Der Grundrissknick scheidet als Ursache aus: der ginge mit der GURTKRAFT,
 * hätte also sein Maximum in Feldmitte.
 *
 * DIE URSACHE
 * Ein Winkel hat seine Hauptachsen unter rund 45 Grad zu den Schenkeln, also
 * I_yz ≠ 0. Ein Moment um die schenkelparallele Achse - und genau so entsteht
 * es im Vierendeel-Rahmen - erzeugt deshalb Krümmung in BEIDE Richtungen:
 *
 *      κ_z = ( M_z · I_y + M_y · I_yz ) / ( E · (I_y I_z − I_yz²) )
 *
 * Der Gurt will unter dem vertikalen Rahmenmoment seitlich ausweichen. Die
 * beiden Gurte einer Horizontalebene sind Spiegelbilder (I_yz mit
 * entgegengesetztem Vorzeichen), sie weichen also GEGENEINANDER aus - und die
 * Horizontalbleche halten dagegen. Dasselbe gilt spiegelbildlich für die
 * Vertikalbleche unter Wind: dort treibt M_z den Gurt vertikal.
 *
 * DIE RECHNUNG
 * Nach κ_z umgestellt verhält sich der Gurt quer zur Lastebene wie ein Balken
 * mit der wirksamen Steifigkeit EI* und einem EINGEPRÄGTEN Moment M_imp:
 *
 *      EI* = E · (I_y I_z − I_yz²) / I_treib        M_imp = − M_treib · I_yz / I_treib
 *
 * I_treib ist das Trägheitsmoment um die Achse des treibenden Moments (I_y bei
 * Vertikallast, I_z bei Wind). Ohne jede Behinderung bleibt M_imp im Blech
 * hängen als nichts; bei voller Behinderung würde der Gurt das ganze M_imp
 * tragen. Wirklich ist es dazwischen, und wieviel, entscheidet die
 * Blechsteifigkeit.
 *
 * Im Feld ist das treibende Moment ein Sägezahn (null in Feldmitte, ±M_K am
 * Knoten). Die daraus folgende Krümmung ist es auch. Über ein Feld integriert
 * und mit der Bedingung, dass der Gurt im Mittel gerade bleibt, ergibt sich
 * die Knotenverdrehung θ = C·a/6 mit C = (M_z,K − M_imp,K)/EI*.
 *
 * Das Blech verbindet zwei Gurte, die sich SPIEGELBILDLICH verdrehen (+θ und
 * −θ). Nach dem Drehwinkelverfahren ohne Stabdrehung heisst das M = 2EI_p·θ/L_c
 * an beiden Enden - konstantes Moment, KEINE Querkraft. Mit dem
 * Knotengleichgewicht M_Blech = 2·M_z,K folgt
 *
 *      β = I_p · a / ( 6 · L_c · I* )
 *      M_Blech = 2 · |I_yz/I_treib| · M_treib,K · β / (1 + β)
 *
 * I_p ist das Trägheitsmoment des Blechs in seiner eigenen Ebene
 * (t·b³/12, dieselbe Richtung wie sein W), L_c die lichte Länge, a die
 * Feldweite.
 *
 * WAS DARAUS FOLGT UND WAS NICHT
 *   · Das Moment folgt dem treibenden Rahmenmoment, also der QUERKRAFTLINIE -
 *     genau die Form, die das FEM-Modell zeigt.
 *   · Es kommt OHNE Querkraft: konstantes Moment über die Blechlänge. Deshalb
 *     wird τ nicht erhöht, und es gibt auch keine Abminderung auf den
 *     Anschnitt - bei konstantem Moment ist der Anschnittwert der Knotenwert.
 *   · Der Endfeldzuschlag greift nicht: der gilt der Torsionseinleitung.
 *
 * VORAUSSETZUNG: die vier Winkel stehen SPIEGELSYMMETRISCH (Rücken nach aussen
 * oder alle nach innen, in beiden Achsen gespiegelt). So ist jedes Tragjoch des
 * Sortiments gebaut. Stünden sie parallel, wichen die Gurte gleichsinnig aus
 * und die Bleche bekämen deutlich weniger.
 *
 * NICHT ANGESETZT ist der Anteil, den das Rückstellmoment im GURT selbst
 * ausmacht (M_z = |I_yz/I_y|·M_y·β/(1+β), beim L 100x100x10 rund 13 % des
 * örtlichen Rahmenmoments). Der Gurt wird von der Normalkraft bemessen; dieser
 * Term ginge zudem verschieden in die beiden Spannungsmodelle ein und wäre
 * ohne eigene Eichung nicht zu belegen.
 *
 * >>> Hergeleitet, nicht gefittet. Der einzige freie Punkt ist die Annahme,
 * dass der Gurt im Mittel gerade bleibt. Abschaltbar über `schiefeBiegung`. <<<
 */
export const SCHIEFE_BIEGUNG = true;

export const KNOTENBEREICHE = [
  { key: 'anschnitt',
    label: 'steif, Nachweis am Anschnitt (Nachweisgrundlage)' },
  { key: 'schwerachsen',
    label: 'Achse zu Achse – nur zum Vergleich mit Prüfmodellen' },
];

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
 * EIGENANTEIL DER GURTE AM GLOBALEN MOMENT.
 *
 * Der Rechenkern idealisiert das Joch als Kräftepaar: das globale Moment wird
 * allein über die Normalkräfte der vier Winkel abgetragen, M_y/(2h) je Gurt.
 * Das ist die Zwei-Gurt-Idealisierung, und sie unterschlägt einen Term.
 *
 * Nach der Ebenbleibenshypothese trägt jeder Winkel das globale Moment auch
 * über sein EIGENES Trägheitsmoment mit:
 *
 *      I_ges = Σ ( A_i · e_i² )  +  Σ I_i          (Steiner + Eigenanteil)
 *      M_eigen,i = M_global · I_i / I_ges
 *
 * Der Anteil ist klein - beim Signaljoch 1.0 % um die waagrechte und 1.5 % um
 * die lotrechte Achse -, aber er läuft mit dem GLOBALEN Moment und nicht mit
 * der Querkraft. In Feldmitte, wo die Querkraft und damit das örtliche
 * Rahmenmoment gegen null gehen, ist er deshalb das EINZIGE Moment im Gurt.
 *
 * GEMESSEN am eingespannten Beispieljoch, reine Querlast, Feldmitte:
 *
 *      Rahmen (PyNite)   0.197 … 0.224 kNm je Obergurtwinkel
 *      hergeleitet       177/(32 010 + 499) · 42 kNm = 0.229 kNm
 *      Werkzeug bisher   0.056 kNm  (nur der Rest der Querkraft)
 *
 * Ohne den Term lag das Werkzeug in Feldmitte 72 % zu tief - auf der
 * unsicheren Seite. Es ist derselbe Term, der die Horizontalbleche unter
 * reiner Vertikallast trägt (siehe SCHIEFE_BIEGUNG, dort über I_yz).
 *
 * KEINE ABMINDERUNG AUF DEN ANSCHNITT: der Eigenanteil folgt dem globalen
 * Momentenverlauf und ist über die Feldweite praktisch konstant, anders als
 * das Rahmenmoment mit seinem Nulldurchgang in Feldmitte.
 *
 * @returns {{OG:{my:number, mz:number}, UG:{my:number, mz:number},
 *            Iges_y:number, Iges_z:number}} Faktoren auf M_y bzw. M_z
 */
export function eigenanteil(m) {
  const pO = m.profOG, pU = m.profUG;
  const iy = (p) => (p.iy ** 2) * p.A;                    // [cm4]
  const iz = (p) => ((p.iz ?? p.iy) ** 2) * p.A;
  const eZ = (m.h / 2) * U.m__cm;                         // Hebel in z [cm]
  const eY = (m.b / 2) * U.m__cm;                         // Hebel in y [cm]
  const eigenY = 2 * iy(pO) + 2 * iy(pU);
  const eigenZ = 2 * iz(pO) + 2 * iz(pU);
  const Iges_y = 2 * pO.A * eZ ** 2 + 2 * pU.A * eZ ** 2 + eigenY;
  const Iges_z = 2 * (pO.A + pU.A) * eY ** 2 + eigenZ;
  const je = (p) => ({ my: Iges_y > 0 ? iy(p) / Iges_y : 0,
                       mz: Iges_z > 0 ? iz(p) / Iges_z : 0 });
  return { OG: je(pO), UG: je(pU), Iges_y, Iges_z, eigenY, eigenZ };
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
 * Blechmoment aus der schiefen Biegung eines Gurtwinkels (siehe SCHIEFE_BIEGUNG).
 *
 * @param {object} p        Gurtprofil (Winkel)
 * @param {object} blech    Blechdaten {breite, dicke, laenge} [mm]
 * @param {number} aGurt    Feldweite [m]
 * @param {number} Lc_m     lichte Blechlänge [m]
 * @param {string} achse    'y' = treibendes Moment um die schenkelparallele
 *                          y-Achse (Vertikallast, hält das HORIZONTALblech
 *                          dagegen), 'z' = umgekehrt
 * @returns {{r:number, beta:number, faktor:number}|null}
 *          faktor: M_Blech,Knoten = faktor · M_Gurt,Knoten
 */
export function koppelfaktor(p, blech, aGurt, Lc_m, achse) {
  if (!p || !blech?.breite || !blech?.dicke) return null;
  if (!(aGurt > 0) || !(Lc_m > 0)) return null;
  const w = winkelwerteFuer(p);
  const D = w.Iy * w.Iz - w.Iyz * w.Iyz;                 // [mm4]²
  const Itreib = achse === 'z' ? w.Iz : w.Iy;            // [mm4]
  if (!(D > 0) || !(Itreib > 0)) return null;
  const r = Math.abs(w.Iyz) / Itreib;                    // volle Behinderung
  const Istern = D / Itreib;                             // wirksames I quer [mm4]
  const Ip = (blech.dicke * blech.breite ** 3) / 12;     // [mm4], in Blechebene
  const beta = (Ip * (aGurt * U.m__mm)) / (6 * (Lc_m * U.m__mm) * Istern);
  return { r, beta, Istern, Ip, faktor: 2 * r * (beta / (1 + beta)) };
}

/**
 * Vollständige Auswertung eines Schnitts: Kräfte und Spannungen für jeden
 * der vier Eckwinkel und jede der vier Bindeblechebenen.
 *
 * @param {object} sg Schnittgrössen an der Stelle (My, Vz, Mz, Vy, Tx)
 * @param {object} m  Modell
 * @param {object} bleche {vertikal, horizontal} Blechdaten an dieser Station
 */
export function schnittAuswertung(sg, m, bleche, nachbarfelder = 2, x = null,
                                  imEndfeld = false) {
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
  //
  // KNOTENMODELL: steif oder Achse zu Achse.
  // Ob der Überlappungsbereich als steif gilt, ist eine ABSPRACHE, keine
  // Rechenfrage - und die beiden Antworten geben verschiedene Momente. Ein
  // Prüfmodell, das Achse zu Achse rechnet (so rechnet AxisVM ohne Zutun),
  // findet im Gurt das Knotenmoment und im Blech das volle Moment; dieses
  // Werkzeug weist am Anschnitt nach und mindert entsprechend ab.
  // Vorgabe bleibt der steife Knotenbereich.
  const steifeKnoten = (m.knotenbereich ?? 'anschnitt') !== 'schwerachsen';
  const anschnitt = (blech) => {
    if (!steifeKnoten) return 1;
    const bBl = blech?.breite ? blech.breite / U.m__mm : 0;
    return aGurt > 0 ? Math.max(0, Math.min(1, (aGurt - bBl) / aGurt)) : 1;
  };
  const fMy = anschnitt(bleche?.vertikal);
  const fMz = anschnitt(bleche?.horizontal);
  // AUFTEILUNG AUF DIE GURTE EINER EBENE, siehe GURTAUFTEILUNGEN.
  // In der Vertikalebene stehen OG und UG nebeneinander und teilen die
  // Querkraft nach Steifigkeit; in der Horizontalebene sind es zwei gleiche
  // Gurte, dort bleibt es hälftig.
  const endfeldFaktor = m.endfeldZuschlag === false
    ? 1 : (Number.isFinite(m.endfeldZuschlag) ? m.endfeldZuschlag : ENDFELD_ZUSCHLAG);
  const anteil = gurtanteile(m, m.gurtaufteilung ?? 'gemessen');
  const My_KnotenG = { OG: q.vertikal.max * anteil.OG * (aGurt / 2),
                       UG: q.vertikal.max * anteil.UG * (aGurt / 2) };
  // Für Anzeige und Rückwärtsvergleich: der bisherige hälftige Wert.
  const My_Knoten = (q.vertikal.max / 2) * (aGurt / 2);
  const Mz_Knoten = (q.horizontal.max / 2) * (aGurt / 2);
  // EIGENANTEIL AM GLOBALEN MOMENT (siehe eigenanteil()). Er folgt dem
  // globalen Momentenverlauf, nicht der Querkraft, und bekommt deshalb keine
  // Abminderung auf den Anschnitt.
  const ea = eigenanteil(m);
  const eaMy = { OG: Math.abs(sg.My ?? 0) * ea.OG.my,
                 UG: Math.abs(sg.My ?? 0) * ea.UG.my };
  const eaMz = { OG: Math.abs(sg.Mz ?? 0) * ea.OG.mz,
                 UG: Math.abs(sg.Mz ?? 0) * ea.UG.mz };
  const My_lokal = My_Knoten * fMy;
  const Mz_lokal = Mz_Knoten * fMz;
  const My_lokalG = { OG: My_KnotenG.OG * fMy + eaMy.OG,
                      UG: My_KnotenG.UG * fMy + eaMy.UG };
  const Mz_lokalG = { OG: Mz_Knoten * fMz + eaMz.OG,
                      UG: Mz_Knoten * fMz + eaMz.UG };

  // --- Eckwinkel -----------------------------------------------------------
  const punkteModell = m.spannungsmodell === 'punkte';
  const ecken = eckNormalkraefte(sg, m).map((e) => {
    const p = e.gurt === 'OG' ? m.profOG : m.profUG;
    const myG = My_lokalG[e.gurt];
    const mzG = Mz_lokalG[e.gurt];
    const sig_N = (Math.abs(e.N) * U.kN_cm2__N_mm2) / p.A;
    // Die beiden Anteile über W bleiben stehen: sie sind die verständliche
    // Zerlegung, die in Tabelle und Bericht gezeigt wird. Massgebend ist
    // je nach Modell ihre Summe oder die Randspannung an den Eckpunkten.
    const sig_My = (myG * U.kNm_cm3__N_mm2) / p.Wy;
    const sig_Mz = (mzG * U.kNm_cm3__N_mm2) / p.Wz;
    let sig_v = sig_N + sig_My + sig_Mz;
    let punkt = null;
    if (punkteModell) {
      const r = randspannung(winkelwerteFuer(p), e.N, myG, mzG);
      sig_v = r.sig;
      punkt = r.punkt;
    }
    return {
      ...e, profil: p.name, A: p.A, Wy: p.Wy, Wz: p.Wz,
      art: e.N < 0 ? 'Druck' : 'Zug',
      My_lokal: myG, Mz_lokal: mzG, gurtanteil: anteil[e.gurt],
      eigenMy: eaMy[e.gurt], eigenMz: eaMz[e.gurt],
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
  const koppAn = m.schiefeBiegung !== false;
  const blechNachweis = (art, blech, V_Ebene, hebelarm, anteilTorsion = 0,
                         kopp = null) => {
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
    const faktor = steifeKnoten && hebelarm > 0
      ? Math.min(1, Lc / hebelarm) : 1;
    // ENDFELD: örtliche Einleitung der TORSION in den Mast (siehe
    // ENDFELD_ZUSCHLAG). Angehoben wird nur der Torsionsanteil, nicht der
    // Rahmenanteil - und nur das Moment; die Querkraft folgt dem Rahmen.
    const tAnteil = V_Ebene > 0
      ? Math.max(0, Math.min(1, Math.abs(anteilTorsion) / V_Ebene)) : 0;
    const zu = imEndfeld ? 1 + (endfeldFaktor - 1) * tAnteil : 1;

    // SCHIEFE BIEGUNG DER GURTWINKEL (siehe SCHIEFE_BIEGUNG).
    // Der Gurt will unter seinem Rahmenmoment quer ausweichen, das Blech hält
    // dagegen. Massgebend ist das ungünstigere der beiden Blechenden - die
    // zwei Gurte einer Ebene können verschiedene Profile haben.
    // Das Moment ist über die Blechlänge KONSTANT: keine Querkraft, keine
    // Abminderung auf den Anschnitt, kein Endfeldzuschlag.
    let M_kopp = 0, koppel = null;
    if (koppAn && kopp) {
      kopp.treiber.forEach((t) => {
        const kf = koppelfaktor(t.p, blech, aGurt, Lc, kopp.achse);
        if (!kf) return;
        const wert = kf.faktor * Math.abs(t.M);
        if (wert > M_kopp) { M_kopp = wert; koppel = { ...kf, M: wert, profil: t.p.name }; }
      });
    }
    const M = M_K * faktor * zu + M_kopp;                        // [kNm] am Anschnitt

    const W = (dicke * breite * breite) / RECHTECK.W_NENNER;     // [mm3]
    const A = dicke * breite;                                    // [mm2]
    const sig = (M * U.kNm__Nmm) / W;
    const tau = (RECHTECK.TAU_FAKTOR * V * U.kN__N) / A;
    const sig_v = Math.sqrt(sig * sig + 3 * tau * tau);
    return {
      art, pos: blech.pos, breite, dicke, laenge: blech.laenge,
      V_Ebene, nachbarfelder, aBlech,
      // M_Knoten bleibt der reine Rahmenwert - der Endfeldzuschlag steckt
      // in M und wird daneben eigens ausgewiesen.
      M_Knoten: M_K, M, M_kopp, koppel, V, W, A, sig, tau, sig_v,
      eta: sig_v / m.fyd,
      hebelarm, lichteLaenge: Lc, steifeLaenge: steif, abminderung: faktor,
      endfeld: imEndfeld, endfeldFaktor: zu, torsionsanteil: tAnteil,
    };
  };

  // WELCHES GURTMOMENT TREIBT WELCHES BLECH.
  // Vertikalblech: es steht in der Vertikalebene und hält den Gurt gegen das
  //   Ausweichen aus dem Grundrissmoment M_z - Treiber ist Mz_Knoten, und die
  //   Ebene verbindet OG mit UG, also beide Profile.
  // Horizontalblech: es liegt in der Horizontalebene, verbindet den linken mit
  //   dem rechten Gurt DERSELBEN Höhe und hält gegen das Ausweichen aus dem
  //   Vertikalmoment M_y - Treiber ist My_KnotenG des betreffenden Gurtes.
  const koppVert = { achse: 'z', treiber: [{ p: m.profOG, M: Mz_Knoten },
                                           { p: m.profUG, M: Mz_Knoten }] };
  const koppHor = {
    H_O: { achse: 'y', treiber: [{ p: m.profOG, M: My_KnotenG.OG }] },
    H_U: { achse: 'y', treiber: [{ p: m.profUG, M: My_KnotenG.UG }] },
  };
  const ebenen = EBENEN.map((e) => {
    const istVert = e.art === 'vertikal';
    const je = q.jeEbene[e.id];
    const blech = istVert ? bleche?.vertikal : bleche?.horizontal;
    const nw = blechNachweis(e.art, blech, je.V_Ebene, istVert ? m.h : m.b,
                             je.anteilTorsion,
                             istVert ? koppVert : koppHor[e.id]);
    return { ...e, ...je, ...(nw ?? { eta: null }), blechFehlt: !nw };
  });

  const etaEcken = Math.max(...ecken.map((e) => e.eta));
  const etaBleche = ebenen.some((e) => e.eta !== null)
    ? Math.max(...ebenen.filter((e) => e.eta !== null).map((e) => e.eta)) : 0;

  return {
    q, My_lokal, Mz_lokal, My_Knoten, Mz_Knoten, My_KnotenG, Mz_lokalG,
    eigenanteil: ea, eigenMy: eaMy, eigenMz: eaMz,
    felder, aGurt, aBlech,
    anschnittMy: fMy, anschnittMz: fMz, ecken, ebenen,
    imEndfeld, endfeldFaktor: imEndfeld ? endfeldFaktor : 1,
    massgebendeEcke: ecken.reduce((a, b) => (b.eta > a.eta ? b : a)),
    massgebendeEbene: ebenen.filter((e) => e.eta !== null)
      .reduce((a, b) => (b.eta > a.eta ? b : a), { eta: -1 }),
    etaEcken, etaBleche, eta: Math.max(etaEcken, etaBleche),
  };
}
