/**
 * export.axisvm.js
 * ---------------------------------------------------------------------------
 * AXISVM-EXPORT über SAF (Structural Analysis Format).
 * Reine Funktionen, kein DOM.
 *
 * WARUM SAF
 * AxisVM liest keine fremden Binärformate, wohl aber SAF - ein offenes, von
 * SCIA gepflegtes Excel-Format, das AxisVM importieren kann. Ein eigener
 * Schreiber ist damit möglich, ohne die COM-Schnittstelle und ohne Windows.
 * Geschrieben wird mit demselben minimalen XLSX-Schreiber wie der Bericht.
 *
 * WAS EXPORTIERT WIRD
 * Das Stabmodell des Jochs: vier Gurte als durchlaufende Stabzüge, an jeder
 * Station die vier Bindebleche als Stäbe, die Gabellagerung als steifes
 * Endschott, die Anbauteile als steife Arme mit der Last am wirklichen
 * Angriffspunkt. Die Lasten laufen JE EINWIRKUNGSGRUPPE als eigener Lastfall
 * und CHARAKTERISTISCH - die Kombination macht AxisVM. Nur so lässt sich
 * hinterher sagen, welcher Anteil woher kommt.
 *
 * DAS KNOTENMODELL IST DIE ENTSCHEIDUNG
 * Rechnet AxisVM auf den Schwerachsen, bekommt es andere Momente als dieses
 * Werkzeug - dieses weist am ANSCHNITT nach, am Rand des steifen, mit dem
 * Gurt verschweissten Knotenbereichs (siehe core.querschnitt.js). Beide
 * Modelle sind hier baubar:
 *
 *   'anschnitt'    : der steife Bereich wird als kurzer Stab mit steifem
 *                    Querschnitt abgebildet - im Gurt über die Blechbreite,
 *                    im Blech über die Überlappung (h − L_c)/2 je Ende.
 *                    Entspricht dem Nachweis dieses Werkzeugs.
 *   'schwerachsen' : Stäbe laufen von Schwerachse zu Schwerachse, keine
 *                    steifen Bereiche. Entspricht dem, was AxisVM ohne
 *                    Zutun rechnet.
 *
 * Für den Vergleich sind BEIDE zu rechnen: erst ihre Differenz trennt die
 * Frage des Knotenmodells von der Frage des Rechenwegs.
 *
 * ACHSEN
 * Global X = Jochachse (0 … L), Y = Gleisrichtung, Z = lotrecht nach OBEN.
 * Im Rechenkern zeigt F_z nach UNTEN; beim Schreiben wird gedreht.
 * ---------------------------------------------------------------------------
 */

import { ECKEN, getAusrichtung } from './geometry.js';
import { EINWIRKUNGEN, lastfaelle } from './core.lasten.js';
import { verortung, verortungKurz, tragwerksart } from './core.constants.js';
// Die Kette steht im Rechenkern - dasselbe Stueck Wissen, das die
// Modellansicht zeichnet. Zwei eigene Fassungen waren der Grund, warum
// Bild und ausgeleitetes Modell einmal auseinanderliefen.
import { anbauKette, anschlussGurt } from './core.anbauteile.js';
import { mastAchse } from './core.auflager.js';
import { STIL, arbeitsmappe, herunterladen } from './export.xlsx.js';

/** Wählbare Knotenmodelle. */
export const KNOTENMODELLE = [
  { key: 'anschnitt',
    label: 'Anschnitt: steife Knotenbereiche (entspricht diesem Werkzeug)' },
  { key: 'schwerachsen',
    label: 'Schwerachsen: Stäbe Achse zu Achse (AxisVM ohne Zutun)' },
];

/**
 * WÄHLBARE AUFLAGERMODELLE.
 *
 * Das Jochende ist die Stelle, an der sich Rechenkern und Bauwerk am
 * deutlichsten unterscheiden. Der Rechenkern führt einen Ersatzbalken mit
 * Drehfeder am Ende - ein Punkt, eine Feder. Das Bauwerk liegt auf.
 *
 * Beides ist richtig, für verschiedene Zwecke: `punkt` bildet den Rechenkern
 * nach und ist die Vergleichsbasis der Kalibrierung; `gurte` und `mitte`
 * bilden das Bauwerk nach. Deshalb umschaltbar statt entschieden.
 *
 * WO DIE TEILWEISE EINSPANNUNG STEHT: NUR IM ERSATZBALKEN (`punkt`), als
 * Drehfeder um y. Dort ist sie in AxisVM nachgemessen - Feldmoment 28.28
 * gegen 27.88 kNm der Anwendung. Die Modelle `gurte` und `mitte` tragen sie
 * NICHT; ein Versuch, sie dort als lotrechte Gurtfeder unterzubringen, hat
 * am gerechneten Modell 0.07 kNm von 42 bewegt (siehe stabmodell). Wer eine
 * teilweise Einspannung im Stabmodell braucht, nimmt `punkt`.
 *
 * WELCHE FEDER: DIE GEOMETRISCHE (Weisung des Auftraggebers).
 *
 * Die Anwendung setzt die Feder je Lastfall herab, bis die Gurtverbindung ihre
 * Grenzlast einhält - beim nachgemessenen Beispiel zwischen 1901 und 12951
 * kNm/rad. Ein Stabmodell gibt es aber nur EINES; es trüge sonst die Feder
 * eines einzelnen Lastfalls und wäre für jeden anderen falsch.
 *
 * Ausgeleitet wird deshalb die Steifigkeit des BAUWERKS: E·I/H mal
 * Rahmenfaktor, unabhängig vom Lastfall. Was die Schrauben davon tragen, ist
 * ein eigener Nachweis in der Anwendung (Prüfung A1, Gurtanschluss am Mast).
 */
export const AUFLAGERMODELLE = [
  { key: 'mast',
    label: 'Mast im Modell: Starrkörper je Gurtebene, Linkelement zum Mast '
         + '(Kräfte starr, Momente frei), Fundament eingespannt',
    braucht: 'mast' },
  { key: 'gurte',
    label: 'Gurte einzeln: Untergurte y/z, Obergurte nur y (ohne Einspannung)' },
  { key: 'mitte',
    label: 'Mitte der Gurtebenen vorn und hinten, y/z, Gelenk um y (Altbauweise)' },
  { key: 'punkt',
    label: 'Ein Punkt je Ende mit Drehfeder (Abgleich mit dem Ersatzbalken)' },
];

/**
 * VORGABE DES AUFLAGERMODELLS.
 *
 * Steht ein Mast im Modell, wird er auch ausgeleitet - alles andere hiesse,
 * ihn zweimal zu erfassen: einmal als Drehfeder im Ersatzbalken und einmal
 * gar nicht im FEM. Bis zum 31. August war 'gurte' die Vorgabe, und wer den
 * Mast im Modell haben wollte, musste ihn im Dialog eigens waehlen.
 *
 * Ohne Mast bleibt es bei der Bauweise: die Altbauweise ist zu flach fuer ein
 * Kraeftepaar ueber die Jochhoehe, dort liegt das Lager in der Ebenenmitte.
 */
export const auflagerVorgabe = (m) => {
  if (m?.federn?.mast || m?.federn?.mastA) return 'mast';
  return (m?.bauweise ?? 'neu') === 'alt' ? 'mitte' : 'gurte';
};

/**
 * Querschnitt des steifen Ersatzstabs.
 *
 * Ein Rechteck von 500 × 500 mm ist gegenüber Gurt und Blech um Grössen-
 * ordnungen steifer und bleibt trotzdem eine gewöhnliche Zahl - kein
 * Starrelement, dessen Behandlung von Programm zu Programm abweicht. Wer
 * lieber echte Starrelemente hat, ersetzt diese Stäbe in AxisVM; das Modell
 * bleibt dasselbe.
 */
const STARR = { name: 'STARR', h: 500, b: 500 };

/**
 * Merkmale des Aufbaus, die man der Datei nicht ansieht.
 *
 * `anbau-kette`  Anbauteile stehen in einer Kette (Traeger -> Aufbau ->
 *                Drahtwerk). Fehlt das Merkmal, stammt die Datei aus einer
 *                Fassung, die jedes Teil einzeln ans Joch gehangt hat.
 */
export const MERKMALE = ['anbau-kette'];

/** Rechteck-Ersatzquerschnitt des Anbauteil-Arms: steif, ohne Eigengewicht. */
const ARM = { name: 'ARM', h: 300, b: 300 };

/**
 * KLEINSTER SINNVOLLER SCHNITTABSTAND IM GURT [m].
 *
 * Zwei Schnitte 10 mm auseinander erzeugen ein 10-mm-Gurtstück mit dem
 * 500 × 500 mm starken Ersatzquerschnitt. Ein solches Element ist um
 * Grössenordnungen steifer als seine Nachbarn und verdirbt die Kondition
 * der Steifigkeitsmatrix - der Löser rechnet es, aber ungenau.
 *
 * 25 mm ist die Grenze, unterhalb derer zwei Schnitte dasselbe meinen.
 * Sie liegt bewusst unter der kleinsten wirklichen Blechbreite (90 mm) und
 * über den Versatzstummeln der Bleche (9.6…23 mm), die absichtlich kurz
 * sind und nicht angetastet werden.
 */
const MIN_SCHNITT = 0.025;

// Länge des vertikalen Linkelements zwischen Gurt und Anbauteil (Weisung:
// rund 10 cm). Am Obergurt nach oben, am Untergurt nach unten angesetzt.
const LINK_LAENGE = 0.10;

/*
 * DIE STÄNDIGE LAST WIRD AUFGETEILT (Weisung).
 *
 * Im Rechenkern ist «G» EINE Einwirkungsgruppe - daran ändert sich nichts.
 * Für das AxisVM-Modell wird sie aber in drei Lastfälle zerlegt, damit
 * hinterher ablesbar bleibt, welcher Anteil woher kommt. Dieselbe Gliederung
 * führt auch das geprüfte Vergleichsmodell (self weight / added weight).
 *
 * Die Kombinationen setzen alle drei mit demselben Beiwert an - zusammen
 * sind sie das G des Rechenkerns.
 */
const G_JOCH = 'G';
const G_ANBAU = 'G_Anbau';
const G_ABLENK = 'G_Ablenk';
const G_TEILE = [
  { key: G_JOCH,   label: 'Ständig · Joch' },
  { key: G_ANBAU,  label: 'Ständig · Anbauteile' },
  { key: G_ABLENK, label: 'Ständig · Ablenkkräfte' },
];

/**
 * LEGT ZU ENGE SCHNITTE ZUSAMMEN.
 *
 * Nicht jeder Schnitt wiegt gleich viel. Stationen, Blechkanten und die
 * Jochenden bestimmen das Tragwerk - sie bleiben, wo sie sind. Die Reihen
 * eines Anbauteils dürfen dagegen ein paar Millimeter wandern; wo sie einem
 * wichtigen Schnitt zu nahe kommen, rücken sie auf ihn.
 *
 * `beweglich` wird IN DER ÜBERGEBENEN REIHENFOLGE abgearbeitet, nicht nach
 * Lage sortiert: wer zuerst kommt, bleibt stehen, und die späteren rasten
 * auf ihn ein. Deshalb gehört die Mitte eines Anbauteils an den Anfang und
 * seine Reihen dahinter - sonst überlebt die erste Reihe und das Bauteil
 * wandert um das halbe Raster.
 *
 * @param {Iterable<number>} fest    Schnitte, die bleiben müssen
 * @param {Iterable<number>} beweglich Schnitte, nach Wichtigkeit geordnet
 * @param {number} mindest           kleinster Abstand [m]
 * @returns {{xs:number[], verschoben:Array}}
 */
export function schnitteZusammenlegen(fest, beweglich, mindest = MIN_SCHNITT) {
  const xs = [...new Set([...fest].map(r6))].sort((a, b) => a - b);
  const verschoben = [];

  [...new Set([...beweglich].map(r6))].forEach((x) => {
    let naechster = null, abstand = Infinity;
    xs.forEach((v) => {
      const dd = Math.abs(v - x);
      if (dd < abstand) { abstand = dd; naechster = v; }
    });
    if (abstand < 1e-9) return;                    // liegt schon dort
    if (abstand < mindest) {
      verschoben.push({ von: x, nach: naechster, betrag: naechster - x });
      return;
    }
    xs.push(x);
    xs.sort((a, b) => a - b);
  });

  return { xs, verschoben };
}

const mm = (v) => v / 1000;
const r6 = (v) => Math.round(v * 1e6) / 1e6;

// ---------------------------------------------------------------------------
// Bauwerk: Knoten, Stäbe, Lasten sammeln
// ---------------------------------------------------------------------------

/**
 * Sammelt Knoten und Stäbe unter sprechenden Namen und hält sie eindeutig.
 * Ein Knoten wird über seinen Namen wiederverwendet; zweimal derselbe Name
 * mit anderen Koordinaten ist ein Fehler im Aufbau und wirft.
 */
function sammler() {
  const knoten = new Map();
  const staebe = [];
  const querschnitte = new Map();
  const punktlasten = [];
  const punktmomente = [];
  const streckenlasten = [];

  return {
    knoten, staebe, querschnitte, punktlasten, punktmomente, streckenlasten,

    kn(name, x, y, z) {
      const alt = knoten.get(name);
      const neu = { name, x: r6(x), y: r6(y), z: r6(z) };
      if (alt) {
        if (alt.x !== neu.x || alt.y !== neu.y || alt.z !== neu.z) {
          throw new Error(`Knoten ${name} doppelt mit anderen Koordinaten`);
        }
        return name;
      }
      knoten.set(name, neu);
      return name;
    },

    stab(name, qs, von, bis, opt = null) {
      if (von === bis) return null;         // entartet: kommt bei L_c = h vor
      staebe.push({ name, qs, von, bis, ...(opt ?? {}) });
      return name;
    },

    qs(def) {
      if (!querschnitte.has(def.name)) querschnitte.set(def.name, def);
      return def.name;
    },
  };
}

/**
 * DER AUSRUNDUNGSRADIUS DES WINKELS - aus der Fläche, wie beim Mastprofil.
 *
 * >>> Weisung, 28. August: «Die L-Profile sind ohne Rundungen im AxisVM-Modell.
 * Es sollten die LNP-Profile gemäss Norm sein, EN-Standard.» <<<
 *
 * Bis dahin standen r₁ und r₂ auf NULL — mit dem Vermerk, die Radien stünden
 * in den Profiltabellen dieses Werkzeugs nicht. Der Winkel war damit ein
 * scharfkantiges Polygon, und seine Fläche rund zwei Prozent zu klein.
 *
 * Für einen gleichschenkligen Winkel nach EN 10056-1 gilt
 *
 *      A = t·(2a − t) + (1 − π/4)·(r₁² − 2·r₂²),     r₂ = r₁/2
 *        = t·(2a − t) + 0.1073·r₁²
 *
 * Nachgerechnet mit den Normradien trifft das die Tabellenflächen: L 90×90×9
 * → 15.52 gegen 15.5 cm², L 100×100×10 → 19.16 gegen 19.2, L 80×80×8 → 12.27
 * gegen 12.3. Umgekehrt aufgelöst liefert die Fläche also r₁.
 *
 * >>> DAS IST NICHT DER NORMRADIUS, SONDERN DER, DER DIE FLÄCHE TRIFFT. <<<
 * Der Beiwert 0.1073 ist klein; die auf 0.1 cm² gerundete Tabellenfläche
 * lässt r₁ um gut einen Millimeter schwanken. Für das Modell zählt die
 * FLÄCHE, und die trifft er — für die Zeichnung genügt er. Wer den
 * Normradius will, trägt ihn in die Profiltabelle ein (`r1`, `r2`); dann
 * gilt er, und diese Rückrechnung tritt zurück.
 *
 * Der bessere Weg bliebe das BIBLIOTHEKSPROFIL von AxisVM — dann stimmen
 * Fläche, Trägheitsmomente und Ausrundung ohne eine Zahl von uns. Die
 * COM-Brücke versucht ihn zuerst; ob AxisVM ihn über COM anbietet, ist noch
 * nicht vermessen.
 */
const WINKEL_BEIWERT = 1 - Math.PI / 4;      // 0.2146

export function winkelRadien(p) {
  if (Number.isFinite(p?.r1)) {
    return { r1: p.r1, r2: p.r2 ?? p.r1 / 2, quelle: 'tabelle' };
  }
  const A = p.A * 100;                        // cm² -> mm²
  const rest = A - p.t * (p.aH + p.aV - p.t);
  // r2 = r1/2  ->  r1² − 2·r2² = r1²/2
  const r1 = rest > 0 ? Math.sqrt(rest / (WINKEL_BEIWERT / 2)) : 0;
  /*
   * REST <= 0 HEISST: DIE TABELLENFLÄCHE ENTHÄLT KEINE AUSRUNDUNG.
   *
   * Beim ungleichschenkligen L 130x80x12 ist A genau t·(aH+aV−t) — die
   * Fläche der beiden Rechtecke, ohne Kehle. Dann gibt es nichts
   * zurückzurechnen, und r bleibt null: der Winkel wird scharfkantig
   * gezeichnet. Das ist ehrlich — die Daten geben es nicht her — und es
   * steht als `quelle: 'keine'` in der Ausleitung, damit es im Bericht
   * auffällt statt still zu bleiben.
   */
  if (!(r1 > 0)) return { r1: 0, r2: 0, quelle: 'keine' };
  return { r1: Math.round(r1 * 100) / 100, r2: Math.round(r1 * 50) / 100,
           quelle: 'flaeche' };
}

/** Querschnittsdefinition eines Gurtwinkels. */
function gurtQuerschnitt(p, gurt) {
  const r = winkelRadien(p);
  return {
    name: `GURT_${gurt}`, art: 'Parametric', form: 'Angle',
    // AddL(Name, a, b, tw, tf, r1, r2, cspRolled) - vermessen. r1/r2 folgen
    // aus der Flaeche (siehe winkelRadien); sie standen hier auf null.
    parameter: [p.aH, p.aV, p.t, r.r1, r.r2],
    radienQuelle: r.quelle,
    // Der Katalogname, unter dem AxisVM das Normprofil fuehrt - die Bruecke
    // versucht ihn vor dem parametrischen Weg.
    katalog: { norm: 'EN 10056-1', bezeichnung: p.name },
    profil: p.name,
    A: p.A / 1e4,                                   // cm2 -> m2
    Iy: (p.iy * p.iy * p.A) / 1e8,                  // cm4 -> m4
    Iz: (p.iz * p.iz * p.A) / 1e8,
    // St-Venant des offenen Winkels: I_t = Σ b·t³/3
    It: ((p.aH + p.aV) * p.t ** 3) / 3 / 1e12,
  };
}

/**
 * Querschnittsdefinition eines Mastprofils (HEB/HEM).
 *
 * DER AUSRUNDUNGSRADIUS STEHT NICHT IN DER TABELLE - ER FOLGT AUS IHR.
 *
 * AxisVM legt das I-Profil parametrisch an (`CrossSections.AddI`, vermessen
 * am 27.08.: Name, h, b, tw, tf, R, Process). Die Profiltabelle dieses
 * Werkzeugs führt R nicht, wohl aber die FLÄCHE - und die Fläche bestimmt R
 * eindeutig:
 *
 *     A = 2·b·tf + (h - 2·tf)·tw + (4 - π)·R²
 *
 * Nach R aufgelöst ergibt das für HEB 200/220/240/260 und HEM 240 der Reihe
 * nach 18.1, 17.9, 21.0, 23.9, 21.0 mm - genau die Radien der Norm. Gerechnet
 * wird mit dem unrunden Wert, damit die Fläche im Modell die Zahl der Tabelle
 * trifft: die Brücke liest sie zurück und hält an, wenn sie abweicht.
 */
function mastQuerschnitt(p) {
  const rest = p.A * 100 - 2 * p.b * p.tf - (p.h - 2 * p.tf) * p.tw;
  const R = rest > 0 ? Math.sqrt(rest / (4 - Math.PI)) : 0;
  return {
    name: `MAST_${p.name.replace(/\s+/g, '')}`, art: 'Parametric', form: 'I',
    parameter: [p.h, p.b, p.tw, p.tf, r6(R)],
    profil: p.name,
    A: p.A / 1e4,                                   // cm2 -> m2
    Iy: p.Iy / 1e8,                                 // cm4 -> m4
    Iz: p.Iz / 1e8,
    It: p.It / 1e8,
  };
}

/** Querschnittsdefinition eines Bindeblechs (Rechteck: Breite × Dicke). */
function blechQuerschnitt(bl, art) {
  const k = art === 'vertikal' ? 'V' : 'H';
  return {
    name: `BLECH_${k}_${bl.breite}x${bl.dicke}`,
    art: 'Parametric', form: 'Rectangle',
    parameter: [bl.breite, bl.dicke],
  };
}

const rechteck = (d) => ({ name: d.name, art: 'Parametric', form: 'Rectangle',
                           parameter: [d.h, d.b] });

/**
 * VERSATZ VON DER GURTACHSE ZUR MITTELEBENE DES SCHENKELS [m].
 *
 * Ein Bindeblech liegt nicht auf der Verbindungslinie der Gurtschwerpunkte -
 * es liegt am Schenkel. Die vier Gurtachsen bilden im Schnitt ein Rechteck,
 * die Blechachsen tun das nicht.
 *
 * DIE RICHTUNG HÄNGT AN DER EINBAULAGE. Bei der Regelbauart `LA_SI` zeigt
 * der liegende Schenkel nach aussen und zieht den Schwerpunkt mit; die
 * stehenden Schenkel liegen dadurch INNEN von der Gurtachse. Bei `LA_SA`
 * ist es umgekehrt. Deshalb kommen ey/ez aus geometry.js - dort steht die
 * Konvention, und sie soll nur an einer Stelle stehen:
 *
 *     ey = ecke.sy · ausr.lg     Richtung des liegenden Schenkels
 *     ez = ecke.sz · ausr.st     Richtung des stehenden Schenkels
 *
 * Der Schenkel liegt ab der Ferse, der Schwerpunkt im Abstand zs davon.
 * Die Mittelebene des Schenkels ist also um (zs − t/2) GEGEN die
 * Schenkelrichtung versetzt:
 *
 *     Δy = −ey · (zsV − t/2)     Mittelebene des stehenden Schenkels
 *     Δz = −ez · (zsH − t/2)     Mittelebene des liegenden Schenkels
 *
 * zs steht in cm, t in mm - so, wie die Profiltabellen es führen.
 */
/**
 * STEIFE LÄNGE JE BLECHENDE [m], NUR ALS RÜCKFALL.
 *
 * Die Starrelemente laufen bis an die Blechkante; dort beginnt der weiche
 * Teil, und seine Länge ist die BLECHLÄNGE AUS DEM SORTIMENT
 * (`bleche.vertikal[].laenge`, für das Signaljoch 420 mm). Diese Angabe hat
 * Vorrang - die Blecheinteilung wird nicht nachgerechnet, sondern übernommen.
 *
 * Nur wenn ein Typ keine Länge führt, wird sie aus dem Profil abgeleitet.
 * Schnitt C-C der Werkstattzeichnung gibt dafür die Regel:
 *
 *   Vertikalblech    stösst gegen die SPITZEN der stehenden Schenkel
 *                    → von der Gurtachse aus  aV − zsH
 *   Horizontalblech  stösst gegen deren INNENSEITE
 *                    → von der Gurtachse aus  zsV
 */
function steifeLaenge(p, art) {
  if (!p) return 0;
  const zsH = (p.zsH ?? p.zs ?? 0) * 10;          // cm -> mm
  const zsV = (p.zsV ?? p.zs ?? 0) * 10;
  const aV = p.aV ?? p.a ?? 0;
  return mm(Math.max(0, art === 'vertikal' ? aV - zsH : zsV));
}

function schenkelVersatz(p, ecke, ausr, tBlech = 0) {
  if (!p) return { dy: 0, dz: 0 };
  const zsV = (p.zsV ?? p.zs ?? 0) * 10;          // cm -> mm
  const zsH = (p.zsH ?? p.zs ?? 0) * 10;
  const t = p.t ?? 0;
  const ey = ecke.sy * ausr.lg;
  const ez = ecke.sz * ausr.st;

  // DAS HORIZONTALBLECH LIEGT AN, NICHT IN DER FLUCHT.
  // Schnitt C-C der Werkstattzeichnung: das Vertikalblech
  // steht in der Flucht der stehenden Schenkel (100/10 × 320 = lichte Höhe
  // 500 − 2·90), das Horizontalblech (100/10 × 260) liegt dagegen an der
  // INNENSEITE der liegenden Schenkel - damit es sich schweissen lässt.
  // Seine Mittelebene rückt dadurch um (t_Schenkel + t_Blech)/2 nach innen,
  // für L90×90×9 mit 10 mm Blech also 9.5 mm.
  const anliegend = tBlech > 0 ? (t + tBlech) / 2 : 0;
  return {
    dy: mm(-ey * (zsV - t / 2)),
    dz: mm(-ez * (zsH - t / 2) + ecke.sz * -anliegend),
  };
}

/**
 * Baut das Stabmodell.
 *
 * @param {object} m       Modell aus core.vierendeel.modell()
 * @param {object} opt     {knotenmodell}
 */
/* ===========================================================================
 * DER EINZELMAST ALS STABMODELL
 *
 * `stabmodell` beginnt mit den Gurtquerschnitten des Jochs - ein Einzelmast
 * hat keine, und der Aufbau brach mit «Cannot read properties of undefined
 * (reading A)» ab. Und zwar lautlos: der Ausleitknopf tat nichts.
 *
 * >>> WARUM HIER EIN EIGENER AUFBAU STEHT UND NICHT EIN ERSATZ. <<<
 *
 * Bei der ANSICHT genuegte ein Querschnitt ohne Ausdehnung: die Schleifen
 * laufen leer, gezeichnet wird nichts. Hier waere derselbe Weg falsch. Ein
 * Ersatzprofil erzeugte eine Querschnittsdefinition GURT_OG in der
 * AxisVM-Datei - ein Bauteil, das es nicht gibt, in einem Modell, das jemand
 * rechnet. Was gezeichnet wird, darf naeherungsweise sein; was ausgeleitet
 * wird, nicht.
 *
 * Geteilt wird deshalb, was sich teilen laesst: Sammler, Mastquerschnitt,
 * Knotenbenennung (MAST_A_*) und die Einspannung im Fundament sind dieselben
 * wie im Jochweg. Was fehlt, sind die STARR-Verbindungen zum Joch - es gibt
 * keins.
 * =========================================================================== */
function stabmodellEinzelmast(m, opt = {}) {
  const s = sammler();
  const md = m.federn?.mastA ?? m.federn?.mast;
  if (!md) {
    throw new Error('Einzelmast ohne Masten: unter «Masten» ein Profil wählen.');
  }
  const qsMast = s.qs(mastQuerschnitt(md.profil));
  /*
   * DIE HOEHENNULL IST DER ANSCHLUSS, nicht der Fuss.
   *
   * So steht es auch beim Joch: z = 0 ist die Jochachse, der Mastfuss liegt
   * bei -H. Beim Einzelmasten gibt es kein Joch, aber die Bezugshoehe bleibt
   * dieselbe - sonst staende ein Einzelmast auf einem Blatt neben einem Joch
   * um H versetzt in der Luft.
   */
  const zFuss = r6(-md.H);
  const zKopf = md.ueberstand > 0 ? r6(zFuss + md.laenge) : 0;
  const x = 0;

  const kFuss = s.kn('MAST_A_F', x, 0, zFuss);
  const kAnschluss = s.kn('MAST_A_OG', x, 0, 0);
  const lcsMast = md.stegrichtung.achse === 'y' ? [1, 0, 0] : [0, 1, 0];

  // Geteilt wird, wo etwas haengt - genau wie beim Joch.
  const mastKn = new Map([[zFuss, kFuss], [0, kAnschluss]]);
  if (zKopf > 1e-9) mastKn.set(zKopf, s.kn('MAST_A_KOPF', x, 0, zKopf));
  const anbauMastAus = [];
  (m.anbauMast ?? []).forEach((a) => {
    const zA = r6(zFuss + (a.hMast ?? 0));
    if (zA < zFuss - 1e-9 || zA > zKopf + 1e-9) {
      anbauMastAus.push({ name: a.name ?? a.id, ende: 'A',
                          hMast: a.hMast ?? 0, H: md.H });
      return;
    }
    if (!mastKn.has(zA)) {
      mastKn.set(zA, s.kn(`MAST_A_H${mastKn.size - 1}`, x, 0, zA));
    }
  });
  const zStufen = [...mastKn.keys()].sort((a, b) => a - b);
  for (let i = 0; i < zStufen.length - 1; i++) {
    s.stab(`MAST_A_S${i + 1}`, qsMast,
           mastKn.get(zStufen[i]), mastKn.get(zStufen[i + 1]),
           { lcsZ: lcsMast });
  }

  // Volleinspannung im Fundament - dieselbe Festlegung wie beim Joch.
  const auflager = [{ ende: 'A', x, h: 0, modell: 'mast', knoten: kFuss,
                      art: 'eingespannt' }];

  return { ...s, auflager, arme: [], knotenmodell: opt.knotenmodell ?? 'anschnitt',
           zOben: 0, verschoben: [], ausKnotenVermerk: [],
           zweiPunktAnschluss: false, anbauMastAus,
           schottAusblenden: opt.schottAusblenden === true };
}

export function stabmodell(m, opt = {}) {
  if (tragwerksart(m).key === 'einzelmast') return stabmodellEinzelmast(m, opt);
  const km = opt.knotenmodell ?? 'anschnitt';
  const s = sammler();
  const st = m.stationsListe;
  const zOben = m.h / 2;

  const qsOG = s.qs(gurtQuerschnitt(m.profOG, 'OG'));
  const qsUG = s.qs(gurtQuerschnitt(m.profUG, 'UG'));
  const qsStarr = s.qs(rechteck(STARR));
  const qsArm = s.qs(rechteck(ARM));

  // Einbaulage der Winkel - sie entscheidet, nach welcher Seite die
  // Blechachsen von den Gurtachsen abweichen.
  const ausrOG = getAusrichtung(m.ausrOG ?? 'LA_SI');
  const ausrUG = getAusrichtung(m.ausrUG ?? 'LA_SI');
  const eckeVon = (id) => ECKEN.find((e) => e.id === id);

  // --- Schnitte entlang der Gurte -------------------------------------------
  // Ein Gurt wird an jeder Station geteilt, im Knotenmodell 'anschnitt'
  // zusätzlich am Rand des steifen Bereichs, und überall dort, wo ein
  // Anbauteil angeschlagen ist.
  const steifBis = new Map();          // x der Station -> halbe Blechbreite [m]
  if (km === 'anschnitt') {
    st.forEach((station) => {
      const bBl = Math.max(station.vertikal?.breite ?? 0,
                           station.horizontal?.breite ?? 0);
      if (bBl > 0) steifBis.set(station.x, mm(bBl) / 2);
    });
  }

  // Geschnitten wird an beiden Anschlussreihen und dazwischen: der Gurt
  // braucht dort Knoten, sonst hängen die Stummel im Leeren.
  const imFeld = (x) => r6(Math.min(Math.max(x, 0), m.L));

  // FEST: was das Tragwerk bestimmt - Enden, Stationen, Blechkanten.
  const fest = new Set([0, r6(m.L)]);
  /*
   * DIE MASTACHSE IST EIN FESTER SCHNITT.
   *
   * Der Mast steht nicht zwingend am Gurtende. Rueckt er nach innen, liegen
   * die Anschlusspunkte auf den GURTEN, und das Joch kragt darueber hinaus;
   * das Auflager darf dabei INNERHALB des Endfelds liegen. Ohne Knoten an
   * dieser Stelle haengten die Starrkoerper zwischen zwei Gurtstaeben.
   *
   * `kragA` und `kragB` fuehren das Mass seit je, und der Ersatzbalken
   * rechnet damit. Die Ausleitung setzte den Mast bis zum 1. September
   * trotzdem starr auf x = 0 und x = L - Ersatzbalken und FEM-Modell
   * beschrieben also zwei verschiedene Tragwerke.
   */
  ['A', 'B'].forEach((ende) => {
    const xm = r6(mastAchse(m, ende));
    if (xm > 1e-9 && xm < m.L - 1e-9) fest.add(xm);
  });
  st.forEach((station) => {
    fest.add(r6(station.x));
    const d = steifBis.get(station.x);
    if (d) {
      fest.add(r6(Math.max(0, station.x - d)));
      fest.add(r6(Math.min(m.L, station.x + d)));
    }
  });

  /*
   * EIN ANBAUTEIL GEHÖRT NICHT IN DEN STEIFEN KNOTENBEREICH.
   *
   * Weisung: was dort zu liegen käme, wird herausgeschoben und mit 10 cm
   * Abstand zum angrenzenden starren Gurt gesetzt. Sonst hängt die Last am
   * steifen Bereich, das anschliessende Feld bleibt ungeprüft, und der
   * Anschluss lässt sich am Bauteil auch nicht ausführen.
   *
   * Geschoben wird die MITTE der Baugruppe; die Reihen folgen ihr im
   * Raster. Sie einzeln zu schieben risse das Raster auseinander.
   */
  const ABSTAND_KNOTEN = 0.10;
  const ausKnoten = (x) => {
    let z = imFeld(x);
    // Zwei Runden: der Schritt aus dem einen Knoten kann in den nächsten
    // führen, wenn zwei Stationen dicht beieinanderstehen.
    for (let runde = 0; runde < 2; runde++) {
      let bewegt = false;
      st.forEach((station) => {
        const d = steifBis.get(station.x);
        if (!d) return;
        const rand = d + ABSTAND_KNOTEN;
        if (Math.abs(z - station.x) >= rand - 1e-9) return;
        z = z >= station.x ? station.x + rand : station.x - rand;
        bewegt = true;
      });
      if (!bewegt) break;
    }
    return imFeld(r6(z));
  };
  const ausKnotenVermerk = [];
  (m.anbauteileFlach ?? []).forEach((a) => {
    const neu = ausKnoten(a.x);
    if (Math.abs(neu - imFeld(a.x)) > 1e-9) {
      ausKnotenVermerk.push({ von: imFeld(a.x), nach: neu,
                              betrag: neu - imFeld(a.x) });
    }
  });

  // BEWEGLICH, nach Wichtigkeit: erst alle Anbauteilmitten, dann die Reihen.
  const beweglich = [];
  (m.anbauteileFlach ?? []).forEach((a) => beweglich.push(ausKnoten(a.x)));
  (m.anbauteileFlach ?? []).forEach((a) => {
    const r = (a.raster ?? 0) / 2;
    const x0 = ausKnoten(a.x);
    if (r > 0) { beweglich.push(imFeld(x0 - r)); beweglich.push(imFeld(x0 + r)); }
  });

  const { xs, verschoben } = schnitteZusammenlegen(fest, beweglich);

  /** Auf den nächsten wirklich vorhandenen Schnitt. */
  const aufSchnitt = (x) => {
    const z = imFeld(x);
    let treffer = z, abstand = Infinity;
    xs.forEach((v) => {
      const d = Math.abs(v - z);
      if (d < abstand) { abstand = d; treffer = v; }
    });
    return abstand <= MIN_SCHNITT ? treffer : z;
  };

  /** Liegt x innerhalb eines steifen Knotenbereichs? */
  const imKnoten = (x) => st.some((station) => {
    const d = steifBis.get(station.x);
    return d ? Math.abs(x - station.x) < d - 1e-9 : false;
  });

  // --- Gurte ----------------------------------------------------------------
  // Höhe und Breite laufen mit x: verjüngte Enden heben den Untergurt an,
  // der Grundrissknick zieht die Seiten zusammen.
  // DIE UNTERGURTE STEHEN AUF DER SCHENKELFLUCHT DER OBERGURTE.
  // Vorgabe des Auftraggebers: die Vertikalbleche sind lotrecht. Sie liegen
  // in der Flucht der stehenden Schenkel, und die sitzt je Gurt um
  // zs_V − t/2 neben dessen Schwerachse. Tragen Ober- und Untergurt
  // verschiedene Profile, laufen die beiden Fluchten auseinander - am
  // Signaljoch 4 mm - und das Blech steht schief. Deshalb rücken die
  // UNTERGURTE in y auf die Flucht der Obergurte.
  //
  // Das betrifft allein den Aufbau des Stabmodells. Der Nachweis rechnet
  // unverändert mit einem gemeinsamen Hebelarm b; so entschieden.
  const ugVersatz = { L: 0, R: 0 };
  ['L', 'R'].forEach((seite) => {
    const dyOG = schenkelVersatz(m.profOG, eckeVon(`OG_${seite}`), ausrOG).dy;
    const dyUG = schenkelVersatz(m.profUG, eckeVon(`UG_${seite}`), ausrUG).dy;
    ugVersatz[seite] = r6(dyOG - dyUG);
  });

  const gurtKnoten = (gurt, seite, x) => {
    const h = m.verlauf ? m.verlauf.hAn(x) : m.h;
    const b = m.breite ? m.breite.bAn(x) : m.b;
    const z = gurt === 'OG' ? zOben : zOben - h;
    const y = r6((seite === 'L' ? -1 : +1) * (b / 2)
                 + (gurt === 'UG' ? ugVersatz[seite] : 0));
    return s.kn(`${gurt}${seite}_${x.toFixed(3)}`, x, y, z);
  };

  ['OG', 'UG'].forEach((gurt) => ['L', 'R'].forEach((seite) => {
    for (let i = 0; i < xs.length - 1; i++) {
      const a = gurtKnoten(gurt, seite, xs[i]);
      const b = gurtKnoten(gurt, seite, xs[i + 1]);
      const mitte = (xs[i] + xs[i + 1]) / 2;
      const steif = imKnoten(mitte);
      const qs = steif ? qsStarr : (gurt === 'OG' ? qsOG : qsUG);
      // Der steife Abschnitt ist TEIL DES GURTES, keine Verbindung: er trägt
      // sein Eigengewicht und die Streckenlasten seines Feldes. Deshalb
      // bleibt er auch in AxisVM ein Stab (siehe starrArt).
      s.stab(`${gurt}${seite}_S${i}`, qs, a, b,
             steif ? { starrRolle: 'gurtabschnitt' } : null);
    }
  }));

  // --- Bindebleche ----------------------------------------------------------
  // Ein Blech läuft von Gurtachse zu Gurtachse. Im Knotenmodell 'anschnitt'
  // sind die äusseren (h − L_c)/2 je Ende steif; dazwischen liegt das Blech
  // mit seinem wirklichen Rechteckquerschnitt.
  //
  // p1/p2 sind die GURTKNOTEN. Das Blech liegt aber nicht auf deren
  // Verbindungslinie, sondern in der Mittelebene der Schenkel - quer dazu
  // versetzt (siehe schenkelVersatz). Der Versatz steht senkrecht auf der
  // Blechspannweite; die Länge des Blechs ändert sich dadurch nicht. Von
  // jedem Gurtknoten führt ein kurzer steifer Stummel zur Blechachse - so
  // ist die Ausmitte im Modell sichtbar und geht auch nach PyNite mit,
  // wo Stabausmitten nicht zur Verfügung stehen.
  const blechStab = (name, qsBlech, p1, p2, v1, v2, laenge = 0, d1 = 0, d2 = 0) => {
    const rueck = (p, v, k) => {
      if (!v || (Math.abs(v.dy) < 1e-9 && Math.abs(v.dz) < 1e-9)) return p;
      const n = s.kn(`${name}_v${k}`, p.x, p.y + v.dy, p.z + v.dz);
      s.stab(`${name}_e${k}`, qsStarr, p.name, n, { starrRolle: 'verbindung' });
      return { name: n, ...s.knoten.get(n) };
    };
    p1 = rueck(p1, v1, 1);
    p2 = rueck(p2, v2, 2);

    // Der Abstand der beiden Blechenden - nach dem Versatz gemessen, nicht
    // aus dem Hebelarm des Nachweises übernommen.
    const L = Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
    // Die Blechlänge aus dem Sortiment hat Vorrang; sie legt beide steifen
    // Stücke symmetrisch fest. Fehlt sie, greift die Ableitung je Ende.
    const ausDaten = laenge > 0 ? Math.max(0, (L - mm(laenge)) / 2) : null;
    const [e1, e2] = km !== 'anschnitt' ? [0, 0]
                   : ausDaten !== null ? [ausDaten, ausDaten] : [d1, d2];
    if (!(L > 0) || (e1 + e2) < 1e-9 || (e1 + e2) >= L) {
      s.stab(name, qsBlech, p1.name, p2.name);
      return;
    }
    const t = (f) => ({ x: p1.x + (p2.x - p1.x) * f,
                        y: p1.y + (p2.y - p1.y) * f,
                        z: p1.z + (p2.z - p1.z) * f });
    const a = t(e1 / L), b = t(1 - e2 / L);
    const n1 = s.kn(`${name}_a`, a.x, a.y, a.z);
    const n2 = s.kn(`${name}_b`, b.x, b.y, b.z);
    s.stab(`${name}_1`, qsStarr, p1.name, n1, { starrRolle: 'blechende' });
    s.stab(`${name}_2`, qsBlech, n1, n2);
    s.stab(`${name}_3`, qsStarr, n2, p2.name, { starrRolle: 'blechende' });
  };

  st.forEach((station, i) => {
    const x = r6(station.x);
    const p = (gurt, seite) => {
      const name = gurtKnoten(gurt, seite, x);
      return { name, ...s.knoten.get(name) };
    };
    const ogl = p('OG', 'L'), ogr = p('OG', 'R');
    const ugl = p('UG', 'L'), ugr = p('UG', 'R');

    // Der Versatz je Ecke, aus der Einbaulage. Das vertikale Blech sitzt am
    // STEHENDEN Schenkel und wird in y versetzt, das horizontale am
    // LIEGENDEN und in z - je Ecke mit eigenem Vorzeichen.
    const vz = (ecke, tBl = 0) => {
      const istOG = ecke.gurt === 'OG';
      return schenkelVersatz(istOG ? m.profOG : m.profUG, ecke,
                             istOG ? ausrOG : ausrUG, tBl);
    };
    // Nur das HORIZONTALblech liegt an - deshalb bekommt allein dort die
    // Blechdicke einen Einfluss auf die Lage.
    const tH = station.horizontal?.dicke ?? 0;
    const eOGL = vz(eckeVon('OG_L')), eOGR = vz(eckeVon('OG_R'));
    const eUGL = vz(eckeVon('UG_L')), eUGR = vz(eckeVon('UG_R'));
    const hOGL = vz(eckeVon('OG_L'), tH), hOGR = vz(eckeVon('OG_R'), tH);
    const hUGL = vz(eckeVon('UG_L'), tH), hUGR = vz(eckeVon('UG_R'), tH);

    // Steife Länge je Ende: bis an die Blechkante. Ober- und Untergurt
    // können verschiedene Profile tragen, deshalb je Ende einzeln.
    const sVO = steifeLaenge(m.profOG, 'vertikal');
    const sVU = steifeLaenge(m.profUG, 'vertikal');
    const sHO = steifeLaenge(m.profOG, 'horizontal');
    const sHU = steifeLaenge(m.profUG, 'horizontal');

    if (station.vertikal) {
      const qs = s.qs(blechQuerschnitt(station.vertikal, 'vertikal'));
      const lV = station.vertikal.laenge ?? 0;
      blechStab(`BV_L_${i}`, qs, ogl, ugl,
                { dy: eOGL.dy, dz: 0 }, { dy: eUGL.dy, dz: 0 }, lV, sVO, sVU);
      blechStab(`BV_R_${i}`, qs, ogr, ugr,
                { dy: eOGR.dy, dz: 0 }, { dy: eUGR.dy, dz: 0 }, lV, sVO, sVU);
    }
    if (station.horizontal) {
      const qs = s.qs(blechQuerschnitt(station.horizontal, 'horizontal'));
      const lH = station.horizontal.laenge ?? 0;
      blechStab(`BH_O_${i}`, qs, ogl, ogr,
                { dy: 0, dz: hOGL.dz }, { dy: 0, dz: hOGR.dz }, lH, sHO, sHO);
      blechStab(`BH_U_${i}`, qs, ugl, ugr,
                { dy: 0, dz: hUGL.dz }, { dy: 0, dz: hUGR.dz }, lH, sHU, sHU);
    }
  });

  // --- Auflager --------------------------------------------------------------
  // Drei Modelle, weil das Jochende die Stelle ist, an der Rechenkern und
  // Bauwerk am weitesten auseinanderliegen.
  //
  //   gurte  Die vier Gurte einzeln gehalten: Untergurte y/z, Obergurte
  //          nur y. Ohne lotrechten Halt am Obergurt entsteht kein
  //          Kräftepaar - das Ende bleibt biegeweich, so wie es aufliegt.
  //          Keine Gelenke nötig: die Gurte haben Abstand und sind einzeln
  //          gehalten.
  //
  //   mitte  Für die Altbauweise. Dort stehen Ober- und Untergurt so eng,
  //          dass ein Kräftepaar über diesen kurzen Hebel das Ergebnis
  //          verfälschte. Gehalten wird deshalb auf halber Höhe in den
  //          beiden Gurtebenen vorn und hinten, y/z, mit Gelenk um y.
  //
  //   punkt  Ein Punkt je Ende auf der Jochachse, über ein steifes Schott
  //          an die vier Gurte gehängt, mit der Drehfeder des Mastkopfes.
  //          Das ist der Ersatzbalken des Rechenkerns - die Vergleichsbasis
  //          der Kalibrierung, nicht das Bauwerk.
  const am = opt.auflagerModell ?? auflagerVorgabe(m);
  const auflager = [];
  // Baugruppen, deren Masthöhe ausserhalb des Mastes liegt - sie werden
  // NICHT gebaut, und das Modell soll es sagen statt sie stillschweigend
  // wegzulassen.
  const anbauMastAus = [];
  // Fundamenthöhe je Ende: die Anbauhöhen zählen von dort.
  const mastFuss = {};
  /*
   * GENAU EIN KNOTEN HÄLT DAS JOCH IN SEINER ACHSE (Weisung).
   *
   * Mehr verlangt das Gleichgewicht in Jochrichtung nicht, und jeder weitere
   * Längshalt ist ein Zwang: zwei Knoten auf verschiedener HÖHE sperren die
   * Verdrehung um y, zwei auf verschiedener SEITE die um z. Genau daran ist
   * das Gurtmodell aufgefallen - vier gehaltene Gurtknoten am Ende A ergaben
   * unter symmetrischer Last -42.6 kNm, am freien Ende B +2.9 kNm: eine
   * Einspannung, die niemand eingestellt hatte.
   *
   * Als Ganzes verdreht sich das Joch trotzdem nicht. Die Torsion hängt an
   * den `uy` eines Endes, die Drehung um z an den `uy` beider Enden, die um y
   * an den `uz` beider Enden. Der Längshalt trägt zu keiner davon bei - er
   * hält nur die Verschiebung in x, und dafür reicht einer.
   *
   * Der Anker sitzt am Ende A. Welcher Knoten es dort ist, ändert am System
   * nichts; gewählt ist der Untergurt, weil dort auch der lotrechte Halt
   * sitzt und eine Längskraft so nicht über einen freien Gurt eintritt.
   */
  let laengsAnker = null;
  ['A', 'B'].forEach((ende, k) => {
    // Das Auflager sitzt dort, wo der Mast steht - bei jedem Auflagermodell.
    const x = r6(mastAchse(m, ende));
    const h = m.verlauf ? m.verlauf.hAn(x) : m.h;
    const halt = (knoten, uz, fiy, c) => auflager.push({
      // h wird mitgeführt, weil die TEILWEISE EINSPANNUNG hier nicht als
      // Drehfeder ankommt, sondern als Kräftepaar zwischen den Gurten - und
      // dessen Hebelarm ist genau diese Jochhöhe (siehe stuetzung).
      ende, x, h: r6(h), modell: am, knoten,
      ux: knoten === laengsAnker ? 'Rigid' : 'Free', uy: 'Rigid', uz,
      fix: 'Free', fiy, fiz: 'Free', feder: c ?? null,
    });

    if (am === 'punkt') {
      const mitte = s.kn(`AUF_${ende}`, x, 0, zOben - h / 2);
      ['OG', 'UG'].forEach((gurt) => ['L', 'R'].forEach((seite) => {
        s.stab(`SCHOTT_${ende}_${gurt}${seite}`, qsStarr,
               mitte, gurtKnoten(gurt, seite, x));
      }));
      // Gabellagerung: Torsion gehalten, Vertikalbiegung über die Drehfeder.
      if (ende === 'A') laengsAnker = mitte;
      auflager.push({ ende, x, modell: am, knoten: mitte,
                      ux: mitte === laengsAnker ? 'Rigid' : 'Free', uy: 'Rigid', uz: 'Rigid',
                      fix: 'Rigid', fiy: 'Feder', fiz: 'Free', feder: 'cFiy' });
      return;
    }

    if (am === 'mitte') {
      ['L', 'R'].forEach((seite) => {
        const bAn = m.breite ? m.breite.bAn(x) : m.b;
        const y = (seite === 'L' ? -1 : +1) * (bAn / 2);
        const n = s.kn(`AUF_${ende}_${seite}`, x, y, zOben - h / 2);
        ['OG', 'UG'].forEach((gurt) => {
          s.stab(`SCHOTT_${ende}_${seite}${gurt}`, qsStarr,
                 n, gurtKnoten(gurt, seite, x));
        });
        // Gelenk um y: der kurze Hebel zwischen den Gurten darf keine
        // Einspannung vortäuschen.
        if (ende === 'A' && seite === 'L') laengsAnker = n;
        halt(n, 'Rigid', 'Free', null);
      });
      return;
    }

    if (am === 'mast') {
      /*
       * DER MAST STEHT IM MODELL (Weisung).
       *
       * Bis hierher endete das Joch an einem Lager - einem Punkt mit
       * Drehfeder oder vier gehaltenen Gurtknoten. Die Feder war eine Zahl
       * aus E·I/H; wo sie herkam, sah man dem Modell nicht an. Hier steht
       * statt ihrer der Mast selbst, und die Steifigkeit entsteht, wo sie
       * hingehört.
       *
       * AUFBAU JE ENDE
       *   Mastachse in der Jochendebene (x = 0 bzw. x = L), y = 0.
       *   Knoten auf Höhe Obergurt, Untergurt und Fundament.
       *   Je Gurtebene: ein STARRKÖRPER über die beiden Gurte auf einen
       *   Anschlusspunkt, von dort ein LINKELEMENT an den Mast.
       *
       * WAS DAS LINKELEMENT ÜBERTRÄGT (Weisung): Kräfte starr, Momente frei.
       * Zwei solche Anschlüsse im Abstand der Jochhöhe ergeben das
       * Kräftepaar, das im Ersatzbalken die Drehfeder vertritt - nur dass
       * es hier aus der Biegung des Mastes zwischen den beiden Höhen folgt.
       *
       * WARUM DER ANSCHLUSSPUNKT 10 cm EINWÄRTS SITZT. Ein Linkelement
       * braucht in AxisVM eine LINIE, und eine Linie braucht Länge; läge der
       * Anschlusspunkt auf der Mastachse, wäre sie null. Verschoben wird
       * deshalb der Anschlusspunkt nach INNEN, nicht die Mastachse nach
       * aussen - die Stützweite bleibt damit die des Rechenkerns. 10 cm ist
       * dasselbe Mass, das der Auftraggeber schon für die Linkelemente der
       * Anbauteile gesetzt hat.
       *
       * NACHGEMESSEN (AxisVM 18 r1k, 27.08.). J90 über 20 m, Schnee
       * 1.0 kN/m, HEB 240 mit H = 7.00 m, Steg in Jochachse:
       *
       *   Feldmoment im Modell        27.60 kNm
       *   Feldmoment der Anwendung    27.57 kNm  (c_φ = 4.00·E·I/H)
       *
       * Aus dem Feldmoment rückgerechnet beträgt die wirksame Drehfeder des
       * gebauten Mastes 13 456 kNm/rad, also 3.98·E·I/H. Das ist der
       * Lehrbuchwert 4.00 des unverschieblichen Rahmens auf ein halbes
       * Prozent - und damit ist dieser Aufbau gegen die Theorie belegt:
       * Geometrie, Querschnitt, Anschluss und Einspannung stimmen.
       *
       * >>> Der Rechenkern rechnete lange mit 3.10 - dem Wert zweier
       * PyNite-Rahmen. Seit dem 31. August steht er auf 4.00: Entscheid des
       * Auftraggebers zugunsten des geprueften Programms und der
       * Uebereinstimmung mit der Fachliteratur. Die Anwendung trifft die
       * Messung damit auf ein Promille. Voraussetzung bleibt die volle
       * Einspannung des Fundaments, die hier Weisung ist. <<<
       *
       * DER LÄNGSANKER GILT HIER NICHT. Oben hält genau ein Knoten das Joch
       * in seiner Achse, damit kein Zwang entsteht. Hier halten beide
       * Fundamente - aber über die Biegung zweier Maste, also weich. Das ist
       * das wirkliche Tragwerk und kein Zwang: dehnt sich das Joch, geben
       * die Mastköpfe nach.
       */
      const md = ende === 'A' ? (m.federn?.mastA ?? m.federn?.mast)
                              : (m.federn?.mastB ?? m.federn?.mast);
      if (!md) {
        // Seit dem 28. August steht der Mast unter «Masten» und nicht mehr
        // in der Endauflagerwahl - die Meldung muss dorthin zeigen, wo der
        // Schalter jetzt ist.
        throw new Error('Das Auflagermodell «Mast» braucht einen Mast. '
          + 'Unter «Masten» den Schalter «Masten im Modell» einschalten.');
      }
      const qsMast = s.qs(mastQuerschnitt(md.profil));
      // Der Mastkopf sitzt auf der JOCHACHSE: dort misst der Rechenkern
      // seine Höhe H, und dort greift im Ersatzbalken die Drehfeder an.
      const zUnten = r6(zOben - h);
      const kOG = s.kn(`MAST_${ende}_OG`, x, 0, zOben);
      const kUG = s.kn(`MAST_${ende}_UG`, x, 0, zUnten);
      const zFuss = r6(zOben - h / 2 - md.H);
      mastFuss[ende] = zFuss;
      const kFuss = s.kn(`MAST_${ende}_F`, x, 0, zFuss);
      /*
       * DIE DREHLAGE DES PROFILS FOLGT DER STEGRICHTUNG.
       *
       * AxisVM legt das I-Profil mit der Höhe h in der lokalen z-Richtung
       * an. Der Stab steht lotrecht, also ist die lokale y-Achse waagrecht.
       *   lcsZ = [1,0,0]  -> h in der Jochachse, starke Achse quer
       *                      («Steg in Jochachse»)
       *   lcsZ = [0,1,0]  -> h in Gleisrichtung, schwache Achse quer
       * Dieselbe Unterscheidung, die `mastSteifigkeit` über I_y bzw. I_z
       * trifft - hier als Geometrie statt als Zahl.
       */
      const lcsMast = md.stegrichtung.achse === 'y' ? [1, 0, 0] : [0, 1, 0];

      /*
       * DER MAST WIRD DORT GETEILT, WO ETWAS AN IHM HÄNGT.
       *
       * Ein Anbauteil braucht einen Knoten auf der Mastachse; ein Stab, der
       * vom Fundament bis zum Untergurt durchläuft, hat dort keinen. Also
       * werden die Anbauhöhen in die Knotenliste des Mastes aufgenommen und
       * der Mast stückweise gebaut - dieselbe Rechnung, nur mit mehr
       * Stützstellen.
       *
       * Ausserhalb der Mastlänge liegende Höhen fallen weg; sie wären ein
       * Anbauteil in der Luft. Der Bericht sagt es über `anbauMastAus`.
       *
       * DER LANGE MAST RAGT ÜBER DAS JOCH. Ist eine Gesamtlänge angegeben,
       * läuft der Mast über den Obergurt hinaus weiter - oben sitzen die
       * Traversen mit den Zusatzleitern. Ohne diesen Kragarm fiele genau das
       * heraus, was der Auftraggeber ansetzen will: bis hierher endete der
       * Mast am Obergurt, und alles darüber landete in `anbauMastAus`.
       *
       * Der Kragarm bekommt einen eigenen Kopfknoten; die Drehfeder des
       * Jochanschlusses bleibt unberührt, sie rechnet weiter mit H.
       */
      const zKopf = md.ueberstand > 0 ? r6(zFuss + md.laenge) : zOben;
      const mastKn = new Map([[r6(zFuss), kFuss], [zUnten, kUG], [zOben, kOG]]);
      if (zKopf > zOben + 1e-9) {
        mastKn.set(zKopf, s.kn(`MAST_${ende}_KOPF`, x, 0, zKopf));
      }
      const ausserhalb = [];
      (m.anbauMast ?? []).forEach((a) => {
        if ((a.ort === 'mastB' ? 'B' : 'A') !== ende) return;
        const zA = r6(zFuss + (a.hMast ?? 0));
        if (zA < zFuss - 1e-9 || zA > zKopf + 1e-9) {
          ausserhalb.push({ name: a.name ?? a.id, ende, hMast: a.hMast ?? 0,
                            H: md.H });
          return;
        }
        if (!mastKn.has(zA)) {
          mastKn.set(zA, s.kn(`MAST_${ende}_H${mastKn.size - 2}`, x, 0, zA));
        }
      });
      anbauMastAus.push(...ausserhalb);
      const zStufen = [...mastKn.keys()].sort((p1, p2) => p1 - p2);
      for (let i = 0; i < zStufen.length - 1; i++) {
        s.stab(`MAST_${ende}_S${i + 1}`, qsMast,
               mastKn.get(zStufen[i]), mastKn.get(zStufen[i + 1]),
               { lcsZ: lcsMast });
      }

      const einwaerts = ende === 'A' ? LINK_LAENGE : -LINK_LAENGE;
      [['OG', kOG, zOben], ['UG', kUG, zUnten]].forEach(([gurt, kMast, zG]) => {
        const ans = s.kn(`ANS_${ende}_${gurt}`, r6(x + einwaerts), 0, zG);
        ['L', 'R'].forEach((seite) => {
          s.stab(`STARR_${ende}_${gurt}${seite}`, qsStarr,
                 gurtKnoten(gurt, seite, x), ans, { starrRolle: 'verbindung' });
        });
        s.stab(`LINK_${ende}_${gurt}`, qsStarr, ans, kMast,
               { starrRolle: 'uebergang',
                 kraft: { x: 'Rigid', y: 'Rigid', z: 'Rigid',
                          xx: 'Free', yy: 'Free', zz: 'Free' } });
      });

      // Volleinspannung im Fundament (Weisung: Mast bis Fundament, starr).
      auflager.push({ ende, x, h: r6(h), modell: am, knoten: kFuss,
                      ux: 'Rigid', uy: 'Rigid', uz: 'Rigid',
                      fix: 'Rigid', fiy: 'Rigid', fiz: 'Rigid', feder: null });
      return;
    }

    /*
     * am === 'gurte'
     *
     * HIER STAND EINE GURTFEDER, UND SIE IST WIEDER WEG. Nachgerechnet in
     * AxisVM (18 r1k, J90 über 20 m, Schnee 1.0 kN/m, c_phi = 12951 kNm/rad):
     *
     *                        Ende A     Feldmitte    Ende B
     *   gurte ohne Feder     -42.58       26.30       +2.85   kNm
     *   gurte mit Gurtfeder  -42.65       26.30       +2.80
     *   punkt, Drehfeder     -16.70       28.28      -16.71
     *   Anwendung            22.12        27.88       22.12
     *
     * Die Feder änderte 0.07 kNm von 42 - sie tat nichts. Der Gedanke
     * dahinter (Endverdrehung hebt den Obergurt um theta*h, also
     * k = c_phi/(2h²)) stimmt für sich, trägt hier aber nicht: der lotrechte
     * Halt sitzt am UNTERGURT, nicht auf der Jochachse. Die Endscheibe dreht
     * sich deshalb um den Untergurt, und die Jochachse hebt sich dabei mit -
     * ein ganz anderes System als der Ersatzbalken, dessen Feder am
     * Auflagerpunkt der Achse sitzt.
     *
     * DIE MESSUNG HAT NOCH ETWAS ANDERES GEZEIGT, und das war der schwerere
     * Befund: das Modell stand an den beiden Enden VERSCHIEDEN da. Am Ende A
     * waren alle vier Gurtknoten in x gehalten, am Ende B keiner. Eine
     * Verdrehung um y verschiebt Ober- und Untergurt aber GEGENLÄUFIG in x -
     * vier Festhaltungen sperrten sie damit weitgehend, und Ende A war unter
     * symmetrischer Last nahezu eingespannt, ohne dass das jemand eingestellt
     * hätte. Das ist behoben: nur noch EIN Knoten hält in x (siehe
     * `laengsAnker` oben), und das Ende ist wieder so weich, wie der Vermerk
     * es beschreibt.
     *
     * WER TEILWEISE EINSPANNUNG BRAUCHT, nimmt `punkt`. Dort ist sie
     * nachgemessen: Feldmoment 28.28 gegen 27.88 kNm der Anwendung (+1.4 %),
     * und über das Gleichgewicht M_A = 50.00 - 28.28 = 21.72 gegen 22.12
     * (-1.8 %). Das Gurtmodell kann sie nicht tragen und soll es auch nicht:
     * es zeigt die LASTEINLEITUNG in die vier Gurte, nicht den Rahmen.
     *
     * WENN DER MAST INS MODELL KOMMT, wird dieses Ende der Ort dafür. Dann
     * tritt an die Stelle der Punktlager je GURTEBENE ein Starrkörper über
     * die beiden Gurtknoten und ein Linkelement zum Mast - zwei Anschlüsse
     * im Abstand der Jochhöhe. Das Kräftepaar, das die Drehfeder heute
     * ersetzt, entsteht dort von selbst, und die Steifigkeit stammt aus dem
     * Mast statt aus einer Zahl. Bis dahin bleibt es bei den Punktlagern.
     */
    if (ende === 'A') laengsAnker = gurtKnoten('UG', 'L', x);
    ['OG', 'UG'].forEach((gurt) => ['L', 'R'].forEach((seite) => {
      halt(gurtKnoten(gurt, seite, x), gurt === 'UG' ? 'Rigid' : 'Free',
           'Free', null);
    }));
  });

  // --- Anbauteile als steife Arme -------------------------------------------
  // Die Last greift dort an, wo sie wirklich angreift. Der Arm überträgt sie
  // auf die Anschlusspunkte - und damit entsteht im Modell von selbst das
  // Kräftepaar, das der Rechenkern in core.anbauteile.js von Hand ansetzt.
  // Ein Bauteil steht in anbauteileFlach je Modul und je Lastblock EINMAL.
  // Für das Modell zählt aber der Anschlusspunkt: alles, was an derselben
  // Stelle über dieselbe Befestigung eintritt, gehört an EINEN Arm. Sonst
  // stünden mehrere steife Arme nebeneinander und würden die örtliche
  // Einleitung künstlich versteifen.
  /*
   * GRUPPIERT WIRD NACH BAUGRUPPE, NICHT NACH KOORDINATEN.
   *
   * Vorher war der Schluessel [x, y, z, Befestigung, Raster]. Damit fielen
   * Module DERSELBEN Baugruppe auseinander, sobald sie auf verschiedenen
   * Hoehen sitzen - und genau das ist der Normalfall: die Haengestuetze auf
   * -1.35 m, der Ausleger darunter auf -2.70 m. Jedes Stueck bekam seinen
   * eigenen Arm vom Gurt herunter, und im Modell hing alles EINZELN am Joch
   * statt in einer Kette. So war es auch im AxisVM zu sehen.
   *
   * Die Baugruppe haelt zusammen, was zusammengehoert; welches Teil auf
   * welchem sitzt, sagen die Rollen (siehe unten).
   */
  const gruppiert = new Map();
  (m.anbauteileFlach ?? []).forEach((a) => {
    const schluessel = a.baugruppe ?? a.id;
    const da = gruppiert.get(schluessel);
    if (da) { da.teile.push(a); return; }
    gruppiert.set(schluessel, { ...a, teile: [a] });
  });

  const arme = [];
  // Welche Anschlüsse an nur zwei Punkten hängen und deshalb im Link ein
  // Moment um y halten. Wird im Bericht der Brücke aufgeführt - es ist die
  // einzige Stelle, an der ein Link mehr als Kräfte überträgt.
  const zweiPunktAnschluss = [];
  [...gruppiert.values()].forEach((a, k) => {
    // Dieselbe Verschiebung wie oben bei den Schnitten - sie ist
    // deterministisch, beide Stellen kommen auf denselben Wert.
    const x0 = aufSchnitt(ausKnoten(a.x));
    const r = (a.raster ?? 0) / 2;
    const zOG = zOben;
    const zUG = zOben - (m.verlauf ? m.verlauf.hAn(a.x) : m.h);
    const ebenen = a.befestigung === 'durchgehend' ? ['UG', 'OG']
                 : a.befestigung === 'oben' ? ['OG'] : ['UG'];
    const zVon = (g) => (g === 'OG' ? zOG : zUG);

    /*
     * ANSCHLUSS EINER HÄNGESTÜTZE.
     *
     * Ohne Raster: EINE Reihe, zwei Punkte (links und rechts). Der Anschluss
     * ist biegesteif - Variante A.
     *
     * Mit Raster: ZWEI Reihen längs der Jochachse, also VIER Punkte je Gurt-
     * ebene. Bei `durchgehend` unten und oben je vier. Und die beiden Reihen
     * dürfen den Gurt nicht zwischen sich einspannen:
     *
     *     erste Reihe    x  y  z
     *     zweite Reihe      y  z          <- x frei, ein Langloch
     *
     * Wären beide Reihen in x gehalten, könnte sich der Gurt zwischen ihnen
     * nicht mehr dehnen. Über die Rasterlänge ist das eine Zwängung mitten
     * IM Gurt, und sie erzeugt Normalkräfte, die es nicht gibt.
     *
     * WO DIE FREIGABE SITZT. Nicht im Stummel: der liegt in ±y, und «x frei»
     * wäre dort eine QUERrichtung. Welche der beiden lokalen Querachsen das
     * ist, hinge daran, wie AxisVM die lokalen Achsen legt - eine Freigabe
     * auf Verdacht.
     *
     * Stattdessen bekommt der Anschlusskörper zwischen Mitte und zweiter
     * Reihe eine Freigabe IN SEINER ACHSE, und die ist die Jochachse. Am
     * Knoten der zweiten Reihe hängen dann nur noch dieser Körper (ohne
     * Längskraft) und ihr Stummel; aus dem Gleichgewicht in x folgt, dass
     * der Stummel keine Längskraft überträgt. Wirkung gleich, Richtung
     * eindeutig - eine Freigabe in der Stabachse ist überall dieselbe.
     */
    // Rasten beide Reihen auf dieselbe Stelle ein - bei einem Raster von
    // 20 mm ist das so -, dann sind es keine zwei Reihen mehr, sondern ein
    // Anschluss. Dann gilt Variante A, biegesteif.
    const reihen = [...new Set(r > 0
      ? [aufSchnitt(ausKnoten(a.x) - r), aufSchnitt(ausKnoten(a.x) + r)]
      : [x0])];
    const mitte = {};
    // Zwei Punkte heisst: eine Reihe in einer Ebene. Dann trägt das Link
    // das Moment um y - siehe unten.
    const zweiPunkt = ebenen.length === 1 && reihen.length === 1;

    ebenen.forEach((gurt) => {
      const z = zVon(gurt);
      // DER ÜBERGANG GURT -> ANBAUTEIL LÄUFT ÜBER EIN VERTIKALES
      // LINKELEMENT (Weisung): am Obergurt nach oben, am Untergurt nach
      // unten angesetzt, rund 10 cm lang. Der Anschlusskörper selbst ist
      // ein Starrkörper und sitzt damit um diese Länge neben der
      // Gurtebene; der Lastpunkt bleibt, wo er ist.
      const vz = gurt === 'OG' ? +1 : -1;
      const zK = r6(z + vz * LINK_LAENGE);

      // Knoten der Reihen auf der Jochachse, dorthin die starren Äste.
      const knRe = reihen.map((xr, j) => {
        const n = s.kn(`AT${k}_${gurt}_R${j + 1}`, xr, 0, zK);
        ['L', 'R'].forEach((seite) => {
          const gk = gurtKnoten(gurt, seite, xr);
          const g = s.knoten.get(gk);
          // Das Link steht senkrecht über bzw. unter dem Gurtknoten -
          // gleiches x, gleiches y, nur z versetzt.
          const nv = s.kn(`AT${k}_${gurt}_R${j + 1}${seite}_v`, g.x, g.y, zK);
          /*
           * WAS DAS LINK ÜBERTRÄGT.
           *
           * Zwei Punkte (eine Reihe): alles - das ist Variante A,
           * biegesteif. Vier Punkte: die ZWEITE Reihe gibt die Längskraft
           * frei, sonst zwängt der Anschluss im Gurt.
           *
           * Die Freigabe sitzt jetzt im Link und wird global gestellt
           * (`sysGlobal`), «x» ist damit die Jochachse - so eindeutig wie
           * vorher die Stabachse des Astes, aber ohne den Umweg.
           */
          const laengsFrei = reihen.length > 1 && j > 0;
          /*
           * NUR KRÄFTE, KEINE MOMENTE (Weisung) - das ist der Zweck des
           * Linkelements: der Anschluss überträgt x, y, z und lässt die
           * Momente frei. Die zweite Reihe gibt zusätzlich die Längskraft
           * frei, sonst zwängt sie im Gurt.
           *
           * EINE AUSNAHME, und sie ist zwingend: hängt das Teil an nur ZWEI
           * Punkten - eine Reihe, eine Ebene, wie es am Ober- oder
           * Untergurt allein vorkommt -, dann liegen beide Punkte auf einer
           * Geraden in Gleisrichtung. Um genau diese Gerade hielte ihn
           * nichts mehr: eine Drehung dorthin bewegt keinen der Punkte und
           * weckt also keine Kraft. Deshalb nimmt das Link dort das Moment
           * um y auf (Weisung).
           */
          s.stab(`AT${k}_${gurt}_R${j + 1}${seite}_V`, qsStarr, gk, nv, {
            starrRolle: 'uebergang',
            kraft: { x: laengsFrei ? 'Free' : 'Rigid', y: 'Rigid', z: 'Rigid',
                     xx: 'Free', yy: zweiPunkt ? 'Rigid' : 'Free', zz: 'Free' },
          });
          s.stab(`AT${k}_${gurt}_R${j + 1}${seite}`, qsStarr, nv, n,
                 { starrRolle: 'verbindung' });
        });
        return { x: xr, n };
      });

      // Der Anschlusskörper zwischen den Reihen, mit einem Knoten in der
      // Mitte - dort hängt die Stütze.
      const nm = s.kn(`AT${k}_${gurt}`, x0, 0, zK);
      mitte[gurt] = nm;
      knRe.forEach(({ x: xr, n }, j) => {
        if (Math.abs(xr - x0) < 1e-9) return;
        s.stab(`AT${k}_${gurt}_B${j + 1}`, qsStarr, nm, n,
               { starrRolle: 'verbindung' });
      });
    });

    // Bei vier Punkten oben UND unten läuft der Stab durch den Kasten.
    if (ebenen.length === 2) {
      s.stab(`ARM${k}_D`, qsArm, mitte.OG, mitte.UG, { starrRolle: 'anbauteil' });
    }

    /*
     * DIE KETTE, NICHT DER STERN.
     *
     * Der Ausleger sitzt auf der Haengestuetze, das Kettenwerk am Ausleger -
     * so ist es gebaut, und so gehoert es ins Modell. Die Vorlage sagt es
     * ueber die ROLLE ihrer Module:
     *
     *     traeger    die Haengestuetze am Joch
     *     aufbau     was auf ihr sitzt (Ausleger)
     *     drahtwerk  was der Aufbau traegt (Kettenwerk, Leiter)
     *
     * Jede Stufe haengt an der vorigen; mehrere Teile DERSELBEN Stufe haengen
     * nebeneinander an derselben Vorgaengerstufe (zwei Ausleger an einer
     * Stuetze sind eine Gabel, keine Reihe).
     *
     * OHNE ROLLE bleibt ein Teil auf Stufe 0, also unmittelbar am Anschluss.
     * Wo die Daten keine Kette nennen, wird auch keine erfunden.
     *
     * FAELLT EIN PUNKT MIT SEINEM VORGAENGER ZUSAMMEN - Ausleger und
     * Kettenwerk liegen beide auf -2.70 m -, entsteht KEIN Stab der Laenge
     * null; das Teil haengt dann am selben Knoten. Seine Lasten greifen
     * ohnehin dort an.
     *
     * DAS ANBAUTEIL SELBST IST EIN STARRKOERPER (Weisung). Es traegt keine
     * Streckenlast - seine Lasten sitzen als Punktlasten am Lastknoten -,
     * also geht dabei nichts verloren. Ist ein Gelenk gesetzt, bleibt es ein
     * Stab: ein Starrkoerper kennt keine Freigabe.
     */
    /*
     * VON WELCHEM GURT DIE HOEHE ZAEHLT.
     *
     * Bisher stand hier: bei 'durchgehend' vom UNTERGURT. Das war falsch. Der
     * Rechenkern misst z dort, wo man es am Bauteil abgreift (anschlussGurt in
     * core.anbauteile.js): was nach oben ragt, am Obergurt, was haengt, am
     * Untergurt. Ein Jochaufsatz sass in der Ausleitung deshalb um die ganze
     * Jochhoehe zu tief - beim J90 gemessene 0.449 m. Fuer die vertikale Last
     * bleibt das folgenlos, fuer die WAAGRECHTE nicht: ihr Hebelarm zur
     * Jochachse und damit die Torsion war um F_y * h daneben.
     *
     * Die Ebene folgt dem TRAEGER der Baugruppe - dem Teil, das wirklich am
     * Joch haengt. Dass alle Teile einer Baugruppe zur selben Seite zeigen,
     * prueft der Pruefstand ueber die ganze Vorlagendatenbank.
     */
    const traegerTeil = (a.teile ?? [a]).find((x) => (x.rolle ?? '') === 'traeger')
                     ?? (a.teile ?? [a])[0] ?? a;
    const anGurt = anschlussGurt({ befestigung: a.befestigung, z: traegerTeil.z ?? 0 });
    const zAn = anGurt === 'OG' ? zOG : zUG;
    const anker = anGurt === 'OG' ? mitte.OG : mitte.UG;

    /*
     * DIE KETTE KOMMT AUS DEM RECHENKERN (anbauKette in core.anbauteile.js).
     *
     * Dort steht auch, was die Modellansicht zeichnet. Zwei getrennte
     * Fassungen waren der Grund, warum das Bild einen geraden Staender zeigte,
     * waehrend im AxisVM jedes Teil einzeln am Joch hing.
     *
     * x0 ist die Wurzel: die Station der Baugruppe, gegebenenfalls aus einem
     * steifen Knotenbereich gerueckt. Der Versatz eines Kragarms haengt
     * massgenau daran, nicht an der urspruenglichen Station.
     */
    const kette = anbauKette(a.teile ?? [a], { x0, zAn });
    const knotenVon = new Map([[kette.wurzel, anker]]);
    kette.glieder.forEach((g) => {
      const kn = s.kn(`AL${k}_${g.bis.nr}`, r6(g.bis.x), r6(g.bis.y), r6(g.bis.z));
      knotenVon.set(g.bis, kn);
      s.stab(`ARM${k}_${g.bis.nr}`, qsArm, knotenVon.get(g.von), kn,
             opt.anbauGelenk ? { gelenkAnfang: opt.anbauGelenk }
                             : { starrRolle: 'anbauteil' });
    });
    kette.belegung.forEach(({ teil, punkt }) =>
      arme.push({ teil, knoten: knotenVon.get(punkt) }));

    if (zweiPunkt) {
      zweiPunktAnschluss.push({ name: a.name ?? `AT${k}`, x: x0, ebene: ebenen[0] });
    }
  });

  /*
   * ANBAUTEILE AM MASTEN (Weisung, 27. August).
   *
   * Dieselbe Kette wie am Joch - Träger, Aufbau, Drahtwerk -, nur mit einer
   * anderen Wurzel: einem Knoten auf der Mastachse statt einem Punkt am
   * Jochende. Gebaut wird sie mit demselben `anbauKette` aus dem Rechenkern;
   * eine zweite Fassung war schon einmal der Grund, warum Bild und Modell
   * verschiedene Tragwerke zeigten.
   *
   * DIE WURZEL IST DER MASTKNOTEN SELBST. Am Joch hängt die Baugruppe an
   * einem Anschlusskasten über zwei Reihen; am Masten gibt es nichts
   * dergleichen - das Teil ist an den Masten geschraubt, und das ist EINE
   * Stelle. Deshalb kein Kasten, kein Raster, keine zweite Reihe.
   *
   * >>> X IST GLOBAL, AN BEIDEN ENDEN (Weisung, 28. August): «beim Eingeben
   * von x sich an die globale Ausrichtung des Achsensystems halten, das gilt
   * für alle Eingaben bei allen Bauteilen». <<<
   *
   * Hier wurde am Ende B an der Mastachse GESPIEGELT - mit der Begründung,
   * die Teile trügen ihre Ausladung «nach aussen» und aussen liege dort in
   * −x. Das ist eine zweite Bedeutung für dasselbe Feld: dieselbe Zahl
   * zeigte am einen Ende nach rechts und am anderen nach links, und wer
   * beide Enden nebeneinander eingibt, muss im Kopf umdrehen. Am Joch war x
   * immer global; jetzt ist es das überall.
   *
   * OHNE MAST IM MODELL passiert hier nichts: die anderen Auflagermodelle
   * enden am Lager, es gibt keinen Masten zum Anhängen. Der Rechenkern hat
   * die Teile ohnehin herausgenommen (core.vierendeel.js), und die Prüfung
   * sagt es.
   */
  if (am === 'mast') {
    // Gruppiert wie am Joch: die Baugruppe haelt zusammen, was zusammengehoert.
    const mastGruppen = new Map();
    (m.anbauMastFlach ?? []).forEach((t) => {
      const schluessel = t.baugruppe ?? t.id;
      const da = mastGruppen.get(schluessel);
      if (da) { da.teile.push(t); return; }
      mastGruppen.set(schluessel, { ...t, teile: [t] });
    });
    [...mastGruppen.values()].forEach((a, k) => {
      const ende = a.ort === 'mastB' ? 'B' : 'A';
      const xM = ende === 'A' ? 0 : r6(m.L);
      const wurzelKn = [...s.knoten.entries()].find(([nm, kn]) =>
        nm.startsWith(`MAST_${ende}_`)
        && Math.abs(kn.z - r6(mastFuss[ende] + (a.hMast ?? 0))) < 1e-9);
      if (!wurzelKn) return;               // ausserhalb - schon vermerkt
      // Die Wurzel liegt auf der Mastachse; jedes Teil sitzt relativ dazu.
      const kette = anbauKette(a.teile ?? [a], { x0: 0, zAn: 0 });
      const knotenVon = new Map([[kette.wurzel, wurzelKn[0]]]);
      kette.glieder.forEach((g) => {
        const kn = s.kn(`AM${k}_${g.bis.nr}`,
                        r6(xM + g.bis.x), r6(g.bis.y),
                        r6(wurzelKn[1].z + g.bis.z));
        knotenVon.set(g.bis, kn);
        s.stab(`ARMM${k}_${g.bis.nr}`, qsArm, knotenVon.get(g.von), kn,
               opt.anbauGelenk ? { gelenkAnfang: opt.anbauGelenk }
                               : { starrRolle: 'anbauteil' });
      });
      kette.belegung.forEach(({ teil, punkt }) =>
        arme.push({ teil, knoten: knotenVon.get(punkt) }));
    });
  }

  return { ...s, auflager, arme, knotenmodell: km, zOben, verschoben,
           ausKnotenVermerk, zweiPunktAnschluss, anbauMastAus,
           schottAusblenden: opt.schottAusblenden === true };
}

// ---------------------------------------------------------------------------
// Lasten
// ---------------------------------------------------------------------------

/**
 * Lasten je Einwirkungsgruppe, charakteristisch.
 *
 * Getrennt ausgegeben, nicht kombiniert: die Kombination gehört nach AxisVM,
 * und nur getrennte Lastfälle lassen sich hinterher Anteil für Anteil mit der
 * eigenen Rechnung vergleichen.
 */
export function lasten(m, bau, opt = {}) {
  // Die Untergruppen der ständigen Last führt nur die COM-Ausleitung. Die
  // SAF-Mappe und die DXF-Zuordnung schreiben ihre Lastfallliste selbst;
  // dort verwiese eine Last sonst auf einen Fall, den es nicht gibt.
  const gTrennen = opt.gTrennen === true;
  const punkt = [], moment = [], strecke = [];
  const gurte = [];
  ['OG', 'UG'].forEach((g) => ['L', 'R'].forEach((se) => gurte.push(`${g}${se}`)));

  // LAUFMETERLASTEN DES JOCHS - wohin sie gehören.
  //
  // EIGENGEWICHT wird NICHT als Streckenlast geschrieben. Das Rechenprogramm
  // ermittelt es aus den Stäben selbst (Querschnitt × Wichte); beides
  // anzusetzen zählte es doppelt. Ausgegeben wird nur ein allfälliger
  // ZUSCHLAG (gZusatz) - was an Anbauten pauschal dazugerechnet wird und in
  // keinem Stab steckt.
  //
  // >>> Damit ist das Eigengewicht im Modell das des Modells, nicht das der
  // Sortimentstabelle. Die beiden weichen ab: der parametrische Winkel wird
  // ohne Ausrundungsradien gebaut und ist rund 2 % leichter, und die
  // Anschlussbleche der Zeichnung stecken in keinem Stab. Wer die Tabelle
  // treffen will, setzt die Differenz als Zuschlag an. <<<
  //
  // SCHNEE liegt oben: hälftig auf die beiden OBERGURTE.
  // WIND quer greift an der ganzen Ansichtsfläche an: hälftig auf EINEN Ober-
  // und EINEN Untergurt derselben Seite. Damit liegt die Resultierende auf
  // halber Höhe, und es entsteht - wie im Rechenkern angenommen - KEINE
  // Torsion aus der Laufmeterlast des Jochs.
  // WER DAS EIGENGEWICHT SELBST RECHNET, BEKOMMT NUR DEN ZUSCHLAG.
  // AxisVM tut das (siehe oben), PyNite NICHT: dort steht im Skript keine
  // Zeile, die es aus den Stäben ableitet, und ohne sie fehlte im Modell die
  // grösste Einzellast. Der PyNite-Export setzt deshalb `eigengewicht: true`
  // und bekommt die volle Laufmeterlast der Sortimentstabelle - was für ein
  // VERGLEICHSMODELL ohnehin das Richtige ist: so wird die Modellbildung
  // verglichen und nicht die Wichte.
  const gZusatz = m.char?.herkunft?.gZusatz ?? 0;
  const gStrecke = opt.eigengewicht ? (m.char?.gk ?? 0) : gZusatz;
  const verteilt = [
    { gruppe: 'G', richtung: 'Z', wert: -gStrecke, auf: ['OGL', 'OGR', 'UGL', 'UGR'] },
    { gruppe: 'WindY', richtung: 'Y', wert: +(m.char?.wk ?? 0), auf: ['OGL', 'UGL'] },
    { gruppe: 'Schnee', richtung: 'Z',
      wert: -(m.schneeAktiv ? (m.char?.sk ?? 0) : 0), auf: ['OGL', 'OGR'] },
  ];
  verteilt.forEach((v) => {
    if (!v.wert) return;
    const anteil = v.wert / v.auf.length;
    bau.staebe.filter((stab) => v.auf.some((g) => stab.name.startsWith(`${g}_S`)))
      .forEach((stab, i) => {
        strecke.push({ name: `Q_${v.gruppe}_${i}`, stab: stab.name,
                       richtung: v.richtung, wert: r6(anteil),
                       lastfall: v.gruppe });
      });
  });

  /*
   * DER WIND AUF DEN MAST IST KEINE OPTION (Weisung).
   *
   * Steht der Mast im Modell, ist er ein Teil des Tragwerks und wird belastet
   * wie das Joch - in BEIDEN Richtungen, jede in ihrem Lastfall. Fehlte die
   * Last, wäre der Mast ein Bauteil, das nur hält und nie drückt, und das
   * Modell sähe vollständig aus, während es die halbe Einwirkung nicht kennt.
   *
   * Es gibt nichts zu belasten, solange kein Mast im Modell steht: die
   * anderen Auflagermodelle enden am Lager. Dort trägt der Ersatzbalken die
   * Wirkung weiterhin als aufgezwungene Auflagerverdrehung - wenn sie
   * eingeschaltet ist.
   */
  const mastStaebe = bau.staebe.filter((st) => /^MAST_[AB]_/.test(st.name));
  if (mastStaebe.length && m.mastLast) {
    mastStaebe.forEach((st) => {
      const ende = st.name[5];                       // MAST_A_... / MAST_B_...
      const w = m.mastLast[ende];
      if (!w) return;
      [['WindX', 'X', w.x], ['WindY', 'Y', w.y]].forEach(([gruppe, richtung, wert]) => {
        if (!(wert > 0)) return;
        strecke.push({ name: `Q_${gruppe}_${st.name}`, stab: st.name,
                       richtung, wert: r6(wert), lastfall: gruppe });
      });
    });
  }

  // Anbauteile: Kraft und Moment am wirklichen Angriffspunkt.
  bau.arme.forEach((arm, k) => {
    EINWIRKUNGEN.forEach((e) => {
      // Alle Lastblöcke desselben Anschlusspunktes wirken am selben Knoten
      // und werden je Gruppe aufsummiert.
      const kr = (arm.teil.teile ?? [arm.teil]).reduce((sum, t) => {
        const q = t.kraefte?.[e.key];
        if (!q) return sum;
        return { Fx: sum.Fx + (q.Fx ?? 0), Fy: sum.Fy + (q.Fy ?? 0),
                 Fz: sum.Fz + (q.Fz ?? 0), Mxx: sum.Mxx + (q.Mxx ?? 0),
                 Myy: sum.Myy + (q.Myy ?? 0), Mzz: sum.Mzz + (q.Mzz ?? 0) };
      }, { Fx: 0, Fy: 0, Fz: 0, Mxx: 0, Myy: 0, Mzz: 0 });
      const paare = [
        ['X', kr.Fx ?? 0], ['Y', kr.Fy ?? 0], ['Z', -(kr.Fz ?? 0)],
      ];
      paare.forEach(([richtung, wert]) => {
        if (!wert) return;
        // Unter G wird getrennt: was in der JOCHACHSE zieht, ist die
        // Ablenkkraft aus dem Kurvenzug (Z·c/R an den Drahtwerken) - sie
        // ist die einzige ständige Last in dieser Richtung. Alles übrige
        // ist das Gewicht des Anbauteils.
        const fall = (!gTrennen || e.key !== 'G') ? e.key
                   : richtung === 'X' ? G_ABLENK : G_ANBAU;
        punkt.push({ name: `F${k}_${fall}_${richtung}`, knoten: arm.knoten,
                     richtung, wert: r6(wert), lastfall: fall });
      });
      const mom = [['Mx', kr.Mxx ?? 0], ['My', kr.Myy ?? 0], ['Mz', kr.Mzz ?? 0]];
      mom.forEach(([richtung, wert]) => {
        if (!wert) return;
        const fallM = (gTrennen && e.key === 'G') ? G_ANBAU : e.key;
        moment.push({ name: `M${k}_${fallM}_${richtung}`, knoten: arm.knoten,
                      richtung, wert: r6(wert), lastfall: fallM });
      });
    });
  });

  return { punkt, moment, strecke };
}

// ---------------------------------------------------------------------------
// SAF-Blätter
// ---------------------------------------------------------------------------

const kopf = (namen) => namen.map((n) => ({ v: n, s: STIL.KOPF }));

/**
 * Auflagerbedingungen aus Endbedingung und Drehfeder.
 *
 * EINHEIT DER DREHFEDER. Der Rechenkern führt sie in kNm/rad. Das SAF-Blatt
 * will MNm/rad, die COM-Schnittstelle kNm/rad. Diese Funktion gibt deshalb
 * BEIDE Werte aus und benennt sie - vorher stand hier nur der SAF-Wert unter
 * dem Namen `cFiy`, und das JSON für die COM-Brücke wies ihn als kNm/rad aus.
 * Wer danach gebaut hätte, bekäme eine tausendmal zu weiche Feder.
 */
export function stuetzung(m, lager) {
  const ende = lager.ende ?? lager;
  /*
   * DIE GEOMETRISCHE FEDER, NICHT DIE BEGRENZTE (Weisung).
   *
   * Die Anwendung setzt die Feder je Lastfall herab, bis die Gurtverbindung
   * ihre Grenzlast einhält - am nachgemessenen Beispiel zwischen 1901 und
   * 12951 kNm/rad. Damit wäre das Stabmodell lastfallabhängig, obwohl es nur
   * eines gibt. Ausgeleitet wird deshalb die Steifigkeit des BAUWERKS: E·I/H
   * mal Rahmenfaktor. Was die Schrauben davon tragen, ist ein eigener
   * Nachweis (core.checks.js, Prüfung A1).
   */
  const c = ende === 'A' ? (m.federn.roh?.cA ?? m.federn.cA)
                         : (m.federn.roh?.cB ?? m.federn.cB);
  const starr = c >= 1e11;
  const weich = c > 0 && !starr;

  /*
   * DIE DREHFEDER ALS GURTFEDER.
   *
   * Wo das Ende an vier Gurten hängt, gibt es keinen Punkt für eine
   * Drehfeder. Das Stützmoment tritt dort als Kräftepaar zwischen Ober- und
   * Untergurt ein - und eine Endverdrehung theta hebt den Obergurt um
   * theta*h. Mit je einer Feder k an den beiden Obergurtknoten:
   *
   *      M = 2 * k * h^2 * theta  =!=  c_phi * theta   ->   k = c_phi/(2h^2)
   *
   * Ohne Jochhöhe (ein Lager ohne h, etwa aus einem alten Aufruf) bleibt es
   * beim Gelenk - lieber sichtbar weich als still falsch steif.
   */
  const h = lager.h ?? 0;
  const kUz = weich && h > 0 ? c / (2 * h * h) : null;

  // Die Freiheitsgrade legt das Auflagermodell fest (stabmodell); hier wird
  // nur noch 'Feder' aufgelöst. Ohne Modellangabe - etwa aus dem SAF-Blatt,
  // das nur den Ersatzbalken kennt - gilt die alte Gabellagerung.
  const roh = lager.ux ? lager : {
    ux: ende === 'A' ? 'Rigid' : 'Free',
    uy: 'Rigid', uz: 'Rigid', fix: 'Rigid',
    fiy: c > 0 ? 'Feder' : 'Free', fiz: 'Free', feder: 'cFiy',
  };
  const fiy = roh.fiy !== 'Feder' ? roh.fiy
            : (c > 0 ? (starr ? 'Rigid' : 'Flexible') : 'Free');
  const hatFeder = roh.fiy === 'Feder' && weich;

  // Der Obergurt: frei bei c = 0, starr bei voller Einspannung, sonst Feder.
  const uz = roh.uz !== 'FederZ' ? roh.uz
           : starr ? 'Rigid'
           : kUz !== null ? 'Flexible' : 'Free';
  const hatGurtfeder = roh.uz === 'FederZ' && uz === 'Flexible';

  return {
    ux: roh.ux, uy: roh.uy, uz,
    fix: roh.fix, fiy, fiz: roh.fiz,
    cFiy_MNm: hatFeder ? r6(c / 1000) : null,   // für SAF
    cFiy_kNm: hatFeder ? r6(c) : null,          // für COM
    cUz_MN: hatGurtfeder ? r6(kUz / 1000) : null,
    cUz_kNm: hatGurtfeder ? r6(kUz) : null,
  };
}

/**
 * Baut alle Blätter der SAF-Mappe.
 *
 * @param {object} m   Modell aus core.vierendeel.modell()
 * @param {object} opt {knotenmodell}
 * @returns {{name:string, rows:Array, breiten?:number[]}[]}
 */
export function safBlaetter(m, opt = {}) {
  const bau = stabmodell(m, opt);
  const l = lasten(m, bau);
  const stahl = m.stahl.name;

  const material = [
    kopf(['Name', 'Type', 'Quality', 'Unit mass [kg/m3]', 'E modulus [MPa]',
          'G modulus [MPa]', 'Poisson Coefficient', 'Thermal expansion [1/K]']),
    [stahl, 'Steel', stahl, 7850, 210000, 81000, 0.3, 0.000012],
  ];

  const querschnitte = [
    kopf(['Name', 'Material', 'Cross-section type', 'Shape', 'Parameters [mm]',
          'A [m2]', 'Iy [m4]', 'Iz [m4]', 'It [m4]']),
    ...[...bau.querschnitte.values()].map((q) => [
      q.name, stahl, q.art, q.form, q.parameter.join('; '),
      q.A ?? null, q.Iy ?? null, q.Iz ?? null, q.It ?? null,
    ]),
  ];

  const knoten = [
    kopf(['Name', 'Coordinate X [m]', 'Coordinate Y [m]', 'Coordinate Z [m]']),
    ...[...bau.knoten.values()].map((k) => [k.name, k.x, k.y, k.z]),
  ];

  // Lokales Achsenkreuz je Stab. Es entscheidet, wie herum ein Rechteck steht:
  // die Blechbreite muss in der Jochachse liegen, die Dicke quer dazu. Der
  // Richtungsvektor darf nicht parallel zum Stab sein - deshalb für Stäbe in
  // Jochachse die Lotrechte, für alle übrigen die Jochachse.
  const lcsVektor = (stab) => {
    const a = bau.knoten.get(stab.von), b = bau.knoten.get(stab.bis);
    const laengs = Math.abs(b.x - a.x) >= Math.max(Math.abs(b.y - a.y),
                                                   Math.abs(b.z - a.z));
    return laengs ? [0, 0, 1] : [1, 0, 0];
  };

  const staebe = [
    kopf(['Name', 'Type', 'Cross section', 'Nodes', 'Segments', 'LCS',
          'LCS Rotation [deg]', 'Coordinate X [m]', 'Coordinate Y [m]',
          'Coordinate Z [m]', 'System line', 'Behaviour in analysis']),
    ...bau.staebe.map((s) => {
      const v = lcsVektor(s);
      return [s.name, 'General', s.qs, `${s.von}; ${s.bis}`, 'Line',
              'z by vector', 0, v[0], v[1], v[2], 'Centre', 'Standard'];
    }),
  ];

  /*
   * HIER STAND `stuetzung(m, a.ende)` - also nur der BUCHSTABE des Endes.
   * Damit war `lager.ux` undefiniert, und jedes Lager fiel in die
   * Ersatz-Gabellagerung: volle Haltung in allen Richtungen plus Drehfeder.
   * Bei vier Gurtknoten je Ende wurde daraus ein VIERFACH eingespanntes
   * Jochende - das ausgeleitete SAF-Modell hatte mit dem gewählten
   * Auflagermodell nichts mehr zu tun.
   */
  const lager = [
    kopf(['Name', 'Type', 'Boundary condition', 'Node', 'ux', 'uy', 'uz',
          'fix', 'fiy', 'fiz', 'Stiffness Fiy [MNm/rad]',
          'Stiffness uz [MN/m]']),
    ...bau.auflager.map((a, i) => {
      const b = stuetzung(m, a);
      return [`AUFLAGER_${a.ende}${bau.auflager.filter((z) => z.ende === a.ende).length > 1
                ? `_${i + 1}` : ''}`,
              'Standard', 'In node', a.knoten,
              b.ux, b.uy, b.uz, b.fix, b.fiy, b.fiz, b.cFiy_MNm, b.cUz_MN];
    }),
  ];

  const gruppen = [
    kopf(['Name', 'Load group type', 'Relation', 'Load type']),
    ['LG_G', 'Permanent', 'Standard', null],
    ['LG_WX', 'Variable', 'Exclusive', 'Wind'],
    ['LG_WY', 'Variable', 'Exclusive', 'Wind'],
    ['LG_S', 'Variable', 'Standard', 'Snow'],
  ];

  const lastfaelle = [
    kopf(['Name', 'Description', 'Action type', 'Load group', 'Load type',
          'Duration']),
    // 'Others' und NICHT 'Self weight': das Eigengewicht steht schon als
    // Streckenlast in diesem Lastfall. Als Eigengewicht deklariert, würde
    // AxisVM es ein zweites Mal erzeugen.
    ['G', 'Ständig: Eigengewicht, Anbauteile, Umlenkkraft', 'Permanent',
     'LG_G', 'Others', null],
    ['WindX', 'Wind in Jochachse', 'Variable', 'LG_WX', 'Wind', 'Short'],
    ['WindY', 'Wind in Gleisrichtung', 'Variable', 'LG_WY', 'Wind', 'Short'],
    ['Schnee', 'Schnee', 'Variable', 'LG_S', 'Snow', 'Short'],
  ];

  const streckenlasten = [
    kopf(['Name', 'Force action', 'Distribution', 'Direction', 'Value 1 [kN/m]',
          'Member', 'Load case', 'Coordinate system', 'Location',
          'Coordinate definition', 'Origin', 'Extent']),
    ...l.strecke.map((q) => [q.name, 'On beam', 'Uniform', q.richtung, q.wert,
                             q.stab, q.lastfall, 'Global', 'Length',
                             'Relative', 'From start', 'FullSpan']),
  ];

  const punktlasten = [
    kopf(['Name', 'Direction', 'Force action', 'Reference node', 'Value [kN]',
          'Load case', 'Coordinate system']),
    ...l.punkt.map((p) => [p.name, p.richtung, 'In node', p.knoten, p.wert,
                           p.lastfall, 'Global']),
  ];

  const punktmomente = [
    kopf(['Name', 'Type', 'Direction', 'Force action', 'Reference node',
          'Value [kNm]', 'Load case', 'Coordinate system']),
    ...l.moment.map((p) => [p.name, 'Standard', p.richtung, 'In node', p.knoten,
                            p.wert, p.lastfall, 'Global']),
  ];

  const blaetter = [
    { name: 'StructuralMaterial', rows: material },
    { name: 'StructuralCrossSection', rows: querschnitte, breiten: [22, 10, 16, 12, 22] },
    { name: 'StructuralPointConnection', rows: knoten, breiten: [18, 14, 14, 14] },
    { name: 'StructuralCurveMember', rows: staebe, breiten: [18, 10, 20, 34, 10, 14] },
    { name: 'StructuralPointSupport', rows: lager, breiten: [16, 12, 18, 12] },
    { name: 'StructuralLoadGroup', rows: gruppen },
    { name: 'StructuralLoadCase', rows: lastfaelle, breiten: [10, 40, 12, 12, 12, 10] },
  ];
  if (l.strecke.length) {
    blaetter.push({ name: 'StructuralCurveAction', rows: streckenlasten });
  }
  if (l.punkt.length) {
    blaetter.push({ name: 'StructuralPointAction', rows: punktlasten });
  }
  if (l.moment.length) {
    blaetter.push({ name: 'StructuralPointMoment', rows: punktmomente });
  }
  return { blaetter, bau, lasten: l };
}

// ---------------------------------------------------------------------------
// Vergleichsblatt
// ---------------------------------------------------------------------------

/**
 * Gegenüberstellung je Station und Einwirkungsgruppe.
 *
 * Links die Zahlen dieses Werkzeugs, rechts leere Spalten für die Werte aus
 * AxisVM. Beide charakteristisch und je Gruppe getrennt - eine Abweichung
 * lässt sich sonst keiner Ursache zuordnen.
 *
 * @param {object} m Modell (für Kopfangaben)
 * @param {object} proGruppe {G: knotenreihen, WindX: …} aus berechne()
 */
export function vergleichsblatt(m, proGruppe, opt = {}) {
  const rows = [];
  const zeile = (...z) => rows.push(z);

  zeile({ v: 'Vergleich Werkzeug ↔ AxisVM', s: STIL.TITEL });
  zeile();
  zeile('Joch', m.typ, 'Länge [m]', m.L, 'Knotenmodell',
        opt.knotenmodell ?? 'anschnitt');
  zeile('Achsen', 'X = Jochachse, Y = Gleisrichtung, Z = nach oben');
  zeile('Werte', 'charakteristisch, je Einwirkungsgruppe getrennt');
  zeile();
  zeile({ v: 'Die AxisVM-Spalten sind von Hand zu füllen: Stabschnittgrössen '
             + 'am Knoten, je Lastfall.', s: STIL.NOTIZ });
  zeile();

  EINWIRKUNGEN.forEach((e) => {
    const reihen = proGruppe?.[e.key];
    if (!reihen?.length) return;
    zeile({ v: `Einwirkung ${e.label}`, s: STIL.FETT });
    zeile(...kopf(['Station', 'x [m]',
                   'M_y [kNm]', 'V_z [kN]', 'M_z [kNm]', 'V_y [kN]', 'T_x [kNm]',
                   'M_y AxisVM', 'V_z AxisVM', 'M_z AxisVM', 'V_y AxisVM',
                   'T_x AxisVM']));
    reihen.forEach((k) => {
      zeile(k.i, r6(k.x),
            { v: r6(k.My), s: STIL.N2 }, { v: r6(k.Vz), s: STIL.N2 },
            { v: r6(k.Mz), s: STIL.N2 }, { v: r6(k.Vy), s: STIL.N2 },
            { v: r6(k.Tx), s: STIL.N2 },
            { v: null, s: STIL.EINGABE }, { v: null, s: STIL.EINGABE },
            { v: null, s: STIL.EINGABE }, { v: null, s: STIL.EINGABE },
            { v: null, s: STIL.EINGABE });
    });
    zeile();
  });

  return { name: 'Vergleich', rows,
           breiten: [10, 10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12] };
}

/** Anleitungsblatt: was die Mappe ist und was beim Import zu prüfen bleibt. */
export function anleitungsblatt(m, opt = {}) {
  const km = opt.knotenmodell ?? 'anschnitt';
  const rows = [];
  const t = (v) => rows.push([{ v, s: STIL.TITEL }]);
  const p = (...z) => rows.push(z);
  const n = (v) => rows.push([{ v, s: STIL.NOTIZ }]);

  t('AxisVM-Export (SAF)');
  p();
  p('Joch', m.typ, 'Länge [m]', m.L);
  p('Knotenmodell', KNOTENMODELLE.find((k) => k.key === km)?.label ?? km);
  p('Achsen', 'X = Jochachse (0 … L), Y = Gleisrichtung, Z = lotrecht nach oben');
  p();

  t('Einlesen');
  p('1', 'AxisVM: Datei / Importieren / SAF, diese Mappe wählen.');
  p('2', 'Die Lastfälle G, WindX, WindY, Schnee sind CHARAKTERISTISCH und');
  p('', 'einzeln. Kombinationen in AxisVM anlegen, Wind je mit + und −.');
  p('3', 'Rechnen, dann Stabschnittgrössen je Lastfall in das Blatt');
  p('', '«Vergleich» eintragen oder als Tabelle exportieren.');
  p();

  t('Was beim Import zu prüfen ist');
  n('Ausrundungsradien der Winkel sind mit 0 angesetzt, die Profiltabellen '
    + 'dieses Werkzeugs führen sie nicht. Die Fläche fällt dadurch rund 2 % '
    + 'kleiner aus. Für einen genauen Vergleich die Gurte in AxisVM durch die '
    + 'Bibliotheksprofile ersetzen.');
  n('Die Stäbe «STARR» und «ARM» sind Rechtecke 500 bzw. 300 mm, steife '
    + 'Ersatzstäbe, keine echten Starrelemente. Ihr Eigengewicht ist in AxisVM '
    + 'abzuschalten, sonst rechnet es mit.');
  n('Die Drehrichtung der Blechquerschnitte (Breite quer zur Jochachse) ist am '
    + 'Modell zu kontrollieren; SAF legt die lokale Achse nicht eindeutig fest.');
  n('Das Eigengewicht des Jochs steckt als Streckenlast in G und ist NICHT '
    + 'zusätzlich als Eigengewicht anzusetzen.');
  p();

  t('Zum Knotenmodell');
  p('', 'Dieses Werkzeug weist Gurt und Blech am ANSCHNITT nach, am Rand des');
  p('', 'steifen, verschweissten Knotenbereichs. Rechnet AxisVM dagegen auf');
  p('', 'den Schwerachsen, kommen systematisch grössere Momente heraus.');
  p('', 'Beide Modelle sind exportierbar; für den Vergleich beide rechnen —');
  p('', 'erst ihre Differenz trennt Knotenmodell und Rechenweg.');

  return { name: 'Anleitung', rows, breiten: [14, 30, 16, 12, 16, 40] };
}

// ---------------------------------------------------------------------------
// Vollständige Mappe
// ---------------------------------------------------------------------------

/**
 * Baut die vollständige SAF-Mappe samt Anleitung und Vergleichsblatt.
 *
 * Für das Vergleichsblatt wird je Einwirkungsgruppe EINMAL gerechnet - mit
 * Beiwert 1 für die betrachtete Gruppe und 0 für alle übrigen. Das liefert
 * charakteristische Schnittgrössen je Gruppe, genau das, was AxisVM je
 * Lastfall ausgibt.
 *
 * @param {object} inp  Eingabestand
 * @param {object} deps {berechne, modell, profOG, profUG, stahl, joch}
 * @param {object} opt  {knotenmodell}
 */
export function axisvmMappe(inp, deps, opt = {}) {
  const { berechne, modell, profOG, profUG, stahl, joch } = deps;
  const km = opt.knotenmodell ?? 'anschnitt';

  const proGruppe = {};
  EINWIRKUNGEN.forEach((e) => {
    const beiwerteFest = Object.fromEntries(
      EINWIRKUNGEN.map((x) => [x.key, x.key === e.key ? 1 : 0]));
    const r = berechne({ ...inp, beiwerteFest }, profOG, profUG, stahl, joch);
    // Eine Gruppe ohne jede Last liefert lauter Nullen - die Spalte wäre nur
    // Ballast im Blatt und bleibt deshalb weg.
    const leer = r.knoten.every((k) => !k.My && !k.Vz && !k.Mz && !k.Vy && !k.Tx);
    if (!leer) proGruppe[e.key] = r.knoten;
  });

  const m = modell({ ...inp, beiwerteFest: null }, profOG, profUG, stahl, joch);
  /*
   * ALLE Einstellungen weiterreichen, nicht nur zwei.
   *
   * Hier standen `knotenmodell` und `schottAusblenden`; `auflagerModell` und
   * `starrModell` fielen unterwegs weg. Der Dialog bot sie an, die
   * SAF-Ausleitung nahm dann doch die Vorgabe - und niemand sah es der Datei
   * an, weil die Knotennamen aus demselben Aufbau stammen.
   */
  const { blaetter, bau } = safBlaetter(m, { ...opt, knotenmodell: km });

  return {
    // Das Modell wandert mit: der Dateiname nennt das Auflagermodell, und
    // dessen Vorgabe haengt an der Bauweise (siehe auflagerVorgabe).
    modell: m,
    blaetter: [anleitungsblatt(m, { knotenmodell: km }), ...blaetter,
               vergleichsblatt(m, proGruppe, { knotenmodell: km })],
    kennzahlen: {
      knoten: bau.knoten.size, staebe: bau.staebe.length,
      querschnitte: bau.querschnitte.size,
      gruppen: Object.keys(proGruppe),
    },
  };
}

/**
 * Baut die Mappe und lädt sie herunter. Gegenstück zu exportiere() im
 * Berichtsmodul: die DOM-Schicht soll den XLSX-Schreiber nicht kennen.
 */
export function exportiereAxisvm(inp, deps, opt = {}) {
  const { blaetter, kennzahlen, modell: m } = axisvmMappe(inp, deps, opt);
  const name = dateiname(inp, opt, m, 'xlsx');
  herunterladen(arbeitsmappe(blaetter), name);
  return { name, kennzahlen };
}

// ---------------------------------------------------------------------------
// JSON: Vorlage für die COM-Brücke
// ---------------------------------------------------------------------------

/**
 * DAS STABMODELL ALS JSON.
 *
 * WOZU NOCH EIN FORMAT
 * SAF geht durch ein kostenpflichtiges Modul, DXF trägt nur Geometrie. Der
 * dritte Weg ist die COM-Schnittstelle von AxisVM: ein Skript auf dem
 * Windows-Rechner baut das Modell Zeile für Zeile auf. Dieses Skript braucht
 * die Zahlen in einer Form, die es ohne Tabellenkalkulation lesen kann - also
 * JSON.
 *
 * EIN BROWSER KANN COM NICHT SELBST BEDIENEN. Eine Seite hat keinen Zugriff
 * darauf, und daran lässt sich nichts drehen. Deshalb die Teilung: hier die
 * Zahlen, dort das Skript.
 *
 * INHALT
 * Dasselbe Stabmodell wie SAF und DXF - eine Quelle, drei Verpackungen:
 *   material      eine Stahlgüte
 *   querschnitte  Winkel, Bleche, steife Stäbe (Parameter in mm)
 *   knoten        Name und Koordinaten [m]
 *   staebe        von/bis, Querschnitt, lokale z-Richtung
 *   auflager      Gabellagerung mit Drehfeder [kNm/rad]
 *   lastfaelle    eine je Einwirkungsgruppe
 *   lasten        Punkt-, Moment- und Streckenlasten
 *
 * ACHSEN wie im Werkzeug: x Jochachse, y Gleisrichtung, z lotrecht nach oben.
 * KRÄFTE in kN, Momente in kNm, Längen in m (Querschnittsparameter in mm).
 */
/**
 * Wie ein steifer Stummel in AxisVM zu bauen ist.
 *
 * Vorgabe des Auftraggebers: die Starrelemente sind in AxisVM auch als
 * solche zu modellieren, nicht als dicke Stäbe mit steifem Ersatzquerschnitt.
 * AxisVM kennt dafür zwei Bauteile, und die Wahl zwischen ihnen entscheidet
 * das Gelenk:
 *
 *   ohne Gelenk    Starrkörper (`RigidBodies`) - hält alle sechs
 *                  Freiheitsgrade seiner Knoten, kennt keine Freigabe
 *   mit Gelenk     Linkelement (`LinkElements.AddNN`) - dort lässt sich die
 *                  Kraftübertragung je Richtung einstellen; genau das
 *                  braucht der Ast zur zweiten Reihe, der längs frei ist
 *
 * `starrModell: 'staebe'` schaltet auf die frühere Bauweise zurück - dicke
 * Stäbe mit Ersatzquerschnitt und gewöhnlichen Stabendgelenken.
 *
 * NICHT jeder steife Stab wird ein Starrkörper. Entschieden ist (Weisung):
 *
 *   `verbindung`     Stummel von der Gurtachse zur Blechachse, Anschluss
 *                    eines Anbauteils          -> Starrkörper bzw. Link
 *   `blechende`      der steife Teil des Blechs im Knotenbereich  -> ebenso
 *   `gurtabschnitt`  der steife Teil des GURTES im Knotenbereich  -> bleibt
 *                    Stab. Er trägt Streckenlasten - am Signaljoch 168 von
 *                    344 -, und ein Starrkörper kann keine tragen.
 *
 * OFFEN, auf Wunsch später: auch die Gurtabschnitte als Starrkörper, mit
 * Umlegung ihrer Streckenlasten auf die Nachbarstäbe oder in Knotenlasten.
 * Die Umlegung wäre selbst eine Modellannahme und ist deshalb nicht gebaut.
 *
 * @returns {object} Zusatzfelder für den Stab im JSON
 */
const STARR_ALS_KOERPER = ['verbindung', 'blechende'];

/**
 * Der steife Gurtabschnitt trägt den QUERSCHNITT SEINES GURTES.
 *
 * Vorgabe des Auftraggebers: die steifen Abschnitte der Ober- und Untergurte
 * sind mit den gleichen Querschnitten zu führen und die Steifigkeit im
 * Hintergrund hochzudrehen. Dann stimmen Eigengewicht und Darstellung - ein
 * Ersatzrechteck von 500 × 500 mm wöge das Fünfzigfache und stünde als Klotz
 * in der Ansicht.
 *
 * Hochgedreht wird über ein eigenes MATERIAL mit vielfachem E-Modul und
 * unveränderter Dichte: die Masse bleibt damit die des wirklichen Winkels,
 * die Steifigkeit wird beliebig gross. Angelegt wird es in der COM-Brücke.
 *
 * Nur für die AxisVM-Ausleitung. `stabmodell()` behält den steifen
 * Ersatzquerschnitt - PyNite und SAF rechnen unverändert weiter.
 */
const STEIF_FAKTOR = 1000;

function gurtSteif(s, starrModell) {
  if (s.starrRolle !== 'gurtabschnitt' || starrModell === 'staebe') {
    return { querschnitt: s.qs };
  }
  const gurt = s.name.startsWith('OG') ? 'OG' : 'UG';
  return { querschnitt: `GURT_${gurt}`, steifesMaterial: true };
}

function starrArt(s, starrModell) {
  if (starrModell === 'staebe') return { art: 'stab' };
  // Das Anbauteil ist ein Starrkörper, gleich welchen Ersatzquerschnitt es
  // trägt. Nur mit Gelenk bleibt es ein Stab.
  if (s.starrRolle === 'anbauteil') {
    return (s.gelenkAnfang || s.gelenkEnde) ? { art: 'stab' } : { art: 'starr' };
  }
  if (s.qs !== STARR.name) return { art: 'stab' };
  // Der Übergang Gurt -> Anbauteil ist immer ein Link: er trägt seine
  // Kraftübertragung schon fertig bei sich.
  if (s.starrRolle === 'uebergang') {
    return { art: 'link', kraftuebertragung: s.kraft };
  }
  if (!STARR_ALS_KOERPER.includes(s.starrRolle)) return { art: 'stab' };

  const g = s.gelenkAnfang ?? s.gelenkEnde ?? null;
  if (!g) return { art: 'starr' };

  // Gehalten ist alles ausser dem, was das Gelenk freigibt. 'axial' löst die
  // Längskraft, 'M' die drei Momente.
  const frei = g === 'axial' ? ['x'] : g === 'M' ? ['xx', 'yy', 'zz'] : [];
  const k = {};
  ['x', 'y', 'z', 'xx', 'yy', 'zz'].forEach((f) => {
    k[f] = frei.includes(f) ? 'Free' : 'Rigid';
  });
  return { art: 'link', kraftuebertragung: k };
}

export function stabmodellJson(m, opt = {}) {
  const bau = stabmodell(m, opt);
  const l = lasten(m, bau, { gTrennen: true });
  const stahl = m.stahl.name;
  const starrModell = opt.starrModell ?? 'koerper';
  // Für die Drehlage der Gurtwinkel, siehe lcs(). Dieselben Werte wie in
  // stabmodell(), dort aber ausserhalb der Reichweite dieser Funktion.
  const ausrOG = getAusrichtung(m.ausrOG ?? 'LA_SI');
  const ausrUG = getAusrichtung(m.ausrUG ?? 'LA_SI');
  const eckeVon = (id) => ECKEN.find((e) => e.id === id);

  // Lokale z-Richtung je Stab: dieselbe Regel wie im SAF-Blatt. Sie entscheidet,
  // wie herum ein Blechrechteck steht - die Breite muss in die Jochachse.
  const lcs = (stab) => {
    // Wer seine Drehlage selbst mitbringt, behaelt sie - der Mast tut das,
    // seine Stegrichtung steht in der Eingabe und nicht in dieser Regel.
    if (stab.lcsZ) return stab.lcsZ;
    const a = bau.knoten.get(stab.von), b = bau.knoten.get(stab.bis);
    const laengs = Math.abs(b.x - a.x) >= Math.max(Math.abs(b.y - a.y),
                                                   Math.abs(b.z - a.z));
    const z = laengs ? [0, 0, 1] : [1, 0, 0];

    // DIE VIER WINKEL STEHEN SPIEGELBILDLICH (Schnitt A-A des Sortiments).
    // Liegender Schenkel nach aussen, stehender nach innen - in jeder Ecke
    // also anders herum. Ein L-Profil lässt sich in AxisVM nicht spiegeln,
    // aber beim gleichschenkligen Winkel ist das Spiegelbild eine Drehung
    // um 90° um die Stabachse, und die steuert die Referenzrichtung.
    //
    // Ausgangslage ist die, die AxisVM einem AddL ohne Zutun gibt: Ferse
    // unten, Schenkel nach +y und +z. Von dort gedreht:
    //
    //   Schenkel (+y,+z)   0°    z bleibt [0, 0, 1]
    //   Schenkel (−y,+z)  90°    z nach   [0,−1, 0]
    //   Schenkel (−y,−z) 180°    z nach   [0, 0,−1]
    //   Schenkel (+y,−z) 270°    z nach   [0, 1, 0]
    //
    // Wohin die Schenkel einer Ecke zeigen, sagt die Einbaulage: der
    // liegende nach `ecke.sy · lg`, der stehende nach `ecke.sz · st`.
    // Auch der STEIFE Abschnitt im Knoten gehört dazu: er trägt denselben
    // Winkel und muss gleich herum stehen. Sein Querschnitt heisst hier
    // noch STARR - ersetzt wird er erst in gurtSteif() -, deshalb zählt
    // die Rolle und nicht der Querschnittsname.
    const gurt = (stab.qs === 'GURT_OG' || stab.qs === 'GURT_UG'
                  || stab.starrRolle === 'gurtabschnitt')
                 ? (stab.name.startsWith('OG') ? 'OG' : 'UG') : null;
    if (gurt) {
      const seite = stab.name.startsWith(`${gurt}L`) ? 'L' : 'R';
      const ecke = eckeVon(`${gurt}_${seite}`);
      const ausr = gurt === 'OG' ? ausrOG : ausrUG;
      const dy = ecke.sy * ausr.lg;
      const dz = ecke.sz * ausr.st;
      if (dy > 0 && dz > 0) return [0, 0, 1];
      if (dy < 0 && dz > 0) return [0, -1, 0];
      if (dy < 0 && dz < 0) return [0, 0, -1];
      return [0, 1, 0];
    }
    if (!stab.qs.startsWith('BLECH')) return z;

    // DIE BLECHE STEHEN UM 90° GEDREHT (Weisung, am Modell gesehen).
    // Gedreht wird um die LOKALE x-Achse, also um die Stabachse selbst: die
    // neue z-Richtung ist das Kreuzprodukt aus Stabrichtung und bisheriger
    // z-Richtung. Für ein stehendes Blech wandert z damit von der Jochachse
    // in die Gleisrichtung, für ein liegendes von der Jochachse in die
    // Lotrechte.
    const d = [b.x - a.x, b.y - a.y, b.z - a.z];
    const n = Math.hypot(...d) || 1;
    const e = d.map((v) => v / n);
    const kreuz = [e[1] * z[2] - e[2] * z[1],
                   e[2] * z[0] - e[0] * z[2],
                   e[0] * z[1] - e[1] * z[0]];
    // Auf die Achsenrichtung runden: die Stäbe laufen achsparallel, und ein
    // Rest von 1e-16 im Vektor macht die Ausleitung nur unleserlich.
    return kreuz.map((v) => (Math.abs(v) < 1e-9 ? 0 : Math.sign(v)));
  };

  return {
    format: 'tragjoch-stabmodell',
    version: 1,
    /*
     * WAS DIESE DATEI KANN.
     *
     * Die Formatnummer sagt, wie die Datei GELESEN wird - sie sagt nicht,
     * was drinsteht. Ein Modell aus einer alten Fassung des Werkzeugs liest
     * sich tadellos und baut sich klaglos auf; dass die Anbauteile darin
     * einzeln am Joch hangen statt in einer Kette, sieht man erst im
     * fertigen Modell. Genau das ist einmal passiert.
     *
     * Deshalb tragt die Datei ihre Merkmale bei sich, und die Brucke sagt
     * laut, wenn eines fehlt, das sie erwartet. Ein neuer Eintrag kommt
     * hinzu, sobald sich am AUFBAU etwas andert, das man der Datei sonst
     * nicht ansieht.
     */
    merkmale: MERKMALE,
    erzeugt: new Date().toISOString().slice(0, 19),
    einheiten: { laenge: 'm', parameter: 'mm', kraft: 'kN', moment: 'kNm',
                 drehfeder: 'kNm/rad', flaeche: 'm2', traegheit: 'm4' },
    achsen: 'x Jochachse, y Gleisrichtung, z lotrecht nach oben',
    tragwerk: {
      typ: m.typ ?? 'frei', L: r6(m.L), h: r6(m.h), b: r6(m.b),
      knotenmodell: bau.knotenmodell,
      auflagermodell: bau.auflager[0]?.modell ?? null,
      // Welche Drehfeder das Modell trägt. Die Anwendung kennt zwei: die
      // geometrische des Mastes und die je Lastfall auf die Schraubengrenze
      // herabgesetzte. Ausgeleitet wird die geometrische - der Gurtanschluss
      // ist ein eigener Nachweis (Prüfung A1). Steht hier, damit die Datei es
      // selbst sagt und nicht nachgeschlagen werden muss.
      federArt: 'geometrisch',
      federGeometrisch_kNm: r6(m.federn.roh?.cA ?? m.federn.cA),
      federBegrenzt_kNm: m.federn.grenze ? r6(m.federn.cA) : null,
      bauweise: m.bauweise ?? 'neu',
      // Schnitte, die zusammengelegt wurden, damit im Gurt keine
      // Millimeterstücke entstehen. Nachvollziehbar statt stillschweigend.
      verschoben: (bau.verschoben ?? []).map((v) => ({
        von: r6(v.von), nach: r6(v.nach), betrag_mm: r6(v.betrag * 1000),
      })),
      // Anbauteile, die aus einem steifen Knotenbereich herausgeschoben
      // wurden - sie stehen jetzt 10 cm neben dem starren Gurt.
      ausKnoten: (bau.ausKnotenVermerk ?? []).map((v) => ({
        von: r6(v.von), nach: r6(v.nach), betrag_mm: r6(v.betrag * 1000),
      })),
      // Anbauteile an zwei Punkten: dort hält das Link zusätzlich das
      // Moment um y - siehe `zweiPunktAnschluss` in stabmodell().
      zweiPunktAnschluss: (bau.zweiPunktAnschluss ?? []).map((v) => ({
        name: v.name, x: r6(v.x), ebene: v.ebene,
      })),
      /*
       * NICHT GEBAUTE BAUGRUPPEN AM MASTEN.
       *
       * Eine Anbauhöhe ausserhalb des Mastes ist ein Teil in der Luft. Es
       * wird nicht gebaut - und das steht hier, statt still zu fehlen. Die
       * Brücke liest es und sagt es im Bericht.
       */
      anbauMastAus: (bau.anbauMastAus ?? []).map((v) => ({
        name: v.name, ende: v.ende, hMast: r6(v.hMast), mastH: r6(v.H),
      })),
      // WO DAS TRAGWERK STEHT. Eigene Felder, damit sie maschinell lesbar
      // bleiben, und zusaetzlich in der Bezeichnung - die traegt der Bericht
      // der Bruecke als Kopfzeile, und dort will man sie lesen koennen.
      linie: m.linie ?? '', km: m.km ?? '', ortschaft: m.ortschaft ?? '',
      bezeichnung: [`Tragjoch ${m.typ ?? 'frei'} L=${Number(m.L).toFixed(2)} m`,
                    verortung(m)].filter(Boolean).join(' — '),
    },
    material: { name: stahl, art: 'Steel', rho: 7850, E: 210000, G: 81000,
                nu: 0.3, alpha: 0.000012, fy: m.stahl.fy ?? null },
    // Für die steifen Gurtabschnitte: gleicher Stahl, gleiche Dichte, nur
    // der E-Modul vervielfacht. Die Brücke legt es an, sobald ein Stab
    // `steifesMaterial` trägt.
    materialSteif: { name: `${stahl} steif`, faktor: STEIF_FAKTOR },
    querschnitte: [...bau.querschnitte.values()].map((q) => ({
      name: q.name, form: q.form, parameter: q.parameter,
      profil: q.profil ?? null,
      // Der Katalogname des Normprofils - die Bruecke versucht ihn vor dem
      // parametrischen Weg. Fehlt er, bleibt es beim parametrischen.
      katalog: q.katalog ?? null,
      radienQuelle: q.radienQuelle ?? null,
      A: q.A ?? null, Iy: q.Iy ?? null, Iz: q.Iz ?? null, It: q.It ?? null,
    })),
    knoten: [...bau.knoten.values()],
    staebe: bau.staebe.map((s) => ({
      name: s.name, von: s.von, bis: s.bis, ...gurtSteif(s, starrModell),
      lcsZ: lcs(s),
      // 'M': alle drei Momente frei - die Hängestütze hängt, sie klemmt nicht.
      gelenkAnfang: s.gelenkAnfang ?? null,
      gelenkEnde: s.gelenkEnde ?? null,
      ...starrArt(s, starrModell),
    })),
    // Ein Eintrag JE GEHALTENEM KNOTEN. Bei 'punkt' ist das einer je Ende,
    // bei 'mitte' zwei, bei 'gurte' vier - die Brücke läuft unverändert
    // darüber, sie sieht nur mehr Zeilen.
    auflager: bau.auflager.map((a) => ({
      ende: a.ende, knoten: a.knoten, x: a.x, modell: a.modell,
      ...stuetzung(m, a),
    })),
    lastfaelle: [
      ...G_TEILE.map((g) => ({ key: g.key, label: g.label, art: 'Others' })),
      ...EINWIRKUNGEN.filter((e) => e.key !== 'G')
        .map((e) => ({ key: e.key, label: e.label, art: 'Others' })),
    ],
    /*
     * DIE KOMBINATIONEN DER ANWENDUNG, damit AxisVM dieselben rechnet.
     *
     * Ein Lastfall der Anwendung ist ein Satz Beiwerte über den vier
     * Einwirkungsgruppen - genau die Form, die `LoadCombinations.Add` als
     * Faktorenliste erwartet. Gruppen mit Beiwert null bleiben draussen;
     * ein Faktor 0 wäre für AxisVM eine Zeile ohne Wirkung.
     *
     * `nachweis: false` trägt die Gebrauchstauglichkeit: sie liefert
     * Schnittgrössen für Verformungen, führt aber keinen Nachweis. Die
     * Unterscheidung wandert als Art mit, damit sie in AxisVM als SLS statt
     * ULS ankommt.
     */
    kombinationen: (opt.eingabe ? lastfaelle(opt.eingabe) : []).map((l) => ({
      key: l.key,
      bez: l.bez,
      art: l.art,
      nachweis: l.nachweis !== false,
      anteile: EINWIRKUNGEN
        .flatMap((e) => {
          const f = r6(l.beiwerte?.[e.key] ?? 0);
          // Das eine G des Rechenkerns wirkt auf alle drei Untergruppen.
          return e.key === 'G'
            ? G_TEILE.map((g) => ({ lastfall: g.key, faktor: f }))
            : [{ lastfall: e.key, faktor: f }];
        })
        .filter((a) => Math.abs(a.faktor) > 1e-9),
    })).filter((l) => l.anteile.length > 0),
    lasten: l,
  };
}

/** Baut das JSON und lädt es herunter. */
/**
 * Dateiname einer Ausleitung.
 *
 * DER NAME MUSS SAGEN, WAS DRIN STEHT. Knotenmodell und Auflagermodell
 * ändern das Tragwerk, nicht nur eine Einstellung - zwei Ausleitungen
 * desselben Jochs sind verschiedene Modelle. Standen sie unter demselben
 * Namen, legte der Browser die zweite als «… (1).json» ab, und welche
 * welche war, wusste hinterher niemand mehr. Die COM-Brücke nimmt die
 * jüngste Modelldatei; damit das eine verlässliche Regel ist, muss der Name
 * die Unterscheidung tragen.
 */
function dateiname(inp, opt, m, endung) {
  const km = opt.knotenmodell ?? 'anschnitt';
  const am = opt.auflagerModell ?? auflagerVorgabe(m);
  // Die Verortung zuerst: so stehen die Tragwerke eines Projekts im Ordner
  // beieinander, statt sich nach dem Jochtyp zu sortieren.
  const wo = verortungKurz(inp);
  return `AxisVM${wo ? `_${wo}` : ''}_${inp.typ ?? 'frei'}`
       + `_L${Number(inp.L).toFixed(1)}m_${km}_${am}.${endung}`;
}

export function exportiereJson(inp, deps, opt = {}) {
  const { modell, profOG, profUG, stahl, joch } = deps;
  const m = modell({ ...inp, beiwerteFest: null }, profOG, profUG, stahl, joch);
  // Die Eingabe mitgeben: aus ihr entstehen die Lastkombinationen. Das
  // Modell selbst führt sie nicht mit.
  opt = { ...opt, eingabe: inp };
  const d = stabmodellJson(m, opt);
  const name = dateiname(inp, opt, m, 'json');
  const blob = new Blob([JSON.stringify(d, null, 1)],
                        { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return { name, kennzahlen: { knoten: d.knoten.length, staebe: d.staebe.length,
                               querschnitte: d.querschnitte.length,
                               lasten: d.lasten.punkt.length + d.lasten.moment.length
                                     + d.lasten.strecke.length } };
}

// ---------------------------------------------------------------------------
// DXF: Ausweichweg ohne SAF-Lizenz
// ---------------------------------------------------------------------------

/**
 * DXF-AUSLEITUNG.
 *
 * Das SAF-Interface ist bei AxisVM ein kostenpflichtiges Modul; ohne dieses
 * meldet der Import «SAF-Interface ist in dieser Konfiguration nicht
 * enthalten». DXF liest dagegen praktisch jede Konfiguration.
 *
 * DXF trägt allerdings NUR GEOMETRIE - keine Querschnitte, keine Auflager,
 * keine Lasten. Damit das trotzdem in vertretbarer Zeit zu einem Modell wird,
 * liegt jeder Querschnitt auf einer EIGENEN EBENE (Layer). In AxisVM lässt
 * sich eine Ebene in einem Zug auswählen und ihr der Querschnitt zuweisen;
 * dasselbe gilt für die Streckenlasten auf den Gurten. Was von Hand bleibt,
 * steht im Blatt «Zuordnung» der Begleitmappe.
 *
 * Geschrieben wird DXF R12 in ASCII - der kleinste gemeinsame Nenner, den
 * jedes Programm liest.
 */

/** Ein DXF-Gruppenpaar: Code und Wert, je auf eigener Zeile. */
const g = (code, wert) => `${code}\n${wert}\n`;

/** Ebenenname: DXF R12 verträgt keine Sonderzeichen. */
const ebene = (name) => String(name).replace(/[^A-Za-z0-9_-]/g, '_').toUpperCase();

export function dxfText(m, opt = {}) {
  const bau = stabmodell(m, opt);
  const l = lasten(m, bau);

  // Ebenen: je Querschnitt eine, dazu Auflager und Lastpunkte
  const ebenen = new Set(bau.staebe.map((s) => ebene(s.qs)));
  ebenen.add('AUFLAGER');
  if (l.punkt.length || l.moment.length) ebenen.add('LASTPUNKT');

  let t = g(0, 'SECTION') + g(2, 'HEADER')
        + g(9, '$INSUNITS') + g(70, 6)            // 6 = Meter
        + g(0, 'ENDSEC');

  t += g(0, 'SECTION') + g(2, 'TABLES') + g(0, 'TABLE') + g(2, 'LAYER')
     + g(70, ebenen.size);
  [...ebenen].forEach((n, i) => {
    t += g(0, 'LAYER') + g(2, n) + g(70, 0) + g(62, (i % 7) + 1) + g(6, 'CONTINUOUS');
  });
  t += g(0, 'ENDTAB') + g(0, 'ENDSEC');

  t += g(0, 'SECTION') + g(2, 'ENTITIES');
  bau.staebe.forEach((s) => {
    const a = bau.knoten.get(s.von), b = bau.knoten.get(s.bis);
    t += g(0, 'LINE') + g(8, ebene(s.qs))
       + g(10, a.x) + g(20, a.y) + g(30, a.z)
       + g(11, b.x) + g(21, b.y) + g(31, b.z);
  });
  // Auflager- und Lastpunkte als Punkte, damit sie im Modell auffindbar sind
  bau.auflager.forEach((a) => {
    const k = bau.knoten.get(a.knoten);
    t += g(0, 'POINT') + g(8, 'AUFLAGER') + g(10, k.x) + g(20, k.y) + g(30, k.z);
  });
  new Set([...l.punkt, ...l.moment].map((p) => p.knoten)).forEach((n) => {
    const k = bau.knoten.get(n);
    t += g(0, 'POINT') + g(8, 'LASTPUNKT') + g(10, k.x) + g(20, k.y) + g(30, k.z);
  });
  t += g(0, 'ENDSEC') + g(0, 'EOF');
  return { text: t, bau, lasten: l, ebenen: [...ebenen] };
}

/**
 * Begleitblatt zur DXF-Datei: was nach dem Einlesen von Hand zuzuweisen ist.
 * Ebene für Ebene, damit es in AxisVM in einem Zug geht.
 */
export function zuordnungsblatt(m, dxf, opt = {}) {
  const rows = [];
  const t = (v) => rows.push([{ v, s: STIL.TITEL }]);
  const p = (...z) => rows.push(z);
  const n = (v) => rows.push([{ v, s: STIL.NOTIZ }]);

  t('DXF-Zuordnung');
  p();
  p('Joch', m.typ, 'Länge [m]', m.L, 'Knotenmodell', opt.knotenmodell ?? 'anschnitt');
  p('Einheit', 'Meter', 'Achsen', 'X Jochachse · Y Gleisrichtung · Z nach oben');
  p();
  n('DXF trägt nur Geometrie. Jeder Querschnitt liegt auf einer eigenen Ebene: '
    + 'Ebene auswählen, Querschnitt zuweisen. Das erledigt alle Stäbe darauf '
    + 'in einem Zug.');
  p();

  t('1 · Querschnitte je Ebene');
  p(...kopf(['Ebene', 'Querschnitt', 'Form', 'Masse [mm]', 'Stäbe']));
  const jeEbene = new Map();
  dxf.bau.staebe.forEach((s) => jeEbene.set(s.qs, (jeEbene.get(s.qs) ?? 0) + 1));
  [...dxf.bau.querschnitte.values()].forEach((q) => {
    if (!jeEbene.has(q.name)) return;
    p(ebene(q.name), q.name, q.form, q.parameter.join(' × '), jeEbene.get(q.name));
  });
  p();
  n('STARR und ARM sind steife Ersatzstäbe. Rechteck 500 bzw. 300 mm, '
    + 'Eigengewicht abschalten. Wer echte Starrelemente bevorzugt, ersetzt sie.');
  p();

  /*
   * DIE FREIHEITSGRADE DES MODELLS, NICHT DIE DER GABELLAGERUNG.
   *
   * Hier stand `stuetzung(m, a.ende)` - also nur der BUCHSTABE. Damit war
   * `lager.ux` undefiniert, jedes Lager fiel in die Vorgabe, und das Blatt
   * beschrieb den Ersatzbalken, während die DXF-Datei daneben das
   * Gurtmodell trug. Dieselbe Verwechslung wie im SAF-Blatt (siehe dort).
   */
  t(`2 · Auflager (Ebene AUFLAGER, ${dxf.bau.auflager.length} Punkte, `
    + `Modell ${dxf.bau.auflager[0]?.modell ?? '?'})`);
  p(...kopf(['Punkt', 'X [m]', 'Y [m]', 'Z [m]', 'ux', 'uy', 'uz', 'φx', 'φy', 'φz',
             'c_φy [kNm/rad]']));
  dxf.bau.auflager.forEach((a) => {
    const k = dxf.bau.knoten.get(a.knoten);
    const b = stuetzung(m, a);
    p(`Auflager ${a.ende} (${a.knoten})`, k.x, k.y, k.z,
      b.ux, b.uy, b.uz, b.fix, b.fiy, b.fiz,
      b.cFiy_kNm === null ? '–' : b.cFiy_kNm);
  });
  p();
  n('φx gehalten ist die Gabellagerung, φz frei lässt die Windbiegung gelenkig. '
    + 'In Jochachse hält GENAU EIN Knoten - jeder weitere wäre ein Zwang.');
  p();

  t('3 · Streckenlasten auf den Gurtebenen');
  p(...kopf(['Lastfall', 'Ebenen', 'Richtung', 'Wert je Gurt [kN/m]']));
  const jeFall = new Map();
  dxf.lasten.strecke.forEach((q) => {
    const k = `${q.lastfall}|${q.richtung}|${q.wert}`;
    jeFall.set(k, (jeFall.get(k) ?? 0) + 1);
  });
  [...jeFall.keys()].forEach((k) => {
    const [fall, richtung, wert] = k.split('|');
    p(fall, 'GURT_OG + GURT_UG', richtung, Number(wert));
  });
  p();
  n('Auf JEDEN Gurtstab, also alle vier Gurte. Der Wert ist bereits ein Viertel '
    + 'der Laufmeterlast des Jochs.');
  p();

  t('4 · Punktlasten und Momente (Ebene LASTPUNKT)');
  p(...kopf(['Bezeichnung', 'X [m]', 'Y [m]', 'Z [m]', 'Richtung', 'Wert', 'Lastfall']));
  dxf.lasten.punkt.forEach((q) => {
    const k = dxf.bau.knoten.get(q.knoten);
    p(q.name, k.x, k.y, k.z, q.richtung, { v: q.wert, s: STIL.N2 }, q.lastfall);
  });
  dxf.lasten.moment.forEach((q) => {
    const k = dxf.bau.knoten.get(q.knoten);
    p(q.name, k.x, k.y, k.z, q.richtung, { v: q.wert, s: STIL.N2 }, q.lastfall);
  });
  p();
  n('Kräfte in kN, Momente in kNm. Vier Lastfälle anlegen: G ständig, '
    + 'WindX, WindY, Schnee veränderlich. Charakteristisch, nicht kombiniert.');

  return { name: 'Zuordnung', rows,
           breiten: [18, 22, 12, 16, 10, 10, 10, 10, 10, 10, 14] };
}

/**
 * DXF-Weg: Geometriedatei plus Begleitmappe (Zuordnung, Anleitung, Vergleich).
 * Zwei Dateien, weil DXF keine Tabellen trägt.
 */
export function exportiereDxf(inp, deps, opt = {}) {
  const { berechne, modell, profOG, profUG, stahl, joch } = deps;
  const km = opt.knotenmodell ?? 'anschnitt';
  const m = modell({ ...inp, beiwerteFest: null }, profOG, profUG, stahl, joch);
  // Alle Angaben weiterreichen: `auflagerModell` und `starrModell` fielen
  // hier unterwegs weg, und die DXF-Datei trug dann ein anderes Modell als
  // der Dialog angeboten hatte - dieselbe Lücke wie einst in `axisvmMappe`.
  const dxf = dxfText(m, { ...opt, knotenmodell: km });

  const basis = dateiname(inp, opt, m, '').slice(0, -1);   // ohne Punkt
  herunterladen(dxf.text, `${basis}.dxf`, 'application/dxf');

  // Begleitmappe: dieselben Blätter wie beim SAF-Weg, ohne die SAF-Tabellen
  const { blaetter } = axisvmMappe(inp, deps, { ...opt, knotenmodell: km });
  const behalten = ['Anleitung', 'Vergleich'];
  const mappe = [zuordnungsblatt(m, dxf, { knotenmodell: km }),
                 ...blaetter.filter((b) => behalten.includes(b.name))];
  herunterladen(arbeitsmappe(mappe), `${basis}_Zuordnung.xlsx`);

  void berechne;
  return { dxf: `${basis}.dxf`, mappe: `${basis}_Zuordnung.xlsx`,
           staebe: dxf.bau.staebe.length, ebenen: dxf.ebenen };
}
