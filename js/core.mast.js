/**
 * core.mast.js
 * ---------------------------------------------------------------------------
 * DER MAST ALS TRAGWERK: Schnittgrössen über seine Höhe und der
 * Querschnittsnachweis. Reine Funktionen, kein DOM.
 *
 * WARUM ES DIESE DATEI GIBT
 * Der Mast war lange nur eine Randbedingung — eine Drehfeder am Jochende. Er
 * ist seither Teil des Modells: er steht als Körper im Bild, als Stab in der
 * Ausleitung, er trägt Wind und Anbauteile. Nachgewiesen wurde er trotzdem
 * nicht; die Nachweisgruppe «Mast» stand mit *nicht vorhanden* da, und die
 * Fusszeile sagte es ehrlich.
 *
 * >>> WEISUNG DES AUFTRAGGEBERS, 28. August, auf ausdrückliche Nachfrage: <<<
 *   · Nachweis: Querschnitt ELASTISCH, «aber auch plastischen Widerstand
 *     optional auswählbar machen».
 *   · Schnittgrössen: «aus dem Ersatzbalken, jetzt» — nicht erst nach dem
 *     Zurücklesen aus AxisVM.
 *
 * ================== WAS HIER GERECHNET WIRD, UND WAS NICHT =================
 *
 * GERECHNET: Normalkraft, zwei Querkräfte, zwei Biegemomente und die Torsion
 * über die Masthöhe, aus allem, was der Ersatzbalken kennt — Auflagerreaktion
 * des Jochs, Einspannmoment, Jochtorsion, Wind auf den Masten, Anbauteile am
 * Masten mit ihren wahren Hebelarmen, Eigengewicht des Mastes.
 *
 * NICHT GERECHNET: Stabilität. Kein Biegeknicken, kein Biegedrillknicken.
 * Das ist ein Bauteilnachweis nach EN 1993-1-1, 6.3, und er braucht eine
 * Festlegung der Knicklänge, die der Auftraggeber trifft und nicht dieses
 * Werkzeug. Bei einem schlanken Kragmast kann er massgebend werden — der
 * Nachweis sagt das, statt es zu verschweigen.
 *
 * Ebensowenig geht die TORSION in die Ausnutzung ein. Sie wird ausgewiesen,
 * weil der Fundamentplaner sie braucht; ein Wölbkrafttorsionsnachweis am
 * offenen I-Profil ist ein eigenes Kapitel.
 *
 * ============================ DIE ZWEI EBENEN =============================
 *
 * Der Mast biegt sich in zwei Ebenen, und welche davon die STARKE ist, hängt
 * an der Stegrichtung:
 *
 *   «quer»   — die Ebene der Jochachse (globales x). Hierhin drückt der Wind
 *              quer zum Gleis, hier zieht die Umlenkkraft, und hier steht das
 *              Einspannmoment des Jochs.
 *   «längs»  — die Ebene der Gleisrichtung (globales y). Hierhin drückt der
 *              Wind auf das Joch.
 *
 * Steht der Steg in der Jochachse, liegt die Profilhöhe h quer zum Gleis und
 * damit die starke Achse in der Ebene «quer». Gedreht ist es umgekehrt.
 * `mastSteifigkeit` (core.auflager.js) führt beide Achsen bereits mit; von
 * dort kommen I, W und ihre Gegenstücke.
 *
 * ===================== PLASTISCH: WOHER W_pl KOMMT ========================
 *
 * Die Mastprofiltabelle führt nur ELASTISCHE Werte — A, I, W, i, I_t. W_pl
 * steht nicht darin. Eine Zahl aus dem Gedächtnis in eine Nachweistabelle zu
 * schreiben verstiesse gegen die stehende Regel «massgebend sind die Daten».
 *
 * Gerechnet wird deshalb aus der GEOMETRIE des idealisierten I-Profils, ohne
 * Ausrundung zwischen Steg und Flansch:
 *
 *      W_pl,y = t_w·(h − 2t_f)²/4 + b·t_f·(h − t_f)
 *      W_pl,z = t_f·b²/2 + (h − 2t_f)·t_w²/4
 *
 * Das UNTERSCHÄTZT den Tabellenwert — die Ausrundung liegt nahe an der
 * Schwerachse und trägt zum plastischen Moment bei, sie fehlt hier. Die
 * Abweichung geht damit auf die sichere Seite; sie beträgt bei den geführten
 * Profilen zwei bis vier Prozent. Wer den Tabellenwert will, trägt ihn in die
 * Profiltabelle ein — dann gilt er, und diese Näherung tritt zurück.
 *
 * >>> UND PLASTISCH GILT NUR BEI KLASSE 1 ODER 2. <<< Das ist keine Wahl,
 * sondern EN 1993-1-1: ein Querschnitt der Klasse 3 erreicht die
 * Fliessgelenkschnittgrösse nicht. Der Schalter wird deshalb wirkungslos,
 * wenn die Klasse es nicht hergibt — und der Nachweis sagt, warum.
 * ---------------------------------------------------------------------------
 */

import { mastSteifigkeit } from './core.auflager.js';

/** Erdbeschleunigung für das Eigengewicht des Mastes [m/s²]. */
const G_ERD = 9.81;

/**
 * PLASTISCHE WIDERSTANDSMOMENTE aus der Geometrie [cm³].
 *
 * Ohne Ausrundung, also auf der sicheren Seite (siehe Dateikopf). Führt die
 * Profiltabelle eigene Werte (`Wply`, `Wplz`), gelten DIESE — die Daten
 * schlagen die Herleitung.
 */
export function plastischeWiderstaende(p) {
  if (Number.isFinite(p?.Wply) && Number.isFinite(p?.Wplz)) {
    return { Wply: p.Wply, Wplz: p.Wplz, quelle: 'tabelle' };
  }
  const h = p.h, b = p.b, tw = p.tw, tf = p.tf;    // mm
  const hs = h - 2 * tf;                            // lichte Steghöhe
  const Wply = (tw * hs * hs) / 4 + b * tf * (h - tf);
  const Wplz = (tf * b * b) / 2 + (hs * tw * tw) / 4;
  return { Wply: Wply / 1000, Wplz: Wplz / 1000, quelle: 'geometrie' };
}

/**
 * QUERSCHNITTSKLASSE des Mastprofils - konservativ.
 *
 * c/t ohne Ausrundungsradius: c wird damit ZU GROSS und die Klasse
 * ungünstiger als in der Profiltabelle. Auch das ist die sichere Seite, und
 * es braucht keine Zahl, die nicht dasteht.
 *
 * Gewalzte I-Profile der geführten Reihe sind unter Biegung durchweg Klasse
 * 1; erst hohe Normalkraft schiebt den Steg in eine höhere Klasse. Deshalb
 * geht die Ausnutzung durch Normalkraft `alphaN` ein.
 *
 * @param {object} p   Mastprofil
 * @param {number} fy  Streckgrenze [N/mm²]
 * @param {number} nEd Normalkraft [kN], Druck positiv
 */
export function mastKlasse(p, fy, nEd = 0) {
  const eps = Math.sqrt(235 / fy);
  // Flansch, einseitig gestützt (EN 1993-1-1, Tab. 5.2, Blatt 2)
  const cF = (p.b - p.tw) / 2;
  const ctF = cF / p.tf;
  const klF = ctF <= 9 * eps ? 1 : ctF <= 10 * eps ? 2 : ctF <= 14 * eps ? 3 : 4;
  // Steg, beidseitig gestützt, Druck und Biegung (Tab. 5.2, Blatt 1).
  // alpha ist der gedrückte Anteil der Steghöhe; ohne Normalkraft 0.5.
  const hs = p.h - 2 * p.tf;
  const ctS = hs / p.tw;
  const nDruck = Math.max(0, nEd);
  const alpha = Math.min(1, 0.5 + (nDruck * 1000) / (2 * hs * p.tw * fy));
  const gr1 = alpha > 0.5 ? (396 * eps) / (13 * alpha - 1) : (36 * eps) / alpha;
  const gr2 = alpha > 0.5 ? (456 * eps) / (13 * alpha - 1) : (41.5 * eps) / alpha;
  const klS = ctS <= gr1 ? 1 : ctS <= gr2 ? 2 : ctS <= 42 * eps ? 3 : 4;
  return {
    klasse: Math.max(klF, klS),
    flansch: { ct: ctF, klasse: klF, grenze: 9 * eps },
    steg: { ct: ctS, klasse: klS, alpha, grenze: gr1 },
    eps,
  };
}

/**
 * WAS AM MASTEN ANGREIFT - je Höhe über Fundament.
 *
 * Alle Werte sind BEMESSUNGSWERTE des gewählten Lastfalls: sie kommen aus dem
 * gerechneten Modell, das die Beiwerte schon trägt. Ein zweiter Satz Beiwerte
 * an dieser Stelle wäre eine zweite Wahrheit.
 *
 * VORZEICHEN
 *   Fz  positiv = Druck in den Masten (Last nach unten)
 *   Fx  in Jochachse, Fy in Gleisrichtung, beide global
 *   Mq  Moment in der Ebene «quer» (aus Kräften in x)
 *   Ml  Moment in der Ebene «längs» (aus Kräften in y)
 *
 * @returns {{H:number, zKopf:number, lasten:object[], wQuer:number, wLaengs:number}}
 */
export function mastLasten(m, ende = 'A') {
  const md = (ende === 'B' ? m.federn?.mastB : m.federn?.mastA) ?? m.federn?.mast;
  if (!md) return null;
  const H = md.H;
  const zKopf = md.ueberstand > 0 ? md.laenge : H;
  const L = m.L;
  const seite = ende === 'A' ? 'A' : 'B';

  // --- Was das Joch abgibt, am Anschluss auf der Höhe H --------------------
  /*
   * DIESELBEN FORMELN WIE IM AUFLAGERBLATT (core.vierendeel.js), nur mit den
   * Werten des AKTIVEN Lastfalls statt gruppenweise. Zwei Wege zu derselben
   * Reaktion waeren zwei Gelegenheiten, sich zu irren.
   */
  const hQuer = (p) => (seite === 'A' ? (L - p.x) / L : p.x / L);
  const Fz = seite === 'A' ? (m.RA ?? 0) : (m.RB ?? 0);
  const Fy = ((m.wd ?? 0) * L) / 2
           + (m.H ?? []).reduce((a, p) => a + p.w * hQuer(p), 0);
  const Mq = seite === 'A' ? (m.MA ?? 0) : (m.MB ?? 0);
  const Ml = (m.T ?? []).reduce((a, t) => a + t.w * hQuer(t), 0);

  /*
   * DIE LÄNGSKRAFT DES JOCHS TEILT SICH NACH DER STEIFIGKEIT (Weisung).
   *
   * F_x wirkt IN der Jochachse - Umlenkkraft aus dem Bogen und Wind quer zum
   * Gleis. Das Joch gibt sie an beide Mastköpfe ab, und wie viel wohin geht,
   * entscheidet die Steifigkeit der beiden Kragmaste:
   *
   *      k = 3·E·I / H³
   *
   * Das Auflagerblatt weist sie bis heute nur als SUMME aus, mit dem Vermerk
   * «hängt von deren Steifigkeit ab und ist hier nicht modelliert». Für den
   * Mastnachweis genügt das nicht: die Kraft steht am Fuss mit dem Hebelarm H.
   */
  const kVon = (e) => {
    const d = (e === 'B' ? m.federn?.mastB : m.federn?.mastA) ?? m.federn?.mast;
    return d && d.H > 0 ? d.I / (d.H * d.H * d.H) : 0;
  };
  const kA = kVon('A'), kB = kVon('B');
  const kSum = kA + kB;
  const anteil = kSum > 0 ? (seite === 'A' ? kA : kB) / kSum : 0.5;
  const Fx = (m.N ?? []).reduce((a, n) => a + n.w, 0) * anteil;

  const lasten = [{
    art: 'joch', name: `Joch, Anschluss Ende ${seite}`, z: H,
    Fz, Fx, Fy, Mq, Ml, ex: 0, ey: 0,
  }];

  // --- Eigengewicht des Mastes --------------------------------------------
  /*
   * Es fehlte bisher ganz: der Mast trug im Ersatzbalken nichts, weil er dort
   * kein Bauteil ist. Am Fuss sind es bei einem HEB 260 ueber 12.5 m rund
   * 11 kN - nicht viel gegen die Jochlast, aber es gehoert dazu, und es geht
   * mit demselben Beiwert wie jedes andere staendige Gewicht.
   */
  const gk = (md.profil.g * G_ERD) / 1000;         // kg/m -> kN/m
  const gd = gk * (m.beiwerte?.G ?? 1);

  // --- Wind auf den Masten -------------------------------------------------
  const w = m.mastLast?.[seite];
  const wQuer = w?.xd ?? 0;
  const wLaengs = w?.yd ?? 0;

  // --- Anbauteile am Masten ------------------------------------------------
  /*
   * MIT IHREN WAHREN HEBELARMEN. Eine Traverse steht seitlich aus dem Masten
   * heraus; ihre Vertikallast erzeugt am Fuss ein Moment, das mit der
   * AUSLADUNG geht und nicht mit der Höhe. Genau daran hing dieser Nachweis,
   * seit die Mastfussreaktionen zum ersten Mal verlangt wurden.
   */
  (m.anbauMastFlach ?? []).forEach((t) => {
    if ((t.ort === 'mastB' ? 'B' : 'A') !== seite) return;
    const k = Object.values(t.proGruppe ?? {}).reduce((s, q) => ({
      Fx: s.Fx + (q.Fx ?? 0), Fy: s.Fy + (q.Fy ?? 0), Fz: s.Fz + (q.Fz ?? 0),
      Myy: s.Myy + (q.Myy ?? 0), Mzz: s.Mzz + (q.Mzz ?? 0),
    }), { Fx: 0, Fy: 0, Fz: 0, Myy: 0, Mzz: 0 });
    if (!k.Fx && !k.Fy && !k.Fz && !k.Myy && !k.Mzz) return;
    lasten.push({
      art: 'anbau', name: t.name, z: (t.hMast ?? 0) + (t.z ?? 0),
      Fz: k.Fz, Fx: k.Fx, Fy: k.Fy, Mq: k.Myy, Ml: k.Mzz,
      ex: t.x ?? 0, ey: t.y ?? 0,
    });
  });

  return { H, zKopf, gd, wQuer, wLaengs, lasten, anteilFx: anteil,
           profil: md.profil, stegrichtung: md.stegrichtung,
           I: md.I, Iq: md.Iq, W: md.W_cm3, Wq: md.Wq_cm3 };
}

/**
 * SCHNITTGRÖSSEN ÜBER DIE MASTHÖHE.
 *
 * Kragarm, am Fuss eingespannt: an jeder Stelle z zählt, was DARÜBER liegt.
 * Stationen sind der Fuss, jede Anbauhöhe, der Jochanschluss und der Kopf -
 * dort, wo sich die Schnittgrössen sprunghaft ändern, und nur dort.
 *
 * Ausgewiesen wird an jeder Station der Wert UNMITTELBAR DARUNTER: dort ist
 * er der grössere, und dort wird nachgewiesen.
 */
/**
 * Abstand der Zwischenstellen am Masten [m].
 *
 * Nur fuer die Darstellung (Weisung, 1. September: rund einen halben Meter):
 * an einem 9 m langen Mast ergibt das 18 Abschnitte. Genug fuer einen
 * lesbaren Verlauf, und wenig genug, dass die Zeichnung nicht aus lauter
 * Kanten besteht.
 *
 * Fuer den NACHWEIS aendert der Wert nichts: Fuss, Jochachse, Kopf und jede
 * Anbauhoehe stehen ohnehin in der Liste, und dazwischen laufen N, V und M
 * stetig - eine Zwischenstelle kann die massgebende Station bestaetigen,
 * nie unterbieten.
 */
export const MAST_SCHRITT = 0.5;

export function mastSchnitt(m, ende = 'A') {
  const g = mastLasten(m, ende);
  if (!g) return null;
  const { H, zKopf, gd, wQuer, wLaengs, lasten } = g;

  /*
   * WO GERECHNET WIRD.
   *
   * Zwingend sind Fuss, Jochachse, Kopf und jede Anbauhoehe - dort springt
   * etwas. Fuer den NACHWEIS genuegt das: die groesste Ausnutzung liegt an
   * einer dieser Stellen, denn zwischen ihnen laufen N, V und M stetig.
   *
   * Fuer die DARSTELLUNG genuegt es nicht (Weisung, 1. September: sichtbar
   * machen, wie die Ausnutzung zum Fuss hin waechst und bei Teileinspannung
   * zum Joch hin wieder zunimmt). Ein Mast mit drei Stationen ergibt drei
   * Farbstufen, und der Verlauf dazwischen bleibt Behauptung.
   *
   * Deshalb Zwischenstellen alle MAST_SCHRITT Meter. Sie kosten nichts - die
   * Schnittgroessen folgen einer geschlossenen Formel - und sie aendern am
   * Nachweis nichts: eine zusaetzliche Stelle kann die massgebende nur
   * bestaetigen, nie unterbieten.
   */
  const stellen = new Set([0, H, zKopf]);
  lasten.forEach((l) => { if (l.z >= 0 && l.z <= zKopf + 1e-9) stellen.add(l.z); });
  for (let z = MAST_SCHRITT; z < zKopf - 1e-9; z += MAST_SCHRITT) {
    stellen.add(Math.round(z * 1e6) / 1e6);
  }
  const zs = [...stellen].filter((z) => z >= -1e-9 && z <= zKopf + 1e-9)
    .sort((a, b) => a - b);

  const stationen = zs.map((z) => {
    // Streckenlasten oberhalb z
    const dz = Math.max(0, zKopf - z);
    let N = gd * dz;
    let Vq = wQuer * dz;
    let Vl = wLaengs * dz;
    let Mq = (wQuer * dz * dz) / 2;
    let Ml = (wLaengs * dz * dz) / 2;
    let Mt = 0;
    lasten.forEach((l) => {
      if (l.z < z - 1e-9) return;                  // liegt unterhalb
      const arm = l.z - z;
      N += l.Fz;
      Vq += l.Fx;
      Vl += l.Fy;
      /*
       * ZWEI ANTEILE JE MOMENT: die Horizontalkraft ueber die HOEHE und die
       * Vertikalkraft ueber die AUSLADUNG. Der zweite fehlte, solange die
       * Anbauteile am Masten ohne Hebelarm gefuehrt wurden - und er ist bei
       * einer Traverse der groessere von beiden.
       */
      Mq += l.Fx * arm + l.Fz * l.ex + l.Mq;
      Ml += l.Fy * arm + l.Fz * l.ey + l.Ml;
      // Torsion um die Mastachse: Querkraft mal Versatz quer dazu.
      Mt += l.Fx * l.ey - l.Fy * l.ex;
    });
    return { z, N, Vq, Vl, Mq, Ml, Mt };
  });

  return { ...g, stationen };
}

/**
 * DER NACHWEIS.
 *
 * Elastisch:  σ = N/A + M_q/W_q + M_l/W_l ≤ f_yd, die drei Anteile als
 *             Beträge addiert. Das ist der ungünstigste Eckpunkt eines
 *             I-Querschnitts und braucht keine Annahme über die Lage des
 *             Maximums.
 *
 * Plastisch:  dieselbe lineare Interaktion, aber mit W_pl:
 *
 *                  η = N/N_pl + M_q/M_pl,q + M_l/M_pl,l
 *
 *             Das ist KONSERVATIV gegenüber der vollen Interaktion nach
 *             EN 1993-1-1, 6.2.9 (dort darf die Normalkraft bis zu einer
 *             Schwelle unberücksichtigt bleiben, und die Exponenten sind
 *             grösser als eins). Die volle Interaktion braucht Beiwerte, die
 *             der Auftraggeber festlegt; die lineare braucht keine.
 *
 * >>> PLASTISCH NUR BEI KLASSE 1 ODER 2. <<< Sonst gilt elastisch, und das
 * Ergebnis sagt es (`plastischWirksam: false`).
 */
export function mastNachweis(m, ende = 'A', o = {}) {
  const s = mastSchnitt(m, ende);
  if (!s) return null;
  const fy = m.stahl?.fy ?? 235;
  const fyd = fy / (m.gammaM0 ?? 1);
  const A = s.profil.A;                              // cm²
  const gewuenschtPlastisch = o.plastisch === true;

  const nMax = Math.max(...s.stationen.map((st) => Math.abs(st.N)));
  const kl = mastKlasse(s.profil, fy, nMax);
  const plWerte = plastischeWiderstaende(s.profil);
  const plastischWirksam = gewuenschtPlastisch && kl.klasse <= 2;

  // Widerstandsmomente der beiden Ebenen [cm³]. `W` gehört zur Ebene «quer».
  const stegQuer = s.stegrichtung?.achse === 'y';
  const Wq = plastischWirksam
    ? (stegQuer ? plWerte.Wply : plWerte.Wplz) : s.W;
  const Wl = plastischWirksam
    ? (stegQuer ? plWerte.Wplz : plWerte.Wply) : s.Wq;

  const stationen = s.stationen.map((st) => {
    // kN, kNm, cm², cm³ -> N/mm²
    const sigN = (Math.abs(st.N) * 10) / A;
    const sigQ = (Math.abs(st.Mq) * 1000) / Wq;
    const sigL = (Math.abs(st.Ml) * 1000) / Wl;
    const sig = sigN + sigQ + sigL;
    return { ...st, sigN, sigQ, sigL, sig, eta: sig / fyd };
  });

  const massgebend = stationen.reduce((a, b) => (b.eta > a.eta ? b : a),
                                      stationen[0]);
  return {
    ende, ...s, stationen, massgebend, eta: massgebend.eta,
    fy, fyd, A, Wq, Wl, klasse: kl, plastisch: plWerte,
    plastischGewuenscht: gewuenschtPlastisch, plastischWirksam,
  };
}

/**
 * Beide Masten auf einmal - oder null, wenn keiner im Modell steht.
 *
 * Es gibt nichts nachzuweisen, solange das Auflagermodell keinen Masten
 * führt: die übrigen enden am Lager. Ein η für ein Bauteil, das nicht
 * gerechnet wird, wäre eine Behauptung.
 */
export function mastNachweise(m, o = {}) {
  if (!m?.federn?.mast && !m?.federn?.mastA) return null;
  const A = mastNachweis(m, 'A', o);
  const B = mastNachweis(m, 'B', o);
  if (!A && !B) return null;
  const beide = [A, B].filter(Boolean);
  return {
    A, B,
    eta: Math.max(...beide.map((x) => x.eta)),
    massgebendesEnde: beide.reduce((a, b) => (b.eta > a.eta ? b : a)).ende,
  };
}
