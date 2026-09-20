/**
 * datenpaket.mjs
 * ---------------------------------------------------------------------------
 * SCHREIBT DEN AKTUELLEN DATENSTAND ALS DATENPAKET NACH `Versand/`.
 *
 * Weisung vom 20. September: «kannst du noch jeweils den aktuellen stand der
 * daten ablegen nach der modfizierung unter versand».
 *
 * WOZU ES DAS BRAUCHT
 *
 * Die Anwendung liest ihre Datenbasis aus den Dateien `data/*.json`, die
 * neben ihr liegen. Wo die fehlen - auf GitHub Pages, in einem Bündel ohne
 * Daten, in einem anderen Browser - kommt sie nur aus einem DATENPAKET.
 * Ein älteres Paket führt womöglich nicht alle Sortimente; genau daran fehlte
 * am 20. September der Mastwind (die Normprofile tragen keine Windzeile).
 *
 * Deshalb: nach jeder Änderung an `data/` dieses Werkzeug laufen lassen. Es
 * baut das Paket aus demselben Code wie der Knopf in der Anwendung
 * (`paketAus`) - eine Quelle, keine zweite Wahrheit.
 *
 *     node datenpaket.mjs              nach Versand/
 *     node datenpaket.mjs --ziel .     daneben
 *
 * `Versand/` steht nicht in der Ablage (.gitignore) - das Paket trägt
 * Betreiberdaten.
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const J = (n) => new URL(`./js/${n}`, import.meta.url).href;
const datei = (n) => new URL(`./data/${n}`, import.meta.url);
const lies = (n) => JSON.parse(readFileSync(datei(n), 'utf8'));

const argv = process.argv.slice(2);
const zielIdx = argv.indexOf('--ziel');
const ZIEL = zielIdx >= 0 ? argv[zielIdx + 1] : 'Versand';

/*
 * JEDES SORTIMENT FÜR SICH - und ein fehlendes ist kein Abbruch.
 *
 * `paketAus` nimmt mit, was geladen ist. Bricht eine Datei weg, soll das
 * Paket trotzdem entstehen; nur sagt der Bericht unten dann, was fehlt.
 */
const TEILE = [
  ['normen.json', 'data.normen.js', 'setzeNormen', 'Normwerte'],
  ['tragjoche.json', 'data.tragjoche.js', 'setzeDatenbank', 'Tragjochtypen'],
  ['anbauteile.json', 'data.anbauteile.js', 'setzeAnbauteilDB', 'Anbauteil-Vorlagen'],
  ['fl_bauteile.json', 'data.fl.js', 'setzeFlDB', 'Lasttabelle'],
  ['abfangjoche.json', 'data.abfangjoche.js', 'setzeAbfangDB', 'Abfangjochtypen'],
  ['anker.json', 'data.anker.js', 'setzeAnkerDB', 'Zug- und Druckstützen'],
  ['masten.json', 'data.masten.js', 'setzeMastenDB', 'Masttypen'],
];

const fehlt = [];
for (const [dateiname, modul, setzer, titel] of TEILE) {
  try {
    const m = await import(J(modul));
    m[setzer](lies(dateiname));
  } catch (e) {
    fehlt.push(`${titel} (${dateiname}): ${e.message}`);
  }
}

const { paketAus } = await import(J('data.paket.js'));
const paket = paketAus('Datenstand aus data/');
const name = `Vierendeel_Datenpaket_${paket.stand}.json`;

if (!existsSync(ZIEL)) mkdirSync(ZIEL, { recursive: true });
const pfad = join(ZIEL, name);
const text = JSON.stringify(paket, null, 1);
writeFileSync(pfad, text, 'utf8');

/* --- Bericht ------------------------------------------------------------ */
const enthalten = Object.keys(paket).filter(
  (k) => !['format', 'version', 'stand', 'bezeichnung'].includes(k));
console.log(`\nDatenpaket geschrieben: ${pfad}  (${(text.length / 1024).toFixed(0)} kB)`);
console.log(`  Stand ${paket.stand} · Format ${paket.format} v${paket.version}`);
enthalten.forEach((k) => {
  const n = JSON.stringify(paket[k]).length / 1024;
  console.log(`    ${k.padEnd(14)}${n.toFixed(0)} kB`);
});

/*
 * >>> WAS FEHLT, IST WICHTIGER ALS WAS DRIN IST. <<<
 *
 * Ein Paket ohne Masttypen lädt klaglos - und danach fehlt die Windlast auf
 * den Masten, ohne dass es jemandem auffällt (20. September). Deshalb steht
 * es hier laut.
 */
const SOLL = ['tragjoche', 'anbauteile', 'fl_bauteile', 'abfangjoche', 'anker', 'masten'];
const ohne = SOLL.filter((k) => !enthalten.includes(k));
if (ohne.length || fehlt.length) {
  console.log('\n  >>> ACHTUNG <<<');
  ohne.forEach((k) => console.log(`    nicht im Paket: ${k}`));
  fehlt.forEach((t) => console.log(`    nicht gelesen: ${t}`));
  console.log('    Ein Browser ohne data/ rechnet dann ohne diese Daten.');
} else {
  console.log('\n  Alle sechs Sortimente sind dabei.');
}
