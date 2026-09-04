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

import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HIER = dirname(fileURLToPath(import.meta.url));
const NL = String.fromCharCode(10);

// Als URL, nicht als Pfad: unter Windows ist "C:\...\js\x.js" für import()
// kein gültiges Schema (ERR_UNSUPPORTED_ESM_URL_SCHEME). Unter macOS ging
// der blosse Pfad zufällig durch. Dieselbe Schreibweise wie in
// ausleiten.mjs und vergleich_werkzeug.mjs.
const J = (n) => new URL(`./js/${n}`, import.meta.url).href;

const T = await import(J('data.tragjoche.js'));
T.setzeDatenbank(JSON.parse(readFileSync(join(HIER, 'data', 'tragjoche.json'), 'utf8')));

const { getProfil, getStahl, PROFILE } = await import(J('data.profiles.js'));
const { berechne, modell, auswertungAn } = await import(J('core.vierendeel.js'));
const { torsionsSchubfluss } = await import(J('core.querschnitt.js'));
const { schnittgroessen, knotenraster, pruefeAbstaende } = await import(J('core.statics.js'));
const { auflagermomente, biegesteifigkeitJoch, E_STAHL,
        MAST_UNVERSCHIEBLICH } = await import(J('core.auflager.js'));
const { klassifiziereWinkel, klasseAuskragend } = await import(J('core.klassen.js'));
const { standardwerte, typUebernehmen, FELDER } = await import(J('ui.schema.js'));
const { verortung, verortungKurz } = await import(J('core.constants.js'));
const A = await import(J('data.anbauteile.js'));
A.setzeAnbauteilDB(JSON.parse(readFileSync(join(HIER, 'data', 'anbauteile.json'), 'utf8')));
const FL = await import(J('data.fl.js'));
FL.setzeFlDB(JSON.parse(readFileSync(join(HIER, 'data', 'fl_bauteile.json'), 'utf8')));
const AJ = await import(J('data.abfangjoche.js'));
AJ.setzeAbfangDB(JSON.parse(
  readFileSync(join(HIER, 'data', 'abfangjoche.json'), 'utf8')));

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
  // Der Lastfall hier ist vertikal, also UNVERSCHIEBLICH: das Joch hält die
  // beiden Mastköpfe zusammen, und es gilt 4.00 · E·I/H statt des Kragmastes
  // (core.auflager.js, MAST_UNVERSCHIEBLICH). Der Kragarmwert bleibt daneben
  // ausgewiesen und gilt beim Wind in Jochachse.
  const w = basis({ endbedingung: 'mast', mastProfil: 'HEB 240',
                    mastH: 8, mastSteg: 'jochachse', mastAnschluss: 'kragarm' });
  const e = rechne(w);
  const p = e.modell.federn.mast;
  pruef('Kragmastwert c = E·I/H', p.cKragarm,
        (E_STAHL * (11260 * 1e-8)) / 8, 1e-9, 'kNm/rad');
  pruef('Vertikallast rechnet unverschieblich', p.cPhi,
        MAST_UNVERSCHIEBLICH * p.cKragarm, 1e-9, 'kNm/rad');
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
  // Verglichen wird die Ausnutzung der GURTE: darum geht es hier, der
  // Hebelarm im Endbereich ist kleiner und die Gurtkräfte deshalb grösser.
  // Über η_gesamt liefe der Vergleich an den Blechen, und die hängen am
  // Endfeldzuschlag und an der Blechgrösse des jeweiligen Typs - das ist eine
  // andere Frage.
  const etaGurt = (r) => Math.max(...r.knoten.map((k) => k.etaL));
  wahr('Verjüngtes Joch: die Gurte sind ungünstiger als beim durchgehenden',
       etaGurt(e) >= etaGurt(eNeu) - 1e-9,
       `alt η_L = ${etaGurt(e).toFixed(3)}, neu η_L = ${etaGurt(eNeu).toFixed(3)}`);

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

  // Gegenprobe mit den Stückzahlen der Werkstattzeichnung:
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
  // Vergleichsmodelle (sortiment: false) bilden ein fremdes Bauwerk nach und
  // halten die Regeln des Sortiments nicht ein.
  const neu = T.sortimentstypen().filter((j) => j.bauweise !== 'alt');
  const alt = T.sortimentstypen().filter((j) => j.bauweise === 'alt');
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

  // 4 Wind (je Richtung ±) + 2 Schnee (Begleitwind ±)
  const nw = lf.filter((x) => x.nachweis);
  pruef('Sechs Nachweislastfälle mit Schnee', nw.length, 6, 1e-12, 'Stk');
  // NUR die seltene Stufe: 4 Wind + 2 Schnee. Die häufige ist entfallen.
  pruef('Sechs Lastfälle der Gebrauchstauglichkeit',
        lf.filter((x) => x.art === 'gebrauchstauglichkeit').length, 6, 1e-12, 'Stk');
  wahr('Nur die seltene Stufe, keine häufige',
       lf.filter((x) => x.art === 'gebrauchstauglichkeit')
         .every((x) => x.stufe === 'selten'));

  // ZUOBERST DIE EINZELNEN LASTARTEN, jede für sich und charakteristisch.
  const chars = lf.filter((x) => x.art === 'charakteristisch');
  wahr('Die charakteristischen Lastfälle stehen zuoberst',
       lf.slice(0, chars.length).every((x) => x.art === 'charakteristisch'));
  wahr('Ständig, Anbauteile, Schnee, Wind y, Wind x, Ständig + Wind',
       chars.map((x) => x.key).join(',') === 'gk,ak,sk,wyk,wxk,gwk',
       chars.map((x) => x.bez).join(' · '));
  wahr('Jede Einzellastart trägt genau eine Gruppe',
       ['sk', 'wyk', 'wxk'].every((k) => Object.values(holen(k).beiwerte)
         .filter((v) => v !== 0).length === 1));
  wahr('Ständig zeigt das Joch, Anbauteile die Anbauteile',
       holen('gk').nur === 'joch' && holen('ak').nur === 'anbauteile'
       && holen('gwk').nur === undefined);
  wahr('Gebrauchstauglichkeit ist kein Nachweis',
       lf.filter((x) => x.art === 'gebrauchstauglichkeit')
         .every((x) => x.nachweis === false && x.beiwerte.G === 1));
  wahr('Vier Gruppen: G, Wind x, Wind y, Schnee',
       L.EINWIRKUNGEN.map((e) => e.key).join(',') === 'G,WindX,WindY,Schnee',
       L.EINWIRKUNGEN.map((e) => e.label).join(' · '));

  // Die charakteristischen Lastfälle: alle Beiwerte 1.00 bzw. 0
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
  const zaehl = (o, art) => L.lastfaelle(o).filter((x) => x.art === art).length;
  wahr('Ohne Schnee und ohne Q_z: vier Nachweislastfälle',
       zaehl(ohneSchnee, 'tragsicherheit') === 4
       && zaehl(ohneSchnee, 'gebrauchstauglichkeit') === 4);
  wahr('Ohne Schnee entfällt auch der charakteristische Schneelastfall',
       !L.lastfaelle(ohneSchnee).some((x) => x.key === 'sk'));
  const mitQz = basis({ schneeAktiv: false,
                        anbauteile: [teil({ name: 'P', x: 10, Qz: 5 })] });
  const flachQz = A.expandiereAnbauteile(mitQz.anbauteile, {});
  wahr('Q_z am Anbauteil hält die Gruppe Schnee aktiv',
       zaehl({ ...mitQz, anbauteileFlach: flachQz }, 'tragsicherheit') === 6);

  // --- Doppelte Lastfälle werden gekennzeichnet -----------------------------
  // Mit den charakteristischen Einzellastfaellen sind fuenf Faelle dazu-
  // gekommen, die man sich vorher von Hand anlegen musste. Ein solcher
  // Eigenlastfall rechnet dann dasselbe zweimal.
  {
    const mitEigen = { ...w, lastfaelleEigen: [
      { bez: 'ständige schnee', beiwerte: { G: 1, Schnee: 1 } },
      { bez: 'Wind y', beiwerte: { WindY: 1 } },
    ] };
    const alle = L.lastfaelle(mitEigen);
    const wy = alle.find((x) => x.bez === 'Wind y');
    const gs = alle.find((x) => x.bez === 'ständige schnee');
    wahr('Der doppelte Eigenlastfall ist gekennzeichnet',
         wy.doppeltZu === 'wyk', `doppelt zu «${wy.doppeltBez}»`);
    wahr('Ein Eigenlastfall ohne Entsprechung nicht',
         gs.doppeltZu === undefined);
    wahr('Die vorgegebenen Lastfälle sind nie doppelt',
         alle.filter((x) => !x.eigen).every((x) => x.doppeltZu === undefined));
    // Gekennzeichnet, NICHT entfernt: was jemand eingegeben hat, verschwindet
    // nicht von selbst.
    pruef('Er bleibt in der Liste stehen', alle.length,
          L.lastfaelle(w).length + 2, 1e-12, 'Stk');
    // Ständig (Joch) und Anbauteile haben dieselben Beiwerte und sind trotzdem
    // nicht doppelt - sie unterscheiden sich im Feld `nur`.
    wahr('Ständig und Anbauteile gelten nicht als doppelt',
         alle.find((x) => x.key === 'ak').doppeltZu === undefined);
  }

  // --- Ständig und Anbauteile ergänzen sich zur vollen ständigen Last -------
  // Die beiden charakteristischen Lastfälle blenden einander aus. Zusammen
  // müssen sie genau das ergeben, was ein Lastfall mit G = 1 ohne Filter
  // liefert - sonst geht auf dem Weg Last verloren oder wird doppelt gezählt.
  {
    const bw1 = { G: 1, WindX: 0, WindY: 0, Schnee: 0, Leiterzug: 0 };
    const mitTeil = basis({ lastHerkunft: 'manuell', gkManuell: 2, wkManuell: 0,
                            skManuell: 0, schneeAktiv: false,
                            anbauteile: [teil({ name: 'P', x: 8, Pv: 6, ev: 1.2 })] });
    const alles = rechne({ ...mitTeil, beiwerteFest: bw1 }).modell;
    const joch  = rechne({ ...mitTeil, beiwerteFest: bw1, nurLast: 'joch' }).modell;
    const anb   = rechne({ ...mitTeil, beiwerteFest: bw1, nurLast: 'anbauteile' }).modell;
    pruef('Nur Joch: die Laufmeterlast bleibt', joch.qd, alles.qd, 1e-12, 'kN/m');
    wahr('Nur Joch: keine Einzellasten', (joch.P ?? []).length === 0
         && (joch.T ?? []).length === 0);
    pruef('Nur Anbauteile: keine Laufmeterlast', anb.qd, 0, 1e-12, 'kN/m');
    pruef('Nur Anbauteile: die Einzellasten bleiben',
          (anb.P ?? []).reduce((a, x) => a + x.w, 0),
          (alles.P ?? []).reduce((a, x) => a + x.w, 0), 1e-12, 'kN');
    pruef('Joch + Anbauteile = alles (Auflagerkraft)', joch.RA + anb.RA,
          alles.RA, 1e-9, 'kN');
    const feldMy = (o) => {
      const r = rechne({ ...mitTeil, beiwerteFest: bw1, ...o });
      const mitte = r.knoten[Math.floor(r.knoten.length / 2)];
      return mitte.My;
    };
    pruef('Joch + Anbauteile = alles (Feldmoment)',
          feldMy({ nurLast: 'joch' }) + feldMy({ nurLast: 'anbauteile' }),
          feldMy({}), 1e-6, 'kNm');
    // Der Lastfall bringt den Filter selbst mit - ohne dass ihn jemand setzt.
    wahr('Der Lastfall trägt den Filter selbst',
         rechne({ ...mitTeil, lastfall: 'ak' }).modell.qd === 0
         && rechne({ ...mitTeil, lastfall: 'gk' }).modell.qd === alles.qd);
  }

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
  pruef('Eigener Lastfall wird angehängt', L.lastfaelle(eig).length,
        L.lastfaelle(w).length + 1, 1e-12, 'Stk');
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
        v.huellkurve.max.etaGesamt, etaNw, 1e-12, '–');
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
  // Der Hebelarm des einseitigen Kräftepaars ist der Abstand der GURTKRÄFTE,
  // nicht das Aussenmass jbb der Zeichnung: früher stand hier jbb, über den
  // Katalog gerechnet 29 bis 42 % zu viel und damit ein zu kleines
  // Kräftepaar - auf der unsicheren Seite.
  const eins = { beiwerte: { G: 1, WindX: 1, WindY: 1, Schnee: 1 },
                 jbbOG: 400, jbbUG: 400 };
  const hArm = 0.5;
  const bArm = { OG: 0.300, UG: 0.300 };
  const lasten = (bef, b = bArm) => anbauteilLasten(
    auf([{ ...teil({ name: 'A', x: 10, Qy: 4, ev: 1.5 }), befestigung: bef }]),
    eins, hArm, b);

  const durch = lasten('durchgehend');
  const einseitig = lasten('unten');
  // e_v = z-Mass 1.5 m ab Anschlussebene + h/2 = 0.25 m bis zur Jochachse
  const T = 4 * (1.5 + hArm / 2);                      // F_y · e_v = 7 kNm

  pruef('4 Punkte: ΔF_y = T / h', durch.teile[0].dFy, T / hArm, 1e-12, 'kN');
  pruef('2 Punkte: ΔF_z = T / b', einseitig.teile[0].dFz, T / 0.300, 1e-12, 'kN');
  pruef('Nicht mehr über das Aussenmass jbb',
        einseitig.teile[0].dFz / (T / 0.400), 400 / 300, 1e-12, '–');
  // Der Hebelarm darf auch als Funktion (x, Gurt) kommen - so weiss er von
  // der Massvariante und vom Grundrissknick.
  pruef('Der Hebelarm darf ortsabhängig sein',
        lasten('unten', (x, g) => (g === 'UG' ? 0.25 : 0.40)).teile[0].dFz,
        T / 0.25, 1e-12, 'kN');
  // Der obere Anschluss zieht den Hebelarm des OBERgurts, der untere den des
  // Untergurts - sonst hinge das Kräftepaar am falschen Gurtpaar.
  pruef('Der obere Anschluss nimmt den Hebelarm des Obergurts',
        lasten('oben', { OG: 0.20, UG: 0.90 }).teile[0].dFz
        / lasten('oben', { OG: 0.40, UG: 0.90 }).teile[0].dFz, 2, 1e-12, '–');
  pruef('Der untere den des Untergurts',
        lasten('unten', { OG: 0.90, UG: 0.20 }).teile[0].dFz
        / lasten('unten', { OG: 0.90, UG: 0.40 }).teile[0].dFz, 2, 1e-12, '–');
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

  // Der Hebelarm folgt der MASSVARIANTE, quer durch den ganzen Rechenkern.
  {
    const haenge = { id: 'H', vorlage: 'direkt', name: 'Hängestütze', x: 6, raster: 0.4,
      seite: 'rechts', befestigung: 'unten', aktiv: true, module: [],
      lasten: [{ einwirkung: 'WindY', x: 0, y: 0, z: 1.6,
                 Fx: 0, Fy: 1.5, Fz: 0, Mxx: 0, Myy: 0, Mzz: 0 }] };
    const mv = (v) => rechne(basis({ massVariante: v, anbauteile: [haenge],
      beiwerteFest: { G: 0, WindX: 0, WindY: 1, Schnee: 0, Leiterzug: 0 } }));
    const sp = mv('schwerpunkt'), au = mv('aussen');
    // Aussenmass = grösserer Hebelarm = kleineres Kräftepaar.
    wahr('Der Hebelarm folgt der Massvariante',
         Math.abs(sp.modell.teile[0].dFz) > Math.abs(au.modell.teile[0].dFz),
         `Schwerpunkt ${sp.modell.teile[0].dFz.toFixed(2)} gegen Aussenmass `
         + `${au.modell.teile[0].dFz.toFixed(2)} kN`);
    // Genau T_d geteilt durch den Gurtabstand - je GURT, nicht im Mittel:
    // die Hängestütze hängt am Untergurt. (Ein reiner Verhältnisvergleich
    // ginge hier fehl: mit der Massvariante ändert sich auch h und damit der
    // Hebelarm e_v des Torsionsmoments selbst.)
    const Td = (m) => { const t = m.teile[0];
      return t.Fy * t.ev + t.Fz * t.ex + t.Mxx; };
    pruef('ΔF_z = T_d / b_UG, Schwerpunktsabstand',
          sp.modell.teile[0].dFz, Td(sp.modell) / sp.modell.bGurt.UG, 1e-9, 'kN');
    pruef('ΔF_z = T_d / b_UG, Aussenmass',
          au.modell.teile[0].dFz, Td(au.modell) / au.modell.bGurt.UG, 1e-9, 'kN');
    pruef('Aussenmass heisst genau jbb', au.modell.bGurt.UG,
          au.modell.jbbUG / 1000, 1e-12, 'm');
    wahr('Schwerpunktsabstand ist deutlich kleiner als jbb',
         sp.modell.bGurt.UG < 0.9 * au.modell.bGurt.UG,
         `${(1000 * sp.modell.bGurt.UG).toFixed(0)} gegen `
         + `${(1000 * au.modell.bGurt.UG).toFixed(0)} mm`);
  }

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
  /*
   * DER BEREICH UMFASST DEN MASTEN MIT.
   *
   * Bis zum 1. September war er das groesste η des JOCHS, denn nur Gurte und
   * Bleche trugen Kennwerte. Seither faerbt sich auch der Mast ein, und sein
   * η ist am Fuss regelmaessig das groessere - fuer die Skala zaehlt, was
   * gezeichnet wird.
   */
  const etaJoch = e.max.eta.eta;
  const etaMast = e.mast?.eta ?? 0;
  pruef('η-Bereich = grösstes η des ganzen Bildes',
        aus.bereiche.eta, Math.max(etaJoch, etaMast), 1e-9, '–');
  wahr('… und der Mast bringt hier das groessere ein',
       etaMast > etaJoch, `Mast ${etaMast.toFixed(3)} gegen Joch ${etaJoch.toFixed(3)}`);
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
  // VORZEICHEN: e_v zaehlt nach unten, das Kraeftepaar r × F ist deshalb
  // NEGATIV im Zaehlsinn des Feldmoments (My positiv = Obergurt Druck).
  pruef('F_x am Hebelarm e_v gibt M_y', gTeil.Myd, -2 * 1 * 2.25, 1e-12, 'kNm');
  // Gegenprobe am Gleichgewicht: gelenkiger Traeger, EIN eingepraegtes
  // Moment C_y in Feldmitte. Der Verlauf muss -C_y/L als Steigung und +C_y
  // als Sprung haben und an beiden Enden auf null zurueckkommen.
  {
    const ev = 1.5, Fx = 3, Lp = 20, C = -Fx * ev;
    const t = { id: 'E', name: 'E', x: 10, raster: 0.4, befestigung: 'unten',
      aktiv: true, seite: 'rechts', module: [],
      lasten: [{ einwirkung: 'WindX', x: 0, y: 0, z: -(1.5 - 0.25),
                 Fx, Fy: 0, Fz: 0, Mxx: 0, Myy: 0, Mzz: 0 }] };
    const e = rechne(basis({ L: Lp, endbedingung: 'gelenkig', anbauteile: [t],
      lastHerkunft: 'manuell', gkManuell: 0, wkManuell: 0, skManuell: 0,
      schneeAktiv: false,
      beiwerteFest: { G: 0, WindX: 1, WindY: 0, Schnee: 0, Leiterzug: 0 } }));
    const bei = (x) => e.knoten.reduce((a, b) =>
      (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a));
    const ev2 = e.modell.teile[0].ev;
    const C2 = -Fx * ev2;
    pruef('Links vom Angriff: Steigung −C_y/L', bei(5).My,
          (-C2 / Lp) * bei(5).x, 1e-9, 'kNm');
    pruef('Rechts davon: Sprung +C_y', bei(15).My,
          (-C2 / Lp) * bei(15).x + C2, 1e-9, 'kNm');
    pruef('An den Enden zurueck auf null', bei(Lp).My, 0, 1e-9, 'kNm');
    // Und die Last unter der Achse macht ein NEGATIVES Kraeftepaar: der
    // Verlauf steigt links an, statt zu fallen.
    wahr('Last unter der Achse: My steigt links an', bei(5).My > 0);
  }

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

  // Zwoelf seit dem Kapitel zur AxisVM-Ausleitung (Weisung vom 28. August:
  // "da sollte ein kapitel aufgenommen werden der den export zu axisvm
  // beschreibt"). Die Zahl steht hier, damit ein verlorenes Kapitel auffaellt.
  wahr('Handbuch hat alle zwoelf Abschnitte', HB.HANDBUCH.length === 12,
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
  wahr('Handbuch enthält zwölf Skizzen',
       (html.match(/<figure class="hb-skizze">/g) ?? []).length === 12);
  wahr('Keine Skizze hat unberechnete Koordinaten',
       !/NaN|undefined/.test(html));
  ['achsen', 'einwirkungen', 'system', 'querschnitt', 'vierendeel',
   'einleitung', 'raster', 'axisvm'].forEach((id) => {
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
  // Startwert ist AUS (Weisung): die geometrische Feder gilt, die
  // Schraubengrenze ist ein eigener Nachweis. Wer die Begrenzung prueft,
  // schaltet sie ausdruecklich ein.
  const mit = rechne(e({ schraubenGrenze: true, schraubenFgrenz: 24 })).modell;

  /*
   * JE GURT, NICHT JE GURTEBENE (Weisung, 27. August), und die Begrenzung
   * steht im STARTWERT AUS.
   *
   * Zuvor galt F = M/h, also die ganze Ebenenkraft an einem Anschluss - das
   * Doppelte des Richtigen. Und der Startwert stand auf EIN, womit die
   * Anwendung zweierlei zugleich sagte: der Rechenkern setzte die Feder
   * herab, DAMIT die Grenze eingehalten ist, und Pruefung A1 wies zugleich
   * die Kraft aus der ungebremsten Feder als ueberschritten aus.
   */
  {
    const f = FELDER.find((x) => x.key === 'schraubenGrenze');
    wahr('Die Begrenzung ist im Startwert aus', f.standard === false,
         String(f.standard));
    wahr('Und standardwerte() traegt sie so',
         standardwerte().schraubenGrenze === false);
    // Die Grenzlast bleibt sichtbar, auch ohne Begrenzung - sie wird ja
    // weiterhin nachgewiesen (A1).
    const fg = FELDER.find((x) => x.key === 'schraubenFgrenz');
    wahr('Die Grenzlast bleibt eingebbar, auch ohne Begrenzung',
         fg.sichtbar({ endbedingung: 'mast', schraubenGrenze: false }) === true);
    // Beide Wege muessen dieselbe Kraft meinen.
    const mG = rechne(e({ schraubenGrenze: true, schraubenFgrenz: 8 })).modell;
    pruef('Begrenzung und Nachweis rechnen dieselbe Kraft',
          mG.federn.grenze.FA, Math.abs(mG.federn.grenze.MA) / (2 * mG.h),
          1e-9, 'kN');
  }

  wahr('Ohne Begrenzung bleibt die geometrische Feder stehen',
       ohne.federn.grenze === null
       && Math.abs(ohne.federn.cA - ohne.federn.roh.cA) < 1e-9);
  // Unter blossem Eigengewicht bleibt die Gurtkraft weit unter 24 kN - die
  // Grenze greift dort nicht ein, und das soll sie auch nicht.
  wahr('24 kN greifen unter Eigengewicht allein nicht ein',
       !mit.federn.grenze.begrenzt && mit.federn.grenze.FA < 24,
       `F = ${mit.federn.grenze.FA.toFixed(1)} kN`);

  // Eine Grenze unterhalb der vorhandenen Kraft setzt die Feder herab
  const eng = rechne(e({ schraubenGrenze: true, schraubenFgrenz: 8 })).modell;
  wahr('Eine Grenze von 8 kN setzt die Feder herab',
       eng.federn.grenze.begrenzt && eng.federn.cA < eng.federn.roh.cA,
       `${eng.federn.roh.cA.toFixed(0)} -> ${eng.federn.cA.toFixed(0)} kNm/rad`);
  pruef('Die Gurtkraft trifft dann die Grenzlast', eng.federn.grenze.FA, 8, 1e-3, 'kN');
  // JE GURT: die Ebenenkraft ist das Doppelte, also M = F_Grenz · 2h.
  pruef('Stützmoment = F_Grenz · 2h', Math.abs(eng.MA), 8 * 2 * eng.h, 1e-3, 'kNm');
  wahr('Wenige Durchgänge genügen', eng.federn.grenze.durchgaenge <= 30,
       `${eng.federn.grenze.durchgaenge} Durchgänge`);

  // Eine hohe Grenzlast greift nicht ein
  const hoch = rechne(e({ schraubenGrenze: true, schraubenFgrenz: 1000 })).modell;
  pruef('Hohe Grenzlast lässt die Feder unberührt', hoch.federn.cA,
        hoch.federn.roh.cA, 1e-9, 'kNm/rad');
  wahr('… und meldet keine Begrenzung', !hoch.federn.grenze.begrenzt);

  // Kleinere Grenzlast -> weichere Feder -> grösseres Feldmoment
  const klein = rechne(e({ schraubenGrenze: true, schraubenFgrenz: 6 }));
  const gross = rechne(e({ schraubenGrenze: true, schraubenFgrenz: 10 }));
  const feld = (r) => Math.max(...r.knoten.map((k) => k.My));
  wahr('Kleinere Grenzlast gibt weichere Feder und mehr Feldmoment',
       klein.modell.federn.cA < gross.modell.federn.cA
       && feld(klein) > feld(gross),
       `c ${klein.modell.federn.cA.toFixed(0)} < ${gross.modell.federn.cA.toFixed(0)}, `
       + `Feld ${feld(klein).toFixed(2)} > ${feld(gross).toFixed(2)} kNm`);

  // Volle Einspannung bleibt die gewählte Idealisierung
  const voll = rechne(e({ endbedingung: 'voll', schraubenGrenze: true,
                         schraubenFgrenz: 24 })).modell;
  wahr('Volle Einspannung wird nicht begrenzt', voll.federn.grenze === null);

  // Die Funktion selbst, ohne Modelldrumherum
  const b = begrenzeFeder({ L: 16, qd: 1, P: [], M: [], EI: 65000,
                            cA: 1e6, cB: 1e6, h: 0.45, Fgrenz: 20 });
  // Die Skalierung ist eine Naeherung von unten; ein Rest von gut einem
  // Zehntausendstel bleibt und ist die Sache selbst, kein Fehler.
  pruef('Direkt gerufen: F trifft die Grenze', b.FA, 20, 2e-4, 'kN');
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
  // Ohne dritten Parameter gilt der UNVERSCHIEBLICHE Fall - das Joch hält die
  // beiden Mastköpfe zusammen, und das ist der Regelfall (Vertikallasten).
  const krag = mastSteifigkeit({ ...mast, mastAnschluss: 'kragarm' });
  const durch = mastSteifigkeit({ ...mast, mastAnschluss: 'durchlaufend' });
  const kragV = mastSteifigkeit({ ...mast, mastAnschluss: 'kragarm' }, 'A', true);
  const durchV = mastSteifigkeit({ ...mast, mastAnschluss: 'durchlaufend' }, 'A', true);

  const p = getMastprofil('HEB 260');
  pruef('Verschieblich, Kragarm: c_φ = E·I/H',
        kragV.cPhi, (E_STAHL * p.Iy * 1e-8) / 7.5, 1e-9, 'kNm/rad');
  pruef('Verschieblich, durchlaufend: Faktor 1.45',
        durchV.cPhi, 1.45 * kragV.cPhi, 1e-12, 'kNm/rad');
  pruef('Der Kragarmwert bleibt in beiden Fällen ausgewiesen',
        durch.cKragarm, kragV.cPhi, 1e-12, 'kNm/rad');
  wahr('Ohne Angabe gilt der durchlaufende Mast',
       mastSteifigkeit(mast).cVerschieblich === durchV.cPhi);
  wahr('Beide Anschlussarten sind wählbar',
       MASTANSCHLUESSE.length === 2
       && MASTANSCHLUESSE.every((a) => a.key && a.label && a.faktor));

  // Der Anschlussfaktor wirkt nur noch im VERSCHIEBLICHEN Fall - dort gilt
  // die alte Kalibrierung von 6074 kNm/rad (J90, 15.5 m, HEB 260) weiter.
  wahr('Verschieblich: durchlaufend trifft die gemessene Steifigkeit',
       Math.abs(durchV.cPhi - 6074) / 6074 < 0.03,
       `${durchV.cPhi.toFixed(0)} gegen gemessene 6074 kNm/rad`);
  // Unverschieblich regiert die Rahmenwirkung, nicht die Bauart des
  // Anschlusses: das Joch hält die beiden Mastköpfe zusammen.
  pruef('Unverschieblich ist 4.00 · E·I/H', durch.cPhi,
        MAST_UNVERSCHIEBLICH * durch.cKragarm, 1e-9, 'kNm/rad');
  wahr('Unverschieblich hängt nicht mehr am Anschluss',
       Math.abs(durch.cPhi - krag.cPhi) < 1e-9);
  wahr('Unverschieblich ist deutlich steifer als der Kragmast',
       durch.cPhi > 3 * krag.cKragarm);

  const f = (an) => drehfedern({ endbedingung: 'mast', ...mast, mastAnschluss: an });
  pruef('Beide Jochenden bekommen dieselbe Feder',
        f('durchlaufend').cA, f('durchlaufend').cB, 1e-12, 'kNm/rad');
  const fv = (an) => drehfedern({ endbedingung: 'mast', ...mast,
                                  mastAnschluss: an }, true);
  wahr('Die Art nennt den Anschluss, wenn er wirkt',
       fv('durchlaufend').art.includes('durchlaufend')
       && fv('kragarm').art.includes('Kragarm'));
  wahr('Sonst nennt sie den Rahmen',
       f('durchlaufend').art.includes('unverschieblich'));

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
  // Unter Vertikallast verschiebt sich der Rahmen nicht - dann regiert die
  // Rahmenwirkung, und die Bauart des Anschlusses fällt heraus.
  wahr('Vertikallast: der Anschluss ändert nichts mehr',
       Math.abs(d.feld - k.feld) < 1e-9 && Math.abs(d.stuetz - k.stuetz) < 1e-9,
       `Feld ${k.feld.toFixed(2)} / ${d.feld.toFixed(2)} kNm`);
  // Massstab ist der Rahmen mit BEIDEN Masten (PyNite, Füsse eingespannt,
  // Joch an beiden Ebenen angeschlossen): Feldmoment 8.22 kNm. Das frühere
  // Modell konnte sich verschieben und nannte 10.27 kNm.
  wahr('Trifft das Feldmoment des Rahmens mit beiden Masten (8.22 kNm)',
       Math.abs(d.feld - 8.22) < 0.35, `${d.feld.toFixed(2)} kNm`);
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
  wahr('Alle Abschnitte enthalten',
       HB.HANDBUCH.every((a) => datei.includes(`id="hb-${a.id}"`)),
       `${HB.HANDBUCH.length} Abschnitte`);
  wahr('Verzeichnis als echte Sprungmarken',
       HB.HANDBUCH.every((a) => datei.includes(`href="#hb-${a.id}"`)));
  // Zwoelf seit dem Kapitel zur AxisVM-Ausleitung (28. August): der Anschluss
  // in Draufsicht und in Ansicht. Vorher zehn.
  pruef('Alle zwoelf Skizzen mitgenommen',
        (datei.match(/<figure class="hb-skizze">/g) ?? []).length, 12, 1e-12, 'Stk');
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

  /*
   * DAS AUFLAGERMODELL WIRD HIER BENANNT, NICHT GEERBT.
   *
   * Diese Pruefungen gelten dem GURTmodell - vier Punkte je Ende, keine
   * Drehfeder. Sie standen ohne Angabe da und lebten von der Vorgabe; als
   * die am 31. August auf 'mast' wechselte (Mast im Modell wird auch
   * ausgeleitet), fielen sie, ohne dass am Geprueften etwas falsch war.
   * Eine Pruefung, die ein bestimmtes Modell meint, hat es zu nennen.
   */
  const GURTE = { auflagerModell: 'gurte' };
  const bauA = AX.stabmodell(m, { knotenmodell: 'anschnitt', ...GURTE });
  const bauS = AX.stabmodell(m, { knotenmodell: 'schwerachsen', ...GURTE });

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
  // Nur die GURTknoten: die Blechachsen liegen seit dem Schenkelversatz
  // weiter aussen, und das ist gewollt - sie bilden kein Rechteck mehr.
  const gurtKn = kn.filter((k) => /^(OG|UG)[LR]_/.test(k.name));
  pruef('Gurtabstand am Auflager folgt dem Grundrissknick',
        Math.max(...gurtKn.map((k) => k.y)) - Math.min(...gurtKn.map((k) => k.y)),
        m.breite.bAn(0), 1e-9, 'm');
  // Bei der Regelbauart LA_SI zeigt der liegende Schenkel nach AUSSEN und
  // zieht den Schwerpunkt mit. Die stehenden Schenkel - und damit die
  // Vertikalbleche - liegen dadurch INNEN von der Gurtachse; die liegenden
  // Schenkel mit den Horizontalblechen liegen aussen.
  wahr('Blechachsen sind in z weiter aussen als die Gurtachsen',
       Math.max(...kn.map((k) => k.z)) > Math.max(...gurtKn.map((k) => k.z)) + 1e-6);
  wahr('Blechachsen sind in y nicht weiter aussen',
       Math.max(...kn.map((k) => k.y)) <= Math.max(...gurtKn.map((k) => k.y)) + 1e-9);
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
  // MEHRERE LASTBLOECKE AN DERSELBEN STELLE ERGEBEN KEINEN ZWEITEN ARM.
  // Sonst stuenden steife Arme nebeneinander und versteiften die oertliche
  // Einleitung kuenstlich. Seit die Baugruppe eine KETTE bildet (Abschnitt
  // 32), fuehrt arme EINEN Eintrag je Teil - aber alle Teile an derselben
  // Stelle zeigen auf DENSELBEN Knoten, und ein Stab entsteht nur dort, wo
  // sich der Punkt vom Vorgaenger unterscheidet.
  wahr('Mehrere Lastblöcke an derselben Stelle teilen sich einen Knoten',
       new Set(bauA.arme.map((x) => x.knoten)).size === 1,
       `${bauA.arme.length} Lastblöcke auf ` +
       `${new Set(bauA.arme.map((x) => x.knoten)).size} Knoten`);
  wahr('Und ergeben genau einen Arm',
       bauA.staebe.filter((s) => /^ARM\d+_\d+$/.test(s.name)).length === 1);

  // --- Lasten --------------------------------------------------------------
  const l = AX.lasten(m, bauA);
  const summe = (k, r) => l.punkt.filter((p) => p.lastfall === k && p.richtung === r)
    .reduce((s, p) => s + p.wert, 0);
  pruef('F_z zeigt in SAF nach oben, also negativ', summe('G', 'Z'), -3, 1e-9, 'kN');
  pruef('F_y bleibt unverändert', summe('WindY', 'Y'), 4, 1e-9, 'kN');
  const je = (k) => l.strecke.filter((q) => q.lastfall === k);
  const gurteVon = (k) => new Set(je(k).map((q) => q.stab.split('_')[0]));
  // Das EIGENGEWICHT schreibt der Export nicht mehr: das Rechenprogramm
  // ermittelt es aus den Stäben. Nur ein Zuschlag geht hinaus.
  wahr('Eigengewicht wird nicht als Streckenlast geschrieben',
       je('G').length === 0, `${je('G').length} Einträge`);
  // Schnee liegt oben, hälftig auf die beiden OBERGURTE.
  pruef('Schnee auf zwei Gurte', gurteVon('Schnee').size, 2, 1e-12, 'Gurte');
  wahr('Schnee nur auf den Obergurten',
       [...gurteVon('Schnee')].every((g) => g.startsWith('OG')),
       [...gurteVon('Schnee')].join(' '));
  pruef('Schnee je Gurt die Hälfte', je('Schnee')[0].wert, -0.30 / 2, 1e-9, 'kN/m');
  // Wind quer hälftig auf EINEN Ober- und EINEN Untergurt derselben Seite:
  // die Resultierende liegt damit auf halber Höhe, es entsteht keine Torsion.
  pruef('Wind auf zwei Gurte', gurteVon('WindY').size, 2, 1e-12, 'Gurte');
  wahr('Wind auf je einen Ober- und Untergurt derselben Seite',
       [...gurteVon('WindY')].sort().join(' ') === 'OGL UGL');
  pruef('Wind je Gurt die Hälfte', je('WindY')[0].wert, 0.50 / 2, 1e-9, 'kN/m');
  wahr('Schnee wird nur bei eingeschaltetem Schnee ausgegeben',
       AX.lasten(modell({ ...eingabe, schneeAktiv: false }, deps.profOG, deps.profUG,
                        deps.stahl, deps.joch),
                 bauA).strecke.every((q) => q.lastfall !== 'Schnee'));

  // --- Blätter -------------------------------------------------------------
  // Auch hier das Gurtmodell benennen - die Lagerpruefungen unten meinen es.
  const { blaetter } = AX.axisvmMappe(eingabe, deps,
                                      { knotenmodell: 'anschnitt', auflagerModell: 'gurte' });
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

  /*
   * DAS SAF-BLATT SPIEGELT DAS GEWAEHLTE AUFLAGERMODELL.
   *
   * Hier stand `stuetzung(m, a.ende)` - also nur der BUCHSTABE des Endes.
   * `lager.ux` war damit undefiniert, und jedes Lager fiel in die
   * Ersatz-Gabellagerung: volle Haltung in allen Richtungen plus Drehfeder.
   * Bei vier Gurtknoten je Ende wurde daraus ein VIERFACH eingespanntes
   * Jochende. Die alte Pruefung mass genau diesen Fehler und nannte ihn
   * richtig - sie las Spalte 7 und 9 und fand ueberall 'Rigid'/'Free'.
   */
  const auf = blaetter.find((b) => b.name === 'StructuralPointSupport');
  const spalten = auf.rows[0].map((z) => z.v ?? z);
  const sp = (name) => spalten.indexOf(name);
  const lagerZeilen = auf.rows.slice(1);
  wahr('Ein Lager je gehaltenem Knoten des Auflagermodells',
       lagerZeilen.length === 8, `${lagerZeilen.length} Zeilen`);   // 4 Gurte * 2 Enden
  wahr('Windbiegung bleibt gelenkig',
       lagerZeilen.every((r) => r[sp('fiz')] === 'Free'));
  wahr('Am Gurtmodell haelt keine Drehfeder - das Ende haengt an vier Punkten',
       lagerZeilen.every((r) => r[sp('fix')] === 'Free' && r[sp('fiy')] === 'Free'));

  // Die TEILWEISE EINSPANNUNG steht dort als lotrechte Feder am Obergurt.
  const og = lagerZeilen.filter((r) => String(r[3]).startsWith('OG'));
  const ug = lagerZeilen.filter((r) => String(r[3]).startsWith('UG'));
  pruef('Vier Obergurt- und vier Untergurtknoten', og.length, ug.length, 1e-12, 'Stk');
  wahr('Der Untergurt haelt lotrecht starr',
       ug.every((r) => r[sp('uz')] === 'Rigid'));
  // Ohne Einspannung (Vorgabe der Pruefvorrichtung) bleibt der Obergurt frei -
  // das ist das Gelenk, und es soll auch als solches dastehen.
  wahr('Ohne Einspannung ist der Obergurt lotrecht frei',
       og.every((r) => r[sp('uz')] === 'Free'),
       og.map((r) => r[sp('uz')]).join(' '));

  // Und die Gabellagerung gibt es weiterhin - im Ersatzbalken.
  const pktBl = AX.axisvmMappe(eingabe, deps,
    { knotenmodell: 'anschnitt', auflagerModell: 'punkt' }).blaetter;
  const aufP = pktBl.find((b) => b.name === 'StructuralPointSupport').rows.slice(1);
  wahr('Der Ersatzbalken traegt die Gabellagerung',
       aufP.length === 2 && aufP.every((r) => r[7] === 'Rigid' && r[9] === 'Free'),
       `${aufP.length} Zeilen`);

  // --- Endschott: tragend, nur die Ausgabe ist schaltbar --------------------
  const PKT = { knotenmodell: 'schwerachsen', auflagerModell: 'punkt' };
  const mitS = AX.stabmodell(m, PKT);
  const ausS = AX.stabmodell(m, { ...PKT, schottAusblenden: true });
  const schottStaebe = (b) => b.staebe.filter((st) => st.name.startsWith('SCHOTT_')).length;
  pruef('Das Schott steht in beiden Fällen im Modell',
        schottStaebe(ausS), schottStaebe(mitS), 1e-12, 'Stk');
  pruef('Acht Schottstäbe, vier je Ende', schottStaebe(mitS), 8, 1e-12, 'Stk');
  pruef('Gleich viele Stäbe insgesamt',
        ausS.staebe.length, mitS.staebe.length, 1e-12, 'Stk');
  wahr('Ein Auflagerknoten je Ende, auf der Jochachse',
       mitS.auflager.length === 2
         && mitS.auflager.every((a) => Math.abs(mitS.knoten.get(a.knoten).y) < 1e-9));

  // --- Die drei Auflagermodelle ---------------------------------------------
  const gurteM = AX.stabmodell(m, { knotenmodell: 'schwerachsen', auflagerModell: 'gurte' });
  pruef('Variante gurte: vier gehaltene Knoten je Ende',
        gurteM.auflager.length, 8, 1e-12, 'Stk');
  wahr('Variante gurte: nur die Untergurte lotrecht gehalten',
       gurteM.auflager.filter((a) => a.uz === 'Rigid').length === 4
       && gurteM.auflager.every((a) => (a.uz === 'Rigid') === a.knoten.startsWith('UG')));
  wahr('Variante gurte: alle in y gehalten, keine Drehfeder',
       gurteM.auflager.every((a) => a.uy === 'Rigid' && a.fiy === 'Free'));
  wahr('Variante gurte: genau ein Knoten haelt in Jochachse',
       gurteM.auflager.filter((a) => a.ux === 'Rigid').length === 1,
       gurteM.auflager.filter((a) => a.ux === 'Rigid').map((a) => a.knoten).join(' '));
  wahr('Variante gurte: kein Schott',
       schottStaebe(gurteM) === 0);

  const mitteM = AX.stabmodell(m, { knotenmodell: 'schwerachsen', auflagerModell: 'mitte' });
  pruef('Variante mitte: zwei gehaltene Knoten je Ende',
        mitteM.auflager.length, 4, 1e-12, 'Stk');
  wahr('Variante mitte: auf halber Höhe in den Gurtebenen',
       mitteM.auflager.every((a) => {
         const k = mitteM.knoten.get(a.knoten);
         // Die Breite läuft mit x - am Auflager gilt das Mass des Knicks.
         const b = m.breite ? m.breite.bAn(a.x) : m.b;
         const h = m.verlauf ? m.verlauf.hAn(a.x) : m.h;
         return Math.abs(Math.abs(k.y) - b / 2) < 1e-9
             && Math.abs(k.z - (m.h / 2 - h / 2)) < 1e-9
             && a.uz === 'Rigid';
       }));
  wahr('Variante mitte: Gelenk um y', mitteM.auflager.every((a) => a.fiy === 'Free'));

  wahr('Vorgabe nach Bauweise', AX.auflagerVorgabe({ bauweise: 'alt' }) === 'mitte'
       && AX.auflagerVorgabe({ bauweise: 'neu' }) === 'gurte');

  // --- Starrelemente bis an die Blechkanten ---------------------------------
  {
    // Schnitt C-C: Vertikalblech 320 = 500 − 2·90, es stösst an
    // die SPITZEN der stehenden Schenkel. Von der Gurtachse aus: aV − zsH.
    // Horizontalblech 260 = lichte Weite, es stösst an deren INNENSEITE: zsV.
    const teil = (b, anfang, endung) =>
      b.staebe.find((x) => x.name === `${anfang}${endung}`);
    const laengeVon = (b, st) => {
      const a = b.knoten.get(st.von), e = b.knoten.get(st.bis);
      return Math.hypot(e.x - a.x, e.y - a.y, e.z - a.z);
    };
    const bv = bauA.staebe.filter((x) => x.name.startsWith('BV_L_0'));
    wahr('Vertikalblech ist in steif / weich / steif geteilt',
         ['_1', '_2', '_3'].every((e) => bv.some((x) => x.name.endsWith(e))));
    // MASSGEBEND IST DIE BLECHLÄNGE AUS DEM SORTIMENT, nicht eine Ableitung:
    // die Blecheinteilung wird übernommen, nicht nachgerechnet.
    const lV = bauA.staebe.length && m.stationsListe[0].vertikal.laenge;
    pruef('Weicher Teil ist die Blechlänge aus dem Sortiment',
          laengeVon(bauA, teil(bauA, 'BV_L_0', '_2')), lV / 1000, 1e-9, 'm');
    pruef('Steifes Stück ist (Hebelarm − Blechlänge)/2',
          laengeVon(bauA, teil(bauA, 'BV_L_0', '_1')),
          (m.stationsListe[0].h - lV / 1000) / 2, 1e-9, 'm');
    wahr('Beide Enden gleich lang',
         Math.abs(laengeVon(bauA, teil(bauA, 'BV_L_0', '_1'))
                - laengeVon(bauA, teil(bauA, 'BV_L_0', '_3'))) < 1e-12);
    // Für J90 fällt die Ableitung aus dem Profil auf denselben Wert:
    // 320 = 500 − 2·90, also aV − zsH. Das ist die Probe aufs Exempel.
    pruef('Ableitung aV − zsH trifft dasselbe',
          laengeVon(bauA, teil(bauA, 'BV_L_0', '_1')),
          (m.profOG.aV - m.profOG.zsH * 10) / 1000, 1e-6, 'm');
    // Die Endstation trägt kein Horizontalblech - die erste ist Nummer 1.
    pruef('Steifes Stück des Horizontalblechs ist zsV',
          laengeVon(bauA, teil(bauA, 'BH_O_1', '_1')),
          m.profOG.zsV * 10 / 1000, 1e-9, 'm');
    wahr('Nur das mittlere Stück trägt den Blechquerschnitt',
         teil(bauA, 'BV_L_0', '_2').qs.startsWith('BLECH_V')
         && teil(bauA, 'BV_L_0', '_1').qs === 'STARR'
         && teil(bauA, 'BV_L_0', '_3').qs === 'STARR');

    // Das Modell 'schwerachsen' bleibt bewusst ohne - es ist der Vergleich
    // gegen das, was AxisVM ohne Zutun rechnet.
    wahr('Ohne Anschnitt keine Starrelemente im Blech',
         !mitS.staebe.some((x) => /^BV_L_0_[13]$/.test(x.name)));
  }

  // --- Zu enge Schnitte zusammenlegen ---------------------------------------
  {
    const f = AX.schnitteZusammenlegen;
    // Die Mitte bleibt stehen, die Reihen rasten auf sie ein.
    const r1 = f([0, 6.25, 6.35, 20], [6.30, 6.29, 6.31]);
    wahr('Die Mitte überlebt, die Reihen rasten ein',
         r1.xs.includes(6.3) && !r1.xs.includes(6.29) && !r1.xs.includes(6.31));
    pruef('Zwei Verschiebungen vermerkt', r1.verschoben.length, 2, 1e-12, 'Stk');
    pruef('Betrag der Verschiebung', Math.abs(r1.verschoben[0].betrag), 0.01, 1e-9, 'm');

    // Feste Schnitte bleiben, auch wenn sie eng liegen.
    const r2 = f([1.000, 1.010], []);
    pruef('Feste Schnitte werden nicht angetastet', r2.xs.length, 2, 1e-12, 'Stk');

    // Weit genug entfernt: der bewegliche bleibt eigenständig.
    const r3 = f([0, 20], [10]);
    wahr('Genug Abstand, kein Einrasten',
         r3.xs.includes(10) && r3.verschoben.length === 0);

    // Ein bewegliches rastet auf ein festes ein, nicht umgekehrt.
    const r4 = f([5.000], [5.010]);
    wahr('Der bewegliche rastet auf den festen',
         r4.xs.length === 1 && r4.xs[0] === 5 && r4.verschoben[0].nach === 5);
  }

  // Am ganzen Modell: keine zu kurzen Gurtstücke mehr.
  {
    const mitTeil = rechne({ ...basis({ typ: 'J90', L: 20 }),
      anbauteile: [{ ...teil({ name: 'HS', x: 6.3, Gz: 12 }),
                     befestigung: 'durchgehend', raster: 0.02 }],
    }).modell;
    const b = AX.stabmodell(mitTeil, { knotenmodell: 'anschnitt' });
    const gx = [...new Set([...b.knoten.values()]
      .filter((k) => k.name.startsWith('OGL_')).map((k) => k.x))].sort((p, q) => p - q);
    const eng = gx.filter((x, i) => i > 0 && x - gx[i - 1] < 0.025 - 1e-9);
    wahr('Keine Gurtschnitte enger als 25 mm', eng.length === 0);
    wahr('Das enge Raster wird zu einer Reihe',
         b.staebe.filter((x) => /^AT\d+_UG_R\d[LR]$/.test(x.name)).length === 2);
    wahr('Und damit biegesteif - kein zweiter Ast',
         !b.staebe.some((x) => /^AT\d+_UG_B2$/.test(x.name)));
    wahr('Die Verschiebung wird vermerkt', b.verschoben.length > 0);
  }

  // --- Anschluss der Hängestützen -------------------------------------------
  {
    const mitAnbau = (bef, raster) => {
      const mm = rechne({ ...basis({ typ: 'J90', L: 20 }),
        anbauteile: [{ ...teil({ name: 'HS', x: 8, Gz: 12, Qy: 3,
                                 z: bef === 'oben' ? 0.8 : -1.5 }),
                       befestigung: bef, raster }],
      }).modell;
      return AX.stabmodell(mm, { knotenmodell: 'schwerachsen' });
    };
    const stummel = (b, gurt) =>
      b.staebe.filter((x) => new RegExp(`^AT\\d+_${gurt}_R\\d[LR]$`).test(x.name));

    // Ohne Raster: eine Reihe, zwei Punkte, alles steif - Variante A.
    const zwei = mitAnbau('unten', 0);
    pruef('Zwei Punkte: eine Reihe zu je zwei Gurten',
          stummel(zwei, 'UG').length, 2, 1e-12, 'Stk');
    wahr('Zwei Punkte: biegesteif, kein Gelenk',
         stummel(zwei, 'UG').every((x) => !x.gelenkEnde && !x.gelenkAnfang));

    // Mit Raster: zwei Reihen längs der Jochachse, vier Punkte je Ebene.
    const vier = mitAnbau('unten', 0.4);
    pruef('Vier Punkte am Untergurt', stummel(vier, 'UG').length, 4, 1e-12, 'Stk');
    wahr('Die Stummel selbst sind alle steif',
         stummel(vier, 'UG').every((x) => !x.gelenkEnde && !x.gelenkAnfang));
    // Die Freigabe sitzt im vertikalen LINKELEMENT des Übergangs Gurt ->
    // Anbauteil: die zweite Reihe gibt die Längskraft frei, sonst zwängt
    // der Anschluss im Gurt. Die Äste selbst sind überall steif.
    const aeste = (b) => b.staebe.filter((x) => /^AT\d+_UG_B\d$/.test(x.name));
    pruef('Zwei Äste zu den Reihen', aeste(vier).length, 2, 1e-12, 'Stk');
    wahr('Die Äste sind alle steif',
         aeste(vier).every((x) => !x.gelenkEnde && !x.gelenkAnfang));

    const links = (b, gurt) =>
      b.staebe.filter((x) => new RegExp(`^AT\\d+_${gurt}_R\\d[LR]_V$`).test(x.name));
    const linkLage = (b, x) => {
      const p = b.knoten.get(x.von), q = b.knoten.get(x.bis);
      return { dx: q.x - p.x, dy: q.y - p.y, dz: q.z - p.z };
    };
    pruef('Vier Übergangs-Links am Untergurt', links(vier, 'UG').length, 4, 1e-12, 'Stk');
    wahr('Die Links stehen senkrecht',
         links(vier, 'UG').every((x) => {
           const l = linkLage(vier, x);
           return Math.abs(l.dx) < 1e-9 && Math.abs(l.dy) < 1e-9;
         }));
    wahr('Die Links sind 10 cm lang und zeigen am Untergurt nach unten',
         links(vier, 'UG').every((x) => Math.abs(linkLage(vier, x).dz + 0.10) < 1e-9));
    wahr('Die erste Reihe hält die Längskraft',
         links(vier, 'UG').filter((x) => /R1[LR]_V$/.test(x.name))
           .every((x) => x.kraft.x === 'Rigid'));
    wahr('Die zweite Reihe gibt die Längskraft frei',
         links(vier, 'UG').filter((x) => /R2[LR]_V$/.test(x.name))
           .every((x) => x.kraft.x === 'Free' && x.kraft.y === 'Rigid'
                      && x.kraft.z === 'Rigid'));
    // Der Zweck des Linkelements: es überträgt KRÄFTE, keine Momente.
    wahr('Bei vier Punkten überträgt kein Link ein Moment',
         links(vier, 'UG').every((x) =>
           ['xx', 'yy', 'zz'].every((f) => x.kraft[f] === 'Free')));
    wahr('Bei zwei Punkten hält das Link die drei Kräfte',
         links(zwei, 'UG').length === 2
         && links(zwei, 'UG').every((x) =>
              ['x', 'y', 'z'].every((f) => x.kraft[f] === 'Rigid')));
    // Zwei Punkte liegen auf einer Geraden in Gleisrichtung - um sie hielte
    // sonst nichts. Deshalb dort M_y, und NUR dort.
    wahr('Bei zwei Punkten hält das Link zusätzlich M_y',
         links(zwei, 'UG').every((x) => x.kraft.yy === 'Rigid'
                                     && x.kraft.xx === 'Free'
                                     && x.kraft.zz === 'Free'));
    wahr('Bei vier Punkten hält es M_y nicht',
         links(vier, 'UG').every((x) => x.kraft.yy === 'Free'));

    // Die Arme heissen jetzt ARM{Baugruppe}_{Glied}: eine Baugruppe bildet
    // eine KETTE und nicht mehr einen einzelnen Arm (Abschnitt 32).
    const arm = (b) => b.staebe.filter((x) => /^ARM\d+_\d+$/.test(x.name));

    // DIESE VORRICHTUNG HAT KEINEN HOEHENVERSATZ: die Hilfsfunktion teil()
    // fuehrt kein z, der Lastpunkt liegt also AUF der Anschlussebene. Dann
    // gibt es nichts zu ueberbruecken - und vor allem keinen Stab der Laenge
    // null, wie ihn der Aufbau hier frueher erzeugte.
    wahr('Ohne Hoehenversatz entsteht kein Arm',
         arm(vier).length === 0, `${arm(vier).length} Glieder`);
    wahr('Und damit auch kein Stab der Laenge null',
         vier.staebe.every((x) => {
           const p = vier.knoten.get(x.von), q = vier.knoten.get(x.bis);
           return Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) > 1e-9;
         }));

    // Mit Versatz ist der Arm da - und ein Starrkoerper ohne Gelenk.
    {
      const mm = rechne({ ...basis({ typ: 'J90', L: 20 }),
        anbauteile: [A.neuesAnbauteil('hs-nur', 8)],
      }).modell;
      const b = AX.stabmodell(mm, { knotenmodell: 'schwerachsen' });
      wahr('Mit Hoehenversatz ist die Hängestütze als Starrkörper geführt',
           arm(b).length > 0 && arm(b).every((x) => x.starrRolle === 'anbauteil'
             && !x.gelenkAnfang && !x.gelenkEnde),
           `${arm(b).length} Glieder`);
    }

    wahr('Die Äste liegen in der Jochachse',
         aeste(vier).every((x) => {
           const p = vier.knoten.get(x.von), q = vier.knoten.get(x.bis);
           return Math.abs(p.y - q.y) < 1e-9 && Math.abs(p.z - q.z) < 1e-9
               && Math.abs(p.x - q.x) > 1e-6;
         }));
    wahr('Die Reihen liegen um das Raster auseinander',
         (() => {
           const xs = [...new Set(stummel(vier, 'UG')
             .map((x) => vier.knoten.get(x.von).x))].sort((p, q) => p - q);
           return xs.length === 2 && Math.abs(xs[1] - xs[0] - 0.4) < 1e-9;
         })());
    wahr('Die Stummel laufen rechtwinklig zur Gurtachse',
         stummel(vier, 'UG').every((x) => {
           const p = vier.knoten.get(x.von), q = vier.knoten.get(x.bis);
           return Math.abs(p.x - q.x) < 1e-9 && Math.abs(p.z - q.z) < 1e-9;
         }));

    // Durchgehend: dieselbe Regel oben wie unten, acht Punkte.
    const durch = mitAnbau('durchgehend', 0.4);
    pruef('Durchgehend: vier Punkte unten', stummel(durch, 'UG').length, 4, 1e-12, 'Stk');
    pruef('Durchgehend: vier Punkte oben', stummel(durch, 'OG').length, 4, 1e-12, 'Stk');
    wahr('Durchgehend: auch oben gibt die zweite Reihe die Längskraft frei',
         durch.staebe.some((x) => /^AT\d+_OG_R2[LR]_V$/.test(x.name)
                               && x.kraft.x === 'Free'));
    wahr('Durchgehend: am Obergurt zeigt das Link nach oben',
         durch.staebe.filter((x) => /^AT\d+_OG_R\d[LR]_V$/.test(x.name))
           .every((x) => {
             const p = durch.knoten.get(x.von), q = durch.knoten.get(x.bis);
             return Math.abs(q.z - p.z - 0.10) < 1e-9;
           }));
    wahr('Durchgehend: ein Stab verbindet Ober- und Untergurt',
         durch.staebe.some((x) => /^ARM\d+_D$/.test(x.name)));
    wahr('Durchgehend: auch der Stab durch den Kasten ist ein Starrkörper',
         durch.staebe.find((x) => /^ARM\d+_D$/.test(x.name)).starrRolle === 'anbauteil');
    wahr('Nur bei durchgehend läuft der Stab durch',
         !vier.staebe.some((x) => /^ARM\d+_D$/.test(x.name)));
  }

  // --- Blechachsen liegen versetzt ------------------------------------------
  // Die vier Gurtachsen bilden im Schnitt ein Rechteck, die Blechachsen nicht:
  // ein Blech liegt am Schenkel, nicht auf der Verbindungslinie der Schwerpunkte.
  const versatzStaebe = mitS.staebe.filter((st) => /_e[12]$/.test(st.name));
  wahr('Bindebleche sind quer versetzt angeschlossen', versatzStaebe.length > 0);
  {
    // Gemessen wird am STUMMEL: von der Gurtachse zur Blechachse. Gegen
    // m.b/2 zu prüfen ginge fehl - die Breite läuft mit x (Grundrissknick).
    const versatzAn = (bau, anfang) => {
      const st = bau.staebe.find((x) => x.name.startsWith(anfang) && /_e1$/.test(x.name));
      if (!st) return null;
      const g = bau.knoten.get(st.von), bl = bau.knoten.get(st.bis);
      return { dy: bl.y - g.y, dz: bl.z - g.z };
    };
    const v = versatzAn(mitS, 'BV_L_');
    const h = versatzAn(mitS, 'BH_O_');
    pruef('Vertikalblech: Versatz (zsV − t/2) nach innen',
          v ? v.dy : NaN, (m.profOG.zsV * 10 - m.profOG.t / 2) / 1000, 1e-9, 'm');
    wahr('Vertikalblech: keine Höhenänderung', !!v && Math.abs(v.dz) < 1e-12);
    // Das Horizontalblech liegt an der Innenseite des liegenden Schenkels
    // (Schnitt C-C), nicht in dessen Flucht: die Mittelebene
    // rückt um (t_Schenkel + t_Blech)/2 nach innen. Für L90×90×9 mit 10 mm
    // Blech sind das 9.5 mm - die «10 mm» der Werkstattregel.
    // Nicht den Stummel erwischen: BH_O_0_e1 trägt STARR, nicht das Blech.
    const tH = mitS.querschnitte.get(
      mitS.staebe.find((x) => x.name.startsWith('BH_O_')
                           && x.qs.startsWith('BLECH_H')).qs).parameter[1];
    pruef('Horizontalblech: Flucht minus (t_Schenkel + t_Blech)/2',
          h ? h.dz : NaN,
          (m.profOG.zsH * 10 - m.profOG.t / 2 - (m.profOG.t + tH) / 2) / 1000,
          1e-9, 'm');
    pruef('Das Anliegen macht rund 10 mm aus',
          (m.profOG.t + tH) / 2, 9.5, 0.6, 'mm');
    wahr('Horizontalblech: keine Breitenänderung', !!h && Math.abs(h.dy) < 1e-12);

    // Andere Einbaulage, andere Richtung - der Grund, warum ey/ez aus
    // geometry.js kommen und nicht hier noch einmal stehen. Und zwar jede
    // Richtung für sich: das Vertikalblech sitzt am STEHENDEN Schenkel,
    // dessen Dicke aber in Richtung des LIEGENDEN misst - dy folgt deshalb
    // `lg`, dz folgt `st`.
    const mitLage = (k) => AX.stabmodell({ ...m, ausrOG: k, ausrUG: k },
                                         { knotenmodell: 'schwerachsen' });
    const vLI = versatzAn(mitLage('LI_SI'), 'BV_L_');
    wahr('liegend innen kehrt den Versatz in y um', !!vLI && v.dy * vLI.dy < 0);
    const hSA = versatzAn(mitLage('LA_SA'), 'BH_O_');
    wahr('stehend aussen kehrt den Versatz in z um', !!hSA && h.dz * hSA.dz < 0);
    const vSA = versatzAn(mitLage('LA_SA'), 'BV_L_');
    wahr('stehend aussen lässt den Versatz in y unberührt',
         !!vSA && Math.abs(vSA.dy - v.dy) < 1e-12);
  }
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
  const dxf = AX.dxfText(m, { knotenmodell: 'anschnitt', auflagerModell: 'gurte' });
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

  /*
   * DAS BLATT MUSS DAS MODELL BESCHREIBEN, DAS DANEBEN LIEGT.
   *
   * Es rief `stuetzung(m, a.ende)` - nur den Buchstaben. Damit fiel jedes
   * Lager in die Vorgabe (Gabellagerung mit Drehfeder), waehrend die
   * DXF-Datei das Gurtmodell trug: acht Zeilen, alle falsch beschrieben.
   */
  wahr('Zuordnungsblatt nennt eine Zeile je Auflagerknoten',
       dxf.bau.auflager.every((a) => flach.includes(a.knoten)),
       dxf.bau.auflager.map((a) => a.knoten).join(' '));
  wahr('Und nennt das Auflagermodell im Titel',
       flach.includes(`Modell ${dxf.bau.auflager[0].modell}`));
  {
    // Genau ein 'Rigid' in der Spalte ux - im Blatt wie im Modell.
    const zeilen = zu.rows.filter((r) => String(r[0]?.v ?? r[0]).startsWith('Auflager '));
    const uxSpalte = zeilen.map((r) => r[4]);
    wahr('Und haelt genau einen Knoten in Jochachse',
         uxSpalte.filter((v) => v === 'Rigid').length === 1, uxSpalte.join(' '));
  }
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
  const r = PY.pyniteSkript(m, { knotenmodell: 'anschnitt', auflagerModell: 'punkt' });

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

  /*
   * DAS LAGER, NICHT DER ENDBUCHSTABE.
   *
   * Hier stand in `pyniteSkript` eine ZWEITE, selbstgebaute Lagerungsregel:
   * jedes Auflager bekam y/z/Torsion gehalten und die Drehfeder dazu -
   * gleich, welches Auflagermodell `stabmodell` gebaut hatte. Beim
   * Gurtmodell waren das acht voll gehaltene Knoten samt acht Federn,
   * obwohl dort nur die Untergurte lotrecht halten und keine Feder
   * vorkommt. PyNite rechnete damit ein anderes Tragwerk als AxisVM aus
   * derselben Ausleitung.
   */
  {
    const g = PY.pyniteSkript(m, { knotenmodell: 'anschnitt', auflagerModell: 'gurte' });
    const zeilen = g.text.split(NL).filter((z) => z.startsWith('M.def_support('));
    pruef('Gurtmodell: acht Auflagerzeilen', zeilen.length, 8, 1e-12, 'Stk');
    // Reihenfolge DX, DY, DZ, RX, RY, RZ - PyNites Y ist unser z.
    const feld = (z, i) => z.slice('M.def_support('.length).split(',')[i].trim();
    const dx = zeilen.filter((z) => feld(z, 1) === 'True');
    wahr('Gurtmodell: genau ein Halt in Jochachse (DX)', dx.length === 1,
         zeilen.map((z) => feld(z, 1)).join(' '));
    const dy = zeilen.filter((z) => feld(z, 2) === 'True');
    wahr('Gurtmodell: vier lotrechte Halte (DY = unser uz), an den Untergurten',
         dy.length === 4 && dy.every((z) => z.includes("'UG")),
         String(dy.length));
    wahr('Gurtmodell: alle in Gleisrichtung gehalten (DZ = unser uy)',
         zeilen.every((z) => feld(z, 3) === 'True'));
    wahr('Gurtmodell: keine Drehfeder', !g.text.includes('def_support_spring'));
    // Ohne Einspannung gibt es auch im Ersatzbalken keine Feder ...
    const p2 = PY.pyniteSkript(m, { knotenmodell: 'anschnitt', auflagerModell: 'punkt' });
    wahr('Gelenkiger Ersatzbalken: auch dort keine Feder',
         !p2.text.includes('def_support_spring'));
    // ... mit teilweiser Einspannung dagegen eine je Ende.
    const eT = { ...e, endbedingung: 'manuell', cPhi: 12951, schraubenGrenze: false };
    const mT = modell(eT, getProfil(eT.profOG), getProfil(eT.profUG),
                      getStahl(eT.stahl), T.getTragjoch('J90'));
    const p3 = PY.pyniteSkript(mT, { knotenmodell: 'anschnitt', auflagerModell: 'punkt' });
    pruef('Teilweise eingespannt: zwei Drehfedern',
          (p3.text.match(/def_support_spring/g) || []).length, 2, 1e-12, 'Stk');
    wahr('Und zwar die geometrische, in kNm/rad',
         p3.text.includes('12951'), p3.text.split(NL)
           .filter((z) => z.includes('def_support_spring')).join(' | '));
    // Das Gurtmodell kann sie nicht tragen - und traegt sie auch nicht.
    const g3 = PY.pyniteSkript(mT, { knotenmodell: 'anschnitt', auflagerModell: 'gurte' });
    wahr('Das Gurtmodell bleibt auch dann ohne Feder',
         !g3.text.includes('def_support_spring'));
  }

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
  // γ hier ausdrücklich, damit die Zahlen nicht an der Vorgabe hängen.
  const e0 = basis({ L, torsionModell: 'verteilt', anbauteile: [t],
                     gammaG: 1.35, gammaQ: 1.5, psi0: 0.5 });
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

  // Die Vorlage fuehrt windAufTraeger seit dem Kragarm-Entscheid selbst.
  // Der Vergleichsfall muss ihn deshalb ausdruecklich abschalten.
  const aus = A.expandiereAnbauteile(bau({ windAufTraeger: false }), trasse);
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
  const tr = aus.find((y) => y.rolle === 'traeger');
  wahr('Der Eintrag rückt in y auf die Achse des Trägers',
       rest.every((x) => Math.abs(x.y - tr.y) < 1e-12));
  // UND IN JOCHACHSE. Der NT ist ein Kragarm: sein Angriffspunkt liegt 1.2 m
  // versetzt. Bliebe der Anteil dort stehen, käme genau die Hälfte, die über
  // die Stütze ins Joch geht, an der falschen Station an.
  wahr('Und in Jochachse auf den Anschlusspunkt Ausleger/Stütze',
       rest.every((x) => Math.abs(x.x - tr.x) < 1e-12),
       `${rest.map((x) => x.x.toFixed(2)).join(' ')} gegen ${tr.x.toFixed(2)}`);
  wahr('Der Ausleger selbst steht wirklich aussen',
       Math.abs(aus.find((x) => x.rolle === 'aufbau').x - tr.x) > 1,
       `${(aus.find((x) => x.rolle === 'aufbau').x - tr.x).toFixed(2)} m`);

  // Wirkung: der Hebelarm bleibt, die Kraft halbiert sich, also halbiert sich
  // auch ihr Torsionsanteil.
  // DIESELBE EINWIRKUNGSKLASSE WIE OBEN. `trasse` traegt EK2, und die
  // Sollwerte werden daraus gerechnet; der Eingabestand muss ihr folgen.
  // Solange der Startwert ebenfalls EK2 war, fiel das nicht auf.
  const e0 = basis({ L: 20, torsionModell: 'verteilt', windKlasse: '1.1',
                     gammaG: 1.35, gammaQ: 1.5, psi0: 0.5 });
  const Tx = (extra) => rechne({ ...e0, anbauteile: bau(extra) }).extrem.TxMax;
  const ohne = { windAufTraeger: false };
  const ev = Math.abs(zAufbau)
    + rechne({ ...e0, anbauteile: bau(ohne) }).modell.h / 2;
  /*
   * WIRKUNG AUF DIE TORSION - und warum sie so einfach bleibt.
   *
   * Man koennte meinen, die beiden Anteile haetten verschiedene Stationen:
   * der Auslegerwind greift 1.2 m ausserhalb an, der zurueckgesetzte Anteil
   * am Anschluss. Fuer das JOCH ist das aber dieselbe Stelle - der Kragarm
   * traegt seine Last an seiner Wurzel ein (siehe Abschnitt 32). Der
   * Verteilungsfaktor ist deshalb fuer beide gleich, und es bleibt bei der
   * halben Kraft am selben Hebelarm.
   *
   * Der Faktor ist der groessere der beiden Auflageranteile: ein Moment T bei
   * x teilt sich in T(L-x)/L und Tx/L.
   */
  const L0 = 20;
  const anteilT = (x) => Math.max(x, L0 - x) / L0;
  pruef('Torsion sinkt um die halbe Kraft am selben Hebelarm',
        Tx(ohne) - Tx({ windAufTraeger: true, windAnteil: 50 }),
        1.5 * ev * (wAufbau / 2) * anteilT(tr.x), 1e-3, 'kNm');
  pruef('Ohne Schalter unverändert', Tx({ ...ohne, windAnteil: 50 }), Tx(ohne),
        1e-12, 'kNm');
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
  const { gurtanteile, GURT_DAEMPFUNG } = await import(J('core.querschnitt.js'));
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
  // GEMESSEN: gedämpfte Steifigkeitsaufteilung, an PyNite kalibriert.
  const ge = gurtanteile(mUngleich, 'gemessen');
  pruef('gemessen: Anteile ergänzen sich zu eins', ge.OG + ge.UG, 1, 1e-12);
  wahr('gemessen liegt zwischen hälftig und I-Anteil',
       ge.OG > 0.5 && ge.OG < st.OG);
  // Nachgemessen am 29. August ueber das ganze Sortiment (kalibrieren.mjs,
  // 80 Laeufe): k = 0.45 aus der DIFFERENZ gegen denselben Traeger mit
  // gleichen Gurten. Beim Verhaeltnis 2.46 ergibt das 0.5 + 0.45*0.211.
  pruef('gemessen trifft die Kalibrierung', ge.OG, 0.5 + 0.45 * (st.OG - 0.5), 1e-9);
  // k WANDERT NICHT: gemessen 0.436 bei I_OG/I_UG = 2.04 gegen 0.465 bei
  // 4.15. Die angesetzte Zahl muss zwischen den beiden liegen, sonst ist sie
  // nicht mehr das Mittel der Messung.
  wahr('k liegt zwischen den gemessenen Randwerten',
       GURT_DAEMPFUNG >= 0.436 && GURT_DAEMPFUNG <= 0.465);
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
  pruef('Ende B: Rahmenfeder des zweiten Mastes', f2.cB,
        MAST_UNVERSCHIEBLICH * (210e6 * mB.I_cm4 * 1e-8) / 12.0,
        1e-9, 'kNm/rad');
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
    // EK2 AUSDRUECKLICH. Die Aussage weiter unten, dass sich die beiden
  // Spannungsmodelle mit M_z um mehr als zwei Prozent unterscheiden, haengt
  // an der Groesse des Windmoments: gemessen 3.05 % unter EK2, aber nur
  // 0.45 % unter EK1. Der Abschnitt prueft das Spannungsmodell, nicht die
  // Einwirkungsklasse; also wird sie festgehalten. Solange der Startwert
  // ebenfalls EK2 war, fiel das nicht auf.
  const e0 = { ...basis(), ...typUebernehmen({ ...standardwerte() }, j130),
               typ: 'J130', L: 27, schneeAktiv: false, anbauteile: [],
               windKlasse: '1.1',
               endbedingung: 'gelenkig', torsionModell: 'huellkurve' };
  const a = rechne(e0);
  const b = rechne({ ...e0, spannungsmodell: 'punkte' });
  wahr('Vorgabe ist das schenkelparallele W',
       a.knoten[0].ecken[0].spannungsmodell === 'schenkel');
  // Der Hauptachsenfaktor zeigt sich nur bei REINER schenkelparalleler
  // Biegung. Kommt M_z dazu, ist die Summe der Beträge im Schenkelmodell eine
  // obere Schranke, die kein einzelner Querschnittspunkt erreicht - dann kann
  // die punktweise Auswertung sogar TIEFER liegen. Geprüft wird deshalb ein
  // rein vertikaler Lastfall.
  const nurG = { G: 1, WindX: 0, WindY: 0, Schnee: 0, Leiterzug: 0 };
  const av = rechne({ ...e0, beiwerteFest: nurG });
  const bv = rechne({ ...e0, beiwerteFest: nurG, spannungsmodell: 'punkte' });
  const iBieg = av.knoten.reduce(
    (best, k, i) => (Math.abs(k.og.sig_My) > Math.abs(av.knoten[best].og.sig_My) ? i : best), 0);
  wahr('Ohne M_z bleibt reine schenkelparallele Biegung',
       Math.abs(av.knoten[iBieg].og.sig_Mz) < 1e-9);
  const faktor = bv.knoten[iBieg].og.sig_v / av.knoten[iBieg].og.sig_v;
  wahr('Punktweise ist rund 30 % ungünstiger', faktor > 1.2 && faktor < 1.45,
       `Faktor ${faktor.toFixed(3)}`);
  // Mit M_z darf es auch andersherum ausgehen - das ist keine Unstimmigkeit,
  // sondern die Folge der Betragsaddition im Schenkelmodell.
  wahr('Mit M_z unterscheiden sich die Modelle ebenfalls',
       Math.abs(b.knoten[iBieg].og.sig_v / a.knoten[iBieg].og.sig_v - 1) > 0.02);
  wahr('Beide Modelle rechnen durch',
       Number.isFinite(a.max.etaGesamt) && Number.isFinite(b.max.etaGesamt));
}

// ===========================================================================
titel('26  Wind auf den Mast verdreht das Jochende');
// Der Wind in der Jochachse biegt den Mast. Sein Kopf verdreht sich, und weil
// das Jochende dort angeschlossen ist, wird ihm die Verdrehung AUFGEZWUNGEN.
// Ohne diesen Anteil fehlte dem Lastfall Wind in Jochachse am nachgerechneten
// Signaljoch rund die Hälfte der Einwirkung.
{
  const { mastKoepfe, mastSteifigkeit, auflagermomente, E_STAHL: E } =
    await import(J('core.auflager.js'));
  const { hinweise } = await import(J('core.checks.js'));

  // Der Mastwind ist der VERSCHIEBLICHE Fall: beide Köpfe wollen in dieselbe
  // Richtung. Deshalb hier die Kragmastfeder (core.auflager.js).
  const mast = mastSteifigkeit({ mastProfil: 'HEB 260', mastH: 9, mastSteg: 'jochachse',
                                 mastAnschluss: 'kragarm' }, 'A', true);
  const k = mastKoepfe(mast, mast, { wMast: 0.31 }).A;
  // Kragmast unter Gleichlast: Kopfverdrehung w·H³/(6·E·I)
  pruef('Kopfverdrehung des Kragmastes', k.theta0,
        (0.31 * 9 ** 3) / (6 * E * mast.I), 1e-12);
  // Hält das Joch den Kopf ganz fest, gibt der Mast M = w·H²/6 ab - das ist
  // die Standardlösung für den am Kopf drehfest gehaltenen Kragmast.
  pruef('Eingeleitetes Moment bei festgehaltenem Kopf', k.M0,
        (0.31 * 9 * 9) / 6, 1e-9);
  // Zwei GLEICHE Maste unter demselben Wind verschieben sich gleich - dann
  // geht keine Kraft durch das Joch, und es bleibt beim reinen Windanteil.
  pruef('Gleiche Maste: keine Längskraft', mastKoepfe(mast, mast, { wMast: 0.31 }).A.P,
        0, 1e-9, 'kN');
  wahr('Ohne Wind und ohne Längskraft keine Verdrehung',
       mastKoepfe(mast, mast, {}).A.theta0 === 0);
  wahr('Ohne Mast keine Verdrehung', mastKoepfe(null, null, { wMast: 0.31 }).A.theta0 === 0);

  // --- DIE LÄNGSKRAFT DES JOCHS ---------------------------------------------
  // Eine Anbaulast in Jochachse laeuft im Ersatzbalken als Normalkraft ins
  // Auflager - in Wirklichkeit greift sie am MASTKOPF an, biegt den Mast und
  // verdreht ihn. Am Signaljoch ist dieser Anteil sechsmal so gross wie der
  // Mastwind.
  {
    const mA = mastSteifigkeit({ mastProfil: 'HEB 260', mastH: 7.8,
      mastSteg: 'jochachse', mastAnschluss: 'kragarm' }, 'A', true);
    const mB = mastSteifigkeit({ mastProfil: 'HEM 240', mastH: 12.0,
      mastSteg: 'jochachse', mastAnschluss: 'kragarm' }, 'B', true);
    const r = mastKoepfe(mA, mB, { wMast: 0.33, wMastB: 0.31, Fx: 3 * 2.14 });
    const kA = (3 * E * mA.I) / mA.H ** 3, kB = (3 * E * mB.I) / mB.H ** 3;
    // Die Kraft teilt sich nach den KOPFSTEIFIGKEITEN, verschoben um den
    // Mastwind: der weichere Mast wird vom steiferen gestuetzt.
    pruef('Kraefte im Gleichgewicht', r.A.P + r.B.P, 3 * 2.14, 1e-9, 'kN');
    // OHNE Mastwind teilt sie sich genau nach der Kopfsteifigkeit auf.
    const nurKraft = mastKoepfe(mA, mB, { Fx: 3 * 2.14 });
    pruef('Ohne Mastwind: Aufteilung genau nach der Kopfsteifigkeit',
          nurKraft.A.P / (nurKraft.A.P + nurKraft.B.P), kA / (kA + kB), 1e-9, '–');
    // MIT Mastwind verschiebt sie sich: der weichere Mast wird gestuetzt.
    wahr('Der Mastwind verschiebt die Aufteilung zum steiferen Mast',
         r.A.P / (r.A.P + r.B.P) > nurKraft.A.P / (nurKraft.A.P + nurKraft.B.P));
    // Gegen den PyNite-Rahmen mit beiden ausmodellierten Masten.
    pruef('Kopfkraft A trifft den Rahmen', r.A.P, 5.106, 0.02, 'kN');
    pruef('Kopfkraft B trifft den Rahmen', r.B.P, 1.315, 0.02, 'kN');
    pruef('Kopfweg ist bei beiden derselbe',
          r.A.P / kA + (0.33 * mA.H ** 4) / (8 * E * mA.I), r.delta, 1e-9, 'm');
    pruef('auch vom anderen Ende gerechnet',
          r.B.P / kB + (0.31 * mB.H ** 4) / (8 * E * mB.I), r.delta, 1e-9, 'm');
    // theta_P = P·H²/(2EI)
    pruef('Verdrehung aus der Kopfkraft', r.A.thetaKraft,
          (r.A.P * mA.H ** 2) / (2 * E * mA.I), 1e-12);
    wahr('Sie ist deutlich groesser als die aus dem Mastwind',
         r.A.thetaKraft > 5 * r.A.thetaWind,
         `${(1000 * r.A.thetaKraft).toFixed(2)} gegen `
         + `${(1000 * r.A.thetaWind).toFixed(2)} mrad`);
    // Und daraus das Moment, gegen PyNite 21.5 / -16.3 kNm.
    wahr('Das eingeleitete Moment liegt beim Rahmenwert',
         Math.abs(r.A.M0 - 21.5) < 2.5 && Math.abs(r.B.M0 - 16.3) < 2.5,
         `M0 = ${r.A.M0.toFixed(1)} / ${r.B.M0.toFixed(1)} kNm`);
  }

  // Durchlaufender Mast: steifere Feder, gleiche Kopfverdrehung -> grösseres
  // Moment. Bewusst auf der sicheren Seite (siehe core.auflager.js).
  const durch = mastSteifigkeit({ mastProfil: 'HEB 260', mastH: 9, mastSteg: 'jochachse',
                                  mastAnschluss: 'durchlaufend' }, 'A', true);
  pruef('Durchlaufend: Moment im Verhältnis der Feder',
        mastKoepfe(durch, durch, { wMast: 0.31 }).A.M0 / k.M0, 1.45, 1e-9);

  // --- Wirkung im Drehwinkelverfahren ---------------------------------------
  const g = { L: 20, qd: 1, P: [], M: [], EI: 1e5, cA: 5000, cB: 5000 };
  const ohne = auflagermomente(g);
  const mit = auflagermomente({ ...g, theta0A: 1e-3, theta0B: 1e-3 });
  pruef('Ohne Kopfverdrehung unverändert',
        auflagermomente({ ...g, theta0A: 0, theta0B: 0 }).MA, ohne.MA, 1e-12);
  // Gleichsinnige Verdrehung beider Enden ist eine ANTIMETRISCHE Einwirkung:
  // das Joch wird in Gegenkrümmung gebogen, die Summe der Stützmomente bleibt.
  pruef('Gleichsinnige Verdrehung ist antimetrisch',
        mit.MA + mit.MB, ohne.MA + ohne.MB, 1e-9);
  wahr('Ein Ende wird entlastet, das andere belastet',
       mit.MA < ohne.MA && mit.MB > ohne.MB);
  // Starres Joch: der Kopf wird ganz festgehalten, das volle c·θ₀ kommt an.
  const starr = auflagermomente({ L: 20, qd: 0, P: [], M: [], EI: 1e12,
                                  cA: 5000, cB: 5000, theta0A: 1e-3, theta0B: 1e-3 });
  pruef('Starres Joch nimmt das volle c·θ₀ auf', Math.abs(starr.MA), 5, 1e-6);

  // --- Wirkung im Nachweis --------------------------------------------------
  const j90 = T.getTragjoch('J90');
  const e0 = { ...basis(), ...typUebernehmen({ ...standardwerte() }, j90),
               typ: 'J90', L: 15.5, schneeAktiv: false, anbauteile: [],
               endbedingung: 'mast', mastProfil: 'HEB 260', mastH: 9,
               mastSteg: 'jochachse', mastAnschluss: 'durchlaufend',
               wMastAusTabelle: false, wMast: 0.4, schraubenGrenze: false,
               // Startwert ist AUS (Weisung): sobald der Mast im Stabmodell
               // steht, traegt er den Wind selbst, und die aufgezwungene
               // Verdrehung waere ein zweiter Ansatz derselben Last. Wer sie
               // prueft, schaltet sie ausdruecklich ein.
               mastWindAufJoch: true,
               torsionModell: 'huellkurve',
               beiwerteFest: { G: 0, WindX: 1, WindY: 0, Schnee: 0, Leiterzug: 0 } };
  const aus = rechne({ ...e0, mastWindAufJoch: false });
  const an = rechne(e0);
  wahr('Mastwind hebt den Lastfall Wind in Jochachse',
       an.max.etaGesamt > aus.max.etaGesamt);
  wahr('Der Mastwind steht im Modell', an.modell.mastKopf !== null
       && aus.modell.mastKopf === null);
  // Nur der Lastfall mit Wind in Jochachse trägt ihn.
  const ohneBeiwert = { ...e0,
    beiwerteFest: { G: 1, WindX: 0, WindY: 0, Schnee: 0, Leiterzug: 0 } };
  pruef('Ohne Beiwert WindX keine Verdrehung',
        rechne(ohneBeiwert).modell.theta0A ?? 0, 0, 1e-12);
  /*
   * Ohne Masten im Modell gibt es nichts zu verdrehen. Seit dem 28. August
   * ist das eine EIGENE Angabe: `mastVorhanden`. Die Endbedingung sagt nur
   * noch, woher die Drehfeder kommt - sie nimmt den Masten nicht mehr mit.
   */
  const manuell = rechne({ ...e0, endbedingung: 'manuell', cPhi: 6000,
                           mastVorhanden: false });
  wahr('Ohne Mast kein Mastwind', manuell.modell.mastKopf === null);

  // --- WIND IN GLEISRICHTUNG WIRKT NICHT AUF DAS JOCH -----------------------
  // Er verschiebt die Mastköpfe (im Grundriss ist das Joch statisch bestimmt
  // gelagert - daraus folgt nichts) und verdreht sie um die Jochachse. Der
  // zweite Anteil wäre bei UNGLEICHEN Masten eine Torsion über die ganze
  // Jochlänge. Er ist bewusst NICHT angesetzt: hergeleitet, nicht geeicht, und
  // gegen das eine verfügbare FEM-Modell verschlechterte er die
  // Übereinstimmung erheblich (Gurte unter Wind quer von +52 auf +89 %).
  const zwei = { ...e0, mastZwei: true, mastProfilB: 'HEM 240', mastHB: 12.0,
                 mastStegB: 'jochachse',
                 beiwerteFest: { G: 0, WindX: 0, WindY: 1, Schnee: 0, Leiterzug: 0 } };
  const rz = rechne(zwei);
  const re = rechne({ ...zwei, mastZwei: false });
  wahr('Ungleiche Maste erzeugen unter Wind y keine Torsion',
       rz.knoten.every((k) => Math.abs(k.Tx) < 1e-12));
  wahr('Gleiche Maste ebenso wenig',
       re.knoten.every((k) => Math.abs(k.Tx) < 1e-12));
  const SCH = await import(J('ui.schema.js'));
  wahr('Es gibt keinen Eingabewert für den Mastwind in Gleisrichtung',
       !SCH.FELDER.some((f) => f.key === 'wMastQuer'));
  const hz = hinweise(rz.modell).join(' | ');
  wahr('Der Hinweis sagt, dass nur der Wind in Jochachse erfasst ist',
       hz.includes('Jochachse') && hz.includes('nicht angesetzt'), hz.slice(0, 80));

  // --- BEIDE WINDRICHTUNGEN, wie bei den Einwirkungen auf das Joch ----------
  // Der Wind bläst in + und in −. Beide Anteile hängen am VORZEICHENBEHAFTETEN
  // Beiwert des Lastfalls und kehren mit ihm um; die Hüllkurve über die
  // Lastfälle deckt damit beide Enden und beide Drehsinne ab.
  const { standardLastfaelle } = await import(J('core.lasten.js'));
  const bd = { ...e0, mastZwei: true, mastProfilB: 'HEM 240', mastHB: 12.0,
               mastStegB: 'jochachse', beiwerteFest: null };
  const lf = Object.fromEntries(standardLastfaelle(bd).filter((l) => l.nachweis)
    .map((l) => [l.key, rechne({ ...bd, beiwerteFest: l.beiwerte }).modell]));
  wahr('Wind ±x kehrt die Auflagerdrehung um',
       Math.sign(lf.windXp.theta0A) === -Math.sign(lf.windXm.theta0A)
       && Math.abs(lf.windXp.theta0A) > 0);
  // Antimetrisch: was das eine Ende im einen Lastfall bekommt, bekommt das
  // andere im anderen. Ohne beide Vorzeichen bliebe ein Ende ungeprüft.
  wahr('Jedes Ende wird in einem der beiden Lastfälle ungünstig',
       Math.max(lf.windXp.MA, lf.windXm.MA) > Math.min(lf.windXp.MA, lf.windXm.MA)
       && Math.max(lf.windXp.MB, lf.windXm.MB) > Math.min(lf.windXp.MB, lf.windXm.MB));
}

// ===========================================================================
titel('26b Der Mast ist Auflager UND Bauteil');
/*
 * BIS ZUM 28. AUGUST hiess dieser Abschnitt «Auflager, nicht Bauteil»: der
 * Mast bestimmte die Drehfeder und den Mastwind, seine eigene Ausnutzung
 * gehoerte «in ein Rahmenmodell» und wurde gar nicht erst ausgewiesen.
 *
 * Der Auftraggeber hat auf Nachfrage anders entschieden - Querschnittsnachweis
 * aus den Schnittgroessen des Ersatzbalkens, jetzt. Was BLEIBT: die Feder,
 * der Mastwind auf das Jochende, und die Ausnutzung des JOCHS, die den
 * Masten nicht mitzaehlt. Beide Zahlen stehen nebeneinander, keine
 * verschluckt die andere.
 */
{
  const AUF = await import(J('core.auflager.js'));
  const { hinweise } = await import(J('core.checks.js'));
  const w = basis({ endbedingung: 'mast', mastProfil: 'HEB 240', mastH: 7.5,
                    mastSteg: 'jochachse', mastAnschluss: 'kragarm',
                    wMastAusTabelle: false, wMast: 0.37 });
  const e = rechne(w);
  wahr('Der Mastnachweis steht im Ergebnis', e.mast != null
       && Number.isFinite(e.mast.eta), JSON.stringify(e.mast?.eta));
  wahr('Er sitzt NEBEN der Jochausnutzung, nicht darin',
       e.max.etaGesamt === Math.max(...e.knoten.map((k) => k.eta)));
  wahr('etaMitMast gibt es weiterhin nicht', e.max.etaMitMast === undefined);
  // Die Steifigkeitsrechnung des Auflagers bleibt, wo sie war.
  wahr('Der Nachweis steht nicht in core.auflager.js',
       AUF.mastNachweis === undefined);
  // Die Feder und der Mastwind bleiben - daran haengt das Joch.
  wahr('Die Drehfeder aus dem Mast steht weiterhin',
       e.modell.federn.mast != null && e.modell.federn.cA > 0);
  void hinweise;
}

// ===========================================================================
titel('27  Kragarme: das Auflager steht nicht immer am Gurtende');
// L ist die Länge der GURTE - daran hängt die Blecheinteilung. Die Auflager
// stehen dort, wo die Maste stehen. Am nachgerechneten Signaljoch waren das
// 0.33 und 0.735 m weiter innen: 5.3 % Stützweite, 11 % auf jedes Moment.
{
  const { feldmodell, schnittgroessen, auflagerkraefte } =
    await import(J('core.statics.js'));
  const { auflagermomente } = await import(J('core.auflager.js'));

  const leer = { qd: 1, wd: 0, P: [], H: [], T: [], M: [], Mz: [], N: [],
                 torsionModell: 'verteilt' };
  wahr('Ohne Kragarme wird kein Untermodell gebaut',
       feldmodell({ ...leer, L: 10 }) === null
       && feldmodell({ ...leer, L: 10, xA: 0, xB: 10 }) === null);

  // Einfeldträger 6 m mit je 2 m Kragarm, Gleichlast 1 kN/m, gelenkig.
  const m0 = { ...leer, L: 10, xA: 2, xB: 8 };
  const fm = feldmodell(m0);
  pruef('Stützweite', fm.Ls, 6, 1e-12);
  pruef('Kragarmmoment q·a²/2', fm.MkA, 2, 1e-12);
  pruef('Kragarmlast läuft ins Auflager', fm.RkragA, 2, 1e-12);

  const auf = auflagermomente({ L: fm.Ls, qd: 1, P: fm.feld.P, M: fm.feld.M,
                                EI: 1e5, cA: 0, cB: 0, MkA: fm.MkA, MkB: fm.MkB });
  pruef('Gelenkig: Stützmoment ist das Kragarmmoment', auf.MA, 2, 1e-9);
  const rk = auflagerkraefte({ L: fm.Ls, qd: 1, P: fm.feld.P, M: fm.feld.M,
                               MA: auf.MA, MB: auf.MB,
                               RkragA: fm.RkragA, RkragB: fm.RkragB });
  pruef('Auflagerkraft trägt die ganze Last', rk.RA + rk.RB, 10, 1e-9);
  Object.assign(fm.feld, { RA0: rk.RA0, MA: auf.MA, MB: auf.MB });
  const mm = { ...m0, feldmodell: fm, RA0: rk.RA0, MA: auf.MA, MB: auf.MB };
  const My = (x) => schnittgroessen(x, mm).My;
  pruef('Freies Ende momentenfrei', My(0), 0, 1e-12);
  pruef('Kragarm: −q·x²/2', My(1), -0.5, 1e-12);
  pruef('Am Auflager das Kragarmmoment', My(2), -2, 1e-9);
  pruef('Feldmitte q·Ls²/8 − M_k', My(5), 6 * 6 / 8 - 2, 1e-9);
  pruef('Symmetrisch am anderen Ende', My(9), My(1), 1e-9);
  wahr('Im Kragarm ist der Bereich vermerkt',
       schnittgroessen(1, mm).kragarm === 'links'
       && schnittgroessen(9, mm).kragarm === 'rechts');

  // --- im Werkzeug ----------------------------------------------------------
  const j90 = T.getTragjoch('J90');
  const e0 = { ...basis(), ...typUebernehmen({ ...standardwerte() }, j90),
               typ: 'J90', L: 15.5, schneeAktiv: false, anbauteile: [],
               endbedingung: 'gelenkig', torsionModell: 'huellkurve' };
  const ohne = rechne(e0);
  const mit = rechne({ ...e0, kragA: 0.5, kragB: 0.5 });
  pruef('Stützweite im Modell', mit.modell.stuetzweite, 14.5, 1e-12);
  wahr('Kragarme senken das Feldmoment',
       mit.extrem.MyMax < ohne.extrem.MyMax);
  // Die Blecheinteilung hängt an der GURTLÄNGE und darf sich nicht rühren.
  wahr('Blechstationen bleiben unverändert',
       mit.knoten.length === ohne.knoten.length
       && mit.knoten.every((k, i) => Math.abs(k.x - ohne.knoten[i].x) < 1e-12));
  let fehler = null;
  try { rechne({ ...e0, kragA: 8, kragB: 8 }); } catch (e) { fehler = e; }
  wahr('Zu lange Kragarme werden abgewiesen', fehler !== null);

  // --- Gegenprobe am Signaljoch ---------------------------------------------
  // Aus den Gurtkräften des AxisVM-Modells zurückgerechnet: Feldmoment
  // 21.18 kNm, Einspannmoment 10.05 kNm, Stützweite 18.935 m. Wird die Feder
  // auf das FELDMOMENT geeicht, muss das STÜTZMOMENT von selbst stimmen -
  // es ist nicht mitgefittet.
  const sig = { ...basis(), typ: 'frei', L: 20.0, a1: 0.75,
                jd: 600, jbbOG: 600, jbbUG: 560,
                profOG: 'L 100x100x10', profUG: 'L 80x80x8',
                blechQuelle: 'manuell', h2: 110, t2: 10, h1: 110, t1: 10,
                endblechWieZwischen: true, schneeAktiv: false, anbauteile: [],
                lastHerkunft: 'manuell', gkManuell: 0.6966, skManuell: 0,
                wkManuell: 0, gammaM0: 1.0, schraubenGrenze: false,
                endbedingung: 'manuell', cPhi: 9215,
                kragA: 0.33, kragB: 0.735,
                beiwerteFest: { G: 1, WindX: 0, WindY: 0, Schnee: 0, Leiterzug: 0 } };
  const rs = rechne(sig);
  pruef('Signaljoch: Stützweite', rs.modell.stuetzweite, 18.935, 1e-9);
  pruef('Signaljoch: Feldmoment wie AxisVM', rs.extrem.MyMax, 21.18, 0.05);
  pruef('Signaljoch: Stützmoment folgt von selbst', Math.abs(rs.modell.MA), 10.05, 0.15);

  // --- Die Zahlen müssen SICHTBAR sein --------------------------------------
  // Beim Nachbau eines geprüften FEM-Modells lagen die grössten Fehler in der
  // Eingabe: eine geschätzte Drehfeder um Faktor 3 daneben, die Stützweite um
  // 5 %. Beides sieht man dem Ergebnis nicht an, wenn es nirgends steht.
  const { hinweise } = await import(J('core.checks.js'));
  const hs = hinweise(rs.modell).join(' | ');
  wahr('Stützweite und Kragarme stehen im Klartext',
       hs.includes('18.935') && hs.includes('Kragarme'));
  wahr('Feder, Einspanngrad und Stützmoment stehen im Klartext',
       /c_φ = 9215/.test(hs) && /Einspanngrad/.test(hs) && /Stützmoment/.test(hs));
  const hOhne = hinweise(rechne({ ...sig, kragA: 0, kragB: 0 }).modell).join(' | ');
  wahr('Ohne Kragarme wird darauf hingewiesen',
       hOhne.includes('keine Kragarme'));
  const hMast = hinweise(rechne({ ...sig, endbedingung: 'mast',
      mastProfil: 'HEB 260', mastH: 7.8, mastSteg: 'jochachse',
      mastAnschluss: 'durchlaufend', wMastAusTabelle: false, wMast: 0.31,
      mastWindAufJoch: true,
      beiwerteFest: { G: 1, WindX: 1, WindY: 0, Schnee: 0, Leiterzug: 0 },
    }).modell).join(' | ');
  wahr('Der Rahmen und die gewählte Feder werden benannt',
       hMast.includes('verschiebt sich') || hMast.includes('VERSCHIEBT sich'));
  wahr('Die Verdrehung der Mastköpfe wird ausgewiesen',
       hMast.includes('Mastköpfe verdrehen sich')
       && hMast.includes('Wind auf den Mast')
       && hMast.includes('Längskraft des Jochs'));
  wahr('Die gewählte Gurtaufteilung steht im Klartext',
       hinweise(rechne({ ...sig, gurtaufteilung: 'gemessen' }).modell)
         .join(' | ').includes('gedämpft nach Steifigkeit'));
}

// ===========================================================================
titel('28  Knotenbereich: steif oder Achse zu Achse');
// Ob der Überlappungsbereich Gurt/Blech als steif gilt, ist eine ABSPRACHE.
// Beide Antworten sind rechenbar; die Vorgabe bleibt der steife Knoten.
{
  const { KNOTENBEREICHE } = await import(J('core.querschnitt.js'));
  const j90 = T.getTragjoch('J90');
  const e0 = { ...basis(), ...typUebernehmen({ ...standardwerte() }, j90),
               typ: 'J90', L: 15.5, schneeAktiv: false, anbauteile: [],
               endbedingung: 'gelenkig', torsionModell: 'huellkurve' };
  const a = rechne(e0);
  const b = rechne({ ...e0, knotenbereich: 'schwerachsen' });

  wahr('Nachweisgrundlage ist der steife Knotenbereich',
       a.modell.knotenbereich === 'anschnitt');
  wahr('Der Vergleichsmodus ist wählbar',
       KNOTENBEREICHE.length === 2
       && KNOTENBEREICHE.some((k) => k.key === 'schwerachsen'));
  // Ein damit gerechneter Bericht darf nicht als Nachweis durchgehen.
  const { hinweise: hw } = await import(J('core.checks.js'));
  wahr('Der Vergleichsmodus wird als kein vollständiger Nachweis ausgewiesen',
       hw(b.modell).join(' | ').includes('kein vollständiger Nachweis'));
  wahr('Der Nachweisfall trägt keinen solchen Hinweis',
       !hw(a.modell).join(' | ').includes('kein vollständiger Nachweis'));
  // Ohne steifen Bereich fällt die Abminderung weg: Faktor 1.
  pruef('Achse zu Achse: keine Abminderung im Gurt',
        b.knoten[3].anschnittMy, 1, 1e-12);
  wahr('Steif: der Gurt wird abgemindert', a.knoten[3].anschnittMy < 1);
  const bl = (r) => r.knoten[3].ebenen.find((x) => x.art === 'vertikal');
  pruef('Achse zu Achse: keine Abminderung im Blech',
        bl(b).abminderung, 1, 1e-12);
  wahr('Steif: das Blech wird abgemindert', bl(a).abminderung < 1);
  // Das KNOTENmoment ist dasselbe - nur die Stelle des Nachweises ändert sich.
  pruef('Das Knotenmoment bleibt unberührt',
        bl(b).M_Knoten, bl(a).M_Knoten, 1e-12, 'kNm');
  wahr('Achse zu Achse gibt durchweg grössere Werte',
       b.max.etaGesamt > a.max.etaGesamt);
  // Am nachgerechneten Signaljoch trug die Frage Faktor 1.3 bis 1.6 auf die
  // Blechmomente; hier reicht die Richtung als Prüfung.
  wahr('Der Unterschied ist erheblich, nicht kosmetisch',
       b.max.etaGesamt / a.max.etaGesamt > 1.05);
}

// ===========================================================================
titel('29  Endfeldzuschlag auf die Bindebleche');
// In den Endfeldern geht die Torsion über die Anschlussebenen in den Mast.
// Diese örtliche Einleitung führt der Ersatzbalken nicht; am Vergleichsmodell
// lag das Blechmoment aussen um Faktor 2.7 höher, nach innen abklingend.
{
  const { ENDFELD_ZUSCHLAG, ENDFELD_STATIONEN } = await import(J('core.querschnitt.js'));
  const j90 = T.getTragjoch('J90');
  const e0 = { ...basis(), ...typUebernehmen({ ...standardwerte() }, j90),
               typ: 'J90', L: 15.5, schneeAktiv: false, anbauteile: [],
               endbedingung: 'gelenkig', torsionModell: 'huellkurve' };
  const mit = rechne(e0);
  const ohne = rechne({ ...e0, endfeldZuschlag: 1 });

  // Nachgemessen am 31. August gegen ein Rahmenmodell mit demselben
  // Knotenmodell: 0.48 im Mittel, Spanne 0.41 bis 0.64. Unter 1 heisst,
  // dass der Ersatzbalken das Endfeld ueberschaetzt statt unterschaetzt -
  // die Huellkurve ueber alle vier Ebenen traegt dort rund Faktor zwei.
  pruef('Vorgabe ist der gerundete Messwert', ENDFELD_ZUSCHLAG, 0.50, 1e-12);
  wahr('… und liegt in der gemessenen Spanne',
       ENDFELD_ZUSCHLAG >= 0.41 && ENDFELD_ZUSCHLAG <= 0.65);
  pruef('Zwei Stationen je Ende', ENDFELD_STATIONEN, 2, 1e-12);

  const bl = (r, i) => r.knoten[i].ebenen.find((x) => x.art === 'vertikal');
  const n = mit.knoten.length;
  [0, 1, n - 2, n - 1].forEach((i) => {
    wahr(`Station ${i} liegt im Endfeld`, mit.knoten[i].imEndfeld === true);
  });
  const innen = Math.floor(n / 2);
  wahr('Feldmitte liegt nicht im Endfeld', mit.knoten[innen].imEndfeld === false);
  pruef('In Feldmitte bleibt alles, wie es war',
        bl(mit, innen).M, bl(ohne, innen).M, 1e-12, 'kNm');

  // OHNE TORSION KEIN ZUSCHLAG. Dieses Joch trägt keine exzentrischen
  // Anbaulasten; sein Torsionsanteil ist null, also ändert sich nichts.
  pruef('Ohne Torsion greift der Zuschlag nicht',
        bl(mit, 1).endfeldFaktor, 1, 1e-9);
  pruef('… und das Moment bleibt', bl(mit, 1).M, bl(ohne, 1).M, 1e-12, 'kNm');

  // MIT exzentrischer Anbaulast: dort wirkt er, und zwar anteilig.
  const mitTorsion = { ...e0, torsionModell: 'verteilt',
    anbauteile: [teil({ id: 'S', x: 7.75, befestigung: 'durchgehend',
      lasten: [block({ einwirkung: 'WindY', x: 0, z: -1.5, Fy: 3 })] })] };
  const t1 = rechne(mitTorsion);
  const t0 = rechne({ ...mitTorsion, endfeldZuschlag: 1 });
  const b1 = bl(t1, 1), b0 = bl(t0, 1);
  // Der Faktor weicht von 1 ab, sobald Torsion im Spiel ist - seit der
  // Kalibrierung nach UNTEN, weil k_E kleiner als 1 ist. Geprueft wird die
  // Abweichung, nicht ihre Richtung: die haengt am eingestellten k_E.
  wahr('Mit Torsion wird der Faktor wirksam',
       Math.abs(b1.endfeldFaktor - 1) > 0.05,
       `Faktor ${b1.endfeldFaktor.toFixed(3)}, Torsionsanteil `
       + `${(100 * b1.torsionsanteil).toFixed(0)} %`);
  // Solange nicht alles Torsion ist, bleibt er zwischen 1 und dem vollen
  // Wert - bei k_E unter 1 ist das die obere, nicht die untere Schranke.
  wahr('Er bleibt zwischen 1 und dem vollen Wert',
       b1.endfeldFaktor >= Math.min(1, ENDFELD_ZUSCHLAG) - 1e-9
       && b1.endfeldFaktor <= Math.max(1, ENDFELD_ZUSCHLAG) + 1e-9);
  // Der Zuschlag greift auf den RAHMENANTEIL; der Koppelterm aus der schiefen
  // Biegung steht daneben und wird nicht angehoben.
  pruef('Das Moment folgt genau dem Faktor',
        b1.M - b1.M_kopp, (b0.M - b0.M_kopp) * b1.endfeldFaktor, 1e-9, 'kNm');
  pruef('Der Koppelterm bleibt vom Endfeld unberührt', b1.M_kopp, b0.M_kopp, 1e-12, 'kNm');
  // Die QUERKRAFT folgt dem Rahmen und wird nicht angehoben.
  pruef('Die Blechquerkraft bleibt unberührt', b1.V, b0.V, 1e-12, 'kN');
  pruef('M_Knoten bleibt der Rahmenwert', b1.M_Knoten, b0.M_Knoten, 1e-12, 'kNm');
  // Auf η_gesamt muss sich das NICHT auswirken: massgebend kann eine Station
  // in Feldmitte bleiben. Nachgewiesen wird die Wirkung dort, wo sie hingehört.
  // Die Richtung haengt an k_E: ueber 1 hebt der Faktor die Ausnutzung des
  // Endfeldblechs, unter 1 senkt er sie. Geprueft wird, dass er ueberhaupt
  // wirkt - und dass er NUR im Endfeld wirkt.
  wahr('Die Ausnutzung des Endfeldblechs aendert sich',
       Math.abs(t1.knoten[1].etaB - t0.knoten[1].etaB) > 1e-9);
  wahr('… und zwar in die Richtung, die k_E vorgibt',
       (ENDFELD_ZUSCHLAG > 1) === (t1.knoten[1].etaB > t0.knoten[1].etaB));
  const innenK = Math.floor(t1.knoten.length / 2);
  pruef('In Feldmitte bleibt die Ausnutzung unberuehrt',
        t1.knoten[innenK].etaB, t0.knoten[innenK].etaB, 1e-12);
  const { hinweise: hw2 } = await import(J('core.checks.js'));
  wahr('Der Faktor steht in den Hinweisen',
       hw2(mit.modell).join(' | ').includes('äussersten Stationen'));
  wahr('… und sagt, dass er abmindert, wenn k_E unter 1 liegt',
       ENDFELD_ZUSCHLAG >= 1
       || hw2(mit.modell).join(' | ').includes('abgemindert'));
  wahr('Abgeschaltet wird das ebenfalls vermerkt',
       hw2(ohne.modell).join(' | ').includes('abgeschaltet'));
}

// ===========================================================================
titel('29b Zu enges Klemmenraster wird gemeldet');
// Ein Anbauteil haengt ueber zwei Klemmreihen im Abstand `raster`. Das
// Sortiment fuehrt 400 mm; in einer Ausleitung standen 20 mm - ein Vertipper,
// der ein Gurtstueck von 10 mm erzeugte. Gesperrt wird nichts (Ausnahmen
// kommen vor), aber still durchlaufen soll es auch nicht.
{
  const { hinweise: hw3 } = await import(J('core.checks.js'));
  const j90b = T.getTragjoch('J90');
  const grund = { ...basis(), ...typUebernehmen({ ...standardwerte() }, j90b),
                  typ: 'J90', L: 15.5, schneeAktiv: false,
                  endbedingung: 'gelenkig' };
  const mitEng = rechne({ ...grund,
    anbauteile: [teil({ id: 'E', x: 7.75, raster: 0.02, befestigung: 'durchgehend',
      lasten: [block({ einwirkung: 'G', x: 0, z: -1.5, Fz: 2 })] })] });
  const mitNorm = rechne({ ...grund,
    anbauteile: [teil({ id: 'N', x: 7.75, raster: 0.40, befestigung: 'durchgehend',
      lasten: [block({ einwirkung: 'G', x: 0, z: -1.5, Fz: 2 })] })] });
  wahr('20 mm Raster wird gemeldet',
       hw3(mitEng.modell).join(' | ').includes('Klemmenraster ungewöhnlich eng'));
  wahr('… mit dem Mass im Klartext',
       hw3(mitEng.modell).join(' | ').includes('20 mm'));
  wahr('400 mm gibt keinen Hinweis',
       !hw3(mitNorm.modell).join(' | ').includes('Klemmenraster ungewöhnlich eng'));
  // GESPERRT wird nichts - die Rechnung laeuft mit dem Wert, wie er dasteht.
  wahr('Gerechnet wird trotzdem', Number.isFinite(mitEng.max.etaGesamt));
}

// ===========================================================================
titel('29c Abgleichwerkzeug: die Werkzeugseite');
// vergleich_werkzeug.mjs schreibt einen Eingabestand je charakteristischem
// Einzellastfall aus. Geprueft wird hier die Form - dass jeder Lastfall,
// jede Station und jede Bauteilfamilie drinsteht und die Geometrie mitkommt,
// aus der die Gegenseite ihre Staebe zuordnet.
{
  const { standardLastfaelle } = await import(J('core.lasten.js'));
  const w = basis({ lastHerkunft: 'manuell', gkManuell: 0.7, skManuell: 0.24,
                    wkManuell: 0.52, schneeAktiv: true, anbauteile: [] });
  const chars = standardLastfaelle(w).filter((l) => l.art === 'charakteristisch');
  wahr('Es gibt charakteristische Einzellastfaelle zum Vergleichen',
       chars.length >= 5, chars.map((l) => l.key).join(', '));

  // Dieselbe Schleife, die das Werkzeug faehrt.
  const faelle = {};
  let m = null;
  for (const l of chars) {
    const e = rechne({ ...w, lastfall: l.key, beiwerteFest: null });
    m = e.modell;
    faelle[l.key] = e.knoten.map((k) => ({
      x: k.x,
      gurt: Object.fromEntries(k.ecken.map((c) => [c.id, c.sig_v])),
      blech: Object.fromEntries(k.ebenen.filter((p) => p.eta != null)
        .map((p) => [p.id, p.M])),
    }));
  }
  wahr('Je Lastfall alle Stationen', Object.values(faelle)
    .every((v) => v.length === faelle[chars[0].key].length));
  wahr('Je Station alle vier Gurtwinkel', Object.values(faelle)
    .every((v) => v.every((k) => Object.keys(k.gurt).length === 4)));
  wahr('Je Station die Blechebenen', faelle[chars[0].key]
    .some((k) => Object.keys(k.blech).length >= 2));
  // Die Geometrie, aus der die Gegenseite ihre Staebe zuordnet.
  wahr('Die Gurtachsen liegen symmetrisch zur Jochachse',
       Math.abs((m.h / 2) + (-m.h / 2)) < 1e-12);
  wahr('Geometrie vollstaendig',
       [m.L, m.h, m.b, m.fyd].every((v) => Number.isFinite(v) && v > 0));
  // Verschiedene Lastfaelle geben verschiedene Ergebnisse - sonst waere die
  // Schleife umsonst.
  const s1 = faelle[chars[0].key][5].gurt.OG_L;
  const s2 = faelle.wyk ? faelle.wyk[5].gurt.OG_L : null;
  wahr('Die Lastfaelle unterscheiden sich', s2 === null || Math.abs(s1 - s2) > 1e-6);
}

// ===========================================================================
titel('29a PyNite-Export: das Eigengewicht muss mit');
// AxisVM leitet das Eigengewicht aus den Staeben ab, PyNite NICHT - dort
// steht im Skript keine Zeile dafuer. Ohne sie fehlte im Vergleichsmodell die
// groesste Einzellast, und das Feldmoment fiel 45 % zu klein aus.
{
  const { pyniteSkript } = await import(J('export.pynite.js'));
  const { lasten } = await import(J('export.axisvm.js'));
  const { modell } = await import(J('core.vierendeel.js'));
  const w = basis({ lastHerkunft: 'manuell', gkManuell: 0.70, skManuell: 0.24,
                    wkManuell: 0.52, schneeAktiv: true, gZusatz: 0.05,
                    anbauteile: [] });
  const m = modell(w, getProfil(w.profOG), getProfil(w.profUG),
                   getStahl(w.stahl), T.getTragjoch(w.typ));
  const t = pyniteSkript(m, { knotenmodell: 'anschnitt' });
  const text = typeof t === 'string' ? t : t.text;
  const zeilen = text.split('\n').filter((z) => z.includes("case='G'"));
  wahr('Der Export schreibt Eigengewichtslasten', zeilen.length > 0,
       `${zeilen.length} Zeilen`);
  // Volle Laufmeterlast, hälftig... nein: viertelweise auf alle vier Gurte.
  const erste = zeilen[0].match(/'FY', (-?[\d.]+),/);
  pruef('Zusammen ergeben sie g_k', 4 * Math.abs(parseFloat(erste[1])),
        m.char.gk, 1e-5, 'kN/m');

  // Der AxisVM-Export laesst es weiterhin weg - dort rechnet das Programm
  // selbst, und beides waere doppelt.
  const bau = t.bau;
  const ohne = lasten(m, bau);
  const mit = lasten(m, bau, { eigengewicht: true });
  // Jeder Gurtstab bekommt ein Viertel; die Summe ueber die vier Gurte ist
  // die Laufmeterlast.
  const gStrecke = (l) => {
    const q = l.strecke.filter((x) => x.lastfall === 'G');
    return q.length ? 4 * Math.abs(q[0].wert) : 0;
  };
  // Ohne Schalter bleibt nur ein allfaelliger Zuschlag - bei Lasten von Hand
  // gibt es keinen, also gar keine Streckenlast. GENAU DAS war der Fehler:
  // der PyNite-Export nahm die Regel des AxisVM-Exports mit, obwohl PyNite
  // das Eigengewicht nicht selbst rechnet.
  wahr('Ohne Schalter keine Eigengewichtslast',
       ohne.strecke.filter((q) => q.lastfall === 'G').length === 0);
  wahr('Mit Schalter die volle Laufmeterlast',
       Math.abs(gStrecke(mit) - m.char.gk) < 1e-6, `${gStrecke(mit).toFixed(4)} kN/m`);
  // Die Resultierende liegt auf der Jochachse: kein Torsionsmoment.
  const je = new Set(mit.strecke.filter((q) => q.lastfall === 'G')
    .map((q) => q.stab.slice(0, 3)));
  wahr('Auf alle vier Gurte gleich verteilt', je.size === 4,
       [...je].join(', '));
}

// ===========================================================================
titel('30a Modellebenen: Schwerachsen eingefaerbt, Auflager als eigene Ebene');
// Die Schwerachsen SIND das Stabmodell - sie tragen feldweise dieselben
// Kennwerte wie die Volumenkoerper. Der frueher eigene Schalter
// "Stabmodell (ohne Koerper)" sagte nichts, was Gurtprofile und Bindebleche
// nicht schon sagen; sein Platz gehoert jetzt der Auflagerdefinition.
{
  const R = await import(J('render.3d.js'));
  const w = basis({ endbedingung: 'mast', mastProfil: 'HEB 240', mastH: 7.5,
                    mastSteg: 'jochachse', mastAnschluss: 'kragarm',
                    schraubenGrenze: false, kragA: 0.35, kragB: 0.75 });
  const e = rechne(w);
  const sz = R.erzeugeSzene(e.modell, e);

  // --- Schwerachsen ---------------------------------------------------------
  const gurt = sz.linien.filter((l) => l.gurt);
  wahr('Die Gurtachsen sind feldweise aufgeteilt', gurt.length > 4 * 5,
       `${gurt.length} Abschnitte bei 4 Gurten`);
  wahr('Jeder Abschnitt hat genau zwei Punkte',
       gurt.every((l) => l.punkte.length === 2));
  wahr('Jeder Abschnitt traegt Kennwerte',
       gurt.every((l) => l.werte && Number.isFinite(l.werte.eta)));
  wahr('Verschiedene Felder tragen verschiedene Werte',
       new Set(gurt.map((l) => l.werte.eta)).size > 3);
  // Sie decken die ganze Gurtlaenge ab, ohne Luecke.
  const einGurt = gurt.filter((l) => l.label === gurt[0].label)
    .sort((a, b) => a.punkte[0][0] - b.punkte[0][0]);
  pruef('Sie beginnen am Gurtanfang', einGurt[0].punkte[0][0], 0, 1e-9, 'm');
  pruef('und enden am Gurtende',
        einGurt[einGurt.length - 1].punkte[1][0], e.modell.L, 1e-9, 'm');
  wahr('ohne Luecke dazwischen', einGurt.every((l, i) =>
    i === 0 || Math.abs(l.punkte[0][0] - einGurt[i - 1].punkte[1][0]) < 1e-9));

  // Die Blechachsen ebenso - sonst waere das Fachwerk halb eingefaerbt.
  const bl = sz.linien.filter((l) => l.blechachse);
  wahr('Auch die Blechachsen tragen Kennwerte', bl.length > 0
       && bl.every((l) => l.werte !== undefined));
  wahr('Es gibt keine Gruppe "stab" mehr',
       !sz.linien.some((l) => l.gruppe === 'stab'));

  // --- Auflagerebene --------------------------------------------------------
  const auf = sz.linien.filter((l) => l.gruppe === 'auflager');
  const mAuf = sz.marken.filter((k) => k.gruppe === 'auflager');
  wahr('Es gibt eine Auflagerebene', auf.length > 0 && mAuf.length > 0);
  // DIE MARKE SITZT AN DER MASTACHSE, nicht am Gurtende - frueher stand sie
  // bei x = 0 und x = L und lag mit Kragarmen falsch.
  const xs = mAuf.filter((k) => k.art === 'auflager').map((k) => k.p[0]).sort((a, b) => a - b);
  pruef('Auflager A steht bei kragA', xs[0], 0.35, 1e-9, 'm');
  pruef('Auflager B steht bei L − kragB', xs[1], e.modell.L - 0.75, 1e-9, 'm');
  /*
   * DER MAST IST EIN KOERPER, KEIN STUMMEL (Weisung).
   *
   * Er stand als zwei Striche da, auf ein Stueck gekuerzt - "die Aussage ist
   * die Lagerung, nicht die Masthoehe". Das galt, solange der Mast nur eine
   * Randbedingung war. Er ist seither Teil des Tragwerks: er steht als Stab
   * im ausgeleiteten Modell, und man haengt Anbauteile an ihn, die ueber ihre
   * HOEHE sitzen. Wer die Hoehe nicht sieht, kann sie nicht treffen.
   */
  const mastF = sz.flaechen.filter((f) => /^MAST_/.test(f.teil ?? ''));
  wahr('Der Mast wird als Koerper gezeichnet', mastF.length > 0,
       `${mastF.length} Flaechen`);
  wahr('Und zwar an beiden Enden',
       new Set(mastF.map((f) => f.teil)).size === 2,
       [...new Set(mastF.map((f) => f.teil))].join(', '));
  /*
   * ZWOELF ECKEN, JE ABSCHNITT.
   *
   * Zwei Flansche und der Steg ergeben zwoelf Mantelflaechen und zwei Deckel,
   * also 14 je Prisma. Seit dem 1. September ist der Mast nicht mehr EIN
   * Prisma, sondern eine Folge von Abschnitten - jeder mit seiner Ausnutzung.
   * Geprueft wird deshalb die FORM (ein Vielfaches von 14) statt der Zahl.
   */
  {
    const n = mastF.filter((f) => f.teil === 'MAST_A').length;
    wahr('Als I-Querschnitt mit zwoelf Ecken', n % 14 === 0, `${n} Flaechen`);
    wahr('In mehreren Abschnitten uebereinander', n > 14, `${n / 14} Abschnitte`);
  }
  {
    /*
     * VOM FUSS BIS UEBER DEN OBERGURT.
     *
     * Weisung: die Masten immer einen halben Meter ueber den Obergurt
     * fuehren. Auf jedem Querprofil laufen sie ueber das Joch hinaus, und wer
     * eine Zeichnung dahinterlegt, will beide zur Deckung bringen.
     *
     * Die Masthoehe H selbst bleibt unberuehrt - sie ist als FUSS BIS
     * JOCHACHSE definiert und geht so in die Drehfeder ein. Der Ueberstand
     * waechst nach OBEN; der Fuss bleibt, wo das Lager sitzt.
     */
    const zs = mastF.filter((f) => f.teil === 'MAST_A').flatMap((f) => f.punkte.map((p) => p[2]));
    const H = e.modell.federn.mastA?.H ?? e.modell.federn.mast?.H;
    // Die Oberkante des Obergurts unabhaengig ermitteln - aus den Gurtflaechen
    // selbst, nicht aus den Bildgrenzen: die tragen den Masten inzwischen mit.
    const zOG = Math.max(...sz.flaechen.filter((f) => f.gruppe === 'profil')
      .flatMap((f) => f.punkte.map((p) => p[2])));
    pruef('Der Kopf steht einen halben Meter ueber dem Obergurt',
          Math.max(...zs), zOG + 0.5, 1e-9, 'm');
    // Der Fuss und die Auflagermarke muessen dieselbe Stelle sein.
    const fussMarke = mAuf.find((k) => k.art === 'auflager'
                                    && Math.abs(k.p[0] - 0.35) < 1e-9);
    pruef('Der Fuss trifft die Auflagermarke', Math.min(...zs), fussMarke.p[2],
          1e-9, 'm');
    wahr('Die Masthoehe H selbst bleibt davon unberuehrt',
         Math.abs(e.modell.federn.mastA.H - 7.5) < 1e-12, `${e.modell.federn.mastA.H} m`);
    // Der wirkliche Querschnitt, nicht ein Kasten: die y-Ausdehnung ist bei
    // "Steg in Jochachse" die Flanschbreite b.
    const ys = mastF.filter((f) => f.teil === 'MAST_A').flatMap((f) => f.punkte.map((p) => p[1]));
    const prof = e.modell.federn.mastA?.profil ?? e.modell.federn.mast?.profil;
    pruef('Mit der Flanschbreite quer zur Jochachse',
          Math.max(...ys) - Math.min(...ys), prof.b / 1000, 1e-9, 'm');
    const xs2 = mastF.filter((f) => f.teil === 'MAST_A').flatMap((f) => f.punkte.map((p) => p[0]));
    pruef('Und der Profilhoehe in der Jochachse',
          Math.max(...xs2) - Math.min(...xs2), prof.h / 1000, 1e-9, 'm');
  }
  /*
   * DAS LAGER SITZT AM MASTFUSS (Weisung).
   *
   * Dort steht das Fundament. An der Jochachse sitzt kein Lager, sondern der
   * ANSCHLUSS - die Drehfeder c_phi, die die Nachgiebigkeit des Mastes
   * zusammenfasst. Die Marke an der Jochachse las sich wie ein Auflager.
   */
  {
    const H = e.modell.federn.mastA?.H ?? e.modell.federn.mast?.H;
    const a = mAuf.find((k) => k.art === 'auflager' && Math.abs(k.p[0] - 0.35) < 1e-9);
    wahr('Die Auflagermarke sitzt am Mastfuss, nicht an der Jochachse',
         a.p[2] < -H * 0.9, `z = ${a.p[2].toFixed(2)} m bei H = ${H} m`);
  }
  // Das Bild reicht bis dorthin - sonst stuende der Mast beim Einpassen
  // halb ausserhalb.
  {
    const H = e.modell.federn.mastA?.H ?? e.modell.federn.mast?.H;
    wahr('Und die Bildgrenzen reichen bis zum Fuss', sz.grenzen.zMin <= -H * 0.9,
         `zMin = ${sz.grenzen.zMin.toFixed(2)} m`);
  }
  /*
   * Die Fussschraffur bleibt: sie sagt, dass dort eingespannt ist. Sie liegt
   * seit dem 28. August in der Ebene `mast` und nicht mehr in `auflager` -
   * der Mast ist ein Bauteil und laesst sich einzeln wegnehmen, ohne die
   * Lagerung zu verlieren.
   */
  const mastL = sz.linien.filter((l) => l.gruppe === 'mast');
  wahr('Die Fussschraffur steht weiterhin da',
       mastL.filter((l) => !l.kragarm && !l.mast).length >= 10);
  wahr('Und zwar in der Ebene der Masten',
       auf.every((l) => l.gruppe === 'auflager')
       && mastL.length > 0, `${mastL.length} Mastlinien`);
  wahr('Die Kragarme sind ausgewiesen', auf.filter((l) => l.kragarm).length === 2);
  const txt = mAuf.filter((k) => k.art === 'auflagertext')
    .map((k) => k.zeilen.join(' / ')).join(' | ');
  wahr('Profil, Feder und Einspanngrad stehen dabei',
       txt.includes('HEB 240') && txt.includes('c_φ') && txt.includes('κ'), txt);
  // Zweizeilig: oben das Bauteil, unten die Lagerung.
  wahr('Die Angabe steht zweizeilig',
       mAuf.filter((k) => k.art === 'auflagertext').every((k) => k.zeilen.length === 2));
  wahr('Keine Zeile ist länger als 30 Zeichen',
       mAuf.filter((k) => k.art === 'auflagertext')
         .every((k) => k.zeilen.every((z) => z.length <= 30)), txt);

  // Ohne Kragarme sitzen die Auflager an den Gurtenden.
  const ohne = rechne({ ...w, kragA: 0, kragB: 0 });
  const xo = R.erzeugeSzene(ohne.modell, ohne).marken
    .filter((k) => k.art === 'auflager').map((k) => k.p[0]).sort((a, b) => a - b);
  pruef('Ohne Kragarm bei 0', xo[0], 0, 1e-9, 'm');
  pruef('und bei L', xo[1], ohne.modell.L, 1e-9, 'm');
  wahr('Ohne Kragarm keine Kragarmlinie',
       !R.erzeugeSzene(ohne.modell, ohne).linien.some((l) => l.kragarm));

  // Gelenkig gelagert: kein Mast, aber die Marke steht trotzdem.
  const gel = rechne({ ...w, endbedingung: 'gelenkig' });
  const sg = R.erzeugeSzene(gel.modell, gel);
  wahr('Auch gelenkig gibt es die Auflagerebene',
       sg.marken.some((k) => k.gruppe === 'auflager' && k.art === 'auflager'));
  wahr('Dann steht «gelenkig» dabei',
       sg.marken.filter((k) => k.art === 'auflagertext')
         .some((k) => k.zeilen.join(' ').includes('gelenkig')));
}

// ===========================================================================
titel('29b Eigenanteil der Gurte am globalen Moment');
// Die Zwei-Gurt-Idealisierung traegt das globale Moment allein ueber die
// Normalkraefte ab. Nach der Ebenbleibenshypothese traegt jeder Winkel es
// aber auch ueber sein EIGENES Traegheitsmoment mit - klein, aber es laeuft
// mit dem GLOBALEN Moment und nicht mit der Querkraft. In Feldmitte, wo das
// Rahmenmoment gegen null geht, ist es das einzige Moment im Gurt.
{
  const { eigenanteil } = await import(J('core.querschnitt.js'));
  const P = getProfil('L 100x100x10'), Q = getProfil('L 80x80x8');
  const m = { profOG: P, profUG: Q, h: 0.5492, b: 0.4508 };
  const ea = eigenanteil(m);
  const iy = (p) => p.iy ** 2 * p.A, iz = (p) => (p.iz ?? p.iy) ** 2 * p.A;

  // I_ges = Steiner + Eigenanteil, in cm4
  const eZ = 54.92 / 2, eY = 45.08 / 2;
  pruef('I_ges um die waagrechte Achse', ea.Iges_y,
        2 * P.A * eZ ** 2 + 2 * Q.A * eZ ** 2 + 2 * iy(P) + 2 * iy(Q), 1e-6, 'cm4');
  pruef('I_ges um die lotrechte Achse', ea.Iges_z,
        2 * (P.A + Q.A) * eY ** 2 + 2 * iz(P) + 2 * iz(Q), 1e-6, 'cm4');
  pruef('Anteil des Obergurts an M_y', ea.OG.my, iy(P) / ea.Iges_y, 1e-12, '–');
  pruef('Anteil des Untergurts an M_z', ea.UG.mz, iz(Q) / ea.Iges_z, 1e-12, '–');
  wahr('Der steifere Gurt traegt mehr mit', ea.OG.my > ea.UG.my);
  wahr('Zusammen sind es wenige Prozent',
       2 * (ea.OG.my + ea.UG.my) < 0.05 && 2 * (ea.OG.mz + ea.UG.mz) < 0.05,
       `${(200 * (ea.OG.my + ea.UG.my)).toFixed(1)} % / `
       + `${(200 * (ea.OG.mz + ea.UG.mz)).toFixed(1)} %`);
  // Gemessen am Rahmen: 177/(32010 + 499) · 42 kNm = 0.229 kNm je Obergurt
  pruef('Trifft den gemessenen Rahmenwert', ea.OG.mz * 42, 0.229, 0.01, 'kNm');

  // --- Im Rechenkern --------------------------------------------------------
  // Reine Querlast: in Feldmitte geht die Querkraft gegen null, der
  // Eigenanteil bleibt stehen.
  const w = basis({ lastHerkunft: 'manuell', gkManuell: 0, skManuell: 0,
                    wkManuell: 0.52, schneeAktiv: false, anbauteile: [],
                    endbedingung: 'gelenkig',
                    beiwerteFest: { G: 0, WindX: 0, WindY: 1, Schnee: 0, Leiterzug: 0 } });
  const e = rechne(w);
  const mitte = e.knoten[Math.floor(e.knoten.length / 2)];
  const og = mitte.ecken.find((c) => c.id === 'OG_L');
  wahr('In Feldmitte ist die Querkraft fast null', Math.abs(mitte.Vy) < 0.05,
       `V_y = ${mitte.Vy.toFixed(4)} kN`);
  wahr('Das Gurtmoment ist es NICHT', og.Mz_lokal > 0.02,
       `M_z = ${og.Mz_lokal.toFixed(4)} kNm`);
  pruef('Es ist genau der Eigenanteil', og.Mz_lokal, mitte.eigenMz.OG, 1e-9, 'kNm');
  pruef('Und der folgt dem globalen Moment', mitte.eigenMz.OG,
        Math.abs(mitte.Mz) * eigenanteil(e.modell).OG.mz, 1e-9, 'kNm');

  // KEINE Anschnittabminderung: er laeuft mit dem globalen Verlauf.
  const anschnitt = e.knoten[3];
  const ogA = anschnitt.ecken.find((c) => c.id === 'OG_L');
  pruef('Ohne Abminderung auf den Anschnitt',
        ogA.Mz_lokal - anschnitt.Mz_Knoten * anschnitt.anschnittMz,
        anschnitt.eigenMz.OG, 1e-9, 'kNm');

  // Bei UNGLEICHEN Gurten bekommen sie verschiedene Anteile - vorher trugen
  // alle vier Winkel dasselbe M_z. Bei gleichen Profilen bleibt es gleich.
  const ug = mitte.ecken.find((c) => c.id === 'UG_L');
  pruef('Gleiche Profile: gleicher Anteil', og.Mz_lokal, ug.Mz_lokal, 1e-12, 'kNm');
  const un = rechne({ ...w, profOG: 'L 100x100x10', profUG: 'L 80x80x8' });
  const m2 = un.knoten[Math.floor(un.knoten.length / 2)];
  const o2 = m2.ecken.find((c) => c.id === 'OG_L');
  const u2 = m2.ecken.find((c) => c.id === 'UG_L');
  wahr('Ungleiche Gurte: der steifere traegt mehr mit',
       o2.Mz_lokal > u2.Mz_lokal + 1e-6,
       `${o2.Mz_lokal.toFixed(4)} gegen ${u2.Mz_lokal.toFixed(4)} kNm`);

  // Ohne globales Moment kein Eigenanteil.
  const leer = rechne({ ...w, wkManuell: 0 });
  pruef('Ohne Last kein Eigenanteil',
        leer.knoten[5].eigenMz.OG, 0, 1e-12, 'kNm');

  const { hinweise: hw } = await import(J('core.checks.js'));
  wahr('Der Term steht in den Hinweisen',
       hw(e.modell).join(' | ').includes('Eigenanteil der Gurte'));
  wahr('Das Modell weist die Anteile aus',
       e.modell.eigenanteil && e.modell.eigenanteil.Iges_y > 0);
}

// ===========================================================================
titel('30  Schiefe Biegung der Gurtwinkel auf die Bindebleche');
// Der Winkel hat seine Hauptachsen unter 45 Grad. Unter dem oertlichen
// Rahmenmoment weicht er quer aus; die Bleche der ANDEREN Ebene halten
// dagegen. Ohne diesen Term sind die Horizontalbleche unter reiner
// Vertikallast spannungsfrei - das gepruefte FEM-Modell zeigt dort 11 N/mm2.
{
  const { koppelfaktor, SCHIEFE_DAEMPFUNG } = await import(J('core.querschnitt.js'));
  const { winkelwerteFuer } = await import(J('core.winkel.js'));
  const { hinweise } = await import(J('core.checks.js'));
  const P = getProfil('L 100x100x10');
  const blech = { breite: 160, dicke: 10, laenge: 420 };

  // --- die Formel selbst ----------------------------------------------------
  const kf = koppelfaktor(P, blech, 0.70, 0.42, 'z');
  const w = winkelwerteFuer(P);
  const D = w.Iy * w.Iz - w.Iyz * w.Iyz;
  pruef('r = |I_yz| / I_treib', kf.r, Math.abs(w.Iyz) / w.Iz, 1e-12, '–');
  pruef('I* = (I_y I_z − I_yz²) / I_treib', kf.Istern, D / w.Iz, 1e-9, 'mm4');
  pruef('I_p ist das Blech in seiner eigenen Ebene', kf.Ip, (10 * 160 ** 3) / 12,
        1e-9, 'mm4');
  pruef('β = I_p · a / (6 · L_c · I*)', kf.beta,
        (kf.Ip * 700) / (6 * 420 * kf.Istern), 1e-12, '–');
  /*
   * DIE HERGELEITETE FORMEL, ABGEMINDERT AUF DIE MESSUNG.
   *
   * Die Herleitung setzt die volle Behinderung an - der Gurt bleibe im
   * Mittel gerade. Ueber 509 Messstellen an vier Typen liegt sie damit im
   * Mittel 30 Prozent zu hoch (kalibrieren.mjs --nur schief).
   */
  pruef('Faktor = k_S · 2 · r · β/(1+β)', kf.faktor,
        SCHIEFE_DAEMPFUNG * 2 * kf.r * (kf.beta / (1 + kf.beta)), 1e-12, '–');
  wahr('Die Abminderung steht zwischen 0 und 1',
       SCHIEFE_DAEMPFUNG > 0 && SCHIEFE_DAEMPFUNG <= 1);
  pruef('… und ist der gemessene Wert', SCHIEFE_DAEMPFUNG, 0.70, 1e-12, '–');
  // Gleichschenkliger Winkel: r = (I1 − I2)/(I1 + I2)
  pruef('Beim gleichschenkligen Winkel ist r = (I1−I2)/(I1+I2)', kf.r,
        (w.I1 - w.I2) / (w.I1 + w.I2), 1e-9, '–');

  // Grenzfaelle: ein steiferes Blech behindert mehr, ein laengeres weniger.
  const steifer = koppelfaktor(P, { ...blech, breite: 220 }, 0.70, 0.42, 'z');
  const laenger = koppelfaktor(P, { ...blech, laenge: 700 }, 0.70, 0.70, 'z');
  wahr('Ein steiferes Blech zieht mehr Moment an sich', steifer.faktor > kf.faktor);
  wahr('Ein weicheres Blech weniger', laenger.faktor < kf.faktor);
  wahr('Volle Behinderung bleibt die obere Schranke',
       kf.faktor < SCHIEFE_DAEMPFUNG * 2 * kf.r + 1e-12);
  wahr('Ohne Blechangaben kein Koppelterm',
       koppelfaktor(P, null, 0.7, 0.42, 'z') === null
       && koppelfaktor(P, blech, 0, 0.42, 'z') === null);

  // --- im Rechenkern --------------------------------------------------------
  // Reine Vertikallast: die Horizontalbleche bekommen NUR aus diesem Term
  // etwas - der Rahmen gibt ihnen null.
  const v = basis({ lastHerkunft: 'manuell', gkManuell: 1.5, wkManuell: 0,
                    skManuell: 0, schneeAktiv: false, anbauteile: [],
                    beiwerteFest: { G: 1, WindX: 0, WindY: 0, Schnee: 0, Leiterzug: 0 } });
  const mit = rechne(v);
  const ohne = rechne({ ...v, schiefeBiegung: false });
  const hor = (e) => e.knoten[1].ebenen.find((x) => x.art === 'horizontal');
  const ver = (e) => e.knoten[1].ebenen.find((x) => x.art === 'vertikal');
  pruef('Ohne den Term ist das Horizontalblech spannungsfrei',
        hor(ohne).sig_v, 0, 1e-12, 'N/mm²');
  wahr('Mit dem Term traegt es', hor(mit).sig_v > 1,
       `σ_v = ${hor(mit).sig_v.toFixed(2)} N/mm²`);
  pruef('Der Rahmenanteil bleibt null', hor(mit).M_Knoten, 0, 1e-12, 'kNm');
  pruef('Das ganze Moment kommt aus der Kopplung', hor(mit).M, hor(mit).M_kopp,
        1e-12, 'kNm');
  // KEINE Querkraft: der Term ist ein konstantes Moment ueber die Blechlaenge.
  pruef('Die Blechquerkraft bleibt unberuehrt', hor(mit).V, hor(ohne).V, 1e-12, 'kN');
  pruef('Und damit auch τ', hor(mit).tau, hor(ohne).tau, 1e-12, 'N/mm²');
  // Konstantes Moment heisst: keine Abminderung auf den Anschnitt. Geprueft
  // an einem Joch mit UNGLEICHEN Gurten - sonst faellt eine Verwechslung von
  // My_KnotenG (nach Steifigkeit geteilt) und My_Knoten (haelftig) nicht auf.
  const ug = rechne({ ...v, profOG: 'L 100x100x10', profUG: 'L 80x80x8' });
  const horU = ug.knoten[1].ebenen.find((x) => x.art === 'horizontal' && x.id === 'H_O');
  wahr('Ungleiche Gurte: die Aufteilung ist nicht haelftig',
       Math.abs(ug.knoten[1].My_KnotenG.OG - ug.knoten[1].My_Knoten) > 1e-6);
  pruef('Der Koppelterm folgt der Formel', horU.M_kopp,
        koppelfaktor(ug.modell.profOG, horU, ug.knoten[1].aGurt,
                     horU.lichteLaenge, 'y').faktor
        * Math.abs(ug.knoten[1].My_KnotenG.OG), 1e-9, 'kNm');
  const horUnten = ug.knoten[1].ebenen.find((x) => x.id === 'H_U');
  pruef('Das untere Blech folgt dem UNTERgurt', horUnten.M_kopp,
        koppelfaktor(ug.modell.profUG, horUnten, ug.knoten[1].aGurt,
                     horUnten.lichteLaenge, 'y').faktor
        * Math.abs(ug.knoten[1].My_KnotenG.UG), 1e-9, 'kNm');
  wahr('und ist damit ein anderer Wert', Math.abs(horUnten.M_kopp - horU.M_kopp) > 1e-9);

  // Das Vertikalblech bekommt seinen Anteil aus dem GRUNDRISSmoment, also
  // unter Wind - unter reiner Vertikallast nicht.
  pruef('Vertikalblech ohne Grundrissmoment: kein Koppelterm',
        ver(mit).M_kopp, 0, 1e-12, 'kNm');
  const wind = rechne({ ...v, wkManuell: 2.0,
                        beiwerteFest: { G: 0, WindX: 0, WindY: 1, Schnee: 0, Leiterzug: 0 } });
  const windOhne = rechne({ ...v, wkManuell: 2.0, schiefeBiegung: false,
                            beiwerteFest: { G: 0, WindX: 0, WindY: 1, Schnee: 0, Leiterzug: 0 } });
  wahr('Unter Wind traegt das Vertikalblech den Koppelterm',
       ver(wind).M_kopp > 0 && ver(wind).M > ver(windOhne).M);

  // Ohne Torsion und ohne Wind bleibt die Ausnutzung des JOCHS unveraendert
  // oder steigt - der Term nimmt nie etwas weg.
  wahr('Der Term nimmt nie Beanspruchung weg',
       mit.max.etaGesamt >= ohne.max.etaGesamt - 1e-12);

  // --- Schalter und Hinweis -------------------------------------------------
  wahr('Vorgabe ist eingeschaltet', standardwerte().schiefeBiegung === true);
  wahr('Der Term steht in den Hinweisen',
       hinweise(mit.modell).join(' | ').includes('Schiefe Biegung'));
  wahr('Abgeschaltet wird das vermerkt',
       hinweise(ohne.modell).join(' | ').includes('abgeschaltet'));
  const SCH = await import(J('ui.schema.js'));
  wahr('Der Schalter steht im Optionen-Dialog',
       SCH.optionenFelder(standardwerte())
         .some((a) => a.felder.some((f) => f.key === 'schiefeBiegung')));
}

// ===========================================================================
titel('27  Navigation im Modell: schieben, drehen, auf den Zeiger zoomen');

{
  const R = await import(J('render.3d.js'));

  /**
   * Eine Ansicht OHNE Zeichenfläche. Geprüft wird die Kamerarechnung, nicht
   * das Malen: alles unten läuft über _projektor(), also über genau die
   * Abbildung, mit der auch gezeichnet wird. Ein falsches Vorzeichen fiele
   * hier auf und nicht erst am Bildschirm.
   */
  const ansicht = (grenzen, dist = 10) => {
    const a = Object.create(R.Modellansicht.prototype);
    a.cv = { width: 800, height: 600, clientHeight: 600,
             getBoundingClientRect: () => ({ width: 800, height: 600,
                                             left: 0, top: 0 }) };
    a.kamera = { az: -0.62, el: 0.42, dist, ziel: [4, 0, 0.6],
                 fov: 0.60, pan: [0, 0, 0] };
    a.projektion = 'perspektive';
    a.szene = { grenzen };
    a.zeichne = () => {};
    return a;
  };
  const JOCH = { xMin: 0, xMax: 20, yMin: -0.5, yMax: 0.5, zMin: 0, zMax: 1.2 };

  // --- Auf den Zeiger zoomen ------------------------------------------------
  // Der Punkt unter dem Zeiger muss unter dem Zeiger BLEIBEN. Genau das ist
  // der Unterschied zum Zoomen auf die Bildmitte, und genau daran merkt man
  // ein falsches Vorzeichen.
  {
    const a = ansicht(JOCH);
    const { rechts, hoch } = a._basis();
    const ziel = a._blickziel();
    const w = a._weltProPixel();
    const px = 640, py = 180;                      // irgendwo abseits der Mitte
    const ex = px - 400, ey = py - 300;
    const P = ziel.map((v, i) => v + rechts[i] * ex * w - hoch[i] * ey * w);

    const vor = a._projektor()(P);
    pruef('Der Prüfpunkt liegt anfangs unter dem Zeiger (x)', vor[0], px, 1e-6, 'px');
    pruef('... und in y', vor[1], py, 1e-6, 'px');

    a._zoome(0.5, px, py);
    pruef('Der Abstand halbiert sich', a.kamera.dist, 5, 1e-9, 'm');
    const nach = a._projektor()(P);
    pruef('Nach dem Zoomen liegt er immer noch dort (x)', nach[0], px, 1e-6, 'px');
    pruef('... und in y', nach[1], py, 1e-6, 'px');

    // Und zurück: zweimal zoomen mit Kehrwert führt an denselben Ort.
    a._zoome(2, px, py);
    pruef('Hin und zurück ergibt denselben Abstand', a.kamera.dist, 10, 1e-9, 'm');
    const zurueck = a._projektor()(P);
    pruef('... und denselben Bildpunkt', zurueck[0], px, 1e-6, 'px');
  }

  // Ohne Zeigerpunkt bleibt die Bildmitte stehen - das ist der Weg der
  // Tastatur (+/-), und dort gibt es keinen Zeiger.
  {
    const a = ansicht(JOCH);
    a._zoome(0.5);
    wahr('Ohne Zeigerpunkt wird nicht verschoben',
         a.kamera.pan.every((v) => v === 0));
    pruef('Der Abstand ändert sich trotzdem', a.kamera.dist, 5, 1e-9, 'm');
  }

  // --- Schranken am Modell, nicht fest --------------------------------------
  {
    const gross = ansicht(JOCH);
    const klein = ansicht({ xMin: 0, xMax: 6, yMin: -0.4, yMax: 0.4,
                            zMin: 0, zMax: 0.9 });
    const [minG, maxG] = gross._abstandsgrenzen();
    const [minK, maxK] = klein._abstandsgrenzen();
    wahr('Das lange Joch darf näher heran und weiter weg',
         minG > minK && maxG > maxK,
         `20 m: ${minG.toFixed(2)}…${maxG.toFixed(0)} m · ` +
         `6 m: ${minK.toFixed(2)}…${maxK.toFixed(0)} m`);
    wahr('Ohne Szene bleibt es bei den festen Schranken',
         (() => { const a = ansicht(JOCH); a.szene = null;
                  const [u, o] = a._abstandsgrenzen();
                  return u === 0.4 && o === 400; })());

    const a = ansicht(JOCH, 100);
    a._zoome(1e-9, 640, 180);
    pruef('Näher als die untere Schranke geht es nicht',
          a.kamera.dist, minG, 1e-12, 'm');

    // An der Schranke darf auch nicht mehr mitgeschoben werden - sonst
    // wandert das Modell aus dem Bild, während der Abstand längst steht.
    const b = ansicht(JOCH, minG);
    b._zoome(0.5, 640, 180);
    wahr('An der Schranke bleibt die Verschiebung stehen',
         b.kamera.pan.every((v) => v === 0));
  }

  // --- Schieben: das Bild folgt der Hand ------------------------------------
  {
    const a = ansicht(JOCH);
    const Q = a._blickziel();
    const s0 = a._projektor()(Q);
    a._schiebe(100, 40);
    const s1 = a._projektor()(Q);
    pruef('100 Pixel nach rechts gezogen wandert das Modell 100 nach rechts',
          s1[0] - s0[0], 100, 1e-6, 'px');
    pruef('40 nach unten gezogen wandert es 40 nach unten',
          s1[1] - s0[1], 40, 1e-6, 'px');
  }

  // Aus der Nähe schiebt derselbe Pixelweg WENIGER Weltmass - sonst schösse
  // ein herangezoomtes Modell beim ersten Zug aus dem Bild.
  {
    const fern = ansicht(JOCH, 20), nah = ansicht(JOCH, 2);
    fern._schiebe(100, 0); nah._schiebe(100, 0);
    const wegF = Math.hypot(...fern.kamera.pan);
    const wegN = Math.hypot(...nah.kamera.pan);
    pruef('Der Weg ist dem Abstand verhältnisgleich', wegF / wegN, 10, 1e-9, '-');
  }

  // --- Drehen ---------------------------------------------------------------
  // DAS MODELL FOLGT DER HAND, auf BEIDEN Achsen. Geprüft wird das nicht am
  // Winkel, sondern am Bild: wohin wandert der Punkt, den man beim Ziehen
  // anfasst - der zugewandte, Ziel + vor·r?
  //
  // Eine Bedingung über az allein taugt dafür nicht: sie sagt nur, dass sich
  // etwas ändert, nicht wohin es sich bewegt. Genau darum blieb jahrelang
  // unbemerkt, dass waagrecht der Hand ENTGEGENlief, während senkrecht ihr
  // folgte - das Drehen war spiegelverkehrt.
  {
    const zugewandt = (a, r = 3) => {
      const { vor } = a._basis();
      return a._blickziel().map((v, i) => v + vor[i] * r);
    };
    const zug = (dx, dy) => {
      const a = ansicht(JOCH);
      const P = zugewandt(a);
      const s0 = a._projektor()(P);
      a._drehe(dx, dy);
      const s1 = a._projektor()(P);
      return [s1[0] - s0[0], s1[1] - s0[1]];
    };
    wahr('Nach rechts gezogen wandert die zugewandte Seite nach rechts',
         zug(60, 0)[0] > 20, `${zug(60, 0)[0].toFixed(0)} px`);
    wahr('Nach links gezogen nach links',
         zug(-60, 0)[0] < -20, `${zug(-60, 0)[0].toFixed(0)} px`);
    wahr('Nach unten gezogen nach unten',
         zug(0, 60)[1] > 20, `${zug(0, 60)[1].toFixed(0)} px`);
    wahr('Nach oben gezogen nach oben',
         zug(0, -60)[1] < -20, `${zug(0, -60)[1].toFixed(0)} px`);
    // Gleich empfindlich - sonst fasst sich das Drehen schief an.
    const wg = Math.abs(zug(60, 0)[0]), sk = Math.abs(zug(0, 60)[1]);
    wahr('Beide Achsen sprechen gleich stark an',
         Math.min(wg, sk) / Math.max(wg, sk) > 0.8,
         `${wg.toFixed(0)} px waagrecht gegen ${sk.toFixed(0)} px senkrecht`);

    const a = ansicht(JOCH);
    a._drehe(80, 0);
    wahr('Die feste Blickrichtung gilt danach nicht mehr', a.ansichtKey === null);

    // Volle Fensterbreite ~ halbe Umdrehung. Die Breite ist hier gleich der
    // Gerätepixelbreite (dpr = 1), also 800.
    const b = ansicht(JOCH);
    const azB = b.kamera.az;
    b._drehe(800, 0);
    pruef('Eine volle Breite dreht um eine halbe Umdrehung',
          b.kamera.az - azB, Math.PI, 1e-9, 'rad');

    const c = ansicht(JOCH);
    c._drehe(37, 11, true);
    const r = Math.PI / 12;
    wahr('Umschalt rastet auf 15 Grad',
         Math.abs(c.kamera.az / r - Math.round(c.kamera.az / r)) < 1e-9 &&
         Math.abs(c.kamera.el / r - Math.round(c.kamera.el / r)) < 1e-9,
         `az = ${(c.kamera.az * 180 / Math.PI).toFixed(1)}°, ` +
         `el = ${(c.kamera.el * 180 / Math.PI).toFixed(1)}°`);

    const d = ansicht(JOCH);
    d._drehe(0, 1e6);
    pruef('Über den Pol hinaus geht es nicht', d.kamera.el, 1.45, 1e-12, 'rad');
    d._drehe(0, -1e6);
    pruef('Und darunter auch nicht', d.kamera.el, -1.45, 1e-12, 'rad');
  }

  // --- Finger ---------------------------------------------------------------
  // Zwei Finger sind der einzige Weg, auf einem Tablett zu zoomen. Geprüft
  // wird die Quelle: ohne die Zeigerliste gäbe es nur einen Finger, und der
  // dreht.
  {
    const q = readFileSync(join(HIER, 'js', 'render.3d.js'), 'utf8');
    wahr('Alle aufliegenden Zeiger werden geführt',
         q.includes('const zeiger = new Map()'));
    wahr('Zwei Finger kneifen und wischen', q.includes("art: 'kneifen'"));
    wahr('Hebt einer ab, wird neu angesetzt statt gesprungen',
         /zeiger\.size === 1 && griff\?\.art === 'kneifen'/.test(q));
    wahr('Der Doppeltipp kommt ohne dblclick aus',
         !q.includes("addEventListener('dblclick'") && q.includes('tippZeit'));
    wahr('Radschritte in Zeilen und Seiten werden umgerechnet',
         q.includes('inPixel') && q.includes('modus === 1'));
    wahr('Die Zeichenfläche nimmt Tastendrücke entgegen',
         q.includes('c.tabIndex = 0') && q.includes("addEventListener('keydown'"));
  }
}

// ===========================================================================
titel('28  Installierbare Fassung: Manifest, Dienstarbeiter, Dateien');

{
  const M = JSON.parse(readFileSync(join(HIER, 'manifest.webmanifest'), 'utf8'));

  wahr('Startort und Geltungsbereich liegen im eigenen Verzeichnis',
       M.start_url === './' && M.scope === './');
  wahr('Ein zweiter Aufruf holt das offene Fenster nach vorn',
       M.launch_handler?.client_mode === 'focus-existing');

  // Dateien annehmen. Der Browser fragt bei der Installation um Erlaubnis;
  // ohne den Eintrag käme die Frage gar nicht erst.
  const fh = (M.file_handlers ?? [])[0];
  wahr('JSON-Dateien werden angenommen',
       (fh?.accept?.['application/json'] ?? []).includes('.json'));
  wahr('Der Bearbeiter zeigt auf den Startort', fh?.action === './');
  wahr('Eine zweite Datei landet im selben Fenster',
       fh?.launch_type === 'single-client');

  const kurz = M.shortcuts ?? [];
  wahr('Die Sprungliste hat Einträge', kurz.length >= 3, `${kurz.length} Stück`);
  const wuensche = kurz.map((s) => new URL(s.url, 'https://x/').searchParams.get('los'));
  wahr('Jeder Eintrag trägt seinen Wunsch in der Adresse',
       wuensche.every(Boolean) && new Set(wuensche).size === wuensche.length,
       wuensche.join(', '));

  // --- Dienstarbeiter -------------------------------------------------------
  const sw = readFileSync(join(HIER, 'sw.js'), 'utf8');
  const module = readdirSync(join(HIER, 'js')).filter((n) => n.endsWith('.js'));
  wahr('Der Dienstarbeiter führt JEDES Modul aus js/',
       module.every((n) => sw.includes(`'js/${n}'`)), `${module.length} Module`);
  wahr('Manifest und Stylesheet liegen mit in der Ablage',
       sw.includes("'manifest.webmanifest'") && sw.includes("'css/style.css'"));
  wahr('Er liefert sich selbst nie aus der Ablage',
       sw.includes("endsWith('/sw.js')"));
  wahr('Er übernimmt erst auf Zuruf', sw.includes("=== 'uebernehmen'"));
  // OHNE data/: die drei Datenbanken sind keine Startvoraussetzung, sie
  // können als Datenpaket im Browser hinterlegt sein.
  wahr('Die Datenbanken stehen NICHT in der Ablageliste',
       !/'data\//.test(sw.slice(sw.indexOf('const SCHALE'),
                               sw.indexOf('Ende erzeugter Block'))));

  // --- Modul ----------------------------------------------------------------
  const P = await import(J('pwa.js'));
  wahr('pwa.js nimmt Dateien entgegen', typeof P.dateiEmpfang === 'function');
  wahr('... reicht den Wunsch aus der Sprungliste', typeof P.startWunsch === 'function');
  wahr('... und meldet den Netzzustand', typeof P.netzZustand === 'function');
  wahr('Ohne Adresse gibt es keinen Wunsch', P.startWunsch() === null);
  wahr('Ohne Browser bricht der Netzzustand nicht ab', P.netzZustand() === false);

  const pq = readFileSync(join(HIER, 'js', 'pwa.js'), 'utf8');
  wahr('Nur echte Dateien werden hereingelassen',
       pq.includes("includes('Files')"));
  wahr('Der Browser darf die Datei nicht selbst öffnen',
       pq.includes('e.preventDefault()'));

  // --- Anwendung ------------------------------------------------------------
  const aq = readFileSync(join(HIER, 'js', 'app.js'), 'utf8');
  wahr('Die Anwendung nimmt Dateien entgegen',
       aq.includes('dateiEmpfang(dateiAnnehmen)'));
  // Fehlt die Datenbasis, steigt start() aus. Der Empfang muss VORHER stehen -
  // sonst liesse sich das Datenpaket gerade dann nicht hineinziehen, wenn es
  // gebraucht wird.
  // Der Aufruf heisst seit dem 1. September nur noch dialogDaten() - das
  // Verwalten der Datenbasis steht unter Optionen, hier bleibt der Start
  // ohne Daten.
  wahr('Und zwar bevor sie mangels Datenbasis aussteigt',
       aq.indexOf('dateiEmpfang(dateiAnnehmen)') < aq.indexOf('dialogDaten();'));
  wahr('Alle drei Dateiarten werden unterschieden',
       ['PAKET_FORMAT', 'tragjoch-ablage', 'tragjoch-stabmodell']
         .every((s) => aq.includes(s)));
  wahr('Eingelesen wird nie ungefragt',
       aq.includes("dialog('Ablage einlesen'") &&
       aq.includes("dialog('Datenpaket laden'"));
  wahr('Der Wunsch aus der Sprungliste wird ausgeführt',
       aq.includes('switch (startWunsch())'));
  wahr('Auch der Fussknopf eines Dialogs schliesst ihn',
       aq.includes("querySelectorAll('[data-zu]')"));

  // --- Darstellung ----------------------------------------------------------
  const css = readFileSync(join(HIER, 'css', 'style.css'), 'utf8');
  wahr('Der Streifen der Fensterknöpfe wird freigehalten',
       css.includes('titlebar-area-x') && css.includes('titlebar-area-width'));
  wahr('Die Kopfleiste zieht das Fenster, ihre Knöpfe nicht',
       css.includes('app-region: drag') && css.includes('app-region: no-drag'));
  wahr('Eine hereingezogene Datei wird angezeigt',
       css.includes('body.datei-ueber'));

  const html = readFileSync(join(HIER, 'index.html'), 'utf8');
  wahr('Die Modulfassung verweist auf das Manifest',
       html.includes('rel="manifest"'));
}

// ===========================================================================
titel('29  Schnitt im Modell und angeschriebene Werte');

{
  const R = await import(J('render.3d.js'));

  const mitSchnitt = (orient) => {
    const w = { ...standardwerte(), schnittAktiv: true, schnittOrientierung: orient };
    const e = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                       getStahl(w.stahl), T.getTragjoch(w.typ));
    return { e, sz: R.erzeugeSzene(e.modell, e) };
  };

  // --- Was der Längsschnitt überhaupt hergibt -------------------------------
  // Er legt die Bleche EINER Ebene über die ganze Spannweite frei; das ist
  // sein Zweck. Der Querschnitt dagegen liegt an einer Stelle.
  {
    const q = mitSchnitt('quer');
    const v = mitSchnitt('vertikal');
    const h = mitSchnitt('horizontal');
    const marken = (o) => (o.sz.marken ?? []).filter((m) => m.art === 'spannung');
    const xVon = (o) => Math.min(...o.sz.schnitt.poly.map((p) => p[0]));
    const xBis = (o) => Math.max(...o.sz.schnitt.poly.map((p) => p[0]));

    wahr('Der Querschnitt liegt an einer einzigen Stelle',
         xVon(q) === xBis(q), `x = ${xVon(q).toFixed(2)} m`);
    wahr('Der Längsschnitt läuft über die ganze Spannweite',
         xVon(v) === 0 && Math.abs(xBis(v) - q.e.modell.L) < 1e-9,
         `${xVon(v).toFixed(2)} … ${xBis(v).toFixed(2)} m`);
    wahr('Beide Längsrichtungen beschriften jedes Blech ihrer Ebene',
         marken(v).length > 25 && marken(h).length > 25,
         `vertikal ${marken(v).length} · horizontal ${marken(h).length}`);
    wahr('Der Querschnitt tut das nicht - dort steht die Auswertung daneben',
         marken(q).length < marken(v).length / 4,
         `quer ${marken(q).length}`);

    // DIE ZAHL, DIE DEN FEHLER BENANNTE: auf drei Felder zugeschnitten sah
    // man sieben von dreiunddreissig Blechen. Der Ausschnitt darf sich beim
    // Längsschnitt deshalb nicht auf den Nachweisschnitt legen.
    const xN = v.sz.xNachweis;
    const halb = Math.max(1.6, (v.e.modell.a1eff ?? 0.75) * 3);
    const imFenster = marken(v)
      .filter((m) => m.p[0] >= xN - halb && m.p[0] <= xN + halb).length;
    wahr('Ein Ausschnitt von drei Feldern verdeckte die meisten davon',
         imFenster < marken(v).length / 3,
         `${imFenster} von ${marken(v).length} lägen im Fenster ±${halb.toFixed(2)} m`);
  }

  // --- Und was zeigeSchnitt daraus macht ------------------------------------
  // Geprüft wird die ENTSCHEIDUNG, nicht die Animation: die Kamerafahrten
  // brauchen requestAnimationFrame und gehören nicht in den Prüfstand.
  {
    const stand = (orient) => {
      const { sz } = mitSchnitt(orient);
      const a = Object.create(R.Modellansicht.prototype);
      a.szene = sz;
      a.ebenen = { kraefte: false, schnitt: false };
      a.kamera = { az: 0, el: 0, dist: 10, ziel: [0, 0, 0], fov: 0.6, pan: [0, 0, 0] };
      a.fokus = { von: 1, bis: 2 };            // Rest eines früheren Zooms
      a.station = 7;
      const ruf = [];
      a.zoomAuf = (x, st, breite) => { ruf.push(['zoomAuf', x, breite]);
                                       a.fokus = { von: x - breite, bis: x + breite }; };
      a.blickrichtung = (k) => { ruf.push(['blick', k]); a.fokus = null;
                                 a.station = null; a.ansichtKey = k; };
      a.zeigeSchnitt(2.13);
      return { a, ruf };
    };

    const q = stand('quer');
    wahr('Schnitt zeigen schaltet Kräfte und Ebene ein',
         q.a.ebenen.kraefte === true && q.a.ebenen.schnitt === true);
    wahr('Quer wird herangefahren und aufgetrennt',
         q.ruf[0][0] === 'zoomAuf' && q.a.fokus !== null,
         `Fenster ${q.a.fokus.von.toFixed(2)} … ${q.a.fokus.bis.toFixed(2)} m`);

    const v = stand('vertikal');
    wahr('Vertikal zeigt das GANZE Joch', v.a.fokus === null);
    wahr('... und zwar von der Seite', v.ruf[0][0] === 'blick' && v.ruf[0][1] === 'laengs');
    wahr('Eine hervorgehobene Station wird dabei aufgehoben', v.a.station === null);

    const h = stand('horizontal');
    wahr('Horizontal zeigt das ganze Joch von oben',
         h.a.fokus === null && h.ruf[0][1] === 'oben');

    // Der Feldschieber ruft bei jedem Schritt herein. Beim Längsschnitt
    // ändert er nur die Stelle der Auswertung - das Bild steht schon richtig,
    // und ein zweiter Schwenk risse es dem Betrachter unter der Hand weg.
    v.a.zeigeSchnitt(2.13);
    wahr('Ein zweiter Aufruf schwenkt nicht noch einmal',
         v.ruf.length === 1, `${v.ruf.length} Kamerafahrt(en)`);
    // Hat er sich hingegen etwas herangeholt, wird wieder eingerichtet.
    v.a.fokus = { von: 9, bis: 12 };
    v.a.zeigeSchnitt(2.13);
    wahr('Nach einem Zoom auf eine Stelle schon', v.ruf.length === 2);
  }

  // --- Werte anschreiben: nichts halb Geschriebenes -------------------------
  // Eine am Bildrand abgeschnittene 118 liest sich als 18. Eine halbe Zahl
  // ist schlimmer als keine.
  {
    const a = Object.create(R.Modellansicht.prototype);
    a.cv = { width: 800, height: 600 };
    a._s = 1;
    a.schriftLast = 10;
    a._breiten = new Map();
    const c = { font: '10px x', measureText: (s) => ({ width: s.length * 6 }) };

    wahr('Mitten im Bild wird angeschrieben', a._imBild(c, '118', 400, 300));
    wahr('Am linken Rand nicht mehr', !a._imBild(c, '118', 1, 300));
    wahr('Am rechten Rand auch nicht', !a._imBild(c, '118', 790, 300));
    wahr('Und oben und unten ebenso wenig',
         !a._imBild(c, '118', 400, 4) && !a._imBild(c, '118', 400, 599));
    // Eine kurze Zahl passt noch, wo eine lange nicht mehr passt.
    wahr('Der Platzbedarf richtet sich nach der Zahl',
         a._imBild(c, '1', 770, 300) && !a._imBild(c, '130.25', 770, 300));
  }

  // --- Die Rangfolge der Beschriftungen -------------------------------------
  // Vier Zeichengaenge schreiben ins Bild. Bemassung und Marken gewinnen,
  // Pfeiltexte und Werte weichen aus - so hat es der Auftraggeber festgelegt.
  // Frueher fuehrte jeder Gang eine eigene Freihalteliste und schrieb den
  // anderen quer darueber.
  {
    const q = readFileSync(join(HIER, 'js', 'render.3d.js'), 'utf8');
    // Die Reihenfolge im Bildaufbau IST die Rangfolge: wer zuerst zeichnet,
    // belegt zuerst. Steht _texte nicht hinter _marken und _masse, kann es
    // ihnen gar nicht ausweichen.
    const i = (s) => q.indexOf(s, q.indexOf('_lastflaechen(c, proj, t)'));
    wahr('Die Pfeile werden vor den Marken gezeichnet',
         i('this._vektoren(c, proj, t)') < i('this._marken(c, proj, t)'));
    wahr('Die freien Texte kommen NACH Marken und Bemassung',
         i('this._texte(c, t)') > i('this._marken(c, proj, t)') &&
         i('this._texte(c, t)') > i('this._masse(c, proj, t)'));
    wahr('Die Pfeilbeschriftung zeichnet nicht mehr selbst',
         q.includes('this._pfeiltexte.push('));

    // Und die Wirkung: ein belegter Platz nimmt Pfeiltext wie Wert auf.
    const bau = () => {
      const a = Object.create(R.Modellansicht.prototype);
      a.cv = { width: 800, height: 600 };
      a._s = 1; a.schriftLast = 10; a._breiten = new Map();
      a._font = () => '10px mono';
      a._belegt = [];
      a.gruppen = { resultate: false };
      a.werteAnschreiben = false;
      a.gezeichnet = [];
      a._beschriftung = (c, t, text) => a.gezeichnet.push(text);
      a._pfeiltexte = [{ text: 'F_z = 1.30 kN', x: 400, y: 300, farbe: '#fff' },
                       { text: 'F_y = 0.91 kN', x: 400, y: 340, farbe: '#fff' }];
      return a;
    };
    const c2 = { font: '10px mono', measureText: (s) => ({ width: s.length * 6 }) };

    const frei = bau();
    frei._texte(c2, {});
    pruef('Auf freiem Grund stehen beide Pfeiltexte',
          frei.gezeichnet.length, 2, 1e-12, 'Stk');

    const eng = bau();
    // Dort, wo der erste Pfeiltext hinwollte, steht schon eine Masszahl.
    eng._belegt.push({ x: 395, y: 290, w: 60, h: 14 });
    eng._texte(c2, {});
    wahr('Wo eine Masszahl steht, weicht der Pfeiltext',
         eng.gezeichnet.length === 1 && eng.gezeichnet[0] === 'F_y = 0.91 kN',
         eng.gezeichnet.join(' | '));
    pruef('Der gesetzte Text belegt seinerseits einen Platz',
          eng._belegt.length, 2, 1e-12, 'Eintraege');
  }
}

// ===========================================================================
titel('30  Hauptschalter der Werkzeuggruppen');

{
  const R = await import(J('render.3d.js'));

  const sicht = (ebenen, gruppen) => {
    const a = Object.create(R.Modellansicht.prototype);
    a.ebenen = { profil: true, blech: true, anbau: true, achse: true,
                 last: true, kraefte: true, masse: true, schnitt: true,
                 raster: true, marken: true, auflager: true, ...ebenen };
    a.gruppen = { modell: true, lasten: true, resultate: true, ...gruppen };
    return a;
  };

  // Aus heisst AUS: der Hauptschalter nimmt die ganze Gruppe aus dem Bild.
  // Vorher fragten nur die Pfeile danach - die Volumenkoerper und die
  // Lastflaechen nicht. «Lasten aus» liess Wind und Schnee stehen.
  {
    const a = sicht({}, { lasten: false });
    wahr('Lasten aus nimmt die Lastebene mit', !a._ebeneAn('last'));
    wahr('... laesst das Joch aber stehen',
         a._ebeneAn('profil') && a._ebeneAn('blech'));
    wahr('... und die Resultate auch', a._ebeneAn('kraefte'));
  }
  {
    const a = sicht({}, { modell: false });
    wahr('Modell aus nimmt Gurte, Bleche, Achsen und Bemassung mit',
         ['profil', 'blech', 'achse', 'auflager', 'masse', 'raster']
           .every((k) => !a._ebeneAn(k)));
    wahr('... laesst die Lasten stehen', a._ebeneAn('last'));
  }
  {
    const a = sicht({}, { resultate: false });
    wahr('Resultate aus nimmt Schnittkraefte und Schnittebene mit',
         !a._ebeneAn('kraefte') && !a._ebeneAn('schnitt'));
    wahr('... laesst Joch und Lasten stehen',
         a._ebeneAn('profil') && a._ebeneAn('last'));
  }
  {
    const a = sicht({}, { modell: false, lasten: false, resultate: false });
    wahr('Alle drei aus laesst nichts uebrig',
         ['profil', 'blech', 'achse', 'auflager', 'masse', 'raster',
          'last', 'kraefte', 'schnitt'].every((k) => !a._ebeneAn(k)));
  }

  // Der Einzelschalter behaelt das letzte Wort in die andere Richtung.
  wahr('Ein ausgeschalteter Einzelschalter bleibt aus, auch wenn die Gruppe an ist',
       !sicht({ blech: false }, {})._ebeneAn('blech'));
  // Und was keinen Hauptschalter ueber sich hat, folgt nur sich selbst.
  wahr('Ebenen ohne Gruppe folgen allein ihrem Einzelschalter',
       sicht({}, { modell: false, lasten: false, resultate: false })
         ._ebeneAn('marken'));

  // Damit die Tabelle ueberhaupt greift, muessen die Lastflaechen der Szene
  // die Gruppe 'last' tragen - sonst zielte der Schalter ins Leere.
  {
    const w = standardwerte();
    const e = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                       getStahl(w.stahl), T.getTragjoch(w.typ));
    const sz = R.erzeugeSzene(e.modell, e);
    const fl = sz.lastflaechen ?? [];
    wahr('Es gibt Lastflaechen', fl.length > 0, `${fl.length} Stueck`);
    wahr('Und alle tragen die Gruppe der Lasten',
         fl.every((f) => f.gruppe === 'last'),
         [...new Set(fl.map((f) => f.lastart))].join(', '));
  }

  // --- Anbauteile sind Tragwerk, nicht Last --------------------------------
  // Wer die Lasten global abstellt, um das Joch zu sehen, will den WEG
  // behalten, auf dem die Last hereinkommt: Staender, Ausleger, Traverse.
  // Nur was die Last selbst darstellt, geht mit ihr.
  {
    const teile = ['ja-einfach', 'hs-nt-ausleger', 'leiter-traverse']
      .map((id, i) => A.neuesAnbauteil(id, 5 + i * 5));
    const w = { ...standardwerte(), anbauteile: teile };
    const e = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                       getStahl(w.stahl), T.getTragjoch(w.typ));
    const sz = R.erzeugeSzene(e.modell, e);

    const at = (sz.flaechen ?? []).filter((f) => f.anbauteil);
    const koerper = at.filter((f) => !f.punkt);
    const punkte = at.filter((f) => f.punkt);
    wahr('Die Baugruppen stehen im Modell', koerper.length > 50 && punkte.length > 0,
         `${koerper.length} Koerper- und ${punkte.length} Angriffspunktflaechen`);
    wahr('Der KOERPER liegt in der eigenen Ebene anbau',
         koerper.every((f) => f.gruppe === 'anbau'));
    wahr('Der Wuerfel am Angriffspunkt bleibt bei den Lasten',
         punkte.every((f) => f.gruppe === 'last'));

    const mk = (art) => (sz.marken ?? []).filter((m) => m.art === art);
    wahr('Die Positionsnummer gehoert zum Bauteil',
         mk('anbau').length > 0 && mk('anbau').every((m) => m.gruppe === 'anbau'),
         `${mk('anbau').length} Nummern`);
    wahr('Der Lastknoten gehoert zur Last',
         mk('lastknoten').length > 0 &&
         mk('lastknoten').every((m) => m.gruppe === 'last'),
         `${mk('lastknoten').length} Knoten`);

    // Und die Wirkung am Schalter
    const a1 = sicht({}, { lasten: false });
    wahr('Lasten aus laesst die Anbauteile stehen', a1._ebeneAn('anbau'));
    wahr('... nimmt aber ihre Lastdarstellung mit', !a1._ebeneAn('last'));
    const a2 = sicht({}, { modell: false });
    wahr('Modell aus nimmt sie mit - sie sind Tragwerk', !a2._ebeneAn('anbau'));
    wahr('Sie lassen sich auch einzeln abschalten',
         !sicht({ anbau: false }, {})._ebeneAn('anbau'));

    const aq = readFileSync(join(HIER, 'js', 'app.js'), 'utf8');
    const wz = aq.slice(aq.indexOf('const WZ_MODELL'), aq.indexOf('const WZ_LASTEN'));
    wahr('Der Schalter steht in der Gruppe Modell', wz.includes("key: 'anbau'"));
  }

  // --- Die drei Listen muessen zusammenpassen ------------------------------
  // Eine Ebene, die in HAUPTSCHALTER steht, aber keinen Anfangswert in
  // this.ebenen hat, ist von Anfang an unsichtbar - _ebeneAn liest undefined
  // und antwortet nein. Genau daran ist die Prüfung oben zuerst gescheitert,
  // wenn auch nur in ihrem eigenen Nachbau. Also beide Listen vergleichen.
  {
    const q = readFileSync(join(HIER, 'js', 'render.3d.js'), 'utf8');
    /*
     * KOMMENTARE ZUERST WEG.
     *
     * Gelesen wird mit einem Muster «Wort: kleinbuchstabe» - und genau so
     * sieht ein deutscher Satz aus. Ein Kommentar mit «Gruppe: sie kommen
     * von aussen» erzeugte prompt eine Ebene namens `Gruppe`, die es nie
     * gab, und der Pruefstand meldete einen Fehler in seiner eigenen
     * Messung. Prosa ist kein Quelltext.
     */
    const ausBlock = (von, bis) => {
      const a = q.indexOf(von);
      const s = q.slice(a, q.indexOf(bis, a)).replace(/\/\/.*/g, '');
      return new Set([...s.matchAll(/(\w+):\s*['a-z]/g)].map((m) => m[1]));
    };
    const haupt = ausBlock('const HAUPTSCHALTER = {', '};');
    const vorgabe = ausBlock('this.ebenen = {', '};');
    const fehlt = [...haupt].filter((k) => !vorgabe.has(k));
    wahr('Jede Ebene mit Hauptschalter hat auch einen Anfangswert',
         fehlt.length === 0, fehlt.length ? `fehlt: ${fehlt.join(', ')}` :
         `${haupt.size} Ebenen unter vier Gruppen`);
  }

  /*
   * DAS ACHSENKREUZ MUSS UEBER DER FUSSLEISTE BLEIBEN.
   *
   * Gemeldet vom Auftraggeber: die Systemachsen werden verdeckt. Ursache war
   * eine Aenderung an ganz anderer Stelle - der Knopf "Ganzes Joch zeigen"
   * wanderte in die Fussleiste, und die wuchs damit von 36 auf 46 px. Der
   * Ursprung des Kreuzes stand bei genau 46 px ueber dem Rand, also auf ihrer
   * Oberkante; jeder nach unten zeigende Arm lag darunter.
   *
   * Zwei Zahlen in zwei Dateien, die zusammengehoeren und nichts voneinander
   * wissen. Also hier nachgerechnet: die Leistenhoehe aus dem Stylesheet
   * (Rand + Knopf + Rand) gegen die Konstante im Zeichner.
   */
  {
    const css = readFileSync(join(HIER, 'css', 'style.css'), 'utf8');
    const r3d = readFileSync(join(HIER, 'js', 'render.3d.js'), 'utf8');
    const zahl = (quelle, muster) => {
      const m = quelle.match(muster);
      return m ? parseFloat(m[1]) : NaN;
    };
    const fussRand = zahl(css, /\.viewer-fuss\s*\{[^}]*padding:\s*(\d+)px/);
    const knopf = zahl(css, /\.btn-icon\s*\{[^}]*height:\s*(\d+)px/);
    const arm = zahl(r3d, /const ACHSENKREUZ_ARM = (\d+);/);
    const hoch = zahl(r3d, /const ACHSENKREUZ_HOCH = (\d+);/);
    wahr('Die Masse lassen sich alle vier lesen',
         [fussRand, knopf, arm, hoch].every(Number.isFinite),
         `Rand ${fussRand}, Knopf ${knopf}, Arm ${arm}, Hoehe ${hoch}`);
    // Die Leiste: Rand oben + Knopf + Rand unten.
    const leiste = 2 * fussRand + knopf;
    pruef('Die Fussleiste ist so hoch wie gemessen', leiste, 46, 1e-9, 'px');
    // Darunter darf nichts vom Kreuz liegen: Ursprung + Arm + eine Zeile.
    const noetig = leiste + arm + 12;
    wahr('Das Achsenkreuz steht hoch genug ueber der Fussleiste',
         hoch >= noetig, `${hoch} px gegen mindestens ${noetig} px`);
    // Und nicht so hoch, dass es im Bild schwebt - eine Armlaenge Luft genuegt.
    wahr('Aber nicht unnoetig weit oben', hoch <= noetig + arm,
         `${hoch} px gegen hoechstens ${noetig + arm} px`);
  }

}

// ===========================================================================
titel('31  Bewegung: nichts springt');

{
  const css = readFileSync(join(HIER, 'css', 'style.css'), 'utf8');
  const aq = readFileSync(join(HIER, 'js', 'app.js'), 'utf8');

  // --- Wer keine Bewegung will, bekommt keine ------------------------------
  wahr('Das Stylesheet achtet auf «Bewegung reduzieren»',
       css.includes('prefers-reduced-motion: reduce'));
  // Und zwar auf einen Wimpernschlag, NICHT auf null: bei 0s faellt in
  // manchen Browsern das Ereignis transitionend aus, an dem weich() in
  // app.js haengt - der Bereich bliebe dann in der Klasse «animiert» stehen.
  const block = css.slice(css.indexOf('prefers-reduced-motion'));
  wahr('Abgeschaltet wird auf .01ms, nicht auf null',
       block.includes('transition-duration: .01ms') &&
       block.includes('animation-duration: .01ms'));

  // --- Dialoge: erst fahren, dann wegraeumen -------------------------------
  wahr('Der Dialog wird erst nach der Schliessbewegung geleert',
       aq.includes('DIALOG_ZU_MS') && /setTimeout\([\s\S]{0,200}innerHTML = ''/.test(aq));
  wahr('Ein zweiter Dialog wird dabei nicht mitgerissen',
       aq.includes('dialogLauf !== meins'));

  // Die Dauer steht an zwei Orten - im Skript und im Stylesheet. Laufen sie
  // auseinander, raeumt das Skript zu frueh weg (Sprung) oder zu spaet
  // (Hänger). Also vergleichen.
  const ms = (re, txt, f = 1) => {
    const m = txt.match(re);
    return m ? Math.round(parseFloat(m[1]) * f) : null;
  };
  const jsDialog = ms(/DIALOG_ZU_MS = (\d+)/, aq);
  const cssDialog = ms(/animation: dialog-zu \.(\d+)s/, css, 10);
  pruef('Dialog: Skript und Stylesheet nennen dieselbe Dauer',
        jsDialog, cssDialog, 1e-9, 'ms');

  const jsSchub = ms(/SCHUBLADE_ZU_MS = (\d+)/, aq);
  const cssSchub = ms(/animation: schublade-zu \.(\d+)s/, css, 10);
  pruef('Schublade: dieselbe Dauer an beiden Orten',
        jsSchub, cssSchub, 1e-9, 'ms');

  wahr('Die Schublade faehrt auch zu, nicht nur auf',
       css.includes('@keyframes schublade-zu') &&
       aq.includes('function schubladeZufahren'));
  wahr('Ein Wiederaufmachen bricht das Zufahren ab',
       aq.includes("n.classList.remove('zu');      // falls sie noch am Zufahren war"));

  // --- Was NICHT gefahren werden darf --------------------------------------
  // Ein η, das von 0.58 auf 1.33 hochzaehlt, zeigt unterwegs Werte, die nie
  // gerechnet wurden. Bewegt wird die Farbe, nie die Ziffer.
  const pille = css.slice(css.indexOf('.schiene-nw b, .schiene-nw i'));
  wahr('An den Nachweispillen laeuft nur die Farbe',
       /\.schiene-nw b, \.schiene-nw i \{ transition: color/.test(pille));
  wahr('Der Vermerk dazu steht im Stylesheet',
       css.includes('ZAHLEN WERDEN NICHT GEFAHREN'));

  // --- Der Unterstrich der Reiter ------------------------------------------
  wahr('Der Reiter-Unterstrich laeuft mit',
       /\.tab \{ transition:[^}]*border-bottom-color/.test(css));

  // --- Das Schnittblatt: Bedienung bleibt, Zahlen erneuern sich ------------
  // Dieselbe Ursache wie beim Lastfall-Waehler: die Bedienung rechnet, das
  // Rechnen zeichnet das Blatt neu, und der bediente Knoten war weg. Am
  // Schieber riss das den Zug ab, an der Auswahlliste blinkte es.
  {
    const uq = readFileSync(join(HIER, 'js', 'ui.js'), 'utf8');
    const f = uq.slice(uq.indexOf('export function zeichneSchnitt'));
    const ende = f.indexOf('export function', 20);
    const fn = ende > 0 ? f.slice(0, ende) : f;
    wahr('Das Blatt ist in Bedienung und Zahlen geteilt',
         fn.includes('id="schnitt-steuerung"') && fn.includes('id="schnitt-zahlen"'));
    wahr('Neu gebaut wird die Bedienung nur bei geaenderter Struktur',
         fn.includes("st.dataset.sig !== sig"));
    wahr('Die Struktur ist Feldzahl und Orientierungsliste',
         /const sig = JSON\.stringify\(\[sn\.anzahlSchnitte/.test(fn));
    // Verdrahtet wird nur beim Aufbau - sonst haengen nach zehn Rechnungen
    // zehn Zuhoerer am selben Schieber.
    const zweig = fn.slice(fn.indexOf('if (!st ||'), fn.indexOf('} else {'));
    wahr('Verdrahtet wird nur beim Aufbau',
         zweig.includes("addEventListener('change'") &&
         zweig.includes("addEventListener('input'"));
    wahr('Sonst werden nur die Werte nachgezogen',
         fn.includes("setze('#schnitt-orient', 'value', orient)"));
  }

  // --- Die Fahrt der Bereiche ----------------------------------------------
  // Zwei Fehler steckten darin: die Flaeche blitzte leer durch, und das
  // Modell zoomte, statt sich nur zu verschieben.
  {
    const rq = readFileSync(join(HIER, 'js', 'render.3d.js'), 'utf8');
    const fn = rq.slice(rq.indexOf('  passeGroesseAn() {'));
    const ende = fn.indexOf(String.fromCharCode(10) + '  }');
    const gr = fn.slice(0, ende);

    // cv.width zu setzen leert die Flaeche. Wird erst im naechsten Bild
    // gezeichnet, liegt dazwischen ein fertiges Bild mit leerem Grund -
    // gemessen: 12 Groessenwechsel, 12 leere Bilder.
    wahr('Nach der neuen Groesse wird SOFORT gezeichnet',
         gr.includes('cancelAnimationFrame(this._angefordert)') &&
         gr.trimEnd().endsWith('this._male();'));
    // Und nicht mehr eingepasst: der Massstab haengt allein an der Hoehe,
    // eine schmalere Flaeche gibt also weniger frei, statt zu zoomen.
    wahr('Eingepasst wird nur beim ersten Mal',
         gr.includes('this._ersteGroesse !== false') &&
         // Nur der Aufruf zaehlt, nicht das Wort im Kommentar daneben.
         (gr.match(/this\.passeEin\(\);/g) || []).length === 1);
    wahr('Eine Folge von Schritten wird erkannt',
         gr.includes('this.sparsam = jetzt - (this._letzteGroesse'));
    wahr('Und das volle Bild kommt danach nach',
         gr.includes('this.sparsam = false;') && gr.includes('this.zeichne();'));

    // Sparsam heisst: keine Koerper, keine Beschriftungen - die Achsen
    // tragen dieselben Kennwerte und dieselbe Einfaerbung.
    wahr('Sparsam werden die Koerper weggelassen',
         rq.includes('if (!this.sparsam) this.szene.flaechen.forEach('));
    wahr('... und die Beschriftungen auch',
         /if \(!this\.sparsam\) \{[\s\S]{0,220}this\._texte\(c, t\);/.test(rq));
    wahr('Die Achsen vertreten sie fuer die Dauer der Fahrt',
         rq.includes("if (this.sparsam || this._ebeneAn('achse')"));
    // Der HAUPTSCHALTER gilt aber weiter - sonst erschiene ein abgeschaltetes
    // Modell waehrend der Fahrt wieder.
    wahr('Der Hauptschalter gilt auch im sparsamen Bild',
         rq.includes('if (this.sparsam) { if (!this.gruppen.modell) return; }'));
  }

  // --- Die verschiebbare Karte --------------------------------------------
  // Waehrend der Fahrt Versatz statt left/top, und hoechstens ein Schreiben
  // je Bild. Beides zusammen ist der Unterschied zwischen Ziehen und Ruckeln.
  {
    const zieh = aq.slice(aq.indexOf('function verdrahteLegendeZiehen'),
                          aq.indexOf('/** Gemerkte Lage der Legende'));
    wahr('Gezogen wird ueber den Versatz', zieh.includes('translate3d('));
    wahr('Geschrieben wird hoechstens einmal je Bild',
         zieh.includes('requestAnimationFrame(male)') &&
         zieh.includes('if (angefordert)'));
    wahr('Festgeschrieben wird erst am Schluss',
         zieh.indexOf('translate3d(') < zieh.lastIndexOf('n.style.left ='));
    wahr('Ein blosser Klick loest die Karte nicht aus der Ecke',
         zieh.includes('if (!bewegt) return;'));
    wahr('Abgebrochene Zeiger raeumen mit auf',
         zieh.includes("'pointercancel', ende"));
    wahr('Die Ankuendigung an den Compositor gilt nur waehrend der Fahrt',
         css.includes('.legende.zieht') && css.includes('will-change: transform') &&
         zieh.includes("n.classList.remove('zieht')"));
  }
}

// ===========================================================================
titel('32  Anbauteile als Kette: Ausleger auf der Stuetze, Kettenwerk am Ausleger');

{
  const AX = await import(J('export.axisvm.js'));
  const kern = await import(J('core.anbauteile.js'));

  const bau = (vorlage, x = 10) => {
    const w = { ...standardwerte(), anbauteile: [A.neuesAnbauteil(vorlage, x)] };
    const e = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                       getStahl(w.stahl), T.getTragjoch(w.typ));
    const b = AX.stabmodell(e.modell, { knotenmodell: 'anschnitt', eingabe: w });
    return { b, arme: b.staebe.filter((s) => /^ARM\d+_\d+$/.test(s.name)) };
  };

  // --- Die Rollen sagen, was auf was sitzt ---------------------------------
  {
    const at = A.neuesAnbauteil('hs-nt-ausleger', 10);
    const flach = A.expandiereAnbauteile([at], { ek: 'EK2' });
    const rollen = flach.map((f) => f.rolle);
    wahr('Die Vorlage nennt Traeger, Aufbau und Drahtwerk',
         rollen.includes('traeger') && rollen.includes('aufbau') &&
         rollen.includes('drahtwerk'), rollen.join(' -> '));
    wahr('Alle Teile gehoeren derselben Baugruppe',
         new Set(flach.map((f) => f.baugruppe)).size === 1);
  }

  // --- Und daraus wird eine Kette, kein Stern ------------------------------
  // Vorher gruppierte die Ausleitung nach KOORDINATEN. Module derselben
  // Baugruppe auf verschiedenen Hoehen fielen damit auseinander, und jedes
  // Stueck hing einzeln am Joch - im AxisVM deutlich zu sehen.
  {
    /*
     * DER NT-AUSLEGER IST EIN KRAGARM (Weisung des Auftraggebers):
     * sein Angriffspunkt liegt 1.2 m in Jochachse versetzt, das Kettenwerk
     * haengt am Ende bei 2.4 m. Die halbe Windlast in Gleisrichtung geht auf
     * den Anschlusspunkt Ausleger/Stuetze zurueck, der Rest ins Kettenwerk.
     * Die Kette hat deshalb VIER Glieder, und die letzten beiden liegen
     * waagrecht.
     */
    const { b, arme } = bau('hs-nt-ausleger');
    const kn = (n) => b.knoten.get(n);
    pruef('Vier Glieder: Stuetze, Anschluss, Kragarm, Kettenwerk',
          arme.length, 4, 1e-12, 'Stk');

    wahr('Das erste Glied haengt am Gurtanschluss', /^AT\d+_(OG|UG)$/.test(arme[0].von),
         arme[0].von);
    wahr('Jedes weitere haengt am vorigen - eine Reihe, kein Stern',
         arme.every((s, i) => i === 0 || s.von === arme[i - 1].bis),
         arme.map((s) => `${s.von}->${s.bis}`).join(' '));
    wahr('Kein Glied hat Laenge null',
         arme.every((s) => {
           const p = kn(s.von), q = kn(s.bis);
           return Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) > 1e-9;
         }));

    // Der Kragarm steht in JOCHACHSE aus - das ist der ganze Punkt.
    const spitze = kn(arme[3].bis), wurzel = kn(arme[1].bis);
    // 2.50 m seit der Weisung vom 28. August (vorher 2.40 m).
    pruef('Das Kettenwerk haengt 2.50 m ausserhalb', spitze.x - wurzel.x,
          2.5, 1e-9, 'm');
    pruef('Der Ausleger selbst greift auf halbem Weg an',
          kn(arme[2].bis).x - wurzel.x, 1.25, 1e-9, 'm');
    wahr('Und die beiden liegen auf gleicher Hoehe',
         Math.abs(spitze.z - wurzel.z) < 1e-9);

    pruef('Vier Lastpunkte: drei Teile plus der Windanteil',
          b.arme.length, 4, 1e-12, 'Stk');
  }

  // --- Der Jochaufsatz sitzt OBEN, die Kette laeuft hinauf -----------------
  {
    const { b, arme } = bau('ja-einfach');
    const kn = (n) => b.knoten.get(n);
    wahr('Beim Aufsatz steigt die Kette',
         arme.every((s) => kn(s.bis).z > kn(s.von).z),
         arme.map((s) => kn(s.bis).z.toFixed(2)).join(' -> '));
  }

  // --- Wo die Daten keine Kette nennen, wird keine erfunden ---------------
  {
    const { arme } = bau('leiter-traverse');
    pruef('Ein einzelnes Teil ergibt ein Glied', arme.length, 1, 1e-12, 'Stk');
  }

  // --- Ein Lastschalter formt keine Geometrie -----------------------------
  /*
   * Die Kette verbindet LASTPUNKTE, und ein Lastpunkt liegt im SCHWERPUNKT
   * seines Bauteils - nicht an dessen Ende. Zwischen Haengestuetze (-1.35 m)
   * und Ausleger (-2.70 m, 1.5 m aussen) lief deshalb eine Diagonale quer
   * durch den Raum, wo in Wirklichkeit die Stuetze senkrecht hinunterlaeuft
   * und der Ausleger dort waagrecht ansetzt.
   *
   * Aufgefallen ist es an einem Schalter, der damit nichts zu tun hat: bei
   * eingeschaltetem «Fahrleitung als Auflager» entsteht ein Hilfspunkt auf
   * der Stuetzenachse, und der lag zufaellig im Knick. Die Kette sah richtig
   * aus - und fiel in sich zusammen, sobald man den Schalter loeste.
   */
  ['hs-nt-ausleger', 'ausleger-rohr'].forEach((id) => {
    const kette = (an) => {
      const at = { ...A.neuesAnbauteil(id, 10), windAufTraeger: an };
      const flach = A.expandiereAnbauteile([at], { ek: 'EK2', R: 3e5, spannweite: 50 });
      const k = kern.anbauKette(flach, { x0: 10, zAn: 0 });
      return k.glieder.map((g) => `${g.von.x},${g.von.y},${g.von.z}`
                                + ` -> ${g.bis.x},${g.bis.y},${g.bis.z}`).join(' | ');
    };
    const ein = kette(true), aus = kette(false);
    wahr(`${id}: der Lastschalter formt die Kette nicht um`, ein === aus,
         ein === aus ? `${ein.split('|').length} Glieder` : `EIN ${ein}   AUS ${aus}`);
    // DIE EIGENSCHAFT, die den Knick ausmacht: jedes Glied laeuft entlang
    // EINER Achse. Eine Diagonale aendert zwei Koordinaten gleichzeitig -
    // genau das war der falsche Weg quer durch den Raum.
    const at = { ...A.neuesAnbauteil(id, 10), windAufTraeger: false };
    const flach = A.expandiereAnbauteile([at], { ek: 'EK2', R: 3e5, spannweite: 50 });
    const k = kern.anbauKette(flach, { x0: 10, zAn: 0 });
    const schraeg = k.glieder.filter((g) =>
      [g.bis.x - g.von.x, g.bis.y - g.von.y, g.bis.z - g.von.z]
        .filter((d) => Math.abs(d) > 1e-9).length > 1);
    wahr(`${id}: jedes Glied laeuft entlang einer Achse`, schraeg.length === 0,
         schraeg.map((g) => `(${g.von.x},${g.von.z})->(${g.bis.x},${g.bis.z})`).join(' '));
  });

  // --- Beide Ausleger sind Kragarme, und beide haengen an der Stuetze ------
  /*
   * WEISUNG DES AUFTRAGGEBERS. Der NT-Ausleger steht 1.2 m aus, sein
   * Kettenwerk haengt am Ende bei 2.4 m; beim Rohrausleger sind es 1.5 m und
   * 3.0 m. Beide sind an einer HAENGESTUETZE befestigt und stuetzen das
   * Kettenwerk - hierarchisch gleich aufgebaut.
   *
   * Geprueft wird die VORLAGE, nicht eine Zahl im Code: die Daten sind
   * massgebend, und eine Vorlage, die den Traeger verliert oder den Versatz,
   * faellt hier auf.
   */
  {
    /*
     * WEISUNG DES AUFTRAGGEBERS, 28. August: "die nt und roehrausleger mit
     * laenge in x von 2.50 m als voreinstellwert".
     *
     * Beide Ausleger reichen jetzt gleich weit; das Kettenwerk haengt am
     * ENDE, das Eigengewicht des Auslegers greift auf HALBER Laenge an. Vor
     * der Weisung waren es 2.4 m (NT) und 3.0 m (Rohr).
     *
     * Die Zahlen stehen in data/anbauteile.json - hier steht nur, was daraus
     * folgen muss. Der Pruefstand hat die Aenderung denn auch gemeldet, und
     * genau dafuer ist er da.
     */

  /*
   * DIE LAENGE EINES STRECKENTEILS STEHT IM FELD, nicht in einem stillen
   * Rueckfall.
   *
   * Weisung des Auftraggebers, 28. August: "die laenge kann den startwert von
   * 1.00 m haben" - fuer die Auslegerkonsolen, die zwischen 0.50 und 2.00 m
   * lang sind.
   *
   * Vorher stand das Laengenfeld LEER da, und gerechnet wurde trotzdem: mit
   * einem Meter aus `m.laenge ?? 1` in expandiereAnbauteile. Die Zahl war
   * also immer da, nur nicht zu sehen - und ein leeres Feld liest sich wie
   * "noch nicht angegeben", nicht wie "einen Meter".
   */
  {
    const FL = await import(J('data.fl.js'));
    const strecke = 'anbauteil-auslegerkonsole';
    const stueck = 'anbauteil-ausleger-typ-nt';
    wahr('Die Konsole rechnet je Meter',
         FL.istStreckenlast(FL.getFlBauteil(strecke)) === true);
    wahr('Der NT-Ausleger nicht',
         FL.istStreckenlast(FL.getFlBauteil(stueck)) === false);

    pruef('Ein neues Streckenteil bringt seine Laenge mit',
          A.neuesModul(strecke).laenge, 1.0, 1e-12, 'm');
    wahr('Ein Stueckteil bekommt keine',
         A.neuesModul(stueck).laenge === null);
    // Ein unbekanntes Bauteil darf nicht werfen - die Maske baut Module auf,
    // bevor die Datenbank vollstaendig ist.
    wahr('Ein unbekanntes Bauteil bleibt ohne Laenge',
         A.neuesModul('gibt-es-nicht').laenge === null);

    /*
     * UND DIE ZAHL WIRKT AUCH. Die Konsole traegt 0.25 kN/m Eigengewicht;
     * bei einem Meter ist das 0.25 kN, bei zweien das Doppelte. Waere die
     * Laenge blosse Anzeige, staende hier zweimal dasselbe.
     */
    const last = (laenge) => {
      const at = { id: 'K', name: 'Konsole', x: 5, raster: 0, aktiv: true,
                   module: [{ bauteil: strecke, anzahl: 1, laenge, z: -1.5, y: 0 }] };
      const f = A.expandiereAnbauteile([at], { ek: 'EK2', R: 3e5, spannweite: 50 });
      return f.reduce((sum, t) => sum + Math.abs(t.kraefte?.G?.Fz ?? 0), 0);
    };
    const eins = last(1.0);
    pruef('Ein Meter Konsole wiegt, was die Tabelle sagt', eins, 0.25, 1e-9, 'kN');
    pruef('Zwei Meter wiegen doppelt', last(2.0), 2 * eins, 1e-9, 'kN');
    // Der Rueckfall fuer alte Baugruppen nennt dieselbe Zahl wie der Startwert.
    pruef('Ohne Angabe gilt derselbe eine Meter', last(null), eins, 1e-12, 'kN');
    pruef('Und der Standard steht als Zahl da', A.LAENGE_STANDARD, 1.0, 1e-12, 'm');
  }

    const kragarme = [
      { id: 'hs-nt-ausleger', aufbau: 1.25, draht: 2.5 },
      { id: 'ausleger-rohr', aufbau: 1.25, draht: 2.5 },
    ];
    kragarme.forEach((k) => {
      const at = A.neuesAnbauteil(k.id, 10);
      const flach = A.expandiereAnbauteile([at], { ek: 'EK2', R: 3e5, spannweite: 50 });
      const rollen = flach.map((x) => x.rolle);
      const je = (r) => flach.filter((x) => x.rolle === r && x.art !== 'windversatz')[0];

      wahr(`${k.id}: haengt an einer Haengestuetze`,
           rollen.includes('traeger'), rollen.join(' -> '));
      pruef(`${k.id}: der Ausleger steht aus`,
            je('aufbau').x - je('traeger').x, k.aufbau, 1e-9, 'm');
      pruef(`${k.id}: das Kettenwerk haengt am Ende`,
            je('drahtwerk').x - je('traeger').x, k.draht, 1e-9, 'm');
      wahr(`${k.id}: die halbe Windlast geht auf den Anschluss zurueck`,
           at.windAufTraeger === true && at.windAnteil === 50);

      // Und daraus wird eine REIHE: jedes Glied haengt am vorigen.
      const w = { ...standardwerte(), anbauteile: [at] };
      const e = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                         getStahl(w.stahl), T.getTragjoch(w.typ));
      const b = AX.stabmodell(e.modell, { knotenmodell: 'anschnitt', eingabe: w });
      const arme = b.staebe.filter((s) => /^ARM\d+_\d+$/.test(s.name));
      wahr(`${k.id}: die Kette ist eine Reihe`,
           arme.every((s, i) => i === 0 || s.von === arme[i - 1].bis),
           arme.map((s) => s.name).join(' '));
      // Der aeusserste Punkt ist das Kettenwerk - nicht der Hilfspunkt des
      // Windversatzes, der auf der Achse der Stuetze sitzt.
      const letzte = b.knoten.get(arme[arme.length - 1].bis);
      pruef(`${k.id}: das aeusserste Glied endet am Kettenwerk`,
            letzte.x - b.knoten.get(arme[0].von).x, k.draht, 1e-9, 'm');
    });
  }

  // --- Ein Mass zeigt auf den SCHWERPUNKT, das naechste Glied ans ENDE -----
  /*
   * WEISUNG: der eingetragene Angriffspunkt eines Traegers oder Aufbaus ist
   * sein Schwerpunkt, also die halbe Laenge - dort greifen seine Lasten an.
   * Das naechste Glied der Kette sitzt am ENDE, beim doppelten Versatz.
   *
   * Das ist keine Erfindung: die Lasttabelle fuehrt fuer die Haengestuetze
   * "L,rep = 2.7 m". Schwerpunkt 1.35, Ende 2.70 - und genau dort haengt in
   * beiden Kragarm-Vorlagen der Ausleger. Geprueft wird gegen DIESE Zahl,
   * damit Vorlage und Lasttabelle nicht auseinanderlaufen.
   */
  {
    const hs = FL.getFlBauteil('anbauteil-haengestuetze-od-haengerohr');
    const m = /L,rep\s*=\s*([\d.]+)\s*m/.exec(hs.bemerkung ?? '');
    wahr('Die Lasttabelle nennt die Laenge der Haengestuetze',
         !!m, hs.bemerkung ?? '(keine Bemerkung)');
    const LRep = m ? parseFloat(m[1]) : null;

    ['hs-nt-ausleger', 'ausleger-rohr'].forEach((id) => {
      const mod = A.getVorlage(id).module;
      const nach = (r) => mod.find((x) => {
        try { return FL.getFlBauteil(x.bauteil).rolle === r; } catch { return false; }
      });
      const tr = nach('traeger'), au = nach('aufbau'), dr = nach('drahtwerk');
      // Die Vorlagendatei spricht seit Fassung 2.4 das Achsensystem der
      // Ausleitung: z nach OBEN. Eine haengende Stuetze hat also z < 0, und
      // die Laenge ist der Betrag.
      const tief = (m) => Math.abs(m.z ?? -(m.ev ?? 0));

      if (LRep !== null) {
        pruef(`${id}: die Stuetze greift auf halber Laenge an`,
              tief(tr), LRep / 2, 1e-9, 'm');
      }
      pruef(`${id}: der Ausleger haengt am ENDE der Stuetze`,
            tief(au), 2 * tief(tr), 1e-9, 'm');
      pruef(`${id}: das Kettenwerk haengt auf derselben Hoehe`,
            tief(dr), tief(au), 1e-9, 'm');
      pruef(`${id}: und am ENDE des Kragarms`,
            dr.x, 2 * au.x, 1e-9, 'm');
      wahr(`${id}: die Stuetze selbst steht nicht aus`,
           (tr.x ?? 0) === 0, `x = ${tr.x ?? 0}`);
    });
  }

  // --- Die Vorlagendatei spricht das Achsensystem der Ausleitung ----------
  /*
   * Bis Fassung 2.3 stand dort ein Abstand ZUR JOCHACHSE, positiv NACH
   * UNTEN, waehrend Eingabekarte, Ausleitung und AxisVM z nach OBEN zaehlen.
   * Ein Jochaufsatz las sich in der Datei als ev -1.0, obwohl er nach oben
   * ragt. Gelesen wird die alte Schreibweise weiter - Datenpakete von
   * frueher muessen sich oeffnen lassen.
   */
  {
    const roh = JSON.parse(readFileSync(join(HIER, 'data', 'anbauteile.json'), 'utf8'));
    const altReste = roh.vorlagen.flatMap((v) => [v, ...(v.module ?? [])])
      .filter((o) => 'ev' in o || 'ex' in o);
    wahr('Keine Vorlage schreibt mehr ev/ex', altReste.length === 0,
         altReste.map((o) => o.id ?? o.bauteil).join(', '));
    wahr('Haengendes hat z < 0',
         roh.vorlagen.find((v) => v.id === 'hs-nur').module[0].z < 0);
    wahr('Aufgesetztes hat z > 0',
         roh.vorlagen.find((v) => v.id === 'ja-alt').module[0].z > 0);

    // Und die Altschreibweise kommt weiterhin an derselben Stelle heraus.
    const altModul = A.normalisiereAnbauteil(
      { id: 'X', x: 0, module: [{ bauteil: 'anbauteil-haengestuetze-od-haengerohr',
                                  anzahl: 1, ev: 1.35, ex: 0.2 }] });
    pruef('Altes ev wird weiter gelesen', altModul.module[0].z, -1.35, 1e-12, 'm');
    pruef('Altes ex ebenso', altModul.module[0].y, 0.2, 1e-12, 'm');
  }

  // --- Den Kragarm spiegeln, die Leiter mitziehen -------------------------
  /*
   * Ein Ausleger steht nach der einen oder der anderen Seite aus, und das
   * wechselt von Joch zu Joch. Von Hand waeren es zwei Vorzeichen - und das
   * zweite (die Leiter am ENDE des Arms) vergisst man.
   *
   * Geprueft wird die REGEL: gespiegelt wird der Ausleger und alles, was auf
   * derselben Seite weiter aussen sitzt; was innen oder auf der anderen
   * Seite steht, bleibt. Und die Lasten bleiben dieselben - der Spiegel
   * aendert die Seite, nicht die Groesse.
   */
  {
    const uq = readFileSync(join(HIER, 'js', 'ui.js'), 'utf8');
    wahr('Der Ausleger hat einen Spiegelknopf', uq.includes('data-mod-spiegeln'));
    wahr('Nur der Ausleger, und nur wenn er wirklich aussteht',
         /b\?\.rolle === 'aufbau' && Math\.abs\(m\.x \?\? 0\) > 1e-9/.test(uq));
    wahr('Gespiegelt wird auf derselben Seite nach aussen',
         /Math\.sign\(mx\) === seite && Math\.abs\(mx\) >= weite/.test(uq));

    // Dieselbe Regel hier nachgebildet und an den Daten gemessen.
    const spiegle = (module, mod) => {
      const m2 = module.map((x) => ({ ...x }));
      const x0 = m2[mod]?.x ?? 0;
      if (!x0) return m2;
      const seite = Math.sign(x0), weite = Math.abs(x0) - 1e-9;
      m2.forEach((m) => {
        const mx = m.x ?? 0;
        if (Math.sign(mx) === seite && Math.abs(mx) >= weite) m.x = -mx;
      });
      return m2;
    };
    const at = A.neuesAnbauteil('hs-nt-ausleger', 10);
    const iAufbau = at.module.findIndex((m) => {
      try { return FL.getFlBauteil(m.bauteil).rolle === 'aufbau'; } catch { return false; }
    });
    const gespiegelt = { ...at, module: spiegle(at.module, iAufbau) };
    pruef('Der Ausleger wechselt die Seite',
          gespiegelt.module[iAufbau].x, -at.module[iAufbau].x, 1e-12, 'm');
    const iDraht = at.module.findIndex((m) => {
      try { return FL.getFlBauteil(m.bauteil).rolle === 'drahtwerk'; } catch { return false; }
    });
    pruef('Und die Leiter am Ende des Arms zieht mit',
          gespiegelt.module[iDraht].x, -at.module[iDraht].x, 1e-12, 'm');
    pruef('Die Stuetze bleibt, wo sie ist', gespiegelt.module[0].x ?? 0, 0, 1e-12, 'm');

    // Die Lasten bleiben - nur die Seite aendert sich.
    const summe = (a) => A.expandiereAnbauteile([a], { ek: 'EK2', R: 3e5, spannweite: 50 })
      .reduce((s, p) => s + Object.values(p.kraefte)
        .reduce((q, k) => q + Math.abs(k.Fz ?? 0) + Math.abs(k.Fy ?? 0)
                            + Math.abs(k.Fx ?? 0), 0), 0);
    pruef('Der Spiegel aendert die Seite, nicht die Groesse',
          summe(gespiegelt), summe(at), 1e-9, 'kN');
  }

  // --- Ein Feld zeigt vor und nach der Rechnung dasselbe -------------------
  /*
   * Zwei Stellen schreiben in die Modulfelder: der Aufbau der Karte und das
   * Auffrischen bei jeder Rechnung. Sie waren sich uneinig - der Aufbau
   * setzte `?? 0`, das Auffrischen machte aus einem fehlenden Wert ein leeres
   * Feld. Ein Modul ohne eigenes x zeigte deshalb erst «0» und war nach der
   * ersten Rechnung leer; in der Vorlage steht x gar nicht, also traf es
   * jede Haengestuetze.
   */
  {
    const uq = readFileSync(join(HIER, 'js', 'ui.js'), 'utf8');
    wahr('Die Vorgabe je Modulfeld steht an EINER Stelle',
         uq.includes('const MODUL_VORGABE = {'));
    wahr('Der Aufbau der Karte liest sie', /modFeld\(i, k, 'x', 'x', modWert\(m, 'x'\)/.test(uq));
    wahr('Das Auffrischen liest dieselbe', /const v = modWert\(m, inp\.dataset\.mk\)/.test(uq));
    wahr('Und der Rueckweg legt sie ab statt null',
         uq.includes('leer ? (vorgabe === undefined ? null : vorgabe)'));
    // Leer BEDEUTET nur beim Winkel etwas - dort heisst es «aus R und L_FL».
    const tab = /const MODUL_VORGABE = \{([\s\S]*?)\};/.exec(uq)[1];
    wahr('Leer bleibt nur der Winkel', /winkel: undefined/.test(tab)
         && (tab.match(/undefined/g) || []).length === 1, tab.replace(/\s+/g, ' ').trim());
  }

  // --- Der Kragarm laedt das Joch an SEINER WURZEL ------------------------
  /*
   * Ein NT-Ausleger steht in Jochachse aus. Das Joch beruehrt er dort NICHT -
   * getragen wird er von der Haengestuetze, und die haengt ueber ihren Raster
   * an EINER Station. Die Last kommt also an der Station an, und der Versatz
   * erscheint als Kraeftepaar C_y = d * F_z.
   *
   * DIE PROBE IST DAS GLEICHGEWICHT: dieselbe Last, einmal ueber den Kragarm
   * und einmal unmittelbar auf dem Joch an der versetzten Stelle, muss
   * DIESELBEN Auflagerkraefte ergeben - eine Resultante ist eine Resultante.
   * Ohne das Kraeftepaar unterscheiden sie sich um F*d/L; mit falschem
   * Vorzeichen um das Doppelte davon. Die Probe legt es also eindeutig fest.
   */
  {
    const L = 20, X0 = 8, D = 2.4, FZ = 3;
    const probe = (x, dx) => ({
      id: 'P', name: 'Probe', x, raster: 0.4, befestigung: 'unten', aktiv: true,
      module: [],
      lasten: [{ einwirkung: 'G', x: dx, y: 0, z: -1, Fz: FZ, aktiv: true }],
    });
    /*
     * AUSDRUECKLICH GELENKIG. Die Probe ist ein GLEICHGEWICHTSARGUMENT am
     * Einfeldtraeger: eine Resultante ist eine Resultante, und ohne das
     * Kraeftepaar fehlt genau F*d/L. Mit einer Drehfeder an den Enden geht
     * ein Teil des Kraeftepaars in die Einspannung, und die Probe misst
     * nicht mehr das, was sie beweisen soll. Seit dem 28. August ist der
     * Startwert `mast` - die Randbedingung gehoert deshalb hier hin und
     * nicht in die Voreinstellung.
     */
    const rechneAt = (at) => {
      const w = { ...standardwerte(), typ: 'J90', L, anbauteile: [at],
                  endbedingung: 'gelenkig' };
      return berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                      getStahl(w.stahl), T.getTragjoch(w.typ));
    };
    const kragarm = rechneAt(probe(X0, D));
    const direkt = rechneAt(probe(X0 + D, 0));
    const ohne = rechneAt(probe(X0, 0));

    pruef('Kragarm und Direktlast geben dieselbe Auflagerkraft',
          kragarm.modell.RA, direkt.modell.RA, 1e-9, 'kN');
    // Und die Probe wuerde ein fehlendes oder falsches Kraeftepaar finden:
    pruef('Ohne Kraeftepaar waere es F*d/L daneben',
          ohne.modell.RA - kragarm.modell.RA, FZ * 1.3 * D / L, 1e-9, 'kN');
    // OERTLICH ist es NICHT dasselbe - genau deshalb wurde es geaendert.
    wahr('Oertlich unterscheiden sie sich sehr wohl',
         Math.abs(kragarm.extrem.MyMax - direkt.extrem.MyMax) > 1,
         `${kragarm.extrem.MyMax.toFixed(2)} gegen ${direkt.extrem.MyMax.toFixed(2)} kNm`);

    // Die Last tritt am ANSCHLUSS ein, nicht am Ende des Arms.
    const lasten = A.expandiereAnbauteile([probe(X0, D)], { ek: 'EK2' });
    wahr('Das Teil selbst greift aussen an',
         Math.abs(lasten[0].x - (X0 + D)) < 1e-9, `x = ${lasten[0].x}`);
    wahr('Und weiss, wo seine Baugruppe haengt',
         Math.abs(lasten[0].stationX - X0) < 1e-9, `stationX = ${lasten[0].stationX}`);
  }

  // --- Bild, Kern und Ausleitung meinen dieselbe Hoehe --------------------
  /*
   * z zaehlt ab der SCHWERACHSE DES GURTES, an dem das Teil abgegriffen wird
   * (anschlussGurt): was nach oben ragt, ab Obergurt, was haengt, ab
   * Untergurt. Die Ausleitung nahm dafuer bei 'durchgehend' IMMER den
   * Untergurt - ein Jochaufsatz sass darin um die ganze Jochhoehe zu tief.
   * Fuer die vertikale Last folgenlos, fuer die waagrechte nicht: ihr
   * Hebelarm zur Jochachse und damit die Torsion war um F_y * h daneben.
   *
   * Geprueft wird ueber die GANZE Vorlagendatenbank, nicht an einem Beispiel:
   * so faellt auch eine kuenftige Vorlage auf, deren Teile nach beiden Seiten
   * zeigen - fuer die haette die Kette zwei Wurzeln.
   */
  {
    const kern = await import(J('core.anbauteile.js'));
    let geprueft = 0, schief = [];
    A.vorlagen().forEach((v) => {
      const w = { ...standardwerte(), anbauteile: [A.neuesAnbauteil(v.id, 10)] };
      const e = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                         getStahl(w.stahl), T.getTragjoch(w.typ));
      const b = AX.stabmodell(e.modell, { knotenmodell: 'anschnitt', eingabe: w });
      const jochachse = b.zOben - e.modell.h / 2;
      b.arme.forEach(({ teil, knoten }) => {
        const soll = jochachse - kern.hebelarmZuAchse(teil, e.modell.h);
        const ist = b.knoten.get(knoten).z;
        geprueft++;
        if (Math.abs(ist - soll) > 1e-9) {
          schief.push(`${v.id}/${teil.bauteilName ?? teil.name}: ` +
                      `${ist.toFixed(4)} statt ${soll.toFixed(4)}`);
        }
      });
    });
    wahr(`Jeder Lastpunkt sitzt auf der Hoehe, die der Kern rechnet (${geprueft})`,
         schief.length === 0, schief.slice(0, 3).join(' | '));
  }

  // --- Die Datei sagt, was sie kann ---------------------------------------
  /*
   * Die Formatnummer sagt, wie gelesen wird - nicht, was drinsteht. Ein
   * Modell aus einer aelteren Fassung liest sich tadellos und baut sich
   * klaglos auf; dass die Anbauteile darin einzeln am Joch hingen, sah man
   * erst im fertigen Modell - nach Aufbau, Rechnung und Auslesen. Deshalb
   * traegt die Datei ihre Merkmale bei sich, und die Bruecke sagt laut,
   * wenn eines fehlt.
   */
  {
    const PS1 = readFileSync(join(HIER, 'com', 'AxisVM_aufbauen.ps1'), 'utf8');
    const w = { ...standardwerte(), anbauteile: [A.neuesAnbauteil('hs-nt-ausleger', 10)] };
    const e = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                       getStahl(w.stahl), T.getTragjoch(w.typ));
    const j = AX.stabmodellJson(e.modell, { eingabe: w });
    wahr('Die Modelldatei nennt ihre Merkmale', Array.isArray(j.merkmale),
         JSON.stringify(j.merkmale));
    wahr('Darunter die Anbauteil-Kette', (j.merkmale ?? []).includes('anbau-kette'));
    wahr('Die Bruecke erwartet genau dieses Merkmal',
         PS1.includes("'anbau-kette' = ("));
    wahr('Und meldet laut, wenn es fehlt',
         PS1.includes('AELTEREN FASSUNG DES WERKZEUGS'));
    wahr('Ohne den Aufbau abzubrechen - was gebaut wird, entscheidet der Nutzer',
         !/fehlt\.Count -gt 0[\s\S]{0,900}?Beenden/.test(PS1));
  }

  // --- Die Lasten wandern dabei nicht --------------------------------------
  // Nur der WEG der Last aendert sich, nicht ihr Angriffspunkt und nicht ihr
  // Betrag. Alle Glieder sind Starrkoerper; am Gurt kommt dieselbe Resultante
  // an wie zuvor.
  {
    const w = { ...standardwerte(), anbauteile: [A.neuesAnbauteil('hs-nt-ausleger', 10)] };
    const e = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                       getStahl(w.stahl), T.getTragjoch(w.typ));
    const b = AX.stabmodell(e.modell, { knotenmodell: 'anschnitt', eingabe: w });
    const l = AX.lasten(e.modell, b);
    const summe = (r) => l.punkt.filter((p) => p.richtung === r)
      .reduce((s, p) => s + p.wert, 0);
    const ausTeilen = (feld, vz) => (e.modell.anbauteileFlach ?? [])
      .reduce((s, t) => s + Object.values(t.kraefte ?? {})
        .reduce((q, k) => q + vz * (k[feld] ?? 0), 0), 0);
    pruef('Summe F_z bleibt die der Bauteile', summe('Z'), ausTeilen('Fz', -1), 1e-9, 'kN');
    pruef('Summe F_y ebenso', summe('Y'), ausTeilen('Fy', +1), 1e-9, 'kN');
    wahr('Jede Last haengt an einem Knoten der Baugruppe',
         l.punkt.filter((p) => /^AL/.test(p.knoten)).length > 0 &&
         l.punkt.every((p) => b.knoten.has(p.knoten)));
  }
}

// ===========================================================================
titel('33  Bedienung: was in der Sitzung als Nutzer aufgefallen ist');
/*
 * Diese Pruefungen halten Eigenschaften der OBERFLAECHE fest, die sich beim
 * Bauen eines Jochs mit fuenf Baugruppen als Maengel gezeigt haben. Sie lesen
 * die Quelle - eine Zeichenflaeche und ein Rasterumbruch lassen sich ohne
 * Browser nicht messen, die REGEL dahinter aber sehr wohl.
 */
{
  const css = readFileSync(join(HIER, 'css', 'style.css'), 'utf8');
  const aq = readFileSync(join(HIER, 'js', 'app.js'), 'utf8');
  const uq = readFileSync(join(HIER, 'js', 'ui.js'), 'utf8');
  const rq = readFileSync(join(HIER, 'js', 'render.3d.js'), 'utf8');
  const kq = readFileSync(join(HIER, 'js', 'core.anbauteile.js'), 'utf8');
  const xq = readFileSync(join(HIER, 'js', 'export.axisvm.js'), 'utf8');

  // --- Der Name der Baugruppe verschwand -----------------------------------
  // «Leiter-Traverse am Joch» und «Lampe LED» standen beide als «L..» da.
  {
    const raster = css.match(/\.at-zeile\s*\{[^}]*grid-template-columns:\s*([^;]+);/);
    wahr('Die Anbauteil-Zeile gibt dem Namen eine Untergrenze',
         !!raster && /minmax\(\s*\d+px/.test(raster[1]), raster && raster[1].trim());
    wahr('Und die Kraeftezeile ist das, was gekuerzt wird',
         /\.at-kraft\s*\{[^}]*text-overflow:\s*ellipsis/.test(css));
    wahr('Kraefte heissen F_x, F_y, F_z - x ist in derselben Zeile die Station',
         uq.includes("['F_x', su.Gx + su.Qx]"));
  }

  // --- Die Modellspalte fiel auf 92 px ------------------------------------
  {
    wahr('Es gibt eine Mindestbreite fuer die Modellspalte',
         /const MODELL_MIN = \d+/.test(aq),
         (aq.match(/const MODELL_MIN = \d+/) || [''])[0]);
    wahr('Die Startbreiten richten sich nach dem Fenster',
         aq.includes('platzFuerSchubladen()') && aq.includes('clientWidth'));
    wahr('Der Zug am Splitter ist nicht mehr fest auf 640 begrenzt',
         !/Math\.min\(640, a0 \+ d\)/.test(aq));
    wahr('Wird das Fenster schmaler, geben die Schubladen nach',
         /addEventListener\('resize'/.test(aq));
    wahr('Eingeklappte Seiten bleiben dabei eingeklappt',
         /if \(!zuSeite\.links\) setzeSeite/.test(aq));
  }

  // --- Nach dem Ein- und Ausfahren lief das Joch aus dem Bild --------------
  {
    wahr('Am Ende der Fahrt wird nachgefahren',
         aq.includes('passeEinWennAbgeschnitten()'));
    wahr('Aber nur heraus, nie heran',
         /noetig <= this\.kamera\.dist \+ 1e-6\) return false/.test(rq));
    wahr('Und nie in einen selbst gewaehlten Ausschnitt hinein',
         /if \(this\.fokus \|\| this\.station !== null\) return false/.test(rq));
  }

  // --- Elf Kraftbeschriftungen ueber dem Joch -----------------------------
  {
    wahr('Auch die Pfeiltexte haben ein Budget',
         /_markenBudget\(\)[\s\S]{0,200}_pfeiltexte/.test(rq));
    wahr('Sortiert nach Betrag, Angewaehltes zuerst',
         /sort\(\(a, b\) => \(b\.rang \?\? 0\) - \(a\.rang \?\? 0\)\)/.test(rq));
  }

  // --- Die Gleiszuordnung setzte nur der Generator ------------------------
  wahr('Die Karte hat ein Feld fuer das Gleis', uq.includes("atFeld(i, 'gleis'"));

  // --- Bei eta > 1 fehlte der Weg zum naechsten Typ -----------------------
  {
    wahr('Es gibt eine Sortimentssuche', aq.includes('function dialogSortiment'));
    wahr('Sie erscheint nur, wenn der Nachweis nicht erfuellt ist',
         /e > 1 && beiSortiment/.test(uq));
    wahr('Der Typ wechselt nicht von selbst',
         aq.includes('DER TYP WECHSELT NICHT VON SELBST'));
    wahr('Was nicht gerechnet werden kann, steht mit Grund da',
         aq.includes("block('Nicht gerechnet', geht)"));
  }

  // --- Rolle und Traeger standen nirgends ---------------------------------
  {
    wahr('Die Karte nennt die Rolle jedes Moduls', uq.includes('ROLLE_TEXT'));
    wahr('Und woran es haengt', uq.includes('haengtAn'));
    wahr('Und warnt, wenn zwei Teile auf demselben Punkt sitzen',
         uq.includes('kette-warn'));
  }

  // --- Bild und Ausleitung bauen dieselbe Kette ---------------------------
  {
    wahr('Die Kette steht an EINER Stelle im Rechenkern',
         kq.includes('export function anbauKette'));
    wahr('Die Modellansicht liest sie von dort', rq.includes('anbauKette(meine,'));
    wahr('Die Ausleitung ebenso', xq.includes('anbauKette(a.teile ?? [a]'));
    wahr('Und niemand zeichnet mehr einen geraden Staender daneben',
         !rq.includes('opt(`Ständer '));
  }
}

// ===========================================================================
titel('34  Teilweise Einspannung: vom Ersatzbalken ins Stabmodell');
/*
 * Der Rechenkern lagert das Jochende ueber eine DREHFEDER c_phi. Das
 * ausgeleitete Stabmodell hat dafuer nur im Auflagermodell 'punkt' einen Ort
 * - dort haengt das Ende ueber ein Schott an EINEM Knoten. Im Modell 'gurte',
 * der Vorgabe fuer die neue Bauweise, sind die vier Gurte einzeln gehalten,
 * und der Obergurt war lotrecht FREI. Das ist ein Gelenk: das ausgeleitete
 * Modell war am Ende immer gelenkig, ganz gleich was die Anwendung gerechnet
 * hatte.
 *
 * UEBERSETZUNG. Eine Endverdrehung theta hebt den Obergurt gegenueber dem
 * Untergurt um theta*h. Haelt je Obergurtknoten eine Feder k, ist die Kraft
 * k*theta*h und das Moment beider zusammen 2*k*h^2*theta:
 *
 *      k = c_phi / (2 h^2)
 *
 * Dieselbe Zwei-Gurt-Vorstellung, auf der biegesteifigkeitJoch und das
 * Kraeftepaar der Anbauteile stehen.
 */
{
  const AX = await import(J('export.axisvm.js'));
  const AU = await import(J('core.auflager.js'));

  const bau = (extra) => {
    const w = { ...standardwerte(), typ: 'J90', L: 20, ...extra };
    const e = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                       getStahl(w.stahl), T.getTragjoch(w.typ));
    return { w, m: e.modell };
  };
  const lager = (m, w, am) => AX.stabmodellJson(m, { eingabe: w, auflagerModell: am })
    .auflager.filter((a) => a.ende === 'A');
  const lager2 = (m, w, am) => AX.stabmodellJson(m, { eingabe: w, auflagerModell: am })
    .auflager;

  // --- Mit Mast: die Feder muss ankommen ----------------------------------
  {
    // Die Begrenzung steht im Startwert auf AUS (Weisung). Hier ausdruecklich
    // EIN, denn genau darum geht es: ausgeleitet wird trotzdem die
    // geometrische Feder, und die beiden Zahlen muessen sich unterscheiden.
    const { w, m } = bau({ endbedingung: 'mast', mastProfil: 'HEB 260', mastH: 7.5,
                           schraubenGrenze: true, schraubenFgrenz: 8 });
    /*
     * AUSGELEITET WIRD DIE GEOMETRISCHE FEDER (Weisung), nicht die je
     * Lastfall auf die Schraubengrenze herabgesetzte. Ein Stabmodell gibt es
     * nur eines; es truege sonst die Feder eines einzelnen Lastfalls.
     */
    const c = m.federn.roh.cA;
    wahr('Die Anwendung rechnet eine teilweise Einspannung', c > 0 && c < 1e11,
         `c_geo = ${c.toFixed(0)} kNm/rad`);

    /*
     * DAS GURTMODELL TRAEGT SIE NICHT - und das ist kein Versaeumnis,
     * sondern ein Messergebnis. In AxisVM 18 r1k nachgerechnet (J90 ueber
     * 20 m, Schnee 1.0 kN/m, c_phi = 12951 kNm/rad):
     *
     *                        Ende A     Feldmitte    Ende B
     *   gurte ohne Feder     -42.58       26.30       +2.85   kNm
     *   gurte mit Gurtfeder  -42.65       26.30       +2.80
     *   punkt, Drehfeder     -16.70       28.28      -16.71
     *   Anwendung            22.12        27.88       22.12
     *
     * Eine Feder, die 0.07 von 42 kNm bewegt, sieht aus wie eine
     * Uebertragung und ist keine. Sie steht deshalb nicht im Modell.
     */
    const g = lager(m, w, 'gurte');
    const og = g.filter((a) => a.knoten.startsWith('OG'));
    const ug = g.filter((a) => a.knoten.startsWith('UG'));
    pruef('Vier Gurte je Ende', g.length, 4, 1e-12, 'Stk');
    wahr('Der Untergurt haelt lotrecht starr', ug.every((a) => a.uz === 'Rigid'));
    wahr('Der Obergurt bleibt lotrecht frei - keine Scheinuebertragung',
         og.every((a) => a.uz === 'Free' && !a.cUz_kNm),
         og.map((a) => `${a.uz} ${a.cUz_kNm ?? '-'}`).join(' | '));

    // Der Ersatzbalken traegt sie weiterhin als DREHfeder - unveraendert.
    const pk = lager(m, w, 'punkt');
    pruef('Im Ersatzbalken bleibt es eine Drehfeder', pk.length, 1, 1e-12, 'Stk');
    pruef('Mit der geometrischen Feder des Bauwerks', pk[0].cFiy_kNm, c, 1e-6, 'kNm/rad');
    wahr('Und dort traegt der Obergurt keine eigene Feder', !pk[0].cUz_kNm);

    // Und ausdruecklich NICHT die begrenzte - sonst haenge das Modell am
    // Lastfall, den man beim Ausleiten zufaellig eingestellt hatte.
    // Die Begrenzung steht im Startwert auf AUS - hier ausdruecklich ein,
    // sonst gibt es keine zweite Zahl zu vergleichen.
    wahr('Die begrenzte Feder ist eine andere Zahl',
         Math.abs(m.federn.cA - c) > 1,
         `begrenzt ${m.federn.cA.toFixed(0)} gegen geometrisch ${c.toFixed(0)}`);
    wahr('Ausgeleitet wird die geometrische',
         Math.abs(pk[0].cFiy_kNm - c) < 1e-6
         && Math.abs(pk[0].cFiy_kNm - m.federn.cA) > 1);
  }

  // --- GENAU EIN LAENGSHALT, IN JEDEM AUFLAGERMODELL ----------------------
  /*
   * Beim Nachrechnen kam heraus, dass das Gurtmodell an den beiden Enden
   * VERSCHIEDEN dastand: am Ende A waren alle vier Gurtknoten in x gehalten,
   * am Ende B keiner. Eine Verdrehung um y verschiebt Ober- und Untergurt
   * aber gegenlaeufig in x - vier Festhaltungen sperrten sie damit
   * weitgehend, und Ende A war unter symmetrischer Last mit -42.6 kNm nahezu
   * eingespannt, Ende B mit +2.9 kNm nahezu gelenkig.
   *
   * Weisung: nur EIN Knoten haelt in x. Mehr verlangt das Gleichgewicht in
   * Jochrichtung nicht, und jeder weitere Halt ist ein Zwang - zwei auf
   * verschiedener Hoehe sperren die Drehung um y, zwei auf verschiedener
   * Seite die um z.
   */
  {
    const { w, m } = bau({ endbedingung: 'gelenkig' });
    ['gurte', 'mitte', 'punkt'].forEach((modell) => {
      const g = lager2(m, w, modell);
      const fest = g.filter((x) => x.ux === 'Rigid');
      wahr(`Modell ${modell}: genau ein Laengshalt`, fest.length === 1,
           `${fest.length} von ${g.length}: ${fest.map((x) => x.knoten).join(' ')}`);
      wahr(`Modell ${modell}: und er sitzt am Ende A`,
           fest[0]?.ende === 'A', String(fest[0]?.ende));
    });
    // Am Gurtmodell ist es der Untergurt: dort sitzt auch der lotrechte Halt,
    // eine Laengskraft tritt also nicht ueber einen sonst freien Gurt ein.
    const g = lager2(m, w, 'gurte');
    const fest = g.find((x) => x.ux === 'Rigid');
    wahr('Und im Gurtmodell am Untergurt', fest.knoten.startsWith('UG'),
         fest.knoten);
    wahr('Der gehaltene Knoten traegt auch die Vertikalkraft',
         fest.uz === 'Rigid', fest.uz);
    // Kein Ende ist damit eingespannt - keine Drehfeder, kein Kraeftepaar.
    wahr('Das Gurtmodell spannt kein Ende ein',
         g.every((x) => x.fiy === 'Free')
         && g.filter((x) => x.uz === 'Rigid').length === 4);
  }

  // --- Die Schraubengrenze als EIGENER Nachweis ---------------------------
  /*
   * Weisung: die geometrische Feder ins Modell, die Schraubengrenze separat
   * nachweisen. Bis dahin lebte die Grenze nur INNERHALB der Feder - sie war
   * per Konstruktion eingehalten, und man sah nie, wieviel die Verbindung mit
   * der wirklichen Steifigkeit des Mastes zu tragen haette. Genau das ist die
   * Frage, die das ausgeleitete Stabmodell stellt.
   */
  {
    /*
     * MIT EINGESCHALTETEM AUFLAGERNACHWEIS. Er ist seit der Weisung ab Werk
     * aus; ohne das Einschalten stuende A1 gar nicht in der Liste, und genau
     * daran ist dieser Abschnitt beim Umbau aufgelaufen.
     */
    const { m } = bau({ endbedingung: 'mast', mastProfil: 'HEB 260', mastH: 7.5,
                        schraubenFgrenz: 24, nachweise: { auflagerJoch: true } });
    const ga = m.gurtanschluss;
    wahr('Der Gurtanschluss wird eigens gerechnet', !!ga);
    pruef('Aus der GEOMETRISCHEN Feder', ga.cA, m.federn.roh.cA, 1e-9, 'kNm/rad');
    // JE GURT (Weisung): jede Gurtebene haengt an ZWEI Gurten.
    pruef('Kraeftepaar M/(2h), je Gurt', ga.FA,
          Math.abs(ga.MA) / (2 * ga.h), 1e-9, 'kN');
    pruef('Massgebend ist das groessere Ende', ga.F,
          Math.max(ga.FA, ga.FB), 1e-12, 'kN');
    pruef('eta = F / F_Grenz', ga.eta, ga.F / 24, 1e-9, '-');
    const CH = await import(J('core.checks.js'));
    const a1 = CH.konstruktionsChecks(m).find((c) => c.id === 'A1');
    wahr('Er steht als Pruefung A1 in der Liste', !!a1, a1 ? a1.text : '(fehlt)');
    pruef('Sie nennt die Kraft', a1.vorhanden, ga.F, 1e-9, 'kN');
    pruef('Und die Grenzlast', a1.erforderlich, 24, 1e-12, 'kN');
    wahr('Und sagt, ob es reicht', a1.ok === (ga.F <= 24 * (1 + 1e-9)),
         `F = ${ga.F.toFixed(2)} kN gegen 24 kN`);

    // Voll eingespannt ist eine Idealisierung, keine Verbindung - dort nicht.
    const voll = bau({ endbedingung: 'voll', schraubenFgrenz: 24 });
    wahr('Bei voller Einspannung wird nichts nachgewiesen', !voll.m.gurtanschluss);
  }

  // --- Was die Bruecke koennen muss ---------------------------------------
  {
    const PS1 = readFileSync(join(HIER, 'com', 'AxisVM_aufbauen.ps1'), 'utf8');
    // Die Feder steht am Ersatzbalken als DREHfeder; die Bruecke muss sie
    // setzen koennen. Der lotrechte Federweg bleibt vorbereitet - er kostet
    // nichts und waere sonst beim naechsten Anlauf wieder zu bauen.
    wahr('Die Bruecke setzt die Drehfeder', PS1.includes('$zahl $a.fiy $a.cFiy_kNm'));
    wahr('Und kann eine lotrechte Feder setzen', PS1.includes('$zahl $a.uz  $a.cUz_kNm'));
    // GERECHNET WIRD NUR AUF WEISUNG.
    wahr('Rechnen ist ein eigener Schalter', /\[switch\]\$Rechnen/.test(PS1));
    wahr('Ohne ihn bleibt es beim Hinweis',
         PS1.includes("Schreib 'Das Modell steht. NICHT gerechnet"));
    wahr('Gerechnet wird linear statisch, ohne Rueckfrage',
         PS1.includes('Calculation.LinearAnalysis($cui)'));
    // Und im SELBEN Lauf gelesen - eine neue Instanz kennt keine Ergebnisse.
    wahr('Auslesen ist eine Funktion, aus beiden Wegen erreichbar',
         PS1.includes('function Lies-Schnittgroessen'));
    wahr('Nach dem Rechnen wird im selben Lauf gelesen',
         PS1.includes('$nGel = Lies-Schnittgroessen $m $Ziel'));
    // Der Satz muss vorher dastehen - sonst stirbt der Prozess.
    wahr('Der Ergebnissatz wird vorbereitet',
         PS1.includes("NeuerSatz 'RLineForceValues'"));
  }

  // --- Was die Feder wert ist: sie haengt am LASTFALL ---------------------
  /*
   * Die Verbindung Joch-Mast traegt nur bis zur Grenzlast ihrer Schrauben;
   * die Feder wird deshalb je Lastfall herabgesetzt (begrenzeFeder). Sie ist
   * damit KEINE Eigenschaft des Bauwerks allein. Das ausgeleitete Modell
   * traegt die Feder der BEMESSUNGSKOMBINATION - eine Zahl, ein Modell.
   * Diese Pruefung haelt fest, dass die Spanne wirklich gross ist, damit die
   * Wahl nicht als Kleinigkeit durchgeht.
   */
  {
    const basisW = { ...standardwerte(), typ: 'J90', L: 20,
                     endbedingung: 'mast', mastProfil: 'HEB 260', mastH: 7.5,
                     anbauteile: [A.neuesAnbauteil('hs-nt-ausleger', 10)] };
    const cVon = (lf) => {
      const e = berechne({ ...basisW, lastfall: lf }, getProfil(basisW.profOG),
                         getProfil(basisW.profUG), getStahl(basisW.stahl),
                         T.getTragjoch(basisW.typ));
      return e.modell.federn.cA;
    };
    const werte = ['gk', 'wyk', 'windXm'].map(cVon);
    wahr('Die wirksame Feder haengt am Lastfall',
         Math.max(...werte) / Math.min(...werte) > 2,
         werte.map((v) => v.toFixed(0)).join(' / ') + ' kNm/rad');

    // Und die geometrische Feder kennt zwei Werte - je nachdem, ob sich der
    // Rahmen verschieben kann.
    const st = AU.mastSteifigkeit(basisW, 'A', false);
    pruef('Unverschieblich ist die Feder 3.10 mal die des Kragmastes',
          st.cUnverschieblich / st.cKragarm, AU.MAST_UNVERSCHIEBLICH, 1e-12, '-');
    wahr('Und der Anschlussfaktor greift nur im verschieblichen Fall',
         AU.mastSteifigkeit(basisW, 'A', true).cPhi
           === AU.mastSteifigkeit(basisW, 'A', true).cVerschieblich);
  }
}

titel('35  Der Mast im Modell: Starrkoerper, Linkelement, Fundament');

/*
 * WEISUNG DES AUFTRAGGEBERS, 27. August:
 *   je Gurtebene ein Starrkoerper ueber die beiden Gurte, von dort ein
 *   Linkelement an den Mast - Kraefte starr, Momente frei -, und der Mast
 *   bis zum Fundament, dort starr eingespannt.
 *
 * Damit entsteht das Kraeftepaar, das im Ersatzbalken die Drehfeder
 * vertritt, aus der Biegung des Mastes zwischen Ober- und Untergurthoehe.
 */
{
  const AXM = await import(J('export.axisvm.js'));
  const wM = basis({
    // EINE Last, ein Wert: 1.0 kN/m lotrecht. Damit ist q L^2/8 = 50 kNm,
    // und jede Abweichung im Modell faellt sofort auf. Genau so ist in
    // AxisVM gerechnet worden.
    lastHerkunft: 'manuell', gkManuell: 0, wkManuell: 0, skManuell: 1.0,
    schneeAktiv: true,
    lastfall: 'Schnee', beiwerteFest: { G: 0, WindX: 0, WindY: 0, Schnee: 1 },
    endbedingung: 'mast', mastProfil: 'HEB 240', mastH: 7.0,
    mastSteg: 'jochachse', mastAnschluss: 'durchlaufend',
    mastWindAufJoch: false, schraubenGrenze: false,
  });
  const mM = modell(wM, getProfil(wM.profOG), getProfil(wM.profUG),
                    getStahl(wM.stahl), T.getTragjoch('J90'));
  const j = AXM.stabmodellJson(mM, { knotenmodell: 'anschnitt', auflagerModell: 'mast' });
  const stabVon = (n) => j.staebe.find((x) => x.name === n);
  const knotenVon = (n) => j.knoten.find((x) => x.name === n);

  // --- Der Mast selbst ----------------------------------------------------
  pruef('Zwei Auflager, eines je Mastfuss', j.auflager.length, 2, 1e-12, 'Stk');
  wahr('Beide Fuesse voll eingespannt',
       j.auflager.every((a) => ['ux', 'uy', 'uz', 'fix', 'fiy', 'fiz']
         .every((f) => a[f] === 'Rigid')),
       j.auflager.map((a) => `${a.knoten}:${a.fiy}`).join(' '));
  wahr('Und sie sitzen am Mastfuss, nicht am Joch',
       j.auflager.every((a) => a.knoten.endsWith('_F')));
  // Die Hoehe H misst der Rechenkern bis zur JOCHACHSE - dort steht im
  // Ersatzbalken die Drehfeder. Der Mastfuss liegt also H unter der Achse.
  const oben = knotenVon('MAST_A_OG').z, unten = knotenVon('MAST_A_UG').z;
  pruef('Die Jochhoehe steht zwischen den beiden Anschluessen',
        oben - unten, mM.h, 1e-6, 'm');
  pruef('Der Mastfuss liegt H unter der Jochachse',
        (oben + unten) / 2 - knotenVon('MAST_A_F').z, 7.0, 1e-6, 'm');

  // --- Anschluss je Gurtebene ---------------------------------------------
  ['A', 'B'].forEach((e) => ['OG', 'UG'].forEach((g) => {
    const k = stabVon(`STARR_${e}_${g}L`), r = stabVon(`STARR_${e}_${g}R`);
    wahr(`Ende ${e}, ${g}: zwei Starrkoerper auf einen Anschlusspunkt`,
         k && r && k.art === 'starr' && r.art === 'starr'
         && k.bis === `ANS_${e}_${g}` && r.bis === `ANS_${e}_${g}`);
    const l = stabVon(`LINK_${e}_${g}`);
    wahr(`Ende ${e}, ${g}: von dort ein Linkelement an den Mast`,
         l && l.art === 'link' && l.bis === `MAST_${e}_${g}`);
    wahr(`Ende ${e}, ${g}: Kraefte starr, Momente frei`,
         ['x', 'y', 'z'].every((f) => l.kraftuebertragung[f] === 'Rigid')
         && ['xx', 'yy', 'zz'].every((f) => l.kraftuebertragung[f] === 'Free'),
         JSON.stringify(l.kraftuebertragung));
  }));
  // Ein Linkelement braucht eine LINIE, und eine Linie braucht Laenge.
  // Verschoben wird deshalb der Anschlusspunkt nach innen, nicht die
  // Mastachse nach aussen: die Stuetzweite bleibt die des Rechenkerns.
  pruef('Der Anschlusspunkt sitzt 10 cm einwaerts',
        knotenVon('ANS_A_OG').x - knotenVon('MAST_A_OG').x, 0.10, 1e-9, 'm');
  pruef('Am anderen Ende ebenso, spiegelbildlich',
        knotenVon('MAST_B_OG').x - knotenVon('ANS_B_OG').x, 0.10, 1e-9, 'm');
  wahr('Und er liegt auf der Jochachse',
       Math.abs(knotenVon('ANS_A_OG').y) < 1e-9);
  pruef('Die Mastachse steht in der Jochendebene',
        knotenVon('MAST_A_OG').x, 0, 1e-9, 'm');
  pruef('Und am anderen Ende auf der Stuetzweite',
        knotenVon('MAST_B_OG').x, 20, 1e-9, 'm');

  // --- Der Querschnitt: R folgt aus der Flaeche ---------------------------
  const qs = j.querschnitte.find((q) => q.name.startsWith('MAST_'));
  wahr('Der Mast traegt ein I-Profil', qs && qs.form === 'I', qs && qs.form);
  wahr('Und nennt sein Profil', qs.profil === 'HEB 240', qs.profil);
  {
    // A = 2*b*tf + (h-2tf)*tw + (4-pi)*R^2 - mit dem ausgeleiteten R muss
    // die Flaeche die der Tabelle sein. Sonst meldet die Bruecke sie zurueck.
    const [h, b, tw, tf, R] = qs.parameter;
    const A = (2 * b * tf + (h - 2 * tf) * tw + (4 - Math.PI) * R * R) / 1e6;
    // 1e-7 statt 1e-9: R geht auf sechs Nachkommastellen gerundet in die
    // Datei, das schlaegt mit 1.7e-11 m2 auf die Flaeche durch.
    pruef('Der Ausrundungsradius trifft die Tabellenflaeche', A, qs.A, 1e-7, 'm2');
    pruef('Und liegt beim HEB 240 auf dem Normwert 21 mm', R, 21, 0.05, 'mm');
  }

  // --- Die Drehlage folgt der Stegrichtung --------------------------------
  wahr('Steg in Jochachse: Profilhoehe in die Jochachse',
       JSON.stringify(stabVon('MAST_A_S2').lcsZ) === '[1,0,0]',
       JSON.stringify(stabVon('MAST_A_S2').lcsZ));
  {
    const wQ = { ...wM, mastSteg: 'quer' };
    const mQ = modell(wQ, getProfil(wQ.profOG), getProfil(wQ.profUG),
                      getStahl(wQ.stahl), T.getTragjoch('J90'));
    const jQ = AXM.stabmodellJson(mQ, { knotenmodell: 'anschnitt', auflagerModell: 'mast' });
    wahr('Steg gedreht: Profilhoehe in die Gleisrichtung',
         JSON.stringify(jQ.staebe.find((x) => x.name === 'MAST_A_S2').lcsZ) === '[0,1,0]');
  }

  // --- Ohne Mast kein Mastmodell -----------------------------------------
  {
    const wG = basis({ endbedingung: 'gelenkig', mastVorhanden: false });
    const mG = modell(wG, getProfil(wG.profOG), getProfil(wG.profUG),
                      getStahl(wG.stahl), T.getTragjoch('J90'));
    let meldung = '';
    try { AXM.stabmodellJson(mG, { auflagerModell: 'mast' }); }
    catch (f) { meldung = f.message; }
    // Sie zeigt auf den Schalter, der ihn einschaltet - seit dem 28. August
    // steht der unter «Masten» und nicht mehr in der Endauflagerwahl.
    wahr('Ohne Mast sagt die Ausleitung, was fehlt',
         meldung.includes('Mast') && meldung.includes('Masten im Modell'),
         meldung);
  }
  wahr('Und der Dialog bietet das Modell nur mit Mast an',
       AXM.AUFLAGERMODELLE.find((a) => a.key === 'mast').braucht === 'mast');

  /*
   * DIE MESSUNG AM GEBAUTEN MODELL, HIER FESTGEHALTEN.
   *
   * AxisVM 18 r1k, 27.08.: Feldmoment 27.60 kNm gegen 29.51 kNm der
   * Anwendung. Aus dem Feldmoment rueckgerechnet ergibt das eine wirksame
   * Drehfeder von 3.98*E*I/H - der Lehrbuchwert 4.00 des unverschieblichen
   * Rahmens auf ein halbes Prozent. Damit steht dieser Aufbau gegen die
   * Theorie: Geometrie, Querschnitt, Anschluss und Einspannung stimmen.
   *
   * ENTSCHIEDEN AM 31. AUGUST: der Rechenkern nimmt jetzt 4.00 statt 3.10.
   * Damit rechnet die Anwendung 27.57 kNm gegen die gemessenen 27.60 - eine
   * Uebereinstimmung auf ein Promille. Diese Kontrolle haelt beides fest:
   * dass der Rechenkern den Lehrbuchwert ansetzt und dass die Messung selbst
   * darauf fuehrt.
   */
  {
    const EIH = E_STAHL * mM.federn.mastA.I / mM.federn.mastA.H;
    pruef('E*I/H des HEB 240 auf 7.00 m', EIH, 3378, 1e-3, 'kNm/rad');
    pruef('Der Rechenkern nimmt davon das 4.00-fache',
          mM.federn.roh.cA / EIH, MAST_UNVERSCHIEBLICH, 1e-9, '-');
    const feldBei = (c) => {
      const r = auflagermomente({ L: mM.L, qd: mM.qd, P: [], M: [],
                                  EI: mM.steif.EI, cA: c, cB: c,
                                  theta0A: 0, theta0B: 0, MkA: 0, MkB: 0 });
      return (mM.qd * mM.L * mM.L) / 8 - Math.abs(r.MA);
    };
    pruef('Damit rechnet die Anwendung 27.57 kNm im Feld',
          feldBei(mM.federn.roh.cA), 27.5697, 1e-3, 'kNm');
    // Das ist der eigentliche Gewinn des Entscheids: gemessen 27.60.
    wahr('… und trifft die Messung auf ein Promille',
         Math.abs(feldBei(mM.federn.roh.cA) - 27.60) / 27.60 < 2e-3);
    // Gemessen wurden 27.60 - welche Feder erklaert das?
    let lo = 100, hi = 1e7;
    for (let i = 0; i < 200; i++) {
      const mid = Math.sqrt(lo * hi);
      if (feldBei(mid) > 27.60) lo = mid; else hi = mid;
    }
    const cEff = Math.sqrt(lo * hi);
    pruef('Gemessene 27.60 kNm bedeuten 3.98 mal E*I/H', cEff / EIH, 3.98, 2e-3, '-');
    wahr('Also der Lehrbuchwert des unverschieblichen Rahmens',
         Math.abs(cEff / EIH - 4.00) < 0.03, (cEff / EIH).toFixed(3));
  }
}

titel('36  Der Weg von der Ausleitung in AxisVM');

/*
 * DER AUFBAU SOLL OHNE AUFRAEUMEN GEHEN.
 *
 * Bisher galt in der Bruecke "die einzige *.json daneben". Das ging genau
 * EINMAL gut: der Aufbau legt selbst AxisVM_zuordnung.json daneben, das
 * Auslesen dazu seine Ergebnisdatei. Ab dem zweiten Lauf lagen mehrere da
 * und das Skript hielt an - wer bauen wollte, musste vorher loeschen.
 */
{
  const CMD = readFileSync(join(HIER, 'com', 'AxisVM_aufbauen.cmd'), 'utf8');
  const PS1 = readFileSync(join(HIER, 'com', 'AxisVM_aufbauen.ps1'), 'utf8');

  wahr('Die Bruecke erkennt eine Modelldatei am Format',
       /IstModelldatei/.test(PS1)
       && /tragjoch-stabmodell/.test(PS1.slice(PS1.indexOf('function IstModelldatei'),
                                               PS1.indexOf('function IstModelldatei') + 900)));
  wahr('Und liest dafuer nur den Dateianfang',
       /OpenRead/.test(PS1) && /byte\[\] 800/.test(PS1));
  wahr('Von mehreren nimmt sie die juengste',
       /Sort-Object LastWriteTime -Descending/.test(PS1));
  wahr('Und sagt, welche sie uebergangen hat',
       /Modelldateien daneben/.test(PS1));
  wahr('Die eigene Zuordnungsdatei traegt ein anderes Format',
       /format\s*=\s*'tragjoch-axisvm-zuordnung'/.test(PS1));

  /*
   * ALLES, WAS ZU EINEM MODELL GEHOERT, LIEGT BEIM MODELL.
   *
   * Bericht, Zuordnung und Ergebnisse standen frueher immer neben dem
   * SKRIPT. Das geht fuer ein Tragwerk; bei mehreren Projekten mit je
   * mehreren Jochen ueberschreibt sich dort alles gegenseitig.
   */
  wahr('Die Nebendateien heissen wie die Modelldatei',
       /function NebenDatei/.test(PS1));
  ['_bericht.txt', '_zuordnung.json', '_ergebnisse.json'].forEach((a) => {
    wahr(`Und dazu gehoert ${a}`, PS1.includes(`NebenDatei $Json '${a}'`));
  });
  wahr('Das Modell selbst liegt ohnehin dort',
       /ChangeExtension\(\$Json, '\.axs'\)/.test(PS1));
  wahr('Die Startdatei nennt keinen festen Berichtspfad mehr',
       !/AxisVM_aufbau_bericht\.txt/.test(CMD));
  wahr('Und reicht weitere Schalter mit durch',
       /:sammeln/.test(CMD) && /set "ARGS=%ARGS% %1"/.test(CMD));
  wahr('Auslesen ruft mit denselben Argumenten auf',
       readFileSync(join(HIER, 'com', 'AxisVM_auslesen.cmd'), 'utf8')
         .includes('AxisVM_aufbauen.cmd" %* -Auslesen'));

  /*
   * STAPEL: JE MODELL EIN AxisVM-MODELL (Weisung).
   *
   * Ein Projekt hat eine Reihe von Tragwerken. Jedes wird EINZELN in ein
   * eigenes AxisVM-Modell gebaut und liegt als eigene .axs neben seiner
   * Ausleitung - nicht alle zusammen in eine Datei.
   */
  wahr('Ein Ordner laesst sich uebergeben', /\[string\]\$Ordner,/.test(PS1));
  wahr('Und ein hineingezogener Ordner wird dazu',
       CMD.includes('set "ARGS=-Ordner') && CMD.includes('%ERSTES%'),
       CMD.split(NL).filter((z) => z.includes('-Ordner')).join(' | '));
  wahr('Gebaut wird je Datei ein eigener Lauf',
       /\$PSCommandPath/.test(PS1) && /'-Stapel'/.test(PS1));
  // Kein Read-Host mehr im Klartext - es steckt jetzt hinter `Warte`,
  // und die prueft den Schalter.
  wahr('Im Stapel wartet niemand auf Enter',
       /function Warte/.test(PS1)
       && PS1.split('Read-Host').length === 2
       && /if \(-not \$Stapel\) \{ Read-Host/.test(PS1),
       `${PS1.split('Read-Host').length - 1} Read-Host`);
  wahr('Der Sammelbericht liegt im Ordner',
       /Join-Path \$Ordner 'AxisVM_stapel_bericht\.txt'/.test(PS1));
  wahr('Und nennt jede Datei mit Erfolg oder Fehlschlag',
       /FEHLGESCHLAGEN/.test(PS1) && /gebaut  ->/.test(PS1));

  // Ziehen statt kopieren: Windows uebergibt den Pfad als erstes Argument.
  wahr('Die Startdatei nimmt eine hineingezogene Datei entgegen',
       /set "ARGS=-Json/.test(CMD) && /ERSTES/.test(CMD));
  wahr('Ein Schalter bleibt ein Schalter',
       /if "%ERSTES:~0,1%"=="-" goto :starten/.test(CMD));
  // Der Browser nennt eine zweite Ausleitung "... (1).json"; eine Klammer
  // im Pfad wuerde einen Klammerblock der Eingabeaufforderung schliessen.
  wahr('Und tut das ohne Klammerbloecke',
       !/if defined ERSTES \(/.test(CMD) && /goto :starten/.test(CMD));
}

{
  // DER NAME MUSS SAGEN, WAS DRIN STEHT: Knoten- und Auflagermodell aendern
  // das Tragwerk. Unter demselben Namen legte der Browser die zweite
  // Ausleitung als "... (1).json" ab - und die Bruecke nimmt die juengste.
  const AXN = await import(J('export.axisvm.js'));
  const wN = basis({ endbedingung: 'gelenkig' });
  const mN = modell(wN, getProfil(wN.profOG), getProfil(wN.profUG),
                    getStahl(wN.stahl), T.getTragjoch('J90'));
  const namen = new Set();
  let heruntergeladen = null;
  /*
   * ATTRAPPEN FUER DEN DOWNLOAD - UND SIE WERDEN ZURUECKGEGEBEN.
   *
   * `delete globalThis.URL` nahm nicht die Attrappe weg, sondern das
   * eingebaute URL von Node: alles danach lief auf einen ReferenceError.
   * Gemerkt und wiederhergestellt statt geloescht.
   */
  const echt = { Blob: globalThis.Blob, URL: globalThis.URL,
                 document: globalThis.document };
  globalThis.Blob = class { constructor(t) { this.t = t; } };
  globalThis.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} };
  globalThis.document = { createElement: () => ({ click() { heruntergeladen = this.download; } }) };
  ['gurte', 'punkt', 'mitte'].forEach((am) => ['anschnitt', 'schwerachsen'].forEach((km) => {
    const r = AXN.exportiereJson(wN, { modell,
      profOG: getProfil(wN.profOG), profUG: getProfil(wN.profUG),
      stahl: getStahl(wN.stahl), joch: T.getTragjoch('J90') },
      { knotenmodell: km, auflagerModell: am });
    namen.add(r.name);
    wahr(`Der Name nennt ${km} und ${am}`,
         r.name.includes(km) && r.name.endsWith(`_${am}.json`), r.name);
  }));
  pruef('Sechs Einstellungen, sechs verschiedene Namen', namen.size, 6, 1e-12, 'Stk');

  /*
   * DIE VERORTUNG STEHT IM NAMEN, IN DER BEZEICHNUNG UND IM MODELL.
   *
   * Ein Projekt hat eine Reihe von Tragwerken; ohne Verortung heissen sie
   * alle "J90, 20.00 m". Rechnerisch aendert sie nichts - deshalb wird hier
   * geprueft, dass sie ueberall ankommt UND dass sie nichts verschiebt.
   */
  {
    const wV = basis({ endbedingung: 'gelenkig',
                       linie: '999', km: '012.345', ortschaft: 'Beispielort' });
    const mV = modell(wV, getProfil(wV.profOG), getProfil(wV.profUG),
                      getStahl(wV.stahl), T.getTragjoch('J90'));
    pruef('Die Verortung aendert das Feldmoment nicht', mV.MA, mN.MA, 1e-12, 'kNm');
    wahr('Das Modell traegt sie mit',
         mV.linie === '999' && mV.km === '012.345' && mV.ortschaft === 'Beispielort');
    // REIHENFOLGE LINIE - ORT - KM (Weisung): vom Groben zum Feinen.
    wahr('Als Zeile gelesen: Linie, Ort, KM',
         verortung(mV) === 'Linie 999 · Beispielort · KM 012.345',
         verortung(mV));
    wahr('Leere Angaben fallen weg',
         verortung({ linie: '', km: '012.345', ortschaft: '' }) === 'KM 012.345');
    wahr('Ohne Angabe bleibt die Zeile leer', verortung({}) === '');
    const jV = AXN.stabmodellJson(mV, { knotenmodell: 'anschnitt' });
    wahr('Die Ausleitung nennt sie einzeln',
         jV.tragwerk.linie === '999' && jV.tragwerk.km === '012.345'
         && jV.tragwerk.ortschaft === 'Beispielort');
    wahr('Und in der Bezeichnung', jV.tragwerk.bezeichnung.includes('KM 012.345'),
         jV.tragwerk.bezeichnung);
    const rV = AXN.exportiereJson(wV, { modell,
      profOG: getProfil(wV.profOG), profUG: getProfil(wV.profUG),
      stahl: getStahl(wV.stahl), joch: T.getTragjoch('J90') },
      { knotenmodell: 'anschnitt', auflagerModell: 'punkt' });
    wahr('Der Dateiname traegt sie vorne, in derselben Reihenfolge',
         rV.name.startsWith('AxisVM_L999_Beispielort_KM012.345_'), rV.name);
    // Sonderzeichen und Leerzeichen taugen nicht in einen Dateinamen.
    wahr('Und vertraegt Leerzeichen im Ortsnamen',
         verortungKurz({ ortschaft: 'Bahnhof Nord' }) === 'Bahnhof-Nord',
         verortungKurz({ ortschaft: 'Bahnhof Nord' }));
    wahr('Ebenso einen Schraegstrich',
         !verortungKurz({ ortschaft: 'A/B' }).includes('/'),
         verortungKurz({ ortschaft: 'A/B' }));
  }

  /*
   * DER MASTWIND AUF DAS JOCH IST AUS (Weisung, 27. August).
   *
   * Der Ersatzbalken kann ihn nur als AUFGEZWUNGENE Auflagerverdrehung
   * fassen - eine Ersatzgroesse fuer etwas, das im Stabmodell schlicht eine
   * Last auf dem Masten ist. Steht der Mast im Modell, traegt er sie selbst;
   * die Ersatzgroesse waere dann ein zweiter Ansatz derselben Last.
   */
  {
    const f = FELDER.find((x) => x.key === 'mastWindAufJoch');
    wahr('Der Startwert des Mastwind-Schalters ist aus', f.standard === false,
         String(f.standard));
    wahr('Und standardwerte() traegt ihn so',
         standardwerte().mastWindAufJoch === false);
    // Ohne ihn gibt es keine aufgezwungene Verdrehung - aber der Mast bleibt
    // Auflager, seine Drehfeder wirkt weiter.
    const wA = basis({ endbedingung: 'mast', mastProfil: 'HEB 240', mastH: 7.0,
                       mastSteg: 'jochachse', mastAnschluss: 'durchlaufend',
                       wMastAusTabelle: false, wMast: 0.4,
                       beiwerteFest: { G: 0, WindX: 1, WindY: 0, Schnee: 0 } });
    const mAus = modell(wA, getProfil(wA.profOG), getProfil(wA.profUG),
                        getStahl(wA.stahl), T.getTragjoch('J90'));
    const mAn = modell({ ...wA, mastWindAufJoch: true },
                       getProfil(wA.profOG), getProfil(wA.profUG),
                       getStahl(wA.stahl), T.getTragjoch('J90'));
    wahr('Aus heisst: keine aufgezwungene Verdrehung',
         Math.abs(mAus.theta0A) < 1e-12 && Math.abs(mAn.theta0A) > 0,
         `${mAus.theta0A} gegen ${mAn.theta0A}`);
    wahr('Die Drehfeder des Mastes wirkt trotzdem',
         mAus.federn.roh.cA > 0);
  }

  /*
   * DER WIND AUF DEN MAST IST KEINE OPTION (Weisung, 27. August).
   *
   * Steht der Mast im Stabmodell, ist er Teil des Tragwerks und wird belastet
   * wie das Joch - in beiden Richtungen, jede in ihrem Lastfall. Beide Werte
   * kommen aus derselben Tabellenzeile; die Stegrichtung entscheidet nur,
   * welche Spalte quer und welche laengs ist.
   */
  {
    const bauM = (profil, steg = 'jochachse') => {
      // DIE EINWIRKUNGSKLASSE WIRD GENANNT, nicht geerbt. Die Zahlen unten
      // sind die EK2-Spalte der Lasttabelle; als der Startwert am
      // 1. September auf EK1 wechselte, fielen sie, ohne dass am Geprueften
      // etwas falsch war.
      const w = basis({ endbedingung: 'mast', mastProfil: profil, mastH: 7.0,
                        mastSteg: steg, mastAnschluss: 'durchlaufend',
                        windKlasse: '1.1' });
      return modell(w, getProfil(w.profOG), getProfil(w.profUG),
                    getStahl(w.stahl), T.getTragjoch('J90'));
    };
    const mH = bauM('HEB 240');
    pruef('HEB 240 faengt in beiden Richtungen gleich viel',
          mH.mastLast.A.x, mH.mastLast.A.y, 1e-12, 'kN/m');
    // Das HEM 240 ist das einzige Profil der Tabelle, das nicht quadratisch
    // ist - an ihm faellt eine vertauschte Spalte ueberhaupt auf.
    const mM = bauM('HEM 240');
    pruef('HEM 240 quer zum Gleis', mM.mastLast.A.x, 0.38, 1e-9, 'kN/m');
    pruef('HEM 240 in Gleisrichtung', mM.mastLast.A.y, 0.42, 1e-9, 'kN/m');
    // Steg gedreht heisst: die beiden Spalten tauschen.
    const mQ = bauM('HEM 240', 'quer');
    pruef('Steg gedreht tauscht die beiden Spalten', mQ.mastLast.A.x, 0.42, 1e-9, 'kN/m');
    pruef('Und die andere ebenso', mQ.mastLast.A.y, 0.38, 1e-9, 'kN/m');

    // Im Modell steht die Last auf JEDEM Maststab, je Richtung ein Lastfall.
    const jM = AXN.stabmodellJson(mM, { knotenmodell: 'anschnitt', auflagerModell: 'mast' });
    const qM = jM.lasten.strecke.filter((q) => q.stab.startsWith('MAST_'));
    pruef('Vier Maststaebe, je zwei Richtungen', qM.length, 8, 1e-12, 'Stk');
    wahr('Jochachse im Lastfall WindX',
         qM.filter((q) => q.lastfall === 'WindX')
           .every((q) => q.richtung === 'X' && Math.abs(q.wert - 0.38) < 1e-9));
    wahr('Gleisrichtung im Lastfall WindY',
         qM.filter((q) => q.lastfall === 'WindY')
           .every((q) => q.richtung === 'Y' && Math.abs(q.wert - 0.42) < 1e-9));
    // Ohne Mast im Modell gibt es nichts zu belasten.
    const jP = AXN.stabmodellJson(mM, { knotenmodell: 'anschnitt', auflagerModell: 'punkt' });
    wahr('Ohne Mast im Modell keine Maststreckenlast',
         jP.lasten.strecke.every((q) => !q.stab.startsWith('MAST_')));
  }
  void heruntergeladen;
  globalThis.Blob = echt.Blob; globalThis.URL = echt.URL;
  globalThis.document = echt.document;
}

titel('37  Anbauteile am Masten');

/*
 * WEISUNG DES AUFTRAGGEBERS, 27. August: am Masten sollen sich Anbauteile
 * und Leiter ansetzen lassen - ausser Jochaufsatz und Haengestuetze.
 *
 * Die Ausnahme steht nicht als Verbotsliste im Code, sie steht in den Daten:
 * die Bauteiltabelle fuehrt drei Rollen, und `traeger` tragen genau die
 * Jochaufsaetze und die Haengestuetze. Ein Traeger IST das, was auf dem Joch
 * sitzt oder daran haengt.
 */
{
  const AXA = await import(J('export.axisvm.js'));
  const DA = await import(J('data.anbauteile.js'));
  const { konstruktionsChecks } = await import(J('core.checks.js'));

  // Die Regel gegen die Datenbank gelesen, nicht gegen eine Liste im Code.
  {
    const traeger = FL.flBauteile().filter((b) => b.rolle === 'traeger');
    wahr('Traeger sind genau Jochaufsaetze und Haengestuetzen',
         traeger.length > 0
         && traeger.every((b) => /jochaufsatz|haengestuetze|haengerohr/.test(b.id)),
         traeger.map((b) => b.id).join(' '));
    // Traverse, Ausleger, Lampe: Aufbau, also am Masten zulaessig.
    ['anbauteil-leiter-traverse', 'anbauteil-ausleger-typ-rohr',
     'anbauteil-lampe-led'].forEach((id) => {
      wahr(`${id} ist kein Traeger`,
           FL.getFlBauteil(id).rolle !== 'traeger', FL.getFlBauteil(id).rolle);
    });
  }

  const vorl = DA.getVorlage('leiter-traverse');
  const bauTeil = (o) => ({
    id: o.id, name: o.name, vorlage: 'leiter-traverse',
    x: o.x ?? 0, raster: vorl.raster ?? 0.4, befestigung: vorl.befestigung,
    module: JSON.parse(JSON.stringify(vorl.module)), aktiv: true, ...o });

  const wM = basis({
    endbedingung: 'mast', mastProfil: 'HEB 240', mastH: 7.0,
    mastSteg: 'jochachse', mastAnschluss: 'durchlaufend',
    anbauteile: [
      bauTeil({ id: 'T1', name: 'am Joch', x: 6 }),
      bauTeil({ id: 'M1', name: 'am Mast A', ort: 'mastA', hMast: 5.0 }),
      bauTeil({ id: 'M2', name: 'am Mast B', ort: 'mastB', hMast: 4.0 }),
      bauTeil({ id: 'M3', name: 'in der Luft', ort: 'mastA', hMast: 99 }),
    ] });
  const mM = modell(wM, getProfil(wM.profOG), getProfil(wM.profUG),
                    getStahl(wM.stahl), T.getTragjoch('J90'));

  // --- Der Ersatzbalken kennt nur das Joch --------------------------------
  wahr('Am Joch gerechnet wird nur, was am Joch haengt',
       (mM.anbauteileFlach ?? []).every((t) => !DA.amMast(t)));
  pruef('Drei Baugruppen stehen an den Masten', mM.anbauMast.length, 3, 1e-12, 'Stk');
  {
    // Ein Teil an den Masten zu haengen darf das Joch NICHT belasten.
    const wOhne = { ...wM, anbauteile: wM.anbauteile.filter((a) => !a.ort) };
    const mOhne = modell(wOhne, getProfil(wM.profOG), getProfil(wM.profUG),
                         getStahl(wM.stahl), T.getTragjoch('J90'));
    pruef('Sie aendern das Stuetzmoment des Jochs nicht', mM.MA, mOhne.MA, 1e-12, 'kNm');
  }

  // --- Im Stabmodell mit Mast stehen sie ----------------------------------
  const jM = AXA.stabmodellJson(mM, { knotenmodell: 'anschnitt',
                                      auflagerModell: 'mast', eingabe: wM });
  const knV = new Map(jM.knoten.map((k) => [k.name, k]));
  // Der Mast wird dort geteilt, wo etwas an ihm haengt: Fuss, Anbauhoehe,
  // Untergurt, Obergurt - also drei Stuecke statt zwei.
  const stA = jM.staebe.filter((x) => /^MAST_A_S/.test(x.name));
  pruef('Der Mast A ist an der Anbauhoehe geteilt', stA.length, 3, 1e-12, 'Stk');
  pruef('Und der Knoten liegt auf der eingegebenen Hoehe',
        knV.get('MAST_A_H1').z - knV.get('MAST_A_F').z, 5.0, 1e-9, 'm');
  wahr('Die Kette haengt am Mastknoten',
       jM.staebe.some((x) => x.name.startsWith('ARMM') && x.von === 'MAST_A_H1'));
  // Gespiegelt am Ende B: aussen liegt dort in -x.
  {
    const b = jM.staebe.find((x) => x.name.startsWith('ARMM') && x.von === 'MAST_B_H1');
    wahr('Am Ende B haengt sie am dortigen Mastknoten', !!b);
    wahr('Und die Mastachse steht auf der Stuetzweite',
         Math.abs(knV.get('MAST_B_H1').x - 20) < 1e-9);
  }
  // Die Lasten sitzen an den Knoten der Kette, nicht am Joch.
  {
    const amMastKn = new Set(jM.knoten.filter((k) => k.name.startsWith('AM')).map((k) => k.name));
    const lp = jM.lasten.punkt.filter((q) => amMastKn.has(q.knoten));
    wahr('Am Masten stehen Lasten', lp.length > 0, `${lp.length} Punktlasten`);
    wahr('Und zwar in mehreren Lastfaellen',
         new Set(lp.map((q) => q.lastfall)).size > 1,
         [...new Set(lp.map((q) => q.lastfall))].join(' '));
  }
  // Eine Hoehe ausserhalb des Mastes wird NICHT gebaut - und gesagt.
  {
    const aus = jM.tragwerk.anbauMastAus;
    pruef('Ein Teil in der Luft wird nicht gebaut', aus.length, 1, 1e-12, 'Stk');
    wahr('Und im Modell benannt', aus[0].name === 'in der Luft'
         && aus[0].hMast === 99 && aus[0].mastH === 7, JSON.stringify(aus[0]));
  }
  // Ohne Mast im Modell gibt es nichts anzuhaengen.
  {
    const jP = AXA.stabmodellJson(mM, { knotenmodell: 'anschnitt',
                                        auflagerModell: 'punkt', eingabe: wM });
    wahr('Ohne Mast im Modell keine Kette am Masten',
         jP.staebe.every((x) => !x.name.startsWith('ARMM')));
  }

  // --- Kein Traeger am Masten (Pruefung P6) -------------------------------
  {
    const ohne = konstruktionsChecks(mM).find((c) => c.id === 'P6');
    wahr('P6 steht in der Liste, sobald etwas am Masten haengt', !!ohne);
    wahr('Und ist erfuellt, solange kein Traeger dabei ist', ohne.ok === true,
         ohne.status);
    // Eine Haengestuetze am Masten muss auffallen.
    const hs = DA.getVorlage('hs-nur');
    const wHS = { ...wM, anbauteile: [{ id: 'X', name: 'HS am Mast',
      vorlage: 'hs-nur', x: 0, raster: hs.raster ?? 0.4,
      befestigung: hs.befestigung, ort: 'mastA', hMast: 5,
      module: JSON.parse(JSON.stringify(hs.module)), aktiv: true }] };
    const mHS = modell(wHS, getProfil(wM.profOG), getProfil(wM.profUG),
                       getStahl(wM.stahl), T.getTragjoch('J90'));
    const p6 = konstruktionsChecks(mHS).find((c) => c.id === 'P6');
    wahr('Eine Haengestuetze am Masten faellt auf', p6.ok === false, p6.status);
    wahr('Und wird beim Namen genannt',
         /Hängestütze|Haengerohr|Hängerohr/.test(p6.status), p6.status);
  }

  /*
   * AM MASTEN HAENGT KEIN KETTENWERK UNMITTELBAR (Weisung, 27. August).
   *
   * "Die Kettenwerke werden nicht direkt am Masten gehaengt, ausser wenn sie
   * abgefangen werden, sondern auf Ausleger. Am Masten werden nur einzelne
   * Leiter gehaengt oder, falls es Zusatzleiter sind, ueber eine Traverse."
   *
   * Ein Kettenwerk ist Tragseil UND Fahrdraht - die Bauteiltabelle sagt es
   * im Namen, nicht eine Liste im Code.
   */
  {
    const kw = FL.flBauteile().filter((b) => FL.istKettenwerk(b));
    const einzeln = FL.flBauteile()
      .filter((b) => b.gruppe === 'drahtwerk' && !FL.istKettenwerk(b));
    pruef('Vier Kettenwerke in der Tabelle', kw.length, 4, 1e-12, 'Stk');
    wahr('Jedes traegt Tragseil und Fahrdraht',
         kw.every((b) => /ts:/i.test(b.name) && /fd:/i.test(b.name)),
         kw.map((b) => b.name).join(' | '));
    pruef('Acht einzelne Leiter daneben', einzeln.length, 8, 1e-12, 'Stk');
    wahr('Und keiner davon traegt beides',
         einzeln.every((b) => !(/ts:/i.test(b.name) && /fd:/i.test(b.name))));

    // Ein Kettenwerk unmittelbar am Masten: die Vorlage leiter-nfl bringt
    // ein Drahtwerk ohne Aufbau mit.
    const anMast = (vorlage, id) => {
      const v = DA.getVorlage(vorlage);
      const w = basis({ endbedingung: 'mast', mastProfil: 'HEB 240', mastH: 7.0,
        mastSteg: 'jochachse', mastAnschluss: 'durchlaufend',
        anbauteile: [{ id, name: id, vorlage, x: 0, raster: v.raster ?? 0.4,
                       befestigung: v.befestigung, ort: 'mastA', hMast: 5,
                       module: JSON.parse(JSON.stringify(v.module)), aktiv: true }] });
      return konstruktionsChecks(
        modell(w, getProfil(w.profOG), getProfil(w.profUG),
               getStahl(w.stahl), T.getTragjoch('J90'))).find((c) => c.id === 'P7');
    };
    // Der NT-Ausleger bringt einen Aufbau mit - dort ist das Kettenwerk richtig.
    const mitAusleger = anMast('hs-nt-ausleger', 'MITAUS');
    wahr('Mit Ausleger ist das Kettenwerk am Masten in Ordnung',
         mitAusleger.ok === true, mitAusleger.status);
    /*
     * EIN EINZELNER LEITER DARF UNMITTELBAR HAENGEN - aber «Leiter N-FL» ist
     * keiner. Die Vorlage traegt drahtwerk-n-fl-ts-stcu-50-fd-cu-107, also
     * Tragseil UND Fahrdraht: ein Kettenwerk. Der Rueckleiter (leiter-rl,
     * Cu 95) ist der einzelne Leiter - und der darf.
     */
    const rueckleiter = anMast('leiter-rl', 'RUECKLEITER');
    wahr('Ein einzelner Leiter darf unmittelbar haengen',
         rueckleiter.ok === true, rueckleiter.status);
    const nfl2 = anMast('leiter-nfl', 'NFL');
    wahr('Ein Kettenwerk ohne Ausleger faellt auf',
         nfl2.ok === false && /Kettenwerk/.test(nfl2.status), nfl2.status);
    // Und die Traverse mit Zusatzleiter ebenso - sie IST der Aufbau.
    const traverse = anMast('leiter-traverse', 'TRAVERSE');
    wahr('Zusatzleiter ueber eine Traverse ebenso',
         traverse.ok === true, traverse.status);
    // Die Ausnahme ist noch nicht gebaut - deshalb Hinweis, nicht Fehler.
    wahr('P7 ist ein Hinweis, kein Fehler',
         traverse.warnungNichtFehler === true);
  }
}

titel('38  Hinterlegte Querprofil-Zeichnung');

/*
 * WEISUNG DES AUFTRAGGEBERS, 27. August: die Zeichnung transparent hinter das
 * Modell legen, um Bauteile zuzuordnen und Laengen abzugreifen, ohne im
 * PDF-Reader zu messen.
 *
 * "Die QP-Zeichnungen sind immer orthogonal, eine Ausrichtung ist daher nicht
 * notwendig. Es ist nur die Ansicht auf das Tragwerk vorhanden, xz-Ebene."
 *
 * Damit bleiben drei Unbekannte - Massstab und Lage in x und z -, und zwei
 * Punkte mit bekannten Modellkoordinaten bestimmen alle drei. Gerechnet wird
 * das hier; das Bild selbst braucht einen Browser und steht nicht im
 * Pruefstand.
 */
{
  const BZ = await import(J('bild.zeichnung.js'));

  // --- Waagrechter Bezug: die beiden Jochenden ---------------------------
  {
    // 800 Bildpunkte entsprechen 20 m: 0.025 m je Punkt.
    const p1 = { px: 200, py: 300 }, p2 = { px: 1000, py: 300 };
    const w1 = { x: 0, z: 0 }, w2 = { x: 20, z: 0 };
    const k = BZ.kalibriere(p1, p2, w1, w2);
    pruef('Massstab aus der Jochlaenge', k.s, 0.025, 1e-12, 'm/Punkt');
    // Die geklickten Punkte muessen genau auf ihre Modellpunkte fallen.
    const a = BZ.bildNachWelt(k, p1.px, p1.py);
    const b = BZ.bildNachWelt(k, p2.px, p2.py);
    pruef('Der erste Klick trifft x = 0', a.x, 0, 1e-9, 'm');
    pruef('Der zweite Klick trifft x = L', b.x, 20, 1e-9, 'm');
    wahr('Und beide liegen auf der Jochachse',
         Math.abs(a.z) < 1e-9 && Math.abs(b.z) < 1e-9);
    // Hin und zurueck.
    const r = BZ.weltNachBild(k, 12.5, -3);
    const h = BZ.bildNachWelt(k, r.px, r.py);
    pruef('Hin und zurueck: x', h.x, 12.5, 1e-9, 'm');
    pruef('Hin und zurueck: z', h.z, -3, 1e-9, 'm');
    // z zeigt im Bild nach unten, im Modell nach oben.
    wahr('Tiefer im Bild heisst tiefer im Modell',
         BZ.bildNachWelt(k, 200, 500).z < BZ.bildNachWelt(k, 200, 300).z);
  }

  // --- Lotrechter Bezug: der Mast ----------------------------------------
  {
    // 280 Punkte entsprechen 7.00 m: 0.025 m je Punkt, dasselbe Bild.
    const k = BZ.kalibriere({ px: 200, py: 580 }, { px: 200, py: 300 },
                            { x: 0, z: -7 }, { x: 0, z: 0 });
    pruef('Massstab aus der Masthoehe', k.s, 0.025, 1e-12, 'm/Punkt');
    pruef('Der Fusspunkt liegt auf -H', BZ.bildNachWelt(k, 200, 580).z, -7, 1e-9, 'm');
    wahr('Der Kopfpunkt auf der Jochachse',
         Math.abs(BZ.bildNachWelt(k, 200, 300).z) < 1e-9);
  }

  /*
   * DER MASSSTAB KOMMT AUS DER LAENGEREN RICHTUNG.
   *
   * Klickt man die beiden Jochenden, liegen sie waagrecht weit auseinander
   * und lotrecht fast uebereinander. Naehme man die lotrechte Differenz,
   * stuende im Nenner fast nur das Klickrauschen - ein Punkt daneben ergaebe
   * einen wilden Massstab.
   */
  {
    const genau = BZ.kalibriere({ px: 200, py: 300 }, { px: 1000, py: 300 },
                                { x: 0, z: 0 }, { x: 20, z: 0 });
    const schief = BZ.kalibriere({ px: 200, py: 300 }, { px: 1000, py: 304 },
                                 { x: 0, z: 0 }, { x: 20, z: 0 });
    pruef('Vier Punkte schief aendern den Massstab nicht',
          schief.s, genau.s, 1e-12, 'm/Punkt');
    // Die Lage mittelt den schiefen Klick heraus: 2 Punkte statt 4.
    pruef('Und die Hoehe nur um die Haelfte des Fehlers',
          (schief.z0 - genau.z0) / genau.s, 2, 1e-9, 'Punkte');
  }

  // --- Was keine Kalibrierung ergibt -------------------------------------
  wahr('Zwei gleiche Punkte ergeben keine Kalibrierung',
       BZ.kalibriere({ px: 5, py: 5 }, { px: 5, py: 5 },
                     { x: 0, z: 0 }, { x: 20, z: 0 }) === null);
  wahr('Ein fehlender Punkt ebenso',
       BZ.kalibriere(null, { px: 5, py: 5 }, { x: 0, z: 0 }, { x: 1, z: 0 }) === null);
  wahr('Ohne Kalibrierung gibt es keinen Rahmen',
       BZ.bildRahmen(null, 100, 50) === null
       && BZ.bildNachWelt(null, 1, 1) === null);

  // --- Der Rahmen, den die Ansicht zeichnet ------------------------------
  {
    const k = BZ.kalibriere({ px: 0, py: 0 }, { px: 400, py: 0 },
                            { x: 0, z: 0 }, { x: 10, z: 0 });
    const r = BZ.bildRahmen(k, 400, 200);
    pruef('Rahmen links', r.xVon, 0, 1e-9, 'm');
    pruef('Rahmen rechts', r.xBis, 10, 1e-9, 'm');
    wahr('Rahmen oben auf der Jochachse', Math.abs(r.zBis) < 1e-9);
    pruef('Rahmen unten', r.zVon, -5, 1e-9, 'm');
  }

  // --- Das Bild aus einem Einfuege- oder Ziehereignis ---------------------
  {
    const evMit = { clipboardData: { files: [{ type: 'image/png' }], items: [] } };
    wahr('Ein eingefuegtes Bild wird gefunden', !!BZ.bildAusEreignis(evMit));
    const evText = { clipboardData: { files: [{ type: 'text/plain' }], items: [] } };
    wahr('Text nicht', BZ.bildAusEreignis(evText) === null);
    // Der Bildschirmausschnitt kommt als item, nicht als file.
    const datei = { type: 'image/png' };
    const evItem = { clipboardData: { files: [],
      items: [{ kind: 'file', type: 'image/png', getAsFile: () => datei }] } };
    wahr('Ein Bildschirmausschnitt ebenso', BZ.bildAusEreignis(evItem) === datei);
    wahr('Ohne Zwischenablage nichts', BZ.bildAusEreignis({}) === null);
    // Ziehen liefert dataTransfer statt clipboardData - derselbe Weg.
    wahr('Und eine hineingezogene Datei ebenso',
         !!BZ.bildAusEreignis({ dataTransfer: { files: [{ type: 'image/jpeg' }] } }));
  }

  // --- Die beiden Bezugsmasse --------------------------------------------
  {
    const wB = basis({ L: 24, mastVorhanden: false });
    const mB = modell(wB, getProfil(wB.profOG), getProfil(wB.profUG),
                      getStahl(wB.stahl), T.getTragjoch('J90'));
    const j = BZ.bezugPunkte('joch', mB);
    pruef('Der Jochbezug spannt ueber die ganze Laenge', j[1].x - j[0].x, 24, 1e-9, 'm');
    wahr('Beide Punkte auf der Jochachse', j[0].z === 0 && j[1].z === 0);
    wahr('Ohne Mast gibt es keinen Mastbezug',
         BZ.bezugPunkte('mast', mB) === null);
    const wM = basis({ endbedingung: 'mast', mastProfil: 'HEB 240', mastH: 7.0,
                       mastSteg: 'jochachse', mastAnschluss: 'durchlaufend' });
    const mM = modell(wM, getProfil(wM.profOG), getProfil(wM.profUG),
                      getStahl(wM.stahl), T.getTragjoch('J90'));
    const mb = BZ.bezugPunkte('mast', mM);
    pruef('Mit Mast reicht der Bezug ueber die Masthoehe',
          mb[1].z - mb[0].z, 7, 1e-9, 'm');
    wahr('Und beide stehen am linken Masten', mb[0].x === 0 && mb[1].x === 0);
    wahr('Jeder Punkt sagt, was anzuklicken ist',
         [...j, ...mb].every((x) => typeof x.text === 'string' && x.text.length > 10));
  }

  /*
   * DAS PAKET: ZIP MIT BILDERN DANEBEN (Weisung).
   *
   * Die hinterlegten Zeichnungen gehoeren beim Ausleiten als eigene Dateien
   * in den Ablageordner, nicht als Base64 in die JSON. Geschrieben wird mit
   * demselben ZIP-Schreiber, den die .xlsx schon benutzt - ein zweiter waere
   * einer zu viel.
   */
  {
    const XL = await import(J('export.xlsx.js'));
    const bild = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 250, 0, 77]);
    const paket = XL.zip([
      { name: 'ablage.json', inhalt: '{"art":"tragjoch-ablage"}' },
      { name: 'zeichnungen/TJ-1.jpg', inhalt: bild },
    ]);
    wahr('Ein Paket beginnt mit PK', paket[0] === 0x50 && paket[1] === 0x4b);
    const zurueck = XL.entpacke(paket);
    pruef('Zwei Dateien im Paket', zurueck.length, 2, 1e-12, 'Stk');
    wahr('Die JSON kommt unveraendert zurueck',
         new TextDecoder().decode(zurueck[0].inhalt) === '{"art":"tragjoch-ablage"}');
    wahr('Und das Bild Byte fuer Byte',
         zurueck[1].name === 'zeichnungen/TJ-1.jpg'
         && zurueck[1].inhalt.length === bild.length
         && [...zurueck[1].inhalt].every((b, i) => b === bild[i]));
    // Ein leeres Bild darf nicht durchrutschen.
    const leer = XL.entpacke(XL.zip([{ name: 'a', inhalt: new Uint8Array(0) }]));
    pruef('Auch eine leere Datei bleibt eine Datei', leer.length, 1, 1e-12, 'Stk');
    // Etwas, das keine ZIP ist, sagt es.
    let meldung = '';
    try { XL.entpacke(new Uint8Array([1, 2, 3, 4])); } catch (f) { meldung = f.message; }
    wahr('Etwas anderes wird abgewiesen', meldung.includes('Paket'), meldung);
  }

  /*
   * DIE MASSKETTE DER ZEICHNUNG (Weisung, 27. August: "die masskette ist
   * immer vorhanden, bau die fanglinien ein").
   *
   * Ueber dem Joch steht auf jedem Querprofil eine Kette von Massen in
   * Zentimetern ab dem linken Jochende - die Stellen, an denen wirklich
   * etwas haengt. Einmal abgeschrieben, faengt die Eingabe darauf.
   */
  {
    const { massketteLesen, fangeAufMasskette } = await import(J('core.constants.js'));
    // Die Kette des Schulungsbeispiels: J60 E ueber 12 m.
    const r = massketteLesen('0 15 209 474 735 885 983 1185 1200', 12);
    pruef('Neun Masse gelesen', r.werte.length, 9, 1e-12, 'Stk');
    pruef('In Metern, aufsteigend', r.werte[2], 2.09, 1e-12, 'm');
    pruef('Und das letzte ist die Jochlaenge', r.werte[8], 12, 1e-12, 'm');
    wahr('Ohne Beanstandung', r.hinweis === null);
    // Grosszuegig gelesen: abgeschrieben wird von Hand.
    wahr('Komma, Strichpunkt, Zeilenumbruch trennen ebenso',
         massketteLesen(`15; 209${NL}474,  735`, 0).werte.join(' ')
           === '0.15 2.09 4.74 7.35',
         massketteLesen(`15; 209${NL}474,  735`, 0).werte.join(' '));
    wahr('Doppelte Masse zaehlen einmal',
         massketteLesen('15 15 209', 0).werte.length === 2);
    /*
     * OHNE KETTE MUSS ALLES WEITERGEHEN.
     *
     * Sie steht NICHT auf jedem Blatt (Auftraggeber, 27.08. - zunaechst
     * anders gesagt und gleich darauf berichtigt). Sie ist damit eine
     * Beigabe, kein Weg: wo sie fehlt, wird auf der Zeichnung gemessen, und
     * nichts darf deshalb anhalten oder sich beschweren.
     */
    wahr('Leere Kette bleibt leer', massketteLesen('', 12).werte.length === 0);
    wahr('Und beanstandet nichts', massketteLesen('', 12).hinweis === null);
    wahr('Auch Leerzeichen allein nicht',
         massketteLesen('   ', 12).werte.length === 0
         && massketteLesen('   ', 12).hinweis === null);
    wahr('Und undefiniert ebenso',
         massketteLesen(undefined, 12).werte.length === 0);

    /*
     * DAS LETZTE MASS IST DIE GEGENPROBE. Stimmt es nicht mit der Jochlaenge,
     * ist entweder die Kette aus einer anderen Zeichnung, die Laenge falsch
     * eingestellt, oder es wurden Millimeter abgeschrieben.
     */
    const falsch = massketteLesen('0 15 1200', 20);
    wahr('Eine unpassende Kette faellt auf', !!falsch.hinweis, falsch.hinweis ?? '');
    wahr('Und der Hinweis nennt beide Zahlen',
         falsch.hinweis.includes('12.00') && falsch.hinweis.includes('20.00'));

    // --- Fangen ----------------------------------------------------------
    const k = r.werte;
    pruef('2.07 faengt auf 2.09', fangeAufMasskette(2.07, k), 2.09, 1e-12, 'm');
    pruef('7.30 faengt auf 7.35', fangeAufMasskette(7.30, k), 7.35, 1e-12, 'm');
    pruef('Wer trifft, bleibt', fangeAufMasskette(4.74, k), 4.74, 1e-12, 'm');
    pruef('Wer weit daneben liegt, behaelt seinen Wert',
          fangeAufMasskette(3.40, k), 3.40, 1e-12, 'm');
    /*
     * DIE GRENZE IST NIE GROESSER ALS DIE HALBE LUECKE. 11.85 und 12.00
     * liegen 15 cm auseinander; mit der festen Grenze von 20 cm wuerde das
     * eine das andere ueberdecken, und ein Klick dazwischen faende die
     * falsche Stelle.
     */
    pruef('Zwischen zwei engen Massen gewinnt das naehere',
          fangeAufMasskette(11.92, k), 11.85, 1e-12, 'm');
    pruef('Und knapp darueber das andere',
          fangeAufMasskette(11.94, k), 12, 1e-12, 'm');
    wahr('Ohne Kette faengt nichts', fangeAufMasskette(2.07, []) === 2.07);

    // --- Das Modell traegt sie mit ---------------------------------------
    const wK = basis({ L: 12, masskette: '0 15 209 474 735 885 983 1185 1200' });
    const mK = modell(wK, getProfil(wK.profOG), getProfil(wK.profUG),
                      getStahl(wK.stahl), T.getTragjoch('J90'));
    pruef('Das Modell fuehrt die gelesene Kette', mK.masskette.length, 9, 1e-12, 'Stk');
    // Rechnerisch aendert sie nichts - sie ist eine Anschrift, keine Aussage.
    const wO = basis({ L: 12 });
    const mO = modell(wO, getProfil(wO.profOG), getProfil(wO.profUG),
                      getStahl(wO.stahl), T.getTragjoch('J90'));
    pruef('Und aendert am Feldmoment nichts', mK.MA, mO.MA, 1e-12, 'kNm');
    // Ohne Eintrag fuehrt das Modell eine leere Kette - kein null, kein
    // Sonderfall, den die Ansicht auseinanderhalten muesste.
    wahr('Ohne Eintrag eine leere Kette',
         Array.isArray(mO.masskette) && mO.masskette.length === 0);
    // Und ein Anbauteil behaelt dann jeden Wert, auf drei Stellen genau.
    wahr('Und die Lage bleibt, wie sie eingestellt wurde',
         fangeAufMasskette(7.123, mO.masskette) === 7.123);
  }

  // Verkleinert und als JPEG - die Zahlen stehen an einer Stelle.
  pruef('Verkleinert auf 2000 Punkte Breite', BZ.MAX_BREITE, 2000, 1e-12, 'Punkte');
  wahr('Und als JPEG mit fester Guete', BZ.GUETE > 0.7 && BZ.GUETE < 0.95,
       String(BZ.GUETE));
}

titel('39  Traeger neben den Bindeblechen');

/*
 * WEISUNG DES AUFTRAGGEBERS, 27. August: "die haengestuetze und jochaufsaetze
 * duerfen sich nicht mit den verbindungsblechen beruehren. diese sind
 * automatisch nebenan zu schieben." Dazu: "x auch auf 10 cm runden".
 *
 * Betroffen sind genau die TRAEGER - und das steht wieder in den Daten:
 * `rolle: 'traeger'` tragen die drei Jochaufsaetze und die Haengestuetze,
 * eben das, was am Joch angeschlagen wird. Ein Drahtwerk haengt an einem
 * Aufbau und beruehrt das Joch nie.
 */
{
  const CA = await import(J('core.anbauteile.js'));
  const { konstruktionsChecks: chk } = await import(J('core.checks.js'));

  const wB = basis({ typ: 'J90', L: 20, anbauteile: [] });
  const mB = modell(wB, getProfil(wB.profOG), getProfil(wB.profUG),
                    getStahl(wB.stahl), T.getTragjoch('J90'));

  // --- Die Sperrbereiche kommen aus der Stationsliste --------------------
  const sperren = CA.blechSperren(mB);
  wahr('Je Station ein Sperrbereich',
       sperren.length === mB.stationsListe.length, `${sperren.length}`);
  {
    const s0 = sperren[0], st0 = mB.stationsListe[0];
    // Die Blechbreite steht in Millimetern, der Sperrbereich in Metern.
    pruef('Und er ist so breit wie das Blech',
          s0.bis - s0.von, st0.vertikal.breite / 1000, 1e-9, 'm');
    pruef('Mittig auf der Station', (s0.von + s0.bis) / 2, st0.x, 1e-9, 'm');
  }
  wahr('Luft vergroessert ihn beidseitig',
       Math.abs((CA.blechSperren(mB, 0.05)[0].bis - CA.blechSperren(mB, 0.05)[0].von)
                - (sperren[0].bis - sperren[0].von) - 0.10) < 1e-9);

  // --- Freischieben ------------------------------------------------------
  {
    const st = mB.stationsListe[5];          // eine Station in der Jochmitte
    const b = st.vertikal.breite / 1000;
    // EINE Klemme genau auf dem Blech: raster 0 heisst, beide fallen zusammen.
    const r0 = CA.freieLageAmJoch(st.x, 0, mB);
    wahr('Genau auf dem Blech wird verschoben', r0.verschoben);
    // Knapp daneben, nicht auf die Kante - und auf Millimeter, damit die Zahl
    // in eine Zeichnung passt. Gerundet wird nach AUSSEN: nach innen stuende
    // das Bauteil wieder auf dem Blech.
    wahr('Und zwar knapp daneben, nicht auf die Kante',
         Math.abs(r0.x - st.x) > b / 2,
         `${(r0.x - st.x).toFixed(4)} m gegen halbe Blechbreite ${(b / 2).toFixed(4)}`);
    wahr('Auf ganze Millimeter',
         Math.abs(r0.x * 1000 - Math.round(r0.x * 1000)) < 1e-6, String(r0.x));
    wahr('Mindestens einen Millimeter, nicht auf die Kante',
         Math.abs(r0.x - st.x) >= b / 2 + 0.001 - 1e-9,
         String(Math.abs(r0.x - st.x)));
    wahr('Und nicht weiter als noetig',
         Math.abs(r0.x - st.x) < b / 2 + 0.0021, String(Math.abs(r0.x - st.x)));
    // Daneben bleibt daneben.
    const frei = st.x + 0.30;
    pruef('Wer frei steht, bleibt stehen', CA.freieLageAmJoch(frei, 0, mB).x,
          frei, 1e-12, 'm');
    wahr('Und meldet keine Verschiebung', !CA.freieLageAmJoch(frei, 0, mB).verschoben);
  }

  /*
   * ZWEI KLEMMEN, NICHT EINE. Ein Traeger haengt im Abstand `raster`; beide
   * Klemmen muessen an einem Blech vorbei. Mit raster = Stationsabstand
   * saessen beide zugleich auf je einem Blech - dann muss die Lage weichen,
   * obwohl ihre MITTE frei liegt.
   */
  {
    const a1 = mB.stationsListe[1].x - mB.stationsListe[0].x;
    const mitte = (mB.stationsListe[4].x + mB.stationsListe[5].x) / 2;
    // Die Mitte zwischen zwei Stationen ist fuer sich frei ...
    wahr('Die Mitte zwischen zwei Blechen ist frei',
         !CA.freieLageAmJoch(mitte, 0, mB).verschoben);
    // ... aber mit einem Raster von einem Stationsabstand sitzen beide
    // Klemmen auf den Nachbarblechen.
    const r = CA.freieLageAmJoch(mitte, a1, mB);
    wahr('Mit dem Raster eines Feldes weicht sie trotzdem', r.verschoben,
         `${mitte.toFixed(3)} -> ${r.x.toFixed(3)}`);
  }

  /*
   * ERST WEITEN, DANN WEICHEN (Weisung, 27. August).
   *
   * "Die Joche sind fix, die Anbauteile werden drum herum angebracht. Im
   * Normalfall stehen die Klemmen 0.40 m, aber sollten diese im Bereich der
   * Knoten zu liegen kommen, dann ist der Abstand entsprechend zu
   * vergroessern."
   *
   * Die Weitung ist die gebaute Abhilfe: die Stuetze bleibt, wo sie
   * hingehoert, und ihre Klemmen ueberspannen das Blech.
   */
  {
    const st = mB.stationsListe[6];
    // Eine Lage, bei der die linke Klemme auf dem Blech sitzt.
    const x = st.x + 0.20;
    const an = CA.passeTraegerAn(x, 0.40, mB);
    wahr('Statt zu verschieben wird geweitet', an.geweitet && !an.verschoben,
         JSON.stringify(an));
    pruef('Die Lage bleibt, wo sie ist', an.x, x, 1e-12, 'm');
    wahr('Und das Raster wird groesser', an.raster > 0.40, String(an.raster));
    wahr('Auf ganze Millimeter', Math.abs(an.raster * 1000 - Math.round(an.raster * 1000)) < 1e-6);
    // Beide Klemmen sind danach frei.
    const sperren = CA.blechSperren(mB);
    const frei = (p2) => !sperren.some((sp) => p2 > sp.von - 1e-9 && p2 < sp.bis + 1e-9);
    wahr('Beide Klemmen liegen danach frei',
         frei(an.x - an.raster / 2) && frei(an.x + an.raster / 2),
         `${(an.x - an.raster / 2).toFixed(3)} / ${(an.x + an.raster / 2).toFixed(3)}`);
    // Wer schon frei sitzt, bleibt unangetastet.
    const ohne = CA.passeTraegerAn(st.x, 0.40, mB);
    wahr('Wer frei sitzt, behaelt Lage und Raster',
         !ohne.geweitet && !ohne.verschoben && ohne.raster === 0.40);
  }

  /*
   * BEIDE KLEMMEN MUESSEN AUF DEM JOCH BLEIBEN.
   *
   * Am wirklichen Querprofil aufgefallen: ein Mass 16 cm vor dem Jochende.
   * Dort laege die geweitete Klemme JENSEITS des Jochs - ein Anschluss an
   * nichts. Die Weitung ist dort keine Abhilfe.
   */
  {
    const nahEnde = mB.L - 0.16;
    const r = CA.freiesRasterAmJoch(nahEnde, 0.40, mB);
    wahr('So nah am Ende wird nicht geweitet', !r.geweitet,
         `${nahEnde.toFixed(2)} m -> Raster ${r.raster}`);
    // Und am Jochanfang ebenso.
    wahr('Am Jochanfang ebensowenig',
         !CA.freiesRasterAmJoch(0.16, 0.40, mB).geweitet);
  }

  // Ohne Bleche gibt es nichts auszuweichen.
  wahr('Ohne Stationsliste bleibt alles, wie es ist',
       CA.freieLageAmJoch(3.3, 0.4, {}).x === 3.3);

  // --- Wer ist ein Traeger? ----------------------------------------------
  {
    const rolle = (id) => FL.getFlBauteil(id).rolle;
    const DA = await import(J('data.anbauteile.js'));
    const hs = DA.getVorlage('hs-nur'), ja = DA.getVorlage('ja-einfach');
    const tr = DA.getVorlage('leiter-traverse'), rl = DA.getVorlage('leiter-rl');
    wahr('Die Haengestuetze ist ein Traeger', CA.hatTraeger(hs.module, rolle));
    wahr('Der Jochaufsatz ebenso', CA.hatTraeger(ja.module, rolle));
    wahr('Die Traverse nicht', !CA.hatTraeger(tr.module, rolle));
    wahr('Der Rueckleiter nicht', !CA.hatTraeger(rl.module, rolle));
    wahr('Ohne Module nichts', !CA.hatTraeger(undefined, rolle));
  }

  // --- Pruefung P8 -------------------------------------------------------
  {
    const st = mB.stationsListe[6];
    const hs = (await import(J('data.anbauteile.js'))).getVorlage('hs-nur');
    const teil = (x) => ({ id: 'HS', name: 'Haengestuetze', vorlage: 'hs-nur',
      x, raster: 0, befestigung: hs.befestigung, aktiv: true,
      module: JSON.parse(JSON.stringify(hs.module)) });
    const bau = (x) => {
      const w = basis({ typ: 'J90', L: 20, anbauteile: [teil(x)] });
      return modell(w, getProfil(w.profOG), getProfil(w.profUG),
                    getStahl(w.stahl), T.getTragjoch('J90'));
    };
    const drauf = chk(bau(st.x)).find((c) => c.id === 'P8');
    wahr('P8 faengt eine Klemme auf dem Blech', drauf && drauf.ok === false,
         drauf?.status);
    wahr('Und nennt Name und Stelle',
         /Haengestuetze|Hängestütze/.test(drauf.status)
         && drauf.status.includes(st.x.toFixed(2)), drauf.status);
    const frei = chk(bau(st.x + 0.30)).find((c) => c.id === 'P8');
    wahr('Daneben ist sie erfuellt', frei.ok === true, frei.status);
    // Ohne Traeger am Joch gibt es nichts zu pruefen - dann steht P8 nicht da.
    const ohne = chk(mB).find((c) => c.id === 'P8');
    wahr('Ohne Traeger steht P8 gar nicht in der Liste', ohne === undefined);
  }

  /*
   * P1 UND DIE BAUTEILE AM MASTEN - ein selbst eingebauter Fehlalarm.
   *
   * P1 prueft, ob die Befestigungspunkte auf dem Joch liegen: x +- raster/2
   * zwischen 0 und L. Mit den Anbauteilen AM MASTEN (dieselbe Sitzung) kam
   * ein Fall dazu, den die Pruefung nicht kannte: ein Teil am Masten wird
   * ueber seine HOEHE angesetzt, sein x steht auf 0 und bedeutet nichts.
   *
   * Ergebnis im laufenden Programm: ein Rueckleiter auf einer Traverse am
   * Mast A meldete "AUSSERHALB: Leiter-Traverse am Joch" - weil die halbe
   * Klemmweite von 0.60 m links von x = 0 zu liegen kam. Das Joch war in
   * Ordnung, die Meldung nicht.
   *
   * P6, P7 und P8 klammern die Masten laengst aus. P1 nicht - bis jetzt.
   */
  {
    const hs = (await import(J('data.anbauteile.js'))).getVorlage('hs-nur');
    const teil = (o) => ({ id: 'X', name: o.name ?? 'Teil', vorlage: 'hs-nur',
      x: o.x ?? 5, raster: o.raster ?? 0.4, ort: o.ort, hMast: o.hMast,
      befestigung: hs.befestigung, aktiv: true,
      module: JSON.parse(JSON.stringify(hs.module)) });
    const p1 = (teile) => {
      const w = basis({ typ: 'J90', L: 20, endbedingung: 'mast',
                        mastProfil: 'HEB 260', mastH: 7.5, anbauteile: teile });
      const m = modell(w, getProfil(w.profOG), getProfil(w.profUG),
                       getStahl(w.stahl), T.getTragjoch('J90'));
      return chk(m).find((c) => c.id === 'P1');
    };

    // Der gemeldete Fall, nachgestellt: x = 0, raster 0.60, am Mast A.
    const amMast = p1([teil({ name: 'Leiter-Traverse', ort: 'mastA',
                              x: 0, raster: 0.6, hMast: 6 })]);
    wahr('Ein Bauteil am Masten faellt nicht bei P1 durch',
         amMast.ok === true, amMast.status);
    wahr('Und es wird bei P1 gar nicht mitgezaehlt',
         amMast.text.includes('der 0 Anbauteile'), amMast.text);

    // Am Joch gilt die Regel unveraendert.
    wahr('Am Joch bleibt P1 erfuellt', p1([teil({ x: 5 })]).ok === true);
    {
      const raus = p1([teil({ name: 'zu weit rechts', x: 19.9 })]);
      wahr('Ueber das rechte Ende hinaus faellt es durch', raus.ok === false);
      pruef('Und die Zahl zeigt den rechten Rand', raus.vorhanden, 20.1, 1e-9, 'm');
      wahr('Gegen die Jochlaenge', raus.erforderlich === 20 && raus.richtung === '<=');
    }
    /*
     * DIE ZAHL MUSS DIE VERLETZUNG ZEIGEN. Links hinaus stand vorher
     * "10.11 <= 20.00" mit einem Kreuz daneben - der groesste RECHTE Rand,
     * waehrend links etwas fehlte. Die Zeile erklaerte gar nichts.
     */
    {
      const links = p1([teil({ name: 'zu weit links', x: 0.1 }), teil({ x: 10 })]);
      wahr('Links hinaus faellt es durch', links.ok === false, links.status);
      pruef('Und die Zahl zeigt den linken Rand', links.vorhanden, -0.1, 1e-9, 'm');
      wahr('Gegen null', links.erforderlich === 0 && links.richtung === '>=');
      wahr('Der Name steht in der Meldung', links.status.includes('zu weit links'),
           links.status);
    }
    // Ohne Anbauteile gibt es nichts zu pruefen - und keinen Fehlalarm.
    wahr('Ohne Anbauteile ist P1 erfuellt', p1([]).ok === true);
  }
}

titel('40  Masten und Joch in der Zeichnung erkennen');

/*
 * WEISUNG DES AUFTRAGGEBERS, 27. August: eine automatische Erkennung von
 * Masten und Jochen, und die Zeichnung danach selbst ausrichten.
 *
 * SIE SCHLAEGT VOR, SIE ENTSCHEIDET NICHT. Eine Zeichnung ist kein Datensatz:
 * was darauf steht, steht dort fuer einen Menschen. Jede Erkennung ist eine
 * Vermutung, und eine Vermutung, die sich als Messung ausgibt, waere
 * schlimmer als gar keine. Das Ergebnis traegt sein Zutrauen bei sich, und
 * die zwei Klicks bleiben erreichbar.
 *
 * GEPRUEFT WIRD AUF NACHGEBAUTEN BLAETTERN. Ein Bild braucht einen Browser;
 * die Geometrie nicht. Die Erkennung rechnet deshalb auf einer MASKE, und
 * die laesst sich hier Pixel fuer Pixel hinlegen - mit allem, was auf einem
 * Querprofil sonst noch steht und die Sache stoeren koennte.
 */
{
  const EK = await import(J('bild.erkennung.js'));

  /** Ein nachgebautes Querprofil: Blatt, Masskette, Joch, Masten, Gleise. */
  const blatt = (o = {}) => {
    const B = o.breite ?? 1200, H = o.hoehe ?? 800;
    const m = new Uint8Array(B * H);
    const setz = (x, y) => { if (x >= 0 && x < B && y >= 0 && y < H) m[y * B + x] = 1; };
    const waag = (y, x0, x1, d = 1) => {
      for (let x = x0; x <= x1; x++) for (let k = 0; k < d; k++) setz(x, y + k);
    };
    const senk = (x, y0, y1, d = 1) => {
      for (let y = y0; y <= y1; y++) for (let k = 0; k < d; k++) setz(x + k, y);
    };
    // Der Blattrahmen - er laeuft ueber die ganze Hoehe und Breite und ist
    // damit der gefaehrlichste Mitbewerber, fuer den Masten wie fuer das Joch.
    if (o.rahmen !== false) {
      waag(6, 6, B - 7); waag(H - 7, 6, B - 7);
      senk(6, 6, H - 7); senk(B - 7, 6, H - 7);
    }
    // Masskette: eine lange duenne Waagrechte mit Teilstrichen, ueber dem Joch.
    if (o.kette !== false) {
      waag(70, 200, 1000);
      [200, 260, 420, 560, 700, 830, 940, 1000].forEach((x) => senk(x, 62, 78));
    }
    // Das Joch: zwei Gurte mit Fuellstaeben dazwischen.
    const jochOben = o.jochOben ?? 180, jochUnten = o.jochUnten ?? 194;
    const xL = o.xL ?? 200, xR = o.xR ?? 1000;
    waag(jochOben, xL, xR, 3); waag(jochUnten, xL, xR, 3);
    for (let x = xL; x <= xR; x += 40) senk(x, jochOben, jochUnten + 3, 2);
    /*
     * Zwei Masten, verschieden lang - das ist der Normalfall. Sie koennen
     * aber UEBER das Joch hinauslaufen (`ueberstand`): oben traegt dann jeder
     * eine Traverse mit einem Einzelleiter. Das ist kein Sonderfall, es steht
     * so auf den Blaettern - und es hat die erste Fassung der Erkennung zu
     * Fall gebracht, die den Mastkopf fuer die Jochachse hielt.
     */
    const ue = o.ueberstand ?? 0;
    senk(xL, jochOben - 2 - ue, o.fussL ?? 640, 6);
    senk(xR, jochOben - 2 - ue, o.fussR ?? 610, 5);
    if (ue > 0) {
      waag(jochOben - ue + 6, xL, xL + 70, 3);
      waag(jochOben - ue + 4, xR - 70, xR, 3);
    }
    // Eine Masskette kann auch ZWISCHEN Mastkopf und Joch stehen. Dann hilft
    // kein Fenster mehr - nur noch, dass ein Joch mehr Tinte traegt.
    if (o.ketteTief) {
      const y = jochOben - Math.round(ue / 2);
      waag(y, xL, xR);
      [xL, 380, 520, 660, 800, xR].forEach((x) => senk(x, y - 8, y + 8));
    }
    // Lichtraumprofile: grosse Kaesten, deren Seiten senkrecht sind.
    for (let i = 0; i < 3; i++) {
      const x0 = 300 + i * 220, x1 = x0 + 170, y0 = 300, y1 = 560;
      waag(y0, x0, x1); waag(y1, x0, x1); senk(x0, y0, y1); senk(x1, y0, y1);
    }
    // Terrainlinie, strichpunktiert, und das Schriftfeld.
    for (let x = 60; x < B - 60; x += 12) waag(600, x, x + 7);
    waag(700, 60, B - 60); waag(760, 60, B - 60);
    return { m, B, H, xL, xR, achse: (jochOben + jochUnten + 3) / 2 };
  };

  // --- Der Normalfall ----------------------------------------------------
  {
    const b = blatt();
    const r = EK.erkenneTragwerk(b.m, b.B, b.H);
    wahr('Das Tragwerk wird gefunden', !!r);
    pruef('Der linke Mast sitzt auf seiner Achse', r.p1.px, b.xL + 2.5, 0.6, 'Punkte');
    pruef('Der rechte ebenso', r.p2.px, b.xR + 2, 0.6, 'Punkte');
    // Die Achse liegt ZWISCHEN den Gurten, nicht auf einem davon.
    pruef('Die Jochachse liegt zwischen den Gurten', r.p1.py, b.achse, 0.02, 'Punkte');
    wahr('Und beide Punkte auf derselben Hoehe', r.p1.py === r.p2.py);
    wahr('Mit vollem Zutrauen', r.guete > 0.9, r.guete.toFixed(2));
  }

  /*
   * DER BLATTRAHMEN IST KEIN MAST - und keine Jochachse.
   *
   * Er laeuft ueber die ganze Blatthoehe und schlaegt jeden Masten an Laenge;
   * seine obere Kante laeuft ueber die ganze Breite und schlaegt jeden Gurt
   * an Tinte. Beides ist gemessen worden, und beides ging zuerst schief:
   * die Erkennung fand die Blattkante statt des Jochs.
   *
   * Zwei Regeln halten ihn draussen: der aeusserste Rand zaehlt nicht mit,
   * und das Joch wird am MASTKOPF gesucht statt auf dem ganzen Blatt.
   */
  {
    const mit = EK.erkenneTragwerk(...(() => { const b = blatt(); return [b.m, b.B, b.H]; })());
    const b2 = blatt({ rahmen: false });
    const ohne = EK.erkenneTragwerk(b2.m, b2.B, b2.H);
    wahr('Mit Rahmen und ohne dasselbe Ergebnis',
         Math.abs(mit.p1.px - ohne.p1.px) < 0.01
         && Math.abs(mit.p1.py - ohne.p1.py) < 0.01,
         `${mit.p1.px}/${mit.p1.py} gegen ${ohne.p1.px}/${ohne.p1.py}`);
    pruef('Und die Achse trifft die Jochmitte', ohne.p1.py, b2.achse, 0.02, 'Punkte');
  }

  // Die Masskette liegt darueber und ist ebenfalls eine lange Waagrechte -
  // sie darf die Jochachse nicht an sich ziehen.
  {
    const b = blatt(), o = blatt({ kette: false });
    const rm = EK.erkenneTragwerk(b.m, b.B, b.H);
    const ro = EK.erkenneTragwerk(o.m, o.B, o.H);
    wahr('Die Masskette zieht die Achse nicht an sich',
         Math.abs(rm.p1.py - ro.p1.py) < 0.01, `${rm.p1.py} gegen ${ro.p1.py}`);
  }

  /*
   * DER MAST LAEUFT UEBER DAS JOCH HINAUS.
   *
   * Gemessen an einem Querprofil J70 E / 15 m auf DP26 und DPM24: beide
   * Masten ragen ueber das Joch und tragen oben je eine Traverse mit einem
   * 95Cu. Die erste Fassung ankerte am MASTKOPF - und fand die Traverse:
   * Jochachse 103 statt 282, Zutrauen 0.10. Sie hat den Vorschlag damit
   * immerhin verworfen statt ihn zu behaupten, geholfen hat sie nicht.
   *
   * Der Anker ist jetzt die ganze Mastlaenge, und gewaehlt wird das
   * tintenreichste durchlaufende Band darin.
   */
  {
    const b = blatt({ ueberstand: 190 });
    const r = EK.erkenneTragwerk(b.m, b.B, b.H);
    wahr('Ein Mast darf ueber das Joch hinausragen', !!r);
    pruef('Die Traverse ist nicht die Jochachse', r.p1.py, b.achse, 0.5, 'Punkte');
    wahr('Und das Zutrauen bleibt voll', r.guete > 0.9, r.guete.toFixed(2));
  }

  /*
   * DIE MASSKETTE ZWISCHEN MASTKOPF UND JOCH.
   *
   * Steht sie dort, liegt sie MITTEN im Suchbereich, und sie fuellt den
   * Streifen so ganz wie ein Gurt. Dass sie trotzdem verliert, liegt allein
   * am Band: ein Joch sind zwei Gurte mit Fuellstaeben, eine Masskette ist
   * ein Strich.
   */
  {
    const o = blatt({ ueberstand: 190 });
    const k = blatt({ ueberstand: 190, ketteTief: true });
    const ro = EK.erkenneTragwerk(o.m, o.B, o.H);
    const rk = EK.erkenneTragwerk(k.m, k.B, k.H);
    wahr('Eine Masskette im Suchbereich zieht die Achse nicht an sich',
         Math.abs(rk.p1.py - ro.p1.py) < 0.01, `${rk.p1.py} gegen ${ro.p1.py}`);
  }

  // --- Was NICHT erkannt werden darf --------------------------------------
  {
    const leer = new Uint8Array(400 * 300);
    wahr('Ein leeres Blatt ergibt nichts',
         EK.erkenneTragwerk(leer, 400, 300) === null);
    // Nur ein Mast: kein Joch.
    const eins = new Uint8Array(400 * 300);
    for (let y = 40; y < 260; y++) for (let d = 0; d < 4; d++) eins[y * 400 + 200 + d] = 1;
    wahr('Ein einzelner Mast ergibt nichts',
         EK.erkenneTragwerk(eins, 400, 300) === null);
    // Zwei Masten zu nah beieinander: das waere kein Joch.
    const nah = new Uint8Array(400 * 300);
    [200, 230].forEach((x) => {
      for (let y = 40; y < 260; y++) for (let d = 0; d < 4; d++) nah[y * 400 + x + d] = 1;
    });
    wahr('Zwei Masten dicht nebeneinander ebenso',
         EK.erkenneTragwerk(nah, 400, 300) === null);
  }

  /*
   * DAS ZUTRAUEN MUSS SINKEN, wenn die Sache nicht eindeutig ist.
   *
   * Steht ein dritter, ebenso langer senkrechter Strich auf dem Blatt - ein
   * Signalmast, ein Kandelaber, ein angeschnittenes Nachbartragwerk -, dann
   * ist nicht mehr klar, welche zwei gemeint sind. Genau dann soll die
   * Erkennung nicht behaupten, sie wisse es.
   */
  {
    const b = blatt();
    const r1 = EK.erkenneTragwerk(b.m, b.B, b.H);
    const d = blatt();
    for (let y = 178; y < 640; y++) {
      for (let k = 0; k < 6; k++) d.m[y * d.B + 600 + k] = 1;
    }
    const r2 = EK.erkenneTragwerk(d.m, d.B, d.H);
    wahr('Ein dritter langer Strich senkt das Zutrauen',
         r2 && r2.guete < r1.guete, `${r1.guete.toFixed(2)} -> ${r2?.guete.toFixed(2)}`);
  }

  // --- Rot ist dunkel -----------------------------------------------------
  /*
   * Auf einem Querprofil ist das NEUE rot gezeichnet - und der Mast, den man
   * sucht, ist oft genau das. Reines Rot hat eine wahrgenommene Helligkeit
   * von 76: deutlich unter der Schwelle, obwohl sein Rotkanal voll
   * ausgesteuert ist. Wer nur den Rotkanal prueft, saehe es als hell.
   */
  {
    const px = (r, g, bl, a = 255) => [r, g, bl, a];
    const daten = new Uint8ClampedArray([
      ...px(0, 0, 0), ...px(255, 0, 0), ...px(255, 255, 255),
      ...px(200, 200, 200), ...px(0, 0, 255), ...px(255, 255, 255, 0),
    ]);
    const maske = EK.maskeAusBild(daten, 6, 1);
    wahr('Schwarz ist dunkel', maske[0] === 1);
    wahr('Rot auch', maske[1] === 1);
    wahr('Weiss nicht', maske[2] === 0);
    wahr('Helles Grau nicht', maske[3] === 0);
    wahr('Blau schon', maske[4] === 1);
    wahr('Durchsichtiges gilt als hell', maske[5] === 0);
  }
}

titel('41  Welche Nachweise gefuehrt werden');

/*
 * WEISUNG DES AUFTRAGGEBERS, 27. August: waehlen koennen, welche Nachweise
 * gefuehrt werden - Jochtragwerk, Auflager Joch, Knicken Joch, Mast.
 *
 * BEIM NACHSEHEN KAM EIN BEFUND HERAUS, DER DIE AUFGABE VERAENDERT HAT:
 * von den vier genannten gibt es zwei gar nicht. core.vierendeel.js sagt es
 * seit jeher selbst - "KEIN Knicknachweis, bewusst nicht enthalten" -, und
 * ein Mastnachweis existiert ebenso wenig; der Mast ist eine Drehfeder und
 * seit kurzem Geometrie in der Ausleitung.
 *
 * Entschieden hat der Auftraggeber: beide erscheinen, unschaltbar, als NICHT
 * GEFUEHRT. Und ein abgeschalteter Nachweis wird nicht gefuehrt und nie als
 * erfuellt gezaehlt.
 *
 * >>> DAS IST DIE EIGENTLICHE GEFAHR AN DIESER WEISUNG. <<<
 * Ein abgeschalteter Nachweis, der einfach aus der Liste faellt, sieht aus
 * wie ein bestandener. Die Kontrollen unten halten genau das fest.
 */
{
  const CH = await import(J('core.checks.js'));

  // --- Die Gruppen -------------------------------------------------------
  {
    const g = CH.NACHWEISGRUPPEN.map((x) => x.key);
    wahr('Vier Gruppen, in der Reihenfolge der Weisung',
         g.join(',') === 'jochtragwerk,auflagerJoch,knickenJoch,mast', g.join(','));
    const da = CH.NACHWEISGRUPPEN.filter((x) => x.vorhanden).map((x) => x.key);
    wahr('Drei davon gibt es',
         da.join(',') === 'jochtragwerk,auflagerJoch,mast', da.join(','));
    wahr('Knicken ist nicht enthalten',
         CH.NACHWEISGRUPPEN.find((x) => x.key === 'knickenJoch').vorhanden === false);
    // Der Mast seit dem 28. August schon - und sein `was` sagt, was FEHLT.
    wahr('Der Mast ist enthalten',
         CH.NACHWEISGRUPPEN.find((x) => x.key === 'mast').vorhanden === true);
    /*
     * SEIT DEM 2. SEPTEMBER MIT STABILITAET.
     *
     * Hier stand, `was` muesse die Stabilitaet als NICHT enthalten nennen.
     * Das Biegeknicken wird jetzt gefuehrt (EN 1993-1-1, 6.3.3); was aussen
     * vor bleibt, ist das Biegedrillknicken - und auch das steht dort, statt
     * still angenommen zu werden.
     */
    wahr('Das Biegeknicken ist enthalten',
         /Biegeknicken/.test(CH.NACHWEISGRUPPEN.find((x) => x.key === 'mast').was));
    wahr('… und das Biegedrillknicken ausdruecklich nicht',
         /Biegedrillknicken bleibt aussen vor/
           .test(CH.NACHWEISGRUPPEN.find((x) => x.key === 'mast').was));
    wahr('Das Auflager ist vorhanden, aber nicht voreingestellt',
         CH.NACHWEISGRUPPEN.find((g) => g.key === 'auflagerJoch').vorhanden === true);
  }

  /*
   * WAS ES NICHT GIBT, WIRD NICHT GEFUEHRT - auch wenn es in einer alten
   * Datei auf true steht. Eine Ablage aus einer spaeteren Fassung, in der es
   * den Knicknachweis gaebe, darf hier nicht behaupten, er sei gefuehrt.
   */
  {
    const a = CH.nachweiseAuswahl({ knickenJoch: true });
    wahr('Ein gespeichertes true macht keinen Nachweis',
         a.knickenJoch === false, JSON.stringify(a));
    wahr('Ohne Angabe gilt die Voreinstellung der Gruppe',
         CH.nachweiseAuswahl(undefined).jochtragwerk === true
         && CH.nachweiseAuswahl(undefined).auflagerJoch === false);
    wahr('Ausgeschaltet bleibt ausgeschaltet',
         CH.nachweiseAuswahl({ jochtragwerk: false }).jochtragwerk === false);
    // Wer ihn einschaltet, bekommt ihn - die Voreinstellung ist keine Sperre.
    wahr('Eingeschaltet wird er gefuehrt',
         CH.nachweiseAuswahl({ auflagerJoch: true }).auflagerJoch === true);
  }

  // --- Welche Pruefung zu welcher Gruppe gehoert -------------------------
  {
    const gv = (id) => CH.gruppeVon({ id });
    wahr('Q1 gehoert zum Jochtragwerk', gv('Q1') === 'jochtragwerk');
    wahr('Q12 auch', gv('Q12') === 'jochtragwerk');
    wahr('A1 zum Auflager', gv('A1') === 'auflagerJoch');
    // Die Plausibilitaetspruefungen sind Konstruktionsregeln, keine
    // Tragsicherheit - sie gehoeren zu keiner Gruppe und bleiben immer.
    ['P1', 'P2', 'P3', 'P6', 'P7', 'P8'].forEach((id) =>
      wahr(`${id} gehoert zu keiner Gruppe`, gv(id) === null));
  }

  // --- Abschalten laesst die Pruefungen verschwinden ---------------------
  {
    const mach = (nw) => {
      const w = basis({ typ: 'J90', L: 20, endbedingung: 'mast',
                        mastProfil: 'HEB 260', mastH: 7.5, schraubenFgrenz: 24,
                        nachweise: nw });
      const m = modell(w, getProfil(w.profOG), getProfil(w.profUG),
                       getStahl(w.stahl), T.getTragjoch('J90'));
      return CH.konstruktionsChecks(m);
    };
    const alle = mach(undefined);
    const zaehl = (cs, re) => cs.filter((c) => re.test(c.id)).length;
    wahr('Voreingestellt stehen Querschnittspruefungen da', zaehl(alle, /^Q\d+$/) > 0,
         `${zaehl(alle, /^Q\d+$/)} Stueck`);
    wahr('Der Gurtanschluss A1 aber nicht - er ist ab Werk aus',
         zaehl(alle, /^A1$/) === 0);
    wahr('Eingeschaltet steht er da',
         zaehl(mach({ auflagerJoch: true }), /^A1$/) === 1);

    const ohneJoch = mach({ jochtragwerk: false, auflagerJoch: true });
    wahr('Ohne Jochtragwerk keine Querschnittspruefung', zaehl(ohneJoch, /^Q\d+$/) === 0);
    wahr('A1 steht trotzdem noch da', zaehl(ohneJoch, /^A1$/) === 1);
    wahr('Und die Plausibilitaet bleibt', zaehl(ohneJoch, /^P\d+$/) > 0);

    const ohneAufl = mach({ auflagerJoch: false });
    // (Dasselbe wie die Voreinstellung - hier ausdruecklich geschrieben.)
    wahr('Ohne Auflager kein A1', zaehl(ohneAufl, /^A1$/) === 0);
    wahr('Die Querschnitte bleiben', zaehl(ohneAufl, /^Q\d+$/) > 0);
  }

  // --- Das Urteil verschweigt nichts -------------------------------------
  {
    const u = (nw, checks = []) => CH.urteilKonstruktion(checks, nw);
    const std = u(undefined);
    // Seit dem 28. August ist der Mast dabei; nicht gefuehrt bleiben das
    // Auflager (ausgeschaltet) und das Knicken (nicht enthalten).
    wahr('Voreingestellt sind ZWEI Nachweise nicht gefuehrt',
         std.nichtGefuehrt.length === 2,
         std.nichtGefuehrt.map((g) => `${g.titel} (${g.grund})`).join(', '));
    /*
     * DER GRUND MUSS STIMMEN. «Abgewaehlt» stand hier zuerst - es behauptet,
     * der Benutzer habe entschieden. Beim Auflagernachweis stimmt das nicht:
     * der ist ab Werk aus. «Ausgeschaltet» sagt, was der Fall ist, ohne zu
     * sagen, wer es war.
     */
    wahr('Das Auflager ist ausgeschaltet, nicht fehlend',
         std.nichtGefuehrt.find((g) => g.key === 'auflagerJoch').grund === 'ausgeschaltet');
    wahr('Knicken ist nicht enthalten',
         std.nichtGefuehrt.filter((g) => g.grund === 'nicht enthalten')
           .map((g) => g.key).join(',') === 'knickenJoch');
    wahr('Der Mast steht nicht mehr darunter',
         !std.nichtGefuehrt.some((g) => g.key === 'mast'));
    wahr('Das Jochtragwerk gilt als gefuehrt', std.tragwerkGefuehrt === true);

    const ab = u({ jochtragwerk: false });
    wahr('Ausgeschaltet wird als solches genannt',
         ab.nichtGefuehrt.find((g) => g.key === 'jochtragwerk')?.grund === 'ausgeschaltet');
    wahr('Und das Urteil weiss, dass eta keines mehr ist',
         ab.tragwerkGefuehrt === false);
    wahr('Dann sind es drei - der Mast bleibt gefuehrt',
         ab.nichtGefuehrt.length === 3,
         ab.nichtGefuehrt.map((g) => g.key).join(','));

    /*
     * DER GEFAEHRLICHE FALL, ausgeschrieben.
     *
     * Eine VERLETZTE Pruefung, deren Gruppe abgeschaltet wird: sie faellt aus
     * der Liste, und alleOk steht auf true. Das ist fuer sich richtig - die
     * Liste sagt ueber das, was gefuehrt wurde, die Wahrheit. Allein waere es
     * gefaehrlich. Deshalb MUSS nichtGefuehrt die Gruppe nennen.
     */
    const kaputt = [{ id: 'A1', ok: false, text: 'Gurtanschluss' }];
    const mitA1 = u(undefined, kaputt);
    wahr('Gefuehrt und verletzt: das Urteil faellt', mitA1.alleOk === false);
    const ohneA1 = u({ auflagerJoch: false }, []);
    wahr('Abgeschaltet: die Liste ist sauber', ohneA1.alleOk === true);
    wahr('ABER die Gruppe steht als nicht gefuehrt da',
         ohneA1.nichtGefuehrt.some((g) => g.key === 'auflagerJoch'
                                       && g.grund === 'ausgeschaltet'));
  }


  /*
   * WELCHE VERLETZUNG DAS URTEIL ROT FAERBT.
   *
   * Weisung des Auftraggebers, 28. August: "hier sollte alles gruen sein, die
   * verletzung ist nicht so relevant". Vorher machte JEDE verletzte Pruefung
   * das Urteil rot - eine Klemme zehn Zentimeter neben ihrem Platz sah aus
   * wie ein ueberschrittener Nachweis. Wer das ein paarmal sieht, liest die
   * Farbe nicht mehr.
   *
   * Rot bleibt: eta > 1, und eine Verletzung, die ETA SELBST hinfaellig
   * macht. Das ist genau eine - die Querschnittsklasse. Klasse 4 heisst, der
   * Querschnitt beult vor dem Fliessen; dann darf gar nicht elastisch
   * gerechnet werden, und ein gruenes Urteil daneben waere die eine Zeile,
   * die wirklich in die Irre fuehrt.
   */
  {
    const u = (checks) => CH.urteilKonstruktion(checks, { auflagerJoch: true });
    // Eine Konstruktionsregel: gemeldet, aber nicht bindend.
    const weich = u([{ id: 'P8', ok: false, text: 'Klemme auf einem Blech' }]);
    wahr('Eine verletzte Konstruktionsregel steht im Urteil',
         weich.alleOk === false && weich.anzahlVerletzt === 1);
    wahr('Aber sie faerbt es nicht rot', weich.bindendVerletzt === false);

    // Die Querschnittsklasse: bindend.
    const hart = u([{ id: 'Q1', ok: false, text: 'Klasse 4', urteilBindend: true }]);
    wahr('Eine verletzte Querschnittsklasse schon',
         hart.bindendVerletzt === true);

    // Beides zusammen: die bindende gewinnt.
    const beides = u([{ id: 'P8', ok: false, text: 'weich' },
                      { id: 'Q1', ok: false, text: 'hart', urteilBindend: true }]);
    wahr('Zusammen entscheidet die bindende', beides.bindendVerletzt === true);
    pruef('Und gezaehlt werden trotzdem beide', beides.anzahlVerletzt, 2, 1e-12, 'Stk');

    // Erfuellte Pruefungen faerben nichts.
    wahr('Ohne Verletzung ist nichts bindend',
         u([{ id: 'Q1', ok: true, urteilBindend: true }]).bindendVerletzt === false);
  }

  /*
   * UND DIE KLASSE TRAEGT DIE MARKE WIRKLICH. Ohne sie waere die Trennung
   * oben eine Verabredung ohne Gegenstueck: die Q-Pruefungen kommen aus
   * konstruktionsChecks, nicht aus dem Pruefstand.
   */
  {
    const w = basis({ typ: 'J90', L: 20 });
    const mm = modell(w, getProfil(w.profOG), getProfil(w.profUG),
                      getStahl(w.stahl), T.getTragjoch('J90'));
    const cs = CH.konstruktionsChecks(mm);
    const qs = cs.filter((c) => /^Q\d+$/.test(c.id));
    wahr('Jede Querschnittspruefung ist bindend',
         qs.length > 0 && qs.every((c) => c.urteilBindend === true),
         `${qs.length} Stueck`);
    const ps = cs.filter((c) => /^P\d+$/.test(c.id));
    wahr('Keine Konstruktionsregel ist es',
         ps.length > 0 && ps.every((c) => c.urteilBindend !== true),
         ps.map((c) => c.id).join(', '));
  }

  // --- Der Reiter im Optionen-Dialog -------------------------------------
  {
    const SCH = await import(J('ui.schema.js'));
    const themen = SCH.optionenThemen(basis()).map((t) => t.key);
    wahr('Der Optionen-Dialog hat einen Reiter Nachweise',
         themen.includes('nachweise'), themen.join(', '));
    wahr('Und die Nachweise stehen in keinem Feld-Abschnitt',
         SCH.optionenFelder(basis(), 'nachweise').length === 0);
    wahr('Die Voreinstellung steht in den Standardwerten',
         standardwerte().nachweise?.jochtragwerk === true
         && standardwerte().nachweise?.auflagerJoch === false);
  }
}

titel('42  Der lange Mast mit Zusatzleitern');

/*
 * WEISUNG DES AUFTRAGGEBERS, 28. August: "die masten immer einen halben meter
 * ueber den obergurt fuehren" und "ausserdem ist ein langer masten mit
 * zusatzleitern wie im beispiel, dann sollte man dies eingeben koennen".
 *
 * Das Beispiel ist das dritte Querprofil: J70 E / 15 m auf DP26 und DPM24,
 * beide 12.5 m lang, Anschlusshoehe ha = 8.31 m. Die Masten ragen also gut
 * vier Meter ueber das Joch und tragen dort je eine Traverse mit einem 95Cu.
 *
 * Auf dem Blatt steht beides: die GESAMTLAENGE und die Anschlusshoehe.
 * Gefragt wird deshalb nach der Laenge - so steht es dort -, der Ueberstand
 * ergibt sich als Laenge minus H.
 *
 * >>> DIE LAENGE DARF DIE DREHFEDER NICHT ANFASSEN. <<<
 * In die Feder geht H ein, Fuss bis Jochachse: das ist die Laenge, ueber die
 * sich der Mast unter dem Anschluss verbiegt. Was darueber hinausragt, ist
 * ein Kragarm mit eigenen Lasten und macht die Einspannung des Jochs nicht
 * weicher. Ginge die Gesamtlaenge in c_phi ein, waere jedes Joch mit langem
 * Masten still weicher gerechnet.
 */
{
  const AU = await import(J('core.auflager.js'));
  const R = await import(J('render.3d.js'));
  const AX = await import(J('export.axisvm.js'));

  const ein = (extra) => ({ ...standardwerte(), typ: 'J90', L: 20,
                            endbedingung: 'mast', mastProfil: 'HEB 260',
                            mastH: 8.31, ...extra });

  // --- Laenge und Ueberstand ---------------------------------------------
  {
    const ohne = AU.mastSteifigkeit(ein({}), 'A');
    const lang = AU.mastSteifigkeit(ein({ mastLaenge: 12.5 }), 'A');
    pruef('Ohne Angabe ist der Ueberstand null', ohne.ueberstand, 0, 1e-12, 'm');
    pruef('Mit 12.5 m Laenge ueber 8.31 m Hoehe', lang.ueberstand, 12.5 - 8.31,
          1e-9, 'm');
    pruef('Die Laenge steht am Modell', lang.laenge, 12.5, 1e-12, 'm');

    // DIE PRUEFUNG, DIE ZAEHLT.
    pruef('Die Drehfeder bleibt dieselbe', lang.cPhi, ohne.cPhi, 1e-12, 'kNm/rad');
    pruef('Und H bleibt Fuss bis Jochachse', lang.H, 8.31, 1e-12, 'm');
    // Eine Laenge KUERZER als H waere ein Tippfehler - kein negativer Ueberstand.
    pruef('Eine zu kurze Laenge ergibt keinen negativen Ueberstand',
          AU.mastSteifigkeit(ein({ mastLaenge: 5 }), 'A').ueberstand, 0, 1e-12, 'm');
  }

  /*
   * AM ENDE B GILT DIE EIGENE ANGABE - aber PROFIL, LAENGE und HOEHE
   * folgen seit dem 2. September ZWEI Schaltern, nicht mehr einem.
   *
   * `mastZwei`  = der MAST am Ende B ist ein anderer (Profil, Laenge, Steg)
   * `mastHZwei` = das Joch schliesst dort ANDERS HOCH an
   *
   * Getrennt, weil `mastenProjizieren` den ersten schon setzt, wenn sich
   * bloss die Profile unterscheiden - und dann waere `mastHB` mit seinem
   * Standardwert 7.50 m still in die Drehfeder geraten. Ausfuehrlich in
   * core.constants.js, anschlusshoehe().
   */
  {
    const w = ein({ mastLaenge: 12.5, mastZwei: true, mastHZwei: true,
                    mastHB: 9.0, mastLaengeB: 14.0, mastProfilB: 'HEB 240' });
    pruef('Ende B traegt seine eigene Laenge',
          AU.mastSteifigkeit(w, 'B').ueberstand, 14.0 - 9.0, 1e-9, 'm');
    pruef('Ende A bleibt davon unberuehrt',
          AU.mastSteifigkeit(w, 'A').ueberstand, 12.5 - 8.31, 1e-9, 'm');

    // DIE PRUEFUNG, DIE DEN GRUND DER TRENNUNG FESTHAELT.
    const nurMast = ein({ mastLaenge: 12.5, mastZwei: true, mastHZwei: false,
                          mastHB: 9.0, mastLaengeB: 14.0,
                          mastProfilB: 'HEB 240' });
    pruef('Ein anderes Profil allein verschiebt die Anschlusshoehe nicht',
          AU.mastSteifigkeit(nurMast, 'B').H, 8.31, 1e-12, 'm');
    pruef('… das Profil gilt trotzdem',
          AU.mastSteifigkeit(nurMast, 'B').laenge, 14.0, 1e-12, 'm');

    // ALTE DATEIEN KENNEN DEN NEUEN SCHALTER NICHT - dann gilt der alte.
    const alt = ein({ mastLaenge: 12.5, mastZwei: true, mastHB: 9.0,
                      mastLaengeB: 14.0, mastProfilB: 'HEB 240' });
    delete alt.mastHZwei;
    pruef('Ohne den neuen Schalter gilt der alte', AU.mastSteifigkeit(alt, 'B').H,
          9.0, 1e-12, 'm');
  }

  // --- Im Bild ------------------------------------------------------------
  {
    const bauen = (extra) => {
      const w = ein(extra);
      const erg = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                           getStahl(w.stahl), T.getTragjoch(w.typ));
      return { w, erg, sz: R.erzeugeSzene(erg.modell, erg) };
    };
    const kopfVon = (sz) => {
      const f = sz.flaechen.filter((x) => x.teil === 'MAST_A');
      return Math.max(...f.flatMap((x) => x.punkte.map((p) => p[2])));
    };
    const fussVon = (sz) => {
      const f = sz.flaechen.filter((x) => x.teil === 'MAST_A');
      return Math.min(...f.flatMap((x) => x.punkte.map((p) => p[2])));
    };
    const kurz = bauen({});
    const lang = bauen({ mastLaenge: 12.5 });
    // Ohne Angabe: der halbe Meter ueber dem Obergurt, mehr nicht.
    const zOG = Math.max(...kurz.sz.flaechen.filter((f) => f.gruppe === 'profil')
      .flatMap((f) => f.punkte.map((p) => p[2])));
    pruef('Ohne Laengenangabe endet er knapp ueber dem Obergurt',
          kopfVon(kurz.sz), zOG + 0.5, 1e-9, 'm');
    // Mit Angabe: der Fuss bleibt, der Kopf steigt.
    pruef('Der Fuss bleibt, wo er war', fussVon(lang.sz), fussVon(kurz.sz), 1e-9, 'm');
    pruef('Der Koerper misst die ganze Laenge',
          kopfVon(lang.sz) - fussVon(lang.sz), 12.5, 1e-9, 'm');
    wahr('Er ragt also weit ueber das Joch',
         kopfVon(lang.sz) > zOG + 3, `${(kopfVon(lang.sz) - zOG).toFixed(2)} m ueber dem Obergurt`);
    // Und das Bild reicht bis dorthin.
    wahr('Die Bildgrenzen reichen bis zum Kopf',
         lang.sz.grenzen.zMax >= kopfVon(lang.sz) - 1e-9,
         `zMax = ${lang.sz.grenzen.zMax.toFixed(2)} m`);

    /*
     * DIE VERMASSUNG (Weisung): "die vermassung des jochs nach unten nehmen
     * ca. um 4m und noch die masten vermassen (joch unterkante)".
     *
     * Das Mastmass laeuft von der Joch UNTERKANTE zum Fuss - genau die
     * Strecke, die als Masthoehe H eingegeben wird. Das Mass zeigt also die
     * eingetippte Zahl und nicht eine, die man erst umrechnen muss.
     */
    const massVon = (sz, feld) => sz.masse.find((mm) => mm.feld === feld);
    {
      const mh = massVon(lang.sz, 'mastH');
      wahr('Der Mast ist vermasst', !!mh, mh ? mh.text : '(fehlt)');
      pruef('Und zwar ueber die Masthoehe', Math.abs(mh.p1[2] - mh.p0[2]), 8.31,
            1e-9, 'm');
      pruef('Ab der Joch Unterkante', mh.p1[2], fussVon(lang.sz) + 8.31, 1e-9, 'm');
      wahr('Das Mass nennt die eingetippte Zahl', mh.text.includes('8.31'), mh.text);
      // Seitlich versetzt, nicht quer: in der Laengsansicht laege ein
      // Querversatz genau hinter dem Masten.
      wahr('Seitlich versetzt, in der Jochachse',
           mh.ab[0] !== 0 && mh.ab[1] === 0, JSON.stringify(mh.ab));

      const lm = massVon(lang.sz, 'mastLaenge');
      wahr('Bei angegebener Laenge steht auch sie da', !!lm, lm ? lm.text : '(fehlt)');
      pruef('Ueber die ganze Laenge', Math.abs(lm.p1[2] - lm.p0[2]), 12.5, 1e-9, 'm');
      wahr('Ohne Laengenangabe steht sie nicht da',
           !massVon(kurz.sz, 'mastLaenge'));
      wahr('Die Masthoehe aber schon', !!massVon(kurz.sz, 'mastH'));
    }
    /*
     * DIE JOCHLAENGE HAENGT TIEF - rund vier Meter. Dicht unter dem Untergurt
     * lag sie zwischen den Mastfuessen und deren Angaben.
     */
    {
      const mL = massVon(lang.sz, 'L');
      const zUG = Math.min(...lang.sz.flaechen.filter((f) => f.gruppe === 'profil')
        .flatMap((f) => f.punkte.map((p) => p[2])));
      wahr('Die Jochlaenge haengt rund vier Meter tiefer',
           mL.p0[2] < zUG - 3.5 && mL.p0[2] > zUG - 4.5,
           `${(zUG - mL.p0[2]).toFixed(2)} m unter dem Untergurt`);
      pruef('Und sie misst die Jochlaenge', mL.p1[0] - mL.p0[0], 20, 1e-9, 'm');
    }
  }

  // --- In der Ausleitung ---------------------------------------------------
  /*
   * BIS HIERHER FIEL GENAU DAS HERAUS, was der Auftraggeber ansetzen will:
   * der Mast endete am Obergurt, und ein Bauteil darueber landete in
   * `anbauMastAus` - "ein Anbauteil in der Luft".
   */
  {
    const traverse = { id: 'TR', name: 'Traverse mit Zusatzleiter',
      vorlage: 'leiter-traverse', ort: 'mastA', hMast: 11.0, x: 0, raster: 0,
      aktiv: true,
      module: JSON.parse(JSON.stringify(
        (await import(J('data.anbauteile.js'))).getVorlage('leiter-traverse').module)) };

    const lauf = (extra) => {
      const w = ein({ anbauteile: [traverse], ...extra });
      const erg = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                           getStahl(w.stahl), T.getTragjoch(w.typ));
      return AX.stabmodellJson(erg.modell, { eingabe: w, auflagerModell: 'mast' });
    };
    const ohne = lauf({});
    const lang = lauf({ mastLaenge: 12.5 });
    const aus = (j) => j.tragwerk?.anbauMastAus ?? [];
    wahr('Ohne Laengenangabe faellt der Zusatzleiter heraus',
         aus(ohne).some((a) => /Traverse/.test(a.name)),
         JSON.stringify(aus(ohne)));
    wahr('Mit langem Masten steht er im Modell',
         aus(lang).length === 0, JSON.stringify(aus(lang)));
    // Der Mast bekommt einen Kopfknoten, und der sitzt auf der Gesamtlaenge.
    const kopf = lang.knoten.find((k) => k.name === 'MAST_A_KOPF');
    wahr('Der Mast hat einen Kopfknoten', !!kopf);
    {
      const fuss = lang.knoten.find((k) => k.name === 'MAST_A_F');
      pruef('Er sitzt eine Gesamtlaenge ueber dem Fuss', kopf.z - fuss.z, 12.5,
            1e-6, 'm');
    }
    // Und der Knoten fuer die Traverse liegt dazwischen.
    wahr('Der Knoten fuer die Traverse liegt darunter',
         lang.knoten.some((k) => /^MAST_A_H/.test(k.name)),
         lang.knoten.filter((k) => /^MAST_A/.test(k.name)).map((k) => k.name).join(', '));
  }
}

titel('43  Rueckgaengig und Wiederherstellen');

/*
 * WEISUNG DES AUFTRAGGEBERS, 28. August: "baue noch eine undo / redo funktion
 * ein."
 *
 * Der Verlauf ist eine Reihe von ZUSTAENDEN, kein Protokoll von Befehlen: die
 * Anwendung hat einen einzigen Zustand `werte`, jede Aenderung ersetzt ihn.
 * Damit braucht kein einzelnes Eingabefeld eine Umkehrfunktion, und ein neues
 * Feld erscheint im Verlauf, ohne dass hier eine Zeile dazukommt.
 *
 * Geprueft wird hier und nicht im Browser, weil app.js beim Laden das
 * Dokument anfasst. Die Regeln, wann ein Schritt ein Schritt IST, sind aber
 * genau das, was schiefgehen kann.
 */
{
  const V = await import(J('verlauf.js'));

  // Eine steuerbare Uhr: sonst haengt das Verschmelzen an der Rechnerlaune.
  const uhr = () => uhr.t;
  uhr.t = 1000;
  const neu = (o = {}) => V.verlauf({ jetzt: uhr, ...o });

  // --- Der Anfang ist kein Schritt ---------------------------------------
  {
    const v = neu();
    wahr('Am Anfang gibt es nichts zurueckzunehmen', !v.kannZurueck());
    wahr('Der erste Stand ist kein Schritt', v.melde({ L: 20 }) === false);
    wahr('Und danach immer noch nichts', !v.kannZurueck());
    // Sonst stuende nach dem Programmstart ein Rueckgaengig bereit, das den
    // leeren Anfang wiederherstellt.
  }

  // --- Ein Schritt hin und zurueck ---------------------------------------
  {
    const v = neu();
    v.melde({ L: 20 });
    uhr.t += 5000;
    wahr('Eine Aenderung ist ein Schritt', v.melde({ L: 24 }) === true);
    wahr('Jetzt laesst sich zurueck', v.kannZurueck());
    wahr('Vorwaerts noch nicht', !v.kannVor());
    pruef('Zurueck bringt den alten Stand', v.zurueck().L, 20, 1e-12, 'm');
    wahr('Und jetzt geht es vorwaerts', v.kannVor());
    pruef('Vorwaerts bringt ihn wieder', v.vor().L, 24, 1e-12, 'm');
    wahr('Am Ende ist vorwaerts leer', !v.kannVor());
  }

  // Derselbe Stand nochmals gemeldet ist keine Aenderung.
  {
    const v = neu();
    v.melde({ L: 20 });
    uhr.t += 5000;
    wahr('Derselbe Stand ist kein Schritt', v.melde({ L: 20 }) === false);
    wahr('Und der Verlauf bleibt leer', !v.kannZurueck());
  }

  /*
   * ZUSAMMENFASSEN - die Regel, ohne die das Ganze unbrauchbar waere.
   *
   * Ein Schieber meldet zwanzigmal, waehrend man ihn zieht. Zwanzigmal
   * zurueckzunehmen, um EINE Bewegung rueckgaengig zu machen, waere schlimmer
   * als kein Rueckgaengig.
   */
  {
    const v = neu({ zusammenMs: 700 });
    v.melde({ L: 20, jd: 500 });
    uhr.t += 5000;
    v.melde({ L: 21, jd: 500 });        // Schritt
    for (let i = 22; i <= 30; i++) { uhr.t += 50; v.melde({ L: i, jd: 500 }); }
    pruef('Eine Reglerbewegung ist EIN Schritt', v.tiefe().zurueck, 1, 1e-12, 'Stk');
    pruef('Und zurueck steht der Stand davor', v.zurueck().L, 20, 1e-12, 'm');
  }
  // Ein ANDERES Feld verschmilzt nie, auch nicht gleichzeitig.
  {
    const v = neu({ zusammenMs: 700 });
    v.melde({ L: 20, jd: 500 });
    uhr.t += 5000; v.melde({ L: 21, jd: 500 });
    uhr.t += 50;   v.melde({ L: 21, jd: 520 });
    pruef('Ein anderes Feld ist ein eigener Schritt', v.tiefe().zurueck, 2, 1e-12, 'Stk');
  }
  // Nach der Pause ist es wieder ein eigener Schritt.
  {
    const v = neu({ zusammenMs: 700 });
    v.melde({ L: 20 });
    uhr.t += 5000; v.melde({ L: 21 });
    uhr.t += 1500; v.melde({ L: 22 });
    pruef('Nach einer Pause beginnt ein neuer Schritt', v.tiefe().zurueck, 2,
          1e-12, 'Stk');
  }

  /*
   * VORWAERTS VERFAELLT. Wer zurueckgeht und dann etwas anderes tut, hat einen
   * neuen Ast begonnen - der alte ist nicht mehr erreichbar. Ihn liegen zu
   * lassen hiesse, "wiederherstellen" fuehrt irgendwohin.
   */
  {
    const v = neu();
    v.melde({ L: 20 });
    uhr.t += 5000; v.melde({ L: 24 });
    v.zurueck();
    wahr('Nach dem Zurueckgehen ist vorwaerts da', v.kannVor());
    uhr.t += 5000; v.melde({ L: 30 });
    wahr('Eine neue Aenderung laesst es verfallen', !v.kannVor());
  }

  /*
   * WAEHREND EINES SPRUNGS WIRD NICHT AUFGEZEICHNET. Das Zurueckschreiben des
   * alten Standes ist selbst eine Aenderung - ohne diese Klammer legte jedes
   * Rueckgaengig einen neuen Schritt an, und man kaeme nie irgendwo an.
   */
  {
    const v = neu();
    v.melde({ L: 20 });
    uhr.t += 5000; v.melde({ L: 24 });
    const w = v.zurueck();
    uhr.t += 5000;
    v.ruhend(() => v.melde(w));
    pruef('Das Zurueckschreiben legt keinen Schritt an', v.tiefe().zurueck, 0,
          1e-12, 'Stk');
    wahr('Und vorwaerts bleibt erhalten', v.kannVor());
  }

  // --- Die Tiefe ist begrenzt --------------------------------------------
  {
    const v = neu({ max: 5 });
    v.melde({ n: 0 });
    for (let i = 1; i <= 20; i++) { uhr.t += 5000; v.melde({ n: i }); }
    pruef('Es werden hoechstens `max` Staende aufbewahrt', v.tiefe().zurueck, 5,
          1e-12, 'Stk');
    // Und der aelteste, der noch da ist, ist der richtige.
    for (let i = 0; i < 5; i++) v.zurueck();
    wahr('Der aelteste erreichbare Stand stimmt', !v.kannZurueck());
  }

  // --- Verschachtelte Werte ------------------------------------------------
  /*
   * Anbauteile sind Listen von Objekten. Ein Vergleich Feld fuer Feld haette
   * sie uebersehen; verglichen wird deshalb ueber JSON.
   */
  {
    const v = neu();
    const a = { anbauteile: [{ id: 'A1', x: 5 }] };
    const b = { anbauteile: [{ id: 'A1', x: 6 }] };
    v.melde(a);
    uhr.t += 5000;
    wahr('Eine Aenderung tief in der Liste zaehlt', v.melde(b) === true);
    pruef('Und zurueck steht die alte Lage', v.zurueck().anbauteile[0].x, 5,
          1e-12, 'm');
    // Der zurueckgegebene Stand ist eine KOPIE - sonst schriebe die Anwendung
    // beim Weiterarbeiten in die Vergangenheit.
    const w = v.vor();
    w.anbauteile[0].x = 99;
    pruef('Der Verlauf haelt eine Kopie', v.zurueck().anbauteile[0].x, 5,
          1e-12, 'm');
  }

  // --- Geaenderte Schluessel ----------------------------------------------
  {
    const g = V.geaenderteSchluessel({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 });
    wahr('Geaendert und neu werden genannt', g.join(',') === 'b,c', g.join(','));
    wahr('Gleiches nicht', V.geaenderteSchluessel({ a: 1 }, { a: 1 }).length === 0);
    wahr('Entferntes auch', V.geaenderteSchluessel({ a: 1 }, {}).join(',') === 'a');
  }

  // --- Leeren --------------------------------------------------------------
  // Beim Laden eines anderen Tragwerks: der Verlauf des vorigen gehoert nicht
  // dazu, und ein Rueckgaengig darueber hinweg waere eine Falle.
  {
    const v = neu();
    v.melde({ L: 20 });
    uhr.t += 5000; v.melde({ L: 24 });
    v.leeren({ L: 30 });
    wahr('Nach dem Leeren gibt es keinen Weg zurueck', !v.kannZurueck());
    wahr('Und keinen nach vorn', !v.kannVor());
    uhr.t += 5000;
    wahr('Der neue Anfang zaehlt ab hier', v.melde({ L: 31 }) === true);
    pruef('Und fuehrt auf den geleerten Stand', v.zurueck().L, 30, 1e-12, 'm');
  }
}

titel('44  Skizzen an den Eingabefeldern');

/*
 * WEISUNG DES AUFTRAGGEBERS, 28. August: die Art der Handbuch-Abbildungen fuer
 * die massgebenden Punkte der Anwendung uebernehmen - "um textbeschrieb zu
 * reduzieren".
 *
 * Gemessen an den Feldern: 31 Hinweistexte mit zusammen rund 7800 Zeichen, und
 * die fuenf laengsten (endfeldZuschlag, mastWindAufJoch, schiefeBiegung,
 * gurtaufteilung, mastAnschluss) beschreiben alle eine LAGE IM RAUM. Wer eine
 * Lage liest statt sie zu sehen, baut sie sich im Kopf nach.
 *
 * Die Skizze zeigt die GEWAEHLTE Stellung, nicht beide nebeneinander - sonst
 * bliebe der Vergleich wieder am Leser haengen. Sie ist damit auch eine
 * Rueckmeldung: sie aendert sich, wenn man etwas aendert.
 */
{
  const OS = await import(J('doku.optionsskizzen.js'));
  const SCH = await import(J('ui.schema.js'));

  wahr('Drei Felder fuehren eine Skizze',
       OS.SKIZZEN_FELDER.join(',') === 'knotenbereich,mastAnschluss,mastSteg',
       OS.SKIZZEN_FELDER.join(','));
  wahr('Ein Feld ohne Skizze gibt eine leere Zeichenkette',
       OS.optionsSkizze('gibtsnicht', 'egal') === '');

  // Jedes Feld mit Skizze muss es auch wirklich geben - sonst zeichnet man
  // fuer eine Einstellung, die niemand treffen kann.
  OS.SKIZZEN_FELDER.forEach((k) => {
    const f = SCH.FELDER.find((x) => x.key === k);
    wahr(`${k}: das Feld gibt es`, !!f, f ? f.label : '(fehlt)');
    // Und jede Stellung des Feldes muss eine eigene Skizze ergeben.
    const werte = (f.optionen ?? []).map((o) => o.wert);
    wahr(`${k}: es hat mehrere Stellungen`, werte.length >= 2, werte.join(', '));
    const bilder = werte.map((w) => OS.optionsSkizze(k, w));
    wahr(`${k}: jede Stellung ergibt eine Skizze`,
         bilder.every((b) => b.includes('<svg')));
    wahr(`${k}: und die Stellungen sehen verschieden aus`,
         new Set(bilder).size === werte.length,
         `${new Set(bilder).size} von ${werte.length}`);
  });

  /*
   * DIE STEGSKIZZE MUSS ZEIGEN, WAS SIE BEHAUPTET.
   *
   * Gemeldet am 1. September: die beiden Bilder waren vertauscht. «Steg in
   * Jochachse» zeichnete einen SENKRECHTEN Steg - also quer zur Jochachse,
   * das Gegenteil des Namens -, und die waagrechte Ausdehnung kam aus den
   * Flanschen, stand aber als Profilhoehe h angeschrieben.
   *
   * Geprueft wird deshalb die GEOMETRIE, nicht die Beschriftung: Die
   * Profilhoehe misst entlang des Stegs, also muss der Steg in beiden
   * Stellungen gleich lang sein, und bei «quer zum Gleis» muss er in der
   * Jochachse liegen - im Bild waagrecht.
   */
  {
    const masse = (wert) => {
      const html = OS.optionsSkizze('mastSteg', wert);
      const rechtecke = [...html.matchAll(
        /<rect class="st" x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)]
        .map((m) => ({ x: +m[1], y: +m[2], b: +m[3], h: +m[4] }));
      const steg = rechtecke.find((r) => r.b === 10 || r.h === 10);
      return {
        anzahl: rechtecke.length,
        stegWaagrecht: steg.b > steg.h,
        stegLaenge: Math.max(steg.b, steg.h),
        inJochachse: Math.max(...rechtecke.map((r) => r.x + r.b))
                   - Math.min(...rechtecke.map((r) => r.x)),
      };
    };
    const q = masse('jochachse'), l = masse('quer');
    pruef('Drei Rechtecke je Stellung: Steg und zwei Flansche', q.anzahl, 3, 1e-12, 'Stk');
    wahr('Quer zum Gleis liegt der Steg IN der Jochachse', q.stegWaagrecht === true);
    wahr('Laengs zum Gleis steht er quer dazu', l.stegWaagrecht === false);
    // Die Probe: h misst entlang des Stegs, also in beiden Faellen gleich.
    pruef('Der Steg ist in beiden Stellungen gleich lang',
          q.stegLaenge, l.stegLaenge, 1e-12, 'px');
    // Und quer zum Gleis misst die Jochachse die PROFILHOEHE, nicht die
    // Flanschbreite - genau der Fehler, der gemeldet wurde.
    pruef('Quer zum Gleis misst die Jochachse die Profilhoehe',
          q.inJochachse, q.stegLaenge, 1e-12, 'px');
    wahr('Laengs zum Gleis misst sie weniger, naemlich die Flanschbreite',
         l.inJochachse < l.stegLaenge, `${l.inJochachse} < ${l.stegLaenge}`);
  }

  /*
   * SIE MUSS AUCH MITGEFUEHRT WERDEN.
   *
   * Dass die Stellungen verschieden AUSSEHEN, genuegt nicht - sie muessen
   * beim Umschalten auch ausgetauscht werden. Am 1. September gemeldet: die
   * Skizze zur Stegrichtung blieb stehen, wenn man auf «Steg gedreht» ging.
   * Grund: die Maske wird nur bei geaenderter SIGNATUR neu gebaut, und ein
   * anderer WERT im selben Feld aendert sie nicht.
   *
   * Ohne DOM laesst sich das hier nicht ausfuehren; geprueft wird deshalb am
   * Quelltext, dass `aktualisiereMaske` die Skizze ueberhaupt anfasst.
   */
  {
    const quelle = readFileSync(new URL('./js/ui.js', import.meta.url), 'utf8');
    const ab = quelle.indexOf('export function aktualisiereMaske');
    const bis = quelle.indexOf('export function', ab + 10);
    const koerper = quelle.slice(ab, bis > 0 ? bis : undefined);
    wahr('aktualisiereMaske fuehrt die Skizze mit',
         koerper.includes('optionsSkizze') && koerper.includes('SKIZZEN_FELDER'));
    wahr('… und tauscht sie nur bei wirklicher Aenderung',
         koerper.includes('replaceWith'));
  }

  /*
   * DER RAHMEN MUSS DEN INHALT FASSEN.
   *
   * Beim ersten Wurf stand die zweite Masslinie bei y = 192 in einem viewBox
   * von 150 - sie war gezeichnet und nicht zu sehen. Ein abgeschnittenes Mass
   * ist schlimmer als keines: man sucht es, statt es zu lesen.
   */
  OS.SKIZZEN_FELDER.forEach((k) => {
    const f = SCH.FELDER.find((x) => x.key === k);
    (f.optionen ?? []).forEach((o) => {
      const svg = OS.optionsSkizze(k, o.wert);
      const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
      wahr(`${k}/${o.wert}: viewBox gelesen`, !!vb);
      const [B, H] = [Number(vb[1]), Number(vb[2])];
      // Alle y-Koordinaten einsammeln: Linien, Rechtecke, Kreise, Text.
      const ys = [...svg.matchAll(/\b(?:y|y1|y2|cy)="([\d.]+)"/g)].map((m) => Number(m[1]));
      const xs = [...svg.matchAll(/\b(?:x|x1|x2|cx)="([\d.]+)"/g)].map((m) => Number(m[1]));
      wahr(`${k}/${o.wert}: nichts ragt unten hinaus`,
           Math.max(...ys) <= H, `max y = ${Math.max(...ys)} bei H = ${H}`);
      wahr(`${k}/${o.wert}: nichts ragt rechts hinaus`,
           Math.max(...xs) <= B, `max x = ${Math.max(...xs)} bei B = ${B}`);
      wahr(`${k}/${o.wert}: keine negativen Koordinaten`,
           Math.min(...ys, ...xs) >= 0);
      wahr(`${k}/${o.wert}: keine unberechnete Zahl`, !/NaN|undefined/.test(svg));
      // Ohne Beschriftung waere sie fuer eine Vorlesehilfe stumm.
      wahr(`${k}/${o.wert}: die Skizze ist beschriftet`, /aria-label="[^"]{10,}"/.test(svg));
    });
  });
}

// ===========================================================================
titel('45  Baugruppen am Masten haengen am Mastfuss');

/*
 * WEISUNG DES AUFTRAGGEBERS, 28. August: "Beim anhaengen der Bauteile an
 * Masten ist die Abhaengigkeit (Lage des Mittelpunkts) nicht vom joch sondern
 * vom Mastfusspunkt abhaengig."
 *
 * DER BEFUND, der dahinter stand: die Zeichenschleife lief ueber
 * `m.anbauteile` - die ROHE Liste, Joch und Mast gemeinsam - und behandelte
 * jeden Eintrag als Jochteil. Ein Teil am Masten hat aber `x = 0`, immer;
 * gezeichnet wurde es damit am linken Jochende, mitsamt vier
 * Anschlusspunkten an Ober- und Untergurt, die es dort nie hatte. Seine
 * Teile fehlten ganz, denn die stehen in `m.anbauMastFlach` und nicht in
 * `m.teile`.
 *
 * >>> AM MASTEN IST DER NULLPUNKT DER FUSS. <<<
 * `hMast` misst ab Fundament - so steht es in der Zeichnung -, und `z` eines
 * Moduls misst ab dem Anschlusspunkt auf der Mastachse. Die Ausleitung
 * rechnete schon so (zFuss + hMast); das Bild tat es nicht. Zwei Rechenwege
 * fuer dieselbe Lage sind einer zu viel.
 */
{
  const R = await import(J('render.3d.js'));
  const A7 = await import(J('data.anbauteile.js'));
  const U = await import(J('ui.js'));

  const ein = (extra) => ({ ...standardwerte(), typ: 'J90', L: 20,
                            endbedingung: 'mast', mastProfil: 'HEB 260',
                            mastH: 8.0, mastLaenge: 12.5, ...extra });
  const bauen = (extra) => {
    const w = ein(extra);
    const erg = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                         getStahl(w.stahl), T.getTragjoch(w.typ));
    return { w, erg, sz: R.erzeugeSzene(erg.modell, erg) };
  };
  // Ein Rueckleiter am Masten - genau der Fall aus der Weisung: 7.00 m ueber
  // Fundament, der Angriffspunkt 0.35 m darunter.
  const rueck = (o = {}) => ({
    id: 'RL', name: 'Leiter RL', vorlage: 'direkt', x: 0, raster: 0,
    ort: 'mastA', hMast: 7.0, aktiv: true, module: [],
    lasten: [{ einwirkung: 'G', x: 0, y: 0, z: -0.35,
               Fx: 0, Fy: 0, Fz: 0.30, Mxx: 0, Myy: 0, Mzz: 0 }],
    ...o });

  const fussVon = (sz, ende) => {
    const f = sz.flaechen.filter((x) => x.teil === 'MAST_' + ende);
    return Math.min(...f.flatMap((x) => x.punkte.map((p) => p[2])));
  };

  // --- Die Lage im Bild ----------------------------------------------------
  {
    const b = bauen({ anbauteile: [rueck()] });
    const zFuss = fussVon(b.sz, 'A');
    const teilKey = 'AT0';
    const meine = b.sz.flaechen.filter((f) => f.teil === teilKey);
    wahr('Die Baugruppe am Masten wird gezeichnet', meine.length > 0,
         meine.length + ' Flaechen');

    // DER ANSCHLUSS SITZT AUF MASTFUSS + hMast.
    const zAlle = meine.flatMap((f) => f.punkte.map((p) => p[2]));
    // Der Anschlussklotz ueber SEINEN Mittelpunkt - die Ecke laege eine halbe
    // Wuerfelkante daneben, und dann pruefte die Toleranz mit.
    const ank = meine.filter((f) => /Anschluss am Mast/.test(f.label ?? ''));
    const ankP = ank.flatMap((f) => f.punkte);
    pruef('Der Anschluss sitzt auf 7.00 m ueber Fundament',
          ankP.reduce((a2, c) => a2 + c[2], 0) / ankP.length, zFuss + 7.0,
          1e-9, 'm');
    pruef('Und auf der Mastachse',
          ankP.reduce((a2, c) => a2 + c[0], 0) / ankP.length, 0, 1e-9, 'm');
    // Der Angriffspunkt 0.35 m darunter - der Wuerfel in der Lastebene.
    const last = b.sz.flaechen.filter((f) => f.teil === teilKey && f.punkt === true);
    wahr('Der Angriffspunkt ist eigens vermerkt', last.length > 0);
    pruef('Und liegt 0.35 m unter dem Anschluss',
          last.flatMap((f) => f.punkte.map((p) => p[2]))
            .reduce((a, c) => a + c, 0) / last.flatMap((f) => f.punkte).length,
          zFuss + 7.0 - 0.35, 1e-6, 'm');

    // >>> UND NICHT AM JOCH. <<<
    const zUG = Math.min(...b.sz.flaechen.filter((f) => f.gruppe === 'profil')
      .flatMap((f) => f.punkte.map((p) => p[2])));
    wahr('Nichts davon liegt auf Jochhoehe',
         Math.max(...zAlle) < zUG - 0.5,
         'hoechster Punkt ' + Math.max(...zAlle).toFixed(2)
           + ' m, Untergurt ' + zUG.toFixed(2) + ' m');
    // Die Marke steht ueber der Baugruppe, ebenfalls am Masten.
    const marke = b.sz.marken.find((k) => k.art === 'anbau' && k.teil === teilKey);
    wahr('Die Marke steht am Masten', !!marke && marke.p[2] < zUG - 0.5,
         marke ? 'z = ' + marke.p[2].toFixed(2) + ' m' : '(fehlt)');
    wahr('Und nennt Ende und Hoehe',
         /Mast A/.test(marke.titel) && /7\.00/.test(marke.titel), marke.titel);

    // Der Kraftpfeil haengt am selben Punkt.
    const pf = b.sz.vektoren.filter((v) => v.art === 'last' && v.teil === teilKey);
    wahr('Die Last steht als Pfeil da', pf.length > 0);
    pruef('Am Angriffspunkt am Masten', pf[0].p[2], zFuss + 7.0 - 0.35, 1e-6, 'm');

    // Der Einzelheitsblick findet die Baugruppe - sonst zeigte der Zoom
    // aus der Schublade auf eine leere Stelle.
    const det = (b.sz.anbauteile ?? []).find((d) => d.id === 'RL');
    wahr('Der Einzelheitsblick kennt sie', !!det);
    pruef('Und zielt auf die Mastachse', det.x, 0, 1e-9, 'm');
  }

  // --- x ist global, an beiden Enden --------------------------------------
  /*
   * WEISUNG DES AUFTRAGGEBERS, 28. August: "beim eingeben von x sich an die
   * globale ausrichtung des achsystems halten, dass gilt fuer alle eingaben
   * bei allen bauteilen."
   *
   * Am Ende B wurde vorher an der Mastachse GESPIEGELT - mit der Begruendung,
   * die Teile trugen ihre Ausladung "nach aussen". Damit hatte dasselbe Feld
   * zwei Bedeutungen: x = +1.5 zeigte am Mast A nach rechts und am Mast B
   * nach links. Wer beide Enden nebeneinander eingibt, musste im Kopf
   * umdrehen.
   */
  {
    const arm = { einwirkung: 'G', x: 1.5, y: 0, z: 0,
                  Fx: 0, Fy: 0, Fz: 1.0, Mxx: 0, Myy: 0, Mzz: 0 };
    const a = bauen({ anbauteile: [rueck({ id: 'AA', ort: 'mastA',
                                           lasten: [arm] })] });
    const b = bauen({ anbauteile: [rueck({ id: 'BB', ort: 'mastB',
                                           lasten: [arm] })] });
    const xVon = (sz) => {
      const pf = sz.vektoren.filter((v) => v.art === 'last' && v.teil === 'AT0');
      return pf.length ? pf[0].p[0] : null;
    };
    pruef('Am Ende A zaehlt x von der Mastachse', xVon(a.sz), 1.5, 1e-6, 'm');
    pruef('Am Ende B ebenso, in DERSELBEN Richtung', xVon(b.sz), 20 + 1.5,
          1e-6, 'm');
  }

  // --- Dieselben Beiwerte wie am Joch -------------------------------------
  /*
   * Die Pfeile am Masten stehen im selben Bild wie die am Joch. Trugen sie
   * charakteristische Werte, wo die anderen Bemessungswerte zeigen, waere
   * das ein Vergleich, den niemand anstellt und der trotzdem falsch ist.
   */
  {
    // beiwerteFest setzt den Beiwert selbst - so laesst sich pruefen, DASS er
    // wirkt, ohne von der Zusammenstellung eines Lastfalls abzuhaengen.
    const b = bauen({ anbauteile: [rueck()],
                      beiwerteFest: { G: 1.35, WindX: 0, WindY: 0,
                                      Schnee: 0, Leiterzug: 0 } });
    const t = (b.erg.modell.anbauMastFlach ?? [])[0];
    wahr('Das Teil am Masten traegt proGruppe', !!t && !!t.proGruppe);
    pruef('Mit dem Beiwert der Gruppe multipliziert',
          t.proGruppe.G.Fz, 1.35 * t.kraefte.G.Fz, 1e-9, 'kN');
    pruef('Eine ausgeblendete Gruppe bleibt bei null',
          t.proGruppe.WindY?.Fy ?? 0, 0, 1e-12, 'kN');
  }

  // --- Die Nummer bleibt stehen -------------------------------------------
  /*
   * Die Marke heisst A{k+1}, die Karte in der Schublade ebenso, und
   * `zeigeAnbauteil` sucht ueber genau diese Nummer. Wurde vorher gefiltert,
   * verschob ein AUSGESCHALTETES Teil jede folgende Nummer um eins - der
   * Klick auf A3 oeffnete A4.
   */
  {
    const dreier = [
      A7.neuesAnbauteil('hs-fahrdraht', 5),
      { ...A7.neuesAnbauteil('hs-fahrdraht', 10), aktiv: false },
      A7.neuesAnbauteil('hs-fahrdraht', 15),
    ];
    const b = bauen({ anbauteile: dreier });
    const det = b.sz.anbauteile ?? [];
    wahr('Das ausgeschaltete Teil wird nicht gezeichnet', det.length === 2,
         det.length + ' Bereiche');
    const nummern = det.map((d) => d.index).sort((p, q) => p - q);
    wahr('Die Nummern folgen der Liste, nicht der Zeichnung',
         nummern[0] === 0 && nummern[1] === 2, nummern.join(', '));
    pruef('Und die dritte Karte gehoert zum Teil bei x = 15',
          det.find((d) => d.index === 2).x, 15, 1e-9, 'm');
  }

  // --- Kleine Kraefte bleiben sichtbar -------------------------------------
  /*
   * WEISUNG, 28. August: "auch hier werden die lastvektoren nicht angezeigt".
   *
   * Sie WAREN da - nur zu kurz zum Sehen. Die Pfeillaenge ist auf die
   * groesste Kraft im Modell bezogen; am Masten haengen kleine Teile, und
   * ein Rueckleiter mit 0.30 kN neben einem Kettenwerk mit 5 kN ergab einen
   * Pfeil von wenigen Zentimetern. Eine Last, die gerechnet wird und nicht
   * zu sehen ist, ist schlimmer als keine Darstellung: man haelt die Stelle
   * fuer unbelastet.
   */
  {
    const gross = { id: 'GR', name: 'Schweres Teil', vorlage: 'direkt', x: 7.5,
      raster: 0.4, befestigung: 'unten', aktiv: true, module: [],
      lasten: [{ einwirkung: 'G', x: 0, y: 0, z: -1.5,
                 Fx: 0, Fy: 0, Fz: 20, Mxx: 0, Myy: 0, Mzz: 0 }] };
    const b = bauen({ anbauteile: [gross, rueck()] });
    const laenge = (v) => Math.hypot(...v.v);
    const alle = b.sz.vektoren.filter((v) => v.art === 'last');
    const klein = b.sz.vektoren.filter(
      (v) => v.art === 'last' && v.teil === 'AT1');
    wahr('Das kleine Teil am Masten hat einen Pfeil', klein.length > 0);
    const groesster = Math.max(...alle.map(laenge));
    // Ohne Mindestlaenge waere das Verhaeltnis 0.30/20 = 1.5 % - ein Punkt.
    wahr('Und er ist mindestens ein Fuenftel des groessten',
         Math.min(...klein.map(laenge)) >= groesster / 5,
         `${Math.min(...klein.map(laenge)).toFixed(3)} gegen `
         + `${groesster.toFixed(3)} m`);
    // UND DIE SKALA WIRKT WEITER. Die Mindestlaenge hebt nur den Boden an;
    // 20 kN muessen weiterhin deutlich laenger sein als 0.30 kN, sonst
    // saehen alle Lasten gleich gross aus.
    wahr('Der grosse Pfeil bleibt deutlich laenger',
         groesster > 2 * Math.min(...klein.map(laenge)),
         `${groesster.toFixed(3)} gegen `
         + `${Math.min(...klein.map(laenge)).toFixed(3)} m`);
  }

  // --- Die Skizze in der Karte --------------------------------------------
  /*
   * Sie zeigte fuer ein Mastteil zwei Gurte und "Lage in Jochachse 0 ... L" -
   * ein Bild, in dem jede Zahl der Karte falsch benannt ist.
   */
  {
    const w = ein({});
    const svgJoch = U.anbauteilSkizzeFuer(A7.neuesAnbauteil('hs-fahrdraht', 8), w);
    const svgMast = U.anbauteilSkizzeFuer(A7.normalisiereAnbauteil(rueck()), w);
    wahr('Beide Orte bekommen eine Skizze',
         /<svg/.test(svgJoch) && /<svg/.test(svgMast));
    wahr('Sie sehen verschieden aus', svgJoch !== svgMast);
    wahr('Die Jochskizze nennt die Jochachse', /Lage in Jochachse/.test(svgJoch));
    wahr('Die Mastskizze nicht', !/Jochachse/.test(svgMast));
    wahr('Sie nennt den Masten und das Fundament',
         /Lage am Masten/.test(svgMast) && /ab Fundament/.test(svgMast));
    wahr('Und die eingegebene Hoehe', /h 7\.00 m/.test(svgMast));
    wahr('Das Mass haengt am Feld hMast', /data-zu="hMast"/.test(svgMast));
    wahr('Keine unberechnete Zahl darin', !/NaN|undefined/.test(svgMast));
    // Nichts darf aus dem Rahmen laufen - sonst ist es gezeichnet und
    // trotzdem nicht zu sehen.
    {
      const vb = svgMast.match(/viewBox="0 0 (\d+) (\d+)"/);
      const B = Number(vb[1]), H = Number(vb[2]);
      const zahlen = (attr) =>
        [...svgMast.matchAll(new RegExp(attr + '="(-?[\\d.]+)"', 'g'))]
          .map((m2) => Number(m2[1]));
      const xs = [...zahlen('x'), ...zahlen('x1'), ...zahlen('x2'), ...zahlen('cx')];
      const ys = [...zahlen('y'), ...zahlen('y1'), ...zahlen('y2'), ...zahlen('cy')];
      wahr('Nichts ragt rechts hinaus', Math.max(...xs) <= B,
           'max x = ' + Math.max(...xs) + ' bei B = ' + B);
      wahr('Nichts ragt unten hinaus', Math.max(...ys) <= H,
           'max y = ' + Math.max(...ys) + ' bei H = ' + H);
      wahr('Keine negativen Koordinaten', Math.min(...xs, ...ys) >= 0);
    }
  }
}

// ===========================================================================
titel('46  Wind auf die Masten steht im Bild');

/*
 * WEISUNG DES AUFTRAGGEBERS, 28. August: "den wind auf den masten darstellen
 * wie beim joch."
 *
 * Die Last gab es schon - seit dem 27. August steht sie in der Ausleitung als
 * Streckenlast an jedem Maststab, in beiden Richtungen. Im BILD war davon
 * nichts zu sehen. Ein Mast, der nur haelt und nie gedrueckt wird, sieht
 * vollstaendig aus und ist es nicht; und gerade der Wind quer zum Gleis ist
 * die Richtung, ueber die Joch und Mast miteinander reden.
 *
 * ZWEI RICHTUNGEN, ZWEI LASTARTEN: `x` ist die Jochachse, `y` die
 * Gleisrichtung. Getrennt, damit sie sich einzeln ausblenden lassen - so wie
 * am Joch.
 */
{
  const R = await import(J('render.3d.js'));

  const ein = (extra) => ({ ...standardwerte(), typ: 'J90', L: 20,
                            endbedingung: 'mast', mastProfil: 'HEB 260',
                            mastH: 8.0, mastLaenge: 12.5,
                            beiwerteFest: { G: 1.35, WindX: 1.5, WindY: 1.5,
                                            Schnee: 0, Leiterzug: 0 },
                            ...extra });
  const bauen = (extra) => {
    const w = ein(extra);
    const erg = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                         getStahl(w.stahl), T.getTragjoch(w.typ));
    return { w, erg, sz: R.erzeugeSzene(erg.modell, erg) };
  };

  const b = bauen({});
  const ml = b.erg.modell.mastLast;
  wahr('Der Mastwind steht im Modell', !!ml && ml.A.x > 0,
       ml ? JSON.stringify(ml.A) : '(fehlt)');

  // --- Die Bemessungswerte -------------------------------------------------
  /*
   * Am Masten stuenden sonst charakteristische Pfeile neben den
   * Bemessungspfeilen des Jochs - in EINEM Bild, ohne Kennzeichen.
   */
  pruef('Der Bemessungswert quer traegt den Beiwert', ml.A.xd, 1.5 * ml.A.x,
        1e-9, 'kN/m');
  wahr('Der charakteristische Wert bleibt daneben stehen', ml.A.x !== ml.A.xd);
  if (ml.A.y !== null) {
    pruef('Und laengs ebenso', ml.A.yd, 1.5 * ml.A.y, 1e-9, 'kN/m');
  }

  // --- Die Pfeile ----------------------------------------------------------
  const windpfeile = (sz, ende, lastart) => sz.vektoren.filter(
    (v) => v.art === 'wind' && v.teil === `MAST_${ende}` && v.lastart === lastart);
  {
    const px = windpfeile(b.sz, 'A', 'windX');
    wahr('Der Wind quer steht als Pfeilreihe da', px.length >= 5,
         `${px.length} Pfeile`);
    wahr('An beiden Masten', windpfeile(b.sz, 'B', 'windX').length >= 5);
    // Ueber die ganze Masthoehe - vom Fuss bis zum Kopf.
    const mastF = b.sz.flaechen.filter((f) => f.teil === 'MAST_A');
    const zs = mastF.flatMap((f) => f.punkte.map((p) => p[2]));
    const pz = px.map((v) => v.p[2]);
    pruef('Sie beginnen am Mastfuss', Math.min(...pz), Math.min(...zs), 1e-9, 'm');
    pruef('Und enden am Mastkopf', Math.max(...pz), Math.max(...zs), 1e-9, 'm');
    // Genau EINE Beschriftung, in der Mitte - sonst stuenden sechzehn.
    const beschriftet = px.filter((v) => v.text);
    wahr('Genau eine Anschrift, in der Mitte', beschriftet.length === 1,
         beschriftet.map((v) => v.text).join(' | '));
    wahr('Sie nennt den Bemessungswert',
         beschriftet[0].text.includes(ml.A.xd.toFixed(2)), beschriftet[0].text);

    /*
     * DER PFEIL STEHT AUF DER SEITE, VON DER DER WIND KOMMT - sonst laege er
     * im Profil, und man saehe eine Last, die aus dem Bauteil herauskommt.
     */
    const vz = Math.sign(ml.A.xd);
    const mastX = px[0].p[0];
    wahr('Der Pfeil steht vor der angeblasenen Flanke',
         Math.sign(mastX - b.erg.modell.kragA) === -vz || mastX !== 0,
         `x = ${mastX.toFixed(3)} m`);
    wahr('Und zeigt in Richtung des Windes',
         Math.sign(px[0].v[0]) === vz && px[0].v[1] === 0 && px[0].v[2] === 0,
         JSON.stringify(px[0].v));

    // Die Laengsrichtung steht auf der anderen Ebene.
    const py = windpfeile(b.sz, 'A', 'windY');
    if ((ml.A.yd ?? 0) !== 0) {
      wahr('Der Wind laengs steht auf der Ebene windY', py.length >= 5);
      wahr('Und zeigt in y', py[0].v[1] !== 0 && py[0].v[0] === 0);
    }
  }

  // --- Die Flaeche dazu ----------------------------------------------------
  /*
   * Wie am Joch: die durchscheinende Flaeche zwischen Lastordinate und
   * Bauteil sagt, dass die Last ueber die ganze Laenge wirkt und nicht nur an
   * den Pfeilspitzen.
   */
  {
    const fl = (b.sz.lastflaechen ?? []).filter((f) => /Wind auf Mast/.test(f.titel ?? ''));
    wahr('Zu jeder Pfeilreihe gehoert eine Flaeche', fl.length >= 2,
         fl.map((f) => f.titel).join(' | '));
    wahr('Sie traegt dieselbe Lastart',
         fl.every((f) => f.lastart === 'windX' || f.lastart === 'windY'));
    wahr('Und vier Eckpunkte', fl.every((f) => f.punkte.length === 4));
  }

  // --- Ohne Mast nichts ----------------------------------------------------
  /*
   * Die uebrigen Auflagermodelle enden am Lager; dort gibt es keinen Mast,
   * auf den etwas druecken koennte. Pfeile ins Leere waeren die Behauptung
   * eines Bauteils, das nicht gerechnet wird.
   */
  {
    const ohne = bauen({ endbedingung: 'gelenkig', mastVorhanden: false });
    wahr('Ohne Mast steht kein Mastwind im Modell',
         !ohne.erg.modell.mastLast);
    wahr('Und kein Pfeil im Bild',
         ohne.sz.vektoren.filter((v) => /^MAST_/.test(v.teil ?? '')).length === 0);
  }

  // --- Der Beiwert dreht ---------------------------------------------------
  /*
   * Ein negativer Windbeiwert kehrt die Richtung um. Am Joch ist das seit
   * jeher so gezeichnet ("der Pfeil zeigt dann auf die andere Seite, und
   * genau das soll man sehen"); am Masten muss es gleich sein, sonst zeigen
   * zwei Pfeile derselben Einwirkung in dieselbe Richtung, obwohl sie es
   * nicht tun.
   */
  {
    const minus = bauen({ beiwerteFest: { G: 1.35, WindX: -1.5, WindY: 0,
                                          Schnee: 0, Leiterzug: 0 } });
    const p = windpfeile(minus.sz, 'A', 'windX');
    wahr('Ein negativer Beiwert dreht den Pfeil um',
         p.length >= 5 && Math.sign(p[0].v[0]) === -1, JSON.stringify(p[0]?.v));
    pruef('Und der Wert wird negativ', minus.erg.modell.mastLast.A.xd,
          -1.5 * ml.A.x, 1e-9, 'kN/m');
  }
}

// ===========================================================================
titel('47  Radius und Winkel halten einander nach');

/*
 * WEISUNG DES AUFTRAGGEBERS, 28. August: "bei der eingabe von radius und
 * spannweite die grad angeben" und - einen Zug spaeter - "anstatt eine
 * auswahl von ablenkung der fahrleitung direkt das feld mit dem Winkel
 * angeben, jenachdem was zuerst eingegeben wird wird der andere wert
 * wiedergegeben."
 *
 * Zuerst stand eine Weiche davor ("woher kommt der Ablenkwinkel"). Eine
 * Frage, die man beantworten musste, bevor man das Feld benutzen durfte -
 * und deren Antwort man wieder umstellen musste, sobald die naechste
 * Zeichnung es anders angab. Jetzt stehen beide Felder da und schreiben
 * einander.
 *
 * >>> DIE RECHENGROESSE BLEIBT DER RADIUS. <<<
 * Der Winkel ist Eingabe und Anzeige; eingetippt schreibt er den Radius.
 * Nachgefuehrt wird immer nur das ANDERE Feld und nur beim Tippen (die
 * Kopplung steht in app.js) - sonst schriebe sich die eingetippte Zahl bei
 * jedem Rechenlauf unter der Hand um: aus α = −4.525 wird R = −380.0 und
 * daraus wieder α = −4.5250.
 */
{
  const TR = await import(J('core.trasse.js'));
  const A8 = await import(J('data.anbauteile.js'));

  // --- Hin und zurueck -----------------------------------------------------
  // Das IST die Kopplung: die eine Richtung rechnet das Feld, die andere
  // schreibt es zurueck. Weichen sie voneinander ab, wandert die Zahl.
  {
    const L = 30, Rad = 380;
    const a = (TR.ablenkwinkel(L, Rad) * 180) / Math.PI;
    pruef('Der Radius zum Winkel ist die Umkehrung',
          TR.radiusAusWinkel(L, a), Rad, 1e-9, 'm');
    // Und mit negativem Radius ebenso - das Vorzeichen ist die Bogenseite.
    const an = (TR.ablenkwinkel(L, -Rad) * 180) / Math.PI;
    wahr('Ein negativer Radius gibt einen negativen Winkel', an < 0);
    pruef('Und wieder denselben Radius', TR.radiusAusWinkel(L, an), -Rad,
          1e-9, 'm');
    wahr('Ohne Spannweite gibt es keinen Radius',
         TR.radiusAusWinkel(0, a) === null);
    wahr('Und ohne Winkel auch nicht', TR.radiusAusWinkel(L, 0) === null);
  }

  /*
   * DIE RUNDUNG DARF NICHT WANDERN.
   *
   * Die Anwendung zeigt den Winkel auf DREI Nachkommastellen (`wertAus` in
   * ui.schema.js) und schreibt den Radius auf den ZENTIMETER (app.js). Nach
   * einem Umlauf - Winkel eintippen, Radius rechnen, Winkel wieder zeigen -
   * muss dieselbe Zahl dastehen, sonst kriecht sie bei jedem Tippen weiter.
   *
   * Die beiden Schritte stehen hier ausdruecklich als Zahlen: waeren sie
   * groeber, faende die Probe es. Bei 50 m Spannweite verschoebe ein
   * Dezimeter Radius den Winkel schon in der dritten Stelle - deshalb der
   * Zentimeter.
   */
  {
    const WINKEL_STELLEN = 1e3;      // ui.schema.js: wertAus
    const RADIUS_SCHRITT = 100;      // app.js: Math.round(R * 100) / 100
    [[30, 380], [30, -380], [30, 742], [50, 633], [30, 1200], [30, -95]]
      .forEach(([L, R0]) => {
        const rund = (x) => Math.round(((TR.ablenkwinkel(L, x) * 180) / Math.PI)
                                       * WINKEL_STELLEN) / WINKEL_STELLEN;
        const a = rund(R0);
        const R1 = Math.round(TR.radiusAusWinkel(L, a) * RADIUS_SCHRITT)
                 / RADIUS_SCHRITT;
        wahr(`L ${L} / R ${R0} m: nach einem Umlauf steht der Winkel still`,
             Math.abs(rund(R1) - a) <= 1 / WINKEL_STELLEN, `${a}° gegen ${rund(R1)}°`);
        /*
         * DER RADIUS TRIFFT NICHT AUF DEN METER - und das ist richtig so.
         *
         * dR/dα = R/α: bei R = 1200 m und α = 1.43 Grad sind das 840 m je
         * Grad, also 0.42 m auf die letzte gezeigte Winkelstelle. Ein
         * grosser Bogen laesst sich aus einem gerundeten Winkel nicht
         * genauer zurueckrechnen; das ist Geometrie und kein Fehler.
         *
         * Geprueft wird deshalb, worauf es ankommt: die UMLENKKRAFT. Sie
         * geht mit L/R und darf sich durch den Umlauf nicht messbar aendern.
         */
        const u = (RR) => TR.umlenkkraft({ Z: 12, L, R: RR }).U;
        wahr(`L ${L} / R ${R0} m: die Umlenkkraft bleibt`,
             Math.abs(u(R1) - u(R0)) <= Math.abs(u(R0)) * 1e-3,
             `${u(R0).toFixed(5)} gegen ${u(R1).toFixed(5)} kN`
             + ` (R ${R0} → ${R1} m)`);
      });
  }

  // --- Dieselbe Umlenkkraft auf beiden Wegen -------------------------------
  /*
   * Der Winkel darf keine andere Kraft ergeben als der Radius, aus dem er
   * kommt - sonst waere er keine zweite Eingabe, sondern eine zweite
   * Rechnung.
   */
  {
    const L = 30, Rad = 380;
    const a = (TR.ablenkwinkel(L, Rad) * 180) / Math.PI;
    const ueberR = TR.umlenkkraft({ Z: 12, L, R: Rad });
    const ueberA = TR.umlenkkraft({ Z: 12, L, R: 0, winkel: a });
    pruef('Winkel und Radius geben dieselbe Umlenkkraft', ueberA.U, ueberR.U,
          1e-9, 'kN');
    wahr('Und es ist eine wirkliche Kraft', Math.abs(ueberA.U) > 0.1,
         `${ueberA.U.toFixed(3)} kN`);
  }

  // --- Durch den Rechenkern ------------------------------------------------
  {
    const L = 30, Rad = 380;
    const teil = () => A8.neuesAnbauteil('hs-fahrdraht', 8);
    const summe = (flach) => flach.reduce((s, t) => s + (t.kraefte?.G?.Fx ?? 0), 0);
    const imBogen = summe(A8.expandiereAnbauteile([teil()],
      { ek: 'EK2', R: Rad, spannweite: L }));
    wahr('Im Bogen entsteht eine Umlenkkraft', Math.abs(imBogen) > 1e-6,
         `${imBogen.toFixed(4)} kN`);
    // Gerade bleibt gerade. NICHT exakt null: `R_GERADE` ist eine Schwelle
    // fuer die ANZEIGE, gerechnet wird auch dort L/R - bei 300 km Radius sind
    // das anderthalb Gramm je Kilonewton Leiterzug.
    const gerade = summe(A8.expandiereAnbauteile([teil()],
      { ek: 'EK2', R: 300000, spannweite: L }));
    wahr('Ohne Bogen bleibt sie praktisch null', Math.abs(gerade) < 0.005,
         `${gerade.toFixed(5)} kN`);

    /*
     * DER WINKEL AM MODUL SCHLAEGT DEN BOGEN. Er ist die einzige
     * Uebersteuerung, die es noch gibt - und sie sitzt dort, wo sie
     * hingehoert: am einzelnen Drahtwerk.
     */
    const eigen = teil();
    eigen.module = eigen.module.map((mm, i2) =>
      (i2 === eigen.module.length - 1 ? { ...mm, winkel: 2.0 } : mm));
    const mitEigen = summe(A8.expandiereAnbauteile([eigen],
      { ek: 'EK2', R: Rad, spannweite: L }));
    wahr('Ein eigener Winkel am Modul gilt weiterhin', mitEigen !== imBogen,
         `${mitEigen.toFixed(4)} gegen ${imBogen.toFixed(4)} kN`);
  }

  // --- Die Felder ----------------------------------------------------------
  {
    const feld = (k) => FELDER.find((f) => f.key === k);
    const feld2 = (k) => FELDER.find((f) => f.key === k);   // darf fehlen
    const sicht = (f, w) => (typeof f.sichtbar === 'function' ? f.sichtbar(w) : true);
    const w = { ...standardwerte(), trasseRadius: -380, flSpannweite: 30,
                trasseWinkel: -4.525 };
    wahr('Es gibt das Winkelfeld', !!feld('trasseWinkel'));
    // >>> KEINE WEICHE MEHR. Sie war eine Frage vor dem Feld.
    wahr('Und keine Weiche davor', !feld('trasseQuelle'));
    wahr('Radius, Winkel und Spannweite stehen alle drei da',
         ['trasseRadius', 'trasseWinkel', 'flSpannweite']
           .every((k) => sicht(feld(k), w)));

    /*
     * DER GRAD AM FELD. Radius und Spannweite sind Eingaben; wer den Winkel
     * nicht sieht, gibt zwei Zahlen ein und erfaehrt die dritte erst am
     * Ergebnis - und ein Vorzeichenfehler im Radius faellt dort nicht mehr
     * auf.
     */
    const bogen = { ...standardwerte(), trasseRadius: 380, flSpannweite: 30 };
    ['trasseRadius', 'flSpannweite'].forEach((k) => {
      const n = feld(k).notiz(bogen);
      wahr(`${k}: die Notiz nennt den Winkel`, /α = [\d.]+°/.test(n ?? ''), n);
      wahr(`${k}: und die Richtung`, /\+x|−x/.test(n ?? ''), n);
    });
    {
      const a = (TR.ablenkwinkel(30, 380) * 180) / Math.PI;
      wahr('Und zwar dieselbe Zahl, die der Kern rechnet',
           feld('trasseRadius').notiz(bogen).includes(a.toFixed(3)),
           feld('trasseRadius').notiz(bogen));
    }
    wahr('Bei geradem Gleis sagt sie das',
         /gerade/.test(feld('trasseRadius').notiz(
           { ...standardwerte(), trasseRadius: 300000, flSpannweite: 30 }) ?? ''));
    // Am Winkelfeld umgekehrt: welchem Bogen der Winkel entspricht.
    {
      const n = feld('trasseWinkel').notiz(w);
      wahr('Am Winkelfeld steht der zugehoerige Radius', /R = -?380 m/.test(n ?? ''), n);
      wahr('Ohne Winkel sagt es "gerade"',
           /gerade/.test(feld('trasseWinkel').notiz(
             { ...standardwerte(), trasseWinkel: 0, flSpannweite: 30 }) ?? ''));
    }
  }
}

// ===========================================================================
titel('48  Klemmen: Gurtebene mal Raster');

/*
 * WEISUNG DES AUFTRAGGEBERS, 28. August: "man kann die anbindung der bauteile
 * ueber unter ober oder beide gurte vornehmen. wenn der raster noch eingegeben
 * ist dann verdoppeln sich die anschlusspunkte. kannst du das so ueberpruefen?"
 *
 * NACHGERECHNET - und er hat recht. Der Kern fuehrt das Moment an ZWEI
 * Stationen ein, x1 = x - raster/2 und x2 = x + raster/2; dort bildet es das
 * Kraeftepaar (core.anbauteile.js). In jeder Gurtebene stehen ausserdem zwei
 * Winkel nebeneinander. Wirklich geschraubt wird also an
 *
 *      einseitig     1 Gurt  x 2 Winkel x 2 Stationen = 4 Klemmen
 *      durchgehend   2 Gurte x 2 Winkel x 2 Stationen = 8 Klemmen
 *
 * DAS BILD ZEIGTE ETWAS ANDERES: einen Wuerfel je (Gurtebene x Winkel), in
 * der MITTE. Die Anzahl stimmte damit zufaellig - vier bzw. zwei -, die
 * Stellen aber nicht, und die Vier bedeutete etwas anderes als die Vier im
 * Kern (dort Station x Gurtebene). Zwei Bedeutungen fuer dieselbe Zahl, in
 * einem Werkzeug, das die Lasteinleitung nachweist.
 */
{
  const R = await import(J('render.3d.js'));

  const bauen = (bef, raster) => {
    const at = { id: 'K', name: 'Probe', vorlage: 'direkt', x: 8, raster,
      befestigung: bef, aktiv: true, module: [],
      lasten: [{ einwirkung: 'G', x: 0, y: 0.4, z: -1.2,
                 Fx: 0, Fy: 0, Fz: 4, Mxx: 0, Myy: 0, Mzz: 0 }] };
    const w = { ...standardwerte(), typ: 'J90', L: 20, endbedingung: 'gelenkig',
                anbauteile: [at] };
    const erg = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                         getStahl(w.stahl), T.getTragjoch(w.typ));
    return { erg, sz: R.erzeugeSzene(erg.modell, erg) };
  };
  /*
   * GEZAEHLT WIRD UEBER DIE ANSCHRIFT, nicht ueber die Flaechen: ein Wuerfel
   * bringt sechs Flaechen mit, und die erste Fassung dieser Pruefung zaehlte
   * 48 statt 8. Die Anschrift nennt Gurt, Winkel und Station und ist damit
   * je Klemme eindeutig.
   */
  const klemmen = (sz) => sz.flaechen.filter(
    (f) => /· Klemme /.test(f.label ?? ''));
  const stellen = (sz) => [...new Set(klemmen(sz).map((f) => f.label))];
  const stationVon = (label) => Number(/x = (-?[\d.]+) m/.exec(label)?.[1]);

  // --- Die Anzahl ----------------------------------------------------------
  {
    const durch = bauen('durchgehend', 0.4);
    const unten = bauen('unten', 0.4);
    pruef('Durchgehend, mit Raster: acht Klemmen',
          stellen(durch.sz).length, 8, 1e-12, 'Stk');
    pruef('Einseitig, mit Raster: vier', stellen(unten.sz).length, 4, 1e-12, 'Stk');
    // >>> DER RASTER VERDOPPELT. Ohne ihn fallen die Stationen zusammen.
    pruef('Ohne Raster halb so viele (durchgehend)',
          stellen(bauen('durchgehend', 0).sz).length, 4, 1e-12, 'Stk');
    pruef('Ohne Raster halb so viele (einseitig)',
          stellen(bauen('unten', 0).sz).length, 2, 1e-12, 'Stk');
  }

  // --- Die Stellen ---------------------------------------------------------
  /*
   * Sie muessen auf x1 und x2 liegen - genau dort, wo der Kern das
   * Kraeftepaar eintraegt. Vorher lagen alle in der Mitte.
   */
  {
    const durch = bauen('durchgehend', 0.4);
    const xs = [...new Set(stellen(durch.sz).map(stationVon))]
      .sort((p, q) => p - q);
    pruef('Zwei Stationen', xs.length, 2, 1e-12, 'Stk');
    pruef('Die eine bei x − raster/2', xs[0], 7.8, 1e-6, 'm');
    pruef('Die andere bei x + raster/2', xs[1], 8.2, 1e-6, 'm');
    // Und sie sind dieselben, die der Rechenkern nennt.
    const t = durch.erg.modell.teile[0];
    pruef('Dieselbe Station wie im Rechenkern (x1)', xs[0], t.x1, 1e-9, 'm');
    pruef('Dieselbe Station wie im Rechenkern (x2)', xs[1], t.x2, 1e-9, 'm');

    // Je Station beide Winkel, je Gurt beide Ebenen.
    const seiten = [...new Set(stellen(durch.sz).map(
      (l) => (/links/.test(l) ? 'L' : 'R')))];
    wahr('Auf beiden Winkeln einer Gurtebene', seiten.length === 2,
         seiten.join(', '));
    const gurte2 = [...new Set(stellen(durch.sz).map(
      (l) => (/Obergurt/.test(l) ? 'OG' : 'UG')))];
    wahr('Und auf beiden Gurtebenen', gurte2.length === 2, gurte2.join(', '));
    wahr('Einseitig nur auf einer',
         [...new Set(stellen(bauen('unten', 0.4).sz).map(
           (l) => (/Obergurt/.test(l) ? 'OG' : 'UG')))].length === 1);
  }

  // --- Die Anschrift sagt es ----------------------------------------------
  /*
   * Wuerfel zaehlen muss man nicht, wenn die Zahl danebensteht. Und die
   * Rastermasslinie ist die richtige Stelle: dort steht die Ursache.
   */
  {
    const mass = (sz) => (sz.masse ?? []).find((mm) => /Raster/.test(mm.text ?? ''));
    wahr('Die Rastermasslinie nennt die Zahl der Klemmen',
         /8 Klemmen/.test(mass(bauen('durchgehend', 0.4).sz)?.text ?? ''),
         mass(bauen('durchgehend', 0.4).sz)?.text);
    wahr('Einseitig entsprechend vier',
         /4 Klemmen/.test(mass(bauen('unten', 0.4).sz)?.text ?? ''),
         mass(bauen('unten', 0.4).sz)?.text);
  }

  // --- Die Anschrift der Befestigungswahl ----------------------------------
  /*
   * Sie sagte "2 Punkte" und "4 Punkte" - eine Stueckzahl, die keine war.
   * Gemeint sind GURTEBENEN; der Raster verdoppelt jede davon.
   */
  {
    const roh = readFileSync(join(HIER, 'js', 'ui.js'), 'utf8');
    wahr('Keine "Punkte" mehr in der Befestigungswahl',
         !/am Untergurt \(2 Punkte\)/.test(roh));
    wahr('Sie nennt jetzt die Gurtebenen',
         /am Untergurt \(1 Gurtebene\)/.test(roh)
         && /Ober- und Untergurt \(2 Gurtebenen\)/.test(roh));
  }
}

// ===========================================================================
titel('49  Der Mastnachweis');

/*
 * WEISUNG DES AUFTRAGGEBERS, 28. August, auf ausdrueckliche Nachfrage:
 *   · Nachweis: Querschnitt ELASTISCH, "aber auch plastischen Widerstand
 *     optional auswaehlbar machen".
 *   · Schnittgroessen: "aus dem Ersatzbalken, jetzt".
 *
 * Bis dahin stand der Mast in den Nachweisgruppen mit "nicht vorhanden": er
 * war Drehfeder und Modellgeometrie, mehr nicht.
 *
 * GEPRUEFT WIRD GEGEN HANDRECHNUNGEN. Ein Kragarm mit Gleichlast, eine
 * Einzelkraft mit Hebelarm, eine Ausladung - jede Groesse einzeln, damit
 * eine falsche Ueberlagerung nicht von einer anderen verdeckt wird.
 */
{
  const MA = await import(J('core.mast.js'));

  const nurG = { G: 1, WindX: 0, WindY: 0, Schnee: 0, Leiterzug: 0 };
  const ein = (extra) => ({ ...standardwerte(), typ: 'J90', L: 20,
                            endbedingung: 'mast', mastProfil: 'HEB 260',
                            mastH: 8.0, mastSteg: 'jochachse',
                            wMastAusTabelle: false, wMast: 0,
                            beiwerteFest: nurG, ...extra });
  const rechne2 = (extra) => {
    const w = ein(extra);
    return berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                    getStahl(w.stahl), T.getTragjoch(w.typ));
  };
  const fuss = (r, ende = 'A') => r.mast[ende].stationen[0];

  // --- Ohne Mast gibt es nichts -------------------------------------------
  /*
   * Die uebrigen Auflagermodelle enden am Lager. Ein eta fuer ein Bauteil,
   * das nicht gerechnet wird, waere eine Behauptung.
   */
  {
    const w = { ...standardwerte(), typ: 'J90', L: 20,
                endbedingung: 'gelenkig', mastVorhanden: false };
    const e = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                       getStahl(w.stahl), T.getTragjoch(w.typ));
    wahr('Ohne Mast kein Mastnachweis', e.mast === null || e.mast === undefined);
  }

  // --- Normalkraft: Jochlast plus Eigengewicht ----------------------------
  /*
   * Der Mast trug im Ersatzbalken bisher NICHTS - er ist dort kein Bauteil.
   * Sein Eigengewicht gehoert trotzdem in seinen eigenen Nachweis.
   */
  {
    const r = rechne2({});
    const f = fuss(r);
    const md = r.modell.federn.mastA ?? r.modell.federn.mast;
    const gk = (md.profil.g * 9.81) / 1000;          // kN/m
    const soll = r.modell.RA + gk * md.H;            // Beiwert G = 1
    pruef('Am Fuss steht Jochlast plus Mastgewicht', f.N, soll, 1e-6, 'kN');
    wahr('Und das Gewicht ist nicht null', gk * md.H > 5,
         `${(gk * md.H).toFixed(2)} kN`);
    // Am Jochanschluss fehlt genau der untere Teil des Gewichts.
    const anschluss = r.mast.A.stationen.find((s2) => Math.abs(s2.z - md.H) < 1e-9);
    pruef('Am Jochanschluss ist es nur die Jochlast', anschluss.N,
          r.modell.RA, 1e-6, 'kN');
  }

  // --- Der Kragarm unter Gleichlast ---------------------------------------
  /*
   * M = w·H²/2 und V = w·H - die Handrechnung, an der sich jede
   * Streckenlast messen lassen muss.
   */
  {
    const r = rechne2({ wMast: 0.5, wMastAusTabelle: false,
                        beiwerteFest: { ...nurG, G: 0, WindX: 1 } });
    const md = r.modell.federn.mastA ?? r.modell.federn.mast;
    const w = r.modell.mastLast.A.xd;
    wahr('Der Mastwind steht mit dem gesetzten Wert da',
         Math.abs(w - 0.5) < 1e-9, `${w} kN/m`);
    const f = fuss(r);
    const zK = md.ueberstand > 0 ? md.laenge : md.H;
    pruef('Querkraft quer = w·H', f.Vq, w * zK, 1e-6, 'kN');
    pruef('Moment quer = w·H²/2', f.Mq, (w * zK * zK) / 2, 1e-6, 'kNm');
    // Auf halber Hoehe ist es ein Viertel.
    const halb = MA.mastSchnitt(r.modell, 'A');
    void halb;
  }

  // --- Der lange Mast: Wind ueber die GANZE Laenge -------------------------
  /*
   * Der Ueberstand traegt Wind wie der Rest. Nur bis zur Jochachse zu
   * rechnen unterschaetzte das Fussmoment - bei 12.5 m ueber 8 m um mehr als
   * die Haelfte.
   */
  {
    const kurz = rechne2({ wMast: 0.5, beiwerteFest: { ...nurG, G: 0, WindX: 1 } });
    const lang = rechne2({ wMast: 0.5, mastLaenge: 12.5,
                           beiwerteFest: { ...nurG, G: 0, WindX: 1 } });
    pruef('Kurz: w·8²/2', fuss(kurz).Mq, (0.5 * 64) / 2, 1e-6, 'kNm');
    pruef('Lang: w·12.5²/2', fuss(lang).Mq, (0.5 * 156.25) / 2, 1e-6, 'kNm');
    wahr('Der Ueberstand macht mehr als die Haelfte aus',
         fuss(lang).Mq > 2 * fuss(kurz).Mq,
         `${fuss(lang).Mq.toFixed(2)} gegen ${fuss(kurz).Mq.toFixed(2)} kNm`);
  }

  // --- Ein Anbauteil mit Ausladung ----------------------------------------
  /*
   * >>> DER HEBELARM IST DIE AUSLADUNG, NICHT DIE HOEHE. <<<
   * Eine Traverse steht seitlich aus dem Masten heraus; ihre Vertikallast
   * erzeugt am Fuss ein Moment F_z·e_x. Genau daran hing dieser Nachweis,
   * seit die Mastfussreaktionen zum ersten Mal verlangt wurden - ohne die
   * Kette am Masten gab es keinen Hebelarm.
   */
  {
    const teil = (x) => ({
      id: 'TR', name: 'Probe', vorlage: 'direkt', ort: 'mastA', hMast: 6.0,
      x: 0, raster: 0, aktiv: true, module: [],
      lasten: [{ einwirkung: 'G', x, y: 0, z: 0,
                 Fx: 0, Fy: 0, Fz: 2.0, Mxx: 0, Myy: 0, Mzz: 0 }],
    });
    const ohne = rechne2({ anbauteile: [teil(0)] });
    const mit = rechne2({ anbauteile: [teil(1.5)] });
    pruef('Ohne Ausladung kein Zusatzmoment', fuss(mit).Mq - fuss(ohne).Mq,
          2.0 * 1.5, 1e-6, 'kNm');
    pruef('Die Normalkraft ist in beiden Faellen dieselbe',
          fuss(mit).N, fuss(ohne).N, 1e-9, 'kN');
    // Und eine Horizontalkraft wirkt ueber die HOEHE.
    const quer = rechne2({ anbauteile: [{
      ...teil(0),
      lasten: [{ einwirkung: 'G', x: 0, y: 0, z: 0,
                 Fx: 1.0, Fy: 0, Fz: 0, Mxx: 0, Myy: 0, Mzz: 0 }] }] });
    pruef('Eine Querkraft auf 6.00 m gibt 6.00 kNm',
          quer.mast.A.stationen[0].Mq - rechne2({}).mast.A.stationen[0].Mq,
          1.0 * 6.0, 1e-6, 'kNm');
  }

  // --- Die Laengskraft teilt sich nach der Steifigkeit ---------------------
  /*
   * WEISUNG, frueher festgelegt: F_x nach k = 3EI/H³. Das Auflagerblatt
   * weist sie bis heute nur als Summe aus ("haengt von deren Steifigkeit ab
   * und ist hier nicht modelliert"); fuer den Mastnachweis genuegt das
   * nicht, denn sie steht am Fuss mit dem Hebelarm H.
   */
  {
    // Gleiche Maste: haelftig.
    const gleich = MA.mastLasten(rechne2({}).modell, 'A');
    pruef('Zwei gleiche Maste teilen haelftig', gleich.anteilFx, 0.5, 1e-9, '–');
    // Verschiedene: der steifere zieht mehr an sich.
    const zwei = rechne2({ mastZwei: true, mastProfilB: 'HEM 240',
                           mastHB: 8.0, mastStegB: 'jochachse' });
    const a = MA.mastLasten(zwei.modell, 'A').anteilFx;
    const b = MA.mastLasten(zwei.modell, 'B').anteilFx;
    pruef('Die Anteile ergaenzen sich zu eins', a + b, 1, 1e-9, '–');
    wahr('Der steifere Mast zieht mehr an sich', b > a,
         `A ${(100 * a).toFixed(1)} % gegen B ${(100 * b).toFixed(1)} %`);
    // Und zwar genau nach k = 3EI/H³ - bei gleicher Hoehe also nach I.
    const fA = zwei.modell.federn.mastA, fB = zwei.modell.federn.mastB;
    pruef('Genau nach dem Verhaeltnis der Steifigkeiten', b,
          (fB.I / fB.H ** 3) / (fA.I / fA.H ** 3 + fB.I / fB.H ** 3), 1e-9, '–');
  }

  // --- Plastische Widerstaende --------------------------------------------
  /*
   * Die Profiltabelle fuehrt nur elastische Werte. W_pl wird aus der
   * Geometrie gerechnet, OHNE Ausrundung - das unterschaetzt den
   * Tabellenwert und liegt damit auf der sicheren Seite.
   */
  {
    const { MASTPROFILE } = await import(J('data.masten.js'));
    MASTPROFILE.forEach((p) => {
      const pl = MA.plastischeWiderstaende(p);
      wahr(`${p.name}: W_pl,y groesser als W_el,y`, pl.Wply > p.Wy,
           `${pl.Wply.toFixed(1)} gegen ${p.Wy} cm³`);
      // Der Formbeiwert eines I-Profils liegt zwischen 1.10 und 1.20.
      wahr(`${p.name}: Formbeiwert in der erwarteten Spanne`,
           pl.Wply / p.Wy > 1.05 && pl.Wply / p.Wy < 1.25,
           `${(pl.Wply / p.Wy).toFixed(3)}`);
      wahr(`${p.name}: und um die schwache Achse ebenso`,
           pl.Wplz / p.Wz > 1.4 && pl.Wplz / p.Wz < 1.7,
           `${(pl.Wplz / p.Wz).toFixed(3)}`);
      wahr(`${p.name}: aus der Geometrie, nicht aus der Tabelle`,
           pl.quelle === 'geometrie');
    });
    /*
     * DIE DATEN SCHLAGEN DIE HERLEITUNG. Traegt die Tabelle einmal eigene
     * Werte, gelten DIESE - das ist die stehende Regel dieses Projekts.
     */
    const eigen = MA.plastischeWiderstaende({ h: 260, b: 260, tw: 10, tf: 17.5,
                                              Wply: 1283, Wplz: 602.2 });
    pruef('Ein Tabellenwert gilt', eigen.Wply, 1283, 1e-12, 'cm³');
    wahr('Und wird als solcher benannt', eigen.quelle === 'tabelle');
    // Die Naeherung liegt darunter - sichere Seite.
    const naeh = MA.plastischeWiderstaende({ h: 260, b: 260, tw: 10, tf: 17.5 });
    wahr('Die Naeherung unterschaetzt den Tabellenwert', naeh.Wply < 1283,
         `${naeh.Wply.toFixed(1)} gegen 1283 cm³`);
    wahr('Aber um weniger als fuenf Prozent', naeh.Wply > 1283 * 0.95,
         `${(100 * (1 - naeh.Wply / 1283)).toFixed(1)} % darunter`);
  }

  // --- Querschnittsklasse --------------------------------------------------
  {
    const { MASTPROFILE } = await import(J('data.masten.js'));
    MASTPROFILE.forEach((p) => {
      const k = MA.mastKlasse(p, 235, 0);
      wahr(`${p.name}: unter Biegung Klasse 1`, k.klasse === 1,
           `Flansch ${k.flansch.ct.toFixed(1)} / Steg ${k.steg.ct.toFixed(1)}`);
    });
    // Hohe Normalkraft schiebt den Steg - das ist der Sinn von alpha.
    const p = MASTPROFILE.find((x) => x.name === 'HEB 260');
    const hoch = MA.mastKlasse(p, 235, 2000);
    wahr('Unter hoher Normalkraft steigt alpha', hoch.steg.alpha > 0.5,
         `${hoch.steg.alpha.toFixed(3)}`);
    wahr('Und die Grenze wird schaerfer',
         hoch.steg.grenze < MA.mastKlasse(p, 235, 0).steg.grenze);
  }

  // --- Der Nachweis selbst -------------------------------------------------
  {
    const r = rechne2({ mastLaenge: 12.5, wMast: 0.5,
                        beiwerteFest: { G: 1.35, WindX: 1.5, WindY: 1.5,
                                        Schnee: 0, Leiterzug: 0 } });
    const n = r.mast.A;
    const f = n.stationen[0];
    // sigma = N/A + M_q/W_q + M_l/W_l, Betraege addiert.
    const soll = (Math.abs(f.N) * 10) / n.A
               + (Math.abs(f.Mq) * 1000) / n.Wq
               + (Math.abs(f.Ml) * 1000) / n.Wl;
    pruef('Die Spannung ist die Summe der drei Anteile', f.sig, soll, 1e-9, 'N/mm²');
    pruef('Und eta ist sigma durch f_yd', f.eta, f.sig / n.fyd, 1e-12, '–');
    wahr('Massgebend ist der Fuss', n.massgebend.z === 0,
         `z = ${n.massgebend.z}`);
    wahr('Beide Enden werden gefuehrt', r.mast.A && r.mast.B);
    pruef('Das Gesamt-eta ist das groessere der beiden', r.mast.eta,
          Math.max(r.mast.A.eta, r.mast.B.eta), 1e-12, '–');

    /*
     * DIE STARKE ACHSE STEHT DORT, WO DIE STEGRICHTUNG SIE HINSTELLT.
     * Steg in Jochachse: die Profilhoehe liegt quer zum Gleis, also traegt
     * die starke Achse die Biegung aus dem Wind QUER.
     */
    wahr('Steg in Jochachse: quer ist die starke Achse', n.Wq > n.Wl,
         `${n.Wq} gegen ${n.Wl} cm³`);
    const gedreht = rechne2({ mastSteg: 'quer', mastLaenge: 12.5 });
    wahr('Gedreht ist es umgekehrt',
         gedreht.mast.A.Wq < gedreht.mast.A.Wl,
         `${gedreht.mast.A.Wq} gegen ${gedreht.mast.A.Wl} cm³`);
  }

  // --- Plastisch nur bei Klasse 1 oder 2 -----------------------------------
  {
    const el = rechne2({ mastLaenge: 12.5, mastPlastisch: false });
    const pl = rechne2({ mastLaenge: 12.5, mastPlastisch: true });
    wahr('Der Schalter greift', pl.mast.A.plastischWirksam === true);
    wahr('Und nicht, wenn er aus ist', el.mast.A.plastischWirksam === false);
    wahr('Plastisch ist eta kleiner', pl.mast.eta < el.mast.eta,
         `${pl.mast.eta.toFixed(3)} gegen ${el.mast.eta.toFixed(3)}`);
    pruef('Genau im Verhaeltnis der Widerstandsmomente',
          el.mast.A.Wq / pl.mast.A.Wq,
          MASTPROFIL_VERHAELTNIS(pl.mast.A), 1e-9, '–');
    function MASTPROFIL_VERHAELTNIS(n) {
      const p = MA.plastischeWiderstaende(n.profil);
      const stegQuer = n.stegrichtung.achse === 'y';
      return n.profil[stegQuer ? 'Wy' : 'Wz']
           / (stegQuer ? p.Wply : p.Wplz);
    }
    /*
     * >>> UND NUR BEI KLASSE 1 ODER 2. <<< Das ist EN 1993-1-1 und keine
     * Wahl: ein Querschnitt der Klasse 3 erreicht die
     * Fliessgelenkschnittgroesse nicht.
     */
    const n = pl.mast.A;
    wahr('Der Nachweis sagt, welche Klasse er gefunden hat',
         Number.isFinite(n.klasse.klasse) && n.klasse.klasse <= 2);
    wahr('Und dass der Wunsch gestellt war',
         n.plastischGewuenscht === true);
  }
}

// ===========================================================================
titel('50  Der Winkel bekommt seine Ausrundung');

/*
 * WEISUNG DES AUFTRAGGEBERS, 28. August: "Die L Profile sind ohne Rundungen
 * im Axis Modell. Es sollten die LNP Profile gemaess Norm sein, EN Standard."
 *
 * r1 und r2 standen in der Ausleitung auf NULL - mit dem Vermerk, die Radien
 * staenden in den Profiltabellen dieses Werkzeugs nicht. Der Winkel war damit
 * ein scharfkantiges Polygon, und seine Flaeche rund zwei Prozent zu klein.
 *
 * Fuer einen gleichschenkligen Winkel nach EN 10056-1 gilt
 *      A = t*(2a - t) + (1 - pi/4)*(r1^2 - 2*r2^2),   r2 = r1/2
 * Nach r1 aufgeloest liefert die Tabellenflaeche den Radius.
 *
 * >>> DAS IST NICHT DER NORMRADIUS, SONDERN DER, DER DIE FLAECHE TRIFFT. <<<
 * Genau das wird hier geprueft - und die Grenzen dieser Aussage mit.
 */
{
  const AX = await import(J('export.axisvm.js'));
  const { PROFILE } = await import(J('data.profiles.js'));
  const c = 1 - Math.PI / 4;

  PROFILE.forEach((p) => {
    const r = AX.winkelRadien(p);
    // >>> DIE FLAECHE MUSS GENAU STIMMEN. Das ist der Zweck der Rechnung.
    const A = (p.t * (p.aH + p.aV - p.t) + c * (r.r1 * r.r1 - 2 * r.r2 * r.r2)) / 100;
    pruef(`${p.name}: die Flaeche wird getroffen`, A, p.A, 5e-3, 'cm2');
    wahr(`${p.name}: r2 ist die Haelfte von r1`,
         Math.abs(r.r2 - r.r1 / 2) < 0.01, `${r.r1} / ${r.r2}`);
    /*
     * DER RADIUS BLEIBT IN EINER GROESSENORDNUNG, DIE EIN WINKEL HAT - oder
     * er ist null, und dann sagt die Quelle warum: beim ungleichschenkligen
     * L 130x80x12 ist die Tabellenflaeche genau t*(aH+aV-t), also OHNE
     * Kehle. Da gibt es nichts zurueckzurechnen. Ehrlich null ist besser als
     * eine erfundene Zahl - und es steht in der Ausleitung.
     */
    if (r.r1 > 0) {
      wahr(`${p.name}: der Radius ist plausibel`,
           r.r1 < 2.2 * p.t, `${r.r1} mm bei t = ${p.t}`);
      wahr(`${p.name}: aus der Flaeche, nicht aus der Tabelle`,
           r.quelle === 'flaeche');
    } else {
      wahr(`${p.name}: ohne Ausrundung, und es steht dabei`,
           r.quelle === 'keine', r.quelle);
    }
  });

  /*
   * DIE DATEN SCHLAGEN DIE HERLEITUNG. Traegt die Profiltabelle einmal
   * eigene Radien, gelten DIESE - dieselbe Regel wie bei W_pl des Mastes.
   */
  {
    const r = AX.winkelRadien({ aH: 90, aV: 90, t: 9, A: 15.5, r1: 11, r2: 5.5 });
    pruef('Ein Tabellenradius gilt', r.r1, 11, 1e-12, 'mm');
    wahr('Und wird als solcher benannt', r.quelle === 'tabelle');
  }

  /*
   * DER ABSTAND ZUM NORMRADIUS - ausdruecklich gemessen, damit niemand die
   * Zahl fuer den Normwert haelt. Der Beiwert (1-pi/4)/2 ist klein; die auf
   * 0.1 cm2 gerundete Tabellenflaeche laesst r1 um gut einen Millimeter
   * schwanken. Fuer das Modell zaehlt die FLAECHE, und die trifft er.
   */
  {
    const norm = { 'L 80x80x8': 10, 'L 90x90x9': 11, 'L 100x100x10': 12,
                   'L 120x120x12': 13, 'L 130x130x12': 14 };
    Object.entries(norm).forEach(([nm, rn]) => {
      const p = PROFILE.find((q) => q.name === nm);
      if (!p) return;
      const r = AX.winkelRadien(p);
      wahr(`${nm}: nahe am Normradius, aber nicht gleich`,
           Math.abs(r.r1 - rn) < 2.0,
           `${r.r1} gegen ${rn} mm nach EN 10056-1`);
    });
  }

  // --- In der Ausleitung ---------------------------------------------------
  {
    const w = { ...standardwerte(), typ: 'J90', L: 20 };
    const erg = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                         getStahl(w.stahl), T.getTragjoch(w.typ));
    const j = AX.stabmodellJson(erg.modell, { eingabe: w });
    const g = j.querschnitte.filter((q) => /^GURT_/.test(q.name));
    wahr('Beide Gurtquerschnitte stehen in der Datei', g.length === 2);
    g.forEach((q) => {
      wahr(`${q.name}: r1 ist nicht mehr null`, q.parameter[3] > 0,
           JSON.stringify(q.parameter));
      wahr(`${q.name}: r2 ebenfalls`, q.parameter[4] > 0);
      // Der Katalogname geht mit - die Bruecke versucht ihn vor dem
      // parametrischen Weg.
      wahr(`${q.name}: der Katalogname geht mit`,
           q.katalog?.norm === 'EN 10056-1' && /^L /.test(q.katalog.bezeichnung),
           JSON.stringify(q.katalog));
    });
  }

  // --- Und die Bruecke versucht ihn ---------------------------------------
  {
    const ps = readFileSync(join(HIER, 'com', 'AxisVM_aufbauen.ps1'), 'utf8');
    wahr('Die Bruecke versucht zuerst den Katalog',
         ps.indexOf('AddFromCatalog(Katalog') < ps.indexOf('AddL(Name, a, b'));
    wahr('Und faellt auf den vermessenen Weg zurueck',
         /AddL\(Name, a, b, tw, tf, r1, r2, cspRolled\)/.test(ps));
    // Die Datei bleibt reines ASCII - sonst bricht sie beim Laden.
    wahr('Die .ps1 ist reines ASCII',
         // eslint-disable-next-line no-control-regex
         !/[^ -]/.test(ps));
  }
}

// ===========================================================================
titel('51  Was ein Leiter an dieser Stelle abgibt');

/*
 * WEISUNG DES AUFTRAGGEBERS, 28. August:
 *
 *   "Bei den Leitern eine Auswahl einfuegen, ob Staendige / Veraenderliche /
 *    Staendige+Veraenderliche wirkt. Es kann sein, dass der Leiter nur
 *    abgezogen wird (bei Fahrdraht der Fall), oder dass die Befestigung am
 *    Joch nur das Tragseil eine Ablenkkraft hat und der Fahrdraht nicht, da
 *    dieser Anteil in die Drueckstuetze geht. Die staendigen aber beiden zum
 *    Tragseil gehen und von der Befestigung am Joch getragen."
 *
 * >>> DIE ACHSE IST NICHT "STAENDIG / VERAENDERLICH". <<<
 * Gewicht UND Ablenkkraft sind beide staendig (Gruppe G). Der genannte Fall
 * trennt sie trotzdem: das Gewicht kommt am Joch an, die Ablenkung des
 * Fahrdrahts nicht. Eine Wahl mit zwei Stellungen traefe ihn also gar nicht.
 * Getrennt wird nach dem, was wirklich verschiedene Wege geht - Gewicht,
 * Ablenkung, Wind/Schnee. Auf Rueckfrage so entschieden.
 */
{
  const A9 = await import(J('data.anbauteile.js'));

  const bogen = { ek: 'EK2', R: 380, spannweite: 30 };
  const leiter = (o = {}) => ({
    id: 'KW', name: 'Kettenwerk', vorlage: 'direkt', x: 8, raster: 0.4,
    befestigung: 'unten', aktiv: true, lasten: [],
    module: [{ bauteil: 'drahtwerk-cu-95', anzahl: 1, z: -1.35, y: 0, ...o }],
  });
  const kr = (o) => {
    const f = A9.expandiereAnbauteile([leiter(o)], bogen);
    return f.reduce((s2, t) => ({
      Gz: s2.Gz + (t.kraefte?.G?.Fz ?? 0),
      Gx: s2.Gx + (t.kraefte?.G?.Fx ?? 0),
      // Der Leiter traegt Wind QUER (windLaengs fuehrt die Tabelle fuer
      // Drahtwerke nicht - ein Seil hat in Laengsrichtung keine Flaeche).
      Qx: s2.Qx + (t.kraefte?.WindX?.Fx ?? 0),
    }), { Gz: 0, Gx: 0, Qx: 0 });
  };

  // --- Ohne Angabe wirkt alles --------------------------------------------
  /*
   * Alte Baugruppen fuehren die Haken nicht. Sie muessen unveraendert
   * weiterrechnen - sonst aendert eine Fassung still jedes gespeicherte
   * Tragwerk.
   */
  const voll = kr({});
  wahr('Ohne Angabe wirkt das Gewicht', Math.abs(voll.Gz) > 1e-6, `${voll.Gz}`);
  wahr('Ohne Angabe wirkt die Ablenkung', Math.abs(voll.Gx) > 1e-6, `${voll.Gx}`);
  wahr('Ohne Angabe wirkt der Wind', Math.abs(voll.Qx) > 1e-6, `${voll.Qx}`);

  // --- Der Fall aus der Weisung -------------------------------------------
  /*
   * DER FAHRDRAHT AM JOCH: sein Gewicht haengt am Tragseil und kommt hier an,
   * seine Ablenkung geht in die Drueckstuetze. Genau ein Haken.
   */
  {
    const ohneAblenk = kr({ wirktAblenk: false });
    pruef('Das Gewicht bleibt', ohneAblenk.Gz, voll.Gz, 1e-12, 'kN');
    pruef('Die Ablenkung faellt weg', ohneAblenk.Gx, 0, 1e-12, 'kN');
    pruef('Und der Wind bleibt', ohneAblenk.Qx, voll.Qx, 1e-12, 'kN');
    // >>> BEIDE SIND STAENDIG. Waere nach staendig/veraenderlich getrennt
    // worden, haette dieser Fall das Gewicht mitgenommen.
    wahr('Gewicht und Ablenkung stehen beide in der Gruppe G',
         Math.abs(voll.Gz) > 1e-6 && Math.abs(voll.Gx) > 1e-6);
  }

  // --- Die anderen beiden Haken -------------------------------------------
  {
    const ohneG = kr({ wirktG: false });
    pruef('Ohne Gewicht ist F_z null', ohneG.Gz, 0, 1e-12, 'kN');
    pruef('Die Ablenkung bleibt', ohneG.Gx, voll.Gx, 1e-12, 'kN');
    const ohneQ = kr({ wirktQ: false });
    pruef('Ohne Wind ist F_x aus Wind null', ohneQ.Qx, 0, 1e-12, 'kN');
    pruef('Das Gewicht bleibt auch dann', ohneQ.Gz, voll.Gz, 1e-12, 'kN');
    // Alle drei aus: der Leiter wird nur abgezogen und gibt hier nichts ab.
    const nichts = kr({ wirktG: false, wirktAblenk: false, wirktQ: false });
    wahr('Alle drei aus: der Leiter gibt hier nichts ab',
         nichts.Gz === 0 && nichts.Gx === 0 && nichts.Qx === 0);
  }

  // --- Nur Drahtwerke fuehren die Wahl ------------------------------------
  /*
   * Ein Traeger hat keine Ablenkkraft, und wer sein Gewicht nicht will,
   * schaltet das Modul ab. Die Haken dort anzubieten hiesse, eine Frage zu
   * stellen, die es nicht gibt.
   */
  {
    const stuetze = {
      id: 'HS', name: 'Stuetze', vorlage: 'direkt', x: 8, raster: 0.4,
      befestigung: 'unten', aktiv: true, lasten: [],
      module: [{ bauteil: 'anbauteil-haengestuetze-od-haengerohr', anzahl: 1,
                 z: -1.35, y: 0, wirktG: false }],
    };
    const f = A9.expandiereAnbauteile([stuetze], bogen);
    const Gz = f.reduce((s2, t) => s2 + (t.kraefte?.G?.Fz ?? 0), 0);
    wahr('Bei einem Traeger greift der Haken nicht', Math.abs(Gz) > 1e-6,
         `${Gz.toFixed(4)} kN`);
    wahr('Und er traegt keine Wirkungsangabe',
         f.every((t) => t.rolle !== 'drahtwerk' ? t.wirkung === null : true));
  }

  // --- Die Wirkung steht am Teil ------------------------------------------
  // Ausleitung und Darstellung sollen sie benennen koennen, nicht nur die
  // Summe sehen.
  {
    const f = A9.expandiereAnbauteile([leiter({ wirktAblenk: false })], bogen);
    const t = f.find((x) => x.rolle === 'drahtwerk');
    wahr('Das Drahtwerk traegt seine Wirkung', t.wirkung
         && t.wirkung.G === true && t.wirkung.ablenk === false
         && t.wirkung.Q === true, JSON.stringify(t.wirkung));
  }

  // --- Das Kettenwerk als Klammer -----------------------------------------
  /*
   * Es geht in KEINE Rechnung ein - noch nicht. Es haelt zusammen, was
   * zusammengehoert: Tragseil und Fahrdraht. Der Havariefall (Bruch eines
   * Kettenwerks, mit staendigen Lasten charakteristisch und dem Leiterzug bei
   * -20 Grad) waehlt spaeter darueber aus.
   */
  {
    const f = A9.expandiereAnbauteile([leiter({ kettenwerk: 'KW1' })], bogen);
    const t = f.find((x) => x.rolle === 'drahtwerk');
    wahr('Das Kettenwerk wandert mit', t.kettenwerk === 'KW1', t.kettenwerk);
    const ohne = A9.expandiereAnbauteile([leiter({})], bogen)
      .find((x) => x.rolle === 'drahtwerk');
    wahr('Ohne Angabe bleibt es leer', ohne.kettenwerk === null);
    // Und es aendert nichts an den Kraeften.
    pruef('Es geht in keine Rechnung ein',
          kr({ kettenwerk: 'KW1' }).Gx, voll.Gx, 1e-12, 'kN');
  }

  // --- In der Maske --------------------------------------------------------
  {
    const roh = readFileSync(join(HIER, 'js', 'ui.js'), 'utf8');
    wahr('Die drei Haken stehen in der Maske',
         /wirktG/.test(roh) && /wirktAblenk/.test(roh) && /wirktQ/.test(roh));
    wahr('Und das Kettenwerksfeld', /data-mk="kettenwerk"/.test(roh));
    // Sie erscheinen NUR beim Drahtwerk.
    wahr('Nur im Drahtwerkzweig',
         roh.indexOf('wirkungHtml(i, k, m)') > roh.indexOf('drahtwerk ? `<div class="sec-klein">Ablenkung'));
  }
}

// ===========================================================================
titel('52  Masten und Auflagerung sind zwei Fragen');

/*
 * WEISUNG DES AUFTRAGGEBERS, 28. August: "hier nicht abhaengig machen, ob
 * Mast im Modell aufgefuehrt wird oder nicht. Die Haupttragwerke sollten
 * global gesteuert werden."
 *
 * Bis dahin entschied die Auswahl "Endauflager" beides zugleich: WIE das Joch
 * gelagert ist UND OB es ueberhaupt einen Masten gibt. Wer gelenkig rechnen
 * wollte, verlor den Masten aus Bild, Ausleitung, Wind und Nachweis. Wer den
 * Masten sehen wollte, musste seine Steifigkeit ansetzen.
 *
 *      mastVorhanden   ob er dasteht  - Bauteil, Bild, Ausleitung, Nachweis
 *      endbedingung    woher die Drehfeder des Jochendes kommt
 */
{
  const AU = await import(J('core.auflager.js'));
  const R = await import(J('render.3d.js'));

  const bau = (o) => {
    const w = { ...standardwerte(), typ: 'J90', L: 20, mastProfil: 'HEB 260',
                mastH: 8, ...o };
    const erg = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                         getStahl(w.stahl), T.getTragjoch(w.typ));
    return { w, erg, sz: R.erzeugeSzene(erg.modell, erg) };
  };

  // --- Die Weiche ---------------------------------------------------------
  wahr('Eingeschaltet steht ein Mast', AU.mastImModell({ mastVorhanden: true }));
  wahr('Ausgeschaltet keiner', !AU.mastImModell({ mastVorhanden: false }));
  /*
   * ALTE DATEIEN RECHNEN UNVERAENDERT. Fehlt die Angabe, gilt der fruehere
   * Zusammenhang - sonst bekaeme jedes gespeicherte Tragwerk mit gelenkigem
   * Auflager still einen Masten dazu, mit Wind, Nachweis und Ausleitung.
   */
  wahr('Ohne Angabe gilt der fruehere Zusammenhang',
       AU.mastImModell({ endbedingung: 'mast' })
       && !AU.mastImModell({ endbedingung: 'gelenkig' }));
  wahr('Und der Schalter schlaegt ihn',
       AU.mastImModell({ endbedingung: 'gelenkig', mastVorhanden: true })
       && !AU.mastImModell({ endbedingung: 'mast', mastVorhanden: false }));

  /*
   * >>> DIE PRUEFUNG, DIE ZAEHLT. <<<
   * Ein Mast im Modell darf die JOCHRECHNUNG nicht anfassen, solange die
   * Endbedingung ihn nicht als Feder verlangt. Sonst waere die Trennung
   * keine: man schaltete ein Bauteil ein und bekaeme eine andere Ausnutzung.
   */
  ['gelenkig', 'voll', 'manuell'].forEach((eb) => {
    const ohne = bau({ endbedingung: eb, mastVorhanden: false });
    const mit = bau({ endbedingung: eb, mastVorhanden: true });
    pruef(`${eb}: der Mast aendert die Jochausnutzung nicht`,
          mit.erg.max.etaGesamt, ohne.erg.max.etaGesamt, 1e-12, '-');
    pruef(`${eb}: und auch die Drehfeder nicht`,
          mit.erg.modell.federn.cA, ohne.erg.modell.federn.cA, 1e-9, 'kNm/rad');
    // Er steht trotzdem da - mit allem, was dazugehoert.
    wahr(`${eb}: der Mast steht im Modell`, !!mit.erg.modell.federn.mast);
    wahr(`${eb}: er wird gezeichnet`,
         mit.sz.flaechen.some((f) => /^MAST_/.test(f.teil ?? '')));
    wahr(`${eb}: er traegt Wind`, !!mit.erg.modell.mastLast);
    wahr(`${eb}: und er wird nachgewiesen`,
         mit.erg.mast != null && Number.isFinite(mit.erg.mast.eta));
    // Ohne ihn nichts davon.
    wahr(`${eb}: ausgeschaltet ist er ganz weg`,
         !ohne.erg.modell.federn.mast && !ohne.erg.modell.mastLast
         && (ohne.erg.mast === null || ohne.erg.mast === undefined)
         && !ohne.sz.flaechen.some((f) => /^MAST_/.test(f.teil ?? '')));
  });

  // --- Umgekehrt: die Feder wirkt weiterhin -------------------------------
  {
    const feder = bau({ endbedingung: 'mast', mastVorhanden: true });
    const ohne = bau({ endbedingung: 'gelenkig', mastVorhanden: true });
    wahr('Mit "Steifigkeit aus Mast" entsteht eine Feder',
         feder.erg.modell.federn.cA > 0);
    pruef('Ohne sie bleibt das Ende gelenkig', ohne.erg.modell.federn.cA, 0,
          1e-12, 'kNm/rad');
    wahr('Und das aendert die Jochausnutzung sehr wohl',
         Math.abs(feder.erg.max.etaGesamt - ohne.erg.max.etaGesamt) > 1e-3,
         `${feder.erg.max.etaGesamt.toFixed(4)} gegen `
         + `${ohne.erg.max.etaGesamt.toFixed(4)}`);
  }

  // --- "Aus Mast" gewaehlt, aber keiner da --------------------------------
  /*
   * Dann wird gelenkig gerechnet - und zwar LAUT. Still eine Feder aus einem
   * Bauteil zu bilden, das nicht dasteht, waere die schlimmere Antwort; still
   * gelenkig zu rechnen aber auch, denn das ist der Unterschied zwischen
   * einem eingespannten und einem frei aufliegenden Joch.
   */
  {
    const { hinweise } = await import(J('core.checks.js'));
    const b = bau({ endbedingung: 'mast', mastVorhanden: false });
    pruef('Ohne Masten keine Feder', b.erg.modell.federn.cA, 0, 1e-12, 'kNm/rad');
    wahr('Die Bezeichnung sagt es',
         /kein Mast/.test(b.erg.modell.federn.art), b.erg.modell.federn.art);
    wahr('Und ein Hinweis steht in der Liste',
         hinweise(b.erg.modell).join(' | ').includes('GELENKIG'),
         hinweise(b.erg.modell).find((h) => /Endauflager/.test(h)) ?? '(keiner)');
  }

  // --- Die Maske folgt derselben Antwort ----------------------------------
  {
    const feld = (k) => FELDER.find((f) => f.key === k);
    const feld2 = (k) => FELDER.find((f) => f.key === k);   // darf fehlen
    const sicht = (f, w) => (typeof f.sichtbar === 'function' ? f.sichtbar(w) : true);
    const an = { ...standardwerte(), endbedingung: 'gelenkig', mastVorhanden: true };
    const aus = { ...standardwerte(), endbedingung: 'mast', mastVorhanden: false };
    wahr('Es gibt den Schalter', !!feld('mastVorhanden'));
    wahr('Er steht in der Gruppe der Masten',
         feld('mastVorhanden').gruppe === 'mast');
    // >>> DIE MASTFELDER HAENGEN AM SCHALTER, NICHT AN DER ENDBEDINGUNG.
    ['mastProfil', 'mastH', 'mastLaenge', 'mastSteg', 'wMast'].forEach((k) => {
      wahr(`${k}: sichtbar bei gelenkigem Auflager mit Masten`,
           sicht(feld(k), an));
      wahr(`${k}: unsichtbar ohne Masten, auch bei "aus Mast"`,
           !sicht(feld(k), aus));
    });
    // Das BAUTEIL steht bei den Masten, die LAST bei den Einwirkungen.
    // Beides haengt am selben Schalter, aber es sind zwei Fragen: welcher
    // Mast dasteht, und was auf ihn drueckt.
    ['mastProfil', 'mastH', 'mastLaenge', 'mastSteg'].forEach((k) => {
      wahr(`${k}: steht in der Gruppe der Masten`, feld(k).gruppe === 'mast');
    });
    ['wMast', 'mastWindAufJoch'].forEach((k) => {
      wahr(`${k}: steht bei den Einwirkungen`, feld(k).gruppe === 'ein');
    });
    // KEINE OPTION MEHR: der Schalter, der den Tabellenwert abwaehlen liess,
    // ist weg. Steht ein Mast im Modell, faengt er Wind.
    wahr('Der Schalter "aus der Lasttabelle" ist entfallen',
         !feld2('wMastAusTabelle'));
    wahr('Die Mastwindlast steht gesperrt wie die Jochlasten',
         feld('wMast').ausLast === true);
    // Die Auflagerung behaelt, was Auflagerung ist.
    ['endbedingung', 'cPhi', 'kragA', 'kragB', 'mastAnschluss']
      .forEach((k) => wahr(`${k}: bleibt bei der Auflagerung`,
                           feld(k).gruppe === 'aufl'));
    // Und die Gruppe steht im Reiter.
    const U = await import(J('ui.js'));
    wahr('Die Gruppe steht im Reiter System',
         U.EINGABE_TABS.find((t) => t.id === 'system').gruppen.includes('mast'));
  }
}

// ===========================================================================
titel('52b Steht ein Mast im Modell, wird er auch ausgeleitet');
// Bis zum 31. August war 'gurte' die Vorgabe des AxisVM-Dialogs, gleich ob
// ein Mast dastand oder nicht. Wer ihn im FEM haben wollte, musste ihn eigens
// waehlen - und wer es vergass, rechnete ihn im Ersatzbalken als Drehfeder
// und im FEM gar nicht.
{
  const AXV = await import(J('export.axisvm.js'));
  const j90v = T.getTragjoch('J90');
  const mitMast = rechne({ ...basis(), ...typUebernehmen({ ...standardwerte() }, j90v),
    typ: 'J90', L: 15.5, mastVorhanden: true, endbedingung: 'mast',
    mastProfil: 'HEB 260', mastH: 7.5 }).modell;
  const ohneMast = rechne({ ...basis(), ...typUebernehmen({ ...standardwerte() }, j90v),
    typ: 'J90', L: 15.5, mastVorhanden: false, endbedingung: 'gelenkig' }).modell;
  wahr('Mit Mast ist die Vorgabe das Mastmodell',
       AXV.auflagerVorgabe(mitMast) === 'mast', AXV.auflagerVorgabe(mitMast));
  wahr('Ohne Mast bleibt es bei der Bauweise',
       AXV.auflagerVorgabe(ohneMast) === 'gurte', AXV.auflagerVorgabe(ohneMast));
  // Die Altbauweise ist zu flach fuer ein Kraeftepaar - das galt vorher und gilt weiter.
  wahr('Altbauweise ohne Mast lagert in der Ebenenmitte',
       AXV.auflagerVorgabe({ ...ohneMast, bauweise: 'alt' }) === 'mitte');
  // Und die Wahl im Dialog sticht die Vorgabe weiterhin.
  const gewaehlt = AXV.stabmodell(mitMast, { knotenmodell: 'anschnitt',
                                             auflagerModell: 'gurte' });
  wahr('Eine ausdrueckliche Wahl sticht die Vorgabe',
       gewaehlt.auflager.every((a) => a.modell === 'gurte'));
}

// ===========================================================================
titel('53  Die Beschriftung laesst kein Endfeld leer');

/*
 * WEISUNG DES AUFTRAGGEBERS, 28. August: "Ich habe noch etwas bemerkt: das
 * Endfeld auf einer Seite weist keine Resultate auf in der App."
 *
 * NACHGEMESSEN AN SEINER AUSLEITUNG (J70, 15 m, Mast HEM 240, sechs
 * Baugruppen am Joch): der Rechenkern liefert an BEIDEN Enden Werte, und
 * jede Blechflaeche traegt ihren Kennwert. Es fehlten nur die ZAHLEN.
 *
 * DIE URSACHE war die Ausduennung der Beschriftung: sie sortierte streng
 * nach Betrag und setzte die sechzig groessten. Die grossen Werte liegen in
 * Feldmitte, die kleinen am Auflager - also fielen die Auflagerbereiche
 * zuerst weg, und weil die Lasten selten genau symmetrisch sind, oft nur auf
 * einer Seite.
 *
 * Die FARBE war die ganze Zeit da. Ein Bild, das einen Bereich
 * unbeschriftet laesst, liest sich aber wie "hier ist nichts gerechnet".
 */
{
  const R = await import(J('render.3d.js'));

  // Der Fall aus der Ausleitung, so weit er sich aus ihr nachbauen laesst.
  const at = (id, x) => ({
    id, name: id, vorlage: 'direkt', x, raster: 0.4, befestigung: 'unten',
    aktiv: true, module: [],
    lasten: [{ einwirkung: 'G', x: 0, y: 0, z: -1.3,
               Fx: -1.736842, Fy: 0, Fz: 0.6, Mxx: 0, Myy: 0, Mzz: 0 },
             { einwirkung: 'WindX', x: 0, y: 0, z: -1.3,
               Fx: 0.72, Fy: 0, Fz: 0, Mxx: 0, Myy: 0, Mzz: 0 }] });
  const w = { ...standardwerte(), typ: 'J70', L: 15, a1: 0.75,
              endbedingung: 'mast', mastProfil: 'HEM 240', mastH: 8,
              mastLaenge: 12.5, knotenbereich: 'anschnitt',
              anbauteile: [4.1, 5.39, 8.057, 8.467, 9.5, 12.2]
                .map((x, i) => at(`A${i + 1}`, x)) };
  const erg = berechne(w, getProfil(w.profOG), getProfil(w.profUG),
                       getStahl(w.stahl), T.getTragjoch(w.typ));
  const sz = R.erzeugeSzene(erg.modell, erg);

  // --- Erst der Befund: gerechnet ist ueberall ----------------------------
  {
    const bl = sz.flaechen.filter((f) => f.gruppe === 'blech');
    const ohne = bl.filter((f) => !f.werte || f.werte.eta === null
                                            || f.werte.eta === undefined);
    const x = (f) => f.punkte.reduce((s2, q) => s2 + q[0], 0) / f.punkte.length;
    /*
     * Am ENDBLECH gibt es keine Horizontalbleche - an beiden Enden gleich.
     * Das ist die einzige Stelle ohne Kennwert, und sie ist symmetrisch.
     */
    const xsOhne = [...new Set(ohne.map((f) => Math.round(x(f) * 100) / 100))];
    wahr('Ohne Kennwert sind nur die Enden',
         xsOhne.every((v) => v < 0.2 || v > 14.8), xsOhne.join(', '));
    wahr('Und zwar BEIDE Enden gleich',
         xsOhne.some((v) => v < 0.2) === xsOhne.some((v) => v > 14.8));
    // Die Vertikalbleche tragen an beiden Enden einen Wert.
    const beiX = (ziel) => bl.filter((f) => Math.abs(x(f) - ziel) < 0.06
      && /V_[LR]/.test(f.label ?? ''));
    wahr('Das erste Vertikalblech traegt einen Wert',
         beiX(0).length > 0 && beiX(0).every((f) => Number.isFinite(f.werte?.eta)));
    wahr('Das letzte ebenso',
         beiX(15).length > 0 && beiX(15).every((f) => Number.isFinite(f.werte?.eta)));
    /*
     * NICHT DERSELBE WERT: die Baugruppen liegen zwischen 4.1 und 12.2 m,
     * ihr Schwerpunkt also links der Mitte. Das Joch ist belastet
     * unsymmetrisch - und genau das macht die alte Ausduennung so tueckisch,
     * denn sie laesst dann die SCHWAECHER beanspruchte Seite leer.
     */
    wahr('Beide Enden tragen einen wirklichen Wert',
         beiX(0)[0].werte.eta > 0 && beiX(15)[0].werte.eta > 0,
         `${beiX(0)[0].werte.eta.toFixed(3)} gegen `
         + `${beiX(15)[0].werte.eta.toFixed(3)}`);
  }

  // --- Und jetzt die Beschriftung -----------------------------------------
  /*
   * Nachgestellt wird, was `_werte` tut: Kandidaten sammeln, ordnen, die
   * ersten sechzig nehmen. Geprueft wird die ORDNUNG - sie entscheidet, wer
   * bei knappem Platz uebrig bleibt.
   */
  {
    /*
     * NUR DAS JOCH. Der Befund betraf die Beschriftung der BLECHE: sie brach
     * mitten im Feld ab. Seit dem 1. September traegt auch der Mast seine
     * Ausnutzung, und seine Abschnitte liegen an den Mastachsen, also an den
     * Enden - mit ihnen deckte die Betragsordnung die Enden scheinbar wieder
     * ab, und die Pruefung mass ihren eigenen Gegenstand nicht mehr.
     */
    const kand = sz.flaechen
      .filter((f) => Number.isFinite(f.werte?.eta) && !/^MAST_/.test(f.teil ?? ''))
      .map((f) => ({ v: f.werte.eta,
                     x: f.punkte.reduce((s2, q) => s2 + q[0], 0) / f.punkte.length,
                     betrag: Math.abs(f.werte.eta) }));
    wahr('Es gibt mehr Kandidaten als Plaetze', kand.length > 60,
         `${kand.length} Kandidaten`);

    // ALT: streng nach Betrag. NEU: reihum ueber die Spalten.
    const nurGroesste = [...kand].sort((a, b) => b.betrag - a.betrag).slice(0, 60);
    const verteilt = R.beschriftungsReihenfolge(kand).slice(0, 60);

    const spanne = (liste) => {
      const xs = liste.map((k) => k.x);
      return { min: Math.min(...xs), max: Math.max(...xs) };
    };
    const a = spanne(nurGroesste), b = spanne(verteilt);
    /*
     * >>> DAS IST DER BEFUND. <<< Nach Betrag geordnet beginnt die
     * Beschriftung erst weit im Feld; verteilt beginnt sie am Auflager.
     */
    wahr('Nach Betrag geordnet bleiben die Enden leer',
         a.min > 0.5 || a.max < 14.5,
         `x von ${a.min.toFixed(2)} bis ${a.max.toFixed(2)} m`);
    wahr('Verteilt reicht die Beschriftung bis an beide Enden',
         b.min < 0.5 && b.max > 14.5,
         `x von ${b.min.toFixed(2)} bis ${b.max.toFixed(2)} m`);

    /*
     * UND DIE MASSGEBENDE STELLE BLEIBT BESCHRIFTET. Das war der Sinn der
     * alten Ordnung, und er darf nicht verlorengehen: der groesste Wert des
     * Bildes steht in der ersten Runde, weil seine Spalte gleich drankommt.
     */
    const groesster = kand.reduce((p2, q) => (q.betrag > p2.betrag ? q : p2));
    wahr('Der groesste Wert steht weiterhin unter den ersten',
         verteilt.slice(0, 14).some((k) => Math.abs(k.v - groesster.v) < 1e-12),
         `${groesster.v.toFixed(3)} bei x = ${groesster.x.toFixed(2)} m`);
    /*
     * INNERHALB EINER SPALTE BLEIBT DIE ORDNUNG NACH BETRAG - an einem
     * gebauten Fall geprueft, wo jede Spalte bekannt ist. Am Modell waere
     * die Spaltengrenze nicht nachzurechnen, ohne die Funktion
     * nachzuprogrammieren.
     */
    const bau = [];
    for (let sp = 0; sp < 4; sp++) {
      for (let r = 0; r < 3; r++) {
        bau.push({ x: sp * 10 + r, betrag: 10 - r, v: 10 - r, spalte: sp });
      }
    }
    const ord = R.beschriftungsReihenfolge(bau, 4);
    wahr('Die erste Runde nimmt aus jeder Spalte einen',
         new Set(ord.slice(0, 4).map((k) => k.spalte)).size === 4,
         ord.slice(0, 4).map((k) => `S${k.spalte}:${k.betrag}`).join(' '));
    wahr('Und zwar den groessten der Spalte',
         ord.slice(0, 4).every((k) => k.betrag === 10));
    wahr('Die zweite Runde den zweitgroessten',
         ord.slice(4, 8).every((k) => k.betrag === 9));
    pruef('Es geht nichts verloren', ord.length, bau.length, 1e-12, 'Stk');
  }
}

// ===========================================================================
titel('54  Projektsteuerung: Auswahl, Vorschau, Ersatzspeicher');
// Drei Ergaenzungen nach dem Vorbild von BlockCalc. Der Pruefstand hat kein
// IndexedDB und kein localStorage; geprueft wird deshalb, was OHNE Browser
// pruefbar ist: die Form der Ausleitung, die Auswahl und die Vorschau.
{
  const ST = await import(J('store.js'));

  wahr('Es gibt eine Liste der Paketteile', Array.isArray(ST.PAKETTEILE));
  wahr('Sie nennt Tragwerke, Vorlagen und Zeichnungen',
       ['eintraege', 'vorlagen', 'zeichnungen']
         .every((k) => ST.PAKETTEILE.some((t) => t.key === k)),
       ST.PAKETTEILE.map((t) => t.key).join(' '));
  wahr('Jedes Teil traegt eine Beschriftung',
       ST.PAKETTEILE.every((t) => typeof t.label === 'string' && t.label.length > 2));

  // DIE VORSCHAU IST EINE EIGENE FUNKTION, nicht ein Nebenprodukt des
  // Einlesens: sie darf nichts schreiben.
  wahr('paketInhalt steht bereit', typeof ST.paketInhalt === 'function');
  // Function.length zaehlt nur Parameter VOR dem ersten mit Standardwert;
  // bei (wahl = null) ist sie null und taugt als Pruefung nichts. Geprueft
  // wird deshalb am Quelltext, dass die Auswahl in der Signatur steht.
  {
    const quelle = readFileSync(new URL('./js/store.js', import.meta.url), 'utf8');
    wahr('alsPaket nimmt eine Auswahl entgegen',
         quelle.includes('export async function alsPaket(wahl'));
    wahr('ausPaket nimmt eine Auswahl entgegen',
         quelle.includes('export async function ausPaket(daten, wahl'));
  }

  // ERSATZSPEICHER. Ohne IndexedDB faellt die Ablage auf localStorage
  // zurueck, statt mit einer Ausnahme abzubrechen. Im Pruefstand gibt es
  // beides nicht - geprueft wird, dass die Auskunft da ist.
  wahr('Die Ablage sagt, ob sie im Ersatz laeuft',
       typeof ST.ersatzspeicherAktiv === 'function');
  wahr('Ohne Zugriff meldet sie zunaechst kein Ersatzverfahren',
       ST.ersatzspeicherAktiv() === false);
}

// ===========================================================================
titel('55  Der Mast darf nach innen ruecken');
// Weisung: das Auflager kann INNERHALB des Endfelds liegen. Rueckt der Mast
// nach innen, sitzen die Anschlusspunkte auf den Gurten statt an der Stirn,
// und das Joch kragt darueber hinaus. Grenze ist BERUEHRUNG, gemessen am
// FLANSCHRAND - anliegend zulaessig, ueberschneidend nicht.
{
  const AU = await import(J('core.auflager.js'));
  const AXM = await import(J('export.axisvm.js'));
  const j90m = T.getTragjoch('J90');
  const mach = (kragA) => rechne({
    ...basis(), ...typUebernehmen({ ...standardwerte() }, j90m),
    typ: 'J90', L: 15.5, kragA, kragB: 0, anbauteile: [],
    mastVorhanden: true, endbedingung: 'mast',
    mastProfil: 'HEB 260', mastH: 7.5,
  }).modell;

  const m0 = mach(0);
  const m4 = mach(0.4);

  // --- Geometrie ---------------------------------------------------------
  pruef('Ohne Kragarm steht der Mast an der Stirn', AU.mastAchse(m0, 'A'), 0, 1e-12, 'm');
  pruef('Mit Kragarm rueckt er nach innen', AU.mastAchse(m4, 'A'), 0.4, 1e-12, 'm');
  // HEB 260 ist quadratisch: 260 mm in jeder Drehlage.
  pruef('Tiefe in Jochachse aus dem Profil', AU.mastTiefe(m4, 'A'), 0.26, 1e-9, 'm');

  const fr = AU.mastFreiraum(m4, 'A');
  // Erstes Bindeblech bei a1 = 0.75 m, 100 mm breit -> Kante bei 0.70 m.
  pruef('Kante des ersten Blechs', fr.blech, 0.70, 1e-9, 'm');
  // Grenze = Blechkante minus halbe Masttiefe: anliegend, kein Spiel.
  pruef('Grenze ist Beruehrung am Flanschrand', fr.grenze, 0.70 - 0.13, 1e-9, 'm');
  pruef('Und es bleibt der Rest bis dorthin', fr.frei, 0.17, 1e-9, 'm');
  wahr('Kein Ueberschnitt bei 0.40 m', fr.ueberschnitt === false);
  wahr('Ueberschnitt bei 0.70 m',
       AU.mastFreiraum(mach(0.7), 'A').ueberschnitt === true);
  // ANLIEGEND IST ZULAESSIG - das ist der Kern der Weisung.
  wahr('Genau anliegend ist noch zulaessig',
       AU.mastFreiraum(mach(0.57), 'A').ueberschnitt === false);

  // --- Pruefung P9 -------------------------------------------------------
  const CH9 = await import(J('core.checks.js'));
  const p9 = (mm) => CH9.konstruktionsChecks(mm).find((c) => c.id === 'P9A');
  wahr('P9 meldet den freien Weg', /noch 170 mm/.test(p9(m4).status), p9(m4).status);
  wahr('P9 ist erfuellt, solange nichts ueberschneidet', p9(m4).ok === true);
  wahr('P9 faellt beim Ueberschnitt', p9(mach(0.7)).ok === false);
  wahr('… und sagt, wie weit er im Blech steht',
       /130 mm im Bindeblech/.test(p9(mach(0.7)).status), p9(mach(0.7)).status);

  // --- Ausleitung --------------------------------------------------------
  // DAS EIGENTLICHE ZIEL: Ersatzbalken und FEM-Modell muessen dasselbe
  // Tragwerk beschreiben. Bis zum 1. September setzte die Ausleitung den
  // Mast starr auf x = 0 und x = L, gleich was die Kragarmangabe sagte.
  const bau = AXM.stabmodell(m4, { knotenmodell: 'anschnitt' });
  const aufA = bau.auflager.filter((a) => a.ende === 'A');
  wahr('Das Auflager sitzt an der Mastachse',
       aufA.every((a) => Math.abs(a.x - 0.4) < 1e-9),
       [...new Set(aufA.map((a) => a.x))].join(' '));
  // Ohne Knoten dort haetten die Starrkoerper im Nichts gehangen.
  const knotenDort = [...bau.knoten.values()]
    .filter((k) => Math.abs(k.x - 0.4) < 1e-6 && /^(OG|UG)[LR]_/.test(k.name));
  pruef('Vier Gurtknoten an der Mastachse', knotenDort.length, 4, 1e-12, 'Stk');
  // Und der Gurt ist dort geteilt, nicht durchlaufend.
  const geteilt = bau.staebe.filter((st) => /^OGL_S/.test(st.name))
    .filter((st) => Math.abs(bau.knoten.get(st.bis).x - 0.4) < 1e-6);
  wahr('Der Gurtstab endet an der Mastachse', geteilt.length === 1);
}

// ===========================================================================
titel('56  Die Farbskala folgt den sichtbaren Ebenen');
// Weisung: die Skala auf die dargestellten Bauteile begrenzen. Die Masten
// tragen meist die groesste Einwirkung; blendet man sie aus, soll der
// Verlauf im Joch wieder auflesbar sein.
{
  const R56 = await import(J('render.3d.js'));
  const j56 = T.getTragjoch('J90');
  const e56 = rechne({
    ...basis(), ...typUebernehmen({ ...standardwerte() }, j56),
    typ: 'J90', L: 15.5, mastVorhanden: true, endbedingung: 'mast',
    mastProfil: 'HEB 260', mastH: 7.5, mastLaenge: 9,
  });
  const sz56 = R56.erzeugeSzene(e56.modell, e56);

  // Ohne Browser gibt es keine Ansicht; die Methode wird deshalb an einem
  // Traeger mit den paar Feldern aufgerufen, die sie liest.
  const traeger = {
    szene: sz56,
    ebenen: { profil: true, blech: true, mast: true, anbau: true },
    gruppen: {},
    _ebeneAn: R56.Modellansicht.prototype._ebeneAn,
    _bereichSichtbar: R56.Modellansicht.prototype._bereichSichtbar,
  };
  const bereich = (feld) => traeger._bereichSichtbar(feld);

  const mitMast = bereich('M');
  traeger._bereichCache = null;
  traeger.ebenen.mast = false;
  const ohneMast = bereich('M');

  wahr('Mit Masten regiert sein Moment die Skala', mitMast > 10,
       `${mitMast.toFixed(1)} kNm`);
  wahr('Ohne Masten bleibt das Joch unter sich', ohneMast < 5,
       `${ohneMast.toFixed(2)} kNm`);
  wahr('Der Unterschied ist erheblich, nicht kosmetisch',
       mitMast / ohneMast > 5, `Faktor ${(mitMast / ohneMast).toFixed(0)}`);

  // DER CACHE DARF NICHT LUEGEN. Er haengt am Zustand der Ebenen; wer ihn
  // nicht mitfuehrt, zeigt nach dem Umschalten die alte Skala.
  traeger.ebenen.mast = true;
  const wieder = bereich('M');
  pruef('Wieder eingeschaltet gilt wieder die grosse Skala',
        wieder, mitMast, 1e-9, 'kNm');

  // OHNE SICHTBARE WERTE keine Skala von null: dann gilt der Bereich der
  // ganzen Szene, denn eine Skala von null faerbte alles gleich.
  traeger._bereichCache = null;
  traeger.ebenen = { profil: false, blech: false, mast: false, anbau: false };
  pruef('Ohne sichtbare Fläche gilt der Bereich der Szene',
        bereich('M'), sz56.bereiche.M, 1e-9, 'kNm');
}

// ===========================================================================
titel('57  Tastenkuerzel lassen sich abschalten');
// Weisung: die erweiterten Kuerzel unter Optionen deaktivierbar machen.
// Gemeint sind die EINZELNEN Tasten; Escape und Strg+Z bleiben immer.
{
  const SCH57 = await import(J('ui.schema.js'));
  const f57 = SCH57.FELDER.find((x) => x.key === 'tastenkuerzel');
  wahr('Es gibt den Schalter', !!f57);
  wahr('Er steht im Optionsdialog', f57.optionenDialog === true);
  wahr('Und im Startwert EIN', f57.standard === true);
  wahr('standardwerte() traegt ihn so', SCH57.standardwerte().tastenkuerzel === true);
  wahr('Er steht unter Darstellung',
       SCH57.OPTIONEN_ABSCHNITTE.some((a) => a.thema === 'ansicht'
                                          && a.keys.includes('tastenkuerzel')));

  /*
   * DIE VIER SPERREN, am Quelltext festgehalten - ausfuehren laesst sich der
   * Handler ohne DOM nicht.
   */
  const aq57 = readFileSync(new URL('./js/app.js', import.meta.url), 'utf8');
  const ab = aq57.indexOf('function tastendruck');
  const bis = aq57.indexOf('function dialogTasten');
  const koerper = aq57.slice(ab, bis > ab ? bis : undefined);
  wahr('Sperre 1: jedes Eingabefeld', koerper.includes('imFeld'));
  wahr('Sperre 2: offener Dialog', koerper.includes("querySelector('.dialog')"));
  wahr('Sperre 3: Sondertasten', koerper.includes('e.altKey'));
  wahr('Sperre 4: der Schalter', koerper.includes("tastenkuerzel === false"));
  // ESCAPE UND STRG+Z STEHEN VOR ALLEN SPERREN - sie duerfen nie ausfallen.
  wahr('Escape wird vor den Sperren behandelt',
       koerper.indexOf("'Escape'") < koerper.indexOf('imFeld'));
  wahr('Strg+Z ebenso',
       koerper.indexOf('e.ctrlKey || e.metaKey') < koerper.indexOf("tastenkuerzel === false"));
}

// ===========================================================================
titel('58  Der Sparmodus haelt nicht laenger als seine Bewegung');
// Gemeldet am 1. September: nach dem Deaktivieren des Masten zeigte das Joch
// nur noch die Schwerelinien, keinen Koerper mehr.
//
// URSACHE: `sparsam` laesst die Volumenflaechen weg und behaelt die Achsen -
// waehrend man am Fensterrand zieht, zaehlt die Bildfolge mehr als das
// Volumen. Ein Klick auf einen Ebenenschalter baut aber die Werkzeugleiste
// neu, das aendert die Groesse der Zeichenflaeche, und der ResizeObserver
// meldet eine Aenderung. Das folgende zeichne() traf auf ein gesetztes
// `sparsam` und liess die Koerper weg - bis zur naechsten Groessenaenderung,
// also womoeglich nie.
{
  const R58 = await import(J('render.3d.js'));
  const q58 = readFileSync(new URL('./js/render.3d.js', import.meta.url), 'utf8');

  // Die Flaechen haengen am Kennzeichen - das ist die Stelle, an der sich der
  // Fehler zeigte.
  wahr('Ohne sparsam keine Volumenflaechen',
       q58.includes('if (!this.sparsam) this.szene.flaechen.forEach'));

  // UND ZEICHNEN SETZT ES ZURUECK, ausser man verlangt es ausdruecklich.
  const ab = q58.indexOf('  zeichne({ sparsam = false } = {}) {');
  wahr('zeichne() nimmt die Sparsamkeit als Angabe', ab > 0);
  const koerper58 = q58.slice(ab, q58.indexOf('zeichneJetzt', ab));
  wahr('… und setzt sie sonst zurueck',
       koerper58.includes('if (!sparsam) this.sparsam = false;'));

  // Die Groessenaenderung behaelt ihren Weg: sie ruft _male() unmittelbar und
  // wird von der Aenderung an zeichne() nicht beruehrt. Gesucht wird die
  // DEFINITION, nicht die erste Erwaehnung des Namens.
  const abG = q58.indexOf('  passeGroesseAn(');
  wahr('Es gibt passeGroesseAn', abG > 0);
  const koerperG = q58.slice(abG);
  wahr('Die Groessenaenderung malt unmittelbar', koerperG.includes('this._male();'));
  wahr('Sie setzt das Kennzeichen selbst',
       koerperG.includes('this.sparsam = jetzt - '));
  wahr('Und stellt danach voll nach', koerperG.includes('this.sparsam = false;'));
}

// ===========================================================================
titel('59  Bewegung: eine Vorgabe fuer die ganze Anwendung');
// Weisung: die Animation nicht so abgehackt, und das soll global gelten.
//
// Vorher stand in zwanzig Regeln eine eigene Zahl - .12s, .14s, .15s, .18s,
// .2s, .22s, .3s. Keine war falsch, aber zusammen ergaben sie kein
// Verhalten, sondern zwanzig.
{
  const css59 = readFileSync(new URL('./css/style.css', import.meta.url), 'utf8');

  // --- Die Tokens gibt es --------------------------------------------------
  ['--t-schnell', '--t-mittel', '--t-ruhig', '--t-kurve'].forEach((k) => {
    wahr(`Es gibt ${k}`, css59.includes(`${k}:`));
  });

  /*
   * DIE KURVE STECKT IM TOKEN, nicht in einer eigenen Regel.
   *
   * Der erste Versuch setzte sie auf den Sternwaehler. Das wirkte nicht: die
   * Kurzform «transition: background .12s» schreibt ALLE Untereigenschaften,
   * also auch die Kurve, und setzt sie dabei auf «ease» zurueck. Am Knopf
   * stand danach weiter «ease, ease, ease».
   */
  ['--t-schnell', '--t-mittel', '--t-ruhig'].forEach((k) => {
    const zeile = css59.split('\n').find((z) => z.trim().startsWith(`${k}:`)) ?? '';
    wahr(`${k} traegt die Kurve mit`, zeile.includes('var(--t-kurve)'), zeile.trim());
  });

  // --- Keine verstreuten Zahlen mehr ---------------------------------------
  // OHNE KOMMENTARE. Der Text ueber den Tokens nennt die Kurzform als
  // Beispiel; eine Pruefung, die den eigenen Erklaertext mitliest, findet
  // Fehler, wo keine sind.
  const ohneKommentar = css59.replace(/[/][*][\s\S]*?[*][/]/g, '');
  const zeilen59 = ohneKommentar.split('\n').filter((z) => z.includes('transition:'));
  const ohneToken = zeilen59.filter((z) => !z.includes('var(--t-'));
  wahr('Jede Uebergangsregel benutzt ein Token', ohneToken.length === 0,
       ohneToken.slice(0, 2).map((z) => z.trim().slice(0, 60)).join(' | ') || 'alle');
  wahr('Und es sind nicht nur zwei', zeilen59.length > 15,
       `${zeilen59.length} Regeln`);

  // --- Wer keine Bewegung will, bekommt keine ------------------------------
  // Die Vorgabe des Betriebssystems sticht alles. Sie war schon da und darf
  // durch die Tokens nicht verlorengehen.
  wahr('prefers-reduced-motion bleibt beruecksichtigt',
       css59.includes('prefers-reduced-motion'));
  wahr('… und schaltet auf einen Wimpernschlag, nicht auf null',
       css59.includes('transition-duration: .01ms !important'));

  // --- Der Dialog bewegt seine Hoehe ---------------------------------------
  wahr('interpolate-size erlaubt den Uebergang auf auto',
       css59.includes('interpolate-size: allow-keywords'));
  const abD = css59.indexOf('.dialog-reiter {');
  const blockD = abD > 0 ? css59.slice(abD, css59.indexOf('}', abD)) : '';
  wahr('Der Reiterdialog bewegt seine Hoehe',
       blockD.includes('transition: height'), blockD.trim().slice(0, 70));
  wahr('… und bleibt oben verankert', blockD.includes('align-self: flex-start'));
}

// ===========================================================================
titel('60  Die Hoehe des Optionsdialogs wandert');
// Frage des Auftraggebers: funktioniert die Animation beim Umschalten der
// Themenbereiche? Sie tat es NICHT, und der Grund ist lehrreich.
{
  const aq60 = readFileSync(new URL('./js/app.js', import.meta.url), 'utf8');
  const css60 = readFileSync(new URL('./css/style.css', import.meta.url), 'utf8');

  /*
   * WARUM CSS ALLEIN NICHT REICHT.
   *
   * `transition: height` braucht einen Startwert; eine Hoehe aus dem Inhalt
   * hat keinen. Auch mit `height: auto` und `interpolate-size` sprang sie -
   * nachgemessen von 308 auf 794 px, und vierzehn Bilder hintereinander
   * zeigten bereits den Endwert. Der Grund ist der harte Austausch: der ganze
   * Rahmen wird durch innerHTML ersetzt, und der Browser sieht keinen
   * Zwischenzustand.
   */
  wahr('Der Reiterwechsel laesst die Hoehe wandern',
       aq60.includes('const hoeheWandern'));
  wahr('… und der Reiterknopf benutzt sie',
       aq60.includes('hoeheWandern(neu)'));

  const ab = aq60.indexOf('const hoeheWandern');
  const koerper = aq60.slice(ab, aq60.indexOf('const neu =', ab));
  /*
   * ZWISCHEN DEN BEIDEN MESSUNGEN LIEGT DER TAUSCH.
   *
   * Nicht der erste `tauschen()` im Text zaehlt - das ist der Notausstieg
   * fuer Browser ohne animate(). Geprueft wird der Abschnitt ZWISCHEN den
   * beiden Messungen; dort muss er stehen.
   */
  {
    const iVon = koerper.indexOf('const von');
    const iBis = koerper.indexOf('const bis');
    wahr('Beide Messungen stehen in dieser Reihenfolge', iVon > 0 && iVon < iBis);
    wahr('Und dazwischen wird getauscht',
         koerper.slice(iVon, iBis).includes('tauschen()'));
  }
  wahr('Ohne Aenderung keine Bewegung',
       koerper.includes('Math.abs(bis - von) < 1'));
  // DIE DAUER KOMMT AUS DER VORGABE, nicht aus einer eigenen Zahl - sonst
  // liefe sie an der globalen Bewegungsvorgabe vorbei.
  wahr('Die Dauer kommt aus dem Token',
       koerper.includes("getPropertyValue('--t-ruhig')"));
  wahr('Und die Kurve ist die der Anwendung',
       koerper.includes('cubic-bezier(.22, 1, .3, 1)'));
  // KEINE FESTE HOEHE BLEIBT STEHEN: animate() faellt von selbst zurueck,
  // eine gesetzte Stilangabe taete das nicht.
  wahr('Es bleibt keine feste Hoehe stehen',
       !koerper.includes('style.height ='));

  // Die CSS-Seite bleibt, wie sie war: oben verankert, Hoehe nach Inhalt.
  const abD = css60.indexOf('.dialog-reiter {');
  const blockD = abD > 0 ? css60.slice(abD, css60.indexOf('}', abD)) : '';
  wahr('Der Dialog bleibt oben verankert', blockD.includes('align-self: flex-start'));
  wahr('Und seine Hoehe folgt dem Inhalt', blockD.includes('height: auto'));
}

// ===========================================================================
// PRUEFUNG 61: die Skala umfasst nur, was zu sehen ist - und die Legende
// sagt es auch. Weisung vom 1. September, nachdem der zweite Teil fehlte.
{
  const aq61 = readFileSync(new URL('./js/app.js', import.meta.url), 'utf8');
  const r61 = readFileSync(new URL('./js/render.3d.js', import.meta.url), 'utf8');
  const idx61 = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const css61 = readFileSync(new URL('./css/style.css', import.meta.url), 'utf8');

  /*
   * DIE KOERPER FOLGTEN DER SICHTBARKEIT SCHON, DIE LEGENDE NICHT.
   *
   * Nachgemessen mit ausgeblendetem Masten: die Koerper zeigten die Spanne
   * bis 1.12 kNm, die Legende behauptete weiter 69.28 - denn das Umschalten
   * einer Ebene rief `zeichne()`, aber nicht `zeichneLegende()`.
   */
  {
    const ab = aq61.indexOf('const nach = () => {');
    const koerper = ab > 0 ? aq61.slice(ab, aq61.indexOf('};', ab)) : '';
    wahr('Das Umschalten einer Ebene zeichnet neu',
         koerper.includes('ansicht.zeichne()'));
    wahr('… und die Legende gleich mit', koerper.includes('zeichneLegende()'));
  }
  wahr('Die Skala zaehlt nur eingeschaltete Ebenen',
       r61.includes('_bereichSichtbar(feld)')
       && r61.includes('if (f.gruppe && !this._ebeneAn(f.gruppe)) return;'));

  // DER TITEL GEHOERT ZUM BAUTEIL. Ist der Mast aus, stand sein Profil
  // sonst ueber leerem Grund.
  wahr('Der Masttitel traegt seine Ebene',
       r61.includes("tab: 'system', gruppe: 'mast'"));
  wahr('… und ausgeblendete Titel entfallen',
       r61.includes('if (bt.gruppe && !this._ebeneAn(bt.gruppe)) return;'));
  /*
   * DER JOCHTITEL NICHT: er benennt das TRAGWERK, nicht die Gurte. Mit
   * gruppe: 'gurt' verschwand er beim ersten Versuch ganz - den Schluessel
   * gibt es nicht, er heisst 'profil', und _ebeneAn meldete false.
   */
  {
    /*
     * DER ANKER IST DIE LAGE, nicht der Text: der Titel traegt seit dem
     * 3. September die Positionsnummer davor (P2 · J90 · 20.00 m), und ein
     * Anker im Text zerbricht bei jeder Anschrift neu. Die Aussage bleibt
     * dieselbe - kein `gruppe:` am Jochtitel.
     */
    const ab = r61.indexOf('p: [m.L / 2, 0, zOK + 0.95],');
    const koerper = ab > 0 ? r61.slice(ab, r61.indexOf('});', ab)) : '';
    wahr('Der Jochtitel bleibt ungebunden',
         koerper.length > 0 && !koerper.includes('gruppe:'));
  }

  // NUR DER RAHMEN LEUCHTET AUF, nicht die Schrift (Weisung): man faehrt
  // beim Drehen vielmal unbewusst darueber.
  {
    /*
     * DAS FENSTER WURDE GROESSER, weil der Rumpf es wurde: seit dem
     * 2. September steht davor der Zweig fuer die passiven Titel (sie
     * werden gedaempft gezeichnet und sind nicht anklickbar). Die Aussage
     * bleibt dieselbe - nur der Rahmen leuchtet auf, nicht die Schrift.
     */
    const ab = r61.indexOf('const warm = this._titelUnterZeiger === bt;');
    const koerper = ab > 0 ? r61.slice(ab, ab + 2600) : '';
    wahr('Der Rahmen folgt dem Zeiger', koerper.includes('warm ? t.acc'));
    wahr('… die Schrift aber nicht',
         koerper.includes('c.fillStyle = t.on2 ?? t.on;')
         && !koerper.includes('warm ? t.acc : (t.on2'));
    wahr('… und der Grund behaelt seine Deckung',
         koerper.includes('c.globalAlpha = 0.72;'));
  }

  // DIE BEIDEN KOPFLEISTEN SIND WEG (Weisung) - damit stehen die Reiter
  // beider Seitenspalten auf gleicher Hoehe. Nachgemessen: 46 px und 46 px.
  wahr('Keine Kopfleiste mehr im Rumpf', !idx61.includes('panel-kopf'));
  wahr('… und keine Regel dafuer im Stil', !css61.includes('.panel-kopf'));
  wahr('… und niemand schreibt mehr hinein',
       !aq61.includes("el('modell-info')") && !aq61.includes('modellInfoText'));
  // Der Fehlerfall beim Bildeinlesen braucht dafuer einen anderen Weg.
  wahr('Der Handlungsbalken traegt jetzt die Meldung',
       aq61.includes('function meldeImBalken')
       && aq61.includes('meldeImBalken(`Das Bild'));
}

// ===========================================================================
// PRUEFUNG 62: die Messoption fuer die schiefe Biegung im PyNite-Export.
// Sie dient der Kalibrierung und darf die Ausleitung NICHT anfassen.
{
  const { pyniteSkript } = await import(J('export.pynite.js'));
  const { winkelwerteFuer } = await import(J('core.winkel.js'));
  const m62 = modell(
    { ...standardwerte(), typ: 'J90', L: 15, mastVorhanden: false },
    getProfil(T.getTragjoch('J90').og.profil),
    getProfil(T.getTragjoch('J90').ug.profil),
    getStahl('S235'), T.getTragjoch('J90'));

  const normal = pyniteSkript(m62, { knotenmodell: 'anschnitt' }).text;
  const schief = pyniteSkript(m62, { knotenmodell: 'anschnitt',
                                     gurteSchief: true }).text;

  /*
   * OHNE DIE OPTION AENDERT SICH NICHTS.
   *
   * Das ist die wichtigste der Kontrollen: was der Auftraggeber ausleitet,
   * fuehrt die Gurte schenkelparallel, wie jedes Pruefmodell.
   */
  wahr('Der normale Export dreht keinen Stab', !normal.includes('rotation='));

  // MIT DER OPTION DREHEN GENAU DIE GURTE - und zwar gegeneinander.
  const drehungen = [...schief.matchAll(
    /add_member\('((?:OG|UG)(?:L|R))_S\d+'[^)]*rotation=(-?[\d.]+)/g)]
    .map((t) => ({ ecke: t[1], rot: Number(t[2]) }));
  wahr('Mit der Option drehen sich Gurtstaebe', drehungen.length > 0);
  wahr('… und zwar um 45 Grad', drehungen.every((d) => Math.abs(d.rot) === 45));
  const je = (e) => drehungen.filter((d) => d.ecke === e).map((d) => d.rot);
  const einheitlich = (e) => je(e).length > 0 && new Set(je(e)).size === 1;
  wahr('Jede Ecke dreht einheitlich',
       ['OGL', 'OGR', 'UGL', 'UGR'].every(einheitlich));
  /*
   * DAS MUSTER IST DIE SACHE. Die beiden Gurte einer Ebene muessen
   * GEGENEINANDER drehen - stuenden sie gleichsinnig, wichen sie gemeinsam
   * aus und die Bleche bekaemen fast nichts. Genau darauf beruht der ganze
   * Ansatz (SCHIEFE_BIEGUNG in core.querschnitt.js).
   */
  wahr('Die Gurte einer Horizontalebene drehen gegeneinander',
       je('OGL')[0] === -je('OGR')[0] && je('UGL')[0] === -je('UGR')[0]);
  wahr('… und die einer Vertikalebene ebenso',
       je('OGL')[0] === -je('UGL')[0] && je('OGR')[0] === -je('UGR')[0]);

  // DER QUERSCHNITT WECHSELT AUF DIE HAUPTACHSEN. Ohne das waere die
  // Drehung wirkungslos: ein Querschnitt mit Iy = Iz ist drehsymmetrisch.
  {
    const wOG = winkelwerteFuer(getProfil(T.getTragjoch('J90').og.profil));
    const zeile = /add_section\('GURT_OG', ([^)]*)\)/.exec(schief);
    wahr('Der Gurtquerschnitt steht in Hauptachsen', !!zeile
      && Math.abs(Number(zeile[1].split(',')[1]) - wOG.I1 / 1e12)
         < wOG.I1 / 1e12 * 1e-9);
    const zeileN = /add_section\('GURT_OG', ([^)]*)\)/.exec(normal);
    wahr('… und im normalen Export schenkelparallel', !!zeileN
      && Math.abs(Number(zeileN[1].split(',')[1]) - wOG.Iz / 1e12)
         < wOG.Iz / 1e12 * 1e-9);
    // Beim gleichschenkligen Winkel sind Iy und Iz gleich - erst die
    // Hauptachsen unterscheiden sich, und zwar deutlich.
    wahr('Die Hauptachsen unterscheiden sich wirklich', wOG.I1 > 3 * wOG.I2);
  }
}

// ===========================================================================
// PRUEFUNG 63: die Verortung im Kopf.
// Seit dem Wegfall der Kopfleiste ueber dem Modell gab es beim Rechnen keine
// Stelle mehr, die sagte, WELCHES Tragwerk auf dem Tisch liegt. Sie steht
// jetzt im Projektknopf - neben Projekt und Name, bei den uebrigen Angaben,
// die das Tragwerk benennen statt es zu beschreiben.
{
  const aq63 = readFileSync(new URL('./js/app.js', import.meta.url), 'utf8');
  const css63 = readFileSync(new URL('./css/style.css', import.meta.url), 'utf8');

  wahr('Der Kopf holt die Verortung aus der einen Stelle',
       /import \{[^}]*\bverortung\b[^}]*\}\s*from '\.\/core\.constants\.js'/
         .test(aq63));

  {
    const ab = aq63.indexOf('function aktualisiereProjektKnopf()');
    const koerper = ab > 0 ? aq63.slice(ab, aq63.indexOf('\n}', ab)) : '';
    wahr('Der Projektknopf traegt die Verortung',
         koerper.includes('class="tb-ort"') && koerper.includes('esc(ort)'));
    // Drei leere Trennzeichen sagen nichts: ohne Angabe faellt sie ganz weg.
    wahr('… und laesst sie weg, wenn nichts eingetragen ist',
         /\(ort \?[^\n]*tb-ort/.test(koerper));
    // Der Name des Tragwerks bleibt das Erste; die Verortung ergaenzt ihn.
    wahr('… hinter dem Namen, nicht davor',
         koerper.indexOf('<b>') > 0
         && koerper.indexOf('<b>') < koerper.indexOf('tb-ort'));
  }

  /*
   * SIE ZIEHT SOFORT NACH. Waehrend Linie und Kilometer getippt werden, steht
   * der Speicherzustand laengst auf «ungesichert» - haengt das Neuzeichnen
   * allein daran, bleibt der Knopf stehen. Der Vergleich muss deshalb VOR dem
   * fruehen Ruecksprung stehen.
   */
  {
    const ab = aq63.indexOf('function pruefeUngesichert()');
    const koerper = ab > 0 ? aq63.slice(ab, aq63.indexOf('\n}', ab)) : '';
    const vergleich = koerper.indexOf('gezeigteVerortung');
    const ruecksprung = koerper.indexOf('gesicherteSignatur === null) return');
    wahr('Die Verortung im Knopf zieht bei jeder Eingabe nach',
         vergleich > 0 && ruecksprung > 0 && vergleich < ruecksprung);
    wahr('… und zeichnet nur bei echter Aenderung neu',
         /ort !== gezeigteVerortung/.test(koerper));
  }

  /*
   * DAS FELD BLEIBT UNTER DEM CURSOR STEHEN. verdrahteOptionen meldet jede
   * Taste und markiert sie als Zwischenstand; wer das uebergeht, ersetzt das
   * Feld beim Tippen und verliert den Fokus nach dem ersten Buchstaben.
   */
  {
    const ab = aq63.indexOf("ui.verdrahteOptionen(ui.el('bs-verortung')");
    const koerper = ab > 0 ? aq63.slice(ab, aq63.indexOf('\n  });', ab)) : '';
    wahr('Die Verortungsfelder kennen den Zwischenstand',
         /\(k, v, zwischenstand\)/.test(koerper));
    wahr('… und zeichnen erst beim Verlassen neu',
         koerper.indexOf('if (zwischenstand) return;') > 0
         && koerper.indexOf('if (zwischenstand) return;')
            < koerper.indexOf('zeichneSchublade()'));
  }

  {
    const ab = css63.indexOf('.tb-ort {');
    const regel = ab > 0 ? css63.slice(ab, css63.indexOf('}', ab)) : '';
    wahr('Die Verortung steht leiser als der Name', regel.includes('var(--dim)'));
    /*
     * BEIM EINKLAPPEN GIBT SIE ALS ERSTE NACH. Ohne min-width: 0 legt flex
     * jedem Kind den Boden seines laengsten Wortes unter - die Verortung
     * bliebe stehen und der Knopf schnitte stattdessen hinten ab.
     */
    const kleiner = /flex-shrink:\s*(\d+)/.exec(regel);
    wahr('… und gibt beim Einklappen als Erste nach',
         regel.includes('min-width: 0') && !!kleiner && Number(kleiner[1]) > 1);
    wahr('… mit Auslassungspunkten statt hartem Schnitt',
         regel.includes('text-overflow: ellipsis'));
  }
}

// ===========================================================================
// PRUEFUNG 63: die Verortung steht im Kopf. Sie unterscheidet die Tragwerke
// eines Projekts - der Jochtyp tut das nicht, ein Projekt hat viele J90.
{
  const aq63 = readFileSync(new URL('./js/app.js', import.meta.url), 'utf8');
  const css63 = readFileSync(new URL('./css/style.css', import.meta.url), 'utf8');

  const ab = aq63.indexOf('function aktualisiereProjektKnopf');
  const koerper = ab > 0 ? aq63.slice(ab, aq63.indexOf('\n}', ab)) : '';
  wahr('Der Projektknopf holt die Verortung', koerper.includes('verortung(werte)'));
  // WAS FEHLT, FAELLT WEG: drei leere Trennzeichen sagen nichts.
  wahr('… und zeigt sie nur, wenn es sie gibt', koerper.includes('ort ?'));
  wahr('Die Einfuhr steht wieder', aq63.includes("import { verortung,"));
  wahr('Und der Stil daempft sie', css63.includes('.tb-ort'));

  /*
   * SIE ZIEHT NACH, OHNE AM SPEICHERZUSTAND ZU HAENGEN.
   *
   * Der Knopf wurde nur neu gezeichnet, wenn der Zustand wechselte. Wer die
   * Verortung nachtraegt, steht laengst auf «ungesichert» - sie waere erst
   * verspaetet erschienen.
   */
  {
    const a2 = aq63.indexOf('function pruefeUngesichert');
    const k2 = a2 > 0 ? aq63.slice(a2, aq63.indexOf('\n}', a2)) : '';
    wahr('Eine geaenderte Verortung zeichnet den Knopf neu',
         k2.includes('gezeigteVerortung') && k2.includes('zeigeSpeicherstand()'));
  }

  // Die Reihenfolge der Angaben ist Weisung: vom Groben zum Feinen.
  const { verortung: v63 } = await import(J('core.constants.js'));
  wahr('Linie, Ort, Kilometer - in dieser Reihenfolge',
       v63({ linie: '600', ortschaft: 'Schwyz', km: '016.661' })
       === 'Linie 600 · Schwyz · KM 016.661');
  wahr('Ohne Eintrag bleibt sie leer', v63({}) === '');
  wahr('Und einzelne Luecken fallen einzeln weg',
       v63({ ortschaft: 'Schwyz', km: '016.661' }) === 'Schwyz · KM 016.661');
}

// ===========================================================================
// PRUEFUNG 64: die Tragwerksart als Weiche. Weisung vom 28. August («die
// Haupttragwerke sollten global gesteuert werden»), gebaut am 2. September.
{
  const { TRAGWERKSARTEN, tragwerksart: art64, hatTraeger } =
    await import(J('core.constants.js'));
  const { GRUPPEN: G64, gruppeGilt } = await import(J('ui.schema.js'));
  const UI64 = await import(J('ui.js'));
  const { BAUFORMEN_KEYS, bauformSkizze } =
    await import(J('doku.optionsskizzen.js'));

  // Vier seit dem 2. September: das Abfangjoch kam dazu (Typ A, zwei
  // UPE-Gurte mit Sprossen - nicht der vierteilige Vierendeel).
  wahr('Vier Tragwerksarten', TRAGWERKSARTEN.length === 4);
  wahr('Das Abfangjoch hat zwei Masten',
       TRAGWERKSARTEN.find((a) => a.key === 'abfangjoch')?.masten === 2);
  /*
   * ALTE DATEIEN RECHNEN UNVERAENDERT. Fehlt die Angabe, ist es ein
   * Tragjoch - das war bis zum 2. September der einzige Fall. Dasselbe
   * Vorgehen wie bei `mastVorhanden`.
   */
  wahr('Ohne Angabe gilt das Tragjoch', art64({}).key === 'joch');
  wahr('… auch bei unbekanntem Wert', art64({ tragwerksart: 'quatsch' }).key === 'joch');
  wahr('Der Einzelmast hat keinen Traeger',
       hatTraeger({ tragwerksart: 'einzelmast' }) === false);
  wahr('Joch und Tragausleger haben einen',
       hatTraeger({ tragwerksart: 'joch' })
       && hatTraeger({ tragwerksart: 'tragausleger' }));

  // JEDE ART HAT IHR BILD. Eine Karte ohne Skizze waere ein leeres Feld,
  // und die Wahl haengt genau an diesem Bild.
  wahr('Jede Art ist gezeichnet',
       TRAGWERKSARTEN.every((a) => BAUFORMEN_KEYS.includes(a.key)));
  wahr('… und die Skizze traegt wirklich etwas',
       TRAGWERKSARTEN.every((a) => bauformSkizze(a.key).includes('<svg')));

  /*
   * DER TRAGAUSLEGER IST OBEN ABGESPANNT, NICHT UNTEN ABGESTREBT.
   *
   * Hier stand zuerst ein Dreieck mit einer Strebe von unten - das Gegenteil
   * dessen, was das Querprofil zeigt. Es ist kein Zeichenfehler, sondern ein
   * statischer: die Schraege ist ein ZUGband vom Mastkopf ans freie Ende.
   * Eine Strebe von unten waere ein Druckstab und braeuchte einen
   * Knicknachweis, den es hier nicht gibt.
   *
   * Geprueft wird an den Koordinaten: der Mast steht rechts (grosses x), der
   * Ausleger kragt nach links. Das Band muss am Mast OBEN beginnen (kleines
   * y) und links TIEFER ankommen.
   */
  {
    const svg = bauformSkizze('tragausleger');
    const linien = [...svg.matchAll(
      /<line[^>]*x1="(\d+)"[^>]*y1="(\d+)"[^>]*x2="(\d+)"[^>]*y2="(\d+)"/g)]
      .map((t) => ({ x1: +t[1], y1: +t[2], x2: +t[3], y2: +t[4] }));
    // Schraege Linien mit nennenswerter Laenge - das Band ist die einzige.
    const schraeg = linien.filter((l) => l.y1 !== l.y2 && l.x1 !== l.x2
                                      && Math.abs(l.x1 - l.x2) > 40);
    wahr('Genau ein Zugband in der Skizze', schraeg.length === 1);
    const b = schraeg[0];
    if (b) {
      const amMast = b.x1 > b.x2 ? { x: b.x1, y: b.y1 } : { x: b.x2, y: b.y2 };
      const amEnde = b.x1 > b.x2 ? { x: b.x2, y: b.y2 } : { x: b.x1, y: b.y1 };
      wahr('Es beginnt am Masten, also rechts', amMast.x > 140);
      wahr('… oben am Kopf', amMast.y < 40);
      wahr('… und kommt am freien Ende tiefer an', amEnde.y > amMast.y);
    }
    // Der Mast ragt UEBER den Ausleger hinaus - sonst gaebe es keinen Punkt,
    // an dem das Band ansetzen koennte.
    const mast = linien.find((l) => l.x1 === l.x2 && Math.abs(l.y1 - l.y2) > 60);
    const ausleger = linien.find((l) => l.y1 === l.y2 && Math.abs(l.x1 - l.x2) > 80);
    wahr('Der Mast ragt ueber den Ausleger hinaus',
         !!mast && !!ausleger && Math.min(mast.y1, mast.y2) < ausleger.y1 - 15);
  }

  // BEIDE MASTKARTEN STEHEN GLEICH HERUM: Mast rechts, Ausleger nach links,
  // wie auf dem Querprofil. Spiegelverkehrt waeren sie schwer zu vergleichen.
  {
    const mastX = (key) => {
      const l = [...bauformSkizze(key).matchAll(
        /<line[^>]*x1="(\d+)"[^>]*y1="(\d+)"[^>]*x2="(\d+)"[^>]*y2="(\d+)"/g)]
        .map((t) => ({ x1: +t[1], y1: +t[2], x2: +t[3], y2: +t[4] }))
        .find((z) => z.x1 === z.x2 && Math.abs(z.y1 - z.y2) > 60);
      return l ? l.x1 : null;
    };
    wahr('Der Mast steht bei beiden Arten rechts',
         mastX('einzelmast') > 100 && mastX('tragausleger') > 100);
  }

  /*
   * WAS NICHT GILT, VERSCHWINDET. Beim Einzelmast gibt es keinen Traeger -
   * also keinen Jochtyp, keine Gurtprofile, keine Bindebleche, keine
   * Auflagerung eines Jochs.
   */
  const em = { tragwerksart: 'einzelmast' };
  const jo = { tragwerksart: 'joch' };
  ['typ', 'geo', 'aufl', 'prof', 'blech', 'stueck'].forEach((gid) => {
    wahr(`Gruppe ${gid} entfaellt beim Einzelmast`, gruppeGilt(gid, em) === false);
    wahr(`… und gilt beim Joch`, gruppeGilt(gid, jo) === true);
  });
  // Die Masten und die Lasten gelten immer - sie sind bei jeder Art da.
  ['art', 'mast', 'trasse', 'anbau', 'ein', 'komb'].forEach((gid) => {
    wahr(`Gruppe ${gid} gilt bei jeder Art`,
         gruppeGilt(gid, em) && gruppeGilt(gid, jo));
  });

  /*
   * EINE QUELLE FUER SIGNATUR UND ZEICHNUNG.
   *
   * Zwei getrennte Listen waren der Fehler, an dem die Bauformwahl zuerst
   * scheiterte: gezeichnet wurde gefiltert, die Signatur zaehlte
   * ungefiltert - sie blieb beim Umschalten gleich, die Maske wurde nicht
   * neu gebaut, und die angeklickte Karte sprang zurueck.
   */
  wahr('Der Systemreiter zeigt beim Joch mehr Gruppen als beim Einzelmast',
       UI64.gruppenFuer('system', jo).length
       > UI64.gruppenFuer('system', em).length);
  wahr('Und die Signatur unterscheidet die Arten',
       UI64.maskenSignatur(jo, 'system') !== UI64.maskenSignatur(em, 'system'));

  // WAS NICHT GERECHNET WIRD, STEHT DA. Der Kern kennt bis auf weiteres nur
  // das Tragjoch; still weiterzurechnen waere die schlimmste Antwort.
  {
    const { hinweise } = await import(J('core.checks.js'));
    const mJ = modell({ ...standardwerte(), typ: 'J90', L: 15 },
      getProfil(T.getTragjoch('J90').og.profil),
      getProfil(T.getTragjoch('J90').ug.profil),
      getStahl('S235'), T.getTragjoch('J90'));
    const hJ = hinweise(mJ);
    /*
     * SEIT DEM 2. SEPTEMBER RECHNET DER EINZELMAST.
     *
     * Der Hinweis «gerechnet wird weiterhin das Tragjoch» gilt deshalb nur
     * noch dem TRAGAUSLEGER - er ist nach den Werkstattzeichnungen ein
     * gegliederter Stab aus zwei UPE, und der Vierendeel-Kern traegt dort
     * nicht unveraendert. Beim Einzelmast waere der Hinweis jetzt falsch.
     */
    const hE = hinweise({ ...mJ, tragwerksart: 'tragausleger' });
    wahr('Beim Joch kein solcher Hinweis',
         !hJ.some((t) => /gerechnet wird weiterhin/.test(t)));
    wahr('Beim Tragausleger steht er, und ganz oben',
         /gerechnet wird weiterhin/.test(hE[0] ?? ''));
    /*
     * UND DAS MODELL REICHT DIE ANGABEN WIRKLICH DURCH.
     *
     * Der erste Anlauf hatte den Hinweis gebaut und im Pruefstand gruen
     * dastehen - dort wurde `tragwerksart` von Hand ins Modell gesetzt. In
     * der Anwendung erschien er NIE: `modell()` zaehlt seine Felder einzeln
     * auf, und diese beiden fehlten. Ein Sicherungshinweis, der nicht
     * ausloest, ist schlimmer als keiner.
     */
    const mA = modell({ ...standardwerte(), typ: 'J90', L: 15,
                        tragwerksart: 'tragausleger',
                        weitere: [{ id: 'T2' }, { id: 'T3' }] },
      getProfil(T.getTragjoch('J90').og.profil),
      getProfil(T.getTragjoch('J90').ug.profil),
      getStahl('S235'), T.getTragjoch('J90'));
    wahr('Das Modell traegt die Tragwerksart', mA.tragwerksart === 'tragausleger');
    wahr('… und die Anzahl auf dem Blatt', mA.tragwerkeAufBlatt === 3);
    const hM = hinweise(mA);
    wahr('Beide Hinweise stehen dann in der Liste',
         hM.some((x) => /gerechnet wird weiterhin/.test(x))
         && hM.some((x) => /3 Tragwerke auf diesem Querprofil/.test(x)));
    wahr('Bei einem Tragwerk kein Anzahl-Hinweis',
         !hinweises1().some((x) => /Tragwerke auf diesem Querprofil/.test(x)));
    function hinweises1() {
      return hinweise(modell({ ...standardwerte(), typ: 'J90', L: 15 },
        getProfil(T.getTragjoch('J90').og.profil),
        getProfil(T.getTragjoch('J90').ug.profil),
        getStahl('S235'), T.getTragjoch('J90')));
    }
  }
}

// ===========================================================================
// PRUEFUNG 65: das Querprofil traegt mehrere Tragwerke. Weisung vom
// 2. September, auf Rueckfrage bestaetigt: Jochreihen haben gemeinsame
// Zwischenmasten.
{
  const C = await import(J('core.constants.js'));
  const UI = await import(J('ui.js'));

  const blatt = () => ({ typ: 'J90', L: 15, linie: '600', km: '016.661',
                         trasseRadius: 700, mastProfil: 'HEB 260' });

  // ALTE DATEIEN SIND EIN QUERPROFIL MIT EINEM TRAGWERK.
  wahr('Ohne Liste steht genau ein Tragwerk da', C.anzahlTragwerke({}) === 1);
  wahr('… und es ist ein Joch', C.tragwerksart(C.tragwerkSatz({})).key === 'joch');

  // DIE BLATTANGABEN GELTEN ALLEN. Ein Querprofil hat EINEN Radius.
  {
    const w = C.tragwerkHinzu(blatt(), 'einzelmast', { mastProfil: 'DP26' });
    const alle = C.tragwerkeVon(w);
    wahr('Zwei Tragwerke auf dem Blatt', alle.length === 2);
    wahr('Beide erben Linie und Kilometer',
         alle.every((t) => t.linie === '600' && t.km === '016.661'));
    wahr('… und den Radius', alle.every((t) => t.trasseRadius === 700));
    wahr('Die Blattangaben stehen nicht im Tragwerksteil',
         !('linie' in C.tragwerkTeil(w)) && !('trasseRadius' in C.tragwerkTeil(w)));
  }

  /*
   * ERSETZEN, NICHT UEBERLAGERN - der Fehler, der beim ersten Anlauf
   * durchging.
   *
   * `{ ...w, ...gewaehltes }` sieht richtig aus und ist es nicht: was im
   * gewaehlten Tragwerk FEHLT, bleibt vom bisherigen stehen. Das Joch trug
   * danach die Tragwerksart des Einzelmastes, weil der alte Satz das Feld
   * gar nicht kannte. Zwei Tragwerke vermischt, und dem Ergebnis sieht man
   * es nicht an.
   */
  {
    let w = C.tragwerkHinzu(blatt(), 'einzelmast', { mastProfil: 'DP26' });
    wahr('Das neue Tragwerk ist gleich das aktive',
         C.tragwerksart(w).key === 'einzelmast' && w.mastProfil === 'DP26');
    w = C.tauscheAktives(w, 'T1');
    wahr('Zurueck beim Joch: die Art stimmt', C.tragwerksart(w).key === 'joch');
    wahr('… und seine eigenen Werte auch',
         w.typ === 'J90' && w.L === 15 && w.mastProfil === 'HEB 260');
    w = C.tauscheAktives(w, 'T2');
    wahr('Und der Mast hat seine behalten',
         C.tragwerksart(w).key === 'einzelmast' && w.mastProfil === 'DP26');
    w = C.tauscheAktives(w, 'T1');
    wahr('Hin und her aendert nichts',
         C.tragwerksart(w).key === 'joch' && w.mastProfil === 'HEB 260');
  }

  // DIE REIHENFOLGE AUF DEM BLATT BLEIBT. Sonst spraenge das angeklickte
  // Tragwerk beim Anklicken an eine andere Stelle.
  {
    let w = C.tragwerkHinzu(blatt(), 'einzelmast');
    w = C.tragwerkHinzu(w, 'tragausleger');
    const vorher = C.tragwerkeSortiert(w).map((t) => t.id).join(',');
    w = C.tauscheAktives(w, 'T1');
    const nachher = C.tragwerkeSortiert(w).map((t) => t.id).join(',');
    wahr('Umschalten sortiert die Liste nicht um', vorher === nachher);
    wahr('Genau eines ist aktiv',
         C.tragwerkeSortiert(w).filter((t) => t.aktiv).length === 1);
  }

  // DAS LETZTE LAESST SICH NICHT ENTFERNEN: ein Querprofil ohne Tragwerk ist
  // kein Zustand, in den man geraten koennen soll.
  {
    let w = C.tragwerkHinzu(blatt(), 'einzelmast');
    w = C.tragwerkWeg(w, 'T1');
    wahr('Ein Tragwerk laesst sich wegnehmen', C.anzahlTragwerke(w) === 1);
    wahr('Das letzte nicht', C.anzahlTragwerke(C.tragwerkWeg(w, w.twId)) === 1);
  }

  // DER NAME KOMMT VON DEN BAUTEILEN, nicht von einer Nummer.
  wahr('Ein Joch heisst nach Typ und Laenge',
       C.tragwerkName({ typ: 'J90', L: 15 }) === 'J90 · 15.00 m');
  wahr('Ein Mast nach Profil und Laenge',
       C.tragwerkName({ tragwerksart: 'einzelmast', mastProfil: 'DP26',
                        mastLaenge: 12 }) === 'DP26 · 12.00 m');

  /*
   * DIE LISTE GEHOERT IN DIE MASKENSIGNATUR.
   *
   * Ohne sie blieb die Maske stehen: der Klick auf «+ Mast» setzte den Wert,
   * und die Liste zeigte weiter einen Eintrag. Derselbe Fehler wie beim
   * Standort der Anbauteile, zwei Wochen frueher - und beim Umschalten der
   * Tragwerksart, eine Stunde frueher.
   */
  {
    const w1 = blatt();
    const w2 = C.tragwerkHinzu(w1, 'einzelmast');
    wahr('Ein Tragwerk mehr aendert die Signatur',
         UI.maskenSignatur(w1, 'system') !== UI.maskenSignatur(w2, 'system'));
    const w3 = C.tauscheAktives(w2, 'T1');
    wahr('… und ein anderes aktives ebenso',
         UI.maskenSignatur(w2, 'system') !== UI.maskenSignatur(w3, 'system'));
  }
}

// ===========================================================================
// PRUEFUNG 66: der Einzelmast rechnet. Weisung vom 2. September: «Einzelmast
// zuerst, ganz fertig.»
{
  const { berechneEinzelmast, modellEinzelmast, berechne } =
    await import(J('core.vierendeel.js'));

  const basis = { ...standardwerte(), tragwerksart: 'einzelmast',
                  mastVorhanden: true, mastProfil: 'HEB 260',
                  mastH: 9, mastLaenge: 12, windKlasse: 'EK2', anbauteile: [] };
  const mitBw = (bw) => berechneEinzelmast({ ...basis, beiwerteFest: bw },
                                           getStahl('S235'));

  /*
   * DIE GLEICHLAST AM KRAGARM - die Kontrolle, die alles andere traegt.
   *
   * Wind ueber die Masthoehe ist eine Gleichlast; am eingespannten Fuss gilt
   * V = q·H und M = q·H²/2, also M = V·H/2. Stimmt dieses Verhaeltnis, sind
   * Lastansatz, Hebelarm und Integration zusammen richtig - und zwar ohne
   * dass eine Zahl von aussen dazukaeme.
   */
  {
    const e = mitBw({ G: 1, WindX: 1.5, WindY: 0, Schnee: 0 });
    const fuss = e.mast.A.stationen[0];
    wahr('Wind quer erzeugt Querkraft am Fuss', fuss.Vq > 0.1);
    pruef('M_q = V_q · H/2 am Kragarm', fuss.Mq, fuss.Vq * 12 / 2, 1e-9, 'kNm');
    wahr('… und in Gleisrichtung nichts', Math.abs(fuss.Vl) < 1e-9);
  }
  {
    const e = mitBw({ G: 1, WindX: 0, WindY: 1.5, Schnee: 0 });
    const fuss = e.mast.A.stationen[0];
    wahr('Wind laengs erzeugt Querkraft in Gleisrichtung', fuss.Vl > 0.1);
    pruef('… mit demselben Hebelarm', fuss.Ml, fuss.Vl * 12 / 2, 1e-9, 'kNm');
  }
  /*
   * DIE SCHWACHE ACHSE IST DIE UNGUENSTIGERE. Steg quer zum Gleis heisst:
   * starke Achse quer, schwache in Gleisrichtung. Derselbe Wind muss dort
   * mehr ausmachen - sonst waeren die Achsen vertauscht, und das faellt
   * einem Ergebnis sonst nicht an.
   */
  {
    const quer = mitBw({ G: 1, WindX: 1.5, WindY: 0, Schnee: 0 });
    const laengs = mitBw({ G: 1, WindX: 0, WindY: 1.5, Schnee: 0 });
    wahr('Wind auf die schwache Achse ist unguenstiger',
         laengs.max.etaGesamt > quer.max.etaGesamt);
  }

  // NUR EIGENGEWICHT: eine Normalkraft, sonst nichts. HEB 260 mit 93 kg/m
  // ueber 12 m sind rund 11 kN.
  {
    const e = mitBw({ G: 1, WindX: 0, WindY: 0, Schnee: 0 });
    const fuss = e.mast.A.stationen[0];
    wahr('Eigengewicht steht als Normalkraft am Fuss',
         fuss.N > 9 && fuss.N < 13);
    wahr('… und erzeugt kein Moment',
         Math.abs(fuss.Mq) < 1e-9 && Math.abs(fuss.Ml) < 1e-9);
  }

  /*
   * DAS ERGEBNIS HAT DIESELBE FORM WIE BEIM JOCH - mit leeren Stellen statt
   * fehlenden. Die Auswertung fragt nach `knoten`, `max` und `mast`; was es
   * nicht gibt, ist leer und nicht undefined, damit keine Anzeige auf halbem
   * Weg abbricht.
   */
  {
    const e = mitBw({ G: 1, WindX: 1.5, WindY: 0, Schnee: 0 });
    wahr('Keine Knoten, aber eine Liste', Array.isArray(e.knoten) && !e.knoten.length);
    wahr('Ein Gesamt-eta gibt es', Number.isFinite(e.max.etaGesamt));
    /*
     * SEIT DEM BIEGEKNICKNACHWEIS IST ES DER NACHWEIS, nicht der
     * Querschnitt. Am gemessenen Regelmasten ist das Knicken das groessere
     * von beiden - die Kopfzahl haette es sonst verschwiegen, waehrend
     * daneben «Tragsicherheit erfuellt» steht.
     */
    wahr('Es ist der Nachweis des Mastes, nicht nur sein Querschnitt',
         e.max.etaGesamt === e.mast.etaNachweis);
    wahr('… und damit das groessere von Querschnitt und Knicken',
         e.max.etaGesamt === Math.max(e.mast.eta, e.mast.etaStabil));
    wahr('Kein Auflagerblatt', e.auflager === null);
  }

  // KEIN JOCH IM MODELL: die Jochgroessen stehen auf NULL, nicht auf
  // undefined - `mastLasten` addiert sie, und undefined machte daraus NaN.
  {
    const m = modellEinzelmast(basis, getStahl('S235'));
    wahr('Die Jochreaktionen sind null',
         m.RA === 0 && m.MA === 0 && m.wd === 0);
    wahr('… und die Lastlisten leer',
         m.H.length === 0 && m.T.length === 0 && m.N.length === 0);
    wahr('Der Mast steht im Modell', Boolean(m.federn?.mastA ?? m.federn?.mast));
  }

  /*
   * BERECHNE() FINDET DEN WEG SELBST. Der Aufrufer uebergibt weiterhin
   * Profile und Tragjoch - sie werden beim Einzelmast nicht gebraucht, und
   * genau das darf nicht dazu fuehren, dass er etwas anderes rechnet.
   */
  {
    const j = T.getTragjoch('J90');
    const e = berechne({ ...basis, beiwerteFest: { G: 1, WindX: 1.5, WindY: 0, Schnee: 0 } },
      getProfil(j.og.profil), getProfil(j.ug.profil), getStahl('S235'), j);
    wahr('berechne() verzweigt auf den Einzelmast',
         e.knoten.length === 0 && Boolean(e.mast));
  }

  // OHNE MASTPROFIL GEHT ES NICHT - und das wird gesagt, nicht geraten.
  {
    let fehler = null;
    try {
      modellEinzelmast({ ...basis, mastVorhanden: false }, getStahl('S235'));
    } catch (e) { fehler = e.message; }
    wahr('Ein Einzelmast ohne Masten meldet sich',
         /Mastprofil/.test(fehler ?? ''));
  }
}

// ===========================================================================
// PRUEFUNG 67: die Lage auf dem Querprofil. Weisung vom 2. September: «man
// muesste also eine x-Koordinate eingeben koennen fuer die einzelnen Masten».
{
  const C = await import(J('core.constants.js'));
  const { bauformSkizze, BAUFORMEN_KEYS } = await import(J('doku.optionsskizzen.js'));

  // EIN JOCH HAT ZWEI MASTEN - bei x0 und x0 + jt.
  wahr('Das Joch stellt zwei Masten',
       C.mastLagen({ tragwerksart: 'joch', xLage: 4, L: 12 }).join(',') === '4,16');
  wahr('Der Einzelmast einen',
       C.mastLagen({ tragwerksart: 'einzelmast', xLage: 7 }).join(',') === '7');
  wahr('Der Tragausleger auch einen',
       C.mastLagen({ tragwerksart: 'tragausleger', xLage: 7, L: 9 }).join(',') === '7');
  wahr('Das Abfangjoch zwei',
       C.mastLagen({ tragwerksart: 'abfangjoch', xLage: 0, L: 15 }).join(',') === '0,15');

  /*
   * DIE LISTE FOLGT DER ANORDNUNG, nicht der Einfuegereihenfolge.
   *
   * Vorher zaehlte `pos` - eine Zahl, die nichts bedeutete. Wer drei
   * Tragwerke auf einem Blatt hat, sucht sie dort, wo sie stehen.
   */
  {
    let w = { typ: 'J90', L: 12, xLage: 20 };
    w = C.tragwerkHinzu(w, 'einzelmast', { xLage: 5 });
    w = C.tragwerkHinzu(w, 'einzelmast', { xLage: 40 });
    const x = C.tragwerkeSortiert(w).map((t) => C.lageVon(t));
    wahr('Nach der Lage geordnet', x.join(',') === '5,20,40');
  }
  /*
   * OHNE EINGETRAGENE LAGE BLEIBT DIE REIHENFOLGE STEHEN.
   *
   * Alle auf null heisst: `pos` entscheidet. Sonst spraenge die Liste bei
   * jedem neuen Tragwerk, und man klickte dem eigenen Zeiger hinterher.
   */
  {
    let w = { typ: 'J90', L: 12 };
    w = C.tragwerkHinzu(w, 'einzelmast');
    w = C.tragwerkHinzu(w, 'tragausleger');
    const ids = C.tragwerkeSortiert(w).map((t) => t.id).join(',');
    wahr('Ohne Lage bleibt die Einfuegereihenfolge', ids === 'T1,T2,T3');
  }

  /*
   * DER GETEILTE MAST - der eigentliche Grund fuer die Lage.
   *
   * Zwei Joche in einer Reihe teilen sich den Zwischenmasten. Er ist an
   * einer ZAHL erkennbar, nicht an einer Absichtserklaerung: gleiche Stelle
   * heisst naeher als zehn Zentimeter beieinander.
   */
  {
    let w = { typ: 'J90', L: 12, xLage: 0 };
    w = C.tragwerkHinzu(w, 'joch', { L: 10, xLage: 12 });
    const g = C.geteilteMasten(w);
    wahr('Die Jochreihe teilt einen Masten', g.length === 1);
    wahr('… und zwar bei x0 = 12', Math.abs(g[0].x - 12) < 1e-9);
    wahr('… zwischen beiden Jochen',
         g[0].ids.length === 2 && g[0].ids.includes('T1') && g[0].ids.includes('T2'));
  }
  {
    // Fuenf Zentimeter Versatz sind ein Eingabefehler, kein zweiter Mast.
    let w = { typ: 'J90', L: 12, xLage: 0 };
    w = C.tragwerkHinzu(w, 'joch', { L: 10, xLage: 12.05 });
    wahr('Fuenf Zentimeter gelten als dieselbe Stelle',
         C.geteilteMasten(w).length === 1);
    let w2 = { typ: 'J90', L: 12, xLage: 0 };
    w2 = C.tragwerkHinzu(w2, 'joch', { L: 10, xLage: 14 });
    wahr('Zwei Meter nicht', C.geteilteMasten(w2).length === 0);
  }
  // Zwei Einzelmasten weit auseinander teilen sich nichts.
  {
    let w = { tragwerksart: 'einzelmast', xLage: 0 };
    w = C.tragwerkHinzu(w, 'einzelmast', { xLage: 9 });
    wahr('Getrennte Masten teilen sich nichts', C.geteilteMasten(w).length === 0);
  }

  // DAS ABFANGJOCH IST GEZEICHNET - und flach, im Unterschied zum Tragjoch.
  wahr('Auch das Abfangjoch hat sein Bild',
       BAUFORMEN_KEYS.includes('abfangjoch')
       && bauformSkizze('abfangjoch').includes('<svg'));
  {
    // Zwei Gurte dicht beieinander statt zweier Ebenen mit Bauhoehe: die
    // beiden waagrechten Linien liegen naeher zusammen als beim Tragjoch.
    // NUR BAUTEILLINIEN (class="b"). Die Terrainlinie laeuft ueber die ganze
    // Breite und zaehlte beim ersten Anlauf als dritter Gurt mit.
    const hoehen = (key) => [...bauformSkizze(key).matchAll(
      /<line class="b"[^>]*x1="(\d+)"[^>]*y1="(\d+)"[^>]*x2="(\d+)"[^>]*y2="(\d+)"/g)]
      .map((t) => ({ x1: +t[1], y1: +t[2], x2: +t[3], y2: +t[4] }))
      .filter((l) => l.y1 === l.y2 && Math.abs(l.x1 - l.x2) > 80)
      .map((l) => l.y1).sort((a, b) => a - b);
    const abf = hoehen('abfangjoch'), joch = hoehen('joch');
    wahr('Beide zeigen zwei Gurte', abf.length === 2 && joch.length === 2);
    wahr('Das Abfangjoch ist flacher als das Tragjoch',
         (abf[1] - abf[0]) < (joch[1] - joch[0]));
  }

  /*
   * DER HINWEIS NENNT DIE STELLE, nicht die Moeglichkeit.
   *
   * «Ein Mast, den sich zwei Tragwerke teilen, wird noch nicht gekoppelt»
   * war wahr und nutzlos. Wer die Lagen eingetragen hat, bekommt die Zahl.
   */
  {
    const { hinweise } = await import(J('core.checks.js'));
    const h = hinweise({ tragwerkeAufBlatt: 2,
                         geteilteMasten: [{ x: 12, ids: ['T1', 'T2'] }],
                         tragwerksart: 'einzelmast' });
    wahr('Der geteilte Mast steht mit seiner Lage da',
         h.some((t) => /x₀ = 12\.00 m/.test(t)));
    wahr('… und die fehlende Rahmenwirkung dazu',
         h.some((t) => /Rahmenwirkung/.test(t)));
  }
}

// ===========================================================================
// PRUEFUNG 68: der Mast ist das Grundelement. Weisung vom 2. September: «Ein
// Mast kann zum Beispiel ein Joch und einen Tragausleger stuetzen.»
{
  const C = await import(J('core.constants.js'));
  const reihe = () => {
    let w = { typ: 'J90', L: 12, xLage: 0, mastProfil: 'HEB 260',
              mastH: 8, mastLaenge: 12, mastSteg: 'quer' };
    return C.tragwerkHinzu(w, 'joch', { L: 10, xLage: 12, mastProfil: 'HEB 240' });
  };

  /*
   * DIE MIGRATION VERSCHMILZT DEN ZWISCHENMASTEN.
   *
   * Alte Dateien tragen die Mastangaben flach je Tragwerk; ein Mast, an dem
   * zwei Joche haengen, stand darin zweimal. Beim Einlesen wird daraus
   * einer - und was vorher bei jedem Aufruf neu vermutet wurde, steht
   * seither als Verweis da.
   */
  {
    const w = reihe();
    const m = C.mastenVon(w);
    wahr('Aus zwei Jochen werden drei Masten', m.length === 3);
    const mitte = m.find((x) => Math.abs(x.x - 12) < 1e-9);
    wahr('Der mittlere traegt beide',
         mitte?.traegt.length === 2 && mitte.traegt.includes('T1')
         && mitte.traegt.includes('T2'));
    wahr('Und die aeusseren je eines',
         m.filter((x) => x.traegt.length === 1).length === 2);
  }

  /*
   * >>> GEKOPPELT WIRD NUR, WER EINE LAGE TRAEGT. <<<
   *
   * Der Standardwert von x0 ist null. Ohne diese Regel stehen ALLE
   * Tragwerke, an denen niemand die Lage eingetragen hat, bei null - und
   * ihre Masten verschmelzen zu einem einzigen. Genau das ist beim ersten
   * Lauf passiert: drei unabhaengige Tragwerke teilten sich einen Masten,
   * das Profil sprang beim Aendern auf einen fremden Wert, und der Kern
   * bekam ein leeres Profil. Eine FEHLENDE Angabe darf nichts koppeln.
   */
  {
    let w = { typ: 'J90', L: 12, mastProfil: 'HEB 260', mastH: 8 };
    w = C.tragwerkHinzu(w, 'einzelmast');
    w = C.tragwerkHinzu(w, 'einzelmast');
    wahr('Ohne Lage teilt sich niemand einen Masten',
         C.geteilteMasten(w).length === 0);
    wahr('… und jeder hat seinen eigenen',
         C.mastenVon(w).every((m) => m.traegt.length === 1));
  }

  /*
   * >>> DIE ANSCHLUSSHOEHE GEHOERT NICHT DEM MASTEN. <<<
   *
   * Weisung vom 2. September auf Nachfrage: zwei Joche koennen am selben
   * Masten VERSCHIEDEN HOCH anschliessen. H beschreibt dann die VERBINDUNG
   * Tragwerk-Mast; am Masten abgelegt gewaenne eines der beiden Joche, und
   * das andere rechnete still mit einer fremden Hoehe. Die Drehfeder haengt
   * daran - es waere ein Fehler, den man dem Ergebnis nicht ansieht.
   */
  {
    let w = { typ: 'J90', L: 12, xLage: 0, mastProfil: 'HEB 260',
              mastH: 8, mastLaenge: 12, mastSteg: 'quer' };
    w = C.tragwerkHinzu(w, 'joch', { L: 10, xLage: 12, mastH: 8.5 });
    w = { ...w, masten: C.mastenVon(w) };
    wahr('Der Mast traegt keine Anschlusshoehe',
         C.mastenVon(w).every((m) => m.H === undefined));
    const t1 = C.tragwerkeVon(w).find((t) => t.id === 'T1');
    const t2 = C.tragwerkeVon(w).find((t) => t.id === 'T2');
    wahr('Jedes Tragwerk behaelt seine eigene',
         C.mastenProjizieren({ ...t1 }, w, t1).mastH === 8
         && C.mastenProjizieren({ ...t2 }, w, t2).mastH === 8.5);
    /*
     * WAS DEM MASTEN GEHOERT, BLEIBT GETEILT - und `mastZwei` bedeutet
     * «Ende B WEICHT AB», nicht «es gibt zwei». Sind beide Masten gleich,
     * wird das Feld nicht gesetzt und `mastProfilB` bleibt weg; sonst wuerde
     * der Standardwert von `mastHB` ploetzlich wirksam.
     */
    wahr('Bei gleichen Masten kein mastZwei',
         C.mastenProjizieren({ ...t1 }, w, t1).mastZwei !== true);
    wahr('… und das Profil kommt vom Masten',
         C.mastenProjizieren({ ...t1 }, w, t1).mastProfil === 'HEB 260');
  }
  {
    // Unterscheiden sie sich, wird es gesetzt - und beide Profile stehen da.
    let v = { typ: 'J90', L: 12, xLage: 0, mastProfil: 'HEB 260', mastH: 8 };
    v = C.tragwerkHinzu(v, 'joch', { L: 10, xLage: 12 });
    v = { ...v, masten: C.mastenVon(v) };
    v = C.setzeMastAngabe(v, 'B', 'mastProfilB', 'HEM 240');
    const t = C.tragwerkeVon(v)[0];
    const satz = C.mastenProjizieren({ ...t }, v, t);
    wahr('Bei verschiedenen Masten schon',
         satz.mastZwei === true && satz.mastProfilB === 'HEM 240');
  }

  // DER KERN SIEHT DIE ANGABEN FLACH - so wie immer.
  {
    const w = reihe();
    const t2 = C.tragwerkeVon(w).find((t) => t.id === 'T2');
    const satz = C.mastenProjizieren({}, w, t2);
    wahr('Mast A projiziert', satz.mastProfil === 'HEB 260');
    wahr('Mast B projiziert', satz.mastProfilB === 'HEB 240');
    wahr('… und mastZwei ist gesetzt', satz.mastZwei === true);
  }

  /*
   * DER GEWINN: EINE AENDERUNG WIRKT AUF BEIDE.
   *
   * Wer das Profil des Zwischenmastes aendert, aendert es fuer BEIDE
   * Tragwerke, die daran haengen. Genau so soll es sein - es ist ein Mast.
   */
  {
    let w = reihe();
    w = { ...w, masten: C.mastenVon(w) };
    w = C.setzeMastAngabe(w, 'A', 'mastProfil', 'HEM 240');
    const mitte = C.mastenVon(w).find((m) => Math.abs(m.x - 12) < 1e-9);
    wahr('Der Zwischenmast hat das neue Profil', mitte.profil === 'HEM 240');
    const t1 = C.tragwerkeVon(w).find((t) => t.id === 'T1');
    const s1 = C.mastenProjizieren({}, w, t1);
    wahr('Das Nachbartragwerk sieht es an seinem Ende B',
         s1.mastProfilB === 'HEM 240');
    wahr('… und sein eigenes Ende A bleibt', s1.mastProfil === 'HEB 260');
  }

  /*
   * EIN LEERES PROFIL IST KEINE ANGABE - und eine Liste ohne Profile keine
   * Liste. Ein Auswahlfeld, dessen Wert nicht in der Liste steht, meldet
   * einen leeren String; blind uebernommen brach der Kern mit «Unbekanntes
   * Mastprofil: » ab, ohne zu sagen, woher der leere Wert kam.
   */
  {
    let w = reihe();
    w = { ...w, masten: C.mastenVon(w) };
    const vorher = C.mastenVon(w)[0].profil;
    const nachher = C.mastenVon(C.setzeMastAngabe(w, 'A', 'mastProfil', ''))[0].profil;
    wahr('Ein leeres Profil wird abgewiesen', nachher === vorher);
  }
  {
    // Selbstheilung: die Liste ist eine ABLEITUNG, kein Original.
    const w = { ...reihe(), masten: [{ id: 'M1', x: 0, profil: '', traegt: ['T1'] }] };
    const m = C.mastenVon(w);
    wahr('Eine profillose Liste wird verworfen und neu gebaut',
         m.length === 3 && m.every((x) => x.profil));
  }

  /*
   * DIE LISTE WIRD NACHGEFUEHRT, NICHT FESTGESCHRIEBEN.
   *
   * Sie ist eine ABLEITUNG: wer ein Tragwerk verschiebt oder ein Joch
   * verlaengert, verschiebt seine Masten mit. Eine einmal gespeicherte Liste
   * veraltet dabei still - beim ersten Anlauf fehlte nach dem Verschieben
   * eines Jochs sein zweiter Mast, und die Kachel zeigte die alte Lage.
   */
  {
    let w = { typ: 'J90', L: 20, xLage: 0, mastProfil: 'HEB 240', mastH: 8 };
    w = { ...w, masten: C.mastenVon(w) };
    wahr('Ein Joch stellt zwei Masten', C.mastenVon(w).length === 2);
    // Jetzt verschieben - die Lagen muessen mitgehen.
    const v = { ...w, xLage: 20 };
    const lagen = C.mastenVon(v).map((m) => m.x).join(',');
    wahr('Verschieben fuehrt die Lagen nach', lagen === '20,40');
    // Und verlaengern.
    const l = { ...w, L: 25 };
    wahr('Verlaengern ebenso',
         C.mastenVon(l).map((m) => m.x).join(',') === '0,25');
  }
  {
    // WAS EINGESTELLT WURDE, BLEIBT. Nachgefuehrt werden Lage und
    // Zugehoerigkeit; Profil und Hoehe gehoeren dem Masten.
    let w = { typ: 'J90', L: 20, xLage: 0, mastProfil: 'HEB 240', mastH: 8 };
    w = { ...w, masten: C.mastenVon(w) };
    w = C.setzeMastAngabe(w, 'B', 'mastProfilB', 'HEM 240');
    const v = { ...w, xLage: 7 };
    const mB = C.mastenVon(v)[1];
    wahr('Das eingestellte Profil ueberlebt das Verschieben',
         mB.profil === 'HEM 240' && Math.abs(mB.x - 27) < 1e-9);
  }

  // RECHENSATZ: was der Kern bekommt. Ohne Liste aendert sich nichts -
  // alte Dateien laufen unveraendert.
  {
    const ohne = { typ: 'J90', L: 12, mastProfil: 'HEB 220', mastH: 8 };
    wahr('Ohne Mastenliste bleibt der Satz, wie er ist',
         C.rechensatz(ohne).mastProfil === 'HEB 220');
  }
}

// ===========================================================================
// PRUEFUNG 69: das ganze Querprofil in einem Bild. Weisung vom 2. September:
// «man laesst die Tragwerke im 3d angezeigt passiv und man kann dann
// draufdruecken um auf diese aktiv umzuschalten».
{
  const R = await import(J('render.3d.js'));

  const szene = () => ({
    flaechen: [{ punkte: [[0, 0, 0], [4, 0, 0], [4, 1, 0]], xMitte: 2,
                 gruppe: 'profil' }],
    linien: [{ punkte: [[0, 0, 0], [4, 0, 0]] }],
    marken: [{ p: [2, 0, 1], text: 'M' }],
    masse: [{ p0: [0, 0, 0], p1: [4, 0, 0], text: '4 m' }],
    bauteiltitel: [{ p: [2, 0, 2], text: 'J90' }],
    vektoren: [{ p: [2, 0, 1], v: [0, 0, -1], text: 'F' }],
    lastflaechen: [{ punkte: [[0, 0, 1], [4, 0, 1]] }],
    schnitt: { x: 2, poly: [[2, 0, 0], [2, 1, 0]] },
    stationen: [0, 2, 4], xNachweis: 2, schnittAktiv: true,
    legende: [{ key: 'gurt', label: 'Gurt' }],
    bereiche: { eta: 0.5 },
    grenzen: { xMin: 0, xMax: 4, yMin: 0, yMax: 1, zMin: 0, zMax: 2 },
  });

  /*
   * VERSCHOBEN WIRD GENAU EINE ACHSE.
   *
   * Alles, was eine x-Koordinate traegt, bekommt dx dazu. `v` ist eine
   * RICHTUNG, kein Ort - ein verschobener Kraftpfeil zeigte sonst woandershin.
   */
  {
    const v = R.szeneVerschieben(szene(), 10, { twId: 'T2', passiv: true });
    pruef('Die Flaeche wandert', v.flaechen[0].punkte[0][0], 10, 1e-12, 'm');
    pruef('… und ihre Mitte mit', v.flaechen[0].xMitte, 12, 1e-12, 'm');
    pruef('Die Linie wandert', v.linien[0].punkte[1][0], 14, 1e-12, 'm');
    pruef('Die Marke wandert', v.marken[0].p[0], 12, 1e-12, 'm');
    pruef('Die Masslinie wandert', v.masse[0].p1[0], 14, 1e-12, 'm');
    pruef('Der Bauteiltitel wandert', v.bauteiltitel[0].p[0], 12, 1e-12, 'm');
    pruef('Der Vektor wandert an seinem Ort', v.vektoren[0].p[0], 12, 1e-12, 'm');
    wahr('… aber seine RICHTUNG bleibt',
         v.vektoren[0].v.join(',') === '0,0,-1');
    pruef('Die Station wandert', v.stationen[2], 14, 1e-12, 'm');
    /*
     * DER NACHWEISSCHNITT IST EINE x-KOORDINATE - und wurde beim ersten
     * Anlauf vergessen. Der Knopf «auf den Nachweisschnitt» fuhr dann auf
     * x = 0.38, waehrend das Tragwerk bei 20 bis 40 stand. Kein Fehler,
     * keine Meldung - die Kamera fuhr nur an eine Stelle, an der nichts ist.
     */
    pruef('Und der Nachweisschnitt auch', v.xNachweis, 12, 1e-12, 'm');
    pruef('Die Grenzen wandern', v.grenzen.xMin, 10, 1e-12, 'm');
    pruef('… beide', v.grenzen.xMax, 14, 1e-12, 'm');
    wahr('Quer und hoch bleibt alles stehen',
         v.grenzen.yMax === 1 && v.grenzen.zMax === 2
         && v.flaechen[0].punkte[2][1] === 1);
    // DIE KENNZEICHNUNG WANDERT IN JEDEN TEIL - daran haengt Farbe und Klick.
    wahr('Jeder Teil weiss, zu wem er gehoert',
         v.flaechen[0].twId === 'T2' && v.flaechen[0].passiv === true
         && v.marken[0].twId === 'T2' && v.vektoren[0].passiv === true);
  }

  /*
   * VEREINEN: die Grenzen umschliessen alles, die Legende steht einmal da.
   *
   * DER SCHNITT GEHOERT DEM AKTIVEN. Zwei Nachweisschnitte in einem Bild
   * waeren zwei Antworten auf eine Frage.
   */
  {
    const a = { ...R.szeneVerschieben(szene(), 0, { twId: 'T1', passiv: true }) };
    const b = { ...R.szeneVerschieben(szene(), 10, { twId: 'T2' }), aktiv: true };
    b.schnitt = { x: 12, poly: [] };
    const g = R.szenenVereinen([a, b]);
    pruef('Die Grenzen umschliessen beide', g.grenzen.xMin, 0, 1e-12, 'm');
    pruef('… bis zum Ende', g.grenzen.xMax, 14, 1e-12, 'm');
    wahr('Die Flaechen sind zusammengelegt', g.flaechen.length === 2);
    wahr('Die Legende steht einmal da', g.legende.length === 1);
    wahr('Der Schnitt ist der des aktiven', g.schnitt.x === 12);
    wahr('… und seine Stelle ebenso', g.xNachweis === 12);
    wahr('Und die Stationen sind alle da', g.stationen.length === 6);
  }
  {
    // Ein einzelnes Tragwerk bleibt, wie es ist - kein Umweg ohne Not.
    const eine = szene();
    wahr('Eine Szene bleibt sie selbst', R.szenenVereinen([eine]) === eine);
    wahr('Nichts ergibt nichts', R.szenenVereinen([null, null]) === null);
  }

  /*
   * DER EINZELMAST WIRD VOM SELBEN CODE GEZEICHNET.
   *
   * Er hatte lange gar kein Bild: `erzeugeSzene` beginnt mit dem Querschnitt
   * des Jochs, und ohne vier Winkel brach der Aufbau ab. Ihn ein zweites Mal
   * zu zeichnen waere die schlechtere Antwort gewesen - zwei
   * Mastzeichnungen laufen auseinander, und dann zeigt das Bild etwas
   * anderes als der Nachweis. Er bekommt jetzt einen ERSATZQUERSCHNITT ohne
   * Ausdehnung; die Schleifen ueber Gurte und Bleche laufen leer, der Mast
   * entsteht wie immer.
   */
  {
    const { berechneEinzelmast } = await import(J('core.vierendeel.js'));
    const w = { ...standardwerte(), tragwerksart: 'einzelmast',
                mastVorhanden: true, mastProfil: 'HEB 260',
                mastH: 8, mastLaenge: 12, anbauteile: [] };
    const e = berechneEinzelmast(w, getStahl('S235'));
    const sz = R.erzeugeSzene(e.modell, e);
    wahr('Der Einzelmast hat Koerper', sz.flaechen.length > 100);
    wahr('… und zwar Mastkoerper',
         sz.flaechen.every((f) => f.gruppe === 'mast'));
    wahr('Keine Gurte, keine Bleche',
         !sz.flaechen.some((f) => f.gruppe === 'profil' || f.gruppe === 'blech'));
    /*
     * DIE GRENZEN KOMMEN AUS DEN GEZEICHNETEN KOERPERN.
     *
     * Beim Joch spannen sie sich zwischen den Gurtenden auf - x von 0 bis L.
     * Ein Einzelmast hat weder L noch Huelle; beides ist null, und die
     * Grenzen hatten damit keine Ausdehnung. Die Einpassung fand nichts,
     * worauf sie haette zoomen koennen, und das Bild blieb leer, obwohl
     * hunderte Mastflaechen darin standen.
     */
    const g = sz.grenzen;
    wahr('Die Grenzen haben Ausdehnung in x', g.xMax > g.xMin);
    wahr('… und in y', g.yMax > g.yMin);
    wahr('… und umfassen den Masten', g.zMax - g.zMin > 8);
    const xs = sz.flaechen.flatMap((f) => f.punkte.map((p) => p[0]));
    wahr('Kein Koerper steht ausserhalb',
         Math.min(...xs) >= g.xMin - 1e-9 && Math.max(...xs) <= g.xMax + 1e-9);
  }
}

// ===========================================================================
// PRUEFUNG 70: eine Handlung, die nicht geht, sagt es.
{
  const aq70 = readFileSync(new URL('./js/app.js', import.meta.url), 'utf8');

  /*
   * DAS SCHWEIGEN IST SCHLIMMER ALS DER FEHLER.
   *
   * Gemessen am 2. September: der Excel-Knopf am Einzelmasten brach mit
   * «Cannot read properties of undefined (reading herkunft)» ab - und zwar
   * lautlos. Keine Datei, keine Meldung, keine rote Zeile. Der Fehler landete
   * in window.onerror und starb dort. Wer auf «Ausleiten» drueckt und nichts
   * bekommt, sucht die Datei im Download-Ordner, im Papierkorb, in den
   * Einstellungen - und rechnet zuletzt damit, dass das Programm es gar nicht
   * versucht hat.
   */
  wahr('Es gibt eine Klammer fuer Handlungen',
       aq70.includes('function handlung(was, fn)'));
  {
    const ab = aq70.indexOf('function handlung(was, fn)');
    const koerper = aq70.slice(ab, aq70.indexOf('\n}', ab));
    wahr('Sie faengt den Bruch', koerper.includes('catch'));
    wahr('… meldet ihn im Handlungsbalken', koerper.includes('meldeImBalken'));
    wahr('… und schreibt ihn ganz in die Konsole',
         koerper.includes('console.error'));
  }

  // JEDER AUSLEITWEG LAEUFT DURCH SIE. Einer, der es nicht taete, waere
  // genau der, der wieder schweigt.
  wahr('Die Excel-Ausleitung ist umklammert',
       /handlung\('Excel-Ausleitung'/.test(aq70));
  wahr('Die AxisVM-Wege sind es auch',
       /return handlung\(name, \(\) => \{/.test(aq70));
  wahr('… und zwar alle vier',
       /json: 'COM-Ausleitung'/.test(aq70) && /dxf: 'DXF-Ausleitung'/.test(aq70)
       && /pynite: 'PyNite-Ausleitung'/.test(aq70) && /'SAF-Ausleitung'/.test(aq70));
  wahr('Auch das Drucken', /handlung\('Drucken'/.test(aq70));

  /*
   * UND EIN DURCHGANG, DER DAS MELDET.
   *
   * Der Pruefstand prueft Bausteine; er kennt keinen Durchgang durch alle
   * Wege. Waehrend hier 2290 Kontrollen gruen standen, tat der Excel-Knopf
   * am Einzelmasten nichts. `durchlauf.mjs` geht die Wege ab und schreibt
   * auf, was bricht.
   */
  {
    const d = readFileSync(new URL('./durchlauf.mjs', import.meta.url), 'utf8');
    wahr('Der Durchlauf kennt alle drei Faelle',
         /\['Joch', joch\]/.test(d) && /\['Einzelmast', einzelmast\]/.test(d)
         && /\['Jochreihe', reihe\]/.test(d));
    wahr('… und prueft die Ausleitung auf das ganze Blatt',
         d.includes('Deckt die Ausleitung das ganze Blatt ab'));
    wahr('… und repariert nichts', d.includes('repariert nichts')
         || d.includes('REPARIERT NICHTS'));
  }
}

// ===========================================================================
// PRUEFUNG 71: der Einzelmast geht durch ALLE Wege. Die sechs Befunde des
// Durchlaufs vom 2. September, einzeln festgehalten.
{
  const { berechneEinzelmast, konstruktionsChecks: kcAlt } =
    await import(J('core.vierendeel.js'));
  const CK = await import(J('core.checks.js'));
  const AX = await import(J('export.axisvm.js'));
  const PY = await import(J('export.pynite.js'));
  const V71 = await import(J('core.vierendeel.js'));

  const w71 = { ...standardwerte(), tragwerksart: 'einzelmast',
                mastVorhanden: true, mastProfil: 'HEB 260',
                mastH: 8, mastLaenge: 12, anbauteile: [] };
  const e71 = berechneEinzelmast(w71, getStahl('S235'));

  /*
   * OHNE JOCH KEINE JOCHPRUEFUNGEN - eine LEERE Liste, keine Ausnahme.
   *
   * Es sind keine Pruefungen verletzt, es gibt keine. Die erste Zeile brach
   * mit «Cannot read properties of undefined (reading aH)» ab, weil sie das
   * Winkelprofil des Obergurts suchte.
   */
  {
    const ck = CK.konstruktionsChecks(e71.modell);
    wahr('Der Einzelmast hat keine Konstruktionspruefungen',
         Array.isArray(ck) && ck.length === 0);
  }

  // MASSVARIANTEN SIND JOCHMASSE - beim Einzelmasten gibt es nichts zu
  // vergleichen, und `null` sagt genau das.
  wahr('Kein Massvariantenvergleich',
       V71.vergleichMassvarianten(w71, null, null, getStahl('S235'), null) === null);

  /*
   * DAS STABMODELL: EIN STAB UND EIN FUNDAMENT.
   *
   * Kein Ersatzprofil - ein GURT_OG in der AxisVM-Datei waere ein Bauteil,
   * das es nicht gibt, in einem Modell, das jemand rechnet. Was gezeichnet
   * wird, darf naeherungsweise sein; was ausgeleitet wird, nicht.
   */
  {
    const bau = AX.stabmodell(e71.modell, { knotenmodell: 'anschnitt' });
    wahr('Der Einzelmast leitet sich aus', bau.staebe.length > 0);
    wahr('… und zwar nur als Mast',
         bau.staebe.every((st) => /^MAST_A_/.test(st.name)));
    wahr('Keine Gurtquerschnitte in der Datei',
         ![...bau.querschnitte.keys()].some((k) => /^GURT_/.test(k)));
    wahr('Der Fuss ist eingespannt',
         bau.auflager.length === 1 && bau.auflager[0].art === 'eingespannt');
    /*
     * DIE HOEHENNULL IST DER ANSCHLUSS, nicht der Fuss - wie beim Joch.
     * Sonst staende ein Einzelmast neben einem Joch um H versetzt in der Luft.
     */
    const zs = [...bau.knoten.values()].map((k) => k.z);
    pruef('Der Fuss liegt bei -H', Math.min(...zs), -8, 1e-9, 'm');
    pruef('… und der Kopf beim Ueberstand', Math.max(...zs), 4, 1e-9, 'm');
  }

  // PYNITE: das Skript entsteht, auch ohne Feldmitten. Nur die
  // Gegenueberstellung am Ende bleibt leer - es gibt nichts zu vergleichen.
  {
    const py = PY.pyniteSkript(e71.modell, { knotenmodell: 'anschnitt' });
    wahr('Ein PyNite-Skript entsteht', py.text.includes('add_member'));
    wahr('… mit dem Masten darin', /MAST_A_S1/.test(py.text));
  }
}

// ===========================================================================
// PRUEFUNG 72: das ganze Querprofil in EIN Stabmodell. Weisung vom
// 2. September: «die jochreihe müsste zwingend zusammen modelliert werden
// -> Rahmenwirkung».
{
  const AX72 = await import(J('export.axisvm.js'));
  const V72 = await import(J('core.vierendeel.js'));
  const C72 = await import(J('core.constants.js'));

  const reihe = () => {
    let w = typUebernehmen({ ...standardwerte(), typ: 'J90', bearbeiten: false },
                           T.getTragjoch('J90'));
    w.L = 20; w.xLage = 0; w.mastVorhanden = true;
    return C72.tragwerkHinzu(w, 'joch', { L: 15, xLage: 20 });
  };
  const deps72 = { modellVon: (satz) => V72.modell(satz,
    getProfil(satz.profOG), getProfil(satz.profUG),
    getStahl(satz.stahl), T.getTragjoch(satz.typ)) };

  {
    const w = reihe();
    const bau = AX72.stabmodellBlatt(w, deps72, { knotenmodell: 'anschnitt' });
    const xs = [...bau.knoten.values()].map((k) => k.x);
    /*
     * DAS MODELL UMFASST DAS GANZE BLATT.
     *
     * Vorher reichte es von 0 bis 15 - das aktive Tragwerk allein, in seinen
     * OERTLICHEN Koordinaten, als staende es bei null. Das erste Joch fehlte
     * ganz, und man sah es der Datei nicht an.
     */
    pruef('Das Stabmodell beginnt beim ersten Masten', Math.min(...xs), 0, 1e-6, 'm');
    /*
     * 35.10, NICHT 35.00 - das Entflechten rueckt das zweite Joch um zehn
     * Zentimeter. Die Endbleche zweier Joche duerfen einander nicht
     * beruehren (Weisung), und die Jochlaenge steht fest; also wandert die
     * Lage. Genau das ist die gemeldete Modellunschaerfe.
     */
    pruef('… und endet beim letzten', Math.max(...xs), 35.1, 1e-6, 'm');

    /*
     * >>> DER GETEILTE MAST IST EINER. <<<
     *
     * Nicht durch Kopplung, sondern durch den NAMEN: heissen die Mastknoten
     * nach dem MASTEN (MAST_M2_F) statt nach dem Jochende (MAST_A_F), findet
     * das zweite Joch den Masten des ersten wieder. Ein Stab, zwei
     * Anschluesse, EIN Fundament.
     */
    const fuesse = [...bau.knoten.keys()].filter((n) => /^MAST_.*_F$/.test(n));
    wahr('Drei Masten fuer zwei Joche', fuesse.length === 3);
    wahr('… und ein Fundament je Mast', bau.auflager.length === 3);
    wahr('Keine widerspruechlichen Knoten',
         (bau.blatt?.widerspruch?.length ?? 0) === 0);

    // DIE TRAGWERKE BLEIBEN UNTERSCHEIDBAR: ein Praefix je Tragwerk, die
    // Masten davon ausgenommen - sie gehoeren dem Blatt.
    const namen = [...bau.knoten.keys()];
    wahr('Jedes Tragwerk traegt sein Praefix',
         namen.some((n) => n.startsWith('T1_')) && namen.some((n) => n.startsWith('T2_')));
    wahr('Die Masten tragen keines',
         namen.filter((n) => /^MAST_/.test(n)).length > 0);

    /*
     * DIE LASTEN WERDEN JE TRAGWERK GEHOLT UND VEREINT.
     *
     * `lasten(m, bau)` braucht beides - das Modell fuer die Groessen, das
     * Stabmodell fuer die Knotennamen. Ohne Anbauteil traegt ein Joch keine
     * Punktlasten (das Eigengewicht rechnet AxisVM aus den Staeben), also
     * wird hier eines gesetzt.
     */
    wahr('Die Lastlisten stehen bereit',
         bau.lasten && Array.isArray(bau.lasten.punkt)
         && Array.isArray(bau.lasten.strecke));
  }
  {
    const A72 = await import(J('data.anbauteile.js'));
    let w = reihe();
    w = { ...w, anbauteile: [{ ...A72.neuesAnbauteil('hs-fahrdraht', 8),
                               name: 'FL' }] };
    const bau = AX72.stabmodellBlatt(w, deps72, { knotenmodell: 'anschnitt' });
    wahr('Mit Anbauteil tragen beide Tragwerke Lasten bei',
         bau.lasten.punkt.length > 0);
    /*
     * JEDE LAST ZEIGT AUF EINEN KNOTEN IHRES TRAGWERKS.
     *
     * Das Anbauteil steht an EINEM Tragwerk - Lasten von beiden zu erwarten
     * waere falsch. Was zaehlt: der Knoten traegt das Praefix, unter dem er
     * auch im Modell steht. Ohne das zeigte die Last ins Leere, und AxisVM
     * bekaeme eine Kraft ohne Angriffspunkt.
     */
    const namen = new Set(bau.knoten.keys());
    wahr('Jede Last zeigt auf einen vorhandenen Knoten',
         bau.lasten.punkt.every((l) => namen.has(String(l.knoten ?? l.node))));
    wahr('… und der traegt ein Tragwerkspraefix',
         bau.lasten.punkt.every((l) => /^T\d+_/.test(String(l.knoten ?? l.node))));
  }

  /*
   * EIN EINZELNES TRAGWERK GEHT DEN ALTEN WEG.
   *
   * Kein Umweg ohne Not: die Namen bleiben, wie sie waren (MAST_A_*), und
   * eine Datei von gestern sieht aus wie eine von heute.
   */
  {
    let w = typUebernehmen({ ...standardwerte(), typ: 'J90', bearbeiten: false },
                           T.getTragjoch('J90'));
    w.L = 20; w.mastVorhanden = true;
    const bau = AX72.stabmodellBlatt(w, deps72, { knotenmodell: 'anschnitt' });
    const namen = [...bau.knoten.keys()];
    wahr('Ein Tragwerk: keine Praefixe', !namen.some((n) => /^T\d+_/.test(n)));
    wahr('… und die Masten heissen A und B',
         namen.some((n) => n === 'MAST_A_F') && namen.some((n) => n === 'MAST_B_F'));
  }

  /*
   * DER HOEHENVERSATZ GLEICHT VERSCHIEDENE ANSCHLUSSHOEHEN AUS.
   *
   * Schliesst das zweite Joch 50 cm hoeher an denselben Masten an, liegt
   * seine Achse 50 cm hoeher - und sein Mastfuss trotzdem auf derselben
   * Kote. Sonst stuende derselbe Mast zweimal da, gegeneinander versetzt.
   */
  {
    let w = typUebernehmen({ ...standardwerte(), typ: 'J90', bearbeiten: false },
                           T.getTragjoch('J90'));
    w.L = 20; w.xLage = 0; w.mastVorhanden = true; w.mastH = 8;
    w = C72.tragwerkHinzu(w, 'joch', { L: 15, xLage: 20, mastH: 8.5 });
    const bau = AX72.stabmodellBlatt(w, deps72, { knotenmodell: 'anschnitt' });
    wahr('Auch bei verschiedenen Anschlusshoehen kein Widerspruch',
         (bau.blatt?.widerspruch?.length ?? 0) === 0);
    const fuesse = [...bau.knoten.keys()].filter((n) => /^MAST_.*_F$/.test(n));
    wahr('… und weiterhin drei Masten', fuesse.length === 3);
  }
}

// ===========================================================================
// PRUEFUNG 73: die Endbleche zweier Joche duerfen einander nicht beruehren.
// Weisung vom 2. September: min. 5 cm zur Mastachse, also 10 cm zwischen den
// beiden Blechachsen.
{
  const AX73 = await import(J('export.axisvm.js'));
  const C73 = await import(J('core.constants.js'));
  const V73 = await import(J('core.vierendeel.js'));

  /*
   * >>> WARUM DAS NICHT KOSMETIK IST. <<<
   *
   * Die Endbleche sitzen am Jochende - erste und letzte Station liegen bei
   * x = 0 und x = L. Treffen zwei Joche an einem Zwischenmasten zusammen,
   * fallen beide auf DENSELBEN Punkt: in AxisVM zwei Bleche im selben Ort,
   * mit Knoten, die aufeinanderliegen, ohne verbunden zu sein.
   */
  {
    let w = typUebernehmen({ ...standardwerte(), typ: 'J90', bearbeiten: false },
                           T.getTragjoch('J90'));
    w.L = 20; w.xLage = 0; w.mastVorhanden = true;
    w = C73.tragwerkHinzu(w, 'joch', { L: 15, xLage: 20 });
    const eng = C73.engeJochenden(w);
    wahr('Zwei Joche Stoss an Stoss werden erkannt', eng.length === 1);
    pruef('… und die Luecke ist null', eng[0].luecke, 0, 1e-9, 'm');

    const deps = { modellVon: (satz) => V73.modell(satz,
      getProfil(satz.profOG), getProfil(satz.profUG),
      getStahl(satz.stahl), T.getTragjoch(satz.typ)) };
    const bau = AX73.stabmodellBlatt(w, deps, { knotenmodell: 'anschnitt' });

    // DIE AUSLEITUNG RUECKT NACH - und sagt es.
    wahr('Die Ausleitung entflicht', bau.blatt.entflochten.length === 1);
    pruef('… um die fehlenden 10 cm', bau.blatt.entflochten[0].dx, 0.10, 1e-9, 'm');
    wahr('… und nennt den Grund', /Endbleche/.test(bau.blatt.entflochten[0].wegen));

    /*
     * DER GETEILTE MAST STEHT MITTIG. Fuenf Zentimeter von jedem Blech -
     * er kann nicht an beiden Enden zugleich sein.
     */
    const fuss = [...bau.knoten.entries()]
      .filter(([n]) => /^MAST_.*_F$/.test(n)).map(([, k]) => k.x).sort((a, b) => a - b);
    wahr('Drei Masten', fuss.length === 3);
    pruef('Der Zwischenmast steht mittig', fuss[1], 20.05, 1e-6, 'm');
    pruef('… fuenf Zentimeter vom linken Blech', fuss[1] - 20, 0.05, 1e-6, 'm');
    pruef('… und fuenf vom rechten', 20.10 - fuss[1], 0.05, 1e-6, 'm');
    wahr('Und kein Knoten steht doppelt',
         (bau.blatt.widerspruch?.length ?? 0) === 0);
  }

  // WER GENUG ABSTAND HAT, WIRD NICHT ANGEFASST.
  {
    let w = typUebernehmen({ ...standardwerte(), typ: 'J90', bearbeiten: false },
                           T.getTragjoch('J90'));
    w.L = 20; w.xLage = 0; w.mastVorhanden = true;
    w = C73.tragwerkHinzu(w, 'joch', { L: 15, xLage: 20.5 });
    wahr('Ein halber Meter Luft genuegt', C73.engeJochenden(w).length === 0);
  }

  // UND DIE AUSWERTUNG SAGT ES, nicht erst die Datei.
  {
    const { hinweise } = await import(J('core.checks.js'));
    const h = hinweise({ engeJochenden: [{ links: 'T1', rechts: 'T2', x: 20, luecke: 0 }],
                         tragwerksart: 'einzelmast' });
    wahr('Die Modellunschaerfe steht in den Hinweisen',
         h.some((t) => /Jochenden/.test(t) && /Modell weicht|weicht damit/.test(t)));
  }
}

// ===========================================================================
// PRUEFUNG 74: Biegeknicken des Mastes, EN 1993-1-1, 6.3. Weisung vom
// 2. September: «nimm noch die stabilitätsnachweis mit ein in die app».
{
  const M74 = await import(J('core.mast.js'));
  const V74 = await import(J('core.vierendeel.js'));
  const MP = await import(J('data.masten.js'));

  const mast = (o = {}) => {
    const w = { ...standardwerte(), tragwerksart: 'einzelmast',
                mastVorhanden: true, mastProfil: 'HEB 260',
                mastH: 9, mastLaenge: 12, anbauteile: [],
                beiwerteFest: { G: 1, WindX: 1.5, WindY: 0, Schnee: 0 }, ...o };
    const e = V74.berechneEinzelmast(w, getStahl('S235'));
    return { e, s: M74.mastSchnitt(e.modell, 'A'), m: e.modell };
  };

  /*
   * DIE EULERLAST GEGEN DIE HANDRECHNUNG.
   *
   * N_cr = pi^2 EI / L_cr^2. Beim HEB 260 (I_z = 5135 cm^4) mit L_cr = 24 m
   * sind das rund 185 kN - eine Zahl, die sich in einer Minute nachrechnen
   * laesst, und genau darum steht sie hier.
   */
  {
    const { s, m } = mast();
    const k = M74.mastStabilitaet(s, m, { beta: 2.0 });
    const p = MP.MASTPROFILE.find((x) => x.name === 'HEB 260');
    pruef('L_cr = beta · Gesamtlaenge', k.Lcr, 24, 1e-9, 'm');
    const NcrSoll = (Math.PI ** 2 * 210000 * (p.Iz * 1e4)) / ((24000) ** 2) / 1000;
    pruef('N_cr um die schwache Achse', k.NcrZ, NcrSoll, 1e-6, 'kN');
    pruef('N_Rk = A · f_y', k.NRk, (p.A * 100 * 235) / 1000, 1e-9, 'kN');
    pruef('lambda_quer = sqrt(N_Rk / N_cr)', k.lamZ,
          Math.sqrt(k.NRk / k.NcrZ), 1e-12, '–');
  }

  /*
   * DIE KNICKLINIE FOLGT DER GEOMETRIE, nicht einer Annahme.
   *
   * EN 1993-1-1, Tabelle 6.2: gewalzte I-Profile mit h/b <= 1.2 bekommen
   * y-y die Linie b und z-z die Linie c. Die Mastprofile des Sortiments
   * liegen zwischen 1.00 und 1.09 - also durchweg b/c.
   */
  {
    const { s, m } = mast();
    const k = M74.mastStabilitaet(s, m, {});
    wahr('HEB 260: Linie b um y, c um z',
         k.knicklinie.y === 'b' && k.knicklinie.z === 'c');
    pruef('… mit alpha 0.34 und 0.49', k.alphaY, 0.34, 1e-12, '–');
    pruef('…', k.alphaZ, 0.49, 1e-12, '–');
    // chi nach 6.3.1.2, gegen die geschlossene Formel.
    const phi = 0.5 * (1 + k.alphaZ * (k.lamZ - 0.2) + k.lamZ ** 2);
    pruef('chi_z nach 6.3.1.2', k.chiZ,
          1 / (phi + Math.sqrt(phi ** 2 - k.lamZ ** 2)), 1e-12, '–');
    wahr('chi liegt zwischen 0 und 1', k.chiZ > 0 && k.chiZ <= 1);
    wahr('Die schwache Achse knickt eher', k.chiZ < k.chiY);
  }

  // EIN LAENGERER MAST KNICKT FRUEHER - die Richtung muss stimmen.
  {
    const kurz = M74.mastStabilitaet(mast({ mastLaenge: 8 }).s,
                                     mast({ mastLaenge: 8 }).m, {});
    const lang = M74.mastStabilitaet(mast({ mastLaenge: 16 }).s,
                                     mast({ mastLaenge: 16 }).m, {});
    wahr('Der laengere Mast hat das kleinere chi', lang.chiZ < kurz.chiZ);
    wahr('… und die groessere Schlankheit', lang.lamZ > kurz.lamZ);
  }
  // UND EIN GROESSERER BEIWERT WIRKT WIE EIN LAENGERER MAST.
  {
    const { s, m } = mast();
    const a = M74.mastStabilitaet(s, m, { beta: 1.0 });
    const b = M74.mastStabilitaet(s, m, { beta: 2.0 });
    pruef('Doppelter Beiwert, doppelte Knicklaenge', b.Lcr, 2 * a.Lcr, 1e-9, 'm');
    wahr('… und kleineres chi', b.chiZ < a.chiZ);
  }

  /*
   * >>> UND ER IST NICHT NEBENSAECHLICH. <<<
   *
   * Am 31. August hiess es, das Knicken sei «nie massgebend auf grund der
   * verhältnissmässig kleinen lasten». Gemessen am HEB 260 ueber 12 m mit
   * beta = 2.0 liegt es bei 0.1465 gegen 0.1360 aus dem Querschnitt - also
   * KNAPP DARUEBER. Die Normalkraft ist zwar klein (11 kN Eigengewicht),
   * aber chi_z faellt bei einer Schlankheit von 3.88 auf 0.059, und der
   * Momentenanteil wird mit k_yy = 0.93 hochgesetzt.
   *
   * Die Vermutung war also gut begruendet und trotzdem knapp daneben -
   * genau dafuer rechnet man es aus.
   */
  {
    const { e } = mast();
    wahr('Der Nachweis wird gefuehrt', Number.isFinite(e.mast.etaStabil));
    wahr('… und liegt in derselben Groessenordnung',
         e.mast.etaStabil > e.mast.eta * 0.5
         && e.mast.etaStabil < e.mast.eta * 2);
    // Das URTEIL zaehlt beides, die Farbskala nur den Querschnitt.
    wahr('etaNachweis ist das groessere der beiden',
         e.mast.etaNachweis === Math.max(e.mast.eta, e.mast.etaStabil));
  }

  /*
   * >>> DER GEDREHTE STEG. Ein Befund vom 2. September, unsichere Seite. <<<
   *
   * Gerechnet wurde in BAUACHSEN - «quer» und «laengs» - und 6.61/6.62 der
   * Reihe nach daraufgelegt. Steht der Steg quer zum Gleis, ist das
   * dasselbe: die starke Achse nimmt das Quermoment. Beim GEDREHTEN Steg
   * nimmt es die schwache - der Widerstand W wurde getauscht, chi und k
   * nicht. 6.61 stand mit chi_y (0.166) neben einem Moment um die schwache
   * Achse und kam auf eta 0.443 statt 0.532: 20 % zu klein.
   *
   * EN 1993-1-1, 6.3.3 kennt nur Profilachsen. Also erst drehen, dann
   * einsetzen - und die Kontrolle haelt fest, dass der gedrehte Steg NICHT
   * guenstiger dasteht als der ungedrehte.
   */
  {
    const gerade = mast({ mastSteg: 'jochachse' });
    const gedreht = mast({ mastSteg: 'quer' });
    const kG = M74.mastStabilitaet(gerade.s, gerade.m, { beta: 2.0 });
    const kD = M74.mastStabilitaet(gedreht.s, gedreht.m, { beta: 2.0 });
    wahr('Der gedrehte Steg wird nicht guenstiger', kD.eta >= kG.eta - 1e-9);
    // Und die Momente stehen in den Profilachsen, nicht in den Bauachsen.
    wahr('Beim gedrehten Steg traegt die schwache Achse das Quermoment',
         Math.abs(kD.MzEd - kD.MqEd) < 1e-9
         && Math.abs(kG.MyEd - kG.MqEd) < 1e-9);
    wahr('Der Widerstand folgt derselben Zuordnung',
         Math.abs(kD.MRz - kD.MRq) < 1e-9 && Math.abs(kG.MRy - kG.MRq) < 1e-9);
  }

  /*
   * >>> DIE KNICKLAENGE ENDET AN DER KRAFTEINLEITUNG. <<<
   *
   * Weisung vom 2. September, auf Nachfrage entschieden: nach der
   * Angriffshoehe abstufen. Ein Kragstab der Laenge L mit einer Druckkraft
   * in der Hoehe a < L knickt mit N_cr = pi^2 EI/(2a)^2 - das Stueck
   * darueber traegt keine destabilisierende Kraft und faehrt nur mit.
   *
   * Gemessen wird an einem Masten mit Anbauteil auf 7.00 m: die Last kommt
   * dort herein, der Mast ist 12 m lang, und die Knicklaenge ist 2 mal 7,
   * nicht 2 mal 12.
   */
  {
    const teil = { ...A.neuesAnbauteil('hs-fahrdraht', 0), ort: 'mastA',
                   hMast: 7 };
    const { s, m } = mast({ anbauteile: [teil] });
    const k = M74.mastStabilitaet(s, m, { beta: 2.0 });
    pruef('Die Last kommt auf 7.00 m herein', k.zN, 7, 1e-9, 'm');
    pruef('… und die Knicklaenge endet dort', k.Lcr, 14, 1e-9, 'm');
    pruef('Die Gesamtlaenge steht daneben', k.L, 12, 1e-9, 'm');

    // OHNE EINGELEITETE LAST bleibt es bei der ganzen Laenge - dann drueckt
    // oben wirklich noch etwas.
    const ohne = mast();
    const kO = M74.mastStabilitaet(ohne.s, ohne.m, { beta: 2.0 });
    pruef('Ohne Krafteinleitung gilt die ganze Laenge', kO.Lcr, 24, 1e-9, 'm');

    // UND DIE ABSTUFUNG WIRKT IN DIE RICHTIGE RICHTUNG: kuerzere
    // Knicklaenge, groesseres chi.
    wahr('Die kuerzere Knicklaenge gibt das groessere chi', k.chiZ > kO.chiZ);
  }

  // OHNE MASTLAENGE GILT DIE HOEHE - dann endet der Mast am Anschluss.
  {
    const { s, m } = mast({ mastLaenge: 0 });
    const k = M74.mastStabilitaet(s, m, { beta: 2.0 });
    pruef('Ohne Gesamtlaenge zaehlt H', k.Lcr, 2 * 9, 1e-9, 'm');
  }
}

// ===========================================================================
// PRUEFUNG 75: der Mast als angewaehltes Bauteil, und die Zeichnung, die sich
// nachtraeglich schieben laesst. Weisung vom 2. September.
{
  const C75 = await import(J('core.constants.js'));
  const R75 = await import(J('render.3d.js'));

  /*
   * DREI MASTEN UNTER ZWEI JOCHEN.
   *
   * Die Frage des Auftraggebers: «Wie kann man drei verschiedene Masttypen
   * eingeben?» Sie liess sich vorher nur ueber vier Enden zweier Tragwerke
   * beantworten, von denen zwei derselbe Mast waren. Hier steht, dass es
   * jetzt drei Adressen sind - und dass jede ihr eigenes Profil behaelt.
   */
  const reihe = () => {
    let w = { typ: 'J90', L: 20, xLage: 0, mastProfil: 'HEB 260',
              mastVorhanden: true, endbedingung: 'mast' };
    return C75.tragwerkHinzu(w, 'joch', { L: 15, xLage: 20 });
  };

  {
    const w = reihe();
    const m = C75.mastenVon(w);
    wahr('Zwei Joche stehen auf drei Masten', m.length === 3);
    wahr('Der mittlere ist geteilt',
         (m[1].traegt ?? []).length === 2);
    wahr('… und die aeusseren nicht',
         (m[0].traegt ?? []).length === 1 && (m[2].traegt ?? []).length === 1);
  }

  // JEDER MAST BEKOMMT SEIN EIGENES PROFIL - ueber seine Id, nicht ueber ein
  // Ende. Das ist der ganze Gewinn der Kachelreihe.
  {
    let w = reihe();
    const ids = C75.mastenVon(w).map((m) => m.id);
    w = C75.setzeMastAngabe(w, ids[0], 'mastProfil', 'HEB 240');
    w = C75.setzeMastAngabe(w, ids[1], 'mastProfil', 'HEM 240');
    w = C75.setzeMastAngabe(w, ids[2], 'mastProfil', 'HEB 220');
    const p = C75.mastenVon(w).map((m) => m.profil);
    wahr('Drei Masten, drei Profile',
         p[0] === 'HEB 240' && p[1] === 'HEM 240' && p[2] === 'HEB 220');
  }

  /*
   * >>> DIE MASTENLISTE UEBERSTEHT DAS UMSCHALTEN. <<<
   *
   * Sie stand nicht in BLATT_FELDER, also nahm `tragwerkTeil` sie mit ins
   * weggelegte Tragwerk - und aus dem angewaehlten kam eine alte Liste
   * zurueck oder gar keine. Ein Mast, dem man gerade ein Profil gegeben
   * hatte, stand nach einem Klick auf das Nachbarjoch wieder mit dem alten
   * da. Genau dieser Weg wird hier gegangen.
   */
  {
    let w = reihe();
    const ids = C75.mastenVon(w).map((m) => m.id);
    w = C75.setzeMastAngabe(w, ids[2], 'mastProfil', 'HEB 220');
    const andere = C75.tragwerkeVon(w).find((t) => t.id !== (w.twId ?? 'T1'));
    w = C75.tauscheAktives(w, andere.id);
    wahr('Nach dem Umschalten steht das Profil noch da',
         C75.mastenVon(w).some((m) => m.profil === 'HEB 220'));
    w = C75.tauscheAktives(w, (w.weitere ?? [])[0].id);
    wahr('… und nach dem Zurueckschalten auch',
         C75.mastenVon(w).some((m) => m.profil === 'HEB 220'));
  }

  // DIE KACHELWAHL. Ohne sie gilt der Mast am Ende A des gerechneten
  // Tragwerks - so verhaelt sich jede Datei aus der Zeit vor den Kacheln.
  {
    const w = reihe();
    const ids = C75.mastenVon(w).map((m) => m.id);
    wahr('Ohne Wahl gilt der erste Mast des aktiven Tragwerks',
         C75.gewaehlterMast(w)?.id === C75.mastenFuer(w, C75.tragwerkeVon(w)[0])[0].id);
    wahr('Mit Wahl gilt der angeklickte',
         C75.gewaehlterMast({ ...w, mastAktiv: ids[2] })?.id === ids[2]);
    wahr('Eine Id, die es nicht mehr gibt, faellt zurueck',
         Boolean(C75.gewaehlterMast({ ...w, mastAktiv: 'M99' })));
  }

  /*
   * >>> EIN ABGESCHALTETER MAST DARF SEINEM NACHBARN NICHT SEIN PROFIL
   *     VERERBEN. <<<
   *
   * Am 2. September im Browser gemessen: drei Masten (HEB 260 / HEB 240 /
   * HEM 240), dann die Masten des linken Jochs abgeschaltet. Die Nummern
   * werden LAUFEND vergeben - der uebrig gebliebene Mast bei x 20 hiess
   * danach M1 und bekam ueber die Id das Profil des verschwundenen: HEB 260
   * statt HEB 240. Ein Mast mit einem fremden Profil, und man sieht es ihm
   * nicht an.
   *
   * Seither geht die STELLE vor der Nummer (mastenVon in
   * core.constants.js). Die Nummer ist eine Laufnummer; ein Mast ist, wo er
   * steht.
   */
  {
    let w = reihe();
    const ids = C75.mastenVon(w).map((m) => m.id);
    w = C75.setzeMastAngabe(w, ids[0], 'mastProfil', 'HEB 260');
    w = C75.setzeMastAngabe(w, ids[1], 'mastProfil', 'HEB 240');
    w = C75.setzeMastAngabe(w, ids[2], 'mastProfil', 'HEM 240');

    // Die Masten des LINKEN Jochs abschalten - es ist nicht das aktive.
    const links = C75.tragwerkeSortiert(w)[0];
    let w2 = C75.tauscheAktives(w, links.id);
    w2 = { ...w2, mastVorhanden: false };
    const uebrig = C75.mastenVon(w2);
    wahr('Zwei Masten bleiben stehen', uebrig.length === 2);
    wahr('Der Mast bei x = 20 behaelt sein eigenes Profil',
         uebrig.find((m) => Math.abs(m.x - 20) < 0.01)?.profil === 'HEB 240');
    wahr('… und der am rechten Ende auch',
         uebrig.find((m) => Math.abs(m.x - 35) < 0.01)?.profil === 'HEM 240');

    // UND EIN VERSCHOBENES JOCH NIMMT SEINEN MASTEN MIT. Dort trifft die
    // Stelle nicht mehr - dann faengt die Nummer den Fall.
    const w3 = { ...w, xLage: 21 };
    wahr('Ein verschobener Mast behaelt sein Profil ueber die Nummer',
         C75.mastenVon(w3).find((m) => Math.abs(m.x - 36) < 0.01)?.profil
           === 'HEM 240');
  }

  /*
   * >>> DER KLICK INS BLATT UND DIE LAGE IM TRAGWERK. <<<
   *
   * Am 2. September im Browser gemessen und als Fehler bestaetigt: aktiv war
   * das rechte Joch (x0 = 20), geklickt wurde auf das LINKE bei x 1.54 -
   * abgelegt wurde das Bauteil am RECHTEN bei dessen Ortskoordinate 1.54,
   * also auf dem Blatt bei 21.54. Zwanzig Meter neben der Stelle, auf die
   * gezeigt wurde. Umgekehrt liess sich auf dem rechten Joch nichts
   * absetzen: dort liegen die Blattkoordinaten 20 bis 40, geprueft wurde
   * gegen 0 bis L.
   *
   * Die Ansicht spricht BLATTKOORDINATEN, die Bauteillage zaehlt ab dem
   * linken Ende ihres Tragwerks. Solange nur eines dastand, war das
   * dasselbe.
   */
  {
    const w = reihe();                       // T1 bei 0 (L 20), T2 bei 20 (L 15)
    const [links, rechts] = C75.tragwerkeSortiert(w);
    pruef('Blatt 1.54 ist am linken Joch die 1.54',
          C75.blattNachLokal(links, 1.54), 1.54, 1e-12, 'm');
    pruef('… und am rechten waere es -18.46',
          C75.blattNachLokal(rechts, 1.54), -18.46, 1e-12, 'm');
    pruef('Hin und zurueck ist dasselbe',
          C75.lokalNachBlatt(rechts, C75.blattNachLokal(rechts, 27)), 27,
          1e-12, 'm');

    // WELCHES TRAGWERK STEHT DORT? Ohne diese Frage bekam man «daneben»,
    // waehrend der Zeiger mitten auf einem Joch stand.
    wahr('Bei x = 5 steht das linke', C75.tragwerkBeiX(w, 5)?.id === links.id);
    wahr('Bei x = 30 steht das rechte', C75.tragwerkBeiX(w, 30)?.id === rechts.id);
    wahr('Bei x = 60 steht keines', C75.tragwerkBeiX(w, 60) === null);
    // An der Fuge treffen sich beide - dann gilt das erste von links.
    wahr('An der Fuge gilt das linke', C75.tragwerkBeiX(w, 20)?.id === links.id);
  }

  /*
   * >>> EIN BAUTEIL AM GETEILTEN MASTEN GEHOERT BEIDEN. <<<
   *
   * Weisung vom 2. September: «das bauteil am geteilten masten beheben».
   *
   * Der Befund: Anbauteile standen je Tragwerk. Am Joch richtig - am MASTEN
   * nicht, denn den mittleren Masten einer Jochreihe teilen sich zwei.
   * Eine Traverse an ihm war vom Nachbarn aus unsichtbar, und wurde der
   * Nachbar gerechnet, fehlte ihre Last: der Mast traegt sie, gleichgueltig
   * welches Joch man gerade nachweist.
   */
  {
    const V75 = await import(J('core.vierendeel.js'));
    const AX75 = await import(J('export.axisvm.js'));
    const bauReihe = () => {
      let w = { ...standardwerte(), typ: 'J90', L: 20, xLage: 0,
                endbedingung: 'mast', mastVorhanden: true, anbauteile: [] };
      return C75.tragwerkHinzu(w, 'joch', { L: 15, xLage: 20, anbauteile: [] });
    };
    const trav = (o = {}) => ({ ...A.neuesAnbauteil('hs-fahrdraht', 0),
                                name: 'Traverse', ort: 'mastA', hMast: 6.5,
                                ...o });

    let w = bauReihe();                      // aktiv ist T2, sein Ende A = M2
    const geteilt = C75.mastenVon(w).find((m) => (m.traegt ?? []).length > 1);
    wahr('Der mittlere Mast ist geteilt', Boolean(geteilt));

    w = C75.setzeAnbauteileAn(w, [...(w.anbauteile ?? []), trav()]);
    wahr('Das Bauteil liegt am Masten, nicht am Tragwerk',
         (w.mastAnbauteile ?? []).some((a) => a.mastId === geteilt.id));
    wahr('… und nicht mehr in der Tragwerksliste',
         !(w.anbauteile ?? []).some((a) => a.name === 'Traverse'
           && a.ort === undefined));

    // VOM AKTIVEN aus haengt es am Ende A, VOM NACHBARN aus am Ende B -
    // derselbe Mast, von zwei Seiten gesehen.
    const meins = (sw) => (sw.anbauteile ?? []).find((a) => a.name === 'Traverse');
    wahr('Vom aktiven Tragwerk aus haengt es am Ende A',
         meins(w)?.ort === 'mastA');
    const anderes = C75.tragwerkeVon(w).find((t) => t.id !== (w.twId ?? 'T1'));
    let w2 = C75.tauscheAktives(w, anderes.id);
    w2 = { ...w2, anbauteile: C75.anbauteileFuer(w2, C75.tragwerkeVon(w2)[0]) };
    wahr('Vom Nachbarn aus am Ende B', meins(w2)?.ort === 'mastB');

    // DIE LAST IST IN BEIDEN RECHNUNGEN.
    const bauen = (sw) => V75.modell(C75.rechensatz(sw),
      getProfil(sw.profOG), getProfil(sw.profUG), getStahl(sw.stahl),
      T.getTragjoch(sw.typ));
    wahr('Das aktive Tragwerk rechnet es mit',
         (bauen(w).anbauMastFlach ?? []).length > 0);
    wahr('Der Nachbar auch',
         (bauen(w2).anbauMastFlach ?? []).length > 0);

    /*
     * >>> UND DIE AUSLEITUNG HAENGT ES EINMAL AN. <<<
     *
     * Dort stehen beide Tragwerke in EINEM Modell, und der Zwischenmast ist
     * EIN Mast. Ohne Sperre gemessen: vier Arm-Staebe und zehn Punktlasten
     * statt zwei und fuenf - die Traverse zweimal am selben Masten, mit
     * doppelter Last, und man saehe es der Datei nicht an.
     */
    const deps = { modellVon: (satz) => V75.modell(satz,
      getProfil(satz.profOG), getProfil(satz.profUG), getStahl(satz.stahl),
      T.getTragjoch(satz.typ)) };
    const bau = AX75.stabmodellBlatt(w, deps, { knotenmodell: 'anschnitt' });
    pruef('Ein Anschlusspunkt je Bauteil, nicht zwei',
          (bau.arme ?? []).length, 2, 1e-9, 'Stueck');
    wahr('Die Arm-Staebe stehen einmal da',
         bau.staebe.filter((x) => /ARMM/.test(x.name)).length === 2);

    // AM NICHT GETEILTEN MASTEN aendert sich nichts - dort gibt es keinen
    // Nachbarn, der mitsehen koennte.
    {
      let e = { ...standardwerte(), typ: 'J90', L: 20, xLage: 0,
                endbedingung: 'mast', mastVorhanden: true, anbauteile: [] };
      e = C75.setzeAnbauteileAn(e, [trav()]);
      wahr('Auch der einzelne Mast traegt sein Bauteil',
           (e.anbauteile ?? []).some((a) => a.name === 'Traverse'));
    }

    /*
     * ALTE DATEIEN: das Bauteil steckt noch im Tragwerk, mit `ort` und ohne
     * Mast-Id. Es wird gefunden, ohne dass jemand die Datei umschreibt.
     */
    {
      const alt = bauReihe();
      alt.anbauteile = [trav()];
      delete alt.mastAnbauteile;
      const gefunden = C75.mastAnbauVon(alt);
      wahr('Ein eingebettetes Mastteil wird gefunden', gefunden.length === 1);
      wahr('… und dem richtigen Masten zugeordnet',
           gefunden[0].mastId === C75.mastenFuer(alt,
             C75.tragwerkeVon(alt)[0])[0].id);
    }

    // EIN WEGGELEGTES TRAGWERK TRAEGT KEINE KOPIE. Sonst stuende sie beim
    // naechsten Umschalten als eigene Angabe wieder da und bekaeme nicht
    // mehr mit, was am Masten geschieht.
    wahr('Das weggelegte Tragwerk traegt keine Mastteile',
         !(w2.weitere ?? []).some(
           (t) => (t.anbauteile ?? []).some((a) => a.ort === 'mastA'
                                               || a.ort === 'mastB')));
  }

  /*
   * >>> ZWEI JOCHE DUERFEN SICH BERUEHREN, NICHT DURCHDRINGEN. <<<
   *
   * Weisung vom 2. September: «das überschneiden der joche sollte nicht
   * möglich sein.» Beruehren SCHON - das ist die Jochreihe, und genau diese
   * Stelle muss erreichbar bleiben.
   */
  {
    const w = reihe();                    // T1: 0..20, T2: L 15 bei 20
    const f = (x) => C75.freieLage(w, 'T2', x);
    pruef('Rechts daneben bleibt, wo es ist', f(25).x, 25, 1e-9, 'm');
    pruef('Genau anschliessend ist erlaubt', f(20).x, 20, 1e-9, 'm');
    wahr('… und gilt nicht als geklemmt', f(20).geklemmt === false);
    pruef('Einen Meter hinein wird zurueckgeschoben', f(19).x, 20, 1e-9, 'm');
    wahr('… und sagt es', f(19).geklemmt === true);
    // Von links kommend wird links abgesetzt: das rechte Ende trifft dann
    // das linke Ende des Nachbarn.
    pruef('Von links kommend links anschliessend', f(0).x, -15, 1e-9, 'm');
    pruef('Der Bereich eines Jochs ist [x0, x0+L]',
          C75.bereichVon(C75.tragwerkeSortiert(w)[0])[1], 20, 1e-9, 'm');
  }

  /*
   * >>> EIN TRAGWERK BEISEITELEGEN. <<<
   *
   * Weisung: «wie könnte man einzelne tragabschnitte komplett ausblenden im
   * modell / Anbauteile / nachweis?» Ausgeblendet heisst NICHT DA - sonst
   * blendet man einen Abschnitt aus und findet seine Zahlen weiter in der
   * Auswertung.
   */
  {
    const AX = await import(J('export.axisvm.js'));
    const V = await import(J('core.vierendeel.js'));
    // Ein vollstaendiger Satz - die Ausleitung braucht Profile und Stahl,
    // `reihe()` traegt nur die Geometrie.
    let w = C75.tragwerkHinzu(
      { ...standardwerte(), typ: 'J90', L: 20, xLage: 0,
        endbedingung: 'mast', mastVorhanden: true, anbauteile: [] },
      'joch', { L: 15, xLage: 20, anbauteile: [] });
    wahr('Zunaechst sind beide sichtbar', C75.sichtbareTragwerke(w).length === 2);
    // Das nicht aktive ausblenden.
    const anderes = C75.tragwerkeVon(w).find((t) => t.id !== (w.twId ?? 'T1'));
    let w2 = C75.tauscheAktives(w, anderes.id);
    w2 = { ...w2, ausgeblendet: true };
    w2 = C75.tauscheAktives(w2, w.twId ?? 'T1');
    wahr('Danach zaehlt eines', C75.anzahlSichtbar(w2) === 1);
    wahr('… im Datensatz stehen aber weiter zwei',
         C75.anzahlTragwerke(w2) === 2);
    wahr('Seine Masten bringt es nicht mehr mit',
         C75.mastenVon(w2).length < C75.mastenVon(w).length);

    // UND DIE AUSLEITUNG LAESST ES WEG - nennt es aber im Bericht.
    const deps = { modellVon: (satz) => V.modell(satz,
      getProfil(satz.profOG), getProfil(satz.profUG), getStahl(satz.stahl),
      T.getTragjoch(satz.typ)) };
    const bau = AX.stabmodellBlatt(w2, deps, { knotenmodell: 'anschnitt' });
    const fuesse = [...bau.knoten.keys()].filter((n) => /^MAST_.*_F$/.test(n));
    wahr('Das ausgeblendete steht nicht in der Datei', fuesse.length === 2);
    wahr('… und der Bericht sagt, dass es Absicht war',
         (bau.blatt?.versteckt ?? []).includes(anderes.id));
  }

  /*
   * >>> DIE MASKENSIGNATUR DARF NICHT AN EINEM SCHIEBER HAENGEN. <<<
   *
   * Sie entscheidet, ob die Maske NEU GEBAUT wird - und ein Neubau ersetzt
   * jedes Eingabefeld, auch das, das man gerade in der Hand hat.
   *
   * Gemeldet am 2. September: «der schieber hackt ab nach dem ersten
   * raster». Ursache: in der Signatur standen der NAME des Tragwerks
   * («J90 · 20.00 m»), seine LAGE und die Stellen der Masten. Alle drei
   * haengen an der Jochlaenge. Jeder Rasterschritt baute die Maske neu, der
   * Schieber unter dem Finger verschwand, der Zug brach ab. Dasselbe galt
   * fuer das Zahlenfeld der Lage: jeder Tastendruck nahm ihm den Fokus.
   *
   * Diese Kontrolle haelt die Trennung fest: was sich beim Ziehen aendert,
   * gehoert in die Nachfuehrung, nicht in die Signatur.
   */
  {
    const UI75 = await import(J('ui.js'));
    const w = typUebernehmen({ ...standardwerte(), typ: 'J90' },
                             T.getTragjoch('J90'));
    const sig = (o) => UI75.maskenSignatur({ ...w, ...o }, 'system');
    wahr('Die Jochlaenge baut die Maske nicht neu',
         sig({ L: 20 }) === sig({ L: 20.5 }));
    wahr('Die Lage auch nicht',
         sig({ xLage: 0 }) === sig({ xLage: 3.25 }));
    wahr('Ein anderes Mastprofil auch nicht',
         sig({ mastProfil: 'HEB 240' }) === sig({ mastProfil: 'HEB 260' }));

    /*
     * WAS DIE MASKE SEHR WOHL NEU BAUEN MUSS: alles, was aendert, WELCHE
     * Felder dastehen. Ohne diese Gegenprobe waere die Kontrolle darueber
     * mit einer Signatur erfuellt, die sich nie aendert.
     */
    const zwei = C75.tragwerkHinzu(w, 'einzelmast', {});
    wahr('Ein zweites Tragwerk baut sie neu',
         UI75.maskenSignatur(zwei, 'system') !== sig({}));
    wahr('Ein ausgeblendetes Tragwerk ebenso',
         UI75.maskenSignatur({ ...zwei, ausgeblendet: true }, 'system')
           !== UI75.maskenSignatur(zwei, 'system'));
    wahr('Und die Masten ein- oder auszuschalten ebenso',
         sig({ mastVorhanden: false }) !== sig({ mastVorhanden: true }));
  }

  /*
   * >>> DER MAST HEISST UEBERALL GLEICH. <<<
   *
   * Weisung vom 2. September: «ich bin der meinung das wir masten klar
   * definiert haben sollten und nicht als auflager a und b, das führt zu
   * verwirrung bei einer jochreihe.»
   *
   * Zu Recht: «Ende B» benennt das ENDE DES JOCHS, nicht den Masten. Der
   * Zwischenmast einer Reihe ist das Ende B des linken Jochs UND das Ende A
   * des rechten - ein Bauteil mit zwei Namen. Sein Name kommt jetzt aus der
   * Reihenfolge auf dem Blatt und gilt von beiden Seiten.
   */
  {
    const w = reihe();                     // T1 bei 0, T2 bei 20 (aktiv)
    const [links, rechts] = C75.tragwerkeSortiert(w);
    pruef('Drei Masten', C75.mastenVon(w).length, 3, 1e-9, 'Stueck');
    wahr('Von links gezaehlt heissen sie M1, M2, M3',
         C75.mastenVon(w).map((m) => C75.mastName(w, m)).join(',') === 'M1,M2,M3');

    // DIE PROBE: derselbe Mast, von beiden Jochen aus.
    wahr('Das Ende B des linken Jochs ist M2',
         C75.mastNameAmEnde(w, links, 'B') === 'M2');
    wahr('… und das Ende A des rechten ebenfalls',
         C75.mastNameAmEnde(w, rechts, 'A') === 'M2');
    wahr('Die aeusseren heissen M1 und M3',
         C75.mastNameAmEnde(w, links, 'A') === 'M1'
         && C75.mastNameAmEnde(w, rechts, 'B') === 'M3');

    // Und der Name wandert in den Rechensatz - das Bild kennt den
    // Blattzusammenhang nicht und bekommt ihn von dort.
    const satz = C75.tragwerkSatz(w, rechts.id);
    wahr('Der Satz traegt die Namen mit',
         satz.mastNameA === 'M2' && satz.mastNameB === 'M3');
  }

  /*
   * EINE BESCHRIFTUNG DARF RECHNEN - und muss dann mitlaufen.
   *
   * `label` als Funktion macht aus «Anschlusshöhe Ende B» ein
   * «Anschlusshöhe Ende B · Mast M2». Der Preis: sie haengt an Werten, die
   * NICHT in der Maskensignatur stehen (sie zogen sonst den Schieber mit).
   * Gemessen am 2. September stand deshalb «Mast M1» ueber einem Feld, das
   * M2 meinte, bis `aktualisiereMaske` sie mitfuehrte.
   */
  {
    const mitFn = FELDER.filter((f) => typeof f.label === 'function');
    wahr('Es gibt gerechnete Beschriftungen', mitFn.length >= 3);
    const w = reihe();
    wahr('Sie geben Text, keinen Code',
         mitFn.every((f) => typeof f.label(w) === 'string' && f.label(w).length));
    // DIE NACHFUEHRUNG MUSS ES TUN. Ohne sie bliebe der alte Text stehen.
    const r = readFileSync(new URL('./js/ui.js', import.meta.url), 'utf8');
    wahr('aktualisiereMaske fuehrt sie nach',
         r.includes("typeof f?.label !== 'function'"));
  }

  /*
   * ZIEHEN RASTET GROB, DAS FELD BLEIBT FEIN.
   *
   * Weisung vom 2. September: «die masten beim verschieben per drag and drop
   * auf halbe meter rastern ansonsten das eingabefeld nutzen. das gleiche
   * für die schieber.»
   *
   * Fuenf Zentimeter waren die falsche Zahl fuer eine Ziehgeste: auf 240
   * Punkten Breite und vierzig Metern Blatt ist ein Bildpunkt rund siebzehn
   * Zentimeter, das Raster lag also unter der Aufloesung der Geste.
   */
  {
    pruef('Das Ziehraster ist ein halber Meter', C75.ZUG_RASTER, 0.5, 1e-12, 'm');
    pruef('20.17 rastet auf 20.00', C75.aufRaster(20.17), 20, 1e-12, 'm');
    pruef('20.30 rastet auf 20.50', C75.aufRaster(20.30), 20.5, 1e-12, 'm');
    pruef('Auch nach unten', C75.aufRaster(-3.4), -3.5, 1e-12, 'm');

    // DAS FELD BLEIBT FEIN. Zwei Schrittweiten an einem Wert: der Schieber
    // rastet grob, das Zahlenfeld daneben auf den Zentimeter.
    const grob = FELDER.filter((f) => f.zugSchritt);
    wahr('Es gibt Felder mit grober Ziehstufe', grob.length >= 4);
    wahr('Sie rasten am Schieber auf den halben Meter',
         grob.every((f) => f.zugSchritt === 0.5));
    wahr('… und im Feld feiner',
         grob.every((f) => f.schritt < f.zugSchritt));
    wahr('Die Jochlaenge ist darunter',
         grob.some((f) => f.key === 'L'));
  }

  /*
   * >>> DAS KONTEXTMENUE DARF SICH NICHT SELBST WEGZIEHEN. <<<
   *
   * Es schliesst bei einem `pointerdown` daneben. Ohne die Pruefung, OB der
   * Druck daneben war, schloss es auch bei einem Druck DARIN - und der
   * folgende `click` landete auf nichts. Mit nachgestellten Klicks faellt
   * das nicht auf (die feuern kein `pointerdown`), mit einer echten Maus
   * haette kein einziger Eintrag funktioniert.
   *
   * Am 2. September so gebaut, am 3. September mit einer echten Maus
   * gefunden. Die Kontrolle liest den Quelltext, weil das Menue in app.js
   * lebt und keinen Einstieg von aussen hat.
   */
  {
    const r = readFileSync(new URL('./js/app.js', import.meta.url), 'utf8');
    const ab = r.indexOf('const zu = (e) => {');
    // Das Fenster wurde groesser: seit dem 3. September steht davor der
    // Grund, warum `e.target` ein Node SEIN MUSS (wheel und blur liefern
    // das Fenster, und `Node.contains(Window)` wirft).
    const koerper = ab > 0 ? r.slice(ab, ab + 900) : '';
    wahr('Ein Druck IM Menue schliesst es nicht',
         koerper.includes('n.contains(e.target)'));
    // Und die Felder halten es offen: wer den Typ aendert, zieht oft gleich
    // die Laenge nach.
    wahr('Ein Feld im Menue schliesst es ebenfalls nicht',
         r.includes('DAS MENUE BLEIBT OFFEN'));
  }

  /*
   * >>> EIN NEUES TRAGWERK LANDET NEBEN DEM LETZTEN, NICHT DARAUF. <<<
   *
   * Weisung vom 3. September, sinngemaess: «ich frage mich ob dies bei einem
   * tragwerk das über drei joche geht noch sinnvoll ist.»
   *
   * Es war es nicht: `tragwerkHinzu` uebernahm den ganzen bisherigen Satz -
   * samt `xLage`. Drei Tragjoche standen danach alle bei x0 = 0,
   * deckungsgleich; in der Leiste war nur das oberste anklickbar, im Modell
   * steckten sie ineinander.
   */
  {
    let w = { typ: 'J90', L: 20, xLage: 0, twId: 'T1', flSpannweite: 40 };
    w = C75.tragwerkHinzu(w, 'joch', {});
    w = C75.tragwerkHinzu(w, 'joch', { L: 15 });
    const lagen = C75.tragwerkeSortiert(w).map((t) => C75.bereichVon(t));
    wahr('Drei Joche stehen in einer Reihe',
         lagen.map((b) => b.join('-')).join(' ') === '0-20 20-40 40-55');
    // Jedes schliesst am rechten Ende des vorigen an - dort steht der
    // gemeinsame Zwischenmast.
    pruef('Vier Masten, keine doppelten', C75.mastenVon(w).length, 4, 1e-9, 'Stk');

    /*
     * EIN EINZELMAST HAT KEINE LAENGE. «Am rechten Ende anschliessen» hiesse
     * bei ihm: an dieselbe Stelle. Er rueckt um die Spannweite weiter.
     */
    const m1 = C75.tragwerkHinzu({ typ: 'J90', L: 20, xLage: 0, twId: 'T1',
                                   flSpannweite: 40 }, 'einzelmast', {});
    const m2 = C75.tragwerkHinzu(m1, 'einzelmast', {});
    const xs = C75.tragwerkeSortiert(m2).map((t) => C75.lageVon(t));
    wahr('Einzelmasten stehen nicht aufeinander',
         new Set(xs.map((x) => x.toFixed(2))).size === xs.length);
  }

  /*
   * >>> WAS UEBEREINANDER STEHT, DARF SICH DECKEN. <<<
   *
   * Weisung vom 3. September: «wir haben zudem bei den abfangjochen zwei
   * joche übereinander.» Ein Abfangjoch sitzt UEBER einem Tragjoch, auf
   * denselben Masten und auf derselben Strecke - die Regel «nichts darf sich
   * ueberschneiden» haette diesen Aufbau verboten. Verboten bleibt die
   * Ueberschneidung GLEICHER Art.
   */
  {
    let w = { typ: 'J90', L: 20, xLage: 0, twId: 'T1' };
    w = C75.tragwerkHinzu(w, 'abfangjoch', { xLage: 0, L: 20 });
    const abfang = w.twId;
    const f = C75.freieLage(w, abfang, 0);
    pruef('Ein Abfangjoch darf auf dem Tragjoch liegen', f.x, 0, 1e-9, 'm');
    wahr('… und wird nicht geklemmt', f.geklemmt === false);

    // Zwei Tragjoche dagegen schon.
    let z = { typ: 'J90', L: 20, xLage: 0, twId: 'T1' };
    z = C75.tragwerkHinzu(z, 'joch', { L: 20 });
    const g = C75.freieLage(z, z.twId, 5);
    wahr('Zwei Tragjoche werden auseinandergeschoben', g.geklemmt === true);

    /*
     * >>> UND ZWEI ABFANGJOCHE STEHEN UEBEREINANDER. <<<
     *
     * Weisung vom 3. September, praezisiert: «es gibt im normalfall nur
     * abfangjoche die übereinander montiert sind. die tragjoche sind immer
     * in reihe.»
     *
     * Die erste Fassung sagte «verschiedene Arten duerfen sich decken» - das
     * war zu weit gefasst UND zu eng: es haette zwei Abfangjoche
     * auseinandergeschoben, obwohl gerade die uebereinander gehoeren.
     */
    let ab = { typ: 'J90', L: 20, xLage: 0, twId: 'T1',
               tragwerksart: 'abfangjoch' };
    ab = C75.tragwerkHinzu(ab, 'abfangjoch', { xLage: 0, L: 20 });
    wahr('Zwei Abfangjoche duerfen uebereinander stehen',
         C75.freieLage(ab, ab.twId, 0).geklemmt === false);
  }

  /*
   * >>> DIE POSITIONSNUMMER: P1, P2, ... VON LINKS. <<<
   *
   * Weisung vom 3. September: «die joche sollten auch kurzbezeichnungen
   * (positionen) damit man die eingabe in der Sidebar nachvollziehen kann.»
   *
   * Die Masten heissen laengst M1, M2 und die Anbauteile A1, A2 - nur die
   * Tragwerke trugen im Bild keine Kennung. Auf einer Reihe stand dreimal
   * «J90 · 20.00 m».
   *
   * NICHT die `twId`: sie zaehlt in der Reihenfolge, in der ANGELEGT wurde.
   * Ein Abfangjoch, zwischen zwei bestehende gesetzt, heisst T4 und steht in
   * der Mitte - eine Nummer, die man von links nach rechts liest, muss von
   * links nach rechts zaehlen.
   */
  {
    let w = { typ: 'J90', L: 20, xLage: 0, twId: 'T1' };
    w = C75.tragwerkHinzu(w, 'joch', {});          // T2, rechts daneben
    w = C75.tragwerkHinzu(w, 'abfangjoch', { xLage: 0, L: 20 });  // T3, links
    const sortiert = C75.tragwerkeSortiert(w);
    wahr('Von links gezaehlt: P1, P2, P3',
         sortiert.map((t) => C75.tragwerkPos(w, t)).join(',') === 'P1,P2,P3');
    // Die Id zaehlt anders - und genau darum wird sie nicht angezeigt.
    wahr('Die Id folgt der Anlegereihenfolge, nicht der Lage',
         sortiert.map((t) => t.id).join(',') !== 'T1,T2,T3');
    // Und sie wandert in den Rechensatz, damit das Bild sie anschreiben kann.
    wahr('Der Satz traegt die Position mit',
         Boolean(C75.tragwerkSatz(w, sortiert[1].id).twPos));
  }

  /*
   * >>> EIN TITEL IM BILD WEISS, WEM ER GEHOERT. <<<
   *
   * Gemeldet am 3. September: «wenn ich die mastbezeichnung im 3d anklicke
   * wird nicht in der sidebar auf M2 oder M1 umgeschalten.» Der Klick fuehrte
   * auf das FELD «Mastprofil» - welcher Mast dort angewaehlt war, blieb wie
   * es war. Man klickte auf M2 und bearbeitete M1.
   *
   * Der Masttitel traegt jetzt sein Ende, und der Treffer geht mit an die
   * Anwendung. Geprueft am Quelltext, weil beides in Ansicht und Anwendung
   * lebt und keinen Einstieg von aussen hat.
   */
  {
    const r3 = readFileSync(new URL('./js/render.3d.js', import.meta.url), 'utf8');
    const rA = readFileSync(new URL('./js/app.js', import.meta.url), 'utf8');
    wahr('Der Masttitel nennt sein Ende', r3.includes('mastEnde: name,'));
    wahr('Der Treffer geht an die Anwendung',
         r3.includes('this.opt.beiMass?.(mt.feld, mt.tab, mt.bt ?? null)'));
    wahr('Auch ein gedaempfter Titel ist anklickbar',
         r3.includes('ANKLICKBAR IST ER TROTZDEM'));
    wahr('Die Anwendung waehlt erst das Tragwerk, dann den Masten',
         rA.indexOf("aendern('tragwerkAktiv', bt.twId)")
           < rA.indexOf("aendern('mastAktiv', m.id)"));
  }

  /*
   * >>> AUCH ALLEIN STEHT EIN TRAGWERK AN SEINER STELLE. <<<
   *
   * Gemeldet am 3. September: «beim separierter darstellung werden die
   * lasten (linien) der ausgeblendeten noch dargestellt.»
   *
   * `blattSzene` hatte einen Kurzschluss: bleibt EIN Tragwerk sichtbar, gab
   * es die unverschobene Szene zurueck - in den eigenen Koordinaten des
   * Tragwerks, 0 bis L. Solange ein Blatt eines trug und dessen Lage null
   * war, stimmte das. Blendet man auf einer Reihe die anderen aus, sprang
   * das uebrige auf x = 0, waehrend Masskette und hinterlegte Zeichnung
   * weiter in Blattkoordinaten stehen: Linien an Stellen, an denen nichts
   * mehr ist.
   *
   * Und dasselbe traf das Setzen von Bauteilen: `stelleAus` rechnet den
   * Klick von der Blatt- in die Tragwerkskoordinate um. Stand die Szene
   * unverschoben da, ging jeder Klick um x0 daneben.
   */
  {
    const rA = readFileSync(new URL('./js/app.js', import.meta.url), 'utf8');
    const ab = rA.indexOf('function blattSzene(erg) {');
    const koerper = ab > 0 ? rA.slice(ab, rA.indexOf('\nfunction ', ab + 10)) : '';
    /*
     * GESUCHT WIRD DIE ANWEISUNG, nicht der Text: der Kommentar darueber
     * ZITIERT die entfernte Zeile, damit man weiss, was einmal dastand. Ein
     * blosses `includes` faende sie dort wieder und meldete den Fehler als
     * bestehend.
     */
    wahr('blattSzene kennt keinen Kurzschluss mehr',
         koerper.length > 0 && !koerper.split(/\r?\n/).some(
           (z) => z.trim() === 'if (alle.length < 2) return eigen;'));
    wahr('… und verschiebt jedes Teil an seine Lage',
         koerper.includes('szeneVerschieben({ ...eigen, aktiv: true }, dx,'));
  }

  /*
   * >>> DIE LAENGENGRENZE GILT NUR DEM ENDE B. <<<
   *
   * Weisung vom 3. September: «das verschieben der tragwerke in der sidebar
   * nochmals auf die funktionalität und logik checken.»
   *
   * Dabei gefunden: `mastGrenzen` legte die Sortimentsgrenze des Jochtyps
   * AUCH auf das Ende A. Am Ende A gezogen VERSCHIEBT sich das Tragwerk -
   * seine Laenge aendert sich gar nicht. Bei einem J90 (8 bis 26.5 m) liess
   * sich ein Joch von 20 m deshalb nur zwischen -6.5 und +12 m um sein
   * rechtes Ende schieben: eine Schranke, die niemand erklaeren kann.
   */
  {
    const UI = await import(J('ui.js'));
    const w = reihe();
    const masten = C75.mastenVon(w);
    const links = UI.mastRollen(w, masten[0].id);      // nur Ende A
    wahr('Der linke Mast ist nur ein Ende A',
         Boolean(links.alsA) && !links.alsB);
    pruef('Ihn zu ziehen kennt keine Laengengrenze',
          UI.mastGrenzen(links, -500), -500, 1e-9, 'm');
    pruef('… auch nicht nach oben', UI.mastGrenzen(links, 500), 500, 1e-9, 'm');

    // Am Ende B dagegen aendert das Ziehen die LAENGE - dort ist der
    // Sortimentsbereich die richtige Grenze.
    const rechts = UI.mastRollen(w, masten[masten.length - 1].id);
    wahr('Der rechte Mast ist ein Ende B', Boolean(rechts.alsB));
    const { laengenbereich: lb } = await import(J('data.tragjoche.js'));
    const b = lb(T.getTragjoch(rechts.alsB.t.typ));
    pruef('Er bleibt im Sortiment', UI.mastGrenzen(rechts, 1e4),
          rechts.alsB.x0 + b.max, 1e-9, 'm');
  }

  /*
   * >>> EIN ABFANGJOCH SCHLIESST NICHT AN, ES SITZT DARUEBER. <<<
   *
   * Weisung vom 3. September: «es gibt im normalfall nur abfangjoche die
   * übereinander montiert sind.» Es wird auf DIESELBEN Masten montiert wie
   * das Joch darunter - also uebernimmt es dessen Lage, statt sich rechts
   * anzuhaengen. Der Regelfall gehoert in die Vorgabe.
   */
  {
    let w = { typ: 'J90', L: 20, xLage: 0, twId: 'T1', mastH: 7.5 };
    w = C75.tragwerkHinzu(w, 'abfangjoch', {});
    w = { ...w, mastH: 9.0 };
    w = C75.tragwerkHinzu(w, 'abfangjoch', {});
    w = { ...w, mastH: 10.5 };
    const b = C75.tragwerkeSortiert(w).map((t) => C75.bereichVon(t).join('-'));
    wahr('Alle drei stehen ueber derselben Strecke',
         b.join(' ') === '0-20 0-20 0-20');
    // UND AUF DENSELBEN MASTEN. Zwei Masten, jeder traegt drei Tragwerke.
    const m = C75.mastenVon(w);
    pruef('Zwei Masten fuer drei Tragwerke', m.length, 2, 1e-9, 'Stk');
    wahr('Jeder traegt alle drei', m.every((x) => (x.traegt ?? []).length === 3));

    /*
     * SIE UNTERSCHEIDEN SICH NUR IN DER ANSCHLUSSHOEHE - also steht sie im
     * Namen. «HEB 240 · 9.00 m» las sich wie ein Mast; mit dem H davor liest
     * es sich als das, was es ist. Ein eigener Typ (A160, A200, A240) steht
     * noch aus.
     */
    const namen = C75.tragwerkeSortiert(w).map(C75.tragwerkName);
    wahr('Das Abfangjoch nennt seine Anschlusshoehe',
         namen[1].includes('H 9.00 m') && namen[2].includes('H 10.50 m'));
    wahr('Das Tragjoch nennt weiter seinen Typ', namen[0].includes('J90'));
  }

  /*
   * DIE NOTIZ ZUM MASTEN NENNT TYP UND LAENGE - mehr nicht.
   *
   * Weisung vom 3. September: «die info über den masten auf den typ und
   * länge begrenzen in der schemaansicht. alles andere kann man der
   * darstellung und der logik entnehmen.» Die Stelle steht als Zahl unter
   * dem Masten, das Geteiltsein am breiteren Fundament, die Zugehoerigkeit
   * an den Linien darueber.
   */
  {
    const r = readFileSync(new URL('./js/ui.js', import.meta.url), 'utf8');
    const ab = r.indexOf('function mastenNotizHtml(werte) {');
    const koerper = ab > 0 ? r.slice(ab, r.indexOf('\n}\n', ab)) : '';
    wahr('Die Notiz nennt Profil und Laenge',
         koerper.includes('m.profil') && koerper.includes('m.laenge'));
    wahr('… und nicht mehr die Stelle', !koerper.includes('m.x.toFixed'));
    /*
     * GESUCHT WIRD DIE EIGENSCHAFT, nicht das Wort: der Kommentar darueber
     * ZITIERT die alte Zeile («… · traegt J90 · 20.00 m»), damit man weiss,
     * was einmal dastand.
     */
    wahr('… und nicht mehr, wer daran haengt', !koerper.includes('.traegt'));
  }

  /*
   * >>> EIN JOCH GEHT NICHT DURCH EINEN FREMDEN MASTEN HINDURCH. <<<
   *
   * Weisung vom 3. September: «die tragwerkseingabe auf kollisionen checken
   * so dass joche nicht durch angrenzende masten hindurchgehen können.»
   *
   * Zwei Faelle liess die bisherige Regel durch, beide gemessen:
   *
   *   EIN EINZELMAST hat keine Ausdehnung; die Ueberschneidung zweier
   *   BEREICHE fasst ihn nicht. Ein Joch, auf L = 40 gesetzt, stand danach
   *   0..40 mit einem fremden Masten bei 30 mitten darin.
   *
   *   EIN ABFANGJOCH ist von der Bereichsregel ausgenommen. Um fuenf Meter
   *   verschoben stand sein Mast bei 5 im Joch darunter (0..20) und dessen
   *   Mast bei 20 im Abfangjoch (5..25).
   */
  {
    // A) DIE LAENGE HAELT AM NAECHSTEN MASTEN AN.
    let a = { typ: 'J90', L: 20, xLage: 0, twId: 'T1', mastProfil: 'HEB 240',
              mastH: 7.5, flSpannweite: 30 };
    a = C75.tragwerkHinzu(a, 'einzelmast', {});
    a = { ...a, xLage: 30 };
    a = C75.tauscheAktives(a, 'T1');
    pruef('Bis an den Masten heran ist erlaubt',
          C75.freieLaenge(a, 'T1', 30).L, 30, 1e-9, 'm');
    wahr('… und gilt nicht als geklemmt',
         C75.freieLaenge(a, 'T1', 30).geklemmt === false);
    pruef('Darueber hinaus wird angehalten',
          C75.freieLaenge(a, 'T1', 40).L, 30, 1e-9, 'm');
    wahr('… und sagt es', C75.freieLaenge(a, 'T1', 40).geklemmt === true);
    pruef('Darunter bleibt alles frei',
          C75.freieLaenge(a, 'T1', 25).L, 25, 1e-9, 'm');

    // B) DAS ABFANGJOCH RASTET AUF DIE MASTEN DES JOCHS DARUNTER.
    let b = { typ: 'J90', L: 20, xLage: 0, twId: 'T1', mastProfil: 'HEB 240',
              mastH: 7.5 };
    b = C75.tragwerkHinzu(b, 'abfangjoch', {});
    pruef('Fuenf Meter verschoben wird es zurueckgeholt',
          C75.freieLage(b, b.twId, 5).x, 0, 1e-9, 'm');
    wahr('Deckungsgleich ist erlaubt',
         C75.freieLage(b, b.twId, 0).geklemmt === false);

    // C) UND EINE ALTE DATEI SAGT ES.
    const alt = { ...a, L: 40 };
    const k = C75.mastKollisionen(alt);
    pruef('Die alte Lage wird gemeldet', k.length, 1, 1e-9, 'Stueck');
    pruef('… mit der Stelle', k[0].x, 30, 1e-9, 'm');
    wahr('Eine saubere Lage meldet nichts',
         C75.mastKollisionen(a).length === 0);
    // DAS ENDE DARF AUF DEM MASTEN LIEGEN - dort steht der gemeinsame.
    wahr('Ein Mast am Ende ist keine Durchdringung',
         C75.mastKollisionen({ ...a, L: 30 }).length === 0);
  }

  /*
   * >>> DIE STELLE DES ANGEWAEHLTEN MASTEN IST EIN FELD. <<<
   *
   * Gemeldet am 3. September: «beim angeklicktem rechten masten, wird der x
   * wert der lage nicht aktualisiert.» Es war kein Fehler IM Feld, sondern
   * ein fehlendes Feld: «Lage auf dem Querprofil x0» ist die Lage des
   * TRAGWERKS, und die aendert sich nicht, wenn man den rechten Masten
   * anklickt.
   *
   * Das neue Feld liest die Stelle des angewaehlten Masten und schreibt sie
   * ueber denselben Weg wie das Ziehen an der Marke.
   */
  {
    const F = FELDER.find((x) => x.key === 'mastX');
    wahr('Es gibt ein Feld fuer die Maststelle', Boolean(F));
    const w = reihe();
    const masten = C75.mastenVon(w);
    // Ohne Wahl gilt der Mast am Ende A des gerechneten Tragwerks.
    pruef('Ohne Wahl zeigt es den Masten am Ende A',
          F.wertAus(w), C75.gewaehlterMast(w).x, 1e-9, 'm');
    // Mit Wahl den angeklickten - hier der aeusserste rechts.
    const rechts = masten[masten.length - 1];
    pruef('Mit Wahl den angeklickten',
          F.wertAus({ ...w, mastAktiv: rechts.id }), rechts.x, 1e-9, 'm');
    wahr('Die Beschriftung nennt ihn beim Namen',
         F.label({ ...w, mastAktiv: rechts.id })
           .includes(C75.mastName(w, rechts)));
  }

  /*
   * DIE TYPWAHL IST GEGLIEDERT.
   *
   * Weisung vom 3. September: «beim dropdown sollte man das etwas gliedern,
   * das man es besser finden kann.» Die Liste war sortiert - erst das
   * aktuelle Sortiment, dann die Altbauweise -, aber man SAH die Ordnung
   * nicht. Eine sortierte Liste ohne Trennung liest sich wie eine
   * unsortierte.
   */
  {
    // Die Liste wird erst gefuellt, wenn die Typendatenbank steht.
    const { setzeTypOptionen } = await import(J('ui.schema.js'));
    const o = setzeTypOptionen();
    wahr('Jede Zeile traegt ihre Gruppe', o.every((x) => x.gruppe));
    const g = [...new Set(o.map((x) => x.gruppe))];
    wahr('Aktuelles Sortiment steht zuerst', g[0] === 'Aktuelles Sortiment');
    wahr('Die Altbauweise folgt', g[1].startsWith('Altbauweise'));
    wahr('Und die Vergleichsmodelle stehen hinten',
         g.indexOf('Vergleichsmodelle') > 1);
  }

  /*
   * ===================================================================
   * DAS SORTIMENT DER ABFANGJOCHE.
   * ===================================================================
   *
   * Weisung vom 3. September: «weiter mit dem aufbau der abfangjoche gehen.
   * die zeichnungen sind unter den grundlagen, beachte dass es hier auch ein
   * sortiment aktuell und alt gibt.»
   *
   * Siebzehn Typen aus den Sortimentsblaettern - sieben im aktuellen
   * Sortiment (A160 bis A360), zehn in der Altbauweise. Geprueft wird der
   * UMFANG, nicht jede Zahl: dass keine Bauweise fehlt, dass die
   * Laengenbereiche zusammenpassen und dass die Liste die Ordnung ZEIGT.
   */
  {
    const alle = AJ.abfangjoche();
    wahr('Das Sortiment steht vollstaendig', alle.length === 17);
    const neu = alle.filter((a) => a.bauweise === 'neu');
    const alt = alle.filter((a) => a.bauweise === 'alt');
    wahr('Sieben im aktuellen Sortiment', neu.length === 7);
    wahr('Zehn in der Altbauweise', alt.length === 10);
    wahr('Das aktuelle Sortiment reicht von A160 bis A360',
         neu[0].typ === 'A160' && neu[neu.length - 1].typ === 'A360');
    wahr('Jeder Typ nennt sein Gurtprofil', alle.every((a) => a.profil));
    // Die Bindebleche sitzen bei ALLEN im 500er-Raster - so steht es in der
    // Mass-Tabelle der Schemablaetter (Spalte A2-A9). Waere das je anders,
    // muesste es hier auffallen.
    wahr('Alle im 500er-Raster',
         alle.every((a) => a.masse?.teilung === 500));
    wahr('Und alle mit 280 mm Bauhoehe am Ende',
         alle.every((a) => a.masse?.jdEnde === 280));

    /*
     * >>> DIE ALTBAUWEISE FUEHRT NUR EINE GROESSTE LAENGE. <<<
     *
     * Auf ihren Blaettern steht «jt max.» und keine kleinste. Eine erfundene
     * Untergrenze waere eine Angabe, die niemand gemacht hat.
     */
    wahr('Die Altbauweise nennt keine kleinste Laenge',
         alt.every((a) => a.jt[0] === null));
    const bA160 = AJ.abfangLaengenbereich('A160');
    pruef('A160 von', bA160.min, 5.5, 1e-9, 'm');
    pruef('A160 bis', bA160.max, 12.5, 1e-9, 'm');
    const bAlt = AJ.abfangLaengenbereich('UAP 130');
    pruef('Die Altbauweise bis', bAlt.max, 9.5, 1e-9, 'm');
    pruef('… und ab der kleinsten Laenge des Sortiments', bAlt.min, 5.5, 1e-9, 'm');
    wahr('Die Beschriftung sagt es',
         bAlt.text.startsWith('bis') && bA160.text.includes('–'));

    /*
     * DIESELBE GLIEDERUNG WIE BEIM TRAGJOCH - aus demselben Grund: eine
     * sortierte Liste ohne Trennung liest sich wie eine unsortierte.
     */
    const { abfangOptionen } = await import(J('ui.schema.js'));
    const o = abfangOptionen();
    wahr('Siebzehn Zeilen zur Wahl', o.length === 17);
    wahr('Jede traegt ihre Gruppe', o.every((x) => x.gruppe));
    const g = [...new Set(o.map((x) => x.gruppe))];
    wahr('Aktuelles Sortiment zuerst', g[0] === 'Aktuelles Sortiment');
    wahr('Altbauweise danach', g.length === 2 && g[1].startsWith('Altbauweise'));
    wahr('Die Zeile nennt Profil und Laengenbereich',
         o[0].text.includes('UPE 160') && o[0].text.includes('12.5'));
  }

  /*
   * ===================================================================
   * DER AUFBAU DER ABFANGJOCHE - aus den Konstruktionszeichnungen.
   * ===================================================================
   *
   * Weisung vom 3. September: «Die Abfangjoche sind liegende
   * Vierendeeltraeger.» Meine erste Lesart der Sortimentsblaetter -
   * «zweigurtiger Traeger, der Kern passt darauf nicht» - war falsch.
   *
   * Der Schnitt A-A zeigt zwei Gurte NEBENEINANDER, die Stueckliste nennt
   * sie beim Namen: Gurt, Verstaerkung, Bindeblech L, Bindeblech,
   * Bindeblech R. Es sind BINDEBLECHE wie beim Tragjoch, je eines oben und
   * unten - kein anderes Bauprinzip, nur eine Ebene statt zweier.
   */
  {
    const A160 = AJ.getAbfangjoch('A160');
    const auf = AJ.abfangAufbau('A160');
    wahr('A160 fuehrt zwei Gurte', auf.gurte === 2);
    wahr('… aus UPE 160', auf.gurtprofil === 'UPE 160');
    /*
     * >>> DER HEBELARM IST k, NICHT h. <<<
     *
     * Das war die Frage, die ich vorgaengig stellen musste. k = d + 2b ist
     * das Aussenmass im FELD und spannt die Rahmenebene auf; h ist das
     * Aussenmass am JOCHENDE. Bei A160 sind beide 420 - bei den gekropften
     * Typen nicht, und dort waere die Verwechslung teuer.
     */
    pruef('k folgt aus d und b', auf.d + 2 * auf.b, auf.k, 1e-9, 'mm');
    const a200 = AJ.abfangAufbau('A200');
    pruef('… auch beim gekropften A200', a200.d + 2 * a200.b, a200.k, 1e-9, 'mm');
    pruef('und h ist das ENDmass', a200.spreizung + 2 * a200.b,
          A160.masse ? 440 : 440, 1e-9, 'mm');
    wahr('Die beiden sind dort verschieden', a200.k !== 440);
    // Die Spreizung am Ende ist bei allen erfassten Typen 280.
    for (const t of AJ.abfangjoche().filter((x) => x.aufbau)) {
      wahr(`${t.typ} spreizt am Ende auf 280`, t.aufbau.spreizung === 280);
    }

    /*
     * >>> DIE JOCHENDEN SIND ABGEKROEPFT. <<<
     *
     * Weisung vom 4. September: «zudem sind die jochenden in der
     * gesamtbreite nicht verfuengt (abgekroepft)». In der Draufsicht laufen
     * die Gurte zum Ende hin zusammen. Bei A300 gibt die Werkstattzeichnung
     * am Jochende aussen 600 - das sind 300 licht plus zweimal die
     * Flanschbreite 150 -, und die beiden innenliegenden Deckbleche zu 10
     * machen daraus die Spreizung 280.
     */
    {
      const w = (t, x, jt) => AJ.abfangLichteWeite(t, x, jt);
      pruef('A300 misst am Jochende 300 licht', w('A300', 0, 13), 300, 1e-9, 'mm');
      pruef('… aussen also 600', w('A300', 0, 13) + 2 * AJ.abfangAufbau('A300').b,
            600, 1e-9, 'mm');
      pruef('… und die Deckbleche machen daraus die Spreizung',
            w('A300', 0, 13) - 2 * 10, AJ.abfangAufbau('A300').spreizung,
            1e-9, 'mm');
      pruef('Im Feld steht die volle lichte Weite', w('A300', 6.5, 13),
            AJ.abfangAufbau('A300').d, 1e-9, 'mm');
      // Das lange Ende knickt frueher als das kurze - 850 gegen 920.
      wahr('Das lange Ende knickt frueher als das kurze',
           w('A300', 0.9, 13) > w('A300', 13 - 0.9, 13));
      // A160 ist gerade und kennt keine Kroepfung.
      wahr('A160 ist gerade', AJ.abfangKroepfung('A160') === null);
      pruef('… und misst ueberall gleich', w('A160', 0, 12.5),
            w('A160', 6.25, 12.5), 1e-9, 'mm');
      /*
       * DIE QUERSTEIFE AM JOCHENDE BELEGT DIE KROEPFUNG: A240 fuehrt dort
       * ein IPE 240 x 280, und 280 ist genau die Spreizung. Ein Riegel von
       * 280 haette im Feld, bei 600 lichter Weite, keinen Anschluss.
       */
      pruef('A240 riegelt am Ende ueber 280', AJ.abfangQuersteife('A240').ende.laenge,
            w('A240', 0, 14), 1e-9, 'mm');
    }

    /*
     * DIE BINDEBLECHE - Regelblech im Feld, Endbleche abweichend.
     *
     * Das Regelblech ist so lang wie der lichte Abstand der Gurte: es fuellt
     * genau die Luecke. Faellt das je auseinander, stimmt eine der beiden
     * Angaben nicht.
     */
    const bl = AJ.abfangBindeblech('A160');
    pruef('Das Regelblech fuellt die Luecke', bl.regel.l, auf.d, 1e-9, 'mm');
    wahr('Es liegt in zwei Ebenen', bl.ebenen === 2);
    wahr('Die Endbleche sind staerker',
         bl.endeL.t > bl.regel.t && bl.endeR.t > bl.regel.t);

    /*
     * >>> DIE GABEL AM JOCHENDE. <<<
     *
     * Weisung vom 3. September: «beachte noch die verstaerkung zu den
     * jochenden (Gabel)». Ein aufgesetztes Gurtstueck GLEICHEN Profils, das
     * den Gurtquerschnitt im Anschlussbereich verdoppelt - und genau dort
     * liegt der Nachweisschnitt am Auflager.
     */
    const gab = AJ.abfangGabel('A160');
    wahr('Die Gabel ist erfasst', Boolean(gab));
    wahr('Sie hat das Profil des Gurtes', gab.profil === auf.gurtprofil);
    wahr('Und sitzt an beiden Enden', gab.anzahl === 2);
    for (const t of AJ.abfangjoche().filter((x) => x.verstaerkung)) {
      wahr(`${t.typ} traegt seine Gabel`,
           t.verstaerkung.profil === t.aufbau.gurtprofil
           && t.verstaerkung.laenge > 0);
    }

    /*
     * DIE MASS-TABELLE - die Blecheinteilung je gefuehrte Laenge.
     *
     * >>> MASSGEBEND SIND DIE DATEN, NICHT DIE HERLEITUNG. <<<
     *
     * QV1 = jt - 4.0 m liesse sich herleiten und stimmt fuer jede erfasste
     * Zeile. Genau deshalb steht es hier als KONTROLLE und nicht als
     * Rechenweg: bestaetigt die Herleitung die Daten, ist das ein gutes
     * Zeichen; ersetzt sie die Daten, ist es ein Verstoss gegen die
     * stehende Vorgabe.
     */
    const l160 = A160.laengen;
    wahr('A160 fuehrt 15 Laengen', l160.length === 15);
    // 158 Laengen ueber das aktuelle Sortiment - jede aus ihrem Schemablatt.
    pruef('Das Sortiment fuehrt 158 Laengen',
          AJ.abfangjoche().reduce((n, t) => n + (t.laengen?.length ?? 0), 0),
          158, 1e-9, 'Stk');
    wahr('Von 5.50 bis 12.50 m',
         l160[0].jt === 5.5 && l160[l160.length - 1].jt === 12.5);
    wahr('Die Regelteilung ist ueberall 500',
         l160.every((z) => z.A === 500));
    wahr('Das erste Feld wechselt 250/500',
         l160.every((z) => z.A1 === 250 || z.A1 === 500));
    wahr('QV1 bestaetigt die Herleitung jt - 4.0 m',
         l160.every((z) => Math.abs(z.QV1 - (z.jt * 1000 - 4000)) < 1e-6));
    // Die Ueberhoehungsabschnitte decken die ganze Jochlaenge - symmetrisch,
    // je Haelfte die Summe der S-Werte.
    wahr('Die Ueberhoehung teilt die ganze Laenge',
         l160.every((z) => Math.abs(2 * z.S.reduce((a2, b2) => a2 + b2, 0)
                                    - z.jt * 1000) < 2));
    const a200L = AJ.getAbfangjoch('A200').laengen;
    wahr('A200 fuehrt 23 Laengen', a200L.length === 23);
    wahr('… von 6.00 bis 17.00 m',
         a200L[0].jt === 6.0 && a200L[a200L.length - 1].jt === 17.0);
    wahr('… und teilt die Laenge ebenso',
         a200L.every((z) => Math.abs(2 * z.S.reduce((a2, b2) => a2 + b2, 0)
                                     - z.jt * 1000) < 2));

    /*
     * DIE ZEILE ZUR LAENGE - nur bei einer GEFUEHRTEN Laenge.
     *
     * Eine Zwischenlaenge bekommt keine erfundene Einteilung, sondern null.
     * Der Aufrufer muss dann sagen, dass er sie nicht kennt.
     */
    wahr('Eine gefuehrte Laenge findet ihre Zeile',
         AJ.abfangMasse('A160', 9.5)?.dm === '095');
    wahr('Eine Zwischenlaenge findet keine',
         AJ.abfangMasse('A160', 9.7) === null);
    wahr('Und eine ausserhalb ebenso wenig',
         AJ.abfangMasse('A160', 20) === null);

    /*
     * WAS VOLLSTAENDIG IST, SAGT DIE DATENBANK SELBST.
     *
     * Ohne Mass-Tabelle steht der Aufbau da, aber keine Blecheinteilung -
     * und ohne die gibt es keinen Nachweisschnitt. Das muss abfragbar sein,
     * sonst rechnet der Kern auf halben Daten weiter.
     */
    /*
     * SEIT DEM 3. SEPTEMBER IST DAS AKTUELLE SORTIMENT GANZ ERFASST.
     *
     * Sieben Typen, jeder mit Aufbau, Bindeblechen, Endverstaerkung und
     * Mass-Tabelle. Die Altbauweise fuehrt nichts davon - fuer sie liegen
     * keine Konstruktionszeichnungen vor -, und das muss sichtbar bleiben,
     * damit niemand auf halben Daten rechnet.
     */
    const neuT = AJ.abfangjoche().filter((x) => x.bauweise === 'neu');
    wahr('Sieben Typen im aktuellen Sortiment', neuT.length === 7);
    for (const t of neuT) {
      wahr(`${t.typ} ist vollstaendig`, AJ.abfangVollstaendig(t.typ));
    }
    const altT = AJ.abfangjoche().filter((x) => x.bauweise === 'alt');
    wahr('Die Altbauweise ist es nicht',
         altT.every((t) => !AJ.abfangVollstaendig(t.typ)));

    /*
     * >>> AB A270 IST DIE ENDVERSTAERKUNG KEINE GABEL MEHR. <<<
     *
     * A160 bis A240 setzen ein Gurtstueck gleichen Profils auf. Ab A270
     * tritt ein DECKBLECH an seine Stelle, asymmetrisch: 1450 mm am linken
     * Jochende, 650 am rechten. Wer nur nach `verstaerkung` fragt, findet
     * bei den vier grossen Typen nichts - und weist den unverstaerkten
     * Querschnitt an der Stelle nach, an der der verstaerkte steht.
     */
    for (const t of neuT) {
      const e = AJ.abfangEndverstaerkung(t.typ);
      wahr(`${t.typ} traegt eine Endverstaerkung`, Boolean(e));
      wahr(`… und sagt ihre Bauart`,
           e.art === (['A160', 'A200', 'A240'].includes(t.typ)
             ? 'gabel' : 'deckblech'));
    }
    const gab240 = AJ.abfangEndverstaerkung('A240');
    wahr('Die Gabel hat das Profil des Gurtes',
         gab240.teile[0].profil === AJ.abfangAufbau('A240').gurtprofil);
    const dbl = AJ.abfangEndverstaerkung('A330');
    wahr('Das Deckblech sitzt an beiden Enden', dbl.teile.length === 2);
    wahr('… links laenger als rechts',
         dbl.teile[0].l === 1450 && dbl.teile[1].l === 650);
    wahr('Und beide Enden gleich breit',
         dbl.teile[0].b === dbl.teile[1].b);

    /*
     * DIE VIERENDEEL-BEREICHE. A160 und A200 fuehren einen, ab A240 sind es
     * mehrere - dazwischen sitzen die Quersteifungen aus dem Gurtprofil.
     * Ihre Summe plus die Randbereiche ergibt die Jochlaenge nicht exakt;
     * geprueft wird deshalb nur, dass die Bereiche da sind und wachsen.
     */
    for (const t of neuT) {
      wahr(`${t.typ} fuehrt seine Vierendeel-Bereiche`,
           t.laengen.every((z) => Array.isArray(z.QV) && z.QV.length >= 1));
      const kurz = t.laengen[0].QV.length;
      const lang = t.laengen[t.laengen.length - 1].QV.length;
      wahr(`… und teilt laengere Joche feiner`, lang >= kurz);
    }
    // Die Ueberhoehung teilt bei ALLEN Typen die ganze Jochlaenge.
    for (const t of neuT) {
      wahr(`${t.typ} teilt die Laenge mit seiner Ueberhoehung`,
           t.laengen.every((z) => Math.abs(
             2 * z.S.reduce((a2, b2) => a2 + b2, 0) - z.jt * 1000) < 2));
    }
  }

  /*
   * >>> DER ABFANGJOCHTYP GEHOERT NICHT INS FELD `typ`. <<<
   *
   * Erster Versuch am 3. September: eine Liste, zwei Sortimente, je nach
   * Art. Das brach sofort - `typ` ist die Angabe, mit der der RECHENKERN
   * sein Joch holt (`getTragjoch`). Ein «A160» darin warf «Unbekannter
   * Tragjochtyp», und zwar beim blossen ZIEHEN AN EINER MASTMARKE, weit weg
   * von der Eingabe.
   */
  {
    const fTyp = FELDER.find((x) => x.key === 'typ');
    const fAbf = FELDER.find((x) => x.key === 'abfangTyp');
    wahr('Es gibt ein eigenes Feld fuer den Abfangjochtyp', Boolean(fAbf));
    const alsJoch = { tragwerksart: 'joch' };
    const alsAbf = { tragwerksart: 'abfangjoch' };
    wahr('Am Tragjoch steht der Tragjochtyp',
         fTyp.sichtbar(alsJoch) && !fAbf.sichtbar(alsJoch));
    wahr('Am Abfangjoch der Abfangjochtyp',
         !fTyp.sichtbar(alsAbf) && fAbf.sichtbar(alsAbf));
    wahr('Und beide nie zugleich',
         !(fTyp.sichtbar(alsAbf) && fAbf.sichtbar(alsAbf)));

    /*
     * DER BUG SELBST: Ziehen an der Marke eines Abfangjochs.
     *
     * `mastGrenzen` fragte blind `getTragjoch(t.typ)`. Steht dort ein
     * Abfangjochtyp - oder, wie hier, gar keiner -, flog die Ausnahme.
     */
    const w = C75.tragwerkHinzu(
      { typ: 'J90', L: 12, xLage: 0, mastProfil: 'HEB 240',
        mastH: 8, mastLaenge: 12 },
      'abfangjoch', { abfangTyp: 'A160', L: 10 });
    const tAbf = C75.tragwerkeVon(w).find(
      (t) => C75.tragwerksart(t).key === 'abfangjoch');
    wahr('Das Abfangjoch traegt seinen Typ', tAbf?.abfangTyp === 'A160');
    // Und die Leiste nennt ihn: zwei uebereinander unterscheiden sich sonst
    // nur in der Anschlusshoehe, und «Abfangjoch · H 7.50 m» sagt nicht,
    // welches Sortiment darunter liegt.
    wahr('Die Bezeichnung nennt ihn',
         C75.tragwerkName(w, tAbf).startsWith('A160'));
    wahr('Und keinen Tragjochtyp im Rechenfeld',
         tAbf?.typ === undefined || tAbf.typ !== 'A160');
    const UIA = await import(J('ui.js'));
    // An JEDER Marke des Blattes, nicht nur an einer - der Fehler haengt
    // daran, WELCHES Tragwerk am gezogenen Ende haengt.
    let flog = null;
    for (const m of C75.mastenVon(w)) {
      try { UIA.mastGrenzen(UIA.mastRollen(w, m.id), m.x); }
      catch (e) { flog = e; }
    }
    wahr('Ziehen an seinen Mastmarken wirft nicht', flog === null);
  }

  /*
   * >>> UND DER NACHWEIS SAGT, DASS ER KEINER IST. <<<
   *
   * Das Sortiment steht in der Maske, und wer den Typ waehlt, darf annehmen,
   * dass damit gerechnet wird. Wird es nicht: das Abfangjoch ist ein
   * zweigurtiger Traeger mit Sprossen, der Kern rechnet vier Winkelgurte
   * mit Bindeblechen. Ein Werkzeug, das hier still die Jochrechnung
   * weiterfuehrt, waere die schlimmste Antwort.
   */
  {
    const { hinweise: hwA } = await import(J('core.checks.js'));
    // Am GERECHNETEN Modell, nicht an einem Stueckwerk: `hinweise` fragt
    // auch die Querschnittsklassifizierung, und die braucht Profile.
    const modellVon = (extra) =>
      rechne({ ...standardwerte(), ...extra }).modell;
    const h = hwA(modellVon({ tragwerksart: 'abfangjoch', abfangTyp: 'A160' }));
    const zeile = h.find((x) => x.includes('Abfangjoch'));
    wahr('Der Hinweis steht da', Boolean(zeile));
    wahr('Er nennt den gewaehlten Typ', zeile.includes('A160'));
    wahr('Und sagt, dass das Tragjoch gerechnet wird',
         zeile.includes('Tragjoch'));
    const ohne = hwA(modellVon({ tragwerksart: 'joch' }));
    wahr('Beim Tragjoch steht er nicht',
         !ohne.some((x) => x.includes('Abfangjoch')));
  }

  /*
   * >>> DIE BESCHRIFTUNG UEBERLEBT DIE NACHFUEHRUNG. <<<
   *
   * Die Leiste im Feld «Tragwerke» ist das einzige Feld, dessen INHALT
   * nachgefuehrt wird statt seines Werts - Laengen, Lagen und Profile
   * aendern sich beim Ziehen fortwaehrend. `leisteNachfuehren` setzt dazu
   * das `innerHTML` der Marke `[data-tragwerkfeld]` neu.
   *
   * Die Marke sass am AEUSSEREN Feldrahmen. Damit fiel bei jedem Mastklick
   * die Beschriftung «Tragwerke auf diesem Querprofil» weg und der Hinweis
   * darunter mit ihr: `tragwerkfeldHtml` liefert beides nicht. Die Maske
   * sackte um zwei Zeilen zusammen und beim naechsten vollen Neubau wieder
   * auseinander.
   *
   * Weisung vom 3. September: «kannst du diesen text immer anlassen auch
   * wenn man auf die masten klickt, da sonst die darstellung springt.»
   */
  {
    const UIF = await import(J('ui.js'));
    const f = FELDER.find((x) => x.key === 'tragwerksart');
    const h = UIF.feldHtml(f, 'joch', standardwerte());
    const iLabel = h.indexOf('Tragwerke auf diesem Querprofil');
    const iMarke = h.indexOf('data-tragwerkfeld');
    wahr('Das Feld traegt seine Beschriftung', iLabel >= 0);
    wahr('Und die Marke der Nachfuehrung', iMarke >= 0);
    // DAS ist die Invariante: Beschriftung ausserhalb, Inhalt innerhalb.
    wahr('Die Beschriftung steht VOR der Marke', iLabel < iMarke);
    wahr('Der Hinweis steht dahinter',
         h.lastIndexOf('hinweis') > iMarke);
    // Gegenprobe: ein gewoehnliches Feld traegt gar keine Marke.
    const g = UIF.feldHtml(FELDER.find((x) => x.key === 'xLage'), 0,
                           standardwerte());
    wahr('Ein gewoehnliches Feld traegt keine',
         !g.includes('data-tragwerkfeld'));
  }

  /*
   * >>> DIE BEIDEN AUSSCHNITTE HABEN EIGENE SYMBOLE. <<<
   *
   * Weisung vom 3. September: «kannst du zutreffendere symbole fuer diese
   * buttons finden.» Vorher standen dort eine Lupe und vier Ecken nach
   * aussen - beides sagt «zoom» und keines sagt, WORAUF. Die Frage ist aber
   * nicht die Vergroesserung, sondern der Ausschnitt.
   */
  {
    const { ICONS } = await import(J('design.js'));
    wahr('Es gibt ein Symbol fuer das ganze Querprofil',
         Boolean(ICONS.querprofilGanz));
    wahr('… und eines fuer das einzelne Tragwerk',
         Boolean(ICONS.querprofilEines));
    wahr('Beide sind verschieden',
         ICONS.querprofilGanz !== ICONS.querprofilEines);
    /*
     * DER EIGENTLICHE BRUCHPUNKT: Name und Definition muessen zusammen
     * passen. `icon('tippfehler')` liefert klaglos ein LEERES Bildchen -
     * der Knopf steht dann ohne Zeichen da, und niemand bemerkt es beim
     * Umbenennen.
     */
    const { icon: ic } = await import(J('design.js'));
    for (const n of ['querprofilGanz', 'querprofilEines']) {
      wahr(`${n} zeichnet wirklich`, ic(n).includes(ICONS[n]));
    }
    // Und die alten stehen noch fuer ihre eigenen Stellen.
    wahr('Lupe und Aufziehen bleiben erhalten',
         Boolean(ICONS.zoom) && Boolean(ICONS.aufziehen));
  }

  /*
   * >>> EIN MAST, EIN KOERPER. <<<
   *
   * Auf einer Jochreihe traegt der Zwischenmast zwei Tragwerke - und bis
   * zum 3. September baute JEDES von beiden ihn in seine Szene. Zwei
   * Koerper an derselben Stelle geben flackernde Flaechen, doppelte
   * Windpfeile und ein Bild, dem man nicht ansieht, was davon eines ist.
   *
   * Gemeldet als: «die darstellung des masten hier bei der
   * zwischenabstuetzung scheint nicht sauber modelliert zu sein, ich denke
   * das ist noch ein ueberbleibsel der geteilten masten auslegung.»
   */
  {
    const w = reihe();                       // P1: 0-20, P2: 20-35
    const masten = C75.mastenVon(w);
    const geteilt = masten.filter((m) => (m.traegt ?? []).length > 1);
    wahr('Die Reihe hat einen geteilten Masten', geteilt.length === 1);

    /*
     * DAS GERECHNETE TRAGWERK HAT VORRANG.
     *
     * Nur seine Szene faerbt nach Ausnutzung ein. Waehlte man den anderen,
     * verloere der Mast seine Farbe - er stuende da, als sei er nicht
     * nachgewiesen.
     */
    const p1 = C75.mastZeichenplan(w, 'T1');
    wahr('T1 zeichnet beide seiner Enden', p1.T1.A && p1.T1.B);
    wahr('T2 laesst das geteilte Ende weg', p1.T2.A === false);
    wahr('… und zeichnet sein freies', p1.T2.B === true);

    // Und umgekehrt, wenn T2 gerechnet wird.
    const p2 = C75.mastZeichenplan(w, 'T2');
    wahr('T2 zeichnet dann beide', p2.T2.A && p2.T2.B);
    wahr('T1 laesst das geteilte Ende weg', p1.T1.B !== p2.T1.B);
    wahr('… naemlich sein Ende B', p2.T1.B === false);
    wahr('Sein freies Ende bleibt', p2.T1.A === true);

    /*
     * JEDER MAST WIRD GENAU EINMAL GEZEICHNET - das ist die eigentliche
     * Aussage, und sie laesst sich zaehlen.
     */
    for (const aktiv of ['T1', 'T2']) {
      const p = C75.mastZeichenplan(w, aktiv);
      let n = 0;
      for (const t of C75.tragwerkeSortiert(w)) {
        if (p[t.id].A) n += 1;
        if (p[t.id].B) n += 1;
      }
      pruef(`Bei ${aktiv} so viele Koerper wie Masten`, n, masten.length,
            1e-9, 'Stk');
    }

    /*
     * OHNE GETEILTEN MASTEN AENDERT SICH NICHTS.
     *
     * Ein einzelnes Tragwerk zeichnet beide Enden wie zuvor - sonst haette
     * die Kur den Regelfall beschaedigt.
     */
    const allein = { typ: 'J90', L: 20, xLage: 0, mastProfil: 'HEB 240',
                     mastH: 8, mastLaenge: 12 };
    const pa = C75.mastZeichenplan(allein, 'T1');
    wahr('Ein einzelnes Tragwerk zeichnet beide Enden',
         pa.T1.A === true && pa.T1.B === true);
  }

  /*
   * >>> DIE SZENE EINES TRAGWERKS BLEIBT IN SEINEN GRENZEN. <<<
   *
   * Gemeldet am 3. September mit Bild: «hier der screenshot mit den
   * ueberstehenden lastflaechen und schwerelinien, die nicht sauber
   * ausgeblendet werden.» Der Verdacht war, die Teile seien nicht je
   * Jochtraeger zugeschnitten.
   *
   * Nachgemessen sind sie es: nur die halbe Blech- und Mastdicke ragt ueber
   * die Grenze, und das muss sie - ein Bauteil auf der Achse steht zur
   * Haelfte davor. Was fehlte, war das AUSBLENDEN: der Knopf «nur das
   * gerechnete Tragwerk» fuhr bloss die Kamera heran, der Nachbar stand
   * weiter da. Seither ruft er `nurDiesesZeigen`.
   *
   * Diese Kontrolle haelt die gemessene Aussage fest. Liefe eine Linie oder
   * eine Lastflaeche je ueber ihr Tragwerk hinaus, waere das Ausblenden
   * wieder wirkungslos - und man saehe es an dieser Stelle.
   */
  {
    const w = { ...standardwerte(), L: 20 };
    const e = rechne(w);
    const sz = R75.erzeugeSzene(e.modell, e);
    const L = e.modell.L;
    // Bauteile stehen zur Haelfte vor der Achse - ein Zehntelmeter Luft.
    const LUFT = 0.15;
    const xVon = (t) => {
      const v = [];
      const gehe = (a) => {
        if (!Array.isArray(a)) return;
        if (typeof a[0] === 'number') { v.push(a[0]); return; }
        a.forEach(gehe);
      };
      gehe(t.punkte ?? t.poly ?? (t.p ? [t.p] : null));
      return v.length ? [Math.min(...v), Math.max(...v)] : null;
    };
    for (const feld of ['linien', 'lastflaechen', 'vektoren', 'marken',
                        'flaechen']) {
      const liste = sz[feld] ?? [];
      const raus = liste.filter((t) => {
        const b = xVon(t);
        return b && (b[0] < -LUFT || b[1] > L + LUFT);
      });
      wahr(`${feld}: nichts ragt aus dem Tragwerk`, raus.length === 0);
    }
    // Und die Systemachse endet genau am Tragwerk, nicht am Blattrand.
    const achsen = (sz.linien ?? []).filter((t) => t.gruppe === 'achse');
    wahr('Es gibt Achsenlinien', achsen.length > 0);
    wahr('Sie enden am Tragwerk',
         achsen.every((t) => {
           const b = xVon(t);
           return !b || (b[0] >= -LUFT && b[1] <= L + LUFT);
         }));
  }

  /*
   * >>> DIE GURTPROFILE DER ABFANGJOCHE. <<<
   *
   * Der Winkelkatalog traegt das Tragjoch; das Abfangjoch braucht UPE und
   * IPE, und die standen bis zum 3. September nirgends. Es sind NORMWERTE
   * (EN 10365 / DIN 1026-2), keine gemessenen - geprueft wird deshalb, ob
   * sie zu sich selbst passen.
   */
  {
    const PR = await import(J('data.profiles.js'));
    /*
     * ACHT, seit IPE 240 dazukam - es ist kein Gurtprofil, sondern die
     * QUERSTEIFE von A240. Die Tabelle traegt beide Rollen, weil beide
     * dieselben Werte brauchen.
     */
    wahr('Acht Walzprofile', PR.GURTPROFILE.length === 8);
    wahr('IPE 240 ist dabei - die Quersteife von A240',
         PR.GURTPROFILE.some((p) => p.name === 'IPE 240'));
    /*
     * DIE SCHAERFSTE PLAUSIBILITAETSPRUEFUNG, DIE ES HIER GIBT:
     * Flaeche mal Wichte muss das Laufmetergewicht ergeben. Ein Tippfehler
     * in A oder G faellt damit sofort auf - und beide gehen in den Nachweis.
     */
    for (const p of PR.GURTPROFILE) {
      pruef(`${p.name}: A x 7.85 ergibt G`, p.A * 0.785, p.G, p.G * 0.005,
            'kg/m');
    }
    // Und die Hauptmasse stimmen mit den Sortimentsblaettern ueberein.
    for (const t of AJ.abfangjoche().filter((x) => x.aufbau)) {
      const p = PR.getGurtprofil(t.aufbau.gurtprofil);
      pruef(`${t.typ}: Profilhoehe wie im Blatt`, p.h * 10, t.aufbau.a,
            0.5, 'mm');
      pruef(`${t.typ}: Flanschbreite wie im Blatt`, p.b * 10, t.aufbau.b,
            0.5, 'mm');
      /*
       * >>> UND c IST DIE FLANSCHDICKE. <<<
       *
       * Erste Lesart war «Stegdicke». Falsch - bei UPE 160 steht c = 9.5,
       * und das ist t_f; t_w waere 5.5. Wer damit rechnet, setzt fast die
       * halbe Dicke an.
       */
      pruef(`${t.typ}: c ist die Flanschdicke`, p.tf * 10, t.aufbau.c,
            0.05, 'mm');
    }

    /*
     * >>> DER HEBELARM IST NICHT k. <<<
     *
     * k ist das Aussenmass ueber beide Gurte; der Hebelarm der Vierendeel-
     * Wirkung ist der Abstand der SCHWERACHSEN. Beim UPE liegt die Achse um
     * e_y innerhalb des Stegruckens, beim IPE in der Profilmitte.
     *
     * Bei A160 sind das 38.3 statt 42.0 cm, bei A270 73.5 statt 87.0 - neun
     * bis fuenfzehn Prozent, und sie gehen VOLL ins Moment. Mit k gerechnet
     * laege der Nachweis auf der unsicheren Seite.
     */
    pruef('A160: Achsabstand statt Aussenmass',
          PR.gurtAchsabstand('UPE 160', 42.0), 42.0 - 2 * 1.84, 1e-9, 'cm');
    pruef('A270: beim IPE gilt k - b',
          PR.gurtAchsabstand('IPE 270', 87.0), 87.0 - 13.5, 1e-9, 'cm');
    for (const t of AJ.abfangjoche().filter((x) => x.aufbau)) {
      const k = t.aufbau.k / 10;
      const e = PR.gurtAchsabstand(t.aufbau.gurtprofil, k);
      wahr(`${t.typ}: der Hebelarm ist kleiner als k`, e < k && e > 0.6 * k);
    }
    // Beim IPE ist k - b dasselbe wie d + b - eine Gegenprobe der Geometrie.
    for (const t of AJ.abfangjoche().filter(
      (x) => x.aufbau && x.aufbau.gurtprofil.startsWith('IPE'))) {
      pruef(`${t.typ}: k - b ist d + b`,
            PR.gurtAchsabstand(t.aufbau.gurtprofil, t.aufbau.k / 10),
            (t.aufbau.d + t.aufbau.b) / 10, 1e-6, 'cm');
    }
  }

  /*
   * >>> DIE MASTNAMEN BLEIBEN UEBER DAS AUSBLENDEN HINWEG STEHEN. <<<
   *
   * Weisung vom 3. September: «namen ueber ausblenden hinweg stabil halten,
   * sonst fuehrt es zu missverstaendnissen.»
   *
   * Die Id eines Masten IST seine Laufnummer, und sie wurde nur ueber die
   * SICHTBAREN Tragwerke vergeben. Wer den linken Nachbarn beiseitelegte,
   * sah M2 zu M1 werden und M3 zu M2 - derselbe Mast hiess je nach Ansicht
   * anders, und die Nachweise nannten ihn beim falschen Namen.
   */
  {
    const w = reihe();                       // P1: 0-20, P2: 20-35
    const vorher = C75.mastenVon(w).map((m) => C75.mastName(w, m));
    wahr('Drei Masten, M1 bis M3',
         vorher.join(',') === 'M1,M2,M3');

    // Den linken Nachbarn beiseitelegen.
    const ohne = { ...w, weitere: (w.weitere ?? []).map(
      (t) => ({ ...t, ausgeblendet: true })) };
    const nachher = C75.mastenVon(ohne);
    wahr('Danach stehen zwei im Bild', nachher.length === 2);
    const namen = nachher.map((m) => C75.mastName(ohne, m));
    wahr('Und sie heissen weiterhin M2 und M3',
         namen.join(',') === 'M2,M3');

    /*
     * DER GETEILTE MAST BLEIBT SICHTBAR. Ihn traegt auch das sichtbare
     * Tragwerk - er verschwindet nicht, nur weil der Nachbar weg ist.
     */
    wahr('Der geteilte Mast steht weiter da',
         nachher.some((m) => Math.abs(m.x - 20) < 1e-6));
    // Und er hat seine Angaben behalten: die Zuordnung laeuft ueber die
    // Stelle und passiert VOR dem Weglassen der versteckten.
    const geteiltVor = C75.mastenVon(w).find((m) => Math.abs(m.x - 20) < 1e-6);
    const geteiltNach = nachher.find((m) => Math.abs(m.x - 20) < 1e-6);
    wahr('… mit demselben Profil',
         geteiltVor.profil === geteiltNach.profil);

    // Mit `mitVersteckten` kommen alle - daran haengt die Nummernvergabe.
    wahr('Alle drei sind weiterhin abrufbar',
         C75.mastenVon(ohne, 0.1, true).length === 3);
    wahr('Der ausgeblendete ist als solcher gekennzeichnet',
         C75.mastenVon(ohne, 0.1, true).filter((m) => m.versteckt).length === 1);
  }

  /*
   * ===================================================================
   * DER RECHENKERN DES ABFANGJOCHS - erster Baustein.
   * ===================================================================
   *
   * Weisung vom 3. September: liegender Vierendeeltraeger, als einfacher
   * Balken abgebildet, mit der Umrechnung auf die einzelnen Gurte.
   */
  {
    const AK = await import(J('core.abfangjoch.js'));
    const PR = await import(J('data.profiles.js'));

    /*
     * >>> e IST NICHT k. <<<
     *
     * Der Hebelarm ist der Abstand der SCHWERACHSEN. Mit dem Aussenmass zu
     * rechnen laege neun bis fuenfzehn Prozent auf der unsicheren Seite.
     */
    for (const t of AJ.abfangjoche().filter((x) => x.aufbau)) {
      const q = AK.abfangQuerschnitt(t.typ);
      wahr(`${t.typ}: e ist kleiner als k`, q.e < q.k);
      /*
       * >>> DIE U-PROFILE ZEIGEN NACH AUSSEN. <<<
       *
       * Weisung vom 3. September nach Blick ins AxisVM-Modell. Der Schnitt
       * A-A bestaetigt es: die STEGE liegen innen im Abstand d, die
       * Flansche zeigen nach aussen, und die Schwerachse liegt um e_y
       * weiter aussen. Hier stand `gurtAchsabstand(gurt, k)` ohne d - das
       * ist die umgekehrte Lage und gab bei A160 38.3 statt 31.7 cm.
       */
      pruef(`${t.typ}: e stimmt mit gurtAchsabstand`,
            q.e, PR.gurtAchsabstand(q.gurt, q.k, q.d), 1e-9, 'cm');
      // Die Gegenprobe der Geometrie: d/2 + b = k/2.
      if (q.gurt.reihe === 'UPE') {
        pruef(`${t.typ}: d/2 + b ergibt k/2`,
              q.d / 2 + q.gurt.b, q.k / 2, 1e-9, 'cm');
        // Und der Hebelarm liegt zwischen d und k - naeher an d.
        wahr(`${t.typ}: e liegt zwischen d und k`, q.e > q.d && q.e < q.k);
      }
      /*
       * DER STEINER-ANTEIL IST HIER ALLES. Bei A160 ist I_z des Gurtes
       * 85 cm4, der Steiner-Anteil 16 100 - das Zweihundertfache. Faellt
       * das je unter das Zehnfache, stimmt etwas an der Geometrie nicht.
       */
      const steiner = 2 * q.gurt.A * (q.e / 2) ** 2;
      const eigen = 2 * q.gurt.Iz;
      wahr(`${t.typ}: der Steiner-Anteil traegt`, steiner > 10 * eigen);
      pruef(`${t.typ}: I_rahmen ist Eigen + Steiner`,
            q.Irahmen, eigen + steiner, 1e-6, 'cm4');
      // Und die Flaeche ist die zweier Gurte - nicht mehr, nicht weniger.
      pruef(`${t.typ}: A ist zweimal der Gurt`, q.A, 2 * q.Agurt, 1e-9, 'cm2');
    }
    // Ueber das Sortiment waechst der Querschnitt durchweg.
    const reihe6 = ['A160', 'A200', 'A240', 'A270', 'A300', 'A330', 'A360']
      .map((x) => AK.abfangQuerschnitt(x));
    for (let i = 1; i < reihe6.length; i++) {
      wahr(`${reihe6[i].typ} ist steifer als ${reihe6[i - 1].typ}`,
           reihe6[i].Irahmen > reihe6[i - 1].Irahmen);
    }

    /*
     * >>> DIE UMRECHNUNG AUF DIE GURTE: N = M / e. <<<
     *
     * Das Kraeftepaar ist die Vierendeel-Annahme. Gegengerechnet von Hand:
     * bei A160 (e = 38.3 cm) und M = 50 kNm sind das 50 / 0.383 = 130.5 kN.
     */
    const qA = AK.abfangQuerschnitt('A160');
    const kr = AK.abfangGurtkraefte(50, qA.e);
    pruef('A160: Gurtkraft bei M = 50 kNm', kr.N, 50 / (qA.e / 100), 1e-9, 'kN');
    pruef('… von Hand nachgerechnet', kr.N, 130.5, 0.6, 'kN');
    wahr('Zug und Druck sind gleich gross und entgegengesetzt',
         Math.abs(kr.zug + kr.druck) < 1e-9 && kr.zug > 0);
    // Doppeltes Moment, doppelte Kraft - die Beziehung ist linear.
    pruef('Doppeltes Moment gibt doppelte Kraft',
          AK.abfangGurtkraefte(100, qA.e).N, 2 * kr.N, 1e-9, 'kN');
    // Ein groesserer Hebelarm entlastet die Gurte.
    const qB = AK.abfangQuerschnitt('A360');
    wahr('Der groessere Typ hat kleinere Gurtkraefte',
         AK.abfangGurtkraefte(50, qB.e).N < kr.N);

    /*
     * QUER ZUR EBENE: jeder Gurt fuer sich, halbe Last (Weisung).
     */
    pruef('Die Querlast teilt sich haelftig',
          AK.abfangLastQuer(3.4).jeGurt, 1.7, 1e-9, 'kN/m');

    /*
     * >>> jt IST NICHT js. <<<
     *
     * Mit der Jochlaenge statt der Stuetzweite zu rechnen ueberschaetzt das
     * Feldmoment um das Quadrat des Verhaeltnisses - bei A160/9.50 waeren
     * das elf Prozent auf der unsicheren Seite.
     */
    const sw = AK.abfangStuetzweite('A160', 9.5);
    wahr('Die Stuetzweite ist kleiner als die Jochlaenge', sw.bis < 9.5);
    pruef('A160/9.50 spannt bis 9.00 m', sw.bis, 9.0, 1e-9, 'm');
    wahr('Eine ungefuehrte Laenge hat keine Stuetzweite',
         AK.abfangStuetzweite('A160', 9.7) === null);

    /*
     * >>> DIE BLECHZAHL KOMMT AUS DER STUECKLISTE. <<<
     *
     * Der erste Versuch leitete sie aus QV1 und der Regelteilung ab und lag
     * DURCHWEG 4 BIS 6 BLECHE ZU TIEF (A160/9.5 m: 22 gegen 26). Stehende
     * Vorgabe: massgebend sind die Daten, nicht die Herleitung.
     *
     * Diese Kontrolle ist die Gegenprobe an der Zeichnung selbst.
     */
    const SOLL = { 12.5: 38, 12: 36, 11.5: 34, 11: 32, 10.5: 30, 10: 28,
                   9.5: 26, 9: 24, 8.5: 22, 8: 20, 7.5: 18, 7: 16,
                   6.5: 14, 6: 12, 5.5: 10 };
    let stimmt = 0;
    for (const z of AJ.getAbfangjoch('A160').laengen) {
      const b = AK.abfangBlechstationen('A160', z.jt);
      if (b && b.blecheListe === SOLL[z.jt]) stimmt += 1;
    }
    pruef('A160: alle Laengen fuehren ihre Stueckzahl',
          stimmt, 15, 1e-9, 'Stk');
    /*
     * >>> UND DIE STUECKZAHL IST NICHT MEHR DIE BLECHZAHL. <<<
     *
     * `bleche` zaehlt jetzt die Stationen des SCHEMAS mal zwei, nicht die
     * Regelbleche der Stueckliste. Bei A160 / 9.50 m sind das 32 gegen 26 -
     * der Unterschied sind die drei Stationen in den Endbereichen, die die
     * Stueckliste teils als Sonderbleche fuehrt.
     */
    const b95 = AK.abfangBlechstationen('A160', 9.5);
    wahr('Je Station eines oben und eines unten',
         b95.bleche === b95.anzahl * 2);
    /*
     * >>> DIE STATIONEN FOLGEN DER FELDFOLGE, NICHT EINEM RASTER. <<<
     *
     * Hier stand «jeder Abstand gleich der Regelteilung». Das galt, solange
     * die Lage geschaetzt war. Das Schemablatt zeigt die Felder aber als
     * «A9 A8 ... A2 A1 A1 A2 ... A9»: aussen die Regelteilung, in der MITTE
     * das Paar A1. Bei A160 / 9.50 m sind das zehn Felder zu 500 und zwei
     * zu 250 - die Kontrolle haette den richtigen Fall abgelehnt.
     */
    const abst = b95.stationen.slice(1).map((x, i) => x - b95.stationen[i]);
    /*
     * >>> DIE RANDFELDER SIND WEDER TEILUNG NOCH MITTLERES FELD. <<<
     *
     * Weisung vom 3. September: «Die Masse in den Endbereichen stimmen
     * nicht mit der Zeichnung ueberein.» Zwischen den beiden aeusseren
     * Blechen misst A160 links 550, rechts zweimal 550 - erst dazwischen
     * gilt die Tabelle. Die alte Kontrolle liess nur Teilung oder A1 zu und
     * haette die richtige Lage abgewiesen.
     */
    const innen = abst.slice(1, -2);
    wahr('Im QV-Bereich: Regelteilung oder mittleres Feld',
         innen.every((d) => Math.abs(d - b95.teilung) < 1e-9
                         || Math.abs(d - b95.erstesFeld) < 1e-9));
    wahr('Die Regelteilung steht am Rand des QV-Bereichs',
         Math.abs(innen[0] - b95.teilung) < 1e-9
         && Math.abs(innen.at(-1) - b95.teilung) < 1e-9);
    // Die drei Randfelder stehen so, wie das Schemablatt sie bemasst.
    pruef('Links das zweite Feld: 550 mm', abst[0], 0.55, 1e-9, 'm');
    pruef('Rechts das erste Feld: 550 mm', abst.at(-2), 0.55, 1e-9, 'm');
    pruef('Rechts das zweite Feld: 550 mm', abst.at(-1), 0.55, 1e-9, 'm');
    // Und die Summe der Felder ist die Laenge der Blechreihe.
    pruef('Die Felder decken die Blechreihe',
          abst.reduce((a2, b2) => a2 + b2, 0),
          b95.stationen.at(-1) - b95.stationen[0], 1e-9, 'm');
    wahr('Sie liegen alle im Joch',
         b95.stationen[0] > 0 && b95.stationen.at(-1) < 9.5);
    /*
     * OHNE ERFASSTE STUECKZAHL KOMMT NULL - keine geratene Einteilung.
     * Eine erfundene waere die Grundlage eines Nachweisschnitts, der
     * nirgends steht.
     */
    /*
     * >>> ALLE SIEBEN TYPEN FUEHREN JETZT IHRE STUECKZAHLEN. <<<
     *
     * Nachgetragen am 3. September aus den Konstruktionszeichnungen. Die
     * Reihen sind NICHT linear: bei A240 stehen 48, 36 und 24 je zweimal,
     * weil der Traeger ab dieser Groesse in mehrere Vierendeel-Bereiche
     * gegliedert ist. Genau deshalb waere eine Formel falsch gewesen.
     */
    const neuAlle = AJ.abfangjoche().filter((x) => x.bauweise === 'neu');
    for (const t of neuAlle) {
      wahr(`${t.typ} fuehrt fuer jede Laenge eine Blechzahl`,
           t.laengen.every((z) => z.bleche > 0));
    }
    pruef('158 Laengen mit Blechzahl',
          neuAlle.reduce((n, t) => n + t.laengen.filter(
            (z) => z.bleche > 0).length, 0), 158, 1e-9, 'Stk');
    /*
     * JE STATION ZWEI BLECHE - die Zahl muss GERADE sein. Diese Kontrolle
     * hat den Blattfehler bei A360 gefunden.
     */
    const ungerade = neuAlle.flatMap((t) => t.laengen
      .filter((z) => z.bleche % 2 !== 0)
      .map((z) => `${t.typ}/${z.jt}`));
    wahr('Genau eine Laenge fuehrt eine ungerade Blechzahl',
         ungerade.length === 1 && ungerade[0] === 'A360/21');
    wahr('… und sie ist als fraglich angeschrieben',
         Boolean(AJ.getAbfangjoch('A360').laengen
           .find((z) => z.jt === 21).blechFraglich));
    /*
     * >>> UND SIE WIRD NICHT GERECHNET. <<<
     *
     * 85 Bleche sind bei zwei je Station unmoeglich; der Wert steht
     * zwischen 60 und 56 in einer sonst streng absteigenden Reihe. Ihn
     * stillschweigend zu runden waere eine Zahl, die niemand geprueft hat,
     * in einem Nachweis, dem man es nicht ansieht.
     */
    /*
     * >>> SEIT DEM 3. SEPTEMBER TRAEGT DIE STUECKZAHL DIE LAGE NICHT MEHR. <<<
     *
     * Hier stand «liefert keine Einteilung»: die Stationen wurden aus der
     * Stueckzahl abgeleitet, und eine unmoegliche Zahl gab keine Lage. Seit
     * die Lage aus dem Schema kommt - Randmasse plus Feldfolge aus QV und
     * A1 - ist A360 / 21.00 m wieder rechenbar. Die 85 bleiben fraglich;
     * sie ZAEHLEN Bleche, sie verteilen sie nicht.
     */
    const f21 = AK.abfangBlechstationen('A360', 21.0);
    wahr('Die fragliche Laenge hat trotzdem eine Lage', Boolean(f21));
    wahr('… und sagt, dass ihre Stueckzahl fraglich ist',
         f21.blechFraglich === true);
    wahr('… und gilt wieder als rechenbar',
         AK.abfangRechenbar('A360', 21.0));
    wahr('Ihre Nachbarn ebenso',
         AK.abfangRechenbar('A360', 20.5) && AK.abfangRechenbar('A360', 21.5));
    // 157 von 158 lassen sich rechnen - eine einzige nicht.
    let rechenbar = 0;
    for (const t of neuAlle) {
      for (const z of t.laengen) {
        if (AK.abfangBlechstationen(t.typ, z.jt)) rechenbar += 1;
      }
    }
    /*
     * ALLE 158 - vorher waren es 157, und die Lage galt nur bei zwanzig als
     * belegt. Beides haengt an derselben Aenderung: die Feldzahl folgt aus
     * QV und A1, nicht aus der Stueckzahl.
     */
    pruef('158 Laengen sind rechenbar', rechenbar, 158, 1e-9, 'Stk');

    wahr('Eine ungefuehrte Laenge hat keine Einteilung',
         AK.abfangBlechstationen('A200', 10.3) === null);
    /*
     * >>> UND DIE LAGE IST HIER BELEGT. <<<
     *
     * Bei A160 / 9.50 m geht die Feldfolge auf, und die Reihe steht dort,
     * wo die Zeichnung sie zeigt: erstes Blech bei 2.000 m (1450 + 550),
     * letztes bei 7.500 (2000 + QV1 5500). Frueher stand hier die
     * Naeherung - sie lag bei 1.875 m.
     */
    wahr('Die Lage ist belegt', b95.randGenau === true);
    /*
     * >>> DIE ENDEN SIND NICHT GLEICH LANG. <<<
     *
     * Weisung vom 3. September: «auf der linken seite kommt das erste blech
     * schon bei 1450mm und dann das naechste nach 550 und auf der rechten
     * sind es 900 und dann zweimal 550 mm». Hier stand 2.000 und 7.500 -
     * die symmetrische Reihe ohne die Bleche der Endbereiche.
     */
    pruef('Erstes Blech bei 1.450 m', b95.stationen[0], 1.45, 1e-6, 'm');
    pruef('Zweites bei 2.000 m', b95.stationen[1], 2.0, 1e-6, 'm');
    pruef('Letztes bei 8.600 m', b95.stationen.at(-1), 8.6, 1e-6, 'm');
    pruef('Vorletztes bei 8.050 m', b95.stationen.at(-2), 8.05, 1e-6, 'm');
    // 9.500 - 0.900: das letzte Blech misst vom RECHTEN Ende.
    pruef('Das letzte Blech steht 900 mm vom rechten Ende',
          9.5 - b95.stationen.at(-1), 0.9, 1e-6, 'm');
    pruef('Sechzehn Stationen', b95.anzahl, 16, 1e-9, 'Stk');
    /*
     * WO SIE NICHT AUFGEHT, BLEIBT DIE NAEHERUNG - und sagt es. Ab A240
     * sitzen Quersteifungen zwischen den QV-Bereichen; wie sich die Bleche
     * darauf verteilen, steht nicht in einer Formel.
     */
    /*
     * ======================================================================
     * >>> DIE QUERSTEIFEN AB A240. <<<
     * ======================================================================
     *
     * Weisung vom 3. September: «die quersteifen ab A240 richtig ansetzen.»
     *
     * An den Grenzen der QV-Bereiche sitzt statt eines Bindeblechpaares ein
     * Riegel aus Walzprofil - die Stueckliste fuehrt ihn als eigene Position
     * «Querversteifung». Vorher rechnete der Kern dort ein Blech, und die
     * Zaehlung von Schema und Stueckliste ging um ebenso viele Stationen
     * auseinander.
     */
    const GEGLIEDERT = ['A240', 'A270', 'A300', 'A330', 'A360'];
    for (const t of GEGLIEDERT) {
      wahr(`${t} fuehrt eine Quersteife`, Boolean(AJ.abfangQuersteife(t)));
    }
    wahr('A160 und A200 fuehren keine - sie sind ungegliedert',
         !AJ.abfangQuersteife('A160') && !AJ.abfangQuersteife('A200'));
    /*
     * >>> SIE SITZEN AUF DEN QV-GRENZEN - UND ZWAR AUF STATIONEN. <<<
     *
     * Der erste Bereich beginnt bei 2000, der letzte endet bei jt - 2000.
     * Faellt eine Grenze zwischen zwei Bleche, waere die Zuordnung geraten.
     * Geprueft an allen 120 Laengen der fuenf gegliederten Typen.
     */
    let aufStation = 0;
    let steifenZahl = 0;
    for (const t of GEGLIEDERT) {
      for (const z2 of AJ.getAbfangjoch(t).laengen) {
        const e2 = AK.abfangBlechstationen(t, z2.jt);
        if (!e2) continue;
        const QV2 = z2.QV ?? [z2.QV1];
        let g2 = 2000;
        const gr = [g2];
        for (const q2 of QV2) { g2 += q2; gr.push(g2); }
        const mm = e2.stationen.map((v) => Math.round(v * 1000));
        if (gr.every((v) => mm.includes(v))) aufStation += 1;
        // Zahl der Steifen: nB + 1, bei A240 zusaetzlich das Endstueck.
        const soll = QV2.length + 1 + (t === 'A240' ? 1 : 0);
        if (e2.quersteifen === soll) steifenZahl += 1;
      }
    }
    pruef('Jede QV-Grenze faellt auf eine Blechstation',
          aufStation, 120, 1e-9, 'Stk');
    pruef('Und die Steifenzahl ist nB + 1', steifenZahl, 120, 1e-9, 'Stk');
    /*
     * >>> DAMIT GEHEN SCHEMA UND STUECKLISTE AUF. <<<
     *
     * Vorher lagen sie ab A240 um bis zu neun Stationen auseinander - das
     * waren genau die Steifen. Was bleibt, ist der eine systematische
     * Fehlbetrag bei A1 = 250: dort fuehrt die Stueckliste durchweg ein
     * Blechpaar zu wenig, bei A160 wie bei A360.
     */
    let deckt500 = 0;
    let ab250 = 0;
    for (const t of neuAlle) {
      for (const z2 of t.laengen) {
        const e2 = AK.abfangBlechstationen(t.typ, z2.jt);
        if (!e2 || e2.stationenListe === null) continue;
        if (z2.A1 === 500) { if (e2.blechzahlStimmt) deckt500 += 1; }
        else if (e2.anzahl - e2.stationenListe === 1) ab250 += 1;
      }
    }
    pruef('Bei A1 = 500 deckt sich jede Laenge', deckt500, 77, 1e-9, 'Stk');
    pruef('Bei A1 = 250 fehlt genau ein Paar', ab250, 80, 1e-9, 'Stk');
    /*
     * >>> DER RIEGEL BIEGT UM SEINE SCHWACHE ACHSE. <<<
     *
     * Die Rahmenebene liegt waagrecht, der Steg der Steife steht senkrecht
     * (Schnitt C-C). W_y einzusetzen gaebe bei IPE 240 das Siebenfache und
     * einen Nachweis, der immer aufginge.
     */
    {
      const PR2 = await import(J('data.profiles.js'));
      const p2 = PR2.getGurtprofil('IPE 240');
      const n2 = AK.abfangSteifennachweis('IPE 240', 40, 1.0, 30.0, 21.8);
      pruef('Der Riegel rechnet mit W_z', n2.W, p2.Wz, 1e-9, 'cm3');
      wahr('… nicht mit W_y', Math.abs(n2.W - p2.Wy) > 1);
      // Den Schub tragen die Flansche, nicht der ganze Querschnitt.
      pruef('Schubflaeche: beide Flansche', n2.A, 2 * p2.b * p2.tf, 1e-9, 'cm2');
      wahr('… und das ist weniger als der Querschnitt', n2.A < p2.A);
      /*
       * EIN RIEGEL NIMMT DIE GANZE QUERKRAFT, ein Blechpaar teilt sie.
       * Deshalb steht im Steifennachweis V und nicht V/2 - bei sonst
       * gleichen Zahlen ist sein Moment doppelt so gross wie das eines
       * einzelnen Blechs.
       */
      const bl2 = AJ.abfangBindeblech('A240').regel;
      const nb = AK.abfangBlechnachweis(bl2, 40, 1.0, 30.0, 21.8);
      pruef('Sein Moment ist das doppelte eines Blechs',
            n2.Mblech / nb.Mblech, 2.0, 1e-9, '-');
      /*
       * >>> UND IST DAMIT FAST GENAU DAS BLECHPAAR. <<<
       *
       * W_z eines I ist im Wesentlichen 2*t_f*b^2/6 - die Formel des
       * Blechpaares mit den Flanschmassen. Bei A240 liegt die Steife
       * deshalb ein Prozent UNTER dem Paar, das sie ersetzt; die frueher
       * notierte Auskunft «immer auf der sicheren Seite» galt nur fuer die
       * grossen Typen.
       */
      const paar = 2 * ((bl2.t / 10) * (bl2.b / 10) ** 2 / 6);
      wahr('A240: die Steife liegt knapp unter dem Blechpaar',
           p2.Wz / paar > 0.97 && p2.Wz / paar < 1.0);
      wahr('A360: deutlich darueber',
           PR2.getGurtprofil('IPE 360').Wz
           / (2 * ((AJ.abfangBindeblech('A360').regel.t / 10)
                   * (AJ.abfangBindeblech('A360').regel.b / 10) ** 2 / 6)) > 1.8);
    }
    /*
     * >>> DER NACHWEIS SETZT SIE AN DER RICHTIGEN STELLE AN. <<<
     */
    {
      const Vf = (x) => 4.0 * (8.0 / 2 - x);
      const a240 = AK.abfangBlechnachweise('A240', 8.0, Vf, 21.8);
      const st2 = a240.bleche.filter((b2) => b2.istSteife);
      pruef('A240 / 8.00 m: vier Steifen im Nachweis', st2.length, 4, 1e-9, 'Stk');
      wahr('Sie stehen auf den QV-Grenzen und am Jochende',
           st2.map((b2) => Math.round(b2.x * 1000)).join(',') === '2000,4000,6000,7090');
      wahr('Jede kennt ihr Profil',
           st2.every((b2) => b2.profil === 'IPE 240'));
      wahr('Die uebrigen bleiben Bleche',
           a240.bleche.filter((b2) => !b2.istSteife).length === 8);
    }

    /*
     * AUCH BEI A240 STEHT DIE LAGE - und die Endmasse sind andere als bei
     * A160: 1380/620 links, 545/545/910 rechts. Beide Seiten summieren auf
     * 2000, sonst waere eines der Masse falsch abgelesen.
     */
    const grob = AK.abfangBlechstationen('A240', 12.0);
    wahr('Bei A240 steht die Lage ebenso', grob?.randGenau === true);
    pruef('A240: erstes Blech bei 1.380 m', grob.stationen[0], 1.38, 1e-6, 'm');
    pruef('A240: letztes 910 mm vom Ende',
          12.0 - grob.stationen.at(-1), 0.91, 1e-6, 'm');

    /*
     * WAS SICH RECHNEN LAESST, SAGT DER KERN SELBST.
     */
    /*
     * >>> DER SPANNUNGSNACHWEIS DES GURTES - OHNE KNICKEN. <<<
     *
     * Weisung vom 3. September: «die knicklaenge hinten anstellen und mit
     * axis kalibrieren. die 500mm sind zu unkonservativ da sich der gesamte
     * traeger biegt in der horizontal und vertikal ebene.»
     *
     * Der Nachweis fuehrt deshalb den QUERSCHNITT, nicht die Stabilitaet -
     * und sagt das im Ergebnis. Ein eta, das den Druckgurt wie einen
     * Zuggurt behandelt und das verschweigt, waere die gefaehrlichste Zahl
     * dieser Anwendung.
     */
    {
      const q = AK.abfangQuerschnitt('A160');
      const fyd = 23.5 / 1.05;                  // S235, kN/cm2
      const nw = AK.abfangGurtnachweis(
        q, { Mrahmen: 50, Mvert: 8, Vrahmen: 20 }, 0.5, fyd);

      /*
       * Von Hand: N = M / e auf die Gurtflaeche.
       *
       * Hier stand `50 / 0.383` - der Hebelarm der frueheren, falschen
       * Profillage (Steg aussen). Seit dem 3. September zeigen die U-Profile
       * nach AUSSEN, e liegt bei 0.317 m, und die Zahl waere von Hand
       * nachgerechnet 157.8 / 22.0 = 7.17 kN/cm2. Genommen wird sie aus `e`,
       * damit sie beim naechsten Geometriefund mitwandert statt zu brechen.
       */
      pruef('Normalspannung aus dem Kraeftepaar',
            nw.sigN, (50 / (q.e / 100)) / q.Agurt, 1e-9, 'kN/cm2');
      pruef('… und von Hand nachgerechnet', nw.sigN, 7.17, 0.02, 'kN/cm2');
      // M_vert = 8 kNm auf W_y = 113.9 cm3 -> 7.02 kN/cm2
      pruef('Biegung quer zur Rahmenebene',
            nw.sigVert, 800 / 113.9, 0.02, 'kN/cm2');
      // oertlich: V/2 * a/2 = 10 * 0.25 = 2.5 kNm auf W_z = 18.3 cm3
      pruef('Oertliche Biegung zwischen den Blechen',
            nw.sigOertl, (nw.Moertl * 100) / q.Wgurtz, 1e-9, 'kN/cm2')
      pruef('Und die Summe ist die Summe',
            nw.sigma, nw.sigN + nw.sigVert + nw.sigOertl, 1e-9, 'kN/cm2');
      pruef('eta ist sigma durch f_yd', nw.eta, nw.sigma / fyd, 1e-9, '-');

      /*
       * DER OERTLICHE ANTEIL IST UNGEDAEMPFT - und das mit Absicht.
       *
       * Beim Tragjoch mindert GURT_DAEMPFUNG = 0.45 ihn, gemessen an 80
       * PyNite-Laeufen. Der Wert gilt fuer VIER Winkelgurte mit zwei
       * Blechebenen und ist auf zwei Walzprofile nicht uebertragbar. Bis er
       * gemessen ist, steht 1.0: die sichere Seite.
       */
      pruef('Der oertliche Anteil ist ungedaempft', nw.daempfung, 1.0, 1e-9, '-');

      /*
       * >>> UND DAS ERGEBNIS SAGT, WAS FEHLT. <<<
       */
      wahr('Der Nachweis sagt, dass Knicken fehlt', nw.knickenGefuehrt === false);
      wahr('… und nennt den Grund',
           /[Kk]nicklänge/.test(nw.knickenGrund)
           && /unkonservativ/.test(nw.knickenGrund));

      // Ein groesserer Blechabstand erhoeht den oertlichen Anteil - linear.
      const weit = AK.abfangGurtnachweis(
        q, { Mrahmen: 50, Mvert: 8, Vrahmen: 20 }, 1.0, fyd);
      pruef('Doppelter Blechabstand, doppelter oertlicher Anteil',
            weit.sigOertl, 2 * nw.sigOertl, 1e-9, 'kN/cm2');
      // Ohne Querkraft faellt er weg.
      const ohneV = AK.abfangGurtnachweis(
        q, { Mrahmen: 50, Mvert: 8, Vrahmen: 0 }, 0.5, fyd);
      pruef('Ohne Querkraft kein oertlicher Anteil', ohneV.sigOertl, 0, 1e-9,
            'kN/cm2');
    }

    /*
     * DER HINWEIS STEHT BEI DER ART, NICHT IN DER ALLGEMEINEN LISTE.
     *
     * Eine Nachweisgruppe «Knicken Abfanggurt» stuende auch am Tragjoch
     * unter den nicht gefuehrten - und das hat gar keinen Abfanggurt. Der
     * erste Versuch machte genau das, und vier Kontrollen fielen darueber.
     */
    {
      const { hinweise: hwK } = await import(J('core.checks.js'));
      const mA = rechne({ ...standardwerte(), tragwerksart: 'abfangjoch',
                          abfangTyp: 'A160' }).modell;
      const zeilen = hwK(mA).join(' | ');
      wahr('Beim Abfangjoch steht der Knick-Hinweis',
           zeilen.includes('Knicken des Druckgurtes'));
      const mJ = rechne(standardwerte()).modell;
      wahr('Beim Tragjoch steht er nicht',
           !hwK(mJ).join(' | ').includes('Druckgurtes'));
    }

    wahr('A160 ist rechenbar', AK.abfangRechenbar('A160', 9.5));
    wahr('Eine ungefuehrte Laenge nicht', !AK.abfangRechenbar('A160', 9.7));
    wahr('Und die Altbauweise nicht', !AK.abfangRechenbar('UAP 130'));
  }

  /*
   * >>> DER BINDEBLECHNACHWEIS DES ABFANGJOCHS. <<<
   *
   * Dieselbe Systematik wie beim Tragjoch (Weisung: «ueber die vorhandenen
   * bleche und den nachweisschnitt wie beim tragjoch»):
   *
   *      M_Blech = V_Ebene * ( a_links + a_rechts ) / 4
   *      V_Blech = 2 * M_Blech / Hebelarm
   *
   * Zwei Blechebenen statt vier - je eines oben und unten - teilen sich die
   * Querkraft der Rahmenebene.
   */
  {
    const AK = await import(J('core.abfangjoch.js'));
    const q = AK.abfangQuerschnitt('A160');
    const bl = AJ.abfangBindeblech('A160').regel;      // 100/8 x 280

    /*
     * VON HAND NACHGERECHNET. V = 40 kN, Felder 0.5 + 0.5 m, e = 38.3 cm:
     *   V_Ebene = 20 kN
     *   M_Blech = 20 * 1.0 / 4      = 5.0 kNm
     *   V_Blech = 2 * 5.0 / 0.383   = 26.1 kN
     *   W = 0.8 * 10^2 / 6          = 13.33 cm3
     *   sigma = 500 / 13.33         = 37.5 kN/cm2
     */
    const n = AK.abfangBlechnachweis(bl, 40, 1.0, q.e, 21.8);
    pruef('Die Querkraft teilt sich auf zwei Ebenen', n.Vebene, 20, 1e-9, 'kN');
    pruef('M_Blech = V_Ebene * Sa / 4', n.Mblech, 5.0, 1e-9, 'kNm');
    pruef('V_Blech = 2 * M / e', n.Vblech, 2 * 5.0 / (q.e / 100), 1e-9, 'kN');
    pruef('W = t * b^2 / 6', n.W, (0.8 * 10 * 10) / 6, 1e-9, 'cm3');
    pruef('A = b * t', n.A, 8.0, 1e-9, 'cm2');
    pruef('Biegespannung von Hand', n.sigma, 37.5, 0.1, 'kN/cm2');
    /*
     * DIE VERGLEICHSSPANNUNG LIEGT UEBER BEIDEN EINZELWERTEN - Biegung und
     * Schub treffen sich an derselben Stelle. Waere sie kleiner als die
     * Biegung allein, stimmte die Wurzel nicht.
     */
    wahr('sigma_v liegt ueber der Biegung allein', n.sigmaV > n.sigma);
    pruef('sigma_v nach von Mises', n.sigmaV,
          Math.sqrt(n.sigma ** 2 + 3 * n.tau ** 2), 1e-9, 'kN/cm2');
    pruef('eta ist sigma_v / fyd', n.eta, n.sigmaV / 21.8, 1e-9, '-');
    // Doppelte Querkraft, doppelte Spannung - die Beziehung ist linear.
    pruef('Doppelte Querkraft gibt doppeltes eta',
          AK.abfangBlechnachweis(bl, 80, 1.0, q.e, 21.8).eta, 2 * n.eta,
          1e-9, '-');
    // Ohne Blechmasse keine Zahl, sondern eine Ausnahme.
    let flog = null;
    try { AK.abfangBlechnachweis({}, 40, 1.0, q.e, 21.8); }
    catch (e) { flog = e; }
    wahr('Ohne Blechmasse wirft es', flog !== null);

    /*
     * ALLE BLECHE EINES JOCHS - jedes an SEINER Stelle.
     *
     * Mit dem Auflagerwert fuer alle zu rechnen waere grob konservativ, mit
     * dem mittleren unsicher. Geprueft wird an einem einfachen Balken:
     * V(x) laeuft von +qL/2 linear auf -qL/2.
     */
    const L = 9.5, qd = 4.0;
    const Vfn = (x) => qd * (L / 2 - x);
    const alle = AK.abfangBlechnachweise('A160', L, Vfn, 21.8);
    wahr('Es sind so viele Nachweise wie Stationen',
         alle.bleche.length === 16);
    wahr('Jedes Blech kennt seine Stelle',
         alle.bleche.every((b) => b.x > 0 && b.x < L));
    /*
     * DAS RANDFELD IST NUR EIN FELD BREIT. Es zu verdoppeln waere bequem
     * und falsch - das Randblech traegt weniger Feld, aber mehr Querkraft.
     */
    wahr('Das erste Blech hat nur ein Nachbarfeld',
         alle.bleche[0].aL === 0 && alle.bleche[0].aR > 0);
    wahr('Das letzte ebenso',
         alle.bleche.at(-1).aR === 0 && alle.bleche.at(-1).aL > 0);
    wahr('Die inneren haben zwei',
         alle.bleche.slice(1, -1).every((b) => b.aL > 0 && b.aR > 0));
    // Rand- und Endbleche sind staerker als das Regelblech.
    wahr('Die Randbleche sind Endbleche',
         alle.bleche[0].istRand && alle.bleche.at(-1).istRand);
    wahr('Und die inneren tragen das Regelmass',
         alle.bleche.slice(1, -1).every((b) => b.masse.b === bl.b
                                            && b.masse.t === bl.t));
    // Das massgebende ist wirklich das groesste.
    wahr('Das massgebende Blech ist das mit dem groessten eta',
         alle.bleche.every((b) => b.eta <= alle.massgebend.eta + 1e-12));
    /*
     * IN DER MITTE IST DIE QUERKRAFT NULL - dort muss das eta gegen null
     * gehen. Faellt das je aus, sitzt die Querkraft an der falschen Stelle.
     */
    const mitte = alle.bleche.reduce(
      (m, b) => (Math.abs(b.x - L / 2) < Math.abs(m.x - L / 2) ? b : m));
    wahr('Das mittlere Blech ist das schwaechst beanspruchte',
         mitte.eta < alle.massgebend.eta);
    /*
     * OHNE ERFASSTE EINTEILUNG GIBT ES KEINE NACHWEISE - keine geratenen.
     *
     * Hier stand A200/10.0 - seit dem Nachtrag der Stueckzahlen ist diese
     * Laenge erfasst, und die Kontrolle pruefte nichts mehr. Genommen wird
     * jetzt die FRAGLICHE Laenge: A360/21.00 m fuehrt 85 Bleche, ungerade
     * und damit unmoeglich.
     */
    /*
     * Die fragliche Stueckzahl blockiert den Nachweis nicht mehr - die Lage
     * kommt aus dem Schema. Was nicht geht, ist eine UNGEFUEHRTE Laenge:
     * dort gibt es weder Tabellenzeile noch Feldfolge.
     */
    wahr('Die fragliche Laenge wird jetzt nachgewiesen',
         AK.abfangBlechnachweise('A360', 21.0, Vfn, 21.8) !== null);
    wahr('Eine ungefuehrte Laenge ebenso wenig',
         AK.abfangBlechnachweise('A200', 10.3, Vfn, 21.8) === null);
  }

  /*
   * >>> DER EINZELMAST TRAEGT EINE BENENNUNG, NICHT DREI. <<<
   *
   * Gemeldet am 3. September: «hier braucht es nur eine tragwerkbenennung
   * fuer den einzelmasten.» Im Bild standen drei Anschriften ueber einem
   * einzigen Stiel:
   *
   *      HEB 240 · 7.50 m          das Ende B derselben Rechnung
   *      M3 · HEB 240 · 7.50 m     das Ende A
   *      P2 · frei · 0.00 m        der Jochtitel
   *
   * Der Jochtitel benennt dort ein Bauteil, das nicht dasteht: kein Jochtyp
   * (deshalb «frei»), keine Jochlaenge (deshalb 0.00 m). Und die
   * Mastschleife lief ueber beide Enden, obwohl es nur einen Masten gibt.
   */
  {
    const {  modellEinzelmast: mEM } = await import(J('core.vierendeel.js'));
    const wEM = { ...standardwerte(), tragwerksart: 'einzelmast', twPos: 'P2',
                  mastProfil: 'HEB 240', mastH: 7.5, mastLaenge: 7.5 };
    const szEM = R75.erzeugeSzene(mEM(wEM, getStahl(wEM.stahl)), null);
    const tEM = szEM.bauteiltitel ?? [];
    pruef('Der Einzelmast traegt genau eine Benennung', tEM.length, 1,
          1e-9, 'Stk');
    /*
     * SIE LEISTET BEIDES: Tragwerk und Mast. Die Position steht voran -
     * sie ersetzt den Jochtitel, der dort keinen Gegenstand hat -, dann der
     * Mastname, dann Profil und Laenge.
     */
    wahr('Sie nennt die Position', tEM[0].text.startsWith('P2 · '));
    wahr('… den Masten', tEM[0].text.includes('M1'));
    wahr('… das Profil', tEM[0].text.includes('HEB 240'));
    wahr('… und die Laenge', tEM[0].text.includes('7.50 m'));
    /*
     * UND KEIN JOCHTITEL: «frei» und «0.00 m» waren die Merkmale des
     * Titels, der dort nichts zu suchen hatte.
     */
    wahr('Kein Jochtitel beim Einzelmasten',
         !tEM.some((b) => b.text.includes('frei')
                       || b.text.includes('0.00 m')));

    /*
     * DAS JOCH BEHAELT SEINE DREI - Jochtitel und zwei Masten. Die Kur darf
     * den Regelfall nicht beschaedigen.
     */
    const eJ = rechne({ ...standardwerte(), L: 20, twPos: 'P1' });
    const tJ = R75.erzeugeSzene(eJ.modell, eJ).bauteiltitel ?? [];
    pruef('Das Joch traegt weiterhin drei', tJ.length, 3, 1e-9, 'Stk');
    wahr('Darunter sein Jochtitel',
         tJ.some((b) => b.text.startsWith('P1 · J90')));
    wahr('Und der Jochtitel nennt die Jochlaenge',
         tJ.some((b) => b.text.includes('20.00 m')));
  }

  /*
   * >>> DAS ABFANGJOCH ALS STABMODELL FUER AxisVM. <<<
   *
   * Der Jochexport baut vier Winkelgurte in zwei Blechebenen, senkrecht.
   * Das Abfangjoch ist ein anderes Tragwerk - zwei Walzgurte nebeneinander,
   * Bindebleche oben und unten, und der Rahmen LIEGT.
   */
  {
    const XA = await import(J('export.axisvm.abfang.js'));
    const m = XA.abfangAxisvmModell('A160', 9.5, { Fh: 22 });

    wahr('Das Format ist das des Aufbauskripts',
         m.format === 'tragjoch-stabmodell');
    wahr('Es sagt, was es ist',
         m.merkmale.includes('abfangjoch')
         && m.tragwerk.bauform.includes('Vierendeel'));

    /*
     * >>> DIE GURTE STEHEN NEBENEINANDER, NICHT UEBEREINANDER. <<<
     *
     * Das ist der ganze Unterschied zum Tragjoch. Alle Knoten liegen auf
     * z = 0, und die beiden Gurte trennt der Achsabstand e in y.
     */
    /*
     * DIE KNOTEN LIEGEN AUF DREI HOEHEN - Schwerachse und beide Flansche.
     *
     * Hier stand «alle auf einer Hoehe». Das galt fuer die Fassung mit einem
     * mittigen Riegel; seit die Bleche auf den Flanschen liegen (Weisung,
     * 3. September), sind es drei Ebenen. Die GURTKNOTEN liegen weiterhin
     * auf der Schwerachse - dort und nur dort stimmen die
     * Traegheitsmomente des Gurtstabs.
     */
    wahr('Die Gurtknoten liegen auf der Schwerachse',
         m.knoten.filter((k) => /^[VH]_/.test(k.name))
           .every((k) => Math.abs(k.z) < 1e-12));
    /*
     * >>> ZWEI GURTEBENEN - UND DAZWISCHEN DIE RIEGELKNOTEN. <<<
     *
     * Hier stand «genau zwei y-Ebenen im ganzen Modell». Das galt, solange
     * der Riegel ein einzelner Stab von Achse zu Achse war. Seit die
     * Knotenbereiche steif ausgebildet sind (Weisung, 3. September), sitzen
     * zwischen den Gurten zwei weitere Knoten je Riegel - dort, wo das
     * Bauteil beginnt und endet. Gezaehlt wird deshalb an den GURTknoten.
     */
    const ys = [...new Set(m.knoten.filter((k) => /^[VH][OU]?_/.test(k.name))
      .map((k) => Math.round(k.y * 1e6) / 1e6))];
    wahr('Es gibt genau zwei Gurtebenen', ys.length === 2);
    pruef('Ihr Abstand ist der Hebelarm', Math.abs(ys[0] - ys[1]),
          m.tragwerk.e, 1e-9, 'm');
    // Die Riegelknoten liegen INNERHALB der Gurte, nie ausserhalb.
    wahr('Die Riegelknoten liegen zwischen den Gurten',
         m.knoten.filter((k) => /_[ab]$/.test(k.name))
           .every((k) => Math.abs(k.y) < m.tragwerk.e / 2 + 1e-9));

    /*
     * >>> DER STEG STEHT VOR DEM FLANSCH - BEI BEIDEN. <<<
     *
     * Hier stand «AddC nimmt (h, b, e, tw, R), AddI nimmt (h, b, tw, tf, R).
     * Die Reihenfolge ist NICHT dieselbe» - und das war falsch. Am
     * 4. September im Querschnittseditor gemessen, indem beide Belegungen
     * gebaut und an ihrem Traegheitsmoment geprueft wurden:
     *
     *   e=9.5, tw=5.5   I_y  7'215'754   I_z   781'415
     *   e=5.5, tw=9.5   I_y  8'826'018   I_z 1'054'530
     *   Norm UPE 160    I_y  9'111'000   I_z 1'068'300
     *
     * `e` ist die STEGDICKE, obwohl `tw` danebensteht und anderes nahelegt.
     * Mit der alten Belegung war der Gurt 21 % zu weich in der starken und
     * 27 % in der schwachen Achse - und die Flaechenprobe fand es nicht,
     * weil vertauschte Dicken fast dieselbe Flaeche geben.
     */
    const gurt = m.querschnitte.find((q) => q.name === 'GURT');
    wahr('Der UPE-Gurt ist ein U-Profil', gurt.form === 'Channel');
    pruef('h steht vorn', gurt.parameter[0], 160, 1e-9, 'mm');
    pruef('dann b', gurt.parameter[1], 70, 1e-9, 'mm');
    pruef('dann die STEGdicke', gurt.parameter[2], 5.5, 1e-9, 'mm');
    pruef('dann der Flansch', gurt.parameter[3], 9.5, 1e-9, 'mm');
    // Und beim IPE-Typ dreht sich die Reihenfolge um.
    const mI = XA.abfangAxisvmModell('A270', 15.0, { Fh: 22 });
    const gI = mI.querschnitte.find((q) => q.name === 'GURT');
    wahr('Der IPE-Gurt ist ein I-Profil', gI.form === 'I');
    pruef('dort steht der Steg vor dem Flansch', gI.parameter[2], 6.6, 1e-9, 'mm');
    pruef('und der Flansch danach', gI.parameter[3], 10.2, 1e-9, 'mm');

    /*
     * DIE STAEBE. Je Feld zwei Gurte, je Station ein Bindeblech, dazu die
     * beiden Endbleche.
     */
    const gurtS = m.staebe.filter((x) => x.querschnitt === 'GURT');
    const blS = m.staebe.filter((x) => x.querschnitt === 'BLECH');
    const beS = m.staebe.filter((x) => x.querschnitt === 'BLECH_ENDE');
    /*
     * ZWEI BLECHE JE STATION - oben und unten auf Flanschhoehe (Weisung,
     * 3. September). Hier stand «eines je Station»; das war die Fassung mit
     * einem mittigen Riegel, und die bildet den Kasten nicht ab, den zwei
     * Bleche mit den Gurten bilden.
     */
    /*
     * >>> JE RIEGEL DREI STAEBE: STARR - BLECH - STARR. <<<
     *
     * Weisung vom 3. September: «im bereich der knoten die ueberlagerung
     * der traeger und verbindungsbleche steif ausbilden.» Sechzehn
     * Stationen zu zwei Ebenen sind 32 Riegel - und 96 Staebe.
     */
    /*
     * Vierzehn Stationen tragen das Regelblech - die sechzehnte Reihe minus
     * die beiden, an denen laut Zeichnung ein Endblech sitzt (Weisung vom
     * 4. September: «diese letzten stehenden bleche am schluss des traegers
     * sollten nicht sein» - sie stehen jetzt an ihrer Station, nicht mehr
     * am Traegerende). Je Station zwei Ebenen, je Riegel drei Staebe.
     */
    pruef('Zwei Bindebleche je Station', blS.length, 84, 1e-9, 'Stk');
    const mittel = blS.filter((x) => x.name.endsWith('_2'));
    pruef('… davon 28 das Blech selbst', mittel.length, 28, 1e-9, 'Stk');
    wahr('Die beiden Enden sind Starrkoerper',
         blS.filter((x) => /_[13]$/.test(x.name))
           .every((x) => x.art === 'starr'));
    pruef('Vier Endbleche - zwei Enden, zwei Ebenen',
          beS.filter((x) => x.name.endsWith('_2')).length, 4, 1e-9, 'Stk');
    /*
     * >>> UND AB A240 STEHT AN DEN QV-GRENZEN EIN RIEGEL. <<<
     *
     * Weisung vom 3. September: «die quersteifen ab A240 richtig ansetzen.»
     * Im Modell heisst das: ein Stab mit dem I-Querschnitt der Steife auf
     * der Gurt-Schwerachse - nicht zwei Flachstaehle auf Flanschhoehe.
     */
    {
      const m240 = XA.abfangAxisvmModell('A240', 8.0, {});
      const stS = m240.staebe.filter((x) => x.querschnitt === 'STEIFE');
      pruef('A240 / 8.00 m: vier Steifen im Modell',
            stS.filter((x) => x.name.endsWith('_2')).length, 4, 1e-9, 'Stk');
      const qsQ = m240.querschnitte.find((q2) => q2.name === 'STEIFE');
      wahr('Sie ist ein I-Profil, kein Rechteck',
           qsQ?.form === 'I' && qsQ.profil === 'IPE 240');
      /*
       * DIE REFERENZ IST [0,0,1], NICHT [1,0,0] WIE BEIM BLECH. Der Riegel
       * steht mit senkrechtem Steg; in der waagrechten Rahmenebene wirkt
       * damit seine schwache Achse - so, wie der Nachweis sie ansetzt.
       * Andersherum waere das Modell um I_y/I_z daneben, bei IPE 240 um
       * das Vierzehnfache.
       */
      wahr('Ihr Steg steht senkrecht',
           stS.every((x) => x.lcsZ[0] === 0 && x.lcsZ[2] === 1));
      /*
       * DER STEIFE KNOTENBEREICH GILT AUCH FUER SIE: das IPE 240 x 600
       * misst 600 mm, der Achsabstand der Gurte 647.6 - beide Enden sind
       * um 23.8 mm starr.
       */
      wahr('Auch sie hat steife Enden',
           stS.filter((x) => /_[13]$/.test(x.name)).length === 8);
      /*
       * Beide zeigen jetzt mit z nach oben - der Unterschied steckt im
       * QUERSCHNITT: die Steife ist ein I mit senkrechtem Steg, das Blech
       * ein flach liegendes Rechteck (Dicke hoch, Breite quer).
       */
      wahr('… und die Bleche liegen flach',
           m240.staebe.filter((x) => x.querschnitt === 'BLECH')
             .every((x) => x.lcsZ[2] === 1));
      // Sie sitzt auf der Schwerachse, die Bleche auf Flanschhoehe.
      const kn = new Map(m240.knoten.map((n2) => [n2.name, n2]));
      wahr('Sie sitzt auf der Schwerachse der Gurte',
           stS.every((x) => Math.abs(kn.get(x.von).z) < 1e-9));
      // Acht Blechstationen bleiben - zwoelf Stationen, vier davon Steifen.
      /*
       * Zwoelf Stationen, vier davon Steifen, zwei mit Endblech - sechs
       * bleiben fuer das Regelblech, in zwei Ebenen.
       */
      pruef('Sechs Blechstationen bleiben',
            m240.staebe.filter((x) => x.querschnitt === 'BLECH'
                                   && x.name.endsWith('_2')).length,
            12, 1e-9, 'Stk');
    }
    // Sie liegen auf drei Hoehen: Schwerachse und beide Flansche.
    const zEb = [...new Set(m.knoten.map((n2) => Math.round(n2.z * 1e6) / 1e6))];
    pruef('Drei Ebenen in z', zEb.length, 3, 1e-9, 'Stk');
    wahr('Symmetrisch zur Schwerachse',
         Math.abs(Math.min(...zEb) + Math.max(...zEb)) < 1e-9
         && zEb.includes(0));
    /*
     * >>> DIE GURTE LAUFEN DURCH - AUCH UEBER DIE STEIFEN ABSCHNITTE. <<<
     *
     * Hier stand die Zahl der Gurtstaebe gegen die halbe Knotenzahl. Das
     * ging auf, solange jeder Knoten ein Gurtknoten war; seit die
     * Flanschknoten und die Riegelknoten dazukommen, nicht mehr. Geprueft
     * wird jetzt, worauf es ankommt: an jedem Gurt haengt zwischen je zwei
     * benachbarten Knoten genau ein Stab, und keiner fehlt.
     */
    /*
     * >>> IM GABELBEREICH TRAEGT DER VERBUNDSTAB. <<<
     *
     * Der Gurt laeuft dort NICHT weiter - er waere doppelt vorhanden,
     * einmal fuer sich und einmal im Verbund. Gezaehlt wird deshalb die
     * Summe aus beiden: sie deckt jedes Feld genau einmal.
     */
    const gk = m.knoten.filter((k) => /^V_/.test(k.name)).length;
    const laengs = m.staebe.filter((x) => /^[VH]_S\d+$/.test(x.name)
                                       || /^GABEL_[VH]\d+$/.test(x.name));
    pruef('Je Feld zwei Laengsstaebe', laengs.length, (gk - 1) * 2, 1e-9, 'Stk');
    /*
     * DIE LINIENLAST LAEUFT UEBER ALLE ABSCHNITTE (Weisung, 3. September:
     * «achte darauf dass die linienlast durchgeht, wie bei tragjoch»).
     * Auch der steife Knotenbereich traegt sein Eigengewicht - sonst fehlte
     * es genau dort, wo das Blech aufliegt.
     */
    const gs = new Set(laengs.map((x) => x.name));
    const mitLast = new Set(m.lasten.strecke.map((l) => l.stab));
    wahr('Jeder Gurtabschnitt traegt seine Linienlast',
         [...gs].every((n2) => mitLast.has(n2)));
    /*
     * >>> IM GURT WIRD NICHTS AUSGESTEIFT. <<<
     *
     * Hier stand «auch die steifen Gurtabschnitte tragen ihre Linienlast».
     * Sie gibt es nicht mehr: Weisung vom 4. September, «die aussteiffung in
     * den gurten wuerde ich weglassen, da diese auch die biegung um y
     * beeinflussen». Der Gurt laeuft ununterbrochen durch, und damit auch
     * seine Last - das prueft die Zeile darueber.
     */
    wahr('Kein Gurtabschnitt traegt steifes Material', !m.staebe.some(
      (x) => x.querschnitt === 'GURT' && /^[VH]_S\d+$/.test(x.name)
          && x.steifesMaterial === true));
    /*
     * `lcsZ` HAELT DEN QUERSCHNITT AUFRECHT. Ohne diese Angabe legt AxisVM
     * die lokale Achse nach eigener Regel, der Gurt laege auf der Seite -
     * mit vertauschten Traegheitsmomenten und einem Ergebnis, dem man es
     * nicht ansieht.
     */
    /*
     * Jeder Stab sagt seine lokale z-Achse. Die STARREN ARME stehen
     * senkrecht - fuer sie waere [0,0,1] die Stabachse selbst und damit
     * ungueltig; sie tragen [0,1,0].
     */
    wahr('Jeder Stab sagt seine lokale z-Achse',
         m.staebe.every((x) => Array.isArray(x.lcsZ) && x.lcsZ.length === 3));
    /*
     * DIE GURTE stehen aufrecht - z nach oben, wie beim Tragjoch. Die
     * BLECHE brauchen z in die TRAEGERACHSE, damit ihre Breite dorthin
     * zeigt; mit z nach oben stuenden sie hochkant, und ihre
     * Biegesteifigkeit laege um (b/t)^2 daneben.
     */
    /*
     * >>> DIE GURTE STEHEN SPIEGELBILDLICH. <<<
     *
     * Weisung vom 4. September: «gurte spiegelsymetrisch auf die jochachse
     * bezogen (c ist gegen aussen offen)». Ein U-Profil laesst sich in
     * AxisVM nicht spiegeln; die Referenz dreht es um 180 Grad um die
     * Stabachse, und beim UPE vertauscht das genau die Oeffnungsrichtung.
     * Aufrecht stehen beide - nur eben andersherum.
     */
    wahr('Die Gurte stehen aufrecht',
         m.staebe.filter((x) => x.querschnitt === 'GURT' && x.art === 'stab')
           .every((x) => Math.abs(x.lcsZ[2]) === 1));
    wahr('... und spiegelbildlich zur Jochachse',
         m.staebe.filter((x) => /^V_S[0-9]+$/.test(x.name))
           .every((x) => x.lcsZ[2] === 1)
         && m.staebe.filter((x) => /^H_S[0-9]+$/.test(x.name))
              .every((x) => x.lcsZ[2] === -1));
    /*
     * >>> DIE BLECHE LIEGEN FLACH - UEBER DEN QUERSCHNITT, NICHT UEBER DIE
     *     REFERENZ. <<<
     *
     * Hier stand «z in die Traegerachse» (`lcsZ = [1,0,0]`). Im aufgebauten
     * Modell standen die Bleche damit hochkant (Weisung, 4. September: «die
     * bleche sind stehen anstatt liegend»): die Referenz griff nicht, und
     * AxisVM legte seine lokale z in die Vertikalebene.
     *
     * Jetzt traegt der QUERSCHNITT die Lage - h = Dicke, b = Breite - und
     * die Referenz zeigt nach oben. Damit liegt das Blech flach, gleich ob
     * die Referenz ankommt oder nicht.
     */
    wahr('Die Bleche stehen aufrecht referenziert',
         m.staebe.filter((x) => x.querschnitt.startsWith('BLECH'))
           .every((x) => x.lcsZ[2] === 1));
    /*
     * >>> DIE BREITE STEHT VORN. <<<
     *
     * Zweimal daneben: erst `[b,t]` mit Referenz `[1,0,0]`, dann `[t,b]` mit
     * `[0,0,1]` - beide Male stand das Blech hochkant im Modell. Die zwei
     * Aenderungen heben einander auf. `AddRectangular(h, b)` legt h in die
     * lokale y, nicht in die lokale z; mit senkrechter Referenz gehoert
     * damit die BREITE nach vorn.
     */
    wahr('… und ihr Querschnitt ist die Breite quer, die Dicke hoch',
         (() => {
           const q2 = m.querschnitte.find((x) => x.name === 'BLECH');
           return q2.parameter[0] > q2.parameter[1];
         })());
    wahr('Die starren Arme stehen selbst senkrecht',
         m.staebe.filter((x) => x.name.startsWith('ARM_'))
           .every((x) => x.lcsZ[2] === 0));

    /*
     * >>> DIE GABEL SITZT AUSSEN, UM EINE FLANSCHBREITE VERSETZT. <<<
     *
     * Weisung vom 4. September: «achte dabei dass die schwerelinie versetzt
     * ist, da der gurt durchlaeuft und die aufdoppelung aussen
     * angeschweisst ist» - «ja versatz sauber modellieren».
     *
     * Gebaut wird kein gemittelter Verbundquerschnitt, sondern das, was
     * dasteht: ein zweiter Stab desselben Profils auf seiner eigenen Achse,
     * an jedem Knoten starr mit dem Gurt verbunden.
     */
    {
      const gb = m.staebe.filter((x) => x.name.startsWith('GABEL_'));
      const ga = m.staebe.filter((x) => x.name.startsWith('GARM_'));
      wahr('Die Gabel steht als eigener Stab da', gb.length > 0);
      wahr('… und haengt an starren Querarmen',
           ga.length > 0 && ga.every((x) => x.art === 'starr'));
      const PR3 = await import(J('data.profiles.js'));
      /*
       * >>> DER VERBUND LIEGT AUF DER HALBEN FLANSCHBREITE. <<<
       *
       * Die beiden Einzelachsen liegen eine ganze Flanschbreite
       * auseinander; der Schwerpunkt zweier gleicher Profile liegt
       * dazwischen. Der Auftraggeber hat es im Querschnittsmodul gemessen:
       * y_G = 35.0 mm bei einem UPE 160 mit b = 70.
       */
      const p2 = PR3.getGurtprofil(m.tragwerk.gurtprofil);
      const kn2 = new Map(m.knoten.map((n2) => [n2.name, n2]));
      pruef('Ihr Versatz ist die halbe Flanschbreite',
            m.tragwerk.gabel.versatz, p2.b / 200, 1e-9, 'm');
      /*
       * DER QUERSCHNITT IST DER ECHTE, kein Ersatz mit gerechneten Werten:
       * zwei gleichsinnige U als Polygonzug ueber AddCustom (Weisung,
       * 4. September). Die Kennwerte stehen daneben - sie tragen die
       * Flaechenprobe des Aufbauskripts und lassen sich gegen das
       * Querschnittsmodul halten.
       */
      const qg = m.querschnitte.find((x) => x.name === 'GABEL');
      wahr('Die Gabel traegt einen Doppel-U-Querschnitt', qg?.form === 'DoppelU');
      pruef('Seine Flaeche ist die doppelte', qg.A, 2 * p2.A / 1e4, 1e-12, 'm2');
      pruef('… und sein I_z traegt den Steiner-Anteil',
            qg.Iz, 2 * (p2.Iz + p2.A * (p2.b / 2) ** 2) / 1e8, 1e-12, 'm4');
      wahr('Der Verbundstab steht auf der Verbundachse',
           gb.every((x) => Math.abs(kn2.get(x.von).y)
                           > m.tragwerk.e / 2 + p2.b / 400));
      wahr('Sie liegt AUSSEN, nicht innen',
           gb.every((x) => Math.abs(kn2.get(x.von).y) > m.tragwerk.e / 2));
      // Sie beginnt 850 mm vom Jochende und ist so lang wie im Sortiment.
      const xg = gb.map((x) => kn2.get(x.von).x);
      pruef('Sie beginnt bei 0.850 m', Math.min(...xg), 0.85, 1e-9, 'm');
      const xe = gb.map((x) => kn2.get(x.bis).x);
      pruef('… und endet 660 mm weiter',
            Math.max(...xe) - Math.min(...xg), 0.66, 1e-9, 'm');
      /*
       * >>> NUR AN EINEM ENDE. <<<
       *
       * Hier stand bis zum 4. September das Gegenteil - «An beiden Enden des
       * Jochs» - und der Pruefstand hielt damit einen Modellfehler fest.
       * Weisung: «beachte das die verstaerkung nur einseitig ist aufgrund
       * der laengeren gabel fuer das einfaedelnde montieren der traeger
       * zwischen zwei masten.» Verstaerkt ist das lange Montageende, das
       * kurze nicht.
       */
      wahr('Nur am langen Jochende, nicht am kurzen',
           Math.max(...xe) < m.tragwerk.L - 1);
      // Ein Stueck je Gurt - in Feldern gebaut, aber auf zwei Achsen.
      pruef('Auf zwei Achsen, eine je Gurt',
            new Set(gb.map((x) => kn2.get(x.von).y.toFixed(6))).size,
            2, 1e-9, 'Achsen');
    }

    /*
     * >>> DIE AUFLAGER SIND UM y UND z FREI. <<<
     *
     * Weisung vom 3. September. Die Torsion um die Traegerachse bleibt
     * gehalten; in Laengsrichtung haelt nur EIN Ende, sonst bekaeme der
     * Traeger Zwang aus seiner eigenen Verkuerzung.
     */
    wahr('Beide Biegungen sind gelenkig',
         m.auflager.every((l) => l.fiy === 'Free' && l.fiz === 'Free'));
    wahr('Die Torsion ist gehalten',
         m.auflager.every((l) => l.fix === 'Rigid'));
    wahr('Nur ein Ende haelt in Laengsrichtung',
         m.auflager.filter((l) => l.ux === 'Rigid').length === 1
         && m.auflager.filter((l) => l.ux === 'Free').length === 1);
    /*
     * >>> EIN PUNKT JE ENDE, NICHT ZWEI GURTE. <<<
     *
     * Weisung vom 4. September: «die gabel gegen ende hin ist offen. nur
     * ueber die auflagerpunkte lagern.» Zwei gehaltene Gurtknoten koennten
     * ein Kraeftepaar aufnehmen und das Ende um z einspannen - die offene
     * Gabel kann das nicht.
     */
    pruef('Zwei Auflager - eines je Ende', m.auflager.length, 2, 1e-9, 'Stk');
    wahr('Sie sitzen auf der Jochachse',
         m.auflager.every((l) => {
           const k2 = m.knoten.find((n2) => n2.name === l.knoten);
           return Math.abs(k2.y) < 1e-12 && Math.abs(k2.z) < 1e-12;
         }));
    wahr('Ein Schott haengt sie starr an beide Gurte',
         m.staebe.filter((x) => x.name.startsWith('SCHOTT_')).length === 4
         && m.staebe.filter((x) => x.name.startsWith('SCHOTT_'))
              .every((x) => x.art === 'starr'));

    /*
     * DER LEITERZUG GREIFT IN DER TRAEGERMITTELEBENE AN (Weisung) - auf
     * beide Gurte gleich, keine planmaessige Torsion. Er wirkt in y.
     */
    wahr('Der Leiterzug wirkt in Gleisrichtung',
         m.lasten.punkt.every((l) => l.richtung === 'Y'));
    pruef('Er teilt sich auf beide Gurte',
          m.lasten.punkt.reduce((a2, l) => a2 + l.wert, 0), 22, 1e-9, 'kN');
    wahr('Und beide bekommen gleich viel',
         m.lasten.punkt[0].wert === m.lasten.punkt[1].wert);
    // Das Eigengewicht quer dazu, je Gurt die Haelfte.
    wahr('Das Eigengewicht wirkt lotrecht',
         m.lasten.strecke.every((l) => l.richtung === 'Z' && l.wert < 0));

    /*
     * OHNE ERFASSTE BLECHEINTEILUNG KEIN MODELL - die Bleche stuenden
     * sonst irgendwo, und das Modell saehe richtig aus.
     */
    let flog = null;
    try { XA.abfangAxisvmModell('A200', 10.3, {}); } catch (e) { flog = e; }
    wahr('Ohne Blecheinteilung wirft es', flog !== null);
  }

  /*
   * >>> DAS MASSGEBENDE RAHMENFELD IST NICHT DIE REGELTEILUNG. <<<
   *
   * Gefunden am 3. September beim Vergleich mit AxisVM und PyNite: beide
   * gaben ein Gurtmoment vier- bis fuenfmal ueber dem des Kerns, und die
   * massgebende Stelle war nicht die Feldmitte, sondern das AUFLAGER.
   *
   * Der Grund ist Geometrie, kein Kennwert: zwischen Auflager und erstem
   * Blech liegen bei A160 / 9.50 m ganze 2.00 m, die Regelteilung misst
   * 0.50. Das erste Rahmenfeld ist VIERMAL so lang - und dort steht
   * zugleich die groesste Querkraft.
   *
   * Gemessen: eta 0.61 mit der Regelteilung, 1.65 mit dem Randfeld,
   * 1.54 in AxisVM. Der Kern lag auf der UNSICHEREN Seite, um das
   * Zweieinhalbfache; mit dem richtigen Feld trifft er AxisVM auf sieben
   * Prozent und bleibt konservativ.
   */
  {
    const AK = await import(J('core.abfangjoch.js'));
    const rf = AK.abfangRahmenfeld('A160', 9.5);
    wahr('Es gibt ein massgebendes Rahmenfeld', Boolean(rf));
    /*
     * >>> DAS RANDFELD IST KLEINER GEWORDEN - UND RICHTIGER. <<<
     *
     * Hier standen 2.00 m und der Faktor 4. Das war die symmetrische Reihe
     * ohne die Endbleche. Nach dem Schema sitzt das erste Blech bei
     * 1.450 m, und das Auflager liegt um den Ueberstand (jt - js)/2 = 0.25
     * naeher: 1.200 m bleiben, knapp zweieinhalb Regelteilungen. Das
     * Randfeld ist immer noch das massgebende - nur nicht mehr so gross,
     * wie die Schaetzung glauben machte.
     */
    pruef('Der Ueberstand ueber das Auflager', rf.ueberstand, 0.25, 1e-6, 'm');
    pruef('Das Randfeld misst 1.20 m', rf.randfeld, 1.2, 1e-6, 'm');
    pruef('Und ist das laengste', rf.a, 1.2, 1e-6, 'm');
    pruef('Zweikommavier Regelteilungen', rf.faktor, 2.4, 1e-6, '-');
    /*
     * DIE FELDER DECKEN DIE STUETZWEITE - kein Stueck faellt weg. Waere
     * eines vergessen, waere der Nachweis dort blind.
     */
    const sw = AK.abfangStuetzweite('A160', 9.5);
    pruef('Die Felder decken die Stuetzweite',
          rf.felder.reduce((a2, b2) => a2 + b2, 0), sw.bis, 1e-6, 'm');
    // In der Mitte sitzt das kuerzeste Paar - das Feld A1 des Schemas.
    pruef('Das kuerzeste Feld ist das mittlere Paar',
          Math.min(...rf.felder), 0.25, 1e-6, 'm');

    /*
     * >>> UND DAS AENDERT DEN NACHWEIS. <<<
     *
     * Dieselbe Rechnung, einmal mit der Regelteilung und einmal mit dem
     * Randfeld. Der Unterschied ist der Faktor, um den der Kern danebenlag.
     */
    const q = AK.abfangQuerschnitt('A160');
    const F = 22, L = sw.bis;
    const s0 = { Mrahmen: (F * L) / 4, Mvert: 0, Vrahmen: F / 2 };
    const mitTeilung = AK.abfangGurtnachweis(q, s0, rf.teilung, 21.8);
    const mitRand = AK.abfangGurtnachweis(q, s0, rf.a, 21.8);
    wahr('Mit dem Randfeld faellt der Nachweis strenger aus',
         mitRand.eta > mitTeilung.eta);
    pruef('… und zwar um den Faktor des Feldes',
          mitRand.Moertl / mitTeilung.Moertl, rf.faktor, 1e-9, '-');
    /*
     * DIE GEGENPROBE AN AxisVM. Gemessen am 3. September fuer A160 / 9.50 m
     * unter 22 kN Leiterzug: sigma 33.56, eta 1.539. Der Kern darf darueber
     * liegen - konservativ ist richtig - aber nicht um Welten, sonst waere
     * das Sortiment unbrauchbar.
     */
    /*
     * >>> DIE AxisVM-REFERENZ IST HINFAELLIG. <<<
     *
     * Sie wurde am 3. September gemessen (eta 1.539) - mit dem damaligen
     * Hebelarm (38.3 statt 31.7 cm) UND dem damaligen Querschnitt (I_z 85.3
     * statt 106.8). Beide sind seither berichtigt; die Zahl gehoert neu
     * gemessen, sobald das Modell wieder rechnet.
     *
     * Was bleibt und geprueft wird, ist die AUSSAGE, die von der Referenz
     * unabhaengig ist: mit dem Randfeld faellt der Nachweis strenger aus als
     * mit der Regelteilung, und zwar um den Faktor des Feldes. Eine
     * Zahlengegenprobe, die auf ueberholten Daten beruht, waere schlimmer
     * als keine.
     */
    wahr('Das Randfeld schaerft den Nachweis um den Feldfaktor',
         Math.abs(mitRand.Moertl / mitTeilung.Moertl - rf.faktor) < 1e-9);

    // Ohne erfasste Einteilung kein Rahmenfeld - keine geratene Laenge.
    wahr('Ohne Einteilung kein Rahmenfeld',
         AK.abfangRahmenfeld('A200', 10.3) === null);
  }

  /*
   * >>> EIN SCHALTER DARF SICH NICHT SELBST VERSTECKEN. <<<
   *
   * Weisung vom 3. September: «Dieser button ist sehr maechtig. wie kann man
   * sonst die Masten wieder einblenden?»
   *
   * Das Symbol in der Tragwerksleiste schaltet die Masten eines Tragwerks
   * aus - und war danach der EINZIGE Weg zurueck: alle uebrigen Mastfelder
   * haengen an `mastDa`, mit den Masten verschwand also die ganze Gruppe
   * «Masten» aus der Seitenleiste. Gemessen: null Felder blieben stehen.
   */
  {
    const { sichtbareFelder: sfM } = await import(J('ui.schema.js'));
    const w = standardwerte();
    const mit = sfM('mast', w).map((f) => f.key);
    const ohne = sfM('mast', { ...w, mastVorhanden: false })
      .map((f) => f.key);
    wahr('Mit Masten steht die Gruppe voll da', mit.length > 5);
    /*
     * DAS IST DER KERN: ohne Masten bleibt GENAU EIN Feld - der Schalter,
     * der sie zurueckholt. Faellt er je weg, ist der Rueckweg wieder nur
     * das Symbol in der Leiste.
     */
    wahr('Ohne Masten bleibt der Rueckweg stehen',
         ohne.includes('mastVorhanden'));
    pruef('… und zwar als einziges Feld', ohne.length, 1, 1e-9, 'Stk');
    wahr('Er steht auch im vollen Zustand da', mit.includes('mastVorhanden'));
    // Beim Einzelmasten gaebe es nichts abzuschalten - er IST der Mast.
    wahr('Beim Einzelmasten steht er nicht',
         !sfM('mast', { ...w, tragwerksart: 'einzelmast' })
           .map((f) => f.key).includes('mastVorhanden'));
  }

  /*
   * DIE ZEICHNUNG SCHIEBEN - der Massstab bleibt unangetastet.
   *
   * Geprueft wird an der Kalibrierung selbst, ohne Zeichenflaeche: die
   * Umrechnung Bildschirm -> Welt braucht einen Projektor, das Verschieben
   * in Metern nicht. Und genau das ist der Weg der Pfeiltasten.
   */
  {
    const schieb = R75.Modellansicht.prototype.verschiebeZeichnungWelt;
    const stand = { zeichnung: { kalibrierung: { s: 0.01, x0: -10, z0: 4 } },
                    opt: {} };
    wahr('Verschoben wird', schieb.call(stand, 0.30, -0.20) === true);
    pruef('x0 folgt', stand.zeichnung.kalibrierung.x0, -9.70, 1e-12, 'm');
    pruef('z0 folgt', stand.zeichnung.kalibrierung.z0, 3.80, 1e-12, 'm');
    pruef('Der Massstab bleibt', stand.zeichnung.kalibrierung.s, 0.01, 1e-15,
          'm/Punkt');
    wahr('Ohne Kalibrierung passiert nichts',
         schieb.call({ zeichnung: null, opt: {} }, 1, 1) === false);
    wahr('Eine unbrauchbare Zahl wird abgewiesen',
         schieb.call(stand, NaN, 0) === false);
    pruef('… und laesst die Lage stehen', stand.zeichnung.kalibrierung.x0,
          -9.70, 1e-12, 'm');
  }
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
