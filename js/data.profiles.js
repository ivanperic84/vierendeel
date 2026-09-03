/**
 * data.profiles.js
 * ---------------------------------------------------------------------------
 * REINE DATEN. Keine Logik, kein DOM.
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

/** Hilfsfunktion: gleichschenkliger Winkel -> volles Feldschema. */
const gl = (a, t, g, A, iy, imin, zs, W) => ({
  name: `L ${a}x${a}x${t}`, form: 'gleichschenklig',
  aH: a, aV: a, t, g, A, iy, iz: iy, imin, zsH: zs, zsV: zs, Wy: W, Wz: W,
});

/** @type {object[]} */
export const PROFILE = [
  //  a    t     g      A     iy   imin   zs     W
  gl( 45,  5,  3.38,  4.30, 1.38, 0.88, 1.28,   2.53),
  gl( 50,  5,  3.77,  4.80, 1.51, 0.97, 1.40,   3.05),
  gl( 60,  6,  5.42,  6.91, 1.82, 1.17, 1.69,   5.29),
  gl( 60,  8,  7.09,  9.03, 1.80, 1.16, 1.77,   6.88),
  gl( 70,  7,  7.38,  9.40, 2.12, 1.36, 1.97,   8.43),
  gl( 80,  8,  9.63, 12.30, 2.42, 1.56, 2.26,  12.58),
  gl( 80, 10, 11.90, 15.10, 2.41, 1.55, 2.34,  15.46),
  gl( 90,  9, 12.20, 15.50, 2.74, 1.75, 2.54,  17.96),
  gl(100, 10, 15.10, 19.20, 3.04, 1.95, 2.82,  24.65),
  gl(100, 12, 17.80, 22.70, 3.02, 1.94, 2.90,  29.15),
  gl(120, 12, 21.60, 27.50, 3.63, 2.33, 3.40,  42.21),
  gl(130, 12, 23.60, 30.00, 3.97, 2.56, 3.64,  50.43),
  gl(150, 15, 33.80, 43.00, 4.57, 2.93, 4.25,  83.53),
  gl(150, 18, 40.10, 51.00, 4.54, 2.92, 4.37,  98.78),
  gl(200, 20, 59.90, 76.30, 6.11, 3.93, 5.52, 196.82),

  // --- ungleichschenklig -------------------------------------------------
  // Einbaulage im Tragjoch J130 Untergurt: LANGER Schenkel liegend (120 mm
  // horizontal), kurzer Schenkel stehend (80 mm vertikal).
  {
    name: 'L 120x80x12', form: 'ungleichschenklig',
    aH: 120, aV: 80, t: 12, g: 17.80, A: 22.70,
    iy: 2.24, iz: 3.77, imin: 1.73,
    zsH: 2.05, zsV: 4.05,
    Wy: 18.90, Wz: 40.40,
    hinweis: 'Ungleichschenklig. Die Widerstandsmomente beziehen sich auf die ' +
             'schenkelparallelen Achsen bei liegendem 120-mm-Schenkel. Der ' +
             'Nachweis um die Hauptachsen ist gesondert zu führen.',
  },
  // Einbaulage im Tragjoch J130 der ALTBAUWEISE: LANGER Schenkel
  // liegend (130 mm horizontal), kurzer Schenkel stehend (80 mm vertikal).
  {
    name: 'L 130x80x12', form: 'ungleichschenklig',
    aH: 130, aV: 80, t: 12, g: 18.65, A: 23.76,
    iy: 2.24, iz: 4.14, imin: 1.73,
    zsH: 1.97, zsV: 4.47,
    Wy: 19.75, Wz: 47.76,
    hinweis: 'Ungleichschenklig, in den aktuellen Normprofilreihen nicht mehr ' +
             'enthalten. Die Querschnittswerte sind aus der Sollgeometrie ' +
             'gerechnet (zwei Rechtecke, ohne Ausrundungen) und liegen damit ' +
             'rund 2 % unter den Walzwerten – auf der sicheren Seite. Die ' +
             'Widerstandsmomente gelten für die schenkelparallelen Achsen bei ' +
             'liegendem 130-mm-Schenkel; der Nachweis um die Hauptachsen ist ' +
             'gesondert zu führen.',
  },
];

/** Stahlgüten nach SIA 263, Erzeugnisdicke t <= 40 mm. */
export const STAHLGUETEN = [
  { name: 'S235', fy: 235, fu: 360 },
  { name: 'S275', fy: 275, fu: 430 },
  { name: 'S355', fy: 355, fu: 490 },
];

export function getProfil(name) {
  const p = PROFILE.find((x) => x.name === name);
  if (!p) throw new Error(`Unbekanntes Profil: ${name}`);
  return p;
}

export function getStahl(name) {
  const s = STAHLGUETEN.find((x) => x.name === name);
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
 * UPE 200 und UPE 240 stammen aus derselben Quelle und sind damit
 * verdaechtig; ihre Zeilen sind angeschrieben. Zu pruefen im selben Editor.
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
const wp = (name, reihe, h, b, tw, tf, r, A, G, Iy, Wy, iy, Iz, Wz, iz, It, ey) =>
  ({ name, reihe, h, b, tw, tf, r, A, G, Iy, Wy, iy, Iz, Wz, iz, It,
     // Nur das U-Profil kennt eine Schwerpunktverschiebung; beim I liegt
     // die Achse mittig, und `ey` bleibt null.
     ey: ey ?? 0 });

export const GURTPROFILE = [
  //   name       reihe     h     b    t_w   t_f    r     A     G      I_y    W_y   i_y     I_z   W_z   i_z    I_t   e_y
  // UPE 160 am 3. September gegen den AxisVM-Querschnittseditor geprueft
  // und berichtigt - siehe den Kasten unter der Tabelle.
  wp('UPE 160', 'UPE', 16.0,  7.0, 0.55, 0.95, 1.00, 21.67, 17.0,  911.1, 113.9, 6.48, 106.83, 22.58, 2.22, 5.23, 1.84),
  wp('UPE 200', 'UPE', 20.0,  8.0, 0.60, 1.10, 1.10, 29.0, 22.8,  1910, 191.0, 8.12, 148.0, 27.0, 2.26, 20.4, 2.10),   // I_z, W_z, I_t UNGEPRUEFT
  wp('UPE 240', 'UPE', 24.0,  9.0, 0.70, 1.25, 1.20, 38.5, 30.2,  3600, 300.0, 9.67, 257.0, 39.9, 2.58, 32.5, 2.38),   // I_z, W_z, I_t UNGEPRUEFT
  /*
   * IPE 240 ist KEIN Gurtprofil - A240 traegt UPE 240. Es steht hier als
   * QUERSTEIFE: die Konstruktionszeichnung fuehrt bei A240 ein IPE 240 x 600
   * unter der Position «Querversteifung». Ohne seine Werte liesse sich der
   * Riegel an den QV-Grenzen nicht nachweisen.
   */
  wp('IPE 240', 'IPE', 24.0, 12.0, 0.62, 0.98, 1.50, 39.1, 30.7,  3892, 324.0, 9.97, 283.6, 47.3, 2.69, 12.9, 0),
  wp('IPE 270', 'IPE', 27.0, 13.5, 0.66, 1.02, 1.50, 45.9, 36.1,  5790, 429.0, 11.2, 420.0, 62.2, 3.02, 15.9, 0),
  wp('IPE 300', 'IPE', 30.0, 15.0, 0.71, 1.07, 1.50, 53.8, 42.2,  8356, 557.0, 12.5, 604.0, 80.5, 3.35, 20.1, 0),
  wp('IPE 330', 'IPE', 33.0, 16.0, 0.75, 1.15, 1.80, 62.6, 49.1, 11770, 713.0, 13.7, 788.0, 98.5, 3.55, 28.2, 0),
  wp('IPE 360', 'IPE', 36.0, 17.0, 0.80, 1.27, 1.80, 72.7, 57.1, 16270, 904.0, 15.0, 1043.0, 123.0, 3.79, 37.3, 0),
];

/** Ein Gurtprofil nach Namen. */
export function getGurtprofil(name) {
  const p = GURTPROFILE.find((x) => x.name === name);
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
  if (p.reihe !== 'UPE') return k - p.b;
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
