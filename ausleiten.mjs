/**
 * ausleiten.mjs
 * ---------------------------------------------------------------------------
 * LEITET DIE COM-JSON EINES ABLAGE-EINTRAGS AUS, OHNE BROWSER.
 *
 * Dieselbe Ausleitung wie in der Anwendung (Ausleiten -> JSON fuer die
 * COM-Bruecke), nur von der Kommandozeile. Gedacht fuer den Fall, dass die
 * Geometrie sich geaendert hat und die Vergleichsdatei neu gebraucht wird,
 * bevor die Anwendung auf dem Arbeitsrechner nachgezogen ist.
 *
 *     node ausleiten.mjs <ablage.json> <ziel.json> [auflagermodell]
 *
 * Das Auflagermodell ist wahlweise 'gurte', 'mitte' oder 'punkt'; ohne
 * Angabe gilt die Vorgabe der Bauweise.
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync } from 'node:fs';
const J = (f) => new URL(`./js/${f}`, import.meta.url).href;

const T = await import(J('data.tragjoche.js'));
const P = await import(J('data.profiles.js'));
const S = P;
const A = await import(J('data.anbauteile.js'));
const V = await import(J('core.vierendeel.js'));
const AX = await import(J('export.axisvm.js'));

T.setzeDatenbank(JSON.parse(readFileSync('data/tragjoche.json', 'utf8')));
A.setzeAnbauteilDB(JSON.parse(readFileSync('data/anbauteile.json', 'utf8')));
try {
  const FL = await import(J('data.fl_bauteile.js'));
  FL.setzeFlBauteilDB?.(JSON.parse(readFileSync('data/fl_bauteile.json', 'utf8')));
} catch { }

const ablage = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const w = ablage.eintraege[0].werte;
const m = V.modell(w, P.getProfil(w.profOG), P.getProfil(w.profUG),
                   S.getStahl(w.stahl), T.getTragjoch(w.typ));
const d = AX.stabmodellJson(m, { knotenmodell: 'anschnitt',
                                 auflagerModell: process.argv[4] ?? undefined });
writeFileSync(process.argv[3], JSON.stringify(d, null, 1));
console.log(`${ablage.eintraege[0].name}`);
console.log(`  ${d.knoten.length} Knoten · ${d.staebe.length} Stäbe · ` +
            `${d.querschnitte.length} Querschnitte`);
console.log(`  Auflagermodell: ${d.tragwerk.auflagermodell} · ` +
            `${d.auflager.length} gehaltene Knoten`);
console.log(`  Freigaben: ${d.staebe.filter((s) => s.gelenkAnfang || s.gelenkEnde).length}`);
console.log(`  Lasten: ${d.lasten.punkt.length} Punkt · ${d.lasten.strecke.length} Strecke`);
