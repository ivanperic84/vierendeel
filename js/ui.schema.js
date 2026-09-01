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

import { ENDBEDINGUNGEN, MASTANSCHLUESSE,
         mastImModell } from './core.auflager.js';
import { nachweiseStandard } from './core.checks.js';
import { WIND_KLASSEN, SCHNEE_KLASSEN, LASTHERKUNFT,
         NORMENSAETZE } from './core.lasten.js';
import { ablenkwinkel, istGerade, radiusAusWinkel,
         R_GERADE } from './core.trasse.js';

const opt = (arr, k = 'key', l = 'label') => arr.map((x) => ({ wert: x[k], text: x[l] }));

/**
 * Steht ein Mast im Modell? Dieselbe Antwort wie im Rechenkern - die Maske
 * darf ein Feld nicht zeigen, das die Rechnung nicht kennt (und umgekehrt).
 */
const mastDa = (w) => mastImModell(w);

/**
 * DER GRAD AM FELD (Weisung: "bei der Eingabe von Radius und Spannweite die
 * Grad angeben").
 *
 * Radius und Spannweite sind Eingaben, der Winkel ist das, was daraus wird.
 * Wer ihn nicht sieht, gibt zwei Zahlen ein und erfaehrt die dritte erst am
 * Ergebnis - und ein Vorzeichenfehler im Radius faellt dort nicht mehr auf,
 * sondern nur noch an einer Umlenkkraft, die in die falsche Richtung zeigt.
 *
 * >>> GERECHNET WIRD AUS R UND L, auch wenn der Winkel danebensteht. <<<
 * Die Notiz nennt deshalb die Zahl, die der Kern nimmt - nicht die gerundete
 * aus dem Winkelfeld.
 */
function winkelNotiz(w) {
  const L = w?.flSpannweite ?? 0;
  const R = w?.trasseRadius;
  if (istGerade(R)) return 'gerades Gleis – keine Umlenkkraft';
  const a = (ablenkwinkel(L, R) * 180) / Math.PI;
  if (!a) return null;
  return `α = ${a.toFixed(3)}° bei L_FL = ${L.toFixed(2)} m · Umlenkung in `
       + `${a > 0 ? '+x' : '−x'}`;
}

/**
 * Am Winkelfeld umgekehrt: welchem Bogen der gezeigte Winkel entspricht.
 *
 * Gerechnet aus DEMSELBEN abgeleiteten Wert, den das Feld zeigt - nicht aus
 * einem gespeicherten `trasseWinkel`. Sonst nennt die Notiz einen anderen
 * Bogen als das Feld darueber.
 */
function radiusNotiz(w) {
  const L = w?.flSpannweite ?? 0;
  if (istGerade(w?.trasseRadius)) return 'gerades Gleis – keine Umlenkkraft';
  const a = (ablenkwinkel(L, w?.trasseRadius) * 180) / Math.PI;
  if (!a) return 'gerades Gleis – keine Umlenkkraft';
  const R = radiusAusWinkel(L, a);
  if (R === null) return null;
  return `entspricht R = ${Math.abs(R) >= R_GERADE ? 'gerade'
            : `${R.toFixed(0)} m`} bei L_FL = ${L.toFixed(2)} m`;
}

export const GRUPPEN = [
  { id: 'ort',   titel: 'Verortung' },
  { id: 'typ',   titel: 'Tragjoch-Typ und Rechenmasse' },
  { id: 'geo',   titel: 'Systemgeometrie' },
  { id: 'aufl',  titel: 'Auflagerung des Jochs' },
  /*
   * DIE MASTEN SIND EIN EIGENES HAUPTTRAGWERK (Weisung, 28. August: «die
   * Haupttragwerke sollten global gesteuert werden»).
   *
   * Sie standen in der Gruppe «Auflager / Mast» - und die Auswahl
   * «Endauflager» entschied zugleich, ob es sie überhaupt gibt. Zwei Fragen
   * in einem Feld: WIE das Joch gelagert ist, und OB ein Mast dasteht. Wer
   * gelenkig rechnen wollte, verlor den Masten aus Bild, Ausleitung und
   * Nachweis.
   *
   * Hier wächst später weiter, was zum Masten gehört: Einzelmasten und
   * Masten mit Tragausleger als eigene Tragwerksart, dazu Zuganker und
   * Druckstützen. Die Gruppe ist dafür angelegt.
   */
  { id: 'mast',  titel: 'Masten' },
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
  /*
   * WO DAS TRAGWERK STEHT.
   *
   * Rechnerisch bedeutungslos, für die Ablage entscheidend: ein Projekt hat
   * eine Reihe von Tragwerken, und ohne Verortung heissen sie alle «J90,
   * 20.00 m». Die drei Angaben wandern in die Überschrift, in den Bericht,
   * in die AxisVM-Ausleitung und in den DATEINAMEN - dort tragen sie am
   * meisten, weil die COM-Brücke die jüngste Modelldatei nimmt und man ihr
   * ansehen können muss, welches Tragwerk sie ist.
   *
   * TEXT, NICHT ZAHL. Die Liniennummer führt führende Nullen, die
   * KM-Angabe drei Nachkommastellen und einen Punkt als Trenner — als Zahl
   * gerechnet wäre aus «012.345» still «12.345» geworden.
   */
  {
    key: 'linie', gruppe: 'ort', typ: 'text', label: 'Liniennummer',
    standard: '', platzhalter: 'z. B. 600', laenge: 12,
    hinweis: 'Nummer der Strecke. Geht in keine Rechnung ein.',
  },
  {
    key: 'ortschaft', gruppe: 'ort', typ: 'text', label: 'Ortschaft',
    standard: '', platzhalter: 'z. B. Bahnhof Nord', laenge: 28,
    hinweis: 'Klartext zum Wiederfinden — Ortsname, Bahnhof, Abschnitt.',
  },
  {
    key: 'km', gruppe: 'ort', typ: 'text', label: 'KM-Position',
    standard: '', platzhalter: 'z. B. 012.345', laenge: 14,
    hinweis: 'Streckenkilometer des Standorts, wie im Querprofil geschrieben.',
  },

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
  /*
   * DIE MASSKETTE DER ZEICHNUNG.
   *
   * Über dem Joch steht auf jedem Querprofil eine Kette von Massen in
   * Zentimetern ab dem linken Jochende. Das sind die Stellen, an denen
   * wirklich etwas hängt - genau die Zahl, die jede Baugruppe als Lage x
   * braucht. Einmal abgeschrieben, fängt die Eingabe danach darauf.
   *
   * Als TEXT, nicht als Zahlenliste: abgeschrieben wird von Hand, und eine
   * Zeile «15 209 474 735» tippt sich schneller als sieben Felder. Gelesen
   * wird grosszügig (core.constants.js, massketteLesen).
   */
  {
    key: 'masskette', gruppe: 'geo', typ: 'text',
    label: 'Masskette der Zeichnung', einheit: 'cm', standard: '',
    platzhalter: 'z. B. 15 209 474 735 885 983 1185 1200', laenge: 120,
    hinweis: 'Die Masse über dem Joch, in Zentimetern ab dem linken Jochende — '
           + 'falls die Zeichnung sie führt. Dann fängt die Lage der Anbauteile '
           + 'darauf, und im Modell stehen sie als Fanglinien. Das letzte Mass '
           + 'muss die Jochlänge sein; das ist die Gegenprobe. Leer lassen, wo '
           + 'keine Kette steht — dann wird auf der Zeichnung gemessen.',
  },
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
  /*
   * WELCHE NACHWEISE GEFÜHRT WERDEN. Die Gruppen und ihre Bedeutung stehen in
   * core.checks.js (NACHWEISGRUPPEN); hier steht nur der gespeicherte Wert.
   * Eine eigene Feldart braucht er nicht - der Reiter «Nachweise» zeichnet
   * seine Schalter selbst, weil neben jedem noch stehen muss, WAS er führt.
   */
  { key: 'nachweise', gruppe: 'geo', typ: 'satz', versteckt: true,
    label: 'Geführte Nachweise', standard: nachweiseStandard() },

  // --- Auflager ------------------------------------------------------------
  /*
   * MIT MASTEN, VON ANFANG AN (Weisung, 28. August: «als Startwert bei den
   * Jochen mit Masten modelliert»).
   *
   * `gelenkig` war der vorsichtige Startwert aus der Zeit, als der Mast nur
   * eine Randbedingung war. Er ist seither Teil des Tragwerks: er steht als
   * Koerper im Bild, als Stab in der Ausleitung, er traegt Wind und
   * Anbauteile. Ein Tragjoch ohne Masten zu eroeffnen hiess, jedes Mal mit
   * einem Modell zu beginnen, das es so nicht gibt - und die
   * Einspannwirkung stillschweigend auf null zu setzen.
   */
  { key: 'endbedingung', gruppe: 'aufl', typ: 'auswahl', label: 'Endauflager',
    standard: 'mast', optionen: opt(ENDBEDINGUNGEN),
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
  /*
   * OB EIN MAST DASTEHT - die eine Frage, die vorher in der Endauflagerwahl
   * mitentschieden wurde.
   *
   * Er wirkt dann als Bauteil: im Bild, in der Ausleitung, im Nachweis, und
   * er trägt Wind und Anbauteile. OB seine Steifigkeit auch die Drehfeder
   * des Jochendes liefert, ist die andere Frage - sie steht bei der
   * Auflagerung.
   *
   * ALTE DATEIEN: fehlt die Angabe, gilt der frühere Zusammenhang (Mast
   * genau dann, wenn die Endbedingung ihn verlangte). Siehe `mastImModell`
   * in core.auflager.js.
   */
  { key: 'mastVorhanden', gruppe: 'mast', typ: 'schalter',
    label: 'Masten im Modell', standard: true,
    hinweis: 'Steht der Mast im Modell, ist er ein Bauteil: er wird '
           + 'gezeichnet, ausgeleitet und nachgewiesen, er trägt Wind und '
           + 'Anbauteile. Das ist unabhängig davon, ob seine Steifigkeit die '
           + 'Drehfeder des Jochendes liefert – das steht bei der '
           + 'Auflagerung.' },
  { key: 'mastProfil', gruppe: 'mast', typ: 'auswahl', label: 'Mastprofil',
    standard: 'HEB 240', optionen: opt(MASTPROFILE, 'name', 'name'),
    sichtbar: (w) => mastDa(w) },
  /*
   * MIT SCHIEBER (Weisung, 28. August). Masthöhe und Mastlänge sind die
   * beiden Zahlen, die man beim Einpassen einer Zeichnung nachzieht, bis
   * Modell und Bild zur Deckung kommen - und dafür ist ein Regler das
   * Werkzeug, nicht ein Zahlenfeld, in das man tippt und wieder tippt.
   */
  { key: 'mastH', gruppe: 'mast', typ: 'schieber',
    label: 'Masthöhe (Fuss bis Jochachse)',
    sym: 'H', einheit: 'm', standard: 7.5, schritt: 0.05, min: 2, max: 20,
    sichtbar: (w) => mastDa(w) },
  /*
   * DER LANGE MAST MIT ZUSATZLEITERN.
   *
   * Auf dem Querprofil steht beides: die Gesamtlänge («DP26 / 12.5 m») und
   * die Anschlusshöhe («ha = 8.31»). Gefragt wird deshalb nach der LÄNGE,
   * nicht nach einem Überstand - so steht es auf dem Blatt, und der Überstand
   * ergibt sich als Länge − H.
   *
   * Oben trägt der Mast dann Traversen mit Einzelleitern; genau die liessen
   * sich bisher nicht ansetzen, weil der Mast an der Jochachse endete und ein
   * Bauteil darüber aus dem Modell fiel.
   *
   * 0 heisst «nicht angegeben»: dann ragt der Mast den halben Meter über den
   * Obergurt, den die stehende Vorgabe verlangt, und nicht weiter.
   */
  { key: 'mastLaenge', gruppe: 'mast', typ: 'schieber',
    label: 'Mastlänge gesamt (Fuss bis Kopf)',
    sym: 'L_M', einheit: 'm', standard: 0, schritt: 0.05, min: 0, max: 25,
    sichtbar: (w) => mastDa(w),
    hinweis: 'Wie auf dem Querprofil angeschrieben, z. B. «DP26 / 12.5 m». '
           + 'Der Überstand über die Jochachse ist Länge − Masthöhe; dort '
           + 'lassen sich Traversen und Zusatzleiter ansetzen. '
           + '0 = nicht angegeben, dann endet der Mast knapp über dem Obergurt.' },
  { key: 'mastSteg', gruppe: 'mast', typ: 'auswahl', label: 'Stegrichtung Mast',
    standard: 'jochachse', optionen: opt(STEGRICHTUNGEN),
    sichtbar: (w) => mastDa(w) },
  // ZWEI MASTE.
  // Die beiden Enden eines Jochs stehen selten auf demselben Mast: das Gelände
  // fällt, die Profile unterscheiden sich, und damit auch die Einspannung.
  // Bisher galt eine Drehfeder für beide Enden - beim Vergleichsmodell
  // (HEB 260 gegen HEM 240, 9.0 gegen 13.0 m) waren das rund 10 % Unterschied.
  { key: 'mastZwei', gruppe: 'mast', typ: 'schalter',
    label: 'Zweiter Mast am Ende B abweichend', standard: false,
    sichtbar: (w) => mastDa(w) },
  { key: 'mastProfilB', gruppe: 'mast', typ: 'auswahl', label: 'Mastprofil Ende B',
    standard: 'HEB 240', optionen: opt(MASTPROFILE, 'name', 'name'),
    sichtbar: (w) => mastDa(w) && w.mastZwei },
  { key: 'mastHB', gruppe: 'mast', typ: 'schieber', label: 'Masthöhe Ende B',
    sym: 'H_B', einheit: 'm', standard: 7.5, schritt: 0.05, min: 2, max: 20,
    sichtbar: (w) => mastDa(w) && w.mastZwei },
  { key: 'mastLaengeB', gruppe: 'mast', typ: 'schieber', label: 'Mastlänge Ende B',
    sym: 'L_M,B', einheit: 'm', standard: 0, schritt: 0.05, min: 0, max: 25,
    sichtbar: (w) => mastDa(w) && w.mastZwei },
  { key: 'mastStegB', gruppe: 'mast', typ: 'auswahl', label: 'Stegrichtung Ende B',
    standard: 'jochachse', optionen: opt(STEGRICHTUNGEN),
    sichtbar: (w) => mastDa(w) && w.mastZwei },
  /*
   * PLASTISCHER WIDERSTAND FUeR DEN MASTEN (Weisung, 28. August: «1, aber
   * auch plastischen Widerstand optional auswählbar machen»).
   *
   * Wirksam nur bei Querschnittsklasse 1 oder 2 — das ist EN 1993-1-1 und
   * keine Wahl. Der Nachweis sagt es, wenn der Schalter ins Leere greift.
   * W_pl wird aus der Profilgeometrie gerechnet, ohne Ausrundung, also auf
   * der sicheren Seite (core.mast.js).
   */
  { key: 'mastPlastisch', gruppe: 'mast', typ: 'schalter',
    label: 'Mast plastisch nachweisen', standard: false,
    sichtbar: (w) => mastDa(w),
    hinweis: 'Statt der elastischen Widerstandsmomente W_el die plastischen ' +
             'W_pl. Gilt nur bei Querschnittsklasse 1 oder 2; sonst bleibt ' +
             'es elastisch, und der Nachweis sagt es. Gerechnet wird in ' +
             'beiden Fällen die lineare Interaktion N/N_Rd + M_q/M_q,Rd + ' +
             'M_l/M_l,Rd – konservativ gegenüber EN 1993-1-1, 6.2.9, und ' +
             'ohne Beiwerte, die niemand festgelegt hat.' },
  /*
   * DER ANSCHLUSS GEHOERT ZUR AUFLAGERUNG, nicht zum Masten: er sagt, wie
   * das JOCHENDE gehalten wird. Sichtbar ist er trotzdem nur mit Masten -
   * ohne einen gibt es nichts, woran das Joch durchlaufen könnte.
   */
  { key: 'mastAnschluss', gruppe: 'aufl', typ: 'auswahl', label: 'Anschluss ans Joch',
    standard: 'durchlaufend', optionen: opt(MASTANSCHLUESSE),
    sichtbar: (w) => mastDa(w) && w.endbedingung === 'mast',
    hinweis: 'Läuft der Mast über die Anschlussebene hinaus und ist das Joch ' +
             'über seine ganze Höhe angeschlossen, ist die Einspannung ' +
             'steifer als beim Kragarm: 1.45·E·I/H statt 1.00·E·I/H, an einem ' +
             'Stabwerksmodell kalibriert und nicht hergeleitet. ' +
             'WIRKT NUR IM VERSCHIEBLICHEN FALL — also bei Wind in Jochachse ' +
             'und bei Längskräften aus Anbauteilen. Für Vertikallasten und ' +
             'Wind in Gleisrichtung hält das Joch die beiden Mastköpfe ' +
             'zusammen; dann gilt der Rahmenwert 4.00·E·I/H, ' +
             'unabhängig von dieser Wahl. Die weichere Annahme vergrössert ' +
             'das Feldmoment, die steifere das Stützmoment.' },
  /*
   * STARTWERT AUS (Weisung, 27. August).
   *
   * Sonst sagt die Anwendung zweierlei zugleich: der Rechenkern setzt die
   * Feder herab, DAMIT die Verbindung ihre Grenzlast einhält - und Prüfung
   * A1 weist gleichzeitig die Kraft aus der UNGEBREMSTEN Feder nach und
   * meldet sie als überschritten. Beides aus demselben Lauf, und beides
   * angeblich wahr.
   *
   * Entschieden ist: die geometrische Feder gilt, die Schraubengrenze ist
   * ein eigener Nachweis (A1). Die Begrenzung bleibt als Schalter erhalten -
   * wer die weichere Annahme rechnen will, schaltet sie ein und weiss dann,
   * dass A1 sich auf ein anderes System bezieht.
   */
  { key: 'schraubenGrenze', gruppe: 'aufl', typ: 'schalter',
    label: 'Einspannung durch die Gurtverbindung begrenzen', standard: false,
    sichtbar: (w) => !['gelenkig', 'voll'].includes(w.endbedingung),
    hinweis: 'Das Stützmoment tritt als Kräftepaar zwischen Ober- und ' +
             'Untergurtanschluss in den Mast. Die Drehfeder wird iterativ ' +
             'herabgesetzt, bis die Grenzlast der Schrauben eingehalten ist — ' +
             'so wie es im FEM-Modell von Hand gemacht wird.' },
  { key: 'schraubenFgrenz', gruppe: 'aufl', typ: 'zahl',
    label: 'Grenzlast der Gurtverbindung', sym: 'F_Grenz', einheit: 'kN',
    standard: 24, schritt: 1, min: 0,
    sichtbar: (w) => !['gelenkig', 'voll'].includes(w.endbedingung),
    hinweis: 'Horizontalkraft JE GURT - jede Gurtebene hängt an zwei Gurten, '
           + 'die Ebenenkraft ist also das Doppelte. Voreingestellt 24 kN. '
           + 'Nachgewiesen wird sie in Prüfung A1, auch ohne die Begrenzung.' },
  /*
   * DER MASTWIND IST KEINE OPTION (Weisung, 31. August).
   *
   * Hier stand ein Schalter «Windlast auf Mast aus der Lasttabelle». Er
   * konnte ausgeschaltet werden, und dann rechnete ein Mast im Modell mit
   * einem Wert von Hand - oder mit dem Startwert 0.37, was bei einem HEB 260
   * unter EK3 um ein Drittel danebenliegt. Steht ein Mast da, faengt er Wind;
   * das ist keine Einstellung, sondern eine Tatsache.
   *
   * Die Last folgt deshalb IMMER der Tabelle (Profil, Einwirkungsklasse,
   * Stegrichtung). Sie steht gesperrt im Feld - genau wie die drei
   * Jochlasten -, damit man sieht, womit gerechnet wird; der Knopf «Werte
   * bearbeiten» entsperrt sie fuer den Ausnahmefall.
   */
  { key: 'wMast', gruppe: 'ein', typ: 'zahl', label: 'Windlast auf Mast',
    sym: 'w_Mast', einheit: 'kN/m', standard: 0.37, schritt: 0.01, min: 0,
    ausLast: true,
    sichtbar: (w) => mastDa(w),
    hinweis: 'Je Profil, Einwirkungsklasse und Stegrichtung aus der '
           + 'Lasttabelle. Steht ein Mast im Modell, wird sie immer '
           + 'angesetzt. Der Knopf «Werte bearbeiten» gibt das Feld frei.' },
  // Der Wind auf den Mast wirkt nicht nur auf den Mast: er verdreht dessen
  // Kopf, und das Jochende macht die Verdrehung mit. Ohne diesen Anteil fehlt
  // dem Lastfall Wind in Jochachse die grössere Hälfte der Einwirkung.
  /*
   * STARTWERT AUS (Weisung, 27. August).
   *
   * Der Ersatzbalken kann den Mastwind nur als AUFGEZWUNGENE
   * Auflagerverdrehung fassen - eine Ersatzgrösse für etwas, das im
   * Stabmodell schlicht eine Last auf dem Masten ist. Sobald der Mast im
   * Modell steht (Auflagermodell «Mast»), trägt er sie selbst, und die
   * Ersatzgrösse würde sie ein zweites Mal ansetzen.
   *
   * Deshalb aus, bis sie ausdrücklich gewollt ist. Wer ohne Mast im Modell
   * rechnet und den Anteil trotzdem braucht, schaltet sie ein.
   */
  { key: 'mastWindAufJoch', gruppe: 'ein', typ: 'schalter',
    label: 'Mastwind wirkt auf das Joch', standard: false,
    sichtbar: (w) => mastDa(w),
    hinweis: 'Der Wind IN DER JOCHACHSE biegt den Mast, sein Kopf verdreht ' +
             'sich um θ₀ = w·H³/(6·E·I), und weil das Jochende dort ' +
             'angeschlossen ist, wird ihm diese Verdrehung aufgezwungen - ' +
             'das Joch wird in Gegenkrümmung gebogen. Am nachgerechneten ' +
             'Signaljoch trug der Mastwind rund die Hälfte der gesamten ' +
             'Einwirkung dieses Lastfalls; ohne ihn lag das Werkzeug 80 % zu ' +
             'tief. DER WIND IN GLEISRICHTUNG BLEIBT AUSSEN VOR: er ' +
             'verschiebt die Mastköpfe (im Grundriss ist das Joch statisch ' +
             'bestimmt gelagert, daraus folgt nichts) und verdreht sie um ' +
             'die Jochachse. Der zweite Anteil wäre bei zwei VERSCHIEDENEN ' +
             'Masten eine Torsion; er ist nicht angesetzt, siehe Handbuch.' },

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
  /*
   * ZWEI FELDER, EINE GRÖSSE (Weisung, 28. August: «anstatt einer Auswahl der
   * Ablenkung der Fahrleitung direkt das Feld mit dem Winkel angeben; je
   * nachdem, was zuerst eingegeben wird, wird der andere Wert
   * wiedergegeben»).
   *
   * Radius und Winkel stehen nebeneinander und halten einander nach — die
   * Kopplung steht in app.js. Auf manchem Querprofil steht kein Radius,
   * sondern eine Ablenkung; sie über einen Ersatzradius einzugeben hiesse,
   * rückwärts zu rechnen und dabei eine Zahl zu erfinden, die niemand
   * angegeben hat.
   *
   * Vorher stand eine Auswahl davor — «woher kommt der Ablenkwinkel». Eine
   * Frage, die man beantworten musste, bevor man das Feld benutzen durfte,
   * und deren Antwort man wieder umstellen musste, sobald die nächste
   * Zeichnung es anders angab.
   *
   * Die SPANNWEITE gehört zu beiden: sie ist Rechenweg zum Winkel und
   * zugleich Einflusslänge für Eigengewicht und Wind auf das Drahtwerk.
   */
  /*
   * DIE SPANNWEITE STEHT ZUERST (Weisung, 28. August: «bei Trasse und
   * Fahrleitung die Spannweite als erstes nehmen»).
   *
   * Sie ist die Angabe, die IMMER von Hand kommt - und beide Felder darunter
   * hängen an ihr: aus Radius und Spannweite folgt der Winkel, aus Winkel und
   * Spannweite der Radius. Sie hinter die beiden zu stellen hiess, die
   * Rechnung von unten nach oben zu lesen.
   */
  { key: 'flSpannweite', gruppe: 'trasse', typ: 'zahl',
    label: 'Spannweite der Fahrleitung', sym: 'L_FL', einheit: 'm',
    standard: 50, schritt: 1, min: 1,
    notiz: (w) => winkelNotiz(w),
    hinweis: 'Abstand zwischen zwei Aufhängungen der Fahrleitung – nicht der ' +
             'Jochabstand. Gilt auch als Einflusslänge für Eigengewicht und ' +
             'Wind auf das Drahtwerk.' },

  { key: 'trasseRadius', gruppe: 'trasse', typ: 'zahl', label: 'Radius der Trasse',
    sym: 'R', einheit: 'm', standard: 0, schritt: 50,
    notiz: (w) => winkelNotiz(w),
    hinweis: 'Vorzeichenbehaftet: R > 0 lenkt die Fahrleitung in +x, R < 0 in ' +
             '−x. Damit steht die Bogenseite in der Geometrie und nicht in ' +
             'einem Schalter. NULL heisst gerades Gleis, ebenso sehr ' +
             'grosse Beträge. ' +
             'Der Ablenkwinkel daneben wird mitgeführt; wer ihn eintippt, ' +
             'schreibt umgekehrt diesen Radius.' },
  /*
   * DER WINKEL WIRD GEZEIGT, NICHT GESPEICHERT (`wertAus`).
   *
   * Er folgt aus Radius und Spannweite — zwei Zahlen für dieselbe Grösse
   * liefen sonst früher oder später auseinander, spätestens beim Öffnen einer
   * älteren Datei, in der nur der Radius steht. Dann zeigte das eine Feld
   * einen Bogen von 300 km und das andere −4.5°, und beide sähen richtig aus.
   *
   * Eingabe bleibt er trotzdem: wer hineintippt, schreibt den Radius daneben
   * (die Kopplung steht in app.js).
   */
  { key: 'trasseWinkel', gruppe: 'trasse', typ: 'zahl',
    label: 'Ablenkwinkel', sym: 'α', einheit: '°', standard: 0, schritt: 0.01,
    // Drei Nachkommastellen - dieselbe Genauigkeit, mit der die Notiz den
    // Winkel nennt. Feiner waere Schein: der Radius wird auf den Zentimeter
    // gerundet, und das ist auf der dritten Stelle noch nicht zu sehen.
    wertAus: (w) => (istGerade(w.trasseRadius) ? 0
      : Math.round(((ablenkwinkel(w.flSpannweite ?? 0, w.trasseRadius) * 180)
                    / Math.PI) * 1e3) / 1e3),
    notiz: (w) => radiusNotiz(w),
    hinweis: 'Der Knick der Fahrleitung an einer Aufhängung, ' +
             'vorzeichenbehaftet: α > 0 lenkt in +x, α < 0 in −x. Die ' +
             'Umlenkkraft ist U = 2·Z·sin(α/2) je Drahtwerk. Eingetippt ' +
             'schreibt er den Radius daneben; gerechnet wird mit diesem. ' +
             'Bei sehr grossen Bögen ist die Rückrechnung unscharf – ' +
             'dR/dα = R/α, bei 1200 m und 1.4° sind das 0.4 m auf die ' +
             'letzte gezeigte Stelle. Auf die Umlenkkraft wirkt sich das ' +
             'nicht aus. Am einzelnen Drahtwerk lässt sich der Winkel ' +
             'überschreiben.' },

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
    standard: 0.50, schritt: 0.01, min: 0,
    hinweis: 'In den beiden Endfeldern geht die Torsion des Jochs über die '
           + 'Anschlussebenen in den Mast – eine örtliche Krafteinleitung, '
           + 'die ein Ersatzbalken nicht führt. Gegen ein Rahmenmodell mit '
           + 'demselben Knotenmodell gemessen (31. August, 24 Fälle) zeigt '
           + 'sich das Gegenteil der früheren Annahme: das Werkzeug '
           + 'überschätzt dort, weil es die Torsion als Hüllkurve auf alle '
           + 'vier Ebenen legt. Gemessen sind k_E = 0.48 (Spanne 0.41 bis '
           + '0.64), angesetzt 0.50 – die zweite Stelle wäre bei dieser '
           + 'Streuung Scheingenauigkeit. Der Faktor wirkt NUR auf den '
           + 'Torsionsanteil und nur auf die Bleche der beiden äussersten '
           + 'Stationen je Ende; 1.0 schaltet ihn ab, 0.65 unterschreitet '
           + 'die Messung nirgends.' },
  // SCHIEFE BIEGUNG DER GURTWINKEL (core.querschnitt.js, SCHIEFE_BIEGUNG).
  // Der Winkel hat seine Hauptachsen unter 45 Grad; unter dem Rahmenmoment
  // will er quer ausweichen, und die Bindebleche der anderen Ebene halten
  // dagegen. Ohne diesen Term rechnet das Werkzeug fuer die Horizontalbleche
  // unter reiner Vertikallast EXAKT NULL - das gepruefte FEM-Modell zeigt
  // dort 11 N/mm². Hergeleitet, nicht gefittet; Vorgabe deshalb ein.
  { key: 'schiefeBiegung', optionenDialog: true, gruppe: 'komb', typ: 'schalter',
    label: 'Schiefe Biegung der Gurtwinkel auf die Bindebleche', standard: true,
    hinweis: 'Ein Winkel hat seine Hauptachsen unter rund 45° zu den ' +
             'Schenkeln. Unter dem örtlichen Rahmenmoment will er deshalb ' +
             'quer zur Lastebene ausweichen; weil die beiden Gurte einer ' +
             'Ebene Spiegelbilder sind, weichen sie gegeneinander aus, und ' +
             'die Bindebleche der anderen Ebene halten dagegen. Ohne diesen ' +
             'Anteil sind die Horizontalbleche unter reiner Vertikallast ' +
             'spannungsfrei – das geprüfte FEM-Modell zeigt dort 11 N/mm². ' +
             'Das Moment ist über die Blechlänge konstant: es erhöht σ, ' +
             'nicht τ, und wird weder auf den Anschnitt abgemindert noch vom ' +
             'Endfeldzuschlag erfasst. Voraussetzung ist die ' +
             'spiegelsymmetrische Anordnung der vier Winkel.' },
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

/**
 * REITER DES OPTIONEN-DIALOGS.
 *
 * Sechzehn Einstellungen in sieben Abschnitten standen als eine Rolle
 * untereinander; wer die Teilsicherheitsbeiwerte suchte, scrollte an der
 * Torsionsverteilung vorbei. Geordnet wird nach der FRAGE, die man mitbringt:
 * wie wird gerechnet, was wirkt, was hält dagegen, wie sieht es aus.
 *
 * Die Abschnitte bleiben - sie tragen die feinere Gliederung innerhalb eines
 * Reiters. Ein Reiter mit nur einem Abschnitt zeigt dessen Titel nicht noch
 * einmal; das waere die Ueberschrift ueber sich selbst.
 */
export const OPTIONEN_THEMEN = [
  { key: 'modell', titel: 'Rechenmodell' },
  { key: 'einwirkung', titel: 'Einwirkungen' },
  { key: 'widerstand', titel: 'Widerstand' },
  // EIGENER REITER, keine Feldliste: neben jedem Schalter muss stehen, WAS er
  // fuehrt und - wo er nicht schaltbar ist - warum nicht. Das traegt keine
  // Feldart.
  { key: 'nachweise', titel: 'Nachweise', eigen: true },
  { key: 'ansicht', titel: 'Darstellung' },
];

/** Felder des Optionen-Dialogs, nach Abschnitten geordnet. */
export const OPTIONEN_ABSCHNITTE = [
  { thema: 'modell', titel: 'Rechenmodell',
    keys: ['massVariante', 'blechQuelle', 'ausrOG', 'ausrUG'] },
  { thema: 'modell', titel: 'Torsion und Aufteilung',
    keys: ['torsionModell', 'torsionsverteilung',
           'ebenenUeberlagerung', 'gurtaufteilung', 'spannungsmodell'] },
  { thema: 'modell', titel: 'Knoten und Bindebleche',
    keys: ['knotenbereich', 'endfeldZuschlag', 'schiefeBiegung'] },
  { thema: 'einwirkung', titel: 'Einwirkungen', keys: ['lastHerkunft'] },
  { thema: 'einwirkung', titel: 'Lastbeiwerte',
    keys: ['normensatz', 'gammaG', 'gammaQ', 'psi0'] },
  { thema: 'widerstand', titel: 'Widerstand', keys: ['gammaM0'] },
  { thema: 'ansicht', titel: 'Modellansicht',
    keys: ['projektion', 'blickwinkel', 'modellTransparenz', 'modellSchrift',
           'modellSchriftLast', 'modellSchriftMass'] },
];

/**
 * Die Abschnitte eines Reiters, mit ihren sichtbaren Feldern.
 * Ohne `thema` kommen alle - so bleibt der Aufruf ohne Reiter gueltig.
 */
export function optionenFelder(werte, thema = null) {
  return OPTIONEN_ABSCHNITTE
    .filter((a) => !thema || a.thema === thema)
    .map((a) => ({
      titel: a.titel,
      felder: a.keys.map((k) => FELDER.find((f) => f.key === k))
        .filter((f) => f && (!f.sichtbar || f.sichtbar(werte))),
    })).filter((a) => a.felder.length);
}

/** Reiter, die tatsaechlich etwas zu zeigen haben. */
export function optionenThemen(werte) {
  return OPTIONEN_THEMEN.filter((t) => t.eigen || optionenFelder(werte, t.key).length);
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
  // Vergleichsmodelle (`sortiment: false`) bilden ein fremdes Bauwerk nach.
  // Sie stehen zuunterst und sagen es im Klartext - wer sie wählt, rechnet
  // kein Sortimentsjoch.
  const vergleich = (j) => ({ ...zeile(j), text: `${zeile(j).text} · Vergleichsmodell` });
  const alle = tragjoche();
  const srt = alle.filter((j) => j.sortiment !== false);
  const vgl = alle.filter((j) => j.sortiment === false);
  f.optionen = [
    ...srt.filter((j) => (j.bauweise ?? 'neu') !== 'alt').map(zeile),
    ...srt.filter((j) => (j.bauweise ?? 'neu') === 'alt').map(zeile),
    ...vgl.map(vergleich),
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

