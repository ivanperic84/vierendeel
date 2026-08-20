/**
 * core.winkel.js
 * ---------------------------------------------------------------------------
 * SPANNUNG IM WINKELPROFIL - an den Querschnittspunkten, nicht über W.
 *
 * WARUM DAS NÖTIG IST
 * Ein Winkel hat seine Hauptachsen unter rund 45 Grad zu den Schenkeln. Ein
 * Moment um die schenkelparallele Achse - und genau so entsteht es im
 * Vierendeel-Rahmen - zerfällt deshalb in zwei Komponenten, und die
 * Randspannung ist deutlich grösser als M/W_schenkelparallel:
 *
 *      L 100x100x10   Faktor 1.39        L 80x80x8   Faktor 1.39
 *
 * Der Vergleich mit einem AxisVM-Modell macht das sichtbar: dort wird die
 * Spannung an den Querschnittspunkten geführt, hier bis jetzt über ein
 * einziges Widerstandsmoment. Das Handbuch nannte es als Grenze - für ein
 * Werkzeug, das fünf Prozent treffen soll, ist es ein systematischer Fehler.
 *
 * WIE GERECHNET WIRD
 * Schiefe Biegung im schenkelparallelen System, ohne Umweg über die
 * Hauptachsen:
 *
 *      σ(y,z) = N/A
 *             + (M_y·I_z + M_z·I_yz)/(I_y·I_z − I_yz²) · z
 *             − (M_z·I_y + M_y·I_yz)/(I_y·I_z − I_yz²) · y
 *
 * Ausgewertet an den sechs Eckpunkten des Winkels; massgebend ist der
 * grösste Betrag.
 *
 * WOHER I_yz KOMMT
 * Es steht in keiner Profiltabelle dieses Werkzeugs, folgt aber aus den
 * vorhandenen Werten. Mit I_2 = i_min²·A und der Invarianz der Spur:
 *
 *      I_1 = I_y + I_z − I_2          I_yz² = I_y·I_z − I_1·I_2
 *
 * Gegenprobe am L 100x100x10: 1 766 604 − 730 023 = 1 036 581 mm⁴ - auf die
 * Stelle der Wert, den AxisVM für I_yz ausweist.
 *
 * VORZEICHEN
 * Beide Schenkel zeigen vom Fersenpunkt in +y und +z; dann ist I_yz negativ.
 * Die Vorzeichen der Momente selbst spielen keine Rolle: ausgewertet wird die
 * Hüllkurve über ±M_y und ±M_z, weil der Rechenkern die Momente ohnehin als
 * Beträge führt. Das ist zugleich die sichere Seite.
 * ---------------------------------------------------------------------------
 */

import { U } from './core.constants.js';

/**
 * Querschnittswerte und Eckpunkte eines Winkels, bezogen auf den Schwerpunkt.
 *
 * Alle Längen in mm, Flächen in mm², Trägheitsmomente in mm⁴ - im Gegensatz
 * zur Profiltabelle, die in cm rechnet.
 *
 * @param {object} p Profil aus data.profiles.js
 */
const SPEICHER = new Map();

/** Werte je Profil nur einmal rechnen - sie hängen an nichts sonst. */
export function winkelwerteFuer(p) {
  const k = p.name;
  if (!SPEICHER.has(k)) SPEICHER.set(k, winkelwerte(p));
  return SPEICHER.get(k);
}

export function winkelwerte(p) {
  const A = p.A * U.cm2__mm2;
  const aH = p.aH ?? p.a, aV = p.aV ?? p.a, t = p.t;
  const zsV = (p.zsV ?? p.zs) * U.cm__mm;      // Schwerpunkt in y (liegender Schenkel)
  const zsH = (p.zsH ?? p.zs) * U.cm__mm;      // Schwerpunkt in z (stehender Schenkel)
  const Iy = (p.iy * U.cm__mm) ** 2 * A;
  const Iz = ((p.iz ?? p.iy) * U.cm__mm) ** 2 * A;
  const I2 = (p.imin * U.cm__mm) ** 2 * A;
  const I1 = Iy + Iz - I2;
  // Zahlenrauschen der Tabellenwerte kann das Argument knapp negativ machen.
  const Iyz = -Math.sqrt(Math.max(0, Iy * Iz - I1 * I2));

  // Sechs Ecken, ab der Ferse, danach auf den Schwerpunkt bezogen.
  const punkte = [
    [0, 0], [aH, 0], [aH, t], [t, t], [t, aV], [0, aV],
  ].map(([y, z]) => ({ y: y - zsV, z: z - zsH }));

  return { A, Iy, Iz, I1, I2, Iyz, punkte, aH, aV, t, zsV, zsH, profil: p.name };
}

/**
 * Grösste Randspannung aus N, M_y und M_z [kN, kNm] -> N/mm².
 *
 * Ausgewertet wird die Hüllkurve über die Vorzeichen der beiden Momente:
 * der Rechenkern führt sie als Beträge, und welche Ecke massgebend wird,
 * hängt am Drehsinn. Vier Vorzeichenpaare, sechs Punkte - 24 Auswertungen,
 * die niemand bemerkt.
 *
 * @param {object} w  aus winkelwerte()
 * @param {number} N  Normalkraft [kN]
 * @param {number} My Moment um die schenkelparallele y-Achse [kNm]
 * @param {number} Mz Moment um die schenkelparallele z-Achse [kNm]
 * @returns {{sig:number, punkt:object, sigN:number}}
 */
export function randspannung(w, N, My, Mz) {
  const nenner = w.Iy * w.Iz - w.Iyz * w.Iyz;
  const sigN = (N * U.kN__N) / w.A;                       // N/mm²
  if (!(nenner > 0)) {
    return { sig: Math.abs(sigN), punkt: null, sigN };
  }
  const my = Math.abs(My) * U.kNm__Nmm;
  const mz = Math.abs(Mz) * U.kNm__Nmm;

  let sig = 0, punkt = null;
  [+1, -1].forEach((sy) => [+1, -1].forEach((sz) => {
    const Myv = sy * my, Mzv = sz * mz;
    const ky = (Myv * w.Iz + Mzv * w.Iyz) / nenner;
    const kz = (Mzv * w.Iy + Myv * w.Iyz) / nenner;
    w.punkte.forEach((pt) => {
      // Normalkraft mit ihrem Betrag: sie kommt aus einer Hüllkurve und darf
      // die Biegung nicht rechnerisch entlasten.
      const s = Math.abs(sigN) + Math.abs(ky * pt.z - kz * pt.y);
      if (s > sig) { sig = s; punkt = pt; }
    });
  }));
  return { sig, punkt, sigN };
}

/**
 * Wirksames Widerstandsmoment bei reiner schenkelparalleler Biegung.
 * Nur zur Einordnung und für die Anzeige - der Nachweis läuft über
 * randspannung().
 */
export function wirksamesW(w) {
  const r = randspannung(w, 0, 1, 0);          // 1 kNm
  return r.sig > 0 ? U.kNm__Nmm / r.sig : Infinity;   // mm³
}
