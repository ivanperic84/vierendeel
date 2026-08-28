/**
 * kalibrieren.mjs
 * ---------------------------------------------------------------------------
 * MISST DIE BEIDEN GEFITTETEN KENNWERTE AN EINEM STABMODELL.
 *
 *     GURT_DAEMPFUNG    k in  Anteil = 0.5 + k · (I_Gurt/ΣI − 0.5)
 *     ENDFELD_ZUSCHLAG  k_E auf den Torsionsanteil der äussersten Bleche
 *
 * Beide standen bisher auf EINER Messung an EINEM Modell mit EINER
 * Lastanordnung. Dieses Werkzeug fährt sie über das Sortiment und über
 * mehrere Lastanordnungen, damit aus einer Behauptung ein Nachweis wird.
 *
 *     node kalibrieren.mjs                  alles
 *     node kalibrieren.mjs --nur daempfung  nur k
 *     node kalibrieren.mjs --nur endfeld    nur k_E
 *     node kalibrieren.mjs --schnell        ein Fall je Gruppe (Probelauf)
 *
 * WARUM GEMESSEN WIRD, WAS SICH ÄNDERT - NICHT, WAS DASTEHT
 *
 * Der erste Anlauf hat den Anteil des Obergurts unmittelbar abgelesen und
 * daraus k gerechnet. Die Gegenprobe mit GLEICHEN Gurten hat das widerlegt:
 * sie muss 50.0 % liefern, tat es im ungestörten Joch auch exakt - aber
 * nicht überall. Zwei Störungen liegen über dem Steifigkeitseffekt:
 *
 *   ENDFELD          An den beiden äussersten Feldern zieht das Auflager die
 *                    Aufteilung auf 46 / 52 %, obwohl beide Gurte gleich
 *                    sind. Das ist die örtliche Einleitung - dieselbe Sache,
 *                    die der zweite Kennwert erfasst.
 *
 *   ANGRIFFSORT      Eine Hängestütze hängt am UNTERGURT. Ihre Windlast
 *                    verteilt sich nicht nach Steifigkeit, sondern läuft
 *                    dort ein, wo sie angreift: gleiche Gurte, aber 43 statt
 *                    50 %. Ohne Anbauteile verschwindet der Effekt restlos.
 *
 * Beides sind ECHTE Effekte und keine Messfehler - aber es sind keine
 * Steifigkeitseffekte, und die Formel  Anteil = 0.5 + k · (I/ΣI − 0.5)
 * kennt sie nicht. Wer sie in k hineinmittelt, misst das Falsche.
 *
 * Deshalb wird jeder Fall ZWEIMAL gerechnet: einmal mit den wirklichen
 * Gurten, einmal mit dem Obergurtprofil auf BEIDEN Lagen - gleiche Länge,
 * gleiche Blecheinteilung, gleiche Lasten. Die DIFFERENZ der beiden Anteile
 * ist der reine Steifigkeitseffekt; jede Störung, die in beiden Läufen
 * gleich wirkt, fällt heraus.
 *
 *      k = (Anteil_wirklich − Anteil_gleich) / (I_OG/ΣI − 0.5)
 *
 * ZWEI MESSWEGE, ABSICHTLICH NEBENEINANDER
 * Der Anteil eines Gurtes an der Querkraft seiner Ebene lässt sich auf zwei
 * Arten ablesen: an der QUERKRAFT im Gurtstab und am ENDMOMENT desselben
 * Stabes. Sie müssen übereinstimmen; wo sie es nicht tun, steckt etwas
 * anderes darin. Beide werden ausgegeben, damit die Abweichung sichtbar
 * bleibt statt gemittelt.
 *
 * Die Rohläufe landen in einem Arbeitsordner ausserhalb der Ablage; hier
 * bleibt nur die Messtabelle.
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const J = (f) => new URL(`./js/${f}`, import.meta.url).href;

const T = await import(J('data.tragjoche.js'));
const P = await import(J('data.profiles.js'));
const A = await import(J('data.anbauteile.js'));
const FL = await import(J('data.fl.js'));
const V = await import(J('core.vierendeel.js'));
const PY = await import(J('export.pynite.js'));
const SCH = await import(J('ui.schema.js'));
const QS = await import(J('core.querschnitt.js'));
const LA = await import(J('core.lasten.js'));

T.setzeDatenbank(JSON.parse(readFileSync('data/tragjoche.json', 'utf8')));
const ANBAU_DB = JSON.parse(readFileSync('data/anbauteile.json', 'utf8'));
A.setzeAnbauteilDB(ANBAU_DB);
FL.setzeFlDB(JSON.parse(readFileSync('data/fl_bauteile.json', 'utf8')));

const argv = process.argv.slice(2);
const nurIdx = argv.indexOf('--nur');
const NUR = nurIdx >= 0 ? argv[nurIdx + 1] : null;
const SCHNELL = argv.includes('--schnell');

// Kein Pfad eines bestimmten Rechners in der Ablage: der Aufruf kommt aus der
// Umgebung, sonst aus dem Suchpfad. Die Rohlaeufe landen im Temp-Verzeichnis
// des Systems - es sind Hunderte Dateien, die niemand aufheben will.
const PYTHON = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
const ARBEIT = process.env.KALIB_ORDNER ?? join(tmpdir(), 'vierendeel_kalibrierung');

/* ===========================================================================
 * 1 · DIE PRÜFMATRIX
 * ===========================================================================
 * Die Typen sind nicht frei gewählt, sondern das, was das Sortiment an
 * Steifigkeitsverhältnissen wirklich führt:
 *
 *      J60/J70/J80/J90   gleiche Gurte      I_OG/I_UG = 1.00
 *      J120              L120 / L100                    2.04
 *      J100              L100 / L80                     2.46  <- die alte Messung
 *      J130              L130 / L120x80                 4.15  <- unbelegt
 *
 * Mehr Punkte gibt es nicht zu treffen. Ein Fit über Verhältnisse, die im
 * Sortiment nicht vorkommen, wäre Zierde.
 */
const TYPEN = [
  { typ: 'J90', zweck: 'Gegenprobe' },
  { typ: 'J120', zweck: 'Fit' },
  { typ: 'J100', zweck: 'Fit' },
  { typ: 'J130', zweck: 'Fit' },
];

/**
 * LASTANORDNUNGEN.
 *
 * Die dokumentierte Spanne der alten Messung (51 bis 73 %) stammt aus EINER
 * Anordnung - sie ist damit nicht erklärt, nur beobachtet. Hier wird die
 * Anordnung selbst zur Variablen:
 *
 *   leer         nur Eigengewicht und Wind. Der Grundfall ohne Störung.
 *   mitte        eine Hängestütze in Feldmitte, mittig zur Jochachse.
 *   exzentrisch  dieselbe Last, quer versetzt.
 *   einseitig    zwei Lasten auf einer Jochhälfte - unsymmetrische Querkraft.
 *   feldrand     Last dicht am Auflager statt in Feldmitte.
 *
 * >>> ZU 'exzentrisch': der Querversatz kommt im Rechenkern NICHT als
 * Torsion an. Gemessen am J90, 14 m, mit 6 kN auf y = 1.2 m: erwartet wären
 * 7.2 kNm, gerechnet werden 0.00 - und zwar auf jedem Weg, den die Eingabe
 * kennt (y am Modul, y an der Baugruppe, y am Lastblock). Die Ursache liegt
 * sichtbar in `anbauteilLasten`: dort steht  ex = a.y ?? a.ex ?? 0  und
 * greift damit auf die BAUGRUPPE, während `normalisiereAnbauteil` das y in
 * die Module und Lastblöcke schreibt. Torsion aus WAAGRECHTER Last (Fy·e_v)
 * entsteht dagegen richtig - deshalb fällt es bei Wind nicht auf.
 *
 * Ob das ein Versehen ist oder eine Festlegung (Vertikallasten immer in der
 * Jochachse), ist NICHT hier zu entscheiden - es ist nachweisrelevant. Bis
 * zur Klärung ist 'exzentrisch' rechnerisch dasselbe wie 'mitte'; die
 * Anordnung bleibt in der Liste, damit der Fall wiederholbar ist. <<<
 */
const ANORDNUNGEN = ['leer', 'mitte', 'exzentrisch', 'einseitig', 'feldrand'];

/** Eine Hängestütze mit Fahrleitung an Stelle x, quer versetzt um y. */
function haengestuetze(x, y = 0) {
  const v = ANBAU_DB.vorlagen.find((t) => t.id === 'hs-fahrdraht');
  if (!v) throw new Error('Vorlage hs-fahrdraht fehlt in data/anbauteile.json');
  return {
    ...v,
    x: Math.round(x * 100) / 100,
    module: v.module.map((mo) => ({ ...mo, y: (mo.y ?? 0) + y })),
  };
}

function anbauteileFuer(anordnung, L) {
  switch (anordnung) {
    case 'leer': return [];
    case 'mitte': return [haengestuetze(L / 2)];
    case 'exzentrisch': return [haengestuetze(L / 2, 1.2)];
    case 'einseitig': return [haengestuetze(L * 0.25), haengestuetze(L * 0.4)];
    case 'feldrand': return [haengestuetze(Math.min(1.5, L * 0.1))];
    default: throw new Error(`Unbekannte Anordnung: ${anordnung}`);
  }
}

/**
 * EINE KURZE UND EINE LANGE AUSFÜHRUNG.
 *
 * Das Sortiment führt je Typ zwei Bauarten mit VERSCHIEDENER Blecheinteilung
 * (kurz und Norm). Genau die ist hier die interessante Variable: sie ändert
 * die Nachgiebigkeit des Rahmens und damit den Ausgleich zwischen den Gurten.
 * Deshalb wird je Bauart eine Länge genommen, nicht zweimal dieselbe Bauart.
 */
function laengenFuer(joch) {
  const alle = T.moeglicheLaengen(joch);
  const kurz = alle.filter((x) => x.art === 'kurz').map((x) => x.wert);
  const norm = alle.filter((x) => x.art !== 'kurz').map((x) => x.wert);
  const mitte = (a) => (a.length ? a[Math.floor(a.length / 2)] : null);
  const wahl = [mitte(kurz), mitte(norm)].filter((x) => x !== null);
  if (!wahl.length) return [16];
  return SCHNELL ? [wahl[0]] : wahl;
}

/* ===========================================================================
 * 2 · EIN FALL: MODELL BAUEN, RECHNEN LASSEN, TABELLEN EINLESEN
 * =========================================================================== */

function eingabe(typ, L, anordnung, variante = 'wirklich') {
  const w = { ...SCH.standardwerte() };
  const joch = T.getTragjoch(typ);
  w.typ = typ;
  w.L = L;
  w.profOG = joch.og.profil;
  // Der Referenzlauf setzt das Obergurtprofil auch unten ein. Alles andere -
  // Bauhöhe, Blecheinteilung, Lasten - bleibt gleich, damit die Differenz
  // ausschliesslich am Steifigkeitsverhältnis hängt.
  w.profUG = variante === 'gleich' ? joch.og.profil : joch.ug.profil;
  w.anbauteile = anbauteileFuer(anordnung, L);
  w.schneeAktiv = true;          // damit der Lastfall Schnee entsteht
  // Der Mast gehoert nicht in diese Messung: gemessen wird die Aufteilung im
  // Joch, und ein mitmodellierter Mast bringt eine zweite Unbekannte hinein.
  w.mastVorhanden = false;
  w.endbedingung = 'gelenkig';
  return w;
}

function modellVon(w) {
  return V.modell(w, P.getProfil(w.profOG), P.getProfil(w.profUG),
                  P.getStahl(w.stahl), T.getTragjoch(w.typ));
}

function csv(pfad) {
  const roh = readFileSync(pfad, 'utf8').trim().split(/\r?\n/);
  const kopf = roh[0].split(';');
  return roh.slice(1).map((z) => {
    const t = z.split(';');
    const o = {};
    kopf.forEach((k, i) => { const v = Number(t[i]); o[k] = Number.isFinite(v) ? v : t[i]; });
    return o;
  });
}

function rechne(name, w) {
  const ordner = join(ARBEIT, name);
  mkdirSync(ordner, { recursive: true });
  const staebe = join(ordner, 'pynite_staebe.csv');
  // Das Modell wird IMMER gebaut, auch wenn schon gerechnet ist: aus `bau`
  // kommt die Zuordnung Stab -> Ort, ohne die sich keine Tabelle einer
  // Station zuweisen laesst. Es kostet nichts, PyNite laeuft deswegen nicht.
  const m = modellVon(w);
  const skript = PY.pyniteSkript(m, { knotenmodell: 'anschnitt' });
  if (!existsSync(staebe) || process.env.KALIB_NEU === '1') {
    writeFileSync(join(ordner, 'lauf.py'), skript.text);
    execFileSync(PYTHON, ['lauf.py'], {
      cwd: ordner, stdio: ['ignore', 'ignore', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
  }
  return { staebe: csv(staebe), stationen: csv(join(ordner, 'pynite_stationen.csv')),
           bau: skript.bau, modell: m };
}

/** Karte Stabname -> mittleres x seiner beiden Knoten. */
function stabOrte(bau) {
  const k = bau.knoten;
  const karte = new Map();
  for (const st of bau.staebe) {
    const a = k.get(st.von), b = k.get(st.bis);
    if (!a || !b) continue;
    karte.set(st.name, (a.x + b.x) / 2);
  }
  return karte;
}

/* ===========================================================================
 * 3 · DIE MESSUNG DES GURTANTEILS
 * ===========================================================================
 * In einer Vertikalebene (L oder R) stehen OG und UG uebereinander und sind
 * durch die Vertikalbleche zu einem Rahmen verbunden. Die Querkraft dieser
 * Ebene teilt sich auf beide Gurte auf; gesucht ist der Anteil des Obergurts.
 *
 * Die Gurte sind in Segmente OGL_S0, OGL_S1, ... zerlegt, abwechselnd
 * Knotenbereich (Querschnitt STARR) und Feld. Gleiche Segmentnummer heisst
 * gleiche Stelle im Joch - OGL_S7 und UGL_S7 liegen uebereinander.
 *
 * Gemessen wird nur an den FELDsegmenten. In den steifen Knotenbereichen ist
 * die Biegelinie kuenstlich gerade; dort etwas abzulesen hiesse, das
 * Knotenmodell mitzumessen.
 */
const FELDQS = (q) => q === 'GURT_OG' || q === 'GURT_UG';

/** So viele Feldsegmente je Jochende gelten als endfeldgestört. */
const RANDFELDER = 2;

/**
 * Anteil des Obergurts, je Feldsegment, Seite und Lastfall.
 * Der Schlüssel ist so gebaut, dass sich zwei Läufe desselben Jochs Segment
 * für Segment gegenüberstellen lassen.
 */
function gurtanteile(staebe) {
  const idx = new Map();     // seite|segment|lastfall -> {OG, UG}
  for (const s of staebe) {
    const m = /^(OG|UG)([LR])_S(\d+)$/.exec(String(s.Stab));
    if (!m || !FELDQS(s.Querschnitt)) continue;
    const [, lage, seite, seg] = m;
    const k = `${seite}|${String(seg).padStart(3, '0')}|${s.Lastfall}`;
    if (!idx.has(k)) idx.set(k, {});
    idx.get(k)[lage] = s;
  }
  const roh = [];
  for (const [k, paar] of idx) {
    if (!paar.OG || !paar.UG) continue;
    const [seite, seg, fall] = k.split('|');
    /*
     * Weg 1 - Querkraft: lokal y ist beim Gurt die Lotrechte.
     *
     * Genommen wird das MITTEL beider Stabenden, nicht der Wert am Anfang.
     * Auf dem Obergurt liegt Schnee, auf beiden Gurten das Eigengewicht -
     * diese Streckenlast laesst die Querkraft ueber das Segment anwachsen
     * und gehoert nicht zur Aufteilung. Am Anfang abgelesen schlug sie voll
     * durch und riss die Gegenprobe an einzelnen Stellen auf 57.6 % auf,
     * waehrend das Endmoment dort sauber bei 48.3 % stand.
     */
    const vOG = (paar.OG.Vy_i - paar.OG.Vy_j) / 2;
    const vUG = (paar.UG.Vy_i - paar.UG.Vy_j) / 2;
    // Weg 2 - Endmoment: Biegung in der Vertikalebene ist das Moment um die
    // lokale z-Achse. Genommen wird das groessere der beiden Stabenden,
    // damit nicht am Momentennullpunkt abgelesen wird.
    const mOG = Math.abs(paar.OG.Mz_i) > Math.abs(paar.OG.Mz_j)
      ? paar.OG.Mz_i : paar.OG.Mz_j;
    const mUG = Math.abs(paar.UG.Mz_i) > Math.abs(paar.UG.Mz_j)
      ? paar.UG.Mz_i : paar.UG.Mz_j;
    const sumV = Math.abs(vOG) + Math.abs(vUG);
    const sumM = Math.abs(mOG) + Math.abs(mUG);
    roh.push({ key: k, seite, seg: Number(seg), fall,
               anteilV: sumV > 0 ? Math.abs(vOG) / sumV : null,
               anteilM: sumM > 0 ? Math.abs(mOG) / sumM : null,
               sumV, sumM });
  }
  // Die Segmentnummern der Feldstuecke stehen nicht dicht; welche die
  // aeussersten sind, muss aus der vorkommenden Liste kommen.
  const segs = [...new Set(roh.map((r) => r.seg))].sort((a, b) => a - b);
  const randSeg = new Set([...segs.slice(0, RANDFELDER), ...segs.slice(-RANDFELDER)]);
  /*
   * SCHWELLE - UND ZWAR ÜBER ALLE LASTFÄLLE, NICHT JE LASTFALL.
   *
   * Die erste Fassung bezog die Schwelle auf den grössten Wert DESSELBEN
   * Lastfalls. Damit blieb Querwind am Joch ohne Anbauteile drin: dort ist
   * die LOTRECHTE Gurtquerkraft ein Nebenprodukt von 0.03 kN - klein, aber
   * eben der grösste Wert seines eigenen Lastfalls. Der Anteil aus zwei
   * solchen Resten schwankte zwischen 0 und 100 % und riss den Fit auf
   * k = −1.29 herunter.
   *
   * Gemessen wird in der VERTIKALebene; Querwind ohne hängende Last gehört
   * dort schlicht nicht hin. Der Bezug ist deshalb der grösste Wert des
   * ganzen Laufs, dazu eine absolute Untergrenze.
   */
  const maxAlle = roh.reduce((a, r) => Math.max(a, r.sumV), 0);
  return roh.map((r) => ({
    ...r,
    rand: randSeg.has(r.seg),
    schwach: r.sumV < Math.max(0.05, 0.10 * maxAlle),
  })).filter((r) => r.anteilV !== null && r.anteilM !== null);
}

/**
 * Stellt zwei Läufe Segment für Segment gegenüber.
 * Zurück kommt je Schlüssel die Differenz der Obergurtanteile - der Anteil,
 * der allein auf das verschiedene Steifigkeitsverhältnis zurückgeht.
 */
function differenz(wirklich, gleich, { ohneRand = true } = {}) {
  const ref = new Map(gleich.map((r) => [r.key, r]));
  const paare = [];
  for (const w of wirklich) {
    const g = ref.get(w.key);
    if (!g) continue;
    if (ohneRand && (w.rand || w.schwach || g.schwach)) continue;
    paare.push({
      key: w.key, seite: w.seite, seg: w.seg, fall: w.fall,
      dV: w.anteilV - g.anteilV,
      dM: w.anteilM - g.anteilM,
      anteilV: w.anteilV, anteilM: w.anteilM,
      refV: g.anteilV, refM: g.anteilM,
      gewicht: w.sumV,
    });
  }
  return paare;
}

/** Gewichtetes Mittel, Median und Spanne einer Messreihe. */
function statistik(werte, gewichte = null) {
  if (!werte.length) return null;
  const s = [...werte].sort((a, b) => a - b);
  const summe = gewichte
    ? werte.reduce((a, v, i) => a + v * gewichte[i], 0) / gewichte.reduce((a, g) => a + g, 0)
    : werte.reduce((a, v) => a + v, 0) / werte.length;
  return {
    mittel: summe,
    median: s[Math.floor(s.length / 2)],
    min: s[0], max: s[s.length - 1], n: werte.length,
  };
}

const pz = (x) => (x * 100).toFixed(1);

/* ===========================================================================
 * 4 · LAUF
 * =========================================================================== */

console.log('KALIBRIERUNG DER GEFITTETEN KENNWERTE');
console.log('Arbeitsordner:', ARBEIT);
console.log('');

const ergebnisse = [];

if (!NUR || NUR === 'daempfung') {
  console.log('='.repeat(108));
  console.log('GURT_DAEMPFUNG  -  gemessen als DIFFERENZ gegen denselben Träger mit gleichen Gurten');
  console.log('='.repeat(108));
  console.log('');

  const gegenprobe = [];

  for (const { typ, zweck } of TYPEN) {
    const joch = T.getTragjoch(typ);
    const og = P.getProfil(joch.og.profil), ug = P.getProfil(joch.ug.profil);
    const I = (p) => p.iy * p.iy * p.A;
    const stAnteil = I(og) / (I(og) + I(ug));
    const verh = I(og) / I(ug);
    const d = stAnteil - 0.5;

    console.log(`--- ${typ}  (${joch.og.profil} / ${joch.ug.profil}, `
      + `I_OG/I_UG = ${verh.toFixed(2)}, nach I = ${pz(stAnteil)} %, `
      + `mit k=0.42 = ${pz(0.5 + 0.42 * (stAnteil - 0.5))} %)  [${zweck}]`);

    const laengen = laengenFuer(joch);
    const anordnungen = SCHNELL ? ['leer', 'mitte'] : ANORDNUNGEN;

    for (const L of laengen) {
      for (const anordnung of anordnungen) {
        let a, b;
        try {
          a = rechne(`${typ}_L${L}_${anordnung}`,
                     eingabe(typ, L, anordnung, 'wirklich'));
          b = rechne(`${typ}_L${L}_${anordnung}_gleich`,
                     eingabe(typ, L, anordnung, 'gleich'));
        } catch (e) {
          console.log(`    L=${L} ${anordnung}: FEHLER ${String(e.message).slice(0, 80)}`);
          continue;
        }
        const mW = gurtanteile(a.staebe);
        const mG = gurtanteile(b.staebe);
        const paare = differenz(mW, mG);

        // Die Gegenprobe haengt am REFERENZlauf: gleiche Gurte, keine
        // Anbauteile - da muss ueberall 50.0 % stehen.
        if (anordnung === 'leer') {
          mG.filter((r) => !r.schwach && !r.rand)
            .forEach((r) => gegenprobe.push({ typ, L, fall: r.fall, seg: r.seg,
                                              anteilV: r.anteilV, anteilM: r.anteilM }));
        }

        const proFall = new Map();
        paare.forEach((x) => {
          if (!proFall.has(x.fall)) proFall.set(x.fall, []);
          proFall.get(x.fall).push(x);
        });
        for (const [fall, liste] of proFall) {
          const g = liste.map((x) => x.gewicht);
          const sV = statistik(liste.map((x) => x.dV), g);
          const sM = statistik(liste.map((x) => x.dM), g);
          const sRef = statistik(liste.map((x) => x.refV), g);
          const kV = Math.abs(d) < 1e-9 ? null : sV.mittel / d;
          const kM = Math.abs(d) < 1e-9 ? null : sM.mittel / d;
          console.log(`    L=${String(L).padEnd(5)}${anordnung.padEnd(12)}${fall.padEnd(8)}`
            + ` dV ${(sV.mittel * 100).toFixed(2).padStart(6)} Pp`
            + ` -> k ${(kV === null ? '  —  ' : kV.toFixed(3)).padStart(6)}`
            + `   dM ${(sM.mittel * 100).toFixed(2).padStart(6)} Pp`
            + ` -> k ${(kM === null ? '  —  ' : kM.toFixed(3)).padStart(6)}`
            + `   Ref ${pz(sRef.mittel).padStart(5)} %   n=${sV.n}`);
          ergebnisse.push({ typ, L, anordnung, fall, verh, stAnteil,
                            dV: sV.mittel, dM: sM.mittel, kV, kM,
                            refV: sRef.mittel, minV: sV.min, maxV: sV.max, n: sV.n });
        }
      }
    }
    console.log('');
  }

  // --- Die Gegenprobe entscheidet, ob der Rest gilt -----------------------
  console.log('-'.repeat(108));
  if (gegenprobe.length) {
    // Getrennt fuer beide Messwege - wenn einer besteht und der andere
    // nicht, ist genau DAS die Aussage und darf nicht verschwinden.
    const abV = gegenprobe.reduce((a, e) => Math.max(a, Math.abs(e.anteilV - 0.5)), 0);
    const abM = gegenprobe.reduce((a, e) => Math.max(a, Math.abs(e.anteilM - 0.5)), 0);
    const ab = Math.min(abV, abM);
    console.log(`GEGENPROBE  gleiche Gurte ohne Anbauteile, ${gegenprobe.length} Messstellen:`
      + ` groesste Abweichung von 50.0 %`);
    console.log(`            ueber die Querkraft ${(abV * 100).toFixed(2)} Pp`
      + `   ueber das Moment ${(abM * 100).toFixed(2)} Pp`);
    /*
     * SCHWELLE 2.0 PROZENTPUNKTE - UND WARUM NICHT SCHÄRFER.
     *
     * Ganz auf 50.0 kommt die Gegenprobe nicht, und sie soll es auch nicht:
     * der Schnee liegt physisch AUF dem Obergurt. Diese Last läuft dort ein,
     * wo sie aufliegt, nicht nach Steifigkeit - ein Rest von rund 1.5 Pp
     * bleibt deshalb übrig und ist richtig so. In der DIFFERENZ zweier Läufe
     * fällt er heraus, weil er in beiden gleich wirkt; die Gegenprobe misst
     * aber den absoluten Anteil und sieht ihn.
     *
     * Was die Probe finden soll, ist eine Größenordnung darüber: die 7.6 Pp
     * der Ablesung am Stabanfang und die 18.7 Pp der zu weichen Schwelle.
     */
    if (ab > 0.020) {
      console.log('  >>> NICHT BESTANDEN - die Messmethode misst etwas anderes als');
      console.log('  >>> den Steifigkeitsanteil. Die Zahlen unten sind nicht belastbar.');
      console.log('  Die groessten Ausreisser - hier ist nachzusehen, nicht zu mitteln:');
      [...gegenprobe]
        .sort((a, b) => Math.abs(b.anteilV - 0.5) - Math.abs(a.anteilV - 0.5))
        .slice(0, 6)
        .forEach((e) => console.log(`    ${e.typ} L=${e.L} ${e.fall} Segment ${e.seg}:`
          + ` V ${pz(e.anteilV)} %   M ${pz(e.anteilM)} %`));
    } else {
      console.log('  bestanden - die Messmethode trifft den Steifigkeitsanteil.');
    }
  }
  console.log('');

  // --- k je Typ ------------------------------------------------------------
  console.log('-'.repeat(108));
  console.log('AUSWERTUNG   k aus   Anteil = 0.5 + k · (I_OG/ΣI − 0.5)');
  console.log('-'.repeat(108));
  console.log('Typ      I_OG/I_UG    k(V) Mittel   Spanne k(V)      k(M) Mittel   Spanne k(M)    n   heute');
  const jeTyp = [];
  for (const { typ } of TYPEN) {
    const r = ergebnisse.filter((e) => e.typ === typ && e.kV !== null);
    if (!r.length) continue;
    const sV = statistik(r.map((e) => e.kV));
    const sM = statistik(r.map((e) => e.kM));
    jeTyp.push({ typ, verh: r[0].verh, kV: sV.mittel, kM: sM.mittel, n: r.length });
    console.log(`${typ.padEnd(9)}${r[0].verh.toFixed(2).padStart(8)}`
      + `${sV.mittel.toFixed(3).padStart(14)}`
      + `   ${sV.min.toFixed(2)} … ${sV.max.toFixed(2)}`.padEnd(18)
      + `${sM.mittel.toFixed(3).padStart(12)}`
      + `   ${sM.min.toFixed(2)} … ${sM.max.toFixed(2)}`.padEnd(18)
      + `${String(r.length).padStart(4)}`
      + `${QS.GURT_DAEMPFUNG.toFixed(2).padStart(8)}`);
  }
  console.log('');
  if (jeTyp.length) {
    const alle = ergebnisse.filter((e) => e.kV !== null);
    const kV = statistik(alle.map((e) => e.kV));
    const kM = statistik(alle.map((e) => e.kM));
    console.log(`ÜBER ALLE FÄLLE   k(V) = ${kV.mittel.toFixed(3)}   `
      + `k(M) = ${kM.mittel.toFixed(3)}   (heute angesetzt: ${QS.GURT_DAEMPFUNG})`);
    // Wandert k mit dem Steifigkeitsverhaeltnis, ist nicht die Zahl falsch,
    // sondern die Form der Formel. Das muss sichtbar werden.
    const mit = jeTyp.filter((t) => t.verh > 1.01).sort((a, b) => a.verh - b.verh);
    if (mit.length >= 2) {
      const erst = mit[0], letzt = mit[mit.length - 1];
      console.log('WANDERT k MIT DEM STEIFIGKEITSVERHÄLTNIS?');
      for (const [was, feld] of [['ueber die Querkraft', 'kV'], ['ueber das Moment', 'kM']]) {
        const spanne = Math.abs(letzt[feld] - erst[feld]);
        console.log(`   ${was.padEnd(22)} ${erst.typ} (${erst.verh.toFixed(2)}) `
          + `k=${erst[feld].toFixed(3)}  ->  ${letzt.typ} (${letzt.verh.toFixed(2)}) `
          + `k=${letzt[feld].toFixed(3)}   Unterschied ${spanne.toFixed(3)}`
          + (spanne > 0.08 ? '   << keine Konstante' : '   << haelt'));
      }
      console.log('   Wandert k, ist nicht die Zahl das Problem, sondern die lineare');
      console.log('   Form der Formel - sie kennt nur I/ΣI und sonst nichts.');
    }
  }
  console.log('');
}

/* ===========================================================================
 * 5 · ENDFELD_ZUSCHLAG
 * ===========================================================================
 * Gefragt ist, um wieviel der Ersatzbalken das Blechmoment nahe dem Auflager
 * unterschätzt. Die alte Messung fand am äussersten Blech Faktor 2.71 - aber
 * gegen ein AxisVM-Modell, das Achse zu Achse rechnet, während das Werkzeug
 * am Anschnitt nachweist. Allein daraus kommen 1.3 bis 1.6, und was von der
 * Einleitung selbst stammt, blieb Schätzung: 2.71/1.45 ≈ 1.9, angesetzt 2.0.
 *
 * HIER FÄLLT DIESE VERMISCHUNG WEG. Das PyNite-Modell wird mit demselben
 * Knotenmodell gerechnet, das der Nachweis benutzt ('anschnitt'): steife
 * Knotenbereiche, Ablesung am Rand des weichen Blechstücks. Was dann noch
 * übrig bleibt, IST die örtliche Einleitung - ohne Umrechnung, ohne Abzug.
 *
 * Verglichen wird gegen das Werkzeug mit ABGESCHALTETEM Zuschlag
 * (endfeldZuschlag: false); sonst misst man gegen den bereits erhöhten Wert.
 */
if (!NUR || NUR === 'endfeld') {
  console.log('='.repeat(108));
  console.log('ENDFELD_ZUSCHLAG  -  Blechmoment FEM / Werkzeug, von aussen nach innen');
  console.log('='.repeat(108));
  console.log('');

  // Die PyNite-Lastfaelle heissen wie die Einwirkungen; die Lastfaelle des
  // Werkzeugs heissen anders. Zugeordnet wird ueber die Beiwerte: gesucht ist
  // der charakteristische Lastfall, in dem genau diese eine Einwirkung steht.
  function werkzeugLastfall(faelle, einwirkung) {
    return faelle.find((l) => {
      const b = l.beiwerte ?? {};
      const eins = Object.entries(b).filter(([, v]) => Math.abs(v) > 1e-9);
      return eins.length === 1 && eins[0][0] === einwirkung;
    });
  }

  const endErg = [];

  for (const { typ } of TYPEN) {
    const joch = T.getTragjoch(typ);
    const laengen = laengenFuer(joch);
    // Ohne exzentrische Last gibt es keine Torsion - und ohne Torsion ist
    // nach der Formel auch nichts zuzuschlagen. Beide Anordnungen laufen
    // deshalb nebeneinander: die eine sagt, was der Zuschlag tut, die andere,
    // was er lassen soll.
    const anordnungen = SCHNELL ? ['exzentrisch'] : ['mitte', 'exzentrisch', 'einseitig'];

    for (const L of laengen) {
      for (const anordnung of anordnungen) {
        let lauf;
        try {
          lauf = rechne(`${typ}_L${L}_${anordnung}`, eingabe(typ, L, anordnung));
        } catch (e) {
          console.log(`  ${typ} L=${L} ${anordnung}: FEHLER ${String(e.message).slice(0, 70)}`);
          continue;
        }
        const orte = stabOrte(lauf.bau);
        const w = eingabe(typ, L, anordnung);
        const lfListe = LA.standardLastfaelle(w).filter((l) => l.art === 'charakteristisch');

        // --- FEM: Blechmoment am Anschnitt, je Ort und Ebene ---------------
        // Vertikalblech biegt um seine starke Achse = lokal z, das
        // Horizontalblech um lokal y (siehe Achsenblock in export.pynite.js).
        const fem = new Map();          // fall|art|x -> groesstes |M|
        for (const s of lauf.staebe) {
          const m = /^B(V|H)_([LROU])_/.exec(String(s.Stab));
          if (!m || String(s.Querschnitt).startsWith('STARR')) continue;
          const art = m[1] === 'V' ? 'vertikal' : 'horizontal';
          const M = art === 'vertikal'
            ? Math.max(Math.abs(s.Mz_i), Math.abs(s.Mz_j))
            : Math.max(Math.abs(s.My_i), Math.abs(s.My_j));
          const x = orte.get(s.Stab);
          if (x === undefined) continue;
          const k = `${s.Lastfall}|${art}|${x.toFixed(3)}`;
          fem.set(k, Math.max(fem.get(k) ?? 0, M));
        }

        for (const einwirkung of ['G', 'Schnee', 'WindY']) {
          const lf = werkzeugLastfall(lfListe, einwirkung);
          if (!lf) continue;
          // Werkzeug OHNE Zuschlag - sonst wird gegen den erhoehten Wert
          // gemessen und der Faktor faellt um sich selbst zu klein aus.
          const e = V.berechne(
            { ...w, lastfall: lf.key, beiwerteFest: null, endfeldZuschlag: false },
            P.getProfil(w.profOG), P.getProfil(w.profUG),
            P.getStahl(w.stahl), joch);

          const zeilen = [];
          for (const kn of e.knoten) {
            for (const eb of kn.ebenen) {
              if (eb.M == null || !(eb.M > 1e-6)) continue;
              const mf = fem.get(`${einwirkung}|${eb.art}|${kn.x.toFixed(3)}`);
              if (mf === undefined || !(mf > 1e-6)) continue;
              zeilen.push({
                x: kn.x, art: eb.art, id: eb.id,
                werkzeug: eb.M, fem: mf, verh: mf / eb.M,
                endfeld: eb.endfeld === true,
                tAnteil: eb.V_Ebene > 0
                  ? Math.min(1, Math.abs(eb.anteilTorsion ?? 0) / eb.V_Ebene) : 0,
              });
            }
          }
          if (!zeilen.length) continue;

          // Nach Abstand vom naechsten Jochende ordnen - der Zuschlag ist
          // eine Frage der Entfernung zum Auflager, nicht der x-Koordinate.
          const rand = (z) => Math.min(z.x, L - z.x);
          zeilen.sort((a, b) => rand(a) - rand(b));
          const vert = zeilen.filter((z) => z.art === 'vertikal');
          const zeig = vert.slice(0, 8);
          console.log(`--- ${typ} L=${L} ${anordnung} · ${einwirkung}`);
          console.log('     Abstand vom Ende   Werkzeug     FEM   Verhaeltnis  Torsionsanteil  Endfeld');
          zeig.forEach((z) => {
            console.log(`     ${rand(z).toFixed(2).padStart(10)} m`
              + `${z.werkzeug.toFixed(3).padStart(11)}`
              + `${z.fem.toFixed(3).padStart(9)}`
              + `${z.verh.toFixed(2).padStart(12)}`
              + `${(z.tAnteil * 100).toFixed(0).padStart(13)} %`
              + `${(z.endfeld ? '  ja' : '  —').padStart(9)}`);
          });
          // k_E aus  Verhaeltnis = 1 + (k_E − 1) · Torsionsanteil
          const imEnd = vert.filter((z) => z.endfeld && z.tAnteil > 0.05);
          if (imEnd.length) {
            const kE = imEnd.map((z) => 1 + (z.verh - 1) / z.tAnteil);
            const s = statistik(kE);
            console.log(`     -> k_E = ${s.mittel.toFixed(2)}`
              + `   (${s.min.toFixed(2)} … ${s.max.toFixed(2)}, n=${s.n})`
              + `   heute ${QS.ENDFELD_ZUSCHLAG.toFixed(1)}`);
            endErg.push({ typ, L, anordnung, einwirkung, kE: s.mittel,
                          min: s.min, max: s.max, n: s.n });
          } else {
            const ohne = statistik(vert.filter((z) => z.endfeld).map((z) => z.verh));
            if (ohne) {
              console.log(`     -> kein Torsionsanteil im Endfeld; das Verhaeltnis dort`
                + ` betraegt ${ohne.mittel.toFixed(2)}.`);
              console.log(`        Liegt es ueber 1, greift der Zuschlag in seiner`
                + ` heutigen Form NICHT - er haengt am Torsionsanteil.`);
              endErg.push({ typ, L, anordnung, einwirkung, kE: null,
                            verhOhneTorsion: ohne.mittel, n: ohne.n });
            }
          }
          console.log('');
        }
      }
    }
  }

  if (endErg.length) {
    console.log('-'.repeat(108));
    const mitK = endErg.filter((e) => e.kE !== null);
    if (mitK.length) {
      const s = statistik(mitK.map((e) => e.kE));
      console.log(`ENDFELD_ZUSCHLAG   gemessen k_E = ${s.mittel.toFixed(2)}`
        + `   (${s.min.toFixed(2)} … ${s.max.toFixed(2)} ueber ${s.n} Faelle)`
        + `   heute angesetzt ${QS.ENDFELD_ZUSCHLAG}`);
    }
    const ohneK = endErg.filter((e) => e.kE === null);
    if (ohneK.length) {
      const s = statistik(ohneK.map((e) => e.verhOhneTorsion));
      console.log(`OHNE TORSION im Endfeld: Verhaeltnis FEM/Werkzeug = ${s.mittel.toFixed(2)}`
        + ` (${s.min.toFixed(2)} … ${s.max.toFixed(2)}, ${s.n} Faelle).`);
      console.log('   Der Zuschlag greift dort nicht, weil er am Torsionsanteil haengt.');
      console.log('   Weicht diese Zahl deutlich von 1 ab, ist die FORM zu pruefen,');
      console.log('   nicht die Groesse von k_E.');
    }
    writeFileSync('kalibrierung_endfeld.json', JSON.stringify(endErg, null, 1));
    console.log(`Messwerte: kalibrierung_endfeld.json (${endErg.length} Zeilen)`);
  }
  console.log('');
}

// Nur schreiben, wenn dieser Lauf ueberhaupt gemessen hat: sonst leert
// `--nur endfeld` die Messwerte des Daempfungslaufs, der Stunden gekostet hat.
if (ergebnisse.length) {
  writeFileSync('kalibrierung_messwerte.json', JSON.stringify(ergebnisse, null, 1));
  console.log(`Messwerte: kalibrierung_messwerte.json (${ergebnisse.length} Zeilen)`);
}
