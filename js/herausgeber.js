/**
 * herausgeber.js
 * ---------------------------------------------------------------------------
 * >>> HERAUSGEBER UND RECHTE DER VERSCHICKTEN FASSUNG (17. November). <<<
 *
 * Frage des Auftraggebers: «bringt es was einen hinweistext zum herausgeber
 * der app und der rechte aufzuführen. die app wird per datei versendet an die
 * kursteilnehmer.» Auf «Ja, Text folgt» kamen Name, Stelle, Firma und Jahr - sie
 * stehen nur in der örtlichen Datei.
 *
 * Der Name gehört NICHT in die öffentliche Ablage. Die Angaben stehen örtlich
 * in data/herausgeber.json (ausgeschlossen wie alle data/*.json) und kommen
 * nur so in die Anwendung:
 *   - im Bündel MIT Daten eingebettet (Tag «herausgeber-db», build_html.py),
 *   - in der Modulversion beim Start aus data/herausgeber.json geholt.
 * Ohne Datei (GitHub Pages, Bündel ohne Daten) steht nirgends ein Name.
 *
 * Wo er erscheint: Nutzungsbedingungen beim Öffnen, Handbuch zum Kurs
 * (Kapitel Nutzung), Fusszeile der Blätter der Schulung.
 * ---------------------------------------------------------------------------
 */

import { esc } from './design.js';

let angaben = null;

function pruefen(o) {
  if (!o || typeof o !== 'object') return null;
  const name = String(o.herausgeber ?? '').trim();
  const stelle = String(o.stelle ?? '').trim();
  const jahr = String(o.jahr ?? '').trim();
  const firma = String(o.firma ?? '').trim();
  return name || stelle || firma ? { name, stelle, firma, jahr, kontakt: String(o.kontakt ?? '').trim() } : null;
}

/** Holt die Angaben einmal beim Start; ohne Datei bleibt es null. */
export async function herausgeberVorbereiten() {
  const roh = typeof document !== 'undefined'
    ? document.getElementById('herausgeber-db')?.textContent?.trim() : '';
  if (roh) {
    try { angaben = pruefen(JSON.parse(roh)); } catch { angaben = null; }
    return angaben;
  }
  if (typeof location === 'undefined' || location.protocol === 'file:') return angaben;
  try {
    const r = await fetch('data/herausgeber.json', { cache: 'no-store' });
    if (r.ok) angaben = pruefen(await r.json());
  } catch { angaben = null; }
  return angaben;
}

/** Für den Prüfstand: Angaben von Hand setzen (null = keine). */
export function herausgeberSetzen(o) { angaben = pruefen(o); }
export function herausgeber() { return angaben; }

const WORTE = {
  de: { titel: 'Herausgeber', rechte: 'Alle Rechte vorbehalten.', fragen: 'Fragen und Fehlermeldungen an den Herausgeber.' },
  fr: { titel: 'Éditeur', rechte: 'Tous droits réservés.', fragen: "Questions et signalements d'erreurs à l'éditeur." },
  it: { titel: 'Editore', rechte: 'Tutti i diritti riservati.', fragen: "Domande e segnalazioni di errori all'editore." },
};

/** «Name, Stelle, Firma» */
function wer(a) { return [a.name, a.stelle, a.firma].filter(Boolean).map(esc).join(', '); }

/** Absatz für Nutzungsbedingungen und Handbuch; leer ohne Angaben. */
export function herausgeberHtml(sprache = 'de') {
  const a = angaben;
  if (!a) return '';
  const w = WORTE[sprache] ?? WORTE.de;
  const kontakt = a.kontakt ? ` (${esc(a.kontakt)})` : '';
  return `<p class="herausgeber"><b>${w.titel}:</b> ${wer(a)}${kontakt}.
    ${a.jahr ? `© ${esc(a.jahr)}. ` : ''}${w.rechte} ${w.fragen}</p>`;
}

/** Eine Zeile für die Fusszeile der Blätter; leer ohne Angaben. */
export function herausgeberZeile() {
  const a = angaben;
  if (!a) return '';
  return `${WORTE.de.titel}: ${wer(a)} · ${a.jahr ? `© ${esc(a.jahr)} ` : '© '}${WORTE.de.rechte}`;
}
