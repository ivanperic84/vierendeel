/**
 * export.pynite.js
 * ---------------------------------------------------------------------------
 * PYNITE-AUSLEITUNG: schreibt ein lauffähiges Python-Skript.
 * Reine Funktionen, kein DOM.
 *
 * WARUM
 * Das SAF-Interface von AxisVM ist ein kostenpflichtiges Modul; ohne dieses
 * bleibt für AxisVM nur der DXF-Weg mit Handarbeit. PyNite ist ein freies
 * 3D-Stabwerksprogramm für Python und liefert eine UNABHÄNGIGE Gegenrechnung,
 * die heute läuft - nicht als Ersatz für die Verifizierung durch ein geprüftes
 * Programm, wohl aber als Antwort auf die drei offenen Fachfragen:
 * Knotenmodell, Torsionsverteilung, örtliche Lasteinleitung.
 *
 * Das Modell selbst kommt aus `stabmodell()` in export.axisvm.js - dieselbe
 * Knoten-Stab-Last-Liste, die auch SAF und DXF verpacken. Hier ist nur die
 * Verpackung eine andere.
 *
 * ACHSEN - ACHTUNG, PYNITE RECHNET MIT Y NACH OBEN
 * PyNite legt die lokalen Stabachsen so, dass die globale Y-Achse die
 * Lotrechte ist (`Member3D.T`). Die Koordinaten werden deshalb beim Schreiben
 * getauscht:
 *
 *      unser X (Jochachse)      -> PyNite X
 *      unser Z (nach oben)      -> PyNite Y
 *      unser Y (Gleisrichtung)  -> PyNite Z
 *
 * Die AUSGABE dreht zurück: das Skript schreibt seine Tabellen wieder in
 * unserer Achsenbenennung, damit sie neben dem Blatt «Vergleich» stehen
 * können, ohne dass jemand im Kopf umrechnet.
 *
 * TRÄGHEITSMOMENTE UND DREHLAGE
 * PyNite nimmt je Querschnitt Iy und Iz in den LOKALEN Achsen. Welche das
 * sind, hängt von der Stabrichtung ab:
 *
 *   Gurt (in Jochachse)   lokal y = lotrecht, lokal z = Gleisrichtung
 *                         -> unser I_y (Vertikalbiegung) ist PyNite Iz
 *   Vertikalblech         lokal y = -Jochachse, lokal z = Gleisrichtung
 *                         -> die starke Achse ist Iz
 *   Horizontalblech       lokal y = lotrecht, lokal z = -Jochachse
 *                         -> die starke Achse ist Iy
 *
 * Ein vertauschtes Paar fiele sofort auf: bei einem Blech unterscheiden sich
 * die beiden Trägheitsmomente um den Faktor (b/t)², beim 100 × 8 also 156.
 * ---------------------------------------------------------------------------
 */

import { EINWIRKUNGEN } from './core.lasten.js';
import { winkelwerteFuer } from './core.winkel.js';
import { getProfil } from './data.profiles.js';
import { ECKEN } from './geometry.js';
import { stabmodell, lasten, stuetzung, blattWennMehrere, stabmodellJson }
  from './export.axisvm.js';
import { dreibein } from './core.stabwerk.js';
import { herunterladen } from './export.xlsx.js';

/** Rechteck: starke und schwache Achse sowie St-Venant (dünnes Rechteck). */
function rechteckWerte(bMm, tMm) {
  const b = bMm / 1000, t = tMm / 1000;
  const gross = Math.max(b, t), klein = Math.min(b, t);
  return {
    A: b * t,
    stark: (t * b ** 3) / 12,
    schwach: (b * t ** 3) / 12,
    // Näherung für das schmale Rechteck, mit Beiwert nach Timoshenko
    J: gross * klein ** 3 * (1 / 3 - 0.21 * (klein / gross)),
  };
}

const py = (v) => (Number.isFinite(v) ? Number(v.toPrecision(10)) : 0);
const s = (v) => `'${String(v).replace(/'/g, "\\'")}'`;

/**
 * SCHUBWEICHE BINDEBLECHE.
 *
 * PyNite rechnet reine Bernoulli-Stäbe - ohne Schubverformung. Für schlanke
 * Stäbe ist das richtig, für die Bindebleche nicht: sie sind kurz und
 * gedrungen, und im Vierendeel arbeiten sie in DOPPELTER KRÜMMUNG. Genau in
 * dieser Verformungsform ist der Schubanteil gross:
 *
 *      φ = 12·E·I / (G·A_s·L²)      A_s = 5/6·A beim Rechteck
 *
 *      Bl.160x10, L = 420 mm   ->  φ = 0.45   (45 % mehr Nachgiebigkeit)
 *      Bl.110x10, L = 400 mm   ->  φ = 0.24
 *      Bl.90x10,  L = 400 mm   ->  φ = 0.16
 *
 * Der Vergleichsexport von AxisVM weist für jeden Querschnitt A_y und A_z aus;
 * dort ist die Schubverformung enthalten. Ohne sie ist das PyNite-Modell in
 * den Blechen zu steif - und weil die Bleche im Rahmen ausgleichen, verzerrt
 * das jede daran geeichte Grösse, allen voran die Aufteilung der
 * Ebenenquerkraft auf die Gurte.
 *
 * ERSATZ: für einen Stab in doppelter Krümmung ist die Steifigkeit
 * 12EI/(L³(1+φ)). Ein Bernoulli-Stab mit I_eff = I/(1+φ) hat GENAU diese
 * Steifigkeit. Die reinen Drehsteifigkeiten (4EI/L, 2EI/L) trifft der Ersatz
 * nicht exakt - für das Bindeblech ist die doppelte Krümmung aber die
 * Arbeitsform, und die stimmt.
 *
 * Weil φ von der Stablänge abhängt, bekommt jede vorkommende Länge ihren
 * eigenen Querschnitt (Name mit angehängtem _L###).
 */
const SCHUB_NU = 0.3;
const SCHUB_KAPPA = 5 / 6;                     // Schubfläche des Rechtecks

/*
 * DAS BLECH AM NAMEN - UND IM BLATT TRAEGT ER EIN PRAEFIX.
 *
 * Im Blattmodell heisst der Querschnitt «T1_BLECH_V_100x10» statt
 * «BLECH_V_100x10» (20. September, derselbe Befund wie in der
 * AxisVM-Ausleitung). Ohne das fuehrende Tragwerkskuerzel fiel die
 * Erkennung durch: die Bleche bekamen die Drehlage und die Schubweichheit
 * eines quadratischen Ersatzquerschnitts.
 */
const istBlech = (n) => /(?:^|_)BLECH/.test(String(n));
const istBlechV = (n) => /(?:^|_)BLECH_V/.test(String(n));
const istBlechH = (n) => /(?:^|_)BLECH_H/.test(String(n));

function blechlaengen(bau) {
  const nach = new Map();                      // Querschnittsname -> Set Längen
  const abst = (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  bau.staebe.forEach((st) => {
    if (!istBlech(st.qs)) return;
    const a = bau.knoten.get(st.von), b = bau.knoten.get(st.bis);
    if (!a || !b) return;
    const l = abst(a, b);
    if (!(l > 0)) return;
    if (!nach.has(st.qs)) nach.set(st.qs, new Set());
    nach.get(st.qs).add(Math.round(l * 1000) / 1000);
  });
  return nach;
}

/**
 * Querschnittszeilen für PyNite: Name, A, Iy, Iz, J in lokalen Achsen.
 * @param {object} bau Ergebnis von stabmodell()
 * @param {boolean} schubweich Bindebleche mit Ersatzträgheitsmoment
 */
/*
 * MESSOPTION: DIE GURTE IN IHREN HAUPTACHSEN, UM 45 GRAD GEDREHT.
 *
 * Ein Stabmodell mit Iy und Iz in den SCHENKELACHSEN kann die schiefe
 * Biegung des Winkels gar nicht zeigen: die beiden Richtungen sind darin
 * entkoppelt, I_yz kommt nicht vor, und das Horizontalblech bekommt unter
 * Vertikallast exakt null. Genau das ist der Grund, warum der Zusatzterm
 * (SCHIEFE_BIEGUNG in core.querschnitt.js) hergeleitet werden musste.
 *
 * PyNite kann es doch - nicht ueber I_yz, sondern GEOMETRISCH: der Stab
 * bekommt seine HAUPTTRAEGHEITSMOMENTE und wird um seine Laengsachse
 * gedreht. Beim gleichschenkligen Winkel liegen die Hauptachsen unter 45
 * Grad zu den Schenkeln.
 *
 * Am Kragarm nachgerechnet (L 100x100x10, Endmoment um die schenkelparallele
 * Achse):
 *
 *      Drehung   quer / vertikal      analytisch |I_yz| / I_z = 0.5885
 *          0     0.0000
 *        +45     0.5885
 *        -45     0.5885 (Vorzeichen gekehrt)
 *
 * und die Vertikalverschiebung traf auf alle Stellen den Wert mit
 * I* = D/I_z. PyNite bildet den Vorgang also exakt ab.
 *
 * DIESE OPTION DIENT DER MESSUNG, nicht dem Nachweis. Der Ausleitung fuer
 * den Auftraggeber bleibt sie fern: dort stehen die Gurte schenkelparallel,
 * wie in jedem Pruefmodell.
 */
function querschnitte(bau, schubweich = true, gurteSchief = false) {
  const zeilen = [];
  const laengen = schubweich ? blechlaengen(bau) : new Map();
  // Alles in SI: I in m⁴, A in m², L in m. E kürzt sich mit G/E heraus.
  const phi = (I, A, L) => {
    const GE = 1 / (2 * (1 + SCHUB_NU));       // G/E
    return (12 * I) / (GE * SCHUB_KAPPA * A * L * L);
  };
  bau.querschnitte.forEach((q) => {
    if (q.form === 'Angle') {
      if (gurteSchief) {
        // Hauptachsen statt Schenkelachsen. Die Zuordnung ist am Kragarm
        // geprueft: mit (I1, I2) und 45 Grad ergibt sich I* und der
        // Querverschiebungsanteil analytisch richtig.
        const w = winkelwerteFuer(getProfil(q.profil));
        zeilen.push({ name: q.name, A: q.A,
                      Iy: w.I1 / 1e12, Iz: w.I2 / 1e12, J: q.It });
        return;
      }
      // Gurt: unser I_y wirkt gegen die Vertikalbiegung, das ist PyNite Iz
      zeilen.push({ name: q.name, A: q.A, Iy: q.Iz, Iz: q.Iy, J: q.It });
      return;
    }
    /* =====================================================================
     * >>> WER SEINE WERTE MITBRINGT, BEHAELT SIE. <<<
     * ===================================================================
     *
     * Hier stand nur `q.parameter[0] x q.parameter[1]` als Rechteck. Fuer
     * STARR (500x500), ARM und die Bleche ist das richtig - sie FUEHREN
     * keine Werte, ihre Form ist die Angabe.
     *
     * Der MAST fuehrt seine Werte, und er fiel trotzdem in diesen Zweig:
     * seine Parameter sind [h, b, s, t, r] eines I-Profils, und daraus
     * wurde ein VOLLQUADRAT 240 x 240 mm. Am HEB 240:
     *
     *     A    0.0106 -> 0.0576 m2        (5.4-fach)
     *     Iy   1.126e-4 -> 2.765e-4       (2.5-fach)
     *     Iz   3.923e-5 -> 2.765e-4       (7.0-fach)
     *
     * Gefunden am 24. September: der Mastkopf stand gegen den eigenen
     * Loeser um FAKTOR 7.02 daneben - genau das Verhaeltnis der Iz. Der
     * Kommentar darunter sagte «STARR und ARM sind quadratisch»; das
     * stimmte, als er geschrieben wurde. Die Masten kamen spaeter dazu.
     *
     * Und weil das Quadrat Iy = Iz hat, war der Mast in PyNite GEGEN JEDE
     * DREHUNG UNEMPFINDLICH - die Stegrichtung, ueber die das Sortiment
     * entscheidet, kam dort nie an.
     * =================================================================== */
    if (q.form !== 'Rectangle' && q.A != null && q.Iy != null && q.Iz != null) {
      zeilen.push({ name: q.name, A: q.A, Iy: q.Iy, Iz: q.Iz,
                    J: q.It ?? (q.Iy + q.Iz) / 2 });
      return;
    }

    const [a, b] = q.parameter;
    const r = rechteckWerte(a, b);
    if (!istBlech(q.name)) {
      // STARR und ARM sind quadratisch - die Drehlage spielt keine Rolle
      zeilen.push({ name: q.name, A: r.A, Iy: r.stark, Iz: r.stark, J: r.J });
      return;
    }

    /* =====================================================================
     * >>> DIE BLECHE STEHEN IN IHREN EIGENEN ACHSEN - NICHT IM NAMEN. <<<
     * ===================================================================
     *
     * Hier entschied bisher der NAME (BV/BH), welches Traegheitsmoment auf
     * PyNites Iy kam: das liegende bekam die starke Achse auf Iy, das
     * stehende auf Iz. Das war richtig gerechnet - und es war der ERSATZ
     * dafuer, dass PyNite die Drehlage nicht bekam. Beides zusammen waere
     * eine DOPPELTE Drehung; die waagrechten Bleche stuenden dann um 90
     * Grad falsch, und bei Iy/Iz = 0.010 ist das Faktor 100.
     *
     * Also stehen die Werte jetzt so da, wie sie im Querschnitt liegen -
     * die duenne Richtung auf Iy, die breite auf Iz, fuer BEIDE Lagen
     * gleich (die Parameter sind ja dieselben). Wie das Blech im Raum
     * steht, sagt allein `lcsZ`, genau wie beim Loeser.
     *
     * Physikalisch aendert das nichts. Was sich aendert, ist die BENENNUNG
     * der lokalen Momente der liegenden Bleche in `pynite_staebe.csv`:
     * ihre starke Biegung heisst jetzt Mz statt My. `kalibrieren.mjs`
     * liest diese Spalten - es ist mitgezogen.
     * =================================================================== */
    const satz = laengen.get(q.name);
    if (!satz || !satz.size) {
      zeilen.push({ name: q.name, A: r.A, Iy: r.schwach, Iz: r.stark, J: r.J });
      return;
    }
    [...satz].sort((x, y) => x - y).forEach((L) => {
      const f = 1 + phi(r.stark, r.A, L);
      const stark = r.stark / f;
      const nam = satz.size > 1 || schubweich
        ? `${q.name}_L${Math.round(L * 1000)}` : q.name;
      zeilen.push({ name: nam, A: r.A, Iy: r.schwach, Iz: stark, J: r.J,
                    quelle: q.name, L, phi: f - 1 });
    });
  });
  return zeilen;
}

/** Welcher Querschnittsname gilt für diesen Stab? (Länge entscheidet.) */
function qsName(st, bau, zeilen) {
  if (!istBlech(st.qs)) return st.qs;
  const a = bau.knoten.get(st.von), b = bau.knoten.get(st.bis);
  if (!a || !b) return st.qs;
  const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  const treffer = zeilen.filter((z) => z.quelle === st.qs);
  if (!treffer.length) return st.qs;
  return treffer.reduce((best, z) =>
    (Math.abs(z.L - L) < Math.abs(best.L - L) ? z : best)).name;
}

/**
 * Schreibt das Python-Skript.
 *
 * @param {object} m   Modell aus core.vierendeel.modell()
 * @param {object} opt {knotenmodell}
 * @returns {{text:string, bau:object, lasten:object}}
 */
export function pyniteSkript(m, opt = {}) {
  const km = opt.knotenmodell ?? 'anschnitt';
  /*
   * EIN FERTIGES MODELL HAT VORRANG - siehe export.axisvm.js.
   *
   * Steht mehr als ein Tragwerk auf dem Blatt, baut `stabmodellBlatt` sie
   * alle in EIN Modell, mit verschmolzenen Masten. Ohne diesen Vorrang
   * rechnete PyNite nur das aktive Tragwerk, unverschieblich gelagert - und
   * die Rahmenwirkung der Reihe fehlte.
   */
  const bau = opt.bau ?? stabmodell(m, {
    knotenmodell: km, schottAusblenden: opt.schottAusblenden,
    auflagerModell: opt.auflagerModell });
  // EIGENGEWICHT MUSS MIT. PyNite leitet es nicht aus den Stäben ab; ohne
  // diese Zeile fehlte im Modell die grösste Einzellast (am Signaljoch
  // 0.70 kN/m gegen 3 × 3.92 kN Anbaulast - das Feldmoment fiel um 45 % zu
  // klein aus).
  const l = lasten(m, bau, { eigengewicht: true });
  const schubweich = opt.schubweich !== false;
  const gurteSchief = opt.gurteSchief === true;
  const qs = querschnitte(bau, schubweich, gurteSchief);

  // Achsentausch: unser (x, y, z) -> PyNite (X, Y, Z) = (x, z, y)
  const knotenZeilen = [...bau.knoten.values()].map(
    (k) => `M.add_node(${s(k.name)}, ${py(k.x)}, ${py(k.z)}, ${py(k.y)})`);

  /*
   * WELCHE DREHRICHTUNG BEKOMMT WELCHE ECKE?
   *
   * Die vier Winkel stehen spiegelsymmetrisch. Die Ferse zeigt in Richtung
   * (sy, sz) der Ecke, die Symmetrieachse - und damit die starke Hauptachse -
   * liegt auf deren Winkelhalbierender. Das Vorzeichen der Drehung folgt
   * deshalb dem PRODUKT sy*sz:
   *
   *      OG_L (-1,+1) -> -45      OG_R (+1,+1) -> +45
   *      UG_L (-1,-1) -> +45      UG_R (+1,-1) -> -45
   *
   * Die beiden Gurte einer Ebene drehen also GEGENEINANDER - das ist die
   * Voraussetzung des ganzen Ansatzes. Ein gemeinsamer Vorzeichenwechsel
   * aller vier spiegelt nur das Ausweichen und aendert am Blechmoment
   * nichts; das Muster zaehlt, nicht der absolute Bezug.
   */
  const drehung = (st) => {
    if (!gurteSchief) return 0;
    const t = /^(OG|UG)(L|R)_S/.exec(String(st.name));
    if (!t) return 0;
    // Nur der wirkliche Winkel dreht sich; die steifen Knotenabschnitte
    // sind quadratisch, dort waere die Drehlage ohne Wirkung.
    const q = qs.find((z) => z.name === qsName(st, bau, qs));
    if (!q || !String(q.name).startsWith('GURT_')) return 0;
    const e = ECKEN.find((x) => x.id === `${t[1]}_${t[2]}`);
    return e ? 45 * e.sy * e.sz : 0;
  };

  const stabZeilen = bau.staebe.map((st) => {
    return `M.add_member(${s(st.name)}, ${s(st.von)}, ${s(st.bis)}, 'STAHL', `
         + `${s(qsName(st, bau, qs))}` + ')';
  });

  /* =========================================================================
   * >>> DIE DREHLAGE DER STAEBE - SIE HAT PyNite NIE ERREICHT. <<<
   * =======================================================================
   *
   * Gefunden am 24. September beim Vergleich gegen den eigenen
   * Stabwerksloeser: am Mastkopf standen die beiden um FAKTOR 7
   * auseinander. Ein senkrechter Kragarm HEB 240, durch beide Loeser und
   * gegen die geschlossene Loesung w = F L^3 / (3 E I), hat es
   * entschieden:
   *
   *     Last quer (x)   Loeser -> Iy (stark), PyNite -> Iz (schwach)
   *     Last laengs (y) Loeser -> Iz,         PyNite -> Iy
   *
   * BEIDE trafen ihre Loesung auf 1.000 genau. Keiner von beiden
   * rechnete falsch - sie stellten das PROFIL um 90 Grad verschieden
   * hin. Und das war kein Streit, sondern eine Luecke: hier wurde
   * `rotation` nur an den Gurtwinkeln geschrieben (und auch das nur bei
   * `gurteSchief`), jeder andere Stab ging mit der VORGABE von PyNite
   * hinaus. Die Drehlage steht laengst in der Datei - `lcsZ` an jedem
   * Stab -, sie wurde nur nicht uebersetzt.
   *
   * >>> WO ES WIRKT, UND WIE STARK. <<<
   *
   * Nur ein Querschnitt mit Iy != Iz merkt eine Drehung. Am J90/8 m:
   *
   *     Gurte, Starrglieder   372 Stueck   Iy/Iz = 1.000   ohne Wirkung
   *     Bleche                 48 Stueck   Iy/Iz = 0.010   Faktor 100
   *     Mast HEB 240           10 Stueck   Iy/Iz = 2.870
   *
   * Der Mast war der auffaellige Fall, die BLECHE sind der schwerere.
   *
   * >>> EINE QUELLE, NICHT ZWEI. <<<
   *
   * `bau.staebe` traegt die Drehlage nur dort, wo sie aus der Eingabe
   * kommt (die zehn Maststaebe mit ihrer Stegrichtung); die der Gurte
   * und Bleche entsteht erst in `stabmodellJson` aus der Einbaulage der
   * Winkel. Diese Regel hier ein zweites Mal nachzubauen waere genau der
   * Fehler, der am 24. September schon einmal gemacht war (die
   * Abfangart stand in zwei Dateien und lief auseinander). Also wird
   * gefragt, nicht nachgebaut - mit DEMSELBEN `bau`, damit kein zweites
   * Modell entsteht. Gemessen: der Aufruf laesst `bau` unveraendert und
   * gibt zweimal dasselbe.
   * ======================================================================= */
  const ausDatei = new Map(
    stabmodellJson(m, { bau, knotenmodell: km }).staebe
      .map((x) => [x.name, x]));
  const drehQuelle = new Map(
    [...ausDatei].map(([n, x]) => [n, x.lcsZ]));

  const sollZeilen = bau.staebe.map((st) => {
    const a = bau.knoten.get(st.von), b = bau.knoten.get(st.bis);
    if (!a || !b) return null;
    const lz = st.lcsZ ?? drehQuelle.get(st.name) ?? null;
    const { R } = dreibein(b.x - a.x, b.y - a.y, b.z - a.z, lz);
    const ez = R[2];
    // Achsentausch wie bei den Knoten: unser (x, y, z) -> PyNite (x, z, y).
    return `    ${s(st.name)}: (${py(ez[0])}, ${py(ez[2])}, ${py(ez[1])}),`;
  }).filter(Boolean);

  /*
   * Der Zuschlag der Winkelprofile in ihre Hauptachsen bleibt, was er
   * war: eine ZWEITE Aussage neben der Drehlage, und zwar ueber den
   * Querschnitt. Er steht weiter unter `gurteSchief` (Vorgabe aus) und
   * wird auf die ausgerichtete Lage aufaddiert.
   */
  const zuschlagZeilen = bau.staebe
    .map((st) => [st.name, drehung(st)])
    .filter(([, g]) => g)
    .map(([n, g]) => `    ${s(n)}: ${py(g)},`);

  /* =========================================================================
   * >>> DIE GELENKIGEN ANSCHLUESSE - ALS STABENDFREIGABEN. <<<
   * =======================================================================
   *
   * Weisung vom 24. September: «die links als stabendfreigaben in pynite
   * nachruesten».
   *
   * Der Jochanschluss ist ein LINKELEMENT - stehende Vorgabe des
   * Auftraggebers: «gelenkige Anschluesse als Linkelemente». Es traegt je
   * Freiheitsgrad `Rigid` oder `Free`, und was frei ist, folgt dem
   * Lagerungsentscheid vom 16. September (Obergurt x y, Untergurt y z):
   *
   *     OG-Link   x Rigid  y Rigid  z FREE   xx Rigid  yy FREE  zz FREE
   *     UG-Link   x FREE   y Rigid  z Rigid  xx Rigid  yy FREE  zz FREE
   *
   * Bis hierher schrieb die Ausleitung den Link als GEWOEHNLICHEN Stab mit
   * dem Ersatzquerschnitt STARR - voll biegesteif. Das Joch wirkte in
   * PyNite dadurch als Rahmenriegel; am J90/8 m nahm es unter Wind quer
   * ein Kraeftepaar von 0.835 kN auf, und 0.835 x 8 m = 6.68 kNm war auf
   * die Stelle genau die Differenz der beiden Fussmomente.
   *
   * >>> WAS EXAKT GEHT UND WAS EINE NAEHERUNG BLEIBT. <<<
   *
   * Eine Feder haelt ihre sechs Komponenten UNABHAENGIG: sie kann eine
   * Querkraft uebertragen, ohne ein Moment zu uebertragen. Ein Balken kann
   * das nicht - bei ihm gilt V = dM/dx. Daraus folgt:
   *
   *   - Eine freie VERSCHIEBUNG (z beim OG, x beim UG) wird exakt: das
   *     Ende traegt in dieser Richtung nichts, und beim OG faellt mit
   *     `Dz` und `Ry` die ganze x-z-Ebene weg, genau wie bei der Feder.
   *
   *   - Eine freie VERDREHUNG bei starrer Querkraft (yy, zz) bleibt eine
   *     Naeherung. Gibt man sie an BEIDEN Enden frei, faellt mit dem
   *     Moment auch die Querkraft aus - der Anschluss truege dann gar
   *     nichts mehr, und das waere schlechter als zu viel. Also an EINEM
   *     Ende; am anderen bleibt ein Restmoment M = V x L.
   *
   * DER FEHLER IST DIE LINKLAENGE, und die ist 0.05 m. Wie gross er
   * wirklich wird, misst `vergleich_stabwerk.mjs` und schreibt es hin -
   * geschaetzt wird hier nichts.
   *
   * Freigegeben wird am ENDE AM GURT (j). Das Restmoment landet damit im
   * starren Anschlussstiel zum Masten und nicht im Gurt - der Gurt ist
   * das nachgewiesene Bauteil.
   * ======================================================================= */
  const FREIHEIT = [['x', 'Dx'], ['y', 'Dy'], ['z', 'Dz'],
                    ['xx', 'Rx'], ['yy', 'Ry'], ['zz', 'Rz']];
  const freigabeZeilen = [];
  bau.staebe.forEach((st) => {
    const d = ausDatei.get(st.name);
    if (!d || d.art !== 'link') return;
    const ku = d.kraftuebertragung || {};
    /*
     * Die lokalen Achsen sind dieselben - dafuer sorgt die Ausrichtung
     * oben. Nur das lokale y kann das Vorzeichen wechseln (die Abbildung
     * nach PyNite ist eine Spiegelung); fuer eine Freigabe ist das ohne
     * Belang: frei bleibt frei.
     */
    const frei = FREIHEIT.filter(([unser]) => ku[unser] === 'Free')
                         .map(([, py2]) => `${py2}j`);
    if (!frei.length) return;
    freigabeZeilen.push(`M.def_releases(${s(st.name)}, `
      + frei.map((f) => `${f}=True`).join(', ') + ')');
  });

  // Auflager. Unsere Freiheitsgrade in PyNite-Benennung:
  //   fix  (Torsion um die Jochachse)      -> RX
  //   fiy  (Vertikalbiegung)               -> RZ   (Achse = Gleisrichtung)
  //   fiz  (Windbiegung im Grundriss)      -> RY   (Achse = Lotrechte)
  const lagerZeilen = [];
  /*
   * DIE FREIHEITSGRADE DES MODELLS, NICHT EIGENE.
   *
   * Hier stand eine zweite, selbstgebaute Lagerungsregel: jedes Auflager
   * bekam y/z/Torsion gehalten und die Drehfeder dazu - gleich, welches
   * Auflagermodell `stabmodell` gerade gebaut hatte. Beim Gurtmodell hiess
   * das acht voll gehaltene Knoten samt acht Federn, obwohl dort nur die
   * Untergurte lotrecht halten und keine Feder vorkommt. Dieselbe
   * Verwechslung wie im SAF- und im DXF-Blatt: gefragt werden muss das
   * LAGER, nicht sein Endbuchstabe.
   */
  bau.auflager.forEach((a) => {
    const b = stuetzung(m, a);
    const j = (v) => (v === 'Free' ? 'False' : 'True');
    // Reihenfolge in PyNite: DX, DY, DZ, RX, RY, RZ - und PyNites Y ist
    // unser z, PyNites Z unser y. Der Tausch gilt fuer die Halte genauso wie
    // fuer die Koordinaten oben.
    lagerZeilen.push(`M.def_support(${s(a.knoten)}, ${j(b.ux)}, `
      + `${j(b.uz)}, ${j(b.uy)}, ${j(b.fix)}, ${j(b.fiz)}, ${j(b.fiy)})`);
    // 'Flexible' heisst: gehalten über eine Feder, nicht starr. PyNite
    // braucht dazu beides - den Halt und die Federzahl.
    if (b.fiy === 'Flexible' && b.cFiy_kNm) {
      lagerZeilen.push(`M.def_support_spring(${s(a.knoten)}, 'RZ', ${py(b.cFiy_kNm)})`);
    }
  });

  // Lasten je Einwirkungsgruppe. Richtungen mitdrehen.
  const richtungKraft = { X: 'FX', Y: 'FZ', Z: 'FY' };   // unser Y -> PyNite Z
  const richtungMoment = { Mx: 'MX', My: 'MZ', Mz: 'MY' };
  const lastZeilen = [];
  l.strecke.forEach((q) => {
    /* =====================================================================
     * >>> DIE RICHTUNG EINER STRECKENLAST GEHT DENSELBEN WEG WIE DIE
     *     EINER PUNKTLAST. <<<
     * ===================================================================
     *
     * Hier stand `q.richtung === 'Z' ? 'FY' : 'FZ'` - richtig fuer Z,
     * richtig fuer Y, und FALSCH fuer X: eine Streckenlast in der
     * Jochachse landete auf PyNites FZ, also auf unserer y-Achse.
     *
     * Gefunden am 24. September beim Vergleich des eigenen
     * Stabwerksloesers gegen PyNite: beim Lastfall WindX bewegte sich
     * der Loeser in x, PyNite in y. Betroffen ist jede Streckenlast
     * in Jochachse - am Tragjoch der Wind quer zum Gleis auf die
     * Masten (WindX), also genau die Last, die das Joch laengs
     * verbiegt.
     *
     * `richtungKraft` daneben hat es von Anfang an richtig gemacht;
     * jetzt liest diese Zeile dieselbe Tabelle.
     * =================================================================== */
    const dir = richtungKraft[q.richtung] ?? 'FZ';
    lastZeilen.push(`M.add_member_dist_load(${s(q.stab)}, ${s(dir)}, `
      + `${py(q.wert)}, ${py(q.wert)}, case=${s(q.lastfall)})`);
  });
  l.punkt.forEach((q) => {
    lastZeilen.push(`M.add_node_load(${s(q.knoten)}, ${s(richtungKraft[q.richtung])}, `
      + `${py(q.wert)}, case=${s(q.lastfall)})`);
  });
  l.moment.forEach((q) => {
    lastZeilen.push(`M.add_node_load(${s(q.knoten)}, ${s(richtungMoment[q.richtung])}, `
      + `${py(q.wert)}, case=${s(q.lastfall)})`);
  });

  const faelle = [...new Set([...l.strecke, ...l.punkt, ...l.moment]
    .map((q) => q.lastfall))];
  const komboZeilen = faelle.map(
    (f) => `M.add_load_combo(${s(f)}, {${s(f)}: 1.0})`);

  // Schnittstellen für die Gegenüberstellung: IN FELDMITTE, nicht am Knoten.
  // Am Knoten springt das lokale Vierendeel-Moment des Gurtes; in Feldmitte
  // hat es seinen Nullpunkt, und die Summe über die vier Gurte ist dort das
  // reine Querschnittsmoment. Aus demselben Grund legt auch das Werkzeug
  // seinen Nachweisschnitt immer mittig zwischen zwei Bleche.
  /*
   * OHNE STATIONEN KEINE SCHNITTSTELLEN.
   *
   * Ein Einzelmast hat keine Bindebleche und damit keine Feldmitten - die
   * Gegenueberstellung Werkzeug/PyNite gilt dem Joch. Das Skript entsteht
   * trotzdem: der Mast steht darin als Stab, und wer ihn rechnen will,
   * bekommt seine Schnittgroessen aus PyNite. Nur die Tabelle am Ende bleibt
   * leer, weil es nichts gegenueberzustellen gibt.
   */
  const xs = (m.stationsListe ?? []).map((st) => st.x);
  const stationen = xs.slice(1).map((x, i) => py((x + xs[i]) / 2));
  const zAchse = py((bau.zOben ?? 0) - (m.h ?? 0) / 2);

  const kopfText = [
    `# Erzeugt von Vierendeel - PyNite-Gegenrechnung`,
    `# Joch ${m.typ ?? 'frei'} · L = ${m.L} m · Knotenmodell '${km}'`,
    `#`,
    `# ACHSEN: PyNite rechnet mit Y nach oben. Die Koordinaten sind hier`,
    `# getauscht (unser Z -> PyNite Y, unser Y -> PyNite Z); die AUSGABE`,
    `# steht wieder in unserer Benennung: X Jochachse, Y Gleisrichtung,`,
    `# Z nach oben, F_z positiv nach UNTEN.`,
    `#`,
    `#   pip install PyNiteFEA`,
    `#   python3 ${'<diese Datei>'}`,
  ].join('\n');

  const text = `${kopfText}

import csv
import sys

try:
    from Pynite import FEModel3D          # ab Version 1.0
except ImportError:                        # ältere Ausgaben
    from PyNite import FEModel3D

M = FEModel3D()

# --- Werkstoff ---------------------------------------------------------------
# E und G in kN/m2, Dichte in kN/m3. Gerechnet wird in kN und m.
M.add_material('STAHL', ${py(210e6)}, ${py(81e6)}, 0.3, ${py(78.5)})

# --- Querschnitte (A, Iy, Iz, J in lokalen Achsen) ---------------------------
${qs.map((q) => `M.add_section(${s(q.name)}, ${py(q.A)}, ${py(q.Iy)}, `
  + `${py(q.Iz)}, ${py(q.J)})`).join('\n')}

# --- Knoten ------------------------------------------------------------------
${knotenZeilen.join('\n')}

# --- Stäbe -------------------------------------------------------------------
${stabZeilen.join('\n')}

# --- Drehlage der Stäbe ------------------------------------------------------
# Die Soll-Richtung der lokalen z-Achse je Stab, in PyNite-Koordinaten.
# Gesetzt wird sie NICHT mit einem hier ausgerechneten Winkel, sondern mit
# dem, den PyNites EIGENE Transformationsmatrix dafür verlangt - dann hängt
# nichts an einer Nachbildung seiner Konvention. Und danach wird nachgemessen.
SOLL_EZ = {
${sollZeilen.join('\n')}
}
ZUSCHLAG = {
${zuschlagZeilen.join('\n')}
}

import math

def _ausrichten():
    for nam, soll in SOLL_EZ.items():
        mm = M.members[nam]
        T = mm.T()
        ey0 = (T[1, 0], T[1, 1], T[1, 2])
        ez0 = (T[2, 0], T[2, 1], T[2, 2])
        # ez(a) = cos(a)*ez0 - sin(a)*ey0  ->  a aus den beiden Anteilen.
        c = sum(soll[i] * ez0[i] for i in range(3))
        sn = -sum(soll[i] * ey0[i] for i in range(3))
        mm.rotation = math.degrees(math.atan2(sn, c)) + ZUSCHLAG.get(nam, 0.0)

    # >>> GEGENPROBE: STEHT DIE ACHSE JETZT, WO SIE STEHEN SOLL? <<<
    # Eine Drehung, die man setzt, ohne nachzusehen, ist eine Behauptung.
    # Das Vorzeichen darf kippen - fuer die Steifigkeit ist -ez dieselbe
    # Achse -, die Richtung nicht.
    schief = []
    for nam, soll in SOLL_EZ.items():
        if ZUSCHLAG.get(nam):
            continue          # bewusst verdreht, siehe ZUSCHLAG
        T = M.members[nam].T()
        ez = (T[2, 0], T[2, 1], T[2, 2])
        gut = (all(abs(ez[i] - soll[i]) < 1e-6 for i in range(3))
               or all(abs(ez[i] + soll[i]) < 1e-6 for i in range(3)))
        if not gut:
            schief.append((nam, soll, ez))
    if schief:
        print('ACHTUNG: %d Staebe stehen nicht in ihrer Drehlage.' % len(schief))
        for nam, soll, ez in schief[:10]:
            print('   %-20s soll %s  ist %s' % (nam, soll, ez))
        sys.exit(1)
    print('Drehlage: %d Staebe ausgerichtet und nachgemessen'
          ' (%d davon mit Zuschlag).' % (len(SOLL_EZ), len(ZUSCHLAG)))

_ausrichten()

# --- Gelenkige Anschlüsse (Linkelemente) -------------------------------------
# Freigegeben wird am Ende AM GURT (j); siehe den Block in export.pynite.js.
${freigabeZeilen.length ? freigabeZeilen.join('\n')
  + `\nprint('Gelenke: ${freigabeZeilen.length} Linkenden freigegeben.')`
  : '# (keine Linkelemente in diesem Modell)'}

# --- Auflager ----------------------------------------------------------------
# DX, DY, DZ, RX, RY, RZ - RX ist die Gabellagerung, RZ die Vertikalbiegung.
${lagerZeilen.join('\n')}

# --- Lasten je Einwirkungsgruppe, charakteristisch ---------------------------
${lastZeilen.join('\n')}

# --- Ein Lastfall je Gruppe --------------------------------------------------
${komboZeilen.join('\n')}

print('Rechne:', ${JSON.stringify(faelle)})
M.analyze_linear(check_statics=True)

FAELLE = ${JSON.stringify(faelle)}
SCHOTT_AUSBLENDEN = ${bau.schottAusblenden ? 'True' : 'False'}
STATIONEN = ${JSON.stringify(stationen)}
Z_ACHSE = ${zAchse}

# =============================================================================
# 1 · Stabkräfte: die zwölf Endkräfte je Stab, in LOKALEN Achsen
# =============================================================================
with open('pynite_staebe.csv', 'w', newline='') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['Stab', 'Querschnitt', 'Lastfall',
                'N_i', 'Vy_i', 'Vz_i', 'T_i', 'My_i', 'Mz_i',
                'N_j', 'Vy_j', 'Vz_j', 'T_j', 'My_j', 'Mz_j'])
    for name, mem in M.members.items():
        if SCHOTT_AUSBLENDEN and name.startswith('SCHOTT_'):
            continue          # trägt weiter mit, steht nur nicht in der Tabelle
        for fall in FAELLE:
            v = mem.f(fall)
            w.writerow([name, mem.section.name, fall]
                       + [round(float(v[i, 0]), 6) for i in range(12)])

# =============================================================================
# 2 · Schnittgrössen je Station: die vier Gurte zusammengefasst
# =============================================================================
# Der Vergleich mit dem Werkzeug läuft über die RESULTIERENDEN Schnittgrössen
# des ganzen Querschnitts, nicht über einzelne Stäbe. Dafür wird an jeder
# Station durch die vier Gurte geschnitten und über sie aufsummiert:
#
#   N    = Σ N_Gurt
#   V_z  = Σ Querkraft lotrecht          (positiv nach unten wie im Werkzeug)
#   V_y  = Σ Querkraft in Gleisrichtung
#   M_y  = Σ [ N_Gurt · Abstand zur Jochachse ] + Σ lokale Gurtmomente
#   M_z  = Σ [ N_Gurt · Abstand quer      ] + Σ lokale Gurtmomente
#   T_x  = Σ [ V · Hebelarm ] + Σ lokale Gurttorsion
#
# Die Bindebleche werden NICHT mitgeschnitten: sie stehen quer zum Schnitt und
# tragen zur resultierenden Kraft am Querschnitt nichts bei.

def knotenlage(name):
    n = M.nodes[name]
    return n.X, n.Z, n.Y            # zurück in unsere Benennung: x, y, z

gurte = [n for n in M.members if n[:2] in ('OG', 'UG') and '_S' in n]

with open('pynite_stationen.csv', 'w', newline='') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['x [m]', 'Lastfall', 'N [kN]', 'V_z [kN]', 'V_y [kN]',
                'M_y [kNm]', 'M_z [kNm]', 'T_x [kNm]', 'Gurte im Schnitt'])
    for x in STATIONEN:
        for fall in FAELLE:
            N = Vz = Vy = My = Mz = Tx = 0.0
            n_gurte = 0
            for name in gurte:
                mem = M.members[name]
                xi, yi, zi = knotenlage(mem.i_node.name)
                xj, yj, zj = knotenlage(mem.j_node.name)
                if not (min(xi, xj) - 1e-9 <= x <= max(xi, xj) + 1e-9):
                    continue
                if abs(xj - xi) < 1e-9:
                    continue
                n_gurte += 1
                xl = abs(x - xi)              # Stelle im Stab, lokal
                # Lokale Achsen des Gurtes: x in Jochachse, y lotrecht,
                # z in Gleisrichtung.
                Ni = mem.axial(xl, fall)
                Vyi = mem.shear('Fy', xl, fall)
                Vzi = mem.shear('Fz', xl, fall)
                Myi = mem.moment('My', xl, fall)
                Mzi = mem.moment('Mz', xl, fall)
                Ti = mem.torque(xl, fall)
                arm_z = (zi + zj) / 2 - Z_ACHSE   # Höhe über der Jochachse
                arm_y = (yi + yj) / 2             # Abstand quer
                N += Ni
                Vz += -Vyi                    # PyNite y ist oben, wir zählen unten
                Vy += Vzi
                # Die lokalen Stabmomente zählen mit UMGEKEHRTEM Vorzeichen:
                # PyNite gibt sie in seiner eigenen Konvention aus. Die Probe
                # dazu steht unten - ohne den Dreh fehlen am Feldschnitt rund
                # 3 % gegenüber dem Gleichgewicht am Ersatzbalken.
                My += Ni * arm_z - Mzi
                Mz += Ni * arm_y - Myi
                # Torsion um die Jochachse: M_x = Σ ( Hebel_z · Kraft_quer
                # − Hebel_quer · Kraft_lotrecht ) + Σ lokale Stabtorsion.
                Tx += Vzi * arm_z - Vyi * arm_y + Ti
            w.writerow([round(x, 4), fall]
                       + [round(q, 4) for q in (N, Vz, Vy, My, Mz, Tx)] + [n_gurte])

# =============================================================================
# 3 · Knotenverschiebungen und Auflagerreaktionen
# =============================================================================
# >>> WOZU. <<< Die Stabkraefte oben sind eine ABGELEITETE Groesse - sie
# entstehen erst aus den Verschiebungen. Wer zwei Loeser gegeneinander
# haelt, muss das vergleichen, was sie loesen: u. Eine Abweichung in den
# Verschiebungen sagt «anderes Gleichungssystem», eine allein in den
# Kraeften «andere Auswertung».
#
# Die Reaktionen kommen dazu, weil sie das Gleichgewicht schliessen: was
# oben hineingeht, muss unten herauskommen.
with open('pynite_knoten.csv', 'w', newline='') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['Knoten', 'Lastfall', 'DX', 'DY', 'DZ', 'RX', 'RY', 'RZ'])
    for name, kn in M.nodes.items():
        for fall in FAELLE:
            w.writerow([name, fall,
                        round(float(kn.DX[fall]), 9), round(float(kn.DY[fall]), 9),
                        round(float(kn.DZ[fall]), 9), round(float(kn.RX[fall]), 9),
                        round(float(kn.RY[fall]), 9), round(float(kn.RZ[fall]), 9)])

with open('pynite_auflager.csv', 'w', newline='') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['Knoten', 'Lastfall', 'FX', 'FY', 'FZ', 'MX', 'MY', 'MZ'])
    for name, kn in M.nodes.items():
        # Nur wo wirklich gehalten wird - sonst stuenden lauter Nullen da.
        if not (kn.support_DX or kn.support_DY or kn.support_DZ
                or kn.support_RX or kn.support_RY or kn.support_RZ
                or kn.spring_DX[0] is not None or kn.spring_DY[0] is not None
                or kn.spring_DZ[0] is not None or kn.spring_RX[0] is not None
                or kn.spring_RY[0] is not None or kn.spring_RZ[0] is not None):
            continue
        for fall in FAELLE:
            w.writerow([name, fall,
                        round(float(kn.RxnFX[fall]), 6), round(float(kn.RxnFY[fall]), 6),
                        round(float(kn.RxnFZ[fall]), 6), round(float(kn.RxnMX[fall]), 6),
                        round(float(kn.RxnMY[fall]), 6), round(float(kn.RxnMZ[fall]), 6)])

print('geschrieben: pynite_staebe.csv, pynite_stationen.csv,'
      ' pynite_knoten.csv, pynite_auflager.csv')
`;

  return { text, bau, lasten: l, faelle, querschnitte: qs };
}

/** Dateiname zum Skript. */
export function pyniteName(inp, knotenmodell) {
  return `PyNite_${inp.typ ?? 'frei'}_L${Number(inp.L).toFixed(1)}m_${knotenmodell}.py`;
}

/** Schreibt das Skript und lädt es herunter. */
export function exportierePynite(inp, deps, opt = {}) {
  const { modell, profOG, profUG, stahl, joch } = deps;
  const km = opt.knotenmodell ?? 'anschnitt';
  const m = modell({ ...inp, beiwerteFest: null }, profOG, profUG, stahl, joch);
  const r = pyniteSkript(m, { knotenmodell: km,
                             schottAusblenden: opt.schottAusblenden,
                             bau: blattWennMehrere(inp, deps, { knotenmodell: km }) });
  const name = pyniteName(inp, km);
  herunterladen(r.text, name, 'text/x-python');
  return { name, staebe: r.bau.staebe.length, faelle: r.faelle };
}
