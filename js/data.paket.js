/**
 * data.paket.js
 * ---------------------------------------------------------------------------
 * DATENPAKET: die drei Datenbanken als EINE Datei laden und sichern.
 * Reine Funktionen bis auf den Zugriff auf localStorage.
 *
 * WOZU
 * Die Oberfläche und der Rechenkern sind allgemein; die Zahlen darin - das
 * Sortiment der Jochtypen, die Anbauteil-Vorlagen und die Lasttabelle der
 * Fahrleitungsbauteile - stammen aus den Unterlagen des Betreibers und
 * gehören nicht zwingend in dieselbe Datei.
 *
 * Damit lässt sich die Anwendung OHNE Daten weitergeben (build_html.py
 * --ohne-daten) und das Datenpaket getrennt und örtlich nachladen. Einmal
 * geladen, bleibt es im Browser gespeichert und ist beim nächsten Start
 * wieder da; die Daten verlassen den Rechner nicht.
 *
 * FORMAT
 * {
 *   "format": "tragjoch-daten",
 *   "version": 1,
 *   "stand": "2026-08-20",         optional, frei
 *   "bezeichnung": "…",            optional, frei
 *   "tragjoche":   { … },          Inhalt von data/tragjoche.json
 *   "anbauteile":  { … },          Inhalt von data/anbauteile.json
 *   "fl_bauteile": { … }           Inhalt von data/fl_bauteile.json
 * }
 *
 * Fehlt ein Teil, bleibt der bisherige stehen - so lässt sich auch nur das
 * Sortiment austauschen.
 * ---------------------------------------------------------------------------
 */

import { setzeDatenbank, datenbank } from './data.tragjoche.js';
import { setzeAnbauteilDB, anbauteilDB } from './data.anbauteile.js';
import { setzeFlDB, flDB } from './data.fl.js';

export const PAKET_FORMAT = 'tragjoch-daten';
export const PAKET_VERSION = 1;
const SPEICHER = 'tragjoch-daten-v1';

/** Die drei Teile mit ihren Setzern und einer Kurzbeschreibung. */
const TEILE = [
  { key: 'tragjoche', label: 'Jochtypen', setze: setzeDatenbank,
    zaehle: (d) => d?.typen?.length ?? 0, einheit: 'Typen' },
  { key: 'anbauteile', label: 'Anbauteil-Vorlagen', setze: setzeAnbauteilDB,
    zaehle: (d) => d?.vorlagen?.length ?? 0, einheit: 'Vorlagen' },
  { key: 'fl_bauteile', label: 'Lasttabelle', setze: setzeFlDB,
    zaehle: (d) => d?.bauteile?.length ?? 0, einheit: 'Bauteile' },
];

/**
 * Prüft ein Paket, bevor es angewendet wird.
 * Ein halb angewendetes Paket wäre schlimmer als ein abgelehntes - deshalb
 * erst vollständig prüfen, dann setzen.
 *
 * @returns {{ok:boolean, fehler:string[], teile:object[]}}
 */
export function pruefePaket(obj) {
  const fehler = [];
  if (!obj || typeof obj !== 'object') {
    return { ok: false, fehler: ['Die Datei enthält kein Objekt.'], teile: [] };
  }
  if (obj.format && obj.format !== PAKET_FORMAT) {
    fehler.push(`Fremdes Format «${obj.format}», erwartet «${PAKET_FORMAT}».`);
  }
  if (obj.version && obj.version > PAKET_VERSION) {
    fehler.push(`Paketversion ${obj.version} ist neuer als diese Anwendung `
                + `(${PAKET_VERSION}).`);
  }
  const teile = TEILE
    .filter((t) => obj[t.key])
    .map((t) => ({ ...t, anzahl: t.zaehle(obj[t.key]) }));
  if (!teile.length) {
    fehler.push('Das Paket enthält keinen der drei Teile '
                + `(${TEILE.map((t) => t.key).join(', ')}).`);
  }
  teile.forEach((t) => {
    if (!t.anzahl) fehler.push(`Teil «${t.key}» ist leer.`);
  });
  return { ok: !fehler.length, fehler, teile };
}

/**
 * Wendet ein geprüftes Paket an.
 * @param {object} obj
 * @param {boolean} sichern auch im Browser hinterlegen
 * @returns {{teile:object[]}}
 */
export function paketAnwenden(obj, sichern = true) {
  const p = pruefePaket(obj);
  if (!p.ok) throw new Error(p.fehler.join(' '));
  p.teile.forEach((t) => t.setze(obj[t.key]));
  if (sichern) speichern(obj);
  return { teile: p.teile };
}

/** Baut aus den geladenen Datenbanken ein Paket zum Sichern. */
export function paketAus(bezeichnung = '') {
  const nimm = (fn) => { try { return fn(); } catch { return null; } };
  const paket = {
    format: PAKET_FORMAT,
    version: PAKET_VERSION,
    stand: new Date().toISOString().slice(0, 10),
    ...(bezeichnung ? { bezeichnung } : {}),
  };
  const tj = nimm(datenbank), at = nimm(anbauteilDB), fl = nimm(flDB);
  if (tj) paket.tragjoche = tj;
  if (at) paket.anbauteile = at;
  if (fl) paket.fl_bauteile = fl;
  return paket;
}

// --- Ablage im Browser ------------------------------------------------------

/** Hinterlegt das Paket lokal. Fehlschlag ist kein Grund zum Abbruch. */
export function speichern(obj) {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(obj));
    return true;
  } catch {
    return false;                 // Speicher voll oder gesperrt
  }
}

/** Holt das hinterlegte Paket, falls vorhanden. */
export function ausSpeicher() {
  try {
    const roh = localStorage.getItem(SPEICHER);
    return roh ? JSON.parse(roh) : null;
  } catch {
    return null;
  }
}

/** Entfernt das hinterlegte Paket. */
export function speicherLeeren() {
  try { localStorage.removeItem(SPEICHER); return true; } catch { return false; }
}

/**
 * Sind Daten vorhanden - eingebettet, gefetcht oder hinterlegt?
 * Fragt die drei Datenbanken selbst, nicht den Speicher.
 */
export function datenVorhanden() {
  try { return (datenbank()?.typen?.length ?? 0) > 0; } catch { return false; }
}

/**
 * Beim Start: erst die eingebetteten bzw. nachgeladenen Daten versuchen,
 * sonst das hinterlegte Paket. Wirft NICHT - der Aufrufer entscheidet, was
 * er dem Benutzer zeigt.
 *
 * @param {Function[]} lader die drei lade*-Funktionen
 * @returns {{quelle:'datei'|'ablage'|'keine', teile:object[]}}
 */
export async function datenBereitstellen(lader) {
  const versuche = await Promise.allSettled(lader.map((f) => f()));
  if (versuche.every((v) => v.status === 'fulfilled')) {
    return { quelle: 'datei', teile: [] };
  }
  const paket = ausSpeicher();
  if (paket) {
    try {
      const { teile } = paketAnwenden(paket, false);
      return { quelle: 'ablage', teile };
    } catch { /* unbrauchbar hinterlegt - wie keine Daten behandeln */ }
  }
  return { quelle: 'keine', teile: [] };
}
