/**
 * export.axisvm.gitter.js
 * ---------------------------------------------------------------------------
 * DER GITTERMAST IM STABMODELL (3. Oktober, Etappe 4).
 *
 * Weisung: «Einen alten Masttyp ergänzen … Es ist ein Gittermast, struktur
 * wie die Joche, mit unterschied das Winkel nach innen und der untere teil
 * konisch ausgebildet ist. … im oberen teil ist ein rohr der in den oberen
 * teil des gittermasten eingespannt ist.» Entscheide: «Stabwerk + Diagramm
 * als Kontrolle», «Einzelmast und Jochmast, Rohr als Teil», «teilung nach
 * zeichnung».
 *
 * >>> WIE ER INS MODELL KOMMT: ALS LETZTER SCHRITT, NICHT ALS ZWEITER BAUER. <<<
 *
 * Alles, was einen Masten baut - Einzelmast, Joch, Blatt mit geteilten
 * Masten, Anker, Teile am Masten, Konsolen -, kennt den Masten als Zug von
 * Stäben auf seiner ACHSE (`MAST_<Mast>_S<n>`) mit Knoten dort, wo etwas
 * hängt. Das bleibt so. Trägt der Zug den Merk-Querschnitt eines
 * Gittermasts (`gitter`), ersetzt `gittermastenEinsetzen` ihn in der
 * fertigen Datei:
 *
 *   vier GURTE      Winkel auf ihren Schwerachsen, Schenkel nach innen,
 *                   unten konisch; Knoten an jeder Station der Zeichnung
 *                   und auf jeder Höhe, auf der die Achse einen Knoten hat
 *   BINDEBLECHE     auf allen vier Seiten an den Stationen, stumpf zwischen
 *                   den Schenkeln: das Blech trägt über seine lichte Länge,
 *                   von der Gurtachse bis zum Blechanfang starr (stehende
 *                   Vorgabe: «Die Starrelemente sind bis zum Anfang / Ende
 *                   der Bleche zu führen»)
 *   SCHOTTE         jeder Achsknoten im Gitter ist starr an die vier Gurte
 *                   seiner Höhe gebunden - so kommen Joch, Anbauteile, Anker
 *                   und das Fundament an den Masten (Annahme, dem
 *                   Auftraggeber am 3. Oktober vorgelegt)
 *   ROHR            echter Stab auf der Achse: im Oberteil vom Fusspunkt der
 *                   Einspannung bis zum Kopf, an beiden Enden über ein
 *                   Schott gehalten (wie im AxisVM-Beispiel), darüber frei;
 *                   beim Typ mit Mastaufsatz das Quadratrohr ab dem Kopf
 *
 * Die Achsstäbe im Gitter fallen weg; die Achsknoten bleiben, und mit ihnen
 * alles, was an ihnen hängt. Das Auflager bleibt der EINE Fussknoten auf der
 * Achse (voll eingespannt), starr an die vier Gurtfüsse gebunden - statisch
 * vier eingespannte Gurtfüsse auf einem starren Fundament, und die
 * Reaktionstabelle liest wie bei jedem Masten eine Resultierende.
 *
 * >>> DIE LASTEN WANDERN MIT. <<<
 * Wind (Streckenlast auf den Achsstäben, kN/m am KOPF des Gitters): je
 * Gurtabschnitt ein Viertel, im Verhältnis der Windangriffsfläche A_s
 * seiner Höhe zu der am Kopf (Betreiberwerte der Tragjoche, übertragen -
 * `gitterWindflaeche` in data.masten.js); über dem Kopf der Durchmesser
 * des Rohrs bzw. die Kante des Aufsatzes. Eigengewicht:
 * je echtem Stab aus A · ρ · g, wenn die Datei es als Last führt (Stabwerk
 * der Anwendung); AxisVM rechnet es selbst.
 * ---------------------------------------------------------------------------
 */

import { gittermastGeometrie, gittermasten, gitterWindflaeche, obenWindflaeche } from './data.masten.js';
import { winkelwerteFuer, winkelIt, winkelGetauscht } from './core.winkel.js';

const r6 = (v) => Math.round(v * 1e6) / 1e6;
const RHO_G = 7850 * 9.81 / 1000;          // kN/m³
/** Fällt eine Anschlusshöhe näher als das an eine Station, gilt die Station. */
export const GITTER_FANG = 0.02;
/** Unter dieser lichten Länge ist das Blech kein Stab mehr (Schenkel stossen). */
export const BLECH_MIN = 0.02;

/** Merk-Querschnitt des Gittermasts auf der Mastachse (vor dem Einsetzen). */
export function gitterMerkQuerschnitt(p) {
  return {
    name: `MAST_GITTER_${String(p.gitter).replace(/[^A-Za-z0-9]+/g, '')}`,
    art: 'Parametric', form: 'Gitter', gitter: p.gitter,
    parameter: [p.h, p.b], profil: p.name,
    A: p.A / 1e4, Iy: p.Iy / 1e8, Iz: p.Iz / 1e8, It: p.It / 1e8,
  };
}

/** Querschnitt eines Gurtwinkels; `tausch` = langer Schenkel in lokal z. */
function gurtQs(w, tausch) {
  const p = tausch ? winkelGetauscht(w) : w;
  const ww = winkelwerteFuer(p);
  const kurz = `${w.aH}x${w.aV}x${w.t}`.replace(/\./g, '_');
  return {
    name: `GM_L${kurz}${tausch ? '_T' : ''}`, form: 'Angle',
    parameter: [p.aH, p.aV, p.t, w.r1 ?? 0, w.r2 ?? 0],
    profil: w.name, ...(tausch ? { tausch: true } : {}),
    katalog: null, radienQuelle: w.r1 > 0 ? 'norm' : 'keine', kontur: null,
    A: w.A / 1e4, Iy: ww.Iy / 1e12, Iz: ww.Iz / 1e12, Iyz: ww.Iyz / 1e12,
    It: winkelIt(w) / 1e8,
  };
}

const blechQs = (b, t) => ({
  name: `GM_BLECH_${Math.round(b * 1000)}x${Math.round(t * 1000)}`, form: 'Rectangle',
  // [Breite in lokal y (lotrecht), Dicke in lokal z (Flächennormale)]
  parameter: [Math.round(b * 1000), Math.round(t * 1000)],
  profil: null, katalog: null, radienQuelle: null, kontur: null,
  A: null, Iy: null, Iz: null, It: null,
});

function obenQs(o) {
  const mm = (v) => Math.round(v * 1e4) / 10;
  return o.form === 'Pipe'
    ? { name: `GM_ROHR_${mm(o.d)}x${mm(o.t)}`.replace(/\./g, '_'), form: 'Pipe',
        parameter: [mm(o.d), mm(o.t)], profil: `RO ${mm(o.d)}x${mm(o.t)}`,
        katalog: null, radienQuelle: null, kontur: null,
        A: o.A, Iy: o.I, Iz: o.I, It: o.It }
    : { name: `GM_KASTEN_${mm(o.a)}x${mm(o.t)}`.replace(/\./g, '_'), form: 'Box',
        parameter: [mm(o.a), mm(o.a), mm(o.t)], profil: `QRO ${mm(o.a)}x${mm(o.t)}`,
        katalog: null, radienQuelle: null, kontur: null,
        A: o.A, Iy: o.I, Iz: o.I, It: o.It };
}

/** Aussenmass und Gurtachsabstand auf der Höhe z (ab Fuss), linear zwischen den Stationen. */
export function gitterSchnitt(G, z) {
  const st = G.stationen;
  if (z <= st[0].z) return { ...st[0] };
  for (let i = 1; i < st.length; i += 1) {
    if (z <= st[i].z + 1e-9) {
      const a = st[i - 1], b = st[i];
      const t = (z - a.z) / (b.z - a.z || 1);
      const li = (k) => a[k] + (b[k] - a[k]) * t;
      return { z, teil: b.teil, a: li('a'), b: li('b'), achseA: li('achseA'), achseB: li('achseB') };
    }
  }
  return { ...st[st.length - 1], z };
}

const ECKEN = [
  { k: 1, sa: +1, sb: +1 }, { k: 2, sa: -1, sb: +1 },
  { k: 3, sa: -1, sb: -1 }, { k: 4, sa: +1, sb: -1 },
];
// Die vier Seiten: zwischen welchen Ecken, in welcher Richtung das Blech läuft.
const SEITEN = [
  { n: 'Bp', von: 2, bis: 1, laengs: 'a', s: +1 },   // Seite +b, läuft in a
  { n: 'Bm', von: 3, bis: 4, laengs: 'a', s: -1 },
  { n: 'Ap', von: 4, bis: 1, laengs: 'b', s: +1 },   // Seite +a, läuft in b
  { n: 'Am', von: 3, bis: 2, laengs: 'b', s: -1 },
];

/**
 * Die Gittermasten einer fertigen Stabmodell-Datei einsetzen.
 *
 * @param {object} dat  Modell aus stabmodellJson (wird NICHT verändert)
 * @returns {object} dieselbe Datei mit Fachwerk statt Achsstäben, dazu
 *          `gittermasten`: je Mast Typ, Lage, Achsknoten und Stabnamen
 */
export function gittermastenEinsetzen(dat) {
  const merk = new Map((dat.querschnitte ?? []).filter((q) => q.gitter).map((q) => [q.name, q]));
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

  // Die Achsstäbe je Mast.
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
  const staebe = [];
  const lasten = { punkt: [...(dat.lasten?.punkt ?? [])], moment: [...(dat.lasten?.moment ?? [])],
                   strecke: [] };
  const alteLast = new Map();      // Achsstab -> seine Streckenlasten
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
    const G = gittermastGeometrie(gittermasten().find((g) => g.typ === zug.qs.gitter));
    const wU = G.winkelUnten, wO = G.winkelOben;
    zug.staebe.forEach((st) => weg.add(st.name));
    // Die Achsknoten, von unten nach oben.
    const namen = new Set(zug.staebe.flatMap((st) => [st.von, st.bis]));
    let achse = [...namen].map((n) => kn.get(n)).sort((p, q) => p.z - q.z);
    const fuss = achse[0];
    const dirA = (zug.staebe[0].lcsZ ?? [1, 0, 0]).map(Number);
    const dirB = [-dirA[1], dirA[0], 0];                    // lotrecht × a
    const ort = (ua, ub, z) => [fuss.x + ua * dirA[0] + ub * dirB[0],
                                fuss.y + ua * dirA[1] + ub * dirB[1], fuss.z + z];
    const zKnick = G.hUnten, zKopf = G.hoehe;
    // Kopf des Gitters und Fusspunkt des Rohrs brauchen einen Achsknoten.
    const achsKn = (z, kurz) => {
      const da = achse.find((k) => Math.abs(k.z - fuss.z - z) < 1e-6);
      if (da) return da;
      const k = kn.get(neuKn(`MAST_${id}_${kurz}`, fuss.x, fuss.y, fuss.z + z));
      achse.push(k); achse.sort((p, q) => p.z - q.z);
      return k;
    };
    const kKopf = achsKn(zKopf, 'GKOPF');
    const zRohrFuss = G.oben?.innen > 0 ? r6(zKopf - G.oben.innen) : null;
    const kRohrFuss = zRohrFuss !== null ? achsKn(zRohrFuss, 'GROHR') : null;

    // --- Höhen der Gurtknoten: Stationen und Achsknoten im Gitter ----------
    const hoehen = G.stationen.map((s) => ({ z: s.z, station: s, achs: [] }));
    achse.forEach((k) => {
      const z = r6(k.z - fuss.z);
      if (z > zKopf + 1e-6) return;
      let ziel = hoehen.find((h) => Math.abs(h.z - z) <= GITTER_FANG);
      if (!ziel) { ziel = { z, station: null, achs: [] }; hoehen.push(ziel); }
      ziel.achs.push(k);
    });
    hoehen.sort((p, q) => p.z - q.z);

    // --- Gurte --------------------------------------------------------------
    const ungleich = (w) => w.aH !== w.aV;
    const gurtName = (k, i) => `MAST_${id}_G${k}_${i}`;
    hoehen.forEach((h, i) => {
      const s = h.station ?? gitterSchnitt(G, h.z);
      h.schnitt = s;
      ECKEN.forEach((e) => neuKn(gurtName(e.k, i),
        ...ort(e.sa * s.achseA / 2, e.sb * s.achseB / 2, h.z)));
    });
    const gurtStaebe = [];
    for (let i = 0; i < hoehen.length - 1; i += 1) {
      const zm = (hoehen[i].z + hoehen[i + 1].z) / 2;
      const w = zm < zKnick ? wU : wO;
      ECKEN.forEach((e) => {
        // Schenkel nach innen: bei sa·sb > 0 liegt der lange Schenkel (a) in
        // lokal y und lokal z zeigt nach −sb·b; sonst ist der Winkel das
        // Spiegelbild - langer Schenkel in lokal z, das nach −sa·a zeigt.
        const gleichsinnig = e.sa * e.sb > 0;
        const q = nimmQs(gurtQs(w, !gleichsinnig && ungleich(w)));
        const lcsZ = gleichsinnig ? dirB.map((v) => -e.sb * v || 0) : dirA.map((v) => -e.sa * v || 0);
        const name = `MAST_${id}_G${e.k}_S${i + 1}`;
        stab(name, q, gurtName(e.k, i), gurtName(e.k, i + 1), lcsZ);
        gurtStaebe.push({ name, z0: hoehen[i].z, z1: hoehen[i + 1].z, A: w.A / 1e4 });
      });
    }

    // --- Bindebleche an den Stationen ---------------------------------------
    const blechStaebe = [];
    hoehen.forEach((h, i) => {
      const s = h.station;
      if (!s?.blech) return;
      const w = s.teil === 'unten' ? wU : wO;
      const tW = w.t / 1000;
      SEITEN.forEach((se) => {
        const l = se.laengs === 'a' ? s.blech.la : s.blech.lb;
        const kVon = gurtName(se.von, i), kBis = gurtName(se.bis, i);
        const kurz = `MAST_${id}_BL_${se.n}_${i}`;
        if (!(l >= BLECH_MIN)) {
          // Die Schenkel stossen zusammen (oder überlappen): eine starre
          // Verbindung der beiden Gurte statt eines Blechs ohne Länge.
          if (l > -1e-6) starr(`MAST_${id}_BT_${se.n}_${i}`, kVon, kBis);
          return;
        }
        // Blechebene: Mitte des Schenkels an der Aussenfläche.
        const aussen = se.s * ((se.laengs === 'a' ? s.b : s.a) / 2 - tW / 2);
        const p = (u) => (se.laengs === 'a' ? ort(u, aussen, h.z) : ort(aussen, u, h.z));
        const n1 = neuKn(`${kurz}_1`, ...p(-l / 2));
        const n2 = neuKn(`${kurz}_2`, ...p(+l / 2));
        starr(`MAST_${id}_BS_${se.n}_${i}_1`, kVon, n1);
        starr(`MAST_${id}_BS_${se.n}_${i}_2`, n2, kBis);
        const normale = (se.laengs === 'a' ? dirB : dirA).map((v) => se.s * v || 0);
        const q = nimmQs(blechQs(s.blech.b, s.blech.t));
        stab(kurz, q, n1, n2, normale);
        blechStaebe.push({ name: kurz, A: s.blech.b * s.blech.t });
      });
    });

    // --- Schotte: jeder Achsknoten im Gitter an die vier Gurte --------------
    let nSchott = 0;
    hoehen.forEach((h, i) => h.achs.forEach((k) => {
      nSchott += 1;
      ECKEN.forEach((e) => starr(`MAST_${id}_SCH${nSchott}_${e.k}`, k.name, gurtName(e.k, i)));
    }));

    // --- Rohr bzw. Aufsatz ---------------------------------------------------
    const obenStaebe = [];
    const lcsOben = zug.staebe[0].lcsZ ?? [1, 0, 0];
    let qOben = null;
    if (G.oben) {
      qOben = nimmQs(obenQs(G.oben));
      if (kRohrFuss) {
        stab(`MAST_${id}_ROHR_I`, qOben, kRohrFuss.name, kKopf.name, lcsOben);
        obenStaebe.push({ name: `MAST_${id}_ROHR_I`, z0: zRohrFuss, z1: zKopf, innen: true });
      }
    }
    const ueber = achse.filter((k) => k.z - fuss.z >= zKopf - 1e-6);
    for (let i = 0; i < ueber.length - 1; i += 1) {
      const name = `MAST_${id}_ROHR_S${i + 1}`;
      if (qOben) stab(name, qOben, ueber[i].name, ueber[i + 1].name, lcsOben);
      else starr(name, ueber[i].name, ueber[i + 1].name);
      obenStaebe.push({ name, z0: r6(ueber[i].z - fuss.z), z1: r6(ueber[i + 1].z - fuss.z), innen: false });
    }

    // --- Lasten der Achsstäbe umsetzen --------------------------------------
    // Die Windangriffsfläche A_s auf der Höhe z (data.masten.js):
    // Wind in X ist Wind in Richtung a, wenn a in x liegt.
    const cA = (richtung, z) => {
      const inA = (richtung === 'X' && Math.abs(dirA[0]) > 0.5) || (richtung === 'Y' && Math.abs(dirA[1]) > 0.5);
      return gitterWindflaeche(G, z, inA ? 'a' : 'b').cA;
    };
    const obenCA = obenWindflaeche(G);
    let egFall = null;
    zug.staebe.forEach((st) => {
      const z0 = Math.min(kn.get(st.von).z, kn.get(st.bis).z) - fuss.z;
      const z1 = Math.max(kn.get(st.von).z, kn.get(st.bis).z) - fuss.z;
      (alteLast.get(st.name) ?? []).forEach((l) => {
        if (/^EG_/.test(l.name)) { egFall = l.lastfall; return; }
        const wind = /^Wind/.test(String(l.lastfall)) && (l.richtung === 'X' || l.richtung === 'Y');
        const bezug = wind ? cA(l.richtung, G.hoehe) : 1;
        gurtStaebe.forEach((g) => {
          const zm = (g.z0 + g.z1) / 2;
          if (zm < z0 || zm > z1) return;
          const f = wind ? cA(l.richtung, zm) / bezug : 1;
          lasten.strecke.push({ ...l, name: `${l.name.replace(st.name, g.name)}`, stab: g.name,
                                wert: r6(l.wert * f / 4) });
        });
        obenStaebe.filter((o) => !o.innen).forEach((o) => {
          const zm = (o.z0 + o.z1) / 2;
          if (zm < z0 || zm > z1 || !qOben) return;
          const f = wind ? obenCA / bezug : 1;
          lasten.strecke.push({ ...l, name: `${l.name.replace(st.name, o.name)}`, stab: o.name,
                                wert: r6(l.wert * f) });
        });
      });
    });
    if (egFall) {
      const eg = (name, A) => lasten.strecke.push({ name: `EG_${name}`, stab: name, richtung: 'Z',
        wert: r6(-A * RHO_G), lastfall: egFall });
      gurtStaebe.forEach((g) => eg(g.name, g.A));
      blechStaebe.forEach((b) => eg(b.name, b.A));
      if (qOben) obenStaebe.forEach((o) => eg(o.name, G.oben.A));
    }

    meta.push({
      id, typ: G.typ, x: fuss.x, y: fuss.y, zFuss: fuss.z, dirA,
      hoehe: G.hoehe, hUnten: G.hUnten, laenge: G.laenge,
      achse: achse.map((k) => k.name),
      gurte: gurtStaebe.map((g) => g.name), bleche: blechStaebe.map((b) => b.name),
      oben: obenStaebe.map((o) => o.name), obenArt: G.oben?.art ?? null,
      gurtUnten: G.gurtUnten, gurtOben: G.gurtOben,
    });
  });

  // Lasten, die nicht an einem ersetzten Achsstab hängen, bleiben.
  (dat.lasten?.strecke ?? []).forEach((l) => { if (!weg.has(l.stab)) lasten.strecke.push(l); });
  const alleStaebe = [...dat.staebe.filter((st) => !weg.has(st.name)), ...staebe];
  const benutzt = new Set(alleStaebe.map((st) => st.querschnitt));
  return {
    ...dat,
    querschnitte: [...qs.values()].filter((q) => !q.gitter || benutzt.has(q.name)),
    knoten, staebe: alleStaebe, lasten,
    gittermasten: meta,
  };
}
