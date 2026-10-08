/**
 * export.bestand.js
 * ---------------------------------------------------------------------------
 * DAS BLATT «BESTANDESSCHUTZ» (8. Oktober).
 *
 * Weisung im Wortlaut: «Führe noch ein Auswertung für den Bestandesschutz als
 * Output, so wie bei den Auflagerreaktionen, markiere die neuen Bauteile Rot
 * in der Übersicht und gib eine Auswahl welche Ausnutzungen man plotten will
 * (Gesamt / Joch / Mast / Fundamente)».
 *
 * Das Blatt RECHNET NICHT: es schreibt den Vergleich aus `core.bestand.js`
 * (`bestandVergleich`, je Bauteil η im Bestand und mit den neuen Teilen) auf
 * ein Blatt A4 quer - Übersicht aus dem Stabmodell mit den neuen Teilen in
 * Rot, je gewählter Gruppe ein Balkenbild und die Tabelle dazu.
 *
 * Meine Lesart der Auswahl: «Gesamt» ist die Zusammenfassung (je Gruppe das
 * massgebende Bauteil, also wer seine zulässige Zunahme am meisten
 * ausschöpft); «Joch», «Mast» und «Fundamente» zeigen jedes Bauteil der
 * Gruppe. Knicken und Anker stehen beim Masten, die Aufhängung des
 * Tragauslegers beim Joch.
 * ---------------------------------------------------------------------------
 */

import { skizzeSvg } from './export.reaktionen.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f3 = (v) => (Number.isFinite(v) ? v.toFixed(3).replace('-', '−') : '–');
const vz = (v) => (Number.isFinite(v) ? `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(3)}` : '–');

/** Die wählbaren Gruppen, in der Reihenfolge des Blattes. */
export const BESTAND_GRUPPEN = [
  { key: 'gesamt', label: 'Gesamt', titel: 'Gesamt - je Gruppe das massgebende Bauteil' },
  { key: 'joch', label: 'Joch', titel: 'Joch' },
  { key: 'mast', label: 'Mast', titel: 'Masten (Querschnitt, Knicken, Anker)' },
  { key: 'fundament', label: 'Fundamente', titel: 'Fundamente' },
];

/** Die Zeilen einer Gruppe; «gesamt» nimmt je Gruppe die massgebende. */
export function bestandZeilenFuer(b, gruppe) {
  const zeilen = b?.zeilen ?? [];
  if (gruppe !== 'gesamt') return zeilen.filter((z) => z.gruppe === gruppe);
  // Die Zeilen sind schon nach Ausschöpfung der Grenze geordnet (massgebend zuerst).
  return ['joch', 'mast', 'fundament'].map((g) => {
    const z = zeilen.find((x) => x.gruppe === g);
    const t = BESTAND_GRUPPEN.find((x) => x.key === g).label;
    return z ? { ...z, name: `${t}: ${z.name}` } : null;
  }).filter(Boolean);
}

/*
 * Das Balkenbild: je Bauteil zwei waagrechte Balken - grau der Bestand,
 * darunter mit den neuen Teilen (rot, wenn die zulässige Zunahme
 * überschritten ist). Die Achse läuft durch die Null und mindestens bis
 * 1.00; die Grenzausnutzung steht als Linie da.
 */
export function bestandBalkenSvg(zeilen, { breite = 520 } = {}) {
  if (!zeilen?.length) return '';
  // Die Zahlen stehen in einer festen Spalte rechts - neben dem Balken lagen sie auf der Grenzlinie.
  const links = 150, rechts = 104, oben = 16, zeile = 30;
  const hoehe = oben + zeilen.length * zeile + 20;
  const max = Math.max(1.05, ...zeilen.map((z) => Math.max(z.alt, z.neu))) * 1.04;
  const X = (v) => links + (breite - links - rechts) * (Math.max(0, v) / max);
  const r1 = (v) => v.toFixed(1);
  const teil = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    `<line class="bs-raster" x1="${r1(X(t))}" y1="${oben - 4}" x2="${r1(X(t))}" y2="${hoehe - 18}"/>
     <text class="bs-achse" x="${r1(X(t))}" y="${hoehe - 6}" text-anchor="middle">${t.toFixed(2)}</text>`).join('');
  const reihen = zeilen.map((z, i) => {
    const y = oben + i * zeile;
    return `<text class="bs-name" x="${links - 6}" y="${y + 14}" text-anchor="end">${esc(z.name)}</text>
      <rect class="bs-alt" x="${links}" y="${y + 2}" width="${r1(Math.max(0.5, X(z.alt) - links))}" height="9"/>
      <rect class="${z.ok ? 'bs-neu' : 'bs-neu bs-nok'}" x="${links}" y="${y + 13}" width="${r1(Math.max(0.5, X(z.neu) - links))}" height="9"/>
      <text class="bs-wert" x="${breite - rechts + 8}" y="${y + 11}">${f3(z.alt)} → ${f3(z.neu)}</text>
      <text class="bs-wert ${z.ok ? 'bs-gut' : 'bs-schlecht'}" x="${breite - rechts + 8}" y="${y + 22}">Δη ${vz(z.d)}${
        Number.isFinite(z.zul) ? ` / ${f3(z.zul)}` : ''}</text>`;
  }).join('');
  return `<svg class="bs-balken" viewBox="0 0 ${breite} ${hoehe}" width="${breite}" height="${hoehe}"
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ausnutzung im Bestand und mit den neuen Bauteilen">
    <style>.bs-raster{stroke:#d8d8d8;stroke-width:0.6}.bs-grenze{stroke:#111;stroke-width:1.1}
      .bs-achse{font:9px sans-serif;fill:#666}.bs-name{font:10px sans-serif;fill:#111}
      .bs-wert{font:9px sans-serif;fill:#333}.bs-gut{fill:#1c6b2a}.bs-schlecht{fill:#b3261e;font-weight:600}
      .bs-alt{fill:#9aa1ab}.bs-neu{fill:#3d5a99}.bs-nok{fill:#c62828}</style>
    ${teil}<line class="bs-grenze" x1="${r1(X(1))}" y1="${oben - 6}" x2="${r1(X(1))}" y2="${hoehe - 18}"/>
    ${reihen}</svg>`;
}

function tabelleHtml(zeilen) {
  return `<table><colgroup><col style="width:34%"><col style="width:13%"><col style="width:13%">
      <col style="width:13%"><col style="width:13%"><col style="width:14%"></colgroup>
    <thead><tr><th>Bauteil</th><th class="num">η Bestand</th><th class="num">η mit neuen</th>
      <th class="num">Δη</th><th class="num">zulässig</th><th>Befund</th></tr></thead>
    <tbody>${zeilen.map((z) => `<tr class="${z.ok ? '' : 'bs-zeile-nok'}"><td>${esc(z.name)}</td>
      <td class="num">${f3(z.alt)}</td><td class="num">${f3(z.neu)}</td>
      <td class="num">${vz(z.d)}</td><td class="num">${Number.isFinite(z.zul) ? f3(z.zul) : '–'}</td>
      <td>${z.ok ? 'eingehalten' : 'vertiefter Nachweis'}</td></tr>`).join('')}</tbody></table>`;
}

/**
 * Das Blatt als eigenständiges HTML-Dokument (A4 quer).
 *
 * @param {object} daten  { bestand, skizze, zeilen, titel, neueTeile: [{name, wo}], windstufe, linie, km, ortschaft, datum, fassung }
 * @param {object} wahl   { gesamt, joch, mast, fundament } - was geplottet wird
 */
export function bestandBlattHtml(daten, wahl = {}) {
  const b = daten?.bestand ?? {};
  const kopf = [daten?.linie ? `Linie ${esc(daten.linie)}` : '',
    daten?.km ? `km ${esc(daten.km)}` : '', daten?.ortschaft ? esc(daten.ortschaft) : '']
    .filter(Boolean).join(' · ') || 'Linie / Station: –';
  const pz = `${Number((b.prozent ?? 5).toFixed(2))} %`;
  const regel = b.bezug === 'ausnutzung'
    ? `Δη ≤ ${pz} der Ausnutzung im Bestand` : `Δη ≤ ${pz} der Grenzausnutzung 1.00`;
  const gruppen = BESTAND_GRUPPEN.filter((g) => wahl[g.key] !== false)
    .map((g) => ({ ...g, zeilen: bestandZeilenFuer(b, g.key) }));
  const teile = daten?.neueTeile ?? [];
  const bloecke = gruppen.map((g) => (g.zeilen.length
    ? `<section class="bs-gruppe"><h2>${esc(g.titel)}</h2>
        <div class="bs-paar"><figure>${bestandBalkenSvg(g.zeilen)}</figure>
        <div class="bs-tab">${tabelleHtml(g.zeilen)}</div></div></section>`
    : `<section class="bs-gruppe"><h2>${esc(g.titel)}</h2><p class="bs-leer">Kein Bauteil dieser Gruppe im Vergleich.</p></section>`)).join('');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
  <title>Bestandesschutz</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font: 11px/1.35 system-ui, sans-serif; color: #111; background: #fff; margin: 16px; }
    h1 { font-size: 17px; margin: 0 0 2px; }
    h2 { font-size: 12.5px; margin: 12px 0 4px; }
    .unter { color: #555; margin: 0 0 10px; }
    .oben { display: flex; gap: 24px; align-items: flex-start; margin-bottom: 6px; flex-wrap: wrap; }
    .oben figure, .bs-paar figure { margin: 0; }
    figcaption { font-size: 10px; color: #555; margin-top: 2px; }
    .bs-urteil { border: 1.4px solid #1c6b2a; color: #1c6b2a; padding: 6px 10px; border-radius: 4px; max-width: 320px; }
    .bs-urteil.nok { border-color: #b3261e; color: #b3261e; }
    .bs-urteil b { display: block; font-size: 13px; }
    .bs-neuliste { margin: 6px 0 0 16px; padding: 0; color: #b3261e; }
    .bs-neuliste li { margin: 1px 0; }
    .bs-legende span { display: inline-block; width: 18px; height: 8px; vertical-align: middle; margin: 0 4px 0 10px; }
    .bs-paar { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
    .bs-tab { flex: 1 1 380px; min-width: 340px; }
    .bs-gruppe { break-inside: avoid; }
    table { border-collapse: collapse; width: 100%; font-size: 10.5px; table-layout: fixed; }
    th, td { border: 1px solid #c8c8c8; padding: 3px 6px; overflow-wrap: anywhere; }
    thead th { background: #eef0f3; font-weight: 600; text-align: left; font-size: 10px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    thead th.num { text-align: right; }
    .bs-zeile-nok td { color: #b3261e; background: #fff4f3; }
    .bs-leer { color: #777; }
    .bs-hinweise { margin: 10px 0 0 16px; padding: 0; font-size: 10px; color: #333; }
    .fuss { margin-top: 10px; font-size: 9.5px; color: #777; }
  </style></head><body>
  <h1>Bestandesschutz · Ausnutzung im Bestand und mit den neuen Bauteilen</h1>
  <p class="unter">${kopf} · ${esc(daten?.datum ?? '')}</p>
  <div class="oben">
    <figure>${skizzeSvg(daten?.skizze, daten?.zeilen, { daten })}
      <figcaption>Übersicht quer zum Gleis, aus dem Stabmodell · <span style="color:#c62828">rot: neue Bauteile</span></figcaption></figure>
    <div>
      <div class="bs-urteil${b.ok ? '' : ' nok'}"><b>${b.ok ? 'Kein vertiefter Nachweis nötig' : 'Vertiefter Nachweis nötig'}</b>
        Regel: ${esc(regel)}.<br>Massgebend: ${esc(b.wer ?? '–')}, Δη ${vz(b.dMax)}.</div>
      <p style="margin:8px 0 0"><b>Neue Bauteile (${teile.length})</b></p>
      <ul class="bs-neuliste">${teile.map((t) => `<li>${esc(t.name)}${t.wo ? ` · ${esc(t.wo)}` : ''}</li>`).join('')
        || '<li>–</li>'}</ul>
      <p class="bs-legende" style="margin:8px 0 0">Balken:<span style="background:#9aa1ab"></span>Bestand
        <span style="background:#3d5a99"></span>mit neuen Bauteilen
        <span style="background:#c62828"></span>Zunahme über der Grenze</p>
    </div>
  </div>
  ${bloecke || '<p class="bs-leer">Keine Gruppe gewählt.</p>'}
  <ul class="bs-hinweise">
    <li>Verglichen wird je Bauteil die Ausnutzung η aus dem Stabwerk: einmal ohne die als «neu» gekennzeichneten Anbauteile (Bestand), einmal mit ihnen. Beide Zustände mit derselben Windstufe${daten?.windstufe ? ` (${esc(daten.windstufe)})` : ''}.</li>
    <li>Regel: ${esc(regel)}. Ist sie an jedem Bauteil eingehalten, kann von einem vertieften Nachweis abgesehen werden, sofern der Bestand seinerzeit nach den gültigen Normen bemessen wurde.</li>
    <li>Ein Vergleich, kein Tragsicherheitsnachweis: die Ausnutzung selbst steht im Nachweisbericht.</li>
  </ul>
  <p class="fuss">${esc(daten?.fassung ?? '')}</p>
  </body></html>`;
}
