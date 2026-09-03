/**
 * ui.js
 * ---------------------------------------------------------------------------
 * DOM-SCHICHT. Baut Eingabemaske und Auswertung aus dem Schema und dem
 * Rechenergebnis. Enthält KEINE Rechnung und KEINE Geometrie; das Aussehen
 * kommt aus js/design.js und css/style.css.
 * ---------------------------------------------------------------------------
 */

import { NACHWEISGRUPPEN, nachweiseAuswahl } from './core.checks.js';
import { optionsSkizze, SKIZZEN_FELDER, bauformSkizze }
  from './doku.optionsskizzen.js';
import { TRAGWERKSARTEN, tragwerksart, tragwerkeSortiert, tragwerkName,
         lageVon, tragwerkeVon, mastenFuer, mastenVon,
         gewaehlterMast, versteckt,
         aufRaster, mastNameAmEnde, tragwerkPos } from './core.constants.js';
import { laengenbereich, getTragjoch } from './data.tragjoche.js';
import { GRUPPEN, FELDER, sichtbareFelder, gruppeGilt,
         optionenFelder, optionenThemen,
         SCHNITT_ORIENTIERUNGEN } from './ui.schema.js';
import { vorlagen, neuesAnbauteil, farbschluessel, baugruppeSumme,
         normalisiereAnbauteil, neuerLastblock, expandiereAnbauteile,
         modulWinkel, ANBAU_ORTE, ortVon, amMast } from './data.anbauteile.js';
import { flBauteile, getFlBauteil, istStreckenlast,
         PROFILBEIWERTE } from './data.fl.js';
import { befestigungsArt, anbauKette, passeTraegerAn,
         hatTraeger } from './core.anbauteile.js';
import { EINWIRKUNGEN } from './core.lasten.js';
import { massketteLesen, fangeAufMasskette } from './core.constants.js';
import { ausSpeicher } from './data.paket.js';
import { MASSVARIANTEN } from './core.vierendeel.js';
import { abschnitt, klapp, kachel, plakette, ampel, esc, icon } from './design.js';
import { skizzeFuer } from './render.skizzen.js';

/*
 * DAS GERECHNETE MODELL, für die Lage eines Anbauteils.
 *
 * Die Maske arbeitet sonst nur mit den EINGABEWERTEN - das genügt für alles,
 * was sie zeigt. Wo aber ein Träger den Bindeblechen ausweichen soll, braucht
 * sie deren Lage und Breite, und die stehen erst im gerechneten Modell
 * (`stationsListe`). Es aus den Eingabewerten neu abzuleiten hiesse, die
 * Blecheinteilung ein zweites Mal zu rechnen - und zwei Rechnungen für
 * dieselbe Sache laufen früher oder später auseinander.
 *
 * Gesetzt wird es bei jedem Durchgang von aussen; fehlt es, wird nur nicht
 * freigeschoben.
 */
let modellFuerLage = null;
export function setzeModellFuerLage(m) { modellFuerLage = m ?? null; }

export const el = (id) => document.getElementById(id);

/**
 * Gemerkter Zustand der einklappbaren Abschnitte.
 *
 * Die Auswertung wird bei jeder Änderung neu gezeichnet. Ohne Gedächtnis
 * fielen alle aufgeklappten Abschnitte dabei wieder zu - man könnte eine
 * Tabelle nicht offen halten, während man am Träger schraubt.
 */
const KLAPP = new Map();

/**
 * Wer erfahren will, ob ein Abschnitt auf- oder zugeklappt wurde.
 *
 * Das Modellfenster hängt daran: solange eine Anbauteil-Karte offen ist, zeigt
 * es das Teil in der Einzelheit; sobald sie zufällt, kommt das ganze Joch
 * zurück. Ohne diese Meldung müsste man raten, wann das Bearbeiten zu Ende ist.
 */
let beiKlappWechsel = null;
export const setzeKlappHandler = (fn) => { beiKlappWechsel = fn; };

export function verdrahteKlapp(node) {
  node.querySelectorAll('[data-klapp]').forEach((d) => {
    const k = d.dataset.klapp;
    if (KLAPP.has(k)) d.open = KLAPP.get(k);
    if (d.dataset.klappVerdrahtet) return;
    d.dataset.klappVerdrahtet = '1';
    d.addEventListener('toggle', () => {
      KLAPP.set(k, d.open);
      beiKlappWechsel?.(k, d.open);
    });
  });
}

/** Ist ein Abschnitt gerade offen? */
export const klappOffen = (k) => KLAPP.get(k) === true;

/**
 * Einen Abschnitt von aussen auf- oder zuklappen.
 * Wird gebraucht, wenn ein Klick ins Modell die Oberfläche aufräumen soll:
 * das angeklickte Teil auf, die übrigen zu.
 */
export function setzeKlapp(k, offen) {
  KLAPP.set(k, offen);
  document.querySelectorAll(`[data-klapp="${CSS.escape(k)}"]`)
    .forEach((d) => { d.open = offen; });
}

const f3 = (v) => (Number.isFinite(v) ? v.toFixed(3) : '–');
const f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : '–');
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : '–');
const f0 = (v) => (Number.isFinite(v) ? v.toFixed(0) : '–');

/**
 * Reiter der Eingabe: welche Schemagruppen gehören zusammen.
 * Das Symbol steht in der eingeklappten Schiene.
 */
export const EINGABE_TABS = [
  // Die Verortung ist HERAUSGENOMMEN: sie steht in der Bannerschublade beim
  // Projekt. Sie geht in keine Rechnung ein und kostete hier die obersten
  // drei Zeilen, durch die man bei jeder Massaenderung hindurchscrollt.
  /*
   * DIE MASTEN STEHEN NEBEN DER AUFLAGERUNG, nicht darin (Weisung,
   * 28. August: «die Haupttragwerke sollten global gesteuert werden»).
   *
   * Sie sind ein eigenes Haupttragwerk - und dort wächst später weiter, was
   * dazugehört: Einzelmasten, Masten mit Tragausleger, Zuganker,
   * Druckstützen. Im Reiter «System» bleiben sie beisammen mit dem Joch;
   * einen eigenen Reiter bekommen sie erst, wenn sie einen füllen.
   */
  { id: 'system', titel: 'System', icon: 'system',
    // Die Tragwerksart zuerst: sie entscheidet, welche der folgenden Gruppen
    // ueberhaupt erscheinen.
    gruppen: ['art', 'typ', 'geo', 'aufl', 'mast'] },
  // Die Stückliste gehört zu den Profilen: sie sagt, was aus der gewählten
  // Profil- und Blechwahl an Stahl herauskommt. Als eigener Auswertungsreiter
  // stand sie weit weg von der Entscheidung, die sie beeinflusst.
  { id: 'profil', titel: 'Profile', icon: 'profil', gruppen: ['prof', 'blech', 'stueck'] },
  { id: 'anbau', titel: 'Anbauteile', icon: 'anbau', gruppen: ['trasse', 'anbau'] },
  { id: 'lasten', titel: 'Lasten', icon: 'lastpfeil', gruppen: ['ein', 'komb'] },
];

/** Reiter der Auswertung. */
export const AUSWERTUNG_TABS = [
  { id: 'uebersicht', titel: 'Übersicht', icon: 'uebersicht' },
  { id: 'schnitt', titel: 'Schnitt', icon: 'schnitt' },
  { id: 'verlauf', titel: 'Verläufe', icon: 'achsen' },
  { id: 'auflager', titel: 'Auflager', icon: 'auflager' },
];

export function zeichneTabs(node, tabs, aktiv, beiWahl) {
  node.innerHTML = tabs.map((t) =>
    `<button class="tab${t.id === aktiv ? ' on' : ''}" data-tab="${t.id}" type="button">${esc(t.titel)}</button>`
  ).join('');
  node.querySelectorAll('[data-tab]').forEach((b) => {
    b.addEventListener('click', () => beiWahl(b.dataset.tab));
  });
}

// --- Eingabemaske -----------------------------------------------------------

/**
 * Kennung des STRUKTURELLEN Zustands der Maske.
 *
 * Solange sie gleich bleibt, dürfen die Eingabefelder stehenbleiben und es
 * genügt, ihre Werte nachzuführen. Das ist nicht bloss eine Optimierung: würde
 * die Maske bei jedem Tastendruck neu gebaut, verlöre das Feld unter dem
 * Cursor den Fokus, und eine halb getippte Zahl wie «0.» würde beim Zurück-
 * schreiben zu «0» - man müsste nach jeder Ziffer neu hineinklicken.
 */
/**
 * Der zuletzt gezeichnete Eingabestand.
 *
 * Die Ereignisse der Maske werden nur beim VOLLEN Neuaufbau verdrahtet. Würden
 * sie den damals übergebenen Zustand festhalten, arbeiteten sie nach der ersten
 * Änderung mit veralteten Werten weiter - zwei Änderungen hintereinander in
 * derselben Karte würden sich gegenseitig überschreiben. Deshalb lesen sie
 * hier nach, statt sich etwas zu merken.
 */
let aktuelleWerte = null;

/**
 * DIE GRUPPEN EINES REITERS, gefiltert nach der Tragwerksart.
 *
 * EINE Quelle fuer die Signatur UND fuer die Zeichnung. Zwei getrennte
 * Listen waren genau der Fehler, an dem die Bauformwahl zuerst scheiterte:
 * gezeichnet wurde gefiltert, die Signatur zaehlte ungefiltert - sie blieb
 * beim Umschalten gleich, die Maske wurde nicht neu gebaut, und die
 * angeklickte Karte sprang zurueck. Der Wert war laengst gesetzt.
 */
export function gruppenFuer(tab, werte) {
  const gruppen = EINGABE_TABS.find((t) => t.id === tab)?.gruppen ?? [];
  return gruppen.filter((gid) => gruppeGilt(gid, werte));
}

export function maskenSignatur(werte, tab) {
  const gruppen = gruppenFuer(tab, werte);
  return JSON.stringify([
    tab, Boolean(werte.bearbeiten), Boolean(werte.lastenBearbeiten),
    /*
     * >>> DIE SIGNATUR ENTHAELT NUR, WAS DIE STRUKTUR AENDERT. <<<
     *
     * Sie entscheidet, ob die Maske NEU GEBAUT wird. Ein Neubau ersetzt
     * jedes Eingabefeld - und damit auch das, das man gerade in der Hand
     * hat.
     *
     * GENAU DAS IST PASSIERT. Hier standen der NAME des Tragwerks («J90 ·
     * 20.00 m»), seine LAGE und die Liste der Masten mit ihren Stellen.
     * Alle drei haengen an der Jochlaenge. Wer den Schieber «Jochlänge»
     * zog, baute damit bei JEDEM Rasterschritt die ganze Maske neu, der
     * Schieber unter dem Finger verschwand, und das Ziehen brach ab.
     * Gemeldet am 2. September: «der schieber hackt ab nach dem ersten
     * raster». Dasselbe galt fuer das Zahlenfeld der Lage: jeder Tastendruck
     * nahm ihm den Fokus.
     *
     * Was hier bleibt, ist die STRUKTUR: wieviele Tragwerke, welcher Art,
     * welches gerechnet wird, welche ausgeblendet sind. Davon haengt ab,
     * WELCHE Felder dastehen.
     *
     * Was sich staendig aendert - Name, Laenge, Lage, Mastprofil - wird
     * NACHGEFUEHRT statt neu gebaut (siehe `zeichneLeisteNeu` in
     * aktualisiereMaske). Dieselbe Trennung wie bei jedem Zahlenfeld.
     */
    tragwerkeSortiert(werte).map(
      (t) => `${t.id}:${tragwerksart(t).key}:${t.aktiv ? 1 : 0}`
           + `:${versteckt(t) ? 1 : 0}:${t.mastVorhanden === false ? 0 : 1}`),
    gruppen.map((gid) => (gid === 'anbau'
      // Die Befestigungsart gehört dazu: sie ändert den Erklärtext am Feld.
      // Ebenso die Rolle der Module (Drahtwerk zeigt den Winkel statt der
      // Länge) und die Einwirkungsgruppe je Lastblock.
      // DER STANDORT GEHÖRT DAZU. Er entscheidet, WELCHE Felder die Karte
      // zeigt - am Joch die Lage x mit Befestigung und Raster, am Masten die
      // Höhe über Fundament. Ohne ihn in der Signatur blieb die Karte beim
      // Umschalten stehen: der Wert war gesetzt, die Maske zeigte weiter die
      // Jochfelder.
      ? (werte.anbauteile ?? []).map(
          (a) => `${a.id}:${a.aktiv !== false}:${befestigungsArt(a)}:` +
                 `${ortVon(a)}:` +
                 `${klappOffen(`at-${a.id}`)}:${a.gleis ?? ''}:` +
                 (a.module ?? []).map((m) => m.bauteil).join(',') + ':' +
                 (a.lasten ?? []).map((l) => l.einwirkung).join(','))
      : sichtbareFelder(gid, werte).map((f) => f.key))),
  ]);
}

export function zeichneMaske(container, werte, tab, onChange, onAnbau, extras = {}) {
  aktuelleWerte = werte;
  /*
   * WAS NICHT GILT, VERSCHWINDET (Weisung, 1. September: «wenn nicht aktiv
   * Eingabe ausblenden, sonst verwirrend»).
   *
   * Beim Einzelmast gibt es keinen Traeger - also auch keinen Jochtyp, keine
   * Gurtprofile, keine Bindebleche, keine Auflagerung eines Jochs. Grau
   * dastehende Felder wuerden behaupten, es gaebe dort etwas zu entscheiden.
   */
  const gruppen = gruppenFuer(tab, werte);
  container.innerHTML = gruppen.map((gid) => {
    const g = GRUPPEN.find((x) => x.id === gid);
    if (!g) return '';
    const zusatz = extras[gid] ? `<div data-extra="${gid}">${extras[gid]}</div>` : '';
    if (gid === 'anbau') return anbauteileHtml(g, werte) + zusatz;
    const felder = sichtbareFelder(gid, werte);
    // Eine Gruppe kann ohne eigenes Eingabefeld auskommen und nur aus einem
    // Zusatzstück bestehen - die Lastfallmatrix ist so ein Fall.
    if (!felder.length) return zusatz;
    const knopf = felder.some((f) => f.ausDB) ? bearbeitenKnopf(werte)
                : felder.some((f) => f.ausLast) ? lastenKnopf(werte) : '';
    return abschnitt(g.titel, knopf) +
           felder.map((f) => feldHtml(f, feldWert(f, werte), werte)).join('') + zusatz;
  }).join('');

  container.querySelectorAll('[data-feld]').forEach((inp) => {
    const key = inp.dataset.feld;
    const feld = FELDER.find((f) => f.key === key);
    const ev = inp.tagName === 'SELECT' || inp.type === 'checkbox' ? 'change' : 'input';
    inp.addEventListener(ev, () => {
      let v;
      if (feld.typ === 'zahl' || feld.typ === 'schieber') {
        v = parseFloat(inp.value); if (!Number.isFinite(v)) return;
      }
      else if (feld.typ === 'schalter') v = inp.checked;
      else if (feld.zahl) v = parseFloat(inp.value);
      else v = inp.value;
      onChange(key, v);
    });
  });
  container.querySelectorAll('[data-bauform]').forEach((b) => {
    b.addEventListener('click', () =>
      onChange(b.dataset.feldBauform, b.dataset.bauform));
  });
  /*
   * DAS TRAGWERKFELD WIRD EIGEN VERDRAHTET - es wird zweimal aufgebaut.
   *
   * Einmal hier beim Bau der Maske, und einmal beim Nachfuehren, wenn sich
   * Laenge oder Lage geaendert haben (leisteNachfuehren). Der Rueckruf wird
   * dafuer gemerkt.
   */
  leisteAendern = onChange;
  verdrahteTragwerkfeld(container, werte, onChange);
  container.querySelectorAll('[data-bearbeiten]').forEach((b) => {
    b.addEventListener('click', () =>
      onChange('bearbeiten', !(aktuelleWerte ?? werte).bearbeiten));
  });
  container.querySelectorAll('[data-lasten-bearbeiten]').forEach((b) => {
    b.addEventListener('click', () =>
      onChange('lastenBearbeiten', !(aktuelleWerte ?? werte).lastenBearbeiten));
  });
  verdrahteAnbauteile(container, werte, onAnbau);
  verdrahteKlapp(container);
}

/**
 * Werte in eine BESTEHENDE Maske nachführen, ohne sie neu zu bauen.
 *
 * Das Feld unter dem Cursor bleibt unangetastet - sonst würde eine gerade
 * getippte Zahl überschrieben. Alle anderen Felder folgen, damit Schieber und
 * Zahlenfeld desselben Werts zusammenbleiben und die gespiegelten
 * Tabellenlasten aktuell sind.
 */
export function aktualisiereMaske(container, werte, extras = {}) {
  aktuelleWerte = werte;
  /*
   * DIE QUERPROFIL-LEISTE WIRD NACHGEFUEHRT.
   *
   * Sie zeigt Laenge, Lage und Mastprofile - lauter Zahlen, die sich beim
   * Ziehen eines Schiebers fortwaehrend aendern. Sie dafuer in die Signatur
   * zu setzen hiesse, die ganze Maske mitzuziehen (siehe dort). Also wird
   * hier nur SIE neu gezeichnet, samt ihrer Verdrahtung.
   *
   * WAEHREND EINES ZUGS AN DER LEISTE SELBST passiert das nicht: Balken und
   * Masten melden erst beim Loslassen. Ein Neuzeichnen mittendrin naehme
   * dem Zeiger sein Element - derselbe Fehler eine Ebene tiefer.
   */
  leisteNachfuehren(container, werte);
  /*
   * >>> EINE BESCHRIFTUNG, DIE RECHNET, MUSS MITLAUFEN. <<<
   *
   * «Anschlusshöhe Ende A · Mast M2» haengt daran, welches Tragwerk gerechnet
   * wird und wo es steht - lauter Dinge, die NICHT mehr in der
   * Maskensignatur stehen (sie zogen sonst den Schieber mit, siehe dort).
   * Ohne diese Zeile blieb die Beschriftung stehen: gemessen am
   * 2. September stand «Mast M1» ueber einem Feld, das M2 meinte.
   *
   * Nur die gerechneten Beschriftungen - die festen anzufassen hiesse, bei
   * jedem Tastendruck jeden Text im Formular neu zu setzen.
   */
  container.querySelectorAll('[data-feld]').forEach((inp) => {
    const f = FELDER.find((x) => x.key === inp.dataset.feld);
    if (typeof f?.label !== 'function') return;
    const l = inp.closest('.feld')?.querySelector('label');
    if (!l) return;
    const neu = f.label(werte) + (f.sym ? ` ${f.sym}` : '');
    if (l.innerText.replace(/\s+/g, ' ').trim() !== neu) {
      l.innerHTML = `${esc(f.label(werte))}${f.sym ? ` <em>${esc(f.sym)}</em>` : ''}`;
    }
  });
  const aktiv = document.activeElement;
  container.querySelectorAll('[data-feld]').forEach((inp) => {
    if (inp === aktiv) return;
    const f = FELDER.find((x) => x.key === inp.dataset.feld);
    if (!f) return;
    const v = feldWert(f, werte);
    if (f.typ === 'schalter') { inp.checked = Boolean(v); return; }
    // Der Schieberbereich folgt dem Sortiment des gewählten Typs
    if (inp.type === 'range' || f.typ === 'schieber') {
      if (f.min !== undefined) inp.min = f.min;
      if (f.max !== undefined) inp.max = f.max;
    }
    if (String(inp.value) !== String(v)) inp.value = v;
  });
  /*
   * DIE NOTIZ WIRD MITGEFUEHRT.
   *
   * Sie ist eine gerechnete Groesse zu dem, was gerade eingetippt ist - der
   * Ablenkwinkel zu Radius und Spannweite. Bliebe sie stehen, waere sie
   * schlimmer als keine: sie zeigte den Winkel des VORIGEN Radius, und man
   * traute ihr, weil sie gerade neben dem Feld steht.
   *
   * Die Maske wird nur bei geaenderter SIGNATUR neu gebaut; eine andere Zahl
   * im selben Feld aendert sie nicht. Also hier.
   */
  /*
   * DIE SKIZZE WIRD EBENSO MITGEFUEHRT.
   *
   * Sie zeigt die Stellung des Feldes, nicht seine Beschriftung: bei der
   * Stegrichtung steht das I-Profil einmal hochkant und einmal gedreht. Die
   * Maske wird aber nur bei geaenderter SIGNATUR neu gebaut, und ein anderer
   * WERT im selben Feld aendert sie nicht - die Skizze blieb deshalb stehen,
   * wie sie beim Aufbau der Maske war. Man schaltete um, die Auswahl folgte,
   * das Bild nicht.
   */
  container.querySelectorAll('.feld').forEach((n) => {
    const inp = n.querySelector('[data-feld]');
    if (!inp || !SKIZZEN_FELDER.includes(inp.dataset.feld)) return;
    const soll = optionsSkizze(inp.dataset.feld, feldWert(
      FELDER.find((x) => x.key === inp.dataset.feld) ?? {}, werte));
    const alt = n.querySelector('.opt-skizze');
    if (!soll) { alt?.remove(); return; }
    if (!alt) { inp.insertAdjacentHTML('afterend', soll); return; }
    // Nur austauschen, wenn sich wirklich etwas geaendert hat: ein
    // unnoetiges Ersetzen laesst die Skizze bei jeder Eingabe flackern.
    const neu = document.createElement('div');
    neu.innerHTML = soll;
    if (neu.firstElementChild.innerHTML !== alt.innerHTML) {
      alt.replaceWith(neu.firstElementChild);
    }
  });

  container.querySelectorAll('.feld').forEach((n) => {
    const inp = n.querySelector('[data-feld]');
    const f = inp ? FELDER.find((x) => x.key === inp.dataset.feld) : null;
    if (!f || typeof f.notiz !== 'function') return;
    const soll = f.notiz(werte);
    let alt = n.querySelector('.feld-notiz');
    if (!soll) { alt?.remove(); return; }
    if (!alt) {
      alt = document.createElement('small');
      alt.className = 'feld-notiz';
      // Vor den Hinweistext, so wie beim Aufbau der Maske - die Notiz gehoert
      // an das Feld, der Hinweis darunter.
      const hin = n.querySelector('.hinweis, details');
      if (hin) n.insertBefore(alt, hin); else n.appendChild(alt);
    }
    if (alt.textContent !== soll) alt.textContent = soll;
  });

  const teilVon = (i) => {
    const roh = (werte.anbauteile ?? [])[i];
    return roh ? normalisiereAnbauteil(roh) : null;
  };
  container.querySelectorAll('.at-karte .at').forEach((inp) => {
    if (inp === aktiv) return;
    const a = teilVon(+inp.closest('.at-karte').dataset.idx);
    if (!a) return;
    const k = inp.dataset.k;
    const v = k === 'befestigung' ? befestigungsArt(a) : a[k];
    if (inp.type === 'checkbox') inp.checked = a.aktiv !== false;
    else if (String(inp.value) !== String(v ?? 0)) inp.value = v ?? 0;
  });
  // Die aus der Tabelle gerechneten Lasten der Module hängen an Trasse,
  // Spannweite und Einwirkungsklasse - sie müssen mitgeführt werden, auch wenn
  // sich an der Struktur der Maske nichts ändert.
  const trasse = trasseVon(werte);
  container.querySelectorAll('.at-karte').forEach((karte) => {
    const a = teilVon(+karte.dataset.idx);
    if (!a) return;
    const kopf = karte.querySelector('.klapp-r');
    if (kopf) kopf.textContent = baugruppeKopf(a, trasse);
    karte.querySelectorAll('.modul[data-modul]').forEach((d) => {
      const m = (a.module ?? [])[+d.dataset.modul];
      if (!m) return;
      let b = null;
      try { b = getFlBauteil(m.bauteil); } catch { /* unbekannt */ }
      d.querySelectorAll('.mod').forEach((inp) => {
        if (inp === aktiv || inp.tagName === 'SELECT') return;
        // Die Wirkungshaken: fehlt die Angabe, wirkt der Anteil.
        if (inp.type === 'checkbox') {
          inp.checked = m[inp.dataset.mk] !== false;
          return;
        }
        // Dieselbe Vorgabe wie beim Aufbau der Karte - sonst zeigt das Feld
        // vor der ersten Rechnung etwas anderes als danach.
        const v = modWert(m, inp.dataset.mk);
        const soll = v === null || v === undefined ? '' : String(v);
        if (inp.value !== soll) inp.value = soll;
      });
      const l = baugruppeSumme({ ...a, module: [m], lasten: [] }, trasse);
      d.querySelector('.modul-lasten').innerHTML = modulLastenHtml(l, b);
    });
    karte.querySelectorAll('.lastblock[data-last]').forEach((d) => {
      const bl = (a.lasten ?? [])[+d.dataset.last];
      if (!bl) return;
      d.querySelectorAll('.lb').forEach((inp) => {
        if (inp === aktiv) return;
        const v = bl[inp.dataset.lk] ?? 0;
        if (String(inp.value) !== String(v)) inp.value = v;
      });
    });
  });
  // Die mitgeführten Ergebnisstücke (Querschnittsklassen, Lastfallmatrix)
  Object.entries(extras).forEach(([gid, html]) => {
    const n = container.querySelector(`[data-extra="${gid}"]`);
    if (n && n.innerHTML !== html) n.innerHTML = html;
  });
  verdrahteKlapp(container);
}

/**
 * Blecheinteilung und Bindebleche des gewählten Typs, schreibgeschützt.
 *
 * Ohne diese Übersicht sah man im Regelfall (Bleche aus der Typendatenbank)
 * überhaupt nicht, mit welcher Teilung und welchen Blechen gerechnet wird -
 * der Abschnitt «Bindebleche» blieb leer, weil alle Eingabefelder nur bei
 * manueller Blechwahl gelten.
 */
/**
 * DIE BEIDEN HEBELARME, SICHTBAR.
 *
 * h und b entscheiden über jede Gurtkraft (N = M/h bzw. M/b) und standen
 * bisher nur im Verlaufsblatt. Ein falsch verstandenes Zeichnungsmass fällt
 * damit erst am Ende auf - beim Nachbau eines Signaljochs waren es 18 % auf h
 * und 20 % auf b, ohne dass irgendetwas danach ausgesehen hätte.
 *
 * Deshalb stehen sie hier neben den Massen, mit ihrer Herleitung und einer
 * Plausibilitätsschranke: h kann nie grösser als jd und nie kleiner als
 * jd − 2·max(zs) sein.
 */
export function hebelarmUebersicht(erg) {
  const m = erg.modell;
  const ha = m.hebelarme;
  if (!ha) return '';
  const mm = (v) => f0(v * 1000);
  const zsO = m.profOG.zsH * 10, zsU = m.profUG.zsH * 10;
  const hMin = m.jd - 2 * Math.max(zsO, zsU), hMax = m.jd;
  const hIst = m.h * 1000;
  const heikel = hIst > hMax + 1 || hIst < hMin - 1;
  const stA = ha.stehendAussen ?? { og: false, ug: false };
  const lage = (aussen) => (aussen ? 'Schenkel aussen' : 'Schenkel innen');
  return `${abschnitt('Hebelarme des Kräftepaars')}
    <div class="kennzahlen">
      ${kachel('h', mm(m.h), 'mm · Gurtschwerachsen')}
      ${kachel('b', mm(m.b), 'mm · Ebenenabstand')}
    </div>
    <p class="hinweis" style="margin:2px 0 0">
      h = jd − zs<sub>OG</sub> − zs<sub>UG</sub> = ${f0(m.jd)} − ${f1(zsO)} − ${f1(zsU)}
      = ${mm(m.h)} mm<br>
      b: Obergurt ${mm(ha.bOG ?? m.b)} mm (${esc(lage(stA.og))}) ·
      Untergurt ${mm(ha.bUG ?? m.b)} mm (${esc(lage(stA.ug))})
    </p>
    ${heikel ? `<p class="hinweis" style="color:var(--fail)">
      <b>h liegt ausserhalb des Erwartungsbereichs</b> (${f0(hMin)} … ${f0(hMax)} mm).
      Meist ist jd das falsche Zeichnungsmass: gemeint ist der Abstand
      <b>Winkelrücken zu Winkelrücken</b>, nicht das Aussenmass über die
      Anschlussbleche.</p>` : ''}`;
}

export function blechUebersichtHtml(erg) {
  if (!erg) return '';
  const m = erg.modell;
  const st = m.stationsListe ?? [];
  if (!st.length) return '';

  // Feldweiten aus den Stationen, nicht aus dem Sollwert
  const felder = st.slice(1).map((s, i) => (s.x - st[i].x) * 1000);
  const kette = felder.map((d) => d.toFixed(0)).join(' · ');
  const quelle = m.teilungQuelle === 'masstabelle'
    ? `Mass-Tabelle${m.ausfuehrung ? ` · Ausführung ${m.ausfuehrung.bez}` : ''}`
    : 'gleichmässig gerechnet';

  // Bleche zählen, je Ebene und Position
  const zaehler = new Map();
  st.forEach((s) => {
    [['Vertikal', s.vertikal], ['Horizontal', s.horizontal]].forEach(([art, b]) => {
      if (!b) return;
      const k = `${art}|${b.pos}|${b.breite}|${b.dicke}|${b.laenge ?? ''}`;
      zaehler.set(k, (zaehler.get(k) ?? 0) + 2);
    });
  });
  const zeilen = [...zaehler.entries()].map(([k, n]) => {
    const [art, pos, breite, dicke, laenge] = k.split('|');
    return `<tr><td>${esc(art)}</td><td>${esc(pos)}</td>
      <td class="num">${breite}×${dicke}${laenge ? '×' + laenge : ''}</td>
      <td class="num">${n}</td></tr>`;
  }).join('');

  const inhalt = `
    <p class="notiz" style="margin-top:0">Herkunft der Teilung: <b>${esc(quelle)}</b> ·
      ${st.length} Stationen · Feldweiten [mm] vom linken Jochende:</p>
    <p class="kette">${esc(kette)}</p>
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Ebene</th><th>Pos</th><th class="num">b×t×L [mm]</th>
        <th class="num">Stk</th></tr></thead>
      <tbody>${zeilen}</tbody></table></div>
    <p class="notiz">Am Jochende steht nur ein stehendes Blech, dort bildet das
      Joch eine <b>Gabel</b> für die Montage am Mast.</p>`;

  return klapp('blech-uebersicht', 'Blecheinteilung und Bindebleche', inhalt,
               `${st.length} Stationen · ${m.blechQuelle === 'datenbank'
                  ? 'Typendatenbank' : 'manuell'}`);
}

/**
 * Entsperrt die charakteristischen Einwirkungen.
 * Gesperrt zeigen sie die Werte der Sortimentstabelle - man sieht also immer,
 * womit gerechnet wird. Entsperrt schaltet die Herkunft auf "manuell".
 */
function lastenKnopf(werte) {
  return `<button class="btn btn-mini${werte.lastenBearbeiten ? ' btn-acc' : ''}"
    data-lasten-bearbeiten type="button"
    title="${werte.lastenBearbeiten
      ? 'Zurück auf die Werte der Sortimentstabelle'
      : 'Charakteristische Einwirkungen von Hand überschreiben'}">
    ${werte.lastenBearbeiten ? 'Tabellenwerte' : 'Werte bearbeiten'}</button>`;
}

function bearbeitenKnopf(werte) {
  return `<button class="btn btn-mini${werte.bearbeiten ? ' btn-acc' : ''}"
    data-bearbeiten type="button"
    title="${werte.bearbeiten
      ? 'Datenbankwerte sind entsperrt, erneut klicken, um sie zu schützen'
      : 'Datenbankwerte von Hand überschreiben'}">
    ${werte.bearbeiten ? 'sperren' : 'Werte bearbeiten'}</button>`;
}

/**
 * Hilfetext an einem Eingabefeld.
 *
 * Kurze Hinweise stehen als Ganzes da - sie sind schneller gelesen als
 * aufgeklappt. Lange werden auf den ERSTEN SATZ gekürzt; er trägt in diesen
 * Texten die Aussage, der Rest ist Begründung und Herleitung. Der Rest kommt
 * auf Klick.
 *
 * Ohne das stehen unter manchem Feld sechs Zeilen Fliesstext, und die Eingabe
 * darunter rutscht aus dem Bild - man scrollt zwischen zwei Zahlen durch
 * Erklärungen, die man beim zehnten Mal nicht mehr braucht.
 *
 * Der Zustand hängt am gemeinsamen Klapp-Gedächtnis (verdrahteKlapp), damit
 * ein aufgeklappter Hinweis das Neuzeichnen der Maske übersteht.
 *
 * @param {string} schluessel eindeutig je Feld
 * @param {string} text
 */
const HINWEIS_KURZ = 95;              // Zeichen, ab denen gekürzt wird
const HINWEIS_LANG = 200;             // ab hier wird auch ohne Satzgrenze gekürzt

export function hinweisHtml(schluessel, text) {
  const t = String(text ?? '').trim();
  if (!t) return '';
  const ganz = `<small class="hinweis">${esc(t)}</small>`;
  if (t.length <= HINWEIS_KURZ) return ganz;

  // Satzende suchen: Punkt/Doppelpunkt, danach Leerzeichen und ein Zeichen,
  // mit dem ein Satz beginnt. Die Mindestlänge verhindert, dass eine
  // Abkürzung («z. B.») den Satz vorzeitig beendet.
  const m = t.match(/^([\s\S]{25,}?[.:!?])\s(?=[A-ZÄÖÜ«("])/);
  const rest = m ? t.slice(m[1].length).trim() : t;

  // Ein einzelner langer Satz wird NICHT zerschnitten - eine Kurzfassung, die
  // mitten im Satz aufhört, ist schlechter als zwei Zeilen Fliesstext. Erst
  // wenn er wirklich ausufert, wird abgeschnitten und der ganze Text
  // aufgeklappt.
  if (!m && t.length <= HINWEIS_LANG) return ganz;
  if (!m || rest.length < 25) {
    if (t.length <= HINWEIS_LANG) return ganz;
  }
  const kopf = m ? m[1] : t.slice(0, HINWEIS_KURZ).replace(/\s+\S*$/, '') + ' …';

  return `<details class="hinweis-klapp" data-klapp="hw-${esc(schluessel)}">
    <summary><small class="hinweis">${esc(kopf)}</small></summary>
    <small class="hinweis">${esc(rest)}</small></details>`;
}

/*
 * ABGELEITETE FELDER.
 *
 * Manche Felder zeigen nicht ihren eigenen gespeicherten Wert, sondern einen,
 * der aus anderen folgt - der Ablenkwinkel aus Radius und Spannweite. Sie
 * SIND trotzdem Eingabefelder: wer hineintippt, schreibt die Groesse, aus der
 * sie folgen (die Kopplung steht in app.js).
 *
 * >>> WARUM NICHT IM ZUSTAND FUEHREN. <<<
 * Zwei Zahlen fuer dieselbe Groesse laufen frueher oder spaeter auseinander -
 * spaetestens beim Oeffnen einer aelteren Datei, in der nur eine von beiden
 * steht. Dann zeigt das eine Feld einen Bogen von 300 km und das andere
 * −4.5 Grad, und beide sehen richtig aus. Gerechnet wird mit EINER Zahl; die
 * andere wird gezeigt.
 */
const feldWert = (f, werte) =>
  (typeof f.wertAus === 'function' ? f.wertAus(werte) : werte[f.key]);

/* ===========================================================================
 * DIE QUERPROFIL-LEISTE
 *
 * Weisung vom 2. September: «kann man aus diesen eingaben nicht etwas
 * interaktiveres machen? es ist alles etwas verstreut. ich verstehe nicht
 * ganz all die einzelnen buttons und kacheln.»
 *
 * >>> VIER BEDIENELEMENTE FUER EINE FRAGE. <<<
 *
 * Hier standen: Tragwerkskacheln mit je einem Masten-Schalter und einem
 * Kreuz, darunter eine Reihe Mastkacheln, darunter vier Knoepfe zum
 * Hinzufuegen, darunter ein Zahlenfeld «Lage auf dem Querprofil». Alle
 * beantworten dieselbe Frage - WAS STEHT AUF DIESEM BLATT UND WO -, und
 * keines zeigt es. Sie beschreiben die Anordnung in Worten («x₀ = 20.00 m»),
 * waehrend der Anwender ein Querprofil vor sich hat, auf dem sie zu sehen
 * ist.
 *
 * Die Leiste ist dieselbe Anordnung als BILD: eine massstaebliche x-Achse
 * des Blattes, jedes Tragwerk ein Balken auf seiner Lage, jeder Mast eine
 * Marke an seiner Stelle. Anklicken waehlt, Ziehen verschiebt.
 *
 * ================== WARUM HTML UND NICHT SVG ==============================
 *
 * Die Balken sind KNOEPFE. In HTML sind sie das von selbst - mit Fokus,
 * Tastaturbedienung und Titel; in SVG muesste jedes davon nachgebaut
 * werden. Die Lage ist ein Prozentwert, und den rechnet CSS aus.
 *
 * ================== DAS ZAHLENFELD BLEIBT =================================
 *
 * Ziehen ist grob - ein Pixel sind auf 240 Punkten Breite und vierzig Metern
 * Blatt rund siebzehn Zentimeter. Wer eine Lage auf den Zentimeter kennt,
 * tippt sie. Das Bild gibt die Uebersicht, das Feld die Genauigkeit; beides
 * abzuschaffen, weil das andere da ist, waere ein Verlust.
 * =========================================================================== */

/*
 * DIE LEISTE BEDIENEN.
 *
 * Drei Gesten auf demselben Element, und sie duerfen sich nicht ins Gehege
 * kommen:
 *
 *   KLICK auf einen Balken  -> dieses Tragwerk wird gerechnet
 *   ZIEHEN eines Balkens    -> seine Lage auf dem Blatt
 *   KLICK auf eine Marke    -> dieser Mast wird bearbeitet
 *
 * >>> ZIEHEN UND KLICKEN TRENNT DIE SCHWELLE, NICHT DIE TASTE. <<<
 *
 * Unter drei Pixeln gilt es als Klick. Ohne diese Schwelle waere jeder
 * Klick ein Zug um null Meter - und jeder Zug ein Klick, der beim Loslassen
 * noch einmal umschaltet.
 *
 * >>> GERECHNET WIRD ERST BEIM LOSLASSEN. <<<
 *
 * Waehrend des Zugs wird nur die Leiste neu gezeichnet, mit der Lage als
 * Zahl daneben. Bei jedem Pixel durchzurechnen hiesse, ein Joch mit
 * sechshundert Knoten sechzigmal in der Sekunde zu loesen.
 */
const QP_SCHWELLE = 3;

/**
 * WAS EIN MAST IST - Ende A, Ende B, oder beides zugleich.
 *
 * `alsA` nennt das Tragwerk, dessen linkes Ende er ist; `alsB` das, dessen
 * rechtes. Ein geteilter Mast hat beides, und dann haengt an ihm die Laenge
 * des einen und die Lage des anderen.
 *
 * @returns {{x:number, alsA:object|null, alsB:object|null}|null}
 */
export function mastRollen(werte, mastId) {
  const m = mastenVon(werte).find((x) => x.id === mastId);
  if (!m) return null;
  let alsA = null, alsB = null;
  tragwerkeSortiert(werte).forEach((t) => {
    const [a, b] = mastenFuer(werte, t);
    if (a && a.id === mastId) alsA = { t, x0: lageVon(t) };
    if (b && b.id === mastId) alsB = { t, x0: lageVon(t) };
  });
  return { x: m.x, alsA, alsB };
}

/**
 * Wohin ein gezogener Mast darf.
 *
 * Nach unten die Laenge, die der Jochtyp mindestens fuehrt, nach oben die
 * groesste - und dazu der Nachbar auf der anderen Seite: ein Zwischenmast,
 * ueber sein Nachbarjoch hinausgezogen, brauchte eine negative Laenge.
 */
export function mastGrenzen(rollen, x) {
  let unten = -Infinity, oben = Infinity;
  if (rollen.alsB) {
    const b = laengenbereich(getTragjoch(rollen.alsB.t.typ));
    unten = Math.max(unten, rollen.alsB.x0 + b.min);
    oben = Math.min(oben, rollen.alsB.x0 + b.max);
  }
  /*
   * >>> DIE LAENGENGRENZE GILT NUR DEM ENDE B. <<<
   *
   * Hier stand sie auch fuer das Ende A - und das war falsch. Am Ende A
   * gezogen VERSCHIEBT sich das Tragwerk (x0 wandert, L bleibt); seine
   * Laenge aendert sich also gar nicht, und eine Laengengrenze hatte dort
   * nichts zu suchen. Bei einem J90 (8 bis 26.5 m) liess sich ein Joch von
   * 20 m deshalb nur zwischen -6.5 und +12 m um sein rechtes Ende
   * verschieben - eine Schranke, die niemand erklaeren kann.
   *
   * Am Ende B dagegen aendert das Ziehen die LAENGE, und dort ist der
   * Sortimentsbereich die richtige Grenze.
   *
   * Wohin das verschobene Tragwerk darf, entscheidet `freieLage` beim
   * Ablegen - die Regel steht dort und nicht zweimal.
   */
  return Math.min(Math.max(x, unten), oben);
}

export function verdrahteLeiste(container, werte, onChange) {
  const leiste = container.querySelector('.qp-leiste');
  if (!leiste) return;
  const von = Number(leiste.dataset.qpVon), bis = Number(leiste.dataset.qpBis);
  /*
   * DIE BAHN IST DER MASSSTAB.
   *
   * Alle Zeilen teilen dieselbe Achse; ihre Breite rechnet den Zug in Meter
   * um. Hier stand `.qp-spur` - die gemeinsame Balkenzeile von vorher. Seit
   * die Leiste Zeilen fuehrt, gibt es sie nicht mehr, und `null` warf bei
   * jedem Zeigerzug einen Fehler in die Wand. Gemessen am 3. September:
   * fuenfzig Ausnahmen beim blossen Aufbau.
   */
  const spur = leiste.querySelector('.qp-bahn');
  const zugRaum = leiste.querySelector('.qp-liste') ?? leiste;

  /*
   * >>> AM MASTEN ZIEHEN AENDERT DEN ABSTAND. <<<
   *
   * Weisung vom 2. September: «wie kann ich nachträglich die mastabstände
   * bzw. jochlängen anpassen?»
   *
   * Man konnte es: das Feld «Jochlänge jt» in der Systemgeometrie. Nur ist
   * der Mastabstand dort keine Frage nach einem ABSTAND, sondern nach einer
   * Bauteillaenge - und wer zwei Masten vor sich sieht, will den Abstand
   * zwischen ihnen anfassen, nicht ein Feld drei Abschnitte tiefer suchen.
   *
   * WELCHER MAST WAS AENDERT:
   *
   *   Ende A eines Jochs   die LAGE des ganzen Tragwerks (es wandert mit)
   *   Ende B eines Jochs   seine LAENGE (das andere Ende bleibt stehen)
   *   ein GETEILTER Mast   beides zugleich: das linke Joch wird laenger
   *                        oder kuerzer, das rechte wandert mit. Das ist
   *                        genau das, was eine Jochreihe an ihrem
   *                        Zwischenmasten tut.
   *
   * DIE LAENGE BLEIBT IM SORTIMENT. Ein Tragjoch gibt es nicht in jeder
   * Laenge; gezogen wird nur innerhalb des Bereichs, den der Typ fuehrt
   * (stehende Vorgabe: massgebend sind die Daten). Am Ende rastet die
   * Eingabe ohnehin auf die naechste gefuehrte Laenge.
   */
  container.querySelectorAll('[data-qp-mast]').forEach((b) => {
    const mastId = b.dataset.qpMast;
    let zug = null;
    b.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const rollen = mastRollen(werte, mastId);
      if (!rollen) return;
      try { b.setPointerCapture(e.pointerId); } catch { /* kein Fang */ }
      zug = { startX: e.clientX, x0: rollen.x, rollen, bewegt: false };
    });
    b.addEventListener('pointermove', (e) => {
      if (!zug) return;
      const dpx = e.clientX - zug.startX;
      if (!zug.bewegt && Math.abs(dpx) < QP_SCHWELLE) return;
      zug.bewegt = true;
      const breite = spur?.getBoundingClientRect().width || 1;
      const roh = zug.x0 + (dpx / breite) * (bis - von);
      zug.x = mastGrenzen(zug.rollen, aufRaster(roh));
      b.style.left = `${((zug.x - von) / (bis - von) * 100).toFixed(3)}%`;
      b.classList.add('zieht');
      const feld = b.querySelector('.qp-mast-x');
      if (feld) feld.textContent = zug.x.toFixed(2);
      let marke = leiste.querySelector('.qp-zug');
      if (!marke) {
        marke = document.createElement('span');
        marke.className = 'qp-zug';
        zugRaum.appendChild(marke);
      }
      marke.textContent = zug.rollen.alsB
        ? `Jochlänge ${(zug.x - zug.rollen.alsB.x0).toFixed(2)} m`
        : `x₀ = ${zug.x.toFixed(2)} m`;
    });
    const ende = (e) => {
      if (!zug) return;
      const fertig = zug;
      zug = null;
      try { b.releasePointerCapture(e.pointerId); } catch { /* schon frei */ }
      if (!fertig.bewegt || fertig.x === undefined
          || Math.abs(fertig.x - fertig.x0) < 1e-9) {
        onChange('mastAktiv', mastId);
        return;
      }
      onChange('mastStelle', { mastId, x: fertig.x });
    };
    b.addEventListener('pointerup', ende);
    b.addEventListener('pointercancel', ende);
    // Rechtsklick auf die Mastmarke - dieselben Eintraege wie im Modell.
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      onChange('kontextMast', { id: mastId, bei: [e.clientX, e.clientY] });
    });
  });

  /*
   * DAS KAESTCHEN IST DIE SICHTBARKEIT (Weisung, 3. September).
   *
   * Es schaltet dasselbe wie «ausblenden» im Kontextmenue - ein Tragwerk,
   * das nicht zaehlt, verschwindet aus Bild, Bauteilliste, Ausleitung und
   * Nachweis. Zwei Wege zur selben Sache, weil man sie an zwei Orten
   * braucht; beide melden dieselbe Absicht.
   */
  container.querySelectorAll('[data-qp-sicht]').forEach((b) => {
    b.addEventListener('click', () => onChange(
      b.classList.contains('an') ? 'tragwerkAus' : 'tragwerkZeigen',
      b.dataset.qpSicht));
  });
  container.querySelectorAll('[data-qp-tw]').forEach((b) => {
    const id = b.dataset.qpTw;
    let zug = null;
    b.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const t = tragwerkeSortiert(werte).find((x) => x.id === id);
      if (!t) return;
      /*
       * NUR AN DER LINIE WIRD GEZOGEN.
       *
       * Der Name daneben ist ein eigener Knopf: er waehlt das Tragwerk und
       * verschiebt es nicht. Wer auf einen Namen zeigt, meint «dieses» -
       * nicht «dieses, zwei Meter weiter rechts».
       */
      if (!b.classList.contains('qp-linie')) return;
      if (versteckt(t)) return;            // ausgeblendet: nur einblenden
      try { b.setPointerCapture(e.pointerId); } catch { /* kein Fang */ }
      zug = { startX: e.clientX, x0: lageVon(t), bewegt: false };
    });
    b.addEventListener('pointermove', (e) => {
      if (!zug) return;
      const dpx = e.clientX - zug.startX;
      if (!zug.bewegt && Math.abs(dpx) < QP_SCHWELLE) return;
      zug.bewegt = true;
      const breite = spur?.getBoundingClientRect().width || 1;
      // AUF FUENF ZENTIMETER GERASTET - dieselbe Schrittweite wie die
      // Schieber. Ein Pixel sind auf 240 Punkten und vierzig Metern rund
      // siebzehn Zentimeter; ohne Raster staende dort 20.1734.
      const roh = zug.x0 + (dpx / breite) * (bis - von);
      zug.x = aufRaster(roh);
      /*
       * >>> NUR DEN BALKEN SCHIEBEN, DIE LEISTE NICHT NEU BAUEN. <<<
       *
       * Der erste Versuch schrieb `leiste.outerHTML` neu. Damit verschwindet
       * genau das Element, das den Zeiger gefangen haelt - der Fang faellt
       * weg, die weiteren `pointermove` gehen woandershin, und der Zug bricht
       * nach dem ersten Pixel ab. Man haette es fuer ein hakendes Ziehen
       * gehalten und nicht fuer einen Fehler.
       *
       * Verschoben wird deshalb nur die Lage dieses einen Knopfes. Das ist
       * ohnehin das Richtige: waehrend des Zugs aendert sich nichts als er.
       */
      b.style.left = `${((zug.x - von) / (bis - von) * 100).toFixed(3)}%`;
      b.classList.add('zieht');
      let marke = leiste.querySelector('.qp-zug');
      if (!marke) {
        marke = document.createElement('span');
        marke.className = 'qp-zug';
        zugRaum.appendChild(marke);
      }
      marke.textContent = `x₀ = ${zug.x.toFixed(2)} m`;
    });
    const ende = (e) => {
      if (!zug) return;
      const fertig = zug;
      zug = null;
      try { b.releasePointerCapture(e.pointerId); } catch { /* schon frei */ }
      if (!fertig.bewegt) { onChange('tragwerkAktiv', id); return; }
      if (fertig.x !== undefined && fertig.x !== fertig.x0) {
        onChange('tragwerkLage', { id, x: fertig.x });
      } else {
        onChange('tragwerkAktiv', id);      // gezogen und wieder abgelegt
      }
    };
    b.addEventListener('pointerup', ende);
    b.addEventListener('pointercancel', ende);
    // Der Name hat keinen Zug - er meldet den Klick unmittelbar.
    if (!b.classList.contains('qp-linie')) {
      b.addEventListener('click', () => onChange('tragwerkAktiv', id));
    }
    /*
     * RECHTSKLICK AUF DEN BALKEN - dieselben Eintraege wie im Modell.
     *
     * Weisung vom 2. September: «ausblenden mit rechtsklick ermöglichen im
     * 3d sowie in der sidebar». Dieselbe Geste am selben Gegenstand bietet
     * dasselbe an, gleichgueltig ob man ihn im Bild oder in der Leiste
     * anfasst - alles andere waere zweierlei Bedienung fuer eine Sache.
     */
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      onChange('kontextTragwerk', { id, bei: [e.clientX, e.clientY] });
    });
  });

  /*
   * DAS AUFKLAPPMENUE DER BAUFORMEN.
   *
   * Es klappt beim Waehlen nicht selbst zu - die Maske wird ohnehin neu
   * gebaut, sobald ein Tragwerk dazukommt. Es klappt zu, wenn man daneben
   * klickt; alles andere waere ein Menue, das offen stehen bleibt.
   */
  const auf = container.querySelector('[data-qp-neu-auf]');
  const liste = container.querySelector('.qp-neu-liste');
  if (auf && liste) {
    auf.addEventListener('click', (e) => {
      e.stopPropagation();
      liste.hidden = !liste.hidden;
    });
    document.addEventListener('click', function zu(e) {
      if (!liste.isConnected) { document.removeEventListener('click', zu); return; }
      if (!liste.contains(e.target) && e.target !== auf) liste.hidden = true;
    });
  }
}

/**
 * Eine Zeile zum gewaehlten Masten - unter der Leiste, wo er angeklickt wird.
 *
 * Die Marke in der Leiste hat Platz fuer «M2» und sonst nichts. Welches
 * Profil er traegt und wer alles an ihm haengt, steht deshalb hier. Und der
 * geteilte Mast sagt es ausdruecklich: wer ihn aendert, aendert zwei
 * Tragwerke.
 */
function mastenNotizHtml(werte) {
  /*
   * >>> NUR TYP UND LAENGE. <<<
   *
   * Weisung vom 3. September: «die info über den masten auf den typ und
   * länge begrenzen in der schemaansicht. alles andere kann man der
   * darstellung und der logik entnehmen.»
   *
   * Zu Recht. Hier stand «M2 · x 20.00 m · HEB 240 · traegt J90 · 20.00 m
   * und J90 · 20.00 m», darunter zwei Zeilen ueber geteilte Masten. Vier
   * Angaben, von denen drei schon im Bild stehen:
   *
   *   die STELLE     steht als Zahl unter dem Masten in der Leiste,
   *   das GETEILTSEIN am breiteren Fundament,
   *   WER daran haengt an den Linien, die ueber ihm zusammenlaufen.
   *
   * Was das Bild NICHT sagen kann, ist der Typ und die Laenge - zwei
   * Zahlen, die kein Strich zeigt. Genau die bleiben.
   *
   * Die Warnung zum geteilten Masten faellt mit weg. Sie stand einmal da,
   * weil die Zugehoerigkeit unsichtbar war; seit das Fundament sie zeigt und
   * die Bezeichnung ueberall dieselbe ist, erklaert sie, was man sieht.
   */
  const m = gewaehlterMast(werte);
  if (!m) return '';
  const nr = mastenVon(werte).findIndex((x) => x.id === m.id) + 1;
  // Die Laenge steht nur da, wenn sie angegeben ist: 0 heisst «nicht
  // angeschrieben», und «0.00 m» waere eine Zahl, die niemand gemeint hat.
  const L = Number(m.laenge) > 0 ? ` · ${Number(m.laenge).toFixed(2)} m` : '';
  return `<p class="qp-mast-notiz"><b>M${nr}</b> · ${
    esc(m.profil ?? 'ohne Profil')}${L}</p>`;
}

/**
 * Die Knoepfe und Gesten des Tragwerkfeldes.
 *
 * Sie melden ueber denselben Weg wie jede andere Eingabe (`onChange`), damit
 * Speichern, Rechnen und Zeichnen daran haengen bleiben.
 */
function verdrahteTragwerkfeld(container, werte, onChange) {
  container.querySelectorAll('[data-tw-aktiv]').forEach((b) => {
    b.addEventListener('click', () => onChange('tragwerkAktiv', b.dataset.twAktiv));
  });
  container.querySelectorAll('[data-tw-weg]').forEach((b) => {
    b.addEventListener('click', () => onChange('tragwerkWeg', b.dataset.twWeg));
  });
  container.querySelectorAll('[data-tw-neu]').forEach((b) => {
    b.addEventListener('click', () => onChange('tragwerkNeu', b.dataset.twNeu));
  });
  container.querySelectorAll('[data-tw-mast]').forEach((b) => {
    b.addEventListener('click', () => onChange('tragwerkMasten', b.dataset.twMast));
  });
  container.querySelectorAll('[data-tw-aus]').forEach((b) => {
    b.addEventListener('click', () => onChange('tragwerkAus', b.dataset.twAus));
  });
  verdrahteLeiste(container, werte, onChange);
}

/**
 * DAS FELD «TRAGWERKE»: die Leiste, die Handlungszeile, die Mastnotiz.
 *
 * Eigene Funktion, weil es zweimal gebraucht wird - beim Aufbau der
 * Maske und beim Nachfuehren. Ohne diese Trennung stand die Leiste in
 * der Maskensignatur, und jeder Rasterschritt des Laengenschiebers baute
 * die ganze Maske neu.
 */
function tragwerkfeldHtml(werte) {
  const alle = tragwerkeSortiert(werte);
  const aktiv = alle.find((t) => t.id === (werte.twId ?? 'T1')) ?? alle[0];
  const art = tragwerksart(aktiv);
return querprofilLeisteHtml(werte)
    + '<div class="qp-tun">'
    /*
     * EIN MENUE STATT VIER KNOEPFEN. Die vier Bauformen standen als vier
     * gleich aussehende Knoepfe da und nahmen zwei Zeilen ein - obwohl man
     * sie selten braucht und nie zwei davon zugleich.
     */
    + '<span class="qp-tun-neu"><button type="button" class="btn btn-mini"'
    + ' data-qp-neu-auf>+ Tragwerk</button>'
    + '<span class="qp-neu-liste" hidden>'
    + TRAGWERKSARTEN.map((x) =>
        `<button type="button" class="btn btn-mini" data-tw-neu="${esc(x.key)}"
           title="${esc(x.kurz)}">${esc(x.label)}</button>`).join('')
    + '</span></span>'
    + (art.traeger
      ? `<button type="button" class="btn btn-mini${
           aktiv.mastVorhanden === false ? '' : ' an'}"
           data-tw-mast="${esc(aktiv.id)}"
           title="${esc(aktiv.mastVorhanden === false
             ? 'Masten einschalten — sie werden gezeichnet, ausgeleitet und '
               + 'nachgewiesen'
             : 'Masten ausschalten — das Tragwerk steht dann ohne')}"
           aria-pressed="${aktiv.mastVorhanden !== false}">${
           icon('mast', 13)} Masten</button>` : '')
    /*
     * AUSBLENDEN, NICHT ENTFERNEN - zwei verschiedene Absichten.
     *
     * Entfernen wirft die Eingaben weg. Ausblenden legt den Abschnitt
     * beiseite: er bleibt im Datensatz, verschwindet aber aus Bild,
     * Bauteilliste, Ausleitung und Nachweis. Auf einem langen Querprofil
     * arbeitet man so an einem Abschnitt, ohne die anderen zu verlieren.
     *
     * Nur wenn noch ein sichtbares uebrig bleibt: ein Blatt ohne
     * gerechnetes Tragwerk waere eine Auswertung ohne Gegenstand.
     */
    + (alle.filter((t) => !versteckt(t)).length > 1
      ? `<button type="button" class="btn btn-mini"
           data-tw-aus="${esc(aktiv.id)}"
           title="Beiseitelegen — bleibt gespeichert, zählt aber nicht mehr"
           >${icon('auge', 13)} ausblenden</button>` : '')
    + (alle.length > 1
      ? `<button type="button" class="btn btn-mini btn-fail"
           data-tw-weg="${esc(aktiv.id)}"
           title="${esc(`${tragwerkName(aktiv)} vom Blatt nehmen`)}"
           >\u00d7 entfernen</button>` : '')
    + '</div>'
    + mastenNotizHtml(werte);
}

/**
 * Die Leiste im Feld «Tragwerke» neu zeichnen und wieder verdrahten.
 *
 * Der Rueckruf kommt aus `zeichneMaske`; er wird hier gemerkt, weil
 * `aktualisiereMaske` ihn nicht bekommt - sie fuehrt Werte nach und kennt
 * keinen Aenderungsweg.
 */
let leisteAendern = null;

function leisteNachfuehren(container, werte) {
  const feld = container.querySelector('[data-tragwerkfeld]');
  if (!feld || !leisteAendern) return;
  // Wird gerade an der Leiste gezogen, bleibt sie stehen - sonst naehme das
  // Neuzeichnen dem Zeiger sein Element.
  if (feld.querySelector('.zieht')) return;
  feld.innerHTML = tragwerkfeldHtml(werte);
  verdrahteTragwerkfeld(container, werte, leisteAendern);
}

/** Blattkoordinate -> Prozent der Leistenbreite. */
const qpPct = (x, von, bis) => ((x - von) / Math.max(1e-9, bis - von)) * 100;

/**
 * Der dargestellte Bereich: alles, was auf dem Blatt steht, plus Rand.
 *
 * Der Rand ist nicht Zierde - ohne ihn klebte ein Tragwerk am Leistenrand,
 * und der Mast an seinem Ende waere halb abgeschnitten.
 */
export function qpBereich(werte) {
  const alle = tragwerkeSortiert(werte);
  const enden = alle.flatMap((t) => {
    const a = lageVon(t);
    return [a, a + (tragwerksart(t).masten >= 2 ? (Number(t.L) || 0) : 0)];
  });
  const von = Math.min(...enden, 0), bis = Math.max(...enden, 1);
  const rand = Math.max(1.5, (bis - von) * 0.06);
  return { von: von - rand, bis: bis + rand };
}

/**
 * DIE LEISTE: EINE ZEILE JE TRAGWERK, LINIE UND NAME.
 *
 * Weisung vom 3. September: «könnte man eine liste mit bezeichnungen der
 * Tragwerkteile machen und die abbildung soweit vereinfachen und reduzieren,
 * dass nur linien und die bezeichnung zu sehen ist? so könnte man dann auch
 * einfach und gezielt mit einer box die sichtbarkeit steuern.»
 *
 * >>> WARUM DAS DIE BESSERE FORM IST. <<<
 *
 * Vorher lagen alle Tragwerke in EINER Zeile nebeneinander, als
 * massstaebliche Balken. Das las sich gut bei zweien und schlecht bei
 * dreien: bei 240 Punkten Breite bleiben je Balken siebzig, und «J90 ·
 * 20.00 m» passt dort nicht mehr hinein. Bei den Abfangjochen brach es ganz -
 * zwei Joche UEBEREINANDER belegen dieselbe Strecke, und in einer Zeile
 * laegen ihre Balken aufeinander.
 *
 * Eine Zeile je Tragwerk loest beides auf einmal: der Name hat die ganze
 * Breite, und wieviele es sind, spielt keine Rolle mehr. Die LINIE in der
 * Zeile behaelt, was am Balken gut war - sie steht massstaeblich an ihrer
 * Stelle, und weil alle Zeilen dieselbe Achse teilen, liest man Lage und
 * Laenge weiter im Vergleich ab.
 *
 * >>> DAS KAESTCHEN IST DIE SICHTBARKEIT. <<<
 *
 * Es schaltet dasselbe wie «ausblenden» im Kontextmenue - ein Tragwerk, das
 * nicht zaehlt, verschwindet aus Bild, Bauteilliste, Ausleitung und
 * Nachweis. Als Kaestchen in einer Liste ist es die Geste, die jeder kennt,
 * und man sieht auf einen Blick, was gerade gilt.
 *
 * >>> DIE MASTEN STEHEN UNTER ALLEN ZEILEN. <<<
 *
 * Sie tragen jedes Tragwerk der Liste - eine eigene Zeile je Mast wuerde das
 * verdecken. Unter der gemeinsamen Achse stehen sie da, wo sie hingehoeren:
 * als Grundlinie, auf der alles darueber steht.
 *
 * @param {object} werte
 * @param {{id:string, x:number, mastId?:string, text?:string}|null} zieht
 */
export function querprofilLeisteHtml(werte, zieht = null) {
  const alle = tragwerkeSortiert(werte);
  if (!alle.length) return '';
  const { von, bis } = qpBereich(werte);
  const aktivId = werte.twId ?? 'T1';
  const gewMast = gewaehlterMast(werte);
  const masten = mastenVon(werte);

  const zeilen = alle.map((t) => {
    const art = tragwerksart(t);
    const x0 = (zieht && zieht.id === t.id) ? zieht.x : lageVon(t);
    const L = art.masten >= 2 ? (Number(t.L) || 0) : 0;
    const links = qpPct(x0, von, bis);
    // Ein Einzelmast hat keine Laenge - seine Linie waere ein Punkt. Sie
    // bekommt eine Mindestbreite, damit man sie trifft.
    const breit = Math.max(qpPct(x0 + L, von, bis) - links, 2.5);
    const an = t.id === aktivId;
    const aus = versteckt(t);
    return `<div class="qp-zeile${an ? ' an' : ''}${aus ? ' aus' : ''}">
      <button type="button" class="qp-auge${aus ? '' : ' an'}"
              data-qp-sicht="${esc(t.id)}"
              role="checkbox" aria-checked="${!aus}"
              title="${esc(aus
                ? 'Einblenden — zählt dann wieder in Bild, Bauteilliste, '
                  + 'Ausleitung und Nachweis'
                : 'Ausblenden — bleibt gespeichert, zählt aber nicht mehr')}"
        ></button>
      <button type="button" class="qp-name" data-qp-tw="${esc(t.id)}"
              title="${esc(`${tragwerkPos(werte, t)} — ${art.label}, `
                + `x₀ = ${x0.toFixed(2)} m`
                + (an ? ' · wird gerechnet' : ' · anklicken, um es zu rechnen'))}"
        ><span class="qp-art">${esc(tragwerkPos(werte, t))} · ${
            esc(art.kuerzel)}</span>${esc(tragwerkName(t))}</button>
      <span class="qp-bahn">
        <button type="button" class="qp-linie${an ? ' an' : ''}${
            zieht && zieht.id === t.id ? ' zieht' : ''}"
          data-qp-tw="${esc(t.id)}"
          style="left:${links.toFixed(3)}%;width:${breit.toFixed(3)}%"
          title="${esc(`x₀ = ${x0.toFixed(2)} m${L ? ` · ${L.toFixed(2)} m lang` : ''}`
            + (aus ? '' : ' · ziehen verschiebt'))}"></button>
      </span>
    </div>`;
  }).join('');

  /*
   * DIE MASTEN: Schaft, Fundament, Gelaendelinie - ein kleiner Aufriss unter
   * der Liste. Der geteilte hat ein breiteres Fundament: er traegt zwei.
   */
  const marken = masten.map((m, i) => {
    const an = m.id === gewMast?.id;
    const geteilt = (m.traegt ?? []).length > 1;
    const x = (zieht && zieht.mastId === m.id) ? zieht.x : m.x;
    return `<button type="button" class="qp-mast${an ? ' an' : ''}${
        geteilt ? ' geteilt' : ''}" data-qp-mast="${esc(m.id)}"
        style="left:${qpPct(x, von, bis).toFixed(3)}%"
        title="${esc(`M${i + 1} bei x = ${x.toFixed(2)} m — ${
          m.profil ?? 'ohne Profil'}`
          + (geteilt ? ' · von zwei Tragwerken geteilt' : '')
          + ' · ziehen ändert den Mastabstand')}"
        aria-pressed="${an}">
        <span class="qp-mast-schaft"></span>
        <span class="qp-mast-fuss"></span>
        <span class="qp-mast-x">${x.toFixed(Math.abs(x % 1) > 1e-9 ? 2 : 0)}</span>
      </button>`;
  }).join('');

  const gezogen = zieht
    ? `<span class="qp-zug">${esc(zieht.text
        ?? `x₀ = ${zieht.x.toFixed(2)} m`)}</span>` : '';

  return `<div class="qp-leiste" data-qp-von="${von}" data-qp-bis="${bis}">
      <div class="qp-liste">${zeilen}${gezogen}</div>
      <div class="qp-achse"><span class="qp-bahn"
        >${marken}<span class="qp-boden"></span></span></div>
    </div>`;
}


function feldHtml(f, wert, werte) {
  const id = `feld-${f.key}`;
  /*
   * EINE BESCHRIFTUNG DARF DEN MASTEN NENNEN.
   *
   * «Anschlusshöhe Ende B» sagt nicht, WELCHER Mast das ist - auf einer
   * Jochreihe traegt der Zwischenmast diesen Namen von der einen Seite
   * und «Ende A» von der anderen. Ein `label` als Funktion bekommt die
   * Werte und macht «Ende B · Mast M2» daraus: was gemeint ist, und
   * woran es steht.
   *
   * Ganz oben, weil auch die Vorlesehilfe der Bauformwahl sie braucht.
   */
  const label = typeof f.label === 'function' ? f.label(werte) : f.label;
  // Zwei Sperren: Katalogmasse (bearbeiten) und Tabellenlasten (lastenBearbeiten).
  const gesperrt = (f.ausDB && !werte.bearbeiten) ||
                   (f.ausLast && !werte.lastenBearbeiten);
  const hinweis = hinweisHtml(f.key, f.hinweis);
  const dis = gesperrt ? ' disabled' : '';
  let inp;

  if (f.typ === 'tragwerke') {
    inp = tragwerkfeldHtml(werte);
  } else if (f.typ === 'bauform') {
    /*
     * DREI KARTEN NEBENEINANDER, nicht drei Woerter in einem Menue.
     *
     * Ein Menue verlangt, dass man die Bauformen schon kennt; die Karte
     * zeigt sie. Sie sind KNOEPFE, keine Auswahlliste - so bleibt jede
     * Bauform mit einem Klick erreichbar, und die getroffene Wahl steht
     * sichtbar da, statt hinter einem zugeklappten Feld.
     *
     * `data-feld` traegt hier nicht das Eingabefeld, sondern der Knopf: die
     * Verdrahtung unten liest `data-bauform` und meldet den Wert.
     */
    inp = `<div class="bauformen" role="radiogroup" aria-label="${esc(label)}">`
      + f.optionen.map((o) => {
        const an = String(o.wert) === String(wert);
        return `<button type="button" class="bauform${an ? ' an' : ''}"
                  data-bauform="${esc(o.wert)}" data-feld-bauform="${f.key}"
                  role="radio" aria-checked="${an}"${dis}>
                  <figure class="hb-skizze">${bauformSkizze(o.wert)}</figure>
                  <span class="bauform-text">
                    <span class="bauform-name">${esc(o.text)}</span>
                    ${o.kurz ? `<span class="bauform-kurz">${esc(o.kurz)}</span>` : ''}
                  </span>
                </button>`;
      }).join('') + '</div>';
  } else if (f.typ === 'auswahl') {
    const opts = f.optionen.length
      ? f.optionen.map((o) =>
          `<option value="${esc(o.wert)}"${String(o.wert) === String(wert) ? ' selected' : ''}>${esc(o.text)}</option>`).join('')
      : `<option value="${esc(wert)}" selected>${esc(wert)}</option>`;
    inp = `<select id="${id}" data-feld="${f.key}"${dis}>${opts}</select>`;
  } else if (f.typ === 'schalter') {
    inp = `<label class="schalter"><input type="checkbox" id="${id}" data-feld="${f.key}"
             ${wert ? 'checked' : ''}${dis}><span>aktiv</span></label>`;
  } else if (f.typ === 'text') {
    // Klartext, keine Zahl: die Liniennummer führt führende Nullen, die
    // KM-Angabe einen Punkt als Trenner. Als Zahlenfeld wäre aus «012.345»
    // still «12.345» geworden.
    inp = `<input type="text" id="${id}" data-feld="${f.key}"
             value="${esc(wert ?? '')}" placeholder="${esc(f.platzhalter ?? '')}"
             ${f.laenge ? `maxlength="${f.laenge}"` : ''}${dis}>`;
  } else if (f.typ === 'tasten') {
    /*
     * DIE KUERZELLISTE.
     *
     * Der INHALT kommt von aussen (`setzeTastenliste` aus app.js): dort
     * stehen die Handlungen, und die Maske hat von ihnen nichts zu wissen.
     * Hier steht nur, wie eine Belegung aussieht und wie man sie aendert.
     */
    // Als FUNKTION abgerufen, nicht als Liste gehalten: die wirksame Taste
    // haengt an `werte` und aendert sich, waehrend der Dialog offen ist.
    const tl = typeof tastenListe === 'function' ? tastenListe() : [];
    inp = `<div class="tastenliste">`
      + tl.map((t) => (t.gruppe
        ? `<div class="tl-gruppe">${esc(t.gruppe)}</div>`
        : `<div class="tl-zeile${t.still ? ' fest' : ''}">
             <span class="tl-text">${esc(t.text)}</span>
             ${t.still
               ? `<kbd class="tl-fest">${esc(t.taste)}</kbd>`
               : `<button type="button" class="tl-taste" data-taste="${esc(t.id)}"
                    title="Anklicken und neue Taste drücken">${
                    t.jetzt ? esc(t.jetzt) : '–'}</button>`}
           </div>`)).join('')
      + `</div>`
      + (tastenMeldung
        ? `<p class="tl-meldung">${esc(tastenMeldung)}</p>` : '')
      + (Object.keys(werte.tasten ?? {}).length
        ? `<button type="button" class="btn btn-mini" data-tasten-zurueck
             >Auf die Vorgaben zurücksetzen</button>` : '');
  } else if (f.typ === 'schieber') {
    /*
     * ZWEI SCHRITTWEITEN AN EINEM WERT.
     *
     * Der SCHIEBER rastet grob (`zugSchritt`, ein halber Meter bei allen
     * Laengen und Hoehen) - er ist eine Ziehgeste, und fuenf Zentimeter
     * liegen dort unter der Aufloesung des Fingers. Das ZAHLENFELD daneben
     * behaelt die feine Schrittweite: wer den Zentimeter braucht, tippt ihn.
     *
     * Ohne `zugSchritt` bleibt es beim Alten - nicht jede Groesse hat eine
     * grobe Stufe, die Sinn ergibt (das Endfeld am Auflager misst 0.75 m).
     */
    const rngSchritt = f.zugSchritt ?? f.schritt;
    inp = `<div class="zahlfeld">
             <input class="rng" type="range" data-feld="${f.key}"
               min="${f.min}" max="${f.max}" step="${rngSchritt}" value="${wert}"${dis}>
             <input type="number" id="${id}" data-feld="${f.key}" class="kurz"
               value="${wert}" step="${f.schritt}" min="${f.min}" max="${f.max}"${dis}>
             <span class="einheit">${esc(f.einheit ?? '')}</span></div>
           <div class="rng-skala"><span>${f.min}</span><span>${f.max}</span></div>`;
  } else {
    inp = `<div class="zahlfeld"><input type="number" id="${id}" data-feld="${f.key}"
             value="${wert}" step="${f.schritt ?? 'any'}"
             ${f.min !== undefined ? `min="${f.min}"` : ''}${dis}>
           <span class="einheit">${esc(f.einheit ?? '')}</span></div>`;
  }
  /*
   * DIE SKIZZE ZUR GEWAEHLTEN STELLUNG steht ZWISCHEN Feld und Hinweistext.
   *
   * Dort, weil sie den Text ersetzen soll und nicht ergaenzen: wer das Bild
   * sieht, klappt den Text gar nicht erst auf. Manche Einstellungen sind
   * reine Geometrie - wo geschnitten wird, wie der Mast ans Joch kommt, wohin
   * der Steg zeigt -, und eine Lage im Raum liest man nicht, man sieht sie.
   */
  /*
   * DIE NOTIZ steht unmittelbar unter dem Feld und IMMER offen.
   *
   * Sie ist kein Hinweistext, den man aufklappt, sondern eine gerechnete
   * Groesse zu dem, was gerade eingetippt ist - der Ablenkwinkel zu Radius
   * und Spannweite etwa. Eingeklappt waere sie nutzlos: man liest sie
   * waehrend der Eingabe oder gar nicht.
   */
  const notiz = typeof f.notiz === 'function' ? f.notiz(werte) : null;
  const notizHtml = notiz
    ? `<small class="feld-notiz">${esc(notiz)}</small>` : '';
  /*
   * DAS TRAGWERKFELD TRAEGT EINE MARKE.
   *
   * Es ist das einzige, dessen INHALT nachgefuehrt wird statt seines Werts -
   * die Leiste zeigt Laengen, Lagen und Profile, und die aendern sich beim
   * Ziehen eines Schiebers fortwaehrend. `leisteNachfuehren` findet es
   * daran wieder.
   */
  const marke = f.typ === 'tragwerke' ? ' data-tragwerkfeld' : '';
  /*
   * EINE BESCHRIFTUNG DARF DEN MASTEN NENNEN.
   *
   * «Anschlusshöhe Ende B» sagt nicht, WELCHER Mast das ist - auf einer
   * Jochreihe traegt der Zwischenmast diesen Namen von der einen Seite und
   * «Ende A» von der anderen. Ein `label` als Funktion bekommt die Werte und
   * kann «Ende B · Mast M2» daraus machen: was gemeint ist, und woran es
   * steht.
   */
  return `<div class="feld${gesperrt ? ' gesperrt' : ''}"${marke}>
    <label for="${id}">${esc(label)}${f.sym ? ` <em>${esc(f.sym)}</em>` : ''}</label>
    ${inp}${optionsSkizze(f.key, wert)}${notizHtml}${hinweis}</div>`;
}

// --- Anbauteile -------------------------------------------------------------

/**
 * DIE STANDORTE, mit dem NAMEN des Mastes statt «Ende A».
 *
 * In den Daten heissen sie «am Mast Ende A» und «am Mast Ende B» - das
 * benennt das Jochende, nicht den Masten. Wer auf einer Jochreihe ein
 * Bauteil an den Zwischenmasten haengt, liest je nach angeklicktem Joch
 * einmal «Ende A» und einmal «Ende B» fuer dieselbe Stelle.
 *
 * Hier bekommen sie den Namen, unter dem der Mast ueberall sonst steht.
 */
function anbauOrte(werte) {
  const t = tragwerkeVon(werte)[0];
  return ANBAU_ORTE.map((o) => {
    if (o.key === 'joch') return o;
    const n = mastNameAmEnde(werte, t, o.key === 'mastB' ? 'B' : 'A');
    return n ? { ...o, label: `am Masten ${n}` } : o;
  });
}

/** Farbmarke je Vorlagenart, passend zur 3D-Darstellung. */
const ANBAU_FARBE = {
  haengend: 'var(--acc)', aufgesetzt: 'var(--ok)',
  seitlich: 'var(--warn)', direkt: 'var(--dim)',
};

/**
 * Wo das Teil am Joch angeschlagen ist.
 *
 * >>> DIE ZAHL IN DER ANSCHRIFT IST DIE ZAHL DER GURTEBENEN, nicht die der
 * Klemmen. <<<
 *
 * Hier stand «2 Punkte» und «4 Punkte». Das las sich wie eine Stückzahl und
 * war eine Ebenenzahl: der Raster verdoppelt jede davon, denn das Moment
 * tritt an ZWEI Stationen ein (x ∓ raster/2), und in jeder Gurtebene stehen
 * zwei Winkel nebeneinander. Wirklich geschraubt wird also an
 *
 *      einseitig     1 Gurt  × 2 Winkel × 2 Stationen = 4 Klemmen
 *      durchgehend   2 Gurte × 2 Winkel × 2 Stationen = 8 Klemmen
 *
 * Das Modell zeichnet sie seit dem 28. August so und schreibt die Zahl an
 * die Rastermasslinie.
 */
const BEFESTIGUNGEN = [
  { key: 'unten', label: 'am Untergurt (1 Gurtebene)' },
  { key: 'oben', label: 'am Obergurt (1 Gurtebene)' },
  { key: 'durchgehend', label: 'durchgehend Ober- und Untergurt (2 Gurtebenen)' },
];

/** Was die Befestigungsart rechnerisch bedeutet – als Hinweis am Feld. */
const BEFESTIGUNG_WIRKUNG = {
  durchgehend: 'Torsion T_d als Kräftepaar zwischen den Gurten, ΔF_y = T_d/h – ' +
               'beansprucht die Horizontalbleche.',
  oben: 'Torsion T_d in EINER Gurtebene, ΔF_z = T_d/jbb – ' +
        'beansprucht die Vertikalbleche.',
  unten: 'Torsion T_d in EINER Gurtebene, ΔF_z = T_d/jbb – ' +
         'beansprucht die Vertikalbleche.',
};

function anbauteileHtml(g, werte) {
  const liste = (werte.anbauteile ?? []).map(normalisiereAnbauteil);
  const kacheln = vorlagen().map((v) => `
    <span class="kachel-huelle">
      <button class="kachel${v.eigen ? ' eigen' : ''}" data-vorlage="${esc(v.id)}"
              draggable="true" title="${esc(v.beschreibung)}">
        <span class="kachel-punkt" style="background:${ANBAU_FARBE[v.farbe] ?? 'var(--dim)'}"></span>
        <span class="kachel-name">${esc(v.name)}</span>
        <span class="kachel-meta">${(v.module ?? []).length
          ? `${v.module.length} Teil${v.module.length === 1 ? '' : 'e'}`
          : 'freie Last'}</span>
      </button>
      <button class="kachel-stift" data-vorlage-bearb="${esc(v.id)}"
        title="${v.eigen ? 'Vorlage bearbeiten'
          : 'Anpassen, legt eine eigene Kopie an, der Katalog bleibt unverändert'}"
        >${icon('optionen', 11)}</button>
      ${v.eigen ? `<button class="kachel-weg" data-vorlage-weg="${esc(v.id)}"
        title="Eigene Vorlage entfernen">×</button>` : ''}
    </span>`).join('');

  // ÜBERSICHT BEI VIELEN TEILEN
  // ------------------------------------------------------------------------
  // Auf einem langen Joch stehen zehn bis zwanzig Anbauteile. Als zwanzig
  // aufklappbare Karten sind das acht Bildschirmhöhen, und man sucht per
  // Scrollen. Jedes Teil steht deshalb zunächst als EINE ZEILE da - Position,
  // Name, Lage, Summenkraft - und nur das ANGEKLICKTE Teil wird zur vollen
  // Karte. Es ist immer nur eine Karte offen; das ist derselbe Weg, den auch
  // ein Klick ins Modell nimmt.
  //
  // Gruppiert wird nach GLEIS: so legt der Lastgenerator die Teile an, und so
  // steht ein Joch nun einmal über der Anlage.
  const trasse = trasseVon(werte);
  const gruppen = new Map();
  liste.forEach((a, i) => {
    const name = a.gleis ? `Gleis ${a.gleis}` : 'Ohne Gleiszuordnung';
    if (!gruppen.has(name)) gruppen.set(name, []);
    gruppen.get(name).push({ a, i });
  });

  const zeile = ({ a, i }) => {
    const offen = klappOffen(`at-${a.id}`);
    const su = baugruppeSumme(a, trasse);
    // F_x, nicht x: links in derselben Zeile steht die STATION x, und zwei
    // Bedeutungen für denselben Buchstaben in einer Zeile liest niemand
    // richtig.
    const kraft = [['F_x', su.Gx + su.Qx], ['F_y', su.Gy + su.Qy],
                   ['F_z', su.Gz + su.Qz]]
      .filter(([, v]) => Math.abs(v) > 0.005)
      .map(([k, v]) => `${k} ${f2(v)}`).join(' · ') || '–';
    // WAS IN DER ZEILE STEHT, MUSS AM ORT GEMESSEN SEIN. `x` ist am Masten
    // immer null; die Zeile behauptete damit, jedes Mastteil sitze am
    // Jochanfang.
    const amMasten = amMast(a);
    const mEnde = ortVon(a) === 'mastB' ? 'B' : 'A';
    const lage = amMasten
      ? `M${mEnde} ${f2(a.hMast ?? 0)} m` : `${f2(a.x)} m`;
    const lageLang = amMasten
      ? `Mast Ende ${mEnde} · ${f2(a.hMast ?? 0)} m über Fundament`
      : `x = ${f2(a.x)} m`;
    const suchtext = `${a.name} ${a.vorlage ?? ''} ${amMasten
      ? `mast ${mEnde} ${a.hMast ?? 0}` : a.x}`.toLowerCase();
    return `<div class="at-karte${a.aktiv === false ? ' aus' : ''}${offen ? ' offen' : ''}"
         data-idx="${i}" data-suche="${esc(suchtext)}">
      <div class="at-zeile" data-at-oeffnen="${i}" draggable="true"
           data-at-ziehen="${esc(a.id)}"
           title="${esc(a.name)} · ${esc(lageLang)} · ${esc(kraft)} kN
${offen ? 'Zuklappen' : 'Anklicken zum Bearbeiten'} · ins Modell ziehen legt eine Kopie ab">
        <span class="kachel-punkt" style="background:${ANBAU_FARBE[farbschluessel(a)] ?? 'var(--dim)'}"></span>
        <span class="at-pos">A${i + 1}</span>
        <span class="at-name">${esc(a.name)}</span>
        <span class="at-x">${esc(lage)}</span>
        <span class="at-kraft">${esc(kraft)} kN</span>
      </div>
      <span class="at-tasten">
        <button class="btn btn-mini" data-at-zoom="${i}"
                title="Im Modell anfahren">${icon('zoom', 12)}</button>
        <button class="btn btn-mini" data-at-vorlage="${i}"
                title="Als eigene Vorlage speichern">${icon('speichern', 12)}</button>
        <label class="schalter" title="Teil mitrechnen"><input class="at" data-k="aktiv"
          type="checkbox" ${a.aktiv === false ? '' : 'checked'}></label>
        <button class="loeschen" data-loesch="${i}" title="Entfernen">×</button>
      </span>
      ${offen ? `<div class="at-koerper">
        <div class="at-kopf">
          <input class="at breit" data-k="name" type="text" value="${esc(a.name)}">
        </div>
        ${anbauteilSkizzeFuer(a, werte)}
        <div class="at-gitter">
          ${atWahl(i, 'ort', 'Standort', ortVon(a), anbauOrte(werte),
                   'Am Joch zählt die Lage x, am Masten die Höhe über Fundament. '
                   + 'Was am Masten hängt, geht NICHT in den Ersatzbalken ein — '
                   + 'es steht nur im Stabmodell mit Auflagermodell «Mast».')}
          ${ortVon(a) === 'joch'
            ? atSchieber(i, 'x', 'Lage x', a.x, 'm', 0.1, 0, werte.L ?? 20)
            : atSchieber(i, 'hMast', 'Höhe über Fundament', a.hMast ?? 0, 'm',
                         // Bis zum MASTKOPF, nicht bis zur Jochachse: ein
                         // langer Mast traegt oben Traversen mit
                         // Zusatzleitern, und der Regler muss dorthin reichen.
                         0.05, 0, Math.max(werte.mastH ?? 12,
                                           werte.mastLaenge ?? 0,
                                           werte.mastLaengeB ?? 0))}
          ${ortVon(a) === 'joch'
            ? atWahl(i, 'befestigung', 'Befestigung', befestigungsArt(a), BEFESTIGUNGEN,
                     BEFESTIGUNG_WIRKUNG[befestigungsArt(a)])
            : ''}
          ${ortVon(a) === 'joch'
            ? atFeld(i, 'raster', 'Raster', a.raster, 'm', 0.05)
            : ''}
          ${atFeld(i, 'gleis', 'Gleis', a.gleis ?? 0, '–', 1,
                   'Nach welchem Gleis die Baugruppe gruppiert wird. '
                   + '0 = ohne Zuordnung. Der Lastgenerator setzt die Nummer '
                   + 'selbst; von Hand eingesetzte Teile blieben bisher '
                   + 'dauerhaft ohne, weil das Feld fehlte.')}
        </div>
        ${modulListeHtml(a, i, werte)}
        ${windVersatzHtml(a, i)}
        ${lastblockListeHtml(a, i)}
      </div>` : ''}
    </div>`;
  };

  const summeGruppe = (teile) => teile.reduce((s, { a }) => {
    const k = baugruppeSumme(a, trasse);
    return s + k.Gz + k.Qz;
  }, 0);

  const zeilen = [...gruppen.entries()].map(([name, teile]) => `
    <div class="at-gruppe">
      <div class="sec">${esc(name)}<span class="sec-r">${teile.length} Stück ·
        F_z ${f2(summeGruppe(teile))} kN</span></div>
      ${teile.map(zeile).join('')}
    </div>`).join('');

  return abschnitt(g.titel,
    `<button class="btn btn-mini" data-generator type="button"
       title="Anbauteile über die Gleise verteilen">Lastgenerator</button>
     <span class="sec-r">${liste.length} Stück</span>`) +
    klapp('anbau-vorrat', 'Anbauteil hinzufügen', `
      <p class="hinweis" style="margin:0 0 7px">Kachel anklicken oder ins
        Modell ziehen.</p>
      <div class="kacheln">${kacheln}</div>
      ${klapp('anbau-achsen', 'Befestigung und Achsen', `
        <p class="hinweis" style="margin:0">
          Die Befestigung sitzt auf den Schwerachsen der Gurte. Zwei Angaben
          bestimmen zusammen, wo geschraubt wird: die <b>Gurtebene</b> —
          Obergurt, Untergurt oder beide. Und der <b>Raster</b>. Der Raster
          setzt die Klemmen auf zwei Stationen, x ∓ Raster/2; dort tritt auch
          das Moment ein. In jeder Gurtebene stehen dabei zwei Winkel
          nebeneinander. Einseitig sind das 1 × 2 × 2 = <b>4 Klemmen</b>,
          durchgehend 2 × 2 × 2 = <b>8</b>. Das Modell zeichnet sie einzeln
          und schreibt die Zahl an die Rastermasslinie.</p>
        <p class="hinweis" style="margin:6px 0 0">
          Achsen: <b>x</b> Jochachse · <b>y</b> Gleisrichtung ·
          <b>z</b> lotrecht, positiv nach oben, <b>0 auf der Schwerachse des
          Gurtes</b>, an dem das Teil angeschlagen ist. Eine Hängestütze von
          1.35 m misst also z = −1.35 m ab Untergurt. Für die Torsion rechnet
          der Kern den Hebelarm zur Jochachse dazu (h/2).</p>
        <p class="hinweis" style="margin:6px 0 0">
          <b>Am Masten gilt ein anderer Nullpunkt.</b> Dort steht statt der
          Lage x die <b>Höhe über Fundament</b>, und x, y, z eines Teils
          zählen ab dem Anschlusspunkt auf der Mastachse, nicht ab dem Joch.
          Ein Rückleiter 0.35 m unter dem Anschluss auf 7.00 m Höhe steht
          also als h = 7.00 und z = −0.35. <b>x</b> weist dabei ins Feld
          hinein, an beiden Enden.</p>`)}`,
      `${vorlagen().length} Vorlagen`) +
    // Das Suchfeld filtert im Browser, ohne die Maske neu zu bauen - sonst
    // verlöre das Feld bei jedem Tastendruck den Fokus.
    (liste.length > 3 ? `<div class="at-suche">
      <input type="search" id="at-suche" placeholder="filtern nach Name, Vorlage, Lage …"
             autocomplete="off">
      <span class="at-suche-zahl"></span></div>` : '') +
    `<div class="at-liste">${zeilen || '<p class="notiz">Noch keine Anbauteile.</p>'}</div>`;
}

/** Einwirkungsklasse aus der gewählten Windstufe. */
const ekVonWerten = (w) =>
  ({ '0.9': 'EK1', '1.1': 'EK2', '1.3': 'EK3' })[w.windKlasse] ?? 'EK2';

/**
 * Modulliste einer Baugruppe.
 *
 * Jede Zeile ist ein Bauteil aus der Lasttabelle auf seiner eigenen Höhe.
 * Rechts stehen die daraus gerechneten Lasten - schreibgeschützt, denn sie
 * kommen aus der Tabelle und nicht aus der Eingabe. Zur Eingabe bleiben Lage,
 * Anzahl, Länge und die Exzentrizitäten, genau wie besprochen.
 */
/**
 * WAS SITZT AUF WAS - für die Karte lesbar gemacht.
 *
 * Die Kette entsteht aus den ROLLEN der Bauteile, und die stehen nirgends in
 * der Eingabe. Wer die Höhen von Hand setzt, sieht deshalb nicht, dass der
 * Ausleger an der Hängestütze hängt - und merkt auch nicht, wenn er ihn mit
 * gleicher Höhe UND gleichem Versatz auf denselben Punkt setzt und die Kette
 * damit lautlos in sich zusammenfällt.
 *
 * @returns {Map} modulIndex -> {rolle, haengtAn, zusammenMit}
 */
function ketteJeModul(a, werte) {
  const info = new Map();
  let flach = [];
  try {
    flach = expandiereAnbauteile([{ ...a, aktiv: true, lasten: [] }], trasseVon(werte));
  } catch { return info; }
  const kette = anbauKette(flach, { x0: amMast(a) ? 0 : (a.x ?? 0), zAn: 0 });
  // Woran das erste Teil haengt. Am Masten ist es der Mast, nicht das Joch -
  // die Kette beginnt dort, wo `hMast` sie ansetzt.
  const wurzelName = amMast(a)
    ? `Mast ${ortVon(a) === 'mastB' ? 'B' : 'A'}` : 'Joch';

  const gliedNach = new Map();          // Punkt -> das Glied, das ihn schuf
  kette.glieder.forEach((g) => gliedNach.set(g.bis, g));
  const nameVon = (teil) => teil?.bauteilName ?? teil?.name ?? null;

  // Wer teilt sich einen Punkt? Das ist der Fall, in dem die Kette einfällt.
  const amPunkt = new Map();
  kette.belegung.forEach(({ teil, punkt }) => {
    if (teil.modulIndex == null) return;
    if (!amPunkt.has(punkt)) amPunkt.set(punkt, []);
    amPunkt.get(punkt).push(teil);
  });

  kette.belegung.forEach(({ teil, punkt }) => {
    if (teil.modulIndex == null) return;
    /*
     * ÜBER HILFSPUNKTE HINWEG BENENNEN.
     *
     * Zwischen Stütze und Ausleger liegt der Punkt, auf den die halbe
     * Windlast zurückgesetzt wird (art 'windversatz'). Er ist ein wirklicher
     * Ort - der Anschluss Ausleger/Stütze -, aber kein BAUTEIL. Stünde er in
     * der Karte, hiesse es beim Ausleger «hängt an Ausleger Typ NT», weil der
     * Hilfspunkt den Namen seines Ursprungs trägt.
     */
    let g = gliedNach.get(punkt);
    let traegerGlied = g ? gliedNach.get(g.von) : null;
    while (traegerGlied && traegerGlied.teil?.art === 'windversatz') {
      traegerGlied = gliedNach.get(traegerGlied.von);
    }
    info.set(teil.modulIndex, {
      rolle: teil.rolle ?? null,
      haengtAn: traegerGlied ? nameVon(traegerGlied.teil) : wurzelName,
      zusammenMit: (amPunkt.get(punkt) ?? [])
        .filter((x) => x !== teil).map(nameVon).filter(Boolean),
    });
  });
  return info;
}

/** Anzeigename einer Rolle. Die Ids sind englisch-knapp, die Karte nicht. */
const ROLLE_TEXT = {
  traeger: 'Träger', aufbau: 'Aufbau', drahtwerk: 'Drahtwerk',
};

/**
 * WORAUF x, y UND z EINES TEILS BEZOGEN SIND.
 *
 * Am Joch die Schwerachse des Anschlussgurtes, am Masten der Anschlusspunkt
 * auf der Mastachse - also die Höhe `hMast` über Fundament. Dieselbe Zeile
 * steht über den Modulen und über den Lastblöcken; sie beantwortet die Frage,
 * die man sich sonst am falschen Bild beantwortet.
 */
function bezugsHinweis(a) {
  return amMast(a)
    ? `<span class="sec-r">ab Anschluss am Mast ${
        ortVon(a) === 'mastB' ? 'B' : 'A'}</span>`
    : '<span class="sec-r">ab Schwerachse des Anschlussgurtes</span>';
}

function modulListeHtml(a, i, werte) {
  const module = a.module ?? [];
  const trasse = trasseVon(werte);

  const auswahl = (wert) => {
    const gruppe = (rolle, titel) => {
      const liste = flBauteile(rolle);
      if (!liste.length) return '';
      return `<optgroup label="${esc(titel)}">${liste.map((b) =>
        `<option value="${esc(b.id)}"${b.id === wert ? ' selected' : ''}
          >${esc(b.name)}</option>`).join('')}</optgroup>`;
    };
    return gruppe('traeger', 'Träger am Joch') +
           gruppe('aufbau', 'Aufbauten') +
           gruppe('drahtwerk', 'Drahtwerke');
  };

  const kette = ketteJeModul(a, werte);

  const zeilen = module.map((m, k) => {
    let b = null;
    try { b = getFlBauteil(m.bauteil); } catch { /* unbekannt */ }
    const kt = kette.get(k);
    const l = baugruppeSumme({ ...a, module: [m], lasten: [] }, trasse);
    const streckenlast = b && istStreckenlast(b);
    const drahtwerk = b?.rolle === 'drahtwerk';
    // Beim Drahtwerk steht der ABLENKWINKEL zur Eingabe, nicht die Spannweite:
    // die Spannweite gilt global für die ganze Trasse, der Winkel ist das, was
    // sich am einzelnen Leiter unterscheidet. Leer heisst «aus R und L_FL».
    const alphaAuto = modulWinkel({ ...m, winkel: null }, trasse);
    return `<div class="modul" data-modul="${k}">
      <div class="modul-kopf">
        <select class="mod" data-mk="bauteil" data-idx="${i}" data-mod="${k}"
          >${auswahl(m.bauteil)}</select>
        ${b?.rolle === 'aufbau' && Math.abs(m.x ?? 0) > 1e-9 ? `
        <button class="btn btn-mini" type="button"
                data-mod-spiegeln="${k}" data-idx="${i}"
                title="Kragarm an der Achse der Hängestütze spiegeln, dieser
Ausleger und alles, was weiter aussen an ihm hängt (Leiter, Kettenwerk).
Ändert nur das Vorzeichen von x; Höhe und Lasten bleiben."
          >x ⇄</button>` : ''}
        <button class="loeschen" data-mod-weg="${k}" data-idx="${i}"
                title="Modul entfernen">×</button>
      </div>
      ${kt ? `<div class="modul-kette">
        ${kt.rolle ? `<span class="rollen-marke r-${esc(kt.rolle)}"
            title="Rolle aus der Lasttabelle, sie bestimmt, was auf was sitzt"
            >${esc(ROLLE_TEXT[kt.rolle] ?? kt.rolle)}</span>` : ''}
        <span class="kette-an">hängt an <b>${esc(kt.haengtAn ?? 'Joch')}</b></span>
        ${kt.zusammenMit.length ? `<span class="kette-warn"
            title="Gleicher Angriffspunkt: im Stabmodell teilen sich beide einen Knoten, die Kette hat hier kein Glied. Das ist zulässig, nur beabsichtigt sollte es sein."
            >am selben Punkt wie ${esc(kt.zusammenMit.join(', '))}</span>` : ''}
      </div>` : ''}
      <div class="sec-klein">Angriffspunkt${bezugsHinweis(a)}</div>
      <div class="at-gitter">
        ${modFeld(i, k, 'x', 'x', modWert(m, 'x'), 'm', 0.1)}
        ${modFeld(i, k, 'y', 'y', modWert(m, 'y'), 'm', 0.1)}
        ${modFeld(i, k, 'z', 'z', modWert(m, 'z'), 'm', 0.05)}
        ${modFeld(i, k, 'anzahl', 'Anzahl', modWert(m, 'anzahl'), '–', 1)}
      </div>
      ${drahtwerk ? `<div class="sec-klein">Ablenkung</div>
      <div class="at-gitter">
        ${modFeld(i, k, 'winkel', 'Winkel α', modWert(m, 'winkel'), '°', 0.01,
                  `aus R/L_FL: ${f3(alphaAuto)}°`)}
        <span class="at-feld lesbar"><span>Spannweite <i>m</i></span>
          <b>${f2(m.laenge ?? trasse.spannweite ?? 0)}</b>
          <small class="hinweis">global, Gruppe «Trasse»</small></span>
      </div>
      ${wirkungHtml(i, k, m)}` : streckenlast ? `<div class="at-gitter">
        ${modFeld(i, k, 'laenge', 'Länge', modWert(m, 'laenge'), 'm', 0.1)}
      </div>` : ''}
      ${b?.freieFlaeche ? `<div class="sec-klein">Angriffsfläche</div>
      <div class="at-gitter">
        ${modFeld(i, k, 'eigengewicht', 'Eigengew.', modWert(m, 'eigengewicht'), 'kN', 0.1)}
        ${modFeld(i, k, 'aQuer', 'A quer', modWert(m, 'aQuer'), 'm²', 0.05)}
        ${modFeld(i, k, 'aLaengs', 'A längs', modWert(m, 'aLaengs'), 'm²', 0.05)}
        ${modWahl(i, k, 'cw', 'Profilbeiwert', m.cw ?? 1.4,
                  PROFILBEIWERTE.map((p) => ({ key: p.c, label: p.label })))}
      </div>` : ''}
      <div class="modul-lasten">${modulLastenHtml(l, b)}</div>
    </div>`;
  }).join('');

  return `<div class="sec">Bauteile aus der Lasttabelle<span class="sec-r"
      >${module.length} Teil${module.length === 1 ? '' : 'e'}</span></div>
    <div class="modul-liste">${zeilen ||
      '<p class="notiz">Keine Bauteile aus der Tabelle.</p>'}</div>
    <button class="btn btn-zufuegen" data-mod-neu="${i}" type="button"
      >${icon('neu', 13)} Bauteil aus der Lasttabelle</button>`;
}

/**
 * ALLE Lastanteile eines Moduls, nach Einwirkungsgruppe geordnet.
 *
 * Vorher standen hier nur drei der sechs Anteile. Was nicht dasteht, wird
 * beim Prüfen auch nicht bemerkt - deshalb erscheint jetzt jeder Anteil, der
 * nicht null ist, mit seiner Gruppe davor.
 */
function modulLastenHtml(l, b) {
  const drahtwerk = b?.rolle === 'drahtwerk';
  const anteile = [
    ['G', 'F_z', l.Gz], ['G', 'F_x', l.Gx], ['G', 'F_y', l.Gy],
    ['W_x', 'F_x', l.Qx], ['W_y', 'F_y', l.Qy], ['S', 'F_z', l.Qz],
  ].filter(([, , v]) => Math.abs(v ?? 0) > 0.0005);

  // Kleine Beträge mit drei Stellen: "0.00" sagt nichts darüber, ob da etwas
  // steht oder nicht - gerade bei der Umlenkung im fast geraden Gleis.
  const zahl = (v) => (Math.abs(v) < 0.05 ? f3(v) : f2(v));
  return (anteile.length
    ? anteile.map(([g, f, v]) => `<span><i>${g}</i> ${f} ${zahl(v)}</span>`).join('')
    : '<span class="ablage-meta">keine Last</span>') +
    (drahtwerk ? `<span class="${Math.abs(l.alpha) > 1e-4 ? 'stark' : ''}"
       >α ${f3(l.alpha)}°</span>` : '') +
    `<span class="ablage-meta">kN · ${esc(b?.einheit ?? '')}</span>`;
}

/**
 * FREIE LASTBLÖCKE: Angriffspunkt / Kraft / Moment.
 *
 * Ein Lastblock ist die vollständige Beschreibung EINER Last: wo sie angreift,
 * was sie zieht, und ob ein Moment eingeprägt ist. Die Einwirkungsgruppe steht
 * obenan, denn sie entscheidet, mit welchem Beiwert die Last in die
 * Kombination geht - und ob sie sich mit dem Wind umkehrt.
 *
 * Die Gliederung in drei Zeilen ist kein Schmuck: zehn gleich aussehende
 * Zahlenfelder nebeneinander sagen nicht, welche Zahl wohin gehört.
 */
function lastblockListeHtml(a, i) {
  const bloecke = a.lasten ?? [];
  const zeilen = bloecke.map((l, k) => {
    const g = EINWIRKUNGEN.find((e) => e.key === l.einwirkung) ?? EINWIRKUNGEN[0];
    const hatMoment = ['Mxx', 'Myy', 'Mzz'].some((f) => Math.abs(l[f] ?? 0) > 0);
    return `<div class="modul lastblock" data-last="${k}">
      <div class="modul-kopf">
        ${lastWahl(i, k, 'einwirkung', l.einwirkung,
                   EINWIRKUNGEN.map((e) => ({ key: e.key, label: e.label })))}
        <button class="loeschen" data-last-weg="${k}" data-idx="${i}"
                title="Last entfernen">×</button>
      </div>
      <div class="sec-klein">Angriffspunkt${bezugsHinweis(a)}</div>
      <div class="at-gitter">
        ${lastFeld(i, k, 'x', 'x', l.x, 'm', 0.1)}
        ${lastFeld(i, k, 'y', 'y', l.y, 'm', 0.1)}
        ${lastFeld(i, k, 'z', 'z', l.z, 'm', 0.1)}
      </div>
      <div class="sec-klein">Kraft</div>
      <div class="at-gitter">
        ${lastFeld(i, k, 'Fx', 'F_x', l.Fx, 'kN', 0.5)}
        ${lastFeld(i, k, 'Fy', 'F_y', l.Fy, 'kN', 0.5)}
        ${lastFeld(i, k, 'Fz', 'F_z', l.Fz, 'kN', 0.5)}
      </div>
      ${klapp(`last-${a.id}-${k}`, 'Moment (optional)', `
        <div class="at-gitter">
          ${lastFeld(i, k, 'Mxx', 'M_xx', l.Mxx, 'kNm', 0.5)}
          ${lastFeld(i, k, 'Myy', 'M_yy', l.Myy, 'kNm', 0.5)}
          ${lastFeld(i, k, 'Mzz', 'M_zz', l.Mzz, 'kNm', 0.5)}
        </div>
        <p class="hinweis" style="margin:6px 0 0">
          M_xx um die Jochachse (Torsion) · M_yy um y (Biegung des Jochs) ·
          M_zz um die Lotrechte (Biegung im Grundriss). Eingeprägte Momente
          treten über den Anschlussraster ins Joch ein.</p>`,
        hatMoment ? 'gesetzt' : '–', hatMoment)}
      <div class="modul-lasten">
        <span class="ablage-meta">Gruppe ${esc(g.label)}</span>
        ${g.art === 'staendig'
          ? '<span class="ablage-meta">feste Wirkrichtung</span>'
          : '<span class="ablage-meta">kehrt mit dem Vorzeichen der Kombination</span>'}
      </div>
    </div>`;
  }).join('');

  return `<div class="sec">Freie Lasten<span class="sec-r"
      >${bloecke.length} Block${bloecke.length === 1 ? '' : 'e'}</span></div>
    <div class="modul-liste">${zeilen ||
      '<p class="notiz">Keine freien Lasten.</p>'}</div>
    <button class="btn btn-zufuegen" data-last-neu="${i}" type="button"
      >${icon('neu', 13)} Freie Last</button>`;
}

/** Kopfzeile einer Baugruppe: was sie insgesamt einträgt. */
function baugruppeKopf(a, trasse) {
  const s = baugruppeSumme(a, trasse);
  const stueck = [];
  const n = (z, ein, mehr) => `${z} ${z === 1 ? ein : mehr}`;
  if ((a.module ?? []).length) stueck.push(n(a.module.length, 'Teil', 'Teile'));
  if ((a.lasten ?? []).length) stueck.push(n(a.lasten.length, 'Last', 'Lasten'));
  // Alle drei Richtungen, aber nur die, die etwas tragen: eine Kopfzeile, die
  // immer nur F_z zeigt, verschweigt gerade die Windlasten.
  const kraft = [['F_x', s.Gx + s.Qx], ['F_y', s.Gy + s.Qy], ['F_z', s.Gz + s.Qz]]
    .filter(([, v]) => Math.abs(v) > 0.005)
    .map(([k, v]) => `${k} ${f2(v)}`).join(' · ');
  return `${f2(a.x)} m · ${stueck.join(' + ') || 'leer'}` +
         (kraft ? ` · ${kraft} kN` : ' · ohne Last') +
         (Math.abs(s.Gx) > 0.005 ? ` · Umlenkung ${f2(s.Gx)} kN` : '');
}

/** Trasseangaben aus den Eingabewerten. */
const trasseVon = (w) => ({ ek: ekVonWerten(w), R: w.trasseRadius,
  spannweite: w.flSpannweite });

/** Auswahlliste in einer Modulzeile. */
function modWahl(i, k, feld, label, wert, optionen) {
  return `<label class="at-feld breit2" data-feldname="${feld}">
    <span>${esc(label)}</span>
    <select class="mod" data-mk="${feld}" data-idx="${i}" data-mod="${k}"
      >${optionen.map((o) => `<option value="${esc(o.key)}"
        ${String(o.key) === String(wert) ? ' selected' : ''}>${esc(o.label)}</option>`)
        .join('')}</select>
  </label>`;
}

/*
 * WAS EIN MODULFELD ZEIGT, WENN NICHTS GESETZT IST.
 *
 * Zwei Stellen schreiben in dieselben Felder: der AUFBAU der Karte
 * (modulListeHtml) und das AUFFRISCHEN bei jeder Rechnung
 * (aktualisiereMaske). Sie waren sich uneinig - der Aufbau setzte `?? 0`,
 * das Auffrischen machte aus null und undefined ein leeres Feld. Ein Modul
 * ohne eigenes x zeigte deshalb erst «0» und war nach der ersten Rechnung
 * leer. In der Vorlage steht x gar nicht, also traf das jede Hängestütze.
 *
 * `undefined` heisst hier: leer lassen, denn leer BEDEUTET dort etwas -
 * beim Winkel «aus Radius und Spannweite rechnen». Bei einer Lage bedeutet
 * leer nichts; dort gehört eine Null hin.
 */
const MODUL_VORGABE = {
  x: 0, y: 0, z: 0, anzahl: 1, laenge: 1,
  eigengewicht: 0, aQuer: 0, aLaengs: 0, cw: 1.4,
  winkel: undefined,
};

/** Wert eines Modulfelds für die Anzeige - mit der Vorgabe von oben. */
function modWert(m, feld) {
  const v = m?.[feld];
  return v === null || v === undefined ? MODUL_VORGABE[feld] : v;
}

function modFeld(i, k, feld, label, wert, einheit, schritt, hinweis = '') {
  return `<label class="at-feld" data-feldname="${feld}">
    <span>${esc(label)} <i>${esc(einheit)}</i></span>
    <input class="mod" data-mk="${feld}" data-idx="${i}" data-mod="${k}"
           type="number" step="${schritt}"
           value="${wert === '' || wert === null || wert === undefined ? '' : wert}"
           ${hinweis ? `placeholder="${esc(hinweis)}"` : ''}>
    ${hinweisHtml(`mod-${i}-${k}-${feld}`, hinweis)}
  </label>`;
}

/**
 * WAS EIN LEITER AN DIESER STELLE ABGIBT.
 *
 * >>> Weisung, 28. August: «Es kann sein, dass der Leiter nur abgezogen wird
 * (bei Fahrdraht der Fall), oder dass bei der Befestigung am Joch nur das
 * Tragseil eine Ablenkkraft hat und der Fahrdraht nicht, da dieser Anteil in
 * die Drückstütze geht. Die ständigen aber beide zum Tragseil gehen.» <<<
 *
 * DIE ACHSE IST NICHT «STÄNDIG / VERÄNDERLICH». Gewicht und Ablenkkraft sind
 * beide ständig; der genannte Fall trennt sie trotzdem. Getrennt wird deshalb
 * nach dem, was verschiedene Wege geht — und das sind drei Dinge.
 *
 * Nur bei DRAHTWERKEN. Ein Träger hat keine Ablenkkraft, und wer sein Gewicht
 * nicht will, schaltet das Modul ab.
 */
const WIRKUNGEN = [
  { key: 'wirktG', label: 'Gewicht',
    titel: 'Eigengewicht des Leiters, ständig, Gruppe G' },
  { key: 'wirktAblenk', label: 'Ablenkung',
    titel: 'Ablenkkraft aus dem Kurvenzug (Z·c/R), ebenfalls ständig. '
         + 'Abwählen, wenn dieser Anteil anderswo hingeht: beim Fahrdraht '
         + 'am Joch in die Drückstütze, am Ausleger in die Spurhaltertraverse.' },
  { key: 'wirktQ', label: 'Wind/Schnee',
    titel: 'Wind auf den Leiter und Schnee, veränderlich' },
];

function wirkungHtml(i, k, m) {
  return `<div class="sec-klein">Wirkt hier<span class="sec-r">${
      esc(m.kettenwerk ? `Kettenwerk ${m.kettenwerk}` : 'ohne Kettenwerk')
    }</span></div>
    <div class="wirkung">
      ${WIRKUNGEN.map((x) => `<label class="schalter" title="${esc(x.titel)}">
        <input class="mod" data-mk="${x.key}" data-idx="${i}" data-mod="${k}"
               type="checkbox" ${m[x.key] === false ? '' : 'checked'}>
        <span>${esc(x.label)}</span></label>`).join('')}
      <label class="at-feld kette-feld" data-feldname="kettenwerk">
        <span>Kettenwerk</span>
        <input class="mod" data-mk="kettenwerk" data-idx="${i}" data-mod="${k}"
               type="text" value="${esc(m.kettenwerk ?? '')}"
               placeholder="z. B. KW1">
      </label>
    </div>
    ${hinweisHtml(`wirk-${i}-${k}`,
      'Gewicht und Ablenkung sind BEIDE ständig, sie gehen trotzdem oft '
      + 'verschiedene Wege: das Gewicht beider Leiter hängt am Tragseil und '
      + 'kommt am Joch an, die Ablenkung des Fahrdrahts dagegen in der '
      + 'Drückstütze. Das Kettenwerk ist die Klammer über Tragseil und '
      + 'Fahrdraht; es geht in keine Rechnung ein, sondern hält zusammen, was '
      + 'zusammengehört, der Havariefall (Bruch eines Kettenwerks) wählt '
      + 'später darüber aus.')}`;
}

/** Zahlenfeld eines freien Lastblocks. */
function lastFeld(i, k, feld, label, wert, einheit, schritt) {
  return `<label class="at-feld" data-feldname="${feld}">
    <span>${esc(label)} <i>${esc(einheit)}</i></span>
    <input class="lb" data-lk="${feld}" data-idx="${i}" data-last="${k}"
           type="number" step="${schritt}" value="${wert ?? 0}">
  </label>`;
}

/** Auswahlliste eines freien Lastblocks. */
function lastWahl(i, k, feld, wert, optionen) {
  return `<select class="lb" data-lk="${feld}" data-idx="${i}" data-last="${k}"
    >${optionen.map((o) => `<option value="${esc(o.key)}"
      ${o.key === wert ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
}

/**
 * Massskizze eines Anbauteils.
 *
 * Zehn Zahlenfelder nebeneinander sagen nicht, WO die Zahl hingehört. Die
 * Skizze zeigt es: links der Querschnitt mit e_v und den Kräften, rechts die
 * Ansicht in Jochachse mit Lage x und Raster. Jedes Mass trägt den Feldnamen,
 * damit es aufleuchtet, sobald man in das zugehörige Feld klickt.
 *
 * Bewusst schematisch und nicht massstäblich: e_v ist oft dreimal die
 * Jochhöhe; massstäblich wäre entweder das Joch ein Strich oder die Stütze
 * aus dem Bild.
 */
/**
 * Massskizze einer Baugruppe AM MASTEN.
 *
 * >>> DER NULLPUNKT IST DER MASTFUSS. <<<
 *
 * Die Skizze des Jochs zeigte hier zwei Gurte und «Lage in Jochachse 0 … L» -
 * ein Bild, das für ein Teil am Masten jede Zahl falsch benennt: `x` ist am
 * Masten immer null, und `z` misst nicht ab einer Gurtschwerachse, sondern
 * ab dem Anschlusspunkt auf der Mastachse. Wer nach diesem Bild eingibt,
 * setzt den Rückleiter ans Joch statt auf 7 m Masthöhe.
 *
 * Links der Anschluss mit z und y, rechts der ganze Mast mit der Höhe über
 * Fundament. Schematisch wie am Joch: massstäblich wäre der Mast ein Strich
 * und das Teil unsichtbar.
 */
function anbauteilSkizzeMast(a, werte) {
  const ende = ortVon(a) === 'mastB' ? 'B' : 'A';
  const hMast = a.hMast ?? 0;
  const hoch = Math.max(werte.mastH ?? 12, werte.mastLaenge ?? 0,
                        werte.mastLaengeB ?? 0, hMast, 1);
  const punkte = [...(a.module ?? []), ...(a.lasten ?? [])];
  const zWahl = punkte.length
    ? punkte.reduce((s, p) => (Math.abs(p.z ?? 0) > Math.abs(s) ? (p.z ?? 0) : s), 0)
    : 0;
  const yWahl = punkte.reduce((s, p) => (Math.abs(p.y ?? 0) > Math.abs(s) ? (p.y ?? 0) : s), 0);

  // --- Anschluss links -----------------------------------------------------
  const cx = 58, cyAn = 66, yKopf = 22, yFuss = 132, halb = 5;
  const anY = zWahl >= 0 ? Math.max(30, cyAn - 30) : Math.min(120, cyAn + 30);
  const anX = cx + 40 + Math.max(-22, Math.min(22, yWahl * 34));

  const schraffur = (x0) => [0, 1, 2, 3, 4].map((i) =>
    `<line class="sk-steg" x1="${x0 - 12 + i * 6}" y1="${yFuss}"
       x2="${x0 - 16 + i * 6}" y2="${yFuss + 8}"/>`).join('');

  const zMass = zWahl ? `
    <g class="sk-mass" data-zu="z">
      <line x1="${anX + 16}" y1="${cyAn}" x2="${anX + 16}" y2="${anY}"/>
      <text x="${anX + 20}" y="${(cyAn + anY) / 2 + 3}">z ${zWahl.toFixed(2)}</text>
    </g>` : '';
  const yMass = yWahl ? `
    <g class="sk-mass" data-zu="y">
      <line x1="${cx}" y1="${anY - 12}" x2="${anX}" y2="${anY - 12}"/>
      <text x="${(cx + anX) / 2}" y="${anY - 16}" text-anchor="middle">y ${yWahl.toFixed(2)}</text>
    </g>` : '';

  const kraft = (feld, x1, y1, dx, dy, txt) => `
    <g class="sk-kraft" data-zu="${feld}">
      <line x1="${x1}" y1="${y1}" x2="${x1 + dx}" y2="${y1 + dy}"/>
      <polygon points="${x1 + dx},${y1 + dy} ${x1 + dx - dy * 0.18 - dx * 0.22},${y1 + dy + dx * 0.18 - dy * 0.22} ${x1 + dx + dy * 0.18 - dx * 0.22},${y1 + dy - dx * 0.18 - dy * 0.22}"/>
      <text x="${x1 + dx + 4}" y="${y1 + dy + (dy ? 10 : -4)}">${esc(txt)}</text>
    </g>`;

  // --- Ganzer Mast rechts --------------------------------------------------
  const mx = 232;
  const py = yFuss - Math.max(0, Math.min(1, hMast / hoch)) * (yFuss - yKopf);

  return `<svg class="at-skizze" viewBox="0 0 300 165" role="img"
     aria-label="Massskizze am Masten">
    <!-- Anschluss -->
    <text class="sk-titel" x="8" y="12">Anschluss am Mast ${ende}</text>
    <line class="sk-gurt" x1="${cx - halb}" y1="${yKopf}" x2="${cx - halb}" y2="${yFuss}"/>
    <line class="sk-gurt" x1="${cx + halb}" y1="${yKopf}" x2="${cx + halb}" y2="${yFuss}"/>
    <line class="sk-steg" x1="${cx - 14}" y1="${yFuss}" x2="${cx + 14}" y2="${yFuss}"/>
    ${schraffur(cx)}
    <line class="sk-an" x1="${cx - halb - 4}" y1="${cyAn}" x2="${cx + halb + 4}" y2="${cyAn}"/>
    <g class="sk-teil">
      <line x1="${cx}" y1="${cyAn}" x2="${anX}" y2="${cyAn}"/>
      <line x1="${anX}" y1="${cyAn}" x2="${anX}" y2="${anY}"/>
      <circle cx="${anX}" cy="${anY}" r="2.6"/>
    </g>
    ${zMass}${yMass}
    ${kraft('Fy', anX, anY, 20, 0, 'F_y')}
    ${kraft('Fz', anX, anY, 0, 14, 'F_z')}

    <!-- Ganzer Mast -->
    <text class="sk-titel" x="186" y="12">Lage am Masten</text>
    <line class="sk-gurt" x1="${mx - halb}" y1="${yKopf}" x2="${mx - halb}" y2="${yFuss}"/>
    <line class="sk-gurt" x1="${mx + halb}" y1="${yKopf}" x2="${mx + halb}" y2="${yFuss}"/>
    <line class="sk-steg" x1="${mx - 14}" y1="${yFuss}" x2="${mx + 14}" y2="${yFuss}"/>
    ${schraffur(mx)}
    <g class="sk-teil"><line x1="${mx - 12}" y1="${py}" x2="${mx + 12}" y2="${py}"/>
      <circle cx="${mx + 12}" cy="${py}" r="2.6"/></g>
    <g class="sk-mass" data-zu="hMast">
      <line x1="${mx - 24}" y1="${yFuss}" x2="${mx - 24}" y2="${py}"/>
      <text x="${mx - 28}" y="${(yFuss + py) / 2 + 3}" text-anchor="end">h ${hMast.toFixed(2)} m</text>
    </g>
    <text class="sk-notiz" x="186" y="152">ab Fundament · 0 … ${hoch.toFixed(1)} m</text>
  </svg>`;
}

function anbauteilSkizze(a, werte) {
  const bef = befestigungsArt(a);
  // Der tiefste bzw. höchste Angriffspunkt der Baugruppe steht stellvertretend
  // für das Ganze: die Skizze erklärt die Achsen, nicht die einzelne Höhe.
  const punkte = [...(a.module ?? []), ...(a.lasten ?? [])];
  const zWahl = punkte.length
    ? punkte.reduce((s, p) => (Math.abs(p.z ?? 0) > Math.abs(s) ? (p.z ?? 0) : s), 0)
    : 0;
  const yWahl = punkte.reduce((s, p) => (Math.abs(p.y ?? 0) > Math.abs(s) ? (p.y ?? 0) : s), 0);
  const ev = -zWahl, ex = yWahl;
  const x = a.x ?? 0, raster = a.raster ?? 0.4, L = werte.L ?? 20;

  // --- Querschnitt links ---------------------------------------------------
  const cx = 74, cyO = 46, cyU = 92;          // Gurtachsen oben/unten
  const halb = 30;                            // halbe Jochbreite
  const gurt = (y) => `
    <line class="sk-gurt" x1="${cx - halb}" y1="${y}" x2="${cx + halb}" y2="${y}"/>
    <circle class="sk-winkel" cx="${cx - halb}" cy="${y}" r="3.2"/>
    <circle class="sk-winkel" cx="${cx + halb}" cy="${y}" r="3.2"/>`;

  // Anschlussebene(n) hervorheben
  const anschluss = (bef === 'durchgehend' ? [cyO, cyU] : bef === 'oben' ? [cyO] : [cyU])
    .map((y) => `<line class="sk-an" x1="${cx - halb - 4}" y1="${y}"
                       x2="${cx + halb + 4}" y2="${y}"/>`).join('');

  // Lastangriff: unterhalb bei e_v > 0, oberhalb bei e_v < 0
  const abY = ev >= 0 ? cyU : cyO;
  const anY = ev >= 0 ? Math.min(150, cyU + 42) : Math.max(12, cyO - 30);
  const anX = cx + Math.max(-26, Math.min(26, ex * 34));

  const evMass = ev ? `
    <g class="sk-mass" data-zu="z">
      <line x1="${cx + halb + 16}" y1="${abY}" x2="${cx + halb + 16}" y2="${anY}"/>
      <text x="${cx + halb + 20}" y="${(abY + anY) / 2 + 3}">z ${zWahl.toFixed(2)}</text>
    </g>` : '';
  const exMass = ex ? `
    <g class="sk-mass" data-zu="y">
      <line x1="${cx}" y1="${anY + 12}" x2="${anX}" y2="${anY + 12}"/>
      <text x="${(cx + anX) / 2}" y="${anY + 22}" text-anchor="middle">y ${ex.toFixed(2)}</text>
    </g>` : '';

  const kraft = (feld, x1, y1, dx, dy, txt) => `
    <g class="sk-kraft" data-zu="${feld}">
      <line x1="${x1}" y1="${y1}" x2="${x1 + dx}" y2="${y1 + dy}"/>
      <polygon points="${x1 + dx},${y1 + dy} ${x1 + dx - dy * 0.18 - dx * 0.22},${y1 + dy + dx * 0.18 - dy * 0.22} ${x1 + dx + dy * 0.18 - dx * 0.22},${y1 + dy - dx * 0.18 - dy * 0.22}"/>
      <text x="${x1 + dx + (dx ? 4 : 4)}" y="${y1 + dy + (dy ? 10 : -4)}">${esc(txt)}</text>
    </g>`;

  // --- Ansicht rechts: Lage in Jochachse -----------------------------------
  const aX0 = 186, aX1 = 288;
  const px = aX0 + Math.max(0, Math.min(1, x / (L || 1))) * (aX1 - aX0);
  const halbR = Math.max(3, (raster / (L || 1)) * (aX1 - aX0) / 2);

  return `<svg class="at-skizze" viewBox="0 0 300 165" role="img"
     aria-label="Massskizze des Anbauteils">
    <!-- Querschnitt -->
    <text class="sk-titel" x="8" y="12">Querschnitt</text>
    ${gurt(cyO)}${gurt(cyU)}
    <line class="sk-steg" x1="${cx - halb}" y1="${cyO}" x2="${cx - halb}" y2="${cyU}"/>
    <line class="sk-steg" x1="${cx + halb}" y1="${cyO}" x2="${cx + halb}" y2="${cyU}"/>
    ${anschluss}
    <g class="sk-teil" data-zu="befestigung">
      ${bef === 'durchgehend'
        ? `<line x1="${cx}" y1="${cyO}" x2="${cx}" y2="${cyU}"/>` : ''}
      <line x1="${cx}" y1="${abY}" x2="${anX}" y2="${anY}"/>
      <circle cx="${anX}" cy="${anY}" r="2.6"/>
    </g>
    ${evMass}${exMass}
    ${kraft('Fy', anX, anY, 22, 0, 'F_y')}
    ${kraft('Fz', anX, anY, 0, ev >= 0 ? 14 : -14, 'F_z')}

    <!-- Ansicht in Jochachse -->
    <text class="sk-titel" x="186" y="12">Lage in Jochachse</text>
    <line class="sk-gurt" x1="${aX0}" y1="46" x2="${aX1}" y2="46"/>
    <line class="sk-gurt" x1="${aX0}" y1="92" x2="${aX1}" y2="92"/>
    <g class="sk-teil"><line x1="${px}" y1="46" x2="${px}" y2="92"/></g>
    <g class="sk-mass" data-zu="x">
      <line x1="${aX0}" y1="110" x2="${px}" y2="110"/>
      <text x="${aX0}" y="122">x ${x.toFixed(2)} m</text>
    </g>
    <g class="sk-mass" data-zu="raster">
      <line x1="${px - halbR}" y1="34" x2="${px + halbR}" y2="34"/>
      <line x1="${px - halbR}" y1="30" x2="${px - halbR}" y2="38"/>
      <line x1="${px + halbR}" y1="30" x2="${px + halbR}" y2="38"/>
      <text x="${px}" y="26" text-anchor="middle">${(raster * 1000).toFixed(0)}</text>
    </g>
    <text class="sk-notiz" x="186" y="140">0 … ${L.toFixed(1)} m</text>
  </svg>`;
}

/**
 * Die Skizze zur Baugruppe - je nach Ort die des Jochs oder die des Mastes.
 *
 * Exportiert, damit der Pruefstand denselben Weg geht wie die Karte. Wuerde
 * er die beiden Zeichner einzeln aufrufen, pruefte er nicht, ob die WEICHE
 * stimmt - und die ist der Punkt: ein Mastteil, das die Jochskizze bekommt,
 * beschriftet jede Zahl falsch.
 */
export function anbauteilSkizzeFuer(a, werte) {
  return amMast(a) ? anbauteilSkizzeMast(a, werte) : anbauteilSkizze(a, werte);
}

/** Rolle eines Moduls aus der Lasttabelle; null, wenn unbekannt. */
function modulRolle(m) {
  try { return getFlBauteil(m.bauteil).rolle; } catch { return null; }
}

/**
 * Schalter «Wind des Auslegers über die Fahrleitung».
 *
 * Erscheint nur, wo er etwas bedeutet: die Baugruppe braucht einen TRÄGER
 * (Hängestütze) und mindestens einen AUFBAU (Ausleger). Ohne beides gibt es
 * keinen Zweifeldträger, und der Schalter stünde wirkungslos da.
 * Was gerechnet wird, steht bei windAufTraeger in data.anbauteile.js.
 */
function windVersatzHtml(a, i) {
  const rollen = (a.module ?? []).map(modulRolle);
  const tr = (a.module ?? []).find((m, k) => rollen[k] === 'traeger');
  if (!tr || !rollen.includes('aufbau')) return '';
  const an = a.windAufTraeger === true;
  const p = a.windAnteil ?? 50;
  return `<div class="sec-klein">Lasteintrag des Auslegers</div>
    <label class="schalter"><input class="at" data-k="windAufTraeger"
      type="checkbox"${an ? ' checked' : ''}><span>Fahrleitung als Auflager
      ansetzen</span></label>
    ${an ? `<div class="at-gitter">
      ${atFeld(i, 'windAnteil', 'in den Träger', p, '%', 5)}
      <span class="at-feld lesbar"><span>Fahrleitung trägt <i>%</i></span>
        <b>${f0(100 - p)}</b></span>
      <span class="at-feld lesbar"><span>Eintrag <i>–</i></span>
        <b>Anschluss</b><small class="hinweis">Ausleger/Stütze</small></span>
    </div>` : ''}
    ${hinweisHtml(`windv-${a.id}`, 'Das äussere Ende des Auslegers hält die '
      + 'Fahrleitung, und die ist durch den Leiterzug seitlich gespannt - sie '
      + 'wirkt dort als Auflager. Der Wind auf den Ausleger verteilt sich '
      + 'damit auf zwei Auflager: die eine Hälfte nimmt die Fahrleitung auf '
      + 'und trägt sie längs zu den Nachbaraufhängungen ab, die andere geht '
      + 'in den Träger. Nur dieser Anteil kommt am Joch an, und zwar am '
      + 'ANSCHLUSSPUNKT Ausleger/Stütze: auf der Achse des Trägers, auf der '
      + 'Höhe des Auslegers. Bei einem Kragarm rückt er damit auch in '
      + 'Jochachse zurück - beim NT um 1.2 m. '
      + 'Eigengewicht, Schnee, Wind in x und die Drahtwerke bleiben '
      + 'unangetastet; deren Windlast ist über L_FL bereits der Anteil dieser '
      + 'Aufhängung. Die Hälfte ist eine zulässige Modellannahme, kein '
      + 'gerechneter Wert.')}`;
}

/**
 * Zahlenfeld MIT Schieber in der Anbauteil-Karte.
 *
 * Die Lage entlang des Jochs ist der Wert, den man beim Aufbauen am
 * häufigsten anfasst, und der einzige mit einem klaren Bereich: 0 … Jochlänge.
 * Ihn zu tippen heisst raten und nachbessern; am Schieber sieht man ihn im
 * Modell wandern. Beide Eingaben tragen denselben data-k, deshalb hält
 * aktualisiereMaske sie von selbst zusammen.
 */
function atSchieber(i, k, label, wert, einheit, schritt, min, max) {
  const v = Number.isFinite(wert) ? wert : 0;
  return `<label class="at-feld breit3" data-feldname="${k}">
    <span>${esc(label)} <i>${esc(einheit)}</i></span>
    <div class="zahlfeld">
      <input class="at rng" data-k="${k}" data-idx="${i}" type="range"
             min="${min}" max="${max}" step="${schritt}" value="${v}">
      <input class="at kurz" data-k="${k}" data-idx="${i}" type="number"
             step="${schritt}" value="${v}">
    </div>
  </label>`;
}

function atFeld(i, k, label, wert, einheit, schritt, titel = '') {
  return `<label class="at-feld" data-feldname="${k}"${
      titel ? ` title="${esc(titel)}"` : ''}>
    <span>${esc(label)} <i>${esc(einheit)}</i></span>
    <input class="at" data-k="${k}" data-idx="${i}" type="number"
           step="${schritt}" value="${wert ?? 0}">
  </label>`;
}

/** Auswahlliste in der Anbauteil-Karte. */
function atWahl(i, k, label, wert, optionen, hinweis = '') {
  return `<label class="at-feld breit2" data-feldname="${k}">
    <span>${esc(label)}</span>
    <select class="at" data-k="${k}" data-idx="${i}">${optionen.map((o) =>
      `<option value="${esc(o.key)}"${o.key === wert ? ' selected' : ''}
        >${esc(o.label)}</option>`).join('')}</select>
    ${hinweisHtml(`at-${i}-${k}`, hinweis)}
  </label>`;
}

/*
 * DIE KUERZELLISTE, wie app.js sie sieht: {id, text, taste, jetzt, still,
 * gruppe}. Die Maske zeigt sie an und meldet Aenderungen zurueck; welche
 * Handlung dahintersteht, geht sie nichts an.
 */
let tastenListe = null;
/*
 * Eine abgewiesene Belegung sagt WARUM - und zwar dort, wo man sie
 * vorgenommen hat. Der Handlungsbalken ueber dem Modell liegt hinter dem
 * offenen Dialog; eine Meldung dort waere eine, die niemand liest.
 */
let tastenMeldung = '';
export function setzeTastenMeldung(t) { tastenMeldung = t ?? ''; }

/** Die Liste der Tastenkuerzel setzen (einmalig beim Start). */
export function setzeTastenliste(liste) { tastenListe = liste; }

let beiVorlageWahl = null, beiVorlageWeg = null, beiVorlageSichern = null;
let beiGenerator = null, beiAnbauZoom = null, beiVorlageBearbeiten = null;
let beiAnbauOeffnen = null;

/** Rückrufe der Anbauteil-Oberfläche registrieren (einmalig beim Start). */
export function setzeAnbauHandler(h) {
  beiVorlageWahl = h.wahl; beiVorlageWeg = h.weg;
  beiVorlageSichern = h.sichern; beiGenerator = h.generator;
  beiAnbauZoom = h.zoom; beiVorlageBearbeiten = h.bearbeiten;
  beiAnbauOeffnen = h.oeffnen;
}

/**
 * Formular zum Bearbeiten einer Vorlage.
 *
 * Katalogvorlagen werden nicht verändert - sie sind die gepflegte Grundlage.
 * Wer eine anpasst, bekommt eine eigene Kopie; das steht auch so im Formular.
 */
export function vorlageFormular(v, istKopie) {
  const auswahl = (wert) => {
    const gruppe = (rolle, titel) => {
      const liste = flBauteile(rolle);
      if (!liste.length) return '';
      return `<optgroup label="${esc(titel)}">${liste.map((b) =>
        `<option value="${esc(b.id)}"${b.id === wert ? ' selected' : ''}
          >${esc(b.name)}</option>`).join('')}</optgroup>`;
    };
    return gruppe('traeger', 'Träger am Joch') + gruppe('aufbau', 'Aufbauten') +
           gruppe('drahtwerk', 'Drahtwerke');
  };
  const module = (v.module ?? []).map((m, k) => `
    <div class="modul" data-vm="${k}">
      <div class="modul-kopf">
        <select class="vm" data-vk="bauteil" data-vm="${k}">${auswahl(m.bauteil)}</select>
        <button class="loeschen" data-vm-weg="${k}" title="Bauteil entfernen">×</button>
      </div>
      <div class="at-gitter">
        <label class="at-feld"><span>y <i>m</i></span>
          <input class="vm" data-vk="y" data-vm="${k}" type="number" step="0.1"
                 value="${m.y ?? -(0) ?? 0}"></label>
        <label class="at-feld"><span>z <i>m</i></span>
          <input class="vm" data-vk="z" data-vm="${k}" type="number" step="0.05"
                 value="${m.z ?? -(m.ev ?? 0)}"></label>
        <label class="at-feld"><span>Anzahl <i>–</i></span>
          <input class="vm" data-vk="anzahl" data-vm="${k}" type="number" step="1"
                 value="${m.anzahl ?? 1}"></label>
      </div>
    </div>`).join('');

  return `
    ${istKopie ? `<div class="infobox" style="margin-top:0">Der Katalog bleibt
      unverändert. Gesichert wird eine <b>eigene Kopie</b>, die neben den
      Katalogvorlagen erscheint.</div>` : ''}
    <div class="feld"><label for="vl-name">Name</label>
      <input id="vl-name" type="text" value="${esc(v.name ?? '')}"></div>
    <div class="feld"><label for="vl-bef">Befestigung am Joch</label>
      <select id="vl-bef">${BEFESTIGUNGEN.map((o) =>
        `<option value="${esc(o.key)}"${o.key === (v.befestigung ?? 'unten') ? ' selected' : ''}
          >${esc(o.label)}</option>`).join('')}</select></div>
    <div class="feld"><label for="vl-raster">Anschlussraster</label>
      <div class="zahlfeld"><input id="vl-raster" type="number" step="0.05"
        value="${v.raster ?? 0.4}"><span class="einheit">m</span></div>
      <small class="hinweis">Abstand der beiden Einleitungsstellen in Jochachse.
        Er bestimmt mit, auf wie viele Bindebleche sich das Kräftepaar verteilt.</small></div>
    <div class="sec">Bauteile aus der Lasttabelle<span class="sec-r"
      >${(v.module ?? []).length}</span></div>
    <div class="modul-liste" id="vl-module">${module ||
      '<p class="notiz">Noch keine Bauteile.</p>'}</div>
    <button class="btn btn-mini" id="vl-neu" type="button">+ Bauteil</button>
    <p class="notiz">z zählt ab der Schwerachse des Anschlussgurtes,
      positiv nach oben. Ein hängendes Teil hat also z &lt; 0.</p>`;
}

function verdrahteAnbauteile(container, werte, onAnbau) {
  if (!onAnbau) return;
  // Immer den AKTUELLEN Stand lesen, nicht den beim Verdrahten gültigen.
  // Immer im NEUEN Modell arbeiten: was aus einem alten Stand kommt, wird
  // beim ersten Anfassen umgeschrieben und nicht halb weitergeschleppt.
  const liste = () =>
    ((aktuelleWerte ?? werte).anbauteile ?? []).map(normalisiereAnbauteil);

  container.querySelectorAll('.kachel').forEach((b) => {
    // Anklicken fragt die Lage ab, statt das Teil auf x = 0 zu setzen.
    b.addEventListener('click', () => beiVorlageWahl?.(b.dataset.vorlage, null));
    b.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/tragjoch-vorlage', b.dataset.vorlage);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });
  /*
   * EINE VORHANDENE BAUGRUPPE INS MODELL ZIEHEN (Weisung: «oder auch per
   * drag and drop ablegen»).
   *
   * Eigener Datentyp, nicht derselbe wie bei den Vorlagen: was hier gezogen
   * wird, ist keine Vorlage, sondern eine BAUGRUPPE mit allen Zahlen, die von
   * Hand daran geaendert wurden. Ueber denselben Typ zu gehen hiesse, beim
   * Ablegen wieder die Vorlage zu bauen - und genau die Aenderungen zu
   * verlieren, wegen derer man kopiert.
   */
  container.querySelectorAll('[data-at-ziehen]').forEach((z) => {
    z.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/tragjoch-baugruppe', z.dataset.atZiehen);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });
  container.querySelectorAll('[data-vorlage-weg]').forEach((b) => {
    b.addEventListener('click', () => beiVorlageWeg?.(b.dataset.vorlageWeg));
  });
  container.querySelectorAll('[data-vorlage-bearb]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      beiVorlageBearbeiten?.(b.dataset.vorlageBearb);
    });
  });
  // Rechtsklick auf die Kachel führt zum selben Editor - wer das gewohnt ist,
  // sucht nicht erst den kleinen Stift.
  container.querySelectorAll('.kachel').forEach((b) => {
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      beiVorlageBearbeiten?.(b.dataset.vorlage);
    });
  });
  container.querySelectorAll('[data-generator]').forEach((b) => {
    b.addEventListener('click', () => beiGenerator?.());
  });
  container.querySelectorAll('[data-at-zoom]').forEach((b) => {
    b.addEventListener('click', () => beiAnbauZoom?.(+b.dataset.atZoom));
  });
  // Zeile anklicken: dieses Teil aufklappen, die übrigen zu. Ein zweiter Klick
  // auf die offene Zeile klappt sie wieder zu.
  container.querySelectorAll('[data-at-oeffnen]').forEach((z) => {
    z.addEventListener('click', () => beiAnbauOeffnen?.(+z.dataset.atOeffnen));
  });
  // Filtern im Browser, ohne die Maske neu zu bauen.
  const suche = container.querySelector('#at-suche');
  if (suche) {
    const filtern = () => {
      const q = suche.value.trim().toLowerCase();
      let sichtbar = 0;
      container.querySelectorAll('.at-karte').forEach((k) => {
        const passt = !q || (k.dataset.suche ?? '').includes(q);
        k.hidden = !passt;
        if (passt) sichtbar++;
      });
      // Leere Gleisgruppen ausblenden, damit keine Überschrift ohne Inhalt bleibt
      container.querySelectorAll('.at-gruppe').forEach((gr) => {
        gr.hidden = ![...gr.querySelectorAll('.at-karte')].some((k) => !k.hidden);
      });
      const zahl = container.querySelector('.at-suche-zahl');
      if (zahl) zahl.textContent = q ? `${sichtbar} von ${
        container.querySelectorAll('.at-karte').length}` : '';
    };
    suche.addEventListener('input', filtern);
    filtern();
  }
  container.querySelectorAll('[data-at-vorlage]').forEach((b) => {
    b.addEventListener('click', () => beiVorlageSichern?.(+b.dataset.atVorlage));
  });
  // Ein Klick in eine Karte fährt das Modell auf dieses Teil - man sieht
  // sofort, welches Teil man gerade bearbeitet.
  container.querySelectorAll('.at-karte').forEach((k) => {
    k.addEventListener('focusin', () => beiAnbauZoom?.(+k.dataset.idx, true));
  });

  container.querySelectorAll('.at').forEach((inp) => {
    const ev = inp.type === 'checkbox' ? 'change' : 'input';
    inp.addEventListener(ev, () => {
      const karte = inp.closest('.at-karte');
      const idx = +karte.dataset.idx;
      const l = liste();
      let v = inp.type === 'checkbox' ? inp.checked
        : inp.type === 'number' || inp.type === 'range'
          ? (parseFloat(inp.value) || 0) : inp.value;
      /*
       * DIE LAGE AM JOCH: RUNDEN, FANGEN, FREISCHIEBEN - in dieser Folge.
       *
       * 10 cm (Weisung): niemand baut auf den Millimeter, und eine Lage von
       * 4.947 m täuscht eine Genauigkeit vor, die es nicht gibt.
       *
       * Die MASSKETTE sticht das Runden aus - 2.09 steht so auf der
       * Zeichnung, und dort sitzt das Bauteil.
       *
       * Zuletzt weicht ein TRÄGER den Bindeblechen aus (Weisung: Hängestützen
       * und Jochaufsätze dürfen sich nicht mit den Verbindungsblechen
       * berühren). Das ist keine Vorliebe, sondern eine Unmöglichkeit: die
       * Klemme kann dort nicht sitzen. Deshalb zuletzt und ohne Widerrede.
       */
      if (inp.dataset.k === 'x') {
        v = Math.round(v * 10) / 10;
        v = fangeAufMasskette(v, massketteLesen(werte.masskette, werte.L).werte);
        // Das Teil aus DIESER Liste, nicht aus einem Helfer der Maske:
        // `teilVon` gehoert zu aktualisiereMaske und gibt es hier nicht.
        const teil = l[idx];
        if (modellFuerLage && teil
            && hatTraeger(teil.module, (id) => getFlBauteil(id).rolle)) {
          const an = passeTraegerAn(v, teil.raster, modellFuerLage);
          v = an.x;
          // Wird das Raster geweitet, wandert es mit in die Baugruppe -
          // sonst stünde in der Karte ein Wert, mit dem nicht gerechnet wird.
          if (an.geweitet) l[idx] = { ...l[idx], raster: an.raster };
        }
      }
      l[idx][inp.dataset.k] = v;
      onAnbau(l);
    });
  });

  container.querySelectorAll('[data-loesch]').forEach((b) => {
    b.addEventListener('click', () =>
      onAnbau(liste().filter((_, i) => i !== +b.dataset.loesch)));
  });

  // --- Module der Baugruppe -------------------------------------------------
  const setzeModul = (idx, mod, feld, wert) => {
    const l = liste();
    if (!l[idx]) return;
    const m = (l[idx].module ?? []).map((x) => ({ ...x }));
    if (!m[mod]) return;
    m[mod] = { ...m[mod], [feld]: wert };
    l[idx] = { ...l[idx], module: m };
    onAnbau(l);
  };
  /*
   * KRAGARM SPIEGELN.
   *
   * Ein Ausleger steht nach der einen oder der anderen Seite aus, und beim
   * Aufnehmen einer Anlage wechselt das von Joch zu Joch. Von Hand hiesse
   * das: zwei Vorzeichen umsetzen und keines vergessen - denn die Leiter am
   * ENDE des Arms muss mit.
   *
   * Gespiegelt wird deshalb dieser Ausleger UND alles, was auf derselben
   * Seite weiter aussen sitzt. Ein zweiter Ausleger nach der anderen Seite
   * bleibt, wo er ist; einer, der weiter innen sitzt, ebenso.
   *
   * Nur das Vorzeichen von x. Höhe, Lasten und Rolle bleiben - die Achse der
   * Hängestütze ist der Spiegel.
   */
  container.querySelectorAll('[data-mod-spiegeln]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = +b.dataset.idx, mod = +b.dataset.modSpiegeln;
      const l = liste();
      const a = l[idx];
      if (!a) return;
      const module = (a.module ?? []).map((x) => ({ ...x }));
      const x0 = module[mod]?.x ?? 0;
      if (!x0) return;
      const seite = Math.sign(x0), weite = Math.abs(x0) - 1e-9;
      module.forEach((m) => {
        const mx = m.x ?? 0;
        if (Math.sign(mx) === seite && Math.abs(mx) >= weite) m.x = -mx;
      });
      l[idx] = { ...a, module };
      onAnbau(l);
    });
  });

  container.querySelectorAll('.mod').forEach((inp) => {
    const ev = inp.tagName === 'SELECT' || inp.type === 'checkbox'
      ? 'change' : 'input';
    inp.addEventListener(ev, () => {
      // Die drei Wirkungshaken sind Ja/Nein - weder Zahl noch Text.
      if (inp.type === 'checkbox') {
        setzeModul(+inp.dataset.idx, +inp.dataset.mod, inp.dataset.mk,
                   inp.checked);
        return;
      }
      const zahl = inp.type === 'number' || inp.dataset.mk === 'cw';
      // Leerer Winkel heisst NICHT null Grad, sondern «aus Radius und
      // Spannweite». Nur dort darf leer bestehen bleiben (MODUL_VORGABE);
      // eine geleerte LAGE ist eine Null und wird auch so abgelegt - sonst
      // steht in der Baugruppe ein null, das die Karte gleich wieder als
      // leeres Feld zeigt.
      const leer = inp.value.trim() === '';
      const vorgabe = MODUL_VORGABE[inp.dataset.mk];
      const wert = !zahl ? inp.value
        : leer ? (vorgabe === undefined ? null : vorgabe)
        : (parseFloat(inp.value) || 0);
      setzeModul(+inp.dataset.idx, +inp.dataset.mod, inp.dataset.mk, wert);
    });
  });
  container.querySelectorAll('[data-mod-weg]').forEach((b) => {
    b.addEventListener('click', () => {
      const l = liste(); const idx = +b.dataset.idx;
      l[idx] = { ...l[idx],
                 module: (l[idx].module ?? []).filter((_, k) => k !== +b.dataset.modWeg) };
      onAnbau(l);
    });
  });
  container.querySelectorAll('[data-mod-neu]').forEach((b) => {
    b.addEventListener('click', () => {
      const l = liste(); const idx = +b.dataset.modNeu;
      const vorhanden = l[idx].module ?? [];
      // Neues Modul auf der Höhe des letzten – meist wird dort angebaut.
      const z = vorhanden.length ? (vorhanden[vorhanden.length - 1].z ?? 0) : -1.5;
      l[idx] = { ...l[idx], module: [...vorhanden,
        { bauteil: flBauteile('aufbau')[0]?.id, anzahl: 1, laenge: null,
          winkel: null, y: 0, z }] };
      onAnbau(l);
    });
  });

  // --- Freie Lastblöcke -----------------------------------------------------
  container.querySelectorAll('.lb').forEach((inp) => {
    const ev = inp.tagName === 'SELECT' ? 'change' : 'input';
    inp.addEventListener(ev, () => {
      const l = liste();
      const idx = +inp.dataset.idx, k = +inp.dataset.last;
      if (!l[idx]) return;
      const bloecke = (l[idx].lasten ?? []).map((x) => ({ ...x }));
      if (!bloecke[k]) return;
      bloecke[k] = { ...bloecke[k], [inp.dataset.lk]:
        inp.type === 'number' ? (parseFloat(inp.value) || 0) : inp.value };
      l[idx] = { ...l[idx], lasten: bloecke };
      onAnbau(l);
    });
  });
  container.querySelectorAll('[data-last-weg]').forEach((b) => {
    b.addEventListener('click', () => {
      const l = liste(); const idx = +b.dataset.idx;
      l[idx] = { ...l[idx],
                 lasten: (l[idx].lasten ?? []).filter((_, k) => k !== +b.dataset.lastWeg) };
      onAnbau(l);
    });
  });
  container.querySelectorAll('[data-last-neu]').forEach((b) => {
    b.addEventListener('click', () => {
      const l = liste(); const idx = +b.dataset.lastNeu;
      const vorhanden = l[idx].lasten ?? [];
      const letzter = vorhanden[vorhanden.length - 1];
      l[idx] = { ...l[idx], lasten: [...vorhanden, neuerLastblock('G',
        { y: letzter?.y ?? 0, z: letzter?.z ?? 0 })] };
      onAnbau(l);
    });
  });

  // Fokus in einem Feld lässt das zugehörige Mass in der Skizze aufleuchten.
  // Das ist der ganze Zweck der Skizze: sehen, welche Zahl man gerade schreibt.
  container.querySelectorAll('.at-karte .at[data-k]').forEach((inp) => {
    const karte = inp.closest('.at-karte');
    const setze = (an) => {
      karte.querySelectorAll('[data-zu]').forEach((g) =>
        g.classList.toggle('hell', an && g.dataset.zu === inp.dataset.k));
      inp.closest('.at-feld')?.classList.toggle('hervor', an);
    };
    inp.addEventListener('focus', () => setze(true));
    inp.addEventListener('mouseenter', () => setze(true));
    inp.addEventListener('blur', () => setze(false));
    inp.addEventListener('mouseleave', () => {
      if (document.activeElement !== inp) setze(false);
    });
  });
}

// --- Auswertung -------------------------------------------------------------

/**
 * Übersicht: Urteil, Kennzahlen und die Liste der höchstbeanspruchten Stellen.
 * Ein Klick auf eine Zeile zoomt im 3D-Modell auf diese Stelle.
 */
/**
 * DIE KONSTRUKTIONSPRÜFUNGEN, sichtbar.
 *
 * Das Urteil sagte «1 Prüfung(en) verletzt» und liess den Benutzer damit
 * stehen: welche es war, stand nur in der Excel-Ausleitung. Seit der
 * Gurtanschluss am Mast als eigener Nachweis geführt wird (Prüfung A1), ist
 * das eine Zahl, die man sehen und einordnen können muss.
 *
 * Verletzte stehen oben - wer hierher kommt, sucht sie.
 */
/**
 * DIE NICHT GEFÜHRTEN NACHWEISE, ausdrücklich benannt.
 *
 * Ein abgeschalteter Nachweis, der einfach aus der Liste verschwindet, sieht
 * aus wie ein bestandener. Er steht deshalb hier - mit dem Unterschied, ob
 * der Benutzer ihn abgewählt hat oder ob das Werkzeug ihn gar nicht führt.
 */
function nichtGefuehrtHtml(urteil) {
  const liste = urteil?.nichtGefuehrt ?? [];
  if (!liste.length) return '';
  /*
   * EINGEKLAPPT (Weisung), NICHT WEG.
   *
   * Fuenf Zeilen Erklaerung standen dauerhaft im Auswertungsfeld und sagten
   * bei jedem Tragwerk dasselbe - der Knicknachweis fehlt heute so wie
   * gestern. Als Balken war das kein Hinweis mehr, sondern Tapete.
   *
   * Weg darf er trotzdem nicht: die Zahl bleibt im Urteil («2 Nachweis(e)
   * nicht geführt»), die Namen stehen in der Kopfzeile des Abschnitts, und
   * ein Klick zeigt, warum. Das ist die Form, in der die Uebersicht auch die
   * Hinweise und die Konstruktionspruefungen fuehrt.
   *
   * UNTER DEN KACHELN (Weisung), nicht unter dem Urteil. Dort steht, was
   * geführt WIRD - η Obergurt, Untergurt, Bindeblech. Was nicht geführt
   * wird, gehört daneben und nicht an den Anfang: die Reihe liest sich dann
   * als ein Gedanke, und die Lücke steht dort, wo man die Nachweise sucht.
   */
  const namen = liste.map((g) => g.titel).join(', ');
  return klapp('uebersicht-nichtgefuehrt', 'Nicht geführte Nachweise',
    `<div class="nichtgefuehrt">
      ${liste.map((g) => `<p class="notiz"><b>${esc(g.titel)}</b>
        <span class="ablage-meta">· ${esc(g.grund)}</span><br>${esc(g.was)}</p>`).join('')}
    </div>`, namen, false);
}

function pruefungenHtml(urteil) {
  const alle = urteil?.checks ?? [];
  if (!alle.length) return '';
  const geordnet = [...alle].sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? 1 : -1));
  const zeile = (c) => `
    <tr class="${c.ok ? '' : (c.warnungNichtFehler ? 'warnton' : 'nok')}">
      <td>${esc(c.id)}</td>
      <td>${esc(c.text)}${c.status
        ? `<br><span class="ablage-meta">${esc(c.status)}</span>` : ''}</td>
      <td class="num">${f2(c.vorhanden)}</td>
      <td class="num">${esc(c.richtung ?? '')} ${f2(c.erforderlich)}</td>
      <td class="num">${esc(c.einheit ?? '')}</td>
      <td class="num">${c.ok ? '✓' : (c.warnungNichtFehler ? '!' : '✗')}</td>
    </tr>`;
  const offen = urteil.verletzt?.length ?? 0;
  return klapp('uebersicht-pruefungen', 'Konstruktionsprüfungen', `
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>#</th><th>Prüfung</th><th class="num">vorhanden</th>
        <th class="num">verlangt</th><th class="num">Einheit</th>
        <th class="num"></th></tr></thead>
      <tbody>${geordnet.map(zeile).join('')}</tbody></table></div>`,
    offen ? `${offen} verletzt` : `${alle.length} erfüllt`, offen > 0);
}

/** Rückruf für die Sortimentssuche; app.js setzt ihn beim Start. */
let beiSortiment = null;
export function setzeSortimentSuche(fn) { beiSortiment = fn; }

/**
 * DIE MASTEN DES AKTIVEN TRAGWERKS - und wer sonst noch an ihnen haengt.
 *
 * Seit dem Mastenumbau ist der Mast das Grundelement: ein Mast, den sich
 * zwei Tragwerke teilen, ist EINER. Das ist der Gewinn und die Falle
 * zugleich - wer sein Profil aendert, aendert es fuer beide.
 *
 * >>> ALSO MUSS ES DASTEHEN. <<<
 *
 * Eine Aenderung, die woanders wirkt, ohne dass man es sieht, ist die
 * unangenehmste Art von Verhalten. Die Zeile «traegt auch J90 - 20.00 m»
 * kostet nichts und beantwortet die Frage, bevor sie entsteht.
 */
export function mastenUebersichtHtml(werte) {
  /*
   * SEIT DEN KACHELN SPRICHT SIE VOM ANGEWAEHLTEN MASTEN.
   *
   * Die Liste aller Masten steht oben in der Kachelreihe - sie hier ein
   * zweites Mal aufzuzaehlen hiesse, dieselbe Anordnung zweimal zu lesen.
   * Was die Kachel nicht sagen kann, weil dort kein Platz dafuer ist, steht
   * hier: WELCHEM Masten die Felder darunter gerade gelten, und was eine
   * Aenderung an ihm sonst noch trifft.
   */
  const m = gewaehlterMast(werte);
  if (!m) return '';
  const alleTw = tragwerkeSortiert(werte);
  const traegt = (m.traegt ?? []).map((id) => alleTw.find((x) => x.id === id))
    .filter(Boolean).map(tragwerkName);
  const nr = mastenVon(werte).findIndex((x) => x.id === m.id) + 1;
  return `<div class="masten-uebersicht">
    <div class="mast-zeile${traegt.length > 1 ? ' geteilt' : ''}">
      <span class="mast-ende">M${nr}</span>
      <span class="mast-lage">x ${m.x.toFixed(2)} m</span>
      <span class="mast-prof">${esc(m.profil ?? '–')}</span>
      ${traegt.length
        ? `<span class="mast-teilt">trägt ${traegt.map(esc).join(' und ')}</span>`
        : ''}
    </div>
    ${traegt.length > 1
      ? '<p class="mast-warn">Ein geteilter Mast gehört beiden Tragwerken — '
        + 'was hier geändert wird, gilt auch drüben. Die Anschlusshöhe '
        + 'nicht: sie beschreibt, wie hoch das jeweilige Joch anschliesst, '
        + 'und steht deshalb bei jedem Tragwerk für sich.</p>' : ''}
  </div>`;
}

/**
 * AUSWERTUNG EINES EINZELMASTEN.
 *
 * Nicht die Jochuebersicht mit abgeschalteten Teilen, sondern eine eigene,
 * kurze Seite. Die Jochuebersicht spricht von Gurten, Blechen, Stationen und
 * Auflagern - beim Einzelmast gaebe das eine Seite voller Leerstellen, und
 * jede einzelne muesste erklaeren, warum sie leer ist.
 *
 * Gezeigt wird, was es gibt: das Urteil, die Hinweise, und das Mastblatt mit
 * den Schnittgroessen ueber die Hoehe - dieselbe Tabelle, die beim Joch unter
 * den Auflagerreaktionen steht.
 */
export function zeichneEinzelmast(node, letzte) {
  const { erg, hinw = [] } = letzte;
  const mn = erg?.mast;
  const e = erg?.max?.etaGesamt ?? 0;
  /*
   * DIE STABILITAET IST NICHT GEFUEHRT, also ist eta kein volles Urteil.
   *
   * Dieselbe Regel wie beim Joch: die Zahl steht da, sie ist gerechnet und
   * richtig - aber «Tragsicherheit erfuellt» darf nicht danebenstehen, wenn
   * ein Nachweis fehlt, der das entscheidet. Bei einem schlanken Kragmast
   * kann das Knicken massgebend werden.
   */
  /*
   * DER SATZ DARUNTER STAND SEIT DEM 2. SEPTEMBER FALSCH DA.
   *
   * «Stabilitaet nicht gefuehrt» war richtig, solange sie es nicht war -
   * seit dem Biegeknicknachweis (core.mast.js, mastStabilitaet) ist sie
   * gefuehrt, und der Satz behauptete eine Luecke, die es nicht mehr gibt.
   * Ein stehengebliebener Vorbehalt ist so irrefuehrend wie ein fehlender.
   *
   * Genannt wird jetzt, WAS massgebend war - Querschnitt oder Knicken. Das
   * Biegedrillknicken bleibt ausdruecklich aussen vor (chi_LT = 1.0); es
   * steht im Nachweisbericht, nicht in dieser Zeile.
   */
  const knickt = (mn?.stabil?.eta ?? 0) > (mn?.eta ?? 0);
  const stufe = e > 1 ? 'fail' : 'ok';
  const kopf = `<div class="urteil ${stufe}">
      <div class="urteil-eta">η ${f3(e)}</div>
      <div class="urteil-text">${e > 1
        ? 'Nachweis nicht erfüllt'
        : `Tragsicherheit erfüllt · ${knickt
            ? 'Biegeknicken massgebend' : 'Querschnitt massgebend'}`}</div>
    </div>`;

  const hinweise = hinw.length
    ? `<details class="klapp" open><summary>Hinweise zur Gültigkeit
         <span class="zahl">${hinw.length}</span></summary>
       <ul class="hinweisliste">${hinw.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
       </details>`
    : '';

  node.innerHTML = kopf + hinweise
    + (mn ? mastblattHtml(erg)
          : '<p class="leer">Kein Mast im Modell — bitte ein Mastprofil wählen.</p>');
}

export function zeichneUebersicht(node, erg, urteil, beiSprung, aktiveStation, hinweise = []) {
  const m = erg.modell, x = erg.extrem;
  const e = erg.max.etaGesamt;
  /*
   * OHNE DEN TRAGWERKSNACHWEIS IST η KEIN URTEIL MEHR.
   *
   * Die Zahl steht weiterhin da - sie ist gerechnet und richtig -, aber
   * «Tragsicherheit erfüllt» darf nicht danebenstehen, wenn der Nachweis, der
   * das entscheidet, gar nicht geführt wird. Dann sagt die Zeile genau das.
   */
  const gefuehrt = urteil.tragwerkGefuehrt !== false;
  const offeneNw = urteil.nichtGefuehrt?.length ?? 0;
  /*
   * DIE FARBE FOLGT DER TRAGSICHERHEIT, nicht jeder Konstruktionsregel.
   *
   * Weisung: «hier sollte alles grün sein, die Verletzung ist nicht so
   * relevant». Vorher machte JEDE verletzte Prüfung das Urteil rot - eine
   * Klemme zehn Zentimeter neben ihrem Platz sah aus wie ein überschrittener
   * Nachweis. Wer das ein paarmal sieht, liest die Farbe nicht mehr.
   *
   * Rot bleibt, was rot gehört: η > 1, und eine verletzte Prüfung, die η
   * selbst hinfällig macht - die Querschnittsklasse. Alles andere steht
   * weiterhin in der Zeile («1 Prüfung(en) verletzt») und in der Liste
   * darunter, die sich von selbst aufklappt und ihre Zeile rot führt.
   * Gemeldet wird also gleich viel, geschrien wird weniger.
   */
  /*
   * DER MAST ZAEHLT MIT - seit dem 28. August.
   *
   * >>> Die ZAHL bleibt die des Jochs; das URTEIL nicht. <<<
   * η ist die Ausnutzung des Jochquerschnitts, und das soll sie bleiben -
   * eine gemeinsame Zahl aus Joch und Mast sagte nicht mehr, WAS sie
   * ausnutzt. «Tragsicherheit erfüllt» darf aber nicht danebenstehen, wenn
   * ein GEFUEHRTER Nachweis überschritten ist. Der Mast steht deshalb in der
   * Farbe und in der Zeile, nicht in der Zahl.
   */
  /*
   * FUER DAS URTEIL ZAEHLT DER NACHWEIS, nicht der Querschnitt allein.
   *
   * Seit dem 2. September wird auch die Stabilitaet gefuehrt. `eta` bleibt
   * der Querschnitt - daran haengen Farbskala und Verlauf -, aber ob das
   * Bauteil haelt, entscheidet der groessere der beiden Werte.
   */
  const mastEta = (erg.mast && urteil.nachweise?.mast !== false)
    ? (erg.mast.etaNachweis ?? erg.mast.eta) : null;
  const mastUeber = mastEta !== null && mastEta > 1;
  const zustand = !gefuehrt ? 'warn'
    : (e > 1 || mastUeber || urteil.bindendVerletzt === true ? 'nok' : 'ok');

  // Jede Kachel kennt die Stelle, an der ihr Wert auftritt - ein Klick fährt
  // das Modell dorthin.
  const bei = (k) => ({ x: k.x, station: k.i });
  const kz = [
    kachel('η Obergurt', f3(erg.max.etaOG.og.eta), m.profOG.name,
           ampel(erg.max.etaOG.og.eta), bei(erg.max.etaOG)),
    kachel('η Untergurt', f3(erg.max.etaUG.ug.eta), m.profUG.name,
           ampel(erg.max.etaUG.ug.eta), bei(erg.max.etaUG)),
    kachel('η Bindeblech', f3(erg.max.etaB.etaB), 'massgebende Ebene',
           ampel(erg.max.etaB.etaB), bei(erg.max.etaB)),
  ];
  /*
   * DER MAST BEKOMMT SEINE EIGENE KACHEL (Weisung, 28. August: «in der
   * Sidebar einen zusätzlichen Button für die Ausnutzung aufnehmen»).
   *
   * >>> SIE STEHT NEBEN DEN JOCHKACHELN, NICHT DARIN. <<<
   * η des Jochs bleibt η des Jochs; der Mast ist ein anderes Bauteil mit
   * einem anderen Nachweis. Sie zusammenzuziehen hiesse, eine Zahl zu
   * bilden, die nirgends mehr sagt, WAS sie ausnutzt.
   *
   * Nur wenn der Nachweis auch geführt wird: die Gruppe lässt sich
   * abschalten, und dann hat hier keine Zahl zu stehen.
   */
  if (erg.mast && urteil.nachweise?.mast !== false) {
    /*
     * >>> BEIDE MASTEN, NICHT NUR DER MASSGEBENDE. <<<
     *
     * Weisung vom 2. September: «beide masten in die nachweise aufnehmen
     * nicht nur den massgebenden».
     *
     * Hier stand EINE Kachel mit dem groesseren der beiden eta. Das
     * beantwortet «haelt es?», aber nicht «wie weit ist der andere?» - und
     * genau das ist die Frage, mit der man ein Sortiment waehlt. Zwei
     * Masten, die gemeinsam ein Joch tragen, sind zwei Bauteile mit zwei
     * Nachweisen; einer davon zu verschweigen macht die Auswertung kuerzer,
     * nicht besser.
     *
     * Sie stehen unter ihrem NAMEN da (M1, M2), nicht unter «Ende A/B» -
     * auf einer Jochreihe ist das der Unterschied zwischen einem Bauteil mit
     * einem Namen und einem mit zweien.
     *
     * SIND BEIDE DERSELBE MAST - ein Joch ohne abweichendes Ende B rechnet
     * zweimal dasselbe -, steht er einmal da. Zwei gleiche Kacheln
     * nebeneinander waeren keine Auskunft, sondern ein Verdacht.
     */
    const namen = erg.modell.federn?.namen ?? {};
    const gesehen = new Set();
    ['A', 'B'].forEach((ende) => {
      const n = erg.mast[ende];
      if (!n) return;
      const name = namen[ende] || `Ende ${ende}`;
      if (gesehen.has(name)) return;
      gesehen.add(name);
      const eN = n.etaMitStabilitaet ?? n.eta;
      // Die Kachel nennt, WAS massgebend ist - Querschnitt oder Knicken.
      // Ohne das stuende dort eine Zahl, deren Herkunft man raten muesste.
      const wodurch = (n.stabil?.eta ?? 0) > n.eta
        ? 'Knicken' : (n.plastischWirksam ? 'plastisch' : 'elastisch');
      kz.push(kachel(`η ${name}`, f3(eN),
        `${n.profil.name} · ${wodurch}`, ampel(eN)));
    });
  }
  // Schnittgrössen sind kein Nachweis - sie stehen in einem eigenen Block.
  // h/b und f_y/γ_M0 sind Eingaben und stehen in der Fussleiste bzw. bei den
  // Profilen; als «Kennzahl» hatten sie hier nichts verloren.
  const sg = [
    kachel('max M_y', f2(x.MyMax), `kNm · x=${f2(x.xMyMax)}`, '', { x: x.xMyMax }),
    kachel('max V_z', f2(x.VzMax), `kN · x=${f2(x.xVzMax)}`, '', { x: x.xVzMax }),
    kachel('max M_z', f2(x.MzMax), `kNm · x=${f2(x.xMzMax)}`, '', { x: x.xMzMax }),
    kachel('max V_y', f2(x.VyMax), `kN · x=${f2(x.xVyMax)}`, '', { x: x.xVyMax }),
    kachel('max T_x', f3(x.TxMax), `kNm · x=${f2(x.xTxMax)}`, '', { x: x.xTxMax }),
    // Die Normalkraft in Jochachse (Leiterzug, Wind in x) wird im Nachweis
    // längst mitgerechnet - flächenproportional als N_ax in jedem Winkel -,
    // stand hier aber nicht. Ohne sie fehlte der Schnittgrössenliste eine
    // der sechs Grössen, und man konnte nicht sehen, ob sie null ist.
    kachel('max N_x', f2(x.NxMax), `kN · x=${f2(x.xNxMax)}`, '', { x: x.xNxMax }),
    kachel('M_A', f2(m.MA), `kNm · κ=${f3(m.kappaA)}`, '', { x: 0, station: 0 }),
    kachel('R_A', f2(m.RA), 'kN', '', { x: 0, station: 0 }),
  ];

  const stellen = erg.knoten
    .map((k) => ({
      i: k.i, x: k.x, eta: k.eta,
      teil: k.etaEcken >= k.etaBleche
        ? k.massgebendeEcke.label : (k.massgebendeEbene.label ?? '–'),
      etaEcken: k.etaEcken, etaBleche: k.etaBleche,
    }))
    .sort((a, b) => b.eta - a.eta).slice(0, 12);

  node.innerHTML = `
    <div class="urteil ${zustand}">
      <span class="urteil-zahl">η ${f3(e)}</span>
      <span>${!gefuehrt
        ? 'Jochtragwerk NICHT geführt — η ist kein Urteil'
        : (e <= 1
            ? (mastUeber
                ? `Joch erfüllt, MAST NICHT (η ${f3(mastEta)})`
                : 'Tragsicherheit erfüllt')
            : 'Tragsicherheit NICHT erfüllt')}${
        urteil.alleOk ? '' : ` · ${urteil.anzahlVerletzt} Prüfung(en) verletzt`}${
        offeneNw ? ` · ${offeneNw} Nachweis(e) nicht geführt` : ''}</span>
      ${e > 1 && beiSortiment ? `<button class="btn btn-mini" data-sortiment
         type="button" title="Alle Typen des Sortiments mit dieser Geometrie und
diesen Lasten durchrechnen. Der Typ wird dabei NICHT gewechselt."
         >Sortiment durchrechnen</button>` : ''}
    </div>
    ${hinweise.length ? klapp('uebersicht-hinweise', 'Hinweise zur Gültigkeit',
        `<div class="hinweisliste">${hinweise.map((h) =>
          `<p class="notiz">${esc(h)}</p>`).join('')}</div>`,
        hinweise.length === 1 ? '1 Hinweis' : `${hinweise.length} Hinweise`) : ''}
    ${pruefungenHtml(urteil)}
    ${abschnitt('Nachweise')}
    <div class="kennzahlen">${kz.join('')}</div>
    ${nichtGefuehrtHtml(urteil)}
    ${klapp('uebersicht-schnittgroessen', 'Schnittgrössen',
            `<div class="kennzahlen">${sg.join('')}</div>`,
            `max M_y ${f2(x.MyMax)} kNm`)}
    ${abschnitt('Höchstbeanspruchte Stellen', 'anklicken zum Heranzoomen')}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>#</th><th class="num">x [m]</th><th>massgebend</th>
        <th class="num">η Profil</th><th class="num">η Blech</th><th class="num">η</th></tr></thead>
      <tbody>${stellen.map((s) => `
        <tr class="klick${s.i === aktiveStation ? ' aktiv' : ''}" data-station="${s.i}" data-x="${s.x}">
          <td>${s.i}</td><td class="num">${f2(s.x)}</td><td>${esc(s.teil)}</td>
          <td class="num">${f3(s.etaEcken)}</td><td class="num">${f3(s.etaBleche)}</td>
          <td class="num stark ${ampel(s.eta)}">${f3(s.eta)}</td>
        </tr>`).join('')}</tbody>
    </table></div>
`;

  node.querySelectorAll('[data-station]').forEach((tr) => {
    tr.addEventListener('click', () =>
      beiSprung(+tr.dataset.station, parseFloat(tr.dataset.x)));
  });
  // Kennzahlkacheln: Klick fährt das Modell an die Stelle des Wertes
  node.querySelectorAll('[data-kz-x]').forEach((k) => {
    k.addEventListener('click', () => {
      const xk = parseFloat(k.dataset.kzX);
      const st = k.dataset.kzStation === '' ? null : +k.dataset.kzStation;
      beiSprung(st, xk);
    });
  });
  const so = node.querySelector('[data-sortiment]');
  if (so && beiSortiment) so.addEventListener('click', () => beiSortiment());
  verdrahteKlapp(node);
}

/**
 * Woraus sich die Querkraft einer Blechebene zusammensetzt.
 * Der örtliche Anteil aus der Lasteinleitung der Anbauteile steht nur da,
 * wo er auftritt - sonst wäre die Kachel voller Nullen.
 */
function ebenenAnteile(e) {
  const t = [`${f2(e.anteilBalken)} Balken`, `${f2(e.anteilTorsion)} Torsion`];
  if (e.anteilLokal > 0) t.push(`${f2(e.anteilLokal)} Anbauteil`);
  return t.join(' + ') + ' kN';
}

/** Schnittauswertung: je Eckwinkel und je Blechebene. */
export function zeichneSchnitt(node, erg, beiSchnitt, beiOrientierung, beiAktiv) {
  const sn = erg.schnitt, m = erg.modell, q = sn.q;
  const orient = m.schnittOrientierung ?? 'quer';
  const aktiv = m.schnittAktiv === true;
  const oBeschr = SCHNITT_ORIENTIERUNGEN.find((o) => o.key === orient)?.beschreibung ?? '';

  const zeileEcke = (e) => `
    <tr class="${e.eta > 1 ? 'nok' : ''}">
      <td>${esc(e.label)}<br><span class="ablage-meta">${esc(e.profil)}</span></td>
      <td class="num">${f2(e.N_My)}</td><td class="num">${f2(e.N_Mz)}</td>
      <td class="num stark">${f2(e.N)} <span class="ablage-meta">${esc(e.art)}</span></td>
      <td class="num">${f1(e.sig_N)}</td><td class="num">${f1(e.sig_My)}</td>
      <td class="num">${f1(e.sig_Mz)}</td><td class="num stark">${f1(e.sig_v)}</td>
      <td class="num ${ampel(e.eta)}">${f3(e.eta)}</td>
    </tr>`;

  const zeileEbene = (e, seite) => e.blechFehlt ? `
    <tr><td>${esc(seite)}</td><td>${esc(e.label)}</td>
      <td colspan="8" class="ablage-meta">kein Blech (Gabel am Jochende)</td></tr>` : `
    <tr class="${e.eta > 1 ? 'nok' : ''}">
      <td class="ablage-meta">${esc(seite)}</td>
      <td>${esc(e.label)}<br><span class="ablage-meta">Pos ${esc(e.pos)}</span></td>
      <td class="num">${f0(e.breite)}×${f0(e.dicke)}${e.laenge ? '×' + f0(e.laenge) : ''}</td>
      <td class="num">${f2(e.V_Ebene)}</td>
      <td class="num">${f3(e.M_Knoten)}</td><td class="num stark">${f3(e.M)}</td>
      <td class="num">${f2(e.V)}</td><td class="num">${f1(e.sig)}</td>
      <td class="num">${f1(e.tau)}</td><td class="num stark">${f1(e.sig_v)}</td>
      <td class="num ${ampel(e.eta)}">${f3(e.eta)}</td>
    </tr>`;

  /*
   * DER STEUERBLOCK BLEIBT STEHEN.
   *
   * Jede Bedienung hier rechnet neu, und das Rechnen zeichnet dieses Blatt
   * neu - der Knoten, den man gerade bedient, wurde dabei unter der Hand
   * ersetzt. An der Auswahlliste sah man das im Edge als Aufblinken; am
   * Schieber riss es den Zug ab, sobald die erste Rechnung durch war.
   *
   * Deshalb zwei Teile: oben die Bedienung, die stehen bleibt, unten die
   * Zahlen, die sich bei jeder Rechnung erneuern. Neu gebaut wird die
   * Bedienung nur, wenn sich ihre STRUKTUR ändert - die Zahl der Felder
   * (Schieberende) oder die Liste der Orientierungen. Dieselbe Regel wie bei
   * der Eingabemaske (maskenSignatur) und beim Lastfall-Wähler.
   */
  const erklaerungHtml = () => `
      <p class="notiz" style="margin-top:0">${esc(oBeschr)}</p>
      <p class="notiz">Der Schnitt liegt immer <b>mittig zwischen zwei Bindeblechen</b>
        (hier ${f2(sn.feldVon)} … ${f2(sn.feldBis)} m). Nur dort schneidet man die Gurte
        im Feld und nicht durch einen Rahmenknoten, erst so lassen sich die
        Schnittkräfte je Gurt eindeutig angeben. Massgebendes Blech an der Station
        x = ${f2(sn.stationX)} m · Bleche
        ${m.blechQuelle === 'datenbank' ? 'aus Typendatenbank' : 'manuell'}.</p>`;

  const steuerHtml = `
    ${abschnitt('Lage des Schnitts',
      `<span id="schnitt-feldmeta">Feld ${sn.feld + 1} von ${sn.anzahlSchnitte}</span>`)}
    <label class="schalter schnitt-an"><input type="checkbox" id="schnitt-aktiv"
      ${aktiv ? 'checked' : ''}><span>Schnitt im Modell zeigen</span></label>
    <div class="schnitt-steuer">
      <button class="btn btn-mini" data-schnitt="-1" title="ein Feld nach links">◀</button>
      <input type="range" id="schnitt-schieber" min="0" max="${sn.anzahlSchnitte - 1}"
             step="1" value="${sn.feld}">
      <button class="btn btn-mini" data-schnitt="+1" title="ein Feld nach rechts">▶</button>
      <span class="viewer-marke" id="schnitt-x">x = ${f2(sn.x)} m</span>
    </div>
    <div class="feld"><label for="schnitt-orient">Orientierung im Modell</label>
      <select id="schnitt-orient">${SCHNITT_ORIENTIERUNGEN.map((o) =>
        `<option value="${esc(o.key)}"${o.key === orient ? ' selected' : ''}
          >${esc(o.label)}</option>`).join('')}</select></div>
    ${klapp('schnitt-erklaerung', 'Warum hier geschnitten wird',
      `<div id="schnitt-erklaerung-text">${erklaerungHtml()}</div>`)}`;

  const zahlenHtml = `
    <div class="kennzahlen">
      ${kachel('M_y,ed', f2(sn.My), 'kNm')}
      ${kachel('V_z,ed', f2(sn.Vz), 'kN')}
      ${kachel('M_z,ed', f2(sn.Mz), 'kNm')}
      ${kachel('V_y,ed', f2(sn.Vy), 'kN')}
      ${kachel('T_x,ed', f3(sn.Tx), 'kNm')}
      ${kachel('N_x,ed', f2(sn.Nx), 'kN · ganzer Querschnitt')}
      ${kachel('q_T', f2(q.schubfluss.qT), 'kN/m')}
      ${kachel('V Vertikalebene', f2(q.vertikal.max), ebenenAnteile(q.vertikal))}
      ${kachel('V Horizontalebene', f2(q.horizontal.max), ebenenAnteile(q.horizontal))}
    </div>

    ${klapp('schnitt-ecken', 'Eckwinkel', `
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Profil</th><th class="num">N(M_y)</th><th class="num">N(M_z)</th>
        <th class="num">N</th><th class="num">σ_N</th><th class="num">σ_My</th>
        <th class="num">σ_Mz</th><th class="num">σ_v</th><th class="num">η</th></tr></thead>
      <tbody>${sn.ecken.map(zeileEcke).join('')}</tbody></table></div>
    <p class="notiz">Die Spalte <b>N</b> ist die Summe aus N(M_y), N(M_z) und dem
      Anteil der Jochnormalkraft N_x,ed = ${f2(sn.Nx)} kN, der nach Winkelfläche
      aufgeteilt wird (bei vier gleichen Winkeln also ${f2(sn.Nx / 4)} kN je Winkel).</p>
    <p class="notiz">M_y,L,lokal = ${f3(sn.My_lokal)} kNm ·
      M_z,L,lokal = ${f3(sn.Mz_lokal)} kNm (in allen Winkeln gleich)<br>
      Am Knoten wären es ${f3(sn.My_Knoten)} bzw. ${f3(sn.Mz_Knoten)} kNm.
      Über die Blechbreite ist die Verbindung biegesteif; nachgewiesen wird der
      Gurt am <b>Anschnitt</b> des Blechs, also mit
      (a₁ − b_Bl)/a₁ = ${f3(sn.anschnittMy)} bzw. ${f3(sn.anschnittMz)}.</p>`,
      `max η ${f3(Math.max(...sn.ecken.map((e) => e.eta)))}`, true)}

    ${klapp('schnitt-bleche', 'Bindebleche', `
    <p class="notiz" style="margin-top:0">Beide Nachbarbleche des Feldes.</p>
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Blech</th><th>Ebene</th><th class="num">b×t×L</th>
        <th class="num">V_Eb</th><th class="num">M_Kn</th><th class="num">M_Rd</th>
        <th class="num">V_Bl</th><th class="num">σ</th>
        <th class="num">τ</th><th class="num">σ_v</th><th class="num">η</th></tr></thead>
      <tbody>
        ${(sn.nachbarn?.links?.ebenen ?? sn.ebenen).map((e) =>
            zeileEbene(e, `x=${f2(sn.nachbarn?.links?.stationX ?? sn.stationX)}`)).join('')}
        ${(sn.nachbarn?.rechts?.ebenen ?? []).map((e) =>
            zeileEbene(e, `x=${f2(sn.nachbarn?.rechts?.stationX ?? 0)}`)).join('')}
      </tbody></table></div>
    <p class="notiz">
      <b>M_Kn</b> ist das Moment auf der Schwerachse, <b>M_Rd</b> das massgebende
      am <b>Anschnitt des Gurtes</b>. Im Überlappungsbereich ist das Blech mit dem
      Gurt verschweisst und wirkt biegesteif; nachgewiesen wird deshalb erst am
      Rand dieses Bereichs. Bei der lichten Blechlänge
      ${f0((sn.nachbarn?.links?.ebenen ?? sn.ebenen).find((e) => !e.blechFehlt)?.lichteLaenge * 1000)} mm
      gegenüber dem Hebelarm
      ${f0((sn.nachbarn?.links?.ebenen ?? sn.ebenen).find((e) => !e.blechFehlt)?.hebelarm * 1000)} mm
      ergibt das eine Abminderung auf
      ${f2(((sn.nachbarn?.links?.ebenen ?? sn.ebenen).find((e) => !e.blechFehlt)?.abminderung ?? 1) * 100)} %.
      Die Querkraft V_Bl bleibt davon unberührt.</p>`,
      `max η ${f3(Math.max(...(sn.nachbarn?.links?.ebenen ?? sn.ebenen)
        .filter((e) => !e.blechFehlt).map((e) => e.eta)))}`, true)}`;

  const sig = JSON.stringify([sn.anzahlSchnitte,
                              SCHNITT_ORIENTIERUNGEN.map((o) => o.key)]);
  let st = node.querySelector('#schnitt-steuerung');

  if (!st || st.dataset.sig !== sig) {
    node.innerHTML =
      `<div id="schnitt-steuerung">${steuerHtml}</div>
       <div id="schnitt-zahlen">${zahlenHtml}</div>`;
    st = node.querySelector('#schnitt-steuerung');
    st.dataset.sig = sig;

    // Verdrahtet wird nur beim Aufbau - die Knoten bleiben ja jetzt stehen.
    const s = st.querySelector('#schnitt-schieber');
    if (s && beiSchnitt) {
      s.addEventListener('input', () => beiSchnitt(+s.value));
      st.querySelectorAll('[data-schnitt]').forEach((b) => {
        b.addEventListener('click', () =>
          beiSchnitt(Math.max(0, Math.min(+s.max, +s.value + (+b.dataset.schnitt)))));
      });
    }
    const o = st.querySelector('#schnitt-orient');
    if (o && beiOrientierung) o.addEventListener('change', () => beiOrientierung(o.value));
    const a = st.querySelector('#schnitt-aktiv');
    if (a && beiAktiv) a.addEventListener('change', () => beiAktiv(a.checked));
  } else {
    node.querySelector('#schnitt-zahlen').innerHTML = zahlenHtml;

    // Nachziehen, was sich an der stehenden Bedienung geändert hat. Nur bei
    // Abweichung: einem Feld seinen eigenen Wert zurückzuschreiben setzt in
    // manchen Browsern den Textcursor an den Anfang.
    const setze = (wahl, feld, wert) => {
      const e = st.querySelector(wahl);
      if (e && e[feld] !== wert) e[feld] = wert;
    };
    setze('#schnitt-feldmeta', 'textContent',
          `Feld ${sn.feld + 1} von ${sn.anzahlSchnitte}`);
    setze('#schnitt-aktiv', 'checked', aktiv);
    setze('#schnitt-schieber', 'value', String(sn.feld));
    setze('#schnitt-x', 'textContent', `x = ${f2(sn.x)} m`);
    setze('#schnitt-orient', 'value', orient);
    const erk = st.querySelector('#schnitt-erklaerung-text');
    if (erk) erk.innerHTML = erklaerungHtml();
  }

  verdrahteKlapp(node);
}

/**
 * Kompakte Querschnittsklassen-Marke für die Profil-Sidebar.
 * Die ausführliche Herleitung öffnet sich per Knopf im Überlagerungsfenster.
 */
export function qskMarke(kl) {
  const stufe = (k) => (k <= 2 ? 'ok' : k === 3 ? 'warn' : 'fail');
  return `<div class="qsk">
    <span class="qsk-t">QSK</span>
    ${kl.teile.map((t) => `<span class="pl pl-${stufe(t.klasse)}"
        title="${esc(t.rolle)} ${esc(t.bauteil)} – massgebend ${esc(t.massgebend ?? '')}">
        ${esc(t.rolle.slice(0, 2))} ${t.klasse}</span>`).join('')}
    <button class="btn btn-mini" data-qsk type="button">Berechnung</button>
  </div>`;
}

/** Ausführliche Klassifizierung, für das Überlagerungsfenster. */
export function klassenTabelle(kl) {
  const stufe = (k) => (k <= 2 ? 'ok' : k === 3 ? 'warn' : 'fail');
  const g = kl.teile[0].grenzen;
  return `
    <p class="notiz">ε = ${f3(kl.eps)} · Grenzen auskragender Teile:
      Klasse 1 ≤ ${f2(g.k1)} · Klasse 2 ≤ ${f2(g.k2)} · Klasse 3 ≤ ${f2(g.k3)}.
      Für Winkel unter Druck gilt zusätzlich h/t ≤ 15·ε und (b+h)/(2t) ≤ 11.5·ε;
      massgebend ist die ungünstigere Betrachtung.</p>
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Bauteil</th><th>Kriterium</th><th class="num">c/t</th>
        <th class="num">Grenze</th><th class="num">Klasse</th><th class="num">total</th></tr></thead>
      <tbody>${kl.teile.map((t) => `
        <tr>
          <td>${esc(t.rolle)}<br><span class="ablage-meta">${esc(t.bauteil)}</span></td>
          <td>${t.kriterien.map((k) => esc(k.id)).join('<br>')}</td>
          <td class="num">${t.kriterien.map((k) => f2(k.ct)).join('<br>')}</td>
          <td class="num">${t.kriterien.map((k) => f2(k.grenze)).join('<br>')}</td>
          <td class="num">${t.kriterien.map((k) => plakette('K' + k.klasse, stufe(k.klasse))).join('<br>')}</td>
          <td class="num">${plakette('Klasse ' + t.klasse, stufe(t.klasse))}</td>
        </tr>`).join('')}</tbody></table></div>
    <div class="infobox">${esc(kl.hinweis)}</div>`;
}

/**
 * Ein Diagramm mit Knopf zum Vergrössern.
 *
 * Vergrössert wird nicht in ein Modalfenster, sondern in das MODELLFENSTER:
 * dort ist die breiteste Fläche, sie lässt sich am Splitter weiter aufziehen,
 * Eingabe und Tabellen bleiben daneben sichtbar - und die Kurve bleibt live,
 * zieht also beim Ändern einer Eingabe mit. Ein Modal deckt genau das zu, was
 * man beim Lesen einer Kurve danebenhaben will.
 */
/**
 * Ein Diagrammblock.
 *
 * DAS GANZE BILD IST DER KNOPF. Ein Klick irgendwo ins Diagramm holt es ins
 * Modellfenster - das ist die Bewegung, die man ohnehin machen will, und sie
 * braucht kein Zielen auf ein Symbol von zwölf Pixeln. Der Knopf oben rechts
 * bleibt trotzdem stehen: er sagt, DASS das geht.
 *
 * Darunter hängt ein leerer Platz für das Kraftbild einer Kurve - siehe
 * render.skizzen.js. Er füllt sich erst auf Klick in die Legende.
 */
function diagrammBlock(id, titel, svg) {
  return abschnitt(titel,
    `<button class="btn btn-mini" data-gross="${esc(id)}"
      title="Im Modellfenster gross zeigen">${icon('aufziehen', 15)}</button>`) +
    `<div class="dia" data-dia="${esc(id)}" title="anklicken: gross im Modellfenster">${svg}</div>
     <div class="dia-skizze" data-skizze-fuer="${esc(id)}" hidden></div>`;
}

/** Knöpfe zum Vergrössern verdrahten. */
let beiDiagrammGross = null;
export function setzeDiagrammBuehne(fn) { beiDiagrammGross = fn; }

/** Das zuletzt geöffnete Kraftbild je Diagramm - überlebt das Neuzeichnen. */
const SKIZZE_OFFEN = new Map();

function zeigeSkizze(node, id, key) {
  const ziel = node.querySelector(`[data-skizze-fuer="${CSS.escape(id)}"]`);
  if (!ziel) return;
  const s = key ? skizzeFuer(key) : null;
  if (!s) { ziel.hidden = true; ziel.innerHTML = ''; SKIZZE_OFFEN.delete(id); return; }
  SKIZZE_OFFEN.set(id, key);
  ziel.hidden = false;
  ziel.innerHTML = `${s.svg}<div class="dia-skizze-t">${esc(s.text)}</div>`
    + '<button class="btn btn-mini dia-skizze-zu" type="button">schliessen</button>';
  ziel.querySelector('.dia-skizze-zu').onclick = () => zeigeSkizze(node, id, null);
}

function verdrahteDiagramme(node) {
  node.querySelectorAll('[data-gross]').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); beiDiagrammGross?.(b.dataset.gross); };
  });
  node.querySelectorAll('.dia[data-dia]').forEach((d) => {
    const id = d.dataset.dia;
    d.onclick = (e) => {
      // Ein Klick auf einen Legendeneintrag zeigt das Kraftbild, jeder andere
      // holt das Diagramm ins Modellfenster.
      const eintrag = e.target.closest('.legende-eintrag');
      if (eintrag) {
        const key = eintrag.dataset.skizze;
        zeigeSkizze(node, id, SKIZZE_OFFEN.get(id) === key ? null : key);
        return;
      }
      beiDiagrammGross?.(id);
    };
    if (SKIZZE_OFFEN.has(id)) zeigeSkizze(node, id, SKIZZE_OFFEN.get(id));
  });
}

/** Verläufe: Diagramme und der Massvarianten-Vergleich. */
export function zeichneVerlauf(node, dia, vergleich) {
  node.innerHTML = `
    ${diagrammBlock('schnittgroessen', 'Schnittgrössen', dia.schnittgroessen)}
    ${diagrammBlock('ebene', 'Ebenenquerkräfte', dia.ebene)}
    ${diagrammBlock('ausnutzung', 'Ausnutzung', dia.ausnutzung)}
    ${klapp('verlauf-massvarianten', 'Einfluss der Hebelarm-Definition', `
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Variante</th><th class="num">h</th><th class="num">b</th>
        <th class="num">η OG</th><th class="num">η UG</th><th class="num">η Blech</th>
        <th class="num">η max</th><th class="num">Δ</th></tr></thead>
      <tbody>${vergleich.zeilen.map((z) => `
        <tr class="${z.istGewaehlt ? 'aktiv' : ''}">
          <td>${esc(z.kurz)}</td>
          <td class="num">${f0(z.hT * 1000)}</td><td class="num">${f0(z.bT * 1000)}</td>
          <td class="num">${f3(z.etaOG)}</td><td class="num">${f3(z.etaUG)}</td>
          <td class="num">${f3(z.etaB)}</td><td class="num stark">${f3(z.eta)}</td>
          <td class="num">${z.istGewaehlt ? '–'
            : (z.abweichung >= 0 ? '+' : '') + f1(z.abweichung) + '%'}</td>
        </tr>`).join('')}</tbody></table></div>
    <ul class="hinweis" style="padding-left:16px">${MASSVARIANTEN.map((v) =>
      `<li><b>${esc(v.kurz)}</b> — ${esc(v.beschreibung)}</li>`).join('')}</ul>`,
      `gewählt: ${esc(vergleich.zeilen.find((z) => z.istGewaehlt)?.kurz ?? '')}`)}`;
  verdrahteDiagramme(node);
  verdrahteKlapp(node);
}

/**
 * Reaktionskräfte für den Fundament- und Mastplaner.
 *
 * CHARAKTERISTISCH und nach Einwirkungsgruppen getrennt - ohne Beiwerte, damit
 * der Empfänger nach seinem eigenen Regelwerk kombinieren kann. Aufbau und
 * Vorzeichenregel folgen dem Blatt «Zusammenfassung» des Regelwerks:
 * negative Vertikalkräfte sind abhebend.
 */
export function zeichneAuflager(node, blatt, erg) {
  const m = erg.modell;
  const zeile = (bez, z, seite, stark = false) => `
    <tr class="${stark ? 'aktiv' : ''}">
      <td>${esc(bez)}</td>
      <td class="num${stark ? ' stark' : ''}">${f2(z[seite].Fz)}</td>
      <td class="num${stark ? ' stark' : ''}">${f2(z[seite].Fy)}</td>
      <td class="num">${f2(z[seite].My)}</td>
      <td class="num">${f3(z[seite].Mx)}</td>
    </tr>`;

  const tabelle = (seite, titel) => `
    ${abschnitt(titel)}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Einwirkung</th>
        <th class="num">F_z [kN]</th><th class="num">F_y [kN]</th>
        <th class="num">M_y [kNm]</th><th class="num">M_x [kNm]</th></tr></thead>
      <tbody>
        ${blatt.zeilen.map((z) => zeile(z.label, z, seite)).join('')}
        ${zeile('Summe aller Gruppen', blatt.total, seite, true)}
      </tbody></table></div>
    <p class="notiz" style="margin:4px 0 0">Die Summenzeile addiert ALLE Gruppen,
      auch die beiden Windrichtungen. Das ist keine Lastkombination: Wind x und
      Wind y treten nicht gleichzeitig auf. Massgebend ist je Richtung eine der
      beiden Zeilen.</p>`;

  node.innerHTML = `
    ${abschnitt('Reaktionskräfte', 'charakteristisch, ohne Beiwerte')}
    <div class="kennzahlen">
      ${kachel('F_z Auflager A', f2(blatt.total.A.Fz), 'kN')}
      ${kachel('F_z Auflager B', f2(blatt.total.B.Fz), 'kN')}
      ${kachel('F_y je Auflager', f2(blatt.total.A.Fy), 'kN · quer zur Jochachse')}
      ${kachel('F_x total', f2(blatt.total.Fx), 'kN · in Jochachse')}
    </div>
    ${tabelle('A', 'Auflager A (x = 0)')}
    ${tabelle('B', `Auflager B (x = ${f2(m.L)} m)`)}
    ${klapp('auflager-hinweis', 'Achsen, Vorzeichen und was nicht enthalten ist', `
      <p class="notiz" style="margin-top:0">
        <b>F_z</b> vertikal, positiv nach unten. Negative Werte sind
        <b>abhebend</b>. <b>F_y</b> längs zum Gleis, aus Wind auf Joch und
        Anbauteile. <b>M_y</b> Moment quer zum Gleis aus der Einspannung des
        Jochendes. <b>M_x</b> Moment längs zum Gleis, also die Torsion des Jochs.</p>
      <p class="notiz"><b>F_x = ${f2(blatt.total.Fx)} kN</b> wirkt IN der Jochachse
        (Umlenkkraft aus dem Leiterzug und Wind quer zum Gleis). Wie sie sich auf
        die beiden Maste verteilt, hängt von deren Steifigkeit ab. Das ist hier
        nicht modelliert, deshalb steht nur die Summe da.</p>
      <p class="notiz">Der Wind ist in zwei Gruppen geführt: <b>Wind x</b> in
        Jochachse und <b>Wind y</b> in Gleisrichtung. Das sind zwei
        WINDRICHTUNGEN, keine gleichzeitigen Einwirkungen. Sie sind einzeln
        anzusetzen, und zwar mit beiden Vorzeichen. Die ständigen Anteile
        behalten ihre Wirkrichtung.</p>
      <p class="notiz">Die Werte sind <b>charakteristisch</b>. Die Beiwerte des
        gewählten Normensatzes sind bewusst nicht angewendet, damit die Gruppen
        einzeln kombinierbar bleiben.</p>
      <p class="notiz">Nicht enthalten: Eigengewicht und Windlast der Maste
        selbst, sowie die Gebrauchstauglichkeitsnachweise. <b>Beides steht im
        Mastnachweis darunter</b> – dort mit den Beiwerten des gewählten
        Lastfalls.</p>`)}
    ${mastblattHtml(erg)}`;
  verdrahteKlapp(node);
}

/**
 * DER MAST, STATION FÜR STATION.
 *
 * >>> Weisung, 28. August: «gut wäre es, wenn man die Spannung und die Kräfte
 * am Masten sinngemäss gleich wie beim Joch auswerten könnte». <<<
 *
 * Die Kachel oben nennt das Maximum; hier steht, WO es auftritt und woraus es
 * sich zusammensetzt. Stationen sind der Fuss, jede Anbaustelle, der
 * Jochanschluss und der Kopf — dort, wo sich die Schnittgrössen sprunghaft
 * ändern, und nur dort.
 *
 * ANDERE WERTE ALS IM BLATT DARÜBER: das Auflagerblatt ist charakteristisch
 * und gruppenweise, damit der Fundamentplaner selbst kombinieren kann. Der
 * Nachweis braucht Bemessungswerte des gewählten Lastfalls. Die Zeile darunter
 * sagt es, damit niemand die beiden Tabellen nebeneinanderlegt und sich
 * wundert.
 */
function mastblattHtml(erg) {
  const mn = erg?.mast;
  if (!mn) return '';
  const namenVon = erg?.modell?.federn?.namen ?? {};
  const ende = (n) => {
    if (!n) return '';
    const kl = n.klasse;
    const zeile = (st) => `
      <tr class="${st.z === n.massgebend.z ? 'aktiv' : ''}">
        <td class="num">${f2(st.z)}</td>
        <td class="num">${f2(st.N)}</td>
        <td class="num">${f2(st.Vq)}</td>
        <td class="num">${f2(st.Vl)}</td>
        <td class="num">${f2(st.Mq)}</td>
        <td class="num">${f2(st.Ml)}</td>
        <td class="num">${f3(st.Mt)}</td>
        <td class="num">${f0(st.sig)}</td>
        <td class="num ${st.eta > 1 ? 'fail' : ''}">${f3(st.eta)}</td>
      </tr>`;
    /*
     * DIE UEBERSCHRIFT NENNT DEN MASTEN, nicht das Jochende - und die
     * Zusammenfassung nennt BEIDE Zahlen, Querschnitt und Knicken. Bisher
     * stand dort nur der Querschnitt, waehrend das Knicken am Regelmasten
     * das groessere von beiden ist.
     */
    const name = namenVon?.[n.ende] || `Ende ${n.ende}`;
    const kS = n.stabil;
    return `${abschnitt(`Mast ${name} · ${n.profil.name}`,
        `η ${f3(n.eta)} Querschnitt bei ${f2(n.massgebend.z)} m`
        + (kS ? ` · η ${f3(kS.eta)} Knicken` : ''))}
      <div class="tabellenrahmen"><table class="dt">
        <thead><tr>
          <th class="num">z [m]</th><th class="num">N [kN]</th>
          <th class="num">V_q [kN]</th><th class="num">V_l [kN]</th>
          <th class="num">M_q [kNm]</th><th class="num">M_l [kNm]</th>
          <th class="num">M_t [kNm]</th>
          <th class="num">σ [N/mm²]</th><th class="num">η</th>
        </tr></thead>
        <tbody>${[...n.stationen].reverse().map(zeile).join('')}</tbody>
      </table></div>
      <p class="notiz" style="margin:4px 0 0">
        Querschnittsklasse <b>${kl.klasse}</b> (Flansch c/t ${f1(kl.flansch.ct)},
        Steg ${f1(kl.steg.ct)}) · Widerstand ${n.plastischWirksam
          ? `<b>plastisch</b>, W_pl aus der Profilgeometrie (${f0(n.Wq)} / ${f0(n.Wl)} cm³)`
          : `elastisch, W_el (${f0(n.Wq)} / ${f0(n.Wl)} cm³)`}${
        n.plastischGewuenscht && !n.plastischWirksam
          ? ` — <b>plastisch verlangt, aber Klasse ${kl.klasse}</b>: dort ist die
              Fliessgelenkschnittgrösse nicht erreichbar` : ''} ·
        Anteil an F_x nach k = 3EI/H³: <b>${f0(n.anteilFx * 100)} %</b></p>`;
  };
  return `${abschnitt('Mast', 'Bemessungswerte des gewählten Lastfalls')}
    ${ende(mn.A)}${ende(mn.B)}
    ${klapp('mast-hinweis', 'Achsen und was der Nachweis nicht enthält', `
      <p class="notiz" style="margin-top:0">
        <b>z</b> zählt ab Fundament. <b>q</b> ist die Ebene der Jochachse
        (Wind quer, Umlenkkraft, Einspannmoment des Jochs), <b>l</b> die Ebene
        der Gleisrichtung (Wind auf das Joch). Welche davon die starke Achse
        trifft, entscheidet die Stegrichtung.</p>
      <p class="notiz">Enthalten sind: Auflagerreaktion des Jochs,
        Einspannmoment, Jochtorsion, Wind auf den Masten über seine ganze
        Länge, Anbauteile am Masten mit ihren Ausladungen und das Eigengewicht
        des Mastes. Die Längskraft F_x des Jochs teilt sich nach der
        Steifigkeit k = 3EI/H³ auf die beiden Maste.</p>
      <p class="notiz"><b>Das Biegeknicken ist enthalten</b> — EN 1993-1-1,
        6.3.3, mit den Interaktionsbeiwerten nach Anhang B. Die Knicklänge
        ist β · z_N, wobei z_N die Höhe der obersten Krafteinleitung ist:
        über dem Jochanschluss trägt der Mast nur sein Eigengewicht, und was
        dort nicht drückt, kann dort auch nicht ausknicken. β steht in den
        Optionen (Vorgabe 2.0, Kragarm).</p>
      <p class="notiz"><b>NICHT enthalten: das Biegedrillknicken</b>
        (χ_LT = 1.0). Beim eingespannten Stiel mit Momenten um beide Achsen
        ist das die übliche Annahme; sie steht hier, damit sie nachgeprüft
        werden kann.</p>
      <p class="notiz">Die <b>Torsion M_t</b> steht in der Tabelle, geht aber
        nicht in η ein: Wölbkrafttorsion am offenen I-Profil ist ein eigenes
        Kapitel. Sie ist ausgewiesen, weil der Fundamentplaner sie braucht.</p>
      <p class="notiz">Die Werte sind <b>Bemessungswerte</b> des gewählten
        Lastfalls, anders als das Auflagerblatt darüber, das charakteristisch
        und gruppenweise ausweist.</p>`)}`;
}

/**
 * Stückliste und Eigengewicht.
 *
 * Das gerechnete Gewicht wird dem Richtwert der Projektierungsgrundlagen
 * (Spalte «Approx. Gewicht» der Sortimentstabelle) gegenübergestellt. Das ist
 * eine PLAUSIBILITÄTSANGABE, kein Nachweis: die Tabelle enthält Anschlüsse,
 * Laschen und Verschraubung, die hier nicht einzeln modelliert sind.
 */
export function stuecklisteHtml(erg) {
  const m = erg.modell;
  const RHO = 7850;   // kg/m3

  const posten = [];
  posten.push({ art: 'Gurtprofil', bez: m.profOG.name, anzahl: 2,
                laenge: m.L, einheit: 'm', kg: 2 * m.profOG.g * m.L });
  posten.push({ art: 'Gurtprofil', bez: m.profUG.name, anzahl: 2,
                laenge: m.L, einheit: 'm', kg: 2 * m.profUG.g * m.L });

  // Bindebleche über alle Stationen zählen, je Ebene zwei Stück
  const zaehler = new Map();
  (m.stationsListe ?? []).forEach((st) => {
    [['vertikal', st.vertikal], ['horizontal', st.horizontal]].forEach(([art, b]) => {
      if (!b) return;
      const k = `${art}|${b.pos}|${b.breite}|${b.dicke}|${b.laenge ?? 0}`;
      zaehler.set(k, (zaehler.get(k) ?? 0) + 2);
    });
  });
  [...zaehler.entries()].forEach(([k, n]) => {
    const [art, pos, breite, dicke, laenge] = k.split('|');
    const kg = laenge > 0
      ? n * (breite * dicke * laenge * 1e-9) * RHO : 0;
    posten.push({
      art: art === 'vertikal' ? 'Vertikalblech' : 'Horizontalblech',
      bez: `Pos ${pos} · ${breite}/${dicke} × ${laenge}`,
      anzahl: n, laenge: +laenge, einheit: 'mm', kg,
    });
  });

  const kgTotal = posten.reduce((a, p) => a + p.kg, 0);
  const kgProM = kgTotal / m.L;
  const richt = m.joch?.gewicht ?? null;
  const abw = richt ? (kgProM / richt - 1) * 100 : null;
  const gutAbw = abw !== null && Math.abs(abw) <= 15;

  return `
    ${abschnitt('Stückliste', `${m.typ ?? 'frei'} · ${m.L.toFixed(2)} m` +
      (m.ausfuehrung ? ` · Ausführung ${m.ausfuehrung.bez}` : '') +
      (m.verlauf?.aktiv ? ` · verjüngte Enden ${m.verlauf.voute.endJd} mm` : ''))}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Bauteil</th><th>Bezeichnung</th><th class="num">Stk</th>
        <th class="num">Masse [kg]</th></tr></thead>
      <tbody>${posten.map((p) => `
        <tr><td>${esc(p.art)}</td><td>${esc(p.bez)}</td>
          <td class="num">${p.anzahl}</td><td class="num">${f1(p.kg)}</td></tr>`).join('')}
      </tbody>
      <tfoot><tr><td colspan="3" class="stark">Total</td>
        <td class="num stark">${f1(kgTotal)}</td></tr></tfoot>
    </table></div>

    ${abschnitt('Eigengewicht', 'Abgleich mit den Projektierungsgrundlagen')}
    <div class="kennzahlen">
      ${kachel('gerechnet', f1(kgProM), 'kg/m')}
      ${richt ? kachel('Tabelle', f1(richt), 'kg/m') : ''}
      ${abw !== null ? kachel('Abweichung', (abw >= 0 ? '+' : '') + f1(abw), '%',
                              gutAbw ? 'ok' : 'warn') : ''}
      ${kachel('Total', f1(kgTotal), 'kg')}
    </div>
    ${klapp('stueckliste-hinweis', 'Zum Abgleich mit der Sortimentstabelle', `
    <div class="infobox" style="margin:0">
      Nur Gurtwinkel und Bindebleche sind erfasst. Der Tabellenwert der
      Sortimentszeichnung enthält zusätzlich Stosslaschen, Anschlusswinkel und
      Verschraubung, eine Unterschreitung von rund 10 bis 20 % ist deshalb zu
      erwarten. <b>Nur Information, kein Nachweis.</b>
      ${m.char?.herkunft?.eigengewicht
        ? `<br>In der Rechnung angesetzt: ${esc(m.char.herkunft.eigengewicht)}.` : ''}
    </div>`)}`;
}

/**
 * Optionen-Dialog: alle Einstellungen, die das Rechenmodell steuern, aber
 * nicht zum Bauteil gehören. Sie stehen bewusst nicht in der Eingabe, damit
 * die Sidebar auf Geometrie, Profile, Anbauteile und Lasten beschränkt bleibt.
 */
export function optionenHtml(werte, thema = null) {
  if (thema === 'nachweise') return nachweiseHtml(werte);
  if (thema === 'daten') return datenbasisHtml();
  const teile = optionenFelder(werte, thema);
  // Ein einzelner Abschnitt im Reiter braucht seine Ueberschrift nicht: der
  // Reiter traegt sie bereits, und zweimal dasselbe Wort untereinander liest
  // sich wie ein Fehler.
  const titelZeigen = teile.length > 1;
  return teile.map((a) =>
    (titelZeigen ? abschnitt(a.titel) : '')
    + a.felder.map((f) => feldHtml(f, feldWert(f, werte), werte)).join('')
  ).join('');
}

/**
 * DER REITER «DATENBASIS».
 *
 * Jochtypen, Anbauteil-Vorlagen und Lasttabelle liegen als Paket im Browser.
 * Der Reiter sagt, was hinterlegt ist, und laesst es austauschen oder
 * sichern. Verdrahtet wird er im Optionsdialog - hier steht nur die Form,
 * denn ui.js kennt weder Dateien noch den Neustart.
 */
export function datenbasisHtml() {
  const v = ausSpeicher();
  return `
    <p class="notiz">Jochtypen, Anbauteil-Vorlagen und Lasttabelle liegen als
      Datenpaket vor. Es lässt sich austauschen oder sichern; gespeichert wird
      es allein in diesem Browser und nirgends hingeschickt.</p>
    <div class="feld"><label for="d-paket">Datenpaket (.json)</label>
      <input id="d-paket" type="file" accept=".json,application/json"></div>
    <p class="notiz" id="d-paket-stand">${v
      ? `Hinterlegt: ${esc(v.bezeichnung ?? 'ohne Bezeichnung')}`
        + `${v.stand ? ` · Stand ${esc(v.stand)}` : ''}`
      : 'Zurzeit ist kein Paket im Browser hinterlegt.'}</p>
    <div class="opt-knoepfe">
      <button class="btn" type="button" data-daten-sichern>Aktuelle Daten sichern</button>
      ${v ? '<button class="btn btn-fail" type="button" data-daten-leeren>'
          + 'Hinterlegtes löschen</button>' : ''}
    </div>`;
}

/**
 * DER REITER «NACHWEISE»: was gefuehrt wird und was nicht.
 *
 * Zwei der vier Gruppen sind im Werkzeug nicht enthalten - Knicken und Mast.
 * Sie stehen trotzdem da, und zwar unschaltbar: ein Schalter waere die
 * Behauptung, der Nachweis sei vorhanden und nur gerade aus. Stattdessen
 * steht neben ihnen, warum es sie nicht gibt.
 */
export function nachweiseHtml(werte) {
  const nw = nachweiseAuswahl(werte.nachweise);
  return `<p class="notiz">Ein nicht geführter Nachweis zählt <b>nie als
    erfüllt</b>. Er wird im Urteil, im Bericht und in der Ausleitung
    ausdrücklich als nicht geführt genannt.</p>`
    + NACHWEISGRUPPEN.map((g) => `
    <div class="nw-wahl${g.vorhanden ? '' : ' fehlt'}">
      <label>
        <input type="checkbox" data-nachweis="${esc(g.key)}"
          ${nw[g.key] ? 'checked' : ''}${g.vorhanden ? '' : ' disabled'}>
        <span class="nw-titel">${esc(g.titel)}</span>
      </label>
      <p class="notiz">${esc(g.was)}</p>
      ${g.vorhanden ? '' : '<p class="notiz stark">In diesem Werkzeug nicht '
        + 'enthalten, separat zu führen.</p>'}
    </div>`).join('');
}

/**
 * DIE VERORTUNG - wo das Tragwerk steht.
 *
 * Sie stand zuoberst in der Eingabe, vor allen Rechenmassen. Das war richtig
 * gemeint («welches Tragwerk ist das?») und doch am falschen Platz: sie geht
 * in keine Rechnung ein, kostete aber die obersten drei Zeilen des Reiters,
 * durch die man bei jeder Massaenderung hindurchscrollt.
 *
 * Sie gehoert zum PROJEKT, nicht zum Rechenmodell - und damit in die
 * Bannerschublade, wo Projekte, Joche und Vorlagen liegen. Dort steht sie
 * neben dem Namen, unter dem das Tragwerk abgelegt wird, und das ist genau
 * der Zusammenhang, in dem man sie ausfuellt.
 */
export function verortungHtml(werte) {
  return sichtbareFelder('ort', werte)
    .map((f) => feldHtml(f, feldWert(f, werte), werte)).join('');
}

/** Die Reiterleiste des Optionen-Dialogs. */
export function optionenReiterHtml(werte, jetzt) {
  return `<div class="tabs tabs-dialog">${optionenThemen(werte).map((t) =>
    `<button class="tab${t.key === jetzt ? ' on' : ''}" type="button"
       data-opt-thema="${esc(t.key)}">${esc(t.titel)}</button>`).join('')}</div>`;
}

/** Ereignisse des Optionen-Dialogs verdrahten. */
/*
 * DIE KUERZELLISTE WIRD IM OPTIONSDIALOG VERDRAHTET, nicht in der Maske.
 *
 * Dort steht sie, und der Dialog hat seinen eigenen Verdrahtungsweg
 * (`verdrahteOptionen`). In `zeichneMaske` gesetzt lief sie ins Leere -
 * die Knoepfe existierten, nur hoerte niemand auf sie.
 */
function verdrahteTasten(container, onChange) {
  /*
   * EINE TASTE BELEGEN: anklicken, druecken.
   *
   * Kein Textfeld - man tippt keine Taste ab, man DRUECKT sie. Das Feld
   * haette ausserdem die Frage aufgeworfen, was «Pfeil links» dort heissen
   * soll. Waehrend der Aufnahme faengt der Knopf jeden Druck ab; Esc bricht
   * ab, Rueck- oder Entfernentaste schaltet das Kuerzel aus.
   */
  container.querySelectorAll('[data-taste]').forEach((b) => {
    b.addEventListener('click', () => {
      if (b.dataset.warte) return;
      b.dataset.warte = '1';
      const vorher = b.textContent;
      b.textContent = '…';
      b.classList.add('wartet');
      const fertig = () => {
        delete b.dataset.warte;
        b.classList.remove('wartet');
        b.removeEventListener('keydown', horch, true);
        b.blur();
      };
      const horch = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') { b.textContent = vorher; fertig(); return; }
        const neu = (e.key === 'Backspace' || e.key === 'Delete') ? ''
          : (e.key.length === 1 ? e.key.toLowerCase() : '');
        // Sondertasten (F5, Pfeile, Tab) bleibem dem System - sie hier zu
        // belegen hiesse, dem Browser ins Handwerk zu pfuschen.
        if (neu === '' && e.key !== 'Backspace' && e.key !== 'Delete') {
          b.textContent = vorher; fertig(); return;
        }
        fertig();
        onChange('tasteBelegen', { id: b.dataset.taste, taste: neu });
      };
      b.addEventListener('keydown', horch, true);
      b.focus();
    });
  });
  container.querySelectorAll('[data-tasten-zurueck]').forEach((b) => {
    b.addEventListener('click', () => onChange('tastenZurueck', true));
  });
}

export function verdrahteOptionen(container, werte, onChange) {
  verdrahteTasten(container, onChange);
  container.querySelectorAll('[data-feld]').forEach((inp) => {
    const key = inp.dataset.feld;
    const feld = FELDER.find((f) => f.key === key);
    const ev = inp.tagName === 'SELECT' || inp.type === 'checkbox' ? 'change' : 'input';
    const lies = () => {
      if (feld.typ === 'zahl' || feld.typ === 'schieber') {
        const v = parseFloat(inp.value);
        return Number.isFinite(v) ? v : undefined;
      }
      if (feld.typ === 'schalter') return inp.checked;
      return inp.value;
    };
    /*
     * WAEHREND DES TIPPENS WIRD GERECHNET, NICHT NEU GEZEICHNET.
     *
     * Ein Zahlenfeld meldet jede Taste, und der Aufrufer baute daraufhin
     * seine Maske neu. Das Feld war danach ein anderes DOM-Element mit dem
     * GEPARSTEN Wert darin - wer «1.25» eingab, tippte zwischendurch «1.»,
     * und weil `input[type=number].value` bei ungueltigem Inhalt einen
     * LEEREN String liefert, war der Text nicht einmal zu retten. Ergebnis:
     * es liessen sich nur einzelne Ziffern eingeben.
     *
     * Der zweite Parameter sagt deshalb, ob die Meldung ein Zwischenstand
     * ist. Der Aufrufer rechnet dann mit, laesst die Maske aber stehen; erst
     * beim Verlassen des Feldes (`change`) wird neu gezeichnet.
     */
    inp.addEventListener(ev, () => {
      const v = lies();
      if (v !== undefined) onChange(key, v, ev === 'input');
    });
    if (ev === 'input') {
      inp.addEventListener('change', () => {
        const v = lies();
        if (v !== undefined) onChange(key, v, false);
      });
    }
  });
}

/**
 * Lastfallmatrix.
 *
 * Eine Zeile je Lastfall, eine Spalte je Einwirkungsgruppe, darin nur der
 * Beiwert. Welcher Lastfall massgebend ist, sieht man der Matrix nicht an -
 * deshalb steht rechts das gerechnete η.
 *
 * Die beiden charakteristischen Lastfälle sind kein Tragsicherheitsnachweis;
 * ihr η ist zum Vergleich angegeben und grau gesetzt.
 */
export function kombiMatrixHtml(kombi, normensatz) {
  if (!kombi?.lastfaelle?.length) return '';
  const ein = kombi.einwirkungen;
  const satz = normensatz
    ? `Beiwerte nach ${esc(normensatz.label)}`
    : 'Beiwerte von Hand gesetzt';

  const zeile = (k, i) => `
    <tr class="${k.istMassgebend ? 'aktiv' : ''}${k.nachweis ? '' : ' char'}">
      <td>LF${i + 1} · ${esc(k.bez)}
        ${k.istMassgebend ? '<br><b>massgebend</b>' : ''}
        ${k.angepasst ? '<br><span class="ablage-meta">angepasst</span>' : ''}
        ${k.nachweis ? '' : '<br><span class="ablage-meta">charakteristisch</span>'}
        ${k.doppeltZu ? `<br><span class="ablage-meta warnton"
          >gleiche Beiwerte wie ${esc(k.doppeltBez)} – rechnet dasselbe zweimal</span>` : ''}</td>
      ${ein.map((e) => {
        const b = k.beiwerte[e.key] ?? 0;
        return `<td class="beiwert num${b ? '' : ' null'}${b < 0 ? ' minus' : ''}"
          >${f2(b)}</td>`;
      }).join('')}
      <td class="num stark ${k.nachweis ? ampel(k.eta) : ''}">${f3(k.eta)}</td>
      <td class="lf-tasten">
        <button class="btn btn-mini" data-lf="${esc(k.key)}" type="button"
                title="Beiwerte dieses Lastfalls anpassen">${icon('optionen', 12)}</button>
        ${k.eigen || k.angepasst ? `<button class="btn btn-mini btn-fail"
          data-lf-weg="${esc(k.key)}" type="button"
          title="${k.eigen ? 'Lastfall entfernen' : 'Anpassung zurücknehmen'}">×</button>` : ''}
      </td>
    </tr>`;

  return `
    ${abschnitt('Lastfälle', satz)}
    <div class="tabellenrahmen"><table class="dt kombi">
      <thead><tr><th>Lastfall</th>
        ${ein.map((e) => `<th class="num">${esc(e.label)}</th>`).join('')}
        <th class="num">η</th><th></th></tr></thead>
      <tbody>${kombi.lastfaelle.map(zeile).join('')}</tbody>
    </table></div>
    <div class="lf-fuss">
      <button class="btn btn-mini" data-lf-neu type="button">+ Lastfall</button>
      <span class="notiz">Beiwerte je Lastfall über ${icon('optionen', 11)} anpassen;
        die Grundwerte γ und ψ₀ stehen in den <b>Optionen</b>.</span>
    </div>
    ${klapp('lastfall-hinweis', 'Charakteristische Werte und Zuordnung', `
    <div class="notiz" style="margin:0">
      Charakteristische Werte: ${ein.map((e) =>
        `${esc(e.label)} ${e.wert ? f3(e.wert) + ' kN/m' : ''}` +
        `${e.zusatz ? `${e.wert ? ' + ' : ''}${f2(e.zusatz)} kN` : ''}` +
        `${e.wert || e.zusatz ? '' : '–'}`).join(' · ')}.
      <br><b>Wind x</b> ist die Windkraft in Jochachse, <b>Wind y</b> die in
      Gleisrichtung; die Laufmeterlast der Sortimentstabelle wirkt auf das Joch
      und läuft deshalb in Wind y. Beide Richtungen stehen mit <b>+ und −</b> in
      der Liste: welche Seite massgebend wird, hängt davon ab, wohin die
      ständigen Horizontallasten zeigen. Ein <b>negativer</b> Beiwert kehrt die
      Gruppe um; ständige Einwirkungen behalten ihre Wirkrichtung.
      Die veränderlichen Vertikallasten der Anbauteile (Q_z) laufen in der
      Gruppe <b>Schnee</b> mit.
      ${normensatz ? '' : '<b>Die Beiwerte weichen von SIA 260 und RTE ab.</b>'}
    </div>`)}`;
}

/** Formular zum Anpassen oder Anlegen eines Lastfalls. */
export function lastfallFormular(lf, einwirkungen) {
  return `
    <div class="feld"><label for="lf-bez">Bezeichnung</label>
      <input id="lf-bez" type="text" value="${esc(lf.bez ?? '')}"
             ${lf.eigen || !lf.key ? '' : 'disabled'}></div>
    ${einwirkungen.map((e) => `
      <div class="feld"><label for="lf-${esc(e.key)}">Beiwert ${esc(e.label)}</label>
        <div class="zahlfeld">
          <input id="lf-${esc(e.key)}" type="number" step="0.05"
                 value="${lf.beiwerte?.[e.key] ?? 0}">
          <span class="einheit">–</span></div>
        <small class="hinweis">${esc(e.bemerkung ?? '')}${
          e.art === 'veraenderlich'
            ? ' Ein negativer Wert dreht die Richtung um.'
            : ' Ständig: feste Wirkrichtung, nicht umkehren.'}</small></div>`).join('')}
    <label class="schalter"><input id="lf-nachweis" type="checkbox"
      ${lf.nachweis === false ? '' : 'checked'}>
      <span>Tragsicherheitsnachweis (geht in Umhüllende und η ein)</span></label>
    <p class="notiz">Ohne Haken gilt der Lastfall als charakteristische
      Betrachtung: er wird gerechnet und angezeigt, bleibt aber aus der
      Umhüllenden und aus der Wahl des massgebenden Lastfalls heraus.</p>`;
}

export function zeichneFehler(node, fehler) {
  node.innerHTML = `<div class="fehlerbox"><strong>Berechnung nicht möglich</strong>
    <p>${esc(fehler.message)}</p></div>`;
}

/** Pflegezustand der Typendatenbank für die Fussleiste. */
export function datenbankText(stand, fehler) {
  if (fehler.length) return `Datenbank: ${fehler.length} Beanstandung(en)`;
  const t = [];
  if (stand.ohneBleche.length) t.push(`ohne Bleche: ${stand.ohneBleche.join(',')}`);
  if (stand.staffelungUngeprueft.length) t.push('Staffelung ungeprüft');
  // Zeilen der Mass-Tabelle, die in der Zeichnung nicht aufgehen
  if (stand.masstabelleUnschluessig?.length) {
    t.push(`Mass-Tabelle unschlüssig bei ${stand.masstabelleUnschluessig.join(', ')} m`);
  }
  return `DB ${stand.version} · ${stand.typen} Typen · ` +
         `${stand.masstabelle} Tabellenlängen${t.length ? ' · ' + t.join(' · ') : ''}`;
}

export { f0, f1, f2, f3, icon, esc };
