/**
 * ui.profilblatt.js
 * ---------------------------------------------------------------------------
 * DAS PROFILBLATT: ein Profil der Tafel «Profile dieses Tragwerks», mit allen
 * hinterlegten Kenndaten und einer massstaeblichen Schnittzeichnung samt
 * Vermassung und Lage des Schwerpunkts.
 *
 * Weisung vom 2. Oktober (aus der Liste vom 30. September): «unter profile
 * könnte man da auf die einzelnen profile klicken und ein fenster mit den
 * hinterlegten kenndaten zum profil und eine svg zeichnung des schnitts und
 * mit vermassung und die angabe zur lage des schwerpunktes, so lassen sich
 * die werte mit der fachliteratur abgleichen.»
 *
 * >>> ES ZEIGT, WAS HINTERLEGT IST - NICHTS ANDERES. <<<
 *
 * Der Zweck ist der Abgleich mit der Fachliteratur. Eine Zahl, die hier
 * gerundet, umgerechnet oder nachgerechnet stuende, waere genau die Zahl, die
 * man NICHT abgleichen kann. Die Tabelle fuehrt deshalb jeden Wert so, wie er
 * in der Datenbasis steht, mit der Einheit SEINER Tabelle (die Winkel fuehren
 * Masse in mm und Schwerpunktsabstaende in cm, die Walzprofile alles in cm -
 * so stehen sie in den Normtabellen auch). Wo das Blatt etwas ableitet - I
 * der Winkel aus i und A -, steht es in einer eigenen Zeile und sagt es.
 *
 * Die ZEICHNUNG braucht eine gemeinsame Einheit und rechnet intern in mm. Sie
 * zeichnet nach Profilnorm (Weisung 2. Oktober, siehe «DIE GEOMETRIE»): mit
 * den Ausrundungen aus der Tabelle, beim UNP mit der Flanschneigung. Fehlt
 * ein Radius, bleibt die Ecke scharf, und der Text darunter sagt es.
 * ---------------------------------------------------------------------------
 */

import { esc } from './design.js';
// Die Geometrie steht seit dem 2. Oktober im Kern (core.profilgeometrie.js):
// die AxisVM-Ausleitung baut ihre U-Profile aus demselben Umriss.
import { UNP_NEIGUNG, blechWerte, profilGeometrie, umrissPunkte,
         querschnittAusUmriss } from './core.profilgeometrie.js';
import { gittermastGeometrie, gitterWindHerleitung } from './data.masten.js';
export { UNP_NEIGUNG, blechWerte, profilGeometrie, umrissPunkte, querschnittAusUmriss };

/* ===========================================================================
 * DIE FELDER JE TABELLE - Symbol, Einheit, Bedeutung.
 * ===========================================================================
 *
 * Die Einheit steht hier und nicht am Wert: sie ist eine Eigenschaft der
 * Tabelle. Eine Zeile je hinterlegtem Feld; was die Tabelle nicht fuehrt,
 * steht als Strich da (siehe `zeilen`).
 */
const FELDER = {
  winkel: [
    ['aH', 'a_H', 'mm', 'liegender Schenkel (Horizontalebene)'],
    ['aV', 'a_V', 'mm', 'stehender Schenkel (Vertikalebene)'],
    ['t', 't', 'mm', 'Schenkeldicke'],
    ['r1', 'r₁', 'mm', 'Ausrundung in der Kehle (EN 10056-1)'],
    ['r2', 'r₂', 'mm', 'Ausrundung an der Schenkelspitze (EN 10056-1)'],
    ['A', 'A', 'cm²', 'Querschnittsfläche'],
    ['g', 'g', 'kg/m', 'Gewicht je Meter'],
    ['zsH', 'z_s', 'cm', 'Schwerpunkt ab Aussenfläche des liegenden Schenkels'],
    ['zsV', 'y_s', 'cm', 'Schwerpunkt ab Aussenfläche des stehenden Schenkels'],
    ['iy', 'i_y', 'cm', 'Trägheitsradius, schenkelparallele Achse y'],
    ['iz', 'i_z', 'cm', 'Trägheitsradius, schenkelparallele Achse z'],
    ['imin', 'i_v', 'cm', 'kleinster Trägheitsradius (Hauptachse v–v)'],
    ['Wy', 'W_y', 'cm³', 'el. Widerstandsmoment um die waagrechte Achse (Schenkelspitze)'],
    ['Wz', 'W_z', 'cm³', 'el. Widerstandsmoment um die lotrechte Achse (Schenkelspitze)'],
  ],
  walz: [
    ['h', 'h', 'cm', 'Höhe'],
    ['b', 'b', 'cm', 'Breite'],
    ['tw', 't_w', 'cm', 'Stegdicke'],
    ['tf', 't_f', 'cm', 'Flanschdicke'],
    ['r', 'r', 'cm', 'Ausrundungsradius'],
    ['A', 'A', 'cm²', 'Querschnittsfläche'],
    ['G', 'G', 'kg/m', 'Gewicht je Meter'],
    ['Iy', 'I_y', 'cm⁴', 'Trägheitsmoment, starke Achse'],
    ['Wy', 'W_y', 'cm³', 'el. Widerstandsmoment, starke Achse'],
    ['iy', 'i_y', 'cm', 'Trägheitsradius, starke Achse'],
    ['Iz', 'I_z', 'cm⁴', 'Trägheitsmoment, schwache Achse'],
    ['Wz', 'W_z', 'cm³', 'el. Widerstandsmoment, schwache Achse (kleinerer Wert)'],
    ['iz', 'i_z', 'cm', 'Trägheitsradius, schwache Achse'],
    ['It', 'I_t', 'cm⁴', 'Torsionsträgheitsmoment'],
    ['ey', 'e_y', 'cm', 'Schwerpunkt ab Stegrücken (beim U-Profil)'],
  ],
  mast: [
    ['h', 'h', 'mm', 'Höhe'],
    ['b', 'b', 'mm', 'Breite'],
    ['tw', 't_w', 'mm', 'Stegdicke'],
    ['tf', 't_f', 'mm', 'Flanschdicke'],
    ['r', 'r', 'mm', 'Ausrundung Steg–Flansch (EN 10365)'],
    ['A', 'A', 'cm²', 'Querschnittsfläche'],
    ['g', 'g', 'kg/m', 'Gewicht je Meter'],
    ['Iy', 'I_y', 'cm⁴', 'Trägheitsmoment, starke Achse'],
    ['Wy', 'W_y', 'cm³', 'el. Widerstandsmoment, starke Achse'],
    ['iy', 'i_y', 'cm', 'Trägheitsradius, starke Achse'],
    ['Iz', 'I_z', 'cm⁴', 'Trägheitsmoment, schwache Achse'],
    ['Wz', 'W_z', 'cm³', 'el. Widerstandsmoment, schwache Achse'],
    ['iz', 'i_z', 'cm', 'Trägheitsradius, schwache Achse'],
    ['It', 'I_t', 'cm⁴', 'Torsionsträgheitsmoment'],
  ],
  // Das Flachblech führt nur seine Masse - alle Kennwerte sind gerechnet.
  blech: [
    ['b', 'b', 'mm', 'Breite'],
    ['t', 't', 'mm', 'Dicke'],
    ['l', 'l', 'mm', 'Länge zwischen den Gurten (Stückliste)'],
  ],
  anker: [
    ['h', 'h', 'mm', 'Höhe des Einzelprofils'],
    ['b', 'b', 'mm', 'Breite des Einzelprofils'],
    ['tw', 't_w', 'mm', 'Stegdicke'],
    ['tf', 't_f', 'mm', 'Flanschdicke (Flanschmitte)'],
    ['r', 'r', 'mm', 'Ausrundungsradius'],
    ['ey', 'e_y', 'cm', 'Schwerpunkt ab Stegrücken'],
    ['AEinzel', 'A', 'cm²', 'Querschnittsfläche, ein Profil'],
    ['IyEinzel', 'I_y', 'cm⁴', 'Trägheitsmoment, starke Achse, ein Profil'],
    ['IzEinzel', 'I_z', 'cm⁴', 'Trägheitsmoment, schwache Achse, ein Profil'],
    ['A', 'ΣA', 'cm²', 'Querschnittsfläche, beide Profile'],
    ['Iy', 'ΣI_y', 'cm⁴', 'Trägheitsmoment starke Achse, beide Profile'],
    ['It', 'ΣI_t', 'cm⁴', 'Torsionsträgheitsmoment, beide Profile'],
    ['G', 'G', 'kg/m', 'Gewicht je Meter, beide Profile'],
  ],
};

/**
 * Die Zahl, wie sie in der Tabelle steht. Kein toFixed: «2.17» bleibt 2.17
 * und «2.1» nicht «2.10» - sonst sähe eine Rundung aus wie ein Messwert.
 */
const roh = (v) => (Number.isFinite(v) ? String(v) : '–');

/* ===========================================================================
 * DIE ZEICHNUNG
 * ===========================================================================
 *
 * Der Umriss ist der gerundete Polygonzug aus `umrissPunkte` - derselbe, aus
 * dem `querschnittAusUmriss` rechnet.
 */
function umriss(g, P) {
  return umrissPunkte(g, 12).map(([y, z], i) => {
    const [x, v] = P(y, z);
    return `${i ? 'L' : 'M'} ${x} ${v}`;
  }).join(' ') + ' Z';
}

/** Ausdehnung im Zeichnungssystem [mm]: y0, y1, z0, z1. */
function ausdehnung(g) {
  if (g.form === 'L') return { y0: 0, y1: g.aH, z0: 0, z1: g.aV };
  if (g.form === 'U') return { y0: 0, y1: g.b, z0: -g.h / 2, z1: g.h / 2 };
  // R wie I: Mitte im Nullpunkt.
  return { y0: -g.b / 2, y1: g.b / 2, z0: -g.h / 2, z1: g.h / 2 };
}

/** Eine Zahl in mm für die Vermassung: ganze mm ohne Nachkommastelle. */
const mm = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));

/**
 * Die Schnittzeichnung als SVG.
 *
 * Massstäblich: ein Massstab für beide Richtungen, das Profil füllt ein
 * Feld von rund 230 px. Die Masse stehen aussen (links, unten, rechts), die
 * Dicken mit einer Hinweislinie, der Schwerpunkt S mit seinen beiden
 * Abständen zur Bezugskante.
 */
export function profilSchnittSvg(g, name = '') {
  if (!g) return '';
  const e = ausdehnung(g);
  const B = e.y1 - e.y0, H = e.z1 - e.z0;
  const feld = 230;
  const skala = feld / Math.max(B, H);
  const rand = { l: 48, r: 92, o: 44, u: 52 };
  const W = B * skala + rand.l + rand.r;
  const Ht = H * skala + rand.o + rand.u;
  const P = (y, z) => [+(rand.l + (y - e.y0) * skala).toFixed(2),
                       +(rand.o + (e.z1 - z) * skala).toFixed(2)];

  const teile = [];
  const linie = (a, b, kl = 'pb-mass') =>
    `<line class="${kl}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
  const text = (pt, t, anker = 'middle', dy = 0, kl = 'pb-text') =>
    `<text class="${kl}" x="${pt[0]}" y="${pt[1] + dy}" text-anchor="${anker}">${esc(t)}</text>`;

  // Waagrechtes Mass unter (abstandPx > 0) oder über (< 0) einer Kante z,
  // Wert mittig über der Masslinie.
  const massH = (y0, y1, zKante, abstandPx, wert) => {
    const a = P(y0, zKante), b = P(y1, zKante);
    const yv = a[1] + abstandPx;
    const s = Math.sign(abstandPx);
    teile.push(linie([a[0], a[1] + 3 * s], [a[0], yv + 4 * s], 'pb-hilf'),
               linie([b[0], b[1] + 3 * s], [b[0], yv + 4 * s], 'pb-hilf'),
               linie([a[0], yv], [b[0], yv]),
               linie([a[0] - 3, yv + 3], [a[0] + 3, yv - 3]),
               linie([b[0] - 3, yv + 3], [b[0] + 3, yv - 3]),
               text([(a[0] + b[0]) / 2, yv], wert, 'middle', -4));
  };
  // Lotrechtes Mass links (abstandPx < 0) oder rechts (> 0) einer Kante y.
  const massV = (z0, z1, yKante, abstandPx, wert) => {
    const a = P(yKante, z0), b = P(yKante, z1);
    const xv = a[0] + abstandPx;
    const s = Math.sign(abstandPx);
    teile.push(linie([a[0] + 3 * s, a[1]], [xv + 4 * s, a[1]], 'pb-hilf'),
               linie([b[0] + 3 * s, b[1]], [xv + 4 * s, b[1]], 'pb-hilf'),
               linie([xv, a[1]], [xv, b[1]]),
               linie([xv - 3, a[1] + 3], [xv + 3, a[1] - 3]),
               linie([xv - 3, b[1] + 3], [xv + 3, b[1] - 3]),
               /*
                * Der Wert steht gedreht an der Masslinie, wie auf einer
                * Zeichnung - waagrecht passte «a_V = 130» links nicht in den
                * Rand und wurde abgeschnitten. Gedreht um −90° liegt die
                * Schrift links der Grundlinie; rechts wird sie deshalb um
                * eine Schrifthöhe weiter hinausgesetzt.
                */
               (() => {
                 const x = s < 0 ? xv - 4 : xv + 13, y = (a[1] + b[1]) / 2;
                 return `<text class="pb-text" x="${x}" y="${y}" text-anchor="middle"
                   transform="rotate(-90 ${x} ${y})">${esc(wert)}</text>`;
               })());
  };
  // Dicke mit Hinweislinie: Punkt im Material, Text daneben.
  const dicke = (y, z, dxPx, dyPx, wert) => {
    const a = P(y, z);
    const b = [a[0] + dxPx, a[1] + dyPx];
    teile.push(`<circle class="pb-punkt" cx="${a[0]}" cy="${a[1]}" r="1.8"/>`,
               linie(a, b, 'pb-hilf'),
               text(b, wert, dxPx < 0 ? 'end' : 'start', dyPx < 0 ? -2 : 10));
  };

  if (g.form === 'R') {
    massH(e.y0, e.y1, e.z0, 22, `b = ${mm(g.b)}`);
    massV(e.z0, e.z1, e.y0, -26, `t = ${mm(g.h)}`);
  } else if (g.form === 'L') {
    massH(0, g.aH, 0, 22, `a_H = ${mm(g.aH)}`);
    massV(0, g.aV, 0, -26, `a_V = ${mm(g.aV)}`);
    dicke(g.aH * 0.75, g.t / 2, 26, -22, `t = ${mm(g.t)}`);
    // r1 in der Kehle, Hinweislinie weit in den freien Winkel - knapp
    // daneben steht S; r2 an der Spitze des stehenden Schenkels, nach rechts.
    if (g.r1) dicke(g.t + g.r1 * 0.3, g.t + g.r1 * 0.3, 70, -78, `r₁ = ${mm(g.r1)}`);
    if (g.r2) dicke(g.t - g.r2 * 0.3, g.aV - g.r2 * 0.6, 24, 18, `r₂ = ${mm(g.r2)}`);
  } else {
    massH(e.y0, e.y1, e.z0, 22, `b = ${mm(g.b)}`);
    massV(e.z0, e.z1, e.y0, -26, `h = ${mm(g.h)}`);
    const yF = g.form === 'U' ? (g.neigung ? g.b / 2 : g.tw + (g.b - g.tw) / 2) : g.b / 2 * 0.7;
    dicke(yF, e.z1 - g.tf / 2, 18, -16, `t_f = ${mm(g.tf)}`);
    const yW = g.form === 'U' ? g.tw / 2 : 0;
    dicke(yW, -g.h * 0.22, 46, 16, `t_w = ${mm(g.tw)}`);
    // Der Radius an der OBEREN Ausrundung, mit der Hinweislinie in den
    // freien Raum zwischen den Flanschen - unten lief er ins Mass b.
    const zKehle = g.h / 2 - g.tf - (g.neigung ?? 0) * (g.b / 2 - g.tw);
    if (g.r) dicke(g.form === 'U' ? g.tw + g.r * 0.3 : g.tw / 2 + g.r * 0.3,
                   zKehle - g.r * 0.3, 34, 30, `${g.r2 ? 'r₁' : 'r'} = ${mm(g.r)}`);
    if (g.r2) dicke(g.b - g.r2 * 0.4, g.h / 2 - g.tf * 0.55, 10, 44, `r₂ = ${mm(g.r2)}`);
    if (g.neigung) {
      // Rechts neben der Flanschspitze - zwischen den Flanschen stehen r1 und t_w.
      const [xn, yn] = P(g.b, g.h / 2 - g.tf * 0.4);
      teile.push(text([xn + 6, yn], `Neigung ${mm(g.neigung * 100)} %`, 'start', 4, 'pb-achstext'));
    }
  }

  /*
   * DER SCHWERPUNKT. Achsen y und z gestrichelt durch S, über den Umriss
   * hinaus. Beim L und beim U stehen die Abstände zur Bezugskante als Mass
   * dabei - beim doppelt symmetrischen I liegt S in der Mitte, ein Mass
   * wäre dort eine Wiederholung von h/2.
   */
  let sText = '';
  if (Number.isFinite(g.ys) && Number.isFinite(g.zs)) {
    const S = P(g.ys, g.zs);
    const ueber = 14;
    const yl = P(e.y0, g.zs), yr = P(e.y1, g.zs);
    const zo = P(g.ys, e.z1), zu = P(g.ys, e.z0);
    teile.push(
      `<line class="pb-achse" x1="${yl[0] - ueber}" y1="${S[1]}" x2="${yr[0] + ueber}" y2="${S[1]}"/>`,
      `<line class="pb-achse" x1="${S[0]}" y1="${zo[1] - ueber}" x2="${S[0]}" y2="${zu[1] + ueber}"/>`,
      text([yr[0] + ueber + 3, S[1]], 'y', 'start', 4, 'pb-achstext'),
      text([S[0], zo[1] - ueber - 3], 'z', 'middle', 0, 'pb-achstext'),
      `<circle class="pb-s" cx="${S[0]}" cy="${S[1]}" r="4.5"/>`,
      `<line class="pb-s-kreuz" x1="${S[0] - 4.5}" y1="${S[1]}" x2="${S[0] + 4.5}" y2="${S[1]}"/>`,
      `<line class="pb-s-kreuz" x1="${S[0]}" y1="${S[1] - 4.5}" x2="${S[0]}" y2="${S[1] + 4.5}"/>`,
      text([S[0] + 7, S[1] - 6], 'S', 'start', 0, 'pb-s-text'));
    if (g.form === 'L') {
      // y_s ab der Aussenfläche des stehenden Schenkels (links), oben vermasst;
      // z_s ab der Aussenfläche des liegenden Schenkels (unten), rechts.
      massH(0, g.ys, g.aV, -18, `y_s = ${mm(g.ys)}`);
      massV(0, g.zs, g.aH, 30, `z_s = ${mm(g.zs)}`);
      sText = `Schwerpunkt S: y_s = ${mm(g.ys)} mm ab Aussenfläche des stehenden, `
            + `z_s = ${mm(g.zs)} mm ab Aussenfläche des liegenden Schenkels.`;
    } else if (g.form === 'U') {
      massH(0, g.ys, e.z1, -18, `e_y = ${mm(g.ys)}`);
      sText = `Schwerpunkt S: e_y = ${mm(g.ys)} mm ab Stegrücken, in halber Höhe.`;
    } else {
      sText = 'Schwerpunkt S in der Mitte (doppelt symmetrisch).';
    }
    if (g.form === 'R') sText += ' Schnitt quer zur Blechlänge.';
  } else {
    sText = 'Lage des Schwerpunkts nicht hinterlegt.';
  }

  const svg = `<svg class="pb-svg" viewBox="0 0 ${W.toFixed(0)} ${Ht.toFixed(0)}"
      width="${W.toFixed(0)}" role="img" aria-label="Schnitt ${esc(name)}">
    <path class="pb-flaeche" d="${umriss(g, P)}"/>
    ${teile.join('\n    ')}
  </svg>`;
  return { svg, sText };
}

/**
 * Die Zeilen der Kenndaten: jedes Feld der Tabelle, in ihrer Einheit, so wie
 * es hinterlegt ist. Dazu, eigens gekennzeichnet, was das Blatt ableitet.
 */
function zeilen(art, p) {
  const z = (FELDER[art] ?? []).map(([k, sym, einheit, text]) => ({
    sym, einheit, text, wert: roh(p?.[k]),
  }));
  /*
   * DIE WINKEL FÜHREN KEIN I. Die Tabellen der Literatur führen es, und
   * damit man es abgleichen kann, steht es hier - aus i² · A gerechnet und
   * als solches angeschrieben, nicht als hinterlegter Wert.
   */
  if (art === 'blech' && Number.isFinite(p?.b) && Number.isFinite(p?.t)) {
    const k = blechWerte(p.b, p.t);
    for (const [key, sym, einheit, text] of [
      ['A', 'A', 'cm²', 'Querschnittsfläche b · t'],
      ['Iy', 'I_y', 'cm⁴', 'in der Blechebene, t · b³ / 12'],
      ['Iz', 'I_z', 'cm⁴', 'quer zur Ebene, b · t³ / 12'],
      ['Wy', 'W_y', 'cm³', 't · b² / 6'],
      ['Wz', 'W_z', 'cm³', 'b · t² / 6'],
      ['It', 'I_t', 'cm⁴', 'b · t³ / 3 · (1 − 0.63 t/b)']]) {
      z.push({ sym, einheit, abgeleitet: true, text: `gerechnet: ${text}`,
               wert: k[key].toFixed(2) });
    }
  }
  if (art === 'winkel' && Number.isFinite(p?.A)) {
    for (const [i, sym] of [['iy', 'I_y'], ['iz', 'I_z'], ['imin', 'I_v']]) {
      if (Number.isFinite(p[i])) {
        z.push({ sym, einheit: 'cm⁴', abgeleitet: true,
                 text: `abgeleitet: ${sym.replace('I', 'i')}² · A`,
                 wert: (p[i] ** 2 * p.A).toFixed(2) });
      }
    }
    // I_t, wie das Stabwerk ihn rechnet (core.winkel.js, winkelIt).
    if (Number.isFinite(p.t)) {
      const aH = p.aH ?? p.a, aV = p.aV ?? p.a;
      z.push({ sym: 'I_t', einheit: 'cm⁴', abgeleitet: true,
               text: 'abgeleitet: (a_H + a_V) · t³ / 3, dünnwandig, wie im Stabwerk',
               wert: (((aH + aV) * p.t ** 3) / 3 / 1e4).toFixed(2) });
    }
  }
  return z;
}

/** Was unter der Zeichnung zur Ausführung gesagt werden muss. */
function vermerke(art, g) {
  const v = [];
  if (g && !g.r && g.form !== 'L' && g.form !== 'R') {
    v.push('Kein Ausrundungsradius hinterlegt — die Ecken zwischen Steg und Flansch sind scharf gezeichnet.');
  }
  if (g?.form === 'L' && !(g.r1 > 0)) {
    v.push('Für diesen Winkel sind keine Ausrundungen hinterlegt — gezeichnet nach Sollgeometrie ohne Rundungen.');
  }
  if (g?.form === 'L' && g.r1 > 0) {
    v.push('Gezeichnet nach EN 10056-1: r₁ in der Kehle, r₂ an den Schenkelspitzen, Aussenecke scharf.');
  }
  if (art === 'anker') {
    v.push('Gezeichnet ist EIN Profil (UNP nach DIN 1026-1: Flanschneigung 8 %, t_f im Abstand b/2 vom Stegrücken, r₂ = r₁/2). Die Stütze besteht aus zweien, gespreizt über die Länge.');
  }
  return v;
}

/**
 * DAS BLATT als HTML für den Dialog.
 *
 * @param {object} e  Eintrag der Profiltafel: { art, p, name, rolle, quelle }
 *                    art: 'winkel' | 'walz' | 'mast' | 'anker'
 */
/**
 * >>> DAS BLATT DES GITTERMASTS (3. Oktober). <<<
 * Kein Walzprofil mit Schnitt, sondern ein Fachwerk: Gurte, Aussenmasse,
 * Teilung, Bleche, Rohr - wie das Sortiment sie führt. Die Zahlen der
 * Profiltafel (A, I, W) sind ERSATZWERTE des Kopfquerschnitts; sie tragen
 * nur die vorläufige Anzeige des Ersatzbalkens.
 */
function gitterBlattHtml(e) {
  let G = null;
  try { G = gittermastGeometrie(e.p.gitter); } catch { G = null; }
  if (!G) return '<p class="notiz">Zu diesem Gittermast fehlt das Sortiment.</p>';
  const st = G.stationen;
  const mm = (v) => Math.round(v * 1000);
  const knick = st.find((s) => s.blech?.art === 'knick') ?? st[st.length - 1];
  const kopf = st[st.length - 1];
  const zeile = (a, b, c = '') => `<tr><td>${esc(a)}</td><td class="num">${esc(b)}</td><td>${esc(c)}</td></tr>`;
  const oben = G.oben ? (G.oben.art === 'rohr'
    ? `Rohr ø ${mm(G.oben.d)} × ${(G.oben.t * 1000).toFixed(1)}, ${G.oben.innen.toFixed(2)} m im Oberteil, ${G.oben.laenge.toFixed(2)} m frei`
    : `Mastaufsatz ${mm(G.oben.a)} × ${mm(G.oben.a)} × ${(G.oben.t * 1000).toFixed(1)}, ${G.oben.laenge.toFixed(2)} m`) : 'ohne';
  return `<div class="pb"><div class="pb-daten" style="flex:1 1 100%">
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Angabe</th><th class="num">Wert</th><th>Bemerkung</th></tr></thead><tbody>
      ${zeile('Gurt unten', G.gurtUnten, 'vier Winkel, Schenkel nach innen')}
      ${zeile('Gurt oben', G.gurtOben, '')}
      ${zeile('Höhe Unterteil / Oberteil', `${G.hUnten.toFixed(2)} / ${G.hOben.toFixed(2)} m`, 'unten konisch bis zum Knick')}
      ${zeile('Aussenmass am Fuss a / b', `${mm(st[0].a)} / ${mm(st[0].b)} mm`, '')}
      ${zeile('Aussenmass am Knick a / b', `${mm(knick.a)} / ${mm(knick.b)} mm`, '')}
      ${zeile('Aussenmass am Kopf a / b', `${mm(kopf.a)} / ${mm(kopf.b)} mm`, '')}
      ${zeile('Bindeblech-Stationen', String(st.filter((s) => s.blech).length), 'auf allen vier Seiten, Teilung nach Zeichnung')}
      ${zeile('Über dem Kopf', oben, '')}
      ${zeile('Gesamtlänge', `${G.laenge.toFixed(2)} m`, 'Gitter + Rohr bzw. Aufsatz')}
      </tbody></table></div>
    <p class="notiz" style="margin:4px 0 0">${esc(e.rolle ?? '')} · Sortiment Gittermasten
      (${esc(G.quelle === 'zeichnung' ? 'nach Detailzeichnung' : 'aus Katalog und Übersicht abgeleitet')}).
      Im Stabwerk steht der Mast als Fachwerk (Gurte, Bleche, Rohr je Stab). A, I und W der
      Profiltafel sind Ersatzwerte des Kopfquerschnitts für die vorläufige Anzeige des
      Ersatzbalkens.</p>
    ${gitterWindHtml(e.p.gitter)}
    ${e.p.hinweis ? `<p class="hinweis" style="margin:3px 0 0">${esc(e.p.hinweis)}</p>` : ''}
  </div></div>`;
}

/**
 * Die Herleitung der Windlast am Gittermast - «so festhalten in der app für
 * die nachvollziehbarkeit» (Weisung 3. Oktober).
 */
function gitterWindHtml(typ) {
  let h = null;
  try { h = gitterWindHerleitung(typ); } catch { h = null; }
  if (!h?.jeFlaeche) return '';
  const f2 = (v) => Number(v).toFixed(2), f3 = (v) => Number(v).toFixed(3);
  const eks = ['EK1', 'EK2', 'EK3'];
  const zeilen = h.zeilen.map((z) => `<tr><td>${esc(z.stelle)} (${f2(z.z)} m)</td><td>${z.richtung}</td>
    <td class="num">${f3(z.As)}</td><td class="num">${Math.round(z.breite * 1000)}</td><td class="num">${f2(z.phi)}</td>
    ${eks.map((ek) => `<td class="num">${f2(z.w[ek])}</td>`).join('')}</tr>`).join('');
  const oben = h.oben ? `<tr><td>${h.oben.art === 'rohr' ? 'Rohr' : 'Mastaufsatz'} über dem Kopf</td><td>a, b</td>
    <td class="num">${f3(h.oben.mass)}</td><td class="num">${Math.round(h.oben.mass * 1000)}</td><td class="num">–</td>
    ${eks.map((ek) => `<td class="num">${f2(h.oben.w[ek])}</td>`).join('')}</tr>` : '';
  return `<h4 style="margin:10px 0 4px">Wind auf den Gittermast — Herleitung</h4>
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Stelle</th><th>Wind in</th><th class="num">A_s [m²/m]</th><th class="num">Breite [mm]</th>
        <th class="num">Völligkeit</th>${eks.map((ek) => `<th class="num">w ${ek} [kN/m]</th>`).join('')}</tr></thead>
      <tbody>${zeilen}${oben}</tbody></table></div>
    <p class="notiz" style="margin:4px 0 0">Die Windlast der Tragjoche (Tabelle des Betreibers, je Meter) ist auf ihre
      Windangriffsfläche je Meter bezogen (stehende Gurtschenkel + Vertikalbleche einer Seite); das Mittel über die
      Jochtypen ergibt ${eks.map((ek) => `${f2(h.jeFlaeche[ek])}`).join(' / ')} kN je m² Angriffsfläche (EK1 / EK2 / EK3).
      Der Gittermast bekommt w = dieser Wert · A_s, mit A_s = zwei Gurtschenkel der Seite quer zum Wind + Bindebleche je
      Meter Höhe (höchstens die Breite); Völligkeit = A_s / Breite. Das Stabwerk setzt je Gurtabschnitt die Fläche seiner
      Höhe an.${h.oben?.art === 'rohr' ? ` Das Rohr: w = 1.2 · q · d mit q = ${eks.map((ek) => f2(h.staudruck?.[ek] ?? 0)).join(' / ')} kN/m².`
        : h.oben ? ' Der Mastaufsatz (Quadratrohr): derselbe Wert je m² auf seine Kante.' : ''}
      <b>Einheitswind (alte Norm):</b> w = 1.0 kN/m² · A_s, die Zahl der Spalte A_s in kN/m${h.oben
        ? `; über dem Kopf 1.0 · ${h.oben.art === 'rohr' ? 'd' : 'Kante'} = ${f2(h.oben.w.EK0)} kN/m` : ''}.</p>`;
}

export function profilBlattHtml(e) {
  if (!e?.p) return '<p class="notiz">Zu diesem Profil sind keine Kenndaten hinterlegt.</p>';
  if (e.p.gitter) return gitterBlattHtml(e);
  const g = profilGeometrie(e.art, e.p);
  const zeichnung = g ? profilSchnittSvg(g, e.name) : null;
  const tabelle = zeilen(e.art, e.p);
  const v = vermerke(e.art, g);
  return `
    <div class="pb">
      <div class="pb-bild">
        ${zeichnung ? zeichnung.svg
                    : '<p class="notiz">Keine Masse hinterlegt — keine Zeichnung.</p>'}
        ${zeichnung ? `<p class="notiz pb-s-zeile">${esc(zeichnung.sText)}
          Masse in mm, massstäblich.</p>` : ''}
        ${v.map((t) => `<p class="hinweis" style="margin:3px 0 0">${esc(t)}</p>`).join('')}
      </div>
      <div class="pb-daten">
        <div class="tabellenrahmen"><table class="dt">
          <thead><tr><th>Grösse</th><th class="num">Wert</th><th>Einheit</th>
            <th>Bedeutung</th></tr></thead>
          <tbody>${tabelle.map((r) => `
            <tr${r.abgeleitet ? ' class="pb-abgeleitet"' : ''}>
              <td>${esc(r.sym)}</td><td class="num">${esc(r.wert)}</td>
              <td>${esc(r.einheit)}</td><td>${esc(r.text)}</td></tr>`).join('')}
          </tbody></table></div>
        <p class="notiz" style="margin:4px 0 0">${esc(e.rolle ?? '')}${
          e.quelle ? ` · ${esc(e.quelle)}` : ''}. ${e.art === 'blech'
          ? 'Hinterlegt sind nur die Masse; die Kennwerte (kursiv) sind aus b × t gerechnet.'
          : `Die Werte stehen, wie sie in der Datenbasis hinterlegt sind
          (ungerundet, in der Einheit ihrer Tabelle) — zum Abgleich mit der
          Profiltabelle der Literatur. Kursiv: abgeleitet, wie gerechnet wird.`}</p>
        ${e.p.hinweis ? `<p class="hinweis" style="margin:3px 0 0">${esc(e.p.hinweis)}</p>` : ''}
      </div>
    </div>`;
}
