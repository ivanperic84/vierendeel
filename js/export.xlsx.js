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

/** ZIP mit Methode 0 (gespeichert). */
function zip(dateien) {
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
<sheets>${blaetter.map((b, i) => `<sheet name="${x(b.name).slice(0, 31)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
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
