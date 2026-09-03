/**
 * core.abfangjoch.js
 * ---------------------------------------------------------------------------
 * DER RECHENKERN DES ABFANGJOCHS.
 *
 * Weisung vom 3. September:
 *
 *   «Die Abfangjoche sind liegende Vierendeelträger. diese sollte auch wenn
 *    möglich als einfacher balken abgebildet werden und mit der umrechnung
 *    auf die einzelne gurte. der nachweis erfolgt dann über die vorhandenen
 *    bleche und den nachweisschnitt wie beim tragjoch. das heisst jeder
 *    träger wird für sich alleine nachgewiesen.»
 *
 * ======================== DER TRÄGER LIEGT ================================
 *
 * Das Tragjoch stellt seinen Vierendeel-Rahmen SENKRECHT: vier Winkelgurte,
 * zwei Blechebenen, und die Rahmenwirkung trägt das Gewicht. Das Abfangjoch
 * legt ihn WAAGRECHT: zwei Walzprofile nebeneinander, Bindebleche oben und
 * unten, und die Rahmenwirkung trägt den LEITERZUG.
 *
 *   Tragjoch     Rahmenebene senkrecht   Vierendeel trägt Gewicht + Schnee
 *   Abfangjoch   Rahmenebene waagrecht   Vierendeel trägt Leiterzug + Wind y
 *
 * Damit zerfällt die Rechnung in zwei Richtungen, die einander nicht
 * beeinflussen — und genau so hat der Auftraggeber es festgelegt:
 *
 *   IN DER RAHMENEBENE   Moment aus Leiterzug wird zum KRÄFTEPAAR in den
 *                        Gurten: N = ± M / e. Dazu die örtliche Biegung
 *                        jedes Gurtes zwischen zwei Bindeblechen.
 *
 *   QUER DAZU            Eigengewicht und Schnee. «jeder Gurt für sich,
 *                        halbe Last», über seine starke Achse. Kein Rahmen
 *                        quer zur Ebene — die Bindebleche wären dort
 *                        Torsionsstäbe.
 *
 * ==================== e IST NICHT k =======================================
 *
 * Der Hebelarm ist der Abstand der SCHWERACHSEN, nicht das Aussenmass. Beim
 * UPE liegt die Achse um e_y innerhalb des Stegrückens, beim IPE mittig.
 * Bei A160 sind das 38.3 statt 42.0 cm, bei A270 73.5 statt 87.0 — neun bis
 * fünfzehn Prozent, die voll ins Moment gehen. `gurtAchsabstand` macht den
 * Abzug; hier wird er nur benutzt.
 *
 * ==================== EINHEITEN ===========================================
 *
 * Der Profilkatalog führt cm, cm², cm⁴ — wie der Winkelkatalog des
 * Tragjochs. Dieses Modul rechnet DARIN und gibt am Ende in kN und kNm aus.
 * Wo umgerechnet wird, steht es an der Stelle.
 * ---------------------------------------------------------------------------
 */

import { getAbfangjoch, abfangAufbau, abfangBindeblech,
         abfangEndverstaerkung, abfangMasse } from './data.abfangjoche.js';
import { getGurtprofil, gurtAchsabstand } from './data.profiles.js';

/**
 * DIE QUERSCHNITTSWERTE EINES ABFANGJOCHS.
 *
 * Alles, was der Nachweis über den Querschnitt wissen muss — in einem Satz,
 * damit niemand die Steiner-Anteile ein zweites Mal von Hand bildet.
 *
 * >>> ZWEI TRÄGHEITSMOMENTE, ZWEI BEDEUTUNGEN. <<<
 *
 * `Irahmen` ist das des GESAMTQUERSCHNITTS in der Rahmenebene, mit
 * Steiner-Anteil — er beschreibt den Träger als Ganzes und geht in die
 * Durchbiegung. Für die GURTKRAFT wird er nicht gebraucht: dort gilt das
 * Kräftepaar N = ± M / e, und das ist die Vierendeel-Annahme.
 *
 * `Ivert` ist das EINES Gurtes um seine starke Achse. Quer zur Rahmenebene
 * trägt jeder Gurt für sich; ein Gesamtwert wäre dort eine Behauptung über
 * eine Verbundwirkung, die die Bindebleche nicht liefern.
 *
 * @param {string|object} typ  Abfangjochtyp oder sein Datensatz
 * @returns {object} Querschnittswerte in cm-Einheiten
 */
export function abfangQuerschnitt(typ) {
  const a = typeof typ === 'string' ? getAbfangjoch(typ) : typ;
  const auf = abfangAufbau(a);
  if (!auf) {
    throw new Error(
      `Abfangjoch ${a?.typ ?? '?'}: Aufbau nicht erfasst — kein Querschnitt.`);
  }
  const p = getGurtprofil(auf.gurtprofil);
  const k = auf.k / 10;                 // mm -> cm
  const e = gurtAchsabstand(p, k);      // cm, Achsabstand der Gurte

  /*
   * DER STEINER-ANTEIL IST HIER ALLES.
   *
   * I_z eines UPE 160 ist 85 cm⁴, der Steiner-Anteil bei e = 38.3 cm dagegen
   * 2 · 22.0 · 19.15² = 16 100 cm⁴ — das Zweihundertfache. Der Eigenanteil
   * wird trotzdem mitgeführt: ihn wegzulassen hiesse, eine Vereinfachung
   * einzubauen, die niemand angeordnet hat, und bei kurzen Jochen mit
   * kleinem e wächst sein Gewicht.
   */
  const Igurt = p.reihe === 'UPE' ? p.Iz : p.Iz;   // schwache Achse, in der Ebene
  const Irahmen = 2 * (Igurt + p.A * (e / 2) ** 2);
  const Wrahmen = Irahmen / (k / 2);              // bis zur äussersten Faser

  return {
    typ: a.typ,
    gurt: p,
    gurte: 2,
    /** Aussenmass über beide Gurte [cm] — NICHT der Hebelarm. */
    k,
    /** Achsabstand der Gurte [cm] — der Hebelarm der Vierendeel-Wirkung. */
    e,
    /** Fläche beider Gurte [cm²]. */
    A: 2 * p.A,
    /** Fläche eines Gurtes [cm²] — die Gurtkraft wirkt auf diese. */
    Agurt: p.A,
    /** Trägheitsmoment des Gesamtquerschnitts in der Rahmenebene [cm⁴]. */
    Irahmen,
    /** Widerstandsmoment dazu [cm³]. */
    Wrahmen,
    /** Trägheitsmoment EINES Gurtes um seine starke Achse [cm⁴]. */
    Ivert: p.Iy,
    /** Widerstandsmoment dazu [cm³]. */
    Wvert: p.Wy,
    /** Widerstandsmoment eines Gurtes um seine schwache Achse [cm³]. */
    Wgurtz: p.Wz,
    /** Eigengewicht beider Gurte [kg/m] — ohne Bleche und Endverstärkung. */
    gGurte: 2 * p.G,
  };
}

/**
 * DIE GURTKRÄFTE AUS DEM MOMENT IN DER RAHMENEBENE.
 *
 * >>> DAS IST DIE «UMRECHNUNG AUF DIE EINZELNE GURTE». <<<
 *
 * Ein Vierendeelträger trägt sein Moment als Kräftepaar in den Gurten: der
 * eine bekommt Zug, der andere Druck, beide mit N = M / e. Das ist die
 * Annahme, die den Träger überhaupt erst zum Fachwerk-Ersatz macht — und sie
 * gilt, weil die Bindebleche die Schubkraft übertragen.
 *
 * DER DRUCKGURT IST DER MASSGEBENDE. Er trägt dieselbe Zahl wie der Zuggurt,
 * aber er kann ausweichen; sein Nachweis läuft über die Knicklinie. Die
 * Vorzeichen werden deshalb mitgegeben und nicht weggekürzt.
 *
 * @param {number} M  Moment in der Rahmenebene [kNm]
 * @param {number} e  Achsabstand der Gurte [cm]
 * @returns {{N: number, zug: number, druck: number}} Kräfte [kN]
 */
export function abfangGurtkraefte(M, e) {
  if (!(e > 0)) throw new Error('Abfangjoch: Hebelarm e muss positiv sein.');
  // M in kNm, e in cm -> N in kN
  const N = Math.abs(M) / (e / 100);
  return { N, zug: N, druck: -N };
}

/**
 * DIE LASTAUFTEILUNG QUER ZUR RAHMENEBENE.
 *
 * Weisung vom 3. September auf Nachfrage: «jeder Gurt für sich, halbe Last»,
 * über seine starke Achse. Kein Rahmen quer zur Ebene.
 *
 * >>> WARUM DAS NICHT SELBSTVERSTÄNDLICH IST. <<<
 *
 * Die Bindebleche verbinden die Gurte auch quer — nur wirken sie dort als
 * TORSIONSSTÄBE, nicht als Rahmenriegel. Ihre Steifigkeit dafür ist gering
 * und nirgends belegt. Sie anzusetzen hiesse, den Träger steifer zu rechnen,
 * als er nachgewiesen ist; die halbe Last je Gurt ist die Annahme, die auf
 * der sicheren Seite liegt und die der Auftraggeber gewählt hat.
 *
 * @param {number} q  Streckenlast quer zur Rahmenebene [kN/m]
 * @returns {{jeGurt: number}} Last je Gurt [kN/m]
 */
export function abfangLastQuer(q) {
  return { jeGurt: (Number(q) || 0) / 2 };
}

/**
 * DIE STÜTZWEITE ZU EINER JOCHLÄNGE [m].
 *
 * >>> jt IST NICHT js. <<<
 *
 * Die Sortimentsblätter führen beides: `jt` ist die Jochlänge über alles,
 * `js` die Stützweite zwischen den Masten. Die Mass-Tabelle gibt zu jeder
 * Länge einen Stützweitenbereich — ein Joch der Länge 9.50 m überspannt
 * 8.51 bis 9.00 m.
 *
 * Gerechnet wird mit der STÜTZWEITE. Mit jt zu rechnen überschätzt das
 * Feldmoment um das Quadrat des Verhältnisses; bei A160/9.50 wären das
 * (9.50/9.00)² = 11 Prozent auf der unsicheren Seite.
 *
 * Ohne geführte Länge kommt null zurück — dann muss der Aufrufer sagen, dass
 * er die Stützweite nicht kennt, statt eine zu erfinden.
 *
 * @returns {{von: number, bis: number, mittel: number}|null} [m]
 */
export function abfangStuetzweite(typ, jt) {
  const z = abfangMasse(typ, jt);
  if (!z?.js) return null;
  const [von, bis] = z.js;
  return { von, bis, mittel: (von + bis) / 2 };
}

/**
 * DIE BINDEBLECHE ENTLANG DES TRÄGERS — ihre Stationen [m].
 *
 * >>> DIE EINTEILUNG KOMMT AUS DEM SCHEMA, NICHT AUS EINER FORMEL. <<<
 *
 * Stehende Vorgabe: die Geometrie ist im Detail zu übernehmen, eine
 * Anpassung der Blecheinteilung ist nicht zulässig. Die Mass-Tabelle führt
 * das erste Feld A1 (250 oder 500 mm) und die Regelteilung A (500 mm); die
 * Vierendeel-Bereiche QV sagen, wie weit die Reihe läuft.
 *
 * Ab A240 ist der Träger GEGLIEDERT: zwischen den QV-Bereichen sitzen
 * Querversteifungen aus dem Gurtprofil. Innerhalb eines Bereichs stehen die
 * Bleche im Regelraster, zwischen den Bereichen nicht.
 *
 * @returns {{stationen: number[], bereiche: Array}|null}
 */
export function abfangBlechstationen(typ, jt) {
  const z = abfangMasse(typ, jt);
  if (!z) return null;
  /*
   * >>> DIE ZAHL KOMMT AUS DER STUECKLISTE, NICHT AUS EINER FORMEL. <<<
   *
   * Der erste Versuch leitete die Stationen aus QV1 und der Regelteilung
   * ab - QV1 = jt - 4.0 m, erstes Feld A1, dann 500er Raster. Das sah
   * schluessig aus und lag DURCHWEG 4 BIS 6 BLECHE ZU TIEF, gemessen an der
   * Stueckliste der Konstruktionszeichnung (A160/9.5 m: 22 gegen 26).
   *
   * Stehende Vorgabe: «Massgebend sind die Daten, nicht die Herleitung.
   * Fuehrt das Sortiment eine Laenge, gilt sie - auch wenn sie sich
   * rechnerisch bestaetigen laesst. Eine eigene Herleitung an ihre Stelle zu
   * setzen verstoesst gegen die erste Regel.» Genau dieser Fall.
   *
   * Ohne erfasste Stueckzahl kommt null zurueck. Der Aufrufer muss dann
   * sagen, dass er die Einteilung nicht kennt - eine geratene waere die
   * Grundlage eines Nachweisschnitts, der nirgends steht.
   */
  if (!(z.blechStationen > 0)) return null;
  const n = z.blechStationen;
  const A = z.A / 1000;                   // Regelteilung [m]
  const A1 = z.A1 / 1000;                 // erstes Feld [m]
  /*
   * DIE LAGE IST EINE NAEHERUNG, DIE ZAHL NICHT.
   *
   * Wo die Reihe genau beginnt, sagt die Konstruktionszeichnung je Typ
   * (bei A160: 1450 mm bis zum Auflager, dann 550 bis zum ersten Blech).
   * Diese Randmasse stehen bisher nur fuer A160 in der Datenbank. Solange
   * sie fehlen, wird die Reihe SYMMETRISCH in die Jochlaenge gelegt -
   * `randGenau` sagt, dass das eine Naeherung ist.
   */
  const spanne = A1 + (n - 1) * A;
  const rand = Math.max(0, (jt - spanne) / 2);
  const stationen = [];
  for (let i = 0; i < n; i++) stationen.push(rand + A1 + i * A);
  const QV = z.QV ?? [z.QV1];
  return {
    stationen,
    anzahl: n,
    /** Regelbindebleche insgesamt - je Station eines oben und eines unten. */
    bleche: z.bleche ?? n * 2,
    bereiche: QV.map((q, i) => ({ nr: i + 1, laenge: q / 1000 })),
    rand,
    randGenau: false,
    teilung: A,
    erstesFeld: A1,
  };
}

/**
 * Ob ein Typ überhaupt gerechnet werden kann.
 *
 * Ohne Aufbau kein Querschnitt, ohne Mass-Tabelle keine Blecheinteilung und
 * damit kein Nachweisschnitt. Beides muss dastehen, bevor eine Zahl fällt —
 * ein Kern, der auf halben Daten weiterrechnet, liefert Zahlen, denen man
 * nicht ansieht, worauf sie beruhen.
 */
export function abfangRechenbar(typ, jt) {
  try {
    const a = typeof typ === 'string' ? getAbfangjoch(typ) : typ;
    if (!abfangAufbau(a) || !abfangBindeblech(a)) return false;
    if (jt === undefined) return Boolean(a.laengen?.length);
    return Boolean(abfangMasse(a, jt));
  } catch {
    return false;
  }
}

/** Die Endverstärkung am Auflager — Gabel oder Deckblech, je nach Typ. */
export { abfangEndverstaerkung };

/*
 * ===========================================================================
 * DER SPANNUNGSNACHWEIS DER GURTE.
 * ===========================================================================
 *
 * Drei Anteile treffen sich im Gurt, und sie kommen aus zwei Richtungen:
 *
 *   N        Kräftepaar aus dem Moment IN der Rahmenebene (Leiterzug)
 *   M_vert   Biegung QUER dazu — halbe Querlast, starke Achse des Gurtes
 *   M_oertl  örtliche Biegung des Gurtes zwischen zwei Bindeblechen,
 *            aus der Querkraft in der Rahmenebene
 *
 * >>> DER ÖRTLICHE ANTEIL IST HIER UNGEDÄMPFT ANGESETZT. <<<
 *
 * Beim Tragjoch mindert `GURT_DAEMPFUNG` = 0.45 diesen Anteil — gemessen an
 * 80 PyNite-Läufen. Dieser Wert gilt für VIER Winkelgurte mit zwei
 * Blechebenen und ist auf zwei Walzprofile nicht übertragbar. Bis er für das
 * Abfangjoch gemessen ist, steht hier 1.0: der volle Anteil, also die
 * sichere Seite. Was das kostet, sagt `daempfung` im Ergebnis — wer die
 * Zahl später kalibriert, sieht sofort, wo sie wirkt.
 */
export const ABFANG_GURT_DAEMPFUNG = 1.0;

/**
 * Der Spannungsnachweis eines Gurtes.
 *
 * >>> OHNE KNICKEN. <<<
 *
 * Weisung vom 3. September: «die knicklänge hinten anstellen und mit axis
 * kalibrieren. die 500mm sind zu unkonservativ da sich der gesamte träger
 * biegt in der horizontal und vertikal ebene.»
 *
 * Das ist der Grund, warum der Blechabstand hier NICHT als Knicklänge
 * durchgeht: der Druckgurt weicht nicht zwischen zwei Blechen aus, sondern
 * mit dem ganzen Träger. Die massgebende Länge ist damit ein Vielfaches und
 * muss gemessen werden.
 *
 * Bis dahin führt dieser Nachweis den QUERSCHNITT, nicht die Stabilität —
 * und die Auswertung sagt es unter «nicht geführte Nachweise». Ein η, das
 * den Druckgurt wie einen Zuggurt behandelt und das verschweigt, wäre die
 * gefährlichste Zahl dieser Anwendung.
 *
 * @param {object} q     aus abfangQuerschnitt
 * @param {object} s     Schnittgrössen {Mrahmen [kNm], Mvert [kNm], Vrahmen [kN]}
 * @param {number} a     Bindeblechabstand [m]
 * @param {number} fyd   Bemessungsfestigkeit [kN/cm²]
 */
export function abfangGurtnachweis(q, s, a, fyd) {
  const N = abfangGurtkraefte(s.Mrahmen ?? 0, q.e).N;         // kN
  /*
   * Die örtliche Biegung: die Querkraft verteilt sich auf beide Gurte, und
   * jeder Gurt biegt zwischen zwei Blechen wie ein beidseitig eingespannter
   * Stab - Moment V/2 · a/2 an den Enden.
   */
  const Voertl = (Math.abs(s.Vrahmen ?? 0) / 2) * (a / 2);    // kNm
  const Moertl = Voertl * ABFANG_GURT_DAEMPFUNG;

  // kNm -> kNcm für die Widerstandsmomente in cm³
  const sigN = N / q.Agurt;
  const sigVert = (Math.abs(s.Mvert ?? 0) * 100) / q.Wvert;
  const sigOertl = (Moertl * 100) / q.Wgurtz;
  const sigma = sigN + sigVert + sigOertl;

  return {
    N, Moertl,
    sigN, sigVert, sigOertl, sigma,
    fyd,
    eta: fyd > 0 ? sigma / fyd : Infinity,
    daempfung: ABFANG_GURT_DAEMPFUNG,
    /*
     * DIE STABILITÄT IST NICHT DABEI - und das gehört ins Ergebnis, nicht
     * in eine Fussnote. Wer `eta` liest, muss sehen, was darin fehlt.
     */
    knickenGefuehrt: false,
    knickenGrund: 'Knicklänge des Druckgurtes noch nicht kalibriert — der '
                + 'Blechabstand ist zu unkonservativ, weil sich der ganze '
                + 'Träger in beiden Ebenen biegt (Weisung, 3. September).',
  };
}

/*
 * ===========================================================================
 * DER BINDEBLECHNACHWEIS.
 * ===========================================================================
 *
 * Weisung: «der nachweis erfolgt dann über die vorhandenen bleche und den
 * nachweisschnitt wie beim tragjoch». Also dieselbe Systematik, dieselben
 * Namen — wer den Jochnachweis kennt, liest diesen ohne Umlernen:
 *
 *      M_Blech = V_Ebene · ( a_links + a_rechts ) / 4
 *      V_Blech = 2 · M_Blech / Hebelarm
 *
 * >>> ZWEI EBENEN TEILEN SICH DIE QUERKRAFT. <<<
 *
 * Beim Tragjoch laufen vier Blechebenen um den Kasten; beim Abfangjoch sind
 * es zwei — je eines oben und unten an jeder Station (Schnitt A-A). Die
 * Querkraft IN DER RAHMENEBENE verteilt sich auf beide, also V/2 je Ebene.
 *
 * >>> DAS BLECH STEHT HOCHKANT. <<<
 *
 * Seine Breite b (in Trägerlängsrichtung) ist die Bauhöhe des Riegels, seine
 * Dicke t die schwache Richtung. Bei A160: 100 breit, 8 dick, 280 lang — die
 * Länge ist der lichte Gurtabstand und geht nicht ins Widerstandsmoment ein,
 * sondern in die Nachgiebigkeit.
 *
 *      W = t · b² / 6        A = b · t        A_v = A (Rechteck, voller Schub)
 *
 * >>> DAS RANDFELD IST DER UNGÜNSTIGE. <<<
 *
 * `Σa_Nachbarfelder` ist am ersten und letzten Blech nur EIN Feld breit —
 * dort steht aber die grösste Querkraft. Beide Wirkungen laufen gegeneinander;
 * welche gewinnt, hängt von der Einteilung ab, und genau deshalb wird jedes
 * Blech einzeln gerechnet statt nur das mittlere.
 */

/**
 * Der Nachweis EINES Bindeblechs.
 *
 * @param {object} bl   Blechmasse {b, t} [mm] aus der Datenbank
 * @param {number} V    Querkraft in der Rahmenebene an dieser Stelle [kN]
 * @param {number} aSum Summe der Nachbarfelder (a_links + a_rechts) [m]
 * @param {number} e    Achsabstand der Gurte [cm]
 * @param {number} fyd  Bemessungsfestigkeit [kN/cm²]
 */
export function abfangBlechnachweis(bl, V, aSum, e, fyd) {
  const b = (bl?.b ?? 0) / 10;            // mm -> cm
  const t = (bl?.t ?? 0) / 10;
  if (!(b > 0 && t > 0)) {
    throw new Error('Abfangjoch: Blechmasse fehlen — kein Blechnachweis.');
  }
  // Zwei Blechebenen teilen sich die Querkraft der Rahmenebene.
  const Vebene = Math.abs(V) / 2;
  const Mblech = (Vebene * aSum) / 4;                    // kNm
  const Vblech = e > 0 ? (2 * Mblech) / (e / 100) : 0;   // kN

  const W = (t * b * b) / 6;              // cm³
  const A = b * t;                        // cm²
  const sigma = (Mblech * 100) / W;       // kNm -> kNcm
  const tau = Vblech / A;
  /*
   * VERGLEICHSSPANNUNG nach von Mises. Im Blech treffen Biegung und Schub
   * an derselben Stelle zusammen - sie einzeln nachzuweisen liesse die
   * ungünstigste Faser aus.
   */
  const sigmaV = Math.sqrt(sigma * sigma + 3 * tau * tau);

  return {
    b, t, W, A,
    Vebene, Mblech, Vblech,
    sigma, tau, sigmaV, fyd,
    eta: fyd > 0 ? sigmaV / fyd : Infinity,
  };
}

/**
 * ALLE BINDEBLECHE EINES JOCHS - jedes für sich, wie gefordert.
 *
 * >>> DIE QUERKRAFT WIRD AN DER STELLE GENOMMEN, NICHT PAUSCHAL. <<<
 *
 * Ein einfacher Balken hat am Auflager die grösste Querkraft und in der
 * Mitte keine. Mit dem Auflagerwert für alle Bleche zu rechnen wäre grob
 * konservativ und würde die Feldbleche unbrauchbar überschätzen; mit dem
 * mittleren wäre es unsicher. Also je Station der dortige Wert.
 *
 * `Vfunktion` bekommt die Stelle x [m] und gibt die Querkraft [kN] — so
 * bleibt dieser Kern von der Schnittgrössenrechnung unabhängig und lässt
 * sich gegen PyNite und AxisVM stellen, ohne ihn anzufassen.
 *
 * @returns {{bleche: Array, massgebend: object|null}|null}
 */
export function abfangBlechnachweise(typ, jt, Vfunktion, fyd) {
  const q = abfangQuerschnitt(typ);
  const ein = abfangBlechstationen(typ, jt);
  const bl = abfangBindeblech(typ);
  if (!ein || !bl?.regel) return null;

  const st = ein.stationen;
  const bleche = st.map((x, i) => {
    /*
     * Die Nachbarfelder: am Rand gibt es nur eines. Es zu verdoppeln wäre
     * bequem und falsch - das Randblech trägt weniger Feld, aber mehr
     * Querkraft, und beides gehört einzeln gerechnet.
     */
    const aL = i > 0 ? x - st[i - 1] : 0;
    const aR = i < st.length - 1 ? st[i + 1] - x : 0;
    const aSum = aL + aR;
    /*
     * WELCHES BLECH SITZT HIER. Die Endbleche sind stärker als das
     * Regelblech - erstes und letztes bekommen sie, alle anderen das
     * Regelmass. Welche Seite «L» und welche «R» ist, sagt die Zeichnung;
     * genommen wird das jeweils SCHWÄCHERE der beiden Endbleche, solange
     * die Zuordnung nicht erfasst ist.
     */
    const istRand = i === 0 || i === st.length - 1;
    const enden = [bl.endeL, ...(Array.isArray(bl.endeR) ? bl.endeR
      : bl.endeR ? [bl.endeR] : [])].filter(Boolean);
    const schwaechstesEnde = enden.length
      ? enden.reduce((m, c) => (c.t * c.b * c.b < m.t * m.b * m.b ? c : m))
      : bl.regel;
    const masse = istRand ? schwaechstesEnde : bl.regel;
    const n = abfangBlechnachweis(masse, Vfunktion(x), aSum, q.e, fyd);
    return { i, x, aL, aR, aSum, istRand, masse, ...n };
  });
  const massgebend = bleche.reduce(
    (m, c) => (!m || c.eta > m.eta ? c : m), null);
  return { bleche, massgebend, e: q.e, einteilung: ein };
}
