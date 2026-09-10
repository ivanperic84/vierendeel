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

/* ===========================================================================
 * DER MAST - EIN BAUSTEIN FUER BEIDE SZENEN
 * ===========================================================================
 *
 * Weisung vom 10. September: «warum sehen die masten anders aus im 3d als
 * die bei den tragjochen? wurden diese nicht fertig gebaut?»
 *
 * >>> WEIL ES ZWEI ZEICHNUNGEN WAREN. <<<
 *
 * `render.3d.js` baut die Szene des Tragjochs, `render.abfang.js` die des
 * Abfangjochs - und jede zeichnete ihren Masten selbst. Beim Tragjoch mit
 * allem: Ausnutzung über die Höhe, Überstand über den Anschluss,
 * Fussschraffur, Zuganker. Beim Abfangjoch ein einzelnes Prisma vom Fuss bis
 * zur Jochachse, einfarbig.
 *
 * Es war nicht «nicht fertig gebaut», sondern ZWEIMAL gebaut - und die
 * zweite Fassung blieb hinter der ersten zurück. Genau das passiert mit
 * jeder Kopie.
 *
 * Hier steht sie EINMAL. Beide Szenen rufen sie, und was hier dazukommt,
 * steht in beiden Bildern.
 *
 * >>> DIE KOORDINATEN SIND IN BEIDEN SZENEN DIESELBEN. <<<
 *
 * z = 0 ist die Jochachse, der Fuss liegt bei −H, der Mast steht auf y = 0.
 * Das galt in beiden Modulen schon vorher; deshalb lässt sich der Baustein
 * überhaupt teilen.
 * =========================================================================== */

/**
 * Flächen und Linien eines Masten.
 *
 * @param {object} o
 *   profil        Mastprofil aus dem Sortiment
 *   achse         'y' | 'z' - Stegrichtung
 *   x             Lage in der Jochachse [m]
 *   zFuss         Fuss [m], meist negativ
 *   zAnschluss    Jochachse [m], meist 0
 *   zKopf         Kopf [m] - darüber der Überstand
 *   name          'A' | 'B' - für `teil` und die Beschriftung
 *   grund         Beschriftung ohne Zusatz
 *   nachweis      Ergebnis aus mastNachweise()[name], oder null
 *   farbeBauteil  Farbe, wenn kein Nachweis vorliegt
 *   anker         {typ, h, a, richtung, seite} am Masten, oder null
 *   ankerText     Beschriftung des Ankers
 * @returns {{flaechen:object[], linien:object[]}}
 */
export function mastKoerper(o) {
  const flaechen = [];
  const linien = [];
  const { profil, achse = 'y', x, zFuss, zKopf, name = 'A',
          grund = 'Mast', nachweis = null } = o;
  if (!profil) return { flaechen, linien };
  const poly = iProfilPoly(profil, achse);
  const teil = `MAST_${name}`;

  /*
   * >>> DER MAST TRAEGT SEINE AUSNUTZUNG. <<<
   *
   * Er stand als EIN Koerper da, einfarbig, waehrend jedes Blech und jeder
   * Gurt seinen Kennwert zeigte. Dabei ist gerade am Masten der VERLAUF die
   * Auskunft: die Ausnutzung waechst zum Fuss hin, und bei teilweiser
   * Einspannung nimmt sie zum Joch hin wieder zu.
   *
   * Gezeichnet wird je Abschnitt zwischen zwei Stationen ein eigenes
   * Prisma. Massgebend ist der UNGUENSTIGERE der beiden Endwerte - ein
   * Abschnitt, der nur seinen unteren Wert zeigte, faerbte die Stelle unter
   * einer Einzellast zu guenstig ein.
   */
  const st = nachweis?.stationen ?? [];
  if (st.length >= 2) {
    for (let i = 0; i < st.length - 1; i += 1) {
      const u = st[i], ob = st[i + 1];
      const zu2 = zFuss + u.z, zo2 = zFuss + ob.z;
      if (!(zo2 > zu2 + 1e-9)) continue;
      const arg = (f) => Math.max(Math.abs(u[f] ?? 0), Math.abs(ob[f] ?? 0));
      const schlimmer = u.eta >= ob.eta ? u : ob;
      flaechen.push(...prismaZ(poly, x, zu2, zo2, {
        gruppe: 'mast', teil,
        werte: {
          eta: schlimmer.eta,
          sig_v: schlimmer.sig,
          sig: Math.abs(schlimmer.sigN ?? 0),
          N: schlimmer.N,
          M: Math.max(arg('Mq'), arg('Ml')),
          V: Math.max(arg('Vq'), arg('Vl')),
        },
        label: `${grund} · ${u.z.toFixed(2)} bis ${ob.z.toFixed(2)} m`
             + ` über Fuss · η ${schlimmer.eta.toFixed(3)}`,
      }));
    }
    /*
     * DER MAST REICHT WEITER ALS DER NACHWEIS. Er endet am Mastkopf, wie
     * ihn die Laengenangabe bestimmt; die Zeichnung fuehrt ihn mindestens
     * einen halben Meter ueber den Obergurt. Ohne dieses Stueck endete er
     * an der letzten Station, und der Ueberstand mit seinen Traversen
     * fehlte im Bild.
     */
    const zLetzt = zFuss + st[st.length - 1].z;
    if (zKopf > zLetzt + 1e-9) {
      flaechen.push(...prismaZ(poly, x, zLetzt, zKopf, {
        gruppe: 'mast', teil,
        label: `${grund} · Überstand über den Nachweis`,
      }));
    }
  } else {
    // Ohne Nachweis bleibt er ein Koerper ohne Kennwert - neutral
    // eingefaerbt statt mit einer erfundenen Zahl.
    flaechen.push(...prismaZ(poly, x, zFuss, zKopf, {
      gruppe: 'mast', teil, farbeBauteil: o.farbeBauteil,
      label: `${grund} · ${(zKopf - zFuss).toFixed(2)} m`,
    }));
  }

  const halb = ((achse === 'y' ? profil.b : profil.h) / 2) * MM;
  // Fussschraffur - der Mast ist am Fuss eingespannt.
  const H = Math.max(0.5, (o.zAnschluss ?? 0) - zFuss);
  for (let k = -2; k <= 2; k += 1) {
    const y = (k / 2) * halb;
    linien.push({ gruppe: 'mast',
                  punkte: [[x, y, zFuss],
                           [x, y - 0.12 * halb, zFuss - 0.14 * H]] });
  }

  linien.push(...ankerLinien(o, halb, zFuss, zKopf));
  return { flaechen, linien };
}

/**
 * >>> DER ZUGANKER ODER DIE DRUCKSTUETZE. <<<
 *
 * Ein schraeger Stab vom Masten zu einem eigenen Fundament. Gezeichnet als
 * Doppellinie: eine einzelne Linie sieht aus wie eine Masslinie, und genau
 * das ist er nicht.
 *
 * DAS GELENK STEHT DA, WEIL ES DER PUNKT IST. An beiden Enden ein Kreis
 * statt einer Schraffur - der Stab traegt nur Normalkraft. Wer das Bild
 * liest, muss sehen, dass hier kein Moment uebergeht; die Einspannung des
 * Mastfusses daneben zeigt den Unterschied.
 *
 * ER LIEGT IN SEINER EBENE: quer zum Gleis in der Jochachse, laengs in
 * Gleisrichtung. Beides muss man im Bild unterscheiden koennen - sonst
 * sieht ein wirkungsloser Anker aus wie ein wirksamer.
 */
function ankerLinien(o, halb, zFuss, zKopf) {
  const ak = o.anker;
  if (!ak?.typ || !(ak.h > 0) || !(ak.a > 0)) return [];
  const linien = [];
  const { x, name = 'A' } = o;
  const vz = ak.seite === 'minus' ? -1 : 1;
  const laengs = ak.richtung === 'y';
  const zA = zFuss + Math.min(ak.h, zKopf - zFuss);
  const xF = laengs ? x : x + vz * ak.a;
  const yF = laengs ? vz * ak.a : 0;
  const wie = o.ankerText ?? `${ak.typ} · nicht gerechnet`;

  [-0.5, +0.5].forEach((d) => {
    const dx = laengs ? d * halb : 0;
    const dy = laengs ? 0 : d * halb;
    linien.push({ gruppe: 'mast', anker: true, stark: true,
                  label: `Anker ${name} · ${wie}`,
                  punkte: [[x + dx, dy, zA], [xF + dx, yF + dy, zFuss]] });
  });
  // Das Ankerfundament: ein Klotz am Boden, kein Auflagerdreieck.
  const fb = 0.35 * halb;
  [[-1, -1], [-1, 1], [1, 1], [1, -1], [-1, -1]].forEach((p, i, arr) => {
    if (i === 0) return;
    const q = arr[i - 1];
    linien.push({ gruppe: 'mast', anker: true,
      punkte: [[xF + q[0] * fb, yF + q[1] * fb, zFuss],
               [xF + p[0] * fb, yF + p[1] * fb, zFuss]] });
  });
  // Die beiden Gelenke - als Vieleck, die Szene kennt keine Kreise.
  [[x, 0, zA], [xF, yF, zFuss]].forEach(([xg, yg, zg]) => {
    const r = 0.22 * halb;
    const pkt = [];
    for (let k = 0; k <= 8; k += 1) {
      const w = (k / 8) * 2 * Math.PI;
      const c = r * Math.cos(w);
      pkt.push([xg + (laengs ? 0 : c), yg + (laengs ? c : 0),
                zg + r * Math.sin(w)]);
    }
    for (let k = 1; k < pkt.length; k += 1) {
      linien.push({ gruppe: 'mast', anker: true,
                    punkte: [pkt[k - 1], pkt[k]] });
    }
  });
  return linien;
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
