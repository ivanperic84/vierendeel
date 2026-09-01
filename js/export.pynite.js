/**
 * export.pynite.js
 * ---------------------------------------------------------------------------
 * PYNITE-AUSLEITUNG: schreibt ein lauffähiges Python-Skript.
 * Reine Funktionen, kein DOM.
 *
 * WARUM
 * Das SAF-Interface von AxisVM ist ein kostenpflichtiges Modul; ohne dieses
 * bleibt für AxisVM nur der DXF-Weg mit Handarbeit. PyNite ist ein freies
 * 3D-Stabwerksprogramm für Python und liefert eine UNABHÄNGIGE Gegenrechnung,
 * die heute läuft - nicht als Ersatz für die Verifizierung durch ein geprüftes
 * Programm, wohl aber als Antwort auf die drei offenen Fachfragen:
 * Knotenmodell, Torsionsverteilung, örtliche Lasteinleitung.
 *
 * Das Modell selbst kommt aus `stabmodell()` in export.axisvm.js - dieselbe
 * Knoten-Stab-Last-Liste, die auch SAF und DXF verpacken. Hier ist nur die
 * Verpackung eine andere.
 *
 * ACHSEN - ACHTUNG, PYNITE RECHNET MIT Y NACH OBEN
 * PyNite legt die lokalen Stabachsen so, dass die globale Y-Achse die
 * Lotrechte ist (`Member3D.T`). Die Koordinaten werden deshalb beim Schreiben
 * getauscht:
 *
 *      unser X (Jochachse)      -> PyNite X
 *      unser Z (nach oben)      -> PyNite Y
 *      unser Y (Gleisrichtung)  -> PyNite Z
 *
 * Die AUSGABE dreht zurück: das Skript schreibt seine Tabellen wieder in
 * unserer Achsenbenennung, damit sie neben dem Blatt «Vergleich» stehen
 * können, ohne dass jemand im Kopf umrechnet.
 *
 * TRÄGHEITSMOMENTE UND DREHLAGE
 * PyNite nimmt je Querschnitt Iy und Iz in den LOKALEN Achsen. Welche das
 * sind, hängt von der Stabrichtung ab:
 *
 *   Gurt (in Jochachse)   lokal y = lotrecht, lokal z = Gleisrichtung
 *                         -> unser I_y (Vertikalbiegung) ist PyNite Iz
 *   Vertikalblech         lokal y = -Jochachse, lokal z = Gleisrichtung
 *                         -> die starke Achse ist Iz
 *   Horizontalblech       lokal y = lotrecht, lokal z = -Jochachse
 *                         -> die starke Achse ist Iy
 *
 * Ein vertauschtes Paar fiele sofort auf: bei einem Blech unterscheiden sich
 * die beiden Trägheitsmomente um den Faktor (b/t)², beim 100 × 8 also 156.
 * ---------------------------------------------------------------------------
 */

import { EINWIRKUNGEN } from './core.lasten.js';
import { winkelwerteFuer } from './core.winkel.js';
import { getProfil } from './data.profiles.js';
import { ECKEN } from './geometry.js';
import { stabmodell, lasten, stuetzung } from './export.axisvm.js';
import { herunterladen } from './export.xlsx.js';

/** Rechteck: starke und schwache Achse sowie St-Venant (dünnes Rechteck). */
function rechteckWerte(bMm, tMm) {
  const b = bMm / 1000, t = tMm / 1000;
  const gross = Math.max(b, t), klein = Math.min(b, t);
  return {
    A: b * t,
    stark: (t * b ** 3) / 12,
    schwach: (b * t ** 3) / 12,
    // Näherung für das schmale Rechteck, mit Beiwert nach Timoshenko
    J: gross * klein ** 3 * (1 / 3 - 0.21 * (klein / gross)),
  };
}

const py = (v) => (Number.isFinite(v) ? Number(v.toPrecision(10)) : 0);
const s = (v) => `'${String(v).replace(/'/g, "\\'")}'`;

/**
 * SCHUBWEICHE BINDEBLECHE.
 *
 * PyNite rechnet reine Bernoulli-Stäbe - ohne Schubverformung. Für schlanke
 * Stäbe ist das richtig, für die Bindebleche nicht: sie sind kurz und
 * gedrungen, und im Vierendeel arbeiten sie in DOPPELTER KRÜMMUNG. Genau in
 * dieser Verformungsform ist der Schubanteil gross:
 *
 *      φ = 12·E·I / (G·A_s·L²)      A_s = 5/6·A beim Rechteck
 *
 *      Bl.160x10, L = 420 mm   ->  φ = 0.45   (45 % mehr Nachgiebigkeit)
 *      Bl.110x10, L = 400 mm   ->  φ = 0.24
 *      Bl.90x10,  L = 400 mm   ->  φ = 0.16
 *
 * Der Vergleichsexport von AxisVM weist für jeden Querschnitt A_y und A_z aus;
 * dort ist die Schubverformung enthalten. Ohne sie ist das PyNite-Modell in
 * den Blechen zu steif - und weil die Bleche im Rahmen ausgleichen, verzerrt
 * das jede daran geeichte Grösse, allen voran die Aufteilung der
 * Ebenenquerkraft auf die Gurte.
 *
 * ERSATZ: für einen Stab in doppelter Krümmung ist die Steifigkeit
 * 12EI/(L³(1+φ)). Ein Bernoulli-Stab mit I_eff = I/(1+φ) hat GENAU diese
 * Steifigkeit. Die reinen Drehsteifigkeiten (4EI/L, 2EI/L) trifft der Ersatz
 * nicht exakt - für das Bindeblech ist die doppelte Krümmung aber die
 * Arbeitsform, und die stimmt.
 *
 * Weil φ von der Stablänge abhängt, bekommt jede vorkommende Länge ihren
 * eigenen Querschnitt (Name mit angehängtem _L###).
 */
const SCHUB_NU = 0.3;
const SCHUB_KAPPA = 5 / 6;                     // Schubfläche des Rechtecks

function blechlaengen(bau) {
  const nach = new Map();                      // Querschnittsname -> Set Längen
  const abst = (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  bau.staebe.forEach((st) => {
    if (!String(st.qs).startsWith('BLECH')) return;
    const a = bau.knoten.get(st.von), b = bau.knoten.get(st.bis);
    if (!a || !b) return;
    const l = abst(a, b);
    if (!(l > 0)) return;
    if (!nach.has(st.qs)) nach.set(st.qs, new Set());
    nach.get(st.qs).add(Math.round(l * 1000) / 1000);
  });
  return nach;
}

/**
 * Querschnittszeilen für PyNite: Name, A, Iy, Iz, J in lokalen Achsen.
 * @param {object} bau Ergebnis von stabmodell()
 * @param {boolean} schubweich Bindebleche mit Ersatzträgheitsmoment
 */
/*
 * MESSOPTION: DIE GURTE IN IHREN HAUPTACHSEN, UM 45 GRAD GEDREHT.
 *
 * Ein Stabmodell mit Iy und Iz in den SCHENKELACHSEN kann die schiefe
 * Biegung des Winkels gar nicht zeigen: die beiden Richtungen sind darin
 * entkoppelt, I_yz kommt nicht vor, und das Horizontalblech bekommt unter
 * Vertikallast exakt null. Genau das ist der Grund, warum der Zusatzterm
 * (SCHIEFE_BIEGUNG in core.querschnitt.js) hergeleitet werden musste.
 *
 * PyNite kann es doch - nicht ueber I_yz, sondern GEOMETRISCH: der Stab
 * bekommt seine HAUPTTRAEGHEITSMOMENTE und wird um seine Laengsachse
 * gedreht. Beim gleichschenkligen Winkel liegen die Hauptachsen unter 45
 * Grad zu den Schenkeln.
 *
 * Am Kragarm nachgerechnet (L 100x100x10, Endmoment um die schenkelparallele
 * Achse):
 *
 *      Drehung   quer / vertikal      analytisch |I_yz| / I_z = 0.5885
 *          0     0.0000
 *        +45     0.5885
 *        -45     0.5885 (Vorzeichen gekehrt)
 *
 * und die Vertikalverschiebung traf auf alle Stellen den Wert mit
 * I* = D/I_z. PyNite bildet den Vorgang also exakt ab.
 *
 * DIESE OPTION DIENT DER MESSUNG, nicht dem Nachweis. Der Ausleitung fuer
 * den Auftraggeber bleibt sie fern: dort stehen die Gurte schenkelparallel,
 * wie in jedem Pruefmodell.
 */
function querschnitte(bau, schubweich = true, gurteSchief = false) {
  const zeilen = [];
  const laengen = schubweich ? blechlaengen(bau) : new Map();
  // Alles in SI: I in m⁴, A in m², L in m. E kürzt sich mit G/E heraus.
  const phi = (I, A, L) => {
    const GE = 1 / (2 * (1 + SCHUB_NU));       // G/E
    return (12 * I) / (GE * SCHUB_KAPPA * A * L * L);
  };
  bau.querschnitte.forEach((q) => {
    if (q.form === 'Angle') {
      if (gurteSchief) {
        // Hauptachsen statt Schenkelachsen. Die Zuordnung ist am Kragarm
        // geprueft: mit (I1, I2) und 45 Grad ergibt sich I* und der
        // Querverschiebungsanteil analytisch richtig.
        const w = winkelwerteFuer(getProfil(q.profil));
        zeilen.push({ name: q.name, A: q.A,
                      Iy: w.I1 / 1e12, Iz: w.I2 / 1e12, J: q.It });
        return;
      }
      // Gurt: unser I_y wirkt gegen die Vertikalbiegung, das ist PyNite Iz
      zeilen.push({ name: q.name, A: q.A, Iy: q.Iz, Iz: q.Iy, J: q.It });
      return;
    }
    const [a, b] = q.parameter;
    const r = rechteckWerte(a, b);
    const blechV = q.name.startsWith('BLECH_V');
    const blechH = q.name.startsWith('BLECH_H');
    if (!blechV && !blechH) {
      // STARR und ARM sind quadratisch - die Drehlage spielt keine Rolle
      zeilen.push({ name: q.name, A: r.A, Iy: r.stark, Iz: r.stark, J: r.J });
      return;
    }
    const satz = laengen.get(q.name);
    if (!satz || !satz.size) {
      zeilen.push(blechV
        ? { name: q.name, A: r.A, Iy: r.schwach, Iz: r.stark, J: r.J }
        : { name: q.name, A: r.A, Iy: r.stark, Iz: r.schwach, J: r.J });
      return;
    }
    [...satz].sort((x, y) => x - y).forEach((L) => {
      const f = 1 + phi(r.stark, r.A, L);
      const stark = r.stark / f;
      const nam = satz.size > 1 || schubweich
        ? `${q.name}_L${Math.round(L * 1000)}` : q.name;
      zeilen.push(blechV
        ? { name: nam, A: r.A, Iy: r.schwach, Iz: stark, J: r.J, quelle: q.name, L, phi: f - 1 }
        : { name: nam, A: r.A, Iy: stark, Iz: r.schwach, J: r.J, quelle: q.name, L, phi: f - 1 });
    });
  });
  return zeilen;
}

/** Welcher Querschnittsname gilt für diesen Stab? (Länge entscheidet.) */
function qsName(st, bau, zeilen) {
  if (!String(st.qs).startsWith('BLECH')) return st.qs;
  const a = bau.knoten.get(st.von), b = bau.knoten.get(st.bis);
  if (!a || !b) return st.qs;
  const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  const treffer = zeilen.filter((z) => z.quelle === st.qs);
  if (!treffer.length) return st.qs;
  return treffer.reduce((best, z) =>
    (Math.abs(z.L - L) < Math.abs(best.L - L) ? z : best)).name;
}

/**
 * Schreibt das Python-Skript.
 *
 * @param {object} m   Modell aus core.vierendeel.modell()
 * @param {object} opt {knotenmodell}
 * @returns {{text:string, bau:object, lasten:object}}
 */
export function pyniteSkript(m, opt = {}) {
  const km = opt.knotenmodell ?? 'anschnitt';
  const bau = stabmodell(m, { knotenmodell: km, schottAusblenden: opt.schottAusblenden,
                             auflagerModell: opt.auflagerModell });
  // EIGENGEWICHT MUSS MIT. PyNite leitet es nicht aus den Stäben ab; ohne
  // diese Zeile fehlte im Modell die grösste Einzellast (am Signaljoch
  // 0.70 kN/m gegen 3 × 3.92 kN Anbaulast - das Feldmoment fiel um 45 % zu
  // klein aus).
  const l = lasten(m, bau, { eigengewicht: true });
  const schubweich = opt.schubweich !== false;
  const gurteSchief = opt.gurteSchief === true;
  const qs = querschnitte(bau, schubweich, gurteSchief);

  // Achsentausch: unser (x, y, z) -> PyNite (X, Y, Z) = (x, z, y)
  const knotenZeilen = [...bau.knoten.values()].map(
    (k) => `M.add_node(${s(k.name)}, ${py(k.x)}, ${py(k.z)}, ${py(k.y)})`);

  /*
   * WELCHE DREHRICHTUNG BEKOMMT WELCHE ECKE?
   *
   * Die vier Winkel stehen spiegelsymmetrisch. Die Ferse zeigt in Richtung
   * (sy, sz) der Ecke, die Symmetrieachse - und damit die starke Hauptachse -
   * liegt auf deren Winkelhalbierender. Das Vorzeichen der Drehung folgt
   * deshalb dem PRODUKT sy*sz:
   *
   *      OG_L (-1,+1) -> -45      OG_R (+1,+1) -> +45
   *      UG_L (-1,-1) -> +45      UG_R (+1,-1) -> -45
   *
   * Die beiden Gurte einer Ebene drehen also GEGENEINANDER - das ist die
   * Voraussetzung des ganzen Ansatzes. Ein gemeinsamer Vorzeichenwechsel
   * aller vier spiegelt nur das Ausweichen und aendert am Blechmoment
   * nichts; das Muster zaehlt, nicht der absolute Bezug.
   */
  const drehung = (st) => {
    if (!gurteSchief) return 0;
    const t = /^(OG|UG)(L|R)_S/.exec(String(st.name));
    if (!t) return 0;
    // Nur der wirkliche Winkel dreht sich; die steifen Knotenabschnitte
    // sind quadratisch, dort waere die Drehlage ohne Wirkung.
    const q = qs.find((z) => z.name === qsName(st, bau, qs));
    if (!q || !String(q.name).startsWith('GURT_')) return 0;
    const e = ECKEN.find((x) => x.id === `${t[1]}_${t[2]}`);
    return e ? 45 * e.sy * e.sz : 0;
  };

  const stabZeilen = bau.staebe.map((st) => {
    const rot = drehung(st);
    return `M.add_member(${s(st.name)}, ${s(st.von)}, ${s(st.bis)}, 'STAHL', `
         + `${s(qsName(st, bau, qs))}`
         + (rot ? `, rotation=${py(rot)}` : '') + ')';
  });

  // Auflager. Unsere Freiheitsgrade in PyNite-Benennung:
  //   fix  (Torsion um die Jochachse)      -> RX
  //   fiy  (Vertikalbiegung)               -> RZ   (Achse = Gleisrichtung)
  //   fiz  (Windbiegung im Grundriss)      -> RY   (Achse = Lotrechte)
  const lagerZeilen = [];
  /*
   * DIE FREIHEITSGRADE DES MODELLS, NICHT EIGENE.
   *
   * Hier stand eine zweite, selbstgebaute Lagerungsregel: jedes Auflager
   * bekam y/z/Torsion gehalten und die Drehfeder dazu - gleich, welches
   * Auflagermodell `stabmodell` gerade gebaut hatte. Beim Gurtmodell hiess
   * das acht voll gehaltene Knoten samt acht Federn, obwohl dort nur die
   * Untergurte lotrecht halten und keine Feder vorkommt. Dieselbe
   * Verwechslung wie im SAF- und im DXF-Blatt: gefragt werden muss das
   * LAGER, nicht sein Endbuchstabe.
   */
  bau.auflager.forEach((a) => {
    const b = stuetzung(m, a);
    const j = (v) => (v === 'Free' ? 'False' : 'True');
    // Reihenfolge in PyNite: DX, DY, DZ, RX, RY, RZ - und PyNites Y ist
    // unser z, PyNites Z unser y. Der Tausch gilt fuer die Halte genauso wie
    // fuer die Koordinaten oben.
    lagerZeilen.push(`M.def_support(${s(a.knoten)}, ${j(b.ux)}, `
      + `${j(b.uz)}, ${j(b.uy)}, ${j(b.fix)}, ${j(b.fiz)}, ${j(b.fiy)})`);
    // 'Flexible' heisst: gehalten über eine Feder, nicht starr. PyNite
    // braucht dazu beides - den Halt und die Federzahl.
    if (b.fiy === 'Flexible' && b.cFiy_kNm) {
      lagerZeilen.push(`M.def_support_spring(${s(a.knoten)}, 'RZ', ${py(b.cFiy_kNm)})`);
    }
  });

  // Lasten je Einwirkungsgruppe. Richtungen mitdrehen.
  const richtungKraft = { X: 'FX', Y: 'FZ', Z: 'FY' };   // unser Y -> PyNite Z
  const richtungMoment = { Mx: 'MX', My: 'MZ', Mz: 'MY' };
  const lastZeilen = [];
  l.strecke.forEach((q) => {
    const dir = q.richtung === 'Z' ? 'FY' : 'FZ';
    lastZeilen.push(`M.add_member_dist_load(${s(q.stab)}, ${s(dir)}, `
      + `${py(q.wert)}, ${py(q.wert)}, case=${s(q.lastfall)})`);
  });
  l.punkt.forEach((q) => {
    lastZeilen.push(`M.add_node_load(${s(q.knoten)}, ${s(richtungKraft[q.richtung])}, `
      + `${py(q.wert)}, case=${s(q.lastfall)})`);
  });
  l.moment.forEach((q) => {
    lastZeilen.push(`M.add_node_load(${s(q.knoten)}, ${s(richtungMoment[q.richtung])}, `
      + `${py(q.wert)}, case=${s(q.lastfall)})`);
  });

  const faelle = [...new Set([...l.strecke, ...l.punkt, ...l.moment]
    .map((q) => q.lastfall))];
  const komboZeilen = faelle.map(
    (f) => `M.add_load_combo(${s(f)}, {${s(f)}: 1.0})`);

  // Schnittstellen für die Gegenüberstellung: IN FELDMITTE, nicht am Knoten.
  // Am Knoten springt das lokale Vierendeel-Moment des Gurtes; in Feldmitte
  // hat es seinen Nullpunkt, und die Summe über die vier Gurte ist dort das
  // reine Querschnittsmoment. Aus demselben Grund legt auch das Werkzeug
  // seinen Nachweisschnitt immer mittig zwischen zwei Bleche.
  const xs = m.stationsListe.map((st) => st.x);
  const stationen = xs.slice(1).map((x, i) => py((x + xs[i]) / 2));
  const zAchse = py(bau.zOben - m.h / 2);

  const kopfText = [
    `# Erzeugt vom Tragjoch-Werkzeug - PyNite-Gegenrechnung`,
    `# Joch ${m.typ ?? 'frei'} · L = ${m.L} m · Knotenmodell '${km}'`,
    `#`,
    `# ACHSEN: PyNite rechnet mit Y nach oben. Die Koordinaten sind hier`,
    `# getauscht (unser Z -> PyNite Y, unser Y -> PyNite Z); die AUSGABE`,
    `# steht wieder in unserer Benennung: X Jochachse, Y Gleisrichtung,`,
    `# Z nach oben, F_z positiv nach UNTEN.`,
    `#`,
    `#   pip install PyNiteFEA`,
    `#   python3 ${'<diese Datei>'}`,
  ].join('\n');

  const text = `${kopfText}

import csv
import sys

try:
    from Pynite import FEModel3D          # ab Version 1.0
except ImportError:                        # ältere Ausgaben
    from PyNite import FEModel3D

M = FEModel3D()

# --- Werkstoff ---------------------------------------------------------------
# E und G in kN/m2, Dichte in kN/m3. Gerechnet wird in kN und m.
M.add_material('STAHL', ${py(210e6)}, ${py(81e6)}, 0.3, ${py(78.5)})

# --- Querschnitte (A, Iy, Iz, J in lokalen Achsen) ---------------------------
${qs.map((q) => `M.add_section(${s(q.name)}, ${py(q.A)}, ${py(q.Iy)}, `
  + `${py(q.Iz)}, ${py(q.J)})`).join('\n')}

# --- Knoten ------------------------------------------------------------------
${knotenZeilen.join('\n')}

# --- Stäbe -------------------------------------------------------------------
${stabZeilen.join('\n')}

# --- Auflager ----------------------------------------------------------------
# DX, DY, DZ, RX, RY, RZ - RX ist die Gabellagerung, RZ die Vertikalbiegung.
${lagerZeilen.join('\n')}

# --- Lasten je Einwirkungsgruppe, charakteristisch ---------------------------
${lastZeilen.join('\n')}

# --- Ein Lastfall je Gruppe --------------------------------------------------
${komboZeilen.join('\n')}

print('Rechne:', ${JSON.stringify(faelle)})
M.analyze_linear(check_statics=True)

FAELLE = ${JSON.stringify(faelle)}
SCHOTT_AUSBLENDEN = ${bau.schottAusblenden ? 'True' : 'False'}
STATIONEN = ${JSON.stringify(stationen)}
Z_ACHSE = ${zAchse}

# =============================================================================
# 1 · Stabkräfte: die zwölf Endkräfte je Stab, in LOKALEN Achsen
# =============================================================================
with open('pynite_staebe.csv', 'w', newline='') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['Stab', 'Querschnitt', 'Lastfall',
                'N_i', 'Vy_i', 'Vz_i', 'T_i', 'My_i', 'Mz_i',
                'N_j', 'Vy_j', 'Vz_j', 'T_j', 'My_j', 'Mz_j'])
    for name, mem in M.members.items():
        if SCHOTT_AUSBLENDEN and name.startswith('SCHOTT_'):
            continue          # trägt weiter mit, steht nur nicht in der Tabelle
        for fall in FAELLE:
            v = mem.f(fall)
            w.writerow([name, mem.section.name, fall]
                       + [round(float(v[i, 0]), 6) for i in range(12)])

# =============================================================================
# 2 · Schnittgrössen je Station: die vier Gurte zusammengefasst
# =============================================================================
# Der Vergleich mit dem Werkzeug läuft über die RESULTIERENDEN Schnittgrössen
# des ganzen Querschnitts, nicht über einzelne Stäbe. Dafür wird an jeder
# Station durch die vier Gurte geschnitten und über sie aufsummiert:
#
#   N    = Σ N_Gurt
#   V_z  = Σ Querkraft lotrecht          (positiv nach unten wie im Werkzeug)
#   V_y  = Σ Querkraft in Gleisrichtung
#   M_y  = Σ [ N_Gurt · Abstand zur Jochachse ] + Σ lokale Gurtmomente
#   M_z  = Σ [ N_Gurt · Abstand quer      ] + Σ lokale Gurtmomente
#   T_x  = Σ [ V · Hebelarm ] + Σ lokale Gurttorsion
#
# Die Bindebleche werden NICHT mitgeschnitten: sie stehen quer zum Schnitt und
# tragen zur resultierenden Kraft am Querschnitt nichts bei.

def knotenlage(name):
    n = M.nodes[name]
    return n.X, n.Z, n.Y            # zurück in unsere Benennung: x, y, z

gurte = [n for n in M.members if n[:2] in ('OG', 'UG') and '_S' in n]

with open('pynite_stationen.csv', 'w', newline='') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['x [m]', 'Lastfall', 'N [kN]', 'V_z [kN]', 'V_y [kN]',
                'M_y [kNm]', 'M_z [kNm]', 'T_x [kNm]', 'Gurte im Schnitt'])
    for x in STATIONEN:
        for fall in FAELLE:
            N = Vz = Vy = My = Mz = Tx = 0.0
            n_gurte = 0
            for name in gurte:
                mem = M.members[name]
                xi, yi, zi = knotenlage(mem.i_node.name)
                xj, yj, zj = knotenlage(mem.j_node.name)
                if not (min(xi, xj) - 1e-9 <= x <= max(xi, xj) + 1e-9):
                    continue
                if abs(xj - xi) < 1e-9:
                    continue
                n_gurte += 1
                xl = abs(x - xi)              # Stelle im Stab, lokal
                # Lokale Achsen des Gurtes: x in Jochachse, y lotrecht,
                # z in Gleisrichtung.
                Ni = mem.axial(xl, fall)
                Vyi = mem.shear('Fy', xl, fall)
                Vzi = mem.shear('Fz', xl, fall)
                Myi = mem.moment('My', xl, fall)
                Mzi = mem.moment('Mz', xl, fall)
                Ti = mem.torque(xl, fall)
                arm_z = (zi + zj) / 2 - Z_ACHSE   # Höhe über der Jochachse
                arm_y = (yi + yj) / 2             # Abstand quer
                N += Ni
                Vz += -Vyi                    # PyNite y ist oben, wir zählen unten
                Vy += Vzi
                # Die lokalen Stabmomente zählen mit UMGEKEHRTEM Vorzeichen:
                # PyNite gibt sie in seiner eigenen Konvention aus. Die Probe
                # dazu steht unten - ohne den Dreh fehlen am Feldschnitt rund
                # 3 % gegenüber dem Gleichgewicht am Ersatzbalken.
                My += Ni * arm_z - Mzi
                Mz += Ni * arm_y - Myi
                # Torsion um die Jochachse: M_x = Σ ( Hebel_z · Kraft_quer
                # − Hebel_quer · Kraft_lotrecht ) + Σ lokale Stabtorsion.
                Tx += Vzi * arm_z - Vyi * arm_y + Ti
            w.writerow([round(x, 4), fall]
                       + [round(q, 4) for q in (N, Vz, Vy, My, Mz, Tx)] + [n_gurte])

print('geschrieben: pynite_staebe.csv, pynite_stationen.csv')
`;

  return { text, bau, lasten: l, faelle, querschnitte: qs };
}

/** Dateiname zum Skript. */
export function pyniteName(inp, knotenmodell) {
  return `PyNite_${inp.typ ?? 'frei'}_L${Number(inp.L).toFixed(1)}m_${knotenmodell}.py`;
}

/** Schreibt das Skript und lädt es herunter. */
export function exportierePynite(inp, deps, opt = {}) {
  const { modell, profOG, profUG, stahl, joch } = deps;
  const km = opt.knotenmodell ?? 'anschnitt';
  const m = modell({ ...inp, beiwerteFest: null }, profOG, profUG, stahl, joch);
  const r = pyniteSkript(m, { knotenmodell: km, schottAusblenden: opt.schottAusblenden });
  const name = pyniteName(inp, km);
  herunterladen(r.text, name, 'text/x-python');
  return { name, staebe: r.bau.staebe.length, faelle: r.faelle };
}
