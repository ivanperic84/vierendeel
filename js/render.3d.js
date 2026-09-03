/**
 * render.3d.js
 * ---------------------------------------------------------------------------
 * 3D-MODELLANSICHT auf Canvas 2D, ohne Fremdbibliothek.
 *
 * Warum nicht three.js: die eigenständige HTML-Datei soll per Doppelklick und
 * ohne Netz laufen. Ein CDN-Skript würde das brechen, und ein eingebettetes
 * three.js wäre grösser als das ganze übrige Werkzeug. Die Geometrie hier ist
 * einfach genug (Prismen und Platten), dass ein Maler-Algorithmus mit flacher
 * Schattierung genügt.
 *
 * Aufbau
 *   erzeugeSzene(m, erg)  -> Flächen, Linien, Marken, Masse, Kraftvektoren
 *   Modellansicht         -> Kamera, Eingabe, Zeichnen
 *
 * Koordinaten: x entlang der Jochachse [m], y quer [m], z vertikal [m].
 *
 * KAMERA
 * Geschoben wird im RAUM, nicht im Bild: kamera.pan verschiebt Auge und
 * Blickziel gemeinsam. Der frühere Bildversatz war bequem, hatte aber einen
 * Preis - die Perspektive blieb auf die alte Achse zentriert, und wer nahe am
 * Modell zur Seite schob, sah es zunehmend verzerrt (Weitwinkeleffekt am
 * Bildrand). Mit dem Raum-Schieben bleibt die Projektion immer achszentriert.
 *
 * Daraus folgt zwingend: der Drehpunkt IST die Bildmitte. Eine achszentrierte
 * Projektion und ein Drehpunkt ausserhalb der Bildmitte schliessen sich
 * geometrisch aus. Das ist kein Nachteil - man dreht um das, was man ansieht,
 * und genau das ist beim Arbeiten am Trägerende gewollt.
 *
 * PROJEKTION
 * Wahlweise perspektivisch (mit einstellbarem Blickwinkel) oder ORTHOGONAL.
 * Orthogonal kennt überhaupt keine perspektivische Verzerrung: parallele
 * Kanten bleiben parallel, Längen sind über die Tiefe vergleichbar. Für das
 * Ablesen eines Trägers ist das oft die ehrlichere Darstellung.
 * ---------------------------------------------------------------------------
 */

import { querschnitt } from './geometry.js';
import { etaFarbe, tokens, bauteilFarbe } from './design.js';
import { anschlussGurt, anbauKette } from './core.anbauteile.js';
import { ortVon, amMast } from './data.anbauteile.js';

const MM = 1 / 1000;

/**
 * Kurzform eines Bauteilnamens für die Beschriftung im Modell.
 * «Hängestütze mit NT-Ausleger Gleis 2» wird zu «Hängestütze … Gleis 2»:
 * Anfang und Ende tragen die Unterscheidung, die Mitte ist Beiwerk.
 */
function kurzName(name, max = 22) {
  const n = String(name ?? '').trim();
  if (n.length <= max) return n;
  const teile = n.split(/\s+/);
  const letzter = teile[teile.length - 1];
  // Endet der Name auf eine Nummer (Gleis 2, Pos 3), bleibt sie stehen.
  if (/^\d+$/.test(letzter) && teile.length > 2) {
    const schwanz = `${teile[teile.length - 2]} ${letzter}`;
    const kopf = n.slice(0, Math.max(4, max - schwanz.length - 2));
    return `${kopf.trim()}… ${schwanz}`;
  }
  return `${n.slice(0, max - 1).trim()}…`;
}

/**
 * LASTARTEN der Modellansicht.
 *
 * Sie sind nicht dasselbe wie die Einwirkungsgruppen der Rechnung: die
 * Umlenkkraft aus dem Leiterzug läuft rechnerisch in der Gruppe G, ist aber
 * beim Betrachten des Modells etwas ganz anderes als ein Eigengewicht - sie
 * zieht waagrecht und stammt aus der Trasse. Deshalb steht sie hier als eigene
 * Art. Umgekehrt ist «Ständig» hier alles Übrige aus der Gruppe G.
 *
 * Die Farbe folgt der Art, damit man im Bild sieht, woher eine Kraft kommt,
 * ohne die Beschriftung zu lesen.
 */
export const LASTARTEN = [
  { key: 'staendig',  label: 'Ständige Lasten',  farbe: 'on2',
    hinweis: 'Eigengewicht von Joch und Anbauteilen.' },
  { key: 'leiterzug', label: 'Leiterzugkräfte',  farbe: 'blechKante',
    hinweis: 'Umlenkkraft aus dem Leiterzug im Bogen (ständig, Gruppe G).' },
  { key: 'windX',     label: 'Wind in x',        farbe: 'acc',
    hinweis: 'Windkraft in Jochachse.' },
  { key: 'windY',     label: 'Wind in y',        farbe: 'ok',
    hinweis: 'Windkraft in Gleisrichtung, dazu die Laufmeterlast auf das Joch.' },
  { key: 'schnee',    label: 'Schnee',           farbe: 'warn',
    hinweis: 'Schnee und veränderliche Vertikallasten der Anbauteile.' },
];

/** Einwirkungsgruppe der Rechnung -> Lastart der Darstellung. */
export const LASTART_VON_GRUPPE = {
  G: 'staendig', WindX: 'windX', WindY: 'windY', Schnee: 'schnee',
};

// --- Vektorrechnung ---------------------------------------------------------

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const skal = (a, f) => [a[0] * f, a[1] * f, a[2] * f];
const kreuz = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const punkt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// --- Bausteine der Szene ----------------------------------------------------

/**
 * Prisma aus einem Querschnittspolygon [[y,z],…] zwischen x0 und x1.
 *
 * dz0/dz1 heben das Polygon an den beiden Enden um ein Mass [m] an. Damit
 * lassen sich die verjüngten Enden der Altbauweise zeichnen: der Untergurt
 * steigt zum Auflager hin an, der Obergurt bleibt gerade.
 */
function prisma(poly, x0, x1, opt, dz0 = 0, dz1 = 0, poly1 = null) {
  const flaechen = [];
  const pA = poly, pB = poly1 ?? poly;      // Querschnitt bei x0 und bei x1
  const n = pA.length;
  const P = (x, p, dz) => [x, p[0] * MM, p[1] * MM + dz];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    flaechen.push({
      punkte: [P(x0, pA[i], dz0), P(x0, pA[j], dz0),
               P(x1, pB[j], dz1), P(x1, pB[i], dz1)],
      xMitte: (x0 + x1) / 2, ...opt,
    });
  }
  // Stirnflächen
  flaechen.push({ punkte: pA.map((p) => P(x0, p, dz0)), xMitte: x0, ...opt });
  flaechen.push({ punkte: pB.map((p) => P(x1, p, dz1)), xMitte: x1, ...opt });
  return flaechen;
}

/**
 * Quader aus Mittelebene, Dicke und Ausdehnung.
 *
 * neigung [m/m] kippt das Blech um die Jochachse quer: die vordere Kante liegt
 * um breite/2·neigung tiefer als die hintere. Gebraucht für die Bleche des
 * Untergurts in der Schräge der Altbauweise.
 */
function platte(x, breite, achse, lage, von, bis, opt, neigung = 0) {
  const h = (breite * MM) / 2;
  const x0 = x - h, x1 = x + h;
  const t = (opt.dicke * MM) / 2;
  const poly = achse === 'y'
    // Blech in einer Vertikalebene: konstante y-Lage, spannt in z
    ? [[lage - t, von], [lage + t, von], [lage + t, bis], [lage - t, bis]]
    // Blech in einer Horizontalebene: konstante z-Lage, spannt in y
    : [[von, lage - t], [bis, lage - t], [bis, lage + t], [von, lage + t]];
  return prisma(poly.map((p) => [p[0] / MM, p[1] / MM]), x0, x1, opt,
                -h * neigung, +h * neigung);
}

/**
 * Prisma aus einem Querschnittspolygon [[x,y],…] (mm) zwischen z0 und z1 (m).
 *
 * Das Gegenstück zu `prisma`, das in x auszieht. Ein Mast steht lotrecht;
 * ohne diesen Baustein liesse er sich nur als Kasten andeuten, und ein Kasten
 * ist kein HEB.
 */
function prismaZ(poly, cx, z0, z1, opt) {
  const flaechen = [];
  const n = poly.length;
  const P = (p, z) => [cx + p[0] * MM, p[1] * MM, z];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    flaechen.push({ punkte: [P(poly[i], z0), P(poly[j], z0),
                             P(poly[j], z1), P(poly[i], z1)],
                    xMitte: cx, ...opt });
  }
  flaechen.push({ punkte: poly.map((p) => P(p, z0)), xMitte: cx, ...opt });
  flaechen.push({ punkte: poly.map((p) => P(p, z1)), xMitte: cx, ...opt });
  return flaechen;
}

/**
 * Der I-Querschnitt eines Mastes als Polygon [[x,y],…] in Millimetern.
 *
 * Zwölf Ecken: zwei Flansche und der Steg dazwischen. Die STEGRICHTUNG
 * entscheidet, wie er im Raum liegt - «Steg in Jochachse» heisst, dass die
 * Profilhöhe h in der Jochachse (x) steht und die Flanschbreite b quer dazu.
 * Gedreht ist es umgekehrt. Genau das unterscheidet die starke von der
 * schwachen Achse quer zum Gleis, und man soll es dem Bild ansehen.
 */
function iProfilPoly({ h, b, tw, tf }, achse) {
  const u = h / 2, v = b / 2, w = tw / 2;
  const uv = [
    [-u, -v], [-u, +v], [-u + tf, +v], [-u + tf, +w],
    [+u - tf, +w], [+u - tf, +v], [+u, +v], [+u, -v],
    [+u - tf, -v], [+u - tf, -w], [-u + tf, -w], [-u + tf, -v],
  ];
  return achse === 'y' ? uv : uv.map(([a, c]) => [c, a]);
}

/** Achsparalleler Quader um einen Mittelpunkt, Kantenlängen in m. */
function quader(mitte, [dx, dy, dz], opt) {
  const [cx, cy, cz] = mitte;
  const poly = [[cy - dy / 2, cz - dz / 2], [cy + dy / 2, cz - dz / 2],
                [cy + dy / 2, cz + dz / 2], [cy - dy / 2, cz + dz / 2]];
  return prisma(poly.map((p) => [p[0] / MM, p[1] / MM]),
                cx - dx / 2, cx + dx / 2, opt);
}

/** Stab zwischen zwei Punkten als schlanker Quader (achsnah genügt hier). */
function stab(p0, p1, dicke, opt) {
  const m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2];
  const d = sub(p1, p0);
  return quader(m, [Math.abs(d[0]) + dicke, Math.abs(d[1]) + dicke,
                    Math.abs(d[2]) + dicke], opt);
}

// --- Szenenaufbau -----------------------------------------------------------

/**
 * Baut die Szene aus Modell und Rechenergebnis.
 * @param {object} m   Modell
 * @param {object} erg Rechenergebnis (für die Ausnutzungen je Station)
 */
/* ===========================================================================
 * DAS GANZE BLATT IN EINEM BILD
 *
 * Weisung vom 2. September: «man laesst die Tragwerke im 3d angezeigt passiv
 * und man kann dann draufdruecken um auf diese aktiv umzuschalten».
 *
 * `erzeugeSzene` baut EIN Tragwerk, mit x von 0 bis L. Mehrere nebeneinander
 * heisst: jede Szene um ihre Lage x0 verschieben und die Listen vereinen.
 * Das ist billiger und sicherer, als den Aufbau selbst mehrmals durch das
 * Blatt zu fuehren - er kennt hundert Stellen, an denen x vorkommt, und
 * jede einzelne muesste den Versatz mitnehmen.
 *
 * VERSCHOBEN WIRD GENAU EINE ACHSE. Alles, was eine x-Koordinate traegt,
 * bekommt dx dazu: Punkte [x,y,z], Punktlisten, Masslinien, Vektoren,
 * Grenzen, Stationen. Was keine hat, bleibt.
 * =========================================================================== */

/** Ein Punkt [x,y,z] um dx verschoben. */
const pVersch = (p, dx) => (Array.isArray(p) ? [p[0] + dx, p[1], p[2]] : p);

/** Ein Szenenteil (Flaeche, Linie, Marke, ...) um dx verschoben. */
function teilVersch(t, dx, zusatz) {
  const o = { ...t, ...zusatz };
  if (Array.isArray(t.punkte)) o.punkte = t.punkte.map((p) => pVersch(p, dx));
  if (Array.isArray(t.p)) o.p = pVersch(t.p, dx);
  if (Array.isArray(t.p0)) o.p0 = pVersch(t.p0, dx);
  if (Array.isArray(t.p1)) o.p1 = pVersch(t.p1, dx);
  if (Array.isArray(t.poly)) o.poly = t.poly.map((p) => pVersch(p, dx));
  if (Number.isFinite(t.xMitte)) o.xMitte = t.xMitte + dx;
  if (Number.isFinite(t.x)) o.x = t.x + dx;
  // `v` ist eine RICHTUNG, kein Ort - sie wird nicht verschoben.
  return o;
}

/**
 * Eine Szene um dx verschieben und ihre Teile kennzeichnen.
 *
 * `zusatz` wandert in jeden Teil: dort steht, zu welchem Tragwerk er gehoert
 * und ob es das aktive ist. Daran haengen die Einfaerbung und der Klick.
 */
export function szeneVerschieben(sz, dx, zusatz = {}) {
  if (!sz) return sz;
  const l = (a) => (a ?? []).map((t) => teilVersch(t, dx, zusatz));
  const g = sz.grenzen ?? {};
  return {
    ...sz,
    flaechen: l(sz.flaechen), linien: l(sz.linien), marken: l(sz.marken),
    masse: l(sz.masse), bauteiltitel: l(sz.bauteiltitel),
    vektoren: l(sz.vektoren), lastflaechen: l(sz.lastflaechen),
    schnitt: sz.schnitt ? teilVersch(sz.schnitt, dx, {}) : null,
    /*
     * DER NACHWEISSCHNITT IST EINE x-KOORDINATE.
     *
     * Er wurde beim ersten Anlauf vergessen: der Knopf «auf den
     * Nachweisschnitt» fuhr dann auf x = 0.38, waehrend das Tragwerk bei 20
     * bis 40 stand. Kein Fehler, keine Meldung - die Kamera fuhr nur an eine
     * Stelle, an der nichts ist.
     */
    xNachweis: Number.isFinite(sz.xNachweis) ? sz.xNachweis + dx : sz.xNachweis,
    stationen: (sz.stationen ?? []).map((x) => x + dx),
    grenzen: { ...g, xMin: (g.xMin ?? 0) + dx, xMax: (g.xMax ?? 0) + dx },
  };
}

/**
 * Mehrere Szenen zu einer vereinen.
 *
 * Die Grenzen umschliessen alles; die Legende wird nach ihrem Schluessel
 * zusammengefasst, damit ein Bauteil, das in zwei Tragwerken vorkommt, nicht
 * zweimal in der Liste steht.
 *
 * DER SCHNITT GEHOERT DEM AKTIVEN. Zwei Nachweisschnitte in einem Bild waeren
 * zwei Antworten auf eine Frage - gezeigt wird der des Tragwerks, das gerade
 * gerechnet ist.
 */
export function szenenVereinen(teile) {
  const da = teile.filter(Boolean);
  if (!da.length) return null;
  if (da.length === 1) return da[0];
  const sammle = (k) => da.flatMap((s) => s[k] ?? []);
  const gz = da.map((s) => s.grenzen ?? {});
  const min = (k) => Math.min(...gz.map((g) => g[k]).filter(Number.isFinite));
  const max = (k) => Math.max(...gz.map((g) => g[k]).filter(Number.isFinite));
  const legende = new Map();
  da.forEach((s) => (s.legende ?? []).forEach((e) => {
    if (!legende.has(e.key ?? e.label)) legende.set(e.key ?? e.label, e);
  }));
  const bereiche = {};
  da.forEach((s) => Object.entries(s.bereiche ?? {}).forEach(([k, v]) => {
    bereiche[k] = Math.max(bereiche[k] ?? 0, v);
  }));
  return {
    flaechen: sammle('flaechen'), linien: sammle('linien'),
    marken: sammle('marken'), masse: sammle('masse'),
    bauteiltitel: sammle('bauteiltitel'), vektoren: sammle('vektoren'),
    lastflaechen: sammle('lastflaechen'),
    schnitt: da.find((s) => s.aktiv)?.schnitt ?? da[0].schnitt ?? null,
    // Wie der Schnitt gehoert auch seine Stelle dem aktiven Tragwerk.
    xNachweis: (da.find((s) => s.aktiv) ?? da[0]).xNachweis,
    schnittAktiv: (da.find((s) => s.aktiv) ?? da[0]).schnittAktiv,
    stationen: sammle('stationen'),
    legende: [...legende.values()], bereiche,
    grenzen: { xMin: min('xMin'), xMax: max('xMax'),
               yMin: min('yMin'), yMax: max('yMax'),
               zMin: min('zMin'), zMax: max('zMax') },
  };
}

/**
 * DIE BILDGRENZEN.
 *
 * Beim Joch spannen sie sich zwischen den Gurtenden auf: x von 0 bis L, quer
 * und hoch die Huelle des Querschnitts. Das genuegt, solange ein Joch dasteht.
 *
 * EIN EINZELMAST HAT WEDER L NOCH HUELLE. Beides ist null, und die Grenzen
 * hatten damit keine Ausdehnung - die Einpassung fand nichts, worauf sie
 * haette zoomen koennen, und das Bild blieb leer, obwohl 672 Mastflaechen
 * darin standen. Dort werden die Grenzen deshalb aus den GEZEICHNETEN
 * Koerpern genommen; sie sind die Wahrheit ueber das, was zu sehen ist.
 *
 * Beim Joch bleibt es beim bisherigen Weg: er ist eingespielt, und ein
 * anderer Zoom waere eine Aenderung ohne Anlass.
 */
function grenzenVon(m, qs, flaechen, z) {
  const zMin = Math.min(qs.huelle.z0 * MM, z.zUnten, z.mastFussZ, ...z.zAT);
  const zMax = Math.max(qs.huelle.z1 * MM, z.mastKopfZ, ...z.zAT, ...z.zTitel);
  if (!m.qsErsatz) {
    return { xMin: 0, xMax: m.L,
             yMin: qs.huelle.y0 * MM, yMax: qs.huelle.y1 * MM, zMin, zMax };
  }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  flaechen.forEach((f) => f.punkte.forEach((p) => {
    if (p[0] < x0) x0 = p[0];
    if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[1] > y1) y1 = p[1];
  }));
  // Nichts gezeichnet: lieber ein kleiner Ausschnitt als eine Nullflaeche,
  // durch die die Einpassung teilt.
  if (!Number.isFinite(x0)) { x0 = -0.5; x1 = 0.5; y0 = -0.5; y1 = 0.5; }
  return { xMin: x0, xMax: x1, yMin: y0, yMax: y1, zMin, zMax };
}

export function erzeugeSzene(m, erg) {
  // Ohne Joch gibt es keinen Jochquerschnitt - der Ersatz laesst die
  // Schleifen leer laufen, damit der REST wie immer entsteht (core.vierendeel.js,
  // qsErsatz). Der Mast wird dadurch vom selben Code gezeichnet wie sonst.
  const qs = m?.qsErsatz ?? querschnitt(m);
  const flaechen = [];
  const linien = [];
  const marken = [];
  const masse = [];        // klickbare Bemassungen
  /*
   * BAUTEILTITEL: was hier steht, und wie lang es ist.
   *
   * Der Fensterkopf trug die Zeile «J90 · 15.00 m · 21 Stationen» ueber dem
   * Bild. Sie gehoert aber ans BAUTEIL, nicht an den Rahmen: wer den Masten
   * ansieht, will dessen Profil lesen, und wer das Joch ansieht, dessen Typ.
   * Am Rahmen steht beides nebeneinander und keines dort, wo es gilt.
   *
   * Sie tragen `feld` und fuehren angeklickt in die Eingabe - derselbe Weg,
   * den die Masszahlen schon gehen.
   */
  const bauteiltitel = [];
  const vektoren = [];     // Kraftpfeile

  const stationen = m.stationsListe ?? [];
  const knoten = erg?.knoten ?? [];

  /**
   * Kennwerte eines Bauteils an der Station i - die Grössen, die sich im
   * Modell auftragen lassen.
   *
   * Nicht jede Grösse ist für jedes Bauteil definiert: ein Gurtwinkel hat
   * keine ausgewiesene Querkraft (die Rahmenquerkraft steckt im Blech), ein
   * Bindeblech keine Normalkraft. Solche Felder bleiben null und werden im
   * Modell neutral eingefärbt statt mit einem erfundenen Wert.
   */
  const kennwerte = (i, teil) => {
    const k = knoten[i];
    if (!k) return null;
    if (teil.startsWith('OG') || teil.startsWith('UG')) {
      const e = k.ecken?.find((c) => c.id === teil);
      if (!e) return null;
      // M am Gurt ist das ÖRTLICHE Rahmenmoment des Vierendeelfeldes, in
      // allen vier Winkeln einer Station gleich. Es wirkt um ZWEI Achsen:
      // M_y aus den Vertikal-, M_z aus den Horizontalebenen. Aufgetragen wird
      // das GRÖSSERE der beiden - nur M_y zu zeigen färbte den Gurt zu
      // günstig ein, sobald der Wind regiert (dort ist M_z der grössere).
      const M = Math.max(Math.abs(k.My_lokal ?? 0), Math.abs(k.Mz_lokal ?? 0));
      return { eta: e.eta, sig_v: e.sig_v, sig: e.sig_N, N: e.N,
               M: Number.isFinite(M) ? M : null, V: null };
    }
    const e = k.ebenen?.find((c) => c.id === teil);
    if (!e || e.eta === null) return null;
    return { eta: e.eta, sig_v: e.sig_v, sig: e.sig, N: null,
             M: e.M ?? null, V: e.V ?? null };
  };

  // --- Farbschlüssel der Bauteildarstellung --------------------------------
  // Jede Blechposition und jedes Gurtprofil bekommt eine eigene Farbe. Die
  // Vergabe läuft in der Reihenfolge des ersten Auftretens, damit die Legende
  // dieselbe Ordnung hat wie das Modell.
  const bauteile = new Map();
  const farbeFuer = (schluessel, label, art) => {
    if (!bauteile.has(schluessel)) {
      bauteile.set(schluessel, {
        schluessel, label, art, farbe: bauteilFarbe(bauteile.size), anzahl: 0,
      });
    }
    const e = bauteile.get(schluessel);
    e.anzahl++;
    return e.farbe;
  };

  // --- Verjüngte Enden (Altbauweise) --------------------------------------
  // Der Untergurt steigt zum Auflager hin an, der Obergurt bleibt gerade.
  const ugAnhebung = m.ugVersatz ? (x) => m.ugVersatz(x) * MM : () => 0;
  const versatz = (gurt, x) => (gurt === 'UG' ? ugAnhebung(x) : 0);

  // --- Knick im Grundriss --------------------------------------------------
  // Die halbe Breitenänderung je Gurt, als Ausweitung nach aussen [m].
  const breiteAus = (gurt, x) => {
    if (!m.jbbAn) return 0;
    const w = m.jbbAn(x);
    const soll = gurt === 'OG' ? m.jbbOG : m.jbbUG;
    return ((gurt === 'OG' ? w.og : w.ug) - soll) / 2 * MM;
  };
  /** Querschnittspolygon eines Winkels an der Stelle x, seitlich verschoben. */
  const polyAn = (w, x) => {
    const d = breiteAus(w.gurt, x) / MM * (w.ferse.y >= 0 ? 1 : -1);
    return d === 0 ? w.poly : w.poly.map((p) => [p[0] + d, p[1]]);
  };
  // Neigung der Untergurtebene [m/m], für die schräg liegenden Bleche
  const ugNeigung = (x) => {
    const d = 0.05;
    const x1 = Math.min(m.L, x + d), x0 = Math.max(0, x - d);
    return (ugAnhebung(x1) - ugAnhebung(x0)) / (x1 - x0 || 1);
  };

  // --- Gurte: je Feld ein Prisma, damit die Farbe lokal wechseln kann ------
  qs.winkel.forEach((w) => {
    const fb = farbeFuer(`profil|${w.prof.name}`, w.prof.name, 'profil');
    for (let i = 0; i < stationen.length - 1; i++) {
      const x0 = stationen[i].x, x1 = stationen[i + 1].x;
      flaechen.push(...prisma(polyAn(w, x0), x0, x1, {
        gruppe: 'profil', teil: w.id, station: i, farbeBauteil: fb,
        werte: kennwerte(i, w.id), label: `${w.label} · ${w.prof.name}`,
      }, versatz(w.gurt, x0), versatz(w.gurt, x1), polyAn(w, x1)));
    }
  });

  // --- Bindebleche ---------------------------------------------------------
  const zOben = qs.bindebleche.horizontal[0].z * MM;
  const zUnten = qs.bindebleche.horizontal[1].z * MM;
  const yLinks = qs.bindebleche.vertikal[0].y * MM;
  const yRechts = qs.bindebleche.vertikal[1].y * MM;
  const zu = (x) => zUnten + ugAnhebung(x);

  stationen.forEach((st, i) => {
    const bv = st.vertikal, bh = st.horizontal;
    // Im Grundrissknick wandern die Vertikalebenen nach aussen.
    const aus = breiteAus('OG', st.x);
    const yL = yLinks - aus, yR = yRechts + aus;
    if (bv) {
      const fb = farbeFuer(`blech|V|${bv.pos}|${bv.breite}x${bv.dicke}`,
                           `Vertikalblech Pos ${bv.pos} · ${bv.breite}×${bv.dicke}`, 'blech');
      [['V_L', yL], ['V_R', yR]].forEach(([id, y]) => {
        flaechen.push(...platte(st.x, bv.breite, 'y', y, zu(st.x), zOben, {
          gruppe: 'blech', teil: id, station: i, dicke: bv.dicke, farbeBauteil: fb,
          werte: kennwerte(i, id), label: `${id} · Pos ${bv.pos} · ${bv.breite}×${bv.dicke}`,
        }));
      });
    }
    if (bh) {
      const fb = farbeFuer(`blech|H|${bh.pos}|${bh.breite}x${bh.dicke}`,
                           `Horizontalblech Pos ${bh.pos} · ${bh.breite}×${bh.dicke}`, 'blech');
      // Das Blech der Untergurtebene liegt in der Schräge und ist entsprechend
      // geneigt eingebaut (Schnitt B-B der Konstruktionszeichnung).
      [['H_O', zOben, 0], ['H_U', zu(st.x), ugNeigung(st.x)]].forEach(([id, z, n]) => {
        flaechen.push(...platte(st.x, bh.breite, 'z', z, yL, yR, {
          gruppe: 'blech', teil: id, station: i, dicke: bh.dicke, farbeBauteil: fb,
          werte: kennwerte(i, id), label: `${id} · Pos ${bh.pos} · ${bh.breite}×${bh.dicke}`,
        }, n));
      });
    }
  });

  // --- Schwerachsen: das Stabmodell, in der Farbe des Resultats -------------
  // Sie sind die Stäbe des Rechenmodells und werden deshalb AUSGEZOGEN
  // gezeichnet, nicht strichpunktiert: eine Strichpunktlinie meint eine
  // Symmetrie- oder Hilfsachse, hier steht aber ein tragendes Bauteil.
  //
  // FELDWEISE, GENAU WIE DIE VOLUMENKÖRPER. Früher trug die ganze Gurtachse
  // EINE Farbe - die der höchstbeanspruchten Station. Das war als Hinweis
  // gedacht, gab aber ein falsches Bild: eine durchgehend rote Linie über ein
  // Joch, das nur an einer Stelle rot ist. Jetzt bekommt jedes Feld die
  // Kennwerte seines Feldes, dieselben, mit denen auch das Prisma eingefärbt
  // wird. Ohne Körper gelesen ist das Bild damit dasselbe wie mit ihnen - und
  // genau deshalb braucht es keinen eigenen «Stabmodell»-Schalter mehr:
  // Gurtprofile und Bindebleche lassen sich einzeln ausblenden, übrig bleibt
  // das Stabmodell.
  const achsFelder = [];
  for (let i = 0; i < stationen.length - 1; i++) {
    achsFelder.push({ i, x0: stationen[i].x, x1: stationen[i + 1].x });
  }
  // Überstände bis zu den Gurtenden: sie tragen die Kennwerte der äussersten
  // Station, denn ein eigenes Feld sind sie nicht.
  if (stationen.length) {
    if (stationen[0].x > 1e-9) achsFelder.unshift({ i: 0, x0: 0, x1: stationen[0].x });
    const letzte = stationen[stationen.length - 1];
    if (letzte.x < m.L - 1e-9) {
      achsFelder.push({ i: stationen.length - 1, x0: letzte.x, x1: m.L });
    }
  }
  if (!achsFelder.length) achsFelder.push({ i: 0, x0: 0, x1: m.L });

  qs.winkel.forEach((w) => {
    const s = w.schwerpunkt.y >= 0 ? +1 : -1;
    const pt = (x) => [x, w.schwerpunkt.y * MM + s * breiteAus(w.gurt, x),
                       w.schwerpunkt.z * MM + versatz(w.gurt, x)];
    achsFelder.forEach((f) => {
      linien.push({
        gruppe: 'achse', gurt: true, stark: true, station: f.i,
        werte: kennwerte(f.i, w.id), punkte: [pt(f.x0), pt(f.x1)],
        label: `Schwerachse ${w.id}`,
      });
    });
  });
  linien.push({ gruppe: 'achse', stark: true, punkte: [[0, 0, 0], [m.L, 0, 0]],
                label: 'Systemachse' });

  // Die Bindebleche als Achsen - ebenfalls mit ihren eigenen Kennwerten, sonst
  // wäre das Fachwerk halb eingefärbt und halb grau.
  stationen.forEach((st, i) => {
    const aus = breiteAus('OG', st.x);
    const zU = zUnten + ugAnhebung(st.x);
    if (st.vertikal) {
      [['V_L', yLinks - aus], ['V_R', yRechts + aus]].forEach(([id, y]) => {
        linien.push({ gruppe: 'achse', blechachse: true, station: i,
                      werte: kennwerte(i, id), label: `Blechachse ${id}`,
                      punkte: [[st.x, y, zU], [st.x, y, zOben]] });
      });
    }
    if (st.horizontal) {
      [['H_O', zOben], ['H_U', zU]].forEach(([id, z]) => {
        linien.push({ gruppe: 'achse', blechachse: true, station: i,
                      werte: kennwerte(i, id), label: `Blechachse ${id}`,
                      punkte: [[st.x, yLinks - aus, z], [st.x, yRechts + aus, z]] });
      });
    }
  });

  // --- Auflagerdefinition ---------------------------------------------------
  // EIGENE EBENE, weil es eine eigene Frage ist. Die Auflagerbedingung war der
  // grösste einzelne Fehler beim Nachbau eines geprüften FEM-Modells - eine
  // geschätzte Drehfeder um Faktor 3 daneben, die Stützweite um 5 %. Beides
  // sieht man dem Ergebnis nicht an, wenn es nirgends steht. Hier steht es:
  // wo das Auflager wirklich sitzt, wie steif es ist, worauf es steht.
  //
  // WO ES SITZT: nicht am Gurtende, sondern an der Mastachse. Bisher stand die
  // Marke bei x = 0 und x = L - mit Kragarmen also am falschen Ort.
  const xA = m.kragA ?? 0;
  const xB = m.L - (m.kragB ?? 0);
  const federn = m.federn ?? {};
  // Kurz halten: die Zeile steht im Bild, nicht in einer Tabelle. Die Einheit
  // kNm/rad ist die einzige, die hier vorkommt, und κ steht im Handbuch.
  const cText = (c) => (c >= 1e11 ? 'starr eingespannt'
    : !(c > 0) ? 'gelenkig' : `c_φ ${Math.round(c)}`);

  /*
   * WIE TIEF DAS BILD REICHT. Steht ein Mast im Modell, gehoert er ganz
   * hinein - er wird ueber seine Hoehe bemasst, und Anbauteile am Masten
   * sitzen auf dieser Hoehe. Ohne ihn in den Grenzen bliebe er beim
   * Einpassen halb ausserhalb.
   */
  let mastFussZ = Infinity;
  let mastKopfZ = -Infinity;
  /*
   * WO DIE MASTEN STEHEN - fuer die Baugruppen, die an ihnen haengen.
   *
   * Eine Baugruppe am Masten misst ihre Hoehe AB FUNDAMENT, nicht ab Joch.
   * Die Zeichenschleife weiter unten braucht dafuer den Fusspunkt je Ende;
   * ohne ihn zeichnete sie das Teil an die Jochachse - dorthin, wo es
   * gerade nicht sitzt.
   */
  const mastGeo = {};

  [['A', xA, federn.cA, m.kappaA, federn.mastA ?? federn.mast],
   ['B', xB, federn.cB, m.kappaB, federn.mastB ?? federn.mast]].forEach(
    ([name, x, cPhi, kappa, mast]) => {
      /*
       * >>> EIN GETEILTER MAST WIRD NUR EINMAL GEZEICHNET. <<<
       *
       * Auf einer Jochreihe baut JEDES Tragwerk beide Enden - P1 den Masten
       * bei x = 20 als sein Ende B, P2 denselben als sein Ende A. Im Bild
       * standen dort zwei Koerper ineinander, mit doppelten Windpfeilen und
       * flackernden Flaechen, wo sie sich schneiden.
       *
       * Gemeldet am 3. September: «die darstellung des masten hier bei der
       * zwischenabstuetzung scheint nicht sauber modelliert zu sein, ich
       * denke das ist noch ein ueberbleibsel der geteilten masten
       * auslegung.» Genau das war es.
       *
       * WER ihn zeichnet, entscheidet `blattSzene`: das gerechnete
       * Tragwerk, wenn es ihn traegt - dann bekommt er die Ausnutzung -,
       * sonst das erste. Ohne Angabe zeichnen beide Enden wie bisher, damit
       * ein einzelnes Tragwerk unveraendert bleibt.
       */
      if (m.mastZeichnen && m.mastZeichnen[name] === false) return;
      const z0 = zu(x);
      /*
       * DER MAST ALS KOERPER, UEBER SEINE GANZE HOEHE (Weisung).
       *
       * Er stand bisher als zwei Striche da, auf einen Stummel gekuerzt -
       * «die Aussage ist die Lagerung, nicht die Masthoehe». Das galt,
       * solange der Mast nur eine Randbedingung war. Er ist seither Teil des
       * Tragwerks: er steht als Stab im ausgeleiteten Modell, und man haengt
       * Anbauteile an ihn, die ueber ihre HOEHE am Masten sitzen. Wer die
       * Hoehe nicht sieht, kann sie nicht treffen.
       *
       * Gezeichnet wird der wirkliche Querschnitt in der wirklichen
       * Stegrichtung - ein HEB 260 quer sieht anders aus als laengs, und
       * genau das entscheidet ueber die starke Achse.
       */
      const H = mast?.H > 0 ? mast.H : Math.max(0.8, (zOben - zUnten) * 2.5);
      const zF = z0 - H;
      /*
       * WIE HOCH DER MAST REICHT.
       *
       * Mindestens einen halben Meter ueber den Obergurt - das ist die
       * stehende Vorgabe, und «ueber den Obergurt» meint die Oberkante des
       * Profils, nicht die Jochachse.
       *
       * Ist eine GESAMTLAENGE angegeben, gilt sie: der lange Mast mit
       * Zusatzleitern ragt weit ueber das Joch, und oben sitzen die
       * Traversen. Die kuerzere der beiden Angaben gewinnt nie - eine
       * Laenge, die unter dem Mindestueberstand bliebe, waere keine
       * Zeichnung, sondern ein Tippfehler.
       */
      const zKopf = Math.max(qs.huelle.z1 * MM + MAST_UEBERSTAND,
                             zF + (mast?.laenge > 0 ? mast.laenge : 0));
      mastGeo[name] = { x, zF, zKopf, H, koerper: Boolean(mast?.profil) };
      if (mast?.profil) {
        mastFussZ = Math.min(mastFussZ, zF);
        mastKopfZ = Math.max(mastKopfZ, zKopf);
        const poly = iProfilPoly(mast.profil, mast.stegrichtung?.achse ?? 'y');
        /*
         * DIE MASTEN SIND EINE EIGENE EBENE (Weisung, 28. August: «beim
         * Layer Modell die Masten auch aufnehmen»).
         *
         * Sie lagen in der Ebene `auflager` - dort, wo Auflagerdreieck,
         * Feder und Kragarmmarke stehen. Solange der Mast eine
         * Randbedingung war, stimmte das. Er ist seither ein BAUTEIL: er
         * traegt Wind, er traegt Anbauteile, er wird ausgeleitet. Und weil
         * er hoch ist, verdeckt er in der Laengsansicht das halbe Joch -
         * man muss ihn allein wegnehmen koennen, ohne die Lagerung zu
         * verlieren.
         */
        /*
         * DIE STEGRICHTUNG GEHOERT INS LABEL.
         *
         * Gezeichnet wird die wirkliche I-Form in der wirklichen Drehlage -
         * daran ist nichts falsch. Nur sieht man es bei den HEB-Profilen
         * NICHT: HEB 200 bis 260 sind quadratisch (h = b), die Silhouette
         * bleibt beim Drehen dieselbe, und nur die Einbuchtungen zwischen den
         * Flanschen wandern - je nach Blickrichtung unsichtbar. Vier der
         * fuenf Mastprofile sind so; einzig der HEM 240 (270/248) zeigt es.
         *
         * Der Eindruck «die Zeichnung passt sich nicht an» kommt daher. Was
         * hilft, ist nicht mehr Geometrie, sondern die Angabe im Klartext -
         * zumal sie ueber die starke Achse entscheidet.
         */
        const stegText = mast.stegrichtung?.achse === 'y'
          ? 'Steg quer zum Gleis' : 'Steg längs zum Gleis';
        const grund = `Mast ${name} · ${mast.profil.name} · ${stegText}`;
        /*
         * DER MAST TRAEGT SEINE AUSNUTZUNG (Weisung, 1. September).
         *
         * Er stand als EIN Koerper da, einfarbig, waehrend jedes Blech und
         * jeder Gurt seinen Kennwert zeigte. Dabei ist gerade am Masten der
         * VERLAUF die Auskunft: die Ausnutzung waechst zum Fuss hin, und bei
         * teilweiser Einspannung nimmt sie zum Joch hin wieder zu.
         *
         * Gezeichnet wird deshalb je Abschnitt zwischen zwei Stationen ein
         * eigenes Prisma. Massgebend ist der UNGUENSTIGERE der beiden
         * Endwerte - ein Abschnitt, der nur seinen unteren Wert zeigte, faerbte
         * die Stelle unter einer Einzellast zu guenstig ein.
         */
        const nw = erg?.mast?.[name];
        const st = nw?.stationen ?? [];
        if (st.length >= 2) {
          for (let i = 0; i < st.length - 1; i++) {
            const u = st[i], o = st[i + 1];
            const zu2 = zF + u.z, zo2 = zF + o.z;
            if (!(zo2 > zu2 + 1e-9)) continue;
            const arg = (f) => Math.max(Math.abs(u[f] ?? 0), Math.abs(o[f] ?? 0));
            const schlimmer = u.eta >= o.eta ? u : o;
            flaechen.push(...prismaZ(poly, x, zu2, zo2, {
              gruppe: 'mast', teil: `MAST_${name}`,
              /*
               * ALLE PLOTGROESSEN, AUCH AM MASTEN (Weisung, 1. September).
               *
               * Moment und Querkraft sind am Masten um Groessenordnungen
               * groesser als im Blech - 50 kNm am Fuss gegen 0.8 kNm im
               * Bindeblech. Beide teilen sich die Skala, der Momentenplot des
               * JOCHS wird dadurch flau. Das ist der Preis, und er ist
               * bewusst bezahlt: gefragt war der Verlauf am Masten.
               */
              werte: {
                eta: schlimmer.eta,
                sig_v: schlimmer.sig,
                sig: Math.abs(schlimmer.sigN ?? 0),
                N: schlimmer.N,
                M: Math.max(arg('Mq'), arg('Ml')),
                V: Math.max(arg('Vq'), arg('Vl')),
              },
              label: `${grund} · ${u.z.toFixed(2)} bis ${o.z.toFixed(2)} m`
                   + ` über Fuss · η ${schlimmer.eta.toFixed(3)}`,
            }));
          }
          /*
           * DER MAST REICHT WEITER ALS DER NACHWEIS.
           *
           * Der Nachweis endet am Mastkopf, wie ihn die LAENGENANGABE
           * bestimmt. Die Zeichnung fuehrt ihn mindestens einen halben Meter
           * ueber den Obergurt (stehende Vorgabe) - ohne Laengenangabe ist
           * das hoeher als die Jochachse, an der die Stationen aufhoeren.
           *
           * Ohne dieses Stueck endete der gezeichnete Mast an der letzten
           * Station: der Kopf lag 0.25 m UNTER dem Obergurt statt 0.50 m
           * darueber, und der Ueberstand mit seinen Traversen fehlte im Bild.
           */
          const zLetzt = zF + st[st.length - 1].z;
          if (zKopf > zLetzt + 1e-9) {
            flaechen.push(...prismaZ(poly, x, zLetzt, zKopf, {
              gruppe: 'mast', teil: `MAST_${name}`,
              label: `${grund} · Überstand über den Nachweis`,
            }));
          }
        } else {
          // Ohne Nachweis bleibt er ein Koerper ohne Kennwert - neutral
          // eingefaerbt statt mit einer erfundenen Zahl.
          flaechen.push(...prismaZ(poly, x, zF, zKopf, {
            gruppe: 'mast', teil: `MAST_${name}`,
            label: `${grund} · ${mast.H.toFixed(2)} m`,
          }));
        }
      }
      const halb = (mast ? (mast.stegrichtung?.achse === 'y'
        ? mast.profil.b : mast.profil.h) : 160) / 2 * MM;
      // Die ANDERE Halbbreite - in Jochachse. Der Wind quer zum Gleis drueckt
      // gegen diese Flanke, und sein Pfeil hat davor zu stehen.
      mastGeo[name].halbY = halb;
      mastGeo[name].halbX = (mast ? (mast.stegrichtung?.achse === 'y'
        ? mast.profil.h : mast.profil.b) : 160) / 2 * MM;
      // Ohne Mast bleibt der Stummel aus zwei Strichen: dort gibt es keinen
      // Koerper, sondern nur die Aussage «hier wird gelagert».
      if (!mast?.profil) {
        [-halb, +halb].forEach((dy) => {
          linien.push({ gruppe: 'mast', mast: true,
                        punkte: [[x, dy, z0], [x, dy, zF]] });
        });
        linien.push({ gruppe: 'mast', mast: true,
                      punkte: [[x, -halb, zF], [x, +halb, zF]] });
      }
      // Fussschraffur - der Mast ist am Fuss eingespannt.
      for (let k = -2; k <= 2; k++) {
        const y = (k / 2) * halb;
        linien.push({ gruppe: 'mast',
                      punkte: [[x, y, zF], [x, y - 0.12 * halb, zF - 0.14 * H]] });
      }
      /*
       * DAS LAGER SITZT AM MASTFUSS (Weisung), nicht an der Jochachse.
       *
       * Dort steht das Fundament, und dort ist eingespannt. An der Jochachse
       * sitzt kein Lager, sondern der ANSCHLUSS ans Joch - die Drehfeder
       * c_phi, die die Nachgiebigkeit des Mastes zusammenfasst. Die Marke an
       * der Jochachse las sich wie ein Auflager und war damit die Aussage,
       * die beim Nachbau eines geprueften FEM-Modells am teuersten war.
       *
       * Ohne Mast gibt es keinen Fuss - dann bleibt die Marke am Joch.
       */
      marken.push({ gruppe: 'auflager', art: 'auflager',
                    p: [x, 0, mast?.profil ? zF : z0], text: name });
      /*
       * DIE MASTEN VERMASSEN (Weisung), ab JOCH UNTERKANTE.
       *
       * Das ist genau die Strecke, die als Masthöhe H eingegeben wird - «Fuss
       * bis Jochachse», und die Jochachse ist in dieser Szene die Untergurt-
       * ebene. Das Mass zeigt also die eingetippte Zahl und nicht eine, die
       * man erst umrechnen muss.
       *
       * Ist eine Gesamtlänge angegeben, steht sie daneben: so ist es auf dem
       * Querprofil angeschrieben - «DP26 / 12.5 m» und ha = 8.31 zugleich.
       */
      if (mast?.profil) {
        /*
         * NACH AUSSEN VERSETZT, in der JOCHACHSE - nicht quer.
         *
         * Angesehen wird der Mast in der Längsansicht; ein Versatz quer läge
         * dort genau hinter ihm und wäre unsichtbar. Ende A weicht nach
         * links aus, Ende B nach rechts: beide ins Freie neben dem Joch,
         * wo sonst nichts steht.
         */
        const seite = name === 'A' ? -1 : +1;
        masse.push({
          feld: name === 'A' ? 'mastH' : 'mastHB', tab: 'aufl', achse: 'z',
          p0: [x, 0, zF], p1: [x, 0, z0], ab: [seite, 0, 0], d: 0.75,
          text: `H${name === 'B' ? '_B' : ''} = ${mast.H.toFixed(2)} m`,
        });
        if (mast.ueberstand > 0) {
          masse.push({
            feld: name === 'A' ? 'mastLaenge' : 'mastLaengeB', tab: 'aufl',
            achse: 'z',
            p0: [x, 0, zF], p1: [x, 0, zKopf], ab: [seite, 0, 0], d: 1.45,
            text: `L_M = ${mast.laenge.toFixed(2)} m`,
          });
        }
      }
      // ZWEIZEILIG UND KURZ. Als eine Zeile war die Angabe breiter als das
      // halbe Bild und überdeckte das Joch: oben das Bauteil, unten die
      // Lagerung, beides ohne ausgeschriebene Wörter.
      marken.push({ gruppe: 'auflager', art: 'auflagertext', p: [x, 0, zF],
                    zeilen: [
                      mast ? `${mast.profil.name} · ${mast.H.toFixed(1)} m` : null,
                      [cText(cPhi ?? 0),
                       Number.isFinite(kappa)
                         ? `κ ${(100 * Math.max(0, Math.min(1, kappa))).toFixed(0)} %`
                         : null].filter(Boolean).join(' · '),
                    ].filter(Boolean) });
    });

  // Kragarme: die Strecke zwischen Gurtende und Auflager, damit sichtbar ist,
  // dass die Stützweite kürzer ist als L.
  [[0, xA], [xB, m.L]].forEach(([k0, k1]) => {
    if (k1 - k0 < 1e-6) return;
    linien.push({ gruppe: 'auflager', kragarm: true,
                  punkte: [[k0, 0, zu(k0)], [k1, 0, zu(k1)]] });
  });

  // ==========================================================================
  //  ANBAUTEILE UND LASTEN
  // ==========================================================================
  // Ein Anbauteil ist am Joch ANGESCHLAGEN, nicht daneben aufgehängt. Die
  // Anschlusspunkte liegen deshalb auf den SCHWERACHSEN DER GURTWINKEL - also
  // dort, wo die Winkel wirklich stehen (y = ±jbb/2), nicht in der Mitte
  // zwischen ihnen.
  //
  //   'durchgehend'   Jochaufsatz und Hängestütze: das Vertikalelement läuft
  //                   über die ganze Jochhöhe und ist an Ober- UND Untergurt
  //                   angeschlagen. Je Gurt ein Querriegel zwischen den beiden
  //                   Winkeln -> VIER Anschlusspunkte, und man sieht, wie die
  //                   Kraft auf alle vier verteilt wird.
  //   'oben'/'unten'  Leiter, Konsole, Fahrleitung: nur an einem Gurt
  //                   angeschlagen -> zwei Anschlusspunkte.
  //
  // In Jochachse sitzt der Anschluss über die Länge "raster"; das entspricht
  // der Lastverteilung auf x ∓ raster/2 in core.anbauteile.js.

  // JEDES MODUL AUF SEINER EIGENEN HÖHE
  //
  // Eine Baugruppe ist kein einzelner Punkt: die Hängestütze hängt auf einer
  // anderen Höhe als der NT-Ausleger daran und dieser wieder anders als die
  // Fahrleitung. Gezeichnet wird deshalb NICHT die Baugruppe, sondern jedes
  // aufgelöste Teil - dieselbe Liste, mit der auch gerechnet wird. Nur so
  // stimmt das Bild mit dem Ergebnis überein.
  const teile = (m.teile ?? []).filter((t) => t.aktiv !== false);
  // Massstab der Pfeile über ALLE Einzelanteile, nicht über die Summen: sonst
  // würde ein grosser Gesamtwert alle Einzelpfeile zu Strichen schrumpfen.
  // Auch die Teile am Masten zaehlen mit: waeren sie nicht dabei und truege
  // eines von ihnen die groesste Kraft, ragte sein Pfeil aus dem Bild.
  const maxKraft = Math.max(1e-6, ...[...teile, ...(m.anbauMastFlach ?? [])]
    .flatMap((a) => Object.values(a.proGruppe ?? {}).flatMap(
      (k) => [Math.abs(k.Fx), Math.abs(k.Fy), Math.abs(k.Fz)])));
  const pfeilRef = Math.max(0.45, (zOben - zUnten) * 1.15);
  /*
   * JEDER PFEIL BLEIBT SICHTBAR (Weisung, 28. August: «die Lastvektoren
   * werden nicht angezeigt»).
   *
   * Sie WAREN da - nur zu kurz zum Sehen. Die Laenge ist auf die groesste
   * Kraft im Modell bezogen, und am Masten haengen kleine Teile: ein
   * Rueckleiter mit 0.30 kN neben einem Kettenwerk mit 5 kN ergibt einen
   * Pfeil von wenigen Zentimetern - im Bild ein Punkt. Eine Last, die
   * gerechnet wird und nicht zu sehen ist, ist schlimmer als keine
   * Darstellung: man haelt die Stelle fuer unbelastet.
   *
   * MINDESTLAENGE statt anderer Skala. Eine Wurzel- oder Logarithmusskala
   * haette jeden Pfeil verzerrt; so bleibt der Vergleich der grossen Pfeile
   * untereinander massstaeblich, und nur die kleinsten wachsen auf ein Mass,
   * das man noch sieht. Die Zahl steht ohnehin daneben.
   */
  const PFEIL_MIN = 0.22;
  const pfeilLaenge = (kraft) => Math.max(PFEIL_MIN,
    Math.abs(kraft) / maxKraft) * pfeilRef;

  // Schwerachsen der Gurte: z je Gurt, y je Winkel (links/rechts).
  const zsOG = (qs.byId.OG_L.schwerpunkt.z + qs.byId.OG_R.schwerpunkt.z) / 2 * MM;
  const zsUG = (qs.byId.UG_L.schwerpunkt.z + qs.byId.UG_R.schwerpunkt.z) / 2 * MM;
  /** y-Lage eines Gurtwinkels an der Stelle x, Grundrissknick berücksichtigt. */
  const ysWinkel = (id, gurt, x) => {
    const y = qs.byId[id].schwerpunkt.y * MM;
    return y + (y >= 0 ? +1 : -1) * breiteAus(gurt, x);
  };
  const zGurt = (gurt, x) => (gurt === 'OG' ? zsOG : zsUG + ugAnhebung(x));

  // Aufgelöste Teile nach ihrer Baugruppe ordnen.
  const nachGruppe = new Map();
  teile.forEach((t) => {
    const s = t.baugruppe ?? t.id;
    if (!nachGruppe.has(s)) nachGruppe.set(s, []);
    nachGruppe.get(s).push(t);
  });
  /*
   * DIE TEILE AM MASTEN LIEGEN IN EINER EIGENEN LISTE.
   *
   * Sie gehen nicht in den Ersatzbalken ein und stehen deshalb nicht in
   * `m.teile`. Wer sie hier vergisst, zeichnet die Baugruppe trotzdem - nur
   * ohne ihre Teile, an der Stelle x der Baugruppe. Und x ist am Masten
   * IMMER null. Genau so sass der Rueckleiter am Mast auf 7 m Hoehe im Bild
   * am linken Jochende: die Schleife kannte nur das Joch.
   */
  const nachGruppeMast = new Map();
  (m.anbauMastFlach ?? []).filter((t) => t.aktiv !== false).forEach((t) => {
    const s = t.baugruppe ?? t.id;
    if (!nachGruppeMast.has(s)) nachGruppeMast.set(s, []);
    nachGruppeMast.get(s).push(t);
  });

  /** Umriss der Anbauteile für den Einzelheitsblick. */
  const detailBereiche = [];

  /*
   * EINE BAUGRUPPE AM MASTEN.
   *
   * >>> IHR NULLPUNKT IST DER MASTFUSS, NICHT DAS JOCH. <<<
   *
   * Am Joch sagt `x`, wo die Baugruppe sitzt, und `z` misst ab der
   * Schwerachse des Gurtes, an dem sie haengt. Am Masten gilt beides nicht:
   * dort steht `hMast` - die Hoehe UEBER FUNDAMENT, die Angabe, die in der
   * Zeichnung und auf der Baustelle steht -, und `z` eines Teils misst ab
   * dem Anschlusspunkt auf der Mastachse.
   *
   * X IST GLOBAL, AN BEIDEN ENDEN (Weisung, 28. August). Hier stand eine
   * Spiegelung am Ende B - «der Arm weist ins Feld hinein». Sie gab dem Feld
   * `x` eine zweite Bedeutung: dieselbe Zahl zeigte am Mast A nach rechts
   * und am Mast B nach links. Gezeichnet wird dieselbe Kette wie in der
   * Ausleitung; wuerde hier anders gerechnet als dort, sagte das Bild etwas
   * anderes als das Modell.
   */
  const zeichneAmMast = (a, k, ort) => {
    const ende = ort === 'mastB' ? 'B' : 'A';
    const g = mastGeo[ende];
    if (!g) return;
    const meine = nachGruppeMast.get(a.id) ?? [];
    const fb = farbeFuer(`anbau|${a.vorlage ?? a.name}`, a.name, 'anbau');
    const teilKey = `AT${k}`;
    const zWurzel = g.zF + (a.hMast ?? 0);
    const opt = (label) => ({ gruppe: 'anbau', teil: teilKey, farbeBauteil: fb,
                              werte: null, label: `${a.name} · ${label}`,
                              anbauteil: a });
    // Vom Mast in die Welt: x global wie am Joch, z ab dem Anschluss.
    const welt = (p) => [g.x + (p.x ?? 0), p.y ?? 0, zWurzel + (p.z ?? 0)];

    // Der Anschluss an der Mastachse - das Gegenstueck zu den vier
    // Anschlusspunkten am Joch. Am Masten ist es einer.
    flaechen.push(...quader([g.x, 0, zWurzel], [0.09, 0.09, 0.09],
      opt(`Anschluss am Mast ${ende} · ${(a.hMast ?? 0).toFixed(2)} m über Fundament`)));

    const kette = anbauKette(meine, { x0: 0, zAn: 0 });
    kette.glieder.forEach((gl) => {
      const p1 = welt(gl.von), p2 = welt(gl.bis);
      const laenge = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
      flaechen.push(...stab(p1, p2, gl.rang === 0 ? 0.045 : 0.038,
        opt(`${gl.teil.bauteilName ?? gl.teil.name} · ${laenge.toFixed(2)} m`)));
    });

    const punkte = [kette.wurzel, ...kette.glieder.map((gl) => gl.bis)].map(welt);
    const zMin = Math.min(zWurzel, ...punkte.map((q) => q[2]));
    const zMax = Math.max(zWurzel, ...punkte.map((q) => q[2]));
    const xMin = Math.min(g.x - 0.3, ...punkte.map((q) => q[0]));
    const xMax = Math.max(g.x + 0.3, ...punkte.map((q) => q[0]));
    detailBereiche.push({ teil: teilKey, id: a.id, index: k, name: a.name,
                          x: g.x, r: 0.3, zMin, zMax, xMin, xMax });

    marken.push({
      gruppe: 'anbau', art: 'anbau', teil: teilKey,
      p: [g.x, 0, zMax],
      text: `A${k + 1}`,
      textLang: `A${k + 1} · ${kurzName(a.name)}`,
      titel: `${a.name} · Mast ${ende}, ${(a.hMast ?? 0).toFixed(2)} m über Fundament`,
      farbe: fb,
    });

    // Angriffspunkte und Kraftpfeile - je Teil an SEINEM Kettenpunkt, nicht
    // an der Wurzel: ein Ausleger traegt am Ende, nicht am Mast.
    kette.belegung.forEach(({ teil: t, punkt }) => {
      const pAn = welt(punkt);
      const kurz = t.bauteilName ?? t.name.split(' · ').slice(-1)[0];
      flaechen.push(...quader(pAn, [0.07, 0.07, 0.07],
        { ...opt(`${kurz} · Angriffspunkt ${(zWurzel + (t.z ?? 0) - g.zF).toFixed(2)} m über Fundament`),
          gruppe: 'last', punkt: true }));
      marken.push({ gruppe: 'last', art: 'lastknoten', p: pAn, teil: teilKey,
                    text: t.rolle === 'drahtwerk' ? 'Leiter' : '',
                    titel: `${t.name} · Angriffspunkt` });
      Object.entries(t.proGruppe ?? {}).forEach(([gruppe, kr]) => {
        [{ k: kr.Fz, ri: [0, 0, -1], nm: 'F_z', bez: 'vertikal' },
         { k: kr.Fy, ri: [0, 1, 0], nm: 'F_y', bez: 'Gleisrichtung' },
         { k: kr.Fx, ri: [1, 0, 0], nm: 'F_x', bez: 'Jochachse' }].forEach((pf) => {
          if (!pf.k) return;
          const istZug = gruppe === 'G' && pf.nm === 'F_x' && t.rolle === 'drahtwerk';
          const art = istZug ? 'leiterzug' : LASTART_VON_GRUPPE[gruppe] ?? 'staendig';
          vektoren.push({
            gruppe: 'last', art: 'last', lastart: art, p: pAn, teil: teilKey,
            v: skal(pf.ri, Math.sign(pf.k) * pfeilLaenge(pf.k)),
            text: `${pf.nm} = ${Math.abs(pf.k).toFixed(2)} kN`,
            titel: `${t.name} · ${LASTARTEN.find((l) => l.key === art).label} · ${pf.bez}`,
          });
        });
      });
    });
  };

  /*
   * DER ZAEHLER LAEUFT UEBER DIE GANZE LISTE, nicht ueber die aktiven.
   *
   * Die Marke heisst `A{k+1}`, die Karte in der Schublade `A{i+1}` - und
   * `zeigeAnbauteil` sucht den Bereich ueber genau diese Nummer. Solange
   * hier vorher gefiltert wurde, stimmten beide nur so lange ueberein, wie
   * kein Teil abgeschaltet war: ein ausgeschaltetes Teil verschob jede
   * folgende Nummer um eins, und der Klick auf A7 oeffnete A8.
   */
  (m.anbauteile ?? []).forEach((a, k) => {
    if (a.aktiv === false) return;
    if (amMast(a)) { zeichneAmMast(a, k, ortVon(a)); return; }
    const meine = nachGruppe.get(a.id) ?? [];
    const r = (a.raster ?? 0.4) / 2;
    const bef = meine[0]?.befestigung
      ?? (((a.module ?? [])[0]?.z ?? 0) <= 0 ? 'unten' : 'oben');
    const gurte = bef === 'durchgehend' ? ['OG', 'UG'] : bef === 'oben' ? ['OG'] : ['UG'];
    const fb = farbeFuer(`anbau|${a.vorlage ?? a.name}`, a.name, 'anbau');
    const teilKey = `AT${k}`;
    // ANBAUTEILE SIND TRAGWERK, NICHT LAST.
    // Sie lagen bisher in der Ebene 'last' und verschwanden mit ihr. Wer die
    // Lasten global abstellte, um das Joch zu sehen, verlor damit auch den
    // Weg, auf dem die Last hereinkommt - Staender, Ausleger, Traverse. Der
    // KOERPER gehoert deshalb in die eigene Ebene 'anbau' (Gruppe Modell);
    // in der Ebene 'last' bleibt nur, was die Last selbst darstellt: der
    // Wuerfel am Angriffspunkt, seine Marke und die Kraftpfeile.
    const opt = (label) => ({ gruppe: 'anbau', teil: teilKey, farbeBauteil: fb,
                              werte: null, label: `${a.name} · ${label}`,
                              anbauteil: a });

    /*
     * DIE KLEMMEN SITZEN AN DEN RASTERENDEN, NICHT IN DER MITTE.
     *
     * >>> Weisung, 28. August: «man kann die Anbindung der Bauteile über
     * unter, ober oder beide Gurte vornehmen. Wenn der Raster noch eingegeben
     * ist, dann verdoppeln sich die Anschlusspunkte.» <<<
     *
     * Genau so rechnet der Kern: das Moment tritt an ZWEI Stationen ein,
     * x₁ = x − raster/2 und x₂ = x + raster/2, und dort bildet es das
     * Kräftepaar (core.anbauteile.js, `zufuegen` und der Torsionsblock).
     *
     * Gezeichnet stand hier EIN Würfel je Winkel, in der Mitte. Die Anzahl
     * stimmte damit zufällig — vier bei durchgehender, zwei bei einseitiger
     * Befestigung —, die STELLEN aber nicht, und die Zahl bedeutete etwas
     * anderes als im Kern: dort zählt Station × Gurtebene, im Bild zählte
     * Gurtebene × Winkel. Zwei Bedeutungen für dieselbe Vier.
     *
     * Jetzt zeigt das Bild die Klemmen, die es wirklich gibt:
     *
     *     einseitig      1 Gurt  × 2 Winkel × 2 Stationen = 4
     *     durchgehend    2 Gurte × 2 Winkel × 2 Stationen = 8
     *
     * Ohne Raster fallen die beiden Stationen zusammen, und es sind halb so
     * viele — auch das sieht man dann.
     */
    const stationen = r > 1e-6 ? [a.x - r, a.x + r] : [a.x];
    gurte.forEach((g) => {
      const yL = ysWinkel(`${g}_L`, g, a.x);
      const yR = ysWinkel(`${g}_R`, g, a.x);
      const bez = g === 'OG' ? 'Obergurt' : 'Untergurt';
      [['links', yL], ['rechts', yR]].forEach(([seite, y]) => {
        // Die Schiene ENTLANG des Winkels über die Länge «raster» - sie
        // verbindet die beiden Klemmen und trägt zwischen ihnen nichts ein.
        if (r > 1e-6) {
          flaechen.push(...stab([a.x - r, y, zGurt(g, a.x - r)],
                                [a.x + r, y, zGurt(g, a.x + r)], 0.032,
                                opt(`Anschlussschiene ${bez} ${seite}`)));
        }
        stationen.forEach((xs) => {
          flaechen.push(...quader([xs, ysWinkel(`${g}_${seite === 'links' ? 'L' : 'R'}`, g, xs),
                                   zGurt(g, xs)], [0.06, 0.06, 0.06],
            opt(`Klemme ${bez} ${seite} · x = ${xs.toFixed(2)} m`)));
        });
      });
      // Querriegel zwischen den beiden Winkeln - hierüber verteilt sich die
      // Kraft des Vertikalelements auf die Klemmen des Gurtes. Je Station
      // einer: dort sitzt das Kräftepaar, nicht dazwischen.
      stationen.forEach((xs) => {
        flaechen.push(...stab([xs, ysWinkel(`${g}_L`, g, xs), zGurt(g, xs)],
                              [xs, ysWinkel(`${g}_R`, g, xs), zGurt(g, xs)], 0.034,
                              opt(`Querriegel ${bez} · x = ${xs.toFixed(2)} m`)));
      });
    });

    // Vertikalelement. Bei durchgehender Befestigung läuft es über die ganze
    // Jochhöhe, also über BEIDE Querriegel - genau das macht den Kraftfluss auf
    // alle vier Anschlusspunkte sichtbar.
    const zOG = zGurt('OG', a.x), zUG = zGurt('UG', a.x);
    if (bef === 'durchgehend') {
      flaechen.push(...stab([a.x, 0, zOG], [a.x, 0, zUG], 0.05,
                            opt('Vertikalelement durch das Joch')));
    }
    // ANSCHLUSSEBENE, ab der die Höhe z eines Teils zählt: die Schwerachse des
    // Gurtes, an dem es abgegriffen wird. Bei durchgehender Befestigung
    // entscheidet das je Modul das Vorzeichen von z - was nach oben ragt, wird
    // am Obergurt gemessen, was hängt, am Untergurt. Dieselbe Regel gilt im
    // Rechenkern (anschlussGurt in core.anbauteile.js), damit Bild und Zahl
    // dasselbe Mass meinen.
    const zAbVon = (t) => (anschlussGurt({ befestigung: bef, z: t?.z ?? 0 }) === 'OG'
      ? zOG : zUG);

    /*
     * DIE KETTE, GLIED FÜR GLIED.
     *
     * Hier stand EIN Ständer von zMin bis zMax - ein gerader Strich, der von
     * einer Hängestütze mit Ausleger dasselbe zeigte wie von drei Teilen
     * nebeneinander. Genau deshalb blieb unbemerkt, dass die Ausleitung die
     * Teile einzeln ans Joch hängte: das Bild konnte den Unterschied gar
     * nicht darstellen.
     *
     * Gezeichnet wird jetzt, was ausgeleitet wird - dieselbe Funktion
     * (anbauKette in core.anbauteile.js). Ein KRAGARM steht damit auch als
     * Kragarm da: der NT-Ausleger reicht in Jochachse aus, und das Kettenwerk
     * hängt an seinem Ende.
     */
    const traegerTeil = meine.find((x) => (x.rolle ?? '') === 'traeger') ?? meine[0];
    const anGurt = anschlussGurt({ befestigung: bef, z: traegerTeil?.z ?? 0 });
    const kette = anbauKette(meine, { x0: a.x, zAn: anGurt === 'OG' ? zOG : zUG });

    kette.glieder.forEach((g) => {
      const laenge = Math.hypot(g.bis.x - g.von.x, g.bis.y - g.von.y,
                                g.bis.z - g.von.z);
      // Der Träger trägt alles, was danach kommt - er darf dicker sein.
      flaechen.push(...stab([g.von.x, g.von.y, g.von.z],
                            [g.bis.x, g.bis.y, g.bis.z],
                            g.rang === 0 ? 0.045 : 0.038,
                            opt(`${g.teil.bauteilName ?? g.teil.name} · ${laenge.toFixed(2)} m`)));
    });

    // Spanne der Baugruppe - für den Blick auf ein einzelnes Teil. Bei einem
    // Kragarm reicht das Raster als Mass nicht mehr aus.
    const pkt = [kette.wurzel, ...kette.glieder.map((g) => g.bis)];
    const zMin = Math.min(zOG, zUG, ...pkt.map((q) => q.z));
    const zMax = Math.max(zOG, zUG, ...pkt.map((q) => q.z));
    const xMin = Math.min(a.x - r, ...pkt.map((q) => q.x));
    const xMax = Math.max(a.x + r, ...pkt.map((q) => q.x));
    detailBereiche.push({ teil: teilKey, id: a.id, index: k, name: a.name,
                          x: a.x, r, zMin, zMax, xMin, xMax });

    // KURZBENENNUNG der Baugruppe am oberen Ende des Ständers - nur die
    // Positionsnummer. Sie genügt, um ein Teil im Plan wiederzufinden, und
    // bleibt klein genug, dass zwanzig davon das Bild nicht zustellen. Der
    // Abschnitt x steht in der Liste und in der Bemassung; im Modell wäre er
    // eine Zahl, die man nicht liest. Der volle Name kommt, sobald das Teil
    // angeklickt ist (siehe textLang in _marken).
    marken.push({
      gruppe: 'anbau', art: 'anbau', teil: teilKey,
      p: [a.x, 0, zMax],
      text: `A${k + 1}`,
      textLang: `A${k + 1} · ${kurzName(a.name)}`,
      titel: a.name, farbe: fb,
    });

    // --- Je aufgelöstes Teil: Ausleger, Knoten, Kräfte, Bemassung ----------
    meine.forEach((t, j) => {
      const zAn = zAbVon(t) + (t.z ?? 0);
      const yAn = t.y ?? 0;
      const pAn = [t.x, yAn, zAn];
      const kurz = t.bauteilName ?? t.name.split(' · ').slice(-1)[0];
      // Der Weg vom Anschluss zum Angriffspunkt ist oben als KETTE gezeichnet
      // (anbauKette). Hier stand dafür ein Stummel vom senkrechten Ständer
      // aus - er ginge quer durch die Kette hindurch und behauptete einen
      // zweiten, anderen Kraftweg.
      // KNOTEN am Angriffspunkt: hier greift die Last an, und hier setzen die
      // Kraftpfeile an. Er wird als eigene Marke geführt, damit er auch dann
      // sichtbar bleibt, wenn der Ständer davorliegt.
      flaechen.push(...quader(pAn, [0.07, 0.07, 0.07],
        { ...opt(`${kurz} · Angriffspunkt x ${t.x.toFixed(2)} · y ${yAn.toFixed(2)} · z ${(t.z ?? 0).toFixed(2)} m`),
          gruppe: 'last', punkt: true }));
      marken.push({
        gruppe: 'last', art: 'lastknoten', p: pAn, teil: teilKey,
        text: t.rolle === 'drahtwerk' ? 'Leiter' : '',
        titel: `${t.name} · Angriffspunkt`,
      });

      // Kraftpfeile am Angriffspunkt dieses Teils, JE LASTART.
      //
      // Früher stand hier ein Pfeil je Richtung mit der Summe aller Gruppen.
      // Das liess sich nicht filtern und verschwieg, woher die Kraft kommt:
      // ob eine Querkraft aus dem Wind stammt oder aus dem Leiterzug, ist für
      // die Beurteilung der halbe Punkt. Jetzt trägt jeder Pfeil seine
      // Einwirkungsgruppe - und die Umlenkkraft aus dem Leiterzug steht als
      // eigene Art da, obwohl sie rechnerisch in der Gruppe G läuft.
      Object.entries(t.proGruppe ?? {}).forEach(([gruppe, k]) => {
        [{ k: k.Fz, ri: [0, 0, -1], nm: 'F_z', bez: 'vertikal' },
         { k: k.Fy, ri: [0, 1, 0], nm: 'F_y', bez: 'Gleisrichtung' },
         { k: k.Fx, ri: [1, 0, 0], nm: 'F_x', bez: 'Jochachse' }].forEach((pf) => {
          if (!pf.k) return;
          const istZug = gruppe === 'G' && pf.nm === 'F_x' && t.rolle === 'drahtwerk';
          const art = istZug ? 'leiterzug' : LASTART_VON_GRUPPE[gruppe] ?? 'staendig';
          vektoren.push({
            gruppe: 'last', art: 'last', lastart: art, p: pAn, teil: teilKey,
            v: skal(pf.ri, Math.sign(pf.k) * pfeilLaenge(pf.k)),
            text: `${pf.nm} = ${Math.abs(pf.k).toFixed(2)} kN`,
            titel: `${t.name} · ${LASTARTEN.find((l) => l.key === art).label} · ${pf.bez}`,
          });
        });
      });

      // Bemassung des Teils: Höhe z und Versatz y, jedes an seinem Ort.
      // Sie gehört zu diesem Anbauteil und erscheint erst, wenn es angeklickt
      // oder in Bearbeitung ist - sonst stünden Dutzende Zahlen im Bild.
      if (Math.abs(t.z ?? 0) > 1e-6) {
        masse.push({
          feld: 'anbauteile', tab: 'anbau', achse: 'z', zu: teilKey,
          p0: [t.x, yAn, zAbVon(t)], p1: [t.x, yAn, zAn],
          ab: [1, 0, 0], d: 0.30 + j * 0.16,
          // Die Bemassung sagt das MASS. Der Name steht als Marke am Teil
          // selbst - ihn hier zu wiederholen kostet die dreifache Breite und
          // schiebt die Zahl aus dem Bild. Bei mehreren Höhen derselben
          // Baugruppe genügt eine sehr kurze Kennung.
          text: `z = ${(t.z ?? 0).toFixed(2)} m`,
          titel: `${kurz}: z = ${(t.z ?? 0).toFixed(2)} m ab Anschlussgurt`,
        });
      }
      if (Math.abs(yAn) > 1e-6) {
        masse.push({
          feld: 'anbauteile', tab: 'anbau', achse: 'y', zu: teilKey,
          p0: [t.x, 0, zAn], p1: [t.x, yAn, zAn],
          ab: [0, 0, 1], d: 0.18,
          text: `y = ${yAn.toFixed(2)} m`,
        });
      }
    });

    /*
     * Anschlussraster - das Mass, das die Lasteinleitung bestimmt.
     *
     * Es NENNT jetzt, was es bewirkt: zwei Stationen statt einer, und damit
     * doppelt so viele Klemmen. Ohne diese Zahl sah man zwar die Wuerfel,
     * musste sie aber zaehlen, um die Regel zu erkennen.
     */
    const gRef = gurte[0];
    const klemmen = gurte.length * 2 * stationen.length;
    masse.push({
      feld: 'anbauteile', tab: 'anbau', achse: 'x', zu: teilKey,
      p0: [a.x - r, ysWinkel(`${gRef}_R`, gRef, a.x), zGurt(gRef, a.x - r)],
      p1: [a.x + r, ysWinkel(`${gRef}_R`, gRef, a.x), zGurt(gRef, a.x + r)],
      ab: [0, 1, 0], d: 0.22,
      text: `Raster ${((a.raster ?? 0.4) * 1000).toFixed(0)} mm · ${
        klemmen} Klemmen`,
    });
    masse.push({
      feld: 'anbauteile', tab: 'anbau', achse: 'x', zu: teilKey,
      p0: [0, 0, zUG], p1: [a.x, 0, zUG],
      ab: [0, 1, 0], d: 0.5, text: `x = ${a.x.toFixed(2)} m`,
    });
  });

  // --- Verteilte Lasten ----------------------------------------------------
  // Pfeilreihe plus eine leicht durchscheinende Fläche zwischen Lastordinate
  // und Bauteil: so ist auf einen Blick zu sehen, dass die Last über die ganze
  // Länge wirkt und nicht nur an den Pfeilspitzen.
  const lastflaechen = [];

  // Die Gleichlast wird nach Lastart GETRENNT aufgetragen: Eigengewicht und
  // Schnee sind zwei Einwirkungen und lassen sich einzeln ausblenden. Die
  // Ordinaten stapeln sich, damit die Summe q_d ablesbar bleibt.
  let zStapel = zOben + 0.30;
  [{ w: m.qd_g ?? 0, art: 'staendig', nm: 'q_d,g' },
   { w: m.qd_s ?? 0, art: 'schnee', nm: 'q_d,s' }].forEach((teil) => {
    if (!(teil.w > 0)) return;
    const zVon = zStapel, zBis = zStapel + Math.min(0.5, 0.12 + teil.w * 0.12);
    zStapel = zBis;
    const n = Math.max(6, Math.min(24, Math.round(m.L / 1.2)));
    for (let i = 0; i <= n; i++) {
      const x = (i * m.L) / n;
      vektoren.push({
        gruppe: 'last', art: 'gleichlast', lastart: teil.art, p: [x, 0, zBis],
        v: [0, 0, -(zBis - zVon) - 0.16], schlank: true,
        text: i === Math.round(n / 2) ? `${teil.nm} = ${teil.w.toFixed(2)} kN/m` : '',
      });
    }
    lastflaechen.push({
      gruppe: 'last', art: 'gleichlast', lastart: teil.art,
      punkte: [[0, 0, zBis], [m.L, 0, zBis], [m.L, 0, zVon], [0, 0, zVon]],
      titel: `${teil.nm} = ${teil.w.toFixed(2)} kN/m`,
    });
  });

  // Wind auf das Joch: Laufmeterlast in Gleisrichtung. Ein negativer Beiwert
  // dreht sie um - der Pfeil zeigt dann auf die andere Seite, und genau das
  // soll man sehen.
  if (Math.abs(m.wd ?? 0) > 1e-9) {
    const vz = Math.sign(m.wd);
    // Der Wind steht auf der Seite, von der er kommt: bei +y links vom Joch,
    // bei −y rechts davon. Sonst stünden die Pfeile im Bauteil.
    const yKante = vz > 0 ? yLinks : yRechts;
    const yAus = yKante - vz * 0.42;
    const zM = (zOben + zUnten) / 2;
    const n = Math.max(5, Math.min(18, Math.round(m.L / 1.6)));
    for (let i = 0; i <= n; i++) {
      const x = (i * m.L) / n;
      vektoren.push({
        gruppe: 'last', art: 'wind', lastart: 'windY', p: [x, yAus, zM],
        v: [0, vz * 0.34, 0], schlank: true,
        text: i === Math.round(n / 2) ? `w_d = ${(m.wd).toFixed(2)} kN/m` : '',
      });
    }
    lastflaechen.push({
      gruppe: 'last', art: 'wind', lastart: 'windY',
      punkte: [[0, yAus, zM], [m.L, yAus, zM], [m.L, yKante, zM], [0, yKante, zM]],
      titel: `w_d = ${(m.wd).toFixed(2)} kN/m`,
    });
  }

  /*
   * WIND AUF DIE MASTEN - wie beim Joch (Weisung, 28. August).
   *
   * Der Mast trug seine Windlast bisher nur in der Ausleitung: dort steht sie
   * seit dem 27. August als Streckenlast an jedem Maststab, in BEIDEN
   * Richtungen. Im Bild war davon nichts zu sehen. Ein Mast, der nur haelt
   * und nie gedrueckt wird, sieht vollstaendig aus und ist es nicht - und
   * gerade die Windrichtung quer zum Gleis ist die, ueber die das Joch mit
   * dem Masten redet.
   *
   * ZWEI RICHTUNGEN, ZWEI LASTARTEN. `x` ist die Jochachse (Wind quer),
   * `y` die Gleisrichtung. Sie stehen auf getrennten Ebenen und lassen sich
   * einzeln ausblenden - so wie am Joch.
   *
   * Gezeichnet werden die BEMESSUNGSWERTE (`xd`, `yd`), denn daneben stehen
   * die Bemessungspfeile des Jochs. Ein negativer Beiwert dreht den Pfeil um;
   * genau das soll man sehen.
   */
  ['A', 'B'].forEach((ende) => {
    const g = mastGeo[ende];
    const w = m.mastLast?.[ende];
    if (!g || !g.koerper || !w) return;
    const hoehe = g.zKopf - g.zF;
    if (!(hoehe > 0)) return;
    const n = Math.max(4, Math.min(16, Math.round(hoehe / 1.1)));

    [{ wert: w.xd ?? 0, achse: 0, halb: g.halbX, nm: 'w_M,x',
       lastart: 'windX', bez: 'Jochachse' },
     { wert: w.yd ?? 0, achse: 1, halb: g.halbY, nm: 'w_M,y',
       lastart: 'windY', bez: 'Gleisrichtung' }].forEach((teil) => {
      if (Math.abs(teil.wert) < 1e-9) return;
      const vz = Math.sign(teil.wert);
      // Der Wind steht auf der Seite, von der er kommt - sonst laegen die
      // Pfeile im Profil.
      const kante = -vz * teil.halb;
      const aus = kante - vz * 0.42;
      const pkt = (a, z) => (teil.achse === 0 ? [g.x + a, 0, z] : [g.x, a, z]);
      for (let i = 0; i <= n; i++) {
        const z = g.zF + (i * hoehe) / n;
        vektoren.push({
          gruppe: 'last', art: 'wind', lastart: teil.lastart,
          teil: `MAST_${ende}`, p: pkt(aus, z),
          v: teil.achse === 0 ? [vz * 0.34, 0, 0] : [0, vz * 0.34, 0],
          schlank: true,
          text: i === Math.round(n / 2)
            ? `${teil.nm} = ${teil.wert.toFixed(2)} kN/m` : '',
          titel: `Wind auf Mast ${ende} · ${teil.bez}`,
        });
      }
      lastflaechen.push({
        gruppe: 'last', art: 'wind', lastart: teil.lastart,
        punkte: [pkt(aus, g.zF), pkt(aus, g.zKopf),
                 pkt(kante, g.zKopf), pkt(kante, g.zF)],
        titel: `Wind auf Mast ${ende} · ${teil.bez} · `
             + `${teil.nm} = ${teil.wert.toFixed(2)} kN/m`,
      });
    });
  });

  // ==========================================================================
  //  NACHWEISSCHNITT: Ebene, Vermassung, Schnittkräfte
  // ==========================================================================
  const xN = Math.min(Math.max(m.xNachweis ?? 0, 0), m.L);
  const zuN = zu(xN);
  const randY = Math.max(Math.abs(qs.huelle.y0), Math.abs(qs.huelle.y1)) * MM + 0.10;

  // ORIENTIERUNG DER SCHNITTEBENE
  //   'quer'        senkrecht zur Jochachse, mittig zwischen zwei Blechen.
  //                 Das ist die Ebene, in der gerechnet wird.
  //   'vertikal'    längs in der Ebene der stehenden Bindebleche
  //   'horizontal'  längs in der Ebene der liegenden Bindebleche des Obergurts
  //
  // Die beiden Längsschnitte ändern die Rechnung NICHT - sie legen die
  // Bindebleche einer Ebene über die ganze Länge frei, damit sich ihre
  // Schnittkräfte nebeneinander ablesen lassen.
  //
  // Der Nachweisschnitt ist ABSCHALTBAR und im Grundzustand aus. Er ist ein
  // Werkzeug zum Hineinschauen, kein Teil des Bauwerks: solange er nicht
  // gebraucht wird, verstellen Ebene, Vermassung und Kraftpfeile nur die Sicht
  // auf das Joch.
  const schnittAktiv = m.schnittAktiv === true;
  const orient = m.schnittOrientierung ?? 'quer';
  const zMinS = Math.min(qs.huelle.z0 * MM, zUnten) - 0.10;
  const zMaxS = qs.huelle.z1 * MM + 0.10;
  const schnitt = !schnittAktiv ? null : {
    x: xN, orientierung: orient,
    poly: orient === 'vertikal'
      ? [[0, yLinks, zMinS], [m.L, yLinks, zMinS], [m.L, yLinks, zMaxS], [0, yLinks, zMaxS]]
      : orient === 'horizontal'
        ? [[0, -randY, zOben], [m.L, -randY, zOben], [m.L, randY, zOben], [0, randY, zOben]]
        : [[xN, -randY, zOben + 0.10], [xN, randY, zOben + 0.10],
           [xN, randY, zuN - 0.10], [xN, -randY, zuN - 0.10]],
  };

  // Beim Längsschnitt bekommt JEDES Blech der geschnittenen Ebene seine
  // Beschriftung - genau dafür ist die Orientierung da.
  if (schnittAktiv && orient !== 'quer' && knoten.length) {
    const blechId = orient === 'vertikal' ? 'V_L' : 'H_O';
    stationen.forEach((st, i) => {
      const e = knoten[i]?.ebenen?.find((x) => x.id === blechId);
      if (!e || !Number.isFinite(e.sig_v)) return;
      const p = orient === 'vertikal'
        ? [st.x, yLinks - breiteAus('OG', st.x), (zOben + zu(st.x)) / 2]
        : [st.x, 0, zOben];
      marken.push({
        gruppe: 'kraefte', art: 'spannung', p, eta: e.eta,
        text: `${e.sig_v.toFixed(0)}  η ${e.eta.toFixed(2)}`,
        titel: `${e.label} · Pos ${e.pos} · x = ${st.x.toFixed(2)} m`,
      });
    });
  }

  /*
   * Die Jochlänge ist das einzige Mass, das immer steht - alles Übrige ist an
   * der Schnittebene aufgehängt und erscheint mit ihr.
   *
   * SIE HÄNGT TIEF (Weisung: rund vier Meter). Dicht unter dem Untergurt lag
   * sie zwischen den Mastfüssen und deren Angaben; vier Meter tiefer läuft
   * sie frei durch, und dazwischen ist Platz für die Masthöhen.
   *
   * Ohne Masten gibt es dort unten nichts, wozu sie gehören könnte - dann
   * bleibt sie dicht am Joch, statt im Leeren zu schweben.
   */
  const massTief = Number.isFinite(mastFussZ) ? 4.0 : 0.95;
  masse.push({
    feld: 'L', tab: 'geo', achse: 'x',
    p0: [0, 0, zUnten - massTief], p1: [m.L, 0, zUnten - massTief],
    ab: [0, 0, -1], d: 0,
    text: `L = ${m.L.toFixed(2)} m`,
  });
  if (schnittAktiv) {
    masse.push({
      feld: 'xNachweis', tab: 'geo', achse: 'x', zu: 'schnitt',
      p0: [0, 0, zUnten - 0.55], p1: [xN, 0, zUnten - 0.55], ab: [0, 0, -1], d: 0,
      text: `x_N = ${xN.toFixed(2)} m`,
    });
    masse.push({
      feld: 'jd', tab: 'geo', achse: 'z', zu: 'schnitt',
      p0: [xN, randY, zuN], p1: [xN, randY, zOben], ab: [0, 1, 0], d: 0.30,
      text: `jd = ${(m.jdAn ? m.jdAn(xN) : m.jd).toFixed(0)} mm`,
    });
    masse.push({
      feld: 'jbbOG', tab: 'geo', achse: 'y', zu: 'schnitt',
      p0: [xN, qs.byId.OG_L.schenkelLiegend.y0 * MM, zOben],
      p1: [xN, qs.byId.OG_R.schenkelLiegend.y1 * MM, zOben], ab: [0, 0, 1], d: 0.26,
      text: `jbb,OG = ${m.jbbOG} mm`,
    });
    masse.push({
      feld: 'jbbUG', tab: 'geo', achse: 'y', zu: 'schnitt',
      p0: [xN, qs.byId.UG_L.schenkelLiegend.y0 * MM, zuN],
      p1: [xN, qs.byId.UG_R.schenkelLiegend.y1 * MM, zuN], ab: [0, 0, -1], d: 0.26,
      text: `jbb,UG = ${m.jbbUG} mm`,
    });
    const iSt = stationen.findIndex((s) => s.x >= xN);
    if (stationen.length > 1) {
      const a = stationen[Math.max(0, Math.min(stationen.length - 2, iSt < 0 ? 0 : iSt))];
      const b = stationen[stationen.indexOf(a) + 1];
      if (b) {
        masse.push({
          feld: 'a1', tab: 'geo', achse: 'x', zu: 'schnitt',
          p0: [a.x, yRechts, zOben], p1: [b.x, yRechts, zOben], ab: [0, 0, 1], d: 0.46,
          text: `a₁ = ${((b.x - a.x) * 1000).toFixed(0)} mm`,
        });
      }
    }
  }

  // Schnittkräfte am Nachweisschnitt: Gurtnormalkräfte und Ebenenquerkräfte
  const sn = schnittAktiv ? erg?.schnitt : null;
  if (sn) {
    const maxN = Math.max(1e-6, ...(sn.ecken ?? []).map((e) => Math.abs(e.N)));
    const maxV = Math.max(1e-6, ...(sn.ebenen ?? []).map((e) => Math.abs(e.V_Ebene ?? 0)));
    const lN = (v) => (Math.abs(v) / maxN) * pfeilRef * 0.9;
    const lV = (v) => (Math.abs(v) / maxV) * pfeilRef * 0.7;

    (sn.ecken ?? []).forEach((e) => {
      const w = qs.byId[e.id];
      if (!w) return;
      const p = [xN, w.schwerpunkt.y * MM,
                 w.schwerpunkt.z * MM + versatz(e.gurt, xN)];
      // Druck zeigt zum Schnitt hin, Zug davon weg
      const ri = e.N < 0 ? -1 : +1;
      vektoren.push({
        gruppe: 'kraefte', art: 'normalkraft', p,
        v: [ri * lN(e.N), 0, 0], zug: e.N >= 0,
        text: `N ${e.id} = ${e.N.toFixed(1)} kN`,
        titel: `${e.art} · σ_v = ${e.sig_v.toFixed(0)} N/mm²`,
      });
    });

    (sn.ebenen ?? []).forEach((e) => {
      if (!Number.isFinite(e.V_Ebene)) return;
      const istV = e.art === 'vertikal';
      const p = istV
        ? [xN, e.id === 'V_L' ? yLinks : yRechts, (zOben + zuN) / 2]
        : [xN, 0, e.id === 'H_O' ? zOben : zuN];
      const ri = istV ? [0, 0, e.vorz] : [0, e.vorz, 0];
      vektoren.push({
        gruppe: 'kraefte', art: 'querkraft', p,
        v: skal(ri, lV(e.V_Ebene)),
        text: `V ${e.id} = ${e.V_Ebene.toFixed(1)} kN`,
        titel: e.sig_v ? `Blech σ_v = ${e.sig_v.toFixed(0)} N/mm²` : '',
      });
    });

    // Vergleichsspannung der vier Bleche am Schnitt als Beschriftung
    (sn.ebenen ?? []).filter((e) => Number.isFinite(e.sig_v)).forEach((e) => {
      const istV = e.art === 'vertikal';
      const p = istV
        ? [xN, e.id === 'V_L' ? yLinks : yRechts, (zOben + zuN) / 2]
        : [xN, 0, e.id === 'H_O' ? zOben : zuN];
      marken.push({
        gruppe: 'kraefte', art: 'spannung', p, eta: e.eta,
        text: `${e.sig_v.toFixed(0)} N/mm²  η ${e.eta.toFixed(2)}`,
        titel: `${e.label} · Pos ${e.pos} · M ${e.M.toFixed(2)} kNm · V ${e.V.toFixed(1)} kN`,
      });
    });
  }

  /*
   * DER JOCHTITEL steht ueber der Mitte des Obergurts, der MASTTITEL ueber
   * dem jeweiligen Kopf. Beide eine halbe Bauhoehe hoeher, damit sie nicht
   * auf dem Bauteil kleben.
   */
  {
    /*
     * ABSTAND ZUM BAUTEIL (Weisung, 1. September: weiter nach oben, damit der
     * Text das Modell nicht verdeckt).
     *
     * Der Jochtitel stand eine halbe Bauhoehe ueber dem Obergurt und lag
     * damit noch im Bereich der Lastpfeile. Der zweite Versuch schob ihn
     * anderthalb Meter hinauf - dort geriet er unter die Werkzeugleiste, denn
     * die Einpassung kennt zwar die Bildgrenzen, nicht aber die Leisten, die
     * darueberliegen. Knapp ein Meter ist der Ausgleich: ueber den Pfeilen,
     * unter der Leiste.
     */
    const zOK = qs.huelle.z1 * MM;
    /*
     * DER JOCHTITEL TRAEGT SEINE POSITION (Weisung, 3. September).
     *
     * Auf einer Reihe aus drei Jochen stand dreimal «J90 · 20.00 m», und
     * welches davon die Zahlen rechts meint, war nicht zu sehen. Mit «P2»
     * davor findet man die Zeile in der Seitenleiste wieder - dort steht
     * dieselbe Nummer.
     */
    bauteiltitel.push({
      p: [m.L / 2, 0, zOK + 0.95],
      text: `${m.twPos ? `${m.twPos} · ` : ''}${m.typ ?? 'frei'}`
          + ` · ${m.L.toFixed(2)} m`,
      feld: 'typ', tab: 'system',
    });
    ['A', 'B'].forEach((name) => {
      const g = mastGeo[name];
      if (!g?.koerper) return;
      const md = name === 'B' ? (federn.mastB ?? federn.mast) : (federn.mastA ?? federn.mast);
      if (!md?.profil) return;
      // Die LAENGE, nicht die Hoehe: angeschrieben ist auf dem Querprofil die
      // Gesamtlaenge. Ohne Angabe steht die Hoehe bis zur Jochachse.
      const lang = md.laenge > 0 ? md.laenge : md.H;
      /*
       * DER TITEL NENNT DEN MASTEN, nicht das Jochende.
       *
       * «HEB 240 · 7.50 m» stand an beiden Enden gleich da; auf einer
       * Jochreihe standen vier solche Anschriften nebeneinander, und welche
       * zu welchem Masten gehoerte, sagte keine. Mit «M2» davor ist jeder
       * Mast ueber das ganze Blatt eindeutig - der Zwischenmast heisst von
       * beiden Jochen aus gleich.
       */
      const mName = federn.namen?.[name] ?? '';
      bauteiltitel.push({
        // Der Mastkopf traegt oben Traversen; der Titel muss darueber hinaus.
        p: [g.x, 0, g.zKopf + 0.55],
        text: `${mName ? `${mName} · ` : ''}${md.profil.name} · ${lang.toFixed(2)} m`,
        /*
         * >>> DAS ENDE GEHOERT AN DEN TITEL. <<<
         *
         * Weisung vom 3. September: «wenn ich die mastbezeichnung im 3d
         * anklicke wird nicht in der sidebar auf M2 oder M1 umgeschalten.»
         *
         * Der Klick fuehrte auf das FELD «Mastprofil» - aber welcher Mast
         * dort gerade angewaehlt ist, blieb, wie es war. Man klickte auf M2
         * und bearbeitete M1. Der Titel sagt jetzt, WELCHES Ende er meint;
         * die Anwendung waehlt den zugehoerigen Masten, bevor sie das Feld
         * oeffnet.
         */
        mastEnde: name,
        feld: 'mastProfil',
        // Der Titel gehoert zum Bauteil: ist der Mast ausgeblendet, steht
        // sonst sein Profil ueber leerem Grund.
        tab: 'system', gruppe: 'mast',
      });
    });
  }

  // Grösster Betrag je auftragbarer Grösse - die Skala der Einfärbung.
  const bereiche = {};
  PLOTS.forEach((p) => {
    let max = 0;
    flaechen.forEach((f) => {
      const v = f.werte?.[p.feld];
      if (Number.isFinite(v)) max = Math.max(max, Math.abs(v));
    });
    bereiche[p.feld] = max;
  });

  // Die Grenzen müssen die Anbauteile einschliessen: ein Jochaufsatz ragt weit
  // über den Obergurt hinaus, und ohne ihn in den Grenzen bliebe er beim
  // Einpassen halb ausserhalb des Bildes.
  const zAT = detailBereiche.flatMap((d) => [d.zMin, d.zMax]);
  /*
   * DIE BAUTEILTITEL GEHOEREN IN DIE GRENZEN.
   *
   * Sie stehen ueber ihrem Bauteil, also ueber allem anderen. Ohne sie in den
   * Grenzen passte die Ansicht nur das Tragwerk ein - die Titel lagen dann
   * ausserhalb und verschwanden hinter der Werkzeugleiste. Genau das war beim
   * ersten Versuch zu sehen, nachdem sie hoeher gerueckt waren.
   */
  const zTitel = bauteiltitel.map((b) => b.p[2]);
  return {
    flaechen, linien, marken, masse, bauteiltitel, vektoren, schnitt,
    lastflaechen, bereiche,
    legende: [...bauteile.values()],
    grenzen: grenzenVon(m, qs, flaechen, {
      zUnten, mastFussZ, zAT, mastKopfZ, zTitel }),
    stationen: stationen.map((s) => s.x),
    xNachweis: xN, schnittAktiv,
    anbauteile: detailBereiche,
  };
}

// --- Ansicht ----------------------------------------------------------------

/** Vorgegebene Blickrichtungen. az/el beschreiben die Lage der Kamera. */
/**
 * Ist dieser Farbwert dunkel?
 *
 * Gebraucht für die hinterlegte Zeichnung: auf dunklem Grund wird sie
 * umgekehrt. Gerechnet wird die wahrgenommene Helligkeit - Grün wiegt
 * schwerer als Rot, Blau am wenigsten. Was sich nicht als #rrggbb lesen
 * lässt, gilt als dunkel: die Anwendung ist es im Regelfall.
 */
function dunkel(farbe) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(farbe ?? '').trim());
  if (!m) return true;
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
}

export const ANSICHTEN = [
  { key: 'iso',    label: 'Isometrie',    az: -0.62,           el: 0.42 },
  { key: 'laengs', label: 'Längsansicht', az: Math.PI / 2,     el: 0 },
  { key: 'quer',   label: 'Querschnitt',  az: Math.PI,         el: 0 },
  { key: 'oben',   label: 'Draufsicht',   az: -Math.PI / 2,    el: 1.45 },
];

/**
 * Auftragbare Grössen.
 *
 * Jede Fläche trägt ihre Kennwerte mit (siehe kennwerte() in erzeugeSzene).
 * Die Einfärbung nimmt den Betrag, bezogen auf den grössten Betrag der Szene -
 * ausser bei η, wo die Skala fest bei 1.25 endet, damit die Farbe eines
 * Bauteils nicht davon abhängt, wie ausgelastet der Rest ist.
 *
 * Nicht jede Grösse gibt es an jedem Bauteil: der Gurtwinkel hat keine
 * ausgewiesene Querkraft, das Bindeblech keine Normalkraft. Wo der Wert fehlt,
 * bleibt das Bauteil neutral grau - es wird nichts dazuerfunden.
 */
/**
 * ZU WELCHEM HAUPTSCHALTER GEHÖRT EINE EBENE?
 *
 * Die Gruppen der Werkzeugleiste tragen je einen Schalter, der die ganze
 * Gruppe aus dem Bild nimmt. Danach gefragt hatten bisher aber nur einzelne
 * Zeichengänge - die Pfeile und ein Teil der Marken. Die VOLUMENKÖRPER und
 * die LASTFLÄCHEN taten es nicht:
 *
 *   «Lasten aus»  liess die Wind- und Schneeflächen stehen,
 *   «Modell aus»  liess das ganze Joch stehen.
 *
 * Mit allen drei Schaltern aus sah das Bild fast unverändert aus - die
 * Hauptschalter wirkten wie Zierrat. Ab hier hängt jede Ebene an ihrer
 * Gruppe, und zwar an einer Stelle statt an sieben.
 *
 * Was hier nicht steht, hat keinen Hauptschalter über sich (etwa 'marken',
 * 'anbau') und bleibt allein von seinem Einzelschalter abhängig.
 */
/*
 * Achsenkreuz: Armlaenge und Abstand vom unteren Rand [CSS-Punkte].
 *
 * ACHSENKREUZ_HOCH muss ueber der Fussleiste bleiben - siehe _achsenkreuz.
 * Der Pruefstand rechnet den Mindestwert aus dem Stylesheet nach, damit eine
 * hoehere Leiste nicht wieder still darueberwaechst.
 */
/*
 * Wie weit ein Mast ueber den Obergurt hinausragt [m].
 *
 * Weisung des Auftraggebers: immer einen halben Meter. Auf jedem Querprofil
 * laeuft der Mast ueber das Joch hinaus - er traegt dort Traversen und
 * Einzelleiter -, und wer eine Zeichnung dahinterlegt, will beide Masten zur
 * Deckung bringen. Ein Mast, der an der Jochachse aufhoert, passt dann nie.
 *
 * Die Masthoehe H bleibt davon unberuehrt: sie ist als FUSS BIS JOCHACHSE
 * definiert (ui.schema.js) und geht so in die Drehfeder ein. Der Ueberstand
 * waechst nach OBEN, der Fuss bleibt, wo er ist - dort sitzt das Lager.
 */
/**
 * IN WELCHER REIHENFOLGE DIE KENNZAHLEN GESETZT WERDEN.
 *
 * Ausserhalb der Klasse, weil sie sich nur so prüfen lässt - und weil genau
 * diese Reihenfolge der Grund war, aus dem die Endfelder unbeschriftet
 * blieben. Der Zeichengang selbst braucht einen Canvas; diese Ordnung
 * braucht nur Zahlen.
 *
 * REIHUM ÜBER DIE SPALTEN. Die Liste kommt nach Betrag geordnet herein; sie
 * wird in Spalten geteilt, und aus jeder Spalte kommt der grösste, dann der
 * zweitgrösste, und so weiter. Jeder Bereich bekommt dadurch Zahlen, und
 * innerhalb eines Bereichs steht die massgebende zuerst.
 *
 * Der grösste Wert des ganzen Bildes bleibt in jedem Fall beschriftet: seine
 * Spalte kommt in der ersten Runde dran.
 *
 * @param {{x:number, betrag:number}[]} kandidaten
 * @param {number} spalten wieviele Bereiche über die Bildbreite
 */
export function beschriftungsReihenfolge(kandidaten, spalten = 14) {
  const liste = [...kandidaten].sort((a, b) => b.betrag - a.betrag);
  if (liste.length < 2) return liste;
  const xs = liste.map((k) => k.x);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const breite = Math.max(1e-9, x1 - x0);
  const spalte = new Map();
  liste.forEach((k) => {
    const i = Math.min(spalten - 1,
                       Math.floor(((k.x - x0) / breite) * spalten));
    if (!spalte.has(i)) spalte.set(i, []);
    spalte.get(i).push(k);              // schon nach Betrag geordnet
  });
  const reihen = [...spalte.keys()].sort((a, b) => a - b).map((i) => spalte.get(i));
  const raus = [];
  for (let r = 0; raus.length < liste.length; r++) {
    let etwas = false;
    reihen.forEach((sp) => { if (sp[r]) { raus.push(sp[r]); etwas = true; } });
    if (!etwas) break;
  }
  return raus;
}

const MAST_UEBERSTAND = 0.5;

const ACHSENKREUZ_ARM = 30;
const ACHSENKREUZ_HOCH = 92;

const HAUPTSCHALTER = {
  profil: 'modell', blech: 'modell', anbau: 'modell', achse: 'modell',
  auflager: 'modell', mast: 'modell', masse: 'modell', raster: 'modell',
  // Die eingefuegte Zeichnung und ihre Masskette haengen an einer eigenen
  // Gruppe: sie kommen von aussen, nicht aus der Rechnung. Vorher stand die
  // Zeichnung ueberhaupt an keinem Hauptschalter - «Modell aus» liess sie
  // stehen, obwohl sie in der Modellgruppe angeboten wurde.
  zeichnung: 'zeichnung', masskette: 'zeichnung',
  last: 'lasten',
  kraefte: 'resultate', schnitt: 'resultate',
};

export const PLOTS = [
  { key: 'eta',   label: 'Ausnutzung η',           kurz: 'η',    feld: 'eta',
    einheit: '–', fest: 1.25, nk: 2,
    fussnote: 'Feste Skala bis 1.25 – der Endwert ist nicht das Maximum '
            + 'im Modell.' },
  { key: 'sig_v', label: 'Vergleichsspannung σ_v', kurz: 'σ_v',  feld: 'sig_v',
    einheit: 'N/mm²', nk: 0,
    fussnote: 'Gurt: Summe der Normalspannungen aus N und örtlicher Biegung · '
            + 'Blech: von Mises aus σ und τ' },
  { key: 'sig',   label: 'Normalspannung σ',       kurz: 'σ',    feld: 'sig',
    einheit: 'N/mm²', nk: 0,
    fussnote: 'Gurt: σ aus der Normalkraft · Blech: σ aus dem Anschnittmoment' },
  { key: 'M',     label: 'Moment M',               kurz: 'M',    feld: 'M',
    einheit: 'kNm', nk: 2,
    fussnote: 'Gurt: örtliches Rahmenmoment, das grössere aus M_y und M_z · '
            + 'Blech: Moment am Anschnitt' },
  { key: 'V',     label: 'Querkraft V',            kurz: 'V',    feld: 'V',
    einheit: 'kN', nk: 1,
    fussnote: 'Nur für die Bindebleche ausgewiesen; die Gurte bleiben grau.' },
];

export const MODI = [
  ...PLOTS.map((p) => ({ ...p, art: 'plot' })),
  { key: 'positionen', label: 'Positionen', kurz: 'Pos', art: 'bauteil' },
  { key: 'neutral',  label: 'Bauteile', kurz: 'Teil', art: 'bauteil' },
];

export class Modellansicht {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} opt {beiAuswahl(stationIndex, flaeche), beiMass(feld, tab),
   *                      beiDrehpunkt()}
   */
  constructor(canvas, opt = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.opt = opt;
    this.szene = null;
    // pan = Verschiebung im Raum; Auge und Blickziel wandern gemeinsam.
    // fov 0.60 rad ≈ 34° statt der früheren 60°: ein ruhiger Blickwinkel,
    // der die Kanten am Bildrand nicht mehr auseinanderzieht.
    this.kamera = { az: -0.62, el: 0.42, dist: 1, ziel: [0, 0, 0], fov: 0.60,
                    pan: [0, 0, 0] };
    this.projektion = 'perspektive';   // oder 'orthogonal'
    this.ebenen = { profil: true, blech: true, anbau: true, achse: true,
                    last: true, kraefte: false, masse: true, schnitt: true,
                    raster: true, marken: true, auflager: true,
                    // Der Mast ist ein Bauteil, kein Auflagerzeichen - er
                    // laesst sich einzeln wegnehmen, ohne die Lagerung zu
                    // verlieren.
                    mast: true,
                    // Die Zeichnung und die Masskette sind zwei Ebenen: die
                    // eine kommt aus einem Blatt, die andere aus der Eingabe.
                    // Vorher hing die Masskette am Schalter der Zeichnung -
                    // wer das Bild wegnahm, verlor die Fanglinien mit.
                    zeichnung: true, masskette: true };
    /*
     * DIE HINTERLEGTE ZEICHNUNG.
     *
     * `{ bild, breite, hoehe, kalibrierung }` - das Bild als ImageBitmap, die
     * Kalibrierung aus bild.zeichnung.js. Fehlt eines von beiden, wird nichts
     * gezeichnet: ein unkalibriertes Bild hätte keine Lage im Raum.
     */
    this.zeichnung = null;
    /*
     * LAEUFT GERADE DAS NACHTRAEGLICHE VERSCHIEBEN DER ZEICHNUNG?
     *
     * Ein eigener Zustand statt eines Werkzeugs: das Verschieben ist kein
     * Modus des Modells, sondern einer der Zeichnung - es endet mit ihr.
     */
    this.zeichnungSchieben = false;
    /*
     * DIE MASSKETTE DER ZEICHNUNG, in Metern ab dem linken Jochende. Sie
     * kommt aus der Eingabe, nicht aus dem Bild - sie gilt auch ohne
     * hinterlegte Zeichnung, und ohne sie ist die Zeichnung nur ein Bild.
     */
    this.masskette = [];
    /*
     * FADENKREUZ UND GESETZTE PUNKTE beim Einmessen der Zeichnung.
     *
     * `_fadenkreuz` ist die Zeigerspur in Geraetepunkten, `kalibrierPunkte`
     * sind die bereits angeklickten Stellen. Beides lebt nur, solange
     * eingemessen wird.
     */
    this._fadenkreuz = null;
    this.kalibrierPunkte = [];
    // Deckkraft der Zeichnung. 0.45 ist der Wert, bei dem beides zugleich
    // lesbar bleibt - das Modell davor und die Linien dahinter.
    this.zeichnungDeckkraft = 0.45;
    // Welche LASTARTEN gezeigt werden. Voreingestellt alle - wer eine
    // ausblendet, tut das absichtlich und soll das auch sehen.
    this.lastarten = Object.fromEntries(LASTARTEN.map((l) => [l.key, true]));
    // HAUPTSCHALTER der drei Werkzeuggruppen. Aus heisst: die ganze Gruppe
    // verschwindet aus dem Bild, ihre Einzelschalter bleiben aber stehen und
    // werden nur ausgegraut - man sieht so, was man gerade nicht sieht.
    this.gruppen = { modell: true, zeichnung: true, lasten: true, resultate: true };
    // Werte der aufgetragenen Grösse direkt ans Bauteil schreiben.
    this.werteAnschreiben = false;
    // Durchsichtigkeit der Volumenkörper (0 = deckend, 0.9 = fast klar). Bei
    // der Voreinstellung 0.5 bleiben Schwerachsen und dahinterliegende
    // Bauteile sichtbar, ohne dass das Bild seine Körperlichkeit verliert.
    this.transparenz = 0.5;
    // Schriftgrössen in CSS-Pixeln. Sie werden beim Zeichnen mit der
    // Pixeldichte multipliziert - sonst ist die Schrift auf einem
    // Retina-Bildschirm nur halb so gross wie angegeben. Lasten und Bemassung
    // sind getrennt einstellbar: je nach Aufgabe soll das eine lesbar sein und
    // das andere nicht stören.
    this.schrift = 10;
    this.schriftLast = 10;
    this.schriftMass = 10;
    // Die Positionen der Anbauteile sind eine Anschrift, keine Aussage - sie
    // stehen kleiner als alles übrige und treten damit hinter die Werte
    // zurück, die man wirklich liest.
    this.schriftAnbau = 8.5;
    this.modus = 'eta';
    // Angeklicktes Anbauteil - nur dessen Bemassung wird gezeigt.
    this.auswahlTeil = null;
    // Baugruppe, die gerade bearbeitet wird. Sie wird in der Einzelheit
    // gezeigt; null heisst: das ganze Joch.
    this.detail = null;
    this.station = null;      // hervorgehobene Station (null = alle zeigen)
    this.fokus = null;        // {von, bis} - blendet alles ausserhalb aus
    this._massTreffer = [];
    this._titelTreffer = [];   // Bauteiltitel, fuer die Hervorhebung
    this._titelUnterZeiger = null;
    this._belegt = [];
    this._pfeiltexte = [];     // Beschriftungen der Kraftpfeile, siehe _texte
    this._s = 1;              // Gerätepixel je CSS-Pixel, in _male() gesetzt
    this._breiten = new Map(); // Gedächtnis für measureText
    this._angefordert = 0;     // laufende Anforderung eines Bildes
    this._ersteGroesse = true;  // siehe passeGroesseAn
    // Zeichnet gerade nur das Nötige, weil sich die Grösse laufend ändert.
    this.sparsam = false;
    this._nachZeichnen = 0;
    this._verdrahte();
  }

  setzeSzene(szene, behalteKamera = true) {
    const alt = this.szene;
    this.szene = szene;
    if (!alt || !behalteKamera) this.ansichtZuruecksetzen();
    this.zeichne();
  }

  ansichtZuruecksetzen() {
    const g = this.szene?.grenzen;
    if (!g) return;
    this.kamera.ziel = [(g.xMin + g.xMax) / 2, 0, (g.zMin + g.zMax) / 2];
    this.kamera.pan = [0, 0, 0];
    this.blickrichtung('iso', false);
    this.fokus = null;
    this.passeEin();
  }

  /**
   * Auf eine der vorgegebenen Blickrichtungen schwenken.
   *
   * WER DIE BLICKRICHTUNG WÄHLT, WILL DAS GANZE JOCH SEHEN. Bisher blieben
   * Ausschnitt, Verschiebung und Zoom stehen: nach einem Stationszoom
   * schwenkte die Kamera zwar, zeigte aber weiter dieselbe Handbreit Blech,
   * jetzt von der Seite. Deshalb wird gleichzeitig auf das Gesamtmodell
   * zurückgesetzt - Ziel in die Mitte, Verschiebung auf null, Ausschnitt weg
   * und der Abstand so, dass die Hüllbox hineinpasst.
   *
   * `weich=false` ist der Weg von ansichtZuruecksetzen() selbst; dort wäre das
   * eine Endlosschleife, und die Zentrierung ist ohnehin schon geschehen.
   */
  blickrichtung(key, weich = true) {
    const a = ANSICHTEN.find((x) => x.key === key) ?? ANSICHTEN[0];
    this.ansichtKey = key;
    if (!weich) { this.kamera.az = a.az; this.kamera.el = a.el; this.zeichne(); return; }
    const g = this.szene?.grenzen;
    if (g) {
      this.kamera.ziel = [(g.xMin + g.xMax) / 2, 0, (g.zMin + g.zMax) / 2];
      this.kamera.pan = [0, 0, 0];
      this.fokus = null;
      this.station = null;
    }
    // Der Abstand hängt an der Blickrichtung und wird deshalb mitgeführt.
    // passeEin() zeichnet selbst, das genügt der Schleife.
    this._animiereWinkel(a.az, a.el, 340, g ? () => this.passeEin() : null);
  }

  /**
   * Abstand so wählen, dass die Hüllbox gerade ins Bild passt.
   * Statt einer Faustformel wird die Box tatsächlich projiziert - sonst füllt
   * ein langes, flaches Joch das Bild nur zu einem Bruchteil.
   */
  /** Kameraabstand, bei dem alles ins Bild passt - ohne ihn zu setzen. */
  _noetigerAbstand(rand = 0.86) {
    const g = this.szene?.grenzen;
    if (!g) return null;
    const von = this.fokus ? this.fokus.von : g.xMin;
    const bis = this.fokus ? this.fokus.bis : g.xMax;
    const ecken = [];
    [von, bis].forEach((x) => [g.yMin, g.yMax].forEach((y) =>
      [g.zMin, g.zMax].forEach((z) => ecken.push([x, y, z]))));
    const { rechts, hoch } = this._basis();
    const z = this._blickziel();
    let halbB = 0, halbH = 0;
    ecken.forEach((p) => {
      const d = sub(p, z);
      halbB = Math.max(halbB, Math.abs(punkt(d, rechts)));
      halbH = Math.max(halbH, Math.abs(punkt(d, hoch)));
    });
    const seit = this.cv.width / Math.max(1, this.cv.height);
    const tn = Math.tan(this.kamera.fov / 2);
    return Math.max(0.6, Math.max(halbH / tn, halbB / (tn * seit)) / rand);
  }

  passeEin(rand = 0.86) {
    const d = this._noetigerAbstand(rand);
    if (d === null) return;
    this.kamera.dist = d;
    this.zeichne();
  }

  /**
   * NACH EINER BEWEGUNG WIEDER INS BILD HOLEN - aber nur, wenn nötig.
   *
   * Der Massstab hängt allein an der HÖHE der Fläche. Fährt eine Schublade
   * auf, wird die Fläche nur SCHMALER: das Joch bleibt gleich gross und läuft
   * links und rechts aus dem Bild. Während der Fahrt ist genau das richtig -
   * ein mitlaufender Zoom war das Flackern, das abgestellt wurde. Am ENDE der
   * Fahrt ist es ein einzelnes Ereignis, und dort darf die Ansicht nachgeben.
   *
   * ZWEI GRENZEN, damit daraus kein Zoom von selbst wird:
   *   - Es wird nur HERAUSgefahren, nie heran. Ein grösseres Fenster zeigt
   *     also mehr Umgebung, statt das Joch aufzublasen.
   *   - Ein selbst gewählter Ausschnitt bleibt unangetastet: wer auf ein Teil
   *     gezoomt oder das Modell verschoben hat, hat das so gemeint.
   *
   * @returns {boolean} ob nachgefahren wurde
   */
  passeEinWennAbgeschnitten(rand = 0.94) {
    if (this.fokus || this.station !== null) return false;
    const p = this.kamera.pan ?? [0, 0, 0];
    if (Math.hypot(p[0], p[1], p[2]) > 1e-6) return false;
    const noetig = this._noetigerAbstand(rand);
    if (noetig === null || noetig <= this.kamera.dist + 1e-6) return false;
    this.kamera.dist = noetig;
    this.zeichne();
    return true;
  }

  /** Auf eine Stelle x fahren und heranzoomen. */
  zoomAuf(x, station = null, halbeBreite = null) {
    const g = this.szene?.grenzen;
    if (!g) return;
    this.station = station;
    this.kamera.pan = [0, 0, 0];
    if (halbeBreite) {
      this.fokus = { von: Math.max(g.xMin, x - halbeBreite),
                     bis: Math.min(g.xMax, x + halbeBreite) };
    }
    const ziel = [x, 0, (g.zMin + g.zMax) / 2];
    const dist = halbeBreite
      ? Math.max(halbeBreite * 2.6, (g.zMax - g.zMin) * 3.2)
      : Math.max((g.zMax - g.zMin) * 4.5, 1.6);
    this._animiere(ziel, dist);
  }

  /**
   * Auf den Nachweisschnitt zoomen und das Modell dafür zuschneiden.
   * Wird auch beim Einschalten des Schnitts gerufen: das Modell wird dann auf
   * die Stelle aufgetrennt, statt den Schnitt irgendwo in der Gesamtansicht
   * verschwinden zu lassen.
   */
  zeigeSchnitt(halbeBreite) {
    const x = this.szene?.xNachweis;
    if (x === undefined) return;
    this.ebenen.kraefte = true;
    this.ebenen.schnitt = true;

    // DER AUSSCHNITT RICHTET SICH NACH DER ORIENTIERUNG.
    //
    // Der Querschnitt liegt an EINER Stelle; ihn heranzuholen und das Joch
    // dafuer auf drei Felder aufzutrennen ist genau richtig.
    //
    // Ein Laengsschnitt dagegen legt die Bleche EINER Ebene ueber die ganze
    // Spannweite frei - er ist da, damit sich ihre Schnittkraefte
    // nebeneinander ablesen lassen. Auf drei Felder zugeschnitten sah man
    // sieben von dreiunddreissig Blechen, und die Schnittebene lief sichtbar
    // ueber das abgeschnittene Modell hinaus ins Leere: sie ist vom
    // Ausschnitt ausgenommen, das Modell nicht.
    const orient = this.szene?.schnitt?.orientierung ?? 'quer';
    if (orient === 'quer') { this.zoomAuf(x, null, halbeBreite); return; }

    // Und zwar von der Seite bzw. von oben: nur so stehen die Bleche der
    // geschnittenen Ebene flaechig im Bild und ihre Beschriftungen in einer
    // Reihe.
    //
    // NUR EINRICHTEN, WAS NICHT SCHON EINGERICHTET IST. Der Feldschieber ruft
    // hier bei JEDEM Schritt herein, und beim Laengsschnitt aendert er nur die
    // Stelle der Auswertung, nicht das Bild. Bedingungslos geschwenkt riss es
    // einem die Ansicht bei jedem Klick zurueck - wer sich eine Stelle
    // herangeholt hat, verloere sie sofort wieder.
    const blick = orient === 'vertikal' ? 'laengs' : 'oben';
    if (this.fokus === null && this.ansichtKey === blick) return;
    this.station = null;
    this.blickrichtung(blick);
  }

  ganzesJoch() {
    const g = this.szene?.grenzen;
    if (!g) return;
    this.fokus = null;
    this.detail = null;
    this.kamera.pan = [0, 0, 0];
    const d0 = this.kamera.dist;
    this.passeEin();
    const ziel = this.kamera.dist;
    this.kamera.dist = d0;
    this._animiere([(g.xMin + g.xMax) / 2, 0, (g.zMin + g.zMax) / 2], ziel);
  }

  /**
   * EINZELHEITSBLICK auf eine Baugruppe.
   *
   * Während man an einer Baugruppe schraubt, nützt die Gesamtansicht nichts:
   * die Teile sind dort ein paar Pixel gross und ihre Masse unlesbar. Hier wird
   * deshalb auf die Baugruppe zugeschnitten - in x auf ihren Anschlussbereich,
   * in z auf die volle Spanne ihrer Teile - und ihre Bemassung eingeschaltet.
   *
   * Zurück zum ganzen Joch geht es über ganzesJoch(); das geschieht von selbst,
   * sobald die Karte zufällt.
   *
   * @param {number} index Stelle in der Liste der Anbauteile
   */
  zeigeAnbauteil(index) {
    const b = (this.szene?.anbauteile ?? []).find((d) => d.index === index);
    if (!b) return;
    this.detail = b.teil;
    this.auswahlTeil = b.teil;      // schaltet die Bemassung dieses Teils ein
    this.ebenen.masse = true;
    this.ebenen.anbau = true;       // sonst zeigte der Blick auf ein Teil nichts
    this.ebenen.last = true;
    this.station = null;
    this.kamera.pan = [0, 0, 0];
    // In x nur die nähere Umgebung: das Teil und ein paar Felder daneben.
    const g = this.szene.grenzen;
    // Ein Kragarm reicht ueber das Raster hinaus - sonst schnitte der Blick
    // genau das Teil ab, das man ansehen wollte.
    const spanne = Math.max((b.xMax ?? b.x) - (b.xMin ?? b.x), 0);
    const halb = Math.max(1.2, b.r * 6, spanne * 0.9);
    const mitte = ((b.xMin ?? b.x) + (b.xMax ?? b.x)) / 2;
    this.fokus = { von: Math.max(g.xMin, mitte - halb),
                   bis: Math.min(g.xMax, mitte + halb) };
    // In z die ganze Spanne der Baugruppe, damit kein Teil abgeschnitten wird.
    const zM = (b.zMin + b.zMax) / 2;
    const hoehe = Math.max(b.zMax - b.zMin, 0.6);
    const dist = Math.max(hoehe * 1.9, halb * 2.2);
    this._animiere([b.x, 0, zM], dist);
  }

  _animiere(ziel, dist, ms = 420) {
    const k = this.kamera;
    const z0 = [...k.ziel], d0 = k.dist, t0 = performance.now();
    const schritt = (t) => {
      const f = Math.min(1, (t - t0) / ms);
      const e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;   // ease in/out
      k.ziel = z0.map((v, i) => v + (ziel[i] - v) * e);
      k.dist = d0 + (dist - d0) * e;
      this.zeichne();
      if (f < 1) requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  }

  /**
   * Auf einen Blickwinkel schwenken.
   *
   * `beiJedemBild` läuft in JEDEM Zwischenbild mit, nicht erst am Ende: der
   * nötige Kameraabstand hängt vom Blickwinkel ab (von der Seite braucht ein
   * 20-Meter-Joch mehr Platz als über Eck), und wer ihn einmal vorher oder
   * einmal nachher rechnet, bekommt entweder einen Sprung am Anfang oder
   * einen am Ende.
   */
  _animiereWinkel(az, el, ms = 340, beiJedemBild = null) {
    const k = this.kamera;
    // kürzesten Weg über den Kreis nehmen
    let d = ((az - k.az + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const a0 = k.az, e0 = k.el, t0 = performance.now();
    const schritt = (t) => {
      const f = Math.min(1, (t - t0) / ms);
      const e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
      k.az = a0 + d * e;
      k.el = e0 + (el - e0) * e;
      if (beiJedemBild) beiJedemBild();
      this.zeichne();
      if (f < 1) requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  }

  // --- Eingabe -------------------------------------------------------------
  /**
   * MAUS, TRACKPAD, FINGER UND TASTATUR - alle über dieselbe Zeigerliste.
   *
   *   Maus      linke Taste           drehen (mit Umschalt in 15°-Schritten)
   *             rechte/mittlere Taste schieben
   *             Alt + linke Taste     schieben (Geräte ohne rechte Taste)
   *             Rad                   zoomen, auf den Zeiger zu
   *             Rad quer / Trackpad   schieben
   *             Doppelklick           das getroffene Bauteil heranholen
   *
   *   Finger    ein Finger            drehen
   *             zwei Finger           kneifen zoomt, wischen schiebt
   *             Doppeltipp            das getroffene Bauteil heranholen
   *
   *   Tastatur  Pfeile                drehen, mit Umschalt schieben
   *             + / -                 zoomen
   *             0                     ganzes Joch
   *
   * DREI ENTSCHEIDUNGEN, DIE DAS VERHALTEN PRÄGEN
   *
   * Gedreht wird immer um die Bildmitte. Ein Drehpunkt daneben ist mit einer
   * achszentrierten Projektion nicht vereinbar - und wäre auch unpraktisch:
   * man will um das drehen, was man ansieht. Wer etwas anderes in der Mitte
   * haben will, holt es mit einem Doppelklick dorthin.
   *
   * Gezoomt wird dagegen NICHT auf die Mitte, sondern auf den Zeiger bzw. auf
   * die Mitte zwischen den Fingern (siehe _zoome). Sonst kommt einem beim
   * Heranfahren die Bildmitte entgegen und nicht die Stelle, die man ansehen
   * wollte - und das bei jedem Radschritt aufs Neue.
   *
   * ALLE ZEIGER LIEGEN IN EINER MAP.
   * Ein einzelnes «ziehen»-Objekt reicht für die Maus, aber nicht für zwei
   * Finger: dort braucht es beide Punkte gleichzeitig, und beide bewegen
   * sich. Hebt einer ab, wird die Geste NEU ANGESETZT statt fortgeführt -
   * sonst springt das Bild um den halben Fingerabstand.
   */
  _verdrahte() {
    const c = this.cv;
    c.style.touchAction = 'none';
    // Ohne Fokus bekommt eine Zeichenfläche keine Tastendrücke.
    if (!c.hasAttribute('tabindex')) c.tabIndex = 0;
    /*
     * >>> RECHTSKLICK: WAS HIER ZU TUN IST. <<<
     *
     * Weisung vom 2. September: «ausblenden mit rechtsklick ermöglichen im
     * 3d sowie in der sidebar. man könnte sonst einige nützliche kontext
     * optionen unter rechtsklick aufführen.»
     *
     * Das Eigenmenue des Browsers war hier schon unterdrueckt - es bot
     * «Bild speichern unter», und das ist auf einer Zeichenflaeche keine
     * sinnvolle Antwort. Jetzt steht an seiner Stelle, was an DIESER Stelle
     * zu tun ist.
     *
     * DAS MENUE KENNT DEN GEGENSTAND, NICHT DIE ANWENDUNG. Es meldet nur,
     * WORAUF geklickt wurde - Tragwerk, Mast, Anbauteil oder leerer Grund -,
     * und app.js entscheidet, was dort angeboten wird. Die Ansicht weiss
     * nichts von Ausblenden und Bauteillisten, und das soll so bleiben.
     */
    c.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!this.opt.beiKontext) return;
      const [px, py] = this._geraetePunkt(e);
      const tr = this._treffer(e);
      const f = tr?.flaeche;
      const teil = typeof f?.teil === 'string' ? f.teil : '';
      const was = teil.startsWith('MAST_') ? 'mast'
        : f?.anbauteil ? 'anbauteil'
        : f ? 'tragwerk' : 'grund';
      this.opt.beiKontext({
        was,
        // Welches Tragwerk: die Flaeche traegt es seit der Blattszene. Fehlt
        // es, ist es das gerechnete - dann steht nur eines da.
        twId: f?.twId ?? null,
        mastEnde: was === 'mast' ? teil.slice(5) : null,
        anbauteil: was === 'anbauteil'
          ? (this.szene?.anbauteile ?? []).find((d) => d.teil === teil)?.index
          : null,
        welt: this.weltTreffer(px, py),
        // Bildschirmpunkt in CSS-Pixeln - dort erscheint das Menue.
        bei: [e.clientX, e.clientY],
      });
    });

    /** Aufliegende Zeiger: id -> Punkt in Gerätepixeln. */
    const zeiger = new Map();
    /** Laufende Geste, null wenn nichts aufliegt. */
    let griff = null;
    /** Doppeltipp-Erkennung - für Finger gibt es kein «dblclick». */
    let tippZeit = 0, tippOrt = null;

    const schiebemodus = (e) => e.button === 1 || e.button === 2 || e.altKey ||
                                this.werkzeug === 'schieben';

    /** Weite und Mitte zwischen den ersten zwei Zeigern, in Gerätepixeln. */
    const spanne = () => {
      const [a, b] = [...zeiger.values()];
      if (!a || !b) return null;
      return { weite: Math.hypot(b[0] - a[0], b[1] - a[1]),
               mitte: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
    };

    c.addEventListener('pointerdown', (e) => {
      // Kann fehlschlagen, wenn der Zeiger schon wieder weg ist - dann
      // laeuft die Geste eben ohne Fang weiter, statt hier abzubrechen.
      try { c.setPointerCapture(e.pointerId); } catch { /* kein Fang */ }
      c.focus?.({ preventScroll: true });
      zeiger.set(e.pointerId, this._geraetePunkt(e));
      if (zeiger.size === 1) {
        /*
         * IM BILDSCHIEBEMODUS ZIEHT MAN DAS BILD, nicht die Kamera.
         *
         * Er steht vor der ueblichen Unterscheidung: solange er laeuft, ist
         * das Ziehen fuer die Zeichnung reserviert. Sonst muesste man sich
         * merken, welche Maustaste gerade was tut - und ein versehentlich
         * gedrehtes Modell sieht aus wie ein verschobenes Bild.
         */
        const bild = this.zeichnungSchieben && this.zeichnung?.kalibrierung;
        griff = { art: bild ? 'bild' : schiebemodus(e) ? 'schieben' : 'drehen',
                  bewegt: false, start: [e.clientX, e.clientY] };
        c.style.cursor = griff.art === 'drehen' ? 'move' : 'grabbing';
      } else if (zeiger.size === 2) {
        // Der zweite Finger beendet das Drehen; was bis hierher gedreht
        // wurde, bleibt stehen.
        griff = { art: 'kneifen', bewegt: true, ...spanne() };
        c.style.cursor = '';
      } else {
        griff = null;                    // drei Finger: lieber nichts als Unfug
      }
    });

    c.addEventListener('pointermove', (e) => {
      /*
       * DIE ZEIGERSPUR LAEUFT IMMER MIT - vor der Griffabfrage.
       *
       * Darunter stand `if (!griff) return`, also erfuhr die Ansicht von einer
       * Bewegung nur, solange gezogen wurde. Fuer das Fadenkreuz beim
       * Einmessen ist aber genau die Bewegung OHNE Knopfdruck gefragt.
       */
      if (this.beiZeichnungsklick) {
        this._fadenkreuz = this._geraetePunkt(e);
        this.zeichne();
      }
      /*
       * WELCHER BAUTEILTITEL UNTER DEM ZEIGER LIEGT.
       *
       * Er ist anklickbar, sieht aber aus wie eine Beschriftung; ohne
       * Rueckmeldung probiert es niemand. Neu gezeichnet wird nur, wenn sich
       * die Antwort AENDERT - sonst liefe bei jeder Mausbewegung ein Bild,
       * und das sind auf einem grossen Modell sechzig in der Sekunde.
       */
      {
        const [zx, zy] = this._geraetePunkt(e);
        const treffer = (this._titelTreffer ?? []).find(
          (h) => zx >= h.x && zx <= h.x + h.w && zy >= h.y && zy <= h.y + h.h);
        const jetzt = treffer ? treffer.bt : null;
        if (jetzt !== this._titelUnterZeiger) {
          this._titelUnterZeiger = jetzt;
          this.cv.style.cursor = jetzt ? 'pointer' : '';
          this.zeichne();
        }
      }
      if (!zeiger.has(e.pointerId) || !griff) return;
      const vorher = zeiger.get(e.pointerId);
      const jetzt = this._geraetePunkt(e);
      zeiger.set(e.pointerId, jetzt);

      if (griff.art === 'kneifen') {
        const s = spanne();
        if (!s) return;
        // ERST SCHIEBEN, DANN ZOOMEN. Nach dem Schieben liegt unter der
        // Fingermitte genau der Punkt, der dort liegen bleiben soll - und
        // um den dreht sich das Kneifen.
        this._schiebe(s.mitte[0] - griff.mitte[0], s.mitte[1] - griff.mitte[1]);
        // Unter etwa einem Zentimeter Fingerabstand wird das Verhältnis der
        // beiden Weiten wild; dann bleibt es beim Schieben.
        if (griff.weite > 24 && s.weite > 24) {
          this._zoome(griff.weite / s.weite, s.mitte[0], s.mitte[1]);
        }
        griff.weite = s.weite;
        griff.mitte = s.mitte;
        this.zeichne();
        return;
      }

      if (Math.abs(e.clientX - griff.start[0]) +
          Math.abs(e.clientY - griff.start[1]) > 3) griff.bewegt = true;
      const dx = jetzt[0] - vorher[0], dy = jetzt[1] - vorher[1];
      if (griff.art === 'bild') this.verschiebeZeichnung(dx, dy);
      else if (griff.art === 'schieben') this._schiebe(dx, dy);
      else this._drehe(dx, dy, e.shiftKey);
      this.zeichne();
    });

    const beiHoch = (e) => {
      const ruhig = griff && griff.art !== 'kneifen' &&
                    zeiger.size === 1 && !griff.bewegt;
      zeiger.delete(e.pointerId);
      try { c.releasePointerCapture(e.pointerId); } catch { /* schon frei */ }

      if (ruhig) {
        // Doppeltipp/Doppelklick hier statt über «dblclick»: das Ereignis
        // gibt es für Finger nicht verlässlich, und zwei Wege für dieselbe
        // Geste hiessen zwei Verhalten.
        const t = performance.now();
        const nah = tippOrt &&
          Math.hypot(e.clientX - tippOrt[0], e.clientY - tippOrt[1]) < 26;
        if (nah && t - tippZeit < 340) {
          tippZeit = 0; tippOrt = null;
          const tr = this._treffer(e);
          if (tr) this.holeInDieMitte(tr.mitte);
        } else {
          tippZeit = t; tippOrt = [e.clientX, e.clientY];
          this._klick(e);
        }
      }

      if (zeiger.size === 1 && griff?.art === 'kneifen') {
        griff = { art: 'drehen', bewegt: true, start: [e.clientX, e.clientY] };
      } else if (zeiger.size === 0) {
        c.style.cursor = '';
        griff = null;
      }
    };
    c.addEventListener('pointerup', beiHoch);
    c.addEventListener('pointercancel', beiHoch);
    // Verlaesst der Zeiger die Flaeche, gehoert das Fadenkreuz weg - sonst
    // bliebe es an der letzten Stelle stehen und zeigte auf nichts.
    c.addEventListener('pointerleave', () => {
      if (this._fadenkreuz) { this._fadenkreuz = null; this.zeichne(); }
    });

    /*
     * Radschritte kommen je nach Gerät in Pixeln, Zeilen oder Seiten. Ohne
     * Umrechnung zoomt eine Maus, die Zeilen meldet (deltaY = 3), praktisch
     * nicht: der Faktor wäre 1.0036 je Rasterschritt.
     */
    const inPixel = (wert, modus) => modus === 1 ? wert * 16
      : modus === 2 ? wert * (this.cv.clientHeight || 600) : wert;

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const dy = inPixel(e.deltaY, e.deltaMode);
      const dx = inPixel(e.deltaX, e.deltaMode);
      const [px, py] = this._geraetePunkt(e);
      // Zwei-Finger-Wischen auf dem Trackpad schiebt, Kneifen zoomt - das
      // meldet der Browser als Rad mit gedrückter Strg-Taste.
      if (e.ctrlKey || Math.abs(dy) > Math.abs(dx) * 2) {
        this._zoome(Math.exp(dy * 0.0012), px, py);
      } else {
        const s = this._dpr();
        this._schiebe(-dx * s, -dy * s);
      }
      this.zeichne();
    }, { passive: false });

    c.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const w = 40;                          // Gerätepixel je Tastendruck
      const p = { ArrowLeft: [-w, 0], ArrowRight: [w, 0],
                  ArrowUp: [0, -w], ArrowDown: [0, w] }[e.key];
      if (p && this.zeichnungSchieben && this.zeichnung?.kalibrierung) {
        /*
         * IM SCHIEBEMODUS RUECKEN DIE PFEILE DAS BILD, in Metern.
         *
         * Fuenf Zentimeter je Druck, mit Umschalt ein Zentimeter. Ziehen
         * bringt es grob hin; das letzte Stueck trifft man mit der Maus
         * nicht, weil ein Bildpunkt je nach Zoom mehrere Zentimeter ist.
         */
        const w2 = e.shiftKey ? 0.01 : 0.05;
        this.verschiebeZeichnungWelt(Math.sign(p[0]) * w2,
                                     -Math.sign(p[1]) * w2);
        this.zeichne();
        e.preventDefault();
        return;
      }
      if (p) {
        // Umschalt schiebt. Bei der Maus rastet Umschalt das Drehen - hier
        // gäbe es nichts zu rasten, die Tastatur dreht ohnehin in Schritten.
        if (e.shiftKey) this._schiebe(p[0], p[1]);
        else this._drehe(p[0] * 0.6, p[1] * 0.6);
        this.zeichne();
      } else if (e.key === '+' || e.key === '=') {
        this._zoome(0.85); this.zeichne();
      } else if (e.key === '-' || e.key === '_') {
        this._zoome(1 / 0.85); this.zeichne();
      } else if (e.key === '0') {
        this.ganzesJoch();
      } else return;
      e.preventDefault();
    });
  }

  /**
   * Ein Bauteil in die Bildmitte holen - und damit zum Drehpunkt machen.
   * Weich animiert, damit nachvollziehbar bleibt, wohin die Ansicht springt.
   */
  holeInDieMitte(p) {
    this.kamera.pan = [0, 0, 0];
    this._animiere([...p], this.kamera.dist);
    this.opt.beiDrehpunkt?.(p);
  }

  _geraetePunkt(e) {
    const r = this.cv.getBoundingClientRect();
    return [(e.clientX - r.left) * (this.cv.width / r.width),
            (e.clientY - r.top) * (this.cv.height / r.height)];
  }

  /** Getroffene Fläche unter dem Zeiger. */
  _treffer(e) {
    const [px, py] = this._geraetePunkt(e);
    let beste = null, tiefe = Infinity;
    this._sichtbareFlaechen().forEach((f) => {
      const pts = f._2d;
      if (!pts || !this._imPolygon(px, py, pts)) return;
      if (f._tiefe < tiefe) { tiefe = f._tiefe; beste = f; }
    });
    if (!beste) return null;
    const n = beste.punkte.length;
    const mitte = beste.punkte.reduce((s, p) => add(s, p), [0, 0, 0]).map((v) => v / n);
    return { flaeche: beste, mitte };
  }

  /** Klick: erst Bemassung, dann Bauteil. */
  _klick(e) {
    if (!this.szene) return;
    /*
     * WER DAS BILD SCHIEBT, WAEHLT KEIN BAUTEIL AUS.
     *
     * Ein Zug ohne Bewegung ist ein Klick - und der haette sonst mitten im
     * Schieben das Tragwerk gewechselt, unter dem die Zeichnung gerade liegt.
     */
    if (this.zeichnungSchieben) return;
    const [px, py] = this._geraetePunkt(e);
    /*
     * WIRD GERADE KALIBRIERT, GEHÖRT DER KLICK DER ZEICHNUNG.
     *
     * Vor allem anderen: während des Einmessens will man einen Punkt auf dem
     * BILD treffen, nicht ein Bauteil davor. Sonst führe die Ansicht beim
     * ersten Klick auf eine Station und die Zeichnung stünde weiter schief.
     */
    if (this.beiZeichnungsklick) {
      const t = this.zeichnungTreffer(px, py);
      if (t) { this.beiZeichnungsklick(t, [px, py]); return; }
    }
    /*
     * WIRD GERADE EIN BAUTEIL GESETZT, GEHÖRT DER KLICK DER STELLE.
     *
     * Nicht dem Bauteil, das dort schon steht: wer setzt, zielt auf einen
     * ORT. Sonst wählte der erste Klick ein vorhandenes Teil aus, statt das
     * neue zu setzen.
     */
    if (this.beiStelle) {
      const w = this.weltTreffer(px, py);
      if (w) { this.beiStelle(w); return; }
    }
    const mt = this._massTreffer.find(
      (t) => px >= t.x && px <= t.x + t.w && py >= t.y && py <= t.y + t.h);
    // DER TREFFER GEHT MIT. Ein Titel weiss, zu welchem Tragwerk und zu
    // welchem Mastende er gehoert; ohne diese Angabe fuehrte der Klick auf
    // ein Feld, das gerade einem anderen Bauteil gilt.
    if (mt) { this.opt.beiMass?.(mt.feld, mt.tab, mt.bt ?? null); return; }
    const tr = this._treffer(e);
    /*
     * EIN KLICK AUF EIN NICHT AKTIVES TRAGWERK MACHT ES AKTIV (Weisung,
     * 2. September).
     *
     * Er steht VOR allen anderen Treffern: solange ein Tragwerk nicht das
     * gerechnete ist, gibt es an ihm nichts zu bemassen und nichts
     * auszuwerten. Die einzige sinnvolle Antwort auf einen Klick ist, es zum
     * gerechneten zu machen.
     *
     * Gepruef wird die getroffene FLAECHE, nicht eine umschliessende Box:
     * zwei Tragwerke koennen sich im Bild ueberlappen, und dann meint der
     * Klick das, worauf der Zeiger wirklich steht.
     */
    if (tr?.flaeche.passiv && tr.flaeche.twId && this.opt.beiTragwerk) {
      this.opt.beiTragwerk(tr.flaeche.twId);
      return;
    }
    /*
     * DER MAST IST ANKLICKBAR (Weisung).
     *
     * Er steht seit kurzem als Koerper da - und was man sieht, will man auch
     * anfassen. Ein Klick fuehrt zu seiner Eingabe: Ende A auf die Masthoehe,
     * Ende B auf die des zweiten Mastes, sofern es einen gibt.
     *
     * Ueber `beiMast`, nicht ueber `beiAuswahl`: die Mastflaechen tragen
     * keine Station, und der Sprung soll in die AUFLAGER-Gruppe fuehren,
     * nicht an eine Stelle des Jochs.
     */
    const mastTeil = tr?.flaeche.teil;
    if (typeof mastTeil === 'string' && mastTeil.startsWith('MAST_')) {
      this.opt.beiMast?.(mastTeil.slice(5));
      return;
    }
    // Anbauteil anklicken heisst: dieses Teil ist jetzt das aktive, und nur
    // seine Bemassung wird gezeigt. Ein Klick daneben hebt die Auswahl auf.
    const teil = tr?.flaeche.anbauteil ? tr.flaeche.teil : null;
    if (teil !== this.auswahlTeil) { this.auswahlTeil = teil; this.zeichne(); }
    if (tr && this.opt.beiAuswahl &&
        tr.flaeche.station !== undefined && tr.flaeche.station !== null) {
      this.opt.beiAuswahl(tr.flaeche.station, tr.flaeche);
    } else if (tr?.flaeche.anbauteil && this.opt.beiAnbauteil) {
      // Anbauteil angeklickt: die Oberfläche soll genau dieses Teil zeigen -
      // Karte auf, übrige zu, Schublade auf, falls sie eingeklappt war.
      const b = (this.szene?.anbauteile ?? []).find((d) => d.teil === teil);
      this.opt.beiAnbauteil(b?.index ?? null, tr.flaeche.anbauteil);
    }
  }

  _imPolygon(x, y, p) {
    let d = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      if ((p[i][1] > y) !== (p[j][1] > y) &&
          x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) {
        d = !d;
      }
    }
    return d;
  }

  _basis() {
    const { az, el } = this.kamera;
    const vor = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
    const rechts = norm(kreuz(vor, [0, 0, 1]));
    const hoch = kreuz(rechts, vor);
    return { vor, rechts, hoch };
  }

  /** Punkt, auf den die Kamera blickt: Drehpunkt plus Raumverschiebung. */
  _blickziel() {
    const k = this.kamera;
    return add(k.ziel, k.pan);
  }

  _kameraPos() {
    const { vor } = this._basis();
    const k = this.kamera;
    return add(this._blickziel(), skal(vor, k.dist));
  }

  /** Weltmass je Bildpixel in der Zielebene - für das Schieben im Raum. */
  _weltProPixel() {
    const h = Math.max(1, this.cv.height);
    return (2 * Math.tan(this.kamera.fov / 2) * this.kamera.dist) / h;
  }

  /** Gerätepixel je CSS-Pixel der Zeichenfläche. */
  _dpr() {
    return this.cv.width / (this.cv.getBoundingClientRect().width || 1);
  }

  /**
   * Quer zur Blickrichtung schieben, dx/dy in GERÄTEPIXELN.
   *
   * Verschoben wird im RAUM: Auge und Blickziel wandern gemeinsam. Die
   * Projektion bleibt achszentriert, das Modell verzieht sich auch aus der
   * Nähe nicht. Die Richtung ist die der Hand - das Bild folgt dem Finger.
   */
  _schiebe(dx, dy) {
    const { rechts, hoch } = this._basis();
    const w = this._weltProPixel();
    this.kamera.pan = add(this.kamera.pan,
      add(skal(rechts, -dx * w), skal(hoch, dy * w)));
  }

  /**
   * Um die Bildmitte drehen, dx/dy in GERÄTEPIXELN.
   *
   * DAS MODELL FOLGT DER HAND, auf beiden Achsen. Wer die zugewandte Seite
   * nach rechts zieht, sieht sie nach rechts wandern - wie beim Drehen eines
   * Werkstücks, das man in der Hand hält.
   *
   * Das war lange nur senkrecht so. Waagrecht lief die Ansicht der Hand
   * ENTGEGEN: `az -= dx` dreht die Kamera in die Zugrichtung, und damit das
   * Modell dagegen. Dass beide Achsen sich widersprachen, machte das Drehen
   * spiegelverkehrt. Nachgerechnet über _projektor() am zugewandten Punkt
   * Ziel + vor·r: 60 Pixel nach rechts gezogen wanderte er 88 Pixel nach
   * links.
   *
   * Die Empfindlichkeit ist auf die Fensterbreite bezogen: eine volle Breite
   * entspricht etwa einer halben Umdrehung - auf dem Telefon wie auf dem
   * grossen Bildschirm dieselbe Handbewegung für denselben Winkel.
   */
  _drehe(dx, dy, raster = false) {
    const breite = this.cv.getBoundingClientRect().width || 1;
    const s = Math.PI / Math.max(320, breite) / this._dpr();
    const k = this.kamera;
    k.az += dx * s;
    k.el = Math.max(-1.45, Math.min(1.45, k.el + dy * s));
    if (raster) {
      const r = Math.PI / 12;                                        // 15°
      k.az = Math.round(k.az / r) * r;
      k.el = Math.round(k.el / r) * r;
    }
    this.ansichtKey = null;
  }

  /**
   * Wie nah und wie weit darf die Kamera?
   *
   * Nicht fest, sondern am Modell gemessen. Feste Schranken (früher 0.4 bis
   * 400) passen entweder zum 6-Meter-Joch oder zum 20-Meter-Joch, nie zu
   * beiden: beim einen kommt man nicht heran, beim anderen verliert man es
   * aus dem Bild.
   */
  _abstandsgrenzen() {
    const g = this.szene?.grenzen;
    if (!g) return [0.4, 400];
    const d = Math.hypot(g.xMax - g.xMin, g.yMax - g.yMin, g.zMax - g.zMin);
    return [Math.max(0.12, d * 0.015), Math.max(8, d * 8)];
  }

  /**
   * Abstand ändern und dabei den Weltpunkt unter (px,py) festhalten -
   * «auf den Zeiger zoomen». Ohne Punkt wird auf die Bildmitte gezoomt.
   *
   * WARUM NICHT AUF DIE MITTE
   * Wer eine Ecke des Jochs ansehen will, zoomt heran und muss anschliessend
   * nachschieben, weil ihm die Mitte entgegengekommen ist statt der Ecke.
   * Bei jedem Radschritt aufs Neue.
   *
   * WIE ES GEHT
   * Der Bildpunkt (px,py) liegt vom Mittelpunkt aus bei rechts·ex·w und
   * hoch·(-ey)·w, wobei w das Weltmass je Pixel in der Zielebene ist. Mit dem
   * Abstand skaliert auch w. Damit derselbe Weltpunkt wieder unter (px,py)
   * liegt, wandert das Blickziel um die DIFFERENZ der beiden Weltmasse.
   *
   * Festgehalten wird dabei der Punkt in der ZIELEBENE. Für alles davor und
   * dahinter bleibt eine Restbewegung - die lässt sich perspektivisch nicht
   * vermeiden, denn dort hat jede Tiefe ihren eigenen Massstab.
   */
  _zoome(faktor, px = null, py = null) {
    const k = this.kamera;
    const [min, max] = this._abstandsgrenzen();
    const neu = Math.max(min, Math.min(max, k.dist * faktor));
    const f = neu / k.dist;              // was von faktor wirklich ankommt
    if (f === 1) return;                 // an der Schranke: auch nicht schieben
    if (px !== null && py !== null) {
      const { rechts, hoch } = this._basis();
      const w = this._weltProPixel() * (1 - f);
      const ex = px - this.cv.width / 2, ey = py - this.cv.height / 2;
      k.pan = add(k.pan, add(skal(rechts, ex * w), skal(hoch, -ey * w)));
    }
    k.dist = neu;
    this._selbstGezoomt = true;
  }

  _projektor() {
    const auge = this._kameraPos();
    const { vor, rechts, hoch } = this._basis();
    const w = this.cv.width, h = this.cv.height;

    // Die Rechnung ist bewusst ausgeschrieben statt über sub() und punkt():
    // sie läuft je Bild einige zehntausend Mal, und jeder Zwischenvektor wäre
    // ein Objekt, das gleich wieder weggeräumt werden muss.
    const [ax, ay, az] = auge;
    const [vx, vy, vz] = vor, [rx, ry, rz] = rechts, [hx, hy, hz] = hoch;

    if (this.projektion === 'orthogonal') {
      // Kein Tiefenteiler: der Massstab ist überall gleich. Er wird so
      // gewählt, dass in der Zielebene derselbe Ausschnitt steht wie in der
      // Perspektive - Umschalten ändert dann den Bildausschnitt nicht.
      const s = 1 / this._weltProPixel();
      return (p) => {
        const dx = p[0] - ax, dy = p[1] - ay, dz = p[2] - az;
        return [w / 2 + (dx * rx + dy * ry + dz * rz) * s,
                h / 2 - (dx * hx + dy * hy + dz * hz) * s,
                -(dx * vx + dy * vy + dz * vz)];
      };
    }

    const f = (h / 2) / Math.tan(this.kamera.fov / 2);
    return (p) => {
      const dx = p[0] - ax, dy = p[1] - ay, dz = p[2] - az;
      const z = -(dx * vx + dy * vy + dz * vz);
      if (z < 0.02) return null;
      return [w / 2 + (dx * rx + dy * ry + dz * rz) * f / z,
              h / 2 - (dx * hx + dy * hy + dz * hz) * f / z, z];
    };
  }

  /**
   * DIE HINTERLEGTE ZEICHNUNG, NUR IN DER LÄNGSANSICHT.
   *
   * Ein Querprofil ist ein flaches Bild in der x-z-Ebene. In der Isometrie
   * stünde es schief im Raum und würde mehr behaupten, als es weiss; in der
   * Draufsicht wäre es eine Kante. Gezeichnet wird es deshalb nur dort, wo
   * seine Ebene parallel zum Bildschirm liegt - und `ansichtKey` sagt das
   * verlässlich, weil es beim freien Drehen auf null fällt.
   *
   * Die beiden gegenüberliegenden Ecken werden durch dieselbe Projektion
   * geschickt wie jeder Bauteilpunkt. Damit sitzt das Bild bei jedem Zoom und
   * jeder Fahrt an derselben Stelle wie das Modell - genau das ist der Zweck.
   */
  _zeichnungMalen(c, proj, t) {
    const z = this.zeichnung;
    if (!z || !z.bild || !z.kalibrierung) return;
    if (!this._ebeneAn('zeichnung') || this.ansichtKey !== 'laengs') return;
    const k = z.kalibrierung;
    const ecke = (px, py) => proj([k.x0 + k.s * px, 0, k.z0 - k.s * py]);
    const a = ecke(0, 0), b = ecke(z.breite, z.hoehe);
    if (!a || !b) return;
    const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]);
    const w = Math.abs(b[0] - a[0]), h = Math.abs(b[1] - a[1]);
    // Ein Bild ohne Ausdehnung ist keines - und drawImage mit 0 wirft.
    if (!(w > 0.5) || !(h > 0.5)) return;
    /*
     * AUF DUNKLEM GRUND WIRD DIE ZEICHNUNG UMGEKEHRT.
     *
     * Ein Querprofil ist schwarz auf weiss, die Modellansicht weiss auf fast
     * schwarz. Unverändert daruntergelegt wäre das Blatt eine helle Fläche,
     * auf der das Modell verschwindet - und je durchsichtiger man es stellt,
     * desto weniger sieht man VON DER ZEICHNUNG, während die Fläche bleibt.
     *
     * Umgekehrt gelegt fügt sie sich ein: dunkler Grund, helle Linien, wie
     * alles andere im Bild. Entschieden wird das an der Helligkeit des
     * Hintergrunds, nicht über einen weiteren Schalter - im hellen Aussehen
     * bleibt die Zeichnung, wie sie ist.
     */
    c.save();
    c.globalAlpha = Math.max(0, Math.min(1, this.zeichnungDeckkraft));
    c.imageSmoothingQuality = 'high';
    if (dunkel(t?.viewerBg) && 'filter' in c) c.filter = 'invert(1)';
    try { c.drawImage(z.bild, x, y, w, h); } catch { /* Bild noch nicht da */ }
    c.restore();
  }

  /**
   * DIE MASSKETTE ALS FANGLINIEN.
   *
   * Über dem Joch steht auf jedem Querprofil eine Kette von Massen ab dem
   * linken Jochende - die Stellen, an denen wirklich etwas hängt. Einmal
   * abgeschrieben, stehen sie hier als lotrechte Linien: man sieht, wohin ein
   * Bauteil gehört, und die Eingabe fängt darauf (ui.js).
   *
   * In der LäNGSANSICHT, wie die Zeichnung: dort ist eine Linie bei x eine
   * Lotrechte im Bild. In der Isometrie wäre sie eine Gerade quer durch den
   * Raum und sähe nach etwas aus, das sie nicht ist.
   */
  _massketteMalen(c, proj, t) {
    const kette = this.masskette;
    if (!Array.isArray(kette) || !kette.length) return;
    if (!this._ebeneAn('masskette') || this.ansichtKey !== 'laengs') return;
    const s = this._s;
    /*
     * WIE WEIT DIE LINIE REICHT.
     *
     * Über die Grenzen der Szene hinaus, aber nicht ins Uferlose: sie soll
     * an Joch UND Anbauteilen vorbeilaufen, damit man beides an ihr abliest.
     * Ein halber Meter Zugabe genügt - eine Linie, die halb aus dem Bild
     * ragt, sagt nicht mehr als eine, die anstösst.
     */
    const g = this.szene?.grenzen;
    const zOben = (g ? g.zMax : 0.5) + 0.5;
    const zUnten = (g ? g.zMin : -3) - 0.5;
    c.save();
    c.strokeStyle = t.acc ?? '#4aa3df';
    c.globalAlpha = 0.5;
    c.lineWidth = 1 * s;
    c.setLineDash([4 * s, 4 * s]);
    c.font = `${7.5 * s}px ${t.mono ?? 'monospace'}`;
    c.fillStyle = t.acc ?? '#4aa3df';
    c.textAlign = 'center';
    kette.forEach((x) => {
      const a = proj([x, 0, zOben]), b = proj([x, 0, zUnten]);
      if (!a || !b) return;
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
      // Die Zahl in Zentimetern - so steht sie auf der Zeichnung.
      c.globalAlpha = 0.85;
      c.fillText(String(Math.round(x * 100)), a[0], a[1] + 10 * s);
      c.globalAlpha = 0.5;
    });
    c.restore();
  }

  /**
   * BILDSCHIRMPUNKT -> STELLE IM TRAGWERK.
   *
   * Die Umkehrung der Projektion, aber nur für die Ebene y = 0 - die Ebene,
   * in der Joch und Masten stehen und in der ein Querprofil gezeichnet ist.
   * Ohne diese Einschränkung wäre ein Bildschirmpunkt kein Punkt, sondern ein
   * Strahl: in der Tiefe läge unendlich viel hintereinander.
   *
   * Gerechnet wird als Strahl vom Auge durch den Bildpunkt, geschnitten mit
   * der Ebene - das gilt in JEDER Ansicht, auch in der Isometrie, und nicht
   * nur dort, wo die Ebene zufällig parallel zum Bildschirm liegt.
   *
   * @returns {{x:number, z:number}|null} null, wenn der Strahl die Ebene
   *          nicht trifft (Blick genau entlang der Ebene).
   */
  /**
   * Stelle im Tragwerk unter einem Maus- oder Zeigerereignis.
   *
   * Fuer das Ablegen: ein `drop` traegt clientX/clientY wie jeder Zeiger,
   * und was dort liegt, soll dieselbe Stelle sein, die ein Klick treffen
   * wuerde. Vorher wurde beim Ablegen nur der waagrechte Anteil der Breite
   * genommen - damit landete alles am Joch, auch was auf einem Masten lag.
   */
  weltAusZeiger(e) {
    if (!this.szene) return null;
    const [px, py] = this._geraetePunkt(e);
    return this.weltTreffer(px, py);
  }

  weltTreffer(sx, sy) {
    const auge = this._kameraPos();
    const { vor, rechts, hoch } = this._basis();
    const w = this.cv.width, h = this.cv.height;
    let dir;
    if (this.projektion === 'orthogonal') {
      // Kein Fluchtpunkt: alle Strahlen laufen parallel zur Blickrichtung,
      // der Bildpunkt verschiebt nur ihren Ursprung.
      const wpp = this._weltProPixel();
      const o = [
        auge[0] + (sx - w / 2) * wpp * rechts[0] - (sy - h / 2) * wpp * hoch[0],
        auge[1] + (sx - w / 2) * wpp * rechts[1] - (sy - h / 2) * wpp * hoch[1],
        auge[2] + (sx - w / 2) * wpp * rechts[2] - (sy - h / 2) * wpp * hoch[2],
      ];
      dir = [-vor[0], -vor[1], -vor[2]];
      const t = Math.abs(dir[1]) < 1e-9 ? null : -o[1] / dir[1];
      if (t === null) return null;
      return { x: o[0] + t * dir[0], z: o[2] + t * dir[2] };
    }
    const f = (h / 2) / Math.tan(this.kamera.fov / 2);
    // Der Strahl durch den Bildpunkt, in Weltkoordinaten.
    const a = (sx - w / 2) / f, b = -(sy - h / 2) / f;
    dir = [
      -vor[0] + a * rechts[0] + b * hoch[0],
      -vor[1] + a * rechts[1] + b * hoch[1],
      -vor[2] + a * rechts[2] + b * hoch[2],
    ];
    if (Math.abs(dir[1]) < 1e-9) return null;
    const t = -auge[1] / dir[1];
    if (!(t > 0)) return null;              // hinter dem Auge
    return { x: auge[0] + t * dir[0], z: auge[2] + t * dir[2] };
  }

  /**
   * Bildschirmpunkt -> Punkt auf der hinterlegten Zeichnung.
   *
   * Gebraucht beim Kalibrieren: der Klick kommt in Bildschirmpunkten, gemeint
   * ist die Stelle IM BILD. Solange das Bild noch nicht kalibriert ist, gibt
   * es keine Umrechnung über die Welt - gerechnet wird deshalb über das
   * Rechteck, in dem es gerade liegt.
   */
  /**
   * DIE ZEICHNUNG NACHTRÄGLICH VERSCHIEBEN — um Bildschirmpunkte.
   *
   * Weisung vom 2. September: «es wäre daher noch gut das abgelegte QP Bild
   * schieben zu können nachträglich, falls die Lage der Abstraktion nicht
   * ganz gleicht bei einer Jochreihe.»
   *
   * >>> WARUM DAS EINGEMESSENE NICHT REICHT. <<<
   *
   * Zwei Klicks setzen das Bild über EIN Tragwerk — die Jochenden oder den
   * linken Masten. Auf einer Jochreihe steht daneben ein zweites Joch, und
   * dessen Lage kommt nicht aus dem Bild, sondern aus x₀ der Eingabe. Beide
   * müssen zusammenpassen, und wenn die Abstraktion um dreissig Zentimeter
   * daneben liegt, ist nicht das Bild schuld — sondern die Frage, welche der
   * beiden Seiten man verschiebt. Bisher gab es darauf nur eine Antwort:
   * neu einmessen. Das warf die gute Lage weg, um die schlechte zu ersetzen.
   *
   * >>> DER MASSSTAB BLEIBT UNANGETASTET. <<<
   *
   * Verschoben wird `x0`/`z0`, nicht `s`. Ein gezogener Massstab wäre eine
   * zweite, unsichtbare Kalibrierung — und die eine, die man eingemessen
   * hat, ist die belastbare. Wer den Massstab ändern will, misst neu ein.
   *
   * Gerechnet wird über DASSELBE Rechteck, das `_zeichnungMalen` zeichnet:
   * so ist die Umrechnung Bildschirm → Welt genau die, die man sieht, und
   * nicht eine zweite, die bei Perspektive um ein Prozent danebenläge.
   *
   * @returns {boolean} ob etwas verschoben wurde
   */
  verschiebeZeichnung(dxPx, dyPx) {
    const z = this.zeichnung;
    if (!z?.bild || !z.kalibrierung) return false;
    if (this.ansichtKey !== 'laengs') return false;
    const k = z.kalibrierung;
    const proj = this._projektor();
    const ecke = (px, py) => proj([k.x0 + k.s * px, 0, k.z0 - k.s * py]);
    const a = ecke(0, 0), b = ecke(z.breite, z.hoehe);
    if (!a || !b) return false;
    const w = Math.abs(b[0] - a[0]), h = Math.abs(b[1] - a[1]);
    if (!(w > 0.5) || !(h > 0.5)) return false;
    return this.verschiebeZeichnungWelt((dxPx / w) * (k.s * z.breite),
                                        -(dyPx / h) * (k.s * z.hoehe));
  }

  /** Dasselbe in Metern — der Weg der Pfeiltasten. */
  verschiebeZeichnungWelt(dx, dz) {
    const k = this.zeichnung?.kalibrierung;
    if (!k) return false;
    if (!Number.isFinite(dx) || !Number.isFinite(dz)) return false;
    k.x0 += dx;
    k.z0 += dz;
    this.opt.beiZeichnungVerschoben?.(k);
    return true;
  }

  zeichnungTreffer(sx, sy) {
    const z = this.zeichnung;
    if (!z || !z.bild || !z.kalibrierung) return null;
    const proj = this._projektor();
    const k = z.kalibrierung;
    const ecke = (px, py) => proj([k.x0 + k.s * px, 0, k.z0 - k.s * py]);
    const a = ecke(0, 0), b = ecke(z.breite, z.hoehe);
    if (!a || !b) return null;
    const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]);
    const w = Math.abs(b[0] - a[0]), h = Math.abs(b[1] - a[1]);
    if (!(w > 0) || !(h > 0)) return null;
    return { px: ((sx - x0) / w) * z.breite, py: ((sy - y0) / h) * z.hoehe };
  }

  _sichtbareFlaechen() {
    return this._letzteFlaechen ?? [];
  }

  /** Liegt x im Fokusbereich? */
  _imFokus(x) {
    if (!this.fokus || x === undefined || x === null) return true;
    return x >= this.fokus.von - 1e-9 && x <= this.fokus.bis + 1e-9;
  }

  /**
   * Umrechnung CSS-Pixel -> Gerätepixel.
   * Der Canvas ist mit der Pixeldichte vergrössert; alle in Pixeln
   * angegebenen Grössen (Schrift, Pfeilspitzen, Kästchen) müssen mitwachsen,
   * sonst schrumpfen sie auf hochauflösenden Bildschirmen auf die Hälfte.
   */
  _px() {
    const b = this.cv.getBoundingClientRect().width || this.cv.width;
    return Math.max(1, this.cv.width / b);
  }

  /**
   * Schriftangabe für den Kontext, in Gerätepixeln.
   *
   * Beide Bestandteile sind gemessene Grössen und werden deshalb NICHT je
   * Aufruf neu erhoben: this._s steht seit Beginn des Bildes fest, und die
   * Schriftfamilie kommt aus getComputedStyle - einem Aufruf, der den Browser
   * zwingt, das Stylesheet neu auszuwerten. Fünfmal je Bild, sechzigmal je
   * Sekunde, war das der Grund für das Stocken beim Zoomen.
   */
  _font(groesse = this.schrift) {
    return `${Math.round(groesse * this._s)}px ${SCHRIFT_MONO()}`;
  }

  /**
   * Textbreite mit Gedächtnis. measureText ist je Aufruf günstig, aber bei
   * zwanzig Anbauteilen, hundert Spannungsmarken und jedem Mausrad-Ereignis
   * summiert es sich. Die Breite hängt nur von Schrift und Text ab - beides
   * ändert sich selten, also wird sie gemerkt.
   */
  _textBreite(c, text) {
    const key = `${c.font}|${text}`;
    let b = this._breiten.get(key);
    if (b === undefined) {
      b = c.measureText(text).width;
      // Nicht unbegrenzt wachsen lassen: bei wechselnden Zahlenwerten wären
      // das sonst tausende Einträge je Sitzung.
      if (this._breiten.size > 4000) this._breiten.clear();
      this._breiten.set(key, b);
    }
    return b;
  }

  // --- Zeichnen ------------------------------------------------------------
  /**
   * Zeichnen ANFORDERN. Ein Mausrad schickt bis zu hundert Ereignisse in der
   * Sekunde, ein Trackpad noch mehr; jedes davon sofort zu zeichnen heisst,
   * mehrere Bilder für denselben Bildschirmaufbau zu malen und dabei ins
   * Stocken zu geraten. Stattdessen wird höchstens ein Bild je Bildwechsel
   * gemalt - alle Anforderungen dazwischen fallen zusammen.
   */
  /*
   * ZEICHNEN, UND ZWAR VOLL - AUSSER WAEHREND EINER BEWEGUNG.
   *
   * `sparsam` laesst die Volumenkoerper weg und behaelt nur die Schwerachsen;
   * waehrend man am Fensterrand zieht, zaehlt die Bildfolge mehr als das
   * Volumen. Gesetzt wird das Kennzeichen in `passeGroesseAn`, und ein
   * Zeitgeber nimmt es 110 ms spaeter zurueck.
   *
   * >>> DER FEHLER, gemeldet am 1. September: «nach dem Deaktivieren des
   * Masten wird beim Joch nicht der Koerper geplottet, sondern nur die
   * Schwerelinien.»
   *
   * Ein Klick auf einen Ebenenschalter baut die Werkzeugleiste neu, das
   * aendert die Groesse der Zeichenflaeche, und der ResizeObserver meldet
   * eine Groessenaenderung - manchmal zwei innerhalb der 250 ms, die als
   * Bewegung gelten. Das folgende `zeichne()` des Schalters traf dann auf
   * ein gesetztes `sparsam` und zeichnete ohne Koerper. Zurueckgestellt
   * wurde es erst bei der naechsten Groessenaenderung, also womoeglich nie.
   *
   * Ein Zeichnen, das NICHT aus der Bewegung kommt, ist deshalb immer voll.
   * Wer sparsam will, sagt es ausdruecklich - das tut allein
   * `passeGroesseAn`.
   */
  zeichne({ sparsam = false } = {}) {
    if (!sparsam) this.sparsam = false;
    if (this._angefordert) return;
    this._angefordert = requestAnimationFrame(() => {
      this._angefordert = 0;
      this._male();
    });
  }

  /** Sofort zeichnen, ohne auf den nächsten Bildwechsel zu warten. */
  zeichneJetzt() {
    if (this._angefordert) { cancelAnimationFrame(this._angefordert); this._angefordert = 0; }
    this._male();
  }

  _male() {
    const c = this.ctx, cv = this.cv;
    const t = tokens();
    const w = cv.width, h = cv.height;
    this._s = this._px();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = t.viewerBg;
    c.fillRect(0, 0, w, h);
    this._massTreffer = [];
    this._titelTreffer = [];
    // Belegte Bildstellen dieses Bildes. Bemassung und Anschriften teilen sie
    // sich, damit eine Masszahl nicht unter einem Bauteilnamen verschwindet.
    this._belegt = [];
    if (!this.szene) return;

    const proj = this._projektor();
    const licht = norm([0.45, 0.75, 0.9]);

    // GANZ NACH HINTEN: die Zeichnung liegt unter allem, auch unter dem
    // Raster. Sie ist der Grund, auf dem das Modell steht.
    this._zeichnungMalen(c, proj, t);
    this._massketteMalen(c, proj, t);

    if (this._ebeneAn('raster')) this._raster(c, proj, t);

    // Flächen sammeln, projizieren, nach Tiefe sortieren.
    //
    // Die projizierten Punkte werden AN DER FLÄCHE vermerkt, nicht in eine
    // Kopie geschrieben. Ein Joch bringt einige tausend Flächen mit; je Bild
    // von jeder eine Kopie anzulegen hiess, sechzigmal in der Sekunde ein paar
    // tausend Objekte zu erzeugen und wieder wegzuräumen - beim Zoomen genau
    // das, was den Bildlauf stocken liess.
    /*
     * WÄHREND EINER FAHRT WIRD SPARSAM GEZEICHNET.
     *
     * Ein volles Bild kostet gemessene 50 bis 60 ms - die 1568 Körper eines
     * Jochs, jeder gefüllt und umrandet. Beim Ein- und Ausfahren eines
     * Bereichs meldet der Grössenwächter zwölfmal eine neue Breite; zwölf
     * volle Bilder machen aus einer Bewegung von 300 ms eine Folge von vier
     * Standbildern. Gemessen: 67 ms je Bild mit Modell, 16.7 ms ohne.
     *
     * Weggelassen werden deshalb die KÖRPER, nicht das Modell: die
     * Schwerachsen tragen feldweise dieselben Kennwerte und dieselbe
     * Einfärbung (siehe _linien), das Bild sagt also dasselbe, nur ohne
     * Volumen. Sobald die Fahrt steht, kommt das volle Bild von selbst.
     */
    const liste = [];
    if (!this.sparsam) this.szene.flaechen.forEach((f) => {
      if (!this._ebeneAn(f.gruppe)) return;
      if (!this._imFokus(f.xMitte)) return;
      const pts = f.punkte.map(proj);
      if (pts.some((p) => !p)) return;
      let tiefe = 0;
      for (const p of pts) tiefe += p[2];
      f._2d = pts;
      f._tiefe = tiefe / pts.length;
      liste.push(f);
    });
    liste.sort((a, b) => b._tiefe - a._tiefe);
    this._letzteFlaechen = liste;

    // Anbauteile sind LEICHT durchscheinend: deckend gezeichnet legten sich
    // Ständer und Ausleger vor die Kraftpfeile, und gerade die will man sehen.
    // Sie bleiben aber kräftiger als das Joch, sonst gingen die schlanken
    // Stäbe im Gewirr der Gurte unter - halb so durchsichtig, höchstens 0.45.
    const klar = Math.max(0, Math.min(0.95, this.transparenz ?? 0));
    const klarAT = Math.min(0.45, klar * 0.5);
    // Schlüssel der Einfärbung: solange Plot und Thema stehen, hat jede Fläche
    // dieselbe Farbe wie im Bild davor. Das Ausrechnen (Farbverlauf, Regex,
    // zwei Zeichenketten je Fläche) fiel bisher bei jedem Bild für jede Fläche
    // an - beim langen Joch einige tausend Mal in der Sekunde.
    const farbSchluessel = `${this.modus}|${document.documentElement.dataset.thema ?? ''}`;
    liste.forEach((f) => {
      // Die Schattierung hängt an der Flächennormalen, und die dreht sich mit
      // dem Bauteil, nicht mit der Kamera. Sie wird deshalb einmal je Fläche
      // gerechnet und bleibt, bis eine neue Szene kommt.
      if (f._hell === undefined) {
        const n = norm(kreuz(sub(f.punkte[1], f.punkte[0]), sub(f.punkte[2], f.punkte[0])));
        f._hell = 0.55 + 0.45 * Math.abs(punkt(n, licht));
      }
      if (f._farbKey !== farbSchluessel) {
        f._farbe = this._schattiere(this._grundfarbe(f, t), f._hell);
        f._farbKey = farbSchluessel;
      }
      const markiert = f.station === this.station;
      // LASTMARKIERUNGEN SIND MARKEN, KEINE BAUTEILE.
      // Der Würfel am Angriffspunkt sagt WO die Last eintritt; als voller
      // Körper deckt er den Gurt darunter zu und liest sich wie ein
      // Anschlussteil. Er bleibt deshalb immer deutlich durchsichtiger als
      // der Rest - auch dann, wenn die Darstellung sonst undurchsichtig ist.
      // Passiv heisst: sichtbar, aber im Hintergrund. Es soll den Blick auf
      // das gerechnete Tragwerk nicht streitig machen.
      const durch = f.passiv ? Math.max(klar, 0.72)
                  : f.punkt ? Math.max(klarAT, 0.62)
                  : (f.gruppe === 'anbau' || f.gruppe === 'last') ? klarAT : klar;
      let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
      c.beginPath();
      f._2d.forEach((p, i) => {
        if (p[0] < xMin) xMin = p[0];
        if (p[0] > xMax) xMax = p[0];
        if (p[1] < yMin) yMin = p[1];
        if (p[1] > yMax) yMax = p[1];
        if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]);
      });
      c.closePath();
      c.globalAlpha = 1 - durch;
      c.fillStyle = f._farbe;
      c.fill();
      // KANTE NUR, WO SIE ETWAS ZEIGT. Weit weg misst eine Blechfläche zwei
      // Pixel; ihr Umriss fällt mit ihrer Füllung zusammen und kostet trotzdem
      // einen vollen Zeichenbefehl. Bei ein paar tausend Flächen ist genau das
      // der Unterschied zwischen flüssigem und stockendem Zoomen - und man
      // sieht nichts davon, weil es nichts zu sehen gab.
      const winzig = !markiert
        && xMax - xMin < 2.5 * this._s && yMax - yMin < 2.5 * this._s;
      if (!winzig) {
        c.lineWidth = (markiert ? 1.2 : 0.5) * this._s;
        c.strokeStyle = markiert ? t.on : t.ol2;
        // Die Kanten werden weniger stark ausgeblendet als die Flächen - sie
        // halten die Form zusammen, wenn der Körper durchsichtig ist.
        c.globalAlpha = (markiert ? 0.9 : 0.35) * (1 - durch * 0.45);
        c.stroke();
      }
    });
    c.globalAlpha = 1;

    this._lastflaechen(c, proj, t);
    if (this._ebeneAn('schnitt')) this._schnittebene(c, proj, t);
    // Im sparsamen Bild sind die Achsen das Einzige, was vom Joch übrig
    // bleibt - sie werden deshalb für die Dauer der Fahrt gezeichnet, auch
    // wenn ihr Schalter aus ist. Sonst stünde man 300 ms vor leerem Grund.
    if (this.sparsam || this._ebeneAn('achse') || this._ebeneAn('auflager')) {
      this._linien(c, proj, t);
    }
    // ZUERST DIE PFEILE, DANN DIE MARKEN UND MASSE, ZULETZT DIE FREIEN TEXTE.
    // _vektoren zeichnet hier nur die Pfeile und legt seine Beschriftungen
    // beiseite; Marken und Bemassung belegen unterdessen ihre Plaetze, und
    // _texte setzt zum Schluss, was noch frei geblieben ist. Die Rangfolge
    // steht dort.
    this._vektoren(c, proj, t);
    // Beschriftungen sind während der Fahrt nicht lesbar und kosten Messungen
    // von Textbreiten - sie bleiben weg, bis das Bild wieder steht.
    if (!this.sparsam) {
      if (this.ebenen.marken) this._marken(c, proj, t);
      if (this._ebeneAn('masse')) this._masse(c, proj, t);
      this._bauteiltitel(c, proj, t);
      this._texte(c, t);
    }
    this._achsenkreuz(c, t);
    // GANZ ZULETZT: das Fadenkreuz liegt ueber allem, auch ueber den Marken -
    // man zielt damit, und was man anzielt, darf es nicht verdecken.
    this._fadenkreuzMalen(c, t);
  }

  /**
   * DAS FADENKREUZ BEIM EINMESSEN.
   *
   * Zwei Linien quer durch das ganze Bild, waagrecht und lotrecht. Der Sinn
   * ist nicht der Zeiger - den sieht man ohnehin -, sondern das ABGREIFEN:
   * die Linie laeuft bis zum Bildrand und laesst sich damit an einer Kante
   * der Zeichnung ausrichten, die weit weg vom Zielpunkt liegt. Ein Jochende
   * trifft man so auf den Strich, statt es zu schaetzen.
   *
   * DER ERSTE PUNKT BLEIBT STEHEN. Beim zweiten Klick will man sehen, wo der
   * erste gelandet ist - sonst misst man gegen eine Erinnerung.
   */
  _fadenkreuzMalen(c, t) {
    if (!this.beiZeichnungsklick) return;
    const s = this._s;
    c.save();
    (this.kalibrierPunkte ?? []).forEach((p, i) => {
      c.strokeStyle = t.acc ?? '#4aa3df';
      c.lineWidth = 1.6 * s;
      const r = 7 * s;
      c.beginPath();
      c.moveTo(p[0] - r, p[1]); c.lineTo(p[0] + r, p[1]);
      c.moveTo(p[0], p[1] - r); c.lineTo(p[0], p[1] + r);
      c.stroke();
      c.fillStyle = t.acc ?? '#4aa3df';
      c.font = this._font();
      c.fillText(String(i + 1), p[0] + r + 3 * s, p[1] - 3 * s);
    });
    const f = this._fadenkreuz;
    if (f) {
      c.strokeStyle = t.acc ?? '#4aa3df';
      c.globalAlpha = 0.55;
      c.lineWidth = 1 * s;
      c.setLineDash([6 * s, 4 * s]);
      c.beginPath();
      c.moveTo(0, f[1]); c.lineTo(this.cv.width, f[1]);
      c.moveTo(f[0], 0); c.lineTo(f[0], this.cv.height);
      c.stroke();
    }
    c.restore();
  }

  /**
   * WERTE DER AUFGETRAGENEN GRÖSSE ans Bauteil schreiben.
   *
   * Die Einfärbung sagt, wo es eng wird; die Zahl sagt, wie eng. Beides
   * gleichzeitig ist bei 200 Bauteilen unlesbar, deshalb wird auch hier
   * ausgedünnt: es werden nur so viele Zahlen gesetzt, wie auf dem Bild Platz
   * haben, und zwar die grössten zuerst.
   */
  _werte(c, t) {
    const p = PLOTS.find((x) => x.key === this.modus);
    if (!p) return;
    const kandidaten = [];
    // DIE LISTE IST BEREITS AUF DEN AUSSCHNITT GESIEBT - und zwar nach
    // f.xMitte. Hier noch einmal nach punkte[0][0] zu sieben war ein zweites,
    // strengeres Mass: der erste Eckpunkt eines Gurtstuecks liegt bis zu einer
    // halben Feldweite neben seiner Mitte, und am Rand des Ausschnitts fielen
    // dadurch Zahlen von Bauteilen weg, die sehr wohl im Bild stehen.
    (this._letzteFlaechen ?? []).forEach((f) => {
      const v = f.werte?.[p.feld];
      if (!Number.isFinite(v) || !f._2d?.length) return;
      const mx = f._2d.reduce((s, q) => s + q[0], 0) / f._2d.length;
      const my = f._2d.reduce((s, q) => s + q[1], 0) / f._2d.length;
      kandidaten.push({ v, x: mx, y: my, betrag: Math.abs(v) });
    });
    /*
     * >>> DIE ENDFELDER BLIEBEN LEER (Weisung, 28. August: «das Endfeld auf
     * einer Seite weist keine Resultate auf in der App»). <<<
     *
     * NACHGEMESSEN: der Rechenkern liefert an beiden Enden Werte, und jede
     * Blechfläche trägt ihren Kennwert. Es fehlten nur die ZAHLEN - und zwar
     * aus dieser Ausdünnung hier.
     *
     * Sie sortierte streng nach Betrag und setzte die sechzig grössten. Bei
     * einem J70 über 15 m stehen rund 160 Kandidaten im Bild; die grossen
     * liegen in Feldmitte, die kleinen am Auflager. Also fielen die
     * AUFLAGERBEREICHE zuerst weg - und weil die Lasten selten genau
     * symmetrisch sind, oft nur auf einer Seite. Genau das war zu sehen.
     *
     * Die Farbe war die ganze Zeit da; es fehlte die Zahl. Ein Bild, das
     * einen Bereich unbeschriftet lässt, liest sich aber wie «hier ist
     * nichts gerechnet».
     *
     * JETZT REIHUM ÜBER DAS BILD. Die Kandidaten werden in Spalten geteilt;
     * aus jeder Spalte kommt der grösste, dann der zweitgrösste, und so
     * weiter. Damit bekommt jeder Bereich Zahlen, und innerhalb eines
     * Bereichs steht die massgebende zuerst - der grösste Wert des Bildes
     * bleibt in jedem Fall beschriftet, denn seine Spalte kommt in der
     * ersten Runde dran.
     */
    const geordnet = beschriftungsReihenfolge(kandidaten);
    kandidaten.length = 0;
    kandidaten.push(...geordnet);
    c.font = this._font(this.schriftLast);
    const belegt = [];
    let gesetzt = 0;
    const grenze = 60;
    const s = this._s;
    const hoehe = this.schriftLast * s;
    for (const k of kandidaten) {
      if (gesetzt >= grenze) break;
      // Unter sich halten die Zahlen ihren gewohnten Abstand - ein Raster,
      // kein Rechteck: sie sollen nicht Schulter an Schulter stehen.
      if (belegt.some((b) => Math.abs(b.x - k.x) < 42 * this._s &&
                             Math.abs(b.y - k.y) < 13 * this._s)) continue;
      const text = k.v.toFixed(p.nk);
      // NUR GANZ ODER GAR NICHT. Am Bildrand schnitt der Canvas die Zahl ab,
      // und aus 118 wurde ein lesbares, aber falsches 18. Eine halbe Zahl ist
      // schlimmer als keine - das Bauteil dazu liegt ohnehin halb draussen.
      if (!this._imBild(c, text, k.x, k.y)) continue;
      // Und gegenueber Bemassung, Marken und Pfeiltexten weicht die Zahl aus:
      // sie steht als Farbe ohnehin schon am Bauteil.
      const w = this._textBreite(c, text) + 7 * s;
      const x = k.x - 3 * s, y = k.y - hoehe + 2 * s, h = hoehe + 3 * s;
      if (!this._frei(x, y, w, h)) continue;
      this._belegt.push({ x, y, w, h });
      belegt.push(k);
      gesetzt++;
      this._beschriftung(c, t, text, k.x, k.y);
    }
  }

  /**
   * Passt diese Beschriftung noch vollstaendig auf die Zeichenflaeche?
   * Die Masse sind dieselben wie in _beschriftung - dort wird der Saum
   * gezeichnet, hier wird er gemessen.
   */
  _imBild(c, text, x, y) {
    const s = this._s;
    const hoehe = this.schriftLast * s;
    const b = this._textBreite(c, text) + 7 * s;
    return x - 3 * s >= 0 && x - 3 * s + b <= this.cv.width
        && y - hoehe + 2 * s >= 0 && y + 3 * s <= this.cv.height;
  }

  /**
   * WIE VIELE Beschriftungen das Bild verträgt.
   *
   * Weit weg liegen dreissig Stationen auf hundert Pixeln; jede anzuschreiben
   * ergibt eine graue Wand. Die Zahl richtet sich deshalb nach dem Massstab:
   * je Beschriftung wird eine Mindestbreite auf dem Bild verlangt, und was
   * darüber hinausgeht, fällt weg. Beim Heranzoomen kommen die Marken von
   * selbst wieder - erst die wichtigen, dann die übrigen.
   */
  _markenBudget() {
    const breitePx = this.cv.width / this._s;
    const hoehePx = this.cv.height / this._s;
    // Sichtbare Jochlänge in Metern
    const g = this.szene?.grenzen;
    const sichtbar = this.fokus
      ? this.fokus.bis - this.fokus.von
      : (g ? g.xMax - g.xMin : 1);
    const pxProM = sichtbar > 0 ? breitePx / sichtbar : breitePx;
    // Eine Marke braucht rund 120 px Breite und 22 px Höhe.
    const spalten = Math.max(1, Math.floor(breitePx / 120));
    const zeilen = Math.max(1, Math.floor(hoehePx / 22));
    // Zusätzlich: wo weniger als 40 px je Meter bleiben, wird stark gesiebt.
    const dichte = Math.max(0.15, Math.min(1, pxProM / 40));
    return Math.max(3, Math.round(spalten * zeilen * 0.35 * dichte));
  }

  _grundfarbe(f, t) {
    /*
     * EIN NICHT AKTIVES TRAGWERK WIRD NICHT EINGEFAERBT.
     *
     * Es ist nicht gerechnet - eine Farbe aus der Ausnutzungsskala waere
     * dort eine Behauptung. Es steht als Umriss da, damit man sieht, WO es
     * steht und dass es dazugehoert; alles Weitere sagt es, sobald man es
     * anklickt.
     */
    if (f.passiv) return t.xdim ?? t.dim;
    const p = PLOTS.find((x) => x.key === this.modus);
    if (p && f.werte) {
      const v = f.werte[p.feld];
      // Fehlt der Wert an diesem Bauteil, bleibt es neutral - lieber eine
      // Lücke als eine Farbe, die eine Grösse vortäuscht.
      if (!Number.isFinite(v)) return t.xdim;
      const max = p.fest ?? (this._bereichSichtbar(p.feld) || 1);
      return etaFarbe((Math.abs(v) / (max || 1)) * (p.fest ?? 1.25));
    }
    if (this.modus === 'positionen' && f.farbeBauteil) return f.farbeBauteil;
    // ANBAUTEILE EINFARBIG. Sie sind nicht der Gegenstand des Nachweises,
    // sondern der Weg, auf dem die Last ans Joch kommt. Jedes Teil in eigener
    // Farbe zog den Blick von den Gurten weg und liess das Bild bei zwanzig
    // Teilen bunt aussehen; ein einziger stiller Ton lässt das Joch vorn.
    // Ausgenommen bleibt der Plot «Positionen» - dort IST die Farbe die Aussage.
    /*
     * DER MAST TRAEGT KEINEN NACHWEIS - und darf auch nicht so aussehen.
     *
     * In der Farbe der Gurte stuende er da wie ein nachgewiesenes Bauteil.
     * Er ist aber, genau wie die Anbauteile, der Weg der Last und nicht ihr
     * Gegenstand: das Werkzeug fuehrt keinen Mastnachweis (siehe
     * NACHWEISGRUPPEN in core.checks.js). Ein stiller Ton sagt das.
     */
    if (f.gruppe === 'anbau' || f.gruppe === 'last'
        || f.gruppe === 'auflager' || f.gruppe === 'mast') return t.dim;
    return f.gruppe === 'blech' ? t.blech : t.stahl;
  }

  /*
   * DIE SKALA UMFASST NUR, WAS ZU SEHEN IST (Weisung, 1. September).
   *
   * `szene.bereiche` haelt das Maximum ueber ALLE Flaechen, auch ueber
   * abgeschaltete Ebenen. Seit der Mast seine Kennwerte traegt, ist das ein
   * Problem: seine Momente sind um Groessenordnungen groesser als die der
   * Bindebleche - 50 kNm gegen 0.8 -, und solange er die Skala bestimmt,
   * liegt das ganze Joch am unteren Ende und zeigt keinen Verlauf mehr.
   *
   * Wer den Masten ausblendet, will genau das loswerden. Also folgt die
   * Skala den EINGESCHALTETEN Ebenen. Findet sich dort nichts, gilt wieder
   * das Maximum der Szene - eine Skala von null waere schlimmer als eine zu
   * weite.
   *
   * GEZAEHLT WIRD EINMAL JE ZUSTAND. Der Schluessel aus Modus und Ebenen
   * haelt das Ergebnis fest; ohne ihn liefe die Schleife bei jedem Bild neu,
   * und beim Drehen sind das sechzig Bilder in der Sekunde.
   */
  _bereichSichtbar(feld) {
    const schluessel = feld + '|' + JSON.stringify(this.ebenen)
                     + '|' + JSON.stringify(this.gruppen);
    if (this._bereichCache?.schluessel === schluessel) {
      return this._bereichCache.wert;
    }
    let max = 0;
    (this.szene?.flaechen ?? []).forEach((f) => {
      if (f.gruppe && !this._ebeneAn(f.gruppe)) return;
      const v = f.werte?.[feld];
      if (Number.isFinite(v)) max = Math.max(max, Math.abs(v));
    });
    if (!max) max = this.szene?.bereiche?.[feld] ?? 0;
    this._bereichCache = { schluessel, wert: max };
    return max;
  }

  /** Skala der aktuellen Einfärbung, für die Legende. */
  plotSkala() {
    const p = PLOTS.find((x) => x.key === this.modus);
    if (!p) return null;
    const max = p.fest ?? this._bereichSichtbar(p.feld);
    return { ...p, max };
  }

  _schattiere(farbe, k) {
    const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(farbe);
    let r, g, b;
    if (m) { [, r, g, b] = m.map(Number); }
    else {
      const s = farbe.replace('#', '');
      r = parseInt(s.slice(0, 2), 16); g = parseInt(s.slice(2, 4), 16);
      b = parseInt(s.slice(4, 6), 16);
    }
    const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }

  _raster(c, proj, t) {
    const g = this.szene.grenzen;
    const von = this.fokus ? this.fokus.von : g.xMin;
    const bis = this.fokus ? this.fokus.bis : g.xMax;
    const z = g.zMin - 0.35;
    c.strokeStyle = t.ol; c.globalAlpha = 0.35; c.lineWidth = 0.5 * this._s;
    c.beginPath();
    for (let x = Math.ceil(von); x <= Math.floor(bis); x += 1) {
      const a = proj([x, -2, z]), b = proj([x, 2, z]);
      if (a && b) { c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
    }
    for (let y = -2; y <= 2; y += 1) {
      const a = proj([von, y, z]), b = proj([bis, y, z]);
      if (a && b) { c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
    }
    c.stroke(); c.globalAlpha = 1;
  }

  /**
   * Verteilte Lasten als leicht durchscheinende Fläche.
   * Die Pfeilreihe allein zeigt nur einzelne Ordinaten; erst die Fläche macht
   * sichtbar, dass die Last über die ganze Länge steht.
   */
  _lastflaechen(c, proj, t) {
    if (!this._ebeneAn('last')) return;
    (this.szene.lastflaechen ?? []).forEach((fl) => {
      if (!this._lastartAn(fl.lastart)) return;
      const p = fl.punkte.map(proj);
      if (p.some((q) => !q)) return;
      const farbe = this._lastfarbe(fl.lastart, t);
      // Dieselbe Daempfung wie bei den Pfeilen: die Flaeche eines nicht
      // gerechneten Tragwerks zeigt, DASS dort etwas liegt, und draengt sich
      // nicht vor das, was gerade nachgewiesen wird.
      const leise = fl.passiv === true ? 0.3 : 1;
      c.beginPath();
      p.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
      c.closePath();
      c.fillStyle = farbe; c.globalAlpha = 0.16 * leise; c.fill();
      c.globalAlpha = 0.45 * leise; c.strokeStyle = farbe;
      c.lineWidth = 0.8 * this._s; c.stroke();
      c.globalAlpha = 1;
    });
  }

  /**
   * Ist diese Ebene sichtbar? Einzelschalter UND Hauptschalter ihrer Gruppe.
   * Siehe HAUPTSCHALTER.
   */
  _ebeneAn(key) {
    if (!this.ebenen[key]) return false;
    const g = HAUPTSCHALTER[key];
    return !g || this.gruppen[g] !== false;
  }

  /** Ist diese Lastart eingeschaltet? Ohne Angabe immer. */
  _lastartAn(art) {
    if (!art) return true;
    return this.lastarten[art] !== false;
  }

  /** Farbe einer Lastart aus dem Farbsatz. */
  _lastfarbe(art, t) {
    const l = LASTARTEN.find((x) => x.key === art);
    return (l && t[l.farbe]) || t.achse;
  }

  /** Halbdurchsichtige Ebene am Nachweisschnitt. */
  _schnittebene(c, proj, t) {
    const s = this.szene.schnitt;
    // Der Querschnitt liegt an einer Stelle und wird vom Fokus beschnitten;
    // die Längsschnitte laufen über die ganze Spannweite und bleiben stehen.
    if (!s) return;
    if ((s.orientierung ?? 'quer') === 'quer' && !this._imFokus(s.x)) return;
    const p = s.poly.map(proj);
    if (p.some((q) => !q)) return;
    c.beginPath();
    p.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
    c.closePath();
    c.fillStyle = t.acc; c.globalAlpha = 0.13; c.fill();
    c.globalAlpha = 0.85; c.strokeStyle = t.acc;
    c.lineWidth = 1.2 * this._s; c.setLineDash([6 * this._s, 4 * this._s]); c.stroke();
    c.setLineDash([]); c.globalAlpha = 1;
  }

  _linien(c, proj, t) {
    c.strokeStyle = t.achse;
    this.szene.linien.forEach((l) => {
      // Im sparsamen Bild vertreten die Achsen die Körper; dann gilt ihr
      // Einzelschalter nicht - der HAUPTSCHALTER der Gruppe aber sehr wohl.
      if (this.sparsam) { if (!this.gruppen.modell) return; }
      else if (!this._ebeneAn(l.gruppe)) return;
      // Beim Stationszoom bleibt eine Linie stehen, sobald IRGENDEIN Ende im
      // Ausschnitt liegt - sonst verschwände die Systemachse, die von Ende zu
      // Ende läuft und deren erster Punkt fast immer draussen liegt.
      if (!l.punkte.some((q) => this._imFokus(q[0]))) return;
      const p = l.punkte.map(proj);
      if (p.some((q) => !q)) return;
      const s = this._s;
      // ACHSEN TRAGEN DIE FARBE DES RESULTATS - Gurt- wie Blechachsen, feldweise
      // und mit denselben Kennwerten wie die Volumenkörper. Nur so ist das
      // Bild ohne Körper dasselbe wie mit ihnen.
      const traegt = l.gurt || l.blechachse;
      if (l.gruppe === 'auflager' || l.gruppe === 'mast') {
        c.strokeStyle = l.kragarm ? t.acc : t.on2;
        c.setLineDash(l.kragarm ? [6 * s, 4 * s] : []);
        c.lineWidth = (l.mast ? 1.8 : 1.2) * s;
        c.globalAlpha = l.kragarm ? 0.9 : 0.8;
      } else {
        c.strokeStyle = traegt ? this._grundfarbe(l, t) : t.achse;
        c.setLineDash(traegt || l.stark ? [] : [7 * s, 3 * s, 2 * s, 3 * s]);
        c.lineWidth = (l.gurt ? 2.2 : l.blechachse ? 1.6 : (l.stark ? 1.4 : 0.9)) * s;
        c.globalAlpha = l.gurt ? 1 : (l.blechachse ? 0.95 : (l.stark ? 0.9 : 0.65));
      }
      c.beginPath();
      p.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
      c.stroke();
    });
    c.setLineDash([]); c.globalAlpha = 1;
  }

  /** Kraftpfeile: Linie im Raum, Spitze und Beschriftung in der Bildebene. */
  _vektoren(c, proj, t) {
    const s = this._s;
    c.font = this._font(this.schriftLast);
    // DER PFEIL WIRD IMMER GEZEICHNET - er ist die Aussage. Sein TEXT wandert
    // dagegen auf die Warteliste und wird erst in _texte gesetzt, nach
    // Bemassung und Marken. Frueher schrieb er sofort und damit quer ueber
    // beide; im Laengsschnitt legte sich «V V_L = 1.8 kN» ueber genau die
    // Blechzeile, die man dort lesen will.
    this._pfeiltexte = [];
    (this.szene.vektoren ?? []).forEach((v) => {
      if (!this._ebeneAn(v.gruppe)) return;
      if (!this._lastartAn(v.lastart)) return;
      if (!this._imFokus(v.p[0])) return;
      const a = proj(v.p), b = proj(add(v.p, v.v));
      if (!a || !b) return;
      const farbe = v.art === 'normalkraft' ? (v.zug ? t.ok : t.acc)
                  : v.art === 'querkraft' ? t.warn
                  : v.lastart ? this._lastfarbe(v.lastart, t) : t.achse;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      const ux = dx / l, uy = dy / l;
      const kopf = (v.schlank ? 5 : 8) * s;
      /*
       * >>> DIE LASTEN DES NICHT GERECHNETEN TRAGWERKS REDEN LEISE. <<<
       *
       * Weisung vom 3. September: «Die lasten beim inaktiven tragwerk auch
       * ausgrauen samt beschriftung.»
       *
       * Bauteile und Titel waren laengst gedaempft; die Lastpfeile standen
       * weiter in voller Farbe da - und sie sind das Lauteste im Bild, weil
       * sie GEFAERBT sind, waehrend das passive Tragwerk grau ist. Auf einer
       * Reihe uebertoenten die Pfeile des Nachbarn genau das Tragwerk,
       * dessen Zahlen rechts stehen.
       *
       * Gedaempft, nicht weg - aus demselben Grund wie beim Titel: man will
       * sehen, DASS der Nachbar belastet ist, und wo. Die Zahl dazu gehoert
       * dem gerechneten.
       */
      const leise = v.passiv === true;
      c.globalAlpha = leise ? 0.3 : 1;
      c.strokeStyle = farbe; c.fillStyle = farbe;
      c.lineWidth = (v.schlank ? 1 : 1.8) * s;
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0] - ux * kopf, b[1] - uy * kopf);
      c.stroke();
      c.beginPath();
      c.moveTo(b[0], b[1]);
      c.lineTo(b[0] - ux * kopf - uy * kopf * 0.45, b[1] - uy * kopf + ux * kopf * 0.45);
      c.lineTo(b[0] - ux * kopf + uy * kopf * 0.45, b[1] - uy * kopf - ux * kopf * 0.45);
      c.closePath(); c.fill();
      c.globalAlpha = 1;
      /*
       * DIE BESCHRIFTUNG DES NACHBARN FAELLT GANZ WEG.
       *
       * Anders als der Pfeil: eine Lastzahl ist eine ANGABE, und sie steht
       * in einer Rangfolge mit begrenztem Platz (siehe `_texte`). Ein
       * «F_z = 0.65 kN» vom Nachbarjoch verdraengt dort die Zahl, die man
       * gerade nachweist - und blass gesetzt waere sie nur schwerer zu
       * lesen, ohne weniger Platz zu brauchen.
       */
      if (v.text && !leise) {
        // BETRAG MITFUEHREN. In _texte entscheidet er die Rangfolge: bei
        // vielen Baugruppen kommt nicht mehr jede Beschriftung ins Bild, und
        // dann soll die groesste Kraft dastehen, nicht die zufaellig erste.
        // Angewaehltes gewinnt: wer eine Baugruppe angeklickt hat, will IHRE
        // Zahlen lesen.
        const betrag = Math.abs(parseFloat(String(v.text).replace(/^[^=]*=\s*/, '')));
        this._pfeiltexte.push({ text: v.text, farbe,
                                rang: (v.teil && v.teil === this.auswahlTeil ? 1e6 : 0)
                                      + (Number.isFinite(betrag) ? betrag : 0),
                                x: b[0] + ux * 8 * s + 3 * s,
                                y: b[1] + uy * 8 * s + 4 * s });
      }
    });
  }

  /**
   * DIE FREI GESETZTEN BESCHRIFTUNGEN, ZULETZT UND IN EINER RANGFOLGE.
   *
   * Vier Zeichengaenge schreiben ins Bild. Frueher fuehrte jeder seine EIGENE
   * Freihalteliste: jeder wich nur sich selbst aus und schrieb den anderen
   * quer darueber.
   *
   * DIE RANGFOLGE, wie sie der Auftraggeber festgelegt hat:
   *   1. Bemassung   - sie ist anklickbar und fuehrt in ihr Eingabefeld
   *   2. Marken      - Auflager, Anbauteile, Blechspannungen
   *   3. Pfeiltexte  - die Groesse einer Last
   *   4. Werte       - sie stehen ohnehin schon als Farbe am Bauteil
   *
   * Die ersten beiden haben gezeichnet und belegt, bevor dies hier laeuft
   * (siehe _belegt in _male). Hier kommt nur noch, was frei geblieben ist.
   */
  _texte(c, t) {
    const s = this._s;
    c.font = this._font(this.schriftLast);
    const hoehe = this.schriftLast * s;
    /*
     * AUCH DIE PFEILTEXTE HABEN EIN BUDGET.
     *
     * Die Marken haben eines (_markenBudget), die Kraftbeschriftungen hatten
     * keines: gezeichnet wurde jede, die noch irgendwo freien Platz fand. Bei
     * fuenf Baugruppen standen elf Zahlen ueber dem Joch, und welche davon
     * wegblieb, entschied die Reihenfolge im Feld.
     *
     * Jetzt entscheidet der BETRAG - und, wenn eine Baugruppe angewaehlt ist,
     * deren Zugehoerigkeit. Beim Heranzoomen waechst das Budget von selbst,
     * die uebrigen kommen also wieder.
     */
    const budget = Math.max(3, Math.round(this._markenBudget() * 1.2));
    [...(this._pfeiltexte ?? [])]
      .sort((a, b) => (b.rang ?? 0) - (a.rang ?? 0))
      .slice(0, budget)
      .forEach((p) => {
        // Dasselbe Rechteck, das _beschriftung gleich malt - gemessen wird, was
        // gezeichnet wird, und nicht etwas Aehnliches daneben.
        const w = this._textBreite(c, p.text) + 7 * s;
        const x = p.x - 3 * s, y = p.y - hoehe + 2 * s, h = hoehe + 3 * s;
        if (!this._frei(x, y, w, h)) return;
        this._belegt.push({ x, y, w, h });
        this._beschriftung(c, t, p.text, p.x, p.y, p.farbe);
      });
    if (this.gruppen.resultate && this.werteAnschreiben) this._werte(c, t);
  }

  /** Text mit Unterlage, damit er auf jedem Untergrund lesbar bleibt. */
  _beschriftung(c, t, text, x, y, farbe = null) {
    const s = this._s;
    const hoehe = this.schriftLast * s;
    const b = this._textBreite(c, text) + 7 * s;
    c.fillStyle = t.s1; c.globalAlpha = 0.78;
    c.fillRect(x - 3 * s, y - hoehe + 2 * s, b, hoehe + 3 * s);
    c.globalAlpha = 1;
    c.fillStyle = farbe ?? t.on;
    c.fillText(text, x, y);
  }

  _marken(c, proj, t) {
    const s = this._s;
    c.font = this._font();
    const hoehe = this.schrift * s + 5 * s;
    // Beim Längsschnitt trägt jede Station ihre Spannung. Über die ganze
    // Spannweite wären das dreissig Kästchen übereinander - deshalb wird
    // ausgelassen, was ein bereits gesetztes Kästchen überdecken würde.
    // Gemeinsam mit der Bemassung - die steht schon im Bild, wenn hier
    // gezeichnet wird, und darf nicht überschrieben werden.
    const belegt = this._belegt;
    const frei = (x, y, w, h) => this._frei(x, y, w, h);

    // AUSDÜNNEN NACH ZOOMSTUFE.
    // Zuerst alles sammeln, dann nach Wichtigkeit ordnen und nur so viele
    // setzen, wie das Bild verträgt. Ohne die Sortierung entschiede sonst die
    // Reihenfolge in der Szene, welche Marke überlebt - und das ist die
    // Reihenfolge des Zeichnens, nicht die der Bedeutung.
    const budget = this._markenBudget();
    const sammlung = [];
    this.szene.marken.forEach((mk) => {
      if (mk.gruppe && !this._ebeneAn(mk.gruppe)) return;
      if (!this._imFokus(mk.p[0])) return;
      const p = proj(mk.p);
      if (!p) return;
      // Auflager und Anbauteile stehen immer; sie sind wenige und tragen die
      // Orientierung im Bild.
      const rang = mk.art === 'auflager' || mk.art === 'auflagertext' ? 1e9
        : mk.art === 'anbau' ? 1e8 + (mk.p[0] ?? 0)
        : mk.art === 'lastknoten' ? 1e7
        : (mk.eta ?? 0);
      sammlung.push({ mk, p, rang });
    });
    sammlung.sort((a, b) => b.rang - a.rang);

    let gesetzt = 0;
    sammlung.forEach(({ mk, p }) => {
      if (mk.art === 'auflager') {
        c.fillStyle = t.on2;
        c.beginPath();
        c.moveTo(p[0], p[1]);
        c.lineTo(p[0] - 7 * s, p[1] + 12 * s); c.lineTo(p[0] + 7 * s, p[1] + 12 * s);
        c.closePath(); c.fill();
        c.fillText(mk.text ?? '', p[0] - 3 * s, p[1] + 26 * s);
        return;
      }
      if (mk.art === 'auflagertext') {
        // Die Lagerungsangaben unter dem Mastfuss, eine Angabe je Zeile. Mit
        // Saum statt Kasten - ein Rahmen um zwei Zeilen wiegt schwerer als
        // die zwei Zeilen selbst.
        c.lineJoin = 'round';
        (mk.zeilen ?? [mk.text]).forEach((txt, i) => {
          if (!txt) return;
          const b = this._textBreite(c, txt);
          const bx = p[0] - b / 2, by = p[1] + (16 + i * 12) * s;
          c.strokeStyle = t.viewerBg; c.lineWidth = 2.6 * s;
          c.strokeText(txt, bx, by);
          c.fillStyle = t.dim;
          c.fillText(txt, bx, by);
        });
        return;
      }
      if (mk.art === 'lastknoten') {
        // Knotenpunkt der Lasteinleitung: ein Ring, damit der Angriffspunkt
        // auch dann zu sehen ist, wenn der Ständer davorliegt.
        c.strokeStyle = t.on2; c.lineWidth = 1.2 * s;
        c.globalAlpha = 0.5;
        c.beginPath(); c.arc(p[0], p[1], 3.6 * s, 0, Math.PI * 2); c.stroke();
        c.fillStyle = t.bg; c.globalAlpha = 0.3;
        c.beginPath(); c.arc(p[0], p[1], 2.4 * s, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
        return;
      }
      if (mk.art === 'anbau') {
        // KURZBENENNUNG der Baugruppe: nur die Position; beim angeklickten Teil
        // zusätzlich der Name - dort ist der Platz da und die Frage "welches
        // Teil ist das?" gerade aktuell.
        //
        // OHNE KASTEN. Ein Rahmen um zwei Zeichen wiegt schwerer als die zwei
        // Zeichen selbst und macht aus einer Anschrift ein Bauteil. Lesbar
        // bleibt sie über einen Saum in der Hintergrundfarbe: er trennt den
        // Text vom Modell, ohne eine Fläche zu setzen.
        /*
         * >>> AUCH DIE ANBAUTEILE REDEN LEISE. <<<
         *
         * Gemeldet am 3. September: «beim inaktiv schalten die bezeichnung
         * der anbauteile ist noch hell.»
         *
         * Bauteile, Titel, Lastpfeile und Bemassungen des nicht gerechneten
         * Tragwerks waren laengst gedaempft - die Anschriften «A1», «A2»
         * standen weiter in voller Helligkeit da. Auf einer Reihe mit
         * zwanzig Bauteilen sind das zwanzig helle Marken ueber einem
         * Tragwerk, das gar nicht gerechnet wird.
         *
         * DER LANGE NAME BLEIBT DEM GERECHNETEN. Er erscheint nur beim
         * ANGEKLICKTEN Teil, und angeklickt wird nur im gerechneten
         * Tragwerk; am fremden stuende er ohnehin nie.
         */
        const leise = mk.passiv === true;
        const text = (mk.teil === this.auswahlTeil && mk.textLang) || mk.text;
        c.font = this._font(this.schriftAnbau);
        const hAn = this.schriftAnbau * s;
        const b = this._textBreite(c, text);
        const bx = p[0] - b / 2, by = p[1] - hAn - 5 * s;
        if (!frei(bx - 2 * s, by, b + 4 * s, hAn + 4 * s)) { c.font = this._font(); return; }
        belegt.push({ x: bx - 2 * s, y: by, w: b + 4 * s, h: hAn + 4 * s });
        c.strokeStyle = t.ol2; c.lineWidth = 0.8 * s;
        c.globalAlpha = leise ? 0.22 : 0.5;
        c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0], by + hAn + 2 * s); c.stroke();
        c.globalAlpha = leise ? 0.45 : 1;
        c.lineJoin = 'round';
        // Der Saum bleibt voll gedeckt: er trennt den Text vom Modell, und
        // ein halbdurchsichtiger Saum liesse ihn ausfransen statt leiser
        // werden.
        c.globalAlpha = 1;
        c.strokeStyle = t.viewerBg; c.lineWidth = 2.6 * s;
        c.strokeText(text, bx, by + hAn);
        c.globalAlpha = leise ? 0.45 : 1;
        c.fillStyle = leise ? t.dim : t.on2;
        c.fillText(text, bx, by + hAn);
        c.globalAlpha = 1;
        c.font = this._font();
        return;
      }
      if (mk.art === 'spannung') {
        if (gesetzt >= budget) return;
        const b = this._textBreite(c, mk.text) + 10 * s;
        const bx = p[0] + 6 * s, by = p[1] - hoehe / 2;
        if (!frei(bx, by, b + 3 * s, hoehe + 3 * s)) return;
        belegt.push({ x: bx, y: by, w: b + 3 * s, h: hoehe + 3 * s });
        gesetzt++;
        // WEICHE KANTE des Budgets. Die letzten Marken vor der Grenze werden
        // blasser gezeichnet, statt beim geringsten Drehen am Rad ganz zu
        // verschwinden und wieder aufzutauchen. Das Bild wird dadurch beim
        // Zoomen ruhig - es blendet auf und ab, statt zu blinken.
        const rand = Math.max(1, budget * 0.25);
        const ein = Math.max(0.25, Math.min(1, (budget - gesetzt) / rand));
        c.globalAlpha = 0.88 * ein;
        c.fillStyle = t.s2;
        c.fillRect(bx, by, b, hoehe);
        c.globalAlpha = ein;
        c.strokeStyle = etaFarbe(mk.eta); c.lineWidth = 1 * s;
        c.strokeRect(bx, by, b, hoehe);
        c.fillStyle = t.on;
        c.fillText(mk.text, bx + 5 * s, by + hoehe - 5 * s);
        // Anschlussstrich zum Bauteil, damit die Zuordnung eindeutig bleibt
        c.strokeStyle = t.ol2; c.lineWidth = 0.8 * s; c.globalAlpha = 0.7 * ein;
        c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(bx, p[1]); c.stroke();
        c.globalAlpha = 1;
      }
    });
  }

  /** Ist diese Bildstelle noch frei? Siehe _belegt in _male. */
  _frei(x, y, w, h) {
    return !(this._belegt ?? []).some(
      (r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);
  }

  /**
   * Bemassungen. Jede Masszahl ist anklickbar und öffnet ihr Eingabefeld -
   * deshalb wird ihr Rechteck in _massTreffer gemerkt.
   */
  _masse(c, proj, t) {
    const s = this._s;
    const hoehe = this.schriftMass * s + 5 * s;
    c.font = this._font(this.schriftMass);
    (this.szene.masse ?? []).forEach((mz) => {
      /*
       * EINE BEMASSUNG AM NICHT GERECHNETEN TRAGWERK FAELLT WEG.
       *
       * Anders als der Titel: eine Masszahl ist kein Name, sondern eine
       * Angabe, und sie ist ANKLICKBAR - sie fuehrt auf ihr Eingabefeld.
       * Vom fremden Tragwerk aus fuehrte sie an die falsche Stelle. Und
       * gedaempft naehme sie nur Platz weg: was man an einem Nachbarn
       * ablesen will, ist wo er steht, nicht wie breit sein Endfeld ist.
       */
      if (mz.passiv) return;
      // Bemassungen eines Anbauteils stehen nur, wenn es angeklickt ist.
      if (mz.zu && mz.zu !== 'schnitt' && mz.zu !== this.auswahlTeil) return;
      const mitteX = (mz.p0[0] + mz.p1[0]) / 2;
      if (!this._imFokus(mitteX)) return;
      const ab = skal(norm(mz.ab), mz.d ?? 0);
      const a0 = add(mz.p0, ab), a1 = add(mz.p1, ab);
      const q0 = proj(mz.p0), q1 = proj(mz.p1), r0 = proj(a0), r1 = proj(a1);
      if (!q0 || !q1 || !r0 || !r1) return;
      c.strokeStyle = t.dim; c.lineWidth = 0.8 * s; c.globalAlpha = 0.9;
      c.beginPath();
      c.moveTo(q0[0], q0[1]); c.lineTo(r0[0], r0[1]);
      c.moveTo(q1[0], q1[1]); c.lineTo(r1[0], r1[1]);
      c.moveTo(r0[0], r0[1]); c.lineTo(r1[0], r1[1]);
      c.stroke();
      // Endstriche
      const dx = r1[0] - r0[0], dy = r1[1] - r0[1];
      const l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l * 4 * s, ny = dx / l * 4 * s;
      c.beginPath();
      c.moveTo(r0[0] - nx, r0[1] - ny); c.lineTo(r0[0] + nx, r0[1] + ny);
      c.moveTo(r1[0] - nx, r1[1] - ny); c.lineTo(r1[0] + nx, r1[1] + ny);
      c.stroke();
      c.globalAlpha = 1;

      // MASSZAHL IN DER FLUCHT DER MASSLINIE.
      //
      // Waagrecht gesetzt braucht sie über einer schrägen Masslinie ein
      // Vielfaches an Fläche, und bei mehreren Massen übereinander liegen die
      // Kästchen ineinander. In der Flucht folgt sie der Linie, deckt nur ihre
      // eigene Breite ab und liest sich wie auf einer Zeichnung.
      //
      // Kein Kasten, sondern ein Saum in der Hintergrundfarbe: er trennt die
      // Zahl von der Linie, ohne eine Fläche zu setzen - dieselbe Lösung wie
      // bei den Bauteilanschriften.
      const mx = (r0[0] + r1[0]) / 2, my = (r0[1] + r1[1]) / 2;
      const tb = this._textBreite(c, mz.text);
      let a = Math.atan2(r1[1] - r0[1], r1[0] - r0[0]);
      // Nie auf dem Kopf: eine Zeichnung liest sich von links und von unten.
      if (a > Math.PI / 2) a -= Math.PI;
      if (a < -Math.PI / 2) a += Math.PI;

      // Freihaltung: das umschliessende achsenparallele Rechteck der gedrehten
      // Zeile. Es ist auch die Trefferfläche für den Klick.
      const ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a));
      const bw = tb * ca + hoehe * sa + 4 * s;
      const bh = tb * sa + hoehe * ca + 4 * s;
      const bx = mx - bw / 2, by = my - bh / 2;
      if (!this._frei(bx, by, bw, bh)) return;
      this._belegt.push({ x: bx, y: by, w: bw, h: bh });

      c.save();
      c.translate(mx, my);
      c.rotate(a);
      c.lineJoin = 'round';
      c.strokeStyle = t.viewerBg; c.lineWidth = 2.8 * s;
      c.strokeText(mz.text, -tb / 2, hoehe / 2 - 5 * s);
      c.fillStyle = t.acc;
      c.fillText(mz.text, -tb / 2, hoehe / 2 - 5 * s);
      c.restore();

      this._massTreffer.push({ x: bx, y: by, w: bw, h: bh,
                               feld: mz.feld, tab: mz.tab });
    });
  }

  /**
   * DIE BAUTEILTITEL: Jochtyp und Mastprofil, ueber ihrem Bauteil.
   *
   * Sie sind anklickbar und fuehren in ihr Eingabefeld - derselbe Weg wie bei
   * den Masszahlen, und derselbe Trefferspeicher. Gezeichnet werden sie NACH
   * den Massen, damit sie im Zweifel obenauf liegen: eine Masszahl findet man
   * an ihrer Linie wieder, ein freier Titel nicht.
   *
   * Sie stehen nur, wenn das Bauteil selbst zu sehen ist. Ein Mastname ueber
   * einem ausgeblendeten Masten waere eine Behauptung ueber nichts.
   */
  _bauteiltitel(c, proj, t) {
    const s = this._s;
    if (!this._ebeneAn('masse')) return;
    c.font = this._font(this.schriftMass + 1);
    (this.szene.bauteiltitel ?? []).forEach((bt) => {
      if (bt.gruppe && !this._ebeneAn(bt.gruppe)) return;
      if (bt.gruppe && !this._ebeneAn(bt.gruppe)) return;
      if (!this._imFokus(bt.p[0])) return;
      const p = proj(bt.p);
      if (!p) return;
      const bw = this._textBreite(c, bt.text) + 12 * s;
      const bh = (this.schriftMass + 1) * s + 8 * s;
      /*
       * DER KASTEN BLEIBT IM BILD.
       *
       * Die Masten stehen an den Enden des Jochs, ihre Titel also am Rand -
       * mittig ueber dem Kopf gezeichnet ragte die halbe Beschriftung
       * hinaus, und «HEB 260 · 12.50 m» wurde zu «12.50 m». Oben nehmen die
       * Werkzeugleisten Platz weg, die das Bild nicht kennt; deshalb dort ein
       * groesserer Rand.
       *
       * Geklemmt wird nur der KASTEN, nicht der Bezugspunkt: der Titel
       * wandert an den Rand, bleibt aber ueber seinem Bauteil erkennbar.
       */
      const randX = 6 * s, randO = 46 * s;
      const bx = Math.max(randX,
        Math.min(p[0] - bw / 2, this.cv.width - bw - randX));
      const by = Math.max(randO, p[1] - bh);
      /*
       * UNTER DEM ZEIGER LEUCHTET DER RAHMEN AUF (Weisung).
       *
       * Der Titel ist anklickbar, sieht aber aus wie eine Beschriftung. Ohne
       * Rueckmeldung probiert man es nicht.
       *
       * NUR DER RAHMEN, NICHT DIE SCHRIFT (Weisung, 1. September). Man faehrt
       * beim Drehen des Modells vielmal unbewusst darueber; wenn dabei der
       * ganze Text die Farbe wechselt, springt es jedesmal ins Auge. Ein
       * Rahmen in der Akzentfarbe sagt dasselbe und bleibt still - der Text
       * behaelt seine Farbe, der Grund seine Deckung.
       */
      const warm = this._titelUnterZeiger === bt;
      /*
       * >>> WAS NICHT GERECHNET WIRD, REDET LEISER. <<<
       *
       * Weisung vom 2. September: «beim anklicken eines tragwerks beim
       * inaktiven die texte entweder ganz schwach darstellen oder komplett
       * ausbilden um einen besseren fokus auf die eingabe zu haben.»
       *
       * Auf einer Jochreihe standen die Titel aller Tragwerke gleich laut
       * nebeneinander - «J90 · 20.00 m» dreimal, «HEB 240 · 7.50 m» viermal,
       * jeder in seinem Kasten. Welcher davon zu dem gehoert, dessen Zahlen
       * rechts stehen, war nicht zu sehen.
       *
       * GEDAEMPFT, NICHT WEG. Ein Titel, der ganz verschwindet, nimmt die
       * Orientierung mit: man saehe zwar, WO ein Nachbar steht, aber nicht
       * mehr, WAS er ist - und genau das braucht man, um ihn anzuklicken.
       * Ohne Kasten und in der Randfarbe steht er da wie eine Anschrift auf
       * dem Plan, nicht wie eine Angabe zum Nachweis.
       */
      if (bt.passiv) {
        c.globalAlpha = 0.45;
        c.fillStyle = t.dim;
        c.textAlign = 'center';
        c.fillText(bt.text, bx + bw / 2, by + bh - 6 * s);
        c.textAlign = 'left';
        c.globalAlpha = 1;
        /*
         * >>> ANKLICKBAR IST ER TROTZDEM. <<<
         *
         * Hier stand ein `return`, mit der Begruendung, ein Titel fuehre auf
         * ein Eingabefeld des GERECHNETEN Tragwerks - von einem fremden aus
         * also an die falsche Stelle.
         *
         * Die Begruendung ist seit dem 3. September ueberholt: der Klick
         * schaltet zuerst auf das Tragwerk um, zu dem der Titel gehoert, und
         * beim Masttitel auch auf den Masten (siehe `beiMass` in app.js).
         * Damit fuehrt er genau dorthin, wo man hingezeigt hat.
         *
         * Gemeldet: «wenn ich die mastbezeichnung im 3d anklicke wird nicht
         * in der sidebar auf M2 oder M1 umgeschalten.»
         */
        this._massTreffer.push({ x: bx, y: by, w: bw, h: bh,
                                 feld: bt.feld, tab: bt.tab, bt });
        this._titelTreffer.push({ x: bx, y: by, w: bw, h: bh, bt });
        return;
      }
      c.fillStyle = t.viewerBg;
      c.globalAlpha = 0.72;
      c.beginPath();
      c.roundRect(bx, by, bw, bh, 3 * s);
      c.fill();
      c.globalAlpha = 1;
      c.strokeStyle = warm ? t.acc : (t.ol2 ?? t.dim);
      c.lineWidth = (warm ? 1.3 : 1) * s;
      c.stroke();
      c.fillStyle = t.on2 ?? t.on;
      c.textAlign = 'center';
      c.fillText(bt.text, bx + bw / 2, by + bh - 6 * s);
      c.textAlign = 'left';
      this._massTreffer.push({ x: bx, y: by, w: bw, h: bh,
                               feld: bt.feld, tab: bt.tab, bt });
      this._titelTreffer.push({ x: bx, y: by, w: bw, h: bh, bt });
    });
  }

  /**
   * Achsenkreuz unten links.
   *
   * WIE HOCH ES SITZT - und warum das eine gerechnete Zahl ist.
   *
   * Unten laeuft die Fussleiste ueber die ganze Breite. Sie ist gewachsen,
   * seit der Knopf «Ganzes Joch zeigen» darin steht: 8 px Rand + 30 px Knopf
   * + 8 px Rand = 46 px, gemessen im Programm. Der Ursprung sass bei genau
   * 46 px - also auf ihrer Oberkante -, und jeder nach unten zeigende Arm
   * samt Beschriftung verschwand darunter.
   *
   * Gebraucht wird die Leistenhoehe plus die Armlaenge plus die Zeile
   * darunter: 46 + 30 + 12 = 88. Mit 92 bleibt etwas Luft.
   */
  _achsenkreuz(c, t) {
    const { rechts, hoch, vor } = this._basis();
    const s = this._s;
    const o = [54 * s, this.cv.height - ACHSENKREUZ_HOCH * s], l = ACHSENKREUZ_ARM * s;
    const achsen = [
      { v: [1, 0, 0], n: 'x', f: t.acc },
      { v: [0, 1, 0], n: 'y', f: t.ok },
      { v: [0, 0, 1], n: 'z', f: t.on2 },
    ];
    c.font = this._font();
    c.lineWidth = 1.4 * s;
    achsen.forEach((a) => {
      if (Math.abs(punkt(a.v, vor)) > 0.995) return;
      const x = o[0] + punkt(a.v, rechts) * l;
      const y = o[1] - punkt(a.v, hoch) * l;
      c.strokeStyle = a.f; c.fillStyle = a.f;
      c.beginPath(); c.moveTo(o[0], o[1]); c.lineTo(x, y); c.stroke();
      c.fillText(a.n, x + 3 * s, y + 3 * s);
    });
  }

  /** Grösse an den Container anpassen (Pixeldichte berücksichtigt). */
  passeGroesseAn() {
    const r = this.cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (this.cv.width === w && this.cv.height === h) { this.zeichne(); return; }

    /*
     * EINE NEUE GRÖSSE LEERT DIE ZEICHENFLÄCHE.
     *
     * cv.width zu setzen wirft den Bildinhalt weg - das ist so festgelegt und
     * lässt sich nicht umgehen. Gezeichnet wurde bisher erst im NÄCHSTEN Bild
     * (zeichne() sammelt über requestAnimationFrame). Dazwischen lag also ein
     * fertig zusammengesetztes Bild mit leerer Fläche.
     *
     * Beim Ein- und Ausfahren eines Bereichs meldet der Grössenwächter das
     * zwölfmal in Folge - und zwölfmal blitzte der leere Grund durch. Genau
     * das war das Flackern; gemessen: 12 Grössenwechsel, 12 leere Bilder.
     *
     * Der Grössenwächter läuft nach dem Layout und VOR dem Zusammensetzen des
     * Bildes. Hier sofort zu zeichnen heisst deshalb: im selben Bild, in dem
     * die Fläche geleert wurde, steht sie auch wieder voll.
     */
    this.cv.width = w;
    this.cv.height = h;

    /*
     * UND ES WIRD NICHT NEU EINGEPASST.
     *
     * Bisher rief jeder Grössenschritt passeEin(), und das rechnet den
     * Kameraabstand aus dem Seitenverhältnis - das Modell zoomte also während
     * der Fahrt, statt nur mehr oder weniger vom Bild freizugeben. Der
     * Massstab hängt allein an der HÖHE der Fläche (f = (h/2)/tan(fov/2));
     * wird nur die Breite schmaler, bleibt das Joch gleich gross und man sieht
     * seitlich weniger davon. Das ist das Verhalten, das man erwartet - und
     * nebenbei behält eine selbst gewählte Ansicht ihren Ausschnitt, wenn man
     * das Fenster grösser zieht.
     *
     * Eingepasst wird nur beim ERSTEN Mal: da hat die Fläche noch die Grösse
     * aus dem Stylesheet und nicht die, die sie im Fenster wirklich hat.
     */
    if (this._ersteGroesse !== false) {
      this._ersteGroesse = false;
      this.passeEin();
    }

    /*
     * KOMMEN DIE SCHRITTE IN FOLGE, WIRD SPARSAM GEZEICHNET.
     *
     * Eine EINZELNE neue Grösse - der erste Aufbau, ein einmaliger Griff an
     * den Fensterrand - bekommt das volle Bild; dort wartet niemand auf 60
     * Bilder je Sekunde. Folgt aber Schritt auf Schritt, läuft eine Bewegung,
     * und dann zählt die Bildfolge mehr als das Volumen (siehe _male).
     *
     * Steht die Bewegung, kommt das volle Bild nach. Der Zeitgeber wird bei
     * jedem Schritt neu gestellt und feuert deshalb genau einmal, am Ende.
     */
    const jetzt = performance.now();
    this.sparsam = jetzt - (this._letzteGroesse ?? -1e9) < 250;
    this._letzteGroesse = jetzt;

    clearTimeout(this._nachZeichnen);
    this._nachZeichnen = setTimeout(() => {
      this._nachZeichnen = 0;
      if (!this.sparsam) return;
      this.sparsam = false;
      this.zeichne();          // voll, das ist der Sinn des Nachzeichnens
    }, 110);

    if (this._angefordert) {
      cancelAnimationFrame(this._angefordert);
      this._angefordert = 0;
    }
    this._male();
  }
}

/**
 * Schriftfamilie für das Modell, gemerkt.
 *
 * getComputedStyle zwingt den Browser, die Stilangaben neu auszuwerten - ein
 * teurer Aufruf, der hier je gezeichnetem Text anfiel. Die Familie steht in
 * einer CSS-Variablen und ändert sich nur mit dem Thema, also wird sie einmal
 * je Thema geholt.
 */
let _mono = null, _monoThema = null;
function SCHRIFT_MONO() {
  const th = document.documentElement.dataset.thema ?? '';
  if (_mono !== null && _monoThema === th) return _mono;
  _monoThema = th;
  _mono = getComputedStyle(document.documentElement).getPropertyValue('--f-mono') ||
          'monospace';
  return _mono;
}
