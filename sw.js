/**
 * sw.js  -  Dienstarbeiter (service worker)
 * ---------------------------------------------------------------------------
 * MACHT DIE ANWENDUNG UNABHÄNGIG VOM NETZ.
 *
 * Er liegt zwischen Browser und Netz und beantwortet Anfragen aus einer
 * eigenen Ablage. Damit startet die Anwendung auch ohne Verbindung - im Zug,
 * im Tunnel, auf der Baustelle - und zwar mit genau dem Stand, der beim
 * letzten Besuch da war.
 *
 * WAS HIER *NICHT* PASSIERT
 * Nichts wird irgendwohin gesendet. Der Dienstarbeiter hat keine Adresse
 * ausser dem eigenen Herkunftsort; die eingegebenen Tragwerke liegen wie
 * bisher allein im Browser (localStorage / IndexedDB).
 *
 * DIE ABLAGE IST VERSIONIERT
 * CACHE trägt die Fassung im Namen. Eine neue Fassung legt eine neue Ablage
 * an und räumt die alten weg - ein halb erneuerter Stand aus zwei Fassungen
 * kann so nicht entstehen. Genau dafür schreibt build_html.py den Block unten
 * bei jedem Bauen neu.
 *
 * ÜBERNAHME NUR AUF ZURUF
 * Ein neuer Dienstarbeiter wartet, bis die Seite ihm «uebernehmen» schickt
 * (siehe js/pwa.js). Ein Rechenstand darf nicht mitten im Arbeiten unter der
 * Hand ausgetauscht werden; der Benutzer entscheidet, wann neu geladen wird.
 * ---------------------------------------------------------------------------
 */

/* eslint-env serviceworker */

// === von build_html.py erzeugt - nicht von Hand ändern ======================
const VERSION = '492a9851d590';
const SCHALE = [
  './',
  'index.html',
  'css/style.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/bild.erkennung.js',
  'js/bild.zeichnung.js',
  'js/core.anbauteile.js',
  'js/core.auflager.js',
  'js/core.checks.js',
  'js/core.constants.js',
  'js/core.klassen.js',
  'js/core.lasten.js',
  'js/core.mast.js',
  'js/core.querschnitt.js',
  'js/core.statics.js',
  'js/core.trasse.js',
  'js/core.vierendeel.js',
  'js/core.winkel.js',
  'js/data.anbauteile.js',
  'js/data.fl.js',
  'js/data.masten.js',
  'js/data.paket.js',
  'js/data.profiles.js',
  'js/data.tragjoche.js',
  'js/design.js',
  'js/doku.handbuch.js',
  'js/doku.optionsskizzen.js',
  'js/export.axisvm.js',
  'js/export.bericht.js',
  'js/export.pynite.js',
  'js/export.xlsx.js',
  'js/geometry.js',
  'js/pwa.js',
  'js/render.3d.js',
  'js/render.charts.js',
  'js/render.skizzen.js',
  'js/render.svg.js',
  'js/store.js',
  'js/ui.js',
  'js/ui.schema.js',
  'js/verlauf.js',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-32.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/icon.svg',
];
// === Ende erzeugter Block ===================================================

const CACHE = `tragjoch-${VERSION}`;

// --- Einrichten -------------------------------------------------------------

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Einzeln statt addAll: eine fehlende Datei darf nicht die ganze
    // Einrichtung scheitern lassen, sonst steht man ohne Ablage da.
    await Promise.all(SCHALE.map(async (p) => {
      try {
        const a = await fetch(new Request(p, { cache: 'reload' }));
        if (a.ok) await c.put(p, a);
      } catch { /* nicht erreichbar - wird später beim Gebrauch geholt */ }
    }));
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const namen = await caches.keys();
    await Promise.all(namen
      .filter((n) => n.startsWith('tragjoch-') && n !== CACHE)
      .map((n) => caches.delete(n)));
    // Bereits offene Seiten sofort mitbedienen, statt bis zum nächsten
    // Start zu warten.
    await self.clients.claim();
  })());
});

// --- Beantworten ------------------------------------------------------------

/**
 * Seitenaufrufe: erst Netz, dann Ablage.
 * So erscheint eine neu veröffentlichte Fassung ohne Umweg; ohne Verbindung
 * kommt der letzte Stand aus der Ablage.
 */
async function seite(anfrage) {
  try {
    const a = await fetch(anfrage);
    if (a && a.ok) (await caches.open(CACHE)).put('index.html', a.clone());
    return a;
  } catch {
    const c = await caches.open(CACHE);
    return (await c.match(anfrage))
        ?? (await c.match('index.html'))
        ?? (await c.match('./'))
        ?? Response.error();
  }
}

/**
 * Bausteine (Module, Stylesheet, Daten, Symbole): erst Ablage, dann Netz.
 * Sie sind an die Fassung gebunden - ein Blick ins Netz brächte nichts und
 * würde den Start nur verzögern.
 */
async function baustein(anfrage) {
  const c = await caches.open(CACHE);
  const da = await c.match(anfrage);
  if (da) return da;
  const a = await fetch(anfrage);
  // Nur vollständige eigene Antworten ablegen; undurchsichtige (opaque)
  // Antworten fremder Herkunft sagen nichts über Erfolg oder Misserfolg.
  if (a && a.ok && a.type === 'basic') c.put(anfrage, a.clone());
  return a;
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // fremde Herkunft: durch
  // Der Dienstarbeiter selbst geht nie über die Ablage, sonst liesse sich
  // eine neue Fassung nicht mehr einspielen.
  if (url.pathname.endsWith('/sw.js')) return;

  e.respondWith(request.mode === 'navigate' ? seite(request) : baustein(request));
});

// --- Zuruf von der Seite ----------------------------------------------------

self.addEventListener('message', (e) => {
  if (e.data === 'uebernehmen') self.skipWaiting();
  if (e.data === 'fassung') e.source?.postMessage({ fassung: VERSION });
});
