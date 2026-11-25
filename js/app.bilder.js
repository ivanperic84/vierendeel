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
 * ---------------------------------------------------------------------------
 */
import * as store from './store.js';
import { esc, uebertrageTokens } from './design.js';
import { modiFuer } from './app.layout.js';

const schluessel = (app) => app.projekt?.id || store.ARBEITS_ZEICHNUNG;

/** Das 3D wie es steht, hell, auf weissem Grund. */
function aufnahme(app) {
  if (!app.ansicht) return null;
  const vorher = app.thema;
  if (vorher !== 'hell') uebertrageTokens('hell');
  try {
    return app.ansicht.momentaufnahme(null, { aktuell: true, weiss: true });
  } finally {
    if (vorher !== 'hell') { uebertrageTokens(vorher); app.ansicht.zeichneJetzt(); }
  }
}

/**
 * Auf den Inhalt zuschneiden (weisser Rand 4 % bzw. mindestens 24 px): das
 * Modellfenster ist oft hoch und schmal, das Modell sass klein in viel Weiss.
 */
async function zuschneiden(url) {
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let j = 0; j < h; j += 2) {
      for (let i = 0; i < w; i += 2) {
        const k = (j * w + i) * 4;
        if (d[k] < 245 || d[k + 1] < 245 || d[k + 2] < 245) {
          if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j;
        }
      }
    }
    if (x1 < 0) return url;
    const r = Math.max(24, Math.round(0.04 * Math.max(x1 - x0, y1 - y0)));
    x0 = Math.max(0, x0 - r); y0 = Math.max(0, y0 - r);
    x1 = Math.min(w, x1 + r); y1 = Math.min(h, y1 + r);
    const z = document.createElement('canvas'); z.width = x1 - x0; z.height = y1 - y0;
    const zx = z.getContext('2d'); zx.fillStyle = '#ffffff'; zx.fillRect(0, 0, z.width, z.height);
    zx.drawImage(c, x0, y0, z.width, z.height, 0, 0, z.width, z.height);
    return z.toDataURL('image/png');
  } catch { return url; }
}

const jetzt = () => new Date().toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' });

function titelVorschlag(app) {
  const name = app.projekt?.name || 'Tragwerk';
  const mo = modiFuer(app.nachweisart).find((m) => m.key === app.ansicht?.modus);
  const plot = mo?.label ?? '';
  const lf = document.getElementById('pos-lf')?.textContent?.trim();
  return [name, plot, lf].filter(Boolean).join(' · ');
}

/** Knopf «Bild des 3D aufnehmen». */
export async function bildAufnehmen(app) {
  const roh = aufnahme(app);
  if (!roh) { app.meldeImBalken('Kein 3D-Bild vorhanden.'); return; }
  const url = await zuschneiden(roh);
  const id = schluessel(app);
  const liste = await store.bilderLaden(id);
  liste.push({ titel: titelVorschlag(app), datum: jetzt(), url });
  await store.bilderSichern(id, liste);
  app.meldeImBalken(`Bild aufgenommen - ${liste.length} in der Sammlung (Berichte → Bildsammlung).`);
}

function dateiname(app, b, i) {
  const stamm = String(b.titel || app.projekt?.name || 'Bild').replace(/[^\w\-.äöüÄÖÜ ]+/g, '_').replace(/\s+/g, '_').slice(0, 80);
  return `${stamm || 'Bild'}_${String(i + 1).padStart(2, '0')}.png`;
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
          <span class="bs-knoepfe"><button class="btn btn-mini" data-sichern="${i}" type="button">PNG sichern</button>
          <button class="btn btn-mini" data-weg="${i}" type="button" title="Bild löschen">Löschen</button></span></figcaption>
      </figure>`).join('')}</div>`
    : '<p class="notiz">Noch keine Bilder. «Bild aufnehmen» legt das 3D, wie es gerade steht, auf weissem Grund hier ab.</p>');
  const d = app.dialog('Bildsammlung', `<p class="notiz" style="margin-top:0">${wo} · ${liste.length} Bild(er)</p><div data-bs>${koerper()}</div>`,
    `<button class="btn" data-aufnehmen type="button">Bild aufnehmen</button>
     <button class="btn btn-acc" data-alle type="button">Alle als PNG sichern</button>`, 'dialog-breit');
  const neu = async () => {
    await store.bilderSichern(id, liste);
    d.node.querySelector('[data-bs]').innerHTML = koerper();
    const n = d.node.querySelector('.notiz');
    if (n) n.innerHTML = `${wo} · ${liste.length} Bild(er)`;
  };
  d.node.addEventListener('click', async (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (t.matches('[data-sichern]')) { const i = +t.dataset.sichern; herunterladen(liste[i].url, dateiname(app, liste[i], i)); }
    else if (t.matches('[data-weg]')) { liste.splice(+t.dataset.weg, 1); await neu(); }
    else if (t.matches('[data-alle]')) { liste.forEach((b, i) => setTimeout(() => herunterladen(b.url, dateiname(app, b, i)), i * 250)); }
    else if (t.matches('[data-aufnehmen]')) {
      const roh = aufnahme(app);
      if (roh) { liste.push({ titel: titelVorschlag(app), datum: jetzt(), url: await zuschneiden(roh) }); await neu(); }
    }
  });
  d.node.addEventListener('change', async (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.dataset.titel !== undefined) {
      liste[+t.dataset.titel].titel = t.value.trim();
      await store.bilderSichern(id, liste);
    }
  });
}
