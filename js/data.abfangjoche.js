/**
 * data.abfangjoche.js
 * ---------------------------------------------------------------------------
 * DAS SORTIMENT DER ABFANGJOCHE.
 *
 * Ein Abfangjoch nimmt die LEITERZUGKRÄFTE auf, nicht das Gewicht der
 * Fahrleitung. Es wird über einem Tragjoch montiert, auf denselben Masten,
 * und mehrere übereinander sind der Regelfall.
 *
 * >>> ES IST EIN LIEGENDER VIERENDEELTRÄGER. <<<
 *
 * Weisung vom 3. September: «Die Abfangjoche sind liegende Vierendeelträger.»
 * Der Schnitt A-A der Sortimentsblätter zeigt es: ZWEI Profile Rücken an
 * Rücken (UPE, ab A270 IPE), lichter Abstand d, verbunden durch Sprossen im
 * 500er-Raster. Gurte und Pfosten ohne Diagonalen — ein Vierendeel-Rahmen,
 * nur eben in EINER Ebene statt in zweien, und diese Ebene LIEGT.
 *
 * Das dreht die Tragwirkung gegenüber dem Tragjoch:
 *
 *   Tragjoch     Rahmenebene senkrecht, Vierendeel trägt das GEWICHT
 *   Abfangjoch   Rahmenebene waagrecht, Vierendeel trägt den LEITERZUG
 *
 * Ein früherer Kommentar an dieser Stelle behauptete, der Kern dieser
 * Anwendung passe darauf nicht. Das war falsch und aus dem Blatt allein
 * gelesen: zwei Gurte statt vier, eine Blechebene statt zweier - der
 * Rechenweg ist derselbe.
 *
 * Was hier steht, ist das Sortiment: Typen, Längen, Gewichte, Konstruktions-
 * masse, Schnee- und Windlasten je Laufmeter.
 *
 * ================== ZWEI SORTIMENTE, ZWEI BENENNUNGEN =====================
 *
 * AKTUELL heissen sie nach einer A-Nummer: A160 bis A360. Die Zahl ist die
 * Höhe des Gurtprofils in Millimetern — A160 trägt UPE 160, A360 trägt
 * IPE 360.
 *
 * DIE ALTBAUWEISE heisst nach dem PROFIL selbst: «UAP 130», «IPE 270». Der
 * Unterschied liegt nicht im Profil, sondern im ZUSAMMENBAU (Weisung vom
 * 3. September) — deshalb gibt es Paare wie A270 und IPE 270, die dasselbe
 * Profil führen und trotzdem verschieden schwer sind (98 gegen 111 kg/m).
 *
 * Beide stehen zur Wahl: die Altbauweise ist im Bestand vorhanden und muss
 * nachgewiesen werden können, auch wenn sie nicht mehr verbaut wird.
 * ---------------------------------------------------------------------------
 */

let DB = null;

/**
 * Die Datenbank laden - eingebettet oder daneben liegend.
 *
 * >>> IHR FEHLEN IST KEIN FEHLER. <<<
 *
 * Anders als bei den Tragjochen laeuft die Anwendung ohne dieses Sortiment
 * weiter: wer kein Abfangjoch auf dem Blatt hat, braucht es nicht. Die
 * Typwahl bleibt dann leer und sagt es (abfangDbDa), statt den Start mit
 * einer Ausnahme abzubrechen.
 */
export async function ladeAbfangjoche(pfad = 'data/abfangjoche.json') {
  if (DB) return DB;
  if (typeof document !== 'undefined') {
    const eingebettet = document.getElementById('abfangjoch-db');
    const roh = eingebettet?.textContent?.trim();
    if (roh) return setzeAbfangDB(JSON.parse(roh));
  }
  try {
    const antwort = await fetch(pfad);
    if (antwort.ok) return setzeAbfangDB(await antwort.json());
  } catch { /* ohne Sortiment weiter */ }
  return null;
}

/** Die Datenbank setzen (aus data/abfangjoche.json). */
export function setzeAbfangDB(db) { DB = db; return db; }

/** Ob eine Datenbank geladen ist - die Anwendung läuft auch ohne. */
export const abfangDbDa = () => Boolean(DB?.typen?.length);

function db() {
  if (!DB) throw new Error('Abfangjoch-Datenbank nicht geladen');
  return DB;
}

/** Alle Typen, aktuelles Sortiment zuerst. */
export function abfangjoche() {
  return abfangDbDa() ? db().typen : [];
}

export function getAbfangjoch(typ) {
  const a = abfangjoche().find((x) => x.typ === typ);
  if (!a) throw new Error(`Unbekannter Abfangjochtyp: ${typ}`);
  return a;
}

/**
 * Der Längenbereich eines Typs [m].
 *
 * >>> DIE ALTBAUWEISE FÜHRT NUR EINE GRÖSSTE LÄNGE. <<<
 *
 * Auf ihren Blättern steht «jt max.» und keine kleinste Länge. Eine
 * erfundene Untergrenze wäre eine Angabe, die niemand gemacht hat; genommen
 * wird deshalb die kleinste Länge, die das Sortiment überhaupt führt.
 */
export function abfangLaengenbereich(typ) {
  const a = typeof typ === 'string' ? getAbfangjoch(typ) : typ;
  const [min, max] = a?.jt ?? [];
  const kleinste = Math.min(...abfangjoche()
    .map((x) => x.jt?.[0]).filter((v) => Number.isFinite(v)));
  return {
    min: Number.isFinite(min) ? min : (Number.isFinite(kleinste) ? kleinste : 5.5),
    max: Number.isFinite(max) ? max : 30,
    text: Number.isFinite(min) ? `${min}–${max} m` : `bis ${max} m`,
  };
}
