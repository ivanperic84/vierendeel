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
  // Der Lastfall hier ist vertikal, also UNVERSCHIEBLICH: das Joch hält die
  // beiden Mastköpfe zusammen, und es gilt 3.10 · E·I/H statt des Kragmastes
  // (core.auflager.js, MAST_UNVERSCHIEBLICH). Der Kragarmwert bleibt daneben
  // ausgewiesen und gilt beim Wind in Jochachse.
  const w = basis({ endbedingung: 'mast', mastProfil: 'HEB 240',
                    mastH: 8, mastSteg: 'jochachse', mastAnschluss: 'kragarm' });
  const e = rechne(w);
  const p = e.modell.federn.mast;
  pruef('Kragmastwert c = E·I/H', p.cKragarm,
        (E_STAHL * (11260 * 1e-8)) / 8, 1e-9, 'kNm/rad');
  pruef('Vertikallast rechnet unverschieblich', p.cPhi, 3.10 * p.cKragarm,
        1e-9, 'kNm/rad');
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
  pruef('Unverschieblich ist 3.10 · E·I/H', durch.cPhi,
        3.10 * durch.cKragarm, 1e-9, 'kNm/rad');
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
  wahr('Ein Anbauteil ergibt EINEN Arm, auch bei mehreren Lastblöcken',
       bauA.arme.length === 1, `${bauA.arme.length} Arm(e)`);

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
  wahr('Variante gurte: ein Ende längs frei',
       gurteM.auflager.filter((a) => a.ux === 'Free').length === 4);
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

    // Das Anbauteil selbst ist ein Starrkörper - ohne Gelenk.
    const arm = (b) => b.staebe.find((x) => /^ARM\d+$/.test(x.name));
    wahr('Die Hängestütze ist als Starrkörper geführt',
         arm(vier).starrRolle === 'anbauteil'
         && !arm(vier).gelenkAnfang && !arm(vier).gelenkEnde);

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
  const e0 = basis({ L: 20, torsionModell: 'verteilt',
                     gammaG: 1.35, gammaQ: 1.5, psi0: 0.5 });
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
  // GEMESSEN: gedämpfte Steifigkeitsaufteilung, an PyNite kalibriert.
  const ge = gurtanteile(mUngleich, 'gemessen');
  pruef('gemessen: Anteile ergänzen sich zu eins', ge.OG + ge.UG, 1, 1e-12);
  wahr('gemessen liegt zwischen hälftig und I-Anteil',
       ge.OG > 0.5 && ge.OG < st.OG);
  // Am Signaljoch (I_OG/I_UG = 2.45) hat PyNite mit SCHUBWEICHEN Blechen
  // 56.7 … 60.7 % gemessen, Mittel 58.8 %. Gegenprobe mit gleichen Gurten:
  // exakt 50.0 %.
  pruef('gemessen trifft die Messung am Signaljoch', ge.OG, 0.589, 5e-3);
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
        3.10 * (210e6 * mB.I_cm4 * 1e-8) / 12.0, 1e-9, 'kNm/rad');
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
  // Ohne Mast als Auflager gibt es nichts zu verdrehen.
  const manuell = rechne({ ...e0, endbedingung: 'manuell', cPhi: 6000 });
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
titel('26b Der Mast ist Auflager, nicht Bauteil');
// Nachgewiesen wird das Joch. Der Mast bestimmt die Drehfeder und den
// Mastwind auf das Jochende - seine eigene Ausnutzung gehoert in ein
// Rahmenmodell und wird hier gar nicht erst ausgewiesen.
{
  const AUF = await import(J('core.auflager.js'));
  const { hinweise } = await import(J('core.checks.js'));
  const w = basis({ endbedingung: 'mast', mastProfil: 'HEB 240', mastH: 7.5,
                    mastSteg: 'jochachse', mastAnschluss: 'kragarm',
                    wMastAusTabelle: false, wMast: 0.37 });
  const e = rechne(w);
  wahr('Kein Mastnachweis im Ergebnis', e.mast === undefined);
  wahr('Keine Funktion mastNachweis mehr', AUF.mastNachweis === undefined);
  wahr('η ist die Ausnutzung des Jochs', e.max.etaGesamt
       === Math.max(...e.knoten.map((k) => k.eta)));
  wahr('etaMitMast gibt es nicht mehr', e.max.etaMitMast === undefined);
  // Die Feder und der Mastwind bleiben - daran haengt das Joch.
  wahr('Die Drehfeder aus dem Mast steht weiterhin',
       e.modell.federn.mast != null && e.modell.federn.cA > 0);
  wahr('Der Hinweis sagt, dass der Mast nicht nachgewiesen wird',
       hinweise(e.modell).join(' | ').includes('Auflager, nicht Bauteil'));
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

  pruef('Vorgabe ist 2.0', ENDFELD_ZUSCHLAG, 2.0, 1e-12);
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
  wahr('Mit Torsion wird der Zuschlag wirksam', b1.endfeldFaktor > 1.05,
       `Faktor ${b1.endfeldFaktor.toFixed(3)}, Torsionsanteil `
       + `${(100 * b1.torsionsanteil).toFixed(0)} %`);
  wahr('Er bleibt unter dem vollen Wert, solange nicht alles Torsion ist',
       b1.endfeldFaktor <= ENDFELD_ZUSCHLAG + 1e-9);
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
  wahr('Die Ausnutzung des Endfeldblechs steigt',
       t1.knoten[1].etaB > t0.knoten[1].etaB);
  wahr('Und sie sinkt nirgends',
       t1.knoten.every((k, i) => k.etaB >= t0.knoten[i].etaB - 1e-12));
  const { hinweise: hw2 } = await import(J('core.checks.js'));
  wahr('Der Zuschlag steht in den Hinweisen',
       hw2(mit.modell).join(' | ').includes('äussersten Stationen'));
  wahr('Abgeschaltet wird das ebenfalls vermerkt',
       hw2(ohne.modell).join(' | ').includes('abgeschaltet'));
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
  wahr('Der Mast wird als Stummel gezeichnet', auf.some((l) => l.mast));
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
  const { koppelfaktor } = await import(J('core.querschnitt.js'));
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
  pruef('Faktor = 2 · r · β/(1+β)', kf.faktor,
        2 * kf.r * (kf.beta / (1 + kf.beta)), 1e-12, '–');
  // Gleichschenkliger Winkel: r = (I1 − I2)/(I1 + I2)
  pruef('Beim gleichschenkligen Winkel ist r = (I1−I2)/(I1+I2)', kf.r,
        (w.I1 - w.I2) / (w.I1 + w.I2), 1e-9, '–');

  // Grenzfaelle: ein steiferes Blech behindert mehr, ein laengeres weniger.
  const steifer = koppelfaktor(P, { ...blech, breite: 220 }, 0.70, 0.42, 'z');
  const laenger = koppelfaktor(P, { ...blech, laenge: 700 }, 0.70, 0.70, 'z');
  wahr('Ein steiferes Blech zieht mehr Moment an sich', steifer.faktor > kf.faktor);
  wahr('Ein weicheres Blech weniger', laenger.faktor < kf.faktor);
  wahr('Volle Behinderung bleibt die obere Schranke', kf.faktor < 2 * kf.r + 1e-12);
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
  wahr('Und zwar bevor sie mangels Datenbasis aussteigt',
       aq.indexOf('dateiEmpfang(dateiAnnehmen)') < aq.indexOf('dialogDaten(true)'));
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
    const ausBlock = (von, bis) => {
      const a = q.indexOf(von);
      const s = q.slice(a, q.indexOf(bis, a));
      return new Set([...s.matchAll(/(\w+):\s*['a-z]/g)].map((m) => m[1]));
    };
    const haupt = ausBlock('const HAUPTSCHALTER = {', '};');
    const vorgabe = ausBlock('this.ebenen = {', '};');
    const fehlt = [...haupt].filter((k) => !vorgabe.has(k));
    wahr('Jede Ebene mit Hauptschalter hat auch einen Anfangswert',
         fehlt.length === 0, fehlt.length ? `fehlt: ${fehlt.join(', ')}` :
         `${haupt.size} Ebenen unter drei Gruppen`);
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
console.log('\n' + '='.repeat(104));
console.log(`ERGEBNIS:  ${bestanden} bestanden, ${gefallen} gefallen`);
if (gefallen) {
  console.log('\nNICHT BESTANDEN:');
  fehlerliste.forEach((f) => console.log('  · ' + f));
}
console.log('='.repeat(104));
process.exit(gefallen ? 1 : 0);
