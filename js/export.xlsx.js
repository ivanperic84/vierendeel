/**
 * export.xlsx.js
 * ---------------------------------------------------------------------------
 * MINIMALER XLSX-SCHREIBER, ohne externe Bibliothek.
 *
 * Erzeugt eine echte .xlsx (OOXML): ZIP-Container mit gespeicherten (nicht
 * komprimierten) Einträgen, SpreadsheetML-Blättern mit Inline-Strings und einer
 * kleinen Formatvorlage. Damit läuft der Export auch, wenn die Datei lokal per
 * Doppelklick geöffnet wird - es wird nichts nachgeladen.
 *
 * Der Export schreibt WERTE. Die prüffähige Mappe mit lebenden Excel-FORMELN
 * erzeugt das Python-Skript generate_vierendeel_L_SZS_C5.py.
 * ---------------------------------------------------------------------------
 */

// --- ZIP --------------------------------------------------------------------

const CRC_TABELLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABELLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const enc = new TextEncoder();

function schreibe(teile) {
  const len = teile.reduce((s, t) => s + t.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  teile.forEach((t) => { out.set(t, o); o += t.length; });
  return out;
}

function u16(v) { return new Uint8Array([v & 0xff, (v >>> 8) & 0xff]); }
function u32(v) {
  return new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);
}

/**
 * ZIP mit Methode 0 (gespeichert).
 *
 * Ausgeführt, weil nicht nur die Arbeitsmappe eine Sammlung von Dateien ist:
 * das Ausleiten der ganzen Ablage trägt die hinterlegten Zeichnungen mit, und
 * die gehören als eigene Bilddateien daneben, nicht als Zahlenkolonne in eine
 * JSON. Ein zweiter ZIP-Schreiber dafür wäre einer zu viel.
 *
 * Ohne Verdichtung: JPEG und XLSX-Inhalte sind entweder schon verdichtet oder
 * klein, und ein Deflate-Schreiber wäre erheblich mehr Code als der ganze
 * Rest hier.
 */
export function zip(dateien) {
  const lokal = [], zentral = [];
  let offset = 0;
  const d = new Date();
  const zeit = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  const datum = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;

  dateien.forEach((f) => {
    const name = enc.encode(f.name);
    const daten = typeof f.inhalt === 'string' ? enc.encode(f.inhalt) : f.inhalt;
    const c = crc32(daten);
    const kopf = schreibe([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(zeit), u16(datum),
      u32(c), u32(daten.length), u32(daten.length), u16(name.length), u16(0), name,
    ]);
    lokal.push(kopf, daten);
    zentral.push(schreibe([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(zeit), u16(datum),
      u32(c), u32(daten.length), u32(daten.length), u16(name.length),
      u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += kopf.length + daten.length;
  });

  const zBlock = schreibe(zentral);
  const ende = schreibe([
    u32(0x06054b50), u16(0), u16(0), u16(dateien.length), u16(dateien.length),
    u32(zBlock.length), u32(offset), u16(0),
  ]);
  return schreibe([...lokal, zBlock, ende]);
}

// --- SpreadsheetML ----------------------------------------------------------

const x = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  // Steuerzeichen sind in XML 1.0 nicht erlaubt
  // Als \x-Escapes geschrieben, nicht als rohe Zeichen: der Bundle landet
  // inline in einem <script>-Block, und dort würde der HTML-Parser rohe
  // Steuerzeichen verschlucken und den Regex zerstören.
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

/** Formatvorlagen. Die Indizes werden über STIL referenziert. */
export const STIL = {
  STANDARD: 0, KOPF: 1, FETT: 2, N3: 3, N2: 4, EINGABE: 5,
  OK: 6, NOK: 7, TITEL: 8, TEXT: 9, N1: 10, NOTIZ: 11, BLOCK: 12,
};

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3">
<numFmt numFmtId="164" formatCode="0.000"/>
<numFmt numFmtId="165" formatCode="0.00"/>
<numFmt numFmtId="166" formatCode="0.0"/>
</numFmts>
<fonts count="5">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><i/><color rgb="FF808080"/><sz val="9"/><name val="Calibri"/></font>
<font><b/><color rgb="FF1F4E78"/><sz val="14"/><name val="Calibri"/></font>
</fonts>
<fills count="7">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFC7CE"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF2E75B6"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border>
<left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right>
<top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom>
<diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="13">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="165" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="0"/>
</styleSheet>`;

function spalte(i) {
  let s = '';
  i += 1;
  while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = (i - r - 1) / 26; }
  return s;
}

/** Eine Zelle: Zahl, Text oder {v, s}. */
function zelle(wert, zeile, spalteIdx) {
  const ref = `${spalte(spalteIdx)}${zeile}`;
  let v = wert, s = null;
  if (wert && typeof wert === 'object' && !Array.isArray(wert)) { v = wert.v; s = wert.s; }
  const attrS = s !== null && s !== undefined ? ` s="${s}"` : '';
  if (v === null || v === undefined || v === '') return `<c r="${ref}"${attrS}/>`;
  if (typeof v === 'number' && Number.isFinite(v)) {
    return `<c r="${ref}"${attrS}><v>${v}</v></c>`;
  }
  // Wahr/falsch als Wahrheitswert, nicht als Text «true» - sonst liest die
  // Einlesung der Bauteildaten eine Zeichenkette zurueck.
  if (typeof v === 'boolean') {
    return `<c r="${ref}"${attrS} t="b"><v>${v ? 1 : 0}</v></c>`;
  }
  return `<c r="${ref}"${attrS} t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
}

function blattXml(rows, breiten) {
  const cols = breiten
    ? `<cols>${breiten.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const body = rows.map((r, ri) =>
    `<row r="${ri + 1}">${(r ?? []).map((c, ci) => zelle(c, ri + 1, ci)).join('')}</row>`
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><outlinePr summaryBelow="1" summaryRight="1"/></sheetPr>
<sheetViews><sheetView workbookViewId="0" showGridLines="1"/></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>${cols}
<sheetData>${body}</sheetData></worksheet>`;
}

/**
 * Baut die Arbeitsmappe.
 * @param {{name:string, rows:Array, breiten?:number[]}[]} blaetter
 * @returns {Uint8Array}
 */
/**
 * ZIP lesen - nur Methode 0, also genau das, was `zip` schreibt.
 *
 * Gelesen wird über die LOKALEN KÖPFE, nicht über das zentrale Verzeichnis:
 * beide stehen in unseren Dateien, und der lokale Kopf trägt alles, was
 * gebraucht wird. Eine fremde ZIP mit Verdichtung fällt dabei auf - ihre
 * Methode ist nicht 0 -, und dann sagt es die Meldung, statt Unsinn zu
 * liefern.
 *
 * @param {Uint8Array} daten
 * @returns {Array<{name:string, inhalt:Uint8Array}>}
 */
export function entpacke(daten) {
  const dv = new DataView(daten.buffer, daten.byteOffset, daten.byteLength);
  const dec = new TextDecoder();
  const aus = [];
  let i = 0;
  while (i + 30 <= daten.length && dv.getUint32(i, true) === 0x04034b50) {
    const methode = dv.getUint16(i + 8, true);
    const laenge = dv.getUint32(i + 18, true);
    const nLen = dv.getUint16(i + 26, true);
    const eLen = dv.getUint16(i + 28, true);
    const name = dec.decode(daten.subarray(i + 30, i + 30 + nLen));
    const von = i + 30 + nLen + eLen;
    if (methode !== 0) {
      throw new Error(`«in ${name}» ist verdichtet - diese Datei stammt nicht `
                    + 'aus dieser Anwendung.');
    }
    aus.push({ name, inhalt: daten.subarray(von, von + laenge) });
    i = von + laenge;
  }
  if (!aus.length) throw new Error('Die Datei ist kein Paket dieser Anwendung.');
  return aus;
}

/**
 * EIN BLATTNAME, DEN EXCEL ANNIMMT.
 *
 * Excel verbietet : \\ / ? * [ ] im Namen und begrenzt ihn auf 31 Zeichen.
 * Bis zum 16. September wurde nur gekuerzt - und das erst NACH dem
 * Maskieren, sodass ein «&amp;» zerschnitten werden konnte. Das Blatt
 * «Walzprofile (UPE/IPE)» trug einen Schraegstrich; Excel musste die Mappe
 * beim Oeffnen «reparieren».
 */
export function blattname(name) {
  return String(name).replace(/[:\\/?*[\]]/g, '-').slice(0, 31);
}

export function arbeitsmappe(blaetter) {
  const dateien = [
    {
      name: '[Content_Types].xml',
      inhalt: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${blaetter.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`,
    },
    {
      name: '_rels/.rels',
      inhalt: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      inhalt: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${blaetter.map((b, i) => `<sheet name="${x(blattname(b.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      inhalt: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${blaetter.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n')}
<Relationship Id="rId${blaetter.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { name: 'xl/styles.xml', inhalt: STYLES_XML },
    ...blaetter.map((b, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      inhalt: blattXml(b.rows, b.breiten),
    })),
  ];
  return zip(dateien);
}

/** Datei im Browser herunterladen. */
export function herunterladen(bytes, dateiname, typ = null) {
  const blob = new Blob([bytes], {
    type: typ
      ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ===========================================================================
 * >>> EINE MAPPE LESEN. <<<
 * ===========================================================================
 *
 * Weisung vom 16. September: «den import auch umsetzen» - die Bauteildaten
 * sollen sich in Excel pflegen und wieder einlesen lassen.
 *
 * `entpacke` oben liest nur, was `zip` schreibt: unverdichtet. Eine Mappe,
 * die Excel gespeichert hat, ist VERDICHTET (Deflate). Hier wird sie ohne
 * Fremdbibliothek geöffnet: `DecompressionStream('deflate-raw')` gibt es in
 * jedem heutigen Browser und in Node ab Version 18.
 *
 * Gelesen wird über das ZENTRALE VERZEICHNIS, nicht über die lokalen Köpfe:
 * Programme, die mit Datendeskriptor schreiben, lassen dort die Grössen leer.
 *
 * Das XML wird mit regulären Ausdrücken gelesen, nicht mit einem Parser.
 * Das genügt für die festen Formen von SpreadsheetML, und es läuft im
 * Prüfstand ohne DOM.
 * ========================================================================= */

async function inflate(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Dieser Browser kann verdichtete Dateien nicht öffnen.');
  }
  const strom = new Blob([bytes]).stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(strom).arrayBuffer());
}

/** Alle Einträge einer ZIP - verdichtet oder nicht. */
export async function entpackeAlle(daten) {
  const dv = new DataView(daten.buffer, daten.byteOffset, daten.byteLength);
  const dec = new TextDecoder();
  let ende = -1;
  for (let i = daten.length - 22; i >= Math.max(0, daten.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { ende = i; break; }
  }
  if (ende < 0) throw new Error('Die Datei ist keine Excel-Mappe (kein ZIP).');
  const anzahl = dv.getUint16(ende + 10, true);
  let p = dv.getUint32(ende + 16, true);
  if (p === 0xffffffff) throw new Error('ZIP64 wird nicht unterstützt.');
  const aus = [];
  for (let k = 0; k < anzahl; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) {
      throw new Error('Das Inhaltsverzeichnis der Mappe ist beschädigt.');
    }
    const methode = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nLen = dv.getUint16(p + 28, true);
    const eLen = dv.getUint16(p + 30, true);
    const cLen = dv.getUint16(p + 32, true);
    const lokal = dv.getUint32(p + 42, true);
    const name = dec.decode(daten.subarray(p + 46, p + 46 + nLen));
    const lnLen = dv.getUint16(lokal + 26, true);
    const leLen = dv.getUint16(lokal + 28, true);
    const von = lokal + 30 + lnLen + leLen;
    const roh = daten.subarray(von, von + csize);
    let inhalt;
    if (methode === 0) inhalt = roh;
    else if (methode === 8) inhalt = await inflate(roh);
    else throw new Error(`«${name}» ist mit Verfahren ${methode} verdichtet.`);
    aus.push({ name, inhalt });
    p += 46 + nLen + eLen + cLen;
  }
  return aus;
}

const ENT = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
function xmlText(s) {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      return String.fromCodePoint(e[1] === 'x' || e[1] === 'X'
        ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    }
    return ENT[e] ?? m;
  });
}
function attribute(s) {
  const a = {};
  for (const m of s.matchAll(/([\w:]+)\s*=\s*"([^"]*)"/g)) a[m[1]] = xmlText(m[2]);
  return a;
}
/** Der Text eines Elements: alle <t>, ohne Lautschrift (<rPh>). */
function texte(s) {
  return [...s.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '')
    .matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => xmlText(m[1])).join('');
}
function spaltenNr(ref) {
  const b = /^([A-Z]+)/.exec(ref)?.[1] ?? 'A';
  let n = 0;
  for (const c of b) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * Eine Mappe lesen.
 *
 * @param {Uint8Array} bytes
 * @returns {Promise<{name:string, zeilen:Array<Array>}[]>}  Werte als Zahl,
 *          Text oder Wahrheitswert; leere Zellen undefined
 */
export async function leseMappe(bytes) {
  const dateien = await entpackeAlle(bytes);
  const dec = new TextDecoder();
  const datei = (n) => {
    const d = dateien.find((e) => e.name.replace(/^\//, '') === n);
    return d ? dec.decode(d.inhalt) : null;
  };
  const wb = datei('xl/workbook.xml');
  if (!wb) throw new Error('Die Datei ist keine Excel-Mappe (workbook.xml fehlt).');
  const rels = datei('xl/_rels/workbook.xml.rels') ?? '';
  const ziel = {};
  for (const m of rels.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const a = attribute(m[1]);
    let t = a.Target ?? '';
    t = t.startsWith('/') ? t.slice(1) : `xl/${t}`;
    ziel[a.Id] = t;
  }
  const geteilt = [];
  const sst = datei('xl/sharedStrings.xml');
  if (sst) for (const m of sst.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) geteilt.push(texte(m[1]));

  const aus = [];
  for (const m of wb.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const a = attribute(m[1]);
    const pfad = ziel[a['r:id']];
    const xml = pfad ? datei(pfad) : null;
    if (!xml) continue;
    const zeilen = [];
    for (const r of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const ra = attribute(r[1]);
      const zi = (Number(ra.r) || zeilen.length + 1) - 1;
      const zeile = [];
      for (const c of (r[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ca = attribute(c[1]);
        const innen = c[2] ?? '';
        const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(innen)?.[1];
        let w;
        switch (ca.t) {
          case 's': w = v === undefined ? undefined : geteilt[Number(v)]; break;
          case 'inlineStr': w = texte(innen); break;
          case 'str': w = v === undefined ? undefined : xmlText(v); break;
          case 'b': w = v === undefined ? undefined : v === '1'; break;
          case 'e': w = undefined; break;
          default:
            if (v === undefined || v === '') w = undefined;
            else {
              // Excel speichert 15 gültige Stellen; 0.37000000000000005 ist 0.37.
              const z = Number(v);
              w = Number.isFinite(z) ? Number(z.toPrecision(15)) : undefined;
            }
        }
        const si = ca.r ? spaltenNr(ca.r) : zeile.length;
        zeile[si] = w === '' ? undefined : w;
      }
      zeilen[zi] = zeile;
    }
    for (let i = 0; i < zeilen.length; i++) if (!zeilen[i]) zeilen[i] = [];
    aus.push({ name: a.name, zeilen });
  }
  return aus;
}
