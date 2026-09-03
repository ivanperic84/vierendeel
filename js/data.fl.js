/**
 * data.fl.js
 * ---------------------------------------------------------------------------
 * ZUGRIFF auf die Lasttabelle der Fahrleitungsbauteile.
 * Die DATEN stehen in data/fl_bauteile.json und werden dort gepflegt.
 *
 * Quelle: Lasttabelle "Fahrleitungsmast- und Jochberechnung / ständige und
 * veränderliche Lasten" der Datenbasis.
 *
 * ACHSEN - die Tabelle spricht vom Gleis, das Werkzeug vom Joch:
 *   Windlast QUER zum Gleis    ->  Richtung der Jochachse    ->  x
 *   Windlast LÄNGS zum Gleis   ->  Gleisrichtung             ->  y
 *   Eigengewicht                                             ->  z
 *
 * EINHEITEN
 * Teile mit einer Länge (Rohre, Traversen, Drahtwerke) sind je Laufmeter
 * angegeben und müssen mit ihrer Länge multipliziert werden; alle übrigen
 * stehen als fertige Einzellast da. Welches gilt, sagt das Feld "einheit".
 * ---------------------------------------------------------------------------
 */

let DB = null;

export function setzeFlDB(obj) {
  if (!obj || !Array.isArray(obj.bauteile)) {
    throw new Error('Bauteil-Datenbank ungültig: Feld "bauteile" fehlt.');
  }
  DB = obj;
  return DB;
}

export async function ladeFlBauteile(pfad = 'data/fl_bauteile.json') {
  if (DB) return DB;
  if (typeof document !== 'undefined') {
    const roh = document.getElementById('fl-bauteil-db')?.textContent?.trim();
    if (roh) return setzeFlDB(JSON.parse(roh));
  }
  const antwort = await fetch(pfad);
  if (!antwort.ok) {
    throw new Error(`Bauteil-Datenbank ${pfad} nicht ladbar (HTTP ${antwort.status}).`);
  }
  return setzeFlDB(await antwort.json());
}

function db() {
  if (!DB) throw new Error('Bauteil-Datenbank nicht geladen.');
  return DB;
}

/** Alle Bauteile, wahlweise auf eine Rolle eingeschränkt. */
/** Die ganze Datenbank – für Prüfstand und Ausleitung. */
export const flDB = () => db();

export function flBauteile(rolle = null) {
  const alle = db().bauteile;
  return rolle ? alle.filter((b) => b.rolle === rolle) : alle;
}

/**
 * IST DIESES DRAHTWERK EIN KETTENWERK?
 *
 * Ein Kettenwerk ist Tragseil UND Fahrdraht - beides zusammen, in einem
 * Bauteil. Ein einzelner Leiter ist eines von beiden. Die Tabelle sagt es im
 * Namen: «Ts: StCu 50 / Fd: Cu 107» gegen «StCu 50» oder «Cu 95».
 *
 * Gebraucht wird die Unterscheidung am Masten (Weisung, 27. August): dort
 * hängt ein Kettenwerk nicht unmittelbar, sondern auf einem Ausleger —
 * unmittelbar hängen nur einzelne Leiter, Zusatzleiter über eine Traverse.
 *
 * Am Namen und nicht an einer Liste: kommt ein neues Kettenwerk in die
 * Tabelle, trägt es dieselbe Schreibweise und ist ohne Zutun erkannt.
 */
export function istKettenwerk(b) {
  if (!b || b.gruppe !== 'drahtwerk') return false;
  const t = `${b.id ?? ''} ${b.name ?? ''}`.toLowerCase();
  return t.includes('ts:') && t.includes('fd:');
}

export function getFlBauteil(id) {
  const b = db().bauteile.find((x) => x.id === id);
  if (!b) throw new Error(`Unbekanntes Fahrleitungsbauteil: ${id}`);
  return b;
}

/** Wird das Bauteil je Laufmeter angegeben? */
export const istStreckenlast = (b) => (b?.einheit ?? '').includes('/m');

/** Einwirkungsklassen der Windlast, wie sie die Tabelle führt. */
export const EK_KLASSEN = [
  { key: 'EK1', qp: 0.90, label: 'EK1 – Referenz-Staudruck 0.90 kN/m²' },
  { key: 'EK2', qp: 1.10, label: 'EK2 – Referenz-Staudruck 1.10 kN/m²' },
  { key: 'EK3', qp: 1.30, label: 'EK3 – Referenz-Staudruck 1.30 kN/m²' },
];

/** Referenz-Staudruck einer Klasse [kN/m²]. */
export const staudruck = (ek) =>
  EK_KLASSEN.find((k) => k.key === ek)?.qp ?? 1.10;

/**
 * Profilbeiwerte nach RTE 27200.
 *
 * 1.4 ist der langjährige Erfahrungswert der Lasttabelle für
 * Fahrleitungstragwerke und für Tragwerke mit flächigen Massen (Tafeln,
 * Signale). 1.0 gilt für Rundprofile, also für Drähte.
 */
export const PROFILBEIWERTE = [
  { key: 'flaechig', c: 1.4, label: 'flächig / Tragwerk (RTE 27200)' },
  { key: 'rund', c: 1.0, label: 'Rundprofil (Draht)' },
];

/**
 * Windlast aus der Angriffsfläche.
 *      w = A · q_ref(EK) · c
 * Für Bauteile, die nicht in der Tabelle stehen.
 *
 * @param {number} A Angriffsfläche [m²]
 * @param {string} ek Einwirkungsklasse
 * @param {number} c Profilbeiwert
 */
export const windAusFlaeche = (A, ek, c = 1.4) => (A ?? 0) * staudruck(ek) * c;

/**
 * Lastwerte eines Bauteils in der Form, die der Rechenkern braucht.
 *
 * @param {string} id  Bauteil-Id
 * @param {object} o   {ek, laenge, anzahl}
 * @returns {{Gz:number, Qx:number, Qy:number, streckenlast:boolean}}
 *          Gz [kN] ständige Vertikallast · Qx [kN] Wind in Jochachse ·
 *          Qy [kN] Wind in Gleisrichtung
 */
export function flLastwerte(id, { ek = 'EK2', laenge = 1, anzahl = 1 } = {}) {
  const b = getFlBauteil(id);
  // Nur Teile mit Längenangabe werden mit der Länge multipliziert. Bei den
  // übrigen steht die fertige Einzellast in der Tabelle - dort wäre eine
  // Multiplikation schlicht falsch.
  const f = (istStreckenlast(b) ? (laenge ?? 0) : 1) * (anzahl ?? 1);
  const wert = (feld) => {
    const v = b[feld]?.[ek];
    return Number.isFinite(v) ? v * f : 0;
  };
  return {
    Gz: Number.isFinite(b.eigengewicht) ? b.eigengewicht * f : 0,
    Qx: wert('windQuer'),
    Qy: wert('windLaengs'),
    streckenlast: istStreckenlast(b),
    // Fehlt ein Windwert für diese Klasse, ist das eine Lücke in der Quelle
    // und keine Null - das wird ausgewiesen statt verschwiegen.
    ohneWindQuer: !Number.isFinite(b.windQuer?.[ek]),
    ohneWindLaengs: !Number.isFinite(b.windLaengs?.[ek]),
  };
}

/** Leiterzugkraft eines Drahtwerks [kN], bei T + 5 °C. */
export const leiterzug = (id) => getFlBauteil(id).leiterzug ?? 0;

export function flStand() {
  const d = db();
  return { version: d._version, stand: d._stand, bauteile: d.bauteile.length,
           quelle: d._quelle?.dokument ?? '' };
}

/*
 * ===========================================================================
 * DIE REGLIERTEMPERATUR - welche Spalte der Reglagetabelle gilt.
 * ===========================================================================
 *
 * Die Reglagetabelle (Grundlagen/Einwirkungen) fuehrt die Leiterzugkraft je
 * Temperatur von -20 bis +40 Grad. Welche davon im Nachweis gilt, ist keine
 * Ableitung, sondern eine FESTLEGUNG - und sie kommt vom Auftraggeber
 * (Weisung, 3. September):
 *
 *   "fuer havarie ist -20 Grad und fuer die bemessung tragsicherheit die
 *    +5 Grad bei schnee leiteinwirkung -5 Grad"
 *
 * >>> WARUM DREI UND NICHT EINE. <<<
 *
 * Der Leiterzug WAECHST mit sinkender Temperatur - bei -20 Grad steht die
 * groesste Kraft im Draht. Das ist nicht immer der ungünstigste Fall:
 *
 *   TRAGSICHERHEIT (+5)   der Regelfall der Bemessung
 *   SCHNEE (-5)           kaelter, weil Schnee bei Frost faellt: die
 *                         Schneelast trifft auf einen straffer gezogenen
 *                         Leiter, und beide wirken zusammen
 *   HAVARIE (-20)         der Bruchfall bei groesster Zugkraft
 *
 * >>> DIE UNBELASTETEN ZUSTAENDE GELTEN HIER NICHT. <<<
 *
 * Die Tabelle fuehrt je Kettenwerk "Ts belastet" und "Ts unbelastet". Der
 * unbelastete Zustand gehoert zur Reglage auf der Baustelle - "nur fuer die
 * montage interessant nicht fuer uns hier" (Weisung, 3. September). In den
 * Nachweis geht ausschliesslich der belastete.
 * ---------------------------------------------------------------------------
 */
export const REGLIERTEMPERATUREN = [
  { key: 'tragsicherheit', T: 5, label: 'Tragsicherheit (+5 \u00b0C)',
    hinweis: 'Regelfall der Bemessung.' },
  { key: 'schnee', T: -5, label: 'Schnee leitend (\u22125 \u00b0C)',
    hinweis: 'Schnee f\u00e4llt bei Frost \u2014 die Schneelast trifft auf einen '
           + 'straffer gezogenen Leiter.' },
  { key: 'havarie', T: -20, label: 'Havarie (\u221220 \u00b0C)',
    hinweis: 'Bruchfall bei gr\u00f6sster Zugkraft. Aussergew\u00f6hnliche '
           + 'Einwirkung, st\u00e4ndige Lasten charakteristisch.' },
];

/**
 * Die Regliertemperatur zu einem Lastfall [Grad C].
 *
 * Ohne Treffer gilt die Tragsicherheit - der Regelfall. Eine erfundene
 * Temperatur waere schlimmer als die haeufigste: sie stuende nirgends.
 */
export function reglierTemperatur(key) {
  const r = REGLIERTEMPERATUREN.find((x) => x.key === key);
  return (r ?? REGLIERTEMPERATUREN[0]).T;
}
