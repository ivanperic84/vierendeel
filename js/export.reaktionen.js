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

import { gelaendeVon } from './data.masten.js';
import { esc } from './design.js';
import { REAKTION_SPALTEN } from './core.reaktionen.js';

// Unter einem halben Hundertstel steht 0.00, nicht «−0.00».
const f2 = (v) => (Number.isFinite(v)
  ? (Math.abs(v) < 0.005 ? 0 : v).toFixed(2).replace('-', '−') : '–');
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1).replace('-', '−') : '–');
/*
 * >>> DIE KRÄFTE OHNE NACHKOMMASTELLE (6. Oktober). <<< Weisung im Wortlaut:
 * «Reaktionskräfte ohne nachkomma stelle.» Kräfte in kN und Momente in kNm
 * der Tabelle und der zulässigen Standardlasten ganzzahlig; die Lage x
 * bleibt auf den Zentimeter. Unter einem halben kN steht 0, nicht «−0».
 */
const f0 = (v) => (Number.isFinite(v)
  ? (Math.abs(v) < 0.5 ? 0 : v).toFixed(0).replace('-', '−') : '–');

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
  // Das Jochende ohne Masten (2. Oktober) führt alles wie ein Mastfuss.
  if (z.art === 'mast' || z.art === 'jochende') return new Set(['Mq', 'Hq', 'Ml', 'Hl', 'T']);
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
  const vText = (b) => (b ? `${f0(b.Vmin.wert)} / ${f0(b.Vmax.wert)}` : '–');
  const vTitel = (b) => (b ? ` title="${esc(`min: ${b.Vmin.bez} · max: ${b.Vmax.bez}`)}"` : '');
  const anteil = (a) => (a ? `${Math.round(a.prozent * 100)} / ${Math.round((1 - a.prozent) * 100)}` : '–');
  const anteilTitel = (a) => (a ? ` title="${esc(`quer: ständig ${f0(a.staendig)}, veränderlich ${f0(a.veraenderlich)}`)}"` : '');
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
    ? `<td class="num"${titel(b, s.key)}>${f0(b[s.key]?.wert)}</td>`
    : '<td class="num rk-leer">–</td>')).join('');
  // Was aufs Blatt kommt, wählt man (30. September: «beim output noch
  // bestimmen können ob man den havariefall / standardlasten / Hinweistext
  // mit plotten will»).
  const zul = standard && mast && z.fundament ? z.fundament : null;
  const hav = havarie ? z.havarie : null;
  const gew = z.gewaehlt ?? null;
  const n = 1 + (hav ? 1 : 0) + (gew ? 1 : 0) + (zul ? 1 : 0);
  // Der Typ steht auch, wenn die Zeile der Standardlasten aus ist.
  const fund = mast ? esc(z.fundament?.typ ?? '–')
    : z.art === 'jochende' ? 'Jochauflager'
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
    <td class="num"${anteilTitel(z.anteil?.quer)}>${mast || z.art === 'jochende' ? anteil(z.anteil?.quer) : '–'}</td>
    ${kurz ? '' : `<td class="rk-anm">${esc(massgebend(z.haupt))}</td>`}</tr>`);
  if (hav) {
    zeilen.push(`<tr class="rk-havarie"><td class="rk-art">Havarie</td>
      <td class="num"${vTitel(hav)}>${vText(hav)}</td>${werte(hav)}
      <td class="num rk-leer">–</td>${kurz ? '' : `<td class="rk-anm">${esc(massgebend(hav))}</td>`}</tr>`);
  }
  if (gew) {
    // Der oben gewählte Lastfall (2. Oktober), mit Vorzeichen.
    zeilen.push(`<tr class="rk-gewaehlt"><td class="rk-art">gewählter Fall</td>
      <td class="num">${f0(gew.Vmin.wert)}</td>${REAKTION_SPALTEN.map((s) => (hat.has(s.key)
        ? `<td class="num">${f0(gew[s.key]?.wert)}</td>` : '<td class="num rk-leer">–</td>')).join('')}
      <td class="num rk-leer">–</td>${kurz ? '' : `<td class="rk-anm">${esc(gew.bez)}</td>`}</tr>`);
  }
  if (zul) {
    zeilen.push(`<tr class="rk-zul"><td class="rk-art">Standardlast</td>
      <td class="num">0 / ${f0(zul.Vmax)}</td>
      <td class="num" title="veränderlich allein ≤ ${f0(zul.Mq_ver)}">${f0(zul.Mq)}</td>
      <td class="num" title="veränderlich allein ≤ ${f0(zul.Hq_ver)}">${f0(zul.Hq)}</td>
      <td class="num">${f0(zul.Ml)}</td><td class="num">${f0(zul.Hl)}</td>
      <td class="num">${f0(zul.T)}</td>
      <td class="num">${Number(zul.Mq) > 0 ? `${Math.round(100 - 100 * zul.Mq_ver / zul.Mq)} / ${Math.round(100 * zul.Mq_ver / zul.Mq)}` : '–'}</td>
      ${kurz ? '' : `<td class="rk-anm">zulässig, Gelände ${esc(gelaendeVon(zul.gelaende).text)}</td>`}</tr>`);
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
    const spalten = [['Einwirkung', z.haupt], ...(z.havarie ? [['Havarie', z.havarie]] : []),
      // Der oben gewählte Lastfall (2. Oktober), mit Vorzeichen.
      ...(z.gewaehlt ? [['gew. Fall', z.gewaehlt]] : [])];
    const n = spalten.length + (zul ? 1 : 0);
    const breite = Math.floor(62 / n);
    const fund = z.art === 'mast' ? (zul?.typ ?? '')
      : z.art === 'laengsanker' ? 'Seil in Gleisrichtung'
      : [z.anker?.typ, z.anker?.richtung === 'y' ? 'längs' : z.anker?.richtung === 'x' ? 'quer' : '']
        .filter(Boolean).join(' · ');
    const zeile = (label, einheit, werte, zulWert) => `<tr><th>${label} <span class="rk-einheit">[${einheit}]</span></th>${
      werte.join('')}${zul ? `<td class="num rk-zulw">${zulWert}</td>` : ''}</tr>`;
    const v = zeile('F_z (V) min/max', 'kN',
      spalten.map(([, b]) => `<td class="num"${b === z.gewaehlt && b ? ` title="${esc(b.bez)}"` : ''}>${
        !b ? '–' : b === z.gewaehlt ? f0(b.Vmin.wert) : `${f0(b.Vmin.wert)} / ${f0(b.Vmax.wert)}`}</td>`),
      zul ? `0 / ${f0(zul.Vmax)}` : '');
    // Gegliedert wie der Jochanschluss (9. Oktober, mit Bild des Blocks:
    // «kannst du diese gliederung auch bei den reaktionskräfte übernhmen»).
    const GRUPPE = { quer: 'Lastfall quer zum Gleis', laengs: 'Lastfall längs zum Gleis', torsion: 'Torsion' };
    let letzte = null;
    const rest = REAKTION_SPALTEN.filter((s) => hat.has(s.key)).map((s) => {
      const kopf = s.richtung !== letzte ? `<tr class="rk-grp"><th colspan="${n + 1}">${GRUPPE[s.richtung] ?? ''}</th></tr>` : '';
      letzte = s.richtung;
      return kopf + zeile(kopfText[s.key], s.einheit,
        spalten.map(([, b]) => `<td class="num"${b?.[s.key]?.bez ? ` title="${esc(b[s.key].bez)}"` : ''}>${
          b ? f0(b[s.key]?.wert) : '–'}</td>`),
        zul ? f0(zul[s.key]) : '');
    }).join('');
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
  /*
   * >>> ANBAUTEILE RECHTWINKLIG, NICHT DIAGONAL (9. Oktober). <<< Frage mit
   * Bild (Zusatzleiter am Mastaufsatz als schräge Striche): «warum ist hier
   * der anschluss so diagonal eingezeichnet?» Das Stabmodell verbindet die
   * Punkte eines Anbauteils seit dem 4. Oktober DIREKT (weniger Elemente,
   * starr - die Rechnung ist dieselbe); die Skizze zeichnete diese Stäbe ab.
   * Sie zeigt ein schräges Glied jetzt wie das 3D-Bild: ab seinem Anfang
   * erst lotrecht, dann waagrecht.
   */
  const strich = (kl, a, b, c, d) => `<line${kl} x1="${r1(X(a))}" y1="${r1(Z(b))}" x2="${r1(X(c))}" y2="${r1(Z(d))}"/>`;
  const linien = skizze.linien.map((l) => {
    const kl = l[4] === 1 ? ' class="sk-seil"' : l[4] === 2 ? ' class="sk-anbau"' : '';
    if (l[4] === 2 && Math.abs(l[0] - l[2]) > 0.02 && Math.abs(l[1] - l[3]) > 0.02) {
      const [ax, az, bx, bz] = l[5] === 1 ? [l[2], l[3], l[0], l[1]] : l;
      return strich(kl, ax, az, ax, bz) + strich(kl, ax, bz, bx, bz);
    }
    return strich(kl, l[0], l[1], l[2], l[3]);
  }).join('');
  // Die gestrichelte Grundlinie ist weg (2. Oktober, «nimm noch die strichlierte linie raus»).
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
  // Die Leiter (9. Oktober): ein kleiner Ring mit Punkt an ihrem Angriffspunkt.
  const leiter = (skizze.leiter ?? []).map((p) =>
    `<circle class="sk-leiter" cx="${r1(X(p[0]))}" cy="${r1(Z(p[1]))}" r="2.6"/>`
    + `<circle class="sk-leiter-kern" cx="${r1(X(p[0]))}" cy="${r1(Z(p[1]))}" r="0.9"/>`).join('');
  // Die neuen Bauteile in Rot (8. Oktober, Blatt Bestandesschutz).
  const neu = (daten?.neu?.linien ?? []).map((l) =>
    `<line class="sk-neu" x1="${r1(X(l[0]))}" y1="${r1(Z(l[1]))}" x2="${r1(X(l[2]))}" y2="${r1(Z(l[3]))}"/>`).join('')
    + (daten?.neu?.punkte ?? []).map((p) =>
      `<circle class="sk-neu-punkt" cx="${r1(X(p[0]))}" cy="${r1(Z(p[1]))}" r="2.2"/>`).join('');
  return `<svg class="rk-skizze" viewBox="0 0 ${breite} ${hoehe}" width="${breite}" height="${hoehe}"
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Übersichtsskizze quer zum Gleis">
    <style>line{stroke:#444;stroke-width:0.7}.sk-boden{stroke:#aaa;stroke-dasharray:4 3}
      .sk-seil{stroke:#444;stroke-width:0.8;stroke-dasharray:5 3}
      .sk-anbau{stroke:#1d5fa8;stroke-width:1.1}
      .sk-leiter{fill:#fff;stroke:#1d5fa8;stroke-width:1}.sk-leiter-kern{fill:#1d5fa8}
      .sk-neu{stroke:#c62828;stroke-width:2}.sk-neu-punkt{fill:#c62828}
      .sk-lager{stroke:#111;stroke-width:1.4}.sk-schraffur{stroke:#111;stroke-width:0.7}
      .sk-anker{stroke:#111;stroke-width:1.2}.sk-umgeklappt{stroke-dasharray:6 3}
      .sk-gelenk{fill:#fff;stroke:#111;stroke-width:0.9}
      text{font:10px sans-serif;fill:#222}
      .sk-titel{font:9px sans-serif;fill:#1a1a1a;paint-order:stroke;stroke:#fff;stroke-width:3px}</style>
    ${linien}${leiter}${neu}${marken}${titel}</svg>`;
}

/**
 * Der Block «Momente – Drehachse» der Achsbilder - EINE Form für alle Blätter
 * (9. Oktober: «Textblock etwas kleiner machen und formatierung an allen
 * blättern anchziehen»): Titel, darunter Moment und Drehachse in zwei Spalten,
 * 9 px (die Achsanschriften 10 px).
 */
function momentBlock(x, y, gross) {
  const a = gross ? ['X', 'Y', 'Z'] : ['x', 'y', 'z'];
  const z = (i, t) => `<text class="mom" x="${x}" y="${y + 11 * (i + 1)}">${t}</text>`
    + `<text class="mom" x="${x + 52}" y="${y + 11 * (i + 1)}">um die ${a[i]}-Achse</text>`;
  return `<text class="mom momt" x="${x}" y="${y}">Momente – Drehachse</text>`
    + z(0, 'M_x (M,l)') + z(1, 'M_y (M,q)') + z(2, 'M_z (T)');
}

/**
 * Das Achssystem der Tabelle: X quer, Y längs, Z nach unten - Druck auf das
 * Fundament positiv. Eigene Zeichnung, dieselbe Aussage wie die Skizze der
 * Einwirkungen.
 *
 * >>> RECHTE HAND (30. September). <<<
 * «Beachte beim koordinatensystem die rechte hand regel im modell sowie in
 * der output liste». Hier zeigte Y schräg nach hinten - mit X nach rechts
 * und Z nach unten ist das ein Linkssystem. Rechtshändig zeigt Y ZUM
 * Betrachter: X × Y = Z. Damit ist Y der Tabelle der y-Achse des 3D
 * entgegengesetzt (dort vom Betrachter weg, Längsansicht von −y); X ist
 * dasselbe. In der Tabelle ändert das keine Zahl - Horizontalkräfte und
 * Momente stehen als ±Betrag, V zählt nach unten.
 *
 * >>> SCHLICHTER (2. Oktober). <<<
 * «nimm noch das zum Betrachtet weg und beschrifte die achsen klarer ohne
 * die Lastbeispiele und nimm noch die rechte hand hinweis weg» - dazu fällt
 * die gestrichelte Mastachse weg («nimm noch die strichlierte linie raus»,
 * ebenso die Grundlinie der Skizze). Die Momentzeilen erklären die
 * Spaltenköpfe der Tabelle und bleiben.
 */
export function achsSvg() {
  return `<svg class="rk-achsen" viewBox="0 0 330 170" width="330" height="170"
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Achssystem der Tabelle">
    <defs><marker id="rk-pf" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7"
      markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#222"/></marker></defs>
    <style>line{stroke:#222;stroke-width:1.4}text{font:12px sans-serif;fill:#222}
      .klein{font-size:10px;fill:#555}.mom{font-size:9px;fill:#555}.momt{font-weight:600;fill:#222}.mast{stroke:#aaa;stroke-width:1;stroke-dasharray:5 3}
      .fund{fill:none;stroke:#bbb;stroke-width:1}</style>
    <rect class="fund" x="128" y="58" width="44" height="34"/>
    <line x1="150" y1="58" x2="270" y2="58" marker-end="url(#rk-pf)"/>
    <text x="232" y="50">X</text>
    <text class="klein" x="196" y="76">quer zum Gleis</text>
    <line x1="150" y1="58" x2="102" y2="100" marker-end="url(#rk-pf)"/>
    <text x="88" y="112">Y</text>
    <text class="klein" x="20" y="128">längs zum Gleis</text>
    <line x1="150" y1="58" x2="150" y2="150" marker-end="url(#rk-pf)"/>
    <text x="156" y="160">Z</text>
    <text class="klein" x="170" y="160">nach unten</text>
    ${momentBlock(188, 98, true)}
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
/*
 * >>> DIE HINWEISE NACH DER EINWIRKUNGS-MAPPE (1. Oktober). <<<
 *
 * Weisung: «Die HInweise im Blatt reaktionskräfte überarbeiten, nimm die
 * excel einwirkungen als vorlage. den textblock bearbeitbar machen und man
 * sollte es als vorlage speichern können danach.» Aufbau und Reihenfolge
 * wie der Block «Hinweise» der Zusammenfassung: Zusammensetzung, getrennte
 * Betrachtung längs/quer, abhebende Vertikallasten, Grenzwerte der
 * Gebrauchstauglichkeit - die Grenzwerte als die in der Anwendung
 * eingestellten (das, was nachgewiesen wurde). Danach, was nur dieses Blatt
 * hat. Ohne Regelwerksnummer und Betreibernamen (die Ablage ist
 * öffentlich); wer sie will, schreibt sie auf dem Blatt dazu und speichert
 * den Text als Vorlage - sie bleibt dann in seinem Browser.
 */
/*
 * >>> GEKUERZT AUF DIE FASSUNG DES AUFTRAGGEBERS (2. Oktober). <<<
 * «kannst du den vorlagetext so anpassen» - mit dem Bild seines Blattes:
 * ohne den Satz zum Wind ohne Abminderung, ohne «nicht überlagert / je
 * Spalte der massgebende Fall», ohne den Nachsatz zur Standardlastzeile,
 * Standardlasten ohne Geländeneigung, ohne den Satz zum Stabwerk.
 */
export function hinweiseHtml(daten, { havarie = true, standard = true } = {}) {
  const g = daten?.grenzen;
  const gzg = g ? [
    `Mastspitze L/${Math.round(g.spitzeN)} quer und längs zum Gleis`,
    `Fahrdraht quer zum Gleis ${f1(g.fahrdraht * 1000)} mm`,
    Number.isFinite(g.verdrehungGrad) ? `Verdrehung des Masten um seine Achse ${f1(g.verdrehungGrad)}°` : '',
  ].filter(Boolean) : [];
  return `<h2 class="rk-hinweise-titel">Hinweise</h2>
  <ul class="rk-hinweise">
    <li>Die Werte setzen sich aus den veränderlichen und den ständigen Lasten
      zusammen - charakteristisch, alle Teilsicherheitsbeiwerte 1.</li>
    <li>Die Einwirkungen aus den veränderlichen Lasten können bei den
      jeweiligen Gefährdungsbildern längs und quer zum Gleis separat
      betrachtet werden.</li>
    <li>Die negativen Werte bei den Vertikallasten sind als <b>abhebend</b>
      anzusetzen (Druck positiv). Momente, Horizontalkräfte und Torsion stehen
      als Betrag (±) - ihre Richtung wechselt mit dem Wind.</li>
    ${gzg.length ? `<li>Für die Gebrauchstauglichkeitsnachweise sind folgende Grenzwerte
      einzuhalten (Betriebswind ψ 0.70):
      <ul>${gzg.map((x) => `<li>${x}</li>`).join('')}</ul></li>` : ''}
    ${havarie ? `<li>Der Havariefall (Leiterriss, aussergewöhnlich, Beiwerte 1) steht in
      einer eigenen Zeile${havarieLeiter(daten).length ? `; reissen kann ${havarieLeiter(daten)
      .map((n) => `«${esc(n)}»`).join(', ')}, je Leiter ein Fall mit Längszug ±y` : ''}.</li>` : ''}
    <li>«ständig / veränderl.»: Anteil am Moment quer zum Gleis M_y (M,q) -
      ständig ist der Betrag unter dem ganzen Eigengewicht G, veränderlich
      der grösste aus Wind oder Schnee allein; gezeigt ständig / (ständig +
      veränderlich).</li>
    ${standard ? `<li>Standardlasten: zulässige Werte des Fundamenttyps.</li>` : ''}
  </ul>`;
}

/**
 * Ein bearbeiteter Hinweistext ist HTML aus dem Blatt. Was darin nichts zu
 * suchen hat, fällt weg: Skripte, Ereignis-Attribute, eingebettete Rahmen.
 */
export function hinweiseBereinigen(html) {
  return String(html ?? '')
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Das Blatt als eigenständiges HTML-Dokument (A4 quer), zum Drucken oder
 * als PDF.
 */
export function reaktionenBlattHtml(daten, { havarie = true, standard = true, hinweise = true,
                                              hinweisText = null } = {}) {
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
    .rk-hinweise { margin: 6px 0 0 16px; padding: 0; }
    .rk-hinweise li { margin: 2px 0; }
    .rk-hinweise ul { margin: 2px 0 2px 16px; padding: 0; }
    .rk-hinweise-titel { font-size: 13px; margin: 12px 0 0; }
    /* Bearbeitbar - am Bildschirm angedeutet, im Druck unsichtbar. */
    @media screen { #rk-hinweise { outline: 1px dashed #c8c8c8; outline-offset: 4px; border-radius: 2px; }
      #rk-hinweise:focus { outline-color: #4a5cb8; } }
    .fuss { margin-top: 10px; font-size: 9.5px; color: #777; }
  </style></head><body>
  <h1>Reaktionskräfte · Charakteristische Werte</h1>
  <p class="unter">${kopf} · ${esc(daten?.datum ?? '')}</p>
  <div class="oben">
    <figure>${skizzeSvg(daten?.skizze, daten?.zeilen, { daten })}
      <figcaption>Übersicht quer zum Gleis, aus dem Stabmodell</figcaption></figure>
    <figure>${achsSvg()}
      <figcaption>Achssystem der Tabelle</figcaption></figure>
  </div>
  ${reaktionenTabelleHtml(daten, { havarie, standard })}
  ${hinweise ? `<div id="rk-hinweise" contenteditable="true" spellcheck="false"
    title="Text bearbeitbar - in der Leiste oben als Vorlage speichern">${
    hinweisText ? hinweiseBereinigen(hinweisText) : hinweiseHtml(daten, { havarie, standard })}</div>` : ''}
  <p class="fuss">${esc(daten?.fassung ?? '')}</p>
  </body></html>`;
}

/**
 * Kräfte am Jochanschluss (7. Oktober, «unter Auflager eine Tabelle zu
 * Kräfte am Jochanschluss ergänzen»): je Mast und Gurt die Kraft des Jochs
 * auf den Masten, charakteristisch, min / max je Komponente.
 */
export function anschlussKurzHtml(liste, mastName = (m) => m, resultierend = false) {
  if (!liste?.length) return '';
  if (resultierend && liste.resultierende?.length) return anschlussResultierendeHtml(liste.resultierende, mastName);
  const zelle = (k) => `<td class="num" title="${esc(`min: ${k.min?.bez ?? '–'} · max: ${k.max?.bez ?? '–'}`)}">${
    k.min ? `${f1(k.min.wert)}<br>${f1(k.max.wert)}` : '–'}</td>`;
  return `<table class="dt rk-anschluss">
    <colgroup><col style="width:31%"><col style="width:23%"><col style="width:23%"><col style="width:23%"></colgroup>
    <thead><tr><th>Anschluss<br><span class="rk-einheit">min / max [kN]</span></th>
      <th class="num">F_x<br><span class="rk-einheit">quer</span></th>
      <th class="num">F_y<br><span class="rk-einheit">längs</span></th>
      <th class="num">F_z ↑<br><span class="rk-einheit">lotrecht</span></th></tr></thead>
    <tbody>${liste.map((a) => `<tr><th title="${esc(`${a.tw ? `${a.tw} · ` : ''}Mast ${mastName(a.mast)} · ${a.gurt === 'OG' ? 'Obergurt' : 'Untergurt'} ${a.seite === 'L' ? 'links' : 'rechts'}`)}">${esc(`${a.tw ? `${a.tw} ` : ''}${mastName(a.mast)} ${a.gurt} ${a.seite}`)}</th>
      ${zelle(a.Fx)}${zelle(a.Fy)}${zelle(a.Fz)}</tr>`).join('')}</tbody></table>`;
}

/*
 * Resultierende je Jochende - WIE DIE TABELLE AM MASTFUSS (9. Oktober, «kann
 * man die auflagerreaktionen beim joch ähnlich aufführen wie die beim
 * Masten?»): je Jochende eine kleine Tabelle, die Grössen als Zeilen in
 * derselben Reihenfolge und Benennung (F_z, M_y, F_x, M_x, F_y, M_z), als
 * Spalten das Kleinste und das Grösste über die Zustände. Anders als am
 * Mastfuss MIT Vorzeichen (global, F_z nach oben): es ist die Kraft des
 * Jochs auf den Masten, kein ±Betrag gegen eine zulässige Last. Momente um
 * die Mitte des Anschlusses. Die erste Fassung vom 8. Oktober führte F und
 * M als zwei Zeilen mit den Spalten x / y / z.
 */
/**
 * >>> DER LASTFALL STEHT BEI DER ZAHL (9. Oktober). <<< Weisung: «Lastfall
 * angeben bei der auswertung jochauflager.» Bisher nur im Titel der Zelle
 * (Überfahren). Kurz angeschrieben: «G», «G + Wind +y», «G + Schnee».
 */
export const fallKurz = (bez) => String(bez ?? '')
  .replace(/\s*\((quer|längs) zum Gleis\)/g, '')
  .replace(/\s+leitend$/, '')
  .replace(/^Ständig \+ /, 'G + ')
  .replace(/^Ständig.*$/, 'G');
// Eine Nachkommastelle (9. Oktober: «Die rundung der resultate auf eine
// kommastelle und nicht zwei») - am Jochanschluss, Reiter und Blatt.
const mitFall = (x) => (x ? `${f1(Math.abs(x.wert) < 0.05 ? 0 : x.wert)}<span class="rk-fall">${esc(fallKurz(x.bez))}</span>` : '–');

/*
 * >>> EINFACH WIE DIE REAKTIONSKRÄFTE (9. Oktober). <<< Mit Bild des Blocks
 * (je Grösse min und max, darunter je ein Lastfall): «können wir das nicht auf
 * die art vereinfacht aufführen wie bei den reaktionskräften?» Im Reiter steht
 * je Jochende EINE Zahlenspalte wie am Mastfuss: F_z als min / max, die
 * übrigen als ±Betrag (der grössere von |min| und |max|), daneben der
 * massgebende Lastfall kurz. Die volle Form min / max mit Vorzeichen bleibt
 * im Blatt.
 */
/** «T1 · M2» bzw. am Mittelmasten «M2 · Summe T1 + T2». */
const jochendeName = (a, mastName) => (a.summe
  ? `${mastName(a.mast)} · Summe ${a.teile.join(' + ')}`
  : `${a.tw ? `${a.tw} · ` : ''}${mastName(a.mast)}`);

/** Der massgebende von min und max: der mit dem grösseren Betrag. */
const betragVon = (k) => {
  const a = k?.min, b = k?.max;
  if (!a && !b) return null;
  return Math.abs(a?.wert ?? 0) >= Math.abs(b?.wert ?? 0) ? a : b;
};

function anschlussResultierendeHtml(res, mastName) {
  const betrag = betragVon;
  const titel = (k) => esc(`min: ${k.min?.bez ?? '–'} · max: ${k.max?.bez ?? '–'}`);
  const zeile = (label, einheit, k) => {
    const m = betrag(k);
    return `<tr><th>${label} <span class="rk-einheit">[${einheit}]</span></th>
    <td class="num" title="${titel(k)}">${m ? f1(Math.abs(m.wert)) : '–'}</td>
    <td class="rk-fallspalte">${m && Math.abs(m.wert) >= 0.05 ? esc(fallKurz(m.bez)) : ''}</td></tr>`;
  };
  const v = (k) => `<tr><th>F_z ↑ (V) min/max <span class="rk-einheit">[kN]</span></th>
    <td class="num" title="${titel(k)}">${k.min ? `${f1(k.min.wert)} / ${f1(k.max.wert)}` : '–'}</td>
    <td class="rk-fallspalte">${k.min ? esc(fallKurz(k.min.bez)) : ''}</td></tr>`;
  // Gliederung wie die Köpfe des Reaktionsblatts (9. Oktober: «bei der
  // gliederung die Einwirkungen Quer und Lägns zum Gleis vorgehmen so dass man
  // besser erkennen kann welche zusammengehören (wind x / y)»).
  const gruppe = (t) => `<tr class="rk-grp"><th colspan="3">${t}</th></tr>`;
  return res.map((a) => `<table class="dt rk-kurz rk-jochende${a.summe ? ' rk-summe' : ''}">
      <colgroup><col style="width:42%"><col style="width:26%"><col style="width:32%"></colgroup>
      <thead><tr><th><b>${esc(jochendeName(a, mastName))}</b>
          <span class="rk-x" title="${a.anzahl} Gurtanschlüsse">${a.summe
            ? 'Mittelmast · beide Joche im selben Lastfall' : 'Jochende'}</span></th>
        <th class="num">Einwirkung</th><th>Lastfall</th></tr></thead>
      <tbody>${v(a.Fz)}${gruppe('Lastfall quer zum Gleis')}${zeile('±M_y (M,q)', 'kNm', a.My)}${zeile('±F_x (H,q)', 'kN', a.Fx)}${
        gruppe('Lastfall längs zum Gleis')}${zeile('±M_x (M,l)', 'kNm', a.Mx)}${zeile('±F_y (H,l)', 'kN', a.Fy)}${
        gruppe('Torsion')}${zeile('±M_z (T)', 'kNm', a.Mz)}</tbody></table>`).join('');
}

/**
 * >>> DAS BLATT «KRÄFTE AM JOCHANSCHLUSS» (9. Oktober). <<< Weisung: «für die
 * jochreaktionen auch ein blatt zusammenstellen ähnlich wie Reaktionskräfte
 * und button aufführen.» A4 quer wie das Reaktionsblatt: die Übersicht aus
 * dem Stabmodell, je Jochende eine Zeile mit der Resultierenden (Kräfte und
 * Momente, je das Kleinste und das Grösste), auf Wunsch darunter die
 * einzelnen Gurtanschlüsse. Dieselben Zahlen wie im Reiter Auflager.
 *
 * @param {object} daten  wie beim Reaktionsblatt (skizze, zeilen, titel, linie, …)
 *                        dazu `anschluss` (Liste mit `.resultierende`) und `mastName`
 */
/**
 * >>> ACHSEN AUF DEM BLATT DES JOCHANSCHLUSSES (9. Oktober). <<< Mit Bild des
 * Blatts: «Hier zur orientierung die system achsen zeigen». Anders als am
 * Mastfuss gilt hier das globale System des Modells: x quer, y längs, z nach
 * OBEN. Rechtshändig zeigt y damit vom Betrachter weg (Längsansicht von −y,
 * wie die Übersicht daneben und das 3D).
 *
 * Die Momente stehen als kleine Tabelle mit Titel «Momente – Drehachse»
 * (9. Oktober: «kannst du dies gliedern und mit einem Titell versehen, dass
 * man weiss das die achsen gemeint sind»), ebenso im Blatt der Reaktionskräfte.
 */
export function achsSvgGlobal() {
  return `<svg class="rk-achsen" viewBox="0 0 330 200" width="330" height="200"
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Achssystem des Blatts">
    <defs><marker id="rk-pfg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7"
      markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#222"/></marker></defs>
    <style>line{stroke:#222;stroke-width:1.4}text{font:12px sans-serif;fill:#222}
      .klein{font-size:10px;fill:#555}.mom{font-size:9px;fill:#555}.momt{font-weight:600;fill:#222}</style>
    <line x1="70" y1="175" x2="210" y2="175" marker-end="url(#rk-pfg)"/>
    <text x="216" y="179">x</text>
    <text class="klein" x="120" y="191">quer zum Gleis</text>
    <line x1="70" y1="175" x2="70" y2="34" marker-end="url(#rk-pfg)"/>
    <text x="58" y="30">z</text>
    <text class="klein" x="6" y="100">nach oben</text>
    <line x1="70" y1="175" x2="136" y2="112" marker-end="url(#rk-pfg)"/>
    <text x="142" y="108">y</text>
    <text class="klein" x="156" y="108">längs zum Gleis</text>
    ${momentBlock(156, 126, false)}
  </svg>`;
}

export function anschlussBlattHtml(daten, { einzeln = true, hinweise = true } = {}) {
  const liste = daten?.anschluss ?? [];
  const res = liste.resultierende ?? [];
  const mn = daten?.mastName ?? ((m) => m);
  const kopf = [daten?.linie ? `Linie ${esc(daten.linie)}` : '',
    daten?.km ? `km ${esc(daten.km)}` : '', daten?.ortschaft ? esc(daten.ortschaft) : '']
    .filter(Boolean).join(' · ') || 'Linie / Station: –';
  /*
   * >>> NUR DAS MASSGEBENDE (9. Oktober). <<< Mit Bild des Blatts (je Grösse
   * min und max, je mit Lastfall): «diese auswertung auf die massgebende
   * reduzieren (grösster wert bei y und grösster wert bei x, wie bei den
   * fundamenten)». Wie am Mastfuss: F_z als min / max, alle übrigen als
   * ±Betrag (der grössere von |min| und |max|) mit seinem Lastfall darunter.
   */
  const paar = (k) => `<td class="num" title="${esc(k.min?.bez ?? '')}">${mitFall(k.min)}</td>`
    + `<td class="num" title="${esc(k.max?.bez ?? '')}">${mitFall(k.max)}</td>`;
  const einer = (k) => {
    const m = betragVon(k);
    return `<td class="num" title="${esc(`min: ${k?.min?.bez ?? '–'} · max: ${k?.max?.bez ?? '–'}`)}">${
      m ? `${f1(Math.abs(m.wert))}${Math.abs(m.wert) >= 0.05 ? `<span class="rk-fall">${esc(fallKurz(m.bez))}</span>` : ''}` : '–'}</td>`;
  };
  const SP = [['My', '±M_y (M,q)', 'kNm'], ['Fx', '±F_x (H,q)', 'kN'],
              ['Mx', '±M_x (M,l)', 'kNm'], ['Fy', '±F_y (H,l)', 'kN'], ['Mz', '±M_z (T)', 'kNm']];
  const tabRes = `<table><colgroup><col style="width:23%">${'<col style="width:11%">'.repeat(7)}</colgroup>
    <thead><tr><th rowspan="2">Jochende</th><th colspan="2" class="rk-gruppe">Vertikalkraft F_z ↑ (V) [kN]</th>
        <th colspan="2" class="rk-gruppe">Lastfall quer zum Gleis</th><th colspan="2" class="rk-gruppe">Lastfall längs zum Gleis</th>
        <th class="rk-gruppe">Torsion</th></tr>
      <tr><th class="num">min</th><th class="num">max</th>${SP.map(([, t, e]) => `<th class="num">${t} [${e}]</th>`).join('')}</tr></thead>
    <tbody>${res.map((a) => `<tr class="rk-haupt${a.summe ? ' rk-summe' : ''}"><td class="rk-name"><b>${esc(jochendeName(a, mn))}</b>
        <span class="rk-x">${a.summe ? 'Mittelmast · beide Joche im selben Lastfall' : `${a.anzahl} Gurtanschlüsse`}</span></td>${
        paar(a.Fz)}${SP.map(([k]) => einer(a[k])).join('')}</tr>`).join('')}</tbody></table>`;
  const tabEinzel = einzeln && liste.length ? `<h2 class="rk-hinweise-titel">Einzelne Gurtanschlüsse</h2>
    <table style="width:62%"><colgroup><col style="width:32%">${'<col style="width:17%">'.repeat(4)}</colgroup>
    <thead><tr><th rowspan="2">Anschluss</th><th colspan="2" class="rk-gruppe">F_z ↑ (lotrecht) [kN]</th>
        <th rowspan="2" class="num">±F_x (quer) [kN]</th><th rowspan="2" class="num">±F_y (längs) [kN]</th></tr>
      <tr><th class="num">min</th><th class="num">max</th></tr></thead>
    <tbody>${liste.map((a, i) => `<tr${i && liste[i - 1].mast !== a.mast ? ' class="rk-haupt"' : ''}><td>${
      esc(`${a.tw ? `${a.tw} · ` : ''}${mn(a.mast)} · ${a.gurt === 'OG' ? 'Obergurt' : 'Untergurt'} ${a.seite === 'L' ? 'links' : 'rechts'}`)}</td>${
      paar(a.Fz)}${einer(a.Fx)}${einer(a.Fy)}</tr>`).join('')}</tbody></table>` : '';
  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
  <title>Kräfte am Jochanschluss</title>
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
    thead th.num { text-align: right; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .rk-gruppe { text-align: center !important; color: #333; }
    .rk-name b { display: block; font-size: 12px; }
    .rk-x { display: block; color: #666; font-size: 9.5px; }
    .rk-fall { display: block; color: #666; font-size: 8px; white-space: normal; line-height: 1.15; }
    tbody tr.rk-haupt td { border-top: 1.6px solid #888; }
    tbody tr.rk-summe td { background: #f3f5fa; }
    .rk-hinweise { margin: 6px 0 0 16px; padding: 0; }
    .rk-hinweise li { margin: 2px 0; }
    .rk-hinweise-titel { font-size: 13px; margin: 12px 0 4px; }
    .fuss { margin-top: 10px; font-size: 9.5px; color: #777; }
  </style></head><body>
  <h1>Kräfte am Jochanschluss · Charakteristische Werte</h1>
  <p class="unter">${kopf} · ${esc(daten?.datum ?? '')}</p>
  <div class="oben">
    <figure>${skizzeSvg(daten?.skizze, daten?.zeilen, { daten })}
      <figcaption>Übersicht quer zum Gleis, aus dem Stabmodell</figcaption></figure>
    <figure>${achsSvgGlobal()}
      <figcaption>Achssystem des Blatts (global, wie im Modell)</figcaption></figure>
    <div style="max-width:330px"><b>Achsen und Vorzeichen</b>
      <ul class="rk-hinweise"><li>Kraft des Jochs AUF den Masten, global: x quer zum Gleis, y längs zum Gleis, z nach oben
        (Gewicht des Jochs negativ).</li>
        <li>Momente um die Mitte der Gurtanschlüsse am Masten, rechte Hand.</li>
        <li>F_z als min / max mit Vorzeichen; alle übrigen als ±Betrag (der massgebende Wert), darunter sein Lastfall (G = ständig).</li></ul></div>
  </div>
  <h2 class="rk-hinweise-titel">Resultierende je Jochende</h2>
  ${res.length ? tabRes : '<p>Keine Anschlüsse im Stabwerk.</p>'}
  ${tabEinzel}
  ${hinweise ? `<h2 class="rk-hinweise-titel">Hinweise</h2><ul class="rk-hinweise">
    <li>Charakteristische Werte aus dem Stabwerk; Hülle über «Ständig» (ganzes G) und «Ständig + Wind / Schnee» je Richtung,
      Wind ohne Abminderung. Der Havariefall ist nicht enthalten.</li>
    <li>Am Mittelmasten steht zusätzlich die Summe beider Joche: je Lastfall summiert, dann umhüllt (Momente um die Mitte aller Anschlüsse dieses Masten).</li>
    <li>Die Resultierende ist je Zustand über die Gurtanschlüsse summiert und dann umhüllt - sie ist deshalb nicht die Summe
      der Grösstwerte der einzelnen Gurte.</li>
    <li>Die Verteilung auf die Gurte folgt der eingestellten Auflagerbedingung am Masten (welcher Gurt in welcher Richtung hält).</li>
    <li>Für die Bemessung der Gurtverbindung (Bügelschrauben) gilt der Block «Bügelschrauben» mit den Bemessungswerten.</li></ul>` : ''}
  <p class="fuss">${esc(daten?.fassung ?? '')}</p>
  </body></html>`;
}
