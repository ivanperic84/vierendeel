/**
 * render.koerper.js
 * ===========================================================================
 * VON DER TABELLE ZUM KOERPER - die Bausteine der Modellansicht.
 *
 * >>> WARUM ES DIESES MODUL GIBT. <<<
 *
 * Weisung vom 4. September: «gibt es hierfuer ein modul in der app die
 * zustaendig ist fuer das 3d und deren ableitung von den tabellen zu den
 * koerpern. das ganze wird sich wiederholen beim tragausleger.»
 *
 * Die Antwort war bis dahin: halb. `render.3d.js` konnte es - fuer das
 * Tragjoch, und nur dort, weil die Bausteine modulintern lagen. Das
 * Abfangjoch bekam deshalb einen eigenen, groberen Quader-Bauer, und der
 * Tragausleger haette den dritten bekommen. Drei Wege zu demselben Ziel,
 * und der Traeger saehe in jedem anders aus.
 *
 * Hier stehen sie EINMAL:
 *
 *   prisma(poly, x0, x1)   Querschnittspolygon in Jochrichtung ausgezogen
 *   prismaZ(poly, cx, ...)   dasselbe lotrecht - fuer den Mast
 *   platte(x, breite, ...)   ein Blech, waagrecht oder senkrecht
 *   quader / stab            was keine Profilform hat
 *   iProfilPoly / uProfilPoly / walzProfilPoly
 *                            der Umriss eines Walzprofils in Millimetern
 *
 * >>> DER UMRISS KOMMT AUS DEM SORTIMENT, NICHT AUS DER ANSCHAUUNG. <<<
 *
 * `walzProfilPoly` nimmt den Eintrag aus `data.profiles.js` - h, b, t_w,
 * t_f, e_y - und macht daraus den Umriss. Wer ein Profil im Sortiment
 * berichtigt, berichtigt damit auch das Bild; es gibt keine zweite,
 * gezeichnete Wahrheit daneben.
 *
 * Koordinaten: Polygone in MILLIMETERN, Laengen in METERN. Die Umrechnung
 * macht `prisma` mit MM - wer ein Polygon selbst baut, gibt es in mm.
 * ===========================================================================
 */

export const MM = 1 / 1000;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];


/**
 * Prisma aus einem Querschnittspolygon [[y,z],…] zwischen x0 und x1.
 *
 * dz0/dz1 heben das Polygon an den beiden Enden um ein Mass [m] an. Damit
 * lassen sich die verjüngten Enden der Altbauweise zeichnen: der Untergurt
 * steigt zum Auflager hin an, der Obergurt bleibt gerade.
 */
export function prisma(poly, x0, x1, opt, dz0 = 0, dz1 = 0, poly1 = null) {
  const flaechen = [];
  const pA = poly, pB = poly1 ?? poly;      // Querschnitt bei x0 und bei x1
  const n = pA.length;
  const P = (x, p, dz) => [x, p[0] * MM, p[1] * MM + dz];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    flaechen.push({
      punkte: [P(x0, pA[i], dz0), P(x0, pA[j], dz0),
               P(x1, pB[j], dz1), P(x1, pB[i], dz1)],
      xMitte: (x0 + x1) / 2, ...opt,
    });
  }
  // Stirnflächen
  flaechen.push({ punkte: pA.map((p) => P(x0, p, dz0)), xMitte: x0, ...opt });
  flaechen.push({ punkte: pB.map((p) => P(x1, p, dz1)), xMitte: x1, ...opt });
  return flaechen;
}

/**
 * Quader aus Mittelebene, Dicke und Ausdehnung.
 *
 * neigung [m/m] kippt das Blech um die Jochachse quer: die vordere Kante liegt
 * um breite/2·neigung tiefer als die hintere. Gebraucht für die Bleche des
 * Untergurts in der Schräge der Altbauweise.
 */
export function platte(x, breite, achse, lage, von, bis, opt, neigung = 0) {
  const h = (breite * MM) / 2;
  const x0 = x - h, x1 = x + h;
  const t = (opt.dicke * MM) / 2;
  const poly = achse === 'y'
    // Blech in einer Vertikalebene: konstante y-Lage, spannt in z
    ? [[lage - t, von], [lage + t, von], [lage + t, bis], [lage - t, bis]]
    // Blech in einer Horizontalebene: konstante z-Lage, spannt in y
    : [[von, lage - t], [bis, lage - t], [bis, lage + t], [von, lage + t]];
  return prisma(poly.map((p) => [p[0] / MM, p[1] / MM]), x0, x1, opt,
                -h * neigung, +h * neigung);
}

/**
 * Prisma aus einem Querschnittspolygon [[x,y],…] (mm) zwischen z0 und z1 (m).
 *
 * Das Gegenstück zu `prisma`, das in x auszieht. Ein Mast steht lotrecht;
 * ohne diesen Baustein liesse er sich nur als Kasten andeuten, und ein Kasten
 * ist kein HEB.
 */
export function prismaZ(poly, cx, z0, z1, opt) {
  const flaechen = [];
  const n = poly.length;
  const P = (p, z) => [cx + p[0] * MM, p[1] * MM, z];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    flaechen.push({ punkte: [P(poly[i], z0), P(poly[j], z0),
                             P(poly[j], z1), P(poly[i], z1)],
                    xMitte: cx, ...opt });
  }
  flaechen.push({ punkte: poly.map((p) => P(p, z0)), xMitte: cx, ...opt });
  flaechen.push({ punkte: poly.map((p) => P(p, z1)), xMitte: cx, ...opt });
  return flaechen;
}

/**
 * Prisma aus einem Querschnittspolygon [[x,z],...] (mm) zwischen y0 und y1 (m).
 *
 * >>> DER QUERRIEGEL LIEGT QUER. <<<
 *
 * `prisma` zieht in x aus, `prismaZ` in z - fuer einen Riegel, der von Gurt
 * zu Gurt spannt, fehlte die dritte Richtung. Das Abfangjoch braucht sie ab
 * A240: dort steht an den Bereichsgrenzen ein IPE mit senkrechtem Steg
 * zwischen den Gurtstegen (Schnitt C-C), und ohne diesen Baustein liesse er
 * sich nur als Kasten andeuten. Der Tragausleger wird sie ebenso brauchen.
 */
export function prismaY(poly, cx, y0, y1, opt) {
  const flaechen = [];
  const n = poly.length;
  const P = (p, y) => [cx + p[0] * MM, y, p[1] * MM];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    flaechen.push({ punkte: [P(poly[i], y0), P(poly[j], y0),
                             P(poly[j], y1), P(poly[i], y1)],
                    xMitte: cx, ...opt });
  }
  flaechen.push({ punkte: poly.map((p) => P(p, y0)), xMitte: cx, ...opt });
  flaechen.push({ punkte: poly.map((p) => P(p, y1)), xMitte: cx, ...opt });
  return flaechen;
}

/**
 * Der I-Querschnitt eines Mastes als Polygon [[x,y],…] in Millimetern.
 *
 * Zwölf Ecken: zwei Flansche und der Steg dazwischen. Die STEGRICHTUNG
 * entscheidet, wie er im Raum liegt - «Steg in Jochachse» heisst, dass die
 * Profilhöhe h in der Jochachse (x) steht und die Flanschbreite b quer dazu.
 * Gedreht ist es umgekehrt. Genau das unterscheidet die starke von der
 * schwachen Achse quer zum Gleis, und man soll es dem Bild ansehen.
 */
export function iProfilPoly({ h, b, tw, tf }, achse) {
  const u = h / 2, v = b / 2, w = tw / 2;
  const uv = [
    [-u, -v], [-u, +v], [-u + tf, +v], [-u + tf, +w],
    [+u - tf, +w], [+u - tf, +v], [+u, +v], [+u, -v],
    [+u - tf, -v], [+u - tf, -w], [-u + tf, -w], [-u + tf, -v],
  ];
  return achse === 'y' ? uv : uv.map(([a, c]) => [c, a]);
}

/** Achsparalleler Quader um einen Mittelpunkt, Kantenlängen in m. */
export function quader(mitte, [dx, dy, dz], opt) {
  const [cx, cy, cz] = mitte;
  const poly = [[cy - dy / 2, cz - dz / 2], [cy + dy / 2, cz - dz / 2],
                [cy + dy / 2, cz + dz / 2], [cy - dy / 2, cz + dz / 2]];
  return prisma(poly.map((p) => [p[0] / MM, p[1] / MM]),
                cx - dx / 2, cx + dx / 2, opt);
}

/** Stab zwischen zwei Punkten als schlanker Quader (achsnah genügt hier). */
export function stab(p0, p1, dicke, opt) {
  const m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2];
  const d = sub(p1, p0);
  return quader(m, [Math.abs(d[0]) + dicke, Math.abs(d[1]) + dicke,
                    Math.abs(d[2]) + dicke], opt);
}

/**
 * DER UMRISS EINES U-PROFILS als Polygon [[y,z],...] in Millimetern.
 *
 * >>> DER NULLPUNKT IST DIE SCHWERACHSE, NICHT DER STEGRUECKEN. <<<
 *
 * Der Stab des Rechenmodells laeuft auf der Schwerachse; das Bild muss
 * denselben Bezug haben, sonst laegen Koerper und Stabmodell um e_y
 * auseinander - beim UPE 160 sind das 18.4 mm, gut sichtbar bei zwei Metern
 * Bildbreite. Der Stegruecken liegt deshalb bei y = -e_y, die Flanschspitzen
 * bei y = -e_y + b.
 *
 * `oeffnung` sagt, wohin das C zeigt: +1 nach +y, -1 nach -y. Beim liegenden
 * Traeger ist das die Aussenseite (Weisung, 4. September: «gurte
 * spiegelsymetrisch auf die jochachse bezogen (c ist gegen aussen offen)»).
 *
 * @param {object} p  Profil aus dem Sortiment, Masse in ZENTIMETERN
 * @param {number} oeffnung  +1 oder -1
 */
export function uProfilPoly({ h, b, tw, tf, ey = 0 }, oeffnung = 1) {
  const H = h * 10, B = b * 10, TW = tw * 10, TF = tf * 10, EY = ey * 10;
  const s = oeffnung >= 0 ? 1 : -1;
  const y = (v) => s * (v - EY);          // Stegruecken bei v = 0
  return [
    [y(0), -H / 2], [y(B), -H / 2], [y(B), -H / 2 + TF], [y(TW), -H / 2 + TF],
    [y(TW), H / 2 - TF], [y(B), H / 2 - TF], [y(B), H / 2], [y(0), H / 2],
  ];
}

/**
 * DER UMRISS EINES WALZPROFILS - nach seiner Reihe.
 *
 * UPE und U sind einseitig offen, IPE und HEB nicht. Wer die Reihe nicht
 * abfragt, zeichnet ein IPE 270 als C - und beim Abfangjoch traegt ein Typ
 * UPE-Gurte und der naechstgroessere IPE-Gurte.
 *
 * @param {object} p         Profil aus dem Sortiment (cm)
 * @param {object} opt       {oeffnung: +1|-1, achse: 'y'|'z'}
 */
export function walzProfilPoly(p, opt = {}) {
  const offen = /^(UPE|UAP|U)$/i.test(String(p.reihe ?? ''));
  if (offen) return uProfilPoly(p, opt.oeffnung ?? 1);
  /*
   * DAS I STEHT MIT DER HOEHE IN z - dieselbe Lage wie das U daneben.
   * `iProfilPoly` liefert mit achse='y' die Hoehe in der ERSTEN Koordinate
   * (so braucht es der Mast, der in x liegt); fuer den liegenden Traeger
   * ist es die zweite. Darum die andere Achse, nicht eine zweite Drehung.
   */
  return iProfilPoly({ h: p.h * 10, b: p.b * 10, tw: p.tw * 10, tf: p.tf * 10 },
                     opt.achse === 'x' ? 'y' : 'z');
}
