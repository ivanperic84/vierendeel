/**
 * app.zustand.js - Zustandslinien im 3D: Zustand, Aufbau für den Renderer,
 * Steuerung in der Legende.
 *
 * Weisung vom 14. November («Ja, einbauen», nach der Probe in Versand/).
 * Eingebaut wie vorgeschlagen: in der Gruppe «Resultate» ein Schalter
 * «Linie»; ist er an, zeigt die gewählte Plotgrösse (η, σ_v, M, V, N, T)
 * statt der Farbe die Zustandslinie, das Modell steht neutral. Ebene (auto /
 * quer / längs / lotrecht bzw. waagrecht), Teile und der Knopf «Blick auf
 * die Ebene» stehen in der Legende - nur solange «Linie» an ist (die
 * Reaktionen und die Automatik der Ansicht sind seit dem 17. November weg).
 * Gerechnet wird aus dem Stabwerk, das ohnehin läuft (core.zustandslinien.js);
 * gezeichnet wie die verformte Figur, über `ansicht.zustand`.
 */

import { esc } from './design.js';
import { mastenVon, mastName } from './core.constants.js';
import {
  ZL_AUS_MODUS, ZL_PUNKTE, ZL_EBENEN, ZL_NAME, ZL_REAKTION, zlEinheit, zustandGeometrie, zustandFall,
  zustandIntern, zustandReihe, zustandSicht, zustandDarstellbar, zustandEbeneAuto, zustandBlick, zustandWo,
  zustandAussen, zustandBauen,
} from './core.zustandslinien.js';

const MERKER = 'tragjoch-zustandslinie';
/** Die Wahl des Anwenders - Bedienzustand, nicht Teil des Blattes. */
/*
 * 17. November: «bei den reaktionen unter linien plot ist etwas inkonsistent.
 * auch die funktion ansicht folgen verstehe ich nicht ganz und verwirrt
 * etwas.» Auf Rückfrage «Weglassen» (Reaktionen) und «Einmal-Knopf»
 * (Ansicht): keine Reaktionen mehr an der Linie (sie stehen im Reiter
 * Auflager und im Reaktionsblatt), kein automatisches Drehen - ein Knopf
 * «Blick auf die Ebene» dreht einmal.
 */
export const zl = { an: false, eb: 'auto', reak: false, teile: 'alle', folgt: false, ax: 'global' };
try { zl.an = localStorage.getItem(MERKER) === '1'; } catch { /* kein Speicher */ }
export function zlSetzeAn(an) {
  zl.an = an === true;
  try { localStorage.setItem(MERKER, zl.an ? '1' : '0'); } catch { /* kein Speicher */ }
}

let cache = null;          // { merk, geo, faelle: Map(key -> zustandFall) }

/** Die Grösse der Zustandslinie zum Plotmodus, oder null. */
export const zlGroesse = (modus) => ZL_AUS_MODUS[modus] ?? null;

/** Der Versatz Modell -> Szene, wie bei der verformten Figur (app.js `verformtSetzen`). */
export function versatz(app, roh) {
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
  if (cache?.merk !== merk) {
    const geo0 = zustandGeometrie(roh.dat);
    cache = { merk, geo: geo0, aussen: zustandAussen(geo0), faelle: new Map() };
  }
  const geo = cache.geo;
  const aussen = cache.aussen;
  const spannung = groesse === 'sig' || groesse === 'eta';
  const faelle = faelleFuer(app, g, roh, spannung);
  if (!faelle.length) { ansicht.zustand = null; return; }
  const fyd = roh.auswertung?.fyd ?? 1;
  const { dx, dz } = versatz(app, roh);
  // Der Aufbau der Linien steht seit dem 19. November in core.zustandwerte.js
  // (zustandBauen) - derselbe Weg wie in der Viewer-Datei.
  /*
   * WELCHE TEILE: die Ebenen der Werkzeugleiste (19. November, «das ein und
   * ausblenden der bauteile über diese darstellung braucht es nicht, diese
   * kann über die layersteuerung erfolgen, das abbilden der einzelnen gurte
   * braucht es nicht») - Gurte, stehende / liegende Bleche, Masten.
   */
  const e = ansicht.ebenen ?? {};
  const sicht = (s) => {
    if (s.r === 'mast') return e.mast !== false;
    // Anker und Druckstütze gehören im 3D zur Ebene «Masten» (21. November,
    // «wenn man bauteile ausblendet bleiben die liniendiagramme bestehen
    // (druckstütze)»).
    if (/(^|_)(ANKER|SEILKOPF|ANKERGELENK)/.test(s.n ?? '')) return e.mast !== false;
    if (/^gurt/.test(s.r ?? '')) return e.profil !== false;
    if (s.r === 'blech') {
      const steh = Math.abs(s.b[2] - s.a[2]) > 0.7 * (Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]) || 1);
      return steh ? e.blechSteh !== false : e.blechLieg !== false;
    }
    return true;
  };
  const z0 = zustandBauen({ geo, aussen, faelle, groesse, eb: zl.eb, sicht, ax: zl.ax, dx, dz, fyd,
    ueber: app.ueberFaktor?.() ?? 1 });   // Überhöhung in Stufen (22. November)
  if (!z0) { ansicht.zustand = null; return; }
  const { k, huelle, groesseM } = z0;
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
  ansicht.zustand = { ...z0, reaktionen, reakText };
}

/** Die Ansicht dreht so, dass die Linie flach vor einem liegt (leicht schräg). */
export function zustandBlickFolgen(app, einmal = false) {
  const ansicht = app.ansicht;
  if (!zl.an || (!zl.folgt && !einmal) || !ansicht?.zustand || !cache) return;
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
  const zahl = (v) => `${fmt(z, v)}${z.einheit ? ` ${z.einheit}` : ''}`;
  return `<div class="zl">
    <div class="zl-wert">${z.vmax > 1e-9 && z.mg
      ? `<b>${esc(zahl(z.mg.v))}</b> <span>${esc(z.mg.wo)}</span>`
        + (z.gg ? `<br><span class="zl-dim">Gegenwert ${esc(zahl(z.gg.v))} · ${esc(z.gg.wo)}</span>` : '')
        + (z.spannung ? `<br><span class="zl-dim">f_yd = ${z.fyd.toFixed(1)} N/mm²</span>` : '')
      : '<span class="zl-dim">an diesen Teilen nicht darstellbar oder null</span>'}</div>
    ${z.klein && z.vmax > 1e-9 ? `<div class="zl-dim">klein (unter ${fmt(z, z.bezug)}${z.einheit ? ` ${z.einheit}` : ''}) - Massstab auf ${fmt(z, z.bezug)}${z.einheit ? ` ${z.einheit}` : ''} bezogen</div>` : ''}
    ${ebenen}
    <div class="zl-reihe zl-klein">
      <button type="button" data-zl-ax="${zl.ax === 'global' ? 'lokal' : 'global'}"
        title="In welche Richtung das Diagramm aufgetragen wird. Global (Vorgabe): quer und längs zum Gleis, lotrecht - für alle Stäbe gleich, auch wenn ein Profil gedreht ist (z. B. Mast mit Steg längs oder quer). Örtlich: in den Achsen jedes einzelnen Stabes wie im Löser - nur für die Kontrolle gegen ein Statikprogramm">Diagramm ${
        zl.ax === 'global' ? 'global (Gleis)' : 'örtlich (je Stab)'}</button>
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
  const a = n.querySelector('[data-zl-ax]');
  if (a) { stopp(a); a.onclick = () => { zl.ax = a.dataset.zlAx; zl.eb = 'auto'; neu(true); }; }
}
