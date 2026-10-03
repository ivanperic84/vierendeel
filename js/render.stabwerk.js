/**
 * render.stabwerk.js
 * ---------------------------------------------------------------------------
 * >>> DER 3D-RESULTATPLOT AUS DEM STABWERK (29. September). <<<
 *
 * Befund vom 28. September: «Verläufe und 3D-Resultatplot zeigen noch den
 * Ersatzbalken», während Kacheln und Urteil aus dem Stabwerk stehen. Auf
 * Rückfrage «Alles als Hülle je Stab»: das Bild trägt je Stab η, σ und die
 * Schnittgrössen N, V, M, T als Maximum über alle Kombinationen
 * (`jeStab[].huelle` aus `stabwerkHuelle`), und zwar feiner als bisher -
 * je Stababschnitt des Stabwerks, nicht je Feld zwischen zwei Stationen.
 *
 * Das Bild baut `erzeugeSzene` wie immer (Geometrie aus dem Ersatzbalken-
 * Modell, dieselbe Gestalt); dieses Modul liefert ihr die Teilung der
 * Gurte und setzt danach die Werte aus dem Stabwerk ein. Was das Stabwerk
 * nicht kennt (Verformung, η w am Masten), bleibt stehen.
 *
 * Zuordnung, gemessen an den Namen der Ausleitung:
 *   Gurt  OGL_S<k> … UGR_S<k>   ↔ Prisma `teil` OG_L … UG_R, über x
 *   Blech BV_L_<i>_<n> …        ↔ Platte `teil` V_L / V_R / H_O / H_U, über x
 *   Mast  MAST_<Name>_S<k>      ↔ `MAST_A` / `MAST_B` (Anzeigename über
 *                                 federn.namen), über die Höhe ab dem Fuss
 * In einer Reihe tragen Joch-Stäbe das Präfix des Tragwerks, und das Joch
 * liegt in Blattkoordinaten, verschoben um den Anfang seiner Gurte
 * (`versatz`, dieselbe Regel wie der Schnitt, `stabwerkSchnittHtml`).
 * ---------------------------------------------------------------------------
 */

const GURT = /(?:^|_)(OG|UG)(L|R)_S\d+$/;
const BLECH = /(?:^|_)B(V|H)_(L|R|O|U)_/;
const MAST = /(?:^|_)MAST_([^_]+)_S\d+$/;

/**
 * Die Fussnote der Legende im Stabwerksweg - die des Kerns beschreibt den
 * Ersatzbalken («nur die Bindebleche», «Torsion des Querschnitts») und
 * stimmt hier nicht mehr.
 */
export const STABWERK_FUSSNOTE = {
  eta: 'Feste Skala bis 1.25 · aus dem Stabwerk: η je Stab, Hülle über alle Kombinationen.',
  sig_v: 'Aus dem Stabwerk: Randspannung aus N und Biegung je Stab (vorzeichenrichtig), Hülle über alle Kombinationen.',
  sig: 'Aus dem Stabwerk: σ aus der Normalkraft allein (|N|/A), Hülle je Stab.',
  M: 'Aus dem Stabwerk: das grössere |M_y|, |M_z| an den Stabenden, Hülle je Stab.',
  V: 'Aus dem Stabwerk: das grössere |V_y|, |V_z|, Hülle je Stab — Gurte und Bleche.',
  N: 'Aus dem Stabwerk: |N| an den Stabenden, Hülle je Stab — Gurte und Bleche.',
  T: 'Aus dem Stabwerk: |T| je Stab, Hülle — die Torsion des einzelnen Stabes, nicht die des Querschnitts.',
  // 3. Oktober: mit dem Joch, aus den Knotenwegen des Stabwerks.
  w: 'Aus dem Stabwerk: Betrag des Wegs an Joch und Masten, im Fall der verformten Figur (umhüllend: massgebend Gebrauchstauglichkeit).',
};

/** Die Werte eines Stabes für den Plot - dieselben Felder wie im Kern. */
export function plotWerte(z) {
  if (!z) return null;
  const h = z.huelle ?? {};
  return {
    eta: z.eta, sig_v: z.sig, sig: h.sigN ?? null,
    N: h.N ?? null, V: h.V ?? null, M: h.M ?? null, T: h.T ?? null,
  };
}

/**
 * >>> DER MAST IN ABSCHNITTEN (3. Oktober). <<<
 *
 * Frage mit Bild: «ist es möglich den masten in mehrere teile zu plotten,
 * anstatt nur in der massgebenden farbe über die ganze länge.» Der unterste
 * Maststab reicht vom Fuss bis unter den Anschluss (rund 7 m) und trug als
 * EIN Stab eine Farbe. Seit dem 2. Oktober rechnet das Stabwerk am Masten
 * alle 0.5 m (`schnittImStab`, `verlauf` je Stab); jede Mastfläche der
 * Szene nimmt jetzt das Grösste dieses Verlaufs in IHRER Höhe - an den
 * Rändern linear eingeschaltet. T kennt der Verlauf nicht, es bleibt der
 * Wert des Stabes; σ aus N folgt dem Anteil von N.
 *
 * @param {object} s       Stab aus jeStab (mit `verlauf` und `huelle`)
 * @param {number} za, zb  Höhenbereich der Fläche, in den z des Stabwerks
 */
export function verlaufWerte(s, za, zb) {
  const v = s?.verlauf;
  if (!v?.length) return null;
  const lo = Math.min(za, zb), hi = Math.max(za, zb);
  const pkt = [...v].sort((p, q) => p.z - q.z);
  const bei = (z) => {
    if (z <= pkt[0].z) return pkt[0];
    if (z >= pkt[pkt.length - 1].z) return pkt[pkt.length - 1];
    const k = pkt.findIndex((p) => p.z >= z);
    const a = pkt[k - 1], b = pkt[k];
    const t = (z - a.z) / ((b.z - a.z) || 1);
    const o = { z };
    ['sig', 'eta', 'N', 'V', 'M'].forEach((f) => {
      o[f] = Number.isFinite(a[f]) && Number.isFinite(b[f]) ? a[f] + t * (b[f] - a[f]) : null;
    });
    return o;
  };
  const im = [bei(lo), ...pkt.filter((p) => p.z > lo && p.z < hi), bei(hi)];
  const max = (f) => Math.max(...im.map((p) => p[f]).filter(Number.isFinite));
  const h = s.huelle ?? {};
  const N = max('N');
  return {
    eta: max('eta'), sig_v: max('sig'), N, V: max('V'), M: max('M'),
    T: h.T ?? null,
    sig: Number.isFinite(h.sigN) && h.N > 0 ? h.sigN * N / h.N : (h.sigN ?? null),
  };
}

/** Das Grössere je Feld - mehrere Stäbe auf einer Fläche zeigen ihr Maximum. */
function groesser(a, b) {
  if (!a) return b;
  if (!b) return a;
  const o = {};
  Object.keys({ ...a, ...b }).forEach((k) => {
    const x = a[k], y = b[k];
    o[k] = Number.isFinite(x) && Number.isFinite(y) ? Math.max(x, y)
      : (Number.isFinite(x) ? x : y ?? null);
  });
  return o;
}

/**
 * Die Stäbe eines Jochs im Stabwerk, nach Teil geordnet, in ÖRTLICHEN x.
 * @param {object} jeStab   aus stabwerkHuelle
 * @param {string} jochKey  'tragwerk' oder 'tragwerk:<id>' (Reihe)
 */
export function jochStaebe(jeStab, jochKey = 'tragwerk') {
  const alle = Object.values(jeStab ?? {});
  const gurte = alle.filter((z) => z.bauteil === jochKey && GURT.test(z.name));
  if (!gurte.length) return null;
  const versatz = Math.min(...gurte.map((z) => z.x0));
  const gurt = {};
  gurte.forEach((z) => {
    const m = GURT.exec(z.name);
    const teil = `${m[1]}_${m[2]}`;            // wie die Szene: OG_L … UG_R
    (gurt[teil] ??= []).push({ z, x0: z.x0 - versatz, x1: z.x1 - versatz });
  });
  Object.values(gurt).forEach((l) => l.sort((p, q) => p.x0 - q.x0));
  const blech = {};
  alle.filter((z) => z.bauteil === jochKey && BLECH.test(z.name)).forEach((z) => {
    const m = BLECH.exec(z.name);
    const teil = `${m[1]}_${m[2]}`;
    (blech[teil] ??= []).push({ z, x: (z.x0 + z.x1) / 2 - versatz });
  });
  return { versatz, gurt, blech };
}

/** Die Teilungspunkte je Gurt (örtlich) - `erzeugeSzene` teilt die Prismen danach. */
export function gurtTeilung(js) {
  if (!js) return null;
  const o = {};
  Object.entries(js.gurt).forEach(([teil, l]) => {
    o[teil] = [...new Set(l.flatMap((s) => [s.x0, s.x1]).map((x) => Math.round(x * 1e6) / 1e6))]
      .sort((a, b) => a - b);
  });
  return o;
}

/**
 * Setzt die Werte des Stabwerks in eine Joch-Szene (örtliche Koordinaten,
 * vor dem Verschieben aufs Blatt).
 * @returns {number} wie viele Flächen und Linien Werte bekamen
 */
export function stabwerkFaerben(sz, jeStab, o = {}) {
  const js = jochStaebe(jeStab, o.jochKey ?? 'tragwerk');
  if (!sz || !js) return 0;
  // `nurWege`: nur die Verformung setzen (Einzellastfall - die Hülle gilt
  // dann nicht, die Wege des gezeigten Falls schon).
  const mitHuelle = o.nurWege !== true;
  const mastNamen = o.mastNamen ?? {};
  // Die Masten: je Name ihre Stäbe, die Höhe ab dem tiefsten Punkt.
  const masten = {};
  Object.values(jeStab).forEach((z) => {
    const m = MAST.exec(z.name);
    if (!m || !Number.isFinite(z.z0)) return;
    (masten[m[1]] ??= []).push(z);
  });
  const mastFuss = {};
  Object.entries(masten).forEach(([id, l]) => { mastFuss[id] = Math.min(...l.map((z) => z.z0)); });
  /*
   * >>> DER GITTERMAST (3. Oktober). <<<
   * Seine Stäbe je Mast: Gurte nach Ecke, Bleche nach Seite, Rohr. Die
   * Flächen des Bildes (render.koerper.js, `gitter`) finden ihre Stäbe über
   * Ecke bzw. Seite und die Höhe - nicht über die Nummer.
   */
  const gitter = {};
  Object.values(jeStab).forEach((z) => {
    const m = /(?:^|_)MAST_([^_]+)_(?:G([1-4])_S\d+|BL_([A-Za-z]+)_\d+|(ROHR)_\w+)$/.exec(z.name);
    if (!m || !Number.isFinite(z.z0)) return;
    const g = (gitter[m[1]] ??= { gurt: {}, blech: {}, rohr: [], fuss: Infinity });
    if (m[2]) { (g.gurt[m[2]] ??= []).push(z); g.fuss = Math.min(g.fuss, z.z0); }
    else if (m[3]) (g.blech[m[3]] ??= []).push(z);
    else g.rohr.push(z);
  });
  // Der Fuss je Mast in der Szene.
  const szFuss = {};
  (sz.flaechen ?? []).forEach((f) => {
    const m = /^MAST_(A|B)$/.exec(f.teil ?? '');
    if (!m || !f.punkte?.length) return;
    const z = Math.min(...f.punkte.map((p) => p[2]));
    szFuss[m[1]] = Math.min(szFuss[m[1]] ?? Infinity, z);
  });

  const ausX = (f) => {
    const xs = (f.punkte ?? []).map((p) => p[0]);
    return xs.length ? { x0: Math.min(...xs), x1: Math.max(...xs) } : null;
  };
  /*
   * Welche Stäbe des Stabwerks eine Fläche zeigt. Die Kachel nennt ihren
   * massgebenden Stab (29. September, «beim anklicken der nachweiskachel
   * auf massgebenden stab im modell klicken»); über diese Liste findet
   * die Ansicht die Flächen, die sie hervorhebt.
   */
  const staebeFuer = (teil, f) => {
    const b = ausX(f);
    if (!b) return [];
    const xm = (b.x0 + b.x1) / 2;
    if (js.gurt[teil]) {
      const s = js.gurt[teil].find((q) => xm >= q.x0 - 1e-6 && xm <= q.x1 + 1e-6);
      return s ? [s.z] : [];
    }
    if (js.blech[teil]) {
      // Die Platte einer Station: ihre Stäbe liegen auf demselben x.
      return js.blech[teil].filter((q) => Math.abs(q.x - xm) < 0.08).map((q) => q.z);
    }
    return null;
  };
  const werteFuer = (teil, f) => {
    const l = staebeFuer(teil, f);
    if (l) return l.reduce((a, z) => groesser(a, plotWerte(z)), null);
    const m = /^MAST_(A|B)$/.exec(teil ?? '');
    if (m && f.gitter) {
      const g = gitter[mastNamen[m[1]] ?? m[1]];
      if (!g || !Number.isFinite(szFuss[m[1]]) || !f.punkte?.length) return null;
      const zs = f.punkte.map((p) => p[2]);
      const lo = Math.min(...zs) - szFuss[m[1]] + g.fuss;
      const hi = Math.max(...zs) - szFuss[m[1]] + g.fuss;
      const ueber = (z) => z.z1 > lo + 1e-6 && z.z0 < hi - 1e-6;
      const ls = f.gitter.art === 'gurt' ? (g.gurt[f.gitter.k] ?? []).filter(ueber)
        : f.gitter.art === 'blech'
          ? (g.blech[f.gitter.seite] ?? []).filter((z) => Math.abs(z.zm - (lo + hi) / 2) < 0.08)
          : g.rohr.filter(ueber);
      if (!ls.length) return null;
      f._gitterStaebe = ls;
      return ls.reduce((a, z) => groesser(a, plotWerte(z)), null);
    }
    if (m) {
      const id = mastNamen[m[1]] ?? m[1];
      const l = masten[id];
      if (!l || !Number.isFinite(szFuss[m[1]])) return null;
      const zs = (f.punkte ?? []).map((p) => p[2]);
      const h = (Math.min(...zs) + Math.max(...zs)) / 2 - szFuss[m[1]];
      const s = l.find((z) => h >= z.z0 - mastFuss[id] - 1e-6 && h <= z.z1 - mastFuss[id] + 1e-6);
      if (s) f._mastStab = s.name;
      if (!s) return null;
      // Die Fläche über ihre Höhe (3. Oktober): der Verlauf darin, sonst der Stab.
      const za = Math.min(...zs) - szFuss[m[1]] + mastFuss[id];
      const zb = Math.max(...zs) - szFuss[m[1]] + mastFuss[id];
      f._mastBereich = { s, za, zb };
      return verlaufWerte(s, za, zb) ?? plotWerte(s);
    }
    return null;
  };

  /*
   * >>> DIE VERFORMUNG AUS DEM STABWERK, MIT DEM JOCH (3. Oktober). <<<
   * «das joch auch bei der verformung mitnehmen.» Bis hierher trugen nur
   * die Masten `w` (Ersatzbalken, Entscheid 24. September «das Joch bleibt
   * grau»). Mit `o.weg` (Weg eines Stabes an der Stelle ξ, in m) bekommt
   * jede Fläche den grössten Weg ihrer Stäbe - Gurte und Bleche an Anfang,
   * Mitte und Ende, die Mastfläche an ihren beiden Rändern. Aufgetragen ist
   * der Betrag des Verschiebungsvektors in mm; der Fall ist der der
   * verformten Figur (app.js, `wegeFall`).
   */
  const wegMm = (name, xi) => {
    const u = o.weg?.(name, xi);
    return u ? Math.hypot(u[0], u[1], u[2]) * 1000 : null;
  };
  const wFuer = (f, staebe) => {
    if (!o.weg) return null;
    if (f._mastBereich) {
      const { s, za, zb } = f._mastBereich;
      const xi = (z) => Math.min(1, Math.max(0, (z - s.z0) / ((s.z1 - s.z0) || 1)));
      const w = [wegMm(s.name, xi(za)), wegMm(s.name, xi(zb))].filter(Number.isFinite);
      return w.length ? Math.max(...w) : null;
    }
    const w = (staebe ?? []).flatMap((z) => [0, 0.5, 1].map((xi) => wegMm(z.name, xi)))
      .filter(Number.isFinite);
    return w.length ? Math.max(...w) : null;
  };

  let n = 0;
  (sz.flaechen ?? []).forEach((f) => {
    const w = werteFuer(f.teil, f);
    if (!w) return;
    const staebe = f._gitterStaebe ?? staebeFuer(f.teil, f);
    delete f._gitterStaebe;
    const ww = wFuer(f, staebe ?? (f._mastStab ? [{ name: f._mastStab }] : []));
    f.werte = { ...(f.werte ?? {}), ...(mitHuelle ? w : {}),
                ...(Number.isFinite(ww) ? { w: ww } : {}) };
    if (mitHuelle) f.stabwerk = true;           // für die Legende (Fussnote)
    if (Number.isFinite(ww)) f.wegeStabwerk = true;
    f.staebe = (staebe ?? []).map((z) => z.name);
    if (f._mastStab) { f.staebe = [f._mastStab]; delete f._mastStab; }
    delete f._mastBereich;
    n += 1;
  });
  // Die Schwerachsen tragen dieselben Werte wie ihr Körper.
  (sz.linien ?? []).forEach((l) => {
    const teil = /^Schwerachse (\w+)$/.exec(l.label ?? '')?.[1]
      ?? /^Blechachse (\w+)$/.exec(l.label ?? '')?.[1];
    if (!teil || !l.werte || !mitHuelle) return;
    const w = werteFuer(teil, l);
    if (!w) return;
    l.werte = { ...l.werte, ...w };
    n += 1;
  });
  if (mitHuelle) sz.quelleWerte = 'stabwerk';
  if (o.weg) sz.wegeAusStabwerk = true;
  return n;
}

/* ===========================================================================
 * >>> DIE VERLÄUFE AUS DEM STABWERK (29. September). <<<
 * ===========================================================================
 *
 * Auf Rückfrage «Stabwerk, Ersatzbalken eingeklappt»: oben die Verläufe
 * aus dem Stabwerk, darunter eingeklappt die des Ersatzbalkens zum
 * Vergleich. Je Stab steht die Hülle - aufgetragen als TREPPE (zwei Punkte
 * je Stab): ein Stab hat einen Wert, und eine schräge Linie dazwischen
 * behauptete einen Verlauf, den es nicht gibt. Die Bindebleche stehen an
 * ihren Stationen; die Linie verbindet sie wie im Ersatzbalken (je Station
 * das grösste η der vier Ebenen).
 * ========================================================================= */

/** Treppe über gemeinsame Grenzen: je Intervall der Wert in seiner Mitte. */
function treppe(grenzen, serien) {
  const b = [...new Set(grenzen.map((x) => Math.round(x * 1e6) / 1e6))].sort((p, q) => p - q);
  const punkte = [];
  const werte = serien.map(() => []);
  for (let i = 0; i < b.length - 1; i += 1) {
    if (b[i + 1] - b[i] < 1e-6) continue;
    const xm = (b[i] + b[i + 1]) / 2;
    punkte.push(b[i], b[i + 1]);
    serien.forEach((f, k) => { const v = f(xm); werte[k].push(v, v); });
  }
  return { punkte, werte };
}

/**
 * Die Zwischenpunkte der Maststäbe als eine Linie über die Höhe. Am Knoten
 * zweier Stäbe stehen beide Werte übereinander (ein Sprung aus einer
 * Einzellast bleibt sichtbar).
 */
function verlaufLinie(liste, fuss, felder) {
  const pkt = liste.flatMap((s) => s.z.verlauf.map((p) => ({ ...p, h: p.z - fuss })))
    .sort((p, q) => p.h - q.h);
  return { punkte: pkt.map((p) => p.h), werte: felder.map((f) => pkt.map((p) => p[f] ?? 0)) };
}

/** Das Grösste der Stäbe, die x überdecken (Feld `feld` der Hülle bzw. η). */
function ueber(liste, feld) {
  return (x) => {
    let m = 0;
    liste.forEach((s) => {
      if (x < s.x0 - 1e-9 || x > s.x1 + 1e-9) return;
      const v = feld === 'eta' ? s.z.eta : s.z.huelle?.[feld];
      if (Number.isFinite(v)) m = Math.max(m, v);
    });
    return m;
  };
}

/**
 * @param {Function} linienDiagramm  aus render.charts.js (hereingereicht,
 *                                   damit dieses Modul nichts importiert)
 * @returns {object|null} { gurt, blech, kraft, masten: [{name, eta, schnitt}] }
 */
export function stabwerkDiagramme(jeStab, jochKey, linienDiagramm, breite = 900) {
  const js = jochStaebe(jeStab, jochKey);
  if (!js) return null;
  const og = [...(js.gurt.OG_L ?? []), ...(js.gurt.OG_R ?? [])];
  const ug = [...(js.gurt.UG_L ?? []), ...(js.gurt.UG_R ?? [])];
  const grenzen = [...og, ...ug].flatMap((s) => [s.x0, s.x1]);
  const tEta = treppe(grenzen, [ueber(og, 'eta'), ueber(ug, 'eta')]);
  const tN = treppe(grenzen, [ueber(og, 'N'), ueber(ug, 'N')]);
  const zusatz = ' · Stabwerk, Hülle je Stab über alle Kombinationen';
  const gurt = linienDiagramm({
    titel: `Ausnutzung der Gurte${zusatz}`, breite, hoehe: 230,
    xLabel: 'x [m]', yLabel: 'η [–]', punkte: tEta.punkte, grenze: 1.0,
    serien: [{ name: 'Obergurt', werte: tEta.werte[0] },
             { name: 'Untergurt', werte: tEta.werte[1] }],
  });
  const kraft = linienDiagramm({
    titel: `Gurtkraft |N|${zusatz}`, breite, hoehe: 230,
    xLabel: 'x [m]', yLabel: 'N [kN]', punkte: tN.punkte,
    serien: [{ name: 'Obergurt', werte: tN.werte[0] },
             { name: 'Untergurt', werte: tN.werte[1] }],
  });
  // Bleche: je Station das Grösste der vier Ebenen.
  const stationen = new Map();
  Object.values(js.blech).flat().forEach((q) => {
    const k = Math.round(q.x * 1000) / 1000;
    stationen.set(k, Math.max(stationen.get(k) ?? 0, q.z.eta ?? 0));
  });
  const xs = [...stationen.keys()].sort((p, q) => p - q);
  const blech = xs.length > 1 ? linienDiagramm({
    titel: `Ausnutzung der Bindebleche je Station${zusatz}`, breite, hoehe: 210,
    xLabel: 'x [m]', yLabel: 'η [–]', punkte: xs, grenze: 1.0,
    serien: [{ name: 'Bindeblech (grösstes der Station)', werte: xs.map((x) => stationen.get(x)) }],
  }) : null;
  // Masten: über die Höhe ab dem Fuss.
  const masten = {};
  Object.values(jeStab).forEach((z) => {
    const m = MAST.exec(z.name);
    if (!m || !Number.isFinite(z.z0)) return;
    (masten[m[1]] ??= []).push(z);
  });
  const mastDia = Object.entries(masten).sort(([a], [b]) => a.localeCompare(b)).map(([name, l]) => {
    const fuss = Math.min(...l.map((z) => z.z0));
    const liste = l.map((z) => ({ z, x0: z.z0 - fuss, x1: z.z1 - fuss }));
    const g = liste.flatMap((s) => [s.x0, s.x1]);
    /*
     * Mit dem Verlauf im Stab (2. Oktober, «kann man noch beim Masten eine
     * unterteilung vornehmen bei der auswertung?») als Linie über die
     * Zwischenpunkte; ein Stab ohne Verlauf bleibt Treppe.
     */
    const mitVerlauf = liste.every((s) => s.z.verlauf?.length);
    const tE = mitVerlauf ? verlaufLinie(liste, fuss, ['eta']) : treppe(g, [ueber(liste, 'eta')]);
    const tS = mitVerlauf ? verlaufLinie(liste, fuss, ['M', 'V', 'N'])
      : treppe(g, [ueber(liste, 'M'), ueber(liste, 'V'), ueber(liste, 'N')]);
    return {
      name,
      eta: linienDiagramm({
        titel: `Ausnutzung über die Höhe · Mast ${name}${zusatz}`, breite, hoehe: 210,
        xLabel: 'z über Mastfuss [m]', yLabel: 'η [–]', punkte: tE.punkte, grenze: 1.0,
        serien: [{ name: 'Querschnitt', werte: tE.werte[0] }],
      }),
      schnitt: linienDiagramm({
        titel: `Schnittgrössen über die Höhe · Mast ${name}${zusatz}`, breite, hoehe: 230,
        xLabel: 'z über Mastfuss [m]', yLabel: 'M [kNm] / V, N [kN]', punkte: tS.punkte,
        serien: [{ name: '|M| (grösseres)', werte: tS.werte[0] },
                 { name: '|V| (grösseres)', werte: tS.werte[1] },
                 { name: '|N|', werte: tS.werte[2] }],
      }),
    };
  });
  return { gurt, blech, kraft, masten: mastDia };
}
