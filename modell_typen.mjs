/* ===========================================================================
 * modell_typen.mjs
 * ---------------------------------------------------------------------------
 * ALLE TRAGJOCH-TYPEN DES SORTIMENTS - geprueft und fuer AxisVM zusammengetragen.
 *
 * Weisung vom 4. Oktober: «alle typen zusammentragen und im axis aufbauen
 * fuer check falls notwendig.» Anlass: an den verjuengten (alten) Typen
 * fehlten die stehenden Starrelemente am Knick der Ansicht.
 *
 *   node modell_typen.mjs
 *
 * 1. Je Typ (kuerzeste Normlaenge, HEB 260, ohne Anbauteile) das Stabmodell
 *    wie der Stabwerksknopf: Riegelstellen, deckungsgleiche Knoten,
 *    Gleichgewicht, Ausnutzung.
 * 2. com/AxisVM_Typen_alt.json und com/AxisVM_Typen_neu.json: je Bauweise
 *    alle Typen nebeneinander auf einem Blatt (jedes mit eigenen Masten,
 *    3 m Luft dazwischen) - zum AUFBAUEN in AxisVM, ohne Eigengewichtslasten
 *    (AxisVM setzt sein Eigengewicht selbst an).
 * ---------------------------------------------------------------------------
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const HIER = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const J = (f) => pathToFileURL(join(HIER, 'js', f)).href;
const eigen = process.argv[1];
process.argv[1] = 'x';                       // modell_beispiele.mjs soll nichts schreiben
const B = await import(pathToFileURL(join(HIER, 'modell_beispiele.mjs')).href);
process.argv[1] = eigen;
const T = await import(J('data.tragjoche.js'));
const S = await import(J('ui.schema.js'));
const C = await import(J('core.constants.js'));

const satz = (typ, L, extra = {}) => ({
  ...S.typUebernehmen({ ...S.standardwerte(), bearbeiten: false, typ }, T.getTragjoch(typ)),
  L, xLage: 0, mastVorhanden: true, twId: 'T1', anbauteile: [], ...extra });
const kurz = (j) => j.laengeNorm?.[0] ?? 8;
const doppelt = (dat) => {
  const m = new Map();
  dat.knoten.forEach((k) => { const o = [k.x, k.y, k.z].map((v) => v.toFixed(4)).join(); m.set(o, (m.get(o) ?? 0) + 1); });
  return [...m.values()].filter((n) => n > 1).length;
};

console.log('Typ        L     Knoten Staebe  Riegel bei x [m]                 doppelt  OG     UG     Blech  Mast');
const typen = T.sortimentstypen().map((t) => T.getTragjoch(t.typ ?? t));
for (const j of typen) {
  const L = kurz(j);
  const h = B.rechne(satz(j.typ, L));
  if (h.fehler || h.ohneModell) { console.log(j.typ.padEnd(10), L, 'NICHT GERECHNET:', h.fehler ?? h.ohneModell); continue; }
  const d = h.roh.dat;
  const rg = [...new Set(d.staebe.filter((s) => /RIEGEL_/.test(s.name)).map((s) => Number(s.name.split('_').pop())))].sort((a, b) => a - b);
  const e = (k) => (h.teile[k]?.eta ?? NaN).toFixed(3);
  console.log(j.typ.padEnd(10), String(L).padEnd(5), String(d.knoten.length).padEnd(6), String(d.staebe.length).padEnd(7),
    (rg.join(' ') || '-').padEnd(33), String(doppelt(d)).padEnd(8), e('tragwerk|OG'), e('tragwerk|UG'), e('tragwerk|blech'), e('mast:M1|mast'));
}

for (const [name, bauweise] of [['alt', 'alt'], ['neu', 'neu']]) {
  let w = null, x = 0;
  typen.filter((j) => j.bauweise === bauweise).forEach((j, i) => {
    const L = kurz(j);
    if (!w) w = satz(j.typ, L);
    else {
      w = C.tragwerkHinzu(w, 'joch', { xLage: x, L });
      Object.assign(w, S.typUebernehmen({ ...w, typ: j.typ }, j), { L, xLage: x, anbauteile: [] });
    }
    x += L + 3;
  });
  const h = B.rechne(w);
  if (h.fehler || h.ohneModell) { console.log(name, 'nicht gerechnet:', h.fehler ?? h.ohneModell); continue; }
  const dat = h.roh.dat;
  const ax = { ...dat, lasten: { ...dat.lasten,
    strecke: dat.lasten.strecke.filter((l) => !/(^|_)EG_/.test(l.name)) } };
  writeFileSync(join(HIER, 'com', `AxisVM_Typen_${name}.json`), JSON.stringify(ax, null, 1));
  console.log(`\nBlatt ${name}: ${C.tragwerkeVon(w).map((t) => `${t.typ} ${t.L} m @ ${t.xLage}`).join(' | ')}`);
  console.log(`  ${dat.knoten.length} Knoten, ${dat.staebe.length} Staebe, ${dat.staebe.filter((s) => /RIEGEL_/.test(s.name)).length} Riegel, `
    + `deckungsgleich ${doppelt(dat)}, Masten ${dat.auflager.length}`);
  console.log('  ' + Object.entries(h.teile).filter(([k]) => /blech$/.test(k) && /tragwerk/.test(k)).map(([k, v]) => `${k} ${v.eta.toFixed(3)}`).join(' | '));
}
