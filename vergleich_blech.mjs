/**
 * vergleich_blech.mjs
 * ---------------------------------------------------------------------------
 * KERN, LOESER UND PyNite AM SELBEN BLECH.
 *
 * Weisung vom 25. September: «vorschlag umsetzen und falls notwendig axis
 * beiziehen» - nachdem der eta-Vergleich die Bleche im Stabwerk 22 Prozent
 * hoeher gezeigt hatte als im Rechenkern.
 *
 * >>> WARUM DREI UND NICHT ZWEI. <<<
 *
 * Der Kern ist gegen PyNite KALIBRIERT (GURT_DAEMPFUNG und die uebrigen
 * Kennwerte, `kalibrieren.mjs`), der Loeser gegen PyNite VERIFIZIERT.
 * Treffen beide PyNite, duerfen sie nicht um ein Fuenftel auseinander
 * liegen - einer von beiden muss also danebenliegen, und PyNite sagt,
 * welcher. Zwei Meinungen streiten, drei entscheiden.
 *
 * Gerechnet wird das KALIBRIERMODELL: J90 ohne Masten, charakteristische
 * Einzellastfaelle. Genau dieses Modell hat die Kennwerte bestimmt.
 *
 * ===========================================================================
 * >>> DAS ERGEBNIS (25. September, J90 / 20 m). <<<
 * ===========================================================================
 *
 * 1. DIE SCHNITTGROESSEN STIMMEN - in der jeweils TRAGENDEN Ebene:
 *
 *      Lastfall      tragende Ebene   Loeser/PyNite   Kern/PyNite
 *      staendig      vertikal             1.0012         1.0091
 *      Wind laengs   horizontal           0.9994         0.9842
 *
 *    Die grossen Verhaeltnisse (11, 14) stehen IMMER in der nicht
 *    tragenden Ebene, wo die Momente nahe null sind: bei staendiger Last
 *    traegt das vertikale Blech, bei Wind laengs das horizontale. Ein
 *    Faktor 11 auf 0.01 kNm sagt nichts.
 *
 *    >>> Die Kalibrierung ist also gueltig, und der Loeser auch. <<<
 *
 * 2. DER UNTERSCHIED KOMMT AUS DER SPANNUNG, NICHT AUS DEN KRAEFTEN.
 *
 *    Am massgebenden Blech (BLECH_V_100x10, Kombination Wind laengs):
 *
 *      aus N                          0.49 N/mm2
 *      aus My (SCHWACHE Achse)       23.84 N/mm2     <<<
 *      aus Mz (starke Achse)         57.19 N/mm2
 *      Summe                         81.52 N/mm2
 *
 *    Der My-Anteil macht 29 Prozent aus. Ein Balken kann ihn STRUKTURELL
 *    nicht sehen: er traegt keine Information darueber, wie ein Blech aus
 *    seiner Ebene heraus gebogen wird.
 *
 * 3. UND ER IST ECHT - PyNite zeigt ihn AUF DIE STELLE GENAU:
 *
 *      Spannungsanteil aus My, je Blech gerechnet:
 *        staendig,    tragende (vertikale) Bleche   Loeser 5.4 %  PyNite 5.4 %
 *        Wind laengs, tragende (horizontale)        Loeser 3.1 %  PyNite 3.1 %
 *
 *    >>> EINE ZAHL, DIE ICH ZUERST FALSCH GERECHNET HATTE. <<<
 *
 *    Der erste Anlauf hielt das GROESSTE My ueber alle Bleche gegen das
 *    GROESSTE Mz ueber alle Bleche - die stehen aber an verschiedenen
 *    Blechen. Daraus wurden 23 Prozent. Je Blech gerechnet sind es am
 *    Kalibriermodell 5.4.
 *
 * 4. AM TRAGWERK MIT MASTEN IST ER VIEL GROESSER.
 *
 *    Dasselbe Blech im J90/20 m MIT Masten, Kombination Wind laengs:
 *    My gibt dort 23.84 von 81.52 N/mm2, also 29 Prozent. Das
 *    Kalibriermodell steht OHNE Masten (so rechnet `kalibrieren.mjs`,
 *    Zeile 216) - und genau dort fehlt die Kopplung Joch-Mast, die dieses
 *    My erzeugt. Es ist derselbe Befund wie beim Biegemoment
 *    (`vergleich_kern.mjs`): der Ersatzbalken sieht das Jochende
 *    gelenkig, im Stabwerk ist es teilweise eingespannt.
 *
 *    Der Kern ist beim Hauptanteil (starke Achse) etwas konservativer und
 *    gleicht einen Teil aus; netto bleibt er rund ein Fuenftel niedriger.
 *
 * >>> AxisVM wurde dafuer NICHT gebraucht: die Frage war, welcher der
 * beiden Wege recht hat, und dafuer genuegt eine dritte unabhaengige
 * Rechnung. Fuer die FREIGABE des Loesers bleibt AxisVM noetig - das ist
 * eine andere Frage und ein eigener Schritt. <<<
 *
 * Aufruf:
 *   node vergleich_blech.mjs              staendig
 *   node vergleich_blech.mjs --fall wyk   Wind laengs
 *   node vergleich_blech.mjs --L 15
 * ---------------------------------------------------------------------------
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const J = (f) => `file:///${join(HIER, 'js', f).replace(/\\/g, '/')}`;
const ARBEIT = join(HIER, '.vergleich_blech');
const PYTHON = process.env.PYTHON
  ?? 'C:/Users/ivan_/AppData/Local/Programs/Python/Python312/python.exe';

const NO = await import(J('data.normen.js'));
NO.setzeNormen(JSON.parse(readFileSync(join(HIER, 'data', 'normen.json'), 'utf8')));
const MA = await import(J('data.masten.js'));
MA.setzeMastenDB(JSON.parse(readFileSync(join(HIER, 'data', 'masten.json'), 'utf8')));
const T = await import(J('data.tragjoche.js'));
T.setzeDatenbank(JSON.parse(readFileSync(join(HIER, 'data', 'tragjoche.json'), 'utf8')));
const AB = await import(J('data.anbauteile.js'));
AB.setzeAnbauteilDB(JSON.parse(readFileSync(join(HIER, 'data', 'anbauteile.json'), 'utf8')));
const FL = await import(J('data.fl.js'));
FL.setzeFlDB(JSON.parse(readFileSync(join(HIER, 'data', 'fl_bauteile.json'), 'utf8')));
const S = await import(J('ui.schema.js'));
const V = await import(J('core.vierendeel.js'));
const N = await import(J('core.nachbarn.js'));
const AX = await import(J('export.axisvm.js'));
const PY = await import(J('export.pynite.js'));
const SW = await import(J('core.stabwerk.js'));

const arg = (name, std) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : std;
};
const LAENGE = Number(arg('L', 20));
const FALL = arg('fall', 'gk');
const NEU = process.argv.includes('--neu');

// Kern-Lastfall -> Einwirkungsgruppen des Loesers und Lastfall in PyNite.
const GRUPPE = { gk: ['G', 'G_Anbau', 'G_Ablenk'], wyk: ['WindY'], wxk: ['WindX'] }[FALL];
const PYFALL = { gk: 'G', wyk: 'WindY', wxk: 'WindX' }[FALL];
if (!GRUPPE) { console.log(`Unbekannter Lastfall: ${FALL} (gk, wyk, wxk)`); process.exit(1); }

let w = S.typUebernehmen({ ...S.standardwerte(), typ: 'J90' }, T.getTragjoch('J90'));
w.L = LAENGE; w.xLage = 0;
w.mastVorhanden = false;                     // wie kalibrieren.mjs
const satz = N.rechensatzMitNachbarn(w);
const eK = V.berechne({ ...satz, lastfall: FALL }, ...N.kernArgumente(satz));

const bau = AX.stabmodell(eK.modell, { knotenmodell: 'anschnitt' });
bau.lasten = AX.lasten(eK.modell, bau, { eigengewicht: true, gTrennen: true });
const dat = AX.stabmodellJson(eK.modell, { bau, knotenmodell: 'anschnitt' });
const lsg = SW.loese(dat, { eigengewicht: false });

/* --- PyNite, mit derselben Wache wie vergleich_stabwerk.mjs --------------- */
mkdirSync(ARBEIT, { recursive: true });
const skript = PY.pyniteSkript(eK.modell, { bau, knotenmodell: 'anschnitt' });
const pruefsumme = (t) => {
  let h = 5381;
  for (let i = 0; i < t.length; i += 1) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
  return h.toString(16);
};
const kennung = JSON.stringify({ L: LAENGE, skript: pruefsumme(skript.text) });
const kennDatei = join(ARBEIT, 'modell.json');
let alt = null;
try { alt = readFileSync(kennDatei, 'utf8'); } catch { /* keine */ }
const datei = join(ARBEIT, 'pynite_staebe.csv');
if (NEU || !existsSync(datei) || alt !== kennung) {
  writeFileSync(join(ARBEIT, 'lauf.py'), skript.text);
  console.log('PyNite rechnet …');
  execFileSync(PYTHON, ['lauf.py'], { cwd: ARBEIT, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, maxBuffer: 64 * 1024 * 1024 });
  writeFileSync(kennDatei, kennung);
}

const csv = (p) => {
  const z = readFileSync(p, 'utf8').trim().split(/\r?\n/);
  const kopf = z.shift().split(';');
  return z.map((zl) => { const t = zl.split(';'); const o = {};
    kopf.forEach((k, i) => { const v = Number(t[i]); o[k] = Number.isFinite(v) ? v : t[i]; });
    return o; });
};
const pyStaebe = csv(datei);

/* --- Die Blechmomente je Ort und Ebene ------------------------------------ */
const kn = new Map(dat.knoten.map((k) => [k.name, k]));
const stabVon = new Map(dat.staebe.map((s) => [s.name, s]));
const ortVon = (name) => {
  const st = stabVon.get(name);
  if (!st) return undefined;
  const a = kn.get(st.von), b = kn.get(st.bis);
  return a && b ? (a.x + b.x) / 2 : undefined;
};
const istBlech = (name, qs) => /^B(V|H)_([LROU])_/.test(String(name))
                            && !String(qs).startsWith('STARR');
const artVon = (name) => (String(name)[1] === 'V' ? 'vertikal' : 'horizontal');

const sk = GRUPPE.filter((f) => lsg.u.has(f)).map((f) => lsg.stabkraft(f));
const loeser = new Map();
dat.staebe.forEach((st) => {
  if (!istBlech(st.name, st.querschnitt)) return;
  const summe = new Float64Array(12);
  sk.forEach((m) => { const f = m.get(st.name);
    if (f) for (let i = 0; i < 12; i += 1) summe[i] += f[i]; });
  const x = ortVon(st.name);
  if (x === undefined) return;
  const k = `${artVon(st.name)}|${x.toFixed(3)}`;
  const mz = Math.max(Math.abs(summe[5]), Math.abs(summe[11]));
  const my = Math.max(Math.abs(summe[4]), Math.abs(summe[10]));
  const v = loeser.get(k);
  if (!v || mz > v.mz) loeser.set(k, { mz, my });
});

const pynite = new Map();
pyStaebe.filter((r) => r.Lastfall === PYFALL).forEach((r) => {
  if (!istBlech(r.Stab, r.Querschnitt)) return;
  const x = ortVon(r.Stab);
  if (x === undefined) return;
  const k = `${artVon(r.Stab)}|${x.toFixed(3)}`;
  const mz = Math.max(Math.abs(r.Mz_i), Math.abs(r.Mz_j));
  const my = Math.max(Math.abs(r.My_i), Math.abs(r.My_j));
  const v = pynite.get(k);
  if (!v || mz > v.mz) pynite.set(k, { mz, my });
});

/* --- Gegenueberstellung --------------------------------------------------- */
console.log('='.repeat(100));
console.log(`BLECHMOMENT: KERN · LÖSER · PyNite  ·  J90/${LAENGE} m ohne Masten`
  + `  ·  Lastfall ${FALL} charakteristisch`);
console.log('='.repeat(100));

const zeilen = [];
eK.knoten.forEach((k) => {
  (k.ebenen || []).forEach((eb) => {
    if (eb.M == null || !(eb.M > 1e-6)) return;
    const key = `${eb.art}|${k.x.toFixed(3)}`;
    const l = loeser.get(key), p = pynite.get(key);
    if (!l || !p || !(p.mz > 1e-6)) return;
    zeilen.push({ x: k.x, art: eb.art, kern: eb.M, l, p });
  });
});
if (!zeilen.length) { console.log('Keine vergleichbaren Stellen.'); process.exit(0); }

console.log('   x [m]  Ebene        Kern      Löser     PyNite   Löser/PyN   Kern/PyN');
const zeig = zeilen.filter((_, i) => i % Math.max(1, Math.round(zeilen.length / 12)) === 0);
zeig.forEach((z) => {
  console.log(`  ${z.x.toFixed(2).padStart(6)}  ${z.art.padEnd(11)}`
    + `${z.kern.toFixed(4).padStart(9)} ${z.l.mz.toFixed(4).padStart(10)}`
    + `${z.p.mz.toFixed(4).padStart(11)}`
    + `${(z.l.mz / z.p.mz).toFixed(3).padStart(12)}`
    + `${(z.kern / z.p.mz).toFixed(3).padStart(11)}`);
});

console.log('-'.repeat(100));
/*
 * >>> GETRENNT NACH EBENE - SONST MISCHT MAN TRAGENDE UND UNBETEILIGTE. <<<
 * Bei staendiger Last traegt das vertikale Blech, bei Wind laengs das
 * horizontale. Ein Mittel ueber beide waere eine Zahl ohne Aussage.
 */
['vertikal', 'horizontal'].forEach((art) => {
  const t = zeilen.filter((z) => z.art === art);
  if (!t.length) return;
  const m = (f) => t.reduce((s, z) => s + f(z), 0) / t.length;
  const groesste = t.reduce((a, b) => (b.p.mz > a.p.mz ? b : a));
  console.log(`  ${art.padEnd(11)} (${String(t.length).padStart(3)} Stellen,`
    + ` grösstes M_z ${groesste.p.mz.toFixed(4)} kNm)`);
  console.log(`     Löser / PyNite  ${m((z) => z.l.mz / z.p.mz).toFixed(4)}`
    + `      Kern / PyNite  ${m((z) => z.kern / z.p.mz).toFixed(4)}`);
  /*
   * Und der Anteil, den ein Balken nicht sehen kann: die Biegung des
   * Blechs um seine SCHWACHE Achse. Beim Rechteck 100 x 10 ist W_y
   * zehnmal kleiner als W_z - ein kleines M_y gibt dort viel Spannung.
   */
  const anteil = (q) => {
    const sy = q.my / 1.6667e-6, sz = q.mz / 1.6667e-5;
    return sy + sz > 0 ? sy / (sy + sz) : 0;
  };
  console.log(`     Spannungsanteil aus M_y (schwache Achse):`
    + ` Löser ${(m((z) => anteil(z.l)) * 100).toFixed(1)} %`
    + `   PyNite ${(m((z) => anteil(z.p)) * 100).toFixed(1)} %`);
});
console.log('='.repeat(100));
