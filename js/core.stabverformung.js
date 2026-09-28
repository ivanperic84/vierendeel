/**
 * core.stabverformung.js
 * ---------------------------------------------------------------------------
 * DIE MASTVERFORMUNG AUS DEM STABWERK.
 *
 * Frage des Auftraggebers vom 28. September: «wurde die
 * gebrauchstauglichkeit auch in die stab nachweis methode überführt?» -
 * nein, sie kam aus dem Ersatzbalken. Gemessen am 26. September: am
 * geteilten Masten einer Reihe 2 × J90/20 m rechnet der Kern quer zum Gleis
 * 4.89 mm, das Stabwerk 5.81 mm - der Kern 16 % zu wenig, auf der
 * unsicheren Seite. Auf Rückfrage: «Ins Stabwerk».
 *
 * >>> WAS HIER GLEICH BLEIBT - UND WAS NICHT. <<<
 *
 * GLEICH wie in core.verformung.js: welche Fälle zählen (ständig +
 * Betriebswind `stufe === 'betrieb'`; nur Wind = die charakteristischen
 * Windfälle mal ψ = 0.70), die Messstelle (`stelle` aus `messStelle`, über
 * dem Mastfuss gemessen), der Grenzwert (40 mm quer) und die Auskunft über
 * die Mastspitze. Nur die WEGE kommen aus dem Löser statt aus dem Mastkern.
 * Eine zweite Herleitung der Regeln wäre eine zweite Wahrheit.
 *
 * >>> ZWISCHEN DEN KNOTEN: DIE BIEGELINIE, NICHT EINE GERADE. <<<
 *
 * Der Mast hat im Stabmodell wenige Knoten - Fuss, die Anschnitte der
 * Konsolen, Kopf. Der unterste Abschnitt ist rund 7 m lang, und die
 * Fahrdrahthöhe liegt meist in ihm. Linear zwischen zwei Knoten
 * interpoliert, läge der Wert weit daneben (am Kragarm ist die Biegelinie
 * kubisch bis quartisch). Gerechnet wird deshalb im Element:
 *
 *   - aus Weg und Verdrehung beider Knoten die Hermite-Form (exakt für
 *     einen Balken ohne Last im Feld), lokal v' = θ_z, w' = −θ_y - dieselbe
 *     Konvention wie die Festeinspannmomente in core.stabwerk.js;
 *   - dazu der Anteil der Streckenlast im Feld (der Mastwind), exakt für
 *     die gleichmässige Last am beidseitig eingespannten Balken:
 *     q L⁴ / (24 E I) · ξ² (1 − ξ)².
 *
 * Beides zusammen ist für Euler-Bernoulli und gleichmässige Last EXAKT.
 * Nicht enthalten ist die Schubverformung im Feld (am HEB-Masten
 * φ ≈ 0.008, unter einem Prozent) - an den Knoten ist sie im Löser
 * enthalten.
 * ---------------------------------------------------------------------------
 */

import { qsWerte } from './core.stabwerk.js';
import { anteileFuer } from './core.stabnachweis.js';
import { VERFORMUNG_GRENZEN, nurWindFaelle } from './core.verformung.js';
import { BETRIEBSWIND } from './core.lasten.js';

const RICHT = { X: 0, Y: 1, Z: 2 };

/**
 * Der Weg eines Punktes IM Stab, global, für eine Kombination.
 *
 * @param {object} dat      Modell aus stabmodellJson()
 * @param {object} lsg      Lösung aus loese()
 * @param {Array} anteile   [{lastfall, faktor}] aus anteileFuer()
 * @param {string} stab     Stabname
 * @param {number} xi       Stelle im Stab, 0 = von, 1 = bis
 * @returns {number[]|null} [ux, uy, uz] in m
 */
export function wegImStab(dat, lsg, anteile, stab, xi) {
  const e = (lsg.elemente ?? []).find((x) => x.s.name === stab);
  if (!e) return null;
  const R = e.R;
  const L = e.L;
  const qs = dat.querschnitte.find((q) => q.name === e.s.querschnitt);
  const w = qs ? qsWerte(qs) : null;
  const E = dat.material.E * 1000;                       // N/mm² -> kN/m²
  const N1 = 1 - 3 * xi ** 2 + 2 * xi ** 3;
  const N2 = xi - 2 * xi ** 2 + xi ** 3;
  const N3 = 3 * xi ** 2 - 2 * xi ** 3;
  const N4 = -(xi ** 2) + xi ** 3;
  const blase = xi ** 2 * (1 - xi) ** 2;
  const lokal = (v) => [0, 1, 2].map((r) => R[r][0] * v[0] + R[r][1] * v[1] + R[r][2] * v[2]);
  const summe = [0, 0, 0];

  (anteile ?? []).forEach(({ lastfall, faktor }) => {
    const uv = lsg.u.get(lastfall);
    if (!faktor || !uv) return;
    const ui = lokal([uv[e.i * 6], uv[e.i * 6 + 1], uv[e.i * 6 + 2]]);
    const ti = lokal([uv[e.i * 6 + 3], uv[e.i * 6 + 4], uv[e.i * 6 + 5]]);
    const uj = lokal([uv[e.j * 6], uv[e.j * 6 + 1], uv[e.j * 6 + 2]]);
    const tj = lokal([uv[e.j * 6 + 3], uv[e.j * 6 + 4], uv[e.j * 6 + 5]]);
    const u = ui[0] * (1 - xi) + uj[0] * xi;
    let v = N1 * ui[1] + N2 * L * ti[2] + N3 * uj[1] + N4 * L * tj[2];
    let ww = N1 * ui[2] - N2 * L * ti[1] + N3 * uj[2] - N4 * L * tj[1];
    // Die Streckenlast im Feld - dieselbe Liste, die der Löser ansetzt.
    if (w) {
      (dat.lasten?.strecke ?? []).forEach((l) => {
        if (l.stab !== stab || l.lastfall !== lastfall) return;
        const gv = [0, 0, 0]; gv[RICHT[l.richtung]] = l.wert;
        const q = lokal(gv);
        if (w.Iz > 0) v += (q[1] * L ** 4) / (24 * E * w.Iz) * blase;
        if (w.Iy > 0) ww += (q[2] * L ** 4) / (24 * E * w.Iy) * blase;
      });
    }
    // Zurück ins globale System: R^T · lokal.
    const loc = [u, v, ww];
    for (let c = 0; c < 3; c += 1) {
      summe[c] += faktor * (R[0][c] * loc[0] + R[1][c] * loc[1] + R[2][c] * loc[2]);
    }
  });
  return summe;
}

/**
 * Die Stäbe eines Masten, von unten nach oben, mit den Höhen ihrer Enden
 * über dem Mastfuss.
 */
export function mastZug(dat, id) {
  const kn = new Map(dat.knoten.map((k) => [k.name, k]));
  const st = dat.staebe
    .filter((s) => new RegExp(`^MAST_${id}_S\\d+$`).test(s.name))
    .map((s) => {
      const a = kn.get(s.von), b = kn.get(s.bis);
      const unten = a.z <= b.z;
      return { name: s.name, z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z), unten };
    })
    .sort((p, q) => p.z0 - q.z0);
  if (!st.length) return null;
  const fuss = st[0].z0;
  return { fuss, kopf: st[st.length - 1].z1 - fuss,
           staebe: st.map((s) => ({ ...s, h0: s.z0 - fuss, h1: s.z1 - fuss })) };
}

/** Der Weg des Masten auf der Höhe h über dem Fuss, global [ux, uy, uz]. */
export function mastWeg(dat, lsg, anteile, zug, h) {
  if (!zug) return null;
  const s = zug.staebe.find((x) => h >= x.h0 - 1e-9 && h <= x.h1 + 1e-9)
    ?? (h > zug.kopf ? zug.staebe[zug.staebe.length - 1] : null);
  if (!s) return null;
  const t = Math.min(1, Math.max(0, (h - s.h0) / (s.h1 - s.h0 || 1)));
  // Der Stab kann von oben nach unten laufen - xi zählt ab `von`.
  return wegImStab(dat, lsg, anteile, s.name, s.unten ? t : 1 - t);
}

/**
 * Der Verformungsnachweis aus dem Stabwerk - in der Gestalt, die
 * `verformungsNachweis` (core.verformung.js) liefert, damit die Anzeige
 * nichts unterscheiden muss.
 *
 * @param {object} kern     erg.verformung des Kerns (Messstelle, Masthöhe)
 * @param {object} dat      Modell aus stabmodellJson()
 * @param {object} lsg      Lösung aus loese()
 * @param {Array} faelle    ALLE Lastfälle der Sätze (auch die ohne Nachweis)
 * @param {object} namen    Mastname je Ende ({A: 'M1', B: 'M2'})
 */
export function verformungAusStabwerk(kern, dat, lsg, faelle, namen = {}) {
  if (!kern) return null;
  const mitG = faelle.filter((l) => l.stufe === 'betrieb');
  const nurW = nurWindFaelle(faelle);
  const achsIdx = { x: 0, y: 1 };
  const proEnde = {};
  ['A', 'B'].forEach((ende) => {
    const k = kern[ende];
    if (!k) return;
    const zug = mastZug(dat, namen[ende] ?? ende);
    if (!zug) return;
    const grosste = (fl, faktor, h, achsen) => {
      let best = null;
      fl.forEach((l) => {
        const u = mastWeg(dat, lsg, anteileFuer(l, dat), zug, h);
        if (!u) return;
        achsen.forEach((a) => {
          const wert = Math.abs(u[achsIdx[a]] * faktor);
          if (!best || wert > best.wert) best = { wert, achse: a, lastfall: l.key, bez: l.bez };
        });
      });
      return best;
    };
    const L = k.L;
    const stelle = k.stelle;
    const spitzeG = grosste(mitG, 1, L, ['x', 'y']);
    const spitzeW = grosste(nurW, BETRIEBSWIND, L, ['x', 'y']);
    const auskunft = [
      spitzeG ? { ...spitzeG, z: L, was: 'Mastspitze, ständig + Betriebswind',
                  vergleich: L / VERFORMUNG_GRENZEN.spitzeMitG } : null,
      spitzeW ? { ...spitzeW, z: L, was: 'Mastspitze, nur Wind',
                  vergleich: L / VERFORMUNG_GRENZEN.spitzeWind } : null,
    ].filter(Boolean);
    if (!stelle) {
      proEnde[ende] = { ...k, auskunft, quelle: 'stabwerk' };
      return;
    }
    const querS = grosste(nurW, BETRIEBSWIND, stelle.z, ['x']);
    const grenz = VERFORMUNG_GRENZEN.auslegerQuer;
    const nw = querS ? [{ ...querS, grenz, eta: querS.wert / grenz,
      ok: querS.wert <= grenz + 1e-12, z: stelle.z,
      was: `${stelle.was} auf ${stelle.z.toFixed(2)} m quer zum Gleis, nur Wind` }] : [];
    if (!nw.length) {
      proEnde[ende] = { ...k, auskunft, quelle: 'stabwerk' };
      return;
    }
    proEnde[ende] = { L, stelle, nachweise: nw, auskunft, massgebend: nw[0],
                      eta: nw[0].eta, ok: nw[0].ok, quelle: 'stabwerk',
                      kern: k.massgebend?.wert ?? null };
  });
  const enden = Object.values(proEnde);
  if (!enden.length) return null;
  const gefuehrt = enden.filter((x) => Number.isFinite(x.eta));
  return {
    ...proEnde,
    eta: gefuehrt.length ? Math.max(...gefuehrt.map((x) => x.eta)) : null,
    ok: gefuehrt.length ? gefuehrt.every((x) => x.ok) : null,
    ohneStelle: !gefuehrt.length,
    psi: BETRIEBSWIND,
    quelle: 'stabwerk',
  };
}
