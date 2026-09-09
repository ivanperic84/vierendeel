/**
 * ui.auflagerlinks.js
 * ---------------------------------------------------------------------------
 * DIE AUFLAGERBEDINGUNG AM MASTEN - BILD UND BEDIENUNG.
 *
 * >>> WARUM EIN EIGENES MODUL. <<<
 *
 * Frage vom 5. September: «haben wir diese eingabe schon als modul
 * ausgelagert?» - Nein, sie lag zur Haelfte in `core.auflager.js` (die
 * Daten) und zur Haelfte mitten in `ui.js` (das Bild). Jetzt sind es drei
 * saubere Schichten:
 *
 *      core.auflager.js     WAS gilt   - Grade, Ebenen, Vorgaben, Einspannung
 *      ui.auflagerlinks.js  WIE es aussieht und sich bedienen laesst
 *      ui.js                WO es steht - in der Maske, unter Optionen
 *
 * Das lohnt sich, weil dasselbe Bild an ZWEI Orten steht: in der Maske als
 * Bedingung dieses Tragwerks, unter Optionen als Voreinstellung. Und weil
 * die naechste Tragwerksart (Tragausleger) es ein drittes Mal braucht.
 *
 * Enthaelt KEINE Rechnung - die steht in core.auflager.js.
 * ---------------------------------------------------------------------------
 */

import { LINK_GRADE, linkEbenen, linkBedingung, linkVorgabe, linkGelenk,
         linkEinspannung, linkAbweichend, linkLabilitaet,
         mastImModell } from './core.auflager.js';
import { skizze, achsenkreuz, pf, mass, knoten, winkel, txt,
         feder } from './doku.skizze.js';
import { klapp, esc } from './design.js';

/**
 * >>> DIE VERDRAHTUNG GILT AN BEIDEN ORTEN. <<<
 *
 * Das Diagramm steht in der Maske (Bedingung dieses Tragwerks) UND im
 * Optionsdialog (Voreinstellung). Der Dialog verdrahtet sonst nur
 * `[data-feld]` - Eingabefelder mit Wert. Ein angeklickter Pfeil ist keines,
 * und ohne diese Funktion waere das Bild dort ein Bild ohne Wirkung.
 */
export function verdrahteAuflagerLinks(container, werte, onChange) {
  /*
   * DIE RAHMENDATEN SAGEN, WOHIN GESCHRIEBEN WIRD. In der Maske steht die
   * Bedingung dieses Tragwerks (`auflagerLinks`), unter Optionen die
   * Voreinstellung (`auflagerVorgabe`) - dasselbe Bild, zwei Ziele.
   */
  const alRahmen = (el) => el.closest('.auflager-links');
  const alLesen = (rahmen, ebene) => (rahmen.dataset.alFeld === 'auflagerVorgabe'
    ? linkVorgabe(werte, rahmen.dataset.alArt, ebene)
    : linkBedingung(werte, rahmen.dataset.alArt, ebene));
  const linkSetzen = (rahmen, ebene, grad, wert) => {
    const feld = rahmen.dataset.alFeld;
    const art = rahmen.dataset.alArt;
    if (feld === 'auflagerVorgabe') {
      const alt = werte.auflagerVorgabe ?? {};
      const je = alt[art] ?? {};
      const eb = { ...linkVorgabe(werte, art, ebene), ...(je[ebene] ?? {}) };
      onChange('auflagerVorgabe',
               { ...alt, [art]: { ...je, [ebene]: { ...eb, [grad]: wert } } });
      return;
    }
    const alt = werte.auflagerLinks ?? {};
    const eb = { ...linkBedingung(werte, art, ebene), ...(alt[ebene] ?? {}) };
    onChange('auflagerLinks', { ...alt, [ebene]: { ...eb, [grad]: wert } });
  };
  container.querySelectorAll('.al-grad').forEach((g) => {
    const um = () => {
      const rahmen = alRahmen(g);
      if (!rahmen) return;
      const v = alLesen(rahmen, g.dataset.ebene)[g.dataset.grad];
      // Eine gesetzte Feder faellt beim Klick auf «starr» zurueck; sonst
      // liesse sie sich nur ueber das Zahlenfeld wieder loswerden.
      linkSetzen(rahmen, g.dataset.ebene, g.dataset.grad,
                 Number.isFinite(v) ? 'Rigid' : (v === 'Rigid' ? 'Free' : 'Rigid'));
    };
    g.addEventListener('click', um);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); um(); }
    });
  });
  container.querySelectorAll('[data-al-feder]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const rahmen = alRahmen(inp);
      if (!rahmen) return;
      const roh = inp.value.trim().replace(',', '.');
      const z = Number(roh);
      // Leer heisst: zurueck auf den Schaltzustand. Eine Zahl heisst Feder.
      if (!roh) {
        const v = alLesen(rahmen, inp.dataset.alFeder)[inp.dataset.grad];
        linkSetzen(rahmen, inp.dataset.alFeder, inp.dataset.grad,
                   Number.isFinite(v) ? 'Rigid' : v);
        return;
      }
      if (!Number.isFinite(z) || z < 0) return;
      linkSetzen(rahmen, inp.dataset.alFeder, inp.dataset.grad, z);
    });
  });

}

/* ===========================================================================
 * DIE AUFLAGERBEDINGUNG AM MASTEN - ANKLICKBAR
 * ===========================================================================
 *
 * Weisung vom 5. September: «die Auflagerbedingung sollten anpassbar sein in
 * der app, am besten mit einem interaktiven diagramm (richtungsfeder und
 * drehfeder ein aus schalten koennen) und beim aufklappen kann man die
 * einzelnen Federeigenschaften der einzelnen gurte noch anpassen.»
 *
 * >>> WARUM EIN BILD UND KEINE SECHS HAKEN. <<<
 *
 * Sechs Haken mit den Namen K_X bis K_ZZ beantworten die Frage nicht, die
 * man hat: welche Richtung ist x? Das Bild zeigt das Jochende am Masten von
 * der Seite - zwei Gurtebenen, dazwischen der Riegel, daneben der Mast - und
 * setzt die Pfeile dorthin, wo die Kraft wirklich angreift. Ein AUSGEFUELLTER
 * Pfeil haelt, ein OFFENER laesst los.
 *
 * >>> DREI ZUSTAENDE, NICHT ZWEI. <<<
 *
 * Ein Freiheitsgrad ist starr, frei ODER eine Feder. Der Klick schaltet
 * zwischen den ersten beiden - das ist der Regelfall und muss schnell gehen.
 * Die Feder ist die Ausnahme; sie steht im aufgeklappten Teil als Zahl, je
 * Gurtebene. Wer eine setzt, sieht sie im Bild als gestrichelten Pfeil.
 */

/** Kurzzeichen fuer den Zustand, fuer Titel und Vorlesehilfe. */
function linkZustand(v) {
  if (v === 'Rigid') return 'starr';
  if (v === 'Free') return 'frei';
  return `Feder ${v}`;
}

/**
 * Das Diagramm eines Jochendes am Masten.
 *
 * >>> DIE ACHSEN SIND DIE DES MODELLS. <<<
 *
 * Weisung vom 5. September: «die vertikale ist z, die jochachse (quer zum
 * Gleis) x, die y achse ist die längs zum Gleis.»
 *
 * Der erste Wurf hatte y senkrecht und z waagrecht — genau vertauscht. In
 * einem Bild, das die Richtungen erklären soll, ist das der einzige Fehler,
 * der wirklich zählt.
 *
 * Gezeichnet ist der Blick LÄNGS ZUM GLEIS, also in y-Richtung. Damit liegt
 *
 *      x  waagrecht        die Jochachse, ins Feld hinein
 *      z  senkrecht        lotrecht
 *      y  in die Tiefe     längs zum Gleis — schräg gezeichnet
 *
 * >>> DIE DREHUNGEN OHNE KREISE. <<<
 *
 * Weisung: «es braucht die einzelnen strichlierten kreise nicht.» Drei
 * ineinandergeschachtelte Bögen je Ebene waren sechs Kreise im Bild und
 * beantworteten keine Frage — welcher gehört zu welcher Achse, sah man
 * ihnen nicht an. Sie stehen jetzt als drei kleine Marken am
 * Anschlusspunkt: Kürzel, Zustand, anklickbar.
 */
/*
 * >>> DASSELBE BILD AN ZWEI ORTEN. <<<
 *
 * Weisung vom 5. September: «Die Voreinstellung der Auflagerbedingungen
 * sollte noch unter optionen aufgeführt sein und anpassbar.»
 *
 * In der Maske steht die Bedingung DIESES Tragwerks, unter Optionen die
 * Voreinstellung für jedes neue. Beides ist dieselbe Frage in derselben
 * Form; sie zweimal zu zeichnen hiesse, sie zweimal zu pflegen.
 *
 * `feld` sagt, wohin geschrieben wird, `lesen` woher gelesen. Mehr
 * unterscheidet die beiden nicht.
 */

/*
 * ===========================================================================
 * DAS BILD IST ISOMETRISCH, DIE BEDIENUNG STEHT DANEBEN
 * ===========================================================================
 *
 * Weisung vom 5. September: «diese abbildung ist etwas unübersichtlich. und
 * man sucht die stelle zum anklicken, da viele elemente sehr nahe oder
 * übereinander sind. würde es sinn machen diese als isometrie darzustellen.»
 *
 * >>> ZWEI FEHLER IN EINEM. <<<
 *
 * Der erste Wurf war eine SEITENANSICHT, und darin fallen zwei der drei
 * Achsen zusammen: y zeigte in die Tiefe und musste als Marke danebenstehen,
 * während x und z als Pfeile gingen. Drei Richtungen, zwei Darstellungsarten
 * — man sah dem Bild nicht an, dass es dieselbe Frage dreimal stellt.
 *
 * Der zweite: Bild UND Bedienung waren dasselbe Element. Ein Pfeil von
 * dreissig Pixel ist eine schöne Zeichnung und ein schlechter Knopf, und wo
 * sechs davon um einen Punkt stehen, trifft man den falschen.
 *
 * >>> JETZT GETRENNT. <<<
 *
 * ISOMETRIE zeigt, was wo steht: die drei Achsen in drei verschiedene
 * Richtungen, die beiden Gurtebenen dort, wo sie liegen — beim Tragjoch
 * übereinander in z, beim Abfangjoch nebeneinander in y —, und der Mast
 * daneben. Sie erklärt und lässt sich nicht anklicken.
 *
 * SCHALTFLÄCHEN darunter, je Gurtebene eine Reihe von sechs. Gross,
 * beschriftet, mit dem Zustand als Wort. Wer etwas ändern will, findet es.
 * =========================================================================== */


/* ===========================================================================
 * ANSICHT UND SCHNITT - IM STIL DES HANDBUCHS
 * ===========================================================================
 *
 * Weisung vom 9. September: «die darstellung ist zu abstrakt und passt nicht
 * zum rest, mach bei der darstellung der Auflager, eine ansicht und schnitt,
 * so im stil wie im handbuch hinterlegt.»
 *
 * >>> WARUM DIE ISOMETRIE WEG IST. <<<
 *
 * Sie war ein DRITTER Stil im Werkzeug: das Handbuch zeichnet
 * Strichzeichnungen mit Massen und Achsen, die Modellansicht zeigt Koerper -
 * und dazwischen stand ein Bild, das keines von beidem war. Farbige Baender
 * in schiefer Projektion sehen aus wie ein Modell und tragen doch kein Mass;
 * wer wissen will, WO der Anschlusspunkt sitzt, liest es einer Isometrie
 * ohne Bemassung nicht ab.
 *
 * Der Bauingenieur liest ANSICHT UND SCHNITT. Zwei Bilder, jedes in seiner
 * Ebene, mit den Massen dran - dasselbe Blattpaar, das auf jeder
 * Werkstattzeichnung steht. Gezeichnet wird mit den Bausteinen des
 * Handbuchs (`doku.skizze.js`), nicht mit nachgebauten.
 *
 * >>> WELCHE ZWEI. <<<
 *
 * Die beiden Anschlussebenen muessen in BEIDEN Bildern getrennt zu sehen
 * sein, sonst zeigt das eine nur einen Punkt. Sie liegen beim Tragjoch in z
 * auseinander, beim Abfangjoch in y:
 *
 *   Tragjoch     Laengsbild = ANSICHT   (Blick in y)   x waagrecht, z senkrecht
 *   Abfangjoch   Laengsbild = GRUNDRISS (Blick in z)   x waagrecht, y senkrecht
 *   beide        Querbild   = SCHNITT   (Blick in x)   y waagrecht, z senkrecht
 *
 * >>> DIE FREIHEITSGRADE STEHEN AM PUNKT. <<<
 *
 * Die beiden Richtungen IN der Bildebene als Doppelpfeil - eine Halterung
 * sperrt beide Seiten, ein einzelner Pfeil sagte etwas anderes. Die dritte,
 * die aus der Ebene zeigt, als Kreis UM den Anschlusspunkt: das Zeichen fuer
 * senkrecht zur Zeichenebene, und es sitzt genau dort, wo es hingehoert.
 *
 * Eine FEDER ist ein Zickzack in derselben Richtung, ein gestrichelter Kreis
 * aus der Ebene. Was FREI ist, wird nicht gezeichnet - das Bild zeigt die
 * Lagerung, nicht die Liste.
 * =========================================================================== */

/** Haelt dieser Grad? (Dieselbe Regel wie im Rechenkern: Feder 0 haelt nicht.) */
const haelt = (v) => v === 'Rigid' || (Number.isFinite(v) && v > 0);
const istFeder = (v) => Number.isFinite(v) && v > 0;

/**
 * Die Halterung in einer Richtung DER BILDEBENE.
 *
 * @param {number[]} p   Anschlusspunkt
 * @param {number[]} ri  Einheitsrichtung im Bild
 * @param {*} v          Zustand des Freiheitsgrads
 */
function haltEbene(p, ri, v) {
  if (!haelt(v)) return '';
  const kl = istFeder(v) ? 'hf' : 'hs';
  const [ux, uy] = ri;
  const a = 6.5, l = 9.5;                 // Abstand vom Punkt, Laenge
  const zeichen = istFeder(v)
    /*
     * Die Feder steht auf EINER Seite. Ein Zickzack in beide Richtungen
     * waere ein Bauteil, das es nicht gibt; der Doppelpfeil dagegen meint
     * die gesperrte Richtung, nicht zwei Bauteile.
     */
    ? feder(p[0] + ux * a, p[1] + uy * a, ux, uy, l + 6, kl)
    : pf(p[0] + ux * a, p[1] + uy * a, p[0] + ux * (a + l), p[1] + uy * (a + l), kl)
      + pf(p[0] - ux * a, p[1] - uy * a, p[0] - ux * (a + l), p[1] - uy * (a + l), kl);
  return zeichen;
}

/**
 * Die Halterung SENKRECHT ZUR BILDEBENE: ein Kreis um den Anschlusspunkt.
 * Gestrichelt, wenn es eine Feder ist.
 */
function haltTiefe(p, v) {
  if (!haelt(v)) return '';
  const kl = istFeder(v) ? 'hf' : 'hs';
  return `<circle class="${kl}" cx="${p[0]}" cy="${p[1]}" r="7" fill="none"${
    istFeder(v) ? ' stroke-dasharray="3 2.4"' : ''}/>`;
}

/** Punkt, Halterungen und Beschriftung an einer Anschlussebene. */
function anschluss(p, b, achsen, label) {
  return knoten(p[0], p[1], 3.6)
    + haltEbene(p, achsen.hRi, b[achsen.h])
    + haltEbene(p, achsen.vRi, b[achsen.v])
    + haltTiefe(p, b[achsen.t])
    + (label ? txt(p[0] - 11, p[1] - 10, label, 'dim', 'end') : '');
}

export function auflagerDiagrammHtml(werte, art, feld = 'auflagerLinks') {
  const vorgabefeld = feld === 'auflagerVorgabe';
  const lies = (ebene) => (vorgabefeld
    ? linkVorgabe(werte, art, ebene) : linkBedingung(werte, art, ebene));
  const ebenen = linkEbenen(art);
  const gelenk = linkGelenk(art);
  const anschlussArt = werte.mastAnschluss ?? 'durchlaufend';
  const einPunkt = anschlussArt === 'kragarm' && !mastImModell(werte);
  const klasse = (v) => (v === 'Rigid' ? 'starr' : v === 'Free' ? 'frei' : 'feder');
  const traegt = (i) => !einPunkt || i === ebenen.length - 1;

  /*
   * >>> NUR DIE DREI WEGFEDERN. <<<
   *
   * Weisung vom 5. September: «die drehfeder ergibt sich aus den angaben zu
   * den einfachen federn, man könnte diese auch weglassen.» Sie ist am
   * Linkelement wirkungslos — der Anschluss besteht aus ZWEI Punkten im
   * Abstand der Jochhöhe, und ihr Kräftepaar IST die Einspannung. Was sie
   * ergibt, steht darunter als Zahl (`linkEinspannung`).
   *
   * Die drei Drehungen bleiben im aufgeklappten Teil einstellbar — wer sie
   * braucht, findet sie; wer nicht, sieht sie nicht.
   */
  const wege = LINK_GRADE.filter((g) => g.art === 'kraft');

  // Die Ebenen liegen in z auseinander (Tragjoch) oder in y (Abfangjoch).
  const inY = gelenk.paarAchse === 'y';

  /*
   * >>> BEIDE BILDER IM SELBEN MASSSTAB. <<<
   *
   * Gleiche viewBox und gleiche Flexbreite heisst: ein Strich ist hier so
   * dick wie dort, und die beiden Gurtebenen liegen in beiden Bildern auf
   * DERSELBEN Hoehe. Das Auge verbindet die zwei Bilder dann von selbst -
   * genau das, was Ansicht und Schnitt auf einem Zeichnungsblatt tun.
   */
  /*
   * >>> UND ZWAR KLEINER. <<<
   *
   * Weisung vom 9. September: «kannst du die diagramme etwas kleiner
   * gestalten.» In der schmalen Spalte stehen sie untereinander; mit 200
   * Einheiten Hoehe je Bild fuellten die beiden zusammen fast die halbe
   * Maske, bevor der erste Schalter kam.
   *
   * Gekuerzt wird der LEERRAUM, nicht die Zeichnung: die Ebenen ruecken
   * zusammen, der Mast wird nicht laenger als noetig, und die Beschriftung
   * sitzt dichter am Bauteil. Die Strichstaerken bleiben, wie sie waren -
   * das Bild wird flacher, nicht kleiner gedruckt.
   */
  const BB = [264, 128];                  // Bildfeld beider Skizzen
  const yE = [44, 88];                    // die beiden Ebenen, in beiden Bildern

  /* --- Das Laengsbild: Ansicht bzw. Grundriss ----------------------------
   *
   * Der Mast steht rechts, das Feld laeuft nach links hinaus - dieselbe
   * Leserichtung wie in der Modellansicht und auf dem Querprofil.
   */
  const mastL = 210, gurtE = 178;         // Mastkante, Ende der Gurte
  /*
   * >>> UND DAS BILD ZEIGT, OB DER MAST DURCHLAEUFT. <<<
   *
   * Weisung vom 9. September, als Frage: «braucht es diese abbildung noch
   * wenn wir die beiden neuen auflagerabbildungen haben, könnte man auch
   * diese nutzen.» - Gemeint war die Optionsskizze am Feld «Anschluss ans
   * Joch»: Mast, zwei Gurte, ein Anschluss ueber die Jochhoehe oder in einem
   * Punkt.
   *
   * Nein, es braucht sie nicht mehr. Sie zeigte dasselbe Jochende wie dieses
   * Bild, nur in einem zweiten Stil und einem Feld weiter oben - und seit
   * beide in derselben Gruppe «Auflager» stehen, sieht man die Dopplung.
   * Die Faktoren, die sie anschrieb (1.45 bzw. 1.00 · E·I/H), stehen ohnehin
   * in den Namen der Auswahl.
   *
   * Was sie konnte und dieses Bild noch nicht: die LAGE des Mastendes. Der
   * durchlaufende Mast steht ueber der Anschlussebene, der Kragmast endet
   * dort. Ein Mass, kein Beiwert - jetzt steht es hier.
   */
  const kragmast = anschlussArt === 'kragarm';
  const mastOben = kragmast ? yE[0] : 12;
  const laengs = [
    // Der Mast als Bauteil, nicht als Strich.
    `<rect class="kasten" x="${mastL}" y="${mastOben}" width="22" height="${
      108 - mastOben}"/>`,
    txt(mastL + 11, 120, 'Mast', 'dim'),
    txt(mastL + 11, mastOben - 5, kragmast ? 'endet hier' : 'läuft durch', 'dim'),
    // Systemachse des Jochs.
    `<line class="d" x1="28" y1="66" x2="248" y2="66"/>`,
    txt(34, 78, 'Feld', 'dim', 'start'),
    /*
     * >>> DIE BLECHE SIND HIER NUR BAUTEIL, NICHT THEMA. <<<
     *
     * Weisung vom 9. September: «kannst du hier die orangen elemente gleich
     * machen wie die restlichen linien des jochträgers. diese sind nicht so
     * wichtig hier sondern die lagerung.»
     *
     * Sie standen in der Blechfarbe des Modells - orange Flaechen, das
     * Auffaelligste im Bild, obwohl das Bild von der LAGERUNG handelt. Jetzt
     * dieselbe Linie wie die Gurte: der Traeger ist da, und was ihn haelt,
     * ist das einzige Farbige.
     */
    ...yE.map((y) => `<line class="b" x1="32" y1="${y}" x2="${gurtE}" y2="${y}"/>`),
    ...[68, 122].map((x) =>
      `<line class="b" x1="${x}" y1="${yE[0]}" x2="${x}" y2="${yE[1]}"/>`),
    // Das Linkelement je Ebene: vom Gurtende zum Masten.
    ...yE.map((y, i) => (traegt(i)
      ? `<line class="link" x1="${gurtE}" y1="${y}" x2="${mastL}" y2="${y}"/>` : '')),
    mass(20, yE[0], 20, yE[1], inY ? 'b' : 'h'),
  ].join('');

  const achsenL = inY
    ? { h: 'x', hRi: [-1, 0], v: 'y', vRi: [0, -1], t: 'z' }
    : { h: 'x', hRi: [-1, 0], v: 'z', vRi: [0, -1], t: 'y' };
  const punkteL = yE.map((y, i) => (traegt(i)
    ? anschluss([gurtE, y], lies(ebenen[i].key), achsenL, esc(ebenen[i].key))
    : '')).join('');

  /* --- Das Querbild: Schnitt in der Jochachse ---------------------------
   *
   * Blick INS Feld hinein, der Mast steht dahinter - deshalb ist er
   * gestrichelt: was hinter der Schnittebene liegt, wird nicht ausgezogen.
   */
  const cx = BB[0] / 2;
  const quer = [`<rect class="verdeckt" x="${cx - 12}" y="22" width="24" height="82"/>`,
                txt(cx, 122, 'Mast dahinter', 'dim')];
  const punkteQ = [];
  const achsenQ = { h: 'y', hRi: [1, 0], v: 'z', vRi: [0, -1], t: 'x' };
  if (inY) {
    // Abfangjoch: zwei Gurte NEBENEINANDER, Bindebleche oben und unten.
    const px = [cx - 42, cx + 42];
    // Die Bleche als Linie, wie die Gurte - siehe oben.
    quer.push(`<line class="b" x1="${px[0]}" y1="${yE[0] + 12}" x2="${px[1]}" y2="${yE[0] + 12}"/>`);
    quer.push(`<line class="b" x1="${px[0]}" y1="${yE[1] - 12}" x2="${px[1]}" y2="${yE[1] - 12}"/>`);
    quer.push(px.map((x) => winkel(x, 66, 13)).join(''));
    quer.push(mass(px[0], 108, px[1], 108, 'b'));
    px.forEach((x, i) => punkteQ.push(traegt(i)
      ? anschluss([x, 66], lies(ebenen[i].key), achsenQ, esc(ebenen[i].key)) : ''));
  } else {
    // Tragjoch: je Ebene zwei Winkel, dazwischen die Vertikalbleche.
    const bx = [cx - 40, cx + 40];
    quer.push(yE.map((y) =>
      `<line class="b" x1="${bx[0]}" y1="${y}" x2="${bx[1]}" y2="${y}"/>`
      + bx.map((x) => winkel(x, y, 10)).join('')).join(''));
    quer.push(bx.map((x) =>
      `<line class="b" x1="${x}" y1="${yE[0]}" x2="${x}" y2="${yE[1]}"/>`).join(''));
    quer.push(mass(bx[0], 108, bx[1], 108, 'b'));
    quer.push(mass(bx[1] + 24, yE[0], bx[1] + 24, yE[1], 'h'));
    yE.forEach((y, i) => punkteQ.push(traegt(i)
      ? anschluss([cx, y], lies(ebenen[i].key), achsenQ, esc(ebenen[i].key)) : ''));
  }

  /*
   * >>> DIE ACHSEN STEHEN IM BILD, UNTEN LINKS. <<<
   *
   * Weisung vom 9. September: «kannst du noch ein kleines achsystem jeweils
   * unten links aufführen, damit man besser die richtungen nachvollziehen
   * kann.»
   *
   * Vorher nannte sie nur die Unterschrift - ein Satz, den man liest und im
   * Kopf auf das Bild legt. Das Kreuz zeigt die zwei Richtungen der
   * Bildebene als Pfeil und die dritte als Kreis, dasselbe Zeichen, das am
   * Anschlusspunkt die Halterung senkrecht zur Ebene meint.
   *
   * Ein Buchstabe an jedem Halterungspfeil waere die Alternative gewesen -
   * sechsmal dasselbe, und was FREI ist, bekaeme gar keinen.
   */
  const kreuz = (a) => achsenkreuz([22, BB[1] - 18], a, 12);

  /*
   * DIE UNTERSCHRIFT NENNT DIE ART DES BILDES, nicht mehr die Achsen - die
   * stehen jetzt darin. «Ansicht» und «Schnitt» tragen die Auszeichnung,
   * weil sie sagen, WAS man sieht (Weisung: «kannst du noch die anschrift
   * Ansicht und Schnitt etwas sichtbarer machen»).
   */
  const bild = `<div class="al-bilder">${
    skizze(inY ? 'Grundriss — Blick von oben' : 'Ansicht — Blick in Gleisrichtung',
           `0 0 ${BB[0]} ${BB[1]}`, laengs + punkteL + kreuz(achsenL), 'al-skizze',
           `<b>${inY ? 'Grundriss' : 'Ansicht'}</b> — Blick ${
             inY ? 'von oben' : 'in Gleisrichtung'}`)}${
    skizze('Schnitt — Blick in die Jochachse',
           `0 0 ${BB[0]} ${BB[1]}`, quer.join('') + punkteQ.join('') + kreuz(achsenQ),
           'al-skizze', '<b>Schnitt</b> — Blick in die Jochachse')}</div>`;

  // --- Die Schalter, einzeilig --------------------------------------------
  /*
   * >>> DIE SCHALTER STEHEN ALS MATRIX. <<<
   *
   * Weisung vom 9. September: «die buttons für die eingabe geordneter
   * darstellen. eventuell als matrix darstellen.»
   *
   * Sie standen als zwei Reihen zu dritt, und jeder Knopf trug seine ganze
   * Angabe: «X Feder 5000», «Y starr», «Z frei». Damit war jeder Knopf
   * anders breit, die Spalten fluchteten nicht, und die Achse stand sechsmal
   * da - obwohl sie in einer Matrix EINMAL oben steht.
   *
   *                    X          Y          Z
   *      Obergurte   [5000]    [starr]    [frei]
   *      Untergurte  [starr]   [starr]    [starr]
   *
   * Was in der Zelle steht, ist der ZUSTAND - und nur er. Die Achse sagt die
   * Spalte, die Gurtebene die Zeile. Eine Feder nennt ihre Zahl; dass es
   * eine Feder ist, sagt die Farbe, die auch die Einspannung darunter traegt.
   */
  const matrix = `<div class="al-matrix">
    <span></span>${wege.map((g) => `<span class="al-mkopf"
        title="${esc(`${g.sym} — ${g.label}. ${g.hinweis}`)}">${
        esc(g.key.toUpperCase())}</span>`).join('')}
    ${ebenen.map((ebene, i) => {
      const b = lies(ebene.key);
      const stumm = einPunkt && i !== ebenen.length - 1;
      return `<span class="al-mzeile${stumm ? ' stumm' : ''}"
          title="${esc(stumm ? `${ebene.label} — kein Anschluss` : ebene.label)}"
        >${esc(ebene.label)}</span>${wege.map((g) => {
        const v = b[g.key];
        return `<button type="button" class="al-chip al-grad al-${klasse(v)}"
            data-ebene="${esc(ebene.key)}" data-grad="${esc(g.key)}"
            aria-pressed="${v === 'Rigid'}"${stumm ? ' disabled' : ''}
            title="${esc(`${ebene.label} · ${g.sym} — ${g.label}: ${
              linkZustand(v)}${Number.isFinite(v) ? ' kN/m' : ''}. ${g.hinweis}`)}"
          >${esc(Number.isFinite(v) ? String(v) : linkZustand(v))}</button>`;
      }).join('')}`;
    }).join('')}
  </div>`;

  /*
   * >>> UND DASSELBE KREUZ STEHT BEI DEN FEDERWERTEN. <<<
   *
   * Weisung vom 9. September: «und auch bei der eingabe manuell von hand
   * unter federwerte.»
   *
   * Dort stehen zwoelf Felder mit Namen wie K_X und K_YY - und das Bild
   * darueber ist beim Aufklappen ausser Sicht. Ohne Kreuz muesste man sich
   * merken, wohin x zeigt; mit ihm steht die Zuordnung neben der Zahl, die
   * man gerade eintippt. Es zeigt ALLE DREI Richtungen, weil dort auch die
   * Drehungen einstellbar sind.
   */
  const federKreuz = skizze('Achsen des Modells', '0 0 210 76',
    achsenkreuz([32, 46], { h: 'x', hRi: [-1, 0], v: 'z', vRi: [0, -1], t: 'y' }, 20)
    + txt(78, 30, 'x  Jochachse', 'dim', 'start')
    + txt(78, 46, 'y  Gleisrichtung (⊙)', 'dim', 'start')
    + txt(78, 62, 'z  lotrecht', 'dim', 'start'),
    'al-skizze al-achsbild', '');

  const federn = ebenen.map((ebene) => {
    const b = lies(ebene.key);
    return `<div class="al-federn"><b>${esc(ebene.label)}</b>${
      LINK_GRADE.map((g) => {
        const v = b[g.key];
        return `<label class="al-feder" title="${esc(g.hinweis)}">
          <span>${esc(g.sym)}</span>
          <input type="text" data-al-feder="${esc(ebene.key)}"
                 data-grad="${esc(g.key)}"
                 value="${esc(v === 'Rigid' || v === 'Free' ? '' : String(v))}"
                 placeholder="${v === 'Rigid' ? 'starr' : 'frei'}">
          <small>${esc(g.einheit)}</small></label>`;
      }).join('')}</div>`;
  }).join('');

  /*
   * >>> WAS DIE FEDERN ERGEBEN, STEHT DA. <<<
   *
   * Weisung: «man könnte diese anzeige auch dazu nutzen, damit man sieht
   * welche einspannung im modell wirkt bei der eingabe der obigen einfachen
   * wegfeder.» Genau das: die beiden Wegfedern in Reihe über den Hebelarm.
   */
  const h = Number(werte.h) || (Number(werte.jd) || 0) / 1000;
  const e = linkEinspannung(werte, art, h);
  const umText = e.um === 'yy' ? 'y (Vertikalbiegung)' : 'z (waagrechte Biegung)';
  const eText = e.art === 'gelenk'
    ? `<b>Gelenk um ${umText}</b> — eine Ebene lässt längs los, das Kräftepaar `
      + 'kann sich nicht bilden.'
    : e.art === 'eingespannt'
      ? `<b>Eingespannt um ${umText}</b> — beide Ebenen halten längs. Das `
        + 'Moment läuft voll in den Masten.'
      : `<b>c_φ ≈ ${e.cPhi.toFixed(0)} kNm/rad</b> um ${umText} — aus den `
        + `beiden Wegfedern über den Hebelarm ${e.h.toFixed(3)} m.`;
  /*
   * >>> SIE TRAEGT DIE FARBE IHRES ZUSTANDS. <<<
   *
   * Weisung vom 9. September: «Die daraus berechnete drehsteifigkeit farbig
   * machen so wie die buttons.»
   *
   * Dieselben drei Farben wie die Schaltflaechen darueber, und aus demselben
   * Grund: sie ist deren ERGEBNIS. Gelenk liest sich wie «frei», eingespannt
   * wie «starr», eine Zahl wie eine Feder - wer die Schalter aendert, sieht
   * die Farbe darunter mitgehen.
   *
   * Vorher war einzig «eingespannt» gefaerbt, und zwar in der Warnfarbe: das
   * sagte «Achtung», wo «starr» gemeint war.
   */
  const eKlasse = e.art === 'gelenk' ? 'al-frei'
    : e.art === 'eingespannt' ? 'al-starr' : 'al-feder';

  /*
   * >>> UND OB DAS SYSTEM UEBERHAUPT STEHT. <<<
   *
   * Weisung vom 9. September: «zudem noch warnung wenn system labil
   * gelagert». Sie steht ZUOBERST, ueber allem anderen: was die Einspannung
   * ergibt, ist gleichgueltig, wenn das Joch als Ganzes davonlaeuft.
   * `linkLabilitaet` nennt die Bewegung, die frei geblieben ist - das ist
   * der Satz, den ein Programmabbruch mit «singulaere Matrix» nicht liefert.
   */
  const lab = linkLabilitaet(werte, art, { einPunkt, lies });
  const labilHtml = lab.labil
    ? `<p class="al-labil"><b>Labil gelagert</b> — das Tragwerk kann sich als `
      + 'Ganzes bewegen, ohne dass eine Feder sich dehnt: '
      + lab.moden.map((m) => `${m.art === 'drehung' ? 'Drehung' : 'Verschiebung'} `
                           + `${esc(m.text)}`).join('; ')
      + '. Ein Stabwerksprogramm bricht damit ab.</p>'
    : '';

  return `<div class="auflager-links" data-al-feld="${esc(feld)}"
       data-al-art="${esc(art)}">
    ${bild}
    ${labilHtml}
    ${matrix}
    <p class="al-einspannung ${eKlasse}">${eText}</p>
    ${klapp(`auflager-federn-${feld}`, 'Federwerte und Drehfedern',
            federKreuz + federn,
            vorgabefeld ? 'Voreinstellung'
              : (linkAbweichend(werte, art) ? 'von der Vorgabe abweichend'
                                            : 'Vorgabe'),
            false)}
  </div>`;
}
