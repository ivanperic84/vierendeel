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
export async function alsPaket() {
  const eintraege = await liste();
  const bilder = await zeichnungenAlle();
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
    vorlagen: await vorlagenListe().catch(() => []),
    zeichnungen: verzeichnis,
  }, null, 2);
  dateien.unshift({ name: 'ablage.json', inhalt: json });
  return zip(dateien);
}

/**
 * Paket einlesen. Die Bilder finden über das Verzeichnis zu ihren Tragwerken
 * zurück - die Ids sind beim Einlesen neu, also wird umgeschlüsselt.
 */
export async function ausPaket(daten) {
  const dateien = entpacke(daten);
  const jsonDatei = dateien.find((f) => f.name === 'ablage.json');
  if (!jsonDatei) throw new Error('Im Paket fehlt ablage.json.');
  const d = JSON.parse(new TextDecoder().decode(jsonDatei.inhalt));
  const inhalt = new Map(dateien.map((f) => [f.name, f.inhalt]));
  const verzeichnis = new Map((d.zeichnungen ?? []).map((z) => [z.id, z]));
  let n = 0, bilder = 0;
  for (const e of (d.eintraege ?? [])) {
    if (!e || !e.werte) continue;
    const alteId = e.id;
    const neu = await sichern({ ...e, id: undefined });
    n++;
    const z = verzeichnis.get(alteId);
    const roh = z ? inhalt.get(z.datei) : null;
    if (!roh) continue;
    await zeichnungSichern(neu.id, {
      daten: new Uint8Array(roh), breite: z.breite, hoehe: z.hoehe,
      art: 'image/jpeg', name: z.name, kalibrierung: z.kalibrierung,
    });
    bilder++;
  }
  for (const v of (Array.isArray(d.vorlagen) ? d.vorlagen : [])) {
    if (!v || !v.werte) continue;
    await vorlageSichern({ ...v, id: undefined });
    n++;
  }
  return { eintraege: n, bilder };
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
export function dateiLesenRoh() {
  return new Promise((fertig, fehler) => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = 'application/zip,.zip,application/json,.json';
    i.onchange = async () => {
      const f = i.files?.[0];
      if (!f) { fehler(new Error('Keine Datei gewählt.')); return; }
      try { fertig(new Uint8Array(await f.arrayBuffer())); }
      catch (e) { fehler(e); }
    };
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
