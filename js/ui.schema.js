/**
 * ui.schema.js
 * ---------------------------------------------------------------------------
 * DEKLARATIVES EINGABESCHEMA. Kein DOM, keine Rechnung.
 *
 * Eingabemaske, Standardwerte, Ausleitung und Beschriftung entstehen ALLE aus
 * dieser Liste. Ein neues Feld wird hier ergänzt - sonst nirgends.
 *
 * Feldtypen
 *   'zahl'        Zahlenfeld
 *   'schieber'    Zahlenfeld mit Schieberegler (min/max/schritt, auch dynamisch)
 *   'auswahl'     Auswahlliste
 *   'schalter'    Ja/Nein
 *   'anbauteile'  Sondersteuerung: Kachelvorrat und Tabelle der Anbauteile
 *
 * sichtbar(werte) blendet Felder kontextabhängig aus.
 * ausDB kennzeichnet Felder, die aus der Typendatenbank stammen und erst nach
 * «Werte bearbeiten» überschreibbar sind.
 * ---------------------------------------------------------------------------
 */

import { PROFILE, STAHLGUETEN } from './data.profiles.js';
import { tragjoche, teilung, laengenbereich } from './data.tragjoche.js';
import { MASTPROFILE, STEGRICHTUNGEN } from './data.masten.js';
import { AUSRICHTUNGEN } from './geometry.js';
import { MASSVARIANTEN, BLECHQUELLEN } from './core.vierendeel.js';
import { TORSIONSVERTEILUNGEN, EBENEN_UEBERLAGERUNG, GURTAUFTEILUNGEN,
         SPANNUNGSMODELLE, KNOTENBEREICHE } from './core.querschnitt.js';
import { TORSIONSMODELLE } from './core.statics.js';

import { ENDBEDINGUNGEN, MASTANSCHLUESSE } from './core.auflager.js';
import { WIND_KLASSEN, SCHNEE_KLASSEN, LASTHERKUNFT,
         NORMENSAETZE } from './core.lasten.js';

const opt = (arr, k = 'key', l = 'label') => arr.map((x) => ({ wert: x[k], text: x[l] }));

export const GRUPPEN = [
  { id: 'typ',   titel: 'Tragjoch-Typ und Rechenmasse' },
  { id: 'geo',   titel: 'Systemgeometrie' },
  { id: 'aufl',  titel: 'Auflager / Mast' },
  { id: 'prof',  titel: 'Gurtprofile' },
  { id: 'blech', titel: 'Bindebleche' },
  // Ohne eigene Eingabefelder: die Stückliste wird als Ergebnisstück
  // eingehängt (siehe extras in app.js).
  { id: 'stueck', titel: 'Stückliste und Eigengewicht' },
  { id: 'trasse', titel: 'Trasse und Fahrleitung' },
  { id: 'anbau', titel: 'Anbauteile' },
  { id: 'ein',   titel: 'Verteilte Einwirkungen' },
  { id: 'komb',  titel: 'Lastfälle' },
  { id: 'ansicht', titel: 'Modellansicht' },
];

/** Orientierung der Schnittebene im Modell. */
export const SCHNITT_ORIENTIERUNGEN = [
  { key: 'quer', label: 'quer zur Jochachse (Regelfall)',
    beschreibung: 'Schnitt senkrecht zur Jochachse, mittig zwischen zwei ' +
                  'Bindeblechen. Zeigt die Gurtnormalkräfte und die vier ' +
                  'Ebenenquerkräfte an dieser Stelle.' },
  { key: 'vertikal', label: 'längs, Vertikalebene',
    beschreibung: 'Schnitt in der Ebene der stehenden Bindebleche. Zeigt die ' +
                  'Vertikalbleche über die ganze Länge mit ihren Schnittkräften.' },
  { key: 'horizontal', label: 'längs, Horizontalebene',
    beschreibung: 'Schnitt in der Ebene der liegenden Bindebleche des ' +
                  'Obergurts. Zeigt die Horizontalbleche mit ihren Schnittkräften.' },
];

export const FELDER = [
  // --- Typ und Rechenmasse -------------------------------------------------
  {
    key: 'typ', gruppe: 'typ', typ: 'auswahl', label: 'Tragjoch-Typ',
    standard: 'J90', optionen: [],
    hinweis: 'Setzt Profile, Masse, Teilung, Bindebleche und Tabellenlasten aus ' +
             'data/tragjoche.json.',
  },
  {
    key: 'massVariante', optionenDialog: true, gruppe: 'typ', typ: 'auswahl', label: 'Hebelarme aus',
    standard: 'schwerpunkt', optionen: opt(MASSVARIANTEN),
  },

  // --- Systemgeometrie -----------------------------------------------------
  {
    // Die Spannweite ist NICHT gesperrt: sie ist die Grösse, die am häufigsten
    // variiert wird. Der Schieber ist auf den Sortimentsbereich des Typs
    // begrenzt, damit man nicht unbemerkt aus dem Katalog läuft.
    key: 'L', gruppe: 'geo', typ: 'schieber', label: 'Jochlänge', sym: 'jt',
    einheit: 'm', standard: 20.0, min: 8, max: 34.5, schritt: 0.5,
    hinweis: 'Schieberbereich = Sortiment des gewählten Typs.',
  },
  // a₁ ist NICHT die Regelteilung, sondern das Endfeld am Auflager (750 mm
  // nach Zeichnung). Wo eine Mass-Tabelle vorliegt, kommt die Teilung dazwischen
  // aus ihr und wird nicht gerechnet.
  { key: 'a1', gruppe: 'geo', typ: 'schieber', label: 'Endfeld am Auflager',
    sym: 'a₁', einheit: 'm', standard: 0.75, min: 0.3, max: 1.5, schritt: 0.05,
    ausDB: true,
    hinweis: 'Abstand vom Jochende zum ersten Bindeblech. Die Teilung dazwischen ' +
             'stammt bei Katalogtypen aus der Mass-Tabelle der Zeichnung.' },
  // Bei verjüngten Enden und Grundrissknick sind das die Masse IM FELD; die
  // Werte am Jochende ergeben sich daraus über Voute und Knick.
  { key: 'jd', gruppe: 'geo', typ: 'zahl', label: 'Gesamthöhe im Feld (Aussenmass)',
    sym: 'jd', einheit: 'mm', standard: 500, schritt: 10, min: 50, ausDB: true },
  { key: 'jbbOG', gruppe: 'geo', typ: 'zahl', label: 'Breite Obergurt im Feld (Aussenmass)',
    sym: 'jbb,OG', einheit: 'mm', standard: 440, schritt: 10, min: 50, ausDB: true },
  { key: 'jbbUG', gruppe: 'geo', typ: 'zahl', label: 'Breite Untergurt im Feld (Aussenmass)',
    sym: 'jbb,UG', einheit: 'mm', standard: 440, schritt: 10, min: 50, ausDB: true },
  // Der Nachweisschnitt wird im Auswertungsreiter «Schnitt» feldweise gesetzt.
  // Ein zweiter Schieber hier wäre dieselbe Grösse ein zweites Mal.
  { key: 'xNachweis', gruppe: 'geo', typ: 'schieber', versteckt: true,
    label: 'Lage Nachweisschnitt',
    sym: 'x_N', einheit: 'm', standard: 0.0, min: 0, max: 34.5, schritt: 0.05 },
  // Nachweisschnitt und seine Orientierung. Beide stehen im Auswertungsreiter
  // «Schnitt» direkt beim Schieber, deshalb hier nur als Wert geführt.
  // Voreingestellt AUS: der Schnitt ist ein Werkzeug zum Hineinschauen und
  // verstellt sonst nur die Sicht auf das Joch.
  { key: 'schnittAktiv', gruppe: 'geo', typ: 'schalter', versteckt: true,
    label: 'Nachweisschnitt im Modell zeigen', standard: false },
  { key: 'schnittOrientierung', gruppe: 'geo', typ: 'auswahl', versteckt: true,
    label: 'Orientierung der Schnittebene', standard: 'quer',
    optionen: opt(SCHNITT_ORIENTIERUNGEN) },

  // --- Auflager ------------------------------------------------------------
  { key: 'endbedingung', gruppe: 'aufl', typ: 'auswahl', label: 'Endauflager',
    standard: 'gelenkig', optionen: opt(ENDBEDINGUNGEN),
    hinweis: 'Wirkt nur auf die Vertikalbiegung; für Wind bleiben die Enden gelenkig.' },
  { key: 'cPhi', gruppe: 'aufl', typ: 'zahl', label: 'Drehfedersteifigkeit',
    sym: 'c_φ', einheit: 'kNm/rad', standard: 5000, schritt: 500, min: 0,
    sichtbar: (w) => w.endbedingung === 'manuell' },
  // Die Auflager stehen dort, wo die Maste stehen - nicht zwingend am Gurtende.
  // L bleibt die Länge der GURTE (daran hängt die Blecheinteilung), die
  // Stützweite ist L − kragA − kragB.
  { key: 'kragA', gruppe: 'aufl', typ: 'zahl', label: 'Kragarm Ende A',
    sym: 'c_A', einheit: 'm', standard: 0, schritt: 0.05, min: 0,
    hinweis: 'Abstand der Mastachse vom Gurtende. L ist die Länge der Gurte; ' +
             'steht das Auflager weiter innen, ragt das Joch als Kragarm ' +
             'darüber hinaus. Am nachgerechneten Signaljoch waren das 0.33 ' +
             'und 0.735 m auf 20 m Gurtlänge - 5.3 % Stützweite und rund ' +
             '11 % auf jedes globale Moment.' },
  { key: 'kragB', gruppe: 'aufl', typ: 'zahl', label: 'Kragarm Ende B',
    sym: 'c_B', einheit: 'm', standard: 0, schritt: 0.05, min: 0 },
  { key: 'mastProfil', gruppe: 'aufl', typ: 'auswahl', label: 'Mastprofil',
    standard: 'HEB 240', optionen: opt(MASTPROFILE, 'name', 'name'),
    sichtbar: (w) => w.endbedingung === 'mast' },
  { key: 'mastH', gruppe: 'aufl', typ: 'zahl', label: 'Masthöhe (Fuss bis Jochachse)',
    sym: 'H', einheit: 'm', standard: 7.5, schritt: 0.25, min: 0.5,
    sichtbar: (w) => w.endbedingung === 'mast' },
  { key: 'mastSteg', gruppe: 'aufl', typ: 'auswahl', label: 'Stegrichtung Mast',
    standard: 'jochachse', optionen: opt(STEGRICHTUNGEN),
    sichtbar: (w) => w.endbedingung === 'mast' },
  // ZWEI MASTE.
  // Die beiden Enden eines Jochs stehen selten auf demselben Mast: das Gelände
  // fällt, die Profile unterscheiden sich, und damit auch die Einspannung.
  // Bisher galt eine Drehfeder für beide Enden - beim Vergleichsmodell
  // (HEB 260 gegen HEM 240, 9.0 gegen 13.0 m) waren das rund 10 % Unterschied.
  { key: 'mastZwei', gruppe: 'aufl', typ: 'schalter',
    label: 'Zweiter Mast am Ende B abweichend', standard: false,
    sichtbar: (w) => w.endbedingung === 'mast' },
  { key: 'mastProfilB', gruppe: 'aufl', typ: 'auswahl', label: 'Mastprofil Ende B',
    standard: 'HEB 240', optionen: opt(MASTPROFILE, 'name', 'name'),
    sichtbar: (w) => w.endbedingung === 'mast' && w.mastZwei },
  { key: 'mastHB', gruppe: 'aufl', typ: 'zahl', label: 'Masthöhe Ende B',
    sym: 'H_B', einheit: 'm', standard: 7.5, schritt: 0.25, min: 0.5,
    sichtbar: (w) => w.endbedingung === 'mast' && w.mastZwei },
  { key: 'mastStegB', gruppe: 'aufl', typ: 'auswahl', label: 'Stegrichtung Ende B',
    standard: 'jochachse', optionen: opt(STEGRICHTUNGEN),
    sichtbar: (w) => w.endbedingung === 'mast' && w.mastZwei },
  { key: 'mastAnschluss', gruppe: 'aufl', typ: 'auswahl', label: 'Anschluss ans Joch',
    standard: 'durchlaufend', optionen: opt(MASTANSCHLUESSE),
    sichtbar: (w) => w.endbedingung === 'mast',
    hinweis: 'Läuft der Mast über die Anschlussebene hinaus und ist das Joch ' +
             'über seine ganze Höhe angeschlossen, ist die Einspannung ' +
             'steifer als beim Kragarm. Der Faktor 2 ist an einem AxisVM-' +
             'Modell kalibriert, nicht hergeleitet — die weichere ' +
             'Annahme vergrössert das Feldmoment, die steifere das ' +
             'Stützmoment.' },
  { key: 'schraubenGrenze', gruppe: 'aufl', typ: 'schalter',
    label: 'Einspannung durch die Gurtverbindung begrenzen', standard: true,
    sichtbar: (w) => !['gelenkig', 'voll'].includes(w.endbedingung),
    hinweis: 'Das Stützmoment tritt als Kräftepaar zwischen Ober- und ' +
             'Untergurtanschluss in den Mast. Die Drehfeder wird iterativ ' +
             'herabgesetzt, bis die Grenzlast der Schrauben eingehalten ist — ' +
             'so wie es im FEM-Modell von Hand gemacht wird.' },
  { key: 'schraubenFgrenz', gruppe: 'aufl', typ: 'zahl',
    label: 'Grenzlast der Gurtverbindung', sym: 'F_Grenz', einheit: 'kN',
    standard: 24, schritt: 1, min: 0,
    sichtbar: (w) => !['gelenkig', 'voll'].includes(w.endbedingung)
      && w.schraubenGrenze !== false,
    hinweis: 'Horizontalkraft je Gurtanschluss. Voreingestellt 24 kN.' },
  { key: 'wMastAusTabelle', gruppe: 'aufl', typ: 'schalter',
    label: 'Windlast auf Mast aus der Lasttabelle', standard: true,
    sichtbar: (w) => w.endbedingung === 'mast',
    hinweis: 'Wert je Profil und Einwirkungsklasse aus der Lasttabelle. ' +
             'Ausgeschaltet gilt der Wert von Hand.' },
  { key: 'wMast', gruppe: 'aufl', typ: 'zahl', label: 'Windlast auf Mast',
    sym: 'w_Mast', einheit: 'kN/m', standard: 0.37, schritt: 0.01, min: 0,
    sichtbar: (w) => w.endbedingung === 'mast' },
  // Der Wind auf den Mast wirkt nicht nur auf den Mast: er verdreht dessen
  // Kopf, und das Jochende macht die Verdrehung mit. Ohne diesen Anteil fehlt
  // dem Lastfall Wind in Jochachse die grössere Hälfte der Einwirkung.
  { key: 'wMastQuer', gruppe: 'aufl', typ: 'zahl',
    label: 'Windlast auf Mast, Gleisrichtung',
    sym: 'w_Mast,y', einheit: 'kN/m', standard: 0.37, schritt: 0.01, min: 0,
    sichtbar: (w) => w.endbedingung === 'mast',
    hinweis: 'Der Wind quer zur Jochachse biegt den Mast in Gleisrichtung. ' +
             'Bei den HEB-Profilen ist er gleich gross wie der in Jochachse, ' +
             'beim HEM 240 nicht.' },
  // VORGABE 'ein' IST EINE ENTSCHEIDUNG DES AUFTRAGGEBERS, kein Versehen.
  // Der Anteil in Jochachse verbessert die Übereinstimmung mit dem geprüften
  // FEM-Modell deutlich; der Anteil in Gleisrichtung verschlechtert sie
  // (Handbuch 4.4), liegt aber auf der sicheren Seite und wirkt ohnehin nur
  // bei zwei verschiedenen Masten. Beides bleibt eingeschaltet - wer es
  // anders will, schaltet hier ab und hält es im Bericht fest.
  { key: 'mastWindAufJoch', gruppe: 'aufl', typ: 'schalter',
    label: 'Mastwind wirkt auf das Joch', standard: true,
    sichtbar: (w) => w.endbedingung === 'mast',
    hinweis: 'IN JOCHACHSE: der Wind biegt den Mast, sein Kopf verdreht sich ' +
             'um θ₀ = w·H³/(6·E·I), und weil das Jochende dort angeschlossen ' +
             'ist, wird ihm diese Verdrehung aufgezwungen - das Joch wird in ' +
             'Gegenkrümmung gebogen. Am nachgerechneten Signaljoch trug der ' +
             'Mastwind rund die Hälfte der gesamten Einwirkung dieses ' +
             'Lastfalls; ohne ihn lag das Werkzeug 80 % zu tief. ' +
             'IN GLEISRICHTUNG: der Mastkopf verdreht sich um die Jochachse ' +
             'und tordiert das Joch - aber nur, wenn die beiden Enden auf ' +
             'VERSCHIEDENEN Masten stehen. Gleiche Maste verdrehen sich ' +
             'gleich, das Joch dreht sich starr mit. Die Querverschiebung der ' +
             'Mastköpfe richtet nichts an: im Grundriss ist das Joch statisch ' +
             'bestimmt gelagert, und daraus folgen aus Auflagerverschiebungen ' +
             'keine Schnittgrössen.' },

  // --- Gurtprofile ---------------------------------------------------------
  { key: 'profOG', gruppe: 'prof', typ: 'auswahl', label: 'Profil Obergurt',
    standard: 'L 90x90x9', optionen: opt(PROFILE, 'name', 'name'), ausDB: true },
  { key: 'profUG', gruppe: 'prof', typ: 'auswahl', label: 'Profil Untergurt',
    standard: 'L 90x90x9', optionen: opt(PROFILE, 'name', 'name'), ausDB: true },
  { key: 'ausrOG', optionenDialog: true, gruppe: 'prof', typ: 'auswahl',
    label: 'Ausrichtung Obergurt', standard: 'LA_SI', optionen: opt(AUSRICHTUNGEN) },
  { key: 'ausrUG', optionenDialog: true, gruppe: 'prof', typ: 'auswahl',
    label: 'Ausrichtung Untergurt', standard: 'LA_SI', optionen: opt(AUSRICHTUNGEN) },
  { key: 'stahl', gruppe: 'prof', typ: 'auswahl', label: 'Stahlgüte',
    standard: 'S235', optionen: opt(STAHLGUETEN, 'name', 'name') },
  { key: 'gammaM0', optionenDialog: true, gruppe: 'prof', typ: 'zahl', label: 'Teilsicherheitsbeiwert',
    sym: 'γ_M0', einheit: '–', standard: 1.05, schritt: 0.05, min: 1 },

  // --- Bindebleche (jetzt bei den Profilen) --------------------------------
  { key: 'blechQuelle', optionenDialog: true, gruppe: 'blech', typ: 'auswahl', label: 'Herkunft',
    standard: 'datenbank', optionen: opt(BLECHQUELLEN),
    hinweis: 'Die Datenbank kennt die gestaffelten Blechbreiten je Station.' },
  { key: 'endblechWieZwischen', gruppe: 'blech', typ: 'schalter',
    label: 'Endblech wie Zwischenblech', standard: true,
    sichtbar: (w) => w.blechQuelle === 'manuell' },
  { key: 'h2', gruppe: 'blech', typ: 'zahl', label: 'Blechbreite (in Jochachse)',
    sym: 'b_Bl', einheit: 'mm', standard: 100, schritt: 10, min: 10,
    sichtbar: (w) => w.blechQuelle === 'manuell' },
  { key: 't2', gruppe: 'blech', typ: 'zahl', label: 'Blechdicke',
    sym: 't_Bl', einheit: 'mm', standard: 10, schritt: 1, min: 1,
    sichtbar: (w) => w.blechQuelle === 'manuell' },
  { key: 'h1', gruppe: 'blech', typ: 'zahl', label: 'Endblech Breite',
    sym: 'b_Bl,1', einheit: 'mm', standard: 100, schritt: 10, min: 10,
    sichtbar: (w) => w.blechQuelle === 'manuell' && !w.endblechWieZwischen },
  { key: 't1', gruppe: 'blech', typ: 'zahl', label: 'Endblech Dicke',
    sym: 't_Bl,1', einheit: 'mm', standard: 10, schritt: 1, min: 1,
    sichtbar: (w) => w.blechQuelle === 'manuell' && !w.endblechWieZwischen },

  // --- Trasse und Fahrleitung ---------------------------------------------
  // Aus Radius und Spannweite folgt der Ablenkwinkel der Fahrleitung und
  // daraus die Umlenkkraft aus dem Leiterzug (siehe core.trasse.js).
  { key: 'trasseRadius', gruppe: 'trasse', typ: 'zahl', label: 'Radius der Trasse',
    sym: 'R', einheit: 'm', standard: 300000, schritt: 50,
    hinweis: 'Vorzeichenbehaftet: R > 0 lenkt die Fahrleitung in +x, R < 0 in ' +
             '−x. Damit steht die Bogenseite in der Geometrie und nicht in ' +
             'einem Schalter. Sehr grosse Beträge bedeuten gerades Gleis. ' +
             'Aus R und der Spannweite folgt der Ablenkwinkel; am einzelnen ' +
             'Drahtwerk lässt er sich überschreiben.' },
  { key: 'flSpannweite', gruppe: 'trasse', typ: 'zahl',
    label: 'Spannweite der Fahrleitung', sym: 'L_FL', einheit: 'm',
    standard: 50, schritt: 1, min: 1,
    hinweis: 'Abstand zwischen zwei Aufhängungen der Fahrleitung – nicht der ' +
             'Jochabstand. Gilt auch als Einflusslänge für Eigengewicht und ' +
             'Wind auf das Drahtwerk.' },

  // --- Anbauteile ----------------------------------------------------------
  { key: 'anbauteile', gruppe: 'anbau', typ: 'anbauteile', label: 'Anbauteile',
    standard: [] },
  // Eigene Vorlagen: was sich jemand für sein Projekt zusammenstellt.
  { key: 'eigeneVorlagen', gruppe: 'anbau', typ: 'liste', versteckt: true,
    label: 'Eigene Vorlagen', standard: [] },
  // Zuletzt benutzte Einstellung des Lastgenerators, damit er beim
  // nächsten Aufruf nicht wieder bei null anfängt.
  { key: 'generator', gruppe: 'anbau', typ: 'objekt', versteckt: true,
    label: 'Lastgenerator', standard: { gleise: 2, abstand: 4.5, ersetzen: true,
                                        vorlagen: ['hs-fahrdraht'] } },

  // --- Verteilte Einwirkungen ---------------------------------------------
  { key: 'lastHerkunft', optionenDialog: true, gruppe: 'ein', typ: 'auswahl', label: 'Herkunft der Lasten',
    standard: 'tabelle', optionen: opt(LASTHERKUNFT) },
  { key: 'windKlasse', gruppe: 'ein', typ: 'auswahl', label: 'Windbelastung',
    standard: '1.1', optionen: opt(WIND_KLASSEN),
    sichtbar: (w) => w.lastHerkunft === 'tabelle',
    hinweis: 'Die Tabelle liefert die fertige Laufmeterlast auf das Joch; der ' +
             'Staudruck dient nur der Einordnung.' },
  { key: 'schneeAktiv', gruppe: 'ein', typ: 'schalter', label: 'Schnee ansetzen',
    standard: false },
  { key: 'schneeKlasse', gruppe: 'ein', typ: 'auswahl', label: 'Schneelast',
    standard: '1.25', optionen: opt(SCHNEE_KLASSEN),
    sichtbar: (w) => w.lastHerkunft === 'tabelle' && w.schneeAktiv },
  { key: 'gZusatz', gruppe: 'ein', typ: 'zahl', label: 'Zuschlag ständige Last',
    sym: 'Δg_k', einheit: 'kN/m', standard: 0.0, schritt: 0.05, min: 0,
    sichtbar: (w) => w.lastHerkunft === 'tabelle' },
  // Die drei charakteristischen Einwirkungen sind IMMER sichtbar. Solange die
  // Tabellenwerte gelten, stehen sie gesperrt darin - man sieht also stets,
  // womit gerechnet wird. Der Knopf "Werte bearbeiten" entsperrt sie und
  // schaltet die Herkunft auf "manuell".
  { key: 'gkManuell', gruppe: 'ein', typ: 'zahl', label: 'Ständige Last',
    sym: 'g_k', einheit: 'kN/m', standard: 0.6, schritt: 0.05, min: 0,
    ausLast: true,
    hinweis: 'Eigengewicht des Jochs nach Sortimentstabelle plus Zuschlag.' },
  { key: 'wkManuell', gruppe: 'ein', typ: 'zahl', label: 'Windlast',
    sym: 'w_k', einheit: 'kN/m', standard: 0.52, schritt: 0.05, min: 0,
    ausLast: true },
  { key: 'skManuell', gruppe: 'ein', typ: 'zahl', label: 'Schneelast',
    sym: 's_k', einheit: 'kN/m', standard: 0.27, schritt: 0.05, min: 0,
    ausLast: true, sichtbar: (w) => w.schneeAktiv },

  // --- Beiwerte ------------------------------------------------------------
  // VORGABE RTE, nicht SIA 260. Im geprüften Referenzprojekt sind alle
  // 46 Kombinationen mit 1.30 gerechnet, nie mit 1.35/1.50. γ_Q 1.50 gegen
  // 1.30 sind 15 % auf jede veränderliche Einwirkung - für ein Bahnwerkzeug
  // ist der Bahnsatz die richtige Voreinstellung. SIA 260 bleibt wählbar.
  { key: 'normensatz', optionenDialog: true, gruppe: 'komb', typ: 'auswahl',
    label: 'Normensatz der Beiwerte', standard: 'rte',
    optionen: [...opt(NORMENSAETZE), { wert: 'frei', text: 'von Hand gesetzt' }],
    hinweis: 'Setzt γ und ψ auf den gewählten Satz. "Von Hand" lässt die Werte, ' +
             'wie sie sind – dann gilt weder SIA 260 noch RTE.' },
  { key: 'gammaG', optionenDialog: true, gruppe: 'komb', typ: 'zahl', label: 'Lastbeiwert ständig',
    sym: 'γ_G', einheit: '–', standard: 1.30, schritt: 0.05, min: 1 },
  { key: 'gammaQ', optionenDialog: true, gruppe: 'komb', typ: 'zahl', label: 'Lastbeiwert veränderlich',
    sym: 'γ_Q', einheit: '–', standard: 1.30, schritt: 0.05, min: 1 },
  { key: 'psi0', optionenDialog: true, gruppe: 'komb', typ: 'zahl',
    label: 'Beiwert Begleiteinwirkung', sym: 'ψ₀', einheit: '–',
    standard: 0.50, schritt: 0.05, min: 0,
    hinweis: 'Gilt für Wind wie für Schnee, je nachdem welche Einwirkung ' +
             'begleitend wirkt.' },
  { key: 'psiGebrauch', optionenDialog: true, gruppe: 'komb', typ: 'zahl',
    label: 'Beiwert Gebrauchstauglichkeit, häufig', sym: 'ψ', einheit: '–',
    standard: 0.70, schritt: 0.05, min: 0,
    hinweis: 'Die Gebrauchstauglichkeit wird in zwei Stufen geführt: SELTEN ' +
             'mit dem vollen veränderlichen Wert, HÄUFIG mit diesem Beiwert. ' +
             'Die Begleiteinwirkung bekommt zusätzlich ψ₀ – im ' +
             'Referenzprojekt also 0.70 · 0.50 = 0.35. Alle ständigen ' +
             'Beiwerte sind dabei 1.0. Diese Lastfälle liefern nur die ' +
             'Schnittgrössen; der Nachweis der Verformungen ist im Werkzeug ' +
             'NICHT geführt.' },
  // Voreinstellung 'verteilt': die konstante Hüllkurve trägt das volle
  // Torsionsmoment über die ganze Länge, auch hinter dem Anbauteil, wo real
  // nur noch der Auflageranteil läuft. Der Vergleich mit AxisVM lag mit der
  // Auflagerverteilung deutlich näher (rund 15 % an den massgebenden
  // Horizontalblechen). Die Hüllkurve bleibt wählbar.
  { key: 'torsionModell', optionenDialog: true, gruppe: 'komb', typ: 'auswahl', label: 'Torsionsverlauf',
    standard: 'verteilt', optionen: opt(TORSIONSMODELLE) },
  { key: 'torsionsverteilung', optionenDialog: true, gruppe: 'komb', typ: 'auswahl',
    label: 'Torsion auf die Ebenen', standard: 'schubfluss',
    optionen: opt(TORSIONSVERTEILUNGEN) },
  // Vorgabe bleibt die Hüllkurve: sie ist nie unsicher. Der vorzeichenrichtige
  // Weg SENKT Bemessungswerte an der günstigeren Ebene und ist deshalb eine
  // bewusste Wahl, keine stille Voreinstellung.
  // Bei UNGLEICHEN Gurten teilt sich die Querkraft der Vertikalebene nach der
  // Biegesteifigkeit. VORGABE «gemessen» - Entscheidung des Auftraggebers,
  // getroffen nach zwei unabhängigen Messungen: den Gurtendmomenten aus einem
  // PyNite-Stabmodell und dem stellenweisen Spannungsvergleich gegen ein
  // AxisVM-Modell. Sie SENKT die Bemessungswerte gegenüber «einhüllend»,
  // bei Typen mit ungleichen Gurten um bis zu 14 %.
  { key: 'gurtaufteilung', optionenDialog: true, gruppe: 'komb',
    typ: 'auswahl', label: 'Querkraft auf die Gurte einer Ebene',
    standard: 'gemessen', optionen: opt(GURTAUFTEILUNGEN),
    hinweis: 'In einer Vertikalebene stehen Ober- und Untergurt nebeneinander, '
           + 'bei den meisten Typen mit verschiedenen Profilen. Im Rahmen zieht '
           + 'der steifere Gurt Moment an sich; hälftig gerechnet wird er '
           + 'unterschätzt – beim Vergleich mit einem Stabmodell um rund 30 %. '
           + 'Die reine I-Aufteilung schiesst dafür über das Ziel hinaus; '
           + 'gemessen wurden 57.5 bis 61.2 %, nicht 71 %. Die Vorgabe '
           + '«gemessen» trifft das und ergänzt sich zu eins. «einhüllend» '
           + 'gibt beiden Gurten mindestens die Hälfte – sicherer, aber die '
           + 'Summe der Anteile ist dann grösser als eins. '
           + 'In den Horizontalebenen stehen zwei gleiche Gurte, dort ist die '
           + 'Einstellung ohne Wirkung.' },
  // FESTGELEGT: der Knotenbereich ist steif, nachgewiesen wird am Anschnitt.
  // Die zweite Einstellung ist keine Alternative für den Nachweis, sondern
  // ein Vergleichsmodus gegen Prüfmodelle, die Achse zu Achse rechnen.
  { key: 'knotenbereich', optionenDialog: true, gruppe: 'komb',
    typ: 'auswahl', label: 'Knotenbereich Gurt/Blech',
    standard: 'anschnitt', optionen: opt(KNOTENBEREICHE),
    hinweis: 'Am Knoten überlappt das Bindeblech den Gurtwinkel und ist mit '
           + 'ihm verschweisst; dieser Bereich gilt als BIEGESTEIF. '
           + 'Nachgewiesen wird deshalb am ANSCHNITT – im Gurt '
           + 'M·(a₁−b_Bl)/a₁, im Blech M·L_c/h. So ist der Nachweis dieses '
           + 'Werkzeugs festgelegt. Die zweite Einstellung rechnet Achse zu '
           + 'Achse, wie ein Stabwerksprogramm ohne Zutun, und dient nur dem '
           + 'Vergleich mit einem Prüfmodell – sie ist keine '
           + 'Nachweisgrundlage. Der Unterschied beträgt 11 bis 15 % auf die '
           + 'Ausnutzung; das Knotenmoment selbst ist in beiden Fällen '
           + 'dasselbe.' },
  // In den Endfeldern geht die Torsion über die Anschlussebenen in den Mast -
  // eine örtliche Krafteinleitung, die der Ersatzbalken nicht führt.
  { key: 'endfeldZuschlag', optionenDialog: true, gruppe: 'komb', typ: 'zahl',
    label: 'Endfeldzuschlag Bindebleche', sym: 'k_E', einheit: '–',
    standard: 2.0, schritt: 0.1, min: 1,
    hinweis: 'In den beiden Endfeldern geht die Torsion des Jochs über die '
           + 'Anschlussebenen in den Mast. Diese örtliche Krafteinleitung '
           + 'kann ein Ersatzbalken nicht abbilden – er kennt nur den '
           + 'Rahmenanteil. Am nachgerechneten Signaljoch lag das Moment im '
           + 'Vertikalblech an der äussersten Station um Faktor 2.7 über der '
           + 'Rechnung, nach innen abklingend (1.7 · 1.4 · 1.0). Rund 1.45 '
           + 'davon geht auf das Knotenmodell des Vergleichsmodells, bleibt '
           + 'etwa 1.9 für die Einleitung. Angesetzt werden 2.0 auf die '
           + 'Bleche der beiden äussersten Stationen je Ende – und zwar NUR '
           + 'auf den Torsionsanteil ihrer Beanspruchung, denn daher stammt '
           + 'der Überschuss. Ein Joch ohne exzentrische Anbaulasten hat kaum '
           + 'Torsion und bleibt unberührt. In Feldmitte stimmen alle Modelle '
           + 'überein – dort wird ohnehin nichts zugeschlagen. Eine '
           + 'Festlegung des Nachweises, gestützt auf ein Modell; mit 1.0 '
           + 'abgeschaltet.' },
  { key: 'spannungsmodell', optionenDialog: true, gruppe: 'komb',
    typ: 'auswahl', label: 'Spannung im Winkel',
    standard: 'schenkel', optionen: opt(SPANNUNGSMODELLE),
    hinweis: 'Ein Winkel hat seine Hauptachsen unter 45°; die wirkliche '
           + 'Randspannung bei schenkelparalleler Biegung ist rund 30 % '
           + 'grösser als M/W. Die punktweise Ermittlung ist die richtige – '
           + 'sie allein verschlechtert aber den Abgleich mit einem '
           + 'Stabmodell, weil das örtliche Gurtmoment des Ersatzbalkens '
           + 'seinerseits zu gross ist und sich die beiden Fehler heute '
           + 'teilweise aufheben. Deshalb bleibt W schenkelparallel die '
           + 'Vorgabe, bis das Momentenmodell nachgeführt ist.' },
  { key: 'ebenenUeberlagerung', optionenDialog: true, gruppe: 'komb',
    typ: 'auswahl', label: 'Überlagerung je Blechebene',
    standard: 'huellkurve', optionen: opt(EBENEN_UEBERLAGERUNG),
    hinweis: 'Der Schubfluss aus Torsion läuft um: er addiert sich auf der '
           + 'Ebene, zu der die Last exzentrisch sitzt, und zieht auf der '
           + 'gegenüberliegenden ab. Vorzeichenrichtig gerechnet unterscheiden '
           + 'sich Ober- und Unterblech wie im FEM; die Hüllkurve gibt beiden '
           + 'den ungünstigeren Wert. Der örtliche Anteil aus der '
           + 'Lasteinleitung bleibt in beiden Fällen additiv. Ohne Drehsinn '
           + 'keine Vorzeichen: mit dem Torsionsverlauf «Hüllkurve» fällt die '
           + 'Einstellung auf die Hüllkurve zurück.' },

  // Eigene und angepasste Lastfälle. Werden über die Lastfallmatrix gepflegt,
  // nicht über ein Eingabefeld.
  { key: 'lastfallAnpassung', gruppe: 'komb', typ: 'objekt', versteckt: true,
    label: 'Angepasste Lastfälle', standard: {} },
  { key: 'lastfaelleEigen', gruppe: 'komb', typ: 'liste', versteckt: true,
    label: 'Eigene Lastfälle', standard: [] },

  // --- Modellansicht -------------------------------------------------------
  { key: 'projektion', optionenDialog: true, gruppe: 'ansicht', typ: 'auswahl',
    label: 'Projektion', standard: 'perspektive',
    optionen: [{ wert: 'perspektive', text: 'perspektivisch' },
               { wert: 'orthogonal', text: 'orthogonal (verzerrungsfrei)' }],
    hinweis: 'Orthogonal hält parallele Kanten parallel und Längen über die ' +
             'Tiefe vergleichbar – zum Ablesen eines Trägers meist die ' +
             'ehrlichere Darstellung.' },
  { key: 'blickwinkel', optionenDialog: true, gruppe: 'ansicht', typ: 'schieber',
    label: 'Blickwinkel', einheit: '°', standard: 34, min: 12, max: 70, schritt: 2,
    sichtbar: (w) => w.projektion !== 'orthogonal',
    hinweis: 'Kleiner Winkel = ruhiges Bild, weniger Verzerrung am Bildrand.' },
  { key: 'modellTransparenz', optionenDialog: true, gruppe: 'ansicht',
    typ: 'schieber', label: 'Transparenz der Körper', einheit: '%',
    standard: 50, min: 0, max: 90, schritt: 5,
    hinweis: 'Durchscheinende Profile und Bleche lassen die Schwerachsen und ' +
             'die dahinterliegenden Bauteile sichtbar.' },
  // Drei Schriftgrössen, weil sie verschiedenen Zwecken dienen: die
  // Beschriftung der Bauteile will man beim Lesen des Modells gross, die
  // Bemassung beim Betrachten der Form, die Lastangaben beim Prüfen der
  // Einwirkungen - selten alles gleichzeitig.
  { key: 'modellSchrift', optionenDialog: true, gruppe: 'ansicht',
    typ: 'schieber', label: 'Schrift Bauteile und Spannungen', einheit: 'px',
    standard: 10, min: 7, max: 22, schritt: 1 },
  { key: 'modellSchriftLast', optionenDialog: true, gruppe: 'ansicht',
    typ: 'schieber', label: 'Schrift Lasten', einheit: 'px',
    standard: 10, min: 7, max: 22, schritt: 1 },
  { key: 'modellSchriftMass', optionenDialog: true, gruppe: 'ansicht',
    typ: 'schieber', label: 'Schrift Bemassung', einheit: 'px',
    standard: 10, min: 7, max: 22, schritt: 1 },
];

/** Standardwerte als flaches Objekt. Sammelwerte werden kopiert. */
export function standardwerte() {
  const w = {};
  FELDER.forEach((f) => {
    if (Array.isArray(f.standard)) w[f.key] = f.standard.map((x) => ({ ...x }));
    else if (f.standard && typeof f.standard === 'object') w[f.key] = { ...f.standard };
    else w[f.key] = f.standard;
  });
  return w;
}

export function feld(key) {
  const f = FELDER.find((x) => x.key === key);
  if (!f) throw new Error(`Unbekanntes Eingabefeld: ${key}`);
  return f;
}

/**
 * Felder einer Gruppe für die Sidebar.
 * Felder mit optionenDialog stehen im Optionen-Dialog des Banners und werden
 * hier ausgelassen, damit die Eingabe schlank bleibt.
 */
export function sichtbareFelder(gruppe, werte) {
  return FELDER.filter((f) => f.gruppe === gruppe && !f.optionenDialog && !f.versteckt
                           && (!f.sichtbar || f.sichtbar(werte)));
}

/** Felder des Optionen-Dialogs, nach Abschnitten geordnet. */
export const OPTIONEN_ABSCHNITTE = [
  { titel: 'Rechenmodell', keys: ['massVariante', 'blechQuelle', 'ausrOG', 'ausrUG'] },
  { titel: 'Torsion und Aufteilung', keys: ['torsionModell', 'torsionsverteilung',
                             'ebenenUeberlagerung', 'gurtaufteilung',
                             'spannungsmodell'] },
  { titel: 'Einwirkungen', keys: ['lastHerkunft'] },
  { titel: 'Lastbeiwerte', keys: ['normensatz', 'gammaG', 'gammaQ', 'psi0',
                                 'psiGebrauch'] },
  { titel: 'Widerstand', keys: ['gammaM0'] },
  { titel: 'Modellansicht',
    keys: ['projektion', 'blickwinkel', 'modellTransparenz', 'modellSchrift',
           'modellSchriftLast', 'modellSchriftMass'] },
];

export function optionenFelder(werte) {
  return OPTIONEN_ABSCHNITTE.map((a) => ({
    titel: a.titel,
    felder: a.keys.map((k) => FELDER.find((f) => f.key === k))
      .filter((f) => f && (!f.sichtbar || f.sichtbar(werte))),
  })).filter((a) => a.felder.length);
}

/** Übernimmt einen Katalogtyp in die Eingabewerte. */
export function typUebernehmen(werte, joch) {
  if (!joch) return werte;
  // ALTBAUWEISE: GELENK AM AUFLAGER
  // Vorgabe des Auftraggebers. Der Anschluss der alten Joche an den Mast
  // trägt kein Einspannmoment; eine Drehfeder anzusetzen wäre unsicher.
  const alt = (joch.bauweise ?? 'neu') === 'alt';
  // Als manueller Ersatzwert dient das REGELBLECH des Feldes, nicht das erste
  // der Liste - bei der Altbauweise stehen dort die schrägen Vouten-Bleche.
  const regel = (joch.bleche?.vertikal ?? []).find((b) => b.zone !== 'voute')
             ?? joch.bleche?.vertikal?.[0];
  return {
    ...werte,
    jd: joch.jd,
    jbbOG: joch.og.jbb,
    jbbUG: joch.ug.jbb,
    profOG: joch.og.profil,
    profUG: joch.ug.profil,
    a1: teilung(joch) / 1000,
    h2: regel?.breite ?? werte.h2,
    t2: regel?.dicke ?? werte.t2,
    ...(alt ? { endbedingung: 'gelenkig' } : {}),
  };
}

/** Füllt die Typ-Auswahlliste, sobald die Typendatenbank geladen ist. */
export function setzeTypOptionen() {
  const f = feld('typ');
  const zeile = (j) => ({
    wert: j.typ,
    text: `${j.typ} · jd ${j.jd}${j.voute ? `→${j.voute.endJd}` : ''} mm · ` +
          `${j.gewicht} kg/m${j.bleche ? '' : ' · ohne Bleche'}`,
  });
  const alle = tragjoche();
  f.optionen = [
    ...alle.filter((j) => (j.bauweise ?? 'neu') !== 'alt').map(zeile),
    ...alle.filter((j) => (j.bauweise ?? 'neu') === 'alt').map(zeile),
    { wert: 'frei', text: 'frei definiert' },
  ];
  return f.optionen;
}

/** Grenzt Spannweite und Nachweisschnitt auf den Sortimentsbereich ein. */
export function setzeGrenzen(joch, L) {
  const b = laengenbereich(joch);
  const fl = feld('L');
  fl.min = b.min; fl.max = b.max;
  const fx = feld('xNachweis');
  fx.min = 0; fx.max = L;
  return b;
}

