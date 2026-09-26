/* ===========================================================================
 * vergleich_starrheit.mjs
 * ---------------------------------------------------------------------------
 * WORAN LIEGEN DIE 13-25 % AN GURTEN UND BLECHEN?
 *
 * Etappe 4 (Loeser gegen AxisVM) hat den Masten freigegeben - das Fussmoment
 * unter Wind quer auf 0.00 %, das Laengsmoment am geteilten Masten der Reihe
 * auf 0.60 %. Was NICHT stimmt, sind Gurte und Bleche: unter staendiger Last
 * 13-18 %, unter Wind laengs die Blechmomente 25 %. Die absoluten Werte sind
 * klein, aber die Blechspannung ist der Grund, aus dem es den Loeser gibt.
 *
 * Der Verdacht stand seit dem 20. September auf den STARRELEMENTEN: AxisVM
 * fuehrt sie als echte Starrkoerper, der Loeser als steife Staebe
 * (`STARR_FAKTOR = 10`). Weisung vom 26. September: «mit optimierung der
 * Zwangsbedingung weitermachen».
 *
 * >>> DIESES WERKZEUG IST DER BILLIGE TEST VOR DEM UMBAU. <<<
 *
 * Teil A dreht den Starrfaktor hoch (1, 10, 30, 100) und misst, ob sich die
 * Abweichung bewegt. Sinkt sie, ist es die Nachgiebigkeit der Ersatzstaebe,
 * und eine echte Zwangsbedingung waere ihr Grenzfall - dann lohnt der Umbau.
 * Bleibt sie stehen, waere er Arbeit am falschen Ende.
 *
 * GEMESSEN am 26. September (J90/20 m mit Masten, Lastfall G):
 *
 *     Gurt M_y    16.98 %  16.98 %  16.98 %  16.98 %
 *     Blech M_z   18.23 %  18.23 %  18.23 %  18.23 %
 *     Gurt V_y    13.63 %  13.63 %  13.63 %  13.63 %
 *
 * Keine Stelle bewegt sich. Die Starrelemente sind laengst gesaettigt (das
 * deckt sich mit dem Befund vom 20. September: die Loesung haengt nicht am
 * Starrfaktor), und bei f = 1000 bricht die Zerlegung ohnehin ab («nicht
 * positiv definit») - die Konditionierungsgrenze. Der Umbau wurde deshalb
 * NICHT gemacht.
 *
 * >>> TEIL B ZEIGT, WO ES STATT DESSEN HERKOMMT. <<<
 *
 * Vier Gurte an derselben Station, alle sechs Komponenten. Gemessen am
 * `OGL_S40`, Lastfall G, Stabanfang:
 *
 *              N        V_y      V_z     M_y      M_z
 *     AxisVM  -30.947  -0.0088  0.0925  0.0900   0.0653
 *     Loeser  -31.091  -0.0041  0.0925  0.0907  -0.0019
 *
 * N und M_y stimmen auf 0.5-0.8 %, V_z exakt - M_z gar nicht, und zwar mit
 * verkehrtem Vorzeichen. Eine verdrehte Stabachse erklaert es nicht: die
 * Probe darunter dreht die Schnittgroessen um +90, -90 und 180 Grad, und
 * alle drei liegen >= 72 % daneben.
 *
 * Welche Station das Werkzeug nimmt, waehlt es selbst (die mittlere, an der
 * alle vier Gurte stehen) - am J90/20 m ist das S43, nicht S40. Die Zahlen
 * unterscheiden sich damit leicht von denen oben; was gleich bleibt, ist
 * der Befund: keine der drei Drehungen kommt naeher als die ungedrehte
 * Lesart.
 *
 * Die Erklaerung ist das DEVIATIONSMOMENT I_yz. Die Modelldatei fuehrt je
 * Querschnitt nur A, I_y, I_z und I_t; `kLokal` in core.stabwerk.js koppelt
 * y und z deshalb nicht - der Loeser rechnet den L-Winkel, als waere er
 * doppelt symmetrisch. AxisVM bekommt ihn als `form: 'Angle'` mit
 * `profil: 'L 90x90x9'` und kennt seine Hauptachsen.
 * Das Werkzeug weiss es an einer Stelle schon: `randspannung()` in
 * core.winkel.js rechnet die schiefe Biegung ueber I_yz (hergeleitet aus
 * I_1 und I_2). Die SPANNUNG kennt das Deviationsmoment, die STEIFIGKEIT
 * nicht - und die Schnittgroessen kommen aus der Steifigkeit.
 *
 * WIE ES LAEUFT
 *
 *   1. Modelldatei OHNE Eigengewicht erzeugen (AxisVM setzt es selbst an;
 *      siehe den Kopf von vergleich_axisvm.mjs).
 *   2. com\AxisVM_aufbauen.cmd -Json <datei> -Rechnen -Auslesen -Stapel
 *   3. node vergleich_starrheit.mjs com/AxisVM_<name>.json
 *
 * Der Loeser steuert sein Eigengewicht selbst bei (`eigengewicht: true`) -
 * genau wie in vergleich_axisvm.mjs, sonst stuenden zwei verschiedene
 * Lastbilder gegeneinander.
 * ---------------------------------------------------------------------------
 */
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const HIER = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const J = (f) => pathToFileURL(join(HIER, 'js', f)).href;

const NO = await import(J('data.normen.js'));
NO.setzeNormen(JSON.parse(readFileSync(join(HIER, 'data', 'normen.json'), 'utf8')));
const SW = await import(J('core.stabwerk.js'));
const SN = await import(J('core.stabnachweis.js'));

const pfad = process.argv[2];
if (!pfad) {
  console.error('Aufruf: node vergleich_starrheit.mjs com/AxisVM_<name>.json');
  process.exit(2);
}
const modellPfad = join(HIER, pfad.replace(/^\.?[\\/]/, ''));
const ergPfad = modellPfad.replace(/\.json$/i, '_ergebnisse.json');

/* ---------------------------------------------------------------------------
 * GEHOEREN DIE BEIDEN ZUSAMMEN?
 *
 * Dieselbe Wache wie in vergleich_axisvm.mjs, und aus demselben Grund: am
 * 24. September hat eine Gegenprobe ein 20-m-Joch gegen die Ergebnisse
 * eines 8-m-Jochs gehalten und Abweichungen bis Faktor 39 gemeldet. Die
 * Knotennamen sind bei beiden dieselben - der Vergleich findet also zu
 * jedem Namen einen Partner und schweigt.
 * ------------------------------------------------------------------------- */
let dat; let ax;
try {
  dat = JSON.parse(readFileSync(modellPfad, 'utf8'));
  ax = JSON.parse(readFileSync(ergPfad, 'utf8'));
} catch (e) {
  console.error(`Nicht lesbar: ${e.message}\n`
    + '  Zuerst rechnen lassen:\n'
    + `  com\\AxisVM_aufbauen.cmd -Json ${pfad} -Rechnen -Auslesen -Stapel`);
  process.exit(2);
}
if (statSync(ergPfad).mtimeMs < statSync(modellPfad).mtimeMs) {
  console.error('>>> ABBRUCH: die Ergebnisse sind AELTER als das Modell. <<<');
  process.exit(1);
}
console.log('='.repeat(78));
console.log(`MODELL     ${basename(modellPfad)}  -  ${dat.knoten.length} Knoten, `
  + `${dat.staebe.length} Staebe`);
console.log(`ERGEBNISSE ${basename(ergPfad)}  -  ${ax.erzeugt ?? '?'}`);
console.log('='.repeat(78));

const art = new Map(dat.staebe.map((s) => [s.name, s.art ?? 'stab']));
const knoten = new Map(dat.knoten.map((k) => [k.name, k]));
const laenge = (n) => {
  const s = dat.staebe.find((x) => x.name === n);
  const a = knoten.get(s.von); const b = knoten.get(s.bis);
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
};

/*
 * AxisVM teilt jede Linie in zehn Abschnitte, also elf Schnitte. Der letzte
 * ist das Stabende - aber nur, wenn er auch dort liegt; die Bruecke hielt
 * einmal den ZWEITEN Schnitt (x = L/10) fuer das Ende und meldete am
 * MAST_M1_S1 M_y 9.08 statt 0.26 kNm. Deshalb wird die Lage geprueft.
 */
const jeFall = {};
Object.entries(ax.faelle ?? {}).forEach(([fall, f]) => {
  const m = new Map();
  (f.schnitte ?? []).forEach((s) => {
    const a = m.get(s.stab) ?? []; a.push(s); m.set(s.stab, a);
  });
  m.forEach((a) => a.sort((p, q) => p.x - q.x));
  jeFall[fall] = m;
});
/* Der Loeser gibt die zwoelf Endkraefte im lokalen System; am i-Ende mit
 * umgekehrtem Vorzeichen, damit beide Enden dieselbe Schnittgroesse zeigen. */
const ausI = (f) => ({ Nx: -f[0], Vy: -f[1], Vz: -f[2], Tx: -f[3], My: -f[4], Mz: -f[5] });
const ausJ = (f) => ({ Nx: f[6], Vy: f[7], Vz: f[8], Tx: f[9], My: f[10], Mz: f[11] });
const G = ['Nx', 'Vy', 'Vz', 'Tx', 'My', 'Mz'];
/*
 * Gemessen werden die beiden Lastfaelle, an denen die Abweichung haengt:
 * das reine Eigengewicht und der Wind in Gleisrichtung. Mehr macht die
 * Tabelle nur breiter, ohne eine neue Frage zu beantworten.
 */
const FAELLE = ['G', 'WindY'].filter((f) => jeFall[f]);

/* ---------------------------------------------------------------------------
 * TEIL A: bewegt sich etwas, wenn die Starrelemente steifer werden?
 * ------------------------------------------------------------------------- */
function messe(starrFaktor) {
  const lsg = SW.loese(dat, { eigengewicht: true, starrFaktor });
  const out = {};
  FAELLE.forEach((fall) => {
    if (!lsg.u.has(fall)) return;
    const K = lsg.stabkraft(fall);
    const je = {};
    jeFall[fall].forEach((schnitte, stab) => {
      if ((art.get(stab) ?? 'stab') !== 'stab') return;
      const r = SN.stabRolle(stab, 'stab');
      if (!['gurt', 'blech', 'mast'].includes(r)) return;
      const f = K.get(stab); if (!f) return;
      const L = laenge(stab);
      const e = schnitte.at(-1);
      const paare = [[schnitte[0], ausI(f)]];
      if (e && Math.abs(e.x - L) < 1e-3 * Math.max(1, L)) paare.push([e, ausJ(f)]);
      paare.forEach(([s, meins]) => G.forEach((g) => {
        const k = `${r} ${g}`;
        const st = je[k] ?? (je[k] = { max: 0, d: 0 });
        st.max = Math.max(st.max, Math.abs(s[g]));
        st.d = Math.max(st.d, Math.abs(s[g] - meins[g]));
      }));
    });
    out[fall] = je;
  });
  return out;
}

const faktoren = [1, 10, 30, 100];
console.log('\nTEIL A - Abweichung gegen AxisVM, bezogen auf den groessten Wert');
console.log('         der Groesse im Lastfall. Bewegt sich eine Spalte?\n');
const erg = faktoren.map((f) => {
  try {
    return messe(f);
  } catch (e) {
    /* Bei zu grossem Faktor bricht die Zerlegung ab («nicht positiv
     * definit») - das ist kein Fehler des Werkzeugs, sondern die
     * Konditionierungsgrenze, und sie gehoert in die Tabelle. */
    console.log(`  f = ${f}: ${e.message}`);
    return null;
  }
});
const erste = erg.find(Boolean);
if (!erste) {
  console.error('Kein Starrfaktor liess sich rechnen.');
  process.exit(1);
}
console.log('-'.repeat(78));
console.log('Fall    Groesse        ' + faktoren.map((f) => `f=${f}`.padStart(11)).join(''));
console.log('-'.repeat(78));
Object.keys(erste).forEach((fall) => {
  Object.keys(erste[fall]).sort().forEach((k) => {
    if (!(erste[fall][k].max > 1e-4)) return;   // nichts da, nichts zu messen
    const zeile = erg.map((e) => {
      const st = e?.[fall]?.[k];
      return (st && st.max > 1e-4 ? `${(st.d / st.max * 100).toFixed(2)} %` : '  -  ').padStart(11);
    }).join('');
    console.log(`${fall.padEnd(8)}${k.padEnd(15)}${zeile}`);
  });
  console.log('-'.repeat(78));
});

/* ---------------------------------------------------------------------------
 * TEIL B: die vier Gurte einer Station, alle sechs Komponenten.
 *
 * Gesucht wird eine Station in Feldmitte, an der alle vier Gurte stehen -
 * dort ist die Biegung gross und der Einfluss der Anschluesse klein.
 * ------------------------------------------------------------------------- */
const GURT = /^(.*?)(OGL|OGR|UGL|UGR)_S(\d+)$/;
const jeStation = new Map();
dat.staebe.forEach((s) => {
  const m = GURT.exec(s.name);
  if (!m) return;
  /* Schluessel ist Tragwerk + Station; auf einem Blatt tragen die Staebe
   * ein Praefix («T2_OGL_S40»), und zwei Tragwerke haben dieselben
   * Stationsnummern. */
  const k = `${m[1]}${m[3].padStart(4, '0')}`;
  const a = jeStation.get(k) ?? new Map();
  a.set(m[2], s.name); jeStation.set(k, a);
});
const voll = [...jeStation.entries()].filter(([, a]) => a.size === 4)
  .sort((p, q) => (p[0] < q[0] ? -1 : 1));
if (!voll.length || !jeFall.G) {
  console.log('\nTEIL B uebersprungen: keine Station mit vier Gurten '
    + 'bzw. kein Lastfall G in den Ergebnissen.');
  process.exit(0);
}
/* Die mittlere der vollstaendigen Stationen - nicht die erste, die liegt am
 * Anschluss, wo die Starrelemente mitreden. */
const [, gurte] = voll[Math.floor(voll.length / 2)];
const lsgB = SW.loese(dat, { eigengewicht: true });
const KB = lsgB.stabkraft('G');
const s0 = new Map();
(ax.faelle.G.schnitte ?? []).forEach((s) => { if (s.x === 0) s0.set(s.stab, s); });

console.log('\nTEIL B - Lastfall G, Stabanfang. Vier Gurte an derselben Station.');
console.log('         Erklaert eine verdrehte Stabachse die Abweichung?');
for (const lage of ['OGL', 'OGR', 'UGL', 'UGR']) {
  const n = gurte.get(lage);
  const a = s0.get(n); const f = KB.get(n);
  if (!a || !f) continue;
  const st = dat.staebe.find((x) => x.name === n);
  const me = ausI(f);
  console.log(`\n${n}  lcsZ=${JSON.stringify(st.lcsZ ?? null)}`);
  console.log(`  AxisVM  N ${a.Nx.toFixed(4)}  Vy ${a.Vy.toFixed(4)}  Vz ${a.Vz.toFixed(4)}`
    + `  T ${a.Tx.toFixed(4)}  My ${a.My.toFixed(4)}  Mz ${a.Mz.toFixed(4)}`);
  console.log(`  Loeser  N ${me.Nx.toFixed(4)}  Vy ${me.Vy.toFixed(4)}  Vz ${me.Vz.toFixed(4)}`
    + `  T ${me.Tx.toFixed(4)}  My ${me.My.toFixed(4)}  Mz ${me.Mz.toFixed(4)}`);
  /*
   * Passt eine Drehung um die Stabachse? +90 Grad heisst
   * (Vy,Vz) -> (Vz,-Vy) und (My,Mz) -> (Mz,-My). Liegt eine der Proben
   * nahe bei null, war es die Drehlage; liegen alle daneben, ist es die
   * Steifigkeitsmatrix selbst.
   */
  const prob = [
    ['   wie gelesen   ', me.Vy, me.Vz, me.My, me.Mz],
    ['   um +90 gedreht', me.Vz, -me.Vy, me.Mz, -me.My],
    ['   um -90 gedreht', -me.Vz, me.Vy, -me.Mz, me.My],
    ['   um 180 gedreht', -me.Vy, -me.Vz, -me.My, -me.Mz],
  ];
  const bez = Math.max(Math.abs(a.Vy), Math.abs(a.Vz),
                       Math.abs(a.My), Math.abs(a.Mz), 1e-9);
  prob.forEach(([wie, vy, vz, my, mz]) => {
    const d = Math.max(Math.abs(a.Vy - vy), Math.abs(a.Vz - vz),
                       Math.abs(a.My - my), Math.abs(a.Mz - mz));
    console.log(`${wie}  Abweichung ${(d / bez * 100).toFixed(2)} %`);
  });
}
console.log('\nKeine Drehung passt? Dann fehlt die Kopplung y/z - siehe den Kopf');
console.log('dieser Datei: das Deviationsmoment I_yz in `kLokal`.');
