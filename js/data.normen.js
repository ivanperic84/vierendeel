/**
 * data.normen.js
 * ---------------------------------------------------------------------------
 * DIE NORMWERTE: Querschnittswerte der Profile und die Stahlgüten.
 *
 * Weisung vom 16. September: «alle relevanten tragwerksdaten werden
 * ausschliesslich über die datenbank gesteuert, es soll nichts hardcoded in
 * der app sein. die ui und die [Betreiber]daten sollen getrennt sein.»
 *
 * >>> WARUM DIESE ZAHLEN EINE EIGENE DATEI HABEN. <<<
 *
 * Sie stammen aus Profilnormen (EN 10056-1, EN 10365, DIN 1026-2) und aus
 * der SIA 263. Sie gehören niemandem: ein HEB 240 hat überall dasselbe
 * I_y. Das Sortiment dagegen — welche Typen es gibt, was sie wiegen, welche
 * Last auf sie anzusetzen ist — stammt aus den Unterlagen des Betreibers
 * und bleibt örtlich.
 *
 * Deshalb zwei Ablagen und nicht eine:
 *
 *   data/normen.json   Normwerte. Darf in einer öffentlichen Ablage liegen
 *                      und ist dort auch verfolgt.
 *   data/*.json übrig  Sortiment des Betreibers. Bleibt draussen und kommt
 *                      als Datenpaket (js/data.paket.js).
 *
 * Das ist die Trennung, die die Weisung verlangt. Sie verläuft nicht
 * zwischen «Code» und «Daten» — dort verlief sie schon —, sondern zwischen
 * dem, was allgemein gilt, und dem, was einem Betreiber gehört.
 *
 * >>> BIS ZUM 16. SEPTEMBER STANDEN DIESE TABELLEN IM QUELLTEXT. <<<
 *
 * Fünfzehn Winkel, acht Walzprofile, fünf Mastprofile und drei Stahlgüten,
 * als Literale in data.profiles.js und data.masten.js. Wer ein Profil
 * ergänzen wollte, musste den Quelltext ändern und neu bündeln — und wer
 * die Anwendung ohne Datenpaket weitergab, gab die Zahlen trotzdem mit.
 *
 * Die Werte sind beim Umzug NICHT abgeschrieben worden: data/normen.json
 * ist aus den damaligen Modulen erzeugt. Eine Zahl konnte sich dabei nicht
 * ändern, und der Referenzlauf hat es bestätigt.
 *
 * >>> OHNE NORMWERTE RECHNET DIE ANWENDUNG NICHT. <<<
 *
 * Anders als beim Sortiment ist ihr Fehlen KEIN erlaubter Zustand: ohne
 * Querschnittswerte gibt es keinen Nachweis, nur eine leere Oberfläche.
 * `normen()` wirft deshalb, statt still einen Ersatzwert zu liefern — ein
 * angenommenes I_y wäre eine erfundene Tragfähigkeit.
 * ---------------------------------------------------------------------------
 */

let DB = null;

/** Die Normwerte setzen (aus data/normen.json). */
export function setzeNormen(obj) {
  if (!obj || !Array.isArray(obj.winkelprofile) || !obj.winkelprofile.length) {
    throw new Error('Normwerte ungültig: Feld "winkelprofile" fehlt oder ist leer.');
  }
  DB = obj;
  return DB;
}

/**
 * Die Normwerte laden - eingebettet oder daneben liegend.
 *
 * Dasselbe Muster wie beim Sortiment: die gebündelte Datei trägt sie in
 * einem script-Element, die Modulfassung holt sie per fetch.
 */
export async function ladeNormen(pfad = 'data/normen.json') {
  if (DB) return DB;
  if (typeof document !== 'undefined') {
    const eingebettet = document.getElementById('normen-db');
    const roh = eingebettet?.textContent?.trim();
    if (roh) return setzeNormen(JSON.parse(roh));
  }
  const antwort = await fetch(pfad);
  if (!antwort.ok) {
    throw new Error(`Normwerte nicht gefunden (${pfad}). Ohne sie gibt es `
                  + 'keine Querschnittswerte und damit keinen Nachweis.');
  }
  return setzeNormen(await antwort.json());
}

/** Ob die Normwerte geladen sind. */
export const normenDbDa = () => Boolean(DB?.winkelprofile?.length);

/** Der Bestand - oder eine Meldung, die sagt, was fehlt. */
export function normen() {
  if (!DB) {
    throw new Error('Die Normwerte sind nicht geladen (data/normen.json). '
                  + 'Ohne Querschnittswerte lässt sich nichts nachweisen.');
  }
  return DB;
}

/* ---------------------------------------------------------------------------
 * DIE VIER TABELLEN.
 *
 * Als Funktionen, nicht als Konstanten: eine Konstante stünde beim Laden des
 * Moduls fest, und geladen wird das Modul, bevor die Datei da ist. Wer eine
 * Liste braucht, holt sie im Augenblick des Gebrauchs.
 * ------------------------------------------------------------------------- */

/** Winkelprofile (L) - die vier Gurte eines Tragjochs. Masse in mm, Werte in cm. */
export const winkelprofile = () => normen().winkelprofile ?? [];

/** Walzprofile (UPE/IPE) - Gurte und Quersteifen der Abfangjoche. Masse in cm. */
export const walzprofile = () => normen().walzprofile ?? [];

/** Mastprofile (HEB/HEM) - NUR die Querschnittswerte. Masse in mm. */
export const mastprofileNorm = () => normen().mastprofile ?? [];

/** Stahlgüten nach SIA 263, Erzeugnisdicke t <= 40 mm. */
export const stahlgueten = () => normen().stahlgueten ?? [];
