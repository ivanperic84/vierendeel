/**
 * core.leiterzug.js - LEITERZUG AUS DER ZUSTANDSGLEICHUNG (22. November).
 *
 * Weisung, im Wortlaut: «den leiterzug berechnungskern einbauen und die
 * leiterzugkräfte nur anhand diesen berechnenen und die weitere
 * nachweisrechnung hinterlegen. die systemauswahl definieren, am besten
 * global für das projekt, da es verschiedene nfl und rfl gibt. die
 * einzelleiter sollen auswählbar sein welche das man unter den anbauteilen
 * auswähl haben will.» - auf die Vorschläge: «Ja, so bauen».
 *
 * Die Formeln sind die des Rechenkerns der Durchhang-App des Auftraggebers
 * (dort «rechenkern.js», nach der Excel «Durchhang 2026»):
 *
 *   EINZELLEITER (fix abgespannt): Zustandsgleichung, parabolische Näherung,
 *     aus dem Montagezug H₁ bei 10 °C über die Spannweite L
 *       q²L²/(24H₂²) − H₂/EA = q₁²L²/(24H₁²) − H₁/EA + α·ΔT
 *     Mit Eislast ist der Ausgangszustand eisfrei (q₁ = q), der Zielzustand
 *     trägt q + Z_L.
 *
 *   KETTENWERK N-FL (Tragseil fix, Fahrdraht nachgespannt): vom unbelasteten
 *     Tragseil bei 10 °C auf den belasteten Bezugszustand bei 10 °C
 *     (gerundet auf 10 N), dann die N-FL-Zustandsgleichung mit dem
 *     Fahrdrahtzug H_Fd zur Temperatur T; gerundet auf 5 N (mit Eis 10 N)
 *     wie die Excel.
 *
 *   KETTENWERK R-FL: Tragseil und Fahrdraht nachgespannt - feste Kraft.
 *
 * Nur Rechnung, keine Daten: die Werte der Leiter und Systeme stehen im
 * Sortiment (data/fl_bauteile.json), Einheiten dort: q [N/m], E [N/mm²],
 * A [mm²], α [1/K], Zugkräfte [kN]. Ergebnis immer in kN.
 */

export const BEZUGSTEMPERATUR = 10;
const runde5 = (x) => Math.round(x / 5) * 5;
const runde10 = (x) => Math.round(x / 10) * 10;

/** Zustandsgleichung des Einzelleiters [N]; q, q1 [N/m], EA [N], α [1/K]. */
export function zustandsgleichung(q, L, H1, EA, alpha, deltaT, q1 = q) {
  const G = (q * L) ** 2 / 24;
  const C = 1 / EA;
  const K = (q1 * L) ** 2 / (24 * H1 * H1) - C * H1 + alpha * deltaT;
  let H = H1;
  // Links vom Minimum des Polynoms divergiert Newton - rechts davon starten.
  if (K < 0) {
    const Hk = -2 * K / (3 * C);
    if (H < Hk) H = Hk * 2;
  }
  for (let i = 0; i < 300; i += 1) {
    const f = C * H ** 3 + K * H ** 2 - G;
    const df = 3 * C * H ** 2 + 2 * K * H;
    if (Math.abs(df) < 1e-20) break;
    const dH = f / df;
    if (H - dH <= 0) { H /= 2; continue; }
    H -= dH;
    if (Math.abs(dH) < 1e-9) break;
  }
  return H;
}

/**
 * N-FL-Zustandsgleichung (Excel, VBA «Upro1»): Tragseilzug [N] bei ΔT.
 * MFL [N/m] Gewicht Ts belastet mit Fd und Klemmen, HF Fahrdrahtzug [N],
 * F0 Ausgangszug [N], E [N/m²], AK [m²], ZL Eislast [N/m], MFL_init Last
 * des Ausgangszustands (für den Schritt unbelastet → belastet).
 */
export function nflZustandsgleichung(MFL, HF, F0, L, AL, E, AK, deltaT, ZL = 0, MFL_init = null) {
  const q0 = MFL_init !== null ? MFL_init : MFL;
  const gk0 = q0 / F0;
  const C = 1 / (E * AK);
  const G = 24 / (L * L) + gk0 * gk0;
  const A = (MFL + ZL) + q0 * HF / F0;
  let x = F0;
  for (let i = 0; i < 300; i += 1) {
    const gkx = A / (HF + x);
    const f = gkx * gkx - gk0 * gk0 - G * (AL * deltaT + (x - F0) * C);
    const df = -2 * A * A / (HF + x) ** 3 - G * C;
    if (Math.abs(df) < 1e-30) break;
    const dx = f / df;
    x -= dx;
    if (x < 1) x = 1;
    if (Math.abs(dx) < 1e-6) break;
  }
  return x;
}

/**
 * Zug eines fix abgespannten Einzelleiters [kN] bei T [°C].
 * @param {object} l  {q [N/m], alpha, E [N/mm²], AK [mm²], H10 [kN]}
 * @param {number} L  Spannweite [m]
 * @param {number} zl Eislast [kN/m]
 */
export function einzelleiterZug(l, L, T, zl = 0) {
  const EA = l.E * 1e6 * l.AK * 1e-6;
  const H = zustandsgleichung(l.q + zl * 1000, L, l.H10 * 1000, EA, l.alpha,
                              T - BEZUGSTEMPERATUR, l.q);
  return H / 1000;
}

/**
 * Tragseilzug eines N-FL-Kettenwerks [kN] bei T [°C].
 * @param {object} s {MFL, MTS [N/m], E [N/mm²], AL [1/K], AK [mm²],
 *                    hTsUb, hFd [kN]}
 */
export function nflTragseilZug(s, L, T, zl = 0) {
  const E = s.E * 1e6, AK = s.AK * 1e-6;
  const bezug = runde10(nflZustandsgleichung(s.MFL, 0, s.hTsUb * 1000, L, s.AL, E, AK,
                                              0, 0, s.MTS));
  const H = nflZustandsgleichung(s.MFL, s.hFd * 1000, bezug, L, s.AL, E, AK,
                                 T - BEZUGSTEMPERATUR, zl * 1000, null);
  return (zl > 0 ? runde10(H) : runde5(H)) / 1000;
}

/** Tragseil- und Fahrdrahtzug eines Kettenwerks [kN] bei T. */
export function kettenwerkZug(s, L, T, zl = 0) {
  if (s.art === 'rfl') return { ts: s.hTs, fd: s.hFd };
  return { ts: nflTragseilZug(s, L, T, zl), fd: s.hFd };
}
