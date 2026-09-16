/**
 * data.profiles.js
 * ---------------------------------------------------------------------------
 * DER ZUGRIFF auf die Profiltabellen. Die ZAHLEN stehen in data/normen.json
 * und werden dort gepflegt (siehe js/data.normen.js).
 *
 * Winkelprofile (L) nach EN 10056-1 / SZS C5 sowie Stahlgüten.
 *
 * FELDBENENNUNG NACH EINBAULAGE IM TRAGJOCH
 * -----------------------------------------
 * Im Tragjoch (Regelbauart, Schnitt A-A der Konstruktionszeichnung) liegt je
 * ein Schenkel in der HORIZONTALEBENE (Ober- bzw. Unterfläche) und einer in der
 * VERTIKALEBENE (Seitenfläche). Die Felder sind deshalb nach ihrer Lage
 * benannt und nicht nach der Achsbezeichnung der Profiltabelle - so ist
 * eindeutig, welcher Wert in welchen Nachweis geht:
 *
 *   aH   Länge des liegenden Schenkels (Horizontalebene)            [mm]
 *   aV   Länge des stehenden Schenkels (Vertikalebene)              [mm]
 *   t    Schenkeldicke                                              [mm]
 *   zsH  Schwerpunktsabstand ab AUSSENFLÄCHE des liegenden Schenkels[cm]
 *   zsV  Schwerpunktsabstand ab AUSSENFLÄCHE des stehenden Schenkels[cm]
 *   Wy   el. Widerstandsmoment für Biegung um die HORIZONTALE Achse [cm3]
 *        -> gehört zu M_y,L,lokal (Vierendeel-Wirkung in der Vertikalebene)
 *   Wz   el. Widerstandsmoment für Biegung um die VERTIKALE Achse   [cm3]
 *        -> gehört zu M_z,L,lokal (Windwirkung)
 *   imin kleinster Trägheitsradius (Hauptachse v-v)                 [cm]
 *
 * Für gleichschenklige Winkel gilt aH = aV, zsH = zsV, Wy = Wz.
 * W ist jeweils das MINIMALE elastische Widerstandsmoment (Randfaser an der
 * Schenkelspitze), W = I / (a - zs).
 *
 * >>> Werte vor der Abgabe gegen die eigene SZS C5 Ausgabe verifizieren. <<<
 * ---------------------------------------------------------------------------
 */

import { winkelprofile, walzprofile,
         stahlgueten } from './data.normen.js';

/* ===========================================================================
 * >>> DIE ZAHLEN STEHEN NICHT MEHR HIER. <<<
 * ===========================================================================
 *
 * Weisung vom 16. September: «alle relevanten tragwerksdaten werden
 * ausschliesslich über die datenbank gesteuert, es soll nichts hardcoded in
 * der app sein.»
 *
 * Bis dahin stand die Tabelle als Literal an dieser Stelle - siebzehn
 * Winkel, dazu Stahlgüten und Walzprofile weiter unten. Sie liegen jetzt in
 * data/normen.json und kommen über js/data.normen.js.
 *
 * WAS HIER BLEIBT, ist die Bedeutung der Felder (der Kasten oben) und der
 * Zugriff darauf. Das ist kein Rest, sondern die Aufgabe dieses Moduls: die
 * Datenbank führt Zahlen, dieses Modul sagt, was sie heissen und wie man
 * mit ihnen rechnet.
 * ========================================================================= */

/**
 * ALLE WINKELPROFILE - die vier Gurte eines Tragjochs.
 *
 * Eine Funktion und keine Konstante: geladen wird dieses Modul, bevor die
 * Datei da ist. Eine Konstante stünde damit leer fest.
 */
export const PROFILE = () => winkelprofile();

/** Alle Stahlgüten. Nach SIA 263, Erzeugnisdicke t <= 40 mm. */
export const STAHLGUETEN = () => stahlgueten();

export function getProfil(name) {
  const p = winkelprofile().find((x) => x.name === name);
  if (!p) throw new Error(`Unbekanntes Profil: ${name}`);
  return p;
}

export function getStahl(name) {
  const s = stahlgueten().find((x) => x.name === name);
  if (!s) throw new Error(`Unbekannte Stahlgüte: ${name}`);
  return s;
}

/*
 * ===========================================================================
 * DIE GURTPROFILE DER ABFANGJOCHE - UPE und IPE.
 * ===========================================================================
 *
 * Der Katalog darueber fuehrt WINKEL: das Tragjoch ist ein Vierendeeltraeger
 * aus vier gleichschenkligen Winkeln. Das Abfangjoch ist einer aus ZWEI
 * Walzprofilen, und die standen bis zum 3. September nirgends - ohne sie
 * kein Querschnittswert und damit kein Nachweis.
 *
 * >>> DIESE WERTE SIND NORMWERTE, NICHT GEMESSENE. <<<
 *
 * Sie stammen aus der Profilnorm (EN 10365 / DIN 1026-2), nicht aus den
 * Sortimentsblaettern - dort stehen nur die Hauptmasse h, b und t_f. Sie
 * gehen in den Nachweis ein und gehoeren deshalb gegengelesen.
 *
 * >>> DIE GEWICHTSPROBE FINDET NICHT ALLES. <<<
 *
 * A x 7.85 gegen das Laufmetergewicht ging bei ALLEN sieben Profilen auf -
 * und bei UPE 160 waren I_z, W_z und I_t trotzdem falsch. Sie pruefte eben
 * nur A gegen G, und beide waren stimmig zueinander. Eine
 * Selbstkonsistenzpruefung findet keinen Fehler, der beide Seiten betrifft.
 *
 * >>> UPE IST NICHT UNP. <<<
 *
 * Am 3. September gegen den AxisVM-Querschnittseditor geprueft (Weisung:
 * «das ist das UPE nach EN norm. der nachgebaute querschnitt ist nicht ganz
 * korrekt»). Bei UPE 160 stimmten A, I_y und W_y - die STARKE Achse -, aber
 * die schwache nicht:
 *
 *      I_z    85.3  ->  106.83 cm4     20 % zu klein
 *      W_z    18.3  ->   22.58 cm3     19 % zu klein
 *      I_t    13.3  ->    5.23 cm4    154 % zu gross
 *      A      22.0  ->   21.67 cm2
 *      G      17.3  ->   17.0  kg/m
 *
 * Das sind UNP-Werte: das UNP hat geneigte Flansche und ein kleineres I_z.
 * Beim Abfangjoch liegt der Vierendeel-Verband in der SCHWACHEN Ebene -
 * genau dort, wo der Fehler sass.
 *
 * >>> AM 4. SEPTEMBER NACHGEMESSEN - DERSELBE FEHLER, DIESELBE GROESSE. <<<
 *
 * UPE 200 und UPE 240 standen unter demselben Verdacht und trugen ihn als
 * Vermerk. Der Auftraggeber hat beide im AxisVM-Querschnittseditor
 * aufgerufen; das Muster wiederholt sich genau:
 *
 *              A       I_y      W_y  |    I_z      W_z     I_t     e_y
 *   UPE 200   29.0 ok  1910 ok  191 ok  148->187  27->34  20->9   2.10->2.56
 *   UPE 240   38.5 ok  3600 ok  300 ok  257->311  40->50  33->15  2.38->2.79
 *
 * Die starke Achse stimmte, die schwache lag 21 % zu tief, W_z 26 %, und
 * I_t war mehr als doppelt so gross wie in Wirklichkeit. Beim Abfangjoch
 * traegt genau die schwache Achse den Vierendeel-Verband.
 *
 * >>> W_z IST DER KLEINERE DER BEIDEN. <<<
 *
 * Ein U-Profil ist um z unsymmetrisch: der Editor gibt W_z,el,t und
 * W_z,el,b getrennt aus. Genommen ist der KLEINERE - er gehoert zur
 * weiter entfernten Faser, und dort faellt der Nachweis. Die Probe geht
 * auf: I_z/W_z,t + I_z/W_z,b = b, bei UPE 200 5.44 + 2.56 = 8.00 cm.
 *
 * Daraus faellt auch e_y ab: der kleinere Abstand ist genau der zum
 * Stegruecken, also I_z / W_z,el,b.
 *
 * >>> UND DAMIT STEHT UPE 160 IN FRAGE. <<<
 *
 * Dieselbe Probe auf UPE 160 angewandt: I_z/W_z = 106.83/22.58 = 4.73 cm,
 * b - 4.73 = 2.27 - aber die Zeile fuehrt e_y = 1.84. Entweder stammt das
 * W_z von der anderen Faser, oder e_y ist noch der alte Normwert. Der
 * Unterschied wandert voll in den Hebelarm e = d + 2*e_y: bei A160 waeren
 * es 325.4 statt 316.8 mm, knapp drei Prozent auf der sicheren Seite.
 * Nachzumessen im selben Editor.
 *
 * >>> e_y IST DER GRUND, WARUM k NICHT DER HEBELARM IST. <<<
 *
 * Bei einem UPE liegt die Schwerachse um e_y INNERHALB des Stegruckens. Die
 * Gurte stehen mit dem Steg aussen; der Achsabstand ist deshalb k - 2*e_y
 * und nicht k. Bei A160 sind das 383 statt 420 mm - neun Prozent, und sie
 * gehen voll in das Moment ein. Beim symmetrischen IPE liegt die Achse in
 * der Profilmitte, dort gilt d + b.
 *
 * Masse in cm, cm2, cm4 - wie im Winkelkatalog darueber.
 * ---------------------------------------------------------------------------
 */
/*
 * Auch diese Tabelle steht seit dem 16. September in data/normen.json. Die
 * Prüfvermerke zu UPE 160, 200 und 240 sind dort als `hinweis` mitgezogen -
 * sie gehören zu den Zahlen, nicht zum Zugriff auf sie.
 */

/** Alle Walzprofile der Abfangjoche. Masse in cm - anders als beim Masten. */
export const GURTPROFILE = () => walzprofile();

/** Ein Gurtprofil nach Namen. */
export function getGurtprofil(name) {
  const p = walzprofile().find((x) => x.name === name);
  if (!p) throw new Error(`Unbekanntes Gurtprofil: ${name}`);
  return p;
}

/**
 * DER ACHSABSTAND DER BEIDEN GURTE [cm] - der wirkliche Hebelarm.
 *
 * >>> NICHT k. <<<
 *
 * k ist das Aussenmass ueber beide Gurte. Der Hebelarm der Vierendeel-
 * Wirkung ist der Abstand der SCHWERACHSEN, und der ist kleiner:
 *
 *   UPE   Steg aussen, Achse um e_y nach innen   ->  k - 2*e_y
 *   IPE   Achse in der Profilmitte               ->  k - b  ( = d + b )
 *
 * Bei A160 sind das 38.3 statt 42.0 cm. Neun Prozent, die voll ins Moment
 * gehen - mit k gerechnet laege der Nachweis auf der unsicheren Seite.
 *
 * @param {string|object} profil  Gurtprofil oder sein Name
 * @param {number} k              Aussenmass ueber beide Gurte [cm]
 */
export function gurtAchsabstand(profil, k, d = null) {
  const p = typeof profil === 'string' ? getGurtprofil(profil) : profil;
  /*
   * >>> BEIM I-PROFIL IST `d` SCHON DER ACHSABSTAND. <<<
   *
   * Weisung vom 4. September: «Die 600 sind bei den IPE Typen auf die
   * schwerelinie bezogen und bei den UPE auf die aussenkante.»
   *
   * Der Steg eines I liegt in der MITTE - das Mass zwischen den beiden
   * Stegen ist damit zugleich das Mass zwischen den Schwerelinien. Beim U
   * liegt er am Ruecken, also auf der Aussenkante des Profils, und die
   * Schwerachse sitzt um e_y weiter zum Flansch hin.
   *
   * Hier stand `k - b`. Das las `d` als lichte Weite und legte die Achsen um
   * eine halbe Flanschbreite zu weit nach aussen: bei A270 auf 735 statt
   * 600, ZWEIUNDZWANZIG PROZENT ZU GROSS. Der Hebelarm faellt damit, die
   * Gurtkraft N = M/e steigt - die alte Lesart lag auf der unsicheren Seite.
   *
   * Die Zeichnung bemasst es dreifach ineinander, bei A270 735 | 600 | 465:
   * aussen ueber die Flanschspitzen, die Stege, licht. Das mittlere ist d.
   */
  if (p.reihe !== 'UPE') return (d !== null && d > 0) ? d : k - p.b;
  /*
   * >>> DIE OEFFNUNG ZEIGT NACH AUSSEN. <<<
   *
   * Weisung vom 3. September, nach Blick ins AxisVM-Modell: «die beiden
   * c-profile in diesem fall sollten beide gegen aussen zeigen». Der
   * Schnitt A-A bestaetigt es: die STEGE liegen innen, die Flansche zeigen
   * nach aussen, und `d` ist der Abstand der Stege. Die Gegenprobe geht
   * auf - d/2 + b = k/2, bei A160 also 14 + 7 = 21.
   *
   * Hier stand `k - 2*e_y`, die umgekehrte Lage: Steg aussen, Achse nach
   * innen. Damit lag der Hebelarm bei A160 auf 38.3 cm statt auf 31.7 -
   * SIEBZEHN PROZENT ZU GROSS, und die Gurtkraft N = M/e entsprechend
   * einundzwanzig Prozent zu klein. Das ist die unsichere Seite.
   *
   * Richtig: der Stegruecken liegt bei d/2 von der Mitte, und die
   * Schwerachse liegt um e_y weiter AUSSEN, zum Flansch hin.
   *
   * Ohne `d` bleibt die alte Rechnung - sie ist dann eine Annahme, und der
   * Aufrufer soll das Mass mitgeben, das die Zeichnung fuehrt.
   */
  if (d !== null && d > 0) return d + 2 * p.ey;
  return k - 2 * p.ey;
}
