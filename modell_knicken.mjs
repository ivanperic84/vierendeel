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
 *
 * THEORIE 2. ORDNUNG (18. November, Weisung «Ja, AxisVM rechnen» zu
 * Etappe B): mit `th2` kommt die Schiefstellung nach EN 5.3.2 als
 * Punktlast in den gefalteten Lastfall, die Datei heisst AxisVM_TH2_…,
 * und daneben steht <ziel>_soll.json mit den Knotenwegen des eigenen
 * Lösers (1. und 2. Ordnung, schubweich und schubstarr).
 *   node modell_knicken.mjs J130 30 schnee th2
 *   com\AxisVM_aufbauen.cmd -Json <ziel.json> -Rechnen -Nichtlinear -Stapel
 * ------------------------------------------------------------------------- */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const HIER = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const J = (f) => pathToFileURL(join(HIER, 'js', f)).href;
const lies = (f) => JSON.parse(readFileSync(join(HIER, 'data', f), 'utf8'));
(await import(J('data.normen.js'))).setzeNormen(lies('normen.json'));
(await import(J('data.masten.js'))).setzeMastenDB(lies('masten.json'));
const T = await import(J('data.tragjoche.js'));
const T2 = await import(J('core.stabtheorie2.js')); T.setzeDatenbank(lies('tragjoche.json'));
(await import(J('data.anbauteile.js'))).setzeAnbauteilDB(lies('anbauteile.json'));
(await import(J('data.fl.js'))).setzeFlDB(lies('fl_bauteile.json'));
(await import(J('data.abfangjoche.js'))).setzeAbfangDB(lies('abfangjoche.json'));
const V = await import(J('core.vierendeel.js'));
const N = await import(J('core.nachbarn.js'));
const S = await import(J('ui.schema.js'));
const AS = await import(J('app.stabwerk.js'));
const SN = await import(J('core.stabnachweis.js'));
const SW = await import(J('core.stabwerk.js'));

const args = process.argv.slice(2);
const [typ = 'J90', Ls = '20'] = args;
const L = Number(Ls);
const mitSchnee = args.includes('schnee');
const th2 = args.includes('th2');
const zielArg = args.find((a) => a.endsWith('.json'));
// fall=<key> wählt die Kombination (sonst die mit dem kleinsten alpha_cr).
const fallArg = args.find((a) => a.startsWith('fall='))?.slice(5);
const ziel = zielArg ?? `com/AxisVM_${th2 ? 'TH2' : 'Knick'}_${typ}_${L}m${mitSchnee ? '_Schnee' : ''}${fallArg ? `_${fallArg}` : ''}.json`;

let w = S.typUebernehmen({ ...S.standardwerte(), bearbeiten: false, typ }, T.getTragjoch(typ));
w = { ...w, L, xLage: 0, mastVorhanden: true, ...(mitSchnee ? { schneeAktiv: true } : {}) };
const satz = N.rechensatzMitNachbarn(w);
const erg = V.berechne(satz, ...N.kernArgumente(satz));
const h = AS.rechneStabwerk({ werte: w, letzte: { erg }, stabwerk: null });
if (h.fehler || h.ohneModell) throw new Error(h.fehler ?? h.ohneModell);
const k = AS.knickEigenwert(h);
const { dat, auswertung } = h.roh;
const lf = auswertung.faelle.find((f) => f.key === (fallArg ?? k.key));
if (!lf) throw new Error(`Kombination ${fallArg} gibt es nicht: ${auswertung.faelle.map((f) => f.key).join(', ')}`);
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
// Schiefstellung (nur mit th2) - dieselbe Rechnung wie die Anwendung.
const schief = th2 ? T2.schiefstellung(dat, h.roh.lsg, lf, SN.anteileFuer(lf, dat)) : null;
if (schief) {
  schief.zusatz.forEach((z, i) => neu.lasten.punkt.push({ name: `IMP_${i}`, knoten: z.knoten,
    richtung: z.richtung, wert: z.wert, lastfall: 'KNICK' }));
}
neu.lastfaelle = [{ key: 'KNICK', label: `Knick ${lf.bez}`.slice(0, 60), art: 'staendig' }];
neu.kombinationen = [];
neu.titel = `Knick ${typ}/${L} m${mitSchnee ? ' Schnee' : ''}`;

// Gegenprobe: die gefaltete Datei muss dasselbe alpha_cr geben.
const probe = (schubweich) => {
  const lsg = SW.loese(neu, { eigengewicht: false, schubweich });
  const kr = SN.kraefteAusAnteilen(lsg, [{ lastfall: 'KNICK', faktor: 1 }]);
  return lsg.knicken(new Map([...kr].map(([n, v]) => [n, v[6]])), { unterraum: 8, toleranz: 1e-7 });
};
const rw = probe(true);
if (!schief && !fallArg && Math.abs(rw.alpha / k.alpha - 1) > 1e-3) {
  console.error(`>>> gefaltet ${rw.alpha} gegen Kombination ${k.alpha} - nicht geschrieben.`);
  process.exit(1);
}
const rs = probe(false);
writeFileSync(join(HIER, ziel), JSON.stringify(neu, null, 1));
if (schief) {
  // Knotenwege des eigenen Lösers, 1. und 2. Ordnung, zum Vergleich.
  const wege = (schubweich) => {
    const lsg = SW.loese(neu, { eigengewicht: false, schubweich });
    const r = lsg.zweiteOrdnung('TH2', [{ lastfall: 'KNICK', faktor: 1 }]);
    const aus = (fall) => Object.fromEntries(neu.knoten.map((kk, i) =>
      [kk.name, [...lsg.u.get(fall).slice(i * 6, i * 6 + 6)]]));
    // Endkräfte wie AxisVM sie ausgibt (Anfang -f[0..5], Ende f[6..11]).
    const kr = (fall) => Object.fromEntries([...lsg.stabkraft(fall)].map(([nm, f]) =>
      [nm, [...[0, 1, 2, 3, 4, 5].map((q) => -f[q]), ...[6, 7, 8, 9, 10, 11].map((q) => f[q])]]));
    return { linear: aus('KNICK'), zweite: aus('TH2'), kraftLinear: kr('KNICK'),
             kraftZweite: kr('TH2'), iterationen: r.iterationen };
  };
  writeFileSync(join(HIER, ziel.replace(/\.json$/, '_soll.json')),
    JSON.stringify({ phi: schief.phi, m: schief.m, imperfektion: schief.zusatz,
                     schubweich: wege(true), schubstarr: wege(false) }));
  console.log(`  Schiefstellung phi = 1/${Math.round(1 / schief.phi)}, ${schief.zusatz.length} Knotenlasten`);
}
console.log(ziel);
console.log(`  Kombination: ${lf.bez}${fallArg ? '' : ' (kleinstes alpha_cr)'}`);
console.log(`  Anteile: ${[...fak].map(([l, f]) => `${l} x ${f}`).join(', ')}`);
console.log(`  alpha_cr schubweich: ${rw.alle.slice(0, 4).map((a) => a.toFixed(3)).join(' | ')}`);
console.log(`  alpha_cr schubstarr: ${rs.alle.slice(0, 4).map((a) => a.toFixed(3)).join(' | ')}`);
