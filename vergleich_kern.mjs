/**
 * vergleich_kern.mjs
 * ---------------------------------------------------------------------------
 * DER ERSATZBALKEN GEGEN DAS STABWERK.
 *
 * Weisung vom 25. September, auf die Frage, ob der Loeser in die
 * Berechnungslogik soll: «Erst vergleichen: eta je Bauteil».
 *
 * >>> WAS HIER VERGLICHEN WIRD, UND IN WELCHER REIHENFOLGE. <<<
 *
 * Der Rechenkern bildet das Tragjoch als ERSATZBALKEN ab: ein Balken mit
 * Drehfedern, dessen Schnittgroessen danach auf Gurte und Bleche aufgeteilt
 * werden (core.statics -> core.querschnitt). Der Stabwerksloeser rechnet
 * jeden Gurt und jedes Blech als eigenen Stab.
 *
 * Bevor man zwei eta vergleicht, muss klar sein, ob beide DASSELBE TRAGWERK
 * sehen. Deshalb zuerst die Schnittgroessen:
 *
 *   1. Das Biegemoment M_y. Im Ersatzbalken steht es als eine Zahl je
 *      Station. Im Stabwerk steckt es im KRAEFTEPAAR der Gurte:
 *      M_y = (Summe N der Obergurte) * h. Geht das auf, bilden beide
 *      dasselbe Tragverhalten ab - und erst dann sagt ein eta-Vergleich
 *      etwas ueber die Nachweise.
 *
 *   2. Dasselbe quer: M_z aus dem Kraeftepaar links gegen rechts, ueber b.
 *
 *   3. Die Querkraft V_z aus den Blechen.
 *
 * >>> DIE LASTEN MUESSEN DIESELBEN SEIN. <<<
 *
 * Der Kern rechnet KOMBINATIONEN (`lastfaelle()` in core.lasten.js gibt je
 * Kombination die Beiwerte pro Einwirkungsgruppe). Der Loeser rechnet die
 * acht GRUPPEN der AxisVM-Datei. Weil das System linear ist, wird die
 * Kombination hier durch Ueberlagerung gebildet - mit genau denselben
 * Beiwerten. Das kostet nichts: die teure Zerlegung faellt einmal an.
 *
 * >>> ERSTER BEFUND (25. September, J90 / 20 m). <<<
 *
 * Die beiden Modelle liegen im Feld auf 5 bis 10 Prozent beieinander, und
 * die Abweichung ist in ALLEN VIER Nachweis-Kombinationen dieselbe
 * (3.6225 kNm) - sie kommt also aus dem staendigen Anteil, nicht aus dem
 * Wind. Sie ist auch kein proportionaler Fehler, sondern ein VERSATZ.
 *
 * Die Ursache steht im Modell: `federn.cA = 0` und `cB = 0`. Der
 * Ersatzbalken rechnet das Joch als Einfeldtraeger mit GELENKIGEN Enden -
 * am Auflager steht M_y = 0. Im Stabwerk bilden die vier Links ueber die
 * Bauhoehe eine TEILEINSPANNUNG; dort stehen am Jochende rund 2 kNm.
 *
 * Die Folge ist unterschiedlich gerichtet:
 *
 *   - In FELDMITTE hat der Ersatzbalken MEHR Moment (37.51 gegen 35.50
 *     bzw. 36.24 kNm) - dort liegt er auf der sicheren Seite.
 *   - Am JOCHENDE hat er null statt zwei kNm - dort auf der unsicheren,
 *     aber das Moment ist klein.
 *
 * Und: das Stabwerk ist NICHT symmetrisch (35.50 gegen 36.24 bei x = 8.6
 * und 11.4 m), der Ersatzbalken exakt. Das ist erklaerbar und gewollt: in
 * Jochachse haelt nur EIN Knoten (Entscheid vom 27. August, jeder weitere
 * waere ein Zwang). Der Ersatzbalken kennt diese Unsymmetrie nicht.
 *
 * >>> WAS DAMIT NOCH NICHT GEMESSEN IST. <<<
 *
 * eta je Bauteil. Dafuer muessen die Stabkraefte in Spannungen umgerechnet
 * werden, und beim Gurtwinkel heisst das: in seine HAUPTACHSEN drehen (im
 * Modell steht er in den Schenkelachsen, Iy = Iz). Das ist der naechste
 * Schritt.
 *
 * Aufruf:
 *   node vergleich_kern.mjs                 J90 / 20 m
 *   node vergleich_kern.mjs --typ J70 --L 15
 *   node vergleich_kern.mjs --fall windYp   nur diese Kombination
 * ---------------------------------------------------------------------------
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const J = (f) => `file:///${join(HIER, 'js', f).replace(/\\/g, '/')}`;

/* --- Daten ---------------------------------------------------------------- */
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
const SW = await import(J('core.stabwerk.js'));
const LA = await import(J('core.lasten.js'));

/* --- Aufruf --------------------------------------------------------------- */
const arg = (name, std) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : std;
};
const TYP = arg('typ', 'J90');
const LAENGE = Number(arg('L', 20));
const NURFALL = arg('fall', null);

/* --- Das Modell ----------------------------------------------------------- */
let w = S.typUebernehmen({ ...S.standardwerte(), typ: TYP }, T.getTragjoch(TYP));
w.L = LAENGE; w.xLage = 0; w.mastVorhanden = true;
const satz = N.rechensatzMitNachbarn(w);
const ergBem = V.berechne(satz, ...N.kernArgumente(satz));
const m = ergBem.modell;

const bau = AX.stabmodell(m, { knotenmodell: 'anschnitt' });
bau.lasten = AX.lasten(m, bau, { eigengewicht: true, gTrennen: true });
const dat = AX.stabmodellJson(m, { bau, knotenmodell: 'anschnitt' });

console.log('='.repeat(100));
console.log(`ERSATZBALKEN GEGEN STABWERK  ·  ${TYP} / ${LAENGE.toFixed(2)} m`);
console.log('='.repeat(100));
console.log(`Hebelarm h = ${m.h.toFixed(4)} m · Gurtabstand b = ${m.b.toFixed(4)} m`
  + ` · ${dat.knoten.length} Knoten · ${dat.staebe.length} Stäbe`);

const lsg = SW.loese(dat, { eigengewicht: false });
console.log(`Löser: ${lsg.n} Freiheitsgrade, ${lsg.zeit.gesamt} ms`
  + ` für ${lsg.faelle.length} Einwirkungsgruppen`);

/* ===========================================================================
 * >>> DIE GURTE AN IHRER STELLE FINDEN. <<<
 *
 * Ein Gurt heisst OGL_S3 und laeuft zwischen zwei Knoten OGL_<x>. Fuer den
 * Vergleich zaehlt seine Mitte: dort wird das Kraeftepaar ausgewertet und
 * mit der Station des Ersatzbalkens verglichen.
 *
 * Die STEIFEN Knotenabschnitte gehoeren dazu - sie sind Teil des Gurts, nur
 * mit anderem Material. Ausgenommen bleibt, was kein Gurt ist.
 * ========================================================================= */
const kn = new Map(dat.knoten.map((k) => [k.name, k]));
const gurte = dat.staebe
  .filter((st) => /^(OG|UG)(L|R)_S\d+$/.test(String(st.name)))
  .map((st) => {
    const a = kn.get(st.von), b = kn.get(st.bis);
    return { name: st.name, x: (a.x + b.x) / 2,
             lage: st.name.slice(0, 3), a, b };
  })
  .sort((p, q) => p.x - q.x);

if (!gurte.length) {
  console.log('\nKeine Gurtstäbe gefunden - hat dieses Tragwerk ein Joch?');
  process.exit(1);
}

/* --- Die Lastfaelle des Kerns --------------------------------------------- */
const kernFaelle = LA.lastfaelle(satz).filter((l) => l.nachweis !== false);

/* ===========================================================================
 * >>> DIE KOMBINATION AUS DEN GRUPPEN ZUSAMMENSETZEN. <<<
 *
 * `beiwerte` nennt je Einwirkungsgruppe den Faktor. Die staendige Last ist
 * in der Datei in DREI Gruppen aufgeteilt (G, G_Anbau, G_Ablenk) - das ist
 * die Trennung, die die charakteristischen Einzelfaelle brauchen. Fuer eine
 * Kombination, die G mit einem Beiwert nimmt, zaehlen alle drei.
 * ========================================================================= */
const GRUPPEN = { G: ['G', 'G_Anbau', 'G_Ablenk'], WindX: ['WindX'],
                  WindY: ['WindY'], Schnee: ['Schnee'],
                  HavarieX: ['HavarieX'], HavarieY: ['HavarieY'] };

const kraftUeberlagert = (beiwerte) => {
  const out = new Map();
  Object.entries(beiwerte || {}).forEach(([gruppe, faktor]) => {
    if (!faktor) return;
    (GRUPPEN[gruppe] ?? [gruppe]).forEach((fall) => {
      if (!lsg.u.has(fall)) return;
      const sk = lsg.stabkraft(fall);
      sk.forEach((f, name) => {
        let ziel = out.get(name);
        if (!ziel) { ziel = new Float64Array(12); out.set(name, ziel); }
        for (let i = 0; i < 12; i += 1) ziel[i] += faktor * f[i];
      });
    });
  });
  return out;
};

/* ===========================================================================
 * >>> DAS BIEGEMOMENT AUS DEM KRAEFTEPAAR. <<<
 *
 * Am Ende i zeigt die lokale x-Kraft in die Stabachse hinein; eine ZUGkraft
 * steht dort mit negativem Vorzeichen. Damit N positiv Zug bedeutet, wird
 * das Vorzeichen gedreht - gemessen und nicht geraten: unter Eigengewicht
 * muss der Untergurt eines Einfeldtraegers ziehen.
 * ========================================================================= */
const normalkraft = (f) => -f[0];

/*
 * >>> JE LAGE GENAU EIN STAB - DER, DER DIE STATION UEBERDECKT. <<<
 *
 * Der erste Anlauf sammelte alle Gurtstaebe in einem Fenster von +-0.35 m
 * und summierte damit MEHRERE Staebe derselben Lage. Das Kraeftepaar kam
 * dadurch um den Faktor 2.9 zu gross heraus - und sah aus wie ein Befund
 * ueber den Loeser. Es war ein Befund ueber die Auswertung.
 */
const VIER = ['OGL', 'OGR', 'UGL', 'UGR'];
const stabAn = (lage, x) => {
  const kandidaten = gurte.filter((g) => g.lage === lage);
  // Zuerst der Stab, dessen Intervall die Station enthaelt.
  const deckt = kandidaten.find((g) => {
    const von = Math.min(g.a.x, g.b.x), bis = Math.max(g.a.x, g.b.x);
    return x >= von - 1e-9 && x <= bis + 1e-9;
  });
  if (deckt) return deckt;
  // Sonst der naechste - fuer Stationen, die zwischen zwei Abschnitten liegen.
  return kandidaten.reduce((best, g) =>
    (!best || Math.abs(g.x - x) < Math.abs(best.x - x) ? g : best), null);
};

const momenteAn = (kraefte, x) => {
  const je = {};
  let gefunden = 0;
  VIER.forEach((lage) => {
    const g = stabAn(lage, x);
    je[lage] = g && kraefte.has(g.name) ? normalkraft(kraefte.get(g.name)) : null;
    if (je[lage] !== null) gefunden += 1;
  });
  const nOG = (je.OGL ?? 0) + (je.OGR ?? 0);
  const nUG = (je.UGL ?? 0) + (je.UGR ?? 0);
  const nL = (je.OGL ?? 0) + (je.UGL ?? 0);
  const nR = (je.OGR ?? 0) + (je.UGR ?? 0);
  return {
    anzahl: gefunden,
    // Kraeftepaar ueber die Bauhoehe bzw. die Breite.
    My: ((nUG - nOG) / 2) * m.h,
    Mz: ((nR - nL) / 2) * m.b,
    Nx: nOG + nUG,
  };
};

/* --- Gegenueberstellung --------------------------------------------------- */
let schlimmstes = 0; let schlimmstesWo = '';

for (const fall of kernFaelle) {
  if (NURFALL && fall.key !== NURFALL) continue;
  const eK = V.berechne({ ...satz, lastfall: fall.key }, ...N.kernArgumente(satz));
  const kraefte = kraftUeberlagert(fall.beiwerte);

  /*
   * Verglichen wird an den Stationen des Ersatzbalkens - aber nur dort, wo
   * das Stabwerk wirklich Gurte hat. Am Auflager selbst steht kein Moment
   * und die Station liegt auf dem Mast; solche Stellen sagen nichts.
   */
  let maxAbw = 0; let woX = null; let maxMy = 0;
  const zeilen = [];
  eK.knoten.forEach((st) => {
    const g = momenteAn(kraefte, st.x);
    if (g.anzahl < 4) return;              // nicht alle vier Gurte getroffen
    maxMy = Math.max(maxMy, Math.abs(st.My));
    const d = Math.abs(st.My - g.My);
    if (d > maxAbw) { maxAbw = d; woX = st.x; }
    zeilen.push({ x: st.x, kern: st.My, stab: g.My, kernMz: st.Mz, stabMz: g.Mz });
  });
  if (!zeilen.length) continue;

  const rel = maxMy > 0 ? maxAbw / maxMy : 0;
  if (rel > schlimmstes) { schlimmstes = rel; schlimmstesWo = `${fall.key} bei x = ${woX?.toFixed(2)} m`; }

  console.log('\n' + '-'.repeat(100));
  console.log(`${fall.key.padEnd(10)} ${fall.bez}`);
  console.log('-'.repeat(100));
  console.log('    x [m]    M_y Kern   M_y Stabwerk   Abw.        M_z Kern   M_z Stabwerk');
  const zeigen = zeilen.filter((_, i) => i % Math.max(1, Math.round(zeilen.length / 8)) === 0);
  zeigen.forEach((z) => {
    console.log(`  ${z.x.toFixed(3).padStart(7)}  ${z.kern.toFixed(4).padStart(11)}`
      + `  ${z.stab.toFixed(4).padStart(13)}  ${(z.kern - z.stab).toFixed(4).padStart(9)}`
      + `  ${z.kernMz.toFixed(4).padStart(14)}  ${z.stabMz.toFixed(4).padStart(13)}`);
  });
  console.log(`  grösste Abweichung M_y: ${maxAbw.toFixed(4)} kNm`
    + ` = ${(rel * 100).toFixed(2)} % von ${maxMy.toFixed(3)} kNm`);
}

console.log('\n' + '='.repeat(100));
console.log(`GRÖSSTE RELATIVE ABWEICHUNG DES BIEGEMOMENTS: ${(schlimmstes * 100).toFixed(2)} %`
  + `  (${schlimmstesWo})`);
console.log('='.repeat(100));
