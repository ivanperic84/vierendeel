/**
 * app.ablage.js
 * ---------------------------------------------------------------------------
 * DIE PROJEKTABLAGE: Schublade, Laden, Speichern, Einlesen, Ausleiten.
 *
 * Seit dem 19. September ein eigenes Modul (Durchsicht vom 18. September,
 * Punkt A1: app.js teilen). Den Arbeitsstand bekommt es als app - das
 * Kontextobjekt aus app.js, hier auch mit Settern (werte, projekt, station,
 * ungesichert). Es importiert app.js nicht zurueck.
 * ---------------------------------------------------------------------------
 */
import { standAnheben, fzNachObenAnheben, psiAnheben } from './data.anbauteile.js';
import { rechensatzMitNachbarn } from './core.nachbarn.js';
import { APP_NAME, mastenVon, rechensatz, tragwerksart, sichtbareTragwerke, lageVon, lageOrtsnull,
         kragarme, tragwerkPos, tragwerkName, mastName } from './core.constants.js';
import { berechne, vergleichKombinationen } from './core.vierendeel.js';
import { normalisiereAnbauteil, setzeEigeneVorlagen, vorlagen, expandiereAnbauteile,
         istSignalModul } from './data.anbauteile.js';
import { anbauKette, bezugsHoehe } from './core.anbauteile.js';
import { getFlBauteil } from './data.fl.js';
import { getProfil, getStahl } from './data.profiles.js';
import { getTragjoch } from './data.tragjoche.js';
import { abschnitt, esc, icon } from './design.js';
import * as store from './store.js';
import * as ui from './ui.js';
import { standardwerte } from './ui.schema.js';

/**
 * Ablage und Vorlagen fahren unter dem Banner heraus.
 *
 * Zwei Dinge liegen hier nebeneinander, weil sie zusammengehören und sich doch
 * unterscheiden:
 *
 *   PROJEKTE   gespeicherte Tragjoche mit ihren Massen. Sie werden GELADEN und
 *              ersetzen den Stand.
 *   VORLAGEN   der eingespielte Aufbau eines ganzen Tragwerks ohne Bauteilmasse
 *              - Profile, Trasse, Anbauteile, Lastfälle. Sie werden ANGEWENDET
 *              und legen sich auf den bestehenden Stand.
 *
 * Die Jochlänge kommt bewusst nicht aus der Vorlage: sonst würde das Anwenden
 * heimlich das Bauteil umbauen.
 */
let schubladeOffen = false;
/** Fuer app.js: steht die Schublade offen? */
export const schubladeIstOffen = () => schubladeOffen;

/** Dauer der Schliessbewegung der Schublade - dieselbe Zahl im Stylesheet. */
const SCHUBLADE_ZU_MS = 220;

/**
 * Schublade zufahren lassen und erst danach verbergen.
 * Sofort auf hidden gesetzt verschwände sie schlagartig - aufgefahren ist sie
 * seit jeher gefahren, zugefahren war sie einfach weg.
 */
function schubladeZufahren(app) {
  const n = ui.el('bannerschublade');
  ui.el('btn-projekt').classList.remove('offen');
  if (n.hidden) return;
  n.classList.add('zu');
  setTimeout(() => {
    // Nur verbergen, wenn sie in der Zwischenzeit nicht wieder aufging.
    if (!schubladeOffen) { n.hidden = true; n.classList.remove('zu'); }
  }, SCHUBLADE_ZU_MS);
}

export function schubladeUmschalten(app) {
  schubladeOffen = !schubladeOffen;
  if (schubladeOffen) zeichneSchublade(app);
  else schubladeZufahren(app);
}

export function schubladeSchliessen(app) {
  if (!schubladeOffen) return;
  schubladeOffen = false;
  schubladeZufahren(app);
}

/* ===========================================================================
 * >>> DIE ABLAGE NACH DEM VORBILD VON BLOCKCALC (17. September). <<<
 * ===========================================================================
 *
 * Weisung: «checke nochmals die projektmanagement funktionalität von der app
 * block calc und übertrage diese in diese app» - und auf die Liste der
 * Punkte: «alles umsetzen».
 *
 * Was von dort kommt:
 *   - Projekt und Tragwerk als AUSWAHLFELDER, «+ Neu» ohne Dialog
 *   - die Liste als TABELLE je Projekt, Beschriftungen unmittelbar
 *     bearbeitbar, Projektname im Gruppenkopf
 *   - SUCHEN und SORTIEREN
 *   - AUSLEITEN MIT AUSWAHL je Tragwerk, je Projekt, je Eintrag
 *   - EINLESEN MIT VORSCHAU fuer Paket und JSON, je Eintrag waehlbar
 *   - KOMPLETTSICHERUNG mit den Einstellungen
 *   - die PROJEKTLISTE zum Drucken
 *
 * Was hier bleibt, wie es war: die Ablage in IndexedDB mit Ersatzspeicher,
 * die Vorlagen, die hinterlegten Zeichnungen.
 * ========================================================================= */

/** Suchbegriff und Sortierung der Ablage - ueberleben das Neuzeichnen. */
const ablageSicht = { suche: '', sort: 'neu' };

/** Wenn «+ Neues Projekt» gewaehlt ist, steht das Namensfeld offen. */
let neuesProjektOffen = false;

const heute = () => new Date().toLocaleDateString('de-CH',
  { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Kurzangaben der Rechnung eines Eintrags. */
function eintragRechnung(app, e) {
  return [
    e.kennwerte?.typ,
    Number.isFinite(e.kennwerte?.L) ? `${e.kennwerte.L.toFixed(2)} m` : '',
  ].filter(Boolean).join(' · ');
}

const eintragEta = (e) => (Number.isFinite(e.kennwerte?.eta) ? e.kennwerte.eta : null);

/**
 * >>> DIE VORSCHAU EINES GESPEICHERTEN EINTRAGS (9. Oktober, B7). <<<
 * «Vorschaufenster beim überfahren der Einträge der gespeicherten
 * Tragwerke.» Eine Skizze quer zum Gleis aus dem gespeicherten Stand - die
 * Masten in ihrer Länge, Joche und Abfangjoche auf ihrer Anschlusshöhe, der
 * Tragausleger mit seinem Seil, die Anbauteile am Joch als Striche -,
 * darunter Tragwerke und Masten beim Namen. Gezeichnet wird nur aus den
 * EINGABEN: nichts wird gerechnet, das Überfahren bleibt ohne Verzug.
 *
 * >>> ANBAUTEIL, ABZUG, LEITER, FLÄCHE (10. Oktober). <<< Weisung: «in der
 * vorschau beim projektmanager die vorschau mit unterscheidung anbauteil
 * abzug und leiter wie im report reaktionskräfte. da sollte man aber noch
 * eine unterscheidung erkennbar machen der anzahl leiter die hinterlegt ist.
 * zudem noch die fläche und signale anzeigen mit einer kleinen viereck.
 * farblich könnte man noch abzug und abauteile die leiter direkt tragen
 * farblich absetzen. Die vorschau nur wenn man laden überfährt anzeigen.»
 * Je Baugruppe die Kette wie im 3D (`anbauKette`, x-z), am Joch und am
 * Masten: blau, wenn sie einen Leiter trägt (Gewicht kommt an), orange, wenn
 * sie nur abzieht (alle ihre Leiter ohne Gewicht), sonst grau. Je Leiter ein
 * Ring mit Punkt (wie die Skizze der Reaktionskräfte), bei mehreren Leitern
 * (Anzahl × Bündel) so viele Ringe nebeneinander, über vier die Zahl; ein
 * nur abgezogener Leiter ist ein leerer Ring in Orange. Freie Fläche und
 * Signal sind ein kleines Viereck. Darunter die Legende.
 *
 * @returns {string} HTML, leer wenn der Stand sich nicht lesen lässt
 */
export function eintragVorschauHtml(e) {
  const w = e?.werte;
  if (!w) return '';
  let tws = [], masten = [];
  try { tws = sichtbareTragwerke(w); masten = mastenVon(w); } catch { return ''; }
  if (!tws.length) return '';
  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const teile = tws.map((t) => {
    const art = tragwerksart(t).key;
    const H = num(t.mastH, 7.5), L = num(t.L);
    const x0 = art === 'abfangjoch' ? lageOrtsnull(t) : lageVon(t);
    const seite = t.auslegerSeite === 'links' ? -1 : 1;
    return { t, art, H, L, x0, x1: art === 'tragausleger' ? x0 + seite * L : x0 + L, seite };
  });
  const ms = masten.map((m) => ({ m, x: num(m.x), l: num(m.laenge) > 0 ? num(m.laenge)
    : Math.max(8, ...teile.map((q) => q.H + 1)) }));
  const xs = [...teile.flatMap((q) => [q.x0, q.x1]), ...ms.map((q) => q.x)];
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  // Auch was über Joch und Mast hinausragt (Jochaufsatz, Rohr) gehört ins Bild.
  const zTeile = teile.flatMap((q) => (q.t.anbauteile ?? []).filter((a) => a && a.aktiv !== false)
    .flatMap((a) => (a.module ?? []).map((m) => (String(a.ort ?? '').startsWith('mast')
      ? num(a.hMast) : q.H + 0.4) + num(m?.z))));
  const zMax = Math.max(4, ...ms.map((q) => q.l), ...teile.map((q) => q.H + 1), ...zTeile.map((z) => z + 0.4));
  const B = 300, Hh = 150, rand = 16;
  const s = Math.min((B - 2 * rand) / Math.max(xMax - xMin, 2), (Hh - 2 * rand - 12) / zMax);
  const ox = (B - (xMax - xMin) * s) / 2;
  const X = (x) => (ox + (x - xMin) * s).toFixed(1), Z = (z) => (Hh - rand - 12 - z * s).toFixed(1);
  const linien = [];
  ms.forEach((q) => {
    linien.push(`<line class="vs-mast" x1="${X(q.x)}" y1="${Z(0)}" x2="${X(q.x)}" y2="${Z(q.l)}"/>`
      + `<line class="vs-fuss" x1="${(Number(X(q.x)) - 5).toFixed(1)}" y1="${Z(0)}" x2="${(Number(X(q.x)) + 5).toFixed(1)}" y2="${Z(0)}"/>`
      + `<text x="${X(q.x)}" y="${(Number(Z(0)) + 11).toFixed(1)}" text-anchor="middle">${esc(mastName(w, q.m))}</text>`);
  });
  /*
   * Die Baugruppen: Kette, Leiter, Flächen. `welt` legt einen Kettenpunkt
   * aufs Blatt. Gelesen wird über `expandiereAnbauteile` (dieselben Teile wie
   * im 3D); lässt sich eine Gruppe nicht lesen, bleibt ein Strich.
   */
  const zaehl = { leiter: 0, abzug: 0, kasten: 0 };
  const symbole = [];
  const leiterN = (t) => {
    const n = Math.max(1, Math.round(Number(t?.anzahl) || 1));
    const m = /-x(\d+)$/.exec(String(t?.bauteil ?? ''));
    return n * (m ? Number(m[1]) : 1);
  };
  const istKasten = (a, t) => {
    const m = (a.module ?? [])[t.modulIndex];
    if (m && istSignalModul(m)) return true;
    try { return getFlBauteil(t.bauteil)?.freieFlaeche === true; } catch { return false; }
  };
  const gruppeZeichnen = (a, meine, kette, welt) => {
    const dw = meine.filter((t) => t.rolle === 'drahtwerk');
    const abz = (t) => t.wirkung?.G === false;
    const kl = !dw.length ? 'vs-teil' : dw.every(abz) ? 'vs-abzug' : 'vs-traegt';
    (kette.glieder ?? []).forEach((g) => {
      const p = welt(g.von), r = welt(g.bis);
      if (Math.hypot(Number(X(p[0])) - Number(X(r[0])), Number(Z(p[1])) - Number(Z(r[1]))) < 0.3) return;
      linien.push(`<line class="${kl}" x1="${X(p[0])}" y1="${Z(p[1])}" x2="${X(r[0])}" y2="${Z(r[1])}"/>`);
    });
    (kette.belegung ?? []).forEach(({ teil: t, punkt }) => {
      if (!punkt) return;
      const [px, pz] = welt(punkt);
      const cx = Number(X(px)), cy = Number(Z(pz));
      if (t.rolle === 'drahtwerk') {
        const n = leiterN(t), ab = abz(t);
        zaehl[ab ? 'abzug' : 'leiter'] += n;
        const k = Math.min(n, 4), d = 5.2;
        for (let i = 0; i < k; i++) {
          const x = (cx + (i - (k - 1) / 2) * d).toFixed(1);
          symbole.push(`<circle class="${ab ? 'vs-abzugring' : 'vs-leiter'}" cx="${x}" cy="${cy.toFixed(1)}" r="2.3"/>`
            + (ab ? '' : `<circle class="vs-leiterkern" cx="${x}" cy="${cy.toFixed(1)}" r="0.8"/>`));
        }
        if (n > 4) symbole.push(`<text class="vs-zahl" x="${(cx + 2 * d + 1).toFixed(1)}" y="${(cy + 3).toFixed(1)}">×${n}</text>`);
      } else if (t.art === 'modul' && istKasten(a, t)) {
        zaehl.kasten += 1;
        symbole.push(`<rect class="vs-kasten" x="${(cx - 2.6).toFixed(1)}" y="${(cy - 2.6).toFixed(1)}" width="5.2" height="5.2"/>`);
      }
    });
  };
  teile.forEach((q) => {
    const jd = q.art === 'joch' ? Math.max(0.3, num(q.t.jd, 500) / 1000) : 0.16;
    if (q.art === 'joch') {
      linien.push(`<rect class="vs-joch" x="${X(Math.min(q.x0, q.x1))}" y="${Z(q.H + jd / 2)}" width="${(Math.abs(q.x1 - q.x0) * s).toFixed(1)}" height="${Math.max(2, jd * s).toFixed(1)}"/>`);
    } else if (q.art !== 'einzelmast') {
      linien.push(`<line class="vs-joch" x1="${X(q.x0)}" y1="${Z(q.H)}" x2="${X(q.x1)}" y2="${Z(q.H)}"/>`);
      if (q.art === 'tragausleger') {
        const m0 = ms.find((mm) => Math.abs(mm.x - q.x0) < 0.2);
        linien.push(`<line class="vs-seil" x1="${X(q.x0)}" y1="${Z(m0 ? m0.l : q.H + 4)}" x2="${X(q.x0 + q.seite * q.L * 0.82)}" y2="${Z(q.H)}"/>`);
      }
    }
    const aktive = (q.t.anbauteile ?? []).filter((a) => a && a.aktiv !== false);
    let flach = [];
    try { flach = expandiereAnbauteile(aktive, { ek: 'EK1' }); } catch { flach = []; }
    aktive.forEach((roh) => {
      let a;
      try { a = normalisiereAnbauteil(roh); } catch { return; }
      const meine = flach.filter((t) => t.baugruppe === a.id);
      const amMast = String(a.ort ?? '').startsWith('mast');
      try {
        if (amMast) {
          const soll = a.ort === 'mastB' ? q.x1 : q.x0;
          const mast = ms.find((mm) => a.mastId && mm.m.id === a.mastId)
            ?? ms.reduce((b, mm) => (!b || Math.abs(mm.x - soll) < Math.abs(b.x - soll) ? mm : b), null);
          if (!mast || !meine.length) return;
          const kette = anbauKette(meine, { x0: 0, zAn: 0, amMast: true });
          gruppeZeichnen(a, meine, kette, (p) => [mast.x + (p.x ?? 0), num(a.hMast) + (p.z ?? 0)]);
          return;
        }
        if (q.art === 'einzelmast') return;
        const zOG = q.H + jd / 2, zUG = q.H - jd / 2;
        // Am Ausleger nach links ist nur die Station gespiegelt, die Teile nicht.
        const stat = q.art === 'tragausleger' ? q.x0 + q.seite * num(a.x) : q.x0 + num(a.x);
        if (!meine.length) {
          const unten = a.befestigung !== 'oben';
          linien.push(`<line class="vs-teil" x1="${X(stat)}" y1="${Z(q.H)}" x2="${X(stat)}" y2="${Z(q.H + (unten ? -1.4 : 1.4))}"/>`);
          return;
        }
        const mitTraeger = meine.some((t) => (t.rolle ?? '') === 'traeger');
        const tr = meine.find((t) => (t.rolle ?? '') === 'traeger') ?? meine[0];
        const bef = a.befestigung === 'beide' ? 'durchgehend' : a.befestigung;
        const kette = anbauKette(meine, { x0: num(a.x),
          zAn: bezugsHoehe({ befestigung: bef, z: tr?.z ?? 0, mitTraeger }, zOG, zUG) });
        gruppeZeichnen(a, meine, kette, (p) => [stat + ((p.x ?? 0) - num(a.x)), p.z ?? 0]);
      } catch { /* diese Gruppe bleibt ohne Bild */ }
    });
  });
  const glyph = (innen) => `<svg viewBox="0 0 10 10" width="10" height="10">${innen}</svg>`;
  const legende = [
    zaehl.leiter ? `<span>${glyph('<circle class="vs-leiter" cx="5" cy="5" r="3"/><circle class="vs-leiterkern" cx="5" cy="5" r="1"/>')}Leiter getragen (${zaehl.leiter})</span>` : '',
    zaehl.abzug ? `<span>${glyph('<circle class="vs-abzugring" cx="5" cy="5" r="3"/>')}nur Abzug (${zaehl.abzug})</span>` : '',
    zaehl.kasten ? `<span>${glyph('<rect class="vs-kasten" x="2" y="2" width="6" height="6"/>')}Fläche / Signal (${zaehl.kasten})</span>` : '',
  ].filter(Boolean).join('');
  const liste = teile.map((q) => `<li>${esc(`${tragwerkPos(w, q.t)} · ${tragwerkName(q.t, w)}`)}${
    (q.t.anbauteile ?? []).filter((a) => a && a.aktiv !== false).length
      ? ` · ${(q.t.anbauteile ?? []).filter((a) => a && a.aktiv !== false).length} Anbauteile` : ''}</li>`).join('');
  const mastText = ms.map((q) => `${mastName(w, q.m)} ${q.m.profil ?? ''}`.trim()).join(' · ');
  return `<div class="ab-vs-titel">${esc(e.name ?? '')}${e.projekt ? ` <span>· ${esc(e.projekt)}</span>` : ''}</div>
    <svg class="ab-vs-bild" viewBox="0 0 ${B} ${Hh}" width="${B}" height="${Hh}" aria-hidden="true">
      <line class="vs-boden" x1="6" y1="${Z(0)}" x2="${B - 6}" y2="${Z(0)}"/>${linien.join('')}${symbole.join('')}</svg>
    ${legende ? `<div class="ab-vs-legende">${legende}</div>` : ''}
    <ul class="ab-vs-liste">${liste}</ul>
    ${mastText ? `<div class="ab-vs-masten">${esc(mastText)}</div>` : ''}`;
}

/** Passt der Eintrag zur Suche? Gesucht wird in allem, was ihn benennt. */
function passtZurSuche(app, e, q) {
  if (!q) return true;
  const w = e.werte ?? {};
  return [e.name, e.projekt, e.bemerkung, w.linie, w.km, w.ortschaft,
          w.projektNr, w.bearbeiter, e.kennwerte?.typ]
    .some((v) => String(v ?? '').toLowerCase().includes(q));
}

const SORTIERUNGEN = [
  { key: 'neu', label: 'Neueste zuerst' },
  { key: 'name', label: 'Bezeichnung' },
  { key: 'linie', label: 'Linie' },
  { key: 'km', label: 'KM' },
  { key: 'ortschaft', label: 'Ortschaft' },
  { key: 'eta', label: 'Ausnutzung' },
];

function sortiere(app, liste, art) {
  const t = (v) => String(v ?? '');
  const vgl = (a, b) => a.localeCompare(b, 'de', { numeric: true });
  const f = {
    neu: (a, b) => t(b.geaendert).localeCompare(t(a.geaendert)),
    name: (a, b) => vgl(t(a.name), t(b.name)),
    linie: (a, b) => vgl(t(a.werte?.linie), t(b.werte?.linie)),
    km: (a, b) => vgl(t(a.werte?.km), t(b.werte?.km)),
    ortschaft: (a, b) => vgl(t(a.werte?.ortschaft), t(b.werte?.ortschaft)),
    eta: (a, b) => (eintragEta(b) ?? -1) - (eintragEta(a) ?? -1),
  }[art] ?? (() => 0);
  return [...liste].sort(f);
}

export async function zeichneSchublade(app) {
  const n = ui.el('bannerschublade');
  n.classList.remove('zu');      // falls sie noch am Zufahren war
  n.hidden = false;
  ui.el('btn-projekt').classList.add('offen');
  n.innerHTML = '<p class="notiz">Ablage wird gelesen …</p>';

  let alle = [], vorlagen = [], fehler = '';
  try {
    alle = await store.liste();
    vorlagen = await store.vorlagenListe();
  } catch (e) { fehler = e.message; }
  if (!schubladeOffen) return;

  const projekte = [...new Set(alle.map((e) => (e.projekt ?? '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
  const imProjekt = alle.filter((e) => (e.projekt ?? '') === (app.projekt.projekt ?? ''));

  // --- Spalte 1: dieses Tragwerk --------------------------------------------
  const projektWahl = `
    <div class="feld"><label for="bs-projekt">Projekt</label>
      <select id="bs-projekt">
        <option value="">(ohne Projekt)</option>
        ${projekte.map((p) => `<option value="${esc(p)}"${p === app.projekt.projekt ? ' selected' : ''}>${esc(p)}</option>`).join('')}
        ${app.projekt.projekt && !projekte.includes(app.projekt.projekt)
          ? `<option value="${esc(app.projekt.projekt)}" selected>${esc(app.projekt.projekt)} (neu)</option>` : ''}
        <option value="__neu__"${neuesProjektOffen ? ' selected' : ''}>+ Neues Projekt</option>
      </select></div>
    ${neuesProjektOffen ? `<div class="feld"><label for="bs-projekt-neu">Name des neuen Projekts</label>
      <input id="bs-projekt-neu" type="text" placeholder="z. B. Bahnhof Nord, Fahrleitung"></div>` : ''}`;
  const tragwerkWahl = `
    <div class="feld"><label for="bs-tragwerk"
        title="Die gespeicherten Einträge dieses Projekts. Ein Eintrag ist ein Querprofil mit allen seinen Tragwerken.">Eintrag im Projekt</label>
      <select id="bs-tragwerk">
        ${imProjekt.map((e) => `<option value="${esc(e.id)}"${e.id === app.projekt.id ? ' selected' : ''}>${esc(e.name)}</option>`).join('')}
        <option value="__neu__"${app.projekt.id && imProjekt.some((e) => e.id === app.projekt.id) ? '' : ' selected'}>+ Als neuen Eintrag speichern (Stand bleibt)</option>
      </select></div>
    <div class="feld"><label for="bs-name">Bezeichnung</label>
      <input id="bs-name" type="text" value="${esc(app.projekt.name)}"
             placeholder="z. B. Joch Achse 12"></div>`;

  // --- Spalte 2: Projekte und Tragwerke -------------------------------------
  const q = ablageSicht.suche.trim().toLowerCase();
  const gefiltert = sortiere(app, alle.filter((e) => passtZurSuche(app, e, q)), ablageSicht.sort);
  const gruppen = new Map();
  gefiltert.forEach((e) => {
    const k = (e.projekt ?? '').trim();
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(e);
  });
  // Projekte alphabetisch, «Ohne Projekt» zuletzt; das geladene zuerst.
  const reihe = [...gruppen.keys()].sort((a, b) => {
    if (a === app.projekt.projekt) return -1;
    if (b === app.projekt.projekt) return 1;
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b, 'de', { numeric: true });
  });
  const ed = (id, feld, wert, klasse = '') =>
    `<td class="ab-ed ${klasse}" contenteditable="true" spellcheck="false"
         data-ed-id="${esc(id)}" data-ed-feld="${esc(feld)}">${esc(wert ?? '')}</td>`;
  const etaZelle = (e) => {
    const v = eintragEta(e);
    if (v === null) return '<td class="ab-zahl">–</td>';
    // Was die Zahl ist, steht im Titel; ältere Einträge führen nur das Joch.
    const k = e.kennwerte ?? {};
    const titel = k.etaQuelle && k.etaQuelle !== 'joch'
      ? `Grösste Ausnutzung über alle geführten Bauteile beim Speichern${k.etaWer ? ` - massgebend: ${k.etaWer}` : ''}`
        + (k.etaQuelle === 'ersatzbalken' ? ' (vorläufig, Ersatzbalken)' : ' (Stabwerk)')
      : 'Älterer Eintrag: nur das Joch aus dem Ersatzbalken, ohne Masten und Fundamente - neu speichern für das Gesamturteil';
    // Nur die Zahl («Zahl alleine geügt, die liste soll schlank bleiben», 8. Oktober) - das Bauteil steht im Titel.
    return `<td class="ab-zahl ${v > 1 ? 'nok' : 'ok'}" title="${esc(titel)}">${v.toFixed(2)}</td>`;
  };
  const tabelle = (k, liste) => `
    <details class="ab-gruppe${k === app.projekt.projekt ? ' aktiv' : ''}" open>
      <summary>
        <span class="ab-projekt" contenteditable="true" spellcheck="false"
              data-projekt-name="${esc(k)}" title="Klicken zum Umbenennen - betrifft alle Einträge">${esc(k || 'Ohne Projekt')}</span>
        <span class="sec-r">${liste.length} Tragwerk${liste.length === 1 ? '' : 'e'}</span>
        <button class="btn btn-mini" data-projekt-aus="${esc(k)}" title="Dieses Projekt als Paket ausleiten">Ausleiten</button>
        <button class="btn btn-mini" data-projekt-druck="${esc(k)}" title="Liste aller Tragwerke dieses Projekts drucken">Liste</button>
      </summary>
      <div class="ab-rollen"><table class="ab-tabelle">
        <thead><tr><th>Bezeichnung</th><th>Linie</th><th>KM</th><th>Ortschaft</th>
          <th>Tragwerk</th><th title="Grösste Ausnutzung über alle geführten Bauteile beim Speichern, das massgebende Bauteil steht im Titel der Zahl">η max</th><th>Datum</th><th>Bemerkung</th><th></th></tr></thead>
        <tbody>${liste.map((e) => `
          <tr class="${e.id === app.projekt.id ? 'aktiv' : ''}" data-id="${esc(e.id)}">
            ${ed(e.id, 'name', e.name, 'ab-name')}
            ${ed(e.id, 'linie', e.werte?.linie)}
            ${ed(e.id, 'km', e.werte?.km)}
            ${ed(e.id, 'ortschaft', e.werte?.ortschaft)}
            <td class="ab-leise">${esc(eintragRechnung(app, e))}</td>
            ${etaZelle(e)}
            <td class="ab-leise">${esc(e.werte?.datum || new Date(e.geaendert).toLocaleDateString('de-CH'))}</td>
            ${ed(e.id, 'bemerkung', e.bemerkung, 'ab-leise')}
            <td class="ab-knoepfe">
              <button class="btn btn-mini" data-laden="${esc(e.id)}">Laden</button>
              <button class="btn btn-mini" data-zuordnen="${esc(e.id)}" title="Einem Projekt zuordnen">${icon('projekte', 11)}</button>
              <button class="btn btn-mini" data-kopie="${esc(e.id)}" title="Kopie anlegen">Kopie</button>
              <button class="btn btn-mini" data-eintrag-aus="${esc(e.id)}" title="Nur dieses Tragwerk ausleiten">${icon('export', 11)}</button>
              <button class="btn btn-mini btn-fail" data-loeschen="${esc(e.id)}" title="Löschen">×</button>
            </td></tr>`).join('')}
        </tbody></table></div>
    </details>`;
  const projekteHtml = fehler
    ? `<div class="fehlerbox">Ablage nicht verfügbar: ${esc(fehler)}</div>`
    : (alle.length
      ? (reihe.length ? reihe.map((k) => tabelle(k, gruppen.get(k))).join('')
                      : `<p class="notiz">Keine Treffer für «${esc(ablageSicht.suche)}».</p>`)
      : '<p class="notiz">Noch keine Einträge in der Ablage.</p>');

  const vorlagenHtml = vorlagen.length ? vorlagen.map((v) => `
      <div class="ablage-zeile" data-id="${v.id}">
        <div class="ablage-name"><b>${esc(v.name)}</b>
          <div class="ablage-meta">${esc(v.bemerkung || eintragRechnung(app, v))}</div></div>
        <button class="btn btn-mini" data-vorlage-an="${v.id}">Anwenden</button>
        <button class="btn btn-mini btn-fail" data-vorlage-weg="${v.id}">×</button>
      </div>`).join('')
    : '<p class="notiz">Noch keine Vorlagen. «Als Vorlage sichern» legt den ' +
      'jetzigen Aufbau ohne die Jochlänge ab.</p>';

  n.innerHTML = `
    <div class="bs-kopf">
      <button class="btn" data-neu
        title="Beginnt ein leeres Querprofil aus einer Vorlage - der jetzige Stand wird ersetzt">${icon('neu', 13)} Neues Querprofil (leer)</button>
      <button class="btn btn-acc" data-speichern>${icon('speichern', 13)} ${app.projekt.id ? 'Speichern' : 'In Ablage speichern'}</button>
      <button class="btn btn-mini bs-zu" data-zu>Schliessen</button>
    </div>
    <div class="bs-spalten bs-drei">
      <div>
        ${abschnitt('Dieses Tragwerk', 'Projekt, Bezeichnung und Angaben')}
        ${projektWahl}
        ${tragwerkWahl}
        <div id="bs-verortung">${ui.verortungHtml(app.werte)}</div>
        <p class="notiz">Linie, Ortschaft und Kilometer stehen im Dateinamen der
          AxisVM-Ausleitung; Projektnummer, Bearbeiter und Datum in der
          Kopfzeile des Berichts und in der Projektliste.</p>
      </div>
      <div>${abschnitt('Projekte und gespeicherte Tragwerke',
                       'Laden ersetzt den jetzigen Stand')}
        <div class="ab-suche">
          <input id="bs-suche" type="search" value="${esc(ablageSicht.suche)}"
                 placeholder="Suchen: Bezeichnung, Linie, KM, Ortschaft, Projekt">
          <select id="bs-sort" title="Sortierung">
            ${SORTIERUNGEN.map((s) => `<option value="${s.key}"${s.key === ablageSicht.sort ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}
          </select>
        </div>
        ${projekteHtml}
        <div class="lf-fuss">
          <button class="btn btn-mini" data-import>Einlesen …</button>
          <button class="btn btn-mini" data-export>Ausleiten …</button>
          <button class="btn btn-mini" data-sicherung title="Alles: Tragwerke, Vorlagen, Zeichnungen, Einstellungen">Sicherung erstellen</button>
          <button class="btn btn-mini" data-sicherung-ein>Sicherung einspielen</button>
        </div>
      </div>
      <div>${abschnitt('Vorlagen ganzer Tragwerke', 'anwenden legt sich auf den Stand')}
        ${vorlagenHtml}
        <div class="lf-fuss">
          <button class="btn btn-mini" data-vorlage-neu>Als Vorlage sichern</button>
        </div>
        <p class="notiz" style="margin-top:8px">Eine Vorlage bringt Typ, Profile,
          Trasse, Anbauteile und Lastfälle mit. Die <b>Jochlänge</b> bleibt, wie
          sie ist, sonst würde das Anwenden das Bauteil umbauen.</p>
      </div>
    </div>`;

  // Die Verortungsfelder schreiben unmittelbar in die Eingabe - dieselbe
  // Verdrahtung wie im Optionen-Dialog, damit es nur eine gibt.
  ui.verdrahteOptionen(ui.el('bs-verortung'), app.werte, (k, v, zwischenstand) => {
    app.aendern(k, v);
    /*
     * WAEHREND DES TIPPENS BLEIBT DAS FELD STEHEN.
     *
     * verdrahteOptionen meldet jede Taste und sagt mit dem dritten Argument,
     * dass es ein Zwischenstand ist. Wer das uebergeht und die Schublade neu
     * zeichnet, ersetzt das Feld unter dem Cursor: der Fokus faellt auf den
     * Rumpf, und das naechste Zeichen landet im Nichts - beim Ortsnamen nach
     * dem ersten Buchstaben. Neu gezeichnet wird erst beim Verlassen.
     *
     * Der Kopf zieht trotzdem sofort nach: aendern() rechnet, und
     * pruefeUngesichert() vergleicht dabei die Verortung.
     */
    if (zwischenstand) return;
    ui.el('bs-verortung').innerHTML = ui.verortungHtml(app.werte);
    zeichneSchublade(app);
  });

  // --- Auswahlfelder ---------------------------------------------------------
  ui.el('bs-projekt').onchange = (ev) => {
    const v = ev.target.value;
    if (v === '__neu__') {
      neuesProjektOffen = true;
      zeichneSchublade(app).then(() => ui.el('bs-projekt-neu')?.focus());
      return;
    }
    neuesProjektOffen = false;
    // Ein anderes Projekt heisst: das Tragwerk wird dort NEU abgelegt -
    // es sei denn, es gehoert schon dorthin.
    app.projekt = { ...app.projekt, projekt: v };
    if (app.projekt.id && !alle.some((e) => e.id === app.projekt.id && (e.projekt ?? '') === v)) {
      app.projekt.id = null;
    }
    app.aktualisiereProjektKnopf();
    zeichneSchublade(app);
  };
  const neuFeld = ui.el('bs-projekt-neu');
  if (neuFeld) {
    const fertig = () => {
      const v = neuFeld.value.trim();
      if (!v) return;
      neuesProjektOffen = false;
      app.projekt = { ...app.projekt, projekt: v, id: null };
      app.aktualisiereProjektKnopf();
      zeichneSchublade(app);
    };
    neuFeld.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); fertig(); } };
    neuFeld.onblur = fertig;
  }
  ui.el('bs-tragwerk').onchange = async (ev) => {
    const v = ev.target.value;
    if (v === '__neu__') {
      // Wie in BlockCalc: der Stand bleibt, er wird beim Speichern ein
      // NEUER Eintrag in diesem Projekt.
      // Umbenannt am 8. Oktober («Es gibt zwei Neues Tragwerk buttons»): der
      // Knopf oben beginnt leer («Neues Querprofil (leer)»), diese Wahl löst
      // nur vom Eintrag («Als neuen Eintrag speichern (Stand bleibt)»).
      app.projekt = { ...app.projekt, id: null, name: `Neues ${tragwerksart(app.werte).label}` };
      app.ungesichert = true;
      app.aktualisiereProjektKnopf();
      zeichneSchublade(app).then(() => ui.el('bs-name')?.select());
      return;
    }
    await eintragLaden(app, v);
  };
  ui.el('bs-name').onchange = (ev) => {
    app.projekt = { ...app.projekt, name: ev.target.value.trim() || 'Ohne Namen' };
    app.aktualisiereProjektKnopf();
  };

  // --- Suche und Sortierung ----------------------------------------------------
  const suche = ui.el('bs-suche');
  suche.oninput = () => {
    ablageSicht.suche = suche.value;
    const pos = suche.selectionStart;
    zeichneSchublade(app).then(() => {
      const s = ui.el('bs-suche');
      if (s) { s.focus(); s.setSelectionRange(pos, pos); }
    });
  };
  ui.el('bs-sort').onchange = (ev) => { ablageSicht.sort = ev.target.value; zeichneSchublade(app); };

  // --- Unmittelbar bearbeiten --------------------------------------------------
  n.querySelectorAll('[data-ed-id]').forEach((z) => {
    const vorher = z.textContent;
    z.onkeydown = (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); z.blur(); }
      if (ev.key === 'Escape') { z.textContent = vorher; z.blur(); }
    };
    z.onblur = async () => {
      const wert = z.textContent.trim();
      if (wert === vorher.trim()) return;
      const s = await store.eintragFeld(z.dataset.edId, z.dataset.edFeld, wert);
      // Der geladene Stand traegt dieselbe Angabe - sie wandert mit.
      if (app.projekt.id === s.id) {
        if (z.dataset.edFeld === 'name') app.projekt = { ...app.projekt, name: s.name };
        else if (store.DIREKT_FELDER.includes(z.dataset.edFeld)) {
          app.werte = { ...app.werte, [z.dataset.edFeld]: s.werte[z.dataset.edFeld] };
          ui.el('bs-verortung').innerHTML = ui.verortungHtml(app.werte);
        }
        app.aktualisiereProjektKnopf();
      }
    };
  });
  n.querySelectorAll('[data-projekt-name]').forEach((z) => {
    const alt = z.dataset.projektName;
    z.onclick = (ev) => ev.preventDefault();      // nicht auf-/zuklappen
    z.onkeydown = (ev) => {
      if (ev.key === ' ') ev.stopPropagation();
      if (ev.key === 'Enter') { ev.preventDefault(); z.blur(); }
    };
    z.onblur = async () => {
      const neu = z.textContent.trim();
      if (neu === (alt || 'Ohne Projekt') || (!alt && !neu)) return;
      await store.projektUmbenennen(alt, neu === 'Ohne Projekt' ? '' : neu);
      if ((app.projekt.projekt ?? '') === alt) {
        app.projekt = { ...app.projekt, projekt: neu === 'Ohne Projekt' ? '' : neu };
        app.aktualisiereProjektKnopf();
      }
      zeichneSchublade(app);
    };
  });

  /*
   * Die Vorschau (B7) - seit dem 10. Oktober nur über dem Knopf «Laden»
   * («Die vorschau nur wenn man laden überfährt anzeigen»): ein schwebendes
   * Fenster neben dem Zeiger; über der übrigen Zeile bleibt es weg.
   */
  let vs = document.getElementById('ab-vorschau');
  const vsWeg = () => { if (vs) vs.hidden = true; };
  n.querySelectorAll('.ab-tabelle tbody tr[data-id]').forEach((tr) => {
    const knopf = tr.querySelector('[data-laden]');
    if (!knopf) return;
    const zeige = (ev) => {
      const e = alle.find((x) => x.id === tr.dataset.id);
      if (!vs) { vs = document.createElement('div'); vs.id = 'ab-vorschau'; vs.className = 'ab-vorschau'; document.body.appendChild(vs); }
      if (vs.dataset.id !== tr.dataset.id) {
        const html = e ? eintragVorschauHtml(e) : '';
        if (!html) { vsWeg(); return; }
        vs.innerHTML = html; vs.dataset.id = tr.dataset.id;
      }
      vs.hidden = false;
      const b = vs.getBoundingClientRect();
      const x = Math.min(ev.clientX + 18, window.innerWidth - b.width - 8);
      const y = ev.clientY + 18 + b.height > window.innerHeight ? ev.clientY - b.height - 12 : ev.clientY + 18;
      vs.style.left = `${Math.max(8, x)}px`; vs.style.top = `${Math.max(8, y)}px`;
    };
    knopf.addEventListener('mousemove', zeige);
    knopf.addEventListener('mouseleave', vsWeg);
    knopf.addEventListener('click', vsWeg);
  });
  n.addEventListener('scroll', vsWeg, { passive: true, capture: true });

  // --- Knoepfe -------------------------------------------------------------------
  const auf = (wahl, fn) => n.querySelectorAll(wahl).forEach((b) => {
    b.onclick = (ev) => { ev.stopPropagation(); ev.preventDefault(); fn(b); };
  });
  auf('[data-zu]', () => schubladeSchliessen(app));
  auf('[data-neu]', () => { schubladeSchliessen(app); app.neuesTragjoch(); });
  auf('[data-speichern]', () => ablageSpeichern(app, false));
  auf('[data-vorlage-neu]', () => dialogTragwerkVorlage(app));
  auf('[data-laden]', (b) => eintragLaden(app, b.dataset.laden, true));
  auf('[data-kopie]', async (b) => {
    await store.duplizieren(b.dataset.kopie); zeichneSchublade(app);
  });
  auf('[data-zuordnen]', async (b) => dialogZuordnen(app, await store.laden(b.dataset.zuordnen)));
  auf('[data-loeschen]', async (b) => {
    if (!confirm('Diesen Eintrag löschen?')) return;
    await store.loeschen(b.dataset.loeschen);
    if (app.projekt.id === b.dataset.loeschen) app.projekt.id = null;
    zeichneSchublade(app);
  });
  auf('[data-eintrag-aus]', (b) => ablageAusleiten(app, [b.dataset.eintragAus]));
  auf('[data-projekt-aus]', (b) => dialogAusleiten(app, 
    alle.filter((e) => (e.projekt ?? '') === b.dataset.projektAus).map((e) => e.id)));
  auf('[data-projekt-druck]', (b) => projektlisteDrucken(app, b.dataset.projektDruck));
  auf('[data-vorlage-an]', async (b) => {
    const v = await store.vorlageLaden(b.dataset.vorlageAn);
    if (!confirm(`Vorlage «${v.name}» anwenden? Profile, Trasse, Anbauteile und ` +
                 'Lastfälle werden übernommen; die Jochlänge bleibt.')) return;
    // Eine Vorlage ist so alt wie ihr Tag - sie wird angehoben wie ein
    // gespeicherter Stand (29. Sept., `standAnheben`).
    // Die Vorlage für sich anheben (F_z ihrer Lastblöcke, 1. Oktober), dann
    // einsetzen - gemischt trüge sie den Merker des offenen Standes.
    // Die Vorlage für sich anheben: der Merker des aktuellen Stands darf ihr
    // ψ₀ in alter Bedeutung nicht überdecken (6. Oktober, `psiAnheben`).
    app.werte = standAnheben({ ...app.werte, ...psiAnheben(fzNachObenAnheben(v.werte)), bearbeiten: false });
    app.werte.eigeneVorlagen = app.vorlagenZusammenfuehren(app.werte);
    setzeEigeneVorlagen(app.werte.eigeneVorlagen);
    app.station = null;
    schubladeSchliessen(app);
    app.neuRechnen();
  });
  auf('[data-vorlage-weg]', async (b) => {
    if (!confirm('Diese Vorlage löschen?')) return;
    await store.vorlageLoeschen(b.dataset.vorlageWeg);
    zeichneSchublade(app);
  });
  auf('[data-export]', () => dialogAusleiten(app, null));
  auf('[data-import]', () => ablageEinlesenWaehlen(app, false));
  auf('[data-sicherung]', async () => {
    const tag = new Date().toISOString().slice(0, 10);
    store.dateiSpeichern(await store.alsSicherung(),
      `${APP_NAME}-Sicherung-${tag}.zip`, 'application/zip');
  });
  auf('[data-sicherung-ein]', () => ablageEinlesenWaehlen(app, true));
}

/**
 * Einen Ablageeintrag laden.
 *
 * `fragen`: ungesicherte Aenderungen vorher bestaetigen lassen. Die
 * Auswahlliste fragt immer - dort ist der Wechsel ein Handgriff und kein
 * Knopfdruck.
 */
async function eintragLaden(app, id, fragen = true) {
  if (fragen && app.ungesichert
      && !confirm('Der jetzige Stand ist nicht in der Ablage gesichert. Trotzdem laden?')) {
    zeichneSchublade(app);
    return;
  }
  const s = await store.laden(id);
  /*
   * >>> WIE BEIM START ANHEBEN, UND LAUT SCHEITERN (29. September). <<<
   *
   * Gemeldet: «Ich konnte heute die alten Modell nicht alle laden.» Der
   * Start hob einen alten Stand vollständig an, dieser Weg nur zum Teil
   * (siehe `standAnheben`). Und scheiterte etwas, blieb es still: die
   * Ausnahme ging im Klick verloren, die Schublade stand offen, der alte
   * Stand weiter da. Jetzt wird der vorige Stand wiederhergestellt und
   * der Grund genannt - mit dem Namen des Eintrags.
   */
  const vorher = { werte: app.werte, projekt: app.projekt };
  try {
    app.werte = standAnheben({ ...standardwerte(), ...s.werte, bearbeiten: false });
    app.mastNachfuehrenGlobal();   // siehe beim Start
    app.projekt = { id: s.id, name: s.name, projekt: s.projekt, bemerkung: s.bemerkung ?? '' };
    neuesProjektOffen = false;
    app.station = null;
    // Frisch geladen heisst: der Stand entspricht der Ablage.
    app.markiereGesichert();
    schubladeSchliessen(app);
    // Die hinterlegte Zeichnung gehört zum Tragwerk und kommt mit ihm.
    await app.zeichnungHolen(s.id);
    app.neuRechnen();
    app.zeichneModellWerkzeuge();
    app.ansicht.ganzesJoch();
  } catch (e) {
    console.error('Laden fehlgeschlagen', s?.name, e);
    app.werte = vorher.werte;
    app.projekt = vorher.projekt;
    try { app.neuRechnen(); } catch { /* der vorige Stand rechnete */ }
    alert(`«${s.projekt ? `${s.projekt} · ` : ''}${s.name}» liess sich nicht laden:\n\n`
          + `${e?.message ?? e}\n\nDer vorige Stand ist wiederhergestellt. `
          + 'Bitte diese Meldung weitergeben - der Eintrag selbst ist unverändert.');
    return;
  }
  app.meldeImBalken(`Geladen: ${s.projekt ? `${s.projekt} · ` : ''}${s.name}`);
}

/**
 * >>> SPEICHERN OHNE DIALOG, WO KLAR IST, WOHIN (17. September). <<<
 *
 * Wie in BlockCalc: ist ein Eintrag geladen, ueberschreibt «Speichern» ihn.
 * Sonst wird ein neuer Eintrag im gewaehlten Projekt angelegt. Der Dialog
 * kommt nur, wenn noch nichts benannt ist.
 */
export async function ablageSpeichern(app, neu = false) {
  if (!app.projekt.id && !neu && /^Neues /.test(app.projekt.name ?? '') && !app.projekt.projekt) {
    schubladeSchliessen(app);
    app.dialogSpeichern();
    return;
  }
  const s = await sichereAktuell(app, neu);
  app.meldeImBalken(`Gespeichert: ${s.projekt ? `${s.projekt} · ` : ''}${s.name}`);
  if (schubladeOffen) zeichneSchublade(app);
}

/** Den jetzigen Stand in die Ablage legen - ueberschreiben oder neu. */
export async function sichereAktuell(app, neu = false, bemerkung = undefined) {
  // Ohne Datum gilt der Tag der Ablage; der Bearbeiter wird vorgemerkt.
  if (!String(app.werte.datum ?? '').trim()) app.werte = { ...app.werte, datum: heute() };
  if (String(app.werte.bearbeiter ?? '').trim()) {
    try { localStorage.setItem(app.BEARBEITER, String(app.werte.bearbeiter).trim()); } catch { /* egal */ }
  }
  let alt = null;
  if (!neu && app.projekt.id) alt = await store.laden(app.projekt.id).catch(() => null);
  const s = await store.sichern({
    id: neu ? undefined : (app.projekt.id ?? undefined),
    name: app.projekt.name, projekt: app.projekt.projekt ?? '',
    bemerkung: bemerkung ?? app.projekt.bemerkung ?? alt?.bemerkung ?? '',
    erstellt: alt?.erstellt,
    werte: app.werte,
    kennwerte: app.letzte ? {
      typ: app.werte.typ, L: app.werte.L,
      /*
       * >>> DAS GESAMTURTEIL, MIT BAUTEIL (8. Oktober). <<< Frage: «Welche
       * ausnutzung wird hier aufgeführt? die globale des tragwerks?» Es war
       * nur das Joch aus dem Ersatzbalken (0.58 neben «η 0.907 Fundament M1»
       * in der Fussleiste). Jetzt die Zahl der Fussleiste - das Maximum über
       * alle geführten Bauteile -, dazu wer massgebend ist und woher.
       */
      eta: Number.isFinite(app.urteilKurz?.eta) ? app.urteilKurz.eta
        : (app.letzte.anzeige?.max?.etaGesamt ?? app.letzte.erg.max.etaGesamt),
      etaWer: app.urteilKurz?.wer ?? null,
      etaQuelle: Number.isFinite(app.urteilKurz?.eta) ? app.urteilKurz.quelle : 'joch',
    } : null,
  });
  app.projekt = { id: s.id, name: s.name, projekt: s.projekt, bemerkung: s.bemerkung };
  // Erst jetzt hat das Tragwerk eine Id - und erst jetzt kann eine vorher
  // eingefügte Zeichnung zu ihm gelegt werden.
  await app.zeichnungSichernFallsMoeglich();
  app.markiereGesichert();
  app.speichern();
  return s;
}

/** Datei waehlen und einlesen - fuer beide Knoepfe. */
async function ablageEinlesenWaehlen(app, sicherung) {
  try {
    const { daten, name } = await store.dateiLesenRoh({ mitName: true });
    await dialogEinlesen(app, daten, { sicherung, dateiname: name });
  } catch (e) {
    if (!e?.abgebrochen) alert('Einlesen fehlgeschlagen: ' + e.message);
  }
}

/**
 * >>> EINLESEN MIT VORSCHAU, JE EINTRAG (17. September). <<<
 *
 * Fuer Paket und JSON derselbe Dialog. Jeder Eintrag laesst sich abwaehlen;
 * wo es im selben Projekt schon einen gleichen Namen gibt, steht die Wahl
 * daneben - Kopie, ersetzen, ueberspringen. Ein Zielprojekt legt alles
 * zusammen ab. Kommt genau ein Tragwerk herein, wird es gleich geladen.
 */
export async function dialogEinlesen(app, roh, { sicherung = false, dateiname = '' } = {}) {
  const i = await store.paketInhalt(roh);
  const projekte = await store.projektNamen();
  const vorgabeDoppelt = sicherung ? 'ersetzen' : 'kopie';
  const zeilen = i.liste.map((e, k) => `
    <tr>
      <td><input type="checkbox" data-ein="${k}" checked></td>
      <td>${esc(e.projekt || 'Ohne Projekt')}</td>
      <td><b>${esc(e.name)}</b>${e.zeichnung ? ' <span class="ab-leise">+ Zeichnung</span>' : ''}</td>
      <td class="ab-leise">${esc([e.linie && `Linie ${e.linie}`, e.km && `KM ${e.km}`, e.ortschaft].filter(Boolean).join(' · '))}</td>
      <td>${e.doppeltZu ? `<select data-doppelt="${k}">
            <option value="kopie"${vorgabeDoppelt === 'kopie' ? ' selected' : ''}>als Kopie</option>
            <option value="ersetzen"${vorgabeDoppelt === 'ersetzen' ? ' selected' : ''}>ersetzen</option>
            <option value="ueberspringen">überspringen</option></select>`
          : '<span class="ab-leise">neu</span>'}${e.wiederholt
          ? '<div class="ab-leise">zweimal in der Datei – kommt als Kopie dazu</div>' : ''}</td>
    </tr>`).join('');
  const teil = (key, label, anzahl, an) => (anzahl
    ? `<label class="feld-kurz"><input type="checkbox" data-teil="${key}"${an ? ' checked' : ''}>
         <span>${esc(label)} (${anzahl})</span></label>` : '');
  const d = app.dialog(sicherung ? 'Sicherung einspielen' : 'Einlesen', `
    <p class="notiz">${esc(dateiname)}${i.zip ? ' · Paket' : ' · JSON'}${
      i.erzeugt ? ` · erzeugt am ${new Date(i.erzeugt).toLocaleDateString('de-CH')}` : ''}</p>
    ${i.liste.length ? `<div class="ab-rollen"><table class="ab-tabelle ab-ein">
      <thead><tr><th><input type="checkbox" data-alle checked title="alle"></th>
        <th>Projekt</th><th>Tragwerk</th><th>Verortung</th><th>Vorhanden</th></tr></thead>
      <tbody>${zeilen}</tbody></table></div>` : '<p>Die Datei enthält keine Tragwerke.</p>'}
    ${i.doppelt.length ? `<div class="hinweisbox">${i.doppelt.length} Tragwerk(e) gibt es im
      selben Projekt schon. Je Zeile wählbar: als Kopie, ersetzen oder überspringen.</div>` : ''}
    ${i.liste.length ? `<div class="feld"><label for="ein-ziel">Ablegen in</label>
      <select id="ein-ziel">
        <option value="__datei__">Projekt aus der Datei</option>
        ${projekte.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('')}
        <option value="__neu__">+ Neues Projekt …</option>
      </select>
      <input id="ein-ziel-neu" type="text" placeholder="Name des Projekts" hidden></div>` : ''}
    ${teil('vorlagen', 'Vorlagen', i.vorlagen, true)}
    ${teil('zeichnungen', 'Hinterlegte Zeichnungen', i.zeichnungen, true)}
    ${teil('einstellungen', 'Einstellungen und Datenbasis - die Anwendung startet danach neu',
           i.einstellungen, sicherung)}
    <p class="notiz">Nichts wird ohne Wahl ersetzt.</p>`,
    `<button class="btn btn-acc" data-ok>Einlesen</button>
     <button class="btn" data-zu>Abbrechen</button>`);
  const alleCb = d.node.querySelector('[data-alle]');
  if (alleCb) {
    alleCb.onchange = () => d.node.querySelectorAll('[data-ein]')
      .forEach((c) => { c.checked = alleCb.checked; });
  }
  const ziel = d.node.querySelector('#ein-ziel');
  const zielNeu = d.node.querySelector('#ein-ziel-neu');
  if (ziel) ziel.onchange = () => { zielNeu.hidden = ziel.value !== '__neu__'; if (!zielNeu.hidden) zielNeu.focus(); };
  d.node.querySelector('[data-ok]').onclick = async () => {
    const ids = [...d.node.querySelectorAll('[data-ein]')]
      .filter((c) => c.checked).map((c) => i.liste[Number(c.dataset.ein)].id);
    const doppelt = {};
    d.node.querySelectorAll('[data-doppelt]').forEach((s) => {
      doppelt[i.liste[Number(s.dataset.doppelt)].id] = s.value;
    });
    const teilAn = (k) => Boolean(d.node.querySelector(`[data-teil="${k}"]`)?.checked);
    let zielProjekt;
    if (ziel && ziel.value === '__neu__') zielProjekt = zielNeu.value.trim();
    else if (ziel && ziel.value !== '__datei__') zielProjekt = ziel.value;
    d.zu();
    try {
      const r = await store.einlesen(roh, {
        ids, doppelt, zielProjekt,
        vorlagen: teilAn('vorlagen'), zeichnungen: teilAn('zeichnungen'),
        einstellungen: teilAn('einstellungen'),
      });
      const text = [
        r.eintraege ? `${r.eintraege} neu` : '',
        r.ersetzt ? `${r.ersetzt} ersetzt` : '',
        r.alsKopie ? `${r.alsKopie} davon als Kopie (Name zweimal in der Datei)` : '',
        r.uebersprungen ? `${r.uebersprungen} übersprungen` : '',
        r.vorlagen ? `${r.vorlagen} Vorlage(n)` : '',
        r.bilder ? `${r.bilder} Zeichnung(en)` : '',
        r.einstellungen ? `${r.einstellungen} Einstellung(en)` : '',
      ].filter(Boolean).join(', ') || 'nichts übernommen';
      if (r.einstellungen) {
        alert(`Eingelesen: ${text}. Die Anwendung startet neu.`);
        location.reload();
        return;
      }
      // Genau ein Tragwerk: gleich laden, wie in BlockCalc.
      if (r.neueIds.length === 1) {
        await eintragLaden(app, r.neueIds[0], true);
        app.meldeImBalken(`Eingelesen und geladen: ${text}`);
        return;
      }
      app.meldeImBalken(`Eingelesen: ${text}`);
      if (!schubladeOffen) schubladeUmschalten(app); else zeichneSchublade(app);
    } catch (e) { alert('Einlesen fehlgeschlagen: ' + e.message); }
  };
}

/**
 * >>> AUSLEITEN MIT AUSWAHL (17. September). <<<
 *
 * Wie «Exportieren» in BlockCalc: die Tragwerke nach Projekt gruppiert zum
 * Anhaken. Vorgewaehlt ist, womit der Dialog geoeffnet wurde - ein Projekt
 * aus seinem Gruppenkopf, alles aus dem Fuss der Ablage.
 */
async function dialogAusleiten(app, vorwahl) {
  const alle = await store.liste();
  const gruppen = new Map();
  alle.forEach((e) => {
    const k = (e.projekt ?? '').trim();
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(e);
  });
  const an = (id) => !vorwahl || vorwahl.includes(id);
  const d = app.dialog('Ausleiten', `
    <p class="notiz">Was in das Paket soll. Die Zeichnungen machen den
      Grossteil der Dateigrösse aus.</p>
    <div class="ab-auswahl">${[...gruppen.entries()].map(([k, liste]) => `
      <div class="sec"><label><input type="checkbox" data-gruppe="${esc(k)}"
        ${liste.every((e) => an(e.id)) ? 'checked' : ''}> ${esc(k || 'Ohne Projekt')}</label></div>
      ${liste.map((e) => `<label class="feld-kurz"><input type="checkbox" data-aus="${esc(e.id)}"
          data-in="${esc(k)}"${an(e.id) ? ' checked' : ''}>
        <span>${esc(e.name)} <span class="ab-leise">${esc(eintragRechnung(app, e))}</span></span></label>`).join('')}`).join('')}
    </div>
    <div class="sec">Dazu</div>
    ${store.PAKETTEILE.filter((t) => t.key !== 'eintraege').map((t) => `
      <label class="feld-kurz"><input type="checkbox" data-teil="${t.key}"${
        t.key === 'zeichnungen' ? ' checked' : ''}>
        <span>${esc(t.label)}</span></label>`).join('')}`,
    `<button class="btn btn-acc" data-ok>Ausleiten</button>
     <button class="btn" data-zu>Abbrechen</button>`);
  d.node.querySelectorAll('[data-gruppe]').forEach((g) => {
    g.onchange = () => d.node.querySelectorAll(`[data-in="${CSS.escape(g.dataset.gruppe)}"]`)
      .forEach((c) => { c.checked = g.checked; });
  });
  d.node.querySelector('[data-ok]').onclick = async () => {
    const ids = [...d.node.querySelectorAll('[data-aus]')]
      .filter((c) => c.checked).map((c) => c.dataset.aus);
    const teil = (k) => Boolean(d.node.querySelector(`[data-teil="${k}"]`)?.checked);
    if (!ids.length && !teil('vorlagen') && !teil('einstellungen')) {
      alert('Nichts ausgewählt.');
      return;
    }
    d.zu();
    await ablageAusleiten(app, ids, { vorlagen: teil('vorlagen'),
      zeichnungen: teil('zeichnungen'), einstellungen: teil('einstellungen') });
  };
}

/** Paket schreiben und herunterladen - benannt nach dem, was drin ist. */
async function ablageAusleiten(app, ids, teile = { zeichnungen: true }) {
  const alle = await store.liste();
  const drin = alle.filter((e) => ids.includes(e.id));
  const projekte = [...new Set(drin.map((e) => e.projekt || 'Ohne-Projekt'))];
  const rein = (t) => String(t).trim().replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '');
  const tag = new Date().toISOString().slice(0, 10);
  const teilName = drin.length === 1 ? `${rein(drin[0].projekt || 'Ohne-Projekt')}_${rein(drin[0].name)}`
    : (projekte.length === 1 ? `${rein(projekte[0])}_${drin.length}x` : 'Ablage');
  const daten = await store.alsPaket({ eintraege: ids.length > 0, ...teile }, ids);
  store.dateiSpeichern(daten, `${APP_NAME}-${teilName}-${tag}.zip`, 'application/zip');
}

/** Ein Tragwerk einem Projekt zuordnen - Auswahl der vorhandenen oder neu. */
async function dialogZuordnen(app, s) {
  const projekte = await store.projektNamen();
  const d = app.dialog('Projekt zuordnen', `
    <p class="notiz">${esc(s.name)} · jetzt in ${esc(s.projekt || 'Ohne Projekt')}</p>
    <div class="feld"><label for="z-wahl">Projekt</label>
      <select id="z-wahl">
        <option value="">(ohne Projekt)</option>
        ${projekte.map((p) => `<option value="${esc(p)}"${p === s.projekt ? ' selected' : ''}>${esc(p)}</option>`).join('')}
      </select></div>
    <div class="feld"><label for="z-frei">oder neuer Name</label>
      <input id="z-frei" type="text" value="${esc(s.projekt ?? '')}"></div>`,
    `<button class="btn btn-acc" data-ok>Zuordnen</button>
     <button class="btn" data-zu>Abbrechen</button>`);
  const wahl = ui.el('z-wahl');
  const frei = ui.el('z-frei');
  wahl.oninput = () => { frei.value = wahl.value; };
  d.node.querySelector('[data-ok]').onclick = async () => {
    const ziel = frei.value.trim();
    await store.umbenennen(s.id, { projekt: ziel });
    if (app.projekt.id === s.id) {
      app.projekt = { ...app.projekt, projekt: ziel };
      app.aktualisiereProjektKnopf();
    }
    d.zu();
    zeichneSchublade(app);
  };
}

/**
 * >>> DIE PROJEKTLISTE ZUM DRUCKEN (17. September). <<<
 *
 * Nach «Fundamentliste PDF» in BlockCalc: alle Tragwerke eines Projekts mit
 * Typ, Laenge, Masten und Ausnutzung. Wie dort wird jeder Eintrag NEU
 * gerechnet - die bei der Ablage vermerkte Ausnutzung koennte aus einer
 * aelteren Fassung stammen. Laesst sich einer nicht rechnen, steht der
 * vermerkte Wert mit Kennzeichnung da.
 */
async function projektlisteDrucken(app, projektName) {
  const eintraege = (await store.liste())
    .filter((e) => (e.projekt ?? '') === projektName)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'de', { numeric: true }));
  if (!eintraege.length) { alert('Das Projekt hat keine Tragwerke.'); return; }
  const zeilen = eintraege.map((e) => {
    // Angehoben wie beim Laden: ein Eintrag von vor dem 1. Oktober trägt die
    // Lastblöcke noch mit F_z nach unten (`fzNachObenAnheben`).
    const w = standAnheben({ ...standardwerte(), ...e.werte });
    let eta = null, etaMast = null, frisch = false;
    try {
      const joch = w.typ && w.typ !== 'frei' ? getTragjoch(w.typ) : null;
      // Ueber alle Kombinationen, wie in der Auswertung - ein einzelner
      // Lastfall liesse den Gegenwind aus (17. September).
      // Mit den Nachbarkraeften am geteilten Masten, wie in der Auswertung.
      const rsw = rechensatzMitNachbarn(w);
      const kb = vergleichKombinationen(rsw, getProfil(w.profOG),
                                        getProfil(w.profUG), getStahl(w.stahl), joch);
      const erg = kb.huellkurve ?? berechne(rsw, getProfil(w.profOG),
                                            getProfil(w.profUG), getStahl(w.stahl), joch);
      eta = erg.max?.etaGesamt ?? null;
      const m = erg.mast ?? {};
      const em = ['A', 'B'].map((k) => m[k]?.etaMitStabilitaet ?? m[k]?.eta)
        .filter(Number.isFinite);
      etaMast = em.length ? Math.max(...em) : null;
      frisch = Number.isFinite(eta);
    } catch { /* bleibt beim vermerkten Wert */ }
    if (!frisch) eta = eintragEta(e);
    const masten = mastenVon(w).map((x) => [x.name ?? x.id, x.profil].filter(Boolean).join(' '))
      .join(', ');
    const zahl = (v) => (Number.isFinite(v)
      ? `<span class="${v > 1 ? 'nok' : 'ok'}">${v.toFixed(2)}</span>` : '–');
    return `<tr>
      <td>${esc(e.name)}</td>
      <td>${esc(w.linie ?? '')}</td><td>${esc(w.km ?? '')}</td><td>${esc(w.ortschaft ?? '')}</td>
      <td>${esc(tragwerksart(w).label)} ${esc(w.typ ?? '')}</td>
      <td class="z">${Number.isFinite(Number(w.L)) ? Number(w.L).toFixed(2) : ''}</td>
      <td>${esc(w.mastVorhanden === false ? '–' : masten)}</td>
      <td class="z">${zahl(eta)}${frisch ? '' : ' *'}</td>
      <td class="z">${zahl(etaMast)}</td>
      <td>${esc(e.bemerkung ?? '')}</td></tr>`;
  }).join('');
  const w0 = eintraege[0].werte ?? {};
  const blatt = document.createElement('div');
  blatt.id = 'druck-liste';
  blatt.innerHTML = `
    <h1>${esc(APP_NAME)} – Projektliste</h1>
    <p><b>${esc(projektName || 'Ohne Projekt')}</b>${w0.projektNr ? ` · Nr. ${esc(w0.projektNr)}` : ''}
       · ${eintraege.length} Tragwerk${eintraege.length === 1 ? '' : 'e'}
       · Stand ${esc(heute())}${w0.bearbeiter ? ` · ${esc(w0.bearbeiter)}` : ''}</p>
    <table>
      <thead><tr><th>Bezeichnung</th><th>Linie</th><th>KM</th><th>Ortschaft</th>
        <th>Tragwerk</th><th>L [m]</th><th>Masten</th><th>η Tragwerk</th>
        <th>η Mast</th><th>Bemerkung</th></tr></thead>
      <tbody>${zeilen}</tbody>
    </table>
    <p class="fuss">η aus einer Rechnung beim Drucken. * vermerkter Wert der Ablage,
      das Tragwerk liess sich nicht neu rechnen.</p>`;
  document.body.appendChild(blatt);
  document.body.classList.add('druck-liste');
  const weg = () => {
    document.body.classList.remove('druck-liste');
    blatt.remove();
    window.removeEventListener('afterprint', weg);
  };
  window.addEventListener('afterprint', weg);
  window.print();
  // Manche Umgebungen melden afterprint nicht - dann nach dem Dialog.
  setTimeout(() => { if (document.body.contains(blatt)) weg(); }, 1500);
}

/** Den jetzigen Aufbau als Vorlage eines ganzen Tragwerks ablegen. */
function dialogTragwerkVorlage(app) {
  const d = app.dialog('Als Vorlage sichern', `
    <div class="feld"><label for="tv-name">Name der Vorlage</label>
      <input id="tv-name" type="text" value="${esc(app.projekt.name)} – Aufbau"></div>
    <div class="feld"><label for="tv-bem">Bemerkung</label>
      <input id="tv-bem" type="text" placeholder="wofür diese Vorlage gedacht ist"></div>
    <p class="notiz">Übernommen werden Typ, Profile, Stahlgüte, Auflager, Trasse,
      Anbauteile, Einwirkungen und Lastfälle. <b>Nicht</b> übernommen werden
      Jochlänge, Nachweisstelle und der Projektbezug. Eine Vorlage beschreibt
      die Art des Tragwerks, nicht das einzelne Stück.</p>`,
    '<button class="btn btn-acc" data-ok>Sichern</button>');
  d.node.querySelector('[data-ok]').onclick = async () => {
    await store.vorlageSichern({
      name: ui.el('tv-name').value.trim(),
      bemerkung: ui.el('tv-bem').value.trim(),
      werte: store.vorlageAusWerten(app.werte),
      kennwerte: { typ: app.werte.typ, teile: (app.werte.anbauteile ?? []).length },
    });
    d.zu();
    if (schubladeOffen) zeichneSchublade(app);
  };
}
