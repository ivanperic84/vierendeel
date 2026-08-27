/**
 * core.vierendeel.js
 * ---------------------------------------------------------------------------
 * RECHENKERN: Modellaufbau und Nachweise über die Spannweite.
 * Reine Funktionen, kein DOM.
 *
 * Die Aufteilung der Schnittgrössen auf die vier Eckwinkel und die vier
 * Bindeblechebenen steckt in core.querschnitt.js - dort auch die Behandlung
 * des Torsions-Schubflusses.
 *
 * KEIN Knicknachweis - bewusst nicht enthalten, separat zu führen.
 * ---------------------------------------------------------------------------
 */

import { U, TOL, massketteLesen } from './core.constants.js';
import { bemessungslasten, auflagerkraefte, schnittgroessen,
         extremwerte, knotenraster, feldweite, feldmodell } from './core.statics.js';
import { mastWind } from './data.masten.js';
import { charakteristischeLasten, lastfallUebersicht, lastfallFuer,
         ekVonWindklasse } from './core.lasten.js';
import { expandiereAnbauteile, amMast, ortVon } from './data.anbauteile.js';
import { getAusrichtung } from './geometry.js';
import { biegesteifigkeitJoch, drehfedern, auflagermomente, begrenzeFeder,
         mastKoepfe } from './core.auflager.js';
import { schnittAuswertung, eigenanteil,
         ENDFELD_STATIONEN } from './core.querschnitt.js';
import { blechAnStation, hatBleche, teilung, voute, bauhoeheAn, breiteAn,
         hatGrundrissknick, bauweise, ausfuehrungFuer,
         abstaendeFuer } from './data.tragjoche.js';

export const MASSVARIANTEN = [
  {
    key: 'schwerpunkt', label: 'Schwerpunktsabstände (empfohlen)', kurz: 'Schwerpunkt',
    beschreibung: 'Hebelarme zwischen den Profilschwerpunkten. Statisch korrekt, ' +
                  'da die Gurtkräfte in den Schwerpunkten angreifen.',
  },
  {
    key: 'aussen', label: 'Aussenmasse jd / jbb (Zeichnungsmasse)', kurz: 'Aussenmass',
    beschreibung: 'Hebelarme = Aussenkanten. Grösster Hebelarm, kleinste ' +
                  'Gurtkräfte – liegt auf der UNSICHEREN Seite.',
  },
  {
    key: 'licht', label: 'Lichte Masse', kurz: 'Lichtmass',
    beschreibung: 'Hebelarme = lichte Innenkanten. Kleinster Hebelarm, grösste ' +
                  'Gurtkräfte – liegt auf der sicheren Seite.',
  },
];

export const BLECHQUELLEN = [
  { key: 'datenbank', label: 'aus Typendatenbank (Staffelung nach Zeichnung)' },
  { key: 'manuell', label: 'manuell (ein Blech für alle Stationen)' },
];

/**
 * Rechnet die physischen Querschnittsmasse in die drei Hebelarm-Varianten um.
 *
 * DIE EINBAULAGE ENTSCHEIDET MIT.
 * Der Schwerpunktsabstand quer hängt davon ab, wohin der STEHENDE Schenkel
 * zeigt (siehe AUSRICHTUNGEN in geometry.js, Kennzeichen `st`):
 *
 *   stehend INNEN  (st = -1)   b = (jbb - 2·ja) + 2·zs_V
 *                              Das Aussenmass jbb liegt an der Ferse, der
 *                              Schenkel ragt nach innen, der Schwerpunkt
 *                              liegt zs_V innerhalb der lichten Kante.
 *   stehend AUSSEN (st = +1)   b = jbb - 2·zs_V
 *                              Der Schenkelrücken bildet die Aussenkante, der
 *                              Schwerpunkt liegt zs_V weiter innen.
 *
 * Der Unterschied ist gross: beim Signaljoch (jbb 512 mm, L 100x100x10) sind
 * es 363 gegen 456 mm - ein Fünftel Hebelarm und damit ein Fünftel Gurtkraft.
 * Bis hierher war nur die erste Lage gerechnet worden, obwohl die Ausrichtung
 * in der Eingabe längst wählbar ist.
 *
 * @param {object} ausr {og:{st,lg}, ug:{st,lg}} - Einbaulagen; fehlt sie,
 *        gilt die Regelbauart (stehend innen).
 */
export function hebelarme(phys, pOG, pUG, ausr = null) {
  const lichtOG = phys.jbbOG - 2 * pOG.aH;
  const lichtUG = phys.jbbUG - 2 * pUG.aH;
  const zsH_o = pOG.zsH * U.cm__mm, zsH_u = pUG.zsH * U.cm__mm;
  const zsV_o = pOG.zsV * U.cm__mm, zsV_u = pUG.zsV * U.cm__mm;
  const mm = (v) => v / U.m__mm;
  // st = +1 heisst «stehender Schenkel nach aussen».
  const stOG = ausr?.og?.st ?? -1;
  const stUG = ausr?.ug?.st ?? -1;
  const bOG = stOG > 0 ? phys.jbbOG - 2 * zsV_o : lichtOG + 2 * zsV_o;
  const bUG = stUG > 0 ? phys.jbbUG - 2 * zsV_u : lichtUG + 2 * zsV_u;
  return {
    lichtOG, lichtUG, bOG: mm(bOG), bUG: mm(bUG),
    stehendAussen: { og: stOG > 0, ug: stUG > 0 },
    varianten: {
      schwerpunkt: {
        hT: mm(phys.jd - zsH_o - zsH_u),
        bT: mm((bOG + bUG) / 2),
      },
      aussen: { hT: mm(phys.jd), bT: mm((phys.jbbOG + phys.jbbUG) / 2) },
      licht: { hT: mm(phys.jd - pOG.t - pUG.t), bT: mm((lichtOG + lichtUG) / 2) },
    },
  };
}

/**
 * Hebelarm über die Spannweite bei verjüngten Enden.
 *
 * Alle drei Massvarianten ziehen vom Aussenmass jd nur eine KONSTANTE ab
 * (Schwerpunktsabstände, Schenkeldicken oder null). Die Verjüngung wirkt sich
 * deshalb in allen Varianten gleich aus: h(x) = h_Feld − (jd − jd(x))/1000.
 *
 * Am Auflager laufen die Gurte zusammen; der Hebelarm wird dort sehr klein und
 * die Gurtkräfte N = M/h entsprechend gross. Physikalisch wirkt das Jochende
 * dort nicht mehr als Vierendeelträger, sondern als voller Querschnitt. Der
 * Hebelarm wird deshalb nach unten begrenzt (hMin), damit ein Restmoment am
 * eingespannten Ende nicht zu einer sinnlosen Spannungsspitze führt. Die
 * Begrenzung wird im Ergebnis ausgewiesen.
 */
function hebelarmVerlauf(joch, L, hFeld, jdFeld) {
  const v = voute(joch);
  if (!v || !(jdFeld > 0)) {
    return { aktiv: false, hAn: () => hFeld, jdAn: () => jdFeld, hMin: hFeld, voute: null };
  }
  const hMin = Math.max(0.02, hFeld - (jdFeld - v.endJd) / 1000);
  const jdAn = (x) => bauhoeheAn(joch, L, x);
  const hAn = (x) => Math.max(hMin, hFeld - (jdFeld - jdAn(x)) / 1000);
  return { aktiv: true, hAn, jdAn, hMin, voute: v };
}

/**
 * Breite über die Spannweite (Knick im Grundriss).
 *
 * Wie beim Hebelarm h ziehen alle drei Massvarianten von der Aussenbreite nur
 * eine Konstante ab; der Knick wirkt sich deshalb in allen Varianten gleich
 * aus. Der Hebelarm b ist der Mittelwert aus Ober- und Untergurt, also zählt
 * die mittlere Breitenänderung beider Gurte.
 *
 * b(x) geht in den Torsionsschubfluss q = T/(2·b·h), in die Windbiegung
 * N = M_z/b und in den Hebelarm der Horizontalbleche ein.
 */
function breitenVerlauf(joch, L, bFeld, jbbOG, jbbUG) {
  if (!hatGrundrissknick(joch)) {
    return { aktiv: false, bAn: () => bFeld, jbbAn: () => ({ og: jbbOG, ug: jbbUG }) };
  }
  const jbbAn = (x) => ({ og: breiteAn(joch, 'og', L, x), ug: breiteAn(joch, 'ug', L, x) });
  const bAn = (x) => {
    const w = jbbAn(x);
    return Math.max(0.02, bFeld + ((w.og - jbbOG) + (w.ug - jbbUG)) / 2 / 1000);
  };
  return { aktiv: true, bAn, jbbAn, jk: joch.jk, jkk: joch.jkk };
}

/** Baut aus den rohen Eingabewerten das vollständige Rechenmodell. */
export function modell(inp, profOG, profUG, stahl, joch, massVariante) {
  const variante = massVariante ?? inp.massVariante;

  const phys = { jd: inp.jd, jbbOG: inp.jbbOG, jbbUG: inp.jbbUG };
  const ausr = { og: getAusrichtung(inp.ausrOG ?? 'LA_SI'),
                 ug: getAusrichtung(inp.ausrUG ?? 'LA_SI') };
  const ha = hebelarme(phys, profOG, profUG, ausr);
  const v = ha.varianten[variante];
  if (!v) throw new Error(`Unbekannte Massvariante: ${variante}`);

  // Verjüngte Enden und Grundrissknick: Hebelarme hängen von x ab
  const verlauf = hebelarmVerlauf(joch, inp.L, v.hT, phys.jd);
  const breite = breitenVerlauf(joch, inp.L, v.bT, phys.jbbOG, phys.jbbUG);

  // HEBELARM DES EINSEITIGEN KRÄFTEPAARS, je Gurt.
  // Ein nur an EINEM Gurt befestigtes Anbauteil leitet sein Torsionsmoment als
  // Kräftepaar in z zwischen den beiden nebeneinanderstehenden Winkeln DIESES
  // Gurtes ein (core.anbauteile.js). Der Hebelarm dafür ist der Abstand ihrer
  // GURTKRÄFTE - dasselbe Mass, das die Massvariante überall sonst wählt, und
  // nicht das Aussenmass jbb der Zeichnung. Beim Grundrissknick folgt er der
  // örtlichen Breite, genau wie b(x).
  const bFeldGurt = {
    schwerpunkt: { OG: ha.bOG, UG: ha.bUG },
    aussen: { OG: phys.jbbOG / U.m__mm, UG: phys.jbbUG / U.m__mm },
    licht: { OG: ha.lichtOG / U.m__mm, UG: ha.lichtUG / U.m__mm },
  }[variante];
  const bAnGurt = (x, gurt) => {
    const ort = breite.jbbAn(x);
    const roh = gurt === 'OG' ? phys.jbbOG : phys.jbbUG;
    const jetzt = gurt === 'OG' ? ort.og : ort.ug;
    return Math.max(0.02, bFeldGurt[gurt] + (jetzt - roh) / U.m__mm);
  };

  const char = charakteristischeLasten(inp, joch);
  // Baugruppen ZUERST in Einzellasten auflösen: je Modul und je freiem
  // Lastblock ein Eintrag mit eigenem Angriffspunkt. Erst danach kennt der
  // Rechenkern nur noch Einzellasten - und erst danach ist bekannt, ob
  // überhaupt veränderliche Vertikallasten vorkommen.
  /*
   * WAS AM MASTEN HÄNGT, GEHÖRT NICHT IN DEN ERSATZBALKEN.
   *
   * Der Rechenkern führt EINEN Balken - das Joch. Eine Traverse auf halber
   * Masthöhe belastet den Masten, nicht das Joch; was davon im Joch ankommt,
   * läuft über die Verdrehung des Mastkopfes und ist im Ersatzbalken nicht
   * darstellbar. Sie hier trotzdem als Jochlast anzusetzen, wäre still
   * falsch: die Last sässe auf dem falschen Bauteil, mit dem falschen
   * Hebelarm.
   *
   * Die Teile am Masten werden deshalb HERAUSGENOMMEN und getrennt geführt.
   * Wirksam sind sie im Stabmodell mit Auflagermodell «Mast» - dort steht
   * der Mast, an den sie gehören. Der Hinweis in core.checks.js sagt es.
   */
  const amJoch = (inp.anbauteile ?? []).filter((a) => !amMast(a));
  const amMasten = (inp.anbauteile ?? []).filter((a) => amMast(a));
  const anbauteile = expandiereAnbauteile(amJoch, {
    ek: ekVonWindklasse(inp.windKlasse),
    R: inp.trasseRadius, spannweite: inp.flSpannweite,
  });
  // Der gewählte Lastfall liefert die Beiwerte je Einwirkungsgruppe.
  // beiwerteFest übergeht ihn - gebraucht für das Auflagerblatt, das die
  // Gruppen einzeln und ohne Beiwerte ausweist.
  const lfAktiv = inp.beiwerteFest
    ? null : lastfallFuer({ ...inp, anbauteileFlach: anbauteile }, inp.lastfall);
  const beiwerte = inp.beiwerteFest ?? { ...lfAktiv.beiwerte };
  // Charakteristische Einzellastfälle blenden das Joch oder die Anbauteile aus.
  const nurLast = inp.nurLast ?? lfAktiv?.nur ?? null;
  const lasten = bemessungslasten({ ...inp, ...char, beiwerte, nurLast },
                                  anbauteile, verlauf.hAn, bAnGurt);

  const steif = biegesteifigkeitJoch(v.hT, profOG, profUG);
  // VERSCHIEBLICH ODER NICHT (core.auflager.js, MAST_UNVERSCHIEBLICH).
  // Das Joch bindet die beiden Mastköpfe zusammen. Unter Vertikallast und
  // Wind in Gleisrichtung sind die Stützmomente gleichsinnig, die Querkräfte
  // der Maste heben sich auf, der Rahmen verschiebt sich nicht. Erst der Wind
  // IN JOCHACHSE drückt beide Köpfe in dieselbe Richtung - dann verschiebt er
  // sich, und der Kragmast ist die richtige Vorstellung.
  // Auch eine Anbaulast in Jochachse schiebt beide Mastköpfe in dieselbe
  // Richtung - nicht nur der Wind auf den Mast.
  const nxGesamt = (lasten.N ?? []).reduce((s, n) => s + n.w, 0);
  const verschieblich = Math.abs(beiwerte.WindX ?? 0) > 0
                     || Math.abs(nxGesamt) > 1e-9;
  const federnRoh = drehfedern(inp, verschieblich);

  // GRENZLAST DER GURTVERBINDUNG
  // Das Stützmoment tritt als Kräftepaar zwischen Ober- und Untergurt-
  // anschluss in den Mast. Mehr als ihre Grenzlast können die Schrauben nicht
  // übertragen; die Feder wird deshalb so weit herabgesetzt, bis sie
  // eingehalten ist (core.auflager.js, begrenzeFeder). Abschaltbar - und ohne
  // Feder ohnehin gegenstandslos.
  // 'voll eingespannt' bleibt ausgenommen: das ist eine bewusst gewählte
  // Idealisierung zum Vergleich, keine ausgeführte Verbindung.
  // WIND AUF DEN MAST -> AUFGEZWUNGENE AUFLAGERVERDREHUNG
  // Der Wind in der Jochachse biegt den Mast; sein Kopf verdreht sich, und das
  // Jochende macht die Verdrehung mit (core.auflager.js, mastKopfdrehung).
  // Nur der Lastfall Wind in Jochachse trägt sie, deshalb der Beiwert WindX.
  // Ohne Mast als Auflager gibt es nichts zu verdrehen.
  // Zwei Ursachen, ein gemeinsamer Kopfweg (core.auflager.js, mastKoepfe):
  //   der Wind auf den Mast     - nur im Lastfall Wind in Jochachse, deshalb
  //                               mit dem Beiwert bwX, und abschaltbar
  //   die Längskraft des Jochs  - sie trägt die Beiwerte schon in sich und
  //                               wirkt immer, wenn Maste da sind
  const mastwindAn = federnRoh.mast && inp.mastWindAufJoch !== false;
  const bwX = beiwerte.WindX ?? 0;
  const kopf = federnRoh.mast
    ? mastKoepfe(federnRoh.mastA ?? federnRoh.mast,
                 federnRoh.mastB ?? federnRoh.mast,
                 { wMast: mastwindAn ? bwX * (inp.wMast ?? 0) : 0,
                   wMastB: mastwindAn
                     ? bwX * (inp.wMastB ?? inp.wMast ?? 0) : 0,
                   Fx: nxGesamt })
    : { delta: 0, A: { theta0: 0, M0: 0 }, B: { theta0: 0, M0: 0 } };
  const theta0A = kopf.A.theta0;
  const theta0B = kopf.B.theta0;

  /*
   * WIND AUF DEN MAST - KEINE OPTION (Weisung, 27. August).
   *
   * Steht der Mast im Stabmodell, ist er ein Teil des Tragwerks und wird
   * belastet wie das Joch. Nicht «wirkt er auf das Joch?» - er trägt seine
   * Last selbst, und was davon im Joch ankommt, rechnet das Modell aus.
   *
   * BEIDE RICHTUNGEN, und beide stehen in derselben Tabellenzeile. `wMast`
   * ist der Wert QUER ZUM GLEIS, also in der Jochachse - dieselbe Zahl, die
   * der Ersatzbalken für seine aufgezwungene Verdrehung benutzt. Die
   * Gleisrichtung ist die andere Spalte; abgefragt wird sie, indem die
   * Stegrichtung umgedreht wird (siehe mastWind: sie tauscht genau diese
   * beiden Spalten). Beim HEM 240 macht das einen Unterschied, bei den
   * übrigen Profilen nicht.
   *
   * Nur für das Stabmodell. Der Ersatzbalken kennt keinen Mast, auf den
   * etwas drücken könnte - dort bleibt es bei der aufgezwungenen Verdrehung,
   * und die ist seit dem 27. August im Startwert AUS.
   */
  const mastLast = federnRoh.mast ? (() => {
    const ek = ekVonWindklasse(inp.windKlasse);
    // BEIDE WERTE AUS DERSELBEN QUELLE. Die Jochachse aus der Tabelle zu
    // holen statt aus `inp.wMast` ist kein Umweg, sondern der Unterschied
    // zwischen «stimmt, wenn der Aufrufer es vorher nachgeführt hat» und
    // «stimmt». Von Hand gesetzt wird nur übernommen, was ausdrücklich von
    // Hand gesetzt ist (wMastAusTabelle === false).
    const vonHand = inp.wMastAusTabelle === false;
    const je = (mast, wManuell) => {
      const eigen = mast.stegrichtung.key;
      const gegen = eigen === 'quer' ? 'jochachse' : 'quer';
      const wJoch = mastWind(mast.profil.name, ek, eigen);
      const wGleis = mastWind(mast.profil.name, ek, gegen);
      const x = vonHand ? (wManuell ?? 0)
              : (Number.isFinite(wJoch) ? wJoch : (wManuell ?? 0));
      return {
        profil: mast.profil.name, H: mast.H, ausTabelle: !vonHand,
        x: Math.abs(x),
        y: Number.isFinite(wGleis) ? Math.abs(wGleis) : null,
      };
    };
    return { ek,
             A: je(federnRoh.mastA ?? federnRoh.mast, inp.wMast),
             B: je(federnRoh.mastB ?? federnRoh.mast, inp.wMastB ?? inp.wMast) };
  })() : null;


  // KRAGARME: die Auflager müssen nicht an den Gurtenden stehen.
  // L ist die Länge der Gurte (Mass der Zeichnung, daran hängt die
  // Blecheinteilung); die Stützweite ist L − kragA − kragB.
  const kragA = Math.max(0, inp.kragA ?? 0);
  const kragB = Math.max(0, inp.kragB ?? 0);
  if (kragA + kragB >= inp.L) {
    throw new Error('Die Kragarme sind zusammen so lang wie das Joch - '
                  + 'es bliebe keine Stützweite übrig.');
  }
  const fm = feldmodell({ L: inp.L, xA: kragA, xB: inp.L - kragB,
                          qd: lasten.qd, wd: lasten.wd, P: lasten.P, H: lasten.H,
                          T: lasten.T, M: lasten.M, Mz: lasten.Mz, N: lasten.N,
                          torsionModell: inp.torsionModell });
  // Alles, was das Auflagerproblem betrifft, rechnet auf der STÜTZWEITE.
  const sp = fm
    ? { L: fm.Ls, P: fm.feld.P, M: fm.feld.M, MkA: fm.MkA, MkB: fm.MkB,
        RkragA: fm.RkragA, RkragB: fm.RkragB }
    : { L: inp.L, P: lasten.P, M: lasten.M, MkA: 0, MkB: 0,
        RkragA: 0, RkragB: 0 };

  const grenzeAktiv = inp.schraubenGrenze !== false
    && inp.endbedingung !== 'voll'
    && federnRoh.cA + federnRoh.cB > 0 && inp.schraubenFgrenz > 0;
  const grenze = grenzeAktiv
    ? begrenzeFeder({ L: sp.L, qd: lasten.qd, P: sp.P, M: sp.M,
                      EI: steif.EI, cA: federnRoh.cA, cB: federnRoh.cB,
                      h: v.hT, Fgrenz: inp.schraubenFgrenz, theta0A, theta0B,
                      MkA: sp.MkA, MkB: sp.MkB })
    : null;
  const federn = { ...federnRoh, roh: federnRoh, grenze,
                   ...(grenze ? { cA: grenze.cA, cB: grenze.cB } : {}) };

  /*
   * DER GURTANSCHLUSS ALS EIGENER NACHWEIS.
   *
   * Weisung des Auftraggebers: die GEOMETRISCHE Feder geht ins Modell, die
   * Schraubengrenze wird SEPARAT nachgewiesen.
   *
   * Bisher lebte die Grenze nur INNERHALB der Feder: begrenzeFeder setzte
   * c so weit herab, bis die Gurtkraft passte, und damit war sie per
   * Konstruktion eingehalten - man sah nie, wieviel die Verbindung mit der
   * wirklichen Steifigkeit des Mastes zu tragen hätte. Genau das ist die
   * Frage, die das ausgeleitete Stabmodell stellt: es trägt die geometrische
   * Feder, also auch deren Stützmoment.
   *
   * Gerechnet wird deshalb ein ZWEITES Mal, mit der ungebremsten Feder. Das
   * Ergebnis geht nicht in die Schnittgrössen des Jochs ein - es ist der
   * Nachweis der Verbindung, und nur dieser.
   *
   * 'voll eingespannt' bleibt aussen vor: das ist eine Idealisierung zum
   * Vergleich, keine ausgeführte Verbindung - dieselbe Ausnahme, die schon
   * für die Begrenzung gilt.
   */
  const gurtanschluss = (() => {
    const c = federnRoh.cA + federnRoh.cB;
    if (!(c > 0) || inp.endbedingung === 'voll' || !(v.hT > 0)) return null;
    const geo = auflagermomente({
      L: sp.L, qd: lasten.qd, P: sp.P, M: sp.M, EI: steif.EI,
      cA: federnRoh.cA, cB: federnRoh.cB, theta0A, theta0B,
      MkA: sp.MkA, MkB: sp.MkB,
    });
    // JE GURT, NICHT JE GURTEBENE (Weisung, 27. August). Jede Ebene hängt an
    // ZWEI Gurten; die Grenzlast ist die eines Anschlusses. Dieselbe
    // Definition wie in begrenzeFeder - sonst wiesen die beiden Wege
    // verschiedene Kräfte für dieselbe Verbindung aus.
    const kraft = (Mst) => Math.abs(Mst) / (2 * v.hT);
    const Fgrenz = inp.schraubenFgrenz ?? 0;
    const FA = kraft(geo.MA), FB = kraft(geo.MB);
    return {
      cA: federnRoh.cA, cB: federnRoh.cB,
      MA: geo.MA, MB: geo.MB, h: v.hT,
      FA, FB, F: Math.max(FA, FB), Fgrenz,
      // Ohne Grenzwert gibt es nichts nachzuweisen - dann steht nur die Kraft.
      ok: Fgrenz > 0 ? Math.max(FA, FB) <= Fgrenz * (1 + 1e-9) : null,
      eta: Fgrenz > 0 ? Math.max(FA, FB) / Fgrenz : null,
    };
  })();

  const auf = auflagermomente({
    L: sp.L, qd: lasten.qd, P: sp.P, M: sp.M,
    EI: steif.EI, cA: federn.cA, cB: federn.cB, theta0A, theta0B,
    MkA: sp.MkA, MkB: sp.MkB,
  });
  const reakt = auflagerkraefte({
    L: sp.L, qd: lasten.qd, P: sp.P, M: sp.M,
    MA: auf.MA, MB: auf.MB, RkragA: sp.RkragA, RkragB: sp.RkragB,
  });
  // Das Feld-Untermodell braucht die eben gerechneten Auflagerwerte, sonst
  // kennt schnittgroessen() sie innerhalb der Stützweite nicht.
  if (fm) Object.assign(fm.feld, { RA0: reakt.RA0, MA: auf.MA, MB: auf.MB });

  // Bindebleche: aus der Typendatenbank oder manuell
  const dbBleche = Boolean(joch) && hatBleche(joch) && inp.blechQuelle !== 'manuell';

  // Blecheinteilung: die Mass-Tabelle der Zeichnung hat Vorrang. Sie ist die
  // Geometrie des Bauteils und wird nicht angepasst.
  const abst = abstaendeFuer(joch, inp.L);

  const basis = {
    L: inp.L, h: v.hT, b: v.bT, a1: inp.a1,
    abstaende: abst,
    teilungQuelle: abst ? 'masstabelle' : 'gleichmaessig',
    a1eff: feldweite(inp.L, inp.a1, abst), massVariante: variante,
    jd: phys.jd, jbbOG: phys.jbbOG, jbbUG: phys.jbbUG,
    lichtOG: ha.lichtOG, lichtUG: ha.lichtUG, hebelarme: ha,
    h1: inp.h1, t1: inp.t1, h2: inp.h2, t2: inp.t2,
    endblechWieZwischen: inp.endblechWieZwischen,
    dbBleche, blechQuelle: dbBleche ? 'datenbank' : 'manuell',
    bauweise: bauweise(joch), verlauf, breite,
    // Für die Zeichenmodule: Bauhöhe [mm] und Anhebung des Untergurts [mm] an
    // der Stelle x [m]. Der Obergurt bleibt gerade, der Untergurt steigt an.
    jdAn: verlauf.jdAn,
    ugVersatz: (x) => phys.jd - verlauf.jdAn(x),
    jbbAn: breite.jbbAn,
    ausfuehrung: ausfuehrungFuer(joch, inp.L),
    torsionModell: inp.torsionModell,
    torsionsverteilung: inp.torsionsverteilung,
    ebenenUeberlagerung: inp.ebenenUeberlagerung ?? 'huellkurve',
    gurtaufteilung: inp.gurtaufteilung ?? 'gemessen',
    spannungsmodell: inp.spannungsmodell ?? 'schenkel',
    knotenbereich: inp.knotenbereich ?? 'anschnitt',
    endfeldZuschlag: inp.endfeldZuschlag,
    schiefeBiegung: inp.schiefeBiegung !== false,

    anbauteile: inp.anbauteile, anbauteileFlach: anbauteile,
    profOG, profUG, stahl, joch,
    fyd: stahl.fy / inp.gammaM0, gammaM0: inp.gammaM0,
    eps: Math.sqrt(235 / stahl.fy),
    char, ...lasten, ...reakt,
    steif, federn, gurtanschluss, ...auf, endbedingung: inp.endbedingung,
    feldmodell: fm, kragA, kragB, stuetzweite: sp.L,
    // Hebelarm des einseitigen Kräftepaars, je Gurt [m] - er folgt der
    // Massvariante und steht deshalb neben h und b im Modell.
    bGurt: bFeldGurt, bAnGurt,
    mastKopf: federnRoh.mast
      && (Math.abs(kopf.A.theta0) > 0 || Math.abs(kopf.B.theta0) > 0)
      ? { ...kopf, theta0A, theta0B, beiwert: bwX, wMast: inp.wMast,
          mastwindAn } : null,
    // Wo das Tragwerk steht. Geht in keine Rechnung ein, aber in jede
    // Ausleitung: ein Projekt hat viele Joche, und ohne Verortung heissen
    // sie alle gleich.
    linie: inp.linie ?? '', km: inp.km ?? '', ortschaft: inp.ortschaft ?? '',
    // Die Masskette der Zeichnung, gelesen: die Ansicht zeichnet daraus
    // Fanglinien, die Eingabe faengt darauf.
    masskette: massketteLesen(inp.masskette, inp.L).werte,
    mastLast,
    // Die Baugruppen am Masten - ausgerechnet wie die am Joch, nur eben
    // nicht in den Ersatzbalken eingerechnet. Das Stabmodell mit Mast baut
    // sie auf, mit denselben Lasten und derselben Kette.
    anbauMast: amMasten.map((a) => ({ ...a, ort: ortVon(a) })),
    anbauMastFlach: expandiereAnbauteile(amMasten, {
      ek: ekVonWindklasse(inp.windKlasse),
      R: inp.trasseRadius, spannweite: inp.flSpannweite,
    }),
    ausrOG: inp.ausrOG, ausrUG: inp.ausrUG, typ: inp.typ,
    xNachweis: inp.xNachweis,
    schneeAktiv: inp.schneeAktiv === true,
    schnittAktiv: inp.schnittAktiv === true,
    schnittOrientierung: inp.schnittOrientierung ?? 'quer',
    lastfall: inp.lastfall ?? null,
  };

  // Stationsliste mit den tatsächlichen Blechen - die Zeichenmodule lesen sie,
  // ohne den Rechenkern kennen zu müssen.
  const xs = knotenraster(basis.L, basis.a1, abst);
  basis.stationsListe = xs.map((x, i) => ({
    x, i, jd: verlauf.jdAn(x), h: verlauf.hAn(x),
    b: breite.bAn(x), jbb: breite.jbbAn(x),
    ...blecheAnStation(basis, i, xs.length),
  }));
  return basis;
}

/**
 * Bindebleche an der Station i von n.
 * Aus der Typendatenbank, sonst aus den manuellen Eingaben.
 */
export function blecheAnStation(m, i, n) {
  if (m.dbBleche) {
    return {
      vertikal: blechAnStation(m.joch, 'vertikal', i, n, m.L),
      horizontal: blechAnStation(m.joch, 'horizontal', i, n, m.L),
    };
  }
  const amEnde = i === 0 || i === n - 1;
  const end = amEnde && !m.endblechWieZwischen;
  const b = {
    pos: end ? 'Endblech' : 'Zwischenblech',
    breite: end ? m.h1 : m.h2,
    dicke: end ? m.t1 : m.t2,
    laenge: null,
  };
  return { vertikal: b, horizontal: { ...b } };
}

/** Nachweis an EINEM Knoten. */
export function knoten(x, m, i, n) {
  const sg = schnittgroessen(x, m);
  const bleche = blecheAnStation(m, i, n);
  // Ein Randblech hat nur EIN angrenzendes Feld und nimmt daher nur das halbe
  // Knotenmoment auf.
  const nachbarfelder = i === 0 || i === n - 1 ? 1 : 2;
  // Verjüngte Enden und Grundrissknick: Hebelarme sind Funktionen von x. Die
  // Auswertung bekommt deshalb ein Modell mit den ÖRTLICHEN Massen.
  const hLokal = m.verlauf ? m.verlauf.hAn(x) : m.h;
  const jdLokal = m.verlauf ? m.verlauf.jdAn(x) : m.jd;
  const bLokal = m.breite ? m.breite.bAn(x) : m.b;
  const wLokal = m.breite ? m.breite.jbbAn(x) : { og: m.jbbOG, ug: m.jbbUG };
  const mx = hLokal === m.h && bLokal === m.b
    ? m : { ...m, h: hLokal, jd: jdLokal, b: bLokal,
            jbbOG: wLokal.og, jbbUG: wLokal.ug };
  // Endfeld: die beiden äussersten Stationen je Ende (core.querschnitt.js).
  const imEndfeld = i < ENDFELD_STATIONEN || i >= n - ENDFELD_STATIONEN;
  const a = schnittAuswertung(sg, mx, bleche, nachbarfelder, x, imEndfeld);

  const gurt = (g) => a.ecken.filter((e) => e.gurt === g)
    .reduce((p, c) => (c.eta > p.eta ? c : p));
  const og = gurt('OG'), ug = gurt('UG');

  // Massgebendes Vertikalblech, damit Knotentabelle und Excel-Export ohne
  // Sonderfall auf ein Blech zugreifen können.
  const bv = a.ebenen.find((e) => e.id === 'V_R') ?? {};

  return {
    i, x, ...sg, ...a,
    h: hLokal, jd: jdLokal, b: bLokal, jbbOG: wLokal.og, jbbUG: wLokal.ug,
    hBegrenzt: Boolean(m.verlauf?.aktiv) && hLokal <= m.verlauf.hMin + 1e-9,
    og, ug, massgebend: og.eta >= ug.eta ? 'OG' : 'UG',
    VzEbene1: a.q.vertikal.max, VyEbene1: a.q.horizontal.max,
    Tx: sg.Tx, bleche,
    hBB: bv.breite ?? null, tBB: bv.dicke ?? null, blechPos: bv.pos ?? null,
    M_Blech: bv.M ?? null, V_Blech: bv.V ?? null, W_Blech: bv.W ?? null,
    sig_B: bv.sig ?? null, tau_B: bv.tau ?? null, sig_vB: bv.sig_v ?? null,
    N_ed: (og.eta >= ug.eta ? og : ug).N,
    sig_v: (og.eta >= ug.eta ? og : ug).sig_v,
    etaL: a.etaEcken, etaB: a.etaBleche,
    ok: a.eta <= 1,
  };
}

/**
 * Feldmitten zwischen den Bindeblechen.
 *
 * Der Nachweisschnitt liegt IMMER mittig zwischen zwei Blechen. Nur dort
 * schneidet man einen Gurt in seinem Feld und nicht durch einen Rahmenknoten;
 * jeder der vier Gurte kann dann seine Schnittkräfte zeigen. Ein Schnitt genau
 * durch ein Blech wäre mehrdeutig - dort springt das lokale Gurtmoment.
 */
export function schnittstellen(m) {
  const xs = knotenraster(m.L, m.a1, m.abstaende);
  const mitten = [];
  for (let i = 0; i < xs.length - 1; i++) {
    mitten.push({ x: (xs[i] + xs[i + 1]) / 2, feld: i, von: xs[i], bis: xs[i + 1] });
  }
  return mitten;
}

/** Nächstgelegene Feldmitte zu einem Wunschwert. */
export function schnittBei(m, x) {
  const s = schnittstellen(m);
  if (!s.length) return { x: m.L / 2, feld: 0, von: 0, bis: m.L };
  return s.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a));
}

/**
 * Auswertung an einer Stelle x. Der Schnitt wird auf die nächste FELDMITTE
 * gelegt; massgebend für die Blechbeanspruchung sind die beiden angrenzenden
 * Bleche, ausgewiesen wird das ungünstigere.
 */
export function auswertungAn(x, m) {
  const xs = knotenraster(m.L, m.a1, m.abstaende);
  const n = xs.length;
  const s = schnittBei(m, x);
  // An den Schnitt grenzen ZWEI Bleche. Beide werden ausgewiesen, damit sie
  // vergleichbar sind; massgebend ist das ungünstigere.
  const iL = s.feld, iR = Math.min(n - 1, s.feld + 1);
  const links = { ...knoten(s.x, m, iL, n), seite: 'links', stationX: xs[iL] };
  const rechts = { ...knoten(s.x, m, iR, n), seite: 'rechts', stationX: xs[iR] };
  const r = rechts.eta > links.eta ? rechts : links;
  return {
    ...r, x: s.x, station: r.i, stationX: xs[r.i],
    nachbarn: { links, rechts },
    feld: s.feld, feldVon: s.von, feldBis: s.bis,
    abstandStation: Math.abs(s.x - xs[r.i]), anzahlStationen: n,
    anzahlSchnitte: xs.length - 1,
  };
}

/** Vollständige Berechnung über alle Knoten. */
export function berechne(inp, profOG, profUG, stahl, joch, massVariante) {
  const m = modell(inp, profOG, profUG, stahl, joch, massVariante);
  // Eigenanteil der Gurte am globalen Moment - fuer Hinweise und Bericht.
  m.eigenanteil = eigenanteil(m);
  const xs = knotenraster(m.L, m.a1, m.abstaende);
  const n = xs.length;
  const rows = xs.map((x, i) => knoten(x, m, i, n));
  const argMax = (fn) => rows.reduce((b, r) => (fn(r) > fn(b) ? r : b), rows[0]);

  // DER MAST WIRD NICHT NACHGEWIESEN.
  // Dieses Werkzeug bemisst das JOCH. Der Mast steht hier nur als Auflager:
  // seine Steifigkeit bestimmt die Drehfeder (core.auflager.js), und der Wind
  // auf ihn zwingt dem Jochende eine Verdrehung auf. Sein eigener Nachweis
  // gehört in ein Rahmenmodell, in dem beide Maste mit ihrer wirklichen Höhe,
  // ihrem Fusspunkt und ihrer Gründung stehen - nicht in eine Nebenrechnung
  // am Ersatzbalken. Bis es das gibt, wird er hier ehrlich gar nicht geführt
  // statt halb.
  const etaGesamt = Math.max(...rows.map((r) => r.eta));
  return {
    modell: m, knoten: rows, extrem: extremwerte(m),
    stationen: n,
    schnitt: auswertungAn(m.xNachweis ?? m.L / 2, m),
    max: {
      etaOG: argMax((r) => r.og.eta),
      etaUG: argMax((r) => r.ug.eta),
      etaL: argMax((r) => r.etaL),
      etaB: argMax((r) => r.etaB),
      eta: argMax((r) => r.eta),
      etaGesamt,
      alleOk: rows.every((r) => r.ok),
    },
  };
}

/**
 * Rechnet jeden Lastfall durch und weist den massgebenden aus.
 *
 * Welcher Lastfall massgebend wird, lässt sich nicht ansehen - er muss
 * gerechnet werden, denn Wind und Vertikallasten greifen an verschiedenen
 * Stellen und in verschiedenen Richtungen an.
 *
 * Die beiden CHARAKTERISTISCHEN Lastfälle laufen mit, gehen aber weder in die
 * Umhüllende noch in die Wahl des massgebenden Lastfalls ein: sie sind kein
 * Tragsicherheitsnachweis.
 */
export function vergleichKombinationen(inp, profOG, profUG, stahl, joch) {
  const char = charakteristischeLasten(inp, joch);
  // Die Übersicht zeigt die charakteristischen Werte je Gruppe. Dafür braucht
  // sie die AUFGELÖSTEN Teile: erst dort steht, welche Gruppe was trägt.
  const flach = expandiereAnbauteile(inp.anbauteile, {
    ek: ekVonWindklasse(inp.windKlasse),
    R: inp.trasseRadius, spannweite: inp.flSpannweite,
  });
  const uebersicht = lastfallUebersicht({ ...inp, anbauteileFlach: flach },
                                        char, flach);
  const ergebnisse = {};
  const zeilen = uebersicht.lastfaelle.map((k) => {
    const e = berechne({ ...inp, lastfall: k.key }, profOG, profUG, stahl, joch);
    ergebnisse[k.key] = e;
    return {
      ...k,
      eta: e.max.etaGesamt,
      etaOG: e.max.etaOG.og.eta, etaUG: e.max.etaUG.ug.eta, etaB: e.max.etaB.etaB,
      qd: e.modell.qd, wd: e.modell.wd,
      xMax: e.max.eta.x,
    };
  });
  const nachweis = zeilen.filter((z) => z.nachweis);
  const best = nachweis.reduce((a, b) => (b.eta > a.eta ? b : a), nachweis[0] ?? null);
  return {
    ...uebersicht, ergebnisse,
    huellkurve: huellkurve(nachweis.map((z) => ergebnisse[z.key])),
    lastfaelle: zeilen.map((z) => ({ ...z, istMassgebend: z === best })),
    massgebend: best?.key ?? null,
    gewaehlt: inp.lastfall ?? best?.key ?? null,
  };
}

/**
 * Umhüllende über mehrere Kombinationen.
 *
 * Je Station wird der ungünstigste Knoten übernommen. Das ist die Darstellung,
 * die ein Nachweis braucht: sie zeigt an jeder Stelle den massgebenden Wert,
 * unabhängig davon, welche Kombination ihn erzeugt.
 */
export function huellkurve(liste) {
  const gueltig = (liste ?? []).filter((e) => e?.knoten?.length);
  if (!gueltig.length) return null;
  const erste = gueltig[0];
  const knotenH = erste.knoten.map((_, i) =>
    gueltig.reduce((a, e) => ((e.knoten[i]?.eta ?? -1) > (a?.eta ?? -1) ? e.knoten[i] : a),
                   erste.knoten[i]));
  const argMax = (fn) => knotenH.reduce((a, r) => (fn(r) > fn(a) ? r : a), knotenH[0]);
  const etaGesamt = Math.max(...gueltig.map((e) => e.max.etaGesamt));
  return {
    ...erste,
    knoten: knotenH,
    // Der Sammelwert ist bereits ein Schnitt, nicht ein ganzes Ergebnis.
    schnitt: gueltig.reduce((a, e) => (e.schnitt.eta > a.eta ? e.schnitt : a),
                            erste.schnitt),
    max: {
      ...erste.max,
      etaOG: argMax((r) => r.og.eta), etaUG: argMax((r) => r.ug.eta),
      etaL: argMax((r) => r.etaL), etaB: argMax((r) => r.etaB),
      eta: argMax((r) => r.eta), etaGesamt,
      alleOk: gueltig.every((e) => e.max.alleOk),
    },
    istHuellkurve: true,
  };
}

/**
 * AUFLAGERKRÄFTE, charakteristisch und nach Einwirkungsgruppen getrennt.
 *
 * Das ist das Blatt, das an den Fundament- oder Mastplaner geht. Es enthält
 * keine Beiwerte: die Gruppen stehen einzeln da, damit der Empfänger sie nach
 * seinem eigenen Regelwerk kombinieren kann.
 *
 *   F_z   vertikal                                   [kN]
 *   F_y   längs zum Gleis (Wind auf Joch und Teile)   [kN]
 *   F_x   in Jochachse (Umlenkung, Wind quer)         [kN]
 *   M_y   Moment quer zum Gleis (Einspannung)         [kNm]
 *   M_x   Moment längs (Torsion des Jochs)            [kNm]
 *
 * VORZEICHEN und AUFTEILUNG
 * F_z, F_y, M_y und M_x folgen aus dem Gleichgewicht des Ersatzbalkens und
 * sind je Auflager eindeutig. F_x dagegen ist eine Kraft IN der Jochachse:
 * wie sie sich auf die beiden Maste verteilt, hängt von deren Steifigkeit ab
 * und ist hier NICHT modelliert. Ausgewiesen wird deshalb die Summe.
 */
export function auflagerBlatt(inp, profOG, profUG, stahl, joch) {
  // Je Einwirkungsgruppe ein Durchgang mit dem Beiwert 1 - so bleiben die
  // Werte charakteristisch und lassen sich einzeln ablesen.
  const null4 = { G: 0, WindX: 0, WindY: 0, Schnee: 0 };
  const saetze = [
    { key: 'staendig', label: 'Ständig', bw: { ...null4, G: 1 } },
    { key: 'windX', label: 'Wind in Jochachse (x)', bw: { ...null4, WindX: 1 } },
    { key: 'windY', label: 'Wind in Gleisrichtung (y)', bw: { ...null4, WindY: 1 } },
    { key: 'schnee', label: 'Schnee und veränderlich vertikal',
      bw: { ...null4, Schnee: 1 } },
  ];

  const zeilen = saetze.map((s) => {
    const m = modell({ ...inp, beiwerteFest: s.bw }, profOG, profUG, stahl, joch);
    const L = m.L;
    // Horizontale Auflagerkraft in Gleisrichtung: Gleichlast plus Einzellasten
    const hA = (m.wd * L) / 2 + (m.H ?? []).reduce((a, p) => a + (p.w * (L - p.x)) / L, 0);
    const hB = (m.wd * L) / 2 + (m.H ?? []).reduce((a, p) => a + (p.w * p.x) / L, 0);
    // Torsion: gabelgelagert, Aufteilung nach dem Hebelarm zum Auflager
    const tA = (m.T ?? []).reduce((a, t) => a + (t.w * (L - t.x)) / L, 0);
    const tB = (m.T ?? []).reduce((a, t) => a + (t.w * t.x) / L, 0);
    const fx = (m.N ?? []).reduce((a, n) => a + n.w, 0);
    return {
      ...s,
      A: { Fz: m.RA, Fy: hA, My: m.MA, Mx: tA },
      B: { Fz: m.RB, Fy: hB, My: m.MB, Mx: tB },
      Fx: fx,
      qd: m.qd, wd: m.wd,
    };
  });

  const summe = (seite, feld) => zeilen.reduce((a, z) => a + z[seite][feld], 0);
  return {
    zeilen,
    total: {
      A: { Fz: summe('A', 'Fz'), Fy: summe('A', 'Fy'),
           My: summe('A', 'My'), Mx: summe('A', 'Mx') },
      B: { Fz: summe('B', 'Fz'), Fy: summe('B', 'Fy'),
           My: summe('B', 'My'), Mx: summe('B', 'Mx') },
      Fx: zeilen.reduce((a, z) => a + z.Fx, 0),
    },
  };
}

/** Rechnet alle drei Massvarianten durch, damit der Einfluss sichtbar wird. */
export function vergleichMassvarianten(inp, profOG, profUG, stahl, joch) {
  const ref = inp.massVariante;
  const erg = {};
  MASSVARIANTEN.forEach((v) => {
    erg[v.key] = berechne(inp, profOG, profUG, stahl, joch, v.key);
  });
  const etaRef = erg[ref].max.etaGesamt;

  return {
    gewaehlt: ref,
    zeilen: MASSVARIANTEN.map((v) => {
      const r = erg[v.key];
      return {
        key: v.key, label: v.label, kurz: v.kurz, beschreibung: v.beschreibung,
        hT: r.modell.h, bT: r.modell.b,
        etaOG: r.max.etaOG.og.eta,
        etaUG: r.max.etaUG.ug.eta,
        etaB: r.max.etaB.etaB,
        eta: r.max.etaGesamt,
        abweichung: etaRef > 0 ? (r.max.etaGesamt / etaRef - 1) * 100 : 0,
        istGewaehlt: v.key === ref,
      };
    }),
  };
}
