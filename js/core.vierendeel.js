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

import { U, TOL } from './core.constants.js';
import { bemessungslasten, auflagerkraefte, schnittgroessen,
         extremwerte, knotenraster, feldweite } from './core.statics.js';
import { charakteristischeLasten, lastfallUebersicht, beiwerteFuer,
         ekVonWindklasse } from './core.lasten.js';
import { expandiereAnbauteile } from './data.anbauteile.js';
import { biegesteifigkeitJoch, drehfedern, auflagermomente, begrenzeFeder,
         mastNachweis } from './core.auflager.js';
import { schnittAuswertung } from './core.querschnitt.js';
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

/** Rechnet die physischen Querschnittsmasse in die drei Hebelarm-Varianten um. */
export function hebelarme(phys, pOG, pUG) {
  const lichtOG = phys.jbbOG - 2 * pOG.aH;
  const lichtUG = phys.jbbUG - 2 * pUG.aH;
  const zsH_o = pOG.zsH * U.cm__mm, zsH_u = pUG.zsH * U.cm__mm;
  const zsV_o = pOG.zsV * U.cm__mm, zsV_u = pUG.zsV * U.cm__mm;
  const mm = (v) => v / U.m__mm;
  return {
    lichtOG, lichtUG,
    varianten: {
      schwerpunkt: {
        hT: mm(phys.jd - zsH_o - zsH_u),
        bT: mm(((lichtOG + 2 * zsV_o) + (lichtUG + 2 * zsV_u)) / 2),
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
  const ha = hebelarme(phys, profOG, profUG);
  const v = ha.varianten[variante];
  if (!v) throw new Error(`Unbekannte Massvariante: ${variante}`);

  // Verjüngte Enden und Grundrissknick: Hebelarme hängen von x ab
  const verlauf = hebelarmVerlauf(joch, inp.L, v.hT, phys.jd);
  const breite = breitenVerlauf(joch, inp.L, v.bT, phys.jbbOG, phys.jbbUG);

  const char = charakteristischeLasten(inp, joch);
  // Baugruppen ZUERST in Einzellasten auflösen: je Modul und je freiem
  // Lastblock ein Eintrag mit eigenem Angriffspunkt. Erst danach kennt der
  // Rechenkern nur noch Einzellasten - und erst danach ist bekannt, ob
  // überhaupt veränderliche Vertikallasten vorkommen.
  const anbauteile = expandiereAnbauteile(inp.anbauteile, {
    ek: ekVonWindklasse(inp.windKlasse),
    R: inp.trasseRadius, spannweite: inp.flSpannweite,
  });
  // Der gewählte Lastfall liefert die Beiwerte je Einwirkungsgruppe.
  // beiwerteFest übergeht ihn - gebraucht für das Auflagerblatt, das die
  // Gruppen einzeln und ohne Beiwerte ausweist.
  const beiwerte = inp.beiwerteFest
    ?? beiwerteFuer({ ...inp, anbauteileFlach: anbauteile }, inp.lastfall);
  const lasten = bemessungslasten({ ...inp, ...char, beiwerte },
                                  anbauteile, verlauf.hAn);

  const steif = biegesteifigkeitJoch(v.hT, profOG, profUG);
  const federnRoh = drehfedern(inp);

  // GRENZLAST DER GURTVERBINDUNG
  // Das Stützmoment tritt als Kräftepaar zwischen Ober- und Untergurt-
  // anschluss in den Mast. Mehr als ihre Grenzlast können die Schrauben nicht
  // übertragen; die Feder wird deshalb so weit herabgesetzt, bis sie
  // eingehalten ist (core.auflager.js, begrenzeFeder). Abschaltbar - und ohne
  // Feder ohnehin gegenstandslos.
  // 'voll eingespannt' bleibt ausgenommen: das ist eine bewusst gewählte
  // Idealisierung zum Vergleich, keine ausgeführte Verbindung.
  const grenzeAktiv = inp.schraubenGrenze !== false
    && inp.endbedingung !== 'voll'
    && federnRoh.cA + federnRoh.cB > 0 && inp.schraubenFgrenz > 0;
  const grenze = grenzeAktiv
    ? begrenzeFeder({ L: inp.L, qd: lasten.qd, P: lasten.P, M: lasten.M,
                      EI: steif.EI, cA: federnRoh.cA, cB: federnRoh.cB,
                      h: v.hT, Fgrenz: inp.schraubenFgrenz })
    : null;
  const federn = { ...federnRoh, roh: federnRoh, grenze,
                   ...(grenze ? { cA: grenze.cA, cB: grenze.cB } : {}) };

  const auf = auflagermomente({
    L: inp.L, qd: lasten.qd, P: lasten.P, M: lasten.M,
    EI: steif.EI, cA: federn.cA, cB: federn.cB,
  });
  const reakt = auflagerkraefte({
    L: inp.L, qd: lasten.qd, P: lasten.P, M: lasten.M,
    MA: auf.MA, MB: auf.MB,
  });

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
    anbauteile: inp.anbauteile, anbauteileFlach: anbauteile,
    profOG, profUG, stahl, joch,
    fyd: stahl.fy / inp.gammaM0, gammaM0: inp.gammaM0,
    eps: Math.sqrt(235 / stahl.fy),
    char, ...lasten, ...reakt,
    steif, federn, ...auf, endbedingung: inp.endbedingung,
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
  const a = schnittAuswertung(sg, mx, bleche, nachbarfelder, x);

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
  const xs = knotenraster(m.L, m.a1, m.abstaende);
  const n = xs.length;
  const rows = xs.map((x, i) => knoten(x, m, i, n));
  const argMax = (fn) => rows.reduce((b, r) => (fn(r) > fn(b) ? r : b), rows[0]);

  const mast = m.federn.mast
    ? mastNachweis(m.federn.mast, {
        N: Math.max(m.RA, m.RB),
        MJoch: Math.max(Math.abs(m.MA), Math.abs(m.MB)),
        wMast: inp.wMast, H: inp.mastH, fyd: m.fyd,
      })
    : null;

  const etaGesamt = Math.max(...rows.map((r) => r.eta));
  return {
    modell: m, knoten: rows, extrem: extremwerte(m), mast,
    stationen: n,
    schnitt: auswertungAn(m.xNachweis ?? m.L / 2, m),
    max: {
      etaOG: argMax((r) => r.og.eta),
      etaUG: argMax((r) => r.ug.eta),
      etaL: argMax((r) => r.etaL),
      etaB: argMax((r) => r.etaB),
      eta: argMax((r) => r.eta),
      etaGesamt,
      etaMitMast: mast ? Math.max(etaGesamt, mast.eta) : etaGesamt,
      alleOk: rows.every((r) => r.ok) && (!mast || mast.ok),
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
      eta: e.max.etaMitMast,
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
  const etaGesamt = Math.max(...gueltig.map((e) => e.max.etaMitMast));
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
      eta: argMax((r) => r.eta), etaGesamt, etaMitMast: etaGesamt,
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
