/**
 * kalibrieren_abfang.mjs
 * ---------------------------------------------------------------------------
 * DIE KALIBRIERUNG DES ABFANGJOCH-KERNS.
 *
 * Weisung vom 3. September, Reihenfolge: «bindeblechnachweis und dann
 * stückzahlen. und dann kalibirierung.»
 *
 * ======================= WAS HIER GEMESSEN WIRD ===========================
 *
 * Der Kern rechnet den liegenden Vierendeelträger als einfachen Balken und
 * rechnet auf die Gurte um: N = ± M / e. Dazu kommt die ÖRTLICHE Biegung
 * jedes Gurtes zwischen zwei Bindeblechen — und genau die ist der offene
 * Kennwert.
 *
 * `ABFANG_GURT_DAEMPFUNG` steht auf **1.0**: der volle Anteil, also die
 * sichere Seite. Beim Tragjoch mindert `GURT_DAEMPFUNG` = 0.45 denselben
 * Anteil, gemessen an 80 PyNite-Läufen — dieser Wert gilt aber für VIER
 * Winkelgurte mit zwei Blechebenen und ist auf zwei Walzprofile nicht
 * übertragbar.
 *
 * Hier wird er für das Abfangjoch gemessen: derselbe Träger einmal im Kern
 * und einmal in PyNite, und das Verhältnis der örtlichen Momente ist die
 * Dämpfung.
 *
 * ======================= DAS MODELL ========================================
 *
 * Der Träger LIEGT, also liegt auch das Modell:
 *
 *      x   Trägerachse, quer zum Gleis
 *      y   in Gleisrichtung — hier stehen die Gurte nebeneinander (± e/2)
 *      z   senkrecht
 *
 * Die Rahmenebene ist damit die xy-Ebene, und der Leiterzug wirkt in y —
 * er biegt den Träger in seiner Rahmenebene. Das Eigengewicht wirkt in z,
 * quer dazu; dort trägt jeder Gurt für sich (Weisung), was im Rahmenmodell
 * ohnehin herauskommt, weil die Bindebleche in dieser Richtung nur
 * Torsionsstäbe wären.
 *
 * >>> DIE BINDEBLECHE SIND EIN RIEGEL, NICHT ZWEI. <<<
 *
 * An jeder Station sitzt eines oben und eines unten. In der Rahmenebene
 * wirken beide gleich; im ebenen Modell werden sie zu EINEM Riegel mit der
 * doppelten Steifigkeit zusammengefasst. Sie einzeln zu führen hiesse, ein
 * räumliches Modell zu bauen, dessen dritte Richtung nichts trägt.
 *
 * ======================= WAS NICHT GEMESSEN WIRD ==========================
 *
 * DIE KNICKLÄNGE DES DRUCKGURTS. Weisung: «die knicklänge hinten anstellen
 * und mit axis kalibrieren. die 500mm sind zu unkonservativ da sich der
 * gesamte träger biegt in der horizontal und vertikal ebene.» Das ist eine
 * Stabilitätsfrage über den ganzen Träger; PyNite rechnet hier linear und
 * kann sie nicht beantworten. Sie bleibt AxisVM vorbehalten.
 *
 *   node kalibrieren_abfang.mjs           alle Typen, gefuehrte Laengen
 *   node kalibrieren_abfang.mjs A160      nur ein Typ
 * ---------------------------------------------------------------------------
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const J = (n) => new URL(`./js/${n}`, import.meta.url).href;
const PYTHON = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');

const AJ = await import(J('data.abfangjoche.js'));
AJ.setzeAbfangDB(JSON.parse(
  readFileSync(join(HIER, 'data', 'abfangjoche.json'), 'utf8')));
const AK = await import(J('core.abfangjoch.js'));

const E = 21000;      // kN/cm², Stahl
const G = 8100;       // kN/cm²

/**
 * Das PyNite-Skript für einen liegenden Vierendeelträger.
 *
 * >>> GERECHNET WIRD IN cm UND kN. <<<
 *
 * Der Kern führt cm für Querschnitte und m für Längen; PyNite braucht ein
 * einziges System. Genommen wird cm — dann sind E und die Trägheitsmomente
 * unverändert die des Profilkatalogs, und nur die Längen werden umgerechnet.
 * Ein Vorzeichenfehler bei E ist teurer als hundert Multiplikationen.
 */
function skript(q, stationen, L, F) {
  const e = q.e;                       // cm
  const zeilen = [];
  const x = [0, ...stationen.map((s) => s * 100), L * 100];   // m -> cm
  // Doppelte Stationen am Rand vermeiden, falls ein Blech aufs Auflager faellt
  const xs = [...new Set(x.map((v) => Math.round(v * 1e6) / 1e6))]
    .sort((a, b) => a - b);

  zeilen.push('M = FEModel3D()');
  zeilen.push(`M.add_material('ST', ${E}, ${G}, 0.3, 7.85e-5)`);
  /*
   * PyNite 3 FUEHRT BENANNTE QUERSCHNITTE.
   *
   * `add_member(..., A, Iy, Iz, J)` mit blossen Zahlen gab es in Version 0;
   * seit 1.0 heisst es `add_section(name, A, Iy, Iz, J)` und der Stab nennt
   * den Namen. Der erste Lauf brach mit «No section names '911'» ab - die
   * 911 war das Traegheitsmoment.
   */
  zeilen.push(`M.add_section('GURT', ${q.gurt.A}, ${q.gurt.Iy}, `
    + `${q.gurt.Iz}, ${q.gurt.It})`);
  // Zwei Gurte: V (vorne, +e/2) und H (hinten, -e/2).
  xs.forEach((v, i) => {
    zeilen.push(`M.add_node('V${i}', ${v}, ${e / 2}, 0)`);
    zeilen.push(`M.add_node('H${i}', ${v}, ${-e / 2}, 0)`);
  });
  /*
   * DIE GURTE. In der Rahmenebene (xy) biegt der Gurt um seine SCHWACHE
   * Achse - Iz -, quer dazu um die starke. PyNite nimmt Iy fuer die Biegung
   * um die lokale y-Achse; bei waagrechter Rahmenebene ist das die
   * senkrechte Biegung. Die Zuordnung steht hier ausgeschrieben, weil sie
   * die haeufigste Fehlerquelle des ganzen Modells ist.
   */
  for (let i = 0; i < xs.length - 1; i++) {
    for (const g of ['V', 'H']) {
      zeilen.push(
        `M.add_member('${g}${i}', '${g}${i}', '${g}${i + 1}', 'ST', 'GURT')`);
    }
  }
  /*
   * DIE BINDEBLECHE - ein Riegel je Station, mit der Steifigkeit BEIDER
   * Bleche. Sein Traegheitsmoment in der Rahmenebene ist I = t*b^3/12 je
   * Blech; zwei davon geben das Doppelte.
   */
  const bl = q.blech;
  const Ibl = 2 * ((bl.t * bl.b ** 3) / 12);
  const Abl = 2 * (bl.b * bl.t);
  const Jbl = 2 * ((bl.b * bl.t ** 3) / 3);
  zeilen.push(`M.add_section('BLECH', ${Abl}, ${Ibl}, ${Ibl}, ${Jbl})`);
  stationen.forEach((s, k) => {
    const i = xs.indexOf(Math.round(s * 100 * 1e6) / 1e6);
    if (i < 0) return;
    zeilen.push(`M.add_member('B${k}', 'H${i}', 'V${i}', 'ST', 'BLECH')`);
  });
  /*
   * >>> DIE ENDEN SIND GEKOPPELT - SONST TRAEGT DER RAHMEN DORT NICHTS. <<<
   *
   * Erster Lauf: die Durchbiegung war 3- bis 19-fach zu gross. Ursache war
   * dieses Modell, nicht der Kern. Bei A160 / 5.5 m liegen die fuenf Bleche
   * zwischen 1.88 und 3.88 m; von 0 bis 1.88 standen die beiden Gurte
   * UNVERBUNDEN nebeneinander, jeder fuer sich, und bogen sich entsprechend.
   *
   * In Wirklichkeit laufen sie an den Enden zusammen - Spreizung 280 statt
   * d im Feld - und sind dort durch das ENDBLECH und die GABEL bzw. das
   * Deckblech gekoppelt. Der Anschluss ans Mastende ist steif.
   *
   * Genommen wird dafuer das Endblech; es ist das schwaechste der dortigen
   * Teile, also die sichere Seite. Die Gabel zusaetzlich anzusetzen hiesse,
   * eine Steifigkeit zu behaupten, die erst zu vermessen waere.
   */
  const be = q.endblech ?? q.blech;
  const Ie = 2 * ((be.t * be.b ** 3) / 12);
  const Ae = 2 * (be.b * be.t);
  const Je = 2 * ((be.b * be.t ** 3) / 3);
  zeilen.push(`M.add_section('ENDE', ${Ae}, ${Ie}, ${Ie}, ${Je})`);
  zeilen.push(`M.add_member('BE0', 'H0', 'V0', 'ST', 'ENDE')`);
  zeilen.push(`M.add_member('BE1', 'H${xs.length - 1}', 'V${xs.length - 1}', 'ST', 'ENDE')`);
  /*
   * DIE AUFLAGER. Weisung: «die Auflager so modelieren, dass die drehachse
   * (global) um y und z frei ist.» Also DX/DY/DZ gehalten am einen Ende,
   * das andere in x frei (kein Zwang), Drehung um x gehalten - das haelt die
   * Torsion, laesst aber beide Biegungen gelenkig.
   */
  const n = xs.length - 1;
  zeilen.push(`M.def_support('V0', True, True, True, True, False, False)`);
  zeilen.push(`M.def_support('H0', True, True, True, True, False, False)`);
  zeilen.push(`M.def_support('V${n}', False, True, True, True, False, False)`);
  zeilen.push(`M.def_support('H${n}', False, True, True, True, False, False)`);
  /*
   * DIE LAST: Leiterzug in der Rahmenebene, in Trägermitte, auf beide Gurte
   * gleich verteilt - «in der Trägermittelebene» (Weisung). Eine Einzellast
   * ist der schaerfste Fall fuer die oertliche Biegung und damit der
   * richtige Messfall.
   */
  const mitte = Math.round((xs.length - 1) / 2);
  zeilen.push(`M.add_node_load('V${mitte}', 'FY', ${F / 2})`);
  zeilen.push(`M.add_node_load('H${mitte}', 'FY', ${F / 2})`);
  zeilen.push("M.analyze(check_statics=False)");
  /*
   * AUSGELESEN WIRD DAS OERTLICHE MOMENT IM GURT - das Moment um die
   * senkrechte Achse (Mz in lokalen Koordinaten), am Anschnitt der Bleche.
   * Es ist der Anteil, den der Kern mit `ABFANG_GURT_DAEMPFUNG` mindert.
   */
  /*
   * >>> ERST DAS MODELL PRUEFEN, DANN DEN KENNWERT MESSEN. <<<
   *
   * Der erste Lauf gab eine «Daempfung» von 6.5 und eine Gurtkraft, die um
   * ±20 Prozent schwankte statt bei 1.0 zu liegen. Beides deutet auf einen
   * Modellfehler, nicht auf einen Kennwert - und ein Kennwert aus einem
   * ungeprueften Modell ist schlimmer als gar keiner.
   *
   * Die Gegenprobe ist die DURCHBIEGUNG: ein einfacher Balken mit
   * Einzellast in der Mitte biegt sich um F*L^3/(48*E*I). Trifft das FEM
   * diese Zahl, traegt das Modell global richtig, und eine Abweichung in
   * den Momenten ist echt. Trifft es sie nicht, ist alles Weitere wertlos.
   */
  zeilen.push('import json');
  zeilen.push('erg = {"Moertl": 0.0, "N": 0.0, "fMitte": 0.0}');
  zeilen.push(`erg["fMitte"] = abs(M.nodes['V${mitte}'].DY['Combo 1'])`);
  zeilen.push(`for i in range(${xs.length - 1}):`);
  zeilen.push('    for g in ("V", "H"):');
  zeilen.push('        mb = M.members[g + str(i)]');
  zeilen.push('        mm = max(abs(mb.max_moment("Mz")), abs(mb.min_moment("Mz")))');
  zeilen.push('        if mm > erg["Moertl"]: erg["Moertl"] = mm');
  zeilen.push('        ax = max(abs(mb.max_axial()), abs(mb.min_axial()))');
  zeilen.push('        if ax > erg["N"]: erg["N"] = ax');
  zeilen.push('print("ERG " + json.dumps(erg))');

  return `try:
    from Pynite import FEModel3D
except ImportError:
    from PyNite import FEModel3D
${zeilen.join('\n')}
`;
}

/** Einen Lauf durchführen und die Zahlen zurückgeben. */
function lauf(typ, jt, F) {
  const q = AK.abfangQuerschnitt(typ);
  const ein = AK.abfangBlechstationen(typ, jt);
  if (!ein) return null;
  const sw = AK.abfangStuetzweite(typ, jt);
  const L = sw ? sw.bis : jt;
  const blAlle = AJ.abfangBindeblech(typ);
  const bl = blAlle.regel;
  q.blech = { b: bl.b / 10, t: bl.t / 10 };
  // Das Endblech: bei mehreren das schwaechste - die sichere Seite.
  const enden = [blAlle.endeL, ...(Array.isArray(blAlle.endeR) ? blAlle.endeR
    : blAlle.endeR ? [blAlle.endeR] : [])].filter(Boolean);
  const schwach = enden.length
    ? enden.reduce((m, c) => (c.t * c.b * c.b < m.t * m.b * m.b ? c : m)) : bl;
  q.endblech = { b: schwach.b / 10, t: schwach.t / 10 };

  // Nur Stationen innerhalb der Stuetzweite - was ausserhalb liegt, haengt
  // am Kragarm und gehoert nicht in diese Messung.
  const st = ein.stationen.filter((s) => s > 0.01 && s < L - 0.01);
  if (st.length < 2) return null;

  const ordner = join(HIER, '.kalib_abfang');
  if (!existsSync(ordner)) mkdirSync(ordner, { recursive: true });
  writeFileSync(join(ordner, 'lauf.py'), skript(q, st, L, F));
  let aus;
  try {
    aus = execFileSync(PYTHON, ['lauf.py'], {
      cwd: ordner, encoding: 'utf8', timeout: 300000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
  } catch (e) {
    return { fehler: (e.stderr || e.message || '').split('\n').slice(-4).join(' ') };
  }
  const z = aus.split('\n').find((l) => l.startsWith('ERG '));
  if (!z) return { fehler: 'keine Ergebniszeile' };
  const fem = JSON.parse(z.slice(4));

  /*
   * DER KERN, MIT DENSELBEN GROESSEN. Einfacher Balken, Einzellast in der
   * Mitte: M = F*L/4, V = F/2. Daraus die Gurtkraft und das oertliche
   * Moment nach dem Rechenweg des Kerns.
   */
  const Mrahmen = (F * L) / 4;
  const Vrahmen = F / 2;
  const a = ein.teilung;
  const kern = AK.abfangGurtnachweis(q, { Mrahmen, Mvert: 0, Vrahmen }, a, 21.8);
  // kNcm -> kNm fuer den Vergleich mit dem Kern
  const femMoertl = fem.Moertl / 100;

  /*
   * DIE ERWARTETE DURCHBIEGUNG - einfacher Balken, Einzellast in der Mitte,
   * mit dem Traegheitsmoment des GESAMTQUERSCHNITTS in der Rahmenebene.
   * Der Vierendeel ist weicher als der Vollquerschnitt (die Riegel geben
   * nach), also darf das FEM etwas mehr zeigen - aber nicht ein Vielfaches.
   */
  const fBalken = (F * (L * 100) ** 3) / (48 * E * q.Irahmen);   // cm

  return {
    typ, jt, L, F, bleche: st.length,
    fMitte: fem.fMitte, fBalken,
    weicher: fBalken > 1e-9 ? fem.fMitte / fBalken : null,
    N_kern: kern.N, N_fem: fem.N,
    Moertl_kern: kern.Moertl, Moertl_fem: femMoertl,
    // DAS IST DER GESUCHTE KENNWERT.
    daempfung: kern.Moertl > 1e-9 ? femMoertl / kern.Moertl : null,
  };
}

// --- Durchlauf --------------------------------------------------------------
const nurTyp = process.argv[2];
const typen = AJ.abfangjoche()
  .filter((t) => t.bauweise === 'neu' && (!nurTyp || t.typ === nurTyp));

console.log('='.repeat(96));
console.log('KALIBRIERUNG ABFANGJOCH - oertliche Gurtbiegung gegen PyNite');
console.log('='.repeat(96));
console.log('Typ     jt[m]  L[m]  Bl   N Kern    N FEM    M_oe Kern  M_oe FEM   Daempfung  f/fBalken');

const werte = [];
for (const t of typen) {
  // Drei Laengen je Typ: kurz, mittel, lang - mehr braucht es nicht, um zu
  // sehen, ob der Kennwert von der Laenge abhaengt.
  const alle = t.laengen.filter((z) => AK.abfangRechenbar(t.typ, z.jt));
  const wahl = [alle[0], alle[Math.floor(alle.length / 2)], alle.at(-1)]
    .filter(Boolean);
  for (const z of wahl) {
    const r = lauf(t.typ, z.jt, 20);
    if (!r) continue;
    if (r.fehler) { console.log(`${t.typ}  ${z.jt}  FEHLER: ${r.fehler}`); continue; }
    werte.push(r);
    console.log(
      `${r.typ.padEnd(7)}${r.jt.toFixed(2).padStart(5)}${r.L.toFixed(2).padStart(6)}`
      + `${String(r.bleche).padStart(4)}`
      + `${r.N_kern.toFixed(1).padStart(9)}${r.N_fem.toFixed(1).padStart(9)}`
      + `${r.Moertl_kern.toFixed(3).padStart(11)}${r.Moertl_fem.toFixed(3).padStart(10)}`
      + `${(r.daempfung ?? 0).toFixed(3).padStart(11)}`
      + `${(r.weicher ?? 0).toFixed(2).padStart(9)}`);
  }
}

if (werte.length) {
  const d = werte.map((w) => w.daempfung).filter((x) => Number.isFinite(x));
  const mittel = d.reduce((a, b) => a + b, 0) / d.length;
  console.log('-'.repeat(96));
  console.log(`Daempfung: ${d.length} Messwerte, Mittel ${mittel.toFixed(3)}, `
    + `Spanne ${Math.min(...d).toFixed(3)} bis ${Math.max(...d).toFixed(3)}`);
  /*
   * DIE GURTKRAFT IST DIE GEGENPROBE. Sie folgt aus N = M/e und haengt an
   * keinem Kennwert - weicht sie ab, stimmt das Modell nicht, und die
   * gemessene Daempfung waere wertlos.
   */
  const nAbw = werte.map((w) => w.N_fem / w.N_kern);
  /*
   * DIE WEICHHEIT SAGT, OB DAS MODELL TRAEGT. Ein Vierendeel ist weicher
   * als der Vollquerschnitt - Faktor 1.1 bis vielleicht 2 waere normal.
   * Zehn waere ein Modellfehler.
   */
  const wf = werte.map((w) => w.weicher).filter((x) => Number.isFinite(x));
  console.log(`Durchbiegung FEM/Balken: Mittel ${
    (wf.reduce((a, b) => a + b, 0) / wf.length).toFixed(2)}, `
    + `Spanne ${Math.min(...wf).toFixed(2)} bis ${Math.max(...wf).toFixed(2)}`);
  console.log(`Gurtkraft FEM/Kern: Mittel ${
    (nAbw.reduce((a, b) => a + b, 0) / nAbw.length).toFixed(3)}, `
    + `Spanne ${Math.min(...nAbw).toFixed(3)} bis ${Math.max(...nAbw).toFixed(3)}`);
  writeFileSync(join(HIER, 'kalibrierung_abfang.json'),
                JSON.stringify(werte, null, 1));
  console.log('geschrieben: kalibrierung_abfang.json');
}
