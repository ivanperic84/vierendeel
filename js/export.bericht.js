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
import { verortung, verortungKurz, tragwerksart } from './core.constants.js';
import { blattUrteil, endkraefte, TEIL_NAMEN } from './export.stabbericht.js';

const K = (t) => ({ v: t, s: STIL.KOPF });
const B = (t) => ({ v: t, s: STIL.BLOCK });
const T = (t) => ({ v: t, s: STIL.TEXT });
const N3 = (v) => ({ v, s: STIL.N3 });
const N2 = (v) => ({ v, s: STIL.N2 });
const N1 = (v) => ({ v, s: STIL.N1 });
const AMPEL = (ok, t) => ({ v: t, s: ok ? STIL.OK : STIL.NOK });

/** Projektnummer, Bearbeiter und Datum als eine Zeile - leer, wenn nichts steht. */
const kopfzeile = (w) => [
  w?.projektNr ? `Projekt-Nr. ${String(w.projektNr).trim()}` : null,
  w?.bearbeiter ? `Bearbeiter ${String(w.bearbeiter).trim()}` : null,
  w?.datum ? `Datum ${String(w.datum).trim()}` : null,
].filter(Boolean).join(' · ');

/** Blatt 1: Eingabewerte, so wie sie in der Maske stehen. */
function blattEingabe(werte, erg, opt = {}) {
  const wo = verortung(werte);
  const rows = [
    [{ v: 'Vierendeel – Eingabewerte', s: STIL.TITEL }],
    // Wo das Tragwerk steht, gleich unter den Titel: ein Projekt hat viele
    // Joche, und das Blatt wird ausgedruckt und weitergereicht.
    ...(wo ? [[{ v: wo, s: STIL.NOTIZ }]] : []),
    // Projektnummer, Bearbeiter, Datum (17. September) - dieselbe Zeile,
    // die die Projektliste fuehrt.
    ...(kopfzeile(werte) ? [[{ v: kopfzeile(werte), s: STIL.NOTIZ }]] : []),
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
        /*
         * DIE LISTE KANN ERST BEIM ZEICHNEN ENTSTEHEN. Felder, deren
         * Auswahl aus der Datenbank kommt (Jochtyp, Profil, Stahlguete),
         * tragen `optionenAus` statt `optionen` - seit dem 16. September
         * auch die Profilwaehler. Wer den Bericht baut, ohne dass die
         * Maske je gezeichnet wurde, faende `optionen` sonst nicht vor.
         */
        const liste = f.optionen ?? f.optionenAus?.(werte) ?? [];
        w = liste.find((o) => o.wert === w)?.text ?? w;
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
                 // F_z nach oben (rechte Hand, 1. Oktober).
                 N2(k.Fx), N2(k.Fy), N2(-(k.Fz ?? 0)),
                 N2(k.Mxx), N2(k.Myy), N2(k.Mzz)]);
    });
  });
  rows.push([]);

  const m = erg.modell;
  // Auf dem Stabwerksweg (1. Oktober) ohne die Grössen des Ersatzbalkens
  // (Auflagerkräfte, Stützmomente, Drehfeder, EI der Zwei-Gurt-Idealisierung).
  if (opt.ohneAbgeleitete) return { name: 'Eingabe', rows, breiten: [38, 14, 14, 12, 12, 12, 12, 10] };
  /*
   * DIE ABGELEITETEN GROESSEN SIND JOCHGROESSEN.
   *
   * Hebelarme, lichte Breiten, Auflagerkraefte, Stuetzmomente, die
   * Biegesteifigkeit der Zwei-Gurt-Idealisierung - nichts davon hat ein
   * Einzelmast. Der Excel-Knopf brach hier mit «Cannot read properties of
   * undefined (reading herkunft)» ab, und zwar lautlos.
   *
   * Was der Mast an abgeleiteten Groessen hat, steht auf seinem eigenen
   * Blatt: die Schnittgroessen ueber die Hoehe.
   */
  if (tragwerksart(m).key === 'einzelmast') {
    rows.push([B('Mast')]);
    rows.push([K('Grösse'), K('Wert'), K('Einheit'), K('Bemerkung')]);
    const md = m.federn?.mastA ?? m.federn?.mast;
    if (md) {
      // Keine Anschlusshoehe und kein Ueberstand beim Einzelmasten (18.
      // September): er rechnet frei vom Fuss bis zum Kopf.
      [['Profil', md.profil.name],
       ['Gesamtlänge', md.laenge, 'm', 'Fuss bis Kopf'],
       ['Stegrichtung', md.stegrichtung.label ?? md.stegrichtung.key],
       ['Trägheitsmoment I', md.I_cm4, 'cm⁴', 'starke Achse quer'],
       ['Widerstandsmoment W', md.W_cm3, 'cm³', 'starke Achse quer'],
      ].forEach((r) => rows.push(typeof r[1] === 'number'
        ? [T(r[0]), N3(r[1]), T(r[2] ?? ''), T(r[3] ?? '')]
        : [T(r[0]), T(String(r[1])), T(''), T('')]));
    }
    return { name: 'Eingabe', rows, breiten: [38, 14, 14, 12, 12, 12, 12, 10] };
  }
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
function blattChecks(checks, hinw, warn, urteil) {
  const rows = [
    [{ v: 'Konstruktive Bedingungen SZS C5 und Querschnittsklasse', s: STIL.TITEL }],
    [],
  ];
  /*
   * DIE NICHT GEFÜHRTEN NACHWEISE STEHEN ZUOBERST.
   *
   * Wer die Ausleitung weiterreicht, liest zuerst die Prüfungen und sieht
   * lauter Haken. Was NICHT geprüft wurde, muss deshalb davor stehen und
   * nicht in einer Fussnote - ein fehlender Nachweis sieht sonst aus wie ein
   * bestandener.
   */
  /*
   * DAS GESAMTURTEIL ZUERST - ueber alle gefuehrten Bauteile, mit dem
   * massgebenden (Entscheid vom 17. September).
   */
  const bt = urteil?.bauteile;
  if (bt?.liste?.length) {
    const gut = !bt.ueber && urteil.bindendVerletzt !== true;
    rows.push([B('Gesamturteil'), AMPEL(gut, gut ? 'ALLE NACHWEISE ERFÜLLT'
      : 'NACHWEIS NICHT ERFÜLLT'),
      T(`η = ${bt.eta.toFixed(3)}${bt.massgebend ? ` · massgebend: ${bt.massgebend.name}` : ''}`)]);
    rows.push([K('Bauteil'), K('η'), K('Status')]);
    bt.liste.forEach((x) => rows.push([T(x.name),
      x.eta === null ? T('–') : N3(x.eta),
      AMPEL(!x.ueber, x.ueber ? (x.eta === null ? 'NICHT LIEFERBAR' : 'ÜBERSCHRITTEN') : 'OK')]));
    rows.push([]);
  }
  const offen = urteil?.nichtGefuehrt ?? [];
  if (offen.length) {
    rows.push([{ v: 'NICHT GEFÜHRTE NACHWEISE', s: STIL.NOK }]);
    offen.forEach((g) => rows.push(
      [{ v: `${g.titel} — ${g.grund}`, s: STIL.NOK }, { v: g.was, s: STIL.NOTIZ }]));
    rows.push([{ v: 'Diese Nachweise sind separat zu führen. Ein nicht '
                  + 'geführter Nachweis zählt nicht als erfüllt.', s: STIL.NOTIZ }], []);
  }
  rows.push(
    [K('Nr.'), K('Bedingung'), K('vorhanden'), K('erforderlich'), K('Einheit'), K('Status')]);
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
  rows.push([T('Status Joch'), AMPEL(erg.max.alleOk,
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
/**
 * BLATT: DER MAST ÜBER SEINE HÖHE.
 *
 * Was beim Joch die Stationstabelle ist, ist hier die Schnittgrössentabelle
 * des Kragarms: an jeder Stelle N, zwei Querkräfte, zwei Momente, Torsion
 * und die Ausnutzung. Sie ist das Ergebnis - ohne sie wäre die Ausleitung
 * eines Einzelmasten eine Datei ohne Zahlen.
 */
function blattMast(erg) {
  const mn = erg?.mast;
  const rows = [
    [{ v: 'Mast – Schnittgrössen über die Höhe', s: STIL.TITEL }],
    [{ v: 'Bemessungswerte des gewählten Lastfalls.', s: STIL.NOTIZ }],
    [],
  ];
  ['A', 'B'].forEach((ende) => {
    const n = mn?.[ende];
    if (!n) return;
    rows.push([B(`Mast ${ende} · ${n.profil?.name ?? ''}`
      + `  ·  η = ${n.eta.toFixed(3)}`)]);
    /*
     * DIE GLOBALEN NAMEN, seit der Mastnachweis in ihnen rechnet
     * (15. September). Die Ebenenbezeichnung stand hier bis dahin, und
     * die Torsionsspalte hiess `T` - genau wie das Feld, das es nie gab.
     */
    rows.push([K('z [m]'), K('F_z [kN]'), K('F_x [kN]'), K('F_y [kN]'),
               K('M_yy [kNm]'), K('M_xx [kNm]'), K('M_zz [kNm]'),
               K('sigma_omega [N/mm2]'), K('η')]);
    (n.stationen ?? []).forEach((st) => {
      /*
       * DIE TORSIONSSPALTE STAND IMMER AUF NULL. Hier wurde `st.T` gelesen -
       * ein Feld, das der Mastnachweis nie gefuehrt hat; es heisst `Mzz`
       * (bis zum 15. September `Mt`). Gefunden beim Umstellen auf die
       * globalen Groessen.
       */
      // F_z nach oben (rechte Hand, 1. Oktober): Druck negativ.
      rows.push([N3(st.z), N3(-(st.Fz ?? 0)), N3(st.Fx), N3(st.Fy),
                 N3(st.Myy), N3(st.Mxx), N3(st.Mzz ?? 0),
                 N3(st.sigW ?? 0), N3(st.eta ?? 0)]);
    });
    rows.push([]);
  });
  if (rows.length === 3) rows.push([T('Kein Mast im Modell.')]);
  return { name: 'Mast', rows, breiten: [12, 12, 12, 12, 14, 14, 12, 10] };
}


/* ===========================================================================
 * >>> DIE MAPPE AUS DEM STABWERK (1. Oktober). <<<
 * ===========================================================================
 *
 * Weisung «Bericht und Excel auf den Stabwerksweg umstellen». Auf Rückfrage
 * «Ganzes Blatt» und «Weg, ausser Knicken»: dieselben Daten wie der Bericht
 * (`stabwerkBerichtDaten`, app.bericht.js) - keine Zahl des Ersatzbalkens
 * mehr (die knotenweise Rechnung und der Massvariantenvergleich entfallen),
 * das Knicken mit den Kräften des Stabwerks. Werte, keine Formeln; die
 * Zwischenwerte des massgebenden Stabes je Teil stehen auf eigenem Blatt.
 * ========================================================================= */
function blattUrteilStab(d, U) {
  const gut = U.eta !== null && !U.ueber;
  const rows = [
    [{ v: 'Urteil des Blattes – Stabwerk', s: STIL.TITEL }],
    [{ v: 'Alle Tragwerke des Blattes in einem räumlichen Stabwerk. Werte, keine Formeln.', s: STIL.NOTIZ }],
    [],
    [B('Gesamturteil'), AMPEL(gut && U.eta <= 1, gut && U.eta <= 1 ? 'ALLE NACHWEISE ERFÜLLT' : 'NACHWEIS NICHT ERFÜLLT'),
     T(`η = ${Number(U.eta ?? 0).toFixed(3)}${U.massgebend ? ` · massgebend: ${U.massgebend.name}` : ''}`)],
    [K('Bauteil'), K('η'), K('massgebende Kombination'), K('Status')],
  ];
  U.liste.forEach((x) => rows.push([T(x.name), x.eta === null ? T('–') : N3(x.eta), T(x.bez ?? x.fall ?? ''),
    AMPEL(!x.ueber, x.ueber ? (x.eta === null ? 'NICHT LIEFERBAR' : 'ÜBERSCHRITTEN') : 'OK')]));
  const ng = d.nichtGefuehrt ?? [];
  if (ng.length) {
    rows.push([], [{ v: 'NICHT GEFÜHRTE NACHWEISE', s: STIL.NOK }]);
    ng.forEach((g) => rows.push([{ v: `${g.titel} — ${g.grund}`, s: STIL.NOK }, { v: g.was, s: STIL.NOTIZ }]));
  }
  return { name: 'Urteil', rows, breiten: [34, 12, 44, 22] };
}

function blattMassgebend(d) {
  const sw = d.sw;
  const rows = [
    [{ v: 'Massgebender Stab je Teil – Zwischenwerte', s: STIL.TITEL }],
    [{ v: `f_yd = ${Number(sw.fyd).toFixed(2)} N/mm². Winkel: σ = |N|/A + |k_y·z − k_z·y| (Hauptachsen mit I_yz); `
         + 'sonst σ = |N|/A + |M_y|/W_y + |M_z|/W_z (+ σ_ω); Bleche σ_v = √(σ² + 3τ²), τ = 1.5·V/A.', s: STIL.NOTIZ }],
    [],
    [K('Teil'), K('Stab'), K('Kombination'), K('Ende'), K('N [kN]'), K('M_y [kNm]'), K('M_z [kNm]'),
     K('A'), K('σ_N'), K('σ_M bzw. σ_My'), K('σ_Mz'), K('σ_ω'), K('τ'), K('σ [N/mm²]'), K('η')],
  ];
  const zeile = (name, t) => {
    const x = t?.detail;
    if (!x) return;
    const winkel = x.art === 'winkel';
    rows.push([T(name), T(t.wo ?? ''), T(t.bez ?? ''), T(x.ende), N3(x.N), N3(x.My), N3(x.Mz),
      T(winkel ? `${x.A.toFixed(1)} mm²` : `${(x.A * 1e4).toFixed(2)} cm²`), N2(x.sigN),
      N2(winkel ? x.sigM : x.sigMy), winkel ? T('') : N2(x.sigMz), N2(x.sigW ?? 0),
      Number.isFinite(x.tau) ? N2(x.tau) : T(''), N2(x.sig), N3(t.eta)]);
  };
  (d.tragwerke ?? []).forEach((tw) => ['OG', 'UG', 'UPE', 'blech'].forEach((teil) =>
    zeile(`${tw.pos} · ${TEIL_NAMEN[teil]}`, sw.teile?.[`${tw.stabKey}|${teil}`])));
  (d.masten ?? []).forEach((m) => zeile(`Mast ${m.anzeige}`, sw.teile?.[`mast:${m.id}|mast`]));
  return { name: 'Massgebend', rows, breiten: [22, 16, 34, 6, 10, 10, 10, 12, 9, 11, 9, 8, 8, 11, 8] };
}

function blattStaebe(d) {
  const rows = [
    [{ v: 'Alle nachgewiesenen Stäbe – Stabwerk', s: STIL.TITEL }],
    [{ v: 'Je Stab seine massgebende Kombination; Endkräfte am massgebenden Ende in Stabachsen.', s: STIL.NOTIZ }],
    [],
    [K('Stab'), K('Bauteil'), K('Teil'), K('Kombination'), K('Ende'), K('N [kN]'), K('V_y [kN]'),
     K('V_z [kN]'), K('T [kNm]'), K('M_y [kNm]'), K('M_z [kNm]'), K('σ [N/mm²]'), K('η')],
  ];
  Object.values(d.sw.jeStab ?? {}).filter((z) => Number.isFinite(z.eta))
    .sort((a, b) => b.eta - a.eta)
    .forEach((z) => {
      const k = endkraefte(z) ?? {};
      rows.push([T(z.name), T(d.anzeige ? d.anzeige(String(z.bauteil ?? '').replace(/^mast:/, 'Mast ').replace(/^tragwerk:?/, 'Tragwerk ')) : z.bauteil),
        T(TEIL_NAMEN[z.teil] ?? z.teil ?? ''), T(z.bez ?? ''), T(z.ende ?? ''),
        N2(k.N), N2(k.Vy), N2(k.Vz), N3(k.T), N3(k.My), N3(k.Mz), N1(z.sig), N3(z.eta)]);
    });
  return { name: 'Stabwerk', rows, breiten: [18, 14, 14, 34, 6, 10, 10, 10, 10, 10, 10, 11, 8] };
}

function blattMastenStab(d) {
  const rows = [
    [{ v: 'Masten – Knicken, Fundament, Anker (Kräfte aus dem Stabwerk)', s: STIL.TITEL }],
    [],
    [K('Mast'), K('Profil'), K('Länge [m]'), K('η Querschnitt'), K('η Knicken (50)'), K('N_Ed [kN]'),
     K('N_K,Rd [kN]'), K('L_cr [m]'), K('Fundament'), K('η Fundament'), K('Anker'), K('N_k Anker [kN]'), K('η Anker')],
  ];
  (d.masten ?? []).forEach((m) => {
    const q = d.sw.teile?.[`mast:${m.id}|mast`];
    const k = m.knick, f = m.fundament, a = m.anker?.nachweis;
    rows.push([T(m.anzeige), T(m.profil ?? ''), N2(m.laenge), q ? N3(q.eta) : T('–'),
      k ? N3(k.eta) : T('nicht geführt'), k ? N2(k.NEd) : T(''), k ? N1(k.NKRd) : T(''), k ? N2(k.Lcr) : T(''),
      T(f?.typ?.typ ?? m.fundamentTyp ?? '–'), f && Number.isFinite(f.eta) ? N3(f.eta) : T('–'),
      T(a?.typ ?? '–'), a ? N2(a.N) : T(''), a && Number.isFinite(a.eta) ? N3(a.eta) : T(a ? '–' : '')]);
  });
  return { name: 'Masten', rows, breiten: [8, 12, 10, 13, 14, 11, 12, 10, 14, 12, 10, 14, 10] };
}

function blattReaktionen(d) {
  const rows = [
    [{ v: 'Reaktionskräfte – charakteristisch, aus dem Stabwerk', s: STIL.TITEL }],
    [{ v: 'Wind ohne ψ 0.70, Druck positiv (V), Havarie eigene Zeile.', s: STIL.NOTIZ }],
    [],
    [K('Auflager'), K('Fundament'), K('Zeile'), K('V min [kN]'), K('V max [kN]'), K('±M_y quer [kNm]'),
     K('±F_x quer [kN]'), K('±M_x längs [kNm]'), K('±F_y längs [kN]'), K('±M_z [kNm]')],
  ];
  const w = (b, k) => (b?.[k] ? N2(b[k].wert) : T('–'));
  (d.reaktionen ?? d.sw.reaktionen ?? []).forEach((z) => {
    [['Einwirkung', z.haupt], ['Havarie', z.havarie]].forEach(([was, b]) => {
      if (!b) return;
      rows.push([T(z.name ?? z.id ?? ''), T(z.fundament?.typ ?? z.fundament ?? ''), T(was),
        w(b, 'Vmin'), w(b, 'Vmax'), w(b, 'Mq'), w(b, 'Hq'), w(b, 'Ml'), w(b, 'Hl'), w(b, 'T')]);
    });
  });
  return { name: 'Reaktionen', rows, breiten: [14, 14, 12, 11, 11, 14, 13, 14, 13, 11] };
}

function blattKonstruktionStab(d) {
  const rows = [[{ v: 'Konstruktive Bedingungen je Tragwerk', s: STIL.TITEL }], []];
  (d.tragwerke ?? []).forEach((tw) => {
    rows.push([B(`${tw.pos} — ${tw.label}`)]);
    if (!tw.checks?.length) { rows.push([T('Keine Konstruktionsprüfungen für diese Tragwerksart.')], []); return; }
    rows.push([K('Nr.'), K('Bedingung'), K('vorhanden'), K('erforderlich'), K('Einheit'), K('Status')]);
    tw.checks.forEach((c) => rows.push([T(c.id), T(c.text), N2(c.vorhanden), N2(c.erforderlich),
      T(c.einheit), AMPEL(c.ok, c.status)]));
    (tw.hinweise ?? []).forEach((h) => rows.push([{ v: h, s: STIL.NOTIZ }]));
    rows.push([]);
  });
  return { name: 'Konstruktion', rows, breiten: [8, 62, 14, 14, 10, 22] };
}

export function exportiereStabwerk(werte, d, erg) {
  const U = blattUrteil(d);
  const jochModell = (d.tragwerke ?? []).find((tw) => tw.art === 'joch' && tw.modell?.profOG)?.modell;
  const blaetter = [
    blattEingabe(werte, erg, { ohneAbgeleitete: true }),
    blattUrteilStab(d, U),
    blattMassgebend(d),
    blattStaebe(d),
    blattMastenStab(d),
    blattReaktionen(d),
    blattKonstruktionStab(d),
    ...(jochModell ? [blattProfile(jochModell)] : []),
  ];
  const wo = verortungKurz(werte);
  const name = `Vierendeel_Stabwerk${wo ? `_${wo}` : ''}`
    + `_${(d.tragwerke ?? []).map((tw) => tw.pos).join('-') || 'Blatt'}.xlsx`;
  herunterladen(arbeitsmappe(blaetter), name);
  return name;
}

export function exportiere(werte, erg, checks, hinw, warn, vergleich, urteil) {
  /*
   * DER BERICHT ENTHÄLT, WAS GERECHNET WURDE.
   *
   * Beim Joch sind das fünf Blätter. Ein Einzelmast hat weder Stationen noch
   * Massvarianten noch Gurtprofile - drei davon wären leer, und ein leeres
   * Blatt in einer Ausleitung liest sich wie ein vergessenes.
   */
  const einzeln = tragwerksart(erg.modell).key === 'einzelmast';
  const blaetter = einzeln
    ? [blattEingabe(werte, erg),
       blattChecks(checks, hinw, warn, urteil),
       blattMast(erg)]
    : [blattEingabe(werte, erg),
       blattChecks(checks, hinw, warn, urteil),
       blattBerechnung(erg),
       blattZusammenfassung(erg, vergleich),
       blattProfile(erg.modell)];
  const wo = verortungKurz(werte);
  const md = erg.modell.federn?.mastA ?? erg.modell.federn?.mast;
  const name = einzeln
    ? `Einzelmast${wo ? `_${wo}` : ''}_${md?.profil?.name?.replace(/\s+/g, '') ?? 'Mast'}`
      + `_H${(md?.H ?? 0).toFixed(1)}m.xlsx`
    : `Vierendeel${wo ? `_${wo}` : ''}`
      + `_${erg.modell.typ ?? 'frei'}_L${erg.modell.L.toFixed(1)}m.xlsx`;
  herunterladen(arbeitsmappe(blaetter), name);
  return name;
}
