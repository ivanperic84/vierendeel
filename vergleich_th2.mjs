/* ===========================================================================
 * vergleich_th2.mjs
 * ---------------------------------------------------------------------------
 * THEORIE 2. ORDNUNG: EIGENER LÖSER GEGEN AXISVM (18. November).
 *
 * Liest <modell>_soll.json (modell_knicken.mjs … th2) und
 * <modell>_nichtlinear.json (AxisVM_aufbauen -Rechnen -Nichtlinear) und
 * vergleicht die Knotenwege linear und nach Theorie 2. Ordnung - an den
 * Mastköpfen, am grössten Weg und als Verstärkung (2. / 1. Ordnung).
 *
 * AUFRUF: node vergleich_th2.mjs com/AxisVM_TH2_J130_30m_Schnee.json
 * ------------------------------------------------------------------------- */
import { readFileSync } from 'node:fs';

const modell = process.argv[2] ?? 'com/AxisVM_TH2_J130_30m_Schnee.json';
const lies = (f) => JSON.parse(readFileSync(f, 'utf8').replace(/^﻿/, ''));
const soll = lies(modell.replace(/\.json$/, '_soll.json'));
const ax = lies(modell.replace(/\.json$/, '_nichtlinear.json'));
const fall = Object.values(ax.lastfaelle)[0];
console.log(`${modell}: AxisVM ${fall.stufen} Laststufen, Lambda ${fall.lambda}, Konvergenz ${fall.konvergenz}, ${Math.round(fall.sekunden)} s`);
console.log(`Schiefstellung phi = 1/${Math.round(1 / soll.phi)}, m = ${soll.m}`);

const betrag = (v) => Math.hypot(v[0], v[1], v[2]);
const namen = Object.keys(fall.wege).filter((n) => soll.schubweich.linear[n]);
// Der Knoten mit dem grössten Weg nach AxisVM (nichtlinear).
const groesster = namen.reduce((a, n) => (betrag(fall.wege[n].slice(3)) > betrag(fall.wege[a].slice(3)) ? n : a), namen[0]);
const koepfe = namen.filter((n) => /^MAST_[^_]+_KOPF$/.test(n));
const zeig = (n) => {
  const a = fall.wege[n];
  const w = soll.schubweich; const s = soll.schubstarr;
  const mm = (v) => (v * 1000).toFixed(2);
  const r = (v) => [0, 1, 2].map((i) => mm(v[i])).join(' / ');
  console.log(`\n  ${n}  (x / y / z in mm)`);
  console.log(`    linear   AxisVM ${r(a)}   Löser schubweich ${r(w.linear[n])}   schubstarr ${r(s.linear[n])}`);
  console.log(`    2. Ord.  AxisVM ${r(a.slice(3))}   Löser schubweich ${r(w.zweite[n])}   schubstarr ${r(s.zweite[n])}`);
  const verst = (l, z) => (betrag(z) / betrag(l)).toFixed(4);
  console.log(`    Verstärkung |u2|/|u1|: AxisVM ${verst(a, a.slice(3))}   Löser schubweich ${verst(w.linear[n], w.zweite[n])}   schubstarr ${verst(s.linear[n], s.zweite[n])}`);
  console.log(`    |u2| Löser/AxisVM: schubweich ${(betrag(w.zweite[n]) / betrag(a.slice(3))).toFixed(4)}   schubstarr ${(betrag(s.zweite[n]) / betrag(a.slice(3))).toFixed(4)}`);
};
[...koepfe, groesster].filter((n, i, l) => l.indexOf(n) === i).forEach(zeig);
// Über alle Knoten: grösste Abweichung der Wege 2. Ordnung, bezogen auf den grössten Weg.
['schubweich', 'schubstarr'].forEach((art) => {
  let gross = 0, bezug = 0, wo = '';
  namen.forEach((n) => {
    const a = fall.wege[n].slice(3); const b = soll[art].zweite[n];
    bezug = Math.max(bezug, betrag(a));
    const d = betrag([a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
    if (d > gross) { gross = d; wo = n; }
  });
  console.log(`\n  ${art}: grösste Abweichung der Wege 2. Ordnung ${(gross * 1000).toFixed(2)} mm `
    + `(${(100 * gross / bezug).toFixed(2)} % des grössten Wegs ${(bezug * 1000).toFixed(1)} mm) bei ${wo}`);
});
