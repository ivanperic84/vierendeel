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

/**
 * Kraefte einer Kombination aus den Grundfaellen ueberlagern.
 * Linear - deshalb ist das eine Summe und keine neue Rechnung.
 */
export function kraefteKombiniert(lsg, beiwerte) {
  const out = new Map();
  Object.entries(beiwerte || {}).forEach(([gruppe, faktor]) => {
    if (!faktor) return;
    (GRUPPEN_JE_BEIWERT[gruppe] ?? [gruppe]).forEach((fall) => {
      if (!lsg.u.has(fall)) return;
      lsg.stabkraft(fall).forEach((f, name) => {
        let ziel = out.get(name);
        if (!ziel) { ziel = new Float64Array(12); out.set(name, ziel); }
        for (let i = 0; i < 12; i += 1) ziel[i] += faktor * f[i];
      });
    });
  });
  return out;
}

/**
 * Das Stabwerk ueber alle Nachweis-Kombinationen auswerten.
 *
 * @param {object} dat       Modell aus stabmodellJson()
 * @param {object} lsg       Loesung aus loese()
 * @param {Array} faelle     Kombinationen aus lastfaelle(), nur `nachweis`
 * @param {number} fyd       Streckgrenze, Bemessungswert [N/mm²]
 */
export function stabwerkHuelle(dat, lsg, faelle, fyd) {
  const gruppen = {};
  let massgebend = null;
  const jeFall = [];

  faelle.forEach((lf) => {
    const kraefte = kraefteKombiniert(lsg, lf.beiwerte);
    const nw = stabNachweise(dat, kraefte, fyd);
    jeFall.push({ key: lf.key, bez: lf.bez, gruppen: nw.gruppen,
                  hoechste: nw.hoechste });
    Object.entries(nw.gruppen).forEach(([rolle, g]) => {
      const alt = gruppen[rolle];
      if (!alt || g.sig > alt.sig) {
        gruppen[rolle] = { ...g, fall: lf.key, bez: lf.bez };
      }
    });
    if (nw.hoechste && (!massgebend || nw.hoechste.sig > massgebend.sig)) {
      massgebend = { ...nw.hoechste, fall: lf.key, bez: lf.bez };
    }
  });

  /*
   * DAS URTEIL IST DAS MAXIMUM UEBER DIE GEFUEHRTEN BAUTEILE, MIT NAMEN -
   * so, wie es der Auftraggeber am 17. September fuer den Kern entschieden
   * hat. Ein zweiter Massstab fuer denselben Zweck waere eine Fehlerquelle.
   */
  return { gruppen, massgebend, jeFall,
           etaGesamt: massgebend ? massgebend.eta : null };
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
    was: 'Jeder Gurt und jedes Blech ein eigener Stab. Läuft auf Knopfdruck, rund 0.4 s — dafür sieht er auch die Biegung der Bleche aus ihrer Ebene heraus, die ein Balken nicht führen kann.' },
];

export const RECHENVERFAHREN_VORGABE = 'stabwerk';

/** Welches Verfahren gilt? Alte Staende kennen das Feld nicht. */
export function verfahrenVon(werte) {
  const k = werte?.rechenverfahren;
  return RECHENVERFAHREN.some((v) => v.key === k) ? k : RECHENVERFAHREN_VORGABE;
}
