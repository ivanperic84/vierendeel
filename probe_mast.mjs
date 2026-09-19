import { readFileSync } from 'node:fs';
const J = (f) => new URL(`./js/${f}`, import.meta.url).href;
const d = (f) => JSON.parse(readFileSync(`data/${f}`, 'utf8'));
(await import(J('data.normen.js'))).setzeNormen(d('normen.json'));
(await import(J('data.masten.js'))).setzeMastenDB(d('masten.json'));
const T = await import(J('data.tragjoche.js')); T.setzeDatenbank(d('tragjoche.json'));
const A = await import(J('data.anbauteile.js')); A.setzeAnbauteilDB(d('anbauteile.json'));
(await import(J('data.fl.js'))).setzeFlDB(d('fl_bauteile.json'));
const C = await import(J('core.constants.js'));
const S = await import(J('ui.schema.js'));
const V = await import(J('core.vierendeel.js'));
const P = await import(J('data.profiles.js'));
let w = S.typUebernehmen({ ...S.standardwerte(), typ: 'J90' }, T.getTragjoch('J90'));
w.L = 20; w.xLage = 0; w.mastVorhanden = true; w.anbauteile = [];
w = C.tragwerkHinzu(w, 'joch', { L: 15, xLage: 20 });
console.log('aktiv', C.tragwerkeVon(w)[0].id, 'xLage', C.tragwerkeVon(w)[0].xLage);
const teil = { ...A.neuesAnbauteil('leiter-traverse', 0), ort: 'mastA', hMast: 7, x: 0, name: 'Traverse geteilt' };
w = C.setzeAnbauteileAn(w, [...(w.anbauteile ?? []), teil]);
for (const t of C.tragwerkeSortiert(w)) {
  const s = C.tragwerkSatz(w, t.id);
  console.log(t.id, s.anbauteile.filter((a) => (a.ort ?? 'joch') !== 'joch').map((a) => `${a.name}@${a.ort}`));
}
// Mastreaktion am geteilten Mast: rechnet T1 (links) die Last des Nachbarjochs T2 mit?
const rechne = (id) => { const s = C.rechensatz(C.tauscheAktives ? C.tauscheAktives(w, id) : w);
  const e = V.berechne(s, P.getProfil(s.profOG), P.getProfil(s.profUG), P.getStahl(s.stahl), T.getTragjoch(s.typ));
  return e; };
for (const t of C.tragwerkeSortiert(w)) {
  const e = rechne(t.id);
  const m = e.mast ?? e.masten;
  console.log(t.id, 'Mast-Ergebnis Schluessel:', Object.keys(e).filter(k=>/mast/i.test(k)).join(','));
}
