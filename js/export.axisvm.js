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
import { EINWIRKUNGEN } from './core.lasten.js';
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
 */
export const AUFLAGERMODELLE = [
  { key: 'gurte',
    label: 'Gurte einzeln: Untergurte x/y/z, Obergurte x/y (kein Kräftepaar)' },
  { key: 'mitte',
    label: 'Mitte der Gurtebenen vorn und hinten, x/y/z, Gelenk um y (Altbauweise)' },
  { key: 'punkt',
    label: 'Ein Punkt je Ende mit Drehfeder (Abgleich mit dem Ersatzbalken)' },
];

/** Vorgabe nach Bauweise: die Altbauweise ist zu flach für ein Kräftepaar. */
export const auflagerVorgabe = (m) => ((m?.bauweise ?? 'neu') === 'alt' ? 'mitte' : 'gurte');

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

/** Querschnittsdefinition eines Gurtwinkels. */
function gurtQuerschnitt(p, gurt) {
  return {
    name: `GURT_${gurt}`, art: 'Parametric', form: 'Angle',
    // Angle: H; B; t; R; R1 - die Ausrundungsradien der Norm stehen in den
    // Profiltabellen dieses Werkzeugs nicht und werden zu 0 gesetzt. Die
    // Fläche fällt dadurch rund 2 % kleiner aus als beim Bibliotheksprofil.
    parameter: [p.aH, p.aV, p.t, 0, 0],
    profil: p.name,
    A: p.A / 1e4,                                   // cm2 -> m2
    Iy: (p.iy * p.iy * p.A) / 1e8,                  // cm4 -> m4
    Iz: (p.iz * p.iz * p.A) / 1e8,
    // St-Venant des offenen Winkels: I_t = Σ b·t³/3
    It: ((p.aH + p.aV) * p.t ** 3) / 3 / 1e12,
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
 * Schnitt C-C der Zeichnung 373.09.021 gibt dafür die Regel:
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
  // Schnitt C-C der Konstruktionszeichnung 373.09.021: das Vertikalblech
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
export function stabmodell(m, opt = {}) {
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
  st.forEach((station) => {
    fest.add(r6(station.x));
    const d = steifBis.get(station.x);
    if (d) {
      fest.add(r6(Math.max(0, station.x - d)));
      fest.add(r6(Math.min(m.L, station.x + d)));
    }
  });

  // BEWEGLICH, nach Wichtigkeit: erst alle Anbauteilmitten, dann die Reihen.
  const beweglich = [];
  (m.anbauteileFlach ?? []).forEach((a) => beweglich.push(imFeld(a.x)));
  (m.anbauteileFlach ?? []).forEach((a) => {
    const r = (a.raster ?? 0) / 2;
    if (r > 0) { beweglich.push(imFeld(a.x - r)); beweglich.push(imFeld(a.x + r)); }
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
  const gurtKnoten = (gurt, seite, x) => {
    const h = m.verlauf ? m.verlauf.hAn(x) : m.h;
    const b = m.breite ? m.breite.bAn(x) : m.b;
    const z = gurt === 'OG' ? zOben : zOben - h;
    const y = (seite === 'L' ? -1 : +1) * (b / 2);
    return s.kn(`${gurt}${seite}_${x.toFixed(3)}`, x, y, z);
  };

  ['OG', 'UG'].forEach((gurt) => ['L', 'R'].forEach((seite) => {
    for (let i = 0; i < xs.length - 1; i++) {
      const a = gurtKnoten(gurt, seite, xs[i]);
      const b = gurtKnoten(gurt, seite, xs[i + 1]);
      const mitte = (xs[i] + xs[i + 1]) / 2;
      const qs = imKnoten(mitte) ? qsStarr : (gurt === 'OG' ? qsOG : qsUG);
      s.stab(`${gurt}${seite}_S${i}`, qs, a, b);
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
      s.stab(`${name}_e${k}`, qsStarr, p.name, n);
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
    s.stab(`${name}_1`, qsStarr, p1.name, n1);
    s.stab(`${name}_2`, qsBlech, n1, n2);
    s.stab(`${name}_3`, qsStarr, n2, p2.name);
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
  //   gurte  Die vier Gurte einzeln gehalten: Untergurte x/y/z, Obergurte
  //          nur x/y. Ohne lotrechten Halt am Obergurt entsteht kein
  //          Kräftepaar - das Ende bleibt biegeweich, so wie es aufliegt.
  //          Keine Gelenke nötig: die Gurte haben Abstand und sind einzeln
  //          gehalten.
  //
  //   mitte  Für die Altbauweise. Dort stehen Ober- und Untergurt so eng,
  //          dass ein Kräftepaar über diesen kurzen Hebel das Ergebnis
  //          verfälschte. Gehalten wird deshalb auf halber Höhe in den
  //          beiden Gurtebenen vorn und hinten, x/y/z, mit Gelenk um y.
  //
  //   punkt  Ein Punkt je Ende auf der Jochachse, über ein steifes Schott
  //          an die vier Gurte gehängt, mit der Drehfeder des Mastkopfes.
  //          Das ist der Ersatzbalken des Rechenkerns - die Vergleichsbasis
  //          der Kalibrierung, nicht das Bauwerk.
  const am = opt.auflagerModell ?? auflagerVorgabe(m);
  const auflager = [];
  ['A', 'B'].forEach((ende, k) => {
    const x = k === 0 ? 0 : r6(m.L);
    const h = m.verlauf ? m.verlauf.hAn(x) : m.h;
    const laengs = ende === 'A' ? 'Rigid' : 'Free';   // ein Ende längs frei
    const halt = (knoten, uz, fiy, c) => auflager.push({
      ende, x, modell: am, knoten,
      ux: laengs, uy: 'Rigid', uz,
      fix: 'Free', fiy, fiz: 'Free', feder: c ?? null,
    });

    if (am === 'punkt') {
      const mitte = s.kn(`AUF_${ende}`, x, 0, zOben - h / 2);
      ['OG', 'UG'].forEach((gurt) => ['L', 'R'].forEach((seite) => {
        s.stab(`SCHOTT_${ende}_${gurt}${seite}`, qsStarr,
               mitte, gurtKnoten(gurt, seite, x));
      }));
      // Gabellagerung: Torsion gehalten, Vertikalbiegung über die Drehfeder.
      auflager.push({ ende, x, modell: am, knoten: mitte,
                      ux: laengs, uy: 'Rigid', uz: 'Rigid',
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
        halt(n, 'Rigid', 'Free', null);
      });
      return;
    }

    // am === 'gurte'
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
  const gruppiert = new Map();
  (m.anbauteileFlach ?? []).forEach((a) => {
    const schluessel = [r6(a.x), r6(a.y ?? 0), r6(a.z ?? 0),
                        a.befestigung, a.raster ?? 0].join('|');
    const da = gruppiert.get(schluessel);
    if (da) { da.teile.push(a); return; }
    gruppiert.set(schluessel, { ...a, teile: [a] });
  });

  const arme = [];
  [...gruppiert.values()].forEach((a, k) => {
    const x0 = aufSchnitt(a.x);
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
      ? [aufSchnitt(a.x - r), aufSchnitt(a.x + r)]
      : [x0])];
    const mitte = {};

    ebenen.forEach((gurt) => {
      const z = zVon(gurt);
      // Knoten der Reihen auf der Jochachse und ihre Stummel zu den Gurten.
      const knRe = reihen.map((xr, j) => {
        const n = s.kn(`AT${k}_${gurt}_R${j + 1}`, xr, 0, r6(z));
        ['L', 'R'].forEach((seite) => {
          s.stab(`AT${k}_${gurt}_R${j + 1}${seite}`, qsStarr, n,
                 gurtKnoten(gurt, seite, xr));
        });
        return { x: xr, n };
      });

      // Der Anschlusskörper zwischen den Reihen, mit einem Knoten in der
      // Mitte - dort hängt die Stütze.
      const nm = s.kn(`AT${k}_${gurt}`, x0, 0, r6(z));
      mitte[gurt] = nm;
      knRe.forEach(({ x: xr, n }, j) => {
        if (Math.abs(xr - x0) < 1e-9) return;
        // Der Ast zur ZWEITEN Reihe überträgt keine Längskraft: das ist die
        // Freigabe von x, in der Stabachse und damit eindeutig.
        s.stab(`AT${k}_${gurt}_B${j + 1}`, qsStarr, nm, n,
               j > 0 ? { gelenkEnde: 'axial' } : null);
      });
    });

    // Bei vier Punkten oben UND unten läuft der Stab durch den Kasten.
    if (ebenen.length === 2) {
      s.stab(`ARM${k}_D`, qsArm, mitte.OG, mitte.UG);
    }

    // Der durchgehende Stab zum Lastpunkt, am Übergang steif (Variante A).
    const zAn = a.befestigung === 'oben' ? zOG : zUG;
    const anker = a.befestigung === 'oben' ? mitte.OG : mitte.UG;
    const last = s.kn(`AL${k}`, x0, r6(a.y ?? 0), r6(zAn + (a.z ?? 0)));
    s.stab(`ARM${k}`, qsArm, anker, last,
           opt.anbauGelenk ? { gelenkAnfang: opt.anbauGelenk } : null);
    arme.push({ teil: a, knoten: last });
  });

  return { ...s, auflager, arme, knotenmodell: km, zOben, verschoben,
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
        punkt.push({ name: `F${k}_${e.key}_${richtung}`, knoten: arm.knoten,
                     richtung, wert: r6(wert), lastfall: e.key });
      });
      const mom = [['Mx', kr.Mxx ?? 0], ['My', kr.Myy ?? 0], ['Mz', kr.Mzz ?? 0]];
      mom.forEach(([richtung, wert]) => {
        if (!wert) return;
        moment.push({ name: `M${k}_${e.key}_${richtung}`, knoten: arm.knoten,
                      richtung, wert: r6(wert), lastfall: e.key });
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
function stuetzung(m, lager) {
  const ende = lager.ende ?? lager;
  const c = ende === 'A' ? m.federn.cA : m.federn.cB;
  const starr = c >= 1e11;
  const weich = c > 0 && !starr;

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

  return {
    ux: roh.ux, uy: roh.uy, uz: roh.uz,
    fix: roh.fix, fiy, fiz: roh.fiz,
    cFiy_MNm: hatFeder ? r6(c / 1000) : null,   // für SAF
    cFiy_kNm: hatFeder ? r6(c) : null,          // für COM
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

  const lager = [
    kopf(['Name', 'Type', 'Boundary condition', 'Node', 'ux', 'uy', 'uz',
          'fix', 'fiy', 'fiz', 'Stiffness Fiy [MNm/rad]']),
    ...bau.auflager.map((a) => {
      const b = stuetzung(m, a.ende);
      return [`AUFLAGER_${a.ende}`, 'Standard', 'In node', a.knoten,
              b.ux, b.uy, b.uz, b.fix, b.fiy, b.fiz, b.cFiy_MNm];
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
  p('', 'einzeln. Kombinationen in AxisVM anlegen — Wind je mit + und −.');
  p('3', 'Rechnen, dann Stabschnittgrössen je Lastfall in das Blatt');
  p('', '«Vergleich» eintragen oder als Tabelle exportieren.');
  p();

  t('Was beim Import zu prüfen ist');
  n('Ausrundungsradien der Winkel sind mit 0 angesetzt — die Profiltabellen '
    + 'dieses Werkzeugs führen sie nicht. Die Fläche fällt dadurch rund 2 % '
    + 'kleiner aus. Für einen genauen Vergleich die Gurte in AxisVM durch die '
    + 'Bibliotheksprofile ersetzen.');
  n('Die Stäbe «STARR» und «ARM» sind Rechtecke 500 bzw. 300 mm — steife '
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
  const { blaetter, bau } = safBlaetter(m, { knotenmodell: km, schottAusblenden: opt.schottAusblenden });

  return {
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
  const { blaetter, kennzahlen } = axisvmMappe(inp, deps, opt);
  const km = opt.knotenmodell ?? 'anschnitt';
  const name = `AxisVM_${inp.typ ?? 'frei'}_L${Number(inp.L).toFixed(1)}m_${km}.xlsx`;
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
export function stabmodellJson(m, opt = {}) {
  const bau = stabmodell(m, opt);
  const l = lasten(m, bau);
  const stahl = m.stahl.name;

  // Lokale z-Richtung je Stab: dieselbe Regel wie im SAF-Blatt. Sie entscheidet,
  // wie herum ein Blechrechteck steht - die Breite muss in die Jochachse.
  const lcs = (stab) => {
    const a = bau.knoten.get(stab.von), b = bau.knoten.get(stab.bis);
    const laengs = Math.abs(b.x - a.x) >= Math.max(Math.abs(b.y - a.y),
                                                   Math.abs(b.z - a.z));
    return laengs ? [0, 0, 1] : [1, 0, 0];
  };

  return {
    format: 'tragjoch-stabmodell',
    version: 1,
    erzeugt: new Date().toISOString().slice(0, 19),
    einheiten: { laenge: 'm', parameter: 'mm', kraft: 'kN', moment: 'kNm',
                 drehfeder: 'kNm/rad', flaeche: 'm2', traegheit: 'm4' },
    achsen: 'x Jochachse, y Gleisrichtung, z lotrecht nach oben',
    tragwerk: {
      typ: m.typ ?? 'frei', L: r6(m.L), h: r6(m.h), b: r6(m.b),
      knotenmodell: bau.knotenmodell,
      auflagermodell: bau.auflager[0]?.modell ?? null,
      bauweise: m.bauweise ?? 'neu',
      // Schnitte, die zusammengelegt wurden, damit im Gurt keine
      // Millimeterstücke entstehen. Nachvollziehbar statt stillschweigend.
      verschoben: (bau.verschoben ?? []).map((v) => ({
        von: r6(v.von), nach: r6(v.nach), betrag_mm: r6(v.betrag * 1000),
      })),
      bezeichnung: `Tragjoch ${m.typ ?? 'frei'} L=${Number(m.L).toFixed(2)} m`,
    },
    material: { name: stahl, art: 'Steel', rho: 7850, E: 210000, G: 81000,
                nu: 0.3, alpha: 0.000012, fy: m.stahl.fy ?? null },
    querschnitte: [...bau.querschnitte.values()].map((q) => ({
      name: q.name, form: q.form, parameter: q.parameter,
      profil: q.profil ?? null,
      A: q.A ?? null, Iy: q.Iy ?? null, Iz: q.Iz ?? null, It: q.It ?? null,
    })),
    knoten: [...bau.knoten.values()],
    staebe: bau.staebe.map((s) => ({
      name: s.name, von: s.von, bis: s.bis, querschnitt: s.qs, lcsZ: lcs(s),
      // 'M': alle drei Momente frei - die Hängestütze hängt, sie klemmt nicht.
      gelenkAnfang: s.gelenkAnfang ?? null,
      gelenkEnde: s.gelenkEnde ?? null,
    })),
    // Ein Eintrag JE GEHALTENEM KNOTEN. Bei 'punkt' ist das einer je Ende,
    // bei 'mitte' zwei, bei 'gurte' vier - die Brücke läuft unverändert
    // darüber, sie sieht nur mehr Zeilen.
    auflager: bau.auflager.map((a) => ({
      ende: a.ende, knoten: a.knoten, x: a.x, modell: a.modell,
      ...stuetzung(m, a),
    })),
    lastfaelle: EINWIRKUNGEN.map((e) => ({ key: e.key, label: e.label,
                                           art: e.key === 'G' ? 'Others' : 'Others' })),
    lasten: l,
  };
}

/** Baut das JSON und lädt es herunter. */
export function exportiereJson(inp, deps, opt = {}) {
  const { modell, profOG, profUG, stahl, joch } = deps;
  const m = modell({ ...inp, beiwerteFest: null }, profOG, profUG, stahl, joch);
  const d = stabmodellJson(m, opt);
  const km = opt.knotenmodell ?? 'anschnitt';
  const name = `AxisVM_${inp.typ ?? 'frei'}_L${Number(inp.L).toFixed(1)}m_${km}.json`;
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
    + 'Ebene auswählen, Querschnitt zuweisen — das erledigt alle Stäbe darauf '
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

  t('2 · Auflager (Ebene AUFLAGER, zwei Punkte)');
  p(...kopf(['Punkt', 'X [m]', 'Y [m]', 'Z [m]', 'ux', 'uy', 'uz', 'φx', 'φy', 'φz',
             'c_φy [kNm/rad]']));
  dxf.bau.auflager.forEach((a) => {
    const k = dxf.bau.knoten.get(a.knoten);
    const b = stuetzung(m, a.ende);
    p(`Auflager ${a.ende}`, k.x, k.y, k.z, b.ux, b.uy, b.uz, b.fix, b.fiy, b.fiz,
      b.cFiy_kNm === null ? '–' : b.cFiy_kNm);
  });
  p();
  n('φx gehalten ist die Gabellagerung, φz frei lässt die Windbiegung gelenkig. '
    + 'Ein Ende ist längs verschieblich.');
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
    + 'WindX, WindY, Schnee veränderlich — charakteristisch, nicht kombiniert.');

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
  const dxf = dxfText(m, { knotenmodell: km, schottAusblenden: opt.schottAusblenden });

  const basis = `AxisVM_${inp.typ ?? 'frei'}_L${Number(inp.L).toFixed(1)}m_${km}`;
  herunterladen(dxf.text, `${basis}.dxf`, 'application/dxf');

  // Begleitmappe: dieselben Blätter wie beim SAF-Weg, ohne die SAF-Tabellen
  const { blaetter } = axisvmMappe(inp, deps, { knotenmodell: km, schottAusblenden: opt.schottAusblenden });
  const behalten = ['Anleitung', 'Vergleich'];
  const mappe = [zuordnungsblatt(m, dxf, { knotenmodell: km }),
                 ...blaetter.filter((b) => behalten.includes(b.name))];
  herunterladen(arbeitsmappe(mappe), `${basis}_Zuordnung.xlsx`);

  void berechne;
  return { dxf: `${basis}.dxf`, mappe: `${basis}_Zuordnung.xlsx`,
           staebe: dxf.bau.staebe.length, ebenen: dxf.ebenen };
}
