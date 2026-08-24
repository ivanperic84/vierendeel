/**
 * pwa.js
 * ---------------------------------------------------------------------------
 * INSTALLIERBAR UND OHNE NETZ LAUFFÄHIG.
 *
 * Was diese Datei macht, und mehr nicht:
 *
 *   1. den Dienstarbeiter (sw.js) anmelden, der die Anwendung ablegt und
 *      offline wieder ausliefert,
 *   2. die Aufforderung des Browsers zum Installieren aufheben, bis der
 *      Benutzer im Werkzeugkasten darauf drückt,
 *   3. melden, wenn eine neue Fassung bereitliegt - und erst neu laden,
 *      wenn er zustimmt,
 *   4. Dateien annehmen, die vom Betriebssystem oder aus einem anderen
 *      Fenster kommen (dateiEmpfang),
 *   5. den Wunsch aus der Sprungliste ausreichen (startWunsch) und den
 *      Netzzustand melden (netzZustand).
 *
 * Die Punkte 4 und 5 sind der Grund, warum sich das Installieren überhaupt
 * lohnt: erst damit verhält sich die Anwendung wie ein Programm und nicht
 * wie eine Seite in einem eigenen Fenster.
 *
 * ZUM DRITTEN PUNKT, DENN ER IST DER HEIKLE
 * Ein Rechenwerkzeug darf nicht mitten in einer Eingabe unter der Hand
 * ausgetauscht werden. Der neue Dienstarbeiter bleibt deshalb im Wartestand,
 * bis hier «uebernehmen» gesendet wird; das Neuladen löst der Benutzer aus.
 *
 * WANN ANGEMELDET WIRD
 * Nur über http(s) und nur, wenn die Seite ein Manifest trägt. Die gebündelte
 * Einzeldatei (vierendeel_tool.html) trägt keines und liegt meist auf file://
 * - dort passiert hier nichts.
 *
 * Auf localhost wird ABGEMELDET statt angemeldet: beim Arbeiten an den
 * Modulen wäre eine Ablage, die alte Fassungen ausliefert, nur eine
 * Fehlerquelle. Zum Ausprobieren hilft der Zusatz ?sw=1 in der Adresse,
 * zum Aufräumen ?sw=0.
 * ---------------------------------------------------------------------------
 */

const LOKALE_NAMEN = ['localhost', '127.0.0.1', '[::1]', '::1'];

/** Ereignis «beforeinstallprompt», aufgehoben bis zum Druck auf den Knopf. */
let aufforderung = null;
/** Wird gerufen, wenn sich am Installieren-Knopf etwas ändert. */
let beiWechsel = null;
/** Verhindert eine Schleife aus Übernahme und Neuladen. */
let laedtNeu = false;

const lokal = () => LOKALE_NAMEN.includes(location.hostname);
const wahl = () => new URLSearchParams(location.search).get('sw');

/**
 * Soll hier ein Dienstarbeiter laufen?
 * Die Reihenfolge ist Absicht: der Zusatz in der Adresse schlägt alles andere,
 * damit sich beides örtlich ausprobieren lässt.
 */
export function pwaErwuenscht() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  if (!location.protocol.startsWith('http')) return false;
  if (!document.querySelector('link[rel="manifest"]')) return false;
  const w = wahl();
  if (w === '1') return true;
  if (w === '0') return false;
  return !lokal();
}

/** Läuft die Anwendung als installiertes Programm (eigenes Fenster)? */
export function alsProgramm() {
  return window.matchMedia?.('(display-mode: standalone)').matches === true
      || window.matchMedia?.('(display-mode: window-controls-overlay)').matches === true
      || window.navigator.standalone === true;         // iOS
}

/** Hat der Browser eine Installation angeboten? */
export const kannInstallieren = () => aufforderung !== null;

/**
 * Zeigt die Installationsaufforderung des Browsers.
 * @returns {Promise<boolean>} ob der Benutzer zugestimmt hat
 */
export async function installiere() {
  if (!aufforderung) return false;
  const a = aufforderung;
  aufforderung = null;                 // jede Aufforderung gilt nur einmal
  a.prompt();
  const { outcome } = await a.userChoice;
  beiWechsel?.();
  return outcome === 'accepted';
}

// --- Meldung «neue Fassung» -------------------------------------------------

/**
 * Ein schmaler Balken am unteren Rand statt eines Dialogs: er unterbricht die
 * Arbeit nicht und lässt sich wegklicken.
 */
function meldeFassung(reg) {
  if (document.getElementById('pwa-balken')) return;
  const b = document.createElement('div');
  b.id = 'pwa-balken';
  b.className = 'pwa-balken';
  b.setAttribute('role', 'status');
  b.innerHTML = '<span>Eine neue Fassung ist bereit.</span>'
    + '<button type="button" class="btn btn-acc" id="pwa-neu">Neu laden</button>'
    + '<button type="button" class="btn" id="pwa-spaeter">Später</button>';
  document.body.appendChild(b);
  b.querySelector('#pwa-spaeter').onclick = () => b.remove();
  b.querySelector('#pwa-neu').onclick = () => {
    b.remove();
    // Der wartende Dienstarbeiter übernimmt; das Neuladen löst dann
    // «controllerchange» weiter unten aus.
    reg.waiting?.postMessage('uebernehmen');
  };
}

// --- Anmelden ---------------------------------------------------------------

/** Räumt Dienstarbeiter und Ablagen weg (localhost, ?sw=0). */
async function abmelden() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    // Abgemeldet ist nicht abgelöst: DIESER Seitenaufruf wird bis zum Ende
    // vom bisherigen Dienstarbeiter bedient, und der legt jede Datei, die er
    // ausliefert, weiter ab. Ein sofortiges Löschen wäre wirkungslos - die
    // Ablage entstünde beim Laden der Module gleich wieder. Deshalb erst
    // abwarten, bis die Seite steht. Bleibt doch etwas übrig, ist es beim
    // nächsten Aufruf weg: dann gibt es keinen Dienstarbeiter mehr.
    if (navigator.serviceWorker.controller) {
      if (document.readyState !== 'complete') {
        await new Promise((r) => window.addEventListener('load', r, { once: true }));
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    const namen = await caches.keys();
    await Promise.all(namen.filter((n) => n.startsWith('tragjoch-'))
      .map((n) => caches.delete(n)));
  } catch { /* nicht möglich - dann bleibt eben alles, wie es ist */ }
}

/**
 * Einrichten. Wirft nie - eine fehlgeschlagene Anmeldung darf den Start der
 * Anwendung nicht aufhalten; sie läuft dann eben nur online.
 *
 * @param {{beiWechsel?:Function}} opt beiWechsel wird gerufen, wenn der
 *        Installieren-Knopf erscheinen oder verschwinden soll.
 */
export function pwaEinrichten(opt = {}) {
  beiWechsel = opt.beiWechsel ?? null;

  // Der Browser fragt sonst von sich aus; wir heben die Frage auf, bis der
  // Benutzer sie sucht.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    aufforderung = e;
    beiWechsel?.();
  });
  window.addEventListener('appinstalled', () => {
    aufforderung = null;
    beiWechsel?.();
  });

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!pwaErwuenscht()) { abmelden(); return; }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (laedtNeu) return;
    laedtNeu = true;
    location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js', { scope: './' });

      // Schon beim Ankommen kann einer warten - etwa weil beim letzten
      // Besuch «Später» gedrückt wurde.
      if (reg.waiting && navigator.serviceWorker.controller) meldeFassung(reg);

      reg.addEventListener('updatefound', () => {
        const neu = reg.installing;
        if (!neu) return;
        neu.addEventListener('statechange', () => {
          // Ohne controller ist es die ERSTE Einrichtung - da gibt es nichts
          // zu melden, die Seite läuft ja bereits mit diesem Stand.
          if (neu.state === 'installed' && navigator.serviceWorker.controller) {
            meldeFassung(reg);
          }
        });
      });

      // Nach dem Zurückkommen auf den Reiter nachsehen, aber höchstens
      // stündlich - häufiger brächte nichts und kostet nur Anfragen.
      let zuletzt = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (document.hidden || Date.now() - zuletzt < 3600e3) return;
        zuletzt = Date.now();
        reg.update().catch(() => {});
      });
    } catch { /* kein Dienstarbeiter - die Anwendung läuft trotzdem */ }
  });
}

// --- Dateien annehmen -------------------------------------------------------

/**
 * DATEIEN, DIE VON AUSSEN KOMMEN - über zwei Wege, ein Rückruf.
 *
 * 1. VOM BETRIEBSSYSTEM. Die installierte Anwendung ist im Manifest als
 *    Bearbeiter für .json eingetragen (file_handlers). Wer eine Ablage- oder
 *    Datenpaketdatei im Dateimanager mit «Öffnen mit» an Tragjoch gibt,
 *    landet hier. Der Browser fragt bei der Installation um Erlaubnis; ohne
 *    sie passiert schlicht nichts.
 *
 * 2. AUF DAS FENSTER GEZOGEN. Das geht auch im Reiter, ohne Installation,
 *    und ist der übliche Weg, wenn beide Fenster ohnehin offen sind.
 *
 * WARUM ÜBERHAUPT
 * Ohne das führt jeder Weg über den Umweg «Dialog öffnen, Datei suchen,
 * bestätigen». Die Datei liegt aber schon vor einem.
 *
 * NICHTS WIRD DABEI GESENDET. Gelesen wird örtlich; was die Datei enthält,
 * entscheidet der Rückruf.
 *
 * @param {(datei:File)=>void} nimm bekommt jede angebotene Datei
 */
export function dateiEmpfang(nimm) {
  if (typeof window === 'undefined' || typeof nimm !== 'function') return;

  // --- 1. Betriebssystem ---
  // Nicht jeder Browser kennt launchQueue; wo es fehlt, bleibt Weg 2.
  try {
    window.launchQueue?.setConsumer(async (p) => {
      for (const griff of p?.files ?? []) {
        try { nimm(await griff.getFile()); } catch { /* kein Zugriff */ }
      }
    });
  } catch { /* Fassung ohne launchQueue */ }

  // --- 2. Auf das Fenster gezogen ---
  // Nur echte DATEIEN. Das Ziehen einer Anbauteil-Vorlage aus der Seitenleiste
  // auf das Modell trägt einen eigenen Typ und darf hier nicht hängenbleiben
  // (siehe verdrahteAblegen in app.js).
  const istDatei = (e) => !!e.dataTransfer &&
    Array.from(e.dataTransfer.types ?? []).includes('Files');

  let tiefe = 0;                   // Zähler statt Schalter: dragleave kommt
                                   // auch beim Wechsel zwischen Kindknoten.
  const markiere = (an) => document.body.classList.toggle('datei-ueber', an);

  window.addEventListener('dragenter', (e) => {
    if (!istDatei(e)) return;
    tiefe += 1;
    markiere(true);
  });
  window.addEventListener('dragover', (e) => {
    if (!istDatei(e)) return;
    // Ohne preventDefault öffnet der Browser die Datei selbst und die
    // Anwendung ist weg - mitsamt der nicht gesicherten Eingabe.
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  window.addEventListener('dragleave', (e) => {
    if (!istDatei(e)) return;
    tiefe = Math.max(0, tiefe - 1);
    if (!tiefe) markiere(false);
  });
  window.addEventListener('drop', (e) => {
    if (!istDatei(e)) return;
    e.preventDefault();
    tiefe = 0;
    markiere(false);
    const d = e.dataTransfer.files?.[0];
    if (d) nimm(d);
  });
}

// --- Sprungliste ------------------------------------------------------------

/**
 * Womit soll begonnen werden?
 *
 * Die Einträge der Sprungliste (shortcuts im Manifest) rufen dieselbe Seite
 * mit ?los=… auf. Der Wunsch wird hier AUSGELESEN UND AUS DER ADRESSE
 * ENTFERNT: bliebe er stehen, führte jedes Neuladen wieder in denselben
 * Dialog, und das Lesezeichen auf «Handbuch» wäre keines auf die Anwendung.
 *
 * @returns {string|null} 'neu', 'ablage', 'handbuch' - oder null
 */
export function startWunsch() {
  if (typeof location === 'undefined') return null;
  const p = new URLSearchParams(location.search);
  const w = p.get('los');
  if (!w) return null;
  try {
    p.delete('los');
    const rest = p.toString();
    history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '')
                                 + location.hash);
  } catch { /* ohne History-API bleibt der Zusatz stehen */ }
  return w;
}

// --- Netz -------------------------------------------------------------------

/**
 * Meldet, ob eine Verbindung besteht, und ruft bei jedem Wechsel zurück.
 *
 * Ohne Netz rechnet die Anwendung unverändert weiter - sie tut es ohnehin
 * vollständig im Browser. Sichtbar sein soll es trotzdem: wer offline ist,
 * bekommt keine neue Fassung, und diese eine Erwartung soll nicht ins Leere
 * laufen.
 *
 * @param {(offline:boolean)=>void} [beiWechselNetz]
 * @returns {boolean} ob JETZT offline
 */
export function netzZustand(beiWechselNetz) {
  if (typeof navigator === 'undefined') return false;
  if (typeof beiWechselNetz === 'function') {
    window.addEventListener('online', () => beiWechselNetz(false));
    window.addEventListener('offline', () => beiWechselNetz(true));
  }
  return navigator.onLine === false;
}
