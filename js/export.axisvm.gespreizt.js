/**
 * export.axisvm.gespreizt.js
 * ---------------------------------------------------------------------------
 * DER GESPREIZTE MAST IM STABMODELL (8. Oktober).
 *
 * Weisung: «Hier hast du noch die Zeichnungen zu den DGP Masttypen …
 * Implementiere diese wie die übrigen Masten und führe tests durch.»
 *
 * Ein HEB, unten längs in der Stegmitte geteilt und am Fuss gespreizt
 * (data.masten.js, `gespreiztGeometrie`). Er kommt wie der Gittermast als
 * LETZTER SCHRITT ins Modell: alles, was einen Masten baut, kennt ihn als
 * Zug von Stäben auf seiner Achse (`MAST_<Mast>_S<n>`); trägt der Zug das
 * Merkmal `gespreizt`, ersetzt `gespreizteMastenEinsetzen` den Teil unter
 * der Höhe L1:
 *
 *   zwei GURTE     je ein halbes Profil (T: Flansch + halber Steg) auf seiner
 *                  Schwerachse, vom Fuss (Aussenmass `fussBreite`) geradlinig
 *                  auf die Profilhöhe bei L1; Knoten an jedem Bindeblech und
 *                  auf jeder Höhe, auf der die Achse einen Knoten hat
 *   BINDEBLECHE    in der Stegebene zwischen den Steghälften, über ihre
 *                  lichte Länge; von der Gurtachse bis zur Stegkante starr
 *                  (stehende Vorgabe: «Die Starrelemente sind bis zum Anfang /
 *                  Ende der Bleche zu führen»)
 *   SCHOTTE        jeder Achsknoten bis L1 ist starr an beide Gurte seiner
 *                  Höhe gebunden: der Fuss (ein eingespanntes Auflager, die
 *                  Fussplatten verbinden beide Hälften), der Punkt L1 (dort
 *                  ist der Steg wieder ganz) und jeder Anschluss dazwischen
 *                  (Anbauteil, Anker, Joch)
 *
 * Über L1 bleibt der Zug auf der Achse mit dem Querschnitt des Walzprofils.
 * Die Achsstäbe darunter fallen weg, die Achsknoten bleiben.
 *
 * >>> DIE LASTEN WANDERN MIT. <<<
 * Streckenlasten der ersetzten Achsstäbe (Mastwind je Meter, wie am
 * Walzprofil - die Mastberechnung der alten Norm führt für den gespreizten
 * Masten denselben Wert) je zur Hälfte auf beide Gurte. Eigengewicht je
 * echtem Stab aus A · ρ · g, wenn die Datei es als Last führt.
 * ---------------------------------------------------------------------------
 */

import { gespreiztGeometrie } from './data.masten.js';

const r6 = (v) => Math.round(v * 1e6) / 1e6;
const RHO_G = 7850 * 9.81 / 1000;          // kN/m³
/** Fällt eine Anschlusshöhe näher als das an ein Bindeblech, gilt dessen Höhe. */
export const SPREIZ_FANG = 0.02;
/** Unter dieser lichten Länge ist das Blech kein Stab mehr (die Stegkanten stossen). */
export const SPREIZ_BLECH_MIN = 0.02;

/** Querschnitt eines Gurts: das halbe Profil als T, mit seinen Werten. */
function gurtQs(G) {
  const T = G.T, mm = (v) => Math.round(v * 1e4) / 10;
  return {
    name: `GS_T_${String(G.profilName).replace(/\s+/g, '')}`, form: 'T',
    // [Flanschbreite, Höhe des T, Stegdicke, Flanschdicke, Ausrundung] in mm; lokal z = Stegrichtung
    parameter: [mm(T.b), mm(T.hT), mm(T.tw), mm(T.tf), Number(G.profil?.r) || 0],
    profil: null, halb: G.profilName, katalog: null, radienQuelle: null, kontur: null,
    A: T.A, Iy: T.Iy, Iz: T.Iz, It: T.It, Wy: T.Wy, Wz: T.Wz, e: r6(T.e),
  };
}

const blechQs = (b, t) => ({
  name: `GS_BLECH_${Math.round(b * 1000)}x${Math.round(t * 1000)}`, form: 'Rectangle',
  // [Breite in lokal y (lotrecht), Dicke in lokal z (Normale der Stegebene)]
  parameter: [Math.round(b * 1000), Math.round(t * 1000)],
  profil: null, katalog: null, radienQuelle: null, kontur: null,
  A: null, Iy: null, Iz: null, It: null,
});

/**
 * Die gespreizten Masten einer fertigen Stabmodell-Datei einsetzen.
 *
 * @param {object} dat  Modell aus stabmodellJson (wird NICHT verändert)
 * @returns {object} dieselbe Datei mit Rahmen statt Achsstäben unter L1,
 *          dazu `gespreizt`: je Mast Typ, Lage, Achsknoten und Stabnamen
 */
export function gespreizteMastenEinsetzen(dat) {
  const merk = new Map((dat.querschnitte ?? []).filter((q) => q.gespreizt).map((q) => [q.name, q]));
  if (!merk.size) return dat;

  const knoten = dat.knoten.map((k) => ({ ...k }));
  const kn = new Map(knoten.map((k) => [k.name, k]));
  const neuKn = (name, x, y, z) => {
    if (kn.has(name)) return name;
    const k = { name, x: r6(x), y: r6(y), z: r6(z) };
    knoten.push(k); kn.set(name, k);
    return name;
  };
  const qs = new Map(dat.querschnitte.map((q) => [q.name, q]));
  const nimmQs = (q) => { if (!qs.has(q.name)) qs.set(q.name, q); return q.name; };
  if (!qs.has('STARR')) {
    qs.set('STARR', { name: 'STARR', form: 'Rectangle', parameter: [500, 500], profil: null,
      katalog: null, radienQuelle: null, kontur: null, A: null, Iy: null, Iz: null, It: null });
  }

  const zuege = new Map();
  dat.staebe.forEach((st) => {
    const m = /^MAST_([^_]+)_S\d+$/.exec(st.name);
    if (!m || !merk.has(st.querschnitt)) return;
    const z = zuege.get(m[1]) ?? { id: m[1], qs: merk.get(st.querschnitt), staebe: [] };
    z.staebe.push(st);
    zuege.set(m[1], z);
  });
  if (!zuege.size) return dat;

  const weg = new Set();
  const ersetzt = new Map();          // Achsstab über L1 hinweg -> gekürzt
  const staebe = [];
  const lasten = { punkt: [...(dat.lasten?.punkt ?? [])], moment: [...(dat.lasten?.moment ?? [])],
                   strecke: [] };
  const alteLast = new Map();
  (dat.lasten?.strecke ?? []).forEach((l) => {
    const liste = alteLast.get(l.stab) ?? [];
    liste.push(l); alteLast.set(l.stab, liste);
  });
  const meta = [];
  const starr = (name, von, bis) => {
    const p1 = kn.get(von), p2 = kn.get(bis);
    const lotrecht = Math.abs(p2.z - p1.z) > Math.hypot(p2.x - p1.x, p2.y - p1.y);
    staebe.push({ name, von, bis, querschnitt: 'STARR', lcsZ: lotrecht ? [1, 0, 0] : [0, 0, 1],
                  gelenkAnfang: null, gelenkEnde: null, art: 'starr' });
  };
  const stab = (name, q, von, bis, lcsZ) => staebe.push({ name, von, bis, querschnitt: q,
    lcsZ, gelenkAnfang: null, gelenkEnde: null, art: 'stab' });

  zuege.forEach((zug) => {
    const { id } = zug;
    const G = gespreiztGeometrie(zug.qs.gespreizt);
    if (G.fehler.length) throw new Error(`Gespreizter Mast ${G.typ}: ${G.fehler[0]}`);
    const T = G.T;
    const namen = new Set(zug.staebe.flatMap((st) => [st.von, st.bis]));
    const achse = [...namen].map((n) => kn.get(n)).sort((p, q) => p.z - q.z);
    const fuss = achse[0];
    const kopfZ = r6(achse[achse.length - 1].z - fuss.z);
    if (!(kopfZ > G.L1 + 1e-6)) {
      throw new Error(`Gespreizter Mast ${G.typ}: die Mastlänge ${kopfZ.toFixed(2)} m reicht nicht über die `
        + `Spreizung (${G.L1.toFixed(2)} m) hinaus - das Sortiment führt ${G.laengen[0]} bis ${G.laengen[1]} m.`);
    }
    // Stegrichtung = lokale z-Achse des Walzprofils auf der Mastachse.
    const dirA = (zug.staebe[0].lcsZ ?? [1, 0, 0]).map(Number);
    const dirB = [-dirA[1], dirA[0], 0];
    const ort = (ua, z) => [fuss.x + ua * dirA[0], fuss.y + ua * dirA[1], fuss.z + z];
    const hoeheVon = (k) => r6(k.z - fuss.z);

    // Der Punkt L1 braucht einen Achsknoten; ein Achsstab darüber hinweg wird dort geteilt.
    let kL1 = achse.find((k) => Math.abs(hoeheVon(k) - G.L1) < 1e-6);
    if (!kL1) {
      kL1 = kn.get(neuKn(`MAST_${id}_SPK`, fuss.x, fuss.y, fuss.z + G.L1));
      achse.push(kL1); achse.sort((p, q) => p.z - q.z);
    }
    zug.staebe.forEach((st) => {
      const a = kn.get(st.von), b = kn.get(st.bis);
      const z0 = Math.min(hoeheVon(a), hoeheVon(b)), z1 = Math.max(hoeheVon(a), hoeheVon(b));
      if (z1 <= G.L1 + 1e-6) { weg.add(st.name); return; }
      if (z0 < G.L1 - 1e-6) {
        // über L1 hinweg: der untere Teil fällt weg, der Stab beginnt neu bei L1
        const untenIstVon = hoeheVon(a) < hoeheVon(b);
        ersetzt.set(st.name, untenIstVon ? { ...st, von: kL1.name } : { ...st, bis: kL1.name });
      }
    });

    // --- Höhen der Gurtknoten: Fuss, Bleche, Achsknoten bis L1, L1 -----------
    const hoehen = [{ z: 0, station: null, achs: [] }, { z: r6(G.L1), station: null, achs: [] }];
    G.stationen.forEach((s) => hoehen.push({ z: r6(s.z), station: s, achs: [] }));
    achse.forEach((k) => {
      const z = hoeheVon(k);
      if (z > G.L1 + 1e-6) return;
      let ziel = hoehen.find((h) => Math.abs(h.z - z) <= (h.station ? SPREIZ_FANG : 1e-6));
      if (!ziel) { ziel = { z, station: null, achs: [] }; hoehen.push(ziel); }
      ziel.achs.push(k);
    });
    hoehen.sort((p, q) => p.z - q.z);

    // --- Gurte: Schwerachse des T, e ab Flansch-Aussenfläche ----------------
    const gurtName = (k, i) => `MAST_${id}_G${k}_${i}`;
    const SEITEN = [{ k: 1, s: +1 }, { k: 2, s: -1 }];
    hoehen.forEach((h, i) => {
      const u = G.tiefe(h.z) / 2 - T.e;
      SEITEN.forEach((se) => neuKn(gurtName(se.k, i), ...ort(se.s * u, h.z)));
    });
    const qG = nimmQs(gurtQs(G));
    const gurtStaebe = [];
    for (let i = 0; i < hoehen.length - 1; i += 1) {
      SEITEN.forEach((se) => {
        const name = `MAST_${id}_G${se.k}_S${i + 1}`;
        // lokal z = Stegrichtung, zur Mastachse hin
        stab(name, qG, gurtName(se.k, i), gurtName(se.k, i + 1), dirA.map((v) => -se.s * v || 0));
        gurtStaebe.push({ name, z0: hoehen[i].z, z1: hoehen[i + 1].z });
      });
    }

    // --- Bindebleche ---------------------------------------------------------
    const blechStaebe = [];
    hoehen.forEach((h, i) => {
      const s = h.station;
      if (!s) return;
      const kurz = `MAST_${id}_BL_S_${i}`;
      if (!(s.l >= SPREIZ_BLECH_MIN)) {
        // Die Stegkanten stossen fast zusammen: starre Verbindung statt eines Blechs ohne Länge.
        starr(`MAST_${id}_BT_S_${i}`, gurtName(1, i), gurtName(2, i));
        return;
      }
      const n1 = neuKn(`${kurz}_1`, ...ort(+s.l / 2, h.z));
      const n2 = neuKn(`${kurz}_2`, ...ort(-s.l / 2, h.z));
      starr(`MAST_${id}_BS_S_${i}_1`, gurtName(1, i), n1);
      starr(`MAST_${id}_BS_S_${i}_2`, n2, gurtName(2, i));
      stab(kurz, nimmQs(blechQs(s.b, s.t)), n1, n2, dirB.map((v) => v || 0));
      blechStaebe.push({ name: kurz, A: s.b * s.t });
    });

    // --- Schotte -------------------------------------------------------------
    let nSchott = 0;
    hoehen.forEach((h, i) => h.achs.forEach((k) => {
      nSchott += 1;
      SEITEN.forEach((se) => starr(`MAST_${id}_SCH${nSchott}_${se.k}`, k.name, gurtName(se.k, i)));
    }));

    // --- Lasten der ersetzten Achsstäbe -------------------------------------
    let egFall = null;
    zug.staebe.forEach((st) => {
      const a = kn.get(st.von), b = kn.get(st.bis);
      const z0 = Math.min(hoeheVon(a), hoeheVon(b)), z1 = Math.max(hoeheVon(a), hoeheVon(b));
      (alteLast.get(st.name) ?? []).forEach((l) => {
        if (/^EG_/.test(l.name)) { egFall = l.lastfall; if (z1 > G.L1 + 1e-6) lasten.strecke.push(l); return; }
        // Der Teil über L1 behält seine Last am (gekürzten) Achsstab.
        if (z1 > G.L1 + 1e-6) lasten.strecke.push(l);
        gurtStaebe.forEach((g) => {
          const zm = (g.z0 + g.z1) / 2;
          if (zm < z0 || zm > z1) return;
          lasten.strecke.push({ ...l, name: `${l.name.replace(st.name, g.name)}`, stab: g.name,
                                wert: r6(l.wert / 2) });
        });
      });
    });
    if (egFall) {
      const eg = (name, A) => lasten.strecke.push({ name: `EG_${name}`, stab: name, richtung: 'Z',
        wert: r6(-A * RHO_G), lastfall: egFall });
      gurtStaebe.forEach((g) => eg(g.name, T.A));
      blechStaebe.forEach((b) => eg(b.name, b.A));
    }

    meta.push({
      id, typ: G.typ, profil: G.profilName, x: fuss.x, y: fuss.y, zFuss: fuss.z, dirA,
      L1: G.L1, laenge: kopfZ,
      achse: achse.map((k) => k.name),
      gurte: gurtStaebe.map((g) => g.name), bleche: blechStaebe.map((b) => b.name),
    });
  });

  // Lasten, die nicht an einem Achsstab eines gespreizten Masts hängen, bleiben.
  const eigene = new Set([...zuege.values()].flatMap((z) => z.staebe.map((s) => s.name)));
  (dat.lasten?.strecke ?? []).forEach((l) => { if (!eigene.has(l.stab)) lasten.strecke.push(l); });
  const alleStaebe = [...dat.staebe.filter((st) => !weg.has(st.name)).map((st) => ersetzt.get(st.name) ?? st),
                      ...staebe];
  return { ...dat, querschnitte: [...qs.values()], knoten, staebe: alleStaebe, lasten, gespreizt: meta };
}
