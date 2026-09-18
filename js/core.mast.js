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

import { mastSteifigkeit, jochAnteile, konsolLaenge } from './core.auflager.js';
import { ankerGeometrie, ankerTraegtDruck } from './data.anker.js';

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
 *   Myy Moment um y — biegt den Masten QUER zum Gleis
 *   Mxx Moment um die Jochachse — biegt ihn in GLEISRICHTUNG
 *   Mzz Moment um die Lotrechte — TORSION um die Mastachse
 *
 * >>> DIE GRÖSSEN SIND GLOBAL, NICHT EBENENBEZOGEN (15. September). <<<
 *
 * Weisung: «konvention app global nachziehen.»
 *
 * Bis dahin führte der Mastnachweis EBENEN — `Mq` quer, `Ml` längs, `Mt`
 * Torsion —, jede positiv, wenn die Last positiv ist. Das liest sich am
 * stehenden Masten gut, aber es passt zu nichts sonst: der Anbauteilsatz,
 * das Joch, die AxisVM-Ausleitung und die Mastfusstabelle führen alle
 * `F_x/F_y/F_z` und `M_xx/M_yy/M_zz` um die globalen Achsen. Und weil die
 * Rechte-Hand-Regel für x und y gegenläufige Drehsinne gibt, hiess das
 *
 *      Mq = +M_yy      aber      Ml = −M_xx,   Mt = −M_zz
 *
 * — eine Anschrift mit Minuszeichen, die man bei jedem Ablesen mitdenken
 * musste. Jetzt rechnet diese Datei selbst in den globalen Grössen; die
 * Minuszeichen sitzen dort, wo sie hingehören: an den Anteilen.
 *
 *      Myy += F_x·arm + F_z·e_x                drehen beide um +y
 *      Mxx -= F_y·arm + F_z·e_y                drehen beide um −x
 *      Mzz -= F_x·e_y − F_y·e_x                dasselbe für die Torsion
 *
 * FÜR DEN NACHWEIS ÄNDERT SICH NICHTS: dort stehen Beträge. Was sich ändert,
 * ist das Vorzeichen in Tabelle, Bericht und Kurve — und dass ein
 * eingeprägtes Moment ohne Umrechnung ankommt.
 *
 * @returns {{H:number, zKopf:number, lasten:object[], wQuer:number, wLaengs:number}}
 */
export function mastLasten(m, ende = 'A') {
  const md = (ende === 'B' ? m.federn?.mastB : m.federn?.mastA) ?? m.federn?.mast;
  if (!md) return null;
  const H = md.H;
  const zKopf = md.ueberstand > 0 ? md.laenge : H;
  const seite = ende === 'A' ? 'A' : 'B';

  // --- Was das Joch abgibt, am Anschluss auf der Höhe H --------------------
  /*
   * DIESELBEN FORMELN WIE IM AUFLAGERBLATT (core.vierendeel.js), nur mit den
   * Werten des AKTIVEN Lastfalls statt gruppenweise. Zwei Wege zu derselben
   * Reaktion waeren zwei Gelegenheiten, sich zu irren.
   */
  /*
   * Seit dem 16. September nach dem HEBELGESETZ UM DIE MASTACHSEN, nicht
   * mehr ueber die ganze Jochlaenge (core.auflager.js, jochAnteile). Ohne
   * Kragarm ist das dieselbe Zahl.
   */
  const anteile = jochAnteile(m);
  const an = anteile[seite];
  /*
   * ========================================================================
   * >>> DAS ABFANGJOCH GIBT ANDERE KRAEFTE AB. <<<
   * ========================================================================
   *
   * Weisung vom 10. September: «den mastnachweis beim abfangjoch fertig
   * machen.»
   *
   * `m.RA`, `m.MA`, `m.H`, `m.T` sind die Reaktionen des TRAGJOCH-
   * Ersatzbalkens - vier Winkelgurte, Rahmenebene senkrecht. Am Abfangjoch
   * beschreiben sie ein anderes Tragwerk, und deshalb stand dort bisher gar
   * keine Mastkachel. `abfangAuswertung` rechnet seine eigenen
   * Auflagerkraefte; sie kommen als `m.abfangAuflager` herein.
   *
   * WAS ANKOMMT:
   *
   *   F_z   lotrecht, aus Eigengewicht und Schnee
   *   F_y   in GLEISRICHTUNG - der Leiterzug und der Wind auf das Joch.
   *         Das ist die grosse Kraft; sie biegt den Masten ueber die volle
   *         Anschlusshoehe, und dafuer steht das Abfangjoch da.
   *   F_x   in der Jochachse - Wind quer auf die Anbauteile. Sie kommt als
   *         SUMME und wird hier nach der Kopfsteifigkeit verteilt, genau
   *         wie die Laengskraft des Tragjochs.
   *
   * >>> UND WAS NICHT ANKOMMT: MOMENTE. <<<
   *
   * Die Links des Abfangjochs haben alle Momentengrade FREI (core.auflager,
   * LINK_DREH_FREI). Uebertragen wird nur, was ein Kraeftepaar der beiden
   * Gurte hergibt - und die Drehung um z ist bewusst geloest: der vordere
   * Gurt ist in der Jochachse frei, damit das Rahmenmoment NICHT als
   * Torsion in den Masten laeuft (Weisung vom 5. September).
   *
   * Was bleibt, ist die Torsion aus der EXZENTRIZITAET: weil nur der
   * hintere Gurt die Kraft in der Jochachse haelt, greift sie um den halben
   * Gurtabstand neben der Mastachse an. Genau der Anteil, den die Weisung
   * stehen laesst - er faellt hier ueber `ey` an.
   */
  const ab = m.abfangAuflager?.[seite] ? m.abfangAuflager : null;
  const abE = ab?.[seite] ?? null;

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
  const Fz = abE ? abE.Fz : (seite === 'A' ? (m.RA ?? 0) : (m.RB ?? 0));
  const Fy = abE ? abE.Fy : an.Fy;
  /*
   * >>> DAS ANSCHLUSSMOMENT, UND GLOBAL GEZAEHLT (16. September). <<<
   *
   * `Man` ist das Stuetzmoment ohne den Kragarm - das, was die Verbindung
   * wirklich uebertraegt. Positiv heisst Zug oben im Joch. Am Ende A liegt
   * das Feld auf der +x-Seite des Masten, eine Last darin dreht ihn um +y;
   * am Ende B liegt es auf der −x-Seite und dreht ihn um −y. Bis hierher
   * stand an beiden Enden dasselbe Vorzeichen - fuer den Betrag ohne
   * Belang, gegen die staendige Umlenkkraft F_x aber nicht.
   */
  const Myy = abE ? 0 : (seite === 'A' ? an.Man : -an.Man);
  /*
   * >>> DIE TORSION DES JOCHS KOMMT ALS MOMENT LAENGS AN. <<<
   *
   * Weisung vom 10. September: «die torsion des liegenden traegers noch
   * rechnen.»
   *
   * Sie wird im Joch als gegenlaeufiges Kraeftepaar der beiden Gurte
   * abgetragen. Am Auflager stehen diese beiden lotrechten Kraefte
   * nebeneinander, im Achsabstand e - und das ist ein Moment um die
   * JOCHACHSE, also Biegung des Masten in Gleisrichtung.
   *
   * Genau der Anteil, der bis hierher fehlte und den der Hinweis benannt
   * hat: «wo sie auftritt, steht der Mast zu guenstig da». Jetzt steht er
   * nicht mehr zu guenstig da.
   */
  // Das Minus macht daraus ein Moment um die JOCHACHSE im globalen
  // Drehsinn - die Grösse selbst ist dieselbe wie vorher als `Ml`.
  const Mxx = -(abE
    ? (abE.Ptors ?? 0) * 2 * (ab?.ey ?? 0)
    : an.T);
  const Fx = (abE ? (abE.Fxges ?? 0) : (m.N ?? []).reduce((a, n) => a + n.w, 0))
             * anteil;
  /*
   * DER HINTERE GURT HAELT, UND ER LIEGT HINTEN: die Exzentrizitaet zaehlt
   * in −y. Fuer den Betrag der Torsion ist das Vorzeichen gleichgueltig,
   * fuer ihre Richtung im Bild nicht.
   */
  const eyAnschluss = ab ? -(ab.ey ?? 0) : 0;
  /*
   * >>> DIE KONSOLE STEHT VOR DEM MASTEN (16. September). <<<
   *
   * Das Joch haengt an der Konsole, eine halbe Mastbreite (oder das Mass
   * `auflagerKonsole`) neben der Achse - zum Feld hin. Die Ausleitung baut
   * es seit dem 12. September so; der Nachweis setzte die Last bis heute in
   * die Achse. Bei gelenkigem Anschluss ist F_z·e das GANZE Moment aus dem
   * Joch. Bei steifem liegt der Zuschlag etwas auf der sicheren Seite: der
   * Ersatzbalken misst seine Stuetzweite von Achse zu Achse.
   *
   * NUR FUER F_z. Der Hebel steht deshalb im Moment und nicht in `ex`:
   * ueber `ex` bekaeme auch F_y einen Arm und damit eine Torsion im Masten.
   * Die haelt in Wirklichkeit das Joch - es liegt mit beiden Gurten in x an
   * und ist quer viel steifer als der Mast verdrehweich. AxisVM zeigt am
   * Beispiel 0.09 kNm statt F_y·e = 0.5 kNm.
   */
  const exAnschluss = ab ? 0
    : (seite === 'A' ? +1 : -1) * konsolLaenge(m, md.profil);

  /*
   * `zAnschluss` IST NICHT DASSELBE WIE `z`.
   *
   * `z` sagt, wo die Last ANGREIFT - beim Fahrdraht einer Haengestuetze
   * anderthalb Meter unter ihrer Befestigung. `zAnschluss` sagt, wo sie in
   * den MASTEN eintritt: an der Befestigung. Dazwischen laeuft sie durch das
   * Anbauteil, nicht durch den Masten.
   *
   * Fuer die Knicklaenge zaehlt der Eintritt: oberhalb davon drueckt nichts
   * mehr. Mit `z` gerechnet fiele sie zu kurz aus - und das waere die
   * unsichere Seite (gemessen: 11.3 statt 14.0 m).
   */
  const lasten = [{
    art: 'joch', name: `Joch, Anschluss Ende ${seite}`, z: H, zAnschluss: H,
    Fz, Fx, Fy, Myy: Myy + Fz * exAnschluss, Mxx, Mzz: 0,
    ex: 0, eKonsole: exAnschluss, ey: eyAnschluss,
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
      Mxx: s.Mxx + (q.Mxx ?? 0),
      Myy: s.Myy + (q.Myy ?? 0), Mzz: s.Mzz + (q.Mzz ?? 0),
    }), { Fx: 0, Fy: 0, Fz: 0, Mxx: 0, Myy: 0, Mzz: 0 });
    if (!k.Fx && !k.Fy && !k.Fz && !k.Mxx && !k.Myy && !k.Mzz) return;
    /* =====================================================================
     * >>> JEDES EINGEPRÄGTE MOMENT AUF SEINE ACHSE. <<<
     * =====================================================================
     *
     * Weisung vom 15. September: «berichtigen und durchgängigkeit zu axisvm
     * schaffen.»
     *
     * Hier stand `Mq: k.Myy, Ml: k.Mzz` — und davon war nur das erste
     * richtig. Am JOCH liegt die Stabachse in x, dort fallen die Ebenen mit
     * den globalen Achsen zusammen; der MAST steht lotrecht, und damit
     * gehen sie auseinander:
     *
     *   M_xx  um die Jochachse   →  am stehenden Masten LÄNGSBIEGUNG (Ml)
     *   M_yy  um y               →  Querbiegung (Mq)
     *   M_zz  um die Lotrechte   →  TORSION um die Mastachse (Mt)
     *
     * Zwei Fehler, in entgegengesetzte Richtung: ein `M_zz` wurde als
     * Längsbiegung nachgewiesen (falsche Achse, aber wirksam), ein `M_xx`
     * gar nicht erst aufsummiert — es fiel ersatzlos aus dem Nachweis. Das
     * ist die unangenehme Richtung.
     *
     * SEIT DER UMSTELLUNG AUF GLOBALE GRÖSSEN (15. September) steht hier
     * keine Umrechnung mehr: der Anbauteilsatz führt M_xx/M_yy/M_zz, diese
     * Datei rechnet in denselben Grössen, und die drei Momente wandern
     * unverändert durch. Genau so gibt sie auch die AxisVM-Ausleitung
     * weiter (`export.axisvm.js`) — beide zeigen dasselbe, ohne dass es
     * jemand umdrehen muss.
     */
    lasten.push({
      art: 'anbau', name: t.name, z: (t.hMast ?? 0) + (t.z ?? 0),
      zAnschluss: t.hMast ?? 0,
      Fz: k.Fz, Fx: k.Fx, Fy: k.Fy,
      Mxx: k.Mxx, Myy: k.Myy, Mzz: k.Mzz,
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
           anker: md.anker ?? null,
           /*
            * WOHER DIE JOCHKRAFT KOMMT. Sie steht im Ergebnis, weil sie
            * ueber die Gueltigkeit der ganzen Zahl entscheidet: die
            * Reaktionen des Tragjoch-Ersatzbalkens gelten am Abfangjoch
            * nicht, und umgekehrt.
            */
           quelle: abE ? 'abfangjoch' : 'tragjoch',
           I: md.I, Iq: md.Iq, W: md.W_cm3, Wq: md.Wq_cm3 };
}

/* ===========================================================================
 * DER MAST MIT ZUGANKER ODER DRUCKSTUETZE
 * ===========================================================================
 *
 * Weisung vom 10. September, auf Nachfrage: «nimm variante 3 und die
 * charakteristische kraft.»
 *
 * VARIANTE 3 heisst: der Mast ist am ANKERPUNKT GEHALTEN und am Fuss
 * weiterhin EINGESPANNT. Ein Zweifeldsystem also - unten die Einspannung,
 * auf der Hoehe h_A eine unverschiebliche Stuetze, darueber ein Kragarm.
 *
 * >>> EINFACH STATISCH UNBESTIMMT - UND DAS EI KUERZT SICH. <<<
 *
 * Die Unbekannte ist die Haltekraft X an der Stuetze. Sie folgt aus der
 * Vertraeglichkeit: an der Stelle h_A darf sich nichts verschieben.
 *
 *      δ₁₀ + X · δ₁₁ = 0        X = − δ₁₀ / δ₁₁
 *
 * δ₁₀ ist die Verschiebung des KRAGARMS an dieser Stelle unter den
 * aeusseren Lasten, δ₁₁ die unter einer Einheitskraft dort. Beide tragen
 * dasselbe E·I im Nenner - es KUERZT SICH heraus. Damit braucht diese
 * Rechnung weder Elastizitaetsmodul noch Traegheitsmoment, und sie ist
 * unabhaengig vom Mastprofil. Das ist keine Vereinfachung, sondern die
 * Eigenschaft eines einfach unbestimmten Systems mit EINEM Baustoff.
 *
 * >>> DIE NACHGIEBIGKEIT DES ANKERS STECKT NICHT DARIN. <<<
 *
 * «Gehalten» heisst starr gehalten. Ein Stab, der sich dehnt, und ein
 * Ankerfundament, das nachgibt, wuerden X verkleinern - der Mastfuss bekaeme
 * mehr, der Anker weniger. Die Weisung sagt Variante 3, und die ist die
 * ungünstigere für den ANKER: er bekommt die volle Haltekraft.
 *
 * >>> UND SIE WIRKT IN EINER EBENE, NICHT IN BEIDEN. <<<
 *
 * Ein schraeger Stab haelt die Richtung, in der er liegt - die andere nicht.
 * Welche das ist, sagt die Eingabe:
 *
 *   JOCHACHSE (x)      der Regelfall am Tragjoch. Dort kippt die
 *                      Umlenkkraft aus dem Bogen den Masten quer zum Gleis.
 *   GLEISRICHTUNG (y)  der Regelfall am ABFANGJOCH. Dort steht die grosse
 *                      Kraft laengs - der Leiterzug -, und ein Anker quer
 *                      dazu haelt nichts davon.
 *
 * Das ist keine Feinheit: ein Anker in der falschen Ebene bekommt
 * rechnerisch NULL und entlastet den Masten nicht. Gemessen am Abfangjoch
 * A240 mit einem Leiter bei x = 10.00 - eta 2.205 am Endmasten, und der
 * Anker in der Jochachse aenderte daran nichts.
 * ======================================================================== */

/**
 * Verschiebung eines Kragarms an der Stelle a [Einheiten von 1/EI].
 *
 * Eingespannt bei z = 0, frei bei z = L. Alle Formeln in derselben
 * Vorzeichenregel wie `mastSchnitt`: eine Kraft in +x verschiebt nach +x,
 * und ein Moment mit demselben Drehsinn wie F·arm ebenso.
 */
function kragarmVerschiebung(a, { q = 0, L = 0, kraefte = [], momente = [] }) {
  let w = 0;
  // Gleichlast ueber die ganze Laenge
  if (q) w += (q * a * a * (6 * L * L - 4 * L * a + a * a)) / 24;
  kraefte.forEach(({ F, z }) => {
    if (!F) return;
    // Oberhalb der Stelle: der ganze Hebel wirkt. Unterhalb: nur bis dort.
    w += a <= z ? (F * a * a * (3 * z - a)) / 6
                : (F * z * z * (3 * a - z)) / 6;
  });
  momente.forEach(({ M, z }) => {
    if (!M) return;
    w += a <= z ? (M * a * a) / 2 : (M * z * (2 * a - z)) / 2;
  });
  return w;
}

/**
 * DIE HALTEKRAFT AM ANKERPUNKT [kN], in x-Richtung.
 *
 * @param {object} g   Ergebnis aus `mastLasten`
 * @param {number} aH  Anschlusshöhe des Ankers über dem Fuss [m]
 * @returns {number|null} X - positiv heisst: die Stütze drückt den Masten
 *          in +x. Null, wenn keine brauchbare Höhe vorliegt.
 */
export function ankerHaltekraft(g, aH, richtung = 'x') {
  if (!g || !Number.isFinite(aH) || aH <= 0) return null;
  // Ueber dem Mastkopf gibt es nichts zu halten.
  const a = Math.min(aH, g.zKopf);
  if (!(a > 0)) return null;
  const y = richtung === 'y';
  const kraefte = g.lasten.map(
    (l) => ({ F: (y ? l.Fy : l.Fx) ?? 0, z: l.z }));
  /*
   * ZWEI QUELLEN FUER EIN MOMENT: das eingeleitete Moment dieser Ebene und
   * die Vertikallast ueber ihre AUSLADUNG. Dieselben zwei, die
   * `mastSchnitt` addiert - waeren es hier andere, stuenden zwei
   * Rechnungen nebeneinander.
   */
  const momente = g.lasten.map((l) => ({
    /*
     * IN DER EBENE GERECHNET, WEIL DIE VERSCHIEBUNG EINE EBENE HAT. `M_xx`
     * dreht um −x, die Auslenkung in y geht aber mit +F_y — deshalb das
     * Minus. Es ist dieselbe Umrechnung wie früher, nur jetzt hier statt
     * über die ganze Datei verteilt.
     */
    M: (y ? -(l.Mxx ?? 0) + (l.Fz ?? 0) * (l.ey ?? 0)
          : (l.Myy ?? 0) + (l.Fz ?? 0) * (l.ex ?? 0)), z: l.z }));
  const d10 = kragarmVerschiebung(a, { q: y ? g.wLaengs : g.wQuer,
                                       L: g.zKopf, kraefte, momente });
  const d11 = (a * a * a) / 3;
  if (!(d11 > 0)) return null;
  return -d10 / d11;
}

/**
 * DIE STABKRAFT IM ANKER [kN] - Zug positiv.
 *
 * Der Stab laeuft vom Mastpunkt (0, h) zum Fundament (s·a, 0). Zieht er mit
 * N > 0, wirkt auf den Masten die Kraft N·(s·cos α, −sin α): waagrecht zum
 * Fundament hin, lotrecht nach unten. Aus der waagrechten Komponente folgt
 * die Stabkraft, aus der lotrechten die Zusatzlast am Masten.
 *
 * @param {number} X   Haltekraft in +x [kN]
 * @param {object} geo Ergebnis aus `ankerGeometrie`
 * @param {string} seite 'plus' (Fundament in +x) oder 'minus'
 */
export function ankerStabkraftAus(X, geo, seite = 'plus', richtung = 'x') {
  if (!geo || !Number.isFinite(X) || !(geo.cos > 0)) return null;
  const s = seite === 'minus' ? -1 : 1;
  const N = X / (s * geo.cos);
  /*
   * DIE WAAGRECHTE KOMPONENTE WIRKT IN DER EBENE DES STABES - in x oder in
   * y, je nachdem, wohin sein Fundament steht. Die lotrechte gilt immer.
   */
  return { N, Fx: richtung === 'y' ? 0 : X, Fy: richtung === 'y' ? X : 0,
           Fz: N * geo.sin, seite: s, richtung };
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
  const { H, zKopf, gd, wQuer, wLaengs } = g;
  /*
   * >>> DIE HALTEKRAFT DES ANKERS IST EINE LAST WIE JEDE ANDERE. <<<
   *
   * Weisung vom 10. September: Variante 3 - der Mast ist am Ankerpunkt
   * gehalten, der Fuss bleibt eingespannt.
   *
   * Gerechnet wird die Unbekannte X aus der Vertraeglichkeit
   * (`ankerHaltekraft`) und dann als aeussere Kraft in die Liste gestellt.
   * Danach laeuft die Summation unveraendert weiter - sie ist fuer ein
   * System im Gleichgewicht richtig, gleichgueltig woher eine Kraft kommt.
   *
   * ZWEI KOMPONENTEN: die waagrechte haelt den Masten, die lotrechte
   * belastet ihn zusaetzlich. Ein Zuganker zieht nach unten, eine
   * Druckstuetze hebt - beides steht unterhalb des Anschlusspunktes in der
   * Normalkraft.
   */
  const ank = ankerImMast(g);
  // Ein schlaffes Seil traegt nichts - dann steht der Mast allein.
  const lasten = ank?.last ? [...g.lasten, ank.last] : g.lasten;

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
    let Fx = wQuer * dz;
    let Fy = wLaengs * dz;
    let Myy = (wQuer * dz * dz) / 2;
    // Die Streckenlast in y biegt um −x; dasselbe Mass, anderes Vorzeichen.
    let Mxx = -(wLaengs * dz * dz) / 2;
    let Mzz = 0;
    lasten.forEach((l) => {
      if (l.z < z - 1e-9) return;                  // liegt unterhalb
      const arm = l.z - z;
      N += l.Fz;
      Fx += l.Fx;
      Fy += l.Fy;
      /*
       * ZWEI ANTEILE JE MOMENT: die Horizontalkraft ueber die HOEHE und die
       * Vertikalkraft ueber die AUSLADUNG. Der zweite fehlte, solange die
       * Anbauteile am Masten ohne Hebelarm gefuehrt wurden - und er ist bei
       * einer Traverse der groessere von beiden.
       */
      Myy += l.Fx * arm + l.Fz * l.ex + (l.Myy ?? 0);
      Mxx += -(l.Fy * arm + l.Fz * l.ey) + (l.Mxx ?? 0);
      /*
       * Torsion um die Mastachse: Querkraft mal Versatz quer dazu - und das
       * eingepraegte Glied. Bis zum 15. September fehlte es hier ganz: ein
       * `M_zz` am Masten wurde stattdessen als Laengsbiegung gefuehrt.
       */
      Mzz += -(l.Fx * l.ey - l.Fy * l.ex) + (l.Mzz ?? 0);
    });
    /*
     * `N` BLEIBT ALS NAME STEHEN - eine Normalkraft heisst am Stab N, und
     * `F_z` daneben sagt dasselbe. Beide sind hier dieselbe Zahl, positiv
     * als Druck, positiv nach unten.
     */
    return { z, N, Fz: N, Fx, Fy, Myy, Mxx, Mzz };
  });

  return { ...g, stationen, ankerkraft: ank?.kraft ?? null };
}

/**
 * Die Ankerkraft und die Last, die sie am Masten erzeugt.
 *
 * @param {object} g Ergebnis aus `mastLasten`
 * @returns {{kraft, last}|null}
 */
function ankerImMast(g) {
  const a = g?.anker;
  if (!a?.typ) return null;
  const geo = ankerGeometrie(a.h, a.a);
  if (!geo) return null;
  /*
   * UEBER DEM MASTKOPF GIBT ES NICHTS ZU HALTEN. Wer die Anschlusshoehe
   * hoeher setzt als den Masten, bekommt die Halterung am Kopf - und den
   * Hinweis, dass die Angabe nicht zum Masten passt (core.checks.js).
   */
  const zA = Math.min(a.h, g.zKopf);
  const ri = a.richtung === 'y' ? 'y' : 'x';
  const X = ankerHaltekraft(g, zA, ri);
  const k = ankerStabkraftAus(X, geo, a.seite, ri);
  if (!k) return null;
  /* =======================================================================
   * >>> EIN SEIL TRAEGT NUR ZUG. <<<
   * =======================================================================
   *
   * Befund vom 16. September: «der zugstab wirkt nicht nur auf zug.» Auf
   * Rueckfrage: gemeint ist der Seilanker; muesste er in einer Kombination
   * druecken, FAELLT ER AUS - der Mast traegt diese Kombination allein, und
   * der Ankernachweis sagt es als Hinweis.
   *
   * Bis dahin stand hier die Haltekraft unbedingt als Last am Masten: das
   * Seil hielt ihn auch dann, wenn es dazu haette druecken muessen. Der
   * Ankernachweis meldete zwar «traegt keinen Druck», aber der Mast war
   * schon entlastet - er wurde gegen ein Tragwerk nachgewiesen, das es so
   * nicht gibt, und zwar auf der unsicheren Seite.
   *
   * >>> EINE KOMBINATION, EINE ENTSCHEIDUNG. <<<
   *
   * Diese Funktion laeuft je Lastbild. Ob das Seil traegt, entscheidet
   * deshalb jede Kombination fuer sich - so, wie ein Seil es auch tut.
   * Weil das System damit einfach unbestimmt bleibt, genuegt das
   * Vorzeichen: faellt das Seil aus, ist der Mast ein Kragarm, und der
   * rechnet sich ohne Iteration.
   *
   * Die Stuetzen (U12, U14) sind davon nicht beruehrt: sie tragen Zug UND
   * Druck.
   */
  let traegtDruck = true;
  try { traegtDruck = ankerTraegtDruck(a.typ); } catch { /* unbekannt: wie bisher */ }
  if (!traegtDruck && k.N < 0) {
    return {
      kraft: { typ: a.typ, N: 0, X: 0, z: zA, geo,
               seite: a.seite ?? 'plus', richtung: ri,
               befestigung: a.befestigung ?? 'ankerplatte',
               ueberKopf: a.h > g.zKopf + 1e-9,
               schlaff: true, NohneAusfall: k.N },
      last: null,
    };
  }
  return {
    kraft: { typ: a.typ, N: k.N, X, z: zA, geo,
             seite: a.seite ?? 'plus', richtung: ri,
             befestigung: a.befestigung ?? 'ankerplatte',
             ueberKopf: a.h > g.zKopf + 1e-9 },
    last: { art: 'anker', name: `Anker ${a.typ}`, z: zA, zAnschluss: zA,
            Fz: k.Fz, Fx: k.Fx, Fy: k.Fy,
            Myy: 0, Mxx: 0, Mzz: 0, ex: 0, ey: 0 },
  };
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
  // 1.05 als letzter Rueckfall - SIA 263 fuer Stabilitaet, wie in der Maske.
  const gammaM1 = o.gammaM1 ?? m.gammaM1 ?? m.gammaM0 ?? 1.05;
  const beta = Number.isFinite(o.beta) ? o.beta : 2.0;
  /*
   * DIE GESAMTLÄNGE, NICHT H — siehe oben. Fehlt sie, gilt H: dann endet der
   * Mast am Jochanschluss, und das ist dieselbe Länge.
   */
  const L = (s.laenge > 0 ? s.laenge : s.H) || 0;

  /*
   * ============ DIE KNICKLÄNGE ENDET AN DER KRAFTEINLEITUNG ==============
   *
   * Weisung vom 2. September, auf Nachfrage entschieden: «die angriffshöhe
   * der Normalkraft müsste noch berücksichtigt werden» — nach der
   * Angriffshöhe abstufen.
   *
   * Bis dahin stand hier L_cr = β · L über die GANZE Länge, mit dem
   * Fusswert der Normalkraft. Das ist sicher und bei einem Masten mit
   * Überstand deutlich zu sicher: über dem Jochanschluss trägt der Mast
   * nichts als sein eigenes Gewicht, und was dort nicht drückt, kann dort
   * auch nicht ausknicken.
   *
   * >>> UND DAS IST KEINE NÄHERUNG. <<<
   *
   * Ein Kragstab der Länge L mit einer Druckkraft in der Höhe a < L knickt
   * mit N_cr = π²·E·I/(2a)². Das Stück oberhalb a trägt keine
   * destabilisierende Kraft; es fährt mit, ohne am Eigenwertproblem
   * teilzunehmen. Die massgebende Länge ist a, nicht L.
   *
   * a ist die HÖCHSTE Stelle, an der noch eine Vertikallast eingeleitet
   * wird — der Jochanschluss, oder eine Traverse darüber. Gibt es keine
   * (ein Mast, der nur sein Eigengewicht trägt), bleibt es bei der ganzen
   * Länge: dann drückt oben tatsächlich noch etwas.
   *
   * Gemessen am HEB 260, 12.5 m lang, Anschluss auf 8.31 m:
   *
   *     L_cr = 2 · 12.50 = 25.00 m    χ_z 0.055
   *     L_cr = 2 ·  8.31 = 16.62 m    χ_z 0.116     >>> Faktor 2 <<<
   *
   * DIE MOMENTE BLEIBEN, WIE SIE SIND: für sie gilt weiter der grösste Wert
   * über die ganze Höhe, also der Fusswert. Nur die Knicklänge wird kürzer,
   * nicht die Einwirkung.
   *
   * DER ÜBERSTAND bekommt keinen eigenen Nachweis. Er trägt oberhalb a nur
   * sein Eigengewicht — bei einem HEB 260 über vier Meter sind das 0.4 kN
   * gegen eine Grenzlast von über 2700 — und sein Moment ist der kleinste
   * Teil des ohnehin angesetzten Fussmoments. Ein Nachweis, dessen Ergebnis
   * feststeht, ist keiner.
   */
  const mitFz = (s.lasten ?? []).filter((l) => Math.abs(l.Fz) > 1e-9);
  /*
   * DER EINTRITT IN DEN MASTEN, nicht der Angriffspunkt der Last.
   *
   * Am Pruefstand gemessen: eine Haengestuetze auf 7.00 m traegt ihren
   * Fahrdraht 1.35 m tiefer. Nimmt man den Angriffspunkt, endet die
   * Knicklaenge bei 5.65 statt bei 7.00 m - 11.3 statt 14.0 m, und das ist
   * die UNSICHERE Seite. In den Masten kommt die Kraft an der Befestigung,
   * und bis dorthin drueckt sie.
   */
  /* =======================================================================
   * >>> WO DIE MASSEN SITZEN - UND WIE SIE GEWOGEN WERDEN. <<<
   * =======================================================================
   *
   * Weisung vom 13. September: «die massen der anbauteile ist auf die höhe
   * der joche oder der tragausleger zuzuweisen oder bei den einzelmasten den
   * auslegern (anschlusshöhe) der masseschwerpunkt der masten ist auf den
   * masseschwerpunkt zu setzen. falls es mit dieser definition noch den
   * rayleigh braucht, dann einbauen.»
   *
   * Damit sind es MEHRERE Massen auf verschiedenen Höhen, und eine einzige
   * «oberste Krafteinleitung» genügt nicht mehr:
   *
   *   P_J   die Jochlast auf der ANSCHLUSSHÖHE H
   *   P_i   jedes Anbauteil am Masten auf SEINER Befestigungshöhe - seit
   *         dem 18. September auch am Joch- und Abfangjochmasten, nicht
   *         mehr auf H hochgesetzt (siehe unten)
   *   P_M   das Eigengewicht des Mastes, VERTEILT über die Länge
   *
   * >>> DESHALB RAYLEIGH. <<<
   *
   * Für den eingespannten Kragarm mit der Knickfigur
   *
   *     w(z) = δ [1 − cos(π z / 2L)]
   *
   * liefert der Rayleigh-Quotient den kritischen Vielfachen
   *
   *     λ_cr = E I (π/2L)² (L/2) / Σ P_i · g(a_i)
   *     g(a) = a/2 − (L/2π) · sin(π a / L)
   *
   * Für EINE Last an der Spitze (a = L) ist g = L/2, und daraus wird
   * N_cr = π²EI/(2L)² - die Eulerlast des Kragarms, exakt. Die Formel ist
   * also keine neue Regel, sondern die bekannte, auf mehrere Massen
   * erweitert.
   *
   * >>> AUSGEDRÜCKT WIRD DAS ERGEBNIS ALS ERSATZHÖHE. <<<
   *
   * Statt einen zweiten Weg neben `L_cr = β · z_N` aufzumachen, wird die
   * Höhe gesucht, auf der die GESAMTE Masse dieselbe Wirkung hätte:
   *
   *     g(z_eq) = Σ P_i g(a_i) / Σ P_i
   *
   * `g` wächst monoton (g' = ½[1 − cos(πa/L)] ≥ 0), also ist z_eq eindeutig
   * und mit einer Intervallhalbierung in zwanzig Schritten genau genug. Alles
   * dahinter - β, L_cr, der Bericht - bleibt, wie es war; bei einer einzigen
   * Masse kommt wieder ihre eigene Höhe heraus.
   *
   * >>> EINE ABWEICHUNG, DIE DASTEHEN SOLL. <<<
   *
   * Das Eigengewicht ist in Wirklichkeit VERTEILT. Der Kragarm unter
   * Eigengewicht knickt bei q·L = 7.837 EI/L²; dieselbe Last im Schwerpunkt
   * gäbe π²EI/L² = 9.87 EI/L². Die Punktmasse im Schwerpunkt ist damit rund
   * 12 % zu günstig für diesen Anteil - exakt entspräche ihr die Höhe
   * 0.561 L. Gesetzt ist der Schwerpunkt, weil die Weisung ihn nennt; hier
   * steht, was das bedeutet.
   * ===================================================================== */
  /*
   * >>> JEDE MASSE AUF IHRER EIGENEN HOEHE (Weisung, 18. September). <<<
   *
   * Bis hierher galt die Weisung vom 13. September: die Anbauteile am
   * Masten wurden der Anschlusshoehe zugewiesen, nie nach unten -
   * z = max(H, eigene Hoehe). Ein Rueckleiter auf 5 m rechnete damit, als
   * haenge er am Joch auf 9 m.
   *
   * Am Einzelmasten gibt es keine Anschlusshoehe; dort wurde auf Nachfrage
   * entschieden, jede Masse auf der Hoehe ihres Anbauteils zu rechnen. Frage
   * vom 18. September: «werden die mast massen beim stabilitätsnachweis bei
   * den jochtragwerken auf höhe joch gesetzt? ... falls es auf höhe joch
   * ist, anpassen entsprechend einzelmast logik.»
   *
   * Jetzt also ueberall dieselbe Regel:
   *
   *   Jochlast         auf der Anschlusshoehe H - dort tritt sie ein
   *   Anbauteil        auf seiner Befestigungshoehe am Masten
   *   Eigengewicht     verteilt ueber die Laenge (siehe unten)
   *
   * Nichts wird mehr verschoben, also gibt es auch keine Abweichung mehr
   * auszuweisen: `ueberAnschluss` bleibt leer und steht nur noch fuer die
   * Leser alter Ergebnisse da.
   */
  const einzel = m?.tragwerksart === 'einzelmast';
  const zAnschluss = einzel ? 0 : (s.H > 0 ? s.H : L);
  const punkte = mitFz.map((l) => {
    const eigen = Math.min(L, l.zAnschluss ?? l.z ?? 0);
    return { name: l.name, P: Math.abs(l.Fz), zEigen: eigen, z: eigen,
             joch: l.art === 'joch' };
  }).filter((x) => x.P > 1e-9);
  const PA = punkte.reduce((a, x) => a + x.P, 0);
  const PM = Math.abs((s.gd ?? 0) * L);
  const massen = [];
  // Die Jochlast als eine Zeile auf der Anschlusshoehe, jedes Anbauteil
  // einzeln mit seiner Hoehe.
  const PJ = punkte.filter((x) => x.joch).reduce((a, x) => a + x.P, 0);
  if (PJ > 1e-9) {
    massen.push({ name: 'Jochlast', z: Math.min(zAnschluss, L), P: PJ,
                  herkunft: 'Anschlusshöhe' });
  }
  punkte.filter((x) => !x.joch).sort((x, y) => y.z - x.z)
    .forEach((x) => massen.push({
      name: x.name, z: x.z, P: x.P, herkunft: 'eigene Befestigungshöhe' }));
  const ueberAnschluss = [];
  /* =======================================================================
   * >>> DAS EIGENGEWICHT BLEIBT VERTEILT. <<<
   * =======================================================================
   *
   * Die Weisung setzt es in den Schwerpunkt L/2. Das ist zu guenstig, und
   * zwar nachrechenbar: im Rayleigh-Quotienten traegt eine VERTEILTE Last q
   * den Term
   *
   *     q * Integral(0..L) g(z) dz  =  q * L^2 (1/4 - 1/pi^2)
   *
   * waehrend dieselbe Last als Punkt im Schwerpunkt nur P*g(L/2) beitraegt.
   * Das Verhaeltnis ist 0.148679 L^2 zu 0.109014 L^2 - die Punktmasse im
   * Schwerpunkt unterschaetzt ihren Anteil um ein Drittel.
   *
   * Auf Nachfrage entschieden (13. September): gerechnet wird das Integral.
   * Das ist kein neuer Beiwert, sondern dieselbe Methode, richtig angewandt -
   * die verteilte Last steht im Rayleigh-Quotienten so gut wie die Punktlast.
   *
   * >>> WO SIE DAMIT SITZT. <<<
   *
   * Die aequivalente Punkthoehe folgt aus g(a) = L (1/4 - 1/pi^2) und liegt
   * bei rund 0.60 L - nicht bei 0.50 L. Sie wird ausgerechnet und im Bericht
   * genannt, damit der Unterschied zur Weisung sichtbar bleibt.
   * ===================================================================== */
  const gIntegral = L * L * (0.25 - 1 / (Math.PI * Math.PI));
  /** Das Integral der Knickfigur bis zur Höhe a - siehe oben. */
  const gVon = (a) => a / 2 - (L / (2 * Math.PI)) * Math.sin((Math.PI * a) / L);
  /** Die Hoehe, auf der ein Anteil mit dem Gewicht `wert` seine Wirkung hat. */
  const hoeheZu = (wert) => {
    let u = 0, o = L;
    for (let i = 0; i < 60; i++) {
      const mi = (u + o) / 2;
      if (gVon(mi) < wert) u = mi; else o = mi;
    }
    return (u + o) / 2;
  };
  if (PM > 1e-9) {
    massen.push({ name: 'Eigengewicht des Mastes', z: hoeheZu(gIntegral / L),
                  P: PM, herkunft: 'verteilt über die Länge',
                  schwerpunkt: L / 2 });
  }
  let zN;
  const Pges = massen.reduce((a, x) => a + x.P, 0);
  if (!(Pges > 1e-9)) {
    // Ohne jede Masse gilt die ganze Länge - dann drückt oben wirklich noch
    // etwas, und eine Last am Fuss verkürzt nichts auf null.
    zN = L;
  } else {
    /*
     * Der verteilte Anteil geht mit seinem INTEGRAL ein, die Punktmassen mit
     * g(a). Beide stehen im selben Zaehler - es ist ein Quotient, keine
     * Fallunterscheidung.
     */
    const summe = punkte.reduce((a, x) => a + x.P * gVon(x.z), 0)
                + (PM > 1e-9 ? (PM / L) * gIntegral : 0);
    zN = Math.max(0.5, Math.min(hoeheZu(summe / Pges), L));
  }
  const Lcr = beta * zN;
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

  /*
   * >>> DREI GRÖSSTWERTE, JEDER FÜR SICH. <<<
   *
   * Hier stand, massgebend sei «die Stelle mit der grössten Ausnutzung».
   * Das beschreibt nicht, was geschieht: genommen wird je Schnittgrösse ihr
   * eigener Höchstwert über die ganze Höhe, und die drei können von
   * verschiedenen Stellen stammen.
   *
   * Beim Kragmast tun sie das nicht - N, M_quer und M_längs wachsen alle
   * zum Fuss hin, und dort liegen alle drei. Mit einem Zuganker kann sich
   * das Momentenbild umkehren, und dann stehen Werte nebeneinander, die nie
   * gleichzeitig auftreten. Das ist die SICHERE Seite und bleibt so; es
   * soll nur dastehen, statt anders benannt zu sein.
   */
  const NEd = Math.max(...s.stationen.map((st) => Math.abs(st.N)));
  // Beträge - für den Nachweis ist der Drehsinn gleichgültig.
  const MqEd = Math.max(...s.stationen.map((st) => Math.abs(st.Myy)));
  const MlEd = Math.max(...s.stationen.map((st) => Math.abs(st.Mxx)));

  /*
   * >>> ERST IN DIE PROFILACHSEN, DANN IN DIE GLEICHUNG. <<<
   *
   * Hier wurde in BAUACHSEN gerechnet - «quer» und «laengs» - und die
   * beiden Gleichungen 6.61/6.62 der Reihe nach darauf gelegt. Solange der
   * Steg quer zum Gleis steht, ist das dasselbe: die starke Achse y nimmt
   * das Quermoment, die Zuordnung ist die Identitaet.
   *
   * BEI GEDREHTEM STEG NICHT. Dann nimmt die SCHWACHE Achse das
   * Quermoment - der Widerstand W wurde richtig getauscht, chi und k aber
   * nicht. Gleichung 6.61 stand damit mit chi_y (starke Achse, chi 0.166)
   * neben einem Moment um die schwache. Am HEB 260 ueber 12 m, N 11 kN,
   * M_quer 40 kNm, M_laengs 8 kNm gemessen:
   *
   *     gerechnet   eta 0.443
   *     richtig     eta 0.532        >>> 20 % zu klein, unsichere Seite <<<
   *
   * EN 1993-1-1, 6.3.3 kennt nur die Profilachsen: 6.61 traegt chi_y mit
   * M_y, 6.62 chi_z mit M_z. Also werden die Momente zuerst dorthin
   * gedreht, und die Gleichungen stehen danach so da wie in der Norm.
   */
  const stegQuer = s.stegrichtung?.achse === 'y';
  const MyEd = stegQuer ? MqEd : MlEd;              // um die starke Achse
  const MzEd = stegQuer ? MlEd : MqEd;              // um die schwache
  const MRy = (p.Wy * 1000 * fy) / 1e6;             // cm³ -> kNm
  const MRz = (p.Wz * 1000 * fy) / 1e6;
  // Dieselben Widerstaende, in Bauachsen benannt - fuer den Bericht.
  const MRq = stegQuer ? MRy : MRz;
  const MRl = stegQuer ? MRz : MRy;

  /* =======================================================================
   * DIE INTERAKTION NACH SIA 263, ZIFFER 5.1.10
   * =======================================================================
   *
   * Weisung vom 12. September: «als grundlage für die bemessung gilt die sia
   * stahlbaunorm 263», und der Nachweis ist danach zu fuehren. Der Wortlaut
   * der Ziffern 5.1.9 und 5.1.10 liegt seit dem 13. September vor.
   *
   * Hier stand bis dahin EN 1993-1-1, 6.61/6.62 mit den Beiwerten k_ij aus
   * Anhang B. Die KNICKKURVE ist in beiden Normen dieselbe - das ist an der
   * Tafel geprueft -, die INTERAKTION nicht: SIA 263 arbeitet nicht mit
   * k-Beiwerten, sondern mit dem VERGROESSERUNGSFAKTOR 1/(1 - N/N_cr).
   *
   * >>> GLEICHUNG (50), Ziffer 5.1.10.1 - Druck und zweiachsige Biegung. <<<
   *
   *   N_Ed/N_K,Rd + omega_y/(1 - N_Ed/N_cr,y) * M_y,Ed/M_D,Rd
   *               + omega_z/(1 - N_Ed/N_cr,z) * M_z,Ed/M_z,Rd  <= 1.0
   *
   *   N_K,Rd    Minimum aus N_Ky,Rd und N_Kz,Rd (Ziffer 4.5.1.3)
   *   M_D,Rd    Kippwiderstand nach 4.5.2 - siehe unten
   *   omega     Beiwert der Momentenverteilung nach 5.1.9.1
   *
   * >>> OMEGA IST 1.0, UND ZWAR NACH DER NORM. <<<
   *
   * Ziffer 5.1.10.3: «Bei querbelasteten Staeben und verschieblichen Rahmen
   * duerfen die Gleichungen (50) und (51) naeherungsweise auch verwendet
   * werden, wobei omega = 1,0 einzusetzen ist.» Der Mast ist ein
   * querbelasteter Stab - Wind ueber die ganze Hoehe -, also gilt 1.0. Das
   * ist zugleich der unguenstigste Wert; die Abstufung 0.6 + 0.4 psi der
   * Ziffer 5.1.9.1 gilt nur bei linearem Momentenverlauf.
   *
   * >>> DER KIPPWIDERSTAND IST DER BIEGEWIDERSTAND. <<<
   *
   * Weisung vom 13. September: «das kippen nicht einbauen.» M_D,Rd nach
   * 4.5.2 wird deshalb nicht gerechnet; an seine Stelle tritt M_y,Rd nach
   * 5.1.3. Beim eingespannten Stiel mit Momenten um beide Achsen ist das
   * die uebliche Annahme - sie steht im Bericht, damit sie nachgeprueft
   * werden kann.
   *
   * >>> UND DAS MOMENT ZWEITER ORDNUNG. <<<
   *
   * Es steckt im Faktor 1/(1 - N_Ed/N_cr). Die Norm verlangt N_Ed und M_Ed
   * ausdruecklich «nach Theorie 1. Ordnung (ohne Ersatzimperfektionen)» -
   * genau das liefert der Schnitt. Ein zusaetzliches N mal delta waere eine
   * zweite Erfassung derselben Wirkung.
   * ===================================================================== */
  const omega = 1.0;                       // 5.1.10.3, querbelasteter Stab
  const NKyRd = (chiY * NRk) / gammaM1;    // 4.5.1.3
  const NKzRd = (chiZ * NRk) / gammaM1;
  const NKRd = Math.min(NKyRd, NKzRd);
  const MyRd = MRy / gammaM1;              // 5.1.3
  const MzRd = MRz / gammaM1;
  const MDRd = MyRd;                       // Kippen nicht gefuehrt (Weisung)
  /*
   * DER VERGROESSERUNGSFAKTOR BRAUCHT N_Ed < N_cr. Ist er es nicht, ist der
   * Stab schon ausgeknickt - dann meldet der Nachweis das, statt eine
   * negative Zahl weiterzureichen.
   */
  const ausgeknickt = NEd >= NcrY * 0.999 || NEd >= NcrZ * 0.999;
  const vy = ausgeknickt ? 1 : 1 - NEd / NcrY;
  const vz = ausgeknickt ? 1 : 1 - NEd / NcrZ;
  const eta50 = ausgeknickt ? Infinity
    : NEd / NKRd + (omega / vy) * (MyEd / MDRd) + (omega / vz) * (MzEd / MzRd);

  /* =======================================================================
   * >>> GLEICHUNG (51), Ziffer 5.1.10.2 - die zulaessige Alternative. <<<
   * =======================================================================
   *
   * «Falls das Knicken aus der Ebene und das Kippen nicht verhindert sind,
   * DARF bei doppeltsymmetrischen I-Querschnitten ... der Stabilitaetsnachweis
   * mit folgender Interaktionsbeziehung durchgefuehrt werden»:
   *
   *   (omega_y M_y,Ed / M_y,red,Rd)^beta + (omega_z M_z,Ed / M_z,red,Rd)^beta <= 1
   *
   *   M_y,red,Rd = M_D,Rd,min (1 - N_Ed/N_K,Rd,min)(1 - N_Ed/N_cr,y)
   *                jedoch <= omega_y M_D,Rd
   *   M_z,red,Rd = M_z,Rd (1 - N_Ed/N_K,Rd,min)(1 - N_Ed/N_cr,z)
   *   beta       = 0.4 + N_Ed/N_Rd + b/(h - t_f)        jedoch beta >= 1
   *
   * >>> SIE WIRD GERECHNET, ABER SIE IST NICHT DER NACHWEIS. <<<
   *
   * «darf» heisst: die Norm laesst die Wahl. Gefuehrt wird (50) - sie gilt
   * ohne Bedingung und ist die strengere. (51) steht im Bericht daneben,
   * damit sichtbar ist, was die Alternative ergaebe; wer sie fuehren will,
   * entscheidet das und nicht das Werkzeug.
   */
  const NRd = (A * fy) / 1000 / gammaM1;   // Querschnittswiderstand Druck
  const beta51 = Math.max(1, 0.4 + NEd / NRd + p.b / (p.h - p.tf));
  const MyredRd = ausgeknickt ? 0
    : Math.min(MDRd * (1 - NEd / NKRd) * (1 - NEd / NcrY), omega * MDRd);
  const MzredRd = ausgeknickt ? 0
    : MzRd * (1 - NEd / NKRd) * (1 - NEd / NcrZ);
  const eta51 = (MyredRd > 0 && MzredRd > 0)
    ? (omega * MyEd / MyredRd) ** beta51 + (omega * MzEd / MzredRd) ** beta51
    : Infinity;

  return {
    beta, Lcr, gammaM1, zN, L,
    /*
     * DIE MASSEN, WIE SIE ANGESETZT WURDEN - nicht wie sie im Modell
     * stehen. Der Bericht fuehrt genau diese Liste auf; ohne sie waere
     * `zN` eine Zahl ohne Herkunft.
     */
    massen, zAnschluss: einzel ? null : zAnschluss, ueberAnschluss,
    NEd, MqEd, MlEd, MyEd, MzEd, NRk, MRq, MRl, MRy, MRz,
    NcrY, NcrZ, lamY, lamZ, chiY, chiZ, alphaY, alphaZ,
    knicklinie: { y: schlank ? 'a' : 'b', z: schlank ? 'b' : 'c' },
    // --- SIA 263, Ziffer 5.1.10 ------------------------------------------
    omega, NKyRd, NKzRd, NKRd, MyRd, MzRd, MDRd, NRd, beta51,
    MyredRd, MzredRd, ausgeknickt,
    /** Vergroesserungsfaktoren 1/(1 - N/N_cr) der beiden Ebenen. */
    vy: 1 / vy, vz: 1 / vz,
    /** Der Nachweis: Gleichung (50). */
    eta: eta50,
    eta50, eta51,
    /*
     * DIE ALTEN NAMEN BLEIBEN, damit Bericht und Kontrollen nicht an einer
     * Umbenennung haengen - sie tragen jetzt die SIA-Gleichungen.
     */
    etaQuer: eta50, etaLaengs: eta51,
    massgebend: 'Gleichung (50), SIA 263 Ziffer 5.1.10.1',
    // Unter dieser Schlankheit verlangt die Norm keinen Knicknachweis.
    ohneNachweis: lamY <= 0.2 && lamZ <= 0.2,
  };
}

/* ===========================================================================
 * >>> DIE TORSION AM OFFENEN PROFIL - WÖLBKRAFTTORSION. <<<
 * ===========================================================================
 *
 * Weisung vom 15. September: den Torsionsnachweis am Masten nachziehen,
 * «Vlasov, wie gerechnet».
 *
 * >>> WARUM NICHT EINFACH τ = M_t·t/I_t. <<<
 *
 * Weil ein I-Profil offen ist. Die Torsion zerfällt in zwei Anteile: den
 * ST.-VENANT-Anteil (umlaufender Schub in den Blechen) und die
 * WÖLBKRAFTTORSION (die beiden Flansche biegen sich gegenläufig aus). Wie
 * sie sich teilen, hängt von der Stelle ab — und am EINGESPANNTEN FUSS, wo
 * der Nachweis massgebend wird, ist die Verdrillung θ′ = 0. Dort trägt
 * St. Venant NICHTS; die ganze Torsion läuft über die Wölbung.
 *
 * Ein Nachweis mit τ_t allein wäre ausgerechnet am kritischen Schnitt leer.
 *
 * >>> DER WÖLBWIDERSTAND KOMMT AUS DEM SORTIMENT, OHNE NEUE ZAHL. <<<
 *
 * Für ein doppelt-symmetrisches I-Profil ist
 *
 *      I_w = I_z · h_m² / 4          h_m = h − t_f   (Flanschmittenabstand)
 *
 * Beim HEB 240 gibt das 487 700 cm⁶ gegen 486 900 cm⁶ der Profiltabelle —
 * genau genug, und `I_z` steht ohnehin im Mastsortiment. Eine Spalte mehr
 * in `data.masten.js` hätte gepflegt werden müssen; diese Formel nicht.
 *
 * >>> DIE LÖSUNG. <<<
 *
 * Kragarm, am Fuss wölbeingespannt (θ = θ′ = 0), am Kopf wölbfrei (B = 0).
 * Mit dem Abklingbeiwert k = √(G·I_t / (E·I_w)) ist das Bimoment
 *
 *      B(z) = (M_zz / k) · sinh(k·(z_o − z)) / cosh(k·z_o)
 *
 * — am Fuss (M_zz/k)·tanh(k·z_o), am Kopf null. Daraus die Flanschbiegung
 * B/h_m und mit dem Widerstandsmoment EINES Flansches W_f = t_f·b²/6 die
 * Normalspannung σ_ω.
 *
 * >>> ZWEI ANNAHMEN, DIE MAN KENNEN MUSS. <<<
 *
 * 1. DER FUSS IST WÖLBEINGESPANNT. Ein einbetonierter Mast ist es
 *    praktisch; bewiesen ist es nicht. Ohne Wölbeinspannung gäbe es kein
 *    Bimoment — und der Mast könnte die Torsion gar nicht abtragen.
 * 2. DER KOPF IST WÖLBFREI. Das Joch hält ihn in der Lage, nicht in der
 *    Verwölbung.
 *
 * >>> UND WIE GROSS DAS WIRD. <<<
 *
 * HEB 240 über 8 m, M_zz = 5 kNm: 1/k = 111 cm Abklinglänge, B = 55 600
 * kNcm², σ_ω = 153 N/mm². Bei f_y = 235 allein η ≈ 0.65. Die Torsion am
 * offenen Profil ist keine Nebengrösse.
 *
 * @param {object} p   Mastprofil - h, b, t_f in MILLIMETERN, I_z und I_t
 *                     in cm (so fuehrt sie `data.masten.js`)
 * @param {number} zO  Höhe der obersten Lasteinleitung [m]
 * @returns {object|null} {k, Iw, hm, Wf, sigma(Mzz, z)} — null ohne Werte
 * ========================================================================= */
export function woelbtorsion(p, zO) {
  const Iz = Number(p?.Iz), It = Number(p?.It);
  const h = Number(p?.h), b = Number(p?.b), tf = Number(p?.tf);
  if (!(Iz > 0) || !(It > 0) || !(h > 0) || !(b > 0) || !(tf > 0)) return null;
  if (!(zO > 0)) return null;
  /*
   * >>> DAS SORTIMENT MISCHT DIE EINHEITEN. <<<
   *
   * `data.masten.js` fuehrt h, b, t_w, t_f in MILLIMETERN, Flaeche und
   * Traegheitsmomente in cm - so, wie die Profiltabelle sie schreibt.
   * `plastischeWiderstaende` daneben rechnet deshalb mm3 durch 1000.
   * Ungerechnet stuende hier ein Flanschabstand von 223 cm.
   */
  const hm = (h - tf) / 10;                           // mm -> cm
  const Iw = (Iz * hm * hm) / 4;                      // cm^6
  /*
   * G = E / (2·(1+ν)) mit ν = 0.3, also G/E = 1/2.6 - und der E-Modul
   * kuerzt sich heraus. Die Abklinglaenge haengt allein an der Geometrie;
   * eine Stahlsorte aendert sie nicht.
   */
  const k = Math.sqrt(It / (2.6 * Iw));                         // 1/cm
  const Wf = (tf * b * b) / 6 / 1000;                 // mm3 -> cm3, EIN Flansch
  const zOcm = zO * 100;
  return {
    Iw, hm, Wf, k,
    /** Bimoment an der Stelle z [m] aus M_zz [kNm] -> kNcm². */
    bimoment: (Mzz, z) => {
      const zcm = Math.min(Math.max(z * 100, 0), zOcm);
      /*
       * `cosh` waechst schnell - bei k·z_o = 7 sind es schon 550, bei 30
       * ueberlaeuft es. Oberhalb von 20 ist tanh praktisch 1 und der
       * Quotient e^(-k·z); dann wird direkt so gerechnet.
       */
      const a = k * zOcm;
      const f = a > 20 ? Math.exp(-k * zcm)
                       : Math.sinh(a - k * zcm) / Math.cosh(a);
      return ((Math.abs(Mzz) * 100) / k) * f;
    },
    /** Woelbnormalspannung an der Flanschspitze [N/mm²]. */
    sigma(Mzz, z) {
      // kNcm² / (cm · cm³) = kN/cm² -> mal 10 sind N/mm²
      return (this.bimoment(Mzz, z) / (hm * Wf)) * 10;
    },
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

  /* =======================================================================
   * >>> DIE WÖLBSPANNUNG GEHÖRT DAZU (15. September). <<<
   * =======================================================================
   *
   * Sie ist eine NORMALSPANNUNG im Flansch, kein Schub — deshalb addiert
   * sie sich zu den übrigen, und es braucht keine Vergleichsspannung. Die
   * ungünstigste Stelle ist die Flanschspitze, an der auch die Biegung
   * ihren Randwert hat; die Beträge zu addieren ist die sichere Seite.
   *
   * `zO` ist die oberste Stelle, an der etwas eingeleitet wird — bis dahin
   * läuft das Bimoment, darüber ist der Mast torsionsfrei.
   */
  const zO = Math.max(...s.stationen.map((st) => st.z), 0);
  /*
   * >>> GEFÜHRT ODER NICHT (15. September). <<<
   *
   * Weisung: «torsionsnachweis abschalbar machen.» Wie beim Knicken heisst
   * nicht geführt NICHT GERECHNET: σ_ω fällt auf null, statt als Zahl
   * dazustehen, die niemand zählt. Der Grund steht in der Nachweisgruppe
   * `torsionMast` — halten die Leiter den Mastkopf, dreht er sich dort
   * nicht frei, und das Bimoment am Fuss fällt kleiner aus.
   */
  const torsionGefuehrt = o.torsion !== false;
  const wt = torsionGefuehrt ? woelbtorsion(s.profil, zO) : null;
  const stationen = s.stationen.map((st) => {
    // kN, kNm, cm², cm³ -> N/mm²
    const sigN = (Math.abs(st.N) * 10) / A;
    const sigQ = (Math.abs(st.Myy) * 1000) / Wq;
    const sigL = (Math.abs(st.Mxx) * 1000) / Wl;
    const sigW = wt ? wt.sigma(st.Mzz ?? 0, st.z) : 0;
    const sig = sigN + sigQ + sigL + sigW;
    return { ...st, sigN, sigQ, sigL, sigW, sig, eta: sig / fyd };
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
  /*
   * >>> UND ER WIRD GEFUEHRT ODER NICHT (15. September). <<<
   *
   * Weisung: «das knicken des masten deaktivierbar machen. der nachweis ist
   * zu konservativ, da die Leiter (Rückleiter an Mast und die Kettenwerke am
   * Joch) den Masten stabilisieren und somit sich ein andere Lk und Moment
   * einstellt.»
   *
   * Nicht gefuehrt heisst NICHT GERECHNET: eine Zahl, die dastuende und
   * nicht zaehlte, wuerde gelesen. Was fehlt, steht in der Nachweisgruppe
   * `knickenMast` - im Urteil, im Bericht und im Mastblatt.
   */
  const knickenGefuehrt = o.knicken !== false;
  const stabil = knickenGefuehrt
    ? mastStabilitaet(s, m, { beta: o.knickBeiwert, gammaM1: o.gammaM1 })
    : null;
  return {
    ende, ...s, stationen, massgebend, eta: massgebend.eta,
    knickenGefuehrt, torsionGefuehrt,
    fy, fyd, A, Wq, Wl, klasse: kl, plastisch: plWerte,
    /*
     * DER WOELBSATZ WANDERT MIT - die Tabelle nennt die Abklinglaenge, und
     * ohne sie sieht die Spalte sigma_omega aus wie eine Zahl ohne Herkunft.
     * `null`, wo das Profil keine Werte hergibt.
     */
    woelb: wt ? { k: wt.k, Iw: wt.Iw, hm: wt.hm, Wf: wt.Wf } : null,
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
  return mastZusammen(A, B);
}

/**
 * Die beiden Enden zu einem Ergebnis - aus einer Rechnung oder aus einer
 * Huellkurve ueber mehrere (siehe `mastNachweiseHuelle`).
 */
function mastZusammen(A, B) {
  const beide = [A, B].filter(Boolean);
  if (!beide.length) return null;
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
    // Ob das Knicken ueberhaupt gefuehrt wurde - die Anzeige soll den
    // Unterschied zwischen «haelt» und «nicht geprueft» zeigen koennen.
    knickenGefuehrt: beide.every((x) => x.knickenGefuehrt !== false),
    massgebendesEnde: beide.reduce((a, b) => (b.eta > a.eta ? b : a)).ende,
  };
}

/**
 * >>> DIE HUELLKURVE UEBER MEHRERE LASTBILDER (17. September). <<<
 *
 * Am Abfangjoch wird der Mast je Fall gerechnet - der Wind in beiden
 * Richtungen, und das Seil entscheidet je Fall, ob es traegt. Massgebend
 * ist je Ende der Fall mit dem groessten Nachweis; er traegt seinen Namen
 * in `fall`.
 *
 * @param {{fall:string, erg:object}[]} liste  Ergebnisse von mastNachweise
 */
export function mastNachweiseHuelle(liste) {
  let A = null, B = null;
  const wert = (n) => n?.etaMitStabilitaet ?? n?.eta ?? -1;
  (liste ?? []).forEach(({ fall, erg }) => {
    if (!erg) return;
    if (erg.A && wert(erg.A) > wert(A)) A = { ...erg.A, fall };
    if (erg.B && wert(erg.B) > wert(B)) B = { ...erg.B, fall };
  });
  return mastZusammen(A, B);
}
