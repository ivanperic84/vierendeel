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
 * ETAPPE 3 (25. September): DIE JOCHREIHE ALS GEKOPPELTES TRAGWERK.
 *
 * Weisung vom 19. September: «die zusammenhaengenden jochtragwerke sind als
 * gesamtheitliches tragwerk zu betrachten», Bauplan Schritt 3-5. Seither
 * rechnet der Knopf nicht mehr das aktive Tragwerk, sondern das GANZE
 * BLATT - Joche und Masten der Reihe in einem Stabwerk, der geteilte Mast
 * einmal und mit den Kraeften beider Joche. Die Rahmenwirkung faellt davon
 * ab: sie ist kein eigener Schritt, sondern die Folge davon, dass Joch und
 * Mast im selben Gleichungssystem stehen.
 *
 * Das Modul importiert app.js nicht zurueck; den Arbeitsstand bekommt es
 * als `app` (siehe das Kontextobjekt in app.js).
 * ---------------------------------------------------------------------------
 */
import { mastenFuer, rechensatz, sichtbareTragwerke, tragwerkSatz,
         tragwerkeVon } from './core.constants.js';
import { lastfaelle } from './core.lasten.js';
import { eingabeKennung, stabwerkHuelle } from './core.stabnachweis.js';
import { loese } from './core.stabwerk.js';
import { modell } from './core.vierendeel.js';
import { getProfil, getStahl } from './data.profiles.js';
import { getTragjoch } from './data.tragjoche.js';
import { blattWennMehrere, lasten, stabmodell, stabmodellJson } from './export.axisvm.js';

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

/* ===========================================================================
 * >>> DIE REIHE IST NUR SO WEIT ZU RECHNEN, WIE JEDES IHRER TRAGWERKE
 *     EIN STABMODELL HAT. <<<
 * =========================================================================
 *
 * Etappe 3 verschaerft die Frage vom 25. September: bis dahin entschied die
 * Art des AKTIVEN Tragwerks, jetzt stehen alle sichtbaren in EINEM Modell.
 * Steht ein Tragausleger dazwischen, baute `stabmodell()` an seiner Stelle
 * ein Tragjoch - und die ganze Reihe traege ein Bauteil, das es nicht gibt.
 * Ein einziges solches Tragwerk macht das Ergebnis der Reihe wertlos, und
 * zwar unsichtbar.
 *
 * Deshalb: alles oder nichts, mit Namen. Wer die Reihe rechnen will, muss
 * das fremde Tragwerk ausblenden - dann sagt das Blattmodell es ohnehin
 * (`blatt.versteckt`).
 */
export function reiheOhneStabmodell(werte) {
  const alle = sichtbareTragwerke(werte) ?? [];
  for (const t of alle) {
    const grund = ohneStabmodell(t.tragwerksart ?? 'joch');
    if (grund) {
      return alle.length > 1 ? `${t.id}: ${grund}` : grund;
    }
  }
  return null;
}

export function rechneStabwerk(app) {
  const erg = app.letzte?.erg;
  if (!erg?.modell) return null;

  /*
   * DIE ART ENTSCHEIDET, BEVOR GERECHNET WIRD. `stabmodell()` wuerde sonst
   * klaglos ein Tragjoch bauen - siehe den Block darueber.
   */
  const grund = reiheOhneStabmodell(app.werte);
  if (grund) return { ohneModell: grund, kennung: eingabeKennung(app.werte) };

  const satz = rechensatz(app.werte);
  /*
   * >>> DIE SAETZE ALLER TRAGWERKE, DAS AKTIVE ZUERST. <<<
   *
   * Sie tragen die Lastfaelle: die ohne Leiterbruch sind in allen gleich
   * (Wind, Schnee und die Beiwerte gehoeren dem Blatt), die MIT Bruch
   * gehoeren je einem Tragwerk. Ohne sie fiele der Leiterriss des
   * Nachbarjochs aus dem Nachweis - gemessen am 25. September, siehe den
   * Befund in stabmodellJson().
   */
  const saetze = (sichtbareTragwerke(app.werte) ?? [])
    .map((t) => tragwerkSatz(app.werte, t.id));
  const eingaben = [satz, ...saetze.filter((s) => s.twId !== satz.twId)];

  const t0 = Date.now();
  let dat = null; let lsg = null; let bau = null;
  const opt = { knotenmodell: 'anschnitt', eigengewicht: true, gTrennen: true };
  try {
    /*
     * >>> DIE GANZE REIHE, NICHT NUR DAS AKTIVE TRAGWERK. <<<
     *
     * `blattWennMehrere` baut alle sichtbaren Tragwerke in EIN Modell und
     * verschmilzt dabei die geteilten Masten - dieselbe Stelle, aus der
     * auch AxisVM sein Blattmodell bekommt. Steht nur ein Tragwerk da,
     * gibt sie null zurueck, und der bisherige Weg gilt unveraendert.
     *
     * DIE LASTEN KOMMEN DANN VOM BLATT und werden NICHT ueberschrieben:
     * es holt sie je Tragwerk (`lasten(m_t, bau_t)`) und entdoppelt, was
     * am geteilten Masten zweimal anfiele. `lasten(erg.modell, bau)` ueber
     * das ganze Blatt gerechnet waere das Modell des aktiven Tragwerks
     * gegen die Knoten aller - beim ersten Anlauf stand danach kein
     * einziger staendiger Lastfall mehr in der Datei.
     */
    const deps = { modellVon: (s) => modell({ ...s, beiwerteFest: null },
      getProfil(s.profOG), getProfil(s.profUG),
      getStahl(s.stahl), getTragjoch(s.typ)) };
    bau = blattWennMehrere(satz, deps, opt);
    if (!bau) {
      /*
       * >>> AUCH DER EINZELFALL NENNT SEINE MASTEN BEIM NAMEN. <<<
       *
       * Ohne `mastNamen` heissen sie nach dem ENDE des Jochs (MAST_A,
       * MAST_B) - im Blattmodell dagegen nach dem Masten (MAST_M1). Das
       * Urteil schriebe dann «Mast B», sobald ein Joch allein dasteht, und
       * «Mast M2», sobald ein zweites danebensteht. Derselbe Mast, zwei
       * Namen, je nach Nachbarschaft; die Anwendung nennt ihn ueberall M1
       * (Entscheid vom 19. September: Namen nach dem Typ T A M MT).
       */
      const t0T = tragwerkeVon(app.werte)[0];
      const [mA, mB] = t0T ? (mastenFuer(app.werte, t0T) ?? []) : [];
      bau = stabmodell(erg.modell, { ...opt,
        mastNamen: { A: mA?.id ?? 'A', B: mB?.id ?? 'B' } });
      /*
       * MIT EIGENGEWICHT UND GETRENNTEM G - wie die COM-Ausleitung. Der
       * Loeser steuert sein Eigengewicht zwar selbst bei; hier kommt es aus
       * der Lastliste, damit beide Wege dieselbe staendige Last sehen wie
       * AxisVM. Getrennt, weil die charakteristischen Einzelfaelle es
       * brauchen (Entscheid vom 20. September).
       */
      bau.lasten = lasten(erg.modell, bau, opt);
    }
    dat = stabmodellJson(erg.modell, { ...opt, bau, eingabe: satz, eingaben });
    lsg = loese(dat, { eigengewicht: false });
  } catch (e) {
    return { fehler: String(e?.message ?? e), kennung: eingabeKennung(app.werte) };
  }

  const stahl = getStahl(satz.stahl);
  const gammaM0 = Number(satz.gammaM0) > 0 ? Number(satz.gammaM0) : 1.05;
  const fyd = (stahl?.fy ?? 235) / gammaM0;

  /*
   * Die Kombinationen aller Saetze, gleiche Schluessel einmal - dieselbe
   * Regel wie in der Datei, damit `anteileFuer` zu jedem Fall seine Anteile
   * findet.
   */
  const faelle = eingaben.flatMap((s) => lastfaelle(s))
    .filter((l) => l.nachweis !== false)
    .filter((l, i, alle) => alle.findIndex((x) => x.key === l.key) === i);
  const huelle = stabwerkHuelle(dat, lsg, faelle, fyd);

  return {
    ...huelle,
    kennung: eingabeKennung(app.werte),
    fyd,
    knoten: dat.knoten.length,
    staebe: dat.staebe.length,
    freiheitsgrade: lsg.n,
    faelle: faelle.length,
    // Wie viele Tragwerke in diesem einen Stabwerk stehen (Etappe 3).
    tragwerke: eingaben.length,
    masten: huelle.reihe.filter((b) => b.art === 'mast').length,
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
   * nuetzt auch ein gueltiges Ergebnis nichts - es gaebe keines. Gefragt
   * ist seit Etappe 3 die ganze Reihe, nicht nur das aktive Tragwerk.
   */
  if (reiheOhneStabmodell(app.werte)) return 'ohneModell';
  const s = app.stabwerk;
  if (!s) return 'fehlt';
  if (s.ohneModell) return 'ohneModell';
  if (s.fehler) return 'fehler';
  return s.kennung === eingabeKennung(app.werte) ? 'gueltig' : 'veraltet';
}
