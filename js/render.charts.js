/**
 * render.charts.js
 * ---------------------------------------------------------------------------
 * DIAGRAMME als reines SVG. Keine Rechnung, keine externen Bibliotheken.
 * Farben über CSS-Klassen (serie-1 ... serie-4).
 * ---------------------------------------------------------------------------
 */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Wie `esc`, aber auch für Attributwerte - dort sind Anführungszeichen tödlich. */
const att = (s) => esc(s).replace(/"/g, '&quot;');
const n = (v) => (Math.round(v * 1000) / 1000).toString();

/* ===========================================================================
 * >>> JEDE SCHNITTGRÖSSE TRÄGT IHRE STATISCHE BENENNUNG. <<<
 * ===========================================================================
 *
 * Weisung vom 15. September: «bei allen schnittkräften anschrift neben dem
 * quer längs vertikal etc. die statischen benennung aufführen wie Fx Fy Fz
 * und das gleiche mit den Momenten Mxx Myy Mzz.»
 *
 * Es gibt nichts zu erfinden: die Schreibweise steht seit den Anbauteilen im
 * Werkzeug (`core.anbauteile.js`) und sie ist GLOBAL, nicht örtlich:
 *
 *   F_x  in der Jochachse (quer zum Gleis)   M_xx  um die Jochachse (Torsion)
 *   F_y  in Gleisrichtung                    M_yy  um y - biegt quer
 *   F_z  lotrecht                            M_zz  um z - biegt im Grundriss
 *
 * >>> WARUM GLOBAL UND NICHT ÖRTLICH. <<<
 *
 * Weil dieselbe Anschrift über alle Bauteile laufen muss. Der Ersatzbalken
 * des Jochs liegt in der Jochachse - dort fallen örtliche und globale Achsen
 * zusammen, und `M_y,ed` IST `M_yy`. Der Mast steht senkrecht: seine
 * Normalkraft ist örtlich `N`, global aber `F_z`, und sein «M quer» ist
 * `M_yy`. Wer beides nebeneinander liest, sieht die Verbindung - zwei
 * örtliche Systeme nebeneinander verdecken sie.
 *
 * DIE DRUCKSTÜTZE BEKOMMT KEINS: sie steht schräg, ihre Normalkraft läuft
 * auf keiner globalen Achse. Eine Anschrift wäre dort falsch.
 * ========================================================================= */

/**
 * Das Kürzel mit tiefgestelltem Index: `M_yy` wird zu M mit kleinem yy.
 * Ohne Unterstrich unverändert.
 */
function kuerzelSvg(k) {
  // Das fuehrende Minus gehoert zum Zeichen, nicht zum Namen: `-M_xx` wird
  // zu Minus, M, tiefgestelltem xx.
  const m = /^(−?[A-Za-z]+)_(.+)$/.exec(String(k).replace(/^-/, '−'));
  if (!m) return esc(k);
  // `dy` statt `baseline-shift`: das eine koennen alle Browser, das andere
  // nicht. Das tspan steht am Zeilenende - es muss nichts zurueckgesetzt
  // werden.
  return `${esc(m[1])}<tspan class="sub" dy="2.2">${esc(m[2])}</tspan>`;
}

/** Die Länge des Kürzels in Zeichen - der Unterstrich zählt nicht mit. */
const kuerzelBreit = (k) => String(k).replace('_', '').length;

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
  const mL = 62, mR = 16, mB = 42;
  /* =======================================================================
   * >>> DIE LEGENDE WIRD VORAB AUFGETEILT. <<<
   * =======================================================================
   *
   * Sie stand bisher in EINER Zeile und lief beim Abfangjoch knapp am Rand
   * vorbei - «M Gurt lotrecht (halbe Last + Torsion)» ist ein langer Name.
   * Mit dem statischen Kuerzel daneben (15. September) waere sie darueber
   * hinausgelaufen, und was aus dem viewBox faellt, ist einfach weg.
   *
   * Also zuerst aufteilen, dann den oberen Rand danach bemessen: jede
   * zusaetzliche Zeile hebt `mT` um 13. Die Zeichenbreite ist geschaetzt
   * (6.6 px je Zeichen der Monoschrift) - dieselbe Schaetzung wie bisher.
   */
  const legBr = (s) => 32 + s.name.length * 6.6
    + (s.kurz ? kuerzelBreit(s.kurz) * 6.6 + 10 : 0);
  const legPos = [];
  {
    let lx = mL, zeile = 0;
    o.serien.forEach((s) => {
      const br = legBr(s);
      if (lx > mL && lx + br > W - mR) { lx = mL; zeile += 1; }
      legPos.push({ x: lx, zeile });
      lx += br;
    });
  }
  const legZeilen = legPos.length ? legPos[legPos.length - 1].zeile + 1 : 1;
  const mT = 26 + (legZeilen - 1) * 13;
  const xs = o.punkte;
  const alle = o.serien
    .flatMap((s) => [...s.werte, ...(s.band ? [...s.band[0], ...s.band[1]] : [])])
    .filter(Number.isFinite);
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
  /* =======================================================================
   * >>> DIE SPANNE ALS BAND, DIE LINIE DARAUF. <<<
   * =======================================================================
   *
   * Weisung vom 13. September: eine echte Umhuellende je Groesse.
   *
   * Eine Umhuellende hat KEINE Linie - sie hat einen oberen und einen
   * unteren Rand, und dazwischen liegt alles, was die Kombinationen
   * hergeben. Als Band gezeichnet bleibt es EINE Serie in der Legende;
   * acht Einzellinien fuer vier Groessen waeren eine Legende, die niemand
   * mehr liest.
   *
   * Die Linie darauf ist der Wert der massgebenden Kombination - die, die
   * das groesste eta traegt. Sie liegt immer im Band; wo sie an seinem Rand
   * laeuft, bestimmt dieselbe Kombination auch die Groesse.
   */
  o.serien.forEach((s, k) => {
    const cls = s.cls ?? 'serie-' + (k + 1);
    if (s.band) {
      const oben = xs.map((x, i) => `${i ? 'L' : 'M'}${n(X(x))},${n(Y(s.band[1][i]))}`);
      const unten = xs.map((x, i) => `L${n(X(x))},${n(Y(s.band[0][i]))}`).reverse();
      g += `<path class="band ${cls}" d="${oben.join(' ')} ${unten.join(' ')} Z"/>`;
    }
    const d = xs.map((x, i) => `${i ? 'L' : 'M'}${n(X(x))},${n(Y(s.werte[i]))}`).join(' ');
    g += `<path class="serie ${cls}" d="${d}"/>`;
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

  /*
   * DIE LEGENDE IST EINE BESCHRIFTUNG, KEIN KNOPF (15. September).
   *
   * Hier hing ein Kraftbild an jedem Eintrag: ein Klick, und darunter stand
   * eine kleine Skizze, was die Groesse am Joch anrichtet. Weisung: \u00abnimm
   * diese sekundaeren erklaer skizzen zu den einzelnen kurven weg, diese sind
   * meist nicht ganz korrekt und verwirren mehr als sie helfen.\u00bb
   *
   * Sie hatte recht: die Bilder waren aus den Formeln GEBAUT, nicht aus dem
   * gerechneten Zustand - sie zeigten den Regelfall, auch wo das Vorzeichen
   * gerade andersherum stand. Ein Bild, das neben der Kurve steht und
   * manchmal das Gegenteil sagt, ist schlimmer als keines.
   *
   * Wo das Zusammenspiel der Groessen erklaert gehoert, steht es im
   * Handbuch; dort laesst es sich auch am Fall nachrechnen.
   */
  o.serien.forEach((s, k) => {
    const { x: lx, zeile } = legPos[k];
    // Die LETZTE Zeile sitzt auf mT - 12; jede darueber 13 hoeher.
    const ly = 26 + zeile * 13;
    g += '<g>';
    g += `<line class="serie ${s.cls ?? 'serie-' + (k + 1)}" x1="${n(lx)}" y1="${n(ly - 12)}" x2="${n(lx + 18)}" y2="${n(ly - 12)}"/>`;
    g += `<text class="legende" x="${n(lx + 23)}" y="${n(ly - 8)}">${esc(s.name)}</text>`;
    /*
     * DAS KUERZEL STEHT DANEBEN, NICHT ANSTELLE. Der beschreibende Name sagt,
     * WAS die Groesse am Bauteil anrichtet; das Kuerzel sagt, WIE sie im
     * Nachweis und im Statikprogramm heisst. Beides zusammen ist die
     * Auskunft - das eine allein ist die halbe.
     */
    if (s.kurz) {
      // Der Name beginnt bei lx + 23 - das Kuerzel also hinter seinem Ende,
      // mit fuenf Punkten Luft. Ohne sie klebt «F_z» an einem kurzen «N».
      g += `<text class="legende-kurz" x="${n(lx + 28 + s.name.length * 6.6)}"`
         + ` y="${n(ly - 8)}">${kuerzelSvg(s.kurz)}</text>`;
    }
    g += '</g>';
  });

  g += `<text class="achse" x="${n((W + mL) / 2)}" y="${n(H - 6)}" text-anchor="middle">${esc(o.xLabel ?? 'x [m]')}</text>`;
  g += `<text class="achse" x="14" y="${n((H) / 2)}" text-anchor="middle" transform="rotate(-90 14 ${n(H / 2)})">${esc(o.yLabel ?? '')}</text>`;

  /* =======================================================================
   * >>> DIE MESSSTELLE: DAS BILD TRAEGT SEINE ZAHLEN MIT. <<<
   * =======================================================================
   *
   * Weisung vom 15. September: «zudem wenn die diagramme gross sind
   * messstelle definieren könen mit zahlenoutput.»
   *
   * Ein Diagramm zeigt den VERLAUF - wo es steigt, wo es knickt, wo das
   * Vorzeichen kippt. Was es nicht kann, ist die Zahl an einer bestimmten
   * Stelle hergeben; dafuer musste man bisher in die Tabelle wechseln und
   * die Stelle dort wiederfinden.
   *
   * Der Datensatz haengt als `data-mess` am Bild: Achsenlage, Stuetzstellen,
   * je Serie die Werte mit Einheit und Nachkommastellen. Gezeichnet wird
   * nichts davon - erst `verdrahteMessung` macht daraus einen Faden, den man
   * ueber das Bild zieht. OHNE diese Verdrahtung ist das Bild unveraendert.
   *
   * DIE SPANNE WANDERT MIT, wo es eine gibt. Bei einer Umhuellenden ist
   * gerade sie die Auskunft: der Wert der massgebenden Kombination sagt
   * wenig, wenn man nicht weiss, wie weit die anderen davon abliegen.
   * ===================================================================== */
  const r4 = (v) => (Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : 0);
  const mess = {
    W, H, mL, mR, mT, mB, x0, x1, y0, y1,
    xLabel: o.xLabel ?? 'x [m]',
    xEinheit: (/\[([^\]]+)\]/.exec(o.xLabel ?? 'x [m]') ?? [, 'm'])[1],
    punkte: xs.map(r4),
    serien: o.serien.map((s, k) => ({
      name: s.name, kurz: s.kurz ?? '', cls: s.cls ?? 'serie-' + (k + 1),
      einheit: s.einheit ?? '', nk: s.nk ?? 2,
      werte: s.werte.map(r4),
      band: s.band ? [s.band[0].map(r4), s.band[1].map(r4)] : null,
    })),
  };
  return `<figure class="diagramm" data-mess="${att(JSON.stringify(mess))}">
    <figcaption>${esc(o.titel)}</figcaption>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img"
         aria-label="${esc(o.titel)}">${g}</svg>
  </figure>`;
}

/* ===========================================================================
 * >>> DER FADEN UEBER DEM BILD. <<<
 * ===========================================================================
 *
 * Die zweite Haelfte der Weisung vom 15. September. `linienDiagramm` legt die
 * Zahlen ans Bild, hier werden sie bedienbar.
 *
 * >>> ER RASTET AUF DIE STUETZSTELLEN EIN. <<<
 *
 * Nicht aus Bequemlichkeit: die Stuetzstellen SIND die Nachweisstellen -
 * Blechstationen, Lasteinleitungen, Auflager. Zwischen zweien liegt eine
 * gerade Verbindung, die niemand gerechnet hat. Ein Faden, der dort einen
 * Zwischenwert ausweist, gaebe eine Zahl aus, die im Nachweis nicht vorkommt.
 * Derselbe Grund, aus dem `abfangDiagramme` kein feineres Raster zeichnet.
 *
 * >>> UND ER LAESST SICH FESTHALTEN. <<<
 *
 * Ein Wert, der beim Wegziehen der Maus verschwindet, laesst sich nicht
 * abschreiben und nicht mit dem Nachbarbild vergleichen. Ein Klick haelt ihn,
 * der naechste loest ihn; die Pfeiltasten gehen von Stelle zu Stelle.
 *
 * @param {Element} wurzel  Teilbaum, in dem Bilder verdrahtet werden
 * @returns {number} Anzahl verdrahteter Bilder
 * ========================================================================= */
export function verdrahteMessung(wurzel) {
  if (!wurzel || typeof wurzel.querySelectorAll !== 'function') return 0;
  const bilder = [...wurzel.querySelectorAll('figure.diagramm[data-mess]')]
    .filter((f) => !f.classList.contains('messbar'));
  bilder.forEach(messFaden);
  return bilder.length;
}

const SVGNS = 'http://www.w3.org/2000/svg';

/** Ein Kuerzel als HTML - `M_yy` wird zu M mit tiefgestelltem yy. */
function kuerzelHtml(k) {
  const m = /^(−?[A-Za-z]+)_(.+)$/.exec(String(k).replace(/^-/, '−'));
  return m ? `${esc(m[1])}<sub>${esc(m[2])}</sub>` : esc(k);
}

function messFaden(fig) {
  let d;
  try { d = JSON.parse(fig.dataset.mess); } catch { return; }
  const svg = fig.querySelector('svg');
  if (!svg || !Array.isArray(d.punkte) || d.punkte.length < 2) return;
  fig.classList.add('messbar');

  const X = (v) => d.mL + ((v - d.x0) / (d.x1 - d.x0 || 1)) * (d.W - d.mL - d.mR);
  const Y = (v) => d.H - d.mB
                 - ((v - d.y0) / (d.y1 - d.y0 || 1)) * (d.H - d.mT - d.mB);

  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('class', 'messung');
  svg.appendChild(g);
  const leiste = document.createElement('div');
  leiste.className = 'mess-leiste';
  leiste.hidden = true;
  fig.appendChild(leiste);

  let fest = null;               // festgehaltener Index, null = frei

  const aus = () => { g.textContent = ''; leiste.hidden = true; };

  function zeige(i) {
    const x = d.punkte[i];
    const px = X(x);
    g.textContent = '';
    const li = document.createElementNS(SVGNS, 'line');
    li.setAttribute('class', 'mess-faden');
    li.setAttribute('x1', px); li.setAttribute('y1', d.mT);
    li.setAttribute('x2', px); li.setAttribute('y2', d.H - d.mB);
    g.appendChild(li);
    d.serien.forEach((s) => {
      const v = s.werte[i];
      if (!Number.isFinite(v)) return;
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('class', `mess-punkt ${s.cls}`);
      c.setAttribute('cx', px); c.setAttribute('cy', Y(v));
      c.setAttribute('r', '3.4');
      g.appendChild(c);
    });
    const zeilen = d.serien.map((s) => {
      const v = s.werte[i];
      const zahl = Number.isFinite(v) ? v.toFixed(s.nk) : '–';
      // DIE SPANNE NUR, WO ES EINE GIBT - bei einem einzelnen Lastfall
      // waere sie eine Wiederholung des Wertes.
      const sp = s.band
        ? `${s.band[0][i].toFixed(s.nk)} … ${s.band[1][i].toFixed(s.nk)}`
        : '';
      return `<tr>
        <td><i class="mess-farbe ${s.cls}"></i>${esc(s.name)}</td>
        <td class="mess-kurz">${s.kurz ? kuerzelHtml(s.kurz) : ''}</td>
        <td class="zahl">${zahl}</td>
        <td class="mess-eh">${esc(s.einheit)}</td>
        <td class="mess-spanne">${sp}</td>
      </tr>`;
    }).join('');
    leiste.innerHTML = `<div class="mess-kopf">
        <b>${d.xLabel.replace(/\s*\[.*\]$/, '')} = ${x.toFixed(3)}`
      + ` ${esc(d.xEinheit)}</b>
        <span class="mess-hinweis">${fest === null
          ? 'Klick hält die Stelle fest'
          : 'festgehalten · Klick löst, ← → wandert'}</span>
      </div><table class="mess-tab">${zeilen}</table>`;
    leiste.hidden = false;
  }

  /** Vom Zeigergerät zur nächstgelegenen Stützstelle. */
  function stelle(ev) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    let p;
    try {
      p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
    } catch {
      const q2 = svg.createSVGPoint();
      q2.x = ev.clientX; q2.y = ev.clientY;
      p = q2.matrixTransform(ctm.inverse());
    }
    const v = d.x0 + ((p.x - d.mL) / (d.W - d.mL - d.mR || 1)) * (d.x1 - d.x0);
    let b = 0;
    d.punkte.forEach((x, i) => {
      if (Math.abs(x - v) < Math.abs(d.punkte[b] - v)) b = i;
    });
    return b;
  }

  svg.addEventListener('pointermove', (ev) => {
    if (fest !== null) return;
    const i = stelle(ev);
    if (i !== null) zeige(i);
  });
  svg.addEventListener('pointerleave', () => { if (fest === null) aus(); });
  svg.addEventListener('click', (ev) => {
    if (fest !== null) { fest = null; aus(); return; }
    const i = stelle(ev);
    if (i === null) return;
    fest = i; zeige(i);
  });
  // Ohne tabindex nimmt ein SVG keine Tastatur an.
  svg.setAttribute('tabindex', '0');
  svg.addEventListener('keydown', (ev) => {
    const schritt2 = ev.key === 'ArrowLeft' ? -1 : ev.key === 'ArrowRight' ? 1 : 0;
    if (!schritt2) return;
    ev.preventDefault();
    const von = fest === null ? 0 : fest;
    fest = Math.min(d.punkte.length - 1, Math.max(0, von + schritt2));
    zeige(fest);
  });
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
        /*
         * DAS ABFANGJOCH LIEGT WAAGRECHT - seine Rahmenebene auch. Die
         * Biegung darin dreht um die LOTRECHTE Achse, ist also M_zz; die
         * Querkraft darin laeuft in Gleisrichtung, F_y. Beim Tragjoch ist
         * es umgekehrt, und genau deshalb steht das Kuerzel da.
         */
        { name: 'M Rahmenebene', werte: sn('Mzz'),
          kurz: 'M_zz', einheit: 'kNm' },
        { name: 'V Rahmenebene', werte: sn('Fy'),
          kurz: 'F_y', einheit: 'kN' },
        { name: 'M quer (lotrecht)', werte: sn('Myy'),
          kurz: 'M_yy', einheit: 'kNm' },
        { name: 'M Torsion', werte: sn('Mxx'), cls: 'serie-4',
          kurz: 'M_xx', einheit: 'kNm' },
      ],
    }),
    ebene: linienDiagramm({
      titel: 'Was im Gurt ankommt — Kräftepaar, lotrechte Biegung, örtliche '
           + 'Biegung', breite, hoehe: 210,
      yLabel: 'N [kN] / M [kNm]', punkte: x,
      serien: [
        { name: `N Kräftepaar (e = ${(ab.q?.e ?? 0).toFixed(1)} cm)`,
          werte: r.map((s) => s.N ?? 0), kurz: 'F_x', einheit: 'kN' },
        { name: 'M Gurt lotrecht (halbe Last + Torsion)',
          werte: r.map((s) => s.MgurtVert ?? 0), kurz: 'M_yy', einheit: 'kNm' },
        // Oertlich biegt die Querkraft der RAHMENEBENE - also im Grundriss.
        { name: 'M örtlich zwischen zwei Blechen',
          werte: r.map((s) => s.Moertl ?? 0), cls: 'serie-4',
          kurz: 'M_zz', einheit: 'kNm' },
      ],
    }),
    ausnutzung: linienDiagramm({
      titel: 'Ausnutzungsgrad η(x)', breite, hoehe: 240,
      yLabel: 'η [–]', punkte: x, grenze: 1.0,
      serien: [
        { name: `Gurt ${gurt}`, werte: r.map((s) => s.eta ?? 0),
          einheit: '', nk: 3 },
        { name: 'Bindeblech (nächstgelegenes)', werte: etaBlech,
          einheit: '', nk: 3 },
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
  /*
   * KEIN ACHSENKUERZEL AN DER STUETZE. Sie steht schraeg; ihre Normalkraft
   * laeuft auf keiner globalen Achse, und `F_x` oder `F_z` daneben waere
   * schlicht falsch. Was hier zaehlt, ist die Stabkraft N.
   */
  const serien = [{ name: `zulässig nach Blatt · ${nw.typ}`, werte: N,
                    einheit: 'kN' }];
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
                    werte: k, cls: 'serie-4', einheit: 'kN' });
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
  // Die Verformung kommt aus demselben Durchgang (core.mast.js).
  const verf = Array.isArray(mn?.verformung)
    ? [...mn.verformung].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)) : null;
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
      /*
       * AM MASTEN STEHT DIE STABACHSE LOTRECHT - hier gehen oertliche und
       * globale Benennung auseinander. «N» ist oertlich die Normalkraft,
       * global F_z; «M quer» biegt in der Querebene, dreht also um y. Die
       * Zuordnung M quer -> M_yy fuehrt `core.mast.js` seit den Anbauteilen
       * selbst (`Mq: k.Myy`).
       *
       * >>> SEIT DEM 15. SEPTEMBER RECHNET DER MAST SELBST GLOBAL. <<<
       *
       * Weisung: "konvention app global nachziehen." Vorher fuehrte er
       * Ebenen (Mq/Ml/Mt), und weil die Rechte-Hand-Regel fuer x und y
       * gegenlaeufige Drehsinne gibt, trug die Anschrift Minuszeichen
       * ("M laengs ist -M_xx"). Jetzt sind die Werte selbst global, und
       * die Anschrift ist wieder eine Gleichheit.
       */
      serien: [
        { name: 'M quer', werte: w('Myy'), kurz: 'M_yy', einheit: 'kNm' },
        { name: 'M längs', werte: w('Mxx'), kurz: 'M_xx', einheit: 'kNm' },
        { name: 'N', werte: w('Fz'), kurz: 'F_z', einheit: 'kN' },
        { name: 'V quer', werte: w('Fx'), cls: 'serie-4',
          kurz: 'F_x', einheit: 'kN' },
      ],
    }),
    ausnutzung: linienDiagramm({
      titel: `Ausnutzung über die Masthöhe${nm}`,
      breite, hoehe: 200, xLabel: 'z über Mastfuss [m]',
      yLabel: 'η [–]', punkte: z, grenze: 1.0,
      serien: [{ name: 'η Querschnitt', werte: w('eta'),
                 einheit: '', nk: 3 }],
    }),
    /* =====================================================================
     * >>> DIE VERFORMUNG (Weisung vom 24. September). <<<
     * ===================================================================
     *
     * «nimm die verformung in die resultat plot und mache entsprechende
     *  diagramme.»
     *
     * In MILLIMETERN, nicht in Metern: die Grenzwerte heissen 40 mm und
     * L/200, und eine Kurve um 0.085 liest niemand.
     *
     * DIE GRENZE IST DIE DER MASTSPITZE (L/200, nur Wind) - sie ist die
     * schaerfere der beiden und gilt der ganzen Hoehe als Bezugslinie.
     * Was WIRKLICH nachgewiesen wird, steht in der Kachel daneben; das
     * Diagramm zeigt den Verlauf, nicht das Urteil.
     * =================================================================== */
    verformung: verf && verf.length >= 2 ? linienDiagramm({
      titel: `Verformung über die Masthöhe${nm}`,
      breite, hoehe: 200, xLabel: 'z über Mastfuss [m]',
      yLabel: 'w [mm]', punkte: verf.map((p) => p.z ?? 0),
      grenze: opt.grenze ?? null,
      serien: [
        { name: 'w quer zum Gleis', werte: verf.map((p) => (p.x ?? 0) * 1000),
          kurz: 'w_x', einheit: 'mm', nk: 1 },
        { name: 'w in Gleisrichtung', werte: verf.map((p) => (p.y ?? 0) * 1000),
          kurz: 'w_y', einheit: 'mm', nk: 1 },
      ],
    }) : null,
  };
}

/** Die drei Standarddiagramme aus einem Rechenergebnis. */
export function diagramme(erg, breite = 900) {
  const k = erg.knoten;
  const x = k.map((r) => r.x);
  /*
   * >>> DIE UMHÜLLENDE IST KEINE MOMENTENLINIE. <<<
   *
   * Nachgefragt am 12. September: «ich kann mir die schnittgrösse my bei
   * diesem tragwerk nicht erklären.»
   *
   * Die Rechnung stimmt - geprüft am Gleichgewicht: M(L/2) − M(0) ist exakt
   * qL²/8, und dass M(0) nicht null ist, kommt von der Drehfeder des Masten.
   * Verwirrend ist etwas anderes: `huellkurve()` nimmt je Station den Knoten
   * der Kombination mit dem GRÖSSTEN η - mit allem, was an ihm hängt, also
   * auch mit ihrem M_y. Wo die massgebende Kombination von Station zu
   * Station wechselt, springt die Linie, und dM/dx ist dort nicht mehr V.
   *
   * Für den Nachweis ist das richtig: gefragt ist an jeder Stelle der
   * ungünstigste Wert. Als KURVE gelesen ist es eine Falle, denn sie sieht
   * aus wie ein Schnittgrössenverlauf. Also steht es im Titel, und wer eine
   * echte Momentenlinie braucht, wählt oben einen einzelnen Lastfall.
   */
  const huell = erg.istHuellkurve === true;
  /*
   * >>> SEIT DEM 13. SEPTEMBER STEHT DAS BAND DAHINTER. <<<
   *
   * Der Titel sagte bis dahin nur, dass die Linie keine Momentenlinie sei -
   * richtig, aber es blieb bei der Warnung. Jetzt ist die Spanne gezeichnet:
   * je Station das Kleinste und das Groesste ueber alle Kombinationen. Wer
   * eine echte Momentenlinie braucht, waehlt weiterhin oben einen einzelnen
   * Lastfall - dann faellt das Band weg, weil es nichts zu umhuellen gibt.
   */
  const zusatz = huell ? ' · umhüllend, Band = Spanne über alle Kombinationen' : '';
  /*
   * DIE SPANNE STEHT AM KNOTEN (siehe `huellkurve`). Fehlt sie - ein
   * einzelner Lastfall, ein alter Stand -, wird kein Band gezeichnet; die
   * Linie allein bleibt richtig.
   */
  const band = (g) => (huell && k.every((r) => r.spanne?.[g])
    ? [k.map((r) => r.spanne[g][0]), k.map((r) => r.spanne[g][1])] : null);
  return {
    schnittgroessen: linienDiagramm({
      titel: `Schnittgrössen Ersatzbalken${zusatz}`, breite,
      yLabel: 'M [kNm] / V [kN]', punkte: x,
      serien: [
        /*
         * AM ERSATZBALKEN FALLEN BEIDE SYSTEME ZUSAMMEN: seine Stabachse IST
         * die Jochachse. `M_y,ed` und `M_yy` sind dieselbe Groesse - und dass
         * das so ist, ist selbst eine Auskunft. Am Masten daneben ist es
         * nicht so.
         */
        { name: 'M_y,ed', werte: k.map((r) => r.My), band: band('My'),
          kurz: 'M_yy', einheit: 'kNm' },
        { name: 'V_z,ed', werte: k.map((r) => r.Vz), band: band('Vz'),
          kurz: 'F_z', einheit: 'kN' },
        { name: 'M_z,ed', werte: k.map((r) => r.Mz), band: band('Mz'),
          kurz: 'M_zz', einheit: 'kNm' },
        { name: 'T_x,ed', werte: k.map((r) => r.Tx), cls: 'serie-4',
          band: band('Tx'), kurz: 'M_xx', einheit: 'kNm' },
      ],
    }),
    ebene: linienDiagramm({
      titel: 'Ebenenquerkräfte – Balkenanteil und Torsionsanteil überlagert', breite, hoehe: 210,
      yLabel: 'V [kN] / M [kNm]', punkte: x,
      serien: [
        { name: 'V Vertikalebene', werte: k.map((r) => r.VzEbene1),
          kurz: 'F_z', einheit: 'kN' },
        { name: 'davon aus Torsion',
          werte: k.map((r) => r.q.vertikal.anteilTorsion),
          kurz: 'F_z', einheit: 'kN' },
        { name: 'V Horizontalebene', werte: k.map((r) => r.VyEbene1),
          kurz: 'F_y', einheit: 'kN' },
        // Die oertliche Biegung des Gurtes zwischen zwei Blechen: lotrecht.
        { name: 'M_y,L,lokal', werte: k.map((r) => r.My_lokal), cls: 'serie-4',
          kurz: 'M_yy', einheit: 'kNm' },
      ],
    }),
    ausnutzung: linienDiagramm({
      titel: 'Ausnutzungsgrad η(x)', breite, hoehe: 240,
      yLabel: 'η [–]', punkte: x, grenze: 1.0,
      serien: [
        { name: `Obergurt ${erg.modell.profOG.name}`,
          werte: k.map((r) => r.og.eta), einheit: '', nk: 3 },
        { name: `Untergurt ${erg.modell.profUG.name}`,
          werte: k.map((r) => r.ug.eta), einheit: '', nk: 3 },
        { name: 'Bindeblech', werte: k.map((r) => r.etaB),
          einheit: '', nk: 3 },
      ],
    }),
  };
}
