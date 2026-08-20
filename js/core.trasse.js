/**
 * core.trasse.js
 * ---------------------------------------------------------------------------
 * RECHENKERN: Umlenkkräfte aus dem Bogen.
 * Reine Funktionen, kein DOM.
 *
 * WORUM ES GEHT
 * Liegt das Gleis im Bogen, läuft die Fahrleitung nicht gerade durch: an jeder
 * Aufhängung knickt sie um den Ablenkwinkel α. Die beiden Leiterzugkräfte der
 * angrenzenden Spannweiten haben deshalb eine Resultierende quer zum Gleis -
 * am Tragjoch also in RICHTUNG DER JOCHACHSE.
 *
 *      α = 2 · arcsin( L / (2R) )        Ablenkwinkel
 *      U = 2 · Z · sin(α/2) = Z · L/R    Umlenkkraft
 *
 * Die zweite Gleichheit ist EXAKT und keine Näherung: aus
 * α/2 = arcsin(L/2R) folgt sin(α/2) = L/(2R), also 2·sin(α/2) = L/R.
 *
 *   L  Spannweite der Fahrleitung zwischen zwei Aufhängungen [m]
 *   R  Radius der Trasse [m], VORZEICHENBEHAFTET (siehe unten)
 *   Z  Leiterzugkraft des Drahtwerks bei T + 5 °C [kN]
 *
 * Die Umlenkkraft ist eine STÄNDIGE Einwirkung - der Leiterzug steht immer an,
 * unabhängig von Wind und Schnee. Sie läuft deshalb in der Gruppe G.
 *
 * WIRKUNGSRICHTUNG
 * Eine ständige Einwirkung hat eine feste Wirkrichtung; sie wird nicht über
 * einen Schalter "günstig / ungünstig" umgedreht. Die Richtung steckt in der
 * GEOMETRIE, und deshalb im VORZEICHEN:
 *
 *   R > 0  bzw.  α > 0   Umlenkung in +x  (in Richtung der Jochachse)
 *   R < 0  bzw.  α < 0   Umlenkung in −x  (Joch auf der anderen Bogenseite)
 *
 * Ohne eigenen Winkel folgt α aus R und L. Ein am Modul gesetzter Winkel
 * überschreibt beides - dann gilt sein Vorzeichen. So steht die Bogenseite
 * dort, wo sie hingehört: beim einzelnen Drahtwerk und nicht als globaler
 * Schalter über das ganze Joch.
 *
 * Der frühere Schalter "günstig / ungünstig" stammte aus der Mastberechnung.
 * Er war dort nötig, weil der Wind nur von EINER Seite angesetzt wurde. Der
 * Wind wird jetzt in beiden Richtungen geführt (core.lasten.js: Gruppen
 * Wind x und Wind y mit ± Beiwerten); der Schalter ist damit entfallen.
 *
 * Quelle: Einwirkungsblatt des Fahrleitungs-Tragwerks der Datenbasis.
 * ---------------------------------------------------------------------------
 */

/** Gerade gilt ab diesem Betrag des Radius als gerade [m]. */
export const R_GERADE = 100000;

/**
 * Ablenkwinkel der Fahrleitung an einer Aufhängung.
 *
 * Vorzeichenbehaftet: ein negativer Radius liefert einen negativen Winkel und
 * damit eine Umlenkung in −x.
 *
 * @param {number} L Spannweite [m]
 * @param {number} R Radius [m], Vorzeichen = Bogenseite
 * @returns {number} Winkel [rad]; 0 bei geradem Gleis
 */
export function ablenkwinkel(L, R) {
  if (!Number.isFinite(R) || R === 0 || !(L > 0)) return 0;
  const s = L / (2 * R);
  if (Math.abs(s) >= 1) return Math.sign(s) * Math.PI;  // nicht mehr sinnvoll
  return 2 * Math.asin(s);
}

/**
 * Umlenkfaktor: Resultierende je Einheit Leiterzugkraft, vorzeichenbehaftet.
 * Ohne eigenen Winkel gilt der Bogen, sonst der von Hand gesetzte Winkel.
 *
 * @param {object} o {L, R, winkel} winkel [°] überschreibt den Bogen
 */
export function umlenkfaktor({ L, R, winkel = null }) {
  if (Number.isFinite(winkel) && winkel !== 0) {
    // Von Hand gesetzter Ablenkwinkel: dieselbe Formel, nur mit diesem Winkel.
    return 2 * Math.sin((winkel * Math.PI) / 180 / 2);
  }
  if (!Number.isFinite(R) || R === 0 || !(L > 0)) return 0;
  return L / R;
}

/**
 * Umlenkkraft eines Drahtwerks quer zum Gleis (= in Jochachse).
 *
 * @param {object} o {Z, L, R, winkel, anteil}
 *   Z       Leiterzugkraft [kN]
 *   anteil  Anteil, der auf dieses Tragwerk entfällt (Regelfall 1)
 * @returns {{U:number, alpha:number, faktor:number}} U [kN], alpha [°]
 */
export function umlenkkraft({ Z, L, R, winkel = null, anteil = 1 }) {
  const faktor = umlenkfaktor({ L, R, winkel });
  const alphaRad = Number.isFinite(winkel) && winkel !== 0
    ? (winkel * Math.PI) / 180 : ablenkwinkel(L, R);
  return {
    U: (Z ?? 0) * faktor * (anteil ?? 1),
    alpha: (alphaRad * 180) / Math.PI,
    faktor,
  };
}

/** Liegt praktisch ein gerades Gleis vor? */
export const istGerade = (R) =>
  !Number.isFinite(R) || R === 0 || Math.abs(R) >= R_GERADE;
