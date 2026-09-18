/**
 * bild.zeichnung.js
 * ---------------------------------------------------------------------------
 * DIE QUERPROFIL-ZEICHNUNG HINTER DAS MODELL.
 *
 * Wer ein Tragwerk aufnimmt, hat die Zeichnung offen und die Anwendung
 * daneben: jede Länge wird im PDF-Reader gemessen und hier eingetippt. Diese
 * Datei nimmt den Umweg heraus. Die Zeichnung liegt transparent in derselben
 * Ansicht wie das Modell, mit demselben Zoom und derselben Fahrt - man sieht
 * unmittelbar, ob Mast, Joch und Anbauteile dort sitzen, wo sie hingehören.
 *
 * KEIN FREMDCODE. Ein PDF könnte der Browser nur als eigene Ebene anzeigen,
 * die Zoom und Verschiebung nicht mitmacht; ein PDF zu rastern hiesse, einen
 * PDF-Leser mit einzubacken. Genommen wird deshalb ein BILD - eingefügt aus
 * der Zwischenablage (Bildschirmausschnitt) oder hineingezogen. Das ist
 * dieselbe Bildinformation, nur ohne Abhängigkeit.
 *
 * VERKLEINERT UND ALS JPEG (Weisung). Ein Bildschirmausschnitt sind schnell
 * drei Megabyte; bei zwanzig Tragwerken eines Projekts wäre die Ablage
 * unbrauchbar. 2000 Punkte Breite reichen zum Zuordnen - das Bild ist
 * Hintergrund, nicht Nachweis.
 *
 * DIE ACHSEN. Gezeichnet wird in der x-z-Ebene: x die Jochachse, z lotrecht
 * nach oben. Das ist die LÄNGSANSICHT dieser Anwendung - und zugleich das,
 * was eine Querprofil-Zeichnung zeigt. Die Benennungen laufen gegeneinander,
 * die Ebene ist dieselbe.
 * ---------------------------------------------------------------------------
 */

import { maskeAusBild } from './bild.erkennung.js';

/** Breite, auf die ein eingefügtes Bild verkleinert wird [Punkte]. */
export const MAX_BREITE = 2000;

/** JPEG-Güte. 0.82 ist die Grenze, unter der Linien sichtbar ausfransen. */
export const GUETE = 0.82;

/**
 * Ein Bild aus einem Einfüge- oder Ziehereignis.
 *
 * Beide Wege liefern dasselbe: ein Blob mit Bilddaten. Die Zwischenablage
 * bringt beim Bildschirmausschnitt ein `image/png`, das Ziehen eine Datei.
 * EIN KOPIERTER DATEIVERWEIS ist der dritte Fall - aus dem Explorer kopiert
 * liegt in der Zwischenablage keine Bildinformation, sondern eine Datei; die
 * steht in `files` statt in `items`.
 *
 * @returns {Blob|null}
 */
export function bildAusEreignis(ev) {
  const dt = ev?.clipboardData ?? ev?.dataTransfer;
  if (!dt) return null;
  for (const f of dt.files ?? []) {
    if (f.type.startsWith('image/')) return f;
  }
  for (const it of dt.items ?? []) {
    if (it.kind === 'file' && it.type.startsWith('image/')) {
      const f = it.getAsFile();
      if (f) return f;
    }
  }
  return null;
}

/**
 * Verkleinern und als JPEG kodieren.
 *
 * Auf einen weissen Grund gezeichnet: JPEG kennt keine Durchsichtigkeit, und
 * ein PNG mit durchsichtigem Rand würde sonst schwarz. Zeichnungen sind
 * schwarz auf weiss - der weisse Grund ist auch der richtige.
 *
 * @param {Blob} blob
 * @returns {Promise<{daten:Uint8Array, breite:number, hoehe:number, art:string}>}
 */
export async function verkleinere(blob, maxBreite = MAX_BREITE, guete = GUETE) {
  const bild = await createImageBitmap(blob);
  const f = Math.min(1, maxBreite / bild.width);
  const b = Math.max(1, Math.round(bild.width * f));
  const h = Math.max(1, Math.round(bild.height * f));
  const cv = document.createElement('canvas');
  cv.width = b; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, b, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bild, 0, 0, b, h);
  bild.close?.();
  /*
   * DIE MASKE FÄLLT HIER AB, also wird sie mitgenommen.
   *
   * Die Erkennung braucht dunkel/hell je Punkt. Das Bild liegt gerade
   * gezeichnet auf diesem Canvas - es später noch einmal zu dekodieren, nur
   * um dieselben Punkte zu lesen, wäre Arbeit ohne Grund. Und aus dem JPEG
   * gelesen wäre sie sogar SCHLECHTER: dessen Artefakte an den Linienrändern
   * sind genau das, was eine Schwelle nicht braucht.
   */
  const punkte = ctx.getImageData(0, 0, b, h);
  const maske = maskeAusBild(punkte.data, b, h);
  const jpeg = await new Promise((fertig) =>
    cv.toBlob((x) => fertig(x), 'image/jpeg', guete));
  const daten = new Uint8Array(await jpeg.arrayBuffer());
  return { daten, breite: b, hoehe: h, art: 'image/jpeg', maske };
}

/**
 * DIE KALIBRIERUNG: zwei Klicks, und das Bild sitzt.
 *
 * Querprofil-Zeichnungen sind orthogonal - nichts ist gedreht, der Massstab
 * ist in beiden Achsen derselbe. Damit bleiben drei Unbekannte: der Massstab
 * und die Lage in x und z. Zwei Punkte, deren Modellkoordinaten bekannt sind,
 * bestimmen alle drei.
 *
 * Bekannt sind sie, weil die Masse schon in der Eingabe stehen: die beiden
 * Jochenden liegen auf x = 0 und x = L, Mastfuss und Mastkopf auf bekannter
 * Höhe. Eingetippt werden muss nichts - man klickt, was man ohnehin weiss.
 *
 * DER MASSSTAB KOMMT AUS DER LÄNGEREN RICHTUNG. Klickt man die beiden
 * Jochenden, liegen sie waagrecht weit auseinander und lotrecht fast
 * übereinander; die lotrechte Differenz wäre fast nur Klickrauschen und
 * ergäbe einen wilden Massstab. Genommen wird deshalb die Richtung mit dem
 * grösseren Abstand im Bild.
 *
 * @param {{px:number, py:number}} p1 Bildpunkt (Punkte, y nach unten)
 * @param {{px:number, py:number}} p2
 * @param {{x:number, z:number}} w1 zugehöriger Modellpunkt [m]
 * @param {{x:number, z:number}} w2
 * @returns {{s:number, x0:number, z0:number}|null} s = Meter je Bildpunkt
 */
export function kalibriere(p1, p2, w1, w2) {
  if (!p1 || !p2 || !w1 || !w2) return null;
  const dpx = p2.px - p1.px, dpy = p2.py - p1.py;
  const waagrecht = Math.abs(dpx) >= Math.abs(dpy);
  const s = waagrecht
    ? Math.abs(w2.x - w1.x) / Math.abs(dpx)
    : Math.abs(w2.z - w1.z) / Math.abs(dpy);
  if (!(s > 0) || !Number.isFinite(s)) return null;
  // Beide Punkte tragen zur Lage bei. In der Richtung, aus der der Massstab
  // stammt, sagen sie ohnehin dasselbe; in der anderen mittelt es den
  // schiefen Klick heraus.
  const x0 = ((w1.x - s * p1.px) + (w2.x - s * p2.px)) / 2;
  const z0 = ((w1.z + s * p1.py) + (w2.z + s * p2.py)) / 2;
  return { s, x0, z0 };
}

/** Bildpunkt -> Modellkoordinate. y zeigt im Bild nach unten, z nach oben. */
export const bildNachWelt = (k, px, py) => (k
  ? { x: k.x0 + k.s * px, z: k.z0 - k.s * py } : null);

/** Modellkoordinate -> Bildpunkt. Umkehrung von bildNachWelt. */
export const weltNachBild = (k, x, z) => (k
  ? { px: (x - k.x0) / k.s, py: (k.z0 - z) / k.s } : null);

/**
 * Die vier Ecken des Bildes in Modellkoordinaten.
 *
 * Gebraucht zum Zeichnen: die Ansicht kennt die Umrechnung Modell -> Bildschirm
 * und muss vom Bild nur wissen, welches Rechteck es in der Welt einnimmt.
 */
export function bildRahmen(k, breite, hoehe) {
  if (!k) return null;
  const a = bildNachWelt(k, 0, 0);
  const b = bildNachWelt(k, breite, hoehe);
  return { xVon: Math.min(a.x, b.x), xBis: Math.max(a.x, b.x),
           zVon: Math.min(a.z, b.z), zBis: Math.max(a.z, b.z) };
}

/**
 * DIE BEZUGSMASSE, aus denen sich kalibrieren lässt.
 *
 * Ein waagrechtes und zwei lotrechte Masse aus der Eingabe, dazu ein freies:
 * je nachdem, was auf der Zeichnung gut zu treffen ist.
 *
 * >>> DIE PUNKTE KOMMEN AUS DER SZENE, NICHT AUS DER EINGABE. <<<
 *
 * Gemeldet am 18. September: über die Mastlänge eingemessen, sass die
 * Zeichnung im falschen Massstab und am falschen Ort. Der Bezug rechnete den
 * Masten hier selbst nach - Fuss bei -H, oben die Jochachse bei 0. Gezeichnet
 * steht der Fuss aber H unter dem ANSCHLUSS an der Unterkante des Jochs, und
 * auf dem Blatt ist die ganze Szene um die Masthöhe angehoben. Zwei
 * Rechnungen desselben Masten, die um die halbe Jochhöhe im Massstab und um
 * H in der Lage auseinanderlagen.
 *
 * `erzeugeSzene` und `abfangSzene` legen die Punkte jetzt so bei, wie sie
 * gezeichnet sind (`szene.bezug`), und das Blatt verschiebt sie mit. Was man
 * anklickt, ist damit genau das, was man im Modell sieht.
 */
const linkerMast = (sz) => {
  const ms = sz?.bezug?.masten ?? {};
  return ms.A ?? Object.values(ms)[0] ?? null;
};

/** Das Joch: aus der Szene, ohne Szene aus der Eingabe (0 bis L auf der Achse). */
const jochVon = (m, sz) => (sz
  ? sz.bezug?.joch ?? null
  : (m?.L > 0 && !m.qsErsatz ? { xA: 0, xB: m.L, z: 0 } : null));

export const BEZUEGE = [
  /*
   * DIE RICHTUNG STEHT IM NAMEN (Weisung, 12. September: "ob ein mast
   * (vertikal) oder ein joch (horizontal) als referenz dient"). Auf dem
   * Blatt sucht man nicht nach einem Bauteil, sondern nach zwei Punkten,
   * die man sicher trifft - und dafür ist die Richtung die erste Frage.
   */
  { key: 'joch', label: 'Joch, waagrecht (Länge L)',
    hinweis: 'Links und rechts das Ende des Jochs anklicken. Waagrecht – '
           + 'meist am besten zu treffen.',
    punkte: (m, sz) => {
      const j = jochVon(m, sz);
      return j && j.xB > j.xA
        ? [{ x: j.xA, z: j.z, text: 'linkes Jochende, Höhe der Jochachse' },
           { x: j.xB, z: j.z, text: 'rechtes Jochende, Höhe der Jochachse' }]
        : null;
    } },
  { key: 'mast', label: 'Mast, lotrecht (Höhe H)',
    hinweis: 'Fundamentoberkante und Anschluss am linken Masten anklicken. '
           + 'Lotrecht – gut, wenn das Joch angeschnitten ist.',
    punkte: (m, sz) => {
      const g = linkerMast(sz);
      return g && g.zAn - g.zF > 0
        ? [{ x: g.x, z: g.zF, text: 'Fundamentoberkante am linken Masten' },
           { x: g.x, z: g.zAn, text: 'Anschluss am linken Masten (Höhe H)' }]
        : null;
    } },
  /*
   * >>> DIE GANZE MASTLÄNGE. <<<
   *
   * Auf dem Querprofil ist der Mast von Fundament bis Kopf gezeichnet und mit
   * seiner Länge angeschrieben - das ist das Mass, das man sicher trifft.
   *
   * GEMESSEN WIRD DIE LÄNGE, NICHT DER GEZEICHNETE KOPF. Das Bild hebt den
   * Kopf auf mindestens einen halben Meter über den Obergurt; die Länge aus
   * der Eingabe kann darunter bleiben. Auf dem Blatt steht die wirkliche -
   * nähme man den gezeichneten Kopf, wäre der Massstab um den Unterschied
   * verzogen. Ohne Überstand fehlt das Mass: es wäre dasselbe wie H.
   */
  { key: 'mastLaenge', label: 'Mast, lotrecht (ganze Länge)',
    hinweis: 'Fundamentoberkante und Mastkopf am linken Masten anklicken.',
    punkte: (m, sz) => {
      const g = linkerMast(sz);
      return g?.laenge > 0 && g.zF + g.laenge > g.zAn + 1e-6
        ? [{ x: g.x, z: g.zF, text: 'Fundamentoberkante am linken Masten' },
           { x: g.x, z: g.zF + g.laenge, text: 'Mastkopf am linken Masten' }]
        : null;
    } },
  /*
   * >>> EIN FREIES MASS. <<<
   *
   * Nicht jede Zeichnung zeigt Jochende oder Mastfuss - ein Ausschnitt, ein
   * Detail. Dann nimmt man eine Bemassung, die auf dem Blatt steht: zwei
   * Punkte, die Länge dazu. Das Mass legt nur den Massstab fest; wohin das
   * Bild gehört, sagt danach «Ausrichten».
   */
  { key: 'frei', label: 'Freies Mass (Länge eingeben)', frei: true,
    hinweis: 'Zwei Punkte mit bekanntem Abstand anklicken, dann die Länge '
           + 'eingeben.',
    punkte: () => null },
];

/**
 * Das Bezugsmass zu einem Schlüssel, mit seinen beiden Modellpunkten.
 *
 * Gibt null, wenn das Mass im Modell nicht vorkommt - ohne Mast als Auflager
 * gibt es keine Masthöhe, und dann ist der Bezug nicht wählbar.
 */
export function bezugPunkte(key, m, sz = null) {
  const b = BEZUEGE.find((x) => x.key === key);
  return b ? b.punkte(m, sz) : null;
}

/**
 * Die Bezuege, die es in DIESEM Modell gibt - mit ihren Punkten.
 *
 * >>> DIE WAHL GEHOERT VOR DAS EINMESSEN. <<<
 *
 * Weisung vom 12. September: "man muesste hier eine auswahl vornehmen ob ein
 * mast (vertikal) oder ein joch (horizontal) als referenz dient. und die
 * zeichnung muesste dann entsprechend positioniert werden."
 *
 * Wer die Liste hat, kann fragen, statt zu raten - und hat nichts anzubieten,
 * wo es nichts gibt. Das freie Mass gibt es immer, sobald ein Modell dasteht.
 */
export function bezuegeFuer(m, sz = null) {
  if (!m && !sz) return [];
  return BEZUEGE
    .map((b) => ({ ...b, welt: b.punkte(m, sz) }))
    .filter((b) => b.frei || (Array.isArray(b.welt) && b.welt.length === 2));
}

/**
 * Die Modellpunkte zu dem, was die ERKENNUNG findet (bild.erkennung.js).
 *
 * Sie findet die Mastachsen auf der Jochachse und den Fuss des linken
 * Masten - nicht die Jochenden und nicht den Anschluss an der Unterkante.
 * Die Punkte des Einmessens von Hand passen deshalb nicht; hier stehen die
 * passenden. Ohne zwei Masten nimmt das waagrechte Paar die Jochenden:
 * dort stehen die Masten der Zeichnung gewöhnlich.
 */
export function erkennungsWelt(key, m, sz = null) {
  const ms = sz?.bezug?.masten ?? {};
  const a = ms.A, b = ms.B;
  if (key === 'mast') {
    const g = linkerMast(sz);
    return g && Number.isFinite(g.zAchse) && g.zAchse > g.zF
      ? [{ x: g.x, z: g.zF }, { x: g.x, z: g.zAchse }] : null;
  }
  if (key === 'joch') {
    if (a && b && Number.isFinite(a.zAchse) && Number.isFinite(b.zAchse)
        && b.x > a.x) {
      return [{ x: a.x, z: a.zAchse }, { x: b.x, z: b.zAchse }];
    }
    return bezugPunkte('joch', m, sz);
  }
  return null;
}

/**
 * DER MASSSTAB AUS EINEM FREIEN MASS.
 *
 * Anders als beim Einmessen über zwei Modellpunkte zählt hier der wirkliche
 * Abstand im Bild, nicht die längere Richtung: eine schräge Bemassung ist
 * erlaubt, und ihre Länge ist die Diagonale.
 *
 * >>> DER ERSTE PUNKT BLEIBT, WO ER IST. <<< Das Bild wächst oder schrumpft
 * um ihn herum. So springt es nicht davon, und das Ausrichten danach ist
 * ein kurzer Weg statt einer Suche.
 *
 * @param {{px,py}} p1 @param {{px,py}} p2 Bildpunkte
 * @param {number} laenge wirklicher Abstand [m]
 * @param {{s,x0,z0}|null} kAlt die Lage bisher
 */
export function kalibriereFrei(p1, p2, laenge, kAlt = null) {
  if (!p1 || !p2 || !(laenge > 0)) return null;
  const d = Math.hypot(p2.px - p1.px, p2.py - p1.py);
  if (!(d > 0)) return null;
  const s = laenge / d;
  const w = kAlt ? bildNachWelt(kAlt, p1.px, p1.py) : { x: 0, z: 0 };
  return { s, x0: w.x - s * p1.px, z0: w.z + s * p1.py };
}

/**
 * AUSRICHTEN: ein Bildpunkt auf einen Modellpunkt, der Massstab bleibt.
 *
 * Gemeldet am 18. September: die Lage hing starr am Mastfuss. Wer die
 * Zeichnung am Mastkopf oder an einem Jochende deckungsgleich haben will,
 * wählt den Punkt im Modell und klickt ihn auf der Zeichnung an - das Bild
 * wird nur verschoben, nicht neu gemessen.
 */
export function ausrichten(k, p, w) {
  if (!k || !p || !w || !(k.s > 0)) return null;
  return { s: k.s, x0: w.x - k.s * p.px, z0: w.z + k.s * p.py };
}

/**
 * Die Modellpunkte, an denen sich ausrichten lässt.
 *
 * Fuss, Anschluss und Kopf je Mast, dazu die Jochenden - so, wie sie in
 * der Szene stehen. Der Kopf liegt auf der Länge ab Fundament, wie beim
 * Einmessen; ohne Länge dort, wo er gezeichnet ist.
 */
export function ausrichtPunkte(sz) {
  const out = [];
  const ms = sz?.bezug?.masten ?? {};
  const namen = Object.keys(ms);
  const wer = (k) => (namen.length < 2 ? 'Mast'
    : k === 'A' ? 'linker Mast' : 'rechter Mast');
  for (const k of namen) {
    const g = ms[k];
    out.push({ key: `fuss${k}`, label: `${wer(k)}: Fundamentoberkante`, x: g.x, z: g.zF });
    if (g.zAn > g.zF + 1e-9) {
      out.push({ key: `an${k}`, label: `${wer(k)}: Anschluss (Höhe H)`, x: g.x, z: g.zAn });
    }
    const kopf = g.laenge > 0 ? g.zF + g.laenge : g.zKopf;
    if (kopf > g.zAn + 1e-9) {
      out.push({ key: `kopf${k}`, label: `${wer(k)}: Mastkopf`, x: g.x, z: kopf });
    }
  }
  const j = sz?.bezug?.joch;
  if (j && j.xB > j.xA) {
    out.push({ key: 'jochA', label: 'Jochende links (Achse)', x: j.xA, z: j.z });
    out.push({ key: 'jochB', label: 'Jochende rechts (Achse)', x: j.xB, z: j.z });
  }
  return out;
}

/**
 * DIE VORLÄUFIGE LAGE eines frisch eingelegten Bildes.
 *
 * Gemeldet am 18. September: das Bild lag viel zu gross da. Es wurde auf die
 * doppelte Jochlänge gestreckt - und ohne Joch, beim Einzelmast, auf 40 m,
 * gegen einen Masten von zehn. Man musste es erst suchen, bevor man es
 * einmessen konnte.
 *
 * Genommen werden jetzt die GRENZEN DES MODELLS, so wie es dasteht: das Bild
 * wird so gross, dass das Modell etwa zwei Drittel davon einnimmt - in der
 * Richtung, die knapper ist. Ein Querprofil zeigt ringsum Gleise, Profile und
 * Schriftfeld; das Tragwerk füllt das Blatt nie ganz. Mittig darum gelegt,
 * sieht man beides gleich und setzt die zwei Klicks ohne Suche.
 *
 * @param {{xMin,xMax,zMin,zMax}|null} g Grenzen der Szene
 * @param {number} breite @param {number} hoehe Bildgrösse [Punkte]
 */
export const VORLAEUFIG_ANTEIL = 0.65;
export function vorlaeufigeLage(g, breite, hoehe) {
  const ok = g && [g.xMin, g.xMax, g.zMin, g.zMax].every(Number.isFinite);
  const w = ok ? Math.max(g.xMax - g.xMin, 0.5) : 10;
  const h = ok ? Math.max(g.zMax - g.zMin, 0.5) : 10;
  const cx = ok ? (g.xMin + g.xMax) / 2 : 0;
  const cz = ok ? (g.zMin + g.zMax) / 2 : 0;
  const s = Math.max(w / (VORLAEUFIG_ANTEIL * breite),
                     h / (VORLAEUFIG_ANTEIL * hoehe));
  return { s, x0: cx - (s * breite) / 2, z0: cz + (s * hoehe) / 2 };
}
