/**
 * export.axisvm.unterbau.js
 * ---------------------------------------------------------------------------
 * DER UNTERBAU UNTER DEM MASTFUSS (12. Oktober, Perrondach).
 *
 * Weisung siehe data.unterbau.js. Letzter Schritt der Modelldatei, nach
 * Gittermast und gespreiztem Mast: wo ein Mast auf einer Perrondach-
 * konstruktion steht, ist sein Fuss kein Auflager mehr. Darunter kommt
 *
 *   - die EINZELSTÜTZE: ein Stab vom Mastfuss lotrecht bis aufs Terrain,
 *     dort eingespannt; oder
 *   - der QUERBALKEN AUF ZWEI STÜTZEN: der Mastfuss sitzt auf dem Balken
 *     (Balkenachse auf Höhe Mastfuss), der Balken läuft quer oder längs zum
 *     Gleis zu zwei Stützen, diese stehen auf dem Terrain (eingespannt oder
 *     in der Rahmenebene gelenkig). Balken und Stützen biegesteif verbunden.
 *
 * Damit ist der Mast so lang wie in Wirklichkeit, unten eben steifer - er
 * zieht in der Jochreihe nicht mehr Last an, als ihm zukommt. Die Kraft, die
 * er an den Unterbau abgibt, liefert der Löser am Übergang wie eine
 * Auflagerkraft (`uebergaenge`, core.stabwerk.js): sie steht in der Tabelle
 * der Reaktionskräfte am Platz des Mastfusses. Der Unterbau selbst wird
 * NICHT nachgewiesen (Bestand, gehört dem Dach), er trägt keine Lasten
 * ausser seinem Eigengewicht.
 * ---------------------------------------------------------------------------
 */
import { unterbauVon, unterbauQuerschnitt, unterbauHoehe } from './data.unterbau.js';

const r6 = (v) => Math.round(v * 1e6) / 1e6;
const FUSS = /^(.*?)MAST_(.+)_F$/;

/** Die Unterbauten aller Sätze des Blattes, je Mastkennung (und Ende A/B). */
export function unterbauJeAus(saetze) {
  const je = {};
  (saetze ?? []).forEach((s) => {
    Object.entries(s?.unterbauJe ?? {}).forEach(([k, v]) => { if (!je[k]) je[k] = v; });
  });
  return je;
}

export function unterbauEinsetzen(dat, je) {
  if (!je || !Object.keys(je).length) return dat;
  const ziele = (dat.auflager ?? []).map((a) => {
    const m = FUSS.exec(a.knoten);
    if (!m) return null;
    const roh = je[m[2]];
    const u = unterbauVon(roh);
    return u ? { a, pre: m[1], id: m[2], u, fuss: roh.fuss } : null;
  }).filter(Boolean);
  if (!ziele.length) return dat;

  const knoten = dat.knoten.map((k) => ({ ...k }));
  const kn = new Map(knoten.map((k) => [k.name, k]));
  const neuKn = (name, x, y, z) => {
    const k = { name, x: r6(x), y: r6(y), z: r6(z) };
    knoten.push(k); kn.set(name, k);
    return name;
  };
  const qs = new Map(dat.querschnitte.map((q) => [q.name, q]));
  const nimmQs = (q) => {
    if (!qs.has(q.name)) {
      qs.set(q.name, { profil: null, katalog: null, radienQuelle: null, kontur: null, ...q });
    }
    return q.name;
  };
  const staebe = [...dat.staebe];
  const weg = new Set();
  const auflager = [];
  const uebergaenge = [...(dat.uebergaenge ?? [])];
  const unterbau = [...(dat.unterbau ?? [])];
  const stab = (name, q, von, bis, lcsZ) => {
    staebe.push({ name, von, bis, querschnitt: q, lcsZ, gelenkAnfang: null, gelenkEnde: null, art: 'stab' });
    return name;
  };
  const lager = (a, knotenName, frei = []) => {
    const o = { ...a, knoten: knotenName, modell: 'unterbau', feder: null };
    ['ux', 'uy', 'uz', 'fix', 'fiy', 'fiz'].forEach((f) => { o[f] = frei.includes(f) ? 'Free' : 'Rigid'; });
    auflager.push(o);
  };

  ziele.forEach(({ a, pre, id, u, fuss }) => {
    const P = kn.get(a.knoten);
    const h = unterbauHoehe(u, fuss);
    if (!(h > 0)) {
      throw new Error(`Unterbau an Mast ${id}: die Höhe des Mastfusses über Terrain fehlt `
        + '(Feld «Höhe Mastfuss FL über Terrain» oder Fussversatz des Masten).');
    }
    weg.add(a.knoten);
    const qS = nimmQs(unterbauQuerschnitt(u.stuetze, u.frei, 'S'));
    const lcsS = u.steg === 'laengs' ? [0, 1, 0] : [1, 0, 0];
    const namen = [];
    const basis = `${pre}UB_${id}`;
    if (u.art === 'riegel') {
      const r = u.riegel;
      const L = Number(r.spannweite);
      if (!(L > 0)) throw new Error(`Unterbau an Mast ${id}: Spannweite des Querbalkens fehlt.`);
      const e = Number.isFinite(Number(r.lage)) && r.lage !== null && r.lage !== '' ? Number(r.lage) : L / 2;
      if (!(e > 0.01 && e < L - 0.01)) {
        throw new Error(`Unterbau an Mast ${id}: der Mast muss zwischen den Stützen stehen `
          + `(Abstand zur Stütze 1 zwischen 0 und ${L.toFixed(2)} m, eingegeben ${e.toFixed(2)} m).`);
      }
      const d = r.richtung === 'laengs' ? [0, 1, 0] : [1, 0, 0];
      const qR = nimmQs(unterbauQuerschnitt(r.profil, r.frei, 'R'));
      const o1 = neuKn(`${basis}_O1`, P.x - e * d[0], P.y - e * d[1], P.z);
      const o2 = neuKn(`${basis}_O2`, P.x + (L - e) * d[0], P.y + (L - e) * d[1], P.z);
      const f1 = neuKn(`${basis}_F1`, P.x - e * d[0], P.y - e * d[1], P.z - h);
      const f2 = neuKn(`${basis}_F2`, P.x + (L - e) * d[0], P.y + (L - e) * d[1], P.z - h);
      namen.push(stab(`${basis}_R1`, qR, o1, a.knoten, [0, 0, 1]));
      namen.push(stab(`${basis}_R2`, qR, a.knoten, o2, [0, 0, 1]));
      namen.push(stab(`${basis}_S1`, qS, f1, o1, lcsS));
      namen.push(stab(`${basis}_S2`, qS, f2, o2, lcsS));
      // Gelenkig: frei um die Achse quer zur Rahmenebene, aus der Ebene gehalten.
      const frei = u.lagerung === 'gelenkig' ? [d[0] ? 'fiy' : 'fix'] : [];
      lager(a, f1, frei);
      lager(a, f2, frei);
      /*
       * >>> DER MASTFUSS GEGEN VERDREHEN GEHALTEN (Vorgabe, 12. Oktober). <<<
       * Rückfrage mit der Messung (J90/20 m, M1 auf IPE 360 quer: Joch 0.45 →
       * 5.77, das offene Profil verdreht sich fast frei), Antwort «Gehalten,
       * als Vorgabe»: die Dachkonstruktion (Schotte, Pfetten) hält den Fuss
       * gegen Verdrehen um die Balkenachse. Ein Halt NUR dieser Drehung an
       * einem eigenen Knoten, starr an den Fuss gehängt - so bleibt die Kraft
       * am Übergang die der Maststäbe. «nach Profil» rechnet die Torsion des
       * Balkens, wie der Querschnitt sie hergibt.
       */
      if (r.torsion !== 'profil') {
        if (!qs.has('STARR')) {
          qs.set('STARR', { name: 'STARR', form: 'Rectangle', parameter: [500, 500], profil: null,
            katalog: null, radienQuelle: null, kontur: null, A: null, Iy: null, Iz: null, It: null });
        }
        const th = neuKn(`${basis}_TH_F`, P.x, P.y, P.z - 0.1);
        staebe.push({ name: `${basis}_TH`, von: th, bis: a.knoten, querschnitt: 'STARR',
                      lcsZ: [1, 0, 0], gelenkAnfang: null, gelenkEnde: null, art: 'starr' });
        namen.push(`${basis}_TH`);
        lager(a, th, ['ux', 'uy', 'uz', 'fix', 'fiy', 'fiz'].filter((f) => f !== (d[0] ? 'fix' : 'fiy')));
      }
    } else {
      const f = neuKn(`${basis}_F`, P.x, P.y, P.z - h);
      namen.push(stab(`${basis}_S`, qS, f, a.knoten, lcsS));
      // Die Einzelstütze ist immer eingespannt - gelenkig wäre sie ein Mechanismus.
      lager(a, f);
    }
    uebergaenge.push({ knoten: a.knoten, id, ohne: namen });
    unterbau.push({ id, art: u.art, hoehe: h, stuetze: qs.get(qS).titel ?? u.stuetze,
                    lagerung: u.art === 'riegel' ? u.lagerung : 'eingespannt',
                    ...(u.art === 'riegel' ? { riegel: { titel: qs.get(nimmQs(unterbauQuerschnitt(u.riegel.profil, u.riegel.frei, 'R'))).titel,
                                                         spannweite: Number(u.riegel.spannweite),
                                                         richtung: u.riegel.richtung } } : {}),
                    staebe: namen, knoten: a.knoten });
  });

  return { ...dat, knoten, staebe, querschnitte: [...qs.values()],
           auflager: [...dat.auflager.filter((a) => !weg.has(a.knoten)), ...auflager],
           uebergaenge, unterbau };
}
