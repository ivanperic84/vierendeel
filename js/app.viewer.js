/**
 * app.viewer.js - die Viewer-Ausleitung (18. November).
 *
 * Weisung: «als viewer stelle ich mir eine html ausleitung vor wo man das
 * modell betrachten kann und der bericht enthalten ist, alles hardcoded»,
 * dazu «ist es auch möglich den bericht interaktiv zu gestalten wo man die
 * auf die jeweiligen abbildungen klicken kann und man dann zu der 3d switcht
 * dynamisch? zustäzlich noch die verwendeten tragwersteile mit den
 * dazugehörigen querschnitten und einem Massenauszug aufführen.»
 *
 * EINE DATEI, DIE NICHT RECHNET. Sie trägt:
 *   - die Szene des 3D-Bildes (Hülle, mit verformter Figur) als Zahlen,
 *   - je Lastfall die Werte der Flächen (η, σ_v, σ, M, V, N, T),
 *   - den Nachweisbericht des Stabwerks (mit Ansichtsangaben an den Bildern),
 *   - die Tragwerksteile mit Querschnitten und den Massenauszug,
 *   - die Laufzeit (js/viewer.js, beim Bündeln nach js/viewer.laufzeit.js).
 * Keine Sortimente, kein Rechenkern, keine Eingabe. Was im Bericht steht,
 * steht dort schon gerechnet - mehr verrät die Datei nicht.
 */
import { VIEWER_LAUFZEIT } from './viewer.laufzeit.js';
import { berichtStabwerkHtml, stabwerkBerichtDaten } from './app.bericht.js';
import { berichtVorgabe } from './export.nachweisbericht.js';
import { blattUrteil } from './export.stabbericht.js';
import { reiheOhneStabmodell } from './app.stabwerk.js';
import { APP_NAME, dateiStamm, rechensatz, verortung } from './core.constants.js';
import { dateiSpeichern } from './store.js';

/** Die Grössen, die je Lastfall wechseln (w und η w gelten der Hülle). */
export const VIEWER_FELDER = ['eta', 'sig_v', 'sig', 'M', 'V', 'N', 'T'];

/** Zahl auf vier Stellen nach dem Komma - Koordinaten auf 0.1 mm, η auf 1e-4. */
const rund = (v) => (Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : v);

/**
 * Eine Szene als reine Daten: ohne Funktionen, ohne Merkfelder (`_…`),
 * Zahlen gerundet. Geteilte Teilobjekte werden mehrfach geschrieben - die
 * Szene hat keine echten Zyklen (gemessen: JSON.stringify geht durch).
 */
export function szeneDaten(sz) {
  return JSON.parse(JSON.stringify(sz, (k, v) => {
    if (typeof v === 'function' || k.startsWith('_')) return undefined;
    if (v instanceof Map) return undefined;
    return typeof v === 'number' ? rund(v) : v;
  }));
}

/** Kennung einer Fläche, um sie in der Szene eines Lastfalls wiederzufinden. */
const flaechenKey = (f) => `${f.gruppe}|${f.teil ?? ''}|${f.station ?? ''}|${rund(f.xMitte ?? 0)}|${f.twId ?? ''}`;

/**
 * Je Lastfall die Werte der Flächen der Hülle, in derselben Reihenfolge
 * (null, wo die Fläche keinen Wert trägt). Zugeordnet über die Kennung der
 * Fläche und ihr Vorkommen, nicht über den Index: Pfeile und Marken können
 * je Fall anders ausfallen.
 */
export function werteJeFall(huelle, faelle) {
  const index = new Map();
  huelle.flaechen.forEach((f, i) => {
    const k = flaechenKey(f);
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(i);
  });
  return faelle.map((fa) => {
    // Je Fläche ein Verweis in die Wertetabelle des Falls (-1 = ohne Wert):
    // die Flächen eines Stabes tragen dieselben Werte, die Tabelle ist
    // deshalb viel kürzer als die Flächenliste (J90/20 m: 4.4 MB → s. Prüfstand).
    const idx = new Array(huelle.flaechen.length).fill(-1);
    const tab = [], tabIndex = new Map();
    const zaehler = new Map();
    let gefunden = 0;
    (fa.szene?.flaechen ?? []).forEach((f) => {
      if (!f.werte) return;
      const k = flaechenKey(f);
      const n = zaehler.get(k) ?? 0;
      zaehler.set(k, n + 1);
      const i = index.get(k)?.[n];
      if (i === undefined) return;
      const zeile = VIEWER_FELDER.map((feld) => rund(f.werte[feld] ?? null));
      const k2 = zeile.join('|');
      if (!tabIndex.has(k2)) { tabIndex.set(k2, tab.length); tab.push(zeile); }
      idx[i] = tabIndex.get(k2);
      gefunden++;
    });
    return { key: fa.key, bez: fa.bez, art: fa.art, tab, idx, gefunden };
  });
}

/** Die Daten des Viewers (ohne Laufzeit) - auch für den Prüfstand. */
export function viewerDaten(app) {
  const grund = reiheOhneStabmodell(app.werte);
  if (grund) throw new Error(`Viewer nicht möglich: ${grund}`);
  const d = stabwerkBerichtDaten(app);
  const wahl = { ...berichtVorgabe(), umfang: 'anhang' };
  const bericht = berichtStabwerkHtml(app, wahl, d);
  const sz = app.viewerSzenen();
  if (!sz) throw new Error('Viewer nicht möglich: kein gültig gerechnetes Stabwerk.');
  const huelle = szeneDaten(sz.szene);
  const U = blattUrteil(d);
  return {
    format: 'vierendeel-viewer', version: 1,
    titel: app.projekt?.name || 'Querprofil', ort: verortung(app.werte) || '',
    fassung: `${APP_NAME} ${app.VERSION}`, datum: new Date().toLocaleDateString('de-CH'),
    urteil: { eta: U.eta, massgebend: U.massgebend?.name ?? null,
              liste: U.liste.map((x) => ({ name: x.name, eta: x.eta, ueber: x.ueber, bez: x.bez ?? null })) },
    szene: huelle,
    verformt: sz.verformt ? szeneDaten(sz.verformt) : null,
    felder: VIEWER_FELDER,
    faelle: werteJeFall(sz.szene, sz.faelle),
    karte: sz.karte,
    massen: d.massen,
    bericht,
  };
}

/** Die fertige HTML-Datei. */
export function viewerHtml(daten) {
  const json = JSON.stringify(daten).replace(/</g, '\\u003c');
  const titel = String(daten.titel ?? 'Viewer').replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  return VIEWER_LAUFZEIT
    .replace('__VIEWER_TITEL__', titel)
    .replace('__VIEWER_DATEN__', () => json);
}

/** Der Knopf im Exportmenü. */
export function viewerAusleiten(app) {
  const daten = viewerDaten(app);
  const html = viewerHtml(daten);
  dateiSpeichern(html, `${dateiStamm(rechensatz(app.werte))}_Viewer.html`, 'text/html');
  const mb = (html.length / 1048576).toFixed(1);
  app.meldeImBalken(`Viewer ausgeleitet (${mb} MB, ${daten.faelle.length} Lastfälle).`);
}
