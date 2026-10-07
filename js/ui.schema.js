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
         gewaehlterMast, mastName, mastNameAmEnde,
         tragwerkPos, tragwerkeVon,
         anschlusshoehe } from './core.constants.js';
import { PROFILE, STAHLGUETEN } from './data.profiles.js';
import { tragjoche, teilung, laengenbereich } from './data.tragjoche.js';
import { abfangjoche, abfangLaengenbereich, abfangVollstaendig,
         abfangDbDa, abfangLaengen, getAbfangjoch,
         abfangMasse, getTragausleger,
         tragauslegerAufhaengung, tragauslegerSpreizung,
         TA_SPREIZUNG_VORGABE } from './data.abfangjoche.js';
import { mastprofile, mastprofileWahl, gitterBasisName, gitterOhneOben, gitterObenArt,
         STEGRICHTUNGEN, mastWindBeide,
         fundamenttypen, fundamenteDa,
         fundamentFuerMast, istGittermast, GELAENDE, gelaendeVon,
         fundamentKandidaten, fundamentlastenDa } from './data.masten.js';
import { ankerTypen, ankerDbDa, ANKER_BEFESTIGUNGEN,
         ankerGeometrie, ankerZulDruck, ankerZulZug,
         getAnkerTyp } from './data.anker.js';
import { AUSRICHTUNGEN } from './geometry.js';
import { MASSVARIANTEN, BLECHQUELLEN } from './core.vierendeel.js';
import { nachweiseAuswahl } from './core.checks.js';
import { TORSIONSVERTEILUNGEN, EBENEN_UEBERLAGERUNG, GURTAUFTEILUNGEN,
         SPANNUNGSMODELLE, KNOTENBEREICHE } from './core.querschnitt.js';
import { TORSIONSMODELLE } from './core.statics.js';

import { ENDBEDINGUNGEN, MASTANSCHLUESSE,
         mastImModell, mastLaengeVorgabe, einzelmastLaenge,
         mastLaengeFuer } from './core.auflager.js';
import { nachweiseStandard } from './core.checks.js';
import { WIND_KLASSEN, SCHNEE_KLASSEN, LASTHERKUNFT,
         NORMENSAETZE, ekVonWindklasse } from './core.lasten.js';
import { ablenkwinkel, istGerade, radiusAusWinkel,
         R_GERADE } from './core.trasse.js';

const opt = (arr, k = 'key', l = 'label') => arr.map((x) => ({ wert: x[k], text: x[l] }));

/**
 * Steht ein Mast im Modell? Dieselbe Antwort wie im Rechenkern - die Maske
 * darf ein Feld nicht zeigen, das die Rechnung nicht kennt (und umgekehrt).
 */
const mastDa = (w) => mastImModell(w);

/*
 * >>> FELDER, DIE NUR DER ERSATZBALKEN KENNT (29. September). <<<
 *
 * Weisung: «Endauflager nur Ersatzbalken, sonst ausblenden bei stabwerk.»
 * Gemessen am J90/20 m mit Hängestütze: Endauflager (gelenkig / voll /
 * aus Mast), «Anschluss ans Joch» (Kragmast) und die Begrenzung durch die
 * Gurtverbindung ändern am Stabwerk keine Stelle (Joch 0.4819, Masten
 * 0.8170 / 0.8178 in jeder Stellung) - das Stabwerk bildet Mast und
 * Anschluss selbst ab. Im Ersatzbalken wirken sie (Mast 0.8222 → 0.9637
 * bei «voll»). Die Vorgabe des Verfahrens ist das Stabwerk; nur wer den
 * Ersatzbalken wählt, sieht sie.
 */
const nurErsatzbalken = (w) => w?.rechenverfahren === 'ersatzbalken';

/**
 * Die Anschlusshoehe des ANGEWAEHLTEN Masten.
 *
 * Auf einer Jochreihe steht am Ende B ein anderer Mast mit einer anderen
 * Hoehe. Die Kopplung der Laenge muss der Hoehe folgen, die daneben im Feld
 * steht - nicht immer der des Endes A.
 */
const anschlusshoeheVon = (w) => {
  /*
   * `mastAus` traegt Profil, Laenge, Steg und Wind - die Hoehe nicht: sie
   * gehoert dem JOCHENDE, nicht dem Masten (siehe `anschlusshoehe` in
   * core.constants.js). Gefragt wird deshalb ueber das Ende, an dem der
   * angewaehlte Mast steht.
   */
  const m = gewaehlterMast(w);
  return anschlusshoehe(w, m?.ende === 'B' ? 'B' : 'A');
};

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
/*
 * >>> DIE MASKE ZEIGT, WAS GERECHNET WIRD - NICHT, WAS GESPEICHERT IST. <<<
 *
 * Gemeldet am 20. September: «hier ist die windlast in y nicht aufgefuehrt
 * beim einzelmasten. auch die angabe in der sidebar passt nicht ganz.»
 *
 * Zwei Sachen steckten darin. Erstens fuehrte die Maske nur EINEN Mastwind,
 * den in der Jochachse; der Kern rechnet seit dem 27. August mit beiden
 * Richtungen, und am Einzelmasten ist die Gleisrichtung die interessante.
 * Zweitens stand im Feld der in der Mastliste ABGELEGTE Wert, waehrend der
 * Kern den Tabellenwert nimmt: an einem HEB 220 zeigte die Maske
 * 0.37 kN/m (ein Rest vom HEB 240) und gerechnet wurden 0.28 kN/m.
 *
 * Deshalb steht hier dieselbe Herleitung wie in `mastWindSatz`
 * (core.vierendeel.js) - Tabelle, es sei denn die Lasten sind von Hand
 * freigegeben - und die Zuordnung der Spalten holt sich beides aus
 * `mastWindBeide`.
 */
const mastWindAnzeige = (w) => {
  const m = gewaehlterMast(w);
  if (!m || !m.profil) return { x: null, y: null };
  let tab = { jochachse: null, gleis: null };
  try {
    tab = mastWindBeide(m.profil, ekVonWindklasse(w.windKlasse),
                        m.steg ?? w.mastSteg ?? 'jochachse');
  } catch { /* Profil nicht im Sortiment - dann bleibt nur das Gespeicherte */ }
  const vonHand = w.wMastAusTabelle === false;
  /*
   * Fehlt die Tabellenzeile, bleibt das Feld LEER - nicht der alte Wert aus
   * der Mastliste. Er gehoert dem Profil, das dort einmal stand (20. Sept.,
   * gemeldet an einem HEB 220, der 0.30 kN/m eines HEB 240 anzeigte).
   */
  const x = vonHand ? (m.wMast ?? w.wMast ?? 0)
          : (Number.isFinite(tab.jochachse) ? tab.jochachse : null);
  return { x: x === null ? null : Math.abs(x),
           y: Number.isFinite(tab.gleis) ? Math.abs(tab.gleis) : null };
};

/** Der Wert einer Mastangabe am angewaehlten Masten, ersatzweise flach. */
const amMast = (feld, flach) => (w) => {
  const m = gewaehlterMast(w);
  const v = m?.[feld];
  return v === undefined || v === null ? w[flach] : v;
};

/*
 * >>> DER ANKER STEHT AM MASTEN, NICHT AM SATZ. <<<
 *
 * Weisung vom 9. September: «bitte danach die moeglichkeit Zuganker oder
 * Drucksuetzen an den masten zu modelieren.»
 *
 * Anders als Profil und Hoehe hat er keinen flachen Zwilling im Satz - er
 * ist ein eigenes Bauteil und gehoert genau EINEM Masten. Fehlt er, steht
 * hier der Standardwert; das Feld ist dann leer, nicht falsch belegt.
 */
const amAnker = (feld, std = '') => (w) => gewaehlterMast(w)?.anker?.[feld] ?? std;

/**
 * Die FREIE Laenge des angewaehlten Masten [m] - Fusspunkt bis Jochachse.
 *
 * Anschlusshoehe minus Fussversatz. Sie ist das Mass, ueber das sich der
 * Mast biegt, und deshalb die Bezugsgroesse der Laengenvorgabe und der
 * Drehfeder (Weisung, 12. September).
 */
const freieLaengeVon = (w) => anschlusshoeheVon(w)
  - (Number(amMast('fuss', 'mastFuss')(w)) || 0);

/**
 * Mast zu kurz für die Aufhängung (Rückfrage vom 28. September: eine
 * eingetragene Länge unter H + b wird gemeldet). Gibt die Mindestlänge
 * zurück, wenn die EINGETRAGENE Länge darunter liegt, sonst 0 - ohne
 * Eintrag gilt die Vorgabe, und die reicht immer. Dieselbe Grenze wie die
 * Ausleitung (export.axisvm.tragausleger.js), die dann kein Modell baut.
 */
export function mastZuKurzFuerAufhaengung(w) {
  if (tragwerksart(w).key !== 'tragausleger') return 0;
  const v = Number(amMast('laenge', 'mastLaenge')(w)) || 0;
  const a = tragauslegerAufhaengung(w);
  if (!(v > 0) || !a) return 0;
  const min = anschlusshoeheVon(w) + a.b;
  return v + 1e-9 < min ? min : 0;
}

/** Steht an diesem Masten ein Anker? Nur dann gelten seine Felder. */
const ankerDa = (w) => mastDa(w) && Boolean(gewaehlterMast(w)?.anker?.typ);

/**
 * DIE GEOMETRIE UNTER DEN FELDERN.
 *
 * Laenge und Neigung sind nicht einzugeben - sie folgen aus Hoehe und
 * Abstand. Sie danebenzuschreiben erspart das Nachrechnen und zeigt sofort,
 * ob der Stab zu lang fuer das Sortiment wird.
 */
function ankerNotiz(w) {
  const a = gewaehlterMast(w)?.anker;
  if (!a?.typ || !ankerDbDa()) return '';
  const g = ankerGeometrie(a.h, a.a);
  if (!g) return 'Höhe und Abstand eintragen — beide grösser als null.';
  let t;
  try { t = getAnkerTyp(a.typ); } catch { return ''; }
  const zD = ankerZulDruck(a.typ, g.L);
  const zZ = ankerZulZug(a.typ, a.befestigung ?? 'ankerplatte');
  const lang = g.L > (t.laengeMax ?? Infinity) + 1e-9;
  return `Stablänge ${g.L.toFixed(2)} m · Neigung ${g.alpha.toFixed(1)}° `
    + `gegen die Waagrechte · zulässig ${zZ?.toFixed(0) ?? '–'} kN Zug, `
    + (lang
        ? `Druck NICHT geführt — über ${(t.laengeMax ?? 0).toFixed(2)} m `
          + 'gibt es diesen Typ nicht'
        : `${zD?.toFixed(1) ?? '–'} kN Druck`);
}

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
  /*
   * DAS ABFANGJOCH HAT EBENFALLS EINEN TYP (seit dem 3. September).
   *
   * Sein Sortiment ist ein anderes - A160 bis A360, dazu die Altbauweise
   * nach Profilbezeichnung -, aber die FRAGE ist dieselbe: welcher Typ,
   * welche Laenge. Sie gehoert in dieselbe Gruppe; was sie zur Wahl stellt,
   * entscheidet die Tragwerksart (siehe `optionenAus` am Feld `typ`).
   */
  /*
   * >>> DER TYP UND DIE MASSE SIND EIN ABSCHNITT. <<<
   *
   * Weisung vom 13. September: «sidebar system aufraeumen». «Jochtyp und
   * Rechenmasse» fuehrte GENAU EIN Feld - eine Ueberschrift fuer eine
   * Zeile -, und die Masse darunter standen in einem zweiten Abschnitt,
   * obwohl der Typ sie setzt. Wer den Typ wechselt, aendert damit jd, jbb
   * und die Teilung; das gehoert zusammengelesen.
   */
  /*
   * DIE GEOMETRIE GILT AUCH FUERS ABFANGJOCH - mit seinen eigenen Feldern.
   * Dort steht die Laengenauswahl statt des Schiebers, und die Masse des
   * Tragjochquerschnitts (jd, jbb, Endfeld, Masskette) bleiben aus: sie
   * kommen beim Abfangjoch aus dem Sortiment und sind nicht einzustellen.
   */
  /*
   * Weisung vom 28. September zur Maske des Tragauslegers: «bei der Eingabe
   * der Länge steht noch Jochtyp. Die Masse sollten unter profile wandern.
   * beim auflager ist auch noch alles mit joch benannt und die
   * auflagerskizze sollte die vom abfangjoch übernommen werden, da die
   * Bedingungen gleich sind.» Der Titel hängt deshalb an der Art.
   */
  { id: 'geo',   titel: 'Jochtyp und Geometrie',
    titelJe: { tragausleger: 'Ausleger und Geometrie' },
    feinTitel: 'Masse aus dem Sortiment', extraFein: true,
    arten: ['joch', 'tragausleger', 'abfangjoch'] },
  /*
   * >>> EINE GRUPPE FUERS AUFLAGER, NICHT ZWEI. <<<
   *
   * Weisung vom 9. September: «es hat momentan zwei gruppen für die auflager
   * (Auflagerung des Jochs und unter Masten) wäre es nicht sinnvoller eine
   * einzige gruppe mit dem Auflager zu machen?»
   *
   * Ja. Die Auflagerangaben standen an zwei Orten: Endbedingung, Drehfeder,
   * Kragarme und Anschlussart hier - die BEDINGUNG am Masten dagegen unter
   * «Masten», zwischen Profil und Anschlusshoehe. Wer das Ende beschreiben
   * wollte, musste zwei Abschnitte auf und ab gehen, und beide sagten
   * einander nicht, dass sie dasselbe Ende meinen.
   *
   * DIE TRENNUNG LIEGT JETZT DORT, WO SIE HINGEHOERT:
   *
   *      Auflager   WIE das Tragwerk gelagert ist   Bedingung, Feder, Kragarm
   *      Masten     WAS dort steht                  Profil, Hoehe, Laenge, Steg
   *
   * WARUM SIE FRUEHER BEI DEN MASTEN STAND: die Gruppe hiess «Auflagerung
   * des Jochs» und fuehrte `arten: ['joch']` - das Abfangjoch sah sie nie,
   * und genau dort sollte die Bedingung einstellbar sein. Die Schranke ist
   * jetzt weg; was nur das Tragjoch betrifft (Ersatzbalken, Drehfeder,
   * Kragarme), traegt sie am FELD, wo sie hingehoert.
   */
  { id: 'aufl',  titel: 'Auflager',
    feinTitel: 'Drehfeder, Konsole, Gurtverbindung' },
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
  { id: 'mast',  titel: 'Masten',
    feinTitel: 'Fusspunkt, zweites Ende, Nachweis' },
  /*
   * >>> DER PROFILREITER GILT ALLEN ARTEN. <<<
   *
   * Weisung vom 11. September: «alle ergaenzten bauteile unter profile
   * nachfuehren, so wie bei den tragjochen.»
   *
   * Er war auf Tragjoch und Tragausleger begrenzt - beim Abfangjoch und beim
   * Einzelmasten fehlte er ganz, und mit ihm die STAHLGUETE und der
   * Teilsicherheitsbeiwert, die jedem Tragwerk gelten. Die Gurtfelder
   * blenden sich weiterhin selbst aus (`sichtbar` am Feld); was bleibt, ist
   * die Profiluebersicht und der Stahl.
   */
  { id: 'prof',  titel: 'Profile' },
  // Der Tragausleger führt seine Bleche im Sortiment (Tafel unter «Geometrie»).
  { id: 'blech', titel: 'Bindebleche', arten: ['joch'] },
  // Ohne eigene Eingabefelder: die Stückliste wird als Ergebnisstück
  // eingehängt (siehe extras in app.js).
  { id: 'stueck', titel: 'Stückliste und Eigengewicht',
    arten: ['joch'] },
  /*
   * >>> DIE TRASSE FAENGT ZUGEKLAPPT AN. <<<
   *
   * Weisung vom 13. September: «bauteile optimieren». Der Reiter
   * «Anbauteile» begann mit drei Feldern, die man EINMAL einstellt -
   * Spannweite, Radius, Ablenkwinkel -, und erst darunter kam, worum es
   * geht: die Liste der Bauteile. An jedem Arbeitsgang scrollte man daran
   * vorbei.
   *
   * `zugeklappt` macht aus der Gruppe einen Klappabschnitt statt einer
   * Ueberschrift. Sie bleibt oben - die Ablenkung folgt aus ihr, und das
   * liest sich von oben nach unten -, kostet aber nur noch eine Zeile.
   */
  { id: 'trasse', titel: 'Trasse und Fahrleitung', zugeklappt: true },
  { id: 'anbau', titel: 'Anbauteile' },
  /*
   * >>> NACH EINWIRKUNG GEGLIEDERT (6. Oktober). <<< Weisung: «diese
   * eingaben hinterfragen und die gliderung nachvollziehbarer machen. das
   * eigengewicht wird aus den stäben generiert, die windlasten aufführen für
   * joche und masten gleichbedeutend und nicht in einer separeten gruppe die
   * zugeklappt ist.» Statt «Verteilte Einwirkungen» mit einer zugeklappten
   * zweiten Ebene (Zuschlag, Mastwind) je Einwirkung eine Gruppe: Wind
   * (Stufe, Reduktion, Joch, Masten in beiden Richtungen), Ständig, Schnee,
   * Bestandesschutz. Die Schlüssel der Felder bleiben.
   */
  { id: 'ein',   titel: 'Wind', feinTitel: 'Nur Ersatzbalken' },
  { id: 'staendig', titel: 'Ständige Lasten' },
  { id: 'schnee', titel: 'Schnee' },
  { id: 'bestand', titel: 'Bestandesschutz' },
  { id: 'havarie', titel: 'Havarie: welcher Leiter reisst' },
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
  /*
   * >>> DIE PROJEKTANGABEN (17. September, nach BlockCalc). <<<
   *
   * Projektnummer, Bearbeiter und Datum stehen am Tragwerk wie die
   * Verortung: in der Ablage, im Bericht, in der Projektliste. Auch sie
   * gehen in keine Rechnung ein.
   */
  {
    key: 'projektNr', gruppe: 'ort', typ: 'text', label: 'Projektnummer',
    standard: '', platzhalter: 'z. B. P-2026-014', laenge: 20,
    hinweis: 'Nummer des Projekts. Steht in der Kopfzeile des Berichts.',
  },
  {
    key: 'bearbeiter', gruppe: 'ort', typ: 'text', label: 'Bearbeiter',
    standard: '', platzhalter: 'Kürzel oder Name', laenge: 24,
    hinweis: 'Wird für das nächste neue Tragwerk vorgeschlagen.',
  },
  {
    key: 'datum', gruppe: 'ort', typ: 'text', label: 'Datum',
    standard: '', platzhalter: 'TT.MM.JJJJ', laenge: 12,
    hinweis: 'Datum der Bearbeitung. Leer beim Speichern: heute.',
  },

  // --- Typ und Rechenmasse -------------------------------------------------
  {
    key: 'typ', gruppe: 'geo', typ: 'auswahl',
    /*
     * >>> DER ABFANGJOCHTYP GEHOERT NICHT IN DIESES FELD. <<<
     *
     * Erster Versuch: eine Liste, zwei Sortimente, je nach Art. Das sah
     * aufgeraeumt aus und brach sofort - `typ` ist die Angabe, mit der der
     * RECHENKERN sein Joch aus der Typendatenbank holt (`getTragjoch`). Ein
     * «A160» darin wirft «Unbekannter Tragjochtyp», und zwar an Stellen,
     * die mit der Eingabe nichts zu tun haben - beim blossen Ziehen an
     * einer Mastmarke etwa.
     *
     * Zwei Sortimente, zwei Felder. Sichtbar ist immer nur eines; welches,
     * sagt die Tragwerksart.
     */
    /*
     * Beim Tragausleger auch nicht (28. September): er hat kein Tragjoch,
     * seine Länge wählt die Zeile seines Sortiments.
     */
    sichtbar: (w) => !['abfangjoch', 'tragausleger'].includes(tragwerksart(w).key),
    /*
     * DAS JOCH NENNT SEINE POSITION, wie der Mast seine Nummer.
     *
     * Weisung vom 3. September: «kannst du noch bei der längeneingabe den
     * aktiven joch (position) benennen, so wie bei den masten.» Auf einer
     * Reihe stehen drei gleiche Joche; welches die Felder gerade meinen,
     * stand nirgends - man musste es sich aus der Leiste merken.
     */
    label: (w) => `Tragjoch-Typ ${tragwerkPos(w, tragwerkeVon(w)[0])}`.trim(),
    standard: 'J90', optionen: [],
    hinweis: 'Setzt Profile, Masse, Teilung, Bindebleche und Tabellenlasten.',
  },
  /*
   * >>> DER TYP DES ABFANGJOCHS. <<<
   *
   * Ein eigenes Feld, weil es ein eigenes Sortiment ist: A160 bis A360 im
   * aktuellen, die Altbauweise nach Profilbezeichnung (UAP 130, IPE 270).
   * Es steht an derselben Stelle wie der Tragjochtyp und sieht gleich aus -
   * sichtbar ist immer nur das eine.
   *
   * >>> GERECHNET WIRD ER NOCH NICHT. <<<
   *
   * Der Abfangjoch-Rechenkern fehlt noch, aber nicht, weil der Rechenweg
   * ein anderer waere: das Abfangjoch ist ein LIEGENDER Vierendeeltraeger -
   * zwei Gurte statt vier, eine Blechebene statt zweier, Rahmenebene
   * waagrecht statt senkrecht (Weisung, 3. September). Was hier gewaehlt
   * wird, benennt bis dahin das Bauteil und geht in die Ausleitung, nicht
   * in den Nachweis - und genau das sagt der Hinweis in der Auswertung.
   */
  { key: 'abfangTyp', gruppe: 'geo', typ: 'auswahl',
    label: (w) => `Abfangjoch-Typ ${tragwerkPos(w, tragwerkeVon(w)[0])}`.trim(),
    standard: 'A160', optionen: [],
    optionenAus: () => abfangOptionen(),
    sichtbar: (w) => tragwerksart(w).key === 'abfangjoch',
    hinweis: 'Aktuelles Sortiment A160–A360, darunter die Altbauweise nach '
           + 'ihrer Profilbezeichnung. Der Nachweis des Abfangjochs wird noch '
           + 'nicht geführt.' },
  {
    key: 'massVariante', optionenDialog: true, gruppe: 'geo', typ: 'auswahl', label: 'Hebelarme aus',
    standard: 'schwerpunkt', optionen: opt(MASSVARIANTEN),
  },

  // --- Systemgeometrie -----------------------------------------------------
  {
    // Die Spannweite ist NICHT gesperrt: sie ist die Grösse, die am häufigsten
    // variiert wird. Der Schieber ist auf den Sortimentsbereich des Typs
    // begrenzt, damit man nicht unbemerkt aus dem Katalog läuft.
    /*
     * >>> EIN SCHIEBER, BEI BEIDEN ARTEN DERSELBE. <<<
     *
     * Weisung vom 4. September: «mit schieber gleich wie bei den tragjochen
     * die bedienung und auswahl der abfangjoche umsetzen, da die groesseren
     * typen einen viel groesseren range haben bezueglich der laenge und wir
     * ein einheitliches bild wollen.»
     *
     * Zuerst stand hier eine Auswahlliste - das Sortiment fuehrt ja nur
     * gefuehrte Laengen. Bei A360 sind das aber dreiundzwanzig Eintraege
     * von 17.50 bis 28.50 m, und eine Liste dieser Laenge liest sich
     * schlechter als ein Schieber, der auf dieselben Werte rastet.
     *
     * DAS RASTER MACHT DIE ARBEIT: `zugSchritt` 0.5 trifft jede gefuehrte
     * Laenge des Abfangjochs, und `setzeGrenzen` zieht min/max aus dem
     * jeweiligen Sortiment nach. Was dazwischen von Hand eingetippt wird,
     * faengt `aendern` ab - dort rastet die Zahl auf die naechste gefuehrte
     * Laenge ein.
     */
    key: 'L', gruppe: 'geo', typ: 'schieber', sym: 'jt',
    label: (w) => `${tragwerksart(w).key === 'tragausleger' ? 'Auslegerlänge' : 'Jochlänge'} `
      + `${tragwerkPos(w, tragwerkeVon(w)[0])}`.trim(),
    einheit: 'm', standard: 20.0, min: 8, max: 34.5,
    // Der SCHIEBER rastet auf den halben Meter, das FELD auf den
    // Zentimeter (Weisung, 2. September). Ziehen ist die grobe Geste,
    // Tippen die genaue.
    schritt: 0.05, zugSchritt: 0.5,
    hinweis: (w) => (tragwerksart(w).key === 'tragausleger'
      ? 'Länge des Sortiments Tragausleger (UPE 140). Sie wählt Blechraster '
      + 'und Aufhängung; eine Zahl dazwischen rastet auf die nächste '
      + 'geführte ein.'
      : tragwerksart(w).key === 'abfangjoch'
      ? 'Schieberbereich = Sortiment des gewählten Typs. Das Abfangjoch '
      + 'führt nur die Längen im Halbmeterraster; eine Zahl dazwischen '
      + 'rastet auf die nächste geführte ein.'
      : 'Schieberbereich = Sortiment des gewählten Typs. Der Schieber '
      + 'rastet auf den halben Meter; genauer geht es im Feld daneben.'),
  },
  /*
   * >>> DIE STÜTZWEITE BEIM KRAGARM (30. September). <<<
   * Rückfrage «Stützweite eingeben»: die Masten bleiben stehen, das Joch
   * ragt um die Kragarme über sie hinaus - L = Stützweite + c_A + c_B.
   * Kein eigener Wert: das Feld zeigt L − c_A − c_B und schreibt L
   * (app.js, `stuetzweite`). Nur mit Kragarm; ohne ist es L.
   */
  { key: 'stuetzweite', gruppe: 'geo', typ: 'zahl', label: 'Stützweite (Mastabstand)',
    sym: 'js', einheit: 'm', standard: 0, schritt: 0.05,
    wertAus: (w) => Math.round(((Number(w.L) || 0) - Math.max(0, Number(w.kragA) || 0)
      - Math.max(0, Number(w.kragB) || 0)) * 1000) / 1000,
    sichtbar: (w) => tragwerksart(w).key === 'joch'
      && ((Number(w.kragA) || 0) > 0 || (Number(w.kragB) || 0) > 0),
    hinweis: 'Abstand der beiden Masten. Die Jochlänge L darüber ist die '
           + 'Gurtlänge = Stützweite + Kragarm A + Kragarm B.' },
  /*
   * >>> DIE SEITE DES TRAGAUSLEGERS (28. September). <<<
   *
   * «der Ausleger kann zudem links oder rechts sein.» Auf Rückfrage: GANZ
   * SPIEGELN - Kern, Stabwerk, AxisVM, 3D und Lageband. Die Lagen x der
   * Anbauteile zählen weiter vom Masten aus ins Feld des Auslegers; die
   * Kräfte bleiben global (die Ablenkkraft kommt aus der Trasse), so dass
   * sie je nach Seite zum Masten hin oder von ihm weg ziehen.
   */
  { key: 'auslegerSeite', gruppe: 'geo', typ: 'auswahl',
    label: 'Seite des Auslegers', standard: 'rechts',
    optionen: [{ wert: 'rechts', text: 'rechts (+x, Jochachse)' },
               { wert: 'links', text: 'links (−x)' }],
    sichtbar: (w) => tragwerksart(w).key === 'tragausleger',
    hinweis: 'Gespiegelt wird das ganze Modell. Die Kräfte bleiben global - '
           + 'eine Ablenkkraft in +x zieht rechts vom Masten weg, links zu ihm hin.' },
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
    key: 'masskette', fein: true, gruppe: 'geo', typ: 'text',
    sichtbar: (w) => tragwerksart(w).key === 'joch',
    label: 'Masskette der Zeichnung', einheit: 'cm', standard: '',
    platzhalter: 'z. B. 15 209 474 735 885 983 1185 1200', laenge: 120,
    hinweis: 'Masse über dem Joch in cm ab linkem Jochende, wie auf der '
           + 'Zeichnung. Letztes Mass gleich Jochlänge. Leer lassen, wo keine '
           + 'Kette angeschrieben ist.',
  },
  { key: 'a1', fein: true, gruppe: 'geo', typ: 'schieber', label: 'Endfeld am Auflager',
    sichtbar: (w) => tragwerksart(w).key === 'joch',
    sym: 'a₁', einheit: 'm', standard: 0.75, min: 0.3, max: 1.5, schritt: 0.05,
    ausDB: true,
    hinweis: 'Abstand Jochende bis erstes Bindeblech. Teilung dazwischen aus der '
           + 'Mass-Tabelle des Typs.'},
  // Bei verjüngten Enden und Grundrissknick sind das die Masse IM FELD; die
  // Werte am Jochende ergeben sich daraus über Voute und Knick.
  { key: 'jd', fein: true, gruppe: 'geo', typ: 'zahl', label: 'Gesamthöhe im Feld (Aussenmass)',
    sichtbar: (w) => tragwerksart(w).key === 'joch',
    sym: 'jd', einheit: 'mm', standard: 500, schritt: 10, min: 50, ausDB: true },
  { key: 'jbbOG', fein: true, gruppe: 'geo', typ: 'zahl', label: 'Breite Obergurt im Feld (Aussenmass)',
    sichtbar: (w) => tragwerksart(w).key === 'joch',
    sym: 'jbb,OG', einheit: 'mm', standard: 440, schritt: 10, min: 50, ausDB: true },
  { key: 'jbbUG', fein: true, gruppe: 'geo', typ: 'zahl', label: 'Breite Untergurt im Feld (Aussenmass)',
    sichtbar: (w) => tragwerksart(w).key === 'joch',
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
  /*
   * DIESE VIER GELTEN DEM ERSATZBALKEN DES TRAGJOCHS - Endbedingung,
   * Drehfeder und die beiden Kragarme. Bis zum 9. September trug die GRUPPE
   * die Schranke `arten: ['joch']`; seit sie das Auflager aller Arten
   * fuehrt, steht sie am Feld.
   */
  /* =========================================================================
   * >>> DIE VORGABE FOLGT DER AUFLAGERBEDINGUNG. <<<
   * =========================================================================
   *
   * Weisung vom 13. September: «offene fragen umsetzen» - darunter die
   * Frage, ob `links` zur Vorgabe werden soll.
   *
   * Sie soll. Gemessen am J90 / 20.00 m mit HEB 260:
   *
   *   Endauflager   c_A [kNm/rad]   eta      Pruefung A2
   *   mast              16'710      0.4567   WARNT
   *   links                  0      0.5086   -
   *   gelenkig               0      0.5086   ok
   *   voll             unendlich    0.4913   WARNT
   *
   * >>> DIE ALTE VORGABE WARNTE IM REGELFALL. <<<
   *
   * `mast` setzt die Drehfeder des Mastes an - 16'710 kNm/rad. Das
   * ausgeleitete Modell ist zugleich GELENKIG, weil die Auflagerbedingung
   * den Obergurt laengs freigibt. Zwei verschiedene Tragwerke, und man sieht
   * es keiner Zahl an.
   *
   * DAS MODELL HAT RECHT, nicht der Kern. Ein Jochende wird ueber das
   * KRAEFTEPAAR der beiden Gurtebenen eingespannt; gibt eine Ebene laengs
   * nach, gibt es kein Paar, und dann traegt auch der steifste Mast kein
   * Moment ins Joch. Die Mastfeder in Reihe dahinter ist wirkungslos - sie
   * stand bisher allein da und spannte ein Ende ein, das konstruktiv nicht
   * eingespannt ist.
   *
   * >>> DAS KOSTET ELF PROZENT, UND ZWAR AUF DER SICHEREN SEITE. <<<
   *
   * eta 0.4567 -> 0.5086. Wer die alte Rechnung will, waehlt «teilweise.
   * Steifigkeit aus Mast» - die Wahl bleibt, nur die Vorgabe wechselt.
   */
  { key: 'endbedingung', gruppe: 'aufl', typ: 'auswahl', label: 'Endauflager',
    standard: 'links', optionen: opt(ENDBEDINGUNGEN),
    sichtbar: (w) => tragwerksart(w).key === 'joch' && nurErsatzbalken(w),
    hinweis: 'Wirkt auf die Vertikalbiegung; für Wind bleiben die Enden '
           + 'gelenkig. Die Vorgabe nimmt die Feder aus der '
           + 'Auflagerbedingung am Masten — dann rechnen Kern und '
           + 'ausgeleitetes Modell dasselbe Tragwerk.'},
  { key: 'cPhi', fein: true, gruppe: 'aufl', typ: 'zahl', label: 'Drehfedersteifigkeit',
    sym: 'c_φ', einheit: 'kNm/rad', standard: 5000, schritt: 500, min: 0,
    sichtbar: (w) => tragwerksart(w).key === 'joch' && nurErsatzbalken(w)
                  && w.endbedingung === 'manuell' },
  // Die Auflager stehen dort, wo die Maste stehen - nicht zwingend am Gurtende.
  // L bleibt die Länge der GURTE (daran hängt die Blecheinteilung), die
  // Stützweite ist L − kragA − kragB.
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
   * >>> HIER STAND `mastVorhanden` EIN ZWEITES MAL. <<<
   *
   * Versteckt, mit einem anderen Namen («Masten im Modell») und einem
   * anderen Hinweistext als der sichtbare Schalter weiter unten. Zwei
   * Einträge unter DEMSELBEN Schlüssel: wer `FELDER.find(f => f.key ===
   * 'mastVorhanden')` schreibt, bekommt den versteckten - also den, den
   * niemand sieht und niemand pflegt.
   *
   * Er ist weg. Der Schalter steht jetzt an EINER Stelle, ganz oben in der
   * Gruppe «Masten», wo man ihn sucht.
   */
  /*
   * >>> DIE STELLE DES ANGEWAEHLTEN MASTEN. <<<
   *
   * Gemeldet am 3. September: «beim angeklicktem rechten masten, wird der x
   * wert der lage nicht aktualisiert.»
   *
   * Zu Recht - nur war es kein Fehler im Feld, sondern ein fehlendes Feld.
   * «Lage auf dem Querprofil x₀» ist die Lage des TRAGWERKS, also seines
   * linken Endes; klickt man den rechten Masten an, aendert sich daran
   * nichts, und der Wert bleibt stehen. Was fehlte, war die Stelle des
   * MASTEN selbst.
   *
   * Sie ist keine eigene Angabe, sondern eine gerechnete: sie folgt aus x₀
   * und der Jochlaenge. Eingeben laesst sie sich trotzdem - dieselbe
   * Wirkung wie das Ziehen an der Marke in der Leiste:
   *
   *   Ende A   verschiebt das Tragwerk (x₀ wandert, die Laenge bleibt)
   *   Ende B   aendert die Laenge (das andere Ende bleibt stehen)
   *   geteilt  beides zugleich - das linke Joch wird laenger, das rechte
   *            wandert mit
   *
   * Damit gilt, was am 2. September verlangt wurde: ziehen fuer grob, Feld
   * fuer genau - auch fuer den Mastabstand.
   */
  /*
   * >>> DER SCHALTER, DER SICH SELBST VERSTECKT HAETTE. <<<
   *
   * Weisung vom 3. September: «Dieser button ist sehr maechtig. wie kann man
   * sonst die Masten wieder einblenden? koennte man ueber das kontextmenue
   * oder in der sidebar unter masten einen box setzen?»
   *
   * Gemeint ist das Symbol in der Tragwerksleiste. Es schaltet die Masten
   * eines Tragwerks aus - und danach war es der EINZIGE Weg zurueck: alle
   * uebrigen Mastfelder haengen an `mastDa`, also verschwand mit den Masten
   * auch die ganze Gruppe «Masten» aus der Seitenleiste. Wer den kleinen
   * Knopf nicht kennt, findet keinen Rueckweg.
   *
   * Frueher stand dieser Schalter schon einmal hier und wanderte an die
   * Kachel, «weil er unter den Mastfeldern etwas schaltete, was man dort
   * gar nicht sah». Das galt, solange die Felder dastanden. Jetzt kommt er
   * zurueck - aus dem umgekehrten Grund: er ist das EINZIGE, was dann noch
   * dasteht.
   *
   * IMMER SICHTBAR, auch ohne Masten. Ein Schalter, dessen Aus-Zustand ihn
   * selbst verschwinden laesst, ist eine Falle.
   */
  /*
   * >>> DIE AUFLAGERBEDINGUNG AM MASTEN, ANKLICKBAR. <<<
   *
   * Weisung vom 5. September: «die Auflagerbedingung sollten anpassbar sein
   * in der app, am besten mit einem interaktiven diagramm (richtungsfeder
   * und drehfeder ein aus schalten koennen) und beim aufklappen kann man die
   * einzelnen Federeigenschaften der einzelnen gurte noch anpassen.»
   *
   * Sie gilt dort, wo ein Mast im Modell steht - ohne Mast gibt es kein
   * Linkelement, an dem sich etwas einstellen liesse. Was hier steht, geht
   * in die AxisVM-Ausleitung; der Ersatzbalken des Rechenkerns kennt sie
   * nicht, er traegt seine Drehfeder.
   *
   * >>> SIE STEHT BEI DEN MASTEN, NICHT BEI DER AUFLAGERUNG. <<<
   *
   * Die Gruppe «Auflagerung des Jochs» fuehrt `arten: ['joch']` - sie
   * beschreibt den Ersatzbalken des Tragjochs mit Endbedingung, Drehfeder
   * und Kragarmen. Das Abfangjoch sieht sie nie, und genau dort soll die
   * Bedingung jetzt einstellbar sein (Weisung, 5. September: «bei den
   * Abfangjochen wird man zudem noch die vorderen und hinteren auflager
   * unterschiedlich einstellen koennen»).
   *
   * Die Gruppe «Masten» kennt keine Artenschranke - und ihr Name trifft es
   * ohnehin besser: es ist die Bedingung AM MASTEN.
   */
  /*
   * >>> DER SCHALTER STEHT ZUOBERST. <<<
   *
   * Weisung vom 5. September: «das deaktivieren der masten im modell sollte
   * klar auswaehlbar sein und nicht als einziges button unter der
   * schemadarstellung tragwerke.»
   *
   * Er stand unten in der Gruppe, hinter Profil, Anschlusshoehe, Laenge und
   * Stegrichtung - also hinter allem, was ihn voraussetzt. Wer die Masten
   * abschalten wollte, fand zuerst den kleinen Symbolknopf in der
   * Tragwerksleiste und nahm an, das sei der einzige Weg.
   *
   * IMMER SICHTBAR, auch ohne Masten. Ein Schalter, dessen Aus-Zustand ihn
   * selbst verschwinden laesst, ist eine Falle.
   */
  { key: 'mastVorhanden', gruppe: 'mast', typ: 'schalter',
    label: 'Tragwerk steht auf Masten', standard: true,
    // Nicht beim Tragausleger (30. September): er hängt am Masten, ohne
    // ihn gibt es ihn nicht.
    sichtbar: (w) => tragwerksart(w).traeger === true
      && tragwerksart(w).key !== 'tragausleger',
    hinweis: 'Aus: das Tragwerk wird ohne Masten gerechnet und gezeichnet — '
           + 'es steht dann auf der eingestellten Auflagerbedingung. Derselbe '
           + 'Schalter sitzt als Symbol in der Tragwerksleiste.' },
  { key: 'mastX', gruppe: 'mast', typ: 'zahl',
    label: (w) => `Stelle ${mastName(w, gewaehlterMast(w))} auf dem Querprofil`,
    sym: 'x', einheit: 'm', standard: 0, schritt: 0.05,
    wertAus: (w) => gewaehlterMast(w)?.x ?? 0,
    /*
     * NUR, WO ES ZWEI MASTEN GIBT (Weisung vom 18. September: «die eingabe
     * der x koordinaten bei den einzelmasten wird doppelt aufgeführt»).
     * Ein Tragwerk mit einem Masten steht mit diesem an seiner Lage x₀ -
     * das Feld darunter war dieselbe Zahl ein zweites Mal.
     */
    sichtbar: (w) => mastDa(w) && Boolean(gewaehlterMast(w))
      && (tragwerksart(w).masten ?? 2) >= 2,
    hinweis: 'Folgt aus der Lage des Tragwerks und der Jochlänge. Am linken '
           + 'Ende verschiebt die Eingabe das Tragwerk, am rechten ändert sie '
           + 'die Jochlänge — dasselbe wie das Ziehen an der Marke.' },
  // Die reale Mastnummer (30. September) - nur Anzeige, siehe MASTFELDER.
  { key: 'mastNummer', gruppe: 'mast', typ: 'text',
    label: (w) => `Mastnummer ${gewaehlterMast(w) ? mastName(w, gewaehlterMast(w)) : ''}`.trim(),
    standard: '', wertAus: amMast('nummer', 'mastNummer'),
    sichtbar: (w) => mastDa(w),
    // Meist ganze Zahlen (30. September: «die msten werden meist mit
    // ganzen zahlen ohne punkt beschriftet»).
    hinweis: 'Reale Nummer aus dem Querprofil (z. B. 14). Ersetzt M1 in '
           + 'Anzeige, Bericht und Excel; gerechnet und ausgeleitet wird '
           + 'weiter unter M1. Leer: M1.' },
  { key: 'mastProfil', gruppe: 'mast', typ: 'auswahl', label: (w) => `Mastprofil ${gewaehlterMast(w) ? mastName(w, gewaehlterMast(w)) : ''}`.trim(),
    standard: 'HEB 260', optionenAus: () => opt(mastprofileWahl(), 'name', 'name'),
    // Der Wähler zeigt den Grundtyp; «ohne Rohr» steht im Kästchen darunter.
    wertAus: (w) => gitterBasisName(amMast('profil', 'mastProfil')(w)),
    sichtbar: (w) => mastDa(w) },
  /*
   * >>> GITTERMAST OHNE ROHR BZW. MASTAUFSATZ (7. Oktober). <<< «biete die
   * möglichkeit beim gittermasten, das rohr bzw. den mastaufsatz
   * wegzulassen», dann «nicht im mastwähler sondern als separate checkbox».
   * Kein eigenes Feld im Stand: `aendern` schreibt den Profilnamen des
   * Mastes (Grundtyp oder Variante, data.masten.js).
   */
  { key: 'mastGitterOhne', gruppe: 'mast', typ: 'schalter',
    label: (w) => (gitterObenArt(amMast('profil', 'mastProfil')(w)) === 'aufsatz'
      ? 'Mastaufsatz weglassen' : 'Rohr weglassen'),
    wertAus: (w) => gitterOhneOben(amMast('profil', 'mastProfil')(w)),
    hinweis: 'Nur das Gitter: das Rohr entfällt ganz (auch sein Stück im Gitter), '
      + 'der Aufsatz ebenso; die Mastlänge ist die Höhe des Gitters.',
    sichtbar: (w) => mastDa(w) && Boolean(gitterObenArt(amMast('profil', 'mastProfil')(w))) },
  /*
   * MIT SCHIEBER (Weisung, 28. August). Masthöhe und Mastlänge sind die
   * beiden Zahlen, die man beim Einpassen einer Zeichnung nachzieht, bis
   * Modell und Bild zur Deckung kommen - und dafür ist ein Regler das
   * Werkzeug, nicht ein Zahlenfeld, in das man tippt und wieder tippt.
   */
  /*
   * BEIM TRAGAUSLEGER STEHT SIE UNTER DEM AUSLEGER (Rückfrage 28. September:
   * «Beim Ausleger») - sie legt fest, wo er und seine Aufhängung am Masten
   * sitzen, und ist damit eine Angabe des Auslegers.
   */
  /*
   * >>> UND BEIM JOCH UNTER DEM JOCH (30. September). <<<
   * Weisung: «diese anschlusshöhe sollte unter der jochgruppe stehen und
   * nicht beim masten» - sie legt fest, wo das JOCH am Masten sitzt, und
   * gehört dem Tragwerk (siehe `MASTFELDER`: die Anschlusshöhe bleibt beim
   * Tragwerk). Ende B mit ihr (`mastHZwei`, `mastHB`).
   */
  { key: 'mastH', gruppe: 'mast', typ: 'schieber',
    gruppeAus: () => 'geo',
    label: (w) => (tragwerksart(w).key === 'tragausleger'
      ? `Höhe Ausleger über Fundament · Mast ${mastNameAmEnde(w, null, 'A')}`
      : `Anschlusshöhe Ende A · Mast ${mastNameAmEnde(w, null, 'A')}`),
    sym: 'H', einheit: 'm', standard: 7.5, schritt: 0.05,
    // Am Tragausleger auf 0.10 m (6. Oktober: «Schieber Mastlänge auf 0.50 m
    // schritte. Höhe Ausleger auf 0.10m schritte.»), sonst der halbe Meter.
    zugSchritt: (w) => (tragwerksart(w).key === 'tragausleger' ? 0.1 : 0.5), min: 2, max: 20,
    /*
     * NICHT BEIM EINZELMAST (Weisung, 18. September: «beim einzelmast ohne
     * tragausleger ist nicht relevant, ausblenden»). Es schliesst kein Joch
     * an; der Mast rechnet mit seiner Laenge (core.auflager.js,
     * einzelmastLaenge).
     */
    sichtbar: (w) => mastDa(w) && tragwerksart(w).key !== 'einzelmast' },
  /* =========================================================================
   * >>> DIE AUFHÄNGUNG: b UND WINKEL, GEKOPPELT (28. September). <<<
   * =======================================================================
   *
   * «man muss aber den abschnitt b eingeben können. in der normzeichnung ist
   * der winkel mit 30° angegeben, diesen wert kann man als start nehmen. es
   * kann aber sein das man spezialfälle hat wo dieser winkel kleiner oder
   * grösser ist.» Auf Rückfrage: beide Felder, gekoppelt, Vorgabe 30°.
   *
   * Gespeichert wird allein der WINKEL (`auslegerWinkel`); b zeigt
   * c₁ · tan α, und wer b eintippt, setzt damit den Winkel (app.js). Zwei
   * gespeicherte Zahlen für dieselbe Geometrie liefen beim nächsten
   * Längenwechsel auseinander.
   */
  { key: 'auslegerB', gruppe: 'geo', typ: 'schieber',
    label: 'Aufhängung über dem Ausleger', sym: 'b', einheit: 'm',
    standard: 0, schritt: 0.05, zugSchritt: 0.5, min: 0.5, max: 12,
    // Auf den Millimeter: b folgt aus dem gespeicherten Winkel, und ohne
    // Rundung stand nach der Eingabe «6» im Feld «6.000004».
    wertAus: (w) => Math.round((tragauslegerAufhaengung(w)?.b ?? 0) * 1000) / 1000,
    sichtbar: (w) => tragwerksart(w).key === 'tragausleger',
    hinweis: 'Am Masten gemessen, von der Achse des Auslegers bis zum '
           + 'Aufhängepunkt. Gekoppelt mit dem Winkel: tan α = b / c₁.' },
  /*
   * GESPEICHERT 0 HEISST «NACH SORTIMENT» (Rückfrage, 28. September: «b der
   * Tabelle»). Das Feld zeigt dann den Winkel, der aus b und c₁ der Tabelle
   * folgt - wie der Fahrdrahtschieber seine Automatik; wer 0 einträgt,
   * kehrt zur Tabelle zurück.
   */
  { key: 'auslegerWinkel', gruppe: 'geo', typ: 'schieber',
    label: 'Winkel Seil – Ausleger', sym: 'α', einheit: '°',
    standard: 0, schritt: 0.1, zugSchritt: 5, min: 0, max: 60,
    wertAus: (w) => tragauslegerAufhaengung(w)?.alpha ?? 0,
    sichtbar: (w) => tragwerksart(w).key === 'tragausleger',
    notiz: (w) => {
      const a = tragauslegerAufhaengung(w);
      if (!a) return '';
      return a.nachSortiment
        ? `nach Sortiment: b ${a.b.toFixed(2)} m, α ${a.alpha.toFixed(2)}°`
        : `eingetragen · Sortiment b ${a.t.seil.b.toFixed(2)} m `
          + `(α ${(Math.atan(a.t.seil.b / a.c1) * 180 / Math.PI).toFixed(2)}°) - 0 setzt zurück`;
    },
    hinweis: 'Ohne Eintrag gilt b des Sortiments (Normzeichnung rund 30°); '
           + 'Spezialfälle kleiner oder grösser. 0 = nach Sortiment. '
           + 'c₁ bleibt nach Sortiment.' },
  /*
   * ZWEI SEILE, GESPREIZT (Entscheid 28. September, «Ja, Spreizung als
   * Eingabe»): je Seil der Abstand zur Auslegerachse in Gleisrichtung, an
   * den Enden der Ankertraverse (Normzeichnung, Detail W). Vorgabe 1 m;
   * 0 = ein Seil in der Achse.
   */
  { key: 'auslegerSpreizung', gruppe: 'geo', typ: 'schieber',
    label: 'Spreizung der Aufhängung (je Seite)', sym: 's', einheit: 'm',
    standard: TA_SPREIZUNG_VORGABE, schritt: 0.05, min: 0, max: 1,
    sichtbar: (w) => tragwerksart(w).key === 'tragausleger',
    notiz: (w) => (tragwerksart(w).key === 'tragausleger'
      ? (tragauslegerSpreizung(w) > 0
        ? `2 Seile an der Ankertraverse, ${(2 * tragauslegerSpreizung(w)).toFixed(2)} m auseinander`
        : '1 Seil in der Auslegerachse - hält keine Torsion bei c₁')
      : ''),
    hinweis: 'Je Seil der Abstand zur Auslegerachse in Gleisrichtung, an den '
           + 'Enden der Ankertraverse; am Masten treffen sich beide Seile. '
           + 'Gegengleiche Seilkräfte halten die Torsion schon bei c₁. '
           + '0 = ein Seil in der Achse.' },
  /* =========================================================================
   * >>> DER LÄNGSANKER DES TRAGAUSLEGERS (Weisung vom 28. September). <<<
   * =======================================================================
   *
   * «beim tragausleger wid ein längsanker angebracht am ende des kragarms
   * um die torsionseinwirkung abzufangen.» Auf Rückfrage: REGELFALL,
   * abschaltbar, und «nur Zug, beidseitig» - zwei Seile, je eines nach +y
   * und −y, ohne Vorspannung. Im linearen Stabwerk ist das ein fester Halt
   * in Gleisrichtung: es trägt immer das Seil, zu dem hin gezogen wird.
   * Die Stelle ist wählbar; 0 = Kragarmende (Vorgabe).
   *
   * Gemessen L = 13 m mit Hängestütze: Mast 2.103 -> 0.838, Fundament
   * 1.445 -> 0.671. Das ersetzt den Entscheid vom 26. September
   * («zuschaltbar», Vorgabe aus) in der Vorgabe, nicht in der Sache.
   *
   * UNTER DEM AUSLEGER, nicht beim Masten (Weisung 28. September: «diese
   * Angaben gehören auch zum Tragausleger und nicht zum Masten»), gleich
   * unter seiner Höhe.
   */
  { key: 'laengsverankerung', gruppe: 'geo', typ: 'schalter',
    label: 'Längsanker am Kragarm', standard: true,
    sichtbar: (w) => tragwerksart(w).key === 'tragausleger',
    hinweis: 'Zwei Seile in Gleisrichtung (+y und −y), nur Zug, ohne '
           + 'Vorspannung - sie nehmen die Kraft in Gleisrichtung am Ausleger '
           + 'auf, und die Torsion geht nicht mehr über den langen Hebel in '
           + 'den Masten. Die Neigung der Seile ist nicht berücksichtigt.' },
  /*
   * Ein Schieber bis zum Kragarmende (Weisung 28. September: «die x werte
   * sollten auf die länge limitiert werden») - als Zahlenfeld liess sich
   * jede Zahl eintragen, und über dem Ende verweigerte sich das Stabmodell.
   */
  { key: 'laengsverankerungX', gruppe: 'geo', typ: 'schieber',
    label: 'Stelle des Längsankers', sym: 'x_LA', einheit: 'm',
    standard: 0, schritt: 0.05, zugSchritt: 0.5, min: 0, max: 13,
    maxAus: (w) => kragarmEnde(w),
    // 0 heisst Kragarmende - der Schieber zeigt dann das Ende, nicht den Masten.
    wertAus: (w) => (Number(w.laengsverankerungX) > 0 ? Number(w.laengsverankerungX) : kragarmEnde(w)),
    sichtbar: (w) => tragwerksart(w).key === 'tragausleger' && w.laengsverankerung !== false,
    hinweis: 'Ab der Mastachse gemessen. 0 = am Ende des Kragarms (Vorgabe).' },
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
  /*
   * >>> SIE IST AN DIE ANSCHLUSSHOEHE GEKOPPELT. <<<
   *
   * Weisung vom 5. September: «das feld Mastlaenge mit der Anschlusshoehe
   * koppeln, die Mastlaenge als voreinstellwert 0.5m laenger auf
   * anschlusshoehe bezogen.»
   *
   * Das Feld stand auf 0 und meinte damit «keine Angabe». Man sah ihm nicht
   * an, wie lang der Mast dann wirklich ist - und Bild und Modell waren sich
   * darueber nicht einig. Jetzt steht die Zahl da, die gilt: H + 0.50 m.
   *
   * Wer sie zieht, loest die Kopplung fuer dieses Tragwerk; wer sie wieder
   * auf H + 0.50 stellt, schliesst sie. `aendern` fuehrt sie nach, solange
   * sie gekoppelt ist (siehe app.js).
   */
  { key: 'mastLaenge', gruppe: 'mast', typ: 'schieber',
    label: 'Mastlänge gesamt (Fuss bis Kopf)',
    /*
     * DAS SORTIMENT FUEHRT DEN HALBEN METER (Weisung, 5. September). Der
     * SCHIEBER rastet darauf - `zugSchritt` -, das Zahlenfeld daneben bleibt
     * fein: wer eine Laenge vom Blatt abliest, soll sie eintippen koennen,
     * auch wenn sie zwischen zwei Rasterschritten liegt. Die VORGABE liegt
     * auf dem Raster, und darum ging es.
     */
    sym: 'L_M', einheit: 'm', standard: 0, schritt: 0.05, zugSchritt: 0.5,
    min: 0, max: 25,
    wertAus: (w) => {
      const v = amMast('laenge', 'mastLaenge')(w);
      // Vom FUSS gemessen: die Laenge ist Fuss bis Kopf, und seit dem
      // 12. September liegt der Fuss nicht mehr zwingend bei -H.
      return v > 0 ? v : mastLaengeFuer(w, freieLaengeVon(w));
    },
    sichtbar: (w) => mastDa(w),
    /*
     * Beim Ausleger haengt die Vorgabe an b (also am Winkel) - die Zahl
     * steht deshalb in der NOTIZ, die bei jeder Eingabe nachgefuehrt wird;
     * der Hinweis wird nur beim Aufbau der Maske geschrieben und stand nach
     * einer Aenderung von b mit der alten Zahl da (im Browser gesehen,
     * 28. September). Dort steht auch «Mast zu kurz für die Aufhängung».
     */
    notiz: (w) => {
      if (tragwerksart(w).key !== 'tragausleger') return '';
      const vorg = mastLaengeFuer(w, freieLaengeVon(w));
      const min = mastZuKurzFuerAufhaengung(w);
      if (min) {
        return `MAST ZU KURZ FÜR DIE AUFHÄNGUNG: mindestens ${min.toFixed(2)} m `
          + `(H + b), Vorgabe ${vorg?.toFixed(2) ?? '–'} m.`;
      }
      return vorg ? `Vorgabe H + b, auf den halben Meter: ${vorg.toFixed(2)} m.` : '';
    },
    hinweis: (w) => (tragwerksart(w).key === 'tragausleger'
      ? 'Gesamtlänge wie angeschrieben. Ohne Eintrag reicht der Mastkopf bis '
        + 'zur Aufhängung: H + b, auf den halben Meter aufgerundet.'
      : `Gesamtlänge wie angeschrieben. Vorgabe ist 0.50 m über `
           + `Oberkante Obergurt, aufgerundet auf den halben Meter — hier ${
             mastLaengeVorgabe(freieLaengeVon(w), w.jd).toFixed(2)} m bei `
           + `H = ${freieLaengeVon(w).toFixed(2)} m und jd = ${
             Math.round(Number(w.jd) || 0)} mm. Handbuch.`) },
  /*
   * >>> FUSSPUNKT UND ANSCHLUSSHOEHE SIND ZWEI MASSE. <<<
   *
   * Weisung vom 12. September. Bis dahin lag der Fuss IMMER genau die
   * Anschlusshoehe unter der Jochachse, und die Mastlaenge wuchs allein nach
   * oben. Ein Mast, dessen Fuss vierzig Zentimeter tiefer steht - fallendes
   * Gelaende, tiefere Einbindung -, war nicht abzubilden: bei gleicher
   * Anschlusshoehe las das Modell die Mehrlaenge als Ueberstand oben.
   *
   * NULL IST DER REGELFALL und heisst: Fuss auf der Bezugshoehe, alles wie
   * bisher. Negativ heisst tiefer.
   *
   * >>> ER VERLAENGERT DEN HEBEL DER DREHFEDER. <<<
   *
   * c_phi = Rahmenfaktor * E*I/H, und H ist die FREIE Laenge vom Fuss bis
   * zur Jochachse. Ein tieferer Fuss macht die Einspannung also weicher -
   * das ist keine Darstellung, das rechnet mit. Der Hinweis sagt es, damit
   * niemand den Wert fuer eine Bildkorrektur haelt.
   */
  { key: 'mastFuss', fein: true, gruppe: 'mast', typ: 'schieber',
    label: (w) => `Fusspunkt · Mast ${gewaehlterMast(w) ? mastName(w, gewaehlterMast(w)) : ''}`.trim(),
    // Der halbe Meter am Schieber wie bei jeder Laenge; das Zahlenfeld
    // daneben bleibt fein - ein Gelaendesprung misst selten 0.50 m.
    sym: 'Δz_F', einheit: 'm', standard: 0, schritt: 0.05, zugSchritt: 0.5,
    min: -3, max: 3,
    wertAus: amMast('fuss', 'mastFuss'),
    // Nicht am Einzelmasten (30. September, Rückfrage «Ausblenden»): dort
    // regiert die Länge; siehe `einzelmastFussAnheben`.
    sichtbar: (w) => mastDa(w) && tragwerksart(w).key !== 'einzelmast',
    hinweis: (w) => `Versatz des Fusspunktes gegen die Bezugshöhe, positiv `
           + `nach oben. 0 = Fuss genau ${anschlusshoeheVon(w).toFixed(2)} m `
           + `unter der Jochachse; negativ bei fallendem Gelände oder tieferer `
           + `Einbindung. Verlängert die freie Länge und macht damit die `
           + `Drehfeder weicher — c_φ = Rahmenfaktor · E·I/H.` },
  { key: 'mastFussB', fein: true, gruppe: 'mast', typ: 'schieber', versteckt: true,
    label: 'Fusspunkt Ende B',
    sym: 'Δz_F,B', einheit: 'm', standard: 0, schritt: 0.05, zugSchritt: 0.5,
    min: -3, max: 3 },
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
  /* =========================================================================
   * >>> WELCHE HOEHE DER FAHRDRAHTVERSCHIEBUNG GILT (24. September). <<<
   * =======================================================================
   *
   * Weisung: «es sollte einen schieber geben welche höhe für die
   * farhdrahtverschiebung massgebend ist.»
   *
   * Der Nachweis «40 mm quer zum Gleis» braucht eine Stelle. Bis dahin
   * suchte sie `messStelle` selbst: höchstes Drahtwerk, sonst höchster
   * Ausleger, sonst Jochauflager. Das trifft den Regelfall - aber es misst
   * am ANSCHLUSSPUNKT eines Teils, und der Fahrdraht hängt darunter.
   *
   * NULL = AUTOMATISCH. Das ist nicht nur Bequemlichkeit: jeder
   * gespeicherte Stand trägt die Null, und er soll weiterrechnen wie
   * bisher. Der Hinweis nennt deshalb, WAS die Automatik gerade nimmt.
   * ======================================================================= */
  /*
   * >>> DER SCHIEBER ZEIGT, WAS GILT, UND ENDET AM MASTKOPF (28. Sept.). <<<
   *
   * Gemeldet mit dem Bild des Schiebers: «diser steht vielmals auf 0 und
   * die länge ist nicht auf die mastlänge limitiert». Beides stimmte:
   * (1) Die 0 ist die AUTOMATIK - gerechnet wurde auf einer ganz anderen
   *     Höhe, aber der Schieber stand am linken Anschlag und sah aus wie
   *     «nicht gesetzt» oder «Fahrdraht am Boden». Jetzt steht bei der
   *     Automatik die Höhe da, auf der wirklich gemessen wird
   *     (`setzeFdAutomatik`, aus der letzten Rechnung), und die
   *     Beschriftung sagt «automatisch». Gespeichert bleibt die 0 - jeder
   *     alte Stand rechnet weiter wie bisher; erst wer zieht oder tippt,
   *     setzt eine eigene Höhe, und 0 führt zur Automatik zurück.
   * (2) Der Schieber lief bis 25 m, der Mast endet bei 8.50. Über dem
   *     Kopf gilt die Eingabe nicht (Entscheid 24. September) - ein
   *     Bereich, in dem jede Stellung verworfen wird, ist eine Falle. Die
   *     Grenze ist jetzt der Mastkopf (`maxAus`, der höhere der beiden
   *     Masten, denn die Höhe gilt beiden).
   */
  { key: 'fdHoehe', gruppe: 'mast', typ: 'schieber',
    label: (w) => (Number(w.fdHoehe) > 0
      ? 'Höhe Fahrdraht für die Verformung'
      : `Höhe Fahrdraht für die Verformung — automatisch${
          fdAutomatik ? ` (${fdAutomatik.was})` : ''}`),
    // Der Schieber rastet auf den halben Meter wie jede Laenge; das
    // Zahlenfeld daneben bleibt fein - eine Fahrdrahthoehe steht auf der
    // Zeichnung mit dem Zentimeter.
    sym: 'z_Fd', einheit: 'm', standard: 0, schritt: 0.05, zugSchritt: 0.5,
    min: 0, max: 25,
    maxAus: (w) => Math.max(mastKopfHoehe(w, 'A'),
                            w.mastZwei ? mastKopfHoehe(w, 'B') : 0),
    wertAus: (w) => (Number(w.fdHoehe) > 0 ? Number(w.fdHoehe)
      : (fdAutomatik ? Math.round(fdAutomatik.z * 100) / 100 : 0)),
    /*
     * >>> NICHT MEHR UNTER MASTEN (30. September). <<<
     * Die Referenzhöhe wählt man jetzt in den Optionen und im Block
     * «Gebrauchstauglichkeit» der Übersicht (Rückfrage «Weg, Optionen
     * führen»); `fdHoehe` bleibt der Wert der «eigenen Höhe».
     */
    sichtbar: () => false,
    hinweis: 'Über dem Mastfuss gemessen, höchstens bis zum Mastkopf. Dort '
           + 'wird die Seitenlage quer zum Gleis gegen 40 mm nachgewiesen '
           + '(Betriebswind ψ 0.70). Automatisch (Eingabe 0): höchstes '
           + 'Drahtwerk, sonst höchster Ausleger, sonst das Jochauflager — '
           + 'der Schieber zeigt dann die Höhe, die gilt. Ziehen oder Tippen '
           + 'setzt eine eigene Höhe; 0 führt zur Automatik zurück.' },
  /* =========================================================================
   * >>> DAS FUNDAMENT DES MASTEN (Weisung vom 24. September). <<<
   * =======================================================================
   *
   * «die Fundamentzuordnug zu den einzelnen Masttypen … die Fundamente
   * auch noch separat als ausnutzungsbeiwert in die nachweisführung
   * aufnehmen (gesamtheitliche Tragwerksbetrachtung).»
   *
   * VORGABE IST DIE ZUORDNUNG des Sortiments - sie folgt Profil und
   * Stegrichtung und trifft den Regelfall. Die Wahl ist für den
   * Bestand da (ein vorhandenes Fundament unter einem neuen Masten)
   * und für Sonderfälle.
   *
   * Der Hinweis nennt, WAS die Automatik nimmt - sonst wäre «nach
   * Masttyp» eine Angabe, die man nicht nachprüfen kann.
   */
  /*
   * >>> DAS GELÄNDE AM MASTFUSS (7. Oktober). <<< Weisung: «fundamentflow
   * und gelände >14° einbauen». Es wählt die Tabelle der zulässigen Lasten
   * und die Fundamenttypen, die dort zur Wahl stehen. «Fallende Böschung»
   * heisst: das Moment quer wirkt Richtung fallende Seite - die Mappe lässt
   * es ebenso wählen.
   */
  { key: 'mastGelaende', gruppe: 'mast', typ: 'auswahl',
    label: 'Gelände am Mastfuss', standard: 'bis14',
    optionen: GELAENDE.map((g) => ({ wert: g.key, text: g.text })),
    wertAus: amMast('gelaende', 'mastGelaende'),
    sichtbar: (w) => mastDa(w) && fundamenteDa() && fundamentlastenDa()
      && !istGittermast(gewaehlterMast(w)?.profil ?? w.mastProfil),
    hinweis: 'Neigung des Geländes am Fundament. Über 14° gelten andere Fundamenttypen '
           + 'und kleinere zulässige Lasten; «fallende Böschung», wenn das Moment quer '
           + 'zum Gleis Richtung fallende Seite wirkt.' },
  { key: 'mastGelaendeB', gruppe: 'mast', typ: 'auswahl', versteckt: true,
    label: 'Gelände Ende B', standard: '' },
  { key: 'mastFundament', gruppe: 'mast', typ: 'auswahl',
    label: 'Fundament', standard: '',
    /*
     * >>> VORAUSWAHL UND NUR WAS ZUM MASTEN PASST (6. Oktober). <<< Weisung:
     * «diese Masttyp angabe mit vorauswahl versehen entsprechend dem
     * Masttyp, bei den Gittermasten mit Typ spez. (alt) versehen. die
     * Auswahl auf den jeweils ausgewählten Masttyp begrenzen.» Die erste
     * Zeile nennt das Fundament der Zuordnung beim Namen; angeboten wird nur,
     * was das Sortiment diesem Profil zuordnet (beim HEM 240 beide
     * Stegrichtungen). Der Gittermast hat kein Standardfundament. Ein
     * gespeicherter Typ, der nicht passt, bleibt sichtbar und sagt es.
     */
    optionenAus: (w) => {
      const m = gewaehlterMast(w);
      const p = String(m?.profil ?? w?.mastProfil ?? '');
      const jetzt = String(m?.fundament ?? w?.mastFundament ?? '');
      const fremd = (liste) => (jetzt && !liste.some((o) => o.wert === jetzt)
        ? [...liste, { wert: jetzt, text: `${jetzt} — passt nicht zu ${p}` }] : liste);
      if (istGittermast(p)) {
        return fremd([{ wert: '', text: 'Typ spez. (alt) — kein Standardfundament' }]);
      }
      // Mit dem Gelände (7. Oktober): angeboten wird, was die Tabelle dort führt.
      const gel = gelaendeVon(m?.gelaende ?? w?.mastGelaende).key;
      const auto = fundamentFuerMast(p, m?.steg ?? w?.mastSteg, gel);
      const passend = fundamentlastenDa()
        ? fundamentKandidaten(p, null, gel)
        : fundamenttypen().filter((f) => String(f.profile ?? '')
          .split(',').map((x) => x.trim()).includes(p));
      return fremd([
        { wert: '', text: auto ? `${auto.typ} (nach Masttyp)` : 'kein Standardfundament für dieses Profil' },
        ...passend.filter((f) => f.typ !== auto?.typ).map((f) => ({ wert: f.typ,
          text: `${f.typ}${f.neubau === false ? ' — Spezialfall' : ''}` })),
      ]);
    },
    wertAus: amMast('fundament', 'mastFundament'),
    sichtbar: (w) => mastDa(w) && fundamenteDa(),
    hinweis: (w) => {
      const m = gewaehlterMast(w);
      if (istGittermast(m?.profil ?? w.mastProfil)) {
        return 'Gittermast (alte Bauweise): Fundament nach Typ spezifisch - das Sortiment '
             + 'führt kein Standardfundament, der Fundamentnachweis wird nicht geführt.';
      }
      const gel = gelaendeVon(m?.gelaende ?? w.mastGelaende);
      const f = fundamentFuerMast(m?.profil ?? w.mastProfil,
                                  m?.steg ?? w.mastSteg, gel.key);
      return `Zulässige Lasten am Fundamentkopf, charakteristisch — `
           + `quer und längs einzeln nachgewiesen, Gelände ${gel.text}. `
           + (fundamentlastenDa() ? 'Überschreitungen gleicht der Ablauf der '
             + 'Fundamentbestimmung über die Abminderungswerte aus. ' : '')
           + (f ? `Nach Masttyp: ${f.typ} (M_q ${f.Mq} / M_l ${f.Ml} kNm, `
                + `H_q ${f.Hq} / H_l ${f.Hl} kN).`
                : 'Für dieses Profil führt das Sortiment kein '
                + 'Standardfundament — bitte wählen.');
    } },
  { key: 'mastFundamentB', gruppe: 'mast', typ: 'auswahl', versteckt: true,
    label: 'Fundament Ende B', standard: '' },
  { key: 'mastZwei', gruppe: 'mast', typ: 'schalter', versteckt: true,
    label: 'Zweiter Mast am Ende B abweichend', standard: false },
  { key: 'mastProfilB', gruppe: 'mast', typ: 'auswahl', versteckt: true,
    label: 'Mastprofil Ende B',
    standard: 'HEB 260', optionenAus: () => opt(mastprofile(), 'name', 'name') },
  { key: 'mastHZwei', fein: true, gruppe: 'mast', typ: 'schalter', gruppeAus: () => 'geo',
    label: (w) => `Anschlusshöhe am Ende B (Mast ${mastNameAmEnde(w, null, 'B')}) abweichend`,
    standard: false,
    sichtbar: (w) => mastDa(w) && tragwerksart(w).masten >= 2,
    hinweis: 'Nur die Höhe, an der das Joch anschliesst. Das Profil des '
           + 'zweiten Mastes steht an seiner Kachel.' },
  { key: 'mastHB', fein: true, gruppe: 'mast', typ: 'schieber', gruppeAus: () => 'geo',
    label: (w) => `Anschlusshöhe Ende B · Mast ${mastNameAmEnde(w, null, 'B')}`,
    sym: 'H_B', einheit: 'm', standard: 7.5, schritt: 0.05, zugSchritt: 0.5, min: 2, max: 20,
    sichtbar: (w) => mastDa(w) && tragwerksart(w).masten >= 2
                  && (w.mastHZwei ?? w.mastZwei) },
  { key: 'mastLaengeB', gruppe: 'mast', typ: 'schieber', versteckt: true,
    label: 'Mastlänge Ende B',
    sym: 'L_M,B', einheit: 'm', standard: 0, schritt: 0.05, zugSchritt: 0.5,
    min: 0, max: 25 },
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
  /*
   * IN DER NACHWEISLEISTE, NICHT IM SYSTEM (Weisung vom 18. September: «das
   * plastische nachweisen sollte nicht im system sondern unter dem nachweis
   * sidebar stehen»). Das Feld bleibt im Schema - Wert, Vorgabe und alte
   * Staende -, gezeigt wird es unter den Nachweiskacheln (`plastischHtml`).
   */
  { key: 'mastPlastisch', fein: true, gruppe: 'mast', typ: 'schalter', versteckt: true,
    label: 'Mast plastisch nachweisen', standard: false,
    sichtbar: (w) => mastDa(w),
    hinweis: 'W_pl statt W_el, nur bei Querschnittsklasse 1 oder 2. Interaktion '
           + 'linear: N/N_Rd + M_q/M_q,Rd + M_l/M_l,Rd.'},
  /* =========================================================================
   * ZUGANKER UND DRUCKSTUETZE AM MASTEN
   * =========================================================================
   *
   * Weisung vom 9. September: «bitte danach die moeglichkeit Zuganker oder
   * Drucksuetzen an den masten zu modelieren. diese sind gelenkig gelagert.»
   *
   * Ein schraeger Stab vom Masten zu einem eigenen Fundament. Beschrieben
   * wird er durch ZWEI Masse - die Anschlusshoehe am Masten und den
   * waagrechten Abstand des Fundaments. Laenge und Neigung folgen daraus und
   * stehen als Notiz darunter; sie sind keine Eingabe.
   *
   * Er gehoert dem ANGEWAEHLTEN Masten, wie Profil und Hoehe: die
   * Kachelreihe darueber sagt, welcher gemeint ist.
   * ====================================================================== */
  { key: 'ankerTyp', gruppe: 'mast', typ: 'auswahl',
    label: (w) => `Zuganker / Druckstütze ${
      gewaehlterMast(w) ? mastName(w, gewaehlterMast(w)) : ''}`.trim(),
    standard: '', wertAus: amAnker('typ', ''),
    optionenAus: () => [{ wert: '', text: 'keiner' },
      ...ankerTypen().map((t2) => ({ wert: t2.id,
        text: `${t2.name} · ${t2.art === 'seil' ? 'nur Zug'
          : `bis ${(t2.laengeMax ?? 0).toFixed(2)} m`}` }))],
    optionen: [{ wert: '', text: 'keiner' }],
    sichtbar: (w) => mastDa(w) && ankerDbDa(),
    hinweis: 'Ein schräger Stab vom Masten zu einem eigenen Fundament, an '
           + 'beiden Enden gelenkig — er trägt nur Normalkraft. Die Stütze '
           + 'nimmt Zug und Druck, der Seilanker nur Zug.' },
  { key: 'ankerH', gruppe: 'mast', typ: 'schieber',
    label: 'Anschlusshöhe des Ankers am Masten',
    sym: 'h_A', einheit: 'm', standard: 7.79, schritt: 0.05, zugSchritt: 0.5,
    min: 0.5, max: 20, wertAus: amAnker('h', 7.79),
    sichtbar: ankerDa,
    hinweis: 'Über dem Mastfuss gemessen — dem Referenzpunkt des Modells. '
           + 'Tief angeschlossen wird der Stab flacher und damit wirksamer.' },
  { key: 'ankerA', gruppe: 'mast', typ: 'schieber',
    label: 'Abstand des Ankerfundaments',
    sym: 'a_A', einheit: 'm', standard: 4.5, schritt: 0.05, zugSchritt: 0.5,
    min: 0.5, max: 20, wertAus: amAnker('a', 4.5),
    sichtbar: ankerDa,
    hinweis: 'Waagrecht vom Mastfuss bis zum Ankerfundament. Das ist die '
           + 'Angabe, die auf dem Plan steht: dort wird das Fundament '
           + 'gesetzt. Voreingestellt sind 4.50 m.' },
  /*
   * >>> DER WINKEL IST EINE EINGABE, ABER KEINE ANGABE. <<<
   *
   * Weisung vom 11. September: «der anker hat einen winkel von ca 60°.» So
   * denkt man ueber einen Anker - nicht in Hoehe und Abstand, sondern in
   * seiner Neigung.
   *
   * Gespeichert wird er NICHT: er folgt aus Hoehe und Abstand, und zwei
   * Speicherorte fuer dieselbe Groesse laufen auseinander. Wer ihn
   * eintraegt, verstellt damit die HOEHE; der Abstand bleibt stehen.
   */
  { key: 'ankerWinkel', gruppe: 'mast', typ: 'schieber',
    label: 'Neigung des Ankers',
    sym: 'α', einheit: '°', standard: 60, schritt: 1, zugSchritt: 5,
    min: 5, max: 85,
    wertAus: (w) => {
      const ak = gewaehlterMast(w)?.anker;
      const h = Number(ak?.h) || 0, a = Number(ak?.a) || 0;
      return a > 0 && h > 0
        ? Math.round((Math.atan2(h, a) * 180) / Math.PI) : 60;
    },
    sichtbar: ankerDa,
    notiz: ankerNotiz,
    hinweis: 'Gegen die WAAGRECHTE gemessen. Bei 60° ist der Stab genau '
           + 'doppelt so lang wie der Abstand seines Fundaments. Ziehen '
           + 'verstellt die Anschlusshöhe am Masten — der Abstand bleibt.' },
  /*
   * >>> IN WELCHER EBENE ER LIEGT. <<<
   *
   * Ein schraeger Stab haelt die Richtung, in der er liegt - die andere
   * nicht. Am TRAGJOCH kippt die Umlenkkraft den Masten quer zum Gleis,
   * also steht der Anker in der Jochachse. Am ABFANGJOCH steht die grosse
   * Kraft laengs - der Leiterzug -, und dort gehoert er in die
   * Gleisrichtung.
   *
   * Das ist keine Feinheit: in der falschen Ebene bekommt er rechnerisch
   * NULL und entlastet den Masten nicht.
   */
  { key: 'ankerRichtung', gruppe: 'mast', typ: 'auswahl',
    // Neue Anker kommen laengs (17. September); ein alter ohne Angabe
    // rechnet der Kern quer - die Anzeige sagt dasselbe.
    label: 'Ebene des Ankers', standard: 'y',
    wertAus: amAnker('richtung', 'x'),
    optionen: [
      { wert: 'x', text: 'Jochachse (quer zum Gleis)' },
      { wert: 'y', text: 'Gleisrichtung (längs)' }],
    sichtbar: ankerDa,
    notiz: (w) => (gewaehlterMast(w)?.anker?.richtung === 'y'
      ? 'Hält die Kraft in Gleisrichtung — der Leiterzug am Abfangjoch.'
      : 'Hält die Kraft in der Jochachse — die Umlenkkraft am Tragjoch.'),
    hinweis: 'Der Stab hält nur die Richtung, in der er liegt. Am Abfangjoch '
           + 'ist die grosse Kraft der Leiterzug in GLEISRICHTUNG; ein Anker '
           + 'quer dazu hält davon nichts.' },
  { key: 'ankerSeite', gruppe: 'mast', typ: 'auswahl',
    label: 'Seite des Ankerfundaments', standard: 'plus',
    wertAus: amAnker('seite', 'plus'),
    optionenAus: (w) => (gewaehlterMast(w)?.anker?.richtung === 'y'
      ? [{ wert: 'plus', text: 'in +y (Gleisrichtung, vorn)' },
         { wert: 'minus', text: 'in −y (Gleisrichtung, hinten)' }]
      : [{ wert: 'plus', text: 'in +x (vom Gleis weg)' },
         { wert: 'minus', text: 'in −x (zum Gleis hin)' }]),
    optionen: [{ wert: 'plus', text: 'in +' },
               { wert: 'minus', text: 'in −' }],
    sichtbar: ankerDa,
    hinweis: 'Der Anker steht auf der Seite, zu der er ZIEHT — gegen die '
           + 'Kraft, die den Masten kippt.' },
  { key: 'ankerBef', gruppe: 'mast', typ: 'auswahl',
    label: 'Befestigung an Fundament und Mast', standard: 'ankerplatte',
    wertAus: amAnker('befestigung', 'ankerplatte'),
    optionen: ANKER_BEFESTIGUNGEN.map(
      (b) => ({ wert: b.key, text: b.label })),
    sichtbar: (w) => ankerDa(w)
      && gewaehlterMast(w)?.anker?.typ !== 'SA20',
    hinweis: 'Auf ZUG begrenzt nicht die Stütze, sondern die Befestigung: '
           + 'an Ankerplatte und Vorsetzkonsole gilt der grössere Wert, an '
           + 'Ankereisen oder Anschlussbügel der kleinere.' },
  /*
   * DER ANSCHLUSS GEHOERT ZUR AUFLAGERUNG, nicht zum Masten: er sagt, wie
   * das JOCHENDE gehalten wird. Sichtbar ist er trotzdem nur mit Masten -
   * ohne einen gibt es nichts, woran das Joch durchlaufen könnte.
   */
  /*
   * >>> DER KRAGMAST GILT NUR OHNE MAST IM MODELL. <<<
   *
   * Weisung vom 5. September: «der kragmast nur auswaehlbar wenn die masten
   * deaktiviert sind.»
   *
   * «Kragmast, Anschluss in einem Punkt» beschreibt einen Mast, der das Joch
   * an EINER Stelle traegt - seine Drehsteifigkeit ist dann E·I/H. Steht der
   * Mast IM Modell, ist das kein Ansatz mehr, sondern eine Geometrie: zwei
   * Linkelemente im Abstand der Jochhoehe, und die Steifigkeit entsteht aus
   * der Biegung des Mastes dazwischen. Ein «Anschluss in einem Punkt» stuende
   * daneben und waere von nichts mehr gedeckt.
   *
   * Die Option bleibt SICHTBAR und wird ausgegraut - was es gibt und woran es
   * haengt, soll dastehen. Dasselbe Vorgehen wie bei den Ausleitungswegen des
   * Abfangjochs.
   */
  /*
   * NICHT BEIM TRAGAUSLEGER (28. September): die Wahl wirkt allein im
   * Ersatzbalken des Tragjochs; Kragarm-Kern und Stabwerk des Auslegers
   * lesen sie nicht - sie stand dort wirkungslos und hiess «Joch».
   */
  { key: 'mastAnschluss', gruppe: 'aufl', typ: 'auswahl', label: 'Anschluss ans Joch',
    standard: 'durchlaufend',
    optionen: opt(MASTANSCHLUESSE),
    optionenAus: (w) => MASTANSCHLUESSE.map((a) => ({
      wert: a.key,
      text: a.key === 'kragarm' && mastImModell(w)
        ? `${a.label} — nur ohne Masten im Modell` : a.label,
      aus: a.key === 'kragarm' && mastImModell(w),
    })),
    /*
     * FRUEHER NUR BEIM TRAGJOCH - durch die Gruppenschranke, nicht aus
     * einem Grund. Der Anschluss ans Joch beschreibt, wie das Tragwerk auf
     * dem Masten sitzt; das hat jeder Traeger. Was er bewirkt, gilt
     * weiterhin dem Ersatzbalken: die Endbedingung «Mast» steht in der
     * Bedingung mit drin.
     */
    /*
     * >>> AUCH BEI «links» - DIE MASTFEDER GEHT DORT MIT EIN. <<<
     *
     * Hier stand `w.endbedingung === 'mast'`. Mit der neuen Vorgabe vom
     * 13. September waere das Feld damit verschwunden, obwohl es weiter
     * wirkt: `federAusLinks` schaltet die Gurtfedern in Reihe mit der
     * MASTFEDER, und die haengt an dieser Wahl. Nur wenn die Gurtebene
     * laengs nachgibt, faellt der Mast heraus - dann ist das Ende ohnehin
     * gelenkig, und das Feld steht wirkungslos, aber nicht falsch da.
     */
    sichtbar: (w) => mastDa(w) && tragwerksart(w).traeger === true
                  && tragwerksart(w).key !== 'tragausleger' && nurErsatzbalken(w)
                  && (tragwerksart(w).key !== 'joch'
                      || w.endbedingung === 'mast' || w.endbedingung === 'links'),
    hinweis: 'Wirkt nur im verschieblichen Fall, also bei Wind in Jochachse und '
           + 'Längskräften. Für Vertikallast und Wind in Gleisrichtung gilt der '
           + 'Rahmenwert 4.00·E·I/H. Wie der Mast am Joch endet, zeigt das '
           + 'Ansichtsbild der Auflagerbedingung darunter.'},
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
  /*
   * >>> SIE STEHT BEIM AUFLAGER. <<<
   *
   * Weisung vom 9. September. Sie stand unter «Masten» - mit der Begruendung,
   * die Gruppe «Auflagerung des Jochs» fuehre `arten: ['joch']` und das
   * Abfangjoch sehe sie nie. Diese Schranke ist weg; damit faellt auch der
   * Grund weg, die Bedingung vom uebrigen Auflager zu trennen.
   *
   * Sie gilt dort, wo ein Mast im Modell steht und ein TRAEGER darauf sitzt -
   * ohne Mast gibt es kein Linkelement, und beim Einzelmasten gibt es kein
   * Tragwerk, das anzuschliessen waere. Was hier steht, geht in die
   * AxisVM-Ausleitung; der Ersatzbalken des Rechenkerns kennt sie nicht, er
   * traegt seine Drehfeder.
   */
  /*
   * >>> OHNE MASTEN: DIE LAGERUNG DER GURTE (2. Oktober). <<< «wie kann man
   * die auflagerbedingungen anpassen beim modell ohne masten im
   * stabwerkmodell?» - Regel in `ohneMastLagerung` (core.auflager.js).
   */
  { key: 'auflagerOhneMast', gruppe: 'aufl', typ: 'auflagerlinks',
    label: 'Auflagerbedingung ohne Masten', standard: null,
    sichtbar: (w) => !mastDa(w) && tragwerksart(w).key === 'joch',
    hinweis: 'Je Gurtebene X, Y, Z starr oder frei, an beiden Enden gleich. Gilt im '
      + 'Stabwerk und in der AxisVM-Ausleitung; der Ersatzbalken rechnet weiter mit '
      + 'seinem Endauflager.' },
  { key: 'auflagerLinks', gruppe: 'aufl', typ: 'auflagerlinks',
    label: 'Auflagerbedingung am Masten', standard: null,
    sichtbar: (w) => mastDa(w) && tragwerksart(w).traeger === true,
    hinweis: (w) => (tragwerksart(w).key === 'tragausleger'
      ? 'Je Gurt (vorn, hinten) ein Linkelement zum Masten, wie beim '
        + 'Abfangjoch. Gilt im Stabwerk und in der AxisVM-Ausleitung; der '
        + 'Kragarm-Kern rechnet das Gelenk am Masten lotrecht.'
      : 'Je Gurtebene ein Linkelement zum Masten. Gilt für die '
        + 'AxisVM-Ausleitung mit Auflagermodell «Mast»; der Ersatzbalken '
        + 'der Anwendung rechnet weiter mit seiner Drehfeder.') },
  /*
   * >>> DIE KONSOLE MISST EINE HALBE MASTBREITE. <<<
   *
   * Weisung vom 12. September: "mach noch die konsolenlaenge abhaengig vom
   * Masttyp (halbe mastbreite) und ein feld wo man diesen wert auch
   * ueberschreiben kann."
   *
   * Bis hierher waren es pauschale 150 mm - ein Wert, der beim HEB 300
   * innerhalb des Profils endete und beim HEB 200 weit davor. Die Konsole
   * sitzt aber am Flansch, und der ist so breit, wie der Mast breit ist.
   * Eine halbe Mastbreite bringt ihren Anschlusspunkt an die Flanschkante -
   * dorthin, wo die Vorsatzkonsole angeschweisst wird.
   *
   * HEB 200 -> 100 mm, HEB 240 -> 120 mm, HEB 260 -> 130 mm, HEB 300 -> 150 mm.
   *
   * >>> NULL HEISST: DEM MASTEN FOLGEN. <<<
   *
   * Nicht "leer": ein leeres Zahlenfeld laesst sich in dieser Oberflaeche
   * nicht zurueckgeben - `bindeFelder` verwirft einen Eintrag, der keine
   * Zahl ergibt, und der alte Wert bliebe stehen. Mit der Null gibt es einen
   * Weg zurueck zur Ableitung, und er steht im Hinweis.
   *
   * Wer eine bestimmte Konsole hat, traegt ihr Mass ein und bekommt es
   * unveraendert - das Sortiment hat Vorrang vor der Ableitung.
   */
  /*
   * >>> ERST WIE GELAGERT WIRD, DANN WAS DARUEBER HINAUSSTEHT. <<<
   *
   * Weisung vom 13. September: «sidebar system aufraeumen». Die Kragarme
   * standen zwischen «Endauflager» und «Anschluss ans Joch» - zwei Laengen
   * mitten in drei Fragen zur Lagerung. Sie gehoeren dahinter: was ueber
   * die Mastachse hinausragt, ergibt sich aus ihr.
   */
  // Schieber seit dem 30. September («mach die schieber hier überall da wo
  // es sinn macht»): begrenzte Längen, die man verstellt.
  { key: 'kragA', gruppe: 'aufl', typ: 'schieber', label: 'Kragarm Ende A',
    sym: 'c_A', einheit: 'm', standard: 0, schritt: 0.05, zugSchritt: 0.5, min: 0, max: 3,
    sichtbar: (w) => tragwerksart(w).key === 'joch',
    hinweis: 'Abstand der Mastachse vom Gurtende. Stützweite = L − kragA − '
           + 'kragB; darüber hinaus wirkt das Joch als Kragarm. Verstellen '
           + 'verlängert das Joch, die Masten bleiben stehen.'},
  { key: 'kragB', gruppe: 'aufl', typ: 'schieber', label: 'Kragarm Ende B',
    sym: 'c_B', einheit: 'm', standard: 0, schritt: 0.05, zugSchritt: 0.5, min: 0, max: 3,
    sichtbar: (w) => tragwerksart(w).key === 'joch' },
  // In METERN seit dem 29. September («können wir die konsole in m
  // angeben?») - vorher `auflagerKonsole` in mm, siehe `konsolLaenge`.
  { key: 'auflagerKonsoleM', fein: true, gruppe: 'aufl', typ: 'schieber',
    label: 'Konsole am Masten', sym: 'a_K', einheit: 'm',
    // Beim Tragausleger nicht: die Gurte laufen als Gabel am Masten vorbei,
    // das Stabmodell baut keine Konsole in x (28. September).
    standard: 0, schritt: 0.005, min: 0, max: 0.5,
    sichtbar: (w) => mastDa(w) && tragwerksart(w).traeger === true
                  && tragwerksart(w).key !== 'tragausleger',
    hinweis: 'Auskragung der Konsole aus der Mastachse, in Jochrichtung, in m. '
           + '0 = eine halbe Mastbreite (HEB 240 → 0.120 m); gerechnet wird mit '
           + 'mindestens 0.005 m. Wirkt im Stabwerk und in der AxisVM-Ausleitung.' },
  /*
   * >>> ZWEITE FLANSCHKANTE, ALS OPTION (Weisung vom 16. September). <<<
   *
   * «als option ermöglichen, wobei ich nicht genau sagen kann wie sich die
   *  spannungen im axisvm verhalten, falls es hier zu unlogischen oder
   *  spannungspizen kommt lieber weglassen.»
   *
   * Die Studie am auskragenden Joch (J70-alt, Mast 7.30 m vor dem Ende) hat
   * es entschieden: haelt die zweite Kante auch lotrecht, zwaengt die
   * Mastverdrehung den Gurt (bis 978 statt 190 N/mm²). Haelt sie NUR QUER,
   * sinkt die Spitze am Anschluss auf 168 N/mm². Deshalb nur so.
   */
  { key: 'auflagerZweiFlansche', fein: true, gruppe: 'aufl', typ: 'schalter',
    label: 'Zweite Flanschkante quer halten', standard: false,
    sichtbar: (w) => mastDa(w) && tragwerksart(w).key === 'joch'
                  && ((Number(w.kragA) || 0) > 0 || (Number(w.kragB) || 0) > 0),
    hinweis: 'Nur für einen Masten, über den das Joch hinausragt. Eine zweite '
           + 'Konsole an der anderen Flanschkante hält die Gurte quer (y) und '
           + 'lässt längs und lotrecht frei. Wirkt nur im FEM-Modell. Lotrecht '
           + 'gehalten zwängte die Mastverdrehung den Gurt.' },
  { key: 'schraubenFgrenz', fein: true, gruppe: 'aufl', typ: 'zahl',
    label: 'Grenzlast der Gurtverbindung', sym: 'F_Grenz', einheit: 'kN',
    standard: 24, schritt: 1, min: 0,
    sichtbar: (w) => tragwerksart(w).key === 'joch'
                  && !['gelenkig', 'voll'].includes(w.endbedingung),
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
  { key: 'schraubenGrenze', fein: true, gruppe: 'aufl', typ: 'schalter',
    label: 'Einspannung durch die Gurtverbindung begrenzen', standard: false,
    sichtbar: (w) => tragwerksart(w).key === 'joch' && nurErsatzbalken(w)
                  && !['gelenkig', 'voll'].includes(w.endbedingung),
    hinweis: 'Die Drehfeder wird iterativ herabgesetzt, bis die Grenzlast der '
           + 'Gurtschrauben eingehalten ist.'},


  // --- Gurtprofile ---------------------------------------------------------
  { key: 'profOG', gruppe: 'prof', typ: 'auswahl', label: 'Profil Obergurt',
    // Die Winkelgurte gibt es nur am Vierendeeltraeger; das Abfangjoch
    // fuehrt seine Gurte im Sortiment, der Einzelmast hat keine.
    sichtbar: (w) => tragwerksart(w).key === 'joch',
    standard: 'L 90x90x9',
    optionenAus: () => opt(PROFILE(), 'name', 'name'), ausDB: true },
  { key: 'profUG', gruppe: 'prof', typ: 'auswahl', label: 'Profil Untergurt',
    sichtbar: (w) => tragwerksart(w).key === 'joch',
    standard: 'L 90x90x9',
    optionenAus: () => opt(PROFILE(), 'name', 'name'), ausDB: true },
  { key: 'ausrOG', optionenDialog: true, gruppe: 'prof', typ: 'auswahl',
    label: 'Ausrichtung Obergurt', standard: 'LA_SI', optionen: opt(AUSRICHTUNGEN) },
  { key: 'ausrUG', optionenDialog: true, gruppe: 'prof', typ: 'auswahl',
    label: 'Ausrichtung Untergurt', standard: 'LA_SI', optionen: opt(AUSRICHTUNGEN) },
  /*
   * >>> STAHLGÜTE JOCH / MASTEN (7. Oktober). <<< Weisung: «kannst du die
   * stahlgüte mit S450 und 460 ergänzen und eine unterteilung machen zwischen
   * masten / joche». Die Masten haben ein eigenes Feld; ohne Eintrag gilt die
   * Güte des Jochs (so rechnet jeder ältere Stand wie bisher). Am Einzelmasten
   * gibt es kein Joch - dort steht nur die Güte der Masten.
   */
  { key: 'stahl', gruppe: 'prof', typ: 'auswahl',
    label: (w) => (tragwerksart(w).key === 'einzelmast' ? 'Stahlgüte' : 'Stahlgüte Joch'),
    standard: 'S235', optionenAus: () => opt(STAHLGUETEN(), 'name', 'name'),
    sichtbar: (w) => tragwerksart(w).key !== 'einzelmast',
    hinweis: 'EN 1993-1-1 Tab. 3.1, t ≤ 40 mm: S235 f_y 235, S275 275, S355 355, '
           + 'S450 440, S460 460 N/mm².' },
  { key: 'stahlMast', gruppe: 'prof', typ: 'auswahl',
    label: (w) => (tragwerksart(w).key === 'einzelmast' ? 'Stahlgüte Mast' : 'Stahlgüte Masten'),
    standard: '',
    optionenAus: (w) => [
      ...(tragwerksart(w).key === 'einzelmast' ? []
        : [{ wert: '', text: `wie Joch (${w?.stahl ?? 'S235'})` }]),
      ...opt(STAHLGUETEN(), 'name', 'name')],
    wertAus: (w) => (tragwerksart(w).key === 'einzelmast'
      ? (w.stahlMast || w.stahl || 'S235') : (w.stahlMast ?? '')),
    sichtbar: (w) => mastDa(w) || tragwerksart(w).key === 'einzelmast',
    hinweis: 'Gilt für Querschnitt, Klasse und Knicken der Masten (Kern und Stabwerk). '
           + 'Der Gittermast und die Anker haben ihre eigene Güte im Sortiment.' },
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
  { key: 'flSpannweite', gruppe: 'trasse', typ: 'schieber',
    label: 'Spannweite der Fahrleitung', sym: 'L_FL', einheit: 'm',
    standard: 40, schritt: 1, min: 1, max: 100,
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
  /*
   * Ob der Dialog «Neues Tragwerk» nach EK, Spannweite und Radius fragt
   * (29. September, «eine checkbox nicht mehr nachfragen in deisem
   * projekt»). Das Kästchen im Dialog schaltet ihn aus; hier kommt er
   * wieder zurück. Gehört dem Blatt wie die drei Werte selbst.
   */
  { key: 'grundwerteFragen', gruppe: 'trasse', typ: 'schalter', standard: true,
    label: 'Beim neuen Tragwerk nach EK, Spannweite und Radius fragen',
    hinweis: 'Der Dialog «Neues Tragwerk» zeigt die Grundwerte des '
           + 'Querprofils zum Bestätigen. Aus: er nennt sie nur.'},

  // --- Anbauteile ----------------------------------------------------------
  /*
   * >>> AM ABFANGJOCH WERDEN SIE NOCH NICHT GEBAUT. <<<
   *
   * Weisung vom 4. September: «die Anbauteile noch checken ob diese gebaut
   * werden können.» Nachgesehen: nein. Der Abfangjoch-Kern kennt kein
   * Anbauteil, die Szene zeichnet keines, und die AxisVM-Ausleitung führt
   * genau zwei Lastfälle - Eigengewicht und Leiterzug. Was hier eingetragen
   * wird, bleibt im Datensatz stehen und wirkt dort nicht.
   *
   * Das Feld bleibt trotzdem sichtbar - die Eingabe geht nicht verloren, und
   * wer zwischen zwei Tragwerken wechselt, soll dieselbe Maske sehen. Aber
   * es sagt, woran es ist.
   *
   * WO EIN ANBAUTEIL AM LIEGENDEN TRAEGER ANGREIFT, ist eine Entscheidung
   * ueber den Spannungsverlauf - an welchem Gurt, an welcher Station, auf
   * Flanschhoehe oder auf der Schwerachse. Sie gehoert vorgaengig gefragt.
   */
  { key: 'anbauteile', gruppe: 'anbau', typ: 'anbauteile', label: 'Anbauteile',
    hinweis: (w) => (tragwerksart(w).key === 'abfangjoch'
      ? 'Am Abfangjoch wirken sie vollständig: Eigengewicht, Wind und die '
      + 'Torsion aus der Exzentrizität über und unter der Trägerachse. '
      + 'Der LEITERZUG hängt an der Anbindung — nur «Mitte Träger» leitet '
      + 'ihn ein; «über beide Gurte» trägt nur Gewicht und Wind.'
      : ''),
    standard: [] },
  // Eigene Vorlagen: was sich jemand für sein Projekt zusammenstellt.
  { key: 'eigeneVorlagen', gruppe: 'anbau', typ: 'liste', versteckt: true,
    label: 'Eigene Vorlagen', standard: [] },
  // Zuletzt benutzte Einstellung des Lastgenerators, damit er beim
  // nächsten Aufruf nicht wieder bei null anfängt.
  { key: 'generator', gruppe: 'anbau', typ: 'objekt', versteckt: true,
    /*
     * JE GLEIS: FAHRDRAHTABZUG UND KETTENWERK (3. Oktober, «lastgenerator
     * variante B»). Seit die Hängestütze nur noch den Fahrdraht abzieht
     * (ohne Gewicht), setzt der Generator dazu das Kettenwerk am Joch -
     * Tragseil ganz, vom Fahrdraht nur das Gewicht, damit Wind und
     * Umlenkung des Fahrdrahts nicht doppelt zählen (`kw-nfl-joch`).
     */
    label: 'Lastgenerator', standard: { gleise: 2, abstand: 4.5, ersetzen: true,
                                        vorlagen: ['hs-fahrdraht', 'kw-nfl-joch'] } },

  // --- Verteilte Einwirkungen ---------------------------------------------
  { key: 'lastHerkunft', optionenDialog: true, gruppe: 'ein', typ: 'auswahl', label: 'Herkunft der Lasten',
    standard: 'tabelle', optionen: opt(LASTHERKUNFT) },
  { key: 'windKlasse', gruppe: 'ein', typ: 'auswahl', label: 'Windbelastung',
    standard: '0.9', optionen: opt(WIND_KLASSEN),
    sichtbar: (w) => w.lastHerkunft === 'tabelle',
    // Am Einzelmasten gibt es kein Joch - die Klasse waehlt dort trotzdem,
    // und zwar die Zeile der Mastwindtabelle und die Windkraefte der
    // Anbauteile. Der alte Text nannte nur das Joch und stand damit an
    // einem Tragwerk, das keines hat.
    // Der Hinweis steht fest da (die Maske baut ihn nicht bei jeder Wahl neu):
    // er nennt deshalb beide Fälle. Einheitswind (3. Oktober) - Regel in data.fl.js.
    hinweis: (w) => (tragwerksart(w).key === 'einzelmast'
      ? 'Wählt die Zeile der Lasttabelle für den Mastwind und die '
      + 'Windkräfte der Anbauteile; der Staudruck dient der Einordnung.'
      : 'Laufmeterlast auf das Joch aus der Tabelle; der Staudruck dient '
      + 'der Einordnung.')
      + ' Einheitswind (alte Norm): 1.0 kN/m² auf die Angriffsfläche, ohne '
      + 'Formbeiwert — Joch (stehende Gurtschenkel + Vertikalbleche), Masten '
      + '(Profilbreite), Anbauteile (Fläche aus dem Tabellenwert); für den '
      + 'Vergleich im Bestandesschutz. Von Hand eingegebene Windkräfte bleiben.'},
  /*
   * >>> DER BESTANDESSCHUTZ STEHT AUCH UNTER LASTEN (4. Oktober). <<<
   *
   * Weisung: «ich bin mir nicht sicher ob dies nicht zu versteckt ist. was
   * wäre eine alternative? unter lasten, da ist schon der einheitswind
   * aufgefürht?» Auf Rückfrage «Lasten + Anbauteile»: ein Schalter, direkt
   * unter der Windbelastung (dort wählt man für die alte Norm den
   * Einheitswind) und gespiegelt über der Anbauteilliste; die Optionen
   * behalten ihn. Und «Ja, eine Zeile»: steht der Einheitswind und ist der
   * Bestandesschutz aus, fragt die Notiz am Schalter nach - kein Dialog,
   * nichts schaltet sich von selbst ein.
   *
   * GESPEICHERT WIRD NICHT HIER. Das Feld zeigt `nachweise.bestandesschutz`
   * (`wertAus`), `aendern` in app.js schreibt dorthin zurück - ein zweiter
   * Ort für dieselbe Wahl wäre einer, der sich irgendwann widerspricht.
   */
  { key: 'bestandesschutz', gruppe: 'bestand', typ: 'schalter', label: 'Bestandesschutz',
    wertAus: (w) => nachweiseAuswahl(w.nachweise).bestandesschutz === true,
    notiz: (w) => (w.windKlasse === '1.0' && !nachweiseAuswahl(w.nachweise).bestandesschutz
      ? 'Bestand nach alter Norm? Bestandesschutz prüfen' : null),
    hinweis: 'Vergleich Bestand gegen Bestand + neue Bauteile: je Bauteil '
      + 'Δη ≤ 0.05, beide Zustände mit der gewählten Windstufe. Eingeschaltet '
      + 'zeigt jede Bauteilkarte das Kennzeichen «neu». Derselbe Schalter wie '
      + 'unter Optionen → Nachweise und über der Anbauteilliste.' },
  /*
   * >>> DIE GRENZE DES BESTANDESSCHUTZES (6. Oktober). <<< «Beim
   * Bestandesschutz das Delta 5% einstellbar machen auf tatsächliche
   * ausnutzung oder den Grenzwert de Bauteils.» Nur sichtbar, wenn der
   * Vergleich eingeschaltet ist; Regel in core.bestand.js (`bestandRegel`).
   */
  { key: 'bestandProzent', gruppe: 'bestand', typ: 'zahl', label: 'Bestandesschutz: zulässige Zunahme',
    sym: 'Δ', einheit: '%', standard: 5, schritt: 0.5, min: 0.5,
    sichtbar: (w) => nachweiseAuswahl(w.nachweise).bestandesschutz === true,
    hinweis: 'Zulässige Zunahme der Ausnutzung je Bauteil durch die neuen Teile.' },
  { key: 'bestandBezug', gruppe: 'bestand', typ: 'auswahl', label: 'Bestandesschutz: bezogen auf',
    standard: 'grenzwert',
    optionen: [{ wert: 'grenzwert', text: 'Grenzwert des Bauteils (η = 1.00)' },
               { wert: 'ausnutzung', text: 'tatsächliche Ausnutzung (η Bestand)' }],
    sichtbar: (w) => nachweiseAuswahl(w.nachweise).bestandesschutz === true,
    hinweis: 'Grenzwert: Δη ≤ Δ · 1.00. Tatsächliche Ausnutzung: Δη ≤ Δ · η(Bestand) - '
      + 'bei einem Bauteil mit η 0.60 und 5 % also 0.03.' },
  /*
   * >>> REDUKTION IM GROSSFLAECHIGEN UEBERBAUUNGSGEBIET (6. Oktober). <<<
   * Weisung im Wortlaut: «Reduktionsfaktor (grossflächiges
   * Überbauungsgebiet) auswählbar machen mit 0.74»; auf Rückfrage «Auf
   * allen Wind». Ein Schalter fuer das Blatt; die Rechnung steht in
   * `lastfaelle` (core.lasten.js): Wind x und Wind y jedes Falls × 0.74.
   */
  { key: 'windReduktion', gruppe: 'ein', typ: 'schalter',
    label: 'Grossflächiges Überbauungsgebiet (Wind × 0.74)', standard: false,
    hinweis: 'Reduziert allen Wind - Joch, Masten, Anbauteile, Leiter, Abfangjoch, '
      + 'Tragausleger - über die Beiwerte der Lastfälle: Wind x und Wind y × 0.74 in jeder '
      + 'Kombination, auch im Betriebswind und in der AxisVM-Ausleitung.' },
  { key: 'schneeAktiv', gruppe: 'schnee', typ: 'schalter', label: 'Schnee ansetzen',
    standard: false,
    hinweis: (w) => (tragwerksart(w).key === 'einzelmast'
      ? 'Die Laufmeterlast liegt auf dem Joch — am Einzelmasten trägt sie '
      + 'niemand. Schnee auf Anbauteilen zählt unabhängig davon.' : '') },
  { key: 'schneeKlasse', gruppe: 'schnee', typ: 'auswahl', label: 'Schneelast',
    standard: '1.25', optionen: opt(SCHNEE_KLASSEN),
    sichtbar: (w) => w.lastHerkunft === 'tabelle' && w.schneeAktiv
                  && tragwerksart(w).key !== 'einzelmast' },

  // Die drei charakteristischen Einwirkungen sind IMMER sichtbar. Solange die
  // Tabellenwerte gelten, stehen sie gesperrt darin - man sieht also stets,
  // womit gerechnet wird. Der Knopf "Werte bearbeiten" entsperrt sie und
  // schaltet die Herkunft auf "manuell".
  { key: 'gkManuell', gruppe: 'staendig', typ: 'zahl', label: 'Ständige Last Joch',
    sym: 'g_k', einheit: 'kN/m', standard: 0.6, schritt: 0.05, min: 0,
    ausLast: true,
    // >>> LAUFMETERLASTEN GEHOEREN DEM TRAEGER (20. September). <<<
    // «auch die angabe in der sidebar passt nicht ganz»: am Einzelmasten
    // standen g_k = 0.706 und w_k = 0.52 kN/m in der Maske, obwohl der Kern
    // dort L = 0 und q_d = 0 rechnet - es gibt keinen Traeger, auf dem ein
    // Laufmeter liegen koennte. Was den Masten trifft, steht darunter
    // (w_Mast) und an den Anbauteilen.
    sichtbar: (w) => tragwerksart(w).key !== 'einzelmast',
    // Seit dem 6. Oktober wiegt das Stabwerk die Stäbe wie AxisVM; die
    // Tabellenlast gilt dem Ersatzbalken und dient dem Vergleich.
    hinweis: (w) => (nurErsatzbalken(w)
      ? 'Eigengewicht nach Sortimentstabelle plus Zuschlag.'
      : 'Laufmeterlast der Sortimentstabelle - gilt dem Ersatzbalken und zum Vergleich. '
        + 'Das Stabwerk wiegt wie AxisVM die Stäbe (Gurte, Bleche, Masten; Querschnitt × Wichte) '
        + 'plus Zuschlag Δg_k. Nicht als Stab im Modell: Anschlusswinkel, Stosslaschen, '
        + 'Schrauben - beim J130/30 m rund 5 % der Tabelle; bei Bedarf als Δg_k ansetzen.') },
  { key: 'wkManuell', gruppe: 'ein', typ: 'zahl', label: 'Windlast auf Joch',
    sym: 'w_k', einheit: 'kN/m', standard: 0.52, schritt: 0.05, min: 0,
    ausLast: true,
    sichtbar: (w) => tragwerksart(w).key !== 'einzelmast' },
  { key: 'skManuell', gruppe: 'schnee', typ: 'zahl', label: 'Schneelast',
    sym: 's_k', einheit: 'kN/m', standard: 0.27, schritt: 0.05, min: 0,
    ausLast: true,
    sichtbar: (w) => w.schneeAktiv && tragwerksart(w).key !== 'einzelmast' },

  { key: 'gZusatz', gruppe: 'staendig', typ: 'zahl',
    label: 'Zuschlag ständige Last',
    sym: 'Δg_k', einheit: 'kN/m', standard: 0.0, schritt: 0.05, min: 0,
    sichtbar: (w) => w.lastHerkunft === 'tabelle'
                  && tragwerksart(w).key !== 'einzelmast',
    hinweis: 'Kommt zum Eigengewicht dazu — im Stabwerk und in AxisVM zu den Stäben, '
           + 'im Ersatzbalken zur Tabellenlast g_k: Leitungen, Beschilderung, Anschlusswinkel '
           + 'und Stosslaschen, was kein Stab ist.' },
  /* =========================================================================
   * >>> ZUSCHLAG UND MASTWIND STEHEN HINTER DEN GRUNDLASTEN. <<<
   * =========================================================================
   *
   * Weisung vom 13. September: «bauteile optimieren und der lasten.»
   *
   * Die Gruppe begann mit dem Wind auf den MASTEN - einem Sonderfall, der
   * nur bei stehendem Masten ueberhaupt gilt -, dann kam der Schalter dazu,
   * dann die Klassenwahl, dann der Zuschlag, und erst danach die drei
   * charakteristischen Grundlasten. Also von hinten nach vorn.
   *
   * JETZT IN DER REIHENFOLGE, IN DER SIE ENTSTEHEN:
   *
   *   1  was gewaehlt wird     Windbelastung, Schnee ja/nein, Schneelast
   *   2  was daraus folgt      g_k, w_k, s_k  (gesperrt, aus der Tabelle)
   *   3  was dazukommt         Zuschlag, Mastwind        <- zweite Ebene
   *
   * Die drei Grundlasten bleiben in der ERSTEN Ebene, obwohl sie gesperrt
   * sind: man soll stets sehen, womit gerechnet wird (siehe den Vermerk
   * darueber). Das ist der Unterschied zu den Katalogmassen im Reiter
   * System - die sagen, wie das Bauteil aussieht, diese hier sagen, was auf
   * ihm liegt.
   * ======================================================================= */
  /*
   * >>> BEIDE RICHTUNGEN, BEIDE ANGESCHRIEBEN, KEINE EINGABE. <<<
   *
   * Der Hinweis versprach bisher «Werte bearbeiten gibt das Feld frei» -
   * und das war nicht wahr: der Kern liest den eingetippten Wert nie
   * (siehe `mastWindSatz`). Ein freigegebenes Feld, das niemand liest, ist
   * schlimmer als ein gesperrtes.
   *
   * Eine Eingabe je Mast waere denkbar, aber es gibt nur EIN flaches Feld
   * fuer ein Blatt mit mehreren Masten: an einem Joch HEB 220 / HEM 240
   * gaebe es beiden 0.37 statt 0.28 und 0.31 kN/m. Dem Auftraggeber
   * vorgelegt, bis dahin gilt die Tabelle.
   */
  { key: 'wMast', gruppe: 'ein', typ: 'zahl',
    label: 'Windlast auf Mast · quer zum Gleis',
    sym: 'w_Mast,x', einheit: 'kN/m', standard: 0.37, schritt: 0.01, min: 0,
    nurAnzeige: true,
    wertAus: (w) => mastWindAnzeige(w).x,
    sichtbar: (w) => mastDa(w),
    hinweis: 'Quer zum Gleis, aus der Lasttabelle je Profil, '
           + 'Einwirkungsklasse und Stegrichtung des angewählten Masten.'},
  /*
   * DIE ZWEITE RICHTUNG - angeschrieben, nicht eingebbar.
   *
   * Sie folgt aus derselben Tabellenzeile wie die erste, nur aus der anderen
   * Spalte; eine eigene Eingabe daneben waere eine zweite Wahrheit. Beim
   * HEM 240 unterscheiden sich die beiden Spalten, bei den uebrigen Profilen
   * nicht - sichtbar sein muessen sie trotzdem beide, sonst sieht man am
   * Einzelmasten die massgebende Richtung gar nicht.
   */
  { key: 'wMastY', gruppe: 'ein', typ: 'zahl',
    label: 'Windlast auf Mast · längs zum Gleis',
    sym: 'w_Mast,y', einheit: 'kN/m', standard: null, schritt: 0.01, min: 0,
    nurAnzeige: true,
    wertAus: (w) => mastWindAnzeige(w).y,
    sichtbar: (w) => mastDa(w),
    hinweis: 'Längs zum Gleis, aus derselben Tabellenzeile. Sie wirkt in den '
           + 'Lastfällen Wind ±y und ist am Einzelmasten die massgebende '
           + 'Richtung — dort hält kein Joch den Mastkopf.'},
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
  { key: 'mastWindAufJoch', fein: true, gruppe: 'ein', typ: 'schalter',
    label: 'Mastwind wirkt auf das Joch', standard: false,
    /*
     * NUR WO ES EIN JOCH GIBT, DAS SICH VERDREHEN LAESST (20. September).
     *
     * Der Schalter setzt die aufgezwungene Auflagerverdrehung des
     * Ersatzbalkens. Am Einzelmasten gibt es kein Jochende, am Abfangjoch
     * rechnet ein eigener Kern - gemessen: an beiden aendert er keine
     * einzige Zahl. Am Tragjoch und am Tragausleger wirkt er, sobald das
     * Ende ein Moment aufnehmen kann (J90/20 m, Wind in Jochachse, Ende
     * voll eingespannt: M_A 15.0 -> 36.7 kNm).
     */
    sichtbar: (w) => mastDa(w) && !['einzelmast', 'abfangjoch']
      .includes(tragwerksart(w).key) && nurErsatzbalken(w),
    hinweis: 'Nur Ersatzbalken. Wind in Jochachse verdreht den Mastkopf um θ₀ = w·H³/(6·E·I). Die '
           + 'Verdrehung wird dem Jochende aufgezwungen. Wind in Gleisrichtung '
           + 'bleibt aussen vor. Handbuch.'},

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
  /*
   * >>> DIE VOREINSTELLUNG DER AUFLAGERBEDINGUNGEN. <<<
   *
   * Weisung vom 5. September: «Die Voreinstellung der Auflagerbedingungen
   * sollte noch unter optionen aufgefuehrt sein und anpassbar.»
   *
   * Sie steht bei den uebrigen Festlegungen, die fuer JEDES Tragwerk gelten -
   * Normensatz, Lastbeiwerte, Torsionsmodell. Was am einzelnen Tragwerk davon
   * abweicht, wird dort eingestellt und bleibt dort; hier steht, womit ein
   * neues beginnt.
   */
  { key: 'auflagerVorgabe', optionenDialog: true, gruppe: 'komb',
    typ: 'auflagerlinks', vorgabefeld: true,
    label: 'Voreinstellung der Auflagerbedingung am Masten', standard: null,
    hinweis: 'Gilt für jedes neue Tragwerk dieser Art. Die Ausschnitte aus '
           + 'AxisVM zeigen für die alten, verjüngten Tragjoche: Untergurt '
           + 'fest, Obergurt längs frei.' },
  { key: 'gammaG', optionenDialog: true, gruppe: 'komb', typ: 'zahl', label: 'Lastbeiwert ständig',
    sym: 'γ_G', einheit: '–', standard: 1.30, schritt: 0.05, min: 1 },
  { key: 'gammaQ', optionenDialog: true, gruppe: 'komb', typ: 'zahl', label: 'Lastbeiwert veränderlich',
    sym: 'γ_Q', einheit: '–', standard: 1.30, schritt: 0.05, min: 1 },
  { key: 'psi0', optionenDialog: true, gruppe: 'komb', typ: 'zahl',
    label: 'Beiwert Begleiteinwirkung', sym: 'ψ₀', einheit: '–',
    standard: 0.65, schritt: 0.05, min: 0,
    hinweis: 'Gilt für Wind wie für Schnee, je nach begleitender Einwirkung. '
      + 'Die Begleitlast ist ψ₀ · Q_k - ohne γ_Q (SIA 260 Gl. 16): entweder γ_Q als '
      + 'Leiteinwirkung oder ψ₀ als Begleiteinwirkung.'},
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
    // Seit dem 4. Oktober auch im Stabwerk («nimm die einstellung für das
    // stabmodell wie beim balken auf»): dort wählt sie, wo am steifen
    // Gurtabschnitt im Knoten ausgewertet wird. Das Modell bleibt gleich.
    hinweis: 'Nachweis am Anschnitt des steifen Knotenbereichs. «Schwerachsen» '
           + 'dient dem Vergleich mit einem Prüfmodell, nicht dem Nachweis. '
           + 'Im Ersatzbalken 11 bis 15 % auf η. Im Stabwerk wählt sie, ob der '
           + 'Gurt am Rand des Blechs oder in der Blechachse ausgewertet wird '
           + '(das Modell bleibt dasselbe).'},
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
  /*
   * DIE ERKLAERTEXTE ABSCHALTBAR (Durchsicht vom 18. September, Punkt U4:
   * «sehr viel auf einmal»; Entscheid vom 19. September: ein Schalter in
   * den Optionen, Vorgabe ein). Gerechnete Notizen bleiben immer - sie sind
   * eine Auskunft ueber die Eingabe, kein Lehrtext.
   */
  { key: 'erklaertexte', gruppe: 'ansicht', optionenDialog: true,
    typ: 'schalter', label: 'Erklärtexte unter den Feldern',
    standard: true,
    hinweis: 'Aus: die Seitenleisten zeigen nur Feld, Wert und gerechnete '
           + 'Notizen - kürzer, für den, der die Eingaben kennt. Der Titel '
           + 'am Feld bleibt.' },
  { key: 'tastenkuerzel', gruppe: 'ansicht', optionenDialog: true,
    typ: 'schalter', label: 'Tastenkürzel für Ansicht und Fenster',
    standard: true,
    hinweis: 'Einzelne Tasten wie q, 1 oder h. Sie wirken nie in einem '
           + 'Eingabefeld und nie bei offenem Dialog. «?» zeigt die '
           + 'Übersicht. Escape und Strg+Z bleiben immer.' },
  /*
   * DIE BELEGUNG SELBST - eine Zeile je Kuerzel.
   *
   * Weisung vom 2. September: «Tastenkürzel in die optionen aufnehmen und
   * anpassbar machen.» Sie standen bisher nur in einer Uebersicht, die man
   * mit «?» aufruft - lesbar, aber nicht aenderbar. Wer eine Tastatur ohne
   * «z» an der gewohnten Stelle hat oder ein Kuerzel doppelt belegt sieht,
   * konnte nichts tun.
   *
   * Die Liste steht in den Optionen, weil sie dorthin gehoert: eine
   * Einstellung der Bedienung, nicht des Tragwerks. Der eigentliche Inhalt
   * kommt aus app.js - dort stehen die Handlungen, und nur dort.
   */
  { key: 'tasten', gruppe: 'ansicht', optionenDialog: true, typ: 'tasten',
    label: 'Belegung', standard: {},
    sichtbar: (w) => w.tastenkuerzel !== false,
    hinweis: 'Auf eine Zeile klicken und die neue Taste drücken. Leer lassen '
           + 'schaltet das Kürzel ab. Doppelte Belegungen werden abgewiesen.' },
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
  /*
   * `gruppeAus` lässt ein Feld je nach Art in einer anderen Gruppe stehen -
   * die Anschlusshöhe steht beim Tragausleger unter dem Ausleger, nicht
   * beim Masten (Entscheid 28. September).
   */
  return FELDER.filter((f) => (typeof f.gruppeAus === 'function' ? f.gruppeAus(werte) : f.gruppe) === gruppe
                           && !f.optionenDialog && !f.versteckt
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
  // Einwirkungen und Widerstand in einem Reiter (6. Oktober: «nimm diese
  // zwei gruppen zusammen») - der Widerstand ist ein einziger Beiwert.
  { key: 'einwirkung', titel: 'Einwirkungen und Widerstand' },
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
  { thema: 'einwirkung', titel: 'Widerstand', keys: ['gammaM0'] },
  { thema: 'ansicht', titel: 'Modellansicht',
    keys: ['projektion', 'blickwinkel', 'modellTransparenz', 'modellSchrift',
           'modellSchriftLast', 'modellSchriftMass'] },
  { thema: 'ansicht', titel: 'Bedienung', keys: ['erklaertexte', 'tastenkuerzel', 'tasten'] },
];

/**
 * Die Abschnitte eines Reiters, mit ihren sichtbaren Feldern.
 * Ohne `thema` kommen alle - so bleibt der Aufruf ohne Reiter gueltig.
 */
/*
 * >>> NUR BEIM ERSATZBALKEN (30. September). <<<
 *
 * «der eintrag rechenmodell unter optionen macht so nicht wirklich sinn da
 * man diese nur beim modell balken nutzen kann.» Gemessen am J90/20 m mit
 * zwei Hängestützen und Jochaufsatz, Stabwerk, jede Wahl jedes Feldes: diese
 * acht ändern keine Stelle (η je Bauteil, Reaktionen) - sie steuern die
 * Aufteilung des Ersatzbalkens. Hebelarme, Blechbreiten und die Ausrichtung
 * der Gurte bauen dagegen die Geometrie und wirken auch im Stabwerk (Joch
 * η 0.567 → 0.520 … 0.610); sie bleiben.
 */
export const OPTIONEN_NUR_ERSATZBALKEN = new Set([
  'torsionModell', 'torsionsverteilung', 'ebenenUeberlagerung', 'gurtaufteilung',
  'spannungsmodell', 'endfeldZuschlag', 'schiefeBiegung']);

export function optionenFelder(werte, thema = null) {
  return OPTIONEN_ABSCHNITTE
    .filter((a) => !thema || a.thema === thema)
    .map((a) => ({
      titel: a.titel,
      felder: a.keys.map((k) => FELDER.find((f) => f.key === k))
        .filter((f) => f && (!f.sichtbar || f.sichtbar(werte)))
        .filter((f) => nurErsatzbalken(werte) || !OPTIONEN_NUR_ERSATZBALKEN.has(f.key)),
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

/**
 * DIE TYPWAHL DES ABFANGJOCHS - gegliedert wie die des Tragjochs.
 *
 * Aktuelles Sortiment zuerst, Altbauweise darunter. Die Zeile nennt das
 * Gurtprofil und den Laengenbereich: danach waehlt man, nicht nach der
 * Nummer.
 */
export function abfangOptionen() {
  if (!abfangDbDa()) return [];
  const zeile = (a) => {
    const b = abfangLaengenbereich(a);
    return {
      wert: a.typ,
      gruppe: (a.bauweise ?? 'neu') === 'alt'
        ? 'Altbauweise — Bestand' : 'Aktuelles Sortiment',
      /*
       * DIE ZEILE SAGT, OB DER TYP GANZ ERFASST IST.
       *
       * Ohne Mass-Tabelle steht der Aufbau da, aber keine Blecheinteilung -
       * und ohne die gibt es keinen Nachweisschnitt. Wer waehlt, soll das
       * SEHEN, statt es an einer ausbleibenden Zahl zu merken.
       */
      text: `${a.typ} · ${a.profil} · ${b.text}`
          + (abfangVollstaendig(a) ? '' : ' — Masse unvollständig'),
    };
  };
  const alle = abfangjoche();
  return [
    ...alle.filter((a) => (a.bauweise ?? 'neu') !== 'alt').map(zeile),
    ...alle.filter((a) => (a.bauweise ?? 'neu') === 'alt').map(zeile),
  ];
}

/**
 * DIE GEFÜHRTEN LÄNGEN EINES ABFANGJOCHTYPS.
 *
 * Seit dem 4. September stellt sie kein Auswahlfeld mehr - der Schieber
 * tut es (Weisung: einheitliches Bild). Sie bleibt, weil `aendern` daraus
 * die nächstgelegene geführte Länge sucht und der Hinweistext sie nennt.
 *
 * Jede Zeile nennt, was an ihr hängt: die Stützweite aus der Mass-Tabelle
 * und ob die Blecheinteilung steht. Wer wählt, sieht damit vor dem Klick,
 * ob sich daraus ein Modell bauen lässt.
 */
export function abfangLaengenOptionen(typ) {
  if (!abfangDbDa() || !typ) return [];
  let a = null;
  try { a = getAbfangjoch(typ); } catch { return []; }
  return abfangLaengen(a).map((jt) => {
    const z = abfangMasse(a, jt);
    const js = z?.js ? `js ${z.js[0].toFixed(2)}–${z.js[1].toFixed(2)} m` : '';
    return {
      wert: jt.toFixed(2),
      text: `${jt.toFixed(2)} m${js ? ` · ${js}` : ''}`
          + (z?.blechFraglich ? ' — Blechzahl fraglich' : ''),
    };
  });
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
  /*
   * >>> UND DER LAENGENBEREICH GEHOERT IN DIE ZEILE. <<<
   *
   * Weisung vom 9. September: «beim Tragjoch typ auswahl auch den
   * laengenbereich angeben im nahmen, so wie bei den abfangjochen.»
   *
   * Er ist die Angabe, nach der man den Typ ueberhaupt SUCHT: das Joch ist
   * so lang, wie der Mastabstand es verlangt, und die Frage lautet «welcher
   * Typ traegt diese Laenge». Ohne den Bereich waehlt man einen Typ, sieht
   * den Laengenschieber zusammenschnappen und faengt von vorn an.
   *
   * Dasselbe Format wie beim Abfangjoch (`abfangLaengenbereich`), damit
   * beide Listen gleich zu lesen sind. Fuehrt ein Typ zwei Bereiche - kurz
   * und normal -, stehen beide da; das ist keine Doppelung, sondern die
   * Sortimentsangabe.
   */
  const zeile = (j) => ({
    wert: j.typ,
    text: `${j.typ} · jd ${j.jd}${j.voute ? `→${j.voute.endJd}` : ''} mm`
        + ` · ${laengenbereich(j).text}`
        + `${j.bleche ? '' : ' · ohne Bleche'}`,
  });
  // Vergleichsmodelle (`sortiment: false`) bilden ein fremdes Bauwerk nach.
  // Sie stehen zuunterst und sagen es im Klartext - wer sie wählt, rechnet
  // kein Sortimentsjoch.
  const vergleich = (j) => ({ ...zeile(j), text: `${zeile(j).text} · Vergleichsmodell` });
  const alle = tragjoche();
  const srt = alle.filter((j) => j.sortiment !== false);
  const vgl = alle.filter((j) => j.sortiment === false);
  /*
   * >>> GEGLIEDERT, NICHT AUFGEREIHT. <<<
   *
   * Weisung vom 3. September: «beim dropdown sollte man das etwas gliedern,
   * das man es besser finden kann.»
   *
   * Die Liste war sortiert - erst das aktuelle Sortiment, dann die
   * Altbauweise, dann die Vergleichsmodelle -, aber man SAH die Ordnung
   * nicht: sechzehn Zeilen hintereinander, und «J90-alt» stand mitten
   * darin, ohne dass etwas sagte, wo das eine aufhoert und das andere
   * anfaengt. Eine sortierte Liste ohne Trennung liest sich wie eine
   * unsortierte.
   *
   * Die Gruppe steht an der Option; das Auswahlfeld macht daraus
   * `optgroup` (ui.js). Wer eine Altbauweise waehlt, weiss es damit, bevor
   * er klickt - und nicht erst am Suffix «-alt».
   */
  const mitGruppe = (g) => (j) => ({ ...zeile(j), gruppe: g });
  f.optionen = [
    ...srt.filter((j) => (j.bauweise ?? 'neu') !== 'alt')
      .map(mitGruppe('Aktuelles Sortiment')),
    ...srt.filter((j) => (j.bauweise ?? 'neu') === 'alt')
      .map(mitGruppe('Altbauweise — Bestand')),
    ...vgl.map((j) => ({ ...vergleich(j), gruppe: 'Vergleichsmodelle' })),
    { wert: 'frei', text: 'frei definiert', gruppe: 'Ohne Sortiment' },
  ];
  return f.optionen;
}

/** Grenzt Spannweite und Nachweisschnitt auf den Sortimentsbereich ein. */
export function setzeGrenzen(joch, L, abfangBereich = null) {
  /*
   * DER BEREICH KOMMT AUS DEM SORTIMENT DES TRAGWERKS.
   *
   * Beim Abfangjoch reicht er von 5.50 m (A160) bis 28.50 (A360) - und je
   * Typ ist er ein anderer. Ohne Nachfuehrung stuende der Schieber auf den
   * Grenzen des Tragjochs, und A360 liesse sich gar nicht bis 28.50 ziehen.
   */
  const b = abfangBereich ?? laengenbereich(joch);
  const fl = feld('L');
  fl.min = b.min; fl.max = b.max;
  const fx = feld('xNachweis');
  fx.min = 0; fx.max = L;
  return b;
}

/* ===========================================================================
 * >>> DIE AUTOMATISCHE MESSHOEHE, FUER DIE ANZEIGE (28. September). <<<
 * =========================================================================
 *
 * Die Maske kennt die Rechnung nicht; app.js reicht nach jeder Rechnung die
 * Stelle herein, auf der die Automatik misst ({z, was} aus `messStelle`).
 * Nur Anzeige - gerechnet wird aus `fdHoehe` selbst.
 */
let fdAutomatik = null;
export function setzeFdAutomatik(stelle) {
  fdAutomatik = stelle && !stelle.eigen && Number.isFinite(stelle.z)
    ? { z: stelle.z, was: stelle.was ?? '' } : null;
}

/**
 * >>> WIE HOCH REICHT DIESER MAST? (19. September) <<<
 *
 * Der Regler «Höhe über Fundament» reichte bis max(mastH, mastLaenge) - am
 * Einzelmast ist mastH aber die ausgeblendete Anschlusshoehe (7.50), und
 * ohne eingetragene Laenge steht mastLaenge auf null. Ein neuer Einzelmast
 * von 8.50 m liess sich damit nur bis 7.50 m bestuecken; Traverse (L - 0.5)
 * und Rueckleiter oben waren mit dem Regler nicht erreichbar. Jetzt die
 * Laenge, mit der gerechnet wird: am Einzelmast `einzelmastLaenge`, am Joch
 * die eingetragene oder die Vorgabe des Feldes.
 *
 * Seit dem 28. September HIER statt in ui.js: auch die Grenze des
 * Fahrdrahtschiebers braucht sie, und ui.schema.js darf ui.js nicht
 * importieren (Kreis). ui.js reicht sie unter demselben Namen weiter.
 */
/**
 * >>> WIE WEIT REICHT DER TRAGAUSLEGER? (28. September) <<<
 *
 * Weisung: «die x werte sollten auf die länge limitiert werden.» Der
 * Ausleger beginnt `hinten` (0.25 m) hinter der Mastachse und endet bei
 * L − hinten; die x-Werte zählen ab der Mastachse. Dorthin reichen die
 * Stelle des Längsankers und die Lage der Anbauteile - darüber hinaus
 * setzt das Stabmodell nichts mehr an (Anbauteil) bzw. verweigert sich
 * (Längsanker). Ohne Sortimentszeile gilt L − 0.25.
 */
export function kragarmEnde(werte) {
  const L = Number(werte?.L) || 0;
  const t = getTragausleger(L);
  return Math.round((L - (t ? Number(t.hinten) || 0 : 0.25)) * 1e6) / 1e6;
}

export function mastKopfHoehe(werte, ende = 'A') {
  if (tragwerksart(werte).key === 'einzelmast') return einzelmastLaenge(werte) || 12;
  const H = Number(ende === 'B' ? (werte.mastHB ?? werte.mastH) : werte.mastH) || 0;
  const L = Number(ende === 'B' ? (werte.mastLaengeB || werte.mastLaenge) : werte.mastLaenge) || 0;
  return L || (H > 0 ? mastLaengeFuer(werte, H) : 12);
}
