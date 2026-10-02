/**
 * vergleich_profile.mjs
 * ---------------------------------------------------------------------------
 * DIE PROFILTABELLEN GEGEN IHRE EIGENE GEOMETRIE.
 *
 * Weisung vom 2. Oktober: «die profile sind gemäss szs c5 oder eurocode zu
 * zeichnen, es fehlen ei vielen querschnitten die ausrundungen. prüfe die
 * angaben mit der berechnungsdatenbank ab». Auf Rückfrage: Normradien in
 * data/normen.json, die Querschnittswerte aus der gezeichneten Geometrie
 * nachrechnen, Abweichungen NUR MELDEN - dieses Werkzeug ändert keine Zahl.
 *
 * Je Profil: der Umriss aus `profilGeometrie` (derselbe, den das Profilblatt
 * zeichnet), daraus A, I, W, i und der Schwerpunkt (`querschnittAusUmriss`),
 * gegen den Wert der Tabelle. Bei den Winkeln führt die Tabelle kein I; dort
 * wird i verglichen. I_t ist keine Polygongrösse und bleibt aussen vor.
 *
 *   node vergleich_profile.mjs            alle Profile, Abweichungen in %
 *   node vergleich_profile.mjs 1          nur Werte, die mehr als 1 % abweichen
 * ---------------------------------------------------------------------------
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const J = (n) => new URL(`./js/${n}`, import.meta.url).href;
const NO = await import(J('data.normen.js'));
const PB = await import(J('ui.profilblatt.js'));
NO.setzeNormen(JSON.parse(readFileSync(join(HIER, 'data', 'normen.json'), 'utf8')));
const schwelle = Number(process.argv[2] ?? 0);

/** Die Profile mit ihrer Art und den Vergleichsgrössen [Feld der Tabelle, Feld der Geometrie, Umrechnung]. */
const faelle = [];
for (const p of NO.winkelprofile()) {
  faelle.push({ art: 'winkel', p, felder: [
    ['A', 'A'], ['zsH', 'zs', 0.1], ['zsV', 'ys', 0.1], ['iy', 'iy'], ['iz', 'iz'],
    ['imin', 'iv'], ['Wy', 'Wy'], ['Wz', 'Wz']] });
}
for (const p of NO.walzprofile()) {
  faelle.push({ art: 'walz', p, felder: [
    ['A', 'A'], ['Iy', 'Iy'], ['Wy', 'Wy'], ['iy', 'iy'], ['Iz', 'Iz'], ['Wz', 'Wz'], ['iz', 'iz'],
    ...(p.reihe !== 'IPE' ? [['ey', 'ys', 0.1]] : [])] });
}
for (const p of NO.mastprofileNorm()) {
  faelle.push({ art: 'mast', p, felder: [
    ['A', 'A'], ['Iy', 'Iy'], ['Wy', 'Wy'], ['iy', 'iy'], ['Iz', 'Iz'], ['Wz', 'Wz'], ['iz', 'iz']] });
}
// Die UNP der Anker stehen seit dem 2. Oktober in der Profiltabelle (Reihe
// UNP) und laufen oben bei den Walzprofilen mit.

const pct = (ist, soll) => (100 * (ist - soll)) / soll;
let n = 0, ueber = 0;
console.log('Profil'.padEnd(14) + 'Radien [mm]'.padEnd(18) + 'Grösse   Tabelle   Geometrie   Abw. %');
console.log('-'.repeat(78));
for (const { art, p, felder } of faelle) {
  const g = PB.profilGeometrie(art, p);
  const q = PB.querschnittAusUmriss(g);
  const radien = g.form === 'L' ? `r1 ${g.r1 || '–'} / r2 ${g.r2 || '–'}`
               : `r ${g.r1 || '–'}${g.r2 ? ` / r2 ${g.r2}` : ''}${g.neigung ? ' · 8 %' : ''}`;
  const zeilen = [];
  for (const [kt, kg, f = 1] of felder) {
    const soll = p[kt];
    if (!Number.isFinite(soll) || soll === 0) continue;
    const ist = q[kg] * f;
    const d = pct(ist, soll);
    n++;
    if (Math.abs(d) > 1) ueber++;
    if (Math.abs(d) < schwelle) continue;
    zeilen.push(`${kt.padEnd(8)} ${String(soll).padStart(8)}  ${ist.toFixed(3).padStart(10)}   `
              + `${(d >= 0 ? '+' : '') + d.toFixed(2)}${Math.abs(d) > 1 ? '  <<' : ''}`);
  }
  zeilen.forEach((z, i) => console.log((i ? '' : p.name).padEnd(14)
    + (i ? '' : radien).padEnd(18) + z));
}
console.log('-'.repeat(78));
console.log(`${n} Werte verglichen, ${ueber} weichen mehr als 1 % ab.`);
