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
export function reaktionenAusStabwerk(dat, lsg, faelle, anteile,
                                      { alle = false, zusammenfassen = true } = {}) {
  const kn = new Map((dat?.knoten ?? []).map((k) => [k.name, k]));
  const je = new Map();                         // knoten -> Map(fall -> r)
  const lfListe = (faelle ?? []).filter((l) => alle || l.art === 'charakteristisch'
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
  const einzeln = [...je.entries()].map(([knoten, proFall]) => {
    const k = kn.get(knoten) ?? {};
    return { knoten, ...auflagerArt(knoten), x: Number(k.x) || 0, y: Number(k.y) || 0,
             z: Number(k.z) || 0, proFall };
  });
  // «Resultierende» (Vorgabe) oder «Einzelgurte» (2. Oktober).
  const auflager = (zusammenfassen ? jochendenZusammenfassen(einzeln) : einzeln)
    .sort((a, b) => (a.x - b.x) || (a.art === 'mast' ? -1 : 1));
  return { auflager, faelle: lfListe };
}

/**
 * >>> DER GEWÄHLTE LASTFALL JE AUFLAGER (2. Oktober). <<<
 *
 * Frage «wie soll die logik sein in bezug auf die auswahl zum lastfall?»,
 * auf Rückfrage «Hülle bleibt, dazu der gewählte Fall»: die Tabelle zeigt
 * weiter die charakteristische Hülle; ist oben ein Lastfall gewählt, kommt je
 * Auflager seine Zeile dazu - mit Vorzeichen (Druck positiv wie V), in den
 * Werten des Falls (charakteristisch oder Bemessung, wie er definiert ist).
 *
 * @returns {Map<string, object>}  je Auflager-Kennung (knoten) die Zeile
 */
export function reaktionenGewaehlt(dat, lsg, lf, anteile, { zusammenfassen = true } = {}) {
  const out = new Map();
  if (!lf) return out;
  const roh = reaktionenAusStabwerk(dat, lsg, [lf], anteile, { alle: true, zusammenfassen });
  roh.auflager.forEach((a) => {
    const r = a.proFall.get(lf.key);
    if (!r) return;
    const w = (v) => ({ wert: v, bez: lf.bez });
    out.set(a.knoten, {
      bez: lf.bez, Vmin: w(r.uz), Vmax: w(r.uz),
      ...Object.fromEntries(REAKTION_SPALTEN.map((s) => [s.key, w(r[s.feld])])),
    });
  });
  return out;
}

/*
 * >>> DAS JOCH OHNE MASTEN: EIN AUFLAGER JE JOCHENDE (2. Oktober). <<<
 *
 * Weisung: «kannst du beim joch ohne masten die reaktionskräfte global pro
 * jochende aufführen. im bericht und excel». Ohne Masten hält das Modell
 * die vier Gurte am Jochende einzeln (OGL_…, OGR_…, UGL_…, UGR_…); die
 * Tabelle führte jeden Knoten als eigenes «Lager». Jetzt je Jochende eine
 * Zeile: die Kräfte summiert in den globalen Achsen (x quer, y längs, z),
 * die Momente um den Mittelpunkt der vier Knoten (Jochachse am Ende) -
 * aus den Kräftepaaren der Gurte und den Knotenmomenten.
 */
/*
 * Auch die alten Fischbauchjoche (7. Oktober). Weisung: «Reaktionskräfte
 * alte Fischbauchjoche (ohne maste und als jochreihe mit mehreren jochen)
 * als resultierende.» Ihre Auflager heissen `AUF_<Ende>[_L|_R]` (der
 * verjüngte Endbereich, export.axisvm.js) und fielen bisher durch - jedes
 * stand für sich in der Tabelle.
 */
const GURTLAGER = /^(?:(.+)_)?(?:(?:OG|UG)(?:L|R)_[-\d.]+|AUF_[AB](?:_[LR])?)$/;

export function jochendenZusammenfassen(liste) {
  const gruppen = new Map();
  const rest = [];
  liste.forEach((a) => {
    const m = a.art === 'lager' ? GURTLAGER.exec(a.knoten) : null;
    if (!m) { rest.push(a); return; }
    const tw = m[1] ?? '';
    const k = `${tw}|${Math.round(a.x * 1000)}`;
    if (!gruppen.has(k)) gruppen.set(k, { tw, x: a.x, teile: [] });
    gruppen.get(k).teile.push(a);
  });
  const jeTw = new Map();
  gruppen.forEach((g) => {
    if (!jeTw.has(g.tw)) jeTw.set(g.tw, []);
    jeTw.get(g.tw).push(g);
  });
  const enden = [];
  jeTw.forEach((gl) => {
    gl.sort((p, q) => p.x - q.x);
    gl.forEach((g, i) => {
      const n = g.teile.length;
      const y0 = g.teile.reduce((s, a) => s + a.y, 0) / n;
      const z0 = g.teile.reduce((s, a) => s + a.z, 0) / n;
      const proFall = new Map();
      g.teile.forEach((a) => a.proFall.forEach((r, fall) => {
        if (!proFall.has(fall)) proFall.set(fall, NULL6());
        const s = proFall.get(fall);
        const dx = a.x - g.x, dy = a.y - y0, dz = a.z - z0;
        s.ux += r.ux; s.uy += r.uy; s.uz += r.uz;
        // M = Σ (r - r0) × F + Σ M_Knoten
        s.fix += dy * r.uz - dz * r.uy + r.fix;
        s.fiy += dz * r.ux - dx * r.uz + r.fiy;
        s.fiz += dx * r.uy - dy * r.ux + r.fiz;
      }));
      const ende = gl.length === 2 ? (i === 0 ? 'A' : 'B') : String(i + 1);
      enden.push({ knoten: g.teile.map((a) => a.knoten).join(' + '), art: 'jochende',
                   id: `${g.tw ? `${g.tw} · ` : ''}Ende ${ende}`, tw: g.tw || null, ende,
                   x: g.x, y: y0, z: z0, proFall, knotenAnzahl: n });
    });
  });
  return [...rest, ...enden];
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
    const mitMoment = a.art === 'mast' || a.art === 'jochende';
    const quer = mitMoment ? 'fiy' : 'ux';
    const laengs = mitMoment ? 'fix' : 'uy';
    // Der Havariefall mit dem ständigen Anteil, wie er gerechnet ist (alle
    // Beiwerte 1, G steckt im Fall).
    const hav = havarie.map((l) => ({ key: l.key, bez: l.bez, r: r(l.key) })).filter((z) => z.r);
    return {
      knoten: a.knoten, art: a.art, id: a.id, x: a.x, y: a.y, z: a.z,
      // Joch ohne Masten (2. Oktober): Tragwerk und Ende für den Namen.
      ...(a.art === 'jochende' ? { tw: a.tw, ende: a.ende } : {}),
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
    const laenge = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    // Die Anbauteile (Hängestütze, Jochaufsatz, Ausleger, Traverse) sind
    // im Modell starre Glieder; die langen davon gehören ins Bild, die
    // kurzen Anschlussstücke des Jochs nicht.
    const anbau = s.art === 'starr' && laenge > 0.4;
    if (!(s.art === 'stab' || anbau || (s.art === 'link' && laenge > 0.3))) return;
    let p = [r2(a.x), r2(a.z), r2(b.x), r2(b.z)];
    if (p[0] > p[2] || (p[0] === p[2] && p[1] > p[3])) p = [p[2], p[3], p[0], p[1]];
    // Fünfte Stelle: 1 = Seil (langer Link), gestrichelt; 2 = Anbauteil.
    p.push(s.art === 'link' ? 1 : anbau ? 2 : 0);
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

/**
 * >>> DIE NEUEN BAUTEILE IN DER SKIZZE (8. Oktober, Bestandesschutz). <<<
 * «markiere die neuen Bauteile Rot in der Übersicht». Neu ist, was das
 * Stabmodell MIT den neuen Teilen an Anbauteil-Stäben und -Knoten führt und
 * das Modell des Bestands nicht (die ausgeschalteten Teile bleiben in der
 * Liste, die Namen der übrigen sind in beiden Modellen dieselben). Nur
 * Namen der Anbauteile (ARM…, ARMM…, AT…, AL…) - die Gurte sind im Modell
 * mit den neuen Teilen feiner geteilt und wären sonst alle «neu».
 *
 * @returns {{linien: number[][], punkte: number[][]}} in x–z, Modellkoordinaten
 */
const ANBAU_NAME = /(^|_)(ARMM?|AT|AL)\d/;
export function neueTeileSkizze(dat, datBestand) {
  if (!dat || !datBestand) return { linien: [], punkte: [] };
  const kn = new Map((dat.knoten ?? []).map((k) => [k.name, k]));
  const altS = new Set((datBestand.staebe ?? []).map((s) => s.name));
  const altK = new Set((datBestand.knoten ?? []).map((k) => k.name));
  const r2 = (v) => Math.round(v * 100) / 100;
  const gesehen = new Set();
  const linien = [];
  (dat.staebe ?? []).forEach((s) => {
    if (altS.has(s.name) || !ANBAU_NAME.test(s.name)) return;
    const a = kn.get(s.von), b = kn.get(s.bis);
    if (!a || !b) return;
    const p = [r2(a.x), r2(a.z), r2(b.x), r2(b.z)];
    if (p[0] === p[2] && p[1] === p[3]) return;
    const k = p.join('|');
    if (gesehen.has(k)) return;
    gesehen.add(k);
    linien.push(p);
  });
  const punkte = [];
  const gesehenP = new Set();
  (dat.knoten ?? []).forEach((k) => {
    if (altK.has(k.name) || !ANBAU_NAME.test(k.name)) return;
    const p = [r2(k.x), r2(k.z)];
    if (gesehenP.has(p.join('|'))) return;
    gesehenP.add(p.join('|'));
    punkte.push(p);
  });
  return { linien, punkte };
}

/* ===========================================================================
 * >>> KRÄFTE AM JOCHANSCHLUSS (7. Oktober). <<< Frage: «wo kann man die
 * auflagerreaktionen bei den jochbefestigungen herauslesen?», dann: «unter
 * Auflager eine Tabelle zu Kräfte am Jochanschluss ergänzen.» Je Anschluss
 * (Link `LINK_<Mast>_<OG|UG><L|R>`, vom Masten zum Gurt) die Kraft, die das
 * Joch auf den Masten gibt - global, F_z nach oben (Druck auf den Masten
 * negativ, wie am Mastfuss) -, charakteristisch über dieselben Zustände wie
 * die Reaktionstabelle: das ganze G und G + Wind / Schnee; je Komponente
 * das Kleinste und das Grösste mit seinem Fall.
 * ========================================================================= */
const ANSCHLUSS_LINK = /^(.*?)LINK_([^_]+)_(OG|UG)([LR])$/;

export function anschlussKraefte(dat, lsg, faelle, anteile) {
  const links = (lsg?.elemente ?? []).filter((e) => e.s.art === 'link' && ANSCHLUSS_LINK.test(e.s.name));
  if (!links.length) return null;
  const jeLf = new Map();
  const vonLf = (lf) => {
    if (jeLf.has(lf)) return jeLf.get(lf);
    const uv = lsg.u.get(lf);
    const m = new Map();
    if (uv) {
      links.forEach((e) => {
        // Drei Kräfte und drei Momente am Mastknoten (die Momente für die Resultierende).
        const f = [0, 0, 0, 0, 0, 0];
        for (let r = 0; r < 6; r += 1) {
          let s = 0;
          for (let b = 0; b < 12; b += 1) {
            const dof = b < 6 ? e.i * 6 + b : e.j * 6 + (b - 6);
            s += e.kG[r * 12 + b] * uv[dof];
          }
          f[r] = -s;                       // Kraft auf den Mastknoten (i)
        }
        m.set(e.s.name, f);
      });
    }
    jeLf.set(lf, m);
    return m;
  };
  const kombi = (lf) => {
    const out = new Map();
    anteile(lf, dat).forEach(({ lastfall, faktor }) => {
      if (!faktor) return;
      vonLf(lastfall).forEach((f, name) => {
        const z = out.get(name) ?? [0, 0, 0, 0, 0, 0];
        for (let r = 0; r < 6; r += 1) z[r] += faktor * f[r];
        out.set(name, z);
      });
    });
    return out;
  };
  const haelften = faelle.filter(istStaendigHaelfte);
  const zustaende = [];
  if (haelften.length) {
    const g = new Map();
    haelften.forEach((lf) => kombi(lf).forEach((f, n) => {
      const z = g.get(n) ?? [0, 0, 0, 0, 0, 0];
      for (let r = 0; r < 6; r += 1) z[r] += f[r];
      g.set(n, z);
    }));
    zustaende.push({ bez: 'Ständig', f: g });
  }
  faelle.filter(istStaendigPlus).forEach((lf) => zustaende.push({ bez: lf.bez, f: kombi(lf) }));
  /*
   * >>> RESULTIERENDE JE JOCHENDE (8. Oktober). <<< Weisung: «mach bei den
   * jochreaktionen einen schalter wo man entweder die einzelnen gurte sieht
   * oder die summe davon als resultierende». Summiert wird JE ZUSTAND, dann
   * die Hülle - die Summe der Hüllwerte der vier Gurte wäre zu gross (ihre
   * Grösstwerte fallen nicht in denselben Zustand). Die Momente stehen um
   * die Mitte der Anschlusspunkte am Masten: Σ (r − r0) × F + Knotenmomente,
   * global, rechte Hand.
   */
  const knotenVon = new Map(dat.knoten.map((k) => [k.name, k]));
  const gruppen = new Map();
  links.forEach((e) => {
    const [, praefix, mast] = ANSCHLUSS_LINK.exec(e.s.name);
    const k = `${praefix}|${mast}`;
    if (!gruppen.has(k)) gruppen.set(k, { tw: praefix.replace(/_$/, '') || null, mast, links: [] });
    gruppen.get(k).links.push(e);
  });
  const resultierende = [...gruppen.values()].map((g) => {
    const pkt = g.links.map((e) => knotenVon.get(e.s.von));
    const r0 = ['x', 'y', 'z'].map((a) => pkt.reduce((s, p) => s + p[a], 0) / pkt.length);
    const namen = ['Fx', 'Fy', 'Fz', 'Mx', 'My', 'Mz'];
    const huelle = namen.map(() => ({ min: null, max: null }));
    zustaende.forEach((z) => {
      const s = [0, 0, 0, 0, 0, 0];
      let da = false;
      g.links.forEach((e, n) => {
        const f = z.f.get(e.s.name);
        if (!f) return;
        da = true;
        const r = [pkt[n].x - r0[0], pkt[n].y - r0[1], pkt[n].z - r0[2]];
        for (let c = 0; c < 3; c += 1) s[c] += f[c];
        s[3] += f[3] + r[1] * f[2] - r[2] * f[1];
        s[4] += f[4] + r[2] * f[0] - r[0] * f[2];
        s[5] += f[5] + r[0] * f[1] - r[1] * f[0];
      });
      if (!da) return;
      s.forEach((v, c) => {
        const h = huelle[c];
        if (!h.min || v < h.min.wert) h.min = { wert: v, bez: z.bez };
        if (!h.max || v > h.max.wert) h.max = { wert: v, bez: z.bez };
      });
    });
    return { tw: g.tw, mast: g.mast, anzahl: g.links.length, bezug: { x: r0[0], y: r0[1], z: r0[2] },
             ...Object.fromEntries(namen.map((n, c) => [n, huelle[c]])) };
  }).sort((a, b) => (a.tw ?? '').localeCompare(b.tw ?? '') || a.mast.localeCompare(b.mast));
  const liste = links.map((e) => {
    const [, praefix, mast, gurt, seite] = ANSCHLUSS_LINK.exec(e.s.name);
    const komp = ['Fx', 'Fy', 'Fz'].map((k, r) => {
      let min = null, max = null;
      zustaende.forEach((z) => {
        const v = z.f.get(e.s.name)?.[r];
        if (!Number.isFinite(v)) return;
        if (!min || v < min.wert) min = { wert: v, bez: z.bez };
        if (!max || v > max.wert) max = { wert: v, bez: z.bez };
      });
      return [k, { min, max }];
    });
    return { name: e.s.name, tw: praefix.replace(/_$/, '') || null, mast, gurt, seite,
             ...Object.fromEntries(komp) };
  }).sort((a, b) => (a.tw ?? '').localeCompare(b.tw ?? '') || a.mast.localeCompare(b.mast)
    || a.gurt.localeCompare(b.gurt) || a.seite.localeCompare(b.seite));
  // Die Liste bleibt die der Gurte (bisherige Leser); die Summe hängt daran.
  Object.defineProperty(liste, 'resultierende', { value: resultierende, enumerable: false });
  return liste;
}
