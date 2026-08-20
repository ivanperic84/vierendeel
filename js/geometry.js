/**
 * geometry.js
 * ---------------------------------------------------------------------------
 * GEOMETRIEMODUL. Reine Geometrie, kein SVG, kein DOM.
 * Liefert Polygone und Rechtecke in Modellkoordinaten [mm].
 *
 * Koordinatensystem Querschnitt:   y nach rechts (+),  z nach oben (+)
 * Ursprung = Mitte des Querschnitts.
 *
 * BAUART TRAGJOCH (Schnitt A-A der Konstruktionszeichnung)
 * ---------------------------------------------------------------
 * Vier Winkel in den Ecken. Der LIEGENDE Schenkel zeigt nach AUSSEN und bildet
 * mit seiner Aussenfläche die Ober- bzw. Unterkante des Jochs (Mass jd). Der
 * STEHENDE Schenkel zeigt nach INNEN; seine Innenfläche begrenzt die lichte
 * Breite (Mass jbb - 2*ja). Die Ferse liegt damit oben bzw. unten aussen.
 *
 * Die Bindebleche liegen in der FLUCHT DER SCHENKEL:
 *   - zwei Bleche in den Vertikalebenen, an den stehenden Schenkeln
 *   - zwei Bleche in den Horizontalebenen, an den liegenden Schenkeln
 * Gerechnet werden sie idealisiert auf Höhe der Profilschwerpunkte; gezeichnet
 * werden sie in der tatsächlichen Schenkelflucht, damit die Verträglichkeit
 * sichtbar wird (siehe warnungen[]).
 *
 * AUFBAU EINES ECKWINKELS
 * Ausgangspunkt ist die FERSE, nicht der Schwerpunkt: nur so liegen die
 * Aussenflächen bei ungleichen Profilen für Ober- und Untergurt (J100-J130)
 * automatisch bündig, wie es die Zeichnung verlangt.
 * ---------------------------------------------------------------------------
 */

import { U } from './core.constants.js';

/**
 * Ausrichtung eines Winkels, beschrieben über die Richtung der beiden Schenkel.
 * liegend: Richtung des liegenden Schenkels (aussen = vom Mittelpunkt weg)
 * stehend: Richtung des stehenden Schenkels
 */
export const AUSRICHTUNGEN = [
  { key: 'LA_SI', label: 'liegend aussen · stehend innen   (Regelbauart)', lg: +1, st: -1 },
  { key: 'LA_SA', label: 'liegend aussen · stehend aussen',               lg: +1, st: +1 },
  { key: 'LI_SI', label: 'liegend innen · stehend innen',                 lg: -1, st: -1 },
  { key: 'LI_SA', label: 'liegend innen · stehend aussen',                lg: -1, st: +1 },
];

export function getAusrichtung(key) {
  const o = AUSRICHTUNGEN.find((x) => x.key === key);
  if (!o) throw new Error(`Unbekannte Ausrichtung: ${key}`);
  return o;
}

/** Die vier Ecken. sy/sz = Vorzeichen der Ecklage. */
export const ECKEN = [
  { id: 'OG_L', label: 'Obergurt links',   sy: -1, sz: +1, gurt: 'OG' },
  { id: 'OG_R', label: 'Obergurt rechts',  sy: +1, sz: +1, gurt: 'OG' },
  { id: 'UG_L', label: 'Untergurt links',  sy: -1, sz: -1, gurt: 'UG' },
  { id: 'UG_R', label: 'Untergurt rechts', sy: +1, sz: -1, gurt: 'UG' },
];

/**
 * Ein Eckwinkel, aufgebaut ab der Ferse.
 *
 * @param {object} ecke  Eintrag aus ECKEN
 * @param {object} prof  Profil (aH, aV, t, zsH, zsV)
 * @param {object} ausr  Ausrichtung (lg, st)
 * @param {number} Hy    Ferse y [mm]  (= halbe lichte Breite, vorzeichenbehaftet)
 * @param {number} Hz    Ferse z [mm]  (= halbe Gesamthöhe, vorzeichenbehaftet)
 */
export function eckwinkel(ecke, prof, ausr, Hy, Hz) {
  const { aH, aV, t } = prof;
  const zsH = prof.zsH * U.cm__mm;
  const zsV = prof.zsV * U.cm__mm;

  const ey = ecke.sy * ausr.lg;    // Richtung des liegenden Schenkels
  const ez = ecke.sz * ausr.st;    // Richtung des stehenden Schenkels

  const poly = [
    [Hy, Hz],
    [Hy + ey * aH, Hz],
    [Hy + ey * aH, Hz + ez * t],
    [Hy + ey * t, Hz + ez * t],
    [Hy + ey * t, Hz + ez * aV],
    [Hy, Hz + ez * aV],
  ];

  const rect = (y0, z0, y1, z1) => ({
    y0: Math.min(y0, y1), y1: Math.max(y0, y1),
    z0: Math.min(z0, z1), z1: Math.max(z0, z1),
  });

  return {
    id: ecke.id, label: ecke.label, gurt: ecke.gurt, prof,
    ferse: { y: Hy, z: Hz },
    schwerpunkt: { y: Hy + ey * zsV, z: Hz + ez * zsH },
    ey, ez, poly,
    /** liegender Schenkel (Horizontalebene), Länge aH in y */
    schenkelLiegend: rect(Hy, Hz, Hy + ey * aH, Hz + ez * t),
    /** stehender Schenkel (Vertikalebene), Länge aV in z */
    schenkelStehend: rect(Hy, Hz, Hy + ey * t, Hz + ez * aV),
  };
}

/**
 * Vollständige Querschnittsgeometrie inkl. Bindeblechlagen und Fluchtkontrolle.
 * Erwartet im Modell die PHYSISCHEN Masse jd, lichtOG, lichtUG [mm].
 */
export function querschnitt(m) {
  const aOG = getAusrichtung(m.ausrOG);
  const aUG = getAusrichtung(m.ausrUG);

  const winkel = ECKEN.map((e) => {
    const istOG = e.gurt === 'OG';
    const licht = istOG ? m.lichtOG : m.lichtUG;
    return eckwinkel(
      e,
      istOG ? m.profOG : m.profUG,
      istOG ? aOG : aUG,
      (e.sy * licht) / 2,
      (e.sz * m.jd) / 2
    );
  });

  const byId = Object.fromEntries(winkel.map((w) => [w.id, w]));
  const mid = (r, achse) => (r[achse + '0'] + r[achse + '1']) / 2;

  // --- Bindebleche in den beiden VERTIKALEBENEN ----------------------------
  const vertikal = [-1, +1].map((s) => {
    const og = byId[s < 0 ? 'OG_L' : 'OG_R'];
    const ug = byId[s < 0 ? 'UG_L' : 'UG_R'];
    const yOG = mid(og.schenkelStehend, 'y');
    const yUG = mid(ug.schenkelStehend, 'y');
    return {
      id: s < 0 ? 'Vertikalebene links' : 'Vertikalebene rechts',
      seite: s, yOG, yUG, y: (yOG + yUG) / 2, versatz: Math.abs(yOG - yUG),
      z0: Math.min(og.schenkelStehend.z0, ug.schenkelStehend.z0),
      z1: Math.max(og.schenkelStehend.z1, ug.schenkelStehend.z1),
    };
  });

  // --- Bindebleche in den beiden HORIZONTALEBENEN --------------------------
  const horizontal = [+1, -1].map((s) => {
    const li = byId[s > 0 ? 'OG_L' : 'UG_L'];
    const re = byId[s > 0 ? 'OG_R' : 'UG_R'];
    const zL = mid(li.schenkelLiegend, 'z');
    const zR = mid(re.schenkelLiegend, 'z');
    return {
      id: s > 0 ? 'Horizontalebene oben' : 'Horizontalebene unten',
      seite: s, zL, zR, z: (zL + zR) / 2, versatz: Math.abs(zL - zR),
      y0: Math.min(li.schenkelLiegend.y0, re.schenkelLiegend.y0),
      y1: Math.max(li.schenkelLiegend.y1, re.schenkelLiegend.y1),
    };
  });

  // --- Fluchtkontrolle ------------------------------------------------------
  const TOL_FLUCHT = 0.5; // [mm]
  const warnungen = [];
  vertikal.forEach((e) => {
    if (e.versatz > TOL_FLUCHT) {
      warnungen.push(
        `${e.id}: die stehenden Schenkel von Ober- und Untergurt liegen nicht in ` +
        `einer Flucht (Versatz ${e.versatz.toFixed(1)} mm). Das Bindeblech wäre ` +
        `nicht eben – Ausrichtung oder lichte Breite von OG/UG angleichen.`
      );
    }
  });
  horizontal.forEach((e) => {
    if (e.versatz > TOL_FLUCHT) {
      warnungen.push(
        `${e.id}: die liegenden Schenkel links/rechts liegen nicht in einer ` +
        `Flucht (Versatz ${e.versatz.toFixed(1)} mm).`
      );
    }
  });

  const alleY = winkel.flatMap((w) => w.poly.map((p) => p[0]));
  const alleZ = winkel.flatMap((w) => w.poly.map((p) => p[1]));

  return {
    winkel, byId, bindebleche: { vertikal, horizontal }, warnungen,
    jd: m.jd, lichtOG: m.lichtOG, lichtUG: m.lichtUG,
    /** Aussenbreite über die liegenden Schenkel (entspricht jbb der Zeichnung) */
    jbbOG: Math.abs(byId.OG_R.schenkelLiegend.y1 - byId.OG_L.schenkelLiegend.y0),
    jbbUG: Math.abs(byId.UG_R.schenkelLiegend.y1 - byId.UG_L.schenkelLiegend.y0),
    huelle: {
      y0: Math.min(...alleY), y1: Math.max(...alleY),
      z0: Math.min(...alleZ), z1: Math.max(...alleZ),
    },
  };
}

/**
 * Stationen der Bindebleche entlang der Trägerachse.
 * Das erste und das letzte Blech sind Endbindebleche (h_1 / t_1).
 * @returns {{x:number,hBB:number,tBB:number,end:boolean,i:number}[]} in [mm]
 */
export function bindeblechStationen(m, ebene = 'vertikal') {
  const L = m.L * U.m__mm;
  if (m.stationsListe) {
    const n = m.stationsListe.length;
    return m.stationsListe.map((st) => {
      const b = st[ebene];
      return {
        x: st.x * U.m__mm, i: st.i,
        hBB: b?.breite ?? 0, tBB: b?.dicke ?? 0, pos: b?.pos ?? null,
        end: st.i === 0 || st.i === n - 1,
      };
    });
  }
  const a1 = m.a1 * U.m__mm;
  const st = [];
  for (let i = 0; i * a1 < L - 0.001; i++) st.push(i * a1);
  st.push(L);
  return st.map((x, k) => ({
    x, i: k, hBB: m.h2, tBB: m.t2, pos: null,
    end: k === 0 || k === st.length - 1,
  }));
}

/** Angriffsstellen der Einzellasten entlang der Jochachse [mm]. */
export function lastStellen(m) {
  return (m.anbauteile ?? [])
    .filter((a) => a.aktiv !== false)
    .map((a) => ({ x: a.x * U.m__mm, name: a.name, ev: a.ev,
                   raster: (a.raster ?? 0.4) * U.m__mm }));
}

/** Lage eines Bindeblechs entlang x: Endbleche bündig, Zwischenbleche mittig. */
function blechLage(s, L) {
  let x0 = s.x - s.hBB / 2;
  if (s.i === 0) x0 = 0;
  if (s.x >= L - 0.001) x0 = L - s.hBB;
  return { x0, x1: x0 + s.hBB };
}

/**
 * Anhebung des Untergurts an der Stelle x [mm] bei verjüngten Enden.
 * Ohne Verjüngung immer 0. Der Obergurt bleibt gerade.
 */
export function ugAnhebung(m, xmm) {
  if (!m.ugVersatz) return 0;
  return m.ugVersatz(xmm / U.m__mm);
}

/** Stützstellen für den Umriss eines verjüngten Jochs [mm]. */
function umrissStellen(m) {
  const L = m.L * U.m__mm;
  if (!m.verlauf?.aktiv) return [0, L];
  const v = m.verlauf.voute;
  const stauchung = Math.min(1, L / (2 * v.knick));
  const knicke = [v.gerade * stauchung, v.knick * stauchung];
  return [...new Set([0, ...knicke, ...knicke.map((k) => L - k), L])]
    .filter((x) => x >= 0 && x <= L).sort((a, b) => a - b);
}

/** Ansicht der Vertikalebene (x-z). */
export function laengsansichtVertikal(m, qs) {
  const L = m.L * U.m__mm;
  const og = qs.byId.OG_R;
  const ug = qs.byId.UG_R;
  const stellen = umrissStellen(m);

  /**
   * Umriss eines Gurts als Polygonzug: Oberkante hin, Unterkante zurück.
   * Der Ausschnitt [von, bis] erlaubt Detailansichten des Auflagerbereichs.
   */
  const umriss = (r, dz) => (von = 0, bis = L) => {
    const xs = [von, ...stellen.filter((x) => x > von && x < bis), bis];
    return [
      ...xs.map((x) => [x, r.z1 + dz(x)]),
      ...[...xs].reverse().map((x) => [x, r.z0 + dz(x)]),
    ];
  };
  const dzOG = () => 0;
  const dzUG = (x) => ugAnhebung(m, x);

  const gurte = [
    { id: 'Obergurt', gurt: 'OG', ...og.schenkelStehend, zs: og.schwerpunkt.z,
      prof: og.prof, dz: dzOG, umriss: umriss(og.schenkelStehend, dzOG),
      poly: umriss(og.schenkelStehend, dzOG)(),
      zsPoly: stellen.map((x) => [x, og.schwerpunkt.z]) },
    { id: 'Untergurt', gurt: 'UG', ...ug.schenkelStehend, zs: ug.schwerpunkt.z,
      prof: ug.prof, dz: dzUG, umriss: umriss(ug.schenkelStehend, dzUG),
      poly: umriss(ug.schenkelStehend, dzUG)(),
      zsPoly: stellen.map((x) => [x, ug.schwerpunkt.z + ugAnhebung(m, x)]) },
  ];

  const bleche = bindeblechStationen(m, 'vertikal').map((s) => {
    const d = ugAnhebung(m, s.x);
    return {
      ...s, ...blechLage(s, L),
      z0: Math.min(og.schenkelStehend.z0, ug.schenkelStehend.z1 + d),
      z1: Math.max(og.schenkelStehend.z0, ug.schenkelStehend.z1 + d),
    };
  });

  return { L, gurte, bleche, stellen, lasten: lastStellen(m),
           xN: (m.xNachweis ?? 0) * U.m__mm,
           zUnten: (x) => ug.schenkelStehend.z0 + ugAnhebung(m, x) };
}

/** Draufsicht auf die obere Horizontalebene (x-y). */
export function draufsicht(m, qs) {
  const L = m.L * U.m__mm;
  const li = qs.byId.OG_L;
  const re = qs.byId.OG_R;

  const gurte = [
    { id: 'Ebene links',  ...li.schenkelLiegend, ys: li.schwerpunkt.y },
    { id: 'Ebene rechts', ...re.schenkelLiegend, ys: re.schwerpunkt.y },
  ];

  const bleche = bindeblechStationen(m, 'horizontal').map((s) => ({
    ...s, ...blechLage(s, L),
    y0: Math.min(li.schenkelLiegend.y1, re.schenkelLiegend.y0),
    y1: Math.max(li.schenkelLiegend.y1, re.schenkelLiegend.y0),
  }));

  return { L, gurte, bleche, lasten: lastStellen(m), xN: (m.xNachweis ?? 0) * U.m__mm };
}
