/* ===========================================================================
 * vergleich_anschluss.mjs
 * ---------------------------------------------------------------------------
 * WAS LEITET DER ANSCHLUSS JOCH-MAST IN DEN MASTEN EIN?
 *
 * Entscheid vom 26. September: nach dem Einbau von I_yz «zuerst Anschluss
 * Joch-Mast», danach der Tragausleger. Zwei Reste gegen AxisVM haben sich
 * mit I_yz nicht bewegt, beide am Anschluss:
 *
 *   - staendig: Mastfuss M_y AxisVM -1.6557, Loeser -0.3134 kNm (81 %)
 *   - Wind in Gleisrichtung: Gurt M_y am Jochende 55 %, Endblech V_y
 *     AxisVM 1.0766, Loeser 0.0079 kN
 *
 * Die AxisVM-Ergebnisse fuehren nur STABSCHNITTGROESSEN - keine Wege, keine
 * Linkkraefte. Was die Konsole mit ihren beiden Links in den Masten
 * einleitet, steht trotzdem darin: als SPRUNG der Mastschnittgroessen am
 * Konsolenknoten. Dieses Werkzeug rechnet ihn fuer beide Programme, in den
 * lokalen Mastachsen, an allen vier Knoten des Anschlusses (Konsole UG,
 * Gurt UG, Gurt OG, Konsole OG) und dazu den Fuss.
 *
 * >>> GEMESSEN am 26. September (J90/20 m, Mast M1, lcsZ [1,0,0]): <<<
 *
 *   G      Konsole UG   N 5.8809 / 5.8810   M_y 0.7057 / 0.7057  (gleich)
 *          Konsole OG   V_z -0.1155 / +0.0508  (UMGEKEHRTES Vorzeichen)
 *   WindY  Konsole UG   V_y 2.1514 / 2.0338   M_z 0.2230 / 0.1724
 *          Konsole OG   V_y 2.1491 / 2.2667   M_z -0.2223 / -0.2468
 *
 * Der ganze Unterschied unter G ist die Kraft in JOCHACHSE am oberen Link:
 * 0.1155 x 7.82 m + 0.706 + 0.047 = 1.656 kNm am Fuss, beim Loeser
 * -0.0508 x 7.82 + 0.706 + 0.005 = 0.313. Sie ist eine statisch
 * unbestimmte Groesse - die Differenz zweier Wege von rund 1 mm (das Joch
 * zieht den Obergurt beim Durchhaengen nach innen, der Mast neigt sich
 * unter der ausmittigen Jochlast ebenfalls nach innen).
 *
 * >>> AUSGESCHLOSSEN, GEMESSEN - keine dieser Groessen bewegt sie: <<<
 *
 *   I_yz (0.0506 ohne), Schubverformung (0.0509 ohne), Steifigkeit der
 *   Gurtabschnitte (Faktor 1: 0.0393, 10: 0.0497), Starrfaktor 1-100,
 *   Gelenklage im Link (i/j/Mitte), Drehachsen des Links LOKAL statt
 *   global (G wird damit schlechter: Gurt M_y 4.8 -> 27 %).
 *
 * Weiter kam man nur mit den WEGEN - und die haben es geklaert (26.
 * September, erweiterte Auslesung): die Bruecke legte jede Linkverbindung
 * 0.45 m AUSSERHALB des 0.05 m langen Links (`Position = 0.5` als Meter
 * gelesen). Die Hoehe, auf der sich Mast und Gurt in x decken, lag in G und
 * in Wind x bei 0.500 m ueber dem Gurtknoten; mit genau dieser Lage im
 * Loeser nachgerechnet, stimmen alle Groessen auf 0.0-1.5 %. Der Rest war
 * ein Fehler des AxisVM-Modells, nicht des Loesers. Berichtigt in der
 * Bruecke, bewacht in Pruefstand Abschnitt 130.
 *
 * AUFRUF
 *   node vergleich_anschluss.mjs com/AxisVM_<name>.json [Mast] [Lastfall]
 *   (Mast vorgabe M1; ohne Lastfall G, WindY und WindX)
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
const AX = await import(J('export.axisvm.js'));

const pfad = process.argv[2];
if (!pfad) {
  console.error('Aufruf: node vergleich_anschluss.mjs com/AxisVM_<name>.json [Mast] [Lastfall]');
  process.exit(2);
}
const mast = process.argv[3] ?? 'M1';
const modellPfad = join(HIER, pfad.replace(/^\.?[\\/]/, ''));
const ergPfad = modellPfad.replace(/\.json$/i, '_ergebnisse.json');
let dat; let ax;
try {
  dat = JSON.parse(readFileSync(modellPfad, 'utf8'));
  ax = JSON.parse(readFileSync(ergPfad, 'utf8'));
} catch (e) {
  console.error(`Nicht lesbar: ${e.message}`);
  process.exit(2);
}
// Dieselbe Wache wie in den uebrigen Vergleichen: Ergebnisse, die aelter
// sind als das Modell, gehoeren zu einem anderen Stand.
if (statSync(ergPfad).mtimeMs < statSync(modellPfad).mtimeMs) {
  console.error('>>> ABBRUCH: die Ergebnisse sind AELTER als das Modell. <<<');
  process.exit(1);
}
const nachgetragen = AX.deviationNachtragen(dat);
console.log(`MODELL ${basename(modellPfad)}   Mast ${mast}`
  + (nachgetragen.length ? `   (I_yz nachgetragen: ${nachgetragen.join(', ')})` : ''));

const lsg = SW.loese(dat, { eigengewicht: true });
const G = ['Nx', 'Vy', 'Vz', 'Tx', 'My', 'Mz'];
/* Am i-Ende gibt der Loeser die Kraft AUF den Stab - umgekehrtes Vorzeichen
 * gegenueber der Schnittgroesse; am j-Ende ist es die Schnittgroesse. */
const ausI = (f) => ({ Nx: -f[0], Vy: -f[1], Vz: -f[2], Tx: -f[3], My: -f[4], Mz: -f[5] });
const ausJ = (f) => ({ Nx: f[6], Vy: f[7], Vz: f[8], Tx: f[9], My: f[10], Mz: f[11] });

// Auf einem Blatt tragen die Masten kein Tragwerkspraefix, die Joche schon.
const s1 = dat.staebe.find((s) => new RegExp(`MAST_${mast}_S1$`).test(s.name));
if (!s1) {
  console.error(`Kein Mast ${mast} im Modell.`);
  process.exit(2);
}
const vor = s1.name.replace(/MAST_.*$/, '');
const S = (i) => `${vor}MAST_${mast}_S${i}`;
console.log(`lokale Mastachsen: lcsZ ${JSON.stringify(s1.lcsZ ?? null)}`);

const faelle = process.argv[4] ? [process.argv[4]] : ['G', 'WindY', 'WindX'];
const zahl = (v) => v.toFixed(4).padStart(9);
for (const fall of faelle) {
  if (!ax.faelle?.[fall] || !lsg.u.has(fall)) continue;
  const K = lsg.stabkraft(fall);
  const m = new Map();
  ax.faelle[fall].schnitte.forEach((s) => {
    const a = m.get(s.stab) ?? []; a.push(s); m.set(s.stab, a);
  });
  m.forEach((a) => a.sort((p, q) => p.x - q.x));
  console.log(`\n== ${fall} (${ax.faelle[fall].name ?? ''})   Sprung = Anfang oben - Ende unten`);
  for (const [u, o, wo] of [[1, 2, 'Konsole UG'], [2, 3, 'Gurt UG'],
                            [3, 4, 'Gurt OG'], [4, 5, 'Konsole OG']]) {
    const au = m.get(S(u))?.at(-1), ao = m.get(S(o))?.[0];
    const ku = K.get(S(u)), ko = K.get(S(o));
    if (!au || !ao || !ku || !ko) continue;
    const lu = ausJ(ku), lo = ausI(ko);
    console.log(`  ${wo.padEnd(11)} AxisVM ` + G.map((g) => `${g}${zahl(ao[g] - au[g])}`).join(' '));
    console.log(`  ${''.padEnd(11)} Loeser ` + G.map((g) => `${g}${zahl(lo[g] - lu[g])}`).join(' '));
  }
  const fa = m.get(S(1))?.[0], fl = ausI(K.get(S(1)));
  if (fa) {
    console.log(`  ${'Fuss'.padEnd(11)} AxisVM ` + G.map((g) => `${g}${zahl(fa[g])}`).join(' '));
    console.log(`  ${''.padEnd(11)} Loeser ` + G.map((g) => `${g}${zahl(fl[g])}`).join(' '));
  }

  /* -------------------------------------------------------------------------
   * >>> DIE WEGE (seit der erweiterten Auslesung vom 26. September). <<<
   *
   * Die Bruecke schreibt je Lastfall `wege`: Knotenname -> [ex, ey, ez,
   * fx, fy, fz] (m, rad). Welche Bedeutung das ELongBoolean beim Lesen
   * hatte, ist NICHT vermessen - deshalb zuerst die beiden Gegenproben:
   * der Fussknoten ist eingespannt und muss null sein, und der Mastkopf
   * muss unter Wind quer den Loeser treffen (dort stimmen die Momente auf
   * 0.00 %, also muessen es die Wege auch). Erst danach sagt der Vergleich
   * am Anschluss etwas.
   * ----------------------------------------------------------------------- */
  const wege = ax.faelle[fall].wege;
  if (wege) {
    const uv = lsg.u.get(fall);
    const loeW = (name) => {
      const i = lsg.knotenIdx.get(name);
      return i === undefined ? null : Array.from(uv.slice(i * 6, i * 6 + 6));
    };
    const zeile = (name) => {
      const a = wege[name], l = loeW(name);
      if (!a || !l) return null;
      const f = (v, k) => (k < 3 ? (v * 1000).toFixed(4) : (v * 1000).toFixed(4)).padStart(9);
      return `  ${name.padEnd(18)} AxisVM ${a.map(f).join('')}\n`
           + `  ${''.padEnd(18)} Loeser ${l.map(f).join('')}`;
    };
    console.log(`  Wege [mm | mrad]            ${['ux', 'uy', 'uz', 'fx', 'fy', 'fz'].map((x) => x.padStart(9)).join('')}`);
    const knoten = [`MAST_${mast}_F`, `MAST_${mast}_KOPF`, `MAST_${mast}_A_OG`,
      `MAST_${mast}_A_UG`, `KONS_${mast}_OG`, `ARM_${mast}_OGL`, `ANS_${mast}_OGL`,
      `ANS_${mast}_UGL`];
    // Die Gurtknoten am Anschluss: ueber die Links des Masten gefunden.
    dat.staebe.filter((s) => s.art === 'link' && s.name.includes(`_${mast}_`))
      .forEach((s) => { if (!knoten.includes(s.bis)) knoten.push(s.bis); });
    ['OGL_0.000', 'UGL_0.000', 'OGL_10.000', 'UGL_10.000'].forEach((n) => {
      if (!knoten.includes(`${vor}${n}`)) knoten.push(`${vor}${n}`);
    });
    knoten.forEach((n) => { const z = zeile(n); if (z) console.log(z); });
    // Und ueber alle Knoten: wie weit liegen die beiden Loesungen auseinander?
    let dmax = 0, umax = 0, wo = '';
    Object.entries(wege).forEach(([n, a]) => {
      const l = loeW(n); if (!l) return;
      for (let k = 0; k < 3; k += 1) {
        umax = Math.max(umax, Math.abs(a[k]));
        const d = Math.abs(a[k] - l[k]);
        if (d > dmax) { dmax = d; wo = `${n}.${'xyz'[k]}`; }
      }
    });
    if (umax > 0) {
      console.log(`  alle Knoten: groesste Wegdifferenz ${(dmax * 1000).toFixed(4)} mm `
        + `(${(dmax / umax * 100).toFixed(2)} % des groessten Weges ${(umax * 1000).toFixed(3)} mm) bei ${wo}`);
    }
  }

  /* -------------------------------------------------------------------------
   * DIE LINKKRAEFTE. AxisVM gibt drei Abschnitte je Link (lefSection1..3),
   * der Loeser zwoelf Endkraefte im lokalen System des Links. Welche
   * Achse bei AxisVM welche ist, wird an den Zahlen abgelesen, nicht
   * vorausgesetzt - deshalb stehen beide roh da.
   * ----------------------------------------------------------------------- */
  const links = ax.faelle[fall].links;
  if (links) {
    console.log('  Linkkraefte              AxisVM: Abschnitt 1 / 2 / 3 (Nx Vy Vz Tx My Mz)');
    console.log('                           Loeser: i-Ende und j-Ende, lokal (x y z xx yy zz)');
    Object.entries(links).filter(([n]) => n.includes(`_${mast}_`)).forEach(([n, ab]) => {
      console.log(`  ${n}`);
      ab.forEach((w, i) => console.log(`    AxisVM ${i + 1} ` + w.map((v) => v.toFixed(4).padStart(9)).join('')));
      const f = K.get(n);
      if (f) {
        console.log('    Loeser i ' + Array.from(f.slice(0, 6)).map((v) => v.toFixed(4).padStart(9)).join(''));
        console.log('    Loeser j ' + Array.from(f.slice(6)).map((v) => v.toFixed(4).padStart(9)).join(''));
      }
    });
  }
}
