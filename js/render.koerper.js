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
 * EIN SCHRÄGER STAB ALS KÖRPER.
 *
 * Weisung vom 11. September: «die anker im 3d nachziehen.»
 *
 * `stab` daneben legt einen ACHSPARALLELEN Quader um die Verbindung — für
 * eine kurze Andeutung genügt das, für einen sechs Meter langen Zuganker
 * nicht: aus dem Stab würde ein Kasten, der die halbe Szene füllt.
 *
 * Hier wird der Querschnitt wirklich um die Stabachse gelegt. Die beiden
 * Querrichtungen folgen aus der Achse selbst: die erste steht senkrecht auf
 * ihr und auf der Lotrechten, die zweite auf beiden. Damit liegt der
 * Querschnitt immer richtig, gleichgültig in welcher Ebene der Stab steht —
 * und genau darauf kommt es an, weil ein Anker quer zum Gleis oder längs
 * dazu stehen kann.
 *
 * @param {number[]} p0  Anfang [x,y,z] in m
 * @param {number[]} p1  Ende
 * @param {number} b     Breite des Querschnitts [m]
 * @param {number} h     Höhe des Querschnitts [m]
 * @param {object} opt   wandert an jede Fläche
 */
export function schraegerStab(p0, p1, b, h, opt = {}) {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const L = Math.hypot(d[0], d[1], d[2]);
  if (!(L > 1e-9)) return [];
  const e = d.map((v) => v / L);
  /*
   * DIE ERSTE QUERRICHTUNG steht senkrecht auf der Achse und auf z. Läuft
   * der Stab selbst lotrecht, gibt das Kreuzprodukt null - dann wird nach x
   * ausgewichen. Ein Anker steht nie ganz senkrecht, aber ein Baustein, der
   * bei einem Grenzfall NaN liefert, gehört nicht ins Bild.
   */
  const kreuz = (a, c) => [a[1] * c[2] - a[2] * c[1],
                           a[2] * c[0] - a[0] * c[2],
                           a[0] * c[1] - a[1] * c[0]];
  const norm = (v) => {
    const n = Math.hypot(v[0], v[1], v[2]);
    return n > 1e-9 ? v.map((x) => x / n) : null;
  };
  const q1 = norm(kreuz(e, [0, 0, 1])) ?? norm(kreuz(e, [1, 0, 0]))
          ?? [1, 0, 0];
  const q2 = norm(kreuz(e, q1)) ?? [0, 1, 0];

  const ecke = (p, s1, s2) => [
    p[0] + s1 * (b / 2) * q1[0] + s2 * (h / 2) * q2[0],
    p[1] + s1 * (b / 2) * q1[1] + s2 * (h / 2) * q2[1],
    p[2] + s1 * (b / 2) * q1[2] + s2 * (h / 2) * q2[2]];
  const vz = [[-1, -1], [+1, -1], [+1, +1], [-1, +1]];
  const A = vz.map(([s1, s2]) => ecke(p0, s1, s2));
  const B = vz.map(([s1, s2]) => ecke(p1, s1, s2));

  const xMitte = (p0[0] + p1[0]) / 2;
  const flaechen = [];
  for (let i = 0; i < 4; i += 1) {
    const j = (i + 1) % 4;
    flaechen.push({ punkte: [A[i], A[j], B[j], B[i]], xMitte, ...opt });
  }
  flaechen.push({ punkte: A, xMitte: p0[0], ...opt });
  flaechen.push({ punkte: [...B].reverse(), xMitte: p1[0], ...opt });
  return flaechen;
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
 *   ankerSpreiz   Spreizmass der Stuetze aus dem Sortiment (oder null)
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

  const ank = ankerTeile(o, halb, zFuss, zKopf);
  linien.push(...ank.linien);
  flaechen.push(...ank.flaechen);
  return { flaechen, linien,
           bauteiltitel: ank.bauteiltitel, masse: ank.masse };
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
function ankerTeile(o, halb, zFuss, zKopf) {
  const leer = { linien: [], flaechen: [], bauteiltitel: [], masse: [] };
  const ak = o.anker;
  if (!ak?.typ || !(ak.h > 0) || !(ak.a > 0)) return leer;
  const linien = [];
  const flaechen = [];
  const bauteiltitel = [];
  const masse = [];
  const { x, name = 'A' } = o;
  const vz = ak.seite === 'minus' ? -1 : 1;
  const laengs = ak.richtung === 'y';
  const zA = zFuss + Math.min(ak.h, zKopf - zFuss);
  const xF = laengs ? x : x + vz * ak.a;
  const yF = laengs ? vz * ak.a : 0;
  /*
   * >>> DIE ANSCHRIFT NENNT DAS BAUTEIL, NICHT SEIN ERGEBNIS. <<<
   *
   * Weisung vom 11. September: «bei der beschriftung des ankers nur die
   * pos. typ und laenge anschreiben.»
   *
   * Bis dahin stand «Anker B · U12 · Druck 17.4 kN · η 0.289» im Bild -
   * vier Angaben, von denen zwei aus dem Nachweis kommen und sich bei jeder
   * Eingabe aendern. Im Modell steht, WAS dasteht; die Ausnutzung steht in
   * der Kachel daneben, und sie steht dort genauer.
   *
   * >>> UND DIE LAENGE IST SEIT DEM 11. SEPTEMBER AUCH DRAUSSEN. <<<
   *
   * Weisung: «beim beschriften im 3d die laenge weglassen beim anker.»
   *
   * Sie steht an der Bemassung daneben - h_A, a_A und der Winkel -, und
   * dort ist sie ablesbar, statt ein drittes Mal im Text zu stehen. Was
   * bleibt, ist die Anschrift eines Bauteils: seine Position und sein Typ.
   */
  const wie = `${ak.typ}`;

  /*
   * >>> DER STAB IST EIN KOERPER, KEINE LINIE. <<<
   *
   * Weisung vom 11. September: «die anker im 3d nachziehen.»
   *
   * Gezeichnet war eine Doppellinie - lesbar, aber kein Bauteil. Der U12
   * ist zwei gespreizte U-Profile, der Seilanker ein Seil; beide sind
   * schlank, aber sie haben eine Dicke, und im Bild neben einem HEB 240
   * gehoert sie dazu. Der Querschnitt wird um die STABACHSE gelegt
   * (`schraegerStab`), nicht achsparallel - sonst wuerde aus einem sechs
   * Meter langen Anker ein Kasten.
   *
   * DIE LINIEN BLEIBEN als Kanten daneben: sie tragen die Beschriftung und
   * sind auch dann zu sehen, wenn der Koerper hinter dem Masten liegt.
   */
  const pM = [x, 0, zA], pF = [xF, yF, zFuss];
  const dick = Math.max(0.06, 0.55 * halb);
  const LStab = Math.hypot(xF - x, yF, zA - zFuss);

  /* =======================================================================
   * >>> ZWEI PROFILE, KEILFOERMIG GESPREIZT. <<<
   * =======================================================================
   *
   * Weisung vom 11. September: «die Drueckstuetze korrekt im 3d abbilden.»
   *
   * Gezeichnet war EIN Quader. Der Katalog fuehrt die Stuetze aber als
   * «2× UNP 120», und das Spreizmass steht seit dem 11. September darin:
   * 104 mm (U12) bzw. 124 mm (U14) am engen Ende, 225 mm am weiten, davon
   * 990 mm parallel am engen und 1610 mm parallel am weiten Ende.
   *
   * Der Keil ist das Kennzeichen des Bauteils - an ihm erkennt man es im
   * Bild, und er erklaert, warum der Knicknachweis ueber das
   * Bemessungsdiagramm laeuft und nicht aus einem festen I_z.
   *
   * >>> ZWEI DINGE SAGT DAS BLATT NICHT. SIE STEHEN HIER ALS LESART. <<<
   *
   * 1. WORAUF sich die Masslinie bezieht. Gezeichnet wird sie als LICHTE
   *    WEITE zwischen den Profilen. Dafuer spricht die Flachlasche
   *    FLA 140/8, die den Spalt ueberbrueckt: ueber 104 mm liegt sie
   *    beidseits 18 mm auf. Bewiesen ist es damit nicht.
   * 2. WELCHES Ende am Masten sitzt. Gezeichnet wird das ENGE Ende oben -
   *    dort haengt die Stuetze an einer Konsole, unten steht sie auf der
   *    Ankerplatte.
   *
   * Fuer den NACHWEIS ist beides ohne Belang: der laeuft ueber das
   * Bemessungsdiagramm, und dessen Kurve kennt die Geometrie schon
   * (`data/anker.json`, Feld `bezug: null`). Faellt die Angabe spaeter, ist
   * hier die Stelle, an der sie eingesetzt wird.
   *
   * Ohne Spreizmass - beim Seilanker, und bei jedem Typ ohne Blatt - bleibt
   * es beim einen Stab. Ein Seil ist kein Keil.
   * ===================================================================== */
  const sp = o.ankerSpreiz ?? null;
  // Die Spreizung steht quer zur Ankerebene: liegt der Anker in
  // Gleisrichtung, spreizt er in der Jochachse - und umgekehrt.
  const spreizAchse = laengs ? 0 : 1;
  /*
   * >>> DAS WEITE ENDE SITZT AM MASTEN. <<<
   *
   * Weisung vom 11. September: «das weite ende der Druckstuetze liegt auf
   * seite Mast. dieses wird dann direkt an den flanschen oder mit einer
   * vorsatzkonsole befestigt.»
   *
   * Hier stand das Gegenteil - ich hatte das enge Ende oben angenommen,
   * weil eine Konsole schmal aussieht. Sie ist es nicht: die beiden
   * Profile fassen den Mastflansch von beiden Seiten, und dafuer muessen
   * sie dort WEIT auseinanderstehen. Am Fundament laufen sie zusammen und
   * sitzen eng auf der Ankerplatte.
   *
   * `s` laeuft von 0 (Mast, weit) nach 1 (Fundament, eng); die parallelen
   * Stuecke folgen mit: 1610 mm am weiten Ende oben, 990 mm am engen unten.
   */
  const halbAbstand = (s) => {
    if (!sp) return 0;
    // Vom MASTEN aus gemessen: erst 1610 mm parallel weit, dann der Keil,
    // die letzten 990 mm vor dem Fundament wieder parallel eng.
    const a2 = (sp.parallelBreit ?? 0) / 1000;
    const b2 = LStab - (sp.parallelSchmal ?? 0) / 1000;
    const xx = s * LStab;
    const mm2 = !(b2 > a2)
      ? sp.breit + (sp.schmal - sp.breit) * (xx / LStab)
      : xx <= a2 ? sp.breit
        : xx >= b2 ? sp.schmal
          : sp.breit + (sp.schmal - sp.breit) * ((xx - a2) / (b2 - a2));
    // Lichtes Mass + eine Profilbreite = Achsabstand der beiden Koerper;
    // der sichtbare Spalt ist dann genau das Mass der Zeichnung.
    return (mm2 / 1000 + dick) / 2;
  };
  const punktAuf = (s, vzP) => {
    const p = [pM[0] + (pF[0] - pM[0]) * s,
               pM[1] + (pF[1] - pM[1]) * s,
               pM[2] + (pF[2] - pM[2]) * s];
    p[spreizAchse] += vzP * halbAbstand(s);
    return p;
  };
  if (sp) {
    /*
     * >>> DREI ABSCHNITTE, UND DIE KNICKE SITZEN AUF DEM MASS. <<<
     *
     * Der Verlauf hat genau zwei Knicke: dort, wo das parallele Stueck am
     * Masten endet (1610 mm) und dort, wo das andere vor dem Fundament
     * beginnt (990 mm). Ein festes Raster trifft sie nicht - bei 7.85 m
     * Stablaenge faellt der erste auf s = 0.126, zwischen zwei Sechsteln,
     * und der Keil begaenne im Bild zu frueh.
     *
     * Die Stuetzstellen sind deshalb die Knicke selbst. Mehr braucht es
     * nicht: zwischen ihnen ist der Verlauf gerade, und jede weitere
     * Flaeche kostet die Szene Zeit ohne etwas zu zeigen.
     */
    const sA = Math.min(1, ((sp.parallelBreit ?? 0) / 1000) / LStab);
    const sB = Math.max(0, 1 - ((sp.parallelSchmal ?? 0) / 1000) / LStab);
    const stuetz = (sB > sA ? [0, sA, sB, 1] : [0, 1])
      .filter((s, i2, arr) => i2 === 0 || s - arr[i2 - 1] > 1e-6);
    [-1, +1].forEach((vzP) => {
      for (let i2 = 1; i2 < stuetz.length; i2 += 1) {
        flaechen.push(...schraegerStab(
          punktAuf(stuetz[i2 - 1], vzP), punktAuf(stuetz[i2], vzP),
          dick, dick, {
            gruppe: 'mast', teil: `ANKER_${name}`,
            label: `Anker ${name} · ${wie}`,
          }));
      }
      linien.push({ gruppe: 'mast', anker: true, stark: true,
                    label: `Anker ${name} · ${wie}`,
                    punkte: stuetz.map((s) => punktAuf(s, vzP)) });
    });
  } else {
    flaechen.push(...schraegerStab(pM, pF, dick, dick, {
      gruppe: 'mast', teil: `ANKER_${name}`,
      label: `Anker ${name} · ${wie}`,
    }));
    [-0.5, +0.5].forEach((d) => {
      const dx = laengs ? d * halb : 0;
      const dy = laengs ? 0 : d * halb;
      linien.push({ gruppe: 'mast', anker: true, stark: true,
                    label: `Anker ${name} · ${wie}`,
                    punkte: [[x + dx, dy, zA], [xF + dx, yF + dy, zFuss]] });
    });
  }
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

  /*
   * >>> DIE ANSCHRIFT UND DIE BEIDEN MASSE. <<<
   *
   * Weisung vom 11. September. Jedes andere Bauteil traegt seinen Namen im
   * Bild und laesst sich anklicken; der Anker war das einzige, das stumm
   * dastand. Die Anschrift sitzt auf halber Stablaenge, seitlich neben der
   * Achse - im Stab selbst waere sie vom Koerper verdeckt.
   *
   * DIE MASSE SIND DIE EINGABE: die Anschlusshoehe am Masten und der
   * Abstand des Fundaments. Beide fuehren auf ihr Feld, und zwar auf das
   * des richtigen Masten (`mastEnde`).
   */
  const mitte = [(x + xF) / 2, yF / 2, (zA + zFuss) / 2];
  bauteiltitel.push({
    p: [mitte[0], mitte[1] + (laengs ? 0 : 0.35), mitte[2] + 0.35],
    text: `Anker ${name} · ${wie}`,
    mastEnde: name, feld: 'ankerTyp', tab: 'system', gruppe: 'mast',
  });
  /*
   * >>> DIE HOEHE WIRD AM MASTEN GEMESSEN, ALSO STEHT SIE DORT. <<<
   *
   * Weisung vom 11. September: «die vertikale vermassung auf seite mast
   * rueber nehmen.»
   *
   * Sie stand ueber dem ANKERFUNDAMENT, also am falschen Ende: h_A ist die
   * Anschlusshoehe AM MASTEN ueber dem Mastfuss. Wer ein Mass sucht, sucht
   * es an dem Bauteil, das es beschreibt.
   *
   * Abgehoben wird auf die dem Anker ABGEWANDTE Seite - dort ist nichts,
   * was die Masslinie verdecken koennte.
   */
  masse.push({
    feld: 'ankerH', tab: 'system', achse: 'z', mastEnde: name,
    p0: [x, 0, zFuss], p1: [x, 0, zA],
    ab: laengs ? [0, -vz, 0] : [-vz, 0, 0], d: 0.6,
    text: `h_A = ${ak.h.toFixed(2)} m`,
  });
  masse.push({
    feld: 'ankerA', tab: 'system', achse: laengs ? 'y' : 'x', mastEnde: name,
    p0: [x, 0, zFuss], p1: [xF, yF, zFuss],
    ab: [0, 0, -1], d: 0.5,
    text: `a_A = ${ak.a.toFixed(2)} m`,
  });

  /* =======================================================================
   * >>> DER WINKEL, ALS BOGEN AM FUNDAMENT. <<<
   * =======================================================================
   *
   * Weisung vom 11. September: «den winkel noch vermassen.»
   *
   * Gemessen wird er gegen die WAAGRECHTE - so steht die Voreinstellung
   * («der anker hat einen winkel von ca 60°», Weisung vom 11. September),
   * und so folgt er aus den beiden Massen: tan α = h_A / a_A.
   *
   * Der Bogen sitzt am FUNDAMENT, zwischen dem Boden und der Stabachse.
   * Dort ist er der Winkel, den man auf der Zeichnung sieht; am Mastkopf
   * waere es sein Gegenwinkel, und der steht in keiner Eingabe.
   *
   * Gezeichnet als Linienzug: die Szene kennt keine Boegen, und ein
   * Vieleck aus acht Sehnen ist bei dieser Groesse nicht davon zu
   * unterscheiden. Dieselbe Loesung wie bei den Gelenkkreisen darueber.
   */
  const alpha = Math.atan2(ak.h, ak.a);
  const rB = Math.max(0.45, 1.4 * halb);
  // Die Waagrechte zeigt vom Fundament zum Masten, die Lotrechte nach oben.
  const eH = laengs ? [0, -vz, 0] : [-vz, 0, 0];
  const bogen = [];
  for (let k = 0; k <= 8; k += 1) {
    const w = (k / 8) * alpha;
    bogen.push([xF + eH[0] * rB * Math.cos(w),
                yF + eH[1] * rB * Math.cos(w),
                zFuss + rB * Math.sin(w)]);
  }
  for (let k = 1; k < bogen.length; k += 1) {
    linien.push({ gruppe: 'mast', anker: true,
                  punkte: [bogen[k - 1], bogen[k]] });
  }
  /*
   * DIE ZAHL steht auf halbem Bogen, ein Stueck nach aussen geschoben -
   * innerhalb des Bogens liefe sie gegen die Stabachse.
   */
  const wM = alpha / 2;
  const rT = rB * 1.35;
  bauteiltitel.push({
    p: [xF + eH[0] * rT * Math.cos(wM),
        yF + eH[1] * rT * Math.cos(wM),
        zFuss + rT * Math.sin(wM)],
    text: `α = ${((alpha * 180) / Math.PI).toFixed(1)}°`,
    mastEnde: name, feld: 'ankerH', tab: 'system', gruppe: 'mast',
  });
  return { linien, flaechen, bauteiltitel, masse };
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
