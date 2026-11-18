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

/* ---------------------------------------------------------------------------
 * STABKRÄFTE (18. November): an beiden Enden, je Teil (Gurte, Bleche,
 * Masten) - linear und 2. Ordnung, Löser gegen AxisVM. Bezogen auf den
 * grössten Wert der Grösse im Teil; dazu der ZUWACHS aus der 2. Ordnung.
 * ------------------------------------------------------------------------- */
if (fall.kraefte && soll.schubweich.kraftZweite) {
  const GR = ['Nx', 'Vy', 'Vz', 'Tx', 'My', 'Mz'];
  const teil = (n) => (/^MAST_/.test(n) ? 'Mast' : /^B[VH]_/.test(n) ? 'Blech' : /^(OG|UG)/.test(n) ? 'Gurt' : null);
  const w = soll.schubweich;
  ['Gurt', 'Blech', 'Mast'].forEach((t) => {
    const st = Object.keys(fall.kraefte).filter((n) => teil(n) === t && w.kraftZweite[n] && fall.kraefte[n].length === 24);
    console.log(`\n  ${t} (${st.length} Stäbe): grösste Abweichung bezogen auf den grössten Wert, linear | 2. Ordnung | Zuwachs`);
    GR.forEach((g, q) => {
      let ref = 0, d1 = 0, d2 = 0, zA = 0, zL = 0, wo = '';
      st.forEach((n) => {
        const a = fall.kraefte[n]; const l = w.kraftLinear[n]; const z = w.kraftZweite[n];
        [0, 6].forEach((o) => {
          ref = Math.max(ref, Math.abs(a[12 + o + q]));
          d1 = Math.max(d1, Math.abs(a[o + q] - l[o + q]));
          // 2. Ordnung als Betrag: AxisVM teilt die Stäbe dabei, die Teillinie
          // kann entgegen dem Stab laufen (Vorzeichen von V, M dann umgekehrt).
          const dd = Math.abs(Math.abs(a[12 + o + q]) - Math.abs(z[o + q]));
          if (dd > d2) { d2 = dd; wo = `${n}${o ? ' Ende' : ' Anf.'}`; }
          const za = Math.abs(a[12 + o + q]) - Math.abs(a[o + q]); const zl = Math.abs(z[o + q]) - Math.abs(l[o + q]);
          if (Math.abs(za) > Math.abs(zA)) { zA = za; zL = zl; }
        });
      });
      if (ref < 1e-6) return;
      console.log(`    ${g.padEnd(3)} max ${ref.toFixed(3).padStart(8)}   ${(100 * d1 / ref).toFixed(1).padStart(5)} % | `
        + `${(100 * d2 / ref).toFixed(1).padStart(5)} % (${wo}) | grösster Zuwachs AxisVM ${zA.toFixed(3)} Löser ${zL.toFixed(3)}`);
    });
  });
}
