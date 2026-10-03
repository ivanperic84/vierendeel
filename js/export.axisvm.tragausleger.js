/**
 * export.axisvm.tragausleger.js
 * ---------------------------------------------------------------------------
 * DAS STABMODELL DES TRAGAUSLEGERS - im Austauschformat der COM-Bruecke und
 * des Stabwerksloesers.
 *
 * Auftrag vom 26. September, Punkt 2: «Tragausleger - eigener Kern fuer die
 * Anzeige, Stabwerk fuer das Urteil». Die Weisungen zur Bauform, im Wortlaut
 * in CLAUDE.md:
 *
 *   «die tragstruktur ist ähnlich der abfangjoche und der anschluss auch»
 *   «die aufhängung kann über starrelemente erfolgen, die aber gelenkig
 *    angeschlossen sind»
 *   Aufhaengung als EIN Pendelstab mittig an der Ankertraverse (Rueckfrage)
 *
 * >>> WAS GEBAUT WIRD (Werkstattzeichnung UPE 140, Uebersicht Tragausleger) <<<
 *
 *   - zwei UPE 140, Stege innen (Ruecken gegen Ruecken, 280 mm), Flansche
 *     nach aussen - Schnitt A-A; Achsabstand e = 280 + 2 e_y
 *   - der Ausleger beginnt hinter der Mastachse (`hinten`, 0.25 m) und
 *     reicht bis L - hinten; er umfasst den Masten als Gabel
 *   - Bindebleche FL 100x10, 280 lang, OBEN UND UNTEN, Oberkante 6 mm unter
 *     der Flanschkante (Schnitt A-A), an den Stationen der Tabelle
 *     (a + n b + Endmass = L - am Sortiment nachgerechnet)
 *   - Anschluss am Masten wie beim Abfangjoch: Konsolarm quer, Stiel,
 *     Link 50 mm je Gurt - hier OHNE Konsole in x, weil die Gurte am
 *     Masten vorbeilaufen (Gabel)
 *   - Ankertraverse bei c1 auf der Oberkante, starr auf beide Gurte
 *   - Aufhaengung: EIN Linkelement vom Mast (Hoehe b ueber dem Ausleger)
 *     zur Mitte der Traverse, im Ortssystem nur laengs gehalten - ein
 *     Pendelstab, der nur Laengskraft traegt
 *   - Laengsverankerung zuschaltbar an der Stelle x (Weisung: «entweder
 *     zuzuschalten mit angabe zur stelle x», ohne 10-m-Regel)
 *
 * >>> ACHSEN WIE UEBERALL: x Auslegerachse (quer zum Gleis), y Gleis-
 * richtung, z lotrecht nach oben. x = 0 ist die Mastachse. <<<
 * ---------------------------------------------------------------------------
 */

import { uKontur } from './core.profilgeometrie.js';
import { getTragausleger, tragauslegerTypen, tragauslegerAufhaengung, tragauslegerSpreizung,
         tragauslegerBlechachsen } from './data.abfangjoche.js';
import { getGurtprofil, gurtAchsabstand } from './data.profiles.js';
import { getMastprofil, getStegrichtung, mastWindBeide } from './data.masten.js';
import { baugruppeSumme } from './data.anbauteile.js';
import { ekVonWindklasse, EINWIRKUNGEN } from './core.lasten.js';
import { linkBedingung, mastLaengeFuer } from './core.auflager.js';
import { bausteinAusModell } from './export.axisvm.abfang.js';
import { flLastwerte } from './data.fl.js';

/** Baustein der Lasttabelle, der den Wind auf den Ausleger selbst führt. */
export const TA_WIND_BAUSTEIN = 'anbauteil-tragausleger-uebergreifend-fix';

const r6 = (v) => Math.round(v * 1e6) / 1e6;
const AUFL_LINK_LAENGE = 0.05;     // wie am Abfangjoch
const AUFL_Z_LUFT = 0.05;          // Starrelemente unter dem Gurt, wie dort
/*
 * DIE LAGE DER BLECHE IM SCHNITT (Schnitt A-A der Werkstattzeichnung):
 * Oberkante 6 mm unter der Flanschkante. Die Blechmitte liegt damit bei
 * h/2 - 6 - t/2; beim UPE 140 und t = 10 bei 59 mm ueber der Achse.
 */
const BLECH_RUECKSPRUNG = 0.006;

/*
 * >>> DER ANSCHLUSS HAELT BEIDE GURTE IN x (26. September). <<<
 *
 * Das Abfangjoch laesst den VORDEREN Gurt laengs los - dort stehen zwei
 * Masten, und ein zweiter Laengshalt waere ein Zwang. Der Tragausleger
 * haengt an EINEM Masten. Das Kraeftepaar der beiden Gurtanschluesse in x
 * ist das Einzige, was die Drehung des Auslegers um die Lotrechte haelt:
 * die Aufhaengung liegt in der Ebene x-z und traegt quer dazu nichts. Mit
 * der Vorgabe des Abfangjochs waere der Ausleger um die Mastachse drehbar -
 * ein Mechanismus. K_XX gehalten wie am Abfangjoch (Weisung 17. September).
 * Was in der Maske eingestellt ist (`auflagerLinks`), geht vor.
 */
/*
 * Seit dem 28. September steht die Vorgabe in core.auflager.js
 * (`LINK_VORGABEN.tragausleger`), dieselbe Stelle, aus der die Skizze der
 * Maske liest - eine zweite Kopie hier wäre die zweite Wahrheit.
 */

/** Die Laengen des Sortiments als Text - fuer die Meldung. */
const sortimentText = () => tragauslegerTypen().map((t) => t.L.toFixed(1)).join(' / ');

/**
 * Das Modell des Tragauslegers, oertlich (x = 0 an der Mastachse).
 *
 * @param {object} satz Rechensatz dieses Tragwerks (L, mastH, mastLaenge,
 *   mastProfil, mastSteg, windKlasse, anbauteile, trasseRadius,
 *   flSpannweite, laengsverankerung, laengsverankerungX, auflagerLinks)
 * @returns {{knoten, staebe, querschnitte, auflager, lasten, hinweise,
 *            tragausleger}}
 */
export function tragauslegerModell(satz, opt = {}) {
  const L = Number(satz.L);
  const t = getTragausleger(L);
  if (!t) {
    throw new Error(`Tragausleger L = ${L} m steht nicht im Sortiment `
      + `(${sortimentText() || 'Sortiment nicht geladen'} m) - kein Modell. `
      + 'Das Sortiment führt je Länge ein eigenes Blechraster und eine '
      + 'eigene Aufhängung; eine Zwischenlänge wäre ein anderes Bauteil.');
  }
  const hinweise = [];
  /*
   * >>> DIE SEITE (28. September, «Ganz spiegeln»). <<<
   * Gebaut wird immer örtlich in +x. Ein Ausleger links bekommt die Kräfte
   * seiner Anbauteile gespiegelt herein (F_x, M_yy, M_zz mit −1), und das
   * fertige Modell wird am Ende an der Mastachse gespiegelt (`spiegeln`).
   * Netto kommen die Kräfte unverändert global an - nur ihre Hebel stehen
   * auf der anderen Seite.
   */
  const sp = satz.auslegerSeite === 'links' ? -1 : 1;
  const p = getGurtprofil(t.profil);
  const h = p.h / 100;                                  // cm -> m
  // Stegabstand d = Spreizung (Stege innen) - gurtAchsabstand: d + 2 e_y.
  const e = gurtAchsabstand(p, null, t.spreizung / 10) / 100;
  const d = t.spreizung / 1000;
  const x0 = -t.hinten;
  const xE = r6(t.L - t.hinten);
  const c1 = t.seil.c1;
  /*
   * b UND WINKEL (28. September): gekoppelt, tan α = b / c₁
   * (`tragauslegerAufhaengung`). Ohne eingetragenen Winkel gilt die Spalte
   * b des Sortiments (Rückfrage «b der Tabelle»; sie entspricht
   * 30.1-30.6°).
   */
  const aufh = tragauslegerAufhaengung(satz);
  const bSeil = aufh.b;
  const blechX = tragauslegerBlechachsen(t).map((a) => r6(x0 + a));
  const zBlech = r6(h / 2 - BLECH_RUECKSPRUNG - t.blech.t / 2000);

  /* --- Mast ------------------------------------------------------------- */
  const H = Number(satz.mastH) || 0;
  const mastL = Number(satz.mastLaenge) || 0;
  const mastProfil = satz.mastProfil;
  const mitMast = satz.mastVorhanden !== false && H > 0 && Boolean(mastProfil);
  if (!mitMast) {
    throw new Error('Tragausleger ohne Masten (Profil oder Anschlusshöhe fehlt) '
      + '- der Ausleger hängt am Masten, ohne ihn gibt es kein Tragwerk.');
  }
  // Ohne Eintrag H + b auf den halben Meter (Entscheid 28. September) -
  // dieselbe Stelle, aus der Maske und Kern ihre Länge haben.
  const zKopf = r6((mastL > 0 ? mastL : mastLaengeFuer(satz, H)) - H);
  /*
   * >>> FUER DAS BILD WIRD WEITERGEBAUT (30. September). <<<
   * Gemeldet: «checke die mastschieber beim tragausleger, wenn ich da eine
   * grenze über oder unterschreite blendet sich ein jochtragwerk ein.» Der
   * Abbruch hier liess das 3D-Bild auf das Ersatzjoch des Ersatzbalkens
   * zurückfallen - vier Winkel und zwei Masten, wo ein Ausleger steht.
   * Rechnen darf mit einem zu kurzen Masten weiter niemand (Kern, Stabwerk,
   * AxisVM brechen ab wie bisher); das Bild (`opt.bild`) baut den Masten
   * bis zum Seilpunkt und merkt sich, wo er wirklich endet - es zeichnet
   * ihn dort und schreibt den Mangel an.
   */
  const mastZuKurz = zKopf + 1e-9 < bSeil;
  if (mastZuKurz && opt.bild) {
    hinweise.push(`Mast zu kurz für die Aufhängung (mindestens `
      + `${(H + bSeil).toFixed(2)} m).`);
  } else if (mastZuKurz) {
    // Wortlaut der Rueckfrage vom 28. September: «Mast zu kurz für die
    // Aufhängung» - so steht es in den Hinweisen und an der Mastlänge.
    throw new Error(`Mast zu kurz für die Aufhängung: sie greift ${bSeil.toFixed(2)} m `
      + `über dem Ausleger am Masten an, der Mast endet ${zKopf.toFixed(2)} m darüber `
      + `(Mastlänge mindestens ${(H + bSeil).toFixed(2)} m).`);
  }

  /* --- Laengsverankerung -------------------------------------------------- *
   * Seit dem 28. September der REGELFALL («beim tragausleger wid ein
   * längsanker angebracht am ende des kragarms um die torsionseinwirkung
   * abzufangen»): an, solange nicht ausdrücklich abgeschaltet; die Stelle
   * 0 (oder leer) heisst Kragarmende. Zwei Seile ±y, nur Zug, ohne
   * Vorspannung - linear ein fester Halt in y.
   */
  const lvRoh = Number(satz.laengsverankerungX);
  const lvX = satz.laengsverankerung !== false
    ? (lvRoh > 0 ? lvRoh : xE) : null;
  if (lvX !== null && !(lvX >= 0 && lvX <= xE + 1e-9)) {
    throw new Error(`Längsverankerung bei x = ${lvX} m liegt nicht auf dem `
      + `Ausleger (0 … ${xE.toFixed(2)} m).`);
  }

  /* --- Anbauteile: je Teil der Anschlusspunkt auf der Auslegerachse ------- */
  const ek = ekVonWindklasse(satz.windKlasse);
  const sOpt = { ek, R: Number(satz.trasseRadius) || 0,
                 spannweite: Number(satz.flSpannweite) || 0,
                 // Abfangart je Leiter: einseitig = halbe Spannweite (3. Oktober).
                 artWahl: satz.havarie ?? null };
  const teile = (satz.anbauteile ?? [])
    .filter((a) => a?.aktiv !== false && (a.ort ?? 'joch') === 'joch')
    .map((a) => ({ a, s: baugruppeSumme(a, sOpt) }));
  const anbauX = teile.map(({ a }) => r6(Number(a.x) || 0));
  anbauX.forEach((x, i) => {
    if (x < x0 - 1e-9 || x > xE + 1e-9) {
      hinweise.push(`Anbauteil «${teile[i].a.name ?? teile[i].a.vorlage}» bei `
        + `x = ${x.toFixed(2)} m liegt nicht auf dem Ausleger - nicht angesetzt.`);
    }
  });

  /* --- Stationen ---------------------------------------------------------- */
  const stationen = [x0, 0, xE, c1, ...blechX,
    ...(lvX !== null ? [lvX] : []),
    ...anbauX.filter((x) => x >= x0 - 1e-9 && x <= xE + 1e-9)];
  const xs = [...new Set(stationen.map(r6))].sort((u, v) => u - v);
  const idx = (x) => xs.findIndex((v) => Math.abs(v - r6(x)) < 1e-9);
  const nm = (g, i) => `${g}_${xs[i].toFixed(3)}`;

  const knoten = [];
  const staebe = [];
  xs.forEach((x, i) => {
    knoten.push({ name: nm('V', i), x, y: r6(e / 2), z: 0 });
    knoten.push({ name: nm('H', i), x, y: r6(-e / 2), z: 0 });
  });

  /* --- Querschnitte (wie beim Abfangjoch) --------------------------------- */
  const querschnitte = [{
    name: 'GURT', form: 'Channel',
    parameter: [p.h * 10, p.b * 10, p.tw * 10, p.tf * 10, (p.r ?? 1) * 10],
    /*
     * >>> DIE KONTUR AUS DEM NORMUMRISS (2. Oktober, «Ja, als Polygon»). <<<
     * AddU verwirft die Ausrundung (gemessen: UPE 140 -3.4 %, UPE 240 -2.5 %
     * Fläche). Die Brücke baut das Profil deshalb aus dieser Kontur
     * (KonturQuerschnitt), in der Lage, die AxisVM einem U gibt.
     */
    kontur: uKontur('walz', p),
    profil: p.name,
    A: p.A / 1e4, Iy: p.Iy / 1e8, Iz: p.Iz / 1e8, It: p.It / 1e8,
  }, {
    /*
     * Das Bindeblech LIEGT: Stab laengs y, Dicke in z. Rechteck [b, h] mit
     * b in lokaler y- und h in lokaler z-Richtung; mit lcsZ = [0,0,1] liegt
     * b = Blechbreite in der Auslegerachse und h = Dicke lotrecht. KEINE
     * eigenen A/I-Werte: Loeser (qsWerte) und Bruecke rechnen sie aus den
     * Massen - dieselbe Lesart an beiden Stellen.
     */
    name: 'BLECH_TA', form: 'Rectangle',
    parameter: [t.blech.b, t.blech.t],
    profil: `Flachstahl ${t.blech.b}/${t.blech.t}`,
  }, {
    name: 'STARR', form: 'Rectangle', parameter: [500, 500],
    profil: 'steifer Stab, Konsole und Link',
  }];

  /* --- Gurte -------------------------------------------------------------- */
  // Spiegelbildlich wie am Abfangjoch: das U laesst sich nicht spiegeln, die
  // Drehung um 180 Grad um die Stabachse kehrt die Oeffnung um.
  const lcsGurt = (g) => (g === 'V' ? [0, 0, 1] : [0, 0, -1]);
  for (let i = 0; i < xs.length - 1; i++) {
    for (const g of ['V', 'H']) {
      staebe.push({ name: `${g}_S${i}`, von: nm(g, i), bis: nm(g, i + 1),
        querschnitt: 'GURT', steifesMaterial: false, lcsZ: lcsGurt(g),
        gelenkAnfang: null, gelenkEnde: null, art: 'stab' });
    }
  }

  /* --- Bindebleche oben und unten ------------------------------------------ *
   * Starrer Arm von der Gurtachse (y = +-e/2, z = 0) schraeg zum Blechende
   * (y = +-d/2, z = +-zBlech) - «die Starrelemente sind bis zum Anfang /
   * Ende der Bleche zu führen» (stehende Vorgabe).
   */
  blechX.forEach((xb, k) => {
    const i = idx(xb);
    for (const [o, z] of [['O', zBlech], ['U', -zBlech]]) {
      const kV = `BL_${o}${k}_V`, kH = `BL_${o}${k}_H`;
      knoten.push({ name: kV, x: xb, y: r6(d / 2), z });
      knoten.push({ name: kH, x: xb, y: r6(-d / 2), z });
      staebe.push({ name: `BLARM_${o}${k}_V`, von: nm('V', i), bis: kV,
        querschnitt: 'STARR', steifesMaterial: true, lcsZ: [0, 0, 1], art: 'starr' });
      staebe.push({ name: `BLARM_${o}${k}_H`, von: nm('H', i), bis: kH,
        querschnitt: 'STARR', steifesMaterial: true, lcsZ: [0, 0, 1], art: 'starr' });
      staebe.push({ name: `BL_${o}${k}`, von: kH, bis: kV,
        querschnitt: 'BLECH_TA', steifesMaterial: false, lcsZ: [0, 0, 1],
        gelenkAnfang: null, gelenkEnde: null, art: 'stab' });
    }
  });

  /* --- Mast und Anschluss (Kette wie am Abfangjoch, ohne Konsole in x) ---- */
  let sr = null;
  try { sr = getStegrichtung(satz.mastSteg ?? 'jochachse'); }
  catch { sr = getStegrichtung('jochachse'); }
  const lcsMast = sr.achse === 'y' ? [1, 0, 0] : [0, 1, 0];
  const pm = getMastprofil(mastProfil);
  const restA = pm.A * 100 - 2 * pm.b * pm.tf - (pm.h - 2 * pm.tf) * pm.tw;
  const Rm = restA > 0 ? Math.sqrt(restA / (4 - Math.PI)) : 0;
  const mastQs = `MAST_${pm.name.replace(/\s+/g, '')}`;
  querschnitte.push({
    name: mastQs, form: 'I', profil: pm.name,
    parameter: [pm.h, pm.b, pm.tw, pm.tf, r6(Rm)],
    A: pm.A / 1e4, Iy: pm.Iy / 1e8, Iz: pm.Iz / 1e8, It: pm.It / 1e8,
  });
  const zV = r6(-(h / 2 + AUFL_Z_LUFT));
  const mastPunkte = [
    ['MAST_A_F', -H], ['MAST_A_A', zV], ['MAST_A_K', 0],
    ['MAST_A_SEIL', bSeil], ...(zKopf > bSeil + 1e-9 ? [['MAST_A_KOPF', zKopf]] : []),
  ];
  mastPunkte.forEach(([n, z]) => knoten.push({ name: n, x: 0, y: 0, z: r6(z) }));
  for (let i = 0; i < mastPunkte.length - 1; i++) {
    staebe.push({ name: `MAST_A_S${i + 1}`, von: mastPunkte[i][0],
      bis: mastPunkte[i + 1][0], querschnitt: mastQs, steifesMaterial: false,
      lcsZ: lcsMast, art: 'stab' });
  }
  const i0 = idx(0);
  for (const g of ['V', 'H']) {
    const y = g === 'V' ? r6(e / 2) : r6(-e / 2);
    knoten.push({ name: `ARM_A${g}`, x: 0, y, z: zV });
    knoten.push({ name: `ANS_A${g}`, x: 0, y, z: -AUFL_LINK_LAENGE });
    staebe.push({ name: `KONSARM_A${g}`, von: 'MAST_A_A', bis: `ARM_A${g}`,
      querschnitt: 'STARR', steifesMaterial: true, lcsZ: [0, 0, 1], art: 'starr' });
    staebe.push({ name: `LINKSTIEL_A${g}`, von: `ARM_A${g}`, bis: `ANS_A${g}`,
      querschnitt: 'STARR', steifesMaterial: true, lcsZ: [1, 0, 0], art: 'starr' });
    staebe.push({ name: `LINK_A${g}`, von: `ANS_A${g}`, bis: nm(g, i0),
      querschnitt: 'STARR', steifesMaterial: true, lcsZ: [1, 0, 0],
      gelenkAnfang: 'M', gelenkEnde: null, art: 'link',
      kraftuebertragung: linkBedingung({ auflagerLinks: satz.auflagerLinks },
                                       'tragausleger', g) });
  }
  const auflager = [{
    ende: 'A', knoten: 'MAST_A_F', x: 0, modell: 'mast',
    ux: 'Rigid', uy: 'Rigid', uz: 'Rigid', fix: 'Rigid', fiy: 'Rigid', fiz: 'Rigid',
    cFiy_MNm: null, cFiy_kNm: null, cUz_MN: null, cUz_kNm: null,
  }];

  /* --- Ankertraverse und Aufhaengung -------------------------------------- */
  const iC = idx(c1);
  knoten.push({ name: 'TRAVERSE_M', x: c1, y: 0, z: r6(h / 2) });
  for (const g of ['V', 'H']) {
    staebe.push({ name: `TRAVERSE_${g}`, von: 'TRAVERSE_M', bis: nm(g, iC),
      querschnitt: 'STARR', steifesMaterial: true, lcsZ: [0, 0, 1], art: 'starr' });
  }
  /*
   * >>> DER PENDELSTAB: EIN LINK IM ORTSSYSTEM, NUR LAENGS GEHALTEN. <<<
   * Weisung: «über starrelemente …, die aber gelenkig angeschlossen sind».
   * Ein Starrelement mit Gelenken an beiden Enden traegt nur Laengskraft -
   * genau das ist ein Linkelement, dessen einziger gehaltener Grad die
   * Richtung seiner eigenen Achse ist. Global gelesen waere «x» die
   * Auslegerachse und nicht die Seilrichtung.
   *
   * >>> ZWEI SEILE, GESPREIZT (Entscheid 28. September). <<<
   * Die Ankertraverse ragt um die Spreizung s nach beiden Seiten in
   * Gleisrichtung aus (starr), an ihren Enden greift je ein Seil an; am
   * Masten treffen sich beide im Punkt MAST_A_SEIL (die Haltewinkel links
   * und rechts des Flanschs liegen ein paar Zentimeter auseinander - fuer
   * die Torsion zaehlt der Hebel an der Traverse). Gegengleiche Seilkraefte
   * halten so die Drehung des Auslegers um seine Achse schon bei c₁.
   * NUR ZUG: linear gerechnet; das Eigengewicht spannt beide Seile vor
   * (gemessen kleinste Kraft 2.2 kN bei L 8, 3.1 kN bei L 13 in allen
   * Faellen). Muesste eines druecken, meldet es `aufhaengungNachweis`.
   * s = 0: ein Seil in der Achse, wie bis dahin.
   */
  const spreiz = tragauslegerSpreizung(satz);
  /*
   * NUR ZUG FUER AXISVM (Frage vom 28. September: «wie man es im axis
   * modellieren will, dass es nur zug aufnimmt und kein druck»): dasselbe
   * Merkmal wie der Seilkopf des Seilankers - die Bruecke setzt daraus
   * lnlTensionOnly im Ortssystem der Linie. Es wirkt NUR in einer
   * nichtlinearen Berechnung; linear traegt auch dieser Link Druck, und der
   * Loeser hier rechnet linear (`aufhaengungNachweis` meldet ein
   * gedruecktes Seil).
   */
  const seilLink = (name, bis) => staebe.push({ name, von: 'MAST_A_SEIL', bis,
    querschnitt: 'STARR', steifesMaterial: true, lcsZ: [0, 1, 0],
    gelenkAnfang: 'M', gelenkEnde: 'M', art: 'link', system: 'lokal',
    kraftuebertragung: { x: 'Rigid', y: 'Free', z: 'Free',
                         xx: 'Free', yy: 'Free', zz: 'Free' },
    nichtlinear: { x: 'nurZug' } });
  if (spreiz > 0) {
    for (const [k, y] of [['P', spreiz], ['N', -spreiz]]) {
      knoten.push({ name: `TRAVERSE_${k}`, x: c1, y: r6(y), z: r6(h / 2) });
      staebe.push({ name: `TRAVARM_${k}`, von: 'TRAVERSE_M', bis: `TRAVERSE_${k}`,
        querschnitt: 'STARR', steifesMaterial: true, lcsZ: [0, 0, 1], art: 'starr' });
      seilLink(`AUFHAENGUNG_${k}`, `TRAVERSE_${k}`);
    }
  } else {
    seilLink('AUFHAENGUNG', 'TRAVERSE_M');
  }

  /* --- Laengsverankerung --------------------------------------------------- */
  if (lvX !== null) {
    const i = idx(lvX);
    knoten.push({ name: 'LV_M', x: r6(lvX), y: 0, z: 0 });
    for (const g of ['V', 'H']) {
      staebe.push({ name: `LVARM_${g}`, von: 'LV_M', bis: nm(g, i),
        querschnitt: 'STARR', steifesMaterial: true, lcsZ: [0, 0, 1], art: 'starr' });
    }
    auflager.push({ ende: 'LV', knoten: 'LV_M', x: r6(lvX), modell: 'laengsverankerung',
      ux: 'Free', uy: 'Rigid', uz: 'Free', fix: 'Free', fiy: 'Free', fiz: 'Free' });
  }

  /* --- Lasten ------------------------------------------------------------- */
  const punkt = [], moment = [], strecke = [];
  let havarieAus = false;
  /*
   * DER MASTWIND - aus derselben Stelle wie im Kern (`mastWindBeide`),
   * charakteristisch, je Richtung ein Lastfall. Fehlt die Tabellenzeile,
   * fehlt die Last, und es wird gesagt (wie am 20. September entschieden).
   */
  const mw = mastWindBeide(pm.name, ek, sr.key);
  const wx = Number.isFinite(mw.jochachse) ? Math.abs(mw.jochachse) : null;
  const wy = Number.isFinite(mw.gleis) ? Math.abs(mw.gleis) : null;
  if (wx === null || wy === null) {
    hinweise.push(`Für ${pm.name} führt die Tabelle keinen Mastwind - der Wind `
      + 'auf den Masten fehlt im Modell.');
  }
  staebe.filter((s) => s.name.startsWith('MAST_A_S')).forEach((s) => {
    [['WindX', 'X', wx], ['WindY', 'Y', wy]].forEach(([fall, richtung, w]) => {
      if (w > 0) {
        strecke.push({ name: `Q_${fall}_${s.name}`, stab: s.name, richtung,
                       wert: r6(w), lastfall: fall });
      }
    });
  });
  /*
   * >>> DER WIND AUF DEN AUSLEGER SELBST (30. September). <<<
   *
   * Aus der Einwirkungs-Mappe auf Rückfrage «Wind auf Tragausleger»: die
   * Zeile «Tragausleger übergreifend (fix)» führt 0.23 / 0.28 / 0.33 kN/m
   * je EK, und zwar nur LÄNGS zum Gleis - quer (in der Auslegerachse) steht
   * nichts. Je Laufmeter Ausleger, halb auf jede UPE, im Lastfall WindY wie
   * der Mastwind. Das Eigengewicht dieser Zeile bleibt draussen: es steht
   * schon im Sortiment (gts) bzw. im Querschnitt. Fehlt die Zeile, fehlt die
   * Last - und es steht da, wie beim Mastwind.
   */
  let wA = null;
  try { wA = flLastwerte(TA_WIND_BAUSTEIN, { ek }).Qy; } catch { wA = null; }
  // Einheitswind (alte Norm): nur die Angriffsfläche des vorderen Profils, h × 1.0 kN/m².
  if (ek === 'EK0' && p?.h > 0) wA = p.h / 100;   // p.h in cm
  if (wA > 0) {
    staebe.filter((s) => /^[VH]_S\d+$/.test(s.name)).forEach((s) => {
      strecke.push({ name: `Q_WindY_${s.name}`, stab: s.name, richtung: 'Y',
                     wert: r6(wA / 2), lastfall: 'WindY' });
    });
  } else {
    hinweise.push('Die Lasttabelle führt keinen Wind für den Tragausleger '
      + `(${TA_WIND_BAUSTEIN}, ${ek}) - der Wind auf den Ausleger selbst fehlt im Modell.`);
  }
  /*
   * >>> DIE ANBAUTEILE: STARR AUF DIE AUSLEGERACHSE UMGESETZT. <<<
   *
   * Jede Kraft greift am Teil an (x, y, z der Kette), der Ausleger nimmt sie
   * an der Station des Anschlusses auf. Umgesetzt wird sie dorthin mit
   * ALLEN drei Momenten, M = r x F - nicht nur mit der Torsion wie am
   * Abfangjoch: am Ausleger haengen die Teile 1-3 m tief, und genau dieser
   * Hebel steht in der Kontrollformel der Zeichnung (Σ F_H z / c1).
   * Die Kraefte gehen je zur Haelfte auf die beiden Gurtknoten, das Moment
   * um die Auslegerachse als Kraeftepaar ±M_x/e in z, die beiden anderen
   * Momente je zur Haelfte als Knotenmoment.
   *
   * Unter G gilt die Regel der Tragjoch-Ausleitung: was in der
   * Auslegerachse (x) zieht, ist Ablenkkraft (G_Ablenk), alles uebrige
   * Gewicht (G_Anbau). F_z zeigt im Kern nach UNTEN; hier wird gedreht.
   *
   * VEREINFACHT: die Kette selbst steht nicht im Modell - das Teil ist ein
   * Starrkoerper an EINER Station statt an seinen beiden Klemmpunkten.
   * Global ist das dasselbe, oertlich an der Klemme nicht.
   */
  teile.forEach(({ a, s }, k) => {
    const xA = anbauX[k];
    if (xA < x0 - 1e-9 || xA > xE + 1e-9) return;
    const i = idx(xA);
    const summen = {};
    (s.teile ?? []).forEach((tp) => {
      const r = [(Number.isFinite(Number(tp.x)) ? Number(tp.x) : xA) - xA,
                 Number(tp.y) || 0, Number(tp.z) || 0];
      EINWIRKUNGEN.forEach((ew) => {
        /*
         * DIE HAVARIE NOCH NICHT (28. September). Das Blatt führt sie je
         * Leiter (`HavarieY|<Leiter>|p`); eine Last auf der blossen
         * Sammelgruppe käme dort in keiner Kombination an. Bis der Ausleger
         * sie je Leiter aufteilt, bleibt sie draussen - und es steht da.
         */
        if (ew.key === 'HavarieX' || ew.key === 'HavarieY') {
          if (tp.kraefte?.[ew.key]) havarieAus = true;
          return;
        }
        const q = tp.kraefte?.[ew.key];
        if (!q) return;
        const F = [sp * (q.Fx ?? 0), q.Fy ?? 0, -(q.Fz ?? 0)];
        const add = (fall, art, v) => {
          if (!v.some((w) => w)) return;
          const sm = summen[fall] ?? (summen[fall] = { F: [0, 0, 0], M: [0, 0, 0] });
          v.forEach((w, j) => { sm[art][j] += w; });
        };
        /*
         * JEDE KOMPONENTE MIT IHREM EIGENEN MOMENT IN IHREN LASTFALL.
         * Die Ablenkkraft (x) geht unter G nach G_Ablenk - und ihr Hebel
         * r x F_x mit ihr. Beim ersten Anlauf stand das Moment in G_Anbau:
         * jeder der beiden Faelle waere fuer sich nicht mehr gleichwertig
         * gewesen, nur ihre Summe.
         */
        [0, 1, 2].forEach((j) => {
          if (!F[j]) return;
          const Fj = [0, 0, 0]; Fj[j] = F[j];
          const Mj = [r[1] * Fj[2] - r[2] * Fj[1],
                      r[2] * Fj[0] - r[0] * Fj[2],
                      r[0] * Fj[1] - r[1] * Fj[0]];
          const fall = ew.key !== 'G' ? ew.key : (j === 0 ? 'G_Ablenk' : 'G_Anbau');
          add(fall, 'F', Fj);
          add(fall, 'M', Mj);
        });
        // Eigene Momente des Teils (im Sortiment meist null) - wie die
        // Tragjoch-Ausleitung unter G zum Gewicht.
        add(ew.key === 'G' ? 'G_Anbau' : ew.key, 'M',
            [q.Mxx ?? 0, sp * (q.Myy ?? 0), sp * (q.Mzz ?? 0)]);
      });
    });
    Object.entries(summen).forEach(([fall, sm]) => {
      ['X', 'Y', 'Z'].forEach((richtung, j) => {
        if (!sm.F[j]) return;
        for (const g of ['V', 'H']) {
          punkt.push({ name: `F${k}_${g}_${fall}_${richtung}`, knoten: nm(g, i),
                       richtung, wert: r6(sm.F[j] / 2), lastfall: fall });
        }
      });
      if (sm.M[0]) {
        // Moment um die Auslegerachse als Kraeftepaar in z: V liegt bei +e/2.
        const f = sm.M[0] / e;
        punkt.push({ name: `T${k}_V_${fall}`, knoten: nm('V', i), richtung: 'Z',
                     wert: r6(f), lastfall: fall });
        punkt.push({ name: `T${k}_H_${fall}`, knoten: nm('H', i), richtung: 'Z',
                     wert: r6(-f), lastfall: fall });
      }
      [['My', 1], ['Mz', 2]].forEach(([richtung, j]) => {
        if (!sm.M[j]) return;
        for (const g of ['V', 'H']) {
          moment.push({ name: `M${k}_${g}_${fall}_${richtung}`, knoten: nm(g, i),
                        richtung, wert: r6(sm.M[j] / 2), lastfall: fall });
        }
      });
    });
  });
  hinweise.push(lvX !== null
    ? `Längsanker bei x = ${lvX.toFixed(2)} m: zwei Seile in Gleisrichtung, `
      + 'nur Zug, ohne Vorspannung - im Modell ein fester Halt in y; die '
      + 'Neigung der Seile ist nicht berücksichtigt.'
    : 'OHNE Längsanker: die Kraft in Gleisrichtung am Ausleger geht über den '
      + 'Hebel als Torsion in den Masten.');
  if (wA > 0) {
    hinweise.push(`Wind auf den Ausleger selbst: ${wA.toFixed(2)} kN/m in `
      + `Gleisrichtung (${ek}, Lasttabelle «Tragausleger übergreifend»), halb auf jede UPE.`);
  }
  if (havarieAus) {
    hinweise.push('Havarie der Leiter am Tragausleger ist im Stabmodell noch '
      + 'NICHT angesetzt (sie gehört je Leiter in einen eigenen Lastfall).');
  }

  const modell = {
    knoten, staebe, querschnitte, auflager,
    lasten: { punkt, moment, strecke },
    hinweise,
    tragausleger: { artikel: t.artikel, L: t.L, e: r6(e), c1, b: bSeil, alpha: aufh.alpha,
                    profil: t.profil,
                    spreizung: spreiz, seile: spreiz > 0 ? 2 : 1, c2: t.seil.c2, hinten: t.hinten, bleche: blechX.length * 2,
                    Vzul: t.Vzul, laengsverankerung: lvX,
                    seite: sp < 0 ? 'links' : 'rechts',
                    // Nur im Bild (opt.bild): wo der zu kurze Mast endet.
                    ...(mastZuKurz ? { mastKopf: zKopf, mastMindest: r6(H + bSeil) } : {}) },
  };
  return sp < 0 ? spiegeln(modell) : modell;
}

/**
 * Das Modell an der Mastachse spiegeln (x -> −x).
 *
 * Knoten und Auflager wechseln die Seite, die Lasten der Anbauteile ihre
 * x-Komponente und die Momente um y und z (ein Moment ist ein axialer
 * Vektor: bei der Spiegelung an der Ebene x = 0 bleibt M_x, M_y und M_z
 * kehren um). Der Mastwind (Streckenlast auf dem Masten) bleibt - der Mast
 * steht auf der Achse, und der Wind kommt global.
 *
 * DIE GURTE LAUFEN UMGEKEHRT. Eine Spiegelung ist keine Drehung; behielte
 * der Stab seine Richtung, zeigte seine örtliche y-Achse nach der anderen
 * Seite, und die UPE öffneten nach innen statt nach aussen. Mit getauschten
 * Enden läuft der Stab wieder in +x, und sein Querschnitt steht wie vorher
 * (Stege innen). Linkelemente bleiben, wie sie sind: ihr Gelenk sitzt am
 * Anfang, und ihre Bedingung ist global.
 */
function spiegeln(d) {
  const kx = new Map(d.knoten.map((k) => [k.name, k]));
  const staebe = d.staebe.map((s) => {
    const a = kx.get(s.von), b = kx.get(s.bis);
    const laengs = a && b && Math.abs(a.x - b.x) > 1e-9;
    const lcsZ = Array.isArray(s.lcsZ) ? [-s.lcsZ[0], s.lcsZ[1], s.lcsZ[2]] : s.lcsZ;
    return s.art === 'stab' && laengs
      ? { ...s, von: s.bis, bis: s.von, lcsZ }
      : { ...s, lcsZ };
  });
  return {
    ...d,
    knoten: d.knoten.map((k) => ({ ...k, x: r6(-k.x) })),
    staebe,
    auflager: d.auflager.map((a) => ({ ...a, x: r6(-(a.x ?? 0)) })),
    lasten: {
      punkt: d.lasten.punkt.map((l) => (l.richtung === 'X' ? { ...l, wert: r6(-l.wert) } : l)),
      moment: d.lasten.moment.map((l) => (l.richtung === 'My' || l.richtung === 'Mz'
        ? { ...l, wert: r6(-l.wert) } : l)),
      strecke: d.lasten.strecke,
    },
    // Die Auskunft (`tragausleger`) bleibt: c1, Stelle des Ankers usw. sind
    // Abstände vom Masten, keine Koordinaten.
  };
}

/**
 * Der Tragausleger als Baustein des Blattmodells - derselbe Weg wie das
 * Abfangjoch (`bausteinAusModell`, 28. September): die Masten nach ihrer
 * Stelle benannt (MAST_A_S1 -> MAST_M1_S1), alles übrige mit dem Präfix
 * des Tragwerks, die Lasten in den Gruppen des Blattes. Die Gruppen des
 * Modells SIND schon die des Blattes (G_Anbau, G_Ablenk, WindX, WindY,
 * Schnee) - es gibt nichts umzubenennen.
 *
 * @param {object} satz Der Satz DIESES Tragwerks
 * @param {object} opt  { praefix, mastNamen, knotenmodell }
 */
export function tragauslegerBau(satz, opt = {}) {
  const d = tragauslegerModell(satz);
  const b = bausteinAusModell(d, opt);
  return { ...b, hinweise: d.hinweise, tragausleger: d.tragausleger };
}
