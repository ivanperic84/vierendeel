/**
 * export.bericht.js
 * ---------------------------------------------------------------------------
 * Stellt aus dem Rechenergebnis die Blätter für den Excel-Export zusammen.
 * Kennt den XLSX-Schreiber nur über dessen Datenformat (Zeilen aus Zellen) und
 * enthält selbst keine Rechnung.
 * ---------------------------------------------------------------------------
 */

import { STIL, arbeitsmappe, herunterladen } from './export.xlsx.js';
import { FELDER, GRUPPEN, sichtbareFelder } from './ui.schema.js';
import { MASSVARIANTEN } from './core.vierendeel.js';
import { verortung, verortungKurz } from './core.constants.js';

const K = (t) => ({ v: t, s: STIL.KOPF });
const B = (t) => ({ v: t, s: STIL.BLOCK });
const T = (t) => ({ v: t, s: STIL.TEXT });
const N3 = (v) => ({ v, s: STIL.N3 });
const N2 = (v) => ({ v, s: STIL.N2 });
const N1 = (v) => ({ v, s: STIL.N1 });
const AMPEL = (ok, t) => ({ v: t, s: ok ? STIL.OK : STIL.NOK });

/** Blatt 1: Eingabewerte, so wie sie in der Maske stehen. */
function blattEingabe(werte, erg) {
  const wo = verortung(werte);
  const rows = [
    [{ v: 'Tragjoch – Eingabewerte', s: STIL.TITEL }],
    // Wo das Tragwerk steht, gleich unter den Titel: ein Projekt hat viele
    // Joche, und das Blatt wird ausgedruckt und weitergereicht.
    ...(wo ? [[{ v: wo, s: STIL.NOTIZ }]] : []),
    [{ v: 'Erzeugt aus dem HTML-Tool. Werte, keine Formeln.', s: STIL.NOTIZ }],
    [],
  ];
  GRUPPEN.forEach((g) => {
    const felder = sichtbareFelder(g.id, werte).filter((f) => f.typ !== 'anbauteile');
    if (!felder.length) return;
    rows.push([B(g.titel), B(''), B(''), B('')]);
    rows.push([K('Bezeichnung'), K('Symbol'), K('Wert'), K('Einheit')]);
    felder.forEach((f) => {
      let w = werte[f.key];
      if (f.typ === 'auswahl') {
        w = f.optionen.find((o) => o.wert === w)?.text ?? w;
      } else if (f.typ === 'schalter') {
        w = w ? 'ja' : 'nein';
      }
      rows.push([T(f.label), T(f.sym ?? ''),
                 typeof w === 'number' ? N3(w) : T(w), T(f.einheit ?? '')]);
    });
    rows.push([]);
  });

  // Anbauteile, AUFGELÖST: je Modul und je freiem Lastblock eine Zeile mit
  // ihrem eigenen Angriffspunkt. Eine Zeile je Baugruppe würde die Hebelarme
  // verschlucken, auf die es gerade ankommt.
  rows.push([B('Anbauteile – aufgelöste Einzellasten')]);
  rows.push([K('Bezeichnung'), K('Vorlage'), K('x [m]'), K('y [m]'), K('z [m]'),
             K('Raster [m]'), K('Befestigung'), K('Gruppe'),
             K('F_x [kN]'), K('F_y [kN]'), K('F_z [kN]'),
             K('M_xx [kNm]'), K('M_yy [kNm]'), K('M_zz [kNm]')]);
  (erg.modell.anbauteileFlach ?? []).forEach((t) => {
    Object.entries(t.kraefte ?? {}).forEach(([gruppe, k]) => {
      if (Object.values(k).every((v) => !v)) return;
      rows.push([T(t.name), T(t.vorlage ?? ''), N2(t.x), N2(t.y ?? 0), N2(t.z ?? 0),
                 N2(t.raster), T(t.befestigung ?? ''), T(gruppe),
                 N2(k.Fx), N2(k.Fy), N2(k.Fz),
                 N2(k.Mxx), N2(k.Myy), N2(k.Mzz)]);
    });
  });
  rows.push([]);

  const m = erg.modell;
  rows.push([B('Abgeleitete Grössen')]);
  rows.push([K('Grösse'), K('Wert'), K('Einheit'), K('Bemerkung')]);
  const ab = [
    ['Hebelarm Höhe h', m.h, 'm', `aus Variante "${m.massVariante}"`],
    ['Hebelarm Breite b', m.b, 'm', `aus Variante "${m.massVariante}"`],
    ['Lichte Breite OG', m.lichtOG, 'mm', 'jbb,OG − 2·aH,OG'],
    ['Lichte Breite UG', m.lichtUG, 'mm', 'jbb,UG − 2·aH,UG'],
    ['q_d (Eigengewicht)', m.qd_g, 'kN/m', m.char.herkunft.eigengewicht],
    ['q_d (Schnee)', m.qd_s, 'kN/m', m.char.herkunft.schnee],
    ['w_d (Wind)', m.wd, 'kN/m', m.char.herkunft.wind],
    ['Auflagerkraft links R_A', m.RA, 'kN', ''],
    ['Auflagerkraft rechts R_B', m.RB, 'kN', ''],
    ['Stützmoment links M_A', m.MA, 'kNm', `Einspanngrad κ = ${m.kappaA.toFixed(3)}`],
    ['Stützmoment rechts M_B', m.MB, 'kNm', `Einspanngrad κ = ${m.kappaB.toFixed(3)}`],
    ['Drehfeder c_φ', m.federn.cA, 'kNm/rad', m.federn.art],
    ['Biegesteifigkeit EI', m.steif.EI, 'kNm²', 'Zwei-Gurt-Idealisierung'],
    ['Grenzspannung f_y/γ_M0', m.fyd, 'N/mm²', m.stahl.name],
  ];
  ab.forEach((r) => rows.push([T(r[0]), N3(r[1]), T(r[2]), T(r[3])]));

  return { name: 'Eingabe', rows, breiten: [38, 14, 14, 12, 12, 12, 12, 10] };
}

/** Blatt 2: konstruktive Nachweise. */
function blattChecks(checks, hinw, warn) {
  const rows = [
    [{ v: 'Konstruktive Bedingungen SZS C5 und Querschnittsklasse', s: STIL.TITEL }],
    [],
    [K('Nr.'), K('Bedingung'), K('vorhanden'), K('erforderlich'), K('Einheit'), K('Status')],
  ];
  checks.forEach((c) => {
    rows.push([T(c.id), T(c.text), N2(c.vorhanden), N2(c.erforderlich),
               T(c.einheit), AMPEL(c.ok, c.status)]);
  });
  rows.push([], [B('Geometrische Verträglichkeit der Bindeblechflucht')]);
  if (warn.length) warn.forEach((w) => rows.push([{ v: w, s: STIL.NOK }]));
  else rows.push([{ v: 'Alle Bindebleche liegen in der Schenkelflucht.', s: STIL.OK }]);

  rows.push([], [B('Hinweise und Modellgrenzen')]);
  hinw.forEach((h) => rows.push([{ v: h, s: STIL.NOTIZ }]));

  return { name: 'Konstruktion_C5', rows, breiten: [8, 62, 14, 14, 10, 22] };
}

/** Blatt 3: knotenweise Berechnung. */
function blattBerechnung(erg) {
  const sp = [
    ['i', '–', (r) => r.i, STIL.N1],
    ['x', 'm', (r) => r.x, STIL.N3],
    ['M_y,ed', 'kNm', (r) => r.My, STIL.N2],
    ['V_z,ed', 'kN', (r) => r.Vz, STIL.N2],
    ['M_z,ed', 'kNm', (r) => r.Mz, STIL.N2],
    ['V_y,ed', 'kN', (r) => r.Vy, STIL.N2],
    ['T_x,ed', 'kNm', (r) => r.Tx, STIL.N3],
    ['V_z,Ebene1', 'kN', (r) => r.VzEbene1, STIL.N2],
    ['M_y,L,lokal', 'kNm', (r) => r.My_lokal, STIL.N3],
    ['M_z,L,lokal', 'kNm', (r) => r.Mz_lokal, STIL.N3],
    ['N_OG', 'kN', (r) => r.og.N_ed, STIL.N2],
    ['σ_v,OG', 'N/mm²', (r) => r.og.sig_v, STIL.N1],
    ['η_OG', '–', (r) => r.og.eta, STIL.N3],
    ['N_UG', 'kN', (r) => r.ug.N_ed, STIL.N2],
    ['σ_v,UG', 'N/mm²', (r) => r.ug.sig_v, STIL.N1],
    ['η_UG', '–', (r) => r.ug.eta, STIL.N3],
    ['Blech Pos', '–', (r) => String(r.blechPos ?? ''), STIL.TEXT],
    ['h_BB', 'mm', (r) => r.hBB, STIL.N1],
    ['t_BB', 'mm', (r) => r.tBB, STIL.N1],
    ['M_Blech', 'kNm', (r) => r.M_Blech, STIL.N3],
    ['V_Blech', 'kN', (r) => r.V_Blech, STIL.N2],
    ['σ_Blech', 'N/mm²', (r) => r.sig_B, STIL.N1],
    ['τ_Blech', 'N/mm²', (r) => r.tau_B, STIL.N1],
    ['σ_v,Blech', 'N/mm²', (r) => r.sig_vB, STIL.N1],
    ['η_Blech', '–', (r) => r.etaB, STIL.N3],
    ['η_max', '–', (r) => r.eta, STIL.N3],
  ];
  const rows = [
    [{ v: 'Knotenweise Berechnung und Nachweise', s: STIL.TITEL }],
    [{ v: 'Kein Knicknachweis enthalten.', s: STIL.NOTIZ }],
    [],
    sp.map((s) => K(s[0])),
    sp.map((s) => K(s[1])),
  ];
  erg.knoten.forEach((r) => {
    rows.push(sp.map((s) => ({ v: s[2](r), s: s[3] })));
  });
  rows.push([]);
  rows.push([T('Status'), AMPEL(erg.max.alleOk,
    erg.max.alleOk ? 'ALLE NACHWEISE ERFÜLLT' : 'NACHWEIS NICHT ERFÜLLT')]);
  return { name: 'Berechnung', rows, breiten: sp.map(() => 13) };
}

/** Blatt 4: Zusammenfassung inkl. Massvarianten-Vergleich und Mast. */
function blattZusammenfassung(erg, vergleich) {
  const m = erg.modell;
  const rows = [
    [{ v: 'Zusammenfassung', s: STIL.TITEL }],
    [],
    [B('Massgebende Werte')],
    [K('Grösse'), K('Wert'), K('Einheit'), K('Stelle x [m]')],
    [T('max. M_y,ed'), N2(erg.extrem.MyMax), T('kNm'), N2(erg.extrem.xMyMax)],
    [T('min. M_y,ed'), N2(erg.extrem.MyMin), T('kNm'), N2(erg.extrem.xMyMin)],
    [T('max. V_z,ed'), N2(erg.extrem.VzMax), T('kN'), T('')],
    [T('max. M_z,ed'), N2(erg.extrem.MzMax), T('kNm'), N2(erg.extrem.xMzMax)],
    [T('max. T_x,ed'), N3(erg.extrem.TxMax), T('kNm'), T('')],
    [],
    [B('Ausnutzung')],
    [K('Bauteil'), K('η'), K('Stelle x [m]'), K('Status')],
    [T(`Obergurt ${m.profOG.name}`), N3(erg.max.etaOG.og.eta), N2(erg.max.etaOG.x),
     AMPEL(erg.max.etaOG.og.eta <= 1, erg.max.etaOG.og.eta <= 1 ? 'OK' : 'ÜBERSCHRITTEN')],
    [T(`Untergurt ${m.profUG.name}`), N3(erg.max.etaUG.ug.eta), N2(erg.max.etaUG.x),
     AMPEL(erg.max.etaUG.ug.eta <= 1, erg.max.etaUG.ug.eta <= 1 ? 'OK' : 'ÜBERSCHRITTEN')],
    [T('Bindeblech'), N3(erg.max.etaB.etaB), N2(erg.max.etaB.x),
     AMPEL(erg.max.etaB.etaB <= 1, erg.max.etaB.etaB <= 1 ? 'OK' : 'ÜBERSCHRITTEN')],
  ];

  // DER MAST IST HIER AUFLAGER, NICHT BAUTEIL. Er steht mit seinen
  // Kenngrössen im Bericht, weil daran die Drehfeder hängt - aber ohne
  // Nachweis: sein eigener gehört in ein Rahmenmodell.
  if (m.federn?.mast) {
    rows.push([]);
    rows.push([B('Auflager: Mast (nicht nachgewiesen)')]);
    rows.push([K('Grösse'), K('Wert'), K('Einheit')]);
    [['Profil', m.federn.mast.profil.name, '–'],
     ['Stegrichtung', m.federn.mast.stegrichtung.label, '–'],
     ['Masthöhe H', m.federn.mast.H, 'm'],
     ['Drehfeder c_φ', m.federn.mast.cPhi, 'kNm/rad'],
     ['Stützmoment aus dem Joch', Math.max(Math.abs(m.MA), Math.abs(m.MB)), 'kNm'],
     ['Auflagerkraft', Math.max(m.RA, m.RB), 'kN'],
    ].forEach((r) => rows.push([T(r[0]), typeof r[1] === 'number' ? N3(r[1]) : T(r[1]), T(r[2])]));
  }

  rows.push([], [B('Vergleich der Hebelarm-Varianten')]);
  rows.push([K('Variante'), K('h [m]'), K('b [m]'), K('η_OG'), K('η_UG'),
             K('η_Blech'), K('η_max'), K('Abweichung [%]'), K('gewählt')]);
  vergleich.zeilen.forEach((z) => {
    rows.push([T(z.label), N3(z.hT), N3(z.bT), N3(z.etaOG), N3(z.etaUG),
               N3(z.etaB), N3(z.eta), N2(z.abweichung),
               T(z.istGewaehlt ? 'ja' : '')]);
  });
  rows.push([]);
  MASSVARIANTEN.forEach((v) => rows.push([{ v: `${v.kurz}: ${v.beschreibung}`, s: STIL.NOTIZ }]));

  return { name: 'Zusammenfassung', rows, breiten: [34, 14, 14, 12, 12, 12, 12, 16, 10] };
}

/** Blatt 5: verwendete Profildaten (Nachvollziehbarkeit). */
function blattProfile(m) {
  const rows = [
    [{ v: 'Verwendete Profildaten', s: STIL.TITEL }],
    [{ v: 'Nennwerte nach EN 10056-1 / SZS C5 – vor Abgabe verifizieren.', s: STIL.NOTIZ }],
    [],
    [K('Gurt'), K('Profil'), K('Form'), K('aH [mm]'), K('aV [mm]'), K('t [mm]'),
     K('A [cm²]'), K('i_min [cm]'), K('zsH [cm]'), K('zsV [cm]'),
     K('W_y [cm³]'), K('W_z [cm³]'), K('g [kg/m]')],
  ];
  [['Obergurt', m.profOG], ['Untergurt', m.profUG]].forEach(([g, p]) => {
    rows.push([T(g), T(p.name), T(p.form), N1(p.aH), N1(p.aV), N1(p.t), N2(p.A),
               N2(p.imin), N2(p.zsH), N2(p.zsV), N2(p.Wy), N2(p.Wz), N2(p.g)]);
  });
  return { name: 'Profile', rows, breiten: [14, 18, 18, 11, 11, 10, 11, 12, 11, 11, 12, 12, 11] };
}

/** Alles zusammen und herunterladen. */
export function exportiere(werte, erg, checks, hinw, warn, vergleich) {
  const blaetter = [
    blattEingabe(werte, erg),
    blattChecks(checks, hinw, warn),
    blattBerechnung(erg),
    blattZusammenfassung(erg, vergleich),
    blattProfile(erg.modell),
  ];
  const wo = verortungKurz(werte);
  const name = `Tragjoch${wo ? `_${wo}` : ''}`
             + `_${erg.modell.typ ?? 'frei'}_L${erg.modell.L.toFixed(1)}m.xlsx`;
  herunterladen(arbeitsmappe(blaetter), name);
  return name;
}
