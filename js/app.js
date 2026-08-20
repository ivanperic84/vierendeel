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
import { berechne, modell, vergleichMassvarianten, vergleichKombinationen,
         schnittstellen, auflagerBlatt } from './core.vierendeel.js';
import { konstruktionsChecks, fluchtChecks, hinweise, urteilKonstruktion,
         klassifizierung } from './core.checks.js';
import { spannweiteImSortiment, NORMENSAETZE, erkenneNormensatz,
         lastfaelle, ekVonWindklasse } from './core.lasten.js';
import { diagramme } from './render.charts.js';
import { erzeugeSzene, Modellansicht, ANSICHTEN, MODI,
         LASTARTEN } from './render.3d.js';
import { exportiere } from './export.bericht.js';
import { exportiereAxisvm, exportiereDxf, exportiereJson,
         KNOTENMODELLE } from './export.axisvm.js';
import { exportierePynite } from './export.pynite.js';
import { handbuchHtml, handbuchDatei } from './doku.handbuch.js';
import { standardwerte, typUebernehmen, setzeTypOptionen,
         setzeGrenzen, FELDER } from './ui.schema.js';
import { uebertrageTokens, iconKnopf, esc, icon, abschnitt,
         FARBEN as farben } from './design.js';
import { ladeAnbauteile, neuesAnbauteil, vorlagen, getVorlage, alsVorlage,
         normalisiereAnbauteil,
         setzeEigeneVorlagen, erzeugeGleislasten, neuesModul,
         baugruppeSumme } from './data.anbauteile.js';
import { ladeFlBauteile, flBauteile } from './data.fl.js';
import { datenBereitstellen, paketAnwenden, paketAus, pruefePaket,
         speicherLeeren, ausSpeicher } from './data.paket.js';
import { mastWind } from './data.masten.js';
import { pwaEinrichten, kannInstallieren, installiere,
         alsProgramm } from './pwa.js';
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

function speichern() {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify({ werte, projekt, thema }));
  } catch { /* Ablage nicht verfügbar – kein Grund abzubrechen */ }
}

const jochVonTyp = () =>
  werte.typ && werte.typ !== 'frei' ? getTragjoch(werte.typ) : null;

// --- Hauptzyklus ------------------------------------------------------------

function neuRechnen(neuZeichnen = true) {
  const joch = jochVonTyp();
  setzeGrenzen(joch, werte.L);

  // Die Eingabemaske zeigt Ergebnisse mit an (Querschnittsklassen, Lastfälle).
  // Sie wird deshalb NACH der Rechnung aufgebaut - sonst hinkte sie einer
  // Änderung immer einen Durchgang hinterher.
  const zeichneEingabe = () => {
    if (!neuZeichnen) return;
    const extras = letzte
      ? { prof: ui.qskMarke(letzte.kl),
          blech: ui.blechUebersichtHtml(letzte.erg),
          stueck: ui.stuecklisteHtml(letzte.anzeige),
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
    if (werte.endbedingung === 'mast' && werte.wMastAusTabelle !== false) {
      const w = mastWind(werte.mastProfil, ekVonWindklasse(werte.windKlasse),
                         werte.mastSteg);
      if (Number.isFinite(w)) werte.wMast = w;
    }

    const erg = berechne(werte, profOG, profUG, stahl, joch);

    // Die Tabellenlasten in die gesperrten Felder spiegeln, damit man sie
    // immer sieht - auch wenn gerade die Tabelle gilt.
    if (!werte.lastenBearbeiten) {
      const c = erg.modell.char;
      werte.gkManuell = Math.round(c.gk * 1000) / 1000;
      werte.wkManuell = Math.round(c.wk * 1000) / 1000;
      werte.skManuell = Math.round(c.sk * 1000) / 1000;
    }

    const vergleich = vergleichMassvarianten(werte, profOG, profUG, stahl, joch);
    const kombi = vergleichKombinationen(werte, profOG, profUG, stahl, joch);
    const checks = konstruktionsChecks(erg.modell);
    // Die Fluchtkontrolle läuft weiter mit, wird aber nicht mehr angezeigt:
    // sie erklärt einen Versatz im Zehntelmillimeterbereich, der beim Arbeiten
    // nur stört. Sie gehört ins Handbuch, sobald es eines gibt. Der Wert bleibt
    // in der Excel-Ausleitung erhalten.
    const flucht = fluchtChecks(erg.modell);
    const hinw = hinweise(erg.modell);
    const urteil = urteilKonstruktion(checks);
    const kl = klassifizierung(erg.modell);

    // Für Modell und Auswertung gilt die gewählte Anzeigequelle
    const anzeige = anzeigeKombi === 'umhuellend'
      ? (kombi.huellkurve ?? erg) : (kombi.ergebnisse?.[anzeigeKombi] ?? erg);

    const auflager = auflagerBlatt(werte, profOG, profUG, stahl, joch);

    letzte = { erg, anzeige, vergleich, kombi, checks, auflager,
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
    ui.el('modell-info').textContent = modellInfoText();
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
  ui.el('modell-info').textContent = 'Diagramm · Eingabe ändern zeichnet mit';
}

const modellInfoText = () => (letzte
  ? `${letzte.anzeige.modell.typ ?? 'frei'} · ` +
    `${letzte.anzeige.modell.L.toFixed(2)} m · ${letzte.anzeige.stationen} Stationen`
  : '');

function zeichneAuswertung() {
  if (!letzte) return;
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

function aktualisiereModell(erg) {
  const szene = erzeugeSzene(erg.modell, erg);
  uebernehmeAnsichtsoptionen();
  ansicht.station = station;
  ansicht.setzeSzene(szene);
  if (ui.el('legende')) zeichneLegende();
  // Die Blickrichtung wird beim ersten Setzen der Szene festgelegt; die
  // Werkzeugleiste muss danach wissen, welche gilt.
  if (ui.el('ebenen-tools')?.children.length) zeichneModellWerkzeuge();
  // Der Nachweisschnitt wird in der Auswertung eingestellt, nicht hier.
  ui.el('pos-marke').textContent =
    `Schnitt x = ${erg.schnitt.x.toFixed(2)} m`;
  ui.el('pos-station').textContent =
    `Feld ${erg.schnitt.feld + 1}/${erg.schnitt.anzahlSchnitte}` +
    ` · massgebendes Blech bei ${erg.schnitt.stationX.toFixed(2)} m`;
  ui.el('modell-info').textContent = modellInfoText();
  // Ein vergrössertes Diagramm bleibt live und zeichnet mit
  if (buehne) zeichneBuehne();
}

function aktualisiereFuss(erg, urteil, joch) {
  const e = erg.max.etaMitMast;
  const gut = e <= 1 && urteil.alleOk;
  const farbe = gut ? 'var(--ok)' : 'var(--fail)';
  ui.el('st-urteil').innerHTML =
    `<span class="pkt" style="background:${farbe}"></span>` +
    `${gut ? 'Alle Nachweise erfüllt' : 'Nachweis nicht erfüllt'} · η = ${e.toFixed(3)}`;
  const s = spannweiteImSortiment(joch, erg.modell.L);
  ui.el('st-modell').textContent =
    `${erg.modell.jd}${erg.modell.verlauf?.aktiv
        ? `→${erg.modell.verlauf.voute.endJd}` : ''} × ${erg.modell.jbbOG} mm · Feldweite ` +
    `${(erg.modell.a1eff * 1000).toFixed(0)} mm (Soll ${(erg.modell.a1 * 1000).toFixed(0)})` +
    (s.text ? ` · ${s.ok ? 'Sortiment' : 'AUSSERHALB Sortiment'}` : '');
}

// --- Ereignisse -------------------------------------------------------------

function aendern(key, wert) {
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
  neuRechnen();
}

function setzeAnbauteile(liste) {
  werte = { ...werte, anbauteile: liste };
  neuRechnen();
}

function dialogKlassen() {
  if (!letzte) return;
  dialog('Querschnittsklassen – Herleitung', ui.klassenTabelle(letzte.kl), '');
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
  const d = dialog('Handbuch – Herleitung und Modellgrenzen', handbuchHtml(),
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
function dialogOptionen() {
  const d = dialog('Optionen', `<div id="opt-koerper">${ui.optionenHtml(werte)}</div>`,
    `<button class="btn" data-thema>${thema === 'dunkel' ? 'Helle' : 'Dunkle'} Darstellung</button>
     <button class="btn btn-fail" data-reset>Eingaben zurücksetzen</button>
     <button class="btn" data-zu>Fertig</button>`);
  const verdrahte = () => ui.verdrahteOptionen(ui.el('opt-koerper'), werte, (k, v) => {
    aendern(k, v);
    // Maske neu aufbauen, damit abhängige Felder mitgehen
    ui.el('opt-koerper').innerHTML = ui.optionenHtml(werte);
    verdrahte();
  });
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
  if (an) ansicht.zeigeSchnitt(schnittBreite());
  else { station = null; ansicht.station = null; ansicht.ganzesJoch(); }
}

/** Ausschnitt um den Schnitt: drei Felder nach links und rechts. */
const schnittBreite = () =>
  Math.max(1.6, (letzte?.erg.modell.a1eff ?? 0.75) * 3);

// --- Anbauteile: Vorlagen, Lage, Generator ----------------------------------

/**
 * Lage eines neuen Anbauteils abfragen.
 *
 * Beim Ziehen ins Modell ist der Treffpunkt naturgemäss ungenau. Statt den
 * geschätzten Wert stillschweigend zu übernehmen, wird er als Vorschlag
 * gezeigt - mit den Stationen des Jochs als Orientierung.
 */
function dialogAnbauteilLage(vorlageId, xVorschlag) {
  const v = getVorlage(vorlageId);
  const x0 = Math.max(0, Math.min(werte.L, xVorschlag ?? werte.L / 2));
  const d = dialog(`${v.name} einsetzen`, `
    <div class="feld"><label for="at-x">Lage in Jochachse <em>x</em></label>
      <div class="zahlfeld">
        <input id="at-x" type="number" step="0.05" min="0" max="${werte.L}"
               value="${x0.toFixed(2)}"><span class="einheit">m</span></div>
      <small class="hinweis">0 … ${werte.L.toFixed(2)} m ·
        Jochmitte bei ${(werte.L / 2).toFixed(2)} m</small></div>
    <div class="feld"><label for="at-name">Bezeichnung</label>
      <input id="at-name" type="text" value="${esc(v.name)}"></div>
    <p class="notiz">Masse und Lasten der Vorlage lassen sich danach in der
      Karte anpassen.</p>`,
    '<button class="btn btn-acc" data-ok>Einsetzen</button>');

  const uebernehmen = () => {
    const x = Math.max(0, Math.min(werte.L, parseFloat(ui.el('at-x').value) || 0));
    const t = { ...neuesAnbauteil(vorlageId, x),
                name: ui.el('at-name').value.trim() || v.name };
    d.zu();
    tabEingabe = 'anbau';
    setzeAnbauteile([...(werte.anbauteile ?? []), t]);
    ansicht.zoomAuf(x, null, Math.max(2, werte.L / 8));
  };
  d.node.querySelector('[data-ok]').onclick = uebernehmen;
  ui.el('at-x').onkeydown = (e) => { if (e.key === 'Enter') uebernehmen(); };
  ui.el('at-x').select();
}

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
      : 'Keine Gleislage innerhalb des Jochs – Abstand oder Anzahl anpassen.';
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
  if (werte.schnittAktiv) ansicht.zeigeSchnitt(schnittBreite());
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
    // Der Installieren-Knopf steht nur da, solange der Browser ihn anbietet:
    // nicht angemeldet, schon installiert oder abgelehnt - dann fehlt er.
    (kannInstallieren()
      ? iconKnopf('btn-install', 'installieren',
                  'Auf diesem Gerät installieren - läuft danach auch ohne Netz')
      : '') +
    iconKnopf('btn-handbuch', 'info', 'Handbuch: Herleitung und Modellgrenzen') +
    iconKnopf('btn-export', 'export', 'Excel-Ausleitung (.xlsx)') +
    iconKnopf('btn-axisvm', 'schnitt', 'AxisVM-Ausleitung (SAF)') +
    iconKnopf('btn-drucken', 'drucken', 'Drucken / PDF') +
    iconKnopf('btn-daten', 'speichern', 'Datenbasis: Paket laden oder sichern') +
    iconKnopf('btn-optionen', 'optionen', 'Optionen und Darstellung');

  if (kannInstallieren()) ui.el('btn-install').onclick = () => installiere();
  ui.el('btn-handbuch').onclick = dialogHandbuch;
  ui.el('btn-export').onclick = exportKlick;
  ui.el('btn-axisvm').onclick = dialogAxisvm;
  ui.el('btn-drucken').onclick = () => window.print();
  ui.el('btn-daten').onclick = () => dialogDaten(false);
  ui.el('btn-optionen').onclick = dialogOptionen;
  aktualisiereProjektKnopf();
}

function aktualisiereProjektKnopf() {
  const b = ui.el('btn-projekt');
  b.innerHTML =
    `${icon('projekte', 14)} <span>${esc(projekt.projekt || 'Ohne Projekt')}</span>` +
    ` · <b>${esc(projekt.name)}</b> ${icon('rechts', 12)}`;
  b.title = 'Projektablage und Vorlagen öffnen';
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

function schubladeUmschalten() {
  schubladeOffen = !schubladeOffen;
  if (schubladeOffen) zeichneSchublade();
  else {
    ui.el('bannerschublade').hidden = true;
    ui.el('btn-projekt').classList.remove('offen');
  }
}

function schubladeSchliessen() {
  if (!schubladeOffen) return;
  schubladeOffen = false;
  ui.el('bannerschublade').hidden = true;
  ui.el('btn-projekt').classList.remove('offen');
}

async function zeichneSchublade() {
  const n = ui.el('bannerschublade');
  n.hidden = false;
  ui.el('btn-projekt').classList.add('offen');
  n.innerHTML = '<p class="notiz">Ablage wird gelesen …</p>';

  let gruppen = [], vorlagen = [], fehler = '';
  try {
    gruppen = await store.nachProjekt();
    vorlagen = await store.vorlagenListe();
  } catch (e) { fehler = e.message; }
  if (!schubladeOffen) return;

  const meta = (e) => [e.kennwerte?.typ, e.kennwerte?.L ? `${e.kennwerte.L.toFixed(2)} m` : '',
                       e.kennwerte?.eta ? `η ${e.kennwerte.eta.toFixed(3)}` : '',
                       new Date(e.geaendert).toLocaleDateString('de-CH')]
    .filter(Boolean).join(' · ');

  const projekteHtml = fehler
    ? `<div class="fehlerbox">Ablage nicht verfügbar: ${esc(fehler)}</div>`
    : (gruppen.length ? gruppen.map((g) => `
        <div class="ablage-gruppe">
          <div class="sec">${esc(g.projekt)}
            <button class="btn btn-mini sec-btn" data-projekt-um="${esc(g.projekt)}"
                    title="Projekt umbenennen – alle ${g.eintraege.length} Einträge">${icon('bearbeiten', 11)}</button>
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
    <div class="bs-spalten">
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
          sie ist – sonst würde das Anwenden das Bauteil umbauen.</p>
      </div>
    </div>`;

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
    aktualisiereProjektKnopf();
    schubladeSchliessen();
    neuRechnen();
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
  auf('[data-export]', async () => {
    store.dateiSpeichern(await store.alsJson(),
      `Tragjoch-Ablage-${new Date().toISOString().slice(0, 10)}.json`);
  });
  auf('[data-import]', async () => {
    try {
      const anzahl = await store.ausJson(await store.dateiLesen());
      zeichneSchublade();
      alert(`${anzahl} Eintrag/Einträge übernommen.`);
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
      Jochlänge, Nachweisstelle und der Projektbezug – eine Vorlage beschreibt
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
  { key: 'achse', icon: 'achse', text: 'Schwerachsen' },
  { key: 'stabmodell', icon: 'stab', text: 'Stabmodell (ohne Körper)' },
  { key: 'masse', icon: 'mass', text: 'Bemassung' },
  { key: 'raster', icon: 'raster', text: 'Bodenraster' },
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
  ui.el('ansicht-tools').innerHTML =
    iconKnopf('v-ganz', 'zoom', 'Ganzes Joch zeigen, Ansicht zurücksetzen');
  ui.el('v-ganz').onclick = () => {
    station = null; ansicht.station = null;
    ansicht.ansichtZuruecksetzen(); zeichneAuswertung();
  };
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

/** Die vier Werkzeuggruppen zeichnen und verdrahten. */
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
        gR = ansicht.gruppen.resultate;

  n.innerHTML =
    `<div class="wz-gruppe"><div class="wz-t">Blick</div><div class="wz-knoepfe">${
      ANSICHTEN.map((a) => text(`wz-blick-${a.key}`, a.label.slice(0, 3), a.label,
                                a.key === ansicht.ansichtKey)).join('')
    }</div></div>` +
    gruppe('modell', 'Modell', gM, WZ_MODELL.map((s) =>
      schalter(`wz-m-${s.key}`, s.icon, s.text, ansicht.ebenen[s.key], !gM)).join('')) +
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

  const nach = () => { ansicht.zeichne(); zeichneModellWerkzeuge(); };
  ['modell', 'lasten', 'resultate'].forEach((g) => {
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

  // Nur noch der Lastfall: die aufgetragene Grösse steht jetzt bei den
  // Werkzeugen unter «Resultate», wo sie neben den übrigen Darstellungsfragen
  // hingehört.
  n.innerHTML = wahl('wahl-einwirkung', 'Lastfall', lf, anzeigeKombi);

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
    griff.setPointerCapture(e.pointerId);
    const buehne = ui.el('viewer').getBoundingClientRect();
    const kasten = n.getBoundingClientRect();
    const dx = e.clientX - kasten.left, dy = e.clientY - kasten.top;
    const bewegen = (ev) => {
      const links = Math.max(4, Math.min(buehne.width - kasten.width - 4,
                                         ev.clientX - buehne.left - dx));
      const oben = Math.max(4, Math.min(buehne.height - kasten.height - 4,
                                        ev.clientY - buehne.top - dy));
      legendeLage = { links, oben };
      n.classList.add('gezogen');
      n.style.left = `${links}px`;
      n.style.top = `${oben}px`;
    };
    const ende = () => {
      griff.removeEventListener('pointermove', bewegen);
      griff.removeEventListener('pointerup', ende);
    };
    griff.addEventListener('pointermove', bewegen);
    griff.addEventListener('pointerup', ende);
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

function baueLayout() {
  const ws = ui.el('ws');
  const setze = (name, px) => document.documentElement.style.setProperty(name, px + 'px');
  let links = 386, rechts = 380;
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
      g.setPointerCapture(e.pointerId);
      const start = e.clientX;
      const a0 = seite === 'links' ? links : rechts;
      let bewegt = false;
      const bewegen = (ev) => {
        const d = (ev.clientX - start) * (seite === 'links' ? 1 : -1);
        if (Math.abs(ev.clientX - start) > 3) bewegt = true;
        if (bewegt) setzeSeite(seite, Math.max(SCHIENE, Math.min(640, a0 + d)));
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
  // η gesamt zuoberst der Pillen, darunter die drei Einzelnachweise.
  const nw = e ? [
    ['η', e.max.etaMitMast, 'Ausnutzung gesamt', true],
    ['OG', e.max.etaOG.og.eta, `Obergurt ${e.modell.profOG.name}`, false],
    ['UG', e.max.etaUG.ug.eta, `Untergurt ${e.modell.profUG.name}`, false],
    ['Bl', e.max.etaB.etaB, 'Bindeblech, massgebende Ebene', false],
  ] : [];

  // Die Reiter stehen oben, die Nachweise darunter: oben sucht man den Weg
  // zurück in die Auswertung, unten liest man ab. Die Pillen füllen die
  // verbleibende Höhe; ihre Beschriftung steht senkrecht, weil in 42 mm
  // Breite sonst nur zwei Zeichen Platz hätten.
  r.innerHTML =
    ui.AUSWERTUNG_TABS
      .map((t) => knopf(t.id, t.icon, `${t.titel} öffnen`, t.id === tabAuswertung)).join('') +
    (e ? '<div class="schiene-trenner"></div>' +
         `<div class="schiene-nw">${nw.map(([k, v, titel, gross]) =>
           `<div class="${stufe(v)}${gross ? ' gesamt' : ''}"
                 title="${esc(titel)}: η = ${v.toFixed(3)}">
              <span class="senkrecht"><i>${k}</i><b>${v.toFixed(2)}</b></span>
            </div>`).join('')}</div>` : '');
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

/** Kachel aus der Sidebar auf das Modell ziehen legt ein Anbauteil an. */
function verdrahteAblegen() {
  const v = ui.el('viewer');
  v.addEventListener('dragover', (e) => {
    if (!e.dataTransfer.types.includes('text/tragjoch-vorlage')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    v.classList.add('ablegen');
  });
  v.addEventListener('dragleave', () => v.classList.remove('ablegen'));
  v.addEventListener('drop', (e) => {
    const id = e.dataTransfer.getData('text/tragjoch-vorlage');
    if (!id) return;
    e.preventDefault();
    v.classList.remove('ablegen');
    // Die Mausposition liefert nur einen VORSCHLAG: quer über ein perspek-
    // tivisches Bild lässt sich eine Station nicht auf den Zentimeter treffen.
    // Deshalb wird der Wert zur Bestätigung vorgelegt.
    const r = v.getBoundingClientRect();
    const anteil = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    dialogAnbauteilLage(id, Math.round(anteil * werte.L * 4) / 4);
  });
}

// --- Ablage -----------------------------------------------------------------

function dialog(titel, koerper, knoepfe, klasse = '') {
  const n = ui.el('ueberlagerung');
  n.innerHTML = `<div class="scrim"><div class="dialog${klasse ? ' ' + klasse : ''}">
    <div class="dialog-kopf"><h2>${esc(titel)}</h2>
      <button class="btn btn-mini" data-zu>Schliessen</button></div>
    <div class="dialog-koerper">${koerper}</div>
    <div class="dialog-fuss">${knoepfe}</div>
  </div></div>`;
  const zu = () => { n.innerHTML = ''; document.body.classList.remove('druck-handbuch'); };
  n.querySelector('[data-zu]').onclick = zu;
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
        typ: werte.typ, L: werte.L, eta: letzte.erg.max.etaMitMast,
      } : null,
    });
    projekt.id = s.id;
    aktualisiereProjektKnopf();
    speichern();
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
  aktualisiereProjektKnopf();
  neuRechnen();
  ansicht.ganzesJoch();
}

function exportKlick() {
  if (!letzte) return;
  exportiere(werte, letzte.erg, letzte.checks, letzte.hinw, letzte.warn, letzte.vergleich);
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
  const d = dialog('AxisVM-Ausleitung', `
    <p>Schreibt das Stabmodell aus: vier Gurte, die Bindebleche jeder Station,
       die Gabellagerung und die Anbauteile am wirklichen Angriffspunkt. Die
       Lasten laufen <b>je Einwirkungsgruppe getrennt und charakteristisch</b>
       — kombiniert wird in AxisVM.</p>
    <div class="feld"><label>Format</label>
      <label class="schalter"><input type="radio" name="fmt" value="saf" checked>
        <span>SAF-Mappe (.xlsx) — braucht das SAF-Interface in AxisVM</span></label>
      <label class="schalter"><input type="radio" name="fmt" value="dxf">
        <span>DXF + Zuordnungsmappe — ohne Zusatzmodul, Zuweisung von Hand</span></label>
      <label class="schalter"><input type="radio" name="fmt" value="json">
        <span>JSON für die COM-Brücke — AxisVM baut das Modell selbst auf</span></label>
      <label class="schalter"><input type="radio" name="fmt" value="pynite">
        <span>PyNite-Skript (.py) — freie Gegenrechnung, läuft ohne AxisVM</span></label>
    </div>
    <div class="feld"><label>Knotenmodell</label>${wahl}</div>
    <div class="feld"><label>Ausgabe</label>
      <label class="schalter"><input type="checkbox" name="schott">
        <span>Endschott aus den Resultattabellen ausblenden — es bleibt
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
    d.zu();
    axisvmKlick(km, fmt, aus);
  };
}

function axisvmKlick(knotenmodell, format = 'saf', schottAusblenden = false) {
  const m = letzte.erg.modell;
  const deps = { berechne, modell, profOG: m.profOG, profUG: m.profUG,
                 stahl: m.stahl, joch: m.joch };
  const o = { knotenmodell, schottAusblenden };
  if (format === 'json') return exportiereJson(werte, deps, o);
  if (format === 'dxf') return exportiereDxf(werte, deps, o);
  if (format === 'pynite') return exportierePynite(werte, deps, o);
  return exportiereAxisvm(werte, deps, o);
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
function dialogDaten(erforderlich = false) {
  const vorhanden = ausSpeicher();
  const d = dialog(erforderlich ? 'Datenpaket laden' : 'Datenbasis', `
    ${erforderlich ? `<p><b>Diese Ausgabe enthält keine Daten.</b> Sie braucht ein
       Datenpaket mit den Jochtypen, den Anbauteil-Vorlagen und der
       Lasttabelle. Es wird nur in diesem Browser gespeichert und nirgends
       hingeschickt.</p>` : `<p>Die Jochtypen, die Anbauteil-Vorlagen und die
       Lasttabelle liegen als <b>Datenpaket</b> vor. Es lässt sich austauschen
       oder sichern; gespeichert wird es allein in diesem Browser.</p>`}
    <div class="feld"><label for="d-paket">Datenpaket (.json)</label>
      <input id="d-paket" type="file" accept=".json,application/json"></div>
    <p class="notiz" id="d-paket-stand">${vorhanden
      ? `Hinterlegt: ${esc(vorhanden.bezeichnung ?? 'ohne Bezeichnung')}`
        + `${vorhanden.stand ? ` · Stand ${esc(vorhanden.stand)}` : ''}`
      : 'Zurzeit ist kein Paket im Browser hinterlegt.'}</p>`,
    `<button class="btn" data-sichern>Aktuelle Daten sichern</button>
     ${vorhanden ? '<button class="btn btn-fail" data-leeren>Hinterlegtes löschen</button>' : ''}
     <button class="btn" data-zu>${erforderlich ? 'Abbrechen' : 'Fertig'}</button>`);

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

  d.node.querySelector('[data-sichern]').onclick = () => {
    try {
      const paket = paketAus(projekt.projekt || '');
      const blob = new Blob([JSON.stringify(paket, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Tragjoch_Datenpaket_${paket.stand}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) {
      melde(`Nichts zu sichern: ${e.message}`, true);
    }
  };

  const leeren = d.node.querySelector('[data-leeren]');
  if (leeren) leeren.onclick = () => {
    speicherLeeren();
    melde('Hinterlegtes Paket gelöscht — beim nächsten Start ist es weg.');
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
  // Daten kommen entweder mit der Datei (eingebettet bzw. nachgeladen) oder
  // aus einem örtlich geladenen Datenpaket. Fehlt beides, ist das kein
  // Fehler, sondern der Normalfall der datenfreien Ausgabe.
  const daten = await datenBereitstellen([ladeDatenbank, ladeAnbauteile, ladeFlBauteile]);
  if (daten.quelle === 'keine') {
    dialogDaten(true);
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
  ui.el('st-version').textContent =
    `Tragjoch ${VERSION}` + (alsProgramm() ? ' · installiert' : '');

  ansicht = new Modellansicht(ui.el('canvas3d'), {
    beiAuswahl: (st) => {
      const x = letzte?.erg.knoten[st]?.x ?? 0;
      springeZu(st, x);
    },
    beiMass: (feld) => zeigeFeld(feld),
    beiAnbauteil: (i) => zeigeAnbauteil(i),
  });

  ui.setzeDiagrammBuehne(zeigeDiagrammGross);
  ui.setzeAnbauHandler({
    wahl: (id, x) => dialogAnbauteilLage(id, x),
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
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') abbrechen();
  });
  baueLayout();
  baueModellWerkzeuge();
  verdrahteAblegen();
  neuRechnen();
  requestAnimationFrame(() => ansicht.passeGroesseAn());
  new ResizeObserver(() => ansicht.passeGroesseAn()).observe(ui.el('viewer'));
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
