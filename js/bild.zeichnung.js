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
 * DIE BEIDEN BEZUGSMASSE, aus denen sich kalibrieren lässt.
 *
 * Beide stehen in der Eingabe. Mehr braucht es nicht: ein waagrechtes und ein
 * lotrechtes Mass decken beide Fälle ab, je nachdem, was auf der Zeichnung
 * gut zu treffen ist.
 */
export const BEZUEGE = [
  { key: 'joch', label: 'Jochenden (Länge L)',
    hinweis: 'Links und rechts das Ende des Jochs anklicken. Waagrecht – '
           + 'meist am besten zu treffen.',
    punkte: (m) => (m?.L > 0
      ? [{ x: 0, z: 0, text: 'linkes Jochende, Höhe der Jochachse' },
         { x: m.L, z: 0, text: 'rechtes Jochende, Höhe der Jochachse' }]
      : null) },
  { key: 'mast', label: 'Mast Ende A (Höhe H)',
    hinweis: 'Fundamentoberkante und Jochachse am linken Masten anklicken. '
           + 'Lotrecht – gut, wenn das Joch angeschnitten ist.',
    punkte: (m) => {
      const H = m?.federn?.mastA?.H ?? m?.federn?.mast?.H ?? 0;
      return H > 0
        ? [{ x: 0, z: -H, text: 'Fundamentoberkante am linken Masten' },
           { x: 0, z: 0, text: 'Jochachse am linken Masten' }]
        : null;
    } },
];

/**
 * Das Bezugsmass zu einem Schlüssel, mit seinen beiden Modellpunkten.
 *
 * Gibt null, wenn das Mass im Modell nicht vorkommt - ohne Mast als Auflager
 * gibt es keine Masthöhe, und dann ist der Bezug nicht wählbar.
 */
export function bezugPunkte(key, m) {
  const b = BEZUEGE.find((x) => x.key === key);
  return b ? b.punkte(m) : null;
}
