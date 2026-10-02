/**
 * data.ablage.js
 * ---------------------------------------------------------------------------
 * >>> GROSSE EINTRÄGE IN INDEXEDDB, NICHT IM LOCALSTORAGE (2. Oktober). <<<
 *
 * Gemeldet vom Arbeitsrechner, beim Laden des Datenpakets: «failed to
 * execute setItem on storage setting the value of tragjoch-eingelesen-v1
 * exceeded the quota». Das Datenpaket und der eingelesene Stand lagen als
 * Text im localStorage - je rund 370 000 Zeichen, im Browser doppelt so
 * viele Bytes. Der localStorage fasst je Herkunft rund 5 MB, und auf GitHub
 * Pages teilen sich ALLE Seiten unter derselben Adresse (benutzer.github.io)
 * diese 5 MB. Zwei Kopien des Sortiments, dazu Arbeitsstand und was andere
 * Seiten dort ablegen, und der Platz ist weg.
 *
 * IndexedDB fasst ein Vielfaches. Gelesen wird aber an Stellen, die nicht
 * warten können (Fenster aufbauen, Start). Deshalb: beim Start EINMAL laden
 * (`grossspeicherLaden`), danach liest jeder aus dem Arbeitsspeicher; wer
 * schreibt, wartet auf IndexedDB, bevor die Anwendung neu startet.
 * Ein alter Eintrag im localStorage wird beim Laden hinübergenommen und dort
 * gelöscht - das gibt den Platz frei. Ohne IndexedDB (privates Fenster bei
 * manchen Browsern) bleibt alles beim localStorage wie bisher.
 * ---------------------------------------------------------------------------
 */

const DB_NAME = 'tragjoch-daten';
const STORE = 'kv';
const cache = new Map();
let dbVersprechen = null;

function oeffnen() {
  if (dbVersprechen) return dbVersprechen;
  dbVersprechen = new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined' || !indexedDB) { rej(new Error('kein IndexedDB')); return; }
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error ?? new Error('IndexedDB nicht geöffnet'));
  });
  return dbVersprechen;
}

function anfrage(art, f) {
  return oeffnen().then((db) => new Promise((res, rej) => {
    const tx = db.transaction(STORE, art);
    const r = f(tx.objectStore(STORE));
    tx.oncomplete = () => res(r?.result);
    tx.onerror = () => rej(tx.error ?? new Error('IndexedDB-Fehler'));
    tx.onabort = () => rej(tx.error ?? new Error('IndexedDB abgebrochen'));
  }));
}

const lsLesen = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsLoeschen = (k) => { try { localStorage.removeItem(k); } catch { /* egal */ } };

/**
 * Beim Start: die genannten Einträge in den Arbeitsspeicher holen und alte
 * Einträge aus dem localStorage nach IndexedDB umziehen.
 */
export async function grossspeicherLaden(schluessel) {
  for (const k of schluessel) {
    const alt = lsLesen(k);
    try {
      let v = await anfrage('readonly', (s) => s.get(k));
      if (alt !== null) {
        // Der localStorage-Eintrag ist der jüngere, wenn es beide gibt: er
        // kann nur von einer Fassung vor dem Umzug geschrieben sein.
        await anfrage('readwrite', (s) => s.put(alt, k));
        v = alt;
        lsLoeschen(k);
      }
      if (typeof v === 'string') cache.set(k, v); else cache.delete(k);
    } catch {
      if (alt !== null) cache.set(k, alt);
    }
  }
}

/** Lesen - aus dem Arbeitsspeicher, sonst aus dem localStorage. */
export function grossLesen(k) {
  return cache.has(k) ? cache.get(k) : lsLesen(k);
}

/**
 * Schreiben. Erst IndexedDB; geht das nicht, der localStorage (wirft dann
 * wie bisher, wenn er voll ist - der Aufrufer meldet es).
 */
export async function grossSchreiben(k, text) {
  try {
    await anfrage('readwrite', (s) => s.put(text, k));
    lsLoeschen(k);
  } catch {
    localStorage.setItem(k, text);
  }
  cache.set(k, text);
  return true;
}

/** Entfernen - aus beiden Ablagen. */
export async function grossEntfernen(k) {
  cache.delete(k);
  lsLoeschen(k);
  try { await anfrage('readwrite', (s) => s.delete(k)); } catch { /* nicht da */ }
  return true;
}
