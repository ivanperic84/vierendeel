/**
 * app.js
 * ---------------------------------------------------------------------------
 * VERDRAHTUNG. Hält Zustand und Ereignisse, ruft Rechenkern und Ansichten.
 * Enthält selbst weder Rechnung noch Geometrie noch Layout-Regeln.
 * ---------------------------------------------------------------------------
 */

import { STAND } from './version.js';
import { getProfil, getStahl } from './data.profiles.js';
import { ladeDatenbank, getTragjoch, tragjoche, pruefeDatenbank,
         datenbank, datenbankStand, laengenbereich,
         setzeDatenbank } from './data.tragjoche.js';
import { berechne, modell, modellEinzelmast,
         vergleichMassvarianten, vergleichKombinationen,
         schnittstellen, auflagerBlatt } from './core.vierendeel.js';
import { konstruktionsChecks, fluchtChecks, hinweise, urteilKonstruktion, bauteilUrteil,
         klassifizierung, urteilFusszeile, mitBauteilen } from './core.checks.js';
import { spannweiteImSortiment, NORMENSAETZE, erkenneNormensatz,
         lastfaelle, ekVonWindklasse } from './core.lasten.js';
import { diagramme, abfangDiagramme, ankerDiagramm,
         mastDiagramme, verdrahteMessung } from './render.charts.js';
import { erzeugeSzene, szeneVerschieben, szenenVereinen,
         Modellansicht, ANSICHTEN, MODI,
         LASTARTEN } from './render.3d.js';
import { exportiere } from './export.bericht.js';
import { nachweisbericht, berichtVorgabe, UMFAENGE, BILDER,
         BERICHT_ARTEN } from './export.nachweisbericht.js';
import { exportiereAxisvm, exportiereDxf, exportiereJson,
         KNOTENMODELLE, AUFLAGERMODELLE, auflagerModelleFuer,
         auflagerAngebot, auflagerVorgabe } from './export.axisvm.js';
import { exportiereAbfangJson } from './export.axisvm.abfang.js';
import { abfangSzene } from './render.abfang.js';
import { exportierePynite } from './export.pynite.js';
import { APP_NAME, verortung, fangeAufMasskette,
         tauscheAktives, tragwerkAendern, tragwerkHinzu, tragwerkWeg,
         tragwerksart,
         tragwerkTeil,
         MASTFELDER, setzeMastAngabe, setzeMastAnker, rechensatz,
         tragwerkeSortiert, tragwerkSatz, lageVon,
         tragwerkeVon, mastenFuer,
         blattNachLokal, lokalNachBlatt, tragwerkBeiX,
         anbauteileFuer, setzeAnbauteileAn, freieLage, freieLaenge, versteckt,
         jochZuEinzelmasten,
         mastenVon, mastName, mastNameAmEnde, tragwerkName, tragwerkPos, aufRaster,
         TRAGWERKSARTEN,
         mastZeichenplan,
         gewaehlterMast }
  from './core.constants.js';
import { passeTraegerAn, hatTraeger } from './core.anbauteile.js';
// STATISCH, nicht per import(): der Buendler folgt nur festen Importen,
// und in der eigenstaendigen Datei gibt es keine Module mehr, die sich
// zur Laufzeit nachladen liessen.
import { verkleinere, bildAusEreignis, kalibriere, kalibriereFrei,
         bezuegeFuer, erkennungsWelt, ausrichten, ausrichtPunkte,
         vorlaeufigeLage, bildNachWelt } from './bild.zeichnung.js';
import { erkenneTragwerk } from './bild.erkennung.js';
import { handbuchHtml, handbuchDatei } from './doku.handbuch.js';
import { standardwerte, typUebernehmen, setzeTypOptionen,
         setzeGrenzen, FELDER } from './ui.schema.js';
import { uebertrageTokens, iconKnopf, esc, icon, abschnitt,
         MASS, FARBEN as farben } from './design.js';
import { ladeAnbauteile, neuesAnbauteil, vorlagen, getVorlage, alsVorlage, haengeTiefe,
         normalisiereAnbauteil,
         setzeEigeneVorlagen, entdoppelteVorlagen,
         erzeugeGleislasten, neuesModul,
         baugruppeSumme, anbauteilDB,
         setzeAnbauteilDB } from './data.anbauteile.js';
import { ladeFlBauteile, flBauteile, getFlBauteil, flDB,
         setzeFlDB } from './data.fl.js';
// Das Abfangjoch-Sortiment. Sein Fehlen ist kein Fehler - wer kein
// Abfangjoch auf dem Blatt hat, braucht es nicht.
import { abfangAuswertung, abfangFyd } from './core.abfangjoch.js';
// Der Mastnachweis - beim Abfangjoch mit dessen eigenen Auflagerkraeften.
import { mastNachweise, mastNachweiseHuelle, mastSchnitt } from './core.mast.js';
import { ankerAuswertung, ankerAmAbfangjoch, abfangVarianten, abfangModell,
         ankerKnickenSicher } from './core.anker.js';
import { ladeAbfangjoche, abfangjoche, abfangDbDa,
         abfangLaengenbereich, abfangLaengen,
         getAbfangjoch, abfangDB, setzeAbfangDB } from './data.abfangjoche.js';
/*
 * DAS ANKERSORTIMENT - Zug-/Druckstuetzen und Seilanker am Masten. Wie das
 * Abfangjoch-Sortiment ist es keine Voraussetzung: wer keinen Anker hat,
 * braucht es nicht.
 */
import { ladeAnker, ankerDbDa, ankerGeometrie, ankerNachweis,
         ankerKnicken,
         ankerTypen, ankerTraegtDruck,
         ANKER_BEFESTIGUNGEN, ankerDB, setzeAnkerDB } from './data.anker.js';
import { ladeNormen, normenDbDa, normen, setzeNormen } from './data.normen.js';
import { zeichneDaten, ersteAnsicht, alsTabellen, zeichneAbgleich,
         blaetter as datenBlaetter } from './ui.daten.js';
import { arbeitsmappe, herunterladen, STIL } from './export.xlsx.js';
import { leseDatei, abgleich, eingelesen, eingelesenSpeichern,
         eingelesenVerwerfen, eingelesenAnwenden, alsDatei } from './data.einlesen.js';
import { pruefeAlle as blechregelPruefen } from './core.blechregel.js';
import { datenBereitstellen, paketAnwenden, paketAus, pruefePaket,
         speicherLeeren, ausSpeicher, PAKET_FORMAT } from './data.paket.js';
import { mastWind, mastprofile, STEGRICHTUNGEN,
         ladeMasten, mastenDB, setzeMastenDB } from './data.masten.js';
import { mastImModell, mastLaengeVorgabe, einzelmastLaenge } from './core.auflager.js';
import { ablenkwinkel, radiusAusWinkel, istGerade,
         R_GERADE } from './core.trasse.js';
import { pwaEinrichten, kannInstallieren, installiere, alsProgramm,
         dateiEmpfang, startWunsch, netzZustand } from './pwa.js';
import { verlauf } from './verlauf.js';
import * as store from './store.js';
import * as ui from './ui.js';

const SPEICHER = 'tragjoch-stand-v2';
// Der zuletzt eingetragene Bearbeiter - Vorschlag fuer das naechste Tragwerk.
const BEARBEITER = 'tragjoch-bearbeiter';
/*
 * DIE FASSUNG SAGT, WELCHER STAND LAEUFT (Durchsicht vom 18. September,
 * Punkt A5). «v2.0» stand unveraendert ueber Hunderten von Commits. Datum
 * und Kurzabdruck schreibt der Bündler (js/version.js); gleiche Fassung
 * heisst gleicher Code, bei jedem und auf GitHub Pages.
 */
const VERSION = `v2.0 · ${STAND.datum.split('-').reverse().join('.')} · ${STAND.fassung.slice(0, 7)}`;

let werte = null;
let letzte = null;
let ansicht = null;
let station = null;
let projekt = { id: null, name: 'Neues Tragjoch', projekt: '' };
let tabEingabe = 'system';
let tabAuswertung = 'uebersicht';
let thema = 'dunkel';
// Welche Einwirkungskombination im Modell dargestellt wird.
// 'umhuellend' = ungünstigster Wert je Station über alle Kombinationen.
let anzeigeKombi = 'umhuellend';
// Strukturkennung der Eingabemaske; siehe ui.maskenSignatur
let maskeSig = null;
// Welches Diagramm gerade das Modellfenster belegt (null = das 3D-Modell)
let buehne = null;
// Zuletzt angefahrenes Anbauteil, damit der Fokus nicht dauernd zoomt
let zuletztGezoomt = null;

// --- Zustand ----------------------------------------------------------------

/** Frischer Zustand mit einem Beispiel-Anbauteil, damit das Modell nicht leer ist. */
/**
 * >>> EIN FRISCHER STAND - IN DER ART, DIE GEBRAUCHT WIRD. <<<
 *
 * Weisung vom 4. September: «eine template für tragjoch und Abfangjoch
 * erstellen, momentan muss man das bestehende tragjoch löschen und ein
 * abfangjoch erstellen.»
 *
 * Vorher gab es genau eine Vorlage, das Tragjoch. Wer ein Abfangjoch wollte,
 * legte eines daneben und löschte das Tragjoch wieder — zwei Handgriffe für
 * das, was der erste hätte tun sollen.
 *
 * Gebaut wird über DIESELBEN Wege wie ein zweites Tragwerk auf dem Blatt:
 * `tragwerkHinzu` legt es an, `tragwerkWeg` räumt das Tragjoch ab. Ein
 * zweiter Weg wäre einer, der die Sonderfälle des ersten nicht kennt — den
 * Typwechsel beim Abfangjoch zum Beispiel.
 *
 * @param {string} art  Schlüssel aus TRAGWERKSARTEN, Vorgabe 'joch'
 */
function frisch(art = 'joch') {
  const std = { ...standardwerte(), bearbeiten: false };
  let w = typUebernehmen(std, getTragjoch(std.typ));
  w.anbauteile = [{ ...neuesAnbauteil('hs-fahrdraht', 10), name: 'Fahrleitung Gleis 1' }];
  if (art && art !== 'joch') {
    /*
     * DIE ID DES TRAGJOCHS ZUERST MERKEN. `tragwerkHinzu` macht das NEUE
     * Tragwerk zum Hauptsatz und schiebt das bisherige in `weitere` - `twId`
     * zeigt danach auf das neue. Wer erst hinterher liest, loescht genau
     * das, was er anlegen wollte: das Ergebnis war ein Tragjoch mit dem
     * Titel «Neues Abfangjoch».
     */
    const alt = w.twId ?? 'T1';
    w = tragwerkHinzu(w, art, artVorgabe(art, w));
    w = tragwerkWeg(w, alt);
    // Ein Einzelmast bekommt das Beispielteil des Jochs nicht - es hinge
    // sonst mit Hoehe 0 unter dem Fundament -, sondern seine eigenen.
    if (!TRAGWERKSARTEN.find((a) => a.key === art)?.traeger) {
      w = setzeAnbauteileAn(w, einzelmastTeile(rechensatz(w)));
    }
  }
  return w;
}

/**
 * DIE BEISPIELTEILE EINES NEUEN EINZELMASTS.
 *
 * Weisung vom 18. September: «die anbauteile sind entsprechend dem
 * einzelmast sinnvoll zu setzen beim template.»
 *
 * Am Masten ist nur zulaessig, was nicht selbst traegt (siehe
 * `vorlagenFuer`): keine Haengestuetze, kein Jochaufsatz. Was an einem
 * freistehenden Masten typischerweise haengt, ist eine Traverse mit
 * Zusatzleiter oben und ein Rueckleiter darunter. Beide stehen auf Hoehen
 * relativ zur Mastlaenge, damit sie auch an einem kurzen Masten am Masten
 * bleiben - und nie unter der Fundamentkote.
 */
function einzelmastTeile(satz) {
  const L = einzelmastLaenge(satz) || 8.5;
  const teil = (id, name, h) => {
    try {
      return { ...neuesAnbauteil(id, 0), name, ort: 'mastA',
               hMast: Math.max(0.5, Math.round(h * 20) / 20) };
    } catch { return null; }   // Vorlage fehlt im Datenpaket
  };
  return [teil('leiter-traverse', 'Traverse mit Zusatzleiter', L - 0.5),
          teil('leiter-rl', 'Rückleiter', L - 2.0)].filter(Boolean);
}

/**
 * Was ein neu angelegtes Tragwerk seiner Art mitbringen muss.
 *
 * Beim Abfangjoch ist das sein Typ und eine Länge, die dieser Typ auch
 * führt — sonst stünde «J90» im Satz und der erste Sortimentseintrag in der
 * Liste. Steht auch in `aendern('tragwerkNeu')`; die Funktion hält beide
 * Wege auf demselben Stand.
 */
function artVorgabe(art, w) {
  const v = {};
  if (art !== 'abfangjoch' || !abfangDbDa()) return v;
  const erst = abfangjoche()[0];
  v.abfangTyp = erst.typ;
  const b = abfangLaengenbereich(erst);
  v.L = Math.min(Math.max(Number(w?.L) || b.min, b.min), b.max);
  return v;
}

function laden() {
  const std = { ...standardwerte(), bearbeiten: false };
  try {
    const roh = localStorage.getItem(SPEICHER);
    if (!roh) return frisch();
    const d = JSON.parse(roh);
    if (d.projekt) projekt = d.projekt;
    if (d.thema) thema = d.thema;
    /*
     * >>> DER WIEDERHERGESTELLTE STAND SAGT ES (17. September). <<<
     *
     * Nach BlockCalc («Letzter Stand wiederhergestellt»): der Arbeitsstand
     * kam schon immer zurueck, nur wortlos - und mit ihm nicht, ob er der
     * Ablage entspricht. Beides wird jetzt mitgefuehrt und beim Start
     * gemeldet.
     */
    wiederhergestellt = { ts: d.ts ?? null, gesichert: d.gesichert ?? null };
    const w = { ...std, ...(d.werte ?? d) };
    // Stände aus der Zeit vor den Anbauteilen kennen das Feld nicht.
    // Statt mit einem leeren Joch zu starten, wird der Beispielzustand geladen.
    // Nur ein Tragwerk mit Traeger - ein leerer Einzelmast bekaeme sonst
    // die Haengestuetze des Jochs an den Fuss.
    if (!Array.isArray(w.anbauteile)
        || (!w.anbauteile.length
            && TRAGWERKSARTEN.find((a) => a.key === (w.tragwerksart ?? 'joch'))?.traeger)) {
      w.anbauteile = frisch().anbauteile;
    }
    delete w.lastfaelle;
    // Stände vor der Lastfall-Umstellung: die Leiteinwirkung und die drei
    // getrennten ψ₀ sind ersatzlos entfallen. Der Schalter für die
    // Wirkungsweise der Umlenkung ebenso - die Richtung steckt jetzt im
    // Vorzeichen des Radius (siehe core.trasse.js).
    ['leit', 'psi0P', 'psi0w', 'psi0S', 'trasseWirkung'].forEach((k) => delete w[k]);
    // Anbauteile in das neue Modell heben: Lastblöcke statt Einzelfelder,
    // Koordinaten statt e_v/e_x.
    w.anbauteile = (w.anbauteile ?? []).map(normalisiereAnbauteil);
    if (!w.lastfallAnpassung || typeof w.lastfallAnpassung !== 'object') {
      w.lastfallAnpassung = {};
    }
    // Angepasste Lastfälle aus der Zeit der EINEN Windgruppe: der Beiwert
    // "Wind" galt für beide Richtungen und wird auf beide übertragen.
    Object.values(w.lastfallAnpassung).forEach((b) => {
      if (b && b.Wind !== undefined) {
        if (b.WindX === undefined) b.WindX = b.Wind;
        if (b.WindY === undefined) b.WindY = b.Wind;
        delete b.Wind;
      }
    });
    if (!Array.isArray(w.lastfaelleEigen)) w.lastfaelleEigen = [];
    w.lastfaelleEigen.forEach((l) => {
      const b = l?.beiwerte;
      if (b && b.Wind !== undefined) {
        if (b.WindX === undefined) b.WindX = b.Wind;
        if (b.WindY === undefined) b.WindY = b.Wind;
        delete b.Wind;
      }
    });
    // Der gewählte Lastfall kann es nach der Umstellung nicht mehr geben.
    if (['wind', 'schnee'].includes(w.lastfall)) delete w.lastfall;
    return w;
  } catch {
    return frisch();
  }
}

/*
 * SICHTBARER SPEICHERZUSTAND (uebernommen aus BlockCalc, 1. September).
 *
 * Die Frage des Auftraggebers - «mir ist nicht klar wie gespeichert wird,
 * schon bei der Eingabe oder muss man auf den Knopf druecken?» - ist keine
 * Wissensluecke, sondern ein Mangel der Oberflaeche. Beides stimmt naemlich:
 *
 *   ENTWURF   `speichern()` legt bei JEDER Eingabe den Arbeitsstand ab. Er
 *             ueberlebt das Schliessen des Reiters, ist aber EIN Stand und
 *             ueberschreibt sich fortlaufend.
 *   ABLAGE    Ein benannter Eintrag entsteht erst auf Knopfdruck.
 *
 * Sichtbar war davon nichts. BlockCalc loest es mit drei Zeilen Zustand
 * (_savedSnap / _dirty / _updateDirtyUI): der Knopf traegt eine Markierung,
 * sobald der Stand vom zuletzt gesicherten abweicht, und sein Titel sagt,
 * was ein Druck bewirken wuerde. Genau das steht hier.
 *
 * Die Signatur laesst aus, was den INHALT nicht beruehrt - Bearbeiten-Sperren
 * und die Wahl des Ansichtsfensters gehoeren nicht dazu. Sonst meldete das
 * blosse Aufklappen eines Feldes eine ungesicherte Aenderung.
 */
const FLUECHTIG = ['bearbeiten', 'lastenBearbeiten', 'schnittAktiv',
                   'schnittOrientierung', 'schnittIndex'];

function standSignatur() {
  const w = { ...werte };
  FLUECHTIG.forEach((k) => delete w[k]);
  try { return JSON.stringify(w); } catch { return null; }
}

let gesicherteSignatur = null;
let ungesichert = false;

/** Der jetzige Stand gilt als gesichert - nach Sichern, Laden oder Neubeginn. */
function markiereGesichert() {
  gesicherteSignatur = standSignatur();
  ungesichert = false;
  zeigeSpeicherstand();
}

/** Zuletzt im Knopf gezeigte Verortung - damit sie nachzieht, ohne dass der
 *  Knopf bei jedem Tastendruck neu aufgebaut wird. */
let gezeigteVerortung = null;

/** Nach jeder Aenderung: weicht der Stand vom zuletzt gesicherten ab? */
function pruefeUngesichert() {
  /*
   * ZWEI GRUENDE, DEN KNOPF NEU ZU ZEICHNEN.
   *
   * Der Speicherzustand ist der eine. Der andere ist die VERORTUNG: sie steht
   * seit dem 1. September im Knopf, und wer sie nachtraegt, will sie sofort
   * dort sehen. Am Zustand haengt sie nicht - der steht laengst auf
   * «ungesichert», waehrend Linie und Kilometer noch getippt werden.
   */
  const ort = verortung(werte);
  if (ort !== gezeigteVerortung) { gezeigteVerortung = ort; zeigeSpeicherstand(); }
  if (gesicherteSignatur === null) return;
  const jetzt = standSignatur() !== gesicherteSignatur;
  if (jetzt !== ungesichert) { ungesichert = jetzt; zeigeSpeicherstand(); }
}

/** Zeitpunkt des letzten Entwurfs, kurz - im Titel des Knopfes. */
function entwurfZeit() {
  if (!entwurfTs) return null;
  const d = new Date(entwurfTs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Zeitpunkt des zuletzt abgelegten Entwurfs. */
let entwurfTs = null;

/** Was beim Start aus dem Arbeitsstand zurueckkam - fuer die Meldung. */
let wiederhergestellt = null;

function speichern() {
  try {
    entwurfTs = Date.now();
    localStorage.setItem(SPEICHER,
      JSON.stringify({ werte, projekt, thema, ts: entwurfTs,
                       gesichert: gesicherteSignatur }));
  } catch { /* Ablage nicht verfügbar, kein Grund abzubrechen */ }
}

const jochVonTyp = () =>
  werte.typ && werte.typ !== 'frei' ? getTragjoch(werte.typ) : null;

// --- Hauptzyklus ------------------------------------------------------------

/*
 * RUECKGAENGIG UND WIEDERHERSTELLEN.
 *
 * Der Verlauf haengt an EINER Stelle: neuRechnen(). Jede Aenderung ersetzt
 * `werte` und rechnet neu - wer hier aufzeichnet, bekommt jede Aenderung,
 * ohne dass eine einzelne Eingabe etwas davon wissen muesste. Die Regeln
 * (Verschmelzen gleicher Felder, Verfallen des Vorwaerts) stehen in
 * verlauf.js, damit der Pruefstand sie ohne Browser nachrechnen kann.
 */
const hist = verlauf();

function rueckgaengig() {
  const w = hist.zurueck();
  if (!w) return;
  hist.ruhend(() => { werte = w; neuRechnen(); });
  baueKopf();
}

function wiederherstellen() {
  const w = hist.vor();
  if (!w) return;
  hist.ruhend(() => { werte = w; neuRechnen(); });
  baueKopf();
}

function neuRechnen(neuZeichnen = true) {
  // VOR der Rechnung: der Stand, der gleich gilt, gehoert in den Verlauf.
  if (hist.melde(werte)) baueKopf();
  const joch = jochVonTyp();
  /*
   * DIE SCHIEBERGRENZEN KOMMEN AUS DEM SORTIMENT DES TRAGWERKS (Weisung,
   * 4. September). Beim Abfangjoch ist das ein anderer Bereich je Typ -
   * A160 5.50 bis 12.50, A360 17.50 bis 28.50.
   */
  let abfangB = null;
  if (tragwerksart(werte).key === 'abfangjoch' && abfangDbDa()) {
    try { abfangB = abfangLaengenbereich(getAbfangjoch(werte.abfangTyp)); }
    catch { abfangB = null; }
  }
  setzeGrenzen(joch, werte.L, abfangB);

  // Die Eingabemaske zeigt Ergebnisse mit an (Querschnittsklassen, Lastfälle).
  // Sie wird deshalb NACH der Rechnung aufgebaut - sonst hinkte sie einer
  // Änderung immer einen Durchgang hinterher.
  const zeichneEingabe = () => {
    if (!neuZeichnen) return;
    /*
     * DIE ZUSATZSTUECKE DER MASKE GEHOEREN ZUM JOCH - bis auf eines.
     *
     * Hebelarme, Querschnittsklassen, Blechuebersicht und Stueckliste
     * sprechen von Gurten und Blechen; beim Einzelmast gibt es sie nicht,
     * und ihre Gruppen stehen ohnehin nicht in der Maske. Die Lastfallmatrix
     * gilt jedem Tragwerk.
     *
     * Gebunden ist das an `letzte.mitJoch` und nicht daran, dass zufaellig
     * `kl` null ist: der erste Anlauf las die Klassifizierung blind und
     * brach mit «Cannot read properties of null (reading teile)» ab.
     */
    const extras = letzte
      ? { ...(letzte.mitJoch ? {
            geo: ui.hebelarmUebersicht(letzte.anzeige ?? letzte.erg),

            blech: ui.blechUebersichtHtml(letzte.erg),
            stueck: ui.stuecklisteHtml(letzte.anzeige),
          } : {}),
          // Die Masten stehen bei JEDER Tragwerksart - sie sind das
          // Grundelement, nicht ein Zubehoer des Jochs.
          mast: ui.mastenUebersichtHtml(werte),
          /*
           * >>> DIE PROFILTAFEL GILT JEDEM TRAGWERK. <<<
           *
           * Weisung vom 11. September: «alle ergänzten bauteile unter
           * profile nachführen, so wie bei den tragjochen.» Gurte, Masten
           * und Anker mit ihren Querschnittswerten - die Tafel, die man
           * beim Nachrechnen daneben legt.
           *
           * Sie steht deshalb AUSSERHALB von `mitJoch`, gemeinsam mit der
           * Klassenmarke: die gibt es nur, wo Winkelgurte klassifiziert
           * wurden, die Tafel immer. `anzeige` statt `erg`, damit das
           * Abfangjoch seine eigenen Gurte zeigt.
           */
          prof: (letzte.kl ? ui.qskMarke(letzte.kl) : '')
              + ui.profilUebersicht(letzte.anzeige ?? letzte.erg, werte),
          komb: ui.kombiMatrixHtml(letzte.kombi, erkenneNormensatz(werte)) }
      : {};
    const sig = ui.maskenSignatur(werte, tabEingabe);
    // Solange sich die Struktur nicht ändert, bleiben die Eingabefelder
    // stehen. Nur so übersteht das Feld unter dem Cursor eine Neuberechnung.
    if (sig === maskeSig && ui.el('maske').children.length) {
      ui.aktualisiereMaske(ui.el('maske'), werte, extras);
      verdrahteExtras();
      return;
    }
    maskeSig = sig;
    ui.zeichneTabs(ui.el('tabs'), ui.EINGABE_TABS, tabEingabe, (t) => {
      tabEingabe = t; neuRechnen();
    });
    ui.zeichneMaske(ui.el('maske'), werte, tabEingabe, aendern, setzeAnbauteile, extras);
    verdrahteExtras();
  };

  try {
    const profOG = getProfil(werte.profOG);
    const profUG = getProfil(werte.profUG);
    const stahl = getStahl(werte.stahl);

    // Windlast auf den Mast aus der Lasttabelle nachführen, solange sie nicht
    // von Hand gesetzt ist.
    // Sie haengt am MASTEN, nicht an der Endbedingung: seit dem 28. August
    // sind das zwei Angaben (mastImModell in core.auflager.js).
    // Steht ein Mast im Modell, faengt er Wind - das ist keine Einstellung.
    // Nachgefuehrt wird, solange die Lastwerte nicht von Hand freigegeben
    // sind; dann gilt, was dort steht (dasselbe Verhalten wie bei g_k, w_k
    // und s_k des Jochs).
    if (mastImModell(werte) && werte.lastenBearbeiten !== true) {
      const ek = ekVonWindklasse(werte.windKlasse);
      const w = mastWind(werte.mastProfil, ek, werte.mastSteg);
      if (Number.isFinite(w)) werte.wMast = w;
      // Ein anderes Profil am Ende B faengt anderen Wind.
      const wB = werte.mastZwei
        ? mastWind(werte.mastProfilB, ek, werte.mastStegB) : null;
      werte.wMastB = Number.isFinite(wB) ? wB : null;
    }

    // Der Kern bekommt die Mastangaben aus der Liste, nicht aus dem Satz.
    const erg = berechne(rechensatz(werte), profOG, profUG, stahl, joch);

    /*
     * >>> DAS ABFANGJOCH RECHNET SEINEN EIGENEN NACHWEIS. <<<
     *
     * Weisung vom 4. September: «nachweise beim Abfangjoch aktualisieren.»
     *
     * `berechne` oben ist der Kern des TRAGJOCHS - vier Winkelgurte, zwei
     * Blechebenen, Torsion aus dem Anbauteilversatz. Er läuft weiter, weil
     * das Blatt, die Masken und die Verläufe an seiner Gestalt hängen; seine
     * NACHWEISE gelten für ein Abfangjoch aber nicht, und sie standen bis
     * hierher trotzdem rechts in der Spalte.
     *
     * `abfangAuswertung` rechnet daneben, was diesem Tragwerk gehört: das
     * Kräftepaar aus dem Moment in der waagrechten Rahmenebene, die örtliche
     * Biegung des Gurtes zwischen zwei Blechen, die Bindebleche als Riegel.
     * Die Beiwerte sind DIESELBEN wie beim Tragjoch — γ_G, γ_Q und ψ₀ aus
     * der Eingabe; ein zweiter Satz wäre ein zweiter Ort, an dem eine
     * Festlegung steht.
     *
     * Die Lasten des Jochs kommen aus der Sortimentstabelle (`erg.modell.char`
     * spiegelt sie in die Felder), die der Anbauteile aus dem Bauteilkatalog
     * über `abfangAnbauLasten` — dieselbe Quelle, aus der die Ausleitung und
     * die Kraftpfeile im Bild kommen.
     */
    if (tragwerksart(werte).key === 'abfangjoch' && abfangDbDa()) {
      const satzA = tragwerkSatz(werte);
      const a2 = getAbfangjoch(werte.abfangTyp);
      const qpEk = { EK1: '0.9', EK2: '1.1', EK3: '1.3' }[satzA.ek] ?? '1.1';
      const sKl = String(satzA.schneeKlasse ?? '1.25');
      try {
        erg.abfang = abfangAuswertung({
          typ: werte.abfangTyp, jt: Number(werte.L),
          // kg/m -> kN/m; die Sortimentstabelle führt das Gewicht in kg.
          gk: (a2?.gewicht ?? 0) * 9.81 / 1000,
          wk: a2?.wind?.[qpEk] ?? 0,
          sk: satzA.schneeAktiv === false ? 0 : (a2?.schnee?.[sKl] ?? 0),
          anbauteile: satzA.anbauteile ?? [],
          gammaG: werte.gammaG, gammaQ: werte.gammaQ, psi0: werte.psi0,
          /*
           * f_yd AUS STAHL UND γ_M0 (Weisung, 9. September). Hier stand
           * `stahl.fyd` - das Feld gibt es am Stahlobjekt nicht, und die
           * Auswertung fiel still auf 21.8 kN/cm² zurueck.
           */
          fyd: abfangFyd(stahl, werte.gammaM0),
          ek: satzA.ek, L_FL: satzA.L_FL, R: satzA.R,
          knotenbereich: 'anschnitt',
        });
      } catch (e2) {
        // Ein Typ ohne erfasste Blechlage ist nicht rechenbar - dann steht
        // dort nichts, statt einer Zahl aus dem falschen Modell.
        erg.abfang = null;
        console.warn('Abfangjoch-Auswertung:', e2?.message ?? e2);
      }
      /*
       * >>> UND DER MAST BEKOMMT SEINE KRAEFTE. <<<
       *
       * Weisung vom 10. September: «den mastnachweis beim abfangjoch fertig
       * machen.»
       *
       * `berechne` hat den Masten oben schon gerechnet - mit den Reaktionen
       * des TRAGJOCH-Ersatzbalkens, denn etwas anderes kennt es nicht. Am
       * Abfangjoch gelten sie nicht; deshalb stand dort bisher gar keine
       * Mastkachel.
       *
       * Jetzt liegen die eigenen Auflagerkraefte vor, und der Nachweis wird
       * mit ihnen NEU gebildet. Nicht ergaenzt, sondern ersetzt: zwei
       * Mastnachweise nebeneinander waeren einer zuviel.
       */
      if (erg.abfang?.auflager) {
        const optM = { plastisch: werte.mastPlastisch === true,
                       knickBeiwert: werte.knickBeiwert };
        /*
         * UEBER ALLE FAELLE, der Wind in beiden Richtungen (Weisung vom
         * 17. September: «die masten und anker nicht vergessen»). Vorher
         * bekam der Mast nur den einen Fall mit der groessten Kopfkraft -
         * und einen Mastwind aus dem Tragjoch-Lastfall dazu.
         */
        erg.mast = mastNachweiseHuelle(abfangVarianten(erg.abfang.auflager)
          .map(({ fa, fb }) => ({
            fall: fa.key,
            erg: mastNachweise(abfangModell(erg.modell, erg.abfang.auflager,
                                            fa, fb, false), optM),
          })));
      }
    }

    /*
     * WAS KEIN JOCH HAT, BEKOMMT KEINE JOCHAUSWERTUNG.
     *
     * Fuenf Schritte folgen sonst: die Tabellenlasten des Jochs, der
     * Massvariantenvergleich, die Kombinationen, die Konstruktions- und die
     * Fluchtkontrolle. Jeder einzelne greift auf Gurte, Bleche oder die
     * Stuetzweite zu - beim Einzelmast gibt es davon nichts. Der erste, der
     * es versuchte, brach mit «Cannot read properties of undefined (reading
     * gk)» ab, und die ganze Auswertung stand still.
     *
     * Sie werden nicht abgesichert, sondern UEBERSPRUNGEN. Ein
     * `char?.gk ?? 0` haette eine Null in ein Feld geschrieben, das dem
     * Einzelmasten gar nicht gehoert.
     */
    const mitJoch = tragwerksart(werte).key !== 'einzelmast';

    // Die Tabellenlasten in die gesperrten Felder spiegeln, damit man sie
    // immer sieht - auch wenn gerade die Tabelle gilt.
    if (mitJoch && !werte.lastenBearbeiten) {
      const c = erg.modell.char;
      werte.gkManuell = Math.round(c.gk * 1000) / 1000;
      werte.wkManuell = Math.round(c.wk * 1000) / 1000;
      werte.skManuell = Math.round(c.sk * 1000) / 1000;
    }

    /*
     * >>> AUCH DIE VERGLEICHE RECHNEN MIT DEM RECHENSATZ. <<<
     *
     * Hier stand `werte` - der ROHE Satz, ohne die Projektion aus der
     * Mastenliste. Der Hauptdurchgang oben nimmt `rechensatz(werte)`, die
     * Vergleiche nahmen ihn nicht, und die ANGEZEIGTE Umhuellende kommt aus
     * ihnen (`kombi.huellkurve`). Aufgefallen am 3. September an einer
     * Kleinigkeit: die Mastkacheln der Auswertung hiessen «M1» und «Ende B»,
     * waehrend das gerechnete Tragwerk auf M2 und M3 steht - die Namen
     * wandern mit der Projektion, und die fehlte hier.
     *
     * Die Zahlen stimmten bisher, weil `aendern` die flachen Mastfelder nach
     * jeder Aenderung zurueckschreibt. Darauf zu bauen hiesse, sich auf
     * einen Nebeneffekt zu verlassen: jede Angabe, die NUR in der Liste
     * steht, fehlte hier still.
     */
    const rs = rechensatz(werte);
    const vergleich = mitJoch
      ? vergleichMassvarianten(rs, profOG, profUG, stahl, joch) : null;
    /*
     * KEINE KOMBINATIONSTABELLE OHNE JOCH - aber die Form bleibt.
     *
     * `vergleichKombinationen` rechnet jede Lastfallkombination am Traeger
     * durch. Beim Einzelmast gibt es das nicht; die Lastfallwahl ueber dem
     * Modell liest trotzdem `kombi.lastfaelle`, und eine fehlende Liste
     * brach sie mit «Cannot read properties of undefined (reading map)» ab.
     * Leer heisst hier: nur die Umhuellende steht zur Wahl.
     */
    /*
     * SEIT DEM 17. SEPTEMBER AUCH BEIM EINZELMASTEN. Er wurde bis dahin in
     * EINEM Lastfall gerechnet - dem ersten Nachweisfall, Wind +y leitend.
     * Der Wind in Gegenrichtung fehlte, und mit einem Seilanker, der dort
     * durchhaengt, stand der Mast zu guenstig da (Meldung: «der wind in die
     * gegenrichtung wird nicht angesetzt»). `huellkurve` bildet fuer ihn den
     * Mastnachweis ueber alle Faelle.
     */
    const kombi = vergleichKombinationen(rs, profOG, profUG, stahl, joch);
    /*
     * >>> DER ANKERNACHWEIS RECHNET CHARAKTERISTISCH. <<<
     *
     * Weisung vom 10. September: «nimm variante 3 und die charakteristische
     * kraft.»
     *
     * Das Bemessungsblatt der Zug- und Druckstuetzen fuehrt ZULAESSIGE
     * Kraefte - eine Groesse aus dem Verfahren der zulaessigen Spannungen.
     * Ihr gegenueber steht die charakteristische Einwirkung, nicht der
     * Bemessungswert. Der Hauptdurchgang `erg` rechnet mit Beiwerten; die
     * charakteristischen Lastfaelle laufen daneben mit, und aus ihnen kommt
     * die Zahl.
     */
    // Auch der Einzelmast traegt einen Anker - und bekommt seinen Nachweis.
    erg.anker = erg.abfang?.auflager
      ? ankerAmAbfangjoch(erg.modell, erg.abfang.auflager, werte)
      : ankerAuswertung(kombi, werte);
    const checks = mitJoch ? konstruktionsChecks(erg.modell, erg.abfang) : [];
    // Die Fluchtkontrolle läuft weiter mit, wird aber nicht mehr angezeigt:
    // sie erklärt einen Versatz im Zehntelmillimeterbereich, der beim Arbeiten
    // nur stört. Sie gehört ins Handbuch, sobald es eines gibt. Der Wert bleibt
    // in der Excel-Ausleitung erhalten.
    const flucht = mitJoch ? fluchtChecks(erg.modell) : { warnungen: [] };
    const hinw = hinweise(erg.modell);
    /*
     * >>> WENN ES DEN STAB SO NICHT GIBT, STEHT ES IN DER LISTE. <<<
     *
     * Weisung vom 11. September: «wenn die maximallänge überschritten ist,
     * dann warnung angeben.» In der Kachel steht sie seither rot; hier
     * steht sie ein zweites Mal, weil die Hinweisliste das ist, was in den
     * Bericht geht - und dort fällt eine Farbe nicht auf.
     *
     * ANGEHAENGT UND NICHT IN `hinweise`: die Funktion sieht das MODELL, der
     * Ankernachweis haengt aber an `erg.anker`. Ihn dort hineinzureichen
     * hiesse, das Modell um ein Ergebnis zu erweitern - und dann stuende
     * dieselbe Zahl an zwei Orten.
     */
    ['A', 'B'].forEach((ende) => {
      const nw = erg.anker?.[ende]?.nachweis;
      if (nw?.lieferbar === false && nw.warnung) {
        hinw.push(`Zuganker/Druckstütze — ${nw.warnung}`
          + (nw.eta === null ? ''
            : ' Der Nachweis steht trotzdem da, weil die zulässige Kraft der'
              + ' BEFESTIGUNG gilt und nicht der Länge; das Bauteil selbst ist'
              + ' damit nicht belegt.'));
      }
    });
    const urteil = urteilKonstruktion(checks, werte.nachweise,
                                      tragwerksart(werte).key);
    const kl = mitJoch ? klassifizierung(erg.modell) : null;

    // Für Modell und Auswertung gilt die gewählte Anzeigequelle
    // Abfangjoch, Mast und Anker legt `mitBauteilen` dazu - siehe dort.
    const anzeige = mitBauteilen(anzeigeKombi === 'umhuellend'
      ? (kombi.huellkurve ?? erg) : (kombi.ergebnisse?.[anzeigeKombi] ?? erg), erg);
    /** Die Bemessung mit allen Bauteilen - Urteil, Leiste, Bericht. */
    const bemessung = mitBauteilen(kombi.huellkurve ?? erg, erg, { mastErsatz: true });
    /*
     * >>> DIE AUSWERTUNG SIEHT `anzeige`, NICHT `erg`. <<<
     *
     * Die rechte Spalte bekommt die Huellkurve der Kombinationen - ein
     * eigenes Objekt, gebaut vom Kombinationsapparat des Tragjochs. Der
     * Abfangjoch-Nachweis hing an `erg` und kam dort nie an; in der Spalte
     * standen weiter «η Obergurt» und «η Untergurt», obwohl die Zahl
     * daneben schon gerechnet war.
     *
     * Er wandert deshalb mit. Seine eigene Kombination steckt in ihm selbst
     * (γ_G, γ_Q, ψ₀ ueber zwei Leitfaelle) - die Huellkurve des Tragjochs
     * hat darauf keinen Einfluss.
     */
    /*
     * (Vormals hier drei Zuweisungen an anzeige - Abfangjoch, Mast,
     * Anker - von Hand und in die Huellkurve hinein. Seit dem
     * 18. September in `mitBauteilen`.)
     */
    /*
     * >>> DAS URTEIL UEBER ALLE BAUTEILE (Entscheid vom 17. September). <<<
     *
     * Es steht auf der BEMESSUNG, nicht auf dem gezeigten Lastfall - ein
     * Einzellastfall traegt kein Urteil. Abfangjoch, Mast und Anker haengen
     * an `erg`; sie werden dazugelegt wie oben bei `anzeige`.
     */
    urteil.bauteile = bauteilUrteil(bemessung, werte.nachweise, tragwerksart(werte).key);

    // Das Auflagerblatt weist die Reaktionen des JOCHS aus. Ein Einzelmast
    // gibt seine Fussgroessen ueber den Mastnachweis aus, nicht hier.
    const auflager = mitJoch
      ? auflagerBlatt(werte, profOG, profUG, stahl, joch) : null;

    letzte = { erg, anzeige, bemessung, vergleich, kombi, checks, auflager, mitJoch,
               warn: flucht.warnungen, hinw, kl, urteil };

  /* =========================================================================
     * >>> DIE LEISTE BEKOMMT DIE AUSNUTZUNG DESSEN, WAS GERECHNET IST. <<<
     * =========================================================================
     *
     * Weisung vom 13. September: das eta je Bauteil in der Leiste.
     *
     * Gerechnet wird das AKTIVE Tragwerk; eine volle Huellkurve kostet
     * nachgemessen 32 ms, bei drei Tragwerken also hundert Millisekunden bei
     * jedem Tastendruck. Die uebrigen Zeilen tragen deshalb einen Strich -
     * siehe `setzeEtaFuerLeiste` in ui.js.
     *
     * DAS ETA DES MASTEN IST `etaMitStabilitaet`, nicht `eta`: letzteres ist
     * der QUERSCHNITT, an dem Farbskala und Hoehenverlauf haengen. Wer nach
     * dem Nachweis fragt, bekommt den Nachweis - mit dem Knicken darin.
     */
    {
      const anz = letzte?.anzeige ?? erg;
      const masten = {};
      ['A', 'B'].forEach((ende) => {
        const n = anz.mast?.[ende];
        if (!n) return;
        const id = mastenVon(werte).find(
          (x) => mastName(werte, x) === mastNameAmEnde(werte, null, ende))?.id;
        if (!id) return;
        const v = n.etaMitStabilitaet ?? n.eta;
        // Ein geteilter Mast steht in zwei Tragwerken; gezeigt wird der
        // groessere der beiden Nachweise, nicht der zuletzt geschriebene.
        masten[id] = Math.max(masten[id] ?? 0, Number(v) || 0);
      });
      ui.setzeEtaFuerLeiste({
        twId: werte.twId ?? 'T1',
        tragwerk: anz.max?.etaGesamt,
        masten,
      });
    }

    zeichneEingabe();
    zeichneEinwirkungswahl();
    zeichneAuswertung();
    // Die Nachweise in der rechten Schiene müssen mitlaufen - sie sind bei
    // eingeklappter Schublade das Einzige, was von der Auswertung übrig ist.
    zeichneSchienen();
    aktualisiereModell(anzeige);
    aktualisiereFuss(anzeige, urteil, joch);
  } catch (e) {
    letzte = null;
    zeichneEingabe();
    ui.zeichneFehler(ui.el('auswertung'), e);
    console.error(e);
  }
  speichern();
  pruefeUngesichert();
}

/**
 * Diagramm im Modellfenster gross zeigen.
 *
 * Dasselbe Diagramm noch einmal anfordern schaltet zurück auf das Modell -
 * ein Knopf, zwei Zustände, kein zusätzliches Fenster zum Schliessen.
 */
function zeigeDiagrammGross(id) {
  buehne = buehne === id ? null : id;
  zeichneBuehne();
}

/* ===========================================================================
 * DIE DIAGRAMME DER MASTEN UND STUETZEN
 * ===========================================================================
 *
 * Je Ende ein Satz: die Schnittgroessen ueber die Hoehe, die Ausnutzung, und
 * - wenn eine Druckstuetze daran haengt - deren Bemessungsdiagramm mit dem
 * Arbeitspunkt.
 *
 * DIE BREITE IST EIN ARGUMENT, keine feste Zahl: in der Seitenleiste sind es
 * 860, auf der Buehne die Breite des Modellfensters. Bis zum 15. September
 * standen die 860 fest darin - und die Buehne konnte sie deshalb gar nicht
 * erst bauen.
 */
function weitereDiagramme(erg, breite) {
  const liste = [];
  ['A', 'B'].forEach((ende) => {
    const mn = erg.mast?.[ende] ?? null;
    const ak = erg.anker?.[ende] ?? null;
    if (!mn && !ak) return;
    // Der Mastnachweis fuehrt kein `name` - sein Schluessel ist das Ende.
    const name = `Ende ${ende}`;
    const md = mn ? mastDiagramme(mn, { breite, name }) : null;
    let bem = null;
    if (ak?.nachweis) {
      const typ = ankerTypen().find((t) => t.id === ak.nachweis.typ);
      bem = ankerDiagramm(ak, typ?.druck ?? null, {
        breite, name,
        knickKurve: (l) => ankerKnickenSicher(ak.nachweis.typ, l, werte)?.NbRd,
      });
    }
    if (!md && !bem) return;
    liste.push({ titel: `Mast ${name}`, bemessung: bem,
                 schnitt: md?.schnitt ?? null,
                 ausnutzung: md?.ausnutzung ?? null });
  });
  return liste;
}

/* ===========================================================================
 * >>> DIE BUEHNE ZEIGT JEDES DIAGRAMM, NICHT NUR DIE DREI DES JOCHS. <<<
 * ===========================================================================
 *
 * Befund vom 15. September: «die diagramme der masten laden im mittleren
 * fenster wenn man draufdrückt.»
 *
 * Hier stand eine Titelliste mit drei Eintraegen und `dia[buehne]` aus
 * `diagramme()` - dem Satz des JOCHS. Ein Klick auf ein Mastdiagramm setzte
 * `buehne` auf `mast-schnitt-0`, und weil es den Schluessel dort nicht gibt,
 * oeffnete sich das Modellfenster mit LEEREM Koerper und ohne Titel. Das
 * Modell war weg, das Diagramm kam nicht - die schlechteste beider Welten.
 *
 * DASSELBE GALT DEM ABFANGJOCH: die Seitenleiste zeichnet seine Kurven mit
 * `abfangDiagramme`, die Buehne rief unbesehen `diagramme()`. Sie zeigte
 * damit die Kurven eines Ersatzbalkens, den es dort nicht gibt.
 *
 * Jetzt baut EINE Stelle den ganzen Satz - Joch oder Abfangjoch, dazu die
 * Masten und Stuetzen -, und die Buehne sucht darin ihren Schluessel. Was
 * die Seitenleiste zeigt, kann sie seither auch gross zeigen.
 * ========================================================================= */

/** Die Titel der Bauteildiagramme - dieselben wie in der Seitenleiste. */
const BUEHNE_TITEL = { 'anker-bem': 'Bemessungsdiagramm der Stütze',
                       'mast-schnitt': 'Schnittgrössen über die Höhe',
                       'mast-eta': 'Ausnutzung über die Höhe' };

/** Jedes Diagramm unter seinem Schluessel, mit Titel. */
function diagrammSatz(erg, breite) {
  const abD = erg.abfang ? abfangDiagramme(erg.abfang, breite) : null;
  const haupt = abD ?? diagramme(erg, breite);
  const satz = {
    schnittgroessen: { svg: haupt.schnittgroessen,
                       titel: abD ? 'Schnittgrössen'
                                  : 'Schnittgrössen Ersatzbalken' },
    ebene: { svg: haupt.ebene, titel: 'Ebenenquerkräfte' },
    ausnutzung: { svg: haupt.ausnutzung, titel: 'Ausnutzung' },
  };
  weitereDiagramme(erg, breite).forEach((w, i) => {
    const setz = (art, svg) => {
      if (!svg) return;
      satz[`${art}-${i}`] = { svg, titel: `${w.titel} · ${BUEHNE_TITEL[art]}` };
    };
    setz('anker-bem', w.bemessung);
    setz('mast-schnitt', w.schnitt);
    setz('mast-eta', w.ausnutzung);
  });
  return satz;
}

function zeichneBuehne() {
  const n = ui.el('diagramm-buehne');
  if (!buehne || !letzte) {
    n.hidden = true; n.innerHTML = '';
    return;
  }
  // Breite aus dem Fenster ableiten, damit das SVG die Fläche wirklich nutzt
  const breite = Math.max(520, Math.round(ui.el('viewer').clientWidth - 36));
  const bild = diagrammSatz(letzte.anzeige, breite)[buehne];
  /*
   * WAS ES NICHT GIBT, WIRD AUCH NICHT AUFGEZOGEN. Ein leeres Modellfenster
   * ist schlechter als gar keine Reaktion: das Modell waere weg und nichts
   * an seiner Stelle.
   */
  if (!bild?.svg) {
    buehne = null;
    n.hidden = true; n.innerHTML = '';
    return;
  }
  n.hidden = false;
  n.innerHTML = `<div class="buehne-kopf">
      <span class="panel-titel">${esc(bild.titel)}</span>
      <button class="btn btn-mini" data-zurueck>Zurück zum Modell</button>
    </div><div class="buehne-koerper">${bild.svg}</div>`;
  n.querySelector('[data-zurueck]').onclick = () => { buehne = null; zeichneBuehne(); };
  /*
   * DER MESSFADEN NUR HIER (Weisung, 15. September: «wenn die diagramme
   * gross sind messstelle definieren könen mit zahlenoutput»).
   *
   * In der Seitenleiste haben die Bilder 860 px auf einer schmalen Spalte -
   * dort liegen die Stuetzstellen so dicht, dass der Faden mehr raet als
   * misst. Auf der Buehne hat er die Breite des Modellfensters. Die Daten
   * haengen an JEDEM Bild; verdrahtet wird nur dieses.
   */
  verdrahteMessung(n);
}

function zeichneAuswertung() {
  if (!letzte) return;
  /*
   * OHNE JOCH KEINE JOCHAUSWERTUNG.
   *
   * Die vier Reiter - Uebersicht, Schnitt, Verlaeufe, Auflager - sprechen
   * alle vom Traeger: Stationen, Gurte, Bleche, Auflagerreaktionen. Beim
   * Einzelmast gaeben sie eine Seite voller Leerstellen. Er bekommt seine
   * eigene, kurze Auswertung; die Reiterleiste entfaellt, weil es nichts zu
   * waehlen gibt.
   */
  if (!letzte.mitJoch) {
    /*
     * Seit dem 18. September mit Reitern wie das Joch - ohne den Schnitt,
     * den es ohne Joch nicht gibt (Weisung: «entsprechend wie beim
     * tragjoch gestalten»).
     */
    if (!ui.EINZELMAST_TABS.some((t) => t.id === tabAuswertung)) tabAuswertung = 'uebersicht';
    ui.zeichneTabs(ui.el('tabs-auswertung'), ui.EINZELMAST_TABS, tabAuswertung, (t) => {
      tabAuswertung = t; zeichneAuswertung();
    });
    const knoten = ui.el('auswertung');
    if (tabAuswertung === 'verlauf') {
      const zeig = anzeigeKombi === 'umhuellend' ? letzte.bemessung : letzte.anzeige;
      ui.zeichneVerlauf(knoten, null, null, weitereDiagramme(zeig, 860));
    } else if (tabAuswertung === 'auflager') {
      ui.zeichneMastfuss(knoten, letzte.kombi);
    } else {
      ui.zeichneEinzelmast(knoten, letzte, {
        quelle: anzeigeKombi,
        plastisch: werte.mastPlastisch === true,
        beiFeld: (k, v) => aendern(k, v),
        lastfallName: anzeigeKombi === 'umhuellend' ? null
          : (letzte.kombi?.lastfaelle?.find((k) => k.key === anzeigeKombi)?.bez ?? anzeigeKombi),
      });
    }
    return;
  }
  const { anzeige: erg, vergleich, kombi, checks, hinw, kl, urteil } = letzte;
  ui.zeichneTabs(ui.el('tabs-auswertung'), ui.AUSWERTUNG_TABS, tabAuswertung, (t) => {
    tabAuswertung = t; zeichneAuswertung();
  });
  const node = ui.el('auswertung');
  if (tabAuswertung === 'uebersicht') {
    /* =====================================================================
     * >>> DIE UEBERSICHT URTEILT AUF DER BEMESSUNG, NICHT AUF DER ANZEIGE.
     * =====================================================================
     *
     * Weisung vom 16. September: «die ausnutzung sollte sich immer auf die
     * bemessung aller relevanten kombinationen beziehen. in der übersicht
     * müsste ein schalter noch sein ob man den aktuellen lastfall oder die
     * bemessungswerte global anzeigen will, sonst geht man gefahr, beim
     * versehentlichen umschalten auf einen lastfall grüne kacheln zu sehen
     * und in der hauptkachel heisst noch zusätzlich Tragsicherheit erfüllt,
     * was nicht korrekt ist nach sia, da nicht massgebende kombination
     * beachtet.»
     *
     * Das ist keine Kosmetik. Ein einzelner Lastfall ist KEIN Nachweis: die
     * Norm verlangt die ungünstigste Kombination, und die steht in der
     * Hüllkurve. Wer versehentlich umschaltet, bekam bisher kleinere Zahlen,
     * grüne Kacheln und «Tragsicherheit erfüllt» daneben - drei Aussagen,
     * von denen die dritte falsch war.
     *
     * Die Hüllkurve wandert deshalb IMMER mit, gleichgültig was die Anzeige
     * gerade zeigt. Was die Kacheln zeigen, entscheidet ein Schalter in der
     * Übersicht; was das Urteil sagt, entscheidet die Hüllkurve.
     */
    ui.zeichneUebersicht(node, erg, urteil, springeZu, station, hinw,
                         { bemessung: kombi.huellkurve ? letzte.bemessung : null,
                           quelle: anzeigeKombi,
                           plastisch: werte.mastPlastisch === true,
                           beiFeld: (k, v) => aendern(k, v),
                           lastfallName: anzeigeKombi === 'umhuellend' ? null
                             : (kombi.lastfaelle
                                 ?.find((k) => k.key === anzeigeKombi)?.bez
                                ?? anzeigeKombi) });
  } else if (tabAuswertung === 'schnitt') {
    /*
     * >>> DAS ABFANGJOCH HAT SEINEN EIGENEN SCHNITT. <<<
     *
     * Weisung vom 10. September. Der Schnitt des Tragjochs zeigt vier
     * Winkelecken und zwei Blechebenen; das Abfangjoch hat ZWEI Gurte
     * nebeneinander und EINE Blechlage. Es sind nicht dieselben Bauteile,
     * und deshalb ist es nicht dieselbe Tabelle.
     */
    if (erg.abfang) ui.zeichneAbfangSchnitt(node, erg.abfang);
    else ui.zeichneSchnitt(node, erg, waehleSchnittfeld,
                           (o) => aendern('schnittOrientierung', o),
                           schnittUmschalten);
  } else if (tabAuswertung === 'auflager') {
    /*
     * >>> DAS ABFANGJOCH HAT SEIN EIGENES AUFLAGERBLATT. <<<
     *
     * Weisung vom 10. September. Das Blatt des Tragjochs fuehrt die
     * Reaktionen nach EINWIRKUNGSGRUPPEN auf, damit der Fundamentplaner
     * selbst kombiniert. Das Abfangjoch kombiniert SELBST - drei Faelle mit
     * je eigener Regliertemperatur -, und aufgeschluesselt wird deshalb nach
     * Faellen.
     */
    if (erg.abfang?.auflager) ui.zeichneAbfangAuflager(node, erg.abfang, erg);
    else ui.zeichneAuflager(node, letzte.auflager, erg);
  } else {
    /*
     * >>> DAS ABFANGJOCH ZEIGT SEINE EIGENEN VERLAEUFE. <<<
     *
     * Weisung vom 10. September: «die reiter schnitt verläufe und auflager
     * beim abfangjoch fertig machen.» Hier standen die Kurven des
     * Tragjoch-Ersatzbalkens - am Abfangjoch die eines anderen Tragwerks.
     *
     * Der Massvariantenvergleich bleibt weg: er vergleicht Blecheinteilungen
     * des Tragjochs und hat am liegenden Traeger keinen Gegenstand.
     */
    const abD = erg.abfang ? abfangDiagramme(erg.abfang, 860) : null;
    /*
     * >>> UND DIE BILDER DER MASTEN UND IHRER STUETZEN. <<<
     *
     * Weisung vom 11. September: «es sind noch sinnvolle diagramme (sidebar
     * / verlaeufe) fuer die druckstuetze und abfangjoch nachzuziehen.»
     *
     * Je Mast ein Block: seine Schnittgroessen ueber die Hoehe, seine
     * Ausnutzung, und - wenn er eine Druckstuetze traegt - deren
     * Bemessungsdiagramm mit dem Arbeitspunkt darauf.
     *
     * DIE KURVE DES BLATTES kommt aus dem Sortiment, nicht aus dem
     * Ergebnis: `ankerTypen` fuehrt sie als Stuetzstellen. Die
     * Kontrollkurve daneben wird mit denselben Beiwerten gerechnet wie die
     * Kachel - `ankerKnickenSicher` ist dieselbe Funktion.
     */
    ui.zeichneVerlauf(node, abD ?? diagramme(erg, 860),
                      abD ? null : vergleich, weitereDiagramme(erg, 860));
  }
}

/** Transparenz und Schriftgrössen aus den Optionen auf die Ansicht übertragen. */
function uebernehmeAnsichtsoptionen() {
  if (!ansicht) return;
  ansicht.projektion = werte.projektion ?? 'perspektive';
  ansicht.kamera.fov = ((werte.blickwinkel ?? 34) * Math.PI) / 180;
  ansicht.transparenz = Math.max(0, Math.min(0.95, (werte.modellTransparenz ?? 50) / 100));
  ansicht.schrift = werte.modellSchrift ?? 10;
  ansicht.schriftLast = werte.modellSchriftLast ?? ansicht.schrift;
  ansicht.schriftMass = werte.modellSchriftMass ?? ansicht.schrift;
}

/*
 * DIE SZENE EINES NICHT AKTIVEN TRAGWERKS.
 *
 * Es wird nur GEZEICHNET, nicht gerechnet: sein Modell reicht fuer die
 * Geometrie, und ein zweiter voller Nachweis je Tragwerk kostete bei jedem
 * Tastendruck. Ohne Ergebnis bleiben seine Bauteile in der Grundfarbe - was
 * genau richtig ist, denn ausgewertet ist es nicht.
 *
 * Faellt der Aufbau, faellt nur DIESES Tragwerk weg: ein unvollstaendiger
 * Nachbar darf nicht das Bild des aktiven verhindern.
 */
function szeneVonNebenan(t, zeichnen) {
  try {
    const satz = tragwerkSatz(werte, t.id);
    // Der Zeichenplan gehoert an die SZENE, nicht an die Rechnung: was ein
    // Tragwerk traegt, bleibt unveraendert - nur wer den geteilten Masten
    // ins Bild setzt, ist geregelt.
    const mit = (mo) => ({ ...mo, mastZeichnen: zeichnen });
    /*
     * >>> DAS ABFANGJOCH ZEICHNET SICH SELBST. <<<
     *
     * Weisung vom 4. September: die 3D-Abbildung gehoert in die App. Es hat
     * zwei Gurte statt vier, seine Bleche liegen flach auf Flanschhoehe,
     * und ab A240 stehen Quersteifen dazwischen - `erzeugeSzene` faende
     * dafuer weder Querschnitt noch Stationsliste. `abfangSzene` baut
     * dieselbe Gestalt aus derselben Quelle, aus der auch die Ausleitung
     * nach AxisVM entsteht.
     */
    if (tragwerksart(satz).key === 'abfangjoch') {
      // Die Anbauteile gehoeren ins Bild - sie gehoeren auch ins Modell.
      return abfangSzene(satz.abfangTyp, Number(satz.L),
                         { anbauteile: satz.anbauteile ?? [],
                           mast: abfangMastAngabe(satz), lager: satz,
                           ...abfangLastAngaben(satz) });
    }
    if (tragwerksart(satz).key === 'einzelmast') {
      return erzeugeSzene(mit(modellEinzelmast(satz, getStahl(satz.stahl))), null);
    }
    const j = getTragjoch(satz.typ);
    return erzeugeSzene(mit(modell(satz, getProfil(satz.profOG),
                                   getProfil(satz.profUG),
                                   getStahl(satz.stahl), j)), null);
  } catch (e) {
    return null;
  }
}

function blattSzene(erg) {
  const aktivId = werte.twId ?? 'T1';
  /*
   * AUSGEBLENDETE TRAGWERKE STEHEN NICHT IM BILD.
   *
   * Das gerechnete ist immer dabei - es laesst sich gar nicht ausblenden
   * (siehe `tragwerkAus`), und ohne seine Szene gaebe es nichts zu zeigen.
   */
  const alle = tragwerkeSortiert(werte)
    .filter((t) => !versteckt(t) || t.id === aktivId);
  const plan = mastZeichenplan(werte, aktivId);
  const eigen = tragwerksart(werte).key === 'abfangjoch'
    ? abfangSzene(werte.abfangTyp, Number(werte.L),
                  { anbauteile: tragwerkSatz(werte).anbauteile ?? [],
                    mast: abfangMastAngabe(tragwerkSatz(werte)),
                    masten: abfangMastenAngabe(
                      rechensatz(werte), erg.modell.federn?.namen),
                    /*
                     * DER NACHWEIS FAERBT AUCH DEN MASTEN - dieselbe Regel
                     * wie beim Joch: nur das GERECHNETE Tragwerk bekommt
                     * ihn, ein Nachbar bliebe eine Behauptung.
                     */
                    ergMast: erg.mast ?? null,
                    ergAnker: erg.anker ?? null,
                    lager: tragwerkSatz(werte),
                    ...abfangLastAngaben(tragwerkSatz(werte)),
                    /*
                     * DAS ERGEBNIS FAERBT DAS BILD (Weisung, 9. September:
                     * «es ist noch alles grau»). Nur das GERECHNETE Tragwerk
                     * bekommt es - ein Nachbar wird nicht gerechnet, und
                     * eine Farbe aus der Skala waere dort eine Behauptung.
                     */
                    erg: erg.abfang ?? null })
    : erzeugeSzene({ ...erg.modell, mastZeichnen: plan[aktivId] }, erg);
  /*
   * >>> DER MASTFUSS IST DER NULLPUNKT DES BLATTES. <<<
   *
   * Weisung vom 9. September: «Die Anschlusshoehe bezieht sich immer auf den
   * Mastfuss des linken (ersten masten). der punkt ist somit als referenz
   * des modells zu lesen. wenn man den wert anschlusshoehe aendert dann
   * wandert das joch und nicht der mastfuss, da man sonst nicht zwei joche
   * uebereinander vernuenftig eingeben kann. fuer das gesamte modell sollte
   * man sich auf einen Referenzpunkt beziehen.»
   *
   * Jede Einzelszene kommt mit der JOCHACHSE auf z = 0 und dem Fuss bei -H.
   * Angehoben um +H liegt der Fuss auf 0 - und alle Tragwerke des Blattes
   * stehen auf derselben Grundlinie, gleichgueltig wie hoch ihre Joche
   * anschliessen.
   *
   * WELCHES H. Das des Endes A, also des LINKEN Masten: das ist der Punkt,
   * den die Weisung zur Referenz erklaert. Traegt ein Tragwerk am Ende B
   * eine andere Hoehe (`mastHZwei`), bleibt sie relativ dazu, wie sie im
   * Einzelmodell steht - der Mast steht dann tiefer oder hoeher, und genau
   * das soll er.
   */
  const teile = alle.map((t) => {
    const dx = lageVon(t);
    const dz = hebungVon(t);
    if (t.id === aktivId) {
      return szeneVerschieben({ ...eigen, aktiv: true }, dx,
                              { twId: t.id, aktiv: true }, dz);
    }
    const sz = szeneVonNebenan(t, plan[t.id]);
    return sz
      ? szeneVerschieben(sz, dx, { twId: t.id, passiv: true }, dz) : null;
  });
  /*
   * >>> AUCH ALLEIN STEHT ES AN SEINER STELLE. <<<
   *
   * Hier stand `if (alle.length < 2) return eigen;` - die unverschobene
   * Szene, in den EIGENEN Koordinaten des Tragwerks (0 bis L).
   *
   * Solange ein Blatt ein Tragwerk trug und dessen Lage null war, stimmte
   * das. Sobald eines allein uebrigbleibt - weil man die anderen
   * ausgeblendet hat -, stimmt es nicht mehr: das Joch sprang auf x = 0,
   * waehrend Masten, Masskette und die hinterlegte Zeichnung weiter in
   * Blattkoordinaten stehen. Was man dann sieht, sind Linien an Stellen, an
   * denen nichts mehr ist.
   *
   * Gemeldet am 3. September: «beim separierter darstellung werden die
   * lasten (linien) der ausgeblendeten noch dargestellt.»
   *
   * Und dasselbe traf das Setzen von Bauteilen: `stelleAus` rechnet den
   * Klick von der Blattkoordinate in die des Tragwerks um (blattNachLokal).
   * Stand die Szene unverschoben da, ging jeder Klick um x0 daneben.
   */
  return szenenVereinen(teile);
}

function aktualisiereModell(erg) {
  const szene = blattSzene(erg);
  uebernehmeAnsichtsoptionen();
  ansicht.station = station;
  ansicht.setzeSzene(szene);
  if (ui.el('legende')) zeichneLegende();
  // Die Blickrichtung wird beim ersten Setzen der Szene festgelegt; die
  // Werkzeugleiste muss danach wissen, welche gilt.
  if (ui.el('ebenen-tools')?.children.length) zeichneModellWerkzeuge();
  /*
   * DIE FUSSLEISTE SAGT, WAS DA IST.
   *
   * Beim Joch sind das Nachweisschnitt und massgebendes Blech. Ein
   * Einzelmast hat keinen Schnitt zwischen Bindeblechen - dort steht, dass
   * die Ansicht noch fehlt, statt einer Feldnummer, die es nicht gibt.
   */
  if (erg.schnitt) {
    ui.el('pos-marke').textContent =
      `Schnitt x = ${erg.schnitt.x.toFixed(2)} m`;
    ui.el('pos-station').textContent =
      `Feld ${erg.schnitt.feld + 1}/${erg.schnitt.anzahlSchnitte}` +
      ` · massgebendes Blech bei ${erg.schnitt.stationX.toFixed(2)} m`;
  } else {
    /*
     * OHNE NACHWEISSCHNITT BLEIBT DIE ZEILE LEER.
     *
     * Beim Einzelmast gibt es keinen Schnitt zwischen Bindeblechen - er hat
     * keine. Hier stand bis eben der Hinweis, dass die Ansicht noch fehle;
     * seit sie da ist, waere er falsch.
     */
    ui.el('pos-marke').textContent = '';
    ui.el('pos-station').textContent = '';
  }
  /*
   * DIE EINWIRKUNGSKLASSE STEHT FUER SICH, RECHTS (Weisung).
   *
   * Sie entscheidet ueber Wind auf Joch und Mast und stand sonst nur in der
   * Eingabe. Angehaengt an die Schnittangabe las sie sich wie eine Eigenschaft
   * des Schnitts; sie gilt aber fuer das ganze Tragwerk.
   */
  if (ui.el('pos-ek')) {
    ui.el('pos-ek').textContent = ekVonWindklasse(werte.windKlasse);
  }
  // Die Masskette der Zeichnung: die Ansicht zeichnet daraus Fanglinien.
  ansicht.masskette = erg.modell.masskette ?? [];
  // Und die Maske braucht das gerechnete Modell, um einen Träger an den
  // Bindeblechen vorbeizuschieben - dort stehen Lage und Breite der Bleche.
  ui.setzeModellFuerLage(erg.modell);
  // Ein vergrössertes Diagramm bleibt live und zeichnet mit
  if (buehne) zeichneBuehne();
}

function aktualisiereFuss(erg, urteil, joch) {
  /*
   * >>> DIE FUSSLEISTE ZEIGTE DAS TRAGJOCH, WAEHREND EIN ABFANGJOCH DASTAND.
   * <<<
   *
   * Gefunden am 11. September in einem Bedienlauf: unten stand «η = 0.689»
   * und «500 × 440 mm · Feldweite 750 mm», oben in der Uebersicht «η
   * 0.593» bei einem A240 mit UPE-240-Gurten. Die 500 mm sind die Bauhoehe
   * des J90, die Feldweite sein Blechraster - Zahlen des
   * Tragjoch-Ersatzbalkens, den `berechne` mitfuehrt, weil Masken und
   * Verlaeufe an seiner Gestalt haengen.
   *
   * Genau dieser Fall ist beim EINZELMASTEN schon einmal aufgeschlagen
   * («undefined × undefined mm · Feldweite NaN mm») und darunter geloest
   * worden - fuer das Abfangjoch fehlte der Zweig. Der Kommentar oben sagt
   * seither, zwei Anzeigen derselben Sache duerften einander nicht
   * widersprechen; hier taten sie es.
   *
   * Massgebend ist jetzt DIESELBE Zahl wie in der Uebersicht: `ab.max.eta`
   * aus `abfangAuswertung`. Zwei Quellen fuer ein Urteil waeren der Fehler
   * ein zweites Mal.
   */
  const ab = erg.abfang ?? null;
  /*
   * SEIT DEM 17. SEPTEMBER DAS MAXIMUM UEBER ALLE BAUTEILE, mit Namen
   * (`bauteilUrteil`). Vorher stand hier nur das Joch - und «Alle Nachweise
   * erfüllt» neben einem Mast mit η = 3.14.
   */
  const bt = urteil.bauteile;
  const e = bt ? bt.eta : (ab ? ab.max.eta : erg.max.etaGesamt);
  // DIESELBE REGEL WIE OBEN IM URTEIL. Sie liefen auseinander: die Fussleiste
  // sagte «Nachweis nicht erfuellt», waehrend das Urteil gruen dastand - eine
  // Klemme zehn Zentimeter zu weit rechts genuegte. Zwei Anzeigen derselben
  // Sache, die einander widersprechen, sind schlimmer als eine.
  const gut = e <= 1 && !bt?.ueber && urteil.bindendVerletzt !== true;
  // Ohne Urteil (nicht geführt, nicht nachgewiesen) gelb wie die Kachel.
  const farbe = urteil.tragwerkGefuehrt === false ? 'var(--warn)'
    : (gut ? 'var(--ok)' : 'var(--fail)');
  const wer = bt?.massgebend && bt.liste.length > 1 ? ` (${esc(bt.massgebend.name)})` : '';
  ui.el('st-urteil').innerHTML =
    `<span class="pkt" style="background:${farbe}"></span>` +
    urteilFusszeile({ gut, eta: e, wer, urteil });
  /*
   * DIE ZEILE BESCHREIBT DAS TRAGWERK, DAS DASTEHT.
   *
   * Beim Joch sind das Bauhoehe, Breite, Feldweite und die Frage, ob die
   * Spannweite im Sortiment liegt. Ein Einzelmast hat davon nichts - die
   * Zeile las sich dort «undefined × undefined mm · Feldweite NaN mm (Soll
   * NaN) · AUSSERHALB Sortiment». Vier falsche Angaben in einer Zeile, und
   * die letzte klang wie ein Befund.
   */
  const mast = erg.modell.federn?.mastA ?? erg.modell.federn?.mast;
  if (erg.modell.tragwerksart === 'einzelmast') {
    ui.el('st-modell').textContent = mast
      // Ohne Anschlusshoehe (18. September): die Laenge, Fuss bis Kopf.
      ? `${mast.profil.name} · ${mast.laenge.toFixed(2)} m Fuss bis Kopf`
        + ` · ${mast.stegrichtung.label ?? mast.stegrichtung.key}`
      : 'Kein Mastprofil gewählt';
    return;
  }
  /*
   * UND DIE ZEILE BESCHREIBT DAS ABFANGJOCH, wenn eines dasteht: sein
   * Gurtprofil, der Hebelarm des Kraeftepaars, das Rahmenfeld und die Zahl
   * der Bleche. Bauhoehe und Blechraster des Jochtraegers gibt es hier
   * nicht - der Traeger liegt, und seine beiden Gurte stehen nebeneinander.
   */
  if (ab) {
    const bl = ab.bleche?.bleche?.length ?? 0;
    ui.el('st-modell').textContent =
      `${ab.typ ?? '–'} · ${ab.q?.gurt?.name ?? '–'}, zwei Gurte`
      + ` · e = ${((ab.q?.e ?? 0)).toFixed(1)} cm`
      + ` · Stützweite ${(ab.js ?? 0).toFixed(2)} m`
      + ` · Rahmenfeld ${((ab.rahmenfeld?.a ?? 0) * 1000).toFixed(0)} mm`
      + (bl ? ` · ${bl} Bleche` : '');
    return;
  }
  const s = spannweiteImSortiment(joch, erg.modell.L);
  ui.el('st-modell').textContent =
    `${erg.modell.jd}${erg.modell.verlauf?.aktiv
        ? `→${erg.modell.verlauf.voute.endJd}` : ''} × ${erg.modell.jbbOG} mm · Feldweite ` +
    `${(erg.modell.a1eff * 1000).toFixed(0)} mm (Soll ${(erg.modell.a1 * 1000).toFixed(0)})` +
    (s.text ? ` · ${s.ok ? 'Sortiment' : 'AUSSERHALB Sortiment'}` : '');
}

// --- Ereignisse -------------------------------------------------------------

function mastNachfuehrenGlobal() {
  const t = tragwerkeVon(werte)[0];
  const meine = mastenFuer(werte, t).filter(Boolean).map((m) => m.id);
  if (werte.mastAktiv && !meine.includes(werte.mastAktiv)) {
    werte = { ...werte, mastAktiv: meine[0] ?? undefined };
  }
  /*
   * UND DIE BAUTEILE AN DEN MASTEN KOMMEN MIT.
   *
   * Ein weggelegtes Tragwerk traegt sie nicht (tragwerkTeil raeumt sie
   * weg) - das neu angewaehlte bekommt sie deshalb hier. Ohne diese
   * Zeile stuende die Traverse des Zwischenmasten nach dem Umschalten
   * nicht mehr in der Liste, obwohl sie am Masten haengt.
   */
  werte = { ...werte, anbauteile: anbauteileFuer(werte, tragwerkeVon(werte)[0]) };
}

/**
 * DIE NÄCHSTGELEGENE GEFÜHRTE LÄNGE EINES ABFANGJOCHTYPS.
 *
 * Beim Wechsel des Typs bleibt die eingestellte Länge stehen, auch wenn der
 * neue Typ sie nicht führt - A160 endet bei 12.50 m, A360 beginnt bei
 * 17.50. Ohne Nachführung stünde dort eine Länge ohne Zeile in der
 * Mass-Tabelle, und der Kern fände weder Stützweite noch Blecheinteilung.
 */
/**
 * DIE MASTANGABE FUER DAS BILD DES ABFANGJOCHS.
 *
 * Weisung vom 4. September: «Die Masten im 3D noch darstellen.» Ohne
 * Masten - `mastVorhanden === false` - gibt es nichts zu zeichnen: das
 * Tragwerk steht dann auf der eingestellten Auflagerbedingung, nicht auf
 * einem Stiel.
 */
/**
 * >>> DIE MASTLAENGE FOLGT DER ANSCHLUSSHOEHE. <<<
 *
 * Weisung vom 5. September: «das feld Mastlaenge mit der Anschlusshoehe
 * koppeln, die Mastlaenge als voreinstellwert 0.5m laenger auf
 * anschlusshoehe bezogen.»
 *
 * >>> GEKOPPELT HEISST: SOLANGE SIE AUF DEM VORGABEWERT STEHT. <<<
 *
 * Ein zweites Feld «Laenge von Hand» waere eine Frage mehr, die niemand
 * beantworten will. Die Kopplung erkennt sich an der Zahl selbst: steht die
 * Laenge auf 0 (nie gesetzt) oder genau auf «alte Hoehe + 0.50», so war sie
 * gekoppelt und wandert mit. Steht etwas anderes da, hat es jemand gewollt -
 * und dann bleibt es stehen.
 *
 * Dasselbe Vorgehen wie bei der Windlast auf den Masten, die nachgefuehrt
 * wird, solange die Lastwerte nicht von Hand freigegeben sind.
 *
 * @param {object} w    Werte VOR der Aenderung
 * @param {string} feldH  'mastH' oder 'mastHB'
 * @param {string} feldL  'mastLaenge' oder 'mastLaengeB'
 * @param {number} neuH   die neue Hoehe [m]
 * @returns {object|null} die nachgefuehrte Laenge, oder null
 */
/*
 * >>> GEMESSEN WIRD VOM FUSS, NICHT VON DER BEZUGSHOEHE. <<<
 *
 * Weisung vom 12. September: der Fusspunkt ist ein eigenes Mass. Die Laenge
 * ist Fuss bis Kopf - die Vorgabe rechnet deshalb mit der FREIEN Laenge
 * (Anschlusshoehe minus Fussversatz). Ohne das waere ein Mast auf tieferem
 * Fuss um genau diesen Versatz zu kurz.
 *
 * Die Funktion nimmt die beiden freien Laengen jetzt UNMITTELBAR entgegen.
 * Vorher hiess der Parameter `neuH` und meinte die Anschlusshoehe; welche
 * der beiden Groessen gemeint ist, soll am Aufruf stehen und nicht in der
 * Funktion geraten werden - es sind zwei Aufrufer mit zwei Anlaessen.
 */
function mastLaengeNachfuehren(w, feldL, altFrei, neuFrei) {
  const altL = Number(w?.[feldL]) || 0;
  const gekoppelt = altL === 0
    || Math.abs(altL - mastLaengeVorgabe(altFrei, w?.jd)) < 1e-6;
  if (!gekoppelt) return null;
  return { [feldL]: mastLaengeVorgabe(neuFrei, w?.jd) };
}

/** Der Fussversatz, der zu einem Laengenfeld gehoert [m]. */
function fussZu(w, feldL) {
  const k = feldL === 'mastLaengeB' ? 'mastFussB' : 'mastFuss';
  return Number(w?.[k] ?? w?.mastFuss) || 0;
}

function abfangMastAngabe(satz) {
  if (!satz || satz.mastVorhanden === false) return null;
  // VOM FUSS gemessen (Weisung, 12. September): die Hoehe, die hier gebraucht
  // wird, ist die freie Laenge - der Mast reicht von seinem Fuss bis zur
  // Jochachse, und der Fuss liegt nicht mehr zwingend bei -H.
  const hoehe = (Number(satz.mastH) || 0) - (Number(satz.mastFuss) || 0);
  if (!satz.mastProfil || !(hoehe > 0)) return null;
  return { profil: satz.mastProfil, hoehe,
           stegrichtung: satz.mastSteg ?? 'jochachse' };
}

/**
 * >>> DIE BEIDEN MASTEN EINZELN - fuer die Abfangszene. <<<
 *
 * Weisung vom 10. September: die Masten sollen aussehen wie beim Tragjoch.
 * Dazu gehoert, dass sie sich unterscheiden duerfen: Profil, Hoehe,
 * Ueberstand und der Anker stehen je Ende, nicht einmal fuer beide.
 *
 * Die Angaben kommen aus demselben Rechensatz, den der Kern bekommt - Bild
 * und Rechnung sollen nicht aus zwei Quellen schoepfen.
 */
function abfangMastenAngabe(satz, namen) {
  if (!satz || satz.mastVorhanden === false) return null;
  const je = (ende) => {
    const zwei = ende === 'B' && satz.mastZwei === true;
    const zweiH = ende === 'B' && (satz.mastHZwei ?? satz.mastZwei) === true;
    const profil = zwei ? (satz.mastProfilB ?? satz.mastProfil)
                        : satz.mastProfil;
    const hoehe = Number(zweiH ? (satz.mastHB ?? satz.mastH) : satz.mastH) || 0;
    if (!profil || !(hoehe > 0)) return null;
    const roh = Number(zwei ? (satz.mastLaengeB || satz.mastLaenge)
                            : satz.mastLaenge) || 0;
    return {
      profil, hoehe, name: namen?.[ende] ?? null,
      stegrichtung: (zwei ? (satz.mastStegB ?? satz.mastSteg)
                          : satz.mastSteg) ?? 'jochachse',
      // Der Kopf ueber der Jochachse - ohne Angabe endet er dort.
      ueberstand: roh > hoehe ? roh - hoehe : 0,
      anker: (ende === 'B' ? satz.mastAnkerB : satz.mastAnkerA) ?? null,
    };
  };
  return { A: je('A'), B: je('B') };
}

/**
 * >>> WOMIT DIE KRAFTPFEILE RECHNEN. <<<
 *
 * Weisung vom 9. September: «die anbauteile im abfangjoch pruefen.» Der Befund
 * war eine Abweichung zwischen Bild und Nachweis:
 *
 *      Nachweis   G = 1.70 kN     (mit Spannweite 60 m)
 *      Bild       G = 0.50 kN     (ohne Spannweite - das Drahtwerk zaehlte
 *                                  nur sein Stueck am Joch)
 *
 * `abfangAnbauLasten` steht im Kern und ist DIESELBE Quelle fuer Nachweis,
 * Bild und Ausleitung - genau dafuer wurde sie am 4. September dorthin
 * gelegt. Sie braucht aber ihre Angaben: die Einwirkungskombination, die
 * Spannweite der Fahrleitung, den Radius und den Temperaturfall. Die
 * Ausleitung reichte sie durch, die Szene nicht - und das Bild zeigte
 * Pfeile, die das Modell so nicht aufbringt.
 *
 * Eine Stelle fuer alle drei Aufrufe, damit es beim naechsten Mal nicht
 * wieder zwei sind.
 */
function abfangLastAngaben(satz) {
  return { ek: satz?.ek, L_FL: Number(satz?.L_FL) || 0,
           R: Number(satz?.R) || 0, tempFall: satz?.tempFall };
}

function abfangNaechsteLaenge(typ, jt) {
  if (!abfangDbDa() || !typ) return null;
  let liste = [];
  try { liste = abfangLaengen(getAbfangjoch(typ)); } catch { return null; }
  if (!liste.length) return null;
  const ziel = Number(jt);
  if (!Number.isFinite(ziel)) return liste[0];
  return liste.reduce((a, b) => (Math.abs(b - ziel) < Math.abs(a - ziel) ? b : a));
}

function aendern(key, wert) {
  /*
   * >>> DIE LÄNGENAUSWAHL SCHREIBT IN `L`. <<<
   *
   * Weisung vom 4. September: der Katalog der Längen gehört in die
   * Seitenleiste. Er steht dort als eigenes Feld, damit die Liste die
   * geführten Längen zeigen kann - geschrieben wird aber in dasselbe `L`,
   * an dem Rechnung, Bild und Ausleitung hängen. Ein zweites Längenfeld
   * wäre ein zweiter Ort für dieselbe Zahl.
   */
  /*
   * >>> DER SCHIEBER RASTET AUF DIE GEFUEHRTEN LAENGEN. <<<
   *
   * Weisung vom 4. September: derselbe Schieber wie beim Tragjoch. Das
   * Abfangjoch fuehrt aber nur die Laengen im Halbmeterraster - eine Zahl
   * dazwischen haette keine Zeile in der Mass-Tabelle, und der Kern faende
   * weder Stuetzweite noch Blecheinteilung. Statt sie abzuweisen, rastet
   * sie hier auf die naechste ein: die Geste bleibt frei, das Ergebnis
   * gefuehrt.
   */
  if (key === 'L' && tragwerksart(werte).key === 'abfangjoch') {
    const nah = abfangNaechsteLaenge(werte.abfangTyp, wert);
    if (nah !== null) wert = nah;
  }
  /*
   * WER DEN TYP WECHSELT, BEKOMMT EINE LÄNGE, DIE ES GIBT.
   *
   * Sonst bliebe die alte stehen - und A360 führt keine 9.50 m.
   */
  if (key === 'abfangTyp') {
    const neu = abfangNaechsteLaenge(wert, werte.L);
    werte = { ...werte, abfangTyp: wert };
    if (neu !== null && Math.abs(neu - (Number(werte.L) || 0)) > 1e-9) {
      return aendern('L', neu);
    }
    /*
     * DIREKT, NICHT UEBER DEN ALIAS.
     *
     * `mastNachfuehren` ist weiter unten mit `const` gebunden - hier oben
     * liegt es noch in der toten Zone, und der Aufruf warf «Cannot access
     * 'mastNachfuehren' before initialization». Zu sehen war es nur, wenn
     * der Typwechsel die Laenge NICHT mitzog; sonst kehrt die Zeile darueber
     * vorher zurueck. Genau so ist es aufgefallen: A270 anwaehlen, 12.50 m
     * bleibt gueltig, und die Anwendung stand.
     */
    mastNachfuehrenGlobal();
    neuRechnen();
    return;
  }
  /*
   * DIE TRAGWERKSLISTE MELDET DREI ABSICHTEN.
   *
   * Sie sehen aus wie Eingaben und sind es nicht: sie tauschen den ganzen
   * Eingabesatz aus, statt ein Feld darin zu setzen. Sie laufen trotzdem
   * ueber diesen Weg, damit Speichern, Rechnen und Zeichnen daran haengen
   * bleiben - ein zweiter Weg waere ein zweiter, der vergessen wird.
   */
  /*
   * WER DAS TRAGWERK WECHSELT, BEKOMMT DESSEN MASTEN.
   *
   * Die Mastkachel bleibt sonst auf einem Masten stehen, der zum neu
   * angewaehlten Tragwerk gar nicht gehoert - rechts steht dann die
   * Auswertung des einen, links die Eingabe des anderen. Gemessen am
   * 2. September: drei Tragwerke, angewaehlt der Einzelmast bei x 0, in den
   * Feldern das Profil des Mastes bei x 40.
   *
   * >>> UMGEKEHRT NICHT. <<<
   *
   * Eine Mastkachel anzuklicken wechselt das Tragwerk NICHT. Ein geteilter
   * Mast gehoert beiden, und welches Joch gerechnet wird, ist eine andere
   * Frage als welcher Mast gerade in den Feldern steht.
   */
  // Der Nachlauf nach einem Tragwerkswechsel steht als eigene Funktion da:
  // das Kontextmenue braucht ihn ebenfalls, und zwei Kopien waeren zwei
  // Gelegenheiten, eine zu vergessen.
  const mastNachfuehren = mastNachfuehrenGlobal;
  if (key === 'tragwerkAktiv') {
    werte = tauscheAktives(werte, wert);
    mastNachfuehren();
    neuRechnen();
    return;
  }
  /*
   * >>> DER ANKER BEKOMMT EINEN EIGENEN DIALOG. <<<
   *
   * Weisung vom 11. September: «biete noch eine einfache moeglichkeit die
   * anordnung vor oder hinter dem masten vorzunehmen. am besten in einem
   * separatem modal wo abgefragt wird welchen an welchem masten und wie
   * angeordnet.»
   *
   * Bis dahin lagen die fuenf Angaben verstreut in der Mastgruppe der Maske,
   * und WELCHEM Masten sie galten, sagte eine Kachelreihe weiter oben. Wer
   * einen zweiten Anker setzen wollte, musste das erst herausfinden.
   */
  if (key === 'ankerDialog') {
    dialogAnker(typeof wert === 'string' ? wert : null);
    return;
  }
  /*
   * >>> DIE ART EINES BESTEHENDEN TRAGWERKS WECHSELN. <<<
   *
   * Weisung vom 11. September (Bedienlauf): das Kontextmenue konnte alles
   * ausser dem Naheliegendsten. Gewechselt wird ueber DENSELBEN Weg, den das
   * Anlegen geht - `artVorgabe` setzt Typ und Laenge auf das Sortiment der
   * neuen Art, genau wie `tragwerkNeu` es tut. Ein zweiter Weg waere einer,
   * den man beim naechsten Typ vergisst.
   */
  if (key === 'tragwerkArt') {
    const { id, art } = wert;
    const t = tragwerkeSortiert(werte).find((x) => x.id === id);
    if (!t || tragwerksart(t).key === art) { neuRechnen(); return; }
    werte = { ...werte, tragwerksart: art, ...artVorgabe(art, werte) };
    /*
     * OHNE TRAEGER KEINE TEILE AM TRAEGER (Weisung vom 18. September):
     * «wenn ich aus einem jochtragwerk einen einzelmasten mache, dann
     * bleiben alle anbauteile bestehen, diese sollten gelöscht werden mit
     * dem joch.» Was am Masten haengt, bleibt.
     */
    if (!TRAGWERKSARTEN.find((a) => a.key === art)?.traeger) {
      werte = setzeAnbauteileAn(werte, nurMastteile(rechensatz(werte).anbauteile));
    }
    werte = rechensatz(werte);
    mastNachfuehren();
    neuRechnen();
    return;
  }
  /*
   * >>> DAS JOCH GEHT, DIE MASTEN BLEIBEN (Weisung vom 18. September). <<<
   * An jeder freien Maststelle ein Einzelmast mit derselben Laenge.
   */
  if (key === 'jochZuEinzelmasten') {
    const laengeVon = (m, t, ende) => ((Number(m.laenge) || 0) > 0 ? Number(m.laenge)
      : mastLaengeVorgabe((Number(ende === 'B' ? (t.mastHB ?? t.mastH) : t.mastH) || 0)
                          - (Number(m.fuss) || 0), t.jd));
    werte = jochZuEinzelmasten(werte, wert, laengeVon);
    mastNachfuehren();
    neuRechnen();
    return;
  }
  /*
   * >>> DAS FENSTER KOMMT VOR DEM TRAGWERK. <<<
   *
   * Weisung vom 11. September: «dies beim erstellen eines tragweks
   * einblenden und wenn man es anklickt.» `tragwerkNeu` legt weiter an - der
   * Dialog ruft es selbst, wenn seine drei Fragen beantwortet sind.
   */
  if (key === 'tragwerkDialog') {
    /*
     * ZWEI ABSENDER, ZWEI BEDEUTUNGEN. Das Menue «+ Tragwerk» schickt eine
     * ART («abfangjoch»), die Tragwerkszeile eine ID («T2»). Beides sind
     * Zeichenketten, und der erste Anlauf las «abfangjoch» als Id - der
     * Dialog hiess dann «frei bearbeiten» und hätte ein bestehendes
     * Tragwerk geändert statt eines anzulegen.
     */
    const istArt = TRAGWERKSARTEN.some((a) => a.key === wert);
    dialogTragwerk(istArt ? null : (typeof wert === 'string' ? wert : null),
                   istArt ? wert : null);
    return;
  }
  if (key === 'tragwerkNeu') {
    /*
     * Der Knopf meldet nur die Art; der Rechtsklick im Modell meldet Art UND
     * Stelle. Beides laeuft ueber denselben Weg - ein zweiter waere einer,
     * den man vergisst.
     */
    const art = typeof wert === 'string' ? wert : wert.art;
    /*
     * >>> EIN ABFANGJOCH BRINGT SEINEN EIGENEN TYP MIT. <<<
     *
     * Der neue Satz uebernimmt den bisherigen - samt `typ`, und der lautet
     * dann «J90». In der Auswahlliste des Abfangjochs steht J90 aber nicht;
     * der Browser zeigt daraufhin den ERSTEN Eintrag an, waehrend im
     * Datensatz weiter J90 steht. Zwei verschiedene Antworten auf dieselbe
     * Frage, und die sichtbare ist die falsche.
     *
     * Beim Anlegen wird deshalb der erste Typ des Sortiments gesetzt - und
     * mit ihm eine Laenge, die er auch fuehrt.
     */
    // In SEIN Feld, nicht in `typ` - dort holt der Rechenkern sein Tragjoch,
    // und ein «A160» wirft dort «Unbekannter Tragjochtyp». `artVorgabe`
    // haelt diesen Weg und den der Vorlage (`frisch`) auf demselben Stand.
    const vorgabe = artVorgabe(art, werte);
    werte = typeof wert === 'string'
      ? tragwerkHinzu(werte, wert, vorgabe)
      : tragwerkHinzu(werte, wert.art, { ...vorgabe, xLage: wert.xLage });
    mastNachfuehren();
    /*
     * >>> EIN NEUER EINZELMAST NIMMT DIE JOCHTEILE NICHT MIT. <<<
     *
     * `tragwerkHinzu` uebernimmt den bisherigen Satz - samt den Teilen am
     * Joch. Am Einzelmast gibt es kein Joch; die Haengestuetze hing dann mit
     * Hoehe 0 am Mastfuss (gesehen am 18. September: ein zweites «A1» am
     * Fundament). Steht der neue Mast auf einem bestehenden, behaelt er
     * dessen Teile; sonst bekommt er die Beispielteile.
     */
    if (!TRAGWERKSARTEN.find((a) => a.key === art)?.traeger) {
      const amMast = nurMastteile(rechensatz(werte).anbauteile);
      werte = setzeAnbauteileAn(werte, amMast.length ? amMast : einzelmastTeile(rechensatz(werte)));
      mastNachfuehren();
    }
    neuRechnen();
    return;
  }
  if (key === 'tragwerkWeg') {
    werte = tragwerkWeg(werte, wert);
    mastNachfuehren();
    neuRechnen();
    return;
  }
  /*
   * DIE MASTEN EINES TRAGWERKS EIN- ODER AUSSCHALTEN - an seiner Kachel.
   *
   * Weisung vom 2. September: «nimm das aktiv inaktiv schalten der masten
   * oben zu den kacheln». Der Schalter stand unter den Mastfeldern und
   * schaltete etwas, was man dort gar nicht sah; an der Kachel steht er
   * neben dem Tragwerk, dem er gilt.
   *
   * >>> ER GILT DEM TRAGWERK, NICHT DEM EINZELNEN MASTEN. <<<
   *
   * `mastVorhanden` sagt, ob DIESES Tragwerk auf Masten steht - beide
   * Enden zugleich. Einen einzelnen Masten wegzuschalten und den anderen
   * stehen zu lassen kennt das Datenmodell nicht, und es waere auch kein
   * Tragwerk. Deshalb sitzt der Schalter an der Tragwerkskachel und nicht
   * an der Mastkachel.
   */
  /*
   * DER SCHALTER IN DER SEITENLEISTE MELDET DIESELBE ABSICHT.
   *
   * `mastVorhanden` ist kein gewoehnliches Feld: es haengt am TRAGWERK, nicht
   * an einem Masten, und es schaltet beide Enden zugleich. Es hier
   * durchzureichen statt in den allgemeinen Feldweg zu geben haelt beide
   * Wege - Knopf und Box - auf derselben Handlung.
   */
  if (key === 'mastVorhanden') {
    return aendern('tragwerkMasten', werte.twId ?? 'T1');
  }
  if (key === 'tragwerkMasten') {
    /*
     * >>> ER WECHSELT DAS GERECHNETE TRAGWERK NICHT. <<<
     *
     * Weisung vom 9. September. Hier stand `tauscheAktives` - weil die
     * Felder des aktiven Tragwerks flach im Blatt liegen, war das der
     * einzige Weg, das Feld eines anderen zu erreichen. Die Nebenwirkung
     * war die eigentliche Wirkung: die ganze Auswertung sprang auf ein
     * anderes Joch, und der geteilte Zwischenmast wechselte dabei den
     * Zeichner - im Bild sah es aus, als wuerde er nachgeschoben.
     *
     * `tragwerkAendern` greift jetzt genau das eine Feld an, egal wo es
     * liegt.
     */
    werte = tragwerkAendern(werte, wert ?? (werte.twId ?? 'T1'),
                            (t) => ({ mastVorhanden: t.mastVorhanden === false }));
    mastNachfuehren();
    neuRechnen();
    return;
  }
  /*
   * EINE MASTKACHEL ANGEKLICKT - sie waehlt nur an, sie aendert nichts.
   *
   * Das aktive TRAGWERK bleibt, wie es war: welches Joch gerechnet und
   * ausgewertet wird, ist eine andere Frage als welcher Mast gerade in den
   * Feldern steht. Ein geteilter Mast gehoert ohnehin beiden.
   */
  /*
   * EIN BALKEN DER QUERPROFIL-LEISTE WURDE VERSCHOBEN.
   *
   * Er traegt seine Id mit: gezogen werden kann auch ein Tragwerk, das
   * gerade nicht gerechnet wird. Es wird dabei zum gerechneten - wer etwas
   * anfasst, meint es.
   */
  if (key === 'tragwerkLage') {
    if ((werte.twId ?? 'T1') !== wert.id) werte = tauscheAktives(werte, wert.id);
    /*
     * ZWEI JOCHE DUERFEN SICH BERUEHREN, NICHT DURCHDRINGEN (Weisung).
     * `freieLage` schiebt auf die naechstgelegene erlaubte Stelle - wer ein
     * Joch an seinen Nachbarn heranzieht, meint «bis dorthin».
     */
    const frei = freieLage(werte, wert.id, wert.x);
    werte = { ...werte, xLage: frei.x };
    mastNachfuehren();
    neuRechnen();
    return;
  }
  /*
   * >>> EIN GEZOGENER MAST. <<<
   *
   * Weisung vom 2. September: «wie kann ich nachträglich die mastabstände
   * bzw. jochlängen anpassen?» - jetzt am Masten selbst.
   *
   * Er kann zwei Rollen zugleich haben. Am Zwischenmasten einer Jochreihe
   * ist er das RECHTE Ende des linken Jochs und das LINKE des rechten:
   * ziehen heisst dann, das linke zu verlaengern und das rechte mitwandern
   * zu lassen. Beides zusammen, sonst klafft eine Luecke oder die Joche
   * ueberschneiden sich.
   *
   * DIE REIHENFOLGE ZAEHLT: erst die Laenge des linken, dann die Lage des
   * rechten. Umgekehrt stuende das rechte kurz im linken drin, und
   * `freieLage` schoebe es wieder weg.
   */
  /*
   * DIE STELLE DES MASTEN AUS DEM FELD - derselbe Weg wie das Ziehen.
   *
   * Zwei Wege zur selben Angabe muessen dieselbe Wirkung haben, sonst ist
   * einer von beiden der falsche. Das Feld meldet deshalb dieselbe Absicht
   * wie die Marke in der Leiste.
   */
  if (key === 'mastX') {
    const m = gewaehlterMast(werte);
    if (!m) return;
    return aendern('mastStelle', { mastId: m.id, x: Number(wert) || 0 });
  }
  if (key === 'mastStelle') {
    const r = ui.mastRollen(werte, wert.mastId);
    if (!r) return;
    const setzeAn = (id, feld, v) => {
      if ((werte.twId ?? 'T1') !== id) werte = tauscheAktives(werte, id);
      werte = { ...werte, [feld]: v };
    };
    if (r.alsB) {
      /*
       * DIE LAENGE WAECHST NICHT UEBER EINEN FREMDEN MASTEN HINWEG.
       *
       * Am Ende B gezogen wird das Joch laenger - und koennte dabei den
       * Masten schlucken, der daneben steht. `freieLaenge` haelt es an ihm
       * an; das Ende darf darauf liegen, denn dort steht dann der
       * gemeinsame Mast.
       */
      if ((werte.twId ?? 'T1') !== r.alsB.t.id) {
        werte = tauscheAktives(werte, r.alsB.t.id);
      }
      const roh = Math.max(0, wert.x - r.alsB.x0);
      werte = { ...werte, L: freieLaenge(werte, r.alsB.t.id, roh).L };
    }
    if (r.alsA) {
      /*
       * DAS RECHTE TRAGWERK BEHAELT SEINE LAENGE UND WANDERT MIT - aber
       * nicht in seinen Nachbarn hinein. `freieLage` entscheidet, wohin es
       * darf; die Regel steht dort und nicht ein zweites Mal hier.
       *
       * Beim GETEILTEN Masten laeuft das nach der Laengenaenderung des
       * linken Jochs: dessen rechtes Ende steht dann schon an der neuen
       * Stelle, und das rechte schliesst dort an.
       */
      if ((werte.twId ?? 'T1') !== r.alsA.t.id) {
        werte = tauscheAktives(werte, r.alsA.t.id);
      }
      werte = { ...werte, xLage: freieLage(werte, r.alsA.t.id, wert.x).x };
    }
    mastNachfuehren();
    neuRechnen();
    return;
  }
  /*
   * >>> EIN TRAGWERK BEISEITELEGEN. <<<
   *
   * Weisung vom 2. September: «wie könnte man einzelne tragabschnitte
   * komplett ausblenden im modell / Anbauteile / nachweis?»
   *
   * Ausblenden ist nicht Entfernen: die Eingaben bleiben stehen und kommen
   * unveraendert zurueck. Weg ist es aus Bild, Bauteilliste, Ausleitung und
   * Nachweis - «ausgeblendet» heisst «nicht da», sonst findet man seine
   * Zahlen weiter in der Auswertung.
   *
   * DAS GERECHNETE LAESST SICH NICHT AUSBLENDEN, ohne dass ein anderes an
   * seine Stelle tritt: eine Auswertung ohne ihren Gegenstand waere eine
   * leere Seite mit einer Zahl darauf. Deshalb wird zuerst umgeschaltet.
   */
  /*
   * DER RECHTSKLICK IN DER LEISTE laeuft ueber denselben Weg wie jede andere
   * Absicht - er oeffnet nur ein Menue und aendert selbst nichts.
   */
  /*
   * >>> EINE TASTE BELEGEN. <<<
   *
   * Weisung vom 2. September: «Tastenkürzel in die optionen aufnehmen und
   * anpassbar machen.»
   *
   * DOPPELTE BELEGUNGEN WERDEN ABGEWIESEN, nicht stillschweigend
   * uebernommen. Zwei Handlungen auf einer Taste heisst: eine davon laeuft
   * nie, und welche, entscheidet die Reihenfolge im Quelltext. Das waere ein
   * Kuerzel, das «manchmal» tut - die unbrauchbarste Art von Bedienung.
   *
   * DIE ZIFFERN 1 BIS 7 sind vergeben: sie waehlen die aufgetragene Groesse
   * und stehen als Reihe in der Uebersicht, nicht als einzelne Zeile. Wer
   * sie hier belegte, verlore sie dort - ohne dass es jemand sagt.
   */
  if (key === 'tasteBelegen') {
    const t = TASTEN.find((x) => x.id === wert.id);
    if (!t) return;
    const neu = String(wert.taste ?? '').toLowerCase();
    if (neu && neu >= '1' && neu <= '7') {
      ui.setzeTastenMeldung(`Die Taste «${neu}» wählt die aufgetragene `
        + 'Grösse und lässt sich nicht belegen.');
      return;
    }
    const belegt = neu && TASTEN.find(
      (x) => x.id && x.id !== t.id && tasteVon(x).toLowerCase() === neu);
    if (belegt) {
      ui.setzeTastenMeldung(
        `Die Taste «${neu}» liegt schon auf «${belegt.text}».`);
      return;
    }
    ui.setzeTastenMeldung('');
    handlung('Tastenkürzel', () => {
      const tasten = { ...(werte.tasten ?? {}) };
      // Die Vorgabe wird nicht als «Aenderung» gespeichert - so bleibt der
      // Knopf «zuruecksetzen» ehrlich und die Datei schlank.
      if (neu === t.taste) delete tasten[t.id]; else tasten[t.id] = neu;
      werte = { ...werte, tasten };
      neuRechnen();
    });
    return;
  }
  if (key === 'tastenZurueck') {
    ui.setzeTastenMeldung('');
    handlung('Tastenkürzel zurücksetzen', () => {
      werte = { ...werte, tasten: {} };
      neuRechnen();
    });
    return;
  }
  if (key === 'kontextTragwerk') {
    kontextZeigen(wert.bei, kontextTragwerk(wert.id));
    return;
  }
  if (key === 'kontextMast') {
    kontextZeigen(wert.bei, kontextMast(wert.id, werte.twId ?? 'T1'));
    return;
  }
  if (key === 'tragwerkAus') {
    const sichtbar = tragwerkeSortiert(werte).filter((t) => !versteckt(t));
    if (sichtbar.length < 2) return;
    if ((werte.twId ?? 'T1') !== wert) werte = tauscheAktives(werte, wert);
    werte = { ...werte, ausgeblendet: true };
    const naechstes = sichtbar.find((t) => t.id !== wert);
    if (naechstes) werte = tauscheAktives(werte, naechstes.id);
    mastNachfuehren();
    neuRechnen();
    return;
  }
  // Und zurueckholen: ein Klick auf den Umriss in der Leiste. Er macht es
  // gleich zum gerechneten - wer es zurueckholt, will daran arbeiten.
  if (key === 'tragwerkZeigen') {
    if ((werte.twId ?? 'T1') !== wert) werte = tauscheAktives(werte, wert);
    werte = { ...werte, ausgeblendet: false };
    mastNachfuehren();
    neuRechnen();
    return;
  }
  /*
   * >>> EIN MAST ANGEKLICKT HEISST: SEIN TRAGWERK IST GEMEINT. <<<
   *
   * Weisung vom 3. September: «Dieser Wert wird immernoch nicht nachgezogen
   * wenn ich einzelne masten anklicke in der schemadarstellung.» Gemeint war
   * «Lage auf dem Querprofil x0», das Feld unmittelbar unter der Leiste.
   *
   * Es stand still, weil `mastAktiv` NUR den Masten umschaltete. Auf einer
   * Jochreihe stand danach zweierlei in einer Maske: die Mastfelder galten
   * dem angeklickten Masten M1, Lage, Jochlaenge und Jochtyp weiterhin dem
   * gerechneten Tragwerk P2. Zwei Bezuege nebeneinander, und dem Bild sieht
   * man nicht an, welcher gerade gilt - das ist schlimmer als ein Feld, das
   * nicht nachzieht.
   *
   * DER GETEILTE MAST BLEIBT, WO ER IST. Haengt der angeklickte Mast schon
   * am gerechneten Tragwerk - der Zwischenmast einer Reihe haengt an zweien
   * -, wird nicht umgeschaltet. Sonst spraenge das Blatt beim Anklicken des
   * Zwischenmastes auf das Nachbarjoch, ohne dass jemand darum gebeten hat.
   */
  if (key === 'mastAktiv') {
    const m = mastenVon(werte).find((x) => x.id === wert);
    const jetzt = werte.twId ?? 'T1';
    if (m?.traegt?.length && !m.traegt.includes(jetzt)) {
      werte = tauscheAktives(werte, m.traegt[0]);
      // Erst aufraeumen, dann waehlen: `mastNachfuehrenGlobal` setzt
      // `mastAktiv` zurueck, wenn der Mast nicht zum gerechneten Tragwerk
      // gehoert - und genau das hat sich eben geaendert.
      mastNachfuehren();
    }
    werte = { ...werte, mastAktiv: wert };
    neuRechnen();
    return;
  }
  /*
   * EINE MASTANGABE GEHOERT DEM MASTEN, NICHT DEM TRAGWERK.
   *
   * Das ist der Gewinn des Umbaus und seine Falle zugleich: wer das Profil
   * des Zwischenmastes aendert, aendert es fuer BEIDE Tragwerke, die daran
   * haengen. Genau so soll es sein - es ist ein Mast.
   *
   * Geschrieben wird in die Liste, danach zurueckprojiziert: die Maske liest
   * weiterhin `werte.mastProfil`, und der Kern auch.
   */
  /*
   * >>> DIE LAENGE FOLGT DER HOEHE. <<<
   *
   * Weisung vom 5. September. `mastH` steht NICHT in MASTFELDER - die Hoehe
   * gehoert dem Jochende, nicht dem Masten (siehe `anschlusshoehe`). Sie
   * faellt deshalb durch bis zum allgemeinen Weg, und dort muss die
   * Kopplung sitzen.
   */
  /*
   * >>> DER FUSSPUNKT ZIEHT DIE LAENGE MIT. <<<
   *
   * Aus demselben Grund wie die Hoehe: die Laenge ist Fuss bis Kopf. Wer den
   * Fuss einen halben Meter tiefer setzt, braucht einen halben Meter mehr
   * Mast - solange die Laenge gekoppelt ist.
   */
  if (key === 'mastFuss' || key === 'mastFussB') {
    const feldL2 = key === 'mastFussB' ? 'mastLaengeB' : 'mastLaenge';
    const feldH2 = key === 'mastFussB' ? 'mastHB' : 'mastH';
    const H2 = Number(werte?.[feldH2] ?? werte?.mastH) || 0;
    const nach2 = mastLaengeNachfuehren(werte, feldL2,
                                        H2 - fussZu(werte, feldL2),
                                        H2 - (Number(wert) || 0));
    if (nach2) aendern(feldL2, nach2[feldL2]);
  }
  if (key === 'mastH' || key === 'mastHB') {
    /*
     * >>> DIE LAENGE GEHT DEN NORMALEN WEG, DIE HOEHE AUCH. <<<
     *
     * Hier stand ein eigener Zweig mit `return` - er setzte beide Felder von
     * Hand und war damit ein ZWEITER Weg neben dem allgemeinen. Genau das
     * ging schief: die Hoehe gehoert dem TRAGWERK und wird ueber den
     * allgemeinen Weg in dessen Satz geschrieben; mein Zweig setzte nur das
     * flache Feld, und `neuRechnen` las gleich darauf wieder den alten Wert
     * aus dem Satz. Im Feld stand 6.50, gespeichert blieb 7.50.
     *
     * Jetzt wird nur die LAENGE nachgezogen - ueber `aendern` selbst, also
     * ueber den Weg, den ein Mastfeld ohnehin nimmt (MASTFELDER, Liste,
     * Rueckprojektion). Danach faellt die Hoehe durch wie jedes andere Feld.
     */
    const feldL = key === 'mastHB' ? 'mastLaengeB' : 'mastLaenge';
    const f = fussZu(werte, feldL);
    const nach = mastLaengeNachfuehren(werte, feldL,
                                       (Number(werte?.[key]) || 0) - f,
                                       (Number(wert) || 0) - f);
    if (nach) aendern(feldL, nach[feldL]);
  }
  /*
   * >>> DIE ANKERFELDER SCHREIBEN AN DEN MASTEN. <<<
   *
   * Weisung vom 9. September: «bitte danach die moeglichkeit Zuganker oder
   * Drucksuetzen an den masten zu modelieren.»
   *
   * Anders als Profil und Hoehe haben sie keinen flachen Zwilling im Satz -
   * sie beschreiben EIN Bauteil an EINEM Masten. Deshalb ein eigener Zweig
   * statt eines Eintrags in MASTFELDER: dort stuende ein Feldpaar, von dem
   * die eine Haelfte nirgends hingehoert.
   *
   * DER TYP SCHALTET DAS BAUTEIL. Auf «keiner» gestellt verschwindet der
   * ganze Anker, nicht nur sein Typ - ein halber Anker waere weder zu
   * zeichnen noch nachzuweisen.
   */
  if (key === 'ankerWinkel') {
    /*
     * DER WINKEL VERSTELLT DIE HOEHE. Er wird nicht gespeichert - siehe
     * ANKER_WINKEL. Aus dem Rahmen faellt er nicht: unter 5 und ueber
     * 85 Grad ist ein Anker keiner mehr, und die Hoehe liefe gegen null
     * oder ins Unendliche.
     */
    const id = werte.mastAktiv ?? gewaehlterMast(werte)?.id;
    const alt = id ? (mastenVon(werte).find((m) => m.id === id)?.anker ?? null)
                   : null;
    if (!alt?.typ) { neuRechnen(); return; }
    const g = Math.max(5, Math.min(85, Number(wert) || 0));
    const h = Math.round((Number(alt.a) || 0)
                         * Math.tan((g * Math.PI) / 180) * 100) / 100;
    werte = setzeMastAnker(werte, id, { ...alt, h });
    neuRechnen();
    return;
  }
  if (ANKERFELDER[key]) {
    const id = werte.mastAktiv ?? gewaehlterMast(werte)?.id;
    if (!id) { neuRechnen(); return; }
    const alt = mastenVon(werte).find((m) => m.id === id)?.anker ?? null;
    if (key === 'ankerTyp' && !String(wert ?? '').trim()) {
      werte = setzeMastAnker(werte, id, null);
    } else {
      werte = setzeMastAnker(werte, id,
        { ...ANKER_STANDARD, richtung: ankerRichtungVor(werte),
          ...(alt ?? {}), [ANKERFELDER[key]]: wert });
    }
    neuRechnen();
    return;
  }
  if (MASTFELDER.some((f) => f.flach === key || f.flachB === key)) {
    /*
     * DIE KACHEL SAGT, WELCHER MAST GEMEINT IST.
     *
     * Seit dem 2. September steht ueber den Mastfeldern eine Kachelreihe -
     * ein Eintrag je Mast des Blattes. Was in den Feldern steht, gilt dem
     * angeklickten; `mastAktiv` traegt seine Id. Ohne Kachelwahl bleibt es
     * beim frueheren Weg (Ende A, ersatzweise B), und eine Datei aus der
     * Zeit davor verhaelt sich unveraendert.
     */
    const ende = MASTFELDER.some((f) => f.flachB === key) ? 'B' : 'A';
    werte = setzeMastAngabe(werte, werte.mastAktiv ?? ende, key, wert);
    werte = rechensatz(werte);
    neuRechnen();
    return;
  }
  if (key === 'bearbeiten') {
    werte = { ...werte, bearbeiten: wert };
    neuRechnen();
    return;
  }
  if (key === 'lastenBearbeiten') {
    // Entsperren heisst: ab jetzt gelten die angezeigten Werte als Eingabe.
    // Sperren heisst: zurück auf die Sortimentstabelle.
    werte = { ...werte, lastenBearbeiten: wert,
              lastHerkunft: wert ? 'manuell' : 'tabelle' };
    neuRechnen();
    return;
  }
  /*
   * AUCH DAS ZAHLENFELD DARF NICHT IN DEN NACHBARN SCHIEBEN.
   *
   * Sonst haette man zwei Wege zur selben Angabe mit zwei verschiedenen
   * Regeln - der eine schuetzt, der andere nicht -, und der ungeschuetzte
   * ist der, den man beim genauen Arbeiten benutzt.
   */
  /*
   * DIE JOCHLAENGE HAELT AM NAECHSTEN MASTEN AN.
   *
   * Weisung vom 3. September: «die tragwerkseingabe auf kollisionen checken
   * so dass joche nicht durch angrenzende masten hindurchgehen können.»
   *
   * Dieselbe Regel wie beim Verschieben, nur von der anderen Seite: dort
   * wandert das Joch auf den Masten zu, hier waechst es auf ihn zu. Beides
   * endet an derselben Stelle, und beides gehoert an den Weg, ueber den die
   * Angabe hereinkommt - Feld wie Schieber.
   */
  if (key === 'L') {
    const frei = freieLaenge(werte, werte.twId ?? 'T1', Number(wert) || 0);
    werte = { ...werte, L: frei.L };
    mastNachfuehrenGlobal();
    neuRechnen();
    return;
  }
  if (key === 'xLage') {
    const frei = freieLage(werte, werte.twId ?? 'T1', Number(wert) || 0);
    werte = { ...werte, xLage: frei.x };
    mastNachfuehren();
    neuRechnen();
    return;
  }
  werte = { ...werte, [key]: wert };

  // Normensatz gewählt: die Beiwerte auf den Satz setzen
  if (key === 'normensatz' && wert !== 'frei') {
    const n = NORMENSAETZE.find((x) => x.key === wert);
    if (n) werte = { ...werte, ...n.beiwerte };
  }
  // Beiwert von Hand geändert: der Satz gilt nicht mehr
  if (['gammaG', 'gammaQ', 'psi0'].includes(key)) {
    werte = { ...werte, normensatz: erkenneNormensatz(werte)?.key ?? 'frei' };
  }
  // Ansichtseinstellungen wirken sofort, ohne neu zu rechnen
  if (['modellTransparenz', 'modellSchrift', 'modellSchriftLast',
       'modellSchriftMass', 'projektion', 'blickwinkel'].includes(key)) {
    uebernehmeAnsichtsoptionen();
    ansicht.zeichne();
    speichern();
    return;
  }

  if (key === 'typ' && wert !== 'frei') {
    const j = getTragjoch(wert);
    werte = typUebernehmen(werte, j);
    const b = laengenbereich(j);
    werte.L = Math.min(Math.max(werte.L, b.min), b.max);
    werte.bearbeiten = false;
  }
  if (key === 'L') {
    // Nachweisschnitt darf nicht ausserhalb liegen
    werte.xNachweis = Math.min(werte.xNachweis ?? 0, wert);
  }
  if (key === 'xNachweis') {
    station = null;
  }
  /*
   * RADIUS UND WINKEL HALTEN EINANDER NACH (Weisung, 28. August: «je nachdem,
   * was zuerst eingegeben wird, wird der andere Wert wiedergegeben»).
   *
   * Beide Felder stehen nebeneinander, und beide sind Eingabe. Wer den Radius
   * eintippt, sieht den Winkel; wer den Winkel eintippt, sieht den Radius.
   * Eine Auswahl «woher kommt der Ablenkwinkel» stand vorher davor - eine
   * Frage, die man beantworten musste, bevor man das Feld benutzen durfte.
   *
   * >>> NUR EINE ZAHL WIRD GEFUEHRT: DER RADIUS. <<<
   * Der Winkel wird aus ihm GEZEIGT (`wertAus` im Schema) und hier
   * zurueckgeschrieben. Zwei gespeicherte Zahlen fuer dieselbe Groesse liefen
   * frueher oder spaeter auseinander - spaetestens beim Oeffnen einer
   * aelteren Datei, in der nur der Radius steht; dann zeigte das eine Feld
   * einen Bogen von 300 km und das andere −4.5 Grad, und beide saehen
   * richtig aus.
   *
   * Waehrend man tippt, bleibt der eingetippte Text stehen: die Maske
   * ueberspringt das Feld, in dem der Zeiger steht.
   */
  if (key === 'trasseWinkel') {
    const R = radiusAusWinkel(werte.flSpannweite ?? 0, wert);
    // Auf den Zentimeter: bei 50 m Spannweite verschoebe ein Dezimeter den
    // zurueckgerechneten Winkel schon in der dritten Stelle, und das Feld
    // spraenge unter der Hand.
    // NULL HEISST GERADE. Der Winkel 0 hatte hier einen Radius von 900 km
    // eingetragen - rechnerisch dasselbe, aber im Feld steht dann eine Zahl,
    // die niemand eingegeben hat und die wie ein Messwert aussieht.
    // `istGerade` behandelt 0 seit je als gerades Gleis.
    werte = { ...werte, trasseRadius: R === null ? 0
                                                 : Math.round(R * 100) / 100 };
  }
  neuRechnen();
  // Die Orientierung entscheidet, WAS man sehen muss: der Querschnitt liegt an
  // einer Stelle, der Laengsschnitt laeuft ueber die ganze Spannweite. Ohne
  // das hier blieb nach dem Umschalten der Ausschnitt der vorigen Orientierung
  // stehen - beim Laengsschnitt sieben Bleche von dreiunddreissig.
  if (key === 'schnittOrientierung' && werte.schnittAktiv) {
    zeigeSchnittImModell();
  }
}

/** Nur die Teile, die an einem Masten haengen - die des Jochs gehen mit ihm. */
const nurMastteile = (liste) => (liste ?? []).filter((a) => a?.ort === 'mastA' || a?.ort === 'mastB');

function setzeAnbauteile(liste) {
  /*
   * >>> NICHTS UNTER DIE FUNDAMENTKOTE (Weisung vom 18. September). <<<
   *
   * «eine last unterhalb der fundamentkote sollte nicht möglich sein, da
   * dies dann unter terrain wäre.» Alle Eingabewege laufen hier durch -
   * Schieber, Kontextmenue, Setzen, Kopieren. Ein Teil, das tiefer haengt,
   * als es befestigt ist, wird auf die kleinste zulaessige Hoehe gehoben,
   * und der Balken sagt es.
   */
  const gehoben = [];
  liste = (liste ?? []).map((a) => {
    const tief = haengeTiefe(a);
    if (!(tief > 0) || (Number(a.hMast) || 0) >= tief - 1e-9) return a;
    const h = Math.ceil(tief * 20 - 1e-9) / 20;
    gehoben.push(`${a.name ?? 'Anbauteil'} auf ${h.toFixed(2)} m`);
    return { ...a, hMast: h };
  });
  if (gehoben.length) {
    meldeImBalken(`Nicht unter die Fundamentkote: ${gehoben.join(', ')} angehoben`);
  }
  /*
   * WAS AM MASTEN HAENGT, WIRD AM MASTEN ABGELEGT.
   *
   * `setzeAnbauteileAn` teilt die Liste auf - Jochteile ans Tragwerk,
   * Mastteile an ihren Masten - und gibt die fertige Projektion zurueck.
   * Die Maske liest sie unmittelbar; ein zweiter Schritt, den man vergessen
   * koennte, entfaellt.
   */
  werte = setzeAnbauteileAn(werte, liste);
  neuRechnen();
}

function dialogKlassen() {
  if (!letzte) return;
  dialog('Querschnittsklassen, Herleitung', ui.klassenTabelle(letzte.kl), '');
}

/**
 * SORTIMENT DURCHRECHNEN - und was jetzt?
 *
 * Das Werkzeug sagte bisher klar, DASS es nicht hält und welche Stelle
 * massgebend ist. Die nächste Frage stellt sich von selbst und blieb offen:
 * welcher Typ hält denn? Das ist keine Kunst, nur Fleissarbeit - genau das,
 * was ein Rechner besser kann als ein Mensch mit einer Auswahlliste.
 *
 * ZWEI REGELN, die hier bindend sind:
 *
 *   1. DER TYP WECHSELT NICHT VON SELBST. Gerechnet wird auf Kopien; die
 *      Auswahl bleibt die Entscheidung des Benutzers. Ein Werkzeug, das den
 *      Nachweis dadurch erfüllt, dass es das Tragwerk austauscht, ist kein
 *      Nachweiswerkzeug.
 *
 *   2. WAS NICHT GEHT, WIRD GESAGT. Nicht jeder Typ trägt jede Länge - das
 *      Sortiment gibt je Typ einen Längenbereich vor. Solche Zeilen fallen
 *      nicht weg, sie stehen mit ihrem Grund da.
 *
 * Alles Übrige bleibt, wie es eingegeben wurde: Profile, Bleche und Masse
 * kommen beim Typwechsel aus der Datenbank (typUebernehmen), die Lasten und
 * die Anbauteile bleiben unangetastet.
 */
function dialogSortiment() {
  if (!letzte) return;
  const stahl = getStahl(werte.stahl);
  const f0 = (v) => (Number.isFinite(v) ? v.toFixed(0) : '–');
  const f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : '–');
  const f3 = (v) => (Number.isFinite(v) ? v.toFixed(3) : '–');
  /*
   * >>> BEIM ABFANGJOCH SEIN EIGENES SORTIMENT. <<<
   *
   * Weisung vom 9. September: «den groesseren typ pruefen der die
   * abfangkraft traegt.»
   *
   * Der Dialog rechnete nur Tragjoche durch - beim Abfangjoch waere die
   * Liste die eines fremden Bauteils gewesen. Jetzt gilt dieselbe Frage fuer
   * beide Sortimente: welcher Typ traegt DIESE Lasten bei DIESER Laenge.
   *
   * Der Unterschied liegt nur in den Quellen: `abfangAuswertung` statt
   * `berechne`, das Abfangjoch-Sortiment statt der Typendatenbank, und die
   * Lasten des Jochs kommen aus seiner eigenen Tabelle (Gewicht, Wind,
   * Schnee je Typ) statt aus den Feldern der Maske.
   */
  if (tragwerksart(werte).key === 'abfangjoch') {
    dialogSortimentAbfang({ f0, f2, f3 });
    return;
  }

  const zeilen = tragjoche().map((j) => {
    const b = laengenbereich(j);
    if (werte.L < b.min - 1e-9 || werte.L > b.max + 1e-9) {
      return { typ: j.typ, name: j.typ, eta: null,
               grund: `Länge ${f2(werte.L)} m ausserhalb ${f2(b.min)} … ${f2(b.max)} m` };
    }
    try {
      const w = typUebernehmen({ ...werte }, j);
      const e = berechne(w, getProfil(w.profOG), getProfil(w.profUG), stahl, j);
      return { typ: j.typ, name: j.typ, eta: e.max.etaGesamt,
               masse: `${f0(w.jd)} × ${f0(w.jbbOG)} mm`,
               profil: w.profOG, gewicht: j.gewicht ?? null };
    } catch (f) {
      return { typ: j.typ, name: j.typ, eta: null, grund: String(f.message ?? f) };
    }
  });

  // Nach Ausnutzung, aber die Tragfähigen zuerst - gesucht ist der kleinste,
  // der noch hält, und der steht damit zuoberst unter den grünen.
  const traegt = zeilen.filter((z) => z.eta !== null && z.eta <= 1)
    .sort((a, b) => b.eta - a.eta);
  const zuKlein = zeilen.filter((z) => z.eta !== null && z.eta > 1)
    .sort((a, b) => a.eta - b.eta);
  const geht = zeilen.filter((z) => z.eta === null);

  const zeile = (z) => `
    <tr class="${z.eta === null ? '' : z.eta <= 1 ? 'klick' : 'klick nok'}"
        ${z.eta === null ? '' : `data-typ="${esc(z.typ)}"`}>
      <td><b>${esc(z.name)}</b>${z.typ === werte.typ
        ? ' <span class="ablage-meta">gewählt</span>' : ''}</td>
      <td class="num">${z.eta === null ? '–' : f3(z.eta)}</td>
      <td>${z.eta === null ? esc(z.grund)
        : `${esc(z.masse)} · ${esc(z.profil)}${
            z.gewicht ? ` · ${f0(z.gewicht)} kg/m` : ''}`}</td>
    </tr>`;

  const block = (titel, liste) => (liste.length ? `
    ${abschnitt(titel, `${liste.length} Typ${liste.length === 1 ? '' : 'en'}`)}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Typ</th><th class="num">η</th><th>Masse · Gurtprofil</th></tr></thead>
      <tbody>${liste.map(zeile).join('')}</tbody></table></div>` : '');

  dialog('Sortiment durchrechnen',
    `<p class="notiz" style="margin-top:0">Dieselbe Geometrie, dieselben Lasten,
       dieselben Anbauteile, nur der Tragjoch-Typ wechselt. Profile, Bleche und
       Masse kommen dabei aus der Typendatenbank.
       <b>Der gewählte Typ ändert sich nicht von selbst:</b> eine Zeile
       anklicken übernimmt ihn.</p>
     ${block('Trägt', traegt)}
     ${block('Zu klein', zuKlein)}
     ${block('Nicht gerechnet', geht)}`,
    '<button class="btn" data-zu>Schliessen</button>', 'dialog-breit');

  ui.el('ueberlagerung').querySelectorAll('[data-typ]').forEach((tr) => {
    tr.addEventListener('click', () => {
      ui.el('ueberlagerung').querySelector('[data-zu]')?.click();
      aendern('typ', tr.dataset.typ);
    });
  });
}

/**
 * >>> WELCHER ABFANGJOCHTYP TRAEGT DIESE LASTEN? <<<
 *
 * Weisung vom 9. September: «den groesseren typ pruefen der die abfangkraft
 * traegt.» Dieselbe Frage wie beim Tragjoch, dasselbe Verfahren - nur das
 * Sortiment und der Rechenkern sind andere.
 *
 * >>> DIE LAENGE ENTSCHEIDET MIT. <<<
 *
 * Das Abfangjoch-Sortiment fuehrt je Typ einen Laengenbereich, und die
 * Bereiche ueberlappen nur teilweise: A160 endet bei 12.50 m, A300 beginnt
 * bei 13.00 m. Ein Typ, der die eingestellte Laenge NICHT fuehrt, wird
 * deshalb nicht stillschweigend uebergangen - er steht mit seinem Bereich
 * da. Sonst suchte man den naechstgroesseren und faende ihn nicht.
 */
function dialogSortimentAbfang({ f0, f2, f3 }) {
  const satz = tragwerkSatz(werte);
  const jt = Number(werte.L) || 0;
  const qpEk = { EK1: '0.9', EK2: '1.1', EK3: '1.3' }[satz.ek] ?? '1.1';
  const sKl = String(satz.schneeKlasse ?? '1.25');

  const zeilen = abfangjoche().map((a) => {
    const b = abfangLaengenbereich(a);
    const grund = jt < b.min - 1e-9 || jt > b.max + 1e-9
      ? `Länge ${f2(jt)} m ausserhalb ${b.text}` : null;
    if (grund) return { typ: a.typ, eta: null, grund, profil: a.profil };
    try {
      const r = abfangAuswertung({
        typ: a.typ, jt,
        gk: (a.gewicht ?? 0) * 9.81 / 1000,
        wk: a.wind?.[qpEk] ?? 0,
        sk: satz.schneeAktiv === false ? 0 : (a.schnee?.[sKl] ?? 0),
        anbauteile: satz.anbauteile ?? [],
        gammaG: werte.gammaG, gammaQ: werte.gammaQ, psi0: werte.psi0,
        fyd: abfangFyd(getStahl(werte.stahl), werte.gammaM0), ek: satz.ek,
        L_FL: satz.L_FL, R: satz.R, knotenbereich: 'anschnitt',
      });
      if (!r) return { typ: a.typ, eta: null, profil: a.profil,
                       grund: 'nicht rechenbar — Blechlage nicht erfasst' };
      return { typ: a.typ, eta: r.max.eta, profil: a.profil,
               etaGurt: r.gurt?.eta, etaBlech: r.blech?.eta,
               N: r.gurt?.N, gewicht: a.gewicht ?? null };
    } catch (f) {
      return { typ: a.typ, eta: null, profil: a.profil,
               grund: String(f.message ?? f) };
    }
  });

  const traegt = zeilen.filter((z) => z.eta !== null && z.eta <= 1)
    .sort((a, b) => b.eta - a.eta);
  const zuKlein = zeilen.filter((z) => z.eta !== null && z.eta > 1)
    .sort((a, b) => a.eta - b.eta);
  const geht = zeilen.filter((z) => z.eta === null);

  const zeile = (z) => `
    <tr class="${z.eta === null ? '' : z.eta <= 1 ? 'klick' : 'klick nok'}"
        ${z.eta === null ? '' : `data-abfangtyp="${esc(z.typ)}"`}>
      <td><b>${esc(z.typ)}</b>${z.typ === werte.abfangTyp
        ? ' <span class="ablage-meta">gewählt</span>' : ''}</td>
      <td class="num">${z.eta === null ? '–' : f3(z.eta)}</td>
      <td>${z.eta === null ? esc(z.grund)
        : `${esc(z.profil)} · Gurt ${f3(z.etaGurt)} · Blech ${f3(z.etaBlech)}`
          + ` · N ${f0(Math.abs(z.N ?? 0))} kN`
          + `${z.gewicht ? ` · ${f0(z.gewicht)} kg/m` : ''}`}</td>
    </tr>`;

  const block = (titel, liste) => (liste.length ? `
    ${abschnitt(titel, `${liste.length} Typ${liste.length === 1 ? '' : 'en'}`)}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Typ</th><th class="num">η</th>
        <th>Profil · Gurt · Blech · Kräftepaar</th></tr></thead>
      <tbody>${liste.map(zeile).join('')}</tbody></table></div>` : '');

  dialog('Sortiment durchrechnen',
    `<p class="notiz" style="margin-top:0">Dieselbe Länge (${f2(jt)} m),
       dieselben Anbauteile und Beiwerte, nur der Abfangjoch-Typ wechselt.
       Eigengewicht, Wind und Schnee des Jochs kommen dabei aus der
       Sortimentstabelle des jeweiligen Typs.
       <b>Der gewählte Typ ändert sich nicht von selbst:</b> eine Zeile
       anklicken übernimmt ihn.</p>
     ${block('Trägt', traegt)}
     ${block('Zu klein', zuKlein)}
     ${block('Nicht gerechnet', geht)}`,
    '<button class="btn" data-zu>Schliessen</button>', 'dialog-breit');

  ui.el('ueberlagerung').querySelectorAll('[data-abfangtyp]').forEach((tr) => {
    tr.addEventListener('click', () => {
      ui.el('ueberlagerung').querySelector('[data-zu]')?.click();
      aendern('abfangTyp', tr.dataset.abfangtyp);
    });
  });
}

/**
 * HANDBUCH: Herleitung des Rechenwegs und Grenzen des Modells.
 *
 * Es steht bewusst im Banner und nicht in einem Reiter der Auswertung: es
 * gehört nicht zu einem einzelnen Ergebnis, sondern zum ganzen Werkzeug. Wer
 * eine Zahl nicht einordnen kann, soll ohne Umweg hierher kommen.
 *
 * Beim Drucken wird nur das Handbuch gesetzt (Klasse am body); sonst käme das
 * Arbeitsblatt mit aufs Papier.
 */
/** Farbtokens eines Themas – für Ausleitungen, die kein Skript ausführen. */
const farbtokens = (thema) => farben[thema] ?? farben.hell;

function dialogHandbuch() {
  const d = dialog('Handbuch, Herleitung und Modellgrenzen', handbuchHtml(),
    '<button class="btn" data-datei>Als Datei sichern</button>' +
    '<button class="btn" data-drucken>Drucken / PDF</button>' +
    '<button class="btn" data-zu>Schliessen</button>', 'dialog-breit');

  // Das Handbuch als eigenständige HTML-Datei – Beilage zur Statik, ohne
  // dass die ganze Anwendung mitgeschickt werden muss.
  d.node.querySelector('[data-datei]').onclick = () => {
    // Helles Thema: die Datei wird gelesen, beigelegt und gedruckt.
    const html = handbuchDatei({ fussnote: `${APP_NAME} ${VERSION}`,
                                 tokens: farbtokens('hell') });
    store.dateiSpeichern(html, `${APP_NAME}_Handbuch_${new Date().toISOString().slice(0, 10)}.html`,
                         'text/html;charset=utf-8');
  };

  const koerper = d.node.querySelector('.dialog-koerper');
  const eintraege = [...d.node.querySelectorAll('.hb-toc-e')];
  const abschnitte = [...d.node.querySelectorAll('.hb-abschnitt')];
  // Lage eines Abschnitts IM Bildlauffenster. Über offsetTop ginge es nicht:
  // der nächste positionierte Vorfahr ist der Vorhang, nicht der Textkörper.
  const lage = (s) =>
    s.getBoundingClientRect().top - koerper.getBoundingClientRect().top
    + koerper.scrollTop;

  // Inhaltsverzeichnis: Sprung innerhalb des Dialogs, nicht der Seite - ein
  // Anker würde die ganze Anwendung scrollen.
  eintraege.forEach((a) => {
    a.onclick = () => {
      const ziel = d.node.querySelector(`#hb-${a.dataset.zu}`);
      if (!ziel) return;
      koerper.scrollTop = lage(ziel) - 8;
      eintraege.forEach((x) => x.classList.remove('on'));
      a.classList.add('on');
    };
  });
  // Mitlaufende Markierung im Verzeichnis
  koerper.onscroll = () => {
    const y = koerper.scrollTop + 24;
    let letzterId = abschnitte[0]?.id.replace(/^hb-/, '') ?? null;
    abschnitte.forEach((s) => {
      if (lage(s) <= y) letzterId = s.id.replace(/^hb-/, '');
    });
    eintraege.forEach((x) => x.classList.toggle('on', x.dataset.zu === letzterId));
  };
  koerper.onscroll();

  d.node.querySelector('[data-drucken]').onclick = () => {
    document.body.classList.add('druck-handbuch');
    window.print();
    document.body.classList.remove('druck-handbuch');
  };
}

/**
 * Optionen: alles, was die Rechnung steuert, aber nicht zum Bauteil gehört.
 * Der Dialog bleibt offen, während gerechnet wird - so sieht man die Wirkung
 * einer Änderung sofort in der Auswertung.
 */
/**
 * Welcher Reiter der Optionen zuletzt offen stand.
 *
 * Er ueberlebt das Schliessen des Dialogs: wer an den Lastbeiwerten arbeitet,
 * schliesst, rechnet, schaut nach - und will nicht jedes Mal wieder
 * hinklicken.
 */
let optThema = 'modell';

function dialogOptionen() {
  const koerper = () =>
    ui.optionenReiterHtml(werte, optThema)
    + `<div id="opt-koerper">${ui.optionenHtml(werte, optThema)}</div>`;
  // FESTE HOEHE (Weisung, 1. September): sechs Reiter mit sehr verschieden
  // viel Inhalt, und der Scrim zentriert. Ohne feste Hoehe sprang das Fenster
  // bei jedem Reiterwechsel.
  const d = dialog('Optionen', `<div id="opt-rahmen">${koerper()}</div>`,
    `<button class="btn" data-bauteildaten>${icon('tabelle', 13)} Bauteildaten</button>
     <button class="btn" data-tasten>${icon('tastatur', 13)} Tastenkürzel</button>
     <button class="btn" data-thema>${thema === 'dunkel' ? 'Helle' : 'Dunkle'} Darstellung</button>
     <button class="btn btn-fail" data-reset>Eingaben zurücksetzen</button>
     <button class="btn" data-zu>Fertig</button>`, 'dialog-reiter');

  // Der Reiter faellt beim Neuaufbau nicht heraus: gezeichnet wird IMMER der
  // ganze Rahmen samt Leiste, und optThema sagt, welcher offen ist. Nur den
  // Koerper zu tauschen haette die Leiste stehen lassen - und mit ihr die
  // Hervorhebung des vorigen Reiters.
  const verdrahte = () => {
    const rahmen = ui.el('opt-rahmen');
    rahmen.querySelectorAll('[data-opt-thema]').forEach((b) => {
      b.onclick = () => {
        optThema = b.dataset.optThema;
        hoeheWandern(neu);
      };
    });
    ui.verdrahteOptionen(ui.el('opt-koerper'), werte, (k, v, zwischenstand) => {
      aendern(k, v);
      // Abhaengige Felder gehen mit - aber erst, wenn die Eingabe steht.
      // Waehrend des Tippens bliebe sonst keine mehrstellige Zahl stehen.
      if (!zwischenstand) neu();
    });
    /*
     * DER REITER «DATENBASIS» wird hier verdrahtet, nicht in ui.js: dort ist
     * die Form zu Hause, hier die Handlung. Dateien lesen, das Paket
     * anwenden und die Anwendung neu starten gehoert in die Anwendung.
     */
    const stand = (text, schlecht = false) => {
      const n = ui.el('d-paket-stand');
      if (!n) return;
      n.textContent = text;
      n.style.color = schlecht ? 'var(--fail, #c00)' : '';
    };
    const datei = rahmen.querySelector('#d-paket');
    if (datei) datei.onchange = async (ev) => {
      const f = ev.target.files?.[0];
      if (!f) return;
      try {
        const obj = JSON.parse(await f.text());
        const p = pruefePaket(obj);
        if (!p.ok) { stand(p.fehler.join(' '), true); return; }
        paketAnwenden(obj);
        stand(`Geladen: ${p.teile.map((x) => `${x.anzahl} ${x.einheit}`).join(' · ')}`
              + ' — die Anwendung wird neu gestartet.');
        setTimeout(() => location.reload(), 900);
      } catch (fehler) {
        stand(`Datei nicht lesbar: ${fehler.message}`, true);
      }
    };
    const fenster = rahmen.querySelector('[data-daten-fenster]');
    if (fenster) fenster.onclick = () => dialogBauteildaten();
    const sichern = rahmen.querySelector('[data-daten-sichern]');
    if (sichern) sichern.onclick = () => {
      try {
        const paket = paketAus(projekt.projekt || '');
        store.dateiSpeichern(JSON.stringify(paket, null, 1),
                             `${APP_NAME}_Datenpaket_${paket.stand}.json`);
      } catch (fehler) {
        stand(`Nichts zu sichern: ${fehler.message}`, true);
      }
    };
    const leeren = rahmen.querySelector('[data-daten-leeren]');
    if (leeren) leeren.onclick = () => {
      speicherLeeren();
      stand('Hinterlegtes Paket gelöscht, beim nächsten Start ist es weg.');
    };

    // Die Nachweisschalter tragen keinen Feldschluessel: sie sitzen zusammen
    // in EINEM Wert. Einzeln geschrieben ginge die uebrige Auswahl verloren.
    rahmen.querySelectorAll('[data-nachweis]').forEach((inp) => {
      inp.onchange = () => {
        aendern('nachweise', { ...(werte.nachweise ?? {}),
                               [inp.dataset.nachweis]: inp.checked });
        neu();
      };
    });
  };
  /*
   * DER FOKUS UEBERLEBT DEN NEUAUFBAU.
   *
   * Ein Zahlenfeld meldet jede Taste (`input`), und jede Meldung baute den
   * ganzen Rahmen neu. Danach war das Feld ein ANDERES DOM-Element: der
   * Fokus lag nirgends, die Schreibmarke war fort, und es liess sich immer
   * nur eine Ziffer eintippen, dann musste man neu hineinklicken.
   *
   * Neu gebaut werden muss trotzdem, denn abhaengige Felder gehen mit. Also
   * wird gemerkt, wo der Zeiger stand, und danach dorthin zurueckgesetzt.
   * Die Auswahl (selectionStart/End) kommt mit, sonst springt die Marke bei
   * jeder Ziffer ans Ende und ein Einfuegen in der Mitte ist unmoeglich.
   */
  /*
   * DIE HOEHE WANDERT, STATT ZU SPRINGEN.
   *
   * Der Versuch, das allein mit CSS zu loesen, ist gescheitert, und der Grund
   * ist lehrreich: `transition: height` braucht einen Startwert, den es bei
   * einer Hoehe aus dem Inhalt nicht gibt. Auch mit `height: auto` und
   * `interpolate-size` sprang sie - nachgemessen von 308 auf 794 px, und
   * vierzehn Bilder hintereinander zeigten bereits den Endwert. Der Grund ist
   * der harte Austausch: der ganze Rahmen wird ersetzt, und der Browser sieht
   * keinen Zwischenzustand.
   *
   * Also von Hand, in der ueblichen Folge: alte Hoehe festhalten, tauschen,
   * neue Hoehe messen, dann von der einen zur anderen laufen lassen und am
   * Ende wieder freigeben. Die Freigabe ist wichtig - bliebe eine feste Hoehe
   * stehen, wuerde der naechste Inhalt abgeschnitten.
   */
  const hoeheWandern = (tauschen) => {
    const k = d.node.querySelector('.dialog');
    if (!k || typeof k.animate !== 'function') { tauschen(); return; }
    const von = k.getBoundingClientRect().height;
    tauschen();
    const bis = k.getBoundingClientRect().height;
    if (Math.abs(bis - von) < 1) return;
    // Die Dauer folgt der Vorgabe der Anwendung; ausgelesen statt geraten,
    // damit «Bewegung reduzieren» auch hier gilt.
    const stil = getComputedStyle(document.documentElement);
    const ms = (parseFloat(stil.getPropertyValue('--t-ruhig')) || 0.3) * 1000;
    k.animate([{ height: `${von}px` }, { height: `${bis}px` }],
              { duration: ms, easing: 'cubic-bezier(.22, 1, .3, 1)' });
  };

  const neu = () => {
    const vorher = document.activeElement;
    const merk = vorher && vorher.dataset && vorher.dataset.feld
      ? { feld: vorher.dataset.feld, text: vorher.value,
          von: vorher.selectionStart, bis: vorher.selectionEnd }
      : null;
    ui.el('opt-rahmen').innerHTML = koerper();
    verdrahte();
    if (!merk) return;
    const wieder = ui.el('opt-rahmen')
      .querySelector(`[data-feld="${merk.feld}"]`);
    if (!wieder) return;
    /*
     * DER GETIPPTE TEXT UEBERLEBT AUCH.
     *
     * Der Fokus allein genuegte nicht. Das neu gebaute Feld traegt den
     * GEPARSTEN Wert aus `werte`, nicht den getippten Text - und wer «1.25»
     * eingibt, tippt zwischendurch «1.», was als Zahl 1 ist. Das Feld sprang
     * auf «1» zurueck, die naechste Ziffer machte «12» daraus, und am Ende
     * stand «25». Genau die Beobachtung des Auftraggebers: es gehen nur
     * einzelne Ziffern.
     *
     * Solange der Zeiger im Feld steht, gilt deshalb der getippte Text.
     */
    if (merk.text !== undefined && wieder.value !== merk.text) {
      wieder.value = merk.text;
    }
    wieder.focus();
    // Nur Textfelder kennen eine Schreibmarke; ein Auswahlfeld wirft hier.
    try {
      if (merk.von !== null && merk.von !== undefined) {
        wieder.setSelectionRange(merk.von, merk.bis);
      }
    } catch { /* Feldart ohne Schreibmarke */ }
  };
  verdrahte();
  d.node.querySelector('[data-thema]').onclick = () => { d.zu(); themaWechseln(); };
  d.node.querySelector('[data-bauteildaten]').onclick = () => { d.zu(); dialogBauteildaten(); };
  d.node.querySelector('[data-tasten]').onclick = () => { d.zu(); dialogTasten(); };
  d.node.querySelector('[data-reset]').onclick = () => { d.zu(); zuruecksetzen(); };
}

// --- Lastfälle --------------------------------------------------------------
/**
 * Knöpfe der Lastfallmatrix.
 *
 * Die vorgegebenen Lastfälle folgen dem Normensatz. Wird ein Beiwert von Hand
 * geändert, merkt sich werte.lastfallAnpassung genau diese Abweichung - der
 * Rest des Lastfalls folgt weiterhin dem Normensatz, und «×» nimmt die
 * Anpassung wieder zurück. Eigene Lastfälle stehen vollständig in
 * werte.lastfaelleEigen.
 */
/** Knöpfe in den mitgeführten Ergebnisstücken der Eingabemaske. */
function verdrahteExtras() {
  ui.el('maske').querySelectorAll('[data-qsk]').forEach((b) => {
    b.onclick = () => dialogKlassen();
  });
  verdrahteLastfaelle();
}

function verdrahteLastfaelle() {
  const n = ui.el('maske');
  n.querySelectorAll('[data-lf]').forEach((b) => {
    b.onclick = () => dialogLastfall(b.dataset.lf);
  });
  n.querySelectorAll('[data-lf-neu]').forEach((b) => {
    b.onclick = () => dialogLastfall(null);
  });
  n.querySelectorAll('[data-lf-weg]').forEach((b) => {
    b.onclick = () => entferneLastfall(b.dataset.lfWeg);
  });
}

function entferneLastfall(key) {
  const lf = lastfaelle(werte).find((l) => l.key === key);
  if (!lf) return;
  if (lf.eigen) {
    if (!confirm(`Lastfall «${lf.bez}» entfernen?`)) return;
    werte = { ...werte,
              lastfaelleEigen: (werte.lastfaelleEigen ?? []).filter((_, i) => i !== lf.index) };
  } else {
    const anp = { ...(werte.lastfallAnpassung ?? {}) };
    delete anp[key];
    werte = { ...werte, lastfallAnpassung: anp };
  }
  if (anzeigeKombi === key) anzeigeKombi = 'umhuellend';
  neuRechnen();
}

/** Beiwerte eines Lastfalls anpassen, oder einen neuen anlegen (key = null). */
function dialogLastfall(key) {
  if (!letzte) return;
  const ein = letzte.kombi.einwirkungen;
  const alle = lastfaelle(werte);
  const lf = key ? alle.find((l) => l.key === key) : {
    bez: `Eigener Lastfall ${(werte.lastfaelleEigen ?? []).length + 1}`,
    eigen: true, nachweis: true,
    beiwerte: { G: werte.gammaG, WindX: 0, WindY: werte.gammaQ, Schnee: 0 },
  };
  if (!lf) return;

  const d = dialog(key ? `Lastfall: ${lf.bez}` : 'Neuer Lastfall',
    ui.lastfallFormular(lf, ein),
    (key && !lf.eigen ? '<button class="btn" data-std>Auf Normensatz zurück</button>' : '') +
    '<button class="btn btn-acc" data-ok>Übernehmen</button>');

  d.node.querySelector('[data-ok]').onclick = () => {
    const beiwerte = {};
    ein.forEach((e) => {
      const v = parseFloat(ui.el(`lf-${e.key}`).value);
      beiwerte[e.key] = Number.isFinite(v) ? v : 0;
    });
    const bez = ui.el('lf-bez').value.trim();
    const nachweis = ui.el('lf-nachweis').checked;
    if (!key || lf.eigen) {
      const liste = [...(werte.lastfaelleEigen ?? [])];
      const eintrag = { key: lf.key ?? `eigen-${Date.now().toString(36)}`,
                        bez: bez || lf.bez, beiwerte, nachweis };
      if (key && lf.index !== undefined) liste[lf.index] = eintrag;
      else liste.push(eintrag);
      werte = { ...werte, lastfaelleEigen: liste };
    } else {
      // Nur die Abweichung merken, nicht den ganzen Lastfall
      werte = { ...werte,
                lastfallAnpassung: { ...(werte.lastfallAnpassung ?? {}), [key]: beiwerte } };
    }
    d.zu();
    neuRechnen();
  };
  const std = d.node.querySelector('[data-std]');
  if (std) std.onclick = () => { d.zu(); entferneLastfall(key); };
}

/**
 * Nachweisschnitt ein- und ausschalten.
 * Eingeschaltet wird das Modell an der Schnittstelle aufgetrennt und
 * herangefahren; ausgeschaltet steht wieder das ganze Joch da.
 */
function schnittUmschalten(an) {
  werte = { ...werte, schnittAktiv: an };
  neuRechnen();
  if (an) zeigeSchnittImModell();
  else { station = null; ansicht.station = null; ansicht.ganzesJoch(); }
}

/** Ausschnitt um den Schnitt: drei Felder nach links und rechts. */
const schnittBreite = () =>
  Math.max(1.6, (letzte?.erg.modell.a1eff ?? 0.75) * 3);

/**
 * Den Schnitt im Modell zeigen und die Werkzeugleiste nachziehen.
 *
 * zeigeSchnitt() kann die Blickrichtung aendern - beim Laengsschnitt tut es
 * das - laeuft aber NACH neuRechnen(), und dort ist die Leiste bereits
 * gezeichnet worden. Ohne das Nachziehen leuchtete im Blick-Feld noch die
 * vorige Richtung: die Kamera stand richtig, die Anzeige log.
 */
function zeigeSchnittImModell() {
  ansicht.zeigeSchnitt(schnittBreite());
  if (ui.el('ebenen-tools')?.children.length) zeichneModellWerkzeuge();
}

// --- Hinterlegte Querprofil-Zeichnung ---------------------------------------

/*
 * DIE ZEICHNUNG HINTER DAS MODELL.
 *
 * Wer ein Tragwerk aufnimmt, hat die Zeichnung offen und die Anwendung
 * daneben: jede Länge wird im PDF-Reader gemessen und hier eingetippt. Das
 * Bild in derselben Ansicht nimmt den Umweg heraus.
 *
 * DER WEG HINEIN IST DAS EINFÜGEN. Bildschirmausschnitt machen, ins Modell
 * klicken, Strg+V - fertig. Eine Datei hineinziehen geht ebenso; nach dem
 * Einlesen ist beides dasselbe Bild.
 *
 * ZUERST LIEGT ES GROB DA. Ein frisch eingefügtes Bild hat keine Lage im
 * Raum, und ein Bild ohne Lage kann man auch nicht anklicken, um ihm eine zu
 * geben. Es bekommt deshalb sofort eine VORLÄUFIGE: um das Modell herum, so
 * gross, dass es rund zwei Drittel davon einnimmt (bild.zeichnung.js,
 * vorlaeufigeLage). Von dort setzen es zwei Klicks genau.
 */
let kalibrierung = null;      // { bezug, welt: [], punkte: [], schritt }
/*
 * Was die Erkennung gefunden hat, solange es noch nicht bestaetigt ist.
 *
 * DIE ZAHL IST DER ABSTAND ZUM DRITTEN: um wieviel kuerzer der naechste
 * senkrechte Strich ist als der kuerzere der beiden Masten. Ein Viertel
 * genuegt, und das ist gemessen, nicht geraten - auf einem Querprofil sind
 * die naechstlaengsten Senkrechten die Lichtraumprofile, und die kamen im
 * nachgebauten Blatt auf 260 von 432 Punkten, also 40 % kuerzer.
 *
 * Darunter ist die Sache nicht eindeutig: ein dritter ebenso langer Strich -
 * ein Signalmast, ein angeschnittenes Nachbartragwerk - koennte gemeint
 * sein. Dann sind zwei Klicks ehrlicher als ein Vorschlag, den man erst
 * pruefen muesste. (Am Gegenbeispiel gemessen: 0.06.)
 */
const ERKENNUNG_GRENZE = 0.25;
let erkannt = null;           // { guete } - Vorschlag, noch nicht bestaetigt

async function zeichnungEinlegen(blob, name = 'Zeichnung') {
  try {
    const roh = await verkleinere(blob);
    const bild = await createImageBitmap(new Blob([roh.daten], { type: roh.art }));
    const alt = ansicht.zeichnung?.kalibrierung ?? null;
    ansicht.zeichnung = {
      bild, breite: roh.breite, hoehe: roh.hoehe, daten: roh.daten,
      art: roh.art, name,
      // Eine bestehende Kalibrierung bleibt nur stehen, wenn das neue Bild
      // dieselbe Grösse hat - sonst sässe sie auf einem anderen Ausschnitt.
      kalibrierung: alt && ansicht.zeichnung
        && ansicht.zeichnung.breite === roh.breite ? alt
        : vorlaeufigeLage(ansicht.szene?.grenzen, roh.breite, roh.hoehe),
      vorlaeufig: true,
    };
    ansicht.ebenen.zeichnung = true;
    // Die Zeichnung gilt nur in der Laengsansicht - also gleich dorthin.
    ansicht.blickrichtung('laengs');
    zeichneModellWerkzeuge();
    ansicht.zeichne();
    /*
     * SELBST EINMESSEN, WENN DAS TRAGWERK ZU ERKENNEN IST.
     *
     * Die Masten sind die längsten Senkrechten des Blattes, das Joch liegt
     * auf ihnen - daraus ergeben sich genau die beiden Punkte, die das
     * Einmessen braucht.
     *
     * >>> VORGELEGT, NICHT ÜBERNOMMEN. <<< Der Balken sagt, dass gerechnet
     * und nicht gemessen wurde, und die zwei Klicks stehen einen Knopfdruck
     * entfernt. Eine Vermutung, die sich als Messung ausgibt, wäre schlimmer
     * als gar keine.
     */
    erkannt = null;
    const t = roh.maske
      ? erkenneTragwerk(roh.maske, roh.breite, roh.hoehe) : null;
    /*
     * >>> AUCH DIE SELBSTERKENNUNG BRAUCHT EINEN BEZUG. <<<
     *
     * Sie nahm bisher immer das Joch. Hat das Modell keines - ein
     * Einzelmast -, gab `bezugPunkte('joch')` null, es wurde nichts
     * eingemessen, und der Ruecksprung auf das Einmessen von Hand lief in
     * dieselbe Wand: die Zeichnung blieb vorlaeufig liegen, ohne dass ein
     * Wort darueber fiel.
     *
     * Dieselbe Erkennung traegt beide Paare. WAAGRECHT sind es die beiden
     * Mastachsen auf der Jochachse, LOTRECHT Fundamentoberkante und
     * Jochachse am linken Masten. Genommen wird der erste Bezug, den das
     * Modell hergibt - das Joch, wo es eines gibt, sonst der Mast.
     */
    const moeglich = bezuegeFuer(letzte?.erg?.modell ?? null, ansicht.szene);
    /*
     * DIE MODELLPUNKTE PASSEND ZU DEM, WAS GEFUNDEN WIRD: die Erkennung
     * findet Mastachsen auf der Jochachse und den Mastfuss, nicht Jochenden
     * und Anschluss (bild.zeichnung.js, erkennungsWelt).
     */
    const bez = ['joch', 'mast']
      .map((key) => ({ key, welt: erkennungsWelt(key, letzte?.erg?.modell ?? null,
                                                  ansicht.szene),
                       label: moeglich.find((b) => b.key === key)?.label }))
      .find((b) => b.welt) ?? null;
    const bildPaar = (key) => (key === 'mast'
      ? [{ px: t.masten.links, py: t.fuesse.links },
         { px: t.masten.links, py: t.jochY }]
      : [t.p1, t.p2]);
    const k = t && bez && t.guete >= ERKENNUNG_GRENZE
      ? kalibriere(...bildPaar(bez.key), bez.welt[0], bez.welt[1]) : null;
    // Der Zeichnungsknopf und die Ebenengruppe aendern sich mit dem Bild:
    // vorher «Zeichnung…» und zwei graue Schalter, jetzt beides scharf. Ohne
    // dieses Nachzeichnen behauptete der Knopf weiter, es gebe keine.
    baueModellWerkzeuge();
    if (k) {
      ansicht.zeichnung.kalibrierung = k;
      ansicht.zeichnung.vorlaeufig = false;
      ansicht.zeichne();
      erkannt = { guete: t.guete, label: bez.label };
      zeichneBalken();
      await zeichnungSichernFallsMoeglich();
      return;
    }
    await zeichnungSichernFallsMoeglich();
    kalibrierenStarten();
  } catch (f) {
    // Der Handlungsbalken ueber dem Modell: dort steht ohnehin, was als
    // Naechstes zu tun ist, und dorthin schaut man beim Einlegen eines
    // Bildes. Die Modellueberschrift, die das frueher trug, gibt es nicht
    // mehr.
    meldeImBalken(`Das Bild liess sich nicht einlesen: ${f.message}`);
  }
}

/** In die Ablage, sobald das Tragwerk eine Id hat. */
async function zeichnungSichernFallsMoeglich() {
  const z = ansicht.zeichnung;
  if (!z || !projekt.id) return;
  await store.zeichnungSichern(projekt.id, {
    daten: z.daten, breite: z.breite, hoehe: z.hoehe, art: z.art,
    name: z.name, kalibrierung: z.kalibrierung,
  }).catch(() => {});
}

/** Zeichnung eines geladenen Tragwerks holen. */
async function zeichnungHolen(id) {
  const s = await store.zeichnungLaden(id).catch(() => null);
  if (!s) { ansicht.zeichnung = null; return; }
  const bild = await createImageBitmap(new Blob([s.daten], { type: s.art }))
    .catch(() => null);
  if (!bild) { ansicht.zeichnung = null; return; }
  ansicht.zeichnung = { bild, breite: s.breite, hoehe: s.hoehe, daten: s.daten,
                        art: s.art, name: s.name, kalibrierung: s.kalibrierung,
                        vorlaeufig: !s.kalibrierung };
}

/**
 * KALIBRIEREN: zwei Klicks auf ein bekanntes Mass.
 *
 * Die Modellpunkte stehen schon in der Eingabe - Jochlänge oder Masthöhe.
 * Eingetippt werden muss nichts; man klickt, was man ohnehin weiss.
 */
/*
 * DIE ZEICHNUNG ALS HANDLUNG.
 *
 * Bis hierher fuehrten nur zwei Wege zu einer Zeichnung: Strg+V und
 * Hineinziehen. Beide unsichtbar. Und war sie einmal eingemessen, gab es
 * ueberhaupt keinen Weg zurueck - die Frage des Auftraggebers, wie man die
 * Punkte nachtraeglich aendert, hatte schlicht keine Antwort.
 *
 * Der Knopf traegt jetzt alles, was man mit ihr tun kann. Ohne Bild oeffnet
 * er die Dateiwahl, mit Bild fragt er, was zu tun ist.
 */
let zeichnungMenue = false;

function zeichnungMenueUmschalten() {
  if (bildSchieben) { bildSchiebenEnde(false); return; }
  if (ausrichtung) { ausrichtenEnde(false); return; }
  if (kalibrierung) kalibrierenEnde();
  if (setzen) setzenEnde();
  if (!ansicht.zeichnung) { zeichnungWaehlen(); return; }
  zeichnungMenue = !zeichnungMenue;
  baueModellWerkzeuge();
  zeichneBalken();
}

function zeichnungMenueEnde() {
  zeichnungMenue = false;
  baueModellWerkzeuge();
  zeichneBalken();
}

/** Dateiwahl fuer ein Bild - derselbe Weg wie Einfuegen und Ziehen. */
function zeichnungWaehlen() {
  const f = document.createElement('input');
  f.type = 'file';
  f.accept = 'image/*';
  f.onchange = async () => {
    const b = f.files?.[0];
    if (b) await zeichnungEinlegen(b, b.name ?? 'Datei');
    zeichnungMenueEnde();
  };
  f.click();
}

async function zeichnungEntfernen() {
  ansicht.zeichnung = null;
  ansicht.zeichne();
  try { await store.zeichnungLoeschen(projekt.id); } catch { /* nie gesichert */ }
  zeichnungMenueEnde();
}

/*
 * DAS ABGELEGTE BILD NACHTRAEGLICH VERSCHIEBEN.
 *
 * Weisung vom 2. September: «es waere daher noch gut das abgelegte QP Bild
 * schieben zu koennen nachtraeglich, falls die Lage der Abstraktion nicht
 * ganz gleicht bei einer Jochreihe.»
 *
 * >>> DIE ALTE LAGE WIRD FESTGEHALTEN, BEVOR ETWAS PASSIERT. <<<
 *
 * Verschieben ist eine Handlung, die man daneben treffen kann - und was
 * zwei Klicks eingemessen haben, darf ein ungeschickter Zug nicht wortlos
 * verbrauchen. Solange der Modus laeuft, steht «zurueck» daneben; er setzt
 * genau auf die Kalibrierung zurueck, die vorher galt.
 *
 * Gesichert wird erst am Ende. Waehrend des Ziehens liefen sonst dutzende
 * Schreibvorgaenge in die Ablage, je Bild einer.
 */
let bildSchieben = null;     // { vorher: {s, x0, z0} }

function bildSchiebenStarten() {
  const z = ansicht.zeichnung;
  if (!z?.kalibrierung) return;
  if (kalibrierung) kalibrierenEnde();
  if (ausrichtung) ausrichtenEnde(false);
  if (setzen) setzenEnde();
  zeichnungMenue = false;
  bildSchieben = { vorher: { ...z.kalibrierung } };
  // Die Zeichnung gilt nur in der Laengsansicht - dort wird auch geschoben.
  if (ansicht.ansichtKey !== 'laengs') ansicht.blickrichtung('laengs');
  ansicht.zeichnungSchieben = true;
  ansicht.ebenen.zeichnung = true;
  const cv = ui.el('canvas3d');
  if (cv) cv.style.cursor = 'grab';
  baueModellWerkzeuge();
  zeichneBalken();
  ansicht.zeichne();
  /*
   * DER FANG GEHOERT ANS ENDE, nicht an den Anfang.
   *
   * Die Pfeiltasten hoeren an der ZEICHENFLAECHE - ohne Fokus dort passiert
   * beim Druecken nichts. Vorne gesetzt war er sofort wieder weg: der
   * Balken wird gleich darauf neu gebaut, und der Knopf, ueber den man
   * hierher kam, verschwindet dabei mitsamt dem Fokus. Gemessen am
   * 2. September - Ziehen ging, die Pfeile taten nichts.
   */
  cv?.focus?.({ preventScroll: true });
}

async function bildSchiebenEnde(zurueck = false) {
  if (!bildSchieben) return;
  const z = ansicht.zeichnung;
  if (zurueck && z) z.kalibrierung = { ...bildSchieben.vorher };
  bildSchieben = null;
  ansicht.zeichnungSchieben = false;
  ui.el('canvas3d')?.style.removeProperty('cursor');
  if (z && !zurueck) await zeichnungSichernFallsMoeglich();
  baueModellWerkzeuge();
  zeichneBalken();
  ansicht.zeichne();
}

/**
 * Das Einmessen beginnen - mit der Frage, WONACH.
 *
 * >>> DIE WAHL GEHOERT VOR DIE KLICKS. <<<
 *
 * Weisung vom 12. September: "man muesste hier eine auswahl vornehmen ob ein
 * mast (vertikal) oder ein joch (horizontal) als referenz dient."
 *
 * Bisher begann jedes Einmessen beim Joch, und das lotrechte Mass lag hinter
 * einem Knopf namens "anderes Mass" - zu finden erst, wenn man schon im
 * Fadenkreuz stand und die erste Anweisung vom falschen Punkt sprach. Wer
 * eine angeschnittene Zeichnung einlegt, auf der kein Jochende zu sehen ist,
 * musste das erst merken und dann suchen.
 *
 * Ohne Schluessel wird gefragt; mit Schluessel geht es unmittelbar los. Gibt
 * es nur einen Bezug, wird nicht gefragt - eine Wahl mit einer Antwort ist
 * keine.
 */
function kalibrierenStarten(bezugKey = null) {
  if (ausrichtung) ausrichtenEnde(false);
  const moeglich = bezuegeFuer(letzte?.erg?.modell ?? null, ansicht.szene);
  if (!moeglich.length || !ansicht.zeichnung) { kalibrierenEnde(); return; }
  const key = bezugKey ?? (moeglich.length === 1 ? moeglich[0].key : null);
  if (!key) {
    kalibrierung = { wahl: moeglich, punkte: [] };
    ansicht.kalibrierPunkte = [];
    ansicht.beiZeichnungsklick = null;
    zeichneBalken();
    return;
  }
  const b = moeglich.find((x) => x.key === key);
  if (!b) { kalibrierenEnde(); return; }
  const welt = b.frei
    ? [{ text: 'Anfang des bekannten Masses' }, { text: 'Ende des bekannten Masses' }]
    : b.welt;
  kalibrierung = { bezug: b.key, label: b.label, wahlbar: moeglich.length > 1,
                   welt, punkte: [], frei: Boolean(b.frei) };
  // Der Geraetepunkt kommt als zweites Argument - er wird gebraucht, um den
  // gesetzten Punkt stehen zu lassen, waehrend man den zweiten sucht.
  ansicht.kalibrierPunkte = [];
  ansicht.beiZeichnungsklick = (t, g) => kalibrierKlick(t, g);
  ui.el('canvas3d').style.cursor = 'crosshair';
  zeichneBalken();
}

function kalibrierenEnde() {
  kalibrierung = null;
  erkannt = null;
  ansicht.beiZeichnungsklick = null;
  ansicht.kalibrierPunkte = [];
  ansicht._fadenkreuz = null;
  ui.el('canvas3d')?.style.removeProperty('cursor');
  baueModellWerkzeuge();
  zeichneBalken();
  ansicht.zeichne();
}

async function kalibrierKlick(t, geraet) {
  if (!kalibrierung) return;
  if (kalibrierung.frei && kalibrierung.punkte.length >= 2) return;
  kalibrierung.punkte.push(t);
  if (geraet) ansicht.kalibrierPunkte = [...ansicht.kalibrierPunkte, geraet];
  if (kalibrierung.punkte.length < 2) { zeichneBalken(); ansicht.zeichne(); return; }
  /*
   * DAS FREIE MASS FRAGT NACH DEN ZWEI KLICKS NACH DER LAENGE.
   *
   * Weitere Klicks gehen ins Leere, bis sie eingegeben ist: ein dritter
   * Punkt waere nicht gemeint und stuende sonst stumm in der Liste.
   */
  if (kalibrierung.frei) {
    // Die Kreuze bleiben stehen, solange die Laenge fehlt - man sieht, was
    // man gemessen hat.
    zeichneBalken();
    ansicht.zeichne();
    ui.el('viewer-balken')?.querySelector('[data-kalib-laenge]')?.focus();
    return;
  }
  const [p1, p2] = kalibrierung.punkte;
  const [w1, w2] = kalibrierung.welt;
  const k = kalibriere(p1, p2, w1, w2);
  if (k && ansicht.zeichnung) {
    ansicht.zeichnung.kalibrierung = k;
    ansicht.zeichnung.vorlaeufig = false;
    await zeichnungSichernFallsMoeglich();
  }
  kalibrierenEnde();
}

/**
 * Das freie Mass abschliessen: Laenge eingegeben, Massstab daraus.
 *
 * Danach geht es GLEICH ins Ausrichten. Ein freies Mass sagt nur, wie gross
 * das Bild ist, nicht wohin es gehoert - liesse man es hier stehen, laege es
 * im richtigen Massstab am falschen Ort, und das sieht aus wie ein Fehler.
 */
async function freiesMassUebernehmen(laenge) {
  const z = ansicht.zeichnung;
  if (!kalibrierung?.frei || !z || kalibrierung.punkte.length < 2) return;
  const [p1, p2] = kalibrierung.punkte;
  const k = kalibriereFrei(p1, p2, laenge, z.kalibrierung);
  // Ohne brauchbare Laenge bleibt die Frage stehen - die beiden Punkte
  // sind gesetzt, und sie noch einmal zu klicken, waere verlorene Arbeit.
  if (!k) {
    ui.el('viewer-balken')?.querySelector('[data-kalib-laenge]')?.focus();
    return;
  }
  z.kalibrierung = k;
  z.vorlaeufig = false;
  await zeichnungSichernFallsMoeglich();
  kalibrierenEnde();
  ausrichtenStarten({ nachMass: true });
}

/*
 * >>> AUSRICHTEN AN EINEM PUNKT (Weisung, 18. September). <<<
 *
 * «Die Referenz ist starr am Mastfuss» - das Einmessen legt Massstab UND
 * Lage in einem, und die Lage hing an den beiden Punkten, die man gerade
 * geklickt hatte. Wer die Zeichnung am Mastkopf oder am Jochende
 * deckungsgleich haben wollte, musste schieben und schaetzen.
 *
 * Jetzt waehlt man den Bezugspunkt: einen aus dem Modell - Mastfuss,
 * Anschluss, Mastkopf, Jochende - oder einen frei angeklickten. Dann klickt
 * man die Stelle auf der Zeichnung, die dorthin gehoert. Das Bild wird nur
 * VERSCHOBEN; der Massstab bleibt, wie er gemessen wurde.
 */
let ausrichtung = null;   // { wahl, vorher, ziel?, frei?, punkte, nachMass? }

function ausrichtenStarten(o = {}) {
  const z = ansicht.zeichnung;
  if (!z?.kalibrierung) return;
  if (kalibrierung) kalibrierenEnde();
  if (bildSchieben) bildSchiebenEnde(false);
  if (setzen) setzenEnde();
  zeichnungMenue = false;
  if (ansicht.ansichtKey !== 'laengs') ansicht.blickrichtung('laengs');
  ansicht.ebenen.zeichnung = true;
  ausrichtung = { wahl: ausrichtPunkte(ansicht.szene), vorher: { ...z.kalibrierung },
                  punkte: [], nachMass: o.nachMass === true };
  ansicht.beiZeichnungsklick = null;
  ansicht.kalibrierPunkte = [];
  baueModellWerkzeuge();
  zeichneBalken();
  ansicht.zeichne();
}

function ausrichtenWaehlen(key) {
  if (!ausrichtung) return;
  if (key === 'frei') {
    ausrichtung.frei = true;
    ausrichtung.ziel = null;
  } else {
    const p = ausrichtung.wahl.find((w) => w.key === key);
    if (!p) return;
    ausrichtung.ziel = p;
    ausrichtung.frei = false;
  }
  ausrichtung.punkte = [];
  ansicht.kalibrierPunkte = [];
  ansicht.beiZeichnungsklick = (t, g) => ausrichtKlick(t, g);
  const cv = ui.el('canvas3d');
  if (cv) cv.style.cursor = 'crosshair';
  zeichneBalken();
  ansicht.zeichne();
}

async function ausrichtKlick(t, geraet) {
  const z = ansicht.zeichnung;
  if (!ausrichtung || !z?.kalibrierung) return;
  let ziel = ausrichtung.ziel;
  if (ausrichtung.frei) {
    // Erst der Punkt auf der Zeichnung, dann die Stelle im Modell, wohin er
    // gehoert. Der zweite Klick zaehlt als Ort in der Welt, nicht im Bild.
    if (!ausrichtung.punkte.length) {
      ausrichtung.punkte.push(t);
      if (geraet) ansicht.kalibrierPunkte = [geraet];
      zeichneBalken();
      ansicht.zeichne();
      return;
    }
    ziel = bildNachWelt(z.kalibrierung, t.px, t.py);
    t = ausrichtung.punkte[0];
  }
  const k = ausrichten(z.kalibrierung, t, ziel);
  if (k) {
    z.kalibrierung = k;
    await zeichnungSichernFallsMoeglich();
  }
  ausrichtenEnde(false);
}

async function ausrichtenEnde(zurueck = false) {
  const z = ansicht.zeichnung;
  if (zurueck && z && ausrichtung?.vorher) z.kalibrierung = { ...ausrichtung.vorher };
  const war = ausrichtung;
  ausrichtung = null;
  ansicht.beiZeichnungsklick = null;
  ansicht.kalibrierPunkte = [];
  ansicht._fadenkreuz = null;
  ui.el('canvas3d')?.style.removeProperty('cursor');
  if (zurueck && z && war) await zeichnungSichernFallsMoeglich();
  baueModellWerkzeuge();
  zeichneBalken();
  ansicht.zeichne();
}

// --- Bauteil setzen: erst wohin, dann was -----------------------------------

/*
 * ZWEI KLICKS STATT EINER LISTE UND EINES FORMULARS.
 *
 * Bisher hiess ein Bauteil einsetzen: Reiter wechseln, in vierzehn gleich
 * aussehenden Kacheln die richtige finden, im Dialog eine Zahl eintippen, die
 * man vorher auf der Zeichnung gemessen hat. Drei Schritte, von denen keiner
 * mit dem Tragwerk zu tun hat.
 *
 * Jetzt: ins Modell klicken, WOHIN es gehoert - dann erscheint, WAS dort sein
 * kann. Die Stelle sagt die Lage, und sie sagt auch schon, was in Frage
 * kommt: am Masten gibt es keinen Jochaufsatz.
 *
 * Liegt eine Zeichnung dahinter, klickt man auf das Bauteil in der Zeichnung -
 * und genau dorthin kommt es. Das ist der Grund, warum die Zeichnung
 * ueberhaupt hinter dem Modell liegt.
 */
/*
 * { stelle, vorwahl } waehrend der Auswahl.
 *
 * `vorwahl` ist das schon gewaehlte Bauteil - `{art:'vorlage', id}` oder
 * `{art:'kopie', id}` fuer eine Baugruppe, die bereits im Modell steht. Ist
 * sie gesetzt, entfaellt der zweite Schritt: ein Klick setzt.
 *
 * WARUM DIE UMKEHRUNG (Weisung: «das absetzen der einzelnen bauteile ist
 * etwas fummelig»): wer schon weiss, WAS er setzen will, zielt einmal - und
 * bekam bisher trotzdem erst ein Menue vorgelegt, das die Stelle wieder
 * verdeckte, auf die er gerade gezielt hatte.
 */
let setzen = null;

/**
 * >>> WIE HOCH STEHT DIESES TRAGWERK AUF DEM BLATT? <<<
 *
 * Weisung vom 8. September: «wenn man den wert anschlusshöhe ändert dann
 * wandert das joch und nicht der mastfuss ... für das gesamte modell sollte
 * man sich auf einen Referenzpunkt beziehen.»
 *
 * Jede Einzelszene kommt mit der Jochachse auf z = 0. Auf dem Blatt liegen
 * alle Mastfuesse auf 0, das Joch also auf +H. Die Zahl steht hier EINMAL:
 * die Szene hebt damit an, und `stelleAus` faengt damit. Zwei Rechnungen
 * waeren zwei Orte, an denen dieselbe Festlegung steht - und genau das ist
 * schiefgegangen (siehe dort).
 */
/*
 * BEIM EINZELMAST DIE LAENGE (18. September): seine Szene steht mit dem Kopf
 * auf z = 0 und dem Fuss bei -Laenge (core.auflager.js, einzelmastLaenge).
 * Mit der ausgeblendeten Hoehe angehoben, stuende er um den Unterschied
 * neben dem Fuss.
 */
const hebungVon = (t) => {
  const s = tragwerkSatz(werte, t?.id);
  return tragwerksart(s).key === 'einzelmast'
    ? einzelmastLaenge(s) + (Number(s.mastFuss) || 0)
    : Number(s.mastH) || 0;
};

/**
 * >>> DIE EIGENEN KACHELN AUS EINEM ALTEN STAND EINSAMMELN. <<<
 *
 * Sie gehoeren jetzt dem Blatt (`BLATT_FELDER`). In einem Stand von vorher
 * stehen sie am einzelnen Tragwerk - und dort haben sie sich vermehrt: jede
 * Kopie eines Tragwerks brachte ihre eigene Liste mit.
 *
 * Zusammengefuehrt und entdoppelt geht keine verloren, und keine steht
 * zweimal da. Einmal beim Laden - danach fuehrt sie das Blatt.
 */
function vorlagenZusammenfuehren(w) {
  const alle = [...(w?.eigeneVorlagen ?? [])];
  (w?.weitere ?? []).forEach((t2) => {
    (t2?.eigeneVorlagen ?? []).forEach((v) => alle.push(v));
  });
  return entdoppelteVorlagen(alle);
}

/**
 * Die Ankerfelder der Maske und ihr Platz im Ankerobjekt.
 *
 * Zwei Namen fuer dieselbe Sache: in der Maske heissen sie `ankerH`, am
 * Bauteil `h`. Das ist Absicht - die Maske braucht eindeutige Schluessel
 * ueber alle Gruppen hinweg, das Bauteil kurze.
 */
const ANKERFELDER = {
  ankerTyp: 'typ', ankerH: 'h', ankerA: 'a',
  ankerRichtung: 'richtung', ankerSeite: 'seite', ankerBef: 'befestigung',
};

/**
 * >>> DER WINKEL IST EINE EINGABE, ABER KEINE ANGABE. <<<
 *
 * Weisung vom 11. September: «der anker hat einen winkel von ca 60 Grad.»
 * So denkt man ueber einen Anker - nicht in Hoehe und Abstand, sondern in
 * seiner Neigung.
 *
 * Gespeichert wird er trotzdem NICHT: er folgt aus Hoehe und Abstand, und
 * zwei Speicherorte fuer dieselbe Groesse laufen auseinander. Wer ihn
 * eintraegt, verstellt damit die HOEHE - der Abstand bleibt, denn er sagt,
 * wo das Fundament steht, und das ist die Angabe, die auf dem Plan steht.
 */
const ANKER_WINKEL = (ak) => {
  const h = Number(ak?.h) || 0, a = Number(ak?.a) || 0;
  return a > 0 && h > 0 ? (Math.atan2(h, a) * 180) / Math.PI : 0;
};

/** Womit ein neu gesetzter Anker anfaengt, bis jemand die Masse eintraegt. */
/* ===========================================================================
 * WOMIT EIN NEUER ANKER ANFAENGT
 * ===========================================================================
 *
 * Weisung vom 11. September: «als voreinstellwerte die anker sind im abstand
 * von 4.50 m (fundamente). der anker hat einen winkel von ca 60 Grad.»
 *
 * >>> DIE BEIDEN ANGABEN BESTIMMEN DIE HOEHE. <<<
 *
 * Der Winkel zaehlt gegen die WAAGRECHTE. Mit 4.50 m Abstand folgt
 *
 *      h = a · tan 60° = 7.79 m        L = a / cos 60° = 2a = 9.00 m
 *
 * Die Laenge geht glatt auf - bei 60 Grad ist sie genau das Doppelte des
 * Abstands -, sie liegt mitten im Sortimentsbereich (5 bis 12.50 m), und
 * der Anschluss sitzt auf der Hoehe, auf der auch das Joch angreift. Alle
 * drei sprechen fuer diese Lesart; gegen die Lotrechte gemessen waere die
 * Stuetze 5.20 m lang und stuende in der Kappung des Diagramms, wo die
 * Kurve nichts mehr aussagt.
 * ======================================================================== */
const ANKER_WINKEL_VOR = 60;
const ANKER_ABSTAND_VOR = 4.5;
const ANKER_STANDARD = {
  typ: 'U12',
  a: ANKER_ABSTAND_VOR,
  h: Math.round(ANKER_ABSTAND_VOR
                * Math.tan((ANKER_WINKEL_VOR * Math.PI) / 180) * 100) / 100,
  richtung: 'y', seite: 'plus', befestigung: 'ankerplatte',
};

/**
 * >>> UND DIE EBENE FOLGT DER TRAGWERKSART. <<<
 *
 * Ein schraeger Stab haelt nur die Ebene, in der er liegt. Am TRAGJOCH
 * kippt die Umlenkkraft aus dem Bogen den Masten quer zum Gleis - dort
 * gehoert der Anker in die Jochachse. Am ABFANGJOCH steht die grosse Kraft
 * LAENGS, der Leiterzug, und ein Anker quer dazu haelt davon nichts.
 *
 * Ohne diese Unterscheidung setzt man am Abfangjoch einen Anker und sieht
 * eine Null: die Kraft ist null, der Mast bleibt ueberlastet, und woran es
 * liegt, sieht man dem Bild nicht an. Genau das ist am 10. September
 * passiert - eta 2.205, und der Anker aenderte nichts daran.
 *
 * Es bleibt eine VOREINSTELLUNG: wer den Anker anders stellen will, stellt
 * ihn anders. Sie soll nur nicht dort anfangen, wo er nutzlos ist.
 */
/*
 * SEIT DEM 17. SEPTEMBER UEBERALL LAENGS (Weisung: «beim anker /
 * druckstütze als voreingabewert längs einstellen»). Die Ebene bleibt
 * waehlbar; der Hinweis am Feld sagt, wann quer gehoert.
 */
const ankerRichtungVor = () => 'y';


function setzenStarten(vorwahl = null) {
  if (kalibrierung) kalibrierenEnde();
  if (ausrichtung) ausrichtenEnde(false);
  setzen = { stelle: null, vorwahl };
  ansicht.beiStelle = (w) => stelleGewaehlt(w);
  ui.el('canvas3d').style.cursor = 'crosshair';
  // Der Knopf sagt jetzt «Abbrechen» - er muss deshalb mitgezeichnet werden.
  baueModellWerkzeuge();
  zeichneBalken();
}

function setzenEnde() {
  setzen = null;
  ansicht.beiStelle = null;
  ui.el('canvas3d')?.style.removeProperty('cursor');
  baueModellWerkzeuge();
  zeichneBalken();
}

/**
 * WO IM TRAGWERK LIEGT DIESER PUNKT?
 *
 * Entschieden wird an der Stelle, an der ein Bauteil ANGESCHLOSSEN wird -
 * darauf zielt man. Am Joch ist das die Jochachse ueber ihre ganze Laenge, am
 * Masten die Mastachse unterhalb des Jochs.
 *
 * Die Fangbereiche sind bewusst grosszuegig: ein halber Meter neben der
 * Jochachse ist immer noch eindeutig gemeint, und wer daneben klickt, bekommt
 * eine Meldung statt eines Bauteils an falscher Stelle.
 */
function stelleAus(w) {
  const m = letzte?.erg?.modell;
  if (!m || !w) return null;
  const L = m.L, h = m.h ?? 0.4;
  /*
   * >>> ERST INS TRAGWERK RECHNEN, DANN VERGLEICHEN. <<<
   *
   * `w.x` kommt aus der Ansicht und ist eine BLATTKOORDINATE - die Szene
   * zeigt jedes Tragwerk an seiner Lage. Die Bauteillage zaehlt dagegen ab
   * dem linken Ende des Tragwerks. Hier wurde beides gleichgesetzt, und bei
   * einer Jochreihe landete das Bauteil damit am falschen Joch (siehe
   * blattNachLokal in core.constants.js).
   *
   * DIE MASSKETTE FAENGT IM BLATT. Sie beschreibt die Zeichnung, gilt dem
   * ganzen Querprofil und wird auch dort gezeichnet; gefangen wird deshalb
   * in Blattkoordinaten, und erst das Ergebnis wandert ins Tragwerk.
   */
  const t = tragwerkeVon(werte)[0];
  const xl = blattNachLokal(t, w.x);
  /*
   * >>> AUCH DIE HOEHE GEHOERT UMGERECHNET. <<<
   *
   * Weisung vom 9. September: «anbauteile lassen sich nicht zuweisen ueber
   * den button im 3d fenster und auch nicht ueber drag and drop per kachel.»
   *
   * Sie liessen sich nicht setzen, seit die Blattszene jedes Tragwerk um
   * seine Anschlusshoehe ANHEBT (`hebungVon`): auf dem Blatt liegt die
   * Jochachse bei z = H, im Tragwerk bei z = 0. Gefangen wurde weiter um 0 -
   * also 7.50 m UNTER dem Joch, in Fusshoehe. Wer aufs Joch zeigte, bekam
   * «daneben»; getroffen haette nur, wer in die Luft darunter klickt.
   *
   * Fuer x stand die Umrechnung laengst da (`blattNachLokal`); fuer z
   * fehlte sie. Beides ist dieselbe Frage: wo im TRAGWERK liegt der Punkt,
   * auf den im BLATT gezeigt wurde.
   */
  const zl = w.z - hebungVon(t);
  if (xl >= -0.3 && xl <= L + 0.3 && Math.abs(zl) <= h / 2 + 0.6) {
    const xb = fangeAufMasskette(
      lokalNachBlatt(t, Math.max(0, Math.min(L, xl))), m.masskette ?? []);
    const x = Math.max(0, Math.min(L, blattNachLokal(t, xb)));
    return { ort: 'joch', x: Math.round(x * 1000) / 1000 };
  }
  // Am Masten nur, wenn einer im Modell steht - sonst gibt es dort nichts,
  // woran etwas haengen koennte.
  const mA = m.federn?.mastA ?? m.federn?.mast;
  const mB = m.federn?.mastB ?? m.federn?.mast;
  const nahA = Math.abs(xl) <= 0.8;
  const nahB = Math.abs(xl - L) <= 0.8;
  const md = nahA ? mA : mB;
  const H = md?.H ?? 0;
  /*
   * AUCH UEBER DEM JOCH. Ein langer Mast traegt oben Traversen mit
   * Zusatzleitern - genau die sollen sich ansetzen lassen. Die obere Grenze
   * ist deshalb nicht mehr die Jochachse, sondern der Mastkopf: H plus dem
   * angegebenen Ueberstand. Ohne Laengenangabe bleibt es bei H, denn dann
   * ragt der Mast nur den knappen halben Meter hinaus, und darauf sitzt
   * nichts.
   */
  const oben = H + (md?.ueberstand ?? 0);
  if (H > 0 && (nahA || nahB) && zl < oben - H - (h / 2) + 1e-9) {
    // AUF DEN SCHRITT DES REGLERS GERUNDET (5 cm). Sonst zeigt die Karte
    // eine andere Zahl an, als der Klick gesetzt hat - der Regler rastet
    // auf seinen Schritt, und der Anwender sieht 5.20, wo 5.15 steht.
    const hM = Math.max(0, Math.min(oben, zl + H));
    return { ort: nahA ? 'mastA' : 'mastB', hMast: Math.round(hM * 20) / 20 };
  }
  return null;
}

function stelleGewaehlt(w) {
  let st = stelleAus(w);
  /*
   * >>> WER AUF EIN ANDERES JOCH ZEIGT, MEINT DIESES JOCH. <<<
   *
   * Weisung vom 2. September: «Die eingabe der bauteile auf die tragwerke
   * funktioniert nicht ganz.»
   *
   * Auf dem Blatt stehen alle Tragwerke, und man zielt auf eines davon.
   * Gerechnet wird immer nur EINES - das angeklickte in der Liste -, und
   * ein Bauteil gehoert dem Tragwerk, an dem es haengt. Bisher hiess das:
   * erst in der Liste umschalten, dann setzen. Wer es vergass, bekam
   * «daneben», obwohl der Zeiger mitten auf einem Joch stand.
   *
   * Jetzt schaltet der Klick selbst um. Das ist derselbe Weg, den ein Klick
   * ausserhalb des Setzens schon geht (beiTragwerk) - und dieselbe Antwort
   * auf dieselbe Geste.
   *
   * NEU GERECHNET WIRD DABEI SOFORT: `stelleAus` liest das gerechnete
   * Modell (Laenge, Masthoehen), und das ist nach dem Wechsel ein anderes.
   */
  if (!st) {
    const ziel = tragwerkBeiX(werte, w.x);
    if (ziel && ziel.id !== (werte.twId ?? 'T1')) {
      aendern('tragwerkAktiv', ziel.id);
      st = stelleAus(w);
    }
  }
  if (!st) {
    // WO MAN GELANDET IST, statt nur «daneben». Wer zwei Meter neben dem
    // Joch klickt, sieht am Wert, in welche Richtung er zielen muss - und
    // ob überhaupt das Modell gemeint ist oder eine leere Stelle im Raum.
    // Die VORWAHL ueberlebt einen Fehlklick. Sie hier fallen zu lassen hiess:
    // wer neben das Joch klickt, faengt von vorn an - und bekommt beim
    // naechsten Treffer wieder das ganze Menue, obwohl er laengst gewaehlt hat.
    setzen = { ...setzen, stelle: null, daneben: w };
    zeichneBalken();
    return;
  }
  setzen = { ...setzen, stelle: st };
  // Ist das Bauteil schon gewaehlt, wird jetzt gesetzt statt gefragt.
  if (setzen.vorwahl) { setzeVorwahlAnStelle(); return; }
  zeichneBalken();
}

/**
 * WAS AN DIESER STELLE SEIN KANN.
 *
 * Am Masten gibt es keinen TRAEGER - ein Traeger ist das, was auf dem Joch
 * sitzt oder daran haengt, und genau vier Bauteile tragen diese Rolle: die
 * drei Jochaufsaetze und die Haengestuetze (siehe P6). Die Regel steht in den
 * Daten; hier wird sie nur vorwaerts angewandt statt nur pruefend.
 *
 * SORTIERT NACH ROLLE. Was traegt, steht vorn - man baut von unten nach oben.
 * Innerhalb der Rolle bleibt die Reihenfolge der Datenbank; sie ist die des
 * Sortiments.
 */
function vorlagenFuer(ort) {
  const rolleVon = (v) => {
    const ids = (v.module ?? []).map((x) => x.bauteil).filter(Boolean);
    for (const id of ids) {
      try { if (getFlBauteil(id).rolle === 'traeger') return 'traeger'; } catch { /* unbekannt */ }
    }
    for (const id of ids) {
      try { if (getFlBauteil(id).rolle === 'aufbau') return 'aufbau'; } catch { /* unbekannt */ }
    }
    return 'drahtwerk';
  };
  const rang = { traeger: 0, aufbau: 1, drahtwerk: 2 };
  return vorlagen()
    .map((v) => ({ v, rolle: rolleVon(v) }))
    .filter((e) => ort === 'joch' || e.rolle !== 'traeger')
    .sort((a, b) => rang[a.rolle] - rang[b.rolle]);
}

/**
 * Eine fertige Baugruppe an die gemerkte Stelle setzen.
 *
 * Der Weg ist derselbe, ob das Teil aus einer Vorlage kommt oder als Kopie
 * einer schon eingegebenen Baugruppe: die STELLE bestimmt Ort, Lage und
 * Hoehe, und sie ueberschreibt, was die Quelle darueber mitbrachte. Sonst
 * traegt eine Kopie ihre alte Station in die neue Stelle hinein.
 */
function setzeBaugruppeAnStelle(roh) {
  const st = setzen?.stelle;
  if (!st || !roh) return;
  /*
   * DIE REGEL GILT AUCH BEIM ZIEHEN.
   *
   * Die Knopfspalten fragen sie vorher ab - was am Masten nichts zu suchen
   * hat, steht dort gar nicht erst. Beim Ablegen gibt es aber keine Spalte:
   * dort kommt eine Baugruppe herein, und die Stelle steht erst danach fest.
   * Ohne diese Sperre landete eine Haengestuette am Masten, wo es keine
   * geben kann - lautlos, denn gezeichnet wird sie ja.
   */
  if (st.ort !== 'joch' && traegerDrin(roh)) {
    setzen = { stelle: null, vorwahl: null,
               hinweis: `«${roh.name}» hängt an einem Träger, am Masten gibt`
                        + ' es keinen. Ans Joch damit, oder abbrechen.' };
    zeichneBalken();
    return;
  }
  const gesetzt = st.ort === 'joch'
    ? { ...roh, ort: 'joch', x: st.x, hMast: 0 }
    : { ...roh, ort: st.ort, x: 0, hMast: st.hMast };
  // Erst jetzt ist das Raster der Vorlage bekannt - und damit, wo die
  // beiden Klemmen sitzen. Ein Traeger weicht den Blechen aus.
  const t = st.ort === 'joch'
        && hatTraeger(gesetzt.module, (id) => getFlBauteil(id).rolle)
    ? (() => {
        const an = passeTraegerAn(gesetzt.x, gesetzt.raster, letzte?.erg?.modell);
        return { ...gesetzt, x: an.x, raster: an.raster };
      })()
    : gesetzt;
  setzenEnde();
  tabEingabe = 'anbau';
  /*
   * DIE KARTE GEHT AUF (Weisung: das Absetzen war fummelig).
   *
   * Quer ueber ein perspektivisches Bild trifft man keine Station auf den
   * Zentimeter - und muss es auch nicht, wenn die Zahl gleich danach im
   * Feld steht. Der Klick setzt grob, die Karte stellt genau.
   */
  (werte.anbauteile ?? []).forEach((x) => ui.setzeKlapp(`at-${x.id}`, false));
  ui.setzeKlapp(`at-${t.id}`, true);
  setzeAnbauteile([...(werte.anbauteile ?? []), t]);
  if (st.ort === 'joch') {
    // Im Blatt, nicht im Tragwerk - siehe `blattVersatz`.
    ansicht.zoomAuf(blattVersatz() + t.x, null, Math.max(2, werte.L / 8));
  }
  else ansicht.zeigeAnbauteil((werte.anbauteile ?? []).length - 1);
}

/**
 * WAS SCHON IM MODELL STEHT - als Knopfspalte neben den Vorlagen.
 *
 * ZUSAMMENGEFASST, NICHT AUFGEZAEHLT. Auf einem langen Joch stehen zwanzig
 * Baugruppen, und fuenfzehn davon sind dasselbe Teil an anderer Stelle.
 * Zwanzig Knoepfe waeren keine Auswahl mehr, sondern eine zweite Liste.
 * Gleich ist, was in Name, Vorlage, Modulen und Lasten uebereinstimmt - die
 * Stelle zaehlt ausdruecklich nicht dazu, denn sie ist ja das, was neu
 * gewaehlt wird.
 */
/**
 * TRAEGT DIESE BAUGRUPPE EINEN TRAEGER?
 *
 * Ein Traeger ist das, was auf dem Joch sitzt oder daran haengt - die drei
 * Jochaufsaetze und die Haengestuetze. Am Masten gibt es ihn nicht. Die
 * Regel steht in den Daten (Rolle `traeger`), hier wird sie nur gelesen.
 */
function traegerDrin(a) {
  try { return hatTraeger(a?.module, (id) => getFlBauteil(id).rolle); }
  catch { return false; }
}

function kopierbare(ort) {
  const raus = new Map();
  (werte.anbauteile ?? []).forEach((a) => {
    // Dieselbe Regel wie bei den Vorlagen: am Masten gibt es keinen Traeger.
    if (ort !== 'joch' && traegerDrin(a)) return;
    const kennung = JSON.stringify([a.name, a.vorlage ?? '', a.raster ?? null,
                                    a.befestigung ?? null, a.module ?? [],
                                    a.lasten ?? []]);
    if (!raus.has(kennung)) raus.set(kennung, { a, anzahl: 0 });
    raus.get(kennung).anzahl += 1;
  });
  return [...raus.values()];
}

/** Die Spalte dazu, oder '' wenn noch nichts dasteht. */
function kopierbareHtml(ort) {
  const liste = kopierbare(ort);
  if (!liste.length) return '';
  return `<div class="wahl-spalte">
      <div class="wahl-t">Schon im Modell</div>
      ${liste.map(({ a, anzahl }) => `<button class="btn btn-mini"
         data-setz-kopie="${esc(a.id)}"
         title="Kopie von «${esc(a.name)}» — mit allen Zahlen, die daran von
Hand geändert wurden. Steht ${anzahl}× im Modell."
         >${esc(a.name)}${anzahl > 1 ? ` <small>${anzahl}×</small>` : ''}</button>`).join('')}
    </div>`;
}

/** Name der Vorwahl - fuer den Balken beim Ziehen. */
function vorwahlName(vw) {
  if (!vw) return null;
  if (vw.art === 'kopie') {
    return (werte.anbauteile ?? []).find((a) => a.id === vw.id)?.name ?? null;
  }
  try { return getVorlage(vw.id)?.name ?? null; } catch { return null; }
}

/** Das gewaehlte Bauteil an die gemerkte Stelle setzen. */
function setzeVorlageAnStelle(vorlageId) {
  setzeBaugruppeAnStelle(neuesAnbauteil(vorlageId, 0));
}

/**
 * EINE SCHON EINGEGEBENE BAUGRUPPE NOCHMALS SETZEN (Weisung).
 *
 * Der zweite Rueckleiter am anderen Mastende ist derselbe wie der erste -
 * mit denselben Modulen, denselben Lasten, demselben Namen. Ihn ueber die
 * Vorlage neu aufzubauen hiesse, jede von Hand geaenderte Zahl noch einmal
 * einzugeben. Kopiert wird deshalb die BAUGRUPPE, nicht ihre Vorlage; nur
 * die Kennung ist neu, damit beide nebeneinander bestehen koennen.
 */
function setzeKopieAnStelle(id) {
  const quelle = (werte.anbauteile ?? []).find((a) => a.id === id);
  if (!quelle) return;
  const kopie = JSON.parse(JSON.stringify(quelle));
  kopie.id = `AT-${Math.random().toString(36).slice(2, 8)}`;
  kopie.aktiv = true;
  setzeBaugruppeAnStelle(kopie);
}

/** Die Vorwahl - Vorlage oder Kopie - an die gemerkte Stelle setzen. */
function setzeVorwahlAnStelle() {
  const v = setzen?.vorwahl;
  if (!v) return;
  if (v.art === 'kopie') setzeKopieAnStelle(v.id);
  else setzeVorlageAnStelle(v.id);
}

/**
 * Der Balken ueber dem Modell: was jetzt anzuklicken ist.
 *
 * Er traegt zweierlei - das Einmessen der Zeichnung und das Setzen eines
 * Bauteils -, und immer nur eines davon. Er sagt IMMER genau einen naechsten
 * Schritt; eine Anleitung mit zwei Punkten liest man beim Zielen nicht mehr.
 */
/**
 * Eine Meldung in den Handlungsbalken, bis man sie wegklickt.
 *
 * Sie belegt dieselbe Zeile wie der naechste Schritt - das ist gewollt: es
 * gibt nur eine Stelle ueber dem Modell, auf die man schaut, und zwei
 * konkurrierende Meldewege waeren einer zu viel.
 */
function meldeImBalken(text, { dauer = 0 } = {}) {
  const n = ui.el('viewer-balken');
  if (!n) return;
  n.hidden = false;
  n.innerHTML = `<span>${esc(text)}</span>`
    + '<button class="btn btn-mini" data-meldung-zu>Schliessen</button>';
  n.querySelector('[data-meldung-zu]').onclick = () => zeichneBalken();
  /*
   * EINE AUSKUNFT DARF VON SELBST GEHEN (Durchsicht vom 18. September,
   * Punkt U5): «Letzter Stand wiederhergestellt» lag auf dem Laptop ueber
   * Modell und Werkzeugen, bis man ihn wegklickte. Geschlossen wird nur,
   * wenn noch DIESE Meldung dasteht - eine spaetere bleibt.
   */
  if (dauer > 0) {
    const inhalt = n.innerHTML;
    setTimeout(() => { if (n.innerHTML === inhalt) zeichneBalken(); }, dauer);
  }
}

function zeichneBalken() {
  const n = ui.el('viewer-balken');
  if (!n) return;
  n.classList.toggle('wickeln', Boolean(ausrichtung && !ausrichtung.ziel
                                        && !ausrichtung.frei));
  const canvas = ui.el('canvas3d');
  /*
   * ERST DIE FRAGE, WONACH EINGEMESSEN WIRD (Weisung, 12. September).
   *
   * Die Knoepfe tragen die Richtung im Namen - waagrecht oder lotrecht -,
   * denn danach sucht man auf dem Blatt: nicht nach einem Bauteil, sondern
   * nach zwei Punkten, die man sicher treffen kann.
   */
  if (kalibrierung?.wahl && ansicht.zeichnung) {
    n.hidden = false;
    n.innerHTML = '<span>Zeichnung einmessen — <b>wonach?</b></span>'
      + kalibrierung.wahl.map((b) =>
          `<button class="btn btn-mini" data-kalib-w="${esc(b.key)}"`
          + ` title="${esc(b.hinweis)}">${esc(b.label)}</button>`).join('')
      + '<button class="btn btn-mini" data-kalib-ab>Abbrechen</button>';
    if (canvas) canvas.style.removeProperty('cursor');
    n.querySelector('[data-kalib-ab]').onclick = () => kalibrierenEnde();
    n.querySelectorAll('[data-kalib-w]').forEach((b) => {
      b.onclick = () => kalibrierenStarten(b.dataset.kalibW);
    });
    return;
  }
  /*
   * DAS FREIE MASS: zwei Punkte stehen, jetzt die Laenge.
   *
   * Vorgeschlagen wird, was die beiden Punkte in der bisherigen Lage
   * messen - bei einer schon eingemessenen Zeichnung ist das fast die
   * Antwort, und man sieht sofort, ob die Punkte getroffen sind.
   */
  if (kalibrierung?.frei && kalibrierung.punkte.length >= 2 && ansicht.zeichnung) {
    const [p1, p2] = kalibrierung.punkte;
    const k = ansicht.zeichnung.kalibrierung;
    const bisher = k ? k.s * Math.hypot(p2.px - p1.px, p2.py - p1.py) : null;
    n.hidden = false;
    n.innerHTML = '<span>Freies Mass — <b>wirkliche Länge</b> zwischen den '
      + 'beiden Punkten:</span>'
      + '<input type="number" class="inp-mini" data-kalib-laenge step="0.01" min="0"'
      + ` value="${bisher ? bisher.toFixed(2) : ''}" style="width:6em"> m`
      + '<button class="btn btn-mini btn-acc" data-kalib-ok>übernehmen</button>'
      + '<button class="btn btn-mini" data-kalib-ab>Abbrechen</button>';
    const inp = n.querySelector('[data-kalib-laenge]');
    const ok = () => freiesMassUebernehmen(Number(String(inp.value).replace(',', '.')));
    n.querySelector('[data-kalib-ok]').onclick = ok;
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); ok(); }
      if (e.key === 'Escape') { e.preventDefault(); kalibrierenEnde(); }
    });
    n.querySelector('[data-kalib-ab]').onclick = () => kalibrierenEnde();
    return;
  }
  if (ausrichtung && ansicht.zeichnung) {
    n.hidden = false;
    if (!ausrichtung.ziel && !ausrichtung.frei) {
      n.innerHTML = `<span>${ausrichtung.nachMass
          ? 'Massstab gesetzt. Zeichnung ausrichten — ' : 'Zeichnung ausrichten — '}`
        + '<b>an welchem Punkt?</b></span>'
        + ausrichtung.wahl.map((w) =>
            `<button class="btn btn-mini" data-ausr-w="${esc(w.key)}">`
            + `${esc(w.label)}</button>`).join('')
        + '<button class="btn btn-mini" data-ausr-w="frei" title="Einen Punkt auf der '
        + 'Zeichnung anklicken, dann die Stelle im Modell, wohin er gehört">'
        + 'freier Punkt</button>'
        + '<button class="btn btn-mini" data-ausr-ab>Abbrechen</button>';
      if (canvas) canvas.style.removeProperty('cursor');
      n.querySelectorAll('[data-ausr-w]').forEach((b) => {
        b.onclick = () => ausrichtenWaehlen(b.dataset.ausrW);
      });
      n.querySelector('[data-ausr-ab]').onclick = () => ausrichtenEnde(false);
      return;
    }
    const text = ausrichtung.frei
      ? (ausrichtung.punkte.length
          ? 'jetzt die <b>Stelle im Modell</b> anklicken, wohin er gehört (2/2)'
          : 'den <b>Punkt auf der Zeichnung</b> anklicken (1/2)')
      : `auf der Zeichnung <b>${esc(ausrichtung.ziel.label)}</b> anklicken`;
    n.innerHTML = `<span>Zeichnung ausrichten — ${text}. Der Massstab bleibt.</span>`
      + '<button class="btn btn-mini" data-ausr-wahl>anderer Punkt</button>'
      + '<button class="btn btn-mini" data-ausr-ab>Abbrechen</button>';
    if (canvas) canvas.style.cursor = 'crosshair';
    n.querySelector('[data-ausr-wahl]').onclick = () => {
      ausrichtung.ziel = null; ausrichtung.frei = false; ausrichtung.punkte = [];
      ansicht.beiZeichnungsklick = null; ansicht.kalibrierPunkte = [];
      zeichneBalken(); ansicht.zeichne();
    };
    n.querySelector('[data-ausr-ab]').onclick = () => ausrichtenEnde(false);
    return;
  }
  if (kalibrierung && ansicht.zeichnung) {
    const i = kalibrierung.punkte.length;
    const w = kalibrierung.welt[i];
    n.hidden = false;
    n.innerHTML = `<span>Zeichnung einmessen nach <b>${esc(kalibrierung.label)}</b>`
      + ` — <b>${esc(w.text)}</b> anklicken (${i + 1}/2)</span>`
      + (kalibrierung.wahlbar
          ? '<button class="btn btn-mini" data-kalib-bezug>anderes Mass</button>' : '')
      + '<button class="btn btn-mini" data-kalib-ab>Abbrechen</button>';
    if (canvas) canvas.style.cursor = 'crosshair';
    n.querySelector('[data-kalib-ab]').onclick = () => kalibrierenEnde();
    // Zurueck zur Frage, nicht zum anderen Mass: bei drei Bezuegen waere ein
    // Umschalter eine Rateschleife.
    n.querySelector('[data-kalib-bezug]')?.addEventListener(
      'click', () => kalibrierenStarten());
    return;
  }
  /*
   * DER SCHIEBEBALKEN NENNT DIE VERSCHIEBUNG ALS ZAHL.
   *
   * Nicht nur «wird verschoben»: wer ein Bild um dreissig Zentimeter rueckt,
   * will wissen, ob es dreissig waren. Die Zahl ist zugleich die Probe -
   * weicht sie stark von dem ab, was man erwartet hat, stimmt eher die
   * Eingabe als das Bild.
   */
  if (bildSchieben && ansicht.zeichnung?.kalibrierung) {
    const k = ansicht.zeichnung.kalibrierung, v = bildSchieben.vorher;
    const dx = k.x0 - v.x0, dz = k.z0 - v.z0;
    const bewegt = Math.abs(dx) > 1e-4 || Math.abs(dz) > 1e-4;
    n.hidden = false;
    n.innerHTML = '<span>Zeichnung verschieben — <b>ziehen</b>, Pfeiltasten '
      + '5 cm, mit Umschalt 1 cm'
      + (bewegt ? ` · <b>Δx = ${dx.toFixed(2)} m, Δz = ${dz.toFixed(2)} m</b>`
                : '')
      + '</span>'
      + (bewegt ? '<button class="btn btn-mini" data-bs-zur>zurück</button>' : '')
      + '<button class="btn btn-mini btn-acc" data-bs-ok>fertig</button>';
    if (canvas) canvas.style.cursor = 'grab';
    n.querySelector('[data-bs-ok]').onclick = () => bildSchiebenEnde(false);
    n.querySelector('[data-bs-zur]')?.addEventListener(
      'click', () => bildSchiebenEnde(true));
    return;
  }
  /*
   * DER VORSCHLAG DER ERKENNUNG - zum Bestätigen oder Verwerfen.
   *
   * Er steht über dem Modell, weil man dort SIEHT, ob er stimmt: liegt die
   * Zeichnung über dem Joch, ist die Sache erledigt; liegt sie daneben, sagt
   * ein Knopf es weiter.
   */
  if (erkannt && ansicht.zeichnung) {
    n.hidden = false;
    /*
     * DIE ZAHL BRAUCHT IHREN NAMEN.
     *
     * «Zutrauen 39 %» las sich, als sei die Erkennung unsicher - dabei ist 39
     * der ABSTAND ZUM DRITTEN: der nächstlängste senkrechte Strich auf dem
     * Blatt ist um so viel kürzer als der kürzere Mast. Das ist ein
     * deutliches Ergebnis, und die Anschrift muss das sagen, statt Zweifel
     * zu säen, die nicht bestehen.
     */
    n.innerHTML = '<span>Zeichnung selbst eingemessen nach '
      + `<b>${esc(erkannt.label ?? 'Jochenden')}</b>, die beiden Masten `
      + 'heben sich ab (nächster Strich '
      + `${Math.round(erkannt.guete * 100)} % kürzer). <b>Sitzt sie?</b></span>`
      + '<button class="btn btn-mini" data-erk-ok>passt</button>'
      + '<button class="btn btn-mini" data-erk-hand>von Hand einmessen</button>';
    n.querySelector('[data-erk-ok]').onclick = () => { erkannt = null; zeichneBalken(); };
    n.querySelector('[data-erk-hand]').onclick = () => {
      erkannt = null; kalibrierenStarten();
    };
    return;
  }
  if (zeichnungMenue && ansicht.zeichnung) {
    n.hidden = false;
    const eingemessen = Boolean(ansicht.zeichnung.kalibrierung)
                     && !ansicht.zeichnung.vorlaeufig;
    n.innerHTML = `<span>Zeichnung — ${eingemessen
        ? 'eingemessen' : '<b>noch nicht eingemessen</b>'}</span>`
      /*
       * AUCH WENN NOCH NICHT EINGEMESSEN WURDE.
       *
       * Ein frisch eingelegtes Bild liegt vorlaeufig da - um das Modell
       * herum, grob in der Groesse. Gerade dort will man es zurechtruecken. Am
       * Zustand aendert das nichts: «noch nicht eingemessen» steht weiter
       * daneben, denn geschoben ist nicht gemessen.
       */
      + '<button class="btn btn-mini" data-z-schieb>Verschieben</button>'
      + '<button class="btn btn-mini" data-z-ausr title="Einen Punkt der Zeichnung '
      + 'auf Mastfuss, Anschluss, Mastkopf, Jochende oder einen freien Punkt '
      + 'legen - der Massstab bleibt">Ausrichten</button>'
      + '<button class="btn btn-mini" data-z-mess>Neu einmessen</button>'
      + '<button class="btn btn-mini" data-z-neu>Bild ersetzen</button>'
      + '<button class="btn btn-mini btn-fail" data-z-weg>Entfernen</button>'
      + '<button class="btn btn-mini" data-z-ab>Abbrechen</button>';
    n.querySelector('[data-z-mess]').onclick = () => {
      zeichnungMenue = false; kalibrierenStarten();
    };
    n.querySelector('[data-z-schieb]').onclick = () => bildSchiebenStarten();
    n.querySelector('[data-z-ausr]').onclick = () => ausrichtenStarten();
    n.querySelector('[data-z-neu]').onclick = () => zeichnungWaehlen();
    n.querySelector('[data-z-weg]').onclick = () => zeichnungEntfernen();
    n.querySelector('[data-z-ab]').onclick = () => zeichnungMenueEnde();
    return;
  }
  if (setzen) {
    const st = setzen.stelle;
    if (!st) {
      n.hidden = false;
      const d = setzen.daneben;
      // Steht die Wahl schon fest, sagt der Balken ihren NAMEN - sonst weiss
      // man nach dem Ziehen nicht mehr, was gleich abgesetzt wird.
      const vw = setzen.vorwahl ? vorwahlName(setzen.vorwahl) : null;
      n.innerHTML = `<span>${setzen.hinweis
        ? esc(setzen.hinweis)
        : d
        ? `Dort ist <b>x = ${d.x.toFixed(2)} m</b>, <b>z = ${d.z.toFixed(2)} m</b>`
          + ' — auf das Joch oder einen Masten klicken'
        : vw
          ? `<b>${esc(vw)}</b> setzen — <b>ins Modell klicken</b>, wohin es gehört`
          : 'Bauteil setzen — <b>ins Modell klicken</b>, wohin es gehört'}</span>`
        + '<button class="btn btn-mini" data-setz-ab>Abbrechen</button>';
      n.querySelector('[data-setz-ab]').onclick = () => setzenEnde();
      return;
    }
    const wo = st.ort === 'joch'
      ? `am Joch bei <b>x = ${st.x.toFixed(2)} m</b>`
      : `am <b>Mast Ende ${st.ort === 'mastA' ? 'A' : 'B'}</b>, `
        + `<b>${st.hMast.toFixed(2)} m</b> über Fundament`;
    /*
     * GEORDNET STATT GESCHUETTET (Weisung).
     *
     * Vierzehn verschieden breite Knoepfe in einem Fluss - man las sie
     * dreimal, bevor man das richtige fand. Sortiert waren sie schon (nach
     * Rolle), aber man SAH die Ordnung nicht: ohne Trennung sieht eine
     * sortierte Liste aus wie eine unsortierte.
     *
     * Jetzt eine Spalte je Rolle, mit Ueberschrift, und darin gleich breite
     * Knoepfe untereinander. Die Reihenfolge ist die des Bauens: was traegt
     * zuerst, dann die Aufbauten, dann das Drahtwerk.
     */
    const ROLLENTITEL = { traeger: 'Träger', aufbau: 'Aufbau', drahtwerk: 'Drahtwerk' };
    const nachRolle = new Map();
    vorlagenFuer(st.ort).forEach(({ v, rolle }) => {
      if (!nachRolle.has(rolle)) nachRolle.set(rolle, []);
      nachRolle.get(rolle).push(v);
    });
    const spalten = [...nachRolle.entries()].map(([rolle, vs]) => `
      <div class="wahl-spalte">
        <div class="wahl-t">${esc(ROLLENTITEL[rolle] ?? rolle)}</div>
        ${vs.map((v) => `<button class="btn btn-mini" data-setz-vorlage="${esc(v.id)}"
           title="${esc(v.beschreibung ?? v.name)}">${esc(v.name)}</button>`).join('')}
      </div>`).join('')
      /*
       * UND WAS SCHON DASTEHT (Weisung: «wenn man bei der auswahl des
       * bauteils auf die sidebar bezieht, da sind diese schon enthalten»).
       *
       * Der zweite Rueckleiter ist derselbe wie der erste - samt jeder Zahl,
       * die von Hand daran geaendert wurde. Ueber die Vorlage neu aufgebaut
       * waere er es NICHT: die Vorlage kennt die Aenderungen nicht.
       */
      + kopierbareHtml(st.ort);
    n.hidden = false;
    /*
     * >>> DIE BEIDEN KNOEPFE STEHEN LINKS, UNTER DEM TITEL. <<<
     *
     * Weisung vom 3. September: «diese beiden buttons auf die linke seite
     * nehmen um platz zu sparen.»
     *
     * Vorher standen sie RECHTS neben der Vorlagenwahl und beanspruchten
     * dort eine eigene Spalte - bei drei Rollenspalten war der Balken damit
     * breiter als noetig. Unter dem Titel nutzen sie den Platz, der links
     * ohnehin frei bleibt: der Titel ist eine Zeile hoch, die Spalten
     * daneben sind es nicht.
     */
    n.innerHTML = '<div class="balken-kopf">'
      + `<span>Was kommt ${wo}?</span>`
      + '<button class="btn btn-mini" data-setz-neu>andere Stelle</button>'
      + '<button class="btn btn-mini" data-setz-ab>Abbrechen</button>'
      + `</div><div class="balken-wahl">${spalten}</div>`;
    n.querySelectorAll('[data-setz-vorlage]').forEach((b) => {
      b.onclick = () => setzeVorlageAnStelle(b.dataset.setzVorlage);
    });
    n.querySelectorAll('[data-setz-kopie]').forEach((b) => {
      b.onclick = () => setzeKopieAnStelle(b.dataset.setzKopie);
    });
    n.querySelector('[data-setz-neu]').onclick = () => {
      setzen = { stelle: null }; zeichneBalken();
    };
    n.querySelector('[data-setz-ab]').onclick = () => setzenEnde();
    return;
  }
  n.hidden = true; n.innerHTML = '';
  if (canvas) canvas.style.removeProperty('cursor');
}

/**
 * EINFÜGEN UND HINEINZIEHEN.
 *
 * Das Einfügen hängt am Fenster, nicht am Modell: ein Canvas nimmt keinen
 * Tastaturfokus, und wer Strg+V drückt, hat gerade den Ausschnitt gemacht
 * und nicht erst irgendwohin geklickt. Wird in einem Eingabefeld eingefügt,
 * bleibt es dort - sonst risse die Zeichnung jeden Text an sich.
 */
function verdrahteZeichnung() {
  const inFeld = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'
    || el.isContentEditable);
  window.addEventListener('paste', async (ev) => {
    if (inFeld(document.activeElement)) return;
    const blob = bildAusEreignis(ev);
    if (!blob) return;
    ev.preventDefault();
    await zeichnungEinlegen(blob, 'eingefügt');
  });
  const v = ui.el('viewer');
  if (!v) return;
  v.addEventListener('dragover', (ev) => { ev.preventDefault(); });
  v.addEventListener('drop', async (ev) => {
    const blob = bildAusEreignis(ev);
    if (!blob) return;
    ev.preventDefault();
    /*
     * UND NICHT WEITERREICHEN.
     *
     * pwa.js horcht am FENSTER auf jede abgelegte Datei und gibt sie an den
     * Ablage-Import - der erwartet JSON. Ohne diese Zeile lud das Bild
     * richtig und darueber erschien «Das ist kein lesbares JSON»: zwei
     * Empfaenger fuer denselben Wurf, und der zweite war der falsche.
     * preventDefault allein genuegt dafuer nicht; es unterdrueckt nur, was
     * der Browser von sich aus taete.
     */
    ev.stopPropagation();
    await zeichnungEinlegen(blob, blob.name ?? 'Datei');
  });
}

// --- Anbauteile: Vorlagen, Lage, Generator ----------------------------------

/** Ein angelegtes Anbauteil als eigene Vorlage sichern. */
function vorlageSichern(i) {
  const a = (werte.anbauteile ?? [])[i];
  if (!a) return;
  const name = prompt('Name der Vorlage:', a.name);
  if (!name) return;
  const neu = alsVorlage(a, name);
  const alt = werte.eigeneVorlagen ?? [];
  /*
   * >>> NICHT ZWEIMAL DASSELBE. <<<
   *
   * Weisung vom 9. September: «Die kacheln sind teilweise mehrfach enthalten,
   * die ich mal definiert und gespeichert habe.»
   *
   * Bisher wurde angehaengt. Wer denselben Namen ein zweites Mal bestaetigte,
   * bekam eine zweite Kachel - und beim dritten Mal eine dritte. Jetzt wird
   * gefragt: ERSETZEN heisst, die Vorlage ist neu gefasst; DANEBEN heisst,
   * es sind zwei, und dann bekommt die zweite auch einen eigenen Namen.
   */
  const gleich = alt.findIndex(
    (v) => String(v.name ?? '').trim() === name.trim());
  let liste;
  if (gleich >= 0) {
    const ersetzen = confirm(
      `Eine eigene Vorlage «${name}» gibt es schon.

`
      + 'OK ersetzt sie. Abbrechen legt die neue daneben — sie bekommt dann '
      + 'einen eigenen Namen.');
    if (ersetzen) {
      liste = alt.map((v, k) => (k === gleich ? { ...neu, id: v.id } : v));
    } else {
      const frei = (n) => (alt.some((v) => v.name === n)
        ? frei(`${name} (${alt.filter((v) => v.name.startsWith(name)).length
                          + 1})`) : n);
      liste = [...alt, { ...neu, name: frei(`${name} (2)`) }];
    }
  } else {
    liste = [...alt, neu];
  }
  werte = { ...werte, eigeneVorlagen: liste };
  setzeEigeneVorlagen(liste);
  neuRechnen();
}

function vorlageEntfernen(id) {
  const liste = (werte.eigeneVorlagen ?? []).filter((v) => v.id !== id);
  werte = { ...werte, eigeneVorlagen: liste };
  setzeEigeneVorlagen(liste);
  neuRechnen();
}

/**
 * VORLAGE ANPASSEN.
 *
 * Die Katalogvorlagen sind die gepflegte Grundlage und werden nicht verändert -
 * sonst wüsste hinterher niemand mehr, was «Hängestütze mit Fahrleitung»
 * eigentlich heisst. Wer eine anpasst, bekommt deshalb eine EIGENE KOPIE
 * daneben; eigene Vorlagen werden an Ort bearbeitet.
 */
function dialogVorlageBearbeiten(id) {
  let v;
  try { v = getVorlage(id); } catch { return; }
  const istKopie = !v.eigen;
  // Arbeitskopie, auf der der Dialog schreibt
  const w = { ...v, name: istKopie ? `${v.name} (angepasst)` : v.name,
              module: (v.module ?? []).map((m) => ({
                ...m, z: m.z ?? -(m.ev ?? 0), y: m.y ?? m.ex ?? 0 })) };

  const zeichnen = () => {
    d.node.querySelector('.dialog-koerper').innerHTML = ui.vorlageFormular(w, istKopie);
    verdrahten();
  };
  const verdrahten = () => {
    const n = d.node;
    n.querySelectorAll('.vm').forEach((inp) => {
      const ev = inp.tagName === 'SELECT' ? 'change' : 'input';
      inp.addEventListener(ev, () => {
        const k = +inp.dataset.vm;
        const wert = inp.type === 'number' ? (parseFloat(inp.value) || 0) : inp.value;
        w.module[k] = { ...w.module[k], [inp.dataset.vk]: wert };
      });
    });
    n.querySelectorAll('[data-vm-weg]').forEach((b) => {
      b.onclick = () => { w.module.splice(+b.dataset.vmWeg, 1); zeichnen(); };
    });
    const neu = n.querySelector('#vl-neu');
    if (neu) {
      neu.onclick = () => {
        const letzt = w.module[w.module.length - 1];
        w.module.push({ bauteil: flBauteile('aufbau')[0]?.id, anzahl: 1,
                        laenge: null, winkel: null, y: 0, z: letzt?.z ?? -1.5 });
        zeichnen();
      };
    }
  };

  const d = dialog(istKopie ? `Vorlage anpassen: ${v.name}` : `Vorlage: ${v.name}`,
    ui.vorlageFormular(w, istKopie),
    '<button class="btn btn-acc" data-ok>Sichern</button>');
  verdrahten();

  d.node.querySelector('[data-ok]').onclick = () => {
    const name = ui.el('vl-name').value.trim() || w.name;
    const eintrag = {
      id: istKopie ? `EV-${Math.random().toString(36).slice(2, 8)}` : v.id,
      name, beschreibung: istKopie ? `Angepasst aus «${v.name}»` : v.beschreibung,
      farbe: v.farbe ?? 'direkt',
      befestigung: ui.el('vl-bef').value,
      raster: parseFloat(ui.el('vl-raster').value) || 0.4,
      module: w.module.map((m) => ({ ...m })),
      lastbloecke: (v.lastbloecke ?? []).map((l) => ({ ...l })),
      eigen: true,
    };
    /*
     * EINE ANGEPASSTE KATALOGVORLAGE ZWEIMAL ANGEPASST ist keine zweite
     * Kachel. `entdoppelteVorlagen` faengt das ab: gleicher Name, gleicher
     * Inhalt - eine Vorlage. Die Liste bleibt hier trotzdem vollstaendig,
     * damit eine bewusst zweite Fassung (anderer Inhalt) stehen bleibt.
     */
    const liste = entdoppelteVorlagen(istKopie
      ? [...(werte.eigeneVorlagen ?? []), eintrag]
      : (werte.eigeneVorlagen ?? []).map((x) => (x.id === v.id ? eintrag : x)));
    werte = { ...werte, eigeneVorlagen: liste };
    setzeEigeneVorlagen(liste);
    d.zu();
    neuRechnen();
  };
}

/**
 * Auf ein Anbauteil im Modell fahren - in der EINZELHEIT.
 *
 * Solange man an einer Baugruppe arbeitet, zeigt das Modellfenster sie gross
 * und mit ihrer Bemassung. Sobald die Karte zufällt, kommt über
 * anbauteilBlickZurueck() das ganze Joch wieder.
 */
function zoomAufAnbauteil(i, sanft = false) {
  const a = (werte.anbauteile ?? [])[i];
  if (!a) return;
  if (sanft && zuletztGezoomt === i) return;
  zuletztGezoomt = i;
  ansicht.zeigeAnbauteil(i);
}

/**
 * EIN Anbauteil in den Vordergrund holen.
 *
 * Bei zehn bis zwanzig Teilen ist die Liste in der Schublade länger als der
 * Bildschirm. Ein Klick ins Modell soll deshalb nicht bloss scrollen, sondern
 * aufräumen: die angeklickte Karte auf, alle übrigen zu, der Reiter gewählt -
 * und falls die Schublade eingeklappt war, fährt sie aus. Man sieht danach
 * genau das eine Teil, das man angefasst hat.
 */
function zeigeAnbauteil(i) {
  if (i === null || i === undefined) return;
  const a = (werte.anbauteile ?? [])[i];
  if (!a) return;
  tabEingabe = 'anbau';
  // Alle Karten schliessen, die angeklickte öffnen.
  (werte.anbauteile ?? []).forEach((x) => ui.setzeKlapp(`at-${x.id}`, false));
  ui.setzeKlapp(`at-${a.id}`, true);
  neuRechnen();
  if (zuSeite.links) ausklappen('links');
  zoomAufAnbauteil(i);
  // Nach dem Neuaufbau der Maske die Karte ins Bild holen.
  requestAnimationFrame(() => {
    const k = ui.el('maske')?.querySelector(`.at-karte[data-idx="${i}"]`);
    k?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    k?.classList.add('blitz');
    setTimeout(() => k?.classList.remove('blitz'), 1400);
  });
}

/**
 * ESC BRICHT AB - und zwar das, was gerade zuletzt aufging.
 *
 * Ohne Rangfolge würde Esc alles auf einmal zurücksetzen und man verlöre mehr,
 * als man wollte. Deshalb wird von aussen nach innen abgeräumt: erst der
 * Dialog, dann die Schublade, dann die Einzelheitsbetrachtung, dann die
 * Auswahl, zuletzt das vergrösserte Diagramm. Jeder Druck einen Schritt.
 */
function abbrechen() {
  // Das Kontextmenue geht zuerst: es liegt ueber allem anderen.
  if (kontextMenue) { kontextSchliessen(); return; }
  /*
   * ESC BEENDET DAS SCHIEBEN, ohne es zurueckzunehmen.
   *
   * Anders als beim Einmessen gibt es hier keinen halbfertigen Zustand:
   * das Bild liegt, wo es liegt. Wer die alte Lage zurueck will, druckt
   * «zurueck» im Balken - das steht daneben, solange etwas verschoben ist.
   */
  if (bildSchieben) { bildSchiebenEnde(false); return; }
  // Ausrichten und Einmessen haben einen halbfertigen Zustand - Esc nimmt
  // ihn zurueck, die Lage des Bildes bleibt, wie sie vorher war.
  if (ausrichtung) { ausrichtenEnde(false); return; }
  if (kalibrierung) { kalibrierenEnde(); return; }
  const dlg = ui.el('ueberlagerung')?.firstElementChild;
  if (dlg) { dlg.querySelector('[data-zu]')?.click(); return; }
  if (schubladeOffen) { schubladeSchliessen(); return; }
  if (ansicht?.detail) { anbauteilBlickZurueck(); return; }
  if (ansicht?.auswahlTeil || station !== null) {
    ansicht.auswahlTeil = null;
    station = null; ansicht.station = null;
    ansicht.zeichne();
    zeichneAuswertung();
    return;
  }
  if (buehne) { buehne = null; zeichneBuehne(); return; }
  if (ansicht?.fokus) ansicht.ganzesJoch();
}

/** Zurück vom Einzelheitsblick auf das ganze Joch. */
function anbauteilBlickZurueck() {
  zuletztGezoomt = null;
  ansicht.auswahlTeil = null;
  ansicht.ganzesJoch();
}

/**
 * Auf- und Zuklappen eines Abschnitts.
 * Nur die Anbauteil-Karten steuern das Modellfenster: aufgeklappt heisst
 * "ich arbeite daran", zugeklappt "fertig".
 */
function klappWechsel(schluessel, offen) {
  if (!schluessel.startsWith('at-') || !ansicht) return;
  const id = schluessel.slice(3);
  const i = (werte.anbauteile ?? []).findIndex((a) => a.id === id);
  if (i < 0) return;
  if (offen) zoomAufAnbauteil(i);
  else if (zuletztGezoomt === i) anbauteilBlickZurueck();
}

/**
 * Lastgenerator: Anbauteile über die Gleise verteilen.
 *
 * Ein Joch trägt je Gleis dieselbe Ausrüstung. Statt jedes Teil einzeln zu
 * setzen, wird hier die Gleislage beschrieben - der Rest folgt daraus.
 */
function dialogGenerator() {
  const g = { gleise: 2, abstand: 4.5, versatz: 0, ersetzen: true,
              vorlagen: ['haengestuetze'], ...(werte.generator ?? {}) };

  const koerper = () => `
    <div class="gen-gitter">
      <div class="feld"><label for="gen-n">Anzahl Gleise</label>
        <div class="zahlfeld"><input id="gen-n" type="number" min="1" max="12"
          step="1" value="${g.gleise}"><span class="einheit">–</span></div></div>
      <div class="feld"><label for="gen-a">Gleisabstand</label>
        <div class="zahlfeld"><input id="gen-a" type="number" min="0.5" step="0.1"
          value="${g.abstand}"><span class="einheit">m</span></div></div>
      <div class="feld"><label for="gen-v">Versatz zur Jochmitte</label>
        <div class="zahlfeld"><input id="gen-v" type="number" step="0.1"
          value="${g.versatz}"><span class="einheit">m</span></div></div>
    </div>
    <div class="sec">Je Gleis anbringen</div>
    <div class="haken haken-1">${vorlagen().map((v) => `
      <label><input type="checkbox" data-gen-v="${esc(v.id)}"
        ${g.vorlagen.includes(v.id) ? 'checked' : ''}><span>${esc(v.name)}</span></label>`).join('')}
    </div>
    <label class="schalter" style="margin-top:8px"><input id="gen-ersetzen"
      type="checkbox" ${g.ersetzen ? 'checked' : ''}>
      <span>Vorhandene Anbauteile ersetzen</span></label>
    <div id="gen-vorschau" class="infobox"></div>`;

  const d = dialog('Lastgenerator', koerper(),
    '<button class="btn btn-acc" data-ok>Erzeugen</button>');

  const lies = () => ({
    gleise: parseInt(ui.el('gen-n').value, 10) || 0,
    abstand: parseFloat(ui.el('gen-a').value) || 0,
    versatz: parseFloat(ui.el('gen-v').value) || 0,
    ersetzen: ui.el('gen-ersetzen').checked,
    vorlagen: [...d.node.querySelectorAll('[data-gen-v]')]
      .filter((c) => c.checked).map((c) => c.dataset.genV),
  });

  const vorschau = () => {
    const o = lies();
    const r = erzeugeGleislasten({ L: werte.L, ...o });
    ui.el('gen-vorschau').innerHTML = r.gleisX.length
      ? `<b>${r.teile.length}</b> Anbauteile auf <b>${r.gleisX.length}</b> Gleisen bei
         x = ${r.gleisX.map((x) => x.toFixed(2)).join(' · ')} m.` +
        (r.ausserhalb ? `<br><b>${r.ausserhalb}</b> Gleis(e) lägen ausserhalb des
         Jochs (0 … ${werte.L.toFixed(2)} m) und werden ausgelassen.` : '')
      : 'Keine Gleislage innerhalb des Jochs, Abstand oder Anzahl anpassen.';
  };

  d.node.querySelectorAll('input').forEach((i) => {
    i.addEventListener('input', vorschau);
    i.addEventListener('change', vorschau);
  });
  vorschau();

  d.node.querySelector('[data-ok]').onclick = () => {
    const o = lies();
    const r = erzeugeGleislasten({ L: werte.L, ...o });
    if (!r.teile.length) return;
    werte = { ...werte, generator: o };
    d.zu();
    tabEingabe = 'anbau';
    setzeAnbauteile(o.ersetzen ? r.teile : [...(werte.anbauteile ?? []), ...r.teile]);
    ansicht.ganzesJoch();
  };
}

/** Nachweisschnitt auf die Mitte eines anderen Feldes legen. */
function waehleSchnittfeld(feld) {
  const s = schnittstellen(letzte?.anzeige.modell ?? letzte?.erg.modell);
  const z = s[Math.max(0, Math.min(s.length - 1, feld))];
  if (!z) return;
  werte = { ...werte, xNachweis: z.x };
  station = null;
  neuRechnen();
  if (werte.schnittAktiv) zeigeSchnittImModell();
}

/** Aus der Ergebnisliste auf eine Stelle springen und dort heranzoomen. */
function springeZu(st, x) {
  station = st;
  werte = { ...werte, xNachweis: x };
  // Im Blatt, nicht im Tragwerk - siehe `blattVersatz`.
  ansicht.zoomAuf(blattVersatz() + x, st);
  neuRechnen();
}

// --- Werkzeugleisten --------------------------------------------------------

function baueKopf() {
  const n = ui.el('kopf-werkzeuge');
  // Nur noch was mit dem AKTUELLEN Stand zu tun hat: ausleiten, drucken,
  // einstellen. Neu, Speichern und die Ablage sind in die Bannerschublade
  // gewandert - sie gehören zum Projekt, nicht zum Werkzeugkasten, und dort
  // stehen sie gemeinsam mit den Vorlagen.
  /* =======================================================================
   * >>> DAS MENUEBAND, IN VIER GRUPPEN. <<<
   * =======================================================================
   *
   * Weisung vom 16. September: «das menueband allgemein überarbeiten
   * ordnen» - und die Frage, wo die Tabelle der Bauteildaten aufzurufen
   * sei. Sie war nur über die Taste k erreichbar; im Band stand sie nicht.
   *
   * Bis dahin standen neun Knöpfe in einer Reihe, in der Reihenfolge ihres
   * Hinzukommens: Handbuch zwischen Wiederherstellen und Excel, Speichern
   * zwischen Drucken und Optionen. Jetzt gilt: was zusammengehört, steht
   * zusammen, und ein Strich trennt die Gruppen.
   *
   *   AUSGABE      AxisVM · Excel · Drucken   was den Stand hinausträgt
   *   BEARBEITEN   Rückgängig · Wiederherstellen · Speichern
   *   HILFE        Handbuch · Optionen
   *
   * BAUTEILDATEN UND TASTENKUERZEL STEHEN UNTER OPTIONEN (Weisung vom
   * 17. September: «bauteildaten und tastenkürzel unter optionen führen»).
   * Beide sind Nachschlagen und Einrichten, nicht Arbeiten am Tragwerk; die
   * Tasten k und ? bleiben.
   *
   * AXISVM BLEIBT GANZ LINKS (Weisung vom 1. September): der meistbegangene
   * Weg der Anwendung. Der Installieren-Knopf steht nur, solange der Browser ihn
   * anbietet, und zwar ganz rechts: er kommt und geht und soll dabei nichts
   * verschieben.
   *
   * Jeder Titel nennt sein Tastenkürzel, soweit es eines gibt - die
   * Belegung ist einstellbar, also wird sie gelesen, nicht hingeschrieben.
   * ===================================================================== */
  const kuerzel = (id) => {
    const t = TASTEN.find((x) => x.id === id);
    const k = t ? tasteVon(t) : '';
    return k ? ` (Taste ${k})` : '';
  };
  const knopf = (id, name, titel, taste = null) =>
    iconKnopf(id, name, `${titel}${taste ? kuerzel(taste) : ''}`);
  /*
   * MIT WORT (Durchsicht vom 18. September, Punkt U7): Bericht, Excel,
   * Drucken und Speichern standen nur als Symbole da - eine Diskette und
   * ein Drucker sind eindeutig, ein Blatt und ein Pfeil nicht. Im schmalen
   * Fenster faellt das Wort wieder weg (css: .tb-wort), das Symbol bleibt.
   */
  const knopfWort = (id, name, titel, wort) =>
    `<button class="btn-icon btn-icon-text" id="${esc(id)}" type="button"
       title="${esc(titel)}" aria-label="${esc(titel)}">${icon(name)}<span class="tb-wort">${esc(wort)}</span></button>`;
  const gruppe = (name, inhalt) =>
    `<div class="tb-gruppe" role="group" aria-label="${esc(name)}">${inhalt}</div>`;
  const strich = '<span class="tb-sep" aria-hidden="true"></span>';

  n.innerHTML =
    gruppe('Ausgabe',
      `<button class="btn-icon btn-icon-text btn-icon-acc" id="btn-axisvm" type="button"
         title="Modell nach AxisVM ausleiten, COM-Brücke, SAF, DXF oder PyNite"
         aria-label="AxisVM-Ausleitung">${icon('schnitt')}<span>AxisVM</span></button>`
      + knopfWort('btn-bericht', 'bericht', 'Nachweisbericht: A4-Seiten zum Drucken als PDF', 'Bericht')
      + knopfWort('btn-export', 'export', 'Excel-Ausleitung der Berechnung (.xlsx)', 'Excel')
      + knopfWort('btn-drucken', 'drucken', 'Drucken / PDF', 'Drucken'))
    + strich
    + gruppe('Bearbeiten',
      `<button class="btn-icon" id="btn-zurueck" type="button" title="Rückgängig (Strg+Z)"
         aria-label="Rückgängig"${hist.kannZurueck() ? '' : ' disabled'}
         >${icon('links')}</button>`
      + `<button class="btn-icon" id="btn-vor" type="button"
         title="Wiederherstellen (Strg+Umschalt+Z)" aria-label="Wiederherstellen"${
         hist.kannVor() ? '' : ' disabled'}>${icon('rechts')}</button>`
      // SPEICHERN, nicht Datenbasis (Weisung, 1. September): wer auf eine
      // Diskette drückt, will sein Modell sichern.
      + knopfWort('btn-speichern', 'speichern', 'Tragwerk in der Ablage speichern', 'Speichern'))
    + strich
    + gruppe('Hilfe und Einstellungen',
      knopf('btn-handbuch', 'info', 'Handbuch: Herleitung und Modellgrenzen', 'handbuch')
      + knopf('btn-optionen', 'optionen',
              'Optionen, Bauteildaten, Tastenkürzel und Darstellung', 'optionen'))
    // Nur solange der Browser es anbietet - ganz rechts, damit nichts springt.
    + (kannInstallieren()
      ? strich + knopf('btn-install', 'installieren',
                       'Auf diesem Gerät installieren - läuft danach auch ohne Netz')
      : '');

  if (kannInstallieren()) ui.el('btn-install').onclick = () => installiere();
  ui.el('btn-zurueck').onclick = () => rueckgaengig();
  ui.el('btn-vor').onclick = () => wiederherstellen();
  ui.el('btn-handbuch').onclick = dialogHandbuch;
  ui.el('btn-export').onclick = exportKlick;
  ui.el('btn-bericht').onclick = dialogBericht;
  ui.el('btn-axisvm').onclick = dialogAxisvm;
  ui.el('btn-drucken').onclick = () => handlung('Drucken', () => window.print());
  ui.el('btn-speichern').onclick = () => ablageSpeichern(false);
  ui.el('btn-optionen').onclick = dialogOptionen;
  /*
   * DER BEZUGSPUNKT WIRD NUR EINMAL GESETZT.
   *
   * `baueKopf` laeuft bei JEDER Aenderung - es zeichnet den Kopf neu. Stuende
   * `markiereGesichert()` unbedingt hier, setzte sich die Signatur bei jeder
   * Eingabe auf den eben getippten Stand, und nichts waere je ungesichert.
   * Beim ersten Durchgang ist sie null; nur dann greift die Zeile.
   */
  if (gesicherteSignatur === null) {
    if (wiederhergestellt?.gesichert) {
      // Der Bezugspunkt aus der letzten Sitzung - sonst gaelte ein
      // ungesicherter Stand nach dem Neustart als gesichert.
      gesicherteSignatur = wiederhergestellt.gesichert;
      ungesichert = standSignatur() !== gesicherteSignatur;
      zeigeSpeicherstand();
    } else {
      markiereGesichert();
    }
  } else zeigeSpeicherstand();
}

function aktualisiereProjektKnopf() {
  const b = ui.el('btn-projekt');
  if (!b) return;
  /*
   * DIE VERORTUNG GEHOERT IN DEN KOPF (Weisung, 1. September).
   *
   * Sie unterscheidet die Tragwerke eines Projekts - der Jochtyp tut das
   * nicht, denn ein Projekt hat viele J90. Bis zum 1. September stand sie in
   * der Kopfleiste ueber dem Modell; die ist weggefallen, und damit war der
   * einzige Ort weg, an dem beim Rechnen zu sehen war, WELCHES Tragwerk auf
   * dem Tisch liegt.
   *
   * Hier steht sie richtig: neben Projekt und Name, also bei den anderen
   * Angaben, die das Tragwerk benennen statt es zu beschreiben. Ist nichts
   * eingetragen, faellt sie weg - drei leere Trennzeichen sagen nichts.
   */
  const ort = verortung(werte);
  gezeigteVerortung = ort;
  b.innerHTML =
    `${icon('projekte', 14)} <span>${esc(projekt.projekt || 'Ohne Projekt')}</span>` +
    ` · <b>${esc(projekt.name)}</b>${ungesichert ? '<i class="ungesichert" title="noch nicht in der Ablage">•</i>' : ''}`
    + (ort ? ` <span class="tb-ort">· ${esc(ort)}</span>` : '')
    + ` ${icon('rechts', 12)}`;
  const zeit = entwurfZeit();
  // Der Titel sagt BEIDES: dass nichts verlorengeht, und was der Ablage fehlt.
  b.title = 'Projektablage und Vorlagen öffnen'
    + (zeit ? `\nArbeitsstand gesichert ${zeit} (bei jeder Eingabe)` : '')
    + (ungesichert
        ? `\nIn der Ablage steht noch der Stand von zuletzt, hier speichern`
        : (projekt.id ? '\nMit der Ablage übereinstimmend'
                      : '\nNoch nicht in der Ablage'));
}

/** Zeichnet nur den Knopf neu - nach jeder Aenderung des Speicherzustands. */
function zeigeSpeicherstand() { aktualisiereProjektKnopf(); }

/*
 * TASTENKUERZEL.
 *
 * Sie stehen in EINER Tabelle, nicht verstreut im Ereignishandler: nur so
 * lassen sie sich anzeigen, pruefen und ergaenzen, ohne dass eine Belegung
 * doppelt vergeben wird.
 *
 * ZWEI REGELN, DIE JEDE BELEGUNG BINDEN:
 *
 * 1. WER TIPPT, TIPPT. In einem Textfeld gehoert jede Taste dem Feld. Ein
 *    Kuerzel, das dort zuschlaegt, ist die unangenehmste Art hilfreich zu
 *    sein. Zahlen- und Auswahlfelder sind ausgenommen, aber nur fuer die
 *    Kuerzel MIT Steuertaste - ein blosses «q» im Zahlenfeld bleibt Text.
 *
 * 2. NICHTS OHNE RUECKWEG. Kein Kuerzel loescht, ueberschreibt oder leitet
 *    aus; sie waehlen Ansichten, oeffnen Fenster und schalten Ebenen. Was
 *    Folgen hat, verlangt weiterhin einen Klick.
 */
/*
 * >>> JEDES KUERZEL HAT EINE KENNUNG. <<<
 *
 * Weisung vom 2. September: «Tastenkürzel in die optionen aufnehmen und
 * anpassbar machen.»
 *
 * Anpassbar heisst: die gewaehlte Taste muss irgendwo stehen - und zwar so,
 * dass sie eine ANDERE Belegung ueberdauert. Ueber die Taste selbst ginge
 * das nicht (wer «q» auf «w» legt, verlore die Zuordnung), also ueber die
 * `id`. Sie ist ein Name der HANDLUNG, nicht der Taste.
 *
 * Was `still` traegt, ist nicht belegbar: Esc und die Steuertasten gehoeren
 * dem System, und «1 … 7» ist eine Reihe, keine Taste.
 */
const TASTEN = [
  { id: 'hilfe', taste: '?', text: 'Diese Übersicht', tun: () => dialogTasten() },
  { taste: 'Esc', text: 'Abbrechen, Dialog schliessen', still: true },
  { taste: 'Strg Z', text: 'Rückgängig', still: true },
  { taste: 'Strg ⇧ Z', text: 'Wiederherstellen', still: true },

  { gruppe: 'Blick' },
  { id: 'quer', taste: 'q', text: 'Querschnitt', tun: () => blickAuf('quer') },
  { id: 'laengs', taste: 'l', text: 'Längsschnitt', tun: () => blickAuf('laengs') },
  { id: 'iso', taste: 'i', text: 'Isometrie', tun: () => blickAuf('iso') },
  { id: 'oben', taste: 'd', text: 'Draufsicht', tun: () => blickAuf('oben') },
  { id: 'zurueck', taste: '0', text: 'Ansicht zurücksetzen',
    tun: () => { ansicht.passeEin(); ansicht.zeichne(); } },
  { id: 'ganz', taste: 'g', text: 'Ganzes Querprofil zeigen',
    tun: () => { station = null; ansicht.station = null;
                 ansicht.ansichtZuruecksetzen(); zeichneAuswertung(); } },
  { id: 'teil', taste: 't', text: 'Nur das gerechnete Tragwerk',
    tun: () => zoomAufTragwerk(werte.twId ?? 'T1') },

  { gruppe: 'Aufgetragene Grösse' },
  // Die Reihenfolge ist die von MODI, nicht eine eigene: sonst liefe die
  // Nummer der Taste der Reihenfolge der Knopfleiste davon.
  { taste: '1 … 7', text: 'η · σ_v · σ · M · V · Positionen · neutral',
    still: true },

  { gruppe: 'Bauen' },
  { id: 'setzen', taste: 'b', text: 'Bauteil setzen',
    tun: () => (setzen ? setzenEnde() : setzenStarten()) },
  { id: 'naechstes', taste: 'n', text: 'Nächstes Tragwerk rechnen',
    tun: () => naechstesTragwerk() },

  { gruppe: 'Fenster' },
  { id: 'ablage', taste: 'p', text: 'Projektablage', tun: () => schubladeUmschalten() },
  { id: 'optionen', taste: 'o', text: 'Optionen', tun: () => dialogOptionen() },
  { id: 'bauteildaten', taste: 'k', text: 'Bauteildaten',
    tun: () => dialogBauteildaten() },
  { id: 'handbuch', taste: 'h', text: 'Handbuch', tun: () => dialogHandbuch() },
];

/**
 * Die WIRKSAME Taste eines Kuerzels: die eigene Belegung, sonst die Vorgabe.
 *
 * Eine leere Belegung heisst «abgeschaltet» - auch das ist eine Antwort, und
 * eine, die man auf einer fremden Tastatur braucht.
 */
function tasteVon(t) {
  if (!t?.id) return t?.taste ?? '';
  const eigen = werte?.tasten?.[t.id];
  return eigen === undefined ? t.taste : eigen;
}

/* ===========================================================================
 * >>> DAS FENSTER DER BAUTEILDATEN. <<<
 * ===========================================================================
 *
 * Weisung vom 16. September: «kannst du noch für die hinterlegten bauteile
 * anbauteile alle relevanten parameter werte in tabellen aufführen … diese
 * datenbank in der app sollte demnach ein separates modul sein, das
 * verdrahtet ist.»
 *
 * DIE FORM STEHT IN ui.daten.js, die Handlung hier - dieselbe Trennung wie
 * zwischen ui.js und app.js. Dieses Fenster tut genau drei Dinge: einen
 * Abschnitt wählen, die Tabelle zeigen, alles als Excel ausleiten.
 *
 * ES BEARBEITET NICHTS. Die stehende Vorgabe lautet, dass die Geometrie der
 * Jochträger im Detail zu übernehmen ist und eine Anpassung der
 * Blecheinteilung nicht zulässig; eine Maske zum Überschreiben stünde quer
 * dazu. Wer etwas ändert, ändert die Datei und liest sie als Paket wieder
 * ein - dann läuft die Änderung durch die Prüfung des Feldkatalogs.
 * ========================================================================= */

/**
 * Alles, was an Datenbanken geladen ist, in EINEM Satz.
 *
 * Jede einzeln in `try`: das Sortiment darf fehlen, und ein fehlender Teil
 * soll die übrigen nicht mitnehmen. Die Ansicht sagt dann, was fehlt.
 */
function datenBestand() {
  const nimm = (fn) => { try { return fn() ?? null; } catch { return null; } };
  return {
    normen: nimm(normen),
    masten: nimm(mastenDB),
    tragjoche: nimm(datenbank),
    abfangjoche: nimm(abfangDB),
    anker: nimm(ankerDB),
    fl_bauteile: nimm(flDB),
    anbauteile: nimm(anbauteilDB),
  };
}

/** Je Sortiment die Setzfunktion - für das Übernehmen eines Einlesens. */
const DATEN_SETZER = {
  normen: setzeNormen, masten: setzeMastenDB, tragjoche: setzeDatenbank,
  abfangjoche: setzeAbfangDB, anker: setzeAnkerDB, fl_bauteile: setzeFlDB,
  anbauteile: setzeAnbauteilDB,
};

const datenAnsicht = { aktiv: null, filter: '', regel: {} };

function dialogBauteildaten() {
  const best = datenBestand();
  const tabellen = alsTabellen(best);
  if (!datenAnsicht.aktiv) datenAnsicht.aktiv = ersteAnsicht(best);
  /*
   * DIE BLECHREGEL WIRD EINMAL JE OEFFNEN GEPRUEFT. Sie läuft über alle Typen
   * und alle Längen - rund tausend Einteilungen. Das dauert einen Moment
   * und soll nicht bei jedem Klick in der Leiste wiederkehren.
   */
  let befunde = null;
  try { befunde = blechregelPruefen(); } catch { befunde = []; }
  const nimm = (fn) => { try { return fn(); } catch { return []; } };
  const opt = () => ({
    tabellen, filter: datenAnsicht.filter, regel: datenAnsicht.regel,
    eingelesen: eingelesen(), befunde,
    tragjoche: nimm(tragjoche), abfangjoche: nimm(abfangjoche),
  });

  const d = dialog('Bauteildaten',
    zeichneDaten(best, datenAnsicht.aktiv, opt()),
    `<button class="btn" data-daten-einlesen>Einlesen …</button>
     <button class="btn" data-daten-excel>Alle Tabellen als Excel</button>
     <button class="btn" data-zu>Schliessen</button>`, 'dialog-breit');

  const neu = () => {
    d.node.querySelector('.dialog-koerper').innerHTML =
      zeichneDaten(best, datenAnsicht.aktiv, opt());
    verdrahte();
  };
  function verdrahte() {
    const n = d.node;
    n.querySelectorAll('[data-ansicht]').forEach((b) => {
      b.onclick = () => { datenAnsicht.aktiv = b.dataset.ansicht; datenAnsicht.filter = ''; neu(); };
    });
    const such = n.querySelector('.dat-suche');
    if (such) {
      // Gefiltert wird im Bild, nicht neu gezeichnet - sonst verlöre das Feld den Fokus.
      such.oninput = () => {
        datenAnsicht.filter = such.value;
        const f = such.value.trim().toLowerCase();
        n.querySelectorAll('tr[data-such]').forEach((tr) => {
          tr.hidden = Boolean(f) && !tr.dataset.such.includes(f);
        });
      };
    }
    n.querySelectorAll('[data-regel-wahl]').forEach((s) => {
      s.onchange = () => {
        if (s.dataset.regelWahl === 'typ') datenAnsicht.regel = { typ: s.value };
        else datenAnsicht.regel = { ...datenAnsicht.regel, L: Number(s.value) };
        neu();
      };
    });
    n.querySelectorAll('[data-regel-typ]').forEach((tr) => {
      tr.onclick = () => { datenAnsicht.regel = { typ: tr.dataset.regelTyp }; neu(); };
    });
    const sichern = n.querySelector('[data-eingelesen="sichern"]');
    if (sichern) sichern.onclick = () => eingelesenAlsDateien();
    const weg = n.querySelector('[data-eingelesen="verwerfen"]');
    if (weg) weg.onclick = () => {
      const w = dialog('Eingelesenen Stand verwerfen?',
        '<p>Danach gelten wieder die Dateien neben der Anwendung bzw. das '
        + 'hinterlegte Datenpaket. Die Anwendung wird neu gestartet.</p>',
        `<button class="btn" data-zu>Abbrechen</button>
         <button class="btn btn-acc" data-ja>Verwerfen</button>`);
      w.node.querySelector('[data-ja]').onclick = () => {
        eingelesenVerwerfen();
        location.reload();
      };
    };
  }
  verdrahte();

  d.node.querySelector('[data-daten-excel]').onclick = () => {
    const bl = datenBlaetter(tabellen, STIL, { blech: befunde });
    herunterladen(arbeitsmappe(bl),
      `${APP_NAME}_Bauteildaten_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  d.node.querySelector('[data-daten-einlesen]').onclick = () => datenEinlesen(tabellen);
  return d;
}

/** Den eingelesenen Stand als Dateien sichern - eine je Sortiment. */
function eingelesenAlsDateien() {
  const e = eingelesen();
  if (!e?.teile) return;
  const namen = Object.keys(e.teile);
  const d = dialog('Als Dateien sichern',
    `<p>Je Sortiment eine Datei in Tabellenform. Sie ersetzt die gleichnamige
      Datei in <code>data/</code> - danach gilt der Stand auch ohne Browser.</p>
     <div class="dat-dateien">${namen.map((db) =>
       `<button type="button" class="btn" data-sichern="${esc(db)}">data/${esc(db)}.json</button>`).join('')}</div>
     <p class="notiz">Die Browser laden mehrere Dateien nicht auf einmal
      herunter - daher je Datei ein Knopf.</p>`,
    '<button class="btn" data-zu>Fertig</button>');
  d.node.querySelectorAll('[data-sichern]').forEach((b) => {
    b.onclick = () => {
      const db = b.dataset.sichern;
      store.dateiSpeichern(alsDatei(e.teile[db]), `${db}.json`);
      b.classList.add('an');
    };
  });
}

/**
 * >>> EINLESEN: WAEHLEN, LESEN, ABGLEICHEN, ZEIGEN, UEBERNEHMEN. <<<
 *
 * Übernommen wird nur ein fehlerfreier Stand, und nur auf Bestätigung.
 */
function datenEinlesen(tabellen) {
  const i = document.createElement('input');
  i.type = 'file';
  i.accept = '.xlsx,.json,application/json,'
    + 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  i.onchange = async () => {
    const f = i.files?.[0];
    if (!f) return;
    let gelesen;
    try {
      gelesen = await leseDatei(f.name, new Uint8Array(await f.arrayBuffer()));
    } catch (fehler) {
      const d = dialog('Datei nicht lesbar', `<p>${esc(fehler.message)}</p>`,
        '<button class="btn" data-zurueck>Zurück</button>');
      d.node.querySelector('[data-zurueck]').onclick = () => dialogBauteildaten();
      return;
    }
    const ausExcel = gelesen.quelle === 'excel';
    const leer = (db) => ({ sortiment: db, tabellen: {}, angaben: [] });
    const ergebnisse = Object.entries(gelesen.teile).map(([db, neu]) =>
      abgleich(db, tabellen[db] ?? leer(db), neu, { ausExcel }));
    /*
     * GESPERRT WIRD NUR, WAS SICH AENDERT. Eine vollständige Mappe trägt alle
     * Sortimente; hat eines davon schon vorher einen Befund (die doppelte
     * Kennung in der Lasttabelle etwa), darf das eine Änderung an den Jochen
     * nicht aufhalten.
     */
    const fehlerfrei = ergebnisse.filter((r) => r.aenderungen)
      .every((r) => r.pruefung.ok);
    const aenderungen = ergebnisse.reduce((s, r) => s + r.aenderungen, 0);
    const d = dialog('Einlesen - Abgleich',
      zeichneAbgleich(ergebnisse, { datei: f.name, quelle: gelesen.quelle,
                                    hinweise: gelesen.hinweise }),
      `<button class="btn" data-zurueck>Zurück</button>
       <button class="btn btn-acc" data-uebernehmen${fehlerfrei && aenderungen
         ? '' : ' disabled'}>${fehlerfrei ? (aenderungen ? 'Übernehmen und neu starten'
           : 'Nichts zu übernehmen') : 'Fehler beheben, dann erneut einlesen'}</button>`,
      'dialog-breit');
    d.node.querySelector('[data-zurueck]').onclick = () => dialogBauteildaten();
    const ok = d.node.querySelector('[data-uebernehmen]');
    if (ok && fehlerfrei && aenderungen) ok.onclick = () => {
      /*
       * Ein bereits eingelesener Stand wird ergänzt, nicht ersetzt: wer erst
       * die Lasttabelle und dann die Joche einliest, behält beides.
       */
      const vorher = eingelesen()?.teile ?? {};
      const teile = { ...vorher };
      for (const r of ergebnisse) if (r.aenderungen) teile[r.db] = r.ergebnis;
      try {
        eingelesenSpeichern(teile, f.name);
      } catch (fehler) {
        dialog('Nicht übernommen', `<p>Der Browser nimmt den Stand nicht auf
          (${esc(fehler.message)}). Sichern Sie ihn stattdessen als Dateien.</p>`,
          '<button class="btn" data-zu>Schliessen</button>');
        return;
      }
      location.reload();
    };
  };
  i.click();
}

/**
 * DAS NAECHSTE TRAGWERK RECHNEN.
 *
 * Auf einer Reihe geht man sie der Reihe nach durch; ohne Kuerzel heisst das
 * jedesmal in die Leiste greifen. Ausgeblendete werden uebersprungen - sie
 * sind nicht da.
 */
function naechstesTragwerk() {
  const sichtbar = tragwerkeSortiert(werte).filter((t) => !versteckt(t));
  if (sichtbar.length < 2) return;
  const i = sichtbar.findIndex((t) => t.id === (werte.twId ?? 'T1'));
  aendern('tragwerkAktiv', sichtbar[(i + 1) % sichtbar.length].id);
}

/** Blickrichtung setzen, wenn es sie gibt. */
function blickAuf(key) {
  if (!ANSICHTEN.some((a) => a.key === key)) return;
  ansicht.blickrichtung(key);
  zeichneModellWerkzeuge();
}

/** Die aufgetragene Groesse ueber ihre Nummer waehlen. */
function plotNummer(n) {
  const mo = MODI[n - 1];
  if (!mo) return;
  ansicht.modus = mo.key;
  ansicht.zeichne(); zeichneLegende(); zeichneModellWerkzeuge();
}

function tastendruck(e) {
  if (e.key === 'Escape') { abbrechen(); return; }

  const z = e.target;
  const imFeld = z && (z.tagName === 'INPUT' || z.tagName === 'SELECT'
                    || z.tagName === 'TEXTAREA' || z.isContentEditable);
  const tippt = z && ((z.tagName === 'INPUT' && z.type === 'text')
                   || z.tagName === 'TEXTAREA' || z.isContentEditable);

  // MIT Steuertaste: nur echtes Tippen ist geschuetzt.
  if (e.ctrlKey || e.metaKey) {
    if (tippt || e.key.toLowerCase() !== 'z') return;
    e.preventDefault();
    if (e.shiftKey) wiederherstellen(); else rueckgaengig();
    return;
  }
  /*
   * VIER SPERREN GEGEN UNGEWOLLTES AUSLOESEN.
   *
   * 1. JEDES EINGABEFELD. Nicht nur Textfelder: auch Zahl, Auswahl und
   *    Dateifeld. Wer in einem Zahlenfeld eine 1 tippt, meint die Ziffer.
   * 2. JEDER OFFENE DIALOG. Dort sucht man Felder und Knoepfe; ein «o», das
   *    hinter dem Dialog noch ein Fenster oeffnet, waere nicht zu erklaeren.
   * 3. JEDE SONDERTASTE. Alt und AltGr gehoeren dem Betriebssystem und den
   *    Sonderzeichen der Tastatur.
   * 4. DER SCHALTER unter Optionen, fuer alle, denen das zu viel ist.
   */
  if (imFeld || e.altKey || document.querySelector('.dialog')) return;
  if (werte?.tastenkuerzel === false) return;

  if (e.key >= '1' && e.key <= '7') { e.preventDefault(); plotNummer(+e.key); return; }
  const t = TASTEN.find((x) => x.tun && tasteVon(x)
    && tasteVon(x).toLowerCase() === e.key.toLowerCase());
  if (!t) return;
  e.preventDefault();
  t.tun();
}

/** Die Uebersicht der Kuerzel. */
function dialogTasten() {
  const zeilen = TASTEN.map((t) => (t.gruppe
    ? `<tr><td colspan="2" class="tasten-gruppe">${esc(t.gruppe)}</td></tr>`
    : `<tr><td>${tasteVon(t)
        ? `<kbd>${esc(tasteVon(t))}</kbd>`
        : '<span class="dim">aus</span>'}</td>`
      + `<td>${esc(t.text)}</td></tr>`)).join('');
  dialog('Tastenkürzel',
    `<table class="dt tasten">${zeilen}</table>
     <p class="notiz">Kürzel wirken nicht, während in einem Eingabefeld
       geschrieben wird. Keines von ihnen verändert das Tragwerk.
       Belegen lassen sie sich unter <b>Optionen · Darstellung ·
       Bedienung</b>.</p>`,
    '<button class="btn" data-zu>Schliessen</button>');
}

// --- Bannerschublade --------------------------------------------------------

/**
 * Ablage und Vorlagen fahren unter dem Banner heraus.
 *
 * Zwei Dinge liegen hier nebeneinander, weil sie zusammengehören und sich doch
 * unterscheiden:
 *
 *   PROJEKTE   gespeicherte Tragjoche mit ihren Massen. Sie werden GELADEN und
 *              ersetzen den Stand.
 *   VORLAGEN   der eingespielte Aufbau eines ganzen Tragwerks ohne Bauteilmasse
 *              - Profile, Trasse, Anbauteile, Lastfälle. Sie werden ANGEWENDET
 *              und legen sich auf den bestehenden Stand.
 *
 * Die Jochlänge kommt bewusst nicht aus der Vorlage: sonst würde das Anwenden
 * heimlich das Bauteil umbauen.
 */
let schubladeOffen = false;

/** Dauer der Schliessbewegung der Schublade - dieselbe Zahl im Stylesheet. */
const SCHUBLADE_ZU_MS = 220;

/**
 * Schublade zufahren lassen und erst danach verbergen.
 * Sofort auf hidden gesetzt verschwände sie schlagartig - aufgefahren ist sie
 * seit jeher gefahren, zugefahren war sie einfach weg.
 */
function schubladeZufahren() {
  const n = ui.el('bannerschublade');
  ui.el('btn-projekt').classList.remove('offen');
  if (n.hidden) return;
  n.classList.add('zu');
  setTimeout(() => {
    // Nur verbergen, wenn sie in der Zwischenzeit nicht wieder aufging.
    if (!schubladeOffen) { n.hidden = true; n.classList.remove('zu'); }
  }, SCHUBLADE_ZU_MS);
}

function schubladeUmschalten() {
  schubladeOffen = !schubladeOffen;
  if (schubladeOffen) zeichneSchublade();
  else schubladeZufahren();
}

function schubladeSchliessen() {
  if (!schubladeOffen) return;
  schubladeOffen = false;
  schubladeZufahren();
}

/* ===========================================================================
 * >>> DIE ABLAGE NACH DEM VORBILD VON BLOCKCALC (17. September). <<<
 * ===========================================================================
 *
 * Weisung: «checke nochmals die projektmanagement funktionalität von der app
 * block calc und übertrage diese in diese app» - und auf die Liste der
 * Punkte: «alles umsetzen».
 *
 * Was von dort kommt:
 *   - Projekt und Tragwerk als AUSWAHLFELDER, «+ Neu» ohne Dialog
 *   - die Liste als TABELLE je Projekt, Beschriftungen unmittelbar
 *     bearbeitbar, Projektname im Gruppenkopf
 *   - SUCHEN und SORTIEREN
 *   - AUSLEITEN MIT AUSWAHL je Tragwerk, je Projekt, je Eintrag
 *   - EINLESEN MIT VORSCHAU fuer Paket und JSON, je Eintrag waehlbar
 *   - KOMPLETTSICHERUNG mit den Einstellungen
 *   - die PROJEKTLISTE zum Drucken
 *
 * Was hier bleibt, wie es war: die Ablage in IndexedDB mit Ersatzspeicher,
 * die Vorlagen, die hinterlegten Zeichnungen.
 * ========================================================================= */

/** Suchbegriff und Sortierung der Ablage - ueberleben das Neuzeichnen. */
const ablageSicht = { suche: '', sort: 'neu' };

/** Wenn «+ Neues Projekt» gewaehlt ist, steht das Namensfeld offen. */
let neuesProjektOffen = false;

const heute = () => new Date().toLocaleDateString('de-CH',
  { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Kurzangaben der Rechnung eines Eintrags. */
function eintragRechnung(e) {
  return [
    e.kennwerte?.typ,
    Number.isFinite(e.kennwerte?.L) ? `${e.kennwerte.L.toFixed(2)} m` : '',
  ].filter(Boolean).join(' · ');
}

const eintragEta = (e) => (Number.isFinite(e.kennwerte?.eta) ? e.kennwerte.eta : null);

/** Passt der Eintrag zur Suche? Gesucht wird in allem, was ihn benennt. */
function passtZurSuche(e, q) {
  if (!q) return true;
  const w = e.werte ?? {};
  return [e.name, e.projekt, e.bemerkung, w.linie, w.km, w.ortschaft,
          w.projektNr, w.bearbeiter, e.kennwerte?.typ]
    .some((v) => String(v ?? '').toLowerCase().includes(q));
}

const SORTIERUNGEN = [
  { key: 'neu', label: 'Neueste zuerst' },
  { key: 'name', label: 'Bezeichnung' },
  { key: 'linie', label: 'Linie' },
  { key: 'km', label: 'KM' },
  { key: 'ortschaft', label: 'Ortschaft' },
  { key: 'eta', label: 'Ausnutzung' },
];

function sortiere(liste, art) {
  const t = (v) => String(v ?? '');
  const vgl = (a, b) => a.localeCompare(b, 'de', { numeric: true });
  const f = {
    neu: (a, b) => t(b.geaendert).localeCompare(t(a.geaendert)),
    name: (a, b) => vgl(t(a.name), t(b.name)),
    linie: (a, b) => vgl(t(a.werte?.linie), t(b.werte?.linie)),
    km: (a, b) => vgl(t(a.werte?.km), t(b.werte?.km)),
    ortschaft: (a, b) => vgl(t(a.werte?.ortschaft), t(b.werte?.ortschaft)),
    eta: (a, b) => (eintragEta(b) ?? -1) - (eintragEta(a) ?? -1),
  }[art] ?? (() => 0);
  return [...liste].sort(f);
}

async function zeichneSchublade() {
  const n = ui.el('bannerschublade');
  n.classList.remove('zu');      // falls sie noch am Zufahren war
  n.hidden = false;
  ui.el('btn-projekt').classList.add('offen');
  n.innerHTML = '<p class="notiz">Ablage wird gelesen …</p>';

  let alle = [], vorlagen = [], fehler = '';
  try {
    alle = await store.liste();
    vorlagen = await store.vorlagenListe();
  } catch (e) { fehler = e.message; }
  if (!schubladeOffen) return;

  const projekte = [...new Set(alle.map((e) => (e.projekt ?? '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
  const imProjekt = alle.filter((e) => (e.projekt ?? '') === (projekt.projekt ?? ''));

  // --- Spalte 1: dieses Tragwerk --------------------------------------------
  const projektWahl = `
    <div class="feld"><label for="bs-projekt">Projekt</label>
      <select id="bs-projekt">
        <option value="">(ohne Projekt)</option>
        ${projekte.map((p) => `<option value="${esc(p)}"${p === projekt.projekt ? ' selected' : ''}>${esc(p)}</option>`).join('')}
        ${projekt.projekt && !projekte.includes(projekt.projekt)
          ? `<option value="${esc(projekt.projekt)}" selected>${esc(projekt.projekt)} (neu)</option>` : ''}
        <option value="__neu__"${neuesProjektOffen ? ' selected' : ''}>+ Neues Projekt</option>
      </select></div>
    ${neuesProjektOffen ? `<div class="feld"><label for="bs-projekt-neu">Name des neuen Projekts</label>
      <input id="bs-projekt-neu" type="text" placeholder="z. B. Bahnhof Nord, Fahrleitung"></div>` : ''}`;
  const tragwerkWahl = `
    <div class="feld"><label for="bs-tragwerk">Tragwerk im Projekt</label>
      <select id="bs-tragwerk">
        ${imProjekt.map((e) => `<option value="${esc(e.id)}"${e.id === projekt.id ? ' selected' : ''}>${esc(e.name)}</option>`).join('')}
        <option value="__neu__"${projekt.id && imProjekt.some((e) => e.id === projekt.id) ? '' : ' selected'}>+ Neues Tragwerk</option>
      </select></div>
    <div class="feld"><label for="bs-name">Bezeichnung</label>
      <input id="bs-name" type="text" value="${esc(projekt.name)}"
             placeholder="z. B. Joch Achse 12"></div>`;

  // --- Spalte 2: Projekte und Tragwerke -------------------------------------
  const q = ablageSicht.suche.trim().toLowerCase();
  const gefiltert = sortiere(alle.filter((e) => passtZurSuche(e, q)), ablageSicht.sort);
  const gruppen = new Map();
  gefiltert.forEach((e) => {
    const k = (e.projekt ?? '').trim();
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(e);
  });
  // Projekte alphabetisch, «Ohne Projekt» zuletzt; das geladene zuerst.
  const reihe = [...gruppen.keys()].sort((a, b) => {
    if (a === projekt.projekt) return -1;
    if (b === projekt.projekt) return 1;
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b, 'de', { numeric: true });
  });
  const ed = (id, feld, wert, klasse = '') =>
    `<td class="ab-ed ${klasse}" contenteditable="true" spellcheck="false"
         data-ed-id="${esc(id)}" data-ed-feld="${esc(feld)}">${esc(wert ?? '')}</td>`;
  const etaZelle = (e) => {
    const v = eintragEta(e);
    if (v === null) return '<td class="ab-zahl">–</td>';
    return `<td class="ab-zahl ${v > 1 ? 'nok' : 'ok'}">${v.toFixed(2)}</td>`;
  };
  const tabelle = (k, liste) => `
    <details class="ab-gruppe${k === projekt.projekt ? ' aktiv' : ''}" open>
      <summary>
        <span class="ab-projekt" contenteditable="true" spellcheck="false"
              data-projekt-name="${esc(k)}" title="Klicken zum Umbenennen - betrifft alle Einträge">${esc(k || 'Ohne Projekt')}</span>
        <span class="sec-r">${liste.length} Tragwerk${liste.length === 1 ? '' : 'e'}</span>
        <button class="btn btn-mini" data-projekt-aus="${esc(k)}" title="Dieses Projekt als Paket ausleiten">Ausleiten</button>
        <button class="btn btn-mini" data-projekt-druck="${esc(k)}" title="Liste aller Tragwerke dieses Projekts drucken">Liste</button>
      </summary>
      <div class="ab-rollen"><table class="ab-tabelle">
        <thead><tr><th>Bezeichnung</th><th>Linie</th><th>KM</th><th>Ortschaft</th>
          <th>Tragwerk</th><th>η</th><th>Datum</th><th>Bemerkung</th><th></th></tr></thead>
        <tbody>${liste.map((e) => `
          <tr class="${e.id === projekt.id ? 'aktiv' : ''}" data-id="${esc(e.id)}">
            ${ed(e.id, 'name', e.name, 'ab-name')}
            ${ed(e.id, 'linie', e.werte?.linie)}
            ${ed(e.id, 'km', e.werte?.km)}
            ${ed(e.id, 'ortschaft', e.werte?.ortschaft)}
            <td class="ab-leise">${esc(eintragRechnung(e))}</td>
            ${etaZelle(e)}
            <td class="ab-leise">${esc(e.werte?.datum || new Date(e.geaendert).toLocaleDateString('de-CH'))}</td>
            ${ed(e.id, 'bemerkung', e.bemerkung, 'ab-leise')}
            <td class="ab-knoepfe">
              <button class="btn btn-mini" data-laden="${esc(e.id)}">Laden</button>
              <button class="btn btn-mini" data-zuordnen="${esc(e.id)}" title="Einem Projekt zuordnen">${icon('projekte', 11)}</button>
              <button class="btn btn-mini" data-kopie="${esc(e.id)}" title="Kopie anlegen">Kopie</button>
              <button class="btn btn-mini" data-eintrag-aus="${esc(e.id)}" title="Nur dieses Tragwerk ausleiten">${icon('export', 11)}</button>
              <button class="btn btn-mini btn-fail" data-loeschen="${esc(e.id)}" title="Löschen">×</button>
            </td></tr>`).join('')}
        </tbody></table></div>
    </details>`;
  const projekteHtml = fehler
    ? `<div class="fehlerbox">Ablage nicht verfügbar: ${esc(fehler)}</div>`
    : (alle.length
      ? (reihe.length ? reihe.map((k) => tabelle(k, gruppen.get(k))).join('')
                      : `<p class="notiz">Keine Treffer für «${esc(ablageSicht.suche)}».</p>`)
      : '<p class="notiz">Noch keine Einträge in der Ablage.</p>');

  const vorlagenHtml = vorlagen.length ? vorlagen.map((v) => `
      <div class="ablage-zeile" data-id="${v.id}">
        <div class="ablage-name"><b>${esc(v.name)}</b>
          <div class="ablage-meta">${esc(v.bemerkung || eintragRechnung(v))}</div></div>
        <button class="btn btn-mini" data-vorlage-an="${v.id}">Anwenden</button>
        <button class="btn btn-mini btn-fail" data-vorlage-weg="${v.id}">×</button>
      </div>`).join('')
    : '<p class="notiz">Noch keine Vorlagen. «Als Vorlage sichern» legt den ' +
      'jetzigen Aufbau ohne die Jochlänge ab.</p>';

  n.innerHTML = `
    <div class="bs-kopf">
      <button class="btn" data-neu>${icon('neu', 13)} Neues Tragwerk</button>
      <button class="btn btn-acc" data-speichern>${icon('speichern', 13)} ${projekt.id ? 'Speichern' : 'In Ablage speichern'}</button>
      <button class="btn btn-mini bs-zu" data-zu>Schliessen</button>
    </div>
    <div class="bs-spalten bs-drei">
      <div>
        ${abschnitt('Dieses Tragwerk', 'Projekt, Bezeichnung und Angaben')}
        ${projektWahl}
        ${tragwerkWahl}
        <div id="bs-verortung">${ui.verortungHtml(werte)}</div>
        <p class="notiz">Linie, Ortschaft und Kilometer stehen im Dateinamen der
          AxisVM-Ausleitung; Projektnummer, Bearbeiter und Datum in der
          Kopfzeile des Berichts und in der Projektliste.</p>
      </div>
      <div>${abschnitt('Projekte und gespeicherte Tragwerke',
                       'Laden ersetzt den jetzigen Stand')}
        <div class="ab-suche">
          <input id="bs-suche" type="search" value="${esc(ablageSicht.suche)}"
                 placeholder="Suchen: Bezeichnung, Linie, KM, Ortschaft, Projekt">
          <select id="bs-sort" title="Sortierung">
            ${SORTIERUNGEN.map((s) => `<option value="${s.key}"${s.key === ablageSicht.sort ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}
          </select>
        </div>
        ${projekteHtml}
        <div class="lf-fuss">
          <button class="btn btn-mini" data-import>Einlesen …</button>
          <button class="btn btn-mini" data-export>Ausleiten …</button>
          <button class="btn btn-mini" data-sicherung title="Alles: Tragwerke, Vorlagen, Zeichnungen, Einstellungen">Sicherung erstellen</button>
          <button class="btn btn-mini" data-sicherung-ein>Sicherung einspielen</button>
        </div>
      </div>
      <div>${abschnitt('Vorlagen ganzer Tragwerke', 'anwenden legt sich auf den Stand')}
        ${vorlagenHtml}
        <div class="lf-fuss">
          <button class="btn btn-mini" data-vorlage-neu>Als Vorlage sichern</button>
        </div>
        <p class="notiz" style="margin-top:8px">Eine Vorlage bringt Typ, Profile,
          Trasse, Anbauteile und Lastfälle mit. Die <b>Jochlänge</b> bleibt, wie
          sie ist, sonst würde das Anwenden das Bauteil umbauen.</p>
      </div>
    </div>`;

  // Die Verortungsfelder schreiben unmittelbar in die Eingabe - dieselbe
  // Verdrahtung wie im Optionen-Dialog, damit es nur eine gibt.
  ui.verdrahteOptionen(ui.el('bs-verortung'), werte, (k, v, zwischenstand) => {
    aendern(k, v);
    /*
     * WAEHREND DES TIPPENS BLEIBT DAS FELD STEHEN.
     *
     * verdrahteOptionen meldet jede Taste und sagt mit dem dritten Argument,
     * dass es ein Zwischenstand ist. Wer das uebergeht und die Schublade neu
     * zeichnet, ersetzt das Feld unter dem Cursor: der Fokus faellt auf den
     * Rumpf, und das naechste Zeichen landet im Nichts - beim Ortsnamen nach
     * dem ersten Buchstaben. Neu gezeichnet wird erst beim Verlassen.
     *
     * Der Kopf zieht trotzdem sofort nach: aendern() rechnet, und
     * pruefeUngesichert() vergleicht dabei die Verortung.
     */
    if (zwischenstand) return;
    ui.el('bs-verortung').innerHTML = ui.verortungHtml(werte);
    zeichneSchublade();
  });

  // --- Auswahlfelder ---------------------------------------------------------
  ui.el('bs-projekt').onchange = (ev) => {
    const v = ev.target.value;
    if (v === '__neu__') {
      neuesProjektOffen = true;
      zeichneSchublade().then(() => ui.el('bs-projekt-neu')?.focus());
      return;
    }
    neuesProjektOffen = false;
    // Ein anderes Projekt heisst: das Tragwerk wird dort NEU abgelegt -
    // es sei denn, es gehoert schon dorthin.
    projekt = { ...projekt, projekt: v };
    if (projekt.id && !alle.some((e) => e.id === projekt.id && (e.projekt ?? '') === v)) {
      projekt.id = null;
    }
    aktualisiereProjektKnopf();
    zeichneSchublade();
  };
  const neuFeld = ui.el('bs-projekt-neu');
  if (neuFeld) {
    const fertig = () => {
      const v = neuFeld.value.trim();
      if (!v) return;
      neuesProjektOffen = false;
      projekt = { ...projekt, projekt: v, id: null };
      aktualisiereProjektKnopf();
      zeichneSchublade();
    };
    neuFeld.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); fertig(); } };
    neuFeld.onblur = fertig;
  }
  ui.el('bs-tragwerk').onchange = async (ev) => {
    const v = ev.target.value;
    if (v === '__neu__') {
      // Wie in BlockCalc: der Stand bleibt, er wird beim Speichern ein
      // NEUER Eintrag in diesem Projekt.
      projekt = { ...projekt, id: null, name: `Neues ${tragwerksart(werte).label}` };
      ungesichert = true;
      aktualisiereProjektKnopf();
      zeichneSchublade().then(() => ui.el('bs-name')?.select());
      return;
    }
    await eintragLaden(v);
  };
  ui.el('bs-name').onchange = (ev) => {
    projekt = { ...projekt, name: ev.target.value.trim() || 'Ohne Namen' };
    aktualisiereProjektKnopf();
  };

  // --- Suche und Sortierung ----------------------------------------------------
  const suche = ui.el('bs-suche');
  suche.oninput = () => {
    ablageSicht.suche = suche.value;
    const pos = suche.selectionStart;
    zeichneSchublade().then(() => {
      const s = ui.el('bs-suche');
      if (s) { s.focus(); s.setSelectionRange(pos, pos); }
    });
  };
  ui.el('bs-sort').onchange = (ev) => { ablageSicht.sort = ev.target.value; zeichneSchublade(); };

  // --- Unmittelbar bearbeiten --------------------------------------------------
  n.querySelectorAll('[data-ed-id]').forEach((z) => {
    const vorher = z.textContent;
    z.onkeydown = (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); z.blur(); }
      if (ev.key === 'Escape') { z.textContent = vorher; z.blur(); }
    };
    z.onblur = async () => {
      const wert = z.textContent.trim();
      if (wert === vorher.trim()) return;
      const s = await store.eintragFeld(z.dataset.edId, z.dataset.edFeld, wert);
      // Der geladene Stand traegt dieselbe Angabe - sie wandert mit.
      if (projekt.id === s.id) {
        if (z.dataset.edFeld === 'name') projekt = { ...projekt, name: s.name };
        else if (store.DIREKT_FELDER.includes(z.dataset.edFeld)) {
          werte = { ...werte, [z.dataset.edFeld]: s.werte[z.dataset.edFeld] };
          ui.el('bs-verortung').innerHTML = ui.verortungHtml(werte);
        }
        aktualisiereProjektKnopf();
      }
    };
  });
  n.querySelectorAll('[data-projekt-name]').forEach((z) => {
    const alt = z.dataset.projektName;
    z.onclick = (ev) => ev.preventDefault();      // nicht auf-/zuklappen
    z.onkeydown = (ev) => {
      if (ev.key === ' ') ev.stopPropagation();
      if (ev.key === 'Enter') { ev.preventDefault(); z.blur(); }
    };
    z.onblur = async () => {
      const neu = z.textContent.trim();
      if (neu === (alt || 'Ohne Projekt') || (!alt && !neu)) return;
      await store.projektUmbenennen(alt, neu === 'Ohne Projekt' ? '' : neu);
      if ((projekt.projekt ?? '') === alt) {
        projekt = { ...projekt, projekt: neu === 'Ohne Projekt' ? '' : neu };
        aktualisiereProjektKnopf();
      }
      zeichneSchublade();
    };
  });

  // --- Knoepfe -------------------------------------------------------------------
  const auf = (wahl, fn) => n.querySelectorAll(wahl).forEach((b) => {
    b.onclick = (ev) => { ev.stopPropagation(); ev.preventDefault(); fn(b); };
  });
  auf('[data-zu]', schubladeSchliessen);
  auf('[data-neu]', () => { schubladeSchliessen(); neuesTragjoch(); });
  auf('[data-speichern]', () => ablageSpeichern(false));
  auf('[data-vorlage-neu]', dialogTragwerkVorlage);
  auf('[data-laden]', (b) => eintragLaden(b.dataset.laden, true));
  auf('[data-kopie]', async (b) => {
    await store.duplizieren(b.dataset.kopie); zeichneSchublade();
  });
  auf('[data-zuordnen]', async (b) => dialogZuordnen(await store.laden(b.dataset.zuordnen)));
  auf('[data-loeschen]', async (b) => {
    if (!confirm('Diesen Eintrag löschen?')) return;
    await store.loeschen(b.dataset.loeschen);
    if (projekt.id === b.dataset.loeschen) projekt.id = null;
    zeichneSchublade();
  });
  auf('[data-eintrag-aus]', (b) => ablageAusleiten([b.dataset.eintragAus]));
  auf('[data-projekt-aus]', (b) => dialogAusleiten(
    alle.filter((e) => (e.projekt ?? '') === b.dataset.projektAus).map((e) => e.id)));
  auf('[data-projekt-druck]', (b) => projektlisteDrucken(b.dataset.projektDruck));
  auf('[data-vorlage-an]', async (b) => {
    const v = await store.vorlageLaden(b.dataset.vorlageAn);
    if (!confirm(`Vorlage «${v.name}» anwenden? Profile, Trasse, Anbauteile und ` +
                 'Lastfälle werden übernommen; die Jochlänge bleibt.')) return;
    werte = { ...werte, ...v.werte, bearbeiten: false };
    werte.anbauteile = (werte.anbauteile ?? []).map(normalisiereAnbauteil);
    werte.eigeneVorlagen = vorlagenZusammenfuehren(werte);
    setzeEigeneVorlagen(werte.eigeneVorlagen);
    station = null;
    schubladeSchliessen();
    neuRechnen();
  });
  auf('[data-vorlage-weg]', async (b) => {
    if (!confirm('Diese Vorlage löschen?')) return;
    await store.vorlageLoeschen(b.dataset.vorlageWeg);
    zeichneSchublade();
  });
  auf('[data-export]', () => dialogAusleiten(null));
  auf('[data-import]', () => ablageEinlesenWaehlen(false));
  auf('[data-sicherung]', async () => {
    const tag = new Date().toISOString().slice(0, 10);
    store.dateiSpeichern(await store.alsSicherung(),
      `${APP_NAME}-Sicherung-${tag}.zip`, 'application/zip');
  });
  auf('[data-sicherung-ein]', () => ablageEinlesenWaehlen(true));
}

/**
 * Einen Ablageeintrag laden.
 *
 * `fragen`: ungesicherte Aenderungen vorher bestaetigen lassen. Die
 * Auswahlliste fragt immer - dort ist der Wechsel ein Handgriff und kein
 * Knopfdruck.
 */
async function eintragLaden(id, fragen = true) {
  if (fragen && ungesichert
      && !confirm('Der jetzige Stand ist nicht in der Ablage gesichert. Trotzdem laden?')) {
    zeichneSchublade();
    return;
  }
  const s = await store.laden(id);
  werte = { ...standardwerte(), ...s.werte, bearbeiten: false };
  werte.anbauteile = (werte.anbauteile ?? []).map(normalisiereAnbauteil);
  mastNachfuehrenGlobal();   // siehe beim Start
  projekt = { id: s.id, name: s.name, projekt: s.projekt, bemerkung: s.bemerkung ?? '' };
  neuesProjektOffen = false;
  station = null;
  // Frisch geladen heisst: der Stand entspricht der Ablage.
  markiereGesichert();
  schubladeSchliessen();
  // Die hinterlegte Zeichnung gehört zum Tragwerk und kommt mit ihm.
  await zeichnungHolen(s.id);
  neuRechnen();
  zeichneModellWerkzeuge();
  ansicht.ganzesJoch();
  meldeImBalken(`Geladen: ${s.projekt ? `${s.projekt} · ` : ''}${s.name}`);
}

/**
 * >>> SPEICHERN OHNE DIALOG, WO KLAR IST, WOHIN (17. September). <<<
 *
 * Wie in BlockCalc: ist ein Eintrag geladen, ueberschreibt «Speichern» ihn.
 * Sonst wird ein neuer Eintrag im gewaehlten Projekt angelegt. Der Dialog
 * kommt nur, wenn noch nichts benannt ist.
 */
async function ablageSpeichern(neu = false) {
  if (!projekt.id && !neu && /^Neues /.test(projekt.name ?? '') && !projekt.projekt) {
    schubladeSchliessen();
    dialogSpeichern();
    return;
  }
  const s = await sichereAktuell(neu);
  meldeImBalken(`Gespeichert: ${s.projekt ? `${s.projekt} · ` : ''}${s.name}`);
  if (schubladeOffen) zeichneSchublade();
}

/** Den jetzigen Stand in die Ablage legen - ueberschreiben oder neu. */
async function sichereAktuell(neu = false, bemerkung = undefined) {
  // Ohne Datum gilt der Tag der Ablage; der Bearbeiter wird vorgemerkt.
  if (!String(werte.datum ?? '').trim()) werte = { ...werte, datum: heute() };
  if (String(werte.bearbeiter ?? '').trim()) {
    try { localStorage.setItem(BEARBEITER, String(werte.bearbeiter).trim()); } catch { /* egal */ }
  }
  let alt = null;
  if (!neu && projekt.id) alt = await store.laden(projekt.id).catch(() => null);
  const s = await store.sichern({
    id: neu ? undefined : (projekt.id ?? undefined),
    name: projekt.name, projekt: projekt.projekt ?? '',
    bemerkung: bemerkung ?? projekt.bemerkung ?? alt?.bemerkung ?? '',
    erstellt: alt?.erstellt,
    werte,
    kennwerte: letzte ? {
      typ: werte.typ, L: werte.L, eta: letzte.anzeige?.max?.etaGesamt ?? letzte.erg.max.etaGesamt,
    } : null,
  });
  projekt = { id: s.id, name: s.name, projekt: s.projekt, bemerkung: s.bemerkung };
  // Erst jetzt hat das Tragwerk eine Id - und erst jetzt kann eine vorher
  // eingefügte Zeichnung zu ihm gelegt werden.
  await zeichnungSichernFallsMoeglich();
  markiereGesichert();
  speichern();
  return s;
}

/** Datei waehlen und einlesen - fuer beide Knoepfe. */
async function ablageEinlesenWaehlen(sicherung) {
  try {
    const { daten, name } = await store.dateiLesenRoh({ mitName: true });
    await dialogEinlesen(daten, { sicherung, dateiname: name });
  } catch (e) {
    if (!e?.abgebrochen) alert('Einlesen fehlgeschlagen: ' + e.message);
  }
}

/**
 * >>> EINLESEN MIT VORSCHAU, JE EINTRAG (17. September). <<<
 *
 * Fuer Paket und JSON derselbe Dialog. Jeder Eintrag laesst sich abwaehlen;
 * wo es im selben Projekt schon einen gleichen Namen gibt, steht die Wahl
 * daneben - Kopie, ersetzen, ueberspringen. Ein Zielprojekt legt alles
 * zusammen ab. Kommt genau ein Tragwerk herein, wird es gleich geladen.
 */
async function dialogEinlesen(roh, { sicherung = false, dateiname = '' } = {}) {
  const i = await store.paketInhalt(roh);
  const projekte = await store.projektNamen();
  const vorgabeDoppelt = sicherung ? 'ersetzen' : 'kopie';
  const zeilen = i.liste.map((e, k) => `
    <tr>
      <td><input type="checkbox" data-ein="${k}" checked></td>
      <td>${esc(e.projekt || 'Ohne Projekt')}</td>
      <td><b>${esc(e.name)}</b>${e.zeichnung ? ' <span class="ab-leise">+ Zeichnung</span>' : ''}</td>
      <td class="ab-leise">${esc([e.linie && `Linie ${e.linie}`, e.km && `KM ${e.km}`, e.ortschaft].filter(Boolean).join(' · '))}</td>
      <td>${e.doppeltZu ? `<select data-doppelt="${k}">
            <option value="kopie"${vorgabeDoppelt === 'kopie' ? ' selected' : ''}>als Kopie</option>
            <option value="ersetzen"${vorgabeDoppelt === 'ersetzen' ? ' selected' : ''}>ersetzen</option>
            <option value="ueberspringen">überspringen</option></select>`
          : '<span class="ab-leise">neu</span>'}${e.wiederholt
          ? '<div class="ab-leise">zweimal in der Datei – kommt als Kopie dazu</div>' : ''}</td>
    </tr>`).join('');
  const teil = (key, label, anzahl, an) => (anzahl
    ? `<label class="feld-kurz"><input type="checkbox" data-teil="${key}"${an ? ' checked' : ''}>
         <span>${esc(label)} (${anzahl})</span></label>` : '');
  const d = dialog(sicherung ? 'Sicherung einspielen' : 'Einlesen', `
    <p class="notiz">${esc(dateiname)}${i.zip ? ' · Paket' : ' · JSON'}${
      i.erzeugt ? ` · erzeugt am ${new Date(i.erzeugt).toLocaleDateString('de-CH')}` : ''}</p>
    ${i.liste.length ? `<div class="ab-rollen"><table class="ab-tabelle ab-ein">
      <thead><tr><th><input type="checkbox" data-alle checked title="alle"></th>
        <th>Projekt</th><th>Tragwerk</th><th>Verortung</th><th>Vorhanden</th></tr></thead>
      <tbody>${zeilen}</tbody></table></div>` : '<p>Die Datei enthält keine Tragwerke.</p>'}
    ${i.doppelt.length ? `<div class="hinweisbox">${i.doppelt.length} Tragwerk(e) gibt es im
      selben Projekt schon. Je Zeile wählbar: als Kopie, ersetzen oder überspringen.</div>` : ''}
    ${i.liste.length ? `<div class="feld"><label for="ein-ziel">Ablegen in</label>
      <select id="ein-ziel">
        <option value="__datei__">Projekt aus der Datei</option>
        ${projekte.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('')}
        <option value="__neu__">+ Neues Projekt …</option>
      </select>
      <input id="ein-ziel-neu" type="text" placeholder="Name des Projekts" hidden></div>` : ''}
    ${teil('vorlagen', 'Vorlagen', i.vorlagen, true)}
    ${teil('zeichnungen', 'Hinterlegte Zeichnungen', i.zeichnungen, true)}
    ${teil('einstellungen', 'Einstellungen und Datenbasis - die Anwendung startet danach neu',
           i.einstellungen, sicherung)}
    <p class="notiz">Nichts wird ohne Wahl ersetzt.</p>`,
    `<button class="btn btn-acc" data-ok>Einlesen</button>
     <button class="btn" data-zu>Abbrechen</button>`);
  const alleCb = d.node.querySelector('[data-alle]');
  if (alleCb) {
    alleCb.onchange = () => d.node.querySelectorAll('[data-ein]')
      .forEach((c) => { c.checked = alleCb.checked; });
  }
  const ziel = d.node.querySelector('#ein-ziel');
  const zielNeu = d.node.querySelector('#ein-ziel-neu');
  if (ziel) ziel.onchange = () => { zielNeu.hidden = ziel.value !== '__neu__'; if (!zielNeu.hidden) zielNeu.focus(); };
  d.node.querySelector('[data-ok]').onclick = async () => {
    const ids = [...d.node.querySelectorAll('[data-ein]')]
      .filter((c) => c.checked).map((c) => i.liste[Number(c.dataset.ein)].id);
    const doppelt = {};
    d.node.querySelectorAll('[data-doppelt]').forEach((s) => {
      doppelt[i.liste[Number(s.dataset.doppelt)].id] = s.value;
    });
    const teilAn = (k) => Boolean(d.node.querySelector(`[data-teil="${k}"]`)?.checked);
    let zielProjekt;
    if (ziel && ziel.value === '__neu__') zielProjekt = zielNeu.value.trim();
    else if (ziel && ziel.value !== '__datei__') zielProjekt = ziel.value;
    d.zu();
    try {
      const r = await store.einlesen(roh, {
        ids, doppelt, zielProjekt,
        vorlagen: teilAn('vorlagen'), zeichnungen: teilAn('zeichnungen'),
        einstellungen: teilAn('einstellungen'),
      });
      const text = [
        r.eintraege ? `${r.eintraege} neu` : '',
        r.ersetzt ? `${r.ersetzt} ersetzt` : '',
        r.alsKopie ? `${r.alsKopie} davon als Kopie (Name zweimal in der Datei)` : '',
        r.uebersprungen ? `${r.uebersprungen} übersprungen` : '',
        r.vorlagen ? `${r.vorlagen} Vorlage(n)` : '',
        r.bilder ? `${r.bilder} Zeichnung(en)` : '',
        r.einstellungen ? `${r.einstellungen} Einstellung(en)` : '',
      ].filter(Boolean).join(', ') || 'nichts übernommen';
      if (r.einstellungen) {
        alert(`Eingelesen: ${text}. Die Anwendung startet neu.`);
        location.reload();
        return;
      }
      // Genau ein Tragwerk: gleich laden, wie in BlockCalc.
      if (r.neueIds.length === 1) {
        await eintragLaden(r.neueIds[0], true);
        meldeImBalken(`Eingelesen und geladen: ${text}`);
        return;
      }
      meldeImBalken(`Eingelesen: ${text}`);
      if (!schubladeOffen) schubladeUmschalten(); else zeichneSchublade();
    } catch (e) { alert('Einlesen fehlgeschlagen: ' + e.message); }
  };
}

/**
 * >>> AUSLEITEN MIT AUSWAHL (17. September). <<<
 *
 * Wie «Exportieren» in BlockCalc: die Tragwerke nach Projekt gruppiert zum
 * Anhaken. Vorgewaehlt ist, womit der Dialog geoeffnet wurde - ein Projekt
 * aus seinem Gruppenkopf, alles aus dem Fuss der Ablage.
 */
async function dialogAusleiten(vorwahl) {
  const alle = await store.liste();
  const gruppen = new Map();
  alle.forEach((e) => {
    const k = (e.projekt ?? '').trim();
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(e);
  });
  const an = (id) => !vorwahl || vorwahl.includes(id);
  const d = dialog('Ausleiten', `
    <p class="notiz">Was in das Paket soll. Die Zeichnungen machen den
      Grossteil der Dateigrösse aus.</p>
    <div class="ab-auswahl">${[...gruppen.entries()].map(([k, liste]) => `
      <div class="sec"><label><input type="checkbox" data-gruppe="${esc(k)}"
        ${liste.every((e) => an(e.id)) ? 'checked' : ''}> ${esc(k || 'Ohne Projekt')}</label></div>
      ${liste.map((e) => `<label class="feld-kurz"><input type="checkbox" data-aus="${esc(e.id)}"
          data-in="${esc(k)}"${an(e.id) ? ' checked' : ''}>
        <span>${esc(e.name)} <span class="ab-leise">${esc(eintragRechnung(e))}</span></span></label>`).join('')}`).join('')}
    </div>
    <div class="sec">Dazu</div>
    ${store.PAKETTEILE.filter((t) => t.key !== 'eintraege').map((t) => `
      <label class="feld-kurz"><input type="checkbox" data-teil="${t.key}"${
        t.key === 'zeichnungen' ? ' checked' : ''}>
        <span>${esc(t.label)}</span></label>`).join('')}`,
    `<button class="btn btn-acc" data-ok>Ausleiten</button>
     <button class="btn" data-zu>Abbrechen</button>`);
  d.node.querySelectorAll('[data-gruppe]').forEach((g) => {
    g.onchange = () => d.node.querySelectorAll(`[data-in="${CSS.escape(g.dataset.gruppe)}"]`)
      .forEach((c) => { c.checked = g.checked; });
  });
  d.node.querySelector('[data-ok]').onclick = async () => {
    const ids = [...d.node.querySelectorAll('[data-aus]')]
      .filter((c) => c.checked).map((c) => c.dataset.aus);
    const teil = (k) => Boolean(d.node.querySelector(`[data-teil="${k}"]`)?.checked);
    if (!ids.length && !teil('vorlagen') && !teil('einstellungen')) {
      alert('Nichts ausgewählt.');
      return;
    }
    d.zu();
    await ablageAusleiten(ids, { vorlagen: teil('vorlagen'),
      zeichnungen: teil('zeichnungen'), einstellungen: teil('einstellungen') });
  };
}

/** Paket schreiben und herunterladen - benannt nach dem, was drin ist. */
async function ablageAusleiten(ids, teile = { zeichnungen: true }) {
  const alle = await store.liste();
  const drin = alle.filter((e) => ids.includes(e.id));
  const projekte = [...new Set(drin.map((e) => e.projekt || 'Ohne-Projekt'))];
  const rein = (t) => String(t).trim().replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '');
  const tag = new Date().toISOString().slice(0, 10);
  const teilName = drin.length === 1 ? `${rein(drin[0].projekt || 'Ohne-Projekt')}_${rein(drin[0].name)}`
    : (projekte.length === 1 ? `${rein(projekte[0])}_${drin.length}x` : 'Ablage');
  const daten = await store.alsPaket({ eintraege: ids.length > 0, ...teile }, ids);
  store.dateiSpeichern(daten, `${APP_NAME}-${teilName}-${tag}.zip`, 'application/zip');
}

/** Ein Tragwerk einem Projekt zuordnen - Auswahl der vorhandenen oder neu. */
async function dialogZuordnen(s) {
  const projekte = await store.projektNamen();
  const d = dialog('Projekt zuordnen', `
    <p class="notiz">${esc(s.name)} · jetzt in ${esc(s.projekt || 'Ohne Projekt')}</p>
    <div class="feld"><label for="z-wahl">Projekt</label>
      <select id="z-wahl">
        <option value="">(ohne Projekt)</option>
        ${projekte.map((p) => `<option value="${esc(p)}"${p === s.projekt ? ' selected' : ''}>${esc(p)}</option>`).join('')}
      </select></div>
    <div class="feld"><label for="z-frei">oder neuer Name</label>
      <input id="z-frei" type="text" value="${esc(s.projekt ?? '')}"></div>`,
    `<button class="btn btn-acc" data-ok>Zuordnen</button>
     <button class="btn" data-zu>Abbrechen</button>`);
  const wahl = ui.el('z-wahl');
  const frei = ui.el('z-frei');
  wahl.oninput = () => { frei.value = wahl.value; };
  d.node.querySelector('[data-ok]').onclick = async () => {
    const ziel = frei.value.trim();
    await store.umbenennen(s.id, { projekt: ziel });
    if (projekt.id === s.id) {
      projekt = { ...projekt, projekt: ziel };
      aktualisiereProjektKnopf();
    }
    d.zu();
    zeichneSchublade();
  };
}

/**
 * >>> DIE PROJEKTLISTE ZUM DRUCKEN (17. September). <<<
 *
 * Nach «Fundamentliste PDF» in BlockCalc: alle Tragwerke eines Projekts mit
 * Typ, Laenge, Masten und Ausnutzung. Wie dort wird jeder Eintrag NEU
 * gerechnet - die bei der Ablage vermerkte Ausnutzung koennte aus einer
 * aelteren Fassung stammen. Laesst sich einer nicht rechnen, steht der
 * vermerkte Wert mit Kennzeichnung da.
 */
async function projektlisteDrucken(projektName) {
  const eintraege = (await store.liste())
    .filter((e) => (e.projekt ?? '') === projektName)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'de', { numeric: true }));
  if (!eintraege.length) { alert('Das Projekt hat keine Tragwerke.'); return; }
  const zeilen = eintraege.map((e) => {
    const w = { ...standardwerte(), ...e.werte };
    let eta = null, etaMast = null, frisch = false;
    try {
      const joch = w.typ && w.typ !== 'frei' ? getTragjoch(w.typ) : null;
      // Ueber alle Kombinationen, wie in der Auswertung - ein einzelner
      // Lastfall liesse den Gegenwind aus (17. September).
      const kb = vergleichKombinationen(rechensatz(w), getProfil(w.profOG),
                                        getProfil(w.profUG), getStahl(w.stahl), joch);
      const erg = kb.huellkurve ?? berechne(rechensatz(w), getProfil(w.profOG),
                                            getProfil(w.profUG), getStahl(w.stahl), joch);
      eta = erg.max?.etaGesamt ?? null;
      const m = erg.mast ?? {};
      const em = ['A', 'B'].map((k) => m[k]?.etaMitStabilitaet ?? m[k]?.eta)
        .filter(Number.isFinite);
      etaMast = em.length ? Math.max(...em) : null;
      frisch = Number.isFinite(eta);
    } catch { /* bleibt beim vermerkten Wert */ }
    if (!frisch) eta = eintragEta(e);
    const masten = mastenVon(w).map((x) => [x.name ?? x.id, x.profil].filter(Boolean).join(' '))
      .join(', ');
    const zahl = (v) => (Number.isFinite(v)
      ? `<span class="${v > 1 ? 'nok' : 'ok'}">${v.toFixed(2)}</span>` : '–');
    return `<tr>
      <td>${esc(e.name)}</td>
      <td>${esc(w.linie ?? '')}</td><td>${esc(w.km ?? '')}</td><td>${esc(w.ortschaft ?? '')}</td>
      <td>${esc(tragwerksart(w).label)} ${esc(w.typ ?? '')}</td>
      <td class="z">${Number.isFinite(Number(w.L)) ? Number(w.L).toFixed(2) : ''}</td>
      <td>${esc(w.mastVorhanden === false ? '–' : masten)}</td>
      <td class="z">${zahl(eta)}${frisch ? '' : ' *'}</td>
      <td class="z">${zahl(etaMast)}</td>
      <td>${esc(e.bemerkung ?? '')}</td></tr>`;
  }).join('');
  const w0 = eintraege[0].werte ?? {};
  const blatt = document.createElement('div');
  blatt.id = 'druck-liste';
  blatt.innerHTML = `
    <h1>${esc(APP_NAME)} – Projektliste</h1>
    <p><b>${esc(projektName || 'Ohne Projekt')}</b>${w0.projektNr ? ` · Nr. ${esc(w0.projektNr)}` : ''}
       · ${eintraege.length} Tragwerk${eintraege.length === 1 ? '' : 'e'}
       · Stand ${esc(heute())}${w0.bearbeiter ? ` · ${esc(w0.bearbeiter)}` : ''}</p>
    <table>
      <thead><tr><th>Bezeichnung</th><th>Linie</th><th>KM</th><th>Ortschaft</th>
        <th>Tragwerk</th><th>L [m]</th><th>Masten</th><th>η Tragwerk</th>
        <th>η Mast</th><th>Bemerkung</th></tr></thead>
      <tbody>${zeilen}</tbody>
    </table>
    <p class="fuss">η aus einer Rechnung beim Drucken. * vermerkter Wert der Ablage,
      das Tragwerk liess sich nicht neu rechnen.</p>`;
  document.body.appendChild(blatt);
  document.body.classList.add('druck-liste');
  const weg = () => {
    document.body.classList.remove('druck-liste');
    blatt.remove();
    window.removeEventListener('afterprint', weg);
  };
  window.addEventListener('afterprint', weg);
  window.print();
  // Manche Umgebungen melden afterprint nicht - dann nach dem Dialog.
  setTimeout(() => { if (document.body.contains(blatt)) weg(); }, 1500);
}

/** Den jetzigen Aufbau als Vorlage eines ganzen Tragwerks ablegen. */
function dialogTragwerkVorlage() {
  const d = dialog('Als Vorlage sichern', `
    <div class="feld"><label for="tv-name">Name der Vorlage</label>
      <input id="tv-name" type="text" value="${esc(projekt.name)} – Aufbau"></div>
    <div class="feld"><label for="tv-bem">Bemerkung</label>
      <input id="tv-bem" type="text" placeholder="wofür diese Vorlage gedacht ist"></div>
    <p class="notiz">Übernommen werden Typ, Profile, Stahlgüte, Auflager, Trasse,
      Anbauteile, Einwirkungen und Lastfälle. <b>Nicht</b> übernommen werden
      Jochlänge, Nachweisstelle und der Projektbezug. Eine Vorlage beschreibt
      die Art des Tragwerks, nicht das einzelne Stück.</p>`,
    '<button class="btn btn-acc" data-ok>Sichern</button>');
  d.node.querySelector('[data-ok]').onclick = async () => {
    await store.vorlageSichern({
      name: ui.el('tv-name').value.trim(),
      bemerkung: ui.el('tv-bem').value.trim(),
      werte: store.vorlageAusWerten(werte),
      kennwerte: { typ: werte.typ, teile: (werte.anbauteile ?? []).length },
    });
    d.zu();
    if (schubladeOffen) zeichneSchublade();
  };
}

/**
 * WERKZEUGE DER MODELLANSICHT, nach Art geordnet.
 *
 * Vorher steckten alle Schalter in einer einzigen Liste hinter einem
 * Aufklappfenster: zwei Klicks für jede Änderung, und Profile standen neben
 * Schnittkräften, als wäre das dasselbe. Es sind aber drei verschiedene Fragen:
 *
 *   MODELL     was vom Bauteil zu sehen ist
 *   LASTEN     welche Einwirkungen aufgetragen werden
 *   RESULTATE  was eingefärbt und als Schnittkraft gezeigt wird
 *
 * Jede Gruppe steht als Reihe kleiner Schalter offen da. Man sieht damit auf
 * einen Blick, was ein- und was ausgeschaltet ist, und braucht einen Klick
 * statt drei.
 */
const WZ_MODELL = [
  { key: 'profil', icon: 'profil', text: 'Gurtprofile' },
  { key: 'blech', icon: 'blech', text: 'Bindebleche' },
  // Anbauteile stehen bei den Bauteilen, nicht bei den Lasten: sie SIND
  // Tragwerk - der Weg, auf dem die Last ans Joch kommt. Wer die Lasten
  // global abstellt, um das Joch zu sehen, will diesen Weg behalten. Was zur
  // Last gehoert - der Wuerfel am Angriffspunkt und die Pfeile - bleibt
  // drueben und geht mit ihr.
  { key: 'anbau', icon: 'anbau', text: 'Anbauteile: Ständer, Ausleger, Traverse' },
  // Die Schwerachsen SIND das Stabmodell: sie tragen feldweise dieselben
  // Kennwerte wie die Volumenkörper und werden ebenso eingefärbt. Wer das
  // Stabmodell allein sehen will, schaltet Gurtprofile und Bindebleche ab -
  // ein eigener Schalter dafür sagte nichts, was diese beiden nicht schon
  // sagen. Der Platz gehört jetzt der Auflagerdefinition, und die ist eine
  // eigene Frage: sie war beim Nachbau eines geprüften FEM-Modells der
  // grösste einzelne Fehler.
  { key: 'achse', icon: 'achse', text: 'Schwerachsen (Stabmodell, eingefärbt)' },
  { key: 'auflager', icon: 'auflager', text: 'Auflager: Lage, Feder, Einspannung' },
  // Der Mast ist ein BAUTEIL und kein Auflagerzeichen: er traegt Wind und
  // Anbauteile und wird ausgeleitet. In der Laengsansicht verdeckt er zudem
  // das halbe Joch - man muss ihn allein wegnehmen koennen.
  { key: 'mast', icon: 'mast', text: 'Masten' },
  { key: 'masse', icon: 'mass', text: 'Bemassung' },
  { key: 'raster', icon: 'raster', text: 'Bodenraster' },
];

/*
 * DIE EINGEFÜGTE ZEICHNUNG BEKOMMT EINE EIGENE GRUPPE (Weisung).
 *
 * Sie stand als neunter Schalter zwischen den Bauteilen - dort, wo Gurte,
 * Bleche und Auflager liegen. Sie ist aber nichts davon: sie ist eine
 * FREMDE Vorlage, die hinter dem Modell liegt, und sie kommt nicht aus der
 * Rechnung, sondern aus einem Blatt. Eine eigene Gruppe sagt das, und der
 * Hauptschalter darüber legt beides zugleich weg.
 *
 * Und die Masskette bekommt endlich ihren eigenen Schalter. Sie hing bisher
 * am Schalter der Zeichnung mit - wer das Bild wegnahm, verlor die
 * Fanglinien, obwohl die aus der Eingabe stammen und ohne Bild bestehen.
 */
const WZ_ZEICHNUNG = [
  { key: 'zeichnung', icon: 'zeichnung',
    text: 'Eingefügte Querprofil-Zeichnung (nur in der Längsansicht)',
    fehlt: () => !ansicht.zeichnung,
    fehltText: 'noch kein Bild eingefügt, Strg+V im Modell' },
  { key: 'masskette', icon: 'mass',
    text: 'Masskette als Fanglinien (nur in der Längsansicht)',
    fehlt: () => !(ansicht.masskette && ansicht.masskette.length),
    fehltText: 'keine Masskette eingetragen' },
];

const WZ_LASTEN = [
  { key: 'last', icon: 'lastpfeil', text: 'Lasten überhaupt zeigen', haupt: true },
  { key: 'staendig', icon: 'gewicht', text: 'Ständige Lasten' },
  { key: 'leiterzug', icon: 'leiterzug', text: 'Leiterzugkräfte (Umlenkung)' },
  { key: 'windX', icon: 'wind', text: 'Wind in x (Jochachse)' },
  { key: 'windY', icon: 'wind', text: 'Wind in y (Gleisrichtung)' },
  { key: 'schnee', icon: 'schnee', text: 'Schnee und veränderlich vertikal' },
];

function baueModellWerkzeuge() {
  // Ein Knopf für «alles zeigen»: die frühere Trennung in «Ansicht
  // zurücksetzen» und «Ganzes Joch» führte zweimal zum selben Bild. Der
  // Schnitt-Zoom sitzt jetzt im Auswertungsreiter «Schnitt», wo er hingehört.
  /*
   * HANDLUNG UND SCHALTER SEHEN VERSCHIEDEN AUS (Weisung).
   *
   * «Bauteil setzen» stand als eines von zwei gleich aussehenden Symbolen
   * neben dem Zoom und sah damit aus wie die Ebenenschalter drüben: etwas,
   * das man an- und ausknipst. Es ist aber eine HANDLUNG - man startet sie,
   * zielt, wählt, und sie ist vorbei.
   *
   * Beschriftet und in der Akzentfarbe, wie der AxisVM-Knopf im Banner: die
   * Anwendung hat damit zwei Formen, eine für Schalter und eine für Wege,
   * die man geht. Läuft die Handlung, steht der Knopf auf «Abbrechen» - er
   * sagt dann, was der nächste Klick tut, statt was er einmal getan hat.
   */
  // Unten links, in der Fussleiste - dort, wo auch die Stelle steht, an der
  // man gerade ist. Zuruecksetzen gehoert zum Navigieren, nicht zum Bauen.
  /*
   * NAVIGATION UNTEN LINKS (Weisung, 2. September).
   *
   * Drei Handlungen, die man beim Arbeiten am Bild immer wieder braucht -
   * und die man sonst mit Rad und Ziehen zusammensuchen muss:
   *
   *   ganz     alles zeigen, was auf dem Blatt steht. Seit mehrere
   *            Tragwerke nebeneinanderstehen ist das nicht mehr dasselbe
   *            wie «ein Joch zeigen» - deshalb heisst es jetzt anders.
   *   teil     nur das gerechnete Tragwerk. Bei einer Jochreihe steht man
   *            sonst vor drei Jochen und sucht das, dessen Zahlen rechts
   *            stehen.
   *   schnitt  auf den Nachweisschnitt. Die Stelle, an der die Auswertung
   *            gerade rechnet - der haeufigste Grund, ueberhaupt
   *            heranzufahren.
   *
   * Sie stehen UNTEN LINKS, weil dort schon der erste stand und weil oben
   * rechts die Blickrichtungen sitzen: das eine ist «wohin schaue ich», das
   * andere «worauf».
   */
  ui.el('ansicht-tools-u').innerHTML =
    iconKnopf('v-ganz', 'querprofilGanz',
              'Ganzes Querprofil — alle Tragwerke einblenden')
    + iconKnopf('v-teil', 'querprofilEines',
                'Nur das gerechnete Tragwerk — die übrigen beiseitelegen')
    + iconKnopf('v-schnitt', 'schnitt', 'Auf den Nachweisschnitt fahren');
  // Oben links, auf der Hoehe des Lastfalls (Weisung): die eine Handlung,
  // die man im Modell beginnt, steht auf derselben Zeile wie die eine
  // Auswahl, die man darueber trifft.
  /*
   * NUR DAS SYMBOL (Weisung, 28. August: «die zwei Buttons Bauteile,
   * Zeichnung nur mit Symbolen»).
   *
   * Sie standen mit Beschriftung da und nahmen damit die halbe Breite des
   * Modellfensters ein - über einer eingelegten Zeichnung liegt dort das
   * Tragwerk. Was sie tun, sagt der Titel beim Überfahren und der
   * Handlungsbalken, sobald man sie drückt; die laufende Handlung sagt die
   * Akzentfarbe (`laeuft`).
   */
  ui.el('ansicht-tools').innerHTML =
    `<button class="btn-icon btn-icon-acc v-handlung${
         setzen ? ' laeuft' : ''}" id="v-setzen" type="button"
       title="${setzen ? 'Setzen abbrechen'
                       : 'Bauteil setzen, ins Modell klicken, wohin es gehört'}"
       aria-label="${setzen ? 'Setzen abbrechen' : 'Bauteil setzen'}"
       aria-pressed="${Boolean(setzen)}">${icon('anbau')}</button>`
    /*
     * ZWEITE HANDLUNG, ZURUECKHALTENDER GEZEICHNET. Ohne Akzentfarbe: das
     * Setzen eines Bauteils ist der Weg, den man staendig geht, die
     * Zeichnung legt man einmal ein. Zwei gleich laute Knoepfe nebeneinander
     * heben einander auf.
     */
    + `<button class="btn-icon v-handlung${
         zeichnungMenue || kalibrierung || bildSchieben || ausrichtung ? ' laeuft' : ''}" id="v-zeichnung"
       type="button" title="${ansicht.zeichnung
         ? 'Zeichnung: neu einmessen, ersetzen oder entfernen'
         : 'Querprofil-Zeichnung einlegen, auch mit Strg+V oder Hineinziehen'}"
       aria-label="Querprofil-Zeichnung"
       aria-pressed="${Boolean(zeichnungMenue)}">${icon('zeichnung')}</button>`;
  ui.el('v-setzen').onclick = () => (setzen ? setzenEnde() : setzenStarten());
  ui.el('v-zeichnung').onclick = () => zeichnungMenueUmschalten();
  /*
   * >>> DIE BEIDEN SIND EIN PAAR: ALLES oder NUR DIESES. <<<
   *
   * Bis zum 3. September fuhren sie bloss die KAMERA - herangezoomt stand
   * der Nachbar weiter da, nur ausserhalb des Ausschnitts. Seine Jochachse
   * und die Flaechen seiner Linienlasten ragten von links ins Bild, und man
   * konnte sie nicht loswerden, weil der Knopf gar nichts ausblendete.
   *
   * Gemeldet mit Bild: «hier der screenshot mit den ueberstehenden
   * lastflaechen und schwerelinien, die nicht sauber ausgeblendet werden.»
   *
   * Die Teile SIND je Tragwerk zugeschnitten - gemessen ragt nur die halbe
   * Blech- und Mastdicke ueber die Grenze, ±0.12 m. Was fehlte, war das
   * Ausblenden selbst. `nurDiesesZeigen` gibt es seit dem Kontextmenue;
   * der Knopf ruft jetzt dieselbe Handlung und faehrt danach heran.
   */
  ui.el('v-ganz').onclick = () => {
    station = null; ansicht.station = null;
    // Nur wenn wirklich etwas beiseitegelegt ist - sonst schriebe jeder
    // Klick auf «ganzes Querprofil» einen Schritt in den Verlauf.
    if (tragwerkeSortiert(werte).some((t) => versteckt(t))) alleZeigen();
    ansicht.ansichtZuruecksetzen(); zeichneAuswertung();
  };
  /*
   * NUR DAS GERECHNETE TRAGWERK.
   *
   * Sein Bereich steht fest: von seiner Lage bis Lage plus Laenge. Ein
   * Einzelmast hat keine Laenge - dort waere der Ausschnitt null breit und
   * die Kamera fuehre ins Unendliche. Zwei Meter sind das Mindestmass; sie
   * zeigen den Masten mit etwas Luft daneben.
   */
  ui.el('v-teil').onclick = () => {
    const t = tragwerkeSortiert(werte).find((x) => x.aktiv)
           ?? tragwerkeSortiert(werte)[0];
    if (!t) return;
    // ERST beiseitelegen, DANN heranfahren: `nurDiesesZeigen` rechnet neu
    // und baut die Szene auf, der Zoom setzt nur die Kamera.
    if (tragwerkeSortiert(werte).some((x) => x.id !== t.id && !versteckt(x))) {
      nurDiesesZeigen(t.id);
    }
    const x0 = lageVon(t);
    const L = tragwerksart(t).masten >= 2 ? (Number(t.L) || 0) : 0;
    const halb = Math.max(1, L / 2);
    station = null; ansicht.station = null;
    ansicht.zoomAuf(x0 + L / 2, null, halb);
  };
  // Der Nachweisschnitt: die Stelle, an der die Auswertung gerade rechnet.
  ui.el('v-schnitt').onclick = () => ansicht.zeigeSchnitt(2.5);
  zeichneModellWerkzeuge();
  zeichneLegende();
}

/**
 * Welche Lastarten im gewählten Lastfall überhaupt vorkommen.
 *
 * Ein Beiwert 0 heisst: diese Einwirkung wirkt in diesem Lastfall nicht mit.
 * Sie im Modell einschalten zu können, ohne dass etwas erscheint, ist eine
 * Falle - der Schalter wird deshalb ausgegraut und unklickbar.
 *
 * Bei der Umhüllenden ist alles möglich, denn dort laufen alle Lastfälle mit.
 */
function lastartenVorhanden() {
  const alle = Object.fromEntries(LASTARTEN.map((l) => [l.key, true]));
  if (!letzte || anzeigeKombi === 'umhuellend') return alle;
  const lf = letzte.kombi.lastfaelle.find((k) => k.key === anzeigeKombi);
  if (!lf) return alle;
  const b = lf.beiwerte ?? {};
  return {
    staendig: Boolean(b.G),
    leiterzug: Boolean(b.G),
    windX: Boolean(b.WindX),
    windY: Boolean(b.WindY),
    schnee: Boolean(b.Schnee),
  };
}

/**
 * Die Werkzeuggruppen zeichnen und verdrahten: Blick, Modell, Zeichnung,
 * Lasten, Resultate.
 *
 * Bild und Masskette fragen einzeln nach, ob es sie gibt - die Kette steht in
 * der Eingabe, das Bild kommt von aussen, und das eine kann ohne das andere
 * da sein. Vorher lief beides über eine gemeinsame Abfrage, und der Schalter
 * war schon offen, wenn nur eines von beiden vorlag.
 */
function zeichneModellWerkzeuge() {
  const n = ui.el('ebenen-tools');
  if (!n) return;
  const da = lastartenVorhanden();
  const schalter = (id, sym, titel, an, aus = false) =>
    `<button class="wz-s${an ? ' on' : ''}${aus ? ' aus' : ''}" id="${id}"
       type="button" title="${esc(titel)}" aria-pressed="${an}"
       ${aus ? 'disabled' : ''}>${icon(sym, 14)}</button>`;
  const text = (id, beschriftung, titel, an, aus = false) =>
    `<button class="wz-s wz-txt${an ? ' on' : ''}${aus ? ' aus' : ''}" id="${id}"
       type="button" title="${esc(titel)}" aria-pressed="${an}"
       ${aus ? 'disabled' : ''}>${esc(beschriftung)}</button>`;
  // Jede Gruppe hat einen HAUPTSCHALTER in der Kopfzeile. Ausgeschaltet
  // verschwindet die ganze Gruppe aus dem Bild und ihre Einzelschalter werden
  // ausgegraut - so sieht man, dass sie noch da sind, aber gerade nicht gelten.
  const gruppe = (id, titel, an, inhalt) =>
    `<div class="wz-gruppe${an ? '' : ' aus'}">
       <button class="wz-t wz-haupt${an ? ' on' : ''}" id="wz-g-${id}" type="button"
         title="Gruppe ${esc(titel)} ${an ? 'ausschalten' : 'einschalten'}"
         aria-pressed="${an}">${esc(titel)}</button>
       <div class="wz-knoepfe">${inhalt}</div></div>`;

  const gM = ansicht.gruppen.modell, gL = ansicht.gruppen.lasten,
        gR = ansicht.gruppen.resultate, gZ = ansicht.gruppen.zeichnung;

  n.innerHTML =
    `<div class="wz-gruppe"><div class="wz-t">Blick</div><div class="wz-knoepfe">${
      ANSICHTEN.map((a) => text(`wz-blick-${a.key}`, a.label.slice(0, 3), a.label,
                                a.key === ansicht.ansichtKey)).join('')
    }</div></div>` +
    gruppe('modell', 'Modell', gM, WZ_MODELL.map((s) =>
      schalter(`wz-m-${s.key}`, s.icon, s.text,
               ansicht.ebenen[s.key], !gM)).join('')) +
    gruppe('zeichnung', 'Zeichnung', gZ, WZ_ZEICHNUNG.map((s) => {
      const weg = s.fehlt();
      return schalter(`wz-z-${s.key}`, s.icon,
                      weg ? `${s.text} — ${s.fehltText}` : s.text,
                      ansicht.ebenen[s.key], !gZ || weg);
    }).join('')) +
    gruppe('lasten', 'Lasten', gL, WZ_LASTEN.map((s) => {
      const fehlt = !s.haupt && !da[s.key];
      return schalter(`wz-l-${s.key}`, s.icon,
        fehlt ? `${s.text} – im gewählten Lastfall nicht vorhanden` : s.text,
        s.haupt ? ansicht.ebenen.last : ansicht.lastarten[s.key], !gL || fehlt);
    }).join('')) +
    gruppe('resultate', 'Resultate', gR,
      schalter('wz-r-kraefte', 'schnitt', 'Schnittkräfte am Nachweisschnitt',
               ansicht.ebenen.kraefte, !gR) +
      schalter('wz-r-schnitt', 'wuerfel', 'Schnittebene', ansicht.ebenen.schnitt, !gR) +
      schalter('wz-r-werte', 'info', 'Werte im Modell anschreiben',
               ansicht.werteAnschreiben, !gR) +
      MODI.map((mo) => text(`wz-p-${mo.key}`, mo.kurz ?? mo.label.slice(0, 3),
                            mo.label, mo.key === ansicht.modus, !gR)).join(''));

  /*
   * DIE LEGENDE GEHOERT ZUM BILD (Weisung, 1. September).
   *
   * Wer den Masten ausblendet, aendert die Skala: seine Momente sind um
   * Groessenordnungen groesser als die der Bindebleche, und ohne ihn wird
   * aus 69 kNm eine Spanne bis 1.1. Die Koerper folgten dem schon
   * (_bereichSichtbar), die Legende nicht - sie wurde beim Umschalten einer
   * Ebene gar nicht neu gezeichnet und behauptete weiter den alten Endwert.
   */
  const nach = () => {
    ansicht.zeichne(); zeichneLegende(); zeichneModellWerkzeuge();
  };
  ['modell', 'zeichnung', 'lasten', 'resultate'].forEach((g) => {
    ui.el(`wz-g-${g}`).onclick = () => {
      ansicht.gruppen[g] = !ansicht.gruppen[g]; nach();
    };
  });
  ANSICHTEN.forEach((a) => {
    ui.el(`wz-blick-${a.key}`).onclick = () => {
      ansicht.blickrichtung(a.key); zeichneModellWerkzeuge();
    };
  });
  WZ_MODELL.forEach((s) => {
    ui.el(`wz-m-${s.key}`).onclick = () => {
      ansicht.ebenen[s.key] = !ansicht.ebenen[s.key]; nach();
    };
  });
  WZ_ZEICHNUNG.forEach((s) => {
    ui.el(`wz-z-${s.key}`).onclick = () => {
      ansicht.ebenen[s.key] = !ansicht.ebenen[s.key]; nach();
    };
  });
  WZ_LASTEN.forEach((s) => {
    ui.el(`wz-l-${s.key}`).onclick = () => {
      if (s.haupt) ansicht.ebenen.last = !ansicht.ebenen.last;
      else ansicht.lastarten[s.key] = !ansicht.lastarten[s.key];
      nach();
    };
  });
  ui.el('wz-r-kraefte').onclick = () => {
    ansicht.ebenen.kraefte = !ansicht.ebenen.kraefte; nach();
  };
  ui.el('wz-r-schnitt').onclick = () => {
    ansicht.ebenen.schnitt = !ansicht.ebenen.schnitt; nach();
  };
  ui.el('wz-r-werte').onclick = () => {
    ansicht.werteAnschreiben = !ansicht.werteAnschreiben; nach();
  };
  MODI.forEach((mo) => {
    ui.el(`wz-p-${mo.key}`).onclick = () => {
      ansicht.modus = mo.key;
      ansicht.zeichne(); zeichneLegende(); zeichneModellWerkzeuge();
    };
  });
}

/**
 * Auswahl der dargestellten Einwirkung, oben mittig im Modellfenster.
 * Voreingestellt ist die Umhüllende: je Station der ungünstigste Wert über
 * alle Kombinationen. Einzeln gewählt zeigt das Modell genau eine Kombination.
 */
function zeichneEinwirkungswahl() {
  const n = ui.el('einwirkung-wahl');
  if (!n || !letzte) return;
  /*
   * >>> NACH ART GEGLIEDERT (Durchsicht vom 18. September, Punkt U6). <<<
   *
   * Zwanzig Faelle standen in einer Reihe; die Frage «welcher ist ein
   * Nachweis?» musste man aus dem Namen lesen. Jetzt in Gruppen: was
   * nachgewiesen wird, was nur eine Einwirkung zeigt, was die Verformung
   * betrifft. Die Nummern LF1 … bleiben - sie stehen so im Bericht und in
   * der Ausleitung.
   */
  const GRUPPE = [
    ['tragsicherheit', 'Tragsicherheit'],
    ['aussergewoehnlich', 'Aussergewöhnlich (Havarie)'],
    ['charakteristisch', 'Charakteristisch — kein Nachweis'],
    ['gebrauchstauglichkeit', 'Gebrauchstauglichkeit — kein Nachweis'],
  ];
  const lf = [{ wert: 'umhuellend', text: 'umhüllend', gruppe: '' },
              ...letzte.kombi.lastfaelle.map((k, i) => ({
                wert: k.key,
                text: `LF${i + 1} · ${k.bez.replace(/^Gebrauchstauglichkeit /, '')}`,
                gruppe: k.eigen ? 'Eigene Lastfälle'
                  : (GRUPPE.find(([a]) => a === k.art)?.[1] ?? 'Weitere') }))];
  const wahl = (id, beschriftung, punkte, jetzt) => {
    const opt = (o) => `<option value="${esc(o.wert)}"${o.wert === jetzt ? ' selected' : ''}
         >${esc(o.text)}</option>`;
    const namen = [...GRUPPE.map(([, n]) => n), 'Eigene Lastfälle', 'Weitere'];
    return `<label for="${id}">${esc(beschriftung)}</label>
     <select id="${id}">${punkte.filter((o) => !o.gruppe).map(opt).join('')}${
       namen.map((g) => {
         const drin = punkte.filter((o) => o.gruppe === g);
         return drin.length ? `<optgroup label="${esc(g)}">${drin.map(opt).join('')}</optgroup>` : '';
       }).join('')}</select>`;
  };

  // NICHT NEU BAUEN, WENN DIESELBE LISTE DASTEHT.
  //
  // Der Weg war ein Kreis: die Auswahl löst onchange aus, onchange rechnet,
  // und das Rechnen ruft hierher zurück - mitten in die eben erst
  // geschlossene Liste hinein. Der <select>-Knoten verschwand und ein neuer
  // erschien; im Edge sieht man das als AUFBLINKEN, weil dessen Liste beim
  // Schliessen noch nachblendet.
  //
  // Dieselbe Regel gilt schon für die Eingabemaske (siehe maskenSignatur):
  // solange sich die Struktur nicht ändert, bleiben die Felder stehen. Hier
  // ist die Struktur die Liste der Lastfälle - ändert sie sich nicht, wird
  // nur der gewählte Punkt nachgezogen.
  const sig = JSON.stringify(lf);
  const steht = ui.el('wahl-einwirkung');
  if (steht && steht.dataset.sig === sig) {
    if (steht.value !== anzeigeKombi) steht.value = anzeigeKombi;
    return;
  }

  // Nur noch der Lastfall: die aufgetragene Grösse steht jetzt bei den
  // Werkzeugen unter «Resultate», wo sie neben den übrigen Darstellungsfragen
  // hingehört.
  n.innerHTML = wahl('wahl-einwirkung', 'Lastfall', lf, anzeigeKombi);
  ui.el('wahl-einwirkung').dataset.sig = sig;

  ui.el('wahl-einwirkung').onchange = (e) => {
    anzeigeKombi = e.target.value;
    // Der Lastfall entscheidet, welche Lastarten überhaupt vorkommen - die
    // Werkzeugleiste muss das sofort zeigen, nicht erst nach der Rechnung.
    neuRechnen(false);
    zeichneModellWerkzeuge();
  };
}

/**
 * Legende verschiebbar machen.
 *
 * In der Betriebsart «Positionen» wird sie so lang, dass sie die Werkzeuge
 * verdeckt - und es gibt keine Ecke, in der sie immer richtig läge. Gezogen
 * wird an der Kopfzeile, Doppelklick stellt sie zurück.
 */
function verdrahteLegendeZiehen(n) {
  const griff = n.querySelector('.legende-griff');
  if (!griff) return;
  griff.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    try { griff.setPointerCapture(e.pointerId); } catch { /* kein Fang */ }
    const buehne = ui.el('viewer').getBoundingClientRect();
    const kasten = n.getBoundingClientRect();
    const dx = e.clientX - kasten.left, dy = e.clientY - kasten.top;
    // Lage, von der aus verschoben wird. Ab hier bewegt nur noch der VERSATZ.
    const start = { links: kasten.left - buehne.left, oben: kasten.top - buehne.top };
    let ziel = { ...start };
    let angefordert = 0;
    let bewegt = false;
    n.classList.add('zieht');

    /*
     * WARUM VERSATZ UND NICHT left/top.
     *
     * left/top zu setzen heisst, den Browser bei jeder Zeigerbewegung neu
     * rechnen zu lassen, wo alles liegt - für einen Kasten, der sich nur
     * verschiebt. Ein transform ist dagegen Sache des Compositors und kostet
     * kein Layout. Festgeschrieben wird erst am Schluss, denn die gemerkte
     * Lage muss ohne Versatz gelten.
     *
     * UND HÖCHSTENS EIN SCHREIBEN JE BILD. Ein Zeiger schickt mehr
     * Ereignisse, als der Bildschirm Bilder zeigt; jedes davon sofort
     * auszuführen heisst, mehrfach für dasselbe Bild zu arbeiten. Genau das
     * ruckelt.
     */
    const male = () => {
      angefordert = 0;
      n.style.transform =
        `translate3d(${ziel.links - start.links}px, ${ziel.oben - start.oben}px, 0)`;
    };
    const bewegen = (ev) => {
      ziel = {
        links: Math.max(4, Math.min(buehne.width - kasten.width - 4,
                                    ev.clientX - buehne.left - dx)),
        oben: Math.max(4, Math.min(buehne.height - kasten.height - 4,
                                   ev.clientY - buehne.top - dy)),
      };
      // Erst wenn wirklich gezogen wurde, gilt die Legende als verschoben -
      // ein blosser Klick auf den Griff soll sie nicht aus der Ecke lösen.
      if (!bewegt && (Math.abs(ziel.links - start.links) > 2 ||
                      Math.abs(ziel.oben - start.oben) > 2)) {
        bewegt = true;
        n.classList.add('gezogen');
        n.style.left = `${start.links}px`;
        n.style.top = `${start.oben}px`;
      }
      if (bewegt && !angefordert) angefordert = requestAnimationFrame(male);
    };
    const ende = () => {
      if (angefordert) { cancelAnimationFrame(angefordert); angefordert = 0; }
      griff.removeEventListener('pointermove', bewegen);
      griff.removeEventListener('pointerup', ende);
      griff.removeEventListener('pointercancel', ende);
      n.classList.remove('zieht');
      n.style.transform = '';
      if (!bewegt) return;
      legendeLage = ziel;
      n.style.left = `${ziel.links}px`;
      n.style.top = `${ziel.oben}px`;
    };
    griff.addEventListener('pointermove', bewegen);
    griff.addEventListener('pointerup', ende);
    griff.addEventListener('pointercancel', ende);
  });
  griff.addEventListener('dblclick', () => {
    legendeLage = null;
    n.classList.remove('gezogen');
    n.style.left = ''; n.style.top = '';
  });
}

/** Gemerkte Lage der Legende, damit sie beim Neuzeichnen stehen bleibt. */
let legendeLage = null;

/** Legende passend zur gewählten Einfärbung. */
function zeichneLegende() {
  const n = ui.el('legende');
  const p = ansicht.plotSkala();
  const griff = (titel) =>
    `<div class="legende-griff"><span>${esc(titel)}</span>
       <small>ziehen</small></div>`;
  // Nach dem Neuaufbau die gemerkte Lage wiederherstellen und neu verdrahten.
  const fertig = () => {
    if (legendeLage) {
      n.classList.add('gezogen');
      n.style.left = `${legendeLage.links}px`;
      n.style.top = `${legendeLage.oben}px`;
    } else {
      n.classList.remove('gezogen');
      n.style.left = ''; n.style.top = '';
    }
    verdrahteLegendeZiehen(n);
  };
  if (p) {
    // η hat eine feste Skala bis 1.25; alle übrigen Grössen werden auf den
    // grössten Betrag im Modell bezogen, der deshalb dabeisteht.
    const marken = p.fest
      ? ['0', '0.6', '1.0', '1.25']
      : [0, 0.33, 0.66, 1].map((f) => (p.max * f).toFixed(p.nk));
    n.innerHTML =
      griff(`${p.label}${p.einheit === '–' ? '' : ` [${p.einheit}]`}`) +
      '<div class="legende-bar"></div>' +
      `<div class="legende-skala">${marken.map((s) => `<span>${esc(s)}</span>`).join('')}</div>` +
      (p.fussnote ? `<div class="legende-fuss">${esc(p.fussnote)}</div>` : '') +
      (p.max > 0 || p.fest ? '' : '<div class="legende-fuss">keine Werte vorhanden</div>');
    fertig();
    return;
  }
  if (ansicht.modus === 'positionen') {
    const l = ansicht.szene?.legende ?? [];
    n.innerHTML = griff('Positionen') + '<div class="legende-liste">' +
      l.map((e) => `<div><span class="legende-farbe" style="background:${e.farbe}"></span>` +
                   `<span>${esc(e.label)}</span></div>`).join('') + '</div>';
    fertig();
    return;
  }
  n.innerHTML = griff('Bauteile') + '<div class="legende-liste">' +
    '<div><span class="legende-farbe" style="background:var(--stahl)"></span><span>Gurtwinkel</span></div>' +
    '<div><span class="legende-farbe" style="background:var(--blech)"></span><span>Bindeblech</span></div>' +
    '<div><span class="legende-farbe" style="background:var(--achse)"></span><span>Anbauteil</span></div></div>';
  fertig();
}

/** Klick auf eine Bemassung im Modell: passendes Eingabefeld öffnen. */
function zeigeFeld(key) {
  const f = FELDER.find((x) => x.key === key);
  const tab = ui.EINGABE_TABS.find((t) => t.gruppen.includes(f?.gruppe));
  if (!tab) return;
  tabEingabe = tab.id;
  neuRechnen();
  const el = document.getElementById(`feld-${key}`) ??
             ui.el('maske').querySelector(`[data-feld="${key}"]`);
  if (el) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const rahmen = el.closest('.feld') ?? el;
    rahmen.classList.add('blitz');
    setTimeout(() => rahmen.classList.remove('blitz'), 1400);
    if (!el.disabled) el.focus({ preventScroll: true });
  }
}

// --- Layout -----------------------------------------------------------------

/**
 * Breite, auf die eine Schublade einklappt.
 * Nicht null: die Schiene bleibt stehen und trägt die Reiter weiter.
 */
const SCHIENE = 42;

/** Ist eine Seite eingeklappt? */
const zuSeite = { links: false, rechts: false };

/**
 * Was die Modellspalte mindestens braucht [px].
 *
 * Die beiden Werkzeugleisten im Modellfenster sind zusammen rund 150 px
 * breit; darunter liegen sie übereinander und über dem Joch. Auf einem
 * 900-px-Fenster blieben der Mitte bei festen 386 + 380 px genau 92 px - eine
 * Spalte, in der man nichts mehr erkennt und die man auch nicht aufziehen
 * kann, ohne eine Schublade zu opfern.
 */
const MODELL_MIN = 320;

/** Breite eines Splitters [px] - dieselbe Marke, aus der die CSS sie bezieht. */
const SPLIT_PX = MASS.splitBreite;

function baueLayout() {
  const ws = ui.el('ws');
  /*
   * AM ARBEITSBLATT SELBST, NICHT AN DER WURZEL.
   *
   * .ws setzt --sp-links / --sp-rechts als Vorgabe auf sich selbst (siehe
   * style.css) - eine eigene Festlegung am Element gewinnt gegen die geerbte
   * von :root. Solange das Skript dieselben 386/380 px schrieb, fiel das nie
   * auf; sobald es andere Breiten berechnet, wurden sie stillschweigend
   * verworfen. Am Element geschrieben, wirken sie.
   */
  const setze = (name, px) => ws.style.setProperty(name, px + 'px');

  /** Wieviel Platz die Schubladen zusammen höchstens einnehmen dürfen. */
  /*
   * >>> DAS MODELL BEKOMMT MINDESTENS 42 % DER BREITE (Durchsicht vom
   *     18. September, Punkt U5). <<<
   *
   * Mit festen 320 px blieben ihm auf einem Laptop (1280 px) 486 px - ein
   * Streifen neben zwei vollen Schubladen. Jetzt geben die Schubladen im
   * Verhaeltnis nach, bis das Modell 42 % hat: bei 1280 px 538 px, die
   * Schubladen rund 360/355 px. Ab etwa 1830 px bleibt alles wie bisher.
   */
  const modellMin = () =>
    Math.max(MODELL_MIN, Math.round(0.42 * document.documentElement.clientWidth));
  const platzFuerSchubladen = () =>
    Math.max(2 * SCHIENE,
             document.documentElement.clientWidth - 2 * SPLIT_PX - modellMin());

  let links = 386, rechts = 380;
  // Auf schmalen Fenstern beide Schubladen im Verhältnis zurücknehmen, statt
  // der Mitte zu lassen, was übrig bleibt.
  const frei = platzFuerSchubladen();
  if (links + rechts > frei) {
    const f = frei / (links + rechts);
    links = Math.max(SCHIENE, Math.round(links * f));
    rechts = Math.max(SCHIENE, Math.round(rechts * f));
  }
  /*
   * >>> ENTWEDER BREIT GENUG ZUM ARBEITEN ODER EINGEKLAPPT. <<<
   *
   * Gefunden am 11. September in einem Bedienlauf bei 835 px Fensterbreite:
   * die Ruecknahme oben stauchte die Schublade auf rund 230 px. Das ist
   * schmaler, als ihr Inhalt werden kann - die Anbauteilliste braucht mit
   * Punkt, Position, Name, Station und Kraeften ihre gut 250 px -, und die
   * Spalte bekam einen waagrechten Bildlauf. Beim Scrollen wanderten dann
   * die Beschriftungen nach links aus dem Bild: «...ARME DES KRAEFTEPAARS»
   * statt «HEBELARME», «...st durchlaufend» statt «Mast durchlaufend».
   *
   * Eine Schublade, in der man die Beschriftungen wegschieben muss, ist
   * keine Schublade mehr. Unterhalb der Arbeitsbreite wird sie deshalb ganz
   * EINGEKLAPPT - dann steht die Schiene mit ihren Symbolen da, und der Weg
   * zurueck ist ein Klick. Das ist der Zustand, den die Schiene seit dem
   * 5. September vorsieht; er wurde nur nie von selbst erreicht.
   */
  const ARBEITSBREITE = 260;
  /*
   * ERST DIE RECHTE EINKLAPPEN, NICHT BEIDE. Reicht der Platz fuer zwei
   * Schubladen nicht, bekommt die Eingabe ihn allein - die rechte Schiene
   * zeigt die Hauptnachweise ja weiter.
   */
  if (links < ARBEITSBREITE || rechts < ARBEITSBREITE) {
    const nurLinks = Math.min(386, frei - SCHIENE);
    if (nurLinks >= ARBEITSBREITE) { links = nurLinks; rechts = SCHIENE; }
  }
  if (links < ARBEITSBREITE) links = SCHIENE;
  if (rechts < ARBEITSBREITE) rechts = SCHIENE;
  setze('--sp-links', links); setze('--sp-rechts', rechts);

  // Zuletzt offene Breite je Seite, damit das Einklappen umkehrbar bleibt
  // Beim Start eingeklappt: aufgeklappt wird auf die Vorgabebreite, nicht auf die Schiene.
  const offen = { links: links > SCHIENE ? links : 386, rechts: rechts > SCHIENE ? rechts : 380 };

  const setzeSeite = (seite, v) => {
    if (seite === 'links') { links = v; setze('--sp-links', v); }
    else { rechts = v; setze('--sp-rechts', v); }
    const zu = v <= SCHIENE + 8;
    zuSeite[seite] = zu;
    ws.classList.toggle('zu-' + seite, zu);
    ui.el('split-' + seite).classList.toggle('zu', zu);
    if (zu) zeichneSchienen();
    ansicht?.passeGroesseAn();
  };
  /*
   * AUCH BEIM START EINGEKLAPPT, NICHT NUR SCHMAL. Hier wurde bisher nur die
   * Breite auf die Schiene gesetzt, die Klasse `zu-…` fehlte - der ganze
   * Inhalt stand dann in 42 px zusammengequetscht (gesehen bei 800 px).
   */
  if (links <= SCHIENE) setzeSeite('links', SCHIENE);
  if (rechts <= SCHIENE) setzeSeite('rechts', SCHIENE);

  // Beim KLICKEN weich fahren, beim ZIEHEN nicht: eine Übergangszeit am
  // Mauszeiger fühlt sich wie Verzögerung an, nicht wie Führung.
  const weich = (fn) => {
    ws.classList.add('animiert');
    fn();
    const fertig = () => {
      ws.classList.remove('animiert');
      ws.removeEventListener('transitionend', fertig);
      ansicht?.passeGroesseAn();
      // Steht die Fahrt, darf die Ansicht nachgeben: sonst bleibt das Joch
      // links und rechts abgeschnitten, weil der Massstab nur an der Höhe
      // hängt. Nur herausfahren, nie heran - siehe passeEinWennAbgeschnitten.
      ansicht?.passeEinWennAbgeschnitten();
    };
    ws.addEventListener('transitionend', fertig);
    setTimeout(fertig, 400);           // falls der Übergang ausbleibt
  };

  const umschalten = (seite) => {
    const jetzt = seite === 'links' ? links : rechts;
    weich(() => {
      if (jetzt <= SCHIENE + 8) setzeSeite(seite, offen[seite] || 386);
      else { offen[seite] = jetzt; setzeSeite(seite, SCHIENE); }
    });
  };
  // Von der Schiene aus wieder ausfahren, und zwar auf einen bestimmten Reiter.
  ausklappen = (seite) => {
    if (!zuSeite[seite]) return;
    weich(() => setzeSeite(seite, offen[seite] || (seite === 'links' ? 386 : 380)));
  };

  const zieher = (id, seite) => {
    const g = ui.el(id);
    g.title = 'Ziehen zum Verbreitern, klicken zum Ein- und Ausklappen';
    g.addEventListener('pointerdown', (e) => {
      // Kann werfen, wenn der Zeiger schon wieder weg ist. Ungesichert riss
      // es den ganzen Griff ab: die Zuhoerer fuer Bewegen und Loslassen
      // kamen dann gar nicht mehr, und der Bereich liess sich weder ziehen
      // noch einklappen.
      try { g.setPointerCapture(e.pointerId); } catch { /* kein Fang */ }
      const start = e.clientX;
      const a0 = seite === 'links' ? links : rechts;
      let bewegt = false;
      const bewegen = (ev) => {
        const d = (ev.clientX - start) * (seite === 'links' ? 1 : -1);
        if (Math.abs(ev.clientX - start) > 3) bewegt = true;
        // Obergrenze ist nicht mehr eine feste Zahl, sondern das, was der
        // Mitte bleiben muss. Zwei Schubladen zu je 640 px passten auf kein
        // Fenster unter 1600 px, ohne das Modell zu erdrücken.
        if (bewegt) {
          const andere = seite === 'links' ? rechts : links;
          const grenze = Math.max(SCHIENE,
            Math.min(640, platzFuerSchubladen() - andere));
          setzeSeite(seite, Math.max(SCHIENE, Math.min(grenze, a0 + d)));
        }
      };
      const ende = () => {
        g.removeEventListener('pointermove', bewegen);
        g.removeEventListener('pointerup', ende);
        // Klick ohne Bewegung klappt den Bereich ein oder wieder aus
        if (!bewegt) umschalten(seite);
      };
      g.addEventListener('pointermove', bewegen);
      g.addEventListener('pointerup', ende);
    });
  };
  zieher('split-links', 'links');
  zieher('split-rechts', 'rechts');

  /*
   * WIRD DAS FENSTER SCHMALER, GEBEN DIE SCHUBLADEN NACH.
   *
   * Sonst schrumpft nur die Mitte gegen null - und der Weg zurück führt über
   * zwei Züge am Splitter, die man erst finden muss. Eingeklappte Seiten
   * bleiben eingeklappt: das war eine Entscheidung des Benutzers.
   */
  window.addEventListener('resize', () => {
    const platz = platzFuerSchubladen();
    const offen = (zuSeite.links ? 0 : links) + (zuSeite.rechts ? 0 : rechts);
    if (offen <= platz) return;
    const f = platz / offen;
    if (!zuSeite.links) setzeSeite('links', Math.max(SCHIENE, Math.round(links * f)));
    if (!zuSeite.rechts) setzeSeite('rechts', Math.max(SCHIENE, Math.round(rechts * f)));
  });

  zeichneSchienen();
}

/** Wird in baueLayout gesetzt; von den Schienen aus gerufen. */
let ausklappen = () => {};

/**
 * INHALT DER SCHIENEN.
 *
 * Links die Reiter der Eingabe, rechts zuoberst die Hauptnachweise und darunter
 * die Reiter der Auswertung. Der Sinn der rechten Schiene ist genau das: wer
 * das Modell breit macht, soll trotzdem sehen, ob der Nachweis hält - sonst
 * rechnet man im Blindflug und klappt alle zwei Minuten wieder auf.
 */
function zeichneSchienen() {
  const knopf = (id, sym, titel, an) =>
    `<button class="schiene-knopf${an ? ' on' : ''}" data-reiter="${id}"
       type="button" title="${esc(titel)}">${icon(sym, 15)}</button>`;

  const l = ui.el('schiene-links');
  if (l) {
    l.innerHTML = ui.EINGABE_TABS
      .map((t) => knopf(t.id, t.icon, `${t.titel} öffnen`, t.id === tabEingabe)).join('');
    l.querySelectorAll('[data-reiter]').forEach((b) => {
      b.onclick = () => { tabEingabe = b.dataset.reiter; neuRechnen(); ausklappen('links'); };
    });
  }

  const r = ui.el('schiene-rechts');
  if (!r) return;
  const e = letzte?.anzeige;
  /*
   * OHNE ZAHL KEINE AMPEL. Ueber der groessten lieferbaren Laenge gibt es
   * fuer den Anker kein eta - dort steht ein Strich, und der ist ein Befund:
   * das Bauteil ist nicht belegt. Gruen waere die falsche Farbe, rot die
   * Behauptung einer Ueberschreitung, die niemand gerechnet hat.
   */
  const stufe = (v) => (!Number.isFinite(v) ? 'nok'
    : v > 1 ? 'nok' : v > 0.9 ? 'warn' : 'ok');
  // Die drei Einzelnachweise. η gesamt stand hier zuoberst und ist weg: es
  // sagt nichts, was diese drei nicht schon sagen - es IST das grösste von
  // ihnen -, und in der Fusszeile steht es ohnehin mitsamt Urteil.
  /*
   * DIE SCHIENE ZEIGT, WAS ES GIBT.
   *
   * Beim Joch sind das die drei Einzelnachweise. Beim Einzelmast gibt es
   * weder Ober- noch Untergurt noch Bindeblech - dort steht der eine
   * Nachweis, den er hat. Die Schiene ist bei eingeklappter Schublade das
   * Einzige, was von der Auswertung bleibt; sie darf nicht leer sein und
   * erst recht nicht von Bauteilen sprechen, die nicht dastehen.
   */
  /*
   * >>> ALLE NACHWEISE, NACH BAUTEIL GRUPPIERT. <<<
   *
   * Weisung vom 3. September: «Hier die pillen mit den restlichen nachweisen
   * (mast etc.) erweitern und etwas gruppiert darstellen.»
   *
   * Hier standen drei Pillen: Obergurt, Untergurt, Bindeblech. Der Mast
   * fehlte - und er ist auf einer Jochreihe regelmaessig der massgebende
   * (0.87 gegen 0.45 im gemessenen Fall). Wer die Schublade zuklappt und nur
   * die Schiene sieht, las damit den kleineren der beiden Werte und hielt
   * ihn fuer den Stand des Tragwerks.
   *
   * >>> GRUPPIERT, WEIL ES ZWEI BAUTEILE SIND. <<<
   *
   * Joch und Mast sind nicht dasselbe Tragglied. Fuenf Pillen in einer Reihe
   * lesen sich wie eine Steigerung; mit einem Trenner dazwischen liest man
   * zwei Gruppen. Der Trenner kostet drei Pixel und spart die Rueckfrage,
   * was «M2» neben «Bl» zu suchen hat.
   *
   * DIE MASTEN STEHEN UNTER IHREM NAMEN da (M1, M2) - dieselbe Regel wie in
   * den Kacheln der Auswertung. Sind beide Enden derselbe Mast, steht er
   * einmal: zwei gleiche Pillen waeren keine Auskunft, sondern ein Verdacht.
   */
  const gruppen = [];
  if (e) {
    if (letzte?.mitJoch === false) {
      gruppen.push({ titel: 'Mast',
        teile: [['Ma', letzte.erg?.mast?.eta ?? 0, 'Mast, Querschnitt']] });
    } else if (e.abfang) {
      /*
       * >>> DAS ABFANGJOCH HAT ZWEI GURTE, NICHT VIER. <<<
       *
       * Weisung vom 4. September: «nachweise beim Abfangjoch
       * aktualisieren.» Hier standen «OG», «UG» und «Bl» - die Pillen des
       * Tragjochs. Wer die Schublade zuklappt, sieht nur diese Schiene;
       * sie darf nicht von Bauteilen sprechen, die es nicht gibt.
       */
      gruppen.push({ titel: 'Abfangjoch', teile: [
        ['G', e.abfang.gurt?.eta ?? 0, `Gurt ${e.abfang.q.gurt.name}`],
        ['Bl', e.abfang.blech?.eta ?? 0, 'Bindeblech, massgebende Station'],
      ] });
    } else {
      gruppen.push({ titel: 'Joch', teile: [
        ['OG', e.max.etaOG.og.eta, `Obergurt ${e.modell.profOG.name}`],
        ['UG', e.max.etaUG.ug.eta, `Untergurt ${e.modell.profUG.name}`],
        ['Bl', e.max.etaB.etaB, 'Bindeblech, massgebende Ebene'],
      ] });
    }
    /*
     * Nur wenn der Nachweis auch GEFUEHRT wird: die Gruppe laesst sich
     * abschalten, und dann hat hier keine Zahl zu stehen. Dieselbe Regel
     * wie bei den Kacheln - sonst zeigte die Schiene mehr, als die
     * Auswertung verantwortet.
     */
    /* =====================================================================
     * >>> DIE MASTEN STEHEN AUCH AM ABFANGJOCH IN DER SCHIENE. <<<
     * =====================================================================
     *
     * Weisung vom 11. September: «beim abfangjoch die pillen fuer masten
     * (anker druckstuetzen) beim zugeklappten zustand auffuehren und
     * gruppieren wie beim tragjoch.»
     *
     * Hier stand: «Beim Abfangjoch steht keine Mastpille - `erg.mast` kommt
     * aus der Tragjochrechnung und gilt fuer dieses Tragwerk nicht.» Das war
     * richtig bis zum 10. September; seither wird der Mastnachweis am
     * Abfangjoch mit dessen EIGENEN Auflagerkraeften gebildet und ersetzt
     * den alten (`anzeige.mast`). Der Grund fuer die Auslassung ist damit
     * weggefallen, die Auslassung war geblieben.
     *
     * Und sie war die gefaehrlichere Haelfte: gerade am Abfangjoch wird der
     * Mast regelmaessig massgebend - im Bedienlauf vom 11. September stand
     * das Joch bei 0.52 und ein Mast bei 1.47. Wer die Schublade zuklappt,
     * sah nur den kleineren Wert.
     * =================================================================== */
    const mastGefuehrt = letzte?.urteil?.nachweise?.mast !== false;
    if (letzte?.mitJoch !== false && e.mast && mastGefuehrt) {
      const namen = e.modell.federn?.namen ?? {};
      const gesehen = new Set();
      const teile = [];
      ['A', 'B'].forEach((ende) => {
        const n = e.mast[ende];
        if (!n) return;
        const name = namen[ende] || `Ende ${ende}`;
        if (gesehen.has(name)) return;
        gesehen.add(name);
        // Wie in den Kacheln: fuer das Urteil zaehlt der NACHWEIS, nicht
        // der Querschnitt allein - Stabilitaet eingeschlossen.
        teile.push([name, n.etaMitStabilitaet ?? n.eta ?? 0,
                    `${name}${n.profil ? ` ${n.profil}` : ''}`]);
      });
      if (teile.length) gruppen.push({ titel: 'Masten', teile });
    }
    /* =====================================================================
     * >>> UND DIE ANKER ALS EIGENE GRUPPE. <<<
     * =====================================================================
     *
     * Weisung vom 11. September (dieselbe): «(anker druckstuetzen)».
     *
     * Sie bekommen eine eigene Gruppe und nicht einen Platz bei den Masten,
     * denn ihr eta steht auf einer anderen Grundlage: CHARAKTERISTISCHE
     * Kraft gegen die zulaessige des Bemessungsdiagramms, waehrend Joch und
     * Mast auf Bemessungswerten stehen. Zwei Zahlen in einer Reihe lesen
     * sich als vergleichbar - genau das sind sie nicht, und der Titel der
     * Gruppe sagt es.
     *
     * UEBER DEM SORTIMENT gibt es kein eta. Die Pille steht trotzdem da,
     * mit einem Strich: eine fehlende Pille laese sich als «kein Anker»
     * lesen, und das waere die falsche Auskunft.
     */
    if (e.anker) {
      const namen = e.modell.federn?.namen ?? {};
      const gesehen = new Set();
      const teile = [];
      ['A', 'B'].forEach((ende) => {
        const nw = e.anker[ende]?.nachweis;
        if (!nw) return;
        const name = namen[ende] || `Ende ${ende}`;
        if (gesehen.has(name)) return;
        gesehen.add(name);
        const wie = `${name} · ${nw.typ} · ${nw.N >= 0 ? 'Zug' : 'Druck'} `
          + `${Math.abs(nw.N).toFixed(1)} kN charakteristisch`
          + (nw.lieferbar === false ? ' · ÜBER DEM SORTIMENT' : '');
        /*
         * >>> DIE PILLE HEISST NICHT WIE DER MAST. <<<
         *
         * Weisung vom 16. September: «beim anker noch ergänzung anschreiben,
         * damit es nicht gleich ist wie beim mast m2.»
         *
         * Sie trug den MASTNAMEN - in der Schiene standen dann zwei Pillen
         * «M2» untereinander, eine mit 0.95 und eine mit 0.11, und nichts
         * sagte, dass die zweite der Stütze gehört. Der Gruppentitel steht
         * nur im Tooltip, und den liest niemand im Vorbeigehen.
         */
        teile.push([`Ank ${name}`,
                    Number.isFinite(nw.eta) ? nw.eta : null, wie]);
      });
      if (teile.length) gruppen.push({ titel: 'Anker · char.', teile });
    }
  }

  // Die Reiter stehen oben, die Nachweise darunter: oben sucht man den Weg
  // zurück in die Auswertung, unten liest man ab. Die Pillen füllen die
  // verbleibende Höhe; ihre Beschriftung steht senkrecht, weil in 42 mm
  // Breite sonst nur zwei Zeichen Platz hätten.
  r.innerHTML =
    ui.AUSWERTUNG_TABS
      .map((t) => knopf(t.id, t.icon, `${t.titel} öffnen`, t.id === tabAuswertung)).join('') +
    (gruppen.length ? '<div class="schiene-trenner"></div>' +
         `<div class="schiene-nw">${gruppen.map((g, i) =>
           (i ? '<span class="nw-gruppe-trenner"></span>' : '') +
           `<span class="nw-gruppe" title="${esc(g.titel)}">${
             /*
              * >>> OHNE URTEIL KEINE FARBE - AUCH HIER. <<<
              *
              * Weisung vom 16. September zur Uebersicht: «wenn kein
              * tragsicherheitsurteil, dann ohne farbe.» Die Pillen zeigen
              * dieselben Zahlen wie die Kacheln, und beim Einzellastfall
              * waren sie gruen, waehrend die Uebersicht daneben grau war -
              * zwei Aussagen ueber dieselbe Sache.
              *
              * EINHEITLICH FUER ALLE PILLEN, auch die des Ankers: seine
              * Zahl haengt zwar nicht an der Anzeigewahl (er rechnet auf
              * charakteristischen Lastfaellen), aber eine farbige Pille
              * zwischen fuenf grauen laese sich als Urteil ueber das ganze
              * Tragwerk lesen. Der Tooltip sagt weiterhin, was sie ist.
              */
             g.teile.map(([k, v, titel]) =>
               `<div class="${anzeigeKombi === 'umhuellend' ? stufe(v) : ''}"
                     title="${esc(`${g.titel} · ${titel}`)}: η = ${
                       Number.isFinite(v) ? v.toFixed(3)
                         : 'nicht geführt'}">
                  <span class="senkrecht"><i>${esc(k)}</i><b>${
                    Number.isFinite(v) ? v.toFixed(2) : '–'}</b></span>
                </div>`).join('')}</span>`).join('')}</div>` : '');
  r.querySelectorAll('[data-reiter]').forEach((b) => {
    b.onclick = () => { tabAuswertung = b.dataset.reiter; zeichneAuswertung(); ausklappen('rechts'); };
  });
}

function themaWechseln() {
  thema = thema === 'dunkel' ? 'hell' : 'dunkel';
  uebertrageTokens(thema);
  baueKopf();
  ansicht.zeichne();
  speichern();
}

/**
 * ZIEHEN UND ABLEGEN - Vorlage oder schon eingegebene Baugruppe.
 *
 * ZWEI QUELLEN, EIN WEG. Aus dem Vorrat kommt eine Vorlage
 * (`text/tragjoch-vorlage`), aus der Liste darunter eine BAUGRUPPE
 * (`text/tragjoch-baugruppe`) - dieselbe, die schon im Modell steht, mitsamt
 * jeder Zahl, die von Hand daran geändert wurde.
 *
 * >>> ABGELEGT WIRD DORT, WO DER ZEIGER IST - nicht auf einer Station, die
 * aus der Fensterbreite geschätzt wurde. <<<
 *
 * Hier stand vorher `anteil * L`: der waagrechte Anteil der Ansichtsbreite,
 * linear auf die Jochlänge gerechnet. Das trifft nur, wenn man genau von
 * vorn schaut und das Joch das Bild ganz füllt - in der Isometrie war es
 * schon daneben, und einen MASTEN konnte es überhaupt nicht treffen. Jetzt
 * geht derselbe Strahl durch das Bild wie beim Klicken.
 *
 * Trifft der Zeiger nichts Brauchbares, wird nicht geraten: das Bauteil
 * bleibt vorgewählt, und der nächste Klick setzt es.
 */
function verdrahteAblegen() {
  const v = ui.el('viewer');
  const artVon = (dt) =>
    (dt.types.includes('text/tragjoch-baugruppe') ? 'kopie'
      : dt.types.includes('text/tragjoch-vorlage') ? 'vorlage' : null);
  v.addEventListener('dragover', (e) => {
    if (!artVon(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    v.classList.add('ablegen');
  });
  v.addEventListener('dragleave', () => v.classList.remove('ablegen'));
  v.addEventListener('drop', (e) => {
    const art = artVon(e.dataTransfer);
    if (!art) return;
    const id = e.dataTransfer.getData(
      art === 'kopie' ? 'text/tragjoch-baugruppe' : 'text/tragjoch-vorlage');
    if (!id) return;
    e.preventDefault();
    e.stopPropagation();
    v.classList.remove('ablegen');
    /*
     * ERST DEN SETZMODUS, DANN DIE STELLE.
     *
     * Umgekehrt herum stuende der Zeigerhaken nicht - und griffe die Sperre
     * ("am Masten kein Traeger"), koennte man danach nicht mehr klicken:
     * Meldung im Balken, Modell tot.
     */
    setzenStarten({ art, id });
    const w = ansicht.weltAusZeiger(e);
    const st = w ? stelleAus(w) : null;
    if (st) { setzen = { ...setzen, stelle: st }; setzeVorwahlAnStelle(); }
    else zeichneBalken();
  });
}

// --- Ablage -----------------------------------------------------------------

/**
 * Laufende Nummer des offenen Dialogs.
 *
 * Gebraucht, weil das Wegräumen jetzt erst NACH der Schliessbewegung
 * geschieht: öffnet in der Zwischenzeit ein anderer Dialog, darf der
 * nachlaufende Zeitgeber ihn nicht mitnehmen. Er räumt nur weg, was er
 * selbst aufgemacht hat.
 */
let dialogLauf = 0;
/** Dauer der Schliessbewegung - dieselbe Zahl steht im Stylesheet. */
const DIALOG_ZU_MS = 140;

/* ===========================================================================
 * DAS KONTEXTMENUE
 *
 * Weisung vom 2. September: «ausblenden mit rechtsklick ermöglichen im 3d
 * sowie in der sidebar. man könnte sonst einige nützliche kontext optionen
 * unter rechtsklick aufführen.»
 *
 * >>> WAS HINEINGEHOERT, UND WAS NICHT. <<<
 *
 * Ein Kontextmenue ist kein zweites Hauptmenue. Hinein gehoert, was sich auf
 * DAS GEKLICKTE bezieht und sonst einen Umweg braucht:
 *
 *   TRAGWERK    rechnen · nur dieses zeigen · ausblenden · zoomen · entfernen
 *   MAST        Profil bearbeiten · Masten dieses Tragwerks aus · zoomen
 *   ANBAUTEIL   bearbeiten · ab-/anschalten · entfernen · zoomen
 *   GRUND       ganzes Blatt · nur das gerechnete · Nachweisschnitt ·
 *               Bauteil setzen · Zeichnung verschieben
 *
 * NICHT hinein gehoert, was die Werkzeugleiste schon zeigt und nichts mit
 * der Stelle zu tun hat - Blickrichtung, Lastfall, Ebenen. Ein Menue, das
 * ueberall dasselbe anbietet, ist keines.
 *
 * «NUR DIESES ZEIGEN» ist der Eintrag, der die Arbeit an einer langen Reihe
 * wirklich aendert: er blendet alle anderen aus, statt sie einzeln
 * wegzuklicken. Das Gegenstueck «alle zeigen» steht daneben, sobald etwas
 * ausgeblendet ist - ein Zustand, aus dem man nicht mehr herausfindet, waere
 * schlimmer als keiner.
 * =========================================================================== */

/** Das offene Menue, damit ein zweiter Klick es schliesst. */
let kontextMenue = null;

function kontextSchliessen() {
  kontextMenue?.remove();
  kontextMenue = null;
}

/**
 * Ein Menue an einer Bildschirmstelle.
 *
 * @param {[number,number]} bei   Punkt in CSS-Pixeln
 * @param {Array} punkte          {text, tun, warn} - null trennt Gruppen
 */
function kontextZeigen(bei, punkte) {
  kontextSchliessen();
  const echte = punkte.filter(Boolean);
  if (!echte.length) return;
  const n = document.createElement('div');
  n.className = 'kontext';
  /*
   * ZWEI ARTEN VON EINTRAG.
   *
   * Ein KNOPF tut etwas und schliesst das Menue. Ein FELD nimmt eine Angabe
   * entgegen und laesst es offen - man aendert einen Typ und danach vielleicht
   * noch die Laenge, ohne zweimal rechtszuklicken.
   *
   * Weisung vom 2. September: «beim kontextmenue bauteil parameter typ länge
   * ausrichtung direkt eintragen können.» Genau das: nicht ein Menuepunkt,
   * der die Karte in der Seitenleiste oeffnet, sondern die Angabe selbst,
   * dort wo man auf das Bauteil zeigt.
   */
  n.innerHTML = echte.map((p, i) => {
    if (p === '-') return '<hr>';
    if (p.kopf) return `<div class="kontext-kopf">${esc(p.kopf)}</div>`;
    if (p.feld) {
      const f = p.feld;
      const eingabe = f.art === 'auswahl'
        ? `<select data-kf="${i}">${(f.optionen ?? []).map((o) =>
            `<option value="${esc(o.wert)}"${String(o.wert) === String(f.wert)
              ? ' selected' : ''}>${esc(o.text)}</option>`).join('')}</select>`
        : `<input type="number" data-kf="${i}" value="${esc(String(f.wert ?? ''))}"
             step="${f.schritt ?? 0.1}">`;
      return `<label class="kontext-feld"><span>${esc(f.label)}</span>
        ${eingabe}${f.einheit ? `<i>${esc(f.einheit)}</i>` : ''}</label>`;
    }
    return `<button type="button" class="kontext-p${p.warn ? ' warn' : ''}"
         data-k="${i}">${esc(p.text)}</button>`;
  }).join('');
  document.body.appendChild(n);
  kontextMenue = n;
  /*
   * DAS MENUE BLEIBT IM FENSTER.
   *
   * Am rechten oder unteren Rand aufgeklappt ragte es sonst hinaus, und die
   * unteren Eintraege waeren nicht erreichbar - gerade dort, wo die
   * gefaehrlichen stehen.
   */
  const r = n.getBoundingClientRect();
  const x = Math.min(bei[0], window.innerWidth - r.width - 8);
  const y = Math.min(bei[1], window.innerHeight - r.height - 8);
  n.style.left = `${Math.max(4, x)}px`;
  n.style.top = `${Math.max(4, y)}px`;
  n.querySelectorAll('[data-k]').forEach((b2) => {
    b2.addEventListener('click', () => {
      const p = echte[+b2.dataset.k];
      kontextSchliessen();
      p?.tun?.();
    });
  });
  n.querySelectorAll('[data-kf]').forEach((el) => {
    const p = echte[+el.dataset.kf];
    const ev = el.tagName === 'SELECT' ? 'change' : 'change';
    el.addEventListener(ev, () => {
      const v = el.tagName === 'SELECT' ? el.value : parseFloat(el.value);
      if (el.tagName !== 'SELECT' && !Number.isFinite(v)) return;
      // DAS MENUE BLEIBT OFFEN. Wer den Typ aendert, will oft gleich die
      // Laenge nachziehen - zweimal rechtsklicken waere eine Zumutung.
      p?.tun?.(v);
    });
  });
  /*
   * >>> EIN KLICK INS MENUE SCHLIESST ES NICHT. <<<
   *
   * Hier stand ein `pointerdown`-Horcher ohne diese Pruefung. Mit
   * nachgestellten Klicks fiel das nicht auf - die feuern kein
   * `pointerdown`. Mit einer echten Maus schon: das Menue verschwand beim
   * Druecken, und der `click` landete auf nichts. Kein Eintrag haette
   * funktioniert, und die Ursache waere schwer zu sehen gewesen.
   */
  const zu = (e) => {
    /*
     * NUR EIN ZEIGERDRUCK HAT EIN ZIEL IM BAUM.
     *
     * Derselbe Horcher bedient `pointerdown`, `wheel` und `blur`. Beim
     * Fensterwechsel ist `e.target` das FENSTER, und `Node.contains(Window)`
     * wirft - eine Ausnahme bei jedem Wechsel aus dem Fenster heraus,
     * waehrend ein Menue offen steht. Gemessen am 3. September.
     */
    if (e?.target instanceof Node && n.contains(e.target)) return;
    kontextSchliessen(); ab();
  };
  const ab = () => {
    document.removeEventListener('pointerdown', zu, true);
    window.removeEventListener('wheel', zu, true);
    window.removeEventListener('blur', zu);
  };
  setTimeout(() => {
    document.addEventListener('pointerdown', zu, true);
    window.addEventListener('wheel', zu, true);
    window.addEventListener('blur', zu);
  }, 0);
}

/** Die Einträge zu einem Tragwerk - im Modell wie in der Leiste dieselben. */
function kontextTragwerk(id) {
  const alle = tragwerkeSortiert(werte);
  const t = alle.find((x) => x.id === id);
  if (!t) return [];
  const sichtbar = alle.filter((x) => !versteckt(x));
  const aktiv = (werte.twId ?? 'T1') === id;
  const p = [];
  /* =======================================================================
   * >>> DAS FENSTER STEHT ZUOBERST. <<<
   * =======================================================================
   *
   * Weisung vom 16. September: «diese maske auch über das kontextmenue
   * aufrufbar machen.»
   *
   * Sie war nur ueber den zweiten Klick auf ein angewaehltes Tragwerk zu
   * erreichen - ein Weg, den man kennen muss. Im Menue steht sie jetzt an
   * erster Stelle: was man am haeufigsten will, wenn man ein Bauteil
   * anklickt, ist es zu aendern.
   */
  p.push({ text: `${tragwerkName(t, werte)} bearbeiten …`,
           tun: () => dialogTragwerk(id) });
  if (!aktiv && !versteckt(t)) {
    p.push({ text: `${tragwerkName(t, werte)} rechnen`,
             tun: () => aendern('tragwerkAktiv', id) });
  }
  if (versteckt(t)) {
    p.push({ text: 'Wieder einblenden', tun: () => aendern('tragwerkZeigen', id) });
  } else if (sichtbar.length > 1) {
    p.push({ text: 'Nur dieses zeigen', tun: () => nurDiesesZeigen(id) });
    p.push({ text: 'Ausblenden', tun: () => aendern('tragwerkAus', id) });
  }
  if (alle.some(versteckt)) {
    p.push({ text: 'Alle wieder einblenden', tun: () => alleZeigen() });
  }
  /*
   * >>> EIN ABFANGJOCH GEHOERT UEBER EIN BESTIMMTES JOCH. <<<
   *
   * «Neues Tragwerk bei x = 18.50 m» auf dem leeren Grund setzt es an die
   * Stelle, auf die man gezeigt hat - das ist richtig, aber ungenau: ein
   * Abfangjoch sitzt nicht IRGENDWO, sondern auf DEN MASTEN des Jochs
   * darunter, ueber dessen ganze Strecke. Hier gezeigt, hier uebernommen:
   * Lage und Laenge kommen vom angeklickten Tragwerk.
   *
   * Was danach noch zu setzen bleibt, ist die Anschlusshoehe - die eine
   * Angabe, die zwei uebereinanderstehende Abfangjoche unterscheidet.
   */
  if (tragwerksart(t).masten >= 2) {
    p.push('-');
    p.push({ text: 'Abfangjoch darüber setzen', tun: () => {
      if ((werte.twId ?? 'T1') !== id) werte = tauscheAktives(werte, id);
      aendern('tragwerkNeu', { art: 'abfangjoch', xLage: lageVon(t) });
    } });
  }
  /* =========================================================================
   * >>> DIE ART LAESST SICH WECHSELN. <<<
   * =========================================================================
   *
   * Gefunden am 11. September in einem Bedienlauf: wer ein Tragjoch gesetzt
   * hatte und ein Abfangjoch brauchte, musste ein zweites anlegen und das
   * erste loeschen. Das Kontextmenue bot kopieren, zoomen, verschieben -
   * nur nicht das, was man am haeufigsten will.
   *
   * >>> WAS DABEI BLEIBT UND WAS NICHT. <<<
   *
   * Lage, Laenge, Masten und Anbauteile gehoeren dem TRAGWERK und bleiben.
   * Der TYP gehoert der Art: «J90» steht in keiner Abfangjoch-Liste, und
   * «A240» in keiner Tragjoch-Liste. Ein stehengebliebener Typ waere derselbe
   * Fehler, der beim Anlegen schon einmal aufgeschlagen ist - die
   * Auswahlliste zeigt dann den ersten Eintrag, waehrend im Datensatz etwas
   * anderes steht. `tragwerkNeu` setzt ihn deshalb neu, und diese Stelle
   * benutzt denselben Weg.
   *
   * Die Laenge wandert mit: ein A160 fuehrt 5.5-12.5 m, ein J130 bis 34.5 m.
   * Wer von einem 30-m-Joch auf A160 wechselt, bekommt die naechste Laenge,
   * die der neue Typ wirklich fuehrt.
   * ======================================================================= */
  const andere = TRAGWERKSARTEN.filter((a) => a.key !== tragwerksart(t).key);
  if (andere.length) {
    p.push('-');
    andere.forEach((a) => {
      p.push({ text: `Art wechseln auf: ${a.label}`, tun: () => {
        if ((werte.twId ?? 'T1') !== id) werte = tauscheAktives(werte, id);
        aendern('tragwerkArt', { id, art: a.key });
      } });
    });
  }
  /*
   * >>> VERSCHIEBEN UND KOPIEREN STEHEN HIER, NICHT AM ZEIGER. <<<
   *
   * Weisung vom 5. September: «nimm die funktion des drag and drop in der
   * sidebar unter tragwerke raus, diese funktion ist zu unpraezise. nimm
   * dafuer beim 3d unter dem kontextmenue die moeglichkeit elemente zu
   * kopieren verschieben und zu loeschen, dies fuer tragwerke und
   * anbauteile.»
   *
   * VERSCHIEBEN ist eine ZAHL, kein Zug: die Lage x₀ steht als Feld da und
   * laesst sich auf den Zentimeter setzen. Was der Zeiger auf einer Bahn von
   * vierzig Metern nie konnte, kostet hier eine Eingabe.
   *
   * KOPIEREN nimmt den ganzen Satz mit - Typ, Laenge, Profile, Bleche,
   * Anbauteile - und setzt ihn um eine Jochlaenge weiter. Das ist die Geste
   * einer Jochreihe: dasselbe Joch noch einmal, nur woanders.
   */
  p.push('-');
  p.push({ feld: { art: 'zahl', label: 'Lage x₀', einheit: 'm', schritt: 0.05,
                   wert: lageVon(t) },
           tun: (v) => aendern('tragwerkLage', { id, x: v }) });
  p.push({ text: `${tragwerkName(t, werte)} kopieren`, tun: () => tragwerkKopieren(id) });
  p.push({ text: 'Auf dieses zoomen', tun: () => zoomAufTragwerk(id) });
  if (tragwerksart(t).traeger && mastenFuer(werte, t).some(Boolean)) {
    p.push({ text: `${tragwerkName(t, werte)} entfernen, Masten als Einzelmasten behalten`,
             tun: () => aendern('jochZuEinzelmasten', id) });
  }
  if (alle.length > 1) {
    p.push({ text: 'Vom Blatt nehmen', warn: true,
             tun: () => aendern('tragwerkWeg', id) });
  }
  return p;
}

/**
 * >>> EIN TRAGWERK NOCH EINMAL, EINE JOCHLAENGE WEITER. <<<
 *
 * Weisung vom 5. September. Die Kopie traegt alles mit, was das Original
 * traegt - `tragwerkHinzu` bekommt den ganzen Satz als Vorlage. Nur die
 * LAGE ist eine andere: um seine eigene Laenge versetzt, damit die beiden
 * nicht uebereinanderstehen und man die Kopie sieht.
 *
 * Sie wird ausserdem zum GERECHNETEN - wer kopiert, will an der Kopie
 * weiterarbeiten, nicht am Original.
 */
function tragwerkKopieren(id) {
  handlung('Tragwerk kopieren', () => {
    const t = tragwerkeSortiert(werte).find((x) => x.id === id);
    if (!t) return;
    const satz = { ...tragwerkTeil(t) };
    delete satz.id;
    delete satz.pos;
    const L = Number(t.L) || 0;
    werte = tragwerkHinzu(werte, tragwerksart(t).key,
                          { ...satz, xLage: lageVon(t) + (L || 2) });
    mastNachfuehrenGlobal();
    neuRechnen();
  });
}

/**
 * NUR EINES ZEIGEN - alle anderen beiseite.
 *
 * Auf einem Querprofil mit sechs Abschnitten ist das der Griff, den man
 * staendig braucht und der sonst fuenf einzelne Klicks kostet. Das
 * angeklickte wird dabei zum gerechneten: wer es allein sehen will, will
 * daran arbeiten.
 */
function nurDiesesZeigen(id) {
  handlung('Nur dieses zeigen', () => {
    if ((werte.twId ?? 'T1') !== id) werte = tauscheAktives(werte, id);
    werte = { ...werte, ausgeblendet: false,
              weitere: (werte.weitere ?? []).map(
                (t) => ({ ...t, ausgeblendet: true })) };
    mastNachfuehrenGlobal();
    neuRechnen();
  });
}

/** Und alles wieder her. */
function alleZeigen() {
  handlung('Alle einblenden', () => {
    werte = { ...werte, ausgeblendet: false,
              weitere: (werte.weitere ?? []).map(
                (t) => ({ ...t, ausgeblendet: false })) };
    neuRechnen();
  });
}

/**
 * Die Einträge zu einem Masten.
 *
 * >>> WELCHES TRAGWERK GEMEINT IST, SAGT DER MAST. <<<
 *
 * Weisung vom 9. September: «ich versteh die logik nicht beim ein ausblenden
 * der masten.» Hier lag ein Teil davon: `twId` war IMMER das gerechnete
 * Tragwerk, gleichgültig, welchen Masten man angeklickt hatte. Am linken
 * Masten stand «Masten von … ausschalten» und traf das rechte Joch — bei
 * zwei gleichen Jochen einer Reihe sah man dem Menütext nicht einmal an,
 * dass er den falschen meint.
 *
 * Gemeint ist, wer den Masten TRÄGT. Bei einem geteilten das gerechnete,
 * wenn es ihn trägt — dieselbe Regel wie in der Leiste; sonst der erste.
 */
function kontextMast(mastId, twId) {
  const m = mastenVon(werte).find((x) => x.id === mastId);
  if (!m) return [];
  const traegt = m.traegt ?? [];
  const wer = traegt.includes(twId) ? twId : (traegt[0] ?? twId);
  const t = tragwerkeSortiert(werte).find((x) => x.id === wer)
         ?? tragwerkeVon(werte)[0];
  const p = [
    /*
     * >>> DAS FENSTER STATT DES SPRUNGS (16. September). <<<
     *
     * Weisung: «diese fenster auch für die maste anzeigen ... diese maske
     * auch über das kontextmenue aufrufbar machen.»
     *
     * Hier stand ein Sprung in die Seitenleiste - er waehlte den Masten an
     * und scrollte zum Profilfeld. Das ist ein Umweg ueber eine Liste, in
     * der man dann weitersucht; das Fenster zeigt, was den Masten ausmacht,
     * auf einmal.
     *
     * DER SPRUNG BLEIBT DARUNTER: was das Fenster nicht fuehrt - Fusspunkt,
     * Zuganker, Windbeiwerte - steht weiterhin nur dort.
     */
    { text: `${mastName(werte, m)} bearbeiten …`,
      tun: () => dialogMast(mastId) },
    { text: 'In der Seitenleiste bearbeiten', tun: () => {
      aendern('mastAktiv', mastId);
      zeigeFeld('mastProfil');
    } },
    { text: 'Auf den Masten zoomen',
      tun: () => { station = null; ansicht.station = null;
                   ansicht.zoomAuf(m.x, null, 2); } },
  ];
  /*
   * DIE MASTEN EINES TRAGWERKS AB- ODER ANSCHALTEN - nur dort, wo es einen
   * Traeger gibt. Beim Einzelmasten waere «Masten ausschalten» der Auftrag,
   * das Tragwerk abzuschaffen.
   */
  if (t && tragwerksart(t).traeger) {
    p.push('-');
    p.push({ text: `Masten von ${tragwerkPos(werte, t)} (${tragwerkName(t, werte)}) `
      + (t.mastVorhanden === false ? 'einschalten' : 'ausschalten'),
      tun: () => aendern('tragwerkMasten', t.id) });
  }
  return p;
}

/**
 * DIE EINTRAEGE ZU EINEM ANBAUTEIL - mit den Angaben, nicht nur mit Wegen
 * dorthin.
 *
 * Weisung vom 2. September: «beim kontextmenue bauteil parameter typ länge
 * ausrichtung direkt eintragen können.»
 *
 * >>> WELCHE DREI. <<<
 *
 *   TYP          das Bauteil des ersten Moduls. Es traegt die Baugruppe;
 *                was daran haengt, bleibt haengen.
 *   LAGE/HOEHE   am Joch die Stelle x, am Masten die Hoehe ueber Fundament.
 *                Dieselbe Zahl, die der Klick beim Setzen bestimmt hat -
 *                und die man danach auf den Zentimeter nachzieht.
 *   AUSRICHTUNG  auf welche Seite der Jochachse das Teil ausgreift. Bei
 *                einem Ausleger ist das die haeufigste Korrektur ueberhaupt:
 *                man setzt ihn und sieht, dass er zum falschen Gleis zeigt.
 *
 * Nicht mehr. Ein Kontextmenue mit zwoelf Feldern waere die Bauteilkarte,
 * nur an einer schlechteren Stelle - die steht weiter in der Seitenleiste,
 * und «bearbeiten» fuehrt hin.
 */
function kontextAnbauteil(i) {
  const a = (werte.anbauteile ?? [])[i];
  if (!a) return [];
  const setz = (fn) => {
    const liste = (werte.anbauteile ?? []).map((x, j) => (j === i ? fn(x) : x));
    setzeAnbauteile(liste);
  };
  const mod0 = (a.module ?? [])[0];
  const amMasten = a.ort === 'mastA' || a.ort === 'mastB';
  const p = [{ kopf: a.name ?? 'Bauteil' }];

  /*
   * DER TYP: was die Datenbank an dieser Stelle ueberhaupt zulaesst.
   *
   * Gefiltert nach der ROLLE des jetzigen Bauteils - ein Traeger laesst sich
   * gegen einen anderen Traeger tauschen, nicht gegen einen Fahrdraht. Sonst
   * stuende eine Baugruppe da, deren Glieder nicht mehr aufeinanderpassen,
   * und die Pruefungen meldeten es erst hinterher.
   */
  if (mod0) {
    let rolle = null;
    try { rolle = getFlBauteil(mod0.bauteil)?.rolle ?? null; } catch { /* unbekannt */ }
    const wahl = flBauteile(rolle).map((b2) => ({ wert: b2.id, text: b2.name ?? b2.id }));
    if (wahl.length > 1) {
      p.push({ feld: { art: 'auswahl', label: 'Typ', wert: mod0.bauteil,
                       optionen: wahl },
               tun: (v) => setz((x) => ({ ...x,
                 module: (x.module ?? []).map((m, k) => (k === 0
                   ? { ...m, bauteil: v } : m)) })) });
    }
  }

  // LAGE oder HOEHE - je nachdem, woran es haengt.
  p.push(amMasten
    ? { feld: { art: 'zahl', label: 'Höhe', einheit: 'm', schritt: 0.05,
                wert: a.hMast ?? 0 },
        tun: (v) => setz((x) => ({ ...x, hMast: v })) }
    : { feld: { art: 'zahl', label: 'Lage x', einheit: 'm', schritt: 0.1,
                wert: a.x ?? 0 },
        tun: (v) => setz((x) => ({ ...x, x: v })) });

  /*
   * DIE AUSRICHTUNG: das Vorzeichen der Ausladung.
   *
   * Sie steht als AUSWAHL da, nicht als Kreuzchen - «links / rechts» sagt,
   * was man sieht; «gespiegelt: ja» verlangt, dass man sich den
   * Ausgangszustand merkt. Gespiegelt wird die ganze Baugruppe, damit das,
   * was am Ausleger haengt, mitgeht.
   */
  const ausladung = (a.module ?? []).reduce(
    (m, x) => (Math.abs(x.x ?? 0) > Math.abs(m) ? (x.x ?? 0) : m), 0);
  if (Math.abs(ausladung) > 1e-9) {
    p.push({ feld: { art: 'auswahl', label: 'Ausrichtung',
                     wert: ausladung < 0 ? 'links' : 'rechts',
                     optionen: [{ wert: 'links', text: 'nach links' },
                                { wert: 'rechts', text: 'nach rechts' }] },
             tun: (v) => {
               const soll = v === 'links' ? -1 : 1;
               if (Math.sign(ausladung) === soll) return;
               setz((x) => ({ ...x, module: (x.module ?? []).map(
                 (m) => ({ ...m, x: -(m.x ?? 0) })) }));
             } });
  }

  p.push('-');
  p.push({ text: 'In der Seitenleiste bearbeiten', tun: () => zeigeAnbauteil(i) });
  p.push({ text: 'Auf das Bauteil zoomen', tun: () => ansicht.zeigeAnbauteil(i) });
  /*
   * ABSCHALTEN IST NICHT ENTFERNEN - dieselbe Trennung wie beim Tragwerk.
   * Ein abgeschaltetes Bauteil bleibt in der Liste und zaehlt nicht mit;
   * ein entferntes ist weg.
   */
  p.push({ text: a.aktiv === false ? 'Wieder mitrechnen' : 'Nicht mitrechnen',
           tun: () => setz((x) => ({ ...x, aktiv: x.aktiv === false })) });
  /*
   * KOPIEREN (Weisung, 5. September). Ein Bauteil steht selten allein - je
   * Gleis dasselbe, nur eine Spannweite weiter. Die Kopie sitzt einen
   * halben Meter daneben, damit sie nicht im Original verschwindet.
   */
  p.push({ text: 'Kopieren', tun: () => {
    const liste = [...(werte.anbauteile ?? [])];
    const kopie = { ...a, id: `AT-${Math.random().toString(36).slice(2, 8)}`,
                    module: (a.module ?? []).map((m) => ({ ...m })),
                    lasten: (a.lasten ?? []).map((l) => ({ ...l })) };
    if ((a.ort ?? 'joch') === 'joch') kopie.x = (Number(a.x) || 0) + 0.5;
    else kopie.hMast = (Number(a.hMast) || 0) + 0.5;
    liste.splice(i + 1, 0, kopie);
    setzeAnbauteile(liste);
  } });
  p.push({ text: 'Entfernen', warn: true,
           tun: () => setzeAnbauteile(
             (werte.anbauteile ?? []).filter((_, j) => j !== i)) });
  return p;
}

/**
 * Die Einträge auf leerem Grund.
 *
 * Hier steht, was das BILD betrifft und was man sonst unten links oder in
 * der Werkzeugleiste sucht. Kein zweites Hauptmenue - nur die drei Fahrten,
 * die man staendig braucht, und die beiden Handlungen, die im Modell
 * beginnen.
 */
function kontextGrund(k) {
  const p = [
    { text: 'Ganzes Querprofil zeigen',
      tun: () => { station = null; ansicht.station = null;
                   ansicht.ansichtZuruecksetzen(); zeichneAuswertung(); } },
    { text: 'Nur das gerechnete Tragwerk',
      tun: () => zoomAufTragwerk(werte.twId ?? 'T1') },
  ];
  if (letzte?.erg?.schnitt) {
    p.push({ text: 'Auf den Nachweisschnitt', tun: () => ansicht.zeigeSchnitt(2.5) });
  }
  /*
   * >>> EIN TRAGWERK DORT ANLEGEN, WO MAN HINZEIGT. <<<
   *
   * Weisung vom 3. September: «ich könnte mir persönlich ein ähnliches
   * vorgehen vorstellen wie bei den anbauteilen wo man diese in das modell
   * zieht oder per rechtsklick ein neues tragelement hinzufügen könnte.»
   *
   * Genau so. Der Knopf «+ Tragwerk» in der Leiste haengt das naechste
   * rechts an - der Regelfall einer Reihe. Wer es woanders haben will,
   * zeigt hin: ein Abfangjoch UEBER ein bestehendes Tragjoch etwa laesst
   * sich nur so setzen, denn es teilt sich dessen Strecke.
   *
   * Die Stelle wird auf den halben Meter gerastet - dieselbe Grobheit wie
   * beim Ziehen, aus demselben Grund: ein Klick ins Bild trifft keinen
   * Zentimeter.
   */
  if (Number.isFinite(k?.welt?.x)) {
    const wo = aufRaster(k.welt.x);
    p.push('-');
    p.push({ kopf: `Neues Tragwerk bei x = ${wo.toFixed(2)} m` });
    TRAGWERKSARTEN.forEach((a) => {
      p.push({ text: a.label,
               tun: () => aendern('tragwerkNeu', { art: a.key, xLage: wo }) });
    });
  }
  p.push('-');
  p.push({ text: setzen ? 'Bauteil setzen abbrechen' : 'Bauteil setzen',
           tun: () => (setzen ? setzenEnde() : setzenStarten()) });
  if (ansicht.zeichnung?.kalibrierung) {
    p.push({ text: 'Zeichnung verschieben', tun: () => bildSchiebenStarten() });
    p.push({ text: 'Zeichnung ausrichten', tun: () => ausrichtenStarten() });
  }
  if (tragwerkeSortiert(werte).some(versteckt)) {
    p.push('-');
    p.push({ text: 'Alle Tragwerke einblenden', tun: () => alleZeigen() });
  }
  return p;
}

/**
 * Der Rechtsklick im Modell.
 *
 * Die Ansicht meldet nur, WORAUF geklickt wurde; was dort angeboten wird,
 * entscheidet sich hier. So bleibt die Zeichenflaeche frei von Wissen ueber
 * Ausblenden und Bauteillisten.
 */
function kontextImModell(k) {
  const twId = k.twId ?? werte.twId ?? 'T1';
  let punkte;
  if (k.was === 'mast') {
    // Das Ende gehoert dem Tragwerk, an dem der Mast gezeichnet wurde.
    const t = tragwerkeSortiert(werte).find((x) => x.id === twId);
    const [a, b] = t ? mastenFuer(werte, t) : [null, null];
    const m = k.mastEnde === 'B' ? b : a;
    punkte = m ? kontextMast(m.id, twId) : [];
  } else if (k.was === 'anbauteil' && k.anbauteil !== null) {
    punkte = kontextAnbauteil(k.anbauteil);
  } else if (k.was === 'tragwerk') {
    punkte = kontextTragwerk(twId);
  } else {
    punkte = kontextGrund(k);
  }
  kontextZeigen(k.bei, punkte);
}

/* ===========================================================================
 * >>> DIE KAMERA FAEHRT IM BLATT, NICHT IM TRAGWERK. <<<
 * ===========================================================================
 *
 * Gefunden am 12. September beim Nachsehen der uebrigen Zoomwege.
 *
 * Die Szene steht im BLATT: jedes Tragwerk sitzt bei `lageVon(t)` und ist um
 * seine Anschlusshoehe angehoben. Eine Stelle aus der Eingabe - das x eines
 * Anbauteils, die Stelle eines Nachweisschnitts - steht dagegen in den
 * Koordinaten ihres EIGENEN Tragwerks, also zwischen 0 und L.
 *
 * Beim ersten Tragwerk ist das dasselbe: `lageVon` gibt dort 0. Beim zweiten
 * nicht - dann fuhr die Kamera um den Abstand der beiden Tragwerke daneben,
 * und im Bild stand die Nachbarposition. Kein Fehler, keine Meldung, nur eine
 * Kamera an der falschen Stelle.
 */
function blattVersatz() {
  const t = tragwerkeSortiert(werte).find((x) => x.aktiv)
         ?? tragwerkeSortiert(werte)[0];
  return t ? (Number(lageVon(t)) || 0) : 0;
}

/** Auf ein Tragwerk fahren - dieselbe Rechnung wie der Knopf «Teilübersicht». */
function zoomAufTragwerk(id) {
  const t = tragwerkeSortiert(werte).find((x) => x.id === id);
  if (!t) return;
  const x0 = lageVon(t);
  const L = tragwerksart(t).masten >= 2 ? (Number(t.L) || 0) : 0;
  station = null; ansicht.station = null;
  ansicht.zoomAuf(x0 + L / 2, null, Math.max(1, L / 2));
}

function dialog(titel, koerper, knoepfe, klasse = '') {
  const n = ui.el('ueberlagerung');
  const meins = ++dialogLauf;
  n.classList.remove('zu');
  n.innerHTML = `<div class="scrim"><div class="dialog${klasse ? ' ' + klasse : ''}">
    <div class="dialog-kopf"><h2>${esc(titel)}</h2>
      <button class="btn btn-mini" data-zu>Schliessen</button></div>
    <div class="dialog-koerper">${koerper}</div>
    <div class="dialog-fuss">${knoepfe}</div>
  </div></div>`;
  const zu = () => {
    if (dialogLauf !== meins) return;      // längst ein anderer da
    n.classList.add('zu');
    document.body.classList.remove('druck-handbuch');
    setTimeout(() => {
      if (dialogLauf !== meins) return;
      n.innerHTML = '';
      n.classList.remove('zu');
    }, DIALOG_ZU_MS);
  };
  // ALLE, nicht nur den ersten: der erste ist immer das Kreuz in der
  // Kopfzeile, und ein «Abbrechen» im Fuss blieb bisher ohne Wirkung.
  n.querySelectorAll('[data-zu]').forEach((b) => { b.onclick = zu; });
  n.querySelector('.scrim').onclick = (e) => { if (e.target.classList.contains('scrim')) zu(); };
  return { node: n, zu };
}

/* ===========================================================================
 * DER ZUGANKER ODER DIE DRUCKSTUETZE - IN EINEM FENSTER
 * ===========================================================================
 *
 * Weisung vom 11. September: «am besten in einem separatem modal wo
 * abgefragt wird welchen an welchem masten und wie angeordnet.»
 *
 * Drei Fragen, in dieser Reihenfolge, weil eine die naechste bestimmt:
 *
 *   1. AN WELCHEM MASTEN   ohne Masten gibt es keinen Anker
 *   2. WELCHER TYP         die Stuetze traegt Druck, das Seil nur Zug
 *   3. WIE ANGEORDNET      quer zum Gleis oder laengs, und auf welcher Seite
 *
 * >>> DIE ANORDNUNG IST DIE WICHTIGE FRAGE. <<<
 *
 * Ein Stab haelt nur die Richtung, in der er liegt. Steht er quer, waehrend
 * die grosse Kraft laengs zieht, haelt er rechnerisch NICHTS - und der
 * Nachweis sieht trotzdem gut aus, weil die Kraft am Mastfuss ankommt.
 * Deshalb stehen die vier Moeglichkeiten als KNOEPFE da, in den Worten des
 * Querprofils, und der Vorschlag folgt der Tragwerksart.
 * ========================================================================= */
function dialogAnker(mastId = null) {
  const masten = mastenVon(werte);
  if (!masten.length) {
    dialog('Zuganker / Druckstütze',
      `<p class="notiz">Auf diesem Querprofil steht kein Mast. Ein Anker
         hängt an einem Masten — ohne Masten gibt es ihn nicht.</p>`,
      '<button class="btn" data-zu>Schliessen</button>');
    return;
  }
  // Vorbelegt: der angeklickte, sonst der angewaehlte, sonst der erste.
  let id = mastId ?? werte.mastAktiv ?? gewaehlterMast(werte)?.id
           ?? masten[0].id;
  const holen = () => mastenVon(werte).find((m) => m.id === id) ?? masten[0];
  /*
   * DER ENTWURF STEHT IM FENSTER, NICHT IM DATENSATZ. Geschrieben wird erst
   * beim «Setzen» - sonst haette ein abgebrochener Dialog den Anker schon
   * angelegt, und «Abbrechen» hiesse nichts.
   */
  const vorhanden = holen().anker ?? null;
  let e = { ...ANKER_STANDARD, richtung: ankerRichtungVor(werte),
            ...(vorhanden ?? {}) };
  if (!e.typ) e.typ = ankerTypen()[0]?.id ?? '';

  const LAGEN = [
    { r: 'y', s: 'plus',  t: 'Längs · vorn',
      k: 'in Gleisrichtung, Fundament auf der vorderen Seite' },
    { r: 'y', s: 'minus', t: 'Längs · hinten',
      k: 'in Gleisrichtung, Fundament auf der hinteren Seite' },
    { r: 'x', s: 'plus',  t: 'Quer · vom Gleis weg',
      k: 'in der Jochachse, Fundament vom Gleis weg' },
    { r: 'x', s: 'minus', t: 'Quer · zum Gleis hin',
      k: 'in der Jochachse, Fundament zum Gleis hin' },
  ];

  const folgeText = () => {
    const L = Math.sqrt((e.h || 0) ** 2 + (e.a || 0) ** 2);
    const al = (e.a > 0) ? (Math.atan2(e.h || 0, e.a) * 180) / Math.PI : 0;
    return `Daraus: Länge <b>${L.toFixed(2)} m</b> · Neigung gegen die `
      + `Waagrechte <b>${al.toFixed(1)}°</b>. Je flacher der Stab, desto `
      + 'wirksamer hält er — und desto länger wird er.';
  };

  const koerper = () => {
    const m = holen();
    const seil = (() => {
      try { return !ankerTraegtDruck(e.typ); } catch { return false; }
    })();
    return `
    <div class="feld"><label for="dlg-ank-mast">An welchem Masten</label>
      <select id="dlg-ank-mast">${mastenVon(werte).map((x, j) =>
        `<option value="${esc(x.id)}"${x.id === m.id ? ' selected' : ''}
          >M${j + 1} · ${esc(x.profil ?? 'ohne Profil')} · x ${
            x.x.toFixed(2)} m${x.anker?.typ
              ? ` — trägt schon ${esc(x.anker.typ)}` : ''}</option>`
        ).join('')}</select>
      <small class="hinweis">Der Stab hängt am Masten, nicht am Querprofil.${
        m.anker?.typ
          ? ' Dieser Mast trägt bereits einen — «Setzen» ersetzt ihn.' : ''}
      </small></div>

    <div class="feld"><label for="dlg-ank-typ">Welcher Typ</label>
      <select id="dlg-ank-typ">${ankerTypen().map((t2) =>
        `<option value="${esc(t2.id)}"${t2.id === e.typ ? ' selected' : ''}
          >${esc(t2.name)} · ${t2.art === 'seil' ? 'nur Zug'
            : `bis ${(t2.laengeMax ?? 0).toFixed(2)} m`}</option>`).join('')}
      </select>
      <small class="hinweis">${seil
        ? 'Ein Seilanker trägt nur ZUG — auf der Druckseite hängt er durch '
          + 'und trägt nichts.'
        : 'Die Stütze trägt Zug UND Druck; ihre Druckkraft begrenzt das '
          + 'Knicken, also ihre Länge.'}</small></div>

    <div class="feld"><label>Wie angeordnet</label>
      <div class="ank-lagen" role="radiogroup" aria-label="Anordnung">
        ${LAGEN.map((l) => {
          const an = l.r === e.richtung && l.s === e.seite;
          return `<button type="button" class="btn btn-mini${an ? ' an' : ''}"
            data-ank-lage="${l.r}|${l.s}" role="radio" aria-checked="${an}"
            title="${esc(l.k)}">${esc(l.t)}</button>`;
        }).join('')}
      </div>
      <small class="hinweis">Der Stab hält nur die Richtung, in der er
        liegt. Am Abfangjoch ist die grosse Kraft der Leiterzug in
        GLEISRICHTUNG; ein Anker quer dazu hält davon nichts.</small></div>

    <div class="feld"><label for="dlg-ank-h">Anschlusshöhe am Masten</label>
      <input id="dlg-ank-h" type="number" step="0.05" min="0.5" max="20"
             value="${(e.h ?? 0).toFixed(2)}">
      <small class="hinweis">m über dem Mastfuss.</small></div>
    <div class="feld"><label for="dlg-ank-a">Abstand des Fundaments</label>
      <input id="dlg-ank-a" type="number" step="0.05" min="0.5" max="20"
             value="${(e.a ?? 0).toFixed(2)}">
      <small class="hinweis">m waagrecht vom Mastfuss.</small></div>

    ${!seil ? `<div class="feld">
      <label for="dlg-ank-bef">Befestigung an Fundament und Mast</label>
      <select id="dlg-ank-bef">${ANKER_BEFESTIGUNGEN.map((b) =>
        `<option value="${esc(b.key)}"${b.key === e.befestigung
          ? ' selected' : ''}>${esc(b.label)}</option>`).join('')}</select>
      <small class="hinweis">Auf ZUG begrenzt nicht die Stütze, sondern die
        Befestigung.</small></div>` : ''}

    ${/*
       * DIE BEIDEN FOLGEGROESSEN stehen da, weil man in ihnen denkt: «der
       * anker hat einen winkel von ca 60°» (Weisung, 11. September). Sie
       * sind KEINE Eingabe - sie folgen aus Hoehe und Abstand, und zwei
       * Speicherorte fuer dieselbe Groesse laufen auseinander.
       */''}
    <p class="notiz" id="dlg-ank-folge">${folgeText()}</p>`;
  };

  const d = dialog('Zuganker / Druckstütze', koerper(),
    `${vorhanden ? '<button class="btn btn-fail" data-ank-weg>Entfernen</button>'
                 : ''}
     <button class="btn" data-zu>Abbrechen</button>
     <button class="btn btn-acc" data-ank-ok>Setzen</button>`);

  const neu = () => {
    d.node.querySelector('.dialog-koerper').innerHTML = koerper();
    verdrahte();
  };
  function verdrahte() {
    const n = d.node;
    n.querySelector('#dlg-ank-mast').onchange = (ev) => {
      id = ev.target.value;
      // Der neue Mast bringt seinen eigenen Anker mit, wenn er einen hat.
      const v = holen().anker;
      e = { ...ANKER_STANDARD, richtung: ankerRichtungVor(werte),
            ...(v ?? {}), typ: v?.typ ?? e.typ };
      neu();
    };
    n.querySelector('#dlg-ank-typ').onchange = (ev) => {
      e = { ...e, typ: ev.target.value };
      neu();
    };
    n.querySelectorAll('[data-ank-lage]').forEach((b) => {
      b.onclick = () => {
        const [r, s] = b.dataset.ankLage.split('|');
        e = { ...e, richtung: r, seite: s };
        neu();
      };
    });
    /*
     * DIE ZAHLENFELDER FUEHREN NUR DIE FOLGEZEILE NACH, nicht den ganzen
     * Koerper: ein Neuaufbau naehme mitten im Tippen den Fokus, und aus
     * «7.7» wuerde nie «7.79».
     */
    const zahl = (sel, feld) => {
      const el = n.querySelector(sel);
      if (!el) return;
      el.oninput = () => {
        const v = parseFloat(el.value);
        if (!Number.isFinite(v)) return;
        e = { ...e, [feld]: v };
        const f = n.querySelector('#dlg-ank-folge');
        if (f) f.innerHTML = folgeText();
      };
    };
    zahl('#dlg-ank-h', 'h');
    zahl('#dlg-ank-a', 'a');
    const bef = n.querySelector('#dlg-ank-bef');
    if (bef) bef.onchange = () => { e = { ...e, befestigung: bef.value }; };
    const weg = n.querySelector('[data-ank-weg]');
    if (weg) weg.onclick = () => {
      werte = setzeMastAnker(werte, id, null);
      werte = { ...werte, mastAktiv: id };
      d.zu();
      neuRechnen();
    };
    n.querySelector('[data-ank-ok]').onclick = () => {
      werte = setzeMastAnker(werte, id, { ...e });
      /*
       * DER GESETZTE MAST WIRD ANGEWAEHLT: die Felder der Maske zeigen dann
       * denselben Anker, und wer nach dem Schliessen etwas nachjustiert,
       * aendert den, den er eben gesetzt hat.
       */
      werte = { ...werte, mastAktiv: id };
      d.zu();
      neuRechnen();
    };
  }
  verdrahte();
}

/* ===========================================================================
 * DAS TRAGWERK - IN EINEM FENSTER
 * ===========================================================================
 *
 * Weisung vom 11. September: «fuer die restlichen elemente eine gleiches
 * modal machen wie beim anker, dies beim erstellen eines tragweks einblenden
 * und wenn man es anklickt.»
 *
 * >>> DIESELBEN DREI FRAGEN WIE BEIM ANKER. <<<
 *
 *   1. WELCHE ART      Tragjoch, Einzelmast, Tragausleger, Abfangjoch
 *   2. WELCHER TYP     das Sortiment haengt an der Art
 *   3. WO UND WIE LANG Lage auf dem Querprofil, Stuetzweite
 *
 * Bis hierher gab es zwei Wege und keinen ganzen: «+ Tragwerk» legte eines
 * mit Vorgabewerten an, und danach suchte man in der Maske die vier Felder
 * zusammen. Die Art liess sich ueberhaupt erst seit heute wechseln, und auch
 * das nur ueber das Kontextmenue.
 *
 * >>> BEIM ANLEGEN UND BEIM ANKLICKEN. <<<
 *
 * Angelegt wird erst beim «Setzen» - ein abgebrochener Dialog hinterlaesst
 * kein halbes Tragwerk. Beim Anklicken eines BESTEHENDEN oeffnet er sich mit
 * dessen Werten; der erste Klick waehlt es an, der zweite oeffnet das
 * Fenster. So bleibt das schnelle Umschalten zwischen zwei Tragwerken, was
 * es war, und die Bearbeitung ist einen Klick entfernt.
 * ========================================================================= */
/* ===========================================================================
 * >>> DAS FENSTER DES MASTEN. <<<
 * ===========================================================================
 *
 * Weisung vom 16. September: «diese fenster auch für die maste anzeigen.»
 *
 * Dasselbe Muster wie beim Tragwerk: was ein Bauteil AUSMACHT, steht in
 * einem Fenster beisammen - nicht verteilt über eine Seitenleiste, in der
 * man scrollt. Beim Masten sind das fünf Zahlen: Profil, Stegrichtung,
 * Anschlusshöhe, Gesamtlänge und die Stelle auf dem Querprofil.
 *
 * >>> WAS NICHT HINEINGEHOERT. <<<
 *
 * Alles, was einen Regelwert hat, den man selten verlässt: Fusspunkt,
 * Zuganker, Windbeiwerte, die zweite Mastreihe. Sie bleiben in der
 * Seitenleiste - dieselbe Regel wie in der Karte Anbauteile, nur hier
 * strenger, weil ein Fenster kein Scrollen verträgt.
 *
 * >>> DIE HOEHE IST DIESELBE ZAHL WIE IM TRAGWERKSFENSTER. <<<
 *
 * Dort heisst sie «Anschlusshöhe, gemessen an M1», hier gehört sie dem
 * Masten, den man angeklickt hat. Zwei Fenster auf dieselbe Zahl - deshalb
 * lesen und schreiben beide über denselben Weg (`mastAktiv`, dann `mastH`).
 * ========================================================================= */
function dialogMast(mastId) {
  const alle = mastenVon(werte);
  const m = alle.find((x) => x.id === mastId) ?? alle[0];
  if (!m) return null;
  let e = {
    profil: m.profil ?? werte.mastProfil ?? 'HEB 240',
    steg: m.steg ?? werte.mastSteg ?? 'jochachse',
    H: Number(m.H) > 0 ? Number(m.H) : (Number(werte.mastH) || 7.5),
    laenge: Number(m.laenge) > 0 ? Number(m.laenge)
                                 : (Number(werte.mastLaenge) || 0),
    x: Number(m.x) || 0,
  };
  /*
   * DIE LAENGE FOLGT DER HOEHE, solange niemand sie eigens setzt: seit dem
   * 5. September ist die Vorgabe H + 0.50 m. Das Feld zeigt deshalb, was
   * gilt - und sagt daneben, woher es kommt.
   */
  /*
   * EIN MAST, DER NUR EINZELMASTEN TRAEGT, hat keine Anschlusshoehe
   * (Weisung, 18. September) - es schliesst kein Joch an. Er rechnet mit
   * seiner Laenge; ohne eigene Angabe mit der, die der Kern nimmt.
   */
  const traegt = (m.traegt ?? []).map((id) => tragwerkeSortiert(werte)
    .find((t) => t.id === id)).filter(Boolean);
  const nurEinzel = traegt.length > 0
    && traegt.every((t) => tragwerksart(t).key === 'einzelmast');
  const laengeVorgabe = () => (nurEinzel
    ? einzelmastLaenge({ ...werte, mastH: e.H, mastLaenge: 0 })
    : Math.round((e.H + 0.5) * 100) / 100);

  const koerper = () => `
    <div class="feld"><label for="dlg-m-profil">Mastprofil</label>
      <select id="dlg-m-profil">${mastprofile().map((p) =>
        `<option value="${esc(p.name)}"${p.name === e.profil ? ' selected' : ''}
          >${esc(p.name)}</option>`).join('')}</select>
      <small class="hinweis">Er bestimmt die Drehfeder am Jochende und trägt
        den Nachweis über die ganze Höhe.</small></div>

    <div class="feld"><label>Stegrichtung</label>
      <div class="ank-lagen" role="radiogroup" aria-label="Stegrichtung">
        ${STEGRICHTUNGEN.map((s) => `
          <button type="button" class="btn btn-mini${
              s.key === e.steg ? ' an' : ''}"
            data-m-steg="${esc(s.key)}" role="radio"
            aria-checked="${s.key === e.steg}"
            title="${esc(s.kurz ?? s.label)}">${esc(s.label)}</button>`).join('')}
      </div>
      <small class="hinweis">Welche Achse quer zum Gleis steht — sie
        entscheidet, ob die starke oder die schwache Achse das Joch
        hält.</small></div>

    ${nurEinzel ? '' : `<div class="feld"><label for="dlg-m-h">Anschlusshöhe</label>
      <input id="dlg-m-h" type="number" step="0.1" min="2" max="20"
             value="${e.H.toFixed(2)}">
      <small class="hinweis">m · über dem Mastfuss. Dieselbe Zahl steht im
        Fenster des Tragwerks.</small></div>`}

    <div class="feld"><label for="dlg-m-l">Mastlänge gesamt</label>
      <input id="dlg-m-l" type="number" step="0.1" min="2" max="25"
             value="${(e.laenge > 0 ? e.laenge : laengeVorgabe()).toFixed(2)}">
      <small class="hinweis">${nurEinzel
        ? 'm · Fuss bis Kopf. Der Einzelmast rechnet mit dieser Länge; die '
          + 'Anbauteile stehen mit ihrer Höhe über Fundament.'
        : `m · Fuss bis Kopf. Ohne eigene Angabe gilt
        Anschlusshöhe + 0.50 m, hier also
        ${laengeVorgabe().toFixed(2)} m.`}</small></div>

    <div class="feld"><label for="dlg-m-x">Lage auf dem Querprofil</label>
      <input id="dlg-m-x" type="number" step="0.05" value="${e.x.toFixed(2)}">
      <small class="hinweis">m · quer zum Gleis, ab dem Nullpunkt der
        Zeichnung.${(m.traegt ?? []).length > 1
          ? ' Dieser Mast trägt zwei Tragwerke — die Stelle verschiebt beide.'
          : ''}</small></div>

    <p class="notiz">Fusspunkt, Zuganker und Windbeiwerte bleiben in der
      Seitenleiste — sie haben Regelwerte, die man selten verlässt.</p>`;

  const d = dialog(`${mastName(werte, m)} bearbeiten`, koerper(),
    `<button class="btn" data-zu>Abbrechen</button>
     <button class="btn btn-acc" data-m-ok>Übernehmen</button>`);

  const neu = () => {
    d.node.querySelector('.dialog-koerper').innerHTML = koerper();
    verdrahte();
  };
  function verdrahte() {
    const n = d.node;
    n.querySelectorAll('[data-m-steg]').forEach((b) => {
      b.onclick = () => {
        if (b.dataset.mSteg === e.steg) return;
        e = { ...e, steg: b.dataset.mSteg };
        neu();
      };
    });
    const s = n.querySelector('#dlg-m-profil');
    if (s) s.onchange = () => { e = { ...e, profil: s.value }; };
    const zahl = (sel, feld) => {
      const el = n.querySelector(sel);
      if (!el) return;
      el.oninput = () => {
        const v = Number(el.value);
        if (Number.isFinite(v)) e = { ...e, [feld]: v };
      };
    };
    zahl('#dlg-m-h', 'H');
    zahl('#dlg-m-l', 'laenge');
    zahl('#dlg-m-x', 'x');
    n.querySelector('[data-m-ok]').onclick = () => {
      d.zu();
      /*
       * ERST DEN MASTEN WAEHLEN, DANN SCHREIBEN. `mastProfil`, `mastH` und
       * die uebrigen gehoeren dem GEWAEHLTEN Masten - ohne diesen Schritt
       * landeten sie bei einem anderen.
       */
      aendern('mastAktiv', m.id);
      if (e.profil !== (m.profil ?? werte.mastProfil)) {
        aendern('mastProfil', e.profil);
      }
      if (e.steg !== (m.steg ?? werte.mastSteg)) aendern('mastSteg', e.steg);
      if (Math.abs(e.H - (Number(m.H) || Number(werte.mastH) || 0)) > 1e-9) {
        aendern('mastH', e.H);
      }
      if (Number.isFinite(e.laenge) && e.laenge > 0
          && Math.abs(e.laenge - (Number(m.laenge) || 0)) > 1e-9) {
        aendern('mastLaenge', e.laenge);
      }
      if (Math.abs(e.x - (Number(m.x) || 0)) > 1e-9) aendern('mastX', e.x);
    };
  }
  verdrahte();
  return d;
}

/** Der erste Mast eines Tragwerks - an ihm haengt die Anschlusshoehe. */
function erstenMastVon(t) {
  if (!t?.id) return null;
  return mastenVon(werte).find((m) => (m.traegt ?? []).includes(t.id)) ?? null;
}

/**
 * Die Anschlusshoehe eines Tragwerks, gelesen an seinem ersten Masten.
 *
 * Steht sie dort nicht, gilt die des Satzes - so liest es die Maske auch
 * (`amMast('H', 'mastH')` in ui.schema.js). Zwei Leseregeln fuer dieselbe
 * Zahl waeren zwei Gelegenheiten, sich zu irren.
 */
function hoeheVonM1(t) {
  const m = erstenMastVon(t);
  const h = Number(m?.H);
  return Number.isFinite(h) && h > 0 ? h : (Number(werte.mastH) || 7.5);
}

function dialogTragwerk(id = null, artVor = null) {
  const neuesTragwerk = !id;
  const alle = tragwerkeSortiert(werte);
  const t = id ? alle.find((x) => x.id === id) : null;
  /*
   * DER ENTWURF LEBT IM FENSTER. Beim bestehenden Tragwerk kommen die Werte
   * aus ihm, beim neuen aus dem zuletzt angewaehlten - wer ein zweites Joch
   * setzt, will meistens dasselbe noch einmal.
   */
  const vorlage = t ?? alle.find((x) => x.id === (werte.twId ?? 'T1')) ?? alle[0];
  let e = {
    // Die angeklickte Art des Menues gewinnt - sie ist die Absicht des
    // Klicks; die Vorlage liefert nur, was sie sonst noch mitbringt.
    art: artVor ?? tragwerksart(vorlage ?? werte).key,
    typ: vorlage?.typ ?? werte.typ,
    abfangTyp: vorlage?.abfangTyp ?? werte.abfangTyp,
    L: Number(vorlage?.L ?? werte.L) || 20,
    x0: neuesTragwerk ? (lageVon(vorlage) || 0) + (Number(vorlage?.L) || 0)
                      : lageVon(t),
    /* =====================================================================
     * >>> DIE ANSCHLUSSHOEHE GEHOERT INS FENSTER. <<<
     * =====================================================================
     *
     * Weisung vom 16. September: «bei den jochen noch die anschlusshöhe
     * (bezogen auf m1) ergänzen als feld.»
     *
     * Sie ist die dritte Zahl, die ein Joch beschreibt - Typ, Stützweite,
     * Höhe -, und sie stand als einzige nicht hier. Wer ein Joch einrichtet,
     * musste dafür in die Seitenleiste wechseln.
     *
     * BEZOGEN AUF M1, wie die Weisung sagt: die Höhe gehört dem MASTEN,
     * nicht dem Tragwerk, und ein Joch hat zwei davon. Der erste ist der,
     * an dem man sie ansetzt; der zweite folgt ihm, solange er nicht
     * eigens verstellt ist. Das Feld sagt das auch.
     */
    H: hoeheVonM1(t ?? vorlage),
  };
  /*
   * KOMMT DIE ART AUS DEM MENUE, bringt sie ihr eigenes Sortiment mit - die
   * Vorlage daneben ist vielleicht ein Tragjoch, und «J90» steht in keiner
   * Abfangjoch-Liste.
   */
  if (artVor) {
    const v = artVorgabe(artVor, { ...werte, L: e.L });
    if (v.abfangTyp) e.abfangTyp = v.abfangTyp;
    if (Number.isFinite(v.L)) e.L = v.L;
  }

  const artDef = () => TRAGWERKSARTEN.find((a) => a.key === e.art)
                    ?? TRAGWERKSARTEN[0];
  const istAbfang = () => e.art === 'abfangjoch';

  /*
   * DIE LAENGE GIBT ES NUR, WO ES EINEN TRAEGER GIBT. Ein Einzelmast hat
   * keine Stuetzweite; ein Feld dafuer waere eine Frage ohne Gegenstand.
   */
  const mitLaenge = () => artDef().masten >= 2;

  /** Der Laengenbereich des gewaehlten Typs - er begrenzt die Eingabe. */
  const bereich = () => {
    if (istAbfang()) {
      try {
        const a = getAbfangjoch(e.abfangTyp);
        const b = abfangLaengenbereich(a);
        return { min: b.min, max: b.max, text: b.text };
      } catch { return { min: 5, max: 35, text: '' }; }
    }
    try {
      const j = getTragjoch(e.typ);
      const ls = (j?.laengen ?? []).map(Number).filter(Number.isFinite);
      if (ls.length) {
        return { min: Math.min(...ls), max: Math.max(...ls),
                 text: `${Math.min(...ls).toFixed(1)}–${Math.max(...ls).toFixed(1)} m` };
      }
    } catch { /* ohne Sortiment freie Laenge */ }
    return { min: 4, max: 40, text: '' };
  };

  const koerper = () => {
    const b = bereich();
    const typListe = istAbfang()
      ? abfangjoche().map((a) => ({ wert: a.typ,
          text: `${a.typ} · ${a.profil} · ${abfangLaengenbereich(a).text}` }))
      : tragjoche().map((j) => ({ wert: j.typ,
          text: `${j.typ} · jd ${j.jd} mm` }));
    const typJetzt = istAbfang() ? e.abfangTyp : e.typ;
    return `
    <div class="feld"><label>Welche Art</label>
      <div class="ank-lagen" role="radiogroup" aria-label="Tragwerksart">
        ${TRAGWERKSARTEN.map((a) => `
          <button type="button" class="btn btn-mini${
              a.key === e.art ? ' an' : ''}"
            data-tw-art="${esc(a.key)}" role="radio"
            aria-checked="${a.key === e.art}"
            title="${esc(a.kurz)}">${esc(a.label)}</button>`).join('')}
      </div>
      <small class="hinweis">${esc(artDef().kurz)}</small></div>

    ${artDef().traeger ? `<div class="feld">
      <label for="dlg-tw-typ">Welcher Typ</label>
      <select id="dlg-tw-typ">${typListe.map((o) =>
        `<option value="${esc(o.wert)}"${o.wert === typJetzt ? ' selected' : ''}
          >${esc(o.text)}</option>`).join('')}</select>
      <small class="hinweis">${istAbfang()
        ? 'Das Abfangjoch nimmt den Leiterzug auf — zwei Gurte nebeneinander.'
        : 'Das Tragjoch trägt Gewicht, Schnee und Wind — vier Winkelgurte.'}
      </small></div>` : ''}

    ${mitLaenge() ? `<div class="feld">
      <label for="dlg-tw-l">Stützweite</label>
      <input id="dlg-tw-l" type="number" step="0.5" min="${b.min}"
             max="${b.max}" value="${e.L.toFixed(2)}">
      <small class="hinweis">m${b.text
        ? ` · das Sortiment führt ${esc(b.text)}` : ''}</small></div>` : ''}

    ${artDef().masten >= 1 ? `<div class="feld">
      <label for="dlg-tw-h">Anschlusshöhe</label>
      <input id="dlg-tw-h" type="number" step="0.1" min="2" max="20"
             value="${e.H.toFixed(2)}">
      <small class="hinweis">m · über dem Mastfuss, gemessen an
        ${esc(erstenMastVon(t)?.id ?? 'M1')}. Der zweite Mast folgt ihr,
        solange er nicht eigens verstellt ist.</small></div>` : ''}

    <div class="feld"><label for="dlg-tw-x">Lage auf dem Querprofil</label>
      <input id="dlg-tw-x" type="number" step="0.05" value="${e.x0.toFixed(2)}">
      <small class="hinweis">m · quer zum Gleis, in der Jochachse, ab dem
        Nullpunkt der Zeichnung.</small></div>

    <p class="notiz">${neuesTragwerk
      ? 'Profile, Bleche und Anbauteile übernimmt das neue Tragwerk vom '
        + 'zuletzt gewählten — sie lassen sich danach in der Maske ändern.'
      : 'Profile, Bleche, Masten und Anbauteile bleiben, wie sie sind. Ein '
        + 'Wechsel der ART setzt Typ und Länge auf das Sortiment der neuen '
        + 'Art — «J90» steht in keiner Abfangjoch-Liste.'}</p>`;
  };

  const d = dialog(neuesTragwerk ? 'Neues Tragwerk'
                                 : `${tragwerkName(t, werte)} bearbeiten`,
    koerper(),
    `<button class="btn" data-zu>Abbrechen</button>
     <button class="btn btn-acc" data-tw-ok>${
       neuesTragwerk ? 'Setzen' : 'Übernehmen'}</button>`);

  const neu = () => {
    d.node.querySelector('.dialog-koerper').innerHTML = koerper();
    verdrahte();
  };
  function verdrahte() {
    const n = d.node;
    n.querySelectorAll('[data-tw-art]').forEach((b) => {
      b.onclick = () => {
        if (b.dataset.twArt === e.art) return;
        e = { ...e, art: b.dataset.twArt };
        /*
         * DER TYP MUSS ZUR ART PASSEN. «J90» steht in keiner
         * Abfangjoch-Liste; der Browser zeigte sonst den ersten Eintrag,
         * waehrend im Entwurf etwas anderes stuende - dieselbe Falle, die
         * beim Anlegen schon einmal zugeschnappt ist.
         */
        const v = artVorgabe(e.art, { ...werte, L: e.L });
        if (v.abfangTyp) e.abfangTyp = v.abfangTyp;
        if (Number.isFinite(v.L)) e.L = v.L;
        const b2 = bereich();
        e.L = Math.min(Math.max(e.L, b2.min), b2.max);
        neu();
      };
    });
    const typ = n.querySelector('#dlg-tw-typ');
    if (typ) typ.onchange = () => {
      if (istAbfang()) e.abfangTyp = typ.value; else e.typ = typ.value;
      const b2 = bereich();
      e.L = Math.min(Math.max(e.L, b2.min), b2.max);
      neu();
    };
    const zahl = (sel, feld) => {
      const el = n.querySelector(sel);
      if (!el) return;
      el.oninput = () => {
        const v = parseFloat(el.value);
        if (Number.isFinite(v)) e = { ...e, [feld]: v };
      };
    };
    zahl('#dlg-tw-l', 'L');
    zahl('#dlg-tw-h', 'H');
    zahl('#dlg-tw-x', 'x0');
    n.querySelector('[data-tw-ok]').onclick = () => {
      d.zu();
      if (neuesTragwerk) {
        aendern('tragwerkNeu', { art: e.art, xLage: e.x0 });
        // Typ und Laenge danach setzen: `tragwerkHinzu` bringt die Vorgabe
        // der Art mit, und die soll der Entwurf ueberschreiben.
        if (artDef().traeger) {
          aendern(istAbfang() ? 'abfangTyp' : 'typ',
                  istAbfang() ? e.abfangTyp : e.typ);
        }
        if (mitLaenge()) aendern('L', e.L);
        return;
      }
      if (tragwerksart(t).key !== e.art) {
        aendern('tragwerkArt', { id, art: e.art });
      } else if ((werte.twId ?? 'T1') !== id) {
        werte = tauscheAktives(werte, id);
      }
      if (artDef().traeger) {
        aendern(istAbfang() ? 'abfangTyp' : 'typ',
                istAbfang() ? e.abfangTyp : e.typ);
      }
      if (mitLaenge()) aendern('L', e.L);
      aendern('tragwerkLage', { id, x: e.x0 });
      /*
       * DIE HOEHE ZULETZT, und ueber den MASTEN: `mastH` gehoert dem
       * gewaehlten Masten, nicht dem Tragwerk. Erst M1 anwaehlen, dann
       * schreiben - derselbe Weg, den die Seitenleiste geht.
       */
      const m1 = erstenMastVon(t);
      if (m1 && Number.isFinite(e.H) && Math.abs(e.H - hoeheVonM1(t)) > 1e-9) {
        aendern('mastAktiv', m1.id);
        aendern('mastH', e.H);
      }
    };
  }
  verdrahte();
}

function dialogSpeichern() {
  const d = dialog('In Ablage speichern', `
    <div class="feld"><label for="d-projekt">Projekt</label>
      <input id="d-projekt" type="text" value="${esc(projekt.projekt)}"
             list="d-projekte" placeholder="z. B. Bahnhof Musterstadt">
      <datalist id="d-projekte"></datalist></div>
    <div class="feld"><label for="d-name">Bezeichnung</label>
      <input id="d-name" type="text" value="${esc(projekt.name)}"
             placeholder="z. B. Joch Achse 12"></div>
    <div class="feld"><label for="d-bem">Bemerkung</label>
      <textarea id="d-bem" rows="3">${esc(projekt.bemerkung ?? '')}</textarea></div>
    <p class="notiz">Die Ablage liegt im Browser dieses Geräts. Für die
      Aufbewahrung den Stand zusätzlich als Datei ausleiten.</p>`,
    `<button class="btn" data-neu>Als neuen Eintrag</button>
     <button class="btn btn-acc" data-ok>${projekt.id ? 'Überschreiben' : 'Speichern'}</button>`);
  // Die vorhandenen Projekte zur Auswahl - getippt werden darf trotzdem.
  store.projektNamen().then((namen) => {
    const dl = ui.el('d-projekte');
    if (dl) dl.innerHTML = namen.map((p) => `<option value="${esc(p)}">`).join('');
  }).catch(() => {});

  const sichere = async (neu) => {
    projekt = {
      ...projekt,
      name: ui.el('d-name').value.trim() || 'Ohne Namen',
      projekt: ui.el('d-projekt').value.trim(),
    };
    const s = await sichereAktuell(neu, ui.el('d-bem').value);
    d.zu();
    meldeImBalken(`Gespeichert: ${s.projekt ? `${s.projekt} · ` : ''}${s.name}`);
    if (schubladeOffen) zeichneSchublade();
  };
  d.node.querySelector('[data-ok]').onclick = () => sichere(false);
  d.node.querySelector('[data-neu]').onclick = () => sichere(true);
}

/**
 * >>> DIE VORLAGE WIRD GEWAEHLT, NICHT VORAUSGESETZT. <<<
 *
 * Weisung vom 4. September. Hier stand ein `confirm` mit einer einzigen
 * Antwort — und die hiess immer Tragjoch. Jetzt stehen die vier
 * Tragwerksarten zur Wahl; die Warnung vor dem Verlust steht daneben, wo sie
 * hingehört, statt in einem Kasten des Browsers.
 */
function neuesTragjoch() {
  const d = dialog('Neues Tragwerk', `
    <p>Womit soll begonnen werden? Der bisherige Stand geht verloren, wenn er
       nicht gespeichert ist.</p>
    <div class="feld"><label>Vorlage</label>
      ${TRAGWERKSARTEN.map((a, i) => `<label class="schalter">
        <input type="radio" name="vorlage" value="${esc(a.key)}"${i ? '' : ' checked'}>
        <span><b>${esc(a.label)}</b> — ${esc(a.kurz)}</span></label>`).join('')}
    </div>`,
    '<button class="btn btn-acc" data-los>Beginnen</button>');
  d.node.querySelector('[data-los]').onclick = () => {
    const art = d.node.querySelector('input[name="vorlage"]:checked').value;
    d.zu();
    beginneNeu(art);
  };
}

function beginneNeu(art) {
  const bez = TRAGWERKSARTEN.find((a) => a.key === art)?.label ?? 'Tragjoch';
  werte = frisch(art);
  try {
    const b = localStorage.getItem(BEARBEITER);
    if (b) werte.bearbeiter = b;
  } catch { /* kein Speicher */ }
  projekt = { id: null, name: `Neues ${bez}`, projekt: projekt.projekt };
  station = null;
  // Die Zeichnung des vorigen Tragwerks geht mit ihm - sie zeigte ein
  // anderes Bauwerk und wäre hinter dem neuen schlicht falsch.
  ansicht.zeichnung = null;
  kalibrierenEnde();
  neuRechnen();
  // Ein frisch begonnenes Tragwerk hat nichts Ungesichertes - es ist nur
  // noch nicht in der Ablage, und das sagt der Titel des Knopfes.
  markiereGesichert();
  zeichneModellWerkzeuge();
  ansicht.ganzesJoch();
}

/* ===========================================================================
 * EINE HANDLUNG, DIE NICHT GEHT, SAGT ES.
 *
 * Gemessen am 2. September: der Excel-Knopf am Einzelmasten brach mit
 * «Cannot read properties of undefined (reading herkunft)» ab - und zwar
 * lautlos. Keine Datei, keine Meldung, keine rote Zeile. Der Fehler landete
 * in window.onerror und starb dort. Dasselbe beim Ausleiten nach AxisVM.
 *
 * >>> DAS SCHWEIGEN IST SCHLIMMER ALS DER FEHLER. <<<
 *
 * Wer auf «Ausleiten» drueckt und nichts bekommt, sucht die Datei im
 * Download-Ordner, im Papierkorb, in den Einstellungen - und rechnet zuletzt
 * damit, dass das Programm es gar nicht versucht hat. Ein Statikprogramm,
 * dessen Knopf wortlos nichts tut, ist gefaehrlicher als eines, das
 * abbricht: der stille Fehlschlag sieht aus wie Erfolg.
 *
 * Gemeldet wird im Handlungsbalken ueber dem Modell - die eine Stelle, auf
 * die man dort ohnehin schaut. Der ganze Fehler geht zusaetzlich in die
 * Konsole; die Meldung im Balken bleibt kurz genug, um gelesen zu werden.
 * =========================================================================== */
function handlung(was, fn) {
  try {
    return fn();
  } catch (e) {
    meldeImBalken(`${was} nicht möglich: ${e.message}`);
    console.error(`${was}:`, e);
    return null;
  }
}

function exportKlick() {
  if (!letzte) return;
  handlung('Excel-Ausleitung', () =>
    exportiere(werte, letzte.erg, letzte.checks, letzte.hinw, letzte.warn,
               letzte.vergleich, letzte.urteil));
}

/* ===========================================================================
 * >>> DER NACHWEISBERICHT (Weisung vom 18. September). <<<
 * ===========================================================================
 *
 * «die bilder ausschaltbar und den umfang der nachweise einstellbar
 * machen.» Der Dialog fragt beides; die Wahl bleibt fuer das naechste Mal
 * im Browser stehen. Der Bericht selbst entsteht in
 * export.nachweisbericht.js aus dem, was `letzte` schon traegt - hier
 * werden nur die Bilder gemacht, die ein Browser braucht.
 * ========================================================================= */
const BERICHT_WAHL = 'tragjoch-bericht';

function berichtWahl() {
  try {
    const w = JSON.parse(localStorage.getItem(BERICHT_WAHL) ?? 'null');
    if (w?.umfang) return { ...berichtVorgabe(), ...w, bilder: { ...berichtVorgabe().bilder, ...w.bilder } };
  } catch { /* ohne Speicher die Vorgabe */ }
  return berichtVorgabe();
}

/** Die Regeln der Diagrammklassen aus dem eigenen Stylesheet. */
function diagrammStil() {
  const muster = /\.(grid|nulllinie|grenze|tick|achse|legende|serie|band|marke|lbl|micro)\b/;
  return [...document.styleSheets].flatMap((s) => {
    try { return [...s.cssRules]; } catch { return []; }
  }).filter((r) => r.selectorText && muster.test(r.selectorText))
    .map((r) => r.cssText).join('\n');
}

function dialogBericht() {
  if (!letzte) return;
  const art = tragwerksart(werte);
  if (!BERICHT_ARTEN.includes(art.key)) {
    meldeImBalken(`Der Nachweisbericht deckt das Tragjoch mit Masten und den Einzelmast ab — `
      + `«${art.label}» ist nicht enthalten.`);
    return;
  }
  const w = berichtWahl();
  const koerper = `
    <p>Der Bericht öffnet sich in einem eigenen Fenster; dort als PDF drucken.
    Die Bilder zeigen die Modellansicht in ihrer jetzigen Darstellung.</p>
    <h3>Umfang der Nachweise</h3>
    ${UMFAENGE.map((u) => `<label class="schalter"><input type="radio" name="umfang"
      value="${u.key}"${u.key === w.umfang ? ' checked' : ''}>
      <span><b>${esc(u.label)}</b> — ${esc(u.text)}</span></label>`).join('')}
    <h3>Bilder</h3>
    ${BILDER.map((b) => `<label class="schalter"><input type="checkbox" name="bild"
      value="${b.key}"${w.bilder[b.key] ? ' checked' : ''}><span>${esc(b.label)}</span></label>`).join('')}`;
  const { node, zu } = dialog('Nachweisbericht', koerper,
    `<button class="btn" data-zu>Abbrechen</button>
     <button class="btn btn-acc" id="bericht-los">Bericht erzeugen</button>`);
  node.querySelector('#bericht-los').onclick = () => {
    const wahl = {
      umfang: node.querySelector('input[name=umfang]:checked')?.value ?? 'anhang',
      bilder: Object.fromEntries(BILDER.map((b) => [b.key,
        !!node.querySelector(`input[name=bild][value=${b.key}]`)?.checked])),
    };
    try { localStorage.setItem(BERICHT_WAHL, JSON.stringify(wahl)); } catch { /* egal */ }
    zu();
    handlung('Nachweisbericht', () => berichtOeffnen(wahl));
  };
}

function berichtOeffnen(wahl) {
  /*
   * DIE BEMESSUNG, nicht die Anzeige: gleich welcher Lastfall oben gewaehlt
   * ist, der Bericht steht auf der Umhuellenden - wie das Urteil.
   */
  const bem = letzte.bemessung;
  const b = wahl.bilder;
  const mitJoch = letzte.mitJoch !== false;
  /*
   * OHNE JOCH NUR DIE MASTDIAGRAMME: `diagrammSatz` legt die Kurven des
   * Traeger-Ersatzbalkens dazu, und die rechnet beim Einzelmast ein Joch,
   * das es nicht gibt.
   */
  const satz = (b.verlaeufe || b.eta)
    ? (mitJoch ? diagrammSatz(bem, 900)
      : Object.fromEntries(weitereDiagramme(bem, 900).flatMap((w, i) => [
        [`mast-schnitt-${i}`, { svg: w.schnitt }],
        [`mast-eta-${i}`, { svg: w.ausnutzung }],
        [`anker-bem-${i}`, { svg: w.bemessung }]])))
    : {};
  const reihe = (schluessel) => Object.entries(satz)
    .filter(([k, v]) => v.svg && schluessel.some((s) => k === s || k.startsWith(`${s}-`)))
    // Jedes Diagramm traegt seinen Titel selbst - ein zweiter waere doppelt.
    .map(([, v]) => `<div class="dia">${v.svg}</div>`).join('');
  /*
   * DIE BILDER IM HELLEN DESIGN (Weisung vom 18. September: «bei den
   * skizzen abbildungen das helle appdesign nehmen»). Fuer die Aufnahme
   * wird kurz umgeschaltet und danach zurueck - wer dunkel arbeitet, merkt
   * davon nichts.
   */
  const aufnahme = (key) => {
    if (!ansicht) return null;
    const vorher = thema;
    if (vorher !== 'hell') uebertrageTokens('hell');
    try {
      return ansicht.momentaufnahme(key);
    } finally {
      if (vorher !== 'hell') { uebertrageTokens(vorher); ansicht.zeichneJetzt(); }
    }
  };
  const bilder = {
    skizze: b.skizze ? aufnahme('laengs') : null,
    modell3d: b.modell3d ? aufnahme('iso') : null,
    verlaeufe: b.verlaeufe ? reihe(['schnittgroessen', 'ebene', 'mast-schnitt', 'anker-bem']) : null,
    eta: b.eta ? reihe(['ausnutzung', 'mast-eta']) : null,
  };
  const html = nachweisbericht({
    werte: { ...rechensatz(werte), name: projekt.name },
    erg: bem, kombi: letzte.kombi, checks: letzte.checks, urteil: letzte.urteil,
    hinweise: letzte.hinw, fassung: `${APP_NAME} ${VERSION}`,
    datum: new Date().toLocaleDateString('de-CH'), bilder, stil: diagrammStil(),
  }, wahl);
  berichtZeigen(html);
}

/*
 * IN DER ANWENDUNG, NICHT IN EINEM NEUEN FENSTER. Der erste Anlauf oeffnete
 * ein Fenster - und die Pop-up-Sperre des Browsers hielt es auf. Eine Ebene
 * mit eingebettetem Dokument braucht keine Erlaubnis, laeuft auch in der
 * installierten und der eigenstaendigen Fassung, und gedruckt wird nur das
 * eingebettete Dokument, nicht die Anwendung dahinter.
 */
function berichtZeigen(html) {
  document.getElementById('bericht-ebene')?.remove();
  const ebene = document.createElement('div');
  ebene.id = 'bericht-ebene';
  ebene.innerHTML = `<div class="bericht-leiste">
      <b>Nachweisbericht</b>
      <button class="btn btn-acc" id="bericht-drucken">Drucken / als PDF sichern</button>
      <button class="btn" id="bericht-zu">Schliessen</button></div>
    <iframe title="Nachweisbericht"></iframe>`;
  document.body.appendChild(ebene);
  const rahmen = ebene.querySelector('iframe');
  rahmen.srcdoc = html;
  ebene.querySelector('#bericht-drucken').onclick = () => rahmen.contentWindow?.print();
  ebene.querySelector('#bericht-zu').onclick = () => ebene.remove();
}

/**
 * AxisVM-Ausleitung (SAF).
 *
 * Das Knotenmodell wird GEFRAGT, nicht angenommen: es entscheidet, ob AxisVM
 * auf den Schwerachsen oder am Anschnitt rechnet, und damit über die Momente,
 * die hinterher verglichen werden.
 */
function dialogAxisvm() {
  if (!letzte) return;
  /*
   * >>> DIESELBE MASKE FUER ALLE ARTEN. <<<
   *
   * Weisung vom 4. September: «die gleiche maske fuer alle arten von
   * tragwerken. die bennenung und auswahl ist dann entsprechend
   * anzupassen.»
   *
   * Bis dahin bekam das Abfangjoch einen eigenen, kuerzeren Dialog - die
   * Wahl war dort im Modell entschieden. Das war bequem und uneinheitlich:
   * wer zwischen zwei Tragwerken wechselt, sah zwei verschiedene Masken
   * fuer dieselbe Handlung.
   *
   * Jetzt steht eine Maske da. Was fuer eine Art nicht gilt, faellt aus der
   * Liste; was anders heisst, traegt seinen eigenen Namen (`labelAbfang`).
   */
  const art = tragwerksart(werte).key;
  const istAbfang = art === 'abfangjoch';
  const wahl = KNOTENMODELLE.map((k, i) => `
    <label class="schalter">
      <input type="radio" name="km" value="${k.key}"${i === 0 ? ' checked' : ''}>
      <span>${esc(k.label)}</span>
    </label>`).join('');
  // Die Vorgabe hängt an der Bauweise: die Altbauweise ist zu flach, als
  // dass ein Kräftepaar aus Ober- und Untergurt das Ende halten dürfte.
  const vorgabe = istAbfang ? 'punkt' : auflagerVorgabe(letzte.erg.modell);
  // Das Mastmodell baut den Mast wirklich auf - ohne Mast in der Eingabe
  // gibt es nichts zu bauen. Ausgegraut statt versteckt: so ist zu sehen,
  // dass es das Modell gibt und woran es haengt.
  const hatMast = !!letzte.erg.modell.federn?.mast;
  /*
   * >>> NUR DIE LAGERUNG, DIE DIESES TRAGWERK HAT. <<<
   *
   * Weisung vom 12. September: «kannst du beim output die lagerung gemaess
   * unseren aktuellen definition anbieten und die restlichen weglassen,
   * falls nicht wirklich notwendig.»
   *
   * Hier standen alle vier Modelle nebeneinander, drei davon ohne Bezug zum
   * Tragwerk auf dem Tisch. Es bleiben zwei: seine eigene Lagerung und der
   * Punkt je Ende fuer den Abgleich mit dem Ersatzbalken. Was das kann und
   * was nicht, steht bei `auflagerAngebot`.
   */
  const lager = auflagerAngebot(letzte.erg.modell, art, hatMast).map((k) => {
    /*
     * DER MAST IM ABFANGJOCH-MODELL FEHLT NOCH. Die Weisung nennt ihn -
     * «spaeter beim masten wie bei den tragjochen vorgehen» -, gebaut ist
     * er nicht: das Modell setzt bisher einen Auflagerpunkt je Ende. Die
     * Zeile steht trotzdem da, damit die Maske dieselbe ist.
     */
    /*
     * SEIT DEM 11. SEPTEMBER KANN AUCH DAS ABFANGJOCH MIT MAST (Weisung:
     * «Auflager so machen dass zuerst die starrelemente von mast ausgeht»).
     * Hier stand `istAbfang ? false` - die Zeile war ausgegraut, weil das
     * Modell keinen Masten kannte. Jetzt gilt fuer beide Arten dieselbe
     * Bedingung: es braucht einen Masten im Tragwerk.
     */
    const geht = k.braucht !== 'mast' ? true : hatMast;
    return `
    <label class="schalter${geht ? '' : ' aus'}">
      <input type="radio" name="am" value="${k.key}"${k.key === vorgabe ? ' checked' : ''}${geht ? '' : ' disabled'}>
      <span>${esc(k.label)}${geht ? ''
        : ' — braucht einen Masten im Tragwerk'}</span>
    </label>`;
  }).join('');
  const d = dialog('AxisVM-Ausleitung', `
    <p>${istAbfang
      ? `Schreibt das Stabmodell des <b>${esc(werte.abfangTyp ?? '')}</b> über
         <b>${Number(werte.L).toFixed(2)} m</b> aus: zwei Gurte, die
         Bindebleche jeder Station auf Flanschhöhe, die Quersteifen an den
         Bereichsgrenzen und die Gabel am Jochende auf ihrer versetzten
         Achse.`
      : `Schreibt das Stabmodell aus: vier Gurte, die Bindebleche jeder Station,
         die Gabellagerung und die Anbauteile am wirklichen Angriffspunkt. Die
         Lasten laufen <b>je Einwirkungsgruppe getrennt und charakteristisch</b>
         heraus; die ständige Last dabei nochmals geteilt in <b>Joch,
         Anbauteile und Ablenkkräfte</b>.`}</p>
    <p class="notiz">Über die COM-Brücke kommen ausserdem mit: das
       <b>Eigengewicht der Stäbe</b> als Last im ständigen Lastfall und die
       <b>Lastkombinationen dieser Anwendung</b> — AxisVM erzeugt also keine
       eigenen. Gerechnet wird nicht; der Startknopf bleibt Ihre
       Entscheidung.</p>
    <div class="feld"><label>Format</label>
      <label class="schalter"><input type="radio" name="fmt" value="json" checked>
        <span>JSON für die COM-Brücke, vollständig, ohne Zusatzmodul.
              Datei neben <code>com/AxisVM_aufbauen.cmd</code> legen</span></label>
      ${['saf', 'dxf', 'pynite'].map((f) => {
        const t = { saf: 'SAF-Mappe (.xlsx), vollständig, braucht aber das '
                       + 'SAF-Interface in AxisVM (kostenpflichtiges Modul)',
                    dxf: 'DXF + Zuordnungsmappe, nur die Geometrie; '
                       + 'Querschnitte, Auflager und Lasten von Hand',
                    pynite: 'PyNite-Skript (.py), freie Gegenrechnung, '
                          + 'läuft ohne AxisVM' }[f];
        /*
         * WAS ES NICHT GIBT, STEHT AUSGEGRAUT DA - nicht versteckt. So ist
         * zu sehen, dass es den Weg gibt und woran er haengt; ein Feld, das
         * je nach Tragwerk verschwindet, laesst den Benutzer suchen.
         */
        return `<label class="schalter${istAbfang ? ' aus' : ''}">
          <input type="radio" name="fmt" value="${f}"${istAbfang ? ' disabled' : ''}>
          <span>${t}${istAbfang ? ' — für das Abfangjoch noch nicht gebaut' : ''}</span>
        </label>`;
      }).join('')}
    </div>
    ${istAbfang ? '' : `<div class="feld"><label>Knotenmodell</label>${wahl}</div>`}
    <div class="feld"><label>Auflagermodell</label>${lager}
      <p class="notiz">In Jochachse hält <b>genau ein Knoten</b> — mehr verlangt
         das Gleichgewicht nicht, und jeder weitere wäre ein Zwang. Nur im
         Mastmodell halten beide Fundamente, dort aber über die Biegung der
         Maste.</p></div>
    ${istAbfang ? '' : `<div class="feld"><label>Starrelemente</label>
      <label class="schalter"><input type="radio" name="starr" value="koerper" checked>
        <span>als Starrkörper und Verbindungselemente, so, wie AxisVM sie
              führt. Der Übergang Gurt → Anbauteil wird ein
              Verbindungselement; dort lässt sich die Kraftübertragung je
              Richtung einstellen</span></label>
      <label class="schalter"><input type="radio" name="starr" value="staebe">
        <span>als steife Stäbe, dicker Ersatzquerschnitt mit der Güte des
              Tragwerks, gewöhnliche Stabendgelenke</span></label>
    </div>`}
    ${istAbfang ? '' : `<div class="feld" id="feld-schott" hidden>
      <label>Ausgabe</label>
      <label class="schalter"><input type="checkbox" name="schott">
        <span>Endschott aus der PyNite-Resultattabelle ausblenden, es bleibt
              tragendes Bauteil im Modell</span></label>
      <p class="notiz">Betrifft nur die Stabkräfte-Tabelle des
         PyNite-Skripts — und dort nur das Modell «ein Punkt je Ende»: die
         Endschotte gibt es allein in ihm. Am ausgeleiteten Modell ändert der
         Schalter nichts.</p>
    </div>`}
    <p class="notiz">Für einen Vergleich beide Modelle rechnen: erst ihre
       Differenz trennt die Frage des Knotenmodells von der des Rechenwegs.
       Das Blatt «Anleitung» in der Mappe nennt, was beim Import zu prüfen
       bleibt.</p>`,
    `<button class="btn btn-acc" data-los>Ausleiten</button>
     <button class="btn" data-zu>Abbrechen</button>`);
  /*
   * >>> DER SCHOTTSCHALTER ERSCHEINT MIT SEINEM FORMAT. <<<
   *
   * Er wirkt allein im PyNite-Skript: dort laesst er die SCHOTT-Staebe aus
   * der Stabkraefte-Tabelle heraus (`SCHOTT_AUSBLENDEN`). In JSON, SAF und
   * DXF tut er nichts - er stand trotzdem immer da und versprach eine
   * Wirkung, die es nicht gab.
   */
  const schottFeld = d.node.querySelector('#feld-schott');
  const schottZeigen = () => {
    if (!schottFeld) return;
    const f = d.node.querySelector('input[name="fmt"]:checked')?.value;
    schottFeld.hidden = f !== 'pynite';
  };
  d.node.querySelectorAll('input[name="fmt"]').forEach((r) => {
    r.addEventListener('change', schottZeigen);
  });
  schottZeigen();
  d.node.querySelector('[data-los]').onclick = () => {
    // Was beim Abfangjoch nicht zur Wahl steht, traegt seinen festen Wert.
    const lies = (n, vorgabe) => {
      const el = d.node.querySelector(`input[name="${n}"]:checked`)
              ?? d.node.querySelector(`input[name="${n}"]`);
      if (!el) return vorgabe;
      return el.type === 'checkbox' ? el.checked : el.value;
    };
    const km = lies('km', 'anschnitt');
    const fmt = lies('fmt', 'json');
    const aus = lies('schott', false);
    const am = lies('am', 'punkt');
    const sm = lies('starr', 'koerper');
    d.zu();
    axisvmKlick(km, fmt, aus, am, sm);
  };
}

function axisvmKlick(knotenmodell, format = 'saf', schottAusblenden = false,
                    auflagerModell = null, starrModell = 'koerper') {
  const m = letzte.erg.modell;
  /*
   * >>> DAS ABFANGJOCH GEHT SEINEN EIGENEN WEG. <<<
   *
   * Es ist ein LIEGENDER Vierendeeltraeger: zwei Gurte statt vier, Bleche
   * auf Flanschhoehe, Quersteifen ab A240, die Gabel am Jochende. Sein
   * Modell entsteht aus Typ und Laenge, nicht aus dem Blattmodell des
   * Tragjochs - `stabmodellJson` haette dafuer keinen Gurt.
   *
   * Die uebrigen Wege (SAF, DXF, PyNite) gibt es dafuer noch nicht; der
   * Dialog bietet sie beim Abfangjoch deshalb nicht an.
   */
  if (tragwerksart(werte).key === 'abfangjoch') {
    const typ = werte.abfangTyp;
    const jt = Number(werte.L);
    // Der Satz des AKTIVEN Tragwerks - dort stehen seine Anbauteile, seine
    // Fahrleitungsspannweite und sein Radius, nicht im Blattobjekt.
    const aktSatz = tragwerkSatz(werte);
    // Das Knotenmodell reicht durch: es entscheidet, ob die Riegelenden
    // steif ausgebildet werden oder das Modell Achse zu Achse rechnet.
    /*
     * DIE ANBAUTEILE REICHEN MIT DURCH (Weisung, 4. September). Ohne sie
     * baut die Ausleitung ein nacktes Joch und wirft eine pauschale
     * Abfangkraft in die Mitte - die Eingabe waere still verloren.
     */
    /*
     * DAS MASTPROFIL FUER DIE ABFANGJOCH-AUSLEITUNG.
     *
     * Beide Enden tragen denselben Masten, solange nichts anderes
     * eingestellt ist; abweichende Profile je Ende kennt das
     * Abfangjoch-Modell noch nicht, und eines zu erfinden waere schlimmer
     * als eines wegzulassen. Genommen wird Ende A.
     */
    const mastFuerAbfang = (satz) => {
      if (satz?.mastVorhanden === false) return null;
      const mst = mastenVon({ ...werte, ...satz });
      const m0 = mst[0];
      if (!m0?.profil) return null;
      const hoehe = Number(satz?.H ?? werte.H) || 0;
      // Die Stegrichtung gehoert dazu - ohne sie hatte der lotrechte Mast
      // im Modell keine lokale Achse (16. September).
      const stegrichtung = satz?.mastSteg ?? werte.mastSteg ?? 'jochachse';
      return hoehe > 0 ? { profil: m0.profil, hoehe, stegrichtung } : null;
    };
    return handlung('COM-Ausleitung',
      () => exportiereAbfangJson(typ, jt, {
        knotenbereich: knotenmodell, auflagerModell,
        anbauteile: aktSatz.anbauteile ?? [],
        // Die Auflagerbedingung je Gurt - vorn und hinten getrennt.
        auflagerLinks: aktSatz.auflagerLinks, auflagerVorgabe: werte.auflagerVorgabe,
        L_FL: Number(aktSatz.L_FL) || 0,
        R: Number(aktSatz.R) || 0,
        ek: aktSatz.ek,
        // Schnee und Wind auf den Traeger kommen aus der Sortimentstabelle;
        // welche Spalte gilt, sagt die Eingabe.
        schneeAktiv: aktSatz.schneeAktiv,
        schneeKlasse: aktSatz.schneeKlasse,
        /*
         * >>> UND DER MAST, WENN EINER DASTEHT. <<<
         *
         * Weisung vom 11. September: «Auflager so machen dass zuerst die
         * starrelemente von mast ausgeht (150 mm) …» Das setzt einen Masten
         * voraus, und bis hierher hatte das Abfangjoch-Modell keinen: es
         * lagerte auf einem Punkt je Ende.
         *
         * Gereicht wird das Profil des ANGEWAEHLTEN Endes und die
         * Anschlusshoehe. Steht kein Mast im Tragwerk, bleibt `mast` null -
         * dann baut die Ausleitung wie bisher auf Punkten.
         */
        mast: auflagerModell === 'mast' ? mastFuerAbfang(aktSatz) : null,
      }));
  }
  /*
   * `modellVon` BAUT EIN BELIEBIGES TRAGWERK DES BLATTES.
   *
   * Die Ausleitung braucht es, seit sie bei einer Jochreihe ALLE Tragwerke
   * zusammen modelliert (Weisung: Rahmenwirkung). Ohne diesen Zugang koennte
   * sie nur das aktive bauen - und genau das war der Befund des Durchlaufs.
   */
  const deps = { berechne, modell, profOG: m.profOG, profUG: m.profUG,
                 stahl: m.stahl, joch: m.joch,
                 modellVon: (satz) => modell({ ...satz, beiwerteFest: null },
                   getProfil(satz.profOG), getProfil(satz.profUG),
                   getStahl(satz.stahl), getTragjoch(satz.typ)) };
  const o = { knotenmodell, schottAusblenden, starrModell,
              auflagerModell: auflagerModell ?? auflagerVorgabe(m) };
  // Alle vier Wege durch dieselbe Klammer: was hier bricht, bricht sichtbar.
  const name = { json: 'COM-Ausleitung', dxf: 'DXF-Ausleitung',
                 pynite: 'PyNite-Ausleitung' }[format] ?? 'SAF-Ausleitung';
  return handlung(name, () => {
    if (format === 'json') return exportiereJson(werte, deps, o);
    if (format === 'dxf') return exportiereDxf(werte, deps, o);
    if (format === 'pynite') return exportierePynite(werte, deps, o);
    return exportiereAxisvm(werte, deps, o);
  });
}

/**
 * EINE DATEI, DIE VON AUSSEN KOMMT - auf das Fenster gezogen oder vom
 * Betriebssystem gereicht (siehe dateiEmpfang in js/pwa.js).
 *
 * Die Anwendung schreibt drei Arten von JSON, und alle drei tragen ihre Art
 * im Kopf. Statt zu fragen, was da vorliegt, wird nachgesehen.
 *
 * GEFRAGT WIRD TROTZDEM IMMER - und zwar, ob es hinein soll. Eine Ablage
 * einzulesen legt Einträge an, ein Datenpaket tauscht die ganze Datenbasis.
 * Beides darf nicht dadurch geschehen, dass jemand danebengreift.
 */
async function dateiAnnehmen(datei) {
  let roh = null;
  try { roh = new Uint8Array(await datei.arrayBuffer()); }
  catch (e) { alert(`Datei nicht lesbar: ${e.message}`); return; }
  /*
   * EIN PAKET IST EIN ZIP (17. September). Bis hierher wurde jede Datei als
   * Text gelesen - ein hineingezogenes Paket meldete sich als «kein
   * lesbares JSON». Es geht jetzt in denselben Einlesedialog wie ueber den
   * Knopf.
   */
  if (roh.length > 1 && roh[0] === 0x50 && roh[1] === 0x4b) {
    try { await dialogEinlesen(roh, { dateiname: datei.name }); }
    catch (e) { alert(`Paket nicht lesbar: ${e.message}`); }
    return;
  }
  const text = new TextDecoder().decode(roh).replace(/^﻿/, '');

  let obj = null;
  try { obj = JSON.parse(text); } catch { /* wird gleich gemeldet */ }

  const gross = datei.size < 1024 ? `${datei.size} Byte`
                                  : `${(datei.size / 1024).toFixed(0)} kB`;
  const kopf = `<p class="notiz">${esc(datei.name)} · ${gross}</p>`;
  const zu = '<button class="btn" data-zu>Schliessen</button>';

  if (!obj || typeof obj !== 'object') {
    dialog('Datei nicht verwendbar', kopf +
      '<p>Das ist kein lesbares JSON. Erwartet wird eine Ablagedatei oder ein '
      + 'Datenpaket aus dieser Anwendung.</p>', zu);
    return;
  }

  // --- Datenpaket: die Datenbasis ---
  if (obj.format === PAKET_FORMAT) {
    const p = pruefePaket(obj);
    if (!p.ok) {
      dialog('Datenpaket nicht verwendbar',
             kopf + `<p>${esc(p.fehler.join(' '))}</p>`, zu);
      return;
    }
    const d = dialog('Datenpaket laden', kopf +
      `<p>Enthalten: ${p.teile.map((x) => `<b>${x.anzahl}</b> ${esc(x.einheit)}`)
         .join(' · ')}${obj.stand ? ` · Stand ${esc(obj.stand)}` : ''}.</p>` +
      '<p class="notiz">Das Paket ersetzt die hinterlegte Datenbasis. Es wird '
      + 'allein in diesem Browser gespeichert und nirgends hingeschickt; die '
      + 'Anwendung startet danach neu.</p>',
      '<button class="btn btn-acc" data-ok>Laden</button>'
      + '<button class="btn" data-zu>Abbrechen</button>');
    d.node.querySelector('[data-ok]').onclick = () => {
      paketAnwenden(obj);
      d.zu();
      location.reload();
    };
    return;
  }

  // --- Ablage: gespeicherte Tragwerke ---
  // Derselbe Dialog wie beim Knopf «Einlesen …» - mit Auswahl je Eintrag.
  if (obj.art === 'tragjoch-ablage' || Array.isArray(obj.eintraege)
      || (Array.isArray(obj) && obj.some((e) => e && e.werte))) {
    try { await dialogEinlesen(roh, { dateiname: datei.name }); }
    catch (e) { alert('Einlesen fehlgeschlagen: ' + e.message); }
    return;
  }

  // --- Stabmodell: geht hinaus, nicht herein ---
  if (obj.format === 'tragjoch-stabmodell') {
    dialog('Das ist eine Ausleitung', kopf +
      '<p>Die Datei beschreibt ein fertiges Stabmodell für die COM-Brücke nach '
      + 'AxisVM. Sie führt aus dieser Anwendung hinaus, nicht in sie hinein: '
      + 'eingelesen wird sie von <code>com/AxisVM_aufbauen.ps1</code>.</p>', zu);
    return;
  }

  dialog('Datei nicht erkannt', kopf +
    '<p>Weder eine Ablage (<code>art: tragjoch-ablage</code>) noch ein '
    + 'Datenpaket (<code>format: tragjoch-daten</code>).</p>', zu);
}

/**
 * Datenpaket laden und sichern.
 *
 * Die Oberfläche ist allgemein, die Zahlen darin stammen aus den Unterlagen
 * des Betreibers. Wer die Anwendung ohne Daten weitergibt, lädt sie hier
 * örtlich nach; sie bleiben danach im Browser hinterlegt.
 *
 * @param {boolean} erforderlich true, wenn ohne Daten nichts geht
 */
/*
 * NUR NOCH DER PFLICHTFALL.
 *
 * Der Dialog trug zwei Faelle: das Verwalten der Datenbasis (Kopfknopf) und
 * den Start ohne Daten. Ersteres steht seit dem 1. September unter Optionen;
 * hier bleibt der Fall, in dem noch gar nichts geht - da ist der
 * Optionsdialog kein Weg, denn die Anwendung ist noch nicht aufgebaut.
 */
function dialogDaten() {
  const d = dialog('Datenpaket laden', `
    <p><b>Diese Ausgabe enthält keine Daten.</b> Sie braucht ein Datenpaket
       mit den Jochtypen, den Anbauteil-Vorlagen und der Lasttabelle. Es wird
       nur in diesem Browser gespeichert und nirgends hingeschickt.</p>
    <div class="feld"><label for="d-paket">Datenpaket (.json)</label>
      <input id="d-paket" type="file" accept=".json,application/json"></div>
    <p class="notiz" id="d-paket-stand">Zurzeit ist kein Paket im Browser
       hinterlegt.</p>`,
    '<button class="btn" data-zu>Abbrechen</button>');

  const melde = (text, schlecht = false) => {
    const n = d.node.querySelector('#d-paket-stand');
    n.textContent = text;
    n.style.color = schlecht ? 'var(--fail, #c00)' : '';
  };

  d.node.querySelector('#d-paket').onchange = async (ev) => {
    const datei = ev.target.files?.[0];
    if (!datei) return;
    try {
      const obj = JSON.parse(await datei.text());
      const p = pruefePaket(obj);
      if (!p.ok) { melde(p.fehler.join(' '), true); return; }
      paketAnwenden(obj);
      melde(`Geladen: ${p.teile.map((t) => `${t.anzahl} ${t.einheit}`).join(' · ')}`
            + ' — die Anwendung wird neu gestartet.');
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      melde(`Datei nicht lesbar: ${e.message}`, true);
    }
  };
}

/**
 * Einen Ablageeintrag umbenennen oder einem anderen Projekt zuordnen.
 * Die Eingabewerte bleiben unangetastet - hier ändert sich nur die
 * Beschriftung.
 */
function dialogUmbenennen(s) {
  const d = dialog('Umbenennen', `
    <div class="feld"><label for="u-name">Bezeichnung</label>
      <input id="u-name" type="text" value="${esc(s.name)}"></div>
    <div class="feld"><label for="u-projekt">Projekt</label>
      <input id="u-projekt" type="text" value="${esc(s.projekt ?? '')}"
             placeholder="leer = ohne Projekt"></div>
    <div class="feld"><label for="u-bem">Bemerkung</label>
      <input id="u-bem" type="text" value="${esc(s.bemerkung ?? '')}"></div>
    <p class="notiz">Mehrere Joche unter demselben Projektnamen erscheinen in
       der Ablage als eine Gruppe.</p>`,
    `<button class="btn btn-acc" data-ok>Übernehmen</button>
     <button class="btn" data-zu>Abbrechen</button>`);
  ui.el('u-name').focus();
  d.node.querySelector('[data-ok]').onclick = async () => {
    const neu = {
      name: ui.el('u-name').value,
      projekt: ui.el('u-projekt').value,
      bemerkung: ui.el('u-bem').value,
    };
    await store.umbenennen(s.id, neu);
    // Trägt der geladene Stand denselben Eintrag, wandert die Beschriftung mit.
    if (projekt.id === s.id) {
      projekt = { ...projekt, name: neu.name.trim() || 'Ohne Namen',
                  projekt: neu.projekt.trim() };
      aktualisiereProjektKnopf();
    }
    d.zu();
    zeichneSchublade();
  };
}

/** Ein ganzes Projekt umbenennen - alle Einträge auf einmal. */
function dialogProjektUmbenennen(alt) {
  const leer = alt === 'Ohne Projekt';
  const d = dialog('Projekt umbenennen', `
    <div class="feld"><label for="p-name">Projektname</label>
      <input id="p-name" type="text" value="${leer ? '' : esc(alt)}"
             placeholder="leer = ohne Projekt"></div>
    <p class="notiz">Betrifft alle Einträge, die jetzt unter
       «${esc(alt)}» stehen. So lassen sich verstreute Joche nachträglich zu
       einem Projekt zusammenfassen.</p>`,
    `<button class="btn btn-acc" data-ok>Übernehmen</button>
     <button class="btn" data-zu>Abbrechen</button>`);
  ui.el('p-name').focus();
  d.node.querySelector('[data-ok]').onclick = async () => {
    const ziel = ui.el('p-name').value;
    const n = await store.projektUmbenennen(leer ? '' : alt, ziel);
    if (projekt.projekt === (leer ? '' : alt)) {
      projekt = { ...projekt, projekt: ziel.trim() };
      aktualisiereProjektKnopf();
    }
    d.zu();
    zeichneSchublade();
    void n;
  };
}

function zuruecksetzen() {
  if (!confirm('Alle Eingaben auf die Standardwerte zurücksetzen?')) return;
  localStorage.removeItem(SPEICHER);
  werte = frisch();
  station = null;
  neuRechnen();
  ansicht.ganzesJoch();
}

// --- Start ------------------------------------------------------------------

export async function start() {
  uebertrageTokens(thema);
  // Ablage im Browser und Installationsangebot. Muss vor dem ersten
  // baueKopf() stehen, damit der Knopf beim ersten Zeichnen schon da sein
  // kann; erscheint das Angebot später, wird der Kopf neu gebaut.
  pwaEinrichten({ beiWechsel: () => { if (werte) baueKopf(); } });
  // Dateien von aussen annehmen. BEWUSST VOR der Datenprüfung darunter: fehlt
  // die Datenbasis, ist das Hineinziehen des Datenpakets genau der Weg, der
  // dann gebraucht wird - und der Ausstieg unten käme ihm sonst zuvor.
  dateiEmpfang(dateiAnnehmen);
  // Daten kommen entweder mit der Datei (eingebettet bzw. nachgeladen) oder
  // aus einem örtlich geladenen Datenpaket. Fehlt beides, ist das kein
  // Fehler, sondern der Normalfall der datenfreien Ausgabe.
  /* =======================================================================
   * >>> DIE NORMWERTE ZUERST, UND OHNE AUSWEICHEN. <<<
   * =======================================================================
   *
   * Weisung vom 16. September: «alle relevanten tragwerksdaten werden
   * ausschliesslich über die datenbank gesteuert.» Seither stehen auch die
   * Querschnittswerte in einer Datei (data/normen.json) statt im Quelltext.
   *
   * Sie sind KEIN Teil des Datenpakets - sie gehören keinem Betreiber, und
   * die gleiche Trennung gilt für die Ablage. Darum auch kein Ausweichen
   * auf den Browserspeicher: fällt diese Datei aus, hilft kein Paket. Dann
   * sagt es die Anwendung, statt mit leeren Wählern dazustehen.
   */
  try {
    await ladeNormen();
  } catch (fehler) {
    dialog('Normwerte fehlen',
      `<p>${esc(String(fehler.message ?? fehler))}</p>`
      + '<p class="notiz">Die Datei <code>data/normen.json</code> trägt die '
      + 'Querschnittswerte der Profile und die Stahlgüten. Sie gehört neben '
      + 'die Anwendung und steht in der Ablage — anders als das Sortiment '
      + 'enthält sie keine Betreiberdaten.</p>',
      '<button class="btn" data-zu>Schliessen</button>');
    return;
  }
  const daten = await datenBereitstellen([ladeDatenbank, ladeAnbauteile, ladeFlBauteile]);
  // Getrennt und ohne Abbruch: die drei oben sind Voraussetzung, diese
  // drei sind es nicht.
  await ladeAbfangjoche().catch(() => null);
  await ladeAnker().catch(() => null);
  // Ohne Masten-Sortiment gelten alle Normprofile, nur ohne Windlast.
  await ladeMasten().catch(() => null);
  /*
   * >>> DER EINGELESENE STAND LEGT SICH UEBER DIE DATEIEN. <<<
   *
   * Übernommen wird ein Einlesen, indem es im Browser hinterlegt und die
   * Anwendung neu gestartet wird (Fenster Bauteildaten). Hier greift es -
   * nach den Dateien, damit es sie überdeckt, und vor der ersten Rechnung.
   * Das Fenster sagt, dass ein solcher Stand gilt.
   */
  const eingelesenErgebnis = eingelesenAnwenden(DATEN_SETZER);
  if (eingelesenErgebnis.fehler.length) {
    console.warn('Eingelesener Stand nicht anwendbar:', eingelesenErgebnis.fehler);
  }
  if (daten.quelle === 'keine' && !eingelesenErgebnis.angewendet.includes('tragjoche')) {
    dialogDaten();
    return;
  }
  setzeTypOptionen();
  werte = laden();
  // Die Teile am Masten neu projizieren: ein Stand von vor dem
  // 18. September traegt eine Liste, in der sie am falschen Masten hingen
  // (Laufnummer statt Stelle, siehe `mastIdUmsetzung`).
  mastNachfuehrenGlobal();
  werte.eigeneVorlagen = vorlagenZusammenfuehren(werte);
  setzeEigeneVorlagen(werte.eigeneVorlagen);
  uebertrageTokens(thema);

  const dbFehler = pruefeDatenbank(getProfil);
  const stand = datenbankStand();
  ui.el('st-db').textContent = ui.datenbankText(stand, dbFehler);
  // Als eigenes Fenster gestartet fehlt die Adressleiste - dann ist in der
  // Fusszeile das Einzige, woran sich die Herkunft noch ablesen lässt.
  const zeigeFuss = () => {
    ui.el('st-version').textContent = `${APP_NAME} ${VERSION}`
      + (alsProgramm() ? ' · installiert' : '')
      + (netzZustand() ? ' · ohne Netz' : '');
  };
  netzZustand(zeigeFuss);          // meldet künftige Wechsel
  zeigeFuss();

  ansicht = new Modellansicht(ui.el('canvas3d'), {
    beiAuswahl: (st) => {
      const x = letzte?.erg.knoten[st]?.x ?? 0;
      springeZu(st, x);
    },
    /*
     * >>> ERST DAS BAUTEIL WAEHLEN, DANN SEIN FELD OEFFNEN. <<<
     *
     * Weisung vom 3. September: «wenn ich die mastbezeichnung im 3d anklicke
     * wird nicht in der sidebar auf M2 oder M1 umgeschalten.»
     *
     * Der Klick sprang bisher nur auf das FELD. Auf einem Blatt mit einem
     * Tragwerk und einem Masten stimmte das immer; auf einer Jochreihe
     * klickte man auf M3 und bearbeitete M1 - das Feld war das richtige, der
     * Mast der falsche.
     *
     * Die Reihenfolge zaehlt: erst das TRAGWERK (es tauscht den ganzen
     * Eingabesatz aus), dann der MAST darin, dann das Feld. Umgekehrt
     * stuende die Mastwahl auf einem Tragwerk, das gleich weggelegt wird.
     */
    beiMass: (feld, tab, bt) => {
      if (bt?.twId && bt.twId !== (werte.twId ?? 'T1')) {
        aendern('tragwerkAktiv', bt.twId);
      }
      if (bt?.mastEnde) {
        const t = tragwerkeVon(werte)[0];
        const m = mastenFuer(werte, t)[bt.mastEnde === 'B' ? 1 : 0];
        if (m && m.id !== werte.mastAktiv) aendern('mastAktiv', m.id);
      }
      zeigeFeld(feld);
    },
    /*
     * MAST ANGEKLICKT: auf seine Eingabe springen.
     *
     * Ende B fuehrt auf sein eigenes Feld, sofern der zweite Mast eingeschaltet
     * ist - sonst gaebe es dort ein Feld, das gar nicht sichtbar ist, und der
     * Sprung liefe ins Leere. Dann gilt der erste Mast fuer beide Enden, und
     * dessen Hoehe ist die richtige Stelle.
     */
    beiMast: (ende) => zeigeFeld(
      ende === 'B' && (werte.mastHZwei ?? werte.mastZwei) ? 'mastHB' : 'mastH'),
    /*
     * EIN KLICK INS BILD SCHALTET DAS TRAGWERK UM (Weisung, 2. September).
     *
     * Derselbe Weg wie die Kachel in der Liste - `aendern` traegt Speichern,
     * Rechnen und Zeichnen. Zwei Wege zu derselben Sache waeren einer, der
     * vergessen wird.
     */
    beiTragwerk: (id) => aendern('tragwerkAktiv', id),
    beiAnbauteil: (i) => zeigeAnbauteil(i),
    /*
     * DIE ZAHL IM BALKEN LAEUFT MIT DEM ZUG MIT.
     *
     * Ohne diese Meldung stuende «Δx = 0.00 m» stehen, bis man loslaesst -
     * und genau waehrend des Ziehens will man sie lesen.
     */
    beiZeichnungVerschoben: () => { if (bildSchieben) zeichneBalken(); },
    beiKontext: (k) => kontextImModell(k),
  });

  /*
   * DIE KUERZELLISTE GEHT AN DIE MASKE.
   *
   * Sie zeigt sie an und meldet Aenderungen zurueck; welche Handlung
   * dahintersteht, geht sie nichts an. Die wirksame Taste (`jetzt`) wird bei
   * jedem Aufbau frisch gelesen - sie haengt an `werte`.
   */
  ui.setzeTastenliste(() => TASTEN.map((t) => (t.gruppe
    ? { gruppe: t.gruppe }
    : { id: t.id, text: t.text, taste: t.taste, jetzt: tasteVon(t),
        still: t.still || !t.id })));
  ui.setzeDiagrammBuehne(zeigeDiagrammGross);
  // Der Knopf erscheint nur im Urteil, und nur wenn der Nachweis nicht
  // erfüllt ist - dort, wo die Frage «und welcher Typ dann?» aufkommt.
  ui.setzeSortimentSuche(dialogSortiment);
  ui.setzeAnbauHandler({
    /*
     * EIN WEG ZUM SETZEN, NICHT ZWEI.
     *
     * Der Klick auf eine Kachel fragte bisher in einem Dialog nach der Lage
     * x - und konnte damit grundsaetzlich nur ans JOCH setzen. Am Masten
     * gibt es kein x. Jetzt fuehrt er dorthin, wo auch das Ziehen hinfuehrt:
     * Bauteil vorgewaehlt, ein Klick ins Modell setzt es.
     */
    wahl: (id) => setzenStarten({ art: 'vorlage', id }),
    weg: vorlageEntfernen,
    sichern: vorlageSichern,
    generator: dialogGenerator,
    zoom: zoomAufAnbauteil,
    bearbeiten: dialogVorlageBearbeiten,
    oeffnen: (i) => {
      const a = (werte.anbauteile ?? [])[i];
      if (!a) return;
      // Zweiter Klick auf die offene Zeile klappt sie wieder zu.
      if (ui.klappOffen(`at-${a.id}`)) {
        ui.setzeKlapp(`at-${a.id}`, false);
        neuRechnen();
        anbauteilBlickZurueck();
        return;
      }
      zeigeAnbauteil(i);
    },
  });
  ui.setzeKlappHandler(klappWechsel);
  baueKopf();
  ui.el('btn-projekt').onclick = schubladeUmschalten;
  // Ein Klick daneben schliesst die Schublade wieder - sie ist kein Fenster,
  // das man wegräumen muss.
  document.addEventListener('pointerdown', (e) => {
    if (!schubladeOffen) return;
    if (e.target.closest('#bannerschublade') || e.target.closest('#btn-projekt')) return;
    schubladeSchliessen();
  });
  document.addEventListener('keydown', tastendruck);
  baueLayout();
  baueModellWerkzeuge();
  verdrahteZeichnung();
  verdrahteAblegen();
  neuRechnen();
  requestAnimationFrame(() => ansicht.passeGroesseAn());
  new ResizeObserver(() => ansicht.passeGroesseAn()).observe(ui.el('viewer'));

  // Sprungliste der installierten Anwendung (shortcuts im Manifest). Zuletzt,
  // damit der gewünschte Dialog über einem fertigen Arbeitsblatt steht und
  // nicht über einem halben.
  if (wiederhergestellt?.ts) {
    const z = new Date(wiederhergestellt.ts);
    const hhmm = `${String(z.getHours()).padStart(2, '0')}:${String(z.getMinutes()).padStart(2, '0')}`;
    const tag = z.toDateString() === new Date().toDateString()
      ? '' : ` vom ${z.toLocaleDateString('de-CH')}`;
    meldeImBalken(`Letzter Stand${tag} von ${hhmm} wiederhergestellt`
      + (projekt.id ? ` · ${projekt.projekt ? `${projekt.projekt} · ` : ''}${projekt.name}` : '')
      + (ungesichert ? ' · nicht in der Ablage gesichert' : ''), { dauer: 8000 });
  }
  switch (startWunsch()) {
    case 'neu': zuruecksetzen(); break;
    case 'ablage': schubladeUmschalten(); break;
    case 'handbuch': dialogHandbuch(); break;
    default: break;
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
