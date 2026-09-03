/**
 * app.js
 * ---------------------------------------------------------------------------
 * VERDRAHTUNG. Hält Zustand und Ereignisse, ruft Rechenkern und Ansichten.
 * Enthält selbst weder Rechnung noch Geometrie noch Layout-Regeln.
 * ---------------------------------------------------------------------------
 */

import { getProfil, getStahl } from './data.profiles.js';
import { ladeDatenbank, getTragjoch, tragjoche, pruefeDatenbank,
         datenbankStand, laengenbereich } from './data.tragjoche.js';
import { berechne, modell, modellEinzelmast,
         vergleichMassvarianten, vergleichKombinationen,
         schnittstellen, auflagerBlatt } from './core.vierendeel.js';
import { konstruktionsChecks, fluchtChecks, hinweise, urteilKonstruktion,
         klassifizierung } from './core.checks.js';
import { spannweiteImSortiment, NORMENSAETZE, erkenneNormensatz,
         lastfaelle, ekVonWindklasse } from './core.lasten.js';
import { diagramme } from './render.charts.js';
import { erzeugeSzene, szeneVerschieben, szenenVereinen,
         Modellansicht, ANSICHTEN, MODI,
         LASTARTEN } from './render.3d.js';
import { exportiere } from './export.bericht.js';
import { exportiereAxisvm, exportiereDxf, exportiereJson,
         KNOTENMODELLE, AUFLAGERMODELLE, auflagerVorgabe } from './export.axisvm.js';
import { exportierePynite } from './export.pynite.js';
import { verortung, fangeAufMasskette,
         tauscheAktives, tragwerkHinzu, tragwerkWeg, tragwerksart,
         MASTFELDER, setzeMastAngabe, rechensatz,
         tragwerkeSortiert, tragwerkSatz, lageVon,
         tragwerkeVon, mastenFuer,
         blattNachLokal, lokalNachBlatt, tragwerkBeiX,
         anbauteileFuer, setzeAnbauteileAn, freieLage, freieLaenge, versteckt,
         mastenVon, mastName, tragwerkName, aufRaster, TRAGWERKSARTEN,
         mastZeichenplan,
         gewaehlterMast }
  from './core.constants.js';
import { passeTraegerAn, hatTraeger } from './core.anbauteile.js';
// STATISCH, nicht per import(): der Buendler folgt nur festen Importen,
// und in der eigenstaendigen Datei gibt es keine Module mehr, die sich
// zur Laufzeit nachladen liessen.
import { verkleinere, bildAusEreignis, kalibriere,
         bezugPunkte } from './bild.zeichnung.js';
import { erkenneTragwerk } from './bild.erkennung.js';
import { handbuchHtml, handbuchDatei } from './doku.handbuch.js';
import { standardwerte, typUebernehmen, setzeTypOptionen,
         setzeGrenzen, FELDER } from './ui.schema.js';
import { uebertrageTokens, iconKnopf, esc, icon, abschnitt,
         MASS, FARBEN as farben } from './design.js';
import { ladeAnbauteile, neuesAnbauteil, vorlagen, getVorlage, alsVorlage,
         normalisiereAnbauteil,
         setzeEigeneVorlagen, erzeugeGleislasten, neuesModul,
         baugruppeSumme } from './data.anbauteile.js';
import { ladeFlBauteile, flBauteile, getFlBauteil } from './data.fl.js';
// Das Abfangjoch-Sortiment. Sein Fehlen ist kein Fehler - wer kein
// Abfangjoch auf dem Blatt hat, braucht es nicht.
import { ladeAbfangjoche, abfangjoche, abfangDbDa,
         abfangLaengenbereich } from './data.abfangjoche.js';
import { datenBereitstellen, paketAnwenden, paketAus, pruefePaket,
         speicherLeeren, ausSpeicher, PAKET_FORMAT } from './data.paket.js';
import { mastWind } from './data.masten.js';
import { mastImModell } from './core.auflager.js';
import { ablenkwinkel, radiusAusWinkel, istGerade,
         R_GERADE } from './core.trasse.js';
import { pwaEinrichten, kannInstallieren, installiere, alsProgramm,
         dateiEmpfang, startWunsch, netzZustand } from './pwa.js';
import { verlauf } from './verlauf.js';
import * as store from './store.js';
import * as ui from './ui.js';

const SPEICHER = 'tragjoch-stand-v2';
const VERSION = 'v2.0';

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
function frisch() {
  const std = { ...standardwerte(), bearbeiten: false };
  const w = typUebernehmen(std, getTragjoch(std.typ));
  w.anbauteile = [{ ...neuesAnbauteil('hs-fahrdraht', 10), name: 'Fahrleitung Gleis 1' }];
  return w;
}

function laden() {
  const std = { ...standardwerte(), bearbeiten: false };
  try {
    const roh = localStorage.getItem(SPEICHER);
    if (!roh) return frisch();
    const d = JSON.parse(roh);
    if (d.projekt) projekt = d.projekt;
    if (d.thema) thema = d.thema;
    const w = { ...std, ...(d.werte ?? d) };
    // Stände aus der Zeit vor den Anbauteilen kennen das Feld nicht.
    // Statt mit einem leeren Joch zu starten, wird der Beispielzustand geladen.
    if (!Array.isArray(w.anbauteile) || !w.anbauteile.length) {
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

function speichern() {
  try {
    entwurfTs = Date.now();
    localStorage.setItem(SPEICHER,
      JSON.stringify({ werte, projekt, thema, ts: entwurfTs }));
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
  setzeGrenzen(joch, werte.L);

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
            geo: ui.hebelarmUebersicht(letzte.erg),
            prof: ui.qskMarke(letzte.kl),
            blech: ui.blechUebersichtHtml(letzte.erg),
            stueck: ui.stuecklisteHtml(letzte.anzeige),
          } : {}),
          // Die Masten stehen bei JEDER Tragwerksart - sie sind das
          // Grundelement, nicht ein Zubehoer des Jochs.
          mast: ui.mastenUebersichtHtml(werte),
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
    const kombi = mitJoch
      ? vergleichKombinationen(rs, profOG, profUG, stahl, joch)
      : { huellkurve: null, ergebnisse: {}, lastfaelle: [] };
    const checks = mitJoch ? konstruktionsChecks(erg.modell) : [];
    // Die Fluchtkontrolle läuft weiter mit, wird aber nicht mehr angezeigt:
    // sie erklärt einen Versatz im Zehntelmillimeterbereich, der beim Arbeiten
    // nur stört. Sie gehört ins Handbuch, sobald es eines gibt. Der Wert bleibt
    // in der Excel-Ausleitung erhalten.
    const flucht = mitJoch ? fluchtChecks(erg.modell) : { warnungen: [] };
    const hinw = hinweise(erg.modell);
    const urteil = urteilKonstruktion(checks, werte.nachweise);
    const kl = mitJoch ? klassifizierung(erg.modell) : null;

    // Für Modell und Auswertung gilt die gewählte Anzeigequelle
    const anzeige = anzeigeKombi === 'umhuellend'
      ? (kombi.huellkurve ?? erg) : (kombi.ergebnisse?.[anzeigeKombi] ?? erg);

    // Das Auflagerblatt weist die Reaktionen des JOCHS aus. Ein Einzelmast
    // gibt seine Fussgroessen ueber den Mastnachweis aus, nicht hier.
    const auflager = mitJoch
      ? auflagerBlatt(werte, profOG, profUG, stahl, joch) : null;

    letzte = { erg, anzeige, vergleich, kombi, checks, auflager, mitJoch,
               warn: flucht.warnungen, hinw, kl, urteil };

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

function zeichneBuehne() {
  const n = ui.el('diagramm-buehne');
  const titel = { schnittgroessen: 'Schnittgrössen Ersatzbalken',
                  ebene: 'Ebenenquerkräfte', ausnutzung: 'Ausnutzung' };
  if (!buehne || !letzte) {
    n.hidden = true; n.innerHTML = '';
    return;
  }
  // Breite aus dem Fenster ableiten, damit das SVG die Fläche wirklich nutzt
  const breite = Math.max(520, Math.round(ui.el('viewer').clientWidth - 36));
  const dia = diagramme(letzte.anzeige, breite);
  n.hidden = false;
  n.innerHTML = `<div class="buehne-kopf">
      <span class="panel-titel">${esc(titel[buehne] ?? '')}</span>
      <button class="btn btn-mini" data-zurueck>Zurück zum Modell</button>
    </div><div class="buehne-koerper">${dia[buehne] ?? ''}</div>`;
  n.querySelector('[data-zurueck]').onclick = () => { buehne = null; zeichneBuehne(); };
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
    ui.el('tabs-auswertung').innerHTML = '';
    ui.zeichneEinzelmast(ui.el('auswertung'), letzte);
    return;
  }
  const { anzeige: erg, vergleich, kombi, checks, hinw, kl, urteil } = letzte;
  ui.zeichneTabs(ui.el('tabs-auswertung'), ui.AUSWERTUNG_TABS, tabAuswertung, (t) => {
    tabAuswertung = t; zeichneAuswertung();
  });
  const node = ui.el('auswertung');
  if (tabAuswertung === 'uebersicht') {
    ui.zeichneUebersicht(node, erg, urteil, springeZu, station, hinw);
  } else if (tabAuswertung === 'schnitt') {
    ui.zeichneSchnitt(node, erg, waehleSchnittfeld,
                      (o) => aendern('schnittOrientierung', o),
                      schnittUmschalten);
  } else if (tabAuswertung === 'auflager') {
    ui.zeichneAuflager(node, letzte.auflager, erg);
  } else {
    ui.zeichneVerlauf(node, diagramme(erg, 860), vergleich);
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
  const eigen = erzeugeSzene(
    { ...erg.modell, mastZeichnen: plan[aktivId] }, erg);
  const teile = alle.map((t) => {
    const dx = lageVon(t);
    if (t.id === aktivId) {
      return szeneVerschieben({ ...eigen, aktiv: true }, dx,
                              { twId: t.id, aktiv: true });
    }
    const sz = szeneVonNebenan(t, plan[t.id]);
    return sz ? szeneVerschieben(sz, dx, { twId: t.id, passiv: true }) : null;
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
  const e = erg.max.etaGesamt;
  // DIESELBE REGEL WIE OBEN IM URTEIL. Sie liefen auseinander: die Fussleiste
  // sagte «Nachweis nicht erfuellt», waehrend das Urteil gruen dastand - eine
  // Klemme zehn Zentimeter zu weit rechts genuegte. Zwei Anzeigen derselben
  // Sache, die einander widersprechen, sind schlimmer als eine.
  const gut = e <= 1 && urteil.bindendVerletzt !== true;
  const farbe = gut ? 'var(--ok)' : 'var(--fail)';
  ui.el('st-urteil').innerHTML =
    `<span class="pkt" style="background:${farbe}"></span>` +
    `${gut ? 'Alle Nachweise erfüllt' : 'Nachweis nicht erfüllt'} · η = ${e.toFixed(3)}`;
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
      ? `${mast.profil.name} · ${mast.H.toFixed(2)} m bis Anschluss`
        + ` · ${mast.stegrichtung.label ?? mast.stegrichtung.key}`
      : 'Kein Mastprofil gewählt';
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

function aendern(key, wert) {
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
    const vorgabe = {};
    if (art === 'abfangjoch' && abfangDbDa()) {
      const erst = abfangjoche()[0];
      // In SEIN Feld, nicht in `typ` - dort holt der Rechenkern sein
      // Tragjoch, und ein «A160» wirft dort «Unbekannter Tragjochtyp».
      vorgabe.abfangTyp = erst.typ;
      const b = abfangLaengenbereich(erst);
      vorgabe.L = Math.min(Math.max(Number(werte.L) || b.min, b.min), b.max);
    }
    werte = typeof wert === 'string'
      ? tragwerkHinzu(werte, wert, vorgabe)
      : tragwerkHinzu(werte, wert.art, { ...vorgabe, xLage: wert.xLage });
    mastNachfuehren();
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
  if (key === 'tragwerkMasten') {
    if ((werte.twId ?? 'T1') !== wert) werte = tauscheAktives(werte, wert);
    werte = { ...werte, mastVorhanden: werte.mastVorhanden === false };
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

function setzeAnbauteile(liste) {
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
    const html = handbuchDatei({ fussnote: `Tragjoch ${VERSION}`,
                                 tokens: farbtokens('hell') });
    store.dateiSpeichern(html, `Tragjoch_Handbuch_${new Date().toISOString().slice(0, 10)}.html`,
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
    `<button class="btn" data-thema>${thema === 'dunkel' ? 'Helle' : 'Dunkle'} Darstellung</button>
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
    const sichern = rahmen.querySelector('[data-daten-sichern]');
    if (sichern) sichern.onclick = () => {
      try {
        const paket = paketAus(projekt.projekt || '');
        store.dateiSpeichern(JSON.stringify(paket, null, 1),
                             `Tragjoch_Datenpaket_${paket.stand}.json`);
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
 * geben. Es bekommt deshalb sofort eine VORLÄUFIGE: auf die Jochlänge
 * gestreckt, mittig. Von dort setzen es zwei Klicks genau.
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

/** Vorläufige Lage: das Bild auf die Jochlänge gestreckt, um das Joch herum. */
function vorlaeufigeLage(m, breite, hoehe) {
  const L = m?.L > 0 ? m.L : 20;
  /*
   * AN EINEM WIRKLICHEN QUERPROFIL ABGESCHAUT.
   *
   * Ein A4-Blatt zeigt nicht das Joch, sondern die Szene: Masten, Gleise,
   * Lichtraumprofile, Schriftfeld und Legende. Das Joch nimmt darauf grob
   * die halbe Blattbreite ein - streckte man das ganze Bild auf die
   * Jochlänge, läge es winzig in der Mitte.
   *
   * Und es sitzt OBEN, nicht mittig: gemessen rund ein Fünftel unter der
   * Blattkante. Beides ist nur die Ausgangslage für die zwei Klicks - aber
   * eine, bei der man das Joch gleich sieht, statt es erst suchen zu müssen.
   */
  const s = (2 * L) / breite;
  return { s, x0: -L / 2, z0: (hoehe * s) * 0.22 };
}

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
        : vorlaeufigeLage(letzte?.erg?.modell, roh.breite, roh.hoehe),
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
    const welt = bezugPunkte('joch', letzte?.erg?.modell);
    const k = t && welt && t.guete >= ERKENNUNG_GRENZE
      ? kalibriere(t.p1, t.p2, welt[0], welt[1]) : null;
    // Der Zeichnungsknopf und die Ebenengruppe aendern sich mit dem Bild:
    // vorher «Zeichnung…» und zwei graue Schalter, jetzt beides scharf. Ohne
    // dieses Nachzeichnen behauptete der Knopf weiter, es gebe keine.
    baueModellWerkzeuge();
    if (k) {
      ansicht.zeichnung.kalibrierung = k;
      ansicht.zeichnung.vorlaeufig = false;
      ansicht.zeichne();
      erkannt = { guete: t.guete };
      zeichneBalken();
      await zeichnungSichernFallsMoeglich();
      return;
    }
    await zeichnungSichernFallsMoeglich();
    kalibrierenStarten('joch');
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

function kalibrierenStarten(bezugKey) {
  const welt = bezugPunkte(bezugKey, letzte?.erg?.modell);
  if (!welt || !ansicht.zeichnung) { kalibrierenEnde(); return; }
  kalibrierung = { bezug: bezugKey, welt, punkte: [] };
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
  kalibrierung.punkte.push(t);
  if (geraet) ansicht.kalibrierPunkte = [...ansicht.kalibrierPunkte, geraet];
  if (kalibrierung.punkte.length < 2) { zeichneBalken(); ansicht.zeichne(); return; }
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

function setzenStarten(vorwahl = null) {
  if (kalibrierung) kalibrierenEnde();
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
  if (xl >= -0.3 && xl <= L + 0.3 && Math.abs(w.z) <= h / 2 + 0.6) {
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
  if (H > 0 && (nahA || nahB) && w.z < oben - H - (h / 2) + 1e-9) {
    // AUF DEN SCHRITT DES REGLERS GERUNDET (5 cm). Sonst zeigt die Karte
    // eine andere Zahl an, als der Klick gesetzt hat - der Regler rastet
    // auf seinen Schritt, und der Anwender sieht 5.20, wo 5.15 steht.
    const hM = Math.max(0, Math.min(oben, w.z + H));
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
  if (st.ort === 'joch') ansicht.zoomAuf(t.x, null, Math.max(2, werte.L / 8));
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
function meldeImBalken(text) {
  const n = ui.el('viewer-balken');
  if (!n) return;
  n.hidden = false;
  n.innerHTML = `<span>${esc(text)}</span>`
    + '<button class="btn btn-mini" data-meldung-zu>Schliessen</button>';
  n.querySelector('[data-meldung-zu]').onclick = () => zeichneBalken();
}

function zeichneBalken() {
  const n = ui.el('viewer-balken');
  if (!n) return;
  const canvas = ui.el('canvas3d');
  if (kalibrierung && ansicht.zeichnung) {
    const i = kalibrierung.punkte.length;
    const w = kalibrierung.welt[i];
    n.hidden = false;
    n.innerHTML = `<span>Zeichnung einmessen — <b>${esc(w.text)}</b> anklicken`
      + ` (${i + 1}/2)</span>`
      + '<button class="btn btn-mini" data-kalib-bezug>anderes Mass</button>'
      + '<button class="btn btn-mini" data-kalib-ab>Abbrechen</button>';
    if (canvas) canvas.style.cursor = 'crosshair';
    n.querySelector('[data-kalib-ab]').onclick = () => kalibrierenEnde();
    n.querySelector('[data-kalib-bezug]').onclick = () =>
      kalibrierenStarten(kalibrierung.bezug === 'joch' ? 'mast' : 'joch');
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
    n.innerHTML = '<span>Zeichnung selbst eingemessen, die beiden Masten '
      + 'heben sich ab (nächster Strich '
      + `${Math.round(erkannt.guete * 100)} % kürzer). <b>Sitzt sie?</b></span>`
      + '<button class="btn btn-mini" data-erk-ok>passt</button>'
      + '<button class="btn btn-mini" data-erk-hand>von Hand einmessen</button>';
    n.querySelector('[data-erk-ok]').onclick = () => { erkannt = null; zeichneBalken(); };
    n.querySelector('[data-erk-hand]').onclick = () => {
      erkannt = null; kalibrierenStarten('joch');
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
       * Ein frisch eingelegtes Bild liegt vorlaeufig da - auf die Jochlaenge
       * gestreckt, mittig. Gerade dort will man es zurechtruecken. Am
       * Zustand aendert das nichts: «noch nicht eingemessen» steht weiter
       * daneben, denn geschoben ist nicht gemessen.
       */
      + '<button class="btn btn-mini" data-z-schieb>Verschieben</button>'
      + '<button class="btn btn-mini" data-z-mess>Neu einmessen</button>'
      + '<button class="btn btn-mini" data-z-neu>Bild ersetzen</button>'
      + '<button class="btn btn-mini btn-fail" data-z-weg>Entfernen</button>'
      + '<button class="btn btn-mini" data-z-ab>Abbrechen</button>';
    n.querySelector('[data-z-mess]').onclick = () => {
      zeichnungMenue = false; kalibrierenStarten('joch');
    };
    n.querySelector('[data-z-schieb]').onclick = () => bildSchiebenStarten();
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
    n.innerHTML = `<span>Was kommt ${wo}?</span><div class="balken-wahl">${spalten}</div>`
      + '<button class="btn btn-mini" data-setz-neu>andere Stelle</button>'
      + '<button class="btn btn-mini" data-setz-ab>Abbrechen</button>';
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
  const liste = [...(werte.eigeneVorlagen ?? []), alsVorlage(a, name)];
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
    const liste = istKopie
      ? [...(werte.eigeneVorlagen ?? []), eintrag]
      : (werte.eigeneVorlagen ?? []).map((x) => (x.id === v.id ? eintrag : x));
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
  ansicht.zoomAuf(x, st);
  neuRechnen();
}

// --- Werkzeugleisten --------------------------------------------------------

function baueKopf() {
  const n = ui.el('kopf-werkzeuge');
  // Nur noch was mit dem AKTUELLEN Stand zu tun hat: ausleiten, drucken,
  // einstellen. Neu, Speichern und die Ablage sind in die Bannerschublade
  // gewandert - sie gehören zum Projekt, nicht zum Werkzeugkasten, und dort
  // stehen sie gemeinsam mit den Vorlagen.
  n.innerHTML =
    // GANZ LINKS, VOR ALLEM ANDEREN (Weisung). Beschriftet und hervorgehoben
    // war er schon; als eines von sieben gleich aussehenden Symbolen war er
    // vorher gar nicht zu finden. Der meistbegangene Weg dieser Anwendung
    // steht jetzt an erster Stelle - auch vor dem Installieren-Knopf, der
    // ohnehin nur zeitweise da ist und ihn sonst verschieben würde.
    `<button class="btn-icon btn-icon-text btn-icon-acc" id="btn-axisvm" type="button"
       title="Modell nach AxisVM ausleiten, COM-Brücke, SAF, DXF oder PyNite"
       aria-label="AxisVM-Ausleitung">${icon('schnitt')}<span>AxisVM</span></button>` +
    // Der Installieren-Knopf steht nur da, solange der Browser ihn anbietet:
    // nicht angemeldet, schon installiert oder abgelehnt - dann fehlt er.
    (kannInstallieren()
      ? iconKnopf('btn-install', 'installieren',
                  'Auf diesem Gerät installieren - läuft danach auch ohne Netz')
      : '') +
    // Rueckgaengig / Wiederherstellen. Sie stehen bei den Werkzeugen und nicht
    // in einem Menue: man greift danach, ohne hinzusehen.
    `<button class="btn-icon" id="btn-zurueck" type="button" title="Rückgängig (Strg+Z)"
       aria-label="Rückgängig"${hist.kannZurueck() ? '' : ' disabled'}
       >${icon('links')}</button>` +
    `<button class="btn-icon" id="btn-vor" type="button"
       title="Wiederherstellen (Strg+Umschalt+Z)" aria-label="Wiederherstellen"${
       hist.kannVor() ? '' : ' disabled'}>${icon('rechts')}</button>` +
    iconKnopf('btn-handbuch', 'info', 'Handbuch: Herleitung und Modellgrenzen') +
    iconKnopf('btn-export', 'export', 'Excel-Ausleitung (.xlsx)') +
    iconKnopf('btn-drucken', 'drucken', 'Drucken / PDF') +
    // SPEICHERN, nicht Datenbasis (Weisung, 1. September): das Zeichen war
    // eine Diskette und stand fuer den Austausch der Typendatenbank. Wer
    // in einer Anwendung auf eine Diskette drueckt, will sein Modell
    // sichern. Die Datenbasis steht jetzt unter Optionen.
    iconKnopf('btn-speichern', 'speichern', 'Tragwerk in der Ablage speichern') +
    iconKnopf('btn-optionen', 'optionen', 'Optionen und Darstellung');

  if (kannInstallieren()) ui.el('btn-install').onclick = () => installiere();
  ui.el('btn-zurueck').onclick = () => rueckgaengig();
  ui.el('btn-vor').onclick = () => wiederherstellen();
  ui.el('btn-handbuch').onclick = dialogHandbuch;
  ui.el('btn-export').onclick = exportKlick;
  ui.el('btn-axisvm').onclick = dialogAxisvm;
  ui.el('btn-drucken').onclick = () => handlung('Drucken', () => window.print());
  ui.el('btn-speichern').onclick = () => dialogSpeichern();
  ui.el('btn-optionen').onclick = dialogOptionen;
  /*
   * DER BEZUGSPUNKT WIRD NUR EINMAL GESETZT.
   *
   * `baueKopf` laeuft bei JEDER Aenderung - es zeichnet den Kopf neu. Stuende
   * `markiereGesichert()` unbedingt hier, setzte sich die Signatur bei jeder
   * Eingabe auf den eben getippten Stand, und nichts waere je ungesichert.
   * Beim ersten Durchgang ist sie null; nur dann greift die Zeile.
   */
  if (gesicherteSignatur === null) markiereGesichert();
  else zeigeSpeicherstand();
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

async function zeichneSchublade() {
  const n = ui.el('bannerschublade');
  n.classList.remove('zu');      // falls sie noch am Zufahren war
  n.hidden = false;
  ui.el('btn-projekt').classList.add('offen');
  n.innerHTML = '<p class="notiz">Ablage wird gelesen …</p>';

  let gruppen = [], vorlagen = [], fehler = '';
  try {
    gruppen = await store.nachProjekt();
    vorlagen = await store.vorlagenListe();
  } catch (e) { fehler = e.message; }
  if (!schubladeOffen) return;

  /*
   * WORAN MAN EIN TRAGWERK WIEDERERKENNT.
   *
   * Die Zeile trug Typ, Laenge, Ausnutzung und Datum. Das beschreibt die
   * RECHNUNG; gesucht wird aber nach dem ORT. Ein J90 ueber 15.5 m gibt es
   * dutzendfach, den Kilometer 16.661 auf Linie 600 genau einmal.
   *
   * Voran stehen deshalb Linie und Kilometer, dann die Ortschaft, danach
   * erst die Rechenwerte. Sie kommen aus den Eingabewerten des Eintrags -
   * `liste()` liefert sie ohnehin mit, es braucht keinen zweiten Zugriff.
   */
  const ort = (e) => {
    const w = e.werte ?? {};
    const km = String(w.km ?? '').trim();
    return [String(w.linie ?? '').trim(),
            km ? `km ${km}` : '',
            String(w.ortschaft ?? '').trim()].filter(Boolean).join(' · ');
  };
  const rechnung = (e) => [
    e.kennwerte?.typ,
    e.kennwerte?.L ? `${e.kennwerte.L.toFixed(2)} m` : '',
    e.kennwerte?.eta ? `η ${e.kennwerte.eta.toFixed(3)}` : '',
    new Date(e.geaendert).toLocaleDateString('de-CH'),
  ].filter(Boolean).join(' · ');
  const meta = (e) => [ort(e), rechnung(e)].filter(Boolean).join('  |  ');

  const projekteHtml = fehler
    ? `<div class="fehlerbox">Ablage nicht verfügbar: ${esc(fehler)}</div>`
    : (gruppen.length ? gruppen.map((g) => `
        <div class="ablage-gruppe">
          <div class="sec">${esc(g.projekt)}
            <button class="btn btn-mini sec-btn" data-projekt-um="${esc(g.projekt)}"
                    title="Projekt umbenennen, alle ${g.eintraege.length} Einträge">${icon('bearbeiten', 11)}</button>
            <span class="sec-r">${g.eintraege.length}</span></div>
          ${g.eintraege.map((e) => `
            <div class="ablage-zeile${e.id === projekt.id ? ' aktiv' : ''}" data-id="${e.id}">
              <div class="ablage-name"><b>${esc(e.name)}</b>
                <div class="ablage-meta">${esc(meta(e))}</div></div>
              <button class="btn btn-mini" data-laden="${e.id}">Laden</button>
              <button class="btn btn-mini" data-um="${e.id}"
                      title="Umbenennen oder anderem Projekt zuordnen">${icon('bearbeiten', 11)}</button>
              <button class="btn btn-mini" data-kopie="${e.id}">Kopie</button>
              <button class="btn btn-mini btn-fail" data-loeschen="${e.id}">×</button>
            </div>`).join('')}
        </div>`).join('')
      : '<p class="notiz">Noch keine Einträge in der Ablage.</p>');

  const vorlagenHtml = vorlagen.length ? vorlagen.map((v) => `
      <div class="ablage-zeile" data-id="${v.id}">
        <div class="ablage-name"><b>${esc(v.name)}</b>
          <div class="ablage-meta">${esc(v.bemerkung || meta(v))}</div></div>
        <button class="btn btn-mini" data-vorlage-an="${v.id}">Anwenden</button>
        <button class="btn btn-mini btn-fail" data-vorlage-weg="${v.id}">×</button>
      </div>`).join('')
    : '<p class="notiz">Noch keine Vorlagen. «Als Vorlage sichern» legt den ' +
      'jetzigen Aufbau ohne die Jochlänge ab.</p>';

  n.innerHTML = `
    <div class="bs-kopf">
      <button class="btn" data-neu>${icon('neu', 13)} Neues Tragjoch</button>
      <button class="btn btn-acc" data-speichern>${icon('speichern', 13)} In Ablage speichern</button>
      <button class="btn" data-vorlage-neu>Als Vorlage sichern</button>
      <button class="btn btn-mini bs-zu" data-zu>Schliessen</button>
    </div>
    <div class="bs-spalten bs-drei">
      <div>
        ${abschnitt('Dieses Tragwerk', 'wo es steht. Geht in keine Rechnung ein')}
        <div class="bs-jetzt">
          <div class="bs-jetzt-name">${icon('projekte', 13)}
            <span>${esc(projekt.projekt || 'Ohne Projekt')}</span>
            · <b>${esc(projekt.name)}</b></div>
        </div>
        <div id="bs-verortung">${ui.verortungHtml(werte)}</div>
        <p class="notiz">Linie, Ortschaft und Kilometer stehen im Dateinamen der
          AxisVM-Ausleitung und in der Kopfzeile des Berichts, in dieser
          Reihenfolge.</p>
      </div>
      <div>${abschnitt('Projekte und gespeicherte Joche',
                       'laden ersetzt den jetzigen Stand')}${projekteHtml}
        <div class="lf-fuss">
          <button class="btn btn-mini" data-import>Datei einlesen</button>
          <button class="btn btn-mini" data-export>Alles ausleiten</button>
        </div>
      </div>
      <div>${abschnitt('Vorlagen ganzer Tragwerke', 'anwenden legt sich auf den Stand')}
        ${vorlagenHtml}
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

  const auf = (wahl, fn) => n.querySelectorAll(wahl).forEach((b) => { b.onclick = () => fn(b); });
  auf('[data-zu]', schubladeSchliessen);
  auf('[data-neu]', () => { schubladeSchliessen(); neuesTragjoch(); });
  auf('[data-speichern]', () => { schubladeSchliessen(); dialogSpeichern(); });
  auf('[data-vorlage-neu]', dialogTragwerkVorlage);
  auf('[data-laden]', async (b) => {
    const s = await store.laden(b.dataset.laden);
    werte = { ...standardwerte(), ...s.werte, bearbeiten: false };
    werte.anbauteile = (werte.anbauteile ?? []).map(normalisiereAnbauteil);
    projekt = { id: s.id, name: s.name, projekt: s.projekt };
    station = null;
    // Frisch geladen heisst: der Stand entspricht der Ablage.
    markiereGesichert();
    schubladeSchliessen();
    // Die hinterlegte Zeichnung gehört zum Tragwerk und kommt mit ihm.
    await zeichnungHolen(s.id);
    neuRechnen();
    zeichneModellWerkzeuge();
    ansicht.ganzesJoch();
  });
  auf('[data-kopie]', async (b) => {
    await store.duplizieren(b.dataset.kopie); zeichneSchublade();
  });
  auf('[data-um]', async (b) => {
    const s = await store.laden(b.dataset.um);
    dialogUmbenennen(s);
  });
  auf('[data-projekt-um]', (b) => dialogProjektUmbenennen(b.dataset.projektUm));
  auf('[data-loeschen]', async (b) => {
    if (!confirm('Diesen Eintrag löschen?')) return;
    await store.loeschen(b.dataset.loeschen);
    if (projekt.id === b.dataset.loeschen) projekt.id = null;
    zeichneSchublade();
  });
  auf('[data-vorlage-an]', async (b) => {
    const v = await store.vorlageLaden(b.dataset.vorlageAn);
    if (!confirm(`Vorlage «${v.name}» anwenden? Profile, Trasse, Anbauteile und ` +
                 'Lastfälle werden übernommen; die Jochlänge bleibt.')) return;
    werte = { ...werte, ...v.werte, bearbeiten: false };
    werte.anbauteile = (werte.anbauteile ?? []).map(normalisiereAnbauteil);
    setzeEigeneVorlagen(werte.eigeneVorlagen ?? []);
    station = null;
    schubladeSchliessen();
    neuRechnen();
  });
  auf('[data-vorlage-weg]', async (b) => {
    if (!confirm('Diese Vorlage löschen?')) return;
    await store.vorlageLoeschen(b.dataset.vorlageWeg);
    zeichneSchublade();
  });
  /*
   * AUSGELEITET WIRD EIN PAKET, NICHT NUR EINE JSON (Weisung).
   *
   * Die hinterlegten Zeichnungen sind Bilder; sie gehören als eigene Dateien
   * in den Ablageordner, nicht als Zahlenkolonne in die JSON. Das Paket ist
   * ein ZIP mit `ablage.json` und einem Ordner `zeichnungen/`.
   */
  auf('[data-export]', async () => {
    /*
     * AUSGEWAEHLT WIRD, WAS HINAUSGEHT.
     *
     * Bisher ging immer alles: wer zwei Tragwerke schicken wollte, schickte
     * die ganze Ablage mit jedem hinterlegten Bild. Die Bilder machen den
     * Grossteil der Datei aus.
     */
    const wahlId = (k) => `pk-${k}`;
    const d = dialog('Ablage ausleiten',
      `<p class="notiz">Was in das Paket soll. Die Zeichnungen machen den
         Grossteil der Dateigrösse aus.</p>
       ${store.PAKETTEILE.map((t) => `
         <label class="feld-kurz"><input type="checkbox" id="${wahlId(t.key)}" checked>
           <span>${esc(t.label)}</span></label>`).join('')}`,
      '<button class="btn btn-acc" data-ok>Ausleiten</button>');
    d.node.querySelector('[data-ok]').onclick = async () => {
      const wahl = {};
      store.PAKETTEILE.forEach((t) => { wahl[t.key] = ui.el(wahlId(t.key)).checked; });
      d.zu();
      const tag = new Date().toISOString().slice(0, 10);
      store.dateiSpeichern(await store.alsPaket(wahl),
        `Tragjoch-Ablage-${tag}.zip`, 'application/zip');
    };
  });
  /*
   * EINGELESEN WIRD BEIDES. Pakete dieser Fassung UND die reinen JSON der
   * früheren - wer eine alte Sicherung liegen hat, soll sie nicht verlieren.
   * Unterschieden wird an den ersten zwei Zeichen: eine ZIP beginnt mit PK.
   */
  auf('[data-import]', async () => {
    try {
      const roh = await store.dateiLesenRoh();
      const ist = roh.length > 1 && roh[0] === 0x50 && roh[1] === 0x4b;
      if (ist) {
        /*
         * ERST ZEIGEN, DANN SCHREIBEN.
         *
         * Der Import schrieb sofort. Man sah erst hinterher, was hereinkam,
         * und ein zweites Einlesen derselben Datei legte alles ein zweites
         * Mal an. Jetzt steht die Uebersicht vorweg, samt Warnung, welche
         * Namen es im selben Projekt schon gibt.
         */
        const i = await store.paketInhalt(roh);
        const zeile = (k, n) => (n ? `<tr><td>${esc(k)}</td><td>${n}</td></tr>` : '');
        const warnung = i.doppelt.length
          ? `<div class="hinweisbox">Schon vorhanden, wird ein zweites Mal
               angelegt: ${esc(i.doppelt.slice(0, 6).join(', '))}${
               i.doppelt.length > 6 ? ` und ${i.doppelt.length - 6} weitere` : ''}.</div>`
          : '';
        const d = dialog('Paket einlesen',
          `<table class="dt">${zeile('Tragwerke', i.eintraege)}
             ${zeile('Vorlagen', i.vorlagen)}
             ${zeile('Zeichnungen', i.zeichnungen)}</table>
           ${i.erzeugt ? `<p class="notiz">Erzeugt am
             ${new Date(i.erzeugt).toLocaleDateString('de-CH')}.</p>` : ''}
           ${warnung}
           <p class="notiz">Eingelesen wird zusätzlich; nichts wird ersetzt.</p>`,
          '<button class="btn btn-acc" data-ok>Einlesen</button>');
        d.node.querySelector('[data-ok]').onclick = async () => {
          d.zu();
          const r = await store.ausPaket(roh);
          zeichneSchublade();
          alert(`${r.eintraege} Eintrag/Einträge übernommen`
              + `${r.bilder ? `, dazu ${r.bilder} Zeichnung(en)` : ''}.`);
        };
      } else {
        const anzahl = await store.ausJson(new TextDecoder().decode(roh));
        zeichneSchublade();
        alert(`${anzahl} Eintrag/Einträge übernommen.`);
      }
    } catch (e) { alert('Einlesen fehlgeschlagen: ' + e.message); }
  });
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
         zeichnungMenue || kalibrierung || bildSchieben ? ' laeuft' : ''}" id="v-zeichnung"
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
  const lf = [{ wert: 'umhuellend', text: 'umhüllend' },
              ...letzte.kombi.lastfaelle.map((k, i) =>
                ({ wert: k.key, text: `LF${i + 1} · ${k.bez}` }))];
  const wahl = (id, beschriftung, punkte, jetzt) =>
    `<label for="${id}">${esc(beschriftung)}</label>
     <select id="${id}">${punkte.map((o) =>
       `<option value="${esc(o.wert)}"${o.wert === jetzt ? ' selected' : ''}
         >${esc(o.text)}</option>`).join('')}</select>`;

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
  const platzFuerSchubladen = () =>
    Math.max(2 * SCHIENE,
             document.documentElement.clientWidth - 2 * SPLIT_PX - MODELL_MIN);

  let links = 386, rechts = 380;
  // Auf schmalen Fenstern beide Schubladen im Verhältnis zurücknehmen, statt
  // der Mitte zu lassen, was übrig bleibt.
  const frei = platzFuerSchubladen();
  if (links + rechts > frei) {
    const f = frei / (links + rechts);
    links = Math.max(SCHIENE, Math.round(links * f));
    rechts = Math.max(SCHIENE, Math.round(rechts * f));
  }
  setze('--sp-links', links); setze('--sp-rechts', rechts);

  // Zuletzt offene Breite je Seite, damit das Einklappen umkehrbar bleibt
  const offen = { links: links, rechts: rechts };

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
  const stufe = (v) => (v > 1 ? 'nok' : v > 0.9 ? 'warn' : 'ok');
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
    const mastGefuehrt = letzte?.urteil?.nachweise?.mast !== false;
    if (letzte?.mitJoch !== false && letzte?.erg?.mast && mastGefuehrt) {
      const namen = e.modell.federn?.namen ?? {};
      const gesehen = new Set();
      const teile = [];
      ['A', 'B'].forEach((ende) => {
        const n = letzte.erg.mast[ende];
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
             g.teile.map(([k, v, titel]) =>
               `<div class="${stufe(v)}"
                     title="${esc(`${g.titel} · ${titel}`)}: η = ${v.toFixed(3)}">
                  <span class="senkrecht"><i>${esc(k)}</i><b>${v.toFixed(2)}</b></span>
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
  if (!aktiv && !versteckt(t)) {
    p.push({ text: `${tragwerkName(t)} rechnen`,
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
  p.push('-');
  p.push({ text: 'Auf dieses zoomen', tun: () => zoomAufTragwerk(id) });
  if (alle.length > 1) {
    p.push({ text: 'Vom Blatt nehmen', warn: true,
             tun: () => aendern('tragwerkWeg', id) });
  }
  return p;
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

/** Die Einträge zu einem Masten. */
function kontextMast(mastId, twId) {
  const m = mastenVon(werte).find((x) => x.id === mastId);
  if (!m) return [];
  const t = tragwerkeSortiert(werte).find((x) => x.id === twId)
         ?? tragwerkeVon(werte)[0];
  const p = [
    { text: `${mastName(werte, m)} bearbeiten`, tun: () => {
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
    p.push({ text: t.mastVorhanden === false
      ? `Masten von ${tragwerkName(t)} einschalten`
      : `Masten von ${tragwerkName(t)} ausschalten`,
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

function dialogSpeichern() {
  const d = dialog('In Ablage speichern', `
    <div class="feld"><label for="d-projekt">Projekt</label>
      <input id="d-projekt" type="text" value="${esc(projekt.projekt)}"
             placeholder="z. B. Bahnhof Musterstadt"></div>
    <div class="feld"><label for="d-name">Bezeichnung</label>
      <input id="d-name" type="text" value="${esc(projekt.name)}"
             placeholder="z. B. Joch Achse 12"></div>
    <div class="feld"><label for="d-bem">Bemerkung</label>
      <textarea id="d-bem" rows="3"></textarea></div>
    <p class="notiz">Die Ablage liegt im Browser dieses Geräts. Für die
      Aufbewahrung den Stand zusätzlich als Datei ausleiten.</p>`,
    `<button class="btn" data-neu>Als neuen Eintrag</button>
     <button class="btn btn-acc" data-ok>${projekt.id ? 'Überschreiben' : 'Speichern'}</button>`);

  const sichere = async (neu) => {
    projekt = {
      id: neu ? null : projekt.id,
      name: ui.el('d-name').value.trim() || 'Ohne Namen',
      projekt: ui.el('d-projekt').value.trim(),
    };
    const s = await store.sichern({
      id: projekt.id ?? undefined, name: projekt.name, projekt: projekt.projekt,
      bemerkung: ui.el('d-bem').value, werte,
      kennwerte: letzte ? {
        typ: werte.typ, L: werte.L, eta: letzte.erg.max.etaGesamt,
      } : null,
    });
    projekt.id = s.id;
    // Erst jetzt hat das Tragwerk eine Id - und erst jetzt kann eine vorher
    // eingefügte Zeichnung zu ihm gelegt werden.
    await zeichnungSichernFallsMoeglich();
    speichern();
    markiereGesichert();
    d.zu();
  };
  d.node.querySelector('[data-ok]').onclick = () => sichere(false);
  d.node.querySelector('[data-neu]').onclick = () => sichere(true);
}

function neuesTragjoch() {
  if (!confirm('Neues Tragjoch beginnen? Nicht gespeicherte Änderungen gehen verloren.')) return;
  werte = frisch();
  projekt = { id: null, name: 'Neues Tragjoch', projekt: projekt.projekt };
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

/**
 * AxisVM-Ausleitung (SAF).
 *
 * Das Knotenmodell wird GEFRAGT, nicht angenommen: es entscheidet, ob AxisVM
 * auf den Schwerachsen oder am Anschnitt rechnet, und damit über die Momente,
 * die hinterher verglichen werden.
 */
function dialogAxisvm() {
  if (!letzte) return;
  const wahl = KNOTENMODELLE.map((k, i) => `
    <label class="schalter">
      <input type="radio" name="km" value="${k.key}"${i === 0 ? ' checked' : ''}>
      <span>${esc(k.label)}</span>
    </label>`).join('');
  // Die Vorgabe hängt an der Bauweise: die Altbauweise ist zu flach, als
  // dass ein Kräftepaar aus Ober- und Untergurt das Ende halten dürfte.
  const vorgabe = auflagerVorgabe(letzte.erg.modell);
  // Das Mastmodell baut den Mast wirklich auf - ohne Mast in der Eingabe
  // gibt es nichts zu bauen. Ausgegraut statt versteckt: so ist zu sehen,
  // dass es das Modell gibt und woran es haengt.
  const hatMast = !!letzte.erg.modell.federn?.mast;
  const lager = AUFLAGERMODELLE.map((k) => {
    const geht = k.braucht !== 'mast' || hatMast;
    return `
    <label class="schalter${geht ? '' : ' aus'}">
      <input type="radio" name="am" value="${k.key}"${k.key === vorgabe ? ' checked' : ''}${geht ? '' : ' disabled'}>
      <span>${esc(k.label)}${geht ? ''
        : ' — braucht Endauflager «teilweise eingespannt (Mast)»'}</span>
    </label>`;
  }).join('');
  const d = dialog('AxisVM-Ausleitung', `
    <p>Schreibt das Stabmodell aus: vier Gurte, die Bindebleche jeder Station,
       die Gabellagerung und die Anbauteile am wirklichen Angriffspunkt. Die
       Lasten laufen <b>je Einwirkungsgruppe getrennt und charakteristisch</b>
       heraus; die ständige Last dabei nochmals geteilt in <b>Joch,
       Anbauteile und Ablenkkräfte</b>.</p>
    <p class="notiz">Über die COM-Brücke kommen ausserdem mit: das
       <b>Eigengewicht der Stäbe</b> als Last im ständigen Lastfall und die
       <b>Lastkombinationen dieser Anwendung</b> — AxisVM erzeugt also keine
       eigenen. Gerechnet wird nicht; der Startknopf bleibt Ihre
       Entscheidung.</p>
    <div class="feld"><label>Format</label>
      <label class="schalter"><input type="radio" name="fmt" value="json" checked>
        <span>JSON für die COM-Brücke, vollständig, ohne Zusatzmodul.
              Datei neben <code>com/AxisVM_aufbauen.cmd</code> legen</span></label>
      <label class="schalter"><input type="radio" name="fmt" value="saf">
        <span>SAF-Mappe (.xlsx), vollständig, braucht aber das SAF-Interface
              in AxisVM (kostenpflichtiges Modul)</span></label>
      <label class="schalter"><input type="radio" name="fmt" value="dxf">
        <span>DXF + Zuordnungsmappe, nur die Geometrie; Querschnitte,
              Auflager und Lasten von Hand</span></label>
      <label class="schalter"><input type="radio" name="fmt" value="pynite">
        <span>PyNite-Skript (.py), freie Gegenrechnung, läuft ohne AxisVM</span></label>
    </div>
    <div class="feld"><label>Knotenmodell</label>${wahl}</div>
    <div class="feld"><label>Auflagermodell</label>${lager}
      <p class="notiz">In Jochachse hält <b>genau ein Knoten</b> — mehr verlangt
         das Gleichgewicht nicht, und jeder weitere wäre ein Zwang. Nur im
         Mastmodell halten beide Fundamente, dort aber über die Biegung der
         Maste.</p></div>
    <div class="feld"><label>Starrelemente</label>
      <label class="schalter"><input type="radio" name="starr" value="koerper" checked>
        <span>als Starrkörper und Verbindungselemente, so, wie AxisVM sie
              führt. Der Übergang Gurt → Anbauteil wird ein
              Verbindungselement; dort lässt sich die Kraftübertragung je
              Richtung einstellen</span></label>
      <label class="schalter"><input type="radio" name="starr" value="staebe">
        <span>als steife Stäbe, dicker Ersatzquerschnitt mit der Güte des
              Tragwerks, gewöhnliche Stabendgelenke</span></label>
    </div>
    <div class="feld"><label>Ausgabe</label>
      <label class="schalter"><input type="checkbox" name="schott">
        <span>Endschott aus den Resultattabellen ausblenden, es bleibt
              tragendes Bauteil im Modell</span></label>
    </div>
    <p class="notiz">Für einen Vergleich beide Modelle rechnen: erst ihre
       Differenz trennt die Frage des Knotenmodells von der des Rechenwegs.
       Das Blatt «Anleitung» in der Mappe nennt, was beim Import zu prüfen
       bleibt.</p>`,
    `<button class="btn btn-acc" data-los>Ausleiten</button>
     <button class="btn" data-zu>Abbrechen</button>`);
  d.node.querySelector('[data-los]').onclick = () => {
    const km = d.node.querySelector('input[name="km"]:checked').value;
    const fmt = d.node.querySelector('input[name="fmt"]:checked').value;
    const aus = d.node.querySelector('input[name="schott"]').checked;
    const am = d.node.querySelector('input[name="am"]:checked').value;
    const sm = d.node.querySelector('input[name="starr"]:checked').value;
    d.zu();
    axisvmKlick(km, fmt, aus, am, sm);
  };
}

function axisvmKlick(knotenmodell, format = 'saf', schottAusblenden = false,
                    auflagerModell = null, starrModell = 'koerper') {
  const m = letzte.erg.modell;
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
  let text = null;
  try { text = await datei.text(); }
  catch (e) { alert(`Datei nicht lesbar: ${e.message}`); return; }

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
  if (obj.art === 'tragjoch-ablage' || Array.isArray(obj.eintraege)) {
    const n = (obj.eintraege ?? []).length;
    const v = (obj.vorlagen ?? []).length;
    const d = dialog('Ablage einlesen', kopf +
      `<p>Enthalten: <b>${n}</b> Tragwerk${n === 1 ? '' : 'e'}`
      + `${v ? ` und <b>${v}</b> Vorlage${v === 1 ? '' : 'n'}` : ''}.</p>`
      + '<p class="notiz">Bestehende Einträge bleiben stehen. Gleiche Namen '
      + 'erzeugen neue Einträge, damit nichts unbemerkt überschrieben wird.</p>',
      '<button class="btn btn-acc" data-ok>Übernehmen</button>'
      + '<button class="btn" data-zu>Abbrechen</button>');
    d.node.querySelector('[data-ok]').onclick = async () => {
      try {
        const anzahl = await store.ausJson(text);
        d.zu();
        schubladeOffen = false;
        schubladeUmschalten();          // zeigt, was angekommen ist
        alert(`${anzahl} Eintrag/Einträge übernommen.`);
      } catch (e) { alert('Einlesen fehlgeschlagen: ' + e.message); }
    };
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
  const daten = await datenBereitstellen([ladeDatenbank, ladeAnbauteile, ladeFlBauteile]);
  // Getrennt und ohne Abbruch: die drei oben sind Voraussetzung, dieses
  // eine ist es nicht.
  await ladeAbfangjoche().catch(() => null);
  if (daten.quelle === 'keine') {
    dialogDaten();
    return;
  }
  setzeTypOptionen();
  werte = laden();
  setzeEigeneVorlagen(werte.eigeneVorlagen);
  uebertrageTokens(thema);

  const dbFehler = pruefeDatenbank(getProfil);
  const stand = datenbankStand();
  ui.el('st-db').textContent = ui.datenbankText(stand, dbFehler);
  // Als eigenes Fenster gestartet fehlt die Adressleiste - dann ist in der
  // Fusszeile das Einzige, woran sich die Herkunft noch ablesen lässt.
  const zeigeFuss = () => {
    ui.el('st-version').textContent = `Tragjoch ${VERSION}`
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
