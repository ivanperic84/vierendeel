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
  const werteFuer = (teil, f) => {
    const b = ausX(f);
    if (!b) return null;
    const xm = (b.x0 + b.x1) / 2;
    if (js.gurt[teil]) {
      const s = js.gurt[teil].find((q) => xm >= q.x0 - 1e-6 && xm <= q.x1 + 1e-6);
      return s ? plotWerte(s.z) : null;
    }
    if (js.blech[teil]) {
      // Die Platte einer Station: ihre Stäbe liegen auf demselben x.
      return js.blech[teil].filter((q) => Math.abs(q.x - xm) < 0.08)
        .reduce((a, q) => groesser(a, plotWerte(q.z)), null);
    }
    const m = /^MAST_(A|B)$/.exec(teil ?? '');
    if (m) {
      const id = mastNamen[m[1]] ?? m[1];
      const l = masten[id];
      if (!l || !Number.isFinite(szFuss[m[1]])) return null;
      const zs = (f.punkte ?? []).map((p) => p[2]);
      const h = (Math.min(...zs) + Math.max(...zs)) / 2 - szFuss[m[1]];
      const s = l.find((z) => h >= z.z0 - mastFuss[id] - 1e-6 && h <= z.z1 - mastFuss[id] + 1e-6);
      return s ? plotWerte(s) : null;
    }
    return null;
  };

  let n = 0;
  (sz.flaechen ?? []).forEach((f) => {
    const w = werteFuer(f.teil, f);
    if (!w) return;
    f.werte = { ...(f.werte ?? {}), ...w };
    f.stabwerk = true;           // für die Legende (Fussnote)
    n += 1;
  });
  // Die Schwerachsen tragen dieselben Werte wie ihr Körper.
  (sz.linien ?? []).forEach((l) => {
    const teil = /^Schwerachse (\w+)$/.exec(l.label ?? '')?.[1]
      ?? /^Blechachse (\w+)$/.exec(l.label ?? '')?.[1];
    if (!teil || !l.werte) return;
    const w = werteFuer(teil, l);
    if (!w) return;
    l.werte = { ...l.werte, ...w };
    n += 1;
  });
  sz.quelleWerte = 'stabwerk';
  return n;
}
