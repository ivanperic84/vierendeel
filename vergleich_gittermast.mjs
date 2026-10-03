/**
 * vergleich_gittermast.mjs
 * ---------------------------------------------------------------------------
 * DER GITTERMAST IM EIGENEN LÖSER GEGEN PyNite (3. Oktober).
 *
 * Weisung: «weitermachen bis zum schluss und prüfung mit pynite vornehmen
 * und danach noch mit axisvm».
 *
 * Beide bekommen DIESELBE Datei - die fertige Stabmodell-Datei des
 * Einzelmasts mit Gittermast (vier Gurte, Bindebleche, Schotte, Rohr),
 * wie der Stabwerksknopf der Anwendung sie rechnet. PyNite über
 * `export.pynite.datei.js`, der eigene Löser ohne Schubverformung (PyNite
 * rechnet Euler-Bernoulli). Dazu vier Probelasten: 1 kN in x und in y an
 * der Spitze, 1 kNm um die Mastachse am Kopf des Gitters, 1 kN in x am
 * Knick.
 *
 * Verglichen werden die Knotenwege (Verschiebungen und Verdrehungen je für
 * sich, bezogen auf den grössten Wert des Lastfalls) und die Auflagerkräfte.
 *
 *   node vergleich_gittermast.mjs                 alle Typen des Sortiments
 *   node vergleich_gittermast.mjs "II 45"         ein Typ
 *   node vergleich_gittermast.mjs "I 30" quer     mit gedrehter Lage (a längs zum Gleis)
 *   node vergleich_gittermast.mjs --axisvm        schreibt dazu com/AxisVM_Gittermast_<Typ>.json
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const J = (f) => `file:///${join(HIER, 'js', f).replace(/\\/g, '/')}`;
const ARBEIT = join(HIER, '.vergleich_gittermast');
const PYTHON = process.env.PYTHON
  ?? 'C:/Users/ivan_/AppData/Local/Programs/Python/Python312/python.exe';
const D = (f) => JSON.parse(readFileSync(join(HIER, 'data', f), 'utf8'));

(await import(J('data.normen.js'))).setzeNormen(D('normen.json'));
const MA = await import(J('data.masten.js')); MA.setzeMastenDB(D('masten.json'));
const T = await import(J('data.tragjoche.js')); T.setzeDatenbank(D('tragjoche.json'));
(await import(J('data.anbauteile.js'))).setzeAnbauteilDB(D('anbauteile.json'));
(await import(J('data.fl.js'))).setzeFlDB(D('fl_bauteile.json'));
(await import(J('data.abfangjoche.js'))).setzeAbfangDB(D('abfangjoche.json'));
const V = await import(J('core.vierendeel.js'));
const C = await import(J('core.constants.js'));
const N = await import(J('core.nachbarn.js'));
const AS = await import(J('app.stabwerk.js'));
const S = await import(J('ui.schema.js'));
const SW = await import(J('core.stabwerk.js'));
const PD = await import(J('export.pynite.datei.js'));

const args = process.argv.slice(2);
const mitAxis = args.includes('--axisvm');
const frei = args.filter((a) => !a.startsWith('--'));
const typen = frei[0] ? [frei[0]] : MA.gittermasten().map((g) => g.typ);
const steg = frei[1] === 'quer' ? 'quer' : 'jochachse';

mkdirSync(ARBEIT, { recursive: true });
writeFileSync(join(ARBEIT, 'gitter_pynite.py'), PD.PYNITE_DATEI_SKRIPT);

/** Die Datei des Einzelmasts, wie der Stabwerksknopf sie rechnet, mit Probelasten. */
export function einzelmastDatei(typ, stegrichtung = 'jochachse') {
  const j = S.typUebernehmen({ ...S.standardwerte(), bearbeiten: false, typ: 'J90' }, T.getTragjoch('J90'));
  Object.assign(j, { L: 20, xLage: 0, mastVorhanden: true, twId: 'T1' });
  const w0 = C.tragwerkWeg(C.tragwerkHinzu(j, 'einzelmast',
    { mastProfil: MA.GITTER_PRAEFIX + typ, mastH: 8, mastLaenge: 0, mastSteg: stegrichtung }), 'T1');
  const w = N.rechensatzMitNachbarn(w0);
  const erg = V.berechne(w, ...N.kernArgumente(w));
  const h = AS.rechneStabwerk({ werte: w0, letzte: { erg }, stabwerk: null });
  if (h.fehler || h.ohneModell) throw new Error(h.fehler ?? h.ohneModell);
  const dat = JSON.parse(JSON.stringify(h.roh.dat));
  const g = dat.gittermasten[0];
  const spitze = g.achse[g.achse.length - 1];
  const kn = new Map(dat.knoten.map((k) => [k.name, k]));
  const auf = (z) => g.achse.find((n) => Math.abs(kn.get(n).z - g.zFuss - z) < 1e-6);
  const p = (name, knoten, richtung, wert, lastfall) => ({ name, knoten, richtung, wert, lastfall });
  dat.lasten.punkt.push(p('P1', spitze, 'X', 1, 'Probe Hx Spitze'), p('P2', spitze, 'Y', 1, 'Probe Hy Spitze'),
    p('P4', auf(g.hUnten) ?? auf(g.hoehe), 'X', 1, 'Probe Hx Knick'));
  dat.lasten.moment.push(p('P3', auf(g.hoehe), 'Mz', 1, 'Probe Mz Kopf'));
  ['Probe Hx Spitze', 'Probe Hy Spitze', 'Probe Hx Knick', 'Probe Mz Kopf']
    .forEach((key) => dat.lastfaelle.push({ key, label: key, art: 'Others' }));
  return dat;
}

let schlecht = 0;
for (const typ of typen) {
  const dat = einzelmastDatei(typ, steg);
  const kurz = typ.replace(/[^A-Za-z0-9]+/g, '') + (steg === 'quer' ? '_quer' : '');
  const ein = join(ARBEIT, `modell_${kurz}.json`), aus = join(ARBEIT, `ergebnis_${kurz}.json`);
  writeFileSync(ein, JSON.stringify(PD.pyniteDaten(dat)));
  if (mitAxis) writeFileSync(join(HIER, 'com', `AxisVM_Gittermast_${kurz}.json`), JSON.stringify(dat, null, 1));
  const t0 = Date.now();
  const txt = execFileSync(PYTHON, [join(ARBEIT, 'gitter_pynite.py'), ein, aus], { encoding: 'utf8' });
  const py = JSON.parse(readFileSync(aus, 'utf8'));
  const lsg = SW.loese(dat, { eigengewicht: false, schubweich: false });
  console.log(`\n=== Gittermast ${typ}${steg === 'quer' ? ' (a längs zum Gleis)' : ''} · ${dat.knoten.length} Knoten, `
    + `${dat.staebe.length} Stäbe · ${txt.trim()} (${((Date.now() - t0) / 1000).toFixed(1)} s) ===`);
  console.log('  Lastfall                 grösster Weg   Abw.      grösste Verdr.  Abw.      Auflager max    Abw.');
  Object.keys(py.wege).forEach((fall) => {
    const uv = lsg.u.get(fall);
    if (!uv) { console.log(`  ${fall}: im Löser nicht gerechnet`); return; }
    let mw = 0, dw = 0, mv = 0, dv = 0;
    dat.knoten.forEach((k) => {
      const i = lsg.knotenIdx.get(k.name), q = py.wege[fall][k.name];
      for (let d = 0; d < 6; d += 1) {
        const a = uv[i * 6 + d], b = q[d];
        if (d < 3) { mw = Math.max(mw, Math.abs(b)); dw = Math.max(dw, Math.abs(a - b)); }
        else { mv = Math.max(mv, Math.abs(b)); dv = Math.max(dv, Math.abs(a - b)); }
      }
    });
    let mr = 0, dr = 0;
    lsg.auflagerkraefte(fall).forEach((a) => {
      const q = py.auflager[fall][a.knoten];
      ['ux', 'uy', 'uz', 'fix', 'fiy', 'fiz'].forEach((f, d) => {
        mr = Math.max(mr, Math.abs(q[d])); dr = Math.max(dr, Math.abs(a[f] - q[d]));
      });
    });
    const pr = (d, m) => (m > 0 ? `${(100 * d / m).toFixed(3)} %` : '–').padStart(9);
    const ok = (mw === 0 || dw / mw < 0.01) && (mv === 0 || dv / mv < 0.01) && (mr === 0 || dr / mr < 0.01);
    if (!ok) schlecht += 1;
    console.log(`  ${fall.padEnd(24)} ${(mw * 1000).toFixed(3).padStart(9)} mm ${pr(dw, mw)}  `
      + `${(mv * 1000).toFixed(4).padStart(10)} mrad ${pr(dv, mv)}  ${mr.toFixed(3).padStart(10)} ${pr(dr, mr)}${ok ? '' : '   <<<'}`);
  });
}
console.log(schlecht ? `\n${schlecht} Lastfälle über 1 % Abweichung.` : '\nAlle Lastfälle innerhalb 1 %.');
