/**
 * render.svg.js
 * ---------------------------------------------------------------------------
 * ZEICHENMODUL. Wandelt die Geometrie aus geometry.js in SVG-Markup.
 * Enthält KEINE Statik und KEINE Geometrieberechnung - nur Abbildung.
 * Farbgebung vollständig über CSS-Klassen (css/style.css), damit Hell- und
 * Dunkeldarstellung funktionieren.
 * ---------------------------------------------------------------------------
 */

import { querschnitt, laengsansichtVertikal, draufsicht } from './geometry.js';
import { U } from './core.constants.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n = (v) => (Math.round(v * 100) / 100).toString();

/** Abbildung Modell -> Bild mit einheitlichem Massstab in beiden Achsen. */
function viewport(o) {
  const dx = o.x1 - o.x0, dy = o.y1 - o.y0;
  const padL = o.padL ?? 40, padR = o.padR ?? 40, padT = o.padT ?? 30, padB = o.padB ?? 40;
  const sx = (o.maxW - padL - padR) / (dx || 1);
  const sy = o.maxH ? (o.maxH - padT - padB) / (dy || 1) : Infinity;
  const s = Math.min(sx, sy);
  return {
    s, W: dx * s + padL + padR, H: dy * s + padT + padB,
    X: (mx) => padL + (mx - o.x0) * s,
    Y: (my) => padT + (o.y1 - my) * s,
  };
}

const rect = (v, x0, y0, x1, y1, cls) =>
  `<rect class="${cls}" x="${n(Math.min(v.X(x0), v.X(x1)))}" y="${n(Math.min(v.Y(y0), v.Y(y1)))}" ` +
  `width="${n(Math.abs(v.X(x1) - v.X(x0)))}" height="${n(Math.abs(v.Y(y1) - v.Y(y0)))}"/>`;

const poly = (v, pts, cls) =>
  `<polygon class="${cls}" points="${pts.map((p) => `${n(v.X(p[0]))},${n(v.Y(p[1]))}`).join(' ')}"/>`;

const line = (v, x0, y0, x1, y1, cls) =>
  `<line class="${cls}" x1="${n(v.X(x0))}" y1="${n(v.Y(y0))}" x2="${n(v.X(x1))}" y2="${n(v.Y(y1))}"/>`;

const text = (v, x, y, s, cls, dx = 0, dy = 0) =>
  `<text class="${cls}" x="${n(v.X(x) + dx)}" y="${n(v.Y(y) + dy)}" text-anchor="middle">${esc(s)}</text>`;

/** Bemassungslinie mit Endstrichen. */
function masslinie(v, achse, von, bis, lage, label) {
  const T = 4;
  if (achse === 'h') {
    const y = v.Y(lage);
    return `<g class="dim">
      <line x1="${n(v.X(von))}" y1="${n(y)}" x2="${n(v.X(bis))}" y2="${n(y)}"/>
      <line x1="${n(v.X(von))}" y1="${n(y - T)}" x2="${n(v.X(von))}" y2="${n(y + T)}"/>
      <line x1="${n(v.X(bis))}" y1="${n(y - T)}" x2="${n(v.X(bis))}" y2="${n(y + T)}"/>
      <text x="${n((v.X(von) + v.X(bis)) / 2)}" y="${n(y - 5)}" text-anchor="middle">${esc(label)}</text>
    </g>`;
  }
  const x = v.X(lage), ym = (v.Y(von) + v.Y(bis)) / 2;
  return `<g class="dim">
    <line x1="${n(x)}" y1="${n(v.Y(von))}" x2="${n(x)}" y2="${n(v.Y(bis))}"/>
    <line x1="${n(x - T)}" y1="${n(v.Y(von))}" x2="${n(x + T)}" y2="${n(v.Y(von))}"/>
    <line x1="${n(x - T)}" y1="${n(v.Y(bis))}" x2="${n(x + T)}" y2="${n(v.Y(bis))}"/>
    <text x="${n(x - 6)}" y="${n(ym)}" text-anchor="middle"
          transform="rotate(-90 ${n(x - 6)} ${n(ym)})">${esc(label)}</text>
  </g>`;
}

/** Bemassung mit fester Pixel-Lage - unabhaengig vom Modellmassstab. */
function masslinieP(v, von, bis, pixelY, label) {
  const T = 4;
  return `<g class="dim">
    <line x1="${n(v.X(von))}" y1="${n(pixelY)}" x2="${n(v.X(bis))}" y2="${n(pixelY)}"/>
    <line x1="${n(v.X(von))}" y1="${n(pixelY - T)}" x2="${n(v.X(von))}" y2="${n(pixelY + T)}"/>
    <line x1="${n(v.X(bis))}" y1="${n(pixelY - T)}" x2="${n(v.X(bis))}" y2="${n(pixelY + T)}"/>
    <text x="${n((v.X(von) + v.X(bis)) / 2)}" y="${n(pixelY - 5)}" text-anchor="middle">${esc(label)}</text>
  </g>`;
}

const wrap = (v, inner, titel) =>
  `<figure class="zeichnung">
     <figcaption>${esc(titel)}</figcaption>
     <svg viewBox="0 0 ${n(v.W)} ${n(v.H)}" preserveAspectRatio="xMidYMid meet"
          role="img" aria-label="${esc(titel)}">${inner}</svg>
   </figure>`;

// --- Ansicht 1: Querschnitt -------------------------------------------------

export function zeichneQuerschnitt(m, maxW = 620) {
  const qs = querschnitt(m);
  const aMax = Math.max(m.profOG.aH, m.profUG.aH, m.profOG.aV, m.profUG.aV);
  const marge = Math.max(qs.jd, qs.jbbOG) * 0.17 + aMax * 0.55;
  const v = viewport({
    x0: qs.huelle.y0 - marge, x1: qs.huelle.y1 + marge,
    y0: qs.huelle.z0 - marge, y1: qs.huelle.z1 + marge,
    maxW, padL: 62, padR: 28, padT: 30, padB: 52,
  });

  let g = '';
  const sp = (id) => qs.byId[id].schwerpunkt;

  // Systempolygon durch die Schwerpunkte
  g += poly(v, [
    [sp('OG_L').y, sp('OG_L').z], [sp('OG_R').y, sp('OG_R').z],
    [sp('UG_R').y, sp('UG_R').z], [sp('UG_L').y, sp('UG_L').z],
  ], 'sysrect');

  // Bindebleche in der Schenkelflucht
  qs.bindebleche.vertikal.forEach((e) => {
    g += rect(v, e.y - m.t2 / 2, e.z0, e.y + m.t2 / 2, e.z1, 'blech');
  });
  qs.bindebleche.horizontal.forEach((e) => {
    g += rect(v, e.y0, e.z - m.t2 / 2, e.y1, e.z + m.t2 / 2, 'blech');
  });

  // Winkel
  qs.winkel.forEach((w) => {
    g += poly(v, w.poly, 'stahl');
    g += `<circle class="heel" cx="${n(v.X(w.ferse.y))}" cy="${n(v.Y(w.ferse.z))}" r="3"/>`;
    const cx = v.X(w.schwerpunkt.y), cy = v.Y(w.schwerpunkt.z);
    g += `<g class="sp"><line x1="${n(cx - 6)}" y1="${n(cy)}" x2="${n(cx + 6)}" y2="${n(cy)}"/>
          <line x1="${n(cx)}" y1="${n(cy - 6)}" x2="${n(cx)}" y2="${n(cy + 6)}"/>
          <circle cx="${n(cx)}" cy="${n(cy)}" r="3.2"/></g>`;
  });

  // Beschriftung der Gurte
  const lblOG = qs.byId.OG_R, lblUG = qs.byId.UG_R;
  g += text(v, qs.huelle.y1 + marge * 0.52, lblOG.schwerpunkt.z,
            `OG ${m.profOG.name}`, 'lbl');
  g += text(v, qs.huelle.y1 + marge * 0.52, lblUG.schwerpunkt.z,
            `UG ${m.profUG.name}`, 'lbl');

  // Bemassung: Aussenmasse und Schwerpunktsabstände
  g += masslinie(v, 'h', -qs.jbbOG / 2, qs.jbbOG / 2, qs.huelle.z1 + marge * 0.45,
                 `jbb = ${qs.jbbOG.toFixed(0)} mm`);
  g += masslinie(v, 'h', sp('UG_L').y, sp('UG_R').y, qs.huelle.z0 - marge * 0.50,
                 `b = ${(m.b * 1000).toFixed(0)} mm`);
  g += masslinie(v, 'v', -qs.jd / 2, qs.jd / 2, qs.huelle.y0 - marge * 0.42,
                 `jd = ${qs.jd.toFixed(0)} mm`);
  g += masslinie(v, 'v', sp('UG_L').z, sp('OG_L').z, qs.huelle.y0 - marge * 0.85,
                 `h = ${(m.h * 1000).toFixed(0)} mm`);

  const titel = `Querschnitt A–A  ·  ${m.typ ? m.typ + '  ·  ' : ''}` +
                `OG ${m.profOG.name} / UG ${m.profUG.name}  ·  ` +
                `Bindebleche t₂ = ${m.t2} mm in der Flucht der Schenkel`;
  return { svg: wrap(v, g, titel), qs };
}

// --- Ansicht 2/3: Vertikalebene ---------------------------------------------

function zeichneVertikal(m, qs, x0, x1, maxW, titel, zeigeStationen) {
  const la = laengsansichtVertikal(m, qs);
  const zMin = Math.min(...la.gurte.map((g) => g.z0));
  const zMax = Math.max(...la.gurte.map((g) => g.z1));
  const dz = zMax - zMin;
  const v = viewport({
    x0, x1, y0: zMin - dz * 0.95, y1: zMax + dz * 0.95,
    maxW, padL: 52, padR: 26, padT: 36, padB: 78,
  });

  let g = '';

  la.bleche.forEach((b) => {
    if (b.x1 < x0 || b.x0 > x1) return;
    g += rect(v, b.x0, b.z0, b.x1, b.z1, b.end ? 'blech blech-end' : 'blech');
    if (zeigeStationen) {
      g += text(v, (b.x0 + b.x1) / 2, b.z1, `${b.hBB}/${b.tBB}`, 'micro', 0, -6);
    }
  });

  la.gurte.forEach((gu) => {
    // Bei verjüngten Enden ist der Gurt ein Polygonzug, sonst ein Rechteck.
    g += poly(v, gu.umriss(x0, x1), 'stahl');
    const xs = [x0, ...la.stellen.filter((x) => x > x0 && x < x1), x1];
    for (let k = 0; k < xs.length - 1; k++) {
      g += line(v, xs[k], gu.zs + gu.dz(xs[k]),
                   xs[k + 1], gu.zs + gu.dz(xs[k + 1]), 'sysline-dash');
    }
  });

  const auflager = (x) => {
    // Bei verjüngten Enden liegt das Lager an der angehobenen Untergurtkante.
    const X = v.X(x), Y = v.Y(la.zUnten ? la.zUnten(x) : zMin) + 2;
    const eingespannt = m.endbedingung === 'voll';
    if (eingespannt) {
      return `<g class="auflager"><rect x="${n(X - 5)}" y="${n(v.Y(zMax))}" width="10"
              height="${n(Y - v.Y(zMax) + 10)}" class="einspann"/></g>`;
    }
    return `<polygon class="auflager" points="${n(X)},${n(Y)} ${n(X - 9)},${n(Y + 15)} ${n(X + 9)},${n(Y + 15)}"/>
            <line class="auflager-l" x1="${n(X - 13)}" y1="${n(Y + 16)}" x2="${n(X + 13)}" y2="${n(Y + 16)}"/>`;
  };
  if (x0 <= 0) g += auflager(0);
  if (x1 >= la.L - 1) g += auflager(la.L);

  // Einzellasten: Hängestützen (ev > 0) hängen nach unten, Jochaufsätze nach oben
  la.lasten.filter((p) => p.x >= x0 && p.x <= x1).forEach((p, k) => {
    const X = v.X(p.x);
    const unten = (p.ev ?? 0) >= 0;
    const Y = unten ? v.Y(zMin) : v.Y(zMax);
    const s = unten ? +1 : -1;
    g += `<g class="last">
      <line x1="${n(X)}" y1="${n(Y + s * 6)}" x2="${n(X)}" y2="${n(Y + s * 30)}"/>
      <polygon points="${n(X)},${n(Y + s * 4)} ${n(X - 4)},${n(Y + s * 13)} ${n(X + 4)},${n(Y + s * 13)}"/>
      <text x="${n(X)}" y="${n(Y + s * 42 + (unten ? 0 : -2))}" text-anchor="middle">${esc(p.name)}</text>
    </g>`;
  });

  // Nachweisschnitt
  if (la.xN >= x0 && la.xN <= x1) {
    const X = v.X(la.xN);
    g += `<g class="schnitt">
      <line x1="${n(X)}" y1="${n(v.Y(zMax) - 16)}" x2="${n(X)}" y2="${n(v.Y(zMin) + 16)}"/>
      <text x="${n(X)}" y="${n(v.Y(zMax) - 20)}" text-anchor="middle">x_N = ${m.xNachweis.toFixed(2)} m</text>
    </g>`;
  }

  const bl = la.bleche.filter((b) => b.x0 >= x0 - 1 && b.x1 <= x1 + 1);
  if (bl.length >= 2) {
    g += masslinie(v, 'h', bl[0].x, bl[1].x, zMax + dz * 0.6, `a₁ = ${m.a1.toFixed(3)} m`);
  }
  if (x1 - x0 >= la.L - 1) {
    g += masslinieP(v, 0, la.L, v.H - 14, `L = ${m.L.toFixed(3)} m`);
  }

  return wrap(v, g, titel);
}

export function zeichneLaengsansicht(m, qs, maxW = 940) {
  return zeichneVertikal(m, qs, 0, m.L * U.m__mm, maxW,
    `Vertikalebene · Längsansicht massstäblich · L = ${m.L.toFixed(2)} m · ` +
    `Teilung a₁ = ${(m.a1 * 1000).toFixed(0)} mm`, false);
}

export function zeichneDetail(m, qs, maxW = 620) {
  const L = m.L * U.m__mm;
  return zeichneVertikal(m, qs, 0, Math.min(L, m.a1 * U.m__mm * 2.4), maxW,
    'Detail Auflagerbereich · Endbindeblech h₁ und erste Zwischenbleche h₂', true);
}

// --- Ansicht 4: Draufsicht --------------------------------------------------

export function zeichneDraufsicht(m, qs, maxW = 940) {
  const dr = draufsicht(m, qs);
  const yMin = Math.min(...dr.gurte.map((g) => g.y0));
  const yMax = Math.max(...dr.gurte.map((g) => g.y1));
  const dy = yMax - yMin;
  const v = viewport({
    x0: 0, x1: dr.L, y0: yMin - dy * 0.55, y1: yMax + dy * 0.55,
    maxW, padL: 60, padR: 26, padT: 30, padB: 42,
  });

  let g = '';
  dr.bleche.forEach((b) => {
    g += rect(v, b.x0, b.y0, b.x1, b.y1, b.end ? 'blech blech-end' : 'blech');
  });
  dr.gurte.forEach((gu) => {
    g += rect(v, 0, gu.y0, dr.L, gu.y1, 'stahl');
    g += line(v, 0, gu.ys, dr.L, gu.ys, 'sysline-dash');
  });
  if (dr.xN >= 0 && dr.xN <= dr.L) {
    const X = v.X(dr.xN);
    g += `<g class="schnitt"><line x1="${n(X)}" y1="${n(v.Y(yMax) - 10)}"
          x2="${n(X)}" y2="${n(v.Y(yMin) + 10)}"/></g>`;
  }
  g += masslinie(v, 'v', dr.gurte[0].ys, dr.gurte[1].ys, -dr.L * 0.018,
                 `b = ${(m.b * 1000).toFixed(0)} mm`);

  return wrap(v, g,
    'Draufsicht obere Horizontalebene · Bindebleche in der Flucht der liegenden ' +
    'Schenkel  (Knick jk/jkk der Zeichnung nicht modelliert)');
}

/** Alle Ansichten auf einmal. */
export function zeichneAlles(m, breiten = {}) {
  const { svg, qs } = zeichneQuerschnitt(m, breiten.qs ?? 620);
  return {
    querschnitt: svg,
    detail: zeichneDetail(m, qs, breiten.detail ?? 620),
    laengs: zeichneLaengsansicht(m, qs, breiten.laengs ?? 940),
    draufsicht: zeichneDraufsicht(m, qs, breiten.draufsicht ?? 940),
    warnungen: qs.warnungen,
    qs,
  };
}
