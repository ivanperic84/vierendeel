/**
 * app.stabwerk.js
 * ---------------------------------------------------------------------------
 * DAS TRAGWERK ALS STABWERK RECHNEN - AUF KNOPFDRUCK.
 *
 * Weisung vom 25. September: «ersatzbalken als optionales rechenverfahren in
 * den optionen auswaehlbar machen, primaer den loeser nutzen, man koennte
 * einen button zur ausloesung der berechnung ansetzen der das finale modell
 * berechnet und die werte setzt».
 *
 * >>> WARUM EIN KNOPF UND KEIN STILLER AUSTAUSCH. <<<
 *
 * Gemessen am J90/20 m: der Ersatzbalken braucht fuer die ganze Huellkurve
 * 4.7 ms, der Loeser 441 ms. Bei jedem Tastendruck waere die Anwendung
 * traege - und zwar genau dann, wenn man zuegig eingibt. Also rechnet der
 * schnelle Weg weiter mit, und der genaue laeuft, wenn man ihn ausloest.
 *
 * >>> UND WARUM DAS ERGEBNIS EIN ABLAUFDATUM HAT. <<<
 *
 * Es bleibt stehen, waehrend weitergetippt wird. Ohne Kennung stuende
 * irgendwann ein eta da, das zu einer anderen Geometrie gehoert, und
 * niemand saehe es ihm an. Genau in diese Falle ist der Vergleich gegen
 * PyNite gelaufen (ein 20-m-Joch gegen die Ergebnisse eines 8-m-Jochs,
 * Abweichungen bis Faktor 39). Deshalb traegt jedes Ergebnis die Kennung
 * des Eingabestands, aus dem es entstand - und die Anzeige sagt, wenn sie
 * nicht mehr passt.
 *
 * Das Modul importiert app.js nicht zurueck; den Arbeitsstand bekommt es
 * als `app` (siehe das Kontextobjekt in app.js).
 * ---------------------------------------------------------------------------
 */
import { rechensatz } from './core.constants.js';
import { lastfaelle } from './core.lasten.js';
import { eingabeKennung, stabwerkHuelle } from './core.stabnachweis.js';
import { loese } from './core.stabwerk.js';
import { getStahl } from './data.profiles.js';
import { lasten, stabmodell, stabmodellJson } from './export.axisvm.js';

/*
 * RECHENVERFAHREN und `verfahrenVon` stehen im KERN (core.stabnachweis.js).
 * Die Maske braucht sie, und `ui.js` darf kein app-Modul importieren - das
 * waere eine Abhaengigkeit von unten nach oben.
 */

/* ===========================================================================
 * >>> WAS DAS STABWERK NICHT ERSETZT: DIE STABILITAET. <<<
 * =========================================================================
 *
 * Der Loeser gibt Schnittgroessen und daraus Querschnittsspannungen. Der
 * Nachweis gegen KNICKEN ist etwas anderes - er haengt an der Knicklaenge,
 * am Schlankheitsgrad und an den Beiwerten der SIA 263, nicht am
 * Rechenweg. Gemessen am J90/20 m, Mast HEB 240:
 *
 *     Querschnittsspannung   Kern 0.7770   Stabwerk 0.7756   (0.2 %)
 *     mit Stabilitaet        Kern 0.8386   Stabwerk -
 *
 * Die beiden Wege sind sich bei der SPANNUNG also einig; die Stabilitaet
 * kommt weiterhin aus `core.mast.js` und wird darueber gelegt. Wer das
 * uebersieht, weist einen schlanken Masten um 8 Prozent zu guenstig nach.
 * ========================================================================= */



/**
 * Das aktive Tragwerk als Stabwerk rechnen.
 *
 * Gibt den Datensatz zurueck - abgelegt wird er vom Aufrufer. Bei einem
 * Tragwerk ohne Stabmodell (Abfangjoch mit eigenem Kern, Tragausleger)
 * kommt `null` zurueck; das ist kein Fehler, sondern eine Auskunft.
 */
/* ===========================================================================
 * >>> WELCHE ARTEN EIN STABMODELL HABEN - UND WELCHE NICHT. <<<
 * =========================================================================
 *
 * Gefunden am 25. September beim Durchgang durch die Tragwerksarten
 * (Weisung: «mach eine pruefung von verschiedenen tragwerksarten und
 * verschiedenen zusammensetzungen»):
 *
 * `stabmodell()` biegt fuer den EINZELMASTEN ab (1 Stab), aber NICHT fuer
 * das Abfangjoch und den Tragausleger - beide bekamen das Tragjoch-Modell
 * mit 942 Staeben. Der Knopf haette dort ein fremdes Tragwerk gerechnet
 * und dessen eta als Ergebnis hingestellt. Gemessen: Abfangjoch 0.8065,
 * Tragausleger 0.8066 - beide mit `MAST_B_S1` als massgebendem Stab, den
 * es in keiner der beiden Arten gibt.
 *
 * >>> LIEBER KEINE ZAHL ALS EINE FALSCHE. <<<
 *
 * Das ABFANGJOCH hat ein eigenes Stabmodell (`abfangBau` in
 * export.axisvm.abfang.js, seit 20. September) - es ueber diesen Weg zu
 * fuehren ist ein eigener Schritt und nicht getan, solange es niemand
 * gemessen hat. Der TRAGAUSLEGER wartet ohnehin auf sein Kragarm-Modell
 * und ist bis dahin «NICHT nachgewiesen» (Entscheid vom 18. September).
 * ========================================================================= */
export const ARTEN_MIT_STABMODELL = ['joch', 'einzelmast'];

/** Warum diese Art (noch) kein Stabwerk rechnet - oder null, wenn sie es tut. */
export function ohneStabmodell(art) {
  if (ARTEN_MIT_STABMODELL.includes(art)) return null;
  if (art === 'abfangjoch') {
    return 'Das Abfangjoch bringt ein eigenes Stabmodell mit; es ist an '
         + 'diesen Rechenweg noch nicht angeschlossen.';
  }
  if (art === 'tragausleger') {
    return 'Der Tragausleger wartet auf sein Kragarm-Modell und ist bis '
         + 'dahin nicht nachgewiesen.';
  }
  return `Für die Tragwerksart «${art}» gibt es kein Stabmodell.`;
}

export function rechneStabwerk(app) {
  const erg = app.letzte?.erg;
  if (!erg?.modell) return null;

  /*
   * DIE ART ENTSCHEIDET, BEVOR GERECHNET WIRD. `stabmodell()` wuerde sonst
   * klaglos ein Tragjoch bauen - siehe den Block darueber.
   */
  const art = erg.modell.tragwerksart ?? 'joch';
  const grund = ohneStabmodell(art);
  if (grund) return { ohneModell: grund, art, kennung: eingabeKennung(app.werte) };

  const satz = rechensatz(app.werte);

  const t0 = Date.now();
  let dat = null; let lsg = null;
  try {
    const bau = stabmodell(erg.modell, { knotenmodell: 'anschnitt' });
    /*
     * MIT EIGENGEWICHT UND GETRENNTEM G - wie die COM-Ausleitung. Der
     * Loeser steuert sein Eigengewicht zwar selbst bei; hier kommt es aus
     * der Lastliste, damit beide Wege dieselbe staendige Last sehen wie
     * AxisVM. Getrennt, weil die charakteristischen Einzelfaelle es
     * brauchen (Entscheid vom 20. September).
     */
    bau.lasten = lasten(erg.modell, bau, { eigengewicht: true, gTrennen: true });
    dat = stabmodellJson(erg.modell, { bau, knotenmodell: 'anschnitt' });
    lsg = loese(dat, { eigengewicht: false });
  } catch (e) {
    return { fehler: String(e?.message ?? e), kennung: eingabeKennung(app.werte) };
  }

  const stahl = getStahl(satz.stahl);
  const gammaM0 = Number(satz.gammaM0) > 0 ? Number(satz.gammaM0) : 1.05;
  const fyd = (stahl?.fy ?? 235) / gammaM0;

  const faelle = lastfaelle(satz).filter((l) => l.nachweis !== false);
  const huelle = stabwerkHuelle(dat, lsg, faelle, fyd);

  return {
    ...huelle,
    kennung: eingabeKennung(app.werte),
    fyd,
    knoten: dat.knoten.length,
    staebe: dat.staebe.length,
    freiheitsgrade: lsg.n,
    faelle: faelle.length,
    schubweich: lsg.schubweich === true,
    ms: Date.now() - t0,
  };
}

/**
 * Passt das abgelegte Ergebnis noch zum Eingabestand?
 *
 * >>> DREI ZUSTAENDE, NICHT ZWEI. <<<
 * Es gibt kein Ergebnis, es gibt ein gueltiges, oder es gibt ein
 * VERALTETES. Der dritte ist der gefaehrliche: er sieht aus wie der zweite.
 */
export function stabwerkStand(app) {
  /*
   * Die Art entscheidet vor allem anderen: wo es kein Stabmodell gibt,
   * nuetzt auch ein gueltiges Ergebnis nichts - es gaebe keines.
   */
  const art = app.letzte?.erg?.modell?.tragwerksart ?? 'joch';
  if (ohneStabmodell(art)) return 'ohneModell';
  const s = app.stabwerk;
  if (!s) return 'fehlt';
  if (s.ohneModell) return 'ohneModell';
  if (s.fehler) return 'fehler';
  return s.kennung === eingabeKennung(app.werte) ? 'gueltig' : 'veraltet';
}
