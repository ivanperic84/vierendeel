/**
 * core.reaktionen.js
 * ---------------------------------------------------------------------------
 * DIE REAKTIONSKRÄFTE ALLER AUFLAGER, CHARAKTERISTISCH (30. September).
 *
 * Weisung, im Wortlaut:
 *
 *   «kannst du noch die mappe wo die reaktionskräfte zusammengefasst sind
 *    lesen und diese tabelle als output hier in der app anbieten, man sollte
 *    die charakteristischen lasten hier aufführen (massgebend in quer und
 *    längsrichtung) ohne abminderung der windlasten mit 0.7 faktor. bei einer
 *    jochreihe alle Auflager aufführen. und in der tabelle zusammentragen auf
 *    dem blatt noch eine kleine übersichtskizze zum tragwerk aufführen. setze
 *    noch die hinweistexte und die konvention des achssystem (beachte noch
 *    das die druckkräfte positiv sind auf der tabelle)»
 *
 * Auf Rückfrage: der Havariefall als EIGENE Zeile, die Tabelle im Reiter
 * Auflager und als Blatt im Export.
 *
 * >>> DAS VORBILD IST DIE ZUSAMMENFASSUNG DER EINWIRKUNGS-MAPPE. <<<
 *
 * Je Mast- und Ankerfundament: Vertikalkraft V min / max, Moment und
 * Horizontalkraft QUER zum Gleis (M_q um y, H_q in x), Moment und
 * Horizontalkraft LÄNGS (M_l um x, H_l in y), Torsion T um die Mastachse,
 * die Aufteilung ständig / veränderlich - und darunter die zulässigen
 * Standardlasten des Fundaments. Die Mappe zählt X quer, Y längs und
 * Z NACH UNTEN; eine Druckkraft auf das Fundament ist damit positiv, eine
 * abhebende negativ. Momente und Horizontalkräfte stehen als Betrag («±»),
 * wie in der Mappe - die Richtung wechselt mit dem Wind.
 *
 * >>> WOHER DIE ZAHLEN KOMMEN. <<<
 *
 * Aus dem STABWERK, weil nur dort alle Masten und Anker des Blattes in
 * einem Modell stehen («bei einer jochreihe alle Auflager aufführen»). Je
 * Lastfall die Auflagerkraft an jedem Fussknoten (`lsg.auflagerkraefte`),
 * über `anteileFuer` - dieselbe Stelle, die auch den Ausfall eines
 * gedrückten Seils mischt. Eine Auflagerkraft wirkt auf das Tragwerk; die
 * Kraft auf das Fundament ist ihr Gegenstück. F_z nach oben am Tragwerk
 * heisst also Druck aufs Fundament - positiv, wie in der Tabelle.
 *
 * >>> WELCHE ZUSTÄNDE. <<<
 *
 * Charakteristisch, alle Beiwerte 1, Wind OHNE ψ 0.70 (die Fälle des
 * Betriebswinds bleiben draussen). Das ständige G ist im Werkzeug in zwei
 * Hälften geteilt («Ständig (Tragwerk)» und «Ablenkkräfte ständig»); keine
 * davon ist ein Zustand, der vorkommt - sie werden zusammengezählt. Dazu
 * alle Fälle ständig + veränderlich (Wind ±x, ±y, Schnee). Die Fälle mit
 * dem veränderlichen Anteil allein geben die Aufteilung. Der Havariefall
 * (aussergewöhnlich, alle Beiwerte 1) steht als eigene Zeile.
 * ---------------------------------------------------------------------------
 */

/** Die Grössen einer Zeile, in der Reihenfolge der Mappe. */
export const REAKTION_SPALTEN = [
  { key: 'Mq', feld: 'fiy', was: 'Moment quer zum Gleis', sym: 'M_q', einheit: 'kNm', richtung: 'quer' },
  { key: 'Hq', feld: 'ux',  was: 'Horizontalkraft quer zum Gleis', sym: 'H_q', einheit: 'kN', richtung: 'quer' },
  { key: 'Ml', feld: 'fix', was: 'Moment längs zum Gleis', sym: 'M_l', einheit: 'kNm', richtung: 'laengs' },
  { key: 'Hl', feld: 'uy',  was: 'Horizontalkraft längs zum Gleis', sym: 'H_l', einheit: 'kN', richtung: 'laengs' },
  { key: 'T',  feld: 'fiz', was: 'Torsion um die Mastachse', sym: 'T', einheit: 'kNm', richtung: 'torsion' },
];

const KOMPONENTEN = ['ux', 'uy', 'uz', 'fix', 'fiy', 'fiz'];
const NULL6 = () => ({ ux: 0, uy: 0, uz: 0, fix: 0, fiy: 0, fiz: 0 });

/** Ist dieser Fall ein charakteristischer MIT ständiger Last und einem Leitwert? */
const istStaendigPlus = (l) => l.art === 'charakteristisch' && l.stufe !== 'betrieb'
  && Math.abs(Number(l.beiwerte?.G) || 0) > 1e-12 && Boolean(l.leit);
/** … eine der beiden Hälften von G (ständig, ohne Leiteinwirkung)? */
const istStaendigHaelfte = (l) => l.art === 'charakteristisch' && l.stufe !== 'betrieb'
  && Math.abs(Number(l.beiwerte?.G) || 0) > 1e-12 && !l.leit;
/** … der veränderliche Anteil allein? */
const istVeraenderlich = (l) => l.art === 'charakteristisch' && l.stufe !== 'betrieb'
  && !(Math.abs(Number(l.beiwerte?.G) || 0) > 1e-12) && Boolean(l.leit);

/**
 * Was für ein Auflager ist dieser Knoten?
 * `MAST_<id>_F` ist ein Mastfuss, `ANKER_<id>_F` das Fundament eines
 * Ankers; im Blatt kann ein Präfix davorstehen. Alles andere (ein
 * Längsanker des Tragauslegers, ein Lager ohne Masten) heisst nach seinem
 * Knoten.
 */
export function auflagerArt(knoten) {
  const m = /(?:^|_)MAST_(.+)_F$/.exec(knoten);
  if (m) return { art: 'mast', id: m[1] };
  const a = /(?:^|_)ANKER_(.+)_F$/.exec(knoten);
  if (a) return { art: 'anker', id: a[1] };
  // Der Längsanker des Tragauslegers: im Stabwerk ein fester Halt in y
  // am Knoten LV_M (export.axisvm.tragausleger.js).
  if (/(?:^|_)LV_M$/.test(knoten)) return { art: 'laengsanker', id: knoten };
  return { art: 'lager', id: knoten };
}

/**
 * Die Auflagerkräfte je Fall an jedem Auflager des Stabwerks.
 *
 * @param {object} dat     die Modelldatei des Stabwerks
 * @param {object} lsg     die Lösung (`auflagerkraefte`, `u`)
 * @param {Array}  faelle  die Lastfälle (lastfaelle(), mit art/beiwerte/leit)
 * @param {Function} anteile  `anteileFuer` aus core.stabnachweis.js
 * @returns {{auflager: Array, faelle: Array}}
 */
export function reaktionenAusStabwerk(dat, lsg, faelle, anteile) {
  const kn = new Map((dat?.knoten ?? []).map((k) => [k.name, k]));
  const je = new Map();                         // knoten -> Map(fall -> r)
  const lfListe = (faelle ?? []).filter((l) => l.art === 'charakteristisch'
    || l.art === 'aussergewoehnlich');
  lfListe.forEach((l) => {
    const summe = new Map();
    anteile(l, dat).forEach(({ lastfall, faktor }) => {
      if (!faktor || !lsg.u.has(lastfall)) return;
      lsg.auflagerkraefte(lastfall).forEach((a) => {
        if (!summe.has(a.knoten)) summe.set(a.knoten, NULL6());
        const r = summe.get(a.knoten);
        KOMPONENTEN.forEach((c) => { r[c] += faktor * (Number(a[c]) || 0); });
      });
    });
    summe.forEach((r, k) => {
      if (!je.has(k)) je.set(k, new Map());
      je.get(k).set(l.key, r);
    });
  });
  const auflager = [...je.entries()].map(([knoten, proFall]) => {
    const k = kn.get(knoten) ?? {};
    return { knoten, ...auflagerArt(knoten), x: Number(k.x) || 0, y: Number(k.y) || 0,
             z: Number(k.z) || 0, proFall };
  }).sort((a, b) => (a.x - b.x) || (a.art === 'mast' ? -1 : 1));
  return { auflager, faelle: lfListe };
}

/**
 * Die Zeilen der Tabelle je Auflager.
 *
 * @param {{auflager, faelle}} roh  aus `reaktionenAusStabwerk`
 * @returns {Array} je Auflager { …, haupt, havarie, anteil }
 */
export function reaktionsZeilen(roh) {
  const faelle = roh?.faelle ?? [];
  const haelften = faelle.filter(istStaendigHaelfte);
  const zustand = faelle.filter(istStaendigPlus);
  const veraenderlich = faelle.filter(istVeraenderlich);
  const havarie = faelle.filter((l) => l.art === 'aussergewoehnlich');

  return (roh?.auflager ?? []).map((a) => {
    const r = (key) => a.proFall.get(key) ?? null;
    // Das ganze G: beide Hälften zusammen - erst das ist ein Zustand.
    const G = haelften.length ? haelften.reduce((s, l) => {
      const x = r(l.key);
      if (x) KOMPONENTEN.forEach((c) => { s[c] += x[c]; });
      return s;
    }, NULL6()) : null;
    const zustaende = [
      ...(G ? [{ key: 'G', bez: 'Ständig', r: G }] : []),
      ...zustand.map((l) => ({ key: l.key, bez: l.bez, r: r(l.key) })),
    ].filter((z) => z.r);

    const zeile = (liste) => {
      if (!liste.length) return null;
      const V = liste.map((z) => ({ wert: z.r.uz, bez: z.bez }));
      const vMin = V.reduce((p, q) => (q.wert < p.wert ? q : p));
      const vMax = V.reduce((p, q) => (q.wert > p.wert ? q : p));
      const werte = {};
      REAKTION_SPALTEN.forEach((s) => {
        const b = liste.reduce((p, z) => {
          const w = Math.abs(z.r[s.feld]);
          return !p || w > p.wert ? { wert: w, bez: z.bez } : p;
        }, null);
        werte[s.key] = b;
      });
      return { Vmin: vMin, Vmax: vMax, ...werte };
    };

    /*
     * DIE AUFTEILUNG STÄNDIG / VERÄNDERLICH, je Richtung am Moment (beim
     * Anker an der Horizontalkraft): der ständige Betrag gegen den grössten
     * aus dem veränderlichen Anteil allein. Gezeigt als Prozent, wie die
     * Mappe - und als Zahl im Titel.
     */
    const anteil = (feld) => {
      if (!G) return null;
      const s = Math.abs(G[feld]);
      const v = veraenderlich.reduce((m, l) => Math.max(m, Math.abs(r(l.key)?.[feld] ?? 0)), 0);
      return s + v > 1e-9 ? { staendig: s, veraenderlich: v, prozent: s / (s + v) } : null;
    };
    const quer = a.art === 'mast' ? 'fiy' : 'ux';
    const laengs = a.art === 'mast' ? 'fix' : 'uy';
    // Der Havariefall mit dem ständigen Anteil, wie er gerechnet ist (alle
    // Beiwerte 1, G steckt im Fall).
    const hav = havarie.map((l) => ({ key: l.key, bez: l.bez, r: r(l.key) })).filter((z) => z.r);
    return {
      knoten: a.knoten, art: a.art, id: a.id, x: a.x, y: a.y, z: a.z,
      haupt: zeile(zustaende),
      havarie: zeile(hav),
      anteil: { quer: anteil(quer), laengs: anteil(laengs) },
    };
  });
}

/**
 * >>> DIE ÜBERSICHTSSKIZZE AUS DEM STABMODELL. <<<
 *
 * «auf dem blatt noch eine kleine übersichtskizze zum tragwerk aufführen».
 * Gezeichnet wird, was gerechnet ist: die echten Stäbe des Stabwerks
 * (Gurte, Bleche, Masten, Anker, Ausleger - keine Starrelemente, keine
 * Links) in der Ansicht quer zum Gleis (x–z). Eine eigene Zeichnung daneben
 * wäre eine zweite Geometrie, die beim nächsten Umbau etwas anderes zeigt.
 * Auf den Zentimeter gerundet und entdoppelt - die vier Gurte eines Jochs
 * fallen in dieser Ansicht paarweise zusammen.
 *
 * @returns {{linien: number[][], grenzen: {x0,x1,z0,z1}}}
 */
export function skizzeAusModell(dat) {
  const kn = new Map((dat?.knoten ?? []).map((k) => [k.name, k]));
  const r2 = (v) => Math.round(v * 100) / 100;
  const gesehen = new Set();
  const linien = [];
  (dat?.staebe ?? []).forEach((s) => {
    // Lange Links sind Seile (Aufhängung des Auslegers, Seilanker); die
    // kurzen Anschlusslinks (0.05 / 0.10 m) bleiben draussen.
    const a = kn.get(s.von), b = kn.get(s.bis);
    if (!a || !b) return;
    const lang = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) > 0.3;
    if (!(s.art === 'stab' || (s.art === 'link' && lang))) return;
    let p = [r2(a.x), r2(a.z), r2(b.x), r2(b.z)];
    if (p[0] > p[2] || (p[0] === p[2] && p[1] > p[3])) p = [p[2], p[3], p[0], p[1]];
    if (p[0] === p[2] && p[1] === p[3]) return;
    const k = p.join('|');
    if (gesehen.has(k)) return;
    gesehen.add(k);
    linien.push(p);
  });
  if (!linien.length) return null;
  const xs = linien.flatMap((l) => [l[0], l[2]]), zs = linien.flatMap((l) => [l[1], l[3]]);
  return { linien, grenzen: { x0: Math.min(...xs), x1: Math.max(...xs),
                              z0: Math.min(...zs), z1: Math.max(...zs) } };
}
