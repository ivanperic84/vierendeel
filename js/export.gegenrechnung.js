/**
 * export.gegenrechnung.js
 * ---------------------------------------------------------------------------
 * DAS KAPITEL «GEGENRECHNUNG AXISVM» (9. Oktober).
 *
 * «Bericht so wie vorgeschlagen in der App bauen, wäre es möglich die
 * spannungsverläufe zu plotten so wi im Axisvm?» Der Vergleich kommt fertig
 * aus `core.axisvergleich.js`; hier wird er geschrieben: je Bauteil die
 * Ausnutzung aus der Anwendung und aus den AxisVM-Schnittgrössen, darunter
 * je Teil der Spannungsverlauf entlang der Stäbe mit beiden Linien, zuletzt
 * die grössten Knotenwege je Lastfall.
 *
 * Die Verläufe sind Vektorbilder (SVG): ein Bild wiegt wenige Kilobyte, der
 * Bericht bleibt klein und wird beim Blättern nicht träge - anders als
 * gerasterte Farbplots des ganzen Modells.
 * ---------------------------------------------------------------------------
 */

import { esc, zahl, tabelle, STIL, FARBEN_DRUCK } from './export.nachweisbericht.js';

const TEIL = { OG: 'Obergurt', UG: 'Untergurt', blech: 'Bindebleche', UPE: 'Gurte UPE', mast: 'Mast',
               gurt: 'Gurte / Hälften', rohr: 'Rohr / Aufsatz', gabel: 'Gabel' };
const teilName = (t) => TEIL[t] ?? t;
const pz = (v) => (v === null || !Number.isFinite(v) ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)} %`);

/**
 * Der Spannungsverlauf eines Teils: Randspannung (Hülle über die
 * Nachweis-Kombinationen) über die Lage. Gurte als Treppe je Stab, Bleche
 * als Punkte je Station, der Mast als Linie über die Höhe. Ausgezogen die
 * Anwendung, gestrichelt AxisVM.
 */
export function verlaufSvg(v, { breite = 860, hoehe = 170 } = {}) {
  const P = v?.punkte ?? [];
  if (P.length < 2) return '';
  const l = 46, r = 12, o = 10, u = 26;
  const u0 = Math.min(...P.map((p) => p.u0)), u1 = Math.max(...P.map((p) => p.u1));
  const max = Math.max(1, v.maxApp, v.maxAxis) * 1.08;
  const X = (x) => l + (breite - l - r) * ((x - u0) / Math.max(u1 - u0, 1e-9));
  const Y = (y) => hoehe - u - (hoehe - o - u) * (y / max);
  const r1 = (z) => z.toFixed(1);
  const schritt = max > 200 ? 50 : max > 80 ? 20 : max > 40 ? 10 : max > 15 ? 5 : 2;
  let raster = '';
  for (let y = 0; y <= max; y += schritt) {
    raster += `<line class="gv-raster" x1="${l}" y1="${r1(Y(y))}" x2="${breite - r}" y2="${r1(Y(y))}"/>`
      + `<text class="gv-achse" x="${l - 5}" y="${r1(Y(y) + 3)}" text-anchor="end">${y}</text>`;
  }
  // Runde Teilung der Lage: höchstens rund zehn Marken.
  const teil = [0.5, 1, 2, 5, 10].find((t) => (u1 - u0) / t <= 10) ?? 20;
  let xachse = '';
  for (let x = Math.ceil(u0 / teil - 1e-9) * teil; x <= u1 + 1e-9; x += teil) {
    xachse += `<text class="gv-achse" x="${r1(X(x))}" y="${hoehe - u + 12}" text-anchor="middle">${Number(x.toFixed(1))}</text>`;
  }
  const istPunkt = (p) => Math.abs(p.u1 - p.u0) < 1e-9;
  const linie = P.every(istPunkt) && v.achse === 'z';
  const serie = (feld, klasse) => {
    if (linie) {
      const pts = P.filter((p) => Number.isFinite(p[feld])).map((p) => `${r1(X(p.u0))},${r1(Y(p[feld]))}`).join(' ');
      return `<polyline class="${klasse}" points="${pts}"/>`;
    }
    return P.filter((p) => Number.isFinite(p[feld])).map((p) => (istPunkt(p)
      ? (feld === 'app'
        ? `<circle class="${klasse} gv-punkt" cx="${r1(X(p.u0))}" cy="${r1(Y(p[feld]))}" r="2.3"/>`
        : `<path class="${klasse}" d="M${r1(X(p.u0) - 3.5)} ${r1(Y(p[feld]) - 3.5)}l7 7m0 -7l-7 7"/>`)
      : `<line class="${klasse}" x1="${r1(X(p.u0))}" y1="${r1(Y(p[feld]))}" x2="${r1(X(p.u1))}" y2="${r1(Y(p[feld]))}"/>`)).join('');
  };
  return `<svg class="gv" viewBox="0 0 ${breite} ${hoehe}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label="${esc(`Spannungsverlauf ${v.name} ${teilName(v.teil)}`)}">
    <style>.gv-raster{stroke:#dcdcdc;stroke-width:0.6}.gv-achse{font:9px sans-serif;fill:#555}
      .gv-app{stroke:#1f3f8f;stroke-width:1.6;fill:none}.gv-app.gv-punkt{fill:#1f3f8f;stroke:none}
      .gv-axis{stroke:#c8501e;stroke-width:1.4;fill:none;stroke-dasharray:5 3}
      path.gv-axis{stroke-dasharray:none;stroke-width:1.2}
      .gv-titel{font:10px sans-serif;fill:#111}</style>
    ${raster}${xachse}
    <text class="gv-achse" x="${breite - r}" y="${hoehe - 3}" text-anchor="end">${v.achse === 'z' ? 'Höhe über dem Mastfuss [m]' : 'x [m]'}</text>
    <text class="gv-achse" x="4" y="${o + 2}">σ [N/mm²]</text>
    ${serie('app', 'gv-app')}${serie('axis', 'gv-axis')}
  </svg>`;
}

/** Der Abschnitt für den Nachweisbericht (h2 mit «§», nummeriert der Bericht). */
export function gegenrechnungAbschnitt(v) {
  if (!v) return '';
  if (!v.ok) {
    return `<section><h2>§ Gegenrechnung AxisVM</h2>
      <p>Eine Ergebnisdatei aus AxisVM ist eingelesen, sie passt aber nicht zum gerechneten Stabwerk:
      ${esc(v.grund ?? '')}. Kein Vergleich.</p></section>`;
  }
  const q = v.quelle ?? {};
  const zeilen = v.teile.map((t) => [
    esc(`${t.name} · ${teilName(t.teil)}`), zahl(t.etaApp, 3), zahl(t.etaAxis, 3),
    zahl(t.sigApp, 1), zahl(t.sigAxis, 1), pz(t.abw),
    esc(t.woApp === t.woAxis ? (t.woApp ?? '—') : `${t.woApp ?? '—'} / ${t.woAxis ?? '—'}`)]);
  const m = v.abwMax;
  const verlaeufe = v.verlaeufe.map((x) => `<figure class="gv-fig"><figcaption><b>${esc(`${x.name} · ${teilName(x.teil)}`)}</b>
      · σ max Anwendung ${zahl(x.maxApp, 1)} · AxisVM ${zahl(x.maxAxis, 1)} N/mm²</figcaption>${verlaufSvg(x)}</figure>`).join('');
  const wege = v.wege.slice(0, 12).map((w) => [esc(w.name), zahl(w.app, 2), zahl(w.axis, 2), pz(w.abw), esc(w.wo ?? '—')]);
  return `<section><h2>§ Gegenrechnung AxisVM</h2>
    <p>Dasselbe Stabmodell ist über die COM-Brücke in AxisVM aufgebaut und linear statisch gerechnet${
      q.erzeugt ? ` (Ergebnisse vom ${esc(String(q.erzeugt).replace('T', ' '))}${q.datei ? `, ${esc(q.datei)}` : ''})` : ''}.
    Die Schnittgrössen an den Stabenden je Lastfall sind zurückgelesen und hier mit <b>derselben Auswertung</b>
    wie die der Anwendung nachgewiesen: dieselben Kombinationen, dieselbe Spannungsformel, dieselben
    Querschnittswerte. Was sich unterscheidet, sind allein die Schnittgrössen der beiden Rechnungen.
    ${v.passung ? `${v.passung.staebeErgebnis} von ${v.passung.staebeModell} Stäben mit Ergebnissen.` : ''}</p>
    <p><b>Ausnutzung:</b> Anwendung η ${zahl(v.etaApp, 3)}, mit den AxisVM-Schnittgrössen η ${zahl(v.etaAxis, 3)}${
      m ? `; grösste Abweichung der Randspannung ${pz(m.abw)} (${esc(`${m.name} · ${teilName(m.teil)}`)})` : ''}.</p>
    <h3>§.1 Ausnutzung je Bauteil</h3>
    ${tabelle(['Bauteil', 'η Anwendung', 'η AxisVM', 'σ Anw. [N/mm²]', 'σ AxisVM', 'Abweichung σ', 'massgebender Stab'], zeilen)}
    <p class="klein">Abweichung = σ(AxisVM) / σ(Anwendung) − 1. Stehen zwei Stäbe da, ist auf beiden Seiten ein anderer massgebend.</p>
    <h3>§.2 Spannungsverläufe</h3>
    <p>Randspannung als Hülle über die Nachweis-Kombinationen, entlang der Stäbe: Gurte je Stab, Bindebleche je
    Station, Masten über die Höhe. <span style="color:#1f3f8f">Ausgezogen bzw. Punkt: Anwendung</span> ·
    <span style="color:#c8501e">gestrichelt bzw. Kreuz: AxisVM</span>. Im Knotenbereich der Gurte (Anschnitt) wird
    nicht nachgewiesen; er fehlt in der Linie.</p>
    ${verlaeufe}
    ${wege.length ? `<h3>§.3 Knotenwege je Lastfall</h3>
      ${tabelle(['Lastfall', 'grösster Weg Anwendung [mm]', 'AxisVM [mm]', 'Abweichung', 'Knoten (AxisVM)'], wege)}` : ''}
    ${v.hinweise.length ? `<ul class="klein">${v.hinweise.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
    <p class="klein">Verglichen wird die Rechnung (Modell und Löser), nicht die Spannungsanzeige von AxisVM:
    deren Spannungen rechnet AxisVM aus seinem eigenen Querschnitt und an eigenen Auswertepunkten.</p>
  </section>`;
}

/** Die Gegenrechnung als eigenes Blatt (gleich nach dem Einlesen). */
export function gegenrechnungBlattHtml(v, kopf = {}) {
  const html = gegenrechnungAbschnitt(v).replace(/<h2>§ /g, '<h2>').replace(/<h3>§\./g, '<h3>');
  return `<!DOCTYPE html><html lang="de-CH"><head><meta charset="utf-8"><title>Gegenrechnung AxisVM</title>
<style>${FARBEN_DRUCK}${STIL}
  .gv-fig{margin:6px 0 10px;break-inside:avoid}.gv-fig figcaption{font-size:10px;margin-bottom:2px}
  .klein{font-size:10px;color:#444}</style></head><body><div class="blatt">
  <p class="klein">${esc([kopf.name, kopf.ort, kopf.datum].filter(Boolean).join(' · '))}</p>
  ${html}
  <p class="klein">${esc(kopf.fassung ?? '')}</p></div></body></html>`;
}
