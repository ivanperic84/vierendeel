/**
 * core.blechregel.js
 * ---------------------------------------------------------------------------
 * DIE REGEL DER BLECHEINTEILUNG - sichtbar gemacht und geprüft.
 *
 * Weisung vom 16. September: «ist es möglich … eine logik der blech
 * einteilung zu erstellen?» Auf Rückfrage entschieden: die Regel wird
 * SICHTBAR GEMACHT UND GEPRUEFT. Sie erzeugt keine Geometrie.
 *
 * >>> DIE REGEL GAB ES SCHON - SIE STAND NUR NIRGENDS BEISAMMEN. <<<
 *
 * Beim Tragjoch entsteht die Einteilung aus drei Dingen, und alle drei
 * stehen in den Daten:
 *
 *   1. ENDFELD      `teilung` des Typs - Jochende bis erstes Blech (750 mm)
 *   2. FELDWEITEN   die Masstabelle je Jochlänge, A_1 in Jochmitte,
 *                   L = 2·750 + 2·ΣA. Fehlt die Zeile, wird der Bereich
 *                   zwischen den Endfeldern gleichmässig geteilt.
 *   3. STAFFELUNG   welches Blech an welcher Station liegt, vom Auflager zur
 *                   Feldmitte, symmetrisch; die letzte Stufe gilt bis zur
 *                   Mitte. Die Altbauweise führt je Längenbereich eine
 *                   eigene Staffelung (Ausführung).
 *
 * Beim Abfangjoch: Randmasse an beiden Enden, dazwischen die Masstabelle
 * des Schemablatts (A_1, Regelfeld A, Vierendeel-Bereiche QV), an den
 * Bereichsgrenzen Quersteifen statt Blechen.
 *
 * >>> DIESES MODUL RECHNET NICHTS SELBST. <<<
 *
 * Es ruft genau die Funktionen auf, mit denen der Rechenkern die Stationen
 * legt - `knotenraster`, `blechAnStation`, `abfangBlechstationen`. Eine
 * eigene Herleitung wäre eine zweite Wahrheit, und die stehende Vorgabe
 * verbietet ohnehin, die Einteilung anzupassen. Was hier steht, ist also
 * GENAU die Einteilung, mit der gerechnet wird.
 *
 * >>> WAS GEPRUEFT WIRD. <<<
 *
 * Ob die Daten mit sich selbst zusammenpassen: jede Blech-Pos. der
 * Staffelung gibt es; die offene Stufe steht am Schluss; die festen Stufen
 * reichen nicht über die Feldmitte; die Ausführungen decken den
 * Längenbereich ohne Lücke; die Masstabelle geht auf; beim Abfangjoch
 * nennen Schema und Stückliste dieselbe Blechzahl.
 *
 * Ein Befund ist eine AUSKUNFT, keine Korrektur. Berichtigt wird in den
 * Daten - vom Auftraggeber.
 * ---------------------------------------------------------------------------
 */

import { knotenraster } from './core.statics.js';
import { abstaendeFuer, masstabelleZeile, blechAnStation, hatBleche,
         teilung, moeglicheLaengen, laengenbereich, ausfuehrungFuer,
         tragjoche } from './data.tragjoche.js';
import { abfangBlechstationen } from './core.abfangjoch.js';
import { abfangjoche, abfangLaengen } from './data.abfangjoche.js';

const EBENEN = ['vertikal', 'horizontal'];
const r3 = (x) => Math.round(x * 1000) / 1000;

/* ===========================================================================
 * >>> DIE EINTEILUNG EINES TRAGJOCHS. <<<
 * ========================================================================= */

/**
 * Die Stationen eines Tragjochs bei der Länge L - wie der Rechenkern sie
 * legt, mit dem Blech jeder Ebene.
 *
 * @param {object} joch  Typ aus der Datenbank
 * @param {number} L     Jochlänge [m]
 */
export function einteilung(joch, L) {
  const a1 = teilung(joch) / 1000;
  const abst = abstaendeFuer(joch, L);
  const zeile = masstabelleZeile(L);
  const xs = knotenraster(L, a1, abst);
  const n = xs.length;
  const mitBlechen = hatBleche(joch);
  const stationen = xs.map((x, i) => ({
    nr: i + 1,
    x: r3(x),
    feld: i ? r3(x - xs[i - 1]) : null,
    vomAuflager: Math.min(i, n - 1 - i) + 1,
    vertikal: mitBlechen ? blechAnStation(joch, 'vertikal', i, n, L) : null,
    horizontal: mitBlechen ? blechAnStation(joch, 'horizontal', i, n, L) : null,
  }));

  // Stückzahl je Position - so steht es in einer Stückliste
  const stueck = {};
  for (const e of EBENEN) {
    const z = {};
    for (const s of stationen) {
      const b = s[e];
      if (b) z[b.pos] = (z[b.pos] ?? 0) + 1;
    }
    stueck[e] = z;
  }

  return {
    typ: joch.typ,
    L,
    endfeld: a1,
    quelle: abst ? 'masstabelle' : 'gleichmaessig',
    masstabelle: zeile,
    ausfuehrung: ausfuehrungFuer(joch, L)?.bez ?? null,
    mitBlechen,
    stationen,
    anzahl: n,
    stueck,
    /*
     * GERADE FELDZAHL: die Zeichnung schreibt dann das mittlere Feld als
     * zwei halbe A_1, und in Jochmitte steht kein Blech (knotenraster).
     */
    mitteOhneBlech: n % 2 === 0,
  };
}

/* ===========================================================================
 * >>> DIE PRUEFUNG EINES TRAGJOCHTYPS. <<<
 * ===========================================================================
 *
 * Drei Schweregrade:
 *   fehler    die Daten widersprechen sich - ein Blech der Staffelung fehlt,
 *             die offene Stufe steht nicht am Schluss
 *   warnung   die Einteilung wird bei einer Länge nicht so, wie die Daten
 *             es erwarten lassen - etwa weil die Staffelung über die
 *             Feldmitte reicht
 *   hinweis   was man wissen sollte, ohne dass etwas falsch ist - keine
 *             Bleche hinterlegt, Länge ohne Masstabellenzeile
 * ========================================================================= */

function pruefeStaffel(joch, st, wo, aus) {
  for (const e of EBENEN) {
    const stufen = st?.[e];
    if (!Array.isArray(stufen) || !stufen.length) {
      aus.fehler.push(`${wo}: keine Staffelung für die ${e}e Ebene.`);
      continue;
    }
    const bleche = joch.bleche?.[e] ?? [];
    stufen.forEach((s, k) => {
      if (s.pos !== null && s.pos !== undefined
          && !bleche.some((b) => b.pos === s.pos)) {
        aus.fehler.push(`${wo}, ${e}, Stufe ${k + 1}: Blech Pos. ${s.pos} ist `
                      + 'nicht hinterlegt.');
      }
    });
    const offen = stufen.map((s, k) => (s.anzahl === null
      || s.anzahl === undefined ? k : -1)).filter((k) => k >= 0);
    if (!offen.length) {
      aus.warnung.push(`${wo}, ${e}: keine offene Stufe - die letzte gilt `
                     + 'trotzdem bis zur Feldmitte.');
    } else if (offen.length > 1 || offen[0] !== stufen.length - 1) {
      aus.fehler.push(`${wo}, ${e}: die offene Stufe (ohne Anzahl) muss die `
                    + `letzte sein - sie steht an Stelle ${offen.map((k) => k + 1)
                      .join(', ')} von ${stufen.length}.`);
    }
  }
}

/** Die festen Stationen einer Staffelung, vom Auflager gezählt. */
const festeStationen = (stufen) => (stufen ?? [])
  .filter((s) => s.anzahl !== null && s.anzahl !== undefined)
  .reduce((a, s) => a + s.anzahl, 0);

/**
 * Einen Tragjochtyp prüfen, über alle Längen seines Bereichs.
 *
 * @returns {{typ, fehler: string[], warnung: string[], hinweis: string[],
 *           laengen: object[]}}
 */
export function pruefeTragjoch(joch) {
  const aus = { typ: joch.typ, fehler: [], warnung: [], hinweis: [], laengen: [] };
  const wo = joch.typ;

  if (!hatBleche(joch)) {
    aus.hinweis.push(`${wo}: keine Bindebleche oder keine Staffelung `
                   + 'hinterlegt - die Einteilung zeigt nur die Stationen.');
  } else {
    pruefeStaffel(joch, joch.staffelung, wo, aus);
    for (const a of joch.ausfuehrungen ?? []) {
      pruefeStaffel(joch, a.staffelung, `${wo} Ausführung ${a.bez}`, aus);
    }
    // Hinterlegte, aber nie verwendete Bleche
    for (const e of EBENEN) {
      const benutzt = new Set([joch.staffelung, ...(joch.ausfuehrungen ?? [])
        .map((a) => a.staffelung)]
        .flatMap((st) => (st?.[e] ?? []).map((s) => s.pos)));
      for (const b of joch.bleche?.[e] ?? []) {
        if (!benutzt.has(b.pos)) {
          aus.hinweis.push(`${wo}, ${e}: Blech Pos. ${b.pos} steht in keiner `
                         + 'Staffelung.');
        }
      }
      // Eine Position zweimal in derselben Ebene
      const pos = (joch.bleche?.[e] ?? []).map((b) => b.pos);
      const doppelt = pos.filter((p, i) => pos.indexOf(p) !== i);
      if (doppelt.length) {
        aus.fehler.push(`${wo}, ${e}: Blech Pos. ${[...new Set(doppelt)].join(', ')} `
                      + 'ist zweimal hinterlegt.');
      }
    }
  }

  // Die Ausführungen decken den Längenbereich
  const ausf = joch.ausfuehrungen ?? [];
  if (ausf.length) {
    const { min: lv, max: lb } = laengenbereich(joch);
    const geordnet = ausf.slice().sort((a, b) => a.l[0] - b.l[0]);
    for (let k = 1; k < geordnet.length; k++) {
      const vor = geordnet[k - 1].l[1];
      const nach = geordnet[k].l[0];
      if (nach > vor + 0.5 + 1e-9) {
        aus.warnung.push(`${wo}: zwischen Ausführung ${geordnet[k - 1].bez} und `
                       + `${geordnet[k].bez} fehlt der Bereich ${vor}–${nach} m.`);
      }
      if (nach <= vor - 1e-9) {
        aus.warnung.push(`${wo}: Ausführung ${geordnet[k - 1].bez} und `
                       + `${geordnet[k].bez} überschneiden sich (${nach}–${vor} m).`);
      }
    }
    if (Number.isFinite(lv) && geordnet[0].l[0] > lv + 1e-9) {
      aus.warnung.push(`${wo}: keine Ausführung für ${lv}–${geordnet[0].l[0]} m.`);
    }
    if (Number.isFinite(lb) && geordnet[geordnet.length - 1].l[1] < lb - 1e-9) {
      aus.warnung.push(`${wo}: keine Ausführung für `
                     + `${geordnet[geordnet.length - 1].l[1]}–${lb} m.`);
    }
  }

  // Jede Länge des Bereichs
  const ueberMitte = { vertikal: [], horizontal: [] };
  const ohneZeile = [];
  for (const { wert: L } of moeglicheLaengen(joch)) {
    const e = einteilung(joch, L);
    const halbe = Math.ceil(e.anzahl / 2);          // Stationen bis zur Mitte
    const befund = { L, anzahl: e.anzahl, quelle: e.quelle,
                     ausfuehrung: e.ausfuehrung, ueberMitte: [] };
    // Eine unschlüssige Zeile wird nicht verwendet; sie meldet die
    // Masstabelle selbst (pruefeMasstabelle), nicht jeder Typ.
    if (e.quelle !== 'masstabelle' && !(e.masstabelle && !e.masstabelle.gueltig)) {
      ohneZeile.push(L);
    }
    if (e.mitBlechen) {
      const aus2 = ausf.length ? ausfuehrungFuer(joch, L) : null;
      const st = aus2?.staffelung ?? joch.staffelung;
      for (const eb of EBENEN) {
        const fest = festeStationen(st?.[eb]);
        /*
         * REICHT DIE STAFFELUNG UEBER DIE FELDMITTE, kommt die offene Stufe
         * - das Feldblech - bei dieser Länge gar nicht vor. Das ist kein
         * Rechenfehler, aber ein Zeichen, dass die Staffelung für eine
         * andere Länge geschrieben wurde.
         */
        if (fest >= halbe) befund.ueberMitte.push(eb);
      }
    }
    for (const eb of befund.ueberMitte) ueberMitte[eb].push(L);
    aus.laengen.push(befund);
  }
  /*
   * >>> EIN HINWEIS, KEINE WARNUNG. <<<
   *
   * Dass bei einem kurzen Joch nur die kräftigen Auflagerbleche vorkommen,
   * kann gewollt sein. Belegt ist es nicht - die Zeichnung führt die
   * Staffelung für eine Länge, und bei den neuen J100 bis J130 ist sie als
   * ungeprüft vermerkt. Die Auskunft sagt, WO es so ist; ob es so sein soll,
   * entscheidet die Zeichnung.
   *
   * Liegt der Bereich im NORMBEREICH des Typs, wird daraus eine Warnung:
   * dort ist die Staffelung zu Hause, und dort sollte das Feldblech
   * vorkommen.
   */
  const norm = joch.laengeNorm;
  for (const eb of EBENEN) {
    const ls = ueberMitte[eb];
    if (!ls.length) continue;
    const pos = (() => {
      const st = joch.staffelung?.[eb] ?? [];
      return st[st.length - 1]?.pos ?? null;
    })();
    const ungeprueft = joch.staffelung_geprueft === false ? ' Die Staffelung ist als '
      + 'ungeprüft vermerkt.' : '';
    const text = `${wo}, ${eb}: die festen Stufen reichen bis zur Feldmitte bei `
      + `${kurzListe(ls)} m - das Feldblech${pos !== null ? ` Pos. ${pos}` : ''} `
      + `kommt dort nicht vor.${ungeprueft}`;
    const imNorm = Array.isArray(norm)
      && ls.some((L) => L >= norm[0] - 1e-9 && L <= norm[1] + 1e-9);
    (imNorm ? aus.warnung : aus.hinweis).push(imNorm
      ? `${text} Das betrifft den Normbereich ${norm[0]}–${norm[1]} m.` : text);
  }
  if (ohneZeile.length) {
    aus.hinweis.push(`${wo}: ohne Zeile in der Masstabelle, also gleichmässig `
      + `geteilt: ${kurzListe(ohneZeile)} m.`);
  }
  return aus;
}

/** Längen zusammenfassen: 8.00, 8.50, 9.00, 12.00 → «8.00–9.00, 12.00». */
function kurzListe(ls) {
  const s = ls.slice().sort((a, b) => a - b);
  const teile = [];
  let von = s[0];
  let bis = s[0];
  for (const x of s.slice(1)) {
    if (x - bis <= 0.5 + 1e-9) { bis = x; continue; }
    teile.push(von === bis ? von.toFixed(2) : `${von.toFixed(2)}–${bis.toFixed(2)}`);
    von = x; bis = x;
  }
  if (s.length) teile.push(von === bis ? von.toFixed(2) : `${von.toFixed(2)}–${bis.toFixed(2)}`);
  return teile.join(', ');
}

/* ===========================================================================
 * >>> DAS ABFANGJOCH. <<<
 * ========================================================================= */

/** Die Einteilung eines Abfangjochs bei einer geführten Länge. */
export function einteilungAbfang(typ, jt) {
  const b = abfangBlechstationen(typ, jt);
  if (!b) return null;
  const st = b.stationen;
  return {
    typ: typeof typ === 'string' ? typ : typ.typ,
    L: jt,
    anzahl: b.anzahl,
    stationen: st.map((x, i) => ({
      nr: i + 1,
      x: r3(x),
      feld: i ? r3(x - st[i - 1]) : null,
      art: b.arten[i]?.art ?? 'regel',
      masse: b.arten[i]?.masse ?? null,
      profil: b.arten[i]?.profil ?? null,
    })),
    bereiche: b.bereiche,
    quersteifen: b.quersteifen,
    stationenListe: b.stationenListe,
    blechzahlStimmt: b.blechzahlStimmt,
    blechFraglich: b.blechFraglich,
  };
}

/** Einen Abfangjochtyp über alle geführten Längen prüfen. */
export function pruefeAbfangjoch(a) {
  const aus = { typ: a.typ, fehler: [], warnung: [], hinweis: [], laengen: [] };
  const laengen = abfangLaengen(a);
  if (!laengen.length) {
    aus.hinweis.push(`${a.typ}: keine Masstabelle - keine Blecheinteilung.`);
    return aus;
  }
  const abweichend = [];
  const ohne = [];
  for (const jt of laengen) {
    const e = einteilungAbfang(a, jt);
    if (!e) { ohne.push(jt); continue; }
    aus.laengen.push({ L: jt, anzahl: e.anzahl, stimmt: e.blechzahlStimmt });
    if (e.blechzahlStimmt === false) {
      abweichend.push(`${jt.toFixed(2)} m (Schema ${e.anzahl}, Stückliste `
                    + `${e.stationenListe})`);
    }
    if (e.blechFraglich) {
      aus.hinweis.push(`${a.typ} bei ${jt.toFixed(2)} m: die Stückzahl der `
                     + 'Stückliste ist selbst als fraglich vermerkt.');
    }
  }
  if (abweichend.length) {
    aus.warnung.push(`${a.typ}: Schema und Stückliste nennen verschiedene `
                   + `Blechzahlen bei ${abweichend.join('; ')}.`);
  }
  if (ohne.length) {
    aus.hinweis.push(`${a.typ}: für ${ohne.map((x) => x.toFixed(2)).join(', ')} m `
                   + 'lässt sich keine Einteilung legen (Daten unvollständig).');
  }
  return aus;
}

/* ===========================================================================
 * >>> DIE MASSTABELLE SELBST. <<<
 * ===========================================================================
 *
 * Sie gehört keinem Typ, sie gilt für alle. Eine Zeile, die nicht aufgeht,
 * wird nicht verwendet - dort wird gleichmässig geteilt. Die Datei vermerkt
 * die drei Zeilen selbst als unschlüssig; hier wird es nachgerechnet.
 * ========================================================================= */
export function pruefeMasstabelle() {
  const aus = { typ: 'Masstabelle', fehler: [], warnung: [], hinweis: [], laengen: [] };
  let laengen = [];
  try {
    laengen = [...new Set(tragjoche().flatMap((j) =>
      moeglicheLaengen(j).map((x) => x.wert)))].sort((a, b) => a - b);
  } catch { return aus; }
  const offen = [];
  for (const L of laengen) {
    const z = masstabelleZeile(L);
    if (!z) continue;
    aus.laengen.push({ L, soll: z.soll, ist: z.ist, gueltig: z.gueltig });
    if (!z.gueltig) offen.push(`${L.toFixed(2)} m (Summe ${z.ist} statt ${z.soll} mm)`);
  }
  if (offen.length) {
    aus.warnung.push(`Die Zeile geht nicht auf bei ${offen.join(', ')} - dort `
                   + 'wird gleichmässig geteilt, nicht nach Zeichnung.');
  }
  return aus;
}

/* ===========================================================================
 * >>> DIE UEBERSICHT UEBER ALLE TYPEN. <<<
 * ========================================================================= */
export function pruefeAlle() {
  const aus = [];
  let tj = [];
  let aj = [];
  try { tj = tragjoche(); } catch { /* ohne Sortiment */ }
  try { aj = abfangjoche(); } catch { /* ohne Sortiment */ }
  if (tj.length) aus.push({ art: 'masstabelle', ...pruefeMasstabelle() });
  for (const j of tj) aus.push({ art: 'tragjoch', ...pruefeTragjoch(j) });
  for (const a of aj) aus.push({ art: 'abfangjoch', ...pruefeAbfangjoch(a) });
  return aus;
}
