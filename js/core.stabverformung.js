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
import { VERFORMUNG_GRENZEN, nurWindFaelle, spitzeNachweis } from './core.verformung.js';
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
  if (!st.length) {
    /*
     * >>> DER GITTERMAST (3. Oktober). <<<
     * Er hat keinen Stabzug auf der Achse, aber seine ACHSKNOTEN: jeder ist
     * starr an die vier Gurte seiner Höhe gebunden (Schott) und trägt damit
     * Weg und Verdrehung des Mastquerschnitts dort. Zwischen ihnen wird wie
     * im Stab interpoliert (Hermite aus Weg und Verdrehung, ohne Feldanteil).
     */
    const g = (dat.gittermasten ?? []).find((x) => x.id === id);
    if (!g) return null;
    const pk = g.achse.map((n) => kn.get(n)).filter(Boolean).sort((p, q) => p.z - q.z);
    if (pk.length < 2) return null;
    return { fuss: pk[0].z, kopf: pk[pk.length - 1].z - pk[0].z, staebe: [], gitter: true,
             knoten: pk.map((k) => ({ name: k.name, h: k.z - pk[0].z })) };
  }
  const fuss = st[0].z0;
  return { fuss, kopf: st[st.length - 1].z1 - fuss,
           staebe: st.map((s) => ({ ...s, h0: s.z0 - fuss, h1: s.z1 - fuss })) };
}

/** Der Weg des Masten auf der Höhe h über dem Fuss, global [ux, uy, uz]. */
/** Weg bzw. Verdrehung auf der Achse des Gittermasts, zwischen seinen Achsknoten. */
function gitterAchse(lsg, anteile, zug, h) {
  const kn = zug.knoten;
  const hh = Math.min(Math.max(h, 0), kn[kn.length - 1].h);
  let i = kn.findIndex((k, n) => n > 0 && hh <= k.h + 1e-9);
  if (i < 1) i = kn.length - 1;
  const a = kn[i - 1], b = kn[i];
  const L = b.h - a.h || 1;
  const xi = (hh - a.h) / L;
  const ia = lsg.knotenIdx.get(a.name), ib = lsg.knotenIdx.get(b.name);
  if (ia === undefined || ib === undefined) return null;
  const N1 = 1 - 3 * xi ** 2 + 2 * xi ** 3, N2 = xi - 2 * xi ** 2 + xi ** 3;
  const N3 = 3 * xi ** 2 - 2 * xi ** 3, N4 = -(xi ** 2) + xi ** 3;
  const u = [0, 0, 0];
  let phi = 0;
  (anteile ?? []).forEach(({ lastfall, faktor }) => {
    const uv = lsg.u.get(lastfall);
    if (!faktor || !uv) return;
    const A = (d) => uv[ia * 6 + d], B = (d) => uv[ib * 6 + d];
    // Lotrechte Achse: du_x/dz = +φ_y, du_y/dz = −φ_x.
    u[0] += faktor * (N1 * A(0) + N2 * L * A(4) + N3 * B(0) + N4 * L * B(4));
    u[1] += faktor * (N1 * A(1) - N2 * L * A(3) + N3 * B(1) - N4 * L * B(3));
    u[2] += faktor * (A(2) * (1 - xi) + B(2) * xi);
    phi += faktor * (A(5) * (1 - xi) + B(5) * xi);
  });
  return { u, phi };
}

export function mastWeg(dat, lsg, anteile, zug, h) {
  if (!zug) return null;
  if (zug.gitter) return gitterAchse(lsg, anteile, zug, h)?.u ?? null;
  const s = zug.staebe.find((x) => h >= x.h0 - 1e-9 && h <= x.h1 + 1e-9)
    ?? (h > zug.kopf ? zug.staebe[zug.staebe.length - 1] : null);
  if (!s) return null;
  const t = Math.min(1, Math.max(0, (h - s.h0) / (s.h1 - s.h0 || 1)));
  // Der Stab kann von oben nach unten laufen - xi zählt ab `von`.
  return wegImStab(dat, lsg, anteile, s.name, s.unten ? t : 1 - t);
}

/**
 * >>> DIE VERFORMTE FIGUR (30. September). <<<
 * Frage: «ist es möglich ein verformtes modell darzustellen im 3d? oder
 * kostet das zu viel performance? es wäre nur ein nice to have». Die
 * Knotenwege stehen in der Lösung; je echtem Stab werden `teilung` + 1
 * Punkte mit ihrem Weg gebildet (Biegelinie im Stab wie beim
 * Verformungsnachweis, `wegImStab`), Starrelemente und Links bleiben
 * draussen. Gemessen am J90/20 m: rund 470 Stäbe, einige Millisekunden.
 *
 * @param {Array} anteile [{lastfall, faktor}] aus anteileFuer()
 * @returns {{linien: Array<{punkte:number[][], wege:number[][]}>, max:number}}
 */
/*
 * Die Starrglieder der ANBAUTEILE gehören seit dem 4. Oktober zur Figur
 * («die fahrdrähte auch in orange aufführen»): die Kette vom Tragwerk zum
 * Leiter (ARM…, am Masten ARMM…) und ihr Anschlusskörper (AT…). Sie sind
 * starr - zwei Punkte je Glied genügen. In den grössten Weg zählen sie mit.
 */
const ANBAU_GLIED = /(?:^|_)(?:ARMM?\d|AT\d)/;

export function verformteFigur(dat, lsg, anteile, { teilung = 4 } = {}) {
  const kn = new Map((dat?.knoten ?? []).map((k) => [k.name, k]));
  const linien = [];
  let max = 0;
  (dat?.staebe ?? []).forEach((s) => {
    const anbau = s.art === 'starr' && ANBAU_GLIED.test(s.name);
    if (s.art !== 'stab' && !anbau) return;
    const a = kn.get(s.von), b = kn.get(s.bis);
    if (!a || !b) return;
    const punkte = [], wege = [];
    const n = anbau ? 1 : teilung;
    for (let i = 0; i <= n; i += 1) {
      const xi = i / n;
      const u = wegImStab(dat, lsg, anteile, s.name, xi);
      if (!u) return;
      punkte.push([a.x + (b.x - a.x) * xi, a.y + (b.y - a.y) * xi, a.z + (b.z - a.z) * xi]);
      wege.push(u);
      max = Math.max(max, Math.hypot(u[0], u[1], u[2]));
    }
    linien.push({ name: s.name, punkte, wege, ...(anbau ? { anbau: true } : {}) });
  });
  return { linien, max };
}

/**
 * >>> DIE VERDREHUNG UM DIE MASTACHSE (30. September). <<<
 * Weisung «hinzu kommt noch die mastverdrehung 5° als dritte prüfung», auf
 * Rückfrage «um die Mastachse», «Betriebswind ψ 0.70». Die globale
 * Knotenverdrehung um z an den beiden Enden des Mastabschnitts, linear
 * dazwischen (reine St.-Venant-Torsion im Abschnitt). Der Löser führt keine
 * Wölbkrafttorsion - der offene Mast ist darin weicher als in Wirklichkeit,
 * der Wert liegt auf der sicheren Seite.
 *
 * @returns {number|null} φ_z in rad
 */
export function mastVerdrehung(dat, lsg, anteile, zug, h) {
  if (!zug) return null;
  if (zug.gitter) return gitterAchse(lsg, anteile, zug, h)?.phi ?? null;
  const s = zug.staebe.find((x) => h >= x.h0 - 1e-9 && h <= x.h1 + 1e-9)
    ?? (h > zug.kopf ? zug.staebe[zug.staebe.length - 1] : null);
  if (!s) return null;
  const e = (lsg.elemente ?? []).find((x) => x.s.name === s.name);
  if (!e) return null;
  const t = Math.min(1, Math.max(0, (h - s.h0) / (s.h1 - s.h0 || 1)));
  const xi = s.unten ? t : 1 - t;                  // ab `von` gezählt
  let phi = 0;
  (anteile ?? []).forEach(({ lastfall, faktor }) => {
    const uv = lsg.u.get(lastfall);
    if (!faktor || !uv) return;
    phi += faktor * (uv[e.i * 6 + 5] * (1 - xi) + uv[e.j * 6 + 5] * xi);
  });
  return phi;
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
/** Der Weg eines Knotens [m, global] unter einer Kombination. */
function knotenWeg(lsg, anteile, name) {
  const i = lsg.knotenIdx?.get(name);
  if (i === undefined) return null;
  const u = [0, 0, 0];
  (anteile ?? []).forEach(({ lastfall, faktor }) => {
    const uv = lsg.u.get(lastfall);
    if (!faktor || !uv) return;
    for (let c = 0; c < 3; c += 1) u[c] += faktor * uv[i * 6 + c];
  });
  return u;
}

/* ===========================================================================
 * >>> DER NACHWEIS AM FAHRDRAHT (4. Oktober). <<<
 * Weisung: «ja nachweis auf fahrdrahtpunkt umstellen». Bis hierher galt die
 * Seitenlage an der Referenzhöhe am MASTEN (Verschiebung des Masten quer
 * zum Gleis). Jetzt die Auslenkung quer zum Gleis (global x) am Knoten
 * jedes Fahrdrahts des Tragwerks - mit Joch, Hängestütze und Ausleger
 * dazwischen, wie die verformte Figur sie zeigt. Dieselben Fälle (nur Wind
 * × ψ 0.70) und derselbe Grenzwert (40 mm, Optionen) wie bisher. Ohne
 * Fahrdraht im Stabwerk bleibt die Referenzhöhe am Masten (Rückfall), der
 * Ersatzbalken rechnet weiter dort.
 * `opt.praefix`: im Blatt die Fahrdrähte des aktiven Tragwerks (`T2_…`).
 * ========================================================================= */
function fahrdrahtNachweis(dat, lsg, nurW, grenz, opt = {}) {
  const liste = (dat.fahrdraehte ?? [])
    .filter((f) => !opt.praefix || String(f.knoten).startsWith(opt.praefix));
  if (!liste.length) return null;
  // Die Höhe über dem tiefsten Mastfuss des Modells (sonst über z = 0).
  const zMast = dat.knoten.filter((k) => /(?:^|_)MAST_/.test(k.name)).map((k) => k.z);
  const zBezug = zMast.length ? Math.min(...zMast) : 0;
  const kurz = (n) => String(n ?? '').split(' · ').pop();
  const nw = liste.map((f) => {
    let best = null;
    nurW.forEach((l) => {
      const u = knotenWeg(lsg, anteileFuer(l, dat), f.knoten);
      if (!u) return;
      const wert = Math.abs(u[0] * BETRIEBSWIND);
      if (!best || wert > best.wert) best = { wert, achse: 'x', lastfall: l.key, bez: l.bez, faktor: BETRIEBSWIND };
    });
    if (!best) return null;
    const kn = dat.knoten.find((k) => k.name === f.knoten);
    return { ...best, grenz, eta: best.wert / grenz, ok: best.wert <= grenz + 1e-12,
             z: kn ? kn.z - zBezug : null, knoten: f.knoten, fahrdraht: true,
             was: `Fahrdraht ${kurz(f.name)} quer zum Gleis, nur Wind` };
  }).filter(Boolean);
  if (!nw.length) return null;
  const mg = nw.reduce((a, b) => (b.eta > a.eta ? b : a));
  return { nachweise: nw, massgebend: mg, eta: mg.eta, ok: nw.every((q) => q.ok),
           auskunft: [], stelle: { was: 'Fahrdraht' }, quelle: 'stabwerk', fahrdraht: true };
}

export function verformungAusStabwerk(kern, dat, lsg, faelle, namen = {}, opt = {}) {
  if (!kern) return null;
  const mitSpitze = kern.spitze === true;
  // Die Schalter je Prüfung (30. September) - wie der Kern sie führt.
  const mitFahrdraht = kern.gruppen?.fahrdraht !== false;
  const mitVerdrehung = kern.gruppen?.verdrehung === true;
  const mitG = faelle.filter((l) => l.stufe === 'betrieb');
  const nurW = nurWindFaelle(faelle);
  // Am Fahrdraht, wo es einen gibt (4. Oktober) - sonst an der Referenzhöhe.
  const fd = mitFahrdraht
    ? fahrdrahtNachweis(dat, lsg, nurW, kern.grenzen?.fahrdraht ?? VERFORMUNG_GRENZEN.auslegerQuer, opt)
    : null;
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
          // `faktor`: womit der Fall in den Nachweis eingeht (ψ beim reinen
          // Wind) - die verformte Figur zeigt ihn damit (4. Oktober).
          if (!best || wert > best.wert) best = { wert, achse: a, lastfall: l.key, bez: l.bez, faktor };
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
      spitzeW && !mitSpitze ? { ...spitzeW, z: L, was: 'Mastspitze, nur Wind',
                  vergleich: L / VERFORMUNG_GRENZEN.spitzeWind } : null,
    ].filter(Boolean);
    const querS = stelle ? grosste(nurW, BETRIEBSWIND, stelle.z, ['x']) : null;
    // Die Grenzwerte aus den Optionen (30. September) nimmt das Stabwerk vom
    // Kern - dieselbe Zahl, keine zweite Lesart der Eingabe.
    const grenz = kern.grenzen?.fahrdraht ?? VERFORMUNG_GRENZEN.auslegerQuer;
    const spitzeN = kern.grenzen?.spitzeN ?? VERFORMUNG_GRENZEN.spitzeBetrieb;
    // Die Verdrehung um die Mastachse auf der Referenzhöhe (sonst an der
    // Spitze), nur Wind × ψ 0.70 - dieselben Fälle wie die übrigen.
    const hV = stelle?.z ?? L;
    let dreh = null;
    nurW.forEach((l) => {
      const phi = mastVerdrehung(dat, lsg, anteileFuer(l, dat), zug, hV);
      if (!Number.isFinite(phi)) return;
      const wert = Math.abs(phi * BETRIEBSWIND);
      if (!dreh || wert > dreh.wert) dreh = { wert, lastfall: l.key, bez: l.bez, faktor: BETRIEBSWIND };
    });
    const gradGrenz = kern.grenzen?.verdrehungGrad ?? VERFORMUNG_GRENZEN.verdrehungGrad;
    const drehGrenz = gradGrenz * Math.PI / 180;
    const drehWas = `Verdrehung um die Mastachse auf ${hV.toFixed(2)} m, Betriebswind`;
    // Die Mastspitze L/100 (30. September) - geführt, wie der Kern es sagt.
    const nw = [
      querS && mitFahrdraht && !fd ? { ...querS, grenz, eta: querS.wert / grenz,
        ok: querS.wert <= grenz + 1e-12, z: stelle.z,
        was: `${stelle.was} auf ${stelle.z.toFixed(2)} m quer zum Gleis, nur Wind` } : null,
      mitSpitze ? spitzeNachweis(spitzeW, L, spitzeN) : null,
      dreh && mitVerdrehung ? { ...dreh, grenz: drehGrenz, eta: dreh.wert / drehGrenz,
        ok: dreh.wert <= drehGrenz + 1e-12, z: hV, einheit: 'rad', verdrehung: true,
        was: drehWas } : null,
    ].filter(Boolean);
    // Ausgeschaltet bleiben Fahrdraht und Verdrehung Auskunft; die
    // Referenzhöhe am Masten auch dann, wenn am Fahrdraht nachgewiesen wird.
    if (querS && (!mitFahrdraht || fd)) {
      auskunft.push({ ...querS, z: stelle.z,
        was: `${stelle.was} auf ${stelle.z.toFixed(2)} m quer zum Gleis, nur Wind` });
    }
    if (dreh && !mitVerdrehung) {
      auskunft.push({ ...dreh, z: hV, einheit: 'rad', verdrehung: true, was: drehWas });
    }
    if (!nw.length) {
      // Wird am Fahrdraht nachgewiesen, trägt das Mastende keine Zahl des
      // Kerns weiter (sie stünde sonst im Urteil).
      proEnde[ende] = fd ? { L, stelle, nachweise: [], auskunft, quelle: 'stabwerk' }
                         : { ...k, auskunft, quelle: 'stabwerk' };
      return;
    }
    const schlimmste = nw.reduce((a, b) => (b.eta > a.eta ? b : a));
    proEnde[ende] = { L, stelle, nachweise: nw, auskunft, massgebend: schlimmste,
                      eta: schlimmste.eta, ok: nw.every((q) => q.ok), quelle: 'stabwerk',
                      kern: k.massgebend?.wert ?? null };
  });
  const enden = [...Object.values(proEnde), ...(fd ? [fd] : [])];
  if (!enden.length) return null;
  const gefuehrt = enden.filter((x) => Number.isFinite(x.eta));
  return {
    ...proEnde,
    ...(fd ? { fahrdraht: fd } : {}),
    eta: gefuehrt.length ? Math.max(...gefuehrt.map((x) => x.eta)) : null,
    ok: gefuehrt.length ? gefuehrt.every((x) => x.ok) : null,
    ohneStelle: !gefuehrt.length,
    psi: BETRIEBSWIND,
    spitze: mitSpitze,
    gruppen: kern.gruppen ?? null,
    grenzen: kern.grenzen ?? null,
    quelle: 'stabwerk',
  };
}
