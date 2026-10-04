/**
 * export.pynite.datei.js
 * ---------------------------------------------------------------------------
 * PyNite AUS DER FERTIGEN STABMODELL-DATEI (3. Oktober).
 *
 * Die bisherige PyNite-Ausleitung (export.pynite.js) baut aus dem ROHEN
 * Modell des Jochs und kennt dessen Namen, Bleche und Kalibrierung. Der
 * Gittermast entsteht aber erst in der fertigen Datei (`stabmodellJson`,
 * export.axisvm.gitter.js) - ein Erzeuger, der davor ansetzt, sähe statt
 * des Fachwerks den Merkstab auf der Mastachse.
 *
 * Dieser Weg liest deshalb die DATEI, die auch der eigene Löser und AxisVM
 * bekommen: Knoten, Stäbe, Querschnitte, Auflager, Lasten - ohne Wissen
 * über das Tragwerk. Er dient der Gegenprobe (`vergleich_gittermast.mjs`)
 * und der Ausleitung eines Blattes mit Gittermast.
 *
 * WAS ER ÜBERSETZT, UND WIE:
 *   Stab          Querschnittswerte wie der Löser (`qsWerte`); die Drehlage
 *                 als Soll-Richtung der lokalen z-Achse, im Skript aus
 *                 PyNites eigener Transformationsmatrix eingestellt und
 *                 danach nachgemessen
 *   Winkel        PyNite kennt kein I_yz: er geht in seinen HAUPTACHSEN
 *                 hinaus (I_1, I_2), die Soll-Richtung um den Hauptachsen-
 *                 winkel gedreht - dasselbe Tragverhalten
 *   Starrelement  derselbe Ersatz wie im Löser: Ersatzquerschnitt, E und G
 *                 mit `STARR_FAKTOR`
 *   Linkelement   NICHT übersetzt (Fehler mit Namen) - die gelenkigen
 *                 Anschlüsse des Jochs führt export.pynite.js
 *   Lastfall      je Lastfall der Datei eine Kombination mit Faktor 1
 *
 * PyNite rechnet Euler-Bernoulli. Wer vergleicht, löst die Datei im eigenen
 * Löser mit `schubweich: false`.
 * ---------------------------------------------------------------------------
 */

import { qsWerte, dreibein, STARR_FAKTOR } from './core.stabwerk.js';

/** Hauptachsen eines Querschnitts mit Deviationsmoment (y, z lokal). */
export function hauptachsen(w) {
  const Iyz = w.Iyz ?? 0;
  if (Math.abs(Iyz) < 1e-18) return { Iy: w.Iy, Iz: w.Iz, c: 1, s: 0 };
  // M = [[∫y², ∫yz], [∫yz, ∫z²]] = [[Iz, Iyz], [Iyz, Iy]] in (y, z).
  const m = (w.Iz + w.Iy) / 2, d = (w.Iz - w.Iy) / 2;
  const r = Math.hypot(d, Iyz);
  const l1 = m + r;                               // grösstes ∫y'²
  // Eigenvektor zu l1: (Iyz, l1 − Iz) bzw. (l1 − Iy, Iyz)
  let c = l1 - w.Iy, s = Iyz;
  const n = Math.hypot(c, s);
  c /= n; s /= n;
  return { Iz: l1, Iy: m - r, c, s };             // y' = c·y + s·z
}

/**
 * Die Datei für PyNite aufbereiten.
 * @returns {object} { knoten, material, querschnitte, staebe, auflager, lasten, faelle }
 */
export function pyniteDaten(dat) {
  const E = dat.material.E * 1000, G = dat.material.G * 1000;
  const kn = new Map(dat.knoten.map((k) => [k.name, k]));
  const qsRoh = new Map(dat.querschnitte.map((q) => [q.name, q]));
  const qs = new Map();
  const drehung = new Map();
  qsRoh.forEach((q, name) => {
    let w;
    try { w = qsWerte(q); } catch { return; }
    const h = hauptachsen(w);
    qs.set(name, { name, A: w.A, Iy: h.Iy, Iz: h.Iz, J: w.It });
    drehung.set(name, h);
  });
  const staebe = dat.staebe.map((st) => {
    const a = kn.get(st.von), b = kn.get(st.bis);
    /*
     * DER SEITLICHE HALT DES ROHRS AN EINER RIPPE (4. Oktober, «rippe hält
     * nur seitlich»): ein lotrechtes Linkelement, global x und y starr, z
     * und die Drehungen frei. In PyNite ein steifer Stab, am Ende j axial
     * und in den drei Drehungen freigegeben (lokal x = lotrecht); die
     * Querkraft bleibt - mit dem Restmoment V · 0.05 m am Achsknoten, wie
     * bei den gelenkigen Anschlüssen (24. September). Andere Linkelemente
     * werden hier weiter nicht übersetzt.
     */
    let frei = null;
    if (st.art === 'link') {
      const k = st.kraftuebertragung ?? {};
      const lotrecht = Math.abs(b.z - a.z) > 1e-9 && Math.hypot(b.x - a.x, b.y - a.y) < 1e-9;
      const seitlich = k.x === 'Rigid' && k.y === 'Rigid'
        && ['z', 'xx', 'yy', 'zz'].every((f) => k[f] === 'Free');
      if (!lotrecht || !seitlich) {
        throw new Error(`PyNite aus der Datei: das Linkelement ${st.name} wird hier nicht übersetzt.`);
      }
      frei = ['Dxj', 'Rxj', 'Ryj', 'Rzj'];
    }
    const { R } = dreibein(b.x - a.x, b.y - a.y, b.z - a.z, st.lcsZ);
    const h = drehung.get(st.querschnitt) ?? { c: 1, s: 0 };
    // z' = −s·ey + c·ez
    const ez = [0, 1, 2].map((i) => -h.s * R[1][i] + h.c * R[2][i]);
    return { name: st.name, von: st.von, bis: st.bis, qs: st.querschnitt,
             mat: st.art === 'starr' || st.art === 'link' ? 'STARR' : (st.steifesMaterial ? 'STEIF' : 'STAHL'), ez,
             ...(frei ? { frei } : {}) };
  });
  const benutzt = new Set(staebe.map((s) => s.qs));
  const faelle = new Set();
  const lasten = { punkt: [], moment: [], strecke: [] };
  ['punkt', 'moment', 'strecke'].forEach((art) => (dat.lasten?.[art] ?? []).forEach((l) => {
    if (!Number.isFinite(l.wert) || l.wert === 0) return;
    faelle.add(l.lastfall);
    lasten[art].push({ ziel: art === 'strecke' ? l.stab : l.knoten,
                       richtung: String(l.richtung).replace(/^M/i, '').toUpperCase(),
                       wert: l.wert, fall: l.lastfall });
  }));
  return {
    material: { STAHL: [E, G], STARR: [E * STARR_FAKTOR, G * STARR_FAKTOR],
                STEIF: [E * (dat.materialSteif?.faktor ?? 1000), G * (dat.materialSteif?.faktor ?? 1000)] },
    knoten: dat.knoten.map((k) => [k.name, k.x, k.y, k.z]),
    querschnitte: [...qs.values()].filter((q) => benutzt.has(q.name)),
    staebe,
    auflager: dat.auflager.map((a) => [a.knoten, ...['ux', 'uy', 'uz', 'fix', 'fiy', 'fiz']
      .map((f) => a[f] === 'Rigid')]),
    lasten,
    faelle: [...faelle],
  };
}

/** Das Python-Skript: liest die aufbereiteten Daten (JSON) und schreibt die Ergebnisse (JSON). */
export const PYNITE_DATEI_SKRIPT = `# Erzeugt von Vierendeel - PyNite aus der Stabmodell-Datei
#   python <dieses Skript> <modell.json> <ergebnis.json>
import json, math, sys
try:
    from Pynite import FEModel3D
except ImportError:
    from PyNite import FEModel3D

D = json.load(open(sys.argv[1], encoding='utf-8'))
M = FEModel3D()
for nam, (E, G) in D['material'].items():
    M.add_material(nam, E, G, 0.3, 78.5)
for q in D['querschnitte']:
    M.add_section(q['name'], q['A'], q['Iy'], q['Iz'], q['J'])
for nam, x, y, z in D['knoten']:
    M.add_node(nam, x, y, z)
for s in D['staebe']:
    M.add_member(s['name'], s['von'], s['bis'], s['mat'], s['qs'])
for s in D['staebe']:
    if s.get('frei'):
        M.def_releases(s['name'], **{f: True for f in s['frei']})

# Drehlage: aus PyNites eigener Transformationsmatrix, danach nachgemessen.
schief = []
for s in D['staebe']:
    mm = M.members[s['name']]
    T = mm.T()
    ey0 = (T[1, 0], T[1, 1], T[1, 2]); ez0 = (T[2, 0], T[2, 1], T[2, 2])
    soll = s['ez']
    c = sum(soll[i] * ez0[i] for i in range(3))
    sn = -sum(soll[i] * ey0[i] for i in range(3))
    mm.rotation = math.degrees(math.atan2(sn, c))
for s in D['staebe']:
    T = M.members[s['name']].T()
    ez = (T[2, 0], T[2, 1], T[2, 2])
    if abs(abs(sum(s['ez'][i] * ez[i] for i in range(3))) - 1.0) > 1e-6:
        schief.append(s['name'])
if schief:
    sys.exit('Drehlage nicht getroffen: ' + ', '.join(schief[:8]))

for a in D['auflager']:
    M.def_support(a[0], *a[1:])
R = {'X': 'X', 'Y': 'Y', 'Z': 'Z'}
for l in D['lasten']['punkt']:
    M.add_node_load(l['ziel'], 'F' + R[l['richtung']], l['wert'], l['fall'])
for l in D['lasten']['moment']:
    M.add_node_load(l['ziel'], 'M' + R[l['richtung']], l['wert'], l['fall'])
for l in D['lasten']['strecke']:
    M.add_member_dist_load(l['ziel'], 'F' + R[l['richtung']], l['wert'], l['wert'], None, None, l['fall'])
for f in D['faelle']:
    M.add_load_combo(f, {f: 1.0})
M.analyze_linear(check_statics=False)

aus = {'wege': {}, 'auflager': {}}
for f in D['faelle']:
    aus['wege'][f] = {n: [k.DX[f], k.DY[f], k.DZ[f], k.RX[f], k.RY[f], k.RZ[f]]
                      for n, k in M.nodes.items()}
    aus['auflager'][f] = {a[0]: [M.nodes[a[0]].RxnFX[f], M.nodes[a[0]].RxnFY[f], M.nodes[a[0]].RxnFZ[f],
                                 M.nodes[a[0]].RxnMX[f], M.nodes[a[0]].RxnMY[f], M.nodes[a[0]].RxnMZ[f]]
                          for a in D['auflager']}
json.dump(aus, open(sys.argv[2], 'w', encoding='utf-8'))
print('PyNite:', len(D['knoten']), 'Knoten,', len(D['staebe']), 'Staebe,', len(D['faelle']), 'Lastfaelle')
`;
