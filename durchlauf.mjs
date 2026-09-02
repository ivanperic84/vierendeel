/**
 * durchlauf.mjs
 * ---------------------------------------------------------------------------
 * EIN DURCHGANG DURCH ALLE WEGE, FÜR JEDE TRAGWERKSART.
 *
 *     node durchlauf.mjs
 *
 * Der Prüfstand (`pruefung.mjs`) prüft die Bausteine: Formeln, Grenzfälle,
 * einzelne Funktionen. Er kennt aber keinen DURCHGANG — Eingabe, Rechnung,
 * Szene, Ausleitung, Bericht, hintereinander und für jede Tragwerksart.
 *
 * Genau dort brechen die Dinge nach einem Umbau. Am 2. September, nach drei
 * Änderungen an der Datenstruktur an einem Tag, liefen 2290 Kontrollen grün,
 * während der Excel-Knopf am Einzelmasten wortlos nichts tat und die
 * AxisVM-Ausleitung nur das aktive Tragwerk umfasste, in dessen lokalen
 * Koordinaten.
 *
 * >>> DIESES WERKZEUG REPARIERT NICHTS. Es sagt, was bricht. <<<
 *
 * Es soll nach jedem Umbau laufen, der die Datenstruktur oder den Rechenweg
 * anfasst — und seine Befundliste gehört in den Bericht, nicht in eine
 * Fussnote.
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const J = (f) => new URL(`./js/${f}`, import.meta.url).href;

const T = await import(J('data.tragjoche.js'));
const P = await import(J('data.profiles.js'));
const A = await import(J('data.anbauteile.js'));
const FL = await import(J('data.fl.js'));
const V = await import(J('core.vierendeel.js'));
const C = await import(J('core.constants.js'));
const CH = await import(J('core.checks.js'));
const AX = await import(J('export.axisvm.js'));
const PY = await import(J('export.pynite.js'));
const R = await import(J('render.3d.js'));
const S = await import(J('ui.schema.js'));
const BE = await import(J('export.bericht.js'));

const daten = (f) => JSON.parse(readFileSync(join(HIER, 'data', f), 'utf8'));
T.setzeDatenbank(daten('tragjoche.json'));
A.setzeAnbauteilDB(daten('anbauteile.json'));
FL.setzeFlDB(daten('fl_bauteile.json'));

const befunde = [];
/**
 * Einen Weg gehen und den Bruch aufschreiben, statt ihn zu werfen.
 *
 * `document is not defined` wird ausgenommen: der Download-Schritt braucht
 * einen Browser, und sein Fehlen ist kein Befund über das Werkzeug.
 */
const versuch = (fall, weg, fn) => {
  try {
    return { ok: true, r: fn() };
  } catch (e) {
    if (/document is not defined/.test(e.message)) {
      return { ok: true, r: '(bis zum Download gelaufen)' };
    }
    befunde.push({ fall, weg, text: e.message });
    return { ok: false, e };
  }
};

/* ===========================================================================
 * DIE FÄLLE — einer je Tragwerksart, plus die Reihe mit geteiltem Masten.
 * =========================================================================== */
const std = () => ({ ...S.standardwerte(), bearbeiten: false });

const joch = () => {
  const w = S.typUebernehmen({ ...std(), typ: 'J90' }, T.getTragjoch('J90'));
  w.L = 20; w.xLage = 0; w.mastVorhanden = true;
  w.anbauteile = [{ ...A.neuesAnbauteil('hs-fahrdraht', 10), name: 'FL Gleis 1' }];
  return w;
};

const einzelmast = () => {
  let w = C.tragwerkHinzu(joch(), 'einzelmast',
    { mastProfil: 'HEB 260', mastH: 8, mastLaenge: 12 });
  return C.tragwerkWeg(w, 'T1');          // nur der Mast bleibt
};

// Zwei Joche, die sich den Mittelmasten teilen. Der Fall, an dem sich die
// Rahmenwirkung entscheidet.
const reihe = () => C.tragwerkHinzu(joch(), 'joch', { L: 15, xLage: 20 });

const FAELLE = [['Joch', joch], ['Einzelmast', einzelmast], ['Jochreihe', reihe]];

/* ===========================================================================
 * DER DURCHGANG
 * =========================================================================== */
for (const [name, bau] of FAELLE) {
  const w0 = bau();
  const w = C.rechensatz(w0);
  const art = C.tragwerksart(w).key;
  const ohneJoch = art === 'einzelmast';
  console.log(`\n=== ${name}  (${art}, ${C.anzahlTragwerke(w0)} Tragwerk(e)) ===`);

  const jd = ohneJoch ? null : T.getTragjoch(w.typ ?? 'J90');
  const pOG = ohneJoch ? null : P.getProfil(w.profOG);
  const pUG = ohneJoch ? null : P.getProfil(w.profUG);
  const stahl = P.getStahl(w.stahl);
  const zeig = (was, text) => console.log(`  ${was.padEnd(15)}${text}`);

  const erg = versuch(name, 'berechne', () => V.berechne(w, pOG, pUG, stahl, jd));
  if (!erg.ok) continue;
  zeig('rechnen', `η = ${erg.r.max.etaGesamt.toFixed(3)}`
    + `  ·  ${erg.r.knoten.length} Knoten`);

  const h = versuch(name, 'hinweise', () => CH.hinweise(erg.r.modell));
  if (h.ok) zeig('hinweise', `${h.r.length} Stück`);

  const ck = versuch(name, 'konstruktionsChecks', () =>
    CH.konstruktionsChecks(erg.r.modell));
  if (ck.ok) zeig('prüfungen', `${ck.r.length} Stück`);

  const sz = versuch(name, 'erzeugeSzene', () =>
    R.erzeugeSzene(erg.r.modell, erg.r));
  if (sz.ok) zeig('szene', `${sz.r.flaechen.length} Flächen`);

  const bau2 = versuch(name, 'stabmodell (AxisVM)', () =>
    AX.stabmodell(erg.r.modell, { knotenmodell: 'anschnitt' }));
  if (bau2.ok) {
    const mast = bau2.r.staebe.filter((x) => /^MAST/.test(x.name)).length;
    zeig('stabmodell', `${bau2.r.knoten.size} Knoten, ${bau2.r.staebe.length} Stäbe`
      + `, davon ${mast} Maststäbe`);
  }

  const py = versuch(name, 'pyniteSkript', () =>
    PY.pyniteSkript(erg.r.modell, { knotenmodell: 'anschnitt' }));
  if (py.ok) zeig('pynite', `${py.r.text.split('\n').length} Zeilen`);

  if (!ohneJoch) {
    const ab = versuch(name, 'auflagerBlatt', () =>
      V.auflagerBlatt(w, pOG, pUG, stahl, jd));
    if (ab.ok) zeig('auflagerblatt', 'ok');
  }

  const vgl = versuch(name, 'vergleichMassvarianten', () =>
    V.vergleichMassvarianten(w, pOG, pUG, stahl, jd));
  versuch(name, 'vergleichKombinationen', () =>
    V.vergleichKombinationen(w, pOG, pUG, stahl, jd));

  // Der Bericht bis zum Download - weiter kommt er ohne Browser nicht.
  const ex = versuch(name, 'exportiere (Excel)', () =>
    BE.exportiere(w, erg.r, ck.ok ? ck.r : [], h.ok ? h.r : [], [],
                  vgl.ok ? vgl.r : null,
                  CH.urteilKonstruktion(ck.ok ? ck.r : [], w.nachweise)));
  if (ex.ok) zeig('excel', 'ok');
}

/* ===========================================================================
 * DECKT DIE AUSLEITUNG DAS GANZE BLATT AB?
 *
 * Eine Jochreihe steht auf dem Blatt von x0 bis zum letzten Masten. Umfasst
 * das ausgeleitete Stabmodell weniger, fehlt darin ein Tragwerk - und beim
 * geteilten Zwischenmasten die halbe Last. Man sieht es der Datei nicht an.
 * =========================================================================== */
console.log('\n=== Deckt die Ausleitung das ganze Blatt ab? ===');
{
  const w0 = reihe();
  const w = C.rechensatz(w0);
  const m = V.modell(w, P.getProfil(w.profOG), P.getProfil(w.profUG),
                     P.getStahl(w.stahl), T.getTragjoch(w.typ));
  const bau2 = AX.stabmodell(m, { knotenmodell: 'anschnitt' });
  const xs = [...bau2.knoten.values()].map((k) => k.x);
  const masten = C.mastenVon(w0).map((x) => x.x);
  const soll = [Math.min(...masten), Math.max(...masten)];
  const ist = [Math.min(...xs), Math.max(...xs)];
  console.log(`  Masten auf dem Blatt : x = ${masten.map((x) => x.toFixed(1)).join(', ')}`);
  console.log(`  Stabmodell umfasst   : x von ${ist[0].toFixed(2)} bis ${ist[1].toFixed(2)} m`);
  console.log(`  Erwartet             : x von ${soll[0].toFixed(2)} bis ${soll[1].toFixed(2)} m`);
  if (Math.abs(ist[1] - soll[1]) > 0.5 || Math.abs(ist[0] - soll[0]) > 0.5) {
    befunde.push({ fall: 'Jochreihe', weg: 'Ausleitung',
      text: `nur das aktive Tragwerk, in lokalen Koordinaten `
          + `(x ${ist[0].toFixed(1)}…${ist[1].toFixed(1)} statt `
          + `${soll[0].toFixed(1)}…${soll[1].toFixed(1)} m) — `
          + `die Rahmenwirkung der Reihe fehlt` });
  }
}

/* ===========================================================================
 * DIE BEFUNDE
 * =========================================================================== */
console.log('\n' + '='.repeat(78));
if (!befunde.length) {
  console.log('KEIN WEG GEBROCHEN.');
} else {
  console.log(`${befunde.length} BEFUND(E):`);
  befunde.forEach((b) => console.log(`  · ${b.fall} / ${b.weg}: ${b.text}`));
}
console.log('='.repeat(78));
process.exit(befunde.length ? 1 : 0);
