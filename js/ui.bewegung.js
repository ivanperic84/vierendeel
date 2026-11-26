/**
 * ui.bewegung.js - BEWEGUNG WIE ANDROID (22. November).
 *
 * Weisung: «app hochdynamisch gestalten wie android os», auf Rückfrage
 * «Bewegung»: Wellen-Effekt beim Antippen, seitlich gleitende Reiterwechsel,
 * Kacheln gestaffelt einblenden, Dialoge wachsen aus dem Knopf heraus.
 *
 * Alles nur Darstellung - kein Eingriff in Zustand oder Rechnung. Mit
 * «weniger Bewegung» im System geschieht nichts (`still()`).
 */

const still = () => typeof matchMedia === 'function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Was eine Welle bekommt: Knöpfe, Reiter, Kacheln, Listenzeilen. */
const WELLE = '.btn, .wz-s, .tab, .kz, .lf-einfach, .insel-k, .kontext-p, .dm-wahl, .legende-balken';

/** Der zuletzt angetippte Knopf - aus ihm wächst ein Dialog. */
let zuletzt = null;

function welle(e) {
  if (still() || e.button !== 0) return;
  const el = e.target.closest?.(WELLE);
  if (!el || el.disabled || el.closest('canvas')) return;
  zuletzt = el.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const d = Math.max(r.width, r.height) * 1.4;   // klein gehalten (24. November)
  const w = document.createElement('span');
  w.className = 'welle';
  w.style.width = w.style.height = `${d}px`;
  w.style.left = `${e.clientX - r.left - d / 2}px`;
  w.style.top = `${e.clientY - r.top - d / 2}px`;
  el.classList.add('welle-wirt');
  el.appendChild(w);
  w.addEventListener('animationend', () => w.remove(), { once: true });
  setTimeout(() => w.remove(), 900);
}

/*
 * >>> REITER GLEITEN (shared axis). <<< Beim Klick auf einen Reiter wird die
 * Richtung gemerkt (weiter rechts = von rechts herein); nach dem Neuaufbau
 * gleitet der Inhalt des Panels herein, die Kacheln gestaffelt.
 */
function reiter(e) {
  const t = e.target.closest?.('.tabs .tab');
  if (!t || still()) return;
  const leiste = t.closest('.tabs');
  const alle = [...leiste.querySelectorAll('.tab')];
  const vorher = alle.findIndex((x) => x.classList.contains('on'));
  const nachher = alle.indexOf(t);
  if (vorher === nachher || vorher < 0) return;
  const koerper = leiste.parentElement?.querySelector('.panel-koerper');
  if (!koerper) return;
  const kl = nachher > vorher ? 'gleitet-r' : 'gleitet-l';
  // Nach dem Neuaufbau (der Klick baut das Panel synchron neu) die Klasse
  // setzen - ein Zeitgeber, kein Bildwechsel: der ist im verdeckten Fenster gedrosselt.
  setTimeout(() => {
    koerper.classList.remove('gleitet-r', 'gleitet-l');
    void koerper.offsetWidth;
    koerper.classList.add(kl);
    setTimeout(() => koerper.classList.remove(kl), 520);
  }, 0);
}

/* ===========================================================================
 * >>> WIE DIE INSEL, IN DER GANZEN APP (26. November). <<< Weisung: «bei allen
 * animationen die vorlage von der dynamic islang übernehmen im 3d frenster mit
 * den einzelnen boxen, es stellst sich noch die frage ob man es global für die
 * gesamte app anwenden kann?», auf Rückfrage «Ganze App»: dieselbe Bewegung wie
 * die Insel (Breite und Höhe der Box wachsen bzw. schrumpfen, Feder-Kurve,
 * 380 ms) - Kontextmenüs, Menüs, Dialoge wachsen aus einer kleinen Pille auf,
 * Klappabschnitte und die Legende ändern ihre Grösse weich.
 * ======================================================================== */
export const INSEL_KURVE = 'cubic-bezier(.3, 1.15, .5, 1)';
export const INSEL_DAUER = 380;

/** Grössenwechsel einer Box weich (die Insel, `inselMorph`). */
export function morph(el, aendern) {
  if (!el) { aendern(); return; }
  const a = el.getBoundingClientRect();
  aendern();
  const b = el.getBoundingClientRect();
  if (still() || typeof el.animate !== 'function' || (a.width === b.width && a.height === b.height)) return;
  const ov = el.style.overflow;
  el.style.overflow = 'hidden';
  const an = el.animate([{ width: `${a.width}px`, height: `${a.height}px` },
                         { width: `${b.width}px`, height: `${b.height}px` }],
                        { duration: INSEL_DAUER, easing: INSEL_KURVE });
  const fertig = () => { el.style.overflow = ov; };
  an.onfinish = fertig; an.oncancel = fertig;
}

/** Eine neue Box wächst aus einer kleinen Pille zu ihrer Grösse auf. */
export function inselAuf(el) {
  if (!el || still() || typeof el.animate !== 'function') return;
  const b = el.getBoundingClientRect();
  if (!(b.width > 0 && b.height > 0)) return;
  const ov = el.style.overflow;
  el.style.overflow = 'hidden';
  const an = el.animate([
    { width: `${Math.min(b.width, 140)}px`, height: `${Math.min(b.height, 34)}px`, opacity: 0.35 },
    { width: `${b.width}px`, height: `${b.height}px`, opacity: 1 }],
  { duration: INSEL_DAUER, easing: INSEL_KURVE });
  const fertig = () => { el.style.overflow = ov; };
  an.onfinish = fertig; an.oncancel = fertig;
}

/*
 * Klappabschnitte öffnen wie die Insel (vorher eingeblendet, 22. November).
 * Nur beim Klick auf den Kopf - ein Neuaufbau der Maske soll nicht jedes Mal
 * animieren. Geschlossen wird ohne Bewegung.
 */
function klappen(e) {
  const s = e.target.closest?.('details > summary');
  if (!s || still()) return;
  const d = s.parentElement;
  if (d.open) return;
  const a = d.getBoundingClientRect().height;
  setTimeout(() => {
    if (!d.open || typeof d.animate !== 'function') return;
    const b = d.getBoundingClientRect().height;
    if (b <= a) return;
    const ov = d.style.overflow;
    d.style.overflow = 'hidden';
    const an = d.animate([{ height: `${a}px` }, { height: `${b}px` }], { duration: INSEL_DAUER, easing: INSEL_KURVE });
    const fertig = () => { d.style.overflow = ov; };
    an.onfinish = fertig; an.oncancel = fertig;
  }, 0);
}

/** Ein Dialog wächst wie die Insel auf (26. November; vorher Skalierung aus dem Knopf). */
export function dialogAusKnopf(dlg) {
  zuletzt = null;
  inselAuf(dlg);
}

/* Menüs und Kontextmenüs, die irgendwo eingehängt werden, wachsen auf. */
function neueBoxen(liste) {
  liste.forEach((m) => m.addedNodes.forEach((n) => {
    if (!(n instanceof Element)) return;
    if (n.matches?.('.kontext') && !n.classList.contains('insel-panel')) inselAuf(n);
  }));
}

let an = false;
export function bewegungStarten() {
  if (an || typeof document === 'undefined') return;
  an = true;
  document.addEventListener('pointerdown', welle, true);
  document.addEventListener('click', reiter, true);
  document.addEventListener('click', klappen, true);
  if (typeof MutationObserver !== 'undefined' && document.body) {
    new MutationObserver(neueBoxen).observe(document.body, { childList: true });
  }
}
