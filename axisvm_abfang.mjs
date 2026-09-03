/**
 * axisvm_abfang.mjs
 * ============================================================================
 * DER JSON-BAUER FÜRS ABFANGJOCH.
 *
 * Erzeugt die Modelldatei, die `com\AxisVM_aufbauen.cmd` liest. Vorher stand
 * dieser Schritt in einem Wegwerfskript — und damit war der Vergleich nicht
 * wiederholbar: nach jeder Änderung an der Blechlage hätte er von Hand neu
 * geschrieben werden müssen.
 *
 *   node axisvm_abfang.mjs                    A160 / 9.50 m, Regelfall
 *   node axisvm_abfang.mjs A240 8.0           ein anderer Typ
 *   node axisvm_abfang.mjs A240 8.0 12        mit anderem Leiterzug [kN]
 *
 * Gerechnet wird hier nichts. Die Datei landet in `com/` und wartet dort.
 * ============================================================================
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HIER = dirname(fileURLToPath(import.meta.url));
const J = (n) => new URL(`./js/${n}`, import.meta.url).href;

const P = await import(J('data.profiles.js'));
const AJ = await import(J('data.abfangjoche.js'));
AJ.setzeAbfangDB(JSON.parse(
  readFileSync(join(HIER, 'data', 'abfangjoche.json'), 'utf8')));
const XA = await import(J('export.axisvm.abfang.js'));

const typ = process.argv[2] ?? 'A160';
const jt = Number(process.argv[3] ?? 9.5);
const Fh = process.argv[4] ? Number(process.argv[4]) : undefined;

const modell = XA.abfangAxisvmModell(typ, jt, Fh ? { Fh } : {});
const name = `AxisVM_Abfangjoch_${typ}_${jt.toFixed(1)}m.json`;
const pfad = join(HIER, 'com', name);
writeFileSync(pfad, JSON.stringify(modell, null, 1), 'utf8');

const ein = (await import(J('core.abfangjoch.js')))
  .abfangBlechstationen(typ, jt);
const z = (n) => modell.staebe.filter((x) => x.querschnitt === n).length;
console.log(`${name}`);
console.log(`  Stationen ${ein.anzahl}  (${ein.quersteifen} Quersteifen)`);
console.log(`  Knoten ${modell.knoten.length}, Staebe ${modell.staebe.length}`
          + `  [GURT ${z('GURT')} BLECH ${z('BLECH')} `
          + `BLECH_ENDE ${z('BLECH_ENDE')} STEIFE ${z('STEIFE')}]`);
console.log(`  e = ${(modell.tragwerk.e * 100).toFixed(2)} cm, `
          + `Leiterzug ${modell.lasten.punkt.reduce((s, l) => s + l.wert, 0)} kN`);
console.log(`  -> ${pfad}`);
