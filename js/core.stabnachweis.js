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

import { randspannung, winkelwerteFuer } from './core.winkel.js';
import { getProfil } from './data.profiles.js';

/** Welche Rolle spielt dieser Stab im Tragwerk? */
export function stabRolle(name, art = 'stab') {
  const n = String(name);
  if (art === 'link') return 'link';
  if (art === 'starr') return 'starr';
  if (/(^|_)(OG|UG)(L|R)_S\d+$/.test(n)) return 'gurt';
  if (/(^|_)B(V|H)_/.test(n)) return 'blech';
  if (/(^|_)MAST_/.test(n)) return 'mast';
  return 'sonst';
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
export function stabSpannung(qs, f, rolle) {
  if (!qs || !f) return null;

  /*
   * BEIDE ENDEN ZAEHLEN. Der Stab traegt an i und j verschiedene Momente;
   * welches Ende massgebend ist, sagt erst der Vergleich. Die Stelle
   * DAZWISCHEN bleibt hier aussen vor - bei einer Streckenlast kann das
   * Feldmoment groesser sein, und das ist ein offener Punkt.
   */
  const enden = [
    { name: 'i', N: f[0], My: f[4], Mz: f[5] },
    { name: 'j', N: f[6], My: f[10], Mz: f[11] },
  ];

  if (rolle === 'gurt' && qs.profil) {
    // getProfil wirft bei unbekanntem Namen - hier ist das kein Abbruchgrund.
    let p = null;
    try { p = getProfil(qs.profil); } catch { p = null; }
    if (!p) return null;
    const w = winkelwerteFuer(p);
    let best = null;
    enden.forEach((e) => {
      const r = randspannung(w, e.N, e.My, e.Mz);
      if (!best || r.sig > best.sig) best = { sig: r.sig, ende: e.name };
    });
    return best;
  }

  const wd = widerstand(qs);
  if (!wd) return null;
  let best = null;
  enden.forEach((e) => {
    // kN, kNm -> N/mm²: N/A in kN/m² = kPa -> /1000; M/W in kNm/m³ -> /1000.
    const sig = Math.abs(e.N) / wd.A / 1000
              + Math.abs(e.My) / wd.Wy / 1000
              + Math.abs(e.Mz) / wd.Wz / 1000;
    if (!best || sig > best.sig) best = { sig, ende: e.name };
  });
  return best;
}

/**
 * Alle Staebe eines Modells auswerten.
 *
 * @param {object} dat      Modell aus stabmodellJson()
 * @param {Map} kraefte     je Stabname die 12 Endkraefte
 * @param {number} fyd      Bemessungswert der Streckgrenze [N/mm²]
 * @returns {{je:Map, gruppen:object, hoechste:object}}
 */
export function stabNachweise(dat, kraefte, fyd) {
  const qsMap = new Map(dat.querschnitte.map((q) => [q.name, q]));
  const je = new Map();
  const gruppen = {};
  let hoechste = null;
  let ohneWert = 0;

  dat.staebe.forEach((st) => {
    const rolle = stabRolle(st.name, st.art);
    /*
     * >>> STARRELEMENTE UND LINKS WERDEN NICHT NACHGEWIESEN. <<<
     * Sie sind Kunstgriffe, keine Bauteile - dieselbe Regel wie beim
     * Eigengewicht und bei der Schubverformung. Ein Ersatzquerschnitt von
     * 500 x 500 mm gaebe ohnehin eine erfundene Spannung.
     */
    if (rolle === 'starr' || rolle === 'link' || rolle === 'sonst') return;
    const f = kraefte.get(st.name);
    if (!f) return;
    const s = stabSpannung(qsMap.get(st.querschnitt), f, rolle);
    if (!s) { ohneWert += 1; return; }
    const eta = fyd > 0 ? s.sig / fyd : null;
    const eintrag = { name: st.name, rolle, sig: s.sig, ende: s.ende, eta };
    je.set(st.name, eintrag);
    const g = gruppen[rolle] ?? (gruppen[rolle] = { anzahl: 0, sig: 0, eta: 0, wo: null });
    g.anzahl += 1;
    if (s.sig > g.sig) { g.sig = s.sig; g.eta = eta; g.wo = st.name; }
    if (!hoechste || s.sig > hoechste.sig) hoechste = eintrag;
  });

  return { je, gruppen, hoechste, ohneWert };
}
