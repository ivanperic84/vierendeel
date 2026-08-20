/**
 * pwa.js
 * ---------------------------------------------------------------------------
 * INSTALLIERBAR UND OHNE NETZ LAUFFÄHIG.
 *
 * Drei Dinge macht diese Datei, mehr nicht:
 *
 *   1. den Dienstarbeiter (sw.js) anmelden, der die Anwendung ablegt und
 *      offline wieder ausliefert,
 *   2. die Aufforderung des Browsers zum Installieren aufheben, bis der
 *      Benutzer im Werkzeugkasten darauf drückt,
 *   3. melden, wenn eine neue Fassung bereitliegt - und erst neu laden,
 *      wenn er zustimmt.
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
