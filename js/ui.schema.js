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

import { TRAGWERKSARTEN, tragwerksart,
         gewaehlterMast, mastName, mastNameAmEnde } from './core.constants.js';
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

/*
 * DIE MASTFELDER GELTEN DEM ANGEWAEHLTEN MASTEN.
 *
 * Weisung vom 2. September, auf die Frage «wie kann man drei verschiedene
 * Masttypen eingeben?»: das Umschalten der Masten gehoert zu den Kacheln.
 *
 * Vorher gab es je Tragwerk zwei Saetze Mastfelder - «Mastprofil» und
 * «Mastprofil Ende B», letzterer hinter einem Haekchen. Auf einer Jochreihe
 * mit drei Masten hiess das: erstes Joch anwaehlen, Haekchen setzen, Profil
 * A und B eintippen, zweites Joch anwaehlen, Haekchen setzen, dessen B
 * eintippen - und dabei wissen, dass das A des zweiten Jochs derselbe Mast
 * ist wie das B des ersten. Drei Masten, fuenf Felder, eine Falle.
 *
 * Jetzt: drei Kacheln, drei Masten, EIN Satz Felder. Was hier steht, gilt
 * dem angeklickten. `mastAktiv` ist Bedienzustand wie `bearbeiten` - er
 * entscheidet, was die Maske zeigt, und nichts am Tragwerk.
 */
/** Der Wert einer Mastangabe am angewaehlten Masten, ersatzweise flach. */
const amMast = (feld, flach) => (w) => {
  const m = gewaehlterMast(w);
  const v = m?.[feld];
  return v === undefined || v === null ? w[flach] : v;
};

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
  if (istGerade(R)) return 'gerades Gleis, keine Umlenkkraft';
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
  if (istGerade(w?.trasseRadius)) return 'gerades Gleis, keine Umlenkkraft';
  const a = (ablenkwinkel(L, w?.trasseRadius) * 180) / Math.PI;
  if (!a) return 'gerades Gleis, keine Umlenkkraft';
  const R = radiusAusWinkel(L, a);
  if (R === null) return null;
  return `entspricht R = ${Math.abs(R) >= R_GERADE ? 'gerade'
            : `${R.toFixed(0)} m`} bei L_FL = ${L.toFixed(2)} m`;
}

export const GRUPPEN = [
  /*
   * DIE TRAGWERKSART STEHT VOR ALLEM ANDEREN.
   *
   * Sie entscheidet, welche Gruppen darunter ueberhaupt eine Frage stellen:
   * ohne Traeger gibt es keinen Jochtyp, keine Gurtprofile, keine
   * Bindebleche und keine Auflagerung eines Jochs. Erst die Art, dann was
   * von ihr abhaengt - alles andere hiesse, nach Massen eines Bauteils zu
   * fragen, das es vielleicht gar nicht gibt.
   *
   * `arten` sagt, bei welchen Arten eine Gruppe erscheint. Fehlt die Angabe,
   * gilt sie fuer alle.
   */
  { id: 'art',   titel: 'Tragwerke' },
  { id: 'ort',   titel: 'Verortung' },
  { id: 'typ',   titel: 'Tragjoch-Typ und Rechenmasse',
    arten: ['joch', 'tragausleger'] },
  { id: 'geo',   titel: 'Systemgeometrie', arten: ['joch', 'tragausleger'] },
  { id: 'aufl',  titel: 'Auflagerung des Jochs', arten: ['joch'] },
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
  { id: 'prof',  titel: 'Gurtprofile', arten: ['joch', 'tragausleger'] },
  { id: 'blech', titel: 'Bindebleche', arten: ['joch', 'tragausleger'] },
  // Ohne eigene Eingabefelder: die Stückliste wird als Ergebnisstück
  // eingehängt (siehe extras in app.js).
  { id: 'stueck', titel: 'Stückliste und Eigengewicht',
    arten: ['joch', 'tragausleger'] },
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
    hinweis: 'Klartext zum Wiederfinden: Ortsname, Bahnhof, Abschnitt.',
  },
  {
    key: 'km', gruppe: 'ort', typ: 'text', label: 'KM-Position',
    standard: '', platzhalter: 'z. B. 012.345', laenge: 14,
    hinweis: 'Streckenkilometer wie im Querprofil.',
  },

  // --- Typ und Rechenmasse -------------------------------------------------
  {
    key: 'typ', gruppe: 'typ', typ: 'auswahl', label: 'Tragjoch-Typ',
    standard: 'J90', optionen: [],
    hinweis: 'Setzt Profile, Masse, Teilung, Bindebleche und Tabellenlasten.',
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
    einheit: 'm', standard: 20.0, min: 8, max: 34.5,
    // Der SCHIEBER rastet auf den halben Meter, das FELD auf den
    // Zentimeter (Weisung, 2. September). Ziehen ist die grobe Geste,
    // Tippen die genaue.
    schritt: 0.05, zugSchritt: 0.5,
    hinweis: 'Schieberbereich = Sortiment des gewählten Typs. Der Schieber '
           + 'rastet auf den halben Meter; genauer geht es im Feld daneben.',
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
    hinweis: 'Masse über dem Joch in cm ab linkem Jochende, wie auf der '
           + 'Zeichnung. Letztes Mass gleich Jochlänge. Leer lassen, wo keine '
           + 'Kette angeschrieben ist.',
  },
  { key: 'a1', gruppe: 'geo', typ: 'schieber', label: 'Endfeld am Auflager',
    sym: 'a₁', einheit: 'm', standard: 0.75, min: 0.3, max: 1.5, schritt: 0.05,
    ausDB: true,
    hinweis: 'Abstand Jochende bis erstes Bindeblech. Teilung dazwischen aus der '
           + 'Mass-Tabelle des Typs.'},
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
    hinweis: 'Wirkt auf die Vertikalbiegung; für Wind bleiben die Enden '
           + 'gelenkig.'},
  { key: 'cPhi', gruppe: 'aufl', typ: 'zahl', label: 'Drehfedersteifigkeit',
    sym: 'c_φ', einheit: 'kNm/rad', standard: 5000, schritt: 500, min: 0,
    sichtbar: (w) => w.endbedingung === 'manuell' },
  // Die Auflager stehen dort, wo die Maste stehen - nicht zwingend am Gurtende.
  // L bleibt die Länge der GURTE (daran hängt die Blecheinteilung), die
  // Stützweite ist L − kragA − kragB.
  { key: 'kragA', gruppe: 'aufl', typ: 'zahl', label: 'Kragarm Ende A',
    sym: 'c_A', einheit: 'm', standard: 0, schritt: 0.05, min: 0,
    hinweis: 'Abstand der Mastachse vom Gurtende. Stützweite = L − kragA − '
           + 'kragB; darüber hinaus wirkt das Joch als Kragarm.'},
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
  /*
   * >>> DER SCHALTER STEHT AN DER TRAGWERKSKACHEL, nicht mehr hier. <<<
   *
   * Weisung vom 2. September: «nimm das aktiv inaktiv schalten der masten
   * oben zu den kacheln». Er gilt dem TRAGWERK - beiden Enden zugleich -,
   * und an der Kachel steht er neben dem, dem er gilt. Zweimal dieselbe
   * Frage waeren zwei Orte, an denen man sie beantworten kann, und einer
   * davon wird uebersehen.
   */
  { key: 'mastVorhanden', gruppe: 'mast', typ: 'schalter', versteckt: true,
    label: 'Masten im Modell', standard: true,
    hinweis: 'Der Mast wird gezeichnet, ausgeleitet und nachgewiesen und trägt '
           + 'Wind und Anbauteile. Ob seine Steifigkeit die Drehfeder liefert, '
           + 'steht bei der Auflagerung.'},
  { key: 'mastProfil', gruppe: 'mast', typ: 'auswahl', label: (w) => `Mastprofil ${gewaehlterMast(w) ? mastName(w, gewaehlterMast(w)) : ''}`.trim(),
    standard: 'HEB 240', optionen: opt(MASTPROFILE, 'name', 'name'),
    wertAus: amMast('profil', 'mastProfil'),
    sichtbar: (w) => mastDa(w) },
  /*
   * MIT SCHIEBER (Weisung, 28. August). Masthöhe und Mastlänge sind die
   * beiden Zahlen, die man beim Einpassen einer Zeichnung nachzieht, bis
   * Modell und Bild zur Deckung kommen - und dafür ist ein Regler das
   * Werkzeug, nicht ein Zahlenfeld, in das man tippt und wieder tippt.
   */
  { key: 'mastH', gruppe: 'mast', typ: 'schieber',
    label: (w) => `Anschlusshöhe Ende A · Mast ${mastNameAmEnde(w, null, 'A')}`,
    sym: 'H', einheit: 'm', standard: 7.5, schritt: 0.05, zugSchritt: 0.5, min: 2, max: 20,
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
    sym: 'L_M', einheit: 'm', standard: 0, schritt: 0.05, zugSchritt: 0.5, min: 0, max: 25,
    wertAus: amMast('laenge', 'mastLaenge'),
    sichtbar: (w) => mastDa(w),
    hinweis: 'Gesamtlänge wie angeschrieben. Der Mast steht immer über den '
           + 'Obergurt hinaus, ohne Angabe 0.5 m. Handbuch.'},
  { key: 'mastSteg', gruppe: 'mast', typ: 'auswahl', label: 'Stegrichtung Mast',
    standard: 'jochachse', optionen: opt(STEGRICHTUNGEN),
    wertAus: amMast('steg', 'mastSteg'),
    sichtbar: (w) => mastDa(w) },
  // ZWEI MASTE.
  // Die beiden Enden eines Jochs stehen selten auf demselben Mast: das Gelände
  // fällt, die Profile unterscheiden sich, und damit auch die Einspannung.
  // Bisher galt eine Drehfeder für beide Enden - beim Vergleichsmodell
  // (HEB 260 gegen HEM 240, 9.0 gegen 13.0 m) waren das rund 10 % Unterschied.
  /*
   * >>> DIE B-FELDER SIND IN DIE KACHELN GEWANDERT. <<<
   *
   * `mastZwei`, `mastProfilB`, `mastLaengeB`, `mastStegB` bleiben im
   * Datensatz - der Rechenkern liest sie, und jede gespeicherte Datei
   * traegt sie. Als FRAGE stehen sie nicht mehr da: der zweite Mast ist
   * jetzt eine eigene Kachel, und man tippt seine Angaben dort ein, wo man
   * ihn auch sieht. `mastenProjizieren` schreibt sie beim Rechnen aus der
   * Mastenliste zurueck.
   *
   * Die ANSCHLUSSHOEHE bleibt eine Frage ans Tragwerk und steht deshalb
   * hier: sie beschreibt, wie hoch DIESES Joch an seinem Masten anschliesst,
   * nicht den Masten. Zwei Joche am selben Masten koennen verschieden hoch
   * anschliessen - deshalb hat sie seit dem 2. September ihren eigenen
   * Schalter (anschlusshoehe() in core.constants.js).
   */
  { key: 'mastZwei', gruppe: 'mast', typ: 'schalter', versteckt: true,
    label: 'Zweiter Mast am Ende B abweichend', standard: false },
  { key: 'mastProfilB', gruppe: 'mast', typ: 'auswahl', versteckt: true,
    label: 'Mastprofil Ende B',
    standard: 'HEB 240', optionen: opt(MASTPROFILE, 'name', 'name') },
  { key: 'mastHZwei', gruppe: 'mast', typ: 'schalter',
    label: (w) => `Anschlusshöhe am Ende B (Mast ${mastNameAmEnde(w, null, 'B')}) abweichend`,
    standard: false,
    sichtbar: (w) => mastDa(w) && tragwerksart(w).masten >= 2,
    hinweis: 'Nur die Höhe, an der das Joch anschliesst. Das Profil des '
           + 'zweiten Mastes steht an seiner Kachel.' },
  { key: 'mastHB', gruppe: 'mast', typ: 'schieber',
    label: (w) => `Anschlusshöhe Ende B · Mast ${mastNameAmEnde(w, null, 'B')}`,
    sym: 'H_B', einheit: 'm', standard: 7.5, schritt: 0.05, zugSchritt: 0.5, min: 2, max: 20,
    sichtbar: (w) => mastDa(w) && tragwerksart(w).masten >= 2
                  && (w.mastHZwei ?? w.mastZwei) },
  { key: 'mastLaengeB', gruppe: 'mast', typ: 'schieber', versteckt: true,
    label: 'Mastlänge Ende B',
    sym: 'L_M,B', einheit: 'm', standard: 0, schritt: 0.05, zugSchritt: 0.5, min: 0, max: 25 },
  { key: 'mastStegB', gruppe: 'mast', typ: 'auswahl', versteckt: true,
    label: 'Stegrichtung Ende B',
    standard: 'jochachse', optionen: opt(STEGRICHTUNGEN) },
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
    hinweis: 'W_pl statt W_el, nur bei Querschnittsklasse 1 oder 2. Interaktion '
           + 'linear: N/N_Rd + M_q/M_q,Rd + M_l/M_l,Rd.'},
  /*
   * DER ANSCHLUSS GEHOERT ZUR AUFLAGERUNG, nicht zum Masten: er sagt, wie
   * das JOCHENDE gehalten wird. Sichtbar ist er trotzdem nur mit Masten -
   * ohne einen gibt es nichts, woran das Joch durchlaufen könnte.
   */
  { key: 'mastAnschluss', gruppe: 'aufl', typ: 'auswahl', label: 'Anschluss ans Joch',
    standard: 'durchlaufend', optionen: opt(MASTANSCHLUESSE),
    sichtbar: (w) => mastDa(w) && w.endbedingung === 'mast',
    hinweis: 'Wirkt nur im verschieblichen Fall, also bei Wind in Jochachse und '
           + 'Längskräften. Für Vertikallast und Wind in Gleisrichtung gilt der '
           + 'Rahmenwert 4.00·E·I/H.'},
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
  /*
   * DIE GRENZLAST STEHT VOR DEM SCHALTER (Weisung, 1. September).
   *
   * Sie stand darunter und las sich dadurch als dessen Unterpunkt: bei
   * ausgeschalteter Begrenzung sah sie aus wie ein Feld ohne Wirkung. Sie hat
   * aber eine, unabhaengig vom Schalter - Pruefung A1 weist die Kraft im
   * Gurtanschluss gegen sie nach, und ohne Wert (0) entfaellt dieser Nachweis
   * stillschweigend.
   *
   * Ausgeblendet gehoert sie deshalb NICHT; sie gehoert nur nicht unter den
   * Schalter. Der begrenzt die Feder, sie ist die Grenze selbst.
   */
  { key: 'schraubenFgrenz', gruppe: 'aufl', typ: 'zahl',
    label: 'Grenzlast der Gurtverbindung', sym: 'F_Grenz', einheit: 'kN',
    standard: 24, schritt: 1, min: 0,
    sichtbar: (w) => !['gelenkig', 'voll'].includes(w.endbedingung),
    hinweis: 'Grenzwert für Prüfung A1, Gurtanschluss am Mast. Gilt auch ohne '
           + 'die Begrenzung darunter. Horizontalkraft JE GURT, die '
           + 'Ebenenkraft ist das Doppelte.'},
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
  { key: 'schraubenGrenze', gruppe: 'aufl', typ: 'schalter',
    label: 'Einspannung durch die Gurtverbindung begrenzen', standard: false,
    sichtbar: (w) => !['gelenkig', 'voll'].includes(w.endbedingung),
    hinweis: 'Die Drehfeder wird iterativ herabgesetzt, bis die Grenzlast der '
           + 'Gurtschrauben eingehalten ist.'},
  { key: 'wMast', gruppe: 'ein', typ: 'zahl', label: 'Windlast auf Mast',
    sym: 'w_Mast', einheit: 'kN/m', standard: 0.37, schritt: 0.01, min: 0,
    ausLast: true,
    wertAus: amMast('wMast', 'wMast'),
    sichtbar: (w) => mastDa(w),
    hinweis: 'Aus der Lasttabelle je Profil, Einwirkungsklasse und Stegrichtung. '
           + '«Werte bearbeiten» gibt das Feld frei.'},
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
    hinweis: 'Wind in Jochachse verdreht den Mastkopf um θ₀ = w·H³/(6·E·I). Die '
           + 'Verdrehung wird dem Jochende aufgezwungen. Wind in Gleisrichtung '
           + 'bleibt aussen vor. Handbuch.'},

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
    hinweis: 'Die Datenbank führt die gestaffelten Blechbreiten je Station.'},
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
    standard: 40, schritt: 1, min: 1,
    notiz: (w) => winkelNotiz(w),
    hinweis: 'Abstand zweier Aufhängungen der Fahrleitung, nicht der '
           + 'Jochabstand. Einflusslänge für Eigengewicht und Wind am Drahtwerk.'},

  { key: 'trasseRadius', gruppe: 'trasse', typ: 'zahl', label: 'Radius der Trasse',
    sym: 'R', einheit: 'm', standard: 0, schritt: 50,
    notiz: (w) => winkelNotiz(w),
    hinweis: 'Vorzeichenbehaftet: R > 0 lenkt in +x, R < 0 in −x. Null oder sehr '
           + 'grosse Beträge bedeuten gerades Gleis. Der Ablenkwinkel daneben '
           + 'wird mitgeführt.'},
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
    hinweis: 'Knick der Fahrleitung je Aufhängung, vorzeichenbehaftet. '
           + 'Umlenkkraft U = 2·Z·sin(α/2) je Drahtwerk. Schreibt den Radius '
           + 'daneben; am Drahtwerk überschreibbar.'},

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
    standard: '0.9', optionen: opt(WIND_KLASSEN),
    sichtbar: (w) => w.lastHerkunft === 'tabelle',
    hinweis: 'Laufmeterlast auf das Joch aus der Tabelle; der Staudruck dient '
           + 'der Einordnung.'},
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
    hinweis: 'Eigengewicht nach Sortimentstabelle plus Zuschlag.'},
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
    hinweis: 'Setzt γ und ψ auf den gewählten Satz. «Von Hand» lässt die Werte '
           + 'unverändert.'},
  { key: 'gammaG', optionenDialog: true, gruppe: 'komb', typ: 'zahl', label: 'Lastbeiwert ständig',
    sym: 'γ_G', einheit: '–', standard: 1.30, schritt: 0.05, min: 1 },
  { key: 'gammaQ', optionenDialog: true, gruppe: 'komb', typ: 'zahl', label: 'Lastbeiwert veränderlich',
    sym: 'γ_Q', einheit: '–', standard: 1.30, schritt: 0.05, min: 1 },
  { key: 'psi0', optionenDialog: true, gruppe: 'komb', typ: 'zahl',
    label: 'Beiwert Begleiteinwirkung', sym: 'ψ₀', einheit: '–',
    standard: 0.50, schritt: 0.05, min: 0,
    hinweis: 'Gilt für Wind wie für Schnee, je nach begleitender Einwirkung.'},
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
    hinweis: 'Aufteilung der Ebenenquerkraft auf Ober- und Untergurt bei '
           + 'ungleichen Profilen. Vorgabe «gemessen», k = 0.45. In den '
           + 'Horizontalebenen ohne Wirkung. Handbuch.'},
  // FESTGELEGT: der Knotenbereich ist steif, nachgewiesen wird am Anschnitt.
  // Die zweite Einstellung ist keine Alternative für den Nachweis, sondern
  // ein Vergleichsmodus gegen Prüfmodelle, die Achse zu Achse rechnen.
  { key: 'knotenbereich', optionenDialog: true, gruppe: 'komb',
    typ: 'auswahl', label: 'Knotenbereich Gurt/Blech',
    standard: 'anschnitt', optionen: opt(KNOTENBEREICHE),
    hinweis: 'Nachweis am Anschnitt des steifen Knotenbereichs. «Schwerachsen» '
           + 'dient dem Vergleich mit einem Prüfmodell, nicht dem Nachweis. '
           + 'Unterschied 11 bis 15 % auf η.'},
  // In den Endfeldern geht die Torsion über die Anschlussebenen in den Mast -
  // eine örtliche Krafteinleitung, die der Ersatzbalken nicht führt.
  { key: 'endfeldZuschlag', optionenDialog: true, gruppe: 'komb', typ: 'zahl',
    label: 'Endfeldzuschlag Bindebleche', sym: 'k_E', einheit: '–',
    standard: 0.50, schritt: 0.01, min: 0,
    hinweis: 'Faktor auf den Torsionsanteil der Bindebleche an den zwei '
           + 'äussersten Stationen je Ende. Gemessen 0.48 (Spanne 0.41 bis '
           + '0.64), angesetzt 0.50; 1.0 schaltet ab. Herleitung im Handbuch, '
           + '6.2.2.'},
  // SCHIEFE BIEGUNG DER GURTWINKEL (core.querschnitt.js, SCHIEFE_BIEGUNG).
  // Der Winkel hat seine Hauptachsen unter 45 Grad; unter dem Rahmenmoment
  // will er quer ausweichen, und die Bindebleche der anderen Ebene halten
  // dagegen. Ohne diesen Term rechnet das Werkzeug fuer die Horizontalbleche
  // unter reiner Vertikallast EXAKT NULL - das gepruefte FEM-Modell zeigt
  // dort 11 N/mm². Hergeleitet, nicht gefittet; Vorgabe deshalb ein.
  /*
   * DIE WAHL IST SELBST DAS BILD.
   *
   * Ein Auswahlmenue mit drei Woertern verlangt, dass man die drei Bauformen
   * schon kennt. Drei Strichskizzen nebeneinander verlangen nichts - man
   * sieht, was man baut. Nach der Wahl bleibt die gewaehlte gross stehen,
   * die anderen klein daneben: das Bild ist dann Rueckmeldung statt Frage.
   */
  { key: 'tragwerksart', gruppe: 'art', typ: 'tragwerke',
    label: 'Tragwerke auf diesem Querprofil', standard: 'joch',
    optionen: TRAGWERKSARTEN.map((a) => ({ wert: a.key, text: a.label,
                                           kurz: a.kurz })),
    hinweis: 'Ein Querprofil kann mehrere Tragwerke tragen — zwei Masten '
           + 'oder eine Jochreihe. Die Eingaben darunter gelten dem '
           + 'angeklickten; Verortung, Trasse, Zonen und Lastfälle gelten '
           + 'dem ganzen Blatt.' },

  /*
   * DIE LAGE ORDNET DIE LISTE UND FINDET DEN GETEILTEN MASTEN.
   *
   * Sie steht unmittelbar unter der Liste, weil sie zu ihr gehoert: wer
   * umschaltet, sieht sofort, wo das angeklickte Tragwerk steht. Als Feld
   * in der Systemgeometrie waere sie eine Laenge unter Laengen - und die
   * Frage, die sie beantwortet, ist keine Abmessung, sondern ein Ort.
   */
  { key: 'xLage', gruppe: 'art', typ: 'zahl', label: 'Lage auf dem Querprofil',
    sym: 'x₀', standard: 0, schritt: 0.1, einheit: 'm',
    hinweis: 'Quer zum Gleis, in der Jochachse, ab dem Nullpunkt der '
           + 'Zeichnung. Ordnet die Tragwerke auf dem Blatt. Stehen zwei '
           + 'Masten an derselben Stelle, teilen sich zwei Tragwerke einen '
           + 'Masten — bei einem Joch liegt der zweite bei x₀ + jt.' },

  /*
   * DIE KNICKLAENGE IST EINE FESTLEGUNG UEBER DAS TRAGWERK.
   *
   * Ein Fahrleitungsmast ist ein Kragarm - unten eingespannt, oben frei -,
   * und dafuer gibt der Eulerfall 1 beta = 2.0. Wer den Mastkopf gehalten
   * weiss, setzt weniger an. Das darf ein Werkzeug nicht selbst entscheiden,
   * aber es kann die uebliche Annahme vorschlagen.
   */
  { key: 'knickBeiwert', optionenDialog: true, gruppe: 'komb', typ: 'zahl',
    label: 'Knicklängenbeiwert Mast', sym: 'β', standard: 2.0,
    schritt: 0.1, min: 0.5, max: 4,
    hinweis: 'L_cr = β · Mastlänge. Vorgabe 2.0 — Kragarm, unten '
           + 'eingespannt, oben frei. Gerechnet wird mit der GESAMTLÄNGE, '
           + 'nicht mit der Höhe bis zur Jochachse: über dem Anschluss läuft '
           + 'der Mast weiter, und dieser Teil knickt mit.' },

  { key: 'schiefeBiegung', optionenDialog: true, gruppe: 'komb', typ: 'schalter',
    label: 'Schiefe Biegung der Gurtwinkel auf die Bindebleche', standard: true,
    hinweis: 'Zusatzmoment in den Bindeblechen aus dem Querausweichen der '
           + 'Winkelgurte (Hauptachsen unter 45°). Erhöht σ, nicht τ. Mit '
           + 'Faktor 0.70 aus 509 Messstellen angesetzt. Setzt '
           + 'spiegelsymmetrische Anordnung voraus. Handbuch, 6.2.3.'},
  { key: 'spannungsmodell', optionenDialog: true, gruppe: 'komb',
    typ: 'auswahl', label: 'Spannung im Winkel',
    standard: 'schenkel', optionen: opt(SPANNUNGSMODELLE),
    hinweis: 'Vorgabe ist W schenkelparallel. Die punktweise Auswertung der '
           + 'Eckpunkte ist genauer, verschlechtert aber heute den Abgleich '
           + 'gegen das Stabmodell. Handbuch.'},
  { key: 'ebenenUeberlagerung', optionenDialog: true, gruppe: 'komb',
    typ: 'auswahl', label: 'Überlagerung je Blechebene',
    standard: 'huellkurve', optionen: opt(EBENEN_UEBERLAGERUNG),
    hinweis: 'Torsionsschubfluss vorzeichenrichtig je Blechebene statt '
           + 'einhüllend. Braucht den Torsionsverlauf «verteilt», sonst ohne '
           + 'Wirkung. Vorgabe bleibt die Hüllkurve.'},

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
    hinweis: 'Orthogonal hält parallele Kanten parallel und Längen über die '
           + 'Tiefe vergleichbar.'},
  { key: 'blickwinkel', optionenDialog: true, gruppe: 'ansicht', typ: 'schieber',
    label: 'Blickwinkel', einheit: '°', standard: 34, min: 12, max: 70, schritt: 2,
    sichtbar: (w) => w.projektion !== 'orthogonal',
    hinweis: 'Kleiner Winkel gibt ein ruhiges Bild und weniger Verzerrung am '
           + 'Rand.'},
  /*
   * DIE ERWEITERTEN KUERZEL LASSEN SICH ABSCHALTEN (Weisung, 1. September).
   *
   * Gemeint sind die EINZELNEN Tasten - q, l, i, d, 0, 1 bis 7, p, o, h. Sie
   * wirken ohne Steuertaste und damit dort, wo sonst geschrieben wird; wer
   * viel mit der Tastatur arbeitet, will das vielleicht nicht.
   *
   * Escape und Strg+Z bleiben IMMER. Sie sind keine Erweiterung, sondern das,
   * was jede Anwendung kann, und ihr Verlust waere ein Verlust.
   */
  { key: 'tastenkuerzel', gruppe: 'ansicht', optionenDialog: true,
    typ: 'schalter', label: 'Tastenkürzel für Ansicht und Fenster',
    standard: true,
    hinweis: 'Einzelne Tasten wie q, 1 oder h. Sie wirken nie in einem '
           + 'Eingabefeld und nie bei offenem Dialog. «?» zeigt die '
           + 'Übersicht. Escape und Strg+Z bleiben immer.' },
  { key: 'modellTransparenz', optionenDialog: true, gruppe: 'ansicht',
    typ: 'schieber', label: 'Transparenz der Körper', einheit: '%',
    standard: 50, min: 0, max: 90, schritt: 5,
    hinweis: 'Durchscheinende Profile geben Schwerachsen und dahinterliegende '
           + 'Bauteile frei.'},
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
/**
 * Erscheint diese Gruppe bei der gewaehlten Tragwerksart?
 *
 * Ohne `arten` gilt sie fuer alle - das ist der Regelfall und bleibt
 * unausgesprochen. Genannt wird nur, was an eine Art gebunden ist.
 */
export function gruppeGilt(gid, werte) {
  const g = GRUPPEN.find((x) => x.id === gid);
  if (!g?.arten) return true;
  return g.arten.includes(tragwerksart(werte).key);
}

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
  /*
   * DIE DATENBASIS GEHOERT HIERHER (Weisung, 1. September).
   *
   * Sie sass auf einem eigenen Knopf in der Kopfleiste, neben Ausleiten und
   * Drucken - also dort, wo die Handgriffe des Arbeitens stehen. Jochtypen
   * und Lasttabelle wechselt man aber nicht beim Rechnen, sondern einmal;
   * das ist eine Einstellung und keine Handlung.
   */
  { key: 'daten', titel: 'Datenbasis', eigen: true },
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
  { thema: 'ansicht', titel: 'Bedienung', keys: ['tastenkuerzel'] },
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
  /*
   * DAS EIGENGEWICHT STEHT NICHT IM NAMEN (Weisung, 1. September).
   *
   * Es traegt nichts zur Unterscheidung bei: gewaehlt wird nach Typ und
   * Bauhoehe, und was das Joch wiegt, rechnet die Anwendung ohnehin aus der
   * Tabelle. Im Wahlfeld war es eine dritte Zahl, die niemand liest.
   *
   * Der Vermerk «ohne Bleche» bleibt: er sagt, dass ein Blechnachweis mit
   * diesem Typ nicht zu fuehren ist, und das muss man vor der Wahl wissen.
   */
  const zeile = (j) => ({
    wert: j.typ,
    text: `${j.typ} · jd ${j.jd}${j.voute ? `→${j.voute.endJd}` : ''} mm`
        + `${j.bleche ? '' : ' · ohne Bleche'}`,
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

