/* ===========================================================================
 * modell_torsion.mjs
 * ---------------------------------------------------------------------------
 * DIE MODELLDATEI FUER DEN TORSIONSFALL - J90/20 m mit Masten und vier
 * Anbauteilen, je Anbauteil eigene Lastfaelle.
 *
 * Vorschlag des Auftraggebers (26. September): «wäre es nicht noch
 * interessant ein anbauteil zu legen das zusätzlich torsion im joch
 * provoziert». Auf Rückfrage: «hier wäre eine hängestütze senkrecht und
 * eine last zum beispiel infolge windangriff zu sezten. der fall mit einer
 * zusätzlichen ausleger und leiter mit ablenkung wäre sicher auch
 * interessant für die lokalen einwirkungen in die gurte.» - je nahe am
 * Jochende und in Feldmitte, je ein eigener Lastfall.
 *
 * WOZU: der Vergleich Loeser gegen AxisVM (Etappe 4) hat Gurte und Bleche
 * bisher nur unter G und Wind gesehen. Torsion laeuft ueber die Links mit
 * «K_XX gehalten» in die Masten und verdrillt den Jochkasten - genau der
 * Mechanismus, an dem der Rest am Anschluss hing, bevor sich die Lage der
 * Linkverbindung als Ursache zeigte. Die Grundfaelle G / Wind x / Wind y
 * derselben Datei sind zugleich die Gegenprobe dieser Berichtigung.
 *
 * DIE VIER TEILE
 *   HS_Ende, HS_Mitte   Hängestütze ohne Aufbau (hs-nur), dazu 1.0 kN in
 *                       Gleisrichtung an ihrem Fuss (z = -2.70 m): Torsion
 *                       ueber den Hebel unter der Jochachse
 *   NT_Ende, NT_Mitte   Hängestütze mit NT-Ausleger und R-FL
 *                       (hs-nt-ausleger) bei x = 2.0 / 11.0 m - ein Feld
 *                       neben der Hängestütze, nicht an denselben Klemmen;
 *                       Umlenkkraft aus Radius 600 m und
 *                       Spannweite 50 m: oertliche Einleitung in die Gurte
 *
 * DIE EIGENEN LASTFAELLE
 * Die Ausleitung legt die Lasten der Anbauteile in die gewoehnlichen
 * Gruppen (G_Anbau, G_Ablenk, WindX, WindY ...). Hier wandern sie je Teil
 * in einen eigenen Fall `<Gruppe>|<Teil>` - so bleiben G, Wind x und
 * Wind y dieselben wie im Modell ohne Anbauteile, und jedes Teil laesst
 * sich fuer sich auswerten. Kombinationen werden nicht angepasst: fuer den
 * Vergleich zaehlen die Lastfaelle.
 *
 * AUFRUF
 *   node modell_torsion.mjs [com/AxisVM_Torsion_J90_20m.json]
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const HIER = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const J = (f) => pathToFileURL(join(HIER, 'js', f)).href;
const lies = (f) => JSON.parse(readFileSync(join(HIER, 'data', f), 'utf8'));

(await import(J('data.normen.js'))).setzeNormen(lies('normen.json'));
(await import(J('data.masten.js'))).setzeMastenDB(lies('masten.json'));
const T = await import(J('data.tragjoche.js')); T.setzeDatenbank(lies('tragjoche.json'));
const A = await import(J('data.anbauteile.js')); A.setzeAnbauteilDB(lies('anbauteile.json'));
(await import(J('data.fl.js'))).setzeFlDB(lies('fl_bauteile.json'));
(await import(J('data.abfangjoche.js'))).setzeAbfangDB(lies('abfangjoche.json'));
try { (await import(J('data.anker.js'))).setzeAnkerDB(lies('anker.json')); } catch { /* ohne */ }
const { standardwerte, typUebernehmen } = await import(J('ui.schema.js'));
const V = await import(J('core.vierendeel.js'));
const N = await import(J('core.nachbarn.js'));
const AX = await import(J('export.axisvm.js'));
const C = await import(J('core.constants.js'));

const ziel = process.argv[2] ?? 'com/AxisVM_Torsion_J90_20m.json';
const X_ENDE = 1.2;          // nahe am Jochende: im zweiten Feld
const X_MITTE = 10.0;        // Feldmitte
/*
 * Die NT-Ausleger EIN FELD DANEBEN, nicht am selben Punkt: beim ersten
 * Anlauf hingen Hängestütze und NT-Ausleger an denselben Klemmen - zwei
 * Anschluesse uebereinander, im Bild nicht auseinanderzuhalten.
 */
const X_NT_ENDE = 2.0;
const X_NT_MITTE = 11.0;
const Z_FUSS = -2.7;         // Fuss der Hängestütze (Modul hs-nur: Mitte bei -1.35)
const F_Y = 1.0;             // kN in Gleisrichtung am Fuss

const teil = (vorlage, x, name, lasten = []) => {
  const a = A.neuesAnbauteil(vorlage, x);
  return { ...a, name, lasten };
};
const anbauteile = [
  teil('hs-nur', X_ENDE, 'HS_Ende',
       [A.neuerLastblock('WindY', { z: Z_FUSS, Fy: F_Y })]),
  teil('hs-nur', X_MITTE, 'HS_Mitte',
       [A.neuerLastblock('WindY', { z: Z_FUSS, Fy: F_Y })]),
  teil('hs-nt-ausleger', X_NT_ENDE, 'NT_Ende'),
  teil('hs-nt-ausleger', X_NT_MITTE, 'NT_Mitte'),
];

let w = typUebernehmen({ ...standardwerte(), typ: 'J90' }, T.getTragjoch('J90'));
w = { ...w, L: 20, xLage: 0, mastVorhanden: true, twId: 'T1', pos: 0,
      trasseRadius: 600, flSpannweite: 50, anbauteile };
const satz = N.rechensatzMitNachbarn(w);
const erg = V.berechne(satz, ...N.kernArgumente(satz));
/*
 * >>> DER WEG DES STABWERKSKNOPFS, NICHT DER EINFACHE. <<<
 *
 * Beim ersten Anlauf stand hier `stabmodellJson(erg.modell, ...)` allein -
 * und die Masten hiessen nach dem Jochende (MAST_A, LINK_A_OGL) statt nach
 * dem Masten (MAST_M1). Gegen das Modell des Einzeljochs gehalten: 32
 * Knoten fehlten, 362 Staebe verschieden. Die Vergleichswerkzeuge suchen
 * die Masten beim Namen. Deshalb derselbe Einzelfall wie in
 * `rechneStabwerk` (app.stabwerk.js): `stabmodell` mit `mastNamen`.
 * OHNE Eigengewicht in der Lastliste - AxisVM setzt es selbst an, der
 * Loeser im Vergleich ebenso (siehe vergleich_axisvm.mjs).
 */
const t0 = C.tragwerkeVon(w)[0];
const [mA, mB] = t0 ? (C.mastenFuer(w, t0) ?? []) : [];
const bau = AX.stabmodell(erg.modell, { knotenmodell: 'anschnitt',
  mastNamen: { A: mA?.id ?? 'A', B: mB?.id ?? 'B' } });
const dat = AX.stabmodellJson(erg.modell, { knotenmodell: 'anschnitt', bau,
  eingabe: satz, eingaben: [satz] });

if (process.argv.includes('--roh')) {
  // Probelauf: wie heissen die Lasten der Anbauteile?
  const zeig = (l) => `${l.lastfall} ${l.knoten ?? l.stab} ${l.richtung} ${l.wert}`;
  dat.lasten.punkt.forEach((l) => console.log('P', zeig(l)));
  dat.lasten.strecke.filter((l) => !/^(OG|UG|MAST)/.test(l.stab)).forEach((l) => console.log('S', zeig(l)));
  (dat.lasten.moment ?? []).forEach((l) => console.log('M', zeig(l)));
  console.log(dat.lastfaelle.map((l) => l.key).join(' '));
  process.exit(0);
}
/* ---------------------------------------------------------------------------
 * JE TEIL EIGENE LASTFAELLE.
 *
 * Die Lasten eines Anbauteils haengen an seinen Knoten `AL<i>_<j>` - i ist
 * die Stelle in der Anbauteilliste (im Probelauf mit --roh nachgesehen).
 * Jede wandert aus ihrer Gruppe in `<Gruppe>|<Teil>`; der neue Fall erbt
 * Art und Bezeichnung der Gruppe, mit dem Teil dahinter.
 * ------------------------------------------------------------------------- */
const namen = anbauteile.map((a) => a.name);
const lfVon = new Map(dat.lastfaelle.map((l) => [l.key, l]));
const neu = new Map();
const teilVon = (knoten) => {
  const m = /^AL(\d+)_/.exec(String(knoten ?? ''));
  return m ? namen[Number(m[1])] : null;
};
let verschoben = 0;
['punkt', 'moment'].forEach((art) => (dat.lasten[art] ?? []).forEach((l) => {
  const t = teilVon(l.knoten);
  if (!t) return;
  const key = `${l.lastfall}|${t}`;
  if (!neu.has(key)) {
    const alt = lfVon.get(l.lastfall);
    neu.set(key, { ...alt, key, label: `${alt?.label ?? l.lastfall} · ${t}` });
  }
  l.lastfall = key;
  verschoben += 1;
}));
// Streckenlasten auf Staeben eines Anbauteils gibt es in dieser Ausleitung
// nicht (die Teile sind Starrkoerper mit Punktlasten) - sonst hier sagen.
const streckeTeil = dat.lasten.strecke.filter((l) => /^AL\d+_/.test(String(l.stab)));
if (streckeTeil.length) {
  console.error(`>>> ${streckeTeil.length} Streckenlasten auf Anbauteilen - nicht umgehaengt.`);
  process.exit(1);
}
dat.lastfaelle.push(...[...neu.values()].sort((a, b) => (a.key < b.key ? -1 : 1)));

writeFileSync(join(HIER, ziel), JSON.stringify(dat, null, 1));

// --- Was drin steht -------------------------------------------------------
const kn = new Map(dat.knoten.map((k) => [k.name, k]));
console.log(`${ziel}`);
console.log(`  ${dat.knoten.length} Knoten, ${dat.staebe.length} Staebe `
  + `(${dat.staebe.filter((s) => s.art === 'link').length} Links), `
  + `${dat.lastfaelle.length} Lastfaelle, ${verschoben} Lasten umgehaengt`);
console.log('  Teile: ' + anbauteile.map((a, i) => `AL${i} = ${a.name} (${a.vorlage}, x = ${a.x} m)`).join('; '));
console.log('\n  Lastfall                      Sum Fx   Sum Fy   Sum Fz    M_x um die Jochachse');
[...neu.keys()].sort().forEach((key) => {
  let fx = 0, fy = 0, fz = 0, mx = 0;
  dat.lasten.punkt.filter((l) => l.lastfall === key).forEach((l) => {
    const k = kn.get(l.knoten);
    const F = { X: [l.wert, 0, 0], Y: [0, l.wert, 0], Z: [0, 0, l.wert] }[l.richtung];
    fx += F[0]; fy += F[1]; fz += F[2];
    mx += k.y * F[2] - k.z * F[1];      // um die Jochachse (y = 0, z = 0)
  });
  console.log(`  ${key.padEnd(26)} ${fx.toFixed(3).padStart(8)} ${fy.toFixed(3).padStart(8)} `
    + `${fz.toFixed(3).padStart(8)}   ${mx.toFixed(3).padStart(8)} kNm`);
});
// Wo die Lastpunkte liegen - zum Nachsehen gegen die Vorlage.
console.log('\n  Knoten der Anbauteile (x, y, z in m):');
dat.knoten.filter((k) => /^AL\d+_/.test(k.name)).forEach((k) =>
  console.log(`    ${k.name.padEnd(8)} ${teilVon(k.name).padEnd(9)} ${k.x.toFixed(3).padStart(7)} ${k.y.toFixed(3).padStart(7)} ${k.z.toFixed(3).padStart(7)}`));
