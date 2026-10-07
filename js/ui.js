/**
 * ui.js
 * ---------------------------------------------------------------------------
 * DOM-SCHICHT. Baut Eingabemaske und Auswertung aus dem Schema und dem
 * Rechenergebnis. Enthält KEINE Rechnung und KEINE Geometrie; das Aussehen
 * kommt aus js/design.js und css/style.css.
 * ---------------------------------------------------------------------------
 */

import { gelaendeVon } from './data.masten.js';
import { NACHWEISGRUPPEN, nachweiseAuswahl } from './core.checks.js';
import { verformungGrenzen } from './core.verformung.js';
import { RECHENVERFAHREN, bauteileMitStabwerk, verfahrenVon, stabZuordnung,
         STABWERK_AUSLOESUNG, stabwerkAuslosungVon } from './core.stabnachweis.js';
import { optionsSkizze, SKIZZEN_FELDER, bauformSkizze }
  from './doku.optionsskizzen.js';
import { abfangAnbindung, abfangAnbauLasten, ABFANG_ANBINDUNGEN,
         ABFANG_VERLAEUFE, abfangBlechstationen } from './core.abfangjoch.js';
import { auflagerDiagrammHtml, verdrahteAuflagerLinks, ohneMastHtml }
  from './ui.auflagerlinks.js';
import { TRAGWERKSARTEN, tragwerksart, tragwerkeSortiert, tragwerkName,
         lageVon, lageOrtsnull, tragwerkeVon, mastenFuer, mastenVon,
         gewaehlterMast, versteckt, anschlusshoehe,
         aufRaster, mastNameAmEnde, tragwerkPos, mastName,
         tauscheAktives, freieLage, freieLaenge,
         tragwerkAendern } from './core.constants.js';
// Die Leiste schreibt die Mastlaenge an. Steht keine da, gilt dieselbe
// Vorgabe wie im Feld - sonst bliebe die Uebersicht leer, wo die Maske
// einen Wert zeigt.
import { mastLaengeVorgabe, mastImModell, einzelmastLaenge,
         mastLaengeFuer } from './core.auflager.js';
import { laengenbereich, getTragjoch, moeglicheLaengen } from './data.tragjoche.js';
import { abfangLaengenbereich, getTragausleger, tragauslegerBlechachsen,
         tragauslegerAufhaengung, tragauslegerSpreizung,
         tragauslegerTypen, abfangBindeblech, abfangLaengen } from './data.abfangjoche.js';
import { getGurtprofil, gurtAchsabstand } from './data.profiles.js';
import { mastKopfHoehe, kragarmEnde } from './ui.schema.js';
import { GRUPPEN, FELDER, sichtbareFelder, gruppeGilt,
         optionenFelder, optionenThemen,
         SCHNITT_ORIENTIERUNGEN } from './ui.schema.js';
import { vorlagen, neuesAnbauteil, farbschluessel, baugruppeSumme,
         normalisiereAnbauteil, neuerLastblock, expandiereAnbauteile,
         modulWinkel, ANBAU_ORTE, ortVon, amMast, vorlagePasstAn, leiterListe, anbauGruppe,
         leiterKennung, havarieAnteile, istSignalModul, signalFlaeche,
         SIGNAL_CW, signalVorlage, laengsAchseVon, teilLaenge, teilLaengeSetzen } from './data.anbauteile.js';
import { flBauteile, getFlBauteil, istStreckenlast, istKettenwerk,
         flZerlegung, flTragseile, flFahrdraehte, flPaarung,
         PROFILBEIWERTE } from './data.fl.js';
import { befestigungsArt, anbauKette, passeTraegerAn, rasterNormVon, rasterGesetzt,
         hatTraeger, achsfolge } from './core.anbauteile.js';
import { EINWIRKUNGEN, ABFANGARTEN, ABFANG_VORGABE, abfangVorgabeFuer,
         abfangart, mitTrasse } from './core.lasten.js';
import { massketteLesen, fangeAufMasskette, rechensatz, kragarme, stossEnden,
         abfangUeberstand } from './core.constants.js';
import { ausSpeicher } from './data.paket.js';
import { MASSVARIANTEN } from './core.vierendeel.js';
import { abschnitt, klapp, kachel, plakette, ampel, esc, icon } from './design.js';
// Fuer die Profiluebersicht: die Querschnittswerte des Ankers und
// die Stahlguete stehen in ihren eigenen Datenmodulen.
import { ankerQuerschnitt, ankerReichtZug } from './data.anker.js';
import { mastKlasse } from './core.mast.js';
import { winkelIt } from './core.winkel.js';
import { blechWerte } from './ui.profilblatt.js';
import { vorlageSymbol, vorlageSuchtext, suchtextPasst, suchNorm } from './ui.anbausymbol.js';

/*
 * Suche und Filter über den Vorlagen (3. Oktober) - Ansichtssache, sie
 * überstehen den Neuaufbau der Maske, werden aber nicht gespeichert.
 */
let vorlageSuche = '';
let vorlageOrt = 'alle';

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

/* ===========================================================================
 * DAS ETA FUER DIE LEISTE
 * ===========================================================================
 *
 * Weisung vom 13. September: «offene fragen umsetzen» - darunter das
 * angebotene eta je Bauteil in der Leiste.
 *
 * >>> GEZEIGT WIRD NUR, WAS GERECHNET IST. <<<
 *
 * Die Leiste wird aus den EINGABEWERTEN gebaut; gerechnet wird das AKTIVE
 * Tragwerk. Eine volle Huellkurve kostet nachgemessen 32 ms - bei drei
 * Tragwerken waeren das hundert Millisekunden bei jedem Tastendruck, und
 * zwar fuer Zahlen, die nebenan in der Auswertung ohnehin stehen.
 *
 * Also steht die Zahl dort, wo sie gilt: am gerechneten Tragwerk und an
 * seinen Masten. Die uebrigen tragen einen STRICH - nicht nichts. Eine
 * leere Stelle liest sich wie «in Ordnung»; ein Strich sagt «hier steht
 * keine Zahl», und der Titel sagt warum.
 */

/*
 * >>> DER ANKER ALS STREBE (Weisung vom 17. September). <<<
 *
 * «die anker / Druckstütze klarer darstellen, es wirkt momentan wie ein
 * fragment neben dem masten.» Bis dahin ein gestrichelter Rahmenstrich am
 * Fuss. Jetzt eine Strebe: Gelenk am Masten oben, Fundament am Boden.
 * Quer zum Gleis liegt sie in der Bildebene; laengs steht sie aus dem Blatt
 * heraus - dann ist sie gestrichelt, und ihr Fuss ist ein einfacher Strich.
 * Gezeichnet nach rechts; `.minus` spiegelt.
 */
function ankerGlyphe(laengs) {
  return `<svg viewBox="0 0 20 17" width="20" height="17" aria-hidden="true">
    <line x1="1" y1="5" x2="${laengs ? 11 : 15}" y2="14.5" class="qa-strebe${laengs ? ' laengs' : ''}"/>
    <circle cx="1" cy="5" r="1.7" class="qa-gelenk"/>
    ${laengs
      // Laengs: ein einfacher Strich als Fundament (Weisung vom 17. September).
      ? '<line x1="8" y1="15.3" x2="15" y2="15.3" class="qa-strich"/>'
      : '<rect x="12" y="14" width="7" height="2.6" rx="0.6" class="qa-fund"/>'}
  </svg>`;
}

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
    gruppen: ['art', 'geo', 'aufl', 'mast'] },
  // Die Stückliste gehört zu den Profilen: sie sagt, was aus der gewählten
  // Profil- und Blechwahl an Stahl herauskommt. Als eigener Auswertungsreiter
  // stand sie weit weg von der Entscheidung, die sie beeinflusst.
  { id: 'profil', titel: 'Profile', icon: 'profil', gruppen: ['prof', 'blech', 'stueck'] },
  { id: 'anbau', titel: 'Anbauteile', icon: 'anbau', gruppen: ['trasse', 'anbau'] },
  // Nach Einwirkung gegliedert (6. Oktober): ständig, Wind, Schnee, Bestandesschutz.
  { id: 'lasten', titel: 'Lasten', icon: 'lastpfeil', gruppen: ['staendig', 'ein', 'schnee', 'bestand', 'havarie', 'komb'] },
];

/** Reiter der Auswertung. */
export const AUSWERTUNG_TABS = [
  { id: 'uebersicht', titel: 'Übersicht', icon: 'uebersicht' },
  { id: 'schnitt', titel: 'Schnitt', icon: 'schnitt' },
  { id: 'verlauf', titel: 'Verläufe', icon: 'achsen' },
  { id: 'auflager', titel: 'Auflager', icon: 'auflager' },
];

/** Der Einzelmast hat keinen Schnitt durch ein Joch - die übrigen drei Reiter. */
export const EINZELMAST_TABS = AUSWERTUNG_TABS.filter((t) => t.id !== 'schnitt');

/*
 * >>> DER SCHNITT GEHOERT DEM ERSATZBALKEN (29. September). <<<
 *
 * Auf die Rückfrage, was der Reiter «Schnitt» im Stabwerksweg zeigen soll
 * (Entscheid «Schnitt und Bilder», 28. Sept.), im Wortlaut: «ausblenden und
 * beim ersatzbalken auffführen.» Die Ausnutzung und Spannungsverteilung des
 * Stabwerks zeigen Verläufe und 3D-Plot (Hülle je Stab); der Schnitt ist
 * die Aufteilung des Ersatzbalkens auf Gurte und Bleche an einer Station
 * und steht deshalb nur beim Rechenverfahren Ersatzbalken. Ausgeblendet
 * wird nach dem VERFAHREN, nicht nach dem Stand der Rechnung - sonst
 * tauchte der Reiter bei jeder Eingabe für eine Sekunde auf («vorläufig»)
 * und verschwände wieder. Eine Stelle für Reiterleiste und Schiene.
 */
export function auswertungTabs(werte, mitJoch = true) {
  if (!mitJoch) return EINZELMAST_TABS;
  return verfahrenVon(werte) === 'stabwerk'
    ? AUSWERTUNG_TABS.filter((t) => t.id !== 'schnitt') : AUSWERTUNG_TABS;
}

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
    // Die Markierung der Anbauteile (Strg+Klick, 7. Oktober) ändert die Liste.
    [...atMarkiert].join(','),
    dwGliederung, [...dwWahl].join(','),
    /*
     * DIE EIGENEN VORLAGEN GEHOEREN DAZU (Befund vom 19. September: «Nach
     * dem abspeichern eines bauteils wir dieser nicht sofort in die liste
     * aufgenommen sonder man muss hin und herschalten in der sidebar»).
     * Die Kacheln sind Struktur; ohne sie in der Signatur kam die neue
     * Kachel erst mit dem naechsten Neubau.
     */
    (werte.eigeneVorlagen ?? []).map((v) => `${v.id}:${v.name}`),
    // Dazu die Sammlung dieses Browsers (7. Oktober).
    vorlagen().filter((v) => v.global).map((v) => `${v.id}:${v.name}`),
    /*
     * Die Havarie-Uebersicht: welche Leiter es gibt, welche reissen - und
     * seit dem 24. September die ABFANGART. Sie aendert die Struktur der
     * Zeile: bei einseitiger Abfangung kommt die Richtung dazu, und die
     * beiden Kraftspalten rechnen andere Werte. Ohne sie in der Signatur
     * blieb die Zeile stehen, wie sie war - dieselbe Falle wie am
     * 1. September bei der Stegskizze.
     */
    gruppen.includes('havarie')
      ? [werte.havarieAus === true, havarieLeiter(werte).map((l) => l.key),
         Object.entries(werte.havarie ?? {}).filter(([, v]) => v?.reisst).map(([k]) => k),
         Object.entries(werte.havarie ?? {})
           .map(([k, v]) => `${k}:${v?.art ?? ''}:${v?.richtung ?? ''}`)]
      : null,
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
      /*
       * DIE ANBINDUNG GEHOERT DAZU. Sie entscheidet, ob die Karte das Feld
       * «Seite» zeigt - beim abgefangenen Leiter ja, beim vertikalen
       * Element nicht. Ohne sie in der Signatur blieb die Karte stehen:
       * «Mitte Träger» war gewaehlt, das Seitenfeld erschien nie.
       */
      ? [nachweiseAuswahl(werte.nachweise).bestandesschutz, ...(werte.anbauteile ?? []).map(
          // Das Kennzeichen «neu» (4. Oktober) ändert die Zeile.
          (a) => `${a.id}:${a.aktiv !== false}:${a.neu === true}:${befestigungsArt(a)}:` +
                 `${ortVon(a)}:${abfangAnbindung(a).art}:` +
                 `${abfangAnbindung(a).verlauf ?? ''}:` +
                 `${klappOffen(`at-${a.id}`)}:${a.gleis ?? ''}:${a.tag ?? ''}:` +
                 (a.module ?? []).map((m) => m.bauteil).join(',') + ':' +
                 // Woher der Leiter seine Ablenkung nimmt (29. Sept.): sie
                 // entscheidet, welches Feld im Aufklappteil steht.
                 (a.module ?? []).map((m) => ablenkQuelle(m)).join(',') + ':' +
                 // Die Auswahl des Signalbauers (30. Sept.): Liste und Summen
                 // der Karte stehen im Aufbau, nicht in nachgefuehrten Feldern.
                 (a.module ?? []).map((m) => (Array.isArray(m.signal)
                   ? m.signal.map((s) => `${s.id}*${s.anzahl}*${s.laenge ?? ''}`).join('+') : '')).join(',') + ':' +
                 (a.lasten ?? []).map((l) => l.einwirkung).join(',') + ':' +
                 // Welche Lasten einen Punkt teilen (29. Sept.) - Struktur.
                 (a.lasten ?? []).map((l, k) => lastPunkt(l, k)).join(',') + ':' +
                 // Die Abfangung der Leiter (29. September): «einseitig»
                 // bringt das Feld der Richtung - das ist Struktur.
                 (a.module ?? []).map((m, k) => {
                   const e = werte.havarie?.[leiterKennung(a, m, k)];
                   return e ? `${e.art ?? ''}${e.richtung ?? ''}` : '';
                 }).join(','))]
      /*
       * DIE AUFLAGERBEDINGUNG GEHOERT DAZU. Ihr Diagramm ist gezeichnet,
       * kein Eingabefeld - `aktualisiereMaske` gleicht nur Feldwerte ab und
       * liesse es stehen. Ohne diese Zeile schaltete der Klick den Wert um,
       * und der Pfeil blieb, wie er war: die Zahl richtig, das Bild falsch.
       */
      // Ebenso die Lagerung ohne Masten (2. Oktober) - im Browser gesehen:
      // der Wert kam an, die Matrix blieb stehen.
      : (gid === 'aufl' && (werte.auflagerLinks || werte.auflagerOhneMast)
          ? [...sichtbareFelder(gid, werte).map(feldSignatur(werte)),
             JSON.stringify(werte.auflagerLinks ?? null),
             JSON.stringify(werte.auflagerOhneMast ?? null)]
          : sichtbareFelder(gid, werte).map(feldSignatur(werte))))),
  ]);
}

/*
 * >>> AUCH DIE OPTIONEN EINES FELDES KOENNEN VON DEN WERTEN ABHAENGEN. <<<
 *
 * Gefunden am 17. September: «Ebene des Ankers» auf längs gestellt, und
 * «Seite des Ankerfundaments» bot weiter «in −x (zum Gleis hin)» an - die
 * Beschriftung zur Querebene. `optionenAus` rechnet die richtigen, aber die
 * Maske wurde nicht neu gebaut, weil sich an ihrer Signatur nichts aenderte.
 * Die Texte gehoeren deshalb dazu.
 */
const feldSignatur = (werte) => (f) => (typeof f.optionenAus === 'function'
  ? `${f.key}:${(() => {
      try { return (f.optionenAus(werte) ?? []).map((o) => o.text).join('|'); }
      catch { return ''; }
    })()}`
  : f.key);

/* ===========================================================================
 * >>> HAVARIE: WELCHER LEITER REISST (19. September). <<<
 * ===========================================================================
 *
 * Weisung: «den button havariefall müsste man entweder unter lasten global
 * führen oder eine übersicht mit allen leitern ermöglichen wo man die
 * leiter bestimmen kann die reissen und die berechnung durchführen mit den
 * regeln voll und 10%. beachte das nur ein leiter im havariefall rissen kann
 * und nicht mehrer. als einzelner leiter zählt auch das kettenwerk Fd + Ts.»
 * Gewaehlt: die Uebersicht - «da man das nicht so gut abschätzen kann wählt
 * man die leiter die relevant sein könnten und das system rechnet diese
 * dann einzeln durch», und die Zugkraft kann «in die beiden y richtungen»
 * verschieden sein.
 *
 * Hier stand bis dahin ein Haken «Bruch» je Baugruppe in der Karte - und
 * wer zwei setzte, liess beide im selben Fall reissen.
 */
export function havarieLeiter(werte) {
  // Mit den Teilen am Masten (rechensatz): auch ihre Leiter koennen reissen.
  try { return leiterListe(rechensatz(werte).anbauteile ?? []); } catch { return []; }
}

function havarieHtml(g, werte) {
  const leiter = havarieLeiter(werte);
  /*
   * >>> DER LEITER IM 3D (7. Oktober). <<< Mit Bild der Tabelle: «auch hier
   * sollte man einen verweis zum 3d modell haben, sonst muss man sich über
   * den text orientieren, wo der leiter am modell steht.» Ein Klick auf den
   * Namen hebt die Teile hervor, an denen der Leiter hängt - derselbe Weg
   * wie die Drahtwerk-Übersicht. Die Schlüssel des 3D (`AT<k>`) zählen über
   * die Liste des Rechensatzes, aus der auch `havarieLeiter` liest.
   */
  let imSatz = [];
  try { imSatz = rechensatz(werte).anbauteile ?? []; } catch { imSatz = []; }
  /*
   * >>> WIE DIE DRAHTWERKE UNTER ANBAUTEILE (7. Oktober). <<< Weisung: «Die
   * anzeige der Leiterauswahl unter havarie gleich machen wie unter
   * anbauteile.» Dieselbe Tabelle (Leiter, Typ, Lage), Überfahren zeigt den
   * LEITER im 3D (Modulschlüssel `AT<i>#<k>`), nicht das ganze Bauteil.
   */
  const teilKeys = (l) => [...new Set(l.teile.flatMap((t) => {
    const k = imSatz.findIndex((a) => a.id === t.baugruppe);
    return k >= 0 ? [`AT${k}#${t.modul}`, `AT_${k + 1}#${t.modul}`] : [];
  }))];
  const leiterTitel = (l) => (l.kettenwerk ? `${l.kettenwerk}` : '')
    + [...new Set(l.teile.map((t) => {
      const k = imSatz.findIndex((a) => a.id === t.baugruppe);
      return k >= 0 ? `A${k + 1}.${t.modul + 1}` : '';
    }).filter(Boolean))].map((s, j) => (j === 0 && l.kettenwerk ? ` · ${s}` : (j ? ` ${s}` : s))).join('');
  const wahl = werte.havarie ?? {};
  const n = leiter.filter((l) => wahl[l.key]?.reisst === true).length;
  const t0 = tragwerkeVon(werte)[0];
  const wo = (t) => (t.ort === 'joch' ? `x = ${f2(t.x ?? 0)} m`
    : `${mastNameAmEnde(werte, t0, t.ort === 'mastB' ? 'B' : 'A') || 'Mast'} · h = ${f2(t.hMast ?? 0)} m`);
  /*
   * >>> DIE REGEL HAENGT AM LEITER, NICHT AM TRAGWERK (24. September). <<<
   * Sie steht deshalb je Zeile als Notiz, nicht mehr als ein Satz fuer
   * alle - ein Tragjoch kann eine Abfangung tragen und ein Abfangjoch
   * einen durchlaufenden Leiter.
   */
  const regel = 'Was beim Riss angesetzt wird, sagt die Abfangung des '
    + 'Leiters; die Ablenkung des gerissenen Leiters wirkt zur Hälfte.';
  const zeilen = leiter.map((l) => {
    const e = wahl[l.key] ?? {};
    /*
     * DIE VORGABE HÄNGT AN DER TRAGWERKSART (24. September): am
     * Abfangjoch ist der Regelfall «einseitig», sonst «durchgehend».
     * Sie kommt aus derselben Stelle wie im Kern - stand sie hier
     * anders, behauptete die Karte etwas anderes als die Rechnung.
     */
    const art = e.art ?? abfangVorgabeFuer(tragwerksart(werte).key);
    const vz = e.richtung === '-y' ? -1 : 1;
    const zahl = (feld) => `<td><input class="hav-zahl" type="number" step="0.1" min="0"
        data-hav-key="${esc(l.key)}" data-hav="${feld}" value="${e[feld] ?? ''}"
        placeholder="${l.zug20 ? f1(l.zug20) : '–'}"
        title="Leiterzugkraft bei −20 °C in ${feld === 'zugP' ? '+y' : '−y'} [kN] — leer: aus der Reglagetabelle"></td>`;
    /*
     * >>> DIE ZAHL, NICHT NUR DER PROZENTSATZ (Frage vom 24. September:
     * «wo sieht man den lastanteil beim havariefall?»). <<<
     *
     * Bis hierher stand hier der Prozentsatz als Satz - 10 %, aber nicht,
     * wieviel das an DIESEM Leiter ist. Gerechnet wird mit derselben
     * Funktion wie im Kern (`havarieAnteile`), damit die Karte nicht eine
     * zweite Rechnung fuehrt, die auseinanderlaufen kann.
     */
    const bt = l.teile[0]?.bauteilId ?? null;
    let ff = null;
    if (bt) {
      try {
        const g0 = havarieAnteile({ id: bt, art, richtung: vz, bruch: false });
        const b0 = havarieAnteile({ id: bt, art, richtung: vz, bruch: true,
                                    zug20: e.zugP ?? null });
        ff = { Gy: g0.Gy, riss: b0.Fy, ohne: g0.Fy };
      } catch { ff = null; }
    }
    const kraft = (v) => (v === null || v === undefined || Math.abs(v) < 5e-3
      ? '<span class="dim">–</span>' : f2(v));
    return `<tr class="klick" data-hav-zeige="${esc(teilKeys(l).join(','))}"
        title="Überfahren: Leiter im 3D · Klick: festhalten (nochmals oder Esc: zurück)">
      <td><input type="checkbox" data-hav-key="${esc(l.key)}" data-hav="reisst"
        data-hav-name="${esc(l.name)}"${e.reisst === true ? ' checked' : ''}
        title="Dieser Leiter kann reissen — er wird als eigener Havariefall gerechnet"></td>
      <td class="hav-name">${esc(leiterTitel(l) || l.name)}</td>
      <td>${esc([...new Set(l.teile.map((t) => t.bauteil))].join(' + '))}</td>
      <td class="hav-lage">${esc([...new Set(l.teile.map(wo))].join(' · '))}</td>
      ${/* >>> DIE ABFANGUNG WIRD BEIM BAUTEIL EINGEGEBEN (29. September). <<<
         * «wie gibt man bei einem joch leiter ein die abgefangen sind (nicht
         * durchgehend). die eingabe über die leiter sollte direkt bei den
         * bauteilen erfolgen.» Hier steht sie nur noch zur Übersicht - dieselbe
         * Angabe an zwei Orten einzugeben hiesse, auf den Tag zu warten, an
         * dem sie sich widersprechen. */''}
      <td title="${esc(`${abfangart(art).notiz} — Eingabe beim Bauteil (Reiter Anbauteile)`)}"
        >${esc(abfangart(art).kurz)}</td>
      <td>${art === 'einseitig' ? (vz > 0 ? '+y' : '−y')
        : '<span class="dim">–</span>'}</td>
      <td class="num" title="Ständiger Längszug an diesem Tragwerk">${kraft(ff?.Gy)}</td>
      <td class="num" title="Änderung in Gleisrichtung, wenn dieser Leiter reisst">${kraft(ff?.riss)}</td>
      ${zahl('zugP')}${zahl('zugM')}
    </tr>`;
  }).join('');
  /*
   * Weisung vom 19. September: «den havarielastfall deaktivierbar machen
   * (nachweis / export)». Ein Schalter fuer beides - die Ausleitung soll
   * dieselben Faelle tragen, die der Nachweis rechnet.
   */
  const aus = werte.havarieAus === true;
  /*
   * >>> LAST AUFS TRAGWERK (6. Oktober). <<< Weisung im Wortlaut: «Beim
   * Havariefall schalter für Last auf Tragwerk transerieren, die überlegung
   * ist, das die traversen nachgeben und die Last dann in Mastachse zu ligen
   * kommt.» Eingeschaltet greifen die Havarie-Kräfte eines Teils an der
   * Wurzel seiner Kette an (Anschluss am Joch bzw. auf der Mastachse), nicht
   * am Leiterpunkt - ohne den Hebel der Traverse.
   */
  const achse = werte.havarieInAchse === true;
  const schalter = `<label class="hav-an" title="Ausgeschaltet: keine Havariefälle im Nachweis und in der AxisVM-Ausleitung">
      <input type="checkbox" data-hav-an="1"${aus ? '' : ' checked'}> Havariefall rechnen (Nachweis und Export)</label>`
    + (aus ? '' : `<label class="hav-an" title="Die Traversen geben nach: die Havarie-Kräfte greifen am Anschluss des Teils an (Joch bzw. Mastachse), ohne den Hebel bis zum Leiter. Gilt im Stabwerk am Tragjoch und an Teilen am Masten.">
      <input type="checkbox" data-hav-achse="1"${achse ? ' checked' : ''}> Havarie: Last aufs Tragwerk übertragen (in der Achse)</label>`);
  return abschnitt(g.titel, `<span class="sec-r">${aus ? 'aus' : `${n} von ${leiter.length}`}</span>`)
    + schalter
    + (aus ? '<p class="notiz">Der Havariefall ist abgeschaltet — er wird weder nachgewiesen noch ausgeleitet.</p>'
      : leiter.length ? `
    <p class="notiz">Angehakte Leiter werden <b>einzeln</b> gerechnet — je Leiter ein Fall
      +y und −y, in dem nur er reisst; ein Kettenwerk (Fahrdraht + Tragseil) zählt als ein
      Leiter. Massgebend ist die Hülle. ${esc(regel)}</p>
    <div class="tabellenrahmen"><table class="dt dw-tab hav-tab">
      <thead><tr><th title="kann reissen">reisst</th><th>Leiter</th><th>Typ</th><th>Lage</th>
        <th title="Wie der Leiter gefuehrt ist">Abfangung</th>
        <th title="Zugrichtung der einseitigen Abfangung">Ri.</th>
        <th title="Ständiger Längszug [kN]">G_y</th>
        <th title="Änderung beim Riss dieses Leiters [kN]">Δ Riss</th>
        <th title="Leiterzugkraft bei −20 °C in +y [kN] – leer: aus der Reglagetabelle">Z +y</th>
        <th title="Leiterzugkraft bei −20 °C in −y [kN] – leer: aus der Reglagetabelle">Z −y</th></tr></thead>
      <tbody>${zeilen}</tbody>
    </table></div>
    <div class="hav-tun">
      <button class="btn btn-mini" type="button" data-hav-alle="1">alle</button>
      <button class="btn btn-mini" type="button" data-hav-alle="0">keine</button>
    </div>`
      : '<p class="notiz">Noch kein Leiter eingegeben — die Liste füllt sich mit den Anbauteilen.</p>');
}

function verdrahteHavarie(container, werte, onChange) {
  // Der NACHGEFUEHRTE Stand (`aktuelleWerte`), nicht der vom letzten vollen
  // Aufbau: seit die Abfangung auch in der Bauteilkarte steht (29. Sept.),
  // aendert man sie oft zweimal hintereinander, ohne dass die Maske neu
  // gebaut wird - die zweite Aenderung haette die erste ueberschrieben.
  const wahl = () => ({ ...((aktuelleWerte ?? werte).havarie ?? {}) });
  container.querySelectorAll('[data-hav-an]').forEach((inp) => {
    inp.addEventListener('change', () => onChange('havarieAus', !inp.checked));
  });
  const havFest = () => container.querySelector('[data-hav-zeige].aktiv');
  const havZeigen = (z) => beiDrahtwerk?.(z?.dataset.havZeige ? z.dataset.havZeige.split(',') : null);
  container.querySelectorAll('[data-hav-zeige]').forEach((z) => {
    z.addEventListener('mouseenter', () => havZeigen(z));
    z.addEventListener('mouseleave', () => havZeigen(havFest()));
    z.addEventListener('click', (e) => {
      if (e.target.closest('input, select')) return;
      const an = !z.classList.contains('aktiv');
      container.querySelectorAll('[data-hav-zeige]').forEach((x) => x.classList.remove('aktiv'));
      if (an) z.classList.add('aktiv');
      havZeigen(an ? z : null);
    });
  });
  container.querySelectorAll('[data-hav-achse]').forEach((inp) => {
    inp.addEventListener('change', () => onChange('havarieInAchse', inp.checked));
  });
  container.querySelectorAll('[data-hav]').forEach((inp) => {
    const ev = inp.type === 'checkbox' ? 'change' : 'change';
    inp.addEventListener(ev, () => {
      const w = wahl();
      const k = inp.dataset.havKey;
      const e = { ...(w[k] ?? {}) };
      if (inp.dataset.hav === 'reisst') {
        e.reisst = inp.checked;
        e.name = inp.dataset.havName ?? e.name;
      } else if (inp.dataset.hav === 'art' || inp.dataset.hav === 'richtung') {
        // Abfangart und Zugrichtung sind eine Wahl, keine Zahl. Die
        // Vorgabe wird nicht gespeichert - ein alter Stand bleibt leer.
        const vorgabe = inp.dataset.hav === 'art'
          ? abfangVorgabeFuer(tragwerksart(aktuelleWerte ?? {}).key) : '+y';
        if (inp.value && inp.value !== vorgabe) e[inp.dataset.hav] = inp.value;
        else delete e[inp.dataset.hav];
        e.name = e.name ?? inp.dataset.havName
          ?? inp.closest('tr')?.querySelector('[data-hav-name]')?.dataset.havName;
      } else {
        const v = parseFloat(inp.value);
        if (Number.isFinite(v) && v > 0) e[inp.dataset.hav] = v; else delete e[inp.dataset.hav];
      }
      w[k] = e;
      onChange('havarie', w);
    });
  });
  container.querySelectorAll('[data-hav-alle]').forEach((b) => {
    b.addEventListener('click', () => {
      const an = b.dataset.havAlle === '1';
      const w = wahl();
      havarieLeiter(werte).forEach((l) => { w[l.key] = { ...(w[l.key] ?? {}), reisst: an, name: l.name }; });
      onChange('havarie', w);
    });
  });
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
  // «Werte bearbeiten» der Lasten nur an der ersten Gruppe, die Tabellenlasten führt.
  let lastKnopfDa = false;
  container.innerHTML = gruppen.map((gid) => {
    const g = GRUPPEN.find((x) => x.id === gid);
    if (!g) return '';
    const zusatz = extras[gid] ? `<div data-extra="${gid}">${extras[gid]}</div>` : '';
    if (gid === 'anbau') return anbauteileHtml(g, werte) + zusatz;
    if (gid === 'havarie') return havarieHtml(g, werte) + zusatz;
    const felder = sichtbareFelder(gid, werte);
    // Eine Gruppe kann ohne eigenes Eingabefeld auskommen und nur aus einem
    // Zusatzstück bestehen - die Lastfallmatrix ist so ein Fall.
    if (!felder.length) return zusatz;
    const knopf = felder.some((f) => f.ausDB) ? bearbeitenKnopf(werte)
                : felder.some((f) => f.ausLast) && !lastKnopfDa
                  ? ((lastKnopfDa = true), lastenKnopf(werte)) : '';
    /* =====================================================================
     * >>> EINE ERSTE UND EINE ZWEITE EBENE. <<<
     * =====================================================================
     *
     * Weisung vom 13. September: «sidebar system aufräumen und eine bessere
     * übersicht schaffen.»
     *
     * Der Reiter war 3406 Pixel hoch bei 731 Pixel Fenster - viereinhalb
     * Bildschirme, durch die man bei jeder Massänderung scrollt. Gemessen,
     * nicht geschätzt.
     *
     * Die Länge kam nicht von zu vielen Fragen, sondern davon, dass ALLE
     * gleich laut gestellt waren: die Jochlänge, die man dauernd ändert,
     * stand neben der Gurtbreite aus dem Katalog, die man einmal im Jahr
     * anfasst.
     *
     * `fein: true` am Feld heisst: es gehört in die zweite Ebene. Der Block
     * merkt sich seinen Zustand wie jeder andere Klappabschnitt, und er
     * steht OFFEN, sobald «Werte bearbeiten» an ist - wer die Katalogmasse
     * freischaltet, will sie sehen.
     *
     * WAS NICHT IN DIE ZWEITE EBENE DARF: alles, was den Rest bestimmt. Der
     * Schalter «Tragwerk steht auf Masten» entscheidet, ob die Gruppe
     * darunter überhaupt eine Frage stellt - er bleibt oben, wie am
     * 5. September festgelegt.
     * =================================================================== */
    const haupt = felder.filter((f) => !f.fein);
    const fein = felder.filter((f) => f.fein);
    /*
     * DAS ZUSATZSTUECK KANN IN DIE ZWEITE EBENE GEHOEREN. Die Hebelarme des
     * Kraeftepaars sind die Auskunft, was aus den Katalogmassen geworden
     * ist - sie stehen dort richtig, wo diese Masse stehen, und nicht als
     * Tabelle zwischen den Fragen.
     */
    const feinExtra = g.extraFein ? zusatz : '';
    const feinBlock = fein.length || feinExtra
      ? klapp(`fein-${gid}`, g.feinTitel ?? 'Feineinstellungen',
              fein.map((f) => feldHtml(f, feldWert(f, werte), werte)).join('')
              + feinExtra,
              `${fein.length}`,
              Boolean(werte.bearbeiten && fein.some((f) => f.ausDB)))
      : '';
    /*
     * >>> EINE GANZE GRUPPE KANN ZUGEKLAPPT ANFANGEN. <<<
     *
     * Weisung vom 13. September: «bauteile optimieren». Die Trasse ist so
     * ein Fall - drei Felder, die man einmal einstellt, vor dem eigentlichen
     * Arbeitsbereich. `zugeklappt` macht aus der Ueberschrift einen
     * Klappabschnitt; er merkt sich seinen Zustand wie jeder andere, und die
     * Gruppe bleibt an ihrem Platz.
     *
     * DAS IST NICHT DASSELBE WIE `fein`. Fein trennt INNERHALB einer Gruppe
     * das Haeufige vom Seltenen; zugeklappt legt die ganze Gruppe beiseite,
     * samt ihrer zweiten Ebene.
     */
    const inhalt = haupt.map((f) => feldHtml(f, feldWert(f, werte), werte))
      .join('') + feinBlock + (feinExtra ? '' : zusatz);
    // Der Titel kann je Tragwerksart ein anderer sein (28. September).
    const titel = g.titelJe?.[tragwerksart(werte).key] ?? g.titel;
    if (g.zugeklappt) {
      return klapp(`gruppe-${gid}`, titel, inhalt, `${felder.length}`, false);
    }
    return abschnitt(titel, knopf) + inhalt;
  }).join('');

  verdrahteHavarie(container, werte, onChange);
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
    /*
     * >>> BEIM VERLASSEN ZEIGT DAS FELD, WAS GILT (28. September). <<<
     *
     * Das Feld unter dem Cursor wird beim Nachführen übersprungen, damit
     * eine halb getippte Zahl stehen bleibt. Rastet die Anwendung aber ein
     * (Längen des Abfangjochs und des Tragauslegers), blieb danach «11.4»
     * stehen, während mit 11 m gerechnet wurde - gemessen im Browser. Beim
     * Verlassen des Feldes steht deshalb der gespeicherte Wert.
     */
    if (ev === 'input' && (feld.typ === 'zahl' || feld.typ === 'schieber')
        && inp.type !== 'range') {
      inp.addEventListener('change', () => {
        const soll = feldWert(feld, aktuelleWerte ?? werte);
        if (Number.isFinite(Number(soll)) && Number(inp.value) !== Number(soll)) {
          inp.value = soll;
        }
      });
    }
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
      const mx = feldMax(f, werte);
      if (mx !== undefined) inp.max = mx;
      // Die Skala unter dem Schieber nennt dieselbe Grenze.
      const sk = inp.closest('.feld')?.querySelector('.rng-skala span:last-child');
      if (sk && mx !== undefined && sk.textContent !== String(mx)) sk.textContent = String(mx);
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
      FELDER.find((x) => x.key === inp.dataset.feld) ?? {}, werte), werte);
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
    /*
     * DIE ABGELEITETEN FELDER BRAUCHEN IHREN ABLEITER.
     *
     * `befestigung`, `anbindung` und `seite` stehen nicht immer am Bauteil -
     * sie folgen aus seiner Art, solange niemand sie gesetzt hat. Wer hier
     * roh `a[k]` liest, bekommt undefined und schreibt eine Null ins Feld;
     * das Auswahlfeld steht danach leer. Genau so war es beim Seitenfeld zu
     * sehen: «Mitte Träger» gewählt, «Seite» ohne Eintrag.
     */
    const v = k === 'befestigung' ? befestigungsArt(a)
      : k === 'anbindung' ? abfangAnbindung(a).art
      : k === 'verlauf' ? abfangAnbindung(a).verlauf
      : a[k];
    /*
     * JEDES KAESTCHEN SEINEN EIGENEN WERT (17. September). Hier stand
     * `a.aktiv !== false` fuer alle - der Bruchschalter zeigte damit nach
     * dem Ausschalten weiter «an», obwohl nicht mehr gerechnet wurde.
     */
    if (inp.type === 'checkbox') {
      inp.checked = k === 'aktiv' ? a.aktiv !== false : a[k] === true;
    } else if (inp.type === 'radio') {
      /*
       * >>> EIN RADIOKNOPF TRÄGT SEINEN EIGENEN WERT (4. Oktober). <<<
       * Gemeldet: «die befestigung an joch lässt sich nicht ändern.» Hier
       * wurde der Wert des Teils in jeden der drei Knöpfe geschrieben - danach
       * trugen alle drei «durchgehend», und ein Klick auf «Untergurt» schickte
       * wieder «durchgehend». Nachgeführt wird nur, welcher angewählt ist.
       */
      const an = String(inp.value) === String(v);
      inp.checked = an;
      inp.closest('.at-knopf')?.classList.toggle('an', an);
    } else if (String(inp.value) !== String(v ?? 0)) inp.value = v ?? 0;
  });
  // Die aus der Tabelle gerechneten Lasten der Module hängen an Trasse,
  // Spannweite und Einwirkungsklasse - sie müssen mitgefuehrt werden, auch wenn
  // sich an der Struktur der Maske nichts ändert.
  const trasse = trasseVon(werte);
  container.querySelectorAll('.at-karte').forEach((karte) => {
    const a = teilVon(+karte.dataset.idx);
    if (!a) return;
    /*
     * DIE KRAFTZEILE DER KARTE, NICHT DER ERSTE DECKEL (29. September).
     * Hier stand `karte.querySelector('.klapp-r')` - aus der Zeit, als die
     * Karte selbst ein Aufklappteil war. Seit sie eine Zeile hat, traf das
     * den ersten INNEREN Deckel, den der Ablenkung: nach jeder Eingabe stand
     * dort die Summe der Baugruppe statt des Winkels, und die Kraftzeile
     * oben blieb auf dem alten Wert (F_x 1.35 statt 2.00 bei α 2.5°).
     */
    const kraftEl = karte.querySelector('.at-kraft');
    if (kraftEl) kraftEl.textContent = `${baugruppeKraft(a, trasse)} kN`;
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
      // Die Mitte eines Länge-Teils steht nur da - sie zieht mit (7. Oktober).
      d.querySelectorAll('.at-feld.lesbar[data-feldname] b').forEach((el) => {
        const ax = el.closest('[data-feldname]').dataset.feldname;
        if (['x', 'y', 'z'].includes(ax)) el.textContent = f2(Number(m[ax]) || 0);
      });
      const l = baugruppeSumme({ ...a, module: [m], lasten: [] },
                               { ...trasse, artIndex: +d.dataset.modul });
      d.querySelector('.modul-lasten').innerHTML = modulLastenHtml(l, b);
      // Der Deckel der Ablenkung zieht mit (29. September).
      const ablD = b?.rolle === 'drahtwerk' ? d.querySelector('.klapp-r') : null;
      if (ablD) ablD.textContent = ablenkDeckel(m, trasse);
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
    // Die Lage je Punkt - aus dem ersten Block des Punkts (29. September).
    karte.querySelectorAll('.lpunkt').forEach((inp) => {
      if (inp === aktiv) return;
      const bl = (a.lasten ?? []).find((x, k) => lastPunkt(x, k) === inp.dataset.punkt);
      const v = bl?.[inp.dataset.lp] ?? 0;
      if (bl && String(inp.value) !== String(v)) inp.value = v;
    });
  });
  // Die mitgefuehrten Ergebnisstücke (Querschnittsklassen, Lastfallmatrix)
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
/**
 * >>> DER TRAGAUSLEGER NACH SEINEM SORTIMENT (28. September, Etappe 3). <<<
 *
 * Beim Ausleger stand in der Maske «Tragjoch-Typ J90» mit Bauhöhe, Gurt-
 * breiten und Winkelprofilen - das Joch, das der Ersatzbalken für ihn
 * rechnete. Das Bauteil sind aber zwei UPE 140, und seine Länge wählt eine
 * Zeile des Sortiments: Blechraster, Aufhängung und zulässige Seilkraft.
 * Genau diese Zeile steht hier, mit den Massen, die das Stabmodell baut
 * (export.axisvm.tragausleger.js) - wer sie gegen die Zeichnung prüft,
 * prüft gegen das gerechnete Bauteil.
 */
export function auslegerUebersichtHtml(w) {
  const L = Number(w?.L);
  const t = getTragausleger(L);
  if (!t) {
    const liste = tragauslegerTypen().map((z) => z.L).join(' / ');
    return `${abschnitt('Tragausleger')}
      <p class="hinweis warnt" style="margin:2px 0 0">
        ${liste
          ? `L = ${f2(L)} m steht nicht im Sortiment (${esc(liste)} m) - ohne
             Zeile kein Blechraster und keine Aufhängung, das Stabwerk rechnet
             ihn nicht.`
          : 'Das Sortiment der Tragausleger ist nicht geladen (Bauteildaten).'}
      </p>`;
  }
  let e = null;
  try { e = gurtAchsabstand(getGurtprofil(t.profil), null, t.spreizung / 10); }
  catch { e = null; }
  const n = tragauslegerBlechachsen(t).length;
  return `${abschnitt('Tragausleger nach Sortiment')}
    <div class="kennzahlen">
      ${kachel('Gurte', `2 × ${esc(t.profil)}`, `Stege innen · licht ${f0(t.spreizung)} mm`)}
      ${kachel('e', f1(e), 'cm · Gurtschwerachsen')}
      ${kachel('Bleche', `${n} × 2`, `FL ${f0(t.blech.b)}×${f0(t.blech.t)} oben und unten`)}
    </div>
    <div class="kennzahlen">
      ${kachel('b', f2(tragauslegerAufhaengung(w)?.b), `m · α ${f1(tragauslegerAufhaengung(w)?.alpha)}° · Tabelle ${f2(t.seil.b)}`)}
      ${kachel('c₁', f2(t.seil.c1), 'm · Mastachse bis Seilpunkt')}
      ${kachel('c₂', f2(t.seil.c2), 'm · Auskragung')}
    </div>
    <p class="hinweis" style="margin:2px 0 0">
      Der Ausleger beginnt ${f2(t.hinten)} m hinter der Mastachse und reicht bis
      ${f2(t.L - t.hinten)} m (Gabel um den Masten). Blechraster a ${f0(t.raster.a)}
      + n·${f0(t.raster.b)} + ${f0(t.raster.ende)} mm. Aufhängung
      ${f0(t.seil.anzahl)} × ${f0(t.seil.querschnitt)} mm², zulässig
      V = ${f1(t.Vzul)} kN lotrecht.
    </p>`;
}

export function hebelarmUebersicht(erg) {
  const m = erg.modell;
  /* =========================================================================
   * BEIM ABFANGJOCH IST ES EIN ANDERER HEBELARM.
   * =========================================================================
   *
   * Gefunden am 11. September in einem Bedienlauf: bei einem A240 stand in
   * der Maske «h = jd − zs_OG − zs_UG = 500 − 25.4 − 25.4 = 449 mm» und
   * darunter «Schenkel innen» - die Bauhoehe des J90 und die Schwerachsen
   * zweier Winkelprofile. Der Nachweis daneben rechnete mit e = 65.6 cm.
   *
   * Zwei Hebelarme fuer dieselbe Sache, und der in der EINGABE war der
   * falsche: wer sein Zeichnungsmass gegen diese Zahl prueft - und genau
   * dafuer steht der Abschnitt hier -, prueft gegen ein anderes Bauteil.
   *
   * >>> DER LIEGENDE TRAEGER HAT NUR EINEN. <<<
   *
   * Das Tragjoch steht und hat zwei: h zwischen den Gurtschwerachsen
   * (lotrecht) und b zwischen den Blechebenen (waagrecht). Das Abfangjoch
   * liegt, seine beiden Gurte stehen nebeneinander - es gibt EINEN
   * Hebelarm, und das ist ihr Achsabstand e.
   *
   * Die drei Masse daneben sind die, die auf der Zeichnung stehen: k ueber
   * alles, d licht zwischen den Stegen. e folgt daraus und ist KEINES von
   * beiden - genau die Verwechslung, gegen die dieser Abschnitt gebaut ist.
   * ======================================================================= */
  const ab = erg.abfang ?? null;
  if (ab?.q) {
    const cm = (v) => f1(v);
    const g = ab.q.gurt;
    const istU = String(g?.reihe ?? '').startsWith('U');
    return `${abschnitt('Hebelarm des Kräftepaars')}
    <div class="kennzahlen">
      ${kachel('e', cm(ab.q.e), 'cm · Gurtschwerachsen')}
      ${kachel('k', cm(ab.q.k), 'cm · Aussenmass')}
      ${kachel('d', cm(ab.q.d), 'cm · Abstand der Stege')}
    </div>
    <p class="hinweis" style="margin:2px 0 0">
      Zwei Gurte ${esc(g?.name ?? '')} NEBENEINANDER, die Rahmenebene liegt
      waagrecht. N = M/e mit e = ${cm(ab.q.e)} cm — dem Abstand der
      SCHWERACHSEN, nicht dem Aussenmass k.<br>
      ${istU
        ? `UPE: Stege innen, Flansche nach aussen — die Schwerachse liegt um
           e_y weiter aussen → e = d + 2·e_y
           = ${cm(ab.q.d)} + 2·${f1(g?.ey ?? 0)} = ${cm(ab.q.e)} cm`
        : `I-Profil: der Steg liegt in der Profilmitte, d ist damit schon der
           Achsabstand → e = d = ${cm(ab.q.e)} cm`}
    </p>`;
  }
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

export function hinweisHtml(schluessel, text, { zu = false } = {}) {
  const t = String(text ?? '').trim();
  if (!t) return '';
  /*
   * >>> GANZ ZU (3. Oktober, Bauteilkarte). <<< Auf Rückfrage «Bausteinwahl
   * mit Suche» - dazu die Erklärsätze der Karte eingeklappt: nur «Hinweis»
   * mit «mehr» steht da, der Text auf Klick. Wer die Karte zum zehnten Mal
   * öffnet, liest die Zahlen, nicht die Erklärung.
   */
  if (zu) {
    return `<details class="hinweis-klapp hinweis-zu" data-klapp="hw-${esc(schluessel)}">
    <summary><small class="hinweis">Hinweis</small></summary>
    <small class="hinweis">${esc(t)}</small></details>`;
  }
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
/**
 * Die obere Grenze eines Feldes - fest (`max`) oder aus dem Stand
 * (`maxAus`, z. B. der Mastkopf beim Fahrdrahtschieber, 28. September).
 */
function feldMax(f, werte) {
  if (typeof f.maxAus === 'function') {
    const v = Number(f.maxAus(werte));
    if (Number.isFinite(v) && v > 0) return Math.round(v * 100) / 100;
  }
  return f.max;
}

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
/**
 * Der Laengenbereich eines Tragwerks - aus SEINEM Sortiment.
 *
 * Ein Abfangjoch fuehrt A160 bis A360, ein Tragjoch J60 bis J130. Blind
 * `getTragjoch` zu fragen warf «Unbekannter Tragjochtyp: A160», und zwar
 * beim blossen Ziehen an einer Mastmarke - weit weg von der Eingabe.
 */
function bereichVonTyp(t) {
  try {
    return tragwerksart(t).key === 'abfangjoch'
      ? abfangLaengenbereich(t.abfangTyp)
      : laengenbereich(getTragjoch(t.typ));
  } catch {
    // Ein unbekannter Typ darf das Ziehen nicht anhalten.
    return { min: 0, max: Infinity, text: 'frei' };
  }
}

/**
 * >>> EINEN MASTEN AN EINE STELLE SETZEN - Länge des linken, Lage des
 * rechten Tragwerks (aus app.js, 1. Oktober). <<<
 *
 * @param {object} werte   Blatt
 * @param {object} r       `mastRollen(werte, mastId)`
 * @param {number} xZiel   gewünschte Stelle [m]
 * @returns {object} das neue Blatt
 */
export function mastStelleSetzen(werte, r, xZiel) {
  const setzeAn = (id, feld, v) => {
    if ((werte.twId ?? 'T1') !== id) werte = tauscheAktives(werte, id);
    werte = { ...werte, [feld]: v };
  };
  /*
   * >>> DER GETEILTE MAST: BEIDE JOCHE IN EINEM ZUG (1. Oktober). <<<
   *
   * Gemeldet: «wenn mehrere joche in reihe stehen, dann macht der überstand
   * und das nachträgliche schieben des mittleren masten probleme.»
   * Gemessen (2 × J90, 20 + 15 m, ohne Kragarm): Mast M2 von 20 auf 22 m
   * gezogen ergab T1 0..20 und T2 22..37 - VIER Masten, die Reihe
   * auseinander. Das linke Joch wurde zuerst verlängert, und `freieLaenge`
   * hielt es am rechten an, das noch an der alten Stelle stand; danach
   * wanderte das rechte allein. Nach links ging es, weil dort nichts im
   * Weg stand. Mit Kragarm am Zwischenmasten riss die Reihe in beide
   * Richtungen (die Gurte decken sich dort um c_B + c_A).
   *
   * Der Partner, der im selben Zug mitwandert, ist deshalb KEIN Hindernis
   * (`ohne`). Zuerst die Lage des rechten (es behält seine Länge, darf aber
   * nicht in den Dritten hinein), dann die Länge des linken bis genau
   * dorthin; hält das linke früher an, rückt das rechte nach - die beiden
   * Enden bleiben auf EINEM Masten.
   */
  /*
   * >>> AM ABFANGJOCH STEHT DER MAST, WO ER LOSGELASSEN WIRD (4. Oktober). <<<
   * Beim Ziehen im 3D gefunden (Weisung «beim abfangjoch kann man keine
   * drag and drop befehle ausführen bei den masten»): die Lage eines
   * Abfangjochs ist sein erster Mast, der Mast B steht bei L − 2·ü
   * (`mastLagen`), und ü kommt aus dem Sortiment - für eine Länge, die es
   * führt, der Überstand der grössten Stützweite, sonst 0. Hier wurde
   * L = Mastabstand gesetzt: bei einer gefuehrten Länge rückte der Mast
   * danach um 2·ü zurück (Ziel 12.00 m → Mast bei 11.50 m, L 12.00).
   * `abfangLaengeFuer` wählt die Länge, deren Mastlage das Ziel trifft:
   * Mastabstand + 2·ü, wenn das Sortiment sie führt, sonst der Abstand
   * selbst (ohne Überstand - der Hinweis nennt dann das passende Joch,
   * Entscheid vom 20. September «Warnen, Berichtigung auf Klick»).
   */
  const abfang = (t) => tragwerksart(t).key === 'abfangjoch';
  const jsVon = (t, L) => L - 2 * abfangUeberstand({ ...t, L });
  const abfangLaengeFuer = (t, js) => {
    let gefuehrt = [];
    try { gefuehrt = abfangLaengen(t.abfangTyp); } catch { gefuehrt = []; }
    return [...gefuehrt, js].find((L) => Math.abs(jsVon(t, L) - js) < 1e-6) ?? js;
  };
  const kB = r.alsB ? kragarme(r.alsB.t)[1] : 0;
  const kA = r.alsA ? kragarme(r.alsA.t)[0] : 0;
  /*
   * >>> DER GEHALTENE MAST AM ANDEREN ENDE BLEIBT STEHEN (3. Oktober). <<<
   *
   * Gemeldet: «wenn ich hier den linken masten ziehe dann entzwei ich das
   * modell (joch / tragausleger)» - M1 gezogen schob das ganze Joch samt
   * M2, der Ausleger an M2 blieb an der alten Stelle. Auf Rückfrage «M2
   * bleibt, Joch passt sich an»: trägt ein ANDERES Tragwerk den Masten am
   * Ende B, bleibt er stehen; das Joch beginnt an der neuen Stelle und
   * ändert seine Stützweite (die Standardlänge führt app.js danach nach).
   * Teile auf dem Joch und die Nachweisstelle behalten ihre Lage auf dem
   * Blatt (wie beim Kragarm, 30. September).
   */
  if (r.alsA && !r.alsB && tragwerksart(r.alsA.t).key !== 'tragausleger') {
    const t = r.alsA.t;
    const mB = mastenFuer(werte, t)[1];
    const gehalten = mB && (mastenVon(werte).find((q) => q.id === mB.id)?.traegt ?? [])
      .some((id) => id !== t.id);
    if (gehalten) {
      const kBt = kragarme(t)[1];
      const ende = Number(mB.x) + kBt;               // Gurtende bleibt
      const b = bereichVonTyp(t);
      const r6 = (v) => Math.round(v * 1e6) / 1e6;
      let lage = xZiel - kA;
      let L = abfang(t) ? abfangLaengeFuer(t, Number(mB.x) - xZiel) : ende - lage;
      if (L < b.min) L = b.min;
      if (L > b.max) L = b.max;
      lage = abfang(t) ? r6(Number(mB.x) - jsVon(t, L)) : r6(ende - L);
      const dx = r6(lage - (Number(t.xLage) || 0));
      return tragwerkAendern(werte, t.id, (q) => {
        const f = { xLage: lage, L: r6(L) };
        f.anbauteile = (q.anbauteile ?? []).map((a) => (a && !amMast(a)
          && Number.isFinite(Number(a.x)) ? { ...a, x: r6(Number(a.x) - dx) } : a));
        if (Number.isFinite(Number(q.xNachweis))) f.xNachweis = r6(Number(q.xNachweis) - dx);
        return f;
      });
    }
  }
  let x = xZiel;
  if (r.alsA && r.alsB) {
    /*
     * BEIM GETEILTEN MASTEN SPRINGT NICHTS. `freieLage` setzt ein Tragwerk,
     * das mitten in einem anderen landet, auf die nähere Seite - auch
     * HINTER den Nachbarn. Gemessen an drei Jochen (0/20/35/45 m): M2 auf
     * 40 gezogen landete T2 hinter T3, und T1 endete auf T3. Hier wandert
     * das rechte höchstens bis an das nächste Hindernis rechts von ihm:
     * soweit kann es wachsen, so weit darf es rücken.
     */
    const L2 = Number(r.alsA.t.L) || 0;
    const platz = freieLaenge(werte, r.alsA.t.id, Infinity, [r.alsB.t.id]).L - L2;
    x = Math.min(x, r.x + Math.max(0, platz));
  } else if (r.alsA) {
    // DAS RECHTE TRAGWERK BEHAELT SEINE LAENGE UND WANDERT MIT - aber nicht
    // in seinen Nachbarn hinein. `freieLage` entscheidet, wohin es darf.
    x = freieLage(werte, r.alsA.t.id, x - kA).x + kA;
  }
  if (r.alsB) {
    /*
     * DIE LAENGE WAECHST NICHT UEBER EINEN FREMDEN MASTEN HINWEG.
     *
     * Am Ende B gezogen wird das Joch laenger - und koennte dabei den
     * Masten schlucken, der daneben steht. `freieLaenge` haelt es an ihm
     * an; das Ende darf darauf liegen, denn dort steht dann der
     * gemeinsame Mast. Mit Kragarm ragt das Joch um c_B über den Masten
     * (30. September).
     */
    const tB = r.alsB.t;
    const roh = abfang(tB) ? abfangLaengeFuer(tB, Math.max(0, x - r.alsB.x0))
                           : Math.max(0, x - r.alsB.x0) + kB;
    const L = freieLaenge(werte, tB.id, roh, r.alsA ? [r.alsA.t.id] : []).L;
    x = r.alsB.x0 + (abfang(tB) ? jsVon(tB, L) : L - kB);
    setzeAn(r.alsB.t.id, 'L', L);
  }
  if (r.alsA) setzeAn(r.alsA.t.id, 'xLage', x - kA);
  return werte;
}

/**
 * >>> DAS JOCH AUF SEINE STANDARDLÄNGE (2. Oktober). <<<
 *
 * Weisung: «die jochlängen auf die hinterlegten standardlängen anpassen
 * lassen, wenn auskragung oder mastabstände angepasst werden. die ungeraden
 * jochlängen werden nur dann angewendet, wenn eine jochreihe vorkommt und es
 * auf gleicher höhe mehrere joche zu liegen kommen, dann muss das endfeld
 * gekürzt werden jeweils, damit es passt und es einen abstand von min 5 cm
 * bis 10 cm von joch zu joch (stehendes endblech) hat.»
 * Auf Rückfrage «Aufrunden, Rest als Kragarm»: ist L keine Länge des
 * Sortiments (Raster 0.5 m), springt sie auf die nächste grössere; die
 * Masten bleiben, der Überschuss geht gleich verteilt in c_A und c_B. Ein
 * Ende, an dem ein anderes Joch auf derselben Anschlusshöhe am selben
 * Masten anschliesst (Stoss in der Reihe), bekommt nichts - dort ist kein
 * Platz; der Überschuss geht ans freie Ende. Stossen beide Enden, bleibt L
 * (Endfeld kürzen, Rückfrage «Beide Joche je halb, Spalt 10 cm» - eigener
 * Schritt).
 *
 * @returns {{werte:object, info:object|null}}  info: {id, L0, L, dA, dB}
 */
export function jochAufStandardlaenge(werte, id) {
  const ohne = { werte, info: null };
  const t = tragwerkeVon(werte).find((x) => x.id === id);
  if (!t || tragwerksart(t).key !== 'joch') return ohne;
  let joch;
  try { joch = getTragjoch(t.typ); } catch { return ohne; }
  const std = moeglicheLaengen(joch).map((e) => e.wert);
  const L = Number(t.L) || 0;
  if (!std.length || std.some((v) => Math.abs(v - L) < 1e-6)) return ohne;
  const Lstd = std.find((v) => v > L);
  if (!(Lstd > 0)) return ohne;            // über dem Sortiment: die Meldung sagt es
  const stossA = jochStoss(werte, t, 'A'), stossB = jochStoss(werte, t, 'B');
  if (stossA && stossB) return ohne;
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  const extra = r6(Lstd - L);
  const dA = stossA ? 0 : stossB ? extra : r6(extra / 2);
  const dB = r6(extra - dA);
  const [kA, kB] = kragarme(t);
  const neu = tragwerkAendern(werte, id, (x) => {
    const f = { L: Lstd, kragA: r6(kA + dA), kragB: r6(kB + dB), kragMasten: true };
    if (dA) {
      if (Number.isFinite(Number(x.xLage))) f.xLage = r6(Number(x.xLage) - dA);
      // Die Teile auf dem Joch stehen lokal ab dem Gurtanfang - sie rücken
      // mit, ihre Lage auf dem Blatt bleibt (wie beim Kragarm, 30. Sept.).
      f.anbauteile = (x.anbauteile ?? []).map((a) => (a && !amMast(a)
        && Number.isFinite(Number(a.x)) ? { ...a, x: r6(Number(a.x) + dA) } : a));
      if (Number.isFinite(Number(x.xNachweis))) f.xNachweis = r6(Number(x.xNachweis) + dA);
    }
    return f;
  });
  return { werte: neu, info: { id, L0: L, L: Lstd, dA, dB } };
}

/**
 * Stösst an diesem Ende ein anderes Tragjoch auf derselben Anschlusshöhe an
 * denselben Masten (Reihe, B an A bzw. A an B)? Dann ist dort kein Platz
 * für einen Kragarm.
 */
export function jochStoss(werte, t, ende) {
  // Eine Stelle für die Regel: `stossEnden` (core.constants.js), die auch
  // der Kern zum Kürzen des Endfelds liest.
  return stossEnden(werte, t)[ende] === true;
}

export function mastGrenzen(rollen, x) {
  let unten = -Infinity, oben = Infinity;
  if (rollen.alsB) {
    const b = bereichVonTyp(rollen.alsB.t);
    // Der Bereich gilt der Gurtlänge; mit Kragarm steht der Mast um c_B
    // innen (30. September), seine Grenzen also auch.
    const kB = kragarme(rollen.alsB.t)[1];
    unten = Math.max(unten, rollen.alsB.x0 + b.min - kB);
    oben = Math.min(oben, rollen.alsB.x0 + b.max - kB);
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
  /*
   * >>> DAS ZIEHEN IST RAUS. <<<
   *
   * Weisung vom 5. September: «nimm die funktion des drag and drop in der
   * sidebar unter tragwerke raus, diese funktion ist zu unpraezise.»
   *
   * Sie war es. Die Bahn ist ein paar hundert Pixel breit und traegt bis zu
   * vierzig Meter Querprofil - ein Pixel sind zehn Zentimeter, und der
   * Zeiger trifft schon den Nachbarn, bevor man losgelassen hat. Ein
   * Mastabstand, den man auf zehn Zentimeter genau BRAUCHT, laesst sich so
   * nicht setzen; man zieht, liest die Zahl, zieht nach, und tippt am Ende
   * doch.
   *
   * Was bleibt: ANKLICKEN waehlt, RECHTSKLICK oeffnet das Kontextmenue.
   * Dort steht die Stelle als ZAHL - und im Modell stehen jetzt Kopieren,
   * Verschieben und Entfernen (siehe `kontextTragwerk` in app.js).
   */
  container.querySelectorAll('[data-qp-mast]').forEach((b) => {
    const mastId = b.dataset.qpMast;
    b.addEventListener('click', () => onChange('mastAktiv', mastId));
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      onChange('kontextMast', { id: mastId, bei: [e.clientX, e.clientY] });
    });
  });

  /*
   * >>> DAS AUFKLAPPMENUE DER BAUFORMEN. <<<
   *
   * Es klappt beim Waehlen nicht selbst zu - die Maske wird ohnehin neu
   * gebaut, sobald ein Tragwerk dazukommt. Es klappt zu, wenn man daneben
   * klickt; alles andere waere ein Menue, das offen stehen bleibt.
   *
   * >>> ES WAR VIER TAGE LANG TOT. <<<
   *
   * Gemeldet am 9. September: «funktioniert dieser button +Tragwerke?» -
   * Nein. Der Horcher fiel am 5. September weg, als das ZIEHEN aus der
   * Leiste genommen wurde: der Schnitt lief von `[data-qp-mast]` bis zum
   * naechsten Block, und dieses Menue lag dazwischen. Der Knopf stand
   * seither da und tat nichts.
   *
   * Der Pruefstand haelt das jetzt fest (siehe «Die Leiste bleibt
   * bedienbar»): jedes `data-...` der Leiste braucht seinen Horcher.
   */
  /*
   * DERSELBE GRUND WIE OBEN: das Ziehen des Tragwerksbalkens ist raus
   * (Weisung, 5. September). Anklicken waehlt, Rechtsklick oeffnet das
   * Kontextmenue - und dort steht die Lage als Zahl.
   */
  // Die Ankerzeile fuehrt auf denselben Dialog - mit ihrem Masten vorbelegt.
  container.querySelectorAll('[data-qp-anker]').forEach((b) => {
    b.addEventListener('click', () => onChange('ankerDialog', b.dataset.qpAnker));
  });
  /*
   * >>> ERSTER KLICK WAEHLT, ZWEITER OEFFNET. <<<
   *
   * Weisung vom 11. September: «und wenn man es anklickt» - das Fenster
   * soll sich auch am bestehenden Tragwerk oeffnen lassen.
   *
   * Wuerde schon der erste Klick es oeffnen, waere das schnelle Umschalten
   * zwischen zwei Tragwerken dahin: man klickt auf P2, um dessen Zahlen zu
   * sehen, nicht um es zu bearbeiten. So bleibt beides - und die
   * Ankerzeile daneben macht es genauso.
   */
  container.querySelectorAll('[data-qp-tw]').forEach((b) => {
    b.addEventListener('click', () => onChange(
      b.dataset.qpTw === (werte.twId ?? 'T1') ? 'tragwerkDialog' : 'tragwerkAktiv',
      b.dataset.qpTw));
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      onChange('kontextTragwerk', { id: b.dataset.qpTw,
                                    bei: [e.clientX, e.clientY] });
    });
  });
}

/*
 * >>> DIE MASTNOTIZ IST WEG. <<<
 *
 * Weisung vom 9. September: «die benennung unterhalb braucht es nicht, diese
 * ist schon oben enthalten.»
 *
 * Sie stand unter der Leiste - «M2 · HEB 240» - und sagte, welchen Masten die
 * Felder darunter meinen. Seit die Masten ihre eigene Zeile haben (Weisung
 * vom selben Tag), steht dort dasselbe und mehr: «M2 · MAST / HEB 240 ·
 * x 26.50 m», und der angewaehlte ist hervorgehoben. Zweimal dieselbe Angabe
 * untereinander liest man als zwei verschiedene.
 */

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
  /*
   * >>> DAS DIAGRAMM IST DIE EINGABE. <<<
   *
   * Ein Klick auf einen Pfeil schaltet den Freiheitsgrad um, ein Wert im
   * Feld darunter macht daraus eine Feder. Beides schreibt in DASSELBE Feld
   * `auflagerLinks` - die Maske traegt keinen eigenen Zustand, sondern liest
   * ihn beim naechsten Durchgang wieder aus den Werten.
   */
  verdrahteAuflagerLinks(container, werte, onChange);

  /*
   * >>> DIE ART WAEHLT MAN IM FENSTER, NICHT IM MENUE. <<<
   *
   * Weisung vom 11. September: «dies beim erstellen eines tragweks
   * einblenden». Das Menue legte bis hierher sofort an - mit Vorgabetyp und
   * Vorgabelaenge -, und danach suchte man in der Maske die vier Felder
   * zusammen. Jetzt fragt der Dialog sie, und er kommt mit der angeklickten
   * Art schon vorbelegt.
   */
  container.querySelectorAll('[data-tw-neu]').forEach((b) => {
    b.addEventListener('click', () => onChange('tragwerkDialog', b.dataset.twNeu));
    // Ins 3D ziehen (30. September): abgelegt wird in app.js.
    b.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/tragjoch-tragwerk', b.dataset.twNeu);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });
  /*
   * DER ANKER MELDET SICH WIE JEDE ANDERE EINGABE - ueber `onChange`. Die
   * Anwendung oeffnet den Dialog; die Maske weiss nicht, wie er aussieht,
   * und soll es nicht wissen. Ohne Mastangabe heisst: der Dialog fragt.
   */
  container.querySelectorAll('[data-anker-neu]').forEach((b) => {
    b.addEventListener('click', () => onChange('ankerDialog', null));
    b.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/tragjoch-anker', '1');
      e.dataTransfer.effectAllowed = 'copy';
    });
  });
  // `data-tw-mast` gibt es nicht mehr - das Auge an der Mastkachel meldet
  // dieselbe Absicht (siehe `data-qp-mastsicht` in verdrahteLeiste).
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
/*
 * >>> DIE SYMBOLE DER KACHELN (30. September). <<<
 * Weisung: «kannst du hier die kacheln mit symbolzeichnung noch versehen den
 * text kann man dann kleiner unterhalb des symbols aufführen.» Ansicht quer
 * zum Gleis, in der Strichsprache des Lagebands: Masten als Senkrechte auf
 * dem Boden, das Tragjoch als Vierendeelträger (Gurte mit Pfosten), das
 * Abfangjoch als zwei Träger übereinander (Tragseil- und
 * Fahrdrahtabfangung), der Ausleger mit seinem Seil, der Anker als
 * gestrichelte Strebe zu einem eigenen Fundament. Farbe = Schrift.
 */
const tws = (inhalt) => `<svg class="qp-symbol" viewBox="0 0 48 32" aria-hidden="true"
  fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
  stroke-linejoin="round">${inhalt}</svg>`;
// Einzeilige Anschrift, damit alle Kacheln gleich hoch sind (30. Sept.);
// der volle Name steht im Titel.
const KACHEL_NAME = { tragausleger: 'Tragausleger' };
const TW_SYMBOLE = {
  joch: tws('<path d="M4 30h40M10 30V6M38 30V6"/>'
    + '<path d="M8 6h32M8 11h32M16 6v5M24 6v5M32 6v5"/>'),
  // Einzelmast mit einem kurzen Ausleger angedeutet, Ausleger als einfacher
  // Strich, Anker durchgezogen (Weisung 30. September).
  einzelmast: tws('<path d="M4 30h40M22 30V4M22 9h12M34 9v4"/>'
    + '<rect x="18" y="28" width="8" height="3" fill="currentColor" stroke="none"/>'),
  tragausleger: tws('<path d="M4 30h40M12 30V3M12 15h32"/>'
    + '<path d="M12 4l22 11" stroke-dasharray="2.5 2"/>'),
  abfangjoch: tws('<path d="M4 30h40M10 30V5M38 30V5"/>'
    + '<path d="M8 6h32M8 8.5h32M8 14h32M8 16.5h32"/>'),
  anker: tws('<path d="M4 30h40M14 30V4"/>'
    + '<path d="M14 11l24 18"/>'
    + '<rect x="35" y="28" width="7" height="3" fill="currentColor" stroke="none"/>'),
};

function tragwerkfeldHtml(werte) {
  const alle = tragwerkeSortiert(werte);
  const aktiv = alle.find((t) => t.id === (werte.twId ?? 'T1')) ?? alle[0];
  const art = tragwerksart(aktiv);
return querprofilLeisteHtml(werte)
    /* =====================================================================
     * >>> KACHELN STATT «+ TRAGWERK» (30. September). <<<
     *
     * Weisung: «was ich mir auch vorstellen könnte ist, dass wir wieder auf
     * die kacheln beim tragwerk gehen, diese könnte man dann per drag and
     * drop auf die 3d fläche ziehen und man bekommt ein modalfenster mit
     * den relevantesten eingaben zum tragwerk», auf Rückfrage «Beides».
     * Anklicken öffnet den Dialog wie bisher das Menü; ins 3D gezogen öffnet
     * er ihn an der Stelle, die Masten links und rechts vorgewählt
     * (app.js, `verdrahteAblegen`). Zuganker / Druckstütze steht als letzte
     * Kachel da - auf einen Masten gezogen, gehört der Stab ihm.
     * Farbig wie der Knopf vorher («mach den tragerk+ button farbig, da
     * wichtig», 19. September).
     * =================================================================== */
    + '<div class="qp-kacheln" role="group" aria-label="Neues Tragwerk">'
    + TRAGWERKSARTEN.map((x) =>
        `<button type="button" class="qp-kachel" data-tw-neu="${esc(x.key)}" draggable="true"
           title="${esc(`${x.kurz} - anklicken oder ins 3D ziehen`
             + (x.key === 'tragausleger' ? '; auf einen vorhandenen Masten gezogen, hängt er dort an' : ''))}"
           >${TW_SYMBOLE[x.key] ?? ''}<span>${esc(KACHEL_NAME[x.key] ?? x.label)}</span></button>`).join('')
    + `<button type="button" class="qp-kachel qp-kachel-anker" data-anker-neu draggable="true"
         title="${esc('Schräger Stab vom Masten zu einem eigenen Fundament, an beiden '
           + 'Enden gelenkig - er trägt nur Normalkraft. Anklicken oder auf einen Masten ziehen.')}"
         >${TW_SYMBOLE.anker}<span>Anker</span></button>`
    + '</div>'
    + '<div class="qp-tun">'
    /*
     * EIN MENUE STATT VIER KNOEPFEN. Die vier Bauformen standen als vier
     * gleich aussehende Knoepfe da und nahmen zwei Zeilen ein - obwohl man
     * sie selten braucht und nie zwei davon zugleich.
     */
    // Farbig (Weisung vom 19. September: «mach den tragerk+ button farbig,
    // da wichtig») - der Weg zu jedem weiteren Tragwerk des Blattes.
    /*
     * >>> DREI HANDLUNGEN AM TRAGWERK, RECHTS UND NUR ALS ZEICHEN. <<<
     *
     * Weisung vom 3. September: «diese buttons koennte man auch als einfache
     * symbole rechts anordnen.» Beschriftet nahmen sie die ganze Breite der
     * Zeile ein und draengten «+ Tragwerk» an den Rand - dabei ist das der
     * eine Knopf, den man sucht, und die drei anderen gelten dem, was schon
     * da ist. Rechts, klein, mit Titel beim Ueberfahren.
     *
     * AUSBLENDEN IST NICHT ENTFERNEN. Entfernen wirft die Eingaben weg;
     * Ausblenden legt den Abschnitt beiseite - er bleibt im Datensatz,
     * verschwindet aber aus Bild, Bauteilliste, Ausleitung und Nachweis.
     * Deshalb bleibt das Entfernen rot und steht ganz aussen.
     *
     * Nur wenn noch ein sichtbares uebrig bleibt: ein Blatt ohne
     * gerechnetes Tragwerk waere eine Auswertung ohne Gegenstand.
     */
    /*
     * >>> DER MASTKNOPF STEHT NICHT MEHR HIER. <<<
     *
     * Weisung vom 5. September: «Dieser button wirkt hier etwas verloren,
     * kann man dies mit einem allgemeinen sichtbarkeitssymbol austauschen.»
     *
     * Er sass in der Ecke der Handlungszeile — weit weg von dem, was er
     * schaltet, und bei einem einzelnen Tragwerk als EINZIGER Knopf, weil
     * Ausblenden und Entfernen dann beide entfallen. Das Auge sitzt jetzt an
     * der Mastkachel, wo der Mast steht; dieselbe Form wie an der
     * Tragwerkszeile.
     */
    + '<span class="qp-tun-rechts">'
    + (alle.filter((t) => !versteckt(t)).length > 1
      ? `<button type="button" class="btn-icon"
           data-tw-aus="${esc(aktiv.id)}"
           aria-label="Ausblenden"
           title="Beiseitelegen — bleibt gespeichert, zählt aber nicht mehr"
           >${icon('auge', 14)}</button>` : '')
    + (alle.length > 1
      ? `<button type="button" class="btn-icon btn-icon-weg"
           data-tw-weg="${esc(aktiv.id)}"
           aria-label="Entfernen"
           title="${esc(`${tragwerkName(aktiv, werte)} vom Blatt nehmen`)}"
           >${icon('loeschen', 14)}</button>` : '')
    + '</span>'
    + '</div>';
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

/** +1 rechts (Vorgabe), −1 links - die Seite des Tragauslegers (28. Sept.). */
const auslegerRichtung = (t) => (t?.auslegerSeite === 'links' ? -1 : 1);

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
    // Der Tragausleger reicht vom Masten bis zum Kragarmende, zu seiner
    // Seite hin (28. September).
    if (tragwerksart(t).key === 'tragausleger') {
      return [a, a + auslegerRichtung(t) * kragarmEnde(t)];
    }
    // Das Abfangjoch beginnt um seinen Ueberstand VOR dem ersten Masten.
    const a0 = tragwerksart(t).key === 'abfangjoch' ? lageOrtsnull(t) : a;
    return [a0, a0 + (tragwerksart(t).masten >= 2 ? (Number(t.L) || 0) : 0)];
  });
  let von = Math.min(...enden, 0), bis = Math.max(...enden, 1);
  /*
   * >>> MINDESTENS 20 m BREIT (30. September). <<<
   * Gemeldet: «wenn ich einen tragausleger bei x 60m habe und dann auf 0 das
   * x stelle, entsteht ein überlanger ausleger in der tragweksskizze».
   * Gemessen: bei x 60 reichte das Band bis 73.9 m, der Ausleger nahm 12 %
   * der Breite; bei x 0 schrumpfte es auf −1.5 … 11.3 m, und derselbe
   * 10-m-Ausleger füllte 76 % - massstäblich richtig, neben dem festen
   * Mastsymbol aber überlang. Ein Band von mindestens einer üblichen
   * Jochlänge hält ein einzelnes Tragwerk im Verhältnis; eine Reihe ist
   * ohnehin breiter und bleibt unberührt.
   */
  const MIN = 20;
  if (bis - von < MIN) {
    const mitte = (von + bis) / 2;
    von = mitte - MIN / 2;
    bis = mitte + MIN / 2;
  }
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
 * >>> UND JE MAST EINE ZEILE, ANGESCHRIEBEN WIE DIE JOCHE. <<<
 *
 * Weisung vom 9. September: «Die masten direkt anschreiben wie bei den
 * jochen (bessere übersicht).»
 *
 * Sie standen als kleiner Aufriss unter der gemeinsamen Achse - Schaft,
 * Fundament, Gelaendelinie - und trugen als ganze Beschriftung ihre
 * x-Stelle. Welches Profil dort steht, wie hoch der Mast ist, welchem
 * Tragwerk er gehoert: nichts davon war zu sehen, es stand im Titel, den man
 * erst mit dem Zeiger findet.
 *
 * Jetzt dieselbe Zeile wie beim Joch - Kuerzel, Name, Marke auf der
 * gemeinsamen Bahn:
 *
 *      P1 · Joch     J90 · 20.00 m      ├────────────┤
 *      M1 · Mast     HEB 240 · 0.00 m   ▲
 *      M2 · Mast     HEB 240 · 20.00 m               ▲
 *
 * Der Aufriss ging dabei verloren, die UEBERSICHT gewonnen: auf einer
 * Jochreihe steht jetzt jedes Bauteil mit Namen da, und die Bahn zeigt
 * weiterhin, was wo steht.
 *
 * >>> DIE MARKE IST EIN AUFLAGERDREIECK. <<<
 *
 * Das Joch traegt seine Linie mit Endmarken, der Mast sein Dreieck - beides
 * die Zeichensprache, die man aus dem Schema kennt. Ein geteilter Mast
 * bekommt den breiteren Fuss; er traegt zwei.
 *
 * @param {object} werte
 */


/*
 * AB WIEVIEL BREITE DAS ZWEITE MASS PLATZ HAT [% der Bahn].
 *
 * Zwei Zahlen zu 8.5 px brauchen gut 60 px; eine Bahn in der Seitenspalte
 * ist rund 300 px breit. Unter 20 % liefen sie ineinander - dann steht nur
 * der Anfang da, und das Ende liest man am Masten darunter.
 */
const MASS_PLATZ = 20;

/**
 * >>> DIE AUSRICHTUNG DES PROFILS UNTER DEM MASTEN (6. Oktober). <<<
 * Weisung im Wortlaut: «Unterhalb vom Masten die Ausrichtung des Profils
 * aufzeigen». Der Schnitt in der Draufsicht (x nach rechts = Jochachse):
 * Steg in der Jochachse liegt waagrecht zwischen zwei Flanschen («H»), Steg
 * quer zum Gleis steht («I»). Der Titel sagt es in Worten.
 */
function stegGlyphe(steg) {
  const quer = steg === 'quer';
  const pfad = quer ? 'M2 1H10M6 1V11M2 11H10' : 'M1 2V10M11 2V10M1 6H11';
  return `<span class="qp-mast-steg" title="${quer ? 'Steg quer zum Gleis' : 'Steg in der Jochachse'}">`
    + `<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="${pfad}" `
    + 'stroke="currentColor" stroke-width="1.6" fill="none"/></svg></span>';
}

export function querprofilLeisteHtml(werte) {
  const alle = tragwerkeSortiert(werte);
  if (!alle.length) return '';
  const { von, bis } = qpBereich(werte);
  const aktivId = werte.twId ?? 'T1';
  const gewMast = gewaehlterMast(werte);
  const masten = mastenVon(werte);

  /*
   * >>> DIE LINIE SCHWEIGT, WO EIN MAST STEHT. <<<
   *
   * Die Enden eines Jochs sind seine Masten - und die schreiben ihre Lage
   * selbst an, eine Zeile tiefer auf derselben Bahn. Stuende sie auch an
   * der Linie, laege dieselbe Zahl zweimal untereinander. Angeschrieben
   * wird deshalb nur ein Ende OHNE Masten: das Tragwerk, das ohne Masten
   * steht, und die Jochreihe, deren Zwischenmast zwei Enden zugleich
   * traegt.
   */
  /*
   * >>> EIN EINZELMAST IST SEIN TRAGWERK - KEINE ZWEITE ZEILE. <<<
   *
   * Bei einer Bauform mit EINEM Masten sind Tragwerk und Mast dasselbe
   * Bauteil: die Tragwerkszeile heisst «P1 · Mast / HEB 260 · 7.50 m», die
   * Mastzeile hiesse «M1 · Mast / HEB 260 · 7.50 m». Zweimal dieselbe
   * Angabe untereinander ist keine Gleichwertigkeit, sondern Rauschen.
   *
   * AUSNAHME: ein ANKER. Er haengt am Masten, nicht am Tragwerk, und sein
   * Strich braucht eine Bahn - dann steht die Zeile wieder da. Und sobald
   * der Mast ein Joch traegt (zwei Masten), gilt sie ohnehin.
   */
  /*
   * DIE MASTEN: Schaft, Fundament, Gelaendelinie - ein kleiner Aufriss unter
   * der Liste. Der geteilte hat ein breiteres Fundament: er traegt zwei.
   */
  /*
   * >>> EIN SICHTBARKEITSSYMBOL, AN JEDEM ELEMENT. <<<
   *
   * Weisung vom 5. September, zum einsamen Mastknopf in der Handlungszeile:
   * «Dieser button wirkt hier etwas verloren, kann man dies mit einem
   * allgemeinen sichtbarkeitssymbol austauschen, dieses würde dann für die
   * aktiven elemente (joche oder masten).»
   *
   * Das Auge gab es schon — an jeder Tragwerkszeile, links vom Namen. Es
   * fehlte nur an den MASTEN, und deshalb stand deren Schalter als eigenes,
   * fremd aussehendes Symbol in der Ecke der Handlungszeile: weit weg von
   * dem, was er schaltet, und als einziger Knopf, wenn nur ein Tragwerk auf
   * dem Blatt steht.
   *
   * Jetzt trägt jedes Element sein eigenes Auge — dieselbe Form, dieselbe
   * Bedeutung: was aus ist, zählt nicht mehr in Bild, Bauteilliste,
   * Ausleitung und Nachweis.
   *
   * >>> `mastVorhanden` GILT DEM TRAGWERK, NICHT DEM EINZELNEN MASTEN. <<<
   *
   * Ein Joch steht auf Masten oder ohne — beide Enden zugleich. Geschaltet
   * wird das in der Maske («Tragwerk steht auf Masten») oder im Kontextmenü
   * des Masten; die Leiste zeigt nur, was dasteht.
   */
  /*
   * >>> DAS AUGE FUER DIE MASTEN IST RAUS. <<<
   *
   * Weisung vom 9. September: «ich versteh die logik nicht beim ein
   * ausblenden der masten, in der 3d abbildung werden gewisse nachgeschoben.
   * die frage ist auch, warum sollte man einzelne masten ausblenden wollen
   * die in einer jochreihe stehen.»
   *
   * Drei Gruende, und der dritte ist der eigentliche:
   *
   * ES WAR KEINE SICHTBARKEIT. `mastVorhanden` sagt, ob das Tragwerk AUF
   * MASTEN STEHT - eine Modellangabe, die das Joch gelenkig lagert und den
   * Mastnachweis wegnimmt. Neben dem Auge fuers Ausblenden sah es aus wie
   * ein zweites Auge fuer dasselbe.
   *
   * ES STAND ZWEIMAL DA. Der Schalter «Tragwerk steht auf Masten» steht
   * seit dem 5. September zuoberst in der Gruppe Masten - auf Weisung.
   *
   * IN EINER REIHE ERGIBT ER KEINEN FALL. Die Tragwerke teilen sich die
   * Zwischenmasten: schaltet man eines ab, bleibt der geteilte Mast stehen
   * (der Nachbar traegt ihn), und das Joch steht im Bild auf einem Masten
   * und rechnet sich zugleich als «ohne».
   */
  /* =========================================================================
   * >>> ALLE MASTEN IN EINER ZEILE, SENKRECHT ANGESCHRIEBEN. <<<
   * =========================================================================
   *
   * Weisung vom 11. September: «ordne dies kompakter und das man einen
   * besseren uebersicht hat. fuer die masten und anker kann man die vertikal
   * anschreiben, dann braucht man nicht fuer jedes element nicht eine
   * separate zeile.»
   *
   * Vorher: je eine Zeile pro Mast und pro Anker. Ein Querprofil mit drei
   * Tragwerken, vier Masten und zwei Ankern brauchte zehn Zeilen, und die
   * Bahn - das eigentlich Interessante - war zehnmal dieselbe.
   *
   * Jetzt: EINE Zeile. Jeder Mast steht an seiner Stelle auf der Bahn, sein
   * Name senkrecht darunter. Ein Anker haengt als kurzer Strich daran, in
   * der Richtung, in die sein Fundament zeigt.
   *
   * >>> WAS DABEI NICHT VERLOREN GEHEN DARF. <<<
   *
   * Jeder Mast bleibt anklickbar (waehlt ihn an), rechtsklickbar (sein
   * Kontextmenue) und traegt seinen vollen Text im Titel. Die Zeile ist
   * kuerzer, nicht aermer - ein Ueberblick, der etwas weglaesst, was man
   * danach doch sucht, ist keiner.
   * ======================================================================= */
  /* =========================================================================
   * >>> JE MAST EINE ZEILE - GLEICHWERTIG MIT DEM JOCH. <<<
   * =========================================================================
   *
   * Weisung vom 13. September: «kannst du die laenge und typ bei jedem
   * masten schreiben, sonst wirken diese tragwerke untergeordnet im bezug
   * zum joch. design gleichwertig waehlen.»
   *
   * Das trifft es. Die Masten standen in EINER Sammelzeile - «Masten /
   * 2 x HEB 240 / 8.50 m» - und trugen auf der Bahn nur ihre Nummer,
   * senkrecht. Das Joch daneben hatte Kuerzel, Namen und Linie; der Mast
   * eine Anzahl. Ein Mast ist aber kein Zubehoer des Jochs: er traegt
   * seinen eigenen Nachweis, sein eigenes Profil, seine eigene Laenge.
   *
   * Jetzt dieselbe Zeile wie das Tragwerk - Kuerzel, Name, Marke auf der
   * gemeinsamen Bahn, die Lage darunter:
   *
   *      P1 · JOCH         |------------------------|
   *      J90 · 20.00 m
   *      M1 · MAST         +
   *      HEB 240 · 8.50 m  0.00
   *      M2 · MAST                                  +
   *      HEB 240 · 8.50 m                       20.00
   *
   * >>> DAS NIMMT DIE WEISUNG VOM 11. SEPTEMBER ZUM TEIL ZURUECK. <<<
   *
   * Dort hiess es: «ordne dies kompakter ... fuer die masten und anker kann
   * man die vertikal anschreiben, dann braucht man nicht fuer jedes element
   * nicht eine separate zeile.» Der Grund war gut: je eine Zeile pro Mast
   * UND pro Anker, zehn Zeilen fuer drei Tragwerke.
   *
   * Zurueck kommt die MASTZEILE, nicht die Ankerzeile. Der Anker haengt als
   * Strich am Symbol und steht im Namen darunter - das spart die Haelfte
   * der damaligen Zeilen. Und die senkrechte Anschrift faellt weg, die je
   * nach Laenge 46 bis 110 Pixel Bahnhoehe brauchte.
   * ======================================================================= */
  /*
   * >>> DIE LAENGE STEHT DA, AUCH WENN SIE NIEMAND EINGETIPPT HAT. <<<
   *
   * `mastLaenge` ist ein Feld mit ABGELEITETEM Standardwert: fehlt es,
   * zeigt die Maske `mastLaengeVorgabe(H, jd)` - einen halben Meter ueber
   * Oberkante Obergurt, aufgerundet. Naehme die Leiste nur den eingetippten
   * Wert, stuende dort «HEB 240» ohne Laenge, waehrend das Feld daneben
   * 8.50 m zeigt. Dieselbe Rechnung, dieselbe Zahl.
   *
   * DAS ENDE ERGIBT SICH AUS DER STELLE: steht der Mast auf x0 seines
   * Tragwerks, ist er dessen Ende A, sonst B. Die Anschlusshoehe gehoert
   * dem JOCHENDE (siehe `anschlusshoehe`), der Fusspunkt dem MASTEN - die
   * freie Laenge ist ihre Differenz.
   */
  /*
   * DIE ANSCHLUSSHOEHE GEHOERT DEM JOCHENDE, der Fusspunkt dem MASTEN. Beide
   * zusammen ergeben die freie Laenge - das Mass, ueber das sich der Mast
   * biegt und aus dem die Laengenvorgabe folgt.
   */
  /* =========================================================================
   * >>> BAUM MIT LAGEBAND (Weisung vom 19. September). <<<
   * =========================================================================
   *
   * «das hier sieht unübersichtlich aus. wie können wir das optimieren?» -
   * gewaehlt: «A mit dem Band». Vorher stand je Tragwerk UND je Mast eine
   * Zeile mit eigener kleiner Lageskizze: die Symbole sprangen quer ueber
   * die Spalte, Masten und Tragwerke standen gemischt, und welcher Mast zu
   * welchem Joch gehoerte, las man aus «M3 · Mast · P3 + P4».
   *
   *   OBEN   EIN Lageband fuer alle: Joche als Linien (uebereinander, wo sie
   *          sich decken - Abfangjoch ueber Tragjoch), Masten als Striche
   *          auf dem Boden, jedes anklickbar, mit seinem Kuerzel.
   *   DARUNTER der Baum: je Tragwerk eine Zeile, seine Masten eingerueckt
   *          darunter. Ein geteilter Mast steht EINMAL, beim ersten Tragwerk,
   *          mit «auch A1». Ein Einzelmast ist seine eigene Zeile - er ist
   *          sein Mast. Die Lage steht als Zahl rechts.
   *
   * Das nimmt die Weisung vom 13. September («gleichwertig», je Mast eine
   * Zeile mit Typ und Laenge) nicht zurueck: jeder Mast behaelt seine Zeile
   * mit Profil, Laenge, H und η - nur steht sie jetzt unter ihrem Tragwerk.
   * ======================================================================= */
  const f2q = (v) => Number(v).toFixed(2);
  // Am Rand des Bandes steht die Anschrift nach innen, sonst schnitte der
  // Rand sie ab (MT1 bei 60 m auf einem Blatt bis 63.6 m).
  const anker = (pct) => (pct > 92 ? 'rechts' : pct < 8 ? 'links' : '');

  const ankerDaten = (m) => {
    const ak = m?.anker;
    if (!(ak?.typ && ak.h > 0 && ak.a > 0)) return null;
    const laengs = ak.richtung === 'y';
    return { ak, laengs, vz: ak.seite === 'minus' ? -1 : 1,
             titel: `${ak.typ} · ${laengs ? 'längs' : 'quer'} · `
               + `h_A ${Number(ak.h).toFixed(2)} m · a_A ${Number(ak.a).toFixed(2)} m` };
  };
  /* =========================================================================
   * >>> DER BAUM IST WEG, DAS BAND BLEIBT (30. September). <<<
   * =========================================================================
   *
   * Weisung: «in der Tragwerkgruppe sehe ich infos, die ich schon im 3d oder
   * nebenan in der resultat sidebar sehe ... so muss man nur selten in einer
   * miniübersicht nach den tragwerken suchen, da man schon eine gute
   * übersicht hat im 3d.» Auf Rückfrage «Lageband behalten, Baum weg». Was
   * der Baum sonst noch trug, hat seinen Platz: Anklicken wählt im Band
   * (ein Mast wählt sein Tragwerk mit), Ausblenden und alles Weitere steht
   * im Kontextmenü (Rechtsklick im Band und im 3D), der Anker ist als
   * Strich im Band anklickbar, η steht in der Resultatspalte.
   * ======================================================================= */

  // --- Das Lageband --------------------------------------------------------
  // Joche in Bahnen: was sich deckt, kommt eine Bahn hoeher.
  /*
   * >>> DER TRAGAUSLEGER IM BAND (Weisungen vom 28. September). <<<
   * «oben beim Mastsymbol noch einen Ausleger mit Aufhängung ergänzen. der
   * Ausleger kann zudem links oder rechts sein.» Zuerst flach über dem
   * Mastsymbol, dann («diese proportion ist zu verzerrt vom mast zu
   * ausleger») massstäblich ab dem Ausleger - das brach mit der
   * Zeichensprache des Bands («das sieht nicht stimmig aus, in bezug auf
   * die restlichen darstellungen der tragwerksteile»). Auf drei
   * Gegenvorschläge: «A» - WIE EIN JOCH. Der Ausleger ist eine Linie in
   * einer Bahn, Endmarke nur am Masten, Name darüber; die Aufhängung ist
   * eine hängende Marke bei c₁ (die Zeichensprache der Auflagerdreiecke),
   * das Seil steht im Titel. Die Höhe b zeigt das 3D-Bild.
   */
  const bahnen = [];
  const imBand = alle.filter((t) => tragwerksart(t).masten >= 2
    || tragwerksart(t).key === 'tragausleger');
  const linien = imBand.map((t) => {
    const ta = tragwerksart(t).key === 'tragausleger';
    let x0, x1;
    if (ta) {
      const m = lageVon(t), e = m + auslegerRichtung(t) * kragarmEnde(t);
      x0 = Math.min(m, e); x1 = Math.max(m, e);
    } else {
      /*
       * >>> DAS ABFANGJOCH BEGINNT VOR SEINEM MASTEN (6. Oktober). <<<
       * «Tragwerkskizze bei abfangjoch verschoben»: seine Lage ist der erste
       * Mast (20. September), der Traeger kragt um den Ueberstand davor aus.
       * Gezeichnet wurde ab dem Masten - die Linie stand um den Ueberstand zu
       * weit rechts und ragte nur am Ende B hinaus.
       */
      x0 = tragwerksart(t).key === 'abfangjoch' ? lageOrtsnull(t) : lageVon(t);
      x1 = x0 + (Number(t.L) || 0);
    }
    let b = bahnen.findIndex((ende) => ende <= x0 + 1e-6);
    if (b < 0) { bahnen.push(x1); b = bahnen.length - 1; } else bahnen[b] = x1;
    return { t, x0, x1, b, ta };
  });
  const BAHN = 15;
  const hoehe = bahnen.length * BAHN;
  const bandLinien = linien.map(({ t, x0, x1, b, ta }) => {
    const links = qpPct(x0, von, bis), breit = Math.max(qpPct(x1, von, bis) - links, 2.5);
    const an = t.id === aktivId, aus = versteckt(t);
    const top = hoehe - (b + 1) * BAHN;
    let extra = '', klasse = '', titel = `${tragwerkPos(werte, t)} · ${tragwerkName(t, werte)} `
      + `· x ${f2q(x0)}–${f2q(x1)} m`;
    if (ta) {
      const ri = auslegerRichtung(t), xE = kragarmEnde(t);
      const a = tragauslegerAufhaengung(t);
      const s = tragauslegerSpreizung(t);
      klasse = ` qp-ta ${ri > 0 ? 'rechts' : 'links'}`;
      if (a && a.c1 <= xE) {
        const u = a.c1 / (x1 - x0) * 100;
        extra = `<span class="qp-ta-haken" style="left:${(ri > 0 ? u : 100 - u).toFixed(3)}%"></span>`;
      }
      titel = `${tragwerkPos(werte, t)} · Tragausleger ${f2q(Number(t.L))} m, `
        + `${ri > 0 ? 'rechts' : 'links'} des Masten`
        + (a ? ` · Aufhängung bei c₁ = ${f2q(a.c1)} m, b = ${f2q(a.b)} m, `
          + `α ${a.alpha.toFixed(1)}°, ${s > 0 ? `2 Seile ±${f2q(s)} m` : '1 Seil'}` : '');
    }
    return `<button type="button" class="qp-linie qp-bandlinie${klasse}${an ? ' an' : ''}${aus ? ' aus' : ''}"
        data-qp-tw="${esc(t.id)}"
        style="left:${links.toFixed(3)}%;width:${breit.toFixed(3)}%;top:${top + 7}px"
        title="${esc(titel)}"
        >${extra}</button><span class="qp-bandname${an ? ' an' : ''}"
        style="left:${(links + breit / 2).toFixed(3)}%;top:${top - 3}px"
        data-rand="${anker(links + breit / 2)}">${esc(tragwerkPos(werte, t))}</span>`;
  }).join('');
  const bandMasten = masten.map((m) => {
    const an = m.id === gewMast?.id;
    const d = ankerDaten(m);
    const name = mastName(werte, m);
    const pct = qpPct(m.x, von, bis);
    return `<span class="qp-mastgruppe" data-rand="${anker(pct)}" style="left:${pct.toFixed(3)}%;top:${hoehe}px">
        <button type="button" class="qp-mast${an ? ' an' : ''}${(m.traegt ?? []).length > 1 ? ' geteilt' : ''}"
          data-qp-mast="${esc(m.id)}" aria-pressed="${an}"
          title="${esc(`${name} bei x = ${f2q(m.x)} m · Rechtsklick öffnet das Kontextmenü`)}">
          <span class="qp-mast-marke"></span><span class="qp-mast-fuss"></span></button>
        ${d ? `<button type="button" class="qp-ankerstrich${d.laengs ? ' laengs' : ''}${
            d.vz > 0 ? ' plus' : ' minus'}${an ? ' an' : ''}" data-qp-anker="${esc(m.id)}"
          title="${esc(`Anker am Masten ${name} · ${d.titel} · anklicken zum Ändern`)}"
          >${ankerGlyphe(d.laengs)}</button>` : ''}
        <span class="qp-mastmass${an ? ' an' : ''}">${esc(name)}</span>
        ${stegGlyphe(m.steg ?? werte.mastSteg)}
      </span>`;
  }).join('');

  return `<div class="qp-leiste" data-qp-von="${von}" data-qp-bis="${bis}">
      <div class="qp-band qp-bahn" style="height:${hoehe + 48}px">
        <span class="qp-boden" style="top:${hoehe + 28}px"></span>
        ${bandLinien}${bandMasten}
      </div>
      <div class="qp-skala"><span>${von.toFixed(1)} m</span>
        <span>Lage auf dem Querprofil</span><span>${bis.toFixed(1)} m</span></div>
    </div>`;
}

/*
 * Ausgefuehrt, damit der Pruefstand die Beschriftung festnageln kann:
 * sie steht AUSSERHALB von `[data-tragwerkfeld]`, sonst raeumt sie die
 * Nachfuehrung bei jedem Mastklick weg. Reine Zeichenkettenarbeit, kein
 * DOM - der Aufruf laeuft auch in Node.
 */
export function feldHtml(f, wert, werte) {
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
  // Drei Sperren: Katalogmasse (bearbeiten), Tabellenlasten
  // (lastenBearbeiten) und `nurAnzeige` - ein Feld, das eine gerechnete
  // Groesse anschreibt und keine Eingabe ist (w_Mast,y seit 20. September).
  const gesperrt = (f.ausDB && !werte.bearbeiten) ||
                   (f.ausLast && !werte.lastenBearbeiten) ||
                   f.nurAnzeige === true;
  /*
   * DER HINWEIS DARF EINE FUNKTION SEIN - wie das Label darueber.
   *
   * Seit dem Schieber fuer die Jochlaenge (4. September) haengt sein Text an
   * der Tragwerksart. Ohne diese Zeile landete die Funktion selbst im Feld:
   * unter dem Schieber stand ihr Quelltext, «(w) => (tragwerksart(w).key
   * === 'abfangjoch' ? ...» - im Browser zu sehen, nicht im Pruefstand.
   */
  const hinweis = hinweisHtml(f.key,
    typeof f.hinweis === 'function' ? f.hinweis(werte) : f.hinweis);
  const dis = gesperrt ? ' disabled' : '';
  let inp;

  if (f.typ === 'auflagerlinks') {
    // Joch ohne Masten (2. Oktober): die Lagerung der Gurte selbst.
    inp = f.key === 'auflagerOhneMast'
      ? ohneMastHtml(werte)
      : auflagerDiagrammHtml(werte, tragwerksart(werte).key,
                             f.vorgabefeld ? 'auflagerVorgabe' : 'auflagerLinks');
  } else if (f.typ === 'tragwerke') {
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
                  <figure class="skizze hb-skizze">${bauformSkizze(o.wert)}</figure>
                  <span class="bauform-text">
                    <span class="bauform-name">${esc(o.text)}</span>
                    ${o.kurz ? `<span class="bauform-kurz">${esc(o.kurz)}</span>` : ''}
                  </span>
                </button>`;
      }).join('') + '</div>';
  } else if (f.typ === 'auswahl') {
    /*
     * >>> GEGLIEDERT, WO DIE OPTIONEN EINE GRUPPE TRAGEN. <<<
     *
     * Weisung vom 3. September: «beim dropdown sollte man das etwas
     * gliedern, das man es besser finden kann.» Beim Jochtyp sind das
     * aktuelles Sortiment, Altbauweise und Vergleichsmodelle - sechzehn
     * Zeilen, in denen man sonst sucht.
     *
     * Aufeinanderfolgende Optionen derselben Gruppe kommen in EIN
     * `optgroup`. Die Reihenfolge macht die Liste, nicht dieser Code: sie
     * steht dort, wo die Optionen gebaut werden, und dort gehoert sie hin.
     * Ohne Gruppe bleibt alles, wie es war.
     */
    /*
     * EINE OPTION DARF AUSGEGRAUT DASTEHEN.
     *
     * Weisung vom 5. September: «der kragmast nur auswaehlbar wenn die
     * masten deaktiviert sind.» Sie zu ENTFERNEN waere bequemer und
     * schlechter: wer sie sucht, fände sie nicht mehr und wüsste nicht,
     * warum. Ausgegraut steht sie da und sagt, woran sie hängt - dasselbe
     * Vorgehen wie bei den Ausleitungswegen des Abfangjochs.
     */
    const zeileOpt = (o) => `<option value="${esc(o.wert)}"${
      String(o.wert) === String(wert) ? ' selected' : ''}${
      o.aus ? ' disabled' : ''}>${esc(o.text)}</option>`;
    /*
     * DIE LISTE DARF VON DEN WERTEN ABHAENGEN.
     *
     * Der Jochtyp stellt je nach Tragwerksart ein anderes Sortiment zur
     * Wahl - Tragjoche J60..J130, Abfangjoche A160..A360. Ohne diesen Weg
     * braeuchte es zwei Felder mit zwei Namen an zwei Stellen der Maske.
     */
    if (typeof f.optionenAus === 'function') {
      f = { ...f, optionen: f.optionenAus(werte) ?? [] };
    }
    let opts;
    if (!f.optionen.length) {
      opts = `<option value="${esc(wert)}" selected>${esc(wert)}</option>`;
    } else if (f.optionen.some((o) => o.gruppe)) {
      const teile = [];
      let letzte = null;
      f.optionen.forEach((o) => {
        const g = o.gruppe ?? '';
        if (g !== letzte) {
          if (letzte !== null) teile.push('</optgroup>');
          if (g) teile.push(`<optgroup label="${esc(g)}">`);
          letzte = g;
        }
        teile.push(zeileOpt(o));
      });
      if (letzte) teile.push('</optgroup>');
      opts = teile.join('');
    } else {
      opts = f.optionen.map(zeileOpt).join('');
    }
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
    // Auch als Funktion des Satzes (6. Oktober: Höhe am Tragausleger 0.10 m).
    const rngSchritt = (typeof f.zugSchritt === 'function' ? f.zugSchritt(werte) : f.zugSchritt) ?? f.schritt;
    const mx = feldMax(f, werte);
    inp = `<div class="zahlfeld">
             <input class="rng" type="range" data-feld="${f.key}"
               min="${f.min}" max="${mx}" step="${rngSchritt}" value="${wert}"${dis}>
             <input type="number" id="${id}" data-feld="${f.key}" class="kurz"
               value="${wert}" step="${f.schritt}" min="${f.min}" max="${mx}"${dis}>
             <span class="einheit">${esc(f.einheit ?? '')}</span></div>
           <div class="rng-skala"><span>${f.min}</span><span>${mx}</span></div>`;
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
   *
   * >>> SIE SITZT UM DEN INHALT, NICHT UM DAS FELD. <<<
   *
   * Zuerst stand sie am aeusseren `div.feld` - und `leisteNachfuehren`
   * setzt dessen `innerHTML` neu. Damit verschwand bei JEDEM Mastklick die
   * BESCHRIFTUNG «Tragwerke auf diesem Querprofil» und der Hinweis darunter:
   * `tragwerkfeldHtml` liefert beides nicht mit. Die Maske sackte um zwei
   * Zeilen zusammen und beim naechsten vollen Neubau wieder auseinander.
   *
   * Weisung vom 3. September: «kannst du diesen text immer anlassen auch
   * wenn man auf die masten klickt, da sonst die darstellung springt.»
   *
   * Nachgefuehrt wird jetzt nur, was sich aendert. Die Beschriftung gehoert
   * nicht dazu - und ein aufgeklappter Hinweis bleibt offen.
   */
  const inhalt = f.typ === 'tragwerke'
    ? `<div data-tragwerkfeld>${inp}</div>` : inp;
  /*
   * EINE BESCHRIFTUNG DARF DEN MASTEN NENNEN.
   *
   * «Anschlusshöhe Ende B» sagt nicht, WELCHER Mast das ist - auf einer
   * Jochreihe traegt der Zwischenmast diesen Namen von der einen Seite und
   * «Ende A» von der anderen. Ein `label` als Funktion bekommt die Werte und
   * kann «Ende B · Mast M2» daraus machen: was gemeint ist, und woran es
   * steht.
   */
  return `<div class="feld${gesperrt ? ' gesperrt' : ''}">
    <label for="${id}">${esc(label)}${f.sym ? ` <em>${esc(f.sym)}</em>` : ''}</label>
    ${inhalt}${optionsSkizze(f.key, wert, werte)}${notizHtml}${hinweis}</div>`;
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
/*
 * >>> NUR WAS DA IST (Weisung, 18. September). <<<
 *
 * «Die Standortauswahl nur auf vorhandene Elemente beziehen.» Der Einzelmast
 * bot «am Joch» und «am Mast Ende B» an - er hat weder das eine noch das
 * andere. Ein Teil dort hinzuhaengen, rechnete still an einer Stelle, die es
 * nicht gibt.
 *
 *   Joch          jede Art mit Traeger (Tragjoch, Abfangjoch, Tragausleger)
 *   Mast Ende A   sobald das Tragwerk auf Masten steht, beim Einzelmast immer
 *   Mast Ende B   nur mit zwei Masten
 *
 * Steht ein Teil schon an einer Stelle, die es nicht mehr gibt - das
 * Tragwerk wurde umgestellt -, bleibt sie in der Liste, als solche
 * bezeichnet. Sonst zeigte die Auswahl einen anderen Ort, als gerechnet wird.
 */
export function anbauOrteVorhanden(werte) {
  const art = tragwerksart(werte);
  const masten = art.key === 'einzelmast' ? 1
    : (mastImModell(werte) ? art.masten : 0);
  return ANBAU_ORTE.filter((o) => (o.key === 'joch' ? art.traeger === true
    : o.key === 'mastA' ? masten >= 1 : masten >= 2)).map((o) => o.key);
}

function anbauOrte(werte, aktuell = null) {
  const t = tragwerkeVon(werte)[0];
  const da = anbauOrteVorhanden(werte);
  return ANBAU_ORTE
    .filter((o) => da.includes(o.key) || o.key === aktuell)
    .map((o) => {
      const fehlt = !da.includes(o.key);
      let label = o.label;
      if (o.key !== 'joch') {
        const n = mastNameAmEnde(werte, t, o.key === 'mastB' ? 'B' : 'A');
        if (n) label = `am Masten ${n}`;
      }
      return { ...o, label: fehlt ? `${label} (nicht vorhanden)` : label };
    });
}

/** Farbmarke je Vorlagenart, passend zur 3D-Darstellung. */
const ANBAU_FARBE = {
  haengend: 'var(--acc)', aufgesetzt: 'var(--ok)',
  seitlich: 'var(--warn)', direkt: 'var(--dim)',
};
/*
 * WAS DIE FARBE HEISST (30. September: «ich verstehe die farbzuweisung hier
 * nicht»). Der Punkt ist die Befestigungsart der Vorlage (Feld `farbe` im
 * Sortiment Anbauteile) - gesagt wurde es nirgends. Jetzt im Titel des
 * Punkts und als Zeile über den Kacheln. Symbolbilder statt Punkte sind
 * für später vorgemerkt (aus den Querprofilen abgeleitet).
 */
const ANBAU_FARBE_NAME = {
  haengend: 'hängend (unter dem Joch)', aufgesetzt: 'aufgesetzt (auf dem Joch)',
  seitlich: 'seitlich (am Joch oder am Masten)', direkt: 'direkt (ohne Träger)',
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
  /*
   * BEIM EINZELMAST HAENGT ALLES AM MASTEN - so rechnet ihn der Kern
   * (core.vierendeel.js, modellEinzelmast), auch wenn im Teil noch «am Joch»
   * steht. Die Karte zeigt, was gerechnet wird: den Masten und die Hoehe.
   */
  const einzelmast = tragwerksart(werte).key === 'einzelmast';
  const liste = (werte.anbauteile ?? []).map(normalisiereAnbauteil)
    .map((a) => (einzelmast && ortVon(a) === 'joch' ? { ...a, ort: 'mastA' } : a));
  const bestandAn = nachweiseAuswahl(werte.nachweise).bestandesschutz === true;
  /*
   * >>> VIERZEHN GLEICHE KACHELN SIND EINE LISTE, KEINE AUSWAHL. <<<
   *
   * Weisung vom 3. September: «die Auswahl der bauteile sollte so
   * uebersichtlich wie moeglich sein und nicht zu ueberladen wirken,
   * eventuell macht es sinn mit gruppierungen und symbolen zu arbeiten».
   *
   * Gegliedert wird nach dem, WOFUER man sucht - Haengestuetzen,
   * Jochaufsaetze, Leiter, Uebriges. Jede Gruppe traegt ein Zeichen, das
   * das Auge trifft, bevor es liest. Eigene Vorlagen kommen ans Ende ihrer
   * Gruppe; wer keine hat, merkt nichts davon.
   */
  /*
   * >>> SYMBOL STATT FARBPUNKT UND TEILEZAHL (3. Oktober). <<<
   * «es ist zur zeit sehr viel text den man lesen muss um das richtige
   * bauteil zu finden» - auf Rückfrage «Symbolkacheln»: die Skizze kommt aus
   * den Bausteinen der Vorlage (`vorlageSymbol`, ui.anbausymbol.js), der
   * Name steht darunter, Beschreibung und Befestigung im Titel. Jede
   * Kachel trägt ihren Suchtext und wo sie passt (Joch / Mast) - gefiltert
   * wird im Browser ohne Neuaufbau.
   */
  const eineKachel = (v, gruppe = '') => `
    <span class="kachel-huelle" data-suche="${esc(vorlageSuchtext(v, gruppe))}"
          data-joch="${vorlagePasstAn(v, 'joch') ? 1 : 0}" data-mast="${vorlagePasstAn(v, 'mast') ? 1 : 0}">
      <button class="kachel at-kachel${v.eigen ? ' eigen' : ''}" data-vorlage="${esc(v.id)}"
              draggable="true" title="${esc(`${v.name}${v.beschreibung ? ` - ${v.beschreibung}` : ''}${
                ANBAU_FARBE_NAME[v.farbe] ? ` (Befestigung: ${ANBAU_FARBE_NAME[v.farbe]})` : ''}`)}">
        ${vorlageSymbol(v)}
        <span class="kachel-name">${esc(v.name)}</span>
      </button>
      <button class="kachel-stift" data-vorlage-bearb="${esc(v.id)}"
        title="${v.eigen ? 'Vorlage bearbeiten'
          : 'Anpassen, legt eine eigene Kopie an, der Katalog bleibt unverändert'}"
        >${icon('optionen', 11)}</button>
      ${v.eigen ? `<button class="kachel-weg" data-vorlage-weg="${esc(v.id)}"
        title="Eigene Vorlage entfernen">×</button>` : ''}
    </span>`;

  const VORLAGENGRUPPEN = [
    ['haengestuetze', 'Hängestützen und Ausleger', 'grpHaengestuetze'],
    ['jochaufsatz', 'Jochaufsätze', 'grpJochaufsatz'],
    ['leiter', 'Leiter und Traversen', 'grpLeiter'],
    ['mast', 'Am Masten', 'grpUebrige'],
    ['signal', 'Signale', 'grpUebrige'],
    ['uebrige', 'Übrige', 'grpUebrige'],
  ];
  /*
   * NACH TRAGWERK (19. September, «nach ort trennen»): ohne Traeger - am
   * Einzelmast - nur, was an einen Masten passt. Ein Joch steht auf Masten
   * und bekommt beides; die Mast-Vorlagen stehen dort unter «Am Masten».
   */
  const ohneJoch = tragwerksart(werte).traeger !== true;
  // Das freie Bauteil steht seit dem 3. Oktober als Kachel unter «Übrige»
  // («unter übrige kann man ein freies bauteil aufführen»).
  const alleV = vorlagen().filter((v) => !ohneJoch || vorlagePasstAn(v, 'mast'));
  /*
   * WAS KEINE GRUPPE TRAEGT, VERSCHWINDET NICHT.
   *
   * Eine eigene Vorlage aus dem Editor hat keine, und eine neue aus dem
   * Katalog koennte eine unbekannte tragen. Beide landen unter «Übrige» -
   * lieber an der falschen Stelle sichtbar als richtig einsortiert und weg.
   */
  const bekannt = new Set(VORLAGENGRUPPEN.map((x) => x[0]));
  /*
   * >>> DER REGELFALL STEHT VORN. <<<
   *
   * Weisung vom 3. September: «die leiter fuer die R-FL und N-FL
   * Kettenwerke und die Rueckleiter sind primaer interessant, die aldrey
   * kommen ab und zu vor, den rest als zusatz nehmen.»
   *
   * `rang` sagt es je Vorlage: 1 Regelfall, 2 gewoehnlich, 3 Zusatz. Bei
   * gleichem Rang bleibt die Reihenfolge des Katalogs - eine zweite
   * Sortierung nach Namen wuerde eine Ordnung erfinden, die niemand gewollt
   * hat.
   */
  const kacheln = VORLAGENGRUPPEN.map(([key, titel, sym]) => {
    const drin = alleV
      .filter((v) => (bekannt.has(v.gruppe) ? v.gruppe : 'uebrige') === key)
      .sort((a, b) => (a.rang ?? 2) - (b.rang ?? 2));
    if (!drin.length) return '';
    return `<div class="kachel-gruppe">
        <span class="kachel-gruppe-kopf">${icon(sym, 13)} ${esc(titel)}</span>
        <div class="kacheln">${drin.map((v) => eineKachel(v, titel)).join('')}</div>
      </div>`;
  }).join('');

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
  // Gruppe (6. Oktober): freier Name, sonst die Gleisnummer des Lastgenerators.
  liste.forEach((a, i) => {
    const name = anbauGruppe(a);
    if (!gruppen.has(name)) gruppen.set(name, []);
    gruppen.get(name).push({ a, i });
  });

  const zeile = ({ a, i }) => {
    const offen = klappOffen(`at-${a.id}`);
    const kraft = baugruppeKraft(a, trasse);
    // WAS IN DER ZEILE STEHT, MUSS AM ORT GEMESSEN SEIN. `x` ist am Masten
    // immer null; die Zeile behauptete damit, jedes Mastteil sitze am
    // Jochanfang.
    const amMasten = amMast(a);
    const mEnde = ortVon(a) === 'mastB' ? 'B' : 'A';
    // Der Mast beim NAMEN (M1, M2 …), nicht «MA» / «Ende A» - seit dem
    // 19. September heissen Masten und Tragwerke nach ihrem Typ.
    const mName = mastNameAmEnde(werte, tragwerkeVon(werte)[0], mEnde) || `M${mEnde}`;
    const lage = amMasten
      ? `${mName} ${f2(a.hMast ?? 0)} m` : `${f2(a.x)} m`;
    const lageLang = amMasten
      ? `Mast ${mName} · ${f2(a.hMast ?? 0)} m über Fundament`
      : `x = ${f2(a.x)} m`;
    const suchtext = `${a.name} ${a.vorlage ?? ''} #${anbauGruppe(a)} ${amMasten
      ? `mast ${mEnde} ${a.hMast ?? 0}` : a.x}`.toLowerCase();
    return `<div class="at-karte${a.aktiv === false ? ' aus' : ''}${offen ? ' offen' : ''}${atMarkiert.has(a.id) ? ' markiert' : ''}"
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
        <button class="btn btn-mini" data-at-dup="${i}"
                title="Duplizieren - danach ins Modell klicken, wo die Kopie hin soll; Esc bricht ab (auch per Rechtsklick auf die Zeile)">${icon('kopie', 12)}</button>
        <button class="btn btn-mini" data-at-vorlage="${i}"
                title="Als eigene Vorlage speichern">${icon('speichern', 12)}</button>
        ${/*
           * Das Kennzeichen «neu» nur mit eingeschaltetem Bestandesschutz
           * (4. Oktober: «diese option sollte aber erst aufgeführt sein, wenn
           * man die auswahl betätigt»).
           */ nachweiseAuswahl(werte.nachweise).bestandesschutz
          ? `<label class="at-neu${a.neu === true ? ' an' : ''}" title="Neues Bauteil - für den Bestandesschutz: der Bestand rechnet ohne dieses Teil"><input class="at" data-k="neu"
          type="checkbox" ${a.neu === true ? 'checked' : ''}>neu</label>` : ''}
        <label class="schalter" title="Teil mitrechnen"><input class="at" data-k="aktiv"
          type="checkbox" ${a.aktiv === false ? '' : 'checked'}></label>
        <button class="loeschen" data-loesch="${i}" title="Anbauteil löschen">${icon('loeschen', 12)}</button>
      </span>
      ${offen ? `<div class="at-koerper">
        <div class="at-kopf">
          <input class="at breit" data-k="name" type="text" value="${esc(a.name)}">
        </div>
        ${/*
           * >>> DIE SKIZZE IST KLAPPBAR. <<<
           *
           * Weisung vom 15. September: «weiter mit der bauteil karte
           * optimieren.» Nachgemessen: die Karte ist 1220 px hoch, davon
           * 173 die Skizze - nach der Modulliste (560) und den Feldern
           * (211) der dritte Posten.
           *
           * Sie bleibt OFFEN als Vorgabe: sie zeigt, WO das Teil sitzt, und
           * das ist beim ersten Blick auf ein fremdes Bauteil die Frage.
           * Wer sein eigenes Teil zum zwanzigsten Mal aufmacht, klappt sie
           * zu - und sie bleibt zu, wie jeder andere Klappabschnitt.
           */''}
        ${klapp(`at-skizze-${i}`, amMast(a) ? 'Ansicht und Draufsicht' : 'Lage im Querschnitt',
                anbauteilSkizzeFuer(a, werte), '', true)}
        <div class="at-gitter">
          ${atWahl(i, 'ort', 'Standort', ortVon(a), anbauOrte(werte, ortVon(a)),
                   'Am Joch zählt die Lage x, am Masten die Höhe über Fundament. '
                   + 'Was am Masten hängt, geht NICHT in den Ersatzbalken ein — '
                   + 'es steht nur im Stabmodell mit Auflagermodell «Mast».')}
          ${ortVon(a) === 'joch'
            // Am Tragausleger bis zum Kragarmende (28. September).
            ? atSchieber(i, 'x', 'Lage x', a.x, 'm', 0.1, 0,
                         tragwerksart(werte).key === 'tragausleger'
                           ? kragarmEnde(werte) : (werte.L ?? 20))
            : atSchieber(i, 'hMast', 'Höhe über Fundament', a.hMast ?? 0, 'm',
                         // Bis zum MASTKOPF, nicht bis zur Jochachse: ein
                         // langer Mast traegt oben Traversen mit
                         // Zusatzleitern, und der Regler muss dorthin reichen.
                         // NICHT DARUEBER HINAUS: der Anschluss liegt am
                         // Masten (24. September). Was hoeher sitzt, sagt
                         // die z-Koordinate des Moduls weiter unten.
                         0.05, 0, mastReglerHoehe(werte, ortVon(a) === 'mastB' ? 'B' : 'A'))}
          ${/*
             * >>> DAS ABFANGJOCH HAT KEINE GURTEBENEN. <<<
             *
             * Weisung vom 4. September: «die eingabe ueber die Befestigung
             * an das des jochs anpassen, wir haben da keine ober und
             * untergurte.»
             *
             * Die Befestigungsarten - «am Untergurt», «am Obergurt»,
             * «durchgehend Ober- und Untergurt» - beschreiben das TRAGJOCH
             * mit seinen zwei Gurtebenen uebereinander. Das Abfangjoch hat
             * zwei Gurte NEBENEINANDER; die Frage lautet dort «beide Gurte
             * oder Mitte Traeger», und die stellt das Feld «Anbindung»
             * darunter. Zwei Felder fuer dieselbe Frage waeren eines zu
             * viel - und das falsche stand oben.
             */''}
          ${/*
             * >>> BEFESTIGUNG ALS KNOPFREIHE, RASTER DANEBEN (2. Oktober). <<<
             * «mach die angaben zur befestigung einfache auswählbar.
             * momentan ist es etwas verstreut und klicky.» Statt Aufklapp-
             * liste drei Knöpfe (Untergurt / Obergurt / beide) und das
             * Raster gleich daneben - es stand zugeklappt unter «Raster und
             * Gleiszuordnung». Die Gleiszuordnung bleibt zugeklappt.
             */''}
          ${ortVon(a) === 'joch' && tragwerksart(werte).key !== 'abfangjoch'
            ? atBefestigung(i, a)
            : ''}

          ${/*
             * >>> AM ABFANGJOCH ENTSCHEIDET DIE ANBINDUNG. <<<
             *
             * Weisung vom 4. September: «die anbindung an das joch erfolgt
             * ueber die beiden gurte fuer die vertikalen elemente
             * (jochaufsatz / haengestuetze / fahrleitung etc.) Die
             * Abgefangenen Leiter wirken auf mitte Traeger. Die Abgefangenen
             * leiter koennen auf beiden Seiten angesetzt werden.»
             *
             * Die Vorgabe folgt der Vorlagengruppe - `leiter` zieht auf
             * Mitte, alles andere sitzt auf den Gurten. Sie steht als Wahl
             * da, weil sie nicht immer stimmt: eine Fahrleitung kann haengen
             * ODER abgefangen sein, und aus den Daten des Bauteils folgt das
             * nicht.
             *
             * Nur beim Abfangjoch: das Tragjoch hat vier Gurte und kennt die
             * Frage in dieser Form nicht.
             */''}
          ${tragwerksart(werte).key === 'abfangjoch' && ortVon(a) === 'joch'
            ? atWahl(i, 'anbindung', 'Anbindung',
                     abfangAnbindung(a).art,
                     ABFANG_ANBINDUNGEN,
                     ABFANG_ANBINDUNGEN.find(
                       (x) => x.key === abfangAnbindung(a).art)?.hinweis ?? '')
            : ''}
          ${/*
             * >>> DER VERLAUF, NICHT DIE SEITE. <<<
             *
             * Weisung vom 4. September: «Anstatt nur Seite anzugeben, waere
             * besser den verlauf der Leiter, ist dieser durchgehen (keine
             * abfangkraefte) oder wird dieser vorne oder hinten
             * abgefangen.» Die Leiterzugkraefte folgen dann aus den
             * Kennwerten der Bauteile - sie stehen nirgends als Eingabe.
             */''}
          ${tragwerksart(werte).key === 'abfangjoch' && ortVon(a) === 'joch'
            && abfangAnbindung(a).art === 'mitte'
            ? atWahl(i, 'verlauf', 'Verlauf des Leiters',
                     abfangAnbindung(a).verlauf, ABFANG_VERLAEUFE,
                     ABFANG_VERLAEUFE.find(
                       (x) => x.key === abfangAnbindung(a).verlauf)?.hinweis ?? '')
            : ''}
          ${/*
             * >>> DER BRUCHFALL. <<<
             *
             * Weisung vom 9. September: «dabei sollte ein leiter als bruch
             * bestimmt werden koennen optional um den massgebenden fall zu
             * bestimmen fuer den nachweis.»
             *
             * Er gilt nur im HAVARIEFALL - der aussergewoehnlichen
             * Einwirkung ohne veraenderliche Lasten. Dort faellt die
             * Zugkraft dieses Leiters weg, und was bleibt, zieht
             * einseitig. Der Fall sucht nicht die groesste Last, sondern
             * die groesste Ungleichheit.
             *
             * Nur beim abgefangenen Leiter: ein durchgehender zieht
             * ohnehin nicht, und ein vertikales Element bricht nicht in
             * diesem Sinne.
             */''}
          ${/*
             * AUCH AM TRAGJOCH UND AM MASTEN (Weisung vom 17. September):
             * dort zieht der gebrochene Leiter mit 10 % seines Zugs laengs,
             * und seine Ablenkung wirkt zur Haelfte.
             */''}
          ${/*
             * >>> DER HAKEN «BRUCH» IST IN DIE UEBERSICHT GEWANDERT
             * (19. September). <<< Mit einem Haken je Baugruppe rissen zwei
             * angehakte Leiter im selben Fall - «nur ein leiter [kann] im
             * havariefall rissen». Die Auswahl steht jetzt unter Lasten →
             * Havarie, je Leiter ein eigener Fall; hier nur der Verweis.
             */''}
          ${hatDrahtwerk(a)
            ? `<div class="at-feld breit2">${hinweisHtml(`at-${i}-havarie`,
                 `Ob ein Leiter dieses Teils im Havariefall reisst, steht unter Lasten → Havarie${(() => {
                   const k = Object.entries(werte.havarie ?? {}).filter(([key, v]) => v?.reisst
                     && (a.module ?? []).some((m, j) => leiterKennung(a, m, j) === key));
                   return k.length ? ' - angehakt.' : '.';
                 })()}`, { zu: true })}</div>` : ''}
        </div>
        ${/*
           * >>> RASTER UND GLEIS SIND ZWEITE EBENE. <<<
           *
           * Dieselbe Regel wie im Reiter System: was einen Regelwert hat,
           * den man selten verlaesst, steht nicht in der ersten Ebene. Das
           * Raster ist 0.40 m, die Gleiszuordnung 0 - und die setzt der
           * Lastgenerator ohnehin selbst.
           *
           * Sie sind nicht GESPERRT, sie sind ZUGEKLAPPT: was gilt, ist
           * erreichbar (Weisung vom 15. September zu den Attrappen).
           */''}
        ${klapp(`at-fein-${i}`, ortVon(a) === 'joch' && tragwerksart(werte).key === 'abfangjoch'
            ? 'Raster und Gruppe' : 'Gruppe',
          `<div class="at-gitter">
            ${ortVon(a) === 'joch' && tragwerksart(werte).key === 'abfangjoch'
              ? atFeld(i, 'raster', 'Raster', a.raster, 'm', 0.05) : ''}
            <label class="at-feld breit2" data-feldname="tag"
                   title="Freier Name der Gruppe (wie ein Hashtag): nach ihm wird die Liste gegliedert, und die Gruppe lässt sich im Modell ein- und ausblenden. Leer: die Gleisnummer des Lastgenerators.">
              <span>Gruppe <i>#</i></span>
              <input class="at" data-k="tag" data-idx="${i}" type="text" list="at-gruppen"
                     placeholder="${esc(a.gleis ? `Gleis ${a.gleis}` : 'z. B. Gleis 1')}"
                     value="${esc(String(a.tag ?? ''))}">
            </label>
          </div>`, '', false)}
        ${modulListeHtml(a, i, werte)}
        ${windVersatzHtml(a, i)}
        ${lastblockListeHtml(a, i)}
      </div>` : ''}
    </div>`;
  };

  /*
   * Kopf je Gruppe mit Auge (6. Oktober). Im Wortlaut: «hier die last
   * weglassen, da wir sonst auch die fy und fx aufführen sollten» - nur die
   * Stückzahl. Und: «die frage stellt sich mir warum ich bauteile nur
   * ausblenden will, sie aber trotzdem in die berechnung reihngehen
   * sollen?» - das Auge schaltet die Gruppe deshalb wie das Häkchen je Teil
   * (`aktiv`): aus = nicht gerechnet und nicht gezeichnet, die Eingaben
   * bleiben. Ein Bild, das etwas anderes zeigt als gerechnet wird, wäre
   * eine Falle.
   */
  const zeilen = [...gruppen.entries()].map(([name, teile]) => {
    const zu = teile.every(({ a }) => a.aktiv === false);
    return `
    <div class="at-gruppe${zu ? ' verborgen' : ''}">
      <div class="sec">${name ? `#${esc(name)}` : 'Ohne Gruppe'}<span class="sec-r">${teile.length} Stück
        ${name ? `<button type="button" class="btn-icon at-auge" data-at-gruppe-dup="${esc(name)}"
          aria-label="Gruppe duplizieren"
          title="Gruppe duplizieren - um Δx versetzen oder im Modell antippen">${icon('kopie', 13)}</button>` : ''}
        <button type="button" class="btn-icon at-auge${zu ? ' aus' : ''}" data-at-gruppe-auge="${esc(name)}"
          aria-label="${zu ? 'Einschalten' : 'Ausschalten'}"
          title="${zu ? 'Gruppe wieder einschalten (rechnen und zeichnen)' : 'Gruppe ausschalten - nicht gerechnet, nicht gezeichnet, die Eingaben bleiben'}">${icon('auge', 13)}</button></span></div>
      ${teile.map(zeile).join('')}
    </div>`;
  }).join('') + `<datalist id="at-gruppen">${[...new Set([...gruppen.keys()].filter(Boolean))]
    .map((g) => `<option value="${esc(g)}"></option>`).join('')}</datalist>`;

  /*
   * >>> DER HAEUFIGSTE GRIFF STEHT OBEN, NICHT ZUUNTERST IN DER LISTE. <<<
   *
   * Weisung vom 3. September: «zudem einen befehl bauteil zuweisen
   * (allgemein) als button auffuehren, sonst muss man immer erst die liste
   * oeffnen und die kachel frei definiert zu unterst auswaehlen».
   *
   * Genau das: ein Knopf neben dem Lastgenerator, der die Vorlage «frei»
   * unmittelbar setzt. Die Kachel bleibt zusaetzlich in der Liste - wer sie
   * dort gewohnt ist, findet sie weiter.
   */
  /*
   * >>> DIE KNOEPFE STEHEN UNTER DEM TITEL, NICHT AUF SEINER ZEILE. <<<
   *
   * Zuerst standen sie als `rechts` im Abschnittskopf - und brachen dort um,
   * weil zwei beschriftete Knoepfe neben «ANBAUTEILE» nicht in eine Zeile
   * passen. Der Titel stand dann links, die Knoepfe uebereinander rechts
   * daneben: unaufgeraeumt (Weisung, 3. September).
   *
   * Auf der Titelzeile bleibt nur, was dorthin gehoert: die Anzahl. Die
   * Handlungen bekommen ihre eigene Zeile und stehen damit auch bei
   * schmaler Seitenleiste nebeneinander.
   */
  /*
   * >>> AM ABFANGJOCH WIRKEN SIE NOCH NICHT. <<<
   *
   * Weisung vom 4. September: «die Anbauteile noch checken ob diese gebaut
   * werden koennen.» Nachgesehen: der Abfangjoch-Kern kennt kein Anbauteil,
   * die Szene zeichnet keines, und die AxisVM-Ausleitung fuehrt zwei
   * Lastfaelle - Eigengewicht und Leiterzug. Eingetragenes bleibt im
   * Datensatz stehen und wirkt dort nicht.
   *
   * Der Abschnitt bleibt sichtbar: die Eingabe geht nicht verloren, und wer
   * zwischen zwei Tragwerken wechselt, soll dieselbe Maske sehen. Aber er
   * sagt, woran er ist - schweigend danebenstehen waere schlimmer.
   */
  /*
   * >>> SIE WIRKEN. DER SATZ HIER SAGTE DAS GEGENTEIL. <<<
   *
   * Gefunden am 11. September in einem Bedienlauf: hier stand «Eingetragene
   * Bauteile bleiben erhalten, wirken aber nicht». Gemessen hob das erste
   * gesetzte Bauteil die Ausnutzung des Gurtes von 0.372 auf 0.478.
   *
   * Der Satz stammte aus der Zeit vor `abfangAnbauLasten`; seit dem
   * 10. September gehen Eigengewicht, Wind UND die Torsion aus der
   * Exzentrizitaet in den Nachweis. Eine Warnung, die dem Nutzer sagt,
   * seine Eingabe sei wirkungslos, ist schlimmer als gar keine: sie laedt
   * dazu ein, die Last ein zweites Mal von Hand anzusetzen.
   *
   * WAS BLEIBT, ist die eine Stelle, an der es wirklich auf eine Angabe
   * ankommt: die ANBINDUNG entscheidet ueber die Abfangkraft, und die ist
   * die groesste Last am Bauwerk. Welche Teile davon betroffen sind, nennt
   * der Gueltigkeitshinweis beim Namen.
   */
  const nichtGetragen = tragwerksart(werte).key === 'abfangjoch'
    ? `<small class="hinweis" style="display:block;margin:0 0 7px">
         Eigengewicht, Wind und die Torsion aus der Exzentrizität gehen in
         den Nachweis ein. Den LEITERZUG bestimmt die Abfangung am Leiter
         (einseitig, beidseitig, durchgehend) mit ihrer Richtung; er greift
         zentrisch in der Trägermittelebene an.
       </small>` : '';
  /*
   * DER LASTGENERATOR NUR MIT TRAEGER (Entscheid vom 18. September): er
   * verteilt Teile auf die Gleise UEBER einem Joch. Am Einzelmast gibt es
   * keine Strecke dafuer, und meist wird nur ein Gleis daneben bedient -
   * die Teile setzt dort die Vorlage bzw. der Vorrat.
   */
  return abschnitt(g.titel, `<span class="sec-r">${liste.length} Stück</span>`) +
    nichtGetragen +
    `<div class="at-werkzeuge">
       <button class="btn btn-mini" data-vorlage-direkt="frei" type="button"
         title="Freies Bauteil setzen — Typ, Länge und Lasten selbst eintragen"
         >${icon('anbau', 12)} Bauteil zuweisen</button>
       ${tragwerksart(werte).traeger ? `<button class="btn btn-mini" data-generator type="button"
         title="Anbauteile über die Gleise verteilen">Lastgenerator</button>` : ''}
       ${/*
          * >>> DER SIGNALBAUER STEHT VORN (4. Oktober). <<<
          * Gemeldet: «ich finde den signalbauer nicht.» Er war nur über die
          * Vorlage «Signal (Signalbauer)» in der zugeklappten Vorlagenliste
          * und danach über einen Knopf im Modul der Karte zu erreichen. Jetzt
          * ein Knopf neben «Bauteil zuweisen»: erst die Signale wählen, dann
          * ins Modell klicken, wo sie hin sollen.
          */ signalVorlage() ? `<button class="btn btn-mini" data-signal-direkt type="button"
         title="Signalbauer: Signale, Tafeln und Arbeitskorb nach Bild wählen, danach ins Modell klicken, wo sie hin sollen"
         >${icon('anbau', 12)} Signal zusammenstellen</button>` : ''}
     </div>` +
    klapp('anbau-vorrat', 'Anbauteil hinzufügen', `
      <div class="vl-suchzeile">
        <input type="search" class="vl-suche" value="${esc(vorlageSuche)}"
          placeholder="Suchen: NT, Lampe, 95, Trafo …" aria-label="Vorlagen durchsuchen">
        ${tragwerksart(werte).traeger ? `<span class="vl-ortwahl" role="group" aria-label="Ort">${
          [['alle', 'alle'], ['joch', 'Joch'], ['mast', 'Mast']].map(([k, l]) =>
            `<button type="button" class="vl-ort${vorlageOrt === k ? ' an' : ''}" data-vl-ort="${k}"
              aria-pressed="${vorlageOrt === k}">${l}</button>`).join('')}</span>` : ''}
      </div>
      <p class="hinweis" style="margin:0 0 4px">Kachel anklicken oder ins
        Modell ziehen.</p>
      <p class="notiz vl-keine" hidden>Keine Vorlage passt - Suche ändern, oder
        «Bauteil zuweisen» für ein freies Teil.</p>
      ${kacheln}
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
          also als h = 7.00 und z = −0.35. <b>x</b> ist an beiden Enden
          global, positiv nach rechts. Der Weg läuft auf der
          Anschlusshöhe zuerst waagrecht (y, dann x), dann lotrecht auf z.</p>`)}`,
      `${alleV.length + 1} Vorlagen`) +
    // Das Suchfeld filtert im Browser, ohne die Maske neu zu bauen - sonst
    // verlöre das Feld bei jedem Tastendruck den Fokus.
    (liste.length > 3 ? `<div class="vl-suche">
      <input type="search" id="at-suche" placeholder="filtern nach Name, Vorlage, Lage …"
             autocomplete="off">
      <span class="at-suche-zahl"></span></div>` : '') +
    /*
     * ALLE AUF EINMAL (Weisung vom 19. September: «Anbauteile müssen
     * einzeln gelöscht werden es wäre gut wenn man einen button hätte»).
     * Der Knopf fragt nach; Rückgängig holt die Liste zurück.
     */
    /*
     * >>> ALLE AUS / ALLE EIN (2. Oktober). <<< Frage «wo kann man alle
     * bauteile auf einmal ausblenden?», dann «Knopf «alle aus / alle ein»
     * einbauen für die anbauteile»: schaltet «aktiv» aller Teile dieses
     * Tragwerks - aus heisst nicht gerechnet und nicht gezeichnet, die
     * Eingaben bleiben. Steht noch eines an, schaltet er alle aus; sonst
     * alle ein. Rückgängig mit Strg+Z.
     */
    /*
     * >>> DER BESTANDESSCHUTZ GESPIEGELT (4. Oktober). <<< Hier markiert man
     * die Teile als «neu» - also gehört der Schalter auch hierher, nicht nur
     * in die Optionen («ich bin mir nicht sicher ob dies nicht zu versteckt
     * ist»). Derselbe Wert wie unter Lasten, geschrieben über `aendern`.
     */
    `<div class="at-leiste">
      <label class="schalter at-bestand" title="Bestand gegen Bestand + neue Bauteile vergleichen (Δη ≤ 0.05); eingeschaltet zeigt jede Karte das Kennzeichen «neu»">
        <input type="checkbox" data-at-bestand${bestandAn ? ' checked' : ''}><span>Bestandesschutz</span></label>
      ${liste.length ? (() => {
        const an = liste.filter((a) => a.aktiv !== false).length;
        return `<button class="btn btn-mini${an ? '' : ' btn-acc'}" data-at-alle-aktiv="${an ? 'aus' : 'ein'}" type="button"
              title="${an ? 'Alle Anbauteile ausschalten - nicht gerechnet, nicht gezeichnet, Eingaben bleiben'
                          : 'Alle Anbauteile wieder einschalten'} (Rückgängig mit Strg+Z)"
              >${an ? `Alle aus (${an} an)` : `Alle ein (${liste.length})`}</button>`;
      })() : ''}
      ${liste.length > 1 ? `<button class="btn btn-mini" data-at-alle-weg type="button"
              title="Alle Anbauteile dieses Tragwerks entfernen (fragt nach, Rückgängig mit Strg+Z)"
              >Alle entfernen (${liste.length})</button>` : ''}</div>` +
    auswahlLeisteHtml(liste)
    + `<div class="at-liste">${zeilen || '<p class="notiz">Noch keine Anbauteile.</p>'}</div>`
    + drahtwerkUebersichtHtml(liste);
}

/* ===========================================================================
 * >>> DIE DRAHTWERKE NACH TYP (7. Oktober). <<< Weisung: «Drahtwerk
 * Übersicht im 3d und liste mit typ und anzahl», auf Rückfrage «Liste +
 * Hervorheben im 3D». Je Baustein der Rolle Drahtwerk (Fahrdraht, Tragseil,
 * Rückleiter …) die Anzahl über alle Anbauteile (Modul × Anzahl) und die
 * Teile, an denen er hängt; ein Klick hebt diese Teile im 3D hervor, ein
 * zweiter Klick oder Esc nimmt es zurück.
 * ========================================================================= */
export function drahtwerkUebersicht(liste, gliederung = 'typ') {
  /*
   * >>> GLIEDERUNG, MULTIPLIKATOR, ÄNDERN (7. Oktober). <<< Weisung: «hier
   * noch gliederungs filter angeben ob nach typ, abschnitt, bauteil und dann
   * angeben ob ein multiplikator drin ist, das auswählen und im 3d anzeigen
   * gleich behandeln. zudem noch ermöglichen einzen oder in einer selektion
   * der typ oder die anzahl zu modifizieren. als startwert die tabelle
   * zugeklappt lassen.» Gegliedert nach Typ, nach Gruppe (#Abschnitt) oder
   * je Bauteil; jede Zeile kennt die Module, die sie zusammenfasst
   * (`stellen`: Anbauteil i, Modul k), damit Typ und Anzahl dort geändert
   * werden können. Der Multiplikator ist die Anzahl je Stelle (Bündel 2×).
   */
  const je = new Map();
  (liste ?? []).forEach((a, i) => {
    if (a?.aktiv === false) return;
    (a.module ?? []).forEach((m, k) => {
      if (m?.aktiv === false || !m?.bauteil) return;
      let b; try { b = getFlBauteil(m.bauteil); } catch { return; }
      if (b.rolle !== 'drahtwerk') return;
      const gr = anbauGruppe(a) ?? '';
      // «Einzeln» (7. Oktober, «hier noch einzeln aufführen als auswahl»): je
      // Leiter eine Zeile; «Bauteil» fasst je Anbauteil und Typ zusammen.
      /*
       * NAME, LAGE X, HÖHE Z (7. Oktober). Weisung: «Leiter nach name oder x
       * bzw z abschnitt des tragwerks auflisten unter Drahtwerk». Name = die
       * Kettenwerk-Bezeichnung, sonst der Typ; Lage x = die Stelle am Joch
       * (am Masten der Mast mit seiner Höhe); Höhe z = z des Moduls ab der
       * Jochachse bzw. die Höhe über dem Mastfuss.
       */
      const lageX = amMast(a) ? `${a.mastId ?? 'Mast'} h ${(Number(a.hMast) || 0).toFixed(2)}`
        : `x ${(Number(a.x) || 0).toFixed(2)}`;
      const hoeheZ = amMast(a) ? (Number(a.hMast) || 0) + (Number(m.z) || 0) : (Number(m.z) || 0);
      const zText = amMast(a) ? `h ${hoeheZ.toFixed(2)} m (am Mast)` : `z ${hoeheZ >= 0 ? '+' : ''}${hoeheZ.toFixed(2)} m`;
      const nameL = String(m.kettenwerk ?? '').trim() || b.name;
      const key = gliederung === 'einzeln' ? `${i}|${k}`
        : gliederung === 'bauteil' ? `${i}|${m.bauteil}`
        : gliederung === 'gruppe' ? `${gr}|${m.bauteil}`
        : gliederung === 'name' ? nameL
        : gliederung === 'x' ? `${lageX}|${m.bauteil}`
        : gliederung === 'z' ? `${zText}|${m.bauteil}` : m.bauteil;
      const titel = gliederung === 'name' ? nameL
        : gliederung === 'x' ? lageX
        : gliederung === 'z' ? zText
        : gliederung === 'einzeln'
        ? `A${i + 1}.${k + 1} · ${amMast(a) ? `${a.hMast ?? 0} m am Mast` : `x ${(Number(a.x) || 0).toFixed(2)}`}`
          + ` · z ${(Number(m.z) || 0).toFixed(2)}${Math.abs(Number(m.x) || 0) > 1e-9 ? ` · x′ ${Number(m.x).toFixed(2)}` : ''}`
        : gliederung === 'bauteil' ? `A${i + 1} ${a.name ?? ''}`
        : gliederung === 'gruppe' ? (gr ? `#${gr}` : 'ohne Gruppe') : '';
      const ord = gliederung === 'x' ? (amMast(a) ? 1e6 + (Number(a.hMast) || 0) : (Number(a.x) || 0))
        : gliederung === 'z' ? (amMast(a) ? 1e6 + hoeheZ : hoeheZ) : 0;
      const e = je.get(key) ?? { key, id: m.bauteil, name: b.name, titel, anzahl: 0, ord,
                                 teile: [], lagen: [], stellen: [], mult: new Set() };
      const n = Math.max(1, Math.round(Number(m.anzahl) || 1));
      e.anzahl += n;
      e.mult.add(n);
      e.stellen.push({ i, k });
      // Schlüssel des 3D (`AT<Index>`, render.3d.js), angezeigt als A<Nummer>.
      const teil = `AT${i}`;
      if (!e.teile.includes(teil)) {
        e.teile.push(teil);
        e.lagen.push(amMast(a) ? `${a.hMast ?? 0} m am Mast` : `${(Number(a.x) || 0).toFixed(2)} m`);
      }
      je.set(key, e);
    });
  });
  return [...je.values()].map((e) => ({ ...e, mult: [...e.mult].sort((p, q) => p - q) }))
    .sort((p, q) => (gliederung === 'typ' ? q.anzahl - p.anzahl || p.name.localeCompare(q.name)
      : gliederung === 'x' || gliederung === 'z' ? p.ord - q.ord || p.name.localeCompare(q.name)
      : p.titel.localeCompare(q.titel, 'de', { numeric: true }) || p.name.localeCompare(q.name)));
}

/* Gliederung und Auswahl der Übersicht - Ansichtssache, nicht im Stand. */
let dwGliederung = 'typ';
const dwWahl = new Set();
const DW_GLIEDERUNG = [['typ', 'Typ'], ['name', 'Name'], ['x', 'Lage x'], ['z', 'Höhe z'],
  ['gruppe', 'Gruppe'], ['bauteil', 'Bauteil'], ['einzeln', 'Einzeln']];
/** Esc hebt die Auswahl auf (mit dem Hervorheben im 3D). */
export function drahtwerkWahlAufheben() { const war = dwWahl.size > 0; dwWahl.clear(); return war; }

function drahtwerkUebersichtHtml(liste) {
  const d = drahtwerkUebersicht(liste, dwGliederung);
  if (!d.length) return '';
  [...dwWahl].forEach((k) => { if (!d.some((e) => e.key === k)) dwWahl.delete(k); });
  const summe = d.reduce((s, e) => s + e.anzahl, 0);
  const typen = (() => { try { return flBauteile().filter((b) => b.rolle === 'drahtwerk'); } catch { return []; } })();
  const typWahl = (wert, attr) => `<select ${attr}>${wert === null ? '<option value="">– Typ –</option>' : ''}${
    typen.map((b) => `<option value="${esc(b.id)}"${b.id === wert ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select>`;
  const gew = d.filter((e) => dwWahl.has(e.key));
  return klapp('at-drahtwerke-v2', 'Drahtwerke', `
    <div class="dw-leiste">
      <div class="at-knopfreihe dw-gliederung" role="radiogroup" aria-label="Gliederung">${DW_GLIEDERUNG.map(([k, t]) => `<button type="button"
        class="at-knopf${k === dwGliederung ? ' an' : ''}" data-dw-gliederung="${k}">${t}</button>`).join('')}</div>
      <span class="notiz">Überfahren zeigt den Leiter im 3D · Klick wählt und öffnet Typ / Anzahl · Strg+Klick mehrere</span>
    </div>
    ${gew.length ? `<div class="at-auswahl dw-auswahl"><b>${gew.length} gewählt</b>
      ${typWahl(null, 'data-dw-alle-typ')}
      <input type="number" min="1" step="1" data-dw-alle-anz placeholder="× je Stelle" title="Anzahl je Stelle für alle gewählten">
      <button class="btn btn-mini" type="button" data-dw-aufheben>Auswahl aufheben</button></div>` : ''}
    <div class="tabellenrahmen"><table class="dt dw-tab">
      <thead><tr>${dwGliederung === 'typ' ? '' : `<th>${({ gruppe: 'Gruppe', bauteil: 'Bauteil', einzeln: 'Leiter', name: 'Name', x: 'Lage', z: 'Höhe' })[dwGliederung] ?? ''}</th>`}<th>Typ</th>
        <th class="num" title="Stellen (Module)">Stellen</th>
        <th class="num" title="Anzahl je Stelle - der Multiplikator, z. B. Bündel 2×">× je Stelle</th>
        <th class="num">Summe</th><th>an</th></tr></thead>
      <tbody>${d.map((e) => `
        <tr class="klick${dwWahl.has(e.key) ? ' aktiv' : ''}" data-dw-zeile="${esc(e.key)}"
            title="Überfahren: Leiter im 3D · Klick: wählen und bearbeiten (Strg: mehrere, Esc: zurück)">
          ${dwGliederung === 'typ' ? '' : `<td>${esc(e.titel)}</td>`}
          <td>${dwWahl.has(e.key) ? typWahl(e.id, `data-dw-typ="${esc(e.key)}"`) : esc(e.name)}</td>
          <td class="num">${e.stellen.length}</td>
          <td class="num">${dwWahl.has(e.key) ? `<input type="number" min="1" step="1" data-dw-anz="${esc(e.key)}"
            value="${e.mult.length === 1 ? e.mult[0] : ''}" placeholder="${e.mult.join('/')}"
            title="${e.mult.length === 1 ? 'Anzahl je Stelle' : `gemischt: ${e.mult.join(', ')} - ein Wert setzt alle`}">`
            : esc(e.mult.join('/'))}</td>
          <td class="num">${e.anzahl}</td>
          <td>${esc(e.teile.map((t, k) => `A${Number(t.slice(2)) + 1} ${e.lagen[k]}`).join(' · '))}</td></tr>`).join('')}
      </tbody></table></div>`, `${d.length} Zeilen · ${summe} Stück`, false);
}

/* ===========================================================================
 * >>> MEHRFACHAUSWAHL DER ANBAUTEILE (7. Oktober). <<< Weisung: «mit ctrl
 * gedrückt ein markieren der anbauteile ermöglichen dann wird oben eine
 * bearbeiten leiste eingeblendet (bearbeiten -> ein modal öffnet sich mit
 * den gemeinsamen parameter die man dann auf die selektion übertragen kann /
 * löschen oder ausblenden und weiter wenn nützliche befehle ergänzen, aber
 * nicht überladen)». Markiert wird nach Kennung (sie übersteht Umsortieren);
 * die Leiste steht über der Liste, solange etwas markiert ist.
 * ========================================================================= */
const atMarkiert = new Set();
export const anbauMarkiert = () => [...atMarkiert];
export function setzeAnbauMarkiert(ids) { atMarkiert.clear(); (ids ?? []).forEach((id) => atMarkiert.add(id)); }

function auswahlLeisteHtml(liste) {
  const da = new Set((liste ?? []).map((a) => a.id));
  [...atMarkiert].forEach((id) => { if (!da.has(id)) atMarkiert.delete(id); });
  if (!atMarkiert.size) {
    return liste?.length > 1 ? '<p class="notiz" style="margin:4px 0 0">Strg+Klick auf Zeilen markiert mehrere Teile; Rechtsklick öffnet die Befehle.</p>' : '';
  }
  const alleAn = liste.filter((a) => atMarkiert.has(a.id)).every((a) => a.aktiv !== false);
  return `<div class="at-auswahl">
    <b>${atMarkiert.size} markiert</b>
    <button class="btn btn-mini btn-acc" data-atm="bearbeiten" type="button" title="Gemeinsame Angaben für alle markierten Teile setzen">Bearbeiten …</button>
    <button class="btn btn-mini" data-atm="aktiv" type="button">${alleAn ? 'Ausschalten' : 'Einschalten'}</button>
    <button class="btn btn-mini" data-atm="loeschen" type="button" title="Markierte Teile löschen (Rückgängig mit Strg+Z)">${icon('loeschen', 12)} Löschen</button>
    <button class="btn btn-mini" data-atm="aufheben" type="button">Auswahl aufheben</button>
  </div>`;
}

/**
 * >>> EIN GELEERTES ZAHLENFELD WARTET (7. Oktober). <<< Gemeldet zum Feld
 * «Winkel α»: «wenn ich da die null lösche fliege ich aus dem feld raus
 * bevor ich dann eine zahl eingeben kann.» Leer geschrieben wurde 0 (oder
 * die Vorgabe), die Karte baute neu, der Fokus war weg. Während des Tippens
 * bleibt ein leeres Zahlenfeld deshalb ungeschrieben; erst beim Verlassen
 * (`change`) gilt es - als Vorgabe bzw. 0 wie bisher.
 */
const leerBeimTippen = (inp, e) => e?.type === 'input' && inp.type === 'number'
  && inp.value.trim() === '' && !inp.validity?.badInput;
const auchBeimVerlassen = (inp, ev, fn) => {
  inp.addEventListener(ev, fn);
  // Nur das leere Feld wird beim Verlassen nachgeholt - eine Zahl ist beim
  // Tippen schon geschrieben, ein zweiter Schreibvorgang wäre ein zweiter
  // Schritt im Rückgängig.
  if (ev === 'input' && inp.type === 'number') {
    inp.addEventListener('change', (e) => { if (inp.value.trim() === '') fn(e); });
  }
};

/** Rückruf für das Hervorheben im 3D; app.js setzt ihn beim Start. */
let beiDrahtwerk = null;
export function setzeDrahtwerkWahl(fn) { beiDrahtwerk = fn; }

/** Einwirkungsklasse aus der gewählten Windstufe. */
const ekVonWerten = (w) =>
  ({ '0.9': 'EK1', '1.1': 'EK2', '1.3': 'EK3', '1.0': 'EK0' })[w.windKlasse] ?? 'EK2';

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
  const kette = anbauKette(flach, { x0: amMast(a) ? 0 : (a.x ?? 0), zAn: 0,
                                    amMast: amMast(a) });
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
    : abJochachse(a)
      ? '<span class="sec-r">ab Jochachse (beide Gurte, ohne Träger)</span>'
      : '<span class="sec-r">ab Schwerachse des Anschlussgurtes</span>';
}

/**
 * Zählt z dieser Baugruppe ab der Jochachse? Befestigung «beide» und kein
 * Träger (4. Oktober, `bezugsEbene` in core.anbauteile.js).
 */
function abJochachse(a) {
  if (befestigungsArt(a) !== 'durchgehend') return false;
  return !(a.module ?? []).some((m) => {
    if (m.aktiv === false || !m.bauteil) return false;
    try { return getFlBauteil(m.bauteil).rolle === 'traeger'; } catch { return false; }
  });
}

/** Ist diese Id ein Kettenwerk? Ohne Wurf, auch bei unbekannter Id. */
function istKettenwerkId(id) {
  try { return istKettenwerk(getFlBauteil(id)); } catch { return false; }
}

function modulListeHtml(a, i, werte) {
  const module = a.module ?? [];
  const trasse = trasseVon(werte);

  /* =========================================================================
   * >>> TRAGSEIL UND FAHRDRAHT WERDEN GETRENNT GEWAEHLT. <<<
   * =========================================================================
   *
   * Weisung vom 13. September: «wir wollten die kettenwerke ts + fd
   * separieren bei der voreingabe der bauteile. da sonst die eingabe
   * verschachtelt wird.»
   *
   * Die Tabelle fuehrt jede Paarung als eigenen Eintrag - «Ts: StCu 50 /
   * Fd: Cu 107», «Ts: StCu 50 / Fd: Cu 150», «Ts: StCu 92 / Fd: Cu 107».
   * In einer Auswahlliste sind das n mal m Zeilen.
   *
   * JETZT ZWEI SCHRITTE: in der Liste steht der einzelne Leiter, und
   * daneben steht, was als Partner dazukommt. Die Kettenwerke selbst
   * verschwinden aus der Liste - sie sind das ERGEBNIS der beiden Wahlen,
   * nicht eine dritte Moeglichkeit.
   *
   * >>> GERECHNET WIRD WEITER MIT DEM TABELLENEINTRAG. <<<
   *
   * Nachgemessen: das Kettenwerk traegt rund fuenfzehn Prozent mehr Wind
   * als seine beiden Leiter zusammen (0.0240 gegen 0.0208 kN/m bei EK2) -
   * die Haenger und das Y-Beiseil haben auch eine Flaeche. Wer Ts und Fd
   * einzeln ansetzt und addiert, rechnet den Wind zu klein. Die Paarung
   * holt deshalb den Eintrag der Tabelle; gibt es ihn nicht, sagt die
   * Maske das (siehe `flPaarung`).
   */
  /*
   * >>> WELCHEN EINTRAG DIE HAUPTLISTE ZEIGT. <<<
   *
   * Steht im Modul ein KETTENWERK, steht es nicht mehr in der Liste - es ist
   * das Ergebnis zweier Wahlen. Die Liste zeigt dann seinen TRAGSEIL-Eintrag,
   * und das Partnerfeld daneben den Fahrdraht.
   *
   * Ohne diese Zeile zeigte die Liste den ERSTEN Eintrag als gewaehlt an -
   * «Jochaufsatz Norm-Typ einfach», wo ein Kettenwerk steht. Im Browser
   * gefunden, beim ersten Lauf nach dem Umbau: ein falsches Bauteil im Feld,
   * und der naechste Klick haette es wirklich gesetzt.
   */
  const listenWert = (id) => {
    let b = null;
    try { b = getFlBauteil(id); } catch { return id; }
    if (!istKettenwerk(b)) return id;
    const z = flZerlegung(b);
    return flPaarung(z.ts, null, z.anzahl ?? 1)?.id ?? id;
  };

  const auswahl = (wert) => {
    const zeigt = listenWert(wert);
    const gruppe = (rolle, titel, filter = null) => {
      const liste = flBauteile(rolle).filter((b) => !filter || filter(b));
      if (!liste.length) return '';
      return `<optgroup label="${esc(titel)}">${liste.map((b) =>
        `<option value="${esc(b.id)}"${b.id === zeigt ? ' selected' : ''}
          >${esc(b.name)}</option>`).join('')}</optgroup>`;
    };
    /*
     * DER RUECKFALL: gibt es zum Tragseil keinen Einzeleintrag, bleibt das
     * Kettenwerk selbst in der Liste. Lieber ein Eintrag, der dort nicht
     * hingehoert, als ein Feld, das etwas anderes zeigt, als gespeichert ist.
     */
    const fremd = zeigt === wert && istKettenwerkId(wert);
    /*
     * >>> UND OHNE DIE VIELFACHEN. <<<
     *
     * Weisung vom 13. September: «die x2 x3 varianten durch anzahl
     * ersetzen.» Sie stehen daneben im Feld `anzahl`; in der Liste waren
     * sie vier Zeilen fuer eine Zahl, die einen Klick weiter steht. Ein
     * geladener Satz wird beim Normalisieren umgerechnet (siehe
     * `einfacherLeiter` in data.anbauteile.js), sodass hier nichts
     * uebrigbleibt, worauf noch etwas zeigt.
     */
    const einfach = (b) => (flZerlegung(b).anzahl ?? 1) <= 1;
    return gruppe('traeger', 'Träger am Joch') +
           gruppe('aufbau', 'Aufbauten') +
           gruppe('drahtwerk', 'Leiter',
                  (b) => (einfach(b) || b.id === wert)
                      && (!istKettenwerk(b) || (fremd && b.id === wert)));
  };

  /* =========================================================================
   * >>> DER PARTNER HAENGT AM TRAGSEIL - UND ERSCHEINT NUR DORT. <<<
   * =========================================================================
   *
   * Weisung vom 13. September: «die sekundaere eingabe hirarchisch
   * verstehen. nur wenn ein tragseil eingegeben wird dann zusatzauswahl
   * moeglich machen.»
   *
   * Weisung vom 15. September, und sie nimmt meine Loesung zurueck: «die
   * fahrdraht auswahl nur auffuehren, wenn stcu 50 oder 92 (Tragseile)
   * ausgewaehlt ist. dynamisch einblenden nicht abgehakt, das gilt fuer alle
   * elemente in dieser app.»
   *
   * Ich hatte das Feld stehen lassen und GESPERRT, damit beim Wechsel des
   * Bauteils nichts springt. Das war die falsche Abwaegung: ein leeres Feld,
   * das nichts zeigt und nichts kann, ist kein Platzhalter, sondern eine
   * Attrappe. Die Linie des Hauses steht seit dem 1. September in
   * `zeichneMaske`: «wenn nicht aktiv Eingabe ausblenden, sonst verwirrend».
   *
   * >>> DIE REGEL, DIE DARAUS FOLGT. <<<
   *
   * Gesperrt darf ein Feld nur dastehen, wenn es etwas ZEIGT - einen Wert
   * aus dem Katalog, eine Option mit ihrem Grund, eine Aussage. Ein
   * gesperrtes LEERES Feld gehoert weg. Der Pruefstand haelt das fest.
   */
  const partnerFeld = (m, k, i) => {
    let b = null;
    try { b = getFlBauteil(m.bauteil); } catch { return ''; }
    if (b.rolle !== 'drahtwerk') return '';
    const z = flZerlegung(b);
    const kw = istKettenwerk(b);
    const istTs = kw || flTragseile().some((x) => x.name === z.leiter);
    if (!istTs) return '';
    const eigen = kw ? z.ts : z.leiter;
    const gewaehlt = kw ? z.fd : '';
    /*
     * NUR WAS ES IN DER TABELLE GIBT. Eine Paarung ohne Eintrag waere eine
     * Summe, und die faellt beim Wind fuenfzehn Prozent zu klein aus.
     */
    const moeglich = flFahrdraehte()
      .filter((x) => flPaarung(eigen, x.name, z.anzahl ?? 1));
    if (!moeglich.length) return '';
    return `<label class="modul-partner">
      <span class="modul-partner-t">mit Fahrdraht</span>
      <select class="mod" data-mk="partner" data-idx="${i}" data-mod="${k}"
        title="${esc('Der Fahrdraht dieses Kettenwerks. Gerechnet wird mit dem '
          + 'Tabelleneintrag der Paarung, nicht mit der Summe beider Leiter.')}">
        <option value=""${gewaehlt ? '' : ' selected'}>— keiner, einzelner Leiter</option>
        ${moeglich.map((x) => `<option value="${esc(x.name)}"${
          x.name === gewaehlt ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}
      </select></label>`;
  };

  const kette = ketteJeModul(a, werte);

  const zeilen = module.map((m, k) => {
    let b = null;
    try { b = getFlBauteil(m.bauteil); } catch { /* unbekannt */ }
    const kt = kette.get(k);
    const l = baugruppeSumme({ ...a, module: [m], lasten: [] }, { ...trasse, artIndex: k });
    const streckenlast = b && istStreckenlast(b);
    const drahtwerk = b?.rolle === 'drahtwerk';
    // Traverse auf der Achse (x = 0) steht beidseits aus: ihre Länge ist nur Last.
    const laengsAchse = (() => {
      const ax = laengsAchseVon(b);
      return ax === 'x' && Math.abs(Number(m.x) || 0) < 1e-9 ? null : ax;
    })();
    // Beim Drahtwerk steht der ABLENKWINKEL zur Eingabe, nicht die Spannweite:
    // die Spannweite gilt global für die ganze Trasse, der Winkel ist das, was
    // sich am einzelnen Leiter unterscheidet. Leer heisst «aus R und L_FL».
    const alphaAuto = modulWinkel({ ...m, winkel: null }, trasse);
    return `<div class="modul" data-modul="${k}">
      <div class="modul-kopf">
        <span class="bs-wahl">
          <button type="button" class="bs-knopf" data-bs-oeffnen
            title="Baustein wählen - mit Suche">${esc(b?.name ?? m.bauteil ?? '–')}</button>
          <select class="mod bs-liste" data-mk="bauteil" data-idx="${i}" data-mod="${k}"
            hidden>${auswahl(m.bauteil)}</select>
        </span>
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
      ${partnerFeld(m, k, i)}${drahtwerk ? wirkungHtml(i, k, m) : ''}
      ${drahtwerk ? abfangungHtml(a, m, k, werte) : ''}
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
      ${/* Länge-Teil (7. Oktober): die Gesamtlänge steht zur Eingabe, der
          Punkt in ihrer Achse ist die Mitte und steht nur da. */ ''}
      ${laengsAchse ? `<div class="at-gitter">
        ${modFeld(i, k, 'teilLaenge', 'Gesamtlänge', modWert(m, 'teilLaenge'), 'm', 0.05,
                  `${laengsAchse === 'z' ? 'lotrecht' : 'waagrecht'} · Angriffspunkt in der Mitte`)}
      </div>` : ''}
      <div class="at-gitter">
        ${['x', 'y', 'z'].map((ax) => (ax === laengsAchse
          ? `<span class="at-feld lesbar" data-feldname="${ax}"><span>${ax} <i>m</i></span>
               <b>${f2(Number(m[ax]) || 0)}</b><small class="hinweis">Mitte der Länge</small></span>`
          : modFeld(i, k, ax, ax, modWert(m, ax), 'm', ax === 'z' ? 0.05 : 0.1))).join('')}
        ${modFeld(i, k, 'anzahl', 'Anzahl', modWert(m, 'anzahl'), '–', 1)}
      </div>
      ${/* =====================================================================
         * >>> DIE SPANNWEITE BLEIBT EIN ANZEIGEFELD - NACHGEMESSEN. <<<
         * =====================================================================
         *
         * Weisung vom 15. September: «weiter mit der bauteil karte
         * optimieren.» Der Gedanke lag nahe: die Spannweite ist keine
         * Eingabe - sie gilt global fuer die ganze Trasse und steht im
         * Reiter zuoberst. Was man nicht einstellt, ist kein Feld; also in
         * den Hinweis unter dem Winkel damit.
         *
         * IM BROWSER NACHGEMESSEN, und der Gedanke war falsch:
         *
         *   mit Anzeigefeld                            1183 px
         *   im Hinweis, lang («global aus der Gruppe») 1216 px
         *   im Hinweis, kurz («L_FL 40.00 m»)          1194 px
         *
         * Das Feld `at-feld lesbar` ist kompakter als eine zusaetzliche
         * Hinweiszeile: es teilt sich die Gitterzeile mit dem Winkel,
         * waehrend der Hinweis darunter immer eine eigene Zeile bekommt.
         *
         * ALSO BLEIBT ES. Der Vermerk steht hier, damit der Gedanke nicht
         * ein zweites Mal Arbeit macht - er sieht richtig aus und ist es
         * nicht.
         * =================================================================== */''}
      ${/* =====================================================================
         * >>> DIE ABLENKUNG IST ZWEITE EBENE, DER ANGRIFFSPUNKT NICHT. <<<
         * =====================================================================
         *
         * Weisung vom 15. September: «bauteil karte ablenkung in zweite
         * ebene. angriffspunkt nicht, diese eingabe wird oft verwendet,
         * angepasst.»
         *
         * Die Trennlinie liegt also nicht bei «wie wichtig ist die Zahl»,
         * sondern bei «wie oft fasst man sie an». Der Winkel steht im
         * Regelfall auf leer und rechnet sich aus R und L_FL selbst; wer ihn
         * setzt, tut es einmal. Die Lage x/y/z dagegen ist an jedem Bauteil
         * eine andere und wird bei jedem Durchgang nachgezogen.
         *
         * >>> DIE ZAHL STEHT AM DECKEL. <<<
         *
         * Zugeklappt zeigt die Zeile den WIRKSAMEN Winkel - den gesetzten
         * oder den gerechneten. Ein Klappabschnitt, der verbirgt, womit
         * gerechnet wird, waere ein Versteck; einer, der es anschreibt, ist
         * eine Zusammenfassung.
         * =================================================================== */''}
      ${/* =====================================================================
         * >>> WINKEL ODER SPANNWEITE JE LEITER, ZUGEKLAPPT (29. September). <<<
         *
         * Weisung: «hier bei den leitern sollte noch ein feld sein ob man einen
         * individuellen ablenkwinke eintragen will oder die spannweite, am
         * besten zugeklappt, dass es nicht viel platz braucht.»
         *
         * Drei Quellen, eine gilt: die TRASSE (R und L_FL global, Regelfall),
         * ein eingetragener WINKEL (nur die Ablenkung) oder eine eigene
         * SPANNWEITE (Ablenkung aus R und dieser Länge - und, wie der Kern es
         * seit je rechnet, auch Gewicht und Wind des Leiters über diese
         * Länge). Beim Wechsel wird die andere Angabe geleert, damit nicht
         * eine vergessene Zahl still weiterrechnet; die neue startet mit dem
         * Wert, der gerade gilt - so springt nichts.
         * =================================================================== */''}
      ${drahtwerk ? (() => {
        const q = ablenkQuelle(m);
        const Lg = trasse.spannweite ?? 0;
        const wahl = `<label class="at-feld breit2"><span>Ablenkung aus</span>
          <select class="mod" data-mk="ablenkQuelle" data-idx="${i}" data-mod="${k}"
                  data-winkel="${f3(alphaAuto)}" data-laenge="${f2(m.laenge ?? Lg)}">
            <option value="trasse"${q === 'trasse' ? ' selected' : ''}>Trasse (R, Spannweite global)</option>
            <option value="winkel"${q === 'winkel' ? ' selected' : ''}>Winkel eintragen</option>
            <option value="spannweite"${q === 'spannweite' ? ' selected' : ''}>Spannweite eintragen</option>
          </select></label>`;
        const feld = q === 'winkel'
          ? modFeld(i, k, 'winkel', 'Winkel α', modWert(m, 'winkel'), '°', 0.01,
                    `aus der Trasse: ${f3(alphaAuto)}°`)
          : q === 'spannweite'
            ? `${modFeld(i, k, 'laengeFl', 'Spannweite', m.laenge, 'm', 0.5,
                         `global ${f2(Lg)} m`)}
               <span class="at-feld lesbar"><span>Winkel α <i>°</i></span>
                 <b>${f3(alphaAuto)}</b>
                 <small class="hinweis">aus R und dieser Spannweite; sie gilt auch für Gewicht und Wind des Leiters</small></span>`
            : `<span class="at-feld lesbar"><span>Spannweite <i>m</i></span>
                 <b>${f2(Lg)}</b>
                 <small class="hinweis">global, Gruppe «Trasse» · α ${f3(alphaAuto)}°</small></span>`;
        return klapp(`at-abl-${i}-${k}`, 'Ablenkung',
          `<div class="at-gitter">${wahl}${feld}</div>`, ablenkDeckel(m, trasse), false);
      })()
      : streckenlast && !laengsAchse ? `<div class="at-gitter">
        ${modFeld(i, k, 'laenge', 'Länge', modWert(m, 'laenge'), 'm', 0.1)}
      </div>` : ''}
      ${b?.freieFlaeche && istSignalModul(m) ? (() => {
        /*
         * DAS SIGNAL (30. September): Gewicht und Flächen stehen nicht zur
         * Eingabe - sie kommen aus der Auswahl im Signalbauer. Die Karte
         * zeigt die Summe und die Teile; der Knopf öffnet den Bauer.
         */
        const sf = signalFlaeche(m.signal);
        const liste = sf.zeilen.length
          ? `<ul class="signal-liste">${sf.zeilen.map((z) => `<li>${z.anzahl} × ${esc(z.name)}${
              z.laenge ? ` · L ${f2(z.laenge)} m` : ''}</li>`).join('')}</ul>`
          : '<p class="notiz">Noch keine Signalteile gewählt.</p>';
        return `<div class="sec-klein">Signal · ${sf.zeilen.length} Posten</div>
        ${liste}
        ${sf.fehlt.length ? `<p class="notiz warn">Nicht mehr in der Tabelle: ${esc(sf.fehlt.join(', '))}</p>` : ''}
        <div class="at-gitter">
          <span class="at-feld lesbar"><span>Eigengew. <i>kN</i></span><b>${f2(sf.eigengewicht)}</b></span>
          <span class="at-feld lesbar"><span>A quer <i>m²</i></span><b>${f2(sf.aQuer)}</b></span>
          <span class="at-feld lesbar"><span>A längs <i>m²</i></span><b>${f2(sf.aLaengs)}</b></span>
          ${modWahl(i, k, 'cw', 'Profilbeiwert', m.cw ?? SIGNAL_CW,
                    PROFILBEIWERTE.map((p) => ({ key: p.c, label: p.label })))}
        </div>
        <button class="btn btn-mini" type="button" data-signalbauer="${k}" data-idx="${i}"
          >Signalbauer …</button>`;
      })()
      : b?.freieFlaeche ? `<div class="sec-klein">Angriffsfläche</div>
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
  // F_z nach oben (rechte Hand, 1. Oktober): Gewicht und Schnee negativ.
  const anteile = [
    ['G', 'F_z', -(l.Gz ?? 0)], ['G', 'F_x', l.Gx], ['G', 'F_y', l.Gy],
    ['W_x', 'F_x', l.Qx], ['W_y', 'F_y', l.Qy], ['S', 'F_z', -(l.Qz ?? 0)],
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
/* ===========================================================================
 * >>> WAS DIE DREI MOMENTE BEDEUTEN, HÄNGT AM ORT DES TEILS. <<<
 * ===========================================================================
 *
 * Weisung vom 15. September: «berichtigen und durchgängigkeit zu axisvm
 * schaffen.»
 *
 * Die Achsen sind global und ändern sich nicht — M_xx um die Jochachse,
 * M_yy um y, M_zz um die Lotrechte. Was sich ändert, ist ihre WIRKUNG am
 * Bauteil: das Joch liegt in der Jochachse, der Mast steht lotrecht.
 * Dasselbe M_zz biegt das eine im Grundriss und tordiert den anderen.
 *
 * Hier stand nur der Jochtext, auch unter einem Teil am Masten — und er
 * sagte dort das Falsche mit («Biegung im Grundriss», «treten ins Joch
 * ein»). Ein Hinweis, der am halben Bestand die Unwahrheit sagt, ist
 * schlechter als keiner.
 * ========================================================================= */
function momentHinweis(a) {
  const achsen = 'M_xx um die Jochachse · M_yy um y · '
               + 'M_zz um die Lotrechte.';
  if (!amMast(a)) {
    return `${achsen} Am Joch heisst das: M_xx Torsion, M_yy Biegung `
         + 'lotrecht, M_zz Biegung im Grundriss. Sie treten über den '
         + 'Anschlussraster ins Joch ein.';
  }
  /*
   * AM MASTEN STEHT DIE TORSION NUR IN DER TABELLE. Sie wird gefuehrt, aber
   * nicht nachgewiesen - und das gehört dorthin gesagt, wo man die Zahl
   * einträgt. Lautlos aus dem Nachweis fallen darf nichts.
   */
  return `${achsen} Am stehenden Masten heisst das: M_xx Biegung längs `
       + '(in Gleisrichtung), M_yy Biegung quer, M_zz Torsion um die '
       + 'Mastachse — sie geht als Wölbkrafttorsion in den Nachweis ein '
       + 'und wirkt am offenen Profil stark.';
}

/*
 * >>> EIN PUNKT, MEHRERE LASTARTEN (29. September). <<<
 *
 * Frage des Auftraggebers: «kann man bei der freien last verschiedene
 * lastarten eingeben, oder muss man hierfür immer ein neues elemente
 * auswählen, obwohl der angriffspunkt der gleiche ist.» Auf Rückfrage:
 * Variante (b) - ein Block, eine Zeile je Lastart unter einem gemeinsamen
 * Punkt.
 *
 * GEBAUT OHNE FORMATWECHSEL. Jeder Lastblock trägt weiter seine eigene
 * Lage und seine eine Einwirkungsgruppe - Kern, Ausleitung und alte Stände
 * lesen ihn unverändert. Neu ist die Kennung `punkt`: Blöcke mit derselben
 * stehen in der Karte als EIN Punkt, die Lage steht einmal oben und gilt
 * allen, darunter je Lastart eine Zeile. Ein alter Block ohne Kennung ist
 * ein Punkt mit einer Lastart.
 */
const lastPunkt = (l, k) => l?.punkt ?? `#${k}`;

/** Die Blöcke einer Baugruppe nach Punkt geordnet, in ihrer Reihenfolge. */
function lastPunkte(bloecke) {
  const m = new Map();
  bloecke.forEach((l, k) => {
    const p = lastPunkt(l, k);
    if (!m.has(p)) m.set(p, []);
    m.get(p).push({ l, k });
  });
  return [...m.entries()].map(([punkt, zeilen]) => ({ punkt, zeilen }));
}

function lastblockListeHtml(a, i) {
  const bloecke = a.lasten ?? [];
  const lastZeile = ({ l, k }) => {
    const g = EINWIRKUNGEN.find((e) => e.key === l.einwirkung) ?? EINWIRKUNGEN[0];
    const hatMoment = ['Mxx', 'Myy', 'Mzz'].some((f) => Math.abs(l[f] ?? 0) > 0);
    return `<div class="lastblock lastart" data-last="${k}">
      <div class="modul-kopf">
        ${lastWahl(i, k, 'einwirkung', l.einwirkung,
                   EINWIRKUNGEN.filter((e) => !e.intern)
                     .map((e) => ({ key: e.key, label: e.label })))}
        <button class="loeschen" data-last-weg="${k}" data-idx="${i}"
                title="Diese Lastart entfernen">×</button>
      </div>
      <div class="at-gitter">
        ${lastFeld(i, k, 'Fx', 'F_x', l.Fx, 'kN', 0.5)}
        ${lastFeld(i, k, 'Fy', 'F_y', l.Fy, 'kN', 0.5)}
        ${lastFeld(i, k, 'Fz', 'F_z ↑', l.Fz, 'kN', 0.5)}
      </div>
      ${klapp(`last-${a.id}-${k}`, 'Moment (optional)', `
        <div class="at-gitter">
          ${lastFeld(i, k, 'Mxx', 'M_xx', l.Mxx, 'kNm', 0.5)}
          ${lastFeld(i, k, 'Myy', 'M_yy', l.Myy, 'kNm', 0.5)}
          ${lastFeld(i, k, 'Mzz', 'M_zz', l.Mzz, 'kNm', 0.5)}
        </div>
        <p class="hinweis" style="margin:6px 0 0">${momentHinweis(a)}</p>`,
        hatMoment ? 'gesetzt' : '–', hatMoment)}
      <div class="modul-lasten">
        <span class="ablage-meta">Gruppe ${esc(g.label)}</span>
        ${g.art === 'staendig'
          ? '<span class="ablage-meta">feste Wirkrichtung</span>'
          : '<span class="ablage-meta">kehrt mit dem Vorzeichen der Kombination</span>'}
      </div>
    </div>`;
  };
  const punkte = lastPunkte(bloecke);
  const zeilen = punkte.map(({ punkt, zeilen: z }, n) => {
    const erst = z[0].l;
    const lp = (feld, label) => `<label class="at-feld" data-feldname="${feld}">
      <span>${esc(label)} <i>m</i></span>
      <input class="lpunkt" data-lp="${feld}" data-idx="${i}" data-punkt="${esc(punkt)}"
             type="number" step="0.1" value="${erst[feld] ?? 0}"></label>`;
    return `<div class="modul lastpunkt" data-punkt="${esc(punkt)}">
      <div class="modul-kopf">
        <span class="sec-klein" style="flex:1">Punkt ${n + 1}${bezugsHinweis(a)}</span>
        <button class="loeschen" data-punkt-weg="${esc(punkt)}" data-idx="${i}"
                title="Punkt mit allen Lastarten entfernen">×</button>
      </div>
      <div class="at-gitter">${lp('x', 'x')}${lp('y', 'y')}${lp('z', 'z')}</div>
      ${z.map(lastZeile).join('')}
      <button class="btn btn-mini" data-lastart-dazu="${esc(punkt)}" data-idx="${i}"
              type="button">${icon('neu', 11)} Lastart</button>
    </div>`;
  }).join('');

  /*
   * >>> KEIN LEERER BLOCK FUER «KEINE FREIEN LASTEN». <<<
   *
   * Weisung vom 15. September: «weiter mit der bauteil karte optimieren.»
   * Der Abschnitt nahm drei Zeilen - Ueberschrift, «Keine freien Lasten.»
   * und den Knopf -, um zu sagen, dass nichts da ist. Der Knopf sagt es
   * kuerzer: wo «+ Freie Last» steht, gibt es keine.
   *
   * Die Ueberschrift bleibt, sobald WELCHE da sind - dann zaehlt sie und
   * trennt sie von den Bauteilen darueber.
   */
  if (!bloecke.length) {
    return `<button class="btn btn-zufuegen" data-last-neu="${i}" type="button"
      >${icon('neu', 13)} Freie Last</button>`;
  }
  return `<div class="sec">Freie Lasten<span class="sec-r"
      >${punkte.length} Punkt${punkte.length === 1 ? '' : 'e'} · ${bloecke.length} Last${
        bloecke.length === 1 ? '' : 'en'}</span></div>
    <div class="modul-liste">${zeilen}</div>
    <button class="btn btn-zufuegen" data-last-neu="${i}" type="button"
      >${icon('neu', 13)} Freie Last</button>`;
}

/**
 * Die Kräfte einer Baugruppe in ihrer Zeile der Liste.
 * F_x, nicht x: links in derselben Zeile steht die STATION x, und zwei
 * Bedeutungen für denselben Buchstaben in einer Zeile liest niemand richtig.
 * Eine Stelle für den Aufbau und das Nachführen (29. September).
 */
function baugruppeKraft(a, trasse) {
  const su = baugruppeSumme(a, trasse);
  // F_z nach oben (rechte Hand, 1. Oktober).
  return [['F_x', su.Gx + su.Qx], ['F_y', su.Gy + su.Qy], ['F_z', -(su.Gz + su.Qz)]]
    .filter(([, v]) => Math.abs(v) > 0.005)
    .map(([k, v]) => `${k} ${f2(v)}`).join(' · ') || '–';
}

/** Trasseangaben aus den Eingabewerten. */
const trasseVon = (w) => ({ ek: ekVonWerten(w), R: w.trasseRadius,
  spannweite: w.flSpannweite,
  // Abfangart je Leiter: einseitig = halbe Spannweite (3. Oktober) - die
  // Anzeige rechnet wie der Kern.
  artWahl: w.havarie ?? null, artVorgabe: abfangVorgabeFuer(tragwerksart(w).key) });

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

/*
 * Woher der Ablenkwinkel eines Leiters kommt (29. September): ein gesetzter
 * Winkel geht vor, dann eine eigene Spannweite, sonst die Trasse. Dieselbe
 * Rangfolge wie `modulWinkel` und `umlenkkraft` im Kern.
 */
const ablenkQuelle = (m) => (Number.isFinite(m?.winkel) ? 'winkel'
  : Number.isFinite(m?.laenge) && m.laenge > 0 ? 'spannweite' : 'trasse');

/** Was der zugeklappte Deckel der Ablenkung zeigt - beim Aufbau und beim
 *  Nachführen dieselbe Zeile (sonst stand beim Tippen der alte Winkel da). */
function ablenkDeckel(m, trasse) {
  const q = ablenkQuelle(m);
  const alpha = modulWinkel({ ...m, winkel: null }, trasse);
  return q === 'winkel' ? `α ${f3(m.winkel)}° eingetragen`
    : q === 'spannweite' ? `L ${f2(m.laenge)} m · α ${f3(alpha)}°`
    : `α ${f3(alpha)}°`;
}

/** Wert eines Modulfelds für die Anzeige - mit der Vorgabe von oben. */
function modWert(m, feld) {
  // Die Spannweite eines Leiters: leer heisst «global» - nicht die 1 m,
  // die ein übriges Streckenteil ohne Angabe bekommt.
  if (feld === 'laengeFl') return m?.laenge ?? undefined;
  // Gesamtlänge eines Länge-Teils (7. Oktober): ohne Eintrag 2 × Punkt.
  if (feld === 'teilLaenge') {
    let b = null;
    try { b = getFlBauteil(m?.bauteil); } catch { b = null; }
    const L = teilLaenge(m, b);
    return L === null ? undefined : Math.round(L * 1000) / 1000;
  }
  const v = m?.[feld];
  return v === null || v === undefined ? MODUL_VORGABE[feld] : v;
}

// Wie hoch reicht dieser Mast - steht seit dem 28. September in
// ui.schema.js (auch der Fahrdrahtschieber braucht sie) und wird hier unter
// demselben Namen weitergereicht.
export { mastKopfHoehe };

/**
 * >>> DER ANSCHLUSS BLEIBT AM MASTEN (Klarstellung vom 24. September). <<<
 *
 * «der anschlusspunkt liegt innerhalb der mastlänge, aber es sollte dann
 * möglich sein die z koordinate des anbauteils oberhalb der mastspitze
 * anzusetzen (Mastverlängerung mit Rohr)»
 *
 * Damit ist die Weisung vom 20. September («lasten oberhalb mastspitze
 * zulassen») praezisiert, und meine erste Umsetzung war zu weit: ich hatte
 * den Regler zwei Meter über den Kopf hinaus laufen lassen, also den
 * ANSCHLUSS in die Luft gestellt. Geschraubt wird aber am Masten.
 *
 * Was hinausragt, ist die z-Koordinate des MODULS - sie war nie begrenzt,
 * und die Kette baut dafür seit dem 20. September ein starres Glied auf
 * der Mastachse: genau das Rohr, das den Masten verlängert. Gemessen am
 * Einzelmast 8.50 m, Anschluss 8.00 m, Modul z = +1.85: der Lastpunkt
 * liegt bei 9.85 m, seine Lasten stehen dort, und nichts fällt aus dem
 * Modell.
 *
 * `mastReglerHoehe` bleibt als EIN Name fuer die Grenze bestehen - Regler
 * und Duplizieren lesen sie beide -, sie ist jetzt wieder der Kopf.
 */
export function mastReglerHoehe(werte, ende = 'A') {
  return mastKopfHoehe(werte, ende);
}

/** Anzahl eines Moduls: ganze Stück, nie negativ. */
export function anzahlZulaessig(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function modFeld(i, k, feld, label, wert, einheit, schritt, hinweis = '') {
  return `<label class="at-feld" data-feldname="${feld}">
    <span>${esc(label)} <i>${esc(einheit)}</i></span>
    <input class="mod" data-mk="${feld}" data-idx="${i}" data-mod="${k}"
           type="number" step="${schritt}"${feld === 'anzahl' ? ' min="0"' : ''}
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
/* ===========================================================================
 * >>> DREI HAKEN, ZWEI BEZUEGE. <<<
 * ===========================================================================
 *
 * Frage vom 15. September: «es gibt auch abzugsmasten, diese lenken nur die
 * leiter um, dies gilt dann fuer tragseil und fahrdraht. das heisst hier
 * wirken nur ablenk und wind lasten.»
 *
 * Zwei Faelle, die in verschiedene Richtungen ziehen - und sie brauchen kein
 * zusaetzliches Feld, weil die Bezuege aus der Sache folgen:
 *
 *   Gewicht      gilt BEIDEN Leitern. Es haengt am Tragseil, und das gilt
 *                fuer beide (Weisung vom 28. August).
 *   Ablenkung    gilt dem FAHRDRAHT - seine geht in die Drueckstuetze oder
 *                in einen Fahrdrahtabzug an der Haengestuetze.
 *   Wind         ebenso.
 *
 *   Fahrdrahtabzug   Ablenkung und Wind ab  ->  nur der Fahrdraht faellt weg
 *   Abzugsmast       Gewicht ab             ->  beide Leiter, nur Umlenkung
 *
 * >>> UND DAS MUSS AN JEDEM HAKEN STEHEN. <<<
 *
 * Drei Kaestchen nebeneinander, von denen eines etwas anderes meint als die
 * beiden anderen, sind sonst eine Falle - man hakt «Gewicht» ab und erwartet,
 * dass es dem Fahrdraht gilt wie daneben.
 * ========================================================================= */
const WIRKUNGEN = [
  // Schnee ist lotrecht und geht mit dem Gewicht (1. Oktober: «Bei der
  // Auswahl der Einwirkungen bei einem Leiter soll nur Wind stehen nicht
  // noch Schnee dazu, dieser ist dann wider eine vertikale belastung»).
  { key: 'wirktG', label: 'Gewicht/Schnee', bezug: 'beide',
    titel: 'Eigengewicht des Leiters (ständig, Gruppe G) und Schnee darauf '
         + '(veränderlich) - beides lotrecht. Gilt BEIDEN Leitern: das Gewicht '
         + 'hängt am Tragseil. Abwählen beim Abzugsmast, der die Leiter nur '
         + 'umlenkt.' },
  { key: 'wirktAblenk', label: 'Ablenkung', bezug: 'fahrdraht',
    titel: 'Ablenkkraft aus dem Kurvenzug (Z·c/R), ebenfalls ständig. '
         + 'Abwählen, wenn dieser Anteil anderswo hingeht: beim Fahrdraht '
         + 'am Joch in die Drückstütze oder in einen Fahrdrahtabzug an der '
         + 'Hängestütze, am Ausleger in die Spurhaltertraverse.' },
  { key: 'wirktQ', label: 'Wind', bezug: 'fahrdraht',
    titel: 'Wind auf den Leiter, veränderlich, waagrecht' },
];

/**
 * >>> DIE ABFANGUNG DES LEITERS, AM BAUTEIL (29. September). <<<
 *
 * Frage und Weisung: «wie gibt man bei einem joch leiter ein die abgefangen
 * sind (nicht durchgehend). die eingabe über die leiter sollte direkt bei
 * den bauteilen erfolgen.» Bis dahin stand sie nur unter Lasten → Havarie,
 * wo man sie nicht sucht. Gespeichert wird wie bisher je Leiter
 * (`werte.havarie[leiterKennung]`), dieselben Datenattribute - die Havarie-
 * Karte zeigt sie seither nur noch an. Ein Kettenwerk ist ein Leiter: die
 * Angabe gilt allen seinen Teilen.
 *
 * Am ABFANGJOCH kam die Richtung bis zum 29. September aus der Anbindung
 * (vorn/hinten); seither steht sie auch dort am Leiter («Die Zugrichtung
 * wählt man am Leiter (+y / −y) wie beim Tragjoch»). Ohne Eintrag gilt für
 * alte Stände weiter die Seite der Anbindung.
 */
export function abfangungHtml(a, m, k, werte) {
  const key = leiterKennung(a, m, k);
  const e = werte?.havarie?.[key] ?? {};
  const artTw = tragwerksart(werte ?? {}).key;
  const art = e.art ?? abfangVorgabeFuer(artTw);
  const vz = e.richtung === '-y' ? -1 : 1;
  const name = `${a.name ?? 'Leiter'} · ${m.bauteil}`;
  return `<label class="modul-abfang"><span class="modul-partner-t">Abfangung</span>
      <select class="mod-abf" data-hav-key="${esc(key)}" data-hav="art" data-hav-name="${esc(name)}"
        title="${esc(abfangart(art).notiz)}">${ABFANGARTEN.map((x) =>
          `<option value="${x.key}"${x.key === art ? ' selected' : ''}>${esc(x.label)}</option>`).join('')}</select>
      ${/* Seit dem 29. September auch am Abfangjoch: «Die Zugrichtung wählt
           man am Leiter (+y / −y) wie beim Tragjoch.» */''}
      ${art === 'einseitig' ? `<select class="mod-abf" data-hav-key="${esc(key)}"
        data-hav="richtung" data-hav-name="${esc(name)}"
        title="In welche Richtung dieser Leiter zieht (Gleisrichtung) — nur so können sich mehrere Abfangungen aufheben">
        <option value="+y"${vz > 0 ? ' selected' : ''}>zieht nach +y</option>
        <option value="-y"${vz < 0 ? ' selected' : ''}>zieht nach −y</option></select>` : ''}
    </label>`;
}

function wirkungHtml(i, k, m) {
  /*
   * >>> ER STEHT UNTER DEM FAHRDRAHT, UND JEDER HAKEN SAGT, WEM ER GILT. <<<
   *
   * Weisung vom 13. September: unterhalb des Fahrdrahts, weil die
   * Zugehoerigkeit sonst nicht zu sehen ist. Frage vom 15. September: der
   * Abzugsmast lenkt nur um - dort faellt das Gewicht BEIDER Leiter weg,
   * waehrend Ablenkung und Wind beider wirken.
   *
   * Die Bezuege stehen in `WIRKUNGEN`; hier werden sie angeschrieben. Bei
   * einem EINZELNEN Leiter gibt es nichts zu unterscheiden - dann faellt
   * die Beischrift weg, statt «(beide)» an einen einzigen Leiter zu haengen.
   */
  let b = null;
  try { b = getFlBauteil(m.bauteil); } catch { /* unbekannt */ }
  const kw = b ? istKettenwerk(b) : false;
  const z = kw ? flZerlegung(b) : null;
  // Gibt es den Fahrdraht auch einzeln? Nur dann laesst sich sein Anteil
  // abziehen - «N-FL Cu 150» steht nur in der Paarung.
  const trennbar = kw && Boolean(flPaarung(null, z.fd, z.anzahl ?? 1));
  const marke = (x) => {
    if (!kw) return '';
    if (x.bezug === 'beide') return '<i class="wirk-bez">beide</i>';
    return trennbar ? '<i class="wirk-bez fd">Fd</i>'
                    : '<i class="wirk-bez">beide</i>';
  };
  const rechts = !kw ? 'einzelner Leiter'
    : trennbar ? `Fd = ${z.fd}`
    : `${z.fd} gibt es nicht einzeln — die Haken gelten beiden`;
  /*
   * DER HINWEIS IST EINGEKLAPPT UND KURZ (Weisung, 13. September: «den
   * infotext unterhalb einklappbar machen und auf ein minimum reduzieren»).
   */
  const kurz = kw && trennbar
    ? `Gewicht gilt beiden Leitern — es hängt am Tragseil. Ablenkung und Wind `
      + `gelten dem Fahrdraht ${z.fd}; abgewählt bleibt, was das Kettenwerk `
      + 'ohne ihn abgibt, also Tragseil samt Hängern. So trifft dieselbe Zeile '
      + 'beide Fälle: den Fahrdrahtabzug an der Hängestütze (Ablenkung und '
      + 'Wind ab) und den Abzugsmast, der nur umlenkt (Gewicht ab).'
    : kw
      ? `${z.fd} steht nur in der Paarung, nicht als eigener Eintrag — sein `
        + 'Anteil lässt sich nicht abziehen. Alle drei Haken gelten deshalb '
        + 'dem ganzen Kettenwerk.'
      : 'Abgewählt fällt dieser Anteil ganz weg. Beim Abzugsmast, der die '
        + 'Leiter nur umlenkt, ist das Gewicht abzuwählen; Ablenkung und Wind '
        + 'bleiben.';
  return `<div class="sec-klein">Davon wirkt hier<span class="sec-r">${
      esc(rechts)}</span></div>
    <div class="wirkung">
      ${WIRKUNGEN.map((x) => `<label class="schalter" title="${esc(
        `${x.titel}`)}">
        <input class="mod" data-mk="${x.key}" data-idx="${i}" data-mod="${k}"
               type="checkbox" ${m[x.key] === false ? '' : 'checked'}>
        <span>${esc(x.label)}${marke(x)}</span></label>`).join('')}
      <label class="at-feld kette-feld" data-feldname="kettenwerk">
        <span>Kettenwerk</span>
        <input class="mod" data-mk="kettenwerk" data-idx="${i}" data-mod="${k}"
               type="text" value="${esc(m.kettenwerk ?? '')}"
               placeholder="${esc(kw ? 'KW1' : '— erst mit Fahrdraht')}">
      </label>
    </div>
    ${hinweisHtml(`wirk-${i}-${k}`, kurz, { zu: true })}`;
}

/**
 * >>> DIE BAUSTEINWAHL MIT SUCHE (3. Oktober). <<<
 *
 * Auf Rückfrage «Bausteinwahl mit Suche»: statt der langen Liste der
 * Lasttabelle ein kleines Fenster unter dem Knopf - Suchfeld im Fokus, die
 * Gruppen der Liste (Träger, Aufbauten, Leiter) als Überschriften, Enter
 * nimmt den ersten Treffer. Die Liste selbst bleibt als verborgenes Feld
 * stehen: sie trägt die Regeln (was dort stehen darf, die Vielfachen, das
 * Kettenwerk), und gewählt wird über sie - dasselbe `change` wie bisher,
 * also derselbe Weg in den Stand, ins Rückgängig und in den Neuaufbau.
 */
function bausteinWahlOeffnen(knopf, liste) {
  if (!knopf || !liste) return;
  document.getElementById('bs-fenster')?.remove();
  const gruppen = [...liste.querySelectorAll('optgroup')];
  const teile = gruppen.length ? gruppen.map((g) => ({ titel: g.label, opts: [...g.querySelectorAll('option')] }))
    : [{ titel: '', opts: [...liste.options] }];
  const el = document.createElement('div');
  el.id = 'bs-fenster';
  el.className = 'bs-fenster';
  el.innerHTML = `<input type="search" class="vl-suche" placeholder="Suchen … Enter nimmt den ersten"
      aria-label="Baustein suchen">
    <div class="bs-gruppen">${teile.map((t) => `<div class="bs-gruppe">
      ${t.titel ? `<div class="sw-t">${esc(t.titel)}</div>` : ''}
      ${t.opts.map((o) => `<button type="button" class="bs-eintrag${o.selected ? ' an' : ''}"
        data-v="${esc(o.value)}" data-suche="${esc(suchNorm(`${o.textContent} ${t.titel}`))}"
        >${esc(o.textContent.trim())}</button>`).join('')}</div>`).join('')}
      <p class="notiz bs-keine" hidden>Kein Baustein passt.</p></div>`;
  document.body.appendChild(el);
  const r = knopf.getBoundingClientRect();
  const w = Math.max(260, r.width);
  el.style.width = `${w}px`;
  el.style.left = `${Math.max(6, Math.min(r.left, window.innerWidth - w - 6))}px`;
  const h = el.offsetHeight;
  el.style.top = `${r.bottom + 4 + h > window.innerHeight ? Math.max(6, r.top - h - 4) : r.bottom + 4}px`;
  const zu = () => {
    el.remove();
    document.removeEventListener('pointerdown', aussen, true);
  };
  const aussen = (e) => { if (!el.contains(e.target) && e.target !== knopf) zu(); };
  document.addEventListener('pointerdown', aussen, true);
  const nimm = (v) => {
    zu();
    if (v === liste.value) return;
    liste.value = v;
    // Der Knopf zeigt die Wahl sofort, auch wenn die Karte nicht neu aufgebaut wird.
    knopf.textContent = liste.selectedOptions[0]?.textContent.trim() ?? knopf.textContent;
    liste.dispatchEvent(new Event('change', { bubbles: true }));
  };
  el.querySelectorAll('.bs-eintrag').forEach((b) => { b.onclick = () => nimm(b.dataset.v); });
  const such = el.querySelector('.vl-suche');
  such.addEventListener('input', () => {
    let n = 0;
    el.querySelectorAll('.bs-gruppe').forEach((g) => {
      let k = 0;
      g.querySelectorAll('.bs-eintrag').forEach((b) => {
        const an = suchtextPasst(b.dataset.suche, such.value);
        b.hidden = !an;
        if (an) k += 1;
      });
      g.hidden = k === 0;
      n += k;
    });
    el.querySelector('.bs-keine').hidden = n > 0;
  });
  such.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); zu(); knopf.focus(); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const erste = [...el.querySelectorAll('.bs-eintrag')].find((b) => !b.hidden && !b.closest('.bs-gruppe')?.hidden);
    if (erste) nimm(erste.dataset.v);
  });
  such.focus({ preventScroll: true });
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
  /*
   * >>> ANSICHT x-z UND DRAUFSICHT x-y (19. September). <<<
   *
   * Nachgeprueft auf Weisung («prüfe diese darstellung auf deren
   * richtigkeit»): die Skizze hiess «Lage im Querschnitt», zeichnete
   * waagrecht aber y - die Gleisrichtung - und liess die Ausladung x ganz
   * weg. Der Arm war immer 40 px lang, auch bei x = y = 0; F_y stand als
   * Pfeil IN der Ebene, F_x fehlte. Rechts ragte die Notiz ueber den Rand,
   * und der Mast stand immer bis ganz oben.
   *
   * Danach die Weisung: «mach eine ansicht in xz und eine draufsicht in xy».
   *
   *   LINKS   Ansicht x-z: der Mast in seiner Laenge, massstaeblich in der
   *           Hoehe; der Anschluss auf h, von dort waagrecht x, dann
   *           lotrecht z - der Weg des Modells (anbauKette, `amMast`).
   *           F_x und F_z in der Ebene, F_y aus der Ebene.
   *   RECHTS  Draufsicht x-y: das Profil mit seiner Stegrichtung, der Arm
   *           erst in y, dann in x - wieder wie das Modell. F_x und F_y in
   *           der Ebene, F_z in die Ebene hinein.
   *
   * x ist an beiden Enden GLOBAL, positiv nach rechts (Weisung vom
   * 28. August); y positiv in Gleisrichtung, in der Draufsicht nach oben.
   * Die Versaetze sind schematisch: massstaeblich waere das Teil neben
   * einem zwoelf Meter hohen Masten unsichtbar.
   */
  const t0 = tragwerkeVon(werte)[0];
  const mast = t0 ? (mastenFuer(werte, t0) ?? [])[ende === 'B' ? 1 : 0] : null;
  const name = mastNameAmEnde(werte, t0, ende) || `Mast ${ende}`;
  // Dieselbe Laenge wie in der Leiste: eingetragen, sonst die Vorgabe des
  // Feldes aus der freien Hoehe.
  const H = Number(ende === 'B' ? (werte.mastHB ?? werte.mastH) : werte.mastH) || 0;
  const laenge = Number(mast?.laenge) || Number(ende === 'B'
    ? (werte.mastLaengeB ?? werte.mastLaenge) : werte.mastLaenge)
    || (H > 0 ? mastLaengeFuer(werte, H - (Number(mast?.fuss) || 0)) : 0);
  const hoch = Math.max(laenge, hMast, 1);
  const steg = mast?.steg ?? (ende === 'B' ? (werte.mastStegB ?? werte.mastSteg)
                                           : werte.mastSteg) ?? 'jochachse';

  const punkte = [...(a.module ?? []), ...(a.lasten ?? [])];
  const groesst = (k) => punkte.reduce(
    (s, p) => (Math.abs(p[k] ?? 0) > Math.abs(s) ? (p[k] ?? 0) : s), 0);
  const xW = groesst('x'), yW = groesst('y'), zW = groesst('z');
  const da = (v) => Math.abs(v) > 1e-9;
  const schema = (v, grund, max) => (da(v) ? Math.sign(v) * Math.min(max, grund + Math.abs(v) * 14) : 0);
  const sx = da(xW) ? Math.sign(xW) : 1;          // wohin der Arm zeigt
  const steht = zW > 1e-9;

  const pfeil = (feld, x1, y1, dx, dy, txt, anker = null) => `
    <g class="sk-kraft" data-zu="${feld}">
      <line x1="${x1}" y1="${y1}" x2="${x1 + dx}" y2="${y1 + dy}"/>
      <polygon points="${x1 + dx},${y1 + dy} ${x1 + dx - dy * 0.18 - dx * 0.22},${y1 + dy + dx * 0.18 - dy * 0.22} ${x1 + dx + dy * 0.18 - dx * 0.22},${y1 + dy - dx * 0.18 - dy * 0.22}"/>
      <text x="${x1 + dx + (dx < 0 ? -4 : dx > 0 ? 4 : 5)}" y="${y1 + dy + (dy > 0 ? 10 : dy < 0 ? -3 : -4)}"
        text-anchor="${anker ?? (dx < 0 ? 'end' : 'start')}">${esc(txt)}</text>
    </g>`;
  // Kraft senkrecht zur Ebene: aus der Ebene ⊙ (Punkt), in die Ebene ⊗ (Kreuz).
  const senkrecht = (feld, cx, cy, heraus, txt, rechts = true) => `
    <g class="sk-kraft" data-zu="${feld}">
      <circle cx="${cx}" cy="${cy}" r="4" fill="none" stroke="var(--achse)" stroke-width="1.2"/>
      ${heraus ? `<circle cx="${cx}" cy="${cy}" r="1.2" fill="var(--achse)"/>`
        : `<line x1="${cx - 2.6}" y1="${cy - 2.6}" x2="${cx + 2.6}" y2="${cy + 2.6}" stroke="var(--achse)" stroke-width="1.1"/>
           <line x1="${cx - 2.6}" y1="${cy + 2.6}" x2="${cx + 2.6}" y2="${cy - 2.6}" stroke="var(--achse)" stroke-width="1.1"/>`}
      <text x="${cx + (rechts ? 6 : -6)}" y="${cy + 3}" text-anchor="${rechts ? 'start' : 'end'}">${esc(txt)}</text>
    </g>`;
  const schraffur = (x0, y0) => [0, 1, 2, 3, 4].map((i) =>
    `<line class="sk-steg" x1="${x0 - 12 + i * 6}" y1="${y0}"
       x2="${x0 - 16 + i * 6}" y2="${y0 + 8}"/>`).join('');

  // --- Ansicht x-z ---------------------------------------------------------
  const yKopf = 24, yFuss = 136, halb = 4;
  const cx = sx < 0 ? 118 : 60;
  const skala = (h) => yFuss - Math.max(0, Math.min(1, h / hoch)) * (yFuss - yKopf);
  const yTop = skala(hoch > hMast ? laenge || hoch : hoch);
  const py = skala(hMast);
  const ax = cx + schema(xW, 18, 44);
  const az = Math.max(16, Math.min(yFuss - 4, py - schema(zW, 12, 28)));
  const hSeite = -sx;                              // h steht auf der Gegenseite
  // Das z-Mass steht hinter dem F_x-Pfeil; ohne Arm liegt der Pfeil davor.
  const zAb = ax === cx ? 48 : 36;
  const hX = cx + hSeite * 20;
  const ansicht = `
    <text class="sk-titel" x="6" y="12">Ansicht x–z · ${esc(name)}</text>
    <line class="sk-gurt" x1="${cx - halb}" y1="${yTop}" x2="${cx - halb}" y2="${yFuss}"/>
    <line class="sk-gurt" x1="${cx + halb}" y1="${yTop}" x2="${cx + halb}" y2="${yFuss}"/>
    <line class="sk-steg" x1="${cx - 14}" y1="${yFuss}" x2="${cx + 14}" y2="${yFuss}"/>
    ${schraffur(cx, yFuss)}
    <line class="sk-an" x1="${cx - halb - 4}" y1="${py}" x2="${cx + halb + 4}" y2="${py}"/>
    <g class="sk-teil">
      ${ax !== cx ? `<line x1="${cx}" y1="${py}" x2="${ax}" y2="${py}"/>` : ''}
      ${az !== py ? `<line x1="${ax}" y1="${py}" x2="${ax}" y2="${az}"/>` : ''}
      <circle cx="${ax}" cy="${az}" r="2.6"/>
    </g>
    <g class="sk-mass" data-zu="hMast">
      <line x1="${hX}" y1="${yFuss}" x2="${hX}" y2="${py}"/>
      <text x="${hX + hSeite * 3}" y="${(yFuss + py) / 2 + 3}"
        text-anchor="${hSeite < 0 ? 'end' : 'start'}">h ${hMast.toFixed(2)} m</text>
    </g>
    ${ax !== cx ? `<g class="sk-mass" data-zu="x">
      <line x1="${cx}" y1="${py + (steht ? 8 : -8)}" x2="${ax}" y2="${py + (steht ? 8 : -8)}"/>
      <text x="${(cx + ax) / 2}" y="${py + (steht ? 17 : -11)}" text-anchor="middle">x ${xW.toFixed(2)}</text>
    </g>` : ''}
    ${az !== py ? `<g class="sk-mass" data-zu="z">
      <line x1="${ax + sx * zAb}" y1="${py}" x2="${ax + sx * zAb}" y2="${az}"/>
      <text x="${ax + sx * (zAb + 3)}" y="${(py + az) / 2 + 3}"
        text-anchor="${sx > 0 ? 'start' : 'end'}">z ${zW.toFixed(2)}</text>
    </g>` : ''}
    ${pfeil('Fx', ax, az, sx * 18, 0, 'F_x')}
    ${pfeil('Fz', ax + (steht ? sx * 5 : 0), az, 0, 14, 'F_z')}
    ${steht
      ? senkrecht('Fy', ax - sx * 12, az - 10, true, 'F_y', sx < 0)
      : senkrecht('Fy', ax + sx * 12, az + 12, true, 'F_y', sx > 0)}
    <text class="sk-notiz" x="6" y="158">h ab Fundament${
      laenge > 0 ? ` · L ${laenge.toFixed(2)} m` : ''}</text>`;

  // --- Draufsicht x-y ------------------------------------------------------
  const ox = sx < 0 ? 246 : 212, oy = 86;
  const px = ox + schema(xW, 16, 44);
  const pyD = oy - schema(yW, 14, 38);             // y nach oben
  // HEB als Umriss: Flansche parallel zum Gleis, wenn der Steg quer steht.
  const b = 9, t = 1.6;
  const profil = steg === 'quer'
    ? `<rect x="${ox - b}" y="${oy - b}" width="${2 * b}" height="${t * 2}"/>
       <rect x="${ox - b}" y="${oy + b - t * 2}" width="${2 * b}" height="${t * 2}"/>
       <rect x="${ox - t / 2}" y="${oy - b}" width="${t}" height="${2 * b}"/>`
    : `<rect x="${ox - b}" y="${oy - b}" width="${t * 2}" height="${2 * b}"/>
       <rect x="${ox + b - t * 2}" y="${oy - b}" width="${t * 2}" height="${2 * b}"/>
       <rect x="${ox - b}" y="${oy - t / 2}" width="${2 * b}" height="${t}"/>`;
  const draufsicht = `
    <text class="sk-titel" x="176" y="12">Draufsicht x–y</text>
    <g class="sk-profil">${profil}</g>
    <g class="sk-teil">
      ${pyD !== oy ? `<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${pyD}"/>` : ''}
      ${px !== ox ? `<line x1="${ox}" y1="${pyD}" x2="${px}" y2="${pyD}"/>` : ''}
      <circle cx="${px}" cy="${pyD}" r="2.6"/>
    </g>
    ${px !== ox ? `<g class="sk-mass" data-zu="x">
      <line x1="${ox}" y1="${pyD + (pyD <= oy ? -9 : 9)}" x2="${px}" y2="${pyD + (pyD <= oy ? -9 : 9)}"/>
      <text x="${(ox + px) / 2}" y="${pyD + (pyD <= oy ? -12 : 18)}" text-anchor="middle">x ${xW.toFixed(2)}</text>
    </g>` : ''}
    ${pyD !== oy ? `<g class="sk-mass" data-zu="y">
      <line x1="${ox - sx * 16}" y1="${oy}" x2="${ox - sx * 16}" y2="${pyD}"/>
      <text x="${ox - sx * 19}" y="${(oy + pyD) / 2 + 3}"
        text-anchor="${sx > 0 ? 'end' : 'start'}">y ${yW.toFixed(2)}</text>
    </g>` : ''}
    ${pfeil('Fx', px, pyD, sx * 18, 0, 'F_x')}
    ${pfeil('Fy', px, pyD, 0, -16, 'F_y', 'middle')}
    ${senkrecht('Fz', px + sx * 12, pyD + 12, false, 'F_z', sx > 0)}
    <text class="sk-notiz" x="176" y="158">y in Gleisrichtung ↑</text>`;

  return `<svg class="at-skizze" viewBox="0 0 300 165" role="img"
     aria-label="Massskizze am Masten: Ansicht x-z und Draufsicht x-y">
    ${ansicht}
    <line class="sk-trenn" x1="168" y1="6" x2="168" y2="160"/>
    ${draufsicht}
  </svg>`;
}


/**
 * ===========================================================================
 * DIE SKIZZE AM ABFANGJOCH.
 * ===========================================================================
 *
 * Weisung vom 4. September: «Die diagrammdarstellung auf die lasten
 * anpassen.»
 *
 * `anbauteilSkizze` zeichnet das TRAGJOCH: zwei Gurtebenen übereinander,
 * vier Winkel, ein Anschluss oben oder unten. Am Abfangjoch stand damit ein
 * Querschnitt, den es dort nicht gibt — und daneben ein Kräftepaar F_y/F_z,
 * das die eigentliche Frage nicht beantwortet: wohin zieht der Leiter?
 *
 * Hier steht, was am Abfangjoch gilt:
 *
 *   LINKS   Blick in die Jochachse. Zwei Gurte NEBENEINANDER, dazwischen
 *           die lichte Weite. Die Anbindung ist zu sehen — über beide Gurte
 *           oder auf Mitte Träger — und der Leiterzug zieht waagrecht nach
 *           vorn, nach hinten oder gar nicht.
 *
 *   RECHTS  Draufsicht. Der Träger liegt, die Rahmenebene ist waagrecht;
 *           der Leiter läuft quer dazu ab. Genau so sieht man, ob er
 *           durchgeht oder endet.
 *
 * Die KRÄFTE sind die gerechneten, nicht gezeichnete Platzhalter: G aus dem
 * Eigengewicht der Baugruppe, Z_ab aus den Kennwerten der Drahtwerke
 * (Weisung: «die Leiterzugkräfte ergeben sich dann aus den kennwerten der
 * bauteile»).
 */

function anbauteilSkizzeAbfang(a, werte) {
  const an = abfangAnbindung(a);
  const x = a.x ?? 0, L = werte.L ?? 20;
  let lw = null;
  try {
    const wt = mitTrasse(werte);
    lw = abfangAnbauLasten(a, { ek: wt.ek, R: wt.R,
                                spannweite: wt.L_FL, havarie: werte.havarie });
  } catch { lw = null; }

  // --- links: Blick in die Jochachse --------------------------------------
  const cx = 74, cyM = 68;                 // Mitte des Querschnitts
  const halb = 30;                         // halber Gurtabstand im Bild
  const hh = 20;                           // halbe Profilhöhe im Bild
  const gurtBild = (sy) => `
    <rect class="sk-winkel" x="${cx + sy * halb - 7}" y="${cyM - hh}"
          width="14" height="${2 * hh}" rx="1"/>`;
  // Die Anbindung: über beide Gurte ein Riegel, auf Mitte ein Punkt.
  const anbindung = an.art === 'gurte'
    ? `<line class="sk-an" x1="${cx - halb}" y1="${cyM}" x2="${cx + halb}" y2="${cyM}"/>`
    : `<line class="sk-an" x1="${cx - 5}" y1="${cyM}" x2="${cx + 5}" y2="${cyM}"/>`;
  // Der Leiterzug: die Richtung ist die Aussage.
  const zPfeil = (sy) => `
    <g class="sk-kraft" data-zu="verlauf">
      <line x1="${cx}" y1="${cyM}" x2="${cx + sy * 52}" y2="${cyM}"/>
      <polygon points="${cx + sy * 52},${cyM} ${cx + sy * 44},${cyM - 4}
                       ${cx + sy * 44},${cyM + 4}"/>
    </g>`;
  const zRichtungen = an.art !== 'mitte' ? []
    : (an.verlauf === 'durchgehend' ? [1, -1] : [an.seite === 'H' ? -1 : 1]);
  const zText = lw && lw.Z
    ? `Z_ab ${Math.abs(lw.Z).toFixed(2)} kN`
    : (an.verlauf === 'durchgehend' ? 'durchgehend — kein Z' : '');
  const gText = lw && lw.Gz ? `G ${Math.abs(lw.Gz).toFixed(2)} kN` : '';

  // --- rechts: Draufsicht -------------------------------------------------
  const aX0 = 186, aX1 = 288, gyV = 46, gyH = 92;
  const px = aX0 + Math.max(0, Math.min(1, x / (L || 1))) * (aX1 - aX0);
  const leiterDraufsicht = an.art !== 'mitte' ? '' : zRichtungen.map((sy) => `
    <line class="sk-teil" x1="${px}" y1="${(gyV + gyH) / 2}"
          x2="${px}" y2="${sy > 0 ? gyV - 16 : gyH + 16}"/>
    ${an.verlauf === 'durchgehend' ? '' : `<circle class="sk-winkel" cx="${px}"
          cy="${sy > 0 ? gyV - 16 : gyH + 16}" r="3"/>`}`).join('');

  return `<svg class="at-skizze" viewBox="0 0 300 165" role="img"
     aria-label="Massskizze am Abfangjoch">
    <text class="sk-titel" x="8" y="12">Blick in die Jochachse</text>
    ${gurtBild(-1)}${gurtBild(1)}
    ${anbindung}
    ${an.art === 'gurte'
      ? `<line class="sk-teil" x1="${cx}" y1="${cyM}" x2="${cx}" y2="${cyM + 30}"/>
         <circle class="sk-winkel" cx="${cx}" cy="${cyM + 30}" r="2.6"/>`
      : `<circle class="sk-winkel" cx="${cx}" cy="${cyM}" r="3"/>`}
    ${zRichtungen.map(zPfeil).join('')}
    <g class="sk-kraft" data-zu="Fz">
      <line x1="${cx}" y1="${cyM + 30}" x2="${cx}" y2="${cyM + 44}"/>
      <polygon points="${cx},${cyM + 44} ${cx - 4},${cyM + 36} ${cx + 4},${cyM + 36}"/>
    </g>
    <text class="sk-notiz" x="8" y="142">${esc(zText)}</text>
    <text class="sk-notiz" x="8" y="154">${esc(gText)}</text>

    <text class="sk-titel" x="186" y="12">Draufsicht</text>
    <line class="sk-gurt" x1="${aX0}" y1="${gyV}" x2="${aX1}" y2="${gyV}"/>
    <line class="sk-gurt" x1="${aX0}" y1="${gyH}" x2="${aX1}" y2="${gyH}"/>
    <line class="sk-steg" x1="${px}" y1="${gyV}" x2="${px}" y2="${gyH}"/>
    ${leiterDraufsicht}
    <g class="sk-mass" data-zu="x">
      <line x1="${aX0}" y1="112" x2="${px}" y2="112"/>
      <text x="${aX0}" y="124">x ${x.toFixed(2)} m</text>
    </g>
    <text class="sk-notiz" x="186" y="140">vorn oben · 0 … ${L.toFixed(1)} m</text>
    <text class="sk-notiz" x="186" y="152">${esc(
      an.art === 'gurte' ? 'über beide Gurte'
        : `Mitte Träger · ${ABFANG_VERLAEUFE.find(
             (v) => v.key === an.verlauf)?.label ?? ''}`)}</text>
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

  // Lastangriff: unterhalb bei e_v > 0, oberhalb bei e_v < 0. Ab der
  // Jochachse (beide Gurte, ohne Träger, 4. Oktober) liegt z = 0 in der Mitte.
  const achse = abJochachse(a);
  const cyM = (cyO + cyU) / 2;
  const abY = achse ? cyM : ev >= 0 ? cyU : cyO;
  const anY = achse && !ev ? cyM
    : ev >= 0 ? Math.min(150, cyU + 42) : Math.max(12, cyO - 30);
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
  if (amMast(a)) return anbauteilSkizzeMast(a, werte);
  /*
   * >>> DAS ABFANGJOCH BEKOMMT SEINE EIGENE. <<<
   *
   * Weisung vom 4. September: «Die diagrammdarstellung auf die lasten
   * anpassen.» Die Jochskizze zeigt zwei Gurtebenen uebereinander und ein
   * Kraeftepaar F_y/F_z - beides gilt am Abfangjoch nicht, und die
   * eigentliche Frage, wohin der Leiter zieht, beantwortet sie gar nicht.
   */
  if (tragwerksart(werte).key === 'abfangjoch') {
    return anbauteilSkizzeAbfang(a, werte);
  }
  return anbauteilSkizze(a, werte);
}

/** Rolle eines Moduls aus der Lasttabelle; null, wenn unbekannt. */
function modulRolle(m) {
  try { return getFlBauteil(m.bauteil).rolle; } catch { return null; }
}

/**
 * Schalter «Wind des Auslegers über die Fahrleitung».
 *
 * Erscheint, wo er etwas bedeutet: die Baugruppe braucht einen AUFBAU
 * (Ausleger). Ohne ihn gibt es keinen Zweifeldträger, und der Schalter
 * stünde wirkungslos da.
 *
 * >>> EIN TRAEGER IST NICHT MEHR BEDINGUNG (20. September). <<<
 * Weisung: «bei den auslegern den windanteil auf den masten wirken lassen
 * (ähnlich wie bei der hängestütze), da die leiter als quasi auflager
 * wirken.» Ein Ausleger am Masten hat keine Hängestütze; der Anteil geht
 * dann auf die Mastachse. Was gerechnet wird, steht bei windAufTraeger in
 * data.anbauteile.js.
 */
function windVersatzHtml(a, i) {
  const rollen = (a.module ?? []).map(modulRolle);
  const tr = (a.module ?? []).find((m, k) => rollen[k] === 'traeger');
  if (!rollen.includes('aufbau')) return '';
  const an = a.windAufTraeger === true;
  const p = a.windAnteil ?? 50;
  return `<div class="sec-klein">Lasteintrag des Auslegers</div>
    <label class="schalter"><input class="at" data-k="windAufTraeger"
      type="checkbox"${an ? ' checked' : ''}><span>Fahrleitung als Auflager
      ansetzen</span></label>
    ${an ? `<div class="at-gitter">
      ${atFeld(i, 'windAnteil', `in ${tr ? 'den Träger' : 'den Masten'}`, p, '%', 5)}
      <span class="at-feld lesbar"><span>Fahrleitung trägt <i>%</i></span>
        <b>${f0(100 - p)}</b></span>
      <span class="at-feld lesbar"><span>Eintrag <i>–</i></span>
        <b>Anschluss</b><small class="hinweis">${tr ? 'Ausleger/Stütze'
          : 'Ausleger/Mast'}</small></span>
    </div>` : ''}
    ${hinweisHtml(`windv-${a.id}`, 'Das äussere Ende des Auslegers hält die '
      + 'Fahrleitung, und die ist durch den Leiterzug seitlich gespannt - sie '
      + 'wirkt dort als Auflager. Der Wind auf den Ausleger verteilt sich '
      + 'damit auf zwei Auflager: die eine Hälfte nimmt die Fahrleitung auf '
      + 'und trägt sie längs zu den Nachbaraufhängungen ab, die andere geht '
      + `in ${tr ? 'den Träger' : 'den Masten'}. Nur dieser `
      + 'Anteil kommt am Tragwerk an, und zwar am ANSCHLUSSPUNKT: auf der '
      + `Achse ${tr ? 'des Trägers' : 'des Mastes'}, auf der `
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
/** Kurze Namen der Befestigungsarten für die Knopfreihe (2. Oktober). */
const BEFESTIGUNG_KURZ = { unten: 'Untergurt', oben: 'Obergurt', durchgehend: 'beide' };

/**
 * Befestigung als drei Knöpfe, das Raster daneben (2. Oktober). Die Knöpfe
 * sind Radiofelder der Klasse `at` - derselbe Weg wie jedes Feld der Karte.
 */
function atBefestigung(i, a) {
  const wert = befestigungsArt(a);
  return `<div class="at-befestigung breit2" data-feldname="befestigung">
    <span class="at-bef-titel">Befestigung</span>
    <div class="at-bef-reihe">
      <div class="at-knopfreihe" role="radiogroup" aria-label="Befestigung">
        ${BEFESTIGUNGEN.map((o) => `<label class="at-knopf${o.key === wert ? ' an' : ''}" title="${esc(o.label)}">
          <input type="radio" class="at" name="at-bef-${i}" data-k="befestigung" data-idx="${i}"
            value="${esc(o.key)}"${o.key === wert ? ' checked' : ''}>${esc(BEFESTIGUNG_KURZ[o.key] ?? o.label)}</label>`).join('')}
      </div>
      ${atFeld(i, 'raster', 'Raster', a.raster, 'm', 0.05)}
    </div>
    ${hinweisHtml(`at-${i}-befestigung`, BEFESTIGUNG_WIRKUNG[wert], { zu: true })}
  </div>`;
}

function atWahl(i, k, label, wert, optionen, hinweis = '') {
  return `<label class="at-feld breit2" data-feldname="${k}">
    <span>${esc(label)}</span>
    <select class="at" data-k="${k}" data-idx="${i}">${optionen.map((o) =>
      `<option value="${esc(o.key)}"${o.key === wert ? ' selected' : ''}
        >${esc(o.label)}</option>`).join('')}</select>
    ${hinweisHtml(`at-${i}-${k}`, hinweis, { zu: true })}
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
let beiAnbauOeffnen = null, beiAnbauDuplizieren = null, beiAnbauKontext = null;
let beiAnbauAlleWeg = null, beiSignalDirekt = null;
let beiAnbauNeu = null, beiAnbauAuswahlBearbeiten = null, beiAnbauGruppeDup = null;

/** Rückrufe der Anbauteil-Oberfläche registrieren (einmalig beim Start). */
export function setzeAnbauHandler(h) {
  beiVorlageWahl = h.wahl; beiVorlageWeg = h.weg;
  beiVorlageSichern = h.sichern; beiGenerator = h.generator;
  beiAnbauZoom = h.zoom; beiVorlageBearbeiten = h.bearbeiten;
  beiAnbauOeffnen = h.oeffnen;
  beiAnbauDuplizieren = h.duplizieren; beiAnbauKontext = h.kontext;
  beiAnbauAlleWeg = h.alleWeg; beiSignalDirekt = h.signal;
  beiAnbauNeu = h.neuZeichnen; beiAnbauAuswahlBearbeiten = h.auswahlBearbeiten;
  beiAnbauGruppeDup = h.gruppeDuplizieren;
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
                 min="0" value="${m.anzahl ?? 1}"></label>
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
      positiv nach oben. Ein hängendes Teil hat also z &lt; 0. Bei
      Befestigung «beide» ohne Hängestütze oder Jochaufsatz zählt z ab der
      Jochachse - z = 0 liegt dann in der Mitte.</p>`;
}

function verdrahteAnbauteile(container, werte, onAnbau) {
  if (!onAnbau) return;
  // Immer den AKTUELLEN Stand lesen, nicht den beim Verdrahten gültigen.
  // Immer im NEUEN Modell arbeiten: was aus einem alten Stand kommt, wird
  // beim ersten Anfassen umgeschrieben und nicht halb weitergeschleppt.
  const liste = () =>
    ((aktuelleWerte ?? werte).anbauteile ?? []).map(normalisiereAnbauteil);

  /*
   * SUCHE UND FILTER (3. Oktober) - nur Sichtbarkeit, kein Neuaufbau: so
   * bleibt der Fokus im Suchfeld, und der Stand der Maske ändert sich nicht.
   */
  const vlFiltern = () => {
    let sichtbar = 0;
    container.querySelectorAll('.kachel-gruppe').forEach((gr) => {
      let n = 0;
      gr.querySelectorAll('.kachel-huelle[data-suche]').forEach((k) => {
        const ort = vorlageOrt === 'alle' || k.dataset[vorlageOrt] === '1';
        const an = ort && suchtextPasst(k.dataset.suche, vorlageSuche);
        k.hidden = !an;
        if (an) n += 1;
      });
      gr.hidden = n === 0;
      sichtbar += n;
    });
    const leer = container.querySelector('.vl-keine');
    if (leer) leer.hidden = sichtbar > 0;
  };
  const vlSuche = container.querySelector('.vl-suche');
  if (vlSuche) {
    vlSuche.addEventListener('input', () => { vorlageSuche = vlSuche.value; vlFiltern(); });
    // Enter setzt die einzige (oder erste) passende Vorlage.
    vlSuche.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const erste = [...container.querySelectorAll('.kachel-huelle[data-suche]')]
        .find((k) => !k.hidden && !k.closest('.kachel-gruppe')?.hidden);
      erste?.querySelector('.kachel')?.click();
    });
  }
  container.querySelectorAll('[data-vl-ort]').forEach((b) => b.addEventListener('click', () => {
    vorlageOrt = b.dataset.vlOrt;
    container.querySelectorAll('[data-vl-ort]').forEach((x) => {
      x.classList.toggle('an', x === b);
      x.setAttribute('aria-pressed', String(x === b));
    });
    vlFiltern();
  }));
  vlFiltern();

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
  // Der Direktknopf tut dasselbe wie die Kachel «frei definiert» - er
  // erspart nur das Aufklappen und Suchen.
  container.querySelectorAll('[data-vorlage-direkt]').forEach((b) => {
    b.addEventListener('click',
      () => beiVorlageWahl?.(b.dataset.vorlageDirekt, null));
  });
  container.querySelectorAll('[data-generator]').forEach((b) => {
    b.addEventListener('click', () => beiGenerator?.());
  });
  container.querySelectorAll('[data-signal-direkt]').forEach((b) => {
    b.addEventListener('click', () => beiSignalDirekt?.());
  });
  container.querySelectorAll('[data-at-zoom]').forEach((b) => {
    b.addEventListener('click', () => beiAnbauZoom?.(+b.dataset.atZoom));
  });
  // Zeile anklicken: dieses Teil aufklappen, die übrigen zu. Ein zweiter Klick
  // auf die offene Zeile klappt sie wieder zu.
  container.querySelectorAll('[data-at-oeffnen]').forEach((z) => {
    z.addEventListener('click', (e) => {
      // Strg / Cmd + Klick markiert, statt die Karte zu öffnen (7. Oktober).
      if (e.ctrlKey || e.metaKey) {
        const id = liste()[+z.dataset.atOeffnen]?.id;
        if (!id) return;
        if (atMarkiert.has(id)) atMarkiert.delete(id); else atMarkiert.add(id);
        beiAnbauNeu?.();
        return;
      }
      beiAnbauOeffnen?.(+z.dataset.atOeffnen);
    });
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
  container.querySelector('[data-at-alle-weg]')?.addEventListener('click',
    () => beiAnbauAlleWeg?.());
  // Der gespiegelte Schalter «Bestandesschutz» (4. Oktober): über `aendern`
  // in die Nachweisauswahl, wie das Feld unter Lasten.
  container.querySelector('[data-at-bestand]')?.addEventListener('change', (e) =>
    leisteAendern?.('bestandesschutz', e.currentTarget.checked));
  // Alle aus / alle ein (2. Oktober) - derselbe Weg wie das Häkchen je Teil.
  container.querySelector('[data-at-alle-aktiv]')?.addEventListener('click', (e) => {
    const an = e.currentTarget.dataset.atAlleAktiv === 'ein';
    onAnbau(liste().map((a) => ({ ...a, aktiv: an })));
  });
  container.querySelectorAll('[data-at-dup]').forEach((b) => {
    b.addEventListener('click', () => beiAnbauDuplizieren?.(+b.dataset.atDup));
  });
  // Die Auswahlleiste (7. Oktober).
  container.querySelectorAll('[data-atm]').forEach((b) => {
    b.addEventListener('click', () => {
      const ids = [...atMarkiert];
      const l = liste();
      if (b.dataset.atm === 'aufheben') { atMarkiert.clear(); beiAnbauNeu?.(); return; }
      if (b.dataset.atm === 'bearbeiten') { beiAnbauAuswahlBearbeiten?.(ids); return; }
      if (b.dataset.atm === 'aktiv') {
        const ein = !l.filter((a) => atMarkiert.has(a.id)).every((a) => a.aktiv !== false);
        onAnbau(l.map((a) => (atMarkiert.has(a.id) ? { ...a, aktiv: ein } : a)));
        return;
      }
      if (b.dataset.atm === 'loeschen') {
        atMarkiert.clear();
        onAnbau(l.filter((a) => !ids.includes(a.id)));
      }
    });
  });
  // Drahtwerke (7. Oktober): wählen wie die Anbauteile, im 3D hervorheben,
  // Typ und Anzahl je Zeile oder für die Auswahl ändern.
  const dwZeilen = () => drahtwerkUebersicht(liste(), dwGliederung);
  /*
   * >>> DER LEITER LEUCHTET, NICHT DAS BAUTEIL (7. Oktober). <<< Weisung:
   * «dies reagiert nicht optimal wenn man mit der maus darüberfährt. wäre es
   * möglich die leiter und nicht das bauteil beim überfahren der positionen
   * sichtbar zu machen und wenn man sie anklickt dann kommen die
   * bearbeitunsauswahl. ähnlich wie bei den anbauteilen, durch ctrl mehrere
   * positionen auswählbar machen.» Überfahren zeichnet nur das 3D neu (kein
   * Neuaufbau der Leiste); die Schlüssel nennen das Modul (`AT<i>#<k>`,
   * render.3d.js). Abfangjoch und Tragausleger zählen ihre Teile als
   * `AT_<i+1>` - beide Formen gehen mit.
   */
  const leiterKeys = (zeilen) => [...new Set(zeilen.flatMap((e) => e.stellen
    .flatMap(({ i, k }) => [`AT${i}#${k}`, `AT_${i + 1}#${k}`])))];
  const dwHervor = (dazu = null) => {
    const zeilen = dwZeilen().filter((e) => dwWahl.has(e.key) || e.key === dazu);
    beiDrahtwerk?.(zeilen.length ? leiterKeys(zeilen) : null);
  };
  const dwAendern = (keys, fn) => {
    const zeilen = dwZeilen().filter((e) => keys.includes(e.key));
    if (!zeilen.length) return;
    const l = liste().map((a) => ({ ...a, module: (a.module ?? []).map((m) => ({ ...m })) }));
    zeilen.forEach((e) => e.stellen.forEach(({ i, k }) => { if (l[i]?.module?.[k]) fn(l[i].module[k]); }));
    onAnbau(l);
  };
  container.querySelectorAll('[data-dw-gliederung]').forEach((b) => {
    b.addEventListener('click', () => {
      dwGliederung = b.dataset.dwGliederung; dwWahl.clear(); beiDrahtwerk?.(null); beiAnbauNeu?.();
    });
  });
  container.querySelectorAll('[data-dw-zeile]').forEach((z) => {
    z.addEventListener('mouseenter', () => dwHervor(z.dataset.dwZeile));
    z.addEventListener('mouseleave', () => dwHervor());
    z.addEventListener('click', (e) => {
      if (e.target.closest('select, input')) return;
      const k = z.dataset.dwZeile;
      if (e.ctrlKey || e.metaKey) { if (dwWahl.has(k)) dwWahl.delete(k); else dwWahl.add(k); }
      else if (dwWahl.has(k) && dwWahl.size === 1) dwWahl.clear();
      else { dwWahl.clear(); dwWahl.add(k); }
      dwHervor();
      beiAnbauNeu?.();
    });
  });
  container.querySelectorAll('[data-dw-typ]').forEach((s) => {
    s.addEventListener('change', () => {
      const keys = dwWahl.has(s.dataset.dwTyp) && dwWahl.size > 1 ? [...dwWahl] : [s.dataset.dwTyp];
      dwAendern(keys, (m) => { m.bauteil = s.value; });
    });
  });
  container.querySelectorAll('[data-dw-anz]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const n = Math.round(Number(inp.value));
      if (!(n >= 1)) return;
      const keys = dwWahl.has(inp.dataset.dwAnz) && dwWahl.size > 1 ? [...dwWahl] : [inp.dataset.dwAnz];
      dwAendern(keys, (m) => { m.anzahl = n; });
    });
  });
  container.querySelector('[data-dw-alle-typ]')?.addEventListener('change', (e) => {
    if (e.target.value) dwAendern([...dwWahl], (m) => { m.bauteil = e.target.value; });
  });
  container.querySelector('[data-dw-alle-anz]')?.addEventListener('change', (e) => {
    const n = Math.round(Number(e.target.value));
    if (n >= 1) dwAendern([...dwWahl], (m) => { m.anzahl = n; });
  });
  container.querySelector('[data-dw-aufheben]')?.addEventListener('click', () => {
    dwWahl.clear(); beiDrahtwerk?.(null); beiAnbauNeu?.();
  });
  // Gruppe ein-/ausschalten (6. Oktober), wie das Häkchen je Teil.
  // Gruppe duplizieren (7. Oktober).
  container.querySelectorAll('[data-at-gruppe-dup]').forEach((b) => {
    b.addEventListener('click', (e) => { e.stopPropagation(); beiAnbauGruppeDup?.(b.dataset.atGruppeDup); });
  });
  container.querySelectorAll('[data-at-gruppe-auge]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = b.dataset.atGruppeAuge;
      const l = liste();
      const drin = l.filter((a) => anbauGruppe(a) === name);
      const ein = drin.every((a) => a.aktiv === false);
      onAnbau(l.map((a) => (anbauGruppe(a) === name ? { ...a, aktiv: ein } : a)));
    });
  });
  // Rechtsklick auf die Zeile: dasselbe Menü wie im Modell, mit «Duplizieren».
  container.querySelectorAll('.at-zeile').forEach((z) => {
    z.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      beiAnbauKontext?.(+z.closest('.at-karte').dataset.idx, [e.clientX, e.clientY]);
    });
  });
  // Ein Klick in eine Karte fährt das Modell auf dieses Teil - man sieht
  // sofort, welches Teil man gerade bearbeitet.
  container.querySelectorAll('.at-karte').forEach((k) => {
    k.addEventListener('focusin', () => beiAnbauZoom?.(+k.dataset.idx, true));
  });

  container.querySelectorAll('.at').forEach((inp) => {
    // Ein Textfeld (Gruppe) erst beim Verlassen - sonst baut jede Taste die Karte neu.
    const ev = inp.type === 'checkbox' || inp.type === 'text' ? 'change' : 'input';
    auchBeimVerlassen(inp, ev, (e) => {
      if (inp.validity?.badInput || leerBeimTippen(inp, e)) return;   // halb getippt
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
        // Am Tragausleger nicht über das Kragarmende hinaus (28. September).
        if (tragwerksart(werte).key === 'tragausleger') {
          v = Math.min(Math.max(v, 0), kragarmEnde(werte));
        }
        v = fangeAufMasskette(v, massketteLesen(werte.masskette, werte.L).werte);
        // Das Teil aus DIESER Liste, nicht aus einem Helfer der Maske:
        // `teilVon` gehoert zu aktualisiereMaske und gibt es hier nicht.
        const teil = l[idx];
        if (modellFuerLage && teil
            && hatTraeger(teil.module, (id) => getFlBauteil(id).rolle)) {
          const an = passeTraegerAn(v, rasterNormVon(teil), modellFuerLage);
          v = an.x;
          // Wird das Raster geweitet, wandert es mit in die Baugruppe -
          // sonst stünde in der Karte ein Wert, mit dem nicht gerechnet wird.
          l[idx] = rasterGesetzt(l[idx], an);
        }
      }
      // Wer das Raster von Hand setzt, setzt damit das Normalmass.
      if (inp.dataset.k === 'raster') {
        const { rasterNorm, ...ohne } = l[idx];
        l[idx] = ohne;
      }
      l[idx][inp.dataset.k] = v;
      onAnbau(l);
    });
    /*
     * Beim Verlassen zeigt das Zahlenfeld, was gilt - dieselbe Regel wie in
     * der Maske (28. September): gefangen, gerundet oder am Kragarmende
     * begrenzt blieb sonst die getippte Zahl stehen (15 statt 12.75).
     */
    if (inp.type === 'number') {
      inp.addEventListener('change', () => {
        const soll = liste()[+inp.closest('.at-karte').dataset.idx]?.[inp.dataset.k];
        if (Number.isFinite(Number(soll)) && Number(inp.value) !== Number(soll)) {
          inp.value = soll;
        }
      });
    }
  });

  container.querySelectorAll('[data-loesch]').forEach((b) => {
    b.addEventListener('click', () =>
      onAnbau(liste().filter((_, i) => i !== +b.dataset.loesch)));
  });

  // --- Module der Baugruppe -------------------------------------------------
  /**
   * Der naechste freie Kettenwerk-Name in dieser Baugruppe: KW1, KW2, ...
   *
   * Gezaehlt wird ueber die MODULE, nicht ueber eine laufende Nummer im
   * Satz: wer ein Kettenwerk entfernt und ein neues anlegt, soll dessen
   * Nummer wiederbekommen, nicht die naechsthoehere.
   */
  const naechsteKwNummer = (module, ausser) => {
    const belegt = new Set((module ?? [])
      .filter((_, k) => k !== ausser)
      .map((x) => String(x?.kettenwerk ?? '').trim())
      .filter(Boolean));
    for (let n = 1; n <= 99; n += 1) {
      if (!belegt.has(`KW${n}`)) return `KW${n}`;
    }
    return 'KW';
  };

  const setzeModul = (idx, mod, feld, wert) => {
    const l = liste();
    if (!l[idx]) return;
    const m = (l[idx].module ?? []).map((x) => ({ ...x }));
    if (!m[mod]) return;
    /* =====================================================================
     * >>> DER PARTNER IST KEIN FELD, SONDERN EINE PAARUNG. <<<
     * =====================================================================
     *
     * Weisung vom 13. September: Tragseil und Fahrdraht getrennt waehlen.
     * Gespeichert wird weiterhin EIN `bauteil` - die Id des
     * Tabelleneintrags. Das ist der Grund, warum Rechnung, Ausleitung,
     * Bericht und jeder gespeicherte Stand unveraendert bleiben: getrennt
     * ist die EINGABE, nicht die Ablage.
     *
     * Gibt es die Paarung nicht, bleibt das Bauteil stehen, wie es war -
     * eine Summe zweier Leiter waere beim Wind fuenfzehn Prozent zu klein.
     */
    /*
     * >>> DER PARTNER UEBERLEBT DEN WECHSEL DES LEITERS. <<<
     *
     * Wer in der Hauptliste das Tragseil wechselt, waehrend ein Fahrdraht
     * daneben steht, bekaeme sonst den Einzelleiter - der Partner fiele
     * still weg, und mit ihm fuenfzehn Prozent Wind. Gibt es die neue
     * Paarung, wird sie genommen; gibt es sie nicht, gilt der neue Leiter
     * allein, und das Partnerfeld steht danach leer da.
     */
    // Gesamtlänge (7. Oktober): Punkt in die Mitte, was am Ende hängt, wandert mit.
    if (feld === 'teilLaenge') {
      if (!(wert > 0)) return;
      l[idx] = { ...l[idx], module: teilLaengeSetzen(m, mod, wert) };
      onAnbau(l);
      return;
    }
    if (feld === 'bauteil') {
      let alt = null;
      try { alt = getFlBauteil(m[mod].bauteil); } catch { /* neu */ }
      let neu = null;
      try { neu = getFlBauteil(wert); } catch { /* unbekannt */ }
      if (alt && neu && istKettenwerk(alt) && neu.rolle === 'drahtwerk'
          && !istKettenwerk(neu)) {
        const zA = flZerlegung(alt), zN = flZerlegung(neu);
        const neuIstTs = flTragseile().some((x) => x.name === zN.leiter);
        const paar = neuIstTs
          ? flPaarung(zN.leiter, zA.fd, zA.anzahl ?? 1)
          : flPaarung(zA.ts, zN.leiter, zA.anzahl ?? 1);
        if (paar) {
          m[mod] = { ...m[mod], bauteil: paar.id };
          l[idx] = { ...l[idx], module: m };
          onAnbau(l);
          return;
        }
      }
    }
    if (feld === 'partner') {
      let b = null;
      try { b = getFlBauteil(m[mod].bauteil); } catch { return; }
      const z = flZerlegung(b);
      const kw = istKettenwerk(b);
      const eigen = kw ? z.ts : z.leiter;
      // Hierarchisch: der Fahrdraht kommt zum TRAGSEIL dazu (Weisung).
      if (!kw && !flTragseile().some((x) => x.name === z.leiter)) return;
      const neuB = wert ? flPaarung(eigen, wert, z.anzahl ?? 1)
                        : flPaarung(eigen, null, z.anzahl ?? 1);
      if (!neuB) return;
      /* =====================================================================
       * >>> MIT DEM FAHRDRAHT ENTSTEHT EIN KETTENWERK - UND ES HEISST SO.
       * =====================================================================
       *
       * Weisung vom 13. September: «wenn fahrdraht zusaetzlich eingegeben
       * wird automatisch eine kw benennung vornehmen.»
       *
       * Die Klammer `kettenwerk` stand als freies Textfeld da («z. B. KW1»)
       * und blieb deshalb meistens leer - sie geht in keine Rechnung ein,
       * noch nicht: der Havariefall waehlt spaeter darueber aus, welches
       * Kettenwerk reisst. Eine leere Klammer macht diesen Fall unbrauchbar.
       *
       * Gezaehlt wird ueber die ganze Baugruppe: KW1, KW2 - was noch nicht
       * vergeben ist. Wer einen eigenen Namen tippt, behaelt ihn; der
       * Vorschlag kommt nur, wo nichts steht.
       */
      const werWeg = !wert;
      m[mod] = { ...m[mod], bauteil: neuB.id,
                 kettenwerk: werWeg ? null
                   : (m[mod].kettenwerk || naechsteKwNummer(m, mod)) };
      l[idx] = { ...l[idx], module: m };
      onAnbau(l);
      return;
    }
    /*
     * >>> DIE REIHENFOLGE DER EINGABE WIRD MITGESCHRIEBEN (24. Sept.). <<<
     *
     * Weisung: «bei den koordinaten eingabe in den anbauteilen, die
     * reihenfolge beachten, jenachdem welcher wert zuerst eingegeben
     * wird, wird dieser auch abgefahren.»
     *
     * Die Kette kann das nicht aus den Zahlen ablesen - x = 1.25 und
     * z = 0.45 sagen nichts darueber, welches zuerst dastand. Also
     * haelt es das Modul fest; `achsfolge` (core.anbauteile.js) ist
     * die eine Stelle, die die Regel kennt.
     */
    /*
     * DIE QUELLE DER ABLENKUNG (29. September): Winkel, Spannweite oder
     * Trasse. Die jeweils andere Angabe wird geleert, die neue startet mit
     * dem gerade wirksamen Wert (aus dem Auswahlfeld mitgegeben).
     */
    if (feld === 'ablenkQuelle') {
      const q = wert ?? {};
      const alt = m[mod];
      m[mod] = { ...alt,
        winkel: q.art === 'winkel'
          ? (Number.isFinite(alt.winkel) ? alt.winkel : q.winkel) : null,
        laenge: q.art === 'spannweite'
          ? (Number.isFinite(alt.laenge) && alt.laenge > 0 ? alt.laenge : q.laenge) : null };
      l[idx] = { ...l[idx], module: m };
      onAnbau(l);
      return;
    }
    // Das Feld der Leiter-Spannweite schreibt in `laenge` (leer = global).
    if (feld === 'laengeFl') feld = 'laenge';
    const folge = achsfolge(m[mod].folge, feld, wert);
    m[mod] = { ...m[mod], [feld]: wert,
               ...(folge ? { folge } : { folge: undefined }) };
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
  // Der Signalbauer (30. September): der Dialog gehört der Anwendung
  // (`setzeSignalbauer`), das Ergebnis geht über denselben Weg wie jede
  // Moduleingabe zurück.
  container.querySelectorAll('[data-signalbauer]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = +b.dataset.idx, mod = +b.dataset.signalbauer;
      const m = liste()[idx]?.module?.[mod];
      if (!m || typeof SIGNALBAUER !== 'function') return;
      SIGNALBAUER(m.signal ?? [], (neu) => setzeModul(idx, mod, 'signal', neu));
    });
  });
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

  container.querySelectorAll('[data-bs-oeffnen]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      bausteinWahlOeffnen(b, b.parentElement.querySelector('select.bs-liste'));
    });
  });
  container.querySelectorAll('.mod').forEach((inp) => {
    const ev = inp.tagName === 'SELECT' || inp.type === 'checkbox'
      ? 'change' : 'input';
    auchBeimVerlassen(inp, ev, (e) => {
      if (leerBeimTippen(inp, e)) return;
      /*
       * >>> HALBE EINGABE ABWARTEN (6. Oktober). <<< Gemeldet: «negative
       * werte lassen sich nicht bei der ablenkung innerhalb eines anbauteils
       * eingeben, wenn man minus eingibt springt man aus der eingabe.» Ein
       * Zahlenfeld mit «-» oder «1.» meldet einen leeren Wert (badInput);
       * geschrieben wurde die Vorgabe, die Karte baute neu, der Fokus war
       * weg. Bis die Zahl lesbar ist, geschieht nichts.
       */
      if (inp.validity?.badInput) return;
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
      let wert = !zahl ? inp.value
        : leer ? (vorgabe === undefined ? null : vorgabe)
        : (parseFloat(inp.value) || 0);
      // Weisung vom 19. September: «Bei anzahl keine negativ eingabe
      // ermöglichen» - und keine halben Stück.
      if (inp.dataset.mk === 'anzahl' && wert !== null) wert = anzahlZulaessig(wert);
      if (inp.dataset.mk === 'ablenkQuelle') {
        wert = { art: inp.value, winkel: parseFloat(inp.dataset.winkel),
                 laenge: parseFloat(inp.dataset.laenge) };
      }
      setzeModul(+inp.dataset.idx, +inp.dataset.mod, inp.dataset.mk, wert);
    });
    if (inp.dataset.mk === 'anzahl') {
      // Das Feld zeigt nach dem Verlassen, was abgelegt ist.
      inp.addEventListener('change', () => {
        if (inp.value.trim() !== '') inp.value = anzahlZulaessig(parseFloat(inp.value) || 0);
      });
    }
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
    auchBeimVerlassen(inp, ev, (e) => {
      if (inp.validity?.badInput || leerBeimTippen(inp, e)) return;
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
  // Ein neuer PUNKT: eigene Kennung, die Lage des letzten als Anfang.
  const neuePunktId = () => `P-${Math.random().toString(36).slice(2, 8)}`;
  container.querySelectorAll('[data-last-neu]').forEach((b) => {
    b.addEventListener('click', () => {
      const l = liste(); const idx = +b.dataset.lastNeu;
      const vorhanden = l[idx].lasten ?? [];
      const letzter = vorhanden[vorhanden.length - 1];
      l[idx] = { ...l[idx], lasten: [...vorhanden, neuerLastblock('G',
        { y: letzter?.y ?? 0, z: letzter?.z ?? 0, punkt: neuePunktId() })] };
      onAnbau(l);
    });
  });
  /*
   * DIE LAGE GILT DEM GANZEN PUNKT (29. September): jede Lastart darunter
   * zieht mit. Ein alter Block ohne Kennung ist sein eigener Punkt.
   */
  container.querySelectorAll('.lpunkt').forEach((inp) => {
    auchBeimVerlassen(inp, 'input', (e) => {
      if (inp.validity?.badInput || leerBeimTippen(inp, e)) return;   // halb getippt
      const l = liste(); const idx = +inp.dataset.idx;
      if (!l[idx]) return;
      const wert = parseFloat(inp.value) || 0;
      l[idx] = { ...l[idx], lasten: (l[idx].lasten ?? []).map((x, k) =>
        (lastPunkt(x, k) === inp.dataset.punkt ? { ...x, [inp.dataset.lp]: wert } : x)) };
      onAnbau(l);
    });
  });
  container.querySelectorAll('[data-punkt-weg]').forEach((b) => {
    b.addEventListener('click', () => {
      const l = liste(); const idx = +b.dataset.idx;
      l[idx] = { ...l[idx], lasten: (l[idx].lasten ?? [])
        .filter((x, k) => lastPunkt(x, k) !== b.dataset.punktWeg) };
      onAnbau(l);
    });
  });
  // Eine weitere Lastart am selben Punkt: dieselbe Lage, die nächste noch
  // nicht belegte Gruppe. Ein alter Block bekommt dabei seine Kennung.
  container.querySelectorAll('[data-lastart-dazu]').forEach((b) => {
    b.addEventListener('click', () => {
      const l = liste(); const idx = +b.dataset.idx;
      if (!l[idx]) return;
      const alt = b.dataset.lastartDazu;
      const neu = alt.startsWith('#') ? neuePunktId() : alt;
      const bloecke = (l[idx].lasten ?? []).map((x, k) =>
        (lastPunkt(x, k) === alt ? { ...x, punkt: neu } : x));
      const drin = bloecke.filter((x) => x.punkt === neu);
      const belegt = new Set(drin.map((x) => x.einwirkung));
      const gruppe = EINWIRKUNGEN.filter((e) => !e.intern)
        .find((e) => !belegt.has(e.key))?.key ?? 'G';
      const p = drin[0] ?? {};
      bloecke.push(neuerLastblock(gruppe, { x: p.x ?? 0, y: p.y ?? 0, z: p.z ?? 0, punkt: neu }));
      l[idx] = { ...l[idx], lasten: bloecke };
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
 * Gurtanschluss am Mast als eigener Nachweis gefuehrt wird (Prüfung A1), ist
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
/**
 * DER SCHALTER «MAST PLASTISCH» - unter den Nachweiskacheln.
 *
 * Weisung vom 18. September: «das plastische nachweisen sollte nicht im
 * system sondern unter dem nachweis sidebar stehen.» Er aendert keine
 * Geometrie, sondern die Art des Nachweises - und steht deshalb dort, wo
 * dessen Ergebnis steht.
 */
function plastischHtml(opt, mitMast) {
  if (!mitMast || typeof opt?.beiFeld !== 'function') return '';
  return `<div class="nw-plastisch">
    <label class="schalter"><input type="checkbox" data-nw-plastisch${
      opt.plastisch ? ' checked' : ''}><span>Mast plastisch nachweisen</span></label>
    <p class="notiz">W_pl statt W_el, nur bei Querschnittsklasse 1 oder 2.
      Interaktion linear: N/N_Rd + M_q/M_q,Rd + M_l/M_l,Rd.</p></div>`;
}

function verdrahtePlastisch(node, opt) {
  node.querySelector('[data-nw-plastisch]')?.addEventListener('change', (e) =>
    opt.beiFeld('mastPlastisch', e.target.checked));
}

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
   * nicht gefuehrt»), die Namen stehen in der Kopfzeile des Abschnitts, und
   * ein Klick zeigt, warum. Das ist die Form, in der die Uebersicht auch die
   * Hinweise und die Konstruktionspruefungen fuehrt.
   *
   * UNTER DEN KACHELN (Weisung), nicht unter dem Urteil. Dort steht, was
   * gefuehrt WIRD - η Obergurt, Untergurt, Bindeblech. Was nicht gefuehrt
   * wird, gehört daneben und nicht an den Anfang: die Reihe liest sich dann
   * als ein Gedanke, und die Lücke steht dort, wo man die Nachweise sucht.
   */
  const namen = liste.map((g) => g.titel).join(', ');
  return klapp('uebersicht-nichtgefuehrt', 'Nicht gefuehrte Nachweise',
    `<div class="nichtgefuehrt">
      ${liste.map((g) => `<p class="notiz"><b>${esc(g.titel)}</b>
        <span class="ablage-meta">· ${esc(g.grund)}</span><br>${esc(g.was)}</p>`).join('')}
    </div>`, namen, false);
}

function pruefungenHtml(urteil) {
  // Die Bügelschrauben (A1) stehen seit dem 7. Oktober im eigenen Block
  // (`buegelBlockHtml`): «Ziehe die Bügelschrauben Prüfung aus der liste der
  // konstruktionsprüfungen heraus als separate gruppe.»
  const alle = (urteil?.checks ?? []).filter((c) => c.id !== 'A1');
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
  const offen = alle.filter((c) => !c.ok).length;
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
 * DIE WARNUNG AM GETEILTEN MASTEN.
 *
 * Seit dem Mastenumbau ist der Mast das Grundelement: ein Mast, den sich
 * zwei Tragwerke teilen, ist EINER. Das ist der Gewinn und die Falle
 * zugleich - wer sein Profil aendert, aendert es fuer beide. Eine
 * Aenderung, die woanders wirkt, ohne dass man es sieht, ist die
 * unangenehmste Art von Verhalten.
 *
 * >>> DIE ANGABEN SELBST STEHEN IN DER LEISTE. <<<
 *
 * Hier stand bis zum 13. September eine Zeile «M1 · x 0.00 m · HEB 240 ·
 * traegt J90 · 20.00 m». Seit die Leiste je Mast eine eigene Zeile fuehrt -
 * mit Profil, Laenge, Anschlusshoehe und den Tragwerken, die er traegt -
 * war das dieselbe Auskunft ein zweites Mal, dreissig Zeilen weiter unten.
 *
 * Was die Leiste NICHT sagen kann, bleibt: die Folge fuer den Nachbarn.
 * Deshalb steht hier noch der Satz, und auch nur dann, wenn es ihn
 * betrifft.
 */
export function mastenUebersichtHtml(werte) {
  const m = gewaehlterMast(werte);
  if (!m) return '';
  const alleTw = tragwerkeSortiert(werte);
  const traegt = (m.traegt ?? []).map((id) => alleTw.find((x) => x.id === id))
    .filter(Boolean);
  if (traegt.length < 2) return '';
  return `<div class="masten-uebersicht">
    <p class="mast-warn">Dieser Mast gehört beiden Tragwerken — was hier
      geändert wird, gilt auch drüben. Die Anschlusshöhe nicht: sie
      beschreibt, wie hoch das jeweilige Joch anschliesst, und steht
      deshalb bei jedem Tragwerk für sich.</p>
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
/* ===========================================================================
 * >>> DER EINZELMAST WIE DAS TRAGJOCH (18. September). <<<
 * ===========================================================================
 *
 * Meldung: «die rechte sidebar beim einzelmast wurde auf die resultate
 * reduziert, aber auch die schien nicht genau richtige werte
 * wiederzuspiegeln … entsprechend wie beim tragjoch gestalten.»
 *
 * Sie las `letzte.erg` - EINEN Lastfall, den ersten Nachweisfall - und
 * dessen `max.etaGesamt`. Das Urteil ueber alle Kombinationen stand in der
 * Fussleiste, hier nicht: mit einem Seilanker auf der Gegenwindseite zeigte
 * die Leiste 0.191, massgebend waren 0.272. Jetzt steht die Seite auf
 * derselben Bemessung wie beim Joch - Umhuellende, Urteil ueber alle
 * Bauteile, der Schalter fuer den Einzellastfall -, mit denselben Kacheln.
 *
 * @param {object} opt {quelle, lastfallName} - wie bei zeichneUebersicht
 * ========================================================================= */
export function zeichneEinzelmast(node, letzte, opt = {}) {
  const { erg, anzeige, kombi, urteil, hinw = [] } = letzte;
  const einzelLastfall = opt.quelle && opt.quelle !== 'umhuellend';
  // Beide mit allen Bauteilen aus `mitBauteilen` (app.js, neuRechnen).
  const bem = letzte.bemessung ?? kombi?.huellkurve ?? erg;
  const zeig = einzelLastfall ? (anzeige ?? erg) : bem;
  const ampelU = (v) => (einzelLastfall ? '' : ampel(v));
  /* =======================================================================
   * >>> WELCHE NACHWEISE DIE LEISTE ZEIGT (Weisung vom 24. September). <<<
   * =====================================================================
   *
   * «Tragsicherheit Gebrauchstagulichkeit oder beide.» Vorgabe ist
   * BEIDE; wer nichts wählt, sieht alles.
   *
   * Was der Filter WEGNIMMT, ist genau das, was ein η der Tragsicherheit
   * zeigt - Kacheln, nicht gefuehrte Nachweise, die Tabelle der
   * höchstbeanspruchten Stellen. Was nachweisunabhängig ist
   * (Schnittgrössen, Hinweise zur Gültigkeit), bleibt stehen: es gehört
   * keiner der beiden Arten.
   *
   * DIE HAUPTKACHEL BLEIBT, WIE SIE IST. Sie ist das Urteil des
   * Tragwerks, nicht eine Anzeige - und ein Anzeigefilter ändert kein
   * Urteil. Der Entscheid vom 18. September gilt weiter: die
   * Urteilsfarbe folgt allein der Tragsicherheit.
   * ===================================================================== */
  const nwArt = opt.nachweisart ?? 'beide';
  const zeigtTrag = nwArt !== 'gzg';
  const zeigtGzg = nwArt !== 'trag';
  const mn = zeig?.mast?.A ?? null;
  /*
   * STABWERK FUEHRT, KNICKEN ERGAENZT (28. September) - am Einzelmasten
   * wie am Joch: der Querschnitt aus dem Stabwerk, das Knicken aus dem
   * Kern als eigene Zeile, Anker und Fundament aus dem Kern.
   */
  const swH = stabwerkFuehrt(opt, einzelLastfall);
  const vorlaeufig = stabwerkVorlaeufig(opt, einzelLastfall);
  const bt = swH
    ? bauteileMitStabwerk(urteil?.bauteile, swH, { knick: knickJe(bem) })
    : (urteil?.bauteile ?? null);
  const eBem = bt?.eta ?? (bem?.mast?.A?.etaMitStabilitaet ?? 0);
  // Im Einzellastfall die Zahl des Falls - aus dem Stabwerk, wenn es gilt.
  const imFall = einzelLastfall && swH ? etaImFall(bt) : null;
  const eKopf = einzelLastfall ? (imFall?.eta ?? (mn?.etaMitStabilitaet ?? mn?.eta ?? 0)) : eBem;
  const werKopf = imFall ? imFall.name : (!einzelLastfall && bt?.massgebend ? bt.massgebend.name : null);
  const zustand = (bt?.ueber || eBem > 1) ? 'nok' : 'ok';
  const offeneNw = urteil?.nichtGefuehrt?.length ?? 0;
  const ohneKnicken = mn?.knickenGefuehrt === false;
  const urteilText = einzelLastfall
    ? 'Einzellastfall — kein Tragsicherheitsurteil'
    : (zustand === 'ok' ? 'Tragsicherheit erfüllt' : 'Tragsicherheit NICHT erfüllt')
      + (ohneKnicken ? ' · Biegeknicken nicht gefuehrt' : '');
  /*
   * >>> DIE KOMBINATION DES MASSGEBENDEN BAUTEILS (29. September). <<<
   *
   * Befund der Durchsicht, auf Weisung umgesetzt («vorschlag umsetzen»):
   * hier stand immer die Kombination des MASTEN, auch wenn Fundament oder
   * Anker die Kopfzahl stellten - am Einzelmasten HEB 240 stand «η 0.300
   * Fundament M1 · massgebend: Wind +y», während die Fundamentkachel
   * darunter «Wind +x» nannte. Genommen wird jetzt die des Bauteils in
   * der Kopfzahl: aus dem Stabwerk, wo es sie führt, sonst aus dem Kern.
   */
  const bezVon = (key, bez) => (bez ?? (key
    ? (kombi?.lastfaelle?.find((l) => l.key === key)?.bez ?? key) : null));
  const fallBez = (() => {
    const mg = bt?.massgebend;
    if (mg && (mg.fall || mg.bez)) return bezVon(mg.fall, mg.bez);
    const wer = mg?.name ?? '';
    if (/^Fundament/.test(wer)) {
      const q = bem?.fundament?.A;
      return q?.massgebend ? bezVon(q.massgebend.fall, q.massgebend.bez) : null;
    }
    if (/^Anker/.test(wer)) {
      const e = bem?.anker?.A;
      return e ? bezVon(e.lastfall, e.bez) : null;
    }
    if (/^Knicken/.test(wer)) return bezVon(bem?.mast?.A?.stabil?.fall ?? bem?.mast?.A?.fall);
    return bezVon(bem?.mast?.A?.fall);
  })();

  /*
   * Geordnet wie am Joch (25. September) - hier ohne Jochgruppe, denn es
   * gibt kein Joch. Bleibt nur eine Gruppe übrig, lässt
   * `nachweisGruppenHtml` die Überschrift weg.
   */
  const nwJeM = bauteilKachelnJe(zeig, urteil ?? {}, ampelU, { ...opt, swH });
  const mastAusSw = !!(swH && Object.keys(swH.bauteile ?? {})
    .some((k) => k.startsWith('mast:')));
  const quelleM = (ausSw) => (ausSw
    // Seit dem 30. September kommt auch das Knicken des Einzelmasten aus
    // dem Stabwerk (`swH.knick`); der Kern nur noch, wo es dort fehlt.
    ? (Object.keys(knickJe(bem)).length && !Object.keys(swH?.knick ?? {}).length
      ? 'Stabwerk · Knicken Ersatzbalken' : 'Stabwerk')
    : (swH || vorlaeufig ? `Ersatzbalken${vorlaeufig ? ' · vorläufig' : ''}` : ''));
  const nwGruppenMast = [
    { titel: 'Mast', kacheln: nwJeM.mast, rechts: quelleM(mastAusSw) },
    { titel: 'Anker', kacheln: nwJeM.anker,
      rechts: quelleM(Object.keys(swH?.ankerJe ?? {}).length > 0) },
    { titel: 'Fundament', kacheln: nwJeM.fundament,
      rechts: quelleM(Object.keys(swH?.fundamentJe ?? {}).length > 0) },
  ];

  // Die Kräfte am Fuss - was das Fundament bekommt.
  const f = mn?.stationen?.[0];
  const fuss = f ? [
    kachel('F_z', f2(fzAuf(f.Fz)), 'kN am Fuss · Druck negativ'),
    kachel('V quer · F_x', f2(f.Fx), 'kN am Fuss'),
    kachel('V längs · F_y', f2(f.Fy), 'kN am Fuss'),
    kachel('M quer · M_yy', f2(f.Myy), 'kNm am Fuss'),
    kachel('M längs · M_xx', f2(f.Mxx), 'kNm am Fuss'),
    kachel('M_t · M_zz', f2(f.Mzz), 'kNm am Fuss'),
  ] : [];

  // Siehe `urteilMitGebrauch`: bei «beide» das Maximum über beide Arten.
  /*
   * DIE VERFORMUNG AUS DEM STABWERK, wenn es gilt (28. September, «Ins
   * Stabwerk») - dieselbe Gestalt wie die des Kerns, nur andere Wege.
   */
  /*
   * >>> DIE GEBRAUCHSTAUGLICHKEIT HÄNGT NICHT AM GEWÄHLTEN LASTFALL (4. Oktober). <<<
   * Sie rechnet immer den Betriebswind. Im Einzellastfall stand hier der
   * Kern (ohne Fahrdraht-Kachel), bei «umhüllend» das Stabwerk - zwei
   * verschiedene Zahlen für denselben Nachweis, je nach Wahl oben.
   */
  const swG = stabwerkFuehrt(opt, false);
  const zeigV = swG?.verformung ? { ...zeig, verformung: swG.verformung } : zeig;
  const gzgQuelle = swG?.verformung ? 'Stabwerk'
    : (swH || vorlaeufig ? `Ersatzbalken${vorlaeufig ? ' · vorläufig' : ''}` : '');
  const U = urteilMitGebrauch({ eta: eKopf, zustand, wer: werKopf,
                                text: vorlaeufig
                                  ? `${urteilText} · vorläufig (Ersatzbalken)`
                                  : urteilText },
                              zeigV, nwArt, einzelLastfall);
  node.innerHTML = `
    ${quellSchalter(opt, einzelLastfall, eBem)}
    <div class="urteil ${einzelLastfall ? 'ohne' : U.zustand}">
      <span class="urteil-zahl">η ${f3(U.eta)}</span>
      ${U.wer ? `<span class="urteil-fall" title="Massgebendes Bauteil">${esc(U.wer)}</span>` : ''}
      <span>${U.text}${(!einzelLastfall && offeneNw)
        ? ` · ${offeneNw} Nachweis(e) nicht gefuehrt` : ''}</span>
      ${/* Stellt die Verformung die Kopfzahl (Stellung «beide»), gehört
           die Kombination der Tragsicherheit nicht dazu - dann keine. */''}
      ${!einzelLastfall && fallBez && (!U.wer || U.wer === werKopf)
        ? `<span class="urteil-fall" title="Massgebende Kombination von ${esc(werKopf ?? 'Mast')}">massgebend: ${esc(fallBez)}</span>`
        : ''}
    </div>
    ${nachweisartLeiste(nwArt)}
    ${stabwerkLeiste(opt)}
    ${mn ? `${zeigtTrag ? `${abschnitt('Nachweise')}
      ${nachweisGruppenHtml(nwGruppenMast)}
      ${plastischHtml(opt, true)}` : ''}${zeigtGzg ? gzgBlockHtml(zeigV, gzgQuelle, opt.gzg ?? null) : ''}${
      zeigtTrag ? bestandBlockHtml(stabwerkFuehrt(opt, false)) : ''}`
      : '<p class="leer">Kein Mast im Modell — bitte ein Mastprofil wählen.</p>'}
    ${zeigtTrag ? nichtGefuehrtHtml(urteil) : ''}
    ${fuss.length ? klapp('einzelmast-fuss', 'Kräfte am Mastfuss',
        `<div class="kennzahlen">${fuss.join('')}</div>`,
        `M längs ${f2(f.Mxx)} kNm`) : ''}
    ${hinw.length ? klapp('uebersicht-hinweise', 'Hinweise zur Gültigkeit',
        `<div class="hinweisliste">${hinw.map((h) =>
          `<p class="notiz">${esc(h)}</p>`).join('')}</div>`,
        hinw.length === 1 ? '1 Hinweis' : `${hinw.length} Hinweise`) : ''}
    ${mn ? mastblattHtml(zeig) : ''}`;
  verdrahteKlapp(node);
  verdrahteStabwerk(node, opt);
  verdrahtePlastisch(node, opt);
  verdrahteNachweisart(node, opt);
}

/**
 * Die Kräfte am Mastfuss je Kombination - der Reiter «Auflager» des
 * Einzelmasts. Charakteristisch je Einwirkung für den, der selbst
 * kombiniert, und die Bemessungsfälle darunter.
 */
export function zeichneMastfuss(node, kombi) {
  const zeile = (l) => {
    const f = kombi?.ergebnisse?.[l.key]?.mast?.A?.stationen?.[0];
    if (!f) return '';
    return `<tr><td>${esc(l.bez)}</td><td class="num">${f2(fzAuf(f.Fz))}</td>
      <td class="num">${f2(f.Fx)}</td><td class="num">${f2(f.Fy)}</td>
      <td class="num">${f2(f.Myy)}</td><td class="num">${f2(f.Mxx)}</td>
      <td class="num">${f2(f.Mzz)}</td></tr>`;
  };
  const tab = (titel, liste) => (liste.length ? `${abschnitt(titel)}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Fall</th><th class="num">F_z</th><th class="num">F_x</th>
        <th class="num">F_y</th><th class="num">M_yy</th><th class="num">M_xx</th>
        <th class="num">M_zz</th></tr></thead>
      <tbody>${liste.map(zeile).join('')}</tbody></table></div>` : '');
  const lf = kombi?.lastfaelle ?? [];
  node.innerHTML = `
    <p class="notiz">Kräfte am Mastfuss in kN und kNm, globale Achsen: x quer
    (Jochachse), y längs (Gleisrichtung), z lotrecht.</p>
    ${tab('Charakteristisch je Einwirkung', lf.filter((l) => l.art === 'charakteristisch'))}
    ${tab('Bemessung', lf.filter((l) => l.nachweis))}
    ${tab('Gebrauchstauglichkeit', lf.filter((l) => l.art === 'gebrauchstauglichkeit'))}`;
}

/* ===========================================================================
 * >>> EIN EINZELNER LASTFALL IST KEIN NACHWEIS. <<<
 * ===========================================================================
 *
 * Weisung vom 16. September: «die ausnutzung sollte sich immer auf die
 * bemessung aller relevanten kombinationen beziehen ... sonst geht man
 * gefahr, beim versehentlichen umschalten auf einen lastfall grüne kacheln zu
 * sehen und in der hauptkachel heisst noch zusätzlich Tragsicherheit erfüllt,
 * was nicht korrekt ist nach sia, da nicht massgebende kombination beachtet.»
 *
 * Die Norm verlangt die ungünstigste Kombination. Ein Lastfall zeigt, WAS
 * eine einzelne Einwirkung anrichtet - er beantwortet nicht die Frage, ob das
 * Bauteil hält.
 *
 * >>> DAS URTEIL STEHT DESHALB IMMER AUF DER HUELLKURVE. <<<
 *
 * `bemessung` wandert unabhängig von der Anzeige mit. Zeigen die Kacheln
 * einen Lastfall, steht daneben nicht «Tragsicherheit erfüllt», sondern was
 * dann zutrifft: dass hier kein Urteil steht. Die Zahl bleibt richtig, nur
 * ihre Bedeutung wird nicht überdehnt.
 *
 * @param {object} opt {bemessung, quelle, lastfallName}
 * ========================================================================= */
/* ---------------------------------------------------------------------------
 * DER SCHALTER ÜBER DER ÜBERSICHT.
 *
 * Er zeigt, worauf die Zahlen darunter stehen, und führt zurück. Umgeschaltet
 * wird oben im Lastfallwähler - dort gehört die Wahl hin; hier steht, was sie
 * bedeutet. Ein zweiter Wähler an zweiter Stelle wäre eine zweite Wahrheit.
 * ------------------------------------------------------------------------- */
function quellSchalter(opt, einzel, eBem) {
  if (!einzel) {
    return `<p class="notiz quellzeile" style="margin:0 0 6px">
      <b>Bemessung</b> — umhüllend über alle Kombinationen. Das ist die
      Grundlage des Urteils.</p>`;
  }
  return `<p class="notiz quellzeile warn" style="margin:0 0 6px">
    <b>Einzellastfall${opt.lastfallName ? `: ${esc(opt.lastfallName)}` : ''}</b>
    — die Zahlen darunter gelten NUR für diesen Fall und sind kein Nachweis.
    Die Bemessung über alle Kombinationen gibt
    <b>η ${f3(eBem)}</b>. Oben im Lastfallwähler auf «umhüllend»
    zurückschalten.</p>`;
}

/** Traegt die Baugruppe einen Leiter? Nur dann gibt es einen Bruch. */
function hatDrahtwerk(a) {
  return (a?.module ?? []).some((m) => m.aktiv !== false
    && /^drahtwerk-/.test(String(m.bauteil ?? '')));
}

/**
 * Die Kacheln der Masten und ihrer Anker - dieselben beim Tragjoch und beim
 * Einzelmast. Vorher standen sie nur in der Uebersicht des Jochs; der
 * Einzelmast zeigte eine eigene, kuerzere Seite mit anderen Zahlen.
 */
/* ===========================================================================
 * >>> DIE GEBRAUCHSTAUGLICHKEIT IST EINE EIGENE GRUPPE (24. September). <<<
 * =========================================================================
 *
 * Weisung: «setze noch ein resultat plott gebrauchstauglichkeit das müsste
 * man dann auch irgendwie in den ergebnissen auswählbar machen,
 * Tragsicherheit Gebrauchstagulichkeit oder beide.»
 *
 * Die Verformungskacheln standen bis dahin MITTEN unter den η-Kacheln der
 * Tragsicherheit. Dort waren sie am falschen Platz: sie stehen auf einem
 * anderen Lastniveau (Betriebswind ψ 0.70 statt Bemessungswerte), messen
 * gegen etwas anderes (Grenzmasse statt Widerstände) und färben nach dem
 * Entscheid vom 18. September kein Urteil. Eine eigene Gruppe zu sein ist
 * die Voraussetzung dafür, sie überhaupt weglassen zu können.
 *
 * >>> OHNE AMPEL. <<< Ein überschrittener Gebrauchswert wird ANGESCHRIEBEN
 * - mit dem Wort «über» und dem Grenzwert daneben -, aber er färbt weder
 * die Hauptkachel noch die Fussleiste.
 *
 * Die Kachel nennt den MASSGEBENDEN der drei Nachweise; alle drei stehen
 * im Titel, damit man sieht, welcher knapp ist und welcher nicht.
 * ========================================================================= */
/* ===========================================================================
 * >>> BEI «BEIDE» TRAEGT DIE HAUPTKACHEL BEIDE NACHWEISARTEN. <<<
 * =========================================================================
 *
 * Weisung vom 24. September: «wenn hier beide ausgewählt sind dann müsste
 * es einen globalen ausnutzungfaktor haben der den gebrauchstauglichkeit
 * auch berücksichtigt.»
 *
 * Das ändert den Entscheid vom 18. September («die Urteilsfarbe folgt
 * allein der Tragsicherheit») - auf Rückfrage ausdrücklich so gewollt:
 * die FARBE folgt dem Maximum. Der Grund ist der augenfällige: eine
 * Kachel, die η 1.97 zeigt und grün dasteht, ist ein Widerspruch.
 *
 * Was NICHT vermischt wird, ist die Aussage. Der Text nennt beide
 * Urteile getrennt - «Tragsicherheit erfüllt · Gebrauchstauglichkeit
 * NICHT erfüllt» -, denn die beiden Zahlen stehen auf verschiedenen
 * Lastniveaus und messen gegen Verschiedenes. Nur die Frage «wie weit
 * ist das Tragwerk ausgenutzt?» hat eine gemeinsame Antwort, und das ist
 * die grössere der beiden.
 *
 * In den beiden anderen Stellungen zeigt die Kachel genau das, was
 * darunter steht - sonst bezifferte sie etwas, das man gerade
 * ausgeblendet hat.
 * ========================================================================= */
export function urteilMitGebrauch(basis, erg, art = 'beide', einzelLastfall = false) {
  const v = erg?.verformung;
  if (einzelLastfall || !v || art === 'trag') return basis;
  const namen = erg?.modell?.federn?.namen ?? {};
  // Das massgebende Ende - mit seinem Namen, wie bei den Bauteilen.
  let wer = null, gEta = 0;
  ['A', 'B'].forEach((ende) => {
    const q = v[ende];
    if (!q || !(q.eta > gEta)) return;
    gEta = q.eta;
    wer = `Verformung ${namen[ende] || `Ende ${ende}`}`;
  });
  if (!wer) return basis;
  const gOk = v.ok !== false;
  const gText = gOk ? 'Gebrauchstauglichkeit erfüllt'
                    : 'Gebrauchstauglichkeit NICHT erfüllt';
  if (art === 'gzg') {
    return { eta: gEta, zustand: gOk ? 'ok' : 'nok', wer, text: gText };
  }
  return {
    eta: Math.max(basis.eta ?? 0, gEta),
    // «nicht gefuehrt» (warn) bleibt, was es ist - es ist kein Urteil.
    zustand: basis.zustand === 'warn' ? 'warn'
      : ((basis.zustand === 'nok' || !gOk) ? 'nok' : 'ok'),
    wer: gEta > (basis.eta ?? 0) ? wer : basis.wer,
    text: `${basis.text} · ${gText}`,
  };
}

export function gzgKacheln(erg) {
  const k = [];
  if (!erg?.verformung) return k;
  const namenV = erg.modell?.federn?.namen ?? {};
  const gesehenV = new Set();
  // Dazu der Nachweis am Fahrdraht (4. Oktober, «ja nachweis auf
  // fahrdrahtpunkt umstellen») - eine Kachel neben denen der Masten.
  ['fahrdraht', 'A', 'B'].forEach((ende) => {
    const q = erg.verformung[ende];
    if (!q?.massgebend) return;
    const name = ende === 'fahrdraht' ? 'Fahrdraht' : (namenV[ende] || `Ende ${ende}`);
    if (gesehenV.has(name)) return;
    gesehenV.add(name);
    const mg = q.massgebend;
    // Die Verdrehung in Grad, die Wege in mm (30. September).
    const mmRoh = (v) => `${(v * 1000).toFixed(0)} mm`;
    const gradVon = (v) => `${(v * 180 / Math.PI).toFixed(2)}°`;
    const fmt = (x, v) => (x?.einheit === 'rad' ? gradVon(v) : mmRoh(v));
    const mm = (v) => fmt(mg, v);
    const alle = q.nachweise
      .map((x) => `${x.was}: ${fmt(x, x.wert)} von ${fmt(x, x.grenz)} (η ${f3(x.eta)})`)
      .join('\n');
    /* ---------------------------------------------------------------------
     * >>> DIE MASTSPITZE STEHT DANEBEN, ALS AUSKUNFT (26. September). <<<
     *
     * Weisung: «lassen wir den nachweis für die mastspitze weg bei der
     * verformung und nutzen nur die referenzhöhe (fahrdraht)». Sie trägt
     * kein η mehr und geht nicht ins Urteil — aber sie bleibt lesbar. Wer
     * 150 mm nicht sieht, fragt auch nicht, woher sie kommen.
     * ------------------------------------------------------------------- */
    const dazu = (q.auskunft ?? [])
      .map((x) => `${x.was}: ${fmt(x, x.wert)}`
        + (x.vergleich ? ` (zum Vergleich L/${Math.round(q.L / x.vergleich)}`
                       + ` = ${fmt(x, x.vergleich)})` : ''))
      .join('\n');
    /*
     * >>> UND DIE HOEHE GEHOERT AN DIE KACHEL. <<<
     * Sie stand nur im Titel, und die Frage vom 26. September war genau
     * die: «auf welcher höhe werden die 150mm berechnet?»
     */
    const wo = Number.isFinite(mg.z)
      // Die Mastspitze L/100 (30. September) nennt sich selbst.
      ? `${mg.verdrehung ? 'Mastverdrehung' : mg.spitze ? 'Mastspitze'
        : (q.stelle?.was ?? 'Messstelle')} ${mg.z.toFixed(2)} m · ` : '';
    /*
     * >>> EINE VERWORFENE EINGABE WIRD GENANNT (26. September). <<<
     *
     * Über dem Mastkopf gilt die eingetragene Fahrdrahthöhe nicht
     * (Entscheid vom 24. September) — bis hierher fiel sie stumm durch.
     * Seit die Mastspitze kein Nachweis mehr ist, hängt der ganze Nachweis
     * an dieser Stelle, und eine still verworfene Eingabe verschiebt das
     * einzige η, das es gibt.
     */
    const verw = q.stelle?.verworfen
      ? `\n\nACHTUNG: die eingetragene Fahrdrahthöhe von `
        + `${q.stelle.verworfen.toFixed(2)} m liegt ÜBER dem Mastkopf `
        + `(${q.L.toFixed(2)} m) und gilt deshalb nicht. Gemessen wird auf `
        + `${mg.z?.toFixed(2)} m — dort, wo der Kern eine Verschiebung `
        + `rechnet.` : '';
    k.push(kachel(ende === 'fahrdraht' ? `Seitenlage ${name}` : `Verformung ${name}`, mm(mg.wert),
      `${q.ok ? '' : 'ÜBER · '}${wo}${mm(mg.grenz)} zulässig`
      + `${mg.verdrehung ? ' · um die Achse' : ` · ${mg.achse === 'x' ? 'quer' : 'längs'}`}`
      /*
       * Sichtbar, nicht nur im Titel: ein Tooltip liest, wer die Maus
       * darauf hält - und wer eine Höhe eingetragen hat, die nicht gilt,
       * hält sie nicht darauf.
       */
      + `${q.stelle?.verworfen ? ' · EINGABE VERWORFEN' : ''}`,
      /*
       * >>> MIT AMPEL (28. September). <<<
       * «die kacheln haben keine farbe unter übersicht» - auf Rückfrage:
       * «Verformung mit Ampel». Bis dahin stand die Kachel ohne Farbe
       * (Entscheid 24. September, «färbt kein Urteil»); jetzt färbt sie
       * wie jeder Nachweis nach η = w / 40 mm. Das Urteil in der
       * Hauptkachel regelt weiter `urteilMitGebrauch`.
       */
      ampel(mg.eta), {
        /*
         * Hier IMMER: die Gebrauchskombinationen sind andere als die der
         * Tragsicherheit, und welche von ihnen massgebend wurde, steht
         * sonst nirgends.
         */
        fall: fallKurz(mg.bez ?? ''),
        titel: `Massgebende Kombination: ${mg.bez ?? '?'}

`
             + `Gebrauchstauglichkeit, Betriebswind ψ ${erg.verformung.psi.toFixed(2)} `
             + `(Wiederkehrperiode 5 Jahre)${q.quelle === 'stabwerk'
                 ? ', Wege aus dem Stabwerk' : ''}. Kein Teil der Tragsicherheit; `
             + `die Farbe folgt η = w / Grenzwert.\n\n${alle}`
             + (dazu ? `\n\nOHNE NACHWEIS, nur zur Auskunft:\n${dazu}` : '')
             + verw,
      }));
  });
  return k;
}

/**
 * WELCHE NACHWEISART DIE ERGEBNISSE ZEIGEN - die Wahl selbst.
 *
 * >>> ZWEI KAESTCHEN, NICHT DREI KNOEPFE (25. September). <<<
 *
 * Weisung, mit dem Bild der Leiste: «hier anstatt buttons auswahlboxen
 * machen, dann kann man beide auswählen oder einzeln. meist rechnet man
 * mit den beiden.»
 *
 * Die drei Knöpfe «beide | Tragsicherheit | Gebrauchstauglichkeit» waren
 * eine Segmentwahl: «beide» stand als DRITTE Sorte neben den zwei Sachen,
 * die es tatsächlich gibt. Es sind aber zwei Nachweisarten, jede an oder
 * aus - und der Regelfall ist, dass beide an sind. Genau das sagen zwei
 * Kreuze, und ein drittes Wort braucht es nicht.
 *
 * >>> DER GESPEICHERTE ZUSTAND BLEIBT EINE ZEICHENKETTE. <<<
 * `trag`, `gzg` oder `beide` - daran hängen die Plotliste
 * (`modiFuer` in app.layout.js), die Kacheln und die Hauptzahl. Die
 * Kästchen sind die ANZEIGE dieser drei Stellungen, nicht ein zweiter
 * Zustand daneben.
 *
 * >>> SIE STEHT AN EINER STELLE. <<< Von hier aus folgt ihr auch die
 * Plotliste im Modellfenster (app.layout.js). Ein zweiter Wähler dort
 * wäre eine zweite Wahrheit - dieselbe Regel wie beim Lastfallwähler.
 */
export const NACHWEISKASTEN = [
  ['trag', 'Tragsicherheit', 'η der Bauteile gegen die Bemessungswerte'],
  ['gzg', 'Gebrauchstauglichkeit',
   'Verformung der Masten im Betriebswind ψ 0.70'],
];

/** Welche Kästchen sind bei dieser Stellung angekreuzt? */
export function kastenAn(art = 'beide') {
  return art === 'beide' ? ['trag', 'gzg'] : [art];
}

/**
 * Und umgekehrt: aus den angekreuzten Kästchen die Stellung.
 *
 * >>> KEINES ANGEKREUZT GIBT ES NICHT. <<<
 * Es wäre die Stellung «zeige nichts» - eine Auswertungsspalte, die leer
 * dasteht, ohne dass etwas fehlt. Das Kästchen, das als letztes übrig
 * bleibt, ist deshalb gesperrt (siehe `nachweisartLeiste`); trifft diese
 * Funktion trotzdem eine leere Liste, gilt «beide».
 */
export function artAusKasten(an) {
  const a = (an ?? []).filter((k) => k === 'trag' || k === 'gzg');
  if (a.length !== 1) return 'beide';
  return a[0];
}

/* ===========================================================================
 * >>> DIE STABWERKSLEISTE: KNOPF, STAND UND ZAHL. <<<
 * =========================================================================
 *
 * Weisung vom 25. September: «man könnte einen button zur auslösung der
 * berechnung ansetzen der das finale modell berechnet und die werte setzt».
 *
 * >>> DREI ZUSTAENDE, UND DER DRITTE IST DER GEFAEHRLICHE. <<<
 *
 * Es gibt kein Ergebnis, ein gültiges, oder ein VERALTETES - eines, das
 * zu einer früheren Eingabe gehört. Das letzte sieht aus wie das zweite,
 * und genau daran ist der Vergleich gegen PyNite einmal gescheitert (ein
 * 20-m-Joch gegen die Ergebnisse eines 8-m-Jochs). Deshalb steht der Stand
 * hier immer dabei, und ein veraltetes Ergebnis wird NICHT als Zahl
 * gezeigt - nur der Hinweis, dass neu zu rechnen ist.
 * ========================================================================= */
export function stabwerkLeiste(opt = {}) {
  const sw = opt.stabwerk;
  if (!sw || sw.verfahren !== 'stabwerk') return '';
  const stand = sw.stand ?? 'fehlt';
  const e = sw.ergebnis;

  /* -----------------------------------------------------------------------
   * >>> OHNE STABMODELL GIBT ES KEINEN KNOPF. <<<
   *
   * Ein Knopf, der nichts rechnen kann, ist schlimmer als keiner: man
   * drueckt ihn und schliesst aus dem Ausbleiben einer Zahl auf einen
   * Fehler. Hier steht statt dessen, WARUM es keine gibt.
   * --------------------------------------------------------------------- */
  if (stand === 'ohneModell') {
    return `<div class="stabwerk-leiste ohneModell">
      <span class="sw-marke">Ersatzbalken</span>
      <span class="notiz">${esc(e?.ohneModell ?? sw.grund
        ?? 'Für diese Tragwerksart gibt es kein Stabmodell.')}</span>
    </div>`;
  }

  /* -----------------------------------------------------------------------
   * >>> EIN VERALTETES ERGEBNIS ZEIGT SEINE ZAHL NICHT. <<<
   *
   * Weisung vom 25. September: «gib ein visuelles feedback wenn sich das
   * tragwerk angepasst hat und noch nicht berechnet wurde».
   *
   * Die Zahl WEGZULASSEN ist das deutlichste Feedback, das es gibt - eine
   * blasse oder durchgestrichene Zahl liest man trotzdem ab. Was bleibt,
   * ist die Aufforderung und ein Knopf, der sich meldet.
   * --------------------------------------------------------------------- */
  /*
   * >>> DAS URTEIL NENNT DAS BAUTEIL, NICHT DEN STAB. <<<
   *
   * Seit Etappe 3 (25. September) steht die ganze Reihe in einem Stabwerk,
   * und `MAST_M2_S1` ist der unterste Abschnitt eines Masten - eine
   * Angabe fuer den, der das Modell liest, nicht fuer den, der das
   * Ergebnis liest. Angeschrieben wird «Mast M2»; der Stabname steht im
   * Titel, fuer den Fall, dass man ihn doch braucht.
   */
  /*
   * >>> SEIT DEM 28. SEPTEMBER OHNE EIGENE ZAHL. <<<
   *
   * Frage des Auftraggebers: «diese auswertung ist etwas irreführend wenn
   * ich für stabwerk modell und balken verschieden ausnutzungwerte in
   * einer maske sehe?» Entscheid «Stabwerk führt, Knicken ergänzt»: das
   * Urteil steht EINMAL da, in der Hauptkachel - aus dem Stabwerk, mit
   * Knicken, Anker und Fundament. Eine zweite Zahl hier wäre das Maximum
   * OHNE diese drei und damit wieder eine andere Zahl in derselben Maske.
   * Die Leiste sagt nur noch, WAS gerechnet wurde.
   */
  const zahl = '';

  /* -----------------------------------------------------------------------
   * >>> DAS URTEIL DER REIHE - JE BAUTEIL EINE ZAHL. <<<
   *
   * Entscheid vom 19. September zur gesamtheitlichen Betrachtung:
   * «Seitenleiste mit Urteil der Reihe (Maximum mit Namen)». Das Maximum
   * steht oben als eine Zahl; darunter steht, woraus es kommt - je Joch
   * und je Mast. Ohne diese Zeile waere an der Reihe nur zu sehen, DASS
   * sie gerechnet wurde, nicht WO sie klemmt.
   *
   * Nur bei mehr als einem Tragwerk: bei einem einzelnen sagen die
   * Nachweiskacheln darunter dasselbe.
   * --------------------------------------------------------------------- */
  const reihe = (stand === 'gueltig' && e && (e.tragwerke ?? 1) > 1
                 && Array.isArray(e.reihe) && e.reihe.length)
    ? `<div class="sw-reihe">${e.reihe.map((b) => `
        <span class="sw-bauteil ${ampel(b.eta)}" title="${esc(
          `${b.wo ?? ''}${b.bez ? ` · ${b.bez}` : ''}`)}"
          >${esc(sw.name?.(b) ?? b.name)} <b>${f3(b.eta)}</b></span>`).join('')}</div>`
    : '';

  const marke = {
    fehlt: '<span class="sw-marke">Ersatzbalken</span>',
    veraltet: '<span class="sw-marke warn">Eingabe geändert</span>',
    gueltig: '<span class="sw-marke ok">Stabwerk</span>',
    fehler: '<span class="sw-marke warn">nicht gerechnet</span>',
  }[stand] ?? '';

  const text = {
    fehlt: 'Angezeigt wird vorläufig der Ersatzbalken. Das Stabwerk sieht '
         + 'auch die Biegung der Bleche aus ihrer Ebene heraus.',
    veraltet: 'Die Eingabe hat sich geändert - angezeigt wird vorläufig der '
            + (sw?.knopf ? 'Ersatzbalken. Gerechnet wird auf Knopfdruck (Optionen).'
                         : 'Ersatzbalken, das Stabwerk rechnet gleich neu.'),
    /*
     * Die Reihe zuerst: sie sagt, WAS gerechnet wurde. Die Kennzahlen
     * dahinter sagen, wie gross es war.
     */
    // «Kacheln Joch/Mast» stand auch am Einzelmasten, der kein Joch hat
    // (29. Sept.) - welche Kachel woher kommt, sagt ihre Gruppe.
    gueltig: e ? `Hauptkachel und Kacheln aus dem Stabwerk · ${(e.tragwerke ?? 1) > 1
                    ? `Reihe: ${e.tragwerke} Tragwerke, ${e.masten} Masten in einem `
                      + `Stabwerk · ` : ''}${e.staebe} Stäbe`
               + ` · ${e.freiheitsgrade} Freiheitsgrade`
               + ` · ${e.faelle} Kombinationen · ${e.ms} ms` : '',
    fehler: e?.fehler ? `${e.fehler}` : 'Die Rechnung ist nicht durchgelaufen.',
  }[stand] ?? '';

  // Der Knopf traegt die Akzentfarbe, solange etwas zu tun ist.
  const dringend = stand === 'fehlt' || stand === 'veraltet' || stand === 'fehler';
  const beschriftung = stand === 'fehlt' ? 'Stabwerk berechnen'
    : stand === 'veraltet' ? 'Neu berechnen' : 'Nochmals rechnen';

  return `<div class="stabwerk-leiste ${esc(stand)}">
    <button type="button" class="btn${dringend ? ' btn-acc' : ''} sw-knopf"
      data-stabwerk-rechnen>${beschriftung}</button>
    ${marke}
    ${zahl}
    <span class="notiz">${esc(text)}</span>
    ${reihe}
  </div>`;
}

/* ===========================================================================
 * >>> WANN DAS STABWERK DIE KACHELN TRAEGT (28. September). <<<
 * =========================================================================
 *
 * Entscheid «Stabwerk führt, Knicken ergänzt»: nach der Berechnung stehen
 * Hauptkachel und Kacheln Joch/Mast aus dem Stabwerk. Nur dann, wenn es
 * gewählt ist, zum Eingabestand passt und die Bemessung gezeigt wird - ein
 * veraltetes Ergebnis führt nichts, und beim Einzellastfall wird nicht
 * geurteilt.
 *
 * @returns {object|null}  das Ergebnis aus rechneStabwerk() oder null
 */
export function stabwerkFuehrt(opt = {}, einzelLastfall = false) {
  const sw = opt.stabwerk;
  if (!sw || sw.verfahren !== 'stabwerk' || sw.stand !== 'gueltig') return null;
  /*
   * >>> AUCH IM GEWÄHLTEN LASTFALL (4. Oktober). <<<
   * «wenn möglich konsequent auf stabmodell die nachweise führen. ausser
   * man stellt es unter optionen auf balken methode um.» app.js reicht die
   * Auswertung des gewählten Falls aus derselben Lösung (`ergebnisFall`);
   * bis dahin zeigte der Einzellastfall hier den Ersatzbalken.
   */
  if (einzelLastfall) return sw.ergebnisFall?.teile ? sw.ergebnisFall : null;
  return sw.ergebnis?.teile ? sw.ergebnis : null;
}

/**
 * Das Urteil des Kerns, angepasst an ein gültiges Stabwerk.
 *
 * >>> DER TRAGAUSLEGER IST MIT DEM STABWERK NACHGEWIESEN (28. Sept.). <<<
 * Der Kern nennt ihn «NICHT nachgewiesen» (Phantomauflager, Entscheid vom
 * 18. September). Liegt ein gültiges Stabwerk mit Ausleger vor, trägt das
 * Stabwerk sein Urteil (UPE, Bleche, Aufhängung, Mast, Knicken, Fundament)
 * - dann fallen Vermerk und «nicht gefuehrt: Tragausleger» weg. Ohne
 * gültiges Stabwerk bleibt es, wie der Kern es sagt.
 */
export function urteilMitStabwerk(urteil, swH) {
  if (!urteil || !swH?.ausleger) return urteil;
  return {
    ...urteil,
    tragwerkGefuehrt: urteil.nachweise?.jochtragwerk !== false,
    nichtNachgewiesen: null,
    nichtGefuehrt: (urteil.nichtGefuehrt ?? []).filter((g) => g.key !== 'tragausleger'),
  };
}

/** Steht das Stabwerk zur Wahl, ist aber (noch) nicht gültig? */
/*
 * Die Zahl des gewählten Falls aus dem Stabwerk (4. Oktober): nur, was
 * dieser Fall beansprucht - Joch, Masten, Knicken. Anker, Fundament und
 * Aufhängung stehen auf ihren eigenen, charakteristischen Lastniveaus und
 * gehören nicht in die Kopfzahl eines Falls (gemessen im Browser: sonst
 * «η 0.434 Fundament M2» bei Wind +x, das Joch dort 0.336).
 */
const NICHT_IM_FALL = new Set(['fundament', 'anker', 'aufhaengung', 'gebrauch']);
export function etaImFall(bt) {
  const l = (bt?.liste ?? []).filter((b) => !NICHT_IM_FALL.has(b.key) && Number.isFinite(b.eta));
  if (!l.length) return null;
  const m = l.reduce((a, b) => (b.eta > a.eta ? b : a));
  return { eta: m.eta, name: m.name };
}

export function stabwerkVorlaeufig(opt = {}, einzelLastfall = false) {
  const sw = opt.stabwerk;
  // Seit dem 4. Oktober auch im Einzellastfall: dort zeigt der Kern nur, bis
  // das Stabwerk gilt.
  return sw?.verfahren === 'stabwerk'
    && sw.stand !== 'gueltig' && sw.stand !== 'ohneModell';
}

/** Das Knick-eta des Kerns je Mastname («Mast M1» → eta). */
export function knickJe(erg) {
  const namen = erg?.modell?.federn?.namen ?? {};
  const out = {};
  ['A', 'B'].forEach((ende) => {
    const n = erg?.mast?.[ende];
    if (!n?.stabil || !Number.isFinite(n.stabil.eta)) return;
    out[namen[ende] ? `Mast ${namen[ende]}` : `Mast ${ende}`] = n.stabil.eta;
  });
  return out;
}

/** Den Knopf der Stabwerksleiste verdrahten. */
/**
 * Der Signalbauer ist ein Dialog der Anwendung (app.dialoge.js); die Karte
 * kennt ihn nur als Aufruf. `fn(auswahl, fertig)` - `fertig(neu)` schreibt
 * die neue Auswahl ins Modul.
 */
/* ===========================================================================
 * >>> DER BALKEN DES SCHIEBERS IST HELLER ALS SEIN PUNKT (30. September). <<<
 *
 * Weisung: «mach den balken etwas heller als den punkt.» Die Darstellung des
 * Browsers (`accent-color`) zeichnet beide in derselben Farbe; das Stilblatt
 * zeichnet den Schieber deshalb selbst und füllt den Balken bis zur
 * Variablen --p. Die setzt diese Hilfe - bei jeder Eingabe, nach jedem
 * Neuaufbau (MutationObserver in app.js) und am Ende jeder Rechnung, denn
 * dort schreibt die Maske Werte, ohne dass sich das DOM ändert.
 * =========================================================================== */
export function schieberFuellen(el) {
  if (!el || el.type !== 'range') return;
  const min = Number(el.min) || 0;
  const max = el.max === '' ? 100 : Number(el.max);
  const v = Number(el.value);
  const p = max > min ? Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100)) : 0;
  el.style.setProperty('--p', `${p.toFixed(2)}%`);
}
export function schieberFuellenAlle(root = document) {
  root.querySelectorAll?.('input[type=range]').forEach(schieberFuellen);
}

/* ===========================================================================
 * >>> DIE MASTNUMMER IN ALLEM, WAS MAN LIEST (30. September). <<<
 *
 * Auf Rückfrage «Überall in der Anzeige»: gerechnet wird unter M1, gelesen
 * unter der eingetragenen Nummer. Statt an vierzig Stellen, an denen der
 * Name zugleich Schlüssel ist, wird die Nummer auf das GEZEICHNETE
 * angewendet: Textknoten und Titel der Oberfläche. Eingabefelder bleiben
 * unberührt (ihr Wert ist Eingabe, nicht Anzeige).
 * =========================================================================== */
const MAST_WORT = /\b(MT?\d+)\b/;
/*
 * >>> DIE STEGSKIZZE SCHALTET UM (30. September). <<<
 * Weisung: «hier mit draufklicken die mastausrichtung ändern.» Ein Klick
 * auf die Skizze unter «Stegrichtung» wählt die andere Richtung - über das
 * Auswahlfeld darüber, damit derselbe Weg wie jede Eingabe läuft.
 */
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const sk = e.target?.closest?.('.opt-skizze');
    if (!sk) return;
    const sel = sk.closest('.feld')?.querySelector('select[data-feld="mastSteg"], select[data-feld="mastStegB"]');
    if (!sel || sk.closest('.gesperrt') || sel.options.length < 2) return;
    sel.selectedIndex = (sel.selectedIndex + 1) % sel.options.length;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

export function mastAnzeigeAnwenden(root, karte) {
  if (!root || !karte?.size || typeof document === 'undefined') return;
  const tausch = (t) => t.replace(/\b(MT?\d+)\b/g, (w) => karte.get(w) ?? w);
  const gang = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const el = n.parentElement;
      if (!el || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(el.tagName)) return NodeFilter.FILTER_REJECT;
      return MAST_WORT.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  const knoten = [];
  while (gang.nextNode()) knoten.push(gang.currentNode);
  knoten.forEach((n) => {
    const neu = tausch(n.nodeValue);
    if (neu !== n.nodeValue) n.nodeValue = neu;
  });
  root.querySelectorAll('[title]').forEach((el) => {
    const t = el.getAttribute('title');
    if (!MAST_WORT.test(t)) return;
    const neu = tausch(t);
    if (neu !== t) el.setAttribute('title', neu);
  });
}

let SIGNALBAUER = null;
export function setzeSignalbauer(fn) { SIGNALBAUER = fn; }

export function verdrahteStabwerk(node, opt = {}) {
  // Bügelschrauben (7. Oktober): Grenzfeder suchen und übernehmen.
  node.querySelector('[data-buegel-grenze]')?.addEventListener('click', (e) => {
    e.currentTarget.inert = true; e.currentTarget.textContent = 'sucht …';
    opt.beiBuegelGrenze?.();
  });
  node.querySelector('[data-buegel-uebernehmen]')?.addEventListener('click', () => opt.beiBuegelUebernehmen?.());
  // Kacheln aus dem Stabwerk: Klick zeigt den massgebenden Stab im Modell.
  if (typeof opt.beiStab === 'function') {
    node.querySelectorAll('[data-kz-stab]').forEach((k) => {
      k.addEventListener('click', () => opt.beiStab(k.dataset.kzStab));
    });
  }
  // Die Referenzhöhe im GZG-Block (30. September) - wie in den Optionen.
  if (typeof opt.beiFeld === 'function') {
    node.querySelectorAll('[data-gzg-feld]').forEach((inp) => {
      inp.addEventListener('change', () => {
        const k = inp.dataset.gzgFeld;
        opt.beiFeld(k, k === 'fdHoehe' ? (Number(inp.value) > 0 ? Number(inp.value) : 0) : inp.value);
      });
    });
  }
  const b = node.querySelector('[data-stabwerk-rechnen]');
  if (!b || typeof opt.beiStabwerk !== 'function') return;
  b.onclick = () => {
    /*
     * Der Knopf meldet sich, BEVOR gerechnet wird: 0.4 s ohne jede
     * Rueckmeldung liest sich wie ein toter Knopf. Das Neuzeichnen
     * uebernimmt der Aufrufer.
     */
    b.disabled = true;
    b.textContent = 'rechnet …';
    setTimeout(() => opt.beiStabwerk(), 0);
  };
}

export function nachweisartLeiste(jetzt = 'beide') {
  const an = kastenAn(jetzt);
  /*
   * >>> DAS LETZTE KAESTCHEN LAESST SICH NICHT ABWAEHLEN. <<<
   *
   * Beide aus hiesse «zeige nichts» - eine leere Auswertungsspalte, der
   * man nicht ansieht, ob etwas fehlt oder ob man selbst es weggeklickt
   * hat. Es ist GESPERRT und nicht bloss zurückgesetzt: ein Kästchen, das
   * beim Klick zurückspringt, sieht aus wie ein Fehler.
   */
  return `<div class="nw-arten" role="group" aria-label="Nachweisarten">${
    NACHWEISKASTEN.map(([k, t, was]) => {
      const ein = an.includes(k);
      const letzte = ein && an.length === 1;
      return `<label class="nw-art${ein ? ' on' : ''}"
        title="${esc(letzte
          ? `${was}. Mindestens eine Nachweisart muss gewählt sein.` : was)}">
        <input type="checkbox" data-nwart="${k}"${ein ? ' checked' : ''}${
          letzte ? ' disabled' : ''}>
        <span>${esc(t)}</span>
      </label>`;
    }).join('')}</div>`;
}

/** Die Kästchen der Leiste verdrahten. */
export function verdrahteNachweisart(node, opt) {
  if (!opt?.beiNachweisart) return;
  const kasten = [...node.querySelectorAll('[data-nwart]')];
  kasten.forEach((b) => {
    b.addEventListener('change', () => opt.beiNachweisart(
      artAusKasten(kasten.filter((x) => x.checked).map((x) => x.dataset.nwart))));
  });
}

/**
 * Der Block der Gebrauchstauglichkeit, fertig zum Einsetzen.
 *
 * Er sagt AUCH, wenn es nichts zu zeigen gibt. Ein leerer Abschnitt wäre
 * zweideutig - «nicht gerechnet» und «nichts gefunden» sehen dann gleich
 * aus, und das erste wäre ein Mangel.
 */
/* ===========================================================================
 * >>> DER BLOCK BESTANDESSCHUTZ (4. Oktober, core.bestand.js). <<<
 * Nur mit eingeschaltetem Nachweis (Optionen → Nachweise) und gültigem
 * Stabwerk. Eine Kachel mit dem grössten Δη und dem Bauteil, darunter je
 * Bauteil Bestand → mit neuen Teilen. Ein Vergleich, kein Urteil: er steht
 * neben den Nachweisen und färbt die Hauptkachel nicht.
 * ========================================================================= */
/* ===========================================================================
 * >>> DER BLOCK BÜGELSCHRAUBEN (7. Oktober). <<<
 * Weisung: «Ziehe die Bügelschrauben Prüfung aus der liste der
 * konstruktionsprüfungen heraus als separate gruppe. biete einen button die
 * auflagersteifigkeit ensprechend anzupassen …» Mit gültigem Stabwerk die
 * Kraft in der Jochachse je Gurtanschluss (`buegelNachweis`), sonst die
 * Prüfung A1 des Ersatzbalkens. Ist sie überschritten, sucht ein Knopf die
 * Grenzfeder K_X (`buegelGrenzfeder`), ein zweiter übernimmt sie. Zählt
 * zum Urteil nur, wenn die Gruppe «Auflager Joch» geführt wird.
 * ========================================================================= */
export function buegelBlockHtml(opt, urteil) {
  const sw = stabwerkFuehrt(opt, false);
  const b = sw?.buegel ?? null;
  const a1 = (urteil?.checks ?? []).find((c) => c.id === 'A1') ?? null;
  if (!b && !a1) return '';
  const vorschlag = opt.buegelVorschlag ?? null;
  const kurz = (x) => (x ? fallKurz(x) : '');
  let k = '', tabelle = '';
  if (b) {
    const Fg = b.Fgrenz || 0;
    k = kachel('Bügelschrauben', b.eta === null ? '–' : f3(b.eta),
      `${b.wer ?? ''} · ${f2(b.F)} / ${f2(Fg)} kN · ${kurz(b.bez)}`,
      b.eta === null ? '' : ampel(b.eta),
      { titel: 'Grösste Kraft in der Jochachse im Linkelement je Gurt am Mast, '
             + 'über die Bemessungskombinationen, gegen die Grenzlast der Gurtverbindung F_Grenz '
             + '(Auflager → Grenzlast der Gurtverbindung).' });
    tabelle = klapp('buegel-tabelle', `Je Gurtanschluss · ${b.zeilen.length}`,
      `<div class="tabellenrahmen"><table class="dt"><thead><tr><th>Anschluss</th>
        <th class="num">F_x [kN]</th><th class="num">F_Grenz</th><th class="num">η</th>
        <th>massgebend</th></tr></thead><tbody>${b.zeilen.map((z) => `
        <tr class="${z.eta > 1 ? 'nok' : ''}"><td>${esc(z.name)}</td>
          <td class="num">${f2(z.F)}</td><td class="num">${f2(z.Fgrenz)}</td>
          <td class="num ${z.eta === null ? '' : ampel(z.eta)}">${z.eta === null ? '–' : f3(z.eta)}</td>
          <td>${esc(kurz(z.bez))}</td></tr>`).join('')}</tbody></table></div>`, '', false);
  } else {
    k = kachel('Bügelschrauben (A1)', f3(a1.erforderlich ? a1.vorhanden / a1.erforderlich : 0),
      `${f2(a1.vorhanden)} / ${f2(a1.erforderlich)} kN · Ersatzbalken`,
      a1.ok ? 'ok' : 'fail', { titel: a1.status ?? '' });
  }
  const ueber = b ? b.ueber : a1 && !a1.ok;
  const knopf = b && ueber && typeof opt.beiBuegelGrenze === 'function'
    ? `<button class="btn btn-mini btn-acc" data-buegel-grenze type="button"
        title="Sucht die grösste Feder K_X, bei der die Schrauben die Grenzlast gerade einhalten (mehrere Stabwerksläufe)">Grenzfeder K_X suchen</button>` : '';
  const vor = vorschlag?.K ? `<p class="notiz" style="margin:4px 0 0">Grenzfeder
      <b>K_X = ${Math.round(vorschlag.K).toLocaleString('de-CH')} kN/m</b>
      (${esc(vorschlag.gurte.join(' und '))}) - F = ${f2(vorschlag.F)} / ${f2(vorschlag.Fgrenz)} kN.
      <button class="btn btn-mini btn-acc" data-buegel-uebernehmen type="button">übernehmen</button></p>`
    : vorschlag?.grund ? `<p class="notiz" style="margin:4px 0 0">${esc(vorschlag.grund)}</p>` : '';
  const aus = urteil?.nichtGefuehrt?.some?.((g) => g.key === 'auflagerJoch');
  return `${abschnitt('Bügelschrauben', b ? 'Gurtanschluss am Mast · Stabwerk' : 'Gurtanschluss am Mast · Ersatzbalken')}
    <div class="kennzahlen">${k}</div>
    ${ueber ? `<p class="notiz" style="margin:4px 0 0"><b>Grenzlast überschritten</b> mit
      der eingestellten Auflagerbedingung. ${knopf}</p>` : ''}
    ${vor}
    ${aus ? '<p class="notiz" style="margin:4px 0 0">Die Nachweisgruppe «Auflager Joch» ist ausgeschaltet (Optionen) - der Block zählt nicht zum Urteil.</p>' : ''}
    ${tabelle}`;
}

export function bestandBlockHtml(sw) {
  const b = sw?.bestand;
  if (!b) return '';
  // Die Regel (6. Oktober): fest auf den Grenzwert oder anteilig an η(Bestand).
  const anteilig = b.bezug === 'ausnutzung';
  const pz = b.prozent ?? (b.grenze ?? 0.05) * 100;
  const pzT = `${Number(pz.toFixed(2))} %`;
  const kopf = abschnitt('Bestandesschutz', anteilig
    ? `Δη ≤ ${pzT} von η Bestand · Stabwerk`
    : `Δη ≤ ${(b.grenze ?? 0.05).toFixed(3).replace(/0$/, '')} (${pzT} von 1.00) · Stabwerk`);
  if (!b.anzahl) {
    return `${kopf}<p class="leer">Kein Anbauteil als «neu» gekennzeichnet — das Kennzeichen steht in der Bauteilkarte (Reiter Anbauteile).</p>`;
  }
  if (b.fehler) return `${kopf}<p class="leer">Bestand nicht gerechnet: ${esc(b.fehler)}</p>`;
  const k = kachel(anteilig ? 'Zunahme Bestandesschutz' : 'Δη Bestandesschutz',
    anteilig ? (b.relMax === null ? '–' : `${b.relMax >= 0 ? '+' : '−'}${Math.abs(b.relMax * 100).toFixed(1)} %`)
             : b.dMax.toFixed(3),
    `${b.wer ?? ''} · ${b.ok ? 'kein vertiefter Nachweis' : 'vertiefter Nachweis nötig'}`,
    b.ok ? 'ok' : 'nok',
    { titel: `${b.anzahl} Anbauteil(e) als neu gekennzeichnet. Je Bauteil η(Bestand + neue Teile) − η(Bestand), `
           + (anteilig ? `zulässig ${pzT} der Ausnutzung im Bestand; ` : `zulässig ${pzT} der Grenzausnutzung 1.00; `)
           + 'beide Zustände mit derselben Windstufe.' });
  const zeilen = b.zeilen.map((z) => `<tr class="${z.ok ? '' : 'nok'}"><td>${esc(z.name)}</td>`
    + `<td class="num">${z.alt.toFixed(3)}</td><td class="num">${z.neu.toFixed(3)}</td>`
    + `<td class="num">${z.d >= 0 ? '+' : '−'}${Math.abs(z.d).toFixed(3)}</td>`
    + `<td class="num">${Number.isFinite(z.zul) ? z.zul.toFixed(3) : '–'}</td></tr>`).join('');
  return `${kopf}<div class="kennzahlen">${k}</div>
    ${klapp('bestand-tabelle', `Je Bauteil · ${b.anzahl} neue(s) Teil(e)`,
      `<div class="tabellenrahmen"><table class="dt"><thead><tr><th>Bauteil</th><th class="num">Bestand</th>`
      + `<th class="num">mit neuen</th><th class="num">Δη</th><th class="num">zul.</th></tr></thead><tbody>${zeilen}</tbody></table></div>`)}`;
}

export function gzgBlockHtml(erg, quelle = '', gzg = null) {
  const g = gzgKacheln(erg);
  const v = erg?.verformung;
  const psi = v?.psi;
  // Die Grenzwerte aus den Optionen (30. September), sonst die Vorgaben;
  // genannt werden nur die gefuehrten Prüfungen.
  const gr = v?.grenzen;
  const gp = v?.gruppen ?? { fahrdraht: true, spitze: v?.spitze === true };
  const grenzen = [
    gp.fahrdraht ? `${Math.round((gr?.fahrdraht ?? 0.040) * 1000 * 10) / 10} mm` : '',
    gp.spitze ? `L/${gr?.spitzeN ?? 100}` : '',
    gp.verdrehung ? `${gr?.verdrehungGrad ?? 5}°` : '',
  ].filter(Boolean);
  /*
   * >>> DIE MASTVERDREHUNG RECHNET NUR DAS STABWERK (30. September). <<<
   * Geführt, aber ohne gültiges Stabwerk: das steht da, statt still zu
   * fehlen.
   */
  const nurSw = gp.verdrehung && v?.quelle !== 'stabwerk'
    ? '<p class="notiz">Mastverdrehung: nur aus dem Stabwerk - sie steht da, sobald es gerechnet ist.</p>' : '';
  // Die Referenzhöhe, umschaltbar (Weisung 30. September: «unter
  // gebauchstauglichkeit in der sidebar übersicht aufführen und
  // umschaltbar machen»).
  const referenz = gzg ? `<div class="gzg-referenz-zeile">${gzgReferenzHtml(gzg, false, true)}</div>` : '';
  // Die Quelle steht dabei wie an den Gruppen der Nachweise (28. Sept.).
  return `${abschnitt('Gebrauchstauglichkeit',
    [psi ? (grenzen.length ? `Betriebswind ψ ${psi.toFixed(2)} · Grenzen ${grenzen.join(' · ')}`
      : 'nicht gefuehrt (Optionen → Nachweise)') : '', quelle]
      .filter(Boolean).join(' · '))}
    ${referenz}${nurSw}
    ${g.length ? `<div class="kennzahlen">${g.join('')}</div>`
      : `<p class="leer">${erg?.verformung?.ohneStelle
        /*
         * >>> OHNE MESSSTELLE KEIN NACHWEIS - MIT GRUND (26. September). <<<
         *
         * Seit der Weisung «lassen wir den nachweis für die mastspitze weg
         * … und nutzen nur die referenzhöhe (fahrdraht)» hängt der Nachweis
         * an EINER Stelle. Gibt es sie nicht, gibt es ihn nicht — und das
         * muss dastehen. Eine leere Spalte liest sich wie «erfüllt».
         */
        ? 'Kein Verformungsnachweis — es gibt keine Referenzhöhe: weder '
          + 'Fahrdraht noch Ausleger noch Jochauflager. Der Nachweis der '
          + 'Seitenlage braucht eine Stelle, an der er gilt.'
        : 'Kein Verformungsnachweis — er wird nur für Masten gefuehrt.'}</p>`}`;
}

/* ===========================================================================
 * >>> DIE NACHWEISKARTE IST GEORDNET: JOCH, MAST, ANKER, FUNDAMENT. <<<
 * =========================================================================
 *
 * Weisung vom 25. September: «ordne die nachweis karte joch mast fundament
 * in der sidebar». Auf Rückfrage, wohin Zuganker und Druckstütze gehören:
 * in eine EIGENE Gruppe.
 *
 * Der Grund ist nicht Ordnungsliebe, sondern das Lastniveau. Gurt, Blech
 * und Mast stehen auf BEMESSUNGSWERTEN; Anker und Fundament messen eine
 * charakteristische Kraft gegen eine ZULÄSSIGE - beides ohne
 * Teilsicherheitsbeiwerte. Vier η in einer Reihe sahen aus wie vier
 * vergleichbare Zahlen, und genau das sind sie nicht (derselbe Befund wie
 * am 11. September, als 17.39 kN und 16.8 kN nebeneinanderstanden und der
 * Unterschied nach einem Fehler aussah).
 *
 * Diese Funktion liefert die drei Gruppen, die am MASTEN hängen. Die
 * Jochgruppe baut der Aufrufer - sie sieht am Tragjoch anders aus als am
 * Abfangjoch, und das ist seine Sache.
 */
/* ===========================================================================
 * >>> DIE MASSGEBENDE KOMBINATION GEHOERT ZU JEDER ZAHL. <<<
 * =========================================================================
 *
 * Weisung vom 25. September: «was man noch aufführen müsste bei den
 * nachweissen, ist die massgebende kombination.»
 *
 * Sie wird KURZ angeschrieben: die Kachel ist 88 px breit, und
 * «Gebrauchstauglichkeit selten: Wind +y (Gleisrichtung)» verdrängte über
 * drei Zeilen die Zahl, um die es geht. Weggelassen wird, was in Klammern
 * steht (die Achsenangabe) und das angehängte «leitend» - beides sagt
 * nichts über das Lastbild, sondern über die Schreibweise. Der VOLLE Name
 * steht im Titel der Kachel.
 */
export function fallKurz(bez) {
  if (!bez) return '';
  return String(bez)
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+leitend$/i, '')
    /*
     * «Gebrauchstauglichkeit selten: Wind −y» sind 37 Zeichen und brechen
     * auf drei Zeilen um. Das Wort steht ohnehin über der Gruppe, in der
     * diese Kacheln sitzen - hier sagt es nichts, was man nicht schon weiss.
     */
    .replace(/^Gebrauchstauglichkeit\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Die Zeile der massgebenden Kombination - oder null.
 *
 * >>> BEIM EINZELLASTFALL STEHT SIE NICHT DA. <<<
 * Dort gilt sie allen Kacheln gemeinsam und steht schon in der Leiste
 * darüber; je Kachel wiederholt wäre sie eine Spalte Rauschen.
 *
 * @param {object} erg   das angezeigte Ergebnis (nur die Hüllkurve nennt sie)
 * @param {object} opt   mit `fallBez(key)` aus app.js
 * @param {string} key   Schlüssel der Kombination (z. B. «windYp»)
 * @param {string} bez   oder gleich der ausgeschriebene Name
 */
function fallZeile(erg, opt, key, bez = null) {
  if (!erg?.istHuellkurve) return null;
  const voll = bez ?? opt?.fallBez?.(key) ?? key ?? null;
  return voll ? { kurz: fallKurz(voll), voll } : null;
}

export function bauteilKachelnJe(erg, urteil, ampelU, opt = {}) {
  /*
   * DAS FUNDAMENT AUS DEM STABWERK (30. September): gilt das Stabwerk,
   * ersetzt es je Mast das des Kerns - dieselbe Gestalt, andere Kräfte.
   */
  if (opt.swH?.fundamentJe && Object.keys(opt.swH.fundamentJe).length) {
    const namenS = erg.modell?.federn?.namen ?? {};
    const f = {};
    ['A', 'B'].forEach((ende) => {
      const q = opt.swH.fundamentJe[namenS[ende]];
      if (q) f[ende] = q;
    });
    if (Object.keys(f).length) erg = { ...erg, fundament: { ...(erg.fundament ?? {}), ...f } };
  }
  // Ebenso der Anker (30. September): Kraft aus dem Stabwerk, Seil nur Zug.
  if (opt.swH?.ankerJe && Object.keys(opt.swH.ankerJe).length) {
    const namenS = erg.modell?.federn?.namen ?? {};
    const a = {};
    ['A', 'B'].forEach((ende) => {
      const q = opt.swH.ankerJe[namenS[ende]];
      if (q) a[ende] = q;
    });
    if (Object.keys(a).length) erg = { ...erg, anker: { ...(erg.anker ?? {}), ...a } };
  }
  const mast = [];
  const anker = [];
  const fundament = [];
  const fz = (key, bez) => fallZeile(erg, opt, key, bez);
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
      /*
       * >>> STABWERK FUEHRT, KNICKEN ERGAENZT (28. September). <<<
       *
       * Liegt ein gültiges Stabwerk vor, steht der Querschnitt des Masten
       * aus dem Stabwerk da - und das Knicken als EIGENE Kachel aus dem
       * Kern, denn der Löser rechnet keine Stabilität. Zusammengezogen wie
       * bisher (`etaMitStabilitaet`) stünde am geteilten Masten einer Reihe
       * die Zahl des Einzelfelds, sobald das Knicken überwiegt.
       */
      const sw = opt.swH?.bauteile?.[`mast:${name}`] ?? null;
      // Am Tragausleger kennt der Kern einen Phantom-Masten (Auflager am
      // freien Ende) - mit dem Stabwerk zählt nur der wirkliche.
      if (opt.swH?.ausleger && !sw) return;
      /*
       * >>> DER GITTERMAST: JE TEIL EINE KACHEL (3. Oktober). <<<
       * Entscheid «Stabwerk + Diagramm als Kontrolle»: Gurtwinkel,
       * Bindebleche und Rohr je Stab aus dem Stabwerk; daneben das
       * Bemessungsdiagramm des Sortiments (zulässige Fussmomente) - als
       * Kontrolle mit Ampel, ohne Anteil am Urteil.
       */
      if (sw && n.profil.gitter) {
        const gj = opt.swH?.gitterJe?.[name] ?? null;
        const teilK = (teil, titel, unter) => {
          const t = opt.swH?.teile?.[`mast:${name}|${teil}`];
          if (!t) return;
          mast.push(kachel(`η ${name} ${titel}`, f3(t.eta), `${unter} · Stabwerk`, ampelU(t.eta), {
            ...(t.bez ? { fall: fallKurz(t.bez) } : {}), ...(t.wo ? { stab: t.wo } : {}),
            titel: `${t.bez ? `Massgebende Kombination: ${t.bez}\n\n` : ''}`
                 + `${n.profil.name}: ${titel} aus dem Stabwerk, massgebender Stab ${t.wo ?? ''}.`,
          }));
        };
        teilK('gurt', 'Gurt', gj ? `${gj.gurtUnten} / ${gj.gurtOben}` : n.profil.name);
        teilK('blech', 'Blech', 'Bindebleche');
        teilK('rohr', gj?.obenArt === 'aufsatz' ? 'Aufsatz' : 'Rohr',
              gj?.obenArt === 'aufsatz' ? 'Mastaufsatz' : 'Rohr oben');
        const d = gj?.diagramm;
        if (d && Number.isFinite(d.eta)) {
          mast.push(kachel(`${name} Diagramm`, f3(d.eta), 'Kontrolle · Fussmomente', ampelU(d.eta), {
            ...(d.bez ? { fall: fallKurz(d.bez) } : {}),
            titel: `Kontrolle nach dem Bemessungsdiagramm des Typs ${d.typ} (zählt nicht zum Urteil):\n`
                 + `M_a ${d.Ma.toFixed(1)} / ${d.zulA.toFixed(1)} kNm + M_b ${d.Mb.toFixed(1)} / ${d.zulB.toFixed(1)} kNm `
                 + `= ${d.eta.toFixed(3)}\nFussmomente charakteristisch aus dem Stabwerk, «${d.bez ?? ''}». `
                 + 'Nachgewiesen wird je Stab (Kacheln daneben).',
          }));
        }
        return;
      }
      if (sw) {
        const fS = sw.bez ? { kurz: fallKurz(sw.bez), voll: sw.bez } : null;
        mast.push(kachel(`η ${name}`, f3(sw.eta),
          `${n.profil.name} · Stabwerk`, ampelU(sw.eta), {
            ...(fS ? { fall: fS.kurz } : {}),
            ...(sw.wo ? { stab: sw.wo } : {}),
            titel: `${fS ? `Massgebende Kombination: ${fS.voll}\n\n` : ''}`
                 + `Querschnitt aus dem Stabwerk (${sw.wo ?? ''}). `
                 + 'Die Stabilität rechnet der Löser nicht - sie steht '
                 + 'in der Kachel «Knicken» daneben.',
          }));
        // Am Tragausleger das Knicken aus dem Stabwerk (Entscheid 28. Sept.),
        // seit demselben Tag auch am Tragjoch (`knick` je Mast).
        const knA = opt.swH?.ausleger ? opt.swH.ausleger.knick
          : (opt.swH?.knick?.[name] ?? null);
        if (knA && Number.isFinite(knA.eta)) {
          mast.push(kachel(`η Knicken ${name}`, f3(knA.eta),
            `${n.profil.name} · Stabwerk`, ampelU(knA.eta), {
              ...(knA.bez ? { fall: fallKurz(knA.bez) } : {}),
              titel: 'Knicken nach SIA 263 mit den Kräften des Stabwerks - '
                   + 'Vertikallasten auf ihren Höhen, Schnittgrössen am Fuss '
                   + '(core.stabmast.js).',
            }));
        } else if (!opt.swH?.ausleger && n.stabil && Number.isFinite(n.stabil.eta)) {
          const fK = fz(n.stabil.fall ?? n.fall);
          mast.push(kachel(`η Knicken ${name}`, f3(n.stabil.eta),
            `${n.profil.name} · Ersatzbalken`, ampelU(n.stabil.eta), {
              ...(fK ? { fall: fK.kurz } : {}),
              titel: 'Knicken nach SIA 263 aus dem Ersatzbalken - der Löser '
                   + 'rechnet keine Stabilität. ⚠ Mit den Schnittgrössen des '
                   + 'Ersatzbalkens (Einzelfeld); am geteilten Masten einer '
                   + 'Reihe sind sie kleiner als im Stabwerk.',
            }));
        }
        return;
      }
      const eN = n.etaMitStabilitaet ?? n.eta;
      // Die Kachel nennt, WAS massgebend ist - Querschnitt oder Knicken.
      // Ohne das stuende dort eine Zahl, deren Herkunft man raten muesste.
      const wodurch = (n.stabil?.eta ?? 0) > n.eta
        ? 'Knicken' : (n.plastischWirksam ? 'plastisch' : 'elastisch');
      const f = fz(n.fall);
      mast.push(kachel(`η ${name}`, f3(eN),
        `${n.profil.name} · ${wodurch}`, ampelU(eN),
        f ? { fall: f.kurz, titel: `Massgebende Kombination: ${f.voll}` } : null));
    });
  }
  /*
   * >>> DER ANKER BEKOMMT SEINE EIGENE KACHEL. <<<
   *
   * Weisung vom 9./10. September: Zuganker und Druckstuetzen am Masten,
   * nachgewiesen ueber das Bemessungsdiagramm, mit der charakteristischen
   * Kraft.
   *
   * Sie steht NEBEN der Mastkachel, nicht darin: der Anker ist ein eigenes
   * Bauteil mit einem eigenen Nachweis, und sein eta bezieht sich auf eine
   * ZULAESSIGE KRAFT, nicht auf einen Bemessungswiderstand. Zwei Zahlen mit
   * verschiedener Bedeutung zusammenzuziehen hiesse, beide unbrauchbar zu
   * machen.
   *
   * Die Kachel nennt den TYP und die Kraft mit ihrem Vorzeichen - «Zug» oder
   * «Druck» ist die Auskunft, an der man sieht, ob der Stab auf der
   * richtigen Seite steht.
   */
  if (erg.anker) {
    const namenA = erg.modell.federn?.namen ?? {};
    const gesehenA = new Set();
    ['A', 'B'].forEach((ende) => {
      const e = erg.anker[ende];
      const nw = e?.nachweis;
      if (!nw) return;
      const name = namenA[ende] || `Ende ${ende}`;
      if (gesehenA.has(name)) return;
      gesehenA.add(name);
      const zug = nw.N >= 0;
      /*
       * >>> DIE KACHEL SAGT, WORAUF IHR η STEHT. <<<
       *
       * Weisung vom 10. September: «nimm variante 3 und die charakteristische
       * kraft.» Der Anker vergleicht seither eine CHARAKTERISTISCHE Kraft mit
       * der zulässigen des Bemessungsdiagramms - beides ohne
       * Teilsicherheitsbeiwerte -, während Gurt, Blech und Mast daneben auf
       * Bemessungswerten stehen.
       *
       * Das stand nur im aufklappbaren Gültigkeitshinweis. Gefunden am
       * 11. September in einem Bedienlauf: die Masttabelle zeigte am
       * Ankerpunkt 17.39 kN, die Kachel daneben 16.8 - und der Unterschied
       * sah aus wie ein Fehler, bis der Hinweis ihn aufklärte. Genau beim
       * VERGLEICHEN zweier Zahlen braucht man die Auskunft, und genau dort
       * war sie eingeklappt.
       */
      /*
       * Traegt das Seil massgebend, haengt aber in anderen Lastfaellen
       * durch, sagt die Kachel auch das - dort steht der Mast allein.
       */
      const schlaffAuch = !nw.schlaff && e.schlaffIn?.length
        ? ` · hängt durch in ${e.schlaffIn.length} Lastfall/-fällen` : '';
      const wie = `${nw.typ} · ${zug ? 'Zug' : 'Druck'} `
        + `${Math.abs(nw.N).toFixed(1)} kN char.${schlaffAuch}`;
      /*
       * OHNE URTEIL KEINE AMPEL. Ueber der groessten lieferbaren Laenge
       * gibt es die Stuetze nicht - dort steht ein Strich, keine Zahl.
       */
      /*
       * DAS SCHLAFFE SEIL: ein Hinweis, keine Ampel (Entscheid vom
       * 16. September). Der Mast traegt diese Kombination allein; ob er es
       * kann, sagt seine eigene Kachel.
       */
      if (nw.grund === 'schlaff') {
        const ohne = Number.isFinite(nw.NohneAusfall)
          ? ` (müsste ${Math.abs(nw.NohneAusfall).toFixed(1)} kN drücken)` : '';
        anker.push(kachel(`η Anker ${name}`, '–',
          `${nw.typ} · hängt durch${ohne} · Mast trägt allein`, '',
          { titel: nw.text, ...(fz(e.lastfall, e.bez)
              ? { fall: fz(e.lastfall, e.bez).kurz } : {}) }));
        return;
      }
      if (nw.eta === null || !Number.isFinite(nw.eta)) {
        anker.push(kachel(`η Anker ${name}`, '–', `${wie} · über dem Sortiment`, 'nok',
          fz(e.lastfall, e.bez) ? { fall: fz(e.lastfall, e.bez).kurz } : null));
        return;
      }
      /*
       * >>> EIN NACHWEIS AN EINEM BAUTEIL, DAS ES NICHT GIBT. <<<
       *
       * Weisung vom 11. September: «wenn die maximallänge überschritten ist,
       * dann warnung angeben.» Auf Zug wird der Nachweis gefuehrt - gegen die
       * Befestigung ist nichts einzuwenden -, aber die Kachel darf dann
       * nicht grün danebenstehen: das Sortiment führt diese Länge nicht.
       */
      if (nw.lieferbar === false) {
        anker.push(kachel(`η Anker ${name}`, f3(nw.eta),
          `${wie} · ÜBER DEM SORTIMENT`, 'nok',
          { titel: nw.warnung ?? '', ...(fz(e.lastfall, e.bez)
              ? { fall: fz(e.lastfall, e.bez).kurz } : {}) }));
        return;
      }
      const fA = fz(e.lastfall, e.bez);
      /*
       * >>> AUF ZUG ÜBERSCHRITTEN: WAS REICHT (7. Oktober). <<< «Doppelanker
       * Zug als Funktion aufnehmen» - die Kachel nennt die nächste Stufe des
       * Sortiments (Ankerstange → Zugstütze → Doppelanker), oder dass keine
       * reicht.
       */
      let reicht = '';
      if (zug && nw.eta > 1) {
        let r = null;
        try { r = ankerReichtZug(nw.N, e.kraft?.befestigung ?? e.befestigung ?? 'ankerplatte', e.kraft?.typ ?? e.typ ?? null); } catch { r = null; }
        reicht = r ? ` · reicht: ${r.typ.name} (${f0(r.zul)} kN)` : ' · kein Anker des Sortiments reicht';
      }
      anker.push(kachel(`η Anker ${name}`, f3(nw.eta), wie + reicht, ampelU(nw.eta), {
        ...(fA ? { fall: fA.kurz } : {}),
        titel: `${fA ? `Massgebende Kombination: ${fA.voll}

` : ''}`
             + `Charakteristische Kraft gegen die zulässige des `
             + `Bemessungsdiagramms — beides OHNE Teilsicherheitsbeiwerte. `
             + `Dieses η ist deshalb nicht mit dem des Gurts oder des Masten `
             + `vergleichbar, die auf Bemessungswerten stehen.`,
      }));
      /*
       * >>> UND DAS KNICKEN DANEBEN, ALS AUSKUNFT. <<<
       *
       * Weisung vom 11. September: ein Knicknachweis, «falls einfach
       * umsetzbar.» Einfach ist die Ebene SENKRECHT zur Spreizung; die
       * andere steckt im Bemessungsdiagramm (siehe `ankerKnicken`).
       *
       * Die Kachel steht bewusst OHNE Ampel: sie ist kein zweites Urteil.
       * Ihre Zahl ist ein Bemessungswert und das η daneben einer aus
       * zulässigen Kräften - nebeneinander grün und grün zu färben hiesse,
       * sie seien dasselbe.
       */
      /*
       * >>> UND SIE STEHT NUR DA, WENN KNICKEN GEFUEHRT WIRD. <<<
       *
       * Weisung vom 16. September: «die kachel knicken mast ausblenden wenn
       * der nachweis in den optionen nicht aktiv geschalten ist.»
       *
       * Wer das Knicken abschaltet, tut es mit Grund - die Leiter halten den
       * Masten (siehe Nachweisgruppe `knickenMast`). Eine Knickzahl, die
       * daneben stehenbliebe, wäre dann eine Auskunft über eine Rechnung,
       * die man ausdrücklich nicht führt.
       *
       * DIE KACHEL HEISST JETZT NACH DEM BAUTEIL, nicht nach dem Masten:
       * sie gehört der STÜTZE an diesem Masten. «Knicken M2» las sich wie
       * eine Angabe über M2 selbst.
       */
      if (e.knick && urteil.nachweise?.knickenMast !== false) {
        // `kn`, nicht die Kachelliste daneben: bis zum 18. September hiess
        // diese Hilfsgroesse wie die Liste, und jede Druckstuetze unter
        // Druck brach die Seitenleiste mit «k.push is not a function» ab.
        const kn = e.knick;
        anker.push(kachel(`Knicken Stütze ${name}`, `${f0(kn.NbRd)} kN`,
          `N_b,Rd · λ̄ ${f2(kn.lambda)} · χ ${f3(kn.chi)}`, '', {
            titel: `Euler und Knicklinie c SENKRECHT zur Spreizebene — dort `
                 + `ist der Querschnitt konstant (I = ${f0(kn.I)} cm⁴, ohne `
                 + `Steiner-Anteil) und der Stab einteilig. `
                 + `N_cr ${kn.Ncr.toFixed(0)} kN. `
                 + `KONTROLLRECHNUNG, kein zweiter Nachweis: ${kn.nichtEnthalten}`,
          }));
      }
    });
  }
  /* =========================================================================
   * >>> DAS FUNDAMENT (Weisung vom 24. September). <<<
   * =======================================================================
   *
   * «die Fundamente auch noch separat als ausnutzungsbeiwert in die
   * nachweisführung aufnehmen (gesamtheitliche Tragwerksbetrachtung).»
   *
   * Es steht NEBEN dem Anker und nicht beim Masten: es ist ein eigenes
   * Bauteil mit einem eigenen Nachweis, und sein η bezieht sich - wie
   * beim Anker - auf eine ZULÄSSIGE Last, nicht auf einen
   * Bemessungswiderstand. Der Titel sagt es, damit niemand die Zahl
   * neben der des Gurts liest, als wäre es dieselbe Art von η.
   *
   * Die Kachel nennt den MASSGEBENDEN der acht Einzelnachweise; alle
   * acht stehen im Titel, damit man sieht, welcher knapp ist.
   */
  if (erg.fundament && urteil.nachweise?.fundament !== false) {
    const namenF = erg.modell?.federn?.namen ?? {};
    const gesehenF = new Set();
    ['A', 'B'].forEach((ende) => {
      const q = erg.fundament[ende];
      if (!q) return;
      const name = namenF[ende] || `Ende ${ende}`;
      if (gesehenF.has(name)) return;
      gesehenF.add(name);
      /*
       * KEIN STANDARDFUNDAMENT ist eine Auskunft, kein Nachweis. Es
       * steht ein Strich da und daneben, warum - ein Sonderfundament
       * rechnet dieses Werkzeug nicht.
       */
      if (q.fehlt) {
        fundament.push(kachel(`Fundament ${name}`, '–',
          `${q.profil ?? 'Profil'} · kein Standardtyp`, '', {
            titel: 'Das Sortiment führt für dieses Profil kein '
                 + 'Standardfundament. In der Mastkachel lässt sich einer '
                 + 'wählen; sonst braucht es ein Sonderfundament, und das '
                 + 'rechnet dieses Werkzeug nicht.',
          }));
        return;
      }
      if (!q.nachweise?.length) return;
      const alle = q.nachweise
        .map((x) => `${x.was}: ${x.wert.toFixed(2)} von ${x.zul} ${x.einheit}`
                  + ` (η ${f3(x.eta)}) — ${x.bez}`)
        .join('\n');
      const hebt = q.abheben
        ? `\n\nABHEBEN: ${q.abheben.wert.toFixed(1)} kN in «${q.abheben.bez}». `
          + 'Die Tabelle gilt für V zwischen 0 und 150 kN — ein abhebendes '
          + 'Fundament ist darin nicht abgedeckt.' : '';
      const fF = fz(q.massgebend.fall ?? q.massgebend.lastfall, q.massgebend.bez);
      /*
       * >>> DER ABLAUF IM TITEL (7. Oktober). <<< Je Richtung das Ergebnis
       * und die Schritte - «zulässig mit abgeminderten Werten» heisst: eine
       * Basisgrösse ist überschritten und ausgeglichen.
       */
      const abl = Object.values(q.ablauf ?? {}).map((r) => `${r.richtung}: `
        + `${r.ergebnis === 'basis' ? 'alle Basiswerte eingehalten'
          : r.ergebnis === 'angepasst' ? `zulässig mit abgeminderten Werten (Schritt ${r.schritt})`
          : `nicht zulässig, grösseres Fundament (Schritt ${r.schritt})`}\n   `
        + r.schritte.map((s) => `${s.nr} ${s.text}${s.wert != null ? ` ${s.wert.toFixed(2)}` : ''}`).join(' → '))
        .join('\n');
      fundament.push(kachel(`η Fundament ${name}`, f3(q.eta),
        `${q.typ.typ}${q.gewaehlt ? '' : ' · nach Masttyp'}${q.gelaende && q.gelaende !== 'bis14'
          ? ` · ${gelaendeVon(q.gelaende).kurz}` : ''}${q.stufe === 'angepasst' ? ' · abgemindert' : ''}`
          + ` · ${q.massgebend.kurz ?? q.massgebend.key}`,
        ampelU(q.eta), {
          ...(fF ? { fall: fF.kurz } : {}),
          titel: `${fF ? `Massgebende Kombination: ${fF.voll}

` : ''}`
               + `Charakteristische Einwirkung am Fundamentkopf gegen die `
               + `zulässige Last — beides OHNE Teilsicherheitsbeiwerte, wie `
               + `beim Anker. Quer und längs zum Gleis werden EINZELN `
               + `nachgewiesen, nicht überlagert. Gelände ${gelaendeVon(q.gelaende).text}.`
               + `${abl ? `\n\nAblauf der Fundamentbestimmung:\n${abl}` : ''}`
               + `\n\nBasiswerte:\n${alle}${hebt}`,
        }));
    });
  }
  return { mast, anker, fundament };
}

/**
 * Dieselben Kacheln als eine Liste - fuer Aufrufer, die nicht gruppieren.
 */
export function bauteilKacheln(erg, urteil, ampelU) {
  const g = bauteilKachelnJe(erg, urteil, ampelU);
  return [...g.mast, ...g.anker, ...g.fundament];
}

/**
 * Die Nachweiskarte als geordnete Gruppen.
 *
 * >>> EINE GRUPPE OHNE KACHELN STEHT NICHT DA. <<<
 * Eine leere Ueberschrift «Fundament» waere zweideutig: «nicht gerechnet»
 * und «nichts gefunden» saehen gleich aus, und das erste ist ein Mangel.
 * Was NICHT gefuehrt wird, sagt `nichtGefuehrtHtml` darunter - an einer
 * Stelle und mit Grund.
 *
 * >>> UND BEI EINER EINZIGEN GRUPPE FAELLT DIE UEBERSCHRIFT WEG. <<<
 * Ueber «Nachweise» steht schon eine; eine zweite daruntergesetzte, die
 * nichts unterscheidet, ist nur eine Zeile mehr zwischen Urteil und Zahl.
 *
 * @param {{titel:string, kacheln:string[]}[]} gruppen
 */
export function nachweisGruppenHtml(gruppen) {
  const voll = (gruppen ?? []).filter((g) => g?.kacheln?.length);
  if (!voll.length) return '';
  if (voll.length === 1) {
    return `<div class="kennzahlen">${voll[0].kacheln.join('')}</div>`;
  }
  return voll.map((g) => `<div class="sec-klein">${esc(g.titel)}${
    g.rechts ? `<span class="sec-r">${esc(g.rechts)}</span>` : ''}</div>
    <div class="kennzahlen">${g.kacheln.join('')}</div>`).join('');
}

export function zeichneUebersicht(node, erg, urteil, beiSprung, aktiveStation,
                                  hinweise = [], opt = {}) {
  /*
   * WAS DIE KACHELN ZEIGEN, und was das Urteil trägt: zwei Dinge, seit dem
   * 16. September auseinandergehalten. `zeig` ist die Anzeige, `bem` die
   * Bemessung - beim Regelfall dasselbe Objekt.
   */
  const einzelLastfall = opt.quelle && opt.quelle !== 'umhuellend';
  // Mit gültigem Stabwerk trägt es auch das Urteil des Tragauslegers.
  urteil = urteilMitStabwerk(urteil, stabwerkFuehrt(opt, einzelLastfall));
  const bem = (einzelLastfall && opt.bemessung) ? opt.bemessung : erg;
  const zeig = erg;
  /* =======================================================================
   * >>> WELCHE NACHWEISE DIE LEISTE ZEIGT (Weisung vom 24. September). <<<
   * =====================================================================
   *
   * «Tragsicherheit Gebrauchstagulichkeit oder beide.» Vorgabe ist
   * BEIDE; wer nichts wählt, sieht alles.
   *
   * Was der Filter WEGNIMMT, ist genau das, was ein η der Tragsicherheit
   * zeigt - Kacheln, nicht gefuehrte Nachweise, die Tabelle der
   * höchstbeanspruchten Stellen. Was nachweisunabhängig ist
   * (Schnittgrössen, Hinweise zur Gültigkeit), bleibt stehen: es gehört
   * keiner der beiden Arten.
   *
   * DIE HAUPTKACHEL BLEIBT, WIE SIE IST. Sie ist das Urteil des
   * Tragwerks, nicht eine Anzeige - und ein Anzeigefilter ändert kein
   * Urteil. Der Entscheid vom 18. September gilt weiter: die
   * Urteilsfarbe folgt allein der Tragsicherheit.
   * ===================================================================== */
  const nwArt = opt.nachweisart ?? 'beide';
  const zeigtTrag = nwArt !== 'gzg';
  const zeigtGzg = nwArt !== 'trag';
  const m = zeig.modell, x = zeig.extrem;
  const e = zeig.max.etaGesamt;
  /*
   * DAS GROESSERE VON BEIDEM STEHT IN DER HAUPTKACHEL, wenn ein Lastfall
   * gezeigt wird - sonst läse man die kleinere Zahl als Ergebnis.
   */
  const eBem = bem?.max?.etaGesamt ?? e;
  /* =======================================================================
   * >>> OHNE URTEIL KEINE FARBE. <<<
   * =======================================================================
   *
   * Weisung vom 16. September: «bei der kachel, wenn kein
   * tragsicherheitsurteil, dann ohne farbe, das gleiche gilt auch für die
   * einzelnen bauteil kacheln.»
   *
   * Sie hat recht, und sie geht weiter als mein erster Anlauf: ich hatte die
   * Hauptkachel beim Einzellastfall GELB gemacht - auch das ist eine
   * Aussage, und zwar «Vorsicht, aber gerechnet». Gemeint ist etwas anderes:
   * hier wird NICHT geurteilt. Eine Farbe, die kein Urteil trägt, gibt es
   * nicht; also keine.
   *
   * `ampelU` steht deshalb überall dort, wo bisher `ampel` stand - sie gibt
   * dieselbe Farbe, solange die Bemessung gezeigt wird, und nichts, wenn es
   * ein einzelner Lastfall ist.
   */
  const ampelU = (v) => (einzelLastfall ? '' : ampel(v));
  /*
   * OHNE DEN TRAGWERKSNACHWEIS IST η KEIN URTEIL MEHR.
   *
   * Die Zahl steht weiterhin da - sie ist gerechnet und richtig -, aber
   * «Tragsicherheit erfüllt» darf nicht danebenstehen, wenn der Nachweis, der
   * das entscheidet, gar nicht gefuehrt wird. Dann sagt die Zeile genau das.
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
  /*
   * UND DER ANKER EBENSO (Weisung, 11. September). Sein eta steht auf
   * charakteristischen Kraeften und ist mit dem des Jochs nicht
   * vergleichbar - fuer die Frage «reicht es» zaehlt es trotzdem. Ueber
   * dem Sortiment gibt es kein eta; dort ist das Bauteil erst recht nicht
   * belegt, und der Durchlauf ist dieselbe Auskunft wert.
   */
  const ankerUeber = ['A', 'B'].some((ende) => {
    const nw = erg.anker?.[ende]?.nachweis;
    if (!nw) return false;
    return nw.lieferbar === false
      || (Number.isFinite(nw.eta) && nw.eta > 1);
  });
  /*
   * >>> DAS ABFANGJOCH HAT SEINE EIGENEN NACHWEISE. <<<
   *
   * Weisung vom 4. September: «nachweise beim Abfangjoch aktualisieren.»
   *
   * Bis dahin standen hier «η Obergurt», «η Untergurt» und «η Bindeblech» -
   * gerechnet am Vierendeeltraeger des TRAGJOCHS mit vier Winkelgurten,
   * waehrend links ein Abfangjoch gewaehlt war. Die Zahlen gehoerten nicht
   * zu diesem Tragwerk, und sie sahen doch aus wie seine.
   *
   * `erg.abfang` traegt jetzt die Auswertung des Abfangjochs
   * (`abfangAuswertung` in core.abfangjoch.js): zwei Gurte, ein Kraeftepaar
   * aus dem Moment in der waagrechten Rahmenebene, die Bindebleche als
   * Riegel. Der ZAHLENWERT oben - η gesamt - folgt ihr ebenso; sonst stuende
   * eine Ueberschrift ueber Kacheln, die etwas anderes sagen.
   */
  const ab = erg.abfang ?? null;
  /*
   * DER TRAGAUSLEGER HAT SEINEN KRAGARM-KERN (28. September, Etappe 3b):
   * lotrecht, UPE und Aufhaengung. Ohne gueltiges Stabwerk stehen SEINE
   * Zahlen da, nicht die des Phantomjochs.
   */
  const taK = !ab && erg.ausleger?.gurt ? erg.ausleger : null;
  const eAn = ab ? ab.max.eta : (taK ? taK.max.eta : e);
  /*
   * >>> WELCHER FALL DAHINTERSTEHT. <<<
   *
   * Weisung vom 9. September: die Regliertemperatur haengt an der
   * Kombination. Damit ist «η 0.72» nicht mehr die ganze Auskunft - ob
   * Wind, Schnee oder ein Bruch massgebend war, gehoert daneben.
   */
  const abFall = ab?.faelle?.find((f) => f.key === ab.fall) ?? null;
  /*
   * >>> DIE KOPFZAHL IST DAS MAXIMUM UEBER ALLE BAUTEILE (Entscheid vom
   * 17. September: «Maximum, mit Bauteil»). <<<
   *
   * Bis dahin stand hier ausdruecklich die Zahl des Jochs und der Mast nur
   * in Farbe und Zeile. Jetzt traegt die Zahl das Urteil, und daneben steht,
   * welches Bauteil sie liefert. Beim Einzellastfall bleibt es bei der Zahl
   * des gezeigten Falls - dort wird nicht geurteilt.
   */
  /*
   * >>> STABWERK FUEHRT, KNICKEN ERGAENZT (28. September). <<<
   *
   * Ist das Stabwerk gewählt und gültig, wird das Urteil aus ihm neu
   * zusammengesetzt (`bauteileMitStabwerk`): Joch und Mast aus dem
   * Stabwerk, das Knicken als eigene Zeile aus dem Kern, Anker und
   * Fundament aus dem Kern. Eine Maske, ein Satz Zahlen.
   */
  const swH = stabwerkFuehrt(opt, einzelLastfall);
  const vorlaeufig = stabwerkVorlaeufig(opt, einzelLastfall);
  const jochKey = (swH?.tragwerke ?? 1) > 1 && opt.twId
    ? `tragwerk:${opt.twId}` : 'tragwerk';
  // Im Einzellastfall nur mit dem Stabwerk (die Zahlen des Falls, 4. Oktober).
  const bt = swH ? bauteileMitStabwerk(urteil.bauteile, swH,
                                       { jochKey, knick: knickJe(erg) })
    : (einzelLastfall ? null : urteil.bauteile);
  const imFall = einzelLastfall && swH ? etaImFall(bt) : null;
  const eKopf = imFall ? imFall.eta : bt ? bt.eta : eAn;
  const werKopf = imFall ? imFall.name
    : (bt?.massgebend && bt.liste.length > 1 ? bt.massgebend.name : null);
  const zustand = !gefuehrt ? 'warn'
    // Mit dem Stabwerk zählt allein das zusammengesetzte Urteil - die
    // Kernzahlen von Joch und Mast färben dann nicht mehr mit.
    : swH ? (bt?.ueber || urteil.bindendVerletzt === true ? 'nok' : 'ok')
    /*
     * DER MAST ZAEHLT AUCH AM ABFANGJOCH INS URTEIL. Hier stand `!ab &&` -
     * richtig, solange sein Nachweis aus dem Tragjoch-Ersatzbalken kam.
     * Seit er auf den eigenen Auflagerkraeften steht, ist ein
     * ueberschrittener Mast ein ueberschrittener Mast.
     */
    : (eAn > 1 || mastUeber || bt?.ueber || urteil.bindendVerletzt === true
       ? 'nok' : 'ok');

  // Jede Kachel kennt die Stelle, an der ihr Wert auftritt - ein Klick fährt
  // das Modell dorthin.
  const bei = (k) => ({ x: k.x, station: k.i });
  /*
   * ZWEI GURTE, NICHT VIER - und sie heissen nicht Ober- und Untergurt.
   * Beim Abfangjoch liegen sie NEBENEINANDER; der Nachweis ist fuer beide
   * derselbe, weil das Kraeftepaar sie gleich stark trifft. Dazu die
   * Bindebleche und, ab A240, die Quersteifen.
   */
  /*
   * >>> UND JEDE KACHEL NENNT IHRE KOMBINATION (25. September). <<<
   *
   * Weisung: «was man noch aufführen müsste bei den nachweissen, ist die
   * massgebende kombination.» Bei der Hüllkurve kann sie je Bauteil eine
   * ANDERE sein - der Obergurt unter Wind quer, das Blech unter Wind
   * längs. Genau deshalb steht sie an der Kachel und nicht nur oben.
   *
   * Das Abfangjoch hat EINEN massgebenden Fall für seine Auswertung
   * (`ab.fall`); «N Gurt» ist eine Schnittgrösse und bekommt ihn ebenso,
   * denn auch sie stammt aus einem Lastbild.
   */
  const fzJ = (key, bez) => fallZeile(erg, opt, key, bez);
  const mitFall = (ziel, f) => (f ? { ...(ziel ?? {}), fall: f.kurz } : ziel);
  const fAb = ab ? fzJ(ab.fall, abFall?.bez) : null;
  /*
   * >>> DAS ABFANGJOCH AUS DEM STABWERK (29. September). <<<
   * «abfangjoch im stabwerk anschliessen»: gilt das Stabwerk, stehen Gurt
   * (mit Gabel) und Bindebleche aus ihm - wie beim Tragausleger. «N Gurt»
   * ist eine Grösse des Ersatzbalkens (Kräftepaar) und entfällt dann.
   */
  const swTeil = (teil, titel, sub) => {
    const s = swH?.teile?.[`${jochKey}|${teil}`];
    if (!s) return kachel(titel, '–', `${sub} · Stabwerk`, '');
    return kachel(titel, f3(s.eta), `${sub} · Stabwerk`, ampelU(s.eta), {
      ...(s.bez ? { fall: fallKurz(s.bez) } : {}),
      ...(s.wo ? { stab: s.wo } : {}),
      titel: `${s.bez ? `Massgebende Kombination: ${s.bez}

` : ''}Aus dem Stabwerk, Stab ${s.wo}.`,
    });
  };
  const kz = ab && swH?.teile?.[`${jochKey}|UPE`] ? [
    swTeil('UPE', 'η Gurt', `${ab.q.gurt.name} · mit Gabel`),
    swTeil('blech', 'η Bindeblech', 'massgebendes Blech'),
  ] : ab ? [
    kachel('η Gurt', f3(ab.gurt?.eta ?? 0), ab.q.gurt.name,
           ampelU(ab.gurt?.eta ?? 0), mitFall({ x: ab.gurt?.x ?? 0 }, fAb)),
    kachel('η Bindeblech', f3(ab.blech?.eta ?? 0),
           ab.blech ? `Station ${(ab.blech.x ?? 0).toFixed(2)} m` : 'kein Blech',
           ampelU(ab.blech?.eta ?? 0), mitFall({ x: ab.blech?.x ?? 0 }, fAb)),
    kachel('N Gurt', `${(ab.gurt?.N ?? 0).toFixed(0)} kN`,
           `Kräftepaar · e = ${(ab.q.e).toFixed(1)} cm`, 'ok',
           mitFall({ x: ab.gurt?.x ?? 0 }, fAb)),
  ] : (swH?.ausleger && swH.teile?.[`${jochKey}|UPE`]) ? (() => {
    /*
     * >>> DER TRAGAUSLEGER AUS DEM STABWERK (28. September, Etappe 4c). <<<
     * Zwei UPE, die Bindebleche und die Aufhängung gegen V_zul - statt der
     * drei Kacheln des Phantomjochs, das der Kern rechnet.
     */
    const k = (teil, titel, sub) => {
      const s = swH.teile[`${jochKey}|${teil}`];
      if (!s) return kachel(titel, '–', `${sub} · Stabwerk`, '');
      return kachel(titel, f3(s.eta), `${sub} · Stabwerk`, ampelU(s.eta), {
        ...(s.bez ? { fall: fallKurz(s.bez) } : {}),
        ...(s.wo ? { stab: s.wo } : {}),
        titel: `${s.bez ? `Massgebende Kombination: ${s.bez}

` : ''}Aus dem Stabwerk, Stab ${s.wo}.`,
      });
    };
    const a = swH.ausleger.aufhaengung;
    const aufh = a ? kachel('η Aufhängung', f3(a.eta),
      `S_v ${f2(a.Sv)} / ${f2(swH.ausleger.Vzul)} kN · char.${a.druck ? ' · AUSLEGER HEBT AB'
        : a.schlaff ? ' · ein Seil fällt aus' : ''}`,
      ampelU(a.druck ? 2 : a.eta), {
        ...(a.bez ? { fall: fallKurz(a.bez) } : {}),
        titel: `Senkrechter Anteil der Seilkraft (${a.seile > 1 ? `${a.seile} Seile, `
          + `das stärkere ${f2(a.N)} kN Zug` : `${f2(a.N)} kN Zug`}) gegen den `
             + `Kontrollwert der Zeichnung V_zul = ${f2(swH.ausleger.Vzul)} kN, `
             + 'charakteristisch, nur wirkliche Zustände (ganzes G, G + Wind, '
             + 'Havarie). Darüber verlangt die Zeichnung eine separate statische '
             + 'Berechnung.'
             // Seit dem 3. Oktober («seildruck nicht zulassen in der app»)
             // fällt ein Seil aus, statt zu drücken; Befund nur, wenn alle
             // ausfallen.
             + (a.druck ? `

AUSLEGER HEBT AB: in «${a.druck.bez}» müssten alle Seile drücken `
               + `(${f2(a.druck.N)} kN) - ein Seil trägt keinen Druck.` : '')
             + (!a.druck && a.schlaff ? `

Ein Seil fällt aus: in «${a.schlaff.bez}» müsste es ${f2(Math.abs(a.schlaff.N))} kN `
               + 'drücken und hängt deshalb durch; das andere trägt allein. '
               + 'Alle Nachweise rechnen mit diesem Zustand.' : ''),
      }) : kachel('η Aufhängung', '–', 'nicht gerechnet', '');
    /*
     * DER LÄNGSANKER (Regelfall seit 28. September) - als AUSKUNFT, ohne
     * Ampel: das Sortiment führt für ihn keinen Widerstand. Genannt wird
     * die Kraft im gezogenen Seil und welches es ist.
     */
    const la = swH.ausleger.laengsanker;
    const lak = la?.charakteristisch
      ? kachel('Längsanker', `${f2(Math.abs(la.charakteristisch.F))} kN`,
          `Seil ${la.charakteristisch.seite} · char. · x ${f2(swH.ausleger.laengsankerX ?? 0)} m`, '', {
            ...(la.charakteristisch.bez ? { fall: fallKurz(la.charakteristisch.bez) } : {}),
            titel: 'Zwei Seile in Gleisrichtung, nur Zug, ohne Vorspannung - '
                 + 'die Kraft steht im Seil, zu dem hin gezogen wird. '
                 + `Bemessungswert ${f2(Math.abs(la.bemessung?.F ?? 0))} kN `
                 + `(${la.bemessung?.bez ?? '-'}). Auskunft, kein Nachweis: das `
                 + 'Sortiment führt für den Anker keinen Widerstand.',
          })
      : kachel('Längsanker', 'aus', 'abgeschaltet - die Torsion geht in den Masten', '');
    return [k('UPE', 'η Gurt', 'UPE'), k('blech', 'η Bindeblech', 'massgebendes Blech'), aufh, lak];
  })() : taK ? (() => {
    /*
     * >>> DER TRAGAUSLEGER AUS DEM KRAGARM-KERN (28. September, 3b). <<<
     * Entscheid «Lotrecht»: UPE (Biegung + Druck aus dem Seil) und die
     * Aufhaengung. Bindeblech und Laengsanker rechnet nur das Stabwerk -
     * die Kacheln stehen trotzdem da und sagen es, damit die Gruppe gleich
     * aussieht wie mit dem Stabwerk und nichts still fehlt.
     */
    const g = taK.gurt;
    const fG = fzJ(g.fall, g.bez);
    const a = taK.aufhaengung;
    const nurSw = (t) => kachel(t, '–', 'nur im Stabwerk', '', {
      titel: 'Der Kragarm-Kern rechnet nur die lotrechte Ebene (Entscheid '
           + '«Lotrecht», 28. September); diese Grösse steht erst mit dem '
           + 'Stabwerk da.' });
    return [
      kachel('η Gurt', f3(g.eta), `${taK.profil} · lotrecht`, ampelU(g.eta),
        mitFall({ titel: `Je UPE: N/2 und M_y/2 - σ = ${f2(g.sigma * 10)} N/mm², `
          + `bei x = ${f2(g.x)} m (M ${f2(g.M)} kNm, N ${f2(g.N)} kN). Ohne `
          + 'Torsion und ohne die waagrechte Ebene.' }, fG)),
      nurSw('η Bindeblech'),
      a ? kachel('η Aufhängung', f3(a.eta),
        `S_v ${f2(a.Sv)} / ${f2(a.Vzul)} kN · char.${a.druck ? ' · SEIL GEDRÜCKT' : ''}`,
        ampelU(a.druck ? 2 : a.eta), {
          ...(a.bez ? { fall: fallKurz(a.bez) } : {}),
          titel: 'Senkrechter Anteil der Seilkraft aus dem Kragarm-Kern '
               + '(Momente um das Gelenk am Masten, Kontrollformel der '
               + `Zeichnung) gegen V_zul = ${f2(a.Vzul)} kN, charakteristisch, `
               + 'nur wirkliche Zustände.' })
        : kachel('η Aufhängung', '–', 'nicht gerechnet', ''),
      nurSw('Längsanker'),
    ];
  })() : erg.ausleger?.fehler ? [
    // Ausleger ohne Modell (30. September): der Grund statt der Zahlen des
    // Ersatzjochs, die dem Ausleger nicht gelten.
    kachel('Tragausleger', '–', 'nicht gerechnet', 'fail',
           { titel: erg.ausleger.fehler }),
  ] : (swH && swH.teile?.[`${jochKey}|OG`]) ? [
    /*
     * DIE JOCHKACHELN AUS DEM STABWERK: je Teil das grösste eta über alle
     * Stäbe und Kombinationen. Keine Station des Ersatzbalkens - das
     * Stabwerk nennt einen Stab; seit dem 29. September fährt ein Klick
     * im Modell zu ihm und hebt ihn hervor (`stab`).
     */
    ...[['OG', 'η Obergurt', m.profOG.name], ['UG', 'η Untergurt', m.profUG.name],
        ['blech', 'η Bindeblech', 'massgebendes Blech']].map(([k, t, sub]) => {
      const s = swH.teile[`${jochKey}|${k}`];
      if (!s) return kachel(t, '–', `${sub} · Stabwerk`, '');
      return kachel(t, f3(s.eta), `${sub} · Stabwerk`, ampelU(s.eta), {
        ...(s.bez ? { fall: fallKurz(s.bez) } : {}),
        ...(s.wo ? { stab: s.wo } : {}),
        titel: `${s.bez ? `Massgebende Kombination: ${s.bez}\n\n` : ''}`
             + `Aus dem Stabwerk, Stab ${s.wo}.`,
      });
    }),
  ] : [
    kachel('η Obergurt', f3(erg.max.etaOG.og.eta), m.profOG.name,
           ampelU(erg.max.etaOG.og.eta),
           mitFall(bei(erg.max.etaOG), fzJ(erg.max.etaOG.fall))),
    kachel('η Untergurt', f3(erg.max.etaUG.ug.eta), m.profUG.name,
           ampelU(erg.max.etaUG.ug.eta),
           mitFall(bei(erg.max.etaUG), fzJ(erg.max.etaUG.fall))),
    kachel('η Bindeblech', f3(erg.max.etaB.etaB), 'massgebende Ebene',
           ampelU(erg.max.etaB.etaB),
           mitFall(bei(erg.max.etaB), fzJ(erg.max.etaB.fall))),
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
   * Nur wenn der Nachweis auch gefuehrt wird: die Gruppe lässt sich
   * abschalten, und dann hat hier keine Zahl zu stehen.
   */
  /*
   * >>> AUCH AM ABFANGJOCH STEHT JETZT EINE MASTKACHEL. <<<
   *
   * Weisung vom 10. September: «den mastnachweis beim abfangjoch fertig
   * machen.»
   *
   * Hier stand `if (!ab && ...)`: `erg.mast` kam aus der Tragjochrechnung,
   * galt fuer dieses Tragwerk nicht, und eine Zahl aus einem fremden Modell
   * ist schlimmer als keine. Seit das Abfangjoch seine eigenen
   * Auflagerkraefte abgibt, wird der Nachweis mit IHNEN gebildet
   * (`quelle: 'abfangjoch'`), und die Kachel gehoert wieder her.
   */
  /*
   * >>> GEORDNET: JOCH, MAST, ANKER, FUNDAMENT (25. September). <<<
   *
   * Weisung: «ordne die nachweis karte joch mast fundament in der
   * sidebar»; der Anker bekam auf Rückfrage eine eigene Gruppe.
   *
   * `kz` ist die Jochgruppe - am Tragjoch die drei Winkel- und
   * Blechkacheln, am Abfangjoch seine zwei Gurte. Die übrigen drei
   * hängen am Masten und kommen aus `bauteilKachelnJe`.
   */
  // Am Tragausleger kommt das Fundament aus dem Stabwerk (28. September).
  const nwJe = bauteilKachelnJe(swH?.ausleger
    ? { ...erg, fundament: swH.ausleger.fundament } : erg, urteil, ampelU, { ...opt, swH });
  /*
   * DIE QUELLE STEHT AN DER GRUPPE: «Stabwerk» oder «Ersatzbalken», und
   * «vorläufig», solange das gewählte Stabwerk noch nicht (wieder)
   * gerechnet ist.
   */
  // Seit dem 29. September auch das Abfangjoch (`!ab` ist weg).
  const jochAusSw = !!(swH && (swH.teile?.[`${jochKey}|OG`]
                               || swH.teile?.[`${jochKey}|UPE`]));
  const mastAusSw = !!(swH && Object.keys(swH.bauteile ?? {})
    .some((k) => k.startsWith('mast:')));
  // Am Tragausleger heisst der Kern, was er ist (28. September, 3b).
  const kernName = taK ? 'Kragarm-Kern' : 'Ersatzbalken';
  const quelle = (ausSw) => (ausSw ? 'Stabwerk'
    : (swH || vorlaeufig ? `${kernName}${vorlaeufig ? ' · vorläufig' : ''}` : ''));
  const nwGruppen = [
    { titel: ab ? 'Abfangjoch'
        : (swH?.ausleger || taK || erg.ausleger?.fehler ? 'Tragausleger' : 'Joch'),
      kacheln: kz, rechts: quelle(jochAusSw) },
    // «Knicken Ersatzbalken» nur, wenn das Knicken auch gefuehrt wird.
    { titel: 'Mast', kacheln: nwJe.mast,
      // Seit dem 28. September kann das Knicken am Tragjoch aus dem
      // Stabwerk kommen - die Anschrift liest es an der Zeile selbst ab.
      rechts: mastAusSw
        ? ((bt?.liste ?? []).some((x) => x.key === 'knicken' && x.quelle === 'ersatzbalken')
            ? 'Stabwerk · Knicken Ersatzbalken' : 'Stabwerk')
        : quelle(false) },
    { titel: 'Anker', kacheln: nwJe.anker,
      rechts: quelle(Object.keys(swH?.ankerJe ?? {}).length > 0) },
    { titel: 'Fundament', kacheln: nwJe.fundament,
      rechts: quelle(Boolean(swH?.ausleger?.fundament)
        || Object.keys(swH?.fundamentJe ?? {}).length > 0) },
  ];
  // Schnittgrössen sind kein Nachweis - sie stehen in einem eigenen Block.
  // h/b und f_y/γ_M0 sind Eingaben und stehen in der Fussleiste bzw. bei den
  // Profilen; als «Kennzahl» hatten sie hier nichts verloren.
  /*
   * >>> DAS ABFANGJOCH ZEIGT SEINE EIGENEN. <<<
   *
   * Weisung vom 9. September: «fange danach noch mit dem implementieren der
   * Masten beim Abfangjoch an.»
   *
   * Hier standen `x.MyMax` und die uebrigen Extremwerte des TRAGJOCH-
   * Ersatzbalkens - auch dann, wenn links ein Abfangjoch gewaehlt war. Sie
   * gehoeren zu einem anderen Tragwerk; «max M_y 13.68 kNm» am Abfangjoch
   * war eine Zahl aus dem falschen Modell.
   *
   * Das Abfangjoch hat zwei Ebenen, und in jeder ein Moment: in der
   * waagrechten RAHMENEBENE traegt der Vierendeel (daraus das Kraeftepaar),
   * QUER dazu biegt jeder Gurt fuer sich. Dazu die beiden AUFLAGERKRAEFTE -
   * das ist es, was am Masten ankommt.
   */
  const sg = ab ? (() => {
    const g = ab.gurt?.schnitt ?? {};
    const zeileAuflager = (e) => {
      const a = ab.auflager?.[e];
      if (!a) return null;
      const name = erg.modell.federn?.namen?.[e] || `Ende ${e}`;
      return kachel(`Auflager ${name}`,
        `${f2(a.Fy)} / ${f2(fzAuf(a.Fz))}`,
        `kN · F_y / F_z · ${a.fall}`, '',
        { x: e === 'A' ? (ab.ueberstand ?? 0) : ab.jt - (ab.ueberstand ?? 0) });
    };
    return [
      /*
       * DIE ACHSE STEHT DABEI (15. September, «konvention auch beim
       * abfangjoch durchziehen»). Das Abfangjoch liegt waagrecht - seine
       * Rahmenebene biegt um die LOTRECHTE Achse, beim Tragjoch ist es
       * umgekehrt. Ohne die Anschrift muss man das jedesmal neu herleiten.
       */
      kachel('M Rahmenebene · M_zz', f2(g.Mzz ?? 0),
             `kNm · x=${f2(ab.gurt?.x ?? 0)}`, '', { x: ab.gurt?.x ?? 0 }),
      kachel('V Rahmenebene · F_y', f2(g.Fy ?? 0),
             `kN · x=${f2(ab.gurt?.x ?? 0)}`, '', { x: ab.gurt?.x ?? 0 }),
      kachel('M quer (lotrecht) · M_yy', f2(g.Myy ?? 0),
             `kNm · x=${f2(ab.gurt?.x ?? 0)}`, '', { x: ab.gurt?.x ?? 0 }),
      /*
       * DAS MOMENT IM EINZELNEN GURT ist die Zahl, die in den Nachweis
       * geht: die halbe lotrechte Last plus die Torsion. «M quer» darueber
       * gilt dem ganzen Traeger - beide zu zeigen erspart die Frage, warum
       * die eine Zahl nicht in der anderen steckt.
       */
      kachel('M Gurt lotrecht', f2(ab.gurt?.MgurtVert ?? 0),
             `kNm · davon Torsion ${f2(ab.gurt?.Mxx ?? 0)}`, '',
             { x: ab.gurt?.x ?? 0 }),
      kachel('V quer (lotrecht)', f2(g.Fz ?? 0),
             `kN · x=${f2(ab.gurt?.x ?? 0)}`, '', { x: ab.gurt?.x ?? 0 }),
      zeileAuflager('A'), zeileAuflager('B'),
    ].filter(Boolean);
  })() : taK ? [
    // Der Kragarm-Kern, lotrecht - statt der Extremwerte des Phantomjochs.
    kachel('max M_y', f2(Math.abs(taK.gurt.M)), `kNm · x=${f2(taK.gurt.x)} · beide UPE`, ''),
    kachel('N', f2(taK.gurt.N), 'kN · beide UPE, Druck aus dem Seil', ''),
    ...(taK.aufhaengung ? [
      kachel('S_v', f2(taK.aufhaengung.Sv), 'kN · Seil lotrecht, char.', ''),
      kachel('S', f2(taK.aufhaengung.Nje ?? taK.aufhaengung.N),
        `kN · Seilzug${taK.aufhaengung.seile > 1 ? ' je Seil (2)' : ''}, char. · `
        + `c₁ ${f2(taK.c1)} / b ${f2(taK.b)} m`, ''),
    ] : []),
  ] : [
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

  /*
   * >>> DIE STELLEN GEHOEREN DEM TRAGWERK, DAS DASTEHT. <<<
   *
   * Gefunden am 11. September in einem Bedienlauf: bei einem Abfangjoch
   * A240 standen hier «Vertikalebene links» und «Obergurt rechts» mit
   * η bis 0.566 - Bauteile des TRAGJOCHS mit vier Winkelgurten und zwei
   * Blechebenen, waehrend die Ueberschrift darueber η 0.593 des
   * Abfangjochs zeigte. Zwei Zahlenwerke uebereinander, und das untere
   * gehoerte einem anderen Traeger.
   *
   * Das Abfangjoch hat ZWEI GURTE NEBENEINANDER und EINE Blechlage. Seine
   * Nachweisstellen stehen in `ab.reihe`, die Bleche in `ab.bleche`; das
   * massgebende Blech einer Stelle ist das naechstgelegene - dieselbe
   * Zuordnung, mit der der Verlaufsreiter seine Blechkurve zeichnet.
   */
  const stellen = ab
    ? (() => {
        const bl = ab.bleche?.bleche ?? [];
        const naechstes = (x) => bl.reduce(
          (a, b) => (a === null || Math.abs(b.x - x) < Math.abs(a.x - x)
                     ? b : a), null);
        return (ab.reihe ?? []).map((z, i) => {
          const b = naechstes(z.x);
          const eGurt = z.eta ?? 0;
          const eBlech = b?.eta ?? 0;
          return {
            i, x: z.x, eta: Math.max(eGurt, eBlech),
            teil: eGurt >= eBlech
              ? `Gurt ${ab.q?.gurt?.name ?? ''}`.trim()
              : `${b?.istSteife ? 'Quersteife' : 'Bindeblech'}`
                + ` bei ${f2(b?.x ?? 0)} m`,
            etaEcken: eGurt, etaBleche: eBlech,
          };
        }).sort((a2, b2) => b2.eta - a2.eta).slice(0, 12);
      })()
    : erg.knoten
      .map((k) => ({
        i: k.i, x: k.x, eta: k.eta,
        teil: k.etaEcken >= k.etaBleche
          ? k.massgebendeEcke.label : (k.massgebendeEbene.label ?? '–'),
        etaEcken: k.etaEcken, etaBleche: k.etaBleche,
      }))
      .sort((a, b) => b.eta - a.eta).slice(0, 12);

  /* =======================================================================
   * >>> DIE ZEILE SAGT, WORAUF SIE STEHT. <<<
   * =======================================================================
   *
   * Zeigen die Kacheln einen einzelnen Lastfall, gibt es hier KEIN
   * Tragsicherheitsurteil - die Norm verlangt die ungünstigste Kombination,
   * und die steht in der Hüllkurve. Bis zum 16. September stand «Tragsicherheit
   * erfüllt» auch dann da, und das war schlicht falsch.
   *
   * Die Zahl bleibt die des gezeigten Lastfalls; daneben steht die der
   * Bemessung, damit man sieht, wie weit die beiden auseinanderliegen.
   */
  const urteilText = einzelLastfall
    ? `Einzellastfall — kein Tragsicherheitsurteil`
    : (!gefuehrt
        ? (urteil.nichtNachgewiesen
            ? `${urteil.nichtNachgewiesen} NICHT nachgewiesen — Modell nicht gesichert, η ist kein Urteil`
            : 'Jochtragwerk NICHT gefuehrt — η ist kein Urteil')
        : (zustand === 'ok'
            ? 'Tragsicherheit erfüllt'
            : 'Tragsicherheit NICHT erfüllt'));
  // Siehe `urteilMitGebrauch`: bei «beide» das Maximum über beide Arten.
  // Solange das gewählte Stabwerk nicht gilt, ist das Urteil vorläufig.
  // Die Verformung aus dem Stabwerk, wenn es gilt (28. Sept., «Ins Stabwerk»).
  /*
   * >>> DIE GEBRAUCHSTAUGLICHKEIT HÄNGT NICHT AM GEWÄHLTEN LASTFALL (4. Oktober). <<<
   * Sie rechnet immer den Betriebswind. Im Einzellastfall stand hier der
   * Kern (ohne Fahrdraht-Kachel), bei «umhüllend» das Stabwerk - zwei
   * verschiedene Zahlen für denselben Nachweis, je nach Wahl oben.
   */
  const swG = stabwerkFuehrt(opt, false);
  const ergV = swG?.verformung ? { ...erg, verformung: swG.verformung } : erg;
  const gzgQuelle = swG?.verformung ? 'Stabwerk'
    : (swH || vorlaeufig ? `Ersatzbalken${vorlaeufig ? ' · vorläufig' : ''}` : '');
  const U = urteilMitGebrauch({ eta: eKopf, zustand, wer: werKopf,
                                text: vorlaeufig
                                  ? `${urteilText} · vorläufig (Ersatzbalken)`
                                  : urteilText },
                              ergV, nwArt, einzelLastfall);
  node.innerHTML = `
    ${quellSchalter(opt, einzelLastfall, eBem)}
    <div class="urteil ${einzelLastfall ? 'ohne' : U.zustand}">
      <span class="urteil-zahl">η ${f3(U.eta)}</span>
      ${U.wer ? `<span class="urteil-fall" title="Massgebendes Bauteil">${esc(U.wer)}</span>` : ''}
      <span>${U.text}${
        einzelLastfall ? '' : (urteil.alleOk
          ? '' : ` · ${urteil.anzahlVerletzt} Prüfung(en) verletzt`)}${
        (!einzelLastfall && offeneNw)
          ? ` · ${offeneNw} Nachweis(e) nicht gefuehrt` : ''}</span>
      ${/*
         * DER MASSGEBENDE FALL steht neben der Zahl (Weisung, 9. September:
         * die Regliertemperatur haengt an der Kombination). «η 0.72» sagt
         * nicht, ob Wind, Schnee oder ein Bruch dahintersteht - und genau
         * das entscheidet, was man am Bauwerk aendern muss.
         */''}
      ${abFall ? `<span class="urteil-fall" title="${esc(
          `${abFall.label} · Regliertemperatur nach ${abFall.tempFall}`
          + (abFall.gebrochen?.length
            ? ` · gebrochen: ${abFall.gebrochen.join(', ')}` : ''))}"
        >massgebend: ${esc(abFall.label)}${
          abFall.gebrochen?.length ? ' (Bruch)' : ''}</span>` : ''}
      ${/*
         * DER KNOPF FOLGT DER ZAHL, DIE OBEN STEHT (Weisung, 9. September:
         * «den groesseren typ pruefen der die abfangkraft traegt»). Hier
         * stand `e` - die Ausnutzung des TRAGJOCH-Ersatzbalkens. Beim
         * Abfangjoch zeigt die Ueberschrift aber `eAn`, und der Knopf fehlte
         * genau dann, wenn man ihn brauchte.
         */''}
      ${/*
         * >>> AUCH DANN, WENN DER MAST ODER DER ANKER ÜBERSCHRITTEN IST. <<<
         *
         * Weisung vom 11. September: «das feld sortiment durchrechnen sollte
         * auch dann eingeblendet werden wenn die masten oder anker /
         * druckstützen ausgenutzt sind.»
         *
         * Der Knopf hängte an `eAn` — der Ausnutzung des JOCHS. Am
         * Abfangjoch wird aber regelmässig der Mast massgebend: im
         * Bedienlauf vom 11. September stand das Joch bei 0.52 und ein Mast
         * bei 1.47, und der Knopf fehlte genau dann, wenn man ihn brauchte.
         *
         * Ein grösserer Jochtyp hilft dem Masten zwar nicht unmittelbar —
         * aber er ändert Eigengewicht, Windfläche und Auflagerkräfte, und
         * der Durchlauf zeigt, welcher Typ welche Fussgrössen bringt. Das
         * ist die Auskunft, mit der man die Wahl trifft.
         */''}
      ${(eAn > 1 || mastUeber || ankerUeber) && beiSortiment
        ? `<button class="btn btn-mini" data-sortiment
         type="button" title="Alle Typen des Sortiments mit dieser Geometrie und
diesen Lasten durchrechnen. Der Typ wird dabei NICHT gewechselt."
         >Sortiment durchrechnen</button>` : ''}
    </div>
    ${/*
       * >>> DIE NACHWEISE ZUERST. <<<
       *
       * Weisung vom 11. September: «die konstruktionsprüfungen und hinweise
       * zur gültigkeit nach unten nehmen, für mich sind diese nicht so
       * relevant.»
       *
       * Sie standen zwischen dem Urteil und den Nachweiskacheln - zwei
       * zugeklappte Blöcke, die man bei jedem Blick auf η überspringen
       * musste. Wegfallen dürfen sie nicht (ein stillschweigend fehlender
       * Nachweis ist die gefährlichste Zeile der Anwendung), aber sie
       * gehören dorthin, wo man sie sucht: ans Ende.
       *
       * «Nicht gefuehrte Nachweise» bleibt oben bei den Nachweisen. Es ist
       * keine Prüfung, sondern die Kehrseite der Kacheln daneben.
       */''}
    ${nachweisartLeiste(nwArt)}
    ${stabwerkLeiste(opt)}
    ${zeigtTrag ? `${abschnitt('Nachweise')}
    ${nachweisGruppenHtml(nwGruppen)}
    ${plastischHtml(opt, Boolean(erg.mast))}
    ${nichtGefuehrtHtml(urteil)}` : ''}
    ${zeigtGzg ? gzgBlockHtml(ergV, gzgQuelle, opt.gzg ?? null) : ''}
    ${zeigtTrag ? buegelBlockHtml(opt, urteil) : ''}
    ${zeigtTrag ? bestandBlockHtml(swG) : ''}
    ${/* Ausleger ohne Modell (30. September): keine Schnittgrössen und
         keine Stellen des Ersatzjochs. */''}
    ${erg.ausleger?.fehler ? '' : klapp('uebersicht-schnittgroessen', 'Schnittgrössen',
            `<div class="kennzahlen">${sg.join('')}</div>`,
            ab ? `M Rahmen ${f2(ab.gurt?.schnitt?.Mzz ?? 0)} kNm`
               : taK ? `max M_y ${f2(Math.abs(taK.gurt.M))} kNm`
               : `max M_y ${f2(x.MyMax)} kNm`)}
    ${/*
       * Am Tragausleger stuenden hier die Stationen des Phantomjochs - mit
       * oder ohne Stabwerk. Die Stabliste des Stabwerks steht im Reiter
       * «Schnitt».
       */''}
    ${/*
       * >>> AUS DEM STABWERK, WENN ES GILT (6. Oktober). <<< «Die Auswertung
       * H unter Höchstbeanspruchte Stellen checken, ist noch aus dem
       * Balkenmodell und nicht stabtragwerk.» Mit gültigem Stabwerk stehen hier
       * die zehn höchstbeanspruchten Stäbe des Jochs (Gurte, Bleche) mit Lage,
       * Teil und Fall; ein Klick zeigt den Stab im Modell. Ohne Stabwerk
       * bleiben die Stationen des Ersatzbalkens.
       */''}
    ${zeigtTrag && swH?.jeStab && !taK && !swH?.ausleger ? (() => {
      const teilName = { OG: 'Obergurt', UG: 'Untergurt', blech: 'Bindeblech', UPE: 'Gurt UPE', gurt: 'Gurt' };
      const top = Object.values(swH.jeStab)
        .filter((z) => ['gurt', 'blech', 'gurtU'].includes(z.rolle) && stabZuordnung(z.name).key === jochKey)
        .sort((a, b) => b.eta - a.eta).slice(0, 10);
      if (!top.length) return '';
      const xm = (z) => (Number.isFinite(z.x0) && Number.isFinite(z.x1) ? (z.x0 + z.x1) / 2 : null);
      return `${abschnitt('Höchstbeanspruchte Stellen', 'aus dem Stabwerk · anklicken zeigt den Stab')}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>#</th><th>Stab</th><th class="num">x [m]</th><th>Teil</th><th>massgebend</th>
        <th class="num">η</th></tr></thead>
      <tbody>${top.map((z, k) => `
        <tr class="klick" data-kz-stab="${esc(z.name)}" title="${esc(z.bez ?? '')}">
          <td>${k + 1}</td><td>${esc(z.name)}</td><td class="num">${xm(z) === null ? '–' : f2(xm(z))}</td>
          <td>${esc(teilName[z.teil] ?? z.teil ?? '')}</td><td>${esc(fallKurz(z.bez ?? z.fall ?? ''))}</td>
          <td class="num stark ${ampelU(z.eta)}">${f3(z.eta)}</td>
        </tr>`).join('')}</tbody>
    </table></div>`;
    })() : ''}
    ${zeigtTrag && !swH?.jeStab && !taK && !swH?.ausleger && !erg.ausleger?.fehler ? `${abschnitt('Höchstbeanspruchte Stellen', 'anklicken zum Heranzoomen')}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>#</th><th class="num">x [m]</th><th>massgebend</th>
        <th class="num">${ab ? 'η Gurt' : 'η Profil'}</th>
        <th class="num">η Blech</th><th class="num">η</th></tr></thead>
      <tbody>${stellen.map((s) => `
        <tr class="klick${s.i === aktiveStation ? ' aktiv' : ''}" data-station="${s.i}" data-x="${s.x}">
          <td>${s.i}</td><td class="num">${f2(s.x)}</td><td>${esc(s.teil)}</td>
          <td class="num">${f3(s.etaEcken)}</td><td class="num">${f3(s.etaBleche)}</td>
          <td class="num stark ${ampelU(s.eta)}">${f3(s.eta)}</td>
        </tr>`).join('')}</tbody>
    </table></div>` : ''}
    ${pruefungenHtml(urteil)}
    ${hinweise.length ? klapp('uebersicht-hinweise', 'Hinweise zur Gültigkeit',
        `<div class="hinweisliste">${hinweise.map((h) =>
          `<p class="notiz">${esc(h)}</p>`).join('')}</div>`,
        hinweise.length === 1 ? '1 Hinweis' : `${hinweise.length} Hinweise`) : ''}
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
  verdrahteStabwerk(node, opt);
  verdrahtePlastisch(node, opt);
  verdrahteNachweisart(node, opt);
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
/* ===========================================================================
 * >>> DER SCHNITT AUS DEM STABWERK: STATION UND STABLISTE (28. Sept.). <<<
 * =========================================================================
 *
 * Frage des Auftraggebers: «könnte man schnitt überarbeiten, dass es einen
 * grösseren nutzen hat bei methode stab berechnung?» Auf Rückfrage:
 * «Station + Stabliste».
 *
 * Der Ersatzbalken muss seine Schnittgrössen erst auf vier Winkel und zwei
 * Blechebenen AUFTEILEN - daher die Tabellen darunter. Das Stabwerk kennt
 * die Kräfte jedes Stabes direkt. An der Station stehen deshalb die vier
 * Gurtstäbe, die dort durchlaufen, und die Bleche der beiden Nachbar-
 * stationen - jeder mit den Endkräften des Falls, in dem ER massgebend
 * wurde, seiner Randspannung und seinem η (dieselbe Zahl wie in den
 * Kacheln). Darunter je Teil die zehn höchstbeanspruchten Stäbe; ein Klick
 * fährt dorthin (Schnitt und Modell).
 *
 * Die Kräfte sind ENDKRÄFTE des Lösers im lokalen System des Stabes, am
 * massgebenden Ende - so, wie sie in den Nachweis gehen. Sie sind keine
 * Schnittgrössen nach Vorzeichenkonvention des Ersatzbalkens; der Titel
 * der Tabelle sagt es.
 * ========================================================================= */
export function stabwerkSchnittHtml(sw, sn, o = {}) {
  const js = sw?.jeStab;
  if (!js) return '';
  const jochKey = o.jochKey ?? 'tragwerk';
  const alle = Object.values(js);
  /*
   * >>> DER VERSATZ KOMMT AUS DEM STABWERK, NICHT AUS DER EINGABE. <<<
   * In einer Reihe liegt das Modell in Blattkoordinaten, und das rechte
   * Joch ist dort um die Luft der Endbleche weiter gerückt
   * (`lagenEntflechten`, 10 cm je Stoss) - gemessen: T2 mit Lage 20.0 m
   * hat seine Gurte bei 20.100 … 40.100 m. Die Gurte beginnen örtlich bei
   * x = 0; ihr Anfang im Stabwerk IST also der Versatz.
   */
  const gurtX = alle.filter((z) => z.rolle === 'gurt' && z.bauteil === jochKey)
    .map((z) => z.x0);
  const versatz = o.versatz ?? (gurtX.length ? Math.min(...gurtX) : 0);
  const X = sn.x + versatz;
  const kraft = (z) => {
    const f = z.f ?? [];
    const k = z.ende === 'j' ? 6 : 0;
    return [f[k], f[k + 1], f[k + 2], f[k + 3], f[k + 4], f[k + 5]];
  };
  const xLokal = (z) => (((z.x0 ?? 0) + (z.x1 ?? 0)) / 2) - versatz;
  const zeile = (z, text) => {
    const [N, Vy, Vz, T, My, Mz] = kraft(z);
    return `<tr class="klick${z.eta > 1 ? ' nok' : ''}" data-sw-x="${f2(xLokal(z))}"
        title="Im Modell anfahren: x = ${f2(xLokal(z))} m">
      <td class="sw-stab">${esc(text ?? z.name)}<br><span class="ablage-meta">${
        esc(z.name)} · ${esc(z.ende)}</span></td>
      <td class="num ${ampel(z.eta)}">${f3(z.eta)}</td>
      <td class="num stark">${f1(z.sig)}</td>
      <td class="ablage-meta">${esc(fallKurz(z.bez ?? z.fall ?? ''))}</td>
      <td class="num">${f2(N)}</td><td class="num">${f2(Vy)}</td><td class="num">${f2(Vz)}</td>
      <td class="num">${f3(T)}</td><td class="num">${f3(My)}</td><td class="num">${f3(Mz)}</td></tr>`;
  };
  /*
   * η UND σ VORN: in der schmalen Schublade stehen sie sonst hinter einem
   * Querscroll - und sie sind es, wonach man in der Liste sucht.
   */
  const kopf = `<thead><tr><th>Stab</th><th class="num">η</th><th class="num">σ</th>
      <th>Kombination</th>
      <th class="num">N</th><th class="num">V_y</th><th class="num">V_z</th>
      <th class="num">T</th><th class="num">M_y</th><th class="num">M_z</th></tr></thead>`;
  const tabelle = (zeilen) => `<div class="tabellenrahmen"><table class="dt sw-tabelle">
      ${kopf}<tbody>${zeilen.join('')}</tbody></table></div>`;

  // --- Die vier Gurte, die an der Station durchlaufen ----------------------
  const gurtName = { OGL: 'OG links', OGR: 'OG rechts',
                     UGL: 'UG links', UGR: 'UG rechts' };
  const gurte = {};
  alle.filter((z) => z.rolle === 'gurt' && z.bauteil === jochKey
                  && z.x0 <= X + 1e-6 && z.x1 >= X - 1e-6)
    .forEach((z) => {
      const g = /(OG|UG)(L|R)_S\d+$/.exec(z.name);
      const k = g ? g[1] + g[2] : z.name;
      if (!gurte[k]) gurte[k] = z;
    });
  const gurtZeilen = ['OGL', 'OGR', 'UGL', 'UGR']
    .filter((k) => gurte[k]).map((k) => zeile(gurte[k], gurtName[k]));

  // --- Die Bleche der beiden Nachbarstationen --------------------------------
  const stationen = [sn.nachbarn?.links?.stationX ?? sn.stationX,
                     sn.nachbarn?.rechts?.stationX].filter(Number.isFinite);
  const blechZeilen = [];
  stationen.forEach((xs) => {
    alle.filter((z) => z.rolle === 'blech' && z.bauteil === jochKey
                    && Math.abs((z.x0 + z.x1) / 2 - (xs + versatz)) < 0.02)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((z) => blechZeilen.push(zeile(z, `Blech x ${f2(xs)}`)));
  });

  // --- Je Teil die zehn höchstbeanspruchten ---------------------------------
  const TEILE = [['OG', 'Obergurt'], ['UG', 'Untergurt'], ['blech', 'Bindebleche'],
                 ['mast', 'Masten']];
  const masten = new Set((o.masten ?? []).map((m) => `mast:${m}`));
  const listen = TEILE.map(([k, titel]) => {
    const z = alle.filter((s) => s.teil === k
        && (k === 'mast' ? masten.has(s.bauteil) : s.bauteil === jochKey))
      .sort((a, b) => (b.eta ?? 0) - (a.eta ?? 0)).slice(0, 10);
    if (!z.length) return '';
    return klapp(`sw-liste-${k}`, `${titel} — höchstbeanspruchte Stäbe`,
      tabelle(z.map((s) => zeile(s, k === 'mast'
        ? `${s.bauteil.replace('mast:', 'Mast ')} z ${f2(s.zm ?? 0)}`
        : `x ${f2(xLokal(s))}`))),
      `max η ${f3(z[0].eta ?? 0)}`, k !== 'mast');
  }).join('');

  return `${abschnitt('Stabwerk an der Station', `x = ${f2(sn.x)} m`)}
    <p class="notiz" style="margin-top:0">Endkräfte des Lösers am massgebenden
      Ende, lokal (kN, kNm), jeder Stab in SEINER massgebenden Kombination —
      dieselben Zahlen, aus denen die Kacheln kommen. Ein Klick auf eine Zeile
      fährt zur Stelle.</p>
    ${gurtZeilen.length ? tabelle(gurtZeilen)
      : '<p class="leer">Kein Gurtstab an dieser Stelle.</p>'}
    ${blechZeilen.length ? `<div class="sec-klein">Bindebleche der Nachbarstationen</div>
      ${tabelle(blechZeilen)}` : ''}
    ${abschnitt('Stabliste', 'je Teil die zehn höchsten η')}
    ${listen}`;
}

export function zeichneSchnitt(node, erg, beiSchnitt, beiOrientierung, beiAktiv, opt = {}) {
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

  const zahlenHtmlKern = `
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

  /*
   * FUEHRT DAS STABWERK (28. September, «Station + Stabliste»), steht sein
   * Block zuerst; die Aufteilung des Ersatzbalkens bleibt eingeklappt zum
   * Vergleich darunter.
   */
  const swHtml = opt.sw ? stabwerkSchnittHtml(opt.sw, sn, opt) : '';
  const zahlenHtml = swHtml
    ? `${swHtml}${klapp('schnitt-ersatzbalken', 'Ersatzbalken — Aufteilung zum Vergleich',
         zahlenHtmlKern, 'nicht massgebend', false)}`
    : zahlenHtmlKern;

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

  // Ein Klick auf eine Stabzeile fährt dorthin (Schnitt und Modell).
  if (opt.beiSprung) {
    node.querySelectorAll('[data-sw-x]').forEach((tr) => {
      tr.addEventListener('click', () => opt.beiSprung(undefined, +tr.dataset.swX));
    });
  }
  verdrahteKlapp(node);
}

/**
 * Kompakte Querschnittsklassen-Marke für die Profil-Sidebar.
 * Die ausführliche Herleitung öffnet sich per Knopf im Überlagerungsfenster.
 */
/* ===========================================================================
 * ALLE PROFILE DES TRAGWERKS, AN EINER STELLE
 * ===========================================================================
 *
 * Weisung vom 11. September: «alle ergaenzten bauteile unter profile
 * nachfuehren, so wie bei den tragjochen.»
 *
 * Der Reiter «Gurtprofile» zeigte die zwei Winkel des Tragjochs und war bei
 * jeder anderen Tragwerksart ueberhaupt nicht da - beim Abfangjoch fehlte er
 * ganz, samt Stahlguete und Teilsicherheitsbeiwert, die allen gelten.
 *
 * Seit dem 9. September sind drei Bauteilarten dazugekommen, und jede bringt
 * ihre eigenen Querschnittswerte mit:
 *
 *   ABFANGJOCH   zwei UPE oder IPE nebeneinander
 *   MAST         HEB oder HEM, je Ende eines
 *   ANKER        zwei UNP, gespreizt
 *
 * Sie stehen jetzt hier, mit denselben Kennwerten wie die Gurte: Flaeche,
 * Traegheitsmomente, Widerstandsmomente. Das ist die Tafel, die man beim
 * Nachrechnen neben sich legt.
 *
 * >>> WAS FEHLT, STEHT ALS STRICH DA. <<<
 *
 * Der Anker fuehrt kein I_z: die beiden Profile sind gespreizt, und der
 * Wert waechst ueber die Laenge. Ein Strich sagt das; eine Null waere eine
 * Behauptung.
 */
/**
 * Die Zeilen der Profiltafel EINES Tragwerks: {zeilen, masten, stahl}.
 * Herausgelöst (2. Oktober), damit die Ansicht «ganzes Blatt» sie je
 * Tragwerk holen kann - dieselbe Stelle, kein zweiter Aufbau.
 */
function profilZeilen(erg, werte) {
  if (!erg?.modell) return { zeilen: [], masten: [], stahl: null };
  const m = erg.modell;
  const ab = erg.abfang ?? null;
  const zeilen = [];
  const masten = [];
  const gesehen = new Set();
  /*
   * JEDES PROFIL EINMAL. Zwei Masten mit demselben HEB 240 sind eine Zeile -
   * zwei gleiche untereinander waeren keine Auskunft, sondern ein Verdacht.
   * Die Rolle sammelt sich dafuer in der ersten Spalte.
   */
  /*
   * `art` und `roh` tragen das Profil, wie es in seiner Tabelle steht - fuer
   * das Profilblatt, das ein Klick auf die Zeile oeffnet (Weisung 2. Oktober,
   * siehe ui.profilblatt.js). Die Spalten der Tafel bleiben, wie sie waren.
   */
  const zu = (rolle, p, opt = {}) => {
    if (!p?.name) return;
    const s = `${p.name}|${opt.anzahl ?? 1}`;
    const da = zeilen.find((z) => z.s === s);
    if (da) { if (!da.rolle.includes(rolle)) da.rolle += ` · ${rolle}`; return; }
    if (gesehen.has(s)) return;
    gesehen.add(s);
    zeilen.push({ s, rolle, name: p.name, anzahl: opt.anzahl ?? 1,
                  A: p.A, Iy: p.Iy ?? p.I, Iz: p.Iz, Wy: p.Wy ?? p.W,
                  Wz: p.Wz, It: p.It, G: p.G, quelle: opt.quelle ?? '',
                  art: opt.art ?? null, roh: opt.roh ?? p,
                  abg: new Set(opt.abgeleitet ?? []), ...(opt.werte ?? {}) });
  };
  /*
   * >>> WAS DIE TABELLE NICHT FUEHRT, STEHT SO DA, WIE GERECHNET WIRD. <<<
   *
   * Frage des Auftraggebers (2. Oktober, mit Bild der Tafel): «warum fehlen
   * hier gewisse kennwerte und wo sind die falchbleche zum anklicken?»
   *
   * Die Winkeltabelle führt i, nicht I, und kein I_t - die Tafel zeigte nur
   * Hinterlegtes und setzte Striche. Kern und Stabwerk rechnen aber mit
   * I = i² · A (`winkelwerte`) und I_t = (a_H + a_V) · t³ / 3 (`winkelIt`).
   * Genau diese Zahlen stehen jetzt da, KURSIV und im Titel benannt: eine
   * abgeleitete Zahl darf nicht aussehen wie eine hinterlegte.
   */
  const winkelWerte = (p) => ({
    Iy: p.iy ** 2 * p.A, Iz: (p.iz ?? p.iy) ** 2 * p.A, It: winkelIt(p) });

  // Der Tragausleger mit seinen UPE, nicht den Winkeln des Ersatzjochs.
  const taP = erg.ausleger?.profil ? (() => {
    try { return getGurtprofil(erg.ausleger.profil); } catch { return null; }
  })() : null;
  if (ab?.q?.gurt) {
    zu('Gurt', ab.q.gurt, { anzahl: 2,
      quelle: `Abfangjoch ${ab.typ}, zwei Gurte nebeneinander`, art: 'walz' });
  } else if (taP) {
    zu('Gurt', taP, { anzahl: 2, quelle: 'Tragausleger, zwei UPE nebeneinander',
                      art: 'walz' });
  } else if (m.profOG) {
    const wo = { anzahl: 2, quelle: 'Tragjoch, zwei Winkel', art: 'winkel',
                 abgeleitet: ['Iy', 'Iz', 'It'] };
    zu('Obergurt', m.profOG, { ...wo, werte: winkelWerte(m.profOG) });
    zu('Untergurt', m.profUG, { ...wo, werte: winkelWerte(m.profUG) });
  }
  /*
   * >>> DIE BINDEBLECHE (2. Oktober, «wo sind die falchbleche»). <<<
   *
   * Sie standen nur in der Stückliste. Jede Abmessung einmal, mit Rolle und
   * Stückzahl; Kennwerte aus b × t gerechnet (das Blech IST ein Rechteck),
   * I_y in der Blechebene (stark), I_z quer dazu (schwach), I_t mit der
   * Randkorrektur 1 − 0.63 t/b. Alle kursiv: gerechnet, nicht hinterlegt.
   */
  // Die Quersteifen des Abfangjochs (ab A240): Walzprofile an Blechstationen.
  if (ab?.typ) {
    let st = null;
    try { st = abfangBlechstationen(ab.typ, Number(werte?.L)); } catch { st = null; }
    const n = new Map();
    (st?.arten ?? []).filter((a) => a.profil).forEach((a) => n.set(a.profil, (n.get(a.profil) ?? 0) + 1));
    n.forEach((anzahl, name) => {
      let p = null;
      try { p = getGurtprofil(name); } catch { p = null; }
      if (p) zu('Quersteife', p, { anzahl, art: 'walz', quelle: `Abfangjoch ${ab.typ}, Quersteifen` });
    });
  }
  blechZeilen(erg, werte).forEach(({ rolle, b, t, l, n }) => {
    zu(rolle, { name: `FL ${b}×${t}` }, {
      anzahl: n, art: 'blech', quelle: 'aus b × t gerechnet',
      abgeleitet: ['A', 'Iy', 'Iz', 'Wy', 'It'], werte: blechWerte(b, t),
      roh: { name: `FL ${b}×${t}`, b, t, l } });
  });
  ['A', 'B'].forEach((ende) => {
    // Am Tragausleger gibt es nur Ende A - B war das Phantomauflager.
    if (ende === 'B' && taP) return;
    const f = m.federn?.[`mast${ende}`] ?? (ende === 'A' ? m.federn?.mast : null);
    const name = m.federn?.namen?.[ende] || `Ende ${ende}`;
    if (f?.profil) {
      zu(`Mast ${name}`, f.profil, { quelle: 'Mastsortiment', art: 'mast' });
      masten.push({ ende, name, profil: f.profil });
    }
    const ak = f?.anker;
    if (ak?.typ) {
      let qs = null;
      try { qs = ankerQuerschnitt(ak.typ); } catch { qs = null; }
      if (qs) {
        // Ein Seilanker hat keinen Profilschnitt - er geht ohne Blatt.
        const istProfil = Number.isFinite(qs.h) && Number.isFinite(qs.tw);
        zu(`Anker ${name}`, { name: `${ak.typ} · ${qs.anzahl ?? 2}× ${qs.profil}`,
                              A: qs.A, Iy: qs.Iy, Iz: qs.Iz, It: qs.It },
           { quelle: qs.quelle ?? '', art: istProfil ? 'anker' : null,
             roh: { ...qs, name: qs.profil } });
      }
    }
  });
  // Der Stahl steht im MODELL - ein zweiter Weg ueber den Katalog waere
  // eine zweite Quelle fuer dieselbe Angabe.
  return { zeilen, masten, stahl: m.stahl ?? null };
}

/**
 * >>> DIE PROFILTAFEL: DIESES TRAGWERK ODER DAS GANZE BLATT (2. Oktober). <<<
 *
 * Frage mit Bild: «das j90 joch besteht aus unterschiedlichen flachblechen,
 * wo sind diese aufgefuehrt?» - die Tafel zeigte nur das AKTIVE Tragwerk
 * (dort der Tragausleger), die Bleche des J90 erst nach dem Umschalten. Auf
 * Rückfrage «Beides umschaltbar»: Schalter im Kopf, Vorgabe dieses
 * Tragwerk. Im Blatt eine Spalte «Tragwerk»; ein geteilter Mast steht
 * einmal, beim ersten Tragwerk, das ihn trägt.
 *
 * @param {object} erg    das aktive Tragwerk (anzeige oder erg)
 * @param {object} werte  sein Satz
 * @param {object} opt    { umfang: 'tragwerk'|'blatt', blatt: [{label, erg, werte}] }
 */
export function profilUebersicht(erg, werte, opt = {}) {
  if (!erg) return '';
  const imBlatt = opt.umfang === 'blatt' && Array.isArray(opt.blatt) && opt.blatt.length > 1;
  let zeilen, masten, st;
  if (imBlatt) {
    zeilen = []; masten = []; st = null;
    const mastGesehen = new Set();
    opt.blatt.forEach(({ label, erg: e2, werte: w2 }) => {
      const r = profilZeilen(e2, w2);
      st = st ?? r.stahl;
      r.zeilen.forEach((z0) => {
        if (z0.art === 'mast') {
          // «Mast M1 · Mast M2» - nur die Masten, die noch nicht dastehen.
          const neu = z0.rolle.split(' · ').filter((n) => !mastGesehen.has(n));
          if (!neu.length) return;
          neu.forEach((n) => mastGesehen.add(n));
          zeilen.push({ ...z0, rolle: neu.join(' · '), tw: label });
          return;
        }
        zeilen.push({ ...z0, tw: label });
      });
      r.masten.forEach((mm) => {
        if (!masten.some((x) => x.name === mm.name)) masten.push({ ...mm, erg: e2 });
      });
    });
  } else {
    ({ zeilen, masten, stahl: st } = profilZeilen(erg, werte));
    masten = masten.map((mm) => ({ ...mm, erg }));
  }
  if (!zeilen.length) return '';
  // Fuer den Klick: die Eintraege dieser Tafel, in ihrer Reihenfolge.
  profilEintraege = zeilen.map((r) => (r.art
    ? { art: r.art, p: r.roh, name: r.name, rolle: r.tw ? `${r.tw} · ${r.rolle}` : r.rolle,
        quelle: r.quelle }
    : null));

  const z = (v, n = 1) => (Number.isFinite(v) ? f2(v) : '–');
  const mehrere = Array.isArray(opt.blatt) && opt.blatt.length > 1;
  const schalter = mehrere ? `<span class="pt-umfang">${[['tragwerk', 'dieses Tragwerk'],
    ['blatt', 'ganzes Blatt']].map(([k, t]) => `<button type="button"
      class="btn btn-mini${(imBlatt ? 'blatt' : 'tragwerk') === k ? ' on' : ''}"
      data-profil-umfang="${k}">${t}</button>`).join('')}</span> ` : '';
  return `${abschnitt(imBlatt ? 'Profile des Blatts' : 'Profile dieses Tragwerks',
      `${schalter}${zeilen.length} Zeilen`)}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr>${imBlatt ? '<th>Tragwerk</th>' : ''}<th>Rolle</th><th>Profil</th><th class="num">n</th>
        <th class="num">A [cm²]</th><th class="num">I_y [cm⁴]</th>
        <th class="num">I_z [cm⁴]</th><th class="num">W_y [cm³]</th>
        <th class="num">I_t [cm⁴]</th></tr></thead>
      <tbody>${zeilen.map((r, i) => `
        <tr${r.art ? ` class="pb-zeile" data-profil="${i}"` : ''}
          title="${esc(r.quelle)}${r.art ? ' – anklicken: Kenndaten und Schnitt' : ''}">
          ${imBlatt ? `<td>${esc(r.tw ?? '')}</td>` : ''}<td>${esc(r.rolle)}</td><td>${r.art ? `<u>${esc(r.name)}</u>` : esc(r.name)}</td>
          <td class="num">${r.anzahl}</td>
          ${['A', 'Iy', 'Iz', 'Wy', 'It'].map((k) => (r.abg.has(k)
            ? `<td class="num" title="abgeleitet: ${k === 'It' && r.art === 'winkel'
              ? '(a_H + a_V) · t³ / 3, wie im Stabwerk' : r.art === 'blech'
              ? 'aus b × t gerechnet' : 'i² · A, wie im Rechenkern'}"><i>${z(r[k])}</i></td>`
            : `<td class="num">${z(r[k])}</td>`)).join('')}
        </tr>`).join('')}</tbody>
    </table></div>
    <p class="hinweis" style="margin:3px 0 0">Werte je EINZELPROFIL, «n» sagt,
      wie viele davon das Bauteil trägt (beim Blech die Stückzahl). <i>Kursiv</i>:
      nicht hinterlegt, sondern so gerechnet, wie Kern und Stabwerk es tun
      (Winkel I = i² · A, I_t dünnwandig; Bleche aus b × t). Ein Strich heisst:
      nicht erfasst — beim Anker etwa I_z, das mit der Spreizung über die
      Länge wächst.
      ${st ? `Stahl ${esc(st.name)}, f_y ${f0(st.fy)} N/mm².` : ''}
      Ein Klick auf ein Profil zeigt seine hinterlegten Kenndaten und den
      Schnitt.</p>
    ${mastProfilHtml(erg, masten, st)}`;
}

/**
 * Die Bindebleche des Tragwerks, je Abmessung und Rolle einmal [mm].
 * Tragjoch: aus den Stationen des Modells (wie die Stückliste); Abfangjoch
 * und Tragausleger: aus ihrem Sortiment.
 */
function blechZeilen(erg, werte) {
  const aus = new Map();
  // Je ABMESSUNG eine Zeile: die Rollen sammeln sich, die Stückzahl summiert.
  const zu = (rolle, b, t, l, n) => {
    if (!(b > 0 && t > 0)) return;
    const k = `${b}|${t}`;
    const da = aus.get(k);
    if (da) {
      if (!da.rollen.includes(rolle)) da.rollen.push(rolle);
      da.n += n;
      return;
    }
    aus.set(k, { rollen: [rolle], b, t, l: l ?? null, n });
  };
  /*
   * «Vertikalblech Pos 3 · Horizontalblech Pos 5 · Horizontalblech Pos 6»
   * wird «Vertikalblech Pos 3 · Horizontalblech Pos 5, 6» - in der
   * Blattansicht stand die Rolle sonst über sechs Zeilen.
   */
  const kurz = (rollen) => {
    const je = new Map();
    rollen.forEach((r) => {
      const m = /^(.*) Pos (\S+)$/.exec(r);
      const k = m ? m[1] : r;
      if (!je.has(k)) je.set(k, []);
      if (m) je.get(k).push(m[2]);
    });
    return [...je.entries()].map(([k, pos]) => (pos.length ? `${k} Pos ${pos.join(', ')}` : k)).join(' · ');
  };
  const liste = () => [...aus.values()].map((x) => ({ ...x, rolle: kurz(x.rollen) }));
  const ab = erg?.abfang ?? null;
  if (ab?.typ) {
    /*
     * Die STATIONEN sagen, was wo sitzt (`abfangBlechstationen`): Regelblech,
     * Endblech links/rechts oder Quersteife. Je Station eines oben und eines
     * unten - daher mal Zahl der Ebenen. Die Quersteifen sind Walzprofile und
     * stehen in der Tafel als eigene Zeile (`abfangQuersteifen`).
     */
    let bb = null, st = null;
    try { bb = abfangBindeblech(ab.typ); } catch { bb = null; }
    try { st = abfangBlechstationen(ab.typ, Number(werte?.L)); } catch { st = null; }
    const ebenen = bb?.ebenen ?? 2;
    const rolle = { regel: 'Bindeblech', endeL: 'Endblech links', endeR: 'Endblech rechts' };
    (st?.arten ?? []).forEach((a) => {
      const m2 = a.art === 'regel' ? bb?.regel : a.masse;
      if (rolle[a.art] && m2) zu(rolle[a.art], m2.b, m2.t, m2.l, ebenen);
    });
    return liste();
  }
  if (erg?.ausleger) {
    let ta = null;
    try { ta = getTragausleger(Number(werte?.L)); } catch { ta = null; }
    if (ta?.blech) zu('Bindeblech', ta.blech.b, ta.blech.t, ta.blech.l, ta.bleche ?? 0);
    return liste();
  }
  /*
   * Die Rolle nennt die POSITION wie die Legende im 3D und die
   * Werkstattzeichnung («Vertikalblech Pos 3»); ohne Typendatenbank steht
   * statt der Nummer End- bzw. Zwischenblech.
   */
  const nameVon = (art, b) => `${art} ${Number.isFinite(Number(b.pos)) ? `Pos ${b.pos}` : (b.pos ?? '')}`.trim();
  (erg?.modell?.stationsListe ?? []).forEach((s) => {
    if (s.vertikal) zu(nameVon('Vertikalblech', s.vertikal), s.vertikal.breite, s.vertikal.dicke, s.vertikal.laenge, 2);
    if (s.horizontal) zu(nameVon('Horizontalblech', s.horizontal), s.horizontal.breite, s.horizontal.dicke, s.horizontal.laenge, 2);
  });
  return liste();
}

/** Die Eintraege der zuletzt gezeichneten Profiltafel, fuer den Klick. */
let profilEintraege = [];
export const profilEintrag = (i) => profilEintraege[i] ?? null;

/* ===========================================================================
 * MAST: QUERSCHNITTSKLASSE UND FUSSNAHT
 * ===========================================================================
 *
 * Weisung vom 2. Oktober (aus der Liste vom 30. September): «beim Mast noch
 * unter profile die querschnittsklasse angeben und einen hinweis zur
 * schweissnaht an fussplatte (durchgeschweisst). dies ist bei den
 * standardfussplatten schon der fall.»
 *
 * >>> DIE KLASSE IST DIE DES NACHWEISES, KEINE ZWEITE. <<<
 *
 * `mastNachweis` (core.mast.js) klassiert jedes Ende mit `mastKlasse` unter
 * der groessten Normalkraft der Bemessung - davon haengt ab, ob plastisch
 * gerechnet werden darf. Genau diese Zahl steht hier. Nur wo kein
 * Mastnachweis vorliegt, rechnet die Tafel dieselbe Funktion unter reiner
 * Biegung (N = 0) und sagt es.
 *
 * Die Fussnaht ist ein Hinweis, keine Rechnung: eine durchgeschweisste
 * Stumpfnaht traegt nach EN 1993-1-8, 4.7.1 wie der schwaechere der
 * verbundenen Teile - der Nachweis des Mastquerschnitts am Fuss deckt sie,
 * und eine eigene Nahtbemessung entfaellt.
 */
function mastProfilHtml(erg, masten, st) {
  if (!masten.length) return '';
  const fy = st?.fy ?? 235;
  const zeilen = masten.map(({ ende, name, profil, erg: eM }) => {
    // Der Gittermast hat keinen Flansch und keinen Steg (3. Oktober).
    if (profil.gitter) {
      return `<tr><td>Mast ${esc(name)}</td><td>${esc(profil.name)}</td>
        <td colspan="4">Fachwerkmast: vier Gurtwinkel, Bindebleche und Rohr werden je Stab
        im Stabwerk nachgewiesen — keine Querschnittsklasse eines Vollstabs.</td></tr>`;
    }
    const n = (eM ?? erg)?.mast?.[ende];
    let kl = n?.klasse ?? null;
    let quelle = 'Mastnachweis, mit N_Ed,max';
    if (!kl) {
      try { kl = mastKlasse(profil, fy, 0); } catch { kl = null; }
      quelle = 'reine Biegung, N = 0';
    }
    if (!kl) return '';
    const stufe = kl.klasse <= 2 ? 'ok' : kl.klasse === 3 ? 'warn' : 'fail';
    return `<tr>
      <td>Mast ${esc(name)}</td><td>${esc(profil.name)}</td>
      <td class="num">${f1(kl.flansch.ct)} / ${f2(kl.flansch.grenze)}</td>
      <td class="num">${f1(kl.steg.ct)} / ${f2(kl.steg.grenze)}</td>
      <td class="num">${plakette('Klasse ' + kl.klasse, stufe)}</td>
      <td>${esc(quelle)}</td></tr>`;
  }).join('');
  if (!zeilen) return '';
  return `${abschnitt('Mast: Querschnittsklasse und Fussnaht')}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Mast</th><th>Profil</th>
        <th class="num">Flansch c/t / Grenze Kl. 1</th>
        <th class="num">Steg c/t / Grenze Kl. 1</th>
        <th class="num">QSK</th><th>Grundlage</th></tr></thead>
      <tbody>${zeilen}</tbody>
    </table></div>
    <p class="hinweis" style="margin:3px 0 0">Querschnittsklasse nach
      EN 1993-1-1, Tab. 5.2 (Flansch einseitig gestützt, Steg unter Druck und
      Biegung), c ohne Ausrundung — auf der sicheren Seite. Klasse 1 und 2
      lassen den plastischen Widerstand zu (Optionen).</p>
    <p class="hinweis" style="margin:3px 0 0"><b>Fussplatte:</b> der Mast ist
      mit der Fussplatte <b>durchgeschweisst</b> (Stumpfnaht mit voller
      Durchschweissung) — bei den Standardfussplatten so ausgefuehrt. Die Naht
      trägt damit wie der Mastquerschnitt (EN 1993-1-8, 4.7.1); der Nachweis
      des Querschnitts am Fuss deckt sie, eine eigene Nahtbemessung entfällt.
      Für eine abweichende Fussplatte gilt das nicht.</p>`;
}

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
 * DIE KRAFTBILDER AN DEN KURVEN SIND WEG (15. September). Hier hing unter
 * jedem Diagramm ein leerer Platz, der sich auf Klick in die Legende mit
 * einer kleinen Skizze fuellte. Weisung: \u00abnimm diese sekundaeren erklaer
 * skizzen zu den einzelnen kurven weg, diese sind meist nicht ganz korrekt
 * und verwirren mehr als sie helfen.\u00bb
 */
function diagrammBlock(id, titel, svg) {
  return abschnitt(titel,
    `<button class="btn btn-mini" data-gross="${esc(id)}"
      title="Im Modellfenster gross zeigen">${icon('aufziehen', 15)}</button>`) +
    `<div class="dia" data-dia="${esc(id)}" title="anklicken: gross im Modellfenster">${svg}</div>`;
}

/** Knöpfe zum Vergrössern verdrahten. */
let beiDiagrammGross = null;
export function setzeDiagrammBuehne(fn) { beiDiagrammGross = fn; }

function verdrahteDiagramme(node) {
  node.querySelectorAll('[data-gross]').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); beiDiagrammGross?.(b.dataset.gross); };
  });
  node.querySelectorAll('.dia[data-dia]').forEach((d) => {
    // Das ganze Bild ist der Knopf - seit dem 15. September ohne Ausnahme:
    // die Legende traegt kein Kraftbild mehr, an dem ein Klick haengen bleibt.
    d.onclick = () => beiDiagrammGross?.(d.dataset.dia);
  });
}

/** Verläufe: Diagramme und der Massvarianten-Vergleich. */
export function zeichneVerlauf(node, dia, vergleich, weitere = null, sw = null) {
  /*
   * >>> OHNE VERGLEICH FAELLT DER BLOCK WEG, NICHT DIE SEITE. <<<
   *
   * Weisung vom 10. September: «die reiter schnitt verläufe und auflager
   * beim abfangjoch fertig machen.»
   *
   * Der Massvariantenvergleich stellt die Hebelarm-Definitionen des
   * TRAGJOCHS gegenueber - h und b des Vierendeeltraegers aus vier
   * Winkelgurten. Am Abfangjoch gibt es das nicht; dort kommt `null`
   * herein, und `vergleich.zeilen` brach die ganze Seite ab.
   */
  const massBlock = vergleich?.zeilen?.length
    ? klapp('verlauf-massvarianten', 'Einfluss der Hebelarm-Definition', `
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
      `gewählt: ${esc(vergleich.zeilen.find((z) => z.istGewaehlt)?.kurz ?? '')}`)
    : '';
  /* =========================================================================
   * >>> DER MAST UND DIE STUETZE BEKOMMEN IHRE EIGENEN BILDER. <<<
   * =========================================================================
   *
   * Weisung vom 11. September: «es sind noch sinnvolle diagramme (sidebar /
   * verlaeufe) fuer die druckstuetze und abfangjoch nachzuziehen falls nicht
   * schon gemacht.»
   *
   * Das Abfangjoch hatte seine drei seit dem 10. September. Der MAST hatte
   * eine Tabelle und kein Bild, die STUETZE nicht einmal das - obwohl ihr
   * Nachweis eine Kurve IST.
   *
   * Sie stehen UNTER den Jochdiagrammen und je Bauteil in einem eigenen
   * Block: wer den Traeger liest, soll nicht erst an zwei Masten
   * vorbeiscrollen.
   */
  const extra = (weitere ?? []).map((w, i) => {
    const teile = [];
    if (w.bemessung) {
      teile.push(diagrammBlock(`anker-bem-${i}`,
        'Bemessungsdiagramm der Stütze', w.bemessung));
    }
    // Das Bemessungsdiagramm der Gittermasten steht für sich (unten, `gitterBem`):
    // es kommt aus dem Stabwerk und gehört nicht in den eingeklappten Ersatzbalken.
    if (w.gitter) return '';
    if (w.schnitt) {
      teile.push(diagrammBlock(`mast-schnitt-${i}`,
        'Schnittgrössen über die Höhe', w.schnitt));
    }
    if (w.ausnutzung) {
      teile.push(diagrammBlock(`mast-eta-${i}`,
        'Ausnutzung über die Höhe', w.ausnutzung));
    }
    /*
     * >>> UND DIE VERFORMUNG (Weisung vom 24. September). <<<
     * «nimm die verformung in die resultat plot und mache entsprechende
     *  diagramme.» Sie steht UNTER der Ausnutzung: erst was traegt, dann
     * wie weit es sich bewegt.
     */
    if (w.verformung) {
      teile.push(diagrammBlock(`mast-verf-${i}`,
        'Verformung über die Höhe', w.verformung));
    }
    if (!teile.length) return '';
    return abschnitt(w.titel ?? '') + teile.join('');
  }).join('');

  const gitterBem = (weitere ?? []).map((w, i) => (w.gitter
    ? abschnitt(w.titel ?? '') + diagrammBlock(`gitter-bem-${i}`,
      'Bemessungsdiagramm (alte Bemessung, Einheitswind)', w.gitter) : '')).join('');
  const kern = `
    ${dia ? diagrammBlock('schnittgroessen', 'Schnittgrössen', dia.schnittgroessen) : ''}
    ${dia ? diagrammBlock('ebene', 'Ebenenquerkräfte', dia.ebene) : ''}
    ${dia ? diagrammBlock('ausnutzung', 'Ausnutzung', dia.ausnutzung) : ''}
    ${massBlock}
    ${extra}`;
  /*
   * >>> IM STABWERKSWEG OBEN DAS STABWERK (29. September). <<<
   * «Stabwerk, Ersatzbalken eingeklappt»: die Verläufe des Stabwerks
   * zuerst, die des Ersatzbalkens (samt Masten und Stützen aus dem Kern)
   * eingeklappt darunter, zum Vergleich.
   */
  node.innerHTML = sw ? `
    ${sw.gurt ? diagrammBlock('sw-gurt', 'Ausnutzung der Gurte · Stabwerk', sw.gurt) : ''}
    ${sw.blech ? diagrammBlock('sw-blech', 'Ausnutzung der Bindebleche · Stabwerk', sw.blech) : ''}
    ${sw.kraft ? diagrammBlock('sw-kraft', 'Gurtkraft · Stabwerk', sw.kraft) : ''}
    ${sw.masten.map((m) => abschnitt(`Mast ${m.name} · Stabwerk`)
      + diagrammBlock(`sw-mast-eta-${m.name}`, 'Ausnutzung über die Höhe', m.eta)
      + diagrammBlock(`sw-mast-schnitt-${m.name}`, 'Schnittgrössen über die Höhe', m.schnitt)).join('')}
    ${gitterBem}
    ${klapp('verlauf-ersatzbalken', 'Ersatzbalken zum Vergleich', kern, 'Kern')}`
    : gitterBem + kern;
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
/* ===========================================================================
 * >>> DER REITER AUFLAGER - MASTFUSS ZUERST. <<<
 * ===========================================================================
 *
 * Weisung vom 16. September: «bei den reaktionskräfte die mastfuss als
 * primären output nehmen, falls diese nicht modelliert sind die jochauflager.
 * wie könnte man bei mehreren Masten / Jochenden eine bessere übersicht in
 * der sidebar ermöglichen. gehe die sidebar auflager durch und optimiere und
 * vereinfache so weit wie möglich, ähnliches vorgehen wie bei der karte
 * Anbauteile.»
 *
 * >>> WARUM DER MASTFUSS UND NICHT DAS JOCHAUFLAGER. <<<
 *
 * Weil er die Zahl ist, die das Haus weitergibt. Die Bestandesschutz-Prüfung
 * fragt nach F_z, F_x, F_y, M_yy und M_xx AM MASTFUSS; das Jochauflager ist
 * eine Zwischengrösse auf dem Weg dorthin. Bisher stand es oben und der
 * Mastfuss unten in einer Tabelle über die ganze Höhe — man musste die
 * gesuchte Zahl in der untersten Zeile suchen.
 *
 * OHNE MAST gibt es keinen Mastfuss: dann rückt das Jochauflager nach oben.
 * Es ist derselbe Reiter, und er zeigt in beiden Fällen die Kraft, die aus
 * dem Tragwerk herausgeht.
 *
 * >>> DIE ÜBERSICHT IST EINE ZEILE JE MAST. <<<
 *
 * Bei zwei Masten standen zwei volle Tabellen untereinander, jede mit einer
 * Zeile je Höhenstation — zwei Bildschirmlängen für zwei Zahlensätze, die man
 * vergleichen will. Jetzt steht oben EINE Tabelle mit einer Zeile je Mast;
 * die Stationstabelle jedes Masten liegt darunter in einer Klappe.
 *
 * >>> UND WAS EINEN REGELWERT HAT, IST ZUGEKLAPPT. <<<
 *
 * Dieselbe Regel wie in der Karte Anbauteile: was man selten aufmacht, steht
 * nicht in der ersten Ebene — es ist nicht gesperrt, es ist zugeklappt. Das
 * betrifft die Stationstabellen, das Jochauflager (wo ein Mast da ist) und
 * die Erläuterungen, die vorher als fünf Absätze offen dastanden.
 *
 * >>> ZWEI EINHEITENWELTEN, UND SIE STEHEN AUSEINANDER. <<<
 *
 * Der Mastfuss trägt BEMESSUNGSWERTE des gewählten Lastfalls, das
 * Jochauflager CHARAKTERISTISCHE Werte je Einwirkungsgruppe. Beides
 * nebeneinander ohne Anschrift wäre eine Falle: die Zahlen sehen gleich aus
 * und sind es nicht. Jeder Abschnitt sagt deshalb in seiner Überschrift, was
 * seine Zahlen sind.
 * ========================================================================= */

/* ---------------------------------------------------------------------------
 * EIN MAST IN SEINER KLAPPE.
 *
 * Der Kopf traegt, was man beim Ueberfliegen braucht: Profil und das
 * groessere der beiden η. Was darunter liegt - die Tabelle ueber die ganze
 * Hoehe - macht man auf, wenn man den Verlauf sucht. Dieselbe Regel wie in
 * der Karte Anbauteile: nicht gesperrt, zugeklappt.
 * ------------------------------------------------------------------------- */
function mastKlappe(mm) {
  const kS = mm.n.stabil;
  return klapp(`auflager-mast-${mm.ende}`,
    `Mast ${mm.name} · ${mm.n.profil?.name ?? ''} — Verlauf über die Höhe`,
    mastEndeHtml(mm.n, { [mm.ende]: mm.name }, false),
    `η ${f3(mm.n.eta ?? 0)} bei ${f2(mm.n.massgebend?.z ?? 0)} m`
    + `${kS ? ` · Knicken ${f3(kS.eta)}` : ''}`);
}

/** Die Fussstation eines Mastnachweises - z = 0 über dem Fundament. */
function mastFussStation(n) {
  const st = n?.stationen ?? [];
  return st.find((s) => Math.abs(s.z) < 1e-9) ?? st[0] ?? null;
}

/** Die Masten eines Ergebnisses als Liste, mit Namen und Fussstation. */
function mastListe(erg) {
  const namen = erg?.modell?.federn?.namen ?? {};
  return ['A', 'B'].map((ende) => {
    const n = erg?.mast?.[ende];
    if (!n) return null;
    return { ende, n, fuss: mastFussStation(n),
             name: namen?.[ende] || `Ende ${ende}` };
  }).filter(Boolean);
}

export function zeichneAuflager(node, blatt, erg, { stabwerk = false } = {}) {
  const m = erg.modell;
  const masten = mastListe(erg);

  /* ---------------------------------------------------------------------
   * DAS JOCHAUFLAGER - dieselbe Tabelle wie bisher, nur an anderer Stelle.
   * ------------------------------------------------------------------- */
  const zeile = (bez, z, seite, stark = false) => `
    <tr class="${stark ? 'aktiv' : ''}">
      <td>${esc(bez)}</td>
      <td class="num${stark ? ' stark' : ''}">${f2(fzAuf(z[seite].Fz))}</td>
      <td class="num${stark ? ' stark' : ''}">${f2(z[seite].Fy)}</td>
      <td class="num">${f2(z[seite].My)}</td>
      <td class="num">${f3(z[seite].Mx)}</td>
    </tr>`;
  const tabelle = (seite, titel) => `
    ${abschnitt(titel)}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Einwirkung</th>
        <th class="num">F_z [kN]</th><th class="num">F_y [kN]</th>
        <th class="num">M_yy [kNm]</th><th class="num">M_xx [kNm]</th></tr></thead>
      <tbody>
        ${blatt.zeilen.map((z) => zeile(z.label, z, seite)).join('')}
        ${zeile('Summe aller Gruppen', blatt.total, seite, true)}
      </tbody></table></div>`;
  const jochTabellen = `
    ${tabelle('A', 'Auflager A (x = 0)')}
    ${tabelle('B', `Auflager B (x = ${f2(m.L)} m)`)}
    <p class="notiz" style="margin:4px 0 0">Die Summenzeile addiert ALLE
      Gruppen, auch die beiden Windrichtungen. Das ist keine Lastkombination:
      Wind x und Wind y treten nicht gleichzeitig auf. Massgebend ist je
      Richtung eine der beiden Zeilen. <b>F_x = ${f2(blatt.total.Fx)} kN</b>
      wirkt in der Jochachse; wie sie sich auf die Maste verteilt, hängt von
      deren Steifigkeit ab — deshalb steht nur die Summe da.</p>`;

  /* ---------------------------------------------------------------------
   * DIE ERLAEUTERUNG - aus fuenf offenen Absaetzen eine Klappe.
   * ------------------------------------------------------------------- */
  const hinweise = klapp('auflager-hinweis',
    'Achsen, Vorzeichen und was nicht enthalten ist', `
      <p class="notiz" style="margin-top:0">Die Achsen sind global, wie
        überall im Werkzeug: <b>F_x</b> in der Jochachse, <b>F_y</b> in
        Gleisrichtung, <b>F_z</b> lotrecht nach der rechten Hand, positiv nach
        OBEN: Druck auf Masten und Fundament ist negativ, positive Werte sind
        <b>abhebend</b> (seit 1. Oktober; die Tabelle der Reaktionskräfte zählt
        Druck positiv). <b>M_xx</b> dreht um die Jochachse,
        <b>M_yy</b> um y, <b>M_zz</b> um die Lotrechte.</p>
      ${/*
         * >>> JE NACH RECHENVERFAHREN (6. Oktober). <<< «stimmt diese aussage
         * noch?» - mit gültigem Stabwerk gibt es die Tabellen des
         * Jochauflagers je Gruppe nicht mehr, die Reaktionstabelle oben ist
         * charakteristisch und kommt aus dem Stabwerk, der Mastfuss darunter
         * weiter aus dem Ersatzbalken. Der Text sagt jetzt, was dasteht.
         */''}
      ${stabwerk ? `<p class="notiz"><b>Die Tabelle der Reaktionskräfte</b>
        oben kommt aus dem Stabwerk: <b>charakteristisch</b>, ohne Beiwerte,
        Wind ohne Abminderung, je Auflager die Hülle der wirklichen
        Zustände, dazu der oben gewählte Fall. Eigengewicht und Wind der
        Masten sind darin enthalten.</p>
      <p class="notiz"><b>Der Mastfuss</b> darunter trägt die
        <b>Bemessungswerte</b> des gewählten Lastfalls aus dem
        <b>Ersatzbalken</b> - eine Auskunft zum Vergleich; massgebend ist das
        Stabwerk. Die beiden Zahlensätze sind nicht zu vermischen.</p>`
      : `<p class="notiz"><b>Der Mastfuss trägt Bemessungswerte</b> des oben
        gewählten Lastfalls — mit Beiwerten, fertig zum Weitergeben. Das
        Jochauflager darunter ist <b>charakteristisch</b> und je
        Einwirkungsgruppe getrennt, damit es kombinierbar bleibt. Die beiden
        Zahlensätze sind nicht zu vermischen.</p>
      <p class="notiz">Im Jochauflager nicht enthalten: Eigengewicht und
        Windlast der Maste selbst. Beides steckt im Mastfuss darüber.</p>`}
      <p class="notiz">Der Wind steht in zwei Gruppen: <b>Wind x</b> quer
        zum Gleis, <b>Wind y</b> längs zum Gleis. Das sind zwei
        Windrichtungen, keine gleichzeitigen Einwirkungen — einzeln
        anzusetzen, und zwar mit beiden Vorzeichen.</p>`);

  /* =====================================================================
   * >>> OHNE MAST RUECKT DAS JOCHAUFLAGER NACH OBEN. <<<
   * ===================================================================== */
  /*
   * >>> MIT GÜLTIGEM STABWERK OHNE DIE TABELLEN DES ERSATZBALKENS
   * (2. Oktober). <<< Auf Rückfrage «Hülle bleibt, dazu der gewählte Fall»:
   * die Reaktionen stehen dann in der Tabelle aus dem Stabwerk darüber
   * (alle Auflager, Hülle und gewählter Fall); die Gruppen des Ersatzbalkens
   * wären eine zweite Zahl für dieselbe Kraft.
   */
  if (!masten.length && stabwerk) {
    node.innerHTML = hinweise;
    verdrahteKlapp(node);
    return;
  }
  if (!masten.length) {
    node.innerHTML = `
      ${abschnitt('Reaktionskräfte am Jochauflager',
                  'charakteristisch, ohne Beiwerte · kein Mast im Modell')}
      <div class="kennzahlen">
        ${kachel('F_z Auflager A', f2(fzAuf(blatt.total.A.Fz)), 'kN · Druck negativ')}
        ${kachel('F_z Auflager B', f2(fzAuf(blatt.total.B.Fz)), 'kN · Druck negativ')}
        ${kachel('F_y je Auflager', f2(blatt.total.A.Fy), 'kN · in Gleisrichtung')}
        ${kachel('F_x total', f2(blatt.total.Fx), 'kN · in der Jochachse')}
      </div>
      ${jochTabellen}
      ${hinweise}`;
    verdrahteKlapp(node);
    return;
  }

  /* =====================================================================
   * >>> MIT MAST: EINE ZEILE JE MASTFUSS. <<<
   * ===================================================================== */
  const eines = masten.length === 1;
  /* =====================================================================
   * >>> DIE TABELLE STEHT QUER: GROESSEN UNTEN, MASTEN NEBENEINANDER. <<<
   * =====================================================================
   *
   * Zuerst hatte sie eine Zeile je Mast und sieben Zahlenspalten - in der
   * schmalen Sidebar lief sie rechts hinaus, und man verglich zwei Masten
   * durch waagrechtes Schieben. Gedreht braucht sie EINE Spalte je Mast:
   * bei zweien sind das drei Spalten, und die sieben Groessen stehen
   * untereinander, wo man sie sowieso liest.
   *
   * Es ist dieselbe Tabelle. Nur passt sie so in die Spalte, in der sie
   * steht - und das war der Punkt der Weisung.
   */
  const ZEILEN = [
    { g: 'F_z', e: 'kN', f: (x) => f2(fzAuf(x.Fz)), stark: true,
      was: 'lotrecht' },
    { g: 'F_x', e: 'kN', f: (x) => f2(x.Fx ?? 0), was: 'in der Jochachse' },
    { g: 'F_y', e: 'kN', f: (x) => f2(x.Fy ?? 0), was: 'in Gleisrichtung' },
    { g: 'M_yy', e: 'kNm', f: (x) => f2(x.Myy ?? 0), stark: true,
      was: 'biegt quer' },
    { g: 'M_xx', e: 'kNm', f: (x) => f2(x.Mxx ?? 0), stark: true,
      was: 'biegt längs' },
    { g: 'M_zz', e: 'kNm', f: (x) => f3(x.Mzz ?? 0), was: 'Torsion' },
  ];
  const etaVon = (mm) => Math.max(mm.n.eta ?? 0, mm.n.etaMitStabilitaet ?? 0);
  const fussTabelle = `
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Grösse</th>
        ${masten.map((mm) => `<th class="num">${esc(mm.name)}</th>`).join('')}
      </tr></thead>
      <tbody>
        ${ZEILEN.map((r) => `
          <tr><td>${r.g} [${r.e}]<small class="dim"> ${esc(r.was)}</small></td>
            ${masten.map((mm) => `<td class="num${r.stark ? ' stark' : ''}">`
              + `${r.f(mm.fuss ?? {})}</td>`).join('')}
          </tr>`).join('')}
        <tr class="aktiv"><td>η</td>
          ${masten.map((mm) => {
            const et = etaVon(mm);
            return `<td class="num ${et > 1 ? 'fail' : ''}">${f3(et)}</td>`;
          }).join('')}
        </tr>
      </tbody>
    </table></div>`;
  /*
   * DIE KACHELN NUR BEIM EINZELNEN MASTEN. Bei zweien sagt die Tabelle
   * dasselbe in einem Zug, und vier Kacheln fuer den einen der beiden waeren
   * eine willkuerliche Auswahl.
   */
  const kacheln = eines ? `
    <div class="kennzahlen">
      ${kachel('F_z', f2(fzAuf(masten[0].fuss?.Fz)), 'kN · lotrecht, Druck negativ')}
      ${kachel('F_y', f2(masten[0].fuss?.Fy ?? 0), 'kN · in Gleisrichtung')}
      ${kachel('M_yy', f2(masten[0].fuss?.Myy ?? 0), 'kNm · biegt quer')}
      ${kachel('M_xx', f2(masten[0].fuss?.Mxx ?? 0), 'kNm · biegt längs')}
    </div>` : '';

  node.innerHTML = `
    ${abschnitt(stabwerk ? 'Mastfuss aus dem Ersatzbalken' : 'Reaktionskräfte am Mastfuss',
                `Bemessungswerte des gewählten Lastfalls · ${
                  masten.length === 1 ? 'ein Mast' : `${masten.length} Masten`}`)}
    ${kacheln}
    ${fussTabelle}
    <p class="notiz" style="margin:4px 0 0">η ist das grössere aus
      Querschnitt und Stabilität. Die Kraft steht hier am <b>Fuss</b> — den
      Verlauf über die Höhe zeigt die Klappe des Masten.</p>
    ${masten.map((mm) => mastKlappe(mm)).join('')}
    ${stabwerk ? '' : klapp('auflager-joch', 'Jochauflager, charakteristisch je Gruppe',
            jochTabellen,
            `F_z ${f2(fzAuf(blatt.total.A.Fz))} / ${f2(fzAuf(blatt.total.B.Fz))} kN`)}
    ${hinweise}`;
  verdrahteKlapp(node);
}

/**
 * DER SCHNITT DES ABFANGJOCHS.
 *
 * Weisung vom 10. September: «die reiter schnitt verläufe und auflager beim
 * abfangjoch fertig machen.»
 *
 * Der Reiter zeigte bis hierher den Schnitt des TRAGJOCHS: vier Winkelecken
 * mit N und σ, zwei Blechebenen mit V, M, τ. Am Abfangjoch gibt es weder
 * vier Ecken noch zwei Ebenen — es sind ZWEI GURTE nebeneinander und EINE
 * Blechlage, oben und unten am selben Riegel.
 *
 * >>> DREI ANTEILE MACHEN DIE SPANNUNG IM GURT. <<<
 *
 *   σ_N      das Kräftepaar aus dem Moment der waagrechten Rahmenebene,
 *            N = M/e auf die Gurtfläche
 *   σ_vert   die lotrechte Biegung: halbe Last je Gurt, dazu die Torsion
 *            als gegenläufiges Kräftepaar
 *   σ_örtl   die örtliche Biegung zwischen zwei Bindeblechen, aus der
 *            Querkraft der Rahmenebene
 *
 * Sie werden als Beträge addiert — das ist der ungünstigste Punkt des
 * Querschnitts und braucht keine Annahme darüber, wo er liegt.
 *
 * >>> DIE TABELLE LÄUFT ÜBER DIE NACHWEISSTELLEN. <<<
 *
 * Das sind die Blechstationen plus die vier Randstellen; dazwischen wird
 * nicht nachgewiesen, weil dort nichts springt. Die massgebende Zeile ist
 * hervorgehoben.
 */
export function zeichneAbfangSchnitt(node, ab) {
  const g = ab.gurt;
  const s = g?.schnitt ?? {};
  const q = ab.q ?? {};

  const zeileStelle = (r) => `
    <tr class="${r.x === g?.x ? 'aktiv' : ''}${(r.eta ?? 0) > 1 ? ' nok' : ''}">
      <td class="num">${f2(r.x)}</td>
      <td class="num">${f2(r.schnitt?.Mzz ?? 0)}</td>
      <td class="num stark">${f2(r.N ?? 0)}</td>
      <td class="num">${f2(r.MgurtVert ?? 0)}</td>
      <td class="num">${f3(r.Moertl ?? 0)}</td>
      <td class="num">${f1(r.sigN ?? 0)}</td>
      <td class="num">${f1(r.sigVert ?? 0)}</td>
      <td class="num">${f1(r.sigOertl ?? 0)}</td>
      <td class="num stark">${f1(r.sigma ?? 0)}</td>
      <td class="num ${ampel(r.eta ?? 0)}">${f3(r.eta ?? 0)}</td>
    </tr>`;

  const bl = (ab.bleche?.bleche ?? []);
  const zeileBlech = (b) => `
    <tr class="${(b.eta ?? 0) > 1 ? 'nok' : ''}">
      <td class="num">${f2(b.x)}</td>
      <td>${esc(b.istSteife ? 'Quersteife' : 'Bindeblech')}${
        b.istRand ? '<br><span class="ablage-meta">Randfeld</span>' : ''}</td>
      <td class="num">${b.masse ? `${f0(b.b)}×${f0(b.t)}` : '–'}</td>
      <td class="num">${f2(b.aSum ?? 0)}</td>
      <td class="num">${f2(b.Vebene ?? 0)}</td>
      <td class="num">${f3(b.Mblech ?? 0)}</td>
      <td class="num">${f1(b.sigma ?? 0)}</td>
      <td class="num">${f1(b.tau ?? 0)}</td>
      <td class="num stark">${f1(b.sigmaV ?? 0)}</td>
      <td class="num ${ampel(b.eta ?? 0)}">${f3(b.eta ?? 0)}</td>
    </tr>`;

  node.innerHTML = `
    ${abschnitt('Massgebende Stelle',
      `x = ${f2(g?.x ?? 0)} m · Fall ${esc(s.fall ?? '–')}`)}
    <div class="kennzahlen">
      ${kachel('N Kräftepaar', `${f2(g?.N ?? 0)} kN`,
               `M/e · e = ${f1(q.e ?? 0)} cm`)}
      ${kachel('M Gurt lotrecht', `${f2(g?.MgurtVert ?? 0)} kNm`,
               `davon Torsion ${f2(g?.Mxx ?? 0)}`)}
      ${kachel('M örtlich', `${f3(g?.Moertl ?? 0)} kNm`,
               `Rahmenfeld ${f2(ab.rahmenfeld?.a ?? 0)} m`)}
      ${kachel('σ gesamt', `${f1(g?.sigma ?? 0)}`,
               `kN/cm² · f_yd ${f1(g?.fyd ?? 0)}`)}
      ${kachel('η Gurt', f3(g?.eta ?? 0), esc(q.gurt?.name ?? ''),
               ampel(g?.eta ?? 0))}
    </div>

    ${abschnitt('Schnittgrössen an dieser Stelle')}
    <div class="kennzahlen">
      ${kachel('M Rahmenebene · M_zz', `${f2(s.Mzz ?? 0)} kNm`, 'waagrecht')}
      ${kachel('V Rahmenebene', `${f2(s.Fy ?? 0)} kN`, 'waagrecht')}
      ${kachel('M quer', `${f2(s.Myy ?? 0)} kNm`, 'lotrecht, ganzer Träger')}
      ${kachel('V quer', `${f2(s.Fz ?? 0)} kN`, 'lotrecht')}
      ${kachel('M Torsion', `${f2(s.Mxx ?? 0)} kNm`, 'im Gurt, aus T/e')}
    </div>

    ${abschnitt('Gurtnachweis, Stelle für Stelle',
                'die massgebende Zeile ist hervorgehoben')}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr>
        <th class="num">x [m]</th><th class="num">M_Rahmen [kNm]</th>
        <th class="num">N [kN]</th><th class="num">M_Gurt [kNm]</th>
        <th class="num">M_örtl [kNm]</th>
        <th class="num">σ_N</th><th class="num">σ_vert</th>
        <th class="num">σ_örtl</th><th class="num">σ [kN/cm²]</th>
        <th class="num">η</th></tr></thead>
      <tbody>${(ab.reihe ?? []).map(zeileStelle).join('')}</tbody>
    </table></div>

    ${bl.length ? `
    ${abschnitt('Bindebleche und Quersteifen',
                `${bl.length} Stück · Raster ${f2(ab.rahmenfeld?.a ?? 0)} m`)}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr>
        <th class="num">x [m]</th><th>Art</th><th class="num">b×t [mm]</th>
        <th class="num">a [m]</th><th class="num">V_Ebene [kN]</th>
        <th class="num">M [kNm]</th><th class="num">σ</th><th class="num">τ</th>
        <th class="num">σ_v [kN/cm²]</th><th class="num">η</th></tr></thead>
      <tbody>${bl.map(zeileBlech).join('')}</tbody>
    </table></div>` : ''}

    ${klapp('abfang-schnitt-hinweis', 'Woraus die Spannung besteht', `
      <p class="notiz" style="margin-top:0">
        <b>σ_N</b> ist das Kräftepaar aus dem Moment der waagrechten
        Rahmenebene: N = M/e auf die Gurtfläche, mit e als Abstand der
        Gurt-SCHWERACHSEN (${f1(q.e ?? 0)} cm), nicht dem Aussenmass.</p>
      <p class="notiz"><b>σ_vert</b> ist die lotrechte Biegung. Jeder Gurt
        trägt die HALBE Last über seine starke Achse; dazu kommt die Torsion
        des Trägers als gegenläufiges Kräftepaar — im einen Gurt addiert sie
        sich, im anderen zieht sie ab, und massgebend ist der eine.</p>
      <p class="notiz"><b>σ_örtl</b> ist die Biegung des Gurtes zwischen zwei
        Bindeblechen, aus der Querkraft der Rahmenebene. Nachgewiesen wird am
        ANSCHNITT des Blechs, nicht auf der Knotenachse: über die Blechbreite
        ist die Verbindung biegesteif.</p>
      <p class="notiz">Die drei Anteile werden als BETRÄGE addiert. Das ist
        der ungünstigste Punkt des Querschnitts und braucht keine Annahme
        darüber, wo er liegt.</p>
      <p class="notiz"><b>Nicht enthalten: das KNICKEN des Druckgurtes.</b>
        Die Knicklänge steht aus — der Bindeblechabstand wäre zu
        unkonservativ, weil sich der ganze Träger in beiden Ebenen biegt.</p>`)}`;
  verdrahteKlapp(node);
}

/**
 * DIE AUFLAGER DES ABFANGJOCHS.
 *
 * Weisung vom 10. September: «die reiter schnitt verläufe und auflager beim
 * abfangjoch fertig machen.»
 *
 * Der Reiter zeigte bis hierher das Auflagerblatt des TRAGJOCHS —
 * charakteristische Gruppenwerte eines Ersatzbalkens mit vier Winkelgurten.
 * Am Abfangjoch waren das die Zahlen eines anderen Tragwerks; gemessen an
 * A240 · 12.50 m standen dort 5.21 kN, während das Joch selbst 8.32 abgibt.
 *
 * >>> ES IST EINE ANDERE GLIEDERUNG. <<<
 *
 * Das Tragjoch führt die Reaktionen nach EINWIRKUNGSGRUPPEN auf, damit der
 * Fundamentplaner selbst kombinieren kann. Das Abfangjoch kombiniert
 * SELBST — drei Fälle mit je eigener Regliertemperatur, und der grösste
 * gilt. Aufgeschlüsselt wird deshalb nach FÄLLEN, und je Fall stehen die
 * charakteristischen Anteile daneben, aus denen er entsteht.
 *
 * >>> UND DIE BEIDEN ENDEN SIND NICHT GLEICH. <<<
 *
 * Ein Leiter nahe am einen Mast belastet diesen stärker — beim gemessenen
 * Beispiel 19.72 gegen 7.61 kN. Die Enden stehen deshalb nebeneinander, mit
 * dem Namen des Masten, der sie bekommt.
 */
export function zeichneAbfangAuflager(node, ab, erg) {
  const namen = erg?.modell?.federn?.namen ?? {};
  const nam = (e) => namen[e] || `Ende ${e}`;
  const enden = ['A', 'B'].filter((e) => ab.auflager?.[e]);

  /*
   * DIE ANTEILE EINES FALLES - charakteristisch, wie sie in die Kombination
   * gehen. Sie stehen da, damit man den Bemessungswert nachrechnen kann:
   * γ_G · G + γ_Q · S usw. mit den Beiwerten, die daneben angeschrieben sind.
   */
  const fallZeile = (f, e) => `
    <tr class="${f.key === ab.auflager[e].fall ? 'aktiv' : ''}">
      <td>${esc(f.label)}<br><span class="ablage-meta">γ_G ${f2(f.beiwerte.g)}
        · γ_W ${f2(f.beiwerte.w)} · γ_S ${f2(f.beiwerte.s)}</span></td>
      <td class="num">${f2(f.anteile.G)}</td>
      <td class="num">${f2(f.anteile.S)}</td>
      <td class="num">${f2(f.anteile.Z)}</td>
      <td class="num">${f2(f.anteile.W)}</td>
      <td class="num stark">${f2(fzAuf(f.Fz))}</td>
      <td class="num stark">${f2(f.Fy)}</td>
    </tr>`;

  const tabelle = (e) => `
    ${abschnitt(`Auflager ${nam(e)}`,
                `massgebend: ${esc(ab.auflager[e].fall)}`)}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Fall</th>
        <th class="num">G [kN]</th><th class="num">S [kN]</th>
        <th class="num">Zug [kN]</th><th class="num">Wind [kN]</th>
        <th class="num">F_z,d [kN]</th><th class="num">F_y,d [kN]</th></tr></thead>
      <tbody>${ab.auflager[e].faelle.map((f) => fallZeile(f, e)).join('')}</tbody>
    </table></div>`;

  const A = ab.auflager.A, B = ab.auflager.B;
  node.innerHTML = `
    ${abschnitt('Reaktionskräfte', 'Bemessungswerte, Hüllkurve über alle Fälle, Wind in beiden Richtungen')}
    <div class="kennzahlen">
      ${kachel(`F_y ${nam('A')}`, f2(A?.Fy ?? 0), 'kN · in Gleisrichtung')}
      ${kachel(`F_y ${nam('B')}`, f2(B?.Fy ?? 0), 'kN · in Gleisrichtung')}
      ${kachel(`F_z ${nam('A')}`, f2(fzAuf(A?.Fz)), 'kN · lotrecht, Druck negativ')}
      ${kachel(`F_z ${nam('B')}`, f2(fzAuf(B?.Fz)), 'kN · lotrecht, Druck negativ')}
      ${kachel('F_x total', f2(A?.Fxges ?? 0), 'kN · in Jochachse')}
      ${kachel('Kräftepaar Torsion', f2(A?.Ptors ?? 0),
               `kN je Gurt · Hebel ${f2(2 * (ab.auflager.ey ?? 0))} m`)}
    </div>
    ${enden.map(tabelle).join('')}
    ${klapp('abfang-auflager-hinweis',
            'Achsen, Vorzeichen und was der Anschluss überträgt', `
      <p class="notiz" style="margin-top:0">
        <b>F_y</b> läuft in GLEISRICHTUNG — der Leiterzug und der Wind auf das
        Joch. Das ist die grosse Kraft; sie steht am Mastkopf an und biegt ihn
        über die volle Anschlusshöhe. <b>F_z</b> lotrecht, positiv nach oben
        (rechte Hand) - Druck ist negativ.
        <b>F_x</b> in der Jochachse, aus Wind quer auf die Anbauteile: der
        liegende Träger leitet sie als Normalkraft an seine Enden, und wie sie
        sich auf die beiden Masten verteilt, entscheidet deren
        Kopfsteifigkeit — deshalb steht nur die Summe da.</p>
      <p class="notiz"><b>Der Anschluss leitet KEIN Biegemoment ein.</b> Alle
        Momentengrade der Links sind frei, und die Drehung um z ist bewusst
        gelöst: der vordere Gurt ist in der Jochachse frei, damit das
        Rahmenmoment nicht als Torsion in den Masten läuft. Was bleibt, ist
        das <b>Kräftepaar aus der Torsion</b> des Trägers — zwei gegenläufige
        lotrechte Kräfte im Achsabstand der Gurte, im Masten eine Biegung in
        Gleisrichtung.</p>
      <p class="notiz">Die Spalten <b>G, S, Zug, Wind</b> sind
        CHARAKTERISTISCH; <b>F_z,d</b> und <b>F_y,d</b> sind der
        Bemessungswert des Falles, gebildet mit den Beiwerten, die neben
        seinem Namen stehen. Beim Havariefall sind die ständigen Lasten
        charakteristisch (γ_G = 1.0) und die veränderlichen weg.</p>
      <p class="notiz">Die Zeile mit dem grössten Wert ist hervorgehoben — sie
        ist die massgebende. Welcher Fall das ist, hängt an der Stelle des
        Leiters: nahe an einem Mast bekommt dieser ein Vielfaches des
        anderen.</p>`)}
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
/* ===========================================================================
 * DER KNICKNACHWEIS, AUFGESCHRIEBEN
 * ===========================================================================
 *
 * Weisung vom 12. September: der Nachweis ist im Bericht zu fuehren - und
 * «zu beachten sind auch die massenpunkte und deren hoehe bezogen auf den
 * eingespannten stab (mast)».
 *
 * Bisher stand vom Knicken nur die fertige Zahl in der Ueberschrift. Der Weg
 * dorthin - Knicklaenge, Schlankheit, Knicklinie, Abminderung, die beiden
 * Interaktionsgleichungen - stand nirgends, und die MASSENPUNKTE schon gar
 * nicht.
 *
 * >>> WARUM DIE HOEHEN HIERHER GEHOEREN. <<<
 *
 * Der Mast ist ein eingespannter Kragarm. Eine Druckkraft in der Hoehe a
 * knickt ihn mit N_cr = pi^2 EI / (2a)^2 - je hoeher sie sitzt, desto
 * kleiner die Knicklast. Sitzen mehrere Kraefte auf verschiedenen Hoehen,
 * ist die sichere Idealisierung, sie ALLE auf die oberste zu legen: nach
 * oben verschoben wirkt jede Masse unguenstiger.
 *
 * Genau das rechnet der Kern - `z_N` ist die oberste Krafteinleitung, und
 * `N_Ed` ist der Fusswert, also die SUMME. Was fehlte, war die Liste, an der
 * sich das nachpruefen laesst. Sie steht jetzt da, mit der massgebenden
 * Zeile hervorgehoben.
 * ========================================================================= */
function knickblatt(kS, n) {
  /*
   * >>> NICHT GEFUEHRT IST EINE AUSSAGE, KEINE LEERSTELLE. <<<
   *
   * Weisung vom 15. September: das Knicken des Masten abschaltbar. Hier
   * stand `return ''` - dann fehlte der Abschnitt einfach, und wer das Blatt
   * liest, haelt den Mast fuer nachgewiesen. Der Grund gehoert an die Stelle,
   * an der sonst die Zahl steht.
   */
  if (!kS && n?.knickenGefuehrt === false) {
    return `<p class="notiz stark" style="margin:6px 0 0">
      <b>Biegeknicken nicht gefuehrt</b> — der Nachweis ist im Reiter
      «Nachweise» abgeschaltet. Gerechnet ist allein der Querschnitt;
      η oben sagt nichts über die Stabilität. Halten die Leiter den Masten
      — Rückleiter am Masten, Kettenwerke am Joch —, stellen sich eine
      andere Knicklänge und andere Momente ein als beim freistehenden
      Kragarm, den diese Rechnung ansetzt.</p>`;
  }
  if (!kS) return '';
  const kur = kS.knicklinie ?? {};
  /*
   * NUR DIE LOTRECHTEN. Waagrechte Lasten biegen den Masten, sie druecken
   * ihn nicht - fuer die Knicklaenge zaehlen sie nicht mit.
   */
  const mp = kS.massen ?? [];
  const hoch = kS.ueberAnschluss ?? [];
  const massen = mp.length ? `
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Masse</th><th>angesetzt auf</th>
        <th class="num">z [m]</th><th class="num">P [kN]</th></tr></thead>
      <tbody>${mp.map((l) => `
        <tr><td>${esc(l.name)}</td>
          <td>${esc(l.herkunft)}${Number.isFinite(l.schwerpunkt)
            ? ` <span class="notiz">(Schwerpunkt ${f2(l.schwerpunkt)} m)</span>` : ''}</td>
          <td class="num">${f2(l.z)}</td>
          <td class="num">${f2(l.P)}</td></tr>`).join('')}
        <tr class="aktiv"><td colspan="2">Ersatzhöhe nach Rayleigh</td>
          <td class="num"><b>${f2(kS.zN)}</b></td>
          <td class="num">${f2(mp.reduce((a, x) => a + x.P, 0))}</td></tr>
      </tbody></table></div>
    <p class="notiz" style="margin:4px 0 0">Die Jochlast sitzt auf der
      <b>Anschlusshöhe</b>, jedes Anbauteil am Masten auf seiner eigenen
      <b>Befestigungshöhe</b> — dort tritt es in den Masten ein. Das
      Eigengewicht des Mastes geht <b>verteilt</b> ein; die Höhe in
      der Tabelle ist die, auf der eine Punktmasse dasselbe täte — sie liegt bei
      0.60 der Länge, nicht beim Schwerpunkt.</p>
    <p class="notiz">Mehrere Massen auf mehreren Höhen lassen sich nicht durch
      eine einzige ersetzen. Die <b>Ersatzhöhe</b> folgt deshalb aus dem
      Rayleigh-Quotienten mit der Knickfigur des Kragarms
      w = δ[1 − cos(πz/2L)]: aus g(a) = a/2 − (L/2π)·sin(πa/L) und
      g(z_eq) = Σ P_i·g(a_i) / Σ P_i. Für <b>eine</b> Last an der Spitze ist
      g = L/2, und daraus wird N_cr = π²EI/(2L)² — die Eulerlast des Kragarms,
      exakt. Die verteilte Last steht mit ihrem Integral
      ∫g dz = L²(¼ − 1/π²) im selben Quotienten.</p>
    ${hoch.length ? `<p class="notiz"><b>Über dem Anschluss:</b> ${
      hoch.map((l) => `${esc(l.name)} auf ${f2(l.z)} m (F_z ${f2(fzAuf(l.Fz))} kN)`).join(', ')}
      — auf der eigenen Höhe gerechnet, nicht auf ${f2(kS.zAnschluss)} m.</p>` : ''}`
    : `<p class="notiz" style="margin:4px 0 0">Keine lotrechte Krafteinleitung
       — es gilt die ganze Mastlänge als Knicklänge.</p>`;
  const z = (v, s2 = 2) => (Number.isFinite(v) ? (s2 === 3 ? f3(v) : f2(v)) : '–');
  return `${klapp(`mast-knick-${n.ende}`,
    `Knicknachweis · L_cr ${z(kS.Lcr)} m · η ${f3(kS.eta)}`, `
    ${massen}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th></th><th class="num">um y (stark)</th>
        <th class="num">um z (schwach)</th></tr></thead>
      <tbody>
        <tr><td>Knicklänge L_cr = β · z_eq</td>
            <td class="num" colspan="2">${z(kS.beta)} · ${z(kS.zN)} =
                <b>${z(kS.Lcr)} m</b></td></tr>
        <tr><td>N_cr = π²·E·I / L_cr²  [kN]</td>
            <td class="num">${z(kS.NcrY)}</td><td class="num">${z(kS.NcrZ)}</td></tr>
        <tr><td>N_Rk = A · f_y  [kN]</td>
            <td class="num" colspan="2">${z(kS.NRk)}</td></tr>
        <tr><td>bezogene Schlankheit λ̄</td>
            <td class="num">${z(kS.lamY, 3)}</td><td class="num">${z(kS.lamZ, 3)}</td></tr>
        <tr><td>Knicklinie (α)</td>
            <td class="num">${kur.y ?? '–'} (${z(kS.alphaY, 3)})</td>
            <td class="num">${kur.z ?? '–'} (${z(kS.alphaZ, 3)})</td></tr>
        <tr><td>Abminderung χ</td>
            <td class="num">${z(kS.chiY, 3)}</td><td class="num">${z(kS.chiZ, 3)}</td></tr>
        <tr><td>N_K,Rd = χ · N_Rk / γ_M  [kN]  <span class="notiz">4.5.1.3</span></td>
            <td class="num">${z(kS.NKyRd)}</td><td class="num">${z(kS.NKzRd)}</td></tr>
        <tr><td>Vergrösserungsfaktor 1/(1 − N_Ed/N_cr)</td>
            <td class="num">${z(kS.vy, 3)}</td><td class="num">${z(kS.vz, 3)}</td></tr>
        <tr><td>M_Ed  [kNm]</td>
            <td class="num">${z(kS.MyEd)}</td><td class="num">${z(kS.MzEd)}</td></tr>
        <tr><td>M_Rd = W · f_y / γ_M  [kNm]  <span class="notiz">5.1.3</span></td>
            <td class="num">${z(kS.MyRd)}</td><td class="num">${z(kS.MzRd)}</td></tr>
      </tbody></table></div>
    <div class="tabellenrahmen"><table class="dt">
      <tbody>
        <tr class="aktiv"><td><b>Gleichung (50)</b> — SIA 263, Ziffer 5.1.10.1<br>
          <span class="notiz">N_Ed/N_K,Rd + ω_y/(1−N_Ed/N_cr,y)·M_y,Ed/M_D,Rd
          + ω_z/(1−N_Ed/N_cr,z)·M_z,Ed/M_z,Rd</span></td>
          <td class="num ${kS.eta50 > 1 ? 'fail' : ''}"><b>${f3(kS.eta50)}</b></td></tr>
        <tr><td>Gleichung (51) — Ziffer 5.1.10.2, zulässige Alternative<br>
          <span class="notiz">(ω_y M_y,Ed/M_y,red,Rd)^β + (ω_z M_z,Ed/M_z,red,Rd)^β
          · β = ${z(kS.beta51, 3)} · M_red,Rd ${z(kS.MyredRd)} / ${z(kS.MzredRd)} kNm</span></td>
          <td class="num">${Number.isFinite(kS.eta51) ? f3(kS.eta51) : '–'}</td></tr>
      </tbody></table></div>
    <p class="notiz" style="margin:4px 0 0">N_Ed = <b>${z(kS.NEd)} kN</b>
      (Fusswert, also die Summe aller Massen) · N_K,Rd = <b>${z(kS.NKRd)} kN</b>
      (Minimum beider Achsen, 5.1.10.1) · ω = ${z(kS.omega, 3)} ·
      γ_M = ${z(kS.gammaM1, 3)}. Geführt wird <b>Gleichung (50)</b>.
      ${kS.ohneNachweis ? 'Unter λ̄ = 0.2 verlangt die Norm keinen Knicknachweis.' : ''}</p>
    <p class="notiz"><b>Der Nachweis ist nach SIA 263 gefuehrt.</b> Die
      Knickkurve nach Ziffer 4.5.1 — χ = 1/(Φ + √(Φ²−λ̄²)) mit
      Φ = 0.5[1 + α(λ̄−0.2) + λ̄²] —, die Widerstände nach 4.5.1.3 und 5.1.3,
      die Interaktion nach 5.1.10.1. <b>ω = 1.0</b> nach Ziffer 5.1.10.3: bei
      querbelasteten Stäben ist der Beiwert der Momentenverteilung zu 1.0 zu
      setzen, und der Mast trägt Wind über die ganze Höhe. Das <b>Moment
      zweiter Ordnung</b> steckt im Vergrösserungsfaktor; N_Ed und M_Ed sind
      deshalb Werte nach Theorie 1. Ordnung, ohne Ersatzimperfektionen, wie
      die Norm es verlangt.</p>
    <p class="notiz"><b>Nicht gefuehrt: das Kippen</b> (Ziffer 4.5.2). An die
      Stelle von M_D,Rd tritt M_y,Rd. Beim eingespannten Stiel mit Momenten um
      beide Achsen ist das die übliche Annahme; sie steht hier, damit sie
      nachgeprüft werden kann. Gleichung (51) setzt „Knicken aus der Ebene und
      Kippen nicht verhindert“ voraus und gilt für doppeltsymmetrische
      I-Querschnitte — beides trifft zu; die Norm lässt mit „darf“ die Wahl,
      gefuehrt wird die strengere und bedingungslose (50).</p>`)}`;
}

/* ===========================================================================
 * DAS BLATT EINES MASTEN - die Tabelle ueber seine Hoehe.
 * ===========================================================================
 *
 * Seit dem 16. September EINZELN aufrufbar: der Reiter Auflager packt jeden
 * Masten in seine eigene Klappe (Weisung: «wie könnte man bei mehreren
 * Masten / Jochenden eine bessere übersicht in der sidebar ermöglichen»),
 * waehrend Uebersicht und Abfangjoch weiter das ganze Blatt nehmen. Eine
 * Funktion, drei Verwendungen - statt dreier Tabellen, die auseinanderlaufen.
 */
function mastEndeHtml(n, namenVon = {}, mitKopf = true) {
    if (!n) return '';
    const kl = n.klasse;
    const zeile = (st) => `
      <tr class="${st.z === n.massgebend.z ? 'aktiv' : ''}">
        <td class="num">${f2(st.z)}</td>
        <td class="num">${f2(fzAuf(st.Fz))}</td>
        <td class="num">${f2(st.Fx)}</td>
        <td class="num">${f2(st.Fy)}</td>
        <td class="num">${f2(st.Myy)}</td>
        <td class="num">${f2(st.Mxx)}</td>
        <td class="num">${f3(st.Mzz)}</td>
        <td class="num">${f0(st.sigW ?? 0)}</td>
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
    /*
     * DER EIGENE KOPF ENTFAELLT IN EINER KLAPPE (16. September). Dort steht
     * der Name schon im Klappenkopf, und zweimal dasselbe untereinander
     * liest niemand als zwei Angaben - es sieht nach einem Fehler aus.
     */
    return `${mitKopf ? abschnitt(`Mast ${name} · ${n.profil.name}`,
        `η ${f3(n.eta)} Querschnitt bei ${f2(n.massgebend.z)} m`
        + (kS ? ` · η ${f3(kS.eta)} Knicken` : '')) : ''}
      <div class="tabellenrahmen"><table class="dt">
        <!-- =================================================================
             >>> ZWEI KOPFZEILEN: DIE EBENE UND DIE ACHSE. <<<
             =================================================================

             Weisung vom 15. September: «berichtigen und durchgängigkeit zu
             axisvm schaffen.»

             Seit der Umstellung auf globale Grössen (15. September, «konvention
             app global nachziehen») nennt die OBERE Zeile die Grösse selbst —
             F_x/F_y/F_z, M_xx/M_yy/M_zz um die globalen Achsen, dieselben
             Namen wie am Joch, im Anbauteilsatz und in der AxisVM-Ausleitung.
             Die UNTERE sagt, was sie am stehenden Masten anrichtet.

             Vorher stand es umgekehrt, und die Anschrift trug Minuszeichen:
             der Nachweis rechnete in Ebenen, und die Rechte-Hand-Regel gibt
             für x und y gegenläufige Drehsinne. Die Minuszeichen sitzen jetzt
             im Rechenweg, wo sie hingehören, statt in der Überschrift.
             ============================================================= -->
        <thead><tr>
          <th class="num">z [m]</th><th class="num">F_z [kN]</th>
          <th class="num">F_x [kN]</th><th class="num">F_y [kN]</th>
          <th class="num">M_yy [kNm]</th><th class="num">M_xx [kNm]</th>
          <th class="num">M_zz [kNm]</th>
          <th class="num">σ_ω [N/mm²]</th>
          <th class="num">σ [N/mm²]</th><th class="num">η</th>
        </tr><tr class="kopf-achse">
          <th></th><th class="num">Normalkraft</th>
          <th class="num">quer</th><th class="num">längs</th>
          <th class="num">Biegung quer</th><th class="num">Biegung längs</th>
          <th class="num">Torsion</th>
          <th class="num">aus Torsion</th><th class="num">gesamt</th><th></th>
        </tr></thead>
        <tbody>${[...n.stationen].reverse().map(zeile).join('')}</tbody>
      </table></div>
      ${knickblatt(kS, n)}
      <p class="notiz" style="margin:4px 0 0">
        Querschnittsklasse <b>${kl.klasse}</b> (Flansch c/t ${f1(kl.flansch.ct)},
        Steg ${f1(kl.steg.ct)}) · Widerstand ${n.plastischWirksam
          ? `<b>plastisch</b>, W_pl aus der Profilgeometrie (${f0(n.Wq)} / ${f0(n.Wl)} cm³)`
          : `elastisch, W_el (${f0(n.Wq)} / ${f0(n.Wl)} cm³)`}${
        n.plastischGewuenscht && !n.plastischWirksam
          ? ` — <b>plastisch verlangt, aber Klasse ${kl.klasse}</b>: dort ist die
              Fliessgelenkschnittgrösse nicht erreichbar` : ''} ·
        Anteil an F_x nach k = 3EI/H³: <b>${f0(n.anteilFx * 100)} %</b>${
        /*
         * >>> WAS DIE TABELLE FUEHRT UND DER NACHWEIS NICHT KENNT. <<<
         *
         * M_t steht in der Spalte, geht aber in kein η ein - σ kommt aus
         * N, M_q und M_l. Solange die Torsion aus Hebelarmen entsteht, ist
         * sie am Rundmasten klein; seit ein eingepraegtes M_zz dort ankommt
         * (15. September), kann sie es nicht mehr sein. Dann muss dastehen,
         * dass sie nicht nachgewiesen ist - eine Zahl in einer Tabelle
         * sieht sonst aus wie eine gefuehrte Groesse.
         */
        /*
         * >>> DIE TORSION STECKT JETZT IM NACHWEIS (15. September). <<<
         *
         * Bis dahin stand hier, dass sie gefuehrt, aber nicht nachgewiesen
         * werde. Seit dem Woelbkrafttorsionsnachweis ist sie eine
         * NORMALSPANNUNG im Flansch und addiert sich zu den uebrigen. Wo
         * eine da ist, gehoert dazugesagt, WIE sie gerechnet ist - der
         * Ansatz steckt eine Annahme (woelbeingespannter Fuss), und die
         * darf nicht in einer Zahl verschwinden.
         */
        n.stationen.some((st) => Math.abs(st.sigW ?? 0) > 0.5)
          ? ` · <b>M_zz als Wölbkrafttorsion nachgewiesen</b> — σ_ω aus dem
              Bimoment am wölbeingespannten Fuss, Abklinglänge
              ${f0(100 / (n.woelb?.k ?? 1))} cm` : ''}</p>`;
}

function mastblattHtml(erg) {
  const mn = erg?.mast;
  if (!mn) return '';
  const namenVon = erg?.modell?.federn?.namen ?? {};
  const ende = (n) => mastEndeHtml(n, namenVon);
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
      ${mn.knickenGefuehrt === false ? `
      <p class="notiz stark"><b>Das Biegeknicken ist NICHT gefuehrt</b> —
        im Reiter «Nachweise» abgeschaltet. η ist die
        Querschnittsausnutzung und kein Stabilitätsurteil.</p>` : `
      <p class="notiz"><b>Das Biegeknicken ist enthalten</b> — SIA 263,
        Ziffer 4.5.1 für die Knickkurve und 5.1.10.1, Gleichung (50), für
        Druck mit zweiachsiger Biegung. Die Knicklänge ist β · z_eq; die
        Ersatzhöhe z_eq folgt aus dem Rayleigh-Quotienten über alle Massen
        (Einzelheiten im Knicknachweis je Mast). β steht in den Optionen
        (Vorgabe 2.0, Kragarm).</p>`}
      <p class="notiz"><b>NICHT enthalten: das Kippen</b> (Ziffer 4.5.2,
        χ_LT = 1.0). Beim eingespannten Stiel mit Momenten um beide Achsen
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
export function stuecklisteHtml(erg, opt = {}) {
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
      Erfasst sind Gurtwinkel und Bindebleche. Der Tabellenwert der
      Sortimentszeichnung enthält zusätzlich Stosslaschen, Anschlusswinkel und
      Verschraubung - die Stückliste liegt deshalb meist etwas darunter
      (gemessen: J90/20 m gleich, J130/30 m rund 5 %). <b>Nur Information,
      kein Nachweis.</b>
      ${/* 7. Oktober, «stimmt dieser text noch?»: seit dem 6. Oktober wiegt
          das Stabwerk die Stäbe selbst - der Tabellenwert gilt nur noch im
          Ersatzbalken. */ ''}
      ${opt.stabwerk
        ? `<br>In der Rechnung (Stabwerk): das Gewicht der Stäbe selbst, A · ρ je Gurt,
           Blech und Mast wie AxisVM, dazu der Zuschlag g_Zusatz der Karte Lasten.
           Der Tabellenwert dient nur diesem Abgleich.`
        : m.char?.herkunft?.eigengewicht
          ? `<br>In der Rechnung (Ersatzbalken) angesetzt: ${esc(m.char.herkunft.eigengewicht)}.` : ''}
    </div>`)}`;
}

/**
 * Optionen-Dialog: alle Einstellungen, die das Rechenmodell steuern, aber
 * nicht zum Bauteil gehören. Sie stehen bewusst nicht in der Eingabe, damit
 * die Sidebar auf Geometrie, Profile, Anbauteile und Lasten beschränkt bleibt.
 */
export function optionenHtml(werte, thema = null) {
  if (thema === 'nachweise') return verfahrenHtml(werte) + nachweiseHtml(werte);
  if (thema === 'daten') return datenbasisHtml();
  const teile = optionenFelder(werte, thema);
  // Ein einzelner Abschnitt im Reiter braucht seine Ueberschrift nicht: der
  // Reiter traegt sie bereits, und zweimal dasselbe Wort untereinander liest
  // sich wie ein Fehler.
  const titelZeigen = teile.length > 1;
  // Im Stabwerk fehlen die Felder des Ersatzbalkens (OPTIONEN_NUR_ERSATZBALKEN);
  // ein Satz sagt, wo sie sind - sonst sähe der Reiter wie beschnitten aus.
  const ohne = thema === 'modell' && werte?.rechenverfahren !== 'ersatzbalken'
    ? '<p class="notiz">Torsion, Aufteilung auf die Gurte, Knoten und Bindebleche '
      + 'steuern nur den Ersatzbalken; im Stabwerk wirken sie nicht und stehen '
      + 'deshalb nicht da (Rechenverfahren unter <b>Nachweise</b>).</p>' : '';
  return teile.map((a) =>
    (titelZeigen ? abschnitt(a.titel) : '')
    + a.felder.map((f) => feldHtml(f, feldWert(f, werte), werte)).join('')
  ).join('') + ohne;
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
  /*
   * >>> EIN ORT, NICHT ZWEI (Weisung, 20. September). <<<
   *
   * Hier standen ein Dateifeld fuer das Datenpaket und ein Knopf zum
   * Sichern - und im Fenster «Bauteildaten» stand das Einlesen je
   * Sortiment. Zwei Tueren mit aehnlichen Namen, und keine sagte, wofuer
   * die andere da ist. Alles das steht jetzt im Fenster; hier bleibt, was
   * gilt, und der Weg dorthin.
   */
  return `
    <p class="notiz">Jochtypen, Abfangjoche, Anbauteil-Vorlagen, Lasttabelle,
      Masttypen und Anker sind die Datenbasis. Sie liegt als Datenpaket im
      Browser — gespeichert allein hier und nirgends hingeschickt.</p>
    <p class="notiz" id="d-paket-stand">${v
      ? `Hinterlegt: <b>${esc(v.bezeichnung ?? 'ohne Bezeichnung')}</b>`
        + `${v.stand ? ` · Stand ${esc(v.stand)}` : ''}`
      : 'Zurzeit ist kein Paket im Browser hinterlegt — die Daten kommen aus '
        + 'den Dateien neben der Anwendung.'}</p>
    <p class="notiz">Ansehen, einlesen, laden und sichern steht beisammen im
      Fenster <b>Bauteildaten</b>.</p>
    <div class="opt-knoepfe">
      <button class="btn btn-acc" type="button" data-daten-fenster>Bauteildaten öffnen</button>
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
/* ===========================================================================
 * >>> DAS RECHENVERFAHREN - EINE WAHL, KEIN SCHALTER. <<<
 * =========================================================================
 *
 * Weisung vom 25. September: «ersatzbalken als optionales rechenverfahren
 * in den optionen auswählbar machen, primär den löser nutzen».
 *
 * Die beiden Wege sind nicht «genauer» und «ungenauer» im Sinne einer
 * Rundung - sie sehen VERSCHIEDENES. Der Ersatzbalken kann die Biegung
 * eines Blechs aus seiner Ebene heraus gar nicht führen; am Tragwerk mit
 * Masten sind das 29 % der Blechspannung (gemessen, `vergleich_blech.mjs`).
 * Deshalb steht hier, was jeder Weg TUT, und nicht bloss ein Haken.
 * ========================================================================= */
export function verfahrenHtml(werte) {
  const jetzt = werte?.rechenverfahren === 'ersatzbalken'
    ? 'ersatzbalken' : 'stabwerk';
  return `${abschnitt('Rechenverfahren')}
    <p class="notiz">Beide rechnen dasselbe Tragwerk. Der Unterschied ist,
      <b>was sie sehen können</b> — nicht, wie genau sie rundet.</p>`
    + RECHENVERFAHREN.map((v) => `
    <div class="nw-wahl">
      <label>
        <input type="radio" name="rechenverfahren" data-verfahren="${esc(v.key)}"
          ${jetzt === v.key ? 'checked' : ''}>
        <span class="nw-titel">${esc(v.titel)}</span>
      </label>
      <p class="notiz">${esc(v.was)}</p>
    </div>${v.key === 'stabwerk' ? auslosungHtml(werte, jetzt !== 'stabwerk') : ''}`).join('');
}

/*
 * >>> ECHTZEIT ODER KNOPF ALS UNTERPUNKTE DES STABWERKS (6. Oktober). <<<
 * Weisung: «setze diese zwei als unterpunkte beim stabwerk (genau), somit
 * haben sie keine relevanz wenn man ersatzbalken auswählt.» Eingerückt unter
 * dem Stabwerk, beim Ersatzbalken ausgegraut und gesperrt.
 */
function auslosungHtml(werte, aus) {
  return STABWERK_AUSLOESUNG.map((v) => `
    <div class="nw-wahl nw-unter${aus ? ' nw-gesperrt' : ''}">
      <label>
        <input type="radio" name="stabwerkAuslosung" data-auslosung="${esc(v.key)}"
          ${stabwerkAuslosungVon(werte) === v.key ? 'checked' : ''}${aus ? ' disabled' : ''}>
        <span class="nw-titel">${esc(v.titel)}</span>
      </label>
      <p class="notiz">${esc(v.was)}${v.key === 'echtzeit'
        ? ' - nur wenn sich etwas ändert, das das Ergebnis betrifft (Ansicht, Schrift, Masskette, Mastnummer rechnen nicht neu)' : ''}.</p>
    </div>`).join('');
}

export function nachweiseHtml(werte) {
  const nw = nachweiseAuswahl(werte.nachweise);
  /*
   * >>> `was` DARF EINE FUNKTION SEIN. <<<
   *
   * Seit dem 11. September haengt der Text der Gruppe `knickenJoch` an der
   * Tragwerksart - beim Abfangjoch steht dort der Druckgurt, beim Tragjoch
   * Gesamtstab und Einzelwinkel. `urteilKonstruktion` ruft sie auf, diese
   * Liste nicht: sie reichte die FUNKTION an `esc` weiter und druckte deren
   * Quelltext in die Maske. Gefunden am 15. September beim Einbau der
   * Gruppe `knickenMast`.
   */
  const art = tragwerksart(werte).key;
  const wasVon = (g) => (typeof g.was === 'function' ? g.was(art) : g.was);
  return `<p class="notiz">Ein nicht gefuehrter Nachweis zählt <b>nie als
    erfüllt</b>. Er wird im Urteil, im Bericht und in der Ausleitung
    ausdrücklich als nicht gefuehrt genannt.</p>`
    + NACHWEISGRUPPEN.map((g, i) => {
      /*
       * >>> OBERSCHALTER UND UNTERPUNKTE (30. September). <<<
       * Ein Unterpunkt zeigt SEINE Wahl (nicht die mit dem Oberschalter
       * verrechnete) und ist gesperrt, solange der Oberschalter aus ist -
       * so kommt beim Wiedereinschalten zurück, was man vorher hatte. Der
       * Grenzwert steht auf derselben Zeile; unter dem Oberschalter die
       * Referenzhöhe.
       */
      const eigen = (werte.nachweise?.[g.key] ?? g.standard) === true;
      const gesperrt = !g.vorhanden || (g.unterVon && !nw[g.unterVon]);
      const kopf = g.ober && NACHWEISGRUPPEN[i - 1]?.ober !== g.ober
        && NACHWEISGRUPPEN[i - 1]?.key !== g.unterVon;
      return `${kopf ? `<p class="nw-ober">${esc(g.ober)}</p>` : ''}
    <div class="nw-wahl${g.vorhanden ? '' : ' fehlt'}${g.ober ? ' nw-unter' : ''}${gesperrt && g.vorhanden ? ' nw-gesperrt' : ''}">
      <div class="nw-zeile">
        <label>
          <input type="checkbox" data-nachweis="${esc(g.key)}"
            ${(g.unterVon ? eigen : nw[g.key]) ? 'checked' : ''}${gesperrt ? ' disabled' : ''}>
          <span class="nw-titel">${esc(g.titel)}</span>
        </label>
        ${g.grenze ? grenzFeldHtml(werte, g.grenze, gesperrt) : ''}
      </div>
      <p class="notiz">${esc(wasVon(g))}</p>
      ${g.vorhanden ? '' : '<p class="notiz stark">In diesem Werkzeug nicht '
        + 'enthalten, separat zu führen.</p>'}
      ${g.key === 'gebrauch' ? `<div class="nw-referenz">${gzgReferenzHtml(werte, !nw.gebrauch)}</div>` : ''}
    </div>`;
    }).join('');
}

/** Das Zahlenfeld des Grenzwerts neben seinem Schalter (30. September). */
function grenzFeldHtml(werte, gz, gesperrt) {
  const gr = verformungGrenzen(werte);
  const wert = { gzgGrenzeFahrdraht: Math.round(gr.fahrdraht * 1e4) / 10,
                 gzgGrenzeSpitze: gr.spitzeN, gzgGrenzeVerdrehung: gr.verdrehungGrad }[gz.feld];
  return `<span class="nw-grenze-eingabe">${esc(gz.vor)}<input type="number"
      data-grenze="${esc(gz.feld)}" min="0.1" step="${gz.feld === 'gzgGrenzeVerdrehung' ? 0.5 : 1}"
      value="${esc(String(wert))}"${gesperrt ? ' disabled' : ''}
      title="Vorgabe ${esc(String(gz.vorgabe))}${esc(gz.nach ? ` ${gz.nach}` : '')} - leer setzt sie zurück">${esc(gz.nach)}</span>`;
}

/* ===========================================================================
 * >>> DIE REFERENZHÖHE (30. September). <<<
 * Weisung: «dazu noch die eingabe der relevanten höhe, was man auch beim
 * fahrdraht in den optionen eingeben sollte können. (fahrdraht / Tragjoch /
 * Ausleger oder selbst eingegeben höhe) … man könnte diese grenze auch unter
 * gebauchstauglichkeit in der sidebar übersicht aufführen und umschaltbar
 * machen». Dieselbe Wahl in den Optionen und im GZG-Block der Übersicht;
 * `data-gzg-feld` meldet `gzgReferenz` bzw. `fdHoehe` (die eigene Höhe).
 * ========================================================================= */
export const GZG_REFERENZEN = [
  { key: 'auto', titel: 'automatisch (Fahrdraht, sonst Ausleger, sonst Jochauflager)' },
  { key: 'fahrdraht', titel: 'Fahrdraht' },
  { key: 'ausleger', titel: 'Ausleger' },
  { key: 'joch', titel: 'Jochauflager' },
  { key: 'eigen', titel: 'eigene Höhe' },
];
export function gzgReferenzHtml(werte, gesperrt = false, kurz = false) {
  const ref = werte.gzgReferenz ?? (Number(werte.fdHoehe) > 0 ? 'eigen' : 'auto');
  const h = Number(werte.fdHoehe) || 0;
  return `<label class="gzg-referenz">
      <span>Referenzhöhe</span>
      <select data-gzg-feld="gzgReferenz"${gesperrt ? ' disabled' : ''}>${GZG_REFERENZEN.map((r) =>
        `<option value="${r.key}"${r.key === ref ? ' selected' : ''}>${esc(kurz && r.key === 'auto' ? 'automatisch' : r.titel)}</option>`).join('')}</select>
      ${ref === 'eigen' ? `<input type="number" data-gzg-feld="fdHoehe" min="0" step="0.05"
        value="${h > 0 ? h : ''}" placeholder="m"${gesperrt ? ' disabled' : ''}
        title="Über dem Mastfuss, höchstens bis zum Mastkopf"> m` : ''}
    </label>`;
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

/**
 * >>> F_z DER KRÄFTE AM MASTFUSS UND AM AUFLAGER, NACH OBEN (1. Oktober). <<<
 * Rückfrage «Wirkung, z nach oben»: Fuss- und Auflagerkräfte stehen als
 * Wirkung auf Masten bzw. Fundament in Achsrichtung - F_x, F_y und die
 * Momente wie bisher, F_z nach der rechten Hand nach oben: Druck ist
 * negativ, wie ein Gewicht in der Eingabe. Der Kern führt F_z nach unten;
 * gedreht wird nur hier, in der Anzeige. Die Reaktionstabelle und der
 * Fundamentnachweis (V gegen die zulässigen Werte) zählen weiter Druck
 * positiv.
 */
export const fzAuf = (v) => -(Number(v) || 0);

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
  // Das Diagramm der Auflagerbedingung steht auch hier - als Voreinstellung.
  verdrahteAuflagerLinks(container, werte, onChange);
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
    <tr class="lf-zeile${k.istMassgebend ? ' aktiv' : ''}${k.nachweis ? '' : ' char'}" data-lf-wahl="${esc(k.key)}"
        title="Anklicken: diesen Lastfall im 3D, oben und rechts zeigen">
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
      ${/* Nachgeführt am 6. Oktober («diesen textblock hinterfragen ob es dem
           jetzigen stand entspricht»). */''}
      Die Zahlen nennen Joch und Anbauteile; <b>Eigengewicht und Wind der
      Masten</b> sind darin nicht enthalten, sie stehen am Masten. Das
      Stabwerk wiegt die Stäbe selbst (wie AxisVM), die Laufmeterlast der
      Tabelle gilt dem Ersatzbalken. <b>Begleitend</b> wirkt ψ₀ · Q_k, ohne
      γ_Q (SIA 260 Gl. 16).
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
export function datenbankText(stand, fehler, ohneMasten = false) {
  if (fehler.length) return `Datenbank: ${fehler.length} Beanstandung(en)`;
  const t = [];
  /*
   * >>> DAS FEHLENDE SORTIMENT GEHOERT IN DIE FUSSLEISTE (20. September).
   *
   * Ohne Masten-Sortiment gibt es keine Windlast auf den Masten - und das
   * sah man bis dahin nirgends, bis auf den Hinweis ueber dem Ergebnis.
   * Hier steht der Datenstand; hier gehoert es hin.
   */
  if (ohneMasten) t.push('OHNE Masten-Sortiment (kein Mastwind)');
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
