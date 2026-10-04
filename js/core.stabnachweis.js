/**
 * core.stabnachweis.js
 * ---------------------------------------------------------------------------
 * SPANNUNGEN UND AUSNUTZUNG AUS DEN STABKRAEFTEN DES STABWERKSLOESERS.
 *
 * Weisung vom 25. September: «primär den löser nutzen», nachdem der
 * Vergleich gegen PyNite abgeschlossen war. Der Loeser gibt je Stab die
 * lokalen Endkraefte (N, V_y, V_z, T, M_y, M_z); hier werden daraus
 * Spannungen und daraus eta.
 *
 * >>> DER UNTERSCHIED ZUM ERSATZBALKEN, IN EINEM SATZ. <<<
 *
 * `core.querschnitt.js` nimmt die Schnittgroessen EINES Balkens und teilt
 * sie auf Gurte und Bleche auf - mit Beiwerten, die genau diese Aufteilung
 * treffen sollen (GURT_DAEMPFUNG, ENDFELD_ZUSCHLAG, SCHIEFE_DAEMPFUNG).
 * Hier gibt es nichts aufzuteilen: jeder Gurt und jedes Blech ist ein
 * eigener Stab und traegt, was er traegt. Die Beiwerte sind auf diesem Weg
 * gegenstandslos - nicht abgeschafft, sondern ueberfluessig.
 *
 * >>> DIE ACHSEN PASSEN, UND ZWAR OHNE ZUTUN. <<<
 *
 * `randspannung()` in core.winkel.js erwartet die Momente um die
 * SCHENKELPARALLELEN Achsen und rechnet die schiefe Biegung ueber das
 * Deviationsmoment I_yz selbst. Genau in diesen Achsen steht der Gurtwinkel
 * im Stabwerksmodell (`lcsZ`, siehe export.axisvm.js). Es braucht also
 * keine Drehung in die Hauptachsen - die Funktion macht es.
 * ---------------------------------------------------------------------------
 */

import { randspannung, winkelwerteFuer, winkelGetauscht } from './core.winkel.js';
import { getProfil, getGurtprofil } from './data.profiles.js';
import { woelbtorsion } from './core.mast.js';

/** Welche Rolle spielt dieser Stab im Tragwerk? */
export function stabRolle(name, art = 'stab') {
  const n = String(name);
  if (art === 'link') return 'link';
  if (art === 'starr') return 'starr';
  if (/(^|_)(OG|UG)(L|R)_S\d+$/.test(n)) return 'gurt';
  if (/(^|_)B(V|H)_/.test(n)) return 'blech';
  /*
   * >>> DER GITTERMAST (3. Oktober). <<<
   * Seine Stäbe tragen den Masten im Namen (export.axisvm.gitter.js):
   * vier Gurtwinkel `MAST_<Mast>_G<Ecke>_S<n>`, Bindebleche
   * `MAST_<Mast>_BL_<Seite>_<Station>`, das Rohr bzw. der Aufsatz
   * `MAST_<Mast>_ROHR_…`. Gurt und Blech werden wie am Joch nachgewiesen
   * (Entscheid «Stabwerk + Diagramm als Kontrolle»), das Rohr über sein W.
   */
  if (/(^|_)MAST_[^_]+_G[1-4]_S\d+$/.test(n)) return 'gurt';
  if (/(^|_)MAST_[^_]+_BL_/.test(n)) return 'blech';
  if (/(^|_)MAST_[^_]+_ROHR_/.test(n)) return 'rohr';
  if (/(^|_)MAST_/.test(n)) return 'mast';
  /*
   * >>> DER TRAGAUSLEGER (28. September, Etappe 4). <<<
   * Zwei UPE als Gurte (V_S…, H_S… aus export.axisvm.tragausleger.js) und
   * liegende Bindebleche oben/unten (BL_O…, BL_U…). Die Gurte sind U-Profile,
   * keine Winkel - deshalb eine eigene Rolle: `randspannung` kennt nur den
   * Winkel, das U rechnet über seine Tabellenwerte (`widerstand`).
   */
  if (/(^|_)(V|H)_S\d+$/.test(n)) return 'gurtU';
  /*
   * >>> DAS ABFANGJOCH (29. September). <<<
   * Seine Gurte heissen wie die des Auslegers (V_S…, H_S…); die Bleche
   * tragen den Teil zwischen den Starrstücken als `BL_O3_2`, und die Gabel
   * am Jochende ist ein Doppel-U (GABEL_V…, GABEL_H…) - ein Gurt, dessen
   * Querschnitt verdoppelt ist («die Gabel zählt im Nachweisschnitt»,
   * Entscheid vom 3. September). `widerstand` rechnet ihn als Doppel-U.
   */
  if (/(^|_)GABEL_(V|H)\d+$/.test(n)) return 'gurtU';
  if (/(^|_)BL_[OU]\d+(_\d+)?$/.test(n)) return 'blech';
  return 'sonst';
}

/* ===========================================================================
 * >>> WER TRAEGT DIESEN STAB? DIE ZUORDNUNG ZUM BAUTEIL DER REIHE. <<<
 * =========================================================================
 *
 * Etappe 3 zur Weisung vom 19. September: «die zusammenhängenden
 * jochtragwerke sind als gesamtheitliches tragwerk zu betrachten». Seit
 * dem 25. September rechnet der Löser die ganze Reihe in EINEM Stabwerk -
 * und damit ist ein eta ohne Namen wertlos: es steht nicht mehr fest,
 * welches Joch gemeint ist.
 *
 * Die Namen kommen aus `stabmodellBlatt` (export.axisvm.js):
 *
 *     T2_OGR_S82     Obergurt rechts des Tragwerks T2
 *     T2_BH_O_27_2   ein liegendes Blech desselben Tragwerks
 *     MAST_M2_S1     unterster Abschnitt des Masten M2
 *
 * >>> DER MAST TRAEGT KEIN PRAEFIX - UND DAS IST DIE AUSSAGE. <<<
 *
 * Ein geteilter Mast ist EIN Mast, an dem beide Joche hängen; er gehört
 * der Reihe und keinem einzelnen Tragwerk. Genau deshalb wird die Reihe
 * überhaupt gerechnet - der Ersatzbalken sieht ihn zweimal, je Joch
 * einmal, und damit nie mit beiden Jochkräften zugleich.
 */
export function stabZuordnung(name) {
  const n = String(name);
  const mast = /(?:^|_)MAST_([^_]+)_/.exec(n);
  if (mast) {
    return { key: `mast:${mast[1]}`, name: `Mast ${mast[1]}`,
             art: 'mast', id: mast[1] };
  }
  // T Tragjoch, A Abfangjoch, MT Mast mit Tragausleger (Namen nach dem Typ).
  const tw = /^((?:MT|[TA])\d+)_/.exec(n);
  if (tw) {
    return { key: `tragwerk:${tw[1]}`, name: `Joch ${tw[1]}`,
             art: 'tragwerk', id: tw[1] };
  }
  /*
   * OHNE PRAEFIX STEHT NUR EIN TRAGWERK AUF DEM BLATT - dann ist «Joch»
   * eindeutig, und eine erfundene Nummer wäre irreführend.
   */
  return { key: 'tragwerk', name: 'Joch', art: 'tragwerk', id: null };
}

/* ===========================================================================
 * >>> WIDERSTANDSMOMENTE JE QUERSCHNITTSFORM. <<<
 *
 * Aus den Massen und Traegheitsmomenten, die die Datei traegt.
 * Der Winkel kommt hier NICHT vor - er laeuft ueber `randspannung()`, weil
 * ein W bei schiefer Biegung um zwei Achsen die Frage nicht beantwortet,
 * welche der sechs Ecken massgebend wird.
 * ========================================================================= */
function widerstand(qs) {
  /*
   * >>> DAS U-PROFIL: DIE TABELLENWERTE (28. September). <<<
   *
   * Das U ist einfachsymmetrisch. Um die schwache Achse liegt die äussere
   * Faser bei b − e_y (Flanschspitze), nicht bei b/2 - mit b/2 käme am
   * UPE 140 eine um rund ein Drittel zu kleine Spannung heraus (b/2 = 32.5,
   * b − e_y = 43.3 mm). Die Normtabelle führt W_z genau so
   * (UPE 140: 78.7 / 4.33 = 18.19 cm³); genommen wird sie, nicht eine
   * Herleitung. Beide Vorzeichen mit dem grösseren Abstand - die sichere
   * Seite, der Rücken (e_y) wäre günstiger.
   */
  if (qs.form === 'Channel' && qs.profil) {
    let p = null;
    try { p = getGurtprofil(qs.profil); } catch { p = null; }
    if (p && p.Wy > 0 && p.Wz > 0) {
      return { A: p.A / 1e4, Wy: p.Wy / 1e6, Wz: p.Wz / 1e6 };
    }
  }
  /*
   * >>> DIE GABEL: ZWEI U NEBENEINANDER (29. September). <<<
   * Datei: `form: 'DoppelU'`, `profil: '2 × UPE 160'`, `versatz` [mm] = Achs-
   * abstand der beiden U in der schwachen Richtung. Gemessen an der Datei:
   * I_y ist genau das Doppelte (dieselbe starke Achse), I_z trägt den
   * Steiner-Anteil über versatz/2. Also: A und W_y doppelt aus der Tabelle,
   * W_z = I_z / (versatz/2 + b − e_y) - der äusserste Rand, sichere Seite.
   */
  if (qs.form === 'DoppelU' && qs.profil && qs.Iz > 0) {
    let p = null;
    try { p = getGurtprofil(String(qs.profil).replace(/^\s*2\s*[×x]\s*/, '')); } catch { p = null; }
    const v = Number(qs.versatz) / 1000;
    if (p && p.Wy > 0 && p.b > 0 && Number.isFinite(p.ey) && v >= 0) {
      const rand = v / 2 + (p.b - p.ey) / 100;   // b, ey in cm
      return { A: 2 * p.A / 1e4, Wy: 2 * p.Wy / 1e6, Wz: qs.Iz / rand };
    }
  }
  // Rohr und Quadratrohr des Gittermasts: A und I aus der Datei, der Rand
  // beim halben Aussenmass (parameter[0] = d bzw. a, in mm).
  if ((qs.form === 'Pipe' || qs.form === 'Box') && qs.A > 0 && qs.Iy > 0) {
    const rand = qs.parameter[0] / 2000;
    return { A: qs.A, Wy: qs.Iy / rand, Wz: qs.Iz / rand };
  }
  if (qs.form === 'Rectangle') {
    // parameter [b, h] in mm: b in lokaler y-, h in lokaler z-Richtung.
    const b = qs.parameter[0] / 1000, h = qs.parameter[1] / 1000;
    return { A: b * h, Wy: (b * h * h) / 6, Wz: (h * b * b) / 6 };
  }
  /*
   * >>> AUS DER DATEI, NICHT AUS DEM SORTIMENT. <<<
   *
   * Das I-Profil traegt A, Iy und Iz in der Datei, und seine Masse stehen
   * in `parameter` [h, b, s, t, r]. Daraus ist W exakt:
   *
   *     W_y = I_y / (h/2)      W_z = I_z / (b/2)
   *
   * Der erste Anlauf holte statt dessen das Profil aus `getProfil()` - und
   * das kennt die WINKEL (EN 10056), nicht die Mastprofile; die stehen im
   * Masten-Sortiment. Der Weg ueber die Datei ist ohnehin der bessere: er
   * braucht kein Sortiment, und er gilt auch fuer einen Querschnitt, den
   * die Anwendung nur als Zahlen kennt.
   */
  if (qs.A != null && qs.Iy != null && qs.Iz != null
      && Array.isArray(qs.parameter) && qs.parameter.length >= 2) {
    const h = qs.parameter[0] / 1000, b = qs.parameter[1] / 1000;
    if (h > 0 && b > 0) {
      return { A: qs.A, Wy: qs.Iy / (h / 2), Wz: qs.Iz / (b / 2) };
    }
  }
  /*
   * Ohne Masse kaeme aus I und einer geschaetzten Randfaser eine erfundene
   * Zahl heraus. Lieber nichts - der Aufrufer sieht `null` und meldet es.
   */
  return null;
}

/**
 * Spannung eines Stabes aus seinen lokalen Endkraeften.
 *
 * @param {object} qs  Querschnitt aus der Datei (stabmodellJson)
 * @param {Float64Array} f  12 Endkraefte, wie `stabkraft()` sie gibt
 * @returns {{sig:number, ende:string}|null}  groesste Randspannung [N/mm²]
 */
export function stabSpannung(qs, f, rolle, torsion = null, nurEnde = null) {
  if (!qs || !f) return null;

  /*
   * BEIDE ENDEN ZAEHLEN. Der Stab traegt an i und j verschiedene Momente;
   * welches Ende massgebend ist, sagt erst der Vergleich. Die Stelle
   * DAZWISCHEN bleibt hier aussen vor - bei einer Streckenlast kann das
   * Feldmoment groesser sein, und das ist ein offener Punkt.
   */
  // `nurEnde`: am steifen Gurtabschnitt im Knoten zählt nur das Ende am
  // Anschnitt (4. Oktober, siehe `stabNachweise`).
  const enden = [
    { name: 'i', N: f[0], My: f[4], Mz: f[5] },
    { name: 'j', N: f[6], My: f[10], Mz: f[11] },
  ].filter((e) => !nurEnde || e.name === nurEnde);

  if (rolle === 'gurt' && qs.profil) {
    // getProfil wirft bei unbekanntem Namen - hier ist das kein Abbruchgrund.
    let p = null;
    try { p = getProfil(qs.profil); } catch { p = null; }
    if (!p) return null;
    // Ungleichschenklig im Spiegelbild (Gittermast): langer Schenkel in lokal z.
    if (qs.tausch) p = winkelGetauscht(p);
    const w = winkelwerteFuer(p);
    let best = null;
    enden.forEach((e) => {
      /*
       * VORZEICHENRICHTIG (Entscheid 26. September): das Stabwerk kennt
       * die Vorzeichen von M_y und M_z aus derselben Rechnung - die Hülle
       * über ±M ist nur dort richtig, wo man sie nicht kennt (Ersatz-
       * balken, core.querschnitt.js). Begründung und Messung bei
       * `randspannung` in core.winkel.js.
       */
      const r = randspannung(w, e.N, e.My, e.Mz, { vorzeichenrichtig: true });
      /*
       * DIE KETTE FÜR DEN BERICHT (1. Oktober, «Formel + Stabliste»): die
       * Endkräfte am massgebenden Ende, die Querschnittswerte und die
       * Zwischenwerte der Ecke. Der Bericht setzt sie ein; der Prüfstand
       * rechnet die eingesetzte Formel nach (Abschnitt 183).
       */
      if (!best || r.sig > best.sig) {
        best = { sig: r.sig, ende: e.name, art: 'winkel', profil: p.name,
                 N: e.N, My: e.My, Mz: e.Mz,
                 A: w.A, Iy: w.Iy, Iz: w.Iz, Iyz: w.Iyz,       // mm², mm⁴
                 y: r.punkt?.y ?? null, z: r.punkt?.z ?? null,  // mm
                 sigN: Math.abs(r.sigN), sigM: r.sigM ?? null,
                 ky: r.ky ?? null, kz: r.kz ?? null };
      }
    });
    return best;
  }

  const wd = widerstand(qs);
  if (!wd) return null;
  /*
   * >>> DIE WÖLBSPANNUNG DES MASTEN (28. September). <<<
   *
   * Der Kern rechnet am Masten σ_ω aus der Torsion (Nachweisgruppe
   * «Torsion Mast», `woelbtorsion` in core.mast.js: Fuss wölbeingespannt,
   * Kopf wölbfrei). Das Stabwerk rechnete sie nicht - am Tragjoch ist die
   * Masttorsion klein, am Tragausleger nicht: Wind in Gleisrichtung am
   * langen Hebel geht nach Entscheid «A» als Torsion in den Masten.
   * Dieselbe Funktion, dieselbe Addition (Beträge, Flanschspitze); nur
   * die Torsion kommt aus dem Stabwerk. `torsion` = {z_i, z_j, zO} in m
   * über dem Mastfuss, oder null (nicht geführt / kein Mast).
   */
  let wt = null;
  if (rolle === 'mast' && torsion && Array.isArray(qs.parameter) && qs.Iz > 0 && qs.It > 0) {
    wt = woelbtorsion({ h: qs.parameter[0], b: qs.parameter[1], tf: qs.parameter[3],
                        Iz: qs.Iz * 1e8, It: qs.It * 1e8 }, torsion.zO);
  }
  let best = null;
  enden.forEach((e) => {
    const k = e.name === 'i' ? 0 : 1;
    // kN, kNm -> N/mm²: N/A in kN/m² = kPa -> /1000; M/W in kNm/m³ -> /1000.
    const T = k === 0 ? f[3] : f[9];
    const sigW = wt ? wt.sigma(T, k === 0 ? torsion.z_i : torsion.z_j) : 0;
    const sigN = Math.abs(e.N) / wd.A / 1000;
    const sigMy = Math.abs(e.My) / wd.Wy / 1000;
    const sigMz = Math.abs(e.Mz) / wd.Wz / 1000;
    const sigNorm = sigN + sigMy + sigMz + sigW;
    /*
     * >>> DAS BLECH MIT SCHUB (1. Oktober). <<<
     *
     * Gemessen beim Umstellen des Berichts: das Stabwerk wies die
     * Bindebleche mit der Normalspannung allein nach, der Ersatzbalken mit
     * σ_v = √(σ² + 3τ²). Am J90/20 m gab die Querkraft im massgebenden
     * Blech τ = 10.0 N/mm², η 0.3634 → 0.3715 (Reihe 2 × J90/20 m 0.4403 →
     * 0.4475). Auf Rückfrage «σ_v mit τ»: dieselbe Regel wie im
     * Ersatzbalken, τ = 1.5 · V / A aus der grösseren Querkraft am Ende.
     * Gurte und Masten bleiben bei der Normalspannung.
     */
    const V = rolle === 'blech'
      ? Math.max(Math.abs(k === 0 ? f[1] : f[7]), Math.abs(k === 0 ? f[2] : f[8])) : 0;
    const tau = rolle === 'blech' ? 1.5 * V / wd.A / 1000 : 0;
    const sig = tau > 0 ? Math.sqrt(sigNorm * sigNorm + 3 * tau * tau) : sigNorm;
    // Mit der Kette für den Bericht (1. Oktober), siehe oben beim Winkel.
    if (!best || sig > best.sig) {
      best = { sig, ende: e.name, sigW, art: 'wd', N: e.N, My: e.My, Mz: e.Mz, T,
               A: wd.A, Wy: wd.Wy, Wz: wd.Wz,                    // m², m³
               sigN, sigMy, sigMz, form: qs.form ?? null,
               ...(rolle === 'blech' ? { V, tau, sigNorm } : {}) };
    }
  });
  return best;
}

/**
 * >>> SCHNITTGROESSEN IM STAB (2. Oktober). <<<
 *
 * Frage zum Verlauf «Ausnutzung über die Höhe» des Masten: «warum ist das
 * hier abgetreppt? kann man noch beim Masten eine unterteilung vornehmen bei
 * der auswertung?» Der unterste Mastabschnitt reicht vom Fuss bis unter den
 * Jochanschluss (am J90/20 m 7.18 m), und ausgewertet wurde nur an seinen
 * Enden - der Wert des Fusses stand über die ganze Länge.
 *
 * Zwischen den Enden folgt der Verlauf aus den Endkräften und der Gleichlast
 * des Stabes, die sich aus ihnen ergibt (der Löser zieht die Volleinspann-
 * kräfte ab, `stabkraft`; ohne Last im Feld heben sich die Querkräfte auf).
 * Exakt für Gleichlasten - am Masten Wind und Eigengewicht; Einzellasten
 * stehen an Knoten. Endkräfte in der Konvention des Lösers (Kraft auf den
 * Stab, örtlich): innen am Ende i −f, am Ende j +f.
 *
 * @param {ArrayLike<number>} f  12 Endkräfte
 * @param {number} L  Stablänge [m]
 * @param {number} xi  Stelle 0 … 1
 * @returns {Float64Array} 12 Werte, an i und j dieselben Schnittgrössen -
 *          so liest `stabSpannung` sie wie ein Stabende.
 */
export function schnittImStab(f, L, xi) {
  const x = xi * L;
  const q = (a, b) => (L > 0 ? -(f[a] + f[b]) / L : 0);
  const qx = q(0, 6), qy = q(1, 7), qz = q(2, 8), mt = q(3, 9);
  const N = -f[0] - qx * x;
  const Vy = -f[1] - qy * x;
  const Vz = -f[2] - qz * x;
  const T = -f[3] - mt * x;
  const My = -f[4] - x * f[2] - qz * x * x / 2;
  const Mz = -f[5] + x * f[1] + qy * x * x / 2;
  const o = new Float64Array(12);
  [N, Vy, Vz, T, My, Mz].forEach((v, i) => { o[i] = v; o[i + 6] = v; });
  return o;
}

/** Abstand der Zwischenpunkte am Masten [m] (2. Oktober), höchstens 24 je Stab. */
export const MAST_TEILUNG = 0.5;

/**
 * Alle Staebe eines Modells auswerten.
 *
 * @param {object} dat      Modell aus stabmodellJson()
 * @param {Map} kraefte     je Stabname die 12 Endkraefte
 * @param {number} fyd      Bemessungswert der Streckgrenze [N/mm²]
 * @returns {{je:Map, gruppen:object, hoechste:object}}
 */
export function stabNachweise(dat, kraefte, fyd, opt = {}) {
  const qsMap = new Map(dat.querschnitte.map((q) => [q.name, q]));
  /*
   * Fuss und Kopf je Mast (Höhen der Knoten seiner Abschnitte) - für die
   * Wölbspannung (`stabSpannung`). Ohne `opt.torsion === true` bleibt sie
   * aus, wie im Kern bei abgeschalteter Nachweisgruppe.
   */
  const knZ = new Map(dat.knoten.map((k) => [k.name, k.z]));
  const knXYZ = new Map(dat.knoten.map((k) => [k.name, k]));
  const mastHoehe = new Map();
  if (opt.torsion === true) {
    dat.staebe.forEach((st) => {
      const m = /(?:^|_)MAST_([^_]+)_S\d+$/.exec(st.name);
      if (!m) return;
      const h = mastHoehe.get(m[1]) ?? { fuss: Infinity, kopf: -Infinity };
      [knZ.get(st.von), knZ.get(st.bis)].forEach((z) => {
        if (Number.isFinite(z)) { h.fuss = Math.min(h.fuss, z); h.kopf = Math.max(h.kopf, z); }
      });
      mastHoehe.set(m[1], h);
    });
  }
  /*
   * >>> DER GURT AM ANSCHNITT (4. Oktober). <<<
   *
   * Weisung, mit dem Bild der Option «Knotenbereich Gurt/Blech»: «die
   * nachweise beim stabmodell nehmen die spannungsspitzen bei den gurten als
   * massgebend an. nimm die einstellung für das stabmodell wie beim balken
   * auf, dass man die auswertung am rand zu den blechen als auswahl nehmen
   * kann.» Das Stabmodell führt den Gurt über die Blechbreite als steifen
   * Abschnitt (gleicher Winkel, E × `STEIF_FAKTOR`, `steifesMaterial`); er
   * wurde wie jeder Gurtstab an BEIDEN Enden ausgewertet - auch in der
   * Blechachse, wo das Moment am grössten ist. Gemessen J90/20 m mit
   * NT-Ausleger bei 10 m: massgebend `OGL_S48` (10.70-10.74 m, Ende i auf
   * der Blechachse bei 10.70).
   *
   * Mit «Anschnitt» (Vorgabe, wie beim Ersatzbalken) zählt am steifen
   * Abschnitt nur das Ende, an dem der freie Gurt anschliesst - der Rand
   * des Blechs. Der Abschnitt behält damit seinen Wert (Bild, Verläufe),
   * nur eben den am Anschnitt. «Schwerachsen» wertet wie bisher beide
   * Enden aus. Das Modell selbst ändert sich nicht.
   */
  const amAnschnitt = (opt.knotenbereich ?? 'anschnitt') !== 'schwerachsen';
  const knotenEnde = new Map();
  if (amAnschnitt) {
    const gurte = dat.staebe.filter((st) => stabRolle(st.name, st.art) === 'gurt');
    const frei = new Set();
    gurte.forEach((st) => { if (!st.steifesMaterial) { frei.add(st.von); frei.add(st.bis); } });
    gurte.forEach((st) => {
      if (!st.steifesMaterial) return;
      const i = frei.has(st.von), j = frei.has(st.bis);
      knotenEnde.set(st.name, i && j ? null : i ? 'i' : j ? 'j' : 'keins');
    });
  }
  const je = new Map();
  const gruppen = {};
  // Je Bauteil der Reihe (Joch T1, Mast M2 …) das grösste eta.
  const bauteile = {};
  let hoechste = null;
  let ohneWert = 0;
  const ohneRolle = [];

  dat.staebe.forEach((st) => {
    const rolle = stabRolle(st.name, st.art);
    // Ein steifer Abschnitt ganz im Knoten (kein Ende am freien Gurt).
    if (knotenEnde.get(st.name) === 'keins') return;
    /*
     * >>> STARRELEMENTE UND LINKS WERDEN NICHT NACHGEWIESEN. <<<
     * Sie sind Kunstgriffe, keine Bauteile - dieselbe Regel wie beim
     * Eigengewicht und bei der Schubverformung. Ein Ersatzquerschnitt von
     * 500 x 500 mm gaebe ohnehin eine erfundene Spannung.
     */
    if (rolle === 'starr' || rolle === 'link') return;
    /*
     * >>> EIN STAB OHNE ROLLE WIRD NICHT NACHGEWIESEN - UND DAS GEHOERT
     *     GEMELDET. <<<
     *
     * `stabRolle` kennt Gurte, Bleche und Masten. Was sonst noch im Modell
     * steht - die Träger eines Abfangjochs zum Beispiel - fällt hier
     * heraus. Das ist richtig (sie werden auf ihrem eigenen Weg
     * nachgewiesen), aber STILL wäre es gefährlich: ein Tragwerk ohne
     * einen einzigen geführten Stab sähe aus wie ein unbedenkliches.
     * Deshalb zählt der Aufrufer sie, und die Wache im Prüfstand
     * schlägt an.
     */
    if (rolle === 'sonst') { ohneRolle.push(st.name); return; }
    const f = kraefte.get(st.name);
    if (!f) return;
    const mh = rolle === 'mast'
      ? mastHoehe.get(/(?:^|_)MAST_([^_]+)_S\d+$/.exec(st.name)?.[1]) : null;
    const torsion = mh ? { z_i: (knZ.get(st.von) ?? mh.fuss) - mh.fuss,
                           z_j: (knZ.get(st.bis) ?? mh.fuss) - mh.fuss,
                           zO: mh.kopf - mh.fuss } : null;
    let s = stabSpannung(qsMap.get(st.querschnitt), f, rolle, torsion,
                         knotenEnde.get(st.name) ?? null);
    if (!s) { ohneWert += 1; return; }
    /*
     * Am Masten auch zwischen den Enden (2. Oktober, siehe `schnittImStab`):
     * für den Verlauf über die Höhe und, falls eine Stelle im Feld grösser
     * ist als beide Enden, für das η des Stabes.
     */
    let verlauf = null;
    if (rolle === 'mast') {
      const a = knXYZ.get(st.von), b = knXYZ.get(st.bis);
      const L = a && b ? Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) : 0;
      // Auch ein kurzes Stück bekommt seine beiden Enden - sonst fehlte es
      // in der Linie über die Höhe.
      const n = Math.max(1, Math.min(24, Math.ceil(L / MAST_TEILUNG)));
      if (L > 0) {
        verlauf = [];
        for (let k = 0; k <= n; k += 1) {
          const xi = k / n;
          const fx = schnittImStab(f, L, xi);
          const zx = torsion ? torsion.z_i + (torsion.z_j - torsion.z_i) * xi : 0;
          const sx = stabSpannung(qsMap.get(st.querschnitt), fx, rolle,
                                  torsion ? { z_i: zx, z_j: zx, zO: torsion.zO } : null);
          if (!sx) continue;
          verlauf.push({ xi, sig: sx.sig, N: Math.abs(fx[0]),
                         V: Math.max(Math.abs(fx[1]), Math.abs(fx[2])),
                         M: Math.max(Math.abs(fx[4]), Math.abs(fx[5])) });
          if (k > 0 && k < n && sx.sig > s.sig * (1 + 1e-9)) s = { ...sx, ende: 'feld', xi };
        }
      }
    }
    const eta = fyd > 0 ? s.sig / fyd : null;
    const eintrag = { name: st.name, rolle, sig: s.sig, ende: s.ende, eta, detail: s, verlauf };
    je.set(st.name, eintrag);
    const g = gruppen[rolle] ?? (gruppen[rolle] = { anzahl: 0, sig: 0, eta: 0, wo: null });
    g.anzahl += 1;
    if (s.sig > g.sig) { g.sig = s.sig; g.eta = eta; g.wo = st.name; }
    if (!hoechste || s.sig > hoechste.sig) hoechste = eintrag;

    // Und dasselbe je BAUTEIL der Reihe - das Urteil nennt einen Namen.
    const zu = stabZuordnung(st.name);
    const b = bauteile[zu.key] ?? (bauteile[zu.key] = {
      key: zu.key, name: zu.name, art: zu.art, id: zu.id,
      sig: 0, eta: null, wo: null, rolle: null });
    if (s.sig > b.sig) {
      b.sig = s.sig; b.eta = eta; b.wo = st.name; b.rolle = rolle; b.detail = s;
    }
  });

  return { je, gruppen, bauteile, hoechste, ohneWert, ohneRolle };
}

/* ===========================================================================
 * >>> DER GANZE WEG: VOM RECHENSATZ ZUM eta, UEBER DAS STABWERK. <<<
 * =========================================================================
 *
 * Weisung vom 25. September: «ersatzbalken als optionales rechenverfahren in
 * den optionen auswaehlbar machen, primaer den loeser nutzen, man koennte
 * einen button zur ausloesung der berechnung ansetzen der das finale modell
 * berechnet und die werte setzt».
 *
 * Genau das kapselt diese Funktion: Modell bauen, loesen, Kombinationen
 * ueberlagern, Spannungen rechnen, das groesste eta je Bauteilgruppe
 * zurueckgeben. Was hier NICHT passiert, ist Anzeige - das Ergebnis ist ein
 * Datensatz, kein Zustand.
 *
 * >>> WARUM DAS NICHT BEI JEDER EINGABE LAUFEN KANN. <<<
 *
 * Gemessen am J90/20 m: der Ersatzbalken braucht fuer die ganze Huellkurve
 * 4.7 ms, der Loeser 441 ms - das Neunzigfache. Bei jedem Tastendruck waere
 * die Anwendung traege. Deshalb der Knopf.
 *
 * Die Aufteilung zeigt aber auch, wo es billig wird: die ZERLEGUNG (179 ms)
 * haengt nur an der Geometrie, ein weiterer Lastfall kostet 23.5 ms, und die
 * KOMBINATIONEN kosten gar nichts - das System ist linear, also ist jede
 * Kombination eine Summe der acht Grundfaelle. Deshalb wird hier EINMAL
 * geloest und danach ueberlagert.
 * ========================================================================= */

/** Die Einwirkungsgruppen der Datei je Beiwert-Schluessel des Kerns. */
export const GRUPPEN_JE_BEIWERT = {
  G: ['G', 'G_Anbau', 'G_Ablenk'],
  WindX: ['WindX'], WindY: ['WindY'], Schnee: ['Schnee'],
  HavarieX: ['HavarieX'], HavarieY: ['HavarieY'],
};

/* ===========================================================================
 * >>> DIE KOMBINATION STEHT IN DER DATEI - SIE WIRD NICHT ZWEIMAL
 *     HERGELEITET. <<<
 * =========================================================================
 *
 * BEFUND vom 25. September, beim Anschluss der Jochreihe gefunden und
 * gemessen am J90/20 m mit zwei Fahrleitungen, beide «kann reissen»:
 *
 *     havariep                groesste Stabkraft 39.7944
 *     havarie|<L1>|p          groesste Stabkraft 39.7944
 *     havarie|<L1>|m          groesste Stabkraft 39.7944
 *     havarie|<L2>|p          groesste Stabkraft 39.7944
 *     havarie|<L2>|m          groesste Stabkraft 39.7944
 *
 * Fünf Havariefaelle, ZIFFERNGLEICH - weil alle fünf auf das blosse
 * Eigengewicht zusammenfielen. Der Leiterriss kam im Stabwerksweg
 * überhaupt nicht an.
 *
 * Der Grund war `GRUPPEN_JE_BEIWERT`: es bildet den Beiwert `HavarieY` auf
 * den Lastfall `HavarieY` ab. Seit dem 19. September heisst der Lastfall
 * eines gerissenen Leiters aber `HavarieY|<Leiter>|p` - je Leiter einer.
 * Der Sammelfall daneben ist leer, `lsg.u.has('HavarieY')` trifft ihn,
 * und heraus kommt null. Dieselbe Lücke traf die CHARAKTERISTISCHEN
 * Einzelfälle: «Ständig (Tragwerk)» griff alle drei G-Teile statt nur
 * der beiden gemeinten (`l.nur`).
 *
 * >>> EINE ZWEITE HERLEITUNG DERSELBEN SACHE IST IMMER EINE ZWEITE
 *     WAHRHEIT. <<<
 *
 * `stabmodellJson` schreibt die Kombinationen längst aus - mit `anteile`
 * je Lastfall, samt Leiterzuordnung und `nur`. Es ist dieselbe Liste, die
 * AxisVM rechnet. Genommen wird ab jetzt sie; die Regel unten bleibt nur
 * als Rückfall für eine Datei ohne Kombinationen (dann fehlt auch die
 * Eingabe, und mehr als die Grundfälle gibt es nicht).
 * ========================================================================= */

/** Die Anteile einer Kombination an den Lastfaellen der Datei. */
export function anteileFuer(lf, dat = null) {
  const k = (dat?.kombinationen ?? []).find((x) => x.key === lf.key);
  if (k?.anteile?.length) return k.anteile;
  const out = [];
  Object.entries(lf.beiwerte || {}).forEach(([gruppe, faktor]) => {
    if (!faktor) return;
    (GRUPPEN_JE_BEIWERT[gruppe] ?? [gruppe])
      .forEach((fall) => out.push({ lastfall: fall, faktor }));
  });
  return out;
}

/**
 * Kraefte aus Anteilen ueberlagern.
 * Linear - deshalb ist das eine Summe und keine neue Rechnung.
 */
export function kraefteAusAnteilen(lsg, anteile) {
  const out = new Map();
  (anteile ?? []).forEach(({ lastfall, faktor }) => {
    if (!faktor || !lsg.u.has(lastfall)) return;
    lsg.stabkraft(lastfall).forEach((f, name) => {
      let ziel = out.get(name);
      if (!ziel) { ziel = new Float64Array(12); out.set(name, ziel); }
      for (let i = 0; i < 12; i += 1) ziel[i] += faktor * f[i];
    });
  });
  return out;
}

/**
 * Kraefte einer Kombination aus den Grundfaellen ueberlagern.
 *
 * Der alte Weg über die Beiwerte allein - er kennt die Lastfälle je
 * Leiter nicht (siehe oben) und steht nur noch für Aufrufer ohne Datei.
 */
export function kraefteKombiniert(lsg, beiwerte) {
  return kraefteAusAnteilen(lsg, anteileFuer({ beiwerte }, null));
}

/**
 * Das Stabwerk ueber alle Nachweis-Kombinationen auswerten.
 *
 * @param {object} dat       Modell aus stabmodellJson()
 * @param {object} lsg       Loesung aus loese()
 * @param {Array} faelle     Kombinationen aus lastfaelle(), nur `nachweis`
 * @param {number} fyd       Streckgrenze, Bemessungswert [N/mm²]
 */
export function stabwerkHuelle(dat, lsg, faelle, fyd, opt = {}) {
  const gruppen = {};
  const bauteile = {};
  const teile = {};
  const jeStab = {};
  let massgebend = null;
  const jeFall = [];
  const ohneRolle = new Set();
  /*
   * >>> DIE HUELLE DER SCHNITTGROESSEN JE STAB (28. September). <<<
   * Für den 3D-Resultatplot und die Verläufe im Stabwerksweg. Auf Rückfrage
   * «Alles als Hülle je Stab»: je Stab das grösste |N|, |V|, |M|, |T| über
   * alle Kombinationen und beide Enden, dazu σ aus N allein - nicht die
   * Kräfte des Falls, der das grösste η gab (die passen zu η, sind aber
   * nicht die grössten). V und M sind je das Grössere der beiden
   * Querrichtungen, wie der Ersatzbalken sie aufträgt.
   */
  const huelle = {};
  const flaeche = new Map(dat.querschnitte.map((q) => [q.name, Number(q.A) || 0]));
  const stabQs = new Map(dat.staebe.map((st) => [st.name, st.querschnitt]));
  const betrag = (f, i, j) => Math.max(Math.abs(f[i]), Math.abs(f[j]));

  faelle.forEach((lf) => {
    const kraefte = kraefteAusAnteilen(lsg, anteileFuer(lf, dat));
    const nw = stabNachweise(dat, kraefte, fyd, opt);
    jeFall.push({ key: lf.key, bez: lf.bez, gruppen: nw.gruppen,
                  hoechste: nw.hoechste });
    Object.entries(nw.gruppen).forEach(([rolle, g]) => {
      const alt = gruppen[rolle];
      if (!alt || g.sig > alt.sig) {
        gruppen[rolle] = { ...g, fall: lf.key, bez: lf.bez };
      }
    });
    /*
     * DASSELBE JE BAUTEIL DER REIHE. Ein Joch kann unter Wind +y
     * massgebend sein und das Nachbarjoch unter Wind -y - dann steht bei
     * jedem sein eigener Fall, nicht der des Grössten.
     */
    Object.entries(nw.bauteile).forEach(([key, b]) => {
      const vor = bauteile[key];
      if (!vor || b.sig > vor.sig) {
        bauteile[key] = { ...b, fall: lf.key, bez: lf.bez };
      }
    });
    // Je Bauteil UND Teil (Obergurt, Untergurt, Bindeblech, Mast) - die
    // Kacheln der Seitenleiste zeigen diese Gliederung (28. September).
    nw.je.forEach((s) => {
      /*
       * >>> JE STAB SEIN MASSGEBENDER FALL, MIT DEN KRAEFTEN (28. Sept.). <<<
       * Für den Schnitt im Stabwerksweg («Station + Stabliste»): an einer
       * Station stehen die Stäbe mit ihren Endkräften, darunter die
       * höchstbeanspruchten je Teil. Beides braucht die Kräfte des Falls,
       * in dem der Stab massgebend wurde - nicht die des Grössten.
       */
      const fH = kraefte.get(s.name);
      if (fH) {
        const h = huelle[s.name] ?? (huelle[s.name] = { N: 0, V: 0, M: 0, T: 0 });
        h.N = Math.max(h.N, betrag(fH, 0, 6));
        h.V = Math.max(h.V, betrag(fH, 1, 7), betrag(fH, 2, 8));
        h.T = Math.max(h.T, betrag(fH, 3, 9));
        h.M = Math.max(h.M, betrag(fH, 4, 10), betrag(fH, 5, 11));
        // Der Verlauf im Stab (Masten): je Stelle die Hülle über die Fälle.
        if (s.verlauf) {
          if (!h.verlauf) h.verlauf = s.verlauf.map((p) => ({ ...p, sig: 0, N: 0, V: 0, M: 0 }));
          s.verlauf.forEach((p, k) => {
            const q = h.verlauf[k];
            if (!q) return;
            q.sig = Math.max(q.sig, p.sig); q.N = Math.max(q.N, p.N);
            q.V = Math.max(q.V, p.V); q.M = Math.max(q.M, p.M);
          });
        }
      }
      const vorS = jeStab[s.name];
      if (!vorS || s.sig > vorS.sig) {
        const f = kraefte.get(s.name);
        jeStab[s.name] = { name: s.name, rolle: s.rolle, teil: stabTeil(s.name, s.rolle),
                           sig: s.sig, eta: s.eta, ende: s.ende,
                           fall: lf.key, bez: lf.bez, f: f ? Array.from(f) : null };
      }
      const teil = stabTeil(s.name, s.rolle);
      if (!teil) return;
      const zu = stabZuordnung(s.name);
      const k = `${zu.key}|${teil}`;
      const vor = teile[k];
      if (!vor || s.sig > vor.sig) {
        teile[k] = { key: zu.key, name: zu.name, teil, sig: s.sig, eta: s.eta,
                     wo: s.name, fall: lf.key, bez: lf.bez,
                     // Die Kette für den Bericht (1. Oktober).
                     detail: s.detail ?? null };
      }
    });
    (nw.ohneRolle ?? []).forEach((n) => ohneRolle.add(n));
    if (nw.hoechste && (!massgebend || nw.hoechste.sig > massgebend.sig)) {
      massgebend = { ...nw.hoechste, fall: lf.key, bez: lf.bez,
                     bauteil: stabZuordnung(nw.hoechste.name).name };
    }
  });

  /*
   * DAS URTEIL IST DAS MAXIMUM UEBER DIE GEFUEHRTEN BAUTEILE, MIT NAMEN -
   * so, wie es der Auftraggeber am 17. September fuer den Kern entschieden
   * hat. Ein zweiter Massstab fuer denselben Zweck waere eine Fehlerquelle.
   *
   * >>> UND SEIT DEM 25. SEPTEMBER GILT ER DER GANZEN REIHE. <<<
   *
   * Weisung vom 19. September: «die zusammenhängenden jochtragwerke sind
   * als gesamtheitliches tragwerk zu betrachten», dazu «Seitenleiste mit
   * Urteil der Reihe (Maximum mit Namen)». `reihe` ist diese Liste: je
   * Joch und je Mast eine Zeile, absteigend - das Grösste oben.
   */
  const reihe = Object.values(bauteile)
    .sort((a, b) => (b.eta ?? 0) - (a.eta ?? 0));

  // Die Lage jedes Stabes im Blatt - der Schnitt sucht danach.
  const kn = new Map(dat.knoten.map((k) => [k.name, k]));
  dat.staebe.forEach((st) => {
    const z = jeStab[st.name];
    const a = kn.get(st.von), b = kn.get(st.bis);
    if (!z || !a || !b) return;
    z.x0 = Math.min(a.x, b.x); z.x1 = Math.max(a.x, b.x);
    z.zm = (a.z + b.z) / 2; z.ym = (a.y + b.y) / 2;
    z.z0 = Math.min(a.z, b.z); z.z1 = Math.max(a.z, b.z);
    z.bauteil = stabZuordnung(st.name).key;
    const h = huelle[st.name];
    if (h) {
      const A = flaeche.get(stabQs.get(st.name)) ?? 0;   // m²
      z.huelle = { ...h, sigN: A > 0 ? h.N / A / 1000 : null };   // N/mm²
      // Der Verlauf im Stab mit η, über die Höhe (Masten).
      if (h.verlauf) {
        z.verlauf = h.verlauf.map((p) => ({
          ...p, eta: fyd > 0 ? p.sig / fyd : null,
          z: a.z + (b.z - a.z) * p.xi }));
      }
    }
  });

  return { gruppen, bauteile, teile, jeStab, reihe, massgebend, jeFall,
           /*
            * WER NICHT GEFUEHRT WIRD, STEHT HIER MIT NAMEN. Eine leere
            * Liste ist die Regel; eine volle sagt, dass ein Tragwerk im
            * Modell steht, dessen Stäbe dieser Nachweis nicht kennt.
            */
           ohneRolle: [...ohneRolle],
           etaGesamt: massgebend ? massgebend.eta : null };
}

/**
 * Welcher Teil eines Bauteils ist dieser Stab? Obergurt, Untergurt,
 * Bindeblech oder Mast - dieselbe Gliederung, die die Kacheln der
 * Seitenleiste aus dem Kern kennen (Obergurt, Untergurt, Bindeblech).
 * `null` für alles, was keine eigene Kachel hat.
 */
export function stabTeil(name, rolle = null) {
  const n = String(name);
  const r = rolle ?? stabRolle(n);
  if (r === 'gurt') {
    // Die vier Gurtwinkel des Gittermasts sind EIN Teil seines Masten.
    if (/(?:^|_)MAST_[^_]+_G[1-4]_S\d+$/.test(n)) return 'gurt';
    const g = /(?:^|_)(OG|UG)(?:L|R)_S\d+$/.exec(n);
    return g ? g[1] : null;
  }
  if (r === 'rohr') return 'rohr';
  if (r === 'blech') return 'blech';
  if (r === 'mast') return 'mast';
  // Die beiden UPE des Tragauslegers sind EIN Teil - «Gurt UPE».
  if (r === 'gurtU') return 'UPE';
  return null;
}

/* ===========================================================================
 * >>> STABWERK FUEHRT, KNICKEN ERGAENZT (28. September). <<<
 * =========================================================================
 *
 * Frage des Auftraggebers mit dem Bild der Seitenleiste: «diese auswertung
 * ist etwas irreführend wenn ich für stabwerk modell und balken verschieden
 * ausnutzungwerte in einer maske sehe? wollen wir nach der berechnung nur
 * auf die stabwerk ausnutzung setzen? was spricht dagegen?» Auf Rückfrage:
 * «Stabwerk führt, Knicken ergänzt».
 *
 * Diese Funktion setzt das Urteil des Kerns (`bauteilUrteil`) mit dem
 * Stabwerk neu zusammen - Eintrag für Eintrag, und JEDER trägt seine
 * Quelle (`quelle: 'stabwerk' | 'ersatzbalken'`):
 *
 *   - Joch: das Grösste aus Obergurt, Untergurt und Bindeblech des
 *     Stabwerks, sofern das Stabwerk das Joch kennt. Ein Abfangjoch führt
 *     der Stabnachweis nicht (seine Träger haben keine Rolle) - dann bleibt
 *     der Kern, beschriftet.
 *   - Mast: der Querschnitt aus dem Stabwerk. Der Löser rechnet KEINE
 *     Stabilität; deshalb steht das Knicken als EIGENE Zeile daneben, aus
 *     dem Kern. Beide zählen, das Urteil ist das Maximum.
 *   - Anker, Fundament: vorerst aus dem Kern, als «Ersatzbalken».
 *
 * >>> WARUM DAS KNICKEN NICHT EINFACH IM MAST AUFGEHT. <<<
 *
 * Der Kern rechnet `etaMitStabilitaet` = max(Querschnitt, Knicken) - mit
 * SEINEN Schnittgrössen. Nähme man das als Mastzahl, stünde am geteilten
 * Masten der Reihe wieder die kleinere Zahl des Einzelfelds da, sobald das
 * Knicken die Querschnittszahl des Kerns überholt. Getrennt geführt sieht
 * man beides mit seiner Herkunft.
 *
 * ⚠ Das Knicken rechnet mit den Schnittgrössen des KERNS, nicht des
 * Stabwerks. Am geteilten Masten der Reihe sind diese kleiner (Einzelfeld
 * mit Sofortmassnahme); die Zeile sagt deshalb, woher sie stammt.
 *
 * @param {object} bt  Urteil des Kerns aus bauteilUrteil()
 * @param {object} h   Ergebnis aus stabwerkHuelle() (oder null)
 * @param {object} o   { jochKey: 'tragwerk' | 'tragwerk:T1',
 *                       knick: { 'Mast M1': eta, ... } }
 */
export function bauteileMitStabwerk(bt, h, o = {}) {
  const liste = [];
  const dazu = (x) => {
    const e = Number.isFinite(x.eta) ? x.eta : null;
    liste.push({ ...x, eta: e, ueber: x.ueber ?? (e !== null && e > 1) });
  };
  const teilVon = (key, teil) => h?.teile?.[`${key}|${teil}`] ?? null;
  /*
   * >>> DER TRAGAUSLEGER (28. September, Etappe 4c). <<<
   * Rechnet das Stabwerk einen Ausleger (`h.ausleger` aus rechneStabwerk),
   * trägt es sein ganzes Urteil: Gurt (UPE) und Bindebleche statt des
   * Phantomjochs des Kerns, dazu die Aufhängung gegen V_zul, das Knicken
   * und das Fundament mit den Kräften des Stabwerks.
   */
  const ta = h?.ausleger ?? null;
  /*
   * DER KERN KENNT AM AUSLEGER EINEN ZWEITEN MASTEN, den es nicht gibt (das
   * Phantomauflager am freien Ende, «Mast B»). Mit dem Stabwerk zählt nur
   * der Mast des Auslegers - Phantom-Mast und -Fundament fallen weg.
   */
  const taId = ta ? /^Mast (.+)$/.exec(ta.name ?? '')?.[1] ?? null : null;
  const phantom = (x) => ta && (x.key === 'mast' || x.key === 'fundament')
    && /^(?:Mast|Fundament) (.+)$/.exec(x.name)?.[1] !== taId;
  let fundamentDa = false;
  (bt?.liste ?? []).forEach((x) => {
    if (phantom(x)) return;
    // Die Aufhaengung des Kragarm-Kerns ersetzt das Stabwerk (unten bei `joch`).
    if (x.key === 'aufhaengung' && ta) return;
    if (x.key === 'joch') {
      const t = ['OG', 'UG', 'blech', 'UPE']
        .map((k) => teilVon(o.jochKey ?? 'tragwerk', k))
        .filter(Boolean)
        .sort((a, b) => (b.eta ?? 0) - (a.eta ?? 0))[0];
      if (t) {
        dazu({ key: 'joch', name: ta ? 'Tragausleger' : x.name, eta: t.eta,
               quelle: 'stabwerk', fall: t.fall, bez: t.bez, ueber: null });
        const a = ta?.aufhaengung;
        if (a) {
          dazu({ key: 'aufhaengung', name: 'Aufhängung', eta: a.eta, quelle: 'stabwerk',
                 fall: a.fall, bez: a.bez, ueber: a.ueber });
        }
        return;
      }
      dazu({ ...x, quelle: 'ersatzbalken' });
      return;
    }
    if (x.key === 'mast') {
      const id = /^Mast (.+)$/.exec(x.name)?.[1] ?? null;
      const t = id ? h?.bauteile?.[`mast:${id}`] : null;
      if (t) {
        dazu({ key: 'mast', name: x.name, eta: t.eta, quelle: 'stabwerk',
               fall: t.fall, bez: t.bez, ueber: null });
      } else {
        dazu({ ...x, quelle: 'ersatzbalken' });
      }
      // Am Ausleger kommt das Knicken aus dem Stabwerk (Entscheid 28. Sept.).
      if (t && ta) {
        if (ta.knick && Number.isFinite(ta.knick.eta)) {
          dazu({ key: 'knicken', name: `Knicken ${id ?? x.name}`, eta: ta.knick.eta,
                 quelle: 'stabwerk', fall: ta.knick.fall, bez: ta.knick.bez, ueber: null });
        }
        return;
      }
      // Am Tragjoch seit dem 28. September ebenfalls aus dem Stabwerk
      // (`h.knick`, rechneStabwerk); ohne es der Kern.
      const kS = id ? h?.knick?.[id] : null;
      if (t && kS && Number.isFinite(kS.eta)) {
        dazu({ key: 'knicken', name: `Knicken ${id}`, eta: kS.eta, quelle: 'stabwerk',
               fall: kS.fall, bez: kS.bez, ueber: null });
        return;
      }
      const kn = o.knick?.[x.name];
      if (t && Number.isFinite(kn)) {
        dazu({ key: 'knicken', name: `Knicken ${id ?? x.name}`, eta: kn,
               quelle: 'ersatzbalken', ueber: null });
      }
      return;
    }
    // Ebenso das Fundament des Auslegermasten.
    if (x.key === 'fundament' && ta) {
      const f = ta.fundament?.A;
      fundamentDa = true;
      if (f && Number.isFinite(f.eta)) {
        dazu({ key: 'fundament', name: x.name, eta: f.eta, quelle: 'stabwerk',
               fall: f.massgebend?.lastfall, bez: f.massgebend?.bez, ueber: null });
      }
      return;
    }
    /*
     * DAS FUNDAMENT JEDES MASTEN AUS DEM STABWERK (30. September) - am
     * Tragjoch, Einzelmast und Abfangjoch, je Mast mit seinem Typ.
     */
    // Der Anker aus dem Stabwerk (30. September) - der Name endet mit dem Masten.
    if (x.key === 'anker') {
      const id = /(\S+)$/.exec(x.name)?.[1] ?? null;
      const q = id ? h?.ankerJe?.[id]?.nachweis : null;
      // Ein schlaffes Seil ist kein Nachweis (wie im Kern) - es fällt heraus.
      if (q && q.grund === 'schlaff') return;
      if (q) {
        dazu({ key: 'anker', name: x.name, eta: Number.isFinite(q.eta) ? q.eta : null,
               quelle: 'stabwerk', fall: h.ankerJe[id].lastfall, bez: h.ankerJe[id].bez,
               ueber: q.lieferbar === false ? true : null });
        return;
      }
    }
    if (x.key === 'fundament') {
      const id = /^Fundament (.+)$/.exec(x.name)?.[1] ?? null;
      const f = id ? h?.fundamentJe?.[id] : null;
      if (f && Number.isFinite(f.eta)) {
        dazu({ key: 'fundament', name: x.name, eta: f.eta, quelle: 'stabwerk',
               fall: f.massgebend?.lastfall, bez: f.massgebend?.bez, ueber: null });
        return;
      }
    }
    dazu({ ...x, quelle: 'ersatzbalken' });
  });
  // Liefert der Kern kein Fundament, steht das des Auslegermasten trotzdem da.
  if (ta && !fundamentDa && Number.isFinite(ta.fundament?.A?.eta)) {
    const f = ta.fundament.A;
    dazu({ key: 'fundament', name: `Fundament ${taId}`, eta: f.eta, quelle: 'stabwerk',
           fall: f.massgebend?.lastfall, bez: f.massgebend?.bez, ueber: null });
  }
  // Dieselbe Regel wie bauteilUrteil: ein nicht lieferbares Bauteil vor
  // jeder Zahl, sonst das grösste eta.
  const massgebend = liste.reduce((best, x) => {
    if (!best) return x;
    if (x.ueber && x.eta === null) return best.ueber && best.eta === null ? best : x;
    if (best.ueber && best.eta === null) return best;
    return (x.eta ?? 0) > (best.eta ?? 0) ? x : best;
  }, null);
  const zahlen = liste.map((x) => x.eta).filter((v) => v !== null);
  return {
    eta: zahlen.length ? Math.max(...zahlen) : (bt?.eta ?? 0),
    massgebend,
    ueber: liste.some((x) => x.ueber),
    liste,
    stabwerk: liste.some((x) => x.quelle === 'stabwerk'),
  };
}

/* ===========================================================================
 * >>> DIE AUFHAENGUNG DES TRAGAUSLEGERS GEGEN V_zul (28. September). <<<
 * =========================================================================
 *
 * Weisung vom 26. September: «Aufhängung gegen V_zul = 5 kN» - der
 * Kontrollwert der Zeichnung; darüber verlangt sie eine separate statische
 * Berechnung. Auf Rückfrage am 28. September: «Charakteristisch».
 *
 * Verglichen wird der SENKRECHTE Anteil der Seilkraft - das ist das V der
 * Kontrollformel V = Σ(F_V·x)/c₁ + Σ(F_H·z)/c₁. Die Fälle sind dieselben wie
 * beim Anker (`ANKER_FALLARTEN`: charakteristisch und aussergewöhnlich,
 * alle Beiwerte 1).
 *
 * >>> EIN GEDRÜCKTES SEIL IST EIN EIGENER BEFUND. <<<
 * Das Stabwerk rechnet die Aufhängung als Pendelstab - er trägt auch Druck.
 * Ein Seil tut das nicht: in einem Fall mit Druck fiele es aus, und der
 * Ausleger hinge allein am Anschluss. Das steht dann da, mit dem Fall.
 *
 * @param {object} dat    Modell aus stabmodellJson()
 * @param {object} lsg    Lösung aus loese()
 * @param {Array} faelle  Lastfälle (alle; gefiltert wird hier)
 * @param {number} Vzul   zulässige senkrechte Kraft [kN]
 */
export const AUFHAENGUNG_FALLARTEN = ['charakteristisch', 'aussergewoehnlich'];
/** Die wirklichen charakteristischen Zustände (siehe unten) - für Seil und Längsanker. */
export function wirklicheZustaende(faelle) {
  const wirklich = (faelle ?? []).filter((l) => AUFHAENGUNG_FALLARTEN.includes(l.art)
    && !l.nur && (l.art === 'aussergewoehnlich' || (Number(l.beiwerte?.G) || 0) !== 0));
  return [{ key: 'ganzesG', bez: 'Ständig (ganz)', beiwerte: { G: 1 } }, ...wirklich];
}

/* ===========================================================================
 * >>> DER LÄNGSANKER DES TRAGAUSLEGERS: DIE SEILKRAFT (28. September). <<<
 * =========================================================================
 *
 * «beim tragausleger wid ein längsanker angebracht am ende des kragarms um
 * die torsionseinwirkung abzufangen» - zwei Seile ±y, nur Zug, ohne
 * Vorspannung. Das Modell hält dort starr in y; die Auflagerkraft IST die
 * Kraft im gezogenen Seil, ihr Vorzeichen sagt, welches Seil zieht.
 * Charakteristisch über die wirklichen Zustände (wie die Aufhängung) und
 * als Bemessungswert über die Nachweis-Kombinationen - als AUSKUNFT; einen
 * Widerstand des Ankers führt das Sortiment nicht.
 */
export function laengsankerKraft(dat, lsg, alleFaelle, nachweisFaelle, knoten = 'LV_M') {
  const a = dat.auflager.find((x) => x.knoten === knoten || String(x.knoten).endsWith(`_${knoten}`));
  if (!a) return null;
  const Fy = (lf) => anteileFuer(lf, dat).reduce((sum, { lastfall, faktor }) => {
    if (!faktor || !lsg.u.has(lastfall)) return sum;
    const r = lsg.auflagerkraefte(lastfall).find((x) => x.knoten === a.knoten);
    return sum + faktor * (r?.uy ?? 0);
  }, 0);
  const groesste = (liste) => liste.reduce((best, lf) => {
    const f = Fy(lf);
    return !best || Math.abs(f) > Math.abs(best.F)
      ? { F: f, seite: f >= 0 ? '+y' : '−y', fall: lf.key, bez: lf.bez } : best;
  }, null);
  return { knoten: a.knoten,
           charakteristisch: groesste(wirklicheZustaende(alleFaelle)),
           bemessung: groesste(nachweisFaelle ?? []) };
}
export function aufhaengungNachweis(dat, lsg, faelle, Vzul, name = 'AUFHAENGUNG', seilInfo = null) {
  /*
   * EIN ODER ZWEI SEILE (Entscheid 28. September: zwei Seile, an der
   * Ankertraverse gespreizt). V_zul gilt dem AUSLEGER - verglichen wird die
   * Summe der senkrechten Anteile; gedrückt sein darf keines.
   */
  const re = new RegExp(`(^|_)${name}(_[PN])?$`);
  const seile = dat.staebe.filter((s) => re.test(s.name));
  if (!seile.length) return null;
  const kn = new Map(dat.knoten.map((k) => [k.name, k]));
  const sinusVon = (st) => {
    const a = kn.get(st.von), b = kn.get(st.bis);
    const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    return L > 0 ? Math.abs(b.z - a.z) / L : 0;
  };
  const sinus = sinusVon(seile[0]);
  let best = null, druck = null, schlaff = null;
  /*
   * >>> KEIN SEILDRUCK (3. Oktober, «seildruck nicht zulassen in der app»). <<<
   * Mit `seilInfo` (core.stabseil.js) ist ein Seil, das drücken müsste, in
   * dieser Kombination AUSGEFALLEN: es trägt 0, das andere allein (die
   * Kombination führt den Hilfsfall, alle Nachweise lesen ihn). Gemeldet
   * wird es als `schlaff` - eine Auskunft. Ein Befund (`druck`) bleibt nur,
   * wenn ALLE Seile ausfallen: dann hebt der Ausleger ab.
   */
  /*
   * >>> NUR WIRKLICHE ZUSTÄNDE (Entscheid 28. September). <<<
   * Die charakteristischen Fälle führen G auch in zwei Hälften («Ständig
   * (Tragwerk)», «Ablenkkräfte ständig», `nur`) und den Wind allein - für
   * die Auflagerkräfte je Einwirkung gedacht, am Bauwerk kommen sie nicht
   * vor. Gemessen L = 8 m mit Hängestütze: die Tragwerkshälfte allein gab
   * S_v 5.54 kN (über 5), ganzes G 4.73 kN; die Ablenkhälfte allein
   * drückte das Seil (−1.6 kN). Auf Rückfrage: «Nur wirkliche Zustände» -
   * ganzes G, G + Wind je Richtung, Havarie.
   */
  wirklicheZustaende(faelle).forEach((lf) => {
    const kr = kraefteAusAnteilen(lsg, anteileFuer(lf, dat));
    let Sv = 0, N = -Infinity, da = false;
    const aus = seilInfo?.je?.get(lf.key) ?? null;
    const alleAus = aus && seile.every((st) => aus.get(st.name)?.schlaff);
    seile.forEach((st) => {
      const f = kr.get(st.name);
      if (!f) return;
      da = true;
      const inf = aus?.get(st.name);
      if (inf?.schlaff && !alleAus) {
        // Ausgefallen: trägt nichts. Die grösste Kraft, die es hätte
        // drücken müssen, als Auskunft.
        if (!schlaff || inf.NohneAusfall < schlaff.N) {
          schlaff = { N: inf.NohneAusfall, seil: st.name, fall: lf.key, bez: lf.bez };
        }
        N = Math.max(N, 0);
        return;
      }
      // Fallen alle aus, gilt die lineare Kraft - und der Befund darunter.
      const Ni = alleAus ? inf.NohneAusfall : -f[0];   // Zug positiv
      Sv += Ni * sinusVon(st);
      N = Math.max(N, Ni);
      // Unter 0.01 kN ist es Rechenrauschen (reiner Wind am Masten verformt
      // die Aufhängung um Bruchteile), kein Druck.
      if (Ni < -0.01 && (!druck || Ni < druck.N)) {
        druck = { N: Ni, seil: st.name, fall: lf.key, bez: lf.bez };
      }
    });
    if (!da) return;
    if (!best || Sv > best.Sv) best = { N, Sv, fall: lf.key, bez: lf.bez };
  });
  if (!best) return null;
  return { stab: seile[0].name, seile: seile.length, Vzul, ...best, sinus,
           eta: Vzul > 0 ? Math.max(0, best.Sv) / Vzul : null,
           schlaff,
           druck, ueber: (Vzul > 0 && best.Sv > Vzul) || Boolean(druck) };
}

/**
 * Eine Kennung des Eingabezustands.
 *
 * >>> WOZU. <<<
 *
 * Das Stabwerksergebnis entsteht auf Knopfdruck und bleibt danach stehen,
 * waehrend weitergetippt wird. Ohne eine Kennung stuende irgendwann ein eta
 * da, das zu einer anderen Geometrie gehoert - und niemand saehe es an. Der
 * Vergleich gegen PyNite ist genau in diese Falle gelaufen (ein 20-m-Joch
 * gegen die Ergebnisse eines 8-m-Jochs, Abweichungen bis Faktor 39), und
 * dort hat es eine Kennung geloest.
 *
 * Gezaehlt wird der EINGABESATZ, nicht das fertige Modell: er ist klein,
 * und er ist das, was sich aendert.
 */
export function eingabeKennung(satz) {
  let h = 5381;
  const t = JSON.stringify(satz ?? null);
  for (let i = 0; i < t.length; i += 1) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
  return `${t.length.toString(36)}-${h.toString(16)}`;
}

/* ===========================================================================
 * >>> DIE BEIDEN RECHENWEGE. <<<
 *
 * Weisung vom 25. September: «ersatzbalken als optionales rechenverfahren in
 * den optionen auswählbar machen, primär den löser nutzen».
 *
 * Sie stehen hier und nicht im app-Modul, weil die Maske sie braucht:
 * `ui.js` darf kein app-Modul importieren - das waere eine Abhaengigkeit
 * von unten nach oben, und der Buendler sortiert topologisch.
 * ========================================================================= */
export const RECHENVERFAHREN = [
  { key: 'ersatzbalken', titel: 'Ersatzbalken (schnell)',
    was: 'Balken mit Drehfedern, Schnittgrössen auf Gurte und Bleche aufgeteilt. Rechnet bei jeder Eingabe mit, rund 5 ms.' },
  { key: 'stabwerk', titel: 'Stabwerk (genau)',
    was: 'Das ganze Blatt als räumliches Stabmodell: jeder Gurt, jedes Blech, jeder Mast und Anker ein eigener Stab, geteilte Masten einmal. Rechnet rund 1 s nach der letzten Eingabe von selbst (0.4 bis 1.5 s) und führt dann Kacheln, Plot, Verläufe, Bericht und Excel. Nötig für Abfangjoch, Tragausleger, Jochreihe und Gittermast.' },
];

export const RECHENVERFAHREN_VORGABE = 'stabwerk';

/** Welches Verfahren gilt? Alte Staende kennen das Feld nicht. */
export function verfahrenVon(werte) {
  const k = werte?.rechenverfahren;
  return RECHENVERFAHREN.some((v) => v.key === k) ? k : RECHENVERFAHREN_VORGABE;
}
