/**
 * core.massenauszug.js - Tragwerksteile mit Querschnitten und Massenauszug.
 *
 * Weisung vom 18. November: «zusätzlich noch die verwendeten tragwerksteile
 * mit den dazugehörigen querschnitten und einem Massenauszug aufführen»
 * (zum Viewer und zum Bericht).
 *
 * QUELLE IST DIE MODELLDATEI DES STABWERKS, nicht das Sortiment: dieselben
 * Stäbe, aus denen das Stabwerk sein Eigengewicht rechnet (A · ρ, nur echte
 * Stäbe - Starrkörper und Linkelemente sind Kunstgriffe des Modells). Damit
 * stimmt die Summe mit dem Eigengewicht der Rechnung überein, und ein
 * Tragwerk aus mehreren Jochen, Masten, Ankern oder Gittermasten ist
 * vollständig. Was das Modell nicht als Stab führt (Anschlusswinkel,
 * Stosslaschen, Schrauben, Fussplatten, Anbauteile als starre Ketten), fehlt
 * auch hier - der Bericht sagt es.
 *
 * Rechnet nichts am Tragwerk; reine Zählung.
 */
import { qsWerte } from './core.stabwerk.js';
import { stabZuordnung, stabRolle } from './core.stabnachweis.js';

const ROLLEN_NAMEN = {
  gurt: 'Gurt', gurtU: 'Gurt (UPE)', blech: 'Bindeblech', mast: 'Mast',
  rohr: 'Rohr / Aufsatz', sonst: 'übrige',
};

/*
 * >>> OBERFLÄCHE (19. November). <<< Für den Vergleich der Varianten
 * («verglichen werden mit gewicht oberfläche etc.»): der Umfang des
 * Querschnitts aus seinen Abmessungen in mm, scharfkantig (die Ausrundungen
 * ändern ihn um wenige Promille), mal die Stablänge = Anstrichfläche.
 */
export function querschnittUmfang(q) {
  const p = (q?.parameter ?? []).map(Number);
  const [a, b, c] = p;
  const ok = (...v) => v.every((x) => Number.isFinite(x) && x > 0);
  let u = null;
  switch (q?.form) {
    case 'Rectangle': if (ok(a, b)) u = 2 * (a + b); break;
    case 'Angle': if (ok(a, b)) u = 2 * (a + b); break;
    case 'I': case 'Channel': case 'U': if (ok(a, b, c)) u = 2 * a + 4 * b - 2 * c; break;
    case 'DoppelU': if (ok(a, b, c)) u = 2 * (2 * a + 4 * b - 2 * c); break;
    case 'T': if (ok(a, b)) u = 2 * (a + b); break;
    case 'Pipe': if (ok(a)) u = Math.PI * a; break;
    case 'Box': if (ok(a)) u = 2 * (a + (ok(b) && b > (p[2] ?? 0) * 2 ? b : a)); break;
    default: u = null;
  }
  return u === null ? null : u / 1000;
}

/** Rolle eines Stabes für den Auszug (Anker und Seile über ihren Namen). */
function rolleVon(name) {
  const n = String(name);
  if (/(^|_)ANKER/.test(n)) return { key: 'anker', name: 'Anker' };
  if (/(^|_)AUFHAENGUNG|(^|_)LAENGSANKER|(^|_)SEIL/.test(n)) return { key: 'seil', name: 'Seil' };
  const r = stabRolle(n);
  return { key: r, name: ROLLEN_NAMEN[r] ?? ROLLEN_NAMEN.sonst };
}

/** Bauteil eines Stabes: Joch T1, Mast M2, Anker … */
function bauteilVon(name) {
  const n = String(name);
  const anker = /(?:^|_)ANKER[A-Z]*_([^_]+)/.exec(n);
  if (anker && !/MAST_/.test(n)) return { key: `anker:${anker[1]}`, name: `Anker ${anker[1]}` };
  const z = stabZuordnung(n);
  return { key: z.key, name: z.name };
}

/**
 * Der Massenauszug einer Modelldatei.
 *
 * @param {object} dat  Modelldatei des Stabwerks (knoten, staebe, querschnitte, material)
 * @param {object} opt  { mastName(id) -> Anzeigename }
 * @returns {{ zeilen: [{bauteil, bauteilKey, rolle, profil, querschnitt, A, Iy, Iz,
 *             staebe, laenge, kg}], bauteile: [{key, name, kg, laenge}],
 *             total: {kg, laenge, staebe} }}
 */
export function massenauszug(dat, opt = {}) {
  const rho = Number(dat?.material?.rho) || 7850;
  const kn = new Map((dat?.knoten ?? []).map((k) => [k.name, k]));
  const qs = new Map((dat?.querschnitte ?? []).map((q) => [q.name, q]));
  const gruppen = new Map();
  (dat?.staebe ?? []).forEach((s) => {
    if ((s.art ?? 'stab') !== 'stab') return;
    const a = kn.get(s.von), b = kn.get(s.bis), q = qs.get(s.querschnitt);
    if (!a || !b || !q) return;
    let w;
    try { w = qsWerte(q); } catch { return; }
    const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    if (!(L > 0) || !(w.A > 0)) return;
    const bt = bauteilVon(s.name);
    const ro = rolleVon(s.name);
    // Bleche tragen keinen Profilnamen, nur Abmessungen: als Flachstahl.
    const flach = !q.profil && q.form === 'Rectangle' && Array.isArray(q.parameter)
      ? `FL ${Math.max(...q.parameter)}×${Math.min(...q.parameter)}` : null;
    const profil = flach ?? String(q.profil ?? q.name).replace(/^(?:MT|[TA])\d+_/, '');
    const key = `${bt.key}|${ro.key}|${profil}`;
    let g = gruppen.get(key);
    if (!g) {
      const anzeige = bt.key.startsWith('mast:') && opt.mastName
        ? `Mast ${opt.mastName(bt.key.slice(5)) ?? bt.key.slice(5)}` : bt.name;
      g = { bauteil: anzeige, bauteilKey: bt.key, rolle: ro.name, profil,
            querschnitt: q.name, A: w.A, Iy: w.Iy, Iz: w.Iz, staebe: 0, laenge: 0, kg: 0,
            umfang: querschnittUmfang(q), m2: 0 };
      gruppen.set(key, g);
    }
    g.staebe += 1;
    g.laenge += L;
    g.kg += w.A * L * rho;
    if (Number.isFinite(g.umfang)) g.m2 += g.umfang * L;
  });
  const zeilen = [...gruppen.values()].sort((p, q) =>
    p.bauteilKey.localeCompare(q.bauteilKey, 'de', { numeric: true })
    || p.rolle.localeCompare(q.rolle, 'de') || p.profil.localeCompare(q.profil, 'de', { numeric: true }));
  const bt = new Map();
  zeilen.forEach((z) => {
    const b = bt.get(z.bauteilKey) ?? { key: z.bauteilKey, name: z.bauteil, kg: 0, laenge: 0, m2: 0 };
    b.kg += z.kg; b.laenge += z.laenge; b.m2 += z.m2;
    bt.set(z.bauteilKey, b);
  });
  const total = zeilen.reduce((t, z) => ({ kg: t.kg + z.kg, laenge: t.laenge + z.laenge,
                                           staebe: t.staebe + z.staebe, m2: t.m2 + z.m2 }),
                              { kg: 0, laenge: 0, staebe: 0, m2: 0 });
  return { zeilen, bauteile: [...bt.values()], total, rho };
}
