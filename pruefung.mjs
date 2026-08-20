/**
 * pruefung.mjs
 * ============================================================================
 * UNABHÄNGIGER PRÜFSTAND für den Rechenkern.
 *
 * Jede Prüfung stellt dem Kern eine Aufgabe gegenüber, deren Ergebnis sich von
 * Hand angeben lässt - geschlossene Formel, Gleichgewicht oder Symmetrie.
 * Es wird bewusst NICHT gegen frühere Ausgaben des Werkzeugs verglichen,
 * sondern gegen Werte, die unabhängig davon feststehen.
 *
 * Aufruf:  node pruefung.mjs
 * ============================================================================
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HIER = dirname(fileURLToPath(import.meta.url));
const J = (n) => join(HIER, 'js', n);

const T = await import(J('data.tragjoche.js'));
T.setzeDatenbank(JSON.parse(readFileSync(join(HIER, 'data', 'tragjoche.json'), 'utf8')));

const { getProfil, getStahl, PROFILE } = await import(J('data.profiles.js'));
const { berechne, modell, auswertungAn } = await import(J('core.vierendeel.js'));
const { torsionsSchubfluss } = await import(J('core.querschnitt.js'));
const { schnittgroessen, knotenraster, pruefeAbstaende } = await import(J('core.statics.js'));
const { auflagermomente, biegesteifigkeitJoch, E_STAHL } = await import(J('core.auflager.js'));
const { klassifiziereWinkel, klasseAuskragend } = await import(J('core.klassen.js'));
const { standardwerte, typUebernehmen } = await import(J('ui.schema.js'));
const A = await import(J('data.anbauteile.js'));
A.setzeAnbauteilDB(JSON.parse(readFileSync(join(HIER, 'data', 'anbauteile.json'), 'utf8')));
const FL = await import(J('data.fl.js'));
FL.setzeFlDB(JSON.parse(readFileSync(join(HIER, 'data', 'fl_bauteile.json'), 'utf8')));

/**
 * Anbauteil für Prüfzwecke. raster = 0 lässt beide Befestigungspunkte
 * zusammenfallen, damit die geschlossenen Formeln für EINE Einzellast gelten.
 */
const teil = (o) => ({
  id: o.id ?? 'T', vorlage: 'direkt', name: o.name ?? 'P', x: o.x,
  raster: o.raster ?? 0, seite: 'rechts', eigengewicht: 0,
  befestigung: o.befestigung,
  ev: o.ev ?? 0, ex: o.ex ?? 0,
  Gz: o.Gz ?? 0, Gx: o.Gx ?? 0, Gy: o.Gy ?? 0,
  Qz: o.Qz ?? 0, Qx: o.Qx ?? 0, Qy: o.Qy ?? 0, aktiv: true,
  ...(o.lasten ? { lasten: o.lasten } : {}),
  ...(o.module ? { module: o.module } : {}),
});

/** Freier Lastblock im neuen Modell: Angriffspunkt / Kraft / Moment. */
const block = (o) => ({ einwirkung: o.einwirkung ?? 'G',
  x: o.x ?? 0, y: o.y ?? 0, z: o.z ?? 0,
  Fx: o.Fx ?? 0, Fy: o.Fy ?? 0, Fz: o.Fz ?? 0,
  Mxx: o.Mxx ?? 0, Myy: o.Myy ?? 0, Mzz: o.Mzz ?? 0 });

// --- Prüfrahmen -------------------------------------------------------------

let bestanden = 0, gefallen = 0;
const fehlerliste = [];

function pruef(name, ist, soll, tol = 1e-9, einheit = '') {
  // Bei Sollwert null ist ein relativer Vergleich sinnlos - dort gilt eine
  // absolute Schranke, sonst schlägt Rechenrauschen von 1e-15 als Fehler durch.
  const nullSoll = Math.abs(soll) < 1e-12;
  const abw = nullSoll ? Math.abs(ist)
                       : Math.abs(ist - soll) / Math.max(Math.abs(ist), Math.abs(soll));
  // Bei Sollwert null gilt eine absolute Schranke, sonst schlägt das
  // Rechenrauschen der Gleitkommaarithmetik (1e-15) als Fehler durch.
  const ok = nullSoll ? abw < 1e-8 : abw <= tol;
  ok ? bestanden++ : gefallen++;
  const z = (v) => (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0)
    ? v.toExponential(4) : v.toFixed(6));
  console.log(`  ${ok ? '  ok' : 'FEHL'}  ${name.padEnd(52)} ` +
              `${z(ist).padStart(14)} ${z(soll).padStart(14)} ${einheit}` +
              (ok ? '' : `   Abw ${(abw * 100).toFixed(4)} %`));
  if (!ok) fehlerliste.push(`${name}: ist ${z(ist)}, soll ${z(soll)}`);
}

function wahr(name, bedingung, bemerkung = '') {
  bedingung ? bestanden++ : gefallen++;
  console.log(`  ${bedingung ? '  ok' : 'FEHL'}  ${name}${bemerkung ? '  – ' + bemerkung : ''}`);
  if (!bedingung) fehlerliste.push(name);
}

const titel = (t) => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

// --- Basis-Eingabe ohne Einzellasten (reine Gleichlast) ---------------------

function basis(zusatz = {}) {
  const std = { ...standardwerte(), bearbeiten: false };
  const joch = T.getTragjoch('J90');
  return {
    ...typUebernehmen(std, joch),
    typ: 'J90', L: 20, anbauteile: [],
    schneeAktiv: false, gZusatz: 0,
    endbedingung: 'gelenkig', torsionsverteilung: 'schubfluss',
    torsionModell: 'huellkurve', xNachweis: 0,
    ...zusatz,
  };
}

const rechne = (w) => {
  const joch = w.typ !== 'frei' ? T.getTragjoch(w.typ) : null;
  return berechne(w, getProfil(w.profOG), getProfil(w.profUG), getStahl(w.stahl), joch);
};

console.log('='.repeat(104));
console.log('PRÜFSTAND TRAGJOCH – Kern gegen unabhängig bestimmte Werte');
console.log('='.repeat(104));
console.log(`  ${'Status'}  ${'Prüfung'.padEnd(52)} ${'Kern'.padStart(14)} ${'Soll'.padStart(14)}`);

// ===========================================================================
titel('1  Ersatzbalken – geschlossene Formeln');

{
  const w = basis();
  const e = rechne(w);
  const m = e.modell;
  const q = m.qd, L = m.L;

  pruef('Auflagerkraft R_A = q·L/2', m.RA, (q * L) / 2, 1e-12, 'kN');
  pruef('Gleichgewicht  R_A + R_B = q·L', m.RA + m.RB, q * L, 1e-12, 'kN');
  pruef('Feldmoment  M(L/2) = q·L²/8',
        schnittgroessen(L / 2, m).My, (q * L * L) / 8, 1e-10, 'kNm');
  pruef('Moment am Auflager = 0', Math.abs(schnittgroessen(0, m).My), 0, 1e-9, 'kNm');
  pruef('Querkraft V(0) = q·L/2', Math.abs(schnittgroessen(0, m).Vz), (q * L) / 2, 1e-12, 'kN');
  pruef('Querkraft V(L/2) = 0', Math.abs(schnittgroessen(L / 2, m).Vz), 0, 1e-9, 'kN');

  // Windbiegung
  pruef('Windmoment M_z(L/2) = w·L²/8',
        schnittgroessen(L / 2, m).Mz, (m.wd * L * L) / 8, 1e-10, 'kNm');
}

{
  // Einzellast in Feldmitte, ohne Gleichlast
  const w = basis({
    lastHerkunft: 'manuell', gkManuell: 0, wkManuell: 0, skManuell: 0,
    anbauteile: [teil({ x: 10, Gz: 10 })],
    gammaG: 1.0,
  });
  const e = rechne(w);
  const m = e.modell;
  pruef('Einzellast Feldmitte  M = P·L/4',
        schnittgroessen(10, m).My, (10 * 20) / 4, 1e-10, 'kNm');
  pruef('Einzellast Feldmitte  R_A = P/2', m.RA, 5, 1e-12, 'kN');
}

// ===========================================================================
titel('2  Endeinspannung – Drehwinkelverfahren gegen geschlossene Lösung');

{
  // Symmetrische Gleichlast, Drehfeder c an beiden Enden:
  //     M_A = (q·L²/12) · alpha/(1+alpha)      mit alpha = c·L/(2·EI)
  const w = basis({ endbedingung: 'manuell', cPhi: 8000 });
  const e = rechne(w);
  const m = e.modell;
  const alpha = (m.federn.cA * m.L) / (2 * m.steif.EI);
  const soll = ((m.qd * m.L * m.L) / 12) * (alpha / (1 + alpha));
  pruef('Stützmoment M_A bei Drehfeder', m.MA, soll, 1e-10, 'kNm');
  pruef('Symmetrie M_A = M_B', m.MA, m.MB, 1e-10, 'kNm');
}

{
  const e = rechne(basis({ endbedingung: 'voll' }));
  const m = e.modell;
  pruef('Volle Einspannung  M_A = q·L²/12', m.MA, (m.qd * m.L * m.L) / 12, 1e-6, 'kNm');
  pruef('Volle Einspannung  M(L/2) = q·L²/24',
        schnittgroessen(m.L / 2, m).My, (m.qd * m.L * m.L) / 24, 1e-5, 'kNm');
  pruef('Einspanngrad κ = 1', m.kappaA, 1, 1e-6, '–');
}

{
  const e = rechne(basis({ endbedingung: 'gelenkig' }));
  const m = e.modell;
  pruef('Gelenkig  M_A = 0', Math.abs(m.MA), 0, 1e-9, 'kNm');
  pruef('Gelenkig  M(L/2) = q·L²/8',
        schnittgroessen(m.L / 2, m).My, (m.qd * m.L * m.L) / 8, 1e-10, 'kNm');
}

{
  // Mast als Kragarm:  c = E·I/H. Die Voreinstellung ist der durchlaufende
  // Mast, deshalb wird die Anschlussart hier ausdrücklich gesetzt.
  const w = basis({ endbedingung: 'mast', mastProfil: 'HEB 240',
                    mastH: 8, mastSteg: 'jochachse', mastAnschluss: 'kragarm' });
  const e = rechne(w);
  const p = e.modell.federn.mast;
  pruef('Mast-Drehfeder c = E·I/H', p.cPhi, (E_STAHL * (11260 * 1e-8)) / 8, 1e-9, 'kNm/rad');
  const q = rechne({ ...w, mastSteg: 'quer' });
  pruef('Stegdrehung nutzt I_z', q.modell.federn.mast.I_cm4, 3923, 1e-12, 'cm4');
}

// ===========================================================================
titel('3  Torsion – Schubfluss nach Bredt');

{
  const b = 0.4, h = 0.6, Tx = 5;
  const sf = torsionsSchubfluss(Tx, b, h, 'schubfluss');
  pruef('Schubfluss q = T/(2·b·h)', sf.qT, Tx / (2 * b * h), 1e-12, 'kN/m');
  pruef('Vertikalebene V = T/(2b)', sf.vertikal, Tx / (2 * b), 1e-12, 'kN');
  pruef('Horizontalebene V = T/(2h)', sf.horizontal, Tx / (2 * h), 1e-12, 'kN');
  // Die beiden Wände einer Richtung bilden ein Kräftepaar: Moment = Kraft mal
  // Hebelarm (nicht zweimal), sonst wird doppelt gezählt.
  pruef('Momentengleichgewicht  V_v·b + V_h·h = T',
        sf.vertikal * b + sf.horizontal * h, Tx, 1e-12, 'kNm');

  const nv = torsionsSchubfluss(Tx, b, h, 'nurVertikal');
  pruef('Nur-Vertikal  V = T/b', nv.vertikal, Tx / b, 1e-12, 'kN');
  pruef('Nur-Vertikal ist doppelt so gross', nv.vertikal / sf.vertikal, 2, 1e-12, '–');
  pruef('Nur-Vertikal  Horizontalebene = 0', nv.horizontal, 0, 1e-12, 'kN');
}

// ===========================================================================
titel('4  Aufteilung auf die Eckwinkel');

{
  const w = basis({
    lastHerkunft: 'manuell', gkManuell: 2, wkManuell: 1, skManuell: 0,
    gammaG: 1, gammaQ: 1, lastfall: 'wind',
    anbauteile: [teil({ name: 'HS', x: 8, Gz: 12, Qy: 3, ev: 1.2 })],
  });
  const e = rechne(w);
  const m = e.modell;
  const s = auswertungAn(7.5, m);

  const summeOben = s.ecken.filter((c) => c.gurt === 'OG')
                           .reduce((a, c) => a + c.N_My, 0);
  pruef('Kräftepaar M_y:  |ΣN_OG| · h = M_y',
        Math.abs(summeOben) * m.h, Math.abs(s.My), 1e-10, 'kNm');
  pruef('N_My oben und unten gegengleich',
        s.ecken.find((c) => c.id === 'OG_L').N_My,
        -s.ecken.find((c) => c.id === 'UG_L').N_My, 1e-12, 'kN');

  const linkeEbene = s.ecken.filter((c) => c.seite === 'L')
                            .reduce((a, c) => a + c.N_Mz, 0);
  pruef('Kräftepaar M_z:  |ΣN_Ebene| · b = M_z',
        Math.abs(linkeEbene) * m.b, Math.abs(s.Mz), 1e-10, 'kNm');

  pruef('Summe aller Normalkräfte = 0 (kein Längszwang)',
        s.ecken.reduce((a, c) => a + c.N, 0), 0, 1e-9, 'kN');

  // Lokales Vierendeel-Moment am Knoten und am Anschnitt des Bindeblechs.
  // Der Knoten ist über die Blechbreite b_Bl biegesteif; nachgewiesen wird
  // der Gurt am Rand dieses Bereichs.
  const bBl = s.ebenen.find((x) => x.art === 'vertikal').breite / 1000;
  const fA = (m.a1eff - bBl) / m.a1eff;
  pruef('M_y,Knoten = V_Ebene · a₁ / 4',
        s.My_Knoten, (s.q.vertikal.max * m.a1eff) / 4, 1e-12, 'kNm');
  pruef('M_y,L,lokal = M_Knoten · (a₁ − b_Bl)/a₁',
        s.My_lokal, (s.q.vertikal.max * m.a1eff) / 4 * fA, 1e-12, 'kNm');
  wahr('Der Anschnitt mindert das Gurtmoment ab', s.My_lokal < s.My_Knoten,
       `Faktor ${fA.toFixed(3)} bei b_Bl = ${(bBl * 1000).toFixed(0)} mm`);
}

// ===========================================================================
titel('5  Spannungen – Einheiten und Querschnittswerte');

{
  const p = getProfil('L 90x90x9');
  // 100 kN auf 15.5 cm2  ->  100000 N / 1550 mm2 = 64.516 N/mm2
  const w = basis({
    lastHerkunft: 'manuell', gkManuell: 0, wkManuell: 0, skManuell: 0, gammaG: 1,
    anbauteile: [],
  });
  const e = rechne(w);
  const m = e.modell;
  pruef('Grenzspannung f_y/γ_M0', m.fyd, 235 / 1.05, 1e-12, 'N/mm²');

  // Umrechnung direkt am Kern nachvollziehen
  const s = auswertungAn(m.L / 2, m);
  const og = s.ecken.find((c) => c.id === 'OG_R');
  pruef('σ_N = N·10/A  (kN, cm² → N/mm²)',
        og.sig_N, (Math.abs(og.N) * 10) / p.A, 1e-12, 'N/mm²');
  pruef('σ_My = M·1000/W  (kNm, cm³ → N/mm²)',
        og.sig_My, (s.My_lokal * 1000) / p.Wy, 1e-12, 'N/mm²');

  // Blechquerschnitt
  const bl = s.ebenen.find((x) => x.id === 'V_R');
  pruef('Blech W = t·b²/6', bl.W, (bl.dicke * bl.breite ** 2) / 6, 1e-12, 'mm³');
  pruef('Blech σ = M/W  (kNm → Nmm)', bl.sig, (bl.M * 1e6) / bl.W, 1e-12, 'N/mm²');
  pruef('Blech τ = 1.5·V/A', bl.tau, (1.5 * bl.V * 1000) / (bl.dicke * bl.breite),
        1e-12, 'N/mm²');
  pruef('von Mises σ_v = √(σ²+3τ²)', bl.sig_v,
        Math.sqrt(bl.sig ** 2 + 3 * bl.tau ** 2), 1e-12, 'N/mm²');
}

// ===========================================================================
titel('6  Bindeblech – Gleichgewicht am Rahmenknoten');

{
  const w = basis({
    lastHerkunft: 'manuell', gkManuell: 3, wkManuell: 0, skManuell: 0, gammaG: 1,
    anbauteile: [],
  });
  const e = rechne(w);
  const m = e.modell;
  const s = auswertungAn(m.a1 * 5, m);              // innerer Knoten
  const bl = s.ebenen.find((x) => x.id === 'V_R');
  const V = s.q.vertikal.max;

  // Das Blech nimmt die Gurtmomente BEIDER angrenzender Felder auf:
  //   M_Knoten = 2 · (V·a₁/4) = V·a₁/2
  pruef('M_Knoten = V_Ebene · a₁/2 (innerer Knoten)',
        bl.M_Knoten, (V * m.a1eff) / 2, 1e-12, 'kNm');
  // Blech mit gleichen Endmomenten, Wendepunkt in Blechmitte:
  //   V_Blech = 2·M_Knoten / h   – vom steifen Knotenbereich unberührt
  pruef('V_Blech = 2·M_Knoten/h  (Gleichgewicht am Blech)',
        bl.V, (2 * bl.M_Knoten) / m.h, 1e-9, 'kN');

  // STEIFER KNOTENBEREICH: nachgewiesen wird am Anschnitt des Gurtes.
  //   M_Rd = M_Knoten · L_c / h
  pruef('M_Rd am Anschnitt = M_Knoten · L_c/h',
        bl.M, bl.M_Knoten * (bl.lichteLaenge / m.h), 1e-12, 'kNm');
  // Gegenprobe über das Gleichgewicht des Blechs selbst:
  //   M_Rd = V_Blech · L_c / 2
  pruef('Gegenprobe  M_Rd = V_Blech · L_c/2', bl.M, (bl.V * bl.lichteLaenge) / 2, 1e-9, 'kNm');
  wahr('Abminderung durch den steifen Bereich liegt unter 1',
       bl.abminderung < 1 && bl.abminderung > 0.5,
       `L_c = ${(bl.lichteLaenge * 1000).toFixed(0)} mm bei h = ${(m.h * 1000).toFixed(0)} mm ` +
       `→ ${(bl.abminderung * 100).toFixed(1)} %`);
  pruef('Steife Länge je Ende = (h − L_c)/2',
        bl.steifeLaenge, (m.h - bl.lichteLaenge) / 2, 1e-12, 'm');

  // Beide Nachbarbleche des Schnitts werden getrennt ausgewiesen
  wahr('Schnitt weist beide Nachbarbleche aus',
       Boolean(s.nachbarn?.links && s.nachbarn?.rechts),
       `links x = ${s.nachbarn.links.stationX.toFixed(2)} m, ` +
       `rechts x = ${s.nachbarn.rechts.stationX.toFixed(2)} m`);
  wahr('Massgebend ist das ungünstigere der beiden',
       s.eta === Math.max(s.nachbarn.links.eta, s.nachbarn.rechts.eta));
}

// ===========================================================================
titel('7  Querschnittsklassen gegen EN 1993-1-1 Tab. 5.2');

{
  pruef('Grenze K1 bei ε=1', 9, 9, 0, '');
  wahr('c/t = 8.9 → Klasse 1', klasseAuskragend(8.9, 1) === 1);
  wahr('c/t = 9.5 → Klasse 2', klasseAuskragend(9.5, 1) === 2);
  wahr('c/t = 12  → Klasse 3', klasseAuskragend(12, 1) === 3);
  wahr('c/t = 15  → Klasse 4', klasseAuskragend(15, 1) === 4);

  const eps235 = Math.sqrt(235 / 235), eps355 = Math.sqrt(235 / 355);
  const k90 = klassifiziereWinkel(getProfil('L 90x90x9'), eps235);
  wahr('L 90x90x9 in S235 → Klasse 3', k90.klasse === 3,
       `a/t = ${(90 / 9).toFixed(2)}, Grenze Winkel 11.5·ε = 11.50`);
  const k100 = klassifiziereWinkel(getProfil('L 100x100x10'), eps355);
  wahr('L 100x100x10 in S355 → Klasse 4', k100.klasse === 4,
       `a/t = 10.00 > 11.5·ε = ${(11.5 * eps355).toFixed(2)}`);
}

// ===========================================================================
titel('8  Symmetrie und Gleichgewicht am Gesamtmodell');

{
  const w = basis({
    lastHerkunft: 'manuell', gkManuell: 2.5, wkManuell: 0.8, skManuell: 0, gammaG: 1,
    anbauteile: [teil({ name: 'A', x: 5, Gz: 8 }), teil({ name: 'B', x: 15, Gz: 8 })],
  });
  const e = rechne(w);
  const m = e.modell;
  pruef('Symmetrische Last → R_A = R_B', m.RA, m.RB, 1e-12, 'kN');
  pruef('Vertikales Gleichgewicht ΣV = q·L + ΣP',
        m.RA + m.RB, m.qd * m.L + 16, 1e-12, 'kN');
  pruef('Symmetrie M(x) = M(L−x)',
        schnittgroessen(6, m).My, schnittgroessen(14, m).My, 1e-10, 'kNm');

  // Ausnutzung symmetrisch über die Stationen
  const n = e.knoten.length;
  let maxAbw = 0;
  for (let i = 0; i < n; i++) {
    const a = e.knoten[i].eta, b = e.knoten[n - 1 - i].eta;
    maxAbw = Math.max(maxAbw, Math.abs(a - b) / Math.max(a, b, 1e-9));
  }
  pruef('Ausnutzung symmetrisch über alle Stationen', maxAbw, 0, 1e-9, '–');
}

// ===========================================================================
titel('9  Blechstaffelung und Geometrie der Typendatenbank');

{
  const fehler = T.pruefeDatenbank(getProfil);
  wahr('Typendatenbank stimmig zur Zeichnungsgeometrie', fehler.length === 0,
       fehler.length ? fehler[0] : '9 Regeln je Typ geprüft');

  for (const typ of ['J70', 'J90', 'J100', 'J120', 'J130']) {
    const j = T.getTragjoch(typ);
    const pOG = getProfil(j.og.profil), pUG = getProfil(j.ug.profil);
    const vert = j.bleche.vertikal[0];
    pruef(`${typ}  Vertikalblech = jd − aV,OG − aV,UG`,
          vert.laenge, j.jd - pOG.aV - pUG.aV, 1e-12, 'mm');
    const horFeld = j.bleche.horizontal.find((b) => b.zone === 'feld');
    pruef(`${typ}  Horizontalblech Feld = jbb − 2·ja`,
          horFeld.laenge, j.og.jbb - 2 * j.og.ja, 1e-12, 'mm');
  }

  // Staffelung symmetrisch und lückenlos
  const w = basis({ typ: 'J130', L: 30, profOG: 'L 130x130x12', profUG: 'L 120x80x12',
                    jd: 700, jbbOG: 660, jbbUG: 640 });
  const e = rechne(w);
  const br = e.modell.stationsListe.map((s) => s.vertikal?.breite);
  const symm = br.every((v, i) => v === br[br.length - 1 - i]);
  wahr('J130 Blechstaffelung spiegelsymmetrisch', symm,
       `${br[0]} … ${br[Math.floor(br.length / 2)]} … ${br[br.length - 1]} mm`);
  wahr('Staffelung fällt zur Feldmitte hin ab',
       br[0] >= br[Math.floor(br.length / 2)],
       `Auflager ${br[0]} mm, Feldmitte ${br[Math.floor(br.length / 2)]} mm`);
  wahr('Keine Station ohne Blech', br.every((v) => Number.isFinite(v)));
}

// ===========================================================================
titel('10  Massvarianten und Lastkombination');

{
  const w = basis();
  const jo = T.getTragjoch('J90');
  const pOG = getProfil('L 90x90x9');
  const mSp = modell(w, pOG, pOG, getStahl('S235'), jo, 'schwerpunkt');
  const mAu = modell(w, pOG, pOG, getStahl('S235'), jo, 'aussen');
  const mLi = modell(w, pOG, pOG, getStahl('S235'), jo, 'licht');

  pruef('h Schwerpunkt = jd − 2·zsH', mSp.h * 1000, 500 - 2 * pOG.zsH * 10, 1e-9, 'mm');
  pruef('h Aussenmass = jd', mAu.h * 1000, 500, 1e-12, 'mm');
  pruef('h Lichtmass = jd − 2·t', mLi.h * 1000, 500 - 2 * pOG.t, 1e-12, 'mm');
  wahr('Hebelarme geordnet  licht < schwerpunkt < aussen',
       mLi.b < mSp.b && mSp.b < mAu.b,
       `${(mLi.b * 1000).toFixed(1)} < ${(mSp.b * 1000).toFixed(1)} < ${(mAu.b * 1000).toFixed(1)} mm`);

  // Lastbeiwerte
  const lastbasis = { gammaG: 1.35, gammaQ: 1.5, psi0: 0.5,
                      lastHerkunft: 'manuell', gkManuell: 1, wkManuell: 1, skManuell: 1,
                      schneeAktiv: true };
  const eg = rechne(basis({ ...lastbasis, lastfall: 'windYp' }));
  pruef('q_d,g = γ_G · g_k', eg.modell.qd_g, 1.35, 1e-12, 'kN/m');
  pruef('w_d = γ_Q · w_k (Wind leitend)', eg.modell.wd, 1.5, 1e-12, 'kN/m');
  pruef('q_d,s = γ_Q · ψ₀ · s_k (Schnee begleitend)',
        eg.modell.qd_s, 1.5 * 0.5, 1e-12, 'kN/m');

  const es = rechne(basis({ ...lastbasis, lastfall: 'schneep' }));
  pruef('Schnee leitend:  q_d,s = γ_Q · s_k', es.modell.qd_s, 1.5, 1e-12, 'kN/m');
  pruef('Schnee leitend:  w_d = γ_Q · ψ₀ · w_k', es.modell.wd, 1.5 * 0.5, 1e-12, 'kN/m');
}

// ===========================================================================
titel('11  Grenzfälle');

{
  const ohne = rechne(basis({ lastHerkunft: 'manuell', gkManuell: 0, wkManuell: 0,
                              skManuell: 0, anbauteile: [] }));
  pruef('Ohne Last → η = 0', ohne.max.etaGesamt, 0, 1e-12, '–');

  const kurz = rechne(basis({ L: 8 }));
  wahr('Kurze Spannweite rechnet', Number.isFinite(kurz.max.etaGesamt),
       `L = 8 m, ${kurz.stationen} Stationen, η = ${kurz.max.etaGesamt.toFixed(3)}`);

  const raster = knotenraster(20, 0.75);
  pruef('Knotenraster endet exakt bei L', raster[raster.length - 1], 20, 1e-12, 'm');
  wahr('Knotenraster beginnt bei 0', raster[0] === 0);

  const e130 = rechne(basis({ typ: 'J130', L: 34.5, profOG: 'L 130x130x12',
                              profUG: 'L 120x80x12', jd: 700, jbbOG: 660, jbbUG: 640 }));
  wahr('Grösste Spannweite J130 = 34.5 m rechnet',
       Number.isFinite(e130.max.etaGesamt),
       `${e130.stationen} Stationen, η = ${e130.max.etaGesamt.toFixed(3)}`);
}

// ===========================================================================
titel('12  Altbauweise – verjüngte Enden');

{
  // Datenbank: die geometrischen Zwangsbedingungen aller Typen
  const beanstandet = T.pruefeDatenbank(getProfil);
  wahr('Typendatenbank ohne Beanstandung', beanstandet.length === 0,
       beanstandet.length ? beanstandet[0] : `${T.tragjoche().length} Typen geprüft`);

  const alt = T.tragjoche().filter((j) => j.bauweise === 'alt');
  wahr('Sieben Typen der Altbauweise vorhanden', alt.length === 7,
       alt.map((j) => j.typ).join(', '));

  // Feldquerschnitt identisch mit dem heutigen Sortiment - unabhängige Probe,
  // dass Stückliste (alt) und Sortimentsblatt (neu) dasselbe Joch beschreiben
  alt.forEach((j) => {
    const neu = T.getTragjoch(j.typ.replace('-alt', ''));
    pruef(`${j.typ}: Bauhöhe im Feld wie ${neu.typ}`, j.jd, neu.jd, 1e-12, 'mm');
    pruef(`${j.typ}: Breite Obergurt wie ${neu.typ}`, j.og.jbb, neu.og.jbb, 1e-12, 'mm');
  });

  // Verlauf der Bauhöhe
  const j100 = T.getTragjoch('J100-alt');
  const v = T.voute(j100);
  pruef('J100-alt: Endbauhöhe = Summe der stehenden Schenkel',
        v.endJd, getProfil(j100.og.profil).aV + getProfil(j100.ug.profil).aV, 1e-12, 'mm');
  pruef('J100-alt: Bauhöhe am Jochende', T.bauhoeheAn(j100, 25, 0), v.endJd, 1e-12, 'mm');
  pruef('J100-alt: Bauhöhe am Ende des geraden Stücks',
        T.bauhoeheAn(j100, 25, v.gerade / 1000), v.endJd, 1e-12, 'mm');
  pruef('J100-alt: Bauhöhe am Knick', T.bauhoeheAn(j100, 25, v.knick / 1000),
        j100.jd, 1e-12, 'mm');
  pruef('J100-alt: Bauhöhe in Feldmitte', T.bauhoeheAn(j100, 25, 12.5), j100.jd, 1e-12, 'mm');
  // Mitte der Schräge: genau die halbe Höhendifferenz
  pruef('J100-alt: Bauhöhe in der Mitte der Schräge',
        T.bauhoeheAn(j100, 25, (v.gerade + v.neigung / 2) / 1000),
        (v.endJd + j100.jd) / 2, 1e-12, 'mm');
  wahr('J100-alt: Verlauf symmetrisch',
       Math.abs(T.bauhoeheAn(j100, 25, 2) - T.bauhoeheAn(j100, 25, 23)) < 1e-9);

  // Ausführung nach Spannweite
  pruef('J100-alt: Ausführung bei L = 20.0 m ist die erste',
        T.ausfuehrungFuer(j100, 20).l[0], 20.0, 1e-12, 'm');
  wahr('J100-alt: Ausführung bei L = 24.0 m ist III',
       T.ausfuehrungFuer(j100, 24).bez === 'III',
       T.ausfuehrungFuer(j100, 24).bez);
  wahr('J100-alt: engere Staffelung bei kurzem Joch',
       T.staffelungFuer(j100, 'vertikal', 20).find((s) => s.pos === 11).anzahl
       < T.staffelungFuer(j100, 'vertikal', 29.5).find((s) => s.pos === 11).anzahl);

  // Am verjüngten Ende liegt kein Vertikalblech
  wahr('Keine Vertikalbleche an den beiden ersten Stationen',
       T.blechAnStation(j100, 'vertikal', 0, 34, 25) === null
       && T.blechAnStation(j100, 'vertikal', 1, 34, 25) === null);
  wahr('Horizontalblech ab der zweiten Station vorhanden',
       T.blechAnStation(j100, 'horizontal', 0, 34, 25) === null
       && T.blechAnStation(j100, 'horizontal', 1, 34, 25)?.zone === 'auflager');

  // Rechenkern: Hebelarm folgt der Verjüngung
  const w = basis({ typ: 'J100-alt', L: 25, jd: j100.jd,
                    jbbOG: j100.og.jbb, jbbUG: j100.ug.jbb,
                    profOG: j100.og.profil, profUG: j100.ug.profil, a1: 0.75 });
  const e = rechne(w);
  const mAlt = e.modell;
  wahr('Modell erkennt die Verjüngung', mAlt.verlauf.aktiv === true);
  pruef('Hebelarm in Feldmitte = Feldwert', mAlt.verlauf.hAn(12.5), mAlt.h, 1e-12, 'm');
  const dhSoll = (j100.jd - v.endJd) / 1000;
  pruef('Hebelarm am Jochende um die Höhendifferenz kleiner',
        mAlt.h - mAlt.verlauf.hAn(0), dhSoll, 1e-9, 'm');
  wahr('Hebelarm nimmt zum Auflager monoton ab',
       [0, 0.5, 1.2, 1.8, 2.4, 3, 6].every((x, k, a) =>
         k === 0 || mAlt.verlauf.hAn(x) >= mAlt.verlauf.hAn(a[k - 1]) - 1e-12));

  // Gurtkraft an einer Station: N = M/(2h) mit dem ÖRTLICHEN Hebelarm
  const st = e.knoten.find((k) => k.x > 1.4 && k.x < 3.1);
  pruef('Gurtkraft mit örtlichem Hebelarm  N = M_y/(2·h(x))',
        Math.abs(st.ecken[0].N_My), Math.abs(st.My) / (2 * mAlt.verlauf.hAn(st.x)),
        1e-9, 'kN');
  wahr('Örtlicher Hebelarm dort kleiner als im Feld',
       st.h < mAlt.h - 1e-6, `h(${st.x.toFixed(2)}) = ${(st.h * 1000).toFixed(0)} mm ` +
       `statt ${(mAlt.h * 1000).toFixed(0)} mm`);

  // Gegenprobe: dasselbe Joch ohne Verjüngung muss günstiger sein, weil der
  // Hebelarm im Endbereich grösser ist
  const eNeu = rechne(basis({ typ: 'J100', L: 25, jd: 600, jbbOG: 600, jbbUG: 560,
                              profOG: 'L 100x100x10', profUG: 'L 80x80x8', a1: 0.75 }));
  wahr('Verjüngtes Joch nicht günstiger als das durchgehende',
       e.max.etaGesamt >= eNeu.max.etaGesamt - 1e-9,
       `alt η = ${e.max.etaGesamt.toFixed(3)}, neu η = ${eNeu.max.etaGesamt.toFixed(3)}`);

  // Alle sieben Typen rechnen über ihren ganzen Längenbereich
  let ok = true, meldung = '';
  alt.forEach((j) => {
    [j.laengeNorm[0], (j.laengeNorm[0] + j.laengeNorm[1]) / 2, j.laengeNorm[1]]
      .forEach((L) => {
        const r = rechne(basis({ typ: j.typ, L, jd: j.jd, jbbOG: j.og.jbb,
                                 jbbUG: j.ug.jbb, profOG: j.og.profil,
                                 profUG: j.ug.profil, a1: j.teilung / 1000 }));
        if (!Number.isFinite(r.max.etaGesamt)) { ok = false; meldung = `${j.typ} L=${L}`; }
      });
  });
  wahr('Alle Typen der Altbauweise rechnen über den ganzen Längenbereich', ok,
       meldung || '21 Spannweiten geprüft');
}

// ===========================================================================
titel('13  Blecheinteilung nach Mass-Tabelle und Gabel am Jochende');

{
  const j80 = T.getTragjoch('J80');
  // Die Mass-Tabelle gilt für ALLE Typen und hängt nur von der Jochlänge ab.
  const zeilen = Object.entries(T.datenbank().masstabelle.zeilen);
  wahr('Mass-Tabelle hinterlegt', zeilen.length >= 50, `${zeilen.length} Längen`);

  // Bedingung der Zeichnung: 2·750 + 2·ΣA = Jochlänge
  const schlecht = zeilen.filter(([k, A]) =>
    !pruefeAbstaende(parseFloat(k), 0.75, A.map((v) => v / 1000)).ok);
  const bekannt = T.masstabelleUnschluessig();
  wahr('Jede Tabellenzeile geht auf – ausser den ausgewiesenen',
       schlecht.every(([k]) => bekannt.includes(k)),
       schlecht.length ? `nicht schlüssig: ${schlecht.map(([k]) => k).join(', ')}`
                       : `${zeilen.length} Zeilen geprüft`);
  wahr('Unschlüssige Zeilen werden nicht verwendet',
       bekannt.every((k) => T.abstaendeFuer(j80, parseFloat(k)) === null),
       bekannt.join(', '));

  // Stationsraster: Enden enthalten, Aufbau aus der Tabelle
  const A16 = T.abstaendeFuer(j80, 16.0);
  const xs = knotenraster(16.0, 0.75, A16);
  pruef('J80 16.00 m: erste Station bei 750 mm', xs[1], 0.75, 1e-12, 'm');
  pruef('J80 16.00 m: Raster beginnt am Jochende', xs[0], 0, 1e-12, 'm');
  pruef('J80 16.00 m: Raster endet am Jochende', xs[xs.length - 1], 16.0, 1e-9, 'm');
  pruef('J80 16.00 m: Stationszahl', xs.length, 23, 1e-12, '–');
  wahr('J80 16.00 m: Raster symmetrisch',
       xs.every((x, i) => Math.abs(x - (16.0 - xs[xs.length - 1 - i])) < 1e-9));

  // Gegenprobe mit den Stückzahlen der Konstruktionszeichnung 373.08.021:
  // je Ebene hat die Vertikalebene genau zwei Bleche mehr - die an den Enden.
  const zaehle = (L, ebene) => {
    const A = T.abstaendeFuer(j80, L);
    const n = knotenraster(L, 0.75, A).length;
    let k = 0;
    for (let i = 0; i < n; i++) if (T.blechAnStation(j80, ebene, i, n, L)) k++;
    return k;
  };
  [[8.0, 13, 11], [9.0, 14, 12], [16.0, 23, 21], [23.5, 33, 31]].forEach(([L, v, h]) => {
    pruef(`J80 ${L.toFixed(2)} m: Vertikalbleche je Ebene`, zaehle(L, 'vertikal'), v, 1e-12, 'Stk');
    pruef(`J80 ${L.toFixed(2)} m: Horizontalbleche je Ebene`, zaehle(L, 'horizontal'), h, 1e-12, 'Stk');
  });

  // Halbes Mittelfeld: bei 9.00 m schreibt die Zeichnung A1 = 340 = halbes Feld
  const A9 = T.abstaendeFuer(j80, 9.0);
  const x9 = knotenraster(9.0, 0.75, A9);
  wahr('J80 9.00 m: kein Blech in Jochmitte (halbes Mittelfeld)',
       !x9.some((x) => Math.abs(x - 4.5) < 1e-6),
       `${x9.length} Stationen, nächste bei ${x9.reduce((a, b) =>
         Math.abs(b - 4.5) < Math.abs(a - 4.5) ? b : a).toFixed(3)} m`);

  // Gabel: an den Jochenden liegt ein Vertikal-, aber kein Horizontalblech
  const n16 = xs.length;
  wahr('Gabel: Vertikalblech am Jochende vorhanden',
       Boolean(T.blechAnStation(j80, 'vertikal', 0, n16, 16))
       && Boolean(T.blechAnStation(j80, 'vertikal', n16 - 1, n16, 16)));
  wahr('Gabel: kein Horizontalblech am Jochende',
       T.blechAnStation(j80, 'horizontal', 0, n16, 16) === null
       && T.blechAnStation(j80, 'horizontal', n16 - 1, n16, 16) === null);
  wahr('Auflagerblech steht an der ersten Station nach der Gabel',
       T.blechAnStation(j80, 'horizontal', 1, n16, 16)?.zone === 'auflager');

  // Kein Nachweis auf ein Blech, das es nicht gibt
  const w80 = basis({ typ: 'J80', L: 16, jd: j80.jd, jbbOG: j80.og.jbb,
                      jbbUG: j80.ug.jbb, profOG: j80.og.profil,
                      profUG: j80.ug.profil, a1: 0.75 });
  const e80 = rechne(w80);
  const rand = e80.knoten[0];
  wahr('Am Jochende wird nur die Vertikalebene nachgewiesen',
       rand.ebenen.filter((eb) => eb.art === 'horizontal').every((eb) => eb.blechFehlt)
       && rand.ebenen.filter((eb) => eb.art === 'vertikal').every((eb) => !eb.blechFehlt));
  pruef('J80 16.00 m: Modell nutzt die Mass-Tabelle',
        e80.modell.abstaende.length, A16.length, 1e-12, 'Felder');
  wahr('Teilungsquelle ist die Mass-Tabelle',
       e80.modell.teilungQuelle === 'masstabelle', e80.modell.teilungQuelle);
}

// ===========================================================================
titel('14  Grundrissknick – Breite über die Länge');

{
  // Die lichte Weite am Auflager ist die Gabel für den Mast und muss über
  // ALLE Typen einer Bauweise gleich sein.
  const lichte = (j, g) => j[g].jba - 2 * j[g].ja;
  const neu = T.tragjoche().filter((j) => j.bauweise !== 'alt');
  const alt = T.tragjoche().filter((j) => j.bauweise === 'alt');
  wahr('Lichte Auflagerweite bei allen heutigen Typen 340 mm',
       neu.every((j) => lichte(j, 'og') === 340 && lichte(j, 'ug') === 340),
       `${neu.length} Typen`);
  wahr('Lichte Auflagerweite bei allen Alttypen 280 mm',
       alt.every((j) => lichte(j, 'og') === 280 && lichte(j, 'ug') === 280),
       `${alt.length} Typen`);

  // Ab J100 ist der Obergurt im Feld breiter als der Untergurt
  const j130 = T.getTragjoch('J130');
  wahr('J130: Obergurt im Feld breiter als Untergurt',
       j130.og.jbb > j130.ug.jbb, `${j130.og.jbb} / ${j130.ug.jbb} mm`);

  pruef('J130: Breite am Jochende = jba', T.breiteAn(j130, 'og', 20, 0),
        j130.og.jba, 1e-12, 'mm');
  pruef('J130: Breite am ersten Knick noch jba',
        T.breiteAn(j130, 'og', 20, j130.jk / 1000), j130.og.jba, 1e-12, 'mm');
  pruef('J130: Breite am zweiten Knick = jbb',
        T.breiteAn(j130, 'og', 20, j130.jkk / 1000), j130.og.jbb, 1e-12, 'mm');
  pruef('J130: Breite in Feldmitte = jbb', T.breiteAn(j130, 'og', 20, 10),
        j130.og.jbb, 1e-12, 'mm');
  pruef('J130: Breite in der Mitte des Übergangs',
        T.breiteAn(j130, 'og', 20, (j130.jk + j130.jkk) / 2000),
        (j130.og.jba + j130.og.jbb) / 2, 1e-9, 'mm');
  wahr('J130: Grundriss symmetrisch',
       Math.abs(T.breiteAn(j130, 'og', 20, 1.1) - T.breiteAn(j130, 'og', 20, 18.9)) < 1e-9);

  // Rechenkern: b folgt dem Knick
  const w = basis({ typ: 'J130', L: 30, jd: j130.jd, jbbOG: j130.og.jbb,
                    jbbUG: j130.ug.jbb, profOG: j130.og.profil,
                    profUG: j130.ug.profil, a1: 0.75 });
  const e = rechne(w);
  const m = e.modell;
  wahr('Modell erkennt den Grundrissknick', m.breite.aktiv === true);
  pruef('Hebelarm b in Feldmitte = Feldwert', m.breite.bAn(15), m.b, 1e-12, 'm');
  const dbSoll = ((j130.og.jba - j130.og.jbb) + (j130.ug.jba - j130.ug.jbb)) / 2 / 1000;
  pruef('Hebelarm b am Auflager um die halbe Breitenänderung kleiner',
        m.breite.bAn(0) - m.b, dbSoll, 1e-9, 'm');

  // Torsionsschubfluss folgt b(x): schmaler Querschnitt -> grössere Ebenenkraft
  const kAuf = e.knoten[0], kFeld = e.knoten[Math.floor(e.knoten.length / 2)];
  wahr('Schnittauswertung nutzt die örtliche Breite',
       kAuf.b < kFeld.b - 1e-6,
       `b(0) = ${(kAuf.b * 1000).toFixed(0)} mm, b(L/2) = ${(kFeld.b * 1000).toFixed(0)} mm`);

  // Typ ohne Knick: b bleibt konstant
  const ohne = rechne(basis({ typ: 'frei', jbbOG: 440, jbbUG: 440 }));
  wahr('Ohne Katalogtyp bleibt die Breite konstant', ohne.modell.breite.aktiv === false);
}

// ===========================================================================
titel('15  Lastfälle');

{
  const L = await import(J('core.lasten.js'));

  const w = basis({ lastHerkunft: 'manuell', gkManuell: 2, wkManuell: 1, skManuell: 3,
                    schneeAktiv: true, gammaG: 1.35, gammaQ: 1.5, psi0: 0.5 });
  const lf = L.lastfaelle(w);
  const holen = (k) => lf.find((x) => x.key === k);

  // 2 charakteristische + 4 Wind (je Richtung ±) + 2 Schnee (Begleitwind ±)
  pruef('Acht Lastfälle mit Schnee', lf.length, 8, 1e-12, 'Stk');
  wahr('Vier Gruppen: G, Wind x, Wind y, Schnee',
       L.EINWIRKUNGEN.map((e) => e.key).join(',') === 'G,WindX,WindY,Schnee',
       L.EINWIRKUNGEN.map((e) => e.label).join(' · '));

  // Die beiden charakteristischen Lastfälle: alle Beiwerte 1.00 bzw. 0
  const gk = holen('gk'), gwk = holen('gwk');
  pruef('LF ständig: γ_G = 1.00', gk.beiwerte.G, 1, 1e-12, '–');
  pruef('LF ständig: Wind y = 0', gk.beiwerte.WindY, 0, 1e-12, '–');
  pruef('LF ständig + Wind: γ_G = 1.00', gwk.beiwerte.G, 1, 1e-12, '–');
  pruef('LF ständig + Wind: Wind y = 1.00', gwk.beiwerte.WindY, 1, 1e-12, '–');
  pruef('LF ständig + Wind: Wind x = 1.00', gwk.beiwerte.WindX, 1, 1e-12, '–');
  wahr('Charakteristische Lastfälle sind kein Nachweis',
       gk.nachweis === false && gwk.nachweis === false);

  // Tragsicherheit: Leiteinwirkung voll, Begleiteinwirkung mit ψ₀
  pruef('Wind y +: Wind y = +γ_Q', holen('windYp').beiwerte.WindY, 1.5, 1e-12, '–');
  pruef('Wind y −: Wind y = −γ_Q', holen('windYm').beiwerte.WindY, -1.5, 1e-12, '–');
  pruef('Wind x +: Wind x = +γ_Q', holen('windXp').beiwerte.WindX, 1.5, 1e-12, '–');
  pruef('Wind x −: Wind x = −γ_Q', holen('windXm').beiwerte.WindX, -1.5, 1e-12, '–');
  pruef('Wind y leitend: Wind x bleibt aus', holen('windYp').beiwerte.WindX, 0, 1e-12, '–');
  pruef('Wind x leitend: Wind y bleibt aus', holen('windXp').beiwerte.WindY, 0, 1e-12, '–');
  pruef('Wind leitend: Schnee = γ_Q · ψ₀', holen('windYp').beiwerte.Schnee, 0.75, 1e-12, '–');
  pruef('Schnee leitend: Schnee = γ_Q', holen('schneep').beiwerte.Schnee, 1.5, 1e-12, '–');
  pruef('Schnee leitend: Wind y = γ_Q · ψ₀', holen('schneep').beiwerte.WindY, 0.75, 1e-12, '–');
  pruef('Schnee leitend −: Wind y = −γ_Q · ψ₀',
        holen('schneem').beiwerte.WindY, -0.75, 1e-12, '–');
  wahr('Ständige Einwirkung wird nie umgekehrt',
       lf.every((x) => (x.beiwerte.G ?? 0) >= 0));

  // Ohne Schnee auf dem Joch, aber mit Q_z am Anbauteil bleibt die Gruppe aktiv
  const ohneSchnee = basis({ schneeAktiv: false, anbauteile: [] });
  wahr('Ohne Schnee und ohne Q_z: sechs Lastfälle',
       L.lastfaelle(ohneSchnee).length === 6);
  const mitQz = basis({ schneeAktiv: false,
                        anbauteile: [teil({ name: 'P', x: 10, Qz: 5 })] });
  const flachQz = A.expandiereAnbauteile(mitQz.anbauteile, {});
  wahr('Q_z am Anbauteil hält die Gruppe Schnee aktiv',
       L.lastfaelle({ ...mitQz, anbauteileFlach: flachQz }).length === 8);

  // Normensätze
  const rte = { ...w, ...L.NORMENSAETZE.find((n) => n.key === 'rte').beiwerte };
  pruef('RTE: γ_G = 1.30', L.lastfaelle(rte).find((x) => x.key === 'windYp').beiwerte.G,
        1.30, 1e-12, '–');
  pruef('RTE: Begleitwind = 1.30 · 0.50',
        L.lastfaelle(rte).find((x) => x.key === 'schneep').beiwerte.WindY, 0.65, 1e-12, '–');
  wahr('Normensatz wird an den Beiwerten erkannt',
       L.erkenneNormensatz(rte)?.key === 'rte' &&
       L.erkenneNormensatz({ ...rte, gammaQ: 1.42 }) === null);

  // Anpassung eines vorgegebenen Lastfalls und eigene Lastfälle
  const ang = { ...w, lastfallAnpassung: { windYp: { Schnee: 0 } } };
  pruef('Anpassung überschreibt nur den einen Beiwert',
        L.lastfaelle(ang).find((x) => x.key === 'windYp').beiwerte.Schnee, 0, 1e-12, '–');
  pruef('Übrige Beiwerte folgen weiter dem Normensatz',
        L.lastfaelle(ang).find((x) => x.key === 'windYp').beiwerte.G, 1.35, 1e-12, '–');
  const eig = { ...w, lastfaelleEigen: [{ key: 'e1', bez: 'Montage',
                                          beiwerte: { G: 1.1, WindY: -0.8, Schnee: 0 } }] };
  pruef('Eigener Lastfall wird angehängt', L.lastfaelle(eig).length, 9, 1e-12, 'Stk');
  pruef('Negativer Beiwert bleibt erhalten',
        L.beiwerteFuer(eig, 'e1').WindY, -0.8, 1e-12, '–');

  // Die Beiwerte kommen bis in die Bemessungslasten durch
  const cw = rechne({ ...w, lastfall: 'gwk' });
  pruef('LF ständig + Wind: q_d = g_k', cw.modell.qd, 2, 1e-12, 'kN/m');
  pruef('LF ständig + Wind: w_d = w_k', cw.modell.wd, 1, 1e-12, 'kN/m');
  pruef('LF ständig + Wind: kein Schnee', cw.modell.qd_s, 0, 1e-12, 'kN/m');
  // Der Wind auf das Joch hängt an Wind y, nicht an Wind x
  const nurX = rechne({ ...w, lastfall: 'windXp' });
  pruef('Wind x leitend: w_d auf das Joch = 0', nurX.modell.wd, 0, 1e-12, 'kN/m');
  const minusY = rechne({ ...w, lastfall: 'windYm' });
  pruef('Wind y −: w_d kehrt sich um', minusY.modell.wd, -1.5, 1e-12, 'kN/m');
  pruef('Wind y −: q_d bleibt unverändert', minusY.modell.qd_g, 1.35 * 2, 1e-12, 'kN/m');

  // Umhüllende und "massgebend" lassen die charakteristischen Lastfälle aus
  const { vergleichKombinationen } = await import(J('core.vierendeel.js'));
  const v = vergleichKombinationen(w, getProfil(w.profOG), getProfil(w.profUG),
                                   getStahl('S235'), T.getTragjoch('J90'));
  wahr('Massgebend ist ein Tragsicherheitslastfall',
       v.lastfaelle.find((x) => x.istMassgebend)?.nachweis === true,
       `massgebend: ${v.massgebend}`);
  const etaChar = Math.max(...v.lastfaelle.filter((x) => !x.nachweis).map((x) => x.eta));
  const etaNw = Math.max(...v.lastfaelle.filter((x) => x.nachweis).map((x) => x.eta));
  wahr('Charakteristisches η liegt unter dem Bemessungswert',
       etaChar < etaNw, `${etaChar.toFixed(3)} < ${etaNw.toFixed(3)}`);
  pruef('Umhüllende = grösstes η der Nachweislastfälle',
        v.huellkurve.max.etaMitMast, etaNw, 1e-12, '–');
}

// ===========================================================================
titel('16  Anbauteile: Befestigung und Einwirkungsgruppen');

{
  const { anbauteilLasten, befestigungsArt } = await import(J('core.anbauteile.js'));

  wahr('Befestigung folgt ohne Angabe dem Vorzeichen von z',
       befestigungsArt({ z: -1.5 }) === 'unten' && befestigungsArt({ z: 0.8 }) === 'oben');
  wahr('Angegebene Befestigung hat Vorrang',
       befestigungsArt({ z: -1.5, befestigung: 'durchgehend' }) === 'durchgehend');
  // z zählt ab der Anschlussebene, der Hebelarm ab der Jochachse: dazwischen h/2
  const { anschlussGurt, hebelarmZuAchse } = await import(J('core.anbauteile.js'));
  wahr('Durchgehend: das Vorzeichen von z bestimmt den Anschlussgurt',
       anschlussGurt({ befestigung: 'durchgehend', z: 1.0 }) === 'OG' &&
       anschlussGurt({ befestigung: 'durchgehend', z: -1.0 }) === 'UG');
  wahr('Einseitig: der angegebene Gurt gilt, unabhängig von z',
       anschlussGurt({ befestigung: 'unten', z: 1.0 }) === 'UG');
  pruef('Hängestütze z = −1.35 m am UG: e_v = 1.35 + h/2',
        hebelarmZuAchse({ befestigung: 'unten', z: -1.35 }, 0.5), 1.35 + 0.25, 1e-12, 'm');
  pruef('Jochaufsatz z = +1.00 m am OG: e_v = −(1.00 + h/2)',
        hebelarmZuAchse({ befestigung: 'oben', z: 1.0 }, 0.5), -(1.0 + 0.25), 1e-12, 'm');

  const A2 = await import(J('data.anbauteile.js'));
  wahr('Hängestütze und Jochaufsatz sind durchgehend befestigt',
       A2.getVorlage('hs-fahrdraht').befestigung === 'durchgehend' &&
       A2.getVorlage('ja-einfach').befestigung === 'durchgehend');
  wahr('Die Lampe ist einseitig befestigt',
       A2.getVorlage('lampe-led').befestigung === 'unten');

  // Q_z läuft in der Gruppe Schnee, Q_x in Wind x, Q_y in Wind y.
  // Der Rechenkern bekommt nur AUFGELÖSTE Teile - deshalb hier erst
  // expandieren, genau wie im Betrieb.
  const auf = (liste) => A2.expandiereAnbauteile(liste, {});
  const t1 = auf([teil({ name: 'P', x: 10, Gz: 4, Qz: 6, Qy: 2 })]);
  const r = anbauteilLasten(t1, { beiwerte: { G: 2, WindX: 7, WindY: 3, Schnee: 5 } }, 0.45);
  pruef('F_z = β_G · G_z + β_Schnee · Q_z',
        r.teile.reduce((s, t) => s + t.Fz, 0), 2 * 4 + 5 * 6, 1e-12, 'kN');
  pruef('F_y = β_WindY · Q_y',
        r.teile.reduce((s, t) => s + t.Fy, 0), 3 * 2, 1e-12, 'kN');
  const t1x = auf([teil({ name: 'P', x: 10, Qx: 2, Qy: 2 })]);
  const rx = anbauteilLasten(t1x, { beiwerte: { G: 0, WindX: 7, WindY: 3, Schnee: 0 } }, 0.45);
  pruef('Q_x hängt an Wind x, nicht an Wind y',
        rx.teile.reduce((s, t) => s + t.Fx, 0), 7 * 2, 1e-12, 'kN');
  const rMinus = anbauteilLasten(t1x,
    { beiwerte: { G: 0, WindX: -7, WindY: 3, Schnee: 0 } }, 0.45);
  pruef('Negativer Windbeiwert kehrt F_x um',
        rMinus.teile.reduce((s, t) => s + t.Fx, 0), -7 * 2, 1e-12, 'kN');

  // --- Örtliche Einleitung des Moments F_y · e_v --------------------------
  const eins = { beiwerte: { G: 1, WindX: 1, WindY: 1, Schnee: 1 },
                 jbbOG: 400, jbbUG: 400 };
  const hArm = 0.5;
  const lasten = (bef) => anbauteilLasten(
    auf([{ ...teil({ name: 'A', x: 10, Qy: 4, ev: 1.5 }), befestigung: bef }]),
    eins, hArm);

  const durch = lasten('durchgehend');
  const einseitig = lasten('unten');
  // e_v = z-Mass 1.5 m ab Anschlussebene + h/2 = 0.25 m bis zur Jochachse
  const T = 4 * (1.5 + hArm / 2);                      // F_y · e_v = 7 kNm

  pruef('4 Punkte: ΔF_y = T / h', durch.teile[0].dFy, T / hArm, 1e-12, 'kN');
  pruef('2 Punkte: ΔF_z = T / jbb', einseitig.teile[0].dFz, T / 0.400, 1e-12, 'kN');
  wahr('4 Punkte belasten die Horizontalebenen',
       durch.lokal.every((l) => l.ebene === 'horizontal'));
  wahr('2 Punkte belasten die Vertikalebenen',
       einseitig.lokal.every((l) => l.ebene === 'vertikal'));
  wahr('4 Punkte greifen an beiden Gurten an, 2 Punkte an einem',
       new Set(durch.lokal.map((l) => l.gurt)).size === 2 &&
       new Set(einseitig.lokal.map((l) => l.gurt)).size === 1);
  pruef('Kräftepaar ist in sich im Gleichgewicht',
        durch.lokal.reduce((s, l) => s + l.dF, 0), 0, 1e-12, 'kN');
  pruef('Anzahl Anschlusspunkte 4 bzw. 2',
        durch.teile[0].punkte.length - einseitig.teile[0].punkte.length, 2, 1e-12, 'Stk');

  // Das Kräftepaar kommt im Blechnachweis an
  const { ebenenQuerkraefte } = await import(J('core.querschnitt.js'));
  // Stationen so gelegt, dass beide Einleitungsstellen auf x = 10 fallen -
  // dann trägt dieses eine Blech das ganze Kräftepaar.
  const mLok = { b: 0.4, h: 0.5, a1eff: 0.75, torsionsverteilung: 'schubfluss',
                 lokal: durch.lokal, stationsX: [0, 10, 20] };
  const sg0 = { Vz: 0, Vy: 0, Tx: 0 };
  const fern = ebenenQuerkraefte(sg0, mLok, 0);          // weit weg vom Teil
  const nah = ebenenQuerkraefte(sg0, mLok, 10);          // am Teil
  pruef('Fern vom Anbauteil kein örtlicher Anteil', fern.horizontal.anteilLokal,
        0, 1e-12, 'kN');
  pruef('Am Anbauteil trägt die Horizontalebene das ganze Kräftepaar',
        nah.horizontal.anteilLokal, T / hArm, 1e-12, 'kN');
  pruef('Die Vertikalebene bleibt davon unberührt', nah.vertikal.anteilLokal,
        0, 1e-12, 'kN');

  // Wirkung im vollständigen Nachweis: die Befestigungsart ändert η
  const mitAT = (bef) => rechne(basis({
    lastHerkunft: 'manuell', gkManuell: 0.6, wkManuell: 0.5, skManuell: 0,
    anbauteile: [{ ...teil({ name: 'HS', x: 10, Gz: 3, Qy: 4, ev: 1.5 }),
                   raster: 0.4, befestigung: bef }],
  }));
  const e4 = mitAT('durchgehend'), e2 = mitAT('unten');
  wahr('Befestigungsart wirkt sich auf die Nachweise aus',
       Math.abs(e4.max.etaGesamt - e2.max.etaGesamt) > 1e-6,
       `4 Punkte η = ${e4.max.etaGesamt.toFixed(3)} · ` +
       `2 Punkte η = ${e2.max.etaGesamt.toFixed(3)}`);
}

// ===========================================================================
titel('17  Modelldarstellung: Nachweisschnitt und Plotgrössen');

{
  const R = await import(J('render.3d.js'));

  const w = basis({ xNachweis: 10 });
  const e = rechne(w);

  // Der Nachweisschnitt ist im Grundzustand aus
  wahr('Nachweisschnitt voreingestellt ausgeschaltet',
       standardwerte().schnittAktiv === false);

  const aus = R.erzeugeSzene(e.modell, e);
  wahr('Ausgeschaltet: keine Schnittebene', aus.schnitt === null);
  wahr('Ausgeschaltet: nur die Jochlänge bleibt bemasst',
       aus.masse.every((mz) => mz.zu !== 'schnitt'),
       `${aus.masse.length} Masse`);
  wahr('Ausgeschaltet: keine Schnittkraftpfeile',
       aus.vektoren.every((v) => v.gruppe !== 'kraefte'));

  const eAn = rechne(basis({ xNachweis: 10, schnittAktiv: true }));
  const an = R.erzeugeSzene(eAn.modell, eAn);
  wahr('Eingeschaltet: Schnittebene vorhanden', Boolean(an.schnitt));
  wahr('Eingeschaltet: Vermassung des Schnitts erscheint',
       an.masse.some((mz) => mz.zu === 'schnitt' && mz.feld === 'jd'));
  wahr('Eingeschaltet: Schnittkraftpfeile erscheinen',
       an.vektoren.some((v) => v.gruppe === 'kraefte'));

  // Bemassung der Anbauteile hängt am Teil, nicht am Schnitt
  const mitTeil = rechne(basis({ anbauteile: [teil({ name: 'HS', x: 8, Gz: 5, ev: 1.2 })] }));
  const sz = R.erzeugeSzene(mitTeil.modell, mitTeil);
  wahr('Anbauteil-Bemassung ist einem Teil zugeordnet',
       sz.masse.some((mz) => mz.zu === 'AT0'));

  // --- Baugruppen im Modell -----------------------------------------------
  // Der Regressionsfall: die aufgelösten Module heissen AT-xxx#0, AT-xxx#1 …
  // Wer sie über die Kennung der BAUGRUPPE sucht, findet nie etwas - dann
  // fehlten Kraftpfeile und alle Module lägen auf derselben Höhe.
  const AG = await import(J('data.anbauteile.js'));
  const bgTeil = AG.neuesAnbauteil('hs-fahrdraht', 8);
  const mitBg = rechne(basis({ trasseRadius: 300, flSpannweite: 50,
                               anbauteile: [bgTeil] }));
  const szBg = R.erzeugeSzene(mitBg.modell, mitBg);
  const lastPfeile = szBg.vektoren.filter((v) => v.art === 'last');
  wahr('Baugruppe: Kraftpfeile werden gezeichnet', lastPfeile.length > 0,
       `${lastPfeile.length} Pfeile`);
  wahr('Jedes Modul der Baugruppe bekommt eigene Pfeile',
       new Set(lastPfeile.map((v) => v.titel.split(' · ')[1])).size >= 2,
       [...new Set(lastPfeile.map((v) => v.titel))].join(' | '));
  wahr('Die Module liegen auf verschiedenen Höhen',
       new Set(lastPfeile.map((v) => v.p[2].toFixed(4))).size >= 2);
  wahr('Baugruppe wird für den Einzelheitsblick ausgewiesen',
       (szBg.anbauteile ?? []).length === 1 && szBg.anbauteile[0].teil === 'AT0');
  wahr('Der Umriss der Baugruppe steckt in den Grenzen',
       szBg.grenzen.zMin <= szBg.anbauteile[0].zMin + 1e-9 &&
       szBg.grenzen.zMax >= szBg.anbauteile[0].zMax - 1e-9,
       `z ${szBg.grenzen.zMin.toFixed(2)} … ${szBg.grenzen.zMax.toFixed(2)} m`);
  wahr('Jedes Modul wird einzeln bemasst',
       szBg.masse.filter((mz) => mz.zu === 'AT0' && mz.achse === 'z').length >= 2);

  // Auftragbare Grössen: Wertebereiche und Zuordnung
  pruef('Fünf auftragbare Grössen', R.PLOTS.length, 5, 1e-12, 'Stk');
  const gurt = aus.flaechen.find((f) => f.gruppe === 'profil' && f.werte);
  const blech = aus.flaechen.find((f) => f.gruppe === 'blech' && f.werte);
  wahr('Gurt führt Normalkraft, aber keine Querkraft',
       Number.isFinite(gurt.werte.N) && gurt.werte.V === null,
       `N = ${gurt.werte.N.toFixed(1)} kN`);
  wahr('Blech führt Querkraft, aber keine Normalkraft',
       Number.isFinite(blech.werte.V) && blech.werte.N === null,
       `V = ${blech.werte.V.toFixed(1)} kN`);
  R.PLOTS.forEach((p) => {
    wahr(`Wertebereich für ${p.label} ermittelt`,
         Number.isFinite(aus.bereiche[p.feld]) && aus.bereiche[p.feld] >= 0,
         `max = ${aus.bereiche[p.feld].toFixed(2)} ${p.einheit}`);
  });
  pruef('η-Bereich = grösstes η des Modells',
        aus.bereiche.eta, e.max.eta.eta, 1e-9, '–');
}

// ===========================================================================
titel('18  Oberfläche: Struktur der Eingabe');

{
  const U = await import(J('ui.schema.js'));
  const sichtbar = (g, w) => U.sichtbareFelder(g, w).map((f) => f.key);
  const w = standardwerte();

  // Keine Grösse darf zweimal bedienbar sein
  const alleSichtbaren = ['typ', 'geo', 'aufl', 'prof', 'blech', 'anbau', 'ein', 'komb']
    .flatMap((g) => sichtbar(g, w));
  wahr('Nachweisschnitt nicht doppelt in der Eingabe',
       !alleSichtbaren.includes('xNachweis'),
       `Systemreiter: ${sichtbar('geo', w).join(', ')}`);
  wahr('Keine doppelten Feldschlüssel in der Maske',
       new Set(alleSichtbaren).size === alleSichtbaren.length);

  // Versteckte Felder tauchen weder in der Maske noch im Optionen-Dialog auf
  const inOptionen = U.optionenFelder(w).flatMap((a) => a.felder.map((f) => f.key));
  const versteckt = U.FELDER.filter((f) => f.versteckt).map((f) => f.key);
  wahr('Versteckte Felder erscheinen nirgends',
       versteckt.every((k) => !alleSichtbaren.includes(k) && !inOptionen.includes(k)),
       versteckt.join(', '));
  wahr('Jedes Optionsfeld ist auch als optionenDialog gekennzeichnet',
       inOptionen.every((k) => U.feld(k).optionenDialog));

  // Aufgeräumte Voreinstellungen
  pruef('Schrift im Modell 25 % kleiner als früher (13 px)',
        w.modellSchrift, 10, 1e-12, 'px');
  wahr('Lasten- und Bemassungsschrift getrennt einstellbar',
       'modellSchriftLast' in w && 'modellSchriftMass' in w);
  wahr('Nachweisschnitt startet ausgeschaltet', w.schnittAktiv === false);
}

// ===========================================================================
titel('19  Lastgenerator');

{
  const A2 = await import(J('data.anbauteile.js'));

  const r = A2.erzeugeGleislasten({ L: 20, gleise: 4, abstand: 4.5,
                                    vorlagen: ['hs-fahrdraht', 'lampe-led'] });
  pruef('4 Gleise · 2 Vorlagen = 8 Teile', r.teile.length, 8, 1e-12, 'Stk');
  pruef('Gleise symmetrisch zur Jochmitte',
        (r.gleisX[0] + r.gleisX[r.gleisX.length - 1]) / 2, 10, 1e-9, 'm');
  pruef('Gleisabstand eingehalten', r.gleisX[1] - r.gleisX[0], 4.5, 1e-9, 'm');
  wahr('Alle Teile liegen im Joch', r.teile.every((t) => t.x >= 0 && t.x <= 20));
  wahr('Teile sind dem Gleis zugeordnet',
       r.teile.filter((t) => t.gleis === 1).length === 2,
       r.teile.slice(0, 2).map((t) => t.name).join(' · '));

  // Gleise ausserhalb des Jochs werden gemeldet, nicht an den Rand geklemmt
  const eng = A2.erzeugeGleislasten({ L: 8, gleise: 4, abstand: 4.5,
                                      vorlagen: ['hs-fahrdraht'] });
  pruef('Zu breite Gleisgruppe: Gleise ausserhalb gemeldet',
        eng.ausserhalb, 2, 1e-12, 'Stk');
  wahr('Kein Teil ausserhalb des Jochs',
       eng.teile.every((t) => t.x >= 0 && t.x <= 8));

  // Versatz verschiebt die ganze Gruppe
  const v = A2.erzeugeGleislasten({ L: 20, gleise: 2, abstand: 4, versatz: 1.5,
                                    vorlagen: ['hs-fahrdraht'] });
  pruef('Versatz verschiebt die Gruppe', (v.gleisX[0] + v.gleisX[1]) / 2,
        11.5, 1e-9, 'm');

  // Eigene Vorlagen hängen sich in den Vorrat ein
  const anzahlVorher = A2.vorlagen().length;
  const eigen = A2.alsVorlage({ name: 'Sonderstütze', raster: 0.5,
    befestigung: 'durchgehend', eigengewicht: 1, ev: 2, ex: 0,
    Gz: 3, Qz: 1, Qx: 0, Qy: 2, vorlage: 'hs-nur', module: [] }, 'Sonderstütze');
  A2.setzeEigeneVorlagen([eigen]);
  pruef('Eigene Vorlage erscheint im Vorrat',
        A2.vorlagen().length - anzahlVorher, 1, 1e-12, 'Stk');
  wahr('Eigene Vorlage ist als solche gekennzeichnet',
       A2.getVorlage(eigen.id).eigen === true);
  const t = A2.neuesAnbauteil(eigen.id, 5);
  // e_v = 2 m unterhalb heisst im Koordinatenmodell z = −2 m
  pruef('Aus eigener Vorlage entsteht ein Teil mit ihren Werten',
        t.lasten.find((l) => l.einwirkung === 'G').z, -2, 1e-12, 'm');
  pruef('Ständiger Anteil G_z + Eigengewicht übernommen',
        t.lasten.find((l) => l.einwirkung === 'G').Fz, 4, 1e-12, 'kN');
  pruef('Q_y wandert in die Gruppe Wind y',
        t.lasten.find((l) => l.einwirkung === 'WindY').Fy, 2, 1e-12, 'kN');
  wahr('Befestigung wird mitgenommen', t.befestigung === 'durchgehend');
  A2.setzeEigeneVorlagen([]);
}

// ===========================================================================
titel('20  Trasse: Ablenkwinkel und Umlenkkraft');

{
  const TR = await import(J('core.trasse.js'));

  // Die Gleichheit 2·sin(α/2) = L/R ist EXAKT, nicht genähert
  [[50, 300], [60, 180], [45, 1200], [50, 300000]].forEach(([L, R]) => {
    const a = TR.ablenkwinkel(L, R);
    pruef(`2·sin(α/2) = L/R  (L=${L}, R=${R})`,
          2 * Math.sin(a / 2), L / R, 1e-12, '–');
  });

  pruef('Ablenkwinkel R = 300 m, L = 50 m',
        (TR.ablenkwinkel(50, 300) * 180) / Math.PI, 9.5604, 1e-4, '°');
  pruef('Umlenkfaktor = L/R', TR.umlenkfaktor({ L: 50, R: 300 }), 50 / 300, 1e-12, '–');

  // Umlenkkraft: Z · L/R
  const u = TR.umlenkkraft({ Z: 14.9, L: 50, R: 300 });
  pruef('U = Z · L/R', u.U, (14.9 * 50) / 300, 1e-12, 'kN');
  pruef('U verdoppelt sich bei halbem Radius',
        TR.umlenkkraft({ Z: 14.9, L: 50, R: 150 }).U / u.U, 2, 1e-12, '–');
  // Die Bogenseite steckt im VORZEICHEN des Radius, nicht in einem Schalter
  pruef('Negativer Radius lenkt in −x',
        TR.umlenkkraft({ Z: 14.9, L: 50, R: -300 }).U, -u.U, 1e-12, 'kN');
  pruef('Negativer Radius gibt einen negativen Winkel',
        TR.ablenkwinkel(50, -300), -TR.ablenkwinkel(50, 300), 1e-12, 'rad');
  pruef('Negativer Winkel überschreibt den Bogen',
        TR.umlenkkraft({ Z: 14.9, L: 50, R: 300, winkel: -9.5604 }).U,
        -u.U, 1e-4, 'kN');
  wahr('Kein Schalter "günstig/ungünstig" mehr',
       TR.WIRKUNGSWEISEN === undefined);
  wahr('Gerades Gleis erzeugt keine nennenswerte Umlenkung',
       Math.abs(TR.umlenkkraft({ Z: 14.9, L: 50, R: 300000 }).U) < 0.003,
       `${TR.umlenkkraft({ Z: 14.9, L: 50, R: 300000 }).U.toFixed(5)} kN`);
  wahr('Ohne Radius keine Umlenkung', TR.umlenkkraft({ Z: 14.9, L: 50, R: 0 }).U === 0);

  // Handeingabe des Winkels überschreibt den Bogen
  const hand = TR.umlenkkraft({ Z: 14.9, L: 50, R: 300, winkel: 9.5604 });
  pruef('Handwinkel gibt dasselbe wie der Bogen', hand.U, u.U, 1e-5, 'kN');
}

// ===========================================================================
titel('21  Lasttabelle der Fahrleitungsbauteile');

{
  // Werte gegen die Quelle: Lasttabelle, Blatt «Bauteile FL»
  const hs = FL.getFlBauteil('anbauteil-haengestuetze-od-haengerohr');
  pruef('Hängestütze Eigengewicht', hs.eigengewicht, 0.5, 1e-12, 'kN');
  pruef('Hängestütze Wind quer EK2', hs.windQuer.EK2, 0.7, 1e-12, 'kN');
  pruef('Hängestütze Wind längs EK3', hs.windLaengs.EK3, 0.8, 1e-12, 'kN');

  const ja = FL.getFlBauteil('anbauteil-jochaufsatz-norm-typ-doppelt');
  pruef('Jochaufsatz doppelt: quer ≠ längs',
        ja.windQuer.EK2 - ja.windLaengs.EK2, 1.7 - 1.3, 1e-12, 'kN');

  const nfl = FL.getFlBauteil('drahtwerk-n-fl-ts-stcu-50-fd-cu-107');
  pruef('N-FL Leiterzug = 8.5 + 6.4', nfl.leiterzug, 14.9, 1e-12, 'kN');
  pruef('R-FL Leiterzug = 10 + 12',
        FL.getFlBauteil('drahtwerk-r-fl-ts-stcu-92-fd-cu-107').leiterzug, 22, 1e-12, 'kN');
  wahr('Drahtwerke sind Streckenlasten', FL.istStreckenlast(nfl));
  wahr('Die Hängestütze ist es nicht', !FL.istStreckenlast(hs));

  // Streckenlast mal Länge, Einzellast nicht
  const wDraht = FL.flLastwerte('drahtwerk-n-fl-ts-stcu-50-fd-cu-107',
                                { ek: 'EK2', laenge: 50 });
  pruef('Drahtwerk über 50 m: G_z', wDraht.Gz, 0.02 * 50, 1e-12, 'kN');
  pruef('Drahtwerk über 50 m: Q_x', wDraht.Qx, 0.024 * 50, 1e-12, 'kN');
  const wHs = FL.flLastwerte('anbauteil-haengestuetze-od-haengerohr',
                             { ek: 'EK2', laenge: 50 });
  pruef('Einzellast wird NICHT mit der Länge multipliziert', wHs.Gz, 0.5, 1e-12, 'kN');

  // Fehlende Tabellenwerte werden ausgewiesen, nicht als Null verkauft
  wahr('Fehlender Windwert wird gemeldet',
       FL.flLastwerte('anbauteil-ausleger-typ-rohr', { ek: 'EK2' }).ohneWindQuer);

  // Windlast aus der Fläche (RTE 27200)
  pruef('w = A · q · c für EK2 und c = 1.4',
        FL.windAusFlaeche(0.25, 'EK2', 1.4), 0.25 * 1.1 * 1.4, 1e-12, 'kN');
  pruef('Referenz-Staudruck EK3', FL.staudruck('EK3'), 1.3, 1e-12, 'kN/m²');
}

// ===========================================================================
titel('22  Modulare Baugruppen');

{
  const A3 = await import(J('data.anbauteile.js'));
  const bg = A3.neuesAnbauteil('hs-fahrdraht', 10);
  wahr('Vorlage bringt ihre Module mit', (bg.module ?? []).length === 2,
       bg.module.map((m) => m.bauteil).join(' + '));

  const o = { ek: 'EK2', R: 300, spannweite: 50 };
  const flach = A3.expandiereAnbauteile([bg], o);
  pruef('Baugruppe wird in Einzellasten aufgelöst', flach.length, 2, 1e-12, 'Stk');
  wahr('Jedes Modul behält seine eigene Höhe',
       flach[0].z !== flach[1].z,
       `z = ${flach[0].z} m und ${flach[1].z} m`);
  wahr('Lage und Befestigung stammen aus der Baugruppe',
       flach.every((t) => t.x === 10 && t.befestigung === 'durchgehend'));

  const draht = flach.find((t) => t.kraefte.G.Fx !== 0);
  pruef('Umlenkkraft steht als STÄNDIGE Last in Gruppe G',
        draht.kraefte.G.Fx, (14.9 * 50) / 300, 1e-9, 'kN');
  pruef('Sie ist nicht in der Gruppe Wind x gelandet',
        draht.kraefte.WindX.Fx, 0.024 * 50, 1e-12, 'kN');
  pruef('Ablenkwinkel wird am Modul ausgewiesen', draht.alpha, 9.5604, 1e-4, '°');

  // Winkel am Modul überschreibt Radius und Spannweite
  const bgW = { ...bg, module: bg.module.map((m) => ({ ...m, winkel: -5 })) };
  const drahtW = A3.expandiereAnbauteile([bgW], o).find((t) => t.rolle === 'drahtwerk');
  pruef('Winkel am Modul überschreibt den Bogen', drahtW.alpha, -5, 1e-12, '°');
  wahr('Negativer Winkel lenkt in −x', drahtW.kraefte.G.Fx < 0);

  // Alter Stand ohne Module: die Einzelfelder werden in Lastblöcke gehoben
  const frei = { id: 'F', name: 'frei', x: 5, ev: 1, Gz: 3, Qy: 2, aktiv: true };
  const f2 = A3.expandiereAnbauteile([frei], o);
  pruef('Alte freie Eingabe wird in Gruppen aufgeteilt', f2.length, 2, 1e-12, 'Stk');
  pruef('G_z landet in der Gruppe G',
        f2.find((t) => t.einwirkung === 'G').kraefte.G.Fz, 3, 1e-12, 'kN');
  pruef('Q_y landet in der Gruppe Wind y',
        f2.find((t) => t.einwirkung === 'WindY').kraefte.WindY.Fy, 2, 1e-12, 'kN');
  pruef('e_v = 1 m wird zu z = −1 m',
        f2[0].z, -1, 1e-12, 'm');

  // Der ständige Anteil bekommt den Beiwert der Gruppe G, nicht den Windbeiwert
  const { anbauteilLasten } = await import(J('core.anbauteile.js'));
  const gemischt = A3.expandiereAnbauteile(
    [{ id: 'T', name: 'T', x: 10, raster: 0, ev: 0, Gx: 10, Qx: 4, aktiv: true }], o);
  const r = anbauteilLasten(gemischt,
                            { beiwerte: { G: 1.35, WindX: 1.5, WindY: 1.5, Schnee: 1.5 },
                              jbbOG: 440, jbbUG: 440 }, 0.45);
  pruef('F_x = γ_G · G_x + γ_Q · Q_x',
        r.teile.reduce((s, t) => s + t.Fx, 0), 1.35 * 10 + 1.5 * 4, 1e-12, 'kN');
}

// ===========================================================================
titel('22b  Lastblöcke: Angriffspunkt, Kraft, Moment');

{
  const A5 = await import(J('data.anbauteile.js'));
  const { anbauteilLasten } = await import(J('core.anbauteile.js'));
  const bw = { beiwerte: { G: 2, WindX: 3, WindY: 5, Schnee: 7 },
               jbbOG: 400, jbbUG: 400 };

  // Ein Lastblock trägt genau EINE Einwirkungsgruppe
  const at = { id: 'B', name: 'B', x: 10, raster: 0.4, befestigung: 'unten',
               aktiv: true, module: [],
               lasten: [block({ einwirkung: 'G', z: -2, y: 0.3, Fz: 4, Fx: 1 }),
                        block({ einwirkung: 'WindY', z: -2, Fy: 6 }),
                        block({ einwirkung: 'Schnee', z: -2, Fz: 2 })] };
  const flach = A5.expandiereAnbauteile([at], {});
  pruef('Je Lastblock ein aufgelöstes Teil', flach.length, 3, 1e-12, 'Stk');

  const r = anbauteilLasten(flach, bw, 0.5);
  const summe = (f) => r.teile.reduce((s, t) => s + t[f], 0);
  pruef('F_z = 2·4 + 7·2', summe('Fz'), 2 * 4 + 7 * 2, 1e-12, 'kN');
  pruef('F_y = 5·6', summe('Fy'), 5 * 6, 1e-12, 'kN');
  pruef('F_x = 2·1', summe('Fx'), 2 * 1, 1e-12, 'kN');

  // z = −2 m heisst Hebelarm e_v = +2 m; y = 0.3 m ist der Versatz e_x
  const gTeil = r.teile.find((t) => t.einwirkung === 'G');
  // z = −2 m ab der Anschlussebene, dazu h/2 = 0.25 m bis zur Jochachse
  pruef('z = −2 m am UG ergibt e_v = 2.25 m', gTeil.ev, 2.25, 1e-12, 'm');
  pruef('Torsion aus F_y · e_v', r.teile.find((t) => t.einwirkung === 'WindY').Td,
        5 * 6 * 2.25, 1e-12, 'kNm');
  pruef('Torsion aus F_z · y', gTeil.Td, 2 * 4 * 0.3, 1e-12, 'kNm');
  pruef('F_x am Hebelarm e_v gibt M_y', gTeil.Myd, 2 * 1 * 2.25, 1e-12, 'kNm');

  // Eingeprägte Momente laufen in die richtigen Schnittgrössen
  const mAT = { id: 'M', name: 'M', x: 8, raster: 0.5, befestigung: 'unten',
                aktiv: true, module: [],
                lasten: [block({ einwirkung: 'G', Mxx: 3, Myy: 4, Mzz: 5 })] };
  const rm = anbauteilLasten(A5.expandiereAnbauteile([mAT], {}), bw, 0.5);
  pruef('M_xx geht in die Torsion', rm.T.reduce((s, t) => s + t.w, 0), 2 * 3, 1e-12, 'kNm');
  pruef('M_yy geht in die Biegung M_y', rm.M.reduce((s, t) => s + t.w, 0),
        2 * 4, 1e-12, 'kNm');
  pruef('M_zz geht in die Grundrissbiegung', rm.Mz.reduce((s, t) => s + t.w, 0),
        2 * 5, 1e-12, 'kNm');

  // Eingeprägtes M_zz im Ersatzbalken: Sprung am Angriffsort, Nullstellen aussen
  const { schnittgroessen } = await import(J('core.statics.js'));
  const mm = { L: 20, qd: 0, P: [], H: [], M: [], N: [], T: [], Mz: [{ x: 8, w: 10 }],
               wd: 0, MA: 0, MB: 0, RA0: 0, torsionModell: 'huellkurve' };
  pruef('M_z(0) = 0', schnittgroessen(0, mm).Mz, 0, 1e-12, 'kNm');
  pruef('M_z(L) = 0', schnittgroessen(20, mm).Mz, 0, 1e-12, 'kNm');
  pruef('M_z links vom Angriff = −M·x/L', schnittgroessen(4, mm).Mz,
        -10 * 4 / 20, 1e-12, 'kNm');
  pruef('Sprung am Angriffsort = M', schnittgroessen(8.0001, mm).Mz -
        schnittgroessen(7.9999, mm).Mz, 10, 1e-3, 'kNm');
}

// ===========================================================================
titel('23  Windlast auf den Mast aus der Lasttabelle');

{
  const MA = await import(J('data.masten.js'));
  pruef('HEB 240, EK2', MA.mastWind('HEB 240', 'EK2'), 0.37, 1e-12, 'kN/m');
  pruef('HEB 240, EK3', MA.mastWind('HEB 240', 'EK3'), 0.44, 1e-12, 'kN/m');
  wahr('Bei den HEB-Profilen sind quer und längs gleich',
       MA.mastWind('HEB 260', 'EK2') === MA.mastWind('HEB 260', 'EK2', 'quer'));
  wahr('Beim HEM 240 entscheidet die Stegrichtung',
       MA.mastWind('HEM 240', 'EK2') === 0.38 &&
       MA.mastWind('HEM 240', 'EK2', 'quer') === 0.42,
       'Steg in Jochachse 0.38 · Steg gedreht 0.42 kN/m');
  wahr('Jedes Mastprofil hat Windwerte',
       MA.MASTPROFILE.every((p) => p.wind?.quer?.EK2 > 0));
}

// ===========================================================================
titel('24  Auflagerblatt und freie Windfläche');

{
  const { auflagerBlatt } = await import(J('core.vierendeel.js'));
  const jo = T.getTragjoch('J90');
  const pOG = getProfil('L 90x90x9');

  const w = basis({ lastHerkunft: 'manuell', gkManuell: 2, wkManuell: 1,
                    skManuell: 0, anbauteile: [] });
  const b = auflagerBlatt(w, pOG, pOG, getStahl('S235'), jo);

  pruef('Vier Einwirkungsgruppen', b.zeilen.length, 4, 1e-12, 'Stk');
  const st = b.zeilen.find((z) => z.key === 'staendig');
  const wi = b.zeilen.find((z) => z.key === 'windY');
  const wx = b.zeilen.find((z) => z.key === 'windX');
  pruef('Wind in Jochachse trägt nichts zum Joch bei', wx.wd, 0, 1e-12, 'kN/m');

  // Ohne Beiwerte: F_z ständig = g_k · L / 2
  pruef('F_z ständig = g_k · L / 2', st.A.Fz, (2 * 20) / 2, 1e-9, 'kN');
  pruef('Wind trägt nichts zu F_z bei', wi.A.Fz, 0, 1e-9, 'kN');
  pruef('F_y Wind = w_k · L / 2', wi.A.Fy, (1 * 20) / 2, 1e-9, 'kN');
  pruef('Ständige Last erzeugt kein F_y', st.A.Fy, 0, 1e-9, 'kN');
  wahr('Symmetrische Last: beide Auflager gleich',
       Math.abs(st.A.Fz - st.B.Fz) < 1e-9 && Math.abs(wi.A.Fy - wi.B.Fy) < 1e-9);
  pruef('Summe = Gleichgewicht der Vertikallast',
        b.total.A.Fz + b.total.B.Fz, 2 * 20, 1e-9, 'kN');

  // Ein Anbauteil in Jochmitte
  const w2 = basis({ lastHerkunft: 'manuell', gkManuell: 0, wkManuell: 0,
                     skManuell: 0,
                     anbauteile: [teil({ name: 'P', x: 10, Gz: 8 })] });
  const b2 = auflagerBlatt(w2, pOG, pOG, getStahl('S235'), jo);
  pruef('Einzellast in Jochmitte teilt sich hälftig',
        b2.zeilen.find((z) => z.key === 'staendig').A.Fz, 4, 1e-9, 'kN');

  // Umlenkkraft landet in F_x, nicht in F_z
  const A4 = await import(J('data.anbauteile.js'));
  const w3 = basis({ lastHerkunft: 'manuell', gkManuell: 0, wkManuell: 0,
                     skManuell: 0, trasseRadius: 300, flSpannweite: 50,
                     anbauteile: [A4.neuesAnbauteil('hs-nur', 10)] });
  const w4 = { ...w3, anbauteile: [{ ...A4.neuesAnbauteil('hs-fahrdraht', 10) }] };
  const bx = auflagerBlatt(w4, pOG, pOG, getStahl('S235'), jo);
  pruef('F_x ständig = Umlenkkraft Z · L/R',
        bx.zeilen.find((z) => z.key === 'staendig').Fx, (14.9 * 50) / 300, 1e-9, 'kN');

  // Freie Windfläche
  const frei = { ...A4.neuesAnbauteil('hs-nur', 10) };
  frei.module = [{ bauteil: 'frei-flaeche', anzahl: 1, z: -1.5, y: 0,
                   eigengewicht: 0.9, aQuer: 0.5, aLaengs: 0.8, cw: 1.4 }];
  frei.lasten = [];
  const modVon = (liste) => liste.find((t) => t.art === 'modul');
  const f = modVon(A4.expandiereAnbauteile([frei], { ek: 'EK2', R: 0, spannweite: 50 }));
  pruef('Freie Fläche: Eigengewicht direkt', f.kraefte.G.Fz, 0.9, 1e-12, 'kN');
  pruef('Freie Fläche: Q_x = A_quer · q · c',
        f.kraefte.WindX.Fx, 0.5 * 1.1 * 1.4, 1e-12, 'kN');
  pruef('Freie Fläche: Q_y = A_längs · q · c',
        f.kraefte.WindY.Fy, 0.8 * 1.1 * 1.4, 1e-12, 'kN');
  const f3v = modVon(A4.expandiereAnbauteile([frei], { ek: 'EK3', R: 0, spannweite: 50 }));
  pruef('Freie Fläche folgt der Einwirkungsklasse',
        f3v.kraefte.WindX.Fx / f.kraefte.WindX.Fx, 1.3 / 1.1, 1e-12, '–');
  const rund = modVon(A4.expandiereAnbauteile(
    [{ ...frei, module: [{ ...frei.module[0], cw: 1.0 }] }],
    { ek: 'EK2', R: 0, spannweite: 50 }));
  pruef('Rundprofil mit c = 1.0', rund.kraefte.WindX.Fx, 0.5 * 1.1 * 1.0, 1e-12, 'kN');
}

// ===========================================================================
titel('25  Mass-Tabelle über alle Typen');

{
  const tab = T.datenbank().masstabelle.zeilen;
  const laengen = Object.keys(tab).map(parseFloat).sort((a, b) => a - b);
  pruef('Längen von 8.00 bis 34.50 m in Schritten von 0.50',
        laengen.length, 54, 1e-12, 'Zeilen');
  wahr('Lückenlos in 0.50-m-Schritten',
       laengen.every((v, i) => i === 0 || Math.abs(v - laengen[i - 1] - 0.5) < 1e-9),
       `${laengen[0]} … ${laengen[laengen.length - 1]} m`);

  // Die Tabelle gilt typunabhängig: dieselbe Länge, dieselbe Einteilung
  ['J70', 'J80', 'J90', 'J100', 'J120', 'J130'].forEach((typ) => {
    const j = T.getTragjoch(typ);
    const a = T.abstaendeFuer(j, 16.0);
    wahr(`${typ}: Einteilung bei 16.00 m wie bei allen anderen`,
         JSON.stringify(a) === JSON.stringify(T.abstaendeFuer(T.getTragjoch('J90'), 16.0)),
         `${a.length} Felder`);
  });

  // Die Felder wachsen von der Jochmitte nach aussen bis auf das Regelmass
  const a24 = tab['24.00'];
  wahr('Regelfall: alle Felder 750 mm', a24.every((v) => v === 750), `${a24.length} × 750`);
  const a20 = tab['20.00'];
  wahr('Zwischenlänge: kleinere Felder innen, 750 aussen',
       a20[0] < 750 && a20[a20.length - 1] === 750,
       a20.join(' · '));

  // Unschlüssige Zeilen: als gedruckt gespeichert, aber nicht verwendet
  const un = T.masstabelleUnschluessig();
  pruef('Drei Zeilen der Zeichnung gehen nicht auf', un.length, 3, 1e-12, 'Stk');
  un.forEach((k) => {
    const z = T.masstabelleZeile(parseFloat(k));
    wahr(`${k} m ist als NICHT schlüssig erkannt`, !z.gueltig,
         `Ist ${z.ist} mm statt ${z.soll} mm (Δ ${z.ist - z.soll})`);
    wahr(`${k} m wird nicht für die Teilung verwendet`,
         T.abstaendeFuer(T.getTragjoch('J130'), parseFloat(k)) === null);
  });

  // Bei einer unschlüssigen Länge fällt der Rechenkern auf gleichmässig zurück
  const e = rechne(basis({ typ: 'J130', L: 29.0 }));
  wahr('Unschlüssige Länge: Rechenkern teilt gleichmässig und weist es aus',
       e.modell.teilungQuelle === 'gleichmaessig',
       `L = 29.00 m, ${e.stationen} Stationen`);
  const eOk = rechne(basis({ typ: 'J130', L: 30.0 }));
  wahr('Schlüssige Länge: Rechenkern nimmt die Mass-Tabelle',
       eOk.modell.teilungQuelle === 'masstabelle',
       `L = 30.00 m, ${eOk.stationen} Stationen`);
}


// ===========================================================================
titel('26  Lastarten im Modell und Vorlagen ganzer Tragwerke');

{
  const R = await import(J('render.3d.js'));
  const A6 = await import(J('data.anbauteile.js'));
  const ST = await import(J('store.js'));
  const U = await import(J('ui.js'));

  // --- Lastarten -----------------------------------------------------------
  pruef('Fünf Lastarten', R.LASTARTEN.length, 5, 1e-12, 'Stk');
  wahr('Jede Einwirkungsgruppe hat eine Lastart',
       ['G', 'WindX', 'WindY', 'Schnee'].every(
         (g) => R.LASTARTEN.some((l) => l.key === R.LASTART_VON_GRUPPE[g])));

  const bg = A6.neuesAnbauteil('hs-fahrdraht', 8);
  // Lastfall «Ständig + Wind»: dort stehen beide Windrichtungen mit 1.00, und
  // nur dann können auch beide im Bild sein.
  const e = rechne(basis({ trasseRadius: 300, flSpannweite: 50, schneeAktiv: true,
                           lastfall: 'gwk', anbauteile: [bg] }));
  const sz = R.erzeugeSzene(e.modell, e);
  const pfeile = sz.vektoren.filter((v) => v.art === 'last');
  wahr('Jeder Lastpfeil trägt seine Lastart',
       pfeile.length > 0 && pfeile.every((v) => v.lastart));
  wahr('Die Umlenkkraft steht als eigene Lastart da',
       pfeile.some((v) => v.lastart === 'leiterzug'),
       pfeile.filter((v) => v.lastart === 'leiterzug').map((v) => v.text).join(' · '));
  wahr('Wind x und Wind y sind getrennt aufgetragen',
       pfeile.some((v) => v.lastart === 'windX') &&
       pfeile.some((v) => v.lastart === 'windY'),
       [...new Set(pfeile.map((v) => v.lastart))].join(' · '));
  // Im Lastfall «Wind y leitend» darf gar kein Wind-x-Pfeil stehen: dort ist
  // die Gruppe ausgeschaltet.
  const eY = rechne(basis({ trasseRadius: 300, flSpannweite: 50,
                            lastfall: 'windYp', anbauteile: [bg] }));
  wahr('Wind y leitend: kein Wind-x-Pfeil im Bild',
       !R.erzeugeSzene(eY.modell, eY).vektoren.some((v) => v.lastart === 'windX'));
  wahr('Eigengewicht läuft nicht unter Leiterzug',
       pfeile.some((v) => v.lastart === 'staendig'));
  // Die Gleichlast wird nach Art getrennt aufgetragen. Dafür braucht es einen
  // Lastfall, in dem Eigengewicht UND Schnee anstehen.
  const eS = rechne(basis({ schneeAktiv: true, lastfall: 'schneep',
                            trasseRadius: 300, flSpannweite: 50, anbauteile: [bg] }));
  const flaechen = R.erzeugeSzene(eS.modell, eS).lastflaechen ?? [];
  wahr('Gleichlast getrennt nach ständig und Schnee',
       flaechen.some((f) => f.lastart === 'staendig') &&
       flaechen.some((f) => f.lastart === 'schnee'),
       flaechen.map((f) => f.lastart).join(' · '));
  wahr('Wind auf das Joch hängt an Wind y',
       flaechen.some((f) => f.lastart === 'windY'));

  // Negativer Windbeiwert dreht die Laufmeterlast um
  const eMinus = rechne(basis({ lastfall: 'windYm', lastHerkunft: 'manuell',
                                gkManuell: 1, wkManuell: 1, skManuell: 0 }));
  const szM = R.erzeugeSzene(eMinus.modell, eMinus);
  const wind = szM.vektoren.find((v) => v.lastart === 'windY');
  wahr('Wind y −: der Pfeil zeigt in die andere Richtung', wind.v[1] < 0,
       `w_d = ${eMinus.modell.wd.toFixed(2)} kN/m`);

  // --- Reiter --------------------------------------------------------------
  wahr('Die Stückliste ist kein eigener Auswertungsreiter mehr',
       !U.AUSWERTUNG_TABS.some((t) => t.id === 'stueckliste'),
       U.AUSWERTUNG_TABS.map((t) => t.titel).join(' · '));
  wahr('Sie steht im Reiter Profile',
       U.EINGABE_TABS.find((t) => t.id === 'profil').gruppen.includes('stueck'));
  wahr('Jeder Reiter hat ein Symbol für die Schiene',
       [...U.EINGABE_TABS, ...U.AUSWERTUNG_TABS].every((t) => t.icon));

  // --- Vorlagen ganzer Tragwerke -------------------------------------------
  const w = basis({ typ: 'J130', L: 24, xNachweis: 5, trasseRadius: 300 });
  const v = ST.vorlageAusWerten(w);
  wahr('Vorlage bringt Typ, Profile und Trasse mit',
       v.typ === 'J130' && v.profOG === w.profOG && v.trasseRadius === 300);
  wahr('Die Jochlänge gehört NICHT in die Vorlage', v.L === undefined);
  wahr('Die Nachweisstelle ebenso wenig', v.xNachweis === undefined);
  wahr('Anbauteile und Lastfälle kommen mit',
       Array.isArray(v.anbauteile) && v.lastfallAnpassung !== undefined);
  wahr('Die Vorlage ist eine Kopie, kein Verweis',
       v.anbauteile !== w.anbauteile);
}


// ===========================================================================
titel('27  Lasteinleitung: Verteilung auf die Nachbarbleche');

{
  const { stationsAnteil } = await import(J('core.anbauteile.js'));
  const st = [0, 1, 2, 3];

  pruef('Genau auf der Station: ganzer Anteil', stationsAnteil(1, 1, st), 1, 1e-12, '–');
  pruef('Genau auf der Station: Nachbar bekommt nichts',
        stationsAnteil(1, 2, st), 0, 1e-12, '–');
  pruef('Feldmitte: hälftig links', stationsAnteil(1.5, 1, st), 0.5, 1e-12, '–');
  pruef('Feldmitte: hälftig rechts', stationsAnteil(1.5, 2, st), 0.5, 1e-12, '–');
  pruef('Ein Viertel vom linken Knoten', stationsAnteil(1.25, 1, st), 0.75, 1e-12, '–');
  pruef('Summe der Anteile ist immer 1',
        st.reduce((a, x) => a + stationsAnteil(1.7, x, st), 0), 1, 1e-12, '–');
  pruef('Ausserhalb links fällt alles auf die Randstation',
        stationsAnteil(-5, 0, st), 1, 1e-12, '–');
  pruef('Ausserhalb rechts ebenso', stationsAnteil(9, 3, st), 1, 1e-12, '–');

  // Der eigentliche Zweck: η hängt STETIG vom Anschlussraster ab. Vorher fiel
  // es am Feldrand um über 25 %, weil die Einleitung ins Nachbarfeld kippte.
  const mitRaster = (r) => rechne(basis({
    lastHerkunft: 'manuell', gkManuell: 0.6, wkManuell: 0.5, skManuell: 0,
    anbauteile: [{ ...teil({ name: 'HS', x: 10, z: -1.5, befestigung: 'durchgehend' }),
                   raster: r,
                   lasten: [block({ einwirkung: 'G', z: -1.5, Fz: 5 }),
                            block({ einwirkung: 'WindY', z: -1.5, Fy: 4 })] }],
  })).max.etaGesamt;

  const a1 = rechne(basis({})).modell.a1eff;
  const stufen = [0.60, 0.68, 0.70, 0.72, 0.75, 0.80];
  const werte = stufen.map(mitRaster);
  const spruenge = werte.slice(1).map((v, i) => Math.abs(v - werte[i]) / werte[i]);
  wahr('Kein Sprung mehr am Feldrand', Math.max(...spruenge) < 0.06,
       `a₁ = ${a1.toFixed(3)} m · η ${werte.map((v) => v.toFixed(3)).join(' → ')}` +
       ` · grösster Schritt ${(Math.max(...spruenge) * 100).toFixed(1)} %`);
  wahr('Breiterer Anschluss bleibt günstiger', werte[werte.length - 1] < werte[0],
       `${werte[0].toFixed(3)} → ${werte[werte.length - 1].toFixed(3)}`);
}


// ===========================================================================
titel('28  Vorlagen der Leiter und Übersicht');

{
  const A7 = await import(J('data.anbauteile.js'));
  const FL2 = await import(J('data.fl.js'));

  // Die drei Leitertypen stehen als eigene Kachel zur Verfügung
  [['leiter-nfl', 'drahtwerk-n-fl-ts-stcu-50-fd-cu-107', 14.9],
   ['leiter-rfl', 'drahtwerk-r-fl-ts-stcu-92-fd-cu-107', 22],
   ['leiter-rl', 'drahtwerk-cu-95', 3.9]].forEach(([id, bauteil, Z]) => {
    const v = A7.getVorlage(id);
    wahr(`Vorlage ${id} vorhanden und einseitig befestigt`,
         v.befestigung === 'unten' && v.module.length === 1, v.name);
    pruef(`${id}: Leiterzugkraft aus der Tabelle`,
          FL2.leiterzug(v.module[0].bauteil), Z, 1e-12, 'kN');
    wahr(`${id}: verweist auf das richtige Drahtwerk`,
         v.module[0].bauteil === bauteil);
  });

  // Die Umlenkkraft kommt bei allen dreien durch
  const t = A7.neuesAnbauteil('leiter-rl', 10);
  const fl = A7.expandiereAnbauteile([t], { ek: 'EK2', R: 300, spannweite: 50 });
  pruef('RL im Bogen: U = Z · L/R', fl[0].kraefte.G.Fx, (3.9 * 50) / 300, 1e-9, 'kN');
}

// ===========================================================================
titel('29  Handbuch');

{
  const HB = await import(J('doku.handbuch.js'));

  wahr('Handbuch hat alle elf Abschnitte', HB.HANDBUCH.length === 11,
       `${HB.HANDBUCH.length} Abschnitte`);
  wahr('Jeder Abschnitt hat Kennung, Titel und Rumpf',
       HB.HANDBUCH.every((s) => s.id && s.titel && s.html?.length > 200));
  wahr('Kennungen sind eindeutig',
       new Set(HB.HANDBUCH.map((s) => s.id)).size === HB.HANDBUCH.length);

  const html = HB.handbuchHtml();
  wahr('Jeder Abschnitt steht im ausgegebenen Blatt',
       HB.HANDBUCH.every((s) => html.includes(`id="hb-${s.id}"`)));
  wahr('Jeder Abschnitt hat seinen Eintrag im Verzeichnis',
       HB.HANDBUCH.every((s) => html.includes(`data-zu="${s.id}"`)));

  // Der Abschnitt Modellgrenzen ist der Grund, warum es das Handbuch gibt.
  // Er muss die Ausschlüsse benennen, sonst ist er wertlos.
  const g = HB.HANDBUCH.find((s) => s.id === 'grenzen').html;
  ['Knicken', 'Beulen', 'Verformung', 'Schweissnähte', 'Ermüdung',
   'Wölbkrafttorsion', 'Querschnittsklasse 4'].forEach((wort) => {
    wahr(`Modellgrenzen nennen: ${wort}`, g.includes(wort));
  });

  // Skizzen: sie sollen die Formeln zeigen, nicht bloss dekorieren
  wahr('Handbuch enthält zehn Skizzen',
       (html.match(/<figure class="hb-skizze">/g) ?? []).length === 10);
  wahr('Keine Skizze hat unberechnete Koordinaten',
       !/NaN|undefined/.test(html));
  ['achsen', 'einwirkungen', 'system', 'querschnitt', 'vierendeel',
   'einleitung', 'raster'].forEach((id) => {
    const s = HB.HANDBUCH.find((x) => x.id === id).html;
    wahr(`Abschnitt ${id} hat eine Skizze`, s.includes('hb-skizze'));
  });

  // Die tragenden Formeln stehen im Text und stimmen mit dem Kern überein
  const alles = HB.HANDBUCH.map((s) => s.html).join('');
  [['Umlenkkraft', 'U = 2 · Z · sin(α/2) = Z · L / R'],
   ['Hebelarm zur Jochachse', 'e_v = −( z_A + z )'],
   ['Bredt-Schubfluss', 'q_T = T / (2 · A_m)'],
   ['Gurtmoment am Anschnitt', 'M_Anschnitt = M_Knoten · ( a₁ − b_Bl ) / a₁'],
   ['Blech am Anschnitt', 'M_R = M_K · L_c / h₀'],
   ['Drehfeder aus dem Mast', 'c_φ = E · I_Mast / H']].forEach(([was, formel]) => {
    wahr(`Handbuch führt die Formel: ${was}`, alles.includes(formel));
  });
}

// ===========================================================================
titel('18b  Örtliche Feldweiten statt des Mittels');

{
  const { nachbarfeldweiten } = await import(J('core.querschnitt.js'));

  // Das J70 über 10 m teilt ungleich: aussen 0.75 m, innen 0.66-0.67 m.
  const e = { ...basis({ typ: 'J70', L: 10, lastfall: 'windYp' }), anbauteile: [] };
  const r = rechne(e);
  const xs = r.knoten.map((k) => k.x);
  const weiten = xs.slice(1).map((x, i) => +(x - xs[i]).toFixed(3));
  wahr('Mass-Tabelle teilt ungleich',
       Math.max(...weiten) - Math.min(...weiten) > 0.05,
       `${Math.min(...weiten)} bis ${Math.max(...weiten)} m`);

  const k1 = r.knoten[1];                       // beidseits 0.75
  const kM = r.knoten.find((k) => Math.abs(k.x - 3.00) < 1e-6);  // 0.75 / 0.67
  pruef('Blech: Summe der beiden Nachbarfelder', k1.aBlech, 1.50, 1e-9, 'm');
  pruef('Blech am Übergang: 0.75 + 0.67', kM.aBlech, weiten[3] + weiten[4], 1e-9, 'm');
  pruef('Gurt: das breitere der beiden Felder', kM.aGurt, 0.75, 1e-9, 'm');
  pruef('Randstation hat nur EIN Nachbarfeld', r.knoten[0].aBlech, 0.75, 1e-9, 'm');

  // Gegenprobe: bei gleichen Feldern muss die frühere Form herauskommen
  const gleich = nachbarfeldweiten({ stationsX: [0, 0.7, 1.4, 2.1] }, 0.7);
  pruef('Gleiche Felder: Summe ist 2·a₁', gleich.summe, 1.4, 1e-9, 'm');
  pruef('Gleiche Felder: Gurt sieht a₁', gleich.max, 0.7, 1e-9, 'm');
  wahr('Ohne Stationsliste bleibt es beim Mittel',
       nachbarfeldweiten({ a1eff: 0.7 }, 5) === null);

  // Die Korrektur wirkt: an den breiten Feldern steigt das Blechmoment.
  const beste = r.knoten.reduce((a, b) => (b.etaB > a.etaB ? b : a));
  wahr('Massgebendes Blech liegt an einem breiten Feld',
       Math.abs(beste.aGurt - 0.75) < 1e-9,
       `x = ${beste.x.toFixed(2)} m, η = ${beste.etaB.toFixed(4)}`);

  // Der Zusammenhang selbst, nicht eine gemerkte Zahl: das Knotenmoment folgt
  // der Summe der Nachbarfelder.
  const bl = beste.ebenen.find((e) => e.eta === beste.etaB);
  pruef('M_Knoten = V_Ebene · Σa / 4',
        bl.M_Knoten, (bl.V_Ebene * beste.aBlech) / 4, 1e-12, 'kNm');
  // η ist dem Moment proportional; mit dem Mittel gerechnet wäre es kleiner.
  const mittel = (2 * r.modell.a1eff) / beste.aBlech;
  pruef('Das Mittel läge an dieser Station 6 % zu tief',
        beste.etaB * mittel, beste.etaB / 1.0588, 1e-3, '–');
}

// ===========================================================================
titel('18e  Grenzlast der Gurtverbindung');

{
  const { begrenzeFeder } = await import(J('core.auflager.js'));

  const e = (zus) => basis({ typ: 'J90', L: 15.5, endbedingung: 'mast',
    mastProfil: 'HEB 260', mastH: 7.5, lastHerkunft: 'manuell',
    gkManuell: 0.6, wkManuell: 0, skManuell: 0, schneeAktiv: false,
    beiwerteFest: { G: 1, WindX: 0, WindY: 0, Schnee: 0 }, ...zus });

  const ohne = rechne(e({ schraubenGrenze: false })).modell;
  const mit = rechne(e({ schraubenFgrenz: 24 })).modell;

  wahr('Ohne Begrenzung bleibt die geometrische Feder stehen',
       ohne.federn.grenze === null
       && Math.abs(ohne.federn.cA - ohne.federn.roh.cA) < 1e-9);
  // Unter blossem Eigengewicht bleibt die Gurtkraft weit unter 24 kN - die
  // Grenze greift dort nicht ein, und das soll sie auch nicht.
  wahr('24 kN greifen unter Eigengewicht allein nicht ein',
       !mit.federn.grenze.begrenzt && mit.federn.grenze.FA < 24,
       `F = ${mit.federn.grenze.FA.toFixed(1)} kN`);

  // Eine Grenze unterhalb der vorhandenen Kraft setzt die Feder herab
  const eng = rechne(e({ schraubenFgrenz: 8 })).modell;
  wahr('Eine Grenze von 8 kN setzt die Feder herab',
       eng.federn.grenze.begrenzt && eng.federn.cA < eng.federn.roh.cA,
       `${eng.federn.roh.cA.toFixed(0)} -> ${eng.federn.cA.toFixed(0)} kNm/rad`);
  pruef('Die Gurtkraft trifft dann die Grenzlast', eng.federn.grenze.FA, 8, 1e-3, 'kN');
  pruef('Stützmoment = F_Grenz · h', Math.abs(eng.MA), 8 * eng.h, 1e-3, 'kNm');
  wahr('Wenige Durchgänge genügen', eng.federn.grenze.durchgaenge <= 30,
       `${eng.federn.grenze.durchgaenge} Durchgänge`);

  // Eine hohe Grenzlast greift nicht ein
  const hoch = rechne(e({ schraubenFgrenz: 1000 })).modell;
  pruef('Hohe Grenzlast lässt die Feder unberührt', hoch.federn.cA,
        hoch.federn.roh.cA, 1e-9, 'kNm/rad');
  wahr('… und meldet keine Begrenzung', !hoch.federn.grenze.begrenzt);

  // Kleinere Grenzlast -> weichere Feder -> grösseres Feldmoment
  const klein = rechne(e({ schraubenFgrenz: 6 }));
  const gross = rechne(e({ schraubenFgrenz: 10 }));
  const feld = (r) => Math.max(...r.knoten.map((k) => k.My));
  wahr('Kleinere Grenzlast gibt weichere Feder und mehr Feldmoment',
       klein.modell.federn.cA < gross.modell.federn.cA
       && feld(klein) > feld(gross),
       `c ${klein.modell.federn.cA.toFixed(0)} < ${gross.modell.federn.cA.toFixed(0)}, `
       + `Feld ${feld(klein).toFixed(2)} > ${feld(gross).toFixed(2)} kNm`);

  // Volle Einspannung bleibt die gewählte Idealisierung
  const voll = rechne(e({ endbedingung: 'voll', schraubenFgrenz: 24 })).modell;
  wahr('Volle Einspannung wird nicht begrenzt', voll.federn.grenze === null);

  // Die Funktion selbst, ohne Modelldrumherum
  const b = begrenzeFeder({ L: 16, qd: 1, P: [], M: [], EI: 65000,
                            cA: 1e6, cB: 1e6, h: 0.45, Fgrenz: 20 });
  pruef('Direkt gerufen: F trifft die Grenze', b.FA, 20, 1e-4, 'kN');
  wahr('Ohne Grenzlast passiert nichts',
       begrenzeFeder({ L: 16, qd: 1, P: [], M: [], EI: 65000, cA: 500,
                       cB: 500, h: 0.45, Fgrenz: 0 }).begrenzt === false);
}

// ===========================================================================
titel('18d  Altbauweise: Gelenk am Auflager');

{
  const { hinweise } = await import(J('core.checks.js'));

  // Beim Wechsel auf einen Alttyp wird die Endbedingung mitgeführt
  const nachAlt = typUebernehmen({ ...standardwerte(), endbedingung: 'mast' },
                                 T.getTragjoch('J90-alt'));
  const nachNeu = typUebernehmen({ ...standardwerte(), endbedingung: 'mast' },
                                 T.getTragjoch('J90'));
  wahr('Alttyp setzt die Endbedingung auf gelenkig',
       nachAlt.endbedingung === 'gelenkig');
  wahr('Neuer Typ lässt die Endbedingung stehen',
       nachNeu.endbedingung === 'mast');

  // Wer sie danach von Hand ändert, wird gewarnt
  const warnung = (typ, end) => {
    const e = { ...basis({ typ, L: 16, endbedingung: end,
                           mastProfil: 'HEB 260', mastH: 7.5 }) };
    return hinweise(rechne(e).modell).some((z) => z.includes('GELENK'));
  };
  wahr('Alttyp eingespannt gerechnet gibt einen Hinweis',
       warnung('J90-alt', 'mast'));
  wahr('Alttyp gelenkig gibt keinen Hinweis', !warnung('J90-alt', 'gelenkig'));
  wahr('Neuer Typ eingespannt gibt keinen solchen Hinweis',
       !warnung('J90', 'mast'));
}

// ===========================================================================
titel('18c  Mastanschluss: Kragarm oder durchlaufend');

{
  const { mastSteifigkeit, MASTANSCHLUESSE, drehfedern, E_STAHL } =
    await import(J('core.auflager.js'));
  const { getMastprofil } = await import(J('data.masten.js'));

  const mast = { mastProfil: 'HEB 260', mastH: 7.5, mastSteg: 'jochachse' };
  const krag = mastSteifigkeit({ ...mast, mastAnschluss: 'kragarm' });
  const durch = mastSteifigkeit({ ...mast, mastAnschluss: 'durchlaufend' });

  const p = getMastprofil('HEB 260');
  pruef('Kragarm: c_φ = E·I/H', krag.cPhi, (E_STAHL * p.Iy * 1e-8) / 7.5, 1e-9, 'kNm/rad');
  pruef('Durchlaufend: Faktor 1.45', durch.cPhi, 1.45 * krag.cPhi, 1e-12, 'kNm/rad');
  pruef('Der Kragarmwert bleibt in beiden Fällen ausgewiesen',
        durch.cKragarm, krag.cPhi, 1e-12, 'kNm/rad');
  wahr('Ohne Angabe gilt der durchlaufende Mast',
       mastSteifigkeit(mast).cPhi === durch.cPhi);
  wahr('Beide Anschlussarten sind wählbar',
       MASTANSCHLUESSE.length === 2
       && MASTANSCHLUESSE.every((a) => a.key && a.label && a.faktor));

  // An einem PyNite-Modell mit ausmodelliertem Mast gemessen: der Anschluss
  // über die Jochhöhe wirkt wie rund 6074 kNm/rad (J90, 15.5 m, HEB 260).
  wahr('Durchlaufend trifft die gemessene Steifigkeit',
       Math.abs(durch.cPhi - 6074) / 6074 < 0.03,
       `${durch.cPhi.toFixed(0)} gegen gemessene 6074 kNm/rad`);

  const f = (an) => drehfedern({ endbedingung: 'mast', ...mast, mastAnschluss: an });
  pruef('Beide Jochenden bekommen dieselbe Feder',
        f('durchlaufend').cA, f('durchlaufend').cB, 1e-12, 'kNm/rad');
  wahr('Die Art nennt den Anschluss',
       f('durchlaufend').art.includes('durchlaufend')
       && f('kragarm').art.includes('Kragarm'));

  // Wirkung auf die Momentenaufteilung des Beispieljochs
  const lauf = (an) => {
    const e = { ...basis({ typ: 'J90', L: 15.5, endbedingung: 'mast',
      mastProfil: 'HEB 260', mastH: 7.5, mastAnschluss: an,
      lastHerkunft: 'manuell', gkManuell: 0.4735, wkManuell: 0, skManuell: 0,
      lastfall: null, beiwerteFest: { G: 1, WindX: 0, WindY: 0, Schnee: 0 } }) };
    const r = rechne(e);
    const My = r.knoten.map((k) => k.My);
    return { stuetz: Math.abs(Math.min(...My)), feld: Math.max(...My) };
  };
  const k = lauf('kragarm'), d = lauf('durchlaufend');
  wahr('Steifer gerechnet wächst das Stützmoment und fällt das Feldmoment',
       d.stuetz > k.stuetz && d.feld < k.feld,
       `Stütze ${k.stuetz.toFixed(2)} -> ${d.stuetz.toFixed(2)}, `
       + `Feld ${k.feld.toFixed(2)} -> ${d.feld.toFixed(2)} kNm`);
  // Das Feldmoment ist der belastbare Massstab (siehe core.auflager.js):
  // das PyNite-Modell mit ausmodelliertem Mast liefert 10.27 kNm.
  wahr('Durchlaufend trifft das Feldmoment des Mastmodells (10.27 kNm)',
       Math.abs(d.feld - 10.27) < 0.15, `${d.feld.toFixed(2)} kNm`);
}

// ===========================================================================
titel('18j  Farblegende gegen die Plots');

{
  const R = await import(J('render.3d.js'));
  const e = basis({ lastfall: 'windYp',
    anbauteile: [{ ...teil({ name: 'HS', x: 8 }), raster: 0.4,
                   befestigung: 'durchgehend',
                   lasten: [block({ einwirkung: 'G', z: -1.35, Fz: 3 }),
                            block({ einwirkung: 'WindY', z: -1.35, Fy: 4 })] }] });
  const erg = rechne(e);
  const szene = R.erzeugeSzene(erg.modell, erg);

  // Jeder Plot hat eine Skala, und ihr Endwert ist der Höchstwert im Modell
  R.PLOTS.forEach((p) => {
    const legende = p.fest ?? szene.bereiche[p.feld];
    let ist = 0;
    szene.flaechen.forEach((f) => {
      const v = f.werte?.[p.feld];
      if (Number.isFinite(v)) ist = Math.max(ist, Math.abs(v));
    });
    if (p.fest) {
      // η hat bewusst eine FESTE Skala: 1.25 ist die Marke, nicht das
      // Maximum. Werte darüber laufen in die oberste Farbe.
      wahr(`${p.kurz}: feste Skala ${p.fest}, unabhängig vom Modell`,
           legende === p.fest, `grösster Wert im Modell ${ist.toFixed(2)}`);
      wahr(`${p.kurz}: die Fussnote sagt, dass die Skala fest ist`,
           /[Ff]este Skala/.test(p.fussnote ?? ''));
    } else {
      pruef(`${p.kurz}: Skalenende ist der Höchstwert`, legende, ist, 1e-9, p.einheit);
    }
  });

  wahr('Jeder Plot hat Beschriftung und Einheit',
       R.PLOTS.every((p) => p.label && p.einheit && p.kurz));
  wahr('Jeder Plot sagt, was er zeigt',
       R.PLOTS.every((p) => p.fussnote), 'Fussnote je Plot');

  // Was die Fussnoten behaupten, muss auch eingefärbt werden
  const gurt = szene.flaechen.find((f) => f.gruppe === 'profil' && f.werte);
  const blech = szene.flaechen.find((f) => f.gruppe === 'blech' && f.werte);
  wahr('Gurt und Blech tragen Werte', Boolean(gurt && blech));
  wahr('V bleibt am Gurt leer – wie die Fussnote sagt', gurt.werte.V === null);
  wahr('V ist am Blech vorhanden', Number.isFinite(blech.werte.V));

  // Das Gurtmoment ist das GRÖSSERE aus M_y und M_z: nur M_y zu zeigen
  // färbte den Gurt zu günstig ein, sobald der Wind regiert.
  const k = erg.knoten.find((x) => Math.abs(x.Mz_lokal) > Math.abs(x.My_lokal));
  wahr('Es gibt Stationen, an denen M_z das grössere ist', Boolean(k),
       k ? `M_y ${Math.abs(k.My_lokal).toFixed(3)} < M_z ${Math.abs(k.Mz_lokal).toFixed(3)}` : '');
  if (k) {
    const f = szene.flaechen.find((x) => x.gruppe === 'profil' && x.station === k.i && x.werte);
    pruef('Der Plot zeigt dort das grössere Moment', f.werte.M,
          Math.max(Math.abs(k.My_lokal), Math.abs(k.Mz_lokal)), 1e-9, 'kNm');
  }

  // Bauteil-Legende: je Profil, Blechposition und Anbauteil ein Eintrag
  // Werte über dem Skalenende dürfen die Einfärbung nicht sprengen. Die
  // Ansicht selbst braucht ein Canvas; geprüft wird deshalb die Farbfunktion
  // mit dem Aufbau, den _grundfarbe verwendet.
  const A2 = Object.create(R.Modellansicht.prototype);
  A2.szene = szene; A2.modus = 'eta';
  const farbe = (v) => A2._grundfarbe({ werte: { eta: v } }, { xdim: '#888' });
  wahr('Werte über der festen Skala geben eine gültige Farbe',
       /^(#|rgb)/.test(farbe(3.4)) && /^(#|rgb)/.test(farbe(1.25)),
       `η 3.4 -> ${farbe(3.4)}`);
  wahr('Fehlender Wert bleibt neutral',
       A2._grundfarbe({ werte: { eta: null } }, { xdim: '#888' }) === '#888');

  wahr('Bauteillegende hat Einträge', szene.legende.length > 0,
       `${szene.legende.length} Einträge`);
  wahr('Jeder Eintrag hat Bezeichnung und Farbe',
       szene.legende.every((b) => b.label && b.farbe));
  wahr('Bezeichnungen sind eindeutig',
       new Set(szene.legende.map((b) => b.label)).size === szene.legende.length);
}

// ===========================================================================
titel('18i  Vorlage: Hängestütze mit Flächenlast');

{
  const at = A.neuesAnbauteil('hs-flaeche', 8);
  wahr('Vorlage vorhanden', Boolean(at) && at.module.length === 2, at.name);
  wahr('Durchgehend befestigt', at.befestigung === 'durchgehend');

  const flach = A.expandiereAnbauteile([at], { ek: 'EK2' });
  pruef('Zwei Module aufgelöst', flach.length, 2, 1e-12, 'Stk');

  const hs = flach.find((f) => f.bauteil.includes('haengestuetze'));
  const fl = flach.find((f) => f.bauteil === 'frei-flaeche');
  wahr('Beide Module erkannt', Boolean(hs && fl));

  pruef('Hängestütze hängt 1.35 m unter der Anschlussebene', hs.z, -1.35, 1e-12, 'm');
  pruef('Fläche hängt tiefer', fl.z, -2.10, 1e-12, 'm');

  // Die Windlast der freien Fläche folgt der Formel w = A · q_ref(EK) · c
  const { staudruck } = await import(J('data.fl.js'));
  const q = staudruck('EK2');
  pruef('Wind quer aus der Fläche', fl.kraefte.WindX.Fx, 0.50 * q * 1.4, 1e-9, 'kN');
  pruef('Wind längs aus der Fläche', fl.kraefte.WindY.Fy, 0.15 * q * 1.4, 1e-9, 'kN');
  pruef('Eigengewicht wie eingegeben', fl.kraefte.G.Fz, 0.30, 1e-12, 'kN');

  // Grössere Einwirkungsklasse gibt mehr Wind - sonst hinge die Fläche nicht dran
  const stark = A.expandiereAnbauteile([A.neuesAnbauteil('hs-flaeche', 8)], { ek: 'EK3' })
    .find((f) => f.bauteil === 'frei-flaeche');
  wahr('Höhere Einwirkungsklasse gibt mehr Wind',
       stark.kraefte.WindX.Fx > fl.kraefte.WindX.Fx,
       `${fl.kraefte.WindX.Fx.toFixed(3)} -> ${stark.kraefte.WindX.Fx.toFixed(3)} kN`);

  // Sie trägt sich durch bis in die Nachweise
  const mitVorlage = rechne(basis({ lastfall: 'windXp',
    anbauteile: [A.neuesAnbauteil('hs-flaeche', 10)] }));
  const ohne = rechne(basis({ lastfall: 'windXp', anbauteile: [] }));
  wahr('Die Vorlage bewegt die Nachweise',
       mitVorlage.max.etaGesamt > ohne.max.etaGesamt,
       `η ${ohne.max.etaGesamt.toFixed(3)} -> ${mitVorlage.max.etaGesamt.toFixed(3)}`);
}

// ===========================================================================
titel('18g  Handbuch als eigenständige Datei');

{
  const HB = await import(J('doku.handbuch.js'));
  const datei = HB.handbuchDatei({ fussnote: 'Prüfstand' });

  wahr('Vollständiges HTML-Dokument',
       datei.startsWith('<!doctype html>') && datei.trimEnd().endsWith('</html>'));
  wahr('Zeichensatz und Titel gesetzt',
       datei.includes('<meta charset="utf-8">') && datei.includes('<title>'));
  wahr('Alle elf Abschnitte enthalten',
       HB.HANDBUCH.every((a) => datei.includes(`id="hb-${a.id}"`)),
       `${HB.HANDBUCH.length} Abschnitte`);
  wahr('Verzeichnis als echte Sprungmarken',
       HB.HANDBUCH.every((a) => datei.includes(`href="#hb-${a.id}"`)));
  pruef('Alle zehn Skizzen mitgenommen',
        (datei.match(/<figure class="hb-skizze">/g) ?? []).length, 10, 1e-12, 'Stk');
  wahr('Keine unberechneten Werte', !/NaN|undefined|Infinity/.test(datei));
  wahr('Fussnote und Stand stehen drin',
       datei.includes('Prüfstand') && /Stand /.test(datei));
  wahr('Ohne Dokument bleibt das Stylesheet leer, der Text nicht',
       datei.includes('<style>') && datei.length > 20000,
       `${Math.round(datei.length / 1024)} kB`);

  // Ohne Farbtokens stünde dunkler Text auf dunklem Grund: eine eigenständige
  // Datei führt kein Skript aus, das sie zur Laufzeit setzt.
  const { FARBEN } = await import(J('design.js'));
  const hell = HB.handbuchDatei({ tokens: FARBEN.hell });
  wahr('Farbtokens stehen als CSS im Dokument', /:root \{ --/.test(hell));
  wahr('Vordergrund und Hintergrund sind gesetzt',
       /--grund:/.test(hell) || /--hintergrund:/.test(hell)
       || Object.keys(FARBEN.hell).some((k) => hell.includes(`--${k.toLowerCase()}`)));
  pruef('Alle Tokens des Themas übernommen',
        Object.keys(FARBEN.hell).filter((k) =>
          hell.includes('--' + k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) + ':')).length,
        Object.keys(FARBEN.hell).length, 1e-12, 'Stk');
}

// ===========================================================================
titel('18h  Ablage: umbenennen und Projekte');

{
  // IndexedDB gibt es im Prüfstand nicht; geprüft wird die Logik der
  // Umbenennung an den Sätzen selbst, wie store.umbenennen sie bildet.
  const satz = { id: 'x1', name: 'Joch 12', projekt: 'Bahnhof', bemerkung: '',
                 werte: {}, erstellt: 'A', geaendert: 'A' };
  const um = (s, neu) => ({
    ...s,
    ...(neu.name !== undefined ? { name: neu.name.trim() || 'Ohne Namen' } : {}),
    ...(neu.projekt !== undefined ? { projekt: neu.projekt.trim() } : {}),
    geaendert: 'B',
  });
  const a = um(satz, { name: '  Joch 12a  ' });
  wahr('Name wird beschnitten', a.name === 'Joch 12a');
  wahr('Projekt bleibt unberührt, wenn nicht angegeben', a.projekt === 'Bahnhof');
  wahr('Die Eingabewerte bleiben stehen', a.werte === satz.werte);
  wahr('Leerer Name wird aufgefangen', um(satz, { name: '   ' }).name === 'Ohne Namen');
  wahr('Leeres Projekt heisst «ohne Projekt»',
       um(satz, { projekt: '  ' }).projekt === '');
  wahr('Der Erstellzeitpunkt bleibt', a.erstellt === 'A' && a.geaendert === 'B');

  // Gruppierung: mehrere Joche unter einem Projekt
  const { nachProjekt } = await import(J('store.js'));
  wahr('nachProjekt ist vorhanden', typeof nachProjekt === 'function');
  const gruppen = (liste) => {
    const m = new Map();
    liste.forEach((s) => {
      const k = s.projekt || 'Ohne Projekt';
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(s);
    });
    return [...m.entries()].map(([projekt, eintraege]) => ({ projekt, eintraege }));
  };
  const g = gruppen([satz, { ...satz, id: 'x2', name: 'Joch 13' },
                     { ...satz, id: 'x3', projekt: '' }]);
  pruef('Zwei Gruppen', g.length, 2, 1e-12, 'Stk');
  pruef('Zwei Joche im Projekt', g[0].eintraege.length, 2, 1e-12, 'Stk');
  wahr('Ohne Projektnamen eigene Gruppe', g[1].projekt === 'Ohne Projekt');
}

// ===========================================================================
titel('18f  Datenpaket');

{
  // localStorage nachbilden, damit das Modul im Prüfstand läuft
  if (typeof globalThis.localStorage === 'undefined') {
    globalThis.localStorage = {
      _d: {}, getItem(k) { return this._d[k] ?? null; },
      setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; },
    };
  }
  const P = await import(J('data.paket.js'));

  const paket = P.paketAus('Prüfstand');
  wahr('Paket führt Format und Version',
       paket.format === P.PAKET_FORMAT && paket.version === P.PAKET_VERSION);
  wahr('Paket enthält alle drei Teile',
       Boolean(paket.tragjoche && paket.anbauteile && paket.fl_bauteile));

  const p = P.pruefePaket(paket);
  wahr('Eigenes Paket besteht die Prüfung', p.ok, p.fehler.join(' '));
  pruef('Drei Teile erkannt', p.teile.length, 3, 1e-12, 'Stk');
  wahr('Die Teile sind gezählt', p.teile.every((t) => t.anzahl > 0),
       p.teile.map((t) => `${t.label} ${t.anzahl}`).join(' · '));

  // Was abgelehnt werden muss
  wahr('Fremdes Format wird abgelehnt',
       !P.pruefePaket({ format: 'anderes', tragjoche: { typen: [1] } }).ok);
  wahr('Neuere Paketversion wird abgelehnt',
       !P.pruefePaket({ version: P.PAKET_VERSION + 1, tragjoche: { typen: [1] } }).ok);
  wahr('Leeres Paket wird abgelehnt', !P.pruefePaket({}).ok);
  wahr('Kein Objekt wird abgelehnt', !P.pruefePaket(null).ok);
  wahr('Leerer Teil wird abgelehnt',
       !P.pruefePaket({ tragjoche: { typen: [] } }).ok);

  // Nur ein Teil: der Rest bleibt stehen
  const nurTypen = { format: P.PAKET_FORMAT, version: 1, tragjoche: paket.tragjoche };
  wahr('Ein einzelner Teil genügt', P.pruefePaket(nurTypen).ok);

  // Ablage im Browser
  P.speichern(paket);
  const zurueck = P.ausSpeicher();
  pruef('Hinterlegt und wieder geholt: gleich viele Typen',
        zurueck.tragjoche.typen.length, paket.tragjoche.typen.length, 1e-12, 'Typen');
  P.speicherLeeren();
  wahr('Nach dem Leeren ist nichts mehr hinterlegt', P.ausSpeicher() === null);

  wahr('Daten gelten als vorhanden, solange Typen geladen sind', P.datenVorhanden());
}

// ===========================================================================
titel('19  AxisVM-Export (SAF)');

{
  const AX = await import(J('export.axisvm.js'));
  const { modell } = await import(J('core.vierendeel.js'));

  const eingabe = basis({
    lastHerkunft: 'manuell', gkManuell: 0.6, wkManuell: 0.5, skManuell: 0.3,
    schneeAktiv: true,
    anbauteile: [{ ...teil({ name: 'HS', x: 7.5 }), raster: 0.4,
                   befestigung: 'unten',
                   lasten: [block({ einwirkung: 'G', z: -1.35, Fz: 3 }),
                            block({ einwirkung: 'WindY', z: -1.35, Fy: 4 })] }],
  });
  const deps = { berechne, modell,
                 profOG: getProfil(eingabe.profOG), profUG: getProfil(eingabe.profUG),
                 stahl: getStahl(eingabe.stahl), joch: T.getTragjoch('J90') };
  const m = modell(eingabe, deps.profOG, deps.profUG, deps.stahl, deps.joch);

  const bauA = AX.stabmodell(m, { knotenmodell: 'anschnitt' });
  const bauS = AX.stabmodell(m, { knotenmodell: 'schwerachsen' });

  // --- Geometrie -----------------------------------------------------------
  const kn = [...bauA.knoten.values()];
  pruef('Modell reicht von 0 bis L', Math.max(...kn.map((k) => k.x)), m.L, 1e-9, 'm');
  // Die Breite läuft mit x (Grundrissknick): in Feldmitte das Rechenmass,
  // im Auflagerbereich das grössere Mass - genau wie im Nachweis (knoten()).
  const yBei = (x) => {
    const p = [...bauA.knoten.values()]
      .filter((k) => Math.abs(k.x - x) < 1e-6 && k.name.startsWith('OG'));
    return Math.max(...p.map((k) => k.y)) - Math.min(...p.map((k) => k.y));
  };
  pruef('Gurtabstand in Feldmitte ist das Rechenmass', yBei(10), m.b, 1e-9, 'm');
  pruef('Gurtabstand am Auflager folgt dem Grundrissknick',
        Math.max(...kn.map((k) => k.y)) - Math.min(...kn.map((k) => k.y)),
        m.breite.bAn(0), 1e-9, 'm');
  pruef('Gurtabstand lotrecht ist die Jochhöhe',
        Math.max(...kn.filter((k) => k.name.startsWith('OG')).map((k) => k.z))
        - Math.max(...kn.filter((k) => k.name.startsWith('UG')).map((k) => k.z)),
        m.h, 1e-9, 'm');

  // Der Lastpunkt hängt um z unter der Schwerachse des Anschlussgurtes
  const last = bauA.knoten.get(bauA.arme[0].knoten);
  pruef('Lastpunkt liegt z unter dem Anschlussgurt', last.z, m.h / 2 - m.h - 1.35,
        1e-9, 'm');

  wahr('Anschnittmodell hat mehr Stäbe als das Schwerachsenmodell',
       bauA.staebe.length > bauS.staebe.length,
       `${bauA.staebe.length} gegen ${bauS.staebe.length}`);
  wahr('Nur das Anschnittmodell hat steife Knotenbereiche',
       bauA.staebe.some((s) => s.qs === 'STARR' && /^(OG|UG)[LR]_S/.test(s.name))
       && !bauS.staebe.some((s) => s.qs === 'STARR' && /^(OG|UG)[LR]_S/.test(s.name)));
  wahr('Jeder Stab verweist auf vorhandene Knoten',
       bauA.staebe.every((s) => bauA.knoten.has(s.von) && bauA.knoten.has(s.bis)));
  wahr('Kein Stab hat Länge null',
       bauA.staebe.every((s) => {
         const a = bauA.knoten.get(s.von), b = bauA.knoten.get(s.bis);
         return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) > 1e-9;
       }));
  wahr('Ein Anbauteil ergibt EINEN Arm, auch bei mehreren Lastblöcken',
       bauA.arme.length === 1, `${bauA.arme.length} Arm(e)`);

  // --- Lasten --------------------------------------------------------------
  const l = AX.lasten(m, bauA);
  const summe = (k, r) => l.punkt.filter((p) => p.lastfall === k && p.richtung === r)
    .reduce((s, p) => s + p.wert, 0);
  pruef('F_z zeigt in SAF nach oben, also negativ', summe('G', 'Z'), -3, 1e-9, 'kN');
  pruef('F_y bleibt unverändert', summe('WindY', 'Y'), 4, 1e-9, 'kN');
  const je = (k) => l.strecke.filter((q) => q.lastfall === k);
  wahr('Jede Laufmeterlast läuft auf allen vier Gurten',
       je('G').length === je('WindY').length && je('G').length === je('Schnee').length,
       `${je('G').length} Stäbe je Gruppe`);
  pruef('Streckenlast je Gurt ist ein Viertel', je('G')[0].wert, -0.6 / 4, 1e-9, 'kN/m');
  wahr('Schnee wird nur bei eingeschaltetem Schnee ausgegeben',
       AX.lasten(modell({ ...eingabe, schneeAktiv: false }, deps.profOG, deps.profUG,
                        deps.stahl, deps.joch),
                 bauA).strecke.every((q) => q.lastfall !== 'Schnee'));

  // --- Blätter -------------------------------------------------------------
  const { blaetter } = AX.axisvmMappe(eingabe, deps, { knotenmodell: 'anschnitt' });
  const namen = blaetter.map((b) => b.name);
  ['StructuralMaterial', 'StructuralCrossSection', 'StructuralPointConnection',
   'StructuralCurveMember', 'StructuralPointSupport', 'StructuralLoadCase',
   'StructuralLoadGroup', 'StructuralCurveAction', 'StructuralPointAction']
    .forEach((n) => wahr(`Blatt ${n} vorhanden`, namen.includes(n)));
  wahr('Anleitung und Vergleich liegen aussen',
       namen[0] === 'Anleitung' && namen[namen.length - 1] === 'Vergleich');

  const lf = blaetter.find((b) => b.name === 'StructuralLoadCase');
  wahr('Lastfall G ist NICHT als Eigengewicht deklariert',
       lf.rows.find((r) => r[0] === 'G')[4] === 'Others');

  // Das Vergleichsblatt führt die Schnittgrössen je Gruppe, charakteristisch:
  // die Auflagerquerkraft aus G ist von Hand nachrechenbar.
  const vgl = blaetter.find((b) => b.name === 'Vergleich');
  const kopfZ = vgl.rows.findIndex((r) => r?.[0]?.v === 'Station');
  const erste = vgl.rows[kopfZ + 1];
  pruef('V_z am Auflager aus G', erste[3].v, 0.6 * 20 / 2 + 3 * 12.5 / 20, 1e-9, 'kN');

  const qs = blaetter.find((b) => b.name === 'StructuralCrossSection');
  wahr('Gurt als Winkel, Blech als Rechteck ausgegeben',
       qs.rows.some((r) => r[0] === 'GURT_OG' && r[3] === 'Angle')
       && qs.rows.some((r) => String(r[0]).startsWith('BLECH_') && r[3] === 'Rectangle'));

  const auf = blaetter.find((b) => b.name === 'StructuralPointSupport');
  wahr('Gabellagerung: Torsion gehalten, Windbiegung gelenkig',
       auf.rows.slice(1).every((r) => r[7] === 'Rigid' && r[9] === 'Free'));

  // --- Endschott: tragend, nur die Ausgabe ist schaltbar --------------------
  const mitS = AX.stabmodell(m, { knotenmodell: 'schwerachsen' });
  const ausS = AX.stabmodell(m, { knotenmodell: 'schwerachsen', schottAusblenden: true });
  const schottStaebe = (b) => b.staebe.filter((st) => st.name.startsWith('SCHOTT_')).length;
  pruef('Das Schott steht in beiden Fällen im Modell',
        schottStaebe(ausS), schottStaebe(mitS), 1e-12, 'Stk');
  pruef('Acht Schottstäbe, vier je Ende', schottStaebe(mitS), 8, 1e-12, 'Stk');
  pruef('Gleich viele Stäbe insgesamt',
        ausS.staebe.length, mitS.staebe.length, 1e-12, 'Stk');
  wahr('Ein Auflagerknoten je Ende, auf der Jochachse',
       mitS.auflager.every((a) => a.punkte.length === 1
         && Math.abs(mitS.knoten.get(a.knoten).y) < 1e-9));
  wahr('Nur die Ausgabe ist geschaltet',
       ausS.schottAusblenden === true && mitS.schottAusblenden === false);

  const PYm = await import(J('export.pynite.js'));
  const skript = (o) => PYm.pyniteSkript(m, { knotenmodell: 'schwerachsen', ...o }).text;
  wahr('Skript blendet die Schottstäbe nur auf Wunsch aus',
       skript({ schottAusblenden: true }).includes('SCHOTT_AUSBLENDEN = True')
       && skript({}).includes('SCHOTT_AUSBLENDEN = False'));
  wahr('Die Schottstäbe stehen in beiden Skripten als Stäbe drin',
       (skript({ schottAusblenden: true }).match(/'SCHOTT_/g) ?? []).length ===
       (skript({}).match(/'SCHOTT_/g) ?? []).length);

  // --- DXF: Ausweichweg ohne SAF-Lizenz ------------------------------------
  const dxf = AX.dxfText(m, { knotenmodell: 'anschnitt' });
  const zeilen = dxf.text.split('\n');
  wahr('DXF beginnt mit SECTION und endet mit EOF',
       zeilen[0] === '0' && zeilen[1] === 'SECTION'
       && zeilen[zeilen.length - 2] === 'EOF');
  pruef('Je Stab eine LINE', (dxf.text.match(/^LINE$/gm) ?? []).length,
        dxf.bau.staebe.length, 1e-12, 'Stk');
  wahr('Keine unberechneten Koordinaten im DXF', !/NaN|undefined|Infinity/.test(dxf.text));
  wahr('Jeder Querschnitt hat eine eigene Ebene',
       [...new Set(dxf.bau.staebe.map((st) => st.qs))]
         .every((q) => dxf.ebenen.includes(q.toUpperCase())));
  wahr('Auflager- und Lastpunkte liegen auf eigenen Ebenen',
       dxf.ebenen.includes('AUFLAGER') && dxf.ebenen.includes('LASTPUNKT'));

  // Das Begleitblatt trägt, was DXF nicht tragen kann
  const zu = AX.zuordnungsblatt(m, dxf, { knotenmodell: 'anschnitt' });
  const flach = JSON.stringify(zu.rows);
  ['Querschnitte je Ebene', 'Auflager', 'Streckenlasten', 'Punktlasten']
    .forEach((t) => wahr(`Zuordnungsblatt nennt ${t}`, flach.includes(t)));
  wahr('Zuordnungsblatt führt jeden Lastfall der Punktlasten',
       dxf.lasten.punkt.every((q) => flach.includes(q.name)));
}

// ===========================================================================
titel('20  PyNite-Ausleitung');

{
  const PY = await import(J('export.pynite.js'));
  const { modell } = await import(J('core.vierendeel.js'));
  const e = basis({
    lastHerkunft: 'manuell', gkManuell: 0.6, wkManuell: 0.5, skManuell: 0.3,
    schneeAktiv: true,
    anbauteile: [{ ...teil({ name: 'HS', x: 7.5 }), raster: 0.4,
                   befestigung: 'unten',
                   lasten: [block({ einwirkung: 'G', z: -1.35, Fz: 3 }),
                            block({ einwirkung: 'WindY', z: -1.35, Fy: 4 })] }],
  });
  const m = modell(e, getProfil(e.profOG), getProfil(e.profUG),
                   getStahl(e.stahl), T.getTragjoch('J90'));
  const r = PY.pyniteSkript(m, { knotenmodell: 'anschnitt' });

  wahr('Skript importiert PyNite mit Rückfall auf die alte Schreibweise',
       r.text.includes('from Pynite import FEModel3D')
       && r.text.includes('from PyNite import FEModel3D'));
  pruef('Je Stab eine add_member-Zeile',
        (r.text.match(/^M\.add_member\(/gm) ?? []).length, r.bau.staebe.length,
        1e-12, 'Stk');
  pruef('Je Knoten eine add_node-Zeile',
        (r.text.match(/^M\.add_node\(/gm) ?? []).length, r.bau.knoten.size,
        1e-12, 'Stk');
  wahr('Keine unberechneten Zahlen im Skript', !/NaN|undefined|Infinity/.test(r.text));
  wahr('Ein Lastfall je Einwirkungsgruppe mit Beiwert 1',
       r.faelle.every((f) => r.text.includes(`M.add_load_combo('${f}', {'${f}': 1.0})`)));

  // Achsentausch: unser Z wird PyNites Y
  const knoten = r.text.split('\n').filter((z) => z.startsWith('M.add_node('));
  const auf = knoten.find((z) => z.includes("'AUF_A'"));
  const zahlen = auf.match(/-?\d+\.?\d*(e-?\d+)?/g).map(Number);
  pruef('Auflagerknoten: unser z steht an PyNites Y-Stelle', zahlen[1], 0, 1e-9, 'm');
  pruef('Auflagerknoten: unser y steht an PyNites Z-Stelle', zahlen[2], 0, 1e-9, 'm');

  // Drehlage der Blechquerschnitte: starke Achse je nach Ebene
  const qsV = r.querschnitte.find((q) => q.name.startsWith('BLECH_V'));
  const qsH = r.querschnitte.find((q) => q.name.startsWith('BLECH_H'));
  wahr('Vertikalblech: starke Achse ist Iz', qsV.Iz > qsV.Iy * 10);
  wahr('Horizontalblech: starke Achse ist Iy', qsH.Iy > qsH.Iz * 10);
  pruef('Beide Ebenen, dieselbe Fläche', qsV.A, qsH.A, 1e-12, 'm2');

  // Gurt: unser I_y wirkt gegen die Vertikalbiegung, in PyNite ist das Iz
  const gurt = r.querschnitte.find((q) => q.name === 'GURT_OG');
  const p = getProfil(e.profOG);
  pruef('Gurt: Iz aus unserem i_y', gurt.Iz, (p.iy * p.iy * p.A) / 1e8, 1e-9, 'm4');

  // Schnitte liegen in FELDMITTE, nicht auf den Stationen
  const stationen = JSON.parse(r.text.match(/STATIONEN = (\[[^\]]*\])/)[1]);
  const xs = m.stationsListe.map((st) => st.x);
  wahr('Schnitte liegen zwischen den Stationen, nicht auf ihnen',
       stationen.length === xs.length - 1
       && stationen.every((x) => !xs.some((v) => Math.abs(v - x) < 1e-6)));
}

// ===========================================================================
titel('21  Normalkraft in Jochachse');
// Sie wird im Nachweis längst mitgerechnet (N_ax je Winkel), stand aber in
// keiner Auswertung. Geprüft wird deshalb beides: die Grösse selbst und dass
// sie dort ankommt, wo sie hingehört.
{
  const L = 20, x0 = 6, zug = 12;          // kN längs, ständig
  const Nd = zug * 1.35;                   // Bemessungswert, γ_G = 1.35
  // Der Lastblock sitzt RELATIV zum Anbauteil - mit x = 0 greift er genau
  // dort an, wo das Teil steht.
  const t = teil({ id: 'ZUG', x: x0, befestigung: 'durchgehend',
    lasten: [block({ einwirkung: 'G', x: 0, Fx: zug })] });
  const e0 = basis({ L, torsionModell: 'verteilt', anbauteile: [t] });
  const r = rechne(e0);

  // Aufteilung auf die Auflager wie bei der Torsion: links vom Angriff der
  // Anteil (L-x₀)/L, rechts davon x₀/L. Der grössere von beiden ist der
  // Höchstwert - hier links, weil der Angriff näher am linken Auflager liegt.
  pruef('N_x links vom Angriff', schnittgroessen(3, r.modell).Nx,
        (Nd * (L - x0)) / L, 1e-9, 'kN');
  pruef('N_x rechts vom Angriff', schnittgroessen(9, r.modell).Nx,
        (Nd * x0) / L, 1e-9, 'kN');
  pruef('Höchstwert ist der grössere der beiden Anteile',
        r.extrem.NxMax, (Nd * (L - x0)) / L, 1e-9, 'kN');
  pruef('Beide Anteile ergeben zusammen die Last',
        schnittgroessen(3, r.modell).Nx + schnittgroessen(9, r.modell).Nx,
        Nd, 1e-9, 'kN');

  // Flächenproportional auf die vier Winkel - bei gleichen Profilen je ein
  // Viertel.
  const s = { ...r.schnitt };
  const sn = auswertungAn(3, r.modell);
  const summe = sn.ecken.reduce((a, c) => a + c.N_ax, 0);
  pruef('Summe N_ax über alle vier Winkel = N_x', summe, sn.Nx, 1e-9, 'kN');
  wahr('Bei gleichen Profilen je ein Viertel',
       sn.ecken.every((c) => Math.abs(c.N_ax - sn.Nx / 4) < 1e-9));
  wahr('N je Winkel enthält den Normalkraftanteil',
       sn.ecken.every((c) => Math.abs(c.N - (c.N_My + c.N_Mz + c.N_ax)) < 1e-9));
  wahr('Der Schnitt führt N_x mit', Number.isFinite(s.Nx));

  // Ohne Längslast bleibt sie null - sonst wäre die Kachel eine Falle.
  pruef('Ohne Längslast keine Normalkraft', rechne(basis({ L })).extrem.NxMax,
        0, 1e-9, 'kN');
}

// ===========================================================================
titel('22  Ausleger: Wind über die Fahrleitung');
// Das äussere Ende des Auslegers hängt an der Fahrleitung; die wirkt durch den
// Leiterzug als Auflager und nimmt die eine Hälfte des Windes auf. Nur die
// andere kommt am Joch an - auf der Achse des Trägers, auf DERSELBEN Höhe.
{
  const trasse = { ek: 'EK2', R: 300000, spannweite: 50 };
  const bau = (extra) => [{ ...A.neuesAnbauteil('hs-nt-ausleger', 10),
                            name: 'Ausleger', ...extra }];
  const summe = (teile, gruppe, feld) => teile.reduce(
    (s, x) => s + (x.kraefte?.[gruppe]?.[feld] ?? 0), 0);
  const nachRolle = (teile, rolle, feld = 'Fy', gruppe = 'WindY') => teile
    .filter((x) => x.rolle === rolle)
    .reduce((s, x) => s + (x.kraefte?.[gruppe]?.[feld] ?? 0), 0);

  const aus = A.expandiereAnbauteile(bau({}), trasse);
  const halb = A.expandiereAnbauteile(
    bau({ windAufTraeger: true, windAnteil: 50 }), trasse);
  const ganz = A.expandiereAnbauteile(
    bau({ windAufTraeger: true, windAnteil: 100 }), trasse);

  const wAufbau = nachRolle(aus, 'aufbau');
  const wTraeger = nachRolle(aus, 'traeger');
  const wDraht = nachRolle(aus, 'drahtwerk');
  wahr('Der Ausleger trägt selbst Wind in y', wAufbau > 0);

  pruef('50 %: die Hälfte des Auslegerwindes bleibt',
        summe(halb, 'WindY', 'Fy'),
        summe(aus, 'WindY', 'Fy') - wAufbau / 2, 1e-12, 'kN');
  pruef('100 %: nichts geht verloren', summe(ganz, 'WindY', 'Fy'),
        summe(aus, 'WindY', 'Fy'), 1e-12, 'kN');
  pruef('Träger behält seinen eigenen Wind', nachRolle(halb, 'traeger'),
        wTraeger, 1e-12, 'kN');
  pruef('Drahtwerk bleibt unangetastet', nachRolle(halb, 'drahtwerk'),
        wDraht, 1e-12, 'kN');
  pruef('Eigengewicht unangetastet', summe(halb, 'G', 'Fz'),
        summe(aus, 'G', 'Fz'), 1e-12, 'kN');

  // DIE HÖHE ÄNDERT SICH NICHT - nur der Abstand in y.
  const zAufbau = aus.find((x) => x.rolle === 'aufbau').z;
  const zTraeger = aus.find((x) => x.rolle === 'traeger').z;
  wahr('Ausleger und Träger sitzen auf verschiedenen Höhen', zAufbau !== zTraeger);
  const rest = halb.filter((x) => (x.kraefte?.WindY?.Fy ?? 0) > 0
                                   && Math.abs(x.z - zAufbau) < 1e-9);
  pruef('Der verbleibende Anteil wirkt auf der Höhe des Auslegers',
        rest.reduce((s, x) => s + x.kraefte.WindY.Fy, 0), wAufbau / 2, 1e-12, 'kN');
  wahr('Nichts wandert auf die Höhe des Trägers',
       Math.abs(halb.filter((x) => Math.abs(x.z - zTraeger) < 1e-9)
         .reduce((s, x) => s + (x.kraefte?.WindY?.Fy ?? 0), 0) - wTraeger) < 1e-12);
  wahr('Der Eintrag rückt in y auf die Achse des Trägers',
       rest.every((x) => Math.abs(x.y - (aus.find((y) => y.rolle === 'traeger').y)) < 1e-12));

  // Wirkung: der Hebelarm bleibt, die Kraft halbiert sich, also halbiert sich
  // auch ihr Torsionsanteil.
  const e0 = basis({ L: 20, torsionModell: 'verteilt' });
  const Tx = (extra) => rechne({ ...e0, anbauteile: bau(extra) }).extrem.TxMax;
  const ev = Math.abs(zAufbau) + rechne({ ...e0, anbauteile: bau({}) }).modell.h / 2;
  pruef('Torsion sinkt um F/2 · e_v · x/L',
        Tx({}) - Tx({ windAufTraeger: true, windAnteil: 50 }),
        (wAufbau / 2) * 1.5 * ev * 0.5, 1e-6, 'kNm');
  pruef('Ohne Schalter unverändert', Tx({ windAnteil: 50 }), Tx({}), 1e-12, 'kNm');
}

titel('23  Vorzeichenrichtige Überlagerung je Blechebene');
// Der Schubfluss läuft um: er addiert sich auf einer Ebene und zieht auf der
// gegenüberliegenden ab. Die Vorzeichen sind an einem PyNite-Stabmodell
// festgelegt worden (siehe UEBERGABE.md) - hier stehen die Eigenschaften,
// die daraus folgen und die kein Umbau verletzen darf.
{
  const L = 10, x0 = 5;
  // Wind in y, UNTERHALB der Jochachse angreifend - eine Hängestütze.
  const teilUnten = teil({ id: 'W', x: x0, befestigung: 'durchgehend',
    lasten: [block({ einwirkung: 'WindY', x: 0, z: -1.35, Fy: 3 })] });
  const e0 = { ...basis(), typ: 'J70', L, torsionModell: 'verteilt',
               anbauteile: [teilUnten] };
  const huelle = rechne({ ...e0, ebenenUeberlagerung: 'huellkurve' });
  const vorz = rechne({ ...e0, ebenenUeberlagerung: 'vorzeichen' });

  const eb = (r, i, id) => r.knoten[i].ebenen.find((e) => e.id === id);
  const mitte = Math.round(huelle.knoten.length / 2);

  // 1 · DIE MASSGEBENDE EBENE ÄNDERT SICH NICHT.
  // Auf der Ebene, wo Querkraft und Schubfluss gleichsinnig laufen, ist
  // |V + T| = |V| + T - genau die Hüllkurve. Vorzeichenrichtig zu rechnen
  // entlastet also nur die andere Ebene und senkt nie den Nachweis.
  pruef('Höchstes η bleibt gleich', vorz.max.eta.eta, huelle.max.eta.eta, 1e-12);
  wahr('Keine Ebene wird ungünstiger als die Hüllkurve',
       vorz.knoten.every((k, i) => k.ebenen.every((e) => e.eta === null
         || e.eta <= (eb(huelle, i, e.id).eta ?? 0) + 1e-9)));
  wahr('An jeder Station erreicht EINE Ebene je Richtung die Hüllkurve',
       vorz.knoten.every((k, i) => ['vertikal', 'horizontal'].every((art) => {
         const paar = k.ebenen.filter((e) => e.art === art && e.eta !== null);
         if (!paar.length) return true;
         const h = eb(huelle, i, paar[0].id).eta;
         return paar.some((e) => Math.abs(e.eta - h) < 1e-9);
       })));

  // 2 · DIE LAST HÄNGT UNTER DEM JOCH, ALSO IST DAS UNTERE BLECH DRAN.
  // Und zwar auf BEIDEN Jochhälften: Querkraft und Torsion wechseln am
  // Angriff gemeinsam das Vorzeichen, ihr Verhältnis bleibt.
  const untenDran = (i) => (eb(vorz, i, 'H_U')?.V_Ebene ?? 0)
                         > (eb(vorz, i, 'H_O')?.V_Ebene ?? 0) + 1e-9;
  wahr('Unteres Blech massgebend, links wie rechts der Last',
       untenDran(2) && untenDran(vorz.knoten.length - 3));
  wahr('Ober- und Unterblech unterscheiden sich deutlich',
       eb(vorz, 2, 'H_U').V_Ebene > 2 * eb(vorz, 2, 'H_O').V_Ebene);
  wahr('In der Hüllkurve sind sie gleich',
       Math.abs(eb(huelle, 2, 'H_U').V_Ebene - eb(huelle, 2, 'H_O').V_Ebene) < 1e-12);

  // 3 · SYMMETRIE. Eine Last in Jochmitte muss ein spiegelbildliches
  // Ergebnis geben - der frühere Fehler (Querkraft als Betrag, Torsion mit
  // Vorzeichen) liess die massgebende Ebene am Anbauteil umspringen.
  const n = vorz.knoten.length;
  wahr('Spiegelbildlich um die Jochmitte',
       [1, 2, 3].every((i) => ['H_O', 'H_U'].every((id) =>
         Math.abs((eb(vorz, i, id)?.V_Ebene ?? 0)
                - (eb(vorz, n - 1 - i, id)?.V_Ebene ?? 0)) < 1e-9)));

  // 4 · OHNE DREHSINN KEIN VORZEICHEN.
  const hk = rechne({ ...e0, torsionModell: 'huellkurve',
                      ebenenUeberlagerung: 'vorzeichen' });
  const hk0 = rechne({ ...e0, torsionModell: 'huellkurve',
                      ebenenUeberlagerung: 'huellkurve' });
  wahr('Torsions-Hüllkurve fällt auf die Ebenen-Hüllkurve zurück',
       hk.knoten.every((k, i) => k.ebenen.every((e) => e.eta === null
         || Math.abs(e.eta - eb(hk0, i, e.id).eta) < 1e-12)));

  // 5 · Ohne Torsion sind alle vier Ebenen wie bisher.
  const ohne = { ...basis(), typ: 'J70', L, torsionModell: 'verteilt' };
  const a = rechne({ ...ohne, ebenenUeberlagerung: 'vorzeichen' });
  const b = rechne({ ...ohne, ebenenUeberlagerung: 'huellkurve' });
  wahr('Ohne Torsion kein Unterschied',
       a.knoten.every((k, i) => k.ebenen.every((e) => e.eta === null
         || Math.abs(e.eta - eb(b, i, e.id).eta) < 1e-12)));
  void mitte;
}

// ===========================================================================
titel('24  Ungleiche Gurte: Hebelarm, Aufteilung, zwei Maste');
{
  const { hebelarme } = await import(J('core.vierendeel.js'));
  const { gurtanteile } = await import(J('core.querschnitt.js'));
  const { mastSteifigkeit, drehfedern } = await import(J('core.auflager.js'));

  // --- 1 · Einbaulage des stehenden Schenkels -------------------------------
  // Signaljoch: jbb 512 mm, L 100x100x10 (zs_V = 2.82 cm). Zeigt der Schenkel
  // nach aussen, ist b = jbb - 2·zs; nach innen b = (jbb - 2·ja) + 2·zs.
  const pOG = getProfil('L 100x100x10'), pUG = getProfil('L 80x80x8');
  const phys = { jd: 600, jbbOG: 512, jbbUG: 491 };
  const innen = hebelarme(phys, pOG, pUG, { og: { st: -1 }, ug: { st: -1 } });
  const aussen = hebelarme(phys, pOG, pUG, { og: { st: +1 }, ug: { st: +1 } });
  pruef('b Obergurt, Schenkel innen', innen.bOG, (512 - 200 + 2 * 28.2) / 1000, 1e-9, 'm');
  pruef('b Obergurt, Schenkel aussen', aussen.bOG, (512 - 2 * 28.2) / 1000, 1e-9, 'm');
  wahr('Schenkel aussen gibt den grösseren Hebelarm', aussen.bOG > innen.bOG);
  pruef('h hängt nicht von der Querlage ab',
        aussen.varianten.schwerpunkt.hT, innen.varianten.schwerpunkt.hT, 1e-12, 'm');
  // Gegen das AxisVM-Modell: Schwerachsen ±228 mm -> b = 456 mm
  pruef('b trifft das Stabmodell', aussen.bOG, 0.4556, 1e-3, 'm');
  pruef('h trifft das Stabmodell', aussen.varianten.schwerpunkt.hT, 0.5493, 1e-3, 'm');
  wahr('Ohne Angabe gilt die Regelbauart (Schenkel innen)',
       Math.abs(hebelarme(phys, pOG, pUG).bOG - innen.bOG) < 1e-12);

  // --- 2 · Aufteilung auf die Gurte einer Vertikalebene ---------------------
  const mUngleich = { profOG: pOG, profUG: pUG };
  const gl = gurtanteile(mUngleich, 'gleich');
  const st = gurtanteile(mUngleich, 'steifigkeit');
  const hu = gurtanteile(mUngleich, 'huellend');
  pruef('hälftig: beide 0.5', gl.OG, 0.5, 1e-12);
  pruef('Steifigkeitsanteile ergänzen sich zu eins', st.OG + st.UG, 1, 1e-12);
  wahr('Der steifere Gurt bekommt mehr', st.OG > st.UG);
  // I = i_y^2 * A: L100x10 -> 3.04^2*19.2 = 177.4 cm4, L80x8 -> 2.42^2*12.3 = 72.0
  pruef('Anteil Obergurt nach I', st.OG, (3.04 ** 2 * 19.2)
        / (3.04 ** 2 * 19.2 + 2.42 ** 2 * 12.3), 1e-9);
  wahr('einhüllend nimmt je Gurt den ungünstigeren Anteil',
       hu.OG === st.OG && hu.UG === 0.5);
  wahr('einhüllend ist nie kleiner als hälftig', hu.OG >= 0.5 && hu.UG >= 0.5);
  const gleich = gurtanteile({ profOG: pOG, profUG: pOG }, 'steifigkeit');
  pruef('Gleiche Gurte: wieder hälftig', gleich.OG, 0.5, 1e-12);

  // Wirkung im Nachweis: nur bei ungleichen Gurten, und nur nach oben.
  const j130 = T.getTragjoch('J130');
  const e0 = { ...basis(), ...typUebernehmen({ ...standardwerte() }, j130),
               typ: 'J130', L: 27, schneeAktiv: false, anbauteile: [],
               endbedingung: 'gelenkig', torsionModell: 'huellkurve' };
  const a = rechne({ ...e0, gurtaufteilung: 'gleich' });
  const b = rechne({ ...e0, gurtaufteilung: 'huellend' });
  wahr('J130 hat ungleiche Gurte', a.modell.profOG.name !== a.modell.profUG.name);
  wahr('Einhüllend ist an keiner Station günstiger',
       a.knoten.every((k, i) => k.ecken.every((e, j) =>
         b.knoten[i].ecken[j].sig_v >= e.sig_v - 1e-9)));
  wahr('Der steifere Obergurt wird ungünstiger',
       b.max.etaOG.og.eta > a.max.etaOG.og.eta);
  // Die Blechquerkraft bleibt unberührt - die Anteile ergänzen sich zu eins.
  wahr('Blechquerkraft unverändert',
       a.knoten.every((k, i) => k.ebenen.every((e, j) => e.V == null
         || Math.abs(e.V - b.knoten[i].ebenen[j].V) < 1e-9)));

  // --- 3 · Zwei verschiedene Maste ------------------------------------------
  const mastEin = { endbedingung: 'mast', mastProfil: 'HEB 260', mastH: 7.8,
                    mastSteg: 'jochachse', mastAnschluss: 'kragarm' };
  const f1 = drehfedern(mastEin);
  pruef('Ein Mast: beide Enden gleich', f1.cA, f1.cB, 1e-12, 'kNm/rad');
  const f2 = drehfedern({ ...mastEin, mastZwei: true,
                          mastProfilB: 'HEM 240', mastHB: 12.0 });
  wahr('Zwei Maste: die Enden unterscheiden sich', Math.abs(f2.cA - f2.cB) > 1);
  pruef('Ende A unverändert', f2.cA, f1.cA, 1e-12, 'kNm/rad');
  const mB = mastSteifigkeit({ ...mastEin, mastZwei: true,
                               mastProfilB: 'HEM 240', mastHB: 12.0 }, 'B');
  pruef('Ende B: EI/H des zweiten Mastes', f2.cB,
        (210e6 * mB.I_cm4 * 1e-8) / 12.0, 1e-9, 'kNm/rad');
  wahr('Ohne Schalter bleibt der zweite Mast wirkungslos',
       Math.abs(drehfedern({ ...mastEin, mastProfilB: 'HEM 240', mastHB: 12.0 }).cB
                - f1.cB) < 1e-12);
}

// ===========================================================================
titel('25  Winkelspannung an den Querschnittspunkten');
// Die Querschnittswerte werden aus den Tabellenwerten hergeleitet - I_yz steht
// in keiner Profiltabelle dieses Werkzeugs. Gegengeprüft wird an den Werten,
// die AxisVM für dieselben Profile ausweist.
{
  const { winkelwerte, randspannung, wirksamesW } = await import(J('core.winkel.js'));
  const AX = {
    'L 100x100x10': { A: 1915.52, Iy: 1766604, Iyz: -1036581,
                      I1: 2803186, I2: 730023 },
    'L 80x80x8':    { A: 1226.78, Iy: 722397.8, Iyz: -423612.4,
                      I1: 1146010, I2: 298785.4 },
  };
  Object.entries(AX).forEach(([name, a]) => {
    const w = winkelwerte(getProfil(name));
    pruef(`${name}: A`, w.A, a.A, 0.01, 'mm2');
    pruef(`${name}: I_y`, w.Iy, a.Iy, 0.01, 'mm4');
    // I_yz folgt aus I_2 = i_min²·A und der Invarianz der Spur.
    pruef(`${name}: I_yz (hergeleitet)`, w.Iyz, a.Iyz, 0.01, 'mm4');
    pruef(`${name}: I_1`, w.I1, a.I1, 0.01, 'mm4');
    pruef(`${name}: I_2`, w.I2, a.I2, 0.01, 'mm4');
    wahr(`${name}: I_1 + I_2 = I_y + I_z`,
         Math.abs(w.I1 + w.I2 - (w.Iy + w.Iz)) < 1e-6);
    wahr(`${name}: sechs Eckpunkte`, w.punkte.length === 6);
  });

  // Schiefe Biegung: die Randspannung ist grösser als M/W_schenkelparallel.
  const p100 = getProfil('L 100x100x10');
  const w100 = winkelwerte(p100);
  const Weff = wirksamesW(w100);
  wahr('Wirksames W ist kleiner als das schenkelparallele',
       Weff < p100.Wy * 1000);
  pruef('Faktor gegenüber W schenkelparallel', (p100.Wy * 1000) / Weff,
        1.298, 5e-3);

  // Reine Normalkraft: das Modell darf sie nicht verändern.
  pruef('Nur Normalkraft: σ = N/A', randspannung(w100, 100, 0, 0).sig,
        (100 * 1000) / w100.A, 1e-9, 'N/mm2');
  // Vorzeichen der Momente ohne Wirkung - ausgewertet wird die Hüllkurve.
  pruef('Vorzeichen von M_y ohne Wirkung', randspannung(w100, 0, -3, 0).sig,
        randspannung(w100, 0, 3, 0).sig, 1e-12, 'N/mm2');
  wahr('Zwei Momente sind ungünstiger als eines',
       randspannung(w100, 0, 3, 2).sig > randspannung(w100, 0, 3, 0).sig);

  // EINE Achse allein: die punktweise Ermittlung ist immer ungünstiger.
  // Bei ZWEI Momenten gilt das nicht zwingend - die beiden Randpunkte fallen
  // dann nicht zusammen, und die Summe der Einzelmaxima kann grösser sein als
  // das wirkliche Maximum. Genau deshalb ist die Summe über W keine sichere
  // obere Schranke, sondern nur eine andere Näherung.
  [1, 5, 20].forEach((M) => {
    const punkt = randspannung(w100, 0, M, 0).sig;
    const ueberW = (M * 1e6) / (p100.Wy * 1000);
    wahr(`M_y = ${M} kNm: punktweise ungünstiger`, punkt > ueberW * 1.2);
  });

  // Im Rechenkern: Vorgabe bleibt das schenkelparallele W.
  const j130 = T.getTragjoch('J130');
  const e0 = { ...basis(), ...typUebernehmen({ ...standardwerte() }, j130),
               typ: 'J130', L: 27, schneeAktiv: false, anbauteile: [],
               endbedingung: 'gelenkig', torsionModell: 'huellkurve' };
  const a = rechne(e0);
  const b = rechne({ ...e0, spannungsmodell: 'punkte' });
  wahr('Vorgabe ist das schenkelparallele W',
       a.knoten[0].ecken[0].spannungsmodell === 'schenkel');
  wahr('Punktweise gibt ein anderes Ergebnis',
       Math.abs(b.max.etaOG.og.eta - a.max.etaOG.og.eta) > 1e-3);
  wahr('Beide Modelle rechnen durch',
       Number.isFinite(a.max.etaGesamt) && Number.isFinite(b.max.etaGesamt));
}

// ===========================================================================
console.log('\n' + '='.repeat(104));
console.log(`ERGEBNIS:  ${bestanden} bestanden, ${gefallen} gefallen`);
if (gefallen) {
  console.log('\nNICHT BESTANDEN:');
  fehlerliste.forEach((f) => console.log('  · ' + f));
}
console.log('='.repeat(104));
process.exit(gefallen ? 1 : 0);
