/**
 * vergleich_stabwerk.mjs
 * ---------------------------------------------------------------------------
 * DER EIGENE STABWERKSLOESER GEGEN PyNite.
 *
 * Weisung vom 24. September, auf die Frage nach dem Stand der FEM-Anbindung:
 * «1 zuerst» - also der Loeser gegen PyNite, bevor der Rueckleseweg mit
 * AxisVM gefahren wird.
 *
 * >>> WARUM DAS UEBERHAUPT NOETIG IST. <<<
 *
 * `core.stabwerk.js` steht seit dem 20. September im Projekt und ist gegen
 * ZWANZIG GESCHLOSSENE LOESUNGEN geprueft (Kragarm, Rahmen, Drehfeder,
 * Link - Abweichung 1e-14). Das beweist, dass er die Elementmatrizen und die
 * Zerlegung beherrscht. Es beweist NICHT, dass er ein Bauwerk mit 973
 * Staeben, 483 Starrelementen und einer Steifigkeitsspanne von 1e15 richtig
 * rechnet - genau dort entscheidet sich, ob er einen Nachweis tragen darf.
 *
 * Dafuer braucht es ein zweites, unabhaengiges Programm am GLEICHEN Modell.
 *
 * >>> DAS GLEICHE MODELL - UND ZWAR WORTWOERTLICH. <<<
 *
 * Beide Wege bauen auf `stabmodell()` in export.axisvm.js auf: der Loeser
 * ueber `stabmodellJson`, PyNite ueber `pyniteSkript`. Hier bekommen BEIDE
 * denselben `bau` gereicht (`opt.bau`), damit kein zweiter Modellbauer
 * dazwischenkommt. Waere das Modell auch nur in einem Knoten verschieden,
 * verglichen wir zwei Bauwerke statt zweier Loeser.
 *
 * >>> VERGLICHEN WIRD, WAS GELOEST WIRD. <<<
 *
 * Zuerst die KNOTENVERSCHIEBUNGEN. Sie sind die Unbekannte des
 * Gleichungssystems; die Stabkraefte entstehen erst daraus. Eine Abweichung
 * in u heisst «anderes Gleichungssystem», eine allein in den Kraeften
 * «andere Auswertung» - zwei verschiedene Befunde, die man nicht
 * durcheinanderbringen darf.
 *
 * Danach die AUFLAGERREAKTIONEN: sie schliessen das Gleichgewicht.
 *
 * Aufruf:
 *   node vergleich_stabwerk.mjs              J90/20 m, alle Lastfaelle
 *   node vergleich_stabwerk.mjs --neu        PyNite neu rechnen lassen
 *   node vergleich_stabwerk.mjs --typ J70 --L 15
 * ---------------------------------------------------------------------------
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const J = (f) => `file:///${join(HIER, 'js', f).replace(/\\/g, '/')}`;
const ARBEIT = join(HIER, '.vergleich_stabwerk');
const PYTHON = process.env.PYTHON
  ?? 'C:/Users/ivan_/AppData/Local/Programs/Python/Python312/python.exe';

/* --- Daten laden ---------------------------------------------------------- */
const NO = await import(J('data.normen.js'));
NO.setzeNormen(JSON.parse(readFileSync(join(HIER, 'data', 'normen.json'), 'utf8')));
const MA = await import(J('data.masten.js'));
try {
  MA.setzeMastenDB(JSON.parse(readFileSync(join(HIER, 'data', 'masten.json'), 'utf8')));
} catch { /* ohne Masten-Sortiment weiter */ }
const T = await import(J('data.tragjoche.js'));
T.setzeDatenbank(JSON.parse(readFileSync(join(HIER, 'data', 'tragjoche.json'), 'utf8')));
const AB = await import(J('data.anbauteile.js'));
try {
  AB.setzeAnbauteilDB(JSON.parse(readFileSync(join(HIER, 'data', 'anbauteile.json'), 'utf8')));
} catch { /* ohne Vorlagen weiter */ }
const FL = await import(J('data.fl.js'));
try {
  FL.setzeFlDB(JSON.parse(readFileSync(join(HIER, 'data', 'fl_bauteile.json'), 'utf8')));
} catch { /* ohne Leitertabelle weiter */ }

const S = await import(J('ui.schema.js'));
const V = await import(J('core.vierendeel.js'));
const N = await import(J('core.nachbarn.js'));
const AX = await import(J('export.axisvm.js'));
const PY = await import(J('export.pynite.js'));
const SW = await import(J('core.stabwerk.js'));

/* --- Aufruf --------------------------------------------------------------- */
const arg = (name, std) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : std;
};
const NEU = process.argv.includes('--neu');
const TYP = arg('typ', 'J90');
const LAENGE = Number(arg('L', 20));

/* --- Das Modell ----------------------------------------------------------- */
let w = S.typUebernehmen({ ...S.standardwerte(), typ: TYP }, T.getTragjoch(TYP));
w.L = LAENGE; w.xLage = 0; w.mastVorhanden = true;
const satz = N.rechensatzMitNachbarn(w);
const erg = V.berechne(satz, ...N.kernArgumente(satz));
const m = erg.modell;

/*
 * >>> EIN BAU FUER BEIDE. <<<
 * Ohne das baute jeder Weg sein eigenes Modell - und ein Unterschied in den
 * Ergebnissen sagte dann nichts ueber die Loeser aus.
 */
const bau = AX.stabmodell(m, { knotenmodell: 'anschnitt' });

/* ===========================================================================
 * >>> UND DIESELBE LASTLISTE - SONST VERGLEICHT MAN ZWEI BAUWERKE. <<<
 * =========================================================================
 *
 * Die AxisVM-Ausleitung schreibt das EIGENGEWICHT NICHT als Last: AxisVM
 * erzeugt es selbst aus Wichte und Querschnitt, und die Ausleitung gibt
 * ihm nur den Zuschlag (`gZusatz`, siehe export.axisvm.js). PyNite kann
 * das nicht, deshalb setzt sein Export `eigengewicht: true` und bekommt
 * die volle Laufmeterlast der Sortimentstabelle.
 *
 * Der eigene Loeser liest die AxisVM-Datei - und rechnete damit im
 * Lastfall G mit NULL Last. Beim ersten Lauf stand deshalb ueberall
 * u = 0, waehrend PyNite -4.4e-4 m auswies.
 *
 * >>> DAS IST EIN BEFUND UEBER DIE DATEI, NICHT UEBER DEN LOESER. <<<
 *
 * Fuer diesen Vergleich bekommen beide die Liste MIT Eigengewicht - dann
 * wird gemessen, was gemessen werden soll: zwei Loeser am selben
 * Bauwerk. Dass der Loeser das Eigengewicht spaeter selbst beisteuern
 * muss (wie AxisVM es tut), steht als offener Punkt in CLAUDE.md.
 * ========================================================================= */
bau.lasten = AX.lasten(m, bau, { eigengewicht: true, gTrennen: true });
const dat = AX.stabmodellJson(m, { bau, knotenmodell: 'anschnitt' });

console.log('='.repeat(96));
console.log(`STABWERKSLOESER GEGEN PyNite  ·  ${TYP} / ${LAENGE.toFixed(2)} m`);
console.log('='.repeat(96));
console.log(`Modell: ${dat.knoten.length} Knoten · ${dat.staebe.length} Stäbe`
  + ` · ${dat.staebe.filter((s) => s.art === 'starr').length} starr`
  + ` · ${dat.staebe.filter((s) => s.art === 'link').length} Links`
  + ` · ${dat.lastfaelle?.length ?? 0} Lastfälle`);

/* --- 1 · Der eigene Loeser ------------------------------------------------ */
const t0 = Date.now();
/*
 * >>> OHNE EIGENES EIGENGEWICHT - DIE LASTLISTE HAT ES SCHON. <<<
 *
 * Oben steht `eigengewicht: true` an der Lastliste, und zwar in der
 * Form, die PyNite kennt: die Laufmeterlast des Jochs auf die vier
 * Gurte. Setzte der Loeser sein eigenes dazu, stuende es doppelt da -
 * beim ersten Anlauf war genau das der Fall, und die Abweichung im
 * Lastfall G wuchs von 1.5 auf 3.0.
 *
 * >>> UND ES WAERE OHNEHIN EIN ANDERES. <<<
 *
 * Der Loeser wiegt JEDEN echten Stab (wie AxisVM), PyNite nur die
 * Jochgurte - den Masten gibt es gar keins. Am J90/8 m sind das 18.77
 * gegen 4.71 kN. Verglichen werden sollen hier die LOESER, nicht zwei
 * Auffassungen davon, was mitwiegt.
 */
const lsg = SW.loese(dat, { eigengewicht: false });
{
  // Zur Einordnung: was der Loeser beisteuern WUERDE, liesse man ihn.
  const mitEigen = SW.loese(dat, { eigengewicht: true });
  console.log('Eigengewicht: aus der Lastliste (PyNite-Form, nur das Joch).'
    + ` Der Löser selbst würde ${mitEigen.eigengewicht.toFixed(2)} kN über`
    + ` ${mitEigen.eigenLasten} Stäbe ansetzen — mit den Masten.`);
}
const tEigen = Date.now() - t0;
console.log(`\nEigener Löser: ${lsg.n} Freiheitsgrade, Bandbreite ${lsg.bw},`
  + ` ${tEigen} ms für ${lsg.faelle.length} Lastfälle`);

/* --- 2 · PyNite ----------------------------------------------------------- */
mkdirSync(ARBEIT, { recursive: true });
const skript = PY.pyniteSkript(m, { bau, knotenmodell: 'anschnitt' });
const knotenDatei = join(ARBEIT, 'pynite_knoten.csv');

/* ===========================================================================
 * >>> GEHOERT DAS LIEGENGEBLIEBENE ERGEBNIS UEBERHAUPT ZU DIESEM MODELL? <<<
 * =========================================================================
 *
 * PyNite braucht fuer dieses Bauwerk Minuten, deshalb wird sein Ergebnis
 * aufgehoben. Das ist bequem und war eine Falle: am 24. September stand
 * hier das Ergebnis eines J90/8 m, gerechnet wurde ein J90/20 m - und
 * weil BEIDE Joche dieselben Knotennamen tragen (BV_R_12_v2, MAST_B_KOPF
 * ...), fand der Vergleich zu jedem Namen einen Partner und meldete
 * Abweichungen bis Faktor 39. Nicht ein Loeser war falsch, sondern die
 * Gegenprobe.
 *
 * >>> EIN VERGLEICH, DER SEIN EIGENES MODELL NICHT KENNT, MISST NICHTS.
 *
 * Also steht neben den Ergebnissen jetzt, WORAUS sie stammen. Stimmt es
 * nicht ueberein, wird neu gerechnet - ohne Frage und ohne Schalter.
 * ========================================================================= */
const kennDatei = join(ARBEIT, 'modell.json');
/*
 * >>> UND DAS SKRIPT SELBST GEHOERT IN DIE KENNUNG. <<<
 *
 * Der erste Anlauf dieser Wache fragte nur nach dem MODELL (Typ, Laenge,
 * Knoten, Staebe). Das reichte nicht: als am 24. September der Export
 * berichtigt wurde, blieben Knotenzahl und Staebe gleich - und der
 * Vergleich nahm klaglos das Ergebnis des alten Exports. Er zeigte die
 * alten Zahlen und sah dabei aus, als haette sich nichts gebessert.
 *
 * Also zaehlt, was PyNite wirklich vorgesetzt bekommt: der Text.
 */
const pruefsumme = (t) => {
  let h = 5381;
  for (let i = 0; i < t.length; i += 1) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
  return h.toString(16);
};
const kennung = JSON.stringify({
  typ: TYP, L: LAENGE,
  knoten: dat.knoten.length, staebe: dat.staebe.length,
  lastfaelle: (dat.lastfaelle ?? []).map((l) => l.key).join(','),
  skript: pruefsumme(skript.text),
});
let alteKennung = null;
try { alteKennung = readFileSync(kennDatei, 'utf8'); } catch { /* keine */ }
const passt = alteKennung === kennung;
if (!NEU && existsSync(knotenDatei) && !passt) {
  console.log('Das liegende PyNite-Ergebnis gehoert zu einem anderen Modell'
    + ` (${alteKennung ?? 'ohne Kennung'}) — es wird neu gerechnet.`);
}

if (NEU || !existsSync(knotenDatei) || !passt) {
  writeFileSync(join(ARBEIT, 'lauf.py'), skript.text);
  console.log('PyNite rechnet … (das dauert bei diesem Modell eine Weile)');
  const tp = Date.now();
  try {
    execFileSync(PYTHON, ['lauf.py'], {
      cwd: ARBEIT, stdio: ['ignore', 'inherit', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    console.error('\nPyNite ist gescheitert:');
    console.error(String(e.stderr ?? e.message).slice(-4000));
    process.exit(1);
  }
  console.log(`PyNite: ${((Date.now() - tp) / 1000).toFixed(1)} s`);
  // Erst NACH dem geglueckten Lauf - sonst gilt ein Abbruch als gerechnet.
  writeFileSync(kennDatei, kennung);
} else {
  console.log('PyNite: vorhandenes Ergebnis benutzt (--neu erzwingt neu)');
}

const csv = (pfad) => {
  const z = readFileSync(pfad, 'utf8').trim().split(/\r?\n/);
  const kopf = z.shift().split(';');
  return z.map((zeile) => {
    const t = zeile.split(';');
    const o = {};
    kopf.forEach((k, i) => { const v = Number(t[i]); o[k] = Number.isFinite(v) ? v : t[i]; });
    return o;
  });
};

/* --- 3 · Gegenüberstellung ------------------------------------------------ */
/*
 * DER MASSSTAB IST RELATIV, NICHT ABSOLUT.
 *
 * Eine Verschiebung von 1e-9 m auf 1e-12 genau zu fordern misst die
 * Rechengenauigkeit, nicht die Uebereinstimmung. Verglichen wird deshalb
 * gegen den GROESSTEN Wert des Lastfalls: was dort um 1e-4 abweicht, weicht
 * um ein Zehntausendstel des Bauwerks ab.
 */
const knPy = csv(knotenDatei);
const aufPy = existsSync(join(ARBEIT, 'pynite_auflager.csv'))
  ? csv(join(ARBEIT, 'pynite_auflager.csv')) : [];

/* ===========================================================================
 * >>> PyNite STEHT AUF ANDEREN ACHSEN - UND DAS IST ABSICHT. <<<
 * =========================================================================
 *
 * Das erzeugte Skript setzt die Knoten so:
 *
 *     M.add_node(name, x, z, y)
 *
 * PyNites Y ist die VERTIKALE (sein Statics Check weist das Eigengewicht
 * als Sum FY aus), im Werkzeug ist es z. Also:
 *
 *     PyNite X  <-  Werkzeug x        PyNite DX  <-  ux
 *     PyNite Y  <-  Werkzeug z        PyNite DY  <-  uz
 *     PyNite Z  <-  Werkzeug y        PyNite DZ  <-  uy
 *
 * >>> UND DIE DREHUNGEN KEHREN IHR VORZEICHEN UM. <<<
 *
 * Zwei Achsen zu vertauschen ist eine SPIEGELUNG, keine Drehung: die
 * Determinante der Abbildung ist -1. Verschiebungen sind gewoehnliche
 * Vektoren und wandern unveraendert mit; Verdrehungen und Momente sind
 * Pseudovektoren und wechseln dabei das Vorzeichen.
 *
 * Der erste Anlauf dieses Werkzeugs verglich stur DX gegen ux, DY gegen
 * uy - und meldete relative Abweichungen von 1.0 bis 7.0. Das sah nach
 * einem kaputten Loeser aus und war ein kaputter Vergleich. Die Zahlen
 * hatten es gesagt: genau 1.00 heisst «einer von beiden ist hier null»,
 * genau 2.00 heisst «dasselbe mit umgekehrtem Vorzeichen».
 * ========================================================================= */
/* ===========================================================================
 * >>> EIN WEG UND EINE VERDREHUNG SIND NICHT DASSELBE MASS. <<<
 * =========================================================================
 *
 * Hier standen alle sechs Freiheitsgrade in EINER Reihe, und die groesste
 * Abweichung wurde am groessten Wert des Lastfalls gemessen - gleich ob
 * der ein Weg in Metern oder eine Verdrehung im Bogenmass war.
 *
 * Das ist kein Massstab, sondern ein Zufall: am 24. September meldete der
 * Lastfall G eine Abweichung von 1.29 an `OGL_8.000.fix`, einer
 * VERDREHUNG - bezogen auf die groesste VERSCHIEBUNG des Lastfalls. Die
 * Zahl sagt weder ueber das eine noch ueber das andere etwas.
 *
 * Also zwei Reihen, jede mit ihrem eigenen Bezug.
 * ========================================================================= */
const WEGE = [['DX', 'ux', 0, +1], ['DY', 'uz', 2, +1], ['DZ', 'uy', 1, +1]];
// Die Verdrehungen wechseln das Vorzeichen: die Abbildung ist eine
// Spiegelung, und Verdrehungen sind Pseudovektoren (siehe oben).
const DREH = [['RX', 'fix', 3, -1], ['RY', 'fiz', 5, -1], ['RZ', 'fiy', 4, -1]];

const zeile = (t) => console.log(t);
const faelle = [...new Set(knPy.map((r) => r.Lastfall))];
let schlimmsteRel = 0; let schlimmsteWo = '';

const reihe = (ueberschrift, felder, einheit) => {
  zeile('\n' + '-'.repeat(96));
  zeile(ueberschrift);
  zeile('-'.repeat(96));
  zeile(`Lastfall                        max PyNite ${einheit.padEnd(5)}`
    + '  grösste Abw.    relativ     wo');
  for (const fall of faelle) {
    if (!lsg.u.has(fall)) { zeile(`${fall.padEnd(30)}  — im eigenen Löser nicht vorhanden`); continue; }
    const uv = lsg.u.get(fall);
    let maxPy = 0, maxAbw = 0, wo = '';
    for (const r of knPy) {
      if (r.Lastfall !== fall) continue;
      const i = lsg.knotenIdx.get(r.Knoten);
      if (i === undefined) continue;
      for (const [py, ei, d6, vz] of felder) {
        const a = Number(r[py]);
        const b = uv[i * 6 + d6] * vz;
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        maxPy = Math.max(maxPy, Math.abs(a));
        const d = Math.abs(a - b);
        if (d > maxAbw) { maxAbw = d; wo = `${r.Knoten}.${ei}`; }
      }
    }
    const rel = maxPy > 0 ? maxAbw / maxPy : 0;
    if (rel > schlimmsteRel) { schlimmsteRel = rel; schlimmsteWo = `${fall} · ${wo}`; }
    zeile(`${fall.padEnd(30)}  ${maxPy.toExponential(3).padStart(13)}`
      + `  ${maxAbw.toExponential(3).padStart(13)}  ${rel.toExponential(2).padStart(10)}   ${wo}`);
  }
};

reihe('KNOTENWEGE  —  je Lastfall der grösste Unterschied', WEGE, '[m]');
reihe('KNOTENVERDREHUNGEN  —  je Lastfall der grösste Unterschied', DREH, '[rad]');

if (aufPy.length) {
  zeile('\n' + '-'.repeat(96));
  zeile('AUFLAGERREAKTIONEN  —  je Lastfall der grösste Unterschied');
  zeile('-'.repeat(96));
  zeile('Lastfall                        max |R| PyNite   grösste Abw.    relativ     wo');
  // Dieselbe Abbildung: Kraefte wie Verschiebungen, Momente gespiegelt.
  const RF = [['FX', 0, +1], ['FY', 2, +1], ['FZ', 1, +1],
              ['MX', 3, -1], ['MY', 5, -1], ['MZ', 4, -1]];
  for (const fall of faelle) {
    const ak = lsg.auflagerkraefte ? lsg.auflagerkraefte(fall) : null;
    if (!ak) continue;
    const karte = new Map();
    (Array.isArray(ak) ? ak : []).forEach((a) => karte.set(a.knoten, a));
    let maxPy = 0, maxAbw = 0, wo = '';
    for (const r of aufPy) {
      if (r.Lastfall !== fall) continue;
      const a = karte.get(r.Knoten);
      if (!a) continue;
      for (const [py, d6, vz] of RF) {
        const x = Number(r[py]);
        // Der Loeser gibt die Reaktionen unter den Namen der
        // Freiheitsgrade zurueck (ux ... fiz) - es sind Kraefte.
        const y = Number(a[['ux', 'uy', 'uz', 'fix', 'fiy', 'fiz'][d6]]) * vz;
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        maxPy = Math.max(maxPy, Math.abs(x));
        const dd = Math.abs(x - y);
        if (dd > maxAbw) { maxAbw = dd; wo = `${r.Knoten}.${py}`; }
      }
    }
    if (!maxPy) continue;
    const rel = maxAbw / maxPy;
    zeile(`${fall.padEnd(30)}  ${maxPy.toExponential(3).padStart(13)}`
      + `  ${maxAbw.toExponential(3).padStart(13)}  ${rel.toExponential(2).padStart(10)}   ${wo}`);
  }
}

/* ===========================================================================
 * >>> DIE GEGENPROBE: LIEGT ES AM LOESER ODER AM MODELL? <<<
 * =========================================================================
 *
 * Der Jochanschluss ist ein LINKELEMENT - so die stehende Vorgabe des
 * Auftraggebers: «gelenkige Anschluesse als Linkelemente». Es traegt
 * `kraftuebertragung: {z: Free, yy: Free, zz: Free}`, gibt also keine
 * Biegemomente weiter. Der Loeser setzt das um (Punkt-zu-Punkt-Feder).
 *
 * PyNite kennt keine solche Feder. Die Ausleitung schreibt den Link
 * deshalb als gewoehnlichen Stab mit dem Ersatzquerschnitt STARR - voll
 * biegesteif. Damit wirkt das Joch dort als RAHMENRIEGEL: am J90/8 m
 * nimmt es unter WindX ein Kraeftepaar von 0.835 kN auf, und 0.835 x 8 m
 * = 6.68 kNm ist auf die Stelle genau die Differenz der beiden
 * Fussmomente (2 x 3.34).
 *
 * >>> DAS IST KEIN RECHENFEHLER, SONDERN EIN ANDERES BAUWERK. <<<
 *
 * Um die LOESER zu vergleichen, bekommt der eigene hier einmal dasselbe
 * Modell, das PyNite vorgesetzt bekommt: Links als starre Staebe. Was
 * dann noch bleibt, geht wirklich auf sein Konto.
 * ========================================================================= */
{
  const starr = JSON.parse(JSON.stringify(dat));
  const links = starr.staebe.filter((x) => x.art === 'link');
  links.forEach((x) => { x.art = 'stab'; delete x.kraftuebertragung; });
  if (links.length && aufPy.length) {
    const l2 = SW.loese(starr, { eigengewicht: false });
    zeile('\n' + '-'.repeat(96));
    zeile(`GEGENPROBE — derselbe Löser mit ${links.length} STARREN Links`
      + ' (so sieht PyNite das Modell)');
    zeile('-'.repeat(96));
    const RF2 = [['FX', 'ux', +1], ['FY', 'uz', +1], ['FZ', 'uy', +1],
                 ['MX', 'fix', -1], ['MY', 'fiz', -1], ['MZ', 'fiy', -1]];
    for (const fall of faelle) {
      const ak = l2.auflagerkraefte ? l2.auflagerkraefte(fall) : null;
      if (!ak) continue;
      const karte = new Map(ak.map((a) => [a.knoten, a]));
      let maxPy = 0, maxAbw = 0, wo = '';
      for (const r of aufPy) {
        if (r.Lastfall !== fall) continue;
        const a = karte.get(r.Knoten);
        if (!a) continue;
        for (const [pk, lk, vz] of RF2) {
          const x = Number(r[pk]);
          const y = Number(a[lk]) * vz;
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
          maxPy = Math.max(maxPy, Math.abs(x));
          const d = Math.abs(x - y);
          if (d > maxAbw) { maxAbw = d; wo = `${r.Knoten}.${pk}`; }
        }
      }
      if (!maxPy) continue;
      zeile(`${fall.padEnd(30)}  Auflagerkräfte relativ`
        + ` ${(maxAbw / maxPy).toExponential(2).padStart(10)}   ${wo}`);
    }
  }
}

zeile('\n' + '='.repeat(96));
zeile(`GRÖSSTE RELATIVE ABWEICHUNG (Wege und Verdrehungen): ${schlimmsteRel.toExponential(3)}`
  + `  (${schlimmsteWo})`);
zeile('='.repeat(96));
