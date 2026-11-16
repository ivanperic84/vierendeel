/**
 * SPRACHEN DER OBERFLÄCHE (16. November).
 *
 * Weisung: «nutze das alte statiktool excel und die regelwerk dokumente im
 * grundlagenordner für eine übersetzung ins französische und italienische
 * des tools.» Auf Rückfrage: «Schulung zuerst», «Umschalter in der App»,
 * Quelle «Mastberechnung alt».
 *
 * WIE: Die Masken bauen ihre Texte weiter auf Deutsch. Nach jedem Zeichnen
 * übersetzt `uebersetzen` die Textknoten und die Attribute title,
 * placeholder, aria-label über das Wörterbuch (`sprache.texte.js`): erst
 * ganze Texte, dann Muster mit Zahlen. Was nicht im Wörterbuch steht, bleibt
 * Deutsch - lieber ein deutsches Wort als ein falsches. Eingaben (Namen,
 * Zahlen in Feldern) werden nie angefasst.
 *
 * Die Fachbegriffe Französisch stammen aus der Texttabelle der alten
 * Mastberechnung und den zweisprachigen Regelwerk-Blättern (Einwirkungen);
 * für Italienisch gab es im Grundlagenordner keine Quelle - die Begriffe
 * sind die gebräuchlichen und zur Durchsicht durch eine Fachperson
 * italienischer Sprache bestimmt.
 *
 * Gilt vorerst in der Schulung (Rückfrage «Schulung zuerst»); die
 * Vollversion bleibt Deutsch.
 */
import { TEXTE, MUSTER } from './sprache.texte.js';

export const SPRACHEN = [
  { key: 'de', label: 'DE', name: 'Deutsch' },
  { key: 'fr', label: 'FR', name: 'Français' },
  { key: 'it', label: 'IT', name: 'Italiano' },
];
const KEY = 'tragjoch-sprache';

function ausAdresse() {
  try {
    const s = new URLSearchParams(globalThis.location?.search ?? '').get('lang');
    return SPRACHEN.some((x) => x.key === s) ? s : null;
  } catch { return null; }
}
let AKTIV = 'de';
try {
  AKTIV = ausAdresse()
    ?? (typeof localStorage !== 'undefined' && SPRACHEN.some((x) => x.key === localStorage.getItem(KEY))
      ? localStorage.getItem(KEY) : 'de');
} catch { AKTIV = 'de'; }

export function sprache() { return AKTIV; }
export function spracheSetzen(s) {
  if (!SPRACHEN.some((x) => x.key === s)) return;
  AKTIV = s;
  try { localStorage.setItem(KEY, s); } catch { /* kein Speicher */ }
  if (typeof document !== 'undefined') document.documentElement.lang = s === 'de' ? 'de-CH' : `${s}-CH`;
}

/*
 * Was schon übersetzt ist, wird nicht noch einmal übersetzt: ein Muster kann
 * auf seine eigene Übersetzung passen («X : 86 % (η …)»), und der Beobachter
 * sähe jede Änderung als neue - die Seite hing dabei in einer Schleife.
 */
const FERTIG = new Set();

/** Ein Text in der aktiven Sprache (ganzer Text, sonst Muster, sonst unverändert). */
export function tr(text, s = AKTIV) {
  if (s === 'de' || text == null) return text;
  const roh = String(text);
  const t = roh.trim();
  if (!t || FERTIG.has(t)) return roh;
  const fertig = (neu) => { FERTIG.add(neu.trim()); return roh.replace(t, neu); };
  const e = TEXTE[t]?.[s];
  if (e) return fertig(e);
  for (const m of MUSTER) {
    const r = m.re.exec(t);
    if (r && m[s]) {
      // Funktionen bekommen als Letztes den Übersetzer selbst (Teiltexte wie Lastfallnamen).
      return fertig(typeof m[s] === 'function' ? m[s](...r.slice(1), (x) => tr(x, s)) : t.replace(m.re, m[s]));
    }
  }
  return roh;
}

const ATTR = ['title', 'placeholder', 'aria-label'];
const AUSLASSEN = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE']);

/** Übersetzt einen Teilbaum (Textknoten und Attribute). */
export function uebersetzen(wurzel, s = AKTIV) {
  if (s === 'de' || !wurzel || typeof document === 'undefined') return;
  const geh = document.createTreeWalker(wurzel, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      if (n.nodeType === 1) {
        if (AUSLASSEN.has(n.tagName) || n.hasAttribute?.('data-kein-tr')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const el = wurzel.nodeType === 1 ? [wurzel] : [];
  for (let n = geh.currentNode; n; n = geh.nextNode()) {
    if (n.nodeType === 3) {
      const neu = tr(n.nodeValue, s);
      if (neu !== n.nodeValue) n.nodeValue = neu;
    } else if (n.nodeType === 1) el.push(n);
  }
  el.forEach((e) => ATTR.forEach((a) => {
    const v = e.getAttribute?.(a);
    if (v) { const neu = tr(v, s); if (neu !== v) e.setAttribute(a, neu); }
  }));
}

/**
 * Beobachtet das Dokument und übersetzt, was neu gezeichnet wird. Einmal
 * beim Start; mit «de» tut es nichts.
 */
let beobachter = null;
export function uebersetzerStarten() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  document.documentElement.lang = AKTIV === 'de' ? 'de-CH' : `${AKTIV}-CH`;
  if (AKTIV === 'de' || beobachter) return;
  uebersetzen(document.body);
  beobachter = new MutationObserver((liste) => {
    for (const m of liste) {
      if (m.type === 'characterData') {
        const n = m.target; const neu = tr(n.nodeValue);
        if (neu !== n.nodeValue) n.nodeValue = neu;
      } else if (m.type === 'attributes') {
        const v = m.target.getAttribute(m.attributeName);
        if (v) { const neu = tr(v); if (neu !== v) m.target.setAttribute(m.attributeName, neu); }
      } else {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 3) { const neu = tr(n.nodeValue); if (neu !== n.nodeValue) n.nodeValue = neu; }
          else if (n.nodeType === 1 && !AUSLASSEN.has(n.tagName)) uebersetzen(n);
        });
      }
    }
  });
  beobachter.observe(document.body, { childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ATTR });
}
