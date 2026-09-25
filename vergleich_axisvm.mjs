/* ===========================================================================
 * vergleich_axisvm.mjs
 * ---------------------------------------------------------------------------
 * DER STABWERKSLOESER GEGEN AxisVM - Stab fuer Stab, Lastfall fuer Lastfall.
 *
 * Etappe 4 zum Bauplan der Jochreihe (siehe CLAUDE.md, *Laufende Arbeit*):
 * «Vergleich mit AxisVM». Weisung vom 25. September: «mit axis testen».
 *
 * WIE ES LAEUFT
 *
 *   1. Modelldatei erzeugen (aus der Anwendung: Export -> AxisVM, oder mit
 *      einem eigenen kleinen Skript ueber `stabmodellJson`).
 *   2. com\AxisVM_aufbauen.cmd -Json <datei> -Rechnen -Auslesen -Stapel
 *      baut das Modell, rechnet linear statisch und schreibt
 *      <datei>_ergebnisse.json daneben.
 *   3. node vergleich_axisvm.mjs com/AxisVM_<name>.json
 *
 * >>> DAS EIGENGEWICHT GEHOERT GENAU EINMAL INS MODELL. <<<
 *
 * AxisVM setzt es SELBST an (`Loads.AddBeamSelfWeight` je Stab - so baut die
 * Bruecke, und so ist es richtig). Schreibt die Datei es zusaetzlich als
 * Streckenlast, steht es zweimal da. Gemessen am ersten Lauf vom
 * 26. September: N im Untergurt 62.35 statt 31.29 kN, also Faktor 2, und
 * zwar NUR im Lastfall G - die uebrigen sahen makellos aus.
 *
 * Die Modelldatei fuer diesen Vergleich wird deshalb OHNE `eigengewicht`
 * gebaut, und der Loeser steuert seines selbst bei. Diese Datei prueft es
 * nach und sagt es, wenn die Lastliste eines der beiden schon enthaelt.
 *
 * >>> UND DIE ERGEBNISSE MUESSEN ZUM MODELL GEHOEREN. <<<
 *
 * Am 24. September hat der PyNite-Vergleich ein 20-m-Joch gegen die
 * Ergebnisse eines 8-m-Jochs gehalten und Abweichungen bis Faktor 39
 * gemeldet - nicht ein Loeser war falsch, sondern die Gegenprobe. Hier
 * wird deshalb zuerst geprueft, ob die Ergebnisdatei juenger ist als die
 * Modelldatei und dieselben Staebe fuehrt.
 * ---------------------------------------------------------------------------
 */
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const HIER = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const J = (f) => pathToFileURL(join(HIER, 'js', f)).href;

const NO = await import(J('data.normen.js'));
NO.setzeNormen(JSON.parse(readFileSync(join(HIER, 'data', 'normen.json'), 'utf8')));
const SW = await import(J('core.stabwerk.js'));
const SN = await import(J('core.stabnachweis.js'));

const pfad = process.argv[2];
if (!pfad) {
  console.error('Aufruf: node vergleich_axisvm.mjs com/AxisVM_<name>.json');
  process.exit(2);
}
const modellPfad = join(HIER, pfad.replace(/^\.?[\\/]/, ''));
const ergPfad = modellPfad.replace(/\.json$/i, '_ergebnisse.json');

/* ---------------------------------------------------------------------------
 * GEHOEREN DIE BEIDEN ZUSAMMEN?
 * ------------------------------------------------------------------------- */
let dat; let ax;
try {
  dat = JSON.parse(readFileSync(modellPfad, 'utf8'));
} catch (e) {
  console.error(`Modelldatei nicht lesbar: ${modellPfad}\n  ${e.message}`);
  process.exit(2);
}
try {
  ax = JSON.parse(readFileSync(ergPfad, 'utf8'));
} catch (e) {
  console.error(`Ergebnisdatei nicht lesbar: ${ergPfad}\n  ${e.message}\n`
    + '  Zuerst rechnen lassen:\n'
    + `  com\\AxisVM_aufbauen.cmd -Json ${pfad} -Rechnen -Auslesen -Stapel`);
  process.exit(2);
}
const tM = statSync(modellPfad).mtimeMs;
const tE = statSync(ergPfad).mtimeMs;
console.log('='.repeat(96));
console.log(`MODELL     ${basename(modellPfad)}  -  ${dat.knoten.length} Knoten, `
  + `${dat.staebe.length} Staebe, ${dat.lastfaelle.length} Lastfaelle`);
console.log(`ERGEBNISSE ${basename(ergPfad)}  -  ${ax.erzeugt ?? '?'}`);
console.log('='.repeat(96));
if (tE < tM) {
  console.error('\n>>> ABBRUCH: die Ergebnisse sind AELTER als das Modell. <<<\n'
    + '    Sie gehoeren zu einem frueheren Stand. Neu rechnen lassen.');
  process.exit(1);
}
const namenModell = new Set(dat.staebe.map((s) => s.name));
const namenAx = new Set(Object.values(ax.faelle ?? {})
  .flatMap((f) => (f.schnitte ?? []).map((s) => s.stab)));
const fehlen = [...namenAx].filter((n) => !namenModell.has(n));
if (fehlen.length) {
  console.error(`\n>>> ABBRUCH: ${fehlen.length} Staebe der Ergebnisse stehen nicht `
    + `im Modell <<<\n    ${fehlen.slice(0, 5).join(', ')}`);
  process.exit(1);
}

/* ---------------------------------------------------------------------------
 * DAS EIGENGEWICHT - GENAU EINMAL.
 * ------------------------------------------------------------------------- */
const gLasten = (dat.lasten?.strecke ?? [])
  .filter((l) => /^G(_|$)/.test(l.lastfall) && l.richtung === 'Z');
/*
 * Ein Eigengewicht IN der Datei laesst sich nicht sicher von einem
 * Zuschlag unterscheiden - der Zuschlag `gZusatz` ist ebenfalls eine
 * Streckenlast in Z. Gewarnt wird deshalb, nicht abgebrochen; die Zahl
 * daneben sagt, worum es geht.
 */
const gSumme = gLasten.reduce((a, l) => a + Math.abs(l.wert), 0);
if (gSumme > 0.5) {
  console.log(`\nHINWEIS: die Datei fuehrt ${gLasten.length} staendige Streckenlasten `
    + `in Z (Summe ${gSumme.toFixed(2)} kN/m).`);
  console.log('  AxisVM setzt sein Eigengewicht SELBST an. Ist darin das Eigengewicht');
  console.log('  enthalten, steht es dort zweimal - der Lastfall G laeuft dann um');
  console.log('  Faktor 2 auseinander, die uebrigen bleiben makellos.');
}
const lsg = SW.loese(dat, { eigengewicht: true });
console.log(`\nLoeser: ${lsg.n} Freiheitsgrade, Bandbreite ${lsg.bw}, `
  + `Eigengewicht ${lsg.eigengewicht.toFixed(3)} kN ueber ${lsg.eigenLasten} Staebe, `
  + `${lsg.zeit.gesamt} ms`);

/* ---------------------------------------------------------------------------
 * >>> DIE VORZEICHEN: KNOTENKRAFT GEGEN SCHNITTGROESSE. <<<
 *
 * `stabkraft()` gibt die Kraefte, die der STAB AUF SEINE KNOTEN ausuebt -
 * am i-Ende also das Negative der Schnittgroesse, die AxisVM an der Stelle
 * x = 0 anschreibt. Am j-Ende stimmen die Vorzeichen ueberein.
 *
 * Gemessen und nicht geraten: am Lastfall WindX trifft der Loeser AxisVMs
 * Mastfussmoment mit -10.8375 gegen -10.8375 kNm.
 * ------------------------------------------------------------------------- */
const GROESSEN = ['Nx', 'Vy', 'Vz', 'Tx', 'My', 'Mz'];
const ausI = (f) => ({ Nx: -f[0], Vy: -f[1], Vz: -f[2], Tx: -f[3], My: -f[4], Mz: -f[5] });
const ausJ = (f) => ({ Nx: f[6], Vy: f[7], Vz: f[8], Tx: f[9], My: f[10], Mz: f[11] });

const art = new Map(dat.staebe.map((s) => [s.name, s.art ?? 'stab']));
const rolle = (n) => SN.stabRolle(n, art.get(n) ?? 'stab');
const knoten = new Map(dat.knoten.map((k) => [k.name, k]));
const laengen = new Map(dat.staebe.map((s) => {
  const a = knoten.get(s.von); const b = knoten.get(s.bis);
  return [s.name, (a && b) ? Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) : 0];
}));
const laenge = (n) => laengen.get(n) ?? 0;
let nichtAmEnde = 0;

/* Je Lastfall die Schnitte je Stab, nach x sortiert. */
const jeFall = {};
Object.entries(ax.faelle ?? {}).forEach(([fall, f]) => {
  const m = new Map();
  (f.schnitte ?? []).forEach((s) => {
    const a = m.get(s.stab) ?? [];
    a.push(s);
    m.set(s.stab, a);
  });
  m.forEach((a) => a.sort((p, q) => p.x - q.x));
  jeFall[fall] = m;
});

console.log('\n' + '='.repeat(96));
console.log('SCHNITTGROESSEN - nur echte Staebe (Starrkoerper und Links sind Kunstgriffe)');
console.log('='.repeat(96));
console.log('Lastfall   Rolle   Groesse   n    max|AxisVM|   groesste Abw.   rel.   bei');
console.log('-'.repeat(96));

let schlimm = null;
let leer = 0;
Object.keys(jeFall).sort().forEach((fall) => {
  if (!lsg.u.has(fall)) return;
  const K = lsg.stabkraft(fall);
  /*
   * Je Rolle und Groesse: die groesste Abweichung, BEZOGEN auf den
   * groessten Wert dieser Groesse in diesem Lastfall. Absolut gemessen
   * misst man die Modellgroesse, nicht den Loeser - und eine Abweichung
   * von 0.00002 an einer Groesse, die ueberall null ist, sagt nichts.
   */
  const stat = new Map();
  jeFall[fall].forEach((schnitte, stab) => {
    if ((art.get(stab) ?? 'stab') !== 'stab') return;
    const r = rolle(stab);
    if (r === 'starr' || r === 'link' || r === 'sonst') return;
    const f = K.get(stab);
    if (!f) return;
    /*
     * >>> NUR DIE SCHNITTE, DIE WIRKLICH AM ENDE LIEGEN. <<<
     *
     * BEFUND vom 26. September: die Bruecke liest
     * `for ($si = 1; $si -le 2; $si++)` und haelt den ZWEITEN von elf
     * Schnitten fuer das Stabende. AxisVM teilt eine Linie aber in zehn
     * Abschnitte - Schnitt 2 liegt bei x = L/10. Gemessen am
     * MAST_M1_S1 (L = 7.180 m): der letzte gelesene Schnitt steht bei
     * x = 0.718, und dort ist M_y 9.08 statt 0.26 kNm.
     *
     * Der Anfang (x = 0) ist davon NICHT betroffen, und jeder Knoten ist
     * der Anfang irgendeines Stabes. Verglichen wird deshalb immer der
     * Anfang, das Ende nur dann, wenn der letzte Schnitt auch wirklich
     * dort liegt. Was uebersprungen wird, steht am Schluss als Zahl -
     * eine stillschweigend halbierte Gegenprobe waere schlimmer als gar
     * keine.
     */
    const e = schnitte.at(-1);
    const amEnde = e && Math.abs(e.x - laenge(stab)) < 1e-3 * Math.max(1, laenge(stab));
    if (!amEnde) nichtAmEnde += 1;
    const paare = [[schnitte[0], ausI(f)]];
    if (amEnde) paare.push([e, ausJ(f)]);
    paare.forEach(([s, meins]) => {
      if (!s) return;
      GROESSEN.forEach((g) => {
        const key = `${r}|${g}`;
        const st = stat.get(key)
          ?? { n: 0, max: 0, d: 0, wo: '', a: 0, b: 0 };
        st.n += 1;
        st.max = Math.max(st.max, Math.abs(s[g]));
        const d = Math.abs(s[g] - meins[g]);
        if (d > st.d) { st.d = d; st.wo = stab; st.a = s[g]; st.b = meins[g]; }
        stat.set(key, st);
      });
    });
  });
  const groesstes = Math.max(0, ...[...stat.values()].map((s) => s.max));
  if (groesstes < 1e-6) { leer += 1; return; }
  [...stat.entries()].sort().forEach(([key, st]) => {
    const [r, g] = key.split('|');
    /*
     * Der Bezug ist der groesste Wert DIESER Groesse in diesem Lastfall.
     * Ist er selbst winzig, traegt die Groesse in diesem Lastbild nichts -
     * dann steht ein Strich statt einer Prozentzahl, die nur Rauschen misst.
     */
    const rel = st.max > 1e-4 ? st.d / st.max : null;
    console.log(`${fall.padEnd(10)} ${r.padEnd(7)} ${g.padEnd(8)} ${String(st.n).padStart(4)}`
      + `${st.max.toFixed(4).padStart(13)}${st.d.toFixed(5).padStart(14)}`
      + `  ${rel === null ? '   -  ' : `${(rel * 100).toFixed(2)} %`.padStart(7)}`
      + `  ${st.wo}  ${st.a.toFixed(4)}/${st.b.toFixed(4)}`);
    if (rel !== null && (!schlimm || rel > schlimm.rel)) {
      schlimm = { rel, fall, r, g, st };
    }
  });
  console.log('-'.repeat(96));
});
if (leer) console.log(`(${leer} Lastfall/-faelle ohne Lasten - uebersprungen)`);
if (nichtAmEnde) {
  console.log(`
>>> ${nichtAmEnde} Stab/Lastfall-Paare OHNE Endschnitt verglichen. <<<`);
  console.log('    Die Bruecke liest die Schnitte 1 und 2 von elf; der zweite liegt');
  console.log('    bei x = L/10, nicht am Stabende. Verglichen wurde deshalb nur der');
  console.log('    Stabanfang - er ist vollstaendig, denn jeder Knoten ist der Anfang');
  console.log('    irgendeines Stabes.');
}

console.log('\n' + '='.repeat(96));
if (schlimm) {
  console.log(`GROESSTE RELATIVE ABWEICHUNG: ${(schlimm.rel * 100).toFixed(2)} % `
    + `in ${schlimm.fall}, ${schlimm.r} ${schlimm.g} am Stab ${schlimm.st.wo}`);
  console.log(`  AxisVM ${schlimm.st.a.toFixed(5)}   Loeser ${schlimm.st.b.toFixed(5)}`
    + `   (groesster Wert dieser Groesse: ${schlimm.st.max.toFixed(4)})`);
} else {
  console.log('Nichts zu vergleichen - keine gemeinsamen Lastfaelle mit Lasten.');
}
console.log('='.repeat(96));
