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
           /*
            * DIE GESAMTLAENGE WANDERT MIT.
            *
            * Sie fehlte hier, und der Stabilitaetsnachweis rechnete
            * deshalb mit H - der Hoehe bis zur Jochachse. Ueber dem
            * Anschluss laeuft der Mast aber weiter, und dieser Teil knickt
            * mit: an einem 12-m-Masten mit H = 9 waere die Knicklaenge um
            * sechs Meter zu kurz gewesen, und chi entsprechend zu gross.
            */
           laenge: md.laenge, ueberstand: md.ueberstand,
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
/* ===========================================================================
 * BIEGEKNICKEN DES MASTES — EN 1993-1-1, 6.3
 *
 * Weisung vom 2. September: «nimm noch die stabilitätsnachweis mit ein in die
 * app, damit der hinweis nicht mehr erscheint.»
 *
 * Bis dahin stand der Nachweis ausdrücklich NICHT geführt da — mit dem
 * Vermerk, die Knicklänge sei eine Festlegung des Auftraggebers. Sie ist es
 * weiterhin; sie steht jetzt als Zahl im Optionsdialog statt als Lücke im
 * Nachweis.
 *
 * ================== DIE KNICKLÄNGE ========================================
 *
 * Ein Fahrleitungsmast ist ein Kragarm: unten im Fundament eingespannt, oben
 * frei. Der Eulerfall 1 gibt β = 2.0, und das ist die Vorgabe. Wer den
 * Mastkopf gehalten weiss — durch ein Joch, das sich nicht verschieben kann —
 * setzt weniger an; das ist eine Entscheidung über das Tragwerk und keine,
 * die ein Werkzeug treffen darf.
 *
 * >>> DIE JOCHACHSE IST NICHT DER KOPF. <<<
 *
 * Gerechnet wird mit der GESAMTLÄNGE, nicht mit H. Über dem Jochanschluss
 * läuft der Mast weiter, und dieser Teil knickt mit. H ist der Hebel der
 * Drehfeder, L_M die Länge des Stabes.
 *
 * ================== DIE KNICKLINIE ========================================
 *
 * EN 1993-1-1, Tabelle 6.2, gewalzte I-Profile bis S460:
 *
 *     h/b > 1.2, t_f ≤ 40    y–y: a (α 0.21)    z–z: b (α 0.34)
 *     h/b ≤ 1.2, t_f ≤ 100   y–y: b (α 0.34)    z–z: c (α 0.49)
 *
 * Die Mastprofile des Sortiments sind quadratnahe HEB und ein HEM — h/b liegt
 * zwischen 1.00 und 1.09, also gilt durchweg b/c. Gerechnet wird trotzdem aus
 * der Geometrie: ein schlankeres Profil in der Tabelle bekäme sonst still die
 * falsche Linie.
 *
 * ================== DIE INTERAKTION =======================================
 *
 * Nach 6.3.3, Gleichung 6.61/6.62, mit den Interaktionsbeiwerten k nach
 * Anhang B. Für den Kragmast mit Kopflast ist C_m = 0.9 (Tabelle B.3,
 * Kragarm); die Beiwerte werden daraus gerechnet, nicht geraten.
 *
 * BIEGEDRILLKNICKEN BLEIBT AUSSEN VOR, und zwar begründet: der Mast ist ein
 * Kragarm mit Momenten um BEIDE Achsen und ohne freie Druckgurtlänge im
 * Sinne von 6.3.2 — χ_LT = 1.0. Bei einem Träger unter Querlast wäre das
 * falsch, bei einem eingespannten Stiel ist es die übliche Annahme. Sie steht
 * im Nachweis, damit sie nachgeprüft werden kann.
 * =========================================================================== */

/** Abminderungsbeiwert χ nach EN 1993-1-1, 6.3.1.2. */
function chiVon(lambdaQuer, alpha) {
  if (!(lambdaQuer > 0.2)) return 1;            // kein Knicknachweis nötig
  const phi = 0.5 * (1 + alpha * (lambdaQuer - 0.2) + lambdaQuer ** 2);
  const chi = 1 / (phi + Math.sqrt(Math.max(0, phi ** 2 - lambdaQuer ** 2)));
  return Math.min(1, chi);
}

/**
 * Stabilitätsnachweis eines Mastes.
 *
 * @param {object} s   Ergebnis von mastSchnitt()
 * @param {object} m   Modell (Stahl, Beiwerte)
 * @param {object} o   { beta, gammaM1 }
 */
export function mastStabilitaet(s, m, o = {}) {
  const p = s?.profil;
  if (!p) return null;
  const fy = m.stahl?.fy ?? 235;
  const gammaM1 = o.gammaM1 ?? m.gammaM1 ?? m.gammaM0 ?? 1.0;
  const beta = Number.isFinite(o.beta) ? o.beta : 2.0;
  /*
   * DIE GESAMTLÄNGE, NICHT H — siehe oben. Fehlt sie, gilt H: dann endet der
   * Mast am Jochanschluss, und das ist dieselbe Länge.
   */
  const L = (s.laenge > 0 ? s.laenge : s.H) || 0;
  const Lcr = beta * L;
  if (!(Lcr > 0)) return null;

  const E = 210000;                                  // N/mm²
  const A = p.A * 100;                               // cm² -> mm²
  const NRk = (A * fy) / 1000;                       // kN
  // Trägheitsmomente in mm⁴, Knicklänge in mm.
  const Ncr = (achse) => (Math.PI ** 2 * E * (p[achse] * 1e4))
                       / ((Lcr * 1000) ** 2) / 1000;  // kN

  // Knicklinie aus der Geometrie (Tabelle 6.2).
  const schlank = p.h / p.b > 1.2 && p.tf <= 40;
  const alphaY = schlank ? 0.21 : 0.34;
  const alphaZ = schlank ? 0.34 : 0.49;

  const NcrY = Ncr('Iy'), NcrZ = Ncr('Iz');
  const lamY = Math.sqrt(NRk / NcrY), lamZ = Math.sqrt(NRk / NcrZ);
  const chiY = chiVon(lamY, alphaY), chiZ = chiVon(lamZ, alphaZ);

  // Massgebend ist die Stelle mit der grössten Ausnutzung - beim Kragmast
  // der Fuss, aber ein Anbauteil weiter oben kann es verschieben.
  const NEd = Math.max(...s.stationen.map((st) => Math.abs(st.N)));
  const MqEd = Math.max(...s.stationen.map((st) => Math.abs(st.Mq)));
  const MlEd = Math.max(...s.stationen.map((st) => Math.abs(st.Ml)));

  // Momentenwiderstände [kNm] - elastisch, wie der Querschnittsnachweis.
  const stegQuer = s.stegrichtung?.achse === 'y';
  const Wq = stegQuer ? p.Wy : p.Wz;                  // Ebene «quer»
  const Wl = stegQuer ? p.Wz : p.Wy;
  const MRq = (Wq * 1000 * fy) / 1e6;                // cm³ -> kNm
  const MRl = (Wl * 1000 * fy) / 1e6;

  /*
   * INTERAKTIONSBEIWERTE, Anhang B, Tabelle B.1 (Querschnitt Klasse 1/2 wie
   * Klasse 3 behandelt - konservativ und ohne Sonderfall).
   *
   * C_m = 0.9 für den Kragarm mit Kopflast (Tabelle B.3). Der Beiwert bleibt
   * innerhalb seiner Schranken; ohne die Deckelung liefe er bei kleiner
   * Normalkraft gegen sich selbst.
   */
  const Cm = 0.9;
  const nY = NEd / ((chiY * NRk) / gammaM1);
  const nZ = NEd / ((chiZ * NRk) / gammaM1);
  const kyy = Math.min(Cm * (1 + 0.6 * lamY * nY), Cm * 1.6);
  const kzz = Math.min(Cm * (1 + 0.6 * lamZ * nZ), Cm * 1.6);
  // Die Nebenachse trägt 60 % der Hauptachsenwirkung (B.1, k_yz = 0.6·k_zz).
  const etaQ = nY + kyy * (MqEd / (MRq / gammaM1))
             + 0.6 * kzz * (MlEd / (MRl / gammaM1));
  const etaL = nZ + 0.6 * kyy * (MqEd / (MRq / gammaM1))
             + kzz * (MlEd / (MRl / gammaM1));

  return {
    beta, Lcr, gammaM1,
    NEd, MqEd, MlEd, NRk, MRq, MRl,
    NcrY, NcrZ, lamY, lamZ, chiY, chiZ, alphaY, alphaZ, kyy, kzz, Cm,
    knicklinie: { y: schlank ? 'a' : 'b', z: schlank ? 'b' : 'c' },
    eta: Math.max(etaQ, etaL),
    etaQuer: etaQ, etaLaengs: etaL,
    massgebend: etaQ >= etaL ? 'quer' : 'längs',
    // Unter dieser Schlankheit verlangt die Norm keinen Knicknachweis.
    ohneNachweis: lamY <= 0.2 && lamZ <= 0.2,
  };
}

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
  /*
   * DIE STABILITAET GEHOERT ZUM NACHWEIS, nicht in eine Fussnote.
   *
   * Bis zum 2. September stand sie ausdruecklich NICHT gefuehrt da - mit der
   * Begruendung, bei den kleinen Normalkraeften eines Fahrleitungsmastes sei
   * sie ohnehin nicht massgebend.
   *
   * >>> GEMESSEN IST SIE ES KNAPP DOCH. <<<
   *
   * Am HEB 260 ueber 12 m mit beta = 2.0: eta 0.1465 gegen 0.1360 aus dem
   * Querschnitt. Die Normalkraft ist klein (11 kN Eigengewicht), aber chi_z
   * faellt bei einer Schlankheit von 3.88 auf 0.059, und der Momentenanteil
   * wird mit k_yy = 0.93 hochgesetzt. Die Vermutung war gut begruendet und
   * trotzdem knapp daneben - genau dafuer rechnet man es aus.
   */
  const stabil = mastStabilitaet(s, m, {
    beta: o.knickBeiwert, gammaM1: o.gammaM1 });
  return {
    ende, ...s, stationen, massgebend, eta: massgebend.eta,
    fy, fyd, A, Wq, Wl, klasse: kl, plastisch: plWerte,
    plastischGewuenscht: gewuenschtPlastisch, plastischWirksam,
    stabil,
    /*
     * DAS URTEIL ZAEHLT BEIDES.
     *
     * Ein Querschnitt, der haelt, waehrend der Stab knickt, ist nicht
     * nachgewiesen. `eta` bleibt der Querschnitt - daran haengen die
     * Spannungsplots -, aber wer nach dem Nachweis fragt, bekommt das
     * groessere der beiden.
     */
    etaMitStabilitaet: Math.max(massgebend.eta, stabil?.eta ?? 0),
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
    /*
     * `eta` BLEIBT DER QUERSCHNITT - und zwar mit Absicht.
     *
     * Daran haengen die Farbskala und der Verlauf ueber die Hoehe; die
     * Stabilitaet hat keinen Verlauf, sie gilt dem ganzen Stab. Beim ersten
     * Anlauf trug `eta` beides, und zwei Kontrollen fielen sofort: die
     * Farbskala zeigte einen Wert, den kein Punkt im Bild erreicht, und der
     * plastische Widerstand senkte das eta nicht mehr, weil die Stabilitaet
     * davon nichts weiss.
     *
     * Wer nach dem NACHWEIS fragt, nimmt `etaNachweis`.
     */
    eta: Math.max(...beide.map((x) => x.eta)),
    etaStabil: Math.max(...beide.map((x) => x.stabil?.eta ?? 0)),
    etaNachweis: Math.max(...beide.map((x) => x.etaMitStabilitaet ?? x.eta)),
    massgebendesEnde: beide.reduce((a, b) => (b.eta > a.eta ? b : a)).ende,
  };
}
