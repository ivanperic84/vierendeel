/**
 * render.charts.js
 * ---------------------------------------------------------------------------
 * DIAGRAMME als reines SVG. Keine Rechnung, keine externen Bibliotheken.
 * Farben über CSS-Klassen (serie-1 ... serie-4).
 * ---------------------------------------------------------------------------
 */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n = (v) => (Math.round(v * 1000) / 1000).toString();

/** "Schöne" Achsenschrittweite. */
function schritt(spanne, ziel = 5) {
  if (!(spanne > 0)) return 1;
  const roh = spanne / ziel;
  const p = Math.pow(10, Math.floor(Math.log10(roh)));
  const r = roh / p;
  return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * p;
}

/**
 * Liniendiagramm über x.
 * @param {object} o {titel, yLabel, xLabel, punkte:[{x}], serien:[{name,werte[],cls}],
 *                    grenze?:number, breite?, hoehe?}
 */
export function linienDiagramm(o) {
  const W = o.breite ?? 900, H = o.hoehe ?? 240;
  const mL = 62, mR = 16, mT = 26, mB = 42;
  const xs = o.punkte;
  const alle = o.serien.flatMap((s) => s.werte).filter(Number.isFinite);
  if (o.grenze !== undefined) alle.push(o.grenze);
  alle.push(0);

  let y0 = Math.min(...alle), y1 = Math.max(...alle);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const pad = (y1 - y0) * 0.08;
  y0 -= pad; y1 += pad;

  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const X = (v) => mL + ((v - x0) / (x1 - x0 || 1)) * (W - mL - mR);
  const Y = (v) => H - mB - ((v - y0) / (y1 - y0)) * (H - mT - mB);

  let g = '';

  // Gitter und Achsenbeschriftung
  const dy = schritt(y1 - y0);
  for (let v = Math.ceil(y0 / dy) * dy; v <= y1; v += dy) {
    g += `<line class="grid" x1="${n(mL)}" y1="${n(Y(v))}" x2="${n(W - mR)}" y2="${n(Y(v))}"/>`;
    g += `<text class="tick" x="${n(mL - 7)}" y="${n(Y(v) + 4)}" text-anchor="end">${n(Math.round(v * 100) / 100)}</text>`;
  }
  const dx = schritt(x1 - x0, 8);
  for (let v = Math.ceil(x0 / dx) * dx; v <= x1 + 1e-9; v += dx) {
    g += `<line class="grid" x1="${n(X(v))}" y1="${n(mT)}" x2="${n(X(v))}" y2="${n(H - mB)}"/>`;
    g += `<text class="tick" x="${n(X(v))}" y="${n(H - mB + 16)}" text-anchor="middle">${n(Math.round(v * 100) / 100)}</text>`;
  }

  // Nulllinie
  if (y0 < 0 && y1 > 0) {
    g += `<line class="nulllinie" x1="${n(mL)}" y1="${n(Y(0))}" x2="${n(W - mR)}" y2="${n(Y(0))}"/>`;
  }
  // Grenzwert
  if (o.grenze !== undefined) {
    g += `<line class="grenze" x1="${n(mL)}" y1="${n(Y(o.grenze))}" x2="${n(W - mR)}" y2="${n(Y(o.grenze))}"/>`;
    g += `<text class="grenze-txt" x="${n(W - mR - 4)}" y="${n(Y(o.grenze) - 5)}" text-anchor="end">η = ${o.grenze}</text>`;
  }

  // Serien
  o.serien.forEach((s, k) => {
    const d = xs.map((x, i) => `${i ? 'L' : 'M'}${n(X(x))},${n(Y(s.werte[i]))}`).join(' ');
    g += `<path class="serie ${s.cls ?? 'serie-' + (k + 1)}" d="${d}"/>`;
  });

  // Legende - ANKLICKBAR, wo es ein Kraftbild dazu gibt.
  // Der unsichtbare Rechteckdeckel ist die Trefferfläche: eine Textzeile von
  // acht Pixeln Höhe trifft man sonst nicht.
  let lx = mL;
  o.serien.forEach((s, k) => {
    const breite = 30 + s.name.length * 6.6;
    const auf = s.skizze ? ` class="legende-eintrag" data-skizze="${esc(s.skizze)}"` : '';
    g += `<g${auf}>`;
    if (s.skizze) {
      g += `<rect class="legende-treffer" x="${n(lx - 3)}" y="${n(mT - 21)}"`
         + ` width="${n(breite)}" height="17" rx="3"/>`;
    }
    g += `<line class="serie ${s.cls ?? 'serie-' + (k + 1)}" x1="${n(lx)}" y1="${n(mT - 12)}" x2="${n(lx + 18)}" y2="${n(mT - 12)}"/>`;
    g += `<text class="legende" x="${n(lx + 23)}" y="${n(mT - 8)}">${esc(s.name)}</text>`;
    g += '</g>';
    lx += 32 + s.name.length * 6.6;
  });

  g += `<text class="achse" x="${n((W + mL) / 2)}" y="${n(H - 6)}" text-anchor="middle">${esc(o.xLabel ?? 'x [m]')}</text>`;
  g += `<text class="achse" x="14" y="${n((H) / 2)}" text-anchor="middle" transform="rotate(-90 14 ${n(H / 2)})">${esc(o.yLabel ?? '')}</text>`;

  return `<figure class="diagramm">
    <figcaption>${esc(o.titel)}</figcaption>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img"
         aria-label="${esc(o.titel)}">${g}</svg>
  </figure>`;
}

/** Die drei Standarddiagramme aus einem Rechenergebnis. */
export function diagramme(erg, breite = 900) {
  const k = erg.knoten;
  const x = k.map((r) => r.x);
  return {
    schnittgroessen: linienDiagramm({
      titel: 'Schnittgrössen Ersatzbalken', breite,
      yLabel: 'M [kNm] / V [kN]', punkte: x,
      serien: [
        { name: 'M_y,ed', werte: k.map((r) => r.My), skizze: 'My' },
        { name: 'V_z,ed', werte: k.map((r) => r.Vz), skizze: 'Vz' },
        { name: 'M_z,ed', werte: k.map((r) => r.Mz), skizze: 'Mz' },
        { name: 'T_x,ed', werte: k.map((r) => r.Tx), cls: 'serie-4', skizze: 'Tx' },
      ],
    }),
    ebene: linienDiagramm({
      titel: 'Ebenenquerkräfte – Balkenanteil und Torsionsanteil überlagert', breite, hoehe: 210,
      yLabel: 'V [kN] / M [kNm]', punkte: x,
      serien: [
        { name: 'V Vertikalebene', werte: k.map((r) => r.VzEbene1), skizze: 'Vebene' },
        { name: 'davon aus Torsion', werte: k.map((r) => r.q.vertikal.anteilTorsion), skizze: 'Tx' },
        { name: 'V Horizontalebene', werte: k.map((r) => r.VyEbene1), skizze: 'Vebene' },
        { name: 'M_y,L,lokal', werte: k.map((r) => r.My_lokal), cls: 'serie-4', skizze: 'Mlokal' },
      ],
    }),
    ausnutzung: linienDiagramm({
      titel: 'Ausnutzungsgrad η(x)', breite, hoehe: 240,
      yLabel: 'η [–]', punkte: x, grenze: 1.0,
      serien: [
        { name: `Obergurt ${erg.modell.profOG.name}`, werte: k.map((r) => r.og.eta), skizze: 'eta' },
        { name: `Untergurt ${erg.modell.profUG.name}`, werte: k.map((r) => r.ug.eta), skizze: 'eta' },
        { name: 'Bindeblech', werte: k.map((r) => r.etaB), skizze: 'eta' },
      ],
    }),
  };
}
