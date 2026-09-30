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

/*
 * >>> DIE KÖPFE WIE IN DER EXCEL-TABELLE (30. September). <<<
 * «dazu noch die benennung der reatktionskräfte mit dem achsystem ergänzen
 * wie in der exceltabelle»: Grösse, Achse und Kurzzeichen der Mappe
 * (F_z (V), M_y (M,q), F_x (H,q), M_x (M,l), F_y (H,l), M_z (T)), gruppiert
 * nach Lastfall quer / längs zum Gleis.
 */
const KOPF = {
  Mq: ['±M<sub>y</sub> (M,q)', 'kNm'], Hq: ['±F<sub>x</sub> (H,q)', 'kN'],
  Ml: ['±M<sub>x</sub> (M,l)', 'kNm'], Hl: ['±F<sub>y</sub> (H,l)', 'kN'],
  T: ['±M<sub>z</sub> (T)', 'kNm'],
};

/**
 * Welche Spalten ein Auflager führt. Am gelenkigen Ankerfundament gibt es
 * kein Moment und keine Torsion, und die Horizontalkraft steht in der
 * Richtung des Ankers (Weisung: «beim Ankerfundament eine y und z
 * komponente … wenn in längsrichtung angesetzt»). Der Längsanker des
 * Tragauslegers hält nur in Gleisrichtung.
 */
function spaltenVon(z) {
  if (z.art === 'mast') return new Set(['Mq', 'Hq', 'Ml', 'Hl', 'T']);
  if (z.art === 'laengsanker') return new Set(['Hl']);
  if (z.art === 'anker') {
    const r = z.anker?.richtung;
    return new Set(r === 'y' ? ['Hl'] : r === 'x' ? ['Hq'] : ['Hq', 'Hl']);
  }
  return new Set(['Hq', 'Hl']);
}

/**
 * Die Zeilen eines Auflagers: Einwirkung, Havarie, Standardlasten.
 *
 * @param {object} z   Zeile aus `reaktionsZeilen`, angereichert mit
 *                     name, fundament (Typ-Objekt), anker (Angaben)
 */
function auflagerZeilen(z, { kurz = false, havarie = true, standard = true } = {}) {
  const mast = z.art === 'mast';
  const hat = spaltenVon(z);
  const titel = (b, key) => (b?.[key]?.bez ? ` title="${esc(b[key].bez)}"` : '');
  const vText = (b) => (b ? `${f2(b.Vmin.wert)} / ${f2(b.Vmax.wert)}` : '–');
  const vTitel = (b) => (b ? ` title="${esc(`min: ${b.Vmin.bez} · max: ${b.Vmax.bez}`)}"` : '');
  const anteil = (a) => (a ? `${Math.round(a.prozent * 100)} / ${Math.round((1 - a.prozent) * 100)}` : '–');
  const anteilTitel = (a) => (a ? ` title="${esc(`quer: ständig ${f2(a.staendig)}, veränderlich ${f2(a.veraenderlich)}`)}"` : '');
  // Der massgebende Fall je Richtung - nur, wo auch etwas steht. Beim
  // Havariefall ohne den Namen des Leiters (er steht in den Hinweisen).
  const kurzBez = (bez) => String(bez)
    .replace(/^Havarie: .* reisst, Längszug (.)y$/, 'Leiterriss, Längszug $1y')
    .replace(/^Havarie \(−20 °C\), ohne Leiterbruch$/, 'ohne Leiterbruch');
  const fall = (x) => (x?.bez && Math.abs(x.wert) >= 0.005 ? kurzBez(x.bez) : '');
  const massgebend = (b) => {
    if (!b) return '';
    const q = hat.has('Mq') ? b.Mq : hat.has('Hq') ? b.Hq : null;
    const l = hat.has('Ml') ? b.Ml : hat.has('Hl') ? b.Hl : null;
    return [fall(q) ? `quer: ${fall(q)}` : '', fall(l) ? `längs: ${fall(l)}` : '']
      .filter(Boolean).join(' · ');
  };
  const werte = (b) => REAKTION_SPALTEN.map((s) => (hat.has(s.key) && b
    ? `<td class="num"${titel(b, s.key)}>${f2(b[s.key]?.wert)}</td>`
    : '<td class="num rk-leer">–</td>')).join('');
  // Was aufs Blatt kommt, wählt man (30. September: «beim output noch
  // bestimmen können ob man den havariefall / standardlasten / Hinweistext
  // mit plotten will»).
  const zul = standard && mast && z.fundament ? z.fundament : null;
  const hav = havarie ? z.havarie : null;
  const n = 1 + (hav ? 1 : 0) + (zul ? 1 : 0);
  // Der Typ steht auch, wenn die Zeile der Standardlasten aus ist.
  const fund = mast ? esc(z.fundament?.typ ?? '–')
    : z.art === 'laengsanker' ? 'Seil in Gleisrichtung'
    : esc([z.anker?.typ, z.anker?.richtung === 'y' ? 'längs' : z.anker?.richtung === 'x' ? 'quer' : '']
      .filter(Boolean).join(' · ') || 'Ankerfundament');
  // «Längsanker» bricht in der schmalen Spalte an der Fuge, nicht irgendwo.
  const nameHtml = esc(z.name).replace('Längsanker', 'Längs&shy;anker');
  const zeilen = [];
  zeilen.push(`<tr class="rk-haupt">
    <td rowspan="${n}" class="rk-name"><b>${nameHtml}</b><span class="rk-x">x ${f2(z.x)} m</span></td>
    <td rowspan="${n}" class="rk-fund">${fund}</td>
    <td class="rk-art">Einwirkung</td>
    <td class="num"${vTitel(z.haupt)}>${vText(z.haupt)}</td>${werte(z.haupt)}
    <td class="num"${anteilTitel(z.anteil?.quer)}>${mast ? anteil(z.anteil?.quer) : '–'}</td>
    ${kurz ? '' : `<td class="rk-anm">${esc(massgebend(z.haupt))}</td>`}</tr>`);
  if (hav) {
    zeilen.push(`<tr class="rk-havarie"><td class="rk-art">Havarie</td>
      <td class="num"${vTitel(hav)}>${vText(hav)}</td>${werte(hav)}
      <td class="num rk-leer">–</td>${kurz ? '' : `<td class="rk-anm">${esc(massgebend(hav))}</td>`}</tr>`);
  }
  if (zul) {
    zeilen.push(`<tr class="rk-zul"><td class="rk-art">Standardlast</td>
      <td class="num">0 / ${f1(zul.Vmax)}</td>
      <td class="num" title="veränderlich allein ≤ ${f1(zul.Mq_ver)}">${f1(zul.Mq)}</td>
      <td class="num" title="veränderlich allein ≤ ${f1(zul.Hq_ver)}">${f1(zul.Hq)}</td>
      <td class="num">${f1(zul.Ml)}</td><td class="num">${f1(zul.Hl)}</td>
      <td class="num">${f1(zul.T)}</td>
      <td class="num">${Number(zul.Mq) > 0 ? `${Math.round(100 - 100 * zul.Mq_ver / zul.Mq)} / ${Math.round(100 * zul.Mq_ver / zul.Mq)}` : '–'}</td>
      ${kurz ? '' : '<td class="rk-anm">zulässig, Gelände bis 14°</td>'}</tr>`);
  }
  return zeilen.join('');
}

/**
 * Die Tabelle - im Reiter (`kurz`) und auf dem Blatt.
 *
 * >>> GLEICHE BREITEN (30. September). <<< «Die tabelle sollte geordneter
 * daherkommen (gleiche zellenbreiten bei den werten)»: festes Raster
 * (`table-layout: fixed`), die sechs Wertespalten gleich breit, rechtsbündig
 * mit Ziffern gleicher Breite.
 */
export function reaktionenTabelleHtml(daten, { kurz = false, havarie = true, standard = true } = {}) {
  const zeilen = daten?.zeilen ?? [];
  if (!zeilen.length) return '';
  const breiten = kurz
    ? [11, 12, 11, 12, 8.4, 8.4, 8.4, 8.4, 8.4, 12]
    : [8, 10, 8, 10, 7.2, 7.2, 7.2, 7.2, 7.2, 8, 20];
  return `<table class="dt rk-tabelle${kurz ? ' rk-kurz' : ''}">
    <colgroup>${breiten.map((b) => `<col style="width:${b}%">`).join('')}</colgroup>
    <thead>
      <tr><th rowspan="2">Auflager</th><th rowspan="2">Fundament</th><th rowspan="2"></th>
        <th class="rk-gruppe">Vertikalkraft</th>
        <th colspan="2" class="rk-gruppe">Lastfall quer zum Gleis</th>
        <th colspan="2" class="rk-gruppe">Lastfall längs zum Gleis</th>
        <th class="rk-gruppe">Torsion</th>
        <th rowspan="2" class="num">ständig / veränderl. [%]</th>
        ${kurz ? '' : '<th rowspan="2">massgebender Fall</th>'}</tr>
      <tr><th class="num">F<sub>z</sub> (V) min / max<br>[kN]</th>
        ${['Mq', 'Hq', 'Ml', 'Hl', 'T'].map((k) =>
          `<th class="num">${KOPF[k][0]}<br>[${KOPF[k][1]}]</th>`).join('')}</tr>
    </thead>
    <tbody>${zeilen.map((z) => auflagerZeilen(z, { kurz, havarie, standard })).join('')}</tbody>
  </table>`;
}

/**
 * >>> DIE FORM FÜR DIE SEITENLEISTE: GESTÜRZT (30. September). <<<
 *
 * Zehn Spalten passen nicht in die Ergebnisspalte (gesehen: die Ziffern
 * brachen Zeichen für Zeichen um). Je Auflager deshalb eine kleine Tabelle:
 * die Grössen als Zeilen, Einwirkung / Havarie / Standardlast als gleich
 * breite Spalten. Dieselben Zahlen wie auf dem Blatt.
 */
export function reaktionenKurzHtml(daten) {
  const zeilen = daten?.zeilen ?? [];
  if (!zeilen.length) return '';
  const kopfText = { Mq: '±M_y (M,q)', Hq: '±F_x (H,q)', Ml: '±M_x (M,l)', Hl: '±F_y (H,l)', T: '±M_z (T)' };
  return zeilen.map((z) => {
    const hat = spaltenVon(z);
    const zul = z.art === 'mast' ? z.fundament : null;
    const spalten = [['Einwirkung', z.haupt], ...(z.havarie ? [['Havarie', z.havarie]] : [])];
    const n = spalten.length + (zul ? 1 : 0);
    const breite = Math.floor(62 / n);
    const fund = z.art === 'mast' ? (zul?.typ ?? '')
      : z.art === 'laengsanker' ? 'Seil in Gleisrichtung'
      : [z.anker?.typ, z.anker?.richtung === 'y' ? 'längs' : z.anker?.richtung === 'x' ? 'quer' : '']
        .filter(Boolean).join(' · ');
    const zeile = (label, einheit, werte, zulWert) => `<tr><th>${label} <span class="rk-einheit">[${einheit}]</span></th>${
      werte.join('')}${zul ? `<td class="num rk-zulw">${zulWert}</td>` : ''}</tr>`;
    const v = zeile('F_z (V) min/max', 'kN',
      spalten.map(([, b]) => `<td class="num">${b ? `${f2(b.Vmin.wert)} / ${f2(b.Vmax.wert)}` : '–'}</td>`),
      zul ? `0 / ${f1(zul.Vmax)}` : '');
    const rest = REAKTION_SPALTEN.filter((s) => hat.has(s.key)).map((s) => zeile(kopfText[s.key], s.einheit,
      spalten.map(([, b]) => `<td class="num"${b?.[s.key]?.bez ? ` title="${esc(b[s.key].bez)}"` : ''}>${
        b ? f2(b[s.key]?.wert) : '–'}</td>`),
      zul ? f1(zul[s.key]) : '')).join('');
    return `<table class="dt rk-kurz">
      <colgroup><col style="width:${100 - breite * n}%">${`<col style="width:${breite}%">`.repeat(n)}</colgroup>
      <thead><tr><th><b>${esc(z.name)}</b> <span class="rk-x">${esc(fund)} · x ${f2(z.x)} m</span></th>
        ${spalten.map(([t]) => `<th class="num">${t}</th>`).join('')}${zul ? '<th class="num">zulässig</th>' : ''}</tr></thead>
      <tbody>${v}${rest}</tbody></table>`;
  }).join('');
}

/**
 * Die Übersichtsskizze als SVG: Ansicht quer zum Gleis, z nach oben wie im
 * Querprofil.
 *
 * Weisung 30. September: «Das LA auflager (beim tragausleger) verwirrt die
 * lesart, hier die aufhängeseile anzeigen … mach ein einspannsymbol beim
 * Mastfuss … deute den anker noch in der obigen schemaskizze an». Also:
 * kein Lagersymbol am Längsanker (er hält in Gleisrichtung, nicht den
 * Ausleger von unten), die Seile gestrichelt, am Mastfuss die Einspannung
 * (Strich mit Schraffur), der Anker als Strebe zu seinem Fundament mit
 * Gelenk. Ein Anker in Gleisrichtung läge in dieser Ansicht auf dem
 * Masten; er wird seitlich umgeklappt gezeichnet und so angeschrieben.
 */
export function skizzeSvg(skizze, zeilen, { breite = 560, hoehe = 260, daten = null } = {}) {
  if (!skizze?.linien?.length) return '';
  const g = { ...skizze.grenzen };
  // Platz für die Titel über dem höchsten Bauteil.
  if ((daten?.titel ?? []).length) g.z1 += Math.max(1.2, (g.z1 - g.z0) * 0.12);
  const liste = zeilen ?? [];
  // Umgeklappte Anker brauchen Platz neben dem Masten.
  liste.filter((z) => z.art === 'anker').forEach((z) => {
    const a = Number(z.anker?.a) || 0;
    g.x1 = Math.max(g.x1, (z.xModell ?? z.x) + a);
    g.x0 = Math.min(g.x0, (z.xModell ?? z.x) - a);
  });
  const rand = 26;
  const sx = (breite - 2 * rand) / Math.max(g.x1 - g.x0, 1e-6);
  const sz = (hoehe - 2 * rand - 16) / Math.max(g.z1 - g.z0, 1e-6);
  const s = Math.min(sx, sz);
  const ox = (breite - (g.x1 - g.x0) * s) / 2;
  const X = (x) => ox + (x - g.x0) * s;
  const Z = (z) => hoehe - rand - 16 - (z - g.z0) * s;
  const r1 = (v) => v.toFixed(1);
  const linien = skizze.linien.map((l) =>
    `<line${l[4] === 1 ? ' class="sk-seil"' : l[4] === 2 ? ' class="sk-anbau"' : ''} x1="${r1(X(l[0]))}" y1="${r1(Z(l[1]))}" x2="${r1(X(l[2]))}" y2="${r1(Z(l[3]))}"/>`).join('');
  const boden = `<line class="sk-boden" x1="${rand / 2}" y1="${r1(Z(g.z0))}" x2="${breite - rand / 2}" y2="${r1(Z(g.z0))}"/>`;
  // Die Einspannung: ein Strich, darunter Schraffur.
  const einspannung = (x, y) => {
    let p = `<line class="sk-lager" x1="${r1(x - 9)}" y1="${r1(y)}" x2="${r1(x + 9)}" y2="${r1(y)}"/>`;
    for (let i = -9; i <= 6; i += 3) {
      p += `<line class="sk-schraffur" x1="${r1(x + i)}" y1="${r1(y + 5)}" x2="${r1(x + i + 3)}" y2="${r1(y)}"/>`;
    }
    return p;
  };
  // Das Gelenk am Ankerfundament: Dreieck auf dem Grund.
  const gelenk = (x, y) => `<path class="sk-gelenk" d="M${r1(x)} ${r1(y)} l-5 8 h10 z"/>`;
  /*
   * Die Titel wie im 3D (Typ und Länge), über ihrem Bauteil; zwei, die sich
   * überdecken, weichen nach oben aus - wie die Titel im 3D.
   */
  const belegt = [];
  const titel = (daten?.titel ?? []).map((t) => {
    const w = t.text.length * 5.1 + 6;
    let x = X(t.x), y = Z(t.z) - 4;
    x = Math.max(w / 2 + 2, Math.min(breite - w / 2 - 2, x));
    for (let i = 0; i < 8 && belegt.some((b) => Math.abs(b.x - x) < (b.w + w) / 2
      && Math.abs(b.y - y) < 11); i += 1) y -= 11;
    belegt.push({ x, y, w });
    return `<text class="sk-titel" x="${r1(x)}" y="${r1(y)}" text-anchor="middle">${esc(t.text)}</text>`;
  }).join('');
  const marken = liste.map((z) => {
    if (z.art === 'mast') {
      const x = X(z.xModell ?? z.x), y = Z(z.z);
      return einspannung(x, y)
        + `<text x="${r1(x)}" y="${r1(y + 18)}" text-anchor="middle">${esc(z.name)}</text>`;
    }
    if (z.art === 'anker') {
      const mast = liste.find((m) => m.art === 'mast' && m.id === z.id);
      const xm = mast ? (mast.xModell ?? mast.x) : (z.xModell ?? z.x);
      const zf = z.z;
      const h = Number(z.anker?.h) || 0;
      const a = Number(z.anker?.a) || 0;
      const xf = z.xModell ?? z.x;
      const laengs = Math.abs(xf - xm) < 0.1;
      // Längs: zur Seite mit mehr Platz umgeklappt, gestrichelt.
      const seite = xm - g.x0 > g.x1 - xm ? -1 : 1;
      const xZiel = laengs ? xm + seite * a : xf;
      const p0 = [X(xm), Z(zf + h)], p1 = [X(xZiel), Z(zf)];
      return `<line class="sk-anker${laengs ? ' sk-umgeklappt' : ''}" x1="${r1(p0[0])}" y1="${r1(p0[1])}" x2="${r1(p1[0])}" y2="${r1(p1[1])}"/>`
        + gelenk(p1[0], p1[1])
        // Die Anschrift weg vom Masten, damit sie nicht an seine stösst.
        + `<text x="${r1(p1[0] + (p1[0] < p0[0] ? -6 : 6))}" y="${r1(p1[1] + 18)}" text-anchor="${
          p1[0] < p0[0] ? 'end' : 'start'}">${esc(z.name)}${laengs ? ' (längs, umgeklappt)' : ''}</text>`;
    }
    return '';                    // Längsanker: kein Lagersymbol (Weisung)
  }).join('');
  return `<svg class="rk-skizze" viewBox="0 0 ${breite} ${hoehe}" width="${breite}" height="${hoehe}"
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Übersichtsskizze quer zum Gleis">
    <style>line{stroke:#444;stroke-width:0.7}.sk-boden{stroke:#aaa;stroke-dasharray:4 3}
      .sk-seil{stroke:#444;stroke-width:0.8;stroke-dasharray:5 3}
      .sk-anbau{stroke:#1d5fa8;stroke-width:1.1}
      .sk-lager{stroke:#111;stroke-width:1.4}.sk-schraffur{stroke:#111;stroke-width:0.7}
      .sk-anker{stroke:#111;stroke-width:1.2}.sk-umgeklappt{stroke-dasharray:6 3}
      .sk-gelenk{fill:#fff;stroke:#111;stroke-width:0.9}
      text{font:10px sans-serif;fill:#222}
      .sk-titel{font:9px sans-serif;fill:#1a1a1a;paint-order:stroke;stroke:#fff;stroke-width:3px}</style>
    ${boden}${linien}${marken}${titel}</svg>`;
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
    <text class="klein" x="172" y="56">quer · F_x (H,q)</text>
    <line x1="142" y1="62" x2="206" y2="22" marker-end="url(#rk-pf)"/>
    <text x="210" y="22">Y</text>
    <text class="klein" x="206" y="36">längs · F_y (H,l)</text>
    <line x1="142" y1="62" x2="142" y2="150" marker-end="url(#rk-pf)"/>
    <text x="148" y="158">Z</text>
    <text class="klein" x="152" y="116">F_z (V) nach unten:</text>
    <text class="klein" x="152" y="128">Druck positiv</text>
    <text class="klein" x="4" y="84">M_y (M,q) um Y</text>
    <text class="klein" x="4" y="96">M_x (M,l) um X</text>
    <text class="klein" x="4" y="108">M_z (T) um Z</text>
  </svg>`;
}

/** Die Namen der Leiter, die im Havariefall reissen (aus den Fällen). */
function havarieLeiter(daten) {
  const namen = new Set();
  (daten?.zeilen ?? []).forEach((z) => ['Vmin', 'Vmax', 'Mq', 'Hq', 'Ml', 'Hl', 'T']
    .forEach((k) => {
      const m = /^Havarie: (.*) reisst, Längszug/.exec(z.havarie?.[k]?.bez ?? '');
      if (m) namen.add(m[1]);
    }));
  return [...namen];
}

/** Die Hinweise des Blattes. */
export function hinweiseHtml(daten, { havarie = true, standard = true } = {}) {
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
    ${havarie ? `<li>Der Havariefall (Leiterriss, aussergewöhnlich, Beiwerte 1) steht in
      einer eigenen Zeile.</li>` : ''}
    <li>«ständig / veränderl.»: Anteil am Moment quer zum Gleis M_y (M,q) -
      ständig ist der Betrag unter dem ganzen Eigengewicht G, veränderlich
      der grösste aus Wind oder Schnee allein (Beiwert 1); gezeigt
      ständig / (ständig + veränderlich).${standard ? ` In der Zeile der
      Standardlasten der Anteil, den das Fundament für den veränderlichen
      Teil zulässt (M_q veränderlich allein).` : ''}</li>
    ${standard ? `<li>Standardlasten: zulässige Werte des Fundamenttyps für Gelände bis 14°
      Neigung; bei steilerem Gelände gelten kleinere Werte.</li>` : ''}
    ${havarie && havarieLeiter(daten).length ? `<li>Havarie: reissen kann ${havarieLeiter(daten)
      .map((n) => `«${esc(n)}»`).join(', ')} - je Leiter ein Fall mit Längszug ±y.</li>` : ''}
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
export function reaktionenBlattHtml(daten, { havarie = true, standard = true, hinweise = true } = {}) {
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
    table { border-collapse: collapse; width: 100%; font-size: 10.5px; table-layout: fixed; }
    th, td { border: 1px solid #c8c8c8; padding: 4px 6px; vertical-align: middle; overflow-wrap: anywhere; }
    thead th { background: #eef0f3; font-weight: 600; text-align: left; font-size: 10px; line-height: 1.25; }
    thead th.num { text-align: right; white-space: normal; }
    thead tr:first-child th { border-bottom-color: #dde0e5; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .rk-gruppe { text-align: center !important; color: #333; }
    .rk-name b { display: block; font-size: 12px; }
    .rk-x { display: block; color: #666; font-size: 9.5px; }
    .rk-fund { color: #333; }
    .rk-art { color: #555; }
    tbody tr.rk-haupt td { border-top: 1.6px solid #888; }
    .rk-havarie td { color: #8a3a00; background: #fff7f0; }
    .rk-zul td { color: #555; background: #f7f7f7; font-style: italic; }
    .rk-leer { color: #bbb; }
    .rk-anm { font-size: 9.5px; color: #444; white-space: normal; }
    .rk-hinweise { margin: 10px 0 0 16px; padding: 0; }
    .rk-hinweise li { margin: 2px 0; }
    .fuss { margin-top: 10px; font-size: 9.5px; color: #777; }
  </style></head><body>
  <h1>Reaktionskräfte · Charakteristische Werte</h1>
  <p class="unter">${kopf} · ${esc(daten?.datum ?? '')}</p>
  <div class="oben">
    <figure>${skizzeSvg(daten?.skizze, daten?.zeilen, { daten })}
      <figcaption>Übersicht quer zum Gleis, aus dem Stabmodell</figcaption></figure>
    <figure>${achsSvg()}
      <figcaption>Achssystem der Tabelle. Das 3D der Anwendung zählt z nach oben.</figcaption></figure>
  </div>
  ${reaktionenTabelleHtml(daten, { havarie, standard })}
  ${hinweise ? `<h2 style="font-size:13px;margin:12px 0 0">Hinweise</h2>
  ${hinweiseHtml(daten, { havarie, standard })}` : ''}
  <p class="fuss">${esc(daten?.fassung ?? '')}</p>
  </body></html>`;
}
