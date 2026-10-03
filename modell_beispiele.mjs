/**
 * modell_beispiele.mjs
 * ---------------------------------------------------------------------------
 * ZWEI BEISPIELBLÄTTER ALS MODELLDATEI FÜR AxisVM (3. Oktober).
 *
 * Weisung: «checke den bau im axisvm mit den getesteten tragweken und mach
 * einen qervergleich mit der app bezüglich der auswertung der resultate.»
 *
 *   A  zwei Abfangjoche übereinander (oben zwei Tragseile, unten zwei
 *      Fahrdrähte, einseitig abgefangen), Druckstütze längs an jedem Masten
 *   B  altes Tragjoch auf zwei Gittermasten (einer mit Lampen, einer mit
 *      Zusatzleitern am Mastaufsatz), drei Gleise mit Hängestütze und
 *      Kettenwerk, ein Jochaufsatz
 *
 * Die Datei ist die, die der Stabwerksknopf der Anwendung rechnet - ohne
 * die Eigengewichtslasten (AxisVM setzt sie je Stab selbst an).
 *
 *   node modell_beispiele.mjs            schreibt com/AxisVM_Beispiel_A.json, _B.json
 *   com\AxisVM_aufbauen.cmd -Json <datei> -Rechnen -Auslesen -Stapel
 *   node vergleich_axisvm.mjs com/AxisVM_Beispiel_A.json
 *
 * Gerechnet wird in AxisVM nur auf Anweisung des Auftraggebers.
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const J = (f) => `file:///${join(HIER, 'js', f).replace(/\\/g, '/')}`;
const D = (f) => JSON.parse(readFileSync(join(HIER, 'data', f), 'utf8'));

(await import(J('data.normen.js'))).setzeNormen(D('normen.json'));
const MA = await import(J('data.masten.js')); MA.setzeMastenDB(D('masten.json'));
const T = await import(J('data.tragjoche.js')); T.setzeDatenbank(D('tragjoche.json'));
const DA = await import(J('data.anbauteile.js')); DA.setzeAnbauteilDB(D('anbauteile.json'));
(await import(J('data.fl.js'))).setzeFlDB(D('fl_bauteile.json'));
(await import(J('data.abfangjoche.js'))).setzeAbfangDB(D('abfangjoche.json'));
(await import(J('data.anker.js'))).setzeAnkerDB(D('anker.json'));
const V = await import(J('core.vierendeel.js'));
const C = await import(J('core.constants.js'));
const N = await import(J('core.nachbarn.js'));
const AS = await import(J('app.stabwerk.js'));
const S = await import(J('ui.schema.js'));

const grund = (typ = 'J90') => ({
  ...S.typUebernehmen({ ...S.standardwerte(), bearbeiten: false, typ }, T.getTragjoch(typ)),
  L: 20, xLage: 0, mastVorhanden: true, twId: 'T1' });
const teilJ = (vid, x, name) => ({ ...DA.neuesAnbauteil(vid, x), ort: 'joch', ...(name ? { name } : {}) });

/** Blatt A: zwei Abfangjoche übereinander mit Druckstützen längs. */
export function blattA() {
  let w = C.tragwerkHinzu(grund(), 'abfangjoch', { xLage: 0, L: 12.5, abfangTyp: 'A160', mastH: 7.5 });
  w = C.tragwerkWeg(w, 'T1');
  w.anbauteile = [teilJ('leiter-ts-nfl-abf', 4.0, 'Tragseil Gleis 1'), teilJ('leiter-ts-nfl-abf', 8.5, 'Tragseil Gleis 2')];
  w = C.tragwerkHinzu(w, 'abfangjoch', { xLage: 0, L: 12.5, abfangTyp: 'A160', mastH: 6.0 });
  w.anbauteile = [teilJ('leiter-fd-nfl-abf', 4.0, 'Fahrdraht Gleis 1'), teilJ('leiter-fd-nfl-abf', 8.5, 'Fahrdraht Gleis 2')];
  C.mastenVon(w).forEach((m) => {
    w = C.setzeMastAnker(w, m.id, { typ: 'U12', h: 6.5, a: 4.5, richtung: 'y', seite: 'minus', befestigung: 'ankerplatte' });
  });
  return w;
}

/** Blatt B: altes Tragjoch auf zwei Gittermasten. */
export function blattB(windKlasse = '0.9') {
  let w = { ...grund('J120-alt'), L: 24, mastH: 7.3, windKlasse };
  w.anbauteile = [6, 12, 18].flatMap((x, i) => [teilJ('hs-fahrdraht', x, `Hängestütze Gleis ${i + 1}`),
    teilJ('kw-nfl-joch', x, `Kettenwerk Gleis ${i + 1}`)]).concat([teilJ('ja-einfach', 9, 'Jochaufsatz mit Zusatzleiter')]);
  const ms = C.mastenVon(w);
  const typA = 'II 45', typB = 'IV 45 UL 17.7';
  w = C.setzeMastAngabe(w, ms[0].id, 'mastProfil', MA.GITTER_PRAEFIX + typA);
  w = C.setzeMastAngabe(w, ms[1].id, 'mastProfil', MA.GITTER_PRAEFIX + typB);
  const m2 = C.mastenVon(w);
  const LA = MA.gittermastGeometrie(typA).laenge, LB = MA.gittermastGeometrie(typB).laenge;
  const mt = (vid, ort, mid, h, name) => ({ ...DA.neuesAnbauteil(vid, 0), name, ort, mastId: mid, x: 0, hMast: h });
  return C.setzeAnbauteileAn(w, [...w.anbauteile,
    mt('mast-lampe-alt-rohr', 'mastA', m2[0].id, LA, 'Lampe oben'),
    mt('mast-lampe-alt-rohr', 'mastA', m2[0].id, LA - 1.5, 'Lampe unten'),
    mt('leiter-traverse', 'mastB', m2[1].id, LB - 0.3, 'Traverse Zusatzleiter oben'),
    mt('leiter-traverse', 'mastB', m2[1].id, LB - 1.8, 'Traverse Zusatzleiter unten')]);
}

/** Das Blatt rechnen wie der Stabwerksknopf. */
export function rechne(w0) {
  const w = N.rechensatzMitNachbarn(w0);
  const erg = V.berechne(w, ...N.kernArgumente(w));
  return AS.rechneStabwerk({ werte: w0, letzte: { erg }, stabwerk: null });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1].replace(/\//g, '\\')
    || process.argv[1]?.endsWith('modell_beispiele.mjs')) {
  for (const [name, w] of [['A', blattA()], ['B', blattB()]]) {
    const h = rechne(w);
    if (h.fehler || h.ohneModell) { console.log(name, 'nicht gerechnet:', h.fehler ?? h.ohneModell); continue; }
    const dat = h.roh.dat;
    const ax = { ...dat, lasten: { ...dat.lasten,
      strecke: dat.lasten.strecke.filter((l) => !/(^|_)EG_/.test(l.name)) } };
    const ziel = join(HIER, 'com', `AxisVM_Beispiel_${name}.json`);
    writeFileSync(ziel, JSON.stringify(ax, null, 1));
    console.log(`Beispiel ${name}: ${dat.knoten.length} Knoten, ${dat.staebe.length} Stäbe, `
      + `${dat.lastfaelle.length} Lastfälle, ${dat.lasten.strecke.length - ax.lasten.strecke.length} Eigengewichtslasten entfernt`);
    console.log('  App (Stabwerk):', (h.reihe ?? []).map((b) => `${b.name ?? b.key} ${b.eta.toFixed(3)}`).join(' · '));
  }
}
