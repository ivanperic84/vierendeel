/**
 * data.masten.js
 * ---------------------------------------------------------------------------
 * REINE DATEN: H-Profile für Tragjochmaste (HEB / HEM) nach EN 10365.
 *
 *   h, b   Profilhöhe / Profilbreite                     [mm]
 *   A      Querschnittsfläche                            [cm2]
 *   Iy, Wy starke Achse (Biegung in der Stegebene)       [cm4] / [cm3]
 *   Iz, Wz schwache Achse (Biegung senkrecht zum Steg)   [cm4] / [cm3]
 *   It     Torsionsträgheitsmoment                       [cm4]
 *
 * >>> Werte vor der Abgabe gegen die eigene Profiltabelle verifizieren. <<<
 *
 * DIE LISTE BEGINNT BEI HEB 200 - das ist Absicht, kein Versehen.
 *
 * Der Bauteilsatz kennt einen Masttyp mit 0,512 kN/m, also HEB 180. Das
 * Profil hier zu ergaenzen waere eine Kleinigkeit; der Auftraggeber hat am
 * 28. August entschieden, es NOCH NICHT aufzunehmen. Wer die Luecke findet,
 * soll wissen, dass sie bekannt ist (UEBERGABE.md, «Entschieden - nicht
 * wieder aufmachen»).
 *
 * DER NAME IST DER PROFILNAME. Die Zuordnung zu den DP-Bezeichnungen des
 * Sortiments ist ueber Eigengewicht und Windlasten doppelt belegt, steht
 * aber bewusst NICHT im Waehler - «HEB 260» genuegt, ebenfalls entschieden.
 * ---------------------------------------------------------------------------
 */

export const MASTPROFILE = [
  { name: 'HEB 200', h: 200, b: 200, tw:  9.0, tf: 15.0, g:  61.3, A:  78.1,
    Iy:  5696, Wy:  570.0, iy:  8.54, Iz: 2003, Wz: 200.3, iz: 5.07, It: 59.3,
    wind: { quer: { EK1: 0.25, EK2: 0.31, EK3: 0.36 },
            laengs: { EK1: 0.25, EK2: 0.31, EK3: 0.36 } } },
  { name: 'HEB 220', h: 220, b: 220, tw:  9.5, tf: 16.0, g:  71.5, A:  91.0,
    Iy:  8091, Wy:  735.5, iy:  9.43, Iz: 2843, Wz: 258.5, iz: 5.59, It: 76.6,
    wind: { quer: { EK1: 0.28, EK2: 0.34, EK3: 0.40 },
            laengs: { EK1: 0.28, EK2: 0.34, EK3: 0.40 } } },
  { name: 'HEB 240', h: 240, b: 240, tw: 10.0, tf: 17.0, g:  83.2, A: 106.0,
    Iy: 11260, Wy:  938.3, iy: 10.31, Iz: 3923, Wz: 326.9, iz: 6.08, It: 102.7,
    wind: { quer: { EK1: 0.30, EK2: 0.37, EK3: 0.44 },
            laengs: { EK1: 0.30, EK2: 0.37, EK3: 0.44 } } },
  { name: 'HEB 260', h: 260, b: 260, tw: 10.0, tf: 17.5, g:  93.0, A: 118.4,
    Iy: 14920, Wy: 1148.0, iy: 11.22, Iz: 5135, Wz: 395.0, iz: 6.58, It: 123.8,
    wind: { quer: { EK1: 0.33, EK2: 0.40, EK3: 0.47 },
            laengs: { EK1: 0.33, EK2: 0.40, EK3: 0.47 } } },
  { name: 'HEM 240', h: 270, b: 248, tw: 18.0, tf: 32.0, g: 157.0, A: 199.6,
    Iy: 24290, Wy: 1799.0, iy: 11.03, Iz: 8153, Wz: 657.5, iz: 6.39, It: 627.9,
    wind: { quer: { EK1: 0.31, EK2: 0.38, EK3: 0.45 },
            laengs: { EK1: 0.34, EK2: 0.42, EK3: 0.49 } } },
];

/**
 * Ausrichtung des Maststegs relativ zur Jochachse.
 *
 * Für die EINSPANNUNG DES JOCHENDES ist die Biegung des Mastes IN DER
 * JOCHACHSE massgebend (der Mast muss sich quer zu den Gleisen verformen).
 *   - Steg in Jochachse  -> Biegung um die STARKE Achse  -> I_y
 *   - Steg 90 Grad dazu  -> Biegung um die SCHWACHE Achse -> I_z
 */
export const STEGRICHTUNGEN = [
  { key: 'jochachse', label: 'Steg in Jochachse (starke Achse quer)', achse: 'y' },
  { key: 'quer',      label: 'Steg um 90° gedreht (schwache Achse quer)', achse: 'z' },
];

/**
 * Windlast auf den Mast je Laufmeter [kN/m] aus der Lasttabelle.
 *
 * Massgebend für das Joch ist die Richtung QUER zum Gleis. Ist der Steg um
 * 90 Grad gedreht, tauscht das die beiden Richtungen - beim HEM 240 macht das
 * einen Unterschied, bei den übrigen Profilen nicht.
 */
export function mastWind(name, ek = 'EK2', steg = 'jochachse') {
  const w = getMastprofil(name).wind;
  if (!w) return null;
  const richtung = steg === 'quer' ? 'laengs' : 'quer';
  return w[richtung]?.[ek] ?? null;
}

export function getMastprofil(name) {
  const p = MASTPROFILE.find((x) => x.name === name);
  if (!p) throw new Error(`Unbekanntes Mastprofil: ${name}`);
  return p;
}

export function getStegrichtung(key) {
  const s = STEGRICHTUNGEN.find((x) => x.key === key);
  if (!s) throw new Error(`Unbekannte Stegrichtung: ${key}`);
  return s;
}
