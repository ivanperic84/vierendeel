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
