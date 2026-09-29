/**
 * vergleich_spannung.mjs
 * ---------------------------------------------------------------------------
 * SPANNUNG IM JOCH: AXISVM GEGEN DAS STABWERK (29. September).
 *
 * Anlass, im Wortlaut: «eine vergleichsberechnung mit axis vm liefert zum
 * teil 15 bis 20% höhere spannungen im joch». Zwei Ursachen sind möglich,
 * und sie wollen getrennt sein:
 *   (1) die KRAEFTE laufen auseinander (Modell, Loeser), oder
 *   (2) die SPANNUNG wird anders gerechnet (Formel, Querschnittswerte,
 *       welche Anteile - N und Biegung, oder auch Schub und Torsion).
 * Das Skript rechnet dieselbe Spannungsformel der Anwendung
 * (`stabSpannung`, core.stabnachweis.js) einmal mit den Schnittgroessen, die
 * AxisVM an den Stabenden ausgibt, und einmal mit denen des Loesers. Laufen
 * die beiden Zahlen zusammen, liegt ein Unterschied zu AxisVMs EIGENER
 * Spannungsanzeige in (2).
 *
 *     node vergleich_spannung.mjs com/AxisVM_<name>.json
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const HIER = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const J = (f) => pathToFileURL(join(HIER, 'js', f)).href;
(await import(J('data.normen.js'))).setzeNormen(
  JSON.parse(readFileSync(join(HIER, 'data', 'normen.json'), 'utf8')));
const SW = await import(J('core.stabwerk.js'));
const AX = await import(J('export.axisvm.js'));
const SN = await import(J('core.stabnachweis.js'));

const pfad = process.argv[2] ?? 'com/AxisVM_Torsion_J90_20m.json';
const dat = JSON.parse(readFileSync(join(HIER, pfad), 'utf8'));
const ax = JSON.parse(readFileSync(join(HIER, pfad.replace(/\.json$/i, '_ergebnisse.json')), 'utf8'));
AX.deviationNachtragen(dat);
const lsg = SW.loese(dat, { eigengewicht: true });
const qs = new Map(dat.querschnitte.map((q) => [q.name, q]));
const art = new Map(dat.staebe.map((s) => [s.name, s.art ?? 'stab']));
const stabQs = new Map(dat.staebe.map((s) => [s.name, s.querschnitt]));

// AxisVM: Schnitte je Stab und Fall, das erste und das letzte als Enden.
const axEnden = (fall) => {
  const m = new Map();
  (ax.faelle[fall]?.schnitte ?? []).forEach((s) => {
    const a = m.get(s.stab) ?? []; a.push(s); m.set(s.stab, a);
  });
  const f = new Map();
  m.forEach((a, stab) => {
    a.sort((p, q) => p.x - q.x);
    const i = a[0], j = a[a.length - 1];
    // In die Konvention von `stabkraft`: am i-Ende das Negative.
    f.set(stab, [-i.Nx, -i.Vy, -i.Vz, -i.Tx, -i.My, -i.Mz, j.Nx, j.Vy, j.Vz, j.Tx, j.My, j.Mz]);
  });
  return f;
};
const summe = (liste) => {
  const out = new Map();
  liste.forEach(([K, faktor]) => K.forEach((f, n) => {
    const a = out.get(n) ?? new Array(12).fill(0);
    f.forEach((v, k) => { a[k] += faktor * v; });
    out.set(n, a);
  }));
  return out;
};
const vergleiche = (titel, kombi) => {
  const A = summe(kombi.map(([fall, fk]) => [axEnden(fall), fk]));
  const L = summe(kombi.map(([fall, fk]) => [lsg.stabkraft(fall), fk]));
  const jeRolle = {};
  A.forEach((fa, n) => {
    if (art.get(n) !== 'stab') return;
    const rolle = SN.stabRolle(n, 'stab');
    if (!['gurt', 'blech'].includes(rolle)) return;
    const q = qs.get(stabQs.get(n));
    const sA = SN.stabSpannung(q, fa, rolle)?.sig;
    const sL = SN.stabSpannung(q, L.get(n), rolle)?.sig;
    if (!Number.isFinite(sA) || !Number.isFinite(sL)) return;
    const r = jeRolle[rolle] ?? (jeRolle[rolle] = { maxA: null, maxL: null, schlimm: null });
    if (!r.maxA || sA > r.maxA.s) r.maxA = { s: sA, n };
    if (!r.maxL || sL > r.maxL.s) r.maxL = { s: sL, n };
    // Abweichung an Stäben, die mindestens 30 % des Maximums tragen.
    r.alle = r.alle ?? []; r.alle.push({ n, sA, sL });
  });
  console.log(`\n${titel}`);
  Object.entries(jeRolle).forEach(([rolle, r]) => {
    const grenze = 0.3 * r.maxA.s;
    const rel = r.alle.filter((x) => x.sA >= grenze).map((x) => ({ ...x, d: x.sA / x.sL - 1 }));
    rel.sort((p, q) => Math.abs(q.d) - Math.abs(p.d));
    const w = rel[0];
    console.log(`  ${rolle.padEnd(6)} max σ AxisVM-Kräfte ${r.maxA.s.toFixed(1)} (${r.maxA.n}) · `
      + `Löser ${r.maxL.s.toFixed(1)} (${r.maxL.n}) N/mm² · Verhältnis ${(r.maxA.s / r.maxL.s).toFixed(4)}`);
    console.log(`         grösste Abw. je Stab (ab 30 % des Max.): ${w ? `${(w.d * 100).toFixed(1)} % an ${w.n}`
      + ` (${w.sA.toFixed(1)} / ${w.sL.toFixed(1)})` : '-'}`);
  });
};
const G = [['G', 1], ['G_Anbau', 1], ['G_Ablenk', 1]];
vergleiche('Ständig (G + G_Anbau + G_Ablenk)', G);
vergleiche('Wind y allein', [['WindY', 1]]);
vergleiche('Wind x allein', [['WindX', 1]]);
vergleiche('1.3 · (G + Wind y)', [...G, ['WindY', 1]].map(([f, k]) => [f, 1.3 * k]));
vergleiche('1.3 · (G + Wind x)', [...G, ['WindX', 1]].map(([f, k]) => [f, 1.3 * k]));

/* ---------------------------------------------------------------------------
 * ZWEI KANDIDATEN AUF DER SEITE DER SPANNUNG (29. September):
 * (a) die STELLE - `stabSpannung` wertet nur die beiden Enden aus, AxisVM
 *     zeigt jeden Schnitt; (b) die ANTEILE - der Nachweis rechnet σ aus N
 *     und Biegung, eine Vergleichsspannung nimmt τ aus V (und T) dazu.
 * Gerechnet mit den AxisVM-Kräften, 1.3 · (G + Wind y).
 * ------------------------------------------------------------------------- */
{
  const kombi = [...G, ['WindY', 1]].map(([f, k]) => [f, 1.3 * k]);
  const jeSchnitt = new Map();
  kombi.forEach(([fall, fk]) => (ax.faelle[fall]?.schnitte ?? []).forEach((s) => {
    const k = `${s.stab}@${s.x}`;
    const a = jeSchnitt.get(k) ?? { stab: s.stab, x: s.x, Nx: 0, Vy: 0, Vz: 0, Tx: 0, My: 0, Mz: 0 };
    ['Nx', 'Vy', 'Vz', 'Tx', 'My', 'Mz'].forEach((g) => { a[g] += fk * s[g]; });
    jeSchnitt.set(k, a);
  }));
  const maxEnde = {}, maxInnen = {}, maxVM = {};
  const Aflaeche = (n) => Number(qs.get(stabQs.get(n))?.A) || 0;
  jeSchnitt.forEach((s) => {
    if (art.get(s.stab) !== 'stab') return;
    const rolle = SN.stabRolle(s.stab, 'stab');
    if (!['gurt', 'blech'].includes(rolle)) return;
    const q = qs.get(stabQs.get(s.stab));
    // Derselbe Schnitt an beiden «Enden» - so wertet stabSpannung genau ihn aus.
    const f = [-s.Nx, -s.Vy, -s.Vz, -s.Tx, -s.My, -s.Mz, s.Nx, s.Vy, s.Vz, s.Tx, s.My, s.Mz];
    const sig = SN.stabSpannung(q, f, rolle)?.sig;
    if (!Number.isFinite(sig)) return;
    const alle = jeSchnitt;
    const istEnde = ![...alle.values()].some((t) => t.stab === s.stab && t.x < s.x)
      || ![...alle.values()].some((t) => t.stab === s.stab && t.x > s.x);
    const ziel = istEnde ? maxEnde : maxInnen;
    if (!ziel[rolle] || sig > ziel[rolle].s) ziel[rolle] = { s: sig, n: s.stab, x: s.x };
    // Grobe Vergleichsspannung: τ ≈ 1.5 · V / A (Rechteck) - nur als Grössenordnung.
    const A = Aflaeche(s.stab) * 1e6;   // mm²
    const tau = A > 0 ? 1.5 * Math.hypot(s.Vy, s.Vz) * 1000 / A : 0;
    const sv = Math.sqrt(sig * sig + 3 * tau * tau);
    if (!maxVM[rolle] || sv > maxVM[rolle].s) maxVM[rolle] = { s: sv, n: s.stab, sig, tau };
  });
  console.log('\nKandidaten auf der Seite der Spannung, 1.3 · (G + Wind y), AxisVM-Kräfte:');
  ['gurt', 'blech'].forEach((r) => {
    console.log(`  ${r.padEnd(6)} (a) max σ an den Enden ${maxEnde[r]?.s.toFixed(1)} (${maxEnde[r]?.n}), `
      + (maxInnen[r] ? `im Stabinneren ${maxInnen[r].s.toFixed(1)} (${maxInnen[r].n} x=${maxInnen[r].x}) → `
        + `${((maxInnen[r].s / maxEnde[r].s - 1) * 100).toFixed(1)} %`
        : 'im Stabinneren: die Ergebnisdatei führt nur die Endschnitte (Brücke liest Schnitt 1 und n)'));
    console.log(`         (b) mit τ aus V (grob, 1.5 V/A): σ_v ${maxVM[r]?.s.toFixed(1)} (${maxVM[r]?.n}: `
      + `σ ${maxVM[r]?.sig.toFixed(1)}, τ ${maxVM[r]?.tau.toFixed(1)}) → `
      + `${((maxVM[r]?.s / maxEnde[r]?.s - 1) * 100).toFixed(1)} % gegen σ`);
  });
}
