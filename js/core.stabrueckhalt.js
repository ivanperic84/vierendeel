/**
 * core.stabrueckhalt.js
 * ---------------------------------------------------------------------------
 * >>> DER BEGRENZTE HALT DER LEITER (10. Oktober). <<<
 *
 * Weisung zur Rückhaltekraft: «diese kraft wirkt stabilisierend auf das
 * tragwerk, es erzeugt aufgrund der verdrehung und verformung eine kraft die
 * in gegenrichtung wikt, da die kettenwerke die nachbartragwerke aktivieren.»
 * Zuerst als FESTE Kraft p · Z gegen den Wind gebaut; auf die Frage «was ist
 * mit feste kraft zu verstehen?» und die Rückfrage dazu entschieden:
 * «Ja, begrenzter Halt» - «Der Punkt ist gehalten, die Kraft ist nur so
 * gross wie nötig und höchstens p · Z.»
 *
 * WAS GERECHNET WIRD. Jeder Leiter mit Rückhalt (direkt an Tragjoch oder
 * Tragausleger, `rueckhalt` am Teil, data.anbauteile.js) ist LÄNGS ZUM GLEIS
 * gehalten. Die Haltekraft f ist die, die seinen Punkt in y festhält -
 * höchstens R = min(p · Z, R_max), mal dem Beiwert des Winds längs in der
 * Kombination. Reicht das nicht, wirkt genau R gegen die Bewegung, und der
 * Punkt bewegt sich. Ohne Wind längs in der Kombination kein Halt (Entscheid
 * «Nur Wind längs»).
 *
 * EXAKT UND LINEAR, wie der Seilausfall (core.stabseil.js): die Modelldatei
 * führt je Leiter einen HILFSLASTFALL - 1 kN längs zum Gleis an seinem Punkt
 * (`Rueckhalt|<Kennung>|<R>`; am Tragausleger als Kräfte und Momente an den
 * beiden Gurtknoten der Station). Der Weg des Punkts in einem Lastfall ist
 * die Arbeit dieser Einheitslast auf dessen Knotenwegen (Arbeitssatz) - so
 * braucht es keine Geometrie des Punkts. Je Kombination ein kleines
 * Gleichungssystem: gehalten heisst Weg 0, ausgeschöpft heisst f = ±R; wer
 * seine Grenze überschreitet, wird ausgeschöpft, wer mit der Grenzkraft in
 * die falsche Richtung liefe, wieder gehalten. Das Ergebnis steht als
 * Faktor des Hilfsfalls in `dat.kombinationen` - alle Nachweise lesen es
 * über `anteileFuer`, und AxisVM rechnet dieselbe Datei LINEAR nach.
 * ---------------------------------------------------------------------------
 */

import { anteileFuer } from './core.stabnachweis.js';

/** Vorsilbe der Hilfslastfälle - einer je gehaltenem Leiter. */
export const RUECKHALT_FALL = 'Rueckhalt|';
/** Der Lastfall, dessen Beiwert den Halt skaliert. */
const WIND_LAENGS = 'WindY';

/** Der Schlüssel des Hilfsfalls: Kennung und Grösstwert R [kN]. */
export const rueckhaltSchluessel = (kennung, R) =>
  `${RUECKHALT_FALL}${String(kennung).replace(/\|/g, '/')}|${Number(R).toFixed(4)}`;

const KOMP = { X: 0, Y: 1, Z: 2, Mx: 3, My: 4, Mz: 5 };

/**
 * Die gehaltenen Punkte der Datei: je Hilfsfall seine Einheitslast (Kräfte
 * und Momente an Knoten) und der Grösstwert aus dem Schlüssel.
 */
export function rueckhaltPunkte(dat) {
  const je = new Map();
  const nimm = (l) => {
    const fall = String(l?.lastfall ?? '');
    if (!fall.startsWith(RUECKHALT_FALL)) return;
    const c = KOMP[l.richtung];
    if (c === undefined || !l.wert) return;
    if (!je.has(fall)) {
      je.set(fall, { key: fall, max: Number(fall.split('|').pop()) || 0, lasten: [] });
    }
    je.get(fall).lasten.push({ knoten: l.knoten, c, wert: l.wert });
  };
  (dat?.lasten?.punkt ?? []).forEach(nimm);
  (dat?.lasten?.moment ?? []).forEach(nimm);
  /*
   * LEITER AM SELBEN PUNKT SIND EIN HALT. Tragseil und Fahrdraht eines
   * Kettenwerks hängen am selben Knoten: zwei Hilfsfälle mit derselben
   * Einheitslast wären ein singuläres System (gemessen: der Halt fiel dann
   * still auf null). Sie werden zusammengelegt - die Grösstwerte addiert,
   * geführt wird der erste Hilfsfall. Gleiche Schlüssel hat die Datei schon
   * addiert: ihre Einheitslast ist dann ein Vielfaches (Massstab s), ihr
   * Grösstwert gilt je Einheit.
   */
  const gruppen = new Map();
  [...je.values()].filter((p) => p.max > 0 && p.lasten.length).forEach((p) => {
    const l = [...p.lasten].sort((a, b) => (a.knoten < b.knoten ? -1 : a.knoten > b.knoten ? 1 : a.c - b.c));
    const s = l[0].wert;
    const sig = l.map((q) => `${q.knoten}:${q.c}:${(q.wert / s).toFixed(6)}`).join(';');
    const da = gruppen.get(sig);
    if (da) da.max += (Math.abs(s) * p.max) / Math.abs(da.s);
    else gruppen.set(sig, { ...p, s });
  });
  // `max` gilt dem FAKTOR des Hilfsfalls; die Kraft am Punkt ist Faktor × |s|.
  // Die Einheit ist die Summe der Kräfte längs (am Tragausleger verteilt sich
  // 1 kN auf zwei Gurtknoten).
  return [...gruppen.values()].map(({ s, ...p }) => {
    const laengs = Math.abs(p.lasten.filter((q) => q.c === 1).reduce((su, q) => su + q.wert, 0));
    return { ...p, einheit: laengs > 0 ? laengs : Math.abs(s) };
  });
}

/** Die Lastfall-Einträge der Hilfsfälle (für die Datei, VOR `loese`). */
export function rueckhaltLastfaelle(schluessel) {
  return [...new Set(schluessel)].map((key, i) => ({
    key, label: `Rückhalt Leiter ${i + 1} (Hilfsfall, 1 kN längs)`, art: 'Others', hilfsfall: true }));
}

/** Kleines Gleichungssystem A x = b (Gauss mit Spaltenpivot). */
function loeseKlein(A, b) {
  const n = b.length;
  const M = A.map((z, i) => [...z, b[i]]);
  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-18) return null;
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k += 1) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((z, i) => z[n] / z[i]);
}

/**
 * >>> DER HALT JE KOMBINATION. <<<
 *
 * Ändert `dat.kombinationen`: jede Kombination mit Wind längs bekommt je
 * gehaltenem Leiter den Hilfsfall mit seiner Haltekraft als Faktor.
 *
 * @returns {{je: Map<string, Array<{key, f, grenze, gehalten}>>, punkte:number,
 *            groesste: Array<{key, max, f, ausgeschoepft, fall, bez}>}}
 */
export function rueckhaltHalten(dat, lsg, punkte, faelle) {
  const je = new Map();
  if (!punkte?.length || !lsg?.u || !lsg.knotenIdx) return { je, punkte: 0, groesste: [] };
  // Der Weg des Punkts i in einem Grundfall = Arbeit seiner Einheitslast.
  const wegMerk = new Map();
  const weg = (i, fall) => {
    const k = `${i}|${fall}`;
    if (wegMerk.has(k)) return wegMerk.get(k);
    const uv = lsg.u.get(fall);
    let s = 0;
    if (uv) {
      punkte[i].lasten.forEach((l) => {
        const idx = lsg.knotenIdx.get(l.knoten);
        if (idx !== undefined) s += l.wert * uv[idx * 6 + l.c];
      });
    }
    wegMerk.set(k, s);
    return s;
  };
  const n = punkte.length;
  // a[i][j]: Weg von i unter der Einheitskraft von j.
  const a = punkte.map((_, i) => punkte.map((q) => weg(i, q.key)));
  // Kraft am Punkt = Faktor × Einheit (siehe `rueckhaltPunkte`).
  const groesste = punkte.map((p) => ({ key: p.key, max: p.max * (p.einheit ?? 1), f: 0, ausgeschoepft: false, fall: null, bez: null }));
  const vorhanden = new Map((dat.kombinationen ?? []).map((k) => [k.key, k]));

  faelle.forEach((lf) => {
    const anteile = anteileFuer(lf, dat).filter((x) => !String(x.lastfall).startsWith(RUECKHALT_FALL));
    const fw = Math.abs(anteile.filter((x) => x.lastfall === WIND_LAENGS)
      .reduce((s, x) => s + (x.faktor || 0), 0));
    if (!(fw > 1e-12)) return;
    const u0 = punkte.map((_, i) => anteile.reduce(
      (s, { lastfall, faktor }) => s + (faktor || 0) * weg(i, lastfall), 0));
    const grenze = punkte.map((p) => p.max * fw);
    // Ausgeschöpfte Punkte mit dem Vorzeichen ihrer Kraft; die übrigen gehalten.
    const aus = new Map();
    let f = new Array(n).fill(0);
    for (let durchgang = 0; durchgang < 4 * n + 6; durchgang += 1) {
      const S = punkte.map((_, i) => i).filter((i) => !aus.has(i));
      f = new Array(n).fill(0);
      aus.forEach((vz, i) => { f[i] = vz * grenze[i]; });
      if (S.length) {
        const b = S.map((i) => -(u0[i] + [...aus.keys()].reduce((s, c) => s + a[i][c] * f[c], 0)));
        const x = loeseKlein(S.map((i) => S.map((j) => a[i][j])), b);
        if (!x) break;
        S.forEach((i, k) => { f[i] = x[k]; });
      }
      // Wer am meisten über seiner Grenze liegt, wird ausgeschöpft - einer je Durchgang.
      let schlimm = -1, mass = 1 + 1e-9;
      S.forEach((i) => {
        const q = grenze[i] > 0 ? Math.abs(f[i]) / grenze[i] : Infinity;
        if (q > mass) { mass = q; schlimm = i; }
      });
      if (schlimm >= 0) { aus.set(schlimm, Math.sign(f[schlimm]) || 1); continue; }
      // Ein ausgeschöpfter Punkt muss sich GEGEN seine Kraft bewegen; sonst hält er wieder.
      const zurueck = [...aus.keys()].find((i) => {
        const u = u0[i] + f.reduce((s, fj, j) => s + a[i][j] * fj, 0);
        return u * f[i] > 1e-12 * Math.max(1, Math.abs(u0[i]));
      });
      if (zurueck === undefined) break;
      aus.delete(zurueck);
    }
    const info = punkte.map((p, i) => ({ key: p.key, f: f[i], grenze: grenze[i], gehalten: !aus.has(i) }));
    je.set(lf.key, info);
    info.forEach((x, i) => {
      // Auf das charakteristische Niveau bezogen, damit Fälle vergleichbar sind.
      const fk = (Math.abs(x.f) / fw) * (punkte[i].einheit ?? 1);
      if (fk > Math.abs(groesste[i].f)) {
        groesste[i] = { ...groesste[i], f: fk, ausgeschoepft: !x.gehalten, fall: lf.key, bez: lf.bez };
      }
    });
    const dazu = info.filter((x) => Math.abs(x.f) > 1e-12).map((x) => ({ lastfall: x.key, faktor: x.f }));
    if (!dazu.length) return;
    const neu = [...anteile, ...dazu];
    const k = vorhanden.get(lf.key);
    if (k) k.anteile = neu;
    else {
      const eintrag = { key: lf.key, bez: lf.bez, art: lf.art, nachweis: lf.nachweis !== false, anteile: neu };
      dat.kombinationen = dat.kombinationen ?? [];
      dat.kombinationen.push(eintrag);
      vorhanden.set(lf.key, eintrag);
    }
  });
  return { je, punkte: n, groesste };
}
