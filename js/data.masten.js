/**
 * data.masten.js
 * ---------------------------------------------------------------------------
 * DER ZUGRIFF auf die Mastprofile. Die Querschnittswerte stehen in
 * data/normen.json (Norm), die Windlasten in data/masten.json (Sortiment).
 *
 *   h, b   Profilhöhe / Profilbreite                     [mm]
 *   A      Querschnittsfläche                            [cm2]
 *   Iy, Wy starke Achse (Biegung in der Stegebene)       [cm4] / [cm3]
 *   Iz, Wz schwache Achse (Biegung senkrecht zum Steg)   [cm4] / [cm3]
 *   It     Torsionsträgheitsmoment                       [cm4]
 *
 * >>> Werte vor der Abgabe gegen die eigene Profiltabelle verifizieren. <<<
 *
 * DIE LISTE BEGINNT BEI HEB 200 - das ist Absicht, kein Versehen.
 *
 * Der Bauteilsatz kennt einen Masttyp mit 0,512 kN/m, also HEB 180. Das
 * Profil hier zu ergaenzen waere eine Kleinigkeit; der Auftraggeber hat am
 * 28. August entschieden, es NOCH NICHT aufzunehmen. Wer die Luecke findet,
 * soll wissen, dass sie bekannt ist (CLAUDE.md, «Entschieden - nicht
 * wieder aufmachen»).
 *
 * DER NAME IST DER PROFILNAME. Die Zuordnung zu den DP-Bezeichnungen des
 * Sortiments ist ueber Eigengewicht und Windlasten doppelt belegt, steht
 * aber bewusst NICHT im Waehler - «HEB 260» genuegt, ebenfalls entschieden.
 * ---------------------------------------------------------------------------
 */

import { ausTabellen } from './data.tabellen.js';
import { mastprofileNorm, winkelprofile } from './data.normen.js';

let SORT = null;

/** Das Masten-Sortiment setzen (aus data/masten.json). */
export function setzeMastenDB(obj) {
  // Tabellenform (seit 16. September) oder Baumform - beides wird gelesen.
  SORT = ausTabellen(obj, 'masten');
  return SORT;
}

/** Der ganze Bestand - fuer das Datenpaket. */
export const mastenDB = () => SORT;

/**
 * Das Sortiment laden - eingebettet oder daneben liegend.
 *
 * Sein Fehlen ist KEIN Fehler: ohne Sortiment bleiben die Querschnittswerte
 * aus normen.json, nur die Windlast fehlt dann. `mastWind` sagt es (null),
 * statt eine Last zu erfinden.
 */
export async function ladeMasten(pfad = 'data/masten.json') {
  if (SORT) return SORT;
  if (typeof document !== 'undefined') {
    const eingebettet = document.getElementById('masten-db');
    const roh = eingebettet?.textContent?.trim();
    if (roh) return setzeMastenDB(JSON.parse(roh));
  }
  try {
    const antwort = await fetch(pfad);
    if (antwort.ok) return setzeMastenDB(await antwort.json());
  } catch { /* ohne Sortiment weiter */ }
  return null;
}

/** Ob ein Masten-Sortiment geladen ist. */
export const mastenDbDa = () => Boolean(SORT?.typen?.length);

/* ===========================================================================
 * >>> DIE FUNDAMENTE, UND WELCHER MAST AUF WELCHEM STEHT. <<<
 * =========================================================================
 *
 * Weisung vom 24. September: «die Fundamentzuordnug zu den einzelnen
 * Masttypen. Diese kannst du unter Grundlagen Einwirkungen finden im pdf
 * zulässige Standardlsten (die Gelängeneigung nicht berücksichtigen).»
 *
 * Die Tabelle führt die zulässigen Lasten am FUNDAMENTKOPF, als
 * CHARAKTERISTISCHE Werte - dieselbe Bauart wie beim Seilanker, und aus
 * demselben Grund ohne Teilsicherheitsbeiwerte.
 *
 * >>> WIE DIE ZUORDNUNG ZUSTANDE KOMMT. <<<
 *
 * Die Quelle ordnet nach MASTTYP (DP20, DP22, …), die Anwendung führt
 * ihre Masten seit dem 28. August unter dem PROFILNAMEN. Die Brücke ist
 * gemessen, nicht geraten: die Windlasten je Einwirkungsklasse in
 * data/fl_bauteile.json stimmen ziffernweise mit denen der Profile.
 *
 *   DP20 0.25/0.31/0.36 = HEB 200     DP24 0.30/0.37/0.44 = HEB 240
 *   DP22 0.28/0.34/0.40 = HEB 220     DP26 0.33/0.40/0.47 = HEB 260
 *   DPM24 quer 0.31 / längs 0.34 = HEM 240
 *   DPM24-P mit vertauschten Werten  = HEM 240, um 90° gedreht
 *
 * Beim HEM 240 entscheidet deshalb die STEGRICHTUNG mit: er ist das
 * einzige Mastprofil, das nicht quadratisch ist (270 × 248 mm), und die
 * beiden Fundamente HP1a/HP2a haben Mq und Ml vertauscht - 230/154 gegen
 * 154/230 kNm. Ein gedrehter Mast auf dem ungedrehten Fundament wäre um
 * die starke Achse um ein Drittel zu schwach nachgewiesen.
 *
 * Die DG-Typen (Doppelmasten) stehen in der Tabelle, tragen aber kein
 * Profil: das Sortiment der Anwendung führt sie nicht. Sie lassen sich
 * von Hand wählen, sie werden nur nicht selbst gefunden.
 * ========================================================================= */

/** Alle Fundamenttypen des Sortiments. */
export const fundamenttypen = () => SORT?.fundamente ?? [];

/** Ob die Fundamenttabelle geladen ist. */
export const fundamenteDa = () => Boolean(SORT?.fundamente?.length);

/** Ein Fundamenttyp nach Namen, oder null. */
export function getFundament(typ) {
  const n = String(typ ?? '').trim();
  if (!n) return null;
  return fundamenttypen().find((f) => f.typ === n) ?? null;
}

/**
 * DAS FUNDAMENT ZU EINEM MASTEN - Profil und Stegrichtung entscheiden.
 *
 * Die Spalte `profile` führt die Profilnamen, `steg` die Stegrichtung,
 * WO SIE ENTSCHEIDET (nur beim HEM 240). Steht dort nichts, gilt die
 * Zeile für beide Lagen.
 *
 * Passt keine Zeile, kommt null - und das ist eine Auskunft, kein
 * Fehler: ein Profil ohne Standardfundament braucht ein Sonderfundament,
 * und das rechnet dieses Werkzeug nicht.
 */
export function fundamentFuerMast(profil, stegrichtung = 'jochachse') {
  const p = String(profil ?? '').trim();
  if (!p) return null;
  const steg = String(stegrichtung ?? 'jochachse').trim() || 'jochachse';
  const passt = fundamenttypen().filter((f) => String(f.profile ?? '')
    .split(',').map((x) => x.trim()).filter(Boolean).includes(p));
  if (!passt.length) return null;
  // Eine Zeile mit ausdruecklicher Stegrichtung geht vor der allgemeinen.
  return passt.find((f) => String(f.steg ?? '').trim() === steg)
      ?? passt.find((f) => !String(f.steg ?? '').trim())
      ?? null;
}

/* ===========================================================================
 * >>> ZWEI QUELLEN FUER EINEN MASTEN. <<<
 * ===========================================================================
 *
 * Weisung vom 16. September: «die ui und die [Betreiber]daten sollen getrennt
 * sein.» Beim Masten verläuft diese Grenze MITTEN DURCH DEN DATENSATZ, und
 * das ist kein Schoenheitsfehler, sondern die Sache selbst:
 *
 *   I_y, I_t, A, h, b   stehen in EN 10365. Ein HEB 240 hat sie überall.
 *                       -> data/normen.json, verfolgt, oeffentlich
 *   Windlast je EK      ist eine Festlegung des Betreibers.
 *                       -> data/masten.json, oertlich
 *
 * Bis zum 16. September standen beide in EINEM Literal in dieser Datei -
 * die Normwerte also mitten in den Betreiberdaten, und die Betreiberdaten
 * mitten im Quelltext. Beides ist jetzt getrennt und wird hier wieder
 * zusammengefügt.
 *
 * DIE REIHENFOLGE KOMMT AUS DEM SORTIMENT. Welche Profile es gibt, sagt der
 * Betreiber; die Normtabelle darf mehr führen, ohne dass sie im Wähler
 * auftauchen. Fehlt das Sortiment ganz, gelten alle Normprofile - ohne
 * Wind. So bleibt die Anwendung bedienbar, statt mit leerem Wähler
 * dazustehen.
 * ========================================================================= */
export function mastprofile() {
  const norm = mastprofileNorm();
  if (!mastenDbDa()) return norm;   // ohne Sortiment auch keine Gittermasten
  const aus = [];
  for (const t of SORT.typen) {
    const p = norm.find((x) => x.name === t.profil);
    /*
     * EIN SORTIMENTSTYP OHNE QUERSCHNITTSWERTE WIRD UEBERGANGEN, nicht
     * erfunden. Er taucht dann im Wähler nicht auf - und der Feldkatalog
     * meldet die Luecke beim Pruefen des Bestandes.
     */
    if (p) aus.push({ ...p, wind: t.wind ?? null });
  }
  // Die Gittermasten hinter den Walzprofilen (3. Oktober).
  const gitter = gittermasten().map(gittermastProfil).filter(Boolean);
  return [...(aus.length ? aus : norm), ...gitter];
}

/**
 * Ausrichtung des Maststegs relativ zur Jochachse.
 *
 * Für die EINSPANNUNG DES JOCHENDES ist die Biegung des Mastes IN DER
 * JOCHACHSE massgebend (der Mast muss sich quer zu den Gleisen verformen).
 *   - Steg in Jochachse  -> Biegung um die STARKE Achse  -> I_y
 *   - Steg 90 Grad dazu  -> Biegung um die SCHWACHE Achse -> I_z
 */
export const STEGRICHTUNGEN = [
  // Benannt nach dem GLEIS, nicht nach der Jochachse (Weisung, 1. September):
  // «in Jochachse» und «um 90 Grad gedreht» sagen nichts darüber, wie der Mast
  // zum Gleis steht. Die Schlüssel bleiben, damit gespeicherte Stände gelten.
  { key: 'jochachse',
    label: 'Steg quer zum Gleis, starke Achse quer', achse: 'y' },
  { key: 'quer',
    label: 'Steg längs zum Gleis, schwache Achse quer', achse: 'z' },
];

/**
 * Windlast auf den Mast je Laufmeter [kN/m] aus der Lasttabelle.
 *
 * Massgebend für das Joch ist die Richtung QUER zum Gleis. Ist der Steg um
 * 90 Grad gedreht, tauscht das die beiden Richtungen - beim HEM 240 macht das
 * einen Unterschied, bei den übrigen Profilen nicht.
 */
export function mastWind(name, ek = 'EK2', steg = 'jochachse') {
  const w = getMastprofil(name).wind;
  if (!w) return null;
  const richtung = steg === 'quer' ? 'laengs' : 'quer';
  return w[richtung]?.[ek] ?? null;
}

/**
 * Der Wind auf den Masten in BEIDEN Richtungen [kN/m].
 *
 * >>> EINE STELLE, ZWEI ZAHLEN. <<<
 *
 * Der Kern rechnet den Masten seit dem 27. August in beiden Richtungen an:
 * `x` in der Jochachse (quer zum Gleis), `y` in Gleisrichtung. Welche Spalte
 * der Tabelle welche Richtung ist, entscheidet die STEGRICHTUNG - und diese
 * Zuordnung stand bisher nur im Rechenkern (`mastWindSatz`). Die Maske
 * zeigte deshalb nur den einen Wert, gemeldet am 20. September: «hier ist
 * die windlast in y nicht aufgefuehrt beim einzelmasten.»
 *
 * Zwei Stellen, die dieselbe Zuordnung selbst herleiten, laufen frueher oder
 * spaeter auseinander. Also steht sie hier, und Kern wie Maske fragen sie.
 *
 * @returns {{jochachse:number|null, gleis:number|null}} kN/m, `null` wenn
 *          das Profil keine Windzeile in der Tabelle hat.
 */
export function mastWindBeide(name, ek = 'EK2', steg = 'jochachse') {
  const gegen = steg === 'quer' ? 'jochachse' : 'quer';
  return { jochachse: mastWind(name, ek, steg), gleis: mastWind(name, ek, gegen) };
}

/* ===========================================================================
 * >>> DIE GITTERMASTEN (kombinierter Mast, 3. Oktober). <<<
 * =========================================================================
 *
 * Weisung: «Einen alten Masttyp ergänzen … Es ist ein Gittermast, struktur
 * wie die Joche, mit unterschied das Winkel nach innen und der untere teil
 * konisch ausgebildet ist. … im oberen teil ist ein rohr der in den oberen
 * teil des gittermasten eingespannt ist.»
 *
 * Vier Winkelgurte in den Ecken, die Schenkel nach INNEN; Bindebleche auf
 * allen vier Seiten, stumpf zwischen den Schenkeln (Blechlänge = Aussen-
 * breite − 2 · Schenkel). Unten konisch bis zum Knick, darüber gerade. Das
 * Sortiment führt je Typ die Gurte, die TEILUNG DER ZEICHNUNG (Entscheid
 * «teilung nach zeichnung») und die Aussenbreiten an den Stationen.
 *
 * `gittermastGeometrie` macht daraus, was Modell, Bild und Nachweis
 * brauchen: die Stationen mit Höhe, Aussenmass, Gurtachsen und Blech.
 * ========================================================================= */
export const gittermasten = () => SORT?.gittermasten ?? [];
export const gittermastenDa = () => gittermasten().length > 0;

export function getGittermast(typ) {
  const g = gittermasten().find((x) => x.typ === typ);
  if (!g) throw new Error(`Unbekannter Gittermast: ${typ}`);
  return g;
}

/**
 * Die Geometrie eines Gittermasts, in Metern, z ab Mastfuss.
 *
 * Richtung a ist die breite Seite (beim rechteckigen Typ der lange Schenkel),
 * b die schmale. Die Gurtachse liegt um den Schwerpunktabstand des Winkels
 * innerhalb der Aussenkante.
 *
 * @returns {{typ, hUnten, hOben, hoehe, gurtUnten, gurtOben, stationen: Array,
 *            rohr: object|null, fehler: string[]}}
 *   stationen: { z, teil: 'unten'|'oben', a, b, achseA, achseB, gurt,
 *                blech: { b, t, la, lb, art } }
 */
export function gittermastGeometrie(typ) {
  const g = typeof typ === 'string' ? getGittermast(typ) : typ;
  const fehler = [];
  const winkel = (name) => {
    const w = winkelprofile().find((x) => x.name === name);
    if (!w) fehler.push(`Gurtwinkel ${name} fehlt in der Normtabelle`);
    return w ?? null;
  };
  const wU = winkel(g.gurtUnten), wO = winkel(g.gurtOben);
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  const mm = (v) => r6((Number(v) || 0) / 1000);
  // Langer Schenkel (aH) in Richtung a; die Tabelle führt zsH/zsV in cm:
  // zsV ist der Schwerpunktabstand entlang des langen Schenkels.
  const lage = (w) => ({ sa: mm(w?.aH), sb: mm(w?.aV),
    ea: mm((w?.zsV ?? 0) * 10), eb: mm((w?.zsH ?? 0) * 10) });
  const lU = lage(wU), lO = lage(wO);
  const stationen = [];
  const stelle = (z, teil, a, b, l, gurt, blech, art) => {
    stationen.push({ z: r6(z), teil, a, b,
      achseA: r6(a - 2 * l.ea), achseB: r6(b - 2 * l.eb), gurt,
      blech: blech ? { b: mm(blech.b), t: mm(blech.t), art,
        la: r6(a - 2 * l.sa), lb: r6(b - 2 * l.sb) } : null });
  };
  const tu = g.teilungUnten ?? [], to = g.teilungOben ?? [];
  if (tu.length !== (g.breiteA ?? []).length || tu.length !== (g.breiteB ?? []).length) {
    fehler.push('Teilung unten und Aussenbreiten haben nicht gleich viele Stationen');
  }
  // Der Fuss selbst (z = 0) - ohne Blech, dort stehen die Fussplatten.
  stelle(0, 'unten', mm(g.fuss?.a), mm(g.fuss?.b), lU, g.gurtUnten, null, 'fuss');
  let z = 0;
  tu.forEach((d, i) => {
    z += d / 1000;
    const letzte = i === tu.length - 1;
    const art = i === 0 ? 'fuss' : letzte ? 'knick' : 'unten';
    stelle(z, 'unten', mm(g.breiteA?.[i]), mm(g.breiteB?.[i]), lU, g.gurtUnten,
           g.blech?.[art] ?? g.blech?.unten, art);
  });
  if (Math.abs(z - g.hUnten) > 1e-6) fehler.push(`Teilung unten ergibt ${z.toFixed(3)} m statt ${g.hUnten} m`);
  const ka = mm(g.kopf?.a), kb = mm(g.kopf?.b);
  // Das Oberteil ist meist gerade (Kopfmass); ein Typ verjüngt sich in
  // einer Richtung bis zum Kopf - dann führt das Sortiment die Breiten
  // auch oben (`breiteAOben`, `breiteBOben`, je Station der Teilung).
  to.forEach((d, i) => {
    z += d / 1000;
    const a = Number.isFinite(g.breiteAOben?.[i]) ? mm(g.breiteAOben[i]) : ka;
    const b = Number.isFinite(g.breiteBOben?.[i]) ? mm(g.breiteBOben[i]) : kb;
    stelle(z, 'oben', a, b, lO, g.gurtOben, g.blech?.oben, 'oben');
  });
  const hoehe = r6((Number(g.hUnten) || 0) + (Number(g.hOben) || 0));
  if (Math.abs(z - hoehe) > 1e-6) fehler.push(`Teilung oben endet bei ${z.toFixed(3)} m statt ${hoehe} m`);
  stationen.forEach((s) => {
    if (s.blech && (s.blech.la < -1e-9 || s.blech.lb < -1e-9)) {
      fehler.push(`Station ${s.z.toFixed(2)} m: Blechlänge negativ`);
    }
  });
  const rohr = g.rohr?.d > 0 ? { d: mm(g.rohr.d), t: mm(g.rohr.t),
    frei: Number(g.rohr.frei) || 0, innen: Number(g.rohr.innen) || 0 } : null;
  // Der Mastaufsatz (Quadratrohr auf dem Kopf verschraubt) - statt des Rohrs.
  const aufsatz = g.aufsatz?.a > 0 ? { a: mm(g.aufsatz.a), t: mm(g.aufsatz.t),
    laenge: Number(g.aufsatz.laenge) || 0 } : null;
  // Was über dem Kopf des Gitters steht: Rohr oder Aufsatz, mit Querschnitt.
  const oben = rohr ? { art: 'rohr', ...rohrWerte(rohr.d, rohr.t), laenge: rohr.frei, innen: rohr.innen }
    : aufsatz ? { art: 'aufsatz', ...kastenWerte(aufsatz.a, aufsatz.t), laenge: aufsatz.laenge, innen: 0 }
    : null;
  return { typ: g.typ, quelle: g.quelle ?? null, hUnten: Number(g.hUnten), hOben: Number(g.hOben),
           hoehe, laenge: r6(hoehe + (oben?.laenge ?? 0)),
           gurtUnten: g.gurtUnten, gurtOben: g.gurtOben, winkelUnten: wU, winkelOben: wO,
           stationen, rohr, aufsatz, oben, windDruck: g.windDruck ?? null, fehler };
}

/** Kreisrohr d × t [m]: A [m²], I [m⁴], W [m³], I_t [m⁴]. */
export function rohrWerte(d, t) {
  const di = d - 2 * t;
  const A = Math.PI / 4 * (d * d - di * di);
  const I = Math.PI / 64 * (d ** 4 - di ** 4);
  return { form: 'Pipe', d, t, A, I, W: I / (d / 2), It: 2 * I };
}

/** Quadratrohr a × t [m], scharfkantig: A, I, W, I_t (Bredt). */
export function kastenWerte(a, t) {
  const ai = a - 2 * t;
  const A = a * a - ai * ai;
  const I = (a ** 4 - ai ** 4) / 12;
  return { form: 'Box', a, t, A, I, W: I / (a / 2), It: (a - t) ** 3 * t };
}

/* ===========================================================================
 * >>> DER GITTERMAST ALS MASTPROFIL (3. Oktober, Etappe 4). <<<
 * =========================================================================
 *
 * Entscheid «Einzelmast und Jochmast, Rohr als Teil»: wählbar, wo heute
 * ein HEB steht. Der Wähler, die Mastliste und der Rechensatz führen einen
 * Masten über seinen PROFILNAMEN - der Gittermast bekommt deshalb einen
 * («Gittermast II 45») und einen Ersatz-Datensatz in der Form der
 * Mastprofile. Das Stabwerk baut daraus das Fachwerk (vier Gurte, Bleche,
 * Rohr; export.axisvm.gitter.js) und weist je Stab nach - der Ersatz trägt
 * nur die vorläufige Anzeige des Ersatzbalkens und die Maske:
 *
 *   h, b      Aussenmass am Kopf (a in der «Stegrichtung», b quer dazu)
 *   A         vier Gurtwinkel des Oberteils
 *   Iy, Iz    Steiner der vier Gurte am KOPF (die schmalste Stelle, sichere
 *             Seite - am Fuss ist der Mast fast doppelt so breit)
 *   wind      Druck auf die Hüllfläche × Kopfbreite [kN/m]; das Stabwerk
 *             setzt ihn je Abschnitt mit der Breite an seiner Höhe an
 *   laenge    feste Gesamtlänge: Gitter + Rohr bzw. Aufsatz
 *
 * Ohne Tabelle `gittermasten` im Sortiment gibt es keinen Gittermast.
 * ========================================================================= */
export const GITTER_PRAEFIX = 'Gittermast ';

const gitterSpeicher = new WeakMap();
export function gittermastProfil(g) {
  if (gitterSpeicher.has(g)) return gitterSpeicher.get(g);
  const G = gittermastGeometrie(g);
  const w = G.winkelOben;
  if (!w || G.fehler.length) { gitterSpeicher.set(g, null); return null; }
  const kopf = G.stationen[G.stationen.length - 1];
  // Winkel: i in cm, A in cm² -> I in cm⁴; langer Schenkel (aH) liegt in a.
  // Biegung IN Richtung a läuft um die Achse parallel b: Steiner mit achseA.
  const Iw_a = (w.iz ?? w.iy) ** 2 * w.A, Iw_b = w.iy ** 2 * w.A;
  const Iy = 4 * (Iw_a + w.A * (kopf.achseA * 50) ** 2);   // m -> cm, halber Abstand
  const Iz = 4 * (Iw_b + w.A * (kopf.achseB * 50) ** 2);
  const h = kopf.a * 1000, b = kopf.b * 1000;              // mm
  const A = 4 * w.A;
  const druck = g.windDruck ?? null;
  const je = (breite) => (druck ? Object.fromEntries(['EK1', 'EK2', 'EK3']
    .map((ek) => [ek, Math.round((Number(druck[ek]) || 0) * breite * 100) / 100])) : null);
  const p = {
    name: GITTER_PRAEFIX + g.typ, gitter: g.typ, h, b,
    A, Iy, Iz, Wy: Iy / (h / 20), Wz: Iz / (b / 20),
    iy: Math.sqrt(Iy / A), iz: Math.sqrt(Iz / A),
    Wply: Iy / (h / 20), Wplz: Iz / (b / 20),             // elastisch, kein plastischer Zuschlag
    It: 4 * ((w.aH + w.aV - w.t) * w.t ** 3 / 3) / 1e4,   // mm⁴ -> cm⁴, vier offene Winkel
    g: Number(g.gewicht) > 0 ? Math.round(g.gewicht / G.hoehe * 10) / 10 : Math.round(4 * w.g * 1.25 * 10) / 10,
    laenge: G.laenge, hoehe: G.hoehe,
    // «quer» = Wind in der Jochachse bei a in der Jochachse: er trifft die Seite b.
    wind: druck ? { quer: je(kopf.b), laengs: je(kopf.a) } : null,
  };
  gitterSpeicher.set(g, p);
  return p;
}

/** Ist dieses Profil (Name oder Datensatz) ein Gittermast? */
export const istGittermast = (p) => (typeof p === 'string'
  ? p.startsWith(GITTER_PRAEFIX) : Boolean(p?.gitter));

/** Der Typ des Gittermasts zu einem Profilnamen, oder null. */
export const gitterTyp = (name) => (typeof name === 'string' && name.startsWith(GITTER_PRAEFIX)
  ? name.slice(GITTER_PRAEFIX.length) : null);

export function getMastprofil(name) {
  const p = mastprofile().find((x) => x.name === name);
  if (!p) throw new Error(`Unbekanntes Mastprofil: ${name}`);
  return p;
}

export function getStegrichtung(key) {
  const s = STEGRICHTUNGEN.find((x) => x.key === key);
  if (!s) throw new Error(`Unbekannte Stegrichtung: ${key}`);
  return s;
}
