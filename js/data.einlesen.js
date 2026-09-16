/**
 * data.einlesen.js
 * ---------------------------------------------------------------------------
 * BAUTEILDATEN EINLESEN - aus Excel oder JSON, mit Abgleich und Vorschau.
 *
 * Weisung vom 16. September: «den import auch umsetzen», auf Rückfrage
 * entschieden: ABGLEICH MIT VORSCHAU. Eingelesen wird, geprüft wird, dann
 * zeigt die Anwendung je Satz, was neu, was geändert, was entfernt ist - und
 * übernommen wird erst auf Bestätigung.
 *
 * >>> DREI ARTEN VON DATEIEN. <<<
 *
 *   Excel      die Mappe aus «Alle Tabellen als Excel», bearbeitet. Das Blatt
 *              «Übersicht» sagt, welches Blatt welche Tabelle trägt und in
 *              welcher Zeile die Spaltenpfade stehen.
 *   JSON       eine Datendatei in Tabellenform (data/<sortiment>.json), eine
 *              in der alten Baumform, oder ein ganzes Datenpaket.
 *
 * >>> WAS EINE LEERE EXCEL-ZELLE HEISST. <<<
 *
 * Excel kennt kein null. Beim Abgleich gilt deshalb: eine leere Zelle, wo
 * vorher null stand, ist KEINE Änderung. Eine leere Zelle, wo vorher ein
 * Wert stand, heisst «kein Wert» und wird zu null. Ein neuer Satz bekommt
 * für leere Zellen gar kein Feld. So übersteht eine unveränderte Mappe den
 * Hin- und Rückweg ohne eine einzige gemeldete Änderung.
 *
 * >>> GEPRUEFTE SAETZE WERDEN EIGENS GENANNT. <<<
 *
 * Die stehende Vorgabe lautet, die Geometrie der Jochträger im Detail zu
 * übernehmen. Ändert eine Datei einen Satz, der als geprüft vermerkt ist -
 * oder eines seiner Bleche -, steht das in der Vorschau obenan. Verboten
 * wird es nicht: wer die Daten pflegt, darf sie berichtigen. Aber es
 * geschieht nicht unbemerkt.
 * ---------------------------------------------------------------------------
 */

import { SORTIMENTE, AUFBAU, zerlege, setzeZusammen, istTabellenform,
         tabellenVon, zelleEin, TABELLEN_FORMAT, TABELLEN_VERSION,
         alsDateitext } from './data.tabellen.js';
import { tabellenKatalog, pruefeTabellen } from './data.katalog.js';
import { leseMappe } from './export.xlsx.js';

/* ===========================================================================
 * >>> ERKENNEN UND LESEN. <<<
 * ========================================================================= */

/** Das Sortiment einer Baumform-Datei - erst am Namen, dann am Inhalt. */
function sortimentVon(name, obj) {
  const stamm = String(name ?? '').replace(/^.*[\\/]/, '').replace(/\.json$/i, '');
  if (SORTIMENTE.includes(stamm)) return stamm;
  if (Array.isArray(obj?.winkelprofile)) return 'normen';
  if (Array.isArray(obj?.bauteile)) return 'fl_bauteile';
  if (Array.isArray(obj?.vorlagen)) return 'anbauteile';
  const t = obj?.typen?.[0];
  if (!t) return null;
  if ('jd' in t || obj.masstabelle) return 'tragjoche';
  if ('laengen' in t || 'masse' in t) return 'abfangjoche';
  if ('art' in t) return 'anker';
  if ('wind' in t && 'profil' in t) return 'masten';
  return null;
}

/**
 * Eine Excel-Mappe der Bauteildaten in Tabellen zurückverwandeln.
 *
 * DAS BLATT «UEBERSICHT» IST DER SCHLUESSEL. Es nennt je Blatt Sortiment,
 * Tabelle und die Zeile mit den Spaltenpfaden. Eine Mappe ohne dieses Blatt
 * stammt nicht aus der Ausleitung - dann wird nichts geraten.
 */
export function ausMappe(blaetter) {
  const ueb = blaetter.find((b) => b.zeilen.some((z) =>
    z[0] === 'Blatt' && z[1] === 'Sortiment' && z[2] === 'Tabelle'));
  if (!ueb) {
    throw new Error('Die Mappe hat kein Blatt «Übersicht» mit den Spalten '
                  + 'Blatt · Sortiment · Tabelle. Eingelesen werden nur Mappen '
                  + 'aus «Alle Tabellen als Excel».');
  }
  const kopf = ueb.zeilen.findIndex((z) => z[0] === 'Blatt' && z[1] === 'Sortiment');
  const spalte = (n) => ueb.zeilen[kopf].indexOf(n);
  const sBlatt = spalte('Blatt'), sSort = spalte('Sortiment');
  const sTab = spalte('Tabelle'), sPfad = spalte('Pfadzeile');
  const teile = {};
  const hinweise = [];
  for (const z of ueb.zeilen.slice(kopf + 1)) {
    const name = z[sBlatt];
    const db = z[sSort];
    const tabelle = z[sTab];
    if (!name || !db || !tabelle) continue;
    if (!SORTIMENTE.includes(db)) {
      hinweise.push(`Blatt «${name}»: unbekanntes Sortiment «${db}» - übergangen.`);
      continue;
    }
    const b = blaetter.find((x) => x.name === name);
    if (!b) {
      hinweise.push(`Blatt «${name}» fehlt in der Mappe - «${tabelle}» bleibt, wie sie ist.`);
      continue;
    }
    const pz = Number(z[sPfad]) - 1;
    const pfade = b.zeilen[pz] ?? [];
    if (!pfade.some((p) => typeof p === 'string' && p)) {
      throw new Error(`Blatt «${name}»: in Zeile ${pz + 1} stehen keine Spaltenpfade.`);
    }
    const zeilen = [];
    for (const r of b.zeilen.slice(pz + 1)) {
      const o = {};
      let belegt = false;
      pfade.forEach((p, i) => {
        if (typeof p !== 'string' || !p) return;
        const v = zelleEin(r[i]);
        if (v === undefined) return;
        o[p] = v;
        belegt = true;
      });
      if (belegt) zeilen.push(o);
    }
    teile[db] ??= { format: TABELLEN_FORMAT, version: TABELLEN_VERSION,
                    sortiment: db, tabellen: {}, angaben: undefined,
                    _vorhanden: new Set() };
    teile[db]._vorhanden.add(tabelle);
    if (tabelle === 'angaben') teile[db].angaben = zeilen;
    else teile[db].tabellen[tabelle] = zeilen;
  }
  return { teile, hinweise };
}

/**
 * Eine Datei lesen - Excel oder JSON.
 *
 * @param {string} name       Dateiname
 * @param {Uint8Array} bytes
 * @returns {Promise<{quelle:'excel'|'json', teile:object, hinweise:string[]}>}
 *          `teile` je Sortiment in Tabellenform; `_vorhanden` nennt die
 *          Tabellen, die die Datei wirklich trägt (fehlende bleiben stehen)
 */
export async function leseDatei(name, bytes) {
  const istZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (istZip) {
    const { teile, hinweise } = ausMappe(await leseMappe(bytes));
    if (!Object.keys(teile).length) {
      throw new Error('Die Mappe trägt keine Tabelle, die sich zuordnen lässt.');
    }
    return { quelle: 'excel', teile, hinweise };
  }
  let obj;
  try {
    obj = JSON.parse(new TextDecoder().decode(bytes).replace(/^\uFEFF/, ''));
  } catch (e) {
    throw new Error(`Die Datei ist weder eine Excel-Mappe noch lesbares JSON (${e.message}).`);
  }
  const alle = (tab) => ({ ...tab, _vorhanden: new Set([
    ...Object.keys(tab.tabellen ?? {}), ...(tab.angaben ? ['angaben'] : [])]) });
  const teile = {};
  const hinweise = [];
  if (istTabellenform(obj)) {
    if (!SORTIMENTE.includes(obj.sortiment)) {
      throw new Error(`Unbekanntes Sortiment «${obj.sortiment}».`);
    }
    teile[obj.sortiment] = alle(obj);
  } else if (obj?.format === 'tragjoch-daten') {
    for (const db of SORTIMENTE) {
      if (!obj[db]) continue;
      teile[db] = alle(istTabellenform(obj[db]) ? obj[db] : zerlege(db, obj[db]));
    }
    hinweise.push('Datenpaket: eingelesen werden die Teile, die es trägt.');
  } else {
    const db = sortimentVon(name, obj);
    if (!db) {
      throw new Error('Das JSON lässt sich keinem Sortiment zuordnen. Erwartet '
                    + `wird eine Datei wie data/tragjoche.json (Sortimente: ${SORTIMENTE.join(', ')}).`);
    }
    teile[db] = alle(zerlege(db, obj));
    hinweise.push(`Baumform erkannt, als «${AUFBAU[db].titel}» gelesen.`);
  }
  if (!Object.keys(teile).length) throw new Error('Die Datei trägt keine Bauteildaten.');
  return { quelle: 'json', teile, hinweise };
}

/* ===========================================================================
 * >>> DER ABGLEICH. <<<
 * ========================================================================= */

const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Der Schlüssel einer Zeile, bei Doppelten mit laufender Nummer. */
function schluessel(zeilen, spalten) {
  const zaehler = new Map();
  return zeilen.map((z) => {
    const basis = JSON.stringify(spalten.map((k) => z[k] ?? null));
    const n = (zaehler.get(basis) ?? 0) + 1;
    zaehler.set(basis, n);
    return n > 1 ? `${basis}#${n}` : basis;
  });
}

/** Ist ein Haupt-Satz als geprüft vermerkt? */
const geprueft = (z) => z?.geprueft === true
  || (typeof z?.geprueft === 'string' && z.geprueft.trim() !== '');

/**
 * Den eingelesenen Stand eines Sortiments mit dem geltenden abgleichen.
 *
 * @param {string} db
 * @param {object} alt    geltender Stand, Tabellenform
 * @param {object} neu    eingelesener Stand, Tabellenform (mit `_vorhanden`)
 * @param {{ausExcel?: boolean}} opt
 * @returns {{db, tabellen: object[], ergebnis: object, geprueft: string[],
 *           aenderungen: number, pruefung: object}}
 */
export function abgleich(db, alt, neu, { ausExcel = false } = {}) {
  const kat = tabellenKatalog(db);
  const flach = tabellenVon(db);
  const ergebnis = { format: TABELLEN_FORMAT, version: TABELLEN_VERSION,
                     sortiment: db, tabellen: {}, angaben: [] };
  const tabellen = [];
  const betroffen = new Set();                 // Schlüssel geänderter Hauptsätze
  let aenderungen = 0;

  for (const t of kat) {
    const istAng = t.name === 'angaben';
    const altZ = (istAng ? alt.angaben : alt.tabellen?.[t.name]) ?? [];
    const vorhanden = neu._vorhanden ? neu._vorhanden.has(t.name)
      : (istAng ? Array.isArray(neu.angaben) : t.name in (neu.tabellen ?? {}));
    const eintrag = { name: t.name, titel: t.titel, neu: [], entfernt: [],
                      geaendert: [], gleich: 0, uebernommen: !vorhanden };
    let zeilen;
    if (!vorhanden) {
      zeilen = altZ;
    } else {
      const neuZ = (istAng ? neu.angaben : neu.tabellen?.[t.name]) ?? [];
      const spalten = t.schluesselSpalten;
      const kAlt = schluessel(altZ, spalten);
      const kNeu = schluessel(neuZ, spalten);
      const altNach = new Map(kAlt.map((k, i) => [k, altZ[i]]));
      zeilen = neuZ.map((z, i) => {
        const a = altNach.get(kNeu[i]);
        if (!a) { eintrag.neu.push({ id: kNeu[i], zeile: z }); return z; }
        altNach.delete(kNeu[i]);
        const m = { ...z };
        if (ausExcel) {
          /*
           * Eine leere Zelle wird null: wo vorher null stand, ist das keine
           * Änderung; wo ein Wert stand, heisst es «kein Wert».
           */
          for (const k of Object.keys(a)) if (!(k in m)) m[k] = null;
        }
        const felder = [];
        for (const k of new Set([...Object.keys(a), ...Object.keys(m)])) {
          if (!gleich(a[k], m[k])) felder.push({ pfad: k, alt: a[k], neu: m[k] });
        }
        if (felder.length) eintrag.geaendert.push({ id: kNeu[i], zeile: m, felder });
        else eintrag.gleich += 1;
        // Die Reihenfolge der Schlüssel bleibt die alte, wo es geht
        const ord = {};
        for (const k of Object.keys(a)) if (k in m) ord[k] = m[k];
        for (const k of Object.keys(m)) if (!(k in ord)) ord[k] = m[k];
        return ord;
      });
      for (const [k, a] of altNach) eintrag.entfernt.push({ id: k, zeile: a });
    }
    const n = eintrag.neu.length + eintrag.entfernt.length + eintrag.geaendert.length;
    aenderungen += n;
    // Welche Hauptsätze berührt sind - für den Vermerk «geprüft»
    if (n) {
      const spec = flach.find((x) => x.name === t.name);
      const haupt = spec?.haupt ? spec : flach.find((x) => x.haupt
        && (x.name === rootVon(flach, spec)));
      if (haupt) {
        for (const e of [...eintrag.neu, ...eintrag.entfernt, ...eintrag.geaendert]) {
          const k = e.zeile?.[haupt.schluessel];
          if (k !== undefined) betroffen.add(`${haupt.name}\u0000${k}`);
        }
      }
    }
    if (istAng) ergebnis.angaben = zeilen;
    else ergebnis.tabellen[t.name] = zeilen;
    tabellen.push(eintrag);
  }

  // Geprüfte Sätze, die sich ändern - im alten ODER im neuen Stand geprüft
  const gepruefteNamen = [];
  for (const h of flach.filter((x) => x.haupt)) {
    const alle = [...(alt.tabellen?.[h.name] ?? []), ...(ergebnis.tabellen[h.name] ?? [])];
    for (const z of alle) {
      const k = z[h.schluessel];
      if (geprueft(z) && betroffen.has(`${h.name}\u0000${k}`)
          && !gepruefteNamen.includes(k)) {
        gepruefteNamen.push(k);
      }
    }
  }

  const pruefung = pruefeTabellen(db, ergebnis);
  // Lässt sich der Stand zusammensetzen? Eine Waise bricht hier ab.
  try { setzeZusammen(ergebnis); } catch (e) {
    pruefung.ok = false;
    pruefung.fehler.push(e.message);
  }
  return { db, titel: AUFBAU[db].titel, tabellen, ergebnis,
           geprueft: gepruefteNamen, aenderungen, pruefung };
}

/** Die Haupttabelle über einer Untertabelle. */
function rootVon(flach, spec) {
  let s = spec;
  while (s?.eltern) s = flach.find((x) => x.name === s.eltern);
  return s?.name;
}

/* ===========================================================================
 * >>> DER EINGELESENE STAND IM BROWSER. <<<
 * ===========================================================================
 *
 * Übernommen wird, indem der Stand im Browser hinterlegt und die Anwendung
 * neu gestartet wird. Beim Start legt er sich über die Dateien - SICHTBAR:
 * das Fenster der Bauteildaten sagt, dass ein eingelesener Stand gilt, seit
 * wann und für welche Sortimente, und bietet an, ihn als Dateien zu sichern
 * oder zu verwerfen.
 *
 * Warum nicht einfach das Datenpaket? Das Paket greift nur, wenn neben der
 * Anwendung KEINE Dateien liegen. Ein eingelesener Stand, der beim nächsten
 * Start still von den Dateien überdeckt würde, wäre ein Verlust ohne
 * Meldung.
 * ========================================================================= */
const SPEICHER = 'tragjoch-eingelesen-v1';

export function eingelesenSpeichern(teile, quelle = '') {
  const stand = { stand: new Date().toISOString(), quelle, teile };
  localStorage.setItem(SPEICHER, JSON.stringify(stand));
  return stand;
}

export function eingelesen() {
  try {
    const roh = localStorage.getItem(SPEICHER);
    return roh ? JSON.parse(roh) : null;
  } catch { return null; }
}

export function eingelesenVerwerfen() {
  try { localStorage.removeItem(SPEICHER); return true; } catch { return false; }
}

/**
 * Den hinterlegten Stand anwenden.
 *
 * @param {Object<string, Function>} setzer  je Sortiment die Setzfunktion
 * @returns {{angewendet: string[], fehler: string[]}}
 */
export function eingelesenAnwenden(setzer) {
  const e = eingelesen();
  const aus = { angewendet: [], fehler: [], stand: e?.stand ?? null };
  if (!e?.teile) return aus;
  for (const [db, tab] of Object.entries(e.teile)) {
    try {
      const p = pruefeTabellen(db, tab);
      if (!p.ok) throw new Error(p.fehler.slice(0, 3).join(' '));
      setzer[db](setzeZusammen(tab));
      aus.angewendet.push(db);
    } catch (err) {
      aus.fehler.push(`${AUFBAU[db]?.titel ?? db}: ${err.message}`);
    }
  }
  return aus;
}

/** Ein Sortiment als Dateitext - zum Sichern als data/<db>.json. */
export const alsDatei = (tab) => alsDateitext({
  format: tab.format, version: tab.version, sortiment: tab.sortiment,
  tabellen: tab.tabellen, angaben: tab.angaben ?? [],
});
