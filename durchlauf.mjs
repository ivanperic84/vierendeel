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

/*
 * DIE NORMWERTE ZUERST. Seit dem 16. September stehen die Querschnittswerte
 * nicht mehr im Quelltext, sondern in data/normen.json - ohne sie wirft
 * jeder Zugriff auf ein Profil. Sie sind keine Betreiberdaten und liegen
 * deshalb auch in einer oeffentlichen Ablage bei.
 */
const NO = await import(J('data.normen.js'));
NO.setzeNormen(JSON.parse(readFileSync(join(HIER, 'data', 'normen.json'), 'utf8')));
/*
 * >>> DER DATENORDNER IST WAEHLBAR (A3, 19. September). <<<
 *
 * Vorgabe sind die Sortimente des Betreibers in data/. Mit
 * VIERENDEEL_DATEN=testdaten laeuft derselbe Durchgang auf dem frei
 * erfundenen Datensatz (testdaten/erzeuge.mjs) - der Rauchtest, der ohne
 * Betreiberdaten auskommt und deshalb auch auf GitHub laufen kann.
 * Die Normwerte kommen immer aus data/normen.json; sie liegen in der Ablage.
 */
const DATEN = process.env.VIERENDEEL_DATEN || 'data';
console.log(`Datenordner: ${DATEN}`);
const MA_SORT = await import(J('data.masten.js'));
try {
  MA_SORT.setzeMastenDB(JSON.parse(
    readFileSync(join(HIER, DATEN, 'masten.json'), 'utf8')));
} catch { /* ohne Masten-Sortiment weiter - dann ohne Windlast */ }

const T = await import(J('data.tragjoche.js'));
const P = await import(J('data.profiles.js'));
const A = await import(J('data.anbauteile.js'));
const FL = await import(J('data.fl.js'));
const V = await import(J('core.vierendeel.js'));
const C = await import(J('core.constants.js'));
const NACH = await import(J('core.nachbarn.js'));
const CH = await import(J('core.checks.js'));
const AX = await import(J('export.axisvm.js'));
const PY = await import(J('export.pynite.js'));
const R = await import(J('render.3d.js'));
const S = await import(J('ui.schema.js'));
const BE = await import(J('export.bericht.js'));
const NB = await import(J('export.nachweisbericht.js'));

const daten = (f) => JSON.parse(readFileSync(join(HIER, DATEN, f), 'utf8'));
T.setzeDatenbank(daten('tragjoche.json'));
// J90, wo es ihn gibt; sonst der erste Typ des Sortiments (Testdaten).
const TYP = T.tragjoche().some((t) => t.typ === 'J90') ? 'J90' : T.tragjoche()[0].typ;
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
  const w = S.typUebernehmen({ ...std(), typ: TYP }, T.getTragjoch(TYP));
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
  // Der Satz der App: mit den Jochkraeften der Nachbarn am geteilten Masten.
  const w = NACH.rechensatzMitNachbarn(w0);
  const art = C.tragwerksart(w).key;
  const ohneJoch = art === 'einzelmast';
  console.log(`\n=== ${name}  (${art}, ${C.anzahlTragwerke(w0)} Tragwerk(e)) ===`);

  const jd = ohneJoch ? null : T.getTragjoch(w.typ ?? TYP);
  const pOG = ohneJoch ? null : P.getProfil(w.profOG);
  const pUG = ohneJoch ? null : P.getProfil(w.profUG);
  const stahl = P.getStahl(w.stahl);
  const zeig = (was, text) => console.log(`  ${was.padEnd(17)}${text}`);

  const erg = versuch(name, 'berechne', () => V.berechne(w, pOG, pUG, stahl, jd));
  if (!erg.ok) continue;
  zeig('rechnen', `η = ${erg.r.max.etaGesamt.toFixed(3)}`
    + `  ·  ${erg.r.knoten.length} Knoten`);
  // Nicht nur «bricht nicht»: eine Zahl, die keine ist, ist auch ein Bruch.
  if (!(erg.r.max.etaGesamt > 0) || !Number.isFinite(erg.r.max.etaGesamt)) {
    befunde.push({ fall: name, weg: 'berechne', text: `η = ${erg.r.max.etaGesamt}` });
  }

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

  /* =========================================================================
   * >>> DER WEG DER ANWENDUNG, NICHT DER KURZE. <<<
   * =========================================================================
   *
   * Oben steht `AX.stabmodell(erg.modell)` - das Modell fertig in der Hand.
   * Die Anwendung geht anders: `app.axisvm.js` baut `deps` aus `erg.modell`
   * und laesst die Ausleitung das Modell SELBST holen. Am Einzelmasten
   * fuehrt `erg.modell` keine Gurtprofile, und genau dort brach die
   * COM-Ausleitung am 20. September ab («Cannot read properties of
   * undefined (reading 'aH')»), waehrend dieser Durchgang gruen blieb.
   */
  const depsApp = {
    berechne: V.berechne, modell: V.modell,
    profOG: erg.r.modell.profOG, profUG: erg.r.modell.profUG,
    stahl: erg.r.modell.stahl, joch: erg.r.modell.joch,
    modellVon: (satz) => V.modell({ ...satz, beiwerteFest: null },
      P.getProfil(satz.profOG), P.getProfil(satz.profUG),
      P.getStahl(satz.stahl), T.getTragjoch(satz.typ)),
  };
  const com = versuch(name, 'COM-Ausleitung (Weg der Anwendung)', () => {
    const mApp = depsApp.modell({ ...w, beiwerteFest: null },
      depsApp.profOG, depsApp.profUG, depsApp.stahl, depsApp.joch);
    return AX.stabmodellJson(mApp, { knotenmodell: 'anschnitt', eingabe: w,
      bau: AX.blattWennMehrere(w, depsApp, { knotenmodell: 'anschnitt' }) });
  });
  if (com.ok) {
    zeig('com-json', `${com.r.knoten.length} Knoten, ${com.r.staebe.length} Stäbe`
      + `, ${com.r.lastfaelle.length} Lastfälle, ${com.r.kombinationen.length} Kombinationen`);
    /*
     * >>> IST DIE DATEI IN SICH STIMMIG? (20. September) <<<
     *
     * Gemeldet mit dem Auflagerdialog aus AxisVM: «der masten soll
     * eingespannt sein». Die beiden Einzelmastfuesse trugen yy = 0 und
     * zz = 0 - ein Gelenk statt einer Einspannung, und niemand sah es der
     * Datei an. Geprueft wird deshalb, was ein Modell tragfaehig macht:
     * jeder Mastfuss eingespannt, jede Last auf einem Stab, den es gibt,
     * jeder Stab auf einem Querschnitt, den es gibt.
     */
    const dat = com.r;
    const knotenN = new Set(dat.knoten.map((k) => k.name));
    const staebeN = new Set(dat.staebe.map((st) => st.name));
    const qsN = new Set(dat.querschnitte.map((q) => q.name));
    const festN = (x) => ['ux', 'uy', 'uz', 'fix', 'fiy', 'fiz'].every((f2) => x[f2] === 'Rigid');
    const lose = (dat.auflager ?? []).filter((x) => x.modell === 'mast' && !festN(x));
    if (lose.length) {
      befunde.push({ fall: name, weg: 'COM-Ausleitung',
        text: `${lose.length} Mastfuss/Mastfuesse nicht eingespannt: `
            + lose.map((x) => `${x.knoten} fiy ${x.fiy} fiz ${x.fiz}`).join(', ') });
    }
    const zeigtInsLeere = [
      ...dat.lasten.punkt.filter((l) => !knotenN.has(l.knoten)).map((l) => `Punktlast ${l.knoten}`),
      ...dat.lasten.strecke.filter((l) => !staebeN.has(l.stab)).map((l) => `Strecke ${l.stab}`),
      ...dat.staebe.filter((st) => !knotenN.has(st.von) || !knotenN.has(st.bis)).map((st) => `Stab ${st.name}`),
      ...dat.staebe.filter((st) => !qsN.has(st.querschnitt)).map((st) => `QS ${st.querschnitt}`),
    ];
    if (zeigtInsLeere.length) {
      befunde.push({ fall: name, weg: 'COM-Ausleitung',
        text: `${zeigtInsLeere.length} Verweise ins Leere: ${zeigtInsLeere.slice(0, 3).join(', ')}` });
    }
    zeig('com-probe', `${(dat.auflager ?? []).length} Auflager, alle Verweise `
      + `${zeigtInsLeere.length ? 'NICHT ' : ''}stimmig`);
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
  const kombi = versuch(name, 'vergleichKombinationen', () =>
    V.vergleichKombinationen(w, pOG, pUG, stahl, jd));
  if (kombi.ok) {
    const hk = kombi.r.huellkurve ?? erg.r;
    const eta = ohneJoch ? hk.mast?.A?.etaMitStabilitaet : hk.max?.etaGesamt;
    zeig('kombinationen', `${kombi.r.lastfaelle.length} Fälle, η Hüllkurve ${Number(eta).toFixed(3)}`);
    if (!Number.isFinite(eta)) {
      befunde.push({ fall: name, weg: 'vergleichKombinationen', text: `η Hüllkurve = ${eta}` });
    }
    /*
     * DER NACHWEISBERICHT - der Weg, den die Abgabe geht. Er rechnet nicht
     * selbst; ein «NaN» oder «undefined» im Text heisst, dass ein Wert des
     * Kerns fehlt, den er erwartet.
     */
    const nb = versuch(name, 'nachweisbericht', () => {
      const ck2 = ck.ok ? ck.r : [];
      const urteil = CH.urteilKonstruktion(ck2, w.nachweise, art);
      const bem = CH.mitBauteilen(hk, erg.r, { mastErsatz: true });
      urteil.bauteile = CH.bauteilUrteil(bem, w.nachweise, art);
      return NB.nachweisbericht({ werte: w, erg: bem, kombi: kombi.r, checks: ck2, urteil,
        hinweise: h.ok ? h.r : [], fassung: 'Durchlauf', datum: '-', bilder: {} });
    });
    if (nb.ok) {
      const text = nb.r.replace(/<[^>]*>/g, ' ');
      const schlecht = ['NaN', 'undefined', '[object Object]'].filter((x) => text.includes(x));
      zeig('nachweisbericht', `${Math.round(nb.r.length / 1024)} kB${schlecht.length ? ' - ' + schlecht.join(', ') : ''}`);
      if (schlecht.length) {
        befunde.push({ fall: name, weg: 'nachweisbericht', text: `enthaelt ${schlecht.join(', ')}` });
      }
    }
  }

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
  /*
   * DER BLATTWEG, nicht der Einzelweg.
   *
   * `stabmodell` baut EIN Tragwerk. Seit dem 2. September gibt es
   * `stabmodellBlatt`, das alle Tragwerke des Querprofils zusammenfuehrt und
   * die geteilten Masten verschmelzen laesst. Geprueft wird der Weg, den die
   * Ausleitung wirklich geht.
   */
  const deps = { modellVon: (satz) => V.modell(satz,
    P.getProfil(satz.profOG), P.getProfil(satz.profUG),
    P.getStahl(satz.stahl), T.getTragjoch(satz.typ)) };
  const bau2 = AX.stabmodellBlatt(w0, deps, { knotenmodell: 'anschnitt' });
  const xs = [...bau2.knoten.values()].map((k) => k.x);
  const masten = C.mastenVon(w0).map((x) => x.x);
  const soll = [Math.min(...masten), Math.max(...masten)];
  const ist = [Math.min(...xs), Math.max(...xs)];
  console.log(`  Masten auf dem Blatt : x = ${masten.map((x) => x.toFixed(1)).join(', ')}`);
  const fuesse = [...bau2.knoten.keys()].filter((n) => /^MAST_.*_F$/.test(n));
  console.log(`  Mastfuesse im Modell : ${fuesse.length} (${fuesse.join(', ')})`);
  console.log(`  Auflager             : ${bau2.auflager.length}`);
  if (fuesse.length !== masten.length) {
    befunde.push({ fall: 'Jochreihe', weg: 'Ausleitung',
      text: `${fuesse.length} Mastfuesse fuer ${masten.length} Masten - `
          + `der geteilte Mast ist nicht verschmolzen` });
  }
  if (bau2.blatt?.widerspruch?.length) {
    befunde.push({ fall: 'Jochreihe', weg: 'Ausleitung',
      text: `${bau2.blatt.widerspruch.length} Knoten mit widerspruechlichen `
          + `Koordinaten` });
  }
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
