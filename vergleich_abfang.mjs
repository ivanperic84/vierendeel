/**
 * vergleich_abfang.mjs
 * ============================================================================
 * DER KERN GEGEN AXISVM — Abfangjoch.
 *
 * Liest die Ergebnisdatei, die `com\AxisVM_aufbauen.cmd -Rechnen -Auslesen`
 * daneben legt, und stellt sie dem Rechenkern gegenüber. Verglichen wird an
 * der Stelle, an der der Nachweis fällt: grösste Randspannung im Gurt.
 *
 *   node vergleich_abfang.mjs                       A160 / 9.50 m
 *   node vergleich_abfang.mjs A240 8.0
 *
 * >>> WARUM NICHT DIE NORMALKRAFT ALLEIN. <<<
 *
 * Der Kern rechnet das Kräftepaar N = M/e und legt die örtliche Biegung des
 * Gurtes zwischen zwei Blechen darauf. AxisVM verteilt beides anders: im
 * Vierendeel trägt ein Teil des Moments über die Gurtbiegung ab, also fällt
 * N kleiner und M grösser aus. Wer nur N vergleicht, sieht einen Fehler, wo
 * keiner ist — und wer nur M vergleicht, ebenso. Massgebend ist die Summe.
 * ============================================================================
 */
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HIER = dirname(fileURLToPath(import.meta.url));
const J = (n) => new URL(`./js/${n}`, import.meta.url).href;

const AJ = await import(J('data.abfangjoche.js'));
AJ.setzeAbfangDB(JSON.parse(
  readFileSync(join(HIER, 'data', 'abfangjoche.json'), 'utf8')));
const AK = await import(J('core.abfangjoch.js'));
const PR = await import(J('data.profiles.js'));

const typ = process.argv[2] ?? 'A160';
const jt = Number(process.argv[3] ?? 9.5);
const basis = `AxisVM_Abfangjoch_${typ}_${jt.toFixed(1)}m`;
const erg = join(HIER, 'com', `${basis}_ergebnisse.json`);
const mod = join(HIER, 'com', `${basis}.json`);
if (!existsSync(erg)) {
  console.error(`Keine Ergebnisse: ${erg}\n`
    + `Zuerst  node axisvm_abfang.mjs ${typ} ${jt}\n`
    + `dann    com\\AxisVM_aufbauen.cmd -Json <datei> -Rechnen -Auslesen`);
  process.exit(1);
}
const R = JSON.parse(readFileSync(erg, 'utf8'));
const M = JSON.parse(readFileSync(mod, 'utf8'));

// --- Was im Modell steht ---------------------------------------------------
const Fh = M.lasten.punkt.reduce((s, l) => s + l.wert, 0);      // kN
const js = M.tragwerk.js;
const q = AK.abfangQuerschnitt(typ);
const rf = AK.abfangRahmenfeld(typ, jt);
const ein = AK.abfangBlechstationen(typ, jt);
const bl = AJ.abfangBindeblech(typ);
const FYD = 21.8;                                    // kN/cm², S235 / 1.05

// --- AxisVM: der Gurtschnitt mit der grössten Randspannung -----------------
const faelle = R.faelle ?? {};
const lz = faelle.Leiterzug ?? Object.values(faelle)[0];
let ax = null;
for (const s of lz.schnitte) {
  if (!/^[VH]_S\d+$/.test(s.stab)) continue;         // nur Gurtstäbe
  const sig = Math.abs(s.Nx) / q.Agurt
            + Math.abs(s.Mz) * 100 / q.Wgurtz;
  if (!ax || sig > ax.sig) ax = { ...s, sig };
}

// --- Der Kern an derselben Stelle ------------------------------------------
const Mrahmen = (Fh * js) / 4;                       // kNm, einfacher Balken
const V = Fh / 2;                                    // kN
const n = AK.abfangGurtnachweis(q, { Mrahmen, Mvert: 0, Vrahmen: V },
                                rf.a, FYD, { bBl: (bl.regel.b ?? 0) / 1000 });

const z = (v, k = 3) => v.toFixed(k).padStart(9);
console.log(`\n${typ} / ${jt.toFixed(2)} m   Leiterzug ${Fh} kN   `
          + `js ${js} m   e ${(q.e).toFixed(2)} cm`);
console.log(`Stationen ${ein.anzahl} (${ein.quersteifen} Steifen), `
          + `Randfeld a = ${rf.a.toFixed(3)} m, `
          + `Anschnitt ${n.anschnitt.toFixed(3)}`);
console.log('-'.repeat(66));
console.log('                        Kern     AxisVM   Kern/AxisVM');
console.log(`N [kN]             ${z(n.N)}  ${z(Math.abs(ax.Nx))}    `
          + `${(n.N / Math.abs(ax.Nx)).toFixed(3)}`);
console.log(`M_oertl [kNm]      ${z(n.Moertl)}  ${z(Math.abs(ax.Mz))}    `
          + `${(n.Moertl / Math.abs(ax.Mz)).toFixed(3)}`);
console.log(`sigma [kN/cm2]     ${z(n.sigma, 2)}  ${z(ax.sig, 2)}    `
          + `${(n.sigma / ax.sig).toFixed(3)}`);
console.log(`eta [-]            ${z(n.sigma / FYD, 3)}  ${z(ax.sig / FYD, 3)}    `
          + `${(n.sigma / ax.sig).toFixed(3)}`);
console.log('-'.repeat(66));
console.log(`AxisVM massgebend bei ${ax.stab}, x = ${ax.x} m`);
const v = n.sigma / ax.sig;
console.log(v < 1
  ? `\n>>> Der Kern liegt ${((1 - v) * 100).toFixed(1)} % DARUNTER `
    + '— auf der unsicheren Seite.'
  : `\n>>> Der Kern liegt ${((v - 1) * 100).toFixed(1)} % darueber `
    + '— auf der sicheren Seite.');
