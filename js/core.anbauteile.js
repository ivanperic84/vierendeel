/**
 * core.anbauteile.js
 * ---------------------------------------------------------------------------
 * RECHENKERN: Anbauteile in Lasten umrechnen.
 * Reine Funktionen, kein DOM.
 *
 * EINE LAST BESTEHT AUS DREI STÜCKEN
 * Seit der Neugliederung der Eingabe ist jede Last vollständig durch
 *
 *   ANGRIFFSPUNKT   x, y, z   [m]   wo sie angreift
 *   KRAFT           Fx, Fy, Fz [kN] was sie zieht
 *   MOMENT          Mxx, Myy, Mzz [kNm]  optional, eingeprägt
 *
 * beschrieben - und durch die EINWIRKUNGSGRUPPE, der sie angehört. Genau so
 * kommt sie hier an: jedes aufgelöste Teil trägt seinen Angriffspunkt und eine
 * Tabelle "kraefte" mit einem Sechser-Satz je Gruppe.
 *
 * ACHSEN UND VORZEICHEN
 *   x  entlang der Jochachse, 0 am linken Auflager
 *   y  Gleisrichtung
 *   z  vertikal, POSITIV NACH OBEN, 0 in der ANSCHLUSSEBENE des Teils
 *   Fz positiv nach unten (Lasten hängen)
 *   Mxx um die Jochachse (Torsion), Myy um y (Biegung), Mzz um z (Grundriss)
 *
 * NULLPUNKT VON z UND HEBELARM e_v
 * z wird dort gemessen, wo man es am Bauteil abgreift: an der SCHWERACHSE DES
 * GURTES, an dem das Teil angeschlagen ist. Eine Hängestütze von 1.35 m ist
 * 1.35 m lang, gerechnet ab Untergurt - nicht ab einer gedachten Mittellinie.
 *
 * Der Hebelarm der Torsion zählt aber ab der JOCHACHSE, denn dorthin bezieht
 * sich das Torsionsmoment des Ersatzbalkens. Zwischen beiden liegt die halbe
 * Jochhöhe:
 *
 *      z_A = +h/2   Anschluss am Obergurt
 *      z_A = −h/2   Anschluss am Untergurt
 *      e_v = −(z_A + z)          Hebelarm zur Jochachse, positiv nach unten
 *
 * Bei DURCHGEHENDER Befestigung entscheidet das Vorzeichen von z je Modul:
 * was nach oben ragt, hängt am Obergurt, was nach unten hängt, am Untergurt.
 *
 * Damit meint z dasselbe wie das Mass in der Zeichnung, und der Rechenkern
 * bekommt trotzdem den richtigen Hebelarm. Vorher wurde e_v = −z gesetzt; das
 * unterschlug die halbe Jochhöhe (beim J90 225 mm, rund 17 % der Torsion einer
 * Hängestütze).
 *
 * EINWIRKUNGSGRUPPEN (core.lasten.js)
 *   G       ständig       Eigengewicht, Umlenkkraft aus dem Leiterzug
 *   WindX   veränderlich  Windkraft in Jochachse
 *   WindY   veränderlich  Windkraft in Gleisrichtung
 *   Schnee  veränderlich  vertikale veränderliche Lasten
 *
 * Die STÄNDIGEN Horizontallasten sind kein Sonderfall, sondern der Regelfall
 * im Bogen: die Umlenkkraft aus dem Leiterzug steht immer an, unabhängig von
 * Wind und Schnee (siehe core.trasse.js). Sie mit einem Windbeiwert zu belegen
 * wäre falsch, und sie kehrt sich auch nicht mit dem Wind um.
 *
 * EINLEITUNG ÜBER VIER PUNKTE
 * Das Teil hängt MITTIG unter dem Joch und ist an vier Punkten angeschlagen:
 * je zwei am Ober- und am Untergurt, an den Stellen x ± raster/2. Die Punkte
 * liegen auf der SCHWERACHSE des jeweiligen Gurtes. Daraus folgt:
 *
 *   1. Die VERTIKALE Last wird hälftig auf die beiden Stationen x ∓ raster/2
 *      verteilt statt an einer Stelle eingeleitet. Das mildert die Querkraft-
 *      spitze und belastet zwei benachbarte Bindebleche statt einem.
 *
 *   2. Das Moment um die Jochachse wird von den vier Punkten als Kräftepaar
 *      zwischen Ober- und Untergurt aufgenommen (siehe unten).
 *
 *   3. Die Last IN JOCHACHSE erzeugt eine Normalkraft im Joch und - weil sie
 *      im Abstand e_v angreift - zusätzlich ein Biegemoment F_x · e_v.
 *
 * Die GLOBALEN Schnittgrössen bleiben davon unberührt: eine Resultierende ist
 * eine Resultierende. Verteilt wird nur, WO sie ins Joch eintritt.
 * ---------------------------------------------------------------------------
 */

import { EINWIRKUNGEN } from './core.lasten.js';

/** Leerer Sechser-Satz einer Einwirkungsgruppe. */
export const LEERE_KRAFT = () =>
  ({ Fx: 0, Fy: 0, Fz: 0, Mxx: 0, Myy: 0, Mzz: 0 });

/** Beiwerte des gerechneten Lastfalls, je Einwirkungsgruppe. */
function beiwerte(inp) {
  if (inp.beiwerte) return inp.beiwerte;
  const q = inp.gammaQ ?? 1;
  return { G: inp.gammaG ?? 1, WindX: q, WindY: q, Schnee: q };
}

/**
 * Befestigungsart eines Anbauteils.
 *   'oben'         nur am Obergurt angeschlagen (z. B. Leiter oben)
 *   'unten'        nur am Untergurt angeschlagen (z. B. Leiter unten)
 *   'durchgehend'  durchlaufendes Vertikalteil, an Ober- UND Untergurt
 *                  angeschlagen (Jochaufsatz, Hängestütze)
 *
 * Ohne Angabe folgt sie der Höhe des Angriffspunkts: Teile mit z < 0 hängen
 * unter dem Joch und sitzen am Untergurt, aufgesetzte am Obergurt.
 */
export function befestigungsArt(a) {
  if (a?.befestigung) return a.befestigung;
  return (a?.z ?? 0) <= 0 ? 'unten' : 'oben';
}

/**
 * ANSCHLUSSGURT eines einzelnen Teils.
 *
 * Bei ein- und beidseitiger Befestigung ist er verschieden bestimmt:
 *   'oben' / 'unten'  der angegebene Gurt, unabhängig von z
 *   'durchgehend'     der Gurt, zu dem das Teil hinzeigt - ein Jochaufsatz
 *                     ragt über den Obergurt, eine Hängestütze hängt unter dem
 *                     Untergurt. Beide sind an beiden Gurten angeschlagen; für
 *                     das MASS z zählt der Gurt, an dem es abgegriffen wird.
 * @returns {'OG'|'UG'}
 */
export function anschlussGurt(a) {
  const bef = befestigungsArt(a);
  if (bef === 'oben') return 'OG';
  if (bef === 'unten') return 'UG';
  return (a?.z ?? 0) > 0 ? 'OG' : 'UG';
}

/**
 * Hebelarm des Angriffspunkts zur JOCHACHSE, positiv nach unten.
 *
 *      e_v = −(z_A + z)      z_A = ±h/2 je nach Anschlussgurt
 *
 * @param {object} a Teil mit z und Befestigung
 * @param {number} h Hebelarm zwischen den Gurtschwerachsen [m]
 */
export function hebelarmZuAchse(a, h) {
  const zA = (anschlussGurt(a) === 'OG' ? +1 : -1) * (h ?? 0) / 2;
  return -(zA + (a?.z ?? 0));
}

/**
 * Bemessungswert eines Lastanteils: Summe über alle Einwirkungsgruppen.
 * @param {object} a  aufgelöstes Anbauteil mit a.kraefte
 * @param {object} bw Beiwerte je Gruppe
 * @param {string} feld 'Fx' | 'Fy' | 'Fz' | 'Mxx' | 'Myy' | 'Mzz'
 */
export function anteil(a, bw, feld) {
  return EINWIRKUNGEN.reduce((s, e) => {
    const k = a.kraefte?.[e.key];
    return k ? s + (bw[e.key] ?? 0) * (k[feld] ?? 0) : s;
  }, 0);
}

/**
 * Rechnet alle aktiven Anbauteile in Bemessungslasten um.
 *
 * @param {object[]} teile aufgelöste Anbauteile (siehe data.anbauteile.js)
 * @param {object} inp     Eingabewerte (Beiwerte je Gruppe)
 * @param {number|function} hebelarm Hebelarm Ober-/Untergurt [m]; bei
 *        verjüngten Enden eine Funktion x -> h(x), damit das Kräftepaar am
 *        richtigen Ort mit dem dortigen Hebelarm gerechnet wird
 * @returns {{P:object[], H:object[], T:object[], N:object[], M:object[],
 *            Mz:object[], lokal:object[], teile:object[]}}
 */
export function anbauteilLasten(teile, inp, hebelarm, bGurt = null) {
  const hAn = typeof hebelarm === 'function' ? hebelarm : () => hebelarm;
  // HEBELARM DES EINSEITIGEN KRÄFTEPAARS, je Gurt und je Stelle.
  // Vorrang hat die übergebene Funktion (sie kennt die Massvariante und den
  // Grundrissknick); ohne sie greift b aus den Eingabewerten, und erst
  // zuletzt das Aussenmass jbb - siehe die Herleitung weiter unten.
  const bAn = typeof bGurt === 'function'
    ? bGurt
    : (x, g) => (bGurt?.[g]
        ?? inp?.[g === 'OG' ? 'bOG' : 'bUG']
        ?? ((inp?.[g === 'OG' ? 'jbbOG' : 'jbbUG'] ?? 0) / 1000));
  const P = [];   // vertikale Einzellasten           {x, w}
  const H = [];   // horizontale Einzellasten (y)     {x, w}
  const T = [];   // Torsionsmomente (um x)           {x, w}
  const N = [];   // Normalkräfte in Jochachse        {x, w}
  const M = [];   // eingeprägte Biegemomente (M_y)   {x, w}
  const Mz = [];  // eingeprägte Momente im Grundriss {x, w}
  const lokal = [];
  const ausgewertet = [];

  const bw = beiwerte(inp);

  (teile ?? []).filter((a) => a.aktiv !== false).forEach((a) => {
    const Fz = anteil(a, bw, 'Fz');
    const Fy = anteil(a, bw, 'Fy');
    const Fx = anteil(a, bw, 'Fx');
    const Mxx = anteil(a, bw, 'Mxx');
    const Myy = anteil(a, bw, 'Myy');
    const Mzz = anteil(a, bw, 'Mzz');
    // Hebelarm zur JOCHACHSE. z zählt ab der Anschlussebene, das
    // Torsionsmoment ab der Jochachse - dazwischen liegt h/2.
    const h = hAn(a.x);
    const ev = hebelarmZuAchse(a, h);
    const ex = a.y ?? a.ex ?? 0;
    const raster = a.raster ?? 0.4;

    // Die beiden Befestigungsstellen entlang der Jochachse
    const x1 = a.x - raster / 2;
    const x2 = a.x + raster / 2;

    // 1. Vertikale Last hälftig auf beide Stellen
    if (Fz) { P.push({ x: x1, w: Fz / 2, name: a.name }); P.push({ x: x2, w: Fz / 2, name: a.name }); }
    // Horizontale Last ebenso
    if (Fy) { H.push({ x: x1, w: Fy / 2, name: a.name }); H.push({ x: x2, w: Fy / 2, name: a.name }); }

    // 2. Torsion um die Jochachse: horizontale Last am Hebelarm e_v, vertikale
    //    am Versatz e_x, dazu ein von Hand eingeprägtes M_xx.
    const Td = Fy * ev + Fz * ex + Mxx;
    if (Td) { T.push({ x: x1, w: Td / 2, name: a.name }); T.push({ x: x2, w: Td / 2, name: a.name }); }

    // 3. Last in Jochachse: Normalkraft plus Moment aus dem Hebelarm; dazu
    //    ein eingeprägtes M_yy.
    if (Fx) N.push({ x: a.x, w: Fx, name: a.name });
    const Myd = Fx * ev + Myy;
    if (Myd) M.push({ x: a.x, w: Myd, name: a.name });
    // 4. Eingeprägtes Moment im Grundriss
    if (Mzz) Mz.push({ x: a.x, w: Mzz, name: a.name });

    // ------------------------------------------------------------------
    // LOKALE EINLEITUNG DER MOMENTE
    //
    // Global sind die Momente oben erfasst. ÖRTLICH müssen sie über die
    // Anschlusspunkte in den Querschnitt eintreten, und DAS hängt davon ab,
    // an wie vielen Gurten das Teil hängt:
    //
    //   durchgehend (4 Punkte)   Kräftepaar zwischen Ober- und Untergurt,
    //                            ΔF_y = T_d / h, Richtung y.
    //                            Getragen von den HORIZONTALEBENEN.
    //
    //   oben/unten (2 Punkte)    Das Moment muss in EINER Gurtebene ankommen.
    //                            Dort stehen die beiden Winkel im Abstand b
    //                            nebeneinander; ein Moment um die Jochachse
    //                            braucht dann ein Kräftepaar in z:
    //                            ΔF_z = T_d / b.
    //                            Getragen von den VERTIKALEBENEN.
    //
    // WELCHES b. Der Hebelarm ist der Abstand der beiden GURTKRÄFTE, also
    // dasselbe Mass, das die Massvariante überall sonst wählt - nicht das
    // Aussenmass jbb der Zeichnung. Früher stand hier jbb; über den Katalog
    // gerechnet ist das 29 bis 42 % mehr als der Schwerpunktsabstand:
    //
    //      J70 1.34 · J90 1.42 · J100 1.29 · J120 1.34 · J130 1.36
    //
    // Das Kräftepaar fiel damit um denselben Betrag zu klein aus - auf der
    // UNSICHEREN Seite, und ausgerechnet beim einseitigen Anschluss, der
    // ohnehin der härtere ist. Die Korrektur steht auf mechanischer
    // Begründung, nicht auf einer Messung: das geprüfte FEM-Modell enthält
    // nur durchgehend befestigte Teile, und am verwandten Fall dort ist der
    // Hebelarm rund 5 Prozentpunkte gegen 80 bis 230 % aus der
    // Lasteinleitung auf EINE Station - er ist darunter nicht auflösbar.
    //
    // Der schmalere Hebelarm ist der ungünstigere. Bei b < h ist die
    // einseitige Befestigung deshalb die härtere Beanspruchung - und sie
    // konzentriert sich zudem auf einen einzigen Gurt.
    //
    // Neu wird das VOLLE Torsionsmoment T_d angesetzt und nicht mehr nur der
    // Anteil F_y · e_v. Solange der Angriffspunkt in der Jochebene lag (y = 0)
    // war das dasselbe; seit die Eingabe einen freien Angriffspunkt zulässt,
    // ist es das nicht mehr - und F_z · e_x muss durch dieselben vier Punkte.
    //
    // Die eingeprägten Momente M_yy und M_zz treten über den ANSCHLUSSRASTER
    // ein: zwei Punkte im Abstand "raster" bilden das nötige Kräftepaar,
    // M_yy in z (Vertikalebenen), M_zz in y (Horizontalebenen).
    // ------------------------------------------------------------------
    const bef = befestigungsArt(a);
    let dFy = 0, dFz = 0;
    const zufuegen = (ebene, gurt, wert, seite) => {
      if (!wert) return;
      lokal.push({ x: x1, teil: a.name, ebene, gurt, seite, dF: +wert / 2 });
      lokal.push({ x: x2, teil: a.name, ebene, gurt, seite, dF: -wert / 2 });
    };

    if (Td) {
      if (bef === 'durchgehend') {
        dFy = h > 0 ? Td / h : 0;
        [x1, x2].forEach((x) => {
          lokal.push({ x, teil: a.name, ebene: 'horizontal', gurt: 'OG', dF: +dFy / 2 });
          lokal.push({ x, teil: a.name, ebene: 'horizontal', gurt: 'UG', dF: -dFy / 2 });
        });
      } else {
        const gurt = anschlussGurt(a);
        const bq = bAn(a.x, gurt) || 0;
        dFz = bq > 0 ? Td / bq : 0;
        [x1, x2].forEach((x) => {
          lokal.push({ x, teil: a.name, ebene: 'vertikal', gurt, seite: 'L', dF: +dFz / 2 });
          lokal.push({ x, teil: a.name, ebene: 'vertikal', gurt, seite: 'R', dF: -dFz / 2 });
        });
      }
    }
    // Eingeprägte Momente über den Anschlussraster
    if (raster > 0) {
      const gurt = anschlussGurt(a);
      zufuegen('vertikal', gurt, Myy / raster, 'L');
      zufuegen('horizontal', gurt, Mzz / raster, undefined);
    }

    // Bemessungswerte JE EINWIRKUNGSGRUPPE. Sie werden für die Rechnung nicht
    // gebraucht - dort zählt die Summe -, wohl aber für die Darstellung: nur
    // so lassen sich die Lastarten im Modell einzeln ein- und ausblenden.
    const proGruppe = {};
    EINWIRKUNGEN.forEach((e) => {
      const k = a.kraefte?.[e.key];
      if (!k) return;
      const b = bw[e.key] ?? 0;
      proGruppe[e.key] = {
        Fx: b * (k.Fx ?? 0), Fy: b * (k.Fy ?? 0), Fz: b * (k.Fz ?? 0),
        Mxx: b * (k.Mxx ?? 0), Myy: b * (k.Myy ?? 0), Mzz: b * (k.Mzz ?? 0),
      };
    });

    ausgewertet.push({
      ...a, x1, x2, ev, ex, Fz, Fy, Fx, Mxx, Myy, Mzz, proGruppe,
      Td, Myd, dFy, dFz, hLokal: h, befestigung: bef,
      punkte: bef === 'durchgehend'
        ? [{ x: x1, gurt: 'OG' }, { x: x2, gurt: 'OG' },
           { x: x1, gurt: 'UG' }, { x: x2, gurt: 'UG' }]
        : [{ x: x1, gurt: bef === 'oben' ? 'OG' : 'UG' },
           { x: x2, gurt: bef === 'oben' ? 'OG' : 'UG' }],
    });
  });

  return { P, H, T, N, M, Mz, lokal, teile: ausgewertet,
           TSumme: T.reduce((s, t) => s + Math.abs(t.w), 0) };
}

/**
 * Anteil, den die Station x von einer Einzelkraft an der Stelle p übernimmt.
 *
 * Eine Kraft, die zwischen zwei Blechen ins Joch eintritt, verteilt sich auf
 * beide - nach dem Hebelarm, wie bei jeder Lasteinleitung zwischen zwei Knoten:
 *
 *      Anteil links  = (x_r − p) / (x_r − x_l)
 *      Anteil rechts = (p − x_l) / (x_r − x_l)
 *
 * Vorher wurde alles im Fenster ±a₁/2 EINEM Blech zugeschlagen. Damit hing η
 * sprunghaft vom Anschlussraster ab: 5 cm mehr Raster liessen die Einleitung
 * in das Nachbarfeld kippen und η um über 25 % fallen. Die Aufteilung nach
 * Hebelarm macht daraus einen stetigen Übergang - und liegt am Feldrand auf
 * derselben Seite wie die frühere Rechnung.
 *
 * Ausserhalb des Rasters fällt alles auf die Randstation; dort gibt es kein
 * Nachbarblech, das mittragen könnte.
 *
 * @param {number} p Ort der Krafteinleitung [m]
 * @param {number} x Station des betrachteten Blechs [m]
 * @param {number[]} stationen aufsteigende Blechstationen [m]
 */
export function stationsAnteil(p, x, stationen) {
  const st = stationen;
  if (!st?.length) return Math.abs(p - x) < 1e-9 ? 1 : 0;
  const letzte = st.length - 1;
  if (p <= st[0] + 1e-12) return Math.abs(x - st[0]) < 1e-9 ? 1 : 0;
  if (p >= st[letzte] - 1e-12) return Math.abs(x - st[letzte]) < 1e-9 ? 1 : 0;
  let i = 0;
  while (i < letzte - 1 && st[i + 1] < p) i++;
  const l = st[i], r = st[i + 1];
  const spanne = r - l;
  if (!(spanne > 0)) return Math.abs(x - l) < 1e-9 ? 1 : 0;
  if (Math.abs(x - l) < 1e-9) return (r - p) / spanne;
  if (Math.abs(x - r) < 1e-9) return (p - l) / spanne;
  return 0;
}

/**
 * Örtliche Zusatzquerkraft einer Blechebene aus den Anbauteilen.
 *
 * Das Kräftepaar der Lasteinleitung wirkt nur im Bereich des Anbauteils und
 * wird dort ZUR Ebenenquerkraft addiert. Das ist bewusst konservativ: der
 * St-Venant-Schubfluss aus der globalen Torsion läuft an derselben Stelle
 * durch, und beide Anteile werden überlagert statt gegeneinander abgeglichen.
 *
 * Aufsummiert, nicht gemittelt: liegen beide Einleitungsstellen am selben
 * Blech, muss dieses Blech das ganze Kräftepaar übertragen. Je Ebene zählt nur
 * die eine Richtung des Paars - die Gegenkraft wirkt am anderen Gurt und
 * beansprucht dessen Blech gleich stark.
 *
 * @param {object[]} lokal Einträge aus anbauteilLasten
 * @param {number} x       Station [m]
 * @param {string} ebene   'vertikal' | 'horizontal'
 * @param {number[]} stationen Blechstationen [m]
 */
export function lokaleQuerkraft(lokal, x, ebene, stationen) {
  return (lokal ?? [])
    .filter((l) => l.ebene === ebene && l.dF > 0)
    .reduce((s, l) => s + l.dF * stationsAnteil(l.x, x, stationen), 0);
}

/** Charakteristisches Eigengewicht aller Anbauteile [kN]. */
export function eigengewichtAnbauteile(teile) {
  return (teile ?? []).filter((a) => a.aktiv !== false)
    .reduce((s, a) => s + (a.kraefte?.G?.Fz ?? 0), 0);
}
