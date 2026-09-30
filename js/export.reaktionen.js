/**
 * export.reaktionen.js
 * ---------------------------------------------------------------------------
 * DIE TABELLE DER REAKTIONSKRÄFTE - im Reiter Auflager und als Blatt.
 *
 * Weisung vom 30. September (Wortlaut in core.reaktionen.js), auf Rückfrage
 * «Beides»: kurz im Reiter Auflager, ausführlich als druckbares Blatt im
 * Export - Übersichtsskizze, Tabelle, Hinweise, Achssystem. Die Zahlen
 * rechnet core.reaktionen.js; hier wird nur geschrieben.
 *
 * >>> DRUCK IST POSITIV. <<<
 *
 * «beachte noch das die druckkräfte positiv sind auf der tabelle» - die
 * Tabelle zählt Z nach unten wie die Zusammenfassung der Einwirkungen; das
 * 3D der Anwendung zählt z nach oben. Beides steht auf dem Blatt.
 *
 * Das Modul importiert nur Darstellendes: die Namen (Mastnummern) und die
 * Fundamente reicht die Anwendung herein (`daten`), damit hier keine zweite
 * Lesart des Datensatzes entsteht.
 * ---------------------------------------------------------------------------
 */

import { esc } from './design.js';
import { REAKTION_SPALTEN } from './core.reaktionen.js';

// Unter einem halben Hundertstel steht 0.00, nicht «−0.00».
const f2 = (v) => (Number.isFinite(v)
  ? (Math.abs(v) < 0.005 ? 0 : v).toFixed(2).replace('-', '−') : '–');
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1).replace('-', '−') : '–');

/**
 * Die Zeilen eines Auflagers: Einwirkung, Havarie, Standardlasten.
 *
 * @param {object} z   Zeile aus `reaktionsZeilen`, angereichert mit
 *                     name, fundament (Typ-Objekt), anker (Angaben)
 */
function auflagerZeilen(z, { kurz = false } = {}) {
  const mast = z.art === 'mast';
  const wert = (b, key) => {
    if (!b) return '–';
    // Am gelenkigen Ankerfundament gibt es kein Moment und keine Torsion.
    if (!mast && (key === 'Mq' || key === 'Ml' || key === 'T')) return '–';
    return f2(b[key]?.wert);
  };
  const titel = (b, key) => (b?.[key]?.bez ? ` title="${esc(b[key].bez)}"` : '');
  const vText = (b) => (b ? `${f2(b.Vmin.wert)} / ${f2(b.Vmax.wert)}` : '–');
  const vTitel = (b) => (b ? ` title="${esc(`min: ${b.Vmin.bez} · max: ${b.Vmax.bez}`)}"` : '');
  const anteil = (a) => (a ? `${Math.round(a.prozent * 100)} / ${Math.round((1 - a.prozent) * 100)} %` : '–');
  const anteilTitel = (a, was) => (a ? ` title="${esc(`${was}: ständig ${f2(a.staendig)}, veränderlich ${f2(a.veraenderlich)}`)}"` : '');
  // Der massgebende Fall je Richtung - nur, wo auch etwas steht.
  const fall = (x) => (x?.bez && Math.abs(x.wert) >= 0.005 ? x.bez : '');
  const massgebend = (b) => (b ? [
    fall(mast ? b.Mq : b.Hq) ? `quer: ${fall(mast ? b.Mq : b.Hq)}` : '',
    fall(mast ? b.Ml : b.Hl) ? `längs: ${fall(mast ? b.Ml : b.Hl)}` : '']
    .filter(Boolean).join(' · ') : '');
  const zelle = (b) => REAKTION_SPALTEN.map((s) =>
    `<td class="num"${titel(b, s.key)}>${wert(b, s.key)}</td>`).join('');
  const name = mast ? esc(z.name)
    : z.art === 'anker' ? `Anker ${esc(z.name)}`
    : z.art === 'laengsanker' ? 'Längsanker' : esc(z.name);
  const fund = mast ? esc(z.fundament?.typ ?? '–')
    : z.art === 'laengsanker' ? 'Halt in Gleisrichtung'
    : esc([z.anker?.typ, z.anker?.richtung === 'y' ? 'längs' : z.anker?.richtung === 'x' ? 'quer' : '']
      .filter(Boolean).join(' · ') || 'Ankerfundament');
  const zeilen = [];
  zeilen.push(`<tr class="rk-haupt">
    <td rowspan="${1 + (z.havarie ? 1 : 0) + (mast && z.fundament ? 1 : 0)}"><b>${name}</b>
      <br><span class="rk-x">x ${f2(z.x)} m</span></td>
    <td>${fund}</td><td>Einwirkung</td>
    <td class="num"${vTitel(z.haupt)}>${vText(z.haupt)}</td>${zelle(z.haupt)}
    <td class="num"${anteilTitel(z.anteil?.quer, 'quer')}>${mast ? anteil(z.anteil?.quer) : '–'}</td>
    ${kurz ? '' : `<td class="rk-anm">${esc(massgebend(z.haupt))}</td>`}</tr>`);
  if (z.havarie) {
    zeilen.push(`<tr class="rk-havarie"><td></td><td>Havarie</td>
      <td class="num"${vTitel(z.havarie)}>${vText(z.havarie)}</td>${zelle(z.havarie)}
      <td class="num">–</td>${kurz ? '' : `<td class="rk-anm">${esc(massgebend(z.havarie))}</td>`}</tr>`);
  }
  if (mast && z.fundament) {
    const t = z.fundament;
    zeilen.push(`<tr class="rk-zul"><td></td><td>Standardlasten</td>
      <td class="num">0 / ${f1(t.Vmax)}</td>
      <td class="num" title="veränderlich allein ≤ ${f1(t.Mq_ver)}">${f1(t.Mq)}</td>
      <td class="num" title="veränderlich allein ≤ ${f1(t.Hq_ver)}">${f1(t.Hq)}</td>
      <td class="num">${f1(t.Ml)}</td><td class="num">${f1(t.Hl)}</td>
      <td class="num">${f1(t.T)}</td>
      <td class="num">${Number(t.Mq) > 0 ? `${Math.round(100 - 100 * t.Mq_ver / t.Mq)} / ${Math.round(100 * t.Mq_ver / t.Mq)} %` : '–'}</td>
      ${kurz ? '' : `<td class="rk-anm">zulässig, Gelände bis 14°</td>`}</tr>`);
  }
  return zeilen.join('');
}

/** Die Tabelle - im Reiter (`kurz`) und auf dem Blatt. */
export function reaktionenTabelleHtml(daten, { kurz = false } = {}) {
  const zeilen = daten?.zeilen ?? [];
  if (!zeilen.length) return '';
  return `<table class="dt rk-tabelle">
    <thead>
      <tr><th rowspan="2">Mast / Anker</th><th rowspan="2">Fundament</th><th rowspan="2"></th>
        <th rowspan="2" class="num">V min / max<br>[kN]</th>
        <th colspan="2" class="rk-gruppe">quer zum Gleis</th>
        <th colspan="2" class="rk-gruppe">längs zum Gleis</th>
        <th rowspan="2" class="num">±T<br>[kNm]</th>
        <th rowspan="2" class="num">ständig / veränderl.</th>
        ${kurz ? '' : '<th rowspan="2">massgebend</th>'}</tr>
      <tr><th class="num">±M_q [kNm]</th><th class="num">±H_q [kN]</th>
        <th class="num">±M_l [kNm]</th><th class="num">±H_l [kN]</th></tr>
    </thead>
    <tbody>${zeilen.map((z) => auflagerZeilen(z, { kurz })).join('')}</tbody>
  </table>`;
}

/**
 * Die Übersichtsskizze als SVG: Ansicht quer zum Gleis, z nach oben wie im
 * Querprofil, die Auflager mit ihren Namen.
 */
export function skizzeSvg(skizze, zeilen, { breite = 560, hoehe = 230 } = {}) {
  if (!skizze?.linien?.length) return '';
  const g = skizze.grenzen;
  const rand = 26;
  const sx = (breite - 2 * rand) / Math.max(g.x1 - g.x0, 1e-6);
  const sz = (hoehe - 2 * rand - 14) / Math.max(g.z1 - g.z0, 1e-6);
  const s = Math.min(sx, sz);
  const ox = (breite - (g.x1 - g.x0) * s) / 2;
  const X = (x) => (ox + (x - g.x0) * s).toFixed(1);
  const Z = (z) => (hoehe - rand - 14 - (z - g.z0) * s).toFixed(1);
  const linien = skizze.linien.map((l) =>
    `<line x1="${X(l[0])}" y1="${Z(l[1])}" x2="${X(l[2])}" y2="${Z(l[3])}"/>`).join('');
  const boden = `<line class="sk-boden" x1="${rand / 2}" y1="${Z(g.z0)}" x2="${breite - rand / 2}" y2="${Z(g.z0)}"/>`;
  const marken = (zeilen ?? []).map((z) => {
    const x = X(z.xModell ?? z.x), y = Number(Z(z.z));
    return `<path class="sk-lager" d="M${x} ${y} l-5 8 h10 z"/>`
      + `<text x="${x}" y="${(y + 20).toFixed(1)}" text-anchor="middle">${esc(
        z.art === 'mast' ? z.name : z.art === 'laengsanker' ? 'LA' : `A ${z.name}`)}</text>`;
  }).join('');
  return `<svg class="rk-skizze" viewBox="0 0 ${breite} ${hoehe}" width="${breite}" height="${hoehe}"
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Übersichtsskizze quer zum Gleis">
    <style>line{stroke:#444;stroke-width:0.7}.sk-boden{stroke:#999;stroke-dasharray:4 3}
      .sk-lager{fill:#fff;stroke:#222;stroke-width:0.9}text{font:10px sans-serif;fill:#222}</style>
    ${boden}${linien}${marken}</svg>`;
}

/**
 * Das Achssystem der Tabelle: X quer, Y längs, Z nach unten - Druck auf das
 * Fundament positiv. Eigene Zeichnung, dieselbe Aussage wie die Skizze der
 * Einwirkungen.
 */
export function achsSvg() {
  return `<svg class="rk-achsen" viewBox="0 0 300 170" width="300" height="170"
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Achssystem der Tabelle">
    <defs><marker id="rk-pf" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7"
      markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#222"/></marker></defs>
    <style>line{stroke:#222;stroke-width:1.4}text{font:12px sans-serif;fill:#222}
      .klein{font-size:10px;fill:#555}.mast{stroke:#aaa;stroke-width:1;stroke-dasharray:5 3}
      .fund{fill:none;stroke:#bbb;stroke-width:1}</style>
    <rect class="fund" x="120" y="62" width="44" height="34"/>
    <line class="mast" x1="142" y1="8" x2="142" y2="62"/>
    <text class="klein" x="148" y="16">Mastachse</text>
    <line x1="142" y1="62" x2="262" y2="62" marker-end="url(#rk-pf)"/>
    <text x="266" y="66">X</text>
    <text class="klein" x="178" y="56">quer zum Gleis</text>
    <line x1="142" y1="62" x2="206" y2="22" marker-end="url(#rk-pf)"/>
    <text x="210" y="22">Y</text>
    <text class="klein" x="206" y="36">längs (Gleis)</text>
    <line x1="142" y1="62" x2="142" y2="150" marker-end="url(#rk-pf)"/>
    <text x="148" y="158">Z</text>
    <text class="klein" x="152" y="128">nach unten:</text>
    <text class="klein" x="152" y="140">Druck positiv</text>
    <text class="klein" x="6" y="90">M_q um Y,</text>
    <text class="klein" x="6" y="102">M_l um X,</text>
    <text class="klein" x="6" y="114">T um Z</text>
  </svg>`;
}

/** Die Hinweise des Blattes. */
export function hinweiseHtml(daten) {
  const g = daten?.grenzen;
  return `<ul class="rk-hinweise">
    <li>Charakteristische Werte: alle Teilsicherheitsbeiwerte 1, Wind <b>ohne
      Abminderung</b> (nicht der Betriebswind ψ 0.70).</li>
    <li>Die Werte setzen sich aus den ständigen und den veränderlichen Lasten
      zusammen. Die veränderlichen Einwirkungen quer und längs zum Gleis sind
      getrennt betrachtet, nicht überlagert; je Spalte steht der massgebende
      Fall (in der letzten Spalte bzw. beim Überfahren der Zahl).</li>
    <li><b>Druckkräfte sind positiv</b>, negative Vertikalkräfte abhebend.
      Momente, Horizontalkräfte und Torsion stehen als Betrag (±) - ihre
      Richtung wechselt mit dem Wind.</li>
    <li>Der Havariefall (Leiterriss, aussergewöhnlich, Beiwerte 1) steht in
      einer eigenen Zeile.</li>
    <li>«ständig / veränderl.»: Anteil am Moment quer zum Gleis. In der Zeile
      der Standardlasten der Anteil, den das Fundament für den veränderlichen
      Teil zulässt (M_q, H_q veränderlich allein).</li>
    <li>Standardlasten: zulässige Werte des Fundamenttyps für Gelände bis 14°
      Neigung; bei steilerem Gelände gelten kleinere Werte.</li>
    ${g ? `<li>Gebrauchstauglichkeit (in der Anwendung eingestellt, Betriebswind
      ψ 0.70): Fahrdraht quer ${f1(g.fahrdraht * 1000)} mm, Mastspitze
      L/${Math.round(g.spitzeN)}.</li>` : ''}
    <li>Gerechnet im Stabwerk der Anwendung: alle Tragwerke des Querprofils in
      einem Modell, jeder Mast mit den Kräften aller anschliessenden
      Tragwerke.</li>
  </ul>`;
}

/**
 * Das Blatt als eigenständiges HTML-Dokument (A4 quer), zum Drucken oder
 * als PDF.
 */
export function reaktionenBlattHtml(daten) {
  const kopf = [daten?.linie ? `Linie ${esc(daten.linie)}` : '',
    daten?.km ? `km ${esc(daten.km)}` : '', daten?.ortschaft ? esc(daten.ortschaft) : '']
    .filter(Boolean).join(' · ') || 'Linie / Station: –';
  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
  <title>Reaktionskräfte</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font: 11px/1.35 system-ui, sans-serif; color: #111; background: #fff; margin: 16px; }
    h1 { font-size: 17px; margin: 0 0 2px; }
    .unter { color: #555; margin: 0 0 10px; }
    .oben { display: flex; gap: 24px; align-items: flex-start; margin-bottom: 10px; flex-wrap: wrap; }
    .oben figure { margin: 0; }
    figcaption { font-size: 10px; color: #555; margin-top: 2px; }
    table { border-collapse: collapse; width: 100%; font-size: 10.5px; }
    th, td { border: 1px solid #bbb; padding: 3px 5px; vertical-align: top; }
    th { background: #f0f0f0; font-weight: 600; text-align: left; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .rk-gruppe { text-align: center; }
    .rk-havarie td { color: #7a2a00; }
    .rk-zul td { color: #555; background: #fafafa; }
    .rk-x { color: #666; font-size: 9.5px; }
    .rk-anm { font-size: 9.5px; color: #444; }
    .rk-hinweise { margin: 10px 0 0 16px; padding: 0; }
    .rk-hinweise li { margin: 2px 0; }
    .fuss { margin-top: 10px; font-size: 9.5px; color: #777; }
  </style></head><body>
  <h1>Reaktionskräfte · Charakteristische Werte</h1>
  <p class="unter">${kopf} · ${esc(daten?.datum ?? '')}</p>
  <div class="oben">
    <figure>${skizzeSvg(daten?.skizze, daten?.zeilen)}
      <figcaption>Übersicht quer zum Gleis, aus dem Stabmodell</figcaption></figure>
    <figure>${achsSvg()}
      <figcaption>Achssystem der Tabelle. Das 3D der Anwendung zählt z nach oben.</figcaption></figure>
  </div>
  ${reaktionenTabelleHtml(daten)}
  <h2 style="font-size:13px;margin:12px 0 0">Hinweise</h2>
  ${hinweiseHtml(daten)}
  <p class="fuss">${esc(daten?.fassung ?? '')}</p>
  </body></html>`;
}
