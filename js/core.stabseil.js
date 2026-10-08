/**
 * core.stabseil.js
 * ---------------------------------------------------------------------------
 * >>> DER SEILANKER TRÄGT AUCH IM STABWERK NUR ZUG (30. September). <<<
 *
 * Entscheid vom 16. September: «Seilanker trägt nur Zug; müsste er
 * drücken, fällt er aus und der Mast trägt allein.» Der Kern hält sich
 * daran; das lineare Stabwerk liess das Seil bis hierher auch DRÜCKEN.
 * Gefunden beim Umbau «nachweis so wie vorgeschlagen umbauen» (Fundament
 * aus dem Stabwerk): Einzelmast HEB 240 mit Seilanker SA20 quer, Fundament
 * Kern 0.300 gegen Stabwerk 0.218 - das Seil stützte in «Wind −x» den
 * Masten, statt durchzuhängen. Das traf auch die Mastkachel aus dem
 * Stabwerk; beides lag auf der unsicheren Seite.
 *
 * >>> EXAKT UND LINEAR: EIN HILFSFALL JE SEIL. <<<
 *
 * Ein Seil ausfallen zu lassen heisst, seine Kraft auf die Knoten
 * aufzuheben. Dafür bekommt jedes Seil einen Hilfslastfall: ein Kräftepaar
 * an seinen beiden Enden, in seiner Achse, das die Knoten auseinander
 * drückt (1 kN). In einer Kombination, in der das Seil drücken müsste, wird
 * der Hilfsfall mit dem Faktor λ zugemischt, der die Kraft des Seils auf
 * die Knoten genau aufhebt:
 *
 *     N(λ) = N_c + λ·n_P          Kraft aus den Wegen (Zug positiv)
 *     N(λ) = λ                    aufgehoben: Seil + Paar = 0
 *     λ    = N_c / (1 − n_P)
 *
 * Das übrige Tragwerk verhält sich dann genau so, als wäre das Seil nicht
 * da - und weil jede Nachweisrechnung ihre Kombination über
 * `anteileFuer(lf, dat)` zusammensetzt, lesen Mast, Fundament, Knicken und
 * Verformung den Ausfall mit, ohne dass sie davon wissen. Mehrere Seile:
 * ein kleines Gleichungssystem, und wer nach dem Ausfall der anderen doch
 * wieder Zug bekäme, kommt zurück (höchstens acht Durchgänge).
 *
 * Die Seile der ANKER (Seilkopf am Masten) und - seit dem 3. Oktober - die
 * Seile der AUFHÄNGUNG am Tragausleger. Weisung: «seildruck nicht zulassen
 * in der app.» Bis dahin blieben sie linear und `aufhaengungNachweis`
 * meldete ein gedrücktes Seil als Befund (Entscheid 28. September); jetzt
 * fällt es in der Kombination aus, das andere trägt allein. Fallen alle
 * Seile eines Auslegers aus, hebt er ab - das bleibt ein Befund.
 * ---------------------------------------------------------------------------
 */

import { anteileFuer } from './core.stabnachweis.js';

// Dieselben Fallarten wie der Ankernachweis (core.anker.js, ANKER_FALLARTEN).
const ANKER_FALLARTEN_SEIL = ['charakteristisch', 'aussergewoehnlich'];

/** Vorsilbe der Hilfslastfälle - einer je Seil. */
export const SEIL_AUS = 'SeilAus|';

/**
 * Die Seilanker der Datei: der Seilkopf (Link «nur Zug») am Masten und der
 * Seilstab dahinter, mit Anfangs-, Endknoten und Achse.
 */
export function seilAnker(dat) {
  const kn = new Map((dat?.knoten ?? []).map((k) => [k.name, k]));
  return (dat?.staebe ?? [])
    .filter((s) => /(?:^|_)(SEILKOPF_|AUFHAENGUNG(_[PN])?$)/.test(s.name)
      && s.nichtlinear?.x === 'nurZug')
    .map((link) => {
      // Die Aufhängung ist selbst das Seil (ein Glied von Knoten zu Knoten);
      // am Anker ist der Seilkopf der Link, das Seil der Stab dahinter.
      const stab = /AUFHAENGUNG(_[PN])?$/.test(link.name) ? link
        : dat.staebe.find((s) => s !== link && s.von === link.bis);
      if (!stab) return null;
      const a = kn.get(stab.von), b = kn.get(stab.bis);
      if (!a || !b) return null;
      const d = [b.x - a.x, b.y - a.y, b.z - a.z];
      const L = Math.hypot(...d);
      if (!(L > 0)) return null;
      return { link: link.name, stab: stab.name, i: stab.von, j: stab.bis,
               e: d.map((v) => v / L) };
    })
    .filter(Boolean);
}

/**
 * Hängt je Seil den Hilfslastfall an die Datei: das Kräftepaar, 1 kN,
 * am Anfang gegen die Achse, am Ende mit ihr - es drückt die Knoten
 * auseinander. Muss VOR `loese` geschehen.
 */
export function seilHilfsfaelle(dat, seile) {
  seile.forEach((s) => {
    const key = SEIL_AUS + s.stab;
    if (!dat.lastfaelle.some((l) => l.key === key)) {
      dat.lastfaelle.push({ key, label: `Seil ${s.stab} ausgefallen (Hilfsfall)`,
                            art: 'Others', hilfsfall: true });
    }
    ['X', 'Y', 'Z'].forEach((r, k) => {
      if (Math.abs(s.e[k]) < 1e-12) return;
      dat.lasten.punkt.push({ name: `${key}_I_${r}`, knoten: s.i, richtung: r,
                              wert: -s.e[k], lastfall: key });
      dat.lasten.punkt.push({ name: `${key}_J_${r}`, knoten: s.j, richtung: r,
                              wert: s.e[k], lastfall: key });
    });
  });
}

/** Kleines Gleichungssystem A x = b (Gauss mit Spaltenpivot). */
function loeseKlein(A, b) {
  const n = b.length;
  const M = A.map((z, i) => [...z, b[i]]);
  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-14) return null;
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k += 1) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((z, i) => z[n] / z[i]);
}

/**
 * >>> DER AUSFALL JE KOMBINATION. <<<
 *
 * Ändert `dat.kombinationen`: jede Kombination, in der ein Seil drücken
 * müsste, bekommt den Hilfsfall mit seinem λ. Gibt je Kombination die
 * wirksame Seilkraft zurück (Zug positiv, 0 wenn es hängt) und die Kraft,
 * die es ohne Ausfall hätte drücken müssen.
 *
 * @param {Array} faelle  alle Kombinationen, die ausgewertet werden
 * @returns {{je: Map<string, Map<string, {N:number, schlaff:boolean,
 *            NohneAusfall:number}>>, hilfsfaelle:number}}
 */
export function seilAusfall(dat, lsg, seile, faelle) {
  const je = new Map();
  if (!seile.length) return { je, hilfsfaelle: 0 };
  // Die axiale Stabendkraft je Grundfall (f[0], am Anfang, lokal) - einmal.
  const a0 = new Map();
  const aVon = (fall, stab) => {
    if (!a0.has(fall)) a0.set(fall, lsg.u.has(fall) ? lsg.stabkraft(fall) : new Map());
    return a0.get(fall).get(stab)?.[0] ?? 0;
  };
  // N (Zug positiv) = −f[0] am Anfang. Die Wirkung des Hilfsfalls je Seil.
  const nP = seile.map((t) => seile.map((s) => -aVon(SEIL_AUS + t.stab, s.stab)));

  const vorhanden = new Map((dat.kombinationen ?? []).map((k) => [k.key, k]));
  faelle.forEach((lf) => {
    const anteile = anteileFuer(lf, dat).filter((x) => !String(x.lastfall).startsWith(SEIL_AUS));
    const Nc = seile.map((s) => anteile.reduce(
      (sum, { lastfall, faktor }) => sum + (faktor || 0) * -aVon(lastfall, s.stab), 0));
    let aus = new Set(seile.map((_, k) => k).filter((k) => Nc[k] < -1e-9));
    let lam = new Array(seile.length).fill(0);
    for (let durchgang = 0; durchgang < 8 && aus.size; durchgang += 1) {
      const S = [...aus];
      // λ_s = N_c,s + Σ_t λ_t n_P(t → s)   für s in S
      const A = S.map((s) => S.map((t) => (s === t ? 1 : 0) - nP[t][s]));
      const x = loeseKlein(A, S.map((s) => Nc[s]));
      if (!x) break;
      lam = new Array(seile.length).fill(0);
      S.forEach((s, k) => { lam[s] = x[k]; });
      // Wirksame Kraft aus den Wegen nach dem Ausfall.
      const N = seile.map((_, s) => Nc[s] + S.reduce((sum, t) => sum + lam[t] * nP[t][s], 0));
      const neu = new Set(seile.map((_, s) => s).filter((s) => (aus.has(s)
        ? lam[s] < 0            // hängt es weiter? (Knoten nähern sich)
        : N[s] < -1e-9)));      // oder drückt ein anderes jetzt?
      const gleich = neu.size === aus.size && [...neu].every((s) => aus.has(s));
      aus = neu;
      if (gleich) break;
    }
    if (!aus.size) lam = new Array(seile.length).fill(0);
    const Nend = seile.map((_, s) => (aus.has(s) ? 0
      : Nc[s] + [...aus].reduce((sum, t) => sum + lam[t] * nP[t][s], 0)));
    const info = new Map(seile.map((s, k) => [s.stab, {
      N: Nend[k], schlaff: aus.has(k), NohneAusfall: Nc[k] }]));
    je.set(lf.key, info);
    if (aus.size) {
      const neu = [...anteile, ...[...aus].map((s) => ({ lastfall: SEIL_AUS + seile[s].stab,
                                                           faktor: lam[s] }))];
      const k = vorhanden.get(lf.key);
      if (k) k.anteile = neu;
      else dat.kombinationen.push({ key: lf.key, bez: lf.bez, art: lf.art,
                                    nachweis: lf.nachweis !== false, anteile: neu });
    }
  });
  return { je, hilfsfaelle: seile.length };
}

/**
 * >>> DER ANKERNACHWEIS MIT DEN KRÄFTEN DES STABWERKS (30. September). <<<
 *
 * Dieselbe Regel wie im Kern (`ankerAuswertung`: charakteristische und
 * aussergewöhnliche Fälle gegen die zulässige Kraft, das schlaffe Seil als
 * Hinweis), nur die Kraft kommt von hier:
 *   - SEIL: die wirksame Kraft aus `seilAusfall` (0, wenn es hängt, mit der
 *     Kraft, die es hätte drücken müssen);
 *   - STÜTZE: die Auflagerkraft am Ankerfundament auf der Ankerachse -
 *     sie gilt auch für die zweiteilige Stütze, deren Kraft sich auf zwei
 *     Profile verteilt.
 * Typ, Länge und Befestigung (`meta`) kommen aus dem Kern, der den Anker
 * geometrisch genauso kennt.
 *
 * @param {object} meta   `ankerkraft` des Kerns (typ, geo, befestigung, …)
 * @returns {object|null} wie `ankerAuswertung(...)[ende]`
 */
export function ankerAusStabwerk(dat, lsg, faelle, mastId, meta, seilInfo, satz, auswertung) {
  if (!meta?.typ) return null;
  const kn = new Map((dat.knoten ?? []).map((k) => [k.name, k]));
  const F = kn.get(`ANKER_${mastId}_F`), M = kn.get(`MAST_${mastId}_ANK`);
  if (!F || !M) return null;
  const d = [F.x - M.x, F.y - M.y, F.z - M.z];
  const L = Math.hypot(...d);
  const e = d.map((v) => v / L);
  // Ein Seil hat am Masten seinen Seilkopf (Link «nur Zug»).
  const seil = (dat.staebe ?? []).some((s) => s.name === `SEILKOPF_${mastId}`)
    ? `ANKER_${mastId}` : null;
  /*
   * >>> DOPPELANKER (9. Oktober): DIE RESULTIERENDE BEIDER SEILE. <<<
   * «die grenzlast auf 2x 67kN belassen» - nachgewiesen wird der Betrag der
   * Vektorsumme der beiden wirksamen Seilkräfte gegen die zulässige Kraft
   * des Doppelankers. Die grösste Kraft EINES Seils steht daneben
   * (`einzel`), gegen die Hälfte: der untere, kürzere und flachere Zug
   * bekommt in der Regel mehr als die Hälfte.
   */
  const stabVon = (n) => (dat.staebe ?? []).find((s) => s.name === n);
  const zweites = seil && stabVon(`SEILKOPF_${mastId}_2`) ? `ANKER_${mastId}_2` : null;
  const achse = (n) => {
    const st = stabVon(n), a = kn.get(st?.von), b = kn.get(st?.bis);
    if (!a || !b) return null;
    const v = [b.x - a.x, b.y - a.y, b.z - a.z], l = Math.hypot(...v);
    return l > 0 ? v.map((w) => w / l) : null;
  };
  const e1 = zweites ? achse(seil) : null, e2 = zweites ? achse(zweites) : null;
  let einzel = null;
  const ergebnisse = {};
  faelle.forEach((lf) => {
    let kraft;
    if (zweites && e1 && e2) {
      const s1 = seilInfo.je.get(lf.key)?.get(seil), s2 = seilInfo.je.get(lf.key)?.get(zweites);
      if (!s1 || !s2) return;
      const n1 = s1.schlaff ? 0 : Math.max(0, s1.N), n2 = s2.schlaff ? 0 : Math.max(0, s2.N);
      const R = Math.hypot(n1 * e1[0] + n2 * e2[0], n1 * e1[1] + n2 * e2[1], n1 * e1[2] + n2 * e2[2]);
      const beide = s1.schlaff && s2.schlaff;
      kraft = { ...meta, N: beide ? 0 : R, schlaff: beide, seile: [n1, n2],
                NohneAusfall: beide ? Math.min(s1.NohneAusfall ?? 0, s2.NohneAusfall ?? 0) : undefined };
      if (ANKER_FALLARTEN_SEIL.includes(lf.art) && (!einzel || Math.max(n1, n2) > einzel.N)) {
        einzel = { N: Math.max(n1, n2), seil: n2 > n1 ? 'unten' : 'oben',
                   oben: n1, unten: n2, lastfall: lf.key, bez: lf.bez };
      }
    } else if (seil) {
      const s = seilInfo.je.get(lf.key)?.get(seil);
      if (!s) return;
      kraft = { ...meta, N: s.schlaff ? 0 : s.N, schlaff: s.schlaff,
                NohneAusfall: s.schlaff ? s.NohneAusfall : undefined };
    } else {
      const r = [0, 0, 0];
      anteileFuer(lf, dat).forEach(({ lastfall, faktor }) => {
        if (!faktor || !lsg.u.has(lastfall)) return;
        const a = lsg.auflagerkraefte(lastfall).find((x) => x.knoten === F.name);
        if (!a) return;
        r[0] += faktor * (a.ux ?? 0); r[1] += faktor * (a.uy ?? 0); r[2] += faktor * (a.uz ?? 0);
      });
      /*
       * Die Reaktion wirkt auf das Tragwerk. Zieht der Anker (Zug), hält
       * das Fundament ihn fest - die Reaktion zeigt vom Masten weg, also
       * in Richtung der Achse Mast → Fundament: N = r · e.
       */
      kraft = { ...meta, N: r[0] * e[0] + r[1] * e[1] + r[2] * e[2], schlaff: false };
    }
    ergebnisse[lf.key] = { mast: { A: { ankerkraft: kraft } } };
  });
  const erg = auswertung({ lastfaelle: faelle, ergebnisse }, satz);
  if (!erg?.A) return null;
  if (einzel) {
    const zul = Number(erg.A.nachweis?.zul) > 0 ? erg.A.nachweis.zul / 2 : null;
    einzel = { ...einzel, zul, eta: zul ? einzel.N / zul : null };
    /*
     * >>> DAS EINZELNE SEIL BESTIMMT DAS URTEIL MIT (9. Oktober). <<< Auf die
     * Frage, ob die Ampel nur der Resultierenden folgt: «doppelanker
     * bestimmt das urteil». η ist das Grössere aus Resultierende / 134 kN und
     * stärkerem Seil / 67 kN; `massgebend` sagt, welches.
     */
    const nw = erg.A.nachweis;
    if (nw && Number.isFinite(einzel.eta) && !nw.schlaff && einzel.eta > (nw.eta ?? 0)) {
      return { ...erg.A, lastfall: einzel.lastfall, bez: einzel.bez, quelle: 'stabwerk', einzel,
               nachweis: { ...nw, etaResultierende: nw.eta, NResultierende: nw.N,
                           eta: einzel.eta, ok: einzel.eta <= 1, massgebend: 'seil',
                           text: `Zug — Seil ${einzel.seil} ${einzel.N.toFixed(1)} kN, zulässig ${zul.toFixed(1)} kN je Seil` } };
    }
  }
  return { ...erg.A, quelle: 'stabwerk', ...(einzel ? { einzel } : {}) };
}
