/**
 * core.stabwerk.js
 * ---------------------------------------------------------------------------
 * RAEUMLICHER STABWERKSLOESER - Schritt 2 des Bauplans vom 19. September
 * («die zusammenhaengenden jochtragwerke sind als gesamtheitliches tragwerk
 * zu betrachten», Entscheid: gekoppelt, ein Rechenweg).
 *
 * >>> ER FRISST DAS MODELL, DAS ES SCHON GIBT. <<<
 *
 * Eingang ist genau das, was `stabmodellJson` (export.axisvm.js) heute fuer
 * AxisVM schreibt: Knoten, Staebe (stab / starr / link), Querschnitte,
 * Auflager, Lasten, Lastfaelle. Damit gibt es EINEN Modellbauer fuer AxisVM,
 * PyNite und die eigene Rechnung - und keine zweite Wahrheit, die frueher
 * oder spaeter auseinanderlaeuft.
 *
 * Achsen wie im Werkzeug: x Jochachse, y Gleisrichtung, z lotrecht nach oben.
 * Einheiten: m, kN, kNm. E kommt in N/mm2 herein und wird zu kN/m2.
 *
 * Kein Fremdcode, keine Abhaengigkeit - die Bedingung des Buendlers.
 *
 * WAS ER KANN
 *   Euler-Bernoulli-Stab, 6 Freiheitsgrade je Knoten, beliebig im Raum
 *   gedreht (die lokale z-Achse kommt aus `lcsZ` der Datei).
 *   Starrelemente als Ersatzsteifigkeit, Linkelemente als Punkt-zu-Punkt-
 *   Federn je Freiheitsgrad, Auflager starr oder als Drehfeder,
 *   Gleichlasten global gerichtet (ueber Volleinspannkraefte).
 *
 * WAS ER NOCH NICHT KANN
 *   Nichtlineares - der Seilanker traegt nur Zug (Entscheid 16. September),
 *   das braucht eine Iteration je Kombination. Und Starrkoerper als
 *   ZWANGSBEDINGUNG statt als Ersatzsteifigkeit; siehe die Warnung bei
 *   STARR_FAKTOR.
 *
 * >>> ER HAENGT NOCH AN KEINEM NACHWEIS. <<<
 *
 * Eingebaut ist er, gemessen auch (Pruefstand Abschnitt 111: 20 geschlossene
 * Loesungen exakt, dazu das Gleichgewicht am J90/20 m). Ob und wann seine
 * Schnittgroessen in die Gurt- und Blechauswertung gehen, ist Schritt 5 des
 * Bauplans und ein Entscheid des Auftraggebers - jede Zahl im Nachweis
 * aenderte sich dadurch.
 */

/* ---------------------------------------------------------------------------
 * 1 . Querschnittswerte
 * ------------------------------------------------------------------------- */

/** Torsionsflaechenmoment eines Rechtecks (Saint-Venant, Naeherung Roark). */
function rechteckIt(a, b) {
  const h = Math.max(a, b), t = Math.min(a, b);
  const r = t / h;
  const beta = 1 / 3 - 0.21 * r * (1 - r ** 4 / 12);
  return beta * h * t ** 3;
}

/** A, Iy, Iz, It eines Querschnitts der Datei - in m2 bzw. m4. */
export function qsWerte(q) {
  if (q.A != null && q.Iy != null) {
    return { A: q.A, Iy: q.Iy, Iz: q.Iz, It: q.It ?? (q.Iy + q.Iz) / 2 };
  }
  if (q.form === 'Rectangle') {
    // parameter [b, h] in mm: b in lokaler y-, h in lokaler z-Richtung.
    const b = q.parameter[0] / 1000, h = q.parameter[1] / 1000;
    return { A: b * h, Iy: (b * h ** 3) / 12, Iz: (h * b ** 3) / 12,
             It: rechteckIt(b, h) };
  }
  throw new Error('Querschnitt ohne Werte: ' + q.name + ' (' + q.form + ')');
}

/* ---------------------------------------------------------------------------
 * 2 . Stabsteifigkeit
 * ------------------------------------------------------------------------- */

/** Lokales Dreibein aus Stabrichtung und der Vorgabe fuer die lokale z-Achse. */
export function dreibein(dx, dy, dz, lcsZ) {
  const L = Math.hypot(dx, dy, dz);
  const ex = [dx / L, dy / L, dz / L];
  let zr = lcsZ && lcsZ.length === 3 ? lcsZ.slice() : null;
  if (zr) {
    // Anteil laengs des Stabes abziehen - die Vorgabe ist nur eine Richtung.
    const s = zr[0] * ex[0] + zr[1] * ex[1] + zr[2] * ex[2];
    zr = [zr[0] - s * ex[0], zr[1] - s * ex[1], zr[2] - s * ex[2]];
    if (Math.hypot(zr[0], zr[1], zr[2]) < 1e-8) zr = null;
  }
  if (!zr) zr = Math.abs(ex[2]) > 0.999 ? [1, 0, 0] : [0, 0, 1];
  const n = Math.hypot(zr[0], zr[1], zr[2]);
  const ez = [zr[0] / n, zr[1] / n, zr[2] / n];
  const ey = [ez[1] * ex[2] - ez[2] * ex[1],
              ez[2] * ex[0] - ez[0] * ex[2],
              ez[0] * ex[1] - ez[1] * ex[0]];
  return { L, R: [ex, ey, ez] };
}

/** 12x12 im lokalen System, Euler-Bernoulli. */
/* ===========================================================================
 * >>> DIE SCHUBVERFORMUNG GEHOERT IN DIE MATRIX, NICHT IN DAS I. <<<
 * =========================================================================
 *
 * Weisung vom 25. September: «ja die schubweichheit ebenfalls rechnen».
 *
 * Ein Euler-Bernoulli-Balken nimmt an, dass Querschnitte senkrecht zur
 * Stabachse bleiben - er kennt nur Biegung. Ein kurzer, gedrungener Stab
 * verformt sich aber zu einem guten Teil durch SCHIEBUNG: der Querschnitt
 * kippt gegen die Achse. Das Mass dafuer ist die Timoshenko-Zahl
 *
 *     phi = 12 E I / (G kappa A L^2)
 *
 * - das Verhaeltnis von Biege- zu Schubnachgiebigkeit. Sie faellt mit dem
 * QUADRAT der Laenge: ein schlanker Stab merkt nichts, ein kurzer alles.
 *
 * Am J90 / 8 m gemessen, ueber alle echten Staebe:
 *
 *     Bleche  (48)  L 0.260-0.340 m   phi 0.194 - 0.460
 *     Gurte  (152)  L 0.040-0.651 m   phi 0.066 - 17.5
 *     Mast    (10)  L 0.095-7.180 m   phi 0.0077 - 43.9
 *
 * >>> phi IST EINE ELEMENTGROESSE, KEINE BAUTEILGROESSE. <<<
 *
 * Die grossen Werte stehen an den KURZEN Abschnitten - am 95 mm langen
 * Maststueck zwischen den beiden Jochanschluessen, an den steifen
 * Gurtabschnitten im Knoten. Das ist kein Fehler und kein Grund, sie
 * auszunehmen: die Schubverformung F L / (G kappa A) waechst LINEAR mit
 * der Laenge und ist damit additiv. Teilt man denselben Balken in zehn
 * Stuecke, bekommt jedes ein zehnmal groesseres phi und ein zehntel der
 * Verformung - die Summe bleibt. Der Pruefstand misst genau das
 * (Abschnitt 122: ein Kragarm in 1, 2 und 10 Stuecken).
 *
 * Der lange Mastschaft, der in einem Stueck steht, hat phi = 0.0077 -
 * dort ist die Schubverformung wirklich klein.
 *
 * >>> WARUM NICHT EINFACH DAS I ABMINDERN. <<<
 *
 * Die PyNite-Ausleitung tut genau das (I / (1 + phi)) - sie MUSS es, weil
 * PyNite Euler-Bernoulli rechnet und die Schubflaeche gar nicht kennt.
 * Der Preis: das abgeminderte I steht dann auch in den Momenten- und
 * Verdrehungstermen, wo es nichts zu suchen hat, und es haengt an der
 * Stablaenge - derselbe Querschnitt braucht je Laenge einen eigenen
 * Eintrag. Hier steht phi an seiner richtigen Stelle: in den vier
 * Biegetermen der Elementmatrix.
 *
 *     k_ww   = 12 E I / (L^3 (1+phi))
 *     k_wfi  =  6 E I / (L^2 (1+phi))
 *     k_fifi = (4+phi) E I / (L (1+phi))   und  (2-phi) E I / (L (1+phi))
 *
 * Fuer phi = 0 ist das Zeichen fuer Zeichen die alte Matrix.
 *
 * >>> UND WER SIE NICHT BEKOMMT. <<<
 *
 * NUR echte Staebe (`art === 'stab'`) - dieselbe Regel wie beim
 * Eigengewicht. Ein Starrelement ist kein Bauteil, sondern ein Kunstgriff;
 * sein Ersatzquerschnitt misst 500 x 500 mm bei 11 mm Laenge, und daraus
 * folgt phi = 6400. Mit Schub waere es um diesen Faktor WEICH - aus dem
 * Starrelement wuerde ein Gelenk. Ein Linkelement ist eine Feder und
 * kommt hier ohnehin nicht vorbei.
 * ========================================================================= */
function kLokal(E, G, A, Iy, Iz, It, L, schub = false) {
  const k = new Float64Array(144);
  const put = (i, j, v) => {
    k[i * 12 + j] += v;
    if (i !== j) k[j * 12 + i] += v;
  };
  // Je Biegeebene eine eigene Schubzahl - sie haengt am I dieser Ebene.
  const phiVon = (I) => (schub && A > 0 && G > 0
    ? (12 * E * I) / (G * SCHUB_KAPPA * A * L * L) : 0);
  const py = phiVon(Iy), pz = phiVon(Iz);

  const EA = (E * A) / L, GJ = (G * It) / L;
  put(0, 0, EA); put(6, 6, EA); put(0, 6, -EA);
  put(3, 3, GJ); put(9, 9, GJ); put(3, 9, -GJ);
  // Biegung in der lokalen x-z-Ebene: Traegheit Iy, w = dof 2/8, phi_y = 4/10.
  const a = (12 * E * Iy) / (L ** 3 * (1 + py));
  const b = (6 * E * Iy) / (L ** 2 * (1 + py));
  const c = (E * Iy) / (L * (1 + py));
  put(2, 2, a); put(8, 8, a); put(2, 8, -a);
  put(2, 4, -b); put(2, 10, -b); put(8, 4, b); put(8, 10, b);
  put(4, 4, (4 + py) * c); put(10, 10, (4 + py) * c); put(4, 10, (2 - py) * c);
  // Biegung in der lokalen x-y-Ebene: Iz, v = dof 1/7, phi_z = 5/11.
  const a2 = (12 * E * Iz) / (L ** 3 * (1 + pz));
  const b2 = (6 * E * Iz) / (L ** 2 * (1 + pz));
  const c2 = (E * Iz) / (L * (1 + pz));
  put(1, 1, a2); put(7, 7, a2); put(1, 7, -a2);
  put(1, 5, b2); put(1, 11, b2); put(7, 5, -b2); put(7, 11, -b2);
  put(5, 5, (4 + pz) * c2); put(11, 11, (4 + pz) * c2); put(5, 11, (2 - pz) * c2);
  return k;
}

/** Punkt-zu-Punkt-Feder (Linkelement): je lokalem Freiheitsgrad eine Zahl. */
/* ===========================================================================
 * >>> DAS LINKELEMENT HAT EINE LAENGE - UND DIE GEHOERT IN DIE MATRIX. <<<
 * =========================================================================
 *
 * Hier stand eine Feder, die die sechs Freiheitsgrade PAARWEISE koppelt:
 * u_i gegen u_j, fi_i gegen fi_j, jeden fuer sich. Das ist die Feder
 * ZWEIER AUFEINANDERLIEGENDER PUNKTE. Der Link am Jochanschluss ist aber
 * 0.05 m lang, und damit war die Formulierung kinematisch falsch: eine
 * Verdrehung des einen Knotens nahm den anderen NICHT mit, obwohl beide
 * in fuenf Richtungen starr gekoppelt sind. Ein starrer Stiel mit einem
 * Bolzen am Ende verhaelt sich nicht so - der Stiel dreht sich mit, und
 * der Bolzen laesst allein die RELATIVE Verdrehung zu.
 *
 * Gefunden am 25. September, beim Nachgehen einer Verdrehung an den
 * Blechknoten: das Joch verdrehte sich gegenueber PyNite um 23 % zu viel
 * (1.191e-2 gegen 9.655e-3 rad), waehrend Mast und Anschluss auf 0.5 %
 * stimmten - der Sprung sass genau ueber dem Link. Ausgeschlossen wurden
 * der Reihe nach: die Federsteifigkeit (von 1e8 bis 1e13 gesaettigt), der
 * Starrfaktor, die Torsionskonstanten (identisch) und die einzelnen
 * Freigaben.
 *
 * >>> DIE RICHTIGE FORMULIERUNG. <<<
 *
 * Die Feder misst die Relativverformung des MATERIELLEN PUNKTES, nicht
 * die der Knotenwerte:
 *
 *     du  = u_j - u_i + S(r) fi_i          dfi = fi_j - fi_i
 *
 * mit r = (L, 0, 0) im lokalen System (die Stabachse ist ex) und
 * S(r) v = r x v. Daraus k = B^T C B mit der 6x12-Matrix B. Der starre
 * Arm sitzt am i-Ende, das Gelenk am j-Ende - dieselbe Aufteilung, die
 * die PyNite-Ausleitung mit ihren Stabendfreigaben trifft
 * (`def_releases` am j-Ende, siehe export.pynite.js).
 *
 * >>> GEMESSEN (J90/8 m, Wind laengs, gegen PyNite): <<<
 *
 *     Verdrehung des Jochs   1.19089e-2 -> 9.64742e-3  (PyNite 9.65468e-3)
 *     relative Abweichung          23 % -> 0.075 %
 *     Verdrehungen insgesamt      0.228 -> 2.65e-3
 *     Auflagerkraefte           2.50e-3 -> 5.44e-4
 *
 * Fuer einen Link der Laenge NULL ist die neue Fassung mit der alten
 * identisch - S(r) verschwindet dann. Die geschlossenen Loesungen des
 * Abschnitts 111 rechnen mit solchen und bleiben unberuehrt.
 * ========================================================================= */
function kFeder(cs, Larm = 0) {
  /*
   * B in Zeilen: 0..2 die Translationsdifferenz, 3..5 die Verdrehungs-
   * differenz. Spalten: u_i (0..2), fi_i (3..5), u_j (6..8), fi_j (9..11).
   */
  const B = new Float64Array(6 * 12);
  const setz = (z, sp, v) => { B[z * 12 + sp] = v; };
  for (let d = 0; d < 3; d += 1) { setz(d, d, -1); setz(d, d + 6, +1); }
  for (let d = 0; d < 3; d += 1) { setz(d + 3, d + 3, -1); setz(d + 3, d + 9, +1); }
  // S(r) fuer r = (L, 0, 0):  [[0,0,0],[0,0,-L],[0,L,0]]
  setz(1, 5, -Larm);
  setz(2, 4, +Larm);

  const k = new Float64Array(144);
  for (let a = 0; a < 12; a += 1) {
    for (let b = 0; b < 12; b += 1) {
      let sum = 0;
      for (let d = 0; d < 6; d += 1) {
        const c = cs[d];
        if (!c) continue;
        sum += B[d * 12 + a] * c * B[d * 12 + b];
      }
      k[a * 12 + b] = sum;
    }
  }
  return k;
}

/** 12x12 lokal -> global: T^T k T, T blockdiagonal aus vier R. */
function drehen(k, R) {
  const g = new Float64Array(144);
  const tmp = new Float64Array(144);
  for (let i = 0; i < 12; i += 1) {
    for (let bj = 0; bj < 4; bj += 1) {
      for (let c = 0; c < 3; c += 1) {
        let s = 0;
        for (let r = 0; r < 3; r += 1) s += k[i * 12 + bj * 3 + r] * R[r][c];
        tmp[i * 12 + bj * 3 + c] = s;
      }
    }
  }
  for (let j = 0; j < 12; j += 1) {
    for (let bi = 0; bi < 4; bi += 1) {
      for (let c = 0; c < 3; c += 1) {
        let s = 0;
        for (let r = 0; r < 3; r += 1) s += R[r][c] * tmp[(bi * 3 + r) * 12 + j];
        g[(bi * 3 + c) * 12 + j] = s;
      }
    }
  }
  return g;
}

/* ---------------------------------------------------------------------------
 * 3 . Bandbreite verkleinern (Cuthill-McKee, umgekehrt)
 * ------------------------------------------------------------------------- */
function rcm(n, nachbarn) {
  const besucht = new Uint8Array(n);
  const folge = [];
  const grad = nachbarn.map((a) => a.length);
  while (folge.length < n) {
    let start = -1;
    for (let i = 0; i < n; i += 1) {
      if (!besucht[i] && (start < 0 || grad[i] < grad[start])) start = i;
    }
    const q = [start]; besucht[start] = 1;
    for (let p = 0; p < q.length; p += 1) {
      const v = q[p]; folge.push(v);
      const nb = nachbarn[v].filter((x) => !besucht[x]).sort((x, y) => grad[x] - grad[y]);
      nb.forEach((x) => { besucht[x] = 1; q.push(x); });
    }
  }
  return folge.reverse();
}

/* ---------------------------------------------------------------------------
 * 4 . Bandcholesky
 * ------------------------------------------------------------------------- */
/*
 * >>> DIE MATRIX WIRD SKALIERT, BEVOR SIE ZERLEGT WIRD. <<<
 *
 * Gemessen am J90/20 m: die groesste Diagonale ist 1.0e17, die kleinste
 * 5.7e1 - eine Spanne von 1e15, und die Doppelgenauigkeit endet bei 1e16.
 * Die Zerlegung verlor dadurch so viele Stellen, dass das GLEICHGEWICHT um
 * bis zu 46 % danebenlag; bei Faktor 3000 brach sie ganz ab.
 *
 * Die Ursache sind die Starrelemente: ein 11 mm langes Stueck mit dem
 * Ersatzquerschnitt 500 x 500 mm traegt 12EI/L^3 = 1e13 bei, ein Gurtstab
 * 1.2e4 - neun Zehnerpotenzen dazwischen, noch ohne jeden Steifigkeits-
 * faktor.
 *
 * Jacobi-Skalierung nimmt genau diesen Anteil heraus: jede Zeile und
 * Spalte wird durch die Wurzel ihrer Diagonale geteilt, die neue Diagonale
 * ist damit ueberall 1. Die Loesung aendert sich nicht (es ist dieselbe
 * Gleichung), nur ihre Kondition.
 */
function bandSkalieren(n, bw, band) {
  const w = bw + 1;
  const dsc = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    const dd = band[i * w + bw];
    dsc[i] = dd > 0 ? Math.sqrt(dd) : 1;
  }
  for (let i = 0; i < n; i += 1) {
    const j0 = Math.max(0, i - bw);
    for (let j = j0; j <= i; j += 1) {
      band[i * w + (j - i + bw)] /= dsc[i] * dsc[j];
    }
  }
  return dsc;
}

function bandFaktor(n, bw, band, diag, dat, gl, nD) {
  const w = bw + 1;
  let rueck = null;
  if (diag) {
    rueck = new Int32Array(n);
    for (let dof = 0; dof < nD; dof += 1) { if (gl[dof] >= 0) rueck[gl[dof]] = dof; }
  }
  for (let i = 0; i < n; i += 1) {
    const j0 = Math.max(0, i - bw);
    for (let j = j0; j < i; j += 1) {
      let s = band[i * w + (j - i + bw)];
      const k0 = Math.max(j0, j - bw);
      for (let k = k0; k < j; k += 1) {
        s -= band[i * w + (k - i + bw)] * band[j * w + (k - j + bw)];
      }
      band[i * w + (j - i + bw)] = s / band[j * w + bw];
    }
    let s = band[i * w + bw];
    for (let k = j0; k < i; k += 1) s -= band[i * w + (k - i + bw)] ** 2;
    if (s <= 0) {
      let wo = 'Zeile ' + i;
      if (rueck) {
        const NAME = ['ux', 'uy', 'uz', 'fix', 'fiy', 'fiz'];
        const dof = rueck[i];
        wo = dat.knoten[Math.floor(dof / 6)].name + '.' + NAME[dof % 6];
      }
      throw new Error('nicht positiv definit bei ' + wo + ' (' + s + ')');
    }
    band[i * w + bw] = Math.sqrt(s);
  }
}

function bandLoesen(n, bw, band, b) {
  const w = bw + 1;
  const x = Float64Array.from(b);
  for (let i = 0; i < n; i += 1) {
    let s = x[i];
    const j0 = Math.max(0, i - bw);
    for (let j = j0; j < i; j += 1) s -= band[i * w + (j - i + bw)] * x[j];
    x[i] = s / band[i * w + bw];
  }
  for (let i = n - 1; i >= 0; i -= 1) {
    let s = x[i];
    const j1 = Math.min(n - 1, i + bw);
    for (let j = i + 1; j <= j1; j += 1) s -= band[j * w + (i - j + bw)] * x[j];
    x[i] = s / band[i * w + bw];
  }
  return x;
}

/* ---------------------------------------------------------------------------
 * 5 . Der Loeser
 * ------------------------------------------------------------------------- */
/*
 * >>> DAS STARRELEMENT IST EINE ERSATZSTEIFIGKEIT, KEINE ZWANGSBEDINGUNG.
 * <<<
 *
 * Und sie gehoert KLEIN. Das ist der Gegenschluss zur ersten Vermutung -
 * hier stand 1e4, und damit brach die Zerlegung ab («nicht positiv
 * definit»). Gemessen am J90/20 m (852 Knoten, 483 Starrelemente), Wind in
 * Gleisrichtung, Abweichung im Gleichgewicht:
 *
 *      Faktor      1        3       10       30      100     3000
 *      Fehler   4e-8 %   7e-8 %   1e-7 %   8e-4 %  1.2e-2 %  Abbruch
 *      R_y,A   7.12169  7.12169  7.12169  7.12163  7.12086      -
 *
 * Die ANTWORT aendert sich ab Faktor 1 nicht mehr (fuenf gleiche Stellen);
 * groessere Faktoren machen sie nur ungenauer. Der Grund steht bei
 * `bandSkalieren`: ein 11 mm langes Starrelement mit dem Ersatzquerschnitt
 * 500 x 500 mm bringt schon OHNE Faktor neun Zehnerpotenzen mehr
 * Steifigkeit mit als ein Gurtstab.
 *
 * Wer es wirklich starr braucht, muss Starrkoerper als Zwangsbedingung
 * rechnen (Master-Slave) - dann verschwinden diese Freiheitsgrade ganz.
 * Das ist der naechste Schritt, nicht ein groesserer Faktor.
 */
export const STARR_FAKTOR = 10;
/*
 * «Rigid» am Linkelement ist ebenfalls eine Zahl, kein Zwang: 1e9 kN/m
 * bzw. kNm/rad. Gegen die Stabsteifigkeiten des Jochs (1e4 kNm/rad) sind
 * das fuenf Zehnerpotenzen - gemessen bleibt ein Rest von 1e-5 relativ
 * (Pruefstand 111, Linkelement).
 */
export const LINK_STARR = 1e9;

/* ===========================================================================
 * >>> DIE ERDBESCHLEUNIGUNG - HIER, WEIL SIE HIER GEBRAUCHT WIRD. <<<
 *
 * Die Datei traegt die Dichte in kg/m3 (`material.rho`, 7850 für Stahl).
 * Daraus wird eine Laufmeterlast erst mit g.
 *
 * ZUR EINORDNUNG: das PyNite-Skript setzt 78.5 kN/m3 an, also g = 10.0 -
 * die uebliche Rundung der Stahlwichte. Mit 9.81 sind es 77.0 kN/m3. Die
 * beiden liegen 1.9 % auseinander; wer die Ergebnisse vergleicht, muss
 * das wissen. Gerechnet wird hier mit dem physikalischen Wert.
 * ========================================================================= */
export const G_ERDE = 9.81;

/* ===========================================================================
 * >>> DIE SCHUBFLAECHE - ALS EIN BEIWERT, UND WARUM. <<<
 *
 * Die Schubverformung braucht die SCHUBFLAECHE A_s, nicht die
 * Querschnittsflaeche. Sie ist querschnittsabhaengig: beim Rechteck
 * A_s = (5/6) A, beim I-Profil naeherungsweise die Stegflaeche allein.
 *
 * Die Datei fuehrt keine Schubflaeche. Gerechnet wird deshalb mit dem
 * Rechteckwert - so, wie es die PyNite-Ausleitung seit je tut
 * (`SCHUB_KAPPA` in export.pynite.js), damit beide Wege dieselbe Zahl
 * benutzen und der Vergleich etwas misst.
 *
 * >>> WO DAS UNSCHARF IST, IST ES FOLGENLOS. <<<
 *
 * Fuer die BLECHE ist der Wert richtig: sie SIND Rechtecke, und sie sind
 * der Fall, um den es geht (phi 0.19 bis 0.46).
 *
 * Beim I-Profil des Masten waere A_s kleiner - naeherungsweise die
 * Stegflaeche, beim HEB 240 rund ein Drittel von (5/6) A. Dort ist der
 * Beiwert also WIRKLICH UNSCHARF, und zwar messbar: der lange Mastschaft
 * hat phi = 0.0077, mit der schaerferen Schubflaeche waeren es rund
 * 0.023. Das sind 1.5 % seiner Biegesteifigkeit - klein, aber nicht
 * nichts. Eine erste Fassung dieses Kommentars behauptete «die sechste
 * Stelle»; das war geschaetzt und um den Faktor 250 daneben.
 *
 * Wer es genauer braucht, muss die Schubflaeche in die Datei bringen -
 * AxisVM fuehrt sie je Querschnitt. Das ist ein eigener Schritt und
 * steht als offener Punkt.
 * ========================================================================= */
export const SCHUB_KAPPA = 5 / 6;

export function loese(dat, opt = {}) {
  const t0 = Date.now();
  const starrF = opt.starrFaktor ?? STARR_FAKTOR;
  const E0 = dat.material.E * 1000;        // N/mm2 -> kN/m2
  const G0 = dat.material.G * 1000;
  const fSteif = (dat.materialSteif && dat.materialSteif.faktor) || 1000;
  /*
   * Die Schubverformung ist VORGEGEBEN AN (Weisung vom 25. September).
   * Abschaltbar bleibt sie, weil die geschlossenen Loesungen des
   * Pruefstands Euler-Bernoulli sind und genau die Biegematrix messen
   * sollen - mit Schub pruefte man zwei Dinge auf einmal.
   */
  const schubweich = opt.schubweich !== false;

  const idx = new Map();
  dat.knoten.forEach((k, i) => idx.set(k.name, i));
  const nK = dat.knoten.length;
  const nD = nK * 6;

  const qs = new Map();
  dat.querschnitte.forEach((q) => qs.set(q.name, qsWerte(q)));

  /* --- Elemente -------------------------------------------------------- */
  const elemente = dat.staebe.map((s) => {
    const a = dat.knoten[idx.get(s.von)], b = dat.knoten[idx.get(s.bis)];
    if (!a || !b) throw new Error('Stab ' + s.name + ' zeigt ins Leere');
    const db = dreibein(b.x - a.x, b.y - a.y, b.z - a.z, s.lcsZ);
    let k;
    if (s.art === 'link') {
      const ku = s.kraftuebertragung || {};
      const c = ['x', 'y', 'z', 'xx', 'yy', 'zz'].map((d) => {
        if (ku[d] === 'Free') return 0;
        if (typeof ku[d] === 'number') return ku[d];
        return LINK_STARR;
      });
      k = kFeder(c, db.L);
    } else {
      const w = qs.get(s.querschnitt);
      if (!w) throw new Error('Stab ' + s.name + ': Querschnitt ' + s.querschnitt + ' fehlt');
      let E = E0, G = G0;
      if (s.steifesMaterial) { E *= fSteif; G *= fSteif; }
      if (s.art === 'starr') { E = E0 * starrF; G = G0 * starrF; }
      /*
       * Nur echte Staebe schieben. Starrelemente und die steifen
       * Knotenabschnitte sind Kunstgriffe - siehe den Block bei kLokal.
       */
      k = kLokal(E, G, w.A, w.Iy, w.Iz, w.It, db.L,
                 schubweich && (s.art || 'stab') === 'stab');
    }
    return { s, L: db.L, R: db.R, kL: k, kG: drehen(k, db.R),
             i: idx.get(s.von), j: idx.get(s.bis) };
  });

  /* --- Auflager -------------------------------------------------------- */
  const FELD = ['ux', 'uy', 'uz', 'fix', 'fiy', 'fiz'];
  const gehalten = new Uint8Array(nD);
  const federn = [];
  dat.auflager.forEach((a) => {
    const kn = idx.get(a.knoten);
    if (kn === undefined) throw new Error('Auflager ' + a.knoten + ' ohne Knoten');
    FELD.forEach((f, d) => {
      if (a[f] === 'Rigid') gehalten[kn * 6 + d] = 1;
      else if (a[f] === 'Flexible') {
        const c = f === 'fiy' ? a.cFiy_kNm : (f === 'uz' ? a.cUz_kNm : null);
        if (c) federn.push([kn * 6 + d, c]); else gehalten[kn * 6 + d] = 1;
      }
    });
  });

  /* --- Nummerierung, Bandbreite ---------------------------------------- */
  const nachbarn = Array.from({ length: nK }, () => []);
  elemente.forEach((e) => { nachbarn[e.i].push(e.j); nachbarn[e.j].push(e.i); });
  const folge = rcm(nK, nachbarn.map((a) => [...new Set(a)]));

  const gl = new Int32Array(nD).fill(-1);
  let n = 0;
  folge.forEach((kn) => {
    for (let d = 0; d < 6; d += 1) {
      const dof = kn * 6 + d;
      if (!gehalten[dof]) { gl[dof] = n; n += 1; }
    }
  });

  let bw = 0;
  elemente.forEach((e) => {
    let lo = Infinity, hi = -Infinity;
    for (let d = 0; d < 6; d += 1) {
      const p1 = gl[e.i * 6 + d], p2 = gl[e.j * 6 + d];
      if (p1 >= 0) { lo = Math.min(lo, p1); hi = Math.max(hi, p1); }
      if (p2 >= 0) { lo = Math.min(lo, p2); hi = Math.max(hi, p2); }
    }
    if (hi >= lo) bw = Math.max(bw, hi - lo);
  });

  const w = bw + 1;
  const band = new Float64Array(n * w);
  const setz = (r, c, v) => { if (c <= r && r - c <= bw) band[r * w + (c - r + bw)] += v; };
  elemente.forEach((e) => {
    const map = new Int32Array(12);
    for (let d = 0; d < 6; d += 1) { map[d] = gl[e.i * 6 + d]; map[d + 6] = gl[e.j * 6 + d]; }
    for (let p = 0; p < 12; p += 1) {
      const r = map[p]; if (r < 0) continue;
      for (let q = 0; q < 12; q += 1) {
        const c = map[q]; if (c < 0) continue;
        setz(r, c, e.kG[p * 12 + q]);
      }
    }
  });
  federn.forEach((f) => { const r = gl[f[0]]; if (r >= 0) setz(r, r, f[1]); });

  /* --- Diagnose: leere Freiheitsgrade und schwache Diagonale ----------- */
  if (opt.diagnose) {
    const rueck = new Int32Array(n);
    for (let dof = 0; dof < nD; dof += 1) { if (gl[dof] >= 0) rueck[gl[dof]] = dof; }
    const NAME = ['ux', 'uy', 'uz', 'fix', 'fiy', 'fiz'];
    let dmax = 0;
    for (let i = 0; i < n; i += 1) dmax = Math.max(dmax, band[i * w + bw]);
    const schwach = [];
    for (let i = 0; i < n; i += 1) {
      if (band[i * w + bw] < dmax * 1e-13) {
        const dof = rueck[i];
        schwach.push(dat.knoten[Math.floor(dof / 6)].name + '.' + NAME[dof % 6]
          + ' (' + band[i * w + bw].toExponential(2) + ')');
      }
    }
    opt.diagnose.dmax = dmax;
    opt.diagnose.schwach = schwach;
    opt.diagnose.rueck = rueck;
    opt.diagnose.band = band.slice();
    opt.diagnose.gl = gl;
  }

  const tBau = Date.now();
  const dsc = bandSkalieren(n, bw, band);
  bandFaktor(n, bw, band, opt.diagnose || null, dat, gl, nD);
  const tFak = Date.now();

  /* --- Lastvektoren ----------------------------------------------------- */
  const RICHT = { X: 0, Y: 1, Z: 2, Mx: 3, My: 4, Mz: 5 };
  const faelle = dat.lastfaelle.map((l) => l.key);
  const p = new Map(faelle.map((f) => [f, new Float64Array(n)]));
  const pVoll = new Map(faelle.map((f) => [f, new Float64Array(nD)]));
  const setzeLast = (fall, dof, v) => {
    const vek = pVoll.get(fall);
    if (!vek) throw new Error('Last auf unbekanntem Lastfall ' + fall);
    vek[dof] += v;
    const r = gl[dof]; if (r >= 0) p.get(fall)[r] += v;
  };
  (dat.lasten.punkt || []).forEach((l) => {
    const kn = idx.get(l.knoten);
    if (kn === undefined) throw new Error('Last ohne Knoten ' + l.knoten);
    setzeLast(l.lastfall, kn * 6 + RICHT[l.richtung], l.wert);
  });
  (dat.lasten.moment || []).forEach((l) => {
    const kn = idx.get(l.knoten);
    if (kn === undefined) throw new Error('Moment ohne Knoten ' + l.knoten);
    setzeLast(l.lastfall, kn * 6 + RICHT[l.richtung], l.wert);
  });
  const eMap = new Map(elemente.map((e) => [e.s.name, e]));
  const streckeAuf = [];

  /* =======================================================================
   * >>> DAS EIGENGEWICHT STEHT NICHT IN DER DATEI - ES MUSS HIER ENTSTEHEN.
   * =====================================================================
   *
   * Gefunden am 24. September beim Vergleich gegen PyNite: im Lastfall G
   * stand ueberall u = 0.
   *
   * Der Grund ist kein Fehler der Ausleitung. Sie schreibt fuer AxisVM,
   * und AXISVM ERZEUGT DAS EIGENGEWICHT SELBST aus Wichte und Querschnitt
   * (`Loads.AddBeamSelfWeight` je Stab); die Datei traegt deshalb nur den
   * ZUSCHLAG fuer das, was in keinem Stab steckt (`gZusatz` in
   * export.axisvm.js). Wer diese Datei liest und rechnet, ist in der
   * Rolle von AxisVM - und muss dasselbe tun.
   *
   * >>> DIE REGEL IST DIE DER BRUECKE, WORTWOERTLICH. <<<
   *
   * `AxisVM_aufbauen.ps1` sagt: «StabArt -ne 'stab' -> continue. Ein
   * Starrkoerper bekommt keins: er ist kein Stabelement, und sein
   * Ersatzquerschnitt waere ohnehin frei erfunden.» Genau daran haengt
   * mehr als eine Feinheit: der Ersatzquerschnitt eines Starrelements
   * misst 500 x 500 mm, und ihn mitzuwiegen machte aus einem Joch von
   * 4.7 kN eines von 33 t - der Fehler, der am 20. September im
   * Blattmodell steckte.
   *
   * Abschaltbar ueber `opt.eigengewicht: false` - dann traegt es die
   * Lastliste bei (so misst `vergleich_stabwerk.mjs` gegen PyNite, das
   * seinerseits nur die Laufmeterlast des Jochs kennt und den Masten gar
   * kein Eigengewicht gibt).
   * ===================================================================== */
  const eigenLasten = [];
  if (opt.eigengewicht !== false) {
    const rho = Number(dat.material?.rho);
    // Der Lastfall der staendigen Einwirkung - wie in der Bruecke lf['G'].
    const fallG = (dat.lastfaelle.find((l) => l.key === 'G')
                   ?? dat.lastfaelle[0])?.key;
    if (rho > 0 && fallG) {
      dat.staebe.forEach((st) => {
        if ((st.art || 'stab') !== 'stab') return;
        const qq = qs.get(st.querschnitt);
        if (!qq) return;
        // A in m2, rho in kg/m3, g in m/s2 -> N/m, durch 1000 -> kN/m.
        const q = (qq.A * rho * G_ERDE) / 1000;
        if (!(q > 0)) return;
        // Lotrecht nach unten, global.
        eigenLasten.push({ stab: st.name, richtung: 'Z', wert: -q,
                           lastfall: fallG });
      });
    }
  }

  [...(dat.lasten.strecke || []), ...eigenLasten].forEach((l) => {
    const e = eMap.get(l.stab);
    if (!e) throw new Error('Streckenlast ohne Stab ' + l.stab);
    const gv = [0, 0, 0]; gv[RICHT[l.richtung]] = l.wert;      // kN/m, global
    const q = [0, 1, 2].map((r) => e.R[r][0] * gv[0] + e.R[r][1] * gv[1] + e.R[r][2] * gv[2]);
    const L = e.L;
    const f = new Float64Array(12);
    f[0] = (q[0] * L) / 2; f[6] = (q[0] * L) / 2;
    f[1] = (q[1] * L) / 2; f[7] = (q[1] * L) / 2;
    f[2] = (q[2] * L) / 2; f[8] = (q[2] * L) / 2;
    f[5] = (q[1] * L * L) / 12; f[11] = -(q[1] * L * L) / 12;
    f[4] = -(q[2] * L * L) / 12; f[10] = (q[2] * L * L) / 12;
    const fg = new Float64Array(12);
    for (let b = 0; b < 4; b += 1) {
      for (let c = 0; c < 3; c += 1) {
        let s = 0;
        for (let r = 0; r < 3; r += 1) s += e.R[r][c] * f[b * 3 + r];
        fg[b * 3 + c] = s;
      }
    }
    for (let d = 0; d < 6; d += 1) {
      setzeLast(l.lastfall, e.i * 6 + d, fg[d]);
      setzeLast(l.lastfall, e.j * 6 + d, fg[d + 6]);
    }
    streckeAuf.push({ e, fall: l.lastfall, fLokal: f });
  });

  /* --- Loesen ----------------------------------------------------------- */
  /*
   * >>> K MAL U, AUS DEN ELEMENTEN - ohne die Matrix ein zweites Mal
   * abzulegen. <<<
   *
   * Gebraucht fuer die Nachiteration unten: sie braucht die
   * UNVERAENDERTE Steifigkeit, und die Bandmatrix ist nach der Zerlegung
   * ueberschrieben. Eine Kopie waere bei 12 000 Freiheitsgraden und
   * Bandbreite 600 rund 57 MB; die Elementschleife kostet nichts.
   */
  const kMal = (xFrei) => {
    const uv = new Float64Array(nD);
    for (let d = 0; d < nD; d += 1) { if (gl[d] >= 0) uv[d] = xFrei[gl[d]]; }
    const r = new Float64Array(nD);
    elemente.forEach((e) => {
      const ug = new Float64Array(12);
      for (let d = 0; d < 6; d += 1) { ug[d] = uv[e.i * 6 + d]; ug[d + 6] = uv[e.j * 6 + d]; }
      for (let a = 0; a < 12; a += 1) {
        let sm = 0;
        for (let b = 0; b < 12; b += 1) sm += e.kG[a * 12 + b] * ug[b];
        r[a < 6 ? e.i * 6 + a : e.j * 6 + (a - 6)] += sm;
      }
    });
    federn.forEach((fe) => { r[fe[0]] += fe[1] * uv[fe[0]]; });
    const aus = new Float64Array(n);
    for (let d = 0; d < nD; d += 1) { if (gl[d] >= 0) aus[gl[d]] = r[d]; }
    return aus;
  };

  /** Ein Loesungsschritt mit der skalierten Matrix. */
  const schritt = (rechts) => {
    const rS = new Float64Array(n);
    for (let i = 0; i < n; i += 1) rS[i] = rechts[i] / dsc[i];
    const xS = bandLoesen(n, bw, band, rS);
    const x = new Float64Array(n);
    for (let i = 0; i < n; i += 1) x[i] = xS[i] / dsc[i];
    return x;
  };

  /*
   * >>> NACHITERATION (20. September). <<<
   *
   * Gemessen am J90/20 m: die Zerlegung allein liess einen Rest von
   * 4e-4 kN stehen (Starrelemente ohne Faktor) bis 0.19 kN (Faktor 1000) -
   * bei Stabkraeften um 40 kN also bis zu 0.5 %. Das ist kein Modell-, es
   * ist ein Stellenverlust: 11 mm lange Starrelemente mit dem
   * Ersatzquerschnitt 500 x 500 mm bringen neun Zehnerpotenzen mehr
   * Steifigkeit mit als ein Gurtstab.
   *
   * Die Nachiteration holt die Stellen zurueck, ohne die Zerlegung zu
   * wiederholen: sie loest den REST mit derselben Zerlegung und addiert
   * die Verbesserung auf. Zwei, drei Durchgaenge genuegen - jeder kostet
   * nur ein Vor- und Rueckwaertseinsetzen.
   */
  const NACH = opt.nachiteration ?? 3;
  const u = new Map();
  const restGross = new Map();
  faelle.forEach((f) => {
    const pf = p.get(f);
    const x = schritt(pf);
    let gross = 0;
    for (let k = 0; k < NACH; k += 1) {
      const kx = kMal(x);
      const rest = new Float64Array(n);
      gross = 0;
      for (let i = 0; i < n; i += 1) {
        rest[i] = pf[i] - kx[i];
        if (Math.abs(rest[i]) > gross) gross = Math.abs(rest[i]);
      }
      if (gross === 0) break;
      const dx = schritt(rest);
      for (let i = 0; i < n; i += 1) x[i] += dx[i];
    }
    restGross.set(f, gross);
    const uv = new Float64Array(nD);
    for (let d = 0; d < nD; d += 1) { if (gl[d] >= 0) uv[d] = x[gl[d]]; }
    u.set(f, uv);
  });
  const tLoes = Date.now();

  /* --- Auswertung -------------------------------------------------------- */
  const stabkraft = (fall) => {
    const uv = u.get(fall);
    const out = new Map();
    elemente.forEach((e) => {
      const ug = new Float64Array(12);
      for (let d = 0; d < 6; d += 1) { ug[d] = uv[e.i * 6 + d]; ug[d + 6] = uv[e.j * 6 + d]; }
      const ul = new Float64Array(12);
      for (let b = 0; b < 4; b += 1) {
        for (let r = 0; r < 3; r += 1) {
          let s = 0;
          for (let c = 0; c < 3; c += 1) s += e.R[r][c] * ug[b * 3 + c];
          ul[b * 3 + r] = s;
        }
      }
      const f = new Float64Array(12);
      for (let r = 0; r < 12; r += 1) {
        let s = 0;
        for (let c = 0; c < 12; c += 1) s += e.kL[r * 12 + c] * ul[c];
        f[r] = s;
      }
      out.set(e.s.name, f);
    });
    streckeAuf.filter((x) => x.fall === fall).forEach((x) => {
      const f = out.get(x.e.s.name);
      for (let r = 0; r < 12; r += 1) f[r] -= x.fLokal[r];
    });
    return out;
  };

  const auflagerkraefte = (fall) => {
    const uv = u.get(fall);
    const r = new Float64Array(nD);
    elemente.forEach((e) => {
      const ug = new Float64Array(12);
      for (let d = 0; d < 6; d += 1) { ug[d] = uv[e.i * 6 + d]; ug[d + 6] = uv[e.j * 6 + d]; }
      for (let a = 0; a < 12; a += 1) {
        let s = 0;
        for (let b = 0; b < 12; b += 1) s += e.kG[a * 12 + b] * ug[b];
        const dof = a < 6 ? e.i * 6 + a : e.j * 6 + (a - 6);
        r[dof] += s;
      }
    });
    federn.forEach((f) => { r[f[0]] += f[1] * uv[f[0]]; });
    const pv = pVoll.get(fall);
    return dat.auflager.map((a) => {
      const kn = idx.get(a.knoten);
      const v = { knoten: a.knoten };
      FELD.forEach((f2, d) => { v[f2] = r[kn * 6 + d] - pv[kn * 6 + d]; });
      return v;
    });
  };

  /*
   * DER REST DER GLEICHUNG: K*u - p ueber die FREIEN Freiheitsgrade. Er
   * muss null sein - was dort steht, hat die Zerlegung verloren. Trennt
   * einen Loesungsfehler von einem Auswertungsfehler.
   */
  const restkraft = (fall) => {
    const uv = u.get(fall);
    const r = new Float64Array(nD);
    elemente.forEach((e) => {
      const ug = new Float64Array(12);
      for (let dd = 0; dd < 6; dd += 1) { ug[dd] = uv[e.i * 6 + dd]; ug[dd + 6] = uv[e.j * 6 + dd]; }
      for (let a = 0; a < 12; a += 1) {
        let sm = 0;
        for (let b = 0; b < 12; b += 1) sm += e.kG[a * 12 + b] * ug[b];
        r[a < 6 ? e.i * 6 + a : e.j * 6 + (a - 6)] += sm;
      }
    });
    federn.forEach((f) => { r[f[0]] += f[1] * uv[f[0]]; });
    const pv = pVoll.get(fall);
    let gross = 0; let wo = '';
    let bezug = 0;
    for (let dof = 0; dof < nD; dof += 1) {
      bezug = Math.max(bezug, Math.abs(r[dof]));
      if (gl[dof] < 0) continue;
      const rest = Math.abs(r[dof] - pv[dof]);
      if (rest > gross) {
        gross = rest;
        wo = dat.knoten[Math.floor(dof / 6)].name + '.'
           + ['ux', 'uy', 'uz', 'fix', 'fiy', 'fiz'][dof % 6];
      }
    }
    return { gross, wo, bezug };
  };

  /*
   * WAS AN EIGENGEWICHT ANGESETZT WURDE - als Zahl, nicht als Zusage.
   * Wer ein Ergebnis liest, soll nachsehen koennen, ob das Tragwerk sein
   * eigenes Gewicht traegt.
   */
  const eigengewicht = eigenLasten.reduce((sum, l) => {
    const e = eMap.get(l.stab);
    return sum + (e ? Math.abs(l.wert) * e.L : 0);
  }, 0);

  return { n, bw, nK, knotenIdx: idx, faelle, u, stabkraft, auflagerkraefte,
           restkraft, restNachIteration: restGross,
           eigengewicht, eigenLasten: eigenLasten.length, schubweich,
           lastVoll: pVoll, elemente,
           zeit: { bau: tBau - t0, faktor: tFak - tBau, loesen: tLoes - tFak,
                   gesamt: tLoes - t0 } };
}
