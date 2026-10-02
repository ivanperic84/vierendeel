/**
 * core.profilgeometrie.js
 * ---------------------------------------------------------------------------
 * DER NORMUMRISS DER PROFILE - gerundet, wie die Profilnormen ihn zeichnen,
 * und die Querschnittswerte daraus.
 *
 * Bis zum 2. Oktober stand das im Profilblatt (ui.profilblatt.js). Seit der
 * Weisung «Ja, als Polygon» - U-Profile in AxisVM aus dem Normumriss bauen,
 * weil AddU die Ausrundung verwirft (gemessen: UPE 140 -3.4 %, UPE 240
 * -2.5 % Fläche gegen die Tabelle) - braucht ihn auch die Ausleitung. Eine
 * Stelle für Zeichnung, Nachrechnung und AxisVM-Kontur. Reine Funktionen,
 * kein DOM.
 * ---------------------------------------------------------------------------
 */

/* ===========================================================================
 * DIE GEOMETRIE, einheitlich in mm - nach Profilnorm gerundet.
 * ===========================================================================
 *
 * Weisung vom 2. Oktober: «die profile sind gemäss szs c5 oder eurocode zu
 * zeichnen, es fehlen ei vielen querschnitten die ausrundungen. prüfe die
 * angaben mit der berechnungsdatenbank ab». Auf Rückfrage: Normradien in
 * data/normen.json, die Querschnittswerte aus der gezeichneten Geometrie
 * nachrechnen und Abweichungen nur melden.
 *
 * DER UMRISS IST EIN POLYGON MIT EINEM RADIUS JE ECKE (`ecken`), so wie die
 * Profilnormen ihn beschreiben:
 *
 *   WINKEL (EN 10056-1)   r1 in der Kehle, r2 an der Innenkante beider
 *                         Schenkelspitzen; die Aussenecke ist scharf.
 *   I (EN 10365)          r an den vier Kehlen Steg-Flansch.
 *   UPE (EN 10365)        r an den beiden Kehlen; parallele Flansche,
 *                         scharfe Flanschspitzen.
 *   UNP (DIN 1026-1)      geneigte Flansche, Neigung 8 %; t_f gilt im
 *                         Abstand b/2 vom Stegrücken. r1 in der Kehle,
 *                         r2 = r1/2 an der Spitze (so führt die Norm die
 *                         Reihe; die Ankertabelle nennt nur r1).
 *                         GEMESSEN, nicht angenommen: mit t_f in der Mitte
 *                         des freien Flanschteils, (b − t_w)/2 vom Steg,
 *                         lag A beim UNP 120 um +1.51 % und I_y um +2.01 %
 *                         über der Tabelle; mit b/2 vom Rücken −0.07 % und
 *                         +0.09 % (UNP 140: −0.15 / −0.03 %).
 *
 * Fehlt ein Radius in der Tabelle, bleibt die Ecke scharf, und das Blatt
 * sagt es. Aus DEMSELBEN gerundeten Umriss kommen Zeichnung und
 * Querschnittswerte (`querschnittAusUmriss`) - eine Zeichnung, die anders
 * gerundet wäre als die Nachrechnung, bewiese nichts.
 *
 * form   'L' (Winkel), 'U' (Stegrücken links, Öffnung rechts), 'I'
 * ys, zs Schwerpunkt NACH TABELLE im Zeichnungssystem: y nach rechts, z nach
 *        oben, Nullpunkt beim L an der Aussenecke, beim U am Stegrücken in
 *        halber Höhe, beim I in der Mitte.
 * Gibt null zurück, wenn die Masse fehlen - dann steht nur die Tabelle da.
 */
export const UNP_NEIGUNG = 0.08;

/**
 * KENNWERTE EINES FLACHBLECHS b × t [mm], in cm-Einheiten wie die Tabellen.
 * I_y in der Blechebene (stark), I_z quer dazu, I_t mit der Randkorrektur
 * 1 − 0.63 t/b (Rechteck, b ≫ t). Eine Stelle für Profiltafel und Blatt.
 */
export function blechWerte(b, t) {
  return {
    A: (b * t) / 100,
    Iy: (t * b ** 3) / 12 / 1e4,
    Iz: (b * t ** 3) / 12 / 1e4,
    Wy: (t * b ** 2) / 6 / 1e3,
    Wz: (b * t ** 2) / 6 / 1e3,
    It: ((b * t ** 3) / 3) * (1 - (0.63 * t) / b) / 1e4,
  };
}

export function profilGeometrie(art, p) {
  if (!p) return null;
  const ok = (...v) => v.every((x) => Number.isFinite(x) && x > 0);
  const rad = (v, f = 1) => (Number.isFinite(v) && v > 0 ? v * f : 0);
  let g;
  if (art === 'blech') {
    if (!ok(p.b, p.t)) return null;
    // Schnitt quer zur Blechlänge: Breite b waagrecht, Dicke t lotrecht.
    g = { form: 'R', b: p.b, h: p.t, t: p.t, r: 0, ys: 0, zs: 0 };
    g.ecken = ecken(g);
    return g;
  }
  if (art === 'winkel') {
    if (!ok(p.aH, p.aV, p.t)) return null;
    g = { form: 'L', aH: p.aH, aV: p.aV, t: p.t, r1: rad(p.r1), r2: rad(p.r2),
          ys: Number.isFinite(p.zsV) ? p.zsV * 10 : null,
          zs: Number.isFinite(p.zsH) ? p.zsH * 10 : null };
  } else {
    // Walzprofile in cm, Mast und Anker in mm - so stehen sie in den Tabellen.
    const f = art === 'walz' ? 10 : 1;
    const h = p.h * f, b = p.b * f, tw = p.tw * f, tf = p.tf * f;
    if (!ok(h, b, tw, tf)) return null;
    const r = rad(p.r, f);
    const istU = art === 'anker' || /^U/.test(p.reihe ?? '');
    if (istU) {
      // Der Anker führt UNP (geneigte Flansche), die Walzprofile UPE.
      const unp = art === 'anker' || p.reihe === 'UNP';
      g = { form: 'U', h, b, tw, tf, r, r1: r, r2: unp ? r / 2 : 0,
            neigung: unp ? UNP_NEIGUNG : 0,
            ys: Number.isFinite(p.ey) ? p.ey * 10 : null, zs: 0 };
    } else {
      g = { form: 'I', h, b, tw, tf, r, r1: r, ys: 0, zs: 0 };
    }
  }
  g.ecken = ecken(g);
  return g;
}

/**
 * Die Ecken des Umrisses mit ihrem Radius [y, z, r], auf dem Bildschirm im
 * Uhrzeigersinn (y rechts, z oben: oben links beginnend nach rechts). Die
 * erste Ecke ist immer scharf und liegt an der Bezugskante (L: Aussenecke,
 * U: Stegrücken oben, I: Flansch oben links).
 */
function ecken(g) {
  if (g.form === 'R') {
    const bb = g.b / 2, o = g.h / 2;
    return [[-bb, o, 0], [bb, o, 0], [bb, -o, 0], [-bb, -o, 0]];
  }
  if (g.form === 'L') {
    return [[0, 0, 0], [0, g.aV, 0], [g.t, g.aV, g.r2], [g.t, g.t, g.r1],
            [g.aH, g.t, g.r2], [g.aH, 0, 0]];
  }
  const o = g.h / 2, u = -g.h / 2;
  if (g.form === 'U') {
    // Innenfläche des Flansches: durch (b/2, o − t_f), steigt zur Spitze hin.
    const ym = g.b / 2;
    const zi = (y) => o - g.tf + g.neigung * (y - ym);
    return [[0, o, 0], [g.b, o, 0], [g.b, zi(g.b), g.r2], [g.tw, zi(g.tw), g.r1],
            [g.tw, -zi(g.tw), g.r1], [g.b, -zi(g.b), g.r2], [g.b, u, 0], [0, u, 0]];
  }
  const w = g.tw / 2, bb = g.b / 2, r = g.r1;
  return [[-bb, o, 0], [bb, o, 0], [bb, o - g.tf, 0], [w, o - g.tf, r],
          [w, u + g.tf, r], [bb, u + g.tf, 0], [bb, u, 0], [-bb, u, 0],
          [-bb, u + g.tf, 0], [-w, u + g.tf, r], [-w, o - g.tf, r], [-bb, o - g.tf, 0]];
}

/**
 * Der gerundete Umriss als Punktfolge [y, z] in mm.
 *
 * Jede Ecke mit Radius wird durch ihren Bogen ersetzt: Tangentenpunkte im
 * Abstand r / tan(θ/2) auf beiden Kanten, Mittelpunkt auf der
 * Winkelhalbierenden. Das gilt für die rechtwinklige Kehle wie für die
 * schiefe am geneigten UNP-Flansch, ohne Fallunterscheidung. `n` Abschnitte
 * je Bogen; 32 geben die Fläche eines Viertelkreises auf 2·10⁻³ genau, und
 * an einem Profil, in dem die Ausrundungen ein paar Prozent der Fläche
 * ausmachen, ist das weit unter der Tabellenrundung.
 */
export function umrissPunkte(g, n = 32) {
  const E = g.ecken;
  const aus = [];
  E.forEach(([y, z, r], i) => {
    if (!(r > 0)) { aus.push([y, z]); return; }
    const [ya, za] = E[(i - 1 + E.length) % E.length];
    const [yb, zb] = E[(i + 1) % E.length];
    const la = Math.hypot(ya - y, za - z), lb = Math.hypot(yb - y, zb - z);
    const u1 = [(ya - y) / la, (za - z) / la], u2 = [(yb - y) / lb, (zb - z) / lb];
    const cosW = Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]));
    const halb = Math.acos(cosW) / 2;
    const d = r / Math.tan(halb);
    const bis = [u1[0] + u2[0], u1[1] + u2[1]];
    const lbis = Math.hypot(bis[0], bis[1]);
    const c = [y + (bis[0] / lbis) * (r / Math.sin(halb)),
               z + (bis[1] / lbis) * (r / Math.sin(halb))];
    const t1 = [y + u1[0] * d, z + u1[1] * d], t2 = [y + u2[0] * d, z + u2[1] * d];
    const a1 = Math.atan2(t1[1] - c[1], t1[0] - c[0]);
    let da = Math.atan2(t2[1] - c[1], t2[0] - c[0]) - a1;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da <= -Math.PI) da += 2 * Math.PI;
    for (let k = 0; k <= n; k++) {
      const a = a1 + (da * k) / n;
      aus.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
    }
  });
  return aus;
}

/**
 * QUERSCHNITTSWERTE AUS DEM UMRISS - die Gegenprobe zur Tabelle.
 *
 * Polygonformeln (Gauss): A, Schwerpunkt, ∫z², ∫y², ∫yz, auf den
 * Schwerpunkt verschoben; daraus die Hauptachsen (beim Winkel i_v) und die
 * elastischen Widerstandsmomente zur am weitesten entfernten Faser - so sind
 * sie auch in der Tabelle definiert (Winkel: Schenkelspitze, U: der
 * kleinere W_z). Ergebnis in cm-Einheiten wie die Tabellen; der
 * Schwerpunkt in mm im Zeichnungssystem.
 *
 * I_t wird NICHT nachgerechnet: es ist keine Polygongrösse, und eine
 * Näherungsformel neben dem Tabellenwert wäre eine zweite Wahrheit.
 */
export function querschnittAusUmriss(g, n = 32) {
  const P = umrissPunkte(g, n);
  let A = 0, Sy = 0, Sz = 0, Iyy = 0, Izz = 0, Iyz = 0;
  for (let i = 0; i < P.length; i++) {
    const [y0, z0] = P[i], [y1, z1] = P[(i + 1) % P.length];
    const c = y0 * z1 - y1 * z0;
    A += c / 2;
    Sy += (y0 + y1) * c / 6;
    Sz += (z0 + z1) * c / 6;
    Iyy += (z0 * z0 + z0 * z1 + z1 * z1) * c / 12;
    Izz += (y0 * y0 + y0 * y1 + y1 * y1) * c / 12;
    Iyz += (y0 * z1 + 2 * y0 * z0 + 2 * y1 * z1 + y1 * z0) * c / 24;
  }
  // Im Uhrzeigersinn umfahren ist die Fläche negativ - alle Integrale mit.
  const s = Math.sign(A);
  A *= s; Sy *= s; Sz *= s; Iyy *= s; Izz *= s; Iyz *= s;
  const yc = Sy / A, zc = Sz / A;
  const Iy = Iyy - A * zc * zc;          // um die waagrechte Achse durch S
  const Iz = Izz - A * yc * yc;          // um die lotrechte Achse durch S
  const Iyzc = Iyz - A * yc * zc;
  const m = (Iy + Iz) / 2, rr = Math.hypot((Iy - Iz) / 2, Iyzc);
  const Iv = m - rr, Iu = m + rr;
  const zMax = Math.max(...P.map((q) => Math.abs(q[1] - zc)));
  const yMax = Math.max(...P.map((q) => Math.abs(q[0] - yc)));
  return {
    A: A / 100, ys: yc, zs: zc,
    Iy: Iy / 1e4, Iz: Iz / 1e4, Iyz: Iyzc / 1e4, Iu: Iu / 1e4, Iv: Iv / 1e4,
    Wy: Iy / zMax / 1e3, Wz: Iz / yMax / 1e3,
    iy: Math.sqrt(Iy / A) / 10, iz: Math.sqrt(Iz / A) / 10, iv: Math.sqrt(Iv / A) / 10,
  };
}


/**
 * DIE KONTUR EINES U-PROFILS FÜR AxisVM [mm] - [[y, z], …], y ab dem
 * Stegrücken (0 … b, Öffnung nach +y), z ab halber Höhe, im Uhrzeigersinn.
 *
 * Die Brücke (AxisVM_aufbauen.ps1, KonturQuerschnitt) legt sie in das
 * Achsensystem, das AxisVM selbst einem U gibt: sie baut dafür ein
 * Hilfs-U und liest daraus nur die Lage - Höhenachse und Seite des
 * Stegrückens -, nicht die Form. So steht das gerundete Profil genau dort,
 * wo das scharfkantige stand.
 *
 * @param {string} art  'walz' (UPE/UNP der Profiltabelle, cm) oder 'anker' (mm)
 * @param {object} p    Profilzeile
 * @param {number} n    Abschnitte je Bogen (8 genügen: die Fläche eines
 *                     Viertelkreises liegt dann 0.3 % unter dem Kreis, bei
 *                     einer Ausrundung von wenigen Prozent der Fläche)
 */
export function uKontur(art, p, n = 8) {
  const g = profilGeometrie(art, p);
  if (!g || g.form !== 'U') return null;
  return umrissPunkte(g, n).map(([y, z]) => [Math.round(y * 100) / 100, Math.round(z * 100) / 100]);
}
