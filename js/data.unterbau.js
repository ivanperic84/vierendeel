/**
 * data.unterbau.js
 * ---------------------------------------------------------------------------
 * DER MAST AUF EINER PERRONDACHKONSTRUKTION (12. Oktober).
 *
 * Frage des Auftraggebers: «einige masten stehen auf perrondachkonstruktionen
 * diese haben meist stützen die steifer sind als die FL Masten, man muss dann
 * reaktionskräfte berechnen, auf höhe Mastfuss FL. wenn man dann aber den
 * Mastfuss auf die geforderte höhe schiebt wird diese mast überproportional
 * steif in bezug auf den restlichen Masten in der Jochreihe die bis auf
 * Terrainhohe gehen.» Vorschlag (Stütze als Verlängerung des Masten nach
 * unten, Kräfte am Übergang), darauf im Wortlaut: «vorschlag umsetzen. mach
 * vorschlagswerte auswählbar. mann kennt zum teil den genauen querschnitt der
 * Perronkonstruktionstüzte nicht, und zum teil liegt der Mast FL auf einen
 * querbalken der wiederum auf zwei Sützen lagert.»
 *
 * Hier stehen die Vorschlagswerte und die Querschnitte, die daraus in die
 * Modelldatei gehen. NORMWERTE gehören zum Code (wie das UNP der Anker);
 * die Walzprofile kommen aus dem Sortiment der Masten bzw. der Normtabelle.
 *
 * >>> BETON UND FREIE WERTE ALS ERSATZRECHTECK AUS STAHL. <<< Das Stabwerk
 * und die AxisVM-Datei kennen EIN Material (Stahl). Eine Betonstütze geht als
 * Stahlquadrat mit derselben Biegesteifigkeit hinein: a_eq = a · (E_c/E_s)^¼
 * (E_c = 33 000 N/mm², C30/37 ungerissen). Die Längssteifigkeit ist damit zu
 * gross (√(E_c/E_s)-fach statt E_c/E_s) - für die Biegung des Masten ohne
 * Belang. Freie Werte: das Rechteck mit genau I_y und I_z; A und I_t rechnet
 * der eigene Löser wie eingegeben, AxisVM baut das Rechteck.
 * ---------------------------------------------------------------------------
 */
import { getMastprofil } from './data.masten.js';
import { normen } from './data.normen.js';

/** E-Modul von Stahl und Beton [N/mm²] für das Ersatzrechteck. */
export const E_STAHL = 210000;
export const E_BETON = 33000;

/** Die Arten des Unterbaus. */
export const UNTERBAU_ARTEN = [
  { key: 'stuetze', titel: 'Einzelstütze unter dem Masten' },
  { key: 'riegel', titel: 'Querbalken auf zwei Stützen' },
];

/**
 * Vorschlagswerte der Stütze - wenn der Querschnitt nicht bekannt ist, eine
 * Stufe wählen (leicht / mittel / schwer), sonst den bekannten.
 */
export const STUETZEN_VORSCHLAEGE = [
  { key: 'HEB 200', titel: 'Stahl leicht · HEB 200', art: 'walz' },
  { key: 'HEB 240', titel: 'Stahl mittel · HEB 240', art: 'walz' },
  { key: 'HEB 260', titel: 'Stahl mittel · HEB 260', art: 'walz' },
  { key: 'HEM 240', titel: 'Stahl schwer · HEM 240', art: 'walz' },
  { key: 'ROHR 219x8', titel: 'Stahlrohr ⌀ 219.1 × 8', art: 'rohr', d: 219.1, t: 8 },
  { key: 'ROHR 273x10', titel: 'Stahlrohr ⌀ 273 × 10', art: 'rohr', d: 273, t: 10 },
  { key: 'ROHR 324x10', titel: 'Stahlrohr ⌀ 323.9 × 10', art: 'rohr', d: 323.9, t: 10 },
  { key: 'BETON 30', titel: 'Beton 30 × 30 cm (ungerissen)', art: 'beton', a: 300 },
  { key: 'BETON 40', titel: 'Beton 40 × 40 cm (ungerissen)', art: 'beton', a: 400 },
  { key: 'frei', titel: 'Werte frei eingeben', art: 'frei' },
];

/** Vorschlagswerte des Querbalkens. */
export const RIEGEL_VORSCHLAEGE = [
  { key: 'IPE 300', titel: 'Stahl leicht · IPE 300', art: 'norm' },
  { key: 'IPE 360', titel: 'Stahl mittel · IPE 360', art: 'norm' },
  { key: 'HEB 240', titel: 'Stahl mittel · HEB 240', art: 'walz' },
  { key: 'HEB 260', titel: 'Stahl schwer · HEB 260', art: 'walz' },
  { key: 'BETON 40', titel: 'Beton 40 × 40 cm (ungerissen)', art: 'beton', a: 400 },
  { key: 'frei', titel: 'Werte frei eingeben', art: 'frei' },
];

/** Vorgaben eines neuen Unterbaus. */
export const UNTERBAU_VORGABE = {
  an: false, art: 'stuetze', hoehe: null, stuetze: 'HEB 260', steg: 'quer',
  lagerung: 'eingespannt', frei: null,
  riegel: { profil: 'IPE 360', spannweite: 6, lage: null, richtung: 'quer', frei: null,
            // «gehalten» (Vorgabe, Rückfrage 12. Oktober) oder «profil».
            torsion: 'gehalten' },
};

/** Der Unterbau eines Masten mit Vorgaben ergänzt; null, wenn keiner. */
export function unterbauVon(u) {
  if (!u || u.an !== true) return null;
  return { ...UNTERBAU_VORGABE, ...u,
           riegel: { ...UNTERBAU_VORGABE.riegel, ...(u.riegel ?? {}) } };
}

const r6 = (v) => Math.round(v * 1e6) / 1e6;
const rechteckIt = (b, h) => {
  const a = Math.max(b, h), c = Math.min(b, h);
  return a * c ** 3 * (1 / 3 - 0.21 * (c / a) * (1 - (c / a) ** 4 / 12));
};

/** Ein Rechteck aus Stahl, m-Werte; b in lokal y, h in lokal z (mm). */
function rechteckQs(name, b, h, werte = null) {
  const bm = b / 1000, hm = h / 1000;
  return { name, art: 'Parametric', form: 'Rectangle', parameter: [r6(b), r6(h)],
           A: werte?.A ?? bm * hm, Iy: werte?.Iy ?? (bm * hm ** 3) / 12,
           Iz: werte?.Iz ?? (hm * bm ** 3) / 12, It: werte?.It ?? rechteckIt(bm, hm) };
}

/**
 * Der Querschnitt der Modelldatei zu einem Vorschlag.
 *
 * @param {string} key   Schlüssel aus STUETZEN_ bzw. RIEGEL_VORSCHLAEGE
 * @param {object} frei  { A [cm²], Iy, Iz, It [cm⁴] } für «frei»
 * @param {string} rolle 'S' (Stütze) oder 'R' (Riegel) - für den Namen
 * @returns {object} Querschnitt (m², m⁴), dazu `titel`
 */
export function unterbauQuerschnitt(key, frei, rolle = 'S') {
  const liste = rolle === 'R' ? RIEGEL_VORSCHLAEGE : STUETZEN_VORSCHLAEGE;
  const v = liste.find((x) => x.key === key) ?? liste.find((x) => x.key === (rolle === 'R' ? 'IPE 360' : 'HEB 260'));
  const name = `UB_${rolle}_${v.key.replace(/[^A-Za-z0-9]+/g, '')}`;
  if (v.art === 'walz') {
    const p = getMastprofil(v.key);
    if (!p) throw new Error(`Unterbau: ${v.key} steht nicht im Sortiment der Masten.`);
    const rest = p.A * 100 - 2 * p.b * p.tf - (p.h - 2 * p.tf) * p.tw;
    const R = rest > 0 ? Math.sqrt(rest / (4 - Math.PI)) : 0;
    return { name, titel: v.titel, art: 'Parametric', form: 'I', profil: v.key,
             parameter: [p.h, p.b, p.tw, p.tf, r6(R)],
             A: p.A / 1e4, Iy: p.Iy / 1e8, Iz: p.Iz / 1e8, It: p.It / 1e8 };
  }
  if (v.art === 'norm') {
    const p = (normen()?.walzprofile ?? []).find((x) => x.name === v.key);
    if (!p) throw new Error(`Unterbau: ${v.key} steht nicht in der Normtabelle.`);
    const rest = p.A - 2 * p.b * p.tf - (p.h - 2 * p.tf) * p.tw;
    const R = rest > 0 ? Math.sqrt(rest / (4 - Math.PI)) * 10 : 0;
    return { name, titel: v.titel, art: 'Parametric', form: 'I', profil: v.key,
             parameter: [p.h * 10, p.b * 10, p.tw * 10, p.tf * 10, r6(R)],
             A: p.A / 1e4, Iy: p.Iy / 1e8, Iz: p.Iz / 1e8, It: p.It / 1e8 };
  }
  if (v.art === 'rohr') {
    const D = v.d / 1000, d = (v.d - 2 * v.t) / 1000;
    const I = (Math.PI / 64) * (D ** 4 - d ** 4);
    return { name, titel: v.titel, art: 'Parametric', form: 'Pipe', parameter: [v.d, v.t],
             A: (Math.PI / 4) * (D ** 2 - d ** 2), Iy: I, Iz: I, It: 2 * I };
  }
  if (v.art === 'beton') {
    const aEq = v.a * (E_BETON / E_STAHL) ** 0.25;
    return { ...rechteckQs(name, aEq, aEq), titel: `${v.titel}, als Stahlquadrat ${aEq.toFixed(0)} mm` };
  }
  // Frei: das Rechteck mit genau I_y und I_z (für AxisVM), A und I_t wie eingegeben.
  const A = Number(frei?.A) / 1e4, Iy = Number(frei?.Iy) / 1e8, Iz = Number(frei?.Iz) / 1e8;
  const It = Number(frei?.It) > 0 ? Number(frei.It) / 1e8 : null;
  if (!(A > 0 && Iy > 0 && Iz > 0)) {
    throw new Error(`Unterbau: für «frei» A, I_y und I_z eingeben (${rolle === 'R' ? 'Querbalken' : 'Stütze'}).`);
  }
  // b h³ = 12 Iy, h b³ = 12 Iz  ->  h/b = √(Iy/Iz), b h = √(12 √(Iy Iz))
  const bh = Math.sqrt(12 * Math.sqrt(Iy * Iz));
  const verh = Math.sqrt(Iy / Iz);
  const b = Math.sqrt(bh / verh) * 1000, h = Math.sqrt(bh * verh) * 1000;
  const qs = rechteckQs(name + '_' + Math.round(Iy * 1e8), b, h, { A, Iy, Iz, It: It ?? undefined });
  return { ...qs, titel: `frei: A ${Number(frei.A)} cm², I_y ${Number(frei.Iy)}, I_z ${Number(frei.Iz)} cm⁴` };
}

/**
 * Die Höhe der Stütze: eingetragen, sonst der Fussversatz des Masten.
 * null, wenn keine Höhe bekannt ist.
 */
export function unterbauHoehe(u, fuss) {
  const h = Number(u?.hoehe);
  if (h > 0) return h;
  const f = Number(fuss);
  return f > 0 ? f : null;
}
