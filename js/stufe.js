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
  ...VIEWER_BEARBEITEN,
  'linie', 'ortschaft', 'km', 'projektNr', 'bearbeiter', 'datum',
  'xLage', 'typ', 'abfangTyp', 'L', 'stuetzweite', 'auslegerSeite',
  'laengsverankerung', 'laengsverankerungX', 'kragA', 'kragB',
  'mastVorhanden', 'mastNummer', 'mastProfil', 'mastGitterOhne', 'mastSteg',
  'mastH', 'mastHZwei', 'mastHB', 'mastFuss', 'fdHoehe',
  'mastFundament', 'mastGelaende',
  'ankerTyp', 'ankerH', 'ankerA', 'ankerD', 'ankerWinkel', 'ankerRichtung',
  'ankerSeite', 'ankerBef',
  'flSpannweite', 'trasseRadius', 'trasseWinkel', 'grundwerteFragen',
  'windKlasse', 'windReduktion', 'schneeAktiv', 'schneeKlasse',
];
const SCHULUNG_SEHEN = [
  'masskette', 'a1', 'jd', 'jbbOG', 'jbbUG',
  'auslegerB', 'auslegerWinkel', 'auslegerSpreizung',
  'ubAn', 'ubArt', 'ubHoehe', 'ubStuetze', 'ubSteg', 'ubRiegel', 'ubRichtung',
  'ubSpannweite', 'ubLage', 'ubTorsion', 'ubLagerung',
  'profOG', 'profUG', 'stahl', 'stahlMast',
  'endblechWieZwischen', 'h2', 't2', 'h1', 't1',
  'rueckhaltAn', 'rueckhaltProzent', 'rueckhaltMax',
  'bestandProzent', 'bestandBezug',
];

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

/* ------------------------------------------------------------------------
 * GRUPPEN DER MASKE (eigene Teile wie Havarie und Lastfälle, deren Inhalt
 * keine Feldliste ist)
 * --------------------------------------------------------------------- */
const GRUPPEN_AUS = {
  // Auflager: Endbedingung, Federn, Lagerung - Rechenmodell der Fachperson.
  viewer: new Set(['ort', 'aufl', 'blech', 'staendig', 'havarie']),
  schulung: new Set(['aufl', 'staendig']),
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
  schulung: new Set(['uebersicht', 'verlauf', 'auflager']),
};
export function auswertungErlaubt(tabId, stufe = STUFE) {
  if (stufe === 'voll') return true;
  return AUSWERTUNG[stufe]?.has(tabId) ?? false;
}

// Viewer: Ausnutzung und Verformung (Fokus aufs Abbilden). Schulung: alle.
const PLOTS = {
  viewer: new Set(['eta', 'w', 'etaGzg', 'positionen', 'neutral']),
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
  schulung: new Set(['bericht', 'reaktionen', 'anschluss', 'bestand', 'excel', 'drucken']),
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
