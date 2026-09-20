/**
 * app.js
 * ---------------------------------------------------------------------------
 * VERDRAHTUNG. Hält Zustand und Ereignisse, ruft Rechenkern und Ansichten.
 * Enthält selbst weder Rechnung noch Geometrie noch Layout-Regeln.
 * ---------------------------------------------------------------------------
 */

import { havarieAnheben } from './data.anbauteile.js';
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
import { dialogBericht } from './app.bericht.js';
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
         tragwerkeVon, mastenFuer, lageOrtsnull,
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
import { abfangAuswertung, abfangFyd, abfangStuetzweite,
         abfangFuerStuetzweite } from './core.abfangjoch.js';
import { abfangAuswertungFuer, rechensatzMitNachbarn } from './core.nachbarn.js';
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
         ladeMasten, mastenDB, setzeMastenDB,
         mastenDbDa } from './data.masten.js';
import { mastImModell, mastLaengeVorgabe, einzelmastLaenge } from './core.auflager.js';
import { ablenkwinkel, radiusAusWinkel, istGerade,
         R_GERADE } from './core.trasse.js';
import { pwaEinrichten, kannInstallieren, installiere, alsProgramm,
         dateiEmpfang, startWunsch, netzZustand } from './pwa.js';
import { verlauf } from './verlauf.js';
import * as store from './store.js';
import * as ui from './ui.js';
import { dialogAxisvm } from './app.axisvm.js';
import { schubladeUmschalten, schubladeSchliessen, zeichneSchublade, ablageSpeichern, sichereAktuell, dialogEinlesen,
         schubladeIstOffen } from './app.ablage.js';
import { dialogAnker, dialogMast, dialogTragwerk } from './app.dialoge.js';
import { kontextSchliessen, kontextZeigen, kontextTragwerk, kontextMast, kontextAnbauteil, anbauteilDuplizieren, kontextGrund, kontextImModell, tragwerkKopieren, nurDiesesZeigen, alleZeigen,
         kontextOffen } from './app.kontext.js';
import { zeichnungEinlegen, zeichnungSichernFallsMoeglich, zeichnungHolen, zeichnungMenueUmschalten, zeichnungMenueEnde, zeichnungWaehlen, zeichnungEntfernen, bildSchiebenStarten, bildSchiebenEnde, kalibrierenStarten, kalibrierenEnde, freiesMassUebernehmen, ausrichtenStarten, ausrichtenWaehlen, ausrichtenEnde } from './app.zeichnung.js';
import { dialogSortiment, dialogHandbuch, dialogOptionen, verdrahteExtras } from './app.optionen.js';
import { baueModellWerkzeuge, zeichneModellWerkzeuge, zeichneEinwirkungswahl, zeichneLegende, zeigeFeld, baueLayout, zeichneSchienen } from './app.layout.js';
import { setzenStarten, setzenEnde, stelleAus, vorlagenFuer, kopierbareHtml, vorwahlName, setzeVorlageAnStelle, setzeKopieAnStelle, setzeVorwahlAnStelle } from './app.setzen.js';

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

/*
 * >>> DER ARBEITSSTAND FUER DIE AUSGELAGERTEN TEILE (A1, 19. September). <<<
 *
 * Die Module app.*.js importieren app.js nicht zurueck - einen Kreis
 * vertraegt der Buendler nicht. Sie bekommen dieses Objekt: Getter auf den
 * Zustand (gelesen wird immer der aktuelle) und die gemeinsamen Hilfen.
 * Funktionen sind gehoben, die Getter lesen erst beim Aufruf - die Stelle
 * im Quelltext ist deshalb gleichgueltig.
 */
const app = {
  // Zustand - gelesen immer der aktuelle; wo ein Modul schreibt, ein Setter.
  get werte() { return werte; }, set werte(v) { werte = v; },
  get letzte() { return letzte; },
  get projekt() { return projekt; }, set projekt(v) { projekt = v; },
  get station() { return station; }, set station(v) { station = v; },
  get ungesichert() { return ungesichert; }, set ungesichert(v) { ungesichert = v; },
  get thema() { return thema; },
  get ansicht() { return ansicht; },
  VERSION,
  get BEARBEITER() { return BEARBEITER; },
  get ANKER_STANDARD() { return ANKER_STANDARD; },
  get setzen() { return setzen; }, set setzen(v) { setzen = v; },
  blattVersatz: (...a) => blattVersatz(...a),
  hebungVon: (...a) => hebungVon(...a),
  get zuSeite() { return zuSeite; },
  get buehne() { return buehne; }, set buehne(v) { buehne = v; },
  get tabAuswertung() { return tabAuswertung; }, set tabAuswertung(v) { tabAuswertung = v; },
  get tabEingabe() { return tabEingabe; }, set tabEingabe(v) { tabEingabe = v; },
  get anzeigeKombi() { return anzeigeKombi; }, set anzeigeKombi(v) { anzeigeKombi = v; },
  dialogBauteildaten: (...a) => dialogBauteildaten(...a),
  dialogTasten: (...a) => dialogTasten(...a),
  themaWechseln: (...a) => themaWechseln(...a),
  zuruecksetzen: (...a) => zuruecksetzen(...a),
  get kalibrierung() { return kalibrierung; }, set kalibrierung(v) { kalibrierung = v; },
  get erkannt() { return erkannt; }, set erkannt(v) { erkannt = v; },
  get zeichnungMenue() { return zeichnungMenue; }, set zeichnungMenue(v) { zeichnungMenue = v; },
  get bildSchieben() { return bildSchieben; }, set bildSchieben(v) { bildSchieben = v; },
  get ausrichtung() { return ausrichtung; }, set ausrichtung(v) { ausrichtung = v; },
  get ERKENNUNG_GRENZE() { return ERKENNUNG_GRENZE; },
  baueModellWerkzeuge: (...a) => baueModellWerkzeuge(app, ...a),
  zeichneBalken: (...a) => zeichneBalken(...a),
  ausrichtenStarten: (...a) => ausrichtenStarten(app, ...a),
  bildSchiebenStarten: (...a) => bildSchiebenStarten(app, ...a),
  setzeAnbauteile: (...a) => setzeAnbauteile(...a),
  setzenEnde: (...a) => setzenEnde(app, ...a),
  setzenStarten: (...a) => setzenStarten(app, ...a),
  zeichneAuswertung: (...a) => zeichneAuswertung(...a),
  zeigeAnbauteil: (...a) => zeigeAnbauteil(...a),
  zeigeFeld: (...a) => zeigeFeld(app, ...a),
  zoomAufTragwerk: (...a) => zoomAufTragwerk(...a),
  ankerRichtungVor: (...a) => ankerRichtungVor(...a),
  artVorgabe: (...a) => artVorgabe(...a),
  // Gemeinsame Hilfen und Wege zurueck in die Verdrahtung.
  dialog: (...a) => dialog(...a),
  handlung: (...a) => handlung(...a),
  meldeImBalken: (...a) => meldeImBalken(...a),
  diagrammSatz: (...a) => diagrammSatz(...a),
  weitereDiagramme: (...a) => weitereDiagramme(...a),
  aendern: (...a) => aendern(...a),
  neuRechnen: (...a) => neuRechnen(...a),
  speichern: (...a) => speichern(...a),
  laden: (...a) => laden(...a),
  frisch: (...a) => frisch(...a),
  neuesTragjoch: (...a) => neuesTragjoch(...a),
  markiereGesichert: (...a) => markiereGesichert(...a),
  aktualisiereProjektKnopf: (...a) => aktualisiereProjektKnopf(...a),
  mastNachfuehrenGlobal: (...a) => mastNachfuehrenGlobal(...a),
  vorlagenZusammenfuehren: (...a) => vorlagenZusammenfuehren(...a),
  zeichneModellWerkzeuge: (...a) => zeichneModellWerkzeuge(app, ...a),
  zeichnungHolen: (...a) => zeichnungHolen(app, ...a),
  zeichnungSichernFallsMoeglich: (...a) => zeichnungSichernFallsMoeglich(app, ...a),
  dialogSpeichern: (...a) => dialogSpeichern(...a),
};
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
    // Der Merker «Bruch» an der Baugruppe wird zur Havarie-Auswahl
    // (19. September) - je Leiter ein Fall statt alle zugleich.
    Object.assign(w, havarieAnheben(w));
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
  // Erklaertexte ein oder aus (U4) - eine Klasse, die Stilregel tut den Rest.
  document.body?.classList.toggle('ohne-erklaertexte', werte.erklaertexte === false);
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
      verdrahteExtras(app);
      return;
    }
    maskeSig = sig;
    ui.zeichneTabs(ui.el('tabs'), ui.EINGABE_TABS, tabEingabe, (t) => {
      tabEingabe = t; neuRechnen();
    });
    ui.zeichneMaske(ui.el('maske'), werte, tabEingabe, aendern, setzeAnbauteile, extras);
    verdrahteExtras(app);
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

    // Der Kern bekommt die Mastangaben aus der Liste, nicht aus dem Satz -
    // und am geteilten Masten die Jochkraefte der Nachbarn (19. September,
    // core.nachbarn.js). Einmal gerechnet, fuer Hauptdurchgang und Vergleiche.
    const rs = rechensatzMitNachbarn(werte);
    const erg = berechne(rs, profOG, profUG, stahl, joch);

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
      try {
        // Die Eingaben stehen jetzt im Kern (core.nachbarn.js), weil auch
        // ein Nachbar-Abfangjoch sie braucht.
        erg.abfang = abfangAuswertungFuer(werte, stahl);
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
    /* =====================================================================
     * >>> DAS ABFANGJOCH UND SEINE MASTEN (20. September). <<<
     * =====================================================================
     *
     * Weisung: «die masten werden nach innen gesetzt wenn primär ein jochtyp
     * und länge ausgewählt wurde. wenn aber die masten schon vorhanden sind
     * sollte sich der jochtyp daran richten und wenn notwendig den nächst
     * längeren joch auswählen.»
     *
     * Der erste Fall steckt in der Geometrie (`abfangUeberstand`,
     * core.constants.js): ein neues Abfangjoch setzt seine Masten 25 cm
     * innerhalb der Jochenden. Hier steht der ZWEITE: die Masten stehen
     * schon. Traegt die gewaehlte Laenge ihren Abstand nicht, sagt der
     * Hinweis, welches Joch ihn traegt - geaendert wird nichts von selbst
     * («Warnen, Berichtigung auf Klick», Entscheid 20. September).
     */
    if (tragwerksart(werte).key === 'abfangjoch' && abfangDbDa()) {
      const tAkt = tragwerkeVon(werte).find((t) => t.id === (werte.twId ?? werte.id));
      const [mA, mB] = tAkt ? mastenFuer(werte, tAkt) : [];
      const sw = abfangStuetzweite(werte.abfangTyp, Number(werte.L));
      if (mA && mB && sw) {
        const js = Math.abs(mB.x - mA.x);
        if (js < sw.von - 1e-6 || js > sw.bis + 1e-6) {
          const v = abfangFuerStuetzweite(werte.abfangTyp, js);
          hinw.push(`Abfangjoch ${werte.abfangTyp} / ${Number(werte.L).toFixed(2)} m: `
            + `die Masten stehen ${js.toFixed(2)} m auseinander, dieses Joch trägt `
            + `${sw.von.toFixed(2)}–${sw.bis.toFixed(2)} m (Überstand 0.25–0.50 m je Seite). `
            + (v ? `Passend wäre ${v.typ} / ${v.L.toFixed(2)} m.`
                 : 'Kein Joch des Sortiments trägt diese Stützweite.'));
        }
      }
    }
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
    zeichneEinwirkungswahl(app);
    zeichneAuswertung();
    // Die Nachweise in der rechten Schiene müssen mitlaufen - sie sind bei
    // eingeklappter Schublade das Einzige, was von der Auswertung übrig ist.
    zeichneSchienen(app);
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
    // Das Abfangjoch beginnt um seinen Ueberstand vor dem ersten Masten.
    const dx = lageOrtsnull(t);
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
  if (ui.el('legende')) zeichneLegende(app);
  // Die Blickrichtung wird beim ersten Setzen der Szene festgelegt; die
  // Werkzeugleiste muss danach wissen, welche gilt.
  if (ui.el('ebenen-tools')?.children.length) zeichneModellWerkzeuge(app);
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
    dialogAnker(app, typeof wert === 'string' ? wert : null);
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
    dialogTragwerk(app, istArt ? null : (typeof wert === 'string' ? wert : null),
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
    kontextZeigen(app, wert.bei, kontextTragwerk(app, wert.id));
    return;
  }
  if (key === 'kontextMast') {
    kontextZeigen(app, wert.bei, kontextMast(app, wert.id, werte.twId ?? 'T1'));
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
  if (ui.el('ebenen-tools')?.children.length) zeichneModellWerkzeuge(app);
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
// Zustaende der Zeichnung (Menue, Schieben, Ausrichten) - hier oben, damit
// app.zeichnung.js sie ueber das Kontextobjekt lesen und schreiben kann.
let zeichnungMenue = false;
let bildSchieben = null;     // { vorher: {s, x0, z0} }
let ausrichtung = null;   // { wahl, vorher, ziel?, frei?, punkte, nachMass? }


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
    n.querySelector('[data-kalib-ab]').onclick = () => kalibrierenEnde(app);
    n.querySelectorAll('[data-kalib-w]').forEach((b) => {
      b.onclick = () => kalibrierenStarten(app, b.dataset.kalibW);
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
    const ok = () => freiesMassUebernehmen(app, Number(String(inp.value).replace(',', '.')));
    n.querySelector('[data-kalib-ok]').onclick = ok;
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); ok(); }
      if (e.key === 'Escape') { e.preventDefault(); kalibrierenEnde(app); }
    });
    n.querySelector('[data-kalib-ab]').onclick = () => kalibrierenEnde(app);
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
        b.onclick = () => ausrichtenWaehlen(app, b.dataset.ausrW);
      });
      n.querySelector('[data-ausr-ab]').onclick = () => ausrichtenEnde(app, false);
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
    n.querySelector('[data-ausr-ab]').onclick = () => ausrichtenEnde(app, false);
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
    n.querySelector('[data-kalib-ab]').onclick = () => kalibrierenEnde(app);
    // Zurueck zur Frage, nicht zum anderen Mass: bei drei Bezuegen waere ein
    // Umschalter eine Rateschleife.
    n.querySelector('[data-kalib-bezug]')?.addEventListener(
      'click', () => kalibrierenStarten(app));
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
    n.querySelector('[data-bs-ok]').onclick = () => bildSchiebenEnde(app, false);
    n.querySelector('[data-bs-zur]')?.addEventListener(
      'click', () => bildSchiebenEnde(app, true));
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
      erkannt = null; kalibrierenStarten(app);
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
      zeichnungMenue = false; kalibrierenStarten(app);
    };
    n.querySelector('[data-z-schieb]').onclick = () => bildSchiebenStarten(app);
    n.querySelector('[data-z-ausr]').onclick = () => ausrichtenStarten(app);
    n.querySelector('[data-z-neu]').onclick = () => zeichnungWaehlen(app);
    n.querySelector('[data-z-weg]').onclick = () => zeichnungEntfernen(app);
    n.querySelector('[data-z-ab]').onclick = () => zeichnungMenueEnde(app);
    return;
  }
  if (setzen) {
    const st = setzen.stelle;
    if (!st) {
      n.hidden = false;
      const d = setzen.daneben;
      // Steht die Wahl schon fest, sagt der Balken ihren NAMEN - sonst weiss
      // man nach dem Ziehen nicht mehr, was gleich abgesetzt wird.
      const vw = setzen.vorwahl ? vorwahlName(app, setzen.vorwahl) : null;
      n.innerHTML = `<span>${setzen.hinweis
        ? esc(setzen.hinweis)
        : d
        ? `Dort ist <b>x = ${d.x.toFixed(2)} m</b>, <b>z = ${d.z.toFixed(2)} m</b>`
          + ' — auf das Joch oder einen Masten klicken'
        : vw
          ? `<b>${esc(vw)}</b> setzen — <b>ins Modell klicken</b>, wohin es gehört`
          : 'Bauteil setzen — <b>ins Modell klicken</b>, wohin es gehört'}</span>`
        + '<button class="btn btn-mini" data-setz-ab>Abbrechen</button>';
      n.querySelector('[data-setz-ab]').onclick = () => setzenEnde(app);
      return;
    }
    const wo = st.ort === 'joch'
      ? `am Joch bei <b>x = ${st.x.toFixed(2)} m</b>`
      : `am <b>Mast ${mastNameAmEnde(werte, tragwerkeVon(werte)[0], st.ort === 'mastA' ? 'A' : 'B')
          || (st.ort === 'mastA' ? 'Ende A' : 'Ende B')}</b>, `
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
    vorlagenFuer(app, st.ort).forEach(({ v, rolle }) => {
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
      + kopierbareHtml(app, st.ort);
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
      b.onclick = () => setzeVorlageAnStelle(app, b.dataset.setzVorlage);
    });
    n.querySelectorAll('[data-setz-kopie]').forEach((b) => {
      b.onclick = () => setzeKopieAnStelle(app, b.dataset.setzKopie);
    });
    n.querySelector('[data-setz-neu]').onclick = () => {
      setzen = { stelle: null }; zeichneBalken();
    };
    n.querySelector('[data-setz-ab]').onclick = () => setzenEnde(app);
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
    await zeichnungEinlegen(app, blob, 'eingefügt');
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
    await zeichnungEinlegen(app, blob, blob.name ?? 'Datei');
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
        let wert = inp.type === 'number' ? (parseFloat(inp.value) || 0) : inp.value;
        if (inp.dataset.vk === 'anzahl') wert = ui.anzahlZulaessig(wert);
        w.module[k] = { ...w.module[k], [inp.dataset.vk]: wert };
      });
      if (inp.dataset.vk === 'anzahl') {
        inp.addEventListener('change', () => {
          inp.value = ui.anzahlZulaessig(parseFloat(inp.value) || 0);
        });
      }
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
  if (kontextOffen()) { kontextSchliessen(app); return; }
  /*
   * ESC BEENDET DAS SCHIEBEN, ohne es zurueckzunehmen.
   *
   * Anders als beim Einmessen gibt es hier keinen halbfertigen Zustand:
   * das Bild liegt, wo es liegt. Wer die alte Lage zurueck will, druckt
   * «zurueck» im Balken - das steht daneben, solange etwas verschoben ist.
   */
  if (bildSchieben) { bildSchiebenEnde(app, false); return; }
  // Ausrichten und Einmessen haben einen halbfertigen Zustand - Esc nimmt
  // ihn zurueck, die Lage des Bildes bleibt, wie sie vorher war.
  if (ausrichtung) { ausrichtenEnde(app, false); return; }
  if (kalibrierung) { kalibrierenEnde(app); return; }
  const dlg = ui.el('ueberlagerung')?.firstElementChild;
  if (dlg) { dlg.querySelector('[data-zu]')?.click(); return; }
  if (schubladeIstOffen()) { schubladeSchliessen(app); return; }
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

/**
 * DAS EXPORT-MENUE (Weisung vom 19. September: «checke die com
 * schnittstelle lege alle relevanten buttons in einen export»).
 *
 * Vier Knoepfe - AxisVM, Bericht, Excel, Drucken - wurden einer. Das Menue
 * ist das Kontextmenue der Anwendung, unter dem Knopf aufgeklappt: gleiches
 * Schliessen, und es bleibt im Fenster. Die Formate von AxisVM oeffnen
 * denselben Dialog wie bisher, das gewaehlte schon angewaehlt -
 * Knotenmodell, Auflager und Starrelemente werden weiter dort gewaehlt.
 */
function exportMenue() {
  const ax = (f) => () => dialogAxisvm(app, f);
  return [
    { kopf: 'AxisVM' },
    { text: 'COM-Brücke (JSON), vollständig', tun: ax('json') },
    { text: 'SAF-Mappe (.xlsx)', tun: ax('saf') },
    { text: 'DXF + Zuordnungsmappe', tun: ax('dxf') },
    '-',
    { kopf: 'Gegenrechnung' },
    { text: 'PyNite-Skript (.py)', tun: ax('pynite') },
    '-',
    { kopf: 'Dokumente' },
    { text: 'Nachweisbericht (PDF)', tun: () => dialogBericht(app) },
    { text: 'Excel-Ausleitung (.xlsx)', tun: exportKlick },
    { text: 'Drucken', tun: () => handlung('Drucken', () => window.print()) },
  ];
}

/*
 * EIN ZWEITER KLICK SCHLIESST. Das Menue geht schon beim Druecken
 * ausserhalb zu - sein Horcher sitzt in der Einfangphase des DOKUMENTS und
 * feuert vor jedem Horcher am Knopf. Gemerkt wird deshalb eine Stufe
 * frueher, am FENSTER, und nur einmal angemeldet (`baueKopf` laeuft bei
 * jeder Eingabe und baut den Knopf neu).
 */
let exportWarOffen = false;
let exportHorcher = false;
function exportMenueVerdrahten(knopf) {
  if (!exportHorcher) {
    exportHorcher = true;
    window.addEventListener('pointerdown', (e) => {
      exportWarOffen = e.target instanceof Element
        && !!e.target.closest('#btn-ausleiten') && kontextOffen();
    }, true);
  }
  knopf.onclick = () => {
    if (exportWarOffen) { exportWarOffen = false; return; }
    const r = knopf.getBoundingClientRect();
    kontextZeigen(app, [r.left, r.bottom + 4], exportMenue());
  };
}

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
   *   AUSGABE      Export ▾                   was den Stand hinausträgt
   *   BEARBEITEN   Rückgängig · Wiederherstellen · Speichern
   *   HILFE        Handbuch · Optionen
   *
   * BAUTEILDATEN UND TASTENKUERZEL STEHEN UNTER OPTIONEN (Weisung vom
   * 17. September: «bauteildaten und tastenkürzel unter optionen führen»).
   * Beide sind Nachschlagen und Einrichten, nicht Arbeiten am Tragwerk; die
   * Tasten k und ? bleiben.
   *
   * AXISVM BLEIBT GANZ LINKS (Weisung vom 1. September): der meistbegangene
   * Weg der Anwendung. Seit dem 19. September («lege alle relevanten
   * buttons in einen export») steht dort EIN Knopf «Export» mit
   * Aufklappmenü - AxisVM (COM-Brücke, SAF, DXF), PyNite, Nachweisbericht,
   * Excel, Drucken -, AxisVM darin zuoberst (`exportMenue`). Der Installieren-Knopf steht nur, solange der Browser ihn
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
      `<button class="btn-icon btn-icon-text btn-icon-acc" id="btn-ausleiten" type="button"
         title="Export: AxisVM (COM-Brücke, SAF, DXF), PyNite, Nachweisbericht, Excel, Drucken"
         aria-label="Export" aria-haspopup="menu">${icon('export')}<span>Export</span
         ><span class="tb-pfeil" aria-hidden="true">▾</span></button>`)
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
  ui.el('btn-handbuch').onclick = () => dialogHandbuch(app);
  exportMenueVerdrahten(ui.el('btn-ausleiten'));
  ui.el('btn-speichern').onclick = () => ablageSpeichern(app, false);
  ui.el('btn-optionen').onclick = () => dialogOptionen(app);
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
    tun: () => (setzen ? setzenEnde(app) : setzenStarten(app)) },
  { id: 'naechstes', taste: 'n', text: 'Nächstes Tragwerk rechnen',
    tun: () => naechstesTragwerk() },

  { gruppe: 'Fenster' },
  { id: 'ablage', taste: 'p', text: 'Projektablage', tun: () => schubladeUmschalten(app) },
  { id: 'optionen', taste: 'o', text: 'Optionen', tun: () => dialogOptionen(app) },
  { id: 'bauteildaten', taste: 'k', text: 'Bauteildaten',
    tun: () => dialogBauteildaten() },
  { id: 'handbuch', taste: 'h', text: 'Handbuch', tun: () => dialogHandbuch(app) },
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

  /*
   * >>> EIN FENSTER FUER DIE DATEN (Weisung, 20. September). <<<
   *
   * «das einlesen der daten ist etwas komplizier, können wir dies
   * vereinfachen.» Es gab zwei Tueren mit aehnlichen Namen: das
   * DATENPAKET (Optionen -> Datenbasis, ersetzt die ganze Basis) und das
   * EINLESEN (hier, je Sortiment mit Abgleich). Wer Daten hereinholen
   * wollte, musste erst wissen, welche der beiden gemeint ist.
   *
   * Jetzt steht beides hier: ansehen, einlesen, laden, sichern. Die
   * Optionen verweisen nur noch hierher.
   */
  const paketZeile = () => {
    const v = ausSpeicher();
    return `<p class="notiz dat-paket">${v
      ? `Datenpaket hinterlegt: <b>${esc(v.bezeichnung || 'ohne Bezeichnung')}</b>`
        + `${v.stand ? ` · Stand ${esc(v.stand)}` : ''}`
        + ' <button class="btn btn-mini btn-fail" type="button" '
        + 'data-paket-leeren>Hinterlegtes löschen</button>'
      : 'Kein Datenpaket hinterlegt — die Daten kommen aus den Dateien neben '
        + 'der Anwendung. Ohne sie (GitHub Pages, Bündel ohne Daten) braucht '
        + 'es eines.'}</p>`;
  };
  const koerper = () => paketZeile() + zeichneDaten(best, datenAnsicht.aktiv, opt());

  const d = dialog('Bauteildaten', koerper(),
    `<button class="btn" data-daten-einlesen>Einlesen …</button>
     <button class="btn" data-paket-laden>Datenpaket laden …</button>
     <button class="btn" data-paket-sichern>Datenpaket sichern</button>
     <button class="btn" data-daten-excel>Alle Tabellen als Excel</button>
     <button class="btn" data-zu>Schliessen</button>`, 'dialog-breit');

  const neu = () => {
    d.node.querySelector('.dialog-koerper').innerHTML = koerper();
    verdrahte();
  };
  function verdrahte() {
    const n = d.node;
    const leeren = n.querySelector('[data-paket-leeren]');
    if (leeren) leeren.onclick = () => { speicherLeeren(); neu(); };
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
  /*
   * LADEN NIMMT JEDE DATEI. `dateiAnnehmen` erkennt selbst, was es ist -
   * Datenpaket, Excel-Mappe, einzelnes Sortiment oder Projektablage - und
   * zeigt den passenden Dialog. Ein Knopf statt einer Entscheidung vorweg.
   */
  d.node.querySelector('[data-paket-laden]').onclick = () => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = '.json,.xlsx,application/json,'
      + 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    i.onchange = () => {
      const f = i.files?.[0];
      if (f) { d.zu(); dateiAnnehmen(f); }
    };
    i.click();
  };
  d.node.querySelector('[data-paket-sichern]').onclick = () => {
    try {
      const paket = paketAus(projekt.projekt || '');
      store.dateiSpeichern(JSON.stringify(paket, null, 1),
                           `${APP_NAME}_Datenpaket_${paket.stand}.json`);
    } catch (fehler) {
      alert(`Nichts zu sichern: ${fehler.message}`);
    }
  };
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
  zeichneModellWerkzeuge(app);
}

/** Die aufgetragene Groesse ueber ihre Nummer waehlen. */
function plotNummer(n) {
  const mo = MODI[n - 1];
  if (!mo) return;
  ansicht.modus = mo.key;
  ansicht.zeichne(); zeichneLegende(app); zeichneModellWerkzeuge(app);
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


/** Ist eine Seite eingeklappt? */
const zuSeite = { links: false, rechts: false };


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
    setzenStarten(app, { art, id });
    const w = ansicht.weltAusZeiger(e);
    const st = w ? stelleAus(app, w) : null;
    if (st) { setzen = { ...setzen, stelle: st }; setzeVorwahlAnStelle(app); }
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
  return t ? (Number(lageOrtsnull(t)) || 0) : 0;
}

/** Auf ein Tragwerk fahren - dieselbe Rechnung wie der Knopf «Teilübersicht». */
function zoomAufTragwerk(id) {
  const t = tragwerkeSortiert(werte).find((x) => x.id === id);
  if (!t) return;
  const x0 = lageOrtsnull(t);
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
  /*
   * Weisung vom 19. September: «dafür sorgen das es nicht schliesst wenn man
   * mit der maus den klick loslässt und nicht innerhalb des modals ist».
   * Ein `click` trifft den gemeinsamen Vorfahren von Drücken und Loslassen -
   * wer in einem Feld Text markiert und die Maus über den Rand hinauszieht,
   * löste damit einen Klick auf den Schleier aus und verlor den Dialog.
   * Geschlossen wird nur, wenn Drücken UND Loslassen auf dem Schleier liegen.
   */
  const scrim = n.querySelector('.scrim');
  let aufSchleierGedrueckt = false;
  scrim.onpointerdown = (e) => { aufSchleierGedrueckt = e.target === scrim; };
  scrim.onclick = (e) => {
    const zuMachen = aufSchleierGedrueckt && e.target === scrim;
    aufSchleierGedrueckt = false;
    if (zuMachen) zu();
  };
  return { node: n, zu };
}


/**
 * ALLE ANBAUTEILE ENTFERNEN - mit Rückfrage, und getrennt nach Joch und
 * Masten, wenn es beides gibt: wer das Joch neu bestücken will, will die
 * Traverse am Masten meist behalten.
 */
function anbauteileAlleEntfernen() {
  const liste = werte.anbauteile ?? [];
  if (!liste.length) return;
  const amMasten = (a) => (a.ort ?? 'joch') !== 'joch';
  const nJoch = liste.filter((a) => !amMasten(a)).length;
  const nMast = liste.length - nJoch;
  const beides = nJoch > 0 && nMast > 0;
  const d = dialog('Anbauteile entfernen', `
    <p>${liste.length} Anbauteil(e) an diesem Tragwerk${beides
      ? ` — ${nJoch} am Joch, ${nMast} am Masten` : ''}.</p>
    <p class="notiz">Rückgängig (Strg+Z) holt sie zurück.</p>`,
    `${beides ? '<button class="btn" data-joch>Nur die am Joch</button>' : ''}
     <button class="btn" data-zu>Abbrechen</button>
     <button class="btn btn-acc" data-alle>Alle entfernen</button>`);
  const weg = (behalten) => {
    d.zu();
    handlung('Anbauteile entfernen', () => setzeAnbauteile(liste.filter(behalten)));
  };
  d.node.querySelector('[data-alle]').onclick = () => weg(() => false);
  const j = d.node.querySelector('[data-joch]');
  if (j) j.onclick = () => weg(amMasten);
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
    const s = await sichereAktuell(app, neu, ui.el('d-bem').value);
    d.zu();
    meldeImBalken(`Gespeichert: ${s.projekt ? `${s.projekt} · ` : ''}${s.name}`);
    if (schubladeIstOffen()) zeichneSchublade(app);
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
  kalibrierenEnde(app);
  neuRechnen();
  // Ein frisch begonnenes Tragwerk hat nichts Ungesichertes - es ist nur
  // noch nicht in der Ablage, und das sagt der Titel des Knopfes.
  markiereGesichert();
  zeichneModellWerkzeuge(app);
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
    try { await dialogEinlesen(app, roh, { dateiname: datei.name }); }
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
    /*
     * >>> WAS FEHLT, IST WICHTIGER ALS WAS DRIN IST (20. September). <<<
     *
     * Gemeldet: «hier im browser zeigt es die windlast an wenn ich aber die
     * app über github laufen lasse nicht.» Auf GitHub Pages liegt kein
     * `data/`; die Datenbasis kommt allein aus dem Paket. Ein ÄLTERES
     * Paket ohne Masttypen laedt dann klaglos - und der Mastwind fehlt,
     * weil die Normprofile keine Windzeile tragen.
     *
     * Der Dialog zaehlt bisher auf, was enthalten ist. Wer nicht weiss,
     * dass es Masttypen geben muesste, sieht ihr Fehlen nicht.
     */
    const fehlend = ['masten', 'anker', 'abfangjoche']
      .filter((k) => !p.teile.some((x) => x.key === k));
    const fehltText = fehlend.length
      ? '<p class="notiz warn">Nicht enthalten: '
        + fehlend.map((k) => esc({ masten: 'Masttypen — dann fehlt die '
            + 'Windlast auf den Masten', anker: 'Zug- und Druckstützen',
            abfangjoche: 'Abfangjochtypen' }[k])).join(' · ')
        + '. Ein neu gesichertes Paket enthält sie.</p>'
      : '';
    const d = dialog('Datenpaket laden', kopf +
      `<p>Enthalten: ${p.teile.map((x) => `<b>${x.anzahl}</b> ${esc(x.einheit)}`)
         .join(' · ')}${obj.stand ? ` · Stand ${esc(obj.stand)}` : ''}.</p>`
      + fehltText +
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
    try { await dialogEinlesen(app, roh, { dateiname: datei.name }); }
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
    zeichneSchublade(app);
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
    zeichneSchublade(app);
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
  ui.el('st-db').textContent = ui.datenbankText(stand, dbFehler, !mastenDbDa());
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
      zeigeFeld(app, feld);
    },
    /*
     * MAST ANGEKLICKT: auf seine Eingabe springen.
     *
     * Ende B fuehrt auf sein eigenes Feld, sofern der zweite Mast eingeschaltet
     * ist - sonst gaebe es dort ein Feld, das gar nicht sichtbar ist, und der
     * Sprung liefe ins Leere. Dann gilt der erste Mast fuer beide Enden, und
     * dessen Hoehe ist die richtige Stelle.
     */
    beiMast: (ende) => zeigeFeld(app, 
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
    beiKontext: (k) => kontextImModell(app, k),
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
  ui.setzeSortimentSuche(() => dialogSortiment(app));
  ui.setzeAnbauHandler({
    /*
     * EIN WEG ZUM SETZEN, NICHT ZWEI.
     *
     * Der Klick auf eine Kachel fragte bisher in einem Dialog nach der Lage
     * x - und konnte damit grundsaetzlich nur ans JOCH setzen. Am Masten
     * gibt es kein x. Jetzt fuehrt er dorthin, wo auch das Ziehen hinfuehrt:
     * Bauteil vorgewaehlt, ein Klick ins Modell setzt es.
     */
    wahl: (id) => setzenStarten(app, { art: 'vorlage', id }),
    weg: vorlageEntfernen,
    sichern: vorlageSichern,
    generator: dialogGenerator,
    zoom: zoomAufAnbauteil,
    bearbeiten: dialogVorlageBearbeiten,
    duplizieren: (i) => anbauteilDuplizieren(app, i),
    alleWeg: anbauteileAlleEntfernen,
    kontext: (i, bei) => kontextZeigen(app, bei, kontextAnbauteil(app, i)),
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
  ui.el('btn-projekt').onclick = () => schubladeUmschalten(app);
  // Ein Klick daneben schliesst die Schublade wieder - sie ist kein Fenster,
  // das man wegräumen muss.
  document.addEventListener('pointerdown', (e) => {
    if (!schubladeIstOffen()) return;
    if (e.target.closest('#bannerschublade') || e.target.closest('#btn-projekt')) return;
    schubladeSchliessen(app);
  });
  document.addEventListener('keydown', tastendruck);
  baueLayout(app);
  baueModellWerkzeuge(app);
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
    case 'ablage': schubladeUmschalten(app); break;
    case 'handbuch': dialogHandbuch(app); break;
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
