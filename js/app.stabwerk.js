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
import { mastenFuer, mastenVon, mastName, rechensatz, sichtbareTragwerke, tragwerkSatz,
         tragwerkeVon, tragwerksart } from './core.constants.js';
import { getMastprofil, getStegrichtung, istGittermast, getGittermast } from './data.masten.js';
import { mastZug } from './core.stabverformung.js';
import { lastfaelle } from './core.lasten.js';
import { eingabeKennung, stabwerkHuelle, aufhaengungNachweis,
         laengsankerKraft } from './core.stabnachweis.js';
import { verformungAusStabwerk } from './core.stabverformung.js';
import { gitterDiagramm, knickenAusStabwerk, fundamentAusStabwerk } from './core.stabmast.js';
import { anteileFuer } from './core.stabnachweis.js';
import { reaktionenAusStabwerk, reaktionsZeilen, skizzeAusModell } from './core.reaktionen.js';
import { seilAnker, seilHilfsfaelle, seilAusfall, ankerAusStabwerk } from './core.stabseil.js';
import { ankerAuswertung, ANKER_FALLARTEN } from './core.anker.js';
import { nachweiseAuswahl } from './core.checks.js';
import { loese } from './core.stabwerk.js';
import { modell } from './core.vierendeel.js';
import { getProfil, getStahl } from './data.profiles.js';
import { getTragjoch } from './data.tragjoche.js';
import { blattWennMehrere, lasten, stabmodell, stabmodellJson } from './export.axisvm.js';
import { getTragausleger } from './data.abfangjoche.js';

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
 *     Querschnittsspannung   Kern 0.7770   Stabwerk 0.7708   (0.8 %)
 *                            (Stabwerk seit der Linkberichtigung vom
 *                             26. September, vorher 0.7756)
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
/*
 * >>> SEIT DEM 28. SEPTEMBER AUCH DER TRAGAUSLEGER. <<<
 * Sein Stabmodell steht (export.axisvm.tragausleger.js), nachgewiesen
 * werden UPE, Bindebleche, Aufhängung, Mast und Fundament (Etappen 4a/4b).
 * In einer REIHE noch nicht: Aufhängung, Knicken und Fundament rechnet
 * `rechneStabwerk` bisher nur für den Ausleger, der allein dasteht.
 */
/*
 * >>> SEIT DEM 29. SEPTEMBER AUCH DAS ABFANGJOCH. <<<
 * Weisung: «abfangjoch im stabwerk anschliessen.» Sein Modell ist das der
 * AxisVM-Ausleitung (`abfangBau`): zwei U-Gurte, Bindebleche oben/unten,
 * die Gabel als Doppel-U, Masten mit Konsole und Link. Nachgewiesen werden
 * Gurte (mit Gabel), Bleche und Masten; Knicken und Fundament bleiben beim
 * Kern (wie am Einzelmasten).
 */
export const ARTEN_MIT_STABMODELL = ['joch', 'einzelmast', 'tragausleger', 'abfangjoch'];

/** Warum diese Art (noch) kein Stabwerk rechnet - oder null, wenn sie es tut. */
export function ohneStabmodell(art) {
  if (ARTEN_MIT_STABMODELL.includes(art)) return null;
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
/* ===========================================================================
 * >>> GERECHNET WIRD, WAS ZUSAMMENHAENGT (29. September). <<<
 * =========================================================================
 *
 * Befund bei der Prüfung des Tragauslegers: stand irgendein anderes
 * Tragwerk auf dem Blatt, galt der Ausleger als «in einer Reihe» und wurde
 * nicht gerechnet - auch frei stehend an seinem eigenen Masten, 20 m neben
 * dem Joch. Und das Joch daneben war damit ebenso gesperrt.
 *
 * Zusammen gehören nur Tragwerke, die einen MASTEN teilen - was keinen
 * Masten teilt, wirkt nicht aufeinander. Steht ein Ausleger auf dem Blatt,
 * rechnet das Stabwerk deshalb die zusammenhängende Gruppe des aktiven
 * Tragwerks: ein freier Ausleger allein, ein Joch ohne den freien Ausleger.
 * Teilt ein Ausleger einen Masten mit einem anderen Tragwerk, bleibt es
 * bei der Sperre. Ohne Ausleger ändert sich nichts (das ganze Blatt, wie
 * seit Etappe 3).
 */
export function verbundeneTragwerke(werte, id) {
  const nachbarn = new Map();
  (mastenVon(werte) ?? []).forEach((m) => {
    const ids = m.traegt ?? [];
    ids.forEach((a) => {
      if (!nachbarn.has(a)) nachbarn.set(a, new Set());
      ids.forEach((b) => { if (b !== a) nachbarn.get(a).add(b); });
    });
  });
  const gruppe = new Set([id]);
  const offen = [id];
  while (offen.length) {
    (nachbarn.get(offen.pop()) ?? new Set()).forEach((n) => {
      if (!gruppe.has(n)) { gruppe.add(n); offen.push(n); }
    });
  }
  return gruppe;
}

/** Die Eingabe, die das Stabwerk rechnet - siehe `verbundeneTragwerke`. */
export function rechenWerte(werte) {
  const alle = sichtbareTragwerke(werte) ?? [];
  const ta = (t) => (t.tragwerksart ?? 'joch') === 'tragausleger';
  if (alle.length < 2 || !alle.some(ta)) return werte;
  const gruppe = verbundeneTragwerke(werte, werte.twId ?? alle[0]?.id);
  if (alle.every((t) => gruppe.has(t.id))) return werte;
  return { ...werte, weitere: (werte.weitere ?? []).filter((t) => gruppe.has(t.id)) };
}

export function reiheOhneStabmodell(werteRoh) {
  const werte = rechenWerte(werteRoh);
  const alle = sichtbareTragwerke(werte) ?? [];
  /*
   * >>> DER AUSLEGER AM JOCHMASTEN IST ANGESCHLOSSEN (3. Oktober). <<<
   * Hier stand die Sperre «Ein Tragausleger in einer Reihe ist noch nicht
   * an das Stabwerk angeschlossen». Frage «warum wird der ausleger als
   * balken angegeben?», auf Rückfrage «Ja, jetzt anschliessen»: das
   * Blattmodell baut ihn mit (geteilter Mast verschmolzen), Aufhängung und
   * Längsanker rechnet `rechneStabwerk` je Ausleger, Knicken und Fundament
   * kommen wie an jedem Masten des Blattes aus dem Stabwerk.
   */
  for (const t of alle) {
    const grund = ohneStabmodell(t.tragwerksart ?? 'joch');
    if (grund) {
      return alle.length > 1 ? `${t.id}: ${grund}` : grund;
    }
    // Der Gittermast ist als Einzelmast und als Jochmast gebaut (Entscheid
    // 3. Oktober) - an Abfangjoch und Tragausleger noch nicht.
    const art = t.tragwerksart ?? 'joch';
    if (art === 'abfangjoch' || art === 'tragausleger') {
      const gm = (mastenFuer(werte, t) ?? []).find((m) => m && istGittermast(m.profil));
      if (gm) {
        return `${alle.length > 1 ? `${t.id}: ` : ''}Der Gittermast ist als Einzelmast und am `
          + 'Tragjoch gebaut, am Abfangjoch und am Tragausleger noch nicht.';
      }
    }
  }
  return null;
}

/*
 * >>> DIE MODELLDATEI DES BLATTES - EINE STELLE FÜR LÖSER UND AxisVM
 *     (3. Oktober). <<<
 *
 * Auftrag «checke die einheitlichkeit und kompletheit der funktionen der
 * einzelnen tragwerkstypen»: war ein Abfangjoch gewählt, leitete der
 * COM-Knopf nur dieses eine Joch aus (eigener Weg, `exportiereAbfangJson`) -
 * ohne das zweite Abfangjoch am selben Masten, ohne Anker, mit drei statt
 * zwanzig Kombinationen; das Stabwerk der Anwendung rechnete das ganze
 * Blatt. Jetzt baut diese Funktion die Datei für beide: `rechneStabwerk`
 * mit Eigengewicht in der Lastliste, die Ausleitung ohne (AxisVM setzt es
 * je Stab selbst an).
 */
export function stabwerkModell(werte, erg, satz, eingaben, opt) {
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
  let bau = blattWennMehrere(satz, deps, opt);
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
    const t0T = tragwerkeVon(werte)[0];
    const [mA, mB] = t0T ? (mastenFuer(werte, t0T) ?? []) : [];
    /*
     * Der Mast heisst im Modell wie in den Kacheln (`federn.namen`): am
     * Tragausleger «MT1», nicht nach seiner Kennung - sonst fände die
     * Kachel ihren Stab nicht (28. September). Am Joch sind beide gleich.
     */
    const nm = erg.modell?.federn?.namen ?? {};
    /*
     * DAS ABFANGJOCH BAUT SEINEN MASTEN NUR MIT ANGABE (29. September):
     * Profil, Anschlusshöhe, Stegrichtung - wie die COM-Ausleitung
     * (`mastFuerAbfang`). Ohne sie stünde es auf Punkten.
     */
    const abfangMast = tragwerksart(satz).key === 'abfangjoch'
      && satz.mastVorhanden !== false && (mA?.profil ?? satz.mastProfil)
      && Number(satz.mastH) > 0
      ? { profil: mA?.profil ?? satz.mastProfil, hoehe: Number(satz.mastH),
          stegrichtung: satz.mastSteg ?? 'jochachse' }
      : null;
    bau = stabmodell(erg.modell, { ...opt,
      mastNamen: { A: nm.A || mA?.id || 'A', B: nm.B || mB?.id || 'B' },
      // Ein Tragwerk mit eigenem Baustein (Abfangjoch, Tragausleger)
      // baut aus dem Satz, nicht aus dem Jochmodell (28. September).
      satz, mast: abfangMast });
    /*
     * MIT EIGENGEWICHT UND GETRENNTEM G - wie die COM-Ausleitung. Der
     * Loeser steuert sein Eigengewicht zwar selbst bei; hier kommt es aus
     * der Lastliste, damit beide Wege dieselbe staendige Last sehen wie
     * AxisVM. Getrennt, weil die charakteristischen Einzelfaelle es
     * brauchen (Entscheid vom 20. September).
     */
    bau.lasten = lasten(erg.modell, bau, opt);
  }
  const dat = stabmodellJson(erg.modell, { ...opt, bau, eingabe: satz, eingaben });
  return { dat, bau };
}

/**
 * Die Modelldatei des ganzen Blattes für AxisVM: dieselbe, die das Stabwerk
 * rechnet, ohne die Eigengewichtslasten und ohne die Hilfsfälle der Seile.
 * Alle sichtbaren Tragwerke (wie die Blatt-Ausleitung der übrigen Arten).
 */
export function stabwerkDatei(werte, erg, opt = {}) {
  const grund = reiheOhneStabmodell(werte);
  if (grund) throw new Error(grund);
  const satz = rechensatz(werte);
  const saetze = (sichtbareTragwerke(werte) ?? []).map((t) => tragwerkSatz(werte, t.id));
  const eingaben = [satz, ...saetze.filter((s) => s.twId !== satz.twId)];
  const { dat } = stabwerkModell(werte, erg, satz, eingaben,
    { knotenmodell: 'anschnitt', gTrennen: true, ...opt, eigengewicht: true });
  // AxisVM setzt das Eigengewicht je Stab selbst an (`AddBeamSelfWeight`).
  dat.lasten.strecke = dat.lasten.strecke.filter((l) => !/(^|_)EG_/.test(l.name ?? ''));
  return dat;
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
  // Nur die zusammenhängende Gruppe (29. September, siehe oben).
  const werte = rechenWerte(app.werte);

  const satz = rechensatz(werte);
  /*
   * >>> DIE SAETZE ALLER TRAGWERKE, DAS AKTIVE ZUERST. <<<
   *
   * Sie tragen die Lastfaelle: die ohne Leiterbruch sind in allen gleich
   * (Wind, Schnee und die Beiwerte gehoeren dem Blatt), die MIT Bruch
   * gehoeren je einem Tragwerk. Ohne sie fiele der Leiterriss des
   * Nachbarjochs aus dem Nachweis - gemessen am 25. September, siehe den
   * Befund in stabmodellJson().
   */
  const saetze = (sichtbareTragwerke(werte) ?? [])
    .map((t) => tragwerkSatz(werte, t.id));
  const eingaben = [satz, ...saetze.filter((s) => s.twId !== satz.twId)];

  const t0 = Date.now();
  let dat = null; let lsg = null; let bau = null; let seile = [];
  const opt = { knotenmodell: 'anschnitt', eigengewicht: true, gTrennen: true };
  try {
    ({ dat, bau } = stabwerkModell(werte, erg, satz, eingaben, opt));
    // Seilanker nur auf Zug (30. September): je Seil ein Hilfsfall, VOR dem
    // Lösen - siehe core.stabseil.js.
    seile = seilAnker(dat);
    seilHilfsfaelle(dat, seile);
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
  /*
   * DER AUSFALL DER SEILE, bevor irgendetwas ausgewertet wird: er schreibt
   * je Kombination den Hilfsfall in `dat.kombinationen`, und alles Folgende
   * (Hülle, Knicken, Fundament, Verformung) liest ihn über `anteileFuer`.
   */
  const alleFaelleS = eingaben.flatMap((s) => lastfaelle(s))
    .filter((l, i, alle) => alle.findIndex((x) => x.key === l.key) === i);
  const seilInfo = seilAusfall(dat, lsg, seile, alleFaelleS);
  // Die Wölbspannung des Masten wie im Kern - nur wenn «Torsion Mast»
  // geführt wird (28. September).
  const huelle = stabwerkHuelle(dat, lsg, faelle, fyd,
    { torsion: nachweiseAuswahl(satz.nachweise).torsionMast });
  /*
   * >>> DIE GEBRAUCHSTAUGLICHKEIT AUS DEM STABWERK (28. September). <<<
   * Auf Rückfrage «Ins Stabwerk»: dieselben Fälle, dieselbe Messstelle wie
   * der Kern (erg.verformung), die Wege aus dem Löser. Gebraucht werden
   * auch die Fälle OHNE Tragsicherheitsnachweis - Betriebswind und die
   * charakteristischen Windfälle -, deshalb nicht `faelle`.
   */
  const alleFaelle = eingaben.flatMap((s) => lastfaelle(s))
    .filter((l, i, alle) => alle.findIndex((x) => x.key === l.key) === i);
  const verformung = verformungAusStabwerk(erg.verformung ?? null, dat, lsg,
    alleFaelle, erg.modell?.federn?.namen ?? {});

  /*
   * >>> DER TRAGAUSLEGER: AUFHÄNGUNG, KNICKEN, FUNDAMENT (28. September). <<<
   * Entscheide: Aufhängung gegen V_zul «charakteristisch», nur wirkliche
   * Zustände; Knicken und Fundament «aus dem Stabwerk» - der Kern rechnet
   * den Ausleger noch mit einem erfundenen Auflager am freien Ende.
   */
  let ausleger = null;
  if (bau?.tragausleger) {
    const id = bau.mastNamen?.A ?? 'A';
    const basis = { profil: erg.mast?.A?.profil, stegrichtung: erg.mast?.A?.stegrichtung };
    const nwA = nachweiseAuswahl(satz.nachweise);
    const beta = Number(satz.knickBeiwert);
    ausleger = {
      name: `Mast ${erg.modell?.federn?.namen?.A || id}`,
      Vzul: bau.tragausleger.Vzul,
      aufhaengung: aufhaengungNachweis(dat, lsg, alleFaelle, bau.tragausleger.Vzul,
                                       'AUFHAENGUNG', seilInfo),
      // Der Längsanker (Regelfall seit 28. September) - Seilkraft als Auskunft.
      laengsanker: bau.tragausleger.laengsverankerung !== null
        ? laengsankerKraft(dat, lsg, alleFaelle, faelle) : null,
      laengsankerX: bau.tragausleger.laengsverankerung,
      knick: nwA.knickenMast && basis.profil
        ? knickenAusStabwerk(dat, lsg, faelle, id, basis, erg.modell,
                             { beta: beta > 0 ? beta : undefined }) : null,
      fundament: nwA.fundament && basis.profil
        ? fundamentAusStabwerk(dat, lsg, alleFaelle, id, basis, satz) : null,
    };
  }

  /*
   * >>> DAS KNICKEN DER JOCHMASTEN AUS DEM STABWERK (28. September). <<<
   * Offener Punkt «Knicken am Joch weiter aus dem Kern»; Weisung «kannst
   * du noch das knicken nachziehen», auf Rückfrage «Joch: Knicken aus dem
   * Stabwerk». Dieselbe Regel wie am Ausleger (`mastStabilitaet`, SIA 263),
   * nur die Kräfte kommen aus dem Stabwerk - am geteilten Masten einer
   * Reihe damit die gekoppelten statt der Sofortmassnahme. Gerechnet für
   * jeden Masten, der ein TRAGJOCH trägt; Einzelmast und Abfangjoch bleiben
   * beim Kern (nicht Teil der Weisung).
   */
  /*
   * >>> KNICKEN UND FUNDAMENT JEDES MASTEN AUS DEM STABWERK (30. Sept.). <<<
   * Weisung: «nachweis so wie vorgeschlagen umbauen» - der Vorschlag:
   * Knicken, Fundament und Anker bei Tragjoch, Einzelmast und Abfangjoch
   * aus dem Stabwerk, damit alle Kacheln aus EINER Quelle kommen. Bis dahin
   * rechnete das Stabwerk das Knicken nur an Masten eines Tragjochs und das
   * Fundament nur am Tragausleger; die übrigen kamen aus dem Kern. Die
   * Regeln bleiben dieselben (`mastStabilitaet`, `fundamentNachweis`), nur
   * die Kräfte kommen aus dem Stabwerk - am Fundament je Mast mit SEINEM
   * gewählten Typ (`m.fundament`, ein geteilter Mast hat eines).
   */
  let knick = null;
  const fundamentJe = {};
  const nwK = nachweiseAuswahl(satz.nachweise);
  if (!bau?.tragausleger) {
    if (nwK.knickenMast) knick = {};
    const beta = Number(satz.knickBeiwert);
    mastenVon(werte).forEach((m) => {
      const id = mastName(app.werte, m);
      // Der Gittermast: kein Knicken als Vollstab, kein Standardfundament.
      const zugM = mastZug(dat, id);
      if (!zugM || zugM.gitter) return;
      let basis;
      try {
        basis = { profil: getMastprofil(m.profil ?? satz.mastProfil),
                  stegrichtung: getStegrichtung(m.steg ?? satz.mastSteg ?? 'jochachse') };
      } catch { return; }
      if (knick) {
        const k = knickenAusStabwerk(dat, lsg, faelle, id, basis, erg.modell,
                                     { beta: beta > 0 ? beta : undefined });
        if (k && Number.isFinite(k.eta)) knick[id] = k;
      }
      if (nwK.fundament) {
        const f = fundamentAusStabwerk(dat, lsg, alleFaelle, id, basis,
                                       { ...satz, mastFundament: m.fundament ?? '' });
        if (f?.A) fundamentJe[id] = { ...f.A, quelle: 'stabwerk' };
      }
    });
  }

  /*
   * >>> DER AUSLEGER IM BLATT (3. Oktober). <<<
   * Steht der Tragausleger mit anderen Tragwerken in EINEM Stabwerk (am
   * Jochmasten), trägt das Blattmodell keinen eigenen `bau.tragausleger`.
   * Aufhängung und Längsanker finden ihre Stäbe über den Namen mit dem
   * Präfix des Tragwerks; V_zul kommt aus seinem Sortiment. Knicken und
   * Fundament stehen schon je Mast da (oben) - der Ausleger zeigt die
   * seines Masten. Gilt für den gewählten Ausleger; ein nicht gewählter
   * zählt im Urteil der Reihe über seinen Masten.
   */
  // Die Gittermasten: das Bemessungsdiagramm als Kontrolle (3. Oktober).
  const gitterJe = {};
  (dat.gittermasten ?? []).forEach((g) => {
    let zul = null;
    try { zul = getGittermast(g.typ).zulMoment ?? null; } catch { zul = null; }
    const d = gitterDiagramm(dat, lsg, alleFaelleS, g.id, zul);
    gitterJe[g.id] = { typ: g.typ, diagramm: d, gurtUnten: g.gurtUnten, gurtOben: g.gurtOben,
                       obenArt: g.obenArt };
  });

  if (!ausleger && (sichtbareTragwerke(werte) ?? []).length > 1
      && tragwerksart(satz).key === 'tragausleger') {
    const t = tragwerkeVon(werte).find((q) => q.id === satz.twId) ?? tragwerkeVon(werte)[0];
    const m = mastenFuer(werte, t)?.[0];
    const id = m ? mastName(app.werte, m) : null;
    let Vzul = 5;
    try { Vzul = getTragausleger(Number(satz.L))?.Vzul ?? 5; } catch { /* Vorgabe */ }
    const pre = `${satz.twId}_`;
    const lvX = satz.laengsverankerung !== false;
    ausleger = {
      name: `Mast ${id ?? ''}`.trim(),
      Vzul,
      aufhaengung: aufhaengungNachweis(dat, lsg, alleFaelle, Vzul, `${pre}AUFHAENGUNG`, seilInfo),
      laengsanker: lvX ? laengsankerKraft(dat, lsg, alleFaelle, faelle, `${pre}LV_M`) : null,
      laengsankerX: lvX ? Number(satz.laengsverankerungX) || null : null,
      knick: id ? knick?.[id] ?? null : null,
      fundament: id && fundamentJe[id] ? { A: fundamentJe[id] } : null,
      imBlatt: true,
    };
  }

  /*
   * >>> DER ANKER AUS DEM STABWERK (30. September). <<<
   * Je Ende des gerechneten Tragwerks, mit Typ und Länge aus dem Kern und
   * der Kraft von hier (core.stabseil.js).
   */
  const ankerJe = {};
  const namenA = erg.modell?.federn?.namen ?? {};
  const bemA = app.letzte?.bemessung?.anker ?? app.letzte?.erg?.anker ?? null;
  ['A', 'B'].forEach((ende) => {
    const id = namenA[ende];
    const meta = bemA?.[ende]?.kraft;
    if (!id || !meta || ankerJe[id]) return;
    const a = ankerAusStabwerk(dat, lsg,
      alleFaelleS.filter((l) => ANKER_FALLARTEN.includes(l.art)),
      id, meta, seilInfo, satz, ankerAuswertung);
    if (a) ankerJe[id] = a;
  });

  /*
   * >>> DIE REAKTIONSKRÄFTE ALLER AUFLAGER (30. September). <<<
   * Charakteristisch, Wind ohne ψ 0.70, Havarie eigene Zeile - für die
   * Tabelle im Reiter Auflager und das Blatt im Export (core.reaktionen.js).
   */
  const reaktionen = reaktionsZeilen(
    reaktionenAusStabwerk(dat, lsg, alleFaelleS, anteileFuer));
  /*
   * Und dieselben Auflager je Gurt (2. Oktober, «hier ein umschalten von
   * resultierende oder einzelgurte. startwert auf resultierende stellen»):
   * nur, wo es Jochenden ohne Masten gibt.
   */
  const reaktionenEinzeln = reaktionen.some((z) => z.art === 'jochende')
    ? reaktionsZeilen(reaktionenAusStabwerk(dat, lsg, alleFaelleS, anteileFuer,
                                            { zusammenfassen: false }))
    : null;

  const ergebnis = {
    ...huelle,
    verformung,
    reaktionen,
    reaktionenEinzeln,
    // Die Übersichtsskizze des Blattes der Reaktionskräfte (x–z).
    skizze: skizzeAusModell(dat),
    ausleger,
    knick,
    fundamentJe,
    gitterJe,
    ankerJe,
    seile: seile.length,
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
  /*
   * >>> DIE ROHDATEN FÜR DIE VERFORMTE FIGUR (30. September). <<<
   * Frage «ist es möglich ein verformtes modell darzustellen im 3d?»: die
   * Knotenwege stehen in der Lösung, gezeichnet werden sie aus Modell und
   * Lösung. Nicht aufzählbar - sie gehören zu keinem gespeicherten Stand und
   * zu keinem Vergleich, und JSON.stringify übergeht sie.
   */
  Object.defineProperty(ergebnis, 'roh', { value: { dat, lsg, faelle: alleFaelleS, seilInfo },
                                          enumerable: false });
  return ergebnis;
}

/*
 * >>> ANKER UND VERFORMUNG FÜR JEDEN MASTEN DES BLATTES (1. Oktober). <<<
 *
 * Für den Bericht über das ganze Blatt (Rückfrage «Ganzes Blatt»):
 * `rechneStabwerk` wertet Anker und Verformung an den Masten des AKTIVEN
 * Tragwerks aus (`ankerJe`, `verformung`); die übrigen bekommen sie hier,
 * aus derselben Lösung und nach denselben Regeln. Die Angaben je Mast
 * (Ankertyp und Länge bzw. Messstelle) kommen aus dem Kern des jeweiligen
 * Tragwerks (`rechneTragwerk` in app.js).
 */
export function ankerFuerMast(sw, id, meta, satz) {
  const r = sw?.roh;
  if (!r || !meta?.typ) return null;
  return ankerAusStabwerk(r.dat, r.lsg,
    r.faelle.filter((l) => ANKER_FALLARTEN.includes(l.art)),
    id, meta, r.seilInfo, satz, ankerAuswertung);
}

export function verformungFuer(sw, kern, namen) {
  const r = sw?.roh;
  return r && kern ? verformungAusStabwerk(kern, r.dat, r.lsg, r.faelle, namen ?? {}) : null;
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
  /*
   * EIN FEHLER GILT DEM STAND, AN DEM ER AUFTRAT (28. September). Seit das
   * Stabwerk von selbst rechnet, darf ein Fehler an einem alten Stand die
   * Auslösung nicht für immer blockieren: ändert sich die Eingabe, ist er
   * «veraltet», und es wird neu versucht. Ohne Kennung (alter Weg) bleibt
   * es beim Fehler.
   */
  if (s.fehler) {
    return s.kennung && s.kennung !== eingabeKennung(app.werte) ? 'veraltet' : 'fehler';
  }
  return s.kennung === eingabeKennung(app.werte) ? 'gueltig' : 'veraltet';
}
