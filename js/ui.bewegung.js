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

/*
 * >>> KLAPPABSCHNITTE OEFFNEN WEICH (22. November). <<< Nur beim Klick auf
 * den Kopf - ein Neuaufbau der Maske (bei jeder Eingabe) soll nicht jedes
 * Mal einblenden.
 */
function klappen(e) {
  const s = e.target.closest?.('details > summary');
  if (!s || still()) return;
  const d = s.parentElement;
  if (d.open) return;                 // schliesst - ohne Bewegung
  d.classList.add('oeffnet');
  setTimeout(() => d.classList.remove('oeffnet'), 400);
}

/** Ein Dialog wächst aus dem zuletzt angetippten Knopf heraus. */
export function dialogAusKnopf(dlg) {
  if (!dlg || still() || !zuletzt) return;
  const r = dlg.getBoundingClientRect();
  const ox = zuletzt.left + zuletzt.width / 2 - r.left;
  const oy = zuletzt.top + zuletzt.height / 2 - r.top;
  dlg.style.transformOrigin = `${ox}px ${oy}px`;
  dlg.classList.add('waechst');
  zuletzt = null;
}

let an = false;
export function bewegungStarten() {
  if (an || typeof document === 'undefined') return;
  an = true;
  document.addEventListener('pointerdown', welle, true);
  document.addEventListener('click', reiter, true);
  document.addEventListener('click', klappen, true);
}
