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
 * soll wissen, dass sie bekannt ist (CLAUDE.md, «Entschieden - nicht
 * wieder aufmachen»).
 *
 * DER NAME IST DER PROFILNAME. Die Zuordnung zu den DP-Bezeichnungen des
 * Sortiments ist ueber Eigengewicht und Windlasten doppelt belegt, steht
 * aber bewusst NICHT im Waehler - «HEB 260» genuegt, ebenfalls entschieden.
 * ---------------------------------------------------------------------------
 */

import { ausTabellen } from './data.tabellen.js';
import { mastprofileNorm } from './data.normen.js';

let SORT = null;

/** Das Masten-Sortiment setzen (aus data/masten.json). */
export function setzeMastenDB(obj) {
  // Tabellenform (seit 16. September) oder Baumform - beides wird gelesen.
  SORT = ausTabellen(obj, 'masten');
  return SORT;
}

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
 * >>> DIE FUNDAMENTE, UND WELCHER MAST AUF WELCHEM STEHT. <<<
 * =========================================================================
 *
 * Weisung vom 24. September: «die Fundamentzuordnug zu den einzelnen
 * Masttypen. Diese kannst du unter Grundlagen Einwirkungen finden im pdf
 * zulässige Standardlsten (die Gelängeneigung nicht berücksichtigen).»
 *
 * Die Tabelle führt die zulässigen Lasten am FUNDAMENTKOPF, als
 * CHARAKTERISTISCHE Werte - dieselbe Bauart wie beim Seilanker, und aus
 * demselben Grund ohne Teilsicherheitsbeiwerte.
 *
 * >>> WIE DIE ZUORDNUNG ZUSTANDE KOMMT. <<<
 *
 * Die Quelle ordnet nach MASTTYP (DP20, DP22, …), die Anwendung führt
 * ihre Masten seit dem 28. August unter dem PROFILNAMEN. Die Brücke ist
 * gemessen, nicht geraten: die Windlasten je Einwirkungsklasse in
 * data/fl_bauteile.json stimmen ziffernweise mit denen der Profile.
 *
 *   DP20 0.25/0.31/0.36 = HEB 200     DP24 0.30/0.37/0.44 = HEB 240
 *   DP22 0.28/0.34/0.40 = HEB 220     DP26 0.33/0.40/0.47 = HEB 260
 *   DPM24 quer 0.31 / längs 0.34 = HEM 240
 *   DPM24-P mit vertauschten Werten  = HEM 240, um 90° gedreht
 *
 * Beim HEM 240 entscheidet deshalb die STEGRICHTUNG mit: er ist das
 * einzige Mastprofil, das nicht quadratisch ist (270 × 248 mm), und die
 * beiden Fundamente HP1a/HP2a haben Mq und Ml vertauscht - 230/154 gegen
 * 154/230 kNm. Ein gedrehter Mast auf dem ungedrehten Fundament wäre um
 * die starke Achse um ein Drittel zu schwach nachgewiesen.
 *
 * Die DG-Typen (Doppelmasten) stehen in der Tabelle, tragen aber kein
 * Profil: das Sortiment der Anwendung führt sie nicht. Sie lassen sich
 * von Hand wählen, sie werden nur nicht selbst gefunden.
 * ========================================================================= */

/** Alle Fundamenttypen des Sortiments. */
export const fundamenttypen = () => SORT?.fundamente ?? [];

/** Ob die Fundamenttabelle geladen ist. */
export const fundamenteDa = () => Boolean(SORT?.fundamente?.length);

/** Ein Fundamenttyp nach Namen, oder null. */
export function getFundament(typ) {
  const n = String(typ ?? '').trim();
  if (!n) return null;
  return fundamenttypen().find((f) => f.typ === n) ?? null;
}

/**
 * DAS FUNDAMENT ZU EINEM MASTEN - Profil und Stegrichtung entscheiden.
 *
 * Die Spalte `profile` führt die Profilnamen, `steg` die Stegrichtung,
 * WO SIE ENTSCHEIDET (nur beim HEM 240). Steht dort nichts, gilt die
 * Zeile für beide Lagen.
 *
 * Passt keine Zeile, kommt null - und das ist eine Auskunft, kein
 * Fehler: ein Profil ohne Standardfundament braucht ein Sonderfundament,
 * und das rechnet dieses Werkzeug nicht.
 */
export function fundamentFuerMast(profil, stegrichtung = 'jochachse') {
  const p = String(profil ?? '').trim();
  if (!p) return null;
  const steg = String(stegrichtung ?? 'jochachse').trim() || 'jochachse';
  const passt = fundamenttypen().filter((f) => String(f.profile ?? '')
    .split(',').map((x) => x.trim()).filter(Boolean).includes(p));
  if (!passt.length) return null;
  // Eine Zeile mit ausdruecklicher Stegrichtung geht vor der allgemeinen.
  return passt.find((f) => String(f.steg ?? '').trim() === steg)
      ?? passt.find((f) => !String(f.steg ?? '').trim())
      ?? null;
}

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

/**
 * Der Wind auf den Masten in BEIDEN Richtungen [kN/m].
 *
 * >>> EINE STELLE, ZWEI ZAHLEN. <<<
 *
 * Der Kern rechnet den Masten seit dem 27. August in beiden Richtungen an:
 * `x` in der Jochachse (quer zum Gleis), `y` in Gleisrichtung. Welche Spalte
 * der Tabelle welche Richtung ist, entscheidet die STEGRICHTUNG - und diese
 * Zuordnung stand bisher nur im Rechenkern (`mastWindSatz`). Die Maske
 * zeigte deshalb nur den einen Wert, gemeldet am 20. September: «hier ist
 * die windlast in y nicht aufgefuehrt beim einzelmasten.»
 *
 * Zwei Stellen, die dieselbe Zuordnung selbst herleiten, laufen frueher oder
 * spaeter auseinander. Also steht sie hier, und Kern wie Maske fragen sie.
 *
 * @returns {{jochachse:number|null, gleis:number|null}} kN/m, `null` wenn
 *          das Profil keine Windzeile in der Tabelle hat.
 */
export function mastWindBeide(name, ek = 'EK2', steg = 'jochachse') {
  const gegen = steg === 'quer' ? 'jochachse' : 'quer';
  return { jochachse: mastWind(name, ek, steg), gleis: mastWind(name, ek, gegen) };
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
