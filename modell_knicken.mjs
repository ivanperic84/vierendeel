/* ===========================================================================
 * modell_knicken.mjs
 * ---------------------------------------------------------------------------
 * DIE MODELLDATEI FUER DEN KNICKVERGLEICH MIT AXISVM (18. November).
 *
 * Weisung «Ja, AxisVM rechnen» zum Knick-Eigenwert alpha_cr (Etappe 1/2).
 * AxisVM rechnet die lineare Stabilitaet je LASTFALL, die Anwendung je
 * Kombination. Dieses Werkzeug baut das Stabwerk wie der Stabwerksknopf
 * (`rechneStabwerk`), sucht die Kombination mit dem kleinsten alpha_cr und
 * faltet sie in EINEN Lastfall `KNICK` - mit dem Eigengewicht als Last
 * darin (ohne Lastfall `G` setzt die Bruecke kein eigenes). Vor dem
 * Schreiben rechnet es die gefaltete Datei selbst nach: dasselbe alpha_cr
 * wie die Kombination, sonst Abbruch.
 *
 * AUFRUF
 *   node modell_knicken.mjs <Typ> <L> [schnee] [ziel.json]
 *   com\AxisVM_aufbauen.cmd -Json <ziel.json> -Rechnen -Knicken -Stapel
 *   (schreibt <ziel>_knicken.json mit Ncr je Eigenform)
 * ------------------------------------------------------------------------- */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const HIER = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const J = (f) => pathToFileURL(join(HIER, 'js', f)).href;
const lies = (f) => JSON.parse(readFileSync(join(HIER, 'data', f), 'utf8'));
(await import(J('data.normen.js'))).setzeNormen(lies('normen.json'));
(await import(J('data.masten.js'))).setzeMastenDB(lies('masten.json'));
const T = await import(J('data.tragjoche.js')); T.setzeDatenbank(lies('tragjoche.json'));
(await import(J('data.anbauteile.js'))).setzeAnbauteilDB(lies('anbauteile.json'));
(await import(J('data.fl.js'))).setzeFlDB(lies('fl_bauteile.json'));
(await import(J('data.abfangjoche.js'))).setzeAbfangDB(lies('abfangjoche.json'));
const V = await import(J('core.vierendeel.js'));
const N = await import(J('core.nachbarn.js'));
const S = await import(J('ui.schema.js'));
const AS = await import(J('app.stabwerk.js'));
const SN = await import(J('core.stabnachweis.js'));
const SW = await import(J('core.stabwerk.js'));

const [typ = 'J90', Ls = '20', schnee, zielArg] = process.argv.slice(2);
const L = Number(Ls);
const mitSchnee = schnee === 'schnee';
const ziel = zielArg ?? `com/AxisVM_Knick_${typ}_${L}m${mitSchnee ? '_Schnee' : ''}.json`;

let w = S.typUebernehmen({ ...S.standardwerte(), bearbeiten: false, typ }, T.getTragjoch(typ));
w = { ...w, L, xLage: 0, mastVorhanden: true, ...(mitSchnee ? { schneeAktiv: true } : {}) };
const satz = N.rechensatzMitNachbarn(w);
const erg = V.berechne(satz, ...N.kernArgumente(satz));
const h = AS.rechneStabwerk({ werte: w, letzte: { erg }, stabwerk: null });
if (h.fehler || h.ohneModell) throw new Error(h.fehler ?? h.ohneModell);
const k = AS.knickEigenwert(h);
const { dat, auswertung } = h.roh;
const lf = auswertung.faelle.find((f) => f.key === k.key);
const fak = new Map(SN.anteileFuer(lf, dat).map((a) => [a.lastfall, a.faktor]));

// Die Datei des Stabwerks traegt das Eigengewicht schon als Streckenlast im
// Lastfall G (EG_<Stab>) - es wird mit dem Beiwert von G mitgefaltet.
const falt = (arr) => (arr ?? []).flatMap((l) => {
  const f = fak.get(l.lastfall);
  return f ? [{ ...l, wert: l.wert * f, lastfall: 'KNICK' }] : [];
});
const neu = structuredClone(dat);
neu.lasten = { punkt: falt(dat.lasten.punkt), strecke: falt(dat.lasten.strecke),
               moment: falt(dat.lasten.moment) };
neu.lastfaelle = [{ key: 'KNICK', label: `Knick ${k.bez}`.slice(0, 60), art: 'staendig' }];
neu.kombinationen = [];
neu.titel = `Knick ${typ}/${L} m${mitSchnee ? ' Schnee' : ''}`;

// Gegenprobe: die gefaltete Datei muss dasselbe alpha_cr geben.
const probe = (schubweich) => {
  const lsg = SW.loese(neu, { eigengewicht: false, schubweich });
  const kr = SN.kraefteAusAnteilen(lsg, [{ lastfall: 'KNICK', faktor: 1 }]);
  return lsg.knicken(new Map([...kr].map(([n, v]) => [n, v[6]])), { unterraum: 8, toleranz: 1e-7 });
};
const rw = probe(true);
if (Math.abs(rw.alpha / k.alpha - 1) > 1e-3) {
  console.error(`>>> gefaltet ${rw.alpha} gegen Kombination ${k.alpha} - nicht geschrieben.`);
  process.exit(1);
}
const rs = probe(false);
writeFileSync(join(HIER, ziel), JSON.stringify(neu, null, 1));
console.log(ziel);
console.log(`  massgebend: ${k.bez}`);
console.log(`  Anteile: ${[...fak].map(([l, f]) => `${l} x ${f}`).join(', ')}`);
console.log(`  alpha_cr schubweich: ${rw.alle.slice(0, 4).map((a) => a.toFixed(3)).join(' | ')}`);
console.log(`  alpha_cr schubstarr: ${rs.alle.slice(0, 4).map((a) => a.toFixed(3)).join(' | ')}`);
