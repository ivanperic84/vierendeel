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
         linkEinspannung, linkAbweichend,
         mastImModell } from './core.auflager.js';
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


/*
 * DIE ISOMETRIE. Ein Rechtssystem, wie es das Modell fuehrt:
 *
 *      x  Jochachse, quer zum Gleis   nach links unten
 *      y  laengs zum Gleis            nach rechts unten
 *      z  lotrecht                    nach oben
 *
 * Die Zahlen sind Bildpunkte je Einheit, nicht Meter - das Bild erklaert
 * Richtungen, es misst nichts.
 */
const ISO = { x: [-22, 13], y: [22, 13], z: [0, -26] };
const isoP = (o, ax = 0, ay = 0, az = 0) => [
  o[0] + ISO.x[0] * ax + ISO.y[0] * ay + ISO.z[0] * az,
  o[1] + ISO.x[1] * ax + ISO.y[1] * ay + ISO.z[1] * az,
];

export function auflagerDiagrammHtml(werte, art, feld = 'auflagerLinks') {
  const vorgabefeld = feld === 'auflagerVorgabe';
  const lies = (ebene) => (vorgabefeld
    ? linkVorgabe(werte, art, ebene) : linkBedingung(werte, art, ebene));
  const ebenen = linkEbenen(art);
  const gelenk = linkGelenk(art);
  const anschluss = werte.mastAnschluss ?? 'durchlaufend';
  const einPunkt = anschluss === 'kragarm' && !mastImModell(werte);
  const klasse = (v) => (v === 'Rigid' ? 'starr' : v === 'Free' ? 'frei' : 'feder');

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

  // --- Das Bild ------------------------------------------------------------
  /*
   * >>> NAEHER AM MODELL. <<<
   *
   * Weisung: «die isometrie mehr an das modell 3d anlehnen, es ist zu
   * abstrakt.» Zwei Striche und ein Balken zeigten die Lage, aber nicht das
   * Bauteil. Jetzt stehen dort BAENDER in der Farbe der Gurtwinkel, ein
   * Bindeblech dazwischen und ein Mast mit Breite — dieselben Farben wie in
   * der Modellansicht, damit man das eine im anderen wiedererkennt.
   */
  const O = [104, 56];
  const inY = gelenk.paarAchse === 'y';
  const orte = [O, inY ? isoP(O, 0, 1.7, 0) : isoP(O, 0, 0, -1.7)];
  const mAy = inY ? 0.85 : 0.5;

  /** Ein Gurtband: ein schmales Parallelogramm laengs der Jochachse. */
  const band = (p, breite = 7) => {
    const e = isoP(p, 2.5);
    const d = [breite * 0.0, breite];           // Dicke nach unten im Bild
    return `<polygon class="al-gurt-flaeche" points="${p[0]},${p[1]}
      ${e[0]},${e[1]} ${e[0] + d[0]},${e[1] + d[1]} ${p[0] + d[0]},${p[1] + d[1]}"/>`;
  };

  const balken = orte.map((p, i) => {
    const traegt = !einPunkt || i === orte.length - 1;
    return band(p) + (traegt
      ? `<circle class="al-punkt" cx="${p[0]}" cy="${p[1] + 3.5}" r="3.6"/>` : '');
  }).join('');

  // Das Bindeblech zwischen den beiden Ebenen - wie im Modell, in seiner Farbe.
  const blech = einPunkt ? '' : `<polygon class="al-blech" points="${
    isoP(O, 1.6)[0]},${isoP(O, 1.6)[1] + 3} ${
    isoP(O, 1.9)[0]},${isoP(O, 1.9)[1] + 3} ${
    isoP(orte[1], 1.9)[0]},${isoP(orte[1], 1.9)[1] + 3} ${
    isoP(orte[1], 1.6)[0]},${isoP(orte[1], 1.6)[1] + 3}"/>`;

  // Der Mast: ein Band mit Breite, nicht ein Strich.
  const mK = isoP(O, -0.5, mAy, 1.2), mF = isoP(O, -0.5, mAy, -2.4);
  const mast = `<polygon class="al-mast-flaeche" points="${mK[0] - 5},${mK[1]}
    ${mK[0] + 5},${mK[1]} ${mF[0] + 5},${mF[1]} ${mF[0] - 5},${mF[1]}"/>`;

  const arme = orte.map((p, i) => {
    if (einPunkt && i !== orte.length - 1) return '';
    const q = isoP(O, -0.5, mAy, inY ? 0 : (i === 0 ? 0 : -1.7));
    return `<line class="al-link" x1="${p[0]}" y1="${p[1] + 3.5}"
                  x2="${q[0]}" y2="${q[1] + 3.5}"/>`;
  }).join('');

  /*
   * >>> DIE AKTIVEN FREIHEITSGRADE STEHEN IM BILD. <<<
   *
   * Weisung: «die felder zur auswahl kleiner gestalten (einzeiler text) und
   * dafür die aktiven freiheitsgrade in der abbildung darstellen.»
   *
   * Je Ebene ein Pfeil in JEDE Richtung, die gehalten ist — nach der Isometrie
   * ausgerichtet, in der Farbe des Zustands. Was frei ist, steht nicht da;
   * das Bild zeigt die Lagerung, nicht die Liste.
   */
  const halt = orte.map((p, i) => {
    if (einPunkt && i !== orte.length - 1) return '';
    const b = lies(ebenen[i].key);
    const c = [p[0], p[1] + 3.5];
    return wege.map((g) => {
      const v = b[g.key];
      if (v === 'Free') return '';
      const [dx, dy] = ISO[g.key];
      const l = 0.62;
      const x2 = c[0] + dx * l, y2 = c[1] + dy * l;
      const n = Math.hypot(dx, dy) || 1;
      const ux = (dx / n), uy = (dy / n);
      const kopf = `${x2},${y2} ${x2 - ux * 6 - uy * 2.8},${y2 - uy * 6 + ux * 2.8} `
                 + `${x2 - ux * 6 + uy * 2.8},${y2 - uy * 6 - ux * 2.8}`;
      return `<g class="al-halt al-${klasse(v)}">
        <line x1="${c[0]}" y1="${c[1]}" x2="${x2}" y2="${y2}"/>
        <polygon points="${kopf}"/></g>`;
    }).join('');
  }).join('');

  const achsPfeil = (key, laenge) => {
    const v = ISO[key];
    const nx = v[0] * laenge, ny = v[1] * laenge;
    const l = Math.hypot(nx, ny) || 1;
    const ux = nx / l, uy = ny / l;
    const kopf = `${nx},${ny} ${nx - ux * 6 - uy * 2.8},${ny - uy * 6 + ux * 2.8} `
               + `${nx - ux * 6 + uy * 2.8},${ny - uy * 6 - ux * 2.8}`;
    return `<g class="al-achse"><line x1="0" y1="0" x2="${nx}" y2="${ny}"/>
      <polygon points="${kopf}"/>
      <text x="${nx + ux * 8}" y="${ny + uy * 8 + 3}"
            text-anchor="middle">${esc(key)}</text></g>`;
  };

  const bild = `<svg class="al-bild" viewBox="0 0 208 138" role="img"
       aria-label="Auflagerbedingung am Masten, isometrisch">
    ${mast}${arme}${blech}${balken}${halt}
    <text class="al-notiz" x="${mF[0]}" y="${mF[1] + 12}"
          text-anchor="middle">Mast</text>
    <text class="al-notiz" x="${isoP(O, 2.5)[0]}" y="${isoP(O, 2.5)[1] + 16}"
          text-anchor="middle">Feld</text>
    <g class="al-achsen" transform="translate(40,26)">
      ${achsPfeil('x', 0.7)}${achsPfeil('y', 0.7)}${achsPfeil('z', 0.58)}
    </g>
  </svg>`;

  // --- Die Schalter, einzeilig --------------------------------------------
  const reihen = ebenen.map((ebene, i) => {
    const b = lies(ebene.key);
    const stumm = einPunkt && i !== ebenen.length - 1;
    return `<div class="al-reihe${stumm ? ' stumm' : ''}">
      <span class="al-reihe-kopf">${esc(ebene.label)}${
        stumm ? ' — kein Anschluss' : ''}</span>
      <span class="al-chips">${wege.map((g) => {
        const v = b[g.key];
        return `<button type="button" class="al-chip al-grad al-${klasse(v)}"
            data-ebene="${esc(ebene.key)}" data-grad="${esc(g.key)}"
            aria-pressed="${v === 'Rigid'}"${stumm ? ' disabled' : ''}
            title="${esc(`${ebene.label} · ${g.sym} — ${g.label}. ${g.hinweis}`)}"
          >${esc(g.sym.replace('K_', ''))} ${esc(linkZustand(v))}</button>`;
      }).join('')}</span>
    </div>`;
  }).join('');

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

  return `<div class="auflager-links" data-al-feld="${esc(feld)}"
       data-al-art="${esc(art)}">
    ${bild}
    ${reihen}
    <p class="hinweis${e.art === 'eingespannt' ? ' warnt' : ''}">${eText}</p>
    ${klapp(`auflager-federn-${feld}`, 'Federwerte und Drehfedern', federn,
            vorgabefeld ? 'Voreinstellung'
              : (linkAbweichend(werte, art) ? 'von der Vorgabe abweichend'
                                            : 'Vorgabe'),
            false)}
  </div>`;
}
