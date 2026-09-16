/**
 * data.masten.js
 * ---------------------------------------------------------------------------
 * DER ZUGRIFF auf die Mastprofile. Die Querschnittswerte stehen in
 * data/normen.json (Norm), die Windlasten in data/masten.json (Sortiment).
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

import { mastprofileNorm } from './data.normen.js';

let SORT = null;

/** Das Masten-Sortiment setzen (aus data/masten.json). */
export function setzeMastenDB(obj) { SORT = obj; return SORT; }

/** Der ganze Bestand - fuer das Datenpaket. */
export const mastenDB = () => SORT;

/**
 * Das Sortiment laden - eingebettet oder daneben liegend.
 *
 * Sein Fehlen ist KEIN Fehler: ohne Sortiment bleiben die Querschnittswerte
 * aus normen.json, nur die Windlast fehlt dann. `mastWind` sagt es (null),
 * statt eine Last zu erfinden.
 */
export async function ladeMasten(pfad = 'data/masten.json') {
  if (SORT) return SORT;
  if (typeof document !== 'undefined') {
    const eingebettet = document.getElementById('masten-db');
    const roh = eingebettet?.textContent?.trim();
    if (roh) return setzeMastenDB(JSON.parse(roh));
  }
  try {
    const antwort = await fetch(pfad);
    if (antwort.ok) return setzeMastenDB(await antwort.json());
  } catch { /* ohne Sortiment weiter */ }
  return null;
}

/** Ob ein Masten-Sortiment geladen ist. */
export const mastenDbDa = () => Boolean(SORT?.typen?.length);

/* ===========================================================================
 * >>> ZWEI QUELLEN FUER EINEN MASTEN. <<<
 * ===========================================================================
 *
 * Weisung vom 16. September: «die ui und die [Betreiber]daten sollen getrennt
 * sein.» Beim Masten verläuft diese Grenze MITTEN DURCH DEN DATENSATZ, und
 * das ist kein Schoenheitsfehler, sondern die Sache selbst:
 *
 *   I_y, I_t, A, h, b   stehen in EN 10365. Ein HEB 240 hat sie überall.
 *                       -> data/normen.json, verfolgt, oeffentlich
 *   Windlast je EK      ist eine Festlegung des Betreibers.
 *                       -> data/masten.json, oertlich
 *
 * Bis zum 16. September standen beide in EINEM Literal in dieser Datei -
 * die Normwerte also mitten in den Betreiberdaten, und die Betreiberdaten
 * mitten im Quelltext. Beides ist jetzt getrennt und wird hier wieder
 * zusammengefügt.
 *
 * DIE REIHENFOLGE KOMMT AUS DEM SORTIMENT. Welche Profile es gibt, sagt der
 * Betreiber; die Normtabelle darf mehr führen, ohne dass sie im Wähler
 * auftauchen. Fehlt das Sortiment ganz, gelten alle Normprofile - ohne
 * Wind. So bleibt die Anwendung bedienbar, statt mit leerem Wähler
 * dazustehen.
 * ========================================================================= */
export function mastprofile() {
  const norm = mastprofileNorm();
  if (!mastenDbDa()) return norm;
  const aus = [];
  for (const t of SORT.typen) {
    const p = norm.find((x) => x.name === t.profil);
    /*
     * EIN SORTIMENTSTYP OHNE QUERSCHNITTSWERTE WIRD UEBERGANGEN, nicht
     * erfunden. Er taucht dann im Wähler nicht auf - und der Feldkatalog
     * meldet die Luecke beim Pruefen des Bestandes.
     */
    if (p) aus.push({ ...p, wind: t.wind ?? null });
  }
  return aus.length ? aus : norm;
}

/**
 * Ausrichtung des Maststegs relativ zur Jochachse.
 *
 * Für die EINSPANNUNG DES JOCHENDES ist die Biegung des Mastes IN DER
 * JOCHACHSE massgebend (der Mast muss sich quer zu den Gleisen verformen).
 *   - Steg in Jochachse  -> Biegung um die STARKE Achse  -> I_y
 *   - Steg 90 Grad dazu  -> Biegung um die SCHWACHE Achse -> I_z
 */
export const STEGRICHTUNGEN = [
  // Benannt nach dem GLEIS, nicht nach der Jochachse (Weisung, 1. September):
  // «in Jochachse» und «um 90 Grad gedreht» sagen nichts darüber, wie der Mast
  // zum Gleis steht. Die Schlüssel bleiben, damit gespeicherte Stände gelten.
  { key: 'jochachse',
    label: 'Steg quer zum Gleis, starke Achse quer', achse: 'y' },
  { key: 'quer',
    label: 'Steg längs zum Gleis, schwache Achse quer', achse: 'z' },
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
  const p = mastprofile().find((x) => x.name === name);
  if (!p) throw new Error(`Unbekanntes Mastprofil: ${name}`);
  return p;
}

export function getStegrichtung(key) {
  const s = STEGRICHTUNGEN.find((x) => x.key === key);
  if (!s) throw new Error(`Unbekannte Stegrichtung: ${key}`);
  return s;
}
