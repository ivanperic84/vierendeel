/**
 * core.unterbau.js
 * ---------------------------------------------------------------------------
 * DER UNTERBAU IM ERSATZBALKEN (12. Oktober).
 *
 * Weisung: «ziehe das mit der perronstütze auch beim balkenmodell mit». Im
 * Stabwerk steht der Unterbau als Stäbe unter dem Mastfuss
 * (export.axisvm.unterbau.js). Der Ersatzbalken rechnet den Masten als
 * Kragarm, am Fuss eingespannt; seine Schnittgrössen sind statisch bestimmt
 * und gelten am Übergang unverändert. Was der Unterbau ändert, ist die
 * STEIFIGKEIT:
 *
 *   1. die Drehfeder am Jochende (c_φ = Faktor · E·I/H) - ein Mast auf
 *      nachgiebigem Fuss hält das Joch weniger fest;
 *   2. die Verformung des Masten (Gebrauchstauglichkeit) - zum Weg des
 *      Kragarms kommt die Bewegung des Fusses: w(z) = w_F + φ_F · z.
 *
 * Beides aus der NACHGIEBIGKEIT des Unterbaus am Übergang, je Ebene eine
 * 2×2-Matrix (Weg und Verdrehung unter Querkraft und Moment). Sie kommt aus
 * dem eigenen Löser - dieselbe Modellierung wie im Stabwerk (dieselbe
 * Funktion baut die Stäbe), nur allein: Einheitslasten am Übergang, die
 * Wege abgelesen. Ein zweiter, von Hand hergeleiteter Rahmen wäre eine
 * zweite Wahrheit.
 *
 * Vorzeichen wie `mastVerschiebungen`: in jeder Ebene zählen Kraft und Weg
 * in dieselbe Richtung, das Moment wie F · Hebel (dreht den Kopf in die
 * Richtung der Kraft).
 * ---------------------------------------------------------------------------
 */
import { unterbauEinsetzen } from './export.axisvm.unterbau.js';
import { loese } from './core.stabwerk.js';
import { unterbauVon, unterbauHoehe } from './data.unterbau.js';

const ablage = new Map();

/**
 * Nachgiebigkeit des Unterbaus am Übergang.
 *
 * @returns {{x: {ww, wt, tw, tt}, y: {…}, hoehe}|null}  m/kN, rad/kN, m/kNm, rad/kNm
 */
export function unterbauNachgiebigkeit(roh, fuss = 0) {
  const u = unterbauVon(roh);
  if (!u) return null;
  const h = unterbauHoehe(u, fuss);
  if (!(h > 0)) return null;
  const k = JSON.stringify([u, h]);
  if (ablage.has(k)) return ablage.get(k);
  const P = 'MAST_X_F';
  const lf = ['Fx', 'My', 'Fy', 'Mx'];
  const basis = {
    material: { E: 210000, G: 81000, rho: 0 },
    querschnitte: [], knoten: [{ name: P, x: 0, y: 0, z: 0 }], staebe: [],
    auflager: [{ knoten: P, ux: 'Rigid', uy: 'Rigid', uz: 'Rigid', fix: 'Rigid', fiy: 'Rigid', fiz: 'Rigid' }],
    lastfaelle: lf.map((key) => ({ key })),
    lasten: {
      punkt: [{ knoten: P, richtung: 'X', wert: 1, lastfall: 'Fx' },
              { knoten: P, richtung: 'Y', wert: 1, lastfall: 'Fy' }],
      // Moment im Sinn «F · Hebel»: in x um +y, in y um −x (siehe Kopf).
      moment: [{ knoten: P, richtung: 'My', wert: 1, lastfall: 'My' },
               { knoten: P, richtung: 'Mx', wert: -1, lastfall: 'Mx' }],
      strecke: [],
    },
    kombinationen: [],
  };
  let erg = null;
  try {
    const dat = unterbauEinsetzen(basis, { X: { ...u, hoehe: h } });
    const lsg = loese(dat, { eigengewicht: false });
    const i = lsg.knotenIdx.get(P);
    const w = (fall, d) => lsg.u.get(fall)[i * 6 + d];
    erg = {
      hoehe: h,
      // Ebene x (quer): Weg ux, Verdrehung fiy.
      x: { ww: w('Fx', 0), tw: w('Fx', 4), wt: w('My', 0), tt: w('My', 4) },
      // Ebene y (längs): Weg uy, Verdrehung −fix (dreht den Kopf nach +y).
      y: { ww: w('Fy', 1), tw: -w('Fy', 3), wt: w('Mx', 1), tt: -w('Mx', 3) },
    };
  } catch {
    erg = null;
  }
  ablage.set(k, erg);
  return erg;
}

/**
 * Verhältnis der Drehfeder am Kopf: Mast auf dem Unterbau gegen Mast fest
 * eingespannt, für EINE Ebene.
 *
 * Mast als Balken (EI, H) auf dem Fuss mit der Nachgiebigkeit F (2×2).
 * Unverschieblich: Kopf seitlich gehalten, Kopfverdrehung 1 → Kopfmoment;
 * verschieblich: Kopf frei. Fest eingespannt gibt das 4 EI/H bzw. EI/H.
 *
 * @returns {{unverschieblich: number, verschieblich: number}} (je ≤ 1)
 */
export function drehfederVerhaeltnis(EI, H, f) {
  if (!f || !(EI > 0) || !(H > 0)) return { unverschieblich: 1, verschieblich: 1 };
  // Steifigkeit des Fusses aus der Nachgiebigkeit (Inverse der 2×2).
  const det = f.ww * f.tt - f.wt * f.tw;
  if (!(Math.abs(det) > 0)) return { unverschieblich: 1, verschieblich: 1 };
  const kb = [[f.tt / det, -f.wt / det], [-f.tw / det, f.ww / det]];
  // Balkenelement, Freiheitsgrade [w_F, φ_F, w_K, φ_K] (Fuss unten, Kopf oben).
  const L = H;
  const a = (12 * EI) / L ** 3, b = (6 * EI) / L ** 2, c = (4 * EI) / L, d = (2 * EI) / L;
  const K = [[a, b, -a, b], [b, c, -b, d], [-a, -b, a, -b], [b, d, -b, c]];
  K[0][0] += kb[0][0]; K[0][1] += kb[0][1]; K[1][0] += kb[1][0]; K[1][1] += kb[1][1];
  // Kopfmoment unter φ_K = 1 bei gegebener Lagerung des Kopfes.
  const kopfMoment = (wKFrei) => {
    const frei = wKFrei ? [0, 1, 2] : [0, 1];
    const n = frei.length;
    // A u = -K[frei][3]
    const A = frei.map((r) => frei.map((s) => K[r][s]));
    const rhs = frei.map((r) => -K[r][3]);
    // Gauss
    for (let p = 0; p < n; p += 1) {
      for (let r = p + 1; r < n; r += 1) {
        const m = A[r][p] / A[p][p];
        for (let s = p; s < n; s += 1) A[r][s] -= m * A[p][s];
        rhs[r] -= m * rhs[p];
      }
    }
    const u = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r -= 1) {
      let sm = rhs[r];
      for (let s = r + 1; s < n; s += 1) sm -= A[r][s] * u[s];
      u[r] = sm / A[r][r];
    }
    return frei.reduce((sm, r, i) => sm + K[3][r] * u[i], K[3][3]);
  };
  return { unverschieblich: kopfMoment(false) / c, verschieblich: kopfMoment(true) / (EI / L) };
}

/**
 * Weg und Verdrehung des Fusses unter Querkraft V und Moment M am Übergang
 * (eine Ebene, Vorzeichen wie oben).
 */
export function fussBewegung(f, V, M) {
  if (!f) return { w: 0, phi: 0 };
  return { w: f.ww * V + f.wt * M, phi: f.tw * V + f.tt * M };
}
