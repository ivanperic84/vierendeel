/**
 * testdaten/erzeuge.mjs
 * ---------------------------------------------------------------------------
 * EIN FREI ERFUNDENER DATENSATZ FUER DEN RAUCHTEST (Durchsicht vom
 * 18. September, Punkt A3; Entscheid vom 19. September: Datensatz,
 * Rauchtest und CI, oeffentlich).
 *
 * Der Pruefstand braucht die Sortimente des Betreibers (data/*.json) und
 * laeuft deshalb nur auf dem Rechner, auf dem sie liegen. Dieser Datensatz
 * ersetzt sie fuer einen DURCHGANG durch alle Wege - Rechnung, Szene,
 * Ausleitung, Bericht -, nicht fuer die gemessenen Zahlen des Pruefstands.
 *
 * >>> KEINE ZAHL STAMMT AUS DEN UNTERLAGEN DES BETREIBERS. <<<
 *
 * Die Werte sind runde Werkstattgroessen, von Hand gesetzt: ein Joch von
 * 460 mm Hoehe aus L 80x80x8, Bleche von 8 bis 10 mm, Lasten in der
 * Groessenordnung, in der eine Fahrleitung liegt. Sie beschreiben kein
 * Bauteil, das es gibt, und sie taugen nicht zur Bemessung. Die Namen
 * tragen deshalb «TEST».
 *
 * Profile und Stahlgueten kommen aus data/normen.json - die sind Normwerte
 * und liegen ohnehin in der Ablage.
 *
 * Aufruf:   node testdaten/erzeuge.mjs
 * ---------------------------------------------------------------------------
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const schreibe = (name, obj) =>
  writeFileSync(join(HIER, name), JSON.stringify(obj, null, 1) + '\n', 'utf8');
const HINWEIS = 'Frei erfundener Testdatensatz (testdaten/erzeuge.mjs) - kein Bauteil, '
  + 'nicht zur Bemessung.';

/* --- Tragjoch -------------------------------------------------------------- */
const gurt = { profil: 'L 80x80x8', ja: 80, jf: 8, jba: 300, jbb: 400 };
schreibe('tragjoche.json', {
  _beschreibung: HINWEIS,
  typen: [{
    typ: 'TEST-80',
    quelle: { zeichnung: 'erfunden', index: '-', schema: '-' },
    geprueft: false,
    jd: 460, jk: 300, jkk: 700, gewicht: 45, teilung: 800,
    laengeKurz: [8, 12], laengeNorm: [12, 22],
    og: { ...gurt }, ug: { ...gurt },
    schnee: { 0.9: 0.2, 1.25: 0.3 },
    wind: { 0.9: 0.25, 1.1: 0.3, 1.3: 0.36 },
    staffelung_geprueft: false,
    bauweise: 'neu',
    bleche: {
      vertikal: [
        { pos: 1, breite: 120, dicke: 10, laenge: 300, material: 'S235JRG2' },
        { pos: 2, breite: 80, dicke: 8, laenge: 300, material: 'S235JRG2' },
      ],
      horizontal: [
        { pos: 3, breite: 120, dicke: 10, laenge: 140, zone: 'auflager', material: 'S235JRG2' },
        { pos: 4, breite: 100, dicke: 8, laenge: 240, zone: 'feld', material: 'S235JRG2' },
        { pos: 5, breite: 80, dicke: 8, laenge: 240, zone: 'feld', material: 'S235JRG2' },
      ],
    },
    staffelung: {
      vertikal: [{ pos: 1, anzahl: 3 }, { pos: 2, anzahl: null }],
      horizontal: [{ pos: null, anzahl: 1 }, { pos: 3, anzahl: 2 },
                   { pos: 4, anzahl: 3 }, { pos: 5, anzahl: null }],
    },
  }],
});

/* --- Masten: Wind je Profil und Einwirkungsklasse [kN/m] ------------------ */
const mastwind = (q) => ({
  quer: { EK1: q, EK2: +(q * 1.2).toFixed(2), EK3: +(q * 1.45).toFixed(2) },
  laengs: { EK1: +(q * 0.9).toFixed(2), EK2: +(q * 1.1).toFixed(2), EK3: +(q * 1.3).toFixed(2) },
});
schreibe('masten.json', {
  _beschreibung: HINWEIS,
  typen: [{ profil: 'HEB 240', wind: mastwind(0.3) },
          { profil: 'HEB 260', wind: mastwind(0.32) }],
});

/* --- Fahrleitungsteile ----------------------------------------------------- */
const wind3 = (a, b, c) => ({ EK0: null, EK1: a, EK2: b, EK3: c });
const reglage = (z) => ({
  // Leiterzug ueber der Temperatur, erfunden: bei Kaelte etwas mehr.
  temps: [-30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30],
  vals: [-30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30]
    .map((t) => +(z * (1 + (10 - t) * 0.004)).toFixed(2)),
  zusatz: { T: -5, lasten: [0, 1], vals: [z, +(z * 1.2).toFixed(2)] },
});
schreibe('fl_bauteile.json', {
  _beschreibung: HINWEIS,
  gruppen: [{ id: 'anbauteil', titel: 'Anbauteile' }, { id: 'drahtwerk', titel: 'Drahtwerk' }],
  bauteile: [
    { id: 'test-haengestuetze', gruppe: 'anbauteil', name: 'Test-Hängestütze',
      einheit: 'kN', eigengewicht: 0.3, windQuer: wind3(0.05, 0.06, 0.07),
      windLaengs: wind3(0.05, 0.06, 0.07), rolle: 'traeger' },
    { id: 'test-traverse', gruppe: 'anbauteil', name: 'Test-Traverse',
      einheit: 'kN/m', eigengewicht: 0.15, windQuer: wind3(null, null, null),
      windLaengs: wind3(0.1, 0.12, 0.14), rolle: 'aufbau' },
    { id: 'drahtwerk-test-fl', gruppe: 'drahtwerk', name: 'Test-Fahrleitung',
      einheit: 'kN/m', eigengewicht: 0.02, windQuer: wind3(0.012, 0.015, 0.018),
      windLaengs: wind3(null, null, null), leiterzug: 20, reglage: reglage(20),
      rolle: 'drahtwerk' },
    { id: 'drahtwerk-test-leiter', gruppe: 'drahtwerk', name: 'Test-Leiter',
      einheit: 'kN/m', eigengewicht: 0.01, windQuer: wind3(0.008, 0.01, 0.012),
      windLaengs: wind3(null, null, null), leiterzug: 8, reglage: reglage(8),
      rolle: 'drahtwerk' },
  ],
});

/* --- Anbauteil-Vorlagen ---------------------------------------------------- */
// Die IDs sind die, die der Code beim Namen ruft (Vorlage des neuen Jochs,
// des Einzelmasts); Bauteile und Zahlen sind die erfundenen von oben.
schreibe('anbauteile.json', {
  _beschreibung: HINWEIS,
  vorlagen: [
    { id: 'hs-fahrdraht', name: 'Hängestütze mit Fahrleitung', farbe: 'haengend',
      beschreibung: 'Test', raster: 0.4, befestigung: 'durchgehend',
      gruppe: 'haengestuetze', rang: 1,
      module: [{ bauteil: 'test-haengestuetze', anzahl: 1, laenge: null, z: -1.2, y: 0 },
               { bauteil: 'drahtwerk-test-fl', anzahl: 1, laenge: null, z: -2.4, y: 0,
                 umlenkung: true }] },
    { id: 'leiter-traverse', name: 'Leiter-Traverse', farbe: 'aufbau',
      beschreibung: 'Test', raster: 0.6, befestigung: 'oben', gruppe: 'leiter', rang: 2,
      module: [{ bauteil: 'test-traverse', anzahl: 1, laenge: 1, z: 0.35, y: 0 },
               { bauteil: 'drahtwerk-test-leiter', anzahl: 1, laenge: null, z: 0.35, y: 0,
                 umlenkung: true }] },
    { id: 'leiter-rl', name: 'Leiter RL (Rückleiter)', farbe: 'leiter',
      beschreibung: 'Test', raster: 0.4, befestigung: 'unten', gruppe: 'leiter', rang: 3,
      module: [{ bauteil: 'drahtwerk-test-leiter', anzahl: 1, laenge: null, z: -0.35, y: 0,
                 umlenkung: true }] },
    // Nach Ort getrennt (19. September): eine Vorlage nur fuer den Masten.
    { id: 'test-mast-leiter', name: 'Test-Leiter am Mast', farbe: 'seitlich',
      beschreibung: 'Test', raster: 0, befestigung: 'unten', gruppe: 'mast', rang: 2,
      ort: 'mast',
      module: [{ bauteil: 'test-traverse', anzahl: 1, laenge: 1, z: 0, y: 0, x: 0.5 },
               { bauteil: 'drahtwerk-test-leiter', anzahl: 1, laenge: null, z: 0, y: 0,
                 x: 1.0, umlenkung: true }] },
    { id: 'frei', name: 'Frei definiert', farbe: 'frei', beschreibung: 'Test',
      raster: 0, befestigung: 'unten', gruppe: 'frei', rang: 9, module: [] },
  ],
});

console.log('Testdaten geschrieben:', HIER);
