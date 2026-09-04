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
         abfangEndverstaerkung, abfangMasse,
         abfangRandmasse, abfangQuersteife } from './data.abfangjoche.js';
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
  const d = auf.d / 10;                 // lichter Abstand der STEGE
  /*
   * Der Hebelarm braucht `d`: die U-Profile zeigen mit der Oeffnung nach
   * AUSSEN, ihre Stege stehen innen im Abstand d, und die Schwerachse liegt
   * um e_y weiter aussen. Ohne d faellt die Funktion auf die frueher
   * angenommene Lage zurueck - siebzehn Prozent daneben.
   */
  const e = gurtAchsabstand(p, k, d);   // cm, Achsabstand der Gurte

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
    /** Lichter Abstand der Stege [cm] — die Profile öffnen nach aussen. */
    d,
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
  const rm = abfangRandmasse(typ);
  if (!rm) return null;
  /*
   * ===================== DIE FELDFOLGE STEHT IM SCHEMA ====================
   *
   * Weisung vom 3. September: «Die Masse in den Endbereichen stimmen nicht
   * mit der Zeichnung ueberein. beachte zudem das die enden hier nicht
   * gleich lang sind (gabellaenge). [...] der rest wird gemaess der tabelle
   * verteilt.»
   *
   * Das Schemablatt legt den Traeger in drei Stuecke:
   *
   *   |<--- 2000 --->|<-------- QV = jt - 4000 -------->|<--- 2000 --->|
   *   | R1   |  R2   | An .. A2 A1 A1 A2 .. An          | Ra| Rb | Re  |
   *
   * LINKS ein Blech bei R1 vom Jochende, das naechste R2 weiter - dort
   * beginnt der QV-Bereich. RECHTS drei Bleche: Re vom rechten Ende, davor
   * die beiden Felder Rb und Ra. Beide Endbereiche messen 2000, aber sie
   * sind VERSCHIEDEN eingeteilt, weil links die Gabel sitzt.
   *
   * >>> WAS HIER VORHER STAND, WAR SYMMETRISCH UND DAMIT FALSCH. <<<
   *
   * Die Reihe wurde mittig in die Jochlaenge gelegt und begann bei 2000 -
   * das traf die Feldgrenze, aber es fehlten die drei Bleche in den
   * Endbereichen. Damit lag das erste Feld bei 2.00 m statt bei 1.45 m, und
   * `abfangRahmenfeld` fuehrte den Nachweis an einer Stelle, die es nicht
   * gibt.
   *
   * ======================= DIE FELDZAHL IST RECHENBAR =====================
   *
   * Nicht die Stueckzahl sagt, wieviele Felder der QV-Bereich hat, sondern
   * seine Laenge: die Folge ist An..A2 A1 A1 A2..An, also zwei Felder A1 und
   * der Rest die Regelteilung A. Damit
   *
   *      QV = 2*A1 + (f - 2)*A     ->     f = (QV - 2*A1) / A + 2
   *
   * Gegengerechnet am 3. September an jeder Darstellung aller sieben
   * Schemablaetter - A160/12.50 (A9..A9, 18 Felder), A200/16.50 (A13, 26),
   * A240/19.50 (A16, 32), und sie stimmt jedesmal.
   *
   * DAS LOEST DIE ALTE SPERRE. Frueher wurde die Feldfolge gegen die
   * Stueckzahl geprueft und galt nur bei 20 von 157 Laengen als belegt.
   * Die Stueckzahl braucht es dafuer gar nicht - sie zaehlt Bleche, sie
   * verteilt sie nicht.
   */
  const QV = z.QV ?? [z.QV1];
  const QVsumme = QV.reduce((a2, b2) => a2 + b2, 0);          // mm
  const A = z.A;                                              // Regelteilung
  const A1 = z.A1;                                            // mittleres Paar
  const felder = (QVsumme - 2 * A1) / A + 2;
  const gehtAuf = Number.isInteger(felder) && felder >= 2 && felder % 2 === 0
                  && Math.abs(2 * A1 + (felder - 2) * A - QVsumme) < 1e-6;
  if (!gehtAuf) return null;

  /*
   * >>> IN DER MITTE STEHT NICHT ZWINGEND EIN BLECH. <<<
   *
   * Weisung vom 4. September: «beachte das es nicht immer zwingend in der
   * mitte ein verbindungsblech hat. die abstaende gelten nach tabelle.»
   *
   * Die Tabelle fuehrt zwei Teilungen: A1 = 500 bei 78 Laengen, A1 = 250 bei
   * 80. Bei A1 = 500 treffen sich in der Mitte zwei Felder, und dazwischen
   * sitzt ein Blechpaar. Bei A1 = 250 ist 2 x A1 = A - die beiden halben
   * Felder sind zusammen EIN Regelfeld, und dazwischen sitzt keines.
   *
   * DAS LOEST DEN ALTEN FEHLBETRAG. Seit dem 3. September stand hier
   * vermerkt, dass der Stueckliste bei A1 = 250 «durchweg genau ein Paar
   * fehlt» - bei A160 wie bei A200, also systematisch. Es fehlte ihr nicht:
   * das Blech in der Mitte gibt es dort nicht. A360 / 21.50 m fuehrt 60
   * Bindebleche, also 30 Paare; gebaut waren 31.
   *
   * Die Feldlaengen bleiben, nur die Station dazwischen faellt weg. Der
   * Nachweisschnitt liegt im Randfeld und wird davon nicht beruehrt.
   */
  const mitteOhneBlech = Math.abs(2 * A1 - A) < 1e-6;
  const folge = [];
  const halb = (felder - 2) / 2;
  for (let i = 0; i < halb; i++) folge.push(A);
  if (mitteOhneBlech) folge.push(A1 + A1);
  else folge.push(A1, A1);
  for (let i = 0; i < halb; i++) folge.push(A);

  const stationen = [];
  let x = rm.linksErstesBlech;                                // mm
  stationen.push(x);
  x += rm.linksZweitesFeld;                                   // = aussenBereich
  stationen.push(x);
  folge.forEach((f) => { x += f; stationen.push(x); });
  (rm.rechtsFelder ?? []).forEach((f) => { x += f; stationen.push(x); });
  /*
   * Die Probe schliesst sich von selbst: R1+R2 = 2000, Ra+Rb+Re = 2000 und
   * QV = jt - 4000. Wenn die letzte Station nicht auf jt - Re faellt, ist
   * eines der drei Masse falsch erfasst - dann lieber nichts als eine
   * Blechlage, die nirgends steht.
   */
  const soll = jt * 1000 - rm.rechtsBisEnde;
  if (Math.abs(x - soll) > 1) return null;

  const m = (v) => Math.round(v) / 1000;                      // mm -> m
  /*
   * >>> DIE STUECKZAHL UND DIE ZEICHNUNG GEHEN NICHT IMMER ZUSAMMEN. <<<
   *
   * Die Stueckliste der Konstruktionszeichnung fuehrt die Regelbleche und
   * daneben die Sonderbleche der Enden: eines links (`endeL`) und je nach
   * Typ eines oder zwei rechts (`endeR`). Zusammen also
   *
   *      Stationen laut Liste = blechStationen + 1 + Anzahl(endeR)
   *
   * Gefunden am 3. September: bei allen Laengen mit A1 = 500 deckt sich das
   * mit den Stationen des Schemas. Bei A1 = 250 fehlt der Liste durchweg
   * GENAU EIN PAAR - bei A160 wie bei A200, also nicht bei einem Typ
   * verzaehlt, sondern systematisch. Es sieht aus, als haette die
   * Stueckliste die Feldzahl als QV/A gerechnet, wo sie QV/A + 1 ist.
   *
   * Massgebend fuer die LAGE ist das Schema - es bemasst jede Station
   * einzeln, und seine Summen gehen auf. Die Stueckzahl bleibt daneben
   * stehen; `blechzahlStimmt` sagt, wo sie sich decken. Aufloesen muss das
   * der Auftraggeber, nicht dieser Kern.
   */
  const bl = abfangBindeblech(typ);
  const nEndeR = Array.isArray(bl?.endeR) ? bl.endeR.length : (bl?.endeR ? 1 : 0);
  /*
   * >>> NICHT AN JEDER STATION STEHT EIN BLECH. <<<
   *
   * Ab A240 ist der Traeger gegliedert, und an den Grenzen der
   * QV-Bereiche sitzt statt eines Flachstahls eine QUERSTEIFE aus
   * Walzprofil - bei A240 ein IPE 240 x 600, in der Stueckliste als eigene
   * Position mit nB+1 Stueck (nB = Zahl der QV-Bereiche), dazu ein
   * einzelnes IPE 240 x 280.
   *
   * Nachgerechnet am 3. September ueber alle 158 Laengen: mit
   *
   *      Steifen = 0            bei A160 und A200 (ungegliedert)
   *      Steifen = nB + 2       bei A240
   *      Steifen = nB + 1       bei A270 bis A360
   *
   * decken sich Schema und Stueckliste bei JEDER Laenge mit A1 = 500. Was
   * dann noch bleibt, ist der eine systematische Fehlbetrag bei A1 = 250.
   *
   * >>> DER NACHWEIS RECHNET SIE TROTZDEM ALS BLECH. <<<
   *
   * Eine Quersteife aus Walzprofil ist um ein Vielfaches steifer als der
   * Flachstahl. Sie als Blech nachzuweisen liegt auf der SICHEREN Seite -
   * der Nachweis faellt am schwaecheren Bauteil. Sie richtig anzusetzen
   * waere eine Entscheidung ueber den Spannungsverlauf und gehoert
   * vorgaengig gefragt; bis dahin steht sie hier als Zahl, nicht als
   * Rechenregel.
   */
  const nB = QV.length;
  const name = typeof typ === 'string' ? typ : typ?.typ;
  /*
   * >>> DIE STEIFEN SITZEN AN DEN GRENZEN DER QV-BEREICHE. <<<
   *
   * Der erste Bereich beginnt bei 2000, jeder weitere schliesst an, der
   * letzte endet bei jt - 2000. Das sind nB + 1 Grenzen - genau die Zahl,
   * die die Stueckliste unter «Querversteifung» fuehrt.
   *
   * Nachgerechnet am 3. September ueber alle 120 Laengen der fuenf
   * gegliederten Typen: JEDE Grenze faellt auf eine Blechstation. Sonst
   * waere die Zuordnung geraten.
   */
  const qs = abfangQuersteife(typ);
  const grenzen = [];
  if (qs && nB > 1) {
    let g = rm.aussenBereich;
    grenzen.push(g);
    for (const q of QV) { g += q; grenzen.push(g); }
  }
  const istGrenze = (mm) => grenzen.some((g) => Math.abs(g - mm) < 0.5);
  /*
   * DIE ENDBLECHE VON AUSSEN NACH INNEN. Der Traeger wird zum Ende hin
   * schmaler (Spreizung 280 statt d im Feld), also ist das KUERZERE Blech
   * das aeussere - eine Zuordnung aus der Geometrie, nicht aus der
   * Reihenfolge der Erfassung: A330 und A360 fuehren ihre beiden endeR
   * umgekehrt.
   */
  const endeR = (Array.isArray(bl?.endeR) ? bl.endeR : bl?.endeR ? [bl.endeR] : [])
    .filter(Boolean).slice().sort((a2, b2) => (a2.l ?? 0) - (b2.l ?? 0));
  const rechts = [];
  if (qs?.ende) rechts.push({ art: 'steifeEnde', profil: qs.ende.profil });
  endeR.forEach((m2) => rechts.push({ art: 'endeR', masse: m2 }));

  const arten = stationen.map((mm, i) => {
    if (i === 0) return bl?.endeL ? { art: 'endeL', masse: bl.endeL } : { art: 'regel' };
    const vonRechts = stationen.length - 1 - i;      // 0 = aeusserste rechts
    if (vonRechts < rechts.length) return rechts[vonRechts];
    if (istGrenze(mm)) return { art: 'steife', profil: qs.profil };
    return { art: 'regel' };
  });
  const steifen = arten.filter((a2) => a2.art === 'steife'
                                    || a2.art === 'steifeEnde').length;
  const ausListe = z.blechStationen
    ? z.blechStationen + (bl?.endeL ? 1 : 0) + nEndeR + steifen : null;
  return {
    stationen: stationen.map(m),
    anzahl: stationen.length,
    /** Alle Bleche - je Station eines oben und eines unten. */
    bleche: stationen.length * 2,
    /** Regelbleche laut Stueckliste der Konstruktionszeichnung. */
    blecheListe: z.bleche ?? null,
    /** Stationen laut Stueckliste, Endbleche mitgezaehlt. */
    stationenListe: ausListe,
    /** Ob Schema und Stueckliste dieselbe Zahl nennen. */
    blechzahlStimmt: ausListe === null ? null : ausListe === stationen.length,
    /** Was an jeder Station sitzt - Blech, Endblech oder Quersteife. */
    arten,
    /** Stationen mit Quersteife statt Bindeblech - ab A240. */
    quersteifen: steifen,
    /** Ob die Stueckzahl selbst fraglich ist (A360/21.00: 85, ungerade). */
    blechFraglich: Boolean(z.blechFraglich),
    bereiche: QV.map((q, i) => ({ nr: i + 1, laenge: q / 1000 })),
    /** Das erste Blech vom linken Jochende [m] - dort sitzt die Gabel. */
    rand: m(rm.linksErstesBlech),
    /** Das letzte Blech vom rechten Jochende [m]. */
    randRechts: m(rm.rechtsBisEnde),
    /*
     * Die Lage stammt jetzt durchweg aus dem Schemablatt, nicht mehr aus
     * einer symmetrischen Schaetzung. Das Feld bleibt, damit Aufrufer, die
     * darauf sehen, nichts merken - es ist nur immer wahr.
     */
    randGenau: true,
    teilung: m(A),
    erstesFeld: m(A1),
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
    const z = abfangMasse(a, jt);
    if (!z) return false;
    /*
     * DIE LAENGE MUSS GEFUEHRT SEIN - UND IHRE BLECHLAGE MUSS AUFGEHEN.
     *
     * Hier stand `!z.blechFraglich && z.blechStationen > 0`: die Zusage hing
     * an der STUECKZAHL. Das galt, solange die Stationen aus ihr abgeleitet
     * wurden. Seit die Lage aus dem Schema kommt - Randmasse plus Feldfolge
     * aus QV und A1 - traegt die Stueckzahl den Nachweis nicht mehr, und
     * A360 / 21.00 m mit seinen 85 Blechen ist wieder rechenbar: die
     * fragliche Zahl zaehlt Bleche, sie verteilt sie nicht.
     *
     * Gefragt wird jetzt, was der Nachweis wirklich braucht: kommt eine
     * Blechlage zustande? `abfangBlechstationen` prueft dabei selbst, ob die
     * Feldfolge in QV aufgeht und ob sie rechts auf jt - Re endet.
     */
    return Boolean(abfangBlechstationen(a, jt));
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
 * DAS MASSGEBENDE RAHMENFELD EINES ABFANGJOCHS [m].
 *
 * >>> NICHT DIE REGELTEILUNG. <<<
 *
 * Gefunden am 3. September beim Vergleich mit AxisVM und PyNite. Beide gaben
 * ein Gurtmoment, das vier- bis fuenfmal ueber dem des Kerns lag - und die
 * massgebende Stelle war nicht die Feldmitte, sondern das AUFLAGER.
 *
 * Der Grund ist Geometrie, kein Kennwert: zwischen Auflager und erstem Blech
 * liegt bei A160 / 9.50 m mehr als das Doppelte der Regelteilung, und dort
 * steht zugleich die groesste Querkraft. Mit der Regelteilung zu rechnen
 * unterschaetzt das Moment um genau diesen Faktor.
 *
 * Gemessen: eta 0.61 im Kern gegen 1.54 in AxisVM. Der Kern lag auf der
 * UNSICHEREN Seite, und zwar um das Zweieinhalbfache.
 *
 * >>> DIE ZAHL WURDE AM 3. SEPTEMBER KLEINER - UND RICHTIGER. <<<
 *
 * Damals stand das erste Blech rechnerisch bei 2.00 m, weil die Reihe
 * symmetrisch in die Jochlaenge gelegt wurde. Das Schemablatt zeigt es
 * anders: links sitzt schon bei 1.45 m ein Blech, und das Auflager liegt
 * um den Ueberstand naeher. Bei A160 / 9.50 m (js bis 9.00) bleiben damit
 * 1.20 m statt 2.00 - das massgebende Feld ist immer noch das Randfeld,
 * aber es ist knapp zweieinhalb Regelteilungen lang, nicht vier.
 *
 * Genommen wird deshalb das GROESSTE Feld - der Randabstand, wenn er groesser
 * ist als die Teilung. Das ist die Stelle, an der der Nachweis faellt.
 */
export function abfangRahmenfeld(typ, jt) {
  const ein = abfangBlechstationen(typ, jt);
  if (!ein) return null;
  const sw = abfangStuetzweite(typ, jt);
  /*
   * >>> DIE STATIONEN ZAEHLEN AB JOCHENDE, DIE AUFLAGER LIEGEN INNEN. <<<
   *
   * Der Traeger kragt ueber beide Auflager aus: js ist die Stuetzweite, jt
   * die Jochlaenge, und je Seite bleibt ue = (jt - js)/2. Hier stand vorher
   * `L = sw.bis` als Traegerlaenge - das mischte zwei Bezugspunkte: das
   * erste Feld wurde vom JOCHENDE gemessen, das letzte bis zur STUETZWEITE.
   *
   * Genommen wird die groesste gefuehrte Stuetzweite: sie gibt den
   * kleinsten Ueberstand und damit das laengste Randfeld - die sichere
   * Seite.
   */
  const js = sw ? sw.bis : jt;
  const ue = Math.max(0, (jt - js) / 2);
  const st = ein.stationen;
  /*
   * Die Felder: vom Auflager zum ersten Blech, zwischen den Blechen, vom
   * letzten Blech zum anderen Auflager. Das Randfeld traegt die groesste
   * Querkraft und ist zugleich das laengste - beides trifft zusammen.
   */
  const felder = [];
  if (st.length) {
    felder.push(Math.max(0, st[0] - ue));
    for (let i = 1; i < st.length; i++) felder.push(st[i] - st[i - 1]);
    felder.push(Math.max(0, (jt - ue) - st[st.length - 1]));
  }
  const groesst = felder.length ? Math.max(...felder) : ein.teilung;
  return {
    felder,
    /** Das massgebende Feld [m] - das laengste. */
    a: groesst,
    randfeld: felder.length ? felder[0] : null,
    /** Der Ueberstand ueber das Auflager je Seite [m]. */
    ueberstand: ue,
    teilung: ein.teilung,
    /** Um wieviel das Randfeld die Regelteilung uebersteigt. */
    faktor: ein.teilung > 0 ? groesst / ein.teilung : 1,
  };
}

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
export function abfangGurtnachweis(q, s, a, fyd, opt = {}) {
  const N = abfangGurtkraefte(s.Mrahmen ?? 0, q.e).N;         // kN
  /*
   * Die örtliche Biegung: die Querkraft verteilt sich auf beide Gurte, und
   * jeder Gurt biegt zwischen zwei Blechen wie ein beidseitig eingespannter
   * Stab - Moment V/2 · a/2 an den Enden.
   */
  const Voertl = (Math.abs(s.Vrahmen ?? 0) / 2) * (a / 2);    // kNm
  /*
   * >>> DER STEIFE KNOTENBEREICH - WIE BEIM TRAGJOCH. <<<
   *
   * Weisung vom 3. September: «im bereich der knoten die ueberlagerung der
   * traeger und verbindungsbleche steif ausbilden [...] diese auswertung
   * auch beim nachweiss in der app beruecksichtigen wie beim tragjoch.»
   *
   * Am Knoten ueberlappt das Bindeblech den Gurt und ist mit ihm
   * verschweisst; ueber die Blechbreite b_Bl wirkt die Verbindung
   * biegesteif. Massgebend ist deshalb nicht das Moment auf der Knotenachse,
   * sondern das am ANSCHNITT des Blechs. Der Momentenverlauf im Gurt ist
   * linear mit Nullpunkt in Feldmitte, also
   *
   *      M_Anschnitt = M_Knoten · (a − b_Bl) / a
   *
   * Dieselbe Formel wie in core.querschnitt.js, aus demselben Grund: beide
   * Staebe werden am RAND des starren Bereichs nachgewiesen, nicht auf ihrer
   * Schwerachse.
   *
   * >>> DAS IST EINE ABSPRACHE, KEINE RECHENFRAGE. <<<
   *
   * Ein Pruefmodell, das Achse zu Achse rechnet - so rechnet AxisVM ohne
   * Zutun -, findet im Gurt das groessere Knotenmoment. Der Schalter
   * `knotenbereich` haelt beide Antworten auseinander; Vorgabe ist der
   * steife Bereich, wie beim Tragjoch.
   */
  const bBl = Number(opt.bBl) || 0;                            // m
  const steif = (opt.knotenbereich ?? 'anschnitt') !== 'schwerachsen';
  const anschnitt = (steif && bBl > 0 && a > bBl) ? (a - bBl) / a : 1;
  const Moertl = Voertl * ABFANG_GURT_DAEMPFUNG * anschnitt;

  // kNm -> kNcm für die Widerstandsmomente in cm³
  const sigN = N / q.Agurt;
  const sigVert = (Math.abs(s.Mvert ?? 0) * 100) / q.Wvert;
  const sigOertl = (Moertl * 100) / q.Wgurtz;
  const sigma = sigN + sigVert + sigOertl;

  return {
    N, Moertl,
    /** Minderung aus dem steifen Knotenbereich - 1.0 heisst: keine. */
    anschnitt, bBl,
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
 * DER NACHWEIS EINER QUERVERSTEIFUNG — ab A240.
 *
 * >>> SIE ERSETZT DAS BLECHPAAR, ALSO NIMMT SIE DIE GANZE QUERKRAFT. <<<
 *
 * Das Bindeblech kommt zu zweit: eines oben, eines unten, jedes trägt die
 * halbe Querkraft der Rahmenebene. Die Steife ist EIN Riegel — ihre beiden
 * Flansche liegen zwar dort, wo sonst die Bleche liegen, aber sie hängen
 * über den Steg zusammen und werden gemeinsam nachgewiesen. Deshalb steht
 * hier `V` und nicht `V/2`.
 *
 * >>> IN DER RAHMENEBENE WIRKT IHRE SCHWACHE ACHSE. <<<
 *
 * Der Schnitt C-C zeigt den Riegel mit SENKRECHTEM Steg zwischen die
 * Gurtstege geschweisst. Die Rahmenebene liegt waagrecht; die Biegung des
 * Riegels darin geht deshalb um seine z-Achse, nicht um die starke y-Achse.
 * Wer hier `W_y` einsetzte, bekäme bei IPE 240 das Siebenfache — 324 statt
 * 47 cm³ — und einen Nachweis, der immer aufginge.
 *
 * Den Schub tragen dabei die FLANSCHE, nicht der Steg: A_v = 2·b·t_f. Beim
 * Blech war es der ganze Querschnitt, weil ein Flachstahl keinen Steg hat.
 *
 * >>> IN DIESER RICHTUNG IST SIE FAST GENAU DAS BLECHPAAR. <<<
 *
 * W_z eines I-Profils ist im Wesentlichen die Summe seiner beiden Flansche:
 * 2·t_f·b²/6. Genau die Formel des Blechpaares, nur mit den Flanschmassen.
 * Gemessen an den fünf Typen (W_z gegen das Paar, das sie ersetzt):
 *
 *      A240   47.3 : 48.0   0.99      A330    98.5 : 65.3   1.51
 *      A270   62.2 : 65.3   0.95      A360   123.0 : 65.3   1.88
 *      A300   80.5 : 65.3   1.23
 *
 * Bei A240 und A270 ist die Steife also SCHWÄCHER als das Paar — um ein bis
 * fünf Prozent. Die frühere Auskunft, sie als Blech zu rechnen liege auf der
 * sicheren Seite, galt für die grossen Typen und war bei den beiden kleinen
 * knapp daneben. Der Nachweis wird dort jetzt geringfügig schärfer.
 *
 * Wo die Steife wirklich mehr kann, ist die andere Richtung: der Steg hält
 * die beiden Flansche auf Abstand und den Querschnitt in Form. Dafür ist sie
 * eingebaut — nicht für die Rahmenebene.
 *
 * @param {string} profil  Profilname der Steife, z.B. 'IPE 240'
 * @param {number} V       Querkraft der Rahmenebene an dieser Stelle [kN]
 * @param {number} aSum    Summe der Nachbarfelder [m]
 * @param {number} e       Achsabstand der Gurte [cm]
 * @param {number} fyd     Bemessungsfestigkeit [kN/cm²]
 */
export function abfangSteifennachweis(profil, V, aSum, e, fyd) {
  const p = getGurtprofil(profil);
  const M = (Math.abs(V) * aSum) / 4;                    // kNm
  const Vsteife = e > 0 ? (2 * M) / (e / 100) : 0;       // kN
  const W = p.Wz;                                        // cm³, schwache Achse
  const Av = 2 * p.b * p.tf;                             // cm², die Flansche
  const sigma = W > 0 ? (M * 100) / W : Infinity;
  const tau = Av > 0 ? Vsteife / Av : Infinity;
  const sigmaV = Math.sqrt(sigma * sigma + 3 * tau * tau);
  return {
    profil: p.name, b: p.b, t: p.tf, W, A: Av,
    /*
     * `Vebene` heisst beim Blech die halbe Querkraft. Hier ist es die ganze
     * - der Name bleibt, damit beide Nachweise nebeneinander auswertbar
     * sind, aber `istSteife` sagt, dass er etwas anderes bedeutet.
     */
    Vebene: Math.abs(V), Mblech: M, Vblech: Vsteife,
    sigma, tau, sigmaV, fyd,
    eta: fyd > 0 ? sigmaV / fyd : Infinity,
    istSteife: true,
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
     * >>> WAS AN DIESER STATION SITZT, SAGT DIE EINTEILUNG. <<<
     *
     * Hier stand «erstes und letztes bekommen das schwächste Endblech, alle
     * anderen das Regelmass» - eine Notlösung, solange die Zuordnung nicht
     * erfasst war. `abfangBlechstationen` führt sie jetzt Station für
     * Station: Endblech links, Regelblech, QUERSTEIFE an den QV-Grenzen,
     * die beiden Endbleche rechts.
     *
     * Die Steife ist kein Blech. Sie bekommt ihren eigenen Nachweis - ein
     * Riegel statt zweier Bleche, mit dem Widerstandsmoment der schwachen
     * Profilachse.
     */
    const art = ein.arten?.[i] ?? { art: 'regel' };
    const istRand = i === 0 || i === st.length - 1;
    if (art.art === 'steife' || art.art === 'steifeEnde') {
      const n2 = abfangSteifennachweis(art.profil, Vfunktion(x), aSum, q.e, fyd);
      return { i, x, aL, aR, aSum, istRand, art: art.art, masse: null, ...n2 };
    }
    const masse = art.masse ?? bl.regel;
    const n = abfangBlechnachweis(masse, Vfunktion(x), aSum, q.e, fyd);
    return { i, x, aL, aR, aSum, istRand, art: art.art, masse,
             istSteife: false, ...n };
  });
  const massgebend = bleche.reduce(
    (m, c) => (!m || c.eta > m.eta ? c : m), null);
  return { bleche, massgebend, e: q.e, einteilung: ein };
}


/* ===========================================================================
 * WIE EIN ANBAUTEIL AM ABFANGJOCH ANGREIFT
 * ===========================================================================
 *
 * Weisung vom 4. September, wörtlich:
 *
 *   «die anbindung an das joch erfolgt über die beiden gurte für die
 *    vertikalen elemente (jochaufsatz / hängestütze / fahrleitung etc.) Die
 *    Abgefangenen Leiter wirken auf mitte Träger. Die Abgefangenen leiter
 *    können auf beiden Seiten angesetzt werden. so dass entweder der vordere
 *    oder hintere IPE oder UPE Träger belastet wird.»
 *
 * >>> ZWEI ANBINDUNGEN, NICHT EINE. <<<
 *
 * Das Abfangjoch hat zwei Gurte nebeneinander, und es macht einen
 * Unterschied, an welchem ein Bauteil hängt:
 *
 *   GURTE   Was auf dem Joch steht oder daran hängt - Jochaufsatz,
 *           Hängestütze, eine direkt abgezogene Fahrleitung - sitzt auf
 *           BEIDEN Gurten. Seine Last teilt sich, und der Träger trägt sie
 *           als Rahmen.
 *
 *   MITTE   Der abgefangene Leiter zieht auf MITTE TRÄGER, auf der
 *           Jochachse. Er kommt von einer Seite, und diese Seite entscheidet,
 *           welcher der beiden Gurte die Kraft aufnimmt.
 *
 * >>> DIE SEITE IST EINE EINGABE, KEINE ABLEITUNG. <<<
 *
 * Ein Leiter kann von vorn oder von hinten kommen; beides ist gebaut. Aus
 * den Daten des Anbauteils folgt das nicht, also steht es im Anbauteil.
 * Ohne Angabe gilt vorn - eine Vorgabe, keine Behauptung.
 *
 * >>> UND DIE ART LÄSST SICH ÜBERSCHREIBEN. <<<
 *
 * Die Vorgabe folgt der Vorlagengruppe: `leiter` zieht auf Mitte, alles
 * andere sitzt auf den Gurten. Das trifft den Regelfall, aber nicht jeden -
 * eine Fahrleitung kann als vertikales Element hängen ODER abgefangen sein.
 * Wer es anders braucht, trägt es am Bauteil ein, statt dass hier geraten
 * wird.
 * =========================================================================== */

export const ABFANG_ANBINDUNGEN = [
  { key: 'gurte', label: 'Über beide Gurte',
    hinweis: 'Vertikale Elemente — Jochaufsatz, Hängestütze, hängende '
           + 'Fahrleitung. Die Last teilt sich auf beide Gurte.' },
  { key: 'mitte', label: 'Mitte Träger',
    hinweis: 'Abgefangener Leiter. Zieht auf der Jochachse; die Seite sagt, '
           + 'welcher Gurt die Kraft aufnimmt.' },
];

export const ABFANG_SEITEN = [
  { key: 'V', label: 'vorn' },
  { key: 'H', label: 'hinten' },
];

/**
 * Die Anbindung eines Anbauteils an das Abfangjoch.
 *
 * @param {object} a      Anbauteil
 * @param {object} vorl   seine Vorlage (für die Vorgabe der Art), optional
 * @returns {{art: 'gurte'|'mitte', seite: 'V'|'H'|null, vorgegeben: boolean}}
 */
export function abfangAnbindung(a, vorl = null) {
  const gesetzt = ABFANG_ANBINDUNGEN.some((x) => x.key === a?.anbindung);
  /*
   * DIE VORGABE ERKENNT DEN LEITER AN SEINER VORLAGE. Die Gruppe steht in
   * der Vorlagendatenbank, nicht am angelegten Bauteil - wer sie nicht
   * mitgibt, bekaeme sonst fuer jeden Leiter «Gurte». Die Kennung reicht:
   * `leiter-nfl`, `leiter-rfl`, `leiter-rl`.
   *
   * OFFEN: `leiter-traverse` traegt dieselbe Gruppe und ist doch ein
   * vertikales Element. Sie steht damit vorerst auf «Mitte» - am Bauteil
   * umstellbar, und die Karte sagt, dass es eine Vorgabe war.
   */
  const gruppe = vorl?.gruppe ?? a?.gruppe
    ?? (/^leiter-/.test(String(a?.vorlage ?? '')) ? 'leiter' : null);
  const art = gesetzt ? a.anbindung : (gruppe === 'leiter' ? 'mitte' : 'gurte');
  const seite = art === 'mitte'
    ? (ABFANG_SEITEN.some((x) => x.key === a?.seite) ? a.seite : 'V')
    : null;
  return { art, seite, vorgegeben: !gesetzt };
}
