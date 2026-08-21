/**
 * store.js
 * ---------------------------------------------------------------------------
 * ABLAGEDATENBANK für Projekte.
 *
 * Speichert vollständige Eingabestände lokal im Browser (IndexedDB), sodass
 * mehrere Tragjoche eines Projekts nebeneinander liegen und wieder geladen
 * werden können. Zusätzlich Ausleitung und Einlesen als JSON-Datei, damit sich
 * Stände weitergeben oder sichern lassen.
 *
 * Die Ablage liegt IM BROWSER und ist an Gerät und Profil gebunden. Sie ist
 * kein Ersatz für eine Projektablage - wer den Stand aufbewahren will,
 * exportiert ihn als Datei.
 *
 * Kein DOM ausser den Datei-Hilfen am Ende, keine Rechnung.
 * ---------------------------------------------------------------------------
 */

const DB_NAME = 'tragjoch';
const DB_VERSION = 2;
const SPEICHER = 'projekte';
/**
 * VORLAGEN GANZER TRAGWERKE.
 *
 * Ein gespeichertes Joch gehört zu einem Projekt und trägt dessen Masse. Eine
 * Vorlage ist das Gegenteil: der eingespielte Aufbau ohne Projektbezug, den man
 * als Ausgangspunkt für das nächste Tragwerk nimmt - Typ, Profile, Trasse,
 * Anbauteile, Lastfälle. Sie liegt deshalb in einem eigenen Speicher und wird
 * beim Anwenden auf den aktuellen Stand gelegt, statt ihn zu ersetzen.
 */
const VORLAGEN = 'tragwerkvorlagen';

let dbP = null;

function oeffne() {
  if (dbP) return dbP;
  dbP = new Promise((fertig, fehler) => {
    if (typeof indexedDB === 'undefined') {
      fehler(new Error('IndexedDB steht nicht zur Verfügung.'));
      return;
    }
    const anf = indexedDB.open(DB_NAME, DB_VERSION);
    anf.onupgradeneeded = () => {
      const db = anf.result;
      if (!db.objectStoreNames.contains(SPEICHER)) {
        const st = db.createObjectStore(SPEICHER, { keyPath: 'id' });
        st.createIndex('geaendert', 'geaendert');
        st.createIndex('projekt', 'projekt');
      }
      if (!db.objectStoreNames.contains(VORLAGEN)) {
        const st = db.createObjectStore(VORLAGEN, { keyPath: 'id' });
        st.createIndex('geaendert', 'geaendert');
      }
    };
    anf.onsuccess = () => fertig(anf.result);
    anf.onerror = () => fehler(anf.error ?? new Error('IndexedDB nicht geöffnet.'));
  });
  return dbP;
}

async function tx(modus, fn, speicher = SPEICHER) {
  const db = await oeffne();
  return new Promise((fertig, fehler) => {
    const t = db.transaction(speicher, modus);
    const st = t.objectStore(speicher);
    let ergebnis;
    try { ergebnis = fn(st); } catch (e) { fehler(e); return; }
    t.oncomplete = () => fertig(ergebnis && ergebnis.result !== undefined
      ? ergebnis.result : ergebnis);
    t.onerror = () => fehler(t.error);
    t.onabort = () => fehler(t.error ?? new Error('Transaktion abgebrochen.'));
  });
}

const neueId = () =>
  `TJ-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Eintrag anlegen oder aktualisieren.
 * @param {object} e {id?, name, projekt, bemerkung, werte}
 */
export async function sichern(e) {
  const jetzt = new Date().toISOString();
  const satz = {
    id: e.id ?? neueId(),
    name: (e.name ?? '').trim() || 'Ohne Namen',
    projekt: (e.projekt ?? '').trim(),
    bemerkung: e.bemerkung ?? '',
    werte: e.werte,
    kennwerte: e.kennwerte ?? null,
    erstellt: e.erstellt ?? jetzt,
    geaendert: jetzt,
  };
  await tx('readwrite', (st) => st.put(satz));
  return satz;
}

/** Alle Einträge, neueste zuerst. */
export async function liste() {
  const alle = await tx('readonly', (st) => st.getAll());
  return (alle ?? []).sort((a, b) => (b.geaendert ?? '').localeCompare(a.geaendert ?? ''));
}

export async function laden(id) {
  const s = await tx('readonly', (st) => st.get(id));
  if (!s) throw new Error(`Eintrag ${id} nicht gefunden.`);
  return s;
}

export async function loeschen(id) {
  await tx('readwrite', (st) => st.delete(id));
}

/** Eintrag duplizieren. */
export async function duplizieren(id) {
  const s = await laden(id);
  return sichern({ ...s, id: undefined, erstellt: undefined,
                   name: `${s.name} (Kopie)` });
}

/**
 * Einen Eintrag umbenennen oder einem anderen Projekt zuordnen.
 *
 * Getrennt vom Sichern, weil hier NUR die Beschriftung geändert wird: die
 * Eingabewerte und der Zeitpunkt der letzten Rechnung bleiben, wie sie sind.
 * Ein leerer Projektname stellt den Eintrag zurück unter «Ohne Projekt».
 *
 * @param {string} id
 * @param {{name?:string, projekt?:string, bemerkung?:string}} neu
 */
export async function umbenennen(id, neu) {
  const s = await laden(id);
  const satz = {
    ...s,
    ...(neu.name !== undefined ? { name: neu.name.trim() || 'Ohne Namen' } : {}),
    ...(neu.projekt !== undefined ? { projekt: neu.projekt.trim() } : {}),
    ...(neu.bemerkung !== undefined ? { bemerkung: neu.bemerkung } : {}),
    geaendert: new Date().toISOString(),
  };
  await tx('readwrite', (st) => st.put(satz));
  return satz;
}

/**
 * Ein ganzes Projekt umbenennen: alle Einträge mit diesem Projektnamen.
 * «Ohne Projekt» meint den leeren Namen - so lassen sich verstreute Joche
 * nachträglich zu einem Projekt zusammenfassen.
 *
 * @returns {number} Anzahl geänderter Einträge
 */
export async function projektUmbenennen(alt, neu) {
  const suche = (alt ?? '').trim();
  const ziel = (neu ?? '').trim();
  const alle = await liste();
  const treffer = alle.filter((s) => (s.projekt || '') === suche);
  const jetzt = new Date().toISOString();
  for (const s of treffer) {
    await tx('readwrite', (st) => st.put({ ...s, projekt: ziel, geaendert: jetzt }));
  }
  return treffer.length;
}

/** Nach Projekt gruppiert, für die Anzeige. */
export async function nachProjekt() {
  const alle = await liste();
  const gruppen = new Map();
  alle.forEach((s) => {
    const k = s.projekt || 'Ohne Projekt';
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(s);
  });
  return [...gruppen.entries()].map(([projekt, eintraege]) => ({ projekt, eintraege }));
}

// --- Vorlagen ganzer Tragwerke ----------------------------------------------

/**
 * Welche Felder eine Vorlage mitbringt.
 *
 * Was ein einzelnes Bauwerk ausmacht - Länge, Nachweisstelle, Bemerkung -
 * gehört NICHT dazu: eine Vorlage beschreibt die Art des Tragwerks, nicht das
 * Stück. Die Jochlänge wird beim Anwenden bewusst NICHT übernommen, damit die
 * Vorlage nicht heimlich das Bauteil umbaut.
 */
const VORLAGE_AUS = [
  'typ', 'profOG', 'profUG', 'stahl', 'massVariante', 'blechQuelle',
  'endbedingung', 'mastProfil', 'mastSteg', 'wMast', 'wMastAusTabelle',
  'mastWindAufJoch', 'kragA', 'kragB',
  'torsionModell', 'torsionsverteilung', 'knotenbereich', 'endfeldZuschlag',
  'trasseRadius', 'flSpannweite',
  'anbauteile', 'eigeneVorlagen', 'generator',
  'lastHerkunft', 'windKlasse', 'schneeAktiv', 'schneeKlasse', 'gZusatz',
  'normensatz', 'gammaG', 'gammaQ', 'psi0', 'gammaM0',
  'lastfallAnpassung', 'lastfaelleEigen',
];

/** Aus einem Eingabestand die Vorlagenfelder herauslösen. */
export function vorlageAusWerten(werte) {
  const v = {};
  VORLAGE_AUS.forEach((k) => { if (werte[k] !== undefined) v[k] = werte[k]; });
  return JSON.parse(JSON.stringify(v));
}

export async function vorlageSichern(e) {
  const jetzt = new Date().toISOString();
  const satz = {
    id: e.id ?? `TV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: (e.name ?? '').trim() || 'Ohne Namen',
    bemerkung: e.bemerkung ?? '',
    werte: e.werte,
    kennwerte: e.kennwerte ?? null,
    erstellt: e.erstellt ?? jetzt,
    geaendert: jetzt,
  };
  await tx('readwrite', (st) => st.put(satz), VORLAGEN);
  return satz;
}

export async function vorlagenListe() {
  const alle = await tx('readonly', (st) => st.getAll(), VORLAGEN);
  return (alle ?? []).sort((a, b) => (b.geaendert ?? '').localeCompare(a.geaendert ?? ''));
}

export async function vorlageLaden(id) {
  const s = await tx('readonly', (st) => st.get(id), VORLAGEN);
  if (!s) throw new Error(`Vorlage ${id} nicht gefunden.`);
  return s;
}

export async function vorlageLoeschen(id) {
  await tx('readwrite', (st) => st.delete(id), VORLAGEN);
}

/** Alles als JSON-Text (Sicherung, Weitergabe). */
export async function alsJson() {
  return JSON.stringify({
    art: 'tragjoch-ablage', version: 2,
    erzeugt: new Date().toISOString(),
    eintraege: await liste(),
    vorlagen: await vorlagenListe().catch(() => []),
  }, null, 2);
}

/**
 * JSON einlesen. Bestehende Einträge bleiben erhalten; gleiche Namen
 * erzeugen neue Einträge, damit nichts unbemerkt überschrieben wird.
 * @returns {Promise<number>} Anzahl übernommener Einträge
 */
export async function ausJson(text) {
  const d = JSON.parse(text);
  const eintraege = Array.isArray(d) ? d : d.eintraege;
  if (!Array.isArray(eintraege)) {
    throw new Error('Datei enthält keine Liste von Einträgen.');
  }
  let n = 0;
  for (const e of eintraege) {
    if (!e || !e.werte) continue;
    await sichern({ ...e, id: undefined });
    n++;
  }
  // Tragwerkvorlagen einer Datei aus Fassung 2 kommen mit.
  for (const v of (Array.isArray(d.vorlagen) ? d.vorlagen : [])) {
    if (!v || !v.werte) continue;
    await vorlageSichern({ ...v, id: undefined });
    n++;
  }
  return n;
}

// --- Datei-Hilfen -----------------------------------------------------------

export function dateiSpeichern(text, name, typ = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: typ }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function dateiLesen() {
  return new Promise((fertig, fehler) => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = 'application/json,.json';
    i.onchange = () => {
      const f = i.files?.[0];
      if (!f) { fehler(new Error('Keine Datei gewählt.')); return; }
      const r = new FileReader();
      r.onload = () => fertig(String(r.result));
      r.onerror = () => fehler(r.error);
      r.readAsText(f);
    };
    i.click();
  });
}
