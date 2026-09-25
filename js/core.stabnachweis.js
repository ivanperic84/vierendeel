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
  const tw = /^([TA]\d+)_/.exec(n);
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
  // Je Bauteil der Reihe (Joch T1, Mast M2 …) das grösste eta.
  const bauteile = {};
  let hoechste = null;
  let ohneWert = 0;
  const ohneRolle = [];

  dat.staebe.forEach((st) => {
    const rolle = stabRolle(st.name, st.art);
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
    const s = stabSpannung(qsMap.get(st.querschnitt), f, rolle);
    if (!s) { ohneWert += 1; return; }
    const eta = fyd > 0 ? s.sig / fyd : null;
    const eintrag = { name: st.name, rolle, sig: s.sig, ende: s.ende, eta };
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
      b.sig = s.sig; b.eta = eta; b.wo = st.name; b.rolle = rolle;
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
export function stabwerkHuelle(dat, lsg, faelle, fyd) {
  const gruppen = {};
  const bauteile = {};
  let massgebend = null;
  const jeFall = [];
  const ohneRolle = new Set();

  faelle.forEach((lf) => {
    const kraefte = kraefteAusAnteilen(lsg, anteileFuer(lf, dat));
    const nw = stabNachweise(dat, kraefte, fyd);
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

  return { gruppen, bauteile, reihe, massgebend, jeFall,
           /*
            * WER NICHT GEFUEHRT WIRD, STEHT HIER MIT NAMEN. Eine leere
            * Liste ist die Regel; eine volle sagt, dass ein Tragwerk im
            * Modell steht, dessen Stäbe dieser Nachweis nicht kennt.
            */
           ohneRolle: [...ohneRolle],
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
