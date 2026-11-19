/* ===========================================================================
 * core.stabtheorie2.js
 * ---------------------------------------------------------------------------
 * THEORIE 2. ORDNUNG IM STABWERK (18. November, Etappe B).
 *
 * Auf «Soll die Theorie 2. Ordnung gebaut werden?» und meinen Vorschlag:
 * «A, dann B (Empfehlung)». Zu B auf Rückfrage, im Wortlaut der Wahl:
 *   - Imperfektion «EN 5.3.2, Wind-Richtung»: Schiefstellung
 *     phi = phi0 · alpha_h · alpha_m (phi0 = 1/200) als Ersatz-Horizontallast
 *     an jedem Mast, je Kombination in Richtung des leitenden Winds (bei
 *     Schnee leitend in Richtung des Begleitwinds);
 *   - Wirkung «Schalter, dann Urteil»: eingeschaltet tragen die
 *     Schnittgrössen 2. Ordnung alle Nachweise und das Urteil;
 *   - Knicken «Bleibt»: der Knicknachweis der Masten nach SIA 263 bleibt.
 *
 * WIE: je Nachweis-Kombination rechnet der Löser (`lsg.zweiteOrdnung`)
 * (K + K_G(N)) u = P mit der Kombination und der Schiefstellung als P und
 * legt das Ergebnis als eigenen Lastfall `TH2|<Kombination>` ab. Die
 * Kombination liest danach nur noch diesen Fall (`anteile`); ihre bisherigen
 * Anteile stehen unter `linear` (die Bügelschrauben brauchen den Hilfsfall).
 * Alles, was über `anteileFuer` liest - Hülle, Masten, Fundament, Anker,
 * Reaktionen, Zustandslinien -, nimmt damit die Werte 2. Ordnung.
 *
 * DIE ERSATZLAST (EN 1993-1-1, 5.3.2(7)): an jedem Mast H = phi · N, wo die
 * Normalkraft eingeleitet wird - je Knoten phi mal der Zuwachs der
 * Druckkraft von oben nach unten (Normalkraft aus der Rechnung 1. Ordnung
 * derselben Kombination). Am Fuss bleibt nichts übrig; die Summe ist phi
 * mal die Druckkraft am Fuss.
 *   alpha_h = 2/√h, 2/3 ≤ alpha_h ≤ 1, h = grösste Mastlänge [m]
 *   alpha_m = √(0.5 (1 + 1/m)), m = Masten mit mindestens der halben
 *             mittleren Fussdruckkraft
 *
 * WAS ES NICHT ERFASST: Gittermasten und gespreizte Masten tragen keine
 * Ersatzlast (kein Stabzug auf der Achse) - sie stehen in `ohneImperfektion`.
 * Seilausfall, Rückhalt und Hakenschrauben bleiben mit ihren Faktoren aus
 * der Rechnung 1. Ordnung. Seit dem 19. November auch die charakteristischen
 * Fälle mit ständiger und veränderlicher Last (Fundament, Anker); die
 * Gebrauchstauglichkeit bleibt nach Theorie 1. Ordnung.
 * ========================================================================= */
import { anteileFuer, kraefteAusAnteilen } from './core.stabnachweis.js';

export const TH2_FALL = 'TH2|';
export const PHI0 = 1 / 200;

/** Masten des Stabmodells: je Id die Stäbe von unten nach oben. */
export function mastZuege(dat) {
  const kn = new Map(dat.knoten.map((k) => [k.name, k]));
  const je = new Map();
  dat.staebe.forEach((s) => {
    const m = /^MAST_(.+)_S\d+$/.exec(s.name);
    if (!m || (s.art || 'stab') !== 'stab') return;
    const a = kn.get(s.von); const b = kn.get(s.bis);
    if (!a || !b) return;
    const unten = a.z <= b.z ? a : b; const oben = a.z <= b.z ? b : a;
    if (!je.has(m[1])) je.set(m[1], []);
    je.get(m[1]).push({ stab: s.name, unten: unten.name, oben: oben.name, zU: unten.z, zO: oben.z });
  });
  je.forEach((l) => l.sort((p, q) => p.zU - q.zU));
  return je;
}

/** Richtung der Schiefstellung aus den Beiwerten: der grössere Windanteil. */
export function imperfektionsRichtung(lf) {
  const b = lf?.beiwerte ?? {};
  const wx = Number(b.WindX) || 0; const wy = Number(b.WindY) || 0;
  if (!wx && !wy) return null;
  return Math.abs(wy) >= Math.abs(wx)
    ? { richtung: 'Y', vorzeichen: Math.sign(wy) }
    : { richtung: 'X', vorzeichen: Math.sign(wx) };
}

export function alphaH(h) {
  if (!(h > 0)) return 1;
  return Math.min(1, Math.max(2 / 3, 2 / Math.sqrt(h)));
}
export const alphaM = (m) => Math.sqrt(0.5 * (1 + 1 / Math.max(1, m)));

/**
 * Die Ersatzlast der Schiefstellung einer Kombination (EN 1993-1-1, 5.3.2):
 * je Mastknoten phi mal der Zuwachs der Druckkraft, in Windrichtung.
 * Auch für die Vergleichsdatei mit AxisVM (modell_knicken.mjs th2).
 */
export function schiefstellung(dat, lsg, lf, linear, zuege = mastZuege(dat), aH = null) {
  if (aH === null) {
    let h = 0;
    zuege.forEach((l) => { h = Math.max(h, l[l.length - 1].zO - l[0].zU); });
    aH = alphaH(h);
  }
  const kr = kraefteAusAnteilen(lsg, linear);
  // Endkräfte lokal: f[0] = -N am Anfang, f[6] = N am Ende (Zug positiv).
  const druckIn = (stab) => { const f = kr.get(stab); return f ? Math.max(0, f[0], -f[6]) : 0; };
  const druck = new Map();
  zuege.forEach((l, id) => druck.set(id, druckIn(l[0].stab)));
  const werte = [...druck.values()].filter((v) => v > 0);
  const mittel = werte.length ? werte.reduce((a, b) => a + b, 0) / werte.length : 0;
  const m = werte.filter((v) => v >= 0.5 * mittel).length;
  const phi = PHI0 * aH * alphaM(m);
  const ri = imperfektionsRichtung(lf);
  const zusatz = [];
  if (ri) {
    zuege.forEach((l) => {
      // Druck im Stab (positiv), von oben nach unten; Knotenlast = Zuwachs.
      const C = l.map((s) => druckIn(s.stab));
      l.forEach((s, i) => {
        const oben = i + 1 < l.length ? C[i + 1] : 0;
        const dC = C[i] - oben;
        if (dC > 0) zusatz.push({ knoten: s.oben, richtung: ri.richtung, wert: ri.vorzeichen * phi * dC });
      });
    });
  }
  return { zusatz, phi, m };
}

/**
 * Je Nachweis-Kombination die Rechnung 2. Ordnung einsetzen.
 * @returns {{phi, alphaH, alphaM, m, h, faelle, nichtKonvergiert, ohneRichtung,
 *            ohneImperfektion, iterationen, ms}}
 */
export function zweiteOrdnungEinsetzen(dat, lsg, faelle) {
  const t0 = Date.now();
  if (!lsg?.zweiteOrdnung) return null;
  const zuege = mastZuege(dat);
  let h = 0;
  zuege.forEach((l) => { h = Math.max(h, l[l.length - 1].zO - l[0].zU); });
  const aH = alphaH(h);
  const ohneImperfektion = (dat.gittermasten ?? []).map((g) => g.id)
    .concat((dat.gespreizt ?? []).map((g) => g.id));
  const nichtKonvergiert = []; const ohneRichtung = [];
  let mMin = Infinity; let mMax = 0; let itMax = 0; let phiMax = 0;
  (dat.kombinationen ??= []);
  faelle.forEach((lf) => {
    const linear = anteileFuer(lf, dat).filter((a) => !String(a.lastfall).startsWith(TH2_FALL));
    const { zusatz, phi, m } = schiefstellung(dat, lsg, lf, linear, zuege, aH);
    if (!imperfektionsRichtung(lf)) ohneRichtung.push(lf.key);
    const name = TH2_FALL + lf.key;
    const r = lsg.zweiteOrdnung(name, linear, zusatz);
    if (!r.konvergiert) nichtKonvergiert.push(lf.key);
    itMax = Math.max(itMax, r.iterationen);
    mMin = Math.min(mMin, m); mMax = Math.max(mMax, m); phiMax = Math.max(phiMax, phi);
    const neu = [{ lastfall: name, faktor: 1, linear }];
    const k = dat.kombinationen.find((x) => x.key === lf.key);
    if (k) k.anteile = neu; else dat.kombinationen.push({ key: lf.key, anteile: neu });
  });
  return { phi: phiMax, phi0: PHI0, alphaH: aH, mMin, mMax, h, faelle: faelle.length,
           nichtKonvergiert, ohneRichtung, ohneImperfektion, iterationen: itMax,
           ms: Date.now() - t0 };
}
