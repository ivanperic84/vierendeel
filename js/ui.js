/**
 * ui.js
 * ---------------------------------------------------------------------------
 * DOM-SCHICHT. Baut Eingabemaske und Auswertung aus dem Schema und dem
 * Rechenergebnis. Enthält KEINE Rechnung und KEINE Geometrie; das Aussehen
 * kommt aus js/design.js und css/style.css.
 * ---------------------------------------------------------------------------
 */

import { GRUPPEN, FELDER, sichtbareFelder, optionenFelder,
         SCHNITT_ORIENTIERUNGEN } from './ui.schema.js';
import { vorlagen, neuesAnbauteil, farbschluessel, baugruppeSumme,
         normalisiereAnbauteil, neuerLastblock, expandiereAnbauteile,
         modulWinkel } from './data.anbauteile.js';
import { flBauteile, getFlBauteil, istStreckenlast,
         PROFILBEIWERTE } from './data.fl.js';
import { befestigungsArt, anbauKette } from './core.anbauteile.js';
import { EINWIRKUNGEN } from './core.lasten.js';
import { MASSVARIANTEN } from './core.vierendeel.js';
import { abschnitt, klapp, kachel, plakette, ampel, esc, icon } from './design.js';
import { skizzeFuer } from './render.skizzen.js';

export const el = (id) => document.getElementById(id);

/**
 * Gemerkter Zustand der einklappbaren Abschnitte.
 *
 * Die Auswertung wird bei jeder Änderung neu gezeichnet. Ohne Gedächtnis
 * fielen alle aufgeklappten Abschnitte dabei wieder zu - man könnte eine
 * Tabelle nicht offen halten, während man am Träger schraubt.
 */
const KLAPP = new Map();

/**
 * Wer erfahren will, ob ein Abschnitt auf- oder zugeklappt wurde.
 *
 * Das Modellfenster hängt daran: solange eine Anbauteil-Karte offen ist, zeigt
 * es das Teil in der Einzelheit; sobald sie zufällt, kommt das ganze Joch
 * zurück. Ohne diese Meldung müsste man raten, wann das Bearbeiten zu Ende ist.
 */
let beiKlappWechsel = null;
export const setzeKlappHandler = (fn) => { beiKlappWechsel = fn; };

export function verdrahteKlapp(node) {
  node.querySelectorAll('[data-klapp]').forEach((d) => {
    const k = d.dataset.klapp;
    if (KLAPP.has(k)) d.open = KLAPP.get(k);
    if (d.dataset.klappVerdrahtet) return;
    d.dataset.klappVerdrahtet = '1';
    d.addEventListener('toggle', () => {
      KLAPP.set(k, d.open);
      beiKlappWechsel?.(k, d.open);
    });
  });
}

/** Ist ein Abschnitt gerade offen? */
export const klappOffen = (k) => KLAPP.get(k) === true;

/**
 * Einen Abschnitt von aussen auf- oder zuklappen.
 * Wird gebraucht, wenn ein Klick ins Modell die Oberfläche aufräumen soll:
 * das angeklickte Teil auf, die übrigen zu.
 */
export function setzeKlapp(k, offen) {
  KLAPP.set(k, offen);
  document.querySelectorAll(`[data-klapp="${CSS.escape(k)}"]`)
    .forEach((d) => { d.open = offen; });
}

const f3 = (v) => (Number.isFinite(v) ? v.toFixed(3) : '–');
const f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : '–');
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : '–');
const f0 = (v) => (Number.isFinite(v) ? v.toFixed(0) : '–');

/**
 * Reiter der Eingabe: welche Schemagruppen gehören zusammen.
 * Das Symbol steht in der eingeklappten Schiene.
 */
export const EINGABE_TABS = [
  { id: 'system', titel: 'System', icon: 'system', gruppen: ['typ', 'geo', 'aufl'] },
  // Die Stückliste gehört zu den Profilen: sie sagt, was aus der gewählten
  // Profil- und Blechwahl an Stahl herauskommt. Als eigener Auswertungsreiter
  // stand sie weit weg von der Entscheidung, die sie beeinflusst.
  { id: 'profil', titel: 'Profile', icon: 'profil', gruppen: ['prof', 'blech', 'stueck'] },
  { id: 'anbau', titel: 'Anbauteile', icon: 'anbau', gruppen: ['trasse', 'anbau'] },
  { id: 'lasten', titel: 'Lasten', icon: 'lastpfeil', gruppen: ['ein', 'komb'] },
];

/** Reiter der Auswertung. */
export const AUSWERTUNG_TABS = [
  { id: 'uebersicht', titel: 'Übersicht', icon: 'uebersicht' },
  { id: 'schnitt', titel: 'Schnitt', icon: 'schnitt' },
  { id: 'verlauf', titel: 'Verläufe', icon: 'achsen' },
  { id: 'auflager', titel: 'Auflager', icon: 'auflager' },
];

export function zeichneTabs(node, tabs, aktiv, beiWahl) {
  node.innerHTML = tabs.map((t) =>
    `<button class="tab${t.id === aktiv ? ' on' : ''}" data-tab="${t.id}" type="button">${esc(t.titel)}</button>`
  ).join('');
  node.querySelectorAll('[data-tab]').forEach((b) => {
    b.addEventListener('click', () => beiWahl(b.dataset.tab));
  });
}

// --- Eingabemaske -----------------------------------------------------------

/**
 * Kennung des STRUKTURELLEN Zustands der Maske.
 *
 * Solange sie gleich bleibt, dürfen die Eingabefelder stehenbleiben und es
 * genügt, ihre Werte nachzuführen. Das ist nicht bloss eine Optimierung: würde
 * die Maske bei jedem Tastendruck neu gebaut, verlöre das Feld unter dem
 * Cursor den Fokus, und eine halb getippte Zahl wie «0.» würde beim Zurück-
 * schreiben zu «0» - man müsste nach jeder Ziffer neu hineinklicken.
 */
/**
 * Der zuletzt gezeichnete Eingabestand.
 *
 * Die Ereignisse der Maske werden nur beim VOLLEN Neuaufbau verdrahtet. Würden
 * sie den damals übergebenen Zustand festhalten, arbeiteten sie nach der ersten
 * Änderung mit veralteten Werten weiter - zwei Änderungen hintereinander in
 * derselben Karte würden sich gegenseitig überschreiben. Deshalb lesen sie
 * hier nach, statt sich etwas zu merken.
 */
let aktuelleWerte = null;

export function maskenSignatur(werte, tab) {
  const gruppen = EINGABE_TABS.find((t) => t.id === tab)?.gruppen ?? [];
  return JSON.stringify([
    tab, Boolean(werte.bearbeiten), Boolean(werte.lastenBearbeiten),
    gruppen.map((gid) => (gid === 'anbau'
      // Die Befestigungsart gehört dazu: sie ändert den Erklärtext am Feld.
      // Ebenso die Rolle der Module (Drahtwerk zeigt den Winkel statt der
      // Länge) und die Einwirkungsgruppe je Lastblock.
      ? (werte.anbauteile ?? []).map(
          (a) => `${a.id}:${a.aktiv !== false}:${befestigungsArt(a)}:` +
                 `${klappOffen(`at-${a.id}`)}:${a.gleis ?? ''}:` +
                 (a.module ?? []).map((m) => m.bauteil).join(',') + ':' +
                 (a.lasten ?? []).map((l) => l.einwirkung).join(','))
      : sichtbareFelder(gid, werte).map((f) => f.key))),
  ]);
}

export function zeichneMaske(container, werte, tab, onChange, onAnbau, extras = {}) {
  aktuelleWerte = werte;
  const gruppen = EINGABE_TABS.find((t) => t.id === tab)?.gruppen ?? [];
  container.innerHTML = gruppen.map((gid) => {
    const g = GRUPPEN.find((x) => x.id === gid);
    if (!g) return '';
    const zusatz = extras[gid] ? `<div data-extra="${gid}">${extras[gid]}</div>` : '';
    if (gid === 'anbau') return anbauteileHtml(g, werte) + zusatz;
    const felder = sichtbareFelder(gid, werte);
    // Eine Gruppe kann ohne eigenes Eingabefeld auskommen und nur aus einem
    // Zusatzstück bestehen - die Lastfallmatrix ist so ein Fall.
    if (!felder.length) return zusatz;
    const knopf = felder.some((f) => f.ausDB) ? bearbeitenKnopf(werte)
                : felder.some((f) => f.ausLast) ? lastenKnopf(werte) : '';
    return abschnitt(g.titel, knopf) +
           felder.map((f) => feldHtml(f, werte[f.key], werte)).join('') + zusatz;
  }).join('');

  container.querySelectorAll('[data-feld]').forEach((inp) => {
    const key = inp.dataset.feld;
    const feld = FELDER.find((f) => f.key === key);
    const ev = inp.tagName === 'SELECT' || inp.type === 'checkbox' ? 'change' : 'input';
    inp.addEventListener(ev, () => {
      let v;
      if (feld.typ === 'zahl' || feld.typ === 'schieber') {
        v = parseFloat(inp.value); if (!Number.isFinite(v)) return;
      }
      else if (feld.typ === 'schalter') v = inp.checked;
      else if (feld.zahl) v = parseFloat(inp.value);
      else v = inp.value;
      onChange(key, v);
    });
  });
  container.querySelectorAll('[data-bearbeiten]').forEach((b) => {
    b.addEventListener('click', () =>
      onChange('bearbeiten', !(aktuelleWerte ?? werte).bearbeiten));
  });
  container.querySelectorAll('[data-lasten-bearbeiten]').forEach((b) => {
    b.addEventListener('click', () =>
      onChange('lastenBearbeiten', !(aktuelleWerte ?? werte).lastenBearbeiten));
  });
  verdrahteAnbauteile(container, werte, onAnbau);
  verdrahteKlapp(container);
}

/**
 * Werte in eine BESTEHENDE Maske nachführen, ohne sie neu zu bauen.
 *
 * Das Feld unter dem Cursor bleibt unangetastet - sonst würde eine gerade
 * getippte Zahl überschrieben. Alle anderen Felder folgen, damit Schieber und
 * Zahlenfeld desselben Werts zusammenbleiben und die gespiegelten
 * Tabellenlasten aktuell sind.
 */
export function aktualisiereMaske(container, werte, extras = {}) {
  aktuelleWerte = werte;
  const aktiv = document.activeElement;
  container.querySelectorAll('[data-feld]').forEach((inp) => {
    if (inp === aktiv) return;
    const f = FELDER.find((x) => x.key === inp.dataset.feld);
    if (!f) return;
    const v = werte[f.key];
    if (f.typ === 'schalter') { inp.checked = Boolean(v); return; }
    // Der Schieberbereich folgt dem Sortiment des gewählten Typs
    if (inp.type === 'range' || f.typ === 'schieber') {
      if (f.min !== undefined) inp.min = f.min;
      if (f.max !== undefined) inp.max = f.max;
    }
    if (String(inp.value) !== String(v)) inp.value = v;
  });
  const teilVon = (i) => {
    const roh = (werte.anbauteile ?? [])[i];
    return roh ? normalisiereAnbauteil(roh) : null;
  };
  container.querySelectorAll('.at-karte .at').forEach((inp) => {
    if (inp === aktiv) return;
    const a = teilVon(+inp.closest('.at-karte').dataset.idx);
    if (!a) return;
    const k = inp.dataset.k;
    const v = k === 'befestigung' ? befestigungsArt(a) : a[k];
    if (inp.type === 'checkbox') inp.checked = a.aktiv !== false;
    else if (String(inp.value) !== String(v ?? 0)) inp.value = v ?? 0;
  });
  // Die aus der Tabelle gerechneten Lasten der Module hängen an Trasse,
  // Spannweite und Einwirkungsklasse - sie müssen mitgeführt werden, auch wenn
  // sich an der Struktur der Maske nichts ändert.
  const trasse = trasseVon(werte);
  container.querySelectorAll('.at-karte').forEach((karte) => {
    const a = teilVon(+karte.dataset.idx);
    if (!a) return;
    const kopf = karte.querySelector('.klapp-r');
    if (kopf) kopf.textContent = baugruppeKopf(a, trasse);
    karte.querySelectorAll('.modul[data-modul]').forEach((d) => {
      const m = (a.module ?? [])[+d.dataset.modul];
      if (!m) return;
      let b = null;
      try { b = getFlBauteil(m.bauteil); } catch { /* unbekannt */ }
      d.querySelectorAll('.mod').forEach((inp) => {
        if (inp === aktiv || inp.tagName === 'SELECT') return;
        // Dieselbe Vorgabe wie beim Aufbau der Karte - sonst zeigt das Feld
        // vor der ersten Rechnung etwas anderes als danach.
        const v = modWert(m, inp.dataset.mk);
        const soll = v === null || v === undefined ? '' : String(v);
        if (inp.value !== soll) inp.value = soll;
      });
      const l = baugruppeSumme({ ...a, module: [m], lasten: [] }, trasse);
      d.querySelector('.modul-lasten').innerHTML = modulLastenHtml(l, b);
    });
    karte.querySelectorAll('.lastblock[data-last]').forEach((d) => {
      const bl = (a.lasten ?? [])[+d.dataset.last];
      if (!bl) return;
      d.querySelectorAll('.lb').forEach((inp) => {
        if (inp === aktiv) return;
        const v = bl[inp.dataset.lk] ?? 0;
        if (String(inp.value) !== String(v)) inp.value = v;
      });
    });
  });
  // Die mitgeführten Ergebnisstücke (Querschnittsklassen, Lastfallmatrix)
  Object.entries(extras).forEach(([gid, html]) => {
    const n = container.querySelector(`[data-extra="${gid}"]`);
    if (n && n.innerHTML !== html) n.innerHTML = html;
  });
  verdrahteKlapp(container);
}

/**
 * Blecheinteilung und Bindebleche des gewählten Typs, schreibgeschützt.
 *
 * Ohne diese Übersicht sah man im Regelfall (Bleche aus der Typendatenbank)
 * überhaupt nicht, mit welcher Teilung und welchen Blechen gerechnet wird -
 * der Abschnitt «Bindebleche» blieb leer, weil alle Eingabefelder nur bei
 * manueller Blechwahl gelten.
 */
/**
 * DIE BEIDEN HEBELARME, SICHTBAR.
 *
 * h und b entscheiden über jede Gurtkraft (N = M/h bzw. M/b) und standen
 * bisher nur im Verlaufsblatt. Ein falsch verstandenes Zeichnungsmass fällt
 * damit erst am Ende auf - beim Nachbau eines Signaljochs waren es 18 % auf h
 * und 20 % auf b, ohne dass irgendetwas danach ausgesehen hätte.
 *
 * Deshalb stehen sie hier neben den Massen, mit ihrer Herleitung und einer
 * Plausibilitätsschranke: h kann nie grösser als jd und nie kleiner als
 * jd − 2·max(zs) sein.
 */
export function hebelarmUebersicht(erg) {
  const m = erg.modell;
  const ha = m.hebelarme;
  if (!ha) return '';
  const mm = (v) => f0(v * 1000);
  const zsO = m.profOG.zsH * 10, zsU = m.profUG.zsH * 10;
  const hMin = m.jd - 2 * Math.max(zsO, zsU), hMax = m.jd;
  const hIst = m.h * 1000;
  const heikel = hIst > hMax + 1 || hIst < hMin - 1;
  const stA = ha.stehendAussen ?? { og: false, ug: false };
  const lage = (aussen) => (aussen ? 'Schenkel aussen' : 'Schenkel innen');
  return `${abschnitt('Hebelarme des Kräftepaars')}
    <div class="kennzahlen">
      ${kachel('h', mm(m.h), 'mm · Gurtschwerachsen')}
      ${kachel('b', mm(m.b), 'mm · Ebenenabstand')}
    </div>
    <p class="hinweis" style="margin:2px 0 0">
      h = jd − zs<sub>OG</sub> − zs<sub>UG</sub> = ${f0(m.jd)} − ${f1(zsO)} − ${f1(zsU)}
      = ${mm(m.h)} mm<br>
      b: Obergurt ${mm(ha.bOG ?? m.b)} mm (${esc(lage(stA.og))}) ·
      Untergurt ${mm(ha.bUG ?? m.b)} mm (${esc(lage(stA.ug))})
    </p>
    ${heikel ? `<p class="hinweis" style="color:var(--fail)">
      <b>h liegt ausserhalb des Erwartungsbereichs</b> (${f0(hMin)} … ${f0(hMax)} mm).
      Meist ist jd das falsche Zeichnungsmass: gemeint ist der Abstand
      <b>Winkelrücken zu Winkelrücken</b>, nicht das Aussenmass über die
      Anschlussbleche.</p>` : ''}`;
}

export function blechUebersichtHtml(erg) {
  if (!erg) return '';
  const m = erg.modell;
  const st = m.stationsListe ?? [];
  if (!st.length) return '';

  // Feldweiten aus den Stationen, nicht aus dem Sollwert
  const felder = st.slice(1).map((s, i) => (s.x - st[i].x) * 1000);
  const kette = felder.map((d) => d.toFixed(0)).join(' · ');
  const quelle = m.teilungQuelle === 'masstabelle'
    ? `Mass-Tabelle${m.ausfuehrung ? ` · Ausführung ${m.ausfuehrung.bez}` : ''}`
    : 'gleichmässig gerechnet';

  // Bleche zählen, je Ebene und Position
  const zaehler = new Map();
  st.forEach((s) => {
    [['Vertikal', s.vertikal], ['Horizontal', s.horizontal]].forEach(([art, b]) => {
      if (!b) return;
      const k = `${art}|${b.pos}|${b.breite}|${b.dicke}|${b.laenge ?? ''}`;
      zaehler.set(k, (zaehler.get(k) ?? 0) + 2);
    });
  });
  const zeilen = [...zaehler.entries()].map(([k, n]) => {
    const [art, pos, breite, dicke, laenge] = k.split('|');
    return `<tr><td>${esc(art)}</td><td>${esc(pos)}</td>
      <td class="num">${breite}×${dicke}${laenge ? '×' + laenge : ''}</td>
      <td class="num">${n}</td></tr>`;
  }).join('');

  const inhalt = `
    <p class="notiz" style="margin-top:0">Herkunft der Teilung: <b>${esc(quelle)}</b> ·
      ${st.length} Stationen · Feldweiten [mm] vom linken Jochende:</p>
    <p class="kette">${esc(kette)}</p>
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Ebene</th><th>Pos</th><th class="num">b×t×L [mm]</th>
        <th class="num">Stk</th></tr></thead>
      <tbody>${zeilen}</tbody></table></div>
    <p class="notiz">Am Jochende steht nur ein stehendes Blech – dort bildet das
      Joch eine <b>Gabel</b> für die Montage am Mast.</p>`;

  return klapp('blech-uebersicht', 'Blecheinteilung und Bindebleche', inhalt,
               `${st.length} Stationen · ${m.blechQuelle === 'datenbank'
                  ? 'Typendatenbank' : 'manuell'}`);
}

/**
 * Entsperrt die charakteristischen Einwirkungen.
 * Gesperrt zeigen sie die Werte der Sortimentstabelle - man sieht also immer,
 * womit gerechnet wird. Entsperrt schaltet die Herkunft auf "manuell".
 */
function lastenKnopf(werte) {
  return `<button class="btn btn-mini${werte.lastenBearbeiten ? ' btn-acc' : ''}"
    data-lasten-bearbeiten type="button"
    title="${werte.lastenBearbeiten
      ? 'Zurück auf die Werte der Sortimentstabelle'
      : 'Charakteristische Einwirkungen von Hand überschreiben'}">
    ${werte.lastenBearbeiten ? 'Tabellenwerte' : 'Werte bearbeiten'}</button>`;
}

function bearbeitenKnopf(werte) {
  return `<button class="btn btn-mini${werte.bearbeiten ? ' btn-acc' : ''}"
    data-bearbeiten type="button"
    title="${werte.bearbeiten
      ? 'Datenbankwerte sind entsperrt – erneut klicken, um sie zu schützen'
      : 'Datenbankwerte von Hand überschreiben'}">
    ${werte.bearbeiten ? 'sperren' : 'Werte bearbeiten'}</button>`;
}

/**
 * Hilfetext an einem Eingabefeld.
 *
 * Kurze Hinweise stehen als Ganzes da - sie sind schneller gelesen als
 * aufgeklappt. Lange werden auf den ERSTEN SATZ gekürzt; er trägt in diesen
 * Texten die Aussage, der Rest ist Begründung und Herleitung. Der Rest kommt
 * auf Klick.
 *
 * Ohne das stehen unter manchem Feld sechs Zeilen Fliesstext, und die Eingabe
 * darunter rutscht aus dem Bild - man scrollt zwischen zwei Zahlen durch
 * Erklärungen, die man beim zehnten Mal nicht mehr braucht.
 *
 * Der Zustand hängt am gemeinsamen Klapp-Gedächtnis (verdrahteKlapp), damit
 * ein aufgeklappter Hinweis das Neuzeichnen der Maske übersteht.
 *
 * @param {string} schluessel eindeutig je Feld
 * @param {string} text
 */
const HINWEIS_KURZ = 95;              // Zeichen, ab denen gekürzt wird
const HINWEIS_LANG = 200;             // ab hier wird auch ohne Satzgrenze gekürzt

export function hinweisHtml(schluessel, text) {
  const t = String(text ?? '').trim();
  if (!t) return '';
  const ganz = `<small class="hinweis">${esc(t)}</small>`;
  if (t.length <= HINWEIS_KURZ) return ganz;

  // Satzende suchen: Punkt/Doppelpunkt, danach Leerzeichen und ein Zeichen,
  // mit dem ein Satz beginnt. Die Mindestlänge verhindert, dass eine
  // Abkürzung («z. B.») den Satz vorzeitig beendet.
  const m = t.match(/^([\s\S]{25,}?[.:!?])\s(?=[A-ZÄÖÜ«("])/);
  const rest = m ? t.slice(m[1].length).trim() : t;

  // Ein einzelner langer Satz wird NICHT zerschnitten - eine Kurzfassung, die
  // mitten im Satz aufhört, ist schlechter als zwei Zeilen Fliesstext. Erst
  // wenn er wirklich ausufert, wird abgeschnitten und der ganze Text
  // aufgeklappt.
  if (!m && t.length <= HINWEIS_LANG) return ganz;
  if (!m || rest.length < 25) {
    if (t.length <= HINWEIS_LANG) return ganz;
  }
  const kopf = m ? m[1] : t.slice(0, HINWEIS_KURZ).replace(/\s+\S*$/, '') + ' …';

  return `<details class="hinweis-klapp" data-klapp="hw-${esc(schluessel)}">
    <summary><small class="hinweis">${esc(kopf)}</small></summary>
    <small class="hinweis">${esc(rest)}</small></details>`;
}

function feldHtml(f, wert, werte) {
  const id = `feld-${f.key}`;
  // Zwei Sperren: Katalogmasse (bearbeiten) und Tabellenlasten (lastenBearbeiten).
  const gesperrt = (f.ausDB && !werte.bearbeiten) ||
                   (f.ausLast && !werte.lastenBearbeiten);
  const hinweis = hinweisHtml(f.key, f.hinweis);
  const dis = gesperrt ? ' disabled' : '';
  let inp;

  if (f.typ === 'auswahl') {
    const opts = f.optionen.length
      ? f.optionen.map((o) =>
          `<option value="${esc(o.wert)}"${String(o.wert) === String(wert) ? ' selected' : ''}>${esc(o.text)}</option>`).join('')
      : `<option value="${esc(wert)}" selected>${esc(wert)}</option>`;
    inp = `<select id="${id}" data-feld="${f.key}"${dis}>${opts}</select>`;
  } else if (f.typ === 'schalter') {
    inp = `<label class="schalter"><input type="checkbox" id="${id}" data-feld="${f.key}"
             ${wert ? 'checked' : ''}${dis}><span>aktiv</span></label>`;
  } else if (f.typ === 'schieber') {
    inp = `<div class="zahlfeld">
             <input class="rng" type="range" data-feld="${f.key}"
               min="${f.min}" max="${f.max}" step="${f.schritt}" value="${wert}"${dis}>
             <input type="number" id="${id}" data-feld="${f.key}" class="kurz"
               value="${wert}" step="${f.schritt}" min="${f.min}" max="${f.max}"${dis}>
             <span class="einheit">${esc(f.einheit ?? '')}</span></div>
           <div class="rng-skala"><span>${f.min}</span><span>${f.max}</span></div>`;
  } else {
    inp = `<div class="zahlfeld"><input type="number" id="${id}" data-feld="${f.key}"
             value="${wert}" step="${f.schritt ?? 'any'}"
             ${f.min !== undefined ? `min="${f.min}"` : ''}${dis}>
           <span class="einheit">${esc(f.einheit ?? '')}</span></div>`;
  }
  return `<div class="feld${gesperrt ? ' gesperrt' : ''}">
    <label for="${id}">${esc(f.label)}${f.sym ? ` <em>${esc(f.sym)}</em>` : ''}</label>
    ${inp}${hinweis}</div>`;
}

// --- Anbauteile -------------------------------------------------------------

/** Farbmarke je Vorlagenart, passend zur 3D-Darstellung. */
const ANBAU_FARBE = {
  haengend: 'var(--acc)', aufgesetzt: 'var(--ok)',
  seitlich: 'var(--warn)', direkt: 'var(--dim)',
};

/**
 * Wo das Teil am Joch angeschlagen ist. Bestimmt die Darstellung im Modell:
 * durchgehende Teile bekommen ein Vertikalelement über die ganze Jochhöhe und
 * damit vier Anschlusspunkte, einseitige nur zwei.
 */
const BEFESTIGUNGEN = [
  { key: 'unten', label: 'am Untergurt (2 Punkte)' },
  { key: 'oben', label: 'am Obergurt (2 Punkte)' },
  { key: 'durchgehend', label: 'durchgehend Ober- und Untergurt (4 Punkte)' },
];

/** Was die Befestigungsart rechnerisch bedeutet – als Hinweis am Feld. */
const BEFESTIGUNG_WIRKUNG = {
  durchgehend: 'Torsion T_d als Kräftepaar zwischen den Gurten, ΔF_y = T_d/h – ' +
               'beansprucht die Horizontalbleche.',
  oben: 'Torsion T_d in EINER Gurtebene, ΔF_z = T_d/jbb – ' +
        'beansprucht die Vertikalbleche.',
  unten: 'Torsion T_d in EINER Gurtebene, ΔF_z = T_d/jbb – ' +
         'beansprucht die Vertikalbleche.',
};

function anbauteileHtml(g, werte) {
  const liste = (werte.anbauteile ?? []).map(normalisiereAnbauteil);
  const kacheln = vorlagen().map((v) => `
    <span class="kachel-huelle">
      <button class="kachel${v.eigen ? ' eigen' : ''}" data-vorlage="${esc(v.id)}"
              draggable="true" title="${esc(v.beschreibung)}">
        <span class="kachel-punkt" style="background:${ANBAU_FARBE[v.farbe] ?? 'var(--dim)'}"></span>
        <span class="kachel-name">${esc(v.name)}</span>
        <span class="kachel-meta">${(v.module ?? []).length
          ? `${v.module.length} Teil${v.module.length === 1 ? '' : 'e'}`
          : 'freie Last'}</span>
      </button>
      <button class="kachel-stift" data-vorlage-bearb="${esc(v.id)}"
        title="${v.eigen ? 'Vorlage bearbeiten'
          : 'Anpassen – legt eine eigene Kopie an, der Katalog bleibt unverändert'}"
        >${icon('optionen', 11)}</button>
      ${v.eigen ? `<button class="kachel-weg" data-vorlage-weg="${esc(v.id)}"
        title="Eigene Vorlage entfernen">×</button>` : ''}
    </span>`).join('');

  // ÜBERSICHT BEI VIELEN TEILEN
  // ------------------------------------------------------------------------
  // Auf einem langen Joch stehen zehn bis zwanzig Anbauteile. Als zwanzig
  // aufklappbare Karten sind das acht Bildschirmhöhen, und man sucht per
  // Scrollen. Jedes Teil steht deshalb zunächst als EINE ZEILE da - Position,
  // Name, Lage, Summenkraft - und nur das ANGEKLICKTE Teil wird zur vollen
  // Karte. Es ist immer nur eine Karte offen; das ist derselbe Weg, den auch
  // ein Klick ins Modell nimmt.
  //
  // Gruppiert wird nach GLEIS: so legt der Lastgenerator die Teile an, und so
  // steht ein Joch nun einmal über der Anlage.
  const trasse = trasseVon(werte);
  const gruppen = new Map();
  liste.forEach((a, i) => {
    const name = a.gleis ? `Gleis ${a.gleis}` : 'Ohne Gleiszuordnung';
    if (!gruppen.has(name)) gruppen.set(name, []);
    gruppen.get(name).push({ a, i });
  });

  const zeile = ({ a, i }) => {
    const offen = klappOffen(`at-${a.id}`);
    const su = baugruppeSumme(a, trasse);
    // F_x, nicht x: links in derselben Zeile steht die STATION x, und zwei
    // Bedeutungen für denselben Buchstaben in einer Zeile liest niemand
    // richtig.
    const kraft = [['F_x', su.Gx + su.Qx], ['F_y', su.Gy + su.Qy],
                   ['F_z', su.Gz + su.Qz]]
      .filter(([, v]) => Math.abs(v) > 0.005)
      .map(([k, v]) => `${k} ${f2(v)}`).join(' · ') || '–';
    const suchtext = `${a.name} ${a.vorlage ?? ''} ${a.x}`.toLowerCase();
    return `<div class="at-karte${a.aktiv === false ? ' aus' : ''}${offen ? ' offen' : ''}"
         data-idx="${i}" data-suche="${esc(suchtext)}">
      <div class="at-zeile" data-at-oeffnen="${i}"
           title="${esc(a.name)} · x = ${f2(a.x)} m · ${esc(kraft)} kN
${offen ? 'Zuklappen' : 'Anklicken zum Bearbeiten'}">
        <span class="kachel-punkt" style="background:${ANBAU_FARBE[farbschluessel(a)] ?? 'var(--dim)'}"></span>
        <span class="at-pos">A${i + 1}</span>
        <span class="at-name">${esc(a.name)}</span>
        <span class="at-x">${f2(a.x)} m</span>
        <span class="at-kraft">${esc(kraft)} kN</span>
      </div>
      <span class="at-tasten">
        <button class="btn btn-mini" data-at-zoom="${i}"
                title="Im Modell anfahren">${icon('zoom', 12)}</button>
        <button class="btn btn-mini" data-at-vorlage="${i}"
                title="Als eigene Vorlage speichern">${icon('speichern', 12)}</button>
        <label class="schalter" title="Teil mitrechnen"><input class="at" data-k="aktiv"
          type="checkbox" ${a.aktiv === false ? '' : 'checked'}></label>
        <button class="loeschen" data-loesch="${i}" title="Entfernen">×</button>
      </span>
      ${offen ? `<div class="at-koerper">
        <div class="at-kopf">
          <input class="at breit" data-k="name" type="text" value="${esc(a.name)}">
        </div>
        ${anbauteilSkizze(a, werte)}
        <div class="at-gitter">
          ${atSchieber(i, 'x', 'Lage x', a.x, 'm', 0.05, 0, werte.L ?? 20)}
          ${atWahl(i, 'befestigung', 'Befestigung', befestigungsArt(a), BEFESTIGUNGEN,
                   BEFESTIGUNG_WIRKUNG[befestigungsArt(a)])}
          ${atFeld(i, 'raster', 'Raster', a.raster, 'm', 0.05)}
          ${atFeld(i, 'gleis', 'Gleis', a.gleis ?? 0, '–', 1,
                   'Nach welchem Gleis die Baugruppe gruppiert wird. '
                   + '0 = ohne Zuordnung. Der Lastgenerator setzt die Nummer '
                   + 'selbst; von Hand eingesetzte Teile blieben bisher '
                   + 'dauerhaft ohne, weil das Feld fehlte.')}
        </div>
        ${modulListeHtml(a, i, werte)}
        ${windVersatzHtml(a, i)}
        ${lastblockListeHtml(a, i)}
      </div>` : ''}
    </div>`;
  };

  const summeGruppe = (teile) => teile.reduce((s, { a }) => {
    const k = baugruppeSumme(a, trasse);
    return s + k.Gz + k.Qz;
  }, 0);

  const zeilen = [...gruppen.entries()].map(([name, teile]) => `
    <div class="at-gruppe">
      <div class="sec">${esc(name)}<span class="sec-r">${teile.length} Stück ·
        F_z ${f2(summeGruppe(teile))} kN</span></div>
      ${teile.map(zeile).join('')}
    </div>`).join('');

  return abschnitt(g.titel,
    `<button class="btn btn-mini" data-generator type="button"
       title="Anbauteile über die Gleise verteilen">Lastgenerator</button>
     <span class="sec-r">${liste.length} Stück</span>`) +
    klapp('anbau-vorrat', 'Anbauteil hinzufügen', `
      <p class="hinweis" style="margin:0 0 7px">Kachel anklicken oder ins
        Modell ziehen.</p>
      <div class="kacheln">${kacheln}</div>
      ${klapp('anbau-achsen', 'Befestigung und Achsen', `
        <p class="hinweis" style="margin:0">
          Die Befestigung sitzt auf den Schwerachsen der Gurte, über die Länge
          «Raster» in Jochachse. Durchgehende Teile sind an Ober- UND Untergurt
          angeschlagen und leiten die Kraft in vier Punkte; einseitige nur in
          zwei.</p>
        <p class="hinweis" style="margin:6px 0 0">
          Achsen: <b>x</b> Jochachse · <b>y</b> Gleisrichtung ·
          <b>z</b> lotrecht, positiv nach oben, <b>0 auf der Schwerachse des
          Gurtes</b>, an dem das Teil angeschlagen ist. Eine Hängestütze von
          1.35 m misst also z = −1.35 m ab Untergurt. Für die Torsion rechnet
          der Kern den Hebelarm zur Jochachse dazu (h/2).</p>`)}`,
      `${vorlagen().length} Vorlagen`) +
    // Das Suchfeld filtert im Browser, ohne die Maske neu zu bauen - sonst
    // verlöre das Feld bei jedem Tastendruck den Fokus.
    (liste.length > 3 ? `<div class="at-suche">
      <input type="search" id="at-suche" placeholder="filtern nach Name, Vorlage, Lage …"
             autocomplete="off">
      <span class="at-suche-zahl"></span></div>` : '') +
    `<div class="at-liste">${zeilen || '<p class="notiz">Noch keine Anbauteile.</p>'}</div>`;
}

/** Einwirkungsklasse aus der gewählten Windstufe. */
const ekVonWerten = (w) =>
  ({ '0.9': 'EK1', '1.1': 'EK2', '1.3': 'EK3' })[w.windKlasse] ?? 'EK2';

/**
 * Modulliste einer Baugruppe.
 *
 * Jede Zeile ist ein Bauteil aus der Lasttabelle auf seiner eigenen Höhe.
 * Rechts stehen die daraus gerechneten Lasten - schreibgeschützt, denn sie
 * kommen aus der Tabelle und nicht aus der Eingabe. Zur Eingabe bleiben Lage,
 * Anzahl, Länge und die Exzentrizitäten, genau wie besprochen.
 */
/**
 * WAS SITZT AUF WAS - für die Karte lesbar gemacht.
 *
 * Die Kette entsteht aus den ROLLEN der Bauteile, und die stehen nirgends in
 * der Eingabe. Wer die Höhen von Hand setzt, sieht deshalb nicht, dass der
 * Ausleger an der Hängestütze hängt - und merkt auch nicht, wenn er ihn mit
 * gleicher Höhe UND gleichem Versatz auf denselben Punkt setzt und die Kette
 * damit lautlos in sich zusammenfällt.
 *
 * @returns {Map} modulIndex -> {rolle, haengtAn, zusammenMit}
 */
function ketteJeModul(a, werte) {
  const info = new Map();
  let flach = [];
  try {
    flach = expandiereAnbauteile([{ ...a, aktiv: true, lasten: [] }], trasseVon(werte));
  } catch { return info; }
  const kette = anbauKette(flach, { x0: a.x ?? 0, zAn: 0 });

  const gliedNach = new Map();          // Punkt -> das Glied, das ihn schuf
  kette.glieder.forEach((g) => gliedNach.set(g.bis, g));
  const nameVon = (teil) => teil?.bauteilName ?? teil?.name ?? null;

  // Wer teilt sich einen Punkt? Das ist der Fall, in dem die Kette einfällt.
  const amPunkt = new Map();
  kette.belegung.forEach(({ teil, punkt }) => {
    if (teil.modulIndex == null) return;
    if (!amPunkt.has(punkt)) amPunkt.set(punkt, []);
    amPunkt.get(punkt).push(teil);
  });

  kette.belegung.forEach(({ teil, punkt }) => {
    if (teil.modulIndex == null) return;
    /*
     * ÜBER HILFSPUNKTE HINWEG BENENNEN.
     *
     * Zwischen Stütze und Ausleger liegt der Punkt, auf den die halbe
     * Windlast zurückgesetzt wird (art 'windversatz'). Er ist ein wirklicher
     * Ort - der Anschluss Ausleger/Stütze -, aber kein BAUTEIL. Stünde er in
     * der Karte, hiesse es beim Ausleger «hängt an Ausleger Typ NT», weil der
     * Hilfspunkt den Namen seines Ursprungs trägt.
     */
    let g = gliedNach.get(punkt);
    let traegerGlied = g ? gliedNach.get(g.von) : null;
    while (traegerGlied && traegerGlied.teil?.art === 'windversatz') {
      traegerGlied = gliedNach.get(traegerGlied.von);
    }
    info.set(teil.modulIndex, {
      rolle: teil.rolle ?? null,
      haengtAn: traegerGlied ? nameVon(traegerGlied.teil) : 'Joch',
      zusammenMit: (amPunkt.get(punkt) ?? [])
        .filter((x) => x !== teil).map(nameVon).filter(Boolean),
    });
  });
  return info;
}

/** Anzeigename einer Rolle. Die Ids sind englisch-knapp, die Karte nicht. */
const ROLLE_TEXT = {
  traeger: 'Träger', aufbau: 'Aufbau', drahtwerk: 'Drahtwerk',
};

function modulListeHtml(a, i, werte) {
  const module = a.module ?? [];
  const trasse = trasseVon(werte);

  const auswahl = (wert) => {
    const gruppe = (rolle, titel) => {
      const liste = flBauteile(rolle);
      if (!liste.length) return '';
      return `<optgroup label="${esc(titel)}">${liste.map((b) =>
        `<option value="${esc(b.id)}"${b.id === wert ? ' selected' : ''}
          >${esc(b.name)}</option>`).join('')}</optgroup>`;
    };
    return gruppe('traeger', 'Träger am Joch') +
           gruppe('aufbau', 'Aufbauten') +
           gruppe('drahtwerk', 'Drahtwerke');
  };

  const kette = ketteJeModul(a, werte);

  const zeilen = module.map((m, k) => {
    let b = null;
    try { b = getFlBauteil(m.bauteil); } catch { /* unbekannt */ }
    const kt = kette.get(k);
    const l = baugruppeSumme({ ...a, module: [m], lasten: [] }, trasse);
    const streckenlast = b && istStreckenlast(b);
    const drahtwerk = b?.rolle === 'drahtwerk';
    // Beim Drahtwerk steht der ABLENKWINKEL zur Eingabe, nicht die Spannweite:
    // die Spannweite gilt global für die ganze Trasse, der Winkel ist das, was
    // sich am einzelnen Leiter unterscheidet. Leer heisst «aus R und L_FL».
    const alphaAuto = modulWinkel({ ...m, winkel: null }, trasse);
    return `<div class="modul" data-modul="${k}">
      <div class="modul-kopf">
        <select class="mod" data-mk="bauteil" data-idx="${i}" data-mod="${k}"
          >${auswahl(m.bauteil)}</select>
        ${b?.rolle === 'aufbau' && Math.abs(m.x ?? 0) > 1e-9 ? `
        <button class="btn btn-mini" type="button"
                data-mod-spiegeln="${k}" data-idx="${i}"
                title="Kragarm an der Achse der Hängestütze spiegeln – dieser
Ausleger und alles, was weiter aussen an ihm hängt (Leiter, Kettenwerk).
Ändert nur das Vorzeichen von x; Höhe und Lasten bleiben."
          >x ⇄</button>` : ''}
        <button class="loeschen" data-mod-weg="${k}" data-idx="${i}"
                title="Modul entfernen">×</button>
      </div>
      ${kt ? `<div class="modul-kette">
        ${kt.rolle ? `<span class="rollen-marke r-${esc(kt.rolle)}"
            title="Rolle aus der Lasttabelle – sie bestimmt, was auf was sitzt"
            >${esc(ROLLE_TEXT[kt.rolle] ?? kt.rolle)}</span>` : ''}
        <span class="kette-an">hängt an <b>${esc(kt.haengtAn ?? 'Joch')}</b></span>
        ${kt.zusammenMit.length ? `<span class="kette-warn"
            title="Gleicher Angriffspunkt: im Stabmodell teilen sich beide einen Knoten, die Kette hat hier kein Glied. Das ist zulässig – nur beabsichtigt sollte es sein."
            >am selben Punkt wie ${esc(kt.zusammenMit.join(', '))}</span>` : ''}
      </div>` : ''}
      <div class="sec-klein">Angriffspunkt</div>
      <div class="at-gitter">
        ${modFeld(i, k, 'x', 'x', modWert(m, 'x'), 'm', 0.1)}
        ${modFeld(i, k, 'y', 'y', modWert(m, 'y'), 'm', 0.1)}
        ${modFeld(i, k, 'z', 'z', modWert(m, 'z'), 'm', 0.05)}
        ${modFeld(i, k, 'anzahl', 'Anzahl', modWert(m, 'anzahl'), '–', 1)}
      </div>
      ${drahtwerk ? `<div class="sec-klein">Ablenkung</div>
      <div class="at-gitter">
        ${modFeld(i, k, 'winkel', 'Winkel α', modWert(m, 'winkel'), '°', 0.01,
                  `aus R/L_FL: ${f3(alphaAuto)}°`)}
        <span class="at-feld lesbar"><span>Spannweite <i>m</i></span>
          <b>${f2(m.laenge ?? trasse.spannweite ?? 0)}</b>
          <small class="hinweis">global, Gruppe «Trasse»</small></span>
      </div>` : streckenlast ? `<div class="at-gitter">
        ${modFeld(i, k, 'laenge', 'Länge', modWert(m, 'laenge'), 'm', 0.1)}
      </div>` : ''}
      ${b?.freieFlaeche ? `<div class="sec-klein">Angriffsfläche</div>
      <div class="at-gitter">
        ${modFeld(i, k, 'eigengewicht', 'Eigengew.', modWert(m, 'eigengewicht'), 'kN', 0.1)}
        ${modFeld(i, k, 'aQuer', 'A quer', modWert(m, 'aQuer'), 'm²', 0.05)}
        ${modFeld(i, k, 'aLaengs', 'A längs', modWert(m, 'aLaengs'), 'm²', 0.05)}
        ${modWahl(i, k, 'cw', 'Profilbeiwert', m.cw ?? 1.4,
                  PROFILBEIWERTE.map((p) => ({ key: p.c, label: p.label })))}
      </div>` : ''}
      <div class="modul-lasten">${modulLastenHtml(l, b)}</div>
    </div>`;
  }).join('');

  return `<div class="sec">Bauteile aus der Lasttabelle<span class="sec-r"
      >${module.length} Teil${module.length === 1 ? '' : 'e'}</span></div>
    <div class="modul-liste">${zeilen ||
      '<p class="notiz">Keine Bauteile aus der Tabelle.</p>'}</div>
    <button class="btn btn-zufuegen" data-mod-neu="${i}" type="button"
      >${icon('neu', 13)} Bauteil aus der Lasttabelle</button>`;
}

/**
 * ALLE Lastanteile eines Moduls, nach Einwirkungsgruppe geordnet.
 *
 * Vorher standen hier nur drei der sechs Anteile. Was nicht dasteht, wird
 * beim Prüfen auch nicht bemerkt - deshalb erscheint jetzt jeder Anteil, der
 * nicht null ist, mit seiner Gruppe davor.
 */
function modulLastenHtml(l, b) {
  const drahtwerk = b?.rolle === 'drahtwerk';
  const anteile = [
    ['G', 'F_z', l.Gz], ['G', 'F_x', l.Gx], ['G', 'F_y', l.Gy],
    ['W_x', 'F_x', l.Qx], ['W_y', 'F_y', l.Qy], ['S', 'F_z', l.Qz],
  ].filter(([, , v]) => Math.abs(v ?? 0) > 0.0005);

  // Kleine Beträge mit drei Stellen: "0.00" sagt nichts darüber, ob da etwas
  // steht oder nicht - gerade bei der Umlenkung im fast geraden Gleis.
  const zahl = (v) => (Math.abs(v) < 0.05 ? f3(v) : f2(v));
  return (anteile.length
    ? anteile.map(([g, f, v]) => `<span><i>${g}</i> ${f} ${zahl(v)}</span>`).join('')
    : '<span class="ablage-meta">keine Last</span>') +
    (drahtwerk ? `<span class="${Math.abs(l.alpha) > 1e-4 ? 'stark' : ''}"
       >α ${f3(l.alpha)}°</span>` : '') +
    `<span class="ablage-meta">kN · ${esc(b?.einheit ?? '')}</span>`;
}

/**
 * FREIE LASTBLÖCKE: Angriffspunkt / Kraft / Moment.
 *
 * Ein Lastblock ist die vollständige Beschreibung EINER Last: wo sie angreift,
 * was sie zieht, und ob ein Moment eingeprägt ist. Die Einwirkungsgruppe steht
 * obenan, denn sie entscheidet, mit welchem Beiwert die Last in die
 * Kombination geht - und ob sie sich mit dem Wind umkehrt.
 *
 * Die Gliederung in drei Zeilen ist kein Schmuck: zehn gleich aussehende
 * Zahlenfelder nebeneinander sagen nicht, welche Zahl wohin gehört.
 */
function lastblockListeHtml(a, i) {
  const bloecke = a.lasten ?? [];
  const zeilen = bloecke.map((l, k) => {
    const g = EINWIRKUNGEN.find((e) => e.key === l.einwirkung) ?? EINWIRKUNGEN[0];
    const hatMoment = ['Mxx', 'Myy', 'Mzz'].some((f) => Math.abs(l[f] ?? 0) > 0);
    return `<div class="modul lastblock" data-last="${k}">
      <div class="modul-kopf">
        ${lastWahl(i, k, 'einwirkung', l.einwirkung,
                   EINWIRKUNGEN.map((e) => ({ key: e.key, label: e.label })))}
        <button class="loeschen" data-last-weg="${k}" data-idx="${i}"
                title="Last entfernen">×</button>
      </div>
      <div class="sec-klein">Angriffspunkt</div>
      <div class="at-gitter">
        ${lastFeld(i, k, 'x', 'x', l.x, 'm', 0.1)}
        ${lastFeld(i, k, 'y', 'y', l.y, 'm', 0.1)}
        ${lastFeld(i, k, 'z', 'z', l.z, 'm', 0.1)}
      </div>
      <div class="sec-klein">Kraft</div>
      <div class="at-gitter">
        ${lastFeld(i, k, 'Fx', 'F_x', l.Fx, 'kN', 0.5)}
        ${lastFeld(i, k, 'Fy', 'F_y', l.Fy, 'kN', 0.5)}
        ${lastFeld(i, k, 'Fz', 'F_z', l.Fz, 'kN', 0.5)}
      </div>
      ${klapp(`last-${a.id}-${k}`, 'Moment (optional)', `
        <div class="at-gitter">
          ${lastFeld(i, k, 'Mxx', 'M_xx', l.Mxx, 'kNm', 0.5)}
          ${lastFeld(i, k, 'Myy', 'M_yy', l.Myy, 'kNm', 0.5)}
          ${lastFeld(i, k, 'Mzz', 'M_zz', l.Mzz, 'kNm', 0.5)}
        </div>
        <p class="hinweis" style="margin:6px 0 0">
          M_xx um die Jochachse (Torsion) · M_yy um y (Biegung des Jochs) ·
          M_zz um die Lotrechte (Biegung im Grundriss). Eingeprägte Momente
          treten über den Anschlussraster ins Joch ein.</p>`,
        hatMoment ? 'gesetzt' : '–', hatMoment)}
      <div class="modul-lasten">
        <span class="ablage-meta">Gruppe ${esc(g.label)}</span>
        ${g.art === 'staendig'
          ? '<span class="ablage-meta">feste Wirkrichtung</span>'
          : '<span class="ablage-meta">kehrt mit dem Vorzeichen der Kombination</span>'}
      </div>
    </div>`;
  }).join('');

  return `<div class="sec">Freie Lasten<span class="sec-r"
      >${bloecke.length} Block${bloecke.length === 1 ? '' : 'e'}</span></div>
    <div class="modul-liste">${zeilen ||
      '<p class="notiz">Keine freien Lasten.</p>'}</div>
    <button class="btn btn-zufuegen" data-last-neu="${i}" type="button"
      >${icon('neu', 13)} Freie Last</button>`;
}

/** Kopfzeile einer Baugruppe: was sie insgesamt einträgt. */
function baugruppeKopf(a, trasse) {
  const s = baugruppeSumme(a, trasse);
  const stueck = [];
  const n = (z, ein, mehr) => `${z} ${z === 1 ? ein : mehr}`;
  if ((a.module ?? []).length) stueck.push(n(a.module.length, 'Teil', 'Teile'));
  if ((a.lasten ?? []).length) stueck.push(n(a.lasten.length, 'Last', 'Lasten'));
  // Alle drei Richtungen, aber nur die, die etwas tragen: eine Kopfzeile, die
  // immer nur F_z zeigt, verschweigt gerade die Windlasten.
  const kraft = [['F_x', s.Gx + s.Qx], ['F_y', s.Gy + s.Qy], ['F_z', s.Gz + s.Qz]]
    .filter(([, v]) => Math.abs(v) > 0.005)
    .map(([k, v]) => `${k} ${f2(v)}`).join(' · ');
  return `${f2(a.x)} m · ${stueck.join(' + ') || 'leer'}` +
         (kraft ? ` · ${kraft} kN` : ' · ohne Last') +
         (Math.abs(s.Gx) > 0.005 ? ` · Umlenkung ${f2(s.Gx)} kN` : '');
}

/** Trasseangaben aus den Eingabewerten. */
const trasseVon = (w) => ({ ek: ekVonWerten(w), R: w.trasseRadius,
  spannweite: w.flSpannweite });

/** Auswahlliste in einer Modulzeile. */
function modWahl(i, k, feld, label, wert, optionen) {
  return `<label class="at-feld breit2" data-feldname="${feld}">
    <span>${esc(label)}</span>
    <select class="mod" data-mk="${feld}" data-idx="${i}" data-mod="${k}"
      >${optionen.map((o) => `<option value="${esc(o.key)}"
        ${String(o.key) === String(wert) ? ' selected' : ''}>${esc(o.label)}</option>`)
        .join('')}</select>
  </label>`;
}

/*
 * WAS EIN MODULFELD ZEIGT, WENN NICHTS GESETZT IST.
 *
 * Zwei Stellen schreiben in dieselben Felder: der AUFBAU der Karte
 * (modulListeHtml) und das AUFFRISCHEN bei jeder Rechnung
 * (aktualisiereMaske). Sie waren sich uneinig - der Aufbau setzte `?? 0`,
 * das Auffrischen machte aus null und undefined ein leeres Feld. Ein Modul
 * ohne eigenes x zeigte deshalb erst «0» und war nach der ersten Rechnung
 * leer. In der Vorlage steht x gar nicht, also traf das jede Hängestütze.
 *
 * `undefined` heisst hier: leer lassen, denn leer BEDEUTET dort etwas -
 * beim Winkel «aus Radius und Spannweite rechnen». Bei einer Lage bedeutet
 * leer nichts; dort gehört eine Null hin.
 */
const MODUL_VORGABE = {
  x: 0, y: 0, z: 0, anzahl: 1, laenge: 1,
  eigengewicht: 0, aQuer: 0, aLaengs: 0, cw: 1.4,
  winkel: undefined,
};

/** Wert eines Modulfelds für die Anzeige - mit der Vorgabe von oben. */
function modWert(m, feld) {
  const v = m?.[feld];
  return v === null || v === undefined ? MODUL_VORGABE[feld] : v;
}

function modFeld(i, k, feld, label, wert, einheit, schritt, hinweis = '') {
  return `<label class="at-feld" data-feldname="${feld}">
    <span>${esc(label)} <i>${esc(einheit)}</i></span>
    <input class="mod" data-mk="${feld}" data-idx="${i}" data-mod="${k}"
           type="number" step="${schritt}"
           value="${wert === '' || wert === null || wert === undefined ? '' : wert}"
           ${hinweis ? `placeholder="${esc(hinweis)}"` : ''}>
    ${hinweisHtml(`mod-${i}-${k}-${feld}`, hinweis)}
  </label>`;
}

/** Zahlenfeld eines freien Lastblocks. */
function lastFeld(i, k, feld, label, wert, einheit, schritt) {
  return `<label class="at-feld" data-feldname="${feld}">
    <span>${esc(label)} <i>${esc(einheit)}</i></span>
    <input class="lb" data-lk="${feld}" data-idx="${i}" data-last="${k}"
           type="number" step="${schritt}" value="${wert ?? 0}">
  </label>`;
}

/** Auswahlliste eines freien Lastblocks. */
function lastWahl(i, k, feld, wert, optionen) {
  return `<select class="lb" data-lk="${feld}" data-idx="${i}" data-last="${k}"
    >${optionen.map((o) => `<option value="${esc(o.key)}"
      ${o.key === wert ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
}

/**
 * Massskizze eines Anbauteils.
 *
 * Zehn Zahlenfelder nebeneinander sagen nicht, WO die Zahl hingehört. Die
 * Skizze zeigt es: links der Querschnitt mit e_v und den Kräften, rechts die
 * Ansicht in Jochachse mit Lage x und Raster. Jedes Mass trägt den Feldnamen,
 * damit es aufleuchtet, sobald man in das zugehörige Feld klickt.
 *
 * Bewusst schematisch und nicht massstäblich: e_v ist oft dreimal die
 * Jochhöhe; massstäblich wäre entweder das Joch ein Strich oder die Stütze
 * aus dem Bild.
 */
function anbauteilSkizze(a, werte) {
  const bef = befestigungsArt(a);
  // Der tiefste bzw. höchste Angriffspunkt der Baugruppe steht stellvertretend
  // für das Ganze: die Skizze erklärt die Achsen, nicht die einzelne Höhe.
  const punkte = [...(a.module ?? []), ...(a.lasten ?? [])];
  const zWahl = punkte.length
    ? punkte.reduce((s, p) => (Math.abs(p.z ?? 0) > Math.abs(s) ? (p.z ?? 0) : s), 0)
    : 0;
  const yWahl = punkte.reduce((s, p) => (Math.abs(p.y ?? 0) > Math.abs(s) ? (p.y ?? 0) : s), 0);
  const ev = -zWahl, ex = yWahl;
  const x = a.x ?? 0, raster = a.raster ?? 0.4, L = werte.L ?? 20;

  // --- Querschnitt links ---------------------------------------------------
  const cx = 74, cyO = 46, cyU = 92;          // Gurtachsen oben/unten
  const halb = 30;                            // halbe Jochbreite
  const gurt = (y) => `
    <line class="sk-gurt" x1="${cx - halb}" y1="${y}" x2="${cx + halb}" y2="${y}"/>
    <circle class="sk-winkel" cx="${cx - halb}" cy="${y}" r="3.2"/>
    <circle class="sk-winkel" cx="${cx + halb}" cy="${y}" r="3.2"/>`;

  // Anschlussebene(n) hervorheben
  const anschluss = (bef === 'durchgehend' ? [cyO, cyU] : bef === 'oben' ? [cyO] : [cyU])
    .map((y) => `<line class="sk-an" x1="${cx - halb - 4}" y1="${y}"
                       x2="${cx + halb + 4}" y2="${y}"/>`).join('');

  // Lastangriff: unterhalb bei e_v > 0, oberhalb bei e_v < 0
  const abY = ev >= 0 ? cyU : cyO;
  const anY = ev >= 0 ? Math.min(150, cyU + 42) : Math.max(12, cyO - 30);
  const anX = cx + Math.max(-26, Math.min(26, ex * 34));

  const evMass = ev ? `
    <g class="sk-mass" data-zu="z">
      <line x1="${cx + halb + 16}" y1="${abY}" x2="${cx + halb + 16}" y2="${anY}"/>
      <text x="${cx + halb + 20}" y="${(abY + anY) / 2 + 3}">z ${zWahl.toFixed(2)}</text>
    </g>` : '';
  const exMass = ex ? `
    <g class="sk-mass" data-zu="y">
      <line x1="${cx}" y1="${anY + 12}" x2="${anX}" y2="${anY + 12}"/>
      <text x="${(cx + anX) / 2}" y="${anY + 22}" text-anchor="middle">y ${ex.toFixed(2)}</text>
    </g>` : '';

  const kraft = (feld, x1, y1, dx, dy, txt) => `
    <g class="sk-kraft" data-zu="${feld}">
      <line x1="${x1}" y1="${y1}" x2="${x1 + dx}" y2="${y1 + dy}"/>
      <polygon points="${x1 + dx},${y1 + dy} ${x1 + dx - dy * 0.18 - dx * 0.22},${y1 + dy + dx * 0.18 - dy * 0.22} ${x1 + dx + dy * 0.18 - dx * 0.22},${y1 + dy - dx * 0.18 - dy * 0.22}"/>
      <text x="${x1 + dx + (dx ? 4 : 4)}" y="${y1 + dy + (dy ? 10 : -4)}">${esc(txt)}</text>
    </g>`;

  // --- Ansicht rechts: Lage in Jochachse -----------------------------------
  const aX0 = 186, aX1 = 288;
  const px = aX0 + Math.max(0, Math.min(1, x / (L || 1))) * (aX1 - aX0);
  const halbR = Math.max(3, (raster / (L || 1)) * (aX1 - aX0) / 2);

  return `<svg class="at-skizze" viewBox="0 0 300 165" role="img"
     aria-label="Massskizze des Anbauteils">
    <!-- Querschnitt -->
    <text class="sk-titel" x="8" y="12">Querschnitt</text>
    ${gurt(cyO)}${gurt(cyU)}
    <line class="sk-steg" x1="${cx - halb}" y1="${cyO}" x2="${cx - halb}" y2="${cyU}"/>
    <line class="sk-steg" x1="${cx + halb}" y1="${cyO}" x2="${cx + halb}" y2="${cyU}"/>
    ${anschluss}
    <g class="sk-teil" data-zu="befestigung">
      ${bef === 'durchgehend'
        ? `<line x1="${cx}" y1="${cyO}" x2="${cx}" y2="${cyU}"/>` : ''}
      <line x1="${cx}" y1="${abY}" x2="${anX}" y2="${anY}"/>
      <circle cx="${anX}" cy="${anY}" r="2.6"/>
    </g>
    ${evMass}${exMass}
    ${kraft('Fy', anX, anY, 22, 0, 'F_y')}
    ${kraft('Fz', anX, anY, 0, ev >= 0 ? 14 : -14, 'F_z')}

    <!-- Ansicht in Jochachse -->
    <text class="sk-titel" x="186" y="12">Lage in Jochachse</text>
    <line class="sk-gurt" x1="${aX0}" y1="46" x2="${aX1}" y2="46"/>
    <line class="sk-gurt" x1="${aX0}" y1="92" x2="${aX1}" y2="92"/>
    <g class="sk-teil"><line x1="${px}" y1="46" x2="${px}" y2="92"/></g>
    <g class="sk-mass" data-zu="x">
      <line x1="${aX0}" y1="110" x2="${px}" y2="110"/>
      <text x="${aX0}" y="122">x ${x.toFixed(2)} m</text>
    </g>
    <g class="sk-mass" data-zu="raster">
      <line x1="${px - halbR}" y1="34" x2="${px + halbR}" y2="34"/>
      <line x1="${px - halbR}" y1="30" x2="${px - halbR}" y2="38"/>
      <line x1="${px + halbR}" y1="30" x2="${px + halbR}" y2="38"/>
      <text x="${px}" y="26" text-anchor="middle">${(raster * 1000).toFixed(0)}</text>
    </g>
    <text class="sk-notiz" x="186" y="140">0 … ${L.toFixed(1)} m</text>
  </svg>`;
}

/** Rolle eines Moduls aus der Lasttabelle; null, wenn unbekannt. */
function modulRolle(m) {
  try { return getFlBauteil(m.bauteil).rolle; } catch { return null; }
}

/**
 * Schalter «Wind des Auslegers über die Fahrleitung».
 *
 * Erscheint nur, wo er etwas bedeutet: die Baugruppe braucht einen TRÄGER
 * (Hängestütze) und mindestens einen AUFBAU (Ausleger). Ohne beides gibt es
 * keinen Zweifeldträger, und der Schalter stünde wirkungslos da.
 * Was gerechnet wird, steht bei windAufTraeger in data.anbauteile.js.
 */
function windVersatzHtml(a, i) {
  const rollen = (a.module ?? []).map(modulRolle);
  const tr = (a.module ?? []).find((m, k) => rollen[k] === 'traeger');
  if (!tr || !rollen.includes('aufbau')) return '';
  const an = a.windAufTraeger === true;
  const p = a.windAnteil ?? 50;
  return `<div class="sec-klein">Lasteintrag des Auslegers</div>
    <label class="schalter"><input class="at" data-k="windAufTraeger"
      type="checkbox"${an ? ' checked' : ''}><span>Fahrleitung als Auflager
      ansetzen</span></label>
    ${an ? `<div class="at-gitter">
      ${atFeld(i, 'windAnteil', 'in den Träger', p, '%', 5)}
      <span class="at-feld lesbar"><span>Fahrleitung trägt <i>%</i></span>
        <b>${f0(100 - p)}</b></span>
      <span class="at-feld lesbar"><span>Eintrag <i>–</i></span>
        <b>Anschluss</b><small class="hinweis">Ausleger/Stütze</small></span>
    </div>` : ''}
    ${hinweisHtml(`windv-${a.id}`, 'Das äussere Ende des Auslegers hält die '
      + 'Fahrleitung, und die ist durch den Leiterzug seitlich gespannt - sie '
      + 'wirkt dort als Auflager. Der Wind auf den Ausleger verteilt sich '
      + 'damit auf zwei Auflager: die eine Hälfte nimmt die Fahrleitung auf '
      + 'und trägt sie längs zu den Nachbaraufhängungen ab, die andere geht '
      + 'in den Träger. Nur dieser Anteil kommt am Joch an, und zwar am '
      + 'ANSCHLUSSPUNKT Ausleger/Stütze: auf der Achse des Trägers, auf der '
      + 'Höhe des Auslegers. Bei einem Kragarm rückt er damit auch in '
      + 'Jochachse zurück - beim NT um 1.2 m. '
      + 'Eigengewicht, Schnee, Wind in x und die Drahtwerke bleiben '
      + 'unangetastet; deren Windlast ist über L_FL bereits der Anteil dieser '
      + 'Aufhängung. Die Hälfte ist eine zulässige Modellannahme, kein '
      + 'gerechneter Wert.')}`;
}

/**
 * Zahlenfeld MIT Schieber in der Anbauteil-Karte.
 *
 * Die Lage entlang des Jochs ist der Wert, den man beim Aufbauen am
 * häufigsten anfasst, und der einzige mit einem klaren Bereich: 0 … Jochlänge.
 * Ihn zu tippen heisst raten und nachbessern; am Schieber sieht man ihn im
 * Modell wandern. Beide Eingaben tragen denselben data-k, deshalb hält
 * aktualisiereMaske sie von selbst zusammen.
 */
function atSchieber(i, k, label, wert, einheit, schritt, min, max) {
  const v = Number.isFinite(wert) ? wert : 0;
  return `<label class="at-feld breit3" data-feldname="${k}">
    <span>${esc(label)} <i>${esc(einheit)}</i></span>
    <div class="zahlfeld">
      <input class="at rng" data-k="${k}" data-idx="${i}" type="range"
             min="${min}" max="${max}" step="${schritt}" value="${v}">
      <input class="at kurz" data-k="${k}" data-idx="${i}" type="number"
             step="${schritt}" value="${v}">
    </div>
  </label>`;
}

function atFeld(i, k, label, wert, einheit, schritt, titel = '') {
  return `<label class="at-feld" data-feldname="${k}"${
      titel ? ` title="${esc(titel)}"` : ''}>
    <span>${esc(label)} <i>${esc(einheit)}</i></span>
    <input class="at" data-k="${k}" data-idx="${i}" type="number"
           step="${schritt}" value="${wert ?? 0}">
  </label>`;
}

/** Auswahlliste in der Anbauteil-Karte. */
function atWahl(i, k, label, wert, optionen, hinweis = '') {
  return `<label class="at-feld breit2" data-feldname="${k}">
    <span>${esc(label)}</span>
    <select class="at" data-k="${k}" data-idx="${i}">${optionen.map((o) =>
      `<option value="${esc(o.key)}"${o.key === wert ? ' selected' : ''}
        >${esc(o.label)}</option>`).join('')}</select>
    ${hinweisHtml(`at-${i}-${k}`, hinweis)}
  </label>`;
}

let beiVorlageWahl = null, beiVorlageWeg = null, beiVorlageSichern = null;
let beiGenerator = null, beiAnbauZoom = null, beiVorlageBearbeiten = null;
let beiAnbauOeffnen = null;

/** Rückrufe der Anbauteil-Oberfläche registrieren (einmalig beim Start). */
export function setzeAnbauHandler(h) {
  beiVorlageWahl = h.wahl; beiVorlageWeg = h.weg;
  beiVorlageSichern = h.sichern; beiGenerator = h.generator;
  beiAnbauZoom = h.zoom; beiVorlageBearbeiten = h.bearbeiten;
  beiAnbauOeffnen = h.oeffnen;
}

/**
 * Formular zum Bearbeiten einer Vorlage.
 *
 * Katalogvorlagen werden nicht verändert - sie sind die gepflegte Grundlage.
 * Wer eine anpasst, bekommt eine eigene Kopie; das steht auch so im Formular.
 */
export function vorlageFormular(v, istKopie) {
  const auswahl = (wert) => {
    const gruppe = (rolle, titel) => {
      const liste = flBauteile(rolle);
      if (!liste.length) return '';
      return `<optgroup label="${esc(titel)}">${liste.map((b) =>
        `<option value="${esc(b.id)}"${b.id === wert ? ' selected' : ''}
          >${esc(b.name)}</option>`).join('')}</optgroup>`;
    };
    return gruppe('traeger', 'Träger am Joch') + gruppe('aufbau', 'Aufbauten') +
           gruppe('drahtwerk', 'Drahtwerke');
  };
  const module = (v.module ?? []).map((m, k) => `
    <div class="modul" data-vm="${k}">
      <div class="modul-kopf">
        <select class="vm" data-vk="bauteil" data-vm="${k}">${auswahl(m.bauteil)}</select>
        <button class="loeschen" data-vm-weg="${k}" title="Bauteil entfernen">×</button>
      </div>
      <div class="at-gitter">
        <label class="at-feld"><span>y <i>m</i></span>
          <input class="vm" data-vk="y" data-vm="${k}" type="number" step="0.1"
                 value="${m.y ?? -(0) ?? 0}"></label>
        <label class="at-feld"><span>z <i>m</i></span>
          <input class="vm" data-vk="z" data-vm="${k}" type="number" step="0.05"
                 value="${m.z ?? -(m.ev ?? 0)}"></label>
        <label class="at-feld"><span>Anzahl <i>–</i></span>
          <input class="vm" data-vk="anzahl" data-vm="${k}" type="number" step="1"
                 value="${m.anzahl ?? 1}"></label>
      </div>
    </div>`).join('');

  return `
    ${istKopie ? `<div class="infobox" style="margin-top:0">Der Katalog bleibt
      unverändert. Gesichert wird eine <b>eigene Kopie</b>, die neben den
      Katalogvorlagen erscheint.</div>` : ''}
    <div class="feld"><label for="vl-name">Name</label>
      <input id="vl-name" type="text" value="${esc(v.name ?? '')}"></div>
    <div class="feld"><label for="vl-bef">Befestigung am Joch</label>
      <select id="vl-bef">${BEFESTIGUNGEN.map((o) =>
        `<option value="${esc(o.key)}"${o.key === (v.befestigung ?? 'unten') ? ' selected' : ''}
          >${esc(o.label)}</option>`).join('')}</select></div>
    <div class="feld"><label for="vl-raster">Anschlussraster</label>
      <div class="zahlfeld"><input id="vl-raster" type="number" step="0.05"
        value="${v.raster ?? 0.4}"><span class="einheit">m</span></div>
      <small class="hinweis">Abstand der beiden Einleitungsstellen in Jochachse.
        Er bestimmt mit, auf wie viele Bindebleche sich das Kräftepaar verteilt.</small></div>
    <div class="sec">Bauteile aus der Lasttabelle<span class="sec-r"
      >${(v.module ?? []).length}</span></div>
    <div class="modul-liste" id="vl-module">${module ||
      '<p class="notiz">Noch keine Bauteile.</p>'}</div>
    <button class="btn btn-mini" id="vl-neu" type="button">+ Bauteil</button>
    <p class="notiz">z zählt ab der Schwerachse des Anschlussgurtes,
      positiv nach oben. Ein hängendes Teil hat also z &lt; 0.</p>`;
}

function verdrahteAnbauteile(container, werte, onAnbau) {
  if (!onAnbau) return;
  // Immer den AKTUELLEN Stand lesen, nicht den beim Verdrahten gültigen.
  // Immer im NEUEN Modell arbeiten: was aus einem alten Stand kommt, wird
  // beim ersten Anfassen umgeschrieben und nicht halb weitergeschleppt.
  const liste = () =>
    ((aktuelleWerte ?? werte).anbauteile ?? []).map(normalisiereAnbauteil);

  container.querySelectorAll('.kachel').forEach((b) => {
    // Anklicken fragt die Lage ab, statt das Teil auf x = 0 zu setzen.
    b.addEventListener('click', () => beiVorlageWahl?.(b.dataset.vorlage, null));
    b.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/tragjoch-vorlage', b.dataset.vorlage);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });
  container.querySelectorAll('[data-vorlage-weg]').forEach((b) => {
    b.addEventListener('click', () => beiVorlageWeg?.(b.dataset.vorlageWeg));
  });
  container.querySelectorAll('[data-vorlage-bearb]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      beiVorlageBearbeiten?.(b.dataset.vorlageBearb);
    });
  });
  // Rechtsklick auf die Kachel führt zum selben Editor - wer das gewohnt ist,
  // sucht nicht erst den kleinen Stift.
  container.querySelectorAll('.kachel').forEach((b) => {
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      beiVorlageBearbeiten?.(b.dataset.vorlage);
    });
  });
  container.querySelectorAll('[data-generator]').forEach((b) => {
    b.addEventListener('click', () => beiGenerator?.());
  });
  container.querySelectorAll('[data-at-zoom]').forEach((b) => {
    b.addEventListener('click', () => beiAnbauZoom?.(+b.dataset.atZoom));
  });
  // Zeile anklicken: dieses Teil aufklappen, die übrigen zu. Ein zweiter Klick
  // auf die offene Zeile klappt sie wieder zu.
  container.querySelectorAll('[data-at-oeffnen]').forEach((z) => {
    z.addEventListener('click', () => beiAnbauOeffnen?.(+z.dataset.atOeffnen));
  });
  // Filtern im Browser, ohne die Maske neu zu bauen.
  const suche = container.querySelector('#at-suche');
  if (suche) {
    const filtern = () => {
      const q = suche.value.trim().toLowerCase();
      let sichtbar = 0;
      container.querySelectorAll('.at-karte').forEach((k) => {
        const passt = !q || (k.dataset.suche ?? '').includes(q);
        k.hidden = !passt;
        if (passt) sichtbar++;
      });
      // Leere Gleisgruppen ausblenden, damit keine Überschrift ohne Inhalt bleibt
      container.querySelectorAll('.at-gruppe').forEach((gr) => {
        gr.hidden = ![...gr.querySelectorAll('.at-karte')].some((k) => !k.hidden);
      });
      const zahl = container.querySelector('.at-suche-zahl');
      if (zahl) zahl.textContent = q ? `${sichtbar} von ${
        container.querySelectorAll('.at-karte').length}` : '';
    };
    suche.addEventListener('input', filtern);
    filtern();
  }
  container.querySelectorAll('[data-at-vorlage]').forEach((b) => {
    b.addEventListener('click', () => beiVorlageSichern?.(+b.dataset.atVorlage));
  });
  // Ein Klick in eine Karte fährt das Modell auf dieses Teil - man sieht
  // sofort, welches Teil man gerade bearbeitet.
  container.querySelectorAll('.at-karte').forEach((k) => {
    k.addEventListener('focusin', () => beiAnbauZoom?.(+k.dataset.idx, true));
  });

  container.querySelectorAll('.at').forEach((inp) => {
    const ev = inp.type === 'checkbox' ? 'change' : 'input';
    inp.addEventListener(ev, () => {
      const karte = inp.closest('.at-karte');
      const idx = +karte.dataset.idx;
      const l = liste();
      l[idx][inp.dataset.k] = inp.type === 'checkbox' ? inp.checked
        : inp.type === 'number' || inp.type === 'range'
          ? (parseFloat(inp.value) || 0) : inp.value;
      onAnbau(l);
    });
  });

  container.querySelectorAll('[data-loesch]').forEach((b) => {
    b.addEventListener('click', () =>
      onAnbau(liste().filter((_, i) => i !== +b.dataset.loesch)));
  });

  // --- Module der Baugruppe -------------------------------------------------
  const setzeModul = (idx, mod, feld, wert) => {
    const l = liste();
    if (!l[idx]) return;
    const m = (l[idx].module ?? []).map((x) => ({ ...x }));
    if (!m[mod]) return;
    m[mod] = { ...m[mod], [feld]: wert };
    l[idx] = { ...l[idx], module: m };
    onAnbau(l);
  };
  /*
   * KRAGARM SPIEGELN.
   *
   * Ein Ausleger steht nach der einen oder der anderen Seite aus, und beim
   * Aufnehmen einer Anlage wechselt das von Joch zu Joch. Von Hand hiesse
   * das: zwei Vorzeichen umsetzen und keines vergessen - denn die Leiter am
   * ENDE des Arms muss mit.
   *
   * Gespiegelt wird deshalb dieser Ausleger UND alles, was auf derselben
   * Seite weiter aussen sitzt. Ein zweiter Ausleger nach der anderen Seite
   * bleibt, wo er ist; einer, der weiter innen sitzt, ebenso.
   *
   * Nur das Vorzeichen von x. Höhe, Lasten und Rolle bleiben - die Achse der
   * Hängestütze ist der Spiegel.
   */
  container.querySelectorAll('[data-mod-spiegeln]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = +b.dataset.idx, mod = +b.dataset.modSpiegeln;
      const l = liste();
      const a = l[idx];
      if (!a) return;
      const module = (a.module ?? []).map((x) => ({ ...x }));
      const x0 = module[mod]?.x ?? 0;
      if (!x0) return;
      const seite = Math.sign(x0), weite = Math.abs(x0) - 1e-9;
      module.forEach((m) => {
        const mx = m.x ?? 0;
        if (Math.sign(mx) === seite && Math.abs(mx) >= weite) m.x = -mx;
      });
      l[idx] = { ...a, module };
      onAnbau(l);
    });
  });

  container.querySelectorAll('.mod').forEach((inp) => {
    const ev = inp.tagName === 'SELECT' ? 'change' : 'input';
    inp.addEventListener(ev, () => {
      const zahl = inp.type === 'number' || inp.dataset.mk === 'cw';
      // Leerer Winkel heisst NICHT null Grad, sondern «aus Radius und
      // Spannweite». Nur dort darf leer bestehen bleiben (MODUL_VORGABE);
      // eine geleerte LAGE ist eine Null und wird auch so abgelegt - sonst
      // steht in der Baugruppe ein null, das die Karte gleich wieder als
      // leeres Feld zeigt.
      const leer = inp.value.trim() === '';
      const vorgabe = MODUL_VORGABE[inp.dataset.mk];
      const wert = !zahl ? inp.value
        : leer ? (vorgabe === undefined ? null : vorgabe)
        : (parseFloat(inp.value) || 0);
      setzeModul(+inp.dataset.idx, +inp.dataset.mod, inp.dataset.mk, wert);
    });
  });
  container.querySelectorAll('[data-mod-weg]').forEach((b) => {
    b.addEventListener('click', () => {
      const l = liste(); const idx = +b.dataset.idx;
      l[idx] = { ...l[idx],
                 module: (l[idx].module ?? []).filter((_, k) => k !== +b.dataset.modWeg) };
      onAnbau(l);
    });
  });
  container.querySelectorAll('[data-mod-neu]').forEach((b) => {
    b.addEventListener('click', () => {
      const l = liste(); const idx = +b.dataset.modNeu;
      const vorhanden = l[idx].module ?? [];
      // Neues Modul auf der Höhe des letzten – meist wird dort angebaut.
      const z = vorhanden.length ? (vorhanden[vorhanden.length - 1].z ?? 0) : -1.5;
      l[idx] = { ...l[idx], module: [...vorhanden,
        { bauteil: flBauteile('aufbau')[0]?.id, anzahl: 1, laenge: null,
          winkel: null, y: 0, z }] };
      onAnbau(l);
    });
  });

  // --- Freie Lastblöcke -----------------------------------------------------
  container.querySelectorAll('.lb').forEach((inp) => {
    const ev = inp.tagName === 'SELECT' ? 'change' : 'input';
    inp.addEventListener(ev, () => {
      const l = liste();
      const idx = +inp.dataset.idx, k = +inp.dataset.last;
      if (!l[idx]) return;
      const bloecke = (l[idx].lasten ?? []).map((x) => ({ ...x }));
      if (!bloecke[k]) return;
      bloecke[k] = { ...bloecke[k], [inp.dataset.lk]:
        inp.type === 'number' ? (parseFloat(inp.value) || 0) : inp.value };
      l[idx] = { ...l[idx], lasten: bloecke };
      onAnbau(l);
    });
  });
  container.querySelectorAll('[data-last-weg]').forEach((b) => {
    b.addEventListener('click', () => {
      const l = liste(); const idx = +b.dataset.idx;
      l[idx] = { ...l[idx],
                 lasten: (l[idx].lasten ?? []).filter((_, k) => k !== +b.dataset.lastWeg) };
      onAnbau(l);
    });
  });
  container.querySelectorAll('[data-last-neu]').forEach((b) => {
    b.addEventListener('click', () => {
      const l = liste(); const idx = +b.dataset.lastNeu;
      const vorhanden = l[idx].lasten ?? [];
      const letzter = vorhanden[vorhanden.length - 1];
      l[idx] = { ...l[idx], lasten: [...vorhanden, neuerLastblock('G',
        { y: letzter?.y ?? 0, z: letzter?.z ?? 0 })] };
      onAnbau(l);
    });
  });

  // Fokus in einem Feld lässt das zugehörige Mass in der Skizze aufleuchten.
  // Das ist der ganze Zweck der Skizze: sehen, welche Zahl man gerade schreibt.
  container.querySelectorAll('.at-karte .at[data-k]').forEach((inp) => {
    const karte = inp.closest('.at-karte');
    const setze = (an) => {
      karte.querySelectorAll('[data-zu]').forEach((g) =>
        g.classList.toggle('hell', an && g.dataset.zu === inp.dataset.k));
      inp.closest('.at-feld')?.classList.toggle('hervor', an);
    };
    inp.addEventListener('focus', () => setze(true));
    inp.addEventListener('mouseenter', () => setze(true));
    inp.addEventListener('blur', () => setze(false));
    inp.addEventListener('mouseleave', () => {
      if (document.activeElement !== inp) setze(false);
    });
  });
}

// --- Auswertung -------------------------------------------------------------

/**
 * Übersicht: Urteil, Kennzahlen und die Liste der höchstbeanspruchten Stellen.
 * Ein Klick auf eine Zeile zoomt im 3D-Modell auf diese Stelle.
 */
/**
 * DIE KONSTRUKTIONSPRÜFUNGEN, sichtbar.
 *
 * Das Urteil sagte «1 Prüfung(en) verletzt» und liess den Benutzer damit
 * stehen: welche es war, stand nur in der Excel-Ausleitung. Seit der
 * Gurtanschluss am Mast als eigener Nachweis geführt wird (Prüfung A1), ist
 * das eine Zahl, die man sehen und einordnen können muss.
 *
 * Verletzte stehen oben - wer hierher kommt, sucht sie.
 */
function pruefungenHtml(urteil) {
  const alle = urteil?.checks ?? [];
  if (!alle.length) return '';
  const geordnet = [...alle].sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? 1 : -1));
  const zeile = (c) => `
    <tr class="${c.ok ? '' : (c.warnungNichtFehler ? 'warnton' : 'nok')}">
      <td>${esc(c.id)}</td>
      <td>${esc(c.text)}${c.status
        ? `<br><span class="ablage-meta">${esc(c.status)}</span>` : ''}</td>
      <td class="num">${f2(c.vorhanden)}</td>
      <td class="num">${esc(c.richtung ?? '')} ${f2(c.erforderlich)}</td>
      <td class="num">${esc(c.einheit ?? '')}</td>
      <td class="num">${c.ok ? '✓' : (c.warnungNichtFehler ? '!' : '✗')}</td>
    </tr>`;
  const offen = urteil.verletzt?.length ?? 0;
  return klapp('uebersicht-pruefungen', 'Konstruktionsprüfungen', `
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>#</th><th>Prüfung</th><th class="num">vorhanden</th>
        <th class="num">verlangt</th><th class="num">Einheit</th>
        <th class="num"></th></tr></thead>
      <tbody>${geordnet.map(zeile).join('')}</tbody></table></div>`,
    offen ? `${offen} verletzt` : `${alle.length} erfüllt`, offen > 0);
}

/** Rückruf für die Sortimentssuche; app.js setzt ihn beim Start. */
let beiSortiment = null;
export function setzeSortimentSuche(fn) { beiSortiment = fn; }

export function zeichneUebersicht(node, erg, urteil, beiSprung, aktiveStation, hinweise = []) {
  const m = erg.modell, x = erg.extrem;
  const e = erg.max.etaGesamt;
  const zustand = e > 1 || !urteil.alleOk ? 'nok' : 'ok';

  // Jede Kachel kennt die Stelle, an der ihr Wert auftritt - ein Klick fährt
  // das Modell dorthin.
  const bei = (k) => ({ x: k.x, station: k.i });
  const kz = [
    kachel('η Obergurt', f3(erg.max.etaOG.og.eta), m.profOG.name,
           ampel(erg.max.etaOG.og.eta), bei(erg.max.etaOG)),
    kachel('η Untergurt', f3(erg.max.etaUG.ug.eta), m.profUG.name,
           ampel(erg.max.etaUG.ug.eta), bei(erg.max.etaUG)),
    kachel('η Bindeblech', f3(erg.max.etaB.etaB), 'massgebende Ebene',
           ampel(erg.max.etaB.etaB), bei(erg.max.etaB)),
  ];
  // Schnittgrössen sind kein Nachweis - sie stehen in einem eigenen Block.
  // h/b und f_y/γ_M0 sind Eingaben und stehen in der Fussleiste bzw. bei den
  // Profilen; als «Kennzahl» hatten sie hier nichts verloren.
  const sg = [
    kachel('max M_y', f2(x.MyMax), `kNm · x=${f2(x.xMyMax)}`, '', { x: x.xMyMax }),
    kachel('max V_z', f2(x.VzMax), `kN · x=${f2(x.xVzMax)}`, '', { x: x.xVzMax }),
    kachel('max M_z', f2(x.MzMax), `kNm · x=${f2(x.xMzMax)}`, '', { x: x.xMzMax }),
    kachel('max V_y', f2(x.VyMax), `kN · x=${f2(x.xVyMax)}`, '', { x: x.xVyMax }),
    kachel('max T_x', f3(x.TxMax), `kNm · x=${f2(x.xTxMax)}`, '', { x: x.xTxMax }),
    // Die Normalkraft in Jochachse (Leiterzug, Wind in x) wird im Nachweis
    // längst mitgerechnet - flächenproportional als N_ax in jedem Winkel -,
    // stand hier aber nicht. Ohne sie fehlte der Schnittgrössenliste eine
    // der sechs Grössen, und man konnte nicht sehen, ob sie null ist.
    kachel('max N_x', f2(x.NxMax), `kN · x=${f2(x.xNxMax)}`, '', { x: x.xNxMax }),
    kachel('M_A', f2(m.MA), `kNm · κ=${f3(m.kappaA)}`, '', { x: 0, station: 0 }),
    kachel('R_A', f2(m.RA), 'kN', '', { x: 0, station: 0 }),
  ];

  const stellen = erg.knoten
    .map((k) => ({
      i: k.i, x: k.x, eta: k.eta,
      teil: k.etaEcken >= k.etaBleche
        ? k.massgebendeEcke.label : (k.massgebendeEbene.label ?? '–'),
      etaEcken: k.etaEcken, etaBleche: k.etaBleche,
    }))
    .sort((a, b) => b.eta - a.eta).slice(0, 12);

  node.innerHTML = `
    <div class="urteil ${zustand}">
      <span class="urteil-zahl">η ${f3(e)}</span>
      <span>${e <= 1 ? 'Tragsicherheit erfüllt' : 'Tragsicherheit NICHT erfüllt'}${
        urteil.alleOk ? '' : ` · ${urteil.anzahlVerletzt} Prüfung(en) verletzt`}</span>
      ${e > 1 && beiSortiment ? `<button class="btn btn-mini" data-sortiment
         type="button" title="Alle Typen des Sortiments mit dieser Geometrie und
diesen Lasten durchrechnen. Der Typ wird dabei NICHT gewechselt."
         >Sortiment durchrechnen</button>` : ''}
    </div>
    ${hinweise.length ? klapp('uebersicht-hinweise', 'Hinweise zur Gültigkeit',
        `<div class="hinweisliste">${hinweise.map((h) =>
          `<p class="notiz">${esc(h)}</p>`).join('')}</div>`,
        hinweise.length === 1 ? '1 Hinweis' : `${hinweise.length} Hinweise`) : ''}
    ${pruefungenHtml(urteil)}
    ${abschnitt('Nachweise')}
    <div class="kennzahlen">${kz.join('')}</div>
    ${klapp('uebersicht-schnittgroessen', 'Schnittgrössen',
            `<div class="kennzahlen">${sg.join('')}</div>`,
            `max M_y ${f2(x.MyMax)} kNm`)}
    ${abschnitt('Höchstbeanspruchte Stellen', 'anklicken zum Heranzoomen')}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>#</th><th class="num">x [m]</th><th>massgebend</th>
        <th class="num">η Profil</th><th class="num">η Blech</th><th class="num">η</th></tr></thead>
      <tbody>${stellen.map((s) => `
        <tr class="klick${s.i === aktiveStation ? ' aktiv' : ''}" data-station="${s.i}" data-x="${s.x}">
          <td>${s.i}</td><td class="num">${f2(s.x)}</td><td>${esc(s.teil)}</td>
          <td class="num">${f3(s.etaEcken)}</td><td class="num">${f3(s.etaBleche)}</td>
          <td class="num stark ${ampel(s.eta)}">${f3(s.eta)}</td>
        </tr>`).join('')}</tbody>
    </table></div>
`;

  node.querySelectorAll('[data-station]').forEach((tr) => {
    tr.addEventListener('click', () =>
      beiSprung(+tr.dataset.station, parseFloat(tr.dataset.x)));
  });
  // Kennzahlkacheln: Klick fährt das Modell an die Stelle des Wertes
  node.querySelectorAll('[data-kz-x]').forEach((k) => {
    k.addEventListener('click', () => {
      const xk = parseFloat(k.dataset.kzX);
      const st = k.dataset.kzStation === '' ? null : +k.dataset.kzStation;
      beiSprung(st, xk);
    });
  });
  const so = node.querySelector('[data-sortiment]');
  if (so && beiSortiment) so.addEventListener('click', () => beiSortiment());
  verdrahteKlapp(node);
}

/**
 * Woraus sich die Querkraft einer Blechebene zusammensetzt.
 * Der örtliche Anteil aus der Lasteinleitung der Anbauteile steht nur da,
 * wo er auftritt - sonst wäre die Kachel voller Nullen.
 */
function ebenenAnteile(e) {
  const t = [`${f2(e.anteilBalken)} Balken`, `${f2(e.anteilTorsion)} Torsion`];
  if (e.anteilLokal > 0) t.push(`${f2(e.anteilLokal)} Anbauteil`);
  return t.join(' + ') + ' kN';
}

/** Schnittauswertung: je Eckwinkel und je Blechebene. */
export function zeichneSchnitt(node, erg, beiSchnitt, beiOrientierung, beiAktiv) {
  const sn = erg.schnitt, m = erg.modell, q = sn.q;
  const orient = m.schnittOrientierung ?? 'quer';
  const aktiv = m.schnittAktiv === true;
  const oBeschr = SCHNITT_ORIENTIERUNGEN.find((o) => o.key === orient)?.beschreibung ?? '';

  const zeileEcke = (e) => `
    <tr class="${e.eta > 1 ? 'nok' : ''}">
      <td>${esc(e.label)}<br><span class="ablage-meta">${esc(e.profil)}</span></td>
      <td class="num">${f2(e.N_My)}</td><td class="num">${f2(e.N_Mz)}</td>
      <td class="num stark">${f2(e.N)} <span class="ablage-meta">${esc(e.art)}</span></td>
      <td class="num">${f1(e.sig_N)}</td><td class="num">${f1(e.sig_My)}</td>
      <td class="num">${f1(e.sig_Mz)}</td><td class="num stark">${f1(e.sig_v)}</td>
      <td class="num ${ampel(e.eta)}">${f3(e.eta)}</td>
    </tr>`;

  const zeileEbene = (e, seite) => e.blechFehlt ? `
    <tr><td>${esc(seite)}</td><td>${esc(e.label)}</td>
      <td colspan="8" class="ablage-meta">kein Blech (Gabel am Jochende)</td></tr>` : `
    <tr class="${e.eta > 1 ? 'nok' : ''}">
      <td class="ablage-meta">${esc(seite)}</td>
      <td>${esc(e.label)}<br><span class="ablage-meta">Pos ${esc(e.pos)}</span></td>
      <td class="num">${f0(e.breite)}×${f0(e.dicke)}${e.laenge ? '×' + f0(e.laenge) : ''}</td>
      <td class="num">${f2(e.V_Ebene)}</td>
      <td class="num">${f3(e.M_Knoten)}</td><td class="num stark">${f3(e.M)}</td>
      <td class="num">${f2(e.V)}</td><td class="num">${f1(e.sig)}</td>
      <td class="num">${f1(e.tau)}</td><td class="num stark">${f1(e.sig_v)}</td>
      <td class="num ${ampel(e.eta)}">${f3(e.eta)}</td>
    </tr>`;

  /*
   * DER STEUERBLOCK BLEIBT STEHEN.
   *
   * Jede Bedienung hier rechnet neu, und das Rechnen zeichnet dieses Blatt
   * neu - der Knoten, den man gerade bedient, wurde dabei unter der Hand
   * ersetzt. An der Auswahlliste sah man das im Edge als Aufblinken; am
   * Schieber riss es den Zug ab, sobald die erste Rechnung durch war.
   *
   * Deshalb zwei Teile: oben die Bedienung, die stehen bleibt, unten die
   * Zahlen, die sich bei jeder Rechnung erneuern. Neu gebaut wird die
   * Bedienung nur, wenn sich ihre STRUKTUR ändert - die Zahl der Felder
   * (Schieberende) oder die Liste der Orientierungen. Dieselbe Regel wie bei
   * der Eingabemaske (maskenSignatur) und beim Lastfall-Wähler.
   */
  const erklaerungHtml = () => `
      <p class="notiz" style="margin-top:0">${esc(oBeschr)}</p>
      <p class="notiz">Der Schnitt liegt immer <b>mittig zwischen zwei Bindeblechen</b>
        (hier ${f2(sn.feldVon)} … ${f2(sn.feldBis)} m). Nur dort schneidet man die Gurte
        im Feld und nicht durch einen Rahmenknoten – erst so lassen sich die
        Schnittkräfte je Gurt eindeutig angeben. Massgebendes Blech an der Station
        x = ${f2(sn.stationX)} m · Bleche
        ${m.blechQuelle === 'datenbank' ? 'aus Typendatenbank' : 'manuell'}.</p>`;

  const steuerHtml = `
    ${abschnitt('Lage des Schnitts',
      `<span id="schnitt-feldmeta">Feld ${sn.feld + 1} von ${sn.anzahlSchnitte}</span>`)}
    <label class="schalter schnitt-an"><input type="checkbox" id="schnitt-aktiv"
      ${aktiv ? 'checked' : ''}><span>Schnitt im Modell zeigen</span></label>
    <div class="schnitt-steuer">
      <button class="btn btn-mini" data-schnitt="-1" title="ein Feld nach links">◀</button>
      <input type="range" id="schnitt-schieber" min="0" max="${sn.anzahlSchnitte - 1}"
             step="1" value="${sn.feld}">
      <button class="btn btn-mini" data-schnitt="+1" title="ein Feld nach rechts">▶</button>
      <span class="viewer-marke" id="schnitt-x">x = ${f2(sn.x)} m</span>
    </div>
    <div class="feld"><label for="schnitt-orient">Orientierung im Modell</label>
      <select id="schnitt-orient">${SCHNITT_ORIENTIERUNGEN.map((o) =>
        `<option value="${esc(o.key)}"${o.key === orient ? ' selected' : ''}
          >${esc(o.label)}</option>`).join('')}</select></div>
    ${klapp('schnitt-erklaerung', 'Warum hier geschnitten wird',
      `<div id="schnitt-erklaerung-text">${erklaerungHtml()}</div>`)}`;

  const zahlenHtml = `
    <div class="kennzahlen">
      ${kachel('M_y,ed', f2(sn.My), 'kNm')}
      ${kachel('V_z,ed', f2(sn.Vz), 'kN')}
      ${kachel('M_z,ed', f2(sn.Mz), 'kNm')}
      ${kachel('V_y,ed', f2(sn.Vy), 'kN')}
      ${kachel('T_x,ed', f3(sn.Tx), 'kNm')}
      ${kachel('N_x,ed', f2(sn.Nx), 'kN · ganzer Querschnitt')}
      ${kachel('q_T', f2(q.schubfluss.qT), 'kN/m')}
      ${kachel('V Vertikalebene', f2(q.vertikal.max), ebenenAnteile(q.vertikal))}
      ${kachel('V Horizontalebene', f2(q.horizontal.max), ebenenAnteile(q.horizontal))}
    </div>

    ${klapp('schnitt-ecken', 'Eckwinkel', `
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Profil</th><th class="num">N(M_y)</th><th class="num">N(M_z)</th>
        <th class="num">N</th><th class="num">σ_N</th><th class="num">σ_My</th>
        <th class="num">σ_Mz</th><th class="num">σ_v</th><th class="num">η</th></tr></thead>
      <tbody>${sn.ecken.map(zeileEcke).join('')}</tbody></table></div>
    <p class="notiz">Die Spalte <b>N</b> ist die Summe aus N(M_y), N(M_z) und dem
      Anteil der Jochnormalkraft N_x,ed = ${f2(sn.Nx)} kN, der nach Winkelfläche
      aufgeteilt wird (bei vier gleichen Winkeln also ${f2(sn.Nx / 4)} kN je Winkel).</p>
    <p class="notiz">M_y,L,lokal = ${f3(sn.My_lokal)} kNm ·
      M_z,L,lokal = ${f3(sn.Mz_lokal)} kNm (in allen Winkeln gleich)<br>
      Am Knoten wären es ${f3(sn.My_Knoten)} bzw. ${f3(sn.Mz_Knoten)} kNm.
      Über die Blechbreite ist die Verbindung biegesteif; nachgewiesen wird der
      Gurt am <b>Anschnitt</b> des Blechs, also mit
      (a₁ − b_Bl)/a₁ = ${f3(sn.anschnittMy)} bzw. ${f3(sn.anschnittMz)}.</p>`,
      `max η ${f3(Math.max(...sn.ecken.map((e) => e.eta)))}`, true)}

    ${klapp('schnitt-bleche', 'Bindebleche', `
    <p class="notiz" style="margin-top:0">Beide Nachbarbleche des Feldes.</p>
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Blech</th><th>Ebene</th><th class="num">b×t×L</th>
        <th class="num">V_Eb</th><th class="num">M_Kn</th><th class="num">M_Rd</th>
        <th class="num">V_Bl</th><th class="num">σ</th>
        <th class="num">τ</th><th class="num">σ_v</th><th class="num">η</th></tr></thead>
      <tbody>
        ${(sn.nachbarn?.links?.ebenen ?? sn.ebenen).map((e) =>
            zeileEbene(e, `x=${f2(sn.nachbarn?.links?.stationX ?? sn.stationX)}`)).join('')}
        ${(sn.nachbarn?.rechts?.ebenen ?? []).map((e) =>
            zeileEbene(e, `x=${f2(sn.nachbarn?.rechts?.stationX ?? 0)}`)).join('')}
      </tbody></table></div>
    <p class="notiz">
      <b>M_Kn</b> ist das Moment auf der Schwerachse, <b>M_Rd</b> das massgebende
      am <b>Anschnitt des Gurtes</b>. Im Überlappungsbereich ist das Blech mit dem
      Gurt verschweisst und wirkt biegesteif; nachgewiesen wird deshalb erst am
      Rand dieses Bereichs. Bei der lichten Blechlänge
      ${f0((sn.nachbarn?.links?.ebenen ?? sn.ebenen).find((e) => !e.blechFehlt)?.lichteLaenge * 1000)} mm
      gegenüber dem Hebelarm
      ${f0((sn.nachbarn?.links?.ebenen ?? sn.ebenen).find((e) => !e.blechFehlt)?.hebelarm * 1000)} mm
      ergibt das eine Abminderung auf
      ${f2(((sn.nachbarn?.links?.ebenen ?? sn.ebenen).find((e) => !e.blechFehlt)?.abminderung ?? 1) * 100)} %.
      Die Querkraft V_Bl bleibt davon unberührt.</p>`,
      `max η ${f3(Math.max(...(sn.nachbarn?.links?.ebenen ?? sn.ebenen)
        .filter((e) => !e.blechFehlt).map((e) => e.eta)))}`, true)}`;

  const sig = JSON.stringify([sn.anzahlSchnitte,
                              SCHNITT_ORIENTIERUNGEN.map((o) => o.key)]);
  let st = node.querySelector('#schnitt-steuerung');

  if (!st || st.dataset.sig !== sig) {
    node.innerHTML =
      `<div id="schnitt-steuerung">${steuerHtml}</div>
       <div id="schnitt-zahlen">${zahlenHtml}</div>`;
    st = node.querySelector('#schnitt-steuerung');
    st.dataset.sig = sig;

    // Verdrahtet wird nur beim Aufbau - die Knoten bleiben ja jetzt stehen.
    const s = st.querySelector('#schnitt-schieber');
    if (s && beiSchnitt) {
      s.addEventListener('input', () => beiSchnitt(+s.value));
      st.querySelectorAll('[data-schnitt]').forEach((b) => {
        b.addEventListener('click', () =>
          beiSchnitt(Math.max(0, Math.min(+s.max, +s.value + (+b.dataset.schnitt)))));
      });
    }
    const o = st.querySelector('#schnitt-orient');
    if (o && beiOrientierung) o.addEventListener('change', () => beiOrientierung(o.value));
    const a = st.querySelector('#schnitt-aktiv');
    if (a && beiAktiv) a.addEventListener('change', () => beiAktiv(a.checked));
  } else {
    node.querySelector('#schnitt-zahlen').innerHTML = zahlenHtml;

    // Nachziehen, was sich an der stehenden Bedienung geändert hat. Nur bei
    // Abweichung: einem Feld seinen eigenen Wert zurückzuschreiben setzt in
    // manchen Browsern den Textcursor an den Anfang.
    const setze = (wahl, feld, wert) => {
      const e = st.querySelector(wahl);
      if (e && e[feld] !== wert) e[feld] = wert;
    };
    setze('#schnitt-feldmeta', 'textContent',
          `Feld ${sn.feld + 1} von ${sn.anzahlSchnitte}`);
    setze('#schnitt-aktiv', 'checked', aktiv);
    setze('#schnitt-schieber', 'value', String(sn.feld));
    setze('#schnitt-x', 'textContent', `x = ${f2(sn.x)} m`);
    setze('#schnitt-orient', 'value', orient);
    const erk = st.querySelector('#schnitt-erklaerung-text');
    if (erk) erk.innerHTML = erklaerungHtml();
  }

  verdrahteKlapp(node);
}

/**
 * Kompakte Querschnittsklassen-Marke für die Profil-Sidebar.
 * Die ausführliche Herleitung öffnet sich per Knopf im Überlagerungsfenster.
 */
export function qskMarke(kl) {
  const stufe = (k) => (k <= 2 ? 'ok' : k === 3 ? 'warn' : 'fail');
  return `<div class="qsk">
    <span class="qsk-t">QSK</span>
    ${kl.teile.map((t) => `<span class="pl pl-${stufe(t.klasse)}"
        title="${esc(t.rolle)} ${esc(t.bauteil)} – massgebend ${esc(t.massgebend ?? '')}">
        ${esc(t.rolle.slice(0, 2))} ${t.klasse}</span>`).join('')}
    <button class="btn btn-mini" data-qsk type="button">Berechnung</button>
  </div>`;
}

/** Ausführliche Klassifizierung, für das Überlagerungsfenster. */
export function klassenTabelle(kl) {
  const stufe = (k) => (k <= 2 ? 'ok' : k === 3 ? 'warn' : 'fail');
  const g = kl.teile[0].grenzen;
  return `
    <p class="notiz">ε = ${f3(kl.eps)} · Grenzen auskragender Teile:
      Klasse 1 ≤ ${f2(g.k1)} · Klasse 2 ≤ ${f2(g.k2)} · Klasse 3 ≤ ${f2(g.k3)}.
      Für Winkel unter Druck gilt zusätzlich h/t ≤ 15·ε und (b+h)/(2t) ≤ 11.5·ε;
      massgebend ist die ungünstigere Betrachtung.</p>
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Bauteil</th><th>Kriterium</th><th class="num">c/t</th>
        <th class="num">Grenze</th><th class="num">Klasse</th><th class="num">total</th></tr></thead>
      <tbody>${kl.teile.map((t) => `
        <tr>
          <td>${esc(t.rolle)}<br><span class="ablage-meta">${esc(t.bauteil)}</span></td>
          <td>${t.kriterien.map((k) => esc(k.id)).join('<br>')}</td>
          <td class="num">${t.kriterien.map((k) => f2(k.ct)).join('<br>')}</td>
          <td class="num">${t.kriterien.map((k) => f2(k.grenze)).join('<br>')}</td>
          <td class="num">${t.kriterien.map((k) => plakette('K' + k.klasse, stufe(k.klasse))).join('<br>')}</td>
          <td class="num">${plakette('Klasse ' + t.klasse, stufe(t.klasse))}</td>
        </tr>`).join('')}</tbody></table></div>
    <div class="infobox">${esc(kl.hinweis)}</div>`;
}

/**
 * Ein Diagramm mit Knopf zum Vergrössern.
 *
 * Vergrössert wird nicht in ein Modalfenster, sondern in das MODELLFENSTER:
 * dort ist die breiteste Fläche, sie lässt sich am Splitter weiter aufziehen,
 * Eingabe und Tabellen bleiben daneben sichtbar - und die Kurve bleibt live,
 * zieht also beim Ändern einer Eingabe mit. Ein Modal deckt genau das zu, was
 * man beim Lesen einer Kurve danebenhaben will.
 */
/**
 * Ein Diagrammblock.
 *
 * DAS GANZE BILD IST DER KNOPF. Ein Klick irgendwo ins Diagramm holt es ins
 * Modellfenster - das ist die Bewegung, die man ohnehin machen will, und sie
 * braucht kein Zielen auf ein Symbol von zwölf Pixeln. Der Knopf oben rechts
 * bleibt trotzdem stehen: er sagt, DASS das geht.
 *
 * Darunter hängt ein leerer Platz für das Kraftbild einer Kurve - siehe
 * render.skizzen.js. Er füllt sich erst auf Klick in die Legende.
 */
function diagrammBlock(id, titel, svg) {
  return abschnitt(titel,
    `<button class="btn btn-mini" data-gross="${esc(id)}"
      title="Im Modellfenster gross zeigen">${icon('aufziehen', 15)}</button>`) +
    `<div class="dia" data-dia="${esc(id)}" title="anklicken: gross im Modellfenster">${svg}</div>
     <div class="dia-skizze" data-skizze-fuer="${esc(id)}" hidden></div>`;
}

/** Knöpfe zum Vergrössern verdrahten. */
let beiDiagrammGross = null;
export function setzeDiagrammBuehne(fn) { beiDiagrammGross = fn; }

/** Das zuletzt geöffnete Kraftbild je Diagramm - überlebt das Neuzeichnen. */
const SKIZZE_OFFEN = new Map();

function zeigeSkizze(node, id, key) {
  const ziel = node.querySelector(`[data-skizze-fuer="${CSS.escape(id)}"]`);
  if (!ziel) return;
  const s = key ? skizzeFuer(key) : null;
  if (!s) { ziel.hidden = true; ziel.innerHTML = ''; SKIZZE_OFFEN.delete(id); return; }
  SKIZZE_OFFEN.set(id, key);
  ziel.hidden = false;
  ziel.innerHTML = `${s.svg}<div class="dia-skizze-t">${esc(s.text)}</div>`
    + '<button class="btn btn-mini dia-skizze-zu" type="button">schliessen</button>';
  ziel.querySelector('.dia-skizze-zu').onclick = () => zeigeSkizze(node, id, null);
}

function verdrahteDiagramme(node) {
  node.querySelectorAll('[data-gross]').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); beiDiagrammGross?.(b.dataset.gross); };
  });
  node.querySelectorAll('.dia[data-dia]').forEach((d) => {
    const id = d.dataset.dia;
    d.onclick = (e) => {
      // Ein Klick auf einen Legendeneintrag zeigt das Kraftbild, jeder andere
      // holt das Diagramm ins Modellfenster.
      const eintrag = e.target.closest('.legende-eintrag');
      if (eintrag) {
        const key = eintrag.dataset.skizze;
        zeigeSkizze(node, id, SKIZZE_OFFEN.get(id) === key ? null : key);
        return;
      }
      beiDiagrammGross?.(id);
    };
    if (SKIZZE_OFFEN.has(id)) zeigeSkizze(node, id, SKIZZE_OFFEN.get(id));
  });
}

/** Verläufe: Diagramme und der Massvarianten-Vergleich. */
export function zeichneVerlauf(node, dia, vergleich) {
  node.innerHTML = `
    ${diagrammBlock('schnittgroessen', 'Schnittgrössen', dia.schnittgroessen)}
    ${diagrammBlock('ebene', 'Ebenenquerkräfte', dia.ebene)}
    ${diagrammBlock('ausnutzung', 'Ausnutzung', dia.ausnutzung)}
    ${klapp('verlauf-massvarianten', 'Einfluss der Hebelarm-Definition', `
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Variante</th><th class="num">h</th><th class="num">b</th>
        <th class="num">η OG</th><th class="num">η UG</th><th class="num">η Blech</th>
        <th class="num">η max</th><th class="num">Δ</th></tr></thead>
      <tbody>${vergleich.zeilen.map((z) => `
        <tr class="${z.istGewaehlt ? 'aktiv' : ''}">
          <td>${esc(z.kurz)}</td>
          <td class="num">${f0(z.hT * 1000)}</td><td class="num">${f0(z.bT * 1000)}</td>
          <td class="num">${f3(z.etaOG)}</td><td class="num">${f3(z.etaUG)}</td>
          <td class="num">${f3(z.etaB)}</td><td class="num stark">${f3(z.eta)}</td>
          <td class="num">${z.istGewaehlt ? '–'
            : (z.abweichung >= 0 ? '+' : '') + f1(z.abweichung) + '%'}</td>
        </tr>`).join('')}</tbody></table></div>
    <ul class="hinweis" style="padding-left:16px">${MASSVARIANTEN.map((v) =>
      `<li><b>${esc(v.kurz)}</b> — ${esc(v.beschreibung)}</li>`).join('')}</ul>`,
      `gewählt: ${esc(vergleich.zeilen.find((z) => z.istGewaehlt)?.kurz ?? '')}`)}`;
  verdrahteDiagramme(node);
  verdrahteKlapp(node);
}

/**
 * Reaktionskräfte für den Fundament- und Mastplaner.
 *
 * CHARAKTERISTISCH und nach Einwirkungsgruppen getrennt - ohne Beiwerte, damit
 * der Empfänger nach seinem eigenen Regelwerk kombinieren kann. Aufbau und
 * Vorzeichenregel folgen dem Blatt «Zusammenfassung» des Regelwerks:
 * negative Vertikalkräfte sind abhebend.
 */
export function zeichneAuflager(node, blatt, erg) {
  const m = erg.modell;
  const zeile = (bez, z, seite, stark = false) => `
    <tr class="${stark ? 'aktiv' : ''}">
      <td>${esc(bez)}</td>
      <td class="num${stark ? ' stark' : ''}">${f2(z[seite].Fz)}</td>
      <td class="num${stark ? ' stark' : ''}">${f2(z[seite].Fy)}</td>
      <td class="num">${f2(z[seite].My)}</td>
      <td class="num">${f3(z[seite].Mx)}</td>
    </tr>`;

  const tabelle = (seite, titel) => `
    ${abschnitt(titel)}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Einwirkung</th>
        <th class="num">F_z [kN]</th><th class="num">F_y [kN]</th>
        <th class="num">M_y [kNm]</th><th class="num">M_x [kNm]</th></tr></thead>
      <tbody>
        ${blatt.zeilen.map((z) => zeile(z.label, z, seite)).join('')}
        ${zeile('Summe aller Gruppen', blatt.total, seite, true)}
      </tbody></table></div>
    <p class="notiz" style="margin:4px 0 0">Die Summenzeile addiert ALLE Gruppen,
      auch die beiden Windrichtungen. Das ist keine Lastkombination: Wind x und
      Wind y treten nicht gleichzeitig auf. Massgebend ist je Richtung eine der
      beiden Zeilen.</p>`;

  node.innerHTML = `
    ${abschnitt('Reaktionskräfte', 'charakteristisch, ohne Beiwerte')}
    <div class="kennzahlen">
      ${kachel('F_z Auflager A', f2(blatt.total.A.Fz), 'kN')}
      ${kachel('F_z Auflager B', f2(blatt.total.B.Fz), 'kN')}
      ${kachel('F_y je Auflager', f2(blatt.total.A.Fy), 'kN · quer zur Jochachse')}
      ${kachel('F_x total', f2(blatt.total.Fx), 'kN · in Jochachse')}
    </div>
    ${tabelle('A', 'Auflager A (x = 0)')}
    ${tabelle('B', `Auflager B (x = ${f2(m.L)} m)`)}
    ${klapp('auflager-hinweis', 'Achsen, Vorzeichen und was nicht enthalten ist', `
      <p class="notiz" style="margin-top:0">
        <b>F_z</b> vertikal, positiv nach unten – negative Werte sind
        <b>abhebend</b>. <b>F_y</b> längs zum Gleis, aus Wind auf Joch und
        Anbauteile. <b>M_y</b> Moment quer zum Gleis aus der Einspannung des
        Jochendes. <b>M_x</b> Moment längs zum Gleis, also die Torsion des Jochs.</p>
      <p class="notiz"><b>F_x = ${f2(blatt.total.Fx)} kN</b> wirkt IN der Jochachse
        (Umlenkkraft aus dem Leiterzug und Wind quer zum Gleis). Wie sie sich auf
        die beiden Maste verteilt, hängt von deren Steifigkeit ab – das ist hier
        nicht modelliert, deshalb steht nur die Summe da.</p>
      <p class="notiz">Der Wind ist in zwei Gruppen geführt: <b>Wind x</b> in
        Jochachse und <b>Wind y</b> in Gleisrichtung. Das sind zwei
        WINDRICHTUNGEN, keine gleichzeitigen Einwirkungen – sie sind einzeln
        anzusetzen, und zwar mit beiden Vorzeichen. Die ständigen Anteile
        behalten ihre Wirkrichtung.</p>
      <p class="notiz">Die Werte sind <b>charakteristisch</b>. Die Beiwerte des
        gewählten Normensatzes sind bewusst nicht angewendet, damit die Gruppen
        einzeln kombinierbar bleiben.</p>
      <p class="notiz">Nicht enthalten: Eigengewicht und Windlast der Maste
        selbst, sowie die Gebrauchstauglichkeitsnachweise.</p>`)}`;
  verdrahteKlapp(node);
}

/**
 * Stückliste und Eigengewicht.
 *
 * Das gerechnete Gewicht wird dem Richtwert der Projektierungsgrundlagen
 * (Spalte «Approx. Gewicht» der Sortimentstabelle) gegenübergestellt. Das ist
 * eine PLAUSIBILITÄTSANGABE, kein Nachweis: die Tabelle enthält Anschlüsse,
 * Laschen und Verschraubung, die hier nicht einzeln modelliert sind.
 */
export function stuecklisteHtml(erg) {
  const m = erg.modell;
  const RHO = 7850;   // kg/m3

  const posten = [];
  posten.push({ art: 'Gurtprofil', bez: m.profOG.name, anzahl: 2,
                laenge: m.L, einheit: 'm', kg: 2 * m.profOG.g * m.L });
  posten.push({ art: 'Gurtprofil', bez: m.profUG.name, anzahl: 2,
                laenge: m.L, einheit: 'm', kg: 2 * m.profUG.g * m.L });

  // Bindebleche über alle Stationen zählen, je Ebene zwei Stück
  const zaehler = new Map();
  (m.stationsListe ?? []).forEach((st) => {
    [['vertikal', st.vertikal], ['horizontal', st.horizontal]].forEach(([art, b]) => {
      if (!b) return;
      const k = `${art}|${b.pos}|${b.breite}|${b.dicke}|${b.laenge ?? 0}`;
      zaehler.set(k, (zaehler.get(k) ?? 0) + 2);
    });
  });
  [...zaehler.entries()].forEach(([k, n]) => {
    const [art, pos, breite, dicke, laenge] = k.split('|');
    const kg = laenge > 0
      ? n * (breite * dicke * laenge * 1e-9) * RHO : 0;
    posten.push({
      art: art === 'vertikal' ? 'Vertikalblech' : 'Horizontalblech',
      bez: `Pos ${pos} · ${breite}/${dicke} × ${laenge}`,
      anzahl: n, laenge: +laenge, einheit: 'mm', kg,
    });
  });

  const kgTotal = posten.reduce((a, p) => a + p.kg, 0);
  const kgProM = kgTotal / m.L;
  const richt = m.joch?.gewicht ?? null;
  const abw = richt ? (kgProM / richt - 1) * 100 : null;
  const gutAbw = abw !== null && Math.abs(abw) <= 15;

  return `
    ${abschnitt('Stückliste', `${m.typ ?? 'frei'} · ${m.L.toFixed(2)} m` +
      (m.ausfuehrung ? ` · Ausführung ${m.ausfuehrung.bez}` : '') +
      (m.verlauf?.aktiv ? ` · verjüngte Enden ${m.verlauf.voute.endJd} mm` : ''))}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Bauteil</th><th>Bezeichnung</th><th class="num">Stk</th>
        <th class="num">Masse [kg]</th></tr></thead>
      <tbody>${posten.map((p) => `
        <tr><td>${esc(p.art)}</td><td>${esc(p.bez)}</td>
          <td class="num">${p.anzahl}</td><td class="num">${f1(p.kg)}</td></tr>`).join('')}
      </tbody>
      <tfoot><tr><td colspan="3" class="stark">Total</td>
        <td class="num stark">${f1(kgTotal)}</td></tr></tfoot>
    </table></div>

    ${abschnitt('Eigengewicht', 'Abgleich mit den Projektierungsgrundlagen')}
    <div class="kennzahlen">
      ${kachel('gerechnet', f1(kgProM), 'kg/m')}
      ${richt ? kachel('Tabelle', f1(richt), 'kg/m') : ''}
      ${abw !== null ? kachel('Abweichung', (abw >= 0 ? '+' : '') + f1(abw), '%',
                              gutAbw ? 'ok' : 'warn') : ''}
      ${kachel('Total', f1(kgTotal), 'kg')}
    </div>
    ${klapp('stueckliste-hinweis', 'Zum Abgleich mit der Sortimentstabelle', `
    <div class="infobox" style="margin:0">
      Nur Gurtwinkel und Bindebleche sind erfasst. Der Tabellenwert der
      Sortimentszeichnung enthält zusätzlich Stosslaschen, Anschlusswinkel und
      Verschraubung – eine Unterschreitung von rund 10 bis 20 % ist deshalb zu
      erwarten. <b>Nur Information, kein Nachweis.</b>
      ${m.char?.herkunft?.eigengewicht
        ? `<br>In der Rechnung angesetzt: ${esc(m.char.herkunft.eigengewicht)}.` : ''}
    </div>`)}`;
}

/**
 * Optionen-Dialog: alle Einstellungen, die das Rechenmodell steuern, aber
 * nicht zum Bauteil gehören. Sie stehen bewusst nicht in der Eingabe, damit
 * die Sidebar auf Geometrie, Profile, Anbauteile und Lasten beschränkt bleibt.
 */
export function optionenHtml(werte) {
  return optionenFelder(werte).map((a) =>
    abschnitt(a.titel) + a.felder.map((f) => feldHtml(f, werte[f.key], werte)).join('')
  ).join('');
}

/** Ereignisse des Optionen-Dialogs verdrahten. */
export function verdrahteOptionen(container, werte, onChange) {
  container.querySelectorAll('[data-feld]').forEach((inp) => {
    const key = inp.dataset.feld;
    const feld = FELDER.find((f) => f.key === key);
    const ev = inp.tagName === 'SELECT' || inp.type === 'checkbox' ? 'change' : 'input';
    inp.addEventListener(ev, () => {
      let v;
      if (feld.typ === 'zahl' || feld.typ === 'schieber') {
        v = parseFloat(inp.value); if (!Number.isFinite(v)) return;
      } else if (feld.typ === 'schalter') v = inp.checked;
      else v = inp.value;
      onChange(key, v);
    });
  });
}

/**
 * Lastfallmatrix.
 *
 * Eine Zeile je Lastfall, eine Spalte je Einwirkungsgruppe, darin nur der
 * Beiwert. Welcher Lastfall massgebend ist, sieht man der Matrix nicht an -
 * deshalb steht rechts das gerechnete η.
 *
 * Die beiden charakteristischen Lastfälle sind kein Tragsicherheitsnachweis;
 * ihr η ist zum Vergleich angegeben und grau gesetzt.
 */
export function kombiMatrixHtml(kombi, normensatz) {
  if (!kombi?.lastfaelle?.length) return '';
  const ein = kombi.einwirkungen;
  const satz = normensatz
    ? `Beiwerte nach ${esc(normensatz.label)}`
    : 'Beiwerte von Hand gesetzt';

  const zeile = (k, i) => `
    <tr class="${k.istMassgebend ? 'aktiv' : ''}${k.nachweis ? '' : ' char'}">
      <td>LF${i + 1} · ${esc(k.bez)}
        ${k.istMassgebend ? '<br><b>massgebend</b>' : ''}
        ${k.angepasst ? '<br><span class="ablage-meta">angepasst</span>' : ''}
        ${k.nachweis ? '' : '<br><span class="ablage-meta">charakteristisch</span>'}
        ${k.doppeltZu ? `<br><span class="ablage-meta warnton"
          >gleiche Beiwerte wie ${esc(k.doppeltBez)} – rechnet dasselbe zweimal</span>` : ''}</td>
      ${ein.map((e) => {
        const b = k.beiwerte[e.key] ?? 0;
        return `<td class="beiwert num${b ? '' : ' null'}${b < 0 ? ' minus' : ''}"
          >${f2(b)}</td>`;
      }).join('')}
      <td class="num stark ${k.nachweis ? ampel(k.eta) : ''}">${f3(k.eta)}</td>
      <td class="lf-tasten">
        <button class="btn btn-mini" data-lf="${esc(k.key)}" type="button"
                title="Beiwerte dieses Lastfalls anpassen">${icon('optionen', 12)}</button>
        ${k.eigen || k.angepasst ? `<button class="btn btn-mini btn-fail"
          data-lf-weg="${esc(k.key)}" type="button"
          title="${k.eigen ? 'Lastfall entfernen' : 'Anpassung zurücknehmen'}">×</button>` : ''}
      </td>
    </tr>`;

  return `
    ${abschnitt('Lastfälle', satz)}
    <div class="tabellenrahmen"><table class="dt kombi">
      <thead><tr><th>Lastfall</th>
        ${ein.map((e) => `<th class="num">${esc(e.label)}</th>`).join('')}
        <th class="num">η</th><th></th></tr></thead>
      <tbody>${kombi.lastfaelle.map(zeile).join('')}</tbody>
    </table></div>
    <div class="lf-fuss">
      <button class="btn btn-mini" data-lf-neu type="button">+ Lastfall</button>
      <span class="notiz">Beiwerte je Lastfall über ${icon('optionen', 11)} anpassen;
        die Grundwerte γ und ψ₀ stehen in den <b>Optionen</b>.</span>
    </div>
    ${klapp('lastfall-hinweis', 'Charakteristische Werte und Zuordnung', `
    <div class="notiz" style="margin:0">
      Charakteristische Werte: ${ein.map((e) =>
        `${esc(e.label)} ${e.wert ? f3(e.wert) + ' kN/m' : ''}` +
        `${e.zusatz ? `${e.wert ? ' + ' : ''}${f2(e.zusatz)} kN` : ''}` +
        `${e.wert || e.zusatz ? '' : '–'}`).join(' · ')}.
      <br><b>Wind x</b> ist die Windkraft in Jochachse, <b>Wind y</b> die in
      Gleisrichtung; die Laufmeterlast der Sortimentstabelle wirkt auf das Joch
      und läuft deshalb in Wind y. Beide Richtungen stehen mit <b>+ und −</b> in
      der Liste: welche Seite massgebend wird, hängt davon ab, wohin die
      ständigen Horizontallasten zeigen. Ein <b>negativer</b> Beiwert kehrt die
      Gruppe um; ständige Einwirkungen behalten ihre Wirkrichtung.
      Die veränderlichen Vertikallasten der Anbauteile (Q_z) laufen in der
      Gruppe <b>Schnee</b> mit.
      ${normensatz ? '' : '<b>Die Beiwerte weichen von SIA 260 und RTE ab.</b>'}
    </div>`)}`;
}

/** Formular zum Anpassen oder Anlegen eines Lastfalls. */
export function lastfallFormular(lf, einwirkungen) {
  return `
    <div class="feld"><label for="lf-bez">Bezeichnung</label>
      <input id="lf-bez" type="text" value="${esc(lf.bez ?? '')}"
             ${lf.eigen || !lf.key ? '' : 'disabled'}></div>
    ${einwirkungen.map((e) => `
      <div class="feld"><label for="lf-${esc(e.key)}">Beiwert ${esc(e.label)}</label>
        <div class="zahlfeld">
          <input id="lf-${esc(e.key)}" type="number" step="0.05"
                 value="${lf.beiwerte?.[e.key] ?? 0}">
          <span class="einheit">–</span></div>
        <small class="hinweis">${esc(e.bemerkung ?? '')}${
          e.art === 'veraenderlich'
            ? ' Ein negativer Wert dreht die Richtung um.'
            : ' Ständig: feste Wirkrichtung, nicht umkehren.'}</small></div>`).join('')}
    <label class="schalter"><input id="lf-nachweis" type="checkbox"
      ${lf.nachweis === false ? '' : 'checked'}>
      <span>Tragsicherheitsnachweis (geht in Umhüllende und η ein)</span></label>
    <p class="notiz">Ohne Haken gilt der Lastfall als charakteristische
      Betrachtung: er wird gerechnet und angezeigt, bleibt aber aus der
      Umhüllenden und aus der Wahl des massgebenden Lastfalls heraus.</p>`;
}

export function zeichneFehler(node, fehler) {
  node.innerHTML = `<div class="fehlerbox"><strong>Berechnung nicht möglich</strong>
    <p>${esc(fehler.message)}</p></div>`;
}

/** Pflegezustand der Typendatenbank für die Fussleiste. */
export function datenbankText(stand, fehler) {
  if (fehler.length) return `Datenbank: ${fehler.length} Beanstandung(en)`;
  const t = [];
  if (stand.ohneBleche.length) t.push(`ohne Bleche: ${stand.ohneBleche.join(',')}`);
  if (stand.staffelungUngeprueft.length) t.push('Staffelung ungeprüft');
  // Zeilen der Mass-Tabelle, die in der Zeichnung nicht aufgehen
  if (stand.masstabelleUnschluessig?.length) {
    t.push(`Mass-Tabelle unschlüssig bei ${stand.masstabelleUnschluessig.join(', ')} m`);
  }
  return `DB ${stand.version} · ${stand.typen} Typen · ` +
         `${stand.masstabelle} Tabellenlängen${t.length ? ' · ' + t.join(' · ') : ''}`;
}

export { f0, f1, f2, f3, icon, esc };
