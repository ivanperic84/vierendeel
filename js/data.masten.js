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
import { windWert, EINHEIT_EK, EINHEIT_Q, EINHEIT_EBENEN } from './data.fl.js';
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

/* ===========================================================================
 * >>> FUNDAMENTLASTEN JE GELÄNDE (7. Oktober). <<<
 * ===========================================================================
 *
 * Weisung: «fundamentflow und gelände >14° einbauen». Die Mappe der alten
 * Maststatik führt je Fundamenttyp drei Geländefälle - bis 14°, 14°–33° mit
 * horizontalem Terrain und 14°–33° Richtung fallender Böschung - und je Fall
 * eigene zulässige Lasten, Grenzwerte und Abminderungswerte. Steiler als 14°
 * stehen andere (tiefere) Fundamente zur Wahl.
 *
 * Die Tabelle `fundamente` bleibt, wie sie ist (bis 14°, Abmessung, Neubau);
 * ein Wert der neuen Tabelle geht ihr vor.
 * ========================================================================= */
export const GELAENDE = [
  { key: 'bis14', text: 'bis 14°', kurz: '≤ 14°' },
  { key: 'ueber14', text: '14°–33°, horizontales Terrain', kurz: '14°–33° horizontal' },
  { key: 'ueber14fallend', text: '14°–33°, Richtung fallende Böschung', kurz: '14°–33° fallend' },
];
export const gelaendeVon = (key) => GELAENDE.find((g) => g.key === key) ?? GELAENDE[0];
const ohneLeer = (t) => String(t ?? '').replace(/\s+/g, '');
export const fundamentlasten = () => SORT?.fundamentlasten ?? [];
export const fundamentlastenDa = () => Boolean(SORT?.fundamentlasten?.length);

/** Zulässige Lasten eines Typs in einem Geländefall, oder null. */
export function fundamentWerte(typ, gelaende = 'bis14') {
  const n = ohneLeer(typ);
  if (!n) return null;
  const g = gelaendeVon(gelaende).key;
  const basis = fundamenttypen().find((f) => ohneLeer(f.typ) === n) ?? null;
  const z = fundamentlasten().find((f) => ohneLeer(f.typ) === n && f.gelaende === g) ?? null;
  if (z) return { ...(basis ?? {}), ...z, gelaende: g };
  return g === 'bis14' && basis ? { ...basis, gelaende: g } : null;
}

/** Die Fundamente, die das Sortiment einem Profil in diesem Gelände zuordnet. */
export function fundamentKandidaten(profil, stegrichtung = 'jochachse', gelaende = 'bis14') {
  const p = String(profil ?? '').trim();
  // stegrichtung null: beide Lagen (die Auswahl bietet beim HEM 240 beide an).
  const steg = stegrichtung === null ? null : String(stegrichtung ?? 'jochachse').trim() || 'jochachse';
  const g = gelaendeVon(gelaende).key;
  return fundamentlasten()
    .filter((f) => f.gelaende === g && String(f.profile ?? '').split(',')
      .map((x) => x.trim()).includes(p)
      && (steg === null || !String(f.steg ?? '').trim() || String(f.steg).trim() === steg))
    .map((f) => fundamentWerte(f.typ, g));
}

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
export function fundamentFuerMast(profil, stegrichtung = 'jochachse', gelaende = 'bis14') {
  const p = String(profil ?? '').trim();
  if (!p) return null;
  const steg = String(stegrichtung ?? 'jochachse').trim() || 'jochachse';
  // Mit der Tabelle je Gelände (7. Oktober): der kleinste passende Typ.
  if (fundamentlastenDa()) {
    return fundamentKandidaten(p, steg, gelaende)[0] ?? null;
  }
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
  const gitter = gittermastenAlle().map(gittermastProfil).filter(Boolean);
  // Die gespreizten Masten (8. Oktober): das Walzprofil mit seinem Wind,
  // unter dem Namen des Typs und mit dem Merkmal `gespreizt`.
  const basis = aus.length ? aus : norm;
  const gespreizt = gespreizteMasten().map((g) => {
    const p = basis.find((x) => x.name === g.profil);
    return p ? { ...p, name: g.typ, gespreizt: g.typ, basis: g.profil } : null;
  }).filter(Boolean);
  return [...basis, ...gespreizt, ...gitter];
}

/* ===========================================================================
 * >>> DER GESPREIZTE MAST (8. Oktober). <<<
 * =========================================================================
 * Weisung: «Hier hast du noch die Zeichnungen zu den DGP Masttypen …
 * Implementiere diese wie die übrigen Masten und führe tests durch.»
 *
 * Ein HEB, im unteren Teil (L1) längs in der Stegmitte geteilt; die beiden
 * Hälften - je ein Flansch mit halbem Steg, ein T - sind am Fuss
 * auseinandergezogen (Aussenmass über die Flansche `fussBreite`) und laufen
 * bis L1 geradlinig auf die Profilhöhe zusammen. Zwischen den Steghälften
 * stehen Bindebleche in der Stegebene. Darüber läuft das Profil ungeteilt.
 * Gespreizt ist also in der STEGRICHTUNG (starke Achse).
 *
 * Für den Kern (vorläufige Anzeige), den Wind, das Knicken und das
 * Fundament ist er das Walzprofil; das Stabwerk baut den unteren Teil als
 * Rahmen aus zwei T-Gurten und den Blechen (export.axisvm.gespreizt.js).
 * ========================================================================= */
export const gespreizteMasten = () => SORT?.gespreizt ?? [];

/** Ist dieses Profil (Name oder Datensatz) ein gespreizter Mast? */
export const istGespreizt = (p) => (typeof p === 'string'
  ? gespreizteMasten().some((g) => g.typ === p) : Boolean(p?.gespreizt));

export function getGespreizt(typ) {
  const g = gespreizteMasten().find((x) => x.typ === typ);
  if (!g) throw new Error(`Unbekannter gespreizter Mast: ${typ}`);
  return g;
}

/**
 * Das halbe Walzprofil als T: ein Flansch, der halbe Steg und die beiden
 * Ausrundungen. Masse in m, bezogen auf die Aussenfläche des Flansches.
 *
 * Die Ausrundungen zählen mit Fläche und Lage (ihr Eigenträgheitsmoment
 * ist vernachlässigt - es macht am HEB 240 weniger als 0.1 %); so ist die
 * Fläche genau die halbe des Profils.
 *
 * @returns {{A, e, Iy, Iz, It, Wy, Wz, hT, b, tw, tf}}
 *          e = Schwerpunkt ab Flansch-Aussenfläche; Iy um die Achse parallel
 *          zum Flansch (Biegung in der Stegebene), Iz um die Stegachse
 */
export function halbesProfil(p) {
  const mm = (v) => (Number(v) || 0) / 1000;
  const b = mm(p.b), tf = mm(p.tf), tw = mm(p.tw), hT = mm(p.h) / 2, r = mm(p.r);
  const hw = hT - tf;
  const teile = [
    { A: b * tf, z: tf / 2, Iy: b * tf ** 3 / 12, Iz: tf * b ** 3 / 12 },
    { A: tw * hw, z: tf + hw / 2, Iy: tw * hw ** 3 / 12, Iz: hw * tw ** 3 / 12 },
  ];
  if (r > 0) {
    // Zwickel zwischen Flansch und Steg: r² · (1 − π/4), Schwerpunkt 0.2234 · r von der Ecke.
    const Af = r * r * (1 - Math.PI / 4), c = 0.2234 * r;
    [-1, 1].forEach((s) => teile.push({ A: Af, z: tf + c, y: s * (tw / 2 + c), Iy: 0, Iz: 0 }));
  }
  const A = teile.reduce((a, t) => a + t.A, 0);
  const e = teile.reduce((a, t) => a + t.A * t.z, 0) / A;
  const Iy = teile.reduce((a, t) => a + t.Iy + t.A * (t.z - e) ** 2, 0);
  const Iz = teile.reduce((a, t) => a + t.Iz + t.A * (t.y ?? 0) ** 2, 0);
  const It = (b * tf ** 3 + hw * tw ** 3) / 3;
  return { A, e, Iy, Iz, It, hT, b, tw, tf,
           // Rand in der Stegebene: die Stegkante liegt weiter vom Schwerpunkt als der Flansch.
           Wy: Iy / Math.max(e, hT - e), Wz: Iz / (b / 2) };
}

/**
 * Geometrie eines gespreizten Masts: Aussenmass über die Flansche auf jeder
 * Höhe, das T, die Stationen der Bindebleche mit ihrer lichten Länge.
 * Höhen ab Unterkante Fussplatte, Masse in m.
 */
export function gespreiztGeometrie(typ) {
  const g = typeof typ === 'string' ? getGespreizt(typ) : typ;
  const fehler = [];
  const profil = mastprofileNorm().find((x) => x.name === g.profil) ?? null;
  if (!profil) fehler.push(`Profil ${g.profil} fehlt in den Mastprofilen`);
  const mm = (v) => (Number(v) || 0) / 1000;
  const L1 = Number(g.L1) || 0, H0 = mm(g.fussBreite), tFuss = mm(g.fussplatte);
  const h = mm(profil?.h);
  const T = profil ? halbesProfil(profil) : null;
  // Aussenmass über die Flansche: bis zur Oberkante der Fussplatte das Fussmass,
  // darüber geradlinig auf die Profilhöhe bei L1.
  const tiefe = (z) => (z <= tFuss ? H0 : z >= L1 ? h
    : H0 + (h - H0) * (z - tFuss) / (L1 - tFuss));
  const zs = g.blechZ ?? [], bs = g.blechB ?? [];
  if (zs.length !== bs.length) fehler.push('Höhen und Breiten der Bindebleche haben nicht gleich viele Einträge');
  const stationen = zs.map((zmm, i) => {
    const z = mm(zmm);
    // Lichte Weite zwischen den Steghälften = Aussenmass − Profilhöhe.
    return { z, b: mm(bs[i]), t: mm(g.blechT), l: Math.round((tiefe(z) - h) * 1e6) / 1e6 };
  });
  if (stationen.some((s) => s.z <= 0 || s.z >= L1)) fehler.push('Ein Bindeblech liegt ausserhalb der Spreizung');
  if (!(H0 > h)) fehler.push('Das Fussmass ist nicht grösser als die Profilhöhe');
  return { typ: g.typ, profil, profilName: g.profil, L1, H0, h, tFuss, T, tiefe, stationen,
           laengen: (g.laengen ?? []).map(Number), fehler };
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
  return windWert(w[richtung], ek) ?? null;   // Einheitswind: Profilbreite × 1.0
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
/** Der von Hand gesetzte Mastwind eines Endes aus dem Rechensatz: {x, y}, je Richtung eine Zahl oder null. */
export function mastWindHand(satz, ende = 'A') {
  const b = ende === 'B';
  const zahl = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) || Number(v) < 0
    ? null : Number(v));
  return { x: zahl(b ? satz?.mastWindXB : satz?.mastWindX), y: zahl(b ? satz?.mastWindYB : satz?.mastWindY) };
}

export function mastWindBeide(name, ek = 'EK2', steg = 'jochachse', hand = null) {
  // Von Hand (8. Oktober): eine eingetragene Zahl gilt vor der Tabelle, je Richtung.
  if (hand && (Number.isFinite(hand.x) || Number.isFinite(hand.y))) {
    const tab = mastWindBeide(name, ek, steg);
    return { jochachse: Number.isFinite(hand.x) ? hand.x : tab.jochachse,
             gleis: Number.isFinite(hand.y) ? hand.y : tab.gleis,
             vonHand: { x: Number.isFinite(hand.x), y: Number.isFinite(hand.y) }, tabelle: tab };
  }
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

/*
 * >>> OHNE ROHR BZW. MASTAUFSATZ (7. Oktober). <<< Weisung: «biete die
 * möglichkeit beim gittermasten, das rohr bzw. den mastaufsatz wegzulassen.»
 * Je Typ mit Rohr oder Aufsatz steht im Mastwähler ein zweiter Eintrag
 * «… ohne Rohr» / «… ohne Aufsatz»: dasselbe Gitter, das Rohr fällt ganz weg
 * (auch sein Stück im Gitter und die Halte an den Rippen), der Aufsatz
 * ebenso; die Länge ist dann die Höhe des Gitters. Die Varianten stehen
 * nicht im Sortiment (die Datenbasis bleibt, wie sie ist), sie werden hier
 * abgeleitet - einmal je Sortiment, damit die Zwischenspeicher halten.
 * Das Gewicht der Tabelle (`gewicht`) gilt dem Typ samt Oberteil und bleibt
 * stehen (sichere Seite); das Stabwerk wiegt ohnehin seine Stäbe.
 */
export const OHNE_ROHR = ' ohne Rohr', OHNE_AUFSATZ = ' ohne Aufsatz';
const variantenSpeicher = new WeakMap();
export function gittermastenAlle() {
  const roh = gittermasten();
  if (!roh.length) return roh;
  if (variantenSpeicher.has(roh)) return variantenSpeicher.get(roh);
  const aus = [];
  roh.forEach((g) => {
    aus.push(g);
    const mitRohr = Number(g.rohr?.d) > 0, mitAufsatz = Number(g.aufsatz?.a) > 0;
    if (!mitRohr && !mitAufsatz) return;
    aus.push({ ...g, typ: g.typ + (mitRohr ? OHNE_ROHR : OHNE_AUFSATZ), basis: g.typ,
               rohr: null, aufsatz: null });
  });
  variantenSpeicher.set(roh, aus);
  return aus;
}

/*
 * Als KÄSTCHEN, nicht im Mastwähler (Weisung, gleich danach: «nicht im
 * mastwähler sondern als separate checkbox»). Der Wähler zeigt die
 * Grundtypen (`mastprofileWahl`), das Kästchen schaltet den Namen des Mastes
 * zwischen Grundtyp und Variante um - gerechnet wird über denselben Namen.
 */
const OHNE_RE = new RegExp(`(${OHNE_ROHR}|${OHNE_AUFSATZ})$`);
/** Grundtyp eines Profilnamens (ohne «… ohne Rohr»). */
export const gitterBasisName = (name) => (typeof name === 'string' ? name.replace(OHNE_RE, '') : name);
/** Steht der Gittermast ohne Rohr / Aufsatz? */
export const gitterOhneOben = (name) => typeof name === 'string' && OHNE_RE.test(name);
/** Was der Grundtyp über dem Kopf trägt: 'rohr', 'aufsatz' oder null. */
export function gitterObenArt(name) {
  const typ = gitterTyp(gitterBasisName(name));
  const g = typ ? gittermasten().find((x) => x.typ === typ) : null;
  return Number(g?.rohr?.d) > 0 ? 'rohr' : Number(g?.aufsatz?.a) > 0 ? 'aufsatz' : null;
}
/** Profilname mit bzw. ohne Rohr / Aufsatz. */
export function gitterOhneObenName(name, ohne) {
  const basis = gitterBasisName(name);
  const art = gitterObenArt(basis);
  if (!art || !ohne) return basis;
  return basis + (art === 'rohr' ? OHNE_ROHR : OHNE_AUFSATZ);
}
/** Die Profile für den Mastwähler: ohne die Varianten. */
export const mastprofileWahl = () => mastprofile().filter((p) => !gitterOhneOben(p.name));

export function getGittermast(typ) {
  const g = gittermastenAlle().find((x) => x.typ === typ);
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
    // Kopf ohne Bindeblech (8. Oktober, nach Detailzeichnung): beim langen Typ
    // sitzt das letzte Blech 70 mm unter der Kopfplatte, am Kopf selbst steht
    // nur die Platte. `kopfBlech: false` im Sortiment lässt das Blech dort weg.
    const amKopf = i === to.length - 1 && g.kopfBlech === false;
    stelle(z, 'oben', a, b, lO, g.gurtOben, amKopf ? null : g.blech?.oben, 'oben');
  });
  const hoehe = r6((Number(g.hUnten) || 0) + (Number(g.hOben) || 0));
  if (Math.abs(z - hoehe) > 1e-6) fehler.push(`Teilung oben endet bei ${z.toFixed(3)} m statt ${hoehe} m`);
  stationen.forEach((s) => {
    if (s.blech && (s.blech.la < -1e-9 || s.blech.lb < -1e-9)) {
      fehler.push(`Station ${s.z.toFixed(2)} m: Blechlänge negativ`);
    }
  });
  /*
   * >>> WO DAS ROHR IM GITTER GEHALTEN IST (4. Oktober). <<<
   * Weisung: «bechte aber, das bei einigen Typen das rohr über die
   * kopfplatte angeschlossen ist und nicht bis zur mastaufweitung nach
   * untern weiter geht. gehe hierfür in die grundlagen und versuche die
   * logik zu verstehen». Nach den Detailzeichnungen läuft das Rohr bei den
   * Typen mit Rohr bis weit ins Unterteil hinunter und ist an Rippen mit
   * Rohrdurchführung gehalten (ein Schnitt unten, zwei im Oberteil, einer
   * am Kopf); auf Rückfrage «Vier Stellen». Der Mastaufsatz dagegen ist
   * auf die Kopfplatte geflanscht und steckt gar nicht im Gitter.
   * `halter` führt die Höhen dieser Rippen ab Mastfuss; das Rohr läuft von
   * der untersten bis zum Kopf. Ohne Liste gilt wie bisher `innen` (zwei
   * Halte: Kopf und Kopf − innen). Was über dem Kopf oder unter null liegt,
   * ist ein Datenfehler und wird gemeldet, nicht still verworfen.
   */
  const hKopf = r6((Number(g.hUnten) || 0) + (Number(g.hOben) || 0));
  const halterRoh = Array.isArray(g.rohr?.halter) ? g.rohr.halter.map(Number).filter(Number.isFinite) : [];
  halterRoh.forEach((h) => {
    if (h <= 0 || h > hKopf + 1e-6) fehler.push(`Halterippe des Rohrs bei ${h} m liegt nicht im Gitter (0 … ${hKopf} m)`);
  });
  const halter = [...new Set(halterRoh.filter((h) => h > 0 && h <= hKopf + 1e-6).map(r6))].sort((p, q) => p - q);
  if (halter.length && Math.abs(halter[halter.length - 1] - hKopf) > 1e-6) halter.push(hKopf);
  /*
   * >>> ZWEI WANDDICKEN (4. Oktober). <<<
   * «verwende diese blechstärken beim rohr. der untere teil ist nicht so
   * stark wie der obere.» (Rohrkonstruktion der UL-Ausführung: unten
   * dünnwandig, oben dickwandig.) `tOben` gilt ab `wechsel` (Höhe über dem
   * Mastfuss) bis zum Rohrende; ohne Angabe durchgehend `t`.
   */
  const tOben = mm(g.rohr?.tOben);
  const wechsel = Number(g.rohr?.wechsel) || 0;
  const rohr = g.rohr?.d > 0 ? { d: mm(g.rohr.d), t: mm(g.rohr.t),
    frei: Number(g.rohr.frei) || 0,
    innen: halter.length > 1 ? r6(hKopf - halter[0]) : Number(g.rohr.innen) || 0,
    halter: halter.length > 1 ? halter : null,
    tOben: tOben > 0 && wechsel > 0 ? tOben : null, wechsel: tOben > 0 && wechsel > 0 ? wechsel : null } : null;
  if (rohr && tOben > 0 && !(wechsel > 0)) fehler.push('Rohr: Wanddicke oben ohne Höhe des Wechsels');
  // Der Mastaufsatz (Quadratrohr auf dem Kopf verschraubt) - statt des Rohrs.
  const aufsatz = g.aufsatz?.a > 0 ? { a: mm(g.aufsatz.a), t: mm(g.aufsatz.t),
    laenge: Number(g.aufsatz.laenge) || 0 } : null;
  // Was über dem Kopf des Gitters steht: Rohr oder Aufsatz, mit Querschnitt.
  const oben = rohr ? { art: 'rohr', ...rohrWerte(rohr.d, rohr.t), laenge: rohr.frei, innen: rohr.innen,
                        halter: rohr.halter,
                        oberer: rohr.tOben ? rohrWerte(rohr.d, rohr.tOben) : null, wechsel: rohr.wechsel }
    : aufsatz ? { art: 'aufsatz', ...kastenWerte(aufsatz.a, aufsatz.t), laenge: aufsatz.laenge, innen: 0 }
    : null;
  return { typ: g.typ, quelle: g.quelle ?? null, hUnten: Number(g.hUnten), hOben: Number(g.hOben),
           hoehe, laenge: r6(hoehe + (oben?.laenge ?? 0)),
           gurtUnten: g.gurtUnten, gurtOben: g.gurtOben, winkelUnten: wU, winkelOben: wO,
           stationen, rohr, aufsatz, oben, windJeFlaeche: g.windJeFlaeche ?? null, fehler };
}

/* ===========================================================================
 * >>> WIND AUF DEN GITTERMAST: DIE BETREIBERWERTE DER TRAGJOCHE, ÜBERTRAGEN. <<<
 * =========================================================================
 *
 * Weisung 3. Oktober (dritte am selben Tag, sie gilt): «die betreiberwerte
 * beibehalten und diese auf den gittermasten übertragen in anlehnung der
 * windangriffsfläche pro m1 die normwerte verwerfen, diese werde ich selbst
 * prüfen».
 *
 * Die Tabelle des Betreibers führt die Windlast der Tragjoche je Meter. Auf
 * ihre WINDANGRIFFSFLÄCHE je Meter bezogen (die Stäbe einer Seite: zwei
 * stehende Gurtschenkel + Vertikalbleche) ergibt sich eine Last je m²
 * Angriffsfläche; ihr Mittel über die Jochtypen steht im Sortiment der
 * Gittermasten (`windJeFlaeche`, je Einwirkungsklasse). Der Gittermast
 * bekommt
 *
 *     w(z) = windJeFlaeche · A_s(z)      [kN/m]
 *
 * mit seiner eigenen Angriffsfläche auf der Höhe z: die beiden Gurtschenkel
 * der Seite quer zum Wind + ihre Bindebleche, höchstens die volle Breite.
 * Über dem Kopf zählt der Durchmesser des Rohrs bzw. die Kante des
 * Aufsatzes. Kein Normbeiwert - die Herleitung nach der Norm für
 * Gittertragwerke (vom selben Tag) ist verworfen.
 * ========================================================================= */

/**
 * Windangriffsfläche je Meter [m²/m] auf der Höhe z, für Wind in Richtung
 * `richtung` ('a' oder 'b'): er trifft die Seite, die quer dazu liegt.
 * @returns {{cA:number, As:number, phi:number, breite:number}}  cA = As
 */
export function gitterWindflaeche(G, z, richtung = 'a') {
  const st = G.stationen;
  const oben = z > G.hUnten + 1e-9;
  const w = oben ? G.winkelOben : G.winkelUnten;
  // Seite quer zum Wind: bei Wind in a läuft sie in b.
  const quer = richtung === 'a' ? 'b' : 'a';
  let s = st[st.length - 1];
  for (let i = 1; i < st.length; i += 1) {
    if (z <= st[i].z + 1e-9) {
      const t = (z - st[i - 1].z) / ((st[i].z - st[i - 1].z) || 1);
      s = { a: st[i - 1].a + (st[i].a - st[i - 1].a) * t, b: st[i - 1].b + (st[i].b - st[i - 1].b) * t };
      break;
    }
  }
  const breite = s[quer];
  const schenkel = ((quer === 'a' ? w?.aH : w?.aV) ?? 0) / 1000;
  // Bindebleche dieser Seite, über die Höhe ihres Mastteils verteilt.
  const teil = st.filter((x) => x.blech && (x.teil === 'oben') === oben);
  const hTeil = oben ? G.hOben : G.hUnten;
  const bleche = hTeil > 0 ? teil.reduce((a, x) =>
    a + x.blech.b * Math.max(0, quer === 'a' ? x.blech.la : x.blech.lb), 0) / hTeil : 0;
  const As = Math.min(breite, 2 * schenkel + bleche);
  return { cA: As, As, phi: breite > 0 ? As / breite : 1, breite };
}

/*
 * >>> DAS GRÖSSTE ÜBER DIE HÖHE (7. Oktober). <<< Gemeldet mit Bild: «ein
 * gittermast i 30 ist asymetrisch in der grundform die windlasten sind hier
 * die gleichen in x und y. ist bei allen gittermasten zu checken.» Das
 * Stabwerk rechnet je Höhe mit der Fläche dieser Höhe (I 30: Wind in a
 * 0.155, in b 0.232 m²/m im Unterteil) - die Maske zeigte aber den Wert am
 * KOPF, und dort ist der I 30 quadratisch (0.161 / 0.161). Das Ersatzprofil
 * führt jetzt je Richtung das Grösste über die Höhe: die Maske zeigt den
 * Unterschied, der vorläufige Kern liegt auf der sicheren Seite, und das
 * Stabwerk skaliert je Höhe auf denselben Bezug (Ergebnis unverändert).
 */
export function gitterWindflaecheMax(G, richtung = 'a') {
  const zs = [...new Set([...(G.stationen ?? []).map((s) => s.z), G.hUnten - 1e-6, G.hoehe])]
    .filter((z) => Number.isFinite(z) && z >= 0 && z <= G.hoehe + 1e-9);
  return Math.max(0, ...zs.map((z) => gitterWindflaeche(G, z, richtung).cA));
}

/**
 * >>> DAS ROHR: FAKTOR 1.2 AUF DEN DURCHMESSER (3. Oktober). <<<
 * Weisung: «für rohre den faktor 1.2 ansetzen bezüglich des durchmessers.
 * der ansatz mit der völligkeit pro laufmeter passt, so festhalten in der
 * app für die nachvollziehbarkeit.» Also w = 1.2 · q · d mit dem Staudruck
 * q der Einwirkungsklasse (`windStaudruck` im Sortiment). Der Mastaufsatz
 * (Quadratrohr, kein Rundrohr) bleibt bei der Last je m² Angriffsfläche
 * auf seine Kante.
 */
export const ROHR_FAKTOR = 1.2;

/**
 * Einheitswind je m² Windangriffsfläche des Gitters [kN/m²].
 *
 * >>> AUS DER HEUTIGEN LOGIK UMGERECHNET (8. Oktober). <<< Weisung: «Für die
 * Gittermasten ist auf der heutigen logik heraus die umrechnung auf den
 * einheitswind vorzunehmen». Die Logik für EK1-EK3 ist: Windlast je Meter
 * des Tragjochs / seine Windangriffsfläche, Mittel über J60-J130. Dieselbe
 * Rechnung mit dem Einheitswind der Tragjoche (Mast-Mappe, `wind/1.0`) gibt
 * den Wert `windJeFlaeche/EK0` des Sortiments. Ohne Eintrag (älteres
 * Datenpaket) bleibt 1.0 kN/m² mit der hinteren Ebene 25 % (7. Oktober).
 */
export const gitterEinheitJeFlaeche = (g) =>
  (Number(g?.windJeFlaeche?.[EINHEIT_EK]) > 0 ? Number(g.windJeFlaeche[EINHEIT_EK]) : EINHEIT_Q * EINHEIT_EBENEN);

/** Windlast über dem Kopf [kN/m] je Einwirkungsklasse: Rohr bzw. Aufsatz. */
export function gitterWindOben(G, g, ek) {
  if (!G.oben) return 0;
  // Einheitswind (alte Norm): 1.0 kN/m² auf den Durchmesser bzw. die Kante, ohne Beiwert.
  if (ek === EINHEIT_EK) return EINHEIT_Q * (G.oben.art === 'rohr' ? G.oben.d : G.oben.a);
  if (G.oben.art === 'rohr') return ROHR_FAKTOR * (Number(g.windStaudruck?.[ek]) || 0) * G.oben.d;
  return (Number(g.windJeFlaeche?.[ek]) || 0) * G.oben.a;
}

/**
 * Die Herleitung des Winds am Gittermast, zum Nachvollziehen (Profilblatt,
 * Prüfstand): je Stelle und Richtung Angriffsfläche, Völligkeit und Last.
 */
export function gitterWindHerleitung(typ) {
  const g = typeof typ === 'string' ? getGittermast(typ) : typ;
  const G = gittermastGeometrie(g);
  const eks = ['EK1', 'EK2', 'EK3'];
  const stellen = [['Fuss', Math.min(0.3, G.hUnten)], ['unter dem Knick', G.hUnten - 0.05],
                   ['Kopf', G.hoehe]];
  const zeilen = [];
  stellen.forEach(([name, z]) => ['a', 'b'].forEach((r) => {
    const f = gitterWindflaeche(G, z, r);
    zeilen.push({ stelle: name, z, richtung: r, As: f.As, breite: f.breite, phi: f.phi,
      w: { ...Object.fromEntries(eks.map((ek) => [ek, (Number(g.windJeFlaeche?.[ek]) || 0) * f.As])),
           [EINHEIT_EK]: gitterEinheitJeFlaeche(g) * f.As } });
  }));
  return { typ: g.typ, jeFlaeche: g.windJeFlaeche ?? null, staudruck: g.windStaudruck ?? null,
           zeilen, oben: G.oben ? { art: G.oben.art, mass: G.oben.d ?? G.oben.a,
             w: Object.fromEntries([...eks, EINHEIT_EK].map((ek) => [ek, gitterWindOben(G, g, ek)])) } : null };
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
 *   wind      Windlast am Kopf des Gitters [kN/m]: die Betreiberwerte der
 *             Tragjoche, auf die Windangriffsfläche übertragen
 *             (`gitterWindflaeche`); das Stabwerk setzt je Abschnitt die
 *             Fläche seiner Höhe an, am Rohr den Durchmesser
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
  // Wind am KOPF des Gitters [kN/m]: Last je m² Angriffsfläche × A_s (siehe
  // gitterWindflaeche); das Stabwerk setzt je Abschnitt die Fläche seiner Höhe an.
  const druck = g.windJeFlaeche ?? null;
  const je = (richtung) => (druck ? Object.fromEntries(['EK1', 'EK2', 'EK3', EINHEIT_EK]
    // Einheitswind: aus den Tragjochen umgerechnet (8. Oktober, gitterEinheitJeFlaeche).
    .map((ek) => [ek, Math.round((ek === EINHEIT_EK ? gitterEinheitJeFlaeche(g) : (Number(druck[ek]) || 0))
      * gitterWindflaecheMax(G, richtung) * 1000) / 1000])) : null);
  const p = {
    name: GITTER_PRAEFIX + g.typ, gitter: g.typ, h, b,
    A, Iy, Iz, Wy: Iy / (h / 20), Wz: Iz / (b / 20),
    iy: Math.sqrt(Iy / A), iz: Math.sqrt(Iz / A),
    Wply: Iy / (h / 20), Wplz: Iz / (b / 20),             // elastisch, kein plastischer Zuschlag
    It: 4 * ((w.aH + w.aV - w.t) * w.t ** 3 / 3) / 1e4,   // mm⁴ -> cm⁴, vier offene Winkel
    g: Number(g.gewicht) > 0 ? Math.round(g.gewicht / G.hoehe * 10) / 10 : Math.round(4 * w.g * 1.25 * 10) / 10,
    laenge: G.laenge, hoehe: G.hoehe,
    // «quer» = Wind in der Jochachse bei a in der Jochachse: er trifft die Seite b.
    // «quer» = Wind in der Jochachse bei a in der Jochachse: Wind in Richtung a.
    wind: druck ? { quer: je('a'), laengs: je('b') } : null,
    // Über dem Kopf (Rohr: 1.2 · q · d; Aufsatz: Last je m² × Kante) [kN/m].
    windOben: Object.fromEntries(['EK1', 'EK2', 'EK3', EINHEIT_EK]
      .map((ek) => [ek, Math.round(gitterWindOben(G, g, ek) * 1000) / 1000])),
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
