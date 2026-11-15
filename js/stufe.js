/**
 * stufe.js - VIEWER UND SCHULUNG (15. November).
 *
 * Weisung, im Wortlaut: «aus der app sollte eine light version erstellt
 * werden, die für schulungszwecken dienen kann oder als viewer, wo die
 * auftraggeber, die nicht experten sind in statiktehmen die modelle und
 * geringfügige anpassungen vornehmen können.» Auf meine Einschätzung (ein
 * Modus derselben App statt ein Neubau - eine Rechnung, keine zweite
 * Wahrheit) und den Vorschlag der Freigabeliste: «beides» und «ja so bauen».
 * Zur Verteilung: «ich wäre für eine separate datei die nur das nötigste
 * enthält. eine für viewer und eine für die schulung. man kann da auch denk
 * fokus auf das abbilden und einfache eingabe setzen.»
 *
 * DIE STUFE IST FEST IN DER DATEI. `build_html.py --stufe viewer|schulung`
 * schreibt dieses Modul beim Buendeln um (`STUFE_FEST`); in der Modulversion
 * laesst sie sich zum Pruefen ueber `?stufe=viewer` waehlen. Eine leichte
 * Datei kennt `?stufe=voll` nicht - einschraenken darf die Adresse,
 * erweitern nicht.
 *
 * >>> EINE LISTE DESSEN, WAS ERLAUBT IST. <<< Ein Feld, das hier nicht
 * steht, ist in den leichten Stufen ausgeblendet. So kommt ein neues Feld
 * der Fachperson nie aus Versehen beim Laien an.
 *
 * GESPERRT HEISST NICHT ZURUECKGESETZT. Was ausgeblendet ist, rechnet mit
 * dem Wert weiter, den der Stand traegt (gesetzt von der Fachperson).
 */

// Wird von build_html.py ersetzt; null = Modulversion, Stufe aus der Adresse.
const STUFE_FEST = null;

function ausAdresse() {
  try {
    const s = new URLSearchParams(globalThis.location?.search ?? '').get('stufe');
    return s === 'viewer' || s === 'schulung' ? s : null;
  } catch { return null; }
}

/** 'voll' | 'viewer' | 'schulung' */
export const STUFE = STUFE_FEST ?? ausAdresse() ?? 'voll';
export const LEICHT = STUFE !== 'voll';
/** Einfache Darstellung (ein Urteil mit Balken, kurze Sprache): die Schulung. */
export const EINFACH = STUFE === 'schulung';

export const STUFEN_TITEL = {
  voll: 'Vollversion', viewer: 'Viewer', schulung: 'Schulung',
};

/** Der Vermerk auf Bildschirm und Bericht. */
export const VERMERK = 'Vorabprüfung - kein geprüfter statischer Nachweis';

/* ------------------------------------------------------------------------
 * FELDER DER MASKE
 * --------------------------------------------------------------------- */

// Im Viewer: ansehen und kleine Anpassungen (Weisung «geringfügige anpassungen»).
const VIEWER_BEARBEITEN = [
  'tragwerksart',          // Tragwerk wählen; Anlegen/Löschen sperrt das Stilblatt
  'mastX', 'mastLaenge',
  'anbauteile', 'bestandesschutz',
];
const VIEWER_SEHEN = [
  'xLage', 'typ', 'abfangTyp', 'L', 'stuetzweite', 'auslegerSeite',
  'laengsverankerung', 'laengsverankerungX', 'kragA', 'kragB',
  'mastVorhanden', 'mastNummer', 'mastProfil', 'mastSteg', 'mastH',
  'mastFundament', 'mastGelaende',
  'ankerTyp', 'ankerH', 'ankerA', 'ankerD', 'ankerWinkel', 'ankerRichtung',
  'ankerSeite', 'ankerBef',
  'ubAn', 'ubArt', 'ubHoehe', 'ubStuetze', 'ubSteg', 'ubRiegel', 'ubRichtung',
  'ubSpannweite', 'ubLage', 'ubTorsion', 'ubLagerung',
  'flSpannweite', 'trasseRadius', 'trasseWinkel',
  'windKlasse', 'windReduktion', 'rueckhaltAn', 'rueckhaltProzent', 'rueckhaltMax',
  'schneeAktiv', 'schneeKlasse',
  'bestandProzent', 'bestandBezug',
];

// In der Schulung: Tragwerke selbst aufbauen («die teilnehmer werden die
// tragwerke selbst aufbauen») und die Einwirkungen variieren.
const SCHULUNG_BEARBEITEN = [
  ...VIEWER_BEARBEITEN.filter((k) => k !== 'bestandesschutz'),
  'linie', 'ortschaft', 'km', 'projektNr', 'bearbeiter', 'datum',
  'xLage', 'typ', 'abfangTyp', 'L', 'auslegerSeite', 'laengsverankerung',
  'mastVorhanden', 'mastProfil', 'mastSteg', 'mastH',
  'ankerTyp', 'ankerH', 'ankerA', 'ankerRichtung', 'ankerSeite',
  'flSpannweite', 'trasseRadius',
  'windKlasse', 'schneeAktiv', 'schneeKlasse',
];
/*
 * >>> IN DER SCHULUNG STEHT NUR, WAS MAN ÄNDERN KANN (15. November). <<<
 * Weisung: «es sollte nur das nötigste dargestellt und beschrieben werden»
 * («Ja, Paket 1 bauen»). Gesperrte Felder erklären einem Laien nichts -
 * die Liste «sehen» ist deshalb leer; Katalogmasse, Gelände, Fundamenttyp,
 * Perrondach, Fussversatz, Fahrdrahthöhe, Mastnummer, Rückhaltekraft,
 * Wind × 0.74, Bestandesschutz und Havarie fallen aus der Maske.
 */
const SCHULUNG_SEHEN = [];

const FELDER = {
  viewer: { bearbeiten: new Set(VIEWER_BEARBEITEN), sehen: new Set(VIEWER_SEHEN) },
  schulung: { bearbeiten: new Set(SCHULUNG_BEARBEITEN), sehen: new Set(SCHULUNG_SEHEN) },
};

/**
 * Recht an einem Feld der Maske: 'bearbeiten' | 'sehen' | 'aus'.
 * In der Vollversion immer 'bearbeiten' (das Schema entscheidet wie bisher).
 */
export function feldRecht(key, stufe = STUFE) {
  if (stufe === 'voll') return 'bearbeiten';
  const f = FELDER[stufe];
  if (!f) return 'aus';
  if (f.bearbeiten.has(key)) return 'bearbeiten';
  if (f.sehen.has(key)) return 'sehen';
  return 'aus';
}

/*
 * >>> EINFACHE SPRACHE IN DER SCHULUNG (15. November). <<< Weisung: «der
 * user der nicht vertraut ist mit statikbegriffen überfordert». Je Feld eine
 * Bezeichnung ohne Fachkürzel und höchstens eine kurze Zeile dazu; die
 * langen Erklärtexte der Fachperson fallen weg. Rechnung und Schlüssel
 * bleiben dieselben.
 */
export const EINFACH_TEXT = {
  xLage: { label: 'Lage auf dem Querprofil', hinweis: 'Wo das Tragwerk quer zum Gleis steht.' },
  typ: { label: 'Jochtyp', hinweis: 'Grössere Nummer = kräftigeres Joch.' },
  abfangTyp: { label: 'Typ des Abfangjochs', hinweis: 'Grössere Nummer = kräftiger.' },
  L: { label: 'Länge', hinweis: 'Gesamtlänge des Trägers.' },
  auslegerSeite: { label: 'Ausleger zeigt nach', hinweis: null },
  laengsverankerung: { label: 'Abspannung in Gleisrichtung', hinweis: 'Hält den Ausleger gegen Verdrehen.' },
  mastH: { label: 'Höhe über dem Boden', hinweis: 'Wo der Träger am Masten angeschlossen ist.' },
  mastVorhanden: { label: 'Mit Masten', hinweis: null },
  mastX: { label: 'Lage des Masten', hinweis: null },
  mastProfil: { label: 'Mastprofil', hinweis: 'Grössere Nummer = kräftigerer Mast.' },
  mastSteg: { label: 'Ausrichtung des Masten', hinweis: null },
  mastLaenge: { label: 'Mastlänge', hinweis: null },
  ankerTyp: { label: 'Abspannung des Masten', hinweis: 'Seil oder Stütze schräg zum Boden - entlastet den Masten.' },
  ankerH: { label: 'Höhe am Masten', hinweis: null },
  ankerA: { label: 'Abstand am Boden', hinweis: null },
  ankerRichtung: { label: 'Richtung der Abspannung', hinweis: null },
  ankerSeite: { label: 'Seite', hinweis: null },
  flSpannweite: { label: 'Abstand zum nächsten Masten (Gleisrichtung)', hinweis: 'Je grösser, desto mehr Leitung hängt am Tragwerk.' },
  trasseRadius: { label: 'Kurvenradius des Gleises', hinweis: 'Leer oder sehr gross = gerades Gleis.' },
  windKlasse: { label: 'Windzone', hinweis: 'Höhere Zone = stärkerer Wind.' },
  schneeAktiv: { label: 'Mit Schnee rechnen', hinweis: null },
  schneeKlasse: { label: 'Schneezone', hinweis: null },
};

/** Feld in der einfachen Sprache - oder unverändert. */
export function feldEinfach(f, einfach = EINFACH) {
  if (!einfach || !f) return f;
  const t = EINFACH_TEXT[f.key];
  return t ? { ...f, ...t } : { ...f, hinweis: null };
}

/* ------------------------------------------------------------------------
 * GRUPPEN DER MASKE (eigene Teile wie Havarie und Lastfälle, deren Inhalt
 * keine Feldliste ist)
 * --------------------------------------------------------------------- */
const GRUPPEN_AUS = {
  // Auflager: Endbedingung, Federn, Lagerung - Rechenmodell der Fachperson.
  viewer: new Set(['ort', 'aufl', 'blech', 'staendig', 'havarie']),
  schulung: new Set(['aufl', 'staendig', 'prof', 'blech', 'stueck', 'bestand', 'havarie', 'komb']),
};

export function gruppeErlaubt(gid, stufe = STUFE) {
  if (stufe === 'voll') return true;
  return !(GRUPPEN_AUS[stufe]?.has(gid));
}

/* ------------------------------------------------------------------------
 * AUSWERTUNG, PLOTS, MENUES
 * --------------------------------------------------------------------- */
const AUSWERTUNG = {
  viewer: new Set(['uebersicht', 'auflager']),
  schulung: new Set(['uebersicht']),
};
export function auswertungErlaubt(tabId, stufe = STUFE) {
  if (stufe === 'voll') return true;
  return AUSWERTUNG[stufe]?.has(tabId) ?? false;
}

// Viewer: Ausnutzung und Verformung (Fokus aufs Abbilden). Schulung: alle.
const PLOTS = {
  viewer: new Set(['eta', 'w', 'etaGzg', 'positionen', 'neutral']),
  schulung: new Set(['eta', 'w', 'neutral']),
};
export function plotErlaubt(key, stufe = STUFE) {
  if (stufe === 'voll' || !PLOTS[stufe]) return true;
  return PLOTS[stufe].has(key);
}

/*
 * Exportmenü: Kennung je Eintrag (siehe exportMenue in app.js).
 * Ausleitungen nach AxisVM, SAF, DXF, PyNite und die Gegenrechnung gibt es
 * in keiner leichten Stufe - sie gehören der Fachperson.
 */
const EXPORT = {
  viewer: new Set(['bericht', 'reaktionen', 'anschluss', 'bestand', 'drucken']),
  schulung: new Set(['bericht', 'reaktionen', 'drucken']),
};
export function exportErlaubt(id, stufe = STUFE) {
  if (stufe === 'voll') return true;
  return EXPORT[stufe]?.has(id) ?? false;
}

/** Optionen-Reiter: in den leichten Stufen nur die Darstellung. */
export function optionenThemaErlaubt(key, stufe = STUFE) {
  if (stufe === 'voll') return true;
  return key === 'ansicht';
}

/* ------------------------------------------------------------------------
 * HERKUNFT IM STAND
 *
 * Ein Stand, der in einer leichten Stufe verändert wurde, trägt einen
 * Merker. Öffnet die Fachperson ihn in der Vollversion, sieht sie es.
 * --------------------------------------------------------------------- */
export function herkunftMarkieren(werte, stufe = STUFE) {
  if (stufe === 'voll' || !werte) return werte;
  if (werte.geaendertIn === stufe) return werte;
  return { ...werte, geaendertIn: stufe };
}

export function herkunftHinweis(werte) {
  const s = werte?.geaendertIn;
  if (!s || !STUFEN_TITEL[s] || s === 'voll') return null;
  return `Dieser Stand wurde in der Fassung «${STUFEN_TITEL[s]}» verändert `
    + '(nicht von einer Fachperson geprüft).';
}
