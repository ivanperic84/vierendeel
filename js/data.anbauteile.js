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

import { ausTabellen } from './data.tabellen.js';
import { getFlBauteil, flLastwerte, leiterzug, istStreckenlast,
         windAusFlaeche, istKettenwerk, flZerlegung,
         flPaarung, abfangkraft } from './data.fl.js';
import { umlenkkraft, ablenkwinkel } from './core.trasse.js';
import { EINWIRKUNGEN, HAVARIE_ABLENKUNG_BRUCH, HAVARIE_LAENGSZUG,
         ABFANG_VORGABE } from './core.lasten.js';
import { LEERE_KRAFT } from './core.anbauteile.js';

let DB = null;

export function setzeAnbauteilDB(obj) {
  // Tabellenform (seit 16. September) oder Baumform - beides wird gelesen.
  obj = ausTabellen(obj, 'anbauteile');
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

/* ===========================================================================
 * EINE KACHEL JE VORLAGE
 * ===========================================================================
 *
 * Weisung vom 9. September: «Die kacheln sind teilweise mehrfach enthalten,
 * die ich mal definiert und gespeichert habe.»
 *
 * >>> WIE SIE SICH VERMEHRT HABEN. <<<
 *
 * `vorlageSichern` haengte an, ohne zu schauen, ob dieselbe Vorlage schon
 * dasteht: wer ein Bauteil zweimal sicherte - und den vorgeschlagenen Namen
 * beide Male bestaetigte -, bekam zwei Kacheln mit demselben Namen. Dasselbe
 * beim Anpassen einer Katalogvorlage: jedes Mal entstand eine neue Kopie
 * «… (angepasst)» daneben.
 *
 * >>> WAS «DIESELBE» HEISST. <<<
 *
 * Name UND Inhalt. Zwei Vorlagen desselben Namens mit verschiedenen Modulen
 * sind zwei Dinge und bleiben beide stehen - der Name ist frei gewaehlt und
 * taugt allein nicht als Kennung. Sind auch die Module gleich, ist es eine
 * Vorlage, die zweimal dasteht.
 *
 * Die ID zaehlt NICHT mit: sie wird bei jedem Sichern neu gewuerfelt und
 * waere genau das Merkmal, an dem sich zwei gleiche Kacheln unterscheiden.
 *
 * Entdoppelt wird beim SETZEN, nicht erst beim Zeichnen: so raeumt schon das
 * Laden eines alten Standes auf, und was einmal weg ist, kommt nicht ueber
 * den naechsten Speichervorgang zurueck.
 * =========================================================================== */

/** Woran zwei Vorlagen als dieselbe zu erkennen sind. */
export function vorlagenKennung(v) {
  const mod = (v?.module ?? []).map((m) => [m.bauteil, m.anzahl ?? 1,
                                            m.z ?? 0, m.y ?? 0].join(':'));
  const lb = (v?.lastbloecke ?? []).map((l) => [l.einwirkung, l.x ?? 0,
    l.y ?? 0, l.z ?? 0, l.Fx ?? 0, l.Fy ?? 0, l.Fz ?? 0, l.M ?? 0].join(':'));
  return JSON.stringify([String(v?.name ?? '').trim(), v?.raster ?? null,
                         v?.befestigung ?? null, mod, lb]);
}

/** Die Liste ohne Doppelte; die erste ihrer Art bleibt stehen. */
export function entdoppelteVorlagen(liste) {
  const gesehen = new Set();
  return (liste ?? []).filter((v) => {
    const k = vorlagenKennung(v);
    if (gesehen.has(k)) return false;
    gesehen.add(k);
    return true;
  });
}

export function setzeEigeneVorlagen(liste) {
  EIGENE = entdoppelteVorlagen(liste).map((v) => ({ ...v, eigen: true }));
  return EIGENE;
}

/** Die ganze Datenbank – für Prüfstand und Ausleitung. */
export const anbauteilDB = () => db();

export function vorlagen() {
  return [...db().vorlagen, ...EIGENE];
}

/* ===========================================================================
 * >>> WO EINE VORLAGE HINGEHOERT: JOCH, MAST ODER BEIDES (19. September). <<<
 * ===========================================================================
 *
 * Weisung: «wir sollten die anbauteile template auf die tragwerksarten
 * anpassen. beim mast sind die ausleger relevant und die zusatzleiter an
 * traversen.» Am Masten: Rueckleiter direkt, Lampe alt/LED mit Rohr,
 * Fahrdrahtabzug mit Konsole 1 m, NT- und Rohrausleger, Traverse mit
 * Zusatzleiter; am Joch die Joch-Vorlagen - «nach ort trennen».
 *
 * Die Spalte `ort` im Katalog sagt es ('joch' | 'mast' | 'beide'). Fehlt
 * sie (aeltere Daten, eigene Vorlagen), gilt: mit Traeger am Joch, sonst an
 * beiden - dieselbe Regel, die das Setzen schon kannte (kein Traeger am
 * Masten).
 */
export function vorlageOrt(v) {
  if (v?.ort === 'joch' || v?.ort === 'mast' || v?.ort === 'beide') return v.ort;
  const traeger = (v?.module ?? []).some((m) => {
    try { return getFlBauteil(m.bauteil).rolle === 'traeger'; } catch { return false; }
  });
  return traeger ? 'joch' : 'beide';
}

/** Passt die Vorlage an diese Stelle? `ort`: 'joch' | 'mastA' | 'mastB' | 'mast'. */
export function vorlagePasstAn(v, ort) {
  const o = vorlageOrt(v);
  return o === 'beide' || o === (ort === 'joch' ? 'joch' : 'mast');
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

/**
 * Der einfache Eintrag hinter einem «(xN)» - oder null.
 *
 * Gesucht wird ueber die ZERLEGUNG, nicht ueber den Namen: «Cu 95 (x2)» ist
 * Cu 95 mit Faktor zwei, «N-FL Ts: StCu 50 / Fd: Cu 107 (x2)» dasselbe
 * Kettenwerk doppelt. Gibt es den einfachen Eintrag nicht, bleibt alles wie
 * es ist - lieber ein Eintrag mit (xN) im Namen als eine Anzahl, die auf ein
 * Bauteil zeigt, das die Tabelle nicht fuehrt.
 */
function einfacherLeiter(id) {
  if (!id) return null;
  let b = null;
  try { b = getFlBauteil(id); } catch { return null; }
  if (b.rolle !== 'drahtwerk') return null;
  const z = flZerlegung(b);
  const n = z.anzahl ?? 1;
  if (n <= 1) return null;
  const eins = istKettenwerk(b)
    ? flPaarung(z.ts, z.fd, 1) : flPaarung(z.leiter, null, 1);
  return eins ? { id: eins.id, faktor: n } : null;
}

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
    /* =====================================================================
     * >>> «(x2)» IST KEINE BAUART, SONDERN EINE ANZAHL. <<<
     * =====================================================================
     *
     * Weisung vom 13. September: «die x2 x3 varianten durch anzahl
     * ersetzen.»
     *
     * Die Tabelle fuehrt «Cu 95», «Cu 95 (x2)», «(x3)», «(x4)» als vier
     * Eintraege - und daneben gibt es das Feld `anzahl`, das dasselbe
     * leistet. Vier Zeilen in der Auswahlliste fuer eine Zahl, die einen
     * Klick weiter steht.
     *
     * NACHGEMESSEN (Kontrolle im Pruefstand): die Vielfachen sind EXAKTE
     * Vielfache - Eigengewicht, Leiterzug und Wind in jeder
     * Einwirkungsklasse. Die Umrechnung aendert deshalb keine Zahl.
     *
     * >>> SIE GESCHIEHT BEIM LADEN, NICHT BEIM ZEICHNEN. <<<
     *
     * Ein gespeicherter Stand zeigt auf «Cu 95 (x2)»; die Maske zeigte
     * dann «Cu 95» und daneben die Anzahl 1 - eine Zeile, die das Doppelte
     * rechnet, ohne es zu sagen. `normalisiereAnbauteil` laeuft ueber jedes
     * geladene Anbauteil und legt den Satz einheitlich ab: einfacher
     * Eintrag, Anzahl mal N.
     */
    const kurz = einfacherLeiter(n.bauteil);
    if (kurz && kurz.id !== n.bauteil) {
      n.bauteil = kurz.id;
      n.anzahl = (Number(n.anzahl) || 1) * kurz.faktor;
    }
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
  // Null ist ein gesetzter Winkel (17. September) - leer ist null.
  if (Number.isFinite(m?.winkel)) return m.winkel;
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
  const traeger = teile.reduce((b, x) => (x.rolle !== 'traeger' ? b
    : (b === null || Math.abs(x.z) < Math.abs(b.z) ? x : b)), null);
  /*
   * >>> OHNE TRAEGER: DIE ACHSE DES TRAGWERKS. <<<
   *
   * Weisung vom 20. September: «bei den auslegern den windanteil auf den
   * masten wirken lassen (ähnlich wie bei der hängestütze), da die leiter
   * als quasi auflager wirken.»
   *
   * Hier stand «ohne Träger gibt es keine Achse, auf die etwas abgesetzt
   * werden könnte» - und die Funktion kehrte um. Das traf genau die
   * Ausleger AM MASTEN («NT-Ausleger am Mast», «Rohrausleger am Mast»):
   * sie sitzen ohne Hängestütze direkt am Masten, der Schalter stand da
   * und tat nichts.
   *
   * Die Begruendung ist dieselbe wie mit Traeger und haengt nicht an ihm:
   * das aeussere Ende haelt die Fahrleitung, und die ist durch den
   * Leiterzug laengs gespannt - sie wirkt dort als Auflager. Was nicht in
   * die Fahrleitung geht, geht in das, woran der Ausleger sitzt. Mit
   * Stuetze ist das ihre Achse, ohne Stuetze die Achse des Tragwerks
   * selbst: beim Teil am Masten die MASTACHSE (y = 0, Station der
   * Baugruppe), beim Teil am Joch die Jochachse.
   */
  const achse = traeger ?? { x: a.x ?? 0, y: 0, ex: 0,
                             bauteilName: 'Mast' };

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
      x: achse.x, y: achse.y, ex: achse.ex,
      // z und ev bleiben: die Höhe des Auslegers ändert sich nicht.
      id: `${x.id}~w`, art: 'windversatz', modulIndex: null, lastIndex: null,
      name: `${x.name} · Wind über ${achse.bauteilName ?? 'Träger'}`,
    });
  });
  teile.push(...zusatz);
  return teile;
}

/**
 * >>> WAS DER HAVARIEFALL AN EINEM LEITER AENDERT (17. September). <<<
 *
 *   dFx   Ablenkkraft bei -20 °C minus die staendige bei +5 °C. Die
 *         Ablenkung waechst mit dem Zug; bricht der Leiter, wirkt sie nur
 *         noch zur Haelfte - der weiterfuehrende Leiter ist noch abgelenkt.
 *   Fy    der Laengszug: was sich gegenueber dem STAENDIGEN Zustand
 *         aendert. Wieviel das ist, sagt die Abfangart des Leiters
 *         (`ABFANGARTEN` in core.lasten.js, Weisung vom 24. September):
 *         durchgehend 10 % von Z(-20 °C), beidseitig der volle Zug,
 *         einseitig die Aenderung gegenueber dem staendigen Zug.
 *   Gy    der STAENDIGE Laengszug - nur die einseitige Abfangung hat
 *         einen; bei den beiden anderen Arten heben sich die Zuege auf
 *         oder laufen durch.
 *
 * `GxHier` ist die Ablenkkraft, die HIER ankommt (nach den Haken der
 * Karte), `zugHier` der Anteil des Leiterzugs, der hier haengt - ohne
 * Fahrdraht nur das Tragseil.
 *
 * Die Zugkraft bei -20 °C kommt aus der Reglagetabelle, wo es sie gibt;
 * sonst bleibt es bei +5 °C, und die Hinweisliste sagt es
 * (`abfangkraft(...).ohneTabelle`).
 */
export function havarieAnteile({ id, n = 1, GxHier = 0, bruch = false, zugHier = 1,
                                 zug20 = null, art = ABFANG_VORGABE,
                                 richtung = 1 }) {
  let Z5 = 0, Z20 = 0;
  try {
    Z5 = leiterzug(id);
    Z20 = abfangkraft(id, { tempFall: 'havarie' }).Z;
  } catch { return { dFx: 0, Fy: 0, Gy: 0, Z20: 0, faktor: 1 }; }
  /*
   * DER ZUG IN DIESE RICHTUNG, WO ER ANGEGEBEN IST (19. September): «diese
   * können unterschiedliche leiterzugkräfte haben in die beiden y
   * richtungen». Er gilt dem Laengszug des Bruchs, nicht der Ablenkung -
   * die kommt weiter aus der Tabelle.
   */
  const Zbruch = Number(zug20) > 0 ? Number(zug20) : Z20;
  const faktor = Z5 > 0 ? Z20 / Z5 : 1;
  const f = bruch ? HAVARIE_ABLENKUNG_BRUCH : 1;
  // Der Anteil, der HIER haengt - ohne Fahrdraht nur das Tragseil.
  const anteil = n * Math.max(0, zugHier);
  const vz = Number(richtung) < 0 ? -1 : 1;
  /* =====================================================================
   * >>> DREI ARTEN, DREI ANSAETZE (Weisung vom 24. September). <<<
   * ===================================================================
   * Die lange Begruendung steht bei `ABFANGARTEN` in core.lasten.js.
   * `Fy` ist immer die AENDERUNG gegenueber dem staendigen Zustand -
   * so haelt es das Abfangjoch seit dem 20. September, und so bleibt
   * die Kombination mit gamma = 1.0 lesbar.
   * =================================================================== */
  let Gy = 0;
  let Fy = 0;
  if (art === 'einseitig') {
    // Staendig zieht er voll in seine Richtung.
    Gy = vz * Z5 * anteil;
    // Reisst er, faellt genau das weg. Sonst waechst der Zug auf Z(-20 °C).
    Fy = bruch ? -Gy : vz * (Zbruch - Z5) * anteil;
  } else if (art === 'beidseitig') {
    // Staendig heben sich die beiden Zuege am Anschluss auf.
    Fy = bruch ? Zbruch * anteil : 0;
  } else {
    Fy = bruch ? HAVARIE_LAENGSZUG * Zbruch * anteil : 0;
  }
  return { dFx: GxHier * (faktor * f - 1), Fy, Gy, Z20, faktor };
}

/**
 * Baugruppen in Einzellasten auflösen.
 *
 * @param {object[]} liste Anbauteile (Baugruppen und/oder freie Lastblöcke)
 * @param {object} o {ek, R, spannweite}
 * @returns {object[]} flache Liste für core.anbauteile.js
 */
/**
 * Wie tief ein Teil am Masten unter seine Befestigung haengt [m] - die
 * kleinste Befestigungshoehe, bei der nichts unter die Fundamentkote kommt.
 * Weisung vom 18. September: «eine last unterhalb der fundamentkote sollte
 * nicht möglich sein, da dies dann unter terrain wäre.»
 */
export function haengeTiefe(a) {
  if (a?.ort !== 'mastA' && a?.ort !== 'mastB') return 0;
  const flach = expandiereAnbauteile([{ ...a, aktiv: true, hMast: 0 }], {});
  const zMin = Math.min(0, ...flach.map((t) => Number(t.z) || 0));
  return Math.round(-zMin * 1000) / 1000;
}

/* ===========================================================================
 * >>> DER HAVARIEFALL JE LEITER (19. September). <<<
 * ===========================================================================
 *
 * Weisung: «eine übersicht mit allen leitern ermöglichen wo man die leiter
 * bestimmen kann die reissen und die berechnung durchführen mit den regeln
 * voll und 10%. beachte das nur ein leiter im havariefall rissen kann und
 * nicht mehrer. als einzelner leiter zählt auch das kettenwerk Fd + Ts.»
 * Auf Rueckfrage: «da man das nicht so gut abschätzen kann wählt man die
 * leiter die relevant sein könnten und das system rechnet diese dann
 * einzeln durch».
 *
 * EIN LEITER ist ein Drahtwerk-Modul - oder alle Module mit derselben
 * Kettenwerk-Bezeichnung (Fahrdraht und Tragseil, die an verschiedenen
 * Stellen haengen koennen). `leiterKennung` gibt ihm seinen Schluessel.
 *
 * Die Auswahl steht am Tragwerk (`havarie`: Schluessel -> {reisst, name,
 * zugP, zugM}). Aufgeloest wird hier fuer JEDEN Kandidaten, was sein Bruch
 * an seinen Modulen aendert (`havarieJe`); welcher Kandidat gerade reisst,
 * sagt der Lastfall (`havarieEinsetzen`). Die Bruchmerker der alten Form
 * (`bruch` an der Baugruppe) gelten nur noch, wo keine Auswahl steht.
 * ========================================================================= */
export function leiterKennung(a, m, i) {
  const kw = String(m?.kettenwerk ?? '').trim();
  return kw ? `kw:${kw}` : `${a?.id}#${i}`;
}

/** Die Havarie-Kandidaten eines Satzes: die angehakten Leiter. */
export function havarieKandidaten(havarie) {
  return Object.entries(havarie ?? {})
    .filter(([, v]) => v?.reisst === true)
    .map(([key, v]) => ({ key, name: v.name ?? key, zugP: v.zugP ?? null, zugM: v.zugM ?? null }));
}

/**
 * Alle Leiter der Baugruppen - fuer die Uebersicht. Ein Kettenwerk mit
 * mehreren Modulen steht einmal da.
 */
export function leiterListe(anbauteile) {
  const liste = new Map();
  (anbauteile ?? []).filter((a) => a?.aktiv !== false).forEach((a) => {
    (a.module ?? []).forEach((m, i) => {
      if (m?.aktiv === false || !m?.bauteil) return;
      let b;
      try { b = getFlBauteil(m.bauteil); } catch { return; }
      if (b.rolle !== 'drahtwerk') return;
      const key = leiterKennung(a, m, i);
      const ort = ortVon(a);
      let z20 = null;
      try { z20 = abfangkraft(m.bauteil, { tempFall: 'havarie' }).Z; } catch { /* ohne Tabelle */ }
      const e = liste.get(key) ?? { key, teile: [], kettenwerk: key.startsWith('kw:') ? key.slice(3) : null };
      // `bauteilId` fuer die Karte: sie rechnet die Anteile mit derselben
      // Funktion wie der Kern und braucht dafuer den Tabelleneintrag.
      e.teile.push({ baugruppe: a.id, modul: i, name: a.name, bauteil: b.name,
                     bauteilId: m.bauteil, ort,
                     hMast: a.hMast ?? null, x: a.x ?? null, zug20: z20 });
      liste.set(key, e);
    });
  });
  return [...liste.values()].map((e) => ({
    ...e,
    name: e.kettenwerk
      ? `Kettenwerk ${e.kettenwerk} (${e.teile.map((t) => t.bauteil).join(' + ')})`
      : `${e.teile[0].name} · ${e.teile[0].bauteil}`,
    zug20: Math.max(0, ...e.teile.map((t) => t.zug20 ?? 0)) || null,
  }));
}

/**
 * >>> ALTE STAENDE: DER MERKER «BRUCH» WIRD ZUR AUSWAHL (19. September). <<<
 *
 * Bis hierher stand der Bruch als Haken an der Baugruppe. Ein alter Stand
 * behaelt seine Wahl: jeder Leiter einer so markierten Baugruppe steht in
 * der Uebersicht als «kann reissen» - dann aber einzeln gerechnet, nicht
 * mehr alle zugleich. Die Merker selbst verschwinden. Auch die Teile am
 * Masten (`mastAnbauteile`) des Blattes; ihre Wahl geht an das gerechnete
 * Tragwerk.
 */
export function havarieAnheben(w) {
  if (!w) return w;
  const umsetzen = (liste, hav) => {
    let geaendert = false;
    const neu = (liste ?? []).map((a) => {
      if (a?.bruch !== true) return a;
      geaendert = true;
      (a.module ?? []).forEach((m, i) => {
        let b;
        try { b = getFlBauteil(m.bauteil); } catch { return; }
        if (b.rolle !== 'drahtwerk') return;
        const key = leiterKennung(a, m, i);
        hav[key] = { ...(hav[key] ?? {}), reisst: true,
                     name: hav[key]?.name ?? `${a.name} · ${b.name}` };
      });
      const { bruch, ...ohne } = a;
      return ohne;
    });
    return { neu, geaendert };
  };
  const eins = (t, zusatz = null) => {
    const hav = { ...(t?.havarie ?? {}) };
    const r = umsetzen(t?.anbauteile, hav);
    const z = zusatz ? umsetzen(zusatz, hav) : { neu: zusatz, geaendert: false };
    if (!r.geaendert && !z.geaendert) return { t, mast: zusatz };
    return { t: { ...t, anbauteile: r.neu, havarie: hav }, mast: z.neu };
  };
  const haupt = eins(w, w.mastAnbauteile ?? null);
  const erg = { ...haupt.t };
  if (w.mastAnbauteile) erg.mastAnbauteile = haupt.mast;
  if (Array.isArray(w.weitere)) erg.weitere = w.weitere.map((t) => eins(t).t);
  return erg;
}

/**
 * Die Havariekraefte des gerissenen Leiters in die aufgeloesten Teile
 * setzen - fuer DIESEN Lastfall. Ohne Kandidat im Fall bleibt alles, wie es
 * aufgeloest wurde (kein Leiter gerissen).
 */
/* ===========================================================================
 * >>> WER DAS VORZEICHEN DES LAENGSZUGS SETZT (24. September). <<<
 * ===========================================================================
 *
 * Es sass im BEIWERT des Lastfalls (`HavarieY: vz`), und das war richtig,
 * solange jeder Leiter durchlief: zu welcher Seite der gerissene zieht,
 * weiss niemand, also werden beide Richtungen geprueft.
 *
 * Bei einer EINSEITIGEN Abfangung ist die Richtung bekannt - der
 * staendige Zug faellt weg, und zwar in seiner eigenen Richtung. Ein
 * Beiwert -1 machte daraus eine zweite Zugkraft statt einer Entlastung;
 * gemessen am Einzelmasten mit R-FL: eta 18.3 statt 12.1, und das auf
 * der falschen Seite.
 *
 * Die Drehung steht deshalb jetzt HIER, wo bekannt ist, welcher Leiter
 * fest haengt und welcher nicht (`havarieFest` am aufgeloesten Teil).
 * Der Beiwert bleibt +1.
 * ========================================================================= */
export function havarieEinsetzen(flach, lf) {
  // Nur im Havariefall - sonst traegt HavarieY ohnehin den Beiwert 0.
  if (!lf || lf.leit !== 'HavarieY') return flach;
  const vz = (lf.vorzeichen ?? 1) < 0 ? -1 : 1;
  const k = lf.bruchLeiter ?? null;
  const richtung = vz < 0 ? 'm' : 'p';
  return (flach ?? []).map((t) => {
    const je = k ? t.havarieJe?.[k]?.[richtung] : null;
    const hatY = je || Number.isFinite(t.kraefte?.HavarieY?.Fy);
    if (!je && !hatY) return t;
    // Steht die Richtung fest, dreht der Lastfall sie nicht mehr.
    const dreh = t.havarieFest === true ? 1 : vz;
    const Fy = (je ? je.Fy : (t.kraefte?.HavarieY?.Fy ?? 0)) * dreh;
    const Fx = je ? je.dFx : (t.kraefte?.HavarieX?.Fx ?? 0);
    return { ...t, kraefte: { ...t.kraefte,
      HavarieX: { ...LEERE_KRAFT(), ...t.kraefte?.HavarieX, Fx },
      HavarieY: { ...LEERE_KRAFT(), ...t.kraefte?.HavarieY, Fy } } };
  });
}

export function expandiereAnbauteile(liste, o = {}) {
  const { ek = 'EK2', R = 0, spannweite = 0 } = o;
  // Die Auswahl der reissenden Leiter; ohne sie gelten die alten Merker.
  const auswahl = o.havarie ?? null;
  const kandidaten = havarieKandidaten(auswahl);
  const flach = [];

  (liste ?? []).forEach((roh) => {
    if (roh.aktiv === false) return;
    const a = normalisiereAnbauteil(roh);
    // Ohne Lage keine NaN (18. September): am Masten fehlt `x` manchmal ganz,
    // und `a.x + m.x` verdarb dann jede Kraft dahinter.
    if (!Number.isFinite(a.x)) a.x = 0;
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

      /* =====================================================================
       * >>> DER HAKEN NIMMT DEN FAHRDRAHT WEG, NICHT DAS KETTENWERK. <<<
       * =====================================================================
       *
       * Weisung vom 13. September: «Die Auswahl der einwirkungen bei den
       * leitern die auswaehlbar sind, sollten sich ausschliesslich auf den
       * fahrdraht beziehen, da es vorkommt, dass die ablenkung und der wind
       * separat durch einen fahrdrahtabzug der an einer haengestuetze
       * befestigt ist aufgenommen wird.»
       *
       * Sie schaerft die Weisung vom 28. August (oben im Kommentar): dort
       * ging es um den Fahrdraht, der seine Ablenkung in die Drueckstuetze
       * abgibt. Bis heute nahm ein abgehakter Anteil aber das GANZE Modul
       * weg - bei einem Kettenwerk also Tragseil UND Fahrdraht. Wer nur den
       * Fahrdraht anderswo abtrug, verlor das Tragseil gleich mit.
       *
       * JETZT: abgehakt heisst «der Fahrdraht-Anteil faellt weg». Was
       * bleibt, ist das Kettenwerk MINUS Fahrdraht - also Tragseil samt
       * Haengern und Y-Beiseil. Genau das kommt am Joch an, wenn der
       * Fahrdrahtabzug den Rest uebernimmt.
       *
       * >>> DIE DIFFERENZ, NICHT DER TABELLENWERT DES TRAGSEILS. <<<
       *
       * Das Kettenwerk traegt beim Wind rund fuenfzehn Prozent mehr als
       * seine beiden Leiter zusammen - die Haenger haben auch eine Flaeche.
       * Wer stattdessen den Tragseil-Eintrag naehme, liesse sie unter den
       * Tisch fallen. Die Differenz behaelt sie.
       *
       * >>> UND WENN ES DEN FAHRDRAHT NICHT EINZELN GIBT. <<<
       *
       * «N-FL Cu 150» steht nur in der Paarung, nicht als eigener Eintrag.
       * Dann laesst sich kein Anteil abziehen, und der Haken wirkt wie
       * frueher auf das ganze Modul. Die Maske sagt es (siehe
       * `wirkungsHinweis` in ui.js) - still die Haelfte zu rechnen waere die
       * schlechtere Antwort.
       * =================================================================== */
      const kw = drahtwerk && istKettenwerk(b);
      const zKw = kw ? flZerlegung(b) : null;
      const fdTeil = kw ? flPaarung(null, zKw.fd, zKw.anzahl ?? 1) : null;
      const wFd = fdTeil
        ? flLastwerte(fdTeil.id, { ek, laenge, anzahl: n }) : null;
      const GxFd = fdTeil
        ? umlenkkraft({ Z: leiterzug(fdTeil.id) * n,
                        L: laenge, R, winkel: m.winkel ?? null }).U
        : 0;
      /*
       * `ohneFd` ist der Rest. Ohne Fahrdraht-Eintrag gibt es keinen Rest -
       * dann bleibt es bei null, also beim alten Verhalten.
       */
      const ohneFd = (ganz, anteil) => (wFd ? ganz - anteil : 0);

      /* =====================================================================
       * >>> DAS GEWICHT GILT BEIDEN LEITERN, DIE UEBRIGEN DEM FAHRDRAHT. <<<
       * =====================================================================
       *
       * Frage vom 15. September: «es gibt auch abzugsmasten, diese lenken nur
       * die leiter um, dies gilt dann fuer tragseil und fahrdraht. das heisst
       * hier wirken nur ablenk und wind lasten.»
       *
       * Zwei Faelle, und sie ziehen in verschiedene Richtungen:
       *
       *   FAHRDRAHTABZUG an der Haengestuetze - Ablenkung und Wind des
       *   FAHRDRAHTS gehen dorthin, sein Gewicht haengt weiter am Tragseil.
       *
       *   ABZUGSMAST - der lenkt nur um: kein Gewicht, weder vom Tragseil
       *   noch vom Fahrdraht, aber Ablenkung und Wind von BEIDEN.
       *
       * >>> EIN FELD MEHR BRAUCHT ES DAFUER NICHT. <<<
       *
       * Die Haken haben verschiedene Bezuege, und zwar aus der Sache heraus:
       *
       *   Gewicht      gilt BEIDEN Leitern - es haengt am Tragseil, und
       *                das gilt fuer beide (Weisung vom 28. August: «Die
       *                staendigen aber beide zum Tragseil gehen»).
       *   Ablenkung    gilt dem FAHRDRAHT - seine geht in die Drueckstuetze
       *                oder in einen Fahrdrahtabzug.
       *   Wind         ebenso.
       *
       * Damit deckt dieselbe Zeile beide Faelle:
       *
       *   Fahrdrahtabzug   Ablenkung und Wind ab   -> nur der Fahrdraht faellt
       *   Abzugsmast       Gewicht ab              -> beide Leiter, nur Umlenkung
       *
       * Die Maske schreibt den Bezug an jeden Haken (siehe `WIRKUNGEN` in
       * ui.js) - drei Haken mit zwei Bezuegen sind sonst eine Falle.
       * =================================================================== */
      const kraefte = leereKraefte();
      kraefte.G.Fz = wirkt('wirktG') ? w.Gz : 0;
      kraefte.G.Fx = wirkt('wirktAblenk') ? Gx : ohneFd(Gx, GxFd);
      if (wirkt('wirktQ')) {
        kraefte.WindX.Fx = w.Qx;
        kraefte.WindY.Fy = w.Qy;
        kraefte.Schnee.Fz = m.Qz ?? 0;
      } else {
        kraefte.WindX.Fx = ohneFd(w.Qx, wFd?.Qx ?? 0);
        kraefte.WindY.Fy = ohneFd(w.Qy, wFd?.Qy ?? 0);
        // Der Schnee steht am Modul, nicht in der Tabelle - er laesst sich
        // nicht in Tragseil und Fahrdraht zerlegen und faellt ganz weg.
        kraefte.Schnee.Fz = 0;
      }
      let havarieJe = null;
      let festeRichtung = false;
      const leiter = drahtwerk ? leiterKennung(a, m, i) : null;
      if (drahtwerk) {
        const zugHier = wirkt('wirktAblenk') ? 1
          : (fdTeil ? 1 - leiterzug(fdTeil.id) / (leiterzug(m.bauteil) || 1) : 0);
        /*
         * >>> WIE DIESER LEITER GEFUEHRT IST (Weisung vom 24. September). <<<
         *
         * Die Angabe steht je Leiter in der Havarie-Karte - dort, wo man
         * alle Leiter des Tragwerks nebeneinander sieht. Sie gilt nicht nur
         * dem Bruchfall: die einseitige Abfangung zieht STAENDIG, und genau
         * dieses Gleichgewicht stoert der Riss.
         *
         * Sie wird fuer JEDEN Leiter gelesen, nicht nur fuer die
         * angehakten - `havarieKandidaten` filtert auf `reisst`, der
         * staendige Zug haengt daran aber nicht.
         */
        const wahlL = auswahl?.[leiter] ?? {};
        const art = wahlL.art ?? ABFANG_VORGABE;
        const richtung = wahlL.richtung === '-y' ? -1 : 1;
        const basis = { id: m.bauteil, n, GxHier: kraefte.G.Fx, zugHier,
                        art, richtung };
        festeRichtung = art === 'einseitig';
        // Mit Auswahl: aufgeloest ohne Bruch - der Lastfall setzt ihn ein.
        const h = havarieAnteile({ ...basis,
          bruch: auswahl ? false : (roh.bruch ?? a.bruch) === true });
        // Der STAENDIGE Leiterzug - nur die einseitige Abfangung hat einen.
        kraefte.G.Fy = h.Gy;
        kraefte.HavarieX.Fx = h.dFx;
        kraefte.HavarieY.Fy = h.Fy;
        const eigen = kandidaten.find((c) => c.key === leiter);
        if (eigen) {
          const hP = havarieAnteile({ ...basis, bruch: true, zug20: eigen.zugP });
          const hM = havarieAnteile({ ...basis, bruch: true, zug20: eigen.zugM });
          havarieJe = { [leiter]: { p: { dFx: hP.dFx, Fy: hP.Fy },
                                    m: { dFx: hM.dFx, Fy: hM.Fy } } };
        }
      }

      const z = m.z ?? 0, y = m.y ?? 0;
      teile.push({
        ...gemein,
        id: `${a.id}#${i}`, modulIndex: i, art: 'modul',
        bauteil: m.bauteil, bauteilName: b.name, rolle: b.rolle,
        ...(leiter ? { leiter } : {}), ...(havarieJe ? { havarieJe } : {}),
        // Bei einseitiger Abfangung steht die Zugrichtung fest - der
        // Lastfall darf sie nicht drehen (siehe `havarieEinsetzen`).
        ...(drahtwerk && festeRichtung ? { havarieFest: true } : {}),
        name: `${a.name} · ${b.name}`,
        x: a.x + (m.x ?? 0), y, z, ev: -z, ex: y,
        // In welcher Folge die Kette die drei Achsen abfaehrt: die
        // Reihenfolge der Eingabe (Weisung, 24. September). Steht sie
        // nicht da - alter Stand -, gilt die Vorgabe z, y, x.
        ...(m.folge ? { folge: m.folge } : {}),
        anzahl: n, laenge, alpha, einheit: b.einheit,
        // Welche Anteile hier wirklich ankommen - die Ausleitung und die
        // Darstellung sollen es benennen koennen, nicht nur die Summe sehen.
        wirkung: drahtwerk
          ? { G: wirkt('wirktG'), ablenk: wirkt('wirktAblenk'),
              Q: wirkt('wirktQ'),
              /*
               * OB DER HAKEN DEN FAHRDRAHT ODER ALLES WEGNIMMT - die
               * Ausleitung und die Maske sollen es benennen koennen. Ohne
               * Fahrdraht-Eintrag gibt es keinen Anteil zum Abziehen.
               */
              fdTrennbar: Boolean(wFd), fahrdraht: zKw?.fd ?? null,
              /*
               * WELCHER HAKEN WELCHEN BEZUG HAT - das Gewicht gilt beiden
               * Leitern, Ablenkung und Wind dem Fahrdraht. Die Maske und die
               * Ausleitung sollen es benennen koennen, statt es zu wissen.
               */
              bezug: { G: 'beide', ablenk: 'fahrdraht', Q: 'fahrdraht' } } : null,
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
        ...(l.folge ? { folge: l.folge } : {}),
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
