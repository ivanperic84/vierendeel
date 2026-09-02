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

/** Alle Tragwerke in der Reihenfolge des Blattes, das aktive markiert. */
export function tragwerkeSortiert(w) {
  return tragwerkeVon(w)
    .map((t, i) => ({ ...t, aktiv: i === 0, pos: t.pos ?? i }))
    .sort((a, b) => a.pos - b.pos);
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
  return satz;
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
