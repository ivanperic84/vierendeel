/**
 * render.abfang.js
 * ===========================================================================
 * DAS ABFANGJOCH IM BILD.
 *
 * Weisung vom 4. September: «können wir die abbildung 3d in die app und den
 * katalog der typen und längen der abfangjoche übernehmen in die sidebar,
 * damit man die modelle in axis aufbauen kann.»
 *
 * >>> WARUM EIN EIGENES MODUL. <<<
 *
 * `erzeugeSzene` in render.3d.js baut das TRAGJOCH: vier Winkelgurte aus
 * `querschnitt(m)`, Bindebleche in zwei Ebenen, Stationsliste, Mast und
 * Anbauteile. Jede dieser Grössen fehlt dem Abfangjoch oder bedeutet dort
 * etwas anderes — es hat ZWEI Gurte, seine Bleche liegen flach auf
 * Flanschhöhe, und ab A240 stehen an den Bereichsgrenzen Quersteifen aus
 * Walzprofil.
 *
 * Die Szene trägt dieselbe Gestalt wie die des Tragjochs (`flaechen`,
 * `linien`, `marken`, `bauteiltitel`, `masse`, `vektoren`), damit
 * `szeneVerschieben` und `szenenVereinen` sie ohne Sonderweg annehmen.
 *
 * Gezeichnet wird, was das Modell auch nach AxisVM ausleitet - dieselbe
 * Quelle, dieselben Stationen. Was im Bild steht, lässt sich dort bauen.
 * ===========================================================================
 */

import { abfangQuerschnitt, abfangBlechstationen,
         abfangStuetzweite } from './core.abfangjoch.js';
import { getAbfangjoch, abfangAufbau, abfangBindeblech,
         abfangEndverstaerkung, abfangQuersteife } from './data.abfangjoche.js';
import { getGurtprofil } from './data.profiles.js';

/**
 * Ein Quader zwischen x0 und x1, mittig um (yM, zM), mit Breite b und Höhe h.
 *
 * Die Bauteile des Abfangjochs sind allesamt gerade und achsparallel - ein
 * Quader genügt. Das feine Profilpolygon des Tragjochs (prisma) trüge hier
 * nichts bei: bei zwei Metern Bildbreite ist die Ausrundung eines UPE kein
 * Pixel breit.
 */
function quader(x0, x1, yM, zM, b, h, opt) {
  const y0 = yM - b / 2, y1 = yM + b / 2;
  const z0 = zM - h / 2, z1 = zM + h / 2;
  const P = (x, y, z) => [x, y, z];
  const ecken = [[y0, z0], [y1, z0], [y1, z1], [y0, z1]];
  const f = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    f.push({
      punkte: [P(x0, ecken[i][0], ecken[i][1]), P(x0, ecken[j][0], ecken[j][1]),
               P(x1, ecken[j][0], ecken[j][1]), P(x1, ecken[i][0], ecken[i][1])],
      xMitte: (x0 + x1) / 2, ...opt,
    });
  }
  f.push({ punkte: ecken.map((e) => P(x0, e[0], e[1])), xMitte: x0, ...opt });
  f.push({ punkte: ecken.map((e) => P(x1, e[0], e[1])), xMitte: x1, ...opt });
  return f;
}

/**
 * DIE SZENE EINES ABFANGJOCHS.
 *
 * @param {string} typ  z.B. 'A160'
 * @param {number} jt   Jochlänge [m], eine der geführten
 * @param {object} opt  {mastZeichnen}
 */
export function abfangSzene(typ, jt, opt = {}) {
  const a = getAbfangjoch(typ);
  const auf = abfangAufbau(a);
  const q = abfangQuerschnitt(typ);
  const p = getGurtprofil(auf.gurtprofil);
  const ein = abfangBlechstationen(typ, jt);
  const bl = abfangBindeblech(typ);
  const sw = abfangStuetzweite(typ, jt);

  const e = q.e / 100;                    // cm -> m, Achsabstand der Gurte
  const hG = p.h / 100;                   // Profilhöhe [m]
  const bG = p.b / 100;                   // Flanschbreite [m]
  const zf = (p.h - p.tf) / 2 / 100;      // Flanschmitte über der Schwerachse
  const js = sw ? sw.bis : jt;
  const ue = Math.max(0, (jt - js) / 2);

  const flaechen = [];
  const linien = [];
  const marken = [];
  const masse = [];
  const bauteiltitel = [];

  /*
   * DIE GURTE. Zwei Kästen über die volle Jochlänge, bei y = ±e/2 - dort,
   * wo auch das AxisVM-Modell sie führt. Ihre Breite ist die Flanschbreite,
   * ihre Höhe die Profilhöhe; die Öffnung des U zeigt nach aussen, was im
   * Bild bei dieser Grösse nicht mehr zu sehen wäre.
   */
  for (const s of [1, -1]) {
    flaechen.push(...quader(0, jt, s * e / 2, 0, bG, hG, {
      gruppe: 'profil', teil: s > 0 ? 'GURT_V' : 'GURT_H',
      label: `Gurt · ${auf.gurtprofil}`,
    }));
  }

  /*
   * DIE RIEGEL. An jeder Station entweder ein Blechpaar auf Flanschhöhe
   * oder - ab A240 an den Grenzen der QV-Bereiche - eine Quersteife auf der
   * Schwerachse. Beide spannen über den lichten Abstand `d`, nicht über den
   * Achsabstand: der Rest liegt im Gurt.
   */
  const d = (auf.d ?? 0) / 1000;
  const qsSt = abfangQuersteife(typ);
  const pSt = qsSt?.profil ? getGurtprofil(qsSt.profil) : null;
  (ein?.stationen ?? []).forEach((x, k) => {
    const art = ein.arten?.[k]?.art;
    if ((art === 'steife' || art === 'steifeEnde') && pSt) {
      flaechen.push(...quader(x - pSt.b / 200, x + pSt.b / 200, 0, 0,
                              d, pSt.h / 100, {
        /*
         * DIE QUERSTEIFE IST EIN BLECH IM SINNE DER EBENEN. Der Renderer
         * kennt `profil`, `blech`, `anbau` - eine eigene Ebene 'steife'
         * gaebe es nicht, und `_ebeneAn` liesse sie stillschweigend weg.
         * Sie steht an derselben Stelle wie ein Blechpaar und gehoert zu
         * derselben Schaltergruppe.
         */
        gruppe: 'blech', teil: `STEIFE_${k}`, station: k,
        label: `Quersteife · ${qsSt.profil}`,
      }));
      return;
    }
    const m2 = ein.arten?.[k]?.masse ?? bl?.regel;
    if (!m2) return;
    const bB = (m2.b ?? 100) / 1000;      // Breite in Trägerrichtung [m]
    const tB = (m2.t ?? 8) / 1000;        // Dicke [m]
    for (const s of [1, -1]) {
      flaechen.push(...quader(x - bB / 2, x + bB / 2, 0, s * zf, d, tB, {
        gruppe: 'blech', teil: `BL_${s > 0 ? 'O' : 'U'}${k}`, station: k,
        label: `Bindeblech ${m2.b}/${m2.t}`,
      }));
    }
  });

  /*
   * DIE GABEL. Ein zweites Gurtstück, AUSSEN angeschweisst - der Steg an den
   * Flanschspitzen des Gurtes (Schnitt A-A). Seine Achse liegt damit um eine
   * ganze Flanschbreite weiter aussen; im Bild ist genau das zu sehen.
   */
  const verst = abfangEndverstaerkung(typ);
  const gabel = verst?.art === 'gabel' ? verst.teile[0] : null;
  if (gabel?.beginn > 0 && gabel?.laenge > 0) {
    const v0 = gabel.beginn / 1000;
    const v1 = (gabel.beginn + gabel.laenge) / 1000;
    for (const [x0, x1] of [[v0, v1], [jt - v1, jt - v0]]) {
      for (const s of [1, -1]) {
        flaechen.push(...quader(x0, x1, s * (e / 2 + bG), 0, bG, hG, {
          gruppe: 'profil', teil: 'GABEL',
          label: `Gabel · ${gabel.profil} × ${gabel.laenge}`,
        }));
      }
    }
  }

  /*
   * DIE AUFLAGER. Zwei Marken auf der Jochachse, um den Überstand
   * eingerückt - dort hängt im Modell der Auflagerpunkt an beiden Gurten.
   */
  /*
   * >>> DIE FELDNAMEN SIND DIE DES RENDERERS. <<<
   *
   * Erster Anlauf: `punkt`, `von`, `bis`, `label`. Der Renderer liest aber
   * `p`, `p0`, `p1`, `text` - und stolperte an `mk.p[0]` ueber undefined,
   * bevor irgendetwas gezeichnet war. Ergebnis: eine leere Flaeche und
   * zweihundert gleiche Zeilen in der Konsole.
   *
   * Der Auftraggeber hat es gemeldet, nicht der Pruefstand: er baut die
   * Szene, aber er malt sie nicht.
   */
  for (const x of [ue, jt - ue]) {
    marken.push({ gruppe: 'auflager', art: 'auflager',
                  p: [x, 0, -hG / 2 - 0.15], text: 'Auflager' });
  }

  bauteiltitel.push({
    p: [jt / 2, 0, hG / 2 + 0.25],
    text: `${typ} · ${jt.toFixed(2)} m · ${ein?.anzahl ?? 0} Stationen`,
    feld: 'abfangTyp', tab: 'system',
  });
  masse.push({
    feld: 'L', tab: 'system', achse: 'x',
    p0: [0, 0, 0], p1: [jt, 0, 0], ab: [0, 0, -1], d: 0.9,
    text: `jt = ${jt.toFixed(2)} m`,
  });
  if (sw) {
    masse.push({
      tab: 'system', achse: 'x',
      p0: [ue, 0, 0], p1: [jt - ue, 0, 0], ab: [0, 0, -1], d: 1.5,
      text: `js = ${js.toFixed(2)} m`,
    });
  }

  /*
   * >>> OHNE `grenzen` BLEIBT DIE KAMERA STEHEN. <<<
   *
   * `ansichtZuruecksetzen` liest sie als Erstes und kehrt ohne sie sofort
   * zurueck - die Szene ist dann da, das Bild aber leer, weil die Kamera
   * noch auf das vorige Tragwerk sieht. Genau das hat der Auftraggeber
   * gemeldet: «ich sehe die abfangjoche im 3d noch nicht.» Zweihundert
   * Flaechen, kein Pixel.
   *
   * Gebildet wird sie aus dem, was wirklich gezeichnet wird - so macht es
   * `grenzenVon` fuer den Ersatzquerschnitt auch.
   */
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  let z0 = Infinity, z1 = -Infinity;
  flaechen.forEach((f) => f.punkte.forEach((pt) => {
    if (pt[0] < x0) x0 = pt[0];
    if (pt[0] > x1) x1 = pt[0];
    if (pt[1] < y0) y0 = pt[1];
    if (pt[1] > y1) y1 = pt[1];
    if (pt[2] < z0) z0 = pt[2];
    if (pt[2] > z1) z1 = pt[2];
  }));
  if (!Number.isFinite(x0)) { x0 = 0; x1 = jt; y0 = -0.5; y1 = 0.5; z0 = -0.5; z1 = 0.5; }

  return {
    flaechen, linien, marken, masse, bauteiltitel,
    vektoren: [], lastflaechen: [],
    // Etwas Luft nach oben und unten fuer Titel und Masskette.
    grenzen: { xMin: x0, xMax: x1, yMin: y0, yMax: y1,
               zMin: z0 - 1.2, zMax: z1 + 0.8 },
    L: jt, art: 'abfangjoch', typ,
    // Der Nachweisschnitt liegt im Randfeld - dort fällt er (Randfeld ist
    // das längste Feld, siehe abfangRahmenfeld).
    xNachweis: ein?.stationen?.[0] ?? null,
  };
}
