/**
 * verlauf.js
 * ---------------------------------------------------------------------------
 * RÜCKGÄNGIG UND WIEDERHERSTELLEN.
 *
 * Die Anwendung hat einen einzigen Zustand: `werte`. Jede Änderung ersetzt ihn
 * und rechnet neu. Damit ist der Verlauf nichts anderes als eine Reihe von
 * Ständen — kein Protokoll von Befehlen, keine Umkehrfunktionen, nichts, was
 * pro Feld gepflegt werden müsste. Ein neues Eingabefeld erscheint im Verlauf,
 * ohne dass hier eine Zeile dazukommt.
 *
 * >>> WARUM DAS HIER STEHT UND NICHT IN app.js <<<
 *
 * Weil es sich sonst nicht prüfen liesse. app.js fasst beim Laden das
 * Dokument an; der Prüfstand kann es nicht importieren. Die Regeln, wann ein
 * Schritt ein Schritt ist, sind aber genau das, was schiefgehen kann — also
 * stehen sie in einer Datei ohne Browser.
 *
 * ZWEI REGELN, DIE DEN UNTERSCHIED MACHEN
 *
 * ZUSAMMENFASSEN. Ein Schieber meldet zwanzigmal, während man ihn zieht.
 * Zwanzig Schritte zurückzunehmen, um eine Bewegung rückgängig zu machen,
 * wäre schlimmer als kein Rückgängig. Ändert sich kurz hintereinander DASSELBE
 * Feld, ist das ein Schritt.
 *
 * VORWÄRTS VERFÄLLT. Wer zurückgeht und dann etwas anderes tut, hat einen
 * neuen Ast begonnen; der alte ist nicht mehr erreichbar. Ihn liegen zu
 * lassen hiesse, «wiederherstellen» führte irgendwohin.
 * ---------------------------------------------------------------------------
 */

/** Wieviele Stände höchstens aufbewahrt werden. */
export const VERLAUF_MAX = 60;

/** Wie lange Änderungen am selben Feld zu einem Schritt verschmelzen [ms]. */
export const VERLAUF_ZUSAMMEN_MS = 700;

/**
 * Welche Schlüssel sich zwischen zwei Ständen unterscheiden.
 *
 * Verglichen wird über JSON, nicht Feld für Feld: die Werte sind Zahlen,
 * Zeichenketten, Listen von Anbauteilen und verschachtelte Sätze. Eine eigene
 * Vergleichsfunktion dafür wäre eine zweite Stelle, an der man ein neues Feld
 * vergisst.
 */
export function geaenderteSchluessel(a, b) {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  const raus = [];
  keys.forEach((k) => {
    if (JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k])) raus.push(k);
  });
  return raus.sort();
}

/**
 * Ein Verlauf über Zustände.
 *
 * @param {object} o
 * @param {number} o.max        höchste Zahl aufbewahrter Stände
 * @param {number} o.zusammenMs Fenster zum Verschmelzen gleicher Felder
 * @param {() => number} o.jetzt Zeitquelle - im Prüfstand steuerbar
 */
export function verlauf(o = {}) {
  const max = o.max ?? VERLAUF_MAX;
  const zusammenMs = o.zusammenMs ?? VERLAUF_ZUSAMMEN_MS;
  const jetzt = o.jetzt ?? (() => Date.now());

  let zurueckListe = [];      // ältere Stände, der jüngste zuletzt
  let vorListe = [];          // zurückgenommene Stände
  let stand = null;           // was gerade gilt, als JSON
  let zeit = 0;               // wann der letzte Schritt entstand
  let felder = null;          // welche Felder er betraf
  let ruht = false;           // während zurück/vor wird nicht aufgezeichnet

  /**
   * Einen neuen Stand melden. Gibt zurück, ob daraus ein Schritt wurde.
   *
   * Der ERSTE Aufruf legt nur den Anfangsstand fest - er ist kein Schritt,
   * sonst stünde nach dem Programmstart schon ein Rückgängig bereit, das den
   * leeren Anfang wiederherstellt.
   */
  const melde = (werte) => {
    const neu = JSON.stringify(werte);
    if (stand === null) { stand = neu; return false; }
    if (neu === stand) return false;
    if (ruht) { stand = neu; return false; }

    const vorher = JSON.parse(stand);
    const k = geaenderteSchluessel(vorher, werte);
    const t = jetzt();
    // Derselbe Regler, kurz hintereinander: ein Schritt, nicht zwanzig.
    const verschmilzt = felder !== null
      && k.length === 1 && felder.length === 1 && k[0] === felder[0]
      && (t - zeit) < zusammenMs;

    if (!verschmilzt) {
      zurueckListe.push(stand);
      if (zurueckListe.length > max) zurueckListe.shift();
      vorListe = [];
    }
    stand = neu; zeit = t; felder = k;
    return !verschmilzt;
  };

  /** Einen Schritt zurück. Gibt den Stand oder null. */
  const zurueck = () => {
    if (!zurueckListe.length) return null;
    vorListe.push(stand);
    stand = zurueckListe.pop();
    // Nach einem Sprung nicht weiterverschmelzen: der nächste Griff an
    // denselben Regler ist ein neuer Schritt, kein Anhängsel am alten.
    felder = null;
    return JSON.parse(stand);
  };

  /** Einen Schritt vorwärts. Gibt den Stand oder null. */
  const vor = () => {
    if (!vorListe.length) return null;
    zurueckListe.push(stand);
    stand = vorListe.pop();
    felder = null;
    return JSON.parse(stand);
  };

  return {
    melde,
    zurueck,
    vor,
    kannZurueck: () => zurueckListe.length > 0,
    kannVor: () => vorListe.length > 0,
    tiefe: () => ({ zurueck: zurueckListe.length, vor: vorListe.length }),
    /** Während eines Sprungs: das Zurückschreiben soll nichts aufzeichnen. */
    ruhend: (fn) => { ruht = true; try { return fn(); } finally { ruht = false; } },
    /** Alles vergessen - beim Laden eines anderen Tragwerks. */
    leeren: (werte) => {
      zurueckListe = []; vorListe = []; felder = null; zeit = 0;
      stand = werte === undefined ? null : JSON.stringify(werte);
    },
  };
}
