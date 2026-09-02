/**
 * core.constants.js
 * ---------------------------------------------------------------------------
 * Normative Konstanten und Umrechnungsfaktoren an EINER Stelle.
 * Nichts davon darf irgendwo im Rechenkern als Zahlenliteral auftauchen.
 *
 * Die Grenzwerte der Querschnittsklassifizierung stehen in core.klassen.js.
 * ---------------------------------------------------------------------------
 */

/** Einheitenumrechnung. Alle Spannungen im Kern in N/mm². */
export const U = {
  /** kN / cm²  ->  N/mm² */
  kN_cm2__N_mm2: 10,
  /** kNm / cm³ ->  N/mm² */
  kNm_cm3__N_mm2: 1000,
  /** kNm -> Nmm */
  kNm__Nmm: 1e6,
  /** kN -> N */
  kN__N: 1e3,
  /** m -> mm */
  m__mm: 1e3,
  /** m -> cm */
  m__cm: 1e2,
  /** cm -> mm */
  cm__mm: 10,
  /** cm² -> mm² */
  cm2__mm2: 100,
  /** Erdbeschleunigung [m/s²] für die Eigengewichtsinfo */
  g: 9.81,
};

/** Schubspannungsverteilung Rechteckquerschnitt: tau_max = FAKTOR * V / A */
export const RECHTECK = {
  TAU_FAKTOR: 1.5,
  /** W = t * h² / W_NENNER */
  W_NENNER: 6,
};

/** Numerische Toleranz für Knotenvergleiche [m]. */
export const TOL = 1e-7;

/**
 * DIE TRAGWERKSART — die erste Entscheidung, weil sie alle anderen bestimmt.
 *
 * Weisung des Auftraggebers vom 28. August: «die Haupttragwerke sollten global
 * gesteuert werden. Später wird man auch Einzelmasten und Masten mit
 * Tragausleger übergreifend eingeben können.»
 *
 * Was die Arten unterscheidet, ist nicht die Ausstattung, sondern der
 * LASTWEG:
 *
 *   joch          Zwei Masten, ein gegliederter Träger dazwischen. Die Last
 *                 läuft über den Träger auf beide Masten.
 *   einzelmast    Ein Kragarm im Fundament. Die Last hängt unmittelbar am
 *                 Masten; es gibt keinen Träger, also auch keine Gurte,
 *                 Bindebleche und keine Auflagerung eines Jochs.
 *   tragausleger  Ein Mast mit auskragendem gegliedertem Stab. Nach den
 *                 Werkstattzeichnungen (Sortiment Tragausleger UPE 140) sind
 *                 das ZWEI U-Profile mit Flachlaschen, nicht vier Winkel —
 *                 der Vierendeel-Kern trägt dort nicht unverändert.
 *
 * `traeger` sagt, ob ein gegliederter Träger dazugehört. Daran hängt die
 * halbe Eingabemaske, und es ist die Frage, die der Kern wirklich stellt.
 */
export const TRAGWERKSARTEN = [
  { key: 'joch', label: 'Tragjoch', traeger: true, masten: 2,
    kurz: 'Zwei Masten, Träger dazwischen' },
  { key: 'einzelmast', label: 'Einzelmast', traeger: false, masten: 1,
    kurz: 'Kragarm im Fundament, ohne Träger' },
  { key: 'tragausleger', label: 'Mast mit Tragausleger', traeger: true, masten: 1,
    kurz: 'Auskragender Stab am Masten' },
  /*
   * DAS ABFANGJOCH nimmt die LEITERZUGKRAEFTE auf, nicht das Gewicht der
   * Fahrleitung. Nach den Werkstattzeichnungen des Sortiments (Typ A) ist
   * es ein zweigurtiger Traeger: zwei UPE mit Sprossen im 500er-Raster,
   * A160 gerade, A200 und A240 mit geknickten Enden.
   *
   *     A160   UPE 160   jt 5.5 - 12.5 m   43 kg/m
   *     A200   UPE 200   jt 6.0 - 17.0 m   58 kg/m
   *     A240   UPE 240   jt 8.0 - 19.5 m   85 kg/m
   *
   * ZWEI Gurte, nicht vier - der Vierendeel-Kern traegt hier so wenig wie
   * beim Tragausleger.
   */
  { key: 'abfangjoch', label: 'Abfangjoch', traeger: true, masten: 2,
    kurz: 'Zwei UPE-Gurte, nimmt Leiterzug auf' },
];

/**
 * Die Art eines Eingabesatzes.
 *
 * ALTE DATEIEN RECHNEN UNVERÄNDERT: fehlt die Angabe, ist es ein Tragjoch —
 * das war bis zum 2. September der einzige Fall. Dasselbe Vorgehen wie bei
 * `mastVorhanden` (siehe UEBERGABE.md, «Masten und Auflagerung sind zwei
 * Fragen»).
 */
export function tragwerksart(w) {
  const k = w?.tragwerksart;
  return TRAGWERKSARTEN.find((a) => a.key === k) ?? TRAGWERKSARTEN[0];
}

/** Gehört zu dieser Art ein gegliederter Träger? */
export const hatTraeger = (w) => tragwerksart(w).traeger;

/* ===========================================================================
 * DAS QUERPROFIL TRÄGT MEHRERE TRAGWERKE
 *
 * Weisung des Auftraggebers vom 2. September: «Beachte, dass bei den QP zwei
 * oder mehrere Einzelmasten stehen können oder auch eine Jochreihe.» Auf
 * Rückfrage bestätigt: **Jochreihen haben gemeinsame Zwischenmasten.**
 *
 * DAMIT IST DIE TRAGWERKSART KEINE EIGENSCHAFT DER DATEI MEHR. Sie war es,
 * solange ein Dokument genau ein Tragwerk meinte; bei zwei Masten auf einem
 * Blatt kann eine Datei nicht EINE Art haben. Die Art gehört an das einzelne
 * Tragwerk — und damit in eine Liste.
 *
 * Der geteilte Mast ist der eigentliche Grund. In getrennten Dateien müsste
 * man seine Reaktionen von Hand übertragen: er trägt von beiden Seiten, und
 * keine der beiden Dateien wüsste davon.
 *
 * ================== WAS GILT FÜR DAS BLATT, WAS FÜR EIN TEIL? =============
 *
 * Ein Querprofil hat EINEN Radius, EINE Spannweite und EINE Windzone — sie
 * beschreiben den Ort, nicht das Bauteil. Was daraufsteht, hat eigene
 * Profile, eigene Masten, eigene Anbauteile.
 *
 *   Blatt      Verortung · Trasse · Wind- und Schneezone · Lastfälle und
 *              Beiwerte · Rechenmodelle · Ansicht · Masskette der Zeichnung
 *   Tragwerk   Art · Typ · Geometrie · Auflagerung · Masten · Profile ·
 *              Bindebleche · Anbauteile · eigene Lasten
 *
 * ================== WIE ES GESPEICHERT WIRD ===============================
 *
 * NICHT als neues Dateiformat. Der Eingabesatz bleibt flach, wie er ist —
 * er IST das erste Tragwerk, und die Blattangaben stehen daneben. Weitere
 * Tragwerke kommen in `weitere`. So liest jede alte Datei sich selbst als
 * Querprofil mit genau einem Tragwerk, ohne Wandlung und ohne Verlust.
 *
 * Das ist bewusst die unauffällige Lösung: ein umgestellter Eingabesatz
 * hätte Ablage, Ausleitung, Bericht und Prüfstand auf einmal angefasst.
 * =========================================================================== */

/**
 * Die Tragwerke eines Eingabesatzes, in der Reihenfolge des Blattes.
 *
 * Das erste ist der Satz selbst. Jedes weitere trägt nur, was es vom ersten
 * unterscheidet — die Blattangaben werden beim Lesen ergänzt, damit sie
 * nirgends doppelt stehen und auseinanderlaufen können.
 */
export function tragwerkeVon(w) {
  const erstes = { ...w, id: w?.twId ?? 'T1' };
  delete erstes.weitere;
  const rest = (w?.weitere ?? []).map((t, i) => ({
    ...blattAngaben(w), ...t, id: t.id ?? `T${i + 2}`,
  }));
  return [erstes, ...rest];
}

/** Wieviele Tragwerke stehen auf dem Blatt? */
export const anzahlTragwerke = (w) => 1 + (w?.weitere?.length ?? 0);

/**
 * DIE FELDER, DIE DEM BLATT GEHÖREN — nicht dem einzelnen Tragwerk.
 *
 * Genannt wird, was global ist; alles andere gehört dem Tragwerk. Diese
 * Richtung ist die sichere: ein vergessenes Feld bleibt dann beim Tragwerk,
 * wo es höchstens doppelt eingegeben wird. Andersherum vergessen hiesse,
 * dass zwei Tragwerke sich still eine Angabe teilen, die sie nicht teilen
 * dürfen — etwa das Eigengewicht eines Jochs.
 */
export const BLATT_FELDER = [
  // Verortung
  'linie', 'ortschaft', 'km',
  // Trasse: Radius und Spannweite gelten der Linie, nicht dem Mast
  'flSpannweite', 'trasseRadius', 'trasseWinkel',
  // Einwirkungen aus den Linienkarten
  'windKlasse', 'schneeKlasse', 'schneeAktiv',
  // Lastfälle, Beiwerte und Rechenmodelle: sie beschreiben, WIE gerechnet
  // wird. Zwei Tragwerke auf einem Blatt verschieden zu rechnen wäre ein
  // Fehler, kein Freiheitsgrad.
  'normensatz', 'gammaG', 'gammaQ', 'psi0',
  'torsionModell', 'torsionsverteilung', 'gurtaufteilung', 'knotenbereich',
  'endfeldZuschlag', 'schiefeBiegung', 'spannungsmodell', 'ebenenUeberlagerung',
  'mastPlastisch', 'knickenJoch', 'schraubenGrenze',
  // Ansicht
  'projektion', 'blickwinkel', 'tastenkuerzel', 'modellTransparenz',
  'modellSchrift', 'modellSchriftLast', 'modellSchriftMass',
  // Die Masskette beschreibt die ZEICHNUNG, nicht das Tragwerk. Sie wird
  // einmal abgeschrieben und gilt für alles, was auf dem Blatt steht.
  'masskette',
];

/** Nur die Blattangaben aus einem Eingabesatz. */
export function blattAngaben(w) {
  const o = {};
  BLATT_FELDER.forEach((k) => { if (w && k in w) o[k] = w[k]; });
  return o;
}

/**
 * Der tragwerkseigene Teil eines Eingabesatzes — ohne Blattangaben.
 *
 * Was hier steht, gehört dem Bauteil und wandert mit ihm; was fehlt, gilt
 * für das ganze Blatt und bleibt an genau einer Stelle stehen.
 */
export function tragwerkTeil(w) {
  const o = { ...w };
  delete o.weitere;
  BLATT_FELDER.forEach((k) => { delete o[k]; });
  return o;
}

/* ===========================================================================
 * DAS AKTIVE TRAGWERK STEHT VORN — und darum bleibt alles andere, wie es war.
 *
 * Der naheliegende Aufbau wäre eine Liste `tragwerke[]` und daneben ein
 * Zeiger `aktiv`. Er hätte JEDEN Zugriff im Programm angefasst: aus
 * `werte.typ` würde `werte.tragwerke[i].typ`, und das steht an
 * hundertfünfzig Stellen. Jede davon eine Gelegenheit, eine zu vergessen.
 *
 * Stattdessen IST der Eingabesatz das aktive Tragwerk. Die übrigen liegen
 * daneben in `weitere`. Beim Umschalten werden die beiden getauscht — der
 * bisherige Satz wandert in die Liste, der gewählte kommt nach vorn.
 *
 * Damit die Reihenfolge auf dem Blatt dabei nicht durcheinandergerät, trägt
 * jedes Tragwerk ein `pos`. Die Liste zeigt nach `pos`, nicht nach
 * Speicherlage: sonst spränge das angeklickte Tragwerk beim Anklicken an
 * eine andere Stelle, und man klickte dem eigenen Zeiger hinterher.
 * =========================================================================== */

/**
 * Wie ein Tragwerk in der Liste heisst.
 *
 * Die BAUTEILE benennen es, nicht eine Nummer: «J90 · 15.00 m» sagt, was
 * dasteht, «Tragwerk 2» sagt nur, dass es ein zweites gibt. Wer drei Masten
 * auf einem Blatt hat, unterscheidet sie am Profil, nicht am Zaehler.
 */
export function tragwerkName(t) {
  const art = tragwerksart(t);
  if (art.traeger && art.key === 'joch') {
    return [t?.typ ?? 'frei', t?.L ? `${Number(t.L).toFixed(2)} m` : null]
      .filter(Boolean).join(' · ');
  }
  const p = t?.mastProfil;
  const h = t?.mastLaenge > 0 ? t.mastLaenge : t?.mastH;
  return [p || art.label, h > 0 ? `${Number(h).toFixed(2)} m` : null]
    .filter(Boolean).join(' · ');
}

/**
 * DIE LAGE AUF DEM QUERPROFIL [m] — quer zum Gleis, in der Jochachse.
 *
 * Weisung vom 2. September: «man müsste also eine x-Koordinate eingeben
 * können für die einzelnen Masten».
 *
 * Sie leistet dreierlei auf einmal, und darum ist sie die richtige Grösse:
 *
 *   ORDNUNG    Die Liste zeigt die Tragwerke, wie sie auf dem Blatt stehen —
 *              von links nach rechts. Vorher zählte eine Einfügereihenfolge
 *              (`pos`), die nichts bedeutete.
 *   BILD       Eine gemeinsame Achse für alles, was auf dem Querprofil
 *              steht. Ohne sie wüsste die Ansicht nicht, wo das zweite
 *              Tragwerk hingehört.
 *   KOPPLUNG   Zwei Tragwerke, deren Masten an DERSELBEN Stelle stehen,
 *              teilen sich einen. Das ist der Zwischenmast der Jochreihe —
 *              erkennbar an einer Zahl statt an einer Absichtserklärung.
 *
 * Bezug ist der Nullpunkt des Querprofils; wo er liegt, entscheidet die
 * Zeichnung. Für ein einzelnes Tragwerk ist er gleichgültig, erst das
 * zweite gibt ihm Sinn.
 */
export const lageVon = (t) => Number(t?.xLage) || 0;

/**
 * Die Masten eines Tragwerks mit ihrer Lage auf dem Querprofil.
 *
 * Ein Joch hat zwei — bei `xLage` und `xLage + L`. Ein Einzelmast oder ein
 * Mast mit Tragausleger hat einen.
 */
export function mastLagen(t) {
  const x0 = lageVon(t);
  const art = tragwerksart(t);
  if (art.masten >= 2) return [x0, x0 + (Number(t?.L) || 0)];
  return [x0];
}

/** Alle Tragwerke in der Reihenfolge des Blattes, das aktive markiert. */
export function tragwerkeSortiert(w) {
  return tragwerkeVon(w)
    .map((t, i) => ({ ...t, aktiv: i === 0, pos: t.pos ?? i }))
    /*
     * NACH DER LAGE, DANN NACH DER EINFUEGEREIHENFOLGE.
     *
     * Solange niemand eine Lage eingetragen hat, stehen alle auf null - dann
     * entscheidet `pos`, und die Liste bleibt in der Reihenfolge, in der sie
     * entstanden ist. Sonst spraenge sie beim Anlegen jedes Tragwerks.
     */
    .sort((a, b) => (lageVon(a) - lageVon(b)) || (a.pos - b.pos));
}

/* ===========================================================================
 * DER MAST IST DAS GRUNDELEMENT
 *
 * Weisung vom 2. September: «Die Tragwerke würde ich noch verallgemeinern auf
 * Mast / Tragausleger. Ein Mast kann zum Beispiel ein Joch und einen
 * Tragausleger stützen.»
 *
 * BIS HIERHIN BRACHTE JEDES TRAGWERK SEINE MASTEN MIT. Ein Mast, an dem zwei
 * Tragwerke hängen, gab es dann zweimal — jeden mit der halben Last, und die
 * Zusammengehörigkeit war über die Koordinate GERATEN (geteilteMasten, mit
 * einer Toleranz von zehn Zentimetern). Als Verweis ist sie eindeutig, und
 * erst dann bekommt der Mast beide Lastanteile. Joch UND Tragausleger am
 * selben Masten wird überhaupt erst möglich.
 *
 * ================== WIE DER RECHENKERN DAVON UNBERUEHRT BLEIBT ============
 *
 * `mastSteifigkeit` liest `inp.mastProfil`, `inp.mastH`, `inp.mastLaenge`,
 * `inp.mastSteg` und ihre B-Varianten — flach, wie eh und je. Genau so
 * bekommt er sie weiterhin: die Angaben des Mastes werden beim Lesen in den
 * Satz PROJIZIERT (mastenProjizieren), und beim Ändern wieder in die Liste
 * zurückgeschrieben. Derselbe Weg wie beim aktiven Tragwerk, aus demselben
 * Grund: was hundertfach gelesen wird, soll nicht hundertfach umgeschrieben
 * werden müssen.
 *
 * ================== DIE MIGRATION IST DIE EIGENTLICHE ARBEIT ==============
 *
 * Alte Dateien haben die Mastangaben flach je Tragwerk. Daraus entsteht die
 * Liste — und dabei VERSCHMELZEN Masten an derselben Stelle zu einem. Was
 * vorher eine Vermutung war, wird beim Einlesen einmal entschieden und steht
 * danach als Verweis da.
 * =========================================================================== */

/** Die Angaben, die ein Mast trägt — flach im Satz, benannt in der Liste. */
/*
 * >>> DIE ANSCHLUSSHOEHE GEHOERT NICHT DEM MASTEN. <<<
 *
 * Sie stand hier, und das war falsch. Weisung vom 2. September auf Nachfrage:
 * zwei Joche koennen am selben Masten VERSCHIEDEN HOCH anschliessen - etwa
 * wenn die Gleise auf verschiedenen Koten liegen. H beschreibt dann die
 * VERBINDUNG Tragwerk-Mast, nicht den Masten; am Masten abgelegt gewaenne
 * eines der beiden Joche, und das andere rechnete still mit einer fremden
 * Hoehe. Die Drehfeder haengt daran (mastSteifigkeit), also waere es ein
 * Fehler, den man dem Ergebnis nicht ansieht.
 *
 * Am MASTEN bleibt, was ihm allein gehoert: Profil, Gesamtlaenge,
 * Stegrichtung, Lage, Windlast. Die Anschlusshoehe bleibt beim TRAGWERK.
 */
export const MASTFELDER = [
  { flach: 'mastProfil', flachB: 'mastProfilB', am: 'profil' },
  { flach: 'mastLaenge', flachB: 'mastLaengeB', am: 'laenge' },
  { flach: 'mastSteg', flachB: 'mastStegB', am: 'steg' },
  { flach: 'wMast', flachB: 'wMastB', am: 'wMast' },
];

/** Ein Mast aus den flachen Feldern eines Satzes, Ende A oder B. */
function mastAus(t, ende, x) {
  const zwei = ende === 'B' && t?.mastZwei === true;
  const o = { x };
  MASTFELDER.forEach((f) => {
    const v = zwei ? (t?.[f.flachB] ?? t?.[f.flach]) : t?.[f.flach];
    if (v !== undefined) o[f.am] = v;
  });
  return o;
}

/**
 * Die Masten des Blattes, mit ihrer Lage.
 *
 * Steht die Liste schon da, gilt sie. Sonst wird sie aus den flachen
 * Angaben der Tragwerke aufgebaut — Masten an derselben Stelle verschmelzen
 * dabei zu einem.
 */
/**
 * Die Masten, wie sie sich aus den Tragwerken ergeben.
 *
 * Lage und Zugehoerigkeit stehen hier NICHT zur Wahl: sie folgen aus dem
 * Tragwerk. Was ein Mast an eigenen Angaben traegt - Profil, Hoehe, Laenge,
 * Stegrichtung -, kommt beim Nachfuehren aus der gespeicherten Liste dazu.
 */
function mastenAbgeleitet(w, tol) {
  const liste = [];
  tragwerkeSortiert(w).forEach((t) => {
    if (t.mastVorhanden === false) return;
    const lagen = mastLagen(t);
    /*
     * >>> GEKOPPELT WIRD NUR, WER EINE LAGE TRAEGT. <<<
     *
     * Der Standardwert von x0 ist null. Ohne diese Regel stuenden ALLE
     * Tragwerke, an denen niemand die Lage eingetragen hat, bei null - und
     * ihre Masten verschmelzen zu einem einzigen. Genau das ist beim ersten
     * Lauf passiert: drei unabhaengige Tragwerke teilten sich einen Masten,
     * das Profil sprang beim Aendern auf einen fremden Wert, und der Kern
     * bekam ein leeres Profil.
     *
     * Eine FEHLENDE Angabe darf nichts koppeln. Wer zwei Tragwerke
     * zusammenhaengen will, sagt wo - dann steht die Zahl da, und dann gilt
     * sie. Ein ausdrueckliches x0 = 0 auf beiden Seiten koppelt sehr wohl.
     */
    const traegtLage = t.xLage !== undefined && t.xLage !== null;
    lagen.forEach((x, i) => {
      const ende = i === 0 ? 'A' : 'B';
      const da = traegtLage
        ? liste.find((m) => m.mitLage && Math.abs(m.x - x) <= tol) : null;
      if (da) {
        /*
         * ZWEI TRAGWERKE, EIN MAST. Der zuerst gefundene gilt; der zweite
         * Satz Angaben faellt weg. Das ist die richtige Seite des
         * Zweifels - zwei Masten an einer Stelle sind mit Sicherheit
         * derselbe, und welche Angabe genauer ist, weiss niemand.
         */
        if (!da.traegt.includes(t.id)) da.traegt.push(t.id);
        return;
      }
      liste.push({ id: `M${liste.length + 1}`, traegt: [t.id],
                   mitLage: traegtLage, ...mastAus(t, ende, x) });
    });
  });
  return liste;
}

/**
 * Die Masten des Blattes.
 *
 * >>> DIE LISTE WIRD NACHGEFUEHRT, NICHT FESTGESCHRIEBEN. <<<
 *
 * Sie ist eine ABLEITUNG aus den Tragwerken - wer die Lage eines Tragwerks
 * verschiebt oder ein Joch verlaengert, verschiebt damit seine Masten. Eine
 * einmal gespeicherte Liste veraltet dabei still: beim ersten Anlauf fehlte
 * nach dem Verschieben eines Jochs sein zweiter Mast in der Uebersicht, und
 * die Kachel zeigte weiter die alte Lage.
 *
 * Genommen wird deshalb immer die abgeleitete Liste; was der Anwender an
 * einem Masten EINGESTELLT hat - Profil, Hoehe, Laenge, Steg -, wandert aus
 * der gespeicherten Liste hinein. Zugeordnet ueber die Id, ersatzweise ueber
 * die Lage.
 */
export function mastenVon(w, tol = 0.1) {
  const soll = mastenAbgeleitet(w, tol);
  const alt = Array.isArray(w?.masten) ? w.masten : null;
  if (!alt || !alt.length) return soll;
  return soll.map((m) => {
    const q = alt.find((a) => a.id === m.id)
           ?? alt.find((a) => Math.abs((a.x ?? NaN) - m.x) <= tol);
    if (!q) return m;
    const o = { ...m };
    MASTFELDER.forEach((f) => {
      // Ein leeres Profil ist keine Angabe - siehe setzeMastAngabe.
      const v = q[f.am];
      if (v === undefined || v === null) return;
      if (f.am === 'profil' && !String(v).trim()) return;
      o[f.am] = v;
    });
    return o;
  });
}

/** Ein Mast nach seiner Id. */
export const mastNach = (w, id) => mastenVon(w).find((m) => m.id === id) ?? null;

/**
 * DIE ANSCHLUSSHOEHE EINES TRAGWERKS AN SEINEM MASTEN [m].
 *
 * Dieselbe Regel wie in `mastSteifigkeit`: `mastHB` gilt nur, wenn ein
 * ZWEITER Mast eingeschaltet ist. Sonst gilt fuer beide Enden dieselbe
 * Hoehe - `mastHB` traegt dann einen Standardwert, der nie gemeint war.
 *
 * Sie steht hier, weil sie an zwei Stellen gebraucht wird: im Rechenkern
 * fuer die Drehfeder, in der Ausleitung fuer den Hoehenversatz der
 * Tragwerke. Beim ersten Anlauf war sie dort nachgebaut - und der Nachbau
 * uebersah `mastZwei`. Der Versatz kam damit auf 1.00 m statt 0.50, und
 * derselbe Mast stand zweimal da, einen Meter gegeneinander versetzt.
 */
export function anschlusshoehe(t, ende = 'A') {
  const zwei = ende === 'B' && t?.mastZwei === true;
  const h = zwei ? (t?.mastHB ?? t?.mastH) : t?.mastH;
  return Number(h) || 0;
}

/**
 * Die Masten EINES Tragwerks, in der Reihenfolge A, B.
 *
 * Verweist das Tragwerk auf Ids, gelten sie. Sonst entscheidet die Lage —
 * so liest sich eine Datei ohne Verweise genauso wie eine mit.
 */
export function mastenFuer(w, t, tol = 0.1) {
  const alle = mastenVon(w);
  const nach = (id, x) => (id && alle.find((m) => m.id === id))
    || alle.find((m) => Math.abs(m.x - x) <= tol) || null;
  const lagen = mastLagen(t);
  const a = nach(t?.mastA, lagen[0]);
  const b = lagen.length > 1 ? nach(t?.mastB, lagen[1]) : null;
  return [a, b];
}

/**
 * Die Mastangaben eines Tragwerks in seinen Satz schreiben.
 *
 * Damit sieht der Rechenkern, was er immer gesehen hat: mastProfil, mastH,
 * mastLaenge, mastSteg — und für das zweite Ende dieselben mit B.
 */
export function mastenProjizieren(satz, w, t) {
  const [a, b] = mastenFuer(w, t);
  if (!a) return satz;
  MASTFELDER.forEach((f) => {
    if (a[f.am] !== undefined) satz[f.flach] = a[f.am];
  });
  if (b) {
    /*
     * >>> `mastZwei` HEISST «ENDE B WEICHT AB», nicht «es gibt zwei». <<<
     *
     * Ein Joch hat immer zwei Masten - das Feld blind zu setzen war ein
     * Fehler, und ein teurer: `mastHB` traegt einen Standardwert (7.50 m),
     * der nur gilt, wenn der Anwender das Haekchen setzt. Ploetzlich
     * wirksam, sass der Mastfuss des einen Jochs einen halben Meter ueber
     * dem des anderen - und im Blattmodell stand derselbe Mast zweimal.
     *
     * Gesetzt wird es deshalb nur, wenn die beiden Masten sich WIRKLICH
     * unterscheiden - oder wenn der Anwender es selbst gesetzt hat.
     */
    const abweichend = MASTFELDER.some(
      (f) => a[f.am] !== undefined && b[f.am] !== undefined
             && a[f.am] !== b[f.am]);
    if (abweichend || satz.mastZwei === true) {
      satz.mastZwei = true;
      MASTFELDER.forEach((f) => {
        if (b[f.am] !== undefined) satz[f.flachB] = b[f.am];
      });
    }
  }
  return satz;
}

/**
 * Eine Mastangabe ändern — sie gilt dem MASTEN, nicht dem Tragwerk.
 *
 * Das ist der Gewinn und die Falle zugleich: wer das Profil des
 * Zwischenmastes ändert, ändert es für BEIDE Tragwerke, die daran hängen.
 * Genau so soll es sein — es ist ein Mast. Die Liste zeigt deshalb an, wer
 * alles daran hängt.
 */
export function setzeMastAngabe(w, ende, flachKey, wert) {
  const feld = MASTFELDER.find((f) => f.flach === flachKey || f.flachB === flachKey);
  if (!feld) return w;
  /*
   * EIN LEERES PROFIL IST KEINE ANGABE.
   *
   * Ein Auswahlfeld, dessen Wert nicht in der Liste steht, meldet einen
   * leeren String. Blind uebernommen steht danach ein Mast ohne Profil in
   * der Liste, und der Kern bricht mit «Unbekanntes Mastprofil: » ab - eine
   * Meldung, die nicht sagt, wo der leere Wert herkam. Genau so ist es beim
   * ersten Lauf passiert.
   */
  if (feld.am === 'profil' && !String(wert ?? '').trim()) return w;
  const t = tragwerkeVon(w)[0];
  const [a, b] = mastenFuer(w, t);
  const ziel = (ende === 'B' ? b : a) ?? a;
  if (!ziel) return w;
  const masten = mastenVon(w).map(
    (m) => (m.id === ziel.id ? { ...m, [feld.am]: wert } : m));
  return { ...w, masten };
}

/**
 * Masten, die sich zwei Tragwerke teilen.
 *
 * Gleiche Stelle heisst: naeher als 10 cm beieinander. Zwei Masten, die auf
 * dem Querprofil einen Dezimeter auseinanderstehen, gibt es nicht — das
 * waere ein Eingabefehler und kein Tragwerk.
 *
 * @returns {Array<{x:number, ids:string[]}>}
 */
export function geteilteMasten(w) {
  /*
   * AUS DER LISTE, NICHT AUS DEM ABSTAND.
   *
   * Bis zum Mastenumbau wurde hier verglichen: naeher als zehn Zentimeter
   * galt als derselbe Mast. Das war eine Vermutung, und sie musste bei
   * jedem Aufruf neu angestellt werden. Jetzt steht es in der Liste - ein
   * Mast weiss, wer an ihm haengt. Die Vermutung ist an EINE Stelle
   * gewandert: in die Migration, wo sie einmal entschieden wird.
   */
  return mastenVon(w)
    .filter((m) => (m.traegt?.length ?? 0) > 1)
    .map((m) => ({ x: m.x, ids: [...m.traegt], id: m.id }));
}

/**
 * Ein anderes Tragwerk aktiv setzen.
 *
 * Gibt den Satz unverändert zurück, wenn es schon aktiv ist oder die Id
 * nicht vorkommt — der Aufrufer muss nicht prüfen, was er umschaltet.
 */
export function tauscheAktives(w, id) {
  const rest = w?.weitere ?? [];
  const i = rest.findIndex((t) => t.id === id);
  if (i < 0) return w;
  const bisher = { ...tragwerkTeil(w), id: w.twId ?? 'T1', pos: w.pos ?? 0 };
  /*
   * ERSETZEN, NICHT UEBERLAGERN.
   *
   * `{ ...w, ...gewaehltes }` sieht richtig aus und ist es nicht: was im
   * gewaehlten Tragwerk FEHLT, bleibt vom bisherigen stehen. Beim ersten
   * Versuch trug ein Joch danach die Tragwerksart des Einzelmastes, weil der
   * alte Satz das Feld gar nicht kannte - zwei Tragwerke vermischt, und dem
   * Ergebnis sieht man es nicht an.
   *
   * Genommen wird deshalb NUR das Blatt und das gewaehlte Tragwerk. Alles
   * andere gehoert dem, das gerade weggelegt wurde.
   */
  const neu = { ...blattAngaben(w), ...rest[i], twId: rest[i].id ?? `T${i + 2}` };
  neu.weitere = rest.map((t, j) => (j === i ? bisher : t));
  return neu;
}

/** Ein weiteres Tragwerk auf das Blatt setzen. Es wird gleich das aktive. */
export function tragwerkHinzu(w, art, vorlage = {}) {
  const rest = w?.weitere ?? [];
  const alle = tragwerkeVon(w);
  const nr = alle.reduce((m, t) => Math.max(m, Number(String(t.id).slice(1)) || 0), 0);
  const bisher = { ...tragwerkTeil(w), id: w.twId ?? 'T1', pos: w.pos ?? 0 };
  const pos = alle.reduce((m, t) => Math.max(m, t.pos ?? 0), 0) + 1;
  return { ...w, ...vorlage, tragwerksart: art,
           twId: `T${nr + 1}`, pos,
           weitere: [...rest, bisher] };
}

/**
 * Ein Tragwerk vom Blatt nehmen.
 *
 * Das LETZTE lässt sich nicht entfernen: ein Querprofil ohne Tragwerk ist
 * kein Zustand, in den man geraten können soll — die halbe Maske hätte
 * nichts mehr, worüber sie spricht.
 */
export function tragwerkWeg(w, id) {
  const rest = w?.weitere ?? [];
  if (!rest.length) return w;
  const eigen = w.twId ?? 'T1';
  if (id !== eigen) {
    return { ...w, weitere: rest.filter((t) => (t.id ?? '') !== id) };
  }
  // Das aktive geht: das erste der übrigen rückt nach.
  // Auch hier ERSETZEN statt ueberlagern - siehe tauscheAktives.
  const [naechstes, ...uebrig] = rest;
  return { ...blattAngaben(w), ...naechstes,
           twId: naechstes.id ?? 'T2', weitere: uebrig };
}

/**
 * Ein Tragwerk als vollständiger Eingabesatz, wie ihn der Rechenkern kennt.
 *
 * Der Kern rechnet weiterhin EIN Tragwerk. Er muss von der Liste nichts
 * wissen; er bekommt ein flaches Objekt, genau wie bisher.
 */
export function tragwerkSatz(w, id = null) {
  const alle = tragwerkeVon(w);
  const t = (id && alle.find((x) => x.id === id)) || alle[0];
  const satz = { ...blattAngaben(w), ...t };
  delete satz.weitere;
  // Der Kern liest die Mastangaben flach - er bekommt sie flach.
  return mastenProjizieren(satz, w, t);
}

/**
 * Der Eingabesatz, wie ihn der Rechenkern sehen soll.
 *
 * Heute unterscheidet er sich vom Satz selbst nur in den Mastangaben; sie
 * kommen aus der Liste und ueberschreiben, was flach dasteht. Steht keine
 * Liste da, aendert sich nichts - alte Dateien laufen unveraendert.
 */
export function rechensatz(w) {
  const t = tragwerkeVon(w)[0];
  return mastenProjizieren({ ...w }, w, t);
}

/**
 * Die Verortung als eine Zeile — leer, wenn nichts eingetragen ist.
 *
 * Eine Stelle, viele Leser: Überschrift, Bericht, Excel, AxisVM-Bezeichnung
 * und Dateiname. Was fehlt, fällt weg; drei leere Trennzeichen sagen nichts.
 *
 * @param {object} w Eingabe oder Modell
 * @param {string} trenner
 */
export function verortung(w, trenner = ' · ') {
  // REIHENFOLGE LINIE - ORT - KM (Weisung). Vom Groben zum Feinen: die Linie
  // sagt, wo im Netz, der Ort, wo an der Linie, der Kilometer, wo genau.
  return [
    w?.linie ? `Linie ${String(w.linie).trim()}` : null,
    w?.ortschaft ? String(w.ortschaft).trim() : null,
    w?.km ? `KM ${String(w.km).trim()}` : null,
  ].filter(Boolean).join(trenner);
}

/** Dieselben Angaben für einen Dateinamen: ohne Leerzeichen und Sonderzeichen. */
export function verortungKurz(w) {
  const rein = (v) => String(v ?? '').trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '');
  return [w?.linie ? `L${rein(w.linie)}` : null,
          rein(w?.ortschaft) || null,
          w?.km ? `KM${rein(w.km)}` : null].filter(Boolean).join('_');
}

/**
 * DIE MASSKETTE DER QUERPROFIL-ZEICHNUNG.
 *
 * Über dem Joch steht auf MANCHEN Zeichnungen eine Kette von Massen in
 * Zentimetern ab dem linken Jochende - beim Schulungsbeispiel
 * «0 15 209 474 735 885 983 1185 1200». Das sind die Stellen, an denen
 * wirklich etwas hängt: genau die Zahl, die jede Baugruppe als Lage `x`
 * braucht.
 *
 * Sie wird deshalb nicht abgegriffen, sondern abgeschrieben - einmal, als
 * Zeile. Danach fängt die Eingabe darauf: wer 2.07 einstellt, bekommt 2.09,
 * weil dort das Bauteil sitzt und nicht daneben.
 *
 * SIE STEHT NICHT AUF JEDEM BLATT. Damit ist sie eine Beigabe und kein Weg:
 * wo sie fehlt, wird auf der Zeichnung gemessen. Eine leere Eingabe ist der
 * Normalfall und keine Beanstandung - ohne Kette fängt nichts, und nichts
 * beschwert sich.
 *
 * GELESEN WIRD GROSSZÜGIG. Abgeschrieben wird von Hand, und dabei entsteht
 * jede Schreibweise: Leerzeichen, Komma, Strichpunkt, Zeilenumbruch. Getrennt
 * wird an allem, was keine Zahl ist.
 *
 * @param {string} text Masse in cm, wie auf der Zeichnung
 * @param {number} L Jochlänge [m] - zum Gegenlesen
 * @returns {{werte:number[], hinweis:string|null}} werte in METERN, aufsteigend
 */
export function massketteLesen(text, L = 0) {
  const roh = String(text ?? '')
    .split(/[^0-9.,]+/).filter(Boolean)
    .map((t) => parseFloat(t.replace(',', '.')))
    .filter((v) => Number.isFinite(v) && v >= 0);
  const werte = [...new Set(roh.map((v) => Math.round(v * 10) / 1000))]
    .sort((a, b) => a - b);
  if (!werte.length) return { werte: [], hinweis: null };
  /*
   * DAS LETZTE MASS IST DIE JOCHLÄNGE - und damit die Gegenprobe.
   *
   * Stimmt es nicht, ist entweder die Kette aus einer anderen Zeichnung, die
   * Jochlänge falsch eingestellt, oder es wurden Millimeter abgeschrieben
   * statt Zentimeter. Alle drei würden sonst still danebenliegen.
   */
  const ende = werte[werte.length - 1];
  const hinweis = L > 0 && Math.abs(ende - L) > 0.02
    ? `Die Kette endet bei ${ende.toFixed(2)} m, das Joch ist ${L.toFixed(2)} m `
      + 'lang. Sind es Zentimeter, und gehört die Kette zu diesem Joch?'
    : null;
  return { werte, hinweis };
}

/**
 * Auf die nächste Stelle der Masskette fangen.
 *
 * Die Grenze ist nie grösser als die halbe Lücke zum Nachbarn: bei zwei eng
 * benachbarten Massen - 15 und 209 sind weit, aber es gibt engere - soll
 * nicht das eine das andere überdecken. Wer zwischen zwei Stellen zielt,
 * bekommt die nähere, und wer weit daneben liegt, behaelt seinen Wert.
 *
 * @returns {number} der gefangene oder der ursprüngliche Wert
 */
export function fangeAufMasskette(x, kette, grenze = 0.20) {
  if (!Array.isArray(kette) || !kette.length || !Number.isFinite(x)) return x;
  let beste = null, abstand = Infinity;
  kette.forEach((k, i) => {
    const d = Math.abs(x - k);
    if (d >= abstand) return;
    // Halbe Lücke zum näheren Nachbarn, höchstens die Grenze.
    const links = i > 0 ? k - kette[i - 1] : Infinity;
    const rechts = i < kette.length - 1 ? kette[i + 1] - k : Infinity;
    const eigen = Math.min(grenze, Math.min(links, rechts) / 2);
    if (d <= eigen) { beste = k; abstand = d; }
  });
  return beste === null ? x : beste;
}
