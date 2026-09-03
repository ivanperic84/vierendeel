/**
 * export.axisvm.abfang.js
 * ---------------------------------------------------------------------------
 * DAS ABFANGJOCH ALS STABMODELL FÜR AxisVM.
 *
 * `export.axisvm.js` baut das Tragjoch: vier Winkelgurte, zwei Blechebenen,
 * ein Rahmen, der SENKRECHT steht. Das Abfangjoch ist ein anderes Tragwerk —
 * zwei Walzgurte nebeneinander, Bindebleche oben und unten, und der Rahmen
 * LIEGT. Es hier eigens zu bauen ist billiger, als den Jochexport um eine
 * zweite Bauart zu erweitern, die mit seiner nichts teilt ausser dem Format.
 *
 * ======================= DIE ACHSEN =======================================
 *
 *      x   Jochachse, quer zum Gleis — die Trägerachse
 *      y   Gleisrichtung — hier stehen die beiden Gurte nebeneinander
 *      z   lotrecht
 *
 * Damit liegt die Rahmenebene waagrecht (xy), und der Leiterzug wirkt in y:
 * er biegt den Träger in seiner Rahmenebene. Das Eigengewicht wirkt in z,
 * quer dazu.
 *
 * >>> DIE GURTE STEHEN AUFRECHT, MIT DER OEFFNUNG NACH AUSSEN. <<<
 *
 * Ihr Steg ist senkrecht und liegt INNEN, die Flansche zeigen nach aussen —
 * so steht es im Schnitt A-A, und die Gegenprobe geht auf: d/2 + b = k/2.
 * Hier stand zuerst das Gegenteil («Flansche zur Trägermitte»); das ergab
 * einen Hebelarm, der bei A160 siebzehn Prozent zu gross war.
 *
 * Damit ist ihre STARKE Achse waagrecht — sie trägt das Eigengewicht — und
 * ihre SCHWACHE liegt in der Rahmenebene, wo der Vierendeel-Verband wirkt.
 * Genau die Zuordnung, mit der auch der Kern rechnet.
 *
 * >>> UND DIE BLECHE LIEGEN AUF DEN FLANSCHEN, OBEN UND UNTEN. <<<
 *
 * Nicht mittig zwischen den Gurten. Zwei Bleche auf verschiedenen Höhen
 * bilden mit den Gurten einen KASTEN und tragen Torsion; ein mittiger
 * Riegel tut das nicht. Angeschlossen sind sie über starre Arme von der
 * Gurtschwerachse zur Flanschmitte — dort und nur dort stimmen die
 * Trägheitsmomente des Gurtstabs.
 *
 * >>> DIESES MODELL RECHNET NOCH NICHT. <<<
 *
 * Der Lauf vom 3. September gab Rueckgabe 0 und null Ergebnisfaelle; die
 * Fassung mit EINEM mittigen Riegel gab 1 und fünf. Die sechzig starren Arme
 * sind der Verdacht — als Mechanismus oder als numerisch schlecht
 * konditioniertes System. Zu prüfen ist zuerst, ob die Blechknoten wirklich
 * gehalten sind: die Auflager sitzen an den Gurtknoten auf z = 0, die
 * Blechebenen hängen allein an den Armen.
 *
 * ======================= WAS DIESES MODELL PRÜFEN SOLL ====================
 *
 * PyNite zeigt: der Kern überschätzt die Gurtkraft um rund 40 % und
 * unterschätzt die örtliche Biegung um Faktor 5. Ob das am Rechenweg liegt
 * oder an meinem PyNite-Ersatzmodell, entscheidet sich hier — dieses Modell
 * bildet ab, was dort fehlte: die Endverstärkung und die Endbleche als das,
 * was sie sind.
 * ---------------------------------------------------------------------------
 */

import { getAbfangjoch, abfangAufbau, abfangBindeblech,
         abfangEndverstaerkung } from './data.abfangjoche.js';
import { abfangQuerschnitt, abfangBlechstationen,
         abfangStuetzweite } from './core.abfangjoch.js';

/** Ausrundungsradius je Profilreihe [mm] — aus dem Katalog des Profils. */
const RADIUS = { 'UPE 160': 10, 'UPE 200': 11, 'UPE 240': 12,
                 'IPE 270': 15, 'IPE 300': 15, 'IPE 330': 18, 'IPE 360': 18 };

/**
 * Das Stabmodell eines Abfangjochs im Austauschformat des Aufbauskripts.
 *
 * @param {string} typ   Abfangjochtyp (A160 … A360)
 * @param {number} jt    Jochlänge [m] — eine GEFÜHRTE Länge
 * @param {object} opt   { Fh: horizontale Abfangkraft [kN], gd, sd }
 */
export function abfangAxisvmModell(typ, jt, opt = {}) {
  const a = getAbfangjoch(typ);
  const auf = abfangAufbau(a);
  const q = abfangQuerschnitt(typ);
  const ein = abfangBlechstationen(typ, jt);
  if (!ein) {
    throw new Error(
      `Abfangjoch ${typ} / ${jt} m: Blecheinteilung nicht erfasst — `
      + 'kein Modell. Ohne sie stünden die Bleche irgendwo.');
  }
  const bl = abfangBindeblech(typ);
  const sw = abfangStuetzweite(typ, jt);
  const L = sw ? sw.bis : jt;
  const e = q.e / 100;                       // cm -> m, Achsabstand der Gurte

  /*
   * DIE QUERSCHNITTE.
   *
   * Der Gurt als U oder I - vermessen am 3. September: AddC nimmt
   * (h, b, e, tw, R), AddI nimmt (h, b, tw, tf, R). Die Reihenfolge ist
   * NICHT dieselbe, und sie zu vertauschen gäbe ein Profil, das plausibel
   * aussieht und falsch ist.
   */
  const p = q.gurt;
  const istU = p.reihe === 'UPE';
  const querschnitte = [{
    name: 'GURT',
    form: istU ? 'Channel' : 'I',
    parameter: istU
      ? [p.h * 10, p.b * 10, p.tf * 10, p.tw * 10, RADIUS[p.name] ?? 10]
      : [p.h * 10, p.b * 10, p.tw * 10, p.tf * 10, RADIUS[p.name] ?? 15],
    profil: p.name,
    A: p.A / 1e4, Iy: p.Iy / 1e8, Iz: p.Iz / 1e8, It: p.It / 1e8,
  }];
  /*
   * >>> DIE BLECHE LIEGEN FLACH. <<<
   *
   * Weisung vom 3. September: «die bleche sind nicht nur mittig sondern
   * liegen jeweils auf flansch lage oben und unten.» Sie liegen also AUF den
   * Flanschen, nicht hochkant zwischen den Gurten.
   *
   * `AddRectangular(h, b)` nimmt h in lokaler z-Richtung. Bei einem flach
   * liegenden Blech ist das die DICKE; die Breite misst in Trägerrichtung.
   * Vertauscht gäbe es ein Blech, das hochkant steht - dieselbe Fläche,
   * dieselbe Rahmensteifigkeit, aber eine ganz andere Bauform.
   */
  const blechQs = (name, m) => ({
    name, form: 'Rectangle', parameter: [m.t, m.b],
    profil: `Flachstahl ${m.b}/${m.t}`,
    A: (m.b * m.t) / 1e6,
    Iy: (m.t * m.b ** 3) / 12 / 1e12,
    Iz: (m.b * m.t ** 3) / 12 / 1e12,
    It: (m.b * m.t ** 3) / 3 / 1e12,
  });
  querschnitte.push(blechQs('BLECH', bl.regel));
  const enden = [bl.endeL, ...(Array.isArray(bl.endeR) ? bl.endeR
    : bl.endeR ? [bl.endeR] : [])].filter(Boolean);
  if (enden.length) querschnitte.push(blechQs('BLECH_ENDE', enden[0]));

  /*
   * DIE KNOTEN. An jeder Blechstation und an beiden Auflagern, je Gurt
   * einer. `V` ist der Gurt in +y, `H` der in -y.
   */
  const xs = [...new Set([0, ...ein.stationen, L]
    .map((v) => Math.round(v * 1e6) / 1e6))].sort((u, v) => u - v)
    .filter((v) => v >= -1e-9 && v <= L + 1e-9);
  const nm = (g, i) => `${g}_${xs[i].toFixed(3)}`;
  /*
   * >>> DREI EBENEN JE GURT. <<<
   *
   * Die SCHWERACHSE trägt den Gurtstab - dort und nur dort stimmen seine
   * Trägheitsmomente. Die Bleche greifen aber am OBER- und UNTERFLANSCH an,
   * um `zf` darüber und darunter. Sie an die Schwerachse zu hängen wäre
   * bequem und falsch: dann läge ihre Ebene in der Trägermitte, und der
   * Kasten, den sie mit den Gurten bilden, entstünde gar nicht.
   *
   * Also eigene Knoten auf Flanschhöhe, starr an den Gurtknoten gekoppelt.
   * `zf` ist die Mitte des Flansches: halbe Profilhöhe minus halbe
   * Flanschdicke.
   */
  const zf = (p.h - p.tf) / 2 / 100;      // cm -> m
  const nmF = (g, i, o) => `${g}${o}_${xs[i].toFixed(3)}`;
  const knoten = [];
  xs.forEach((x, i) => {
    knoten.push({ name: nm('V', i), x, y: e / 2, z: 0 });
    knoten.push({ name: nm('H', i), x, y: -e / 2, z: 0 });
    knoten.push({ name: nmF('V', i, 'O'), x, y: e / 2, z: zf });
    knoten.push({ name: nmF('V', i, 'U'), x, y: e / 2, z: -zf });
    knoten.push({ name: nmF('H', i, 'O'), x, y: -e / 2, z: zf });
    knoten.push({ name: nmF('H', i, 'U'), x, y: -e / 2, z: -zf });
  });

  /*
   * DIE STÄBE. Gurte längs, Bindebleche quer.
   *
   * `lcsZ` = [0,0,1] lässt den Querschnitt aufrecht stehen: Steg senkrecht,
   * starke Achse waagrecht. Ohne diese Angabe legt AxisVM die lokale Achse
   * nach eigener Regel, und der Gurt läge auf der Seite — mit vertauschten
   * Trägheitsmomenten und einem Ergebnis, dem man es nicht ansieht.
   */
  const staebe = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (const g of ['V', 'H']) {
      staebe.push({
        name: `${g}_S${i}`, von: nm(g, i), bis: nm(g, i + 1),
        querschnitt: 'GURT', steifesMaterial: false,
        lcsZ: [0, 0, 1], gelenkAnfang: null, gelenkEnde: null, art: 'stab',
      });
    }
  }
  /*
   * Die Bindebleche stehen quer und liegen FLACH - ihre Dicke misst in z.
   * `lcsZ` = [0,0,1] gilt auch hier; das Rechteck ist mit h = Breite in
   * Trägerrichtung angelegt, und die dreht der Riegel selbst mit.
   */
  /*
   * DIE STARREN ARME von der Schwerachse zum Flansch. Sie tragen nichts
   * eigenes - sie halten den Anschlusspunkt dort, wo er sitzt. Das
   * Aufbauskript kennt `steifesMaterial` dafür (Faktor 1000).
   */
  xs.forEach((x, i) => {
    for (const g of ['V', 'H']) {
      for (const o of ['O', 'U']) {
        staebe.push({
          name: `ARM_${g}${o}${i}`, von: nm(g, i), bis: nmF(g, i, o),
          querschnitt: 'GURT', steifesMaterial: true,
          lcsZ: [0, 1, 0], gelenkAnfang: null, gelenkEnde: null, art: 'starr',
        });
      }
    }
  });
  /*
   * >>> ZWEI BLECHE JE STATION, OBEN UND UNTEN. <<<
   *
   * Bisher stand hier EIN Riegel in der Trägermitte, mit der Steifigkeit
   * beider Bleche. Das war die falsche Bauform: zwei Bleche auf
   * verschiedenen Höhen bilden mit den Gurten einen KASTEN und tragen
   * Torsion, ein mittiger Riegel tut das nicht.
   */
  ein.stationen.forEach((s, k) => {
    const i = xs.indexOf(Math.round(s * 1e6) / 1e6);
    if (i < 0) return;
    for (const o of ['O', 'U']) {
      staebe.push({
        name: `BL_${o}${k}`, von: nmF('H', i, o), bis: nmF('V', i, o),
        querschnitt: 'BLECH', steifesMaterial: false,
        lcsZ: [0, 0, 1], gelenkAnfang: null, gelenkEnde: null, art: 'stab',
      });
    }
  });
  /*
   * >>> DIE ENDEN SIND GEKOPPELT. <<<
   *
   * Am Auflager laufen die Gurte zusammen (Spreizung 280 statt d im Feld)
   * und sind durch Endblech und Gabel bzw. Deckblech verbunden. Ohne diesen
   * Riegel stünden sie dort unverbunden nebeneinander - im PyNite-Modell
   * gab das eine Durchbiegung bis zum 19-fachen des Balkenwerts.
   *
   * Genommen wird das ENDBLECH; die Gabel zusätzlich anzusetzen hiesse, eine
   * Steifigkeit zu behaupten, die erst zu vermessen wäre.
   */
  if (enden.length) {
    [0, xs.length - 1].forEach((i, k) => {
      for (const o of ['O', 'U']) {
        staebe.push({
          name: `BL_ENDE_${o}${k}`, von: nmF('H', i, o), bis: nmF('V', i, o),
          querschnitt: 'BLECH_ENDE', steifesMaterial: false,
          lcsZ: [0, 0, 1], gelenkAnfang: null, gelenkEnde: null, art: 'stab',
        });
      }
    });
  }

  /*
   * DIE AUFLAGER.
   *
   * Weisung vom 3. September: «die Auflager so modelieren, dass die
   * drehachse (global) um y und z frei ist.» Also beide Biegungen gelenkig,
   * die Torsion um die Trägerachse gehalten. In Längsrichtung hält nur EIN
   * Ende - sonst bekäme der Träger Zwang aus seiner eigenen Verkürzung.
   */
  const n = xs.length - 1;
  const auflager = [];
  [['A', 0], ['B', n]].forEach(([ende, i]) => {
    for (const g of ['V', 'H']) {
      auflager.push({
        ende, knoten: nm(g, i), x: xs[i], modell: 'gelenkig',
        ux: ende === 'A' ? 'Rigid' : 'Free',
        uy: 'Rigid', uz: 'Rigid',
        fix: 'Rigid',        // Torsion um die Trägerachse gehalten
        fiy: 'Free', fiz: 'Free',
        cFiy_MNm: null, cFiy_kNm: null, cUz_MN: null, cUz_kNm: null,
      });
    }
  });

  /*
   * DIE LASTEN.
   *
   * Der Leiterzug greift IN DER TRÄGERMITTELEBENE an (Weisung) - also auf
   * beide Gurte gleich, keine planmässige Torsion. Er wirkt in y, der
   * Gleisrichtung.
   *
   * Das Eigengewicht als Streckenlast in -z, je Gurt die Hälfte: quer zur
   * Rahmenebene trägt jeder Gurt für sich.
   */
  const Fh = Number(opt.Fh) || 22;              // kN, Regelfall der Abfangung
  const gd = Number(opt.gd ?? (a.gewicht / 100));   // kg/m -> kN/m
  const mitte = Math.round(n / 2);
  const punkt = [];
  for (const g of ['V', 'H']) {
    punkt.push({ name: `FH_${g}`, knoten: nm(g, mitte), richtung: 'Y',
                 wert: Fh / 2, lastfall: 'Leiterzug' });
  }
  const strecke = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (const g of ['V', 'H']) {
      strecke.push({ name: `G_${g}${i}`, stab: `${g}_S${i}`, richtung: 'Z',
                     wert: -gd / 2, lastfall: 'G' });
    }
  }

  return {
    format: 'tragjoch-stabmodell',
    version: 1,
    merkmale: ['abfangjoch', 'liegender-vierendeel'],
    erzeugt: new Date().toISOString().slice(0, 19),
    einheiten: { laenge: 'm', parameter: 'mm', kraft: 'kN', moment: 'kNm',
                 drehfeder: 'kNm/rad', flaeche: 'm2', traegheit: 'm4' },
    achsen: 'x Jochachse, y Gleisrichtung, z lotrecht nach oben',
    tragwerk: {
      typ, L: jt, js: L, e, k: auf.k / 1000,
      art: 'abfangjoch', bauform: 'liegender Vierendeeltraeger',
      gurtprofil: p.name, bleche: ein.anzahl,
      blechlage: ein.randGenau ? 'aus dem Schema' : 'genaehert',
      endverstaerkung: abfangEndverstaerkung(typ)?.art ?? 'keine',
    },
    material: { name: 'S235', art: 'Steel', rho: 7850, E: 210000, G: 81000,
                nu: 0.3, alpha: 1.2e-5, fy: 235 },
    materialSteif: { name: 'S235 steif', faktor: 1000 },
    querschnitte, knoten, staebe, auflager,
    lastfaelle: [
      { key: 'G', label: 'Staendig - Joch', art: 'Others' },
      { key: 'Leiterzug', label: 'Leiterzug (Abfangung)', art: 'Others' },
    ],
    kombinationen: [
      { key: 'gk', bez: 'Staendig', art: 'charakteristisch', nachweis: false,
        anteile: [{ lastfall: 'G', faktor: 1 }] },
      { key: 'ULS', bez: 'Tragsicherheit', art: 'Bemessung', nachweis: true,
        anteile: [{ lastfall: 'G', faktor: 1.35 },
                  { lastfall: 'Leiterzug', faktor: 1.5 }] },
    ],
    lasten: { punkt, strecke },
  };
}
