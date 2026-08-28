/**
 * data.anbauteile.js
 * ---------------------------------------------------------------------------
 * ZUGRIFF auf die Vorlagen für Anbauteile. Die DATEN stehen in
 * data/anbauteile.json und werden dort gepflegt.
 *
 * Ein Anbauteil ersetzt die frühere freie Einzellast: es beschreibt zugleich
 * das Bauteil (Befestigung, Lage) und die Lasten, die es einträgt.
 *
 * ACHSEN
 *   x  entlang der Jochachse (quer zu den Gleisen), 0 am linken Auflager
 *   y  Gleisrichtung
 *   z  vertikal, POSITIV NACH OBEN, 0 auf der Schwerachse des
 *      Anschlussgurtes (siehe core.anbauteile.js)
 *
 * BEFESTIGUNG
 *   Das Teil sitzt MITTIG auf den Schwerachsen der Gurte, über die Länge
 *   "raster" in Jochachse; die Last wird auf x − raster/2 und x + raster/2
 *   verteilt eingeleitet.
 *
 *   'durchgehend'  Vertikalelement über die ganze Jochhöhe, an Ober- UND
 *                  Untergurt angeschlagen -> vier Anschlusspunkte
 *   'oben'/'unten' nur an einem Gurt angeschlagen -> zwei Anschlusspunkte
 *
 * AUFBAU EINES ANBAUTEILS
 *   {
 *     id, vorlage, name, x, raster, befestigung, aktiv,
 *     module: [ {bauteil, anzahl, y, z, winkel?, laenge?, …} ],
 *     lasten: [ {einwirkung, x, y, z, Fx, Fy, Fz, Mxx, Myy, Mzz} ]
 *   }
 *
 * "module" sind Bauteile aus der Lasttabelle - sie bringen ihre Lasten
 * selbst mit. "lasten" sind FREI eingegebene Lastblöcke; jeder gehört genau
 * einer Einwirkungsgruppe an und trägt Angriffspunkt, Kraft und optional ein
 * Moment. Beides kann nebeneinander stehen.
 * ---------------------------------------------------------------------------
 */

import { getFlBauteil, flLastwerte, leiterzug, istStreckenlast,
         windAusFlaeche } from './data.fl.js';
import { umlenkkraft, ablenkwinkel } from './core.trasse.js';
import { EINWIRKUNGEN } from './core.lasten.js';
import { LEERE_KRAFT } from './core.anbauteile.js';

let DB = null;

export function setzeAnbauteilDB(obj) {
  if (!obj || !Array.isArray(obj.vorlagen)) {
    throw new Error('Anbauteil-Datenbank ungültig: Feld "vorlagen" fehlt.');
  }
  DB = obj;
  return DB;
}

export async function ladeAnbauteile(pfad = 'data/anbauteile.json') {
  if (DB) return DB;
  if (typeof document !== 'undefined') {
    const eingebettet = document.getElementById('anbauteil-db');
    const roh = eingebettet?.textContent?.trim();
    if (roh) return setzeAnbauteilDB(JSON.parse(roh));
  }
  const antwort = await fetch(pfad);
  if (!antwort.ok) {
    throw new Error(`Anbauteil-Datenbank ${pfad} nicht ladbar (HTTP ${antwort.status}).`);
  }
  return setzeAnbauteilDB(await antwort.json());
}

function db() {
  if (!DB) throw new Error('Anbauteil-Datenbank nicht geladen.');
  return DB;
}

/**
 * Eigene Vorlagen aus dem Projektstand.
 *
 * Sie liegen NICHT in der Datenbank, sondern im gespeicherten Zustand: die
 * Datenbank ist die gepflegte Grundlage, die eigenen Vorlagen sind das, was
 * jemand für sein Projekt zusammenstellt. Sie werden hier nur eingehängt,
 * damit alles Übrige nicht wissen muss, woher eine Vorlage kommt.
 */
let EIGENE = [];

export function setzeEigeneVorlagen(liste) {
  EIGENE = (liste ?? []).map((v) => ({ ...v, eigen: true }));
  return EIGENE;
}

/** Die ganze Datenbank – für Prüfstand und Ausleitung. */
export const anbauteilDB = () => db();

export function vorlagen() {
  return [...db().vorlagen, ...EIGENE];
}

export function getVorlage(id) {
  const v = vorlagen().find((x) => x.id === id);
  if (!v) throw new Error(`Unbekannte Anbauteil-Vorlage: ${id}`);
  return v;
}

// ===========================================================================
//  LASTBLÖCKE: Angriffspunkt / Kraft / Moment
// ===========================================================================
/**
 * Ein frei eingegebener Lastblock.
 *
 * Alles, was eine Last ausmacht, steht in EINEM Satz beieinander: wo sie
 * angreift, was sie zieht, und ob ein Moment eingeprägt ist. Die Zugehörigkeit
 * zu einer Einwirkungsgruppe entscheidet, mit welchem Beiwert sie in die
 * Kombination geht - und ob sie sich mit dem Wind umkehrt.
 *
 * Der Angriffspunkt ist RELATIV zur Befestigung der Baugruppe:
 *   x  Versatz in Jochachse gegenüber a.x   (meist 0)
 *   y  Versatz in Gleisrichtung            (früher e_x)
 *   z  Höhe über der Anschlussebene, also über der Schwerachse des
 *      Gurtes, an dem das Teil hängt
 */
export function neuerLastblock(einwirkung = 'G', o = {}) {
  return { einwirkung, x: 0, y: 0, z: 0,
           Fx: 0, Fy: 0, Fz: 0, Mxx: 0, Myy: 0, Mzz: 0, ...o };
}

/** Gültige Einwirkungsgruppe? Sonst zurück auf 'G'. */
const gruppeOderG = (k) =>
  (EINWIRKUNGEN.some((e) => e.key === k) ? k : 'G');

/**
 * Alte Zustände in das neue Modell heben.
 *
 * Bis zur Neugliederung standen die Lasten als Einzelfelder am Anbauteil
 * (Gz, Qz, Qx, Qy, Gx, Gy, eigengewicht) und die Lage als e_v/e_x. Beides wird
 * hier verlustfrei in Lastblöcke und Koordinaten umgeschrieben - die frühere
 * Zuordnung bleibt erhalten:
 *   Gz, Gx, Gy, eigengewicht -> Gruppe G
 *   Qx -> Wind x     Qy -> Wind y     Qz -> Schnee
 */
/*
 * ALTSCHREIBWEISE e_v / e_x.
 *
 * Bis Fassung 2.3 stand in der Vorlagendatei ein Abstand ZUR JOCHACHSE,
 * positiv NACH UNTEN. Alles andere im Werkzeug - Eingabekarte, Ausleitung,
 * AxisVM - zählt z nach OBEN. Dieselbe Höhe stand damit an drei Stellen mit
 * zwei Vorzeichen, und ein Jochaufsatz las sich in der Datei als `ev: -1.0`,
 * obwohl er nach oben ragt. Aus dieser Familie stammen zwei Fehler, die
 * teuer waren: der Jochaufsatz, der in der Ausleitung eine ganze Jochhöhe zu
 * tief sass, und ein Ausleger auf halber statt ganzer Stützenhöhe.
 *
 * Die Datei spricht seit Fassung 2.4 dieselbe Sprache wie AxisVM: z nach
 * oben, y in Gleisrichtung. Gelesen wird die alte Schreibweise weiter -
 * Datenpakete von früher müssen sich öffnen lassen.
 */
const zVon = (o) => o?.z ?? -(o?.ev ?? 0);
const yVon = (o) => o?.y ?? o?.ex ?? 0;

/**
 * WO EINE BAUGRUPPE STEHT.
 *
 * Bis hierher gab es nur einen Ort: das Joch, und `x` sagte, wo darauf. Ein
 * Fahrleitungstragwerk besteht aber aus Joch UND Masten, und am Masten
 * hängen Traversen, Lampen, Leiter - Teile, die es bisher nur am Joch geben
 * konnte.
 *
 * Am Masten zählt statt `x` die HÖHE ÜBER FUNDAMENT (`hMast`). Das ist die
 * Angabe, die auf der Baustelle und in der Zeichnung steht, und sie lässt
 * sich gegen die Mastlänge prüfen.
 */
export const ANBAU_ORTE = [
  { key: 'joch',  label: 'am Joch' },
  { key: 'mastA', label: 'am Mast Ende A' },
  { key: 'mastB', label: 'am Mast Ende B' },
];

export const ortVon = (a) => (a?.ort === 'mastA' || a?.ort === 'mastB'
  ? a.ort : 'joch');
export const amMast = (a) => ortVon(a) !== 'joch';

/**
 * AM MASTEN GIBT ES KEINEN TRÄGER (Weisung: kein Jochaufsatz, keine
 * Hängestütze).
 *
 * Das steht nicht als Verbotsliste im Code, es steht in den Daten. Die
 * Bauteiltabelle führt drei Rollen - `traeger`, `aufbau`, `drahtwerk` -, und
 * `traeger` tragen genau vier Bauteile: die drei Jochaufsätze und die
 * Hängestütze. Ein Träger IST das, was auf dem Joch sitzt oder daran hängt.
 *
 * Am Masten beginnt die Kette am Masten selbst; das erste Teil ist ein
 * Aufbau (Traverse, Ausleger, Lampe) oder ein Drahtwerk. Kommt einmal ein
 * neuer Träger in die Tabelle, gilt die Regel für ihn ohne Zutun.
 */
export const traegerImTeil = (teile) =>
  (teile ?? []).find((t) => (t.rolle ?? '') === 'traeger') ?? null;

export function normalisiereAnbauteil(a) {
  const t = { ...a };
  // Der Ort gehört zur Baugruppe, nicht zu ihren Teilen: eine Traverse am
  // Masten ist dasselbe Bauteil wie eine am Joch, sie steht nur woanders.
  t.ort = ortVon(a);
  t.hMast = Number.isFinite(a?.hMast) ? a.hMast : 0;
  t.module = (a.module ?? []).map((m) => {
    const n = { ...m };
    n.z = zVon(n); n.y = yVon(n);
    delete n.ev; delete n.ex;
    return n;
  });

  if (!Array.isArray(t.lasten)) {
    const z = zVon(a), y = yVon(a);
    const bloecke = [];
    const setze = (gruppe, o) => {
      if (Object.values(o).every((v) => !v)) return;
      bloecke.push(neuerLastblock(gruppe, { x: 0, y, z, ...o }));
    };
    setze('G', { Fz: (a.eigengewicht ?? 0) + (a.Gz ?? 0),
                 Fx: a.Gx ?? 0, Fy: a.Gy ?? 0 });
    setze('WindX', { Fx: a.Qx ?? 0 });
    setze('WindY', { Fy: a.Qy ?? 0 });
    setze('Schnee', { Fz: a.Qz ?? 0 });
    t.lasten = bloecke;
  } else {
    t.lasten = a.lasten.map((l) => neuerLastblock(gruppeOderG(l.einwirkung), l));
  }

  // z und y stehen nur als Saat für den ersten Lastblock in der Vorlage; an
  // der Baugruppe selbst haben sie nichts verloren - dort trägt jedes Modul
  // und jeder Lastblock seinen eigenen Angriffspunkt.
  ['eigengewicht', 'Gz', 'Gx', 'Gy', 'Qx', 'Qy', 'Qz', 'ev', 'ex', 'z', 'y']
    .forEach((k) => delete t[k]);
  return t;
}

/**
 * Aus einem angelegten Anbauteil eine eigene Vorlage machen.
 * Lage x und Name des Einzelteils gehören nicht dazu - eine Vorlage
 * beschreibt die ART, nicht das einzelne Stück.
 */
export function alsVorlage(a, name) {
  const t = normalisiereAnbauteil(a);
  return {
    id: `EV-${Math.random().toString(36).slice(2, 8)}`,
    name: name || a.name, beschreibung: `Eigene Vorlage aus «${a.name}»`,
    farbe: (() => { try { return getVorlage(a.vorlage).farbe; } catch { return 'direkt'; } })(),
    raster: t.raster, befestigung: t.befestigung,
    module: t.module.map((m) => ({ ...m })),
    lastbloecke: t.lasten.map((l) => ({ ...l })),
    // Der Lasteintrag gehört zur ART des Aufbaus, nicht zum einzelnen Stück -
    // sonst müsste man ihn an jedem Teil neu setzen.
    ...(t.windAufTraeger ? { windAufTraeger: true,
                             windAnteil: t.windAnteil ?? 50 } : {}),
    eigen: true,
  };
}

/** Legt aus einer Vorlage eine neue Baugruppe an der Stelle x an. */
export function neuesAnbauteil(vorlageId, x = 0) {
  const v = getVorlage(vorlageId);
  const roh = {
    id: `AT-${Math.random().toString(36).slice(2, 8)}`,
    vorlage: v.id,
    name: v.name,
    x,
    raster: v.raster,
    befestigung: v.befestigung ?? (zVon(v) <= 0 ? 'unten' : 'oben'),
    // Module der Baugruppe, jedes auf seiner eigenen Höhe
    module: (v.module ?? []).map((m) => ({ ...m })),
    ...(v.windAufTraeger ? { windAufTraeger: true,
                             windAnteil: v.windAnteil ?? 50 } : {}),
    aktiv: true,
  };
  // Eigene Vorlagen bringen fertige Lastblöcke mit; die gepflegte Datenbank
  // spricht noch die alte Sprache (e_v und Einzelfelder) und wird umgesetzt.
  if (Array.isArray(v.lastbloecke)) {
    roh.lasten = v.lastbloecke.map((l) => neuerLastblock(gruppeOderG(l.einwirkung), l));
    return roh;
  }
  const t = normalisiereAnbauteil({
    ...roh,
    z: zVon(v), y: yVon(v),
    eigengewicht: v.eigengewicht ?? 0,
    Gz: v.lasten?.Gz ?? 0, Qz: v.lasten?.Qz ?? 0,
    Qx: v.lasten?.Qx ?? 0, Qy: v.lasten?.Qy ?? 0,
  });
  // Eine Vorlage ohne Bauteile und ohne Lastwerte ist die freie Eingabe. Sie
  // bekommt einen leeren Lastblock auf der vorgesehenen Höhe - sonst stünde
  // eine Karte ohne jedes Feld da und man wüsste nicht, wo anfangen.
  if (!t.module.length && !t.lasten.length) {
    t.lasten = [neuerLastblock('G', { z: zVon(v), y: yVon(v) })];
  }
  return t;
}

/**
 * BAUGRUPPEN: ein Anbauteil ist modular.
 * ---------------------------------------------------------------------------
 * Am Joch hängt selten ein einzelnes Teil. Eine Hängestütze trägt einen
 * Fahrdraht - oder einen NT-Ausleger, und an diesem erst die Fahrleitung. Ein
 * nach oben gestellter Jochaufsatz stützt Zusatzleiter, die zuoberst an einer
 * Leiter-Traverse hängen. Jedes Stück bringt sein eigenes Gewicht und seine
 * eigene Windangriffsfläche mit, und zwar AUF SEINER EIGENEN HÖHE.
 *
 * Genau das leistet die Modulliste: die Baugruppe hält Lage und Befestigung am
 * Joch, jedes Modul seinen Angriffspunkt und sein Bauteil aus der Lasttabelle.
 *
 * Für die Rechnung wird die Baugruppe wieder AUFGELÖST - je Modul und je
 * freiem Lastblock ein Eintrag mit eigenem Angriffspunkt. Der Rechenkern muss
 * von Baugruppen nichts wissen, und die Hebelarme bleiben dort, wo sie
 * hingehören. Ein zusammengefasster Ersatzangriffspunkt wäre für die Torsion
 * und für das örtliche Kräftepaar schlicht falsch.
 * ---------------------------------------------------------------------------
 */

/** Wie lang ein Streckenteil ohne eigene Angabe gerechnet wird [m]. */
export const LAENGE_STANDARD = 1.0;

/**
 * Ein leeres Modul für die Baugruppe.
 *
 * STRECKENTEILE BEKOMMEN IHRE LÄNGE MIT (Weisung: Startwert 1.00 m).
 *
 * Wer eine Auslegerkonsole einsetzt, sah bisher ein leeres Längenfeld - und
 * gerechnet wurde trotzdem, nämlich mit einem Meter aus dem stillen Rückfall
 * in `expandiereAnbauteile`. Die Zahl war also immer da, nur nicht zu sehen;
 * und ein leeres Feld liest sich wie «noch nicht angegeben», nicht wie
 * «einen Meter». Jetzt steht sie im Feld, wo man sie ändern kann.
 *
 * Teile mit fertiger Einzellast (kN) haben keine Länge - dort wäre die Zahl
 * eine Behauptung ohne Wirkung.
 */
export function neuesModul(bauteilId, z = -1.5) {
  let strecke = false;
  try { strecke = istStreckenlast(getFlBauteil(bauteilId)); } catch { /* unbekannt */ }
  return { bauteil: bauteilId, anzahl: 1,
           laenge: strecke ? LAENGE_STANDARD : null, winkel: null,
           y: 0, z };
}

/** Leerer Satz Einwirkungsgruppen mit je einem Sechser-Kraftsatz. */
const leereKraefte = () => Object.fromEntries(
  EINWIRKUNGEN.map((e) => [e.key, LEERE_KRAFT()]));

/**
 * Ablenkwinkel eines Drahtwerk-Moduls [°].
 * Ein am Modul gesetzter Winkel überschreibt Radius und Spannweite.
 */
export function modulWinkel(m, { R, spannweite, laenge } = {}) {
  if (Number.isFinite(m?.winkel) && m.winkel !== 0) return m.winkel;
  const L = laenge ?? m?.laenge ?? spannweite ?? 0;
  return (ablenkwinkel(L, R) * 180) / Math.PI;
}

/**
 * WIND DES AUSLEGERS: HALB IN DIE FAHRLEITUNG, HALB IN DEN TRÄGER.
 *
 * DAS MODELL
 * Ein Ausleger ist kein Kragarm, der frei in der Luft steht. Sein äusseres
 * Ende hält die Fahrleitung, und die ist durch den Leiterzug seitlich
 * gespannt - sie wirkt dort als AUFLAGER. Der Wind auf den Ausleger verteilt
 * sich damit auf zwei Auflager: die eine Hälfte nimmt die Fahrleitung auf und
 * trägt sie längs zu den Nachbaraufhängungen ab, die andere geht in den
 * Träger, an dem der Ausleger sitzt - die Hängestütze.
 *
 * FOLGEN FÜR DAS JOCH
 * Nur der Anteil, der in den Träger geht, kommt an diesem Joch an. Und er
 * kommt dort an, wo der Ausleger angeschlagen ist: auf der ACHSE DES TRÄGERS.
 * Verändert wird deshalb der Abstand IN y - die Höhe z bleibt, wo der
 * Ausleger sitzt. Sein Hebelarm zur Jochachse ändert sich nicht; die Kraft
 * selbst wird kleiner.
 *
 * WAS UNANGETASTET BLEIBT
 * Eigengewicht, Schnee und Wind in x. Und die Drahtwerke: deren Windlast ist
 * über die Spannweite L_FL bereits der Anteil, der an DIESER Aufhängung
 * ankommt - sie ein zweites Mal zu halbieren wäre doppelt gezählt.
 *
 * ANNAHME, KEINE HERLEITUNG
 * Die Hälfte folgt aus dem Zweifeldträger-Bild und ist eine zulässige
 * Modellbetrachtung, kein gerechneter Wert. Deshalb steht der Anteil als Zahl
 * in der Eingabe, ist von Hand zu setzen und standardmässig AUS.
 *
 * @param {object[]} teile die flachen Anteile EINER Baugruppe
 * @param {object} a       die Baugruppe (windAufTraeger, windAnteil)
 */
export function windAufTraeger(teile, a) {
  if (!a?.windAufTraeger) return teile;
  const anteil = Math.min(1, Math.max(0, (a.windAnteil ?? 50) / 100));

  // Träger = das Bauteil der Rolle «traeger», das dem Joch am nächsten sitzt.
  // Ohne Träger gibt es keine Achse, auf die etwas abgesetzt werden könnte.
  const traeger = teile.reduce((b, x) => (x.rolle !== 'traeger' ? b
    : (b === null || Math.abs(x.z) < Math.abs(b.z) ? x : b)), null);
  if (!traeger) return teile;

  const zusatz = [];
  teile.forEach((x) => {
    // Nur die AUFBAUTEN - die Ausleger. Träger und Drahtwerke nicht.
    if (x.rolle !== 'aufbau') return;
    const fy = x.kraefte?.WindY?.Fy ?? 0;
    if (!fy) return;
    // Der Wind verlässt diesen Angriffspunkt vollständig: die eine Hälfte in
    // die Fahrleitung (und damit aus dem Joch heraus), die andere auf die
    // Achse des Trägers. Ein eigener Anteil, damit das Eigengewicht des
    // Auslegers dort bleibt, wo es angreift.
    x.kraefte.WindY.Fy = 0;
    const k = leereKraefte();
    k.WindY.Fy = fy * anteil;
    zusatz.push({
      ...x, kraefte: k,
      // AUF DEN ANSCHLUSSPUNKT AUSLEGER/TRÄGER, in beiden waagrechten
      // Richtungen. Bis hierher wurde nur y gerückt - das genügte, solange
      // jedes Teil auf der Jochachse sass. Der NT-Ausleger ist aber ein
      // KRAGARM IN JOCHACHSE: sein Angriffspunkt liegt um 1.2 m versetzt.
      // Bliebe der Anteil dort stehen, käme genau die Hälfte, die über die
      // Stütze ins Joch geht, an der falschen Stelle an.
      x: traeger.x, y: traeger.y, ex: traeger.ex,
      // z und ev bleiben: die Höhe des Auslegers ändert sich nicht.
      id: `${x.id}~w`, art: 'windversatz', modulIndex: null, lastIndex: null,
      name: `${x.name} · Wind über ${traeger.bauteilName ?? 'Träger'}`,
    });
  });
  teile.push(...zusatz);
  return teile;
}

/**
 * Baugruppen in Einzellasten auflösen.
 *
 * @param {object[]} liste Anbauteile (Baugruppen und/oder freie Lastblöcke)
 * @param {object} o {ek, R, spannweite}
 * @returns {object[]} flache Liste für core.anbauteile.js
 */
export function expandiereAnbauteile(liste, o = {}) {
  const { ek = 'EK2', R = 0, spannweite = 0 } = o;
  const flach = [];

  (liste ?? []).forEach((roh) => {
    if (roh.aktiv === false) return;
    const a = normalisiereAnbauteil(roh);
    // stationX ist die Stelle, an der die BAUGRUPPE am Joch hängt; x eines
    // Teils kann davon abweichen (Kragarm). Beide werden gebraucht: die
    // Station für den Anschluss, x für den Angriffspunkt.
    // Der ORT wandert mit: ohne ihn wuesste die Ausleitung hinterher nicht
    // mehr, ob ein Teil am Joch oder am Masten sitzt - und `x` bedeutet an
    // den beiden Orten Verschiedenes.
    const gemein = { baugruppe: a.id, x: a.x, stationX: a.x, raster: a.raster,
                     befestigung: a.befestigung, aktiv: true, vorlage: a.vorlage,
                     ort: a.ort, hMast: a.hMast };
    // Erst die Anteile DIESER Baugruppe sammeln: die Umverteilung des Windes
    // braucht sie vollständig nebeneinander, um den Träger zu finden.
    const teile = [];

    // --- Module aus der Lasttabelle ----------------------------------------
    (a.module ?? []).forEach((m, i) => {
      if (m.aktiv === false || !m.bauteil) return;
      let b;
      try { b = getFlBauteil(m.bauteil); } catch { return; }
      // Drahtwerke werden über die Spannweite der Fahrleitung gerechnet,
      // alle übrigen Streckenteile über ihre eigene Länge.
      /*
       * Der Rueckfall bleibt - alte Baugruppen fuehren `laenge: null` -, aber
       * er nennt jetzt dieselbe Zahl, die ein neues Modul mitbringt. Zwei
       * Stellen mit demselben Wert, und eine davon still, waeren eine
       * Falle: aendert man die eine, rechnet die andere weiter wie frueher.
       */
      const laenge = b.rolle === 'drahtwerk'
        ? (m.laenge ?? spannweite) : (m.laenge ?? LAENGE_STANDARD);
      const n = m.anzahl ?? 1;
      // Freies Bauteil: nicht aus der Tabelle, sondern über die Angriffsfläche.
      const w = b.freieFlaeche
        ? { Gz: (m.eigengewicht ?? 0) * n,
            Qx: windAusFlaeche(m.aQuer ?? 0, ek, m.cw ?? 1.4) * n,
            Qy: windAusFlaeche(m.aLaengs ?? 0, ek, m.cw ?? 1.4) * n }
        : flLastwerte(m.bauteil, { ek, laenge, anzahl: n });

      // Umlenkkraft im Bogen: ständige Last in Jochachse. Das VORZEICHEN
      // steckt in Radius bzw. Winkel - eine ständige Last hat eine feste
      // Wirkrichtung und wird nicht über einen Schalter gedreht.
      let Gx = 0, alpha = 0;
      if (b.rolle === 'drahtwerk') {
        const u = umlenkkraft({ Z: leiterzug(m.bauteil) * n,
                                L: laenge, R, winkel: m.winkel ?? null });
        Gx = u.U; alpha = u.alpha;
      }

      /*
       * WAS EIN LEITER AN DIESER STELLE ABGIBT - und was nicht.
       *
       * >>> WEISUNG DES AUFTRAGGEBERS, 28. August. <<<
       * «Es kann sein, dass der Leiter nur abgezogen wird (bei Fahrdraht der
       * Fall), oder dass bei der Befestigung am Joch nur das Tragseil eine
       * Ablenkkraft hat und der Fahrdraht nicht, da dieser Anteil in die
       * Drückstütze geht. Die ständigen aber beide zum Tragseil gehen und von
       * der Befestigung am Joch getragen.»
       *
       * >>> DIE ACHSE IST NICHT «STÄNDIG / VERÄNDERLICH». <<<
       * Gewicht UND Ablenkkraft sind beide ständig (Gruppe G). Der genannte
       * Fall trennt sie trotzdem: das Gewicht kommt an, die Ablenkung nicht.
       * Eine Wahl mit den Stellungen «ständig / veränderlich» träfe ihn also
       * gar nicht. Getrennt wird deshalb nach dem, was wirklich verschiedene
       * Wege geht:
       *
       *      wirktG        Eigengewicht des Leiters
       *      wirktAblenk   Ablenkkraft aus dem Kurvenzug (Z·c/R)
       *      wirktQ        Wind und Schnee auf den Leiter
       *
       * Fehlt die Angabe, wirkt alles - alte Baugruppen rechnen unverändert
       * weiter. Nur DRAHTWERKE führen die Wahl; bei einem Träger oder Aufbau
       * gibt es keine Ablenkkraft, und wer sein Gewicht nicht will, schaltet
       * das Modul ab.
       */
      const drahtwerk = b.rolle === 'drahtwerk';
      const wirkt = (k) => !drahtwerk || m[k] !== false;
      const kraefte = leereKraefte();
      if (wirkt('wirktG')) kraefte.G.Fz = w.Gz;
      if (wirkt('wirktAblenk')) kraefte.G.Fx = Gx;
      if (wirkt('wirktQ')) {
        kraefte.WindX.Fx = w.Qx;
        kraefte.WindY.Fy = w.Qy;
        kraefte.Schnee.Fz = m.Qz ?? 0;
      }

      const z = m.z ?? 0, y = m.y ?? 0;
      teile.push({
        ...gemein,
        id: `${a.id}#${i}`, modulIndex: i, art: 'modul',
        bauteil: m.bauteil, bauteilName: b.name, rolle: b.rolle,
        name: `${a.name} · ${b.name}`,
        x: a.x + (m.x ?? 0), y, z, ev: -z, ex: y,
        anzahl: n, laenge, alpha, einheit: b.einheit,
        // Welche Anteile hier wirklich ankommen - die Ausleitung und die
        // Darstellung sollen es benennen koennen, nicht nur die Summe sehen.
        wirkung: drahtwerk
          ? { G: wirkt('wirktG'), ablenk: wirkt('wirktAblenk'),
              Q: wirkt('wirktQ') } : null,
        // Die Klammer ueber Tragseil und Fahrdraht. Sie geht in keine
        // Rechnung ein - noch nicht: der Havariefall (Bruch eines
        // Kettenwerks) waehlt spaeter darueber aus.
        kettenwerk: m.kettenwerk ?? null,
        kraefte,
      });
    });

    // --- Frei eingegebene Lastblöcke ---------------------------------------
    (a.lasten ?? []).forEach((l, i) => {
      if (l.aktiv === false) return;
      const kraefte = leereKraefte();
      const g = gruppeOderG(l.einwirkung);
      kraefte[g] = { Fx: l.Fx ?? 0, Fy: l.Fy ?? 0, Fz: l.Fz ?? 0,
                     Mxx: l.Mxx ?? 0, Myy: l.Myy ?? 0, Mzz: l.Mzz ?? 0 };
      if (Object.values(kraefte[g]).every((v) => !v)) return;
      const z = l.z ?? 0, y = l.y ?? 0;
      teile.push({
        ...gemein,
        id: `${a.id}!${i}`, lastIndex: i, art: 'last', einwirkung: g,
        name: `${a.name} · ${EINWIRKUNGEN.find((e) => e.key === g).label}`,
        x: a.x + (l.x ?? 0), y, z, ev: -z, ex: y,
        kraefte,
      });
    });

    windAufTraeger(teile, a);
    flach.push(...teile);
  });
  return flach;
}

/** Kennzahlen einer Baugruppe für die Kopfzeile, charakteristisch. */
export function baugruppeSumme(a, o = {}) {
  const teile = expandiereAnbauteile([{ ...a, aktiv: true }], o);
  const s = (gruppe, feld) => teile.reduce(
    (x, t) => x + (t.kraefte?.[gruppe]?.[feld] ?? 0), 0);
  return {
    Gz: s('G', 'Fz'), Gx: s('G', 'Fx'), Gy: s('G', 'Fy'),
    Qx: s('WindX', 'Fx'), Qy: s('WindY', 'Fy'), Qz: s('Schnee', 'Fz'),
    Mxx: s('G', 'Mxx'), Myy: s('G', 'Myy'), Mzz: s('G', 'Mzz'),
    alpha: teile.find((t) => t.rolle === 'drahtwerk')?.alpha ?? 0,
    module: teile.length, teile,
  };
}

/**
 * LASTGENERATOR: Anbauteile über die Gleise verteilen.
 *
 * Ein Tragjoch trägt je Gleis dieselbe Ausrüstung. Statt sie einzeln zu
 * setzen, wird hier die Gleislage erzeugt und je Gleis eine oder mehrere
 * Vorlagen angehängt.
 *
 * Die Gleise liegen SYMMETRISCH zur Jochmitte im gewählten Abstand:
 *
 *      x_i = L/2 + (i − (n−1)/2) · Abstand      i = 0 … n−1
 *
 * Damit wandern sie beim Ändern der Jochlänge automatisch mit, und die
 * Anordnung bleibt symmetrisch - so, wie ein Joch über einer Gleisgruppe
 * tatsächlich steht. Gleise, die ausserhalb des Jochs lägen, werden
 * ausgelassen und gemeldet, statt stillschweigend an den Rand geklemmt.
 *
 * @param {object} o {L, gleise, abstand, vorlagen:string[], versatz?}
 * @returns {{teile:object[], gleisX:number[], ausserhalb:number}}
 */
export function erzeugeGleislasten({ L, gleise, abstand, vorlagen: ids, versatz = 0 }) {
  const n = Math.max(0, Math.round(gleise ?? 0));
  const a = Math.max(0, abstand ?? 0);
  const teile = [];
  const gleisX = [];
  let ausserhalb = 0;

  for (let i = 0; i < n; i++) {
    const x = L / 2 + (i - (n - 1) / 2) * a + versatz;
    if (x < 0 || x > L) { ausserhalb++; continue; }
    gleisX.push(x);
    (ids ?? []).forEach((id) => {
      const t = neuesAnbauteil(id, Math.round(x * 100) / 100);
      teile.push({ ...t, name: `${t.name} Gleis ${gleisX.length}`, gleis: gleisX.length });
    });
  }
  return { teile, gleisX, ausserhalb };
}

/** Farbschlüssel eines Anbauteils für die 3D-Darstellung. */
export function farbschluessel(a) {
  try { return getVorlage(a.vorlage).farbe ?? 'direkt'; }
  catch { return 'direkt'; }
}

export function anbauteilStand() {
  const d = db();
  return { version: d._version, stand: d._stand, vorlagen: d.vorlagen.length };
}
