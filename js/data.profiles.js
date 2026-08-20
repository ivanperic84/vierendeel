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
