/**
 * render.abfang.js
 * ===========================================================================
 * DAS ABFANGJOCH IM BILD.
 *
 * Weisung vom 4. September: «können wir die abbildung 3d in die app und den
 * katalog der typen und längen der abfangjoche übernehmen in die sidebar,
 * damit man die modelle in axis aufbauen kann.» — und, nachdem der erste
 * Wurf stand: «diese sind ähnlich detailiert wie die tragjoche darzustellen
 * und nicht als einfache abstrakte quader.»
 *
 * >>> DIE KÖRPER KOMMEN AUS DEM SORTIMENT, NICHT AUS DER ANSCHAUUNG. <<<
 *
 * Der erste Wurf zeichnete jedes Bauteil als Kasten mit den Aussenmassen des
 * Profils — h × b, gefüllt. Das ist schnell und falsch: ein UPE 160 ist ein
 * C, kein Balken, und wohin seine Öffnung zeigt, entscheidet über den
 * Anschluss der Bindebleche. Gezeichnet wird jetzt der Umriss aus
 * `data.profiles.js`, über `walzProfilPoly` in `render.koerper.js` — dasselbe
 * Modul, aus dem das Tragjoch seine Winkel bekommt, und dasselbe, das der
 * Tragausleger benutzen wird.
 *
 * >>> WARUM ES TROTZDEM EIN EIGENES MODUL IST. <<<
 *
 * `erzeugeSzene` in render.3d.js baut das TRAGJOCH: vier Winkelgurte aus
 * `querschnitt(m)`, Bindebleche in zwei Ebenen, Mast und Anbauteile. Jede
 * dieser Grössen fehlt dem Abfangjoch oder bedeutet dort etwas anderes — es
 * hat ZWEI Gurte, seine Bleche liegen flach auf Flanschhöhe, und ab A240
 * stehen an den Bereichsgrenzen Quersteifen aus Walzprofil. Gemeinsam sind
 * die BAUSTEINE, nicht der Aufbau.
 *
 * Die Szene trägt dieselbe Gestalt wie die des Tragjochs (`flaechen`,
 * `linien`, `marken`, `bauteiltitel`, `masse`, `legende`, `grenzen`), damit
 * `szeneVerschieben`, `szenenVereinen` und die Legendenspalte sie ohne
 * Sonderweg annehmen.
 *
 * Gezeichnet wird, was das Modell auch nach AxisVM ausleitet — dieselbe
 * Quelle, dieselben Stationen. Was im Bild steht, lässt sich dort bauen.
 * ===========================================================================
 */

import { abfangQuerschnitt, abfangBlechstationen,
         abfangStuetzweite } from './core.abfangjoch.js';
import { getAbfangjoch, abfangAufbau, abfangBindeblech,
         abfangEndverstaerkung, abfangQuersteife } from './data.abfangjoche.js';
import { getGurtprofil } from './data.profiles.js';
import { bauteilFarbe } from './design.js';
import { prisma, prismaY, platte, walzProfilPoly } from './render.koerper.js';

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
   * DIE LEGENDE IST EINE STÜCKLISTE. Jedes Bauteil bekommt beim ersten
   * Auftreten seine Farbe und zählt danach mit — wie beim Tragjoch. So steht
   * neben dem Bild, was verbaut ist und wie oft, und beides kommt aus
   * derselben Quelle wie die Ausleitung.
   */
  const bauteile = new Map();
  const farbeFuer = (schluessel, label, art) => {
    if (!bauteile.has(schluessel)) {
      bauteile.set(schluessel, {
        schluessel, label, art, farbe: bauteilFarbe(bauteile.size), anzahl: 0,
      });
    }
    const b2 = bauteile.get(schluessel);
    b2.anzahl++;
    return b2.farbe;
  };

  /*
   * >>> DIE VERSTÄRKUNG SITZT NUR AN EINEM ENDE. <<<
   *
   * Weisung vom 4. September: «beachte das die verstärkung nur einseitig ist
   * aufgrund der längeren gabel für das einfädelde montieren der träger
   * zwischen zwei masten.»
   *
   * Das erklärt zugleich die ungleichen Endbereiche der Blecheinteilung —
   * links 1450 bis zum ersten Blech, rechts 900. Das lange Ende ist die
   * Montagegabel: der Träger wird zwischen zwei stehende Masten eingefädelt,
   * und dafür braucht ein Ende Überlänge. Verstärkt wird genau dieses eine.
   *
   * Die Stückliste sagt dasselbe: `anzahl: 2` heisst bei zwei Gurten EIN
   * Stück je Gurt an einem Ende, nicht vier Stücke an beiden. Bis hierher
   * stand die Gabel an beiden Enden — im Bild und im Rechenmodell.
   */
  const verst = abfangEndverstaerkung(typ);
  const gabel = verst?.art === 'gabel' ? verst.teile[0] : null;
  const gBereiche = [];
  if (gabel?.beginn > 0 && gabel?.laenge > 0) {
    gBereiche.push([gabel.beginn / 1000, (gabel.beginn + gabel.laenge) / 1000]);
  }

  /*
   * DIE SCHNITTE ENTLANG DER ACHSE. Ein Prisma je Abschnitt, damit ein
   * Bauteil später Farbe und Wert je Feld tragen kann — das Tragjoch macht
   * es ebenso. Die Blechstationen sind die Schnitte, dazu die beiden Enden
   * und die Grenzen der Gabel.
   */
  const stationen = ein?.stationen ?? [];
  const xs = [0, jt, ...stationen, ...gBereiche.flat()]
    .map((x) => Math.round(x * 1e6) / 1e6)
    .filter((x) => x >= 0 && x <= jt)
    .sort((u, v) => u - v)
    .filter((x, i, arr) => i === 0 || x - arr[i - 1] > 1e-9);

  /*
   * DIE GURTE. Zwei Profile bei y = ±e/2 — dort, wo auch das AxisVM-Modell
   * sie führt. Die Öffnung des C zeigt nach aussen (Weisung, 4. September:
   * «gurte spiegelsymetrisch auf die jochachse bezogen»); der Stegrücken
   * liegt damit innen, und genau dort stossen die Bindebleche an.
   */
  let fbGurt = null;
  for (const s of [1, -1]) {
    // Je Gurt EIN Eintrag in der Stueckliste - nicht je Feld, sonst zaehlte
    // sie Prismen statt Bauteile.
    fbGurt = farbeFuer(`profil|${p.name}`, `Gurt · ${p.name}`, 'profil');
    const poly = walzProfilPoly(p, { oeffnung: s })
      .map(([y, z]) => [y + s * e / 2 * 1000, z]);
    for (let i = 0; i < xs.length - 1; i++) {
      flaechen.push(...prisma(poly, xs[i], xs[i + 1], {
        gruppe: 'profil', teil: s > 0 ? 'GURT_V' : 'GURT_H', station: i,
        farbeBauteil: fbGurt,
        label: `Gurt ${s > 0 ? 'vorn' : 'hinten'} · ${p.name}`,
      }));
    }
  }

  /*
   * DIE GABEL. Ein zweites Gurtstück, AUSSEN angeschweisst — der Steg an den
   * Flanschspitzen des Gurtes (Schnitt A-A). Seine Achse liegt damit um eine
   * ganze Flanschbreite weiter aussen; im Bild ist genau das zu sehen, und
   * im Modell trägt dort der Verbundquerschnitt.
   */
  if (gabel) {
    for (const s of [1, -1]) {
      const fb = farbeFuer(`profil|gabel|${gabel.profil}`,
                           `Gabel · ${gabel.profil} × ${gabel.laenge}`, 'profil');
      const poly = walzProfilPoly(p, { oeffnung: s })
        .map(([y, z]) => [y + s * (e / 2 + bG) * 1000, z]);
      for (const [x0, x1] of gBereiche) {
        flaechen.push(...prisma(poly, x0, x1, {
          gruppe: 'profil', teil: 'GABEL', farbeBauteil: fb,
          label: `Gabel · ${gabel.profil} × ${gabel.laenge}`,
        }));
      }
    }
  }

  /*
   * DAS DECKBLECH — ab A270 tritt es an die Stelle der Gabel.
   *
   * >>> SEINE LAGE IST EINE LESART, KEIN BELEG. <<<
   *
   * Die Stückliste führt b, t und l, nicht die Lage. Belegt ist der
   * Zusammenhang b = a − 10 über alle vier Typen (A270 260/270, A300
   * 290/300, A330 320/330, A360 350/360): die Breite folgt der PROFILHÖHE,
   * nicht der Flanschbreite. Gezeichnet ist es deshalb als stehendes Blech
   * auf der Aussenseite des Gurtes, über die Profilhöhe — an derselben
   * Stelle und mit derselben Aufgabe wie die Gabel der kleineren Typen.
   * Bestätigt ist das nicht, und im Rechenmodell steht es noch gar nicht.
   */
  for (const db of (verst?.art === 'deckblech' ? verst.teile : [])) {
    const l2 = (db.l ?? 0) / 1000;
    if (!(l2 > 0)) continue;
    const [x0, x1] = db.lage === 'R' ? [jt - l2, jt] : [0, l2];
    const t2 = db.t ?? 10;                        // mm
    const hD = db.b ?? p.h * 10;                  // mm, Breite = Profilhöhe − 10
    for (const s of [1, -1]) {
      const fb = farbeFuer(`blech|deck|${db.b}x${db.t}`,
                           `Deckblech ${db.b}×${db.t}`, 'blech');
      // Aussenkante der Flanschspitzen: Schwerachse + b − e_y.
      const yA = s * (e / 2 + bG - p.ey / 100) * 1000;
      const poly = [[yA, -hD / 2], [yA + s * t2, -hD / 2],
                    [yA + s * t2, hD / 2], [yA, hD / 2]];
      flaechen.push(...prisma(poly, x0, x1, {
        gruppe: 'blech', teil: `DECK_${db.lage}`, farbeBauteil: fb,
        label: `Deckblech ${db.b}×${db.t}×${db.l} (${db.lage})`,
      }));
    }
  }

  /*
   * DIE RIEGEL. An jeder Station entweder ein Blechpaar auf Flanschhöhe oder
   * — ab A240 an den Grenzen der QV-Bereiche — eine Quersteife aus
   * Walzprofil auf der Schwerachse. Beide spannen über die LÄNGE AUS DER
   * STÜCKLISTE, nicht über den Achsabstand: dass A270 bei d = 600 ein
   * Regelblech von 463 führt, ist ein Datum und keine Ungenauigkeit.
   */
  const qsSt = abfangQuersteife(typ);
  const pSt = qsSt?.profil ? getGurtprofil(qsSt.profil) : null;
  stationen.forEach((x, k) => {
    const art = ein.arten?.[k]?.art;
    if ((art === 'steife' || art === 'steifeEnde') && pSt) {
      /*
       * Schnitt C-C: senkrechter Steg zwischen die Gurtstege geschweisst.
       * Seine beiden Flansche liegen damit dort, wo sonst die zwei
       * Bindebleche liegen — er ersetzt das Paar, und das soll man sehen.
       */
      const lSt = ((art === 'steifeEnde' ? qsSt.ende?.laenge : qsSt.laenge)
                   ?? auf.d ?? 0) / 1000;
      const mm = Math.round(lSt * 1000);
      const fb = farbeFuer(`profil|steife|${pSt.name}|${mm}`,
                           `Quersteife · ${pSt.name} × ${mm}`, 'profil');
      flaechen.push(...prismaY(walzProfilPoly(pSt), x, -lSt / 2, lSt / 2, {
        /*
         * DIE QUERSTEIFE IST EIN BLECH IM SINNE DER EBENEN. Der Renderer
         * kennt `profil`, `blech`, `anbau` — eine eigene Ebene 'steife' gäbe
         * es nicht, und `_ebeneAn` liesse sie stillschweigend weg. Sie steht
         * an derselben Stelle wie ein Blechpaar und gehört zu derselben
         * Schaltergruppe.
         */
        gruppe: 'blech', teil: `STEIFE_${k}`, station: k, farbeBauteil: fb,
        label: `Quersteife · ${pSt.name} × ${mm}`,
      }));
      return;
    }
    const m2 = ein.arten?.[k]?.masse ?? bl?.regel;
    if (!m2) return;
    const lB = (m2.l ?? auf.d ?? 0) / 1000;         // Blechlänge quer [m]
    const kurz = { endeL: 'Endblech links', endeR: 'Endblech rechts' }[art]
              ?? 'Bindeblech';
    for (const s of [1, -1]) {
      const fb = farbeFuer(`blech|${art ?? 'regel'}|${m2.b}x${m2.t}x${m2.l}`,
                           `${kurz} ${m2.b}×${m2.t}×${m2.l}`, 'blech');
      flaechen.push(...platte(x, m2.b ?? 100, 'z', s * zf, -lB / 2, lB / 2, {
        gruppe: 'blech', teil: `BL_${s > 0 ? 'O' : 'U'}${k}`, station: k,
        dicke: m2.t ?? 8, farbeBauteil: fb,
        label: `${kurz} ${m2.b}×${m2.t}×${m2.l}`,
      }));
    }
  });

  /*
   * DIE AUFLAGER. Zwei Marken auf der Jochachse, um den Überstand eingerückt
   * — dort hängt im Modell der Auflagerpunkt an beiden Gurten.
   *
   * >>> DIE FELDNAMEN SIND DIE DES RENDERERS. <<<
   *
   * Erster Anlauf: `punkt`, `von`, `bis`, `label`. Der Renderer liest aber
   * `p`, `p0`, `p1`, `text` — und stolperte an `mk.p[0]` über undefined,
   * bevor irgendetwas gezeichnet war. Ergebnis: eine leere Fläche und
   * zweihundert gleiche Zeilen in der Konsole. Gemeldet hat es der
   * Auftraggeber, nicht der Prüfstand: er baut die Szene, aber er malt sie
   * nicht.
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
  // Das Montageende zeigt sich an der Masskette, nicht nur am Bauteil.
  if (gBereiche.length) {
    const [g0, g1] = gBereiche[0];
    masse.push({
      tab: 'system', achse: 'x',
      p0: [g0, 0, 0], p1: [g1, 0, 0], ab: [0, 0, 1], d: 0.55,
      text: `Gabel ${Math.round((g1 - g0) * 1000)}`,
    });
  }

  /*
   * >>> OHNE `grenzen` BLEIBT DIE KAMERA STEHEN. <<<
   *
   * `ansichtZuruecksetzen` liest sie als Erstes und kehrt ohne sie sofort
   * zurück — die Szene ist dann da, das Bild aber leer, weil die Kamera noch
   * auf das vorige Tragwerk sieht. Genau das hat der Auftraggeber gemeldet:
   * «ich sehe die abfangjoche im 3d noch nicht.» Zweihundert Flächen, kein
   * Pixel.
   *
   * Gebildet wird sie aus dem, was wirklich gezeichnet wird — so macht es
   * `grenzenVon` für den Ersatzquerschnitt auch.
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
  if (!Number.isFinite(x0)) {
    x0 = 0; x1 = jt; y0 = -0.5; y1 = 0.5; z0 = -0.5; z1 = 0.5;
  }

  return {
    flaechen, linien, marken, masse, bauteiltitel,
    vektoren: [], lastflaechen: [],
    legende: [...bauteile.values()],
    // Etwas Luft nach oben und unten für Titel und Masskette.
    grenzen: { xMin: x0, xMax: x1, yMin: y0, yMax: y1,
               zMin: z0 - 1.2, zMax: z1 + 0.8 },
    stationen,
    L: jt, art: 'abfangjoch', typ,
    // Der Nachweisschnitt liegt im Randfeld - dort fällt er (Randfeld ist
    // das längste Feld, siehe abfangRahmenfeld).
    xNachweis: stationen[0] ?? null,
  };
}
