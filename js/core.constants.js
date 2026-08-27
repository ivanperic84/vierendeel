/**
 * core.constants.js
 * ---------------------------------------------------------------------------
 * Normative Konstanten und Umrechnungsfaktoren an EINER Stelle.
 * Nichts davon darf irgendwo im Rechenkern als Zahlenliteral auftauchen.
 *
 * Die Grenzwerte der Querschnittsklassifizierung stehen in core.klassen.js.
 * ---------------------------------------------------------------------------
 */

/** Einheitenumrechnung. Alle Spannungen im Kern in N/mm². */
export const U = {
  /** kN / cm²  ->  N/mm² */
  kN_cm2__N_mm2: 10,
  /** kNm / cm³ ->  N/mm² */
  kNm_cm3__N_mm2: 1000,
  /** kNm -> Nmm */
  kNm__Nmm: 1e6,
  /** kN -> N */
  kN__N: 1e3,
  /** m -> mm */
  m__mm: 1e3,
  /** m -> cm */
  m__cm: 1e2,
  /** cm -> mm */
  cm__mm: 10,
  /** cm² -> mm² */
  cm2__mm2: 100,
  /** Erdbeschleunigung [m/s²] für die Eigengewichtsinfo */
  g: 9.81,
};

/** Schubspannungsverteilung Rechteckquerschnitt: tau_max = FAKTOR * V / A */
export const RECHTECK = {
  TAU_FAKTOR: 1.5,
  /** W = t * h² / W_NENNER */
  W_NENNER: 6,
};

/** Numerische Toleranz für Knotenvergleiche [m]. */
export const TOL = 1e-7;

/**
 * Die Verortung als eine Zeile — leer, wenn nichts eingetragen ist.
 *
 * Eine Stelle, viele Leser: Überschrift, Bericht, Excel, AxisVM-Bezeichnung
 * und Dateiname. Was fehlt, fällt weg; drei leere Trennzeichen sagen nichts.
 *
 * @param {object} w Eingabe oder Modell
 * @param {string} trenner
 */
export function verortung(w, trenner = ' · ') {
  // REIHENFOLGE LINIE - ORT - KM (Weisung). Vom Groben zum Feinen: die Linie
  // sagt, wo im Netz, der Ort, wo an der Linie, der Kilometer, wo genau.
  return [
    w?.linie ? `Linie ${String(w.linie).trim()}` : null,
    w?.ortschaft ? String(w.ortschaft).trim() : null,
    w?.km ? `KM ${String(w.km).trim()}` : null,
  ].filter(Boolean).join(trenner);
}

/** Dieselben Angaben für einen Dateinamen: ohne Leerzeichen und Sonderzeichen. */
export function verortungKurz(w) {
  const rein = (v) => String(v ?? '').trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '');
  return [w?.linie ? `L${rein(w.linie)}` : null,
          rein(w?.ortschaft) || null,
          w?.km ? `KM${rein(w.km)}` : null].filter(Boolean).join('_');
}

/**
 * DIE MASSKETTE DER QUERPROFIL-ZEICHNUNG.
 *
 * Über dem Joch steht auf MANCHEN Zeichnungen eine Kette von Massen in
 * Zentimetern ab dem linken Jochende - beim Schulungsbeispiel
 * «0 15 209 474 735 885 983 1185 1200». Das sind die Stellen, an denen
 * wirklich etwas hängt: genau die Zahl, die jede Baugruppe als Lage `x`
 * braucht.
 *
 * Sie wird deshalb nicht abgegriffen, sondern abgeschrieben - einmal, als
 * Zeile. Danach fängt die Eingabe darauf: wer 2.07 einstellt, bekommt 2.09,
 * weil dort das Bauteil sitzt und nicht daneben.
 *
 * SIE STEHT NICHT AUF JEDEM BLATT. Damit ist sie eine Beigabe und kein Weg:
 * wo sie fehlt, wird auf der Zeichnung gemessen. Eine leere Eingabe ist der
 * Normalfall und keine Beanstandung - ohne Kette fängt nichts, und nichts
 * beschwert sich.
 *
 * GELESEN WIRD GROSSZÜGIG. Abgeschrieben wird von Hand, und dabei entsteht
 * jede Schreibweise: Leerzeichen, Komma, Strichpunkt, Zeilenumbruch. Getrennt
 * wird an allem, was keine Zahl ist.
 *
 * @param {string} text Masse in cm, wie auf der Zeichnung
 * @param {number} L Jochlänge [m] - zum Gegenlesen
 * @returns {{werte:number[], hinweis:string|null}} werte in METERN, aufsteigend
 */
export function massketteLesen(text, L = 0) {
  const roh = String(text ?? '')
    .split(/[^0-9.,]+/).filter(Boolean)
    .map((t) => parseFloat(t.replace(',', '.')))
    .filter((v) => Number.isFinite(v) && v >= 0);
  const werte = [...new Set(roh.map((v) => Math.round(v * 10) / 1000))]
    .sort((a, b) => a - b);
  if (!werte.length) return { werte: [], hinweis: null };
  /*
   * DAS LETZTE MASS IST DIE JOCHLÄNGE - und damit die Gegenprobe.
   *
   * Stimmt es nicht, ist entweder die Kette aus einer anderen Zeichnung, die
   * Jochlänge falsch eingestellt, oder es wurden Millimeter abgeschrieben
   * statt Zentimeter. Alle drei würden sonst still danebenliegen.
   */
  const ende = werte[werte.length - 1];
  const hinweis = L > 0 && Math.abs(ende - L) > 0.02
    ? `Die Kette endet bei ${ende.toFixed(2)} m, das Joch ist ${L.toFixed(2)} m `
      + 'lang. Sind es Zentimeter, und gehört die Kette zu diesem Joch?'
    : null;
  return { werte, hinweis };
}

/**
 * Auf die nächste Stelle der Masskette fangen.
 *
 * Die Grenze ist nie grösser als die halbe Lücke zum Nachbarn: bei zwei eng
 * benachbarten Massen - 15 und 209 sind weit, aber es gibt engere - soll
 * nicht das eine das andere überdecken. Wer zwischen zwei Stellen zielt,
 * bekommt die nähere, und wer weit daneben liegt, behaelt seinen Wert.
 *
 * @returns {number} der gefangene oder der ursprüngliche Wert
 */
export function fangeAufMasskette(x, kette, grenze = 0.20) {
  if (!Array.isArray(kette) || !kette.length || !Number.isFinite(x)) return x;
  let beste = null, abstand = Infinity;
  kette.forEach((k, i) => {
    const d = Math.abs(x - k);
    if (d >= abstand) return;
    // Halbe Lücke zum näheren Nachbarn, höchstens die Grenze.
    const links = i > 0 ? k - kette[i - 1] : Infinity;
    const rechts = i < kette.length - 1 ? kette[i + 1] - k : Infinity;
    const eigen = Math.min(grenze, Math.min(links, rechts) / 2);
    if (d <= eigen) { beste = k; abstand = d; }
  });
  return beste === null ? x : beste;
}
