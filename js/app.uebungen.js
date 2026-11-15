/**
 * UEBUNGSBEISPIELE DER SCHULUNG (16. November).
 *
 * Weisung vom 15. November: «ein beispiel tragjoch und ein beispiel
 * einzelmast mit ausleger nt. nimm hierfür die hinterlegten querprofile im
 * grundlagen ordner. die teilnehmer werden die tragwerke selbst aufbauen.»
 * und am 16. November «übungsbeispiel aufnehmen».
 *
 * Ein Beispiel ist ein Ablage-Paket (ZIP mit ablage.json und der
 * eingemessenen Zeichnung des Querprofils). Es geht durch denselben
 * Einlesedialog wie eine hineingezogene Datei - kein zweiter Ladeweg.
 *
 * Woher: im Buendel `--stufe schulung --mit-daten` eingebettet (Base64 im
 * Tag «uebungen-db»), in der Modulversion aus data/uebungen.json. Die Pakete
 * stammen aus Querprofilen des Betreibers: sie stehen NIE in der Ablage
 * (data/uebungen/ ist ausgeschlossen) und nie in einer Datei ohne Daten.
 */

let liste = [];

/** Holt die Liste einmal beim Start. Ohne Beispiele bleibt sie leer. */
export async function uebungenVorbereiten() {
  const roh = typeof document !== 'undefined'
    ? document.getElementById('uebungen-db')?.textContent?.trim() : '';
  if (roh) {
    try { liste = JSON.parse(roh).map((u) => ({ titel: u.titel, b64: u.b64 })); }
    catch { liste = []; }
    return liste;
  }
  // Modulversion: die Liste neben den Daten, die Pakete erst beim Laden.
  if (typeof location === 'undefined' || location.protocol === 'file:') return liste;
  try {
    const r = await fetch('data/uebungen.json', { cache: 'no-store' });
    if (r.ok) liste = (await r.json()).map((u) => ({ titel: u.titel, datei: u.datei }));
  } catch { liste = []; }
  return liste;
}

export function uebungen() { return liste; }

/** Die Bytes eines Beispiels (Uint8Array), eingebettet oder geholt. */
export async function uebungBytes(i) {
  const u = liste[i];
  if (!u) throw new Error('Beispiel nicht vorhanden');
  if (u.b64) {
    const s = atob(u.b64);
    const b = new Uint8Array(s.length);
    for (let k = 0; k < s.length; k++) b[k] = s.charCodeAt(k);
    return b;
  }
  const r = await fetch(u.datei, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${u.datei}: ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

/** Block im Schritt 1 der Schulung; leer, wenn keine Beispiele da sind. */
export function uebungenHtml() {
  if (!liste.length) return '';
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<div class="uebungen">
    <div class="sec">Übungsbeispiele</div>
    <p class="notiz">Das Querprofil liegt als Zeichnung hinter dem Modell.
      Ein Beispiel ersetzt den Arbeitsstand nicht, es kommt als Eintrag in die Projektablage.</p>
    ${liste.map((u, i) => `<button class="btn" data-uebung="${i}">${esc(u.titel)} laden …</button>`).join(' ')}
  </div>`;
}
