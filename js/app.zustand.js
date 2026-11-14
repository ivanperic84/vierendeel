/**
 * app.zustand.js - Zustandslinien im 3D: Zustand, Aufbau für den Renderer,
 * Steuerung in der Legende.
 *
 * Weisung vom 14. November («Ja, einbauen», nach der Probe in Versand/).
 * Eingebaut wie vorgeschlagen: in der Gruppe «Resultate» ein Schalter
 * «Linie»; ist er an, zeigt die gewählte Plotgrösse (η, σ_v, M, V, N, T)
 * statt der Farbe die Zustandslinie, das Modell steht neutral. Ebene (auto /
 * quer / längs / lotrecht bzw. waagrecht), «Reaktionen dazu», Teile und
 * «Ansicht folgt» stehen in der Legende - nur solange «Linie» an ist.
 * Gerechnet wird aus dem Stabwerk, das ohnehin läuft (core.zustandslinien.js);
 * gezeichnet wie die verformte Figur, über `ansicht.zustand`.
 */

import { esc } from './design.js';
import { mastenVon, mastName } from './core.constants.js';
import {
  ZL_AUS_MODUS, ZL_PUNKTE, ZL_EBENEN, ZL_NAME, ZL_REAKTION, zlEinheit, zustandGeometrie, zustandFall,
  zustandIntern, zustandReihe, zustandSicht, zustandDarstellbar, zustandEbeneAuto, zustandBlick, zustandWo,
} from './core.zustandslinien.js';

const MERKER = 'tragjoch-zustandslinie';
/** Die Wahl des Anwenders - Bedienzustand, nicht Teil des Blattes. */
export const zl = { an: false, eb: 'auto', reak: false, teile: 'alle', folgt: true, ax: 'global' };
try { zl.an = localStorage.getItem(MERKER) === '1'; } catch { /* kein Speicher */ }
export function zlSetzeAn(an) {
  zl.an = an === true;
  try { localStorage.setItem(MERKER, zl.an ? '1' : '0'); } catch { /* kein Speicher */ }
}

let cache = null;          // { merk, geo, faelle: Map(key -> zustandFall) }

/** Die Grösse der Zustandslinie zum Plotmodus, oder null. */
export const zlGroesse = (modus) => ZL_AUS_MODUS[modus] ?? null;

/** Der Versatz Modell -> Szene, wie bei der verformten Figur (app.js `verformtSetzen`). */
function versatz(app, roh) {
  const w = app.werte;
  const masten = mastenVon(w);
  const fuss = roh.dat.knoten.map((k) => ({ k, m: /(?:^|_)MAST_(.+)_F$/.exec(k.name) }))
    .filter((x) => x.m).map((x) => ({ k: x.k, mast: masten.find((mm) => mastName(w, mm) === x.m[1]) }))
    .find((x) => x.mast);
  return { dx: fuss ? fuss.mast.x - fuss.k.x : 0,
           dz: fuss ? (Number(fuss.mast.fuss) || 0) - fuss.k.z : (Number(w.mastH) || 0) };
}

/** Die Fälle, die gezeigt werden: der gewählte, oder bei «umhüllend» alle Nachweisfälle. */
function faelleFuer(app, g, roh, spannung) {
  const fyd = roh.auswertung?.fyd;
  const geo = cache.geo;
  const holen = (lf) => {
    const merk = `${lf.key}|${spannung ? 's' : ''}`;
    if (!cache.faelle.has(merk)) {
      cache.faelle.set(merk, zustandFall(roh.dat, roh.lsg, geo, lf,
        { spannung, fyd, auswertung: roh.auswertung?.opt }));
    }
    return cache.faelle.get(merk);
  };
  if (app.anzeigeKombi === 'umhuellend') return (roh.auswertung?.faelle ?? []).map(holen);
  const lf = (roh.faelle ?? []).find((l) => l.key === app.anzeigeKombi);
  return lf ? [holen(lf)] : [];
}

/**
 * Baut `ansicht.zustand` für den Renderer, oder null. In Szenenkoordinaten:
 * je Linie die Punkte auf der Stabachse und der Versatz (Richtung × Wert ×
 * Massstab, in Metern); dazu die Reaktionen und die Anschrift.
 */
export function zustandSetzen(app, g) {
  const ansicht = app.ansicht;
  if (!ansicht) return;
  const groesse = zlGroesse(ansicht.modus);
  const roh = g?.h?.roh;
  if (!zl.an || !groesse || !roh) { ansicht.zustand = null; return; }
  const merk = `${g.h.kennung}`;
  if (cache?.merk !== merk) cache = { merk, geo: zustandGeometrie(roh.dat), faelle: new Map() };
  const geo = cache.geo;
  const spannung = groesse === 'sig' || groesse === 'eta';
  const faelle = faelleFuer(app, g, roh, spannung);
  if (!faelle.length) { ansicht.zustand = null; return; }
  const fyd = roh.auswertung?.fyd ?? 1;
  const ebAuto = zustandEbeneAuto(groesse, faelle, geo, zl.teile, zl.ax);
  const eb = (zl.eb !== 'auto' && ZL_EBENEN[zl.ax].includes(zl.eb)) ? zl.eb : ebAuto;
  const k = zustandIntern(groesse, eb, zl.ax);
  const { dx, dz } = versatz(app, roh);
  const huelle = faelle.length > 1;
  const arten = huelle ? ['max', 'min'] : ['eins'];
  const zFuss = Math.min(...geo.map((s) => Math.min(s.a[2], s.b[2])));
  // Werte sammeln, Grösstwerte suchen.
  const reihen = [];
  let vmax = 0, gmax = null, gmin = null;
  geo.forEach((s, i) => {
    if (!zustandSicht(s, zl.teile)) return;
    arten.forEach((art) => {
      const r = zustandReihe(k, faelle, i, s, art, fyd);
      if (!r.some((x) => x.d && x.v !== null)) return;
      reihen.push({ s, i, r });
      r.forEach((x, p) => {
        if (!x.d || x.v === null) return;
        vmax = Math.max(vmax, Math.abs(x.v));
        if (!gmax || x.v > gmax.v) gmax = { ...x, s, p };
        if (!gmin || x.v < gmin.v) gmin = { ...x, s, p };
      });
    });
  });
  // Massstab: der grösste Betrag wird 8 % der Modellgrösse.
  const xs = geo.flatMap((s) => [s.a[0], s.b[0]]), zs = geo.flatMap((s) => [s.a[2], s.b[2]]);
  const groesseM = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), 1);
  const skal = vmax > 1e-9 ? 0.08 * groesseM / vmax : 0;
  const linien = reihen.map(({ s, r }) => ({
    name: s.n,
    pkt: r.map((x, p) => {
      const t = p / (ZL_PUNKTE - 1);
      const P = [s.a[0] + (s.b[0] - s.a[0]) * t + dx, s.a[1] + (s.b[1] - s.a[1]) * t, s.a[2] + (s.b[2] - s.a[2]) * t + dz];
      const v = x.v ?? 0, d = x.d ?? s.ez;
      return { p: P, o: d.map((c) => c * v * skal), v, leer: x.v === null || !x.d };
    }),
  }));
  // Reaktionen zum Diagramm.
  let reaktionen = [];
  let reakText = '';
  const idx = ZL_REAKTION[k];
  if (zl.reak && idx !== undefined) {
    const kn = new Map(roh.dat.knoten.map((x) => [x.name, x]));
    const knoten = Object.keys(faelle[0].reak).filter((x) => kn.has(x));
    const werte = knoten.map((x) => {
      const vs = faelle.map((f) => f.reak[x]?.[idx] ?? 0);
      const lo = Math.min(...vs), hi = Math.max(...vs);
      return { x, p: [kn.get(x).x + dx, kn.get(x).y, kn.get(x).z + dz],
               v: Math.abs(hi) >= Math.abs(lo) ? hi : lo, lo, hi };
    }).filter((w) => Math.abs(w.v) > 1e-6);
    const rmax = Math.max(1e-9, ...werte.map((w) => Math.abs(w.v)));
    const kurz = ['R_x', 'R_y', 'R_z', 'M_x', 'M_y', 'M_z'][idx], einh = idx >= 3 ? 'kNm' : 'kN';
    const fmtR = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
    reaktionen = werte.map((w) => ({
      p: w.p, achse: [[1, 0, 0], [0, 1, 0], [0, 0, 1]][idx % 3], moment: idx >= 3,
      l: (w.v / rmax) * 0.1 * groesseM, v: w.v,
      text: `Lager ${kurz} ${huelle ? `${fmtR(w.lo)} / ${fmtR(w.hi)}` : fmtR(w.v)} ${einh}`,
    }));
    const nameVon = (x) => (/MAST_([^_]+)_F$/.exec(x)?.[1] ?? x);
    reakText = werte.length ? `Lager ${kurz}: ${werte.map((w) => `${nameVon(w.x)} ${huelle ? `${fmtR(w.lo)} / ${fmtR(w.hi)}` : fmtR(w.v)}`).join(' · ')} ${einh}` : '';
  }
  const mg = gmax && gmin ? (Math.abs(gmin.v) > Math.abs(gmax.v) ? gmin : gmax) : gmax;
  const gg = mg === gmin ? gmax : gmin;
  ansicht.zustand = {
    k, spannung, fyd, linien, reaktionen,
    name: ZL_NAME[k], einheit: zlEinheit(k), eb, ebAuto: zl.eb === 'auto',
    vmax,
    mg: mg ? { v: mg.v, wo: zustandWo(mg.s, mg.p, zFuss), f: mg.f } : null,
    // Bei σ_v und η gibt es keinen Gegenwert (immer positiv).
    gg: !spannung && gg && Math.abs(gg.v) > 1e-3 ? { v: gg.v, wo: zustandWo(gg.s, gg.p, zFuss) } : null,
    reakText, huelle,
  };
}

/** Die Ansicht dreht so, dass die Linie flach vor einem liegt (leicht schräg). */
export function zustandBlickFolgen(app) {
  const ansicht = app.ansicht;
  if (!zl.an || !zl.folgt || !ansicht?.zustand || !cache) return;
  const key = zustandBlick(ansicht.zustand.k, cache.geo, zl.teile);
  if (!key) return;
  ansicht.blickrichtung(key, false);
  // Um 20° schräg: genau von der Seite deckten sich Bauteile hintereinander
  // (M1 und M2 in der Queransicht).
  ansicht.kamera.az += 0.35;
  ansicht.kamera.el = key === 'oben' ? 1.3 : 0.12;
  ansicht.zeichne();
}

const fmt = (z, v) => (z.k === 'eta' ? v.toFixed(3) : Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));

/** Der Inhalt der Legende bei eingeschalteter Linie. */
export function zustandLegendeHtml(app) {
  const z = app.ansicht?.zustand;
  const groesse = zlGroesse(app.ansicht?.modus);
  if (!zl.an) return null;
  if (!groesse) {
    return `<div class="zl-hinweis">Zustandslinie gibt es zu η, σ_v, M, V, N und T - diese Plotgrösse
      zeigt die Farbe.</div>`;
  }
  if (!z) return `<div class="zl-hinweis">Zustandslinie erst mit gültigem Stabwerk.</div>`;
  const geo = cache?.geo ?? [];
  const titel = { quer: 'quer', laengs: 'längs', dritte: groesse === 'V' ? 'lotrecht' : 'waagrecht', y: 'örtlich y', z: 'örtlich z' };
  const ebenen = (groesse === 'V' || groesse === 'M')
    ? `<div class="zl-reihe">${[`<button type="button" data-zl-eb="auto" class="${zl.eb === 'auto' ? 'an' : ''}"
         title="die Ebene mit dem grössten Wert">auto</button>`,
       ...ZL_EBENEN[zl.ax].map((eb) => `<button type="button" data-zl-eb="${eb}" class="${zl.eb === eb ? 'an' : ''}"${
         zustandDarstellbar(zustandIntern(groesse, eb, zl.ax), geo, zl.teile) ? '' : ' disabled title="an diesen Teilen kein Bild"'}>${titel[eb]}</button>`)].join('')}</div>` : '';
  const teile = [['alle', 'ganzes Tragwerk'], ['mast', 'Masten'], ['gurt', 'Gurte, alle'], ['gurt:OGL', 'Obergurt vorn'],
    ['gurt:OGR', 'Obergurt hinten'], ['gurt:UGL', 'Untergurt vorn'], ['gurt:UGR', 'Untergurt hinten'], ['blech', 'Bleche']];
  const zahl = (v) => `${fmt(z, v)}${z.einheit ? ` ${z.einheit}` : ''}`;
  return `<div class="zl">
    <div class="zl-wert">${z.vmax > 1e-9 && z.mg
      ? `<b>${esc(zahl(z.mg.v))}</b> <span>${esc(z.mg.wo)}</span>`
        + (z.gg ? `<br><span class="zl-dim">Gegenwert ${esc(zahl(z.gg.v))} · ${esc(z.gg.wo)}</span>` : '')
        + (z.spannung ? `<br><span class="zl-dim">f_yd = ${z.fyd.toFixed(1)} N/mm²</span>` : '')
      : '<span class="zl-dim">an diesen Teilen nicht darstellbar oder null</span>'}</div>
    ${ebenen}
    <label class="zl-haken"><input type="checkbox" data-zl-reak ${zl.reak ? 'checked' : ''}> Reaktionen dazu</label>
    ${z.reakText ? `<div class="zl-dim">${esc(z.reakText)}<br>Kraft bzw. Moment des Lagers auf das Tragwerk, global.</div>` : ''}
    <select data-zl-teile aria-label="Teile">${teile.map(([v, t]) =>
      `<option value="${v}"${zl.teile === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
    <div class="zl-reihe zl-klein">
      <label class="zl-haken"><input type="checkbox" data-zl-folgt ${zl.folgt ? 'checked' : ''}> Ansicht folgt</label>
      <button type="button" data-zl-ax="${zl.ax === 'global' ? 'lokal' : 'global'}"
        title="global: x quer, y längs, z oben - unabhängig von der Drehlage der Profile; örtlich: Achsen je Stab wie im Löser">${
        zl.ax === 'global' ? 'Achsen global' : 'Achsen örtlich'}</button>
    </div></div>`;
}

/** Verdrahtet die Legende; `neu` rechnet und zeichnet neu (app.neuRechnen(false)). */
export function zustandLegendeVerdrahten(app, n, neu) {
  const stopp = (el) => el.addEventListener('pointerdown', (e) => e.stopPropagation());
  n.querySelectorAll('[data-zl-eb]').forEach((b) => { stopp(b); b.onclick = () => { zl.eb = b.dataset.zlEb; neu(true); }; });
  const r = n.querySelector('[data-zl-reak]');
  if (r) { stopp(r); r.onchange = () => { zl.reak = r.checked; neu(false); }; }
  const t = n.querySelector('[data-zl-teile]');
  if (t) { stopp(t); t.onchange = () => { zl.teile = t.value; neu(true); }; }
  const f = n.querySelector('[data-zl-folgt]');
  if (f) { stopp(f); f.onchange = () => { zl.folgt = f.checked; neu(true); }; }
  const a = n.querySelector('[data-zl-ax]');
  if (a) { stopp(a); a.onclick = () => { zl.ax = a.dataset.zlAx; zl.eb = 'auto'; neu(true); }; }
}
