/**
 * app.bilder.js
 * ---------------------------------------------------------------------------
 * >>> BILDSAMMLUNG DES 3D (26. November). <<< Weisung: «als outputmöglichkeit
 * wäre noch eine printscreen bibliothek gewünscht wo man den 3d plot als
 * bild (weisser hintergrund) abspeichern könnte.», auf Rückfrage «Sammlung im
 * Projekt»: «Bild aufnehmen» legt das 3D, wie es gerade steht (Blick, Plot,
 * Lastfall, Ebenen), im hellen Design auf weissem Grund als PNG in eine Liste
 * beim Eintrag der Projektablage (ohne Eintrag: beim Arbeitsstand). Im Fenster
 * «Bildsammlung» ansehen, Titel ändern, einzeln oder alle als PNG sichern,
 * löschen.
 *
 * Gespeichert in IndexedDB neben den Zeichnungen (store.bilderLaden /
 * store.bilderSichern); nicht im Ablage-Paket.
 *
 * >>> OUTPUT, ZWISCHENABLAGE, RAHMEN, ANSICHT FESTHALTEN (26. November). <<<
 * Weisung: «in diesem fenster und unter den optionen einstellungen über den
 * output definieren können. beim foto machen automatisch in den
 * zwischenspeicher legen. wenn man rechtsklick macht kann man einen bericht
 * definieren mit rahmen im 3d fenster.» Auf Rückfrage: Output «bennung des
 * resultatplots / legende und systemachse ein- ausstellbar machen», dazu
 * Grösse / Auflösung, Hintergrund und Stil, Beschriftung im Bild, Dateiname
 * und Format; Rahmen «den rahmen kann man frei definieren, dieser wird dann
 * beim nächsten rechtsklick angezeigt als vorlage, falls man disen nicht will
 * kann man einen neuen ziehen. was noch fehlt ist ein kamerafreez button wo man
 * die darstellungs art sichtabrkeit der layer und den bildausschnitt
 * definieren kann.»
 * ---------------------------------------------------------------------------
 */
import * as store from './store.js';
import { esc, tokens, uebertrageTokens } from './design.js';
import { modiFuer } from './app.layout.js';
import { PLOTS } from './render.3d.js';
import { kontextZeigen } from './app.kontext.js';

const schluessel = (app) => app.projekt?.id || store.ARBEITS_ZEICHNUNG;

/* ------------------------------------------------------------------------ *
 * Einstellungen des Bild-Outputs (im Browser gemerkt, gelten jedem Projekt).
 * ------------------------------------------------------------------------ */
const OPT_KEY = 'tragjoch-bild-optionen';
export const BILD_VORGABE = {
  faktor: 2,               // Auflösung: 1×, 2×, 3× der Bildschirmgrösse
  hintergrund: 'weiss',    // 'weiss' | 'thema'
  strich: false,           // als Strichbild aufnehmen
  zuschnitt: true,         // auf den Inhalt zuschneiden (ohne Rahmen)
  titel: true,             // Benennung des Resultatplots und Lastfall ins Bild
  legende: true,           // Farbskala ins Bild
  achsen: true,            // Systemachsen (Achsenkreuz)
  format: 'png',           // 'png' | 'jpg'
  muster: '{projekt}_{plot}_{nr}',
  zwischenablage: true,    // jede Aufnahme auch in die Zwischenablage
};
export function bildOptionen() {
  try { return { ...BILD_VORGABE, ...JSON.parse(localStorage.getItem(OPT_KEY) || '{}') }; }
  catch { return { ...BILD_VORGABE }; }
}
function bildOptionenSetzen(o) {
  try { localStorage.setItem(OPT_KEY, JSON.stringify(o)); } catch { /* nur Ansicht */ }
}

/** Die Felder der Einstellungen - im Fenster «Bildsammlung» und unter Optionen. */
export function bildOptionenHtml() {
  const o = bildOptionen();
  const ja = (k, t, erkl = '') => `<label class="bo-ja" title="${esc(erkl)}"><input type="checkbox" data-bo="${k}"${o[k] ? ' checked' : ''}> ${t}</label>`;
  const wahl = (k, liste) => `<select data-bo="${k}">${liste.map(([w, t]) =>
    `<option value="${w}"${String(o[k]) === String(w) ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
  return `<div class="bo-raster">
    <label>Auflösung ${wahl('faktor', [[1, '1× Bildschirm'], [2, '2×'], [3, '3× (Druck)']])}</label>
    <label>Hintergrund ${wahl('hintergrund', [['weiss', 'weiss'], ['thema', 'wie Darstellung']])}</label>
    <label>Format ${wahl('format', [['png', 'PNG'], ['jpg', 'JPG']])}</label>
    <label class="bo-breit">Dateiname <input type="text" data-bo="muster" value="${esc(o.muster)}"
      title="Platzhalter: {projekt} {tragwerk} {plot} {lastfall} {datum} {nr}"></label>
    ${ja('titel', 'Benennung des Resultatplots und Lastfall', 'oben links ins Bild')}
    ${ja('legende', 'Legende (Farbskala)', 'unten rechts ins Bild')}
    ${ja('achsen', 'Systemachsen', 'das Achsenkreuz unten links')}
    ${ja('strich', 'als Strichbild', 'weisser Grund, Körper blass, wie im Bericht')}
    ${ja('zuschnitt', 'auf den Inhalt zuschneiden', 'gilt ohne Rahmen')}
    ${ja('zwischenablage', 'in die Zwischenablage', 'jede Aufnahme auch als Bild in die Zwischenablage')}
  </div>`;
}
export function bildOptionenVerdrahten(node) {
  node.querySelectorAll('[data-bo]').forEach((el) => {
    el.addEventListener('change', () => {
      const o = bildOptionen();
      const k = el.dataset.bo;
      o[k] = el.type === 'checkbox' ? el.checked : (k === 'faktor' ? Number(el.value) : el.value);
      bildOptionenSetzen(o);
    });
  });
}

/* ------------------------------------------------------------------------ *
 * Der Rahmen (Bildausschnitt), relativ zum 3D-Fenster gemerkt.
 * ------------------------------------------------------------------------ */
const RAHMEN_KEY = 'tragjoch-bild-rahmen';
const rahmenLesen = () => { try { return JSON.parse(localStorage.getItem(RAHMEN_KEY) || 'null'); } catch { return null; } };
const rahmenAn = () => { try { return localStorage.getItem(`${RAHMEN_KEY}-an`) === '1'; } catch { return false; } };
function rahmenSetzen(r, an) {
  try {
    if (r) localStorage.setItem(RAHMEN_KEY, JSON.stringify(r));
    localStorage.setItem(`${RAHMEN_KEY}-an`, an ? '1' : '0');
  } catch { /* nur Ansicht */ }
  rahmenZeigen();
}

/** Der gültige Rahmen als gestrichelte Linie über dem 3D (nur Anzeige). */
export function rahmenZeigen() {
  const v = document.getElementById('viewer');
  if (!v) return;
  let el = v.querySelector('.bild-rahmen');
  const r = rahmenAn() ? rahmenLesen() : null;
  if (!r) { el?.remove(); return; }
  const cv = v.querySelector('canvas');
  if (!cv) return;
  if (!el) { el = document.createElement('div'); el.className = 'bild-rahmen'; v.appendChild(el); }
  const vb = v.getBoundingClientRect(), cb = cv.getBoundingClientRect();
  Object.assign(el.style, { left: `${cb.left - vb.left + r.x * cb.width}px`, top: `${cb.top - vb.top + r.y * cb.height}px`,
                            width: `${r.w * cb.width}px`, height: `${r.h * cb.height}px` });
}

/**
 * Rechtsklick auf die Kamera: der gemerkte Rahmen erscheint als Vorlage -
 * übernehmen, oder einen neuen ziehen; «ohne Rahmen» schaltet ihn ab.
 */
export function rahmenBearbeiten(app) {
  const v = document.getElementById('viewer');
  const cv = v?.querySelector('canvas');
  if (!v || !cv) return;
  v.querySelector('.bild-rahmen-wahl')?.remove();
  const cb = cv.getBoundingClientRect(), vb = v.getBoundingClientRect();
  const ov = document.createElement('div');
  ov.className = 'bild-rahmen-wahl';
  Object.assign(ov.style, { left: `${cb.left - vb.left}px`, top: `${cb.top - vb.top}px`, width: `${cb.width}px`, height: `${cb.height}px` });
  let r = rahmenLesen();
  ov.innerHTML = `<div class="brw-box"></div>
    <div class="brw-leiste"><span>${r ? 'Gemerkter Rahmen - übernehmen oder neu ziehen' : 'Rahmen ziehen'}</span>
      <button class="btn btn-mini btn-acc" data-brw="ok" type="button"${r ? '' : ' disabled'}>Übernehmen</button>
      <button class="btn btn-mini" data-brw="aus" type="button">Ohne Rahmen</button>
      <button class="btn btn-mini" data-brw="zu" type="button">Abbrechen</button></div>`;
  v.appendChild(ov);
  const box = ov.querySelector('.brw-box');
  const zeig = () => {
    box.hidden = !r;
    if (r) Object.assign(box.style, { left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` });
    ov.querySelector('[data-brw="ok"]').disabled = !r;
  };
  zeig();
  const ende = () => { ov.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = (e) => { if (e.key === 'Escape') ende(); };
  document.addEventListener('keydown', esc_);
  let start = null;
  ov.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.brw-leiste')) return;
    const b = ov.getBoundingClientRect();
    start = [(e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height];
    ov.setPointerCapture(e.pointerId);
  });
  ov.addEventListener('pointermove', (e) => {
    if (!start) return;
    const b = ov.getBoundingClientRect();
    const p = [Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), Math.min(1, Math.max(0, (e.clientY - b.top) / b.height))];
    r = { x: Math.min(start[0], p[0]), y: Math.min(start[1], p[1]), w: Math.abs(p[0] - start[0]), h: Math.abs(p[1] - start[1]) };
    zeig();
  });
  ov.addEventListener('pointerup', () => {
    if (!start) return;
    start = null;
    if (r && (r.w < 0.03 || r.h < 0.03)) r = rahmenLesen();
    zeig();
  });
  ov.querySelector('.brw-leiste').addEventListener('click', (e) => {
    const k = e.target.closest('[data-brw]')?.dataset.brw;
    if (k === 'ok' && r) { rahmenSetzen(r, true); app.meldeImBalken('Rahmen gesetzt - Aufnahmen nehmen diesen Ausschnitt.'); ende(); }
    else if (k === 'aus') { rahmenSetzen(null, false); app.meldeImBalken('Ohne Rahmen - Aufnahmen nehmen das ganze Bild.'); ende(); }
    else if (k === 'zu') ende();
  });
}

/* ------------------------------------------------------------------------ *
 * >>> ANSICHTEN SPEICHERN (26. November). <<< Weisung: «hier sollte man nicht
 * einfach die ansicht sperren können sonder die ansicht speichern, mit
 * rechtsklick auf die kachel kann man dann die ansicht aufrufen aus der
 * auswahl der gespeicherten ansichten.» Ersetzt das Festhalten vom selben Tag.
 * Gespeichert: Blick und Ausschnitt (Kamera), Ebenen, Gruppen, Plot, Werte,
 * Linie, Strichbild, Explosion - im Browser, für alle Projekte.
 * ------------------------------------------------------------------------ */
const ANSICHTEN_KEY = 'tragjoch-ansichten';
const ansichtenLesen = () => { try { return JSON.parse(localStorage.getItem(ANSICHTEN_KEY) || '[]'); } catch { return []; } };
const ansichtenSetzen = (l) => { try { localStorage.setItem(ANSICHTEN_KEY, JSON.stringify(l)); } catch { /* nur Ansicht */ } };

export function ansichtSpeichern(app) {
  const a = app.ansicht;
  if (!a) return;
  const liste = ansichtenLesen();
  const plot = plotName(app);
  const blick = { iso: 'Iso', laengs: 'Längs', quer: 'Quer', oben: 'Drauf' }[a.ansichtKey] ?? 'frei';
  const v = {
    name: `Ansicht ${liste.length + 1} · ${plot || a.modus} · ${blick}`, datum: jetzt(),
    kamera: structuredClone(a.kamera), ansichtKey: a.ansichtKey, ebenen: structuredClone(a.ebenen),
    gruppen: structuredClone(a.gruppen), modus: a.modus, werte: a.werteAnschreiben, explosion: a.explosion ?? 0,
    linie: document.getElementById('wz-r-linie')?.getAttribute('aria-pressed') === 'true',
    strich: document.getElementById('v-strich')?.getAttribute('aria-pressed') === 'true',
  };
  liste.push(v);
  ansichtenSetzen(liste.slice(-30));
  app.meldeImBalken(`«${v.name}» gespeichert - Rechtsklick auf den Knopf ruft sie auf.`);
}

function ansichtAnwenden(app, v) {
  const a = app.ansicht;
  if (!a || !v) return;
  if (v.modus && a.modus !== v.modus) app.plotWahl?.(v.modus);
  const knopf = (id, soll) => { const k = document.getElementById(id); if (k && (k.getAttribute('aria-pressed') === 'true') !== soll) k.click(); };
  knopf('wz-r-linie', Boolean(v.linie));
  knopf('v-strich', Boolean(v.strich));
  a.kamera = structuredClone(v.kamera);
  a.ansichtKey = v.ansichtKey;
  a.ebenen = { ...a.ebenen, ...structuredClone(v.ebenen) };
  a.gruppen = { ...a.gruppen, ...structuredClone(v.gruppen) };
  a.werteAnschreiben = Boolean(v.werte);
  a.explosion = Number(v.explosion) || 0;
  app.nachAnsicht?.();
  app.meldeImBalken(`«${v.name}» aufgerufen.`);
}

/** Rechtsklick: die gespeicherten Ansichten zur Wahl. */
export function ansichtWahl(app, e) {
  const liste = ansichtenLesen();
  const punkte = [{ kopf: liste.length ? 'Gespeicherte Ansichten' : 'Noch keine Ansicht gespeichert' }];
  liste.slice().reverse().forEach((v, k) => {
    const i = liste.length - 1 - k;
    punkte.push({ text: v.name, tun: () => ansichtAnwenden(app, ansichtenLesen()[i]) });
  });
  punkte.push(null, { text: 'Aktuelle Ansicht speichern', tun: () => ansichtSpeichern(app) });
  if (liste.length) punkte.push({ text: 'Ansichten verwalten …', tun: () => ansichtenVerwalten(app) });
  kontextZeigen(app, [e.clientX, e.clientY], punkte);
}

function ansichtenVerwalten(app) {
  let liste = ansichtenLesen();
  const koerper = () => (liste.length ? `<table class="dt"><tbody>${liste.map((v, i) => `<tr>
      <td><input type="text" data-an-name="${i}" value="${esc(v.name)}" style="width:100%"></td>
      <td class="ablage-meta">${esc(v.datum ?? '')}</td>
      <td><button class="btn btn-mini" data-an-auf="${i}" type="button">Aufrufen</button>
          <button class="btn btn-mini" data-an-weg="${i}" type="button">Löschen</button></td></tr>`).join('')}</tbody></table>`
    : '<p class="notiz">Keine gespeicherten Ansichten.</p>');
  const d = app.dialog('Gespeicherte Ansichten', `<div data-an>${koerper()}</div>`, '<button class="btn" data-zu>Schliessen</button>');
  const neu = () => { ansichtenSetzen(liste); d.node.querySelector('[data-an]').innerHTML = koerper(); };
  d.node.addEventListener('click', (ev) => {
    const t = ev.target instanceof Element ? ev.target : null;
    if (t?.matches('[data-an-weg]')) { liste.splice(+t.dataset.anWeg, 1); neu(); }
    else if (t?.matches('[data-an-auf]')) { d.zu?.(); ansichtAnwenden(app, liste[+t.dataset.anAuf]); }
  });
  d.node.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t instanceof HTMLInputElement && t.dataset.anName !== undefined) { liste[+t.dataset.anName].name = t.value.trim() || liste[+t.dataset.anName].name; ansichtenSetzen(liste); }
  });
}

/* ------------------------------------------------------------------------ *
 * Die Aufnahme.
 * ------------------------------------------------------------------------ */

/** Das 3D wie es steht, nach den Einstellungen. */
function aufnahme(app, o = bildOptionen()) {
  if (!app.ansicht) return null;
  const weiss = o.hintergrund !== 'thema';
  const vorher = app.thema;
  if (weiss && vorher !== 'hell') uebertrageTokens('hell');
  try {
    return app.ansicht.momentaufnahme(null, { aktuell: true, weiss, faktor: Number(o.faktor) || 1,
                                              ohneAchsen: !o.achsen, strich: o.strich ? true : undefined });
  } finally {
    if (weiss && vorher !== 'hell') { uebertrageTokens(vorher); app.ansicht.zeichneJetzt(); }
  }
}

const bildLaden = async (url) => { const img = new Image(); img.src = url; await img.decode(); return img; };

/**
 * Auf den Inhalt zuschneiden (Rand 4 % bzw. mindestens 24 px): das
 * Modellfenster ist oft hoch und schmal, das Modell sass klein in viel Weiss.
 */
async function zuschneiden(url, grund = [255, 255, 255]) {
  try {
    const img = await bildLaden(url);
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, w, h).data;
    const anders = (k) => Math.abs(d[k] - grund[0]) > 10 || Math.abs(d[k + 1] - grund[1]) > 10 || Math.abs(d[k + 2] - grund[2]) > 10;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let j = 0; j < h; j += 2) {
      for (let i = 0; i < w; i += 2) {
        if (anders((j * w + i) * 4)) {
          if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j;
        }
      }
    }
    if (x1 < 0) return url;
    const r = Math.max(24, Math.round(0.04 * Math.max(x1 - x0, y1 - y0)));
    x0 = Math.max(0, x0 - r); y0 = Math.max(0, y0 - r);
    x1 = Math.min(w, x1 + r); y1 = Math.min(h, y1 + r);
    return ausschnitt(img, x0, y0, x1 - x0, y1 - y0, grund);
  } catch { return url; }
}
function ausschnitt(img, x0, y0, bw, bh, grund) {
  const z = document.createElement('canvas'); z.width = Math.max(1, Math.round(bw)); z.height = Math.max(1, Math.round(bh));
  const zx = z.getContext('2d'); zx.fillStyle = `rgb(${grund.join(',')})`; zx.fillRect(0, 0, z.width, z.height);
  zx.drawImage(img, x0, y0, bw, bh, 0, 0, z.width, z.height);
  return z.toDataURL('image/png');
}

/** Benennung des Plots und Lastfall oben links, Farbskala unten rechts. */
async function beschriften(app, url, o, grund) {
  if (!o.titel && !o.legende) return url;
  const img = await bildLaden(url);
  const w = img.naturalWidth, h = img.naturalHeight;
  const f = Math.max(1, Number(o.faktor) || 1);
  const s = Math.max(1, Math.min(w, h) / 600) * Math.min(f, 2) * 0.9;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const dunkel = (grund[0] + grund[1] + grund[2]) / 3 < 128;
  const schrift = dunkel ? '#e6e8ec' : '#1c1f24', blass = dunkel ? '#9aa1ad' : '#555763';
  const plot = PLOTS.find((p) => p.key === app.ansicht?.modus);
  const mo = modiFuer(app.nachweisart).find((m) => m.key === app.ansicht?.modus);
  if (o.titel) {
    const lf = document.getElementById('pos-lf')?.textContent?.trim() ?? '';
    x.fillStyle = schrift; x.font = `600 ${Math.round(15 * s)}px sans-serif`; x.textBaseline = 'top';
    x.fillText(`${mo?.label ?? plot?.label ?? ''}${plot?.einheit && plot.einheit !== '–' ? ` [${plot.einheit}]` : ''}`, 14 * s, 12 * s);
    x.fillStyle = blass; x.font = `${Math.round(12 * s)}px sans-serif`;
    x.fillText(lf, 14 * s, 32 * s);
  }
  // Farbskala aus der Legende im Fenster (dieselben Farben und Marken).
  const bar = document.querySelector('#legende .legende-bar');
  if (o.legende && bar && plot) {
    const bild = getComputedStyle(bar).backgroundImage;
    const farben = [...bild.matchAll(/rgba?\([^)]+\)(?:\s+([\d.]+)%)?/g)].map((m, i, a) => ({
      f: m[0].replace(/\s+[\d.]+%$/, ''), p: m[1] != null ? Number(m[1]) / 100 : i / Math.max(1, a.length - 1) }));
    const marken = [...document.querySelectorAll('#legende .legende-skala span')].map((e) => e.textContent);
    const bw = 220 * s, bh = 10 * s, bx = w - bw - 18 * s, by = h - 34 * s;
    if (farben.length > 1) {
      const g = x.createLinearGradient(bx, 0, bx + bw, 0);
      farben.forEach((q) => { try { g.addColorStop(Math.min(1, Math.max(0, q.p)), q.f); } catch { /* */ } });
      x.fillStyle = g; x.fillRect(bx, by, bw, bh);
    }
    x.fillStyle = blass; x.font = `${Math.round(11 * s)}px sans-serif`; x.textBaseline = 'top';
    marken.forEach((t, i) => {
      const tx = bx + (marken.length > 1 ? (bw * i) / (marken.length - 1) : 0);
      x.textAlign = i === 0 ? 'left' : i === marken.length - 1 ? 'right' : 'center';
      x.fillText(t, tx, by + bh + 3 * s);
    });
    x.textAlign = 'left'; x.fillStyle = schrift; x.textBaseline = 'bottom';
    x.fillText(`${plot.kurz ?? ''}${plot.einheit && plot.einheit !== '–' ? ` [${plot.einheit}]` : ''}`, bx, by - 3 * s);
  }
  return c.toDataURL('image/png');
}

/** Ins Format der Einstellung (JPG auf dem Grund). */
async function inFormat(url, o, grund) {
  if (o.format !== 'jpg') return url;
  const img = await bildLaden(url);
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d'); x.fillStyle = `rgb(${grund.join(',')})`; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0);
  return c.toDataURL('image/jpeg', 0.92);
}

/** Die ganze Aufnahme: Bild, Rahmen bzw. Zuschnitt, Beschriftung, Format. */
async function bildMachen(app) {
  const o = bildOptionen();
  const roh = aufnahme(app, o);
  if (!roh) return null;
  const grund = o.hintergrund === 'thema'
    ? (String(tokens().viewerBg ?? '#15161a').replace('#', '').match(/../g) ?? ['15', '16', '1a']).slice(0, 3).map((h) => parseInt(h, 16))
    : [255, 255, 255];
  let url = roh;
  const r = rahmenAn() ? rahmenLesen() : null;
  if (r) {
    const img = await bildLaden(roh);
    url = ausschnitt(img, r.x * img.naturalWidth, r.y * img.naturalHeight, r.w * img.naturalWidth, r.h * img.naturalHeight, grund);
  } else if (o.zuschnitt) url = await zuschneiden(roh, grund);
  url = await beschriften(app, url, o, grund);
  return inFormat(url, o, grund);
}

/** In die Zwischenablage (als PNG - Office und Mail nehmen es so). */
async function inZwischenablage(url) {
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return false;
    const img = await bildLaden(url);
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch { return false; }
}

const jetzt = () => new Date().toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' });

function plotName(app) {
  return modiFuer(app.nachweisart).find((m) => m.key === app.ansicht?.modus)?.label ?? '';
}
function titelVorschlag(app) {
  const name = app.projekt?.name || 'Tragwerk';
  const lf = document.getElementById('pos-lf')?.textContent?.trim();
  return [name, plotName(app), lf].filter(Boolean).join(' · ');
}

async function aufnehmenInListe(app, liste) {
  const o = bildOptionen();
  const url = await bildMachen(app);
  if (!url) return null;
  liste.push({ titel: titelVorschlag(app), datum: jetzt(), url, plot: plotName(app),
               lastfall: document.getElementById('pos-lf')?.textContent?.trim() ?? '' });
  const ab = o.zwischenablage ? await inZwischenablage(url) : false;
  return { ab };
}

/** Knopf «Bild des 3D aufnehmen». */
export async function bildAufnehmen(app) {
  if (!app.ansicht) { app.meldeImBalken('Kein 3D-Bild vorhanden.'); return; }
  const id = schluessel(app);
  const liste = await store.bilderLaden(id);
  const r = await aufnehmenInListe(app, liste);
  if (!r) { app.meldeImBalken('Kein 3D-Bild vorhanden.'); return; }
  await store.bilderSichern(id, liste);
  app.meldeImBalken(`Bild aufgenommen${r.ab ? ' und in die Zwischenablage gelegt' : ''} - ${liste.length} in der Sammlung.`);
}

function dateiname(app, b, i) {
  const o = bildOptionen();
  const teile = {
    projekt: app.projekt?.name || 'Projekt', tragwerk: app.werte?.twId ?? 'T1', plot: b.plot || '',
    lastfall: (b.lastfall || '').replace(/^Lastfall:\s*/, ''), datum: new Date().toISOString().slice(0, 10),
    nr: String(i + 1).padStart(2, '0'),
  };
  let stamm = String(o.muster || BILD_VORGABE.muster).replace(/\{(\w+)\}/g, (m, k) => teile[k] ?? '');
  if (!stamm.trim()) stamm = b.titel || 'Bild';
  stamm = stamm.replace(/[^\w\-.äöüÄÖÜ ]+/g, '_').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 90);
  const endung = String(b.url).startsWith('data:image/jpeg') ? 'jpg' : 'png';
  return `${stamm || 'Bild'}.${endung}`;
}

function herunterladen(url, name) {
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

/** Fenster «Bildsammlung». */
export async function bildsammlungZeigen(app) {
  const id = schluessel(app);
  let liste = await store.bilderLaden(id);
  const wo = app.projekt?.id ? `Eintrag «${esc(app.projekt.name || 'ohne Namen')}»` : 'Arbeitsstand (noch nicht in der Ablage)';
  const koerper = () => (liste.length ? `<div class="bs-raster">${liste.map((b, i) => `
      <figure class="bs-bild" data-i="${i}">
        <img src="${b.url}" alt="${esc(b.titel)}" loading="lazy">
        <figcaption><input type="text" data-titel="${i}" value="${esc(b.titel)}" aria-label="Titel des Bildes">
          <small>${esc(b.datum ?? '')}</small>
          <span class="bs-knoepfe"><button class="btn btn-mini" data-sichern="${i}" type="button">Sichern</button>
          <button class="btn btn-mini" data-kopie="${i}" type="button" title="In die Zwischenablage">Kopieren</button>
          <button class="btn btn-mini" data-weg="${i}" type="button" title="Bild löschen">Löschen</button></span></figcaption>
      </figure>`).join('')}</div>`
    : '<p class="notiz">Noch keine Bilder. «Bild aufnehmen» legt das 3D, wie es gerade steht, hier ab.</p>');
  const d = app.dialog('Bildsammlung', `<p class="notiz bs-wo" style="margin-top:0">${wo} · ${liste.length} Bild(er)</p>
    <details class="bs-opt"><summary>Einstellungen zum Output</summary>${bildOptionenHtml()}</details>
    <div data-bs>${koerper()}</div>`,
    `<button class="btn" data-aufnehmen type="button">Bild aufnehmen</button>
     <button class="btn btn-acc" data-alle type="button">Alle sichern</button>`, 'dialog-breit');
  bildOptionenVerdrahten(d.node);
  const neu = async () => {
    await store.bilderSichern(id, liste);
    d.node.querySelector('[data-bs]').innerHTML = koerper();
    const n = d.node.querySelector('.bs-wo');
    if (n) n.innerHTML = `${wo} · ${liste.length} Bild(er)`;
  };
  d.node.addEventListener('click', async (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (t.matches('[data-sichern]')) { const i = +t.dataset.sichern; herunterladen(liste[i].url, dateiname(app, liste[i], i)); }
    else if (t.matches('[data-kopie]')) {
      const ok = await inZwischenablage(liste[+t.dataset.kopie].url);
      app.meldeImBalken(ok ? 'Bild in der Zwischenablage.' : 'Zwischenablage nicht verfügbar.');
    }
    else if (t.matches('[data-weg]')) { liste.splice(+t.dataset.weg, 1); await neu(); }
    else if (t.matches('[data-alle]')) { liste.forEach((b, i) => setTimeout(() => herunterladen(b.url, dateiname(app, b, i)), i * 250)); }
    else if (t.matches('[data-aufnehmen]')) { if (await aufnehmenInListe(app, liste)) await neu(); }
  });
  d.node.addEventListener('change', async (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.dataset.titel !== undefined) {
      liste[+t.dataset.titel].titel = t.value.trim();
      await store.bilderSichern(id, liste);
    }
  });
}
