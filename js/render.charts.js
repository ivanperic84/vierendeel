/**
 * render.charts.js
 * ---------------------------------------------------------------------------
 * DIAGRAMME als reines SVG. Keine Rechnung, keine externen Bibliotheken.
 * Farben über CSS-Klassen (serie-1 ... serie-4).
 * ---------------------------------------------------------------------------
 */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n = (v) => (Math.round(v * 1000) / 1000).toString();

/** "Schöne" Achsenschrittweite. */
function schritt(spanne, ziel = 5) {
  if (!(spanne > 0)) return 1;
  const roh = spanne / ziel;
  const p = Math.pow(10, Math.floor(Math.log10(roh)));
  const r = roh / p;
  return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * p;
}

/**
 * Liniendiagramm über x.
 * @param {object} o {titel, yLabel, xLabel, punkte:[{x}], serien:[{name,werte[],cls}],
 *                    grenze?:number, breite?, hoehe?}
 */
export function linienDiagramm(o) {
  const W = o.breite ?? 900, H = o.hoehe ?? 240;
  const mL = 62, mR = 16, mT = 26, mB = 42;
  const xs = o.punkte;
  const alle = o.serien.flatMap((s) => s.werte).filter(Number.isFinite);
  if (o.grenze !== undefined) alle.push(o.grenze);
  alle.push(0);

  let y0 = Math.min(...alle), y1 = Math.max(...alle);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const pad = (y1 - y0) * 0.08;
  y0 -= pad; y1 += pad;

  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const X = (v) => mL + ((v - x0) / (x1 - x0 || 1)) * (W - mL - mR);
  const Y = (v) => H - mB - ((v - y0) / (y1 - y0)) * (H - mT - mB);

  let g = '';

  // Gitter und Achsenbeschriftung
  const dy = schritt(y1 - y0);
  for (let v = Math.ceil(y0 / dy) * dy; v <= y1; v += dy) {
    g += `<line class="grid" x1="${n(mL)}" y1="${n(Y(v))}" x2="${n(W - mR)}" y2="${n(Y(v))}"/>`;
    g += `<text class="tick" x="${n(mL - 7)}" y="${n(Y(v) + 4)}" text-anchor="end">${n(Math.round(v * 100) / 100)}</text>`;
  }
  const dx = schritt(x1 - x0, 8);
  for (let v = Math.ceil(x0 / dx) * dx; v <= x1 + 1e-9; v += dx) {
    g += `<line class="grid" x1="${n(X(v))}" y1="${n(mT)}" x2="${n(X(v))}" y2="${n(H - mB)}"/>`;
    g += `<text class="tick" x="${n(X(v))}" y="${n(H - mB + 16)}" text-anchor="middle">${n(Math.round(v * 100) / 100)}</text>`;
  }

  // Nulllinie
  if (y0 < 0 && y1 > 0) {
    g += `<line class="nulllinie" x1="${n(mL)}" y1="${n(Y(0))}" x2="${n(W - mR)}" y2="${n(Y(0))}"/>`;
  }
  // Grenzwert
  if (o.grenze !== undefined) {
    g += `<line class="grenze" x1="${n(mL)}" y1="${n(Y(o.grenze))}" x2="${n(W - mR)}" y2="${n(Y(o.grenze))}"/>`;
    // «η = 1» passt nur zum Ausnutzungsdiagramm. Wo die Grenze etwas
    // anderes ist - die vorhandene Stabkraft etwa -, sagt `grenzeText` es.
    g += `<text class="grenze-txt" x="${n(W - mR - 4)}" y="${n(Y(o.grenze) - 5)}" text-anchor="end">${esc(o.grenzeText ?? `η = ${o.grenze}`)}</text>`;
  }

  // Serien
  o.serien.forEach((s, k) => {
    const d = xs.map((x, i) => `${i ? 'L' : 'M'}${n(X(x))},${n(Y(s.werte[i]))}`).join(' ');
    g += `<path class="serie ${s.cls ?? 'serie-' + (k + 1)}" d="${d}"/>`;
  });

  /* =======================================================================
   * >>> DIE MARKE: EIN PUNKT AUF DER KURVE. <<<
   * =======================================================================
   *
   * Weisung vom 11. September: «es sind noch sinnvolle diagramme (sidebar /
   * verlaeufe) fuer die druckstuetze und abfangjoch nachzuziehen.»
   *
   * Das Bemessungsdiagramm der Stuetze ist erst dann eine Auskunft, wenn man
   * SEINEN Punkt darauf sieht: die Kurve allein sagt, was zulaessig ist,
   * nicht ob es reicht. Mit Fadenkreuz auf beide Achsen - sonst muesste man
   * die Laenge unten und die Kraft links selbst ablesen.
   * ===================================================================== */
  if (o.marke && Number.isFinite(o.marke.x) && Number.isFinite(o.marke.y)) {
    const mx = X(o.marke.x), my = Y(o.marke.y);
    g += `<line class="marke-faden" x1="${n(mL)}" y1="${n(my)}"`
       + ` x2="${n(mx)}" y2="${n(my)}"/>`;
    g += `<line class="marke-faden" x1="${n(mx)}" y1="${n(my)}"`
       + ` x2="${n(mx)}" y2="${n(H - mB)}"/>`;
    g += `<circle class="marke${o.marke.schlecht ? ' nok' : ''}"`
       + ` cx="${n(mx)}" cy="${n(my)}" r="4.5"/>`;
    if (o.marke.text) {
      // Nach links kippen, wenn der Punkt rechts steht - sonst laeuft die
      // Beschriftung aus dem Bild.
      const rechts = mx > (W + mL) / 2;
      g += `<text class="marke-txt" x="${n(mx + (rechts ? -9 : 9))}"`
         + ` y="${n(my - 9)}" text-anchor="${rechts ? 'end' : 'start'}"`
         + `>${esc(o.marke.text)}</text>`;
    }
  }

  // Legende - ANKLICKBAR, wo es ein Kraftbild dazu gibt.
  // Der unsichtbare Rechteckdeckel ist die Trefferfläche: eine Textzeile von
  // acht Pixeln Höhe trifft man sonst nicht.
  let lx = mL;
  o.serien.forEach((s, k) => {
    const breite = 30 + s.name.length * 6.6;
    const auf = s.skizze ? ` class="legende-eintrag" data-skizze="${esc(s.skizze)}"` : '';
    g += `<g${auf}>`;
    if (s.skizze) {
      g += `<rect class="legende-treffer" x="${n(lx - 3)}" y="${n(mT - 21)}"`
         + ` width="${n(breite)}" height="17" rx="3"/>`;
    }
    g += `<line class="serie ${s.cls ?? 'serie-' + (k + 1)}" x1="${n(lx)}" y1="${n(mT - 12)}" x2="${n(lx + 18)}" y2="${n(mT - 12)}"/>`;
    g += `<text class="legende" x="${n(lx + 23)}" y="${n(mT - 8)}">${esc(s.name)}</text>`;
    g += '</g>';
    lx += 32 + s.name.length * 6.6;
  });

  g += `<text class="achse" x="${n((W + mL) / 2)}" y="${n(H - 6)}" text-anchor="middle">${esc(o.xLabel ?? 'x [m]')}</text>`;
  g += `<text class="achse" x="14" y="${n((H) / 2)}" text-anchor="middle" transform="rotate(-90 14 ${n(H / 2)})">${esc(o.yLabel ?? '')}</text>`;

  return `<figure class="diagramm">
    <figcaption>${esc(o.titel)}</figcaption>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img"
         aria-label="${esc(o.titel)}">${g}</svg>
  </figure>`;
}

/* ===========================================================================
 * DIE VERLAEUFE DES ABFANGJOCHS
 * ===========================================================================
 *
 * Weisung vom 10. September: «die reiter schnitt verläufe und auflager beim
 * abfangjoch fertig machen.»
 *
 * Bis hierher zeigte der Reiter die Kurven des TRAGJOCH-Ersatzbalkens - M_y,
 * V_z, M_z, T_x eines Vierendeelträgers mit vier Winkelgurten. Am Abfangjoch
 * beschreiben sie ein anderes Tragwerk.
 *
 * >>> ES SIND ANDERE GRÖSSEN, WEIL ES ZWEI EBENEN SIND. <<<
 *
 *   RAHMENEBENE (waagrecht)   dort trägt der Vierendeel: das Moment wird zum
 *                             Kräftepaar N = M/e in den Gurten, die Querkraft
 *                             biegt den Gurt örtlich zwischen zwei Blechen.
 *   QUER DAZU (lotrecht)      jeder Gurt für sich, halbe Last - dazu die
 *                             Torsion als gegenläufiges Kräftepaar.
 *
 * Beide gehören ins Bild, und die Torsion daneben: sie ist der Anteil, den
 * man am fertigen Träger nicht sieht und der trotzdem im Gurt steht.
 *
 * >>> DIE STELLEN SIND DIE DES NACHWEISES. <<<
 *
 * `gurtReihe` läuft über die Blechstationen plus die vier Randstellen - genau
 * die Punkte, an denen gerechnet wird. Ein feineres Raster zu zeichnen hiesse,
 * einen Verlauf zu zeigen, der so nicht nachgewiesen ist.
 * =========================================================================== */

/**
 * Die Diagramme des Abfangjochs.
 *
 * @param {object} ab  Ergebnis aus `abfangAuswertung`
 * @param {number} breite
 * @returns {object|null} null, wenn keine Reihe vorliegt
 */
export function abfangDiagramme(ab, breite = 900) {
  const r = ab?.reihe;
  if (!Array.isArray(r) || r.length < 2) return null;
  const x = r.map((s) => s.x);
  const sn = (f) => r.map((s) => s.schnitt?.[f] ?? 0);
  const gurt = ab.q?.gurt?.name ?? 'Gurt';

  /*
   * DIE BLECHE HABEN IHRE EIGENEN STELLEN. Sie sitzen im Raster des
   * Sortiments, nicht auf den Nachweisstellen des Gurtes; ihre Ausnutzung
   * wird deshalb auf die Gurtstellen abgebildet - der nächstgelegene Wert
   * gilt. Zwei x-Achsen in einem Diagramm wären keine Auskunft.
   */
  const bleche = (ab.bleche?.bleche ?? []).filter((b) => Number.isFinite(b.x));
  const etaBlech = x.map((xi) => {
    if (!bleche.length) return 0;
    const b = bleche.reduce((a, c) =>
      (Math.abs(c.x - xi) < Math.abs(a.x - xi) ? c : a));
    return Math.abs(b.x - xi) <= 0.6 ? (b.eta ?? 0) : 0;
  });

  return {
    schnittgroessen: linienDiagramm({
      titel: 'Schnittgrössen des Abfangjochs — zwei Ebenen', breite,
      yLabel: 'M [kNm] / V [kN]', punkte: x,
      /*
       * >>> DIE BILDER GEHOEREN DEM LIEGENDEN TRAEGER. <<<
       *
       * Weisung vom 11. September: «die verdrahtung der sekundären
       * diagramme unter verläufe sind nicht korrekt.»
       *
       * Hier standen `My`, `Vz`, `Mz`, `Tx` - die Kraftbilder des TRAGJOCHS.
       * Unter «M Rahmenebene» las man «M_y biegt das Joch lotrecht, oben
       * Druck, unten Zug», unter «M Torsion» den umlaufenden Schubfluss
       * eines geschlossenen Kastens. Das Abfangjoch hat weder Ober- und
       * Untergurt noch vier Ebenen, und seine Rahmenebene liegt waagrecht.
       *
       * Die `abf`-Bilder zeigen dasselbe in DRAUFSICHT und im Querschnitt
       * des liegenden Traegers.
       */
      serien: [
        { name: 'M Rahmenebene', werte: sn('Mrahmen'), skizze: 'abfN' },
        { name: 'V Rahmenebene', werte: sn('Vrahmen'), skizze: 'abfV' },
        { name: 'M quer (lotrecht)', werte: sn('Mvert'), skizze: 'abfMvert' },
        { name: 'M Torsion', werte: sn('Mtors'), cls: 'serie-4',
          skizze: 'abfTors' },
      ],
    }),
    ebene: linienDiagramm({
      titel: 'Was im Gurt ankommt — Kräftepaar, lotrechte Biegung, örtliche '
           + 'Biegung', breite, hoehe: 210,
      yLabel: 'N [kN] / M [kNm]', punkte: x,
      serien: [
        { name: `N Kräftepaar (e = ${(ab.q?.e ?? 0).toFixed(1)} cm)`,
          werte: r.map((s) => s.N ?? 0), skizze: 'abfN' },
        { name: 'M Gurt lotrecht (halbe Last + Torsion)',
          werte: r.map((s) => s.MgurtVert ?? 0), skizze: 'abfTors' },
        { name: 'M örtlich zwischen zwei Blechen',
          werte: r.map((s) => s.Moertl ?? 0), cls: 'serie-4',
          skizze: 'abfOertl' },
      ],
    }),
    ausnutzung: linienDiagramm({
      titel: 'Ausnutzungsgrad η(x)', breite, hoehe: 240,
      yLabel: 'η [–]', punkte: x, grenze: 1.0,
      serien: [
        { name: `Gurt ${gurt}`, werte: r.map((s) => s.eta ?? 0),
          skizze: 'eta' },
        { name: 'Bindeblech (nächstgelegenes)', werte: etaBlech,
          skizze: 'eta' },
      ],
    }),
  };
}

/* ===========================================================================
 * DAS BEMESSUNGSDIAGRAMM DER DRUCKSTUETZE
 * ===========================================================================
 *
 * Weisung vom 11. September: «es sind noch sinnvolle diagramme (sidebar /
 * verlaeufe) fuer die druckstuetze und abfangjoch nachzuziehen.»
 *
 * >>> WARUM GERADE DIESES. <<<
 *
 * Der Nachweis der Stuetze IST eine Kurve - das Sortimentsblatt traegt die
 * zulaessige Druckkraft ueber die Laenge auf, und das Werkzeug interpoliert
 * darin. Wer nur «eta 0.27» liest, sieht nicht, WO er auf dieser Kurve steht:
 * ob eine halbe Meter mehr Laenge nichts ausmacht oder den Nachweis kippt.
 *
 * Die Kurve faellt steil ab. Bei U12 gibt das Blatt zwischen 6 und 10 m
 * 135 auf 48.7 kN - ueber ein Drittel der Laenge zwei Drittel der Tragkraft.
 * Genau das zeigt das Bild, und eine Zahl kann es nicht.
 *
 * >>> DREI LINIEN, UND JEDE SAGT ETWAS ANDERES. <<<
 *
 *   ZULAESSIG      die Kurve des Blattes, Stuetzstelle fuer Stuetzstelle
 *   VORHANDEN      die Stabkraft dieser Anordnung, als waagrechte Grenze
 *   KNICKEN        die Kontrollrechnung senkrecht zur Spreizebene
 *                  (`ankerKnicken`) - sie liegt hoch, und dass sie hoch
 *                  liegt, ist die Aussage: massgebend ist die andere
 *                  Richtung, und die steckt in der Blattkurve.
 *
 * Auf ZUG gibt es das Diagramm nicht: dort haengt die zulaessige Kraft an der
 * Befestigung, nicht an der Laenge, und eine Kurve ueber L waere eine
 * Waagrechte ohne Aussage.
 * ========================================================================= */

/**
 * Das Bemessungsdiagramm einer Druckstuetze mit ihrem Arbeitspunkt.
 *
 * @param {object} e       Eintrag aus `erg.anker[ende]`
 * @param {object} sortiment  {L: number[], N: number[]} des Typs
 * @param {object} opt     {breite, name, laengeMax, knickKurve}
 * @returns {string|null}  null auf Zug und ohne Kurve
 */
export function ankerDiagramm(e, sortiment, opt = {}) {
  const nw = e?.nachweis;
  if (!nw || nw.N >= 0) return null;               // Zugstab: keine Kurve
  const L = Array.isArray(sortiment?.L) ? sortiment.L : null;
  const N = Array.isArray(sortiment?.N) ? sortiment.N : null;
  if (!L || !N || L.length !== N.length || L.length < 2) return null;

  const vorh = Math.abs(nw.N);
  const serien = [{ name: `zulässig nach Blatt · ${nw.typ}`, werte: N,
                    skizze: 'ankerKurve' }];
  /*
   * DIE KONTROLLKURVE wird auf DENSELBEN Stuetzstellen ausgewertet - zwei
   * x-Achsen in einem Bild waeren keine Auskunft. Sie ist ein
   * BEMESSUNGSwert und die Blattkurve eine zulaessige Kraft; dass sie nicht
   * dieselbe Groesse sind, sagt die Legende.
   */
  if (typeof opt.knickKurve === 'function') {
    const k = L.map((l) => opt.knickKurve(l));
    if (k.every(Number.isFinite)) {
      serien.push({ name: 'N_b,Rd senkrecht zur Spreizebene (Kontrolle)',
                    werte: k, cls: 'serie-4', skizze: 'ankerKnick' });
    }
  }
  return linienDiagramm({
    titel: `Bemessungsdiagramm ${nw.typ}${opt.name ? ` · ${opt.name}` : ''}`
         + ' — zulässige Druckkraft über die Länge',
    breite: opt.breite ?? 900, hoehe: 240,
    xLabel: 'Stützenlänge L [m]', yLabel: 'N [kN]',
    punkte: L, serien,
    grenze: vorh,
    grenzeText: `vorhanden ${vorh.toFixed(1)} kN`,
    marke: {
      x: Math.min(Math.max(nw.L, L[0]), L[L.length - 1]),
      y: vorh,
      text: `L ${nw.L.toFixed(2)} m · η ${(nw.eta ?? 0).toFixed(3)}`,
      schlecht: nw.lieferbar === false || (nw.eta ?? 0) > 1,
    },
  });
}

/* ===========================================================================
 * DIE SCHNITTGROESSEN DES MASTEN UEBER SEINE HOEHE
 * ===========================================================================
 *
 * Weisung vom 11. September (dieselbe). Der Mast hatte eine TABELLE im
 * Auflagerblatt und kein Bild - und gerade bei ihm sagt das Bild mehr: wo
 * der Anker angreift, springt die Normalkraft, und das Moment knickt.
 *
 * >>> DIE HOEHE STEHT AUF DER X-ACHSE, NICHT AUF DER Y-ACHSE. <<<
 *
 * Ein Mast steht senkrecht, und das Bild moechte man aufrecht. Die Diagramme
 * dieses Werkzeugs tragen aber alle x waagrecht auf, und zwei Leserichtungen
 * nebeneinander sind schlimmer als eine ungewohnte. z laeuft von 0 (Fuss)
 * nach oben - wie in der Tabelle darunter.
 * ========================================================================= */

/**
 * Der Verlauf eines Mastnachweises ueber die Hoehe.
 *
 * @param {object} mn   Eintrag aus `erg.mast[name]`
 * @param {object} opt  {breite, name}
 * @returns {object|null} {schnitt, ausnutzung} - null ohne Reihe
 */
export function mastDiagramme(mn, opt = {}) {
  // `stationen` heisst die Reihe am Mastnachweis - dieselben Punkte, die
  // die Tabelle im Auflagerblatt fuehrt.
  const r = mn?.stationen;
  if (!Array.isArray(r) || r.length < 2) return null;
  // Von unten nach oben, wie der Mast steht.
  const s = [...r].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const z = s.map((p) => p.z ?? 0);
  const w = (f) => s.map((p) => p[f] ?? 0);
  const breite = opt.breite ?? 900;
  const nm = opt.name ? ` · ${opt.name}` : '';
  return {
    schnitt: linienDiagramm({
      titel: `Schnittgrössen über die Masthöhe${nm}`,
      breite, hoehe: 230, xLabel: 'z über Mastfuss [m]',
      yLabel: 'M [kNm] / N, V [kN]', punkte: z,
      /*
       * ALLE VIER ZEIGEN DASSELBE BILD: den Masten als Kragarm mit dem
       * Anker als zweitem Stuetzpunkt. Es ist das eine Bild, das die vier
       * Kurven erklaert - wo das Moment knickt und die Normalkraft springt.
       * Vier verschiedene waeren vier Wege zu derselben Aussage.
       */
      serien: [
        { name: 'M quer', werte: w('Mq'), skizze: 'mastM' },
        { name: 'M längs', werte: w('Ml'), skizze: 'mastM' },
        { name: 'N', werte: w('N'), skizze: 'mastM' },
        { name: 'V quer', werte: w('Vq'), cls: 'serie-4', skizze: 'mastM' },
      ],
    }),
    ausnutzung: linienDiagramm({
      titel: `Ausnutzung über die Masthöhe${nm}`,
      breite, hoehe: 200, xLabel: 'z über Mastfuss [m]',
      yLabel: 'η [–]', punkte: z, grenze: 1.0,
      serien: [{ name: 'η Querschnitt', werte: w('eta'), skizze: 'eta' }],
    }),
  };
}

/** Die drei Standarddiagramme aus einem Rechenergebnis. */
export function diagramme(erg, breite = 900) {
  const k = erg.knoten;
  const x = k.map((r) => r.x);
  return {
    schnittgroessen: linienDiagramm({
      titel: 'Schnittgrössen Ersatzbalken', breite,
      yLabel: 'M [kNm] / V [kN]', punkte: x,
      serien: [
        { name: 'M_y,ed', werte: k.map((r) => r.My), skizze: 'My' },
        { name: 'V_z,ed', werte: k.map((r) => r.Vz), skizze: 'Vz' },
        { name: 'M_z,ed', werte: k.map((r) => r.Mz), skizze: 'Mz' },
        { name: 'T_x,ed', werte: k.map((r) => r.Tx), cls: 'serie-4', skizze: 'Tx' },
      ],
    }),
    ebene: linienDiagramm({
      titel: 'Ebenenquerkräfte – Balkenanteil und Torsionsanteil überlagert', breite, hoehe: 210,
      yLabel: 'V [kN] / M [kNm]', punkte: x,
      serien: [
        { name: 'V Vertikalebene', werte: k.map((r) => r.VzEbene1), skizze: 'Vebene' },
        { name: 'davon aus Torsion', werte: k.map((r) => r.q.vertikal.anteilTorsion), skizze: 'Tx' },
        { name: 'V Horizontalebene', werte: k.map((r) => r.VyEbene1), skizze: 'Vebene' },
        { name: 'M_y,L,lokal', werte: k.map((r) => r.My_lokal), cls: 'serie-4', skizze: 'Mlokal' },
      ],
    }),
    ausnutzung: linienDiagramm({
      titel: 'Ausnutzungsgrad η(x)', breite, hoehe: 240,
      yLabel: 'η [–]', punkte: x, grenze: 1.0,
      serien: [
        { name: `Obergurt ${erg.modell.profOG.name}`, werte: k.map((r) => r.og.eta), skizze: 'eta' },
        { name: `Untergurt ${erg.modell.profUG.name}`, werte: k.map((r) => r.ug.eta), skizze: 'eta' },
        { name: 'Bindeblech', werte: k.map((r) => r.etaB), skizze: 'eta' },
      ],
    }),
  };
}
