/**
 * vergleich_werkzeug.mjs
 * ---------------------------------------------------------------------------
 * DIE WERKZEUGSEITE EINES ABGLEICHS GEGEN EIN FEM-MODELL.
 *
 * Schreibt für einen gespeicherten Eingabestand je Lastfall und je Station
 * die Grössen, die sich mit einem Stabwerksprogramm vergleichen lassen:
 * Spannung je Gurtwinkel und Moment je Bindeblechebene, dazu die Geometrie,
 * die die Gegenseite braucht, um ihre Stäbe zuzuordnen.
 *
 *     node vergleich_werkzeug.mjs <ablage.json> [ausgabe.json]
 *
 * <ablage.json> ist eine Datei aus «Ablage → ausleiten» oder ein einzelner
 * Eintrag daraus. Enthält sie mehrere Einträge, wird der erste genommen;
 * mit --name <Teil des Namens> lässt sich einer auswählen.
 *
 * Die Gegenseite ist `vergleich_axisvm.py`. Beide Werkzeuge sind allgemein -
 * sie enthalten keine Projektzahlen, nur den Weg vom Modell zum Vergleich.
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const argv = process.argv.slice(2);
const wahlIdx = argv.indexOf('--name');
const wahlName = wahlIdx >= 0 ? argv[wahlIdx + 1] : null;
const dateien = argv.filter((a, i) => !a.startsWith('--')
  && (wahlIdx < 0 || i !== wahlIdx + 1));
if (!dateien.length) {
  console.error('Aufruf: node vergleich_werkzeug.mjs <ablage.json> [ausgabe.json]'
              + ' [--name <Teil des Namens>]');
  process.exit(1);
}
const [quelle, ziel = 'vergleich_werkzeug.json'] = dateien;

// --- Datenbanken laden ------------------------------------------------------
const J = (n) => new URL(`./js/${n}`, import.meta.url).href;
const D = (n) => new URL(`./data/${n}`, import.meta.url);
const T = await import(J('data.tragjoche.js'));
const A = await import(J('data.anbauteile.js'));
const FL = await import(J('data.fl.js'));
for (const [datei, setze] of [['tragjoche.json', T.setzeDatenbank],
                              ['anbauteile.json', A.setzeAnbauteilDB],
                              ['fl_bauteile.json', FL.setzeFlDB]]) {
  const p = D(datei);
  if (!existsSync(p)) {
    console.error(`Es fehlt data/${datei}. Ohne die Datenbanken lässt sich kein `
                + 'Sortimentsjoch rechnen.');
    process.exit(1);
  }
  setze(JSON.parse(readFileSync(p, 'utf8')));
}
const { getProfil, getStahl } = await import(J('data.profiles.js'));
const { berechne } = await import(J('core.vierendeel.js'));
const { standardLastfaelle } = await import(J('core.lasten.js'));

// --- Eingabestand heraussuchen ---------------------------------------------
const roh = JSON.parse(readFileSync(quelle, 'utf8'));
const eintraege = Array.isArray(roh) ? roh
  : Array.isArray(roh.eintraege) ? roh.eintraege
  : roh.werte ? [roh] : [];
if (!eintraege.length) {
  console.error('Die Datei enthält keinen Eingabestand (weder `eintraege` noch `werte`).');
  process.exit(1);
}
const eintrag = wahlName
  ? eintraege.find((e) => (e.name ?? '').toLowerCase().includes(wahlName.toLowerCase()))
  : eintraege[0];
if (!eintrag) {
  console.error(`Kein Eintrag mit «${wahlName}». Vorhanden: `
              + eintraege.map((e) => e.name).join(' · '));
  process.exit(1);
}
const w = eintrag.werte;
const joch = T.getTragjoch(w.typ);

// --- Je Lastfall einmal rechnen --------------------------------------------
// Genommen werden die CHARAKTERISTISCHEN Einzellastfälle: sie entsprechen
// eins zu eins den Lastfällen, die ein FEM-Modell führt.
const lf = standardLastfaelle(w).filter((l) => l.art === 'charakteristisch');
const NULL = { G: 0, WindX: 0, WindY: 0, Schnee: 0, Leiterzug: 0 };

const faelle = {};
let modell = null;
for (const l of lf) {
  const e = berechne({ ...w, lastfall: l.key, beiwerteFest: null },
                     getProfil(w.profOG), getProfil(w.profUG),
                     getStahl(w.stahl), joch);
  modell = e.modell;
  faelle[l.key] = {
    bez: l.bez, beiwerte: l.beiwerte, nur: l.nur ?? null,
    stationen: e.knoten.map((k) => ({
      i: k.i, x: k.x,
      My: k.My, Mz: k.Mz, Tx: k.Tx, Vz: k.Vz, Vy: k.Vy, Nx: k.Nx,
      gurt: Object.fromEntries(k.ecken.map((c) => [c.id, {
        N: c.N, My: c.My_lokal, Mz: c.Mz_lokal,
        sig_N: c.sig_N, sig_My: c.sig_My, sig_Mz: c.sig_Mz, sig: c.sig_v,
      }])),
      blech: Object.fromEntries(k.ebenen.filter((p) => p.eta != null)
        .map((p) => [p.id, { art: p.art, M: p.M, M_Knoten: p.M_Knoten,
                             V: p.V, sig: p.sig, tau: p.tau, sig_v: p.sig_v,
                             breite: p.breite, dicke: p.dicke }])),
    })),
  };
}

// --- Geometrie, damit die Gegenseite ihre Stäbe zuordnen kann ---------------
const geo = {
  L: modell.L, h: modell.h, b: modell.b,
  jd: modell.jd, jbbOG: modell.jbbOG, jbbUG: modell.jbbUG,
  typ: w.typ, profOG: w.profOG, profUG: w.profUG,
  // Höhenlage der Gurtschwerachsen über der Jochachse [m]
  zOG: +modell.h / 2, zUG: -modell.h / 2,
  yLinks: -modell.b / 2, yRechts: +modell.b / 2,
  stationen: modell.stationsX ?? (modell.stationsListe ?? []).map((s) => s.x),
  fyd: modell.fyd,
};

writeFileSync(ziel, JSON.stringify({
  format: 'tragjoch-vergleich', version: 1,
  erzeugt: new Date().toISOString(),
  name: eintrag.name, projekt: eintrag.projekt ?? '',
  geometrie: geo, faelle,
}, null, 1));

console.log(`«${eintrag.name}» · ${w.typ} · L = ${modell.L} m · `
          + `${faelle[lf[0].key].stationen.length} Stationen`);
console.log('Lastfälle:', lf.map((l) => `${l.key} (${l.bez})`).join(' · '));
console.log('geschrieben:', ziel);
