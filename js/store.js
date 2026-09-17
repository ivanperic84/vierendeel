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

import { zip, entpacke } from './export.xlsx.js';

const DB_NAME = 'tragjoch';
const DB_VERSION = 3;
const SPEICHER = 'projekte';

/**
 * DIE HINTERLEGTEN ZEICHNUNGEN, IN EIGENEM SPEICHER.
 *
 * Ein Bildschirmausschnitt einer Querprofil-Zeichnung ist auch verkleinert
 * und als JPEG noch gross gegen einen Eingabestand. Läge er im Eintrag,
 * brächte jedes Auflisten der Ablage sämtliche Bilder mit - und die Liste
 * wird bei jedem Öffnen der Schublade geholt.
 *
 * Deshalb ein eigener Speicher, gelesen nur, wenn das Tragwerk geladen wird.
 * Der Schlüssel ist die Eintrags-Id: ein Tragwerk, eine Zeichnung.
 *
 * IndexedDB ist der richtige Ort dafür - sie nimmt Binärdaten unmittelbar
 * und kennt die enge Schranke nicht, an der localStorage scheitern würde.
 */
const ZEICHNUNGEN = 'zeichnungen';
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

/*
 * ERSATZSPEICHER OHNE INDEXEDDB.
 *
 * Im privaten Fenster, in engen WebViews und bei abgeschalteten Website-Daten
 * gibt es keine IndexedDB. Bisher scheiterte dann jeder Zugriff auf die
 * Ablage mit «IndexedDB steht nicht zur Verfuegung» - und weil das erst beim
 * Speichern auffiel, war die Arbeit bereits getan.
 *
 * Der Ersatz haelt dieselben drei Speicher als ein JSON in localStorage und
 * bedient die vier Operationen, die dieses Modul braucht: put, get, getAll,
 * delete. Ein Index wird nirgends benutzt, deshalb steht hier keiner.
 *
 * WAS ER NICHT KANN: Zeichnungen. Sie sind Binaerdaten, localStorage nimmt
 * nur Zeichenketten, und ein Bildschirmausschnitt in Base64 fuellt die
 * 5-MB-Schranke im Alleingang. Der Ersatz weist sie deshalb ab und sagt es,
 * statt still ein halbes Tragwerk abzulegen.
 */
const ERSATZ_KEY = 'tragjoch-ablage-ersatz';
let ersatzDaten = null;

function ersatzLaden() {
  if (ersatzDaten) return ersatzDaten;
  try {
    ersatzDaten = JSON.parse(localStorage.getItem(ERSATZ_KEY) ?? '{}') || {};
  } catch { ersatzDaten = {}; }
  return ersatzDaten;
}

function ersatzSchreiben() {
  try {
    localStorage.setItem(ERSATZ_KEY, JSON.stringify(ersatzDaten));
  } catch (e) {
    throw new Error('Der Ersatzspeicher ist voll. Ohne IndexedDB fasst die '
                  + 'Ablage nur wenige Tragwerke; den Stand als Datei ausleiten.');
  }
}

/** Bedient put/get/getAll/delete auf einem Abschnitt des Ersatzspeichers. */
function ersatzStore(speicher) {
  const d = ersatzLaden();
  if (!d[speicher]) d[speicher] = {};
  const teil = d[speicher];
  return {
    put(satz) {
      if (speicher === ZEICHNUNGEN) {
        throw new Error('Ohne IndexedDB lassen sich keine Zeichnungen '
                      + 'hinterlegen. Das Tragwerk selbst wird gespeichert.');
      }
      teil[satz.id] = satz;
      ersatzSchreiben();
      return satz;
    },
    get(id) { return teil[id]; },
    getAll() { return Object.values(teil); },
    delete(id) { delete teil[id]; ersatzSchreiben(); },
  };
}

/** Steht IndexedDB zur Verfuegung? Erst nach dem ersten Zugriff belastbar. */
let ohneIdb = false;
export const ersatzspeicherAktiv = () => ohneIdb;

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
      if (!db.objectStoreNames.contains(ZEICHNUNGEN)) {
        db.createObjectStore(ZEICHNUNGEN, { keyPath: 'id' });
      }
    };
    anf.onsuccess = () => fertig(anf.result);
    anf.onerror = () => fehler(anf.error ?? new Error('IndexedDB nicht geöffnet.'));
  });
  return dbP;
}

async function tx(modus, fn, speicher = SPEICHER) {
  // OHNE INDEXEDDB DER ERSATZ. Geprueft wird beim ersten Zugriff, nicht beim
  // Laden des Moduls: in manchen Umgebungen steht das Objekt da und wirft
  // erst beim Oeffnen.
  if (ohneIdb) return fn(ersatzStore(speicher));
  let db;
  try {
    db = await oeffne();
  } catch (e) {
    ohneIdb = true;
    dbP = null;
    return fn(ersatzStore(speicher));
  }
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
  // Die Zeichnung gehört zum Tragwerk und geht mit ihm. Sonst bliebe sie als
  // Waise im Speicher liegen - unsichtbar, aber nicht klein.
  await zeichnungLoeschen(id).catch(() => {});
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
  'endbedingung', 'mastVorhanden', 'mastProfil', 'mastSteg', 'wMast',
  'wMastAusTabelle',
  'mastWindAufJoch', 'wMastB', 'kragA', 'kragB',
  'torsionModell', 'torsionsverteilung', 'knotenbereich', 'endfeldZuschlag', 'schiefeBiegung',
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
 *
 * Hier stand bis zum 17. September `will('vorlagen')` - eine Hilfsfunktion,
 * die es nur in `alsPaket` gab. Jede JSON-Sicherung brach deshalb mit
 * «will is not defined» ab, NACHDEM ihre Tragwerke schon geschrieben waren.
 * Der Weg laeuft jetzt ueber `einlesen`, denselben wie beim Paket.
 *
 * @returns {Promise<number>} Anzahl übernommener Einträge und Vorlagen
 */
export async function ausJson(text) {
  const r = await einlesen(new TextEncoder().encode(text));
  return r.eintraege + r.vorlagen;
}

// --- Hinterlegte Zeichnungen ------------------------------------------------

/**
 * Zeichnung eines Tragwerks sichern.
 *
 * @param {string} id Id des Ablageeintrags
 * @param {{daten:Uint8Array, breite:number, hoehe:number, art:string,
 *          kalibrierung:object|null, name:string}} z
 */
export async function zeichnungSichern(id, z) {
  if (!id) throw new Error('Zeichnung ohne Tragwerk: keine Id.');
  const satz = {
    id,
    daten: z.daten, breite: z.breite, hoehe: z.hoehe,
    art: z.art ?? 'image/jpeg',
    name: z.name ?? 'Zeichnung',
    kalibrierung: z.kalibrierung ?? null,
    geaendert: new Date().toISOString(),
  };
  await tx('readwrite', (st) => st.put(satz), ZEICHNUNGEN);
  return satz;
}

/** Zeichnung eines Tragwerks. Gibt null, wenn keine hinterlegt ist. */
export async function zeichnungLaden(id) {
  if (!id) return null;
  return (await tx('readonly', (st) => st.get(id), ZEICHNUNGEN)) ?? null;
}

export async function zeichnungLoeschen(id) {
  if (!id) return;
  await tx('readwrite', (st) => st.delete(id), ZEICHNUNGEN);
}

/** Alle Zeichnungen - gebraucht beim Ausleiten des ganzen Projekts. */
export async function zeichnungenAlle() {
  return (await tx('readonly', (st) => st.getAll(), ZEICHNUNGEN)) ?? [];
}

// --- Das ganze Projekt als Paket --------------------------------------------

/*
 * WARUM EIN PAKET UND NICHT NUR EINE JSON.
 *
 * Die hinterlegten Zeichnungen sind Bilder. In eine JSON passen sie nur als
 * Base64 - ein Drittel grösser, unlesbar, und niemand kommt an das Bild
 * heran, ohne die Datei zu zerlegen. Weisung des Auftraggebers: die JPEG
 * gehören beim Ausleiten in den Ablageordner.
 *
 * Also ein ZIP: die Ablage als `ablage.json`, daneben ein Ordner
 * `zeichnungen/` mit einer Datei je Tragwerk, benannt nach seiner Id. Wer nur
 * ein Bild braucht, holt es mit dem Dateimanager heraus.
 *
 * Der ZIP-Schreiber steht schon im Werkzeug - eine .xlsx IST ein ZIP.
 */
/**
 * WAS EIN PAKET ENTHALTEN KANN.
 *
 * Bis zum 1. September ging immer alles hinaus. Wer einem Kollegen zwei
 * Tragwerke schicken wollte, schickte die ganze Ablage mit jedem Bild darin.
 */
export const PAKETTEILE = [
  { key: 'eintraege', label: 'Tragwerke' },
  { key: 'vorlagen', label: 'Vorlagen' },
  { key: 'zeichnungen', label: 'Hinterlegte Zeichnungen' },
  { key: 'einstellungen', label: 'Einstellungen und Datenbasis' },
];

/*
 * >>> DIE EINSTELLUNGEN DER ANWENDUNG (17. September). <<<
 *
 * Nach dem Vorbild von BlockCalc («Backup erstellen»): eine Sicherung soll
 * ALLES tragen, was dieses Geraet ausmacht - Optionen, Tastenbelegung,
 * eingelesene Datenbasis, Arbeitsstand. All das liegt im localStorage unter
 * `tragjoch-…`. Ausgenommen ist der Ersatzspeicher der Ablage: er IST die
 * Ablage und kommt als Tragwerke mit.
 */
const EINSTELLUNG_PRAEFIX = 'tragjoch-';

function einstellungenLesen() {
  const o = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(EINSTELLUNG_PRAEFIX) || k === ERSATZ_KEY) continue;
      o[k] = localStorage.getItem(k);
    }
  } catch { /* kein localStorage */ }
  return o;
}

function einstellungenSchreiben(o) {
  let n = 0;
  Object.entries(o ?? {}).forEach(([k, v]) => {
    if (!k.startsWith(EINSTELLUNG_PRAEFIX) || k === ERSATZ_KEY || typeof v !== 'string') return;
    try { localStorage.setItem(k, v); n++; } catch { /* voll */ }
  });
  return n;
}

/**
 * Paket schreiben.
 * @param {object} wahl {eintraege, vorlagen, zeichnungen, einstellungen} -
 *        fehlt sie, geht alles ausser den Einstellungen hinaus.
 * @param {string[]} ids nur diese Tragwerke; leer oder fehlend heisst alle.
 */
export async function alsPaket(wahl = null, ids = null) {
  const will = (k) => (wahl ? Boolean(wahl[k]) : k !== 'einstellungen');
  const alle = await liste();
  const eintraege = will('eintraege')
    ? (Array.isArray(ids) && ids.length ? alle.filter((e) => ids.includes(e.id)) : alle)
    : [];
  const bilder = will('zeichnungen') ? await zeichnungenAlle() : [];
  const beiId = new Map(eintraege.map((e) => [e.id, e]));
  const dateien = [];
  const verzeichnis = [];
  for (const b of bilder) {
    // Ein Bild ohne Tragwerk ist eine Waise - es kommt nicht mit.
    if (!beiId.has(b.id)) continue;
    const datei = `zeichnungen/${b.id}.jpg`;
    dateien.push({ name: datei, inhalt: b.daten });
    verzeichnis.push({ id: b.id, datei, breite: b.breite, hoehe: b.hoehe,
                       name: b.name ?? '', kalibrierung: b.kalibrierung ?? null });
  }
  const json = JSON.stringify({
    art: 'tragjoch-ablage', version: 3,
    erzeugt: new Date().toISOString(),
    eintraege,
    // Die Wahl «Vorlagen» wirkt jetzt - bis zum 17. September gingen sie
    // immer mit.
    vorlagen: will('vorlagen') ? await vorlagenListe().catch(() => []) : [],
    zeichnungen: verzeichnis,
    ...(will('einstellungen') ? { einstellungen: einstellungenLesen() } : {}),
  }, null, 2);
  dateien.unshift({ name: 'ablage.json', inhalt: json });
  return zip(dateien);
}

/** Die ganze Ablage mit allem - die Komplettsicherung. */
export function alsSicherung() {
  return alsPaket({ eintraege: true, vorlagen: true, zeichnungen: true,
                    einstellungen: true });
}

/*
 * >>> EIN LESER FUER BEIDE FORMATE (17. September). <<<
 *
 * Ein Paket ist ein ZIP mit `ablage.json`, eine alte Sicherung die JSON
 * selbst - oder nur eine Liste von Eintraegen. Bis hierher hatte jede Form
 * ihren eigenen Weg, und nur einer davon zeigte vorher, was kommt.
 */
function datenLesen(daten) {
  const roh = daten instanceof Uint8Array ? daten : new Uint8Array(daten);
  const istZip = roh.length > 1 && roh[0] === 0x50 && roh[1] === 0x4b;
  let d;
  let inhalt = new Map();
  if (istZip) {
    const dateien = entpacke(roh);
    const jsonDatei = dateien.find((f) => f.name === 'ablage.json');
    if (!jsonDatei) throw new Error('Im Paket fehlt ablage.json.');
    d = JSON.parse(new TextDecoder().decode(jsonDatei.inhalt));
    inhalt = new Map(dateien.map((f) => [f.name, f.inhalt]));
  } else {
    let text = new TextDecoder().decode(roh);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    d = JSON.parse(text);
  }
  if (!Array.isArray(d) && !Array.isArray(d?.eintraege)) {
    throw new Error('Die Datei ist keine Ablage dieser Anwendung.');
  }
  const liste_ = Array.isArray(d) ? d : d.eintraege;
  return {
    zip: istZip,
    erzeugt: Array.isArray(d) ? null : (d.erzeugt ?? null),
    version: Array.isArray(d) ? null : (d.version ?? null),
    eintraege: liste_.filter((e) => e && e.werte),
    vorlagen: (Array.isArray(d?.vorlagen) ? d.vorlagen : []).filter((v) => v && v.werte),
    verzeichnis: new Map((d?.zeichnungen ?? []).map((z) => [z.id, z])),
    inhalt,
    einstellungen: d?.einstellungen && typeof d.einstellungen === 'object'
      ? d.einstellungen : null,
  };
}

const schluesselVon = (e) => `${(e.projekt ?? '').trim()}|${(e.name ?? '').trim()}`;

/**
 * WAS IN EINER DATEI STEHT, BEVOR SIE GESCHRIEBEN WIRD.
 *
 * KOLLISION heisst hier: gleicher Name im gleichen Projekt. Die Ids taugen
 * dafür nicht, denn sie werden beim Einlesen ohnehin neu vergeben; für den
 * Anwender ist ein zweites «Joch Nord» im selben Projekt der Konflikt.
 *
 * Seit dem 17. September fuer Paket UND JSON, und je Eintrag - der Dialog
 * laesst jeden einzeln waehlen.
 */
export async function paketInhalt(daten) {
  const p = datenLesen(daten);
  const vorhanden = new Map((await liste()).map((e) => [schluesselVon(e), e]));
  const inDatei = new Map();
  const zeilen = p.eintraege.map((e) => {
    const da = vorhanden.get(schluesselVon(e)) ?? null;
    // Derselbe Name ein zweites Mal IN DER DATEI - er wird als Kopie
    // abgelegt, nie ueber den ersten (siehe `einlesen`).
    const k = schluesselVon(e);
    const wiederholt = inDatei.has(k);
    inDatei.set(k, true);
    return {
      wiederholt,
      id: e.id ?? null, name: e.name ?? '', projekt: (e.projekt ?? '').trim(),
      geaendert: e.geaendert ?? null,
      linie: e.werte?.linie ?? '', km: e.werte?.km ?? '',
      ortschaft: e.werte?.ortschaft ?? '',
      zeichnung: p.verzeichnis.has(e.id),
      doppeltZu: da ? da.id : null,
    };
  });
  return {
    zip: p.zip,
    erzeugt: p.erzeugt,
    version: p.version,
    eintraege: zeilen.length,
    liste: zeilen,
    vorlagen: p.vorlagen.length,
    zeichnungen: p.verzeichnis.size,
    einstellungen: p.einstellungen ? Object.keys(p.einstellungen).length : 0,
    doppelt: zeilen.filter((e) => e.doppeltZu)
      .map((e) => `${e.projekt ? e.projekt + ' · ' : ''}${e.name}`),
  };
}

/**
 * Einlesen mit Auswahl.
 *
 * @param {Uint8Array|ArrayBuffer} daten  ZIP oder JSON
 * @param {object} o
 *   ids            nur diese Eintraege (Ids AUS DER DATEI); fehlt: alle
 *   vorlagen       Vorlagen mitnehmen (Vorgabe ja)
 *   zeichnungen    Zeichnungen mitnehmen (Vorgabe ja)
 *   einstellungen  Einstellungen uebernehmen (Vorgabe nein)
 *   doppelt        je Datei-Id 'kopie' | 'ersetzen' | 'ueberspringen'
 *   doppeltAlle    Vorgabe fuer alle Doppelten, sonst 'kopie'
 *   zielProjekt    alle eingelesenen Eintraege in dieses Projekt legen
 */
export async function einlesen(daten, o = {}) {
  const p = datenLesen(daten);
  const wahl = Array.isArray(o.ids) ? new Set(o.ids) : null;
  const vorhanden = new Map((await liste()).map((e) => [schluesselVon(e), e]));
  const r = { eintraege: 0, ersetzt: 0, uebersprungen: 0, vorlagen: 0,
              bilder: 0, einstellungen: 0, neueIds: [], alsKopie: 0 };
  /*
   * >>> ZWEIMAL DERSELBE NAME IN EINER DATEI (17. September). <<<
   *
   * Beide auf «ersetzen» gestellt, ersetzte der zweite den ersten - und vom
   * ersten blieb nichts. Was in diesem Durchgang geschrieben wurde, wird
   * deshalb nie ein zweites Mal ersetzt: der zweite kommt als Kopie dazu.
   */
  const diesmal = new Set();
  for (const e of p.eintraege) {
    if (wahl && !wahl.has(e.id)) continue;
    const ziel = typeof o.zielProjekt === 'string' ? o.zielProjekt.trim() : (e.projekt ?? '');
    const schl = schluesselVon({ ...e, projekt: ziel });
    const da = vorhanden.get(schl);
    // Eine ausdrueckliche Wahl «ueberspringen» gilt immer - auch wenn im
    // Zielprojekt nichts kollidiert: wer die Zeile so stellt, will sie nicht.
    let was = o.doppelt?.[e.id] === 'ueberspringen' ? 'ueberspringen'
      : (da ? (o.doppelt?.[e.id] ?? o.doppeltAlle ?? 'kopie') : 'neu');
    if (was === 'ueberspringen') { r.uebersprungen++; continue; }
    if (was === 'ersetzen' && diesmal.has(da.id)) {
      was = 'kopie';
      r.alsKopie++;
    }
    const neu = await sichern({
      ...e,
      id: was === 'ersetzen' ? da.id : undefined,
      erstellt: was === 'ersetzen' ? da.erstellt : e.erstellt,
      projekt: ziel,
    });
    if (was === 'ersetzen') r.ersetzt++; else r.eintraege++;
    r.neueIds.push(neu.id);
    diesmal.add(neu.id);
    if (!vorhanden.has(schl)) vorhanden.set(schl, neu);
    const z = o.zeichnungen !== false ? p.verzeichnis.get(e.id) : null;
    const roh = z ? p.inhalt.get(z.datei) : null;
    if (!roh) continue;
    await zeichnungSichern(neu.id, {
      daten: new Uint8Array(roh), breite: z.breite, hoehe: z.hoehe,
      art: 'image/jpeg', name: z.name, kalibrierung: z.kalibrierung,
    });
    r.bilder++;
  }
  if (o.vorlagen !== false) {
    for (const v of p.vorlagen) {
      await vorlageSichern({ ...v, id: undefined });
      r.vorlagen++;
    }
  }
  if (o.einstellungen === true && p.einstellungen) {
    r.einstellungen = einstellungenSchreiben(p.einstellungen);
  }
  return r;
}

/**
 * Paket einlesen - der alte Aufruf, jetzt ueber `einlesen`.
 * @param {object} wahl {eintraege, vorlagen, zeichnungen}; fehlt sie, kommt alles.
 */
export async function ausPaket(daten, wahl = null) {
  const will = (k) => !wahl || wahl[k] !== false;
  const r = await einlesen(daten, {
    ids: will('eintraege') ? undefined : [],
    vorlagen: will('vorlagen'), zeichnungen: will('zeichnungen'),
  });
  return { eintraege: r.eintraege + r.ersetzt + r.vorlagen, bilder: r.bilder };
}

/*
 * EINZELNE ANGABEN EINES EINTRAGS AENDERN (17. September) - fuer die
 * Tabelle der Ablage, in der Name, Linie, Kilometer und Bemerkung
 * unmittelbar bearbeitet werden. Nur Beschriftungen, nie Rechenwerte.
 */
export const DIREKT_FELDER = ['linie', 'km', 'ortschaft', 'projektNr', 'bearbeiter', 'datum'];

export async function eintragFeld(id, feld, wert) {
  const s = await laden(id);
  const satz = { ...s, geaendert: new Date().toISOString() };
  if (feld === 'name') satz.name = String(wert ?? '').trim() || 'Ohne Namen';
  else if (feld === 'projekt') satz.projekt = String(wert ?? '').trim();
  else if (feld === 'bemerkung') satz.bemerkung = String(wert ?? '');
  else if (DIREKT_FELDER.includes(feld)) {
    satz.werte = { ...s.werte, [feld]: String(wert ?? '').trim() };
  } else {
    throw new Error(`Feld ${feld} ist in der Ablage nicht bearbeitbar.`);
  }
  await tx('readwrite', (st) => st.put(satz));
  return satz;
}

/** Alle Projektnamen, alphabetisch - fuer die Auswahlfelder. */
export async function projektNamen() {
  const namen = new Set((await liste()).map((e) => (e.projekt ?? '').trim()).filter(Boolean));
  return [...namen].sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
}

// --- Datei-Hilfen -----------------------------------------------------------

export function dateiSpeichern(text, name, typ = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: typ }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Datei roh einlesen - als Bytes.
 *
 * Ein Paket ist ein ZIP, eine alte Sicherung eine JSON. Wer als Text liest,
 * hat die ZIP schon zerstört, bevor er sie ansieht: der Dekoder ersetzt
 * jedes Byte, das kein gültiges UTF-8 ist. Gelesen wird deshalb roh, und
 * unterschieden wird an den ersten zwei Zeichen (PK).
 */
/*
 * >>> DER DATEIWAEHLER (17. September, im Bedienlauf geprueft). <<<
 *
 * Das Feld haengt jetzt im Dokument, solange gewaehlt wird: ein losgeloestes
 * `input` feuert in manchen Browsern kein `change`. Der Name der Datei geht
 * mit - der Einlesedialog nennt ihn. Ein Abbruch endet still.
 */
export function dateiLesenRoh({ mitName = false } = {}) {
  return new Promise((fertig, fehler) => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = 'application/zip,.zip,application/json,.json';
    i.style.display = 'none';
    document.body.appendChild(i);
    const weg = () => { try { i.remove(); } catch { /* schon weg */ } };
    i.onchange = async () => {
      const f = i.files?.[0];
      weg();
      if (!f) { fehler(new Error('Keine Datei gewählt.')); return; }
      try {
        const daten = new Uint8Array(await f.arrayBuffer());
        fertig(mitName ? { daten, name: f.name } : daten);
      } catch (e) { fehler(e); }
    };
    i.addEventListener('cancel', () => { weg(); fehler(Object.assign(
      new Error('Abgebrochen.'), { abgebrochen: true })); });
    i.click();
  });
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
