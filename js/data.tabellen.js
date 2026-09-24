/**
 * data.tabellen.js
 * ---------------------------------------------------------------------------
 * DIE TABELLENFORM DER DATENDATEIEN - zerlegen und wieder zusammensetzen.
 *
 * Weisung vom 16. September: «ist es möglich die daten strukturierter zu
 * machen … den import auch umsetzen», auf Rückfrage entschieden: die
 * JSON-DATEIEN SELBST werden umgebaut.
 *
 * >>> WARUM TABELLEN. <<<
 *
 * Bis dahin war jede Datei ein Baum: ein Jochtyp trug seine Gurte, seine
 * Bleche nach Ebene, seine Staffelung, bei der Altbauweise je Längenbereich
 * noch einmal eine Staffelung - alles ineinander. So liest ein Programm,
 * aber so pflegt niemand. In Excel gibt es keinen Baum; dort gibt es Blätter
 * mit Zeilen und Spalten.
 *
 * Die Tabellenform macht aus jedem Baum VERKNÜPFTE TABELLEN:
 *
 *   typen                 eine Zeile je Typ; verschachtelte Sätze werden
 *                         zu Spalten mit Pfad («og/ja», «wind/1.1»)
 *   bleche                eine Zeile je Blech; `ebene` sagt vertikal oder
 *                         horizontal, `typ` sagt, zu wem es gehört
 *   staffelung            eine Zeile je Stufe, ebenso verknüpft
 *   …
 *   angaben               was die Datei sonst noch sagt: Erläuterungen,
 *                         Masskonventionen, Quellen - als Pfad und Wert
 *
 * Zwei Listen gleicher Form (vertikale und horizontale Bleche) werden dabei
 * zu EINER Tabelle mit einer unterscheidenden Spalte. Das ist der eigentliche
 * Gewinn an Struktur: eine Blechliste, nicht zwei.
 *
 * >>> DER RECHENKERN SIEHT WEITERHIN DEN BAUM. <<<
 *
 * Die Datenmodule setzen die Tabellen beim Laden wieder zusammen
 * (`ausTabellen`). Jeder Zugriff im Rechenkern - `joch.og.ja`,
 * `blechAnStation` - bleibt, wie er ist. Das ist Absicht: die Nachweise
 * hängen an über siebzig solchen Stellen, und keine davon wird durch eine
 * andere Ablage richtiger. Umgebaut ist die DATEI, nicht die Rechnung.
 *
 * >>> VERLUSTFREI, UND DAS IST GEPRUEFT. <<<
 *
 * Zerlegen und Zusammensetzen ergeben für jede der sieben Dateien wieder
 * denselben Baum (Prüfstand, Abschnitt 62). Dafür sorgen drei Regeln:
 *
 *   1. Jede Liste von Sätzen muss einer Tabelle zugeordnet sein. Eine, die
 *      es nicht ist, bleibt als Wert in ihrer Spalte stehen - sie geht nicht
 *      verloren, sie wird nur nicht aufgefaltet.
 *   2. Ein leerer Behälter ([] oder {}) steht als Wert in der Spalte, damit
 *      «leer» und «fehlt» unterscheidbar bleiben.
 *   3. Ein Schlüssel darf kein «/» enthalten - er ist das Pfadzeichen. Die
 *      Zerlegung bricht ab, statt einen Pfad falsch zu lesen.
 * ---------------------------------------------------------------------------
 */

export const TABELLEN_FORMAT = 'tragjoch-tabellen';
export const TABELLEN_VERSION = 2;

/* ===========================================================================
 * >>> DER AUFBAU JE SORTIMENT. <<<
 * ===========================================================================
 *
 *   listen   die Satzlisten der Datei; jede wird eine Haupttabelle
 *     name        Tabellenname
 *     pfad        wo die Liste in der Datei steht
 *     schluessel  die Spalte, die einen Satz benennt
 *     tabellen    Untertabellen, Pfad RELATIV zum Satz
 *   karten   Schlüssel-Wert-Sammlungen auf oberster Ebene, eine Zeile je
 *            Schlüssel
 *
 * Eine Untertabelle:
 *     pfad    'bleche/*' - der Stern läuft über die Schlüssel eines Satzes
 *             und schreibt sie in die Spalte `teil`
 *     teil    Name dieser Spalte
 *     bezug   Name der Spalte, die in einer Enkeltabelle auf die Zeilen-
 *             nummer dieser Tabelle verweist
 *     wert    nur bei Karten: die Spalte für einen Wert, der kein Satz ist
 * ========================================================================= */
export const AUFBAU = {
  normen: {
    titel: 'Normwerte',
    listen: [
      { name: 'stahlgueten', pfad: 'stahlgueten', schluessel: 'name' },
      { name: 'winkelprofile', pfad: 'winkelprofile', schluessel: 'name' },
      { name: 'walzprofile', pfad: 'walzprofile', schluessel: 'name' },
      { name: 'mastprofile', pfad: 'mastprofile', schluessel: 'name' },
    ],
  },
  masten: {
    titel: 'Masttypen',
    /*
     * >>> DIE FUNDAMENTE STEHEN BEIM MASTEN (24. September). <<<
     *
     * Weisung: «die Fundamentzuordnug zu den einzelnen Masttypen». Sie
     * ist keine eigene Datei geworden, sondern eine zweite Tabelle in
     * diesem Sortiment - denn genau das ist sie: eine ZUORDNUNG zum
     * Masttyp. Damit gehen sie ohne weiteres Zutun durch Datenpaket,
     * Excel-Mappe und Abgleich, die alle ueber diesen Aufbau laufen.
     */
    listen: [{ name: 'typen', pfad: 'typen', schluessel: 'profil' },
             { name: 'fundamente', pfad: 'fundamente', schluessel: 'typ' }],
  },
  tragjoche: {
    titel: 'Tragjochtypen',
    listen: [{
      name: 'typen', pfad: 'typen', schluessel: 'typ',
      tabellen: [
        { name: 'bleche', pfad: 'bleche/*', teil: 'ebene' },
        { name: 'staffelung', pfad: 'staffelung/*', teil: 'ebene' },
        { name: 'ausfuehrungen', pfad: 'ausfuehrungen', bezug: 'ausfuehrung',
          tabellen: [
            { name: 'ausfuehrung_staffelung', pfad: 'staffelung/*', teil: 'ebene' },
          ] },
        { name: 'typ_masse', pfad: 'masstabelle' },
      ],
    }],
    karten: [
      { name: 'masstabelle', pfad: 'masstabelle/zeilen/*', teil: 'L',
        wert: 'feldweiten' },
    ],
  },
  abfangjoche: {
    titel: 'Abfangjochtypen',
    listen: [{
      name: 'typen', pfad: 'typen', schluessel: 'typ',
      tabellen: [
        { name: 'bindebleche', pfad: 'bindeblech/*', teil: 'lage' },
        { name: 'laengen', pfad: 'laengen' },
        { name: 'quersteifung', pfad: 'quersteifung' },
        { name: 'deckbleche', pfad: 'deckblech' },
      ],
    }],
  },
  anker: {
    titel: 'Zug- und Druckstützen',
    listen: [{ name: 'typen', pfad: 'typen', schluessel: 'id' }],
  },
  fl_bauteile: {
    titel: 'Lasttabelle',
    listen: [
      { name: 'gruppen', pfad: 'gruppen', schluessel: 'id' },
      { name: 'bauteile', pfad: 'bauteile', schluessel: 'id' },
    ],
  },
  anbauteile: {
    titel: 'Anbauteil-Vorlagen',
    listen: [{
      name: 'vorlagen', pfad: 'vorlagen', schluessel: 'id',
      tabellen: [
        { name: 'module', pfad: 'module' },
        { name: 'lasten', pfad: 'lasten' },
      ],
    }],
  },
};

/** Die Reihenfolge der Sortimente - dieselbe wie im Datenpaket. */
export const SORTIMENTE = Object.keys(AUFBAU);

/* ---------------------------------------------------------------------------
 * HILFEN
 * ------------------------------------------------------------------------- */
const istSatz = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const istSatzListe = (v) => Array.isArray(v) && v.length > 0 && v.every(istSatz);

function hol(obj, teile) {
  let v = obj;
  for (const t of teile) { if (!istSatz(v)) return undefined; v = v[t]; }
  return v;
}

function setz(obj, pfad, wert) {
  const teile = pfad.split('/');
  let o = obj;
  for (let i = 0; i < teile.length - 1; i++) {
    const t = teile[i];
    if (!istSatz(o[t])) o[t] = {};
    o = o[t];
  }
  o[teile[teile.length - 1]] = wert;
}

/** Behälter an einem Pfad holen oder anlegen. */
function behaelter(obj, teile, leer) {
  let o = obj;
  for (let i = 0; i < teile.length; i++) {
    const t = teile[i];
    const letzt = i === teile.length - 1;
    if (letzt) {
      if (Array.isArray(leer) ? !Array.isArray(o[t]) : !istSatz(o[t])) {
        o[t] = Array.isArray(leer) ? [] : {};
      }
      return o[t];
    }
    if (!istSatz(o[t])) o[t] = {};
    o = o[t];
  }
  return o;
}

/** Wird dieser Wert unter einem Stern zu einer Zeile? */
const wirdZeile = (spec, v) => Boolean(spec.wert) || istSatz(v) || istSatzListe(v);

/** Die Schlüsselspalten einer Tabelle, in Reihenfolge. */
function schluesselVon(spec, elternSchluessel) {
  const aus = [];
  for (const k of elternSchluessel) {
    if (k === 'nr') aus.push(spec._elternBezug);
    else aus.push(k);
  }
  if (spec.teil) aus.push(spec.teil);
  if (!spec.wert) aus.push('nr');
  return aus;
}

/**
 * Die Tabellenbeschreibungen eines Sortiments, flach, mit Schlüsselspalten
 * und Elterntabelle. Wird einmal gebaut und behalten.
 */
const FLACH = new Map();
export function tabellenVon(sortiment) {
  if (FLACH.has(sortiment)) return FLACH.get(sortiment);
  const a = AUFBAU[sortiment];
  if (!a) throw new Error(`Unbekanntes Sortiment «${sortiment}».`);
  const aus = [];
  const gehe = (spec, eltern, elternSchluessel) => {
    const s = { ...spec, eltern: eltern?.name ?? null };
    if (eltern) {
      s._elternBezug = eltern.bezug ?? `${eltern.name}_nr`;
      s.schluesselSpalten = schluesselVon(s, elternSchluessel);
    }
    aus.push(s);
    for (const u of spec.tabellen ?? []) gehe(u, s, s.schluesselSpalten);
  };
  for (const l of a.listen) {
    const s = { ...l, eltern: null, schluesselSpalten: [l.schluessel], haupt: true };
    aus.push(s);
    for (const u of l.tabellen ?? []) gehe(u, s, s.schluesselSpalten);
  }
  for (const k of a.karten ?? []) {
    aus.push({ ...k, eltern: null, karte: true,
               schluesselSpalten: [k.teil] });
  }
  FLACH.set(sortiment, aus);
  return aus;
}

/* ===========================================================================
 * >>> ZERLEGEN. <<<
 * ========================================================================= */

/**
 * Die Blätter eines Satzes als Spalten - ohne die Teilbäume, die eine
 * Untertabelle beansprucht.
 */
function blaetter(knoten, specs, pfad, aus) {
  for (const [k, v] of Object.entries(knoten)) {
    if (k.includes('/')) {
      throw new Error(`Schlüssel «${k}» enthält «/» - das ist das Pfadzeichen.`);
    }
    const p = pfad ? `${pfad}/${k}` : k;
    const spec = specs.find((s) => s._behaelter === p);
    if (spec && !spec._stern && istSatzListe(v)) continue;
    if (spec && spec._stern && istSatz(v) && Object.keys(v).length) {
      for (const [k2, v2] of Object.entries(v)) {
        if (k2.includes('/')) {
          throw new Error(`Schlüssel «${k2}» enthält «/» - das ist das Pfadzeichen.`);
        }
        if (!wirdZeile(spec, v2)) aus[`${p}/${k2}`] = v2;
      }
      continue;
    }
    if (istSatz(v) && Object.keys(v).length) { blaetter(v, specs, p, aus); continue; }
    aus[p] = v;
  }
  return aus;
}

function vorbereitet(specs) {
  return (specs ?? []).map((s) => {
    const teile = s.pfad.split('/');
    const stern = teile[teile.length - 1] === '*';
    return { ...s, _stern: stern,
             _behaelter: (stern ? teile.slice(0, -1) : teile).join('/') };
  });
}

/**
 * Einen Baum in Tabellen zerlegen.
 *
 * @param {string} sortiment  Schlüssel aus AUFBAU
 * @param {object} baum       der Inhalt der Datei in Baumform
 * @returns {{format, version, sortiment, tabellen, angaben}}
 */
export function zerlege(sortiment, baum) {
  const a = AUFBAU[sortiment];
  if (!a) throw new Error(`Unbekanntes Sortiment «${sortiment}».`);
  const flach = tabellenVon(sortiment);
  const tabellen = {};
  for (const t of flach) tabellen[t.name] = [];

  const zeileAnlegen = (spec, element, schl) => {
    const unter = vorbereitet(spec.tabellen);
    const eigen = blaetter(element, unter, '', {});
    for (const k of Object.keys(schl)) {
      if (k in eigen) {
        throw new Error(`Tabelle «${spec.name}»: das Feld «${k}» trägt denselben `
                      + 'Namen wie eine Schlüsselspalte.');
      }
    }
    tabellen[spec.name].push({ ...schl, ...eigen });
    /*
     * Die Kinder erben den Schlüssel. Bei einer Haupttabelle ist er ein Feld
     * des Satzes selbst (`typ`), steht also nicht in `schl`.
     */
    const erbe = spec.haupt ? { [spec.schluessel]: element[spec.schluessel] } : schl;
    // Die Enkel: ihr Schlüssel ersetzt `nr` durch den Bezug dieser Tabelle.
    for (const u of unter) {
      const kind = flach.find((t) => t.name === u.name);
      const ks = {};
      for (const [k, v] of Object.entries(erbe)) {
        if (k === 'nr') ks[kind._elternBezug] = v; else ks[k] = v;
      }
      zeilenAus(kind, u, element, ks);
    }
  };

  function zeilenAus(spec, vorb, element, schl) {
    const teile = vorb._behaelter ? vorb._behaelter.split('/') : [];
    const c = hol(element, teile);
    if (vorb._stern) {
      if (!istSatz(c)) return;
      for (const [k, v] of Object.entries(c)) {
        if (!wirdZeile(spec, v)) continue;
        const s = { ...schl, [spec.teil]: k };
        if (spec.wert) tabellen[spec.name].push({ ...s, [spec.wert]: v });
        else if (istSatz(v)) zeileAnlegen(spec, v, s);
        else v.forEach((e, i) => zeileAnlegen(spec, e, { ...s, nr: i + 1 }));
      }
    } else {
      if (!istSatzListe(c)) return;
      c.forEach((e, i) => zeileAnlegen(spec, e, { ...schl, nr: i + 1 }));
    }
  }

  // --- die Haupttabellen ---------------------------------------------------
  const wurzelSpecs = [];
  for (const l of a.listen) {
    wurzelSpecs.push({ _behaelter: l.pfad, _stern: false, pfad: l.pfad });
    const liste = hol(baum, l.pfad.split('/'));
    if (!Array.isArray(liste)) continue;
    const spec = flach.find((t) => t.name === l.name);
    for (const satz of liste) {
      if (!istSatz(satz)) {
        throw new Error(`Liste «${l.pfad}»: ein Eintrag ist kein Satz.`);
      }
      zeileAnlegen(spec, satz, {});
    }
  }
  // --- die Karten ------------------------------------------------------------
  for (const k of a.karten ?? []) {
    const v = vorbereitet([k])[0];
    wurzelSpecs.push(v);
    const spec = flach.find((t) => t.name === k.name);
    zeilenAus(spec, v, baum, {});
  }

  // --- was übrig bleibt: die Angaben ------------------------------------------
  /*
   * Eine Satzliste auf oberster Ebene gilt als beansprucht, auch wenn sie
   * leer ist: die Haupttabelle steht dann mit null Zeilen da, und das
   * Zusammensetzen legt die leere Liste wieder an.
   */
  const angabenSpecs = wurzelSpecs.map((s) => ({ ...s }));
  const rest = {};
  for (const [k, v] of Object.entries(baum)) {
    const listeHier = a.listen.find((l) => l.pfad === k);
    if (listeHier && Array.isArray(v)) continue;
    rest[k] = v;
  }
  const angaben = Object.entries(blaetter(rest, angabenSpecs, '', {}))
    .map(([pfad, wert]) => ({ pfad, wert }));

  return {
    format: TABELLEN_FORMAT,
    version: TABELLEN_VERSION,
    sortiment,
    tabellen,
    angaben,
  };
}

/* ===========================================================================
 * >>> ZUSAMMENSETZEN. <<<
 * ========================================================================= */

const idVon = (zeile, spalten) => JSON.stringify(spalten.map((s) => zeile[s] ?? null));

/**
 * Tabellen wieder zu einem Baum zusammensetzen.
 *
 * Die Zeilen einer Untertabelle werden nach `nr` geordnet, nicht nach ihrer
 * Lage in der Tabelle: wer in Excel sortiert, soll die Reihenfolge der
 * Bleche nicht verschieben.
 */
export function setzeZusammen(tab) {
  const sortiment = tab?.sortiment;
  const a = AUFBAU[sortiment];
  if (!a) throw new Error(`Unbekanntes Sortiment «${sortiment}».`);
  const flach = tabellenVon(sortiment);
  const baum = {};

  for (const { pfad, wert } of tab.angaben ?? []) setz(baum, pfad, wert);

  // Elemente je Tabelle, nach Schlüssel auffindbar
  const elemente = new Map();

  const felderSetzen = (el, zeile, schl) => {
    for (const [k, v] of Object.entries(zeile)) {
      if (schl.includes(k)) continue;
      if (v === undefined) continue;
      setz(el, k, v);
    }
  };

  for (const t of flach) {
    const zeilen = tab.tabellen?.[t.name] ?? [];
    const idx = new Map();
    elemente.set(t.name, idx);

    if (t.haupt) {
      if (!tab.tabellen || !(t.name in tab.tabellen)) continue;
      const liste = behaelter(baum, t.pfad.split('/'), []);
      for (const z of zeilen) {
        const el = {};
        felderSetzen(el, z, t.schluesselSpalten);
        // Der Schlüssel ist zugleich ein Feld des Satzes
        const k = t.schluessel;
        const mitSchluessel = k in z ? { [k]: z[k], ...el } : el;
        liste.push(mitSchluessel);
        const id = idVon(z, t.schluesselSpalten);
        if (!idx.has(id)) idx.set(id, mitSchluessel);
        else if (t.tabellen?.length) {
          throw new Error(`Tabelle «${t.name}»: «${z[k]}» kommt zweimal vor - `
                        + 'die Untertabellen liessen sich nicht zuordnen.');
        }
      }
      continue;
    }

    // Karten auf oberster Ebene und Untertabellen
    const teile = t.pfad.split('/');
    const stern = teile[teile.length - 1] === '*';
    const bTeile = stern ? teile.slice(0, -1) : teile;

    let eltern = null;
    let elternSchl = null;
    if (t.eltern) {
      const e = flach.find((x) => x.name === t.eltern);
      eltern = elemente.get(e.name);
      elternSchl = e.schluesselSpalten;
    }
    const elternVon = (z) => {
      if (!t.eltern) return baum;
      const ez = {};
      for (const k of elternSchl) {
        ez[k] = k === 'nr' ? z[t._elternBezug] : z[k];
      }
      const el = eltern.get(idVon(ez, elternSchl));
      if (!el) {
        throw new Error(`Tabelle «${t.name}»: keine Zeile in «${t.eltern}» für `
                      + `${elternSchl.map((k) => `${k}=${ez[k]}`).join(', ')}.`);
      }
      return el;
    };

    // Nach Eltern, Teil und Nummer ordnen - stabil, damit Unbenummertes bleibt
    const geordnet = zeilen.map((z, i) => ({ z, i })).sort((p, q) => {
      if (Number.isFinite(p.z.nr) && Number.isFinite(q.z.nr)) {
        const gleich = elternSchl
          ? elternSchl.every((k) => (k === 'nr'
              ? p.z[t._elternBezug] === q.z[t._elternBezug] : p.z[k] === q.z[k]))
          : true;
        const teilGleich = !t.teil || p.z[t.teil] === q.z[t.teil];
        if (gleich && teilGleich) return p.z.nr - q.z.nr;
      }
      return p.i - q.i;
    }).map((x) => x.z);

    for (const z of geordnet) {
      const el0 = elternVon(z);
      const c = behaelter(el0, bTeile, stern ? {} : []);
      let neu;
      if (stern) {
        const k = String(z[t.teil]);
        if (t.wert) { c[k] = z[t.wert]; continue; }
        neu = {};
        felderSetzen(neu, z, t.schluesselSpalten);
        if (Number.isFinite(z.nr)) {
          if (!Array.isArray(c[k])) c[k] = [];
          c[k].push(neu);
        } else {
          c[k] = neu;
        }
      } else {
        neu = {};
        felderSetzen(neu, z, t.schluesselSpalten);
        c.push(neu);
      }
      idx.set(idVon(z, t.schluesselSpalten), neu);
    }
  }
  return baum;
}

/** Ist dieses Objekt eine Datei in Tabellenform? */
export const istTabellenform = (obj) => obj?.format === TABELLEN_FORMAT;

/**
 * Was die Datenmodule beim Laden aufrufen: Tabellenform wird zum Baum,
 * alles andere bleibt, wie es ist. So lesen sie beide Fassungen - auch ein
 * Datenpaket, das noch vor dem Umbau im Browser hinterlegt wurde.
 */
export function ausTabellen(obj, sortiment = null) {
  if (!istTabellenform(obj)) return obj;
  if (sortiment && obj.sortiment !== sortiment) {
    throw new Error(`Die Datei gehört zum Sortiment «${obj.sortiment}», `
                  + `erwartet war «${sortiment}».`);
  }
  return setzeZusammen(obj);
}

/* ===========================================================================
 * >>> ALS TEXT: EINE ZEILE JE TABELLENZEILE. <<<
 * ===========================================================================
 *
 * JSON.stringify mit Einzug schriebe jede Zelle auf eine eigene Zeile - eine
 * Tabelle mit sechzig Sätzen wäre dann tausend Zeilen lang und keine Tabelle
 * mehr. Hier steht jede Tabellenzeile auf einer Textzeile. So liest man die
 * Datei wie eine Tabelle, und ein Vergleich zweier Stände zeigt geänderte
 * Sätze statt verschobener Klammern.
 * ========================================================================= */
export function alsDateitext(tab) {
  const z = (v) => JSON.stringify(v);
  const teile = [
    '{',
    ` "format": ${z(tab.format)},`,
    ` "version": ${z(tab.version)},`,
    ` "sortiment": ${z(tab.sortiment)},`,
    ' "tabellen": {',
  ];
  const namen = Object.keys(tab.tabellen);
  namen.forEach((n, i) => {
    const zeilen = tab.tabellen[n];
    const ende = i < namen.length - 1 ? ',' : '';
    if (!zeilen.length) { teile.push(`  ${z(n)}: []${ende}`); return; }
    teile.push(`  ${z(n)}: [`);
    zeilen.forEach((r, j) => teile.push(`   ${z(r)}${j < zeilen.length - 1 ? ',' : ''}`));
    teile.push(`  ]${ende}`);
  });
  teile.push(' },');
  teile.push(' "angaben": [');
  tab.angaben.forEach((r, j) =>
    teile.push(`  ${z(r)}${j < tab.angaben.length - 1 ? ',' : ''}`));
  teile.push(' ]');
  teile.push('}');
  return teile.join('\n') + '\n';
}

/* ===========================================================================
 * >>> ZELLEN FUER EXCEL. <<<
 * ===========================================================================
 *
 * In der JSON-Datei stehen die Werte, wie sie sind: Zahl, Text, wahr/falsch,
 * null, Liste. Eine Excel-Zelle kennt nur Zahl, Text und Wahrheitswert.
 *
 *   Liste, Satz    als JSON-Text: «[4.51,5]», «[]», «{}». Lesbar genug, und
 *                  eindeutig zurückzulesen.
 *   null           leere Zelle. Ob «leer» dann null oder «fehlt» heisst,
 *                  entscheidet beim Einlesen der Abgleich mit dem Bestand.
 *   Text, der mit «[» oder «{» beginnt, bekommt ein Hochkomma davor - sonst
 *                  läse man ihn als Liste.
 * ========================================================================= */
export function zelleAus(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    return /^['[{]/.test(v) ? `'${v}` : v;
  }
  return JSON.stringify(v);
}

export function zelleEin(v) {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v !== 'string') return v;
  if (v.startsWith("'")) return v.slice(1);
  if (/^[[{]/.test(v)) {
    try { return JSON.parse(v); } catch { return v; }
  }
  return v;
}
