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
         KNOTENMODELLE, AUFLAGERMODELLE, auflagerVorgabe } from './export.axisvm.js';
import { exportierePynite } from './export.pynite.js';
import { verortung, fangeAufMasskette } from './core.constants.js';
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
import { datenBereitstellen, paketAnwenden, paketAus, pruefePaket,
         speicherLeeren, ausSpeicher, PAKET_FORMAT } from './data.paket.js';
import { mastWind } from './data.masten.js';
import { pwaEinrichten, kannInstallieren, installiere, alsProgramm,
         dateiEmpfang, startWunsch, netzZustand } from './pwa.js';
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
      ? { geo: ui.hebelarmUebersicht(letzte.erg),
          prof: ui.qskMarke(letzte.kl),
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
      const ek = ekVonWindklasse(werte.windKlasse);
      const w = mastWind(werte.mastProfil, ek, werte.mastSteg);
      if (Number.isFinite(w)) werte.wMast = w;
      // Ein anderes Profil am Ende B faengt anderen Wind.
      const wB = werte.mastZwei
        ? mastWind(werte.mastProfilB, ek, werte.mastStegB) : null;
      werte.wMastB = Number.isFinite(wB) ? wB : null;
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

// Die Verortung zuerst: sie unterscheidet die Tragwerke eines Projekts,
// der Jochtyp tut das nicht. Fehlt sie, faellt sie weg.
const modellInfoText = () => (letzte
  ? [verortung(letzte.anzeige.modell),
     `${letzte.anzeige.modell.typ ?? 'frei'} · `
     + `${letzte.anzeige.modell.L.toFixed(2)} m · ${letzte.anzeige.stationen} Stationen`]
    .filter(Boolean).join(' · ')
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
  // Die Masskette der Zeichnung: die Ansicht zeichnet daraus Fanglinien.
  ansicht.masskette = erg.modell.masskette ?? [];
  // Und die Maske braucht das gerechnete Modell, um einen Träger an den
  // Bindeblechen vorbeizuschieben - dort stehen Lage und Breite der Bleche.
  ui.setzeModellFuerLage(erg.modell);
  ui.el('modell-info').textContent = modellInfoText();
  // Ein vergrössertes Diagramm bleibt live und zeichnet mit
  if (buehne) zeichneBuehne();
}

function aktualisiereFuss(erg, urteil, joch) {
  const e = erg.max.etaGesamt;
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
  // Die Orientierung entscheidet, WAS man sehen muss: der Querschnitt liegt an
  // einer Stelle, der Laengsschnitt laeuft ueber die ganze Spannweite. Ohne
  // das hier blieb nach dem Umschalten der Ausschnitt der vorigen Orientierung
  // stehen - beim Laengsschnitt sieben Bleche von dreiunddreissig.
  if (key === 'schnittOrientierung' && werte.schnittAktiv) {
    zeigeSchnittImModell();
  }
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
       dieselben Anbauteile – nur der Tragjoch-Typ wechselt. Profile, Bleche und
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
    // Kein eigener Meldeweg: die Modellüberschrift ist die Stelle, auf
    // die man ohnehin schaut, und sie steht beim nächsten Rechnen wieder
    // richtig.
    ui.el('modell-info').textContent =
      `Das Bild liess sich nicht einlesen: ${f.message}`;
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
function kalibrierenStarten(bezugKey) {
  const welt = bezugPunkte(bezugKey, letzte?.erg?.modell);
  if (!welt || !ansicht.zeichnung) { kalibrierenEnde(); return; }
  kalibrierung = { bezug: bezugKey, welt, punkte: [] };
  ansicht.beiZeichnungsklick = (t) => kalibrierKlick(t);
  zeichneBalken();
}

function kalibrierenEnde() {
  kalibrierung = null;
  erkannt = null;
  ansicht.beiZeichnungsklick = null;
  zeichneBalken();
  ansicht.zeichne();
}

async function kalibrierKlick(t) {
  if (!kalibrierung) return;
  kalibrierung.punkte.push(t);
  if (kalibrierung.punkte.length < 2) { zeichneBalken(); return; }
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
let setzen = null;          // { stelle } waehrend der Auswahl

function setzenStarten() {
  if (kalibrierung) kalibrierenEnde();
  setzen = { stelle: null };
  ansicht.beiStelle = (w) => stelleGewaehlt(w);
  ui.el('canvas3d').style.cursor = 'crosshair';
  zeichneBalken();
}

function setzenEnde() {
  setzen = null;
  ansicht.beiStelle = null;
  ui.el('canvas3d')?.style.removeProperty('cursor');
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
  if (w.x >= -0.3 && w.x <= L + 0.3 && Math.abs(w.z) <= h / 2 + 0.6) {
    // Am Joch faengt die Lage auf der Masskette, falls eine eingetragen ist.
    const x = fangeAufMasskette(Math.max(0, Math.min(L, w.x)), m.masskette ?? []);
    return { ort: 'joch', x: Math.round(x * 1000) / 1000 };
  }
  // Am Masten nur, wenn einer im Modell steht - sonst gibt es dort nichts,
  // woran etwas haengen koennte.
  const H = m.federn?.mastA?.H ?? m.federn?.mast?.H ?? 0;
  if (H > 0 && w.z < -(h / 2)) {
    const nahA = Math.abs(w.x) <= 0.8;
    const nahB = Math.abs(w.x - L) <= 0.8;
    if (nahA || nahB) {
      // AUF DEN SCHRITT DES REGLERS GERUNDET (5 cm). Sonst zeigt die Karte
      // eine andere Zahl an, als der Klick gesetzt hat - der Regler rastet
      // auf seinen Schritt, und der Anwender sieht 5.20, wo 5.15 steht.
      const hM = Math.max(0, Math.min(H, w.z + H));
      return { ort: nahA ? 'mastA' : 'mastB', hMast: Math.round(hM * 20) / 20 };
    }
  }
  return null;
}

function stelleGewaehlt(w) {
  const st = stelleAus(w);
  if (!st) {
    // WO MAN GELANDET IST, statt nur «daneben». Wer zwei Meter neben dem
    // Joch klickt, sieht am Wert, in welche Richtung er zielen muss - und
    // ob überhaupt das Modell gemeint ist oder eine leere Stelle im Raum.
    setzen = { stelle: null, daneben: w };
    zeichneBalken();
    return;
  }
  setzen = { stelle: st };
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

/** Das gewaehlte Bauteil an die gemerkte Stelle setzen. */
function setzeVorlageAnStelle(vorlageId) {
  const st = setzen?.stelle;
  if (!st) return;
  const roh = st.ort === 'joch'
    ? neuesAnbauteil(vorlageId, st.x)
    : { ...neuesAnbauteil(vorlageId, 0), ort: st.ort, hMast: st.hMast };
  // Erst jetzt ist das Raster der Vorlage bekannt - und damit, wo die
  // beiden Klemmen sitzen. Ein Traeger weicht den Blechen aus.
  const t = st.ort === 'joch'
        && hatTraeger(roh.module, (id) => getFlBauteil(id).rolle)
    ? (() => {
        const an = passeTraegerAn(roh.x, roh.raster, letzte?.erg?.modell);
        return { ...roh, x: an.x, raster: an.raster };
      })()
    : roh;
  setzenEnde();
  tabEingabe = 'anbau';
  setzeAnbauteile([...(werte.anbauteile ?? []), t]);
  if (st.ort === 'joch') ansicht.zoomAuf(t.x, null, Math.max(2, werte.L / 8));
}

/**
 * Der Balken ueber dem Modell: was jetzt anzuklicken ist.
 *
 * Er traegt zweierlei - das Einmessen der Zeichnung und das Setzen eines
 * Bauteils -, und immer nur eines davon. Er sagt IMMER genau einen naechsten
 * Schritt; eine Anleitung mit zwei Punkten liest man beim Zielen nicht mehr.
 */
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
    n.innerHTML = '<span>Zeichnung selbst eingemessen — die beiden Masten '
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
  if (setzen) {
    const st = setzen.stelle;
    if (!st) {
      n.hidden = false;
      const d = setzen.daneben;
      n.innerHTML = `<span>${d
        ? `Dort ist <b>x = ${d.x.toFixed(2)} m</b>, <b>z = ${d.z.toFixed(2)} m</b>`
          + ' — auf das Joch oder einen Masten klicken'
        : 'Bauteil setzen — <b>ins Modell klicken</b>, wohin es gehört'}</span>`
        + '<button class="btn btn-mini" data-setz-ab>Abbrechen</button>';
      n.querySelector('[data-setz-ab]').onclick = () => setzenEnde();
      return;
    }
    const wo = st.ort === 'joch'
      ? `am Joch bei <b>x = ${st.x.toFixed(2)} m</b>`
      : `am <b>Mast Ende ${st.ort === 'mastA' ? 'A' : 'B'}</b>, `
        + `<b>${st.hMast.toFixed(2)} m</b> über Fundament`;
    const liste = vorlagenFuer(st.ort).map(({ v, rolle }) =>
      `<button class="btn btn-mini" data-setz-vorlage="${esc(v.id)}"
         title="${esc(rolle)}">${esc(v.name)}</button>`).join('');
    n.hidden = false;
    n.innerHTML = `<span>Was kommt ${wo}?</span><span class="balken-wahl">${liste}</span>`
      + '<button class="btn btn-mini" data-setz-neu>andere Stelle</button>'
      + '<button class="btn btn-mini" data-setz-ab>Abbrechen</button>';
    n.querySelectorAll('[data-setz-vorlage]').forEach((b) => {
      b.onclick = () => setzeVorlageAnStelle(b.dataset.setzVorlage);
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
    await zeichnungEinlegen(blob, blob.name ?? 'Datei');
  });
}

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
    // Der Installieren-Knopf steht nur da, solange der Browser ihn anbietet:
    // nicht angemeldet, schon installiert oder abgelehnt - dann fehlt er.
    (kannInstallieren()
      ? iconKnopf('btn-install', 'installieren',
                  'Auf diesem Gerät installieren - läuft danach auch ohne Netz')
      : '') +
    iconKnopf('btn-handbuch', 'info', 'Handbuch: Herleitung und Modellgrenzen') +
    iconKnopf('btn-export', 'export', 'Excel-Ausleitung (.xlsx)') +
    // BESCHRIFTET UND HERVORGEHOBEN. Der Weg nach AxisVM ist der meist
    // begangene dieser Anwendung; als eines von sieben gleich aussehenden
    // Symbolen war er nicht zu finden.
    `<button class="btn-icon btn-icon-text btn-icon-acc" id="btn-axisvm" type="button"
       title="Modell nach AxisVM ausleiten — COM-Brücke, SAF, DXF oder PyNite"
       aria-label="AxisVM-Ausleitung">${icon('schnitt')}<span>AxisVM</span></button>` +
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
    const tag = new Date().toISOString().slice(0, 10);
    store.dateiSpeichern(await store.alsPaket(),
      `Tragjoch-Ablage-${tag}.zip`, 'application/zip');
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
        const r = await store.ausPaket(roh);
        zeichneSchublade();
        alert(`${r.eintraege} Eintrag/Einträge übernommen`
            + `${r.bilder ? `, dazu ${r.bilder} Zeichnung(en)` : ''}.`);
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
  { key: 'auflager', icon: 'auflager', text: 'Auflager: Lage, Feder, Mast' },
  { key: 'masse', icon: 'mass', text: 'Bemassung' },
  { key: 'raster', icon: 'raster', text: 'Bodenraster' },
  /*
   * DIE HINTERLEGTE ZEICHNUNG steht bei den BAUTEILEN, nicht bei den
   * Resultaten: sie zeigt dasselbe Tragwerk, nur gezeichnet statt gerechnet.
   * Ohne eingelegtes Bild bleibt der Schalter stehen und ausgegraut - so
   * sieht man, dass es ihn gibt, und wo das Bild hinkäme.
   */
  { key: 'zeichnung', icon: 'zeichnung',
    text: 'Hinterlegte Querprofil-Zeichnung (nur in der Längsansicht)',
    nurMitZeichnung: true },
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
    iconKnopf('v-ganz', 'zoom', 'Ganzes Joch zeigen, Ansicht zurücksetzen')
    // ZWEI KLICKS STATT LISTE UND FORMULAR: erst wohin, dann was. Der Knopf
    // steht bei der Ansicht, weil dort geklickt wird - nicht im Reiter
    // Anbauteile, wo man ihn erst suchen muesste.
    + iconKnopf('v-setzen', 'anbau',
                'Bauteil setzen — ins Modell klicken, wohin es gehört');
  ui.el('v-setzen').onclick = () => (setzen ? setzenEnde() : setzenStarten());
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
/**
 * Gibt es etwas auf der Zeichnungsebene?
 *
 * Bild ODER Masskette: die Kette gilt auch ohne Bild - sie steht in der
 * Eingabe, nicht im Bild -, und ihre Fanglinien gehören auf dieselbe Ebene.
 */
const zeichnungDa = () => Boolean(ansicht.zeichnung
  || (ansicht.masskette && ansicht.masskette.length));

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
      schalter(`wz-m-${s.key}`, s.icon,
               s.nurMitZeichnung && !zeichnungDa()
                 ? `${s.text} — noch kein Bild eingefügt (Strg+V im Modell) `
                   + 'und keine Masskette'
                 : s.text,
               ansicht.ebenen[s.key],
               !gM || (s.nurMitZeichnung && !zeichnungDa()))).join('')) +
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
  const nw = e ? [
    ['OG', e.max.etaOG.og.eta, `Obergurt ${e.modell.profOG.name}`],
    ['UG', e.max.etaUG.ug.eta, `Untergurt ${e.modell.profUG.name}`],
    ['Bl', e.max.etaB.etaB, 'Bindeblech, massgebende Ebene'],
  ] : [];

  // Die Reiter stehen oben, die Nachweise darunter: oben sucht man den Weg
  // zurück in die Auswertung, unten liest man ab. Die Pillen füllen die
  // verbleibende Höhe; ihre Beschriftung steht senkrecht, weil in 42 mm
  // Breite sonst nur zwei Zeichen Platz hätten.
  r.innerHTML =
    ui.AUSWERTUNG_TABS
      .map((t) => knopf(t.id, t.icon, `${t.titel} öffnen`, t.id === tabAuswertung)).join('') +
    (e ? '<div class="schiene-trenner"></div>' +
         `<div class="schiene-nw">${nw.map(([k, v, titel]) =>
           `<div class="${stufe(v)}"
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
  // Die Zeichnung des vorigen Tragwerks geht mit ihm - sie zeigte ein
  // anderes Bauwerk und wäre hinter dem neuen schlicht falsch.
  ansicht.zeichnung = null;
  kalibrierenEnde();
  aktualisiereProjektKnopf();
  neuRechnen();
  zeichneModellWerkzeuge();
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
        <span>JSON für die COM-Brücke — vollständig, ohne Zusatzmodul.
              Datei neben <code>com/AxisVM_aufbauen.cmd</code> legen</span></label>
      <label class="schalter"><input type="radio" name="fmt" value="saf">
        <span>SAF-Mappe (.xlsx) — vollständig, braucht aber das SAF-Interface
              in AxisVM (kostenpflichtiges Modul)</span></label>
      <label class="schalter"><input type="radio" name="fmt" value="dxf">
        <span>DXF + Zuordnungsmappe — nur die Geometrie; Querschnitte,
              Auflager und Lasten von Hand</span></label>
      <label class="schalter"><input type="radio" name="fmt" value="pynite">
        <span>PyNite-Skript (.py) — freie Gegenrechnung, läuft ohne AxisVM</span></label>
    </div>
    <div class="feld"><label>Knotenmodell</label>${wahl}</div>
    <div class="feld"><label>Auflagermodell</label>${lager}
      <p class="notiz">In Jochachse hält <b>genau ein Knoten</b> — mehr verlangt
         das Gleichgewicht nicht, und jeder weitere wäre ein Zwang. Nur im
         Mastmodell halten beide Fundamente, dort aber über die Biegung der
         Maste.</p></div>
    <div class="feld"><label>Starrelemente</label>
      <label class="schalter"><input type="radio" name="starr" value="koerper" checked>
        <span>als Starrkörper und Verbindungselemente — so, wie AxisVM sie
              führt. Der Übergang Gurt → Anbauteil wird ein
              Verbindungselement; dort lässt sich die Kraftübertragung je
              Richtung einstellen</span></label>
      <label class="schalter"><input type="radio" name="starr" value="staebe">
        <span>als steife Stäbe — dicker Ersatzquerschnitt mit der Güte des
              Tragwerks, gewöhnliche Stabendgelenke</span></label>
    </div>
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
    const am = d.node.querySelector('input[name="am"]:checked').value;
    const sm = d.node.querySelector('input[name="starr"]:checked').value;
    d.zu();
    axisvmKlick(km, fmt, aus, am, sm);
  };
}

function axisvmKlick(knotenmodell, format = 'saf', schottAusblenden = false,
                    auflagerModell = null, starrModell = 'koerper') {
  const m = letzte.erg.modell;
  const deps = { berechne, modell, profOG: m.profOG, profUG: m.profUG,
                 stahl: m.stahl, joch: m.joch };
  const o = { knotenmodell, schottAusblenden, starrModell,
              auflagerModell: auflagerModell ?? auflagerVorgabe(m) };
  if (format === 'json') return exportiereJson(werte, deps, o);
  if (format === 'dxf') return exportiereDxf(werte, deps, o);
  if (format === 'pynite') return exportierePynite(werte, deps, o);
  return exportiereAxisvm(werte, deps, o);
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
  // Dateien von aussen annehmen. BEWUSST VOR der Datenprüfung darunter: fehlt
  // die Datenbasis, ist das Hineinziehen des Datenpakets genau der Weg, der
  // dann gebraucht wird - und der Ausstieg unten käme ihm sonst zuvor.
  dateiEmpfang(dateiAnnehmen);
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
    beiMass: (feld) => zeigeFeld(feld),
    beiAnbauteil: (i) => zeigeAnbauteil(i),
  });

  ui.setzeDiagrammBuehne(zeigeDiagrammGross);
  // Der Knopf erscheint nur im Urteil, und nur wenn der Nachweis nicht
  // erfüllt ist - dort, wo die Frage «und welcher Typ dann?» aufkommt.
  ui.setzeSortimentSuche(dialogSortiment);
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
