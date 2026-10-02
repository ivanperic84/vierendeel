/**
 * ui.anbausymbol.js
 * ---------------------------------------------------------------------------
 * >>> ANBAUTEILE SCHNELLER FINDEN: SYMBOL UND SUCHTEXT EINER VORLAGE
 *     (3. Oktober). <<<
 *
 * Weisung: «was man optimieren könnte ist eine einfacher umgang mit den
 * anbauteilen, wo man schneller die teile ausfindig machen kann um diese
 * dann zu verbauen. es ist zur zeit sehr viel text den man lesen muss um
 * das richtige bauteil zu finden.» Auf Rückfrage «Symbolkacheln» und
 * «Suchfeld + Filter».
 *
 * >>> DAS SYMBOL WIRD AUS DER VORLAGE ABGELEITET, NICHT GEZEICHNET. <<<
 *
 * Jede Vorlage führt ihre Bausteine mit Lage (x, z) und die Lasttabelle
 * ihre Rolle (Träger, Aufbau, Drahtwerk). Daraus entsteht eine Strichskizze
 * in der Sprache der Tragwerkskacheln: das Joch als zwei Gurte (am Masten
 * der Mast als Senkrechte), ein Träger als senkrechter Strich - z ist seine
 * Mitte, er reicht also bis 2·z -, ein Arm (Ausleger, Konsole, Rohr) vom
 * Anschluss bis 2·x, eine Traverse mittig mit ihrer Länge, ein Leiter als
 * Kreis, eine Lampe als Punkt, ein Kasten (Trafo, freie Fläche) als
 * Rechteck. So bekommt auch eine eigene Vorlage ihr Bild, und ein neuer
 * Katalogeintrag braucht keine Zeichnung.
 *
 * Gezeichnet wird nur, was die Daten sagen; die Skizze ist ein Wiedererkennen,
 * kein Massbild (sie wird in das Kästchen eingepasst).
 * ---------------------------------------------------------------------------
 */

import { getFlBauteil } from './data.fl.js';

const baustein = (id) => { try { return getFlBauteil(id); } catch { return null; } };

/** Was ein Baustein im Bild ist. */
function artVon(m) {
  const b = baustein(m.bauteil);
  const id = String(m.bauteil ?? '');
  if (b?.rolle === 'drahtwerk' || id.startsWith('drahtwerk')) return 'leiter';
  if (/lampe-(led|alt)(?!.*rohr)/.test(id) && !/lampenrohr/.test(id)) return 'lampe';
  if (/trafo|frei-flaeche|signal/.test(id) || m.signalbauer) return 'kasten';
  if (b?.rolle === 'traeger') return 'traeger';
  if (/traverse/.test(id) || Number(m.laenge) > 0) return 'traverse';
  return 'arm';
}

/**
 * Die Strichskizze einer Vorlage als SVG (48 × 32, Farbe = Schrift).
 * @param {object} v  Vorlage ({ module, ort, farbe })
 */
export function vorlageSymbol(v) {
  const module = v?.module ?? [];
  const amMast = v?.ort === 'mast';
  const striche = [];      // [x0, z0, x1, z1]
  const kreise = [];       // [x, z, voll]
  const kaesten = [];      // [x, z]
  // Wo der nächste Arm ansetzt: am Ende des letzten Trägers.
  let anX = 0, anZ = 0;
  const traversen = [];
  module.forEach((m) => {
    const x = Number(m.x) || 0, z = Number(m.z) || 0;
    const art = artVon(m);
    if (art === 'traeger') {
      const zEnde = 2 * z;
      // Der doppelte Jochaufsatz steht auf zwei Stielen.
      if (/doppelt/.test(String(m.bauteil))) {
        striche.push([anX - 0.3, anZ, anX - 0.3, zEnde], [anX + 0.3, anZ, anX + 0.3, zEnde]);
      } else {
        striche.push([anX, anZ, anX, zEnde]);
      }
      anZ = zEnde;
    } else if (art === 'traverse') {
      const L = Number(m.laenge) > 0 ? Number(m.laenge) : 1;
      striche.push([x - L / 2, z, x + L / 2, z]);
      if (Math.abs(z - anZ) > 1e-6) striche.push([anX, anZ, anX, z]);
      traversen.push({ x, z, L });
    } else if (art === 'arm') {
      if (Math.abs(z - anZ) > 1e-6) striche.push([anX, anZ, anX, z]);
      striche.push([anX, z, 2 * x || anX + 1, z]);
    } else if (art === 'leiter') {
      // Sitzt der Leiter mittig auf einer Traverse, hängt er an ihren Enden.
      const t = traversen.find((q) => Math.abs(q.z - z) < 1e-6 && Math.abs(q.x - x) < 1e-6);
      if (t) {
        kreise.push([t.x - t.L / 2, z, false], [t.x + t.L / 2, z, false]);
      } else {
        if (x === 0 && Math.abs(z - anZ) > 1e-6) striche.push([anX, anZ, anX, z]);
        kreise.push([x, z, false]);
      }
    } else if (art === 'lampe') {
      if (x === 0 && Math.abs(z - anZ) > 1e-6) striche.push([anX, anZ, anX, z]);
      kreise.push([x, z, true]);
    } else {
      if (x === 0 && Math.abs(z - anZ) > 1e-6) striche.push([anX, anZ, anX, z * 0.6]);
      kaesten.push([x, z]);
    }
  });
  // Bezug: das Joch (zwei Gurte) bzw. der Mast als Senkrechte.
  const xs = [0, ...striche.flatMap((s) => [s[0], s[2]]), ...kreise.map((k) => k[0]),
              ...kaesten.map((k) => k[0])];
  const zs = [0, ...striche.flatMap((s) => [s[1], s[3]]), ...kreise.map((k) => k[1]),
              ...kaesten.map((k) => k[1])];
  let x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const bezug = [];
  if (amMast) {
    const h = Math.max(1.2, (z1 - z0) + 1);
    bezug.push([0, z0 - h * 0.35, 0, z1 + h * 0.35]);
    z0 -= h * 0.35; z1 += h * 0.35;
  } else {
    const b = Math.max(1.6, (x1 - x0) + 1.2);
    const xm = (x0 + x1) / 2;
    bezug.push([xm - b / 2, 0, xm + b / 2, 0]);
    x0 = Math.min(x0, xm - b / 2); x1 = Math.max(x1, xm + b / 2);
  }
  // Einpassen, gleicher Massstab in beiden Richtungen.
  const B = 48, H = 32, r = 4;
  const s = Math.min((B - 2 * r) / Math.max(x1 - x0, 0.5), (H - 2 * r) / Math.max(z1 - z0, 0.5));
  const ox = (B - (x1 - x0) * s) / 2, oz = (H - (z1 - z0) * s) / 2;
  const X = (x) => +(ox + (x - x0) * s).toFixed(1);
  const Z = (z) => +(H - oz - (z - z0) * s).toFixed(1);
  const pfad = (l) => l.map(([a, b, c, d]) => `M${X(a)} ${Z(b)}L${X(c)} ${Z(d)}`).join('');
  // Das Joch als zwei Gurte, wie auf der Tragwerkskachel.
  const jochPfad = amMast ? pfad(bezug)
    : bezug.map(([a, , c]) => `M${X(a)} ${Z(0) - 1.2}L${X(c)} ${Z(0) - 1.2}M${X(a)} ${Z(0) + 1.2}L${X(c)} ${Z(0) + 1.2}`).join('');
  const inhalt = `<path d="${jochPfad}" stroke-width="1.2" opacity=".55"/>`
    + (striche.length ? `<path d="${pfad(striche)}"/>` : '')
    + kreise.map(([x, z, voll]) => `<circle cx="${X(x)}" cy="${Z(z)}" r="2.2"${voll
      ? ' fill="currentColor"' : ''}/>`).join('')
    + kaesten.map(([x, z]) => `<rect x="${X(x) - 3.5}" y="${Z(z) - 3}" width="7" height="6"/>`).join('');
  return `<svg class="at-symbol" viewBox="0 0 48 32" aria-hidden="true" fill="none"
    stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inhalt}</svg>`;
}

/** Klein, ohne Umlaute und Akzente - «hangestutze» findet die Hängestütze. */
export function suchNorm(t) {
  return String(t ?? '').toLowerCase().replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Wonach eine Vorlage gefunden wird: Name, Beschreibung, Gruppe und die
 * Namen ihrer Bausteine (so findet «95» den Jochaufsatz mit Cu 95).
 */
export function vorlageSuchtext(v, gruppenTitel = '') {
  const teile = (v?.module ?? []).map((m) => baustein(m.bauteil)?.name ?? m.bauteil);
  return suchNorm([v?.name, v?.beschreibung, gruppenTitel, ...teile].filter(Boolean).join(' '));
}

/**
 * Passt der Suchtext? Jedes Suchwort muss ein Wort des Textes BEGINNEN -
 * sonst fände «nt» jedes «unter» und «direkt» (im Browser gesehen:
 * «hangestutze nt» brachte auch die Hängestütze mit Fahrleitung).
 */
export function suchtextPasst(text, suche) {
  const w = suchNorm(suche).split(/\s+/).filter(Boolean);
  if (!w.length) return true;
  const woerter = String(text).split(/[^a-z0-9.]+/).filter(Boolean);
  return w.every((x) => woerter.some((t) => t.startsWith(x)));
}
