/**
 * doku.handbuch.js
 * ---------------------------------------------------------------------------
 * HANDBUCH: Herleitung des Rechenwegs und Grenzen des Modells.
 *
 * Warum es dieses Blatt gibt
 * --------------------------
 * Ein Werkzeug, dessen Rechenweg man nicht nachvollziehen kann, ist für einen
 * Nachweis unbrauchbar - man kann es nicht prüfen und darf ihm deshalb nicht
 * glauben. Hier steht deshalb in einem Zug, was aus welcher Annahme folgt,
 * welche Formel gerechnet wird und wo das Modell endet.
 *
 * Der Text ist bewusst NICHT aus dem Programm abgeleitet, sondern von Hand
 * geschrieben und gegen den Rechenkern gehalten. Jede Formel hier hat ihre
 * Entsprechung in einer benannten Funktion; die Datei steht jeweils dabei, so
 * dass man vom Satz zur Zeile kommt.
 *
 * Reine Darstellung: kein Rechnen, kein Zustand, nur Text.
 * ---------------------------------------------------------------------------
 */

const f = (t) => `<div class="hb-f">${t}</div>`;
const q = (t) => `<p class="hb-q">${t}</p>`;

// --- Bausteine der Skizzen ---------------------------------------------------
/**
 * Eine Skizze sagt in zwei Sekunden, wofür der Text zwei Absätze braucht -
 * aber nur, wenn sie dasselbe meint. Alle Skizzen hier sind deshalb aus den
 * Grössen der Formeln aufgebaut und tragen deren Bezeichnungen, nicht eigene.
 *
 * Gezeichnet wird in SVG mit Klassen statt festen Farben: so folgt die Skizze
 * dem hellen wie dem dunklen Thema, und Bauteilfarben (Stahl, Blech) sind
 * dieselben wie im Modell.
 */
const skizze = (titel, viewBox, inhalt) =>
  `<figure class="hb-skizze">
     <svg viewBox="${viewBox}" role="img" aria-label="${titel}">${inhalt}</svg>
     <figcaption>${titel}</figcaption>
   </figure>`;

/** Linie mit Pfeilspitze. Die Spitze wird gerechnet, nicht über einen Marker
 *  gelegt - Marker erben die Farbe nicht zuverlässig. */
const pf = (x1, y1, x2, y2, kl = 'k') => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const L = 7.5, w = 3.2;
  const px = x2 - L * Math.cos(a), py = y2 - L * Math.sin(a);
  const p1 = `${(px + w * Math.sin(a)).toFixed(1)},${(py - w * Math.cos(a)).toFixed(1)}`;
  const p2 = `${(px - w * Math.sin(a)).toFixed(1)},${(py + w * Math.cos(a)).toFixed(1)}`;
  return `<line class="${kl}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>` +
         `<path class="${kl}f" d="M${x2} ${y2}L${p1}L${p2}z"/>`;
};

/** Masslinie mit Pfeilen an beiden Enden und Text in der Mitte. */
const mass = (x1, y1, x2, y2, text, dy = -4) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const senk = Math.abs(x2 - x1) < Math.abs(y2 - y1);
  return pf(mx, my, x1, y1, 'm') + pf(mx, my, x2, y2, 'm') +
    `<text class="dim" x="${senk ? mx + 5 : mx}" y="${senk ? my + 3 : my + dy}"` +
    ` text-anchor="${senk ? 'start' : 'middle'}">${text}</text>`;
};

/** Anschlusspunkt / Knoten. */
const knoten = (x, y, r = 4) => `<circle class="kn" cx="${x}" cy="${y}" r="${r}"/>`;

/** Eckwinkel im Querschnitt, als kleines Quadrat auf der Schwerachse. */
const winkel = (x, y, s = 9) =>
  `<rect class="st" x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}"/>`;

/** Kraft aus der Ebene heraus (⊙) bzw. in sie hinein (⊗). */
const raus = (x, y, r = 6) =>
  `<circle class="k" cx="${x}" cy="${y}" r="${r}" fill="none"/><circle class="kf" cx="${x}" cy="${y}" r="1.8"/>`;
const rein = (x, y, r = 6) =>
  `<circle class="k" cx="${x}" cy="${y}" r="${r}" fill="none"/>` +
  `<line class="k" x1="${x - r * 0.7}" y1="${y - r * 0.7}" x2="${x + r * 0.7}" y2="${y + r * 0.7}"/>` +
  `<line class="k" x1="${x + r * 0.7}" y1="${y - r * 0.7}" x2="${x - r * 0.7}" y2="${y + r * 0.7}"/>`;

const txt = (x, y, s, kl = '', anker = 'middle') =>
  `<text class="${kl}" x="${x}" y="${y}" text-anchor="${anker}">${s}</text>`;

/**
 * Die Abschnitte des Handbuchs.
 * Jeder trägt seine Kennung (für das Inhaltsverzeichnis und den Sprung), einen
 * Titel und den Rumpf als HTML.
 */
export const HANDBUCH = [

// ===========================================================================
{
  id: 'zweck',
  titel: '1 · Zweck und Geltungsbereich',
  html: `
<p>Dieses Werkzeug bemisst <b>Tragjoche für Fahrleitungsanlagen</b>: gegliederte
Träger aus vier Winkelprofilen, die über Bindebleche zu einem geschlossenen
Kasten verbunden sind. Ober- und Untergurt bestehen aus je zwei Winkeln; die Bindebleche stehen
in vier Ebenen (zwei senkrecht, zwei liegend) und machen aus den vier
Einzelstäben einen <b>Vierendeelträger</b> - einen Rahmen ohne Diagonalen.</p>

<p>Gerechnet wird der Nachweis der <b>Tragsicherheit</b> im Feld: Normalkraft und
örtliche Biegung der vier Gurtwinkel, Biegung und Schub der Bindebleche, dazu
wahlweise der Mast am Fuss.</p>

${q(`Das Werkzeug ist eine <b>Vorbemessung und Kontrollrechnung</b>. Es ersetzt
weder eine geprüfte Statik noch die Beurteilung durch den verantwortlichen
Ingenieur. Was es nicht rechnet, steht vollständig in Abschnitt 10.`)}

<h4>Grundlagen</h4>
<table class="dt">
<tr><td>Sortimentstabelle</td><td>Laufmeterlasten Eigengewicht, Wind und Schnee
  je Jochtyp – aus der geladenen Typendatenbank</td></tr>
<tr><td>Blecheinteilung</td><td>Konstruktionszeichnung und Schemablatt mit
  Mass-Tabelle – aus der geladenen Typendatenbank</td></tr>
<tr><td>Einwirkungen FL</td><td>Leiterzugkräfte und Angriffsflächen der
  Anbauteile – aus der geladenen Lasttabelle</td></tr>
<tr><td>Regelwerk</td><td>SIA 260 / 261 bzw. RTE der Bahnen (wählbar),
  Querschnittsklassen nach EN 1993-1-1</td></tr>
</table>

<p class="notiz">Die Blecheinteilung der Zeichnung wird unverändert übernommen.
Sie ist Bauteilgeometrie und wird vom Werkzeug nie angepasst – auch dann nicht,
wenn eine andere Teilung rechnerisch günstiger wäre.</p>
`,
},

// ===========================================================================
{
  id: 'achsen',
  titel: '2 · Achsen, Vorzeichen und Masse',
  html: `
<table class="dt">
<tr><th>Achse</th><th>Richtung</th><th>Nullpunkt</th></tr>
<tr><td>x</td><td>entlang der Jochachse</td><td>linkes Auflager</td></tr>
<tr><td>y</td><td>Gleisrichtung (quer zum Joch)</td><td>Jochmitte im Grundriss</td></tr>
<tr><td>z</td><td>vertikal, <b>positiv nach oben</b></td><td>Anschlussebene des Teils</td></tr>
</table>

<p>Kräfte tragen dieselben Indizes. <code>F_z</code> ist positiv nach unten
angeschrieben – Lasten hängen –, alle übrigen folgen der Achse.</p>

<h4>Der Nullpunkt von z</h4>
<p>Das Mass <code>z</code> eines Anbauteils zählt <b>ab der Schwerachse des
Gurtes, an dem es angeschlagen ist</b>, nicht ab einer gedachten Jochmitte. Eine
Hängestütze von 1.35 m ist damit genau so lang, wie sie in der Zeichnung
angeschrieben steht.</p>

<p>Das Torsionsmoment des Ersatzbalkens bezieht sich dagegen auf die
<b>Jochachse</b>. Zwischen beiden liegt die halbe Jochhöhe, und genau die trennt
Zeichnungsmass und Hebelarm:</p>

${f(`z_A = +h/2 (Anschluss Obergurt) &nbsp;·&nbsp; z_A = −h/2 (Untergurt)<br>
<b>e_v = −( z_A + z )</b> &nbsp;&nbsp; Hebelarm zur Jochachse, positiv nach unten`)}

${skizze('Querschnitt: z zählt ab der Anschlussebene, e_v ab der Jochachse. ' +
         'z ist hier negativ (nach unten), e_v positiv — das Vorzeichen kehrt sich um.',
  '0 0 430 250', [
    // Gurtachsen und Winkel
    `<line class="b" x1="140" y1="58" x2="286" y2="58"/>`,
    `<line class="b" x1="140" y1="178" x2="286" y2="178"/>`,
    winkel(148, 58), winkel(278, 58), winkel(148, 178), winkel(278, 178),
    txt(213, 48, 'Obergurt', 'dim'),
    txt(213, 170, 'Untergurt = Anschlussebene', 'dim'),
    // Jochachse
    `<line class="d" x1="140" y1="118" x2="360" y2="118"/>`,
    txt(356, 112, 'Jochachse', 'dim', 'end'),
    // Hängestütze mit Knoten
    `<line class="b" x1="213" y1="178" x2="213" y2="232"/>`,
    knoten(213, 232),
    pf(213, 232, 288, 232), txt(296, 236, 'F_y', 'acc', 'start'),
    // Masse
    mass(122, 58, 122, 178, 'h'),
    mass(330, 118, 330, 178, 'z_A = &minus;h/2'),
    mass(248, 178, 248, 232, 'z'),
    mass(374, 118, 374, 232, 'e_v'),
    // Hilfslinien
    `<line class="hl" x1="292" y1="232" x2="384" y2="232"/>`,
    `<line class="hl" x1="213" y1="178" x2="340" y2="178"/>`,

  ].join(''))}

<p>Bei durchgehender Befestigung – ein Teil, das an beiden Gurten angeschlagen
ist – entscheidet das Vorzeichen von <code>z</code> je Modul: was nach oben ragt,
wird am Obergurt abgegriffen, was hängt, am Untergurt.</p>

${q(`Diese Unterscheidung ist nicht nebensächlich. Beim J90 sind es 225 mm, und
für eine Hängestütze mit z = −1.35 m wächst der Hebelarm damit von 1.35 auf
1.60 m – <b>rund 17 % mehr Torsion</b>.`)}

<p class="hb-quelle">core.anbauteile.js · <code>hebelarmZuAchse</code>,
<code>anschlussGurt</code></p>
`,
},

// ===========================================================================
{
  id: 'einwirkungen',
  titel: '3 · Einwirkungen',
  html: `
<h4>3.1 Vier Einwirkungsgruppen</h4>
<p>Jede Last gehört genau einer Gruppe an. Ein Lastfall ist nichts weiter als ein
Satz von vier Beiwerten dazu.</p>

<table class="dt">
<tr><th>Gruppe</th><th>Art</th><th>Was darin läuft</th></tr>
<tr><td>G</td><td>ständig</td><td>Eigengewicht Joch und Anbauteile,
  Umlenkkraft aus dem Leiterzug</td></tr>
<tr><td>Wind x</td><td>veränderlich</td><td>Windkraft <b>in Jochachse</b> – nur
  aus den Anbauteilen (Q_x)</td></tr>
<tr><td>Wind y</td><td>veränderlich</td><td>Windkraft <b>in Gleisrichtung</b> –
  Laufmeterlast w_k auf das Joch und Q_y der Anbauteile</td></tr>
<tr><td>Schnee</td><td>veränderlich</td><td>Laufmeterlast auf das Joch,
  veränderliche Vertikallasten der Anbauteile (Q_z)</td></tr>
</table>

<p><b>Warum der Wind in zwei Gruppen läuft.</b> Wind hat keine feste Richtung.
Die Lasttabelle führt für jedes Bauteil eine Angriffsfläche quer und eine längs
zum Gleis – das sind zwei Windrichtungen, die nicht gleichzeitig auftreten.
Getrennt geführt kann jede Richtung mit + und − in die Kombination gehen; damit
steht der Wind, wie er in Wirklichkeit steht: von beiden Seiten.</p>

<p>Die <b>ständigen</b> Einwirkungen behalten ihre feste Wirkrichtung und werden
nicht gespiegelt. Wohin die Umlenkkraft zeigt, entscheidet die Geometrie über das
Vorzeichen des Radius.</p>

<h4>3.2 Verteilte Lasten</h4>
<p>Die Werte der Sortimentstabelle sind bereits fertig gerechnete
<b>Laufmeterlasten</b> [kN/m] und charakteristisch. Sie werden unverändert
übernommen – es wird nichts mehr mit einer Fläche multipliziert. Die
Referenzwerte in kN/m² (Staudruck 0.90 / 1.10 / 1.30, Schnee 0.90 / 1.25) dienen
nur der Einordnung: an ihnen liest man ab, für welchen Standort die gewählte
Klasse gilt. Der massgebende Staudruck ist nach SIA 261 zu bestimmen und mit der
gewählten Einwirkungsklasse zu vergleichen.</p>

<h4>3.3 Umlenkkraft aus dem Bogen</h4>
<p>Liegt das Gleis im Bogen, knickt die Fahrleitung an jeder Aufhängung um den
Ablenkwinkel α. Die beiden Leiterzugkräfte der angrenzenden Spannweiten haben
deshalb eine Resultierende quer zum Gleis – am Tragjoch also in Richtung der
Jochachse:</p>

${f(`α = 2 · arcsin( L / 2R )<br>
<b>U = 2 · Z · sin(α/2) = Z · L / R</b>`)}

${skizze('Grundriss: die Fahrleitung knickt an jeder Aufhängung um α',
  '0 0 430 214', [
    // Trasse als Bogen
    `<path class="d" d="M40 118 Q215 26 390 118"/>`,
    txt(44, 150, 'Trasse (Radius R)', 'dim', 'start'),
    // Fahrleitung als Sehnenzug
    `<line class="b" x1="40" y1="118" x2="215" y2="74"/>`,
    `<line class="b" x1="215" y1="74" x2="390" y2="118"/>`,
    // Nachbaraufhängungen
    knoten(40, 118, 3.4), knoten(390, 118, 3.4), knoten(215, 74, 5),
    txt(215, 62, 'Tragjoch', 'dim'),
    // Leiterzugkräfte
    pf(160, 88, 92, 105), txt(120, 84, 'Z', 'acc'),
    pf(270, 88, 338, 105), txt(310, 84, 'Z', 'acc'),
    // Ablenkwinkel
    `<path class="m" d="M176 84 Q215 112 254 84"/>`,
    txt(215, 106, '&alpha;', 'dim'),
    // Umlenkkraft
    pf(215, 74, 215, 162), txt(224, 152, 'U = Z · L/R', 'acc', 'start'),
    txt(215, 182, 'in Richtung der Jochachse', 'dim'),
    mass(40, 200, 215, 200, 'L (Spannweite der Fahrleitung)'),
  ].join(''))}

<p>Die zweite Gleichheit ist <b>exakt</b> und keine Näherung: aus
α/2 = arcsin(L/2R) folgt unmittelbar sin(α/2) = L/2R. Das Vorzeichen von R (oder
ein am Modul gesetzter Winkel) bestimmt die Bogenseite und damit die Richtung
der Umlenkung.</p>

${q(`Die Umlenkkraft ist eine <b>ständige</b> Einwirkung: der Leiterzug steht
immer an, unabhängig von Wind und Schnee. Sie mit einem Windbeiwert zu belegen
wäre falsch, und sie kehrt sich auch nicht mit dem Wind um.`)}

<h4>3.4 Lastfälle</h4>
<p><b>Zuoberst stehen die einzelnen Lastarten, jede für sich und
charakteristisch</b> – Ständig, Anbauteile, Schnee, Wind y, Wind x, dazu alles
zusammen. Alle Beiwerte 1.00. Sie sind kein Nachweis, sondern der Massstab: nur
an einer einzelnen Lastart lässt sich ablesen, ob der Lastweg stimmt, und nur so
ist die Rechnung gegen ein FEM-Modell zu halten, das seine Lastfälle ebenfalls
einzeln ausweist.</p>

<table><tr><th>Lastfall</th><th>zeigt</th></tr>
<tr><td>Ständig (Joch)</td><td>Eigengewicht des Jochs, ohne Anbauteile</td></tr>
<tr><td>Anbauteile ständig</td><td>nur die ständigen Lasten der Anbauteile</td></tr>
<tr><td>Schnee · Wind y · Wind x</td><td>je eine Einwirkung allein</td></tr>
<tr><td>Ständig + Wind</td><td>alles zusammen, ohne Beiwerte</td></tr></table>

<p>Die ersten beiden ergänzen sich zur vollen ständigen Last; getrennt geführt,
weil ihr Lastweg verschieden ist – die Laufmeterlast liegt auf den Gurten, die
Anbauteillast hängt an vier Punkten und bringt Torsion mit.</p>

<p>Darauf folgen die <b>Nachweislastfälle</b>: je Windrichtung sowie für Schnee
ein leitender Fall mit beiden Vorzeichen.</p>

${f(`γ_G · G &nbsp;±&nbsp; γ_Q · W &nbsp;+&nbsp; γ_Q · ψ₀ · S &nbsp;&nbsp;(Wind leitend)<br>
γ_G · G &nbsp;±&nbsp; γ_Q · ψ₀ · W_y &nbsp;+&nbsp; γ_Q · S &nbsp;&nbsp;(Schnee leitend)`)}

<p>SIA 260: γ_G = 1.35, γ_Q = 1.50. <b>RTE: einheitlich 1.30 – das ist die
Vorgabe.</b> ψ₀ = 0.50. Eigene Lastfälle mit freien Beiwerten – auch negativen –
sind jederzeit möglich; das Werkzeug weist abweichende Beiwerte als solche aus.</p>

${q(`Die Vorgabe ist nicht SIA 260, sondern der Bahnsatz. Aus dem geprüften
Referenzprojekt sind alle 46 Kombinationen ausgezählt: auf ständige Lastfälle
kommen nur 1.0 und 1.30 vor, auf veränderliche 1.30 und 0.65 = 1.30 · 0.50.
Nie 1.35 oder 1.50. <b>γ_Q 1.50 gegen 1.30 sind 15 % auf jede veränderliche
Einwirkung</b> – über den Katalog gerechnet 7.5 bis 9.6 % auf die Ausnutzung.`)}

<h4>3.5 Gebrauchstauglichkeit</h4>
<p>Alle ständigen Beiwerte 1.0, die veränderlichen abgemindert. Geführt wird
<b>nur die seltene Stufe</b>: leitende Einwirkung 1.00, begleitende 0.50.</p>

<p>Die <b>häufige</b> Stufe des Referenzprojekts (ψ = 0.70 leitend, 0.35 = 0.70 ·
0.50 begleitend) ist bewusst weggelassen. Sie verdoppelt die Zahl der Lastfälle,
ohne einen Nachweis zu bedienen, den dieses Werkzeug führt; wer sie braucht,
ergänzt sie als eigenen Lastfall.</p>

${q(`Auch die seltene Stufe ist <b>kein Nachweis</b>. Sie liefert die
Schnittgrössen für Verformungsbetrachtungen – der Nachweis der
Gebrauchstauglichkeit selbst (Durchbiegung, Verdrehung des Jochs,
Querverschiebung der Mastköpfe und damit die Solllage des Fahrdrahts) ist im
Werkzeug <b>nicht geführt</b>. Sie erscheint deshalb nicht in η.`)}

<p class="hb-quelle">core.lasten.js · core.trasse.js</p>
`,
},

// ===========================================================================
{
  id: 'system',
  titel: '4 · Statisches System',
  html: `
<p>Das Joch wird als <b>Einfeldträger der Spannweite L mit Drehfedern an beiden
Enden</b> gerechnet. Damit lassen sich gelenkig, teilweise und voll eingespannt
mit einem einzigen Formelsatz abbilden.</p>

${skizze('Ersatzbalken mit Drehfedern; der Momentenverlauf hängt an ihrer Steifigkeit',
  '0 0 430 236', [
    // Gleichlast
    `<line class="hl" x1="60" y1="38" x2="370" y2="38"/>`,
    [0, 1, 2, 3, 4, 5, 6].map((i) => pf(60 + i * 51.7, 38, 60 + i * 51.7, 66, 'm')).join(''),
    txt(378, 44, 'q_d', 'acc', 'start'),
    // Balken
    `<line class="b" x1="60" y1="72" x2="370" y2="72"/>`,
    // Auflager mit Drehfeder
    ...[60, 370].map((x) => `<path class="st2" d="M${x} 72 L${x - 9} 90 L${x + 9} 90 z"/>` +
      `<path class="m" d="M${x - 15} 72 a15 15 0 1 1 9 13.8"/>`),
    txt(60, 108, 'c_&phi;,A', 'dim'), txt(370, 108, 'c_&phi;,B', 'dim'),
    // Momentenverlauf
    `<line class="hl" x1="60" y1="158" x2="370" y2="158"/>`,
    `<line class="m" x1="60" y1="136" x2="370" y2="136"/>`,
    `<path class="k" d="M60 136 Q215 232 370 136"/>`,
    mass(60, 158, 60, 136, 'M_A', 8),
    txt(215, 130, 'Anteil der St&uuml;tzmomente', 'dim'),
    txt(215, 200, 'M_y(x)', 'acc'),
    txt(215, 226, 'gelenkig: c_&phi; = 0, die gerade Linie liegt auf der Nulllinie', 'dim'),
    mass(60, 92, 370, 92, 'L', 14),
  ].join(''))}

<h4>4.1 Drehfeder aus dem Mast</h4>
<p>Ein am Fuss eingespannter Kragmast der Höhe H hat am Kopf gegenüber einem
Moment die Drehsteifigkeit</p>

${f(`c_φ = E · I_Mast / H`)}

<p>Massgebend ist die Biegung des Mastes <b>in der Jochachse</b> – der Mast muss
sich quer zu den Gleisen verformen. Je nach Stegrichtung ist das I_y oder I_z.</p>

<h4>4.1.1 Verschieblich oder nicht – der grösste Einzelfehler dieser Feder</h4>
<p>Die Formel oben gilt für einen Kragmast, dessen Kopf sich frei
<b>verschieben</b> kann. Ein Joch steht aber auf <b>zwei</b> Masten und bindet
ihre Köpfe zusammen. Unter symmetrischer Vertikallast entstehen an beiden Enden
gleichsinnige Stützmomente, die Querkräfte der beiden Maste heben sich auf –
der Rahmen verschiebt sich <b>nicht</b>. Dann gilt nicht der Kragmast, sondern
der unverschiebliche Stab:</p>

${f(`verschieblich&nbsp;&nbsp;&nbsp;&nbsp; c = 1.0 · E·I/H<br>
unverschieblich&nbsp;&nbsp; c = 4.0 · E·I/H&nbsp;&nbsp; (Drehwinkelverfahren)`)}

<p>Nachgemessen an zwei ganz verschiedenen Rahmen – beide Maste ausmodelliert,
Füsse eingespannt, Joch an beiden Ebenen angeschlossen:</p>

${f(`Signaljoch 18.935 m, HEB 260/7.8 m gegen HEM 240/12.0 m&nbsp;&nbsp;
c = 12 030 = <b>3.11</b> · E·I/H<br>
J90 15.5 m, zwei gleiche HEB 260/7.5 m&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
c = 12 906 = <b>3.09</b> · E·I/H`)}

<p>Zwei Spannweiten, zwei Mastpaare, gleiche und ungleiche Enden – und derselbe
Faktor. Er liegt unter dem Lehrbuchwert 4.00, weil das Joch steif, aber nicht
starr ist. Gerechnet wird mit <b>3.10</b>.</p>

<table><tr><th>Einwirkung</th><th>Rahmen</th><th>Feder</th></tr>
<tr><td>Eigengewicht, Schnee, Wind in Gleisrichtung</td>
    <td>gleichsinnige Stützmomente, kein Verschieben</td>
    <td><b>3.10 · E·I/H</b></td></tr>
<tr><td>Wind in Jochachse</td>
    <td>beide Köpfe in dieselbe Richtung, der Rahmen verschiebt sich</td>
    <td>Kragmast, Anschlussfaktor 1.00 / 1.45</td></tr></table>

${q(`Bis hierher galt für beides der Kragmast. Für die Vertikallastfälle war die
Feder damit rund dreimal zu weich: das vergrösserte das Feldmoment (sichere
Seite) und <b>verkleinerte das Stützmoment</b> – am verjüngten Jochende die
unsichere. Über den Katalog gerechnet steigt die Ausnutzung nur um 1 bis 5 %,
das <b>Stützmoment aber um 25 bis 65 %</b>. Damit greift auch die Begrenzung
durch die Gurtverbindung deutlich früher.`)}

<p>Die frühere Kalibrierung des Anschlussfaktors (1.37 bzw. 1.45) ist damit für
Vertikallasten <b>überholt</b>: sie stammt aus einem Modell, dessen Jochende
sich verschieben konnte, und nannte für das J90 ein Feldmoment von 10.27 kNm –
der Rahmen mit beiden Masten liefert 8.22 kNm. Im verschieblichen Fall gilt sie
weiter.</p>

<h4>4.2 Nur die vertikale Biegung wird eingespannt</h4>
${q(`Die Einspannung wirkt ausschliesslich auf M_y. Eine Einspannung gegen M_z
würde die <b>Torsionssteifigkeit</b> des Mastes beanspruchen; bei offenen
H-Profilen ist diese so gering, dass das Joch für Wind sinnvollerweise gelenkig
gelagert bleibt.`)}

<h4>4.3 Wind auf den Mast verdreht das Jochende</h4>
<p>Der Wind in der Jochachse drückt nicht nur gegen das Joch, sondern auch
gegen den <b>Mast</b>. Der Mast biegt sich, sein Kopf verdreht sich – und weil
das Jochende dort angeschlossen ist, wird ihm diese Verdrehung
<b>aufgezwungen</b>. Das ist keine Last auf dem Joch, sondern eine
Auflagerverdrehung:</p>

${f(`θ₀ = w_Mast · H³ / (6 · E · I_Mast)`)}

<p>Das Federgesetz am Jochende lautet damit nicht mehr M = −c·θ, sondern</p>

${f(`M = −c · (θ − θ₀)`)}

<p>Hält das Joch den Mastkopf vollständig fest (θ = 0), leitet der Mast
M₀ = c·θ₀ = w·H²/6 ein – genau das Moment, das ein am Fuss eingespannter und am
Kopf drehfest gehaltener Mast unter Gleichlast abgibt. Beide Enden verdrehen
sich <b>gleichsinnig</b>; das Joch wird dadurch in Gegenkrümmung gebogen, das
eine Stützmoment wächst, das andere fällt.</p>

${q(`Ohne diesen Anteil fehlt dem Lastfall Wind in Jochachse die grössere
Hälfte der Einwirkung. Im nachgerechneten Signaljoch trägt der Wind auf die
beiden Maste 6.10 kN gegenüber 6.42 kN auf den Anbauteilen. Das Werkzeug lag in
diesem Lastfall rund 80 % zu tief; mit dem Anteil trifft das Bindeblech den
Vergleichswert auf 2 %, die Gurte bleiben 30 bis 45 % darunter.`)}

<h4>4.4 Wind auf den Mast in Gleisrichtung – nicht angesetzt</h4>
<p>Dieser Wind biegt den Mast quer zur Jochachse. Am Jochende kommt zweierlei
an, und <b>keines von beiden wird gerechnet</b>.</p>

<p><b>Die Verschiebung des Auflagerpunktes richtet nichts an.</b> Im Grundriss
ist das Joch an beiden Enden gelenkig gelagert und ohne Drehfeder – eine
Einspannung dort würde die Torsionssteifigkeit des offenen Mastprofils
beanspruchen, die zu gering ist (Abschnitt 4.2). Ein statisch bestimmt
gelagerter Träger bekommt aus Auflagerverschiebungen keine Schnittgrössen, auch
aus ungleichen nicht: das Joch dreht sich im Grundriss als Ganzes.</p>

<p><b>Die Verdrehung des Mastkopfes um die Jochachse wäre eine Torsion</b> –
aber nur, wenn die beiden Enden sich <b>ungleich</b> verdrehen, also nur bei
zwei verschiedenen Masten:</p>

${f(`φ₀ = w_quer · H³ / (6 · E · I_quer)<br>
T₀ = (φ₀B − φ₀A) / (1/c_T,A + 1/c_T,B)`)}

${q(`<b>Dieser Term ist herausgenommen.</b> Er war hergeleitet, nicht geeicht,
und gegen das eine verfügbare FEM-Modell hat er die Übereinstimmung deutlich
verschlechtert: die Gurte unter Wind quer liefen von +52 auf +89 % hoch, ohne
dass das Modell dort mehr Beanspruchung zeigt. Die Herleitung nimmt das Joch
als torsionsstarr an – die obere Schranke – und legt die volle
Differenzverdrehung auf die beiden Mastfedern. Das ist zu viel. Wer den Anteil
führen will, setzt ihn als eigenes Torsionsmoment an einem Anbauteil an und
hält das im Bericht fest.`)}

<p><b>Beide Windrichtungen.</b> Der verbleibende Mastwind in Jochachse hängt am
vorzeichenbehafteten Beiwert des Lastfalls und kehrt mit ihm um, genau wie die
Einwirkungen auf das Joch selbst. Er wirkt <b>antimetrisch</b>: was das eine
Ende im Lastfall Wind +x bekommt, bekommt das andere bei Wind −x. Die Hüllkurve
über die Lastfälle deckt damit beide Enden und beide Drehsinne ab.</p>

<h4>4.5 Auflagermomente</h4>
<p>Aus dem Drehwinkelverfahren mit K = EI/L und den Volleinspannmomenten FEM;
θ₀ ist die aufgezwungene Verdrehung des Auflagerpunktes (Abschnitt 4.3, ohne
Mastwind null):</p>

${f(`(4K + c_A) θ_A + 2K θ_B = −FEM_AB + c_A · θ₀A<br>
2K θ_A + (4K + c_B) θ_B = −FEM_BA + c_B · θ₀B<br>
M_AB = 2K (2θ_A + θ_B) + FEM_AB`)}

<p>Die Biegesteifigkeit des gegliederten Jochs folgt der Zwei-Gurt-Idealisierung
(Eigenträgheitsmomente der Winkel vernachlässigt, bei gegliederten Trägern
wenige Prozent):</p>

${f(`I = h² · A_o · A_u / ( A_o + A_u )`)}

<h4>4.6 Kragarme – das Auflager steht nicht immer am Gurtende</h4>
<p>L ist die Länge der <b>Gurte</b>, von Ende zu Ende: das Mass der Zeichnung,
an dem auch die Blecheinteilung hängt. Die Auflager stehen dort, wo die Maste
stehen, und das ist oft weiter innen:</p>

${f(`0 &nbsp;├── Kragarm c_A ──┤────── Stützweite L − c_A − c_B ──────┤── c_B ──┤&nbsp; L`)}

<p>Der Kragarm ist statisch bestimmt. Seine Lasten geben am Auflager ein festes
Moment M_k ab, das im Drehwinkelverfahren unmittelbar auf den Knoten wirkt –
auch bei gelenkigem Auflager. Bei c = 0 bleibt genau M_A = M_k übrig, der
Gelenkträger mit Kragarm. Innerhalb des Kragarms werden die Schnittgrössen vom
freien Ende her gerechnet; Torsion und Normalkraft, die dort eingeleitet
werden, laufen unmittelbar ins Auflager.</p>

${q(`Der Unterschied ist nicht klein. Am nachgerechneten Signaljoch liegen die
Mastachsen 0.33 und 0.735 m innerhalb der Gurtenden – 5.3 % Stützweite und rund
<b>11 % auf jedes globale Moment</b>. Wer L als Stützweite einsetzt, rechnet
still zu ungünstig; wer die Stützweite als Gurtlänge einsetzt, still zu
günstig. Die Blecheinteilung bleibt davon unberührt: sie hängt an der
Gurtlänge, nicht an der Stützweite.`)}

<p><b>Gegenprobe.</b> Wird die Drehfeder am Signaljoch so geeicht, dass das
<i>Feldmoment</i> des AxisVM-Modells getroffen wird (21.18 kNm), ergibt sich
c_φ = 9215 kNm/rad – und das <i>Stützmoment</i> stellt sich mit 9.97 kNm gegen
gemessene 10.05 kNm von selbst ein, obwohl es nicht mitgeeicht wurde. Ohne
Kragarme lag dieselbe Rechnung beim Stützmoment 36 % daneben.</p>

<h4>4.7 Schnittgrössen</h4>
${f(`M_y(x) = M_Gelenkträger(x) − [ M_A·(1−x/L) + M_B·(x/L) ]<br>
M_z(x) = w_d·x·(L−x)/2 + M_Einzellasten + eingeprägte M_zz<br>
T(x), N(x) &nbsp;&nbsp; wahlweise Hüllkurve oder Auflagerverteilung`)}

<p>An den Laststellen springt die Querkraft; sie wird deshalb beidseitig
ausgewertet und der betragsmässig grössere Wert als Bemessungswert genommen.
Extremwerte werden nicht am Knotenraster abgelesen, sondern über eine eigene
Kandidatenliste (Auflager, Lastangriffe, Nullstellen von V) gesucht – sie sind
damit unabhängig von der Blechteilung.</p>

<h4>4.8 Torsionsmodell</h4>
<table class="dt">
<tr><td>Hüllkurve</td><td>konstante Summe aller Torsionsmomente über die ganze
  Länge – konservativ, kein Abbau zu den Auflagern</td></tr>
<tr><td>Auflagerverteilung</td><td>Aufteilung auf die Gabellager, genauer</td></tr>
</table>

<p class="hb-quelle">core.statics.js · core.auflager.js</p>
`,
},

// ===========================================================================
{
  id: 'querschnitt',
  titel: '5 · Vom Ersatzbalken zum Querschnitt',
  html: `
<p>Der Ersatzbalken liefert M_y, V_z, M_z, V_y, T und N. Diese sechs Grössen
werden auf die vier Eckwinkel und die vier Blechebenen verteilt.</p>

<h4>5.1 Normalkräfte der Gurtwinkel</h4>
<p>Die Hauptbiegung wird als reines <b>Kräftepaar</b> zwischen Ober- und
Untergurt abgetragen. Die Gurtkraft ist M_y/h – unabhängig vom Flächenverhältnis
–, je Winkel also die Hälfte davon:</p>

${f(`N_My = M_y / (2h)&nbsp;&nbsp;&nbsp; positives Feldmoment → Obergurt Druck<br>
N_Mz = (M_z / b) · A_Gurt/ΣA&nbsp;&nbsp;&nbsp; Kräftepaar der beiden Vertikalebenen<br>
N_ax = N · A_Winkel / ΣA&nbsp;&nbsp;&nbsp; Normalkraft in Jochachse, flächenproportional`)}

${skizze('Zwei Kräftepaare: M_y zwischen den Gurten, M_z zwischen den Seiten',
  '0 0 430 232', [
    // Querschnitt
    `<rect class="kasten" x="150" y="62" width="150" height="106"/>`,
    winkel(150, 62), winkel(300, 62), winkel(150, 168), winkel(300, 168),
    // M_y: Kräftepaar oben/unten, senkrecht zur Zeichenebene
    rein(150, 42), rein(300, 42),
    txt(225, 32, 'N = M_y / 2h &nbsp; Druck', 'acc'),
    raus(150, 190), raus(300, 190),
    txt(225, 212, 'N = M_y / 2h &nbsp; Zug', 'acc'),
    // M_z: Kräftepaar links/rechts
    txt(96, 100, 'N = M_z / b', 'acc', 'middle'),
    rein(96, 115), raus(354, 115),
    txt(354, 100, 'N = M_z / b', 'acc', 'middle'),
    // Masse
    mass(150, 180, 300, 180, 'b', 16),
    mass(324, 62, 324, 168, 'h'),
    txt(225, 118, 'reines Kr&auml;ftepaar &mdash;', 'dim'),
    txt(225, 134, 'die Fl&auml;chen k&uuml;rzen sich heraus', 'dim'),
  ].join(''))}

<h4>5.2 Torsion als Schubfluss (Bredt)</h4>
<p>Das Joch ist ein <b>geschlossener Kasten</b>: vier Ebenen, jede über
Bindebleche zu einem Rahmen geschlossen. Ein Torsionsmoment läuft deshalb als
umlaufender Schubfluss:</p>

${f(`q_T = T / (2 · A_m)&nbsp;&nbsp; mit A_m = b · h<br>
Vertikalebene:&nbsp;&nbsp; V_T = q_T · h = T / 2b<br>
Horizontalebene: V_T = q_T · b = T / 2h`)}

<p>Die Kontrolle geht auf: die beiden Wände einer Richtung bilden ein Kräftepaar,
sein Moment ist Kraft mal Hebelarm (nicht zweimal):</p>

${f(`V_vert · b + V_horiz · h = T/2 + T/2 = T`)}

${skizze('Der Schubfluss läuft um den geschlossenen Kasten und trägt sich je zur ' +
         'Hälfte über die senkrechten und die liegenden Ebenen ab',
  '0 0 430 228', [
    `<rect class="am" x="150" y="58" width="152" height="108"/>`,
    `<rect class="kasten" x="150" y="58" width="152" height="108"/>`,
    winkel(150, 58), winkel(302, 58), winkel(150, 166), winkel(302, 166),
    // Umlaufender Schubfluss
    pf(178, 58, 274, 58), pf(302, 86, 302, 138),
    pf(274, 166, 178, 166), pf(150, 138, 150, 86),
    txt(226, 108, 'A_m = b · h', 'dim'),
    txt(226, 46, 'q_T = T / 2A_m', 'acc'),
    // Ebenenkräfte
    txt(318, 100, 'V_T = q_T·h', 'acc', 'start'),
    txt(318, 114, '= T / 2b', 'acc', 'start'),
    txt(226, 212, 'V_T = q_T·b = T / 2h', 'acc'),
    // Masse
    mass(150, 178, 302, 178, 'b', 16),
    mass(128, 58, 128, 166, 'h'),

  ].join(''))}

${q(`Der Schubfluss trägt sich damit <b>je zur Hälfte</b> über die vertikalen und
die horizontalen Ebenen ab. Wahlweise lässt sich die konservative Annahme
rechnen, die ganze Torsion allein den Vertikalebenen zuzuweisen (V_T = T/b) –
doppelt so gross, und die Mitwirkung der liegenden Ebenen bleibt ungenutzt.`)}

<h4>5.3 Querkraft je Ebene</h4>
<p>Die beiden Ebenen einer Richtung teilen sich die Balkenquerkraft hälftig; der
Torsionsanteil addiert sich auf der einen Seite und zieht auf der anderen ab.
Dazu kommt der örtliche Anteil aus der Lasteinleitung (Abschnitt 7). Wie die
drei überlagert werden, ist <b>wählbar</b>:</p>

${f(`Hüllkurve &nbsp;&nbsp; V_Ebene = |V| / 2 &nbsp;+&nbsp; V_T &nbsp;+&nbsp; V_lokal`)}

<p>Diese Form gibt <b>beiden</b> Ebenen einer Richtung denselben Wert – den der
ungünstigeren. Sie ist nie unsicher, aber Ober- und Unterblech bekommen
zwangsläufig dasselbe η, und das widerspricht dem, was ein Stab- oder
FEM-Modell zeigt.</p>

${f(`vorzeichenrichtig &nbsp;&nbsp; V_Ebene = | V / 2 &nbsp;±&nbsp; V_T | &nbsp;+&nbsp; V_lokal`)}

<p>Der Schubfluss <b>läuft um</b>: er addiert sich auf der Ebene, zu der die Last
exzentrisch sitzt, und zieht auf der gegenüberliegenden ab. Eine Kraft in y
unterhalb der Jochachse – eine Hängestütze – beansprucht damit das
<b>untere</b> Blech stärker; ein Aufsatz über dem Joch das obere.</p>

${q(`Beide Anteile gehen mit Vorzeichen ein, nicht nur die Torsion. Querkraft und
Torsion wechseln am Lastangriff <b>gemeinsam</b> das Vorzeichen – beide laufen
von dort zu den Auflagern –, ihr Verhältnis bleibt also über die ganze Länge
gleich. Nimmt man nur eines vorzeichenbehaftet, springt die massgebende Ebene
am Anbauteil fälschlich auf die andere Seite.`)}

<p>Das <b>höchste</b> η ändert sich dabei nicht: auf der Ebene, wo beides
gleichsinnig läuft, ist |V + V_T| = |V| + V_T – genau die Hüllkurve.
Vorzeichenrichtig zu rechnen entlastet nur die andere Ebene. Der örtliche
Anteil bleibt in beiden Formen additiv auf beiden Ebenen.</p>

${q(`Die Drehsinne sind an einem Stabmodell kalibriert, nicht hergeleitet. Ohne
Drehsinn kein Vorzeichen: rechnet man die Torsion selbst als Hüllkurve
(Abschnitt 4), fällt die Einstellung auf die Hüllkurve zurück.`)}

<p class="hb-quelle">core.querschnitt.js · <code>torsionsSchubfluss</code>,
<code>ebenenQuerkraefte</code>, <code>eckNormalkraefte</code>, <code>EBENEN</code></p>
`,
},

// ===========================================================================
{
  id: 'vierendeel',
  titel: '6 · Vierendeel-Wirkung: Gurte und Bleche',
  html: `
<p>Zwischen zwei Blechen wirkt jede Ebene als Rahmen ohne Diagonale. Die
Ebenenquerkraft erzeugt deshalb im Gurt eine <b>örtliche Biegung</b> mit
Momentennullpunkt in Feldmitte.</p>

<h4>6.1 Örtliches Gurtmoment</h4>
${f(`M_Knoten = V_Ebene · α_Gurt · (a₁ / 2)`)}

<p>Die Ebenenquerkraft teilt sich auf die zwei Gurte der Ebene, der Hebelarm bis
zum Nullpunkt ist die halbe Feldweite. In den <b>Horizontalebenen</b> stehen
zwei gleiche Gurte nebeneinander, dort ist α = ½ und die Sache erledigt. In den
<b>Vertikalebenen</b> stehen Ober- und Untergurt nebeneinander, bei den meisten
Typen mit verschiedenen Profilen – und dort zieht der steifere Gurt Moment an
sich.</p>

<h4>6.1.1 Wie sich die Ebenenquerkraft auf die beiden Gurte teilt</h4>
<p>Gemessen wurde es zweimal, unabhängig voneinander. Erstens direkt: in einem
PyNite-Stabmodell des Signaljochs (I_OG/I_UG = 2.45) wurden die
<b>Gurtendmomente</b> an jeder Station und je Lastfall abgelesen. Zweitens
indirekt, über den stellenweisen Spannungsvergleich gegen ein AxisVM-Modell.</p>

${f(`hälftig&nbsp;&nbsp; 50.0 %&nbsp;&nbsp;&nbsp;
GEMESSEN&nbsp;&nbsp; 57.5 … 61.2 %, Mittel 59.4 %&nbsp;&nbsp;&nbsp;
nach I&nbsp;&nbsp; 71.1 %`)}

<p>Der Rahmen gleicht also aus: Bleche und Knotennachgiebigkeit ziehen die
Aufteilung zur Hälfte zurück. Die reine I-Aufteilung schiesst über das Ziel
hinaus. Gerechnet wird deshalb mit einer <b>gedämpften</b> Aufteilung</p>

${f(`α_Gurt = 0.5 + k · ( I_Gurt / ΣI − 0.5 ),&nbsp;&nbsp; k = 0.45`)}

${q(`Die Messmethode ist belegt: dasselbe Stabmodell mit <b>gleichen</b> Gurten
liefert an jeder Station exakt 50.0 %. Aber es ist EIN Modell und EIN
Steifigkeitsverhältnis – k ist gefittet, nicht hergeleitet. Und der Mittelwert
verdeckt eine Spanne von 51 bis 71 %: an einzelnen Stationen liegt diese
Aufteilung für den einen oder anderen Gurt zu tief.`)}

<p><b>Die Bleche werden dabei schubweich gerechnet.</b> Sie sind kurz und
gedrungen und arbeiten in doppelter Krümmung; ihr Schubanteil
φ = 12EI/(GA_sL²) beträgt 16 bis 45 %. Der PyNite-Export setzt dafür ein
Ersatzträgheitsmoment I/(1+φ) ein, das die Steifigkeit in genau dieser
Verformungsform trifft – PyNite selbst kennt nur Bernoulli-Stäbe. Ohne diese
Korrektur wären die Bleche zu steif und die gemessene Aufteilung zu scharf:
59.4 statt 58.8 %. Der Unterschied ist kleiner, als die Grössenordnung von φ
befürchten lässt.</p>

<p><b>Vorgabe ist «gemessen».</b> Das ist eine Entscheidung des Auftraggebers,
und sie <b>senkt</b> die Bemessungswerte: bei Typen mit ungleichen Gurten um 4
bis 17 % gegenüber der Alternative «einhüllend». Dafür trifft sie im
stellenweisen Vergleich die Vertikallastfälle auf −3 bis +6 %, wo «einhüllend»
bei +10 bis +21 % liegt. Wer beide Gurte gleichzeitig auf der sicheren Seite
haben will, wählt «einhüllend» – dessen Anteile ergänzen sich dann aber zu mehr
als eins, das Blech bekommt also mehr als die Summe der Gurtmomente.</p>

<h4>6.2 Steifer Knotenbereich – Abminderung am Anschnitt</h4>
<p>Am Knoten überlappt das Bindeblech den Gurtwinkel und ist mit ihm
verschweisst; über die Blechbreite b_Bl wirkt die Verbindung biegesteif.
Massgebend ist deshalb nicht das Moment auf der Knotenachse, sondern das am
<b>Anschnitt</b> des Blechs. Der Momentenverlauf ist linear mit Nullpunkt in
Feldmitte, also</p>

${f(`<b>M_Anschnitt = M_Knoten · ( a₁ − b_Bl ) / a₁</b>`)}

${skizze('Ein Vierendeel-Feld: das Gurtmoment wird am Rand des Blechs abgelesen. ' +
         'Grau hinterlegt der steife Knotenbereich, in dem Blech und Gurt verschweisst sind.',
  '0 0 440 262', [
    // Gurte
    `<line class="b" x1="40" y1="56" x2="400" y2="56"/>`,
    `<line class="b" x1="40" y1="152" x2="400" y2="152"/>`,
    // Bindebleche
    `<rect class="blech" x="100" y="56" width="24" height="96"/>`,
    `<rect class="blech" x="316" y="56" width="24" height="96"/>`,
    `<line class="d" x1="112" y1="40" x2="112" y2="250"/>`,
    `<line class="d" x1="328" y1="40" x2="328" y2="250"/>`,
    `<line class="d" x1="220" y1="152" x2="220" y2="250"/>`,
    // Querkraft der Ebene
    pf(60, 104, 60, 76, 'm'), txt(60, 120, 'V_Ebene / 2', 'dim'),
    // Masse
    mass(112, 172, 328, 172, 'a&#8321; (Feldweite)', 14),
    mass(100, 34, 124, 34, 'b_Bl', -6),
    // Momentenverlauf im Gurt
    `<line class="hl" x1="60" y1="216" x2="400" y2="216"/>`,
    `<line class="k" x1="112" y1="186" x2="328" y2="246"/>`,
    `<rect class="steif" x="100" y="186" width="24" height="60"/>`,
    `<rect class="steif" x="316" y="186" width="24" height="60"/>`,
    knoten(112, 186, 3.2), knoten(124, 189.3, 3.2),
    txt(108, 178, 'M_Knoten', 'acc', 'end'),
    txt(140, 210, 'M_Anschnitt', 'acc', 'start'),
    txt(236, 202, 'Nullpunkt in Feldmitte', 'dim', 'start'),

  ].join(''))}

<p>Jede Richtung bekommt ihre eigene Blechbreite: M_y aus den Vertikalebenen,
M_z aus den Horizontalebenen.</p>

<h4>6.2.1 Der Knotenbereich ist steif – so ist der Nachweis festgelegt</h4>
<p>Ob der Überlappungsbereich als steif gilt, ist keine Rechenfrage, sondern
eine <b>Festlegung des Nachweises</b>. Sie lautet: <b>steif</b>, nachgewiesen
wird am Anschnitt. Das entspricht dem Stand der Technik für gegliederte Stäbe
(EN 1993-1-1, Bild 6.11) und ist die Grundlage aller Nachweise dieses
Werkzeugs.</p>

<p>Ein Prüfmodell, das Stäbe von Schwerachse zu Schwerachse laufen lässt (so
rechnet ein Stabwerksprogramm ohne Zutun), findet im Gurt das Knotenmoment und
im Blech das volle Moment. Das <b>Knotenmoment selbst ist in beiden Fällen
dasselbe</b> – nur die Stelle des Nachweises ändert sich. Diese zweite
Einstellung steht in den Optionen zur Verfügung, damit ein solcher Vergleich
ohne Umbau möglich ist; sie ist keine Nachweisgrundlage, und ein damit gerechneter Bericht vermerkt
das unter den Hinweisen.</p>

<table><tr><th>Typ</th><th>η steif</th><th>η Achse zu Achse</th></tr>
<tr><td>J60 · 12 m</td><td>0.361</td><td>0.417 <b>+15 %</b></td></tr>
<tr><td>J90 · 15.5 m</td><td>0.244</td><td>0.274 <b>+13 %</b></td></tr>
<tr><td>J100 · 18 m</td><td>0.423</td><td>0.472 <b>+11 %</b></td></tr>
<tr><td>J120 · 22 m</td><td>0.345</td><td>0.388 <b>+12 %</b></td></tr>
<tr><td>J130 · 27 m</td><td>0.449</td><td>0.501 <b>+11 %</b></td></tr></table>

${q(`Der Unterschied von 11 bis 15 % auf die Ausnutzung hängt an dieser
Festlegung, nicht an einer Rechnung – deshalb steht er hier und nicht im
Kleingedruckten. Am nachgerechneten Signaljoch trug allein diese Frage
Faktor 1.3 bis 1.6 auf die Blechmomente.`)}

<h4>6.2.2 Endfeldzuschlag – die örtliche Einleitung der Torsion</h4>
<p>In den beiden Endfeldern geht die Torsion des Jochs über die Anschlussebenen
in den Mast. Das ist eine <b>örtliche Krafteinleitung</b>, und ein Ersatzbalken
kann sie nicht abbilden – er kennt nur den Rahmenanteil. Gemessen am
Signaljoch, Moment im Vertikalblech unter Wind quer, Vergleichsmodell gegen
Werkzeug, von aussen nach innen:</p>

${f(`Station&nbsp;&nbsp;&nbsp; 0.6 m&nbsp;&nbsp; 2.8 m&nbsp;&nbsp; 4.9 m&nbsp;&nbsp; 7.0 m<br>
Verhältnis&nbsp; 2.71&nbsp;&nbsp;&nbsp; 1.72&nbsp;&nbsp;&nbsp; 1.43&nbsp;&nbsp;&nbsp; 0.96`)}

<p>Der Überschuss klingt über rund drei Felder ab. Davon geht Faktor 1.3 bis
1.6 auf das <b>Knotenmodell</b> des Vergleichsmodells (Abschnitt 6.2.1);
bleibt für die Einleitung selbst rund 1.9. Angesetzt wird</p>

${f(`M = M_Rahmen · ( 1 + (k_E − 1) · Anteil_Torsion / V_Ebene )&nbsp;&nbsp;&nbsp; k_E = 2.0`)}

<p>auf die Bleche der beiden äussersten Stationen je Ende. <b>Nur auf den
Torsionsanteil</b> – daher stammt der Überschuss. Ein Joch ohne exzentrische
Anbaulasten hat kaum Torsion und bleibt unberührt; nur das Moment wird
angehoben, die Querkraft folgt dem Rahmen.</p>

${q(`Eine Festlegung des Nachweises, gestützt auf <b>ein</b> Modell und
<b>eine</b> Lastanordnung – keine hergeleitete Grösse. In Feldmitte stimmen
Werkzeug, Rahmenmodell und Vergleichsmodell überein (0.26 / 0.23 / 0.10 kNm);
dort ist nichts zuzuschlagen. Über den Optionswert 1.0 abschaltbar.`)}

<h4>6.3 Nachweis des Bindeblechs</h4>
<p>Am Rahmenknoten treffen die Gurtmomente der angrenzenden Felder zusammen; das
Blech muss ihre Summe aufnehmen. Aus seinem eigenen Gleichgewicht – doppelte
Krümmung, Wendepunkt in Blechmitte – folgt die Blechquerkraft:</p>

${f(`M_Blech,K = V_Ebene · ( a_links + a_rechts ) / 4<br>
V_Blech = 2 · M_Blech,K / h₀`)}

<p>Bei zwei gleich breiten Feldern ist das V·a₁/2, am Jochrand – wo nur ein Feld
angrenzt – die Hälfte. Das entspricht der Regel für gegliederte Stäbe nach
EN 1993-1-1 Bild 6.11 – dort mit T = V·a/(2h₀) bei <b>zwei</b> Blechen je Knoten;
hier liegt je Ebene nur <b>eines</b>, also der doppelte Wert.</p>

<p>Gerechnet wird mit den <b>örtlichen</b> Feldweiten, nicht mit ihrem Mittel: die
Mass-Tabelle der Zeichnung teilt ungleich – beim J70 über 10 m sind die äusseren
Felder 0.75 m breit, die inneren 0.66–0.67 m. Das Blech nimmt die Gurtmomente
beider Nachbarfelder auf, also zählt ihre <b>Summe</b>; für das Moment im
<b>Gurt</b> ist dagegen das <b>breitere</b> der beiden Felder massgebend, denn
dort wird sein Endmoment am grössten. Mit der mittleren Feldweite gerechnet fiele
das Blechmoment an den breiten Feldern rund 6 % zu klein aus.</p>

<p>Auch das Blech wird am Anschnitt nachgewiesen. Zwischen den beiden steifen
Enden liegt die lichte Länge L_c aus der Stückliste:</p>

${f(`M_K = M_R + V·(h₀ − L_c)/2 &nbsp;&nbsp;und&nbsp;&nbsp; V = 2·M_R/L_c<br>
⟹ &nbsp; <b>M_R = M_K · L_c / h₀</b> &nbsp;&nbsp; (V bleibt unverändert)`)}

${skizze('Das Blech in doppelter Krümmung. M_K ist das Moment auf der Gurtachse, ' +
         'M_R das am Rand des steifen Bereichs — nachgewiesen wird M_R.',
  '0 0 430 232', [
    // Gurte
    `<line class="b" x1="60" y1="48" x2="300" y2="48"/>`,
    `<line class="b" x1="60" y1="196" x2="300" y2="196"/>`,
    txt(66, 40, 'Obergurt', 'dim', 'start'),
    txt(66, 214, 'Untergurt', 'dim', 'start'),
    // Blech mit steifen Enden
    `<rect class="blech" x="168" y="48" width="34" height="148"/>`,
    `<rect class="steif" x="168" y="48" width="34" height="22"/>`,
    `<rect class="steif" x="168" y="174" width="34" height="22"/>`,
    // Querkraft aus dem Gleichgewicht des Blechs
    pf(140, 60, 166, 60), txt(134, 64, 'V', 'acc', 'end'),
    pf(230, 184, 204, 184), txt(236, 188, 'V', 'acc', 'start'),
    // Masse
    mass(244, 70, 244, 174, 'L_c'),
    mass(290, 48, 290, 196, 'h&#8320;'),
    // Momentenverlauf des Blechs, doppelte Krümmung
    `<line class="hl" x1="356" y1="48" x2="356" y2="196"/>`,
    `<line class="k" x1="392" y1="48" x2="320" y2="196"/>`,
    knoten(392, 48, 3.2), knoten(381.3, 70, 3.2),
    txt(400, 44, 'M_K', 'acc', 'start'),
    txt(400, 76, 'M_R', 'acc', 'start'),
    txt(330, 140, 'Wendepunkt', 'dim', 'end'),

  ].join(''))}

${q(`Beide Stäbe werden damit am <b>Rand des starren Bereichs</b> nachgewiesen und
nicht auf ihrer Schwerachse. Das ist die Antwort auf die Frage, was in der
Überlappung von Blech und Gurt geschieht: der Bereich wird als starr behandelt,
und die Schnittgrössen werden an seine Ränder gerechnet – dasselbe, was man in
einem Stabwerksprogramm mit Starrelementen oder Endgelenk-Exzentrizitäten
abbilden würde. Beim J90 mindert das die Gurtbeanspruchung um rund 14 %.`)}

<p class="hb-quelle">core.querschnitt.js · <code>schnittAuswertung</code>,
<code>blechNachweis</code></p>
`,
},

// ===========================================================================
{
  id: 'einleitung',
  titel: '7 · Lasteinleitung der Anbauteile',
  html: `
<p>Ein Anbauteil hängt nicht an einem Punkt am Joch, sondern ist an <b>vier
Punkten</b> angeschlagen: je zwei am Ober- und am Untergurt, an den Stellen
x ± Raster/2, auf der Schwerachse des jeweiligen Gurtes.</p>

<h4>7.1 Globale Wirkung</h4>
${f(`T_d = F_y · e_v &nbsp;+&nbsp; F_z · e_x &nbsp;+&nbsp; M_xx<br>
M_yd = F_x · e_v + M_yy &nbsp;&nbsp;(eingeprägtes Moment)<br>
N = F_x, &nbsp; P = F_z, &nbsp; H = F_y &nbsp;&nbsp;(je hälftig auf x₁ und x₂)`)}

<p>An den globalen Schnittgrössen ändert die Aufteilung nichts – eine
Resultierende bleibt eine Resultierende. Verteilt wird nur, <b>wo</b> die Last
ins Joch eintritt.</p>

<h4>7.2 Örtliche Wirkung: das Kräftepaar</h4>
<p>Örtlich muss das Moment über die Anschlusspunkte in den Querschnitt eintreten,
und <b>das</b> hängt davon ab, an wie vielen Gurten das Teil hängt:</p>

<table class="dt">
<tr><th>Befestigung</th><th>Kräftepaar</th><th>getragen von</th></tr>
<tr><td>durchgehend (4 Punkte)</td><td>ΔF_y = T_d / h</td><td>Horizontalebenen</td></tr>
<tr><td>oben oder unten (2 Punkte)</td><td>ΔF_z = T_d / jbb</td><td>Vertikalebenen</td></tr>
</table>

${skizze('Links durchgehend: Hebelarm h. Rechts einseitig: nur noch die Gurtbreite jbb',
  '0 0 440 268', [
    // --- links: durchgehend, Längsansicht ---
    `<line class="b" x1="24" y1="56" x2="204" y2="56"/>`,
    `<line class="b" x1="24" y1="146" x2="204" y2="146"/>`,
    `<line class="d" x1="24" y1="101" x2="204" y2="101"/>`,
    `<line class="b" x1="114" y1="56" x2="114" y2="212"/>`,
    knoten(84, 56, 3.4), knoten(144, 56, 3.4),
    knoten(84, 146, 3.4), knoten(144, 146, 3.4),
    knoten(114, 212, 4.4),
    pf(114, 212, 182, 212), txt(186, 216, 'F_y', 'acc', 'start'),
    raus(84, 40), rein(144, 40),
    raus(144, 162), rein(84, 162),
    txt(114, 26, '&Delta;F_y = T_d / h', 'acc'),
    mass(216, 56, 216, 146, 'h'),
    pf(114, 186, 84, 186, 'm'), pf(114, 186, 144, 186, 'm'),
    txt(152, 190, 'Raster', 'dim', 'start'),
    txt(114, 244, 'durchgehend &mdash; vier Punkte', 'dim'),
    txt(114, 258, 'L&auml;ngsansicht, y aus der Ebene', 'dim'),
    // Trennlinie
    `<line class="hl" x1="248" y1="20" x2="248" y2="252"/>`,
    // --- rechts: einseitig, Querschnitt ---
    `<line class="b" x1="296" y1="146" x2="392" y2="146"/>`,
    winkel(296, 146), winkel(392, 146),
    `<line class="d" x1="284" y1="101" x2="404" y2="101"/>`,
    `<line class="b" x1="344" y1="146" x2="344" y2="212"/>`,
    knoten(344, 212, 4.4),
    pf(344, 212, 404, 212), txt(408, 216, 'F_y', 'acc', 'start'),
    pf(296, 142, 296, 112), pf(392, 150, 392, 194),
    txt(344, 62, '&Delta;F_z = T_d / jbb', 'acc'),
    txt(344, 80, 'gr&ouml;sser, weil jbb &lt; h', 'dim'),
    pf(344, 176, 296, 176, 'm'), pf(344, 176, 392, 176, 'm'),
    txt(292, 180, 'jbb', 'dim', 'end'),
    txt(344, 244, 'nur am Untergurt &mdash; zwei Punkte', 'dim'),
    txt(344, 258, 'Querschnitt, Blick in Jochachse', 'dim'),
  ].join(''))}

${q(`Der schmalere Hebelarm ist der ungünstigere. Da jbb (Gurtbreite) kleiner ist
als h (Jochhöhe), ist die <b>einseitige</b> Befestigung die härtere
Beanspruchung – und sie konzentriert sich zudem auf einen einzigen Gurt.`)}

<h4>7.3 Verteilung auf die Blechstationen</h4>
<p>Eine Kraft, die zwischen zwei Blechen eintritt, verteilt sich auf beide – nach
dem Hebelarm, wie jede Lasteinleitung zwischen zwei Knoten:</p>

${f(`Anteil links = ( x_r − p ) / ( x_r − x_l )<br>
Anteil rechts = ( p − x_l ) / ( x_r − x_l )`)}

${skizze('Die Kraft teilt sich nach dem Hebelarm auf die zwei Nachbarbleche — ' +
         'stetig über den ganzen Raster, ohne Sprung am Feldrand',
  '0 0 430 196', [
    `<line class="b" x1="40" y1="104" x2="392" y2="104"/>`,
    // Bleche
    `<rect class="blech" x="106" y="82" width="12" height="44"/>`,
    `<rect class="blech" x="298" y="82" width="12" height="44"/>`,
    txt(112, 74, 'x_l', 'dim'), txt(304, 74, 'x_r', 'dim'),
    // Eingeleitete Kraft
    pf(250, 34, 250, 96), txt(242, 40, 'F bei p', 'acc', 'end'),
    `<line class="d" x1="250" y1="34" x2="250" y2="150"/>`,
    // Anteile
    pf(112, 116, 112, 137), txt(112, 152, '0.30 F', 'acc'),
    pf(304, 116, 304, 165), txt(304, 180, '0.70 F', 'acc'),
    // Masse
    mass(112, 62, 250, 62, 'p &minus; x_l'),
    mass(250, 62, 304, 62, 'x_r &minus; p'),

  ].join(''))}

<p>Ausserhalb des Rasters fällt alles auf die Randstation; dort gibt es kein
Nachbarblech, das mittragen könnte.</p>

${q(`Diese Aufteilung ist der Grund, warum η nicht mehr sprunghaft vom
Anschlussraster abhängt. Zuvor wurde alles im Fenster ±a₁/2 <b>einem</b> Blech
zugeschlagen; 5 cm mehr Raster liessen die Einleitung ins Nachbarfeld kippen und
η um über 25 % fallen. Heute ist der grösste Schritt über den Bereich
0.60 – 0.80 m rund <b>5 %</b>.`)}

<h4>7.4 Überlagerung</h4>
<p>Das Kräftepaar wird zur Ebenenquerkraft <b>addiert</b>, nicht gemittelt und
nicht gegen den globalen Schubfluss abgeglichen. Liegen beide Einleitungsstellen
am selben Blech, muss dieses Blech das ganze Paar übertragen. Das ist bewusst
konservativ – und es gilt auch dann, wenn die Ebenen vorzeichenrichtig
überlagert werden (Abschnitt 5.3): der örtliche Anteil kommt auf beiden Ebenen
mit vollem Betrag dazu.</p>

<h4>7.5 Ausleger: die Fahrleitung als Auflager</h4>
<p>Ein Ausleger ist kein Kragarm. Sein äusseres Ende hält die Fahrleitung, und
die ist durch den <b>Leiterzug</b> seitlich gespannt – sie wirkt dort als
Auflager. Der Wind auf den Ausleger verteilt sich damit auf zwei Auflager:</p>

${f(`F_Fahrleitung = (1 &minus; α) · F_Wind &nbsp;&nbsp;&nbsp;
     F_Träger = α · F_Wind &nbsp;&nbsp;&nbsp; α = 0.5 als Vorgabe`)}

<p>Nur der Anteil α kommt an diesem Joch an; den Rest trägt die Fahrleitung
längs zu den Nachbaraufhängungen ab. Und er kommt dort an, wo der Ausleger
angeschlagen ist: auf der <b>Achse des Trägers</b>. Verändert wird deshalb der
Abstand in y – die <b>Höhe z bleibt</b>, der Hebelarm e_v zur Jochachse
ändert sich nicht, die Kraft wird kleiner.</p>

<p>Unangetastet bleiben Eigengewicht, Schnee, Wind in x – und die
<b>Drahtwerke</b>: deren Windlast ist über die Spannweite L_FL bereits der
Anteil, der an dieser Aufhängung ankommt; sie ein zweites Mal zu teilen wäre
doppelt gezählt.</p>

${q(`Diese Aufteilung ist eine <b>Modellannahme</b>, kein gerechneter Wert. Sie
setzt voraus, dass die Fahrleitung am betrachteten Ausleger tatsächlich
seitlich gehalten ist. Sie ist deshalb je Anbauteil einzeln zu setzen und
standardmässig ausgeschaltet.`)}

<p class="hb-quelle">core.anbauteile.js · <code>anbauteilLasten</code>,
<code>stationsAnteil</code>, <code>lokaleQuerkraft</code> ·
data.anbauteile.js · <code>windAufTraeger</code></p>
`,
},

// ===========================================================================
{
  id: 'nachweise',
  titel: '8 · Nachweise',
  html: `
<h4>8.1 Gurtwinkel</h4>
<p>Elastisch, mit dem Bruttoquerschnitt, als <b>Summe der Beträge</b>:</p>

${f(`σ_v = |N| / A &nbsp;+&nbsp; M_y,lokal / W_y &nbsp;+&nbsp; M_z,lokal / W_z<br>
η = σ_v / f_yd &nbsp;&nbsp; mit f_yd = f_y / γ_M0`)}

${q(`Die Betragssumme ist konservativ: sie unterstellt, dass Normalkraft und
beide örtlichen Momente an <b>derselben</b> Querschnittsfaser ihr Maximum haben.
Eine Interaktionsformel nach EN 1993-1-1 Abschnitt 6.2.9 würde günstiger
ausfallen; sie ist bewusst nicht gerechnet.`)}

<h4>8.2 Bindebleche</h4>
${f(`σ = M_R / W &nbsp;&nbsp; mit W = t·b²/6<br>
τ = 1.5 · V / A &nbsp;&nbsp; (parabolische Schubverteilung im Rechteck)<br>
σ_v = √( σ² + 3τ² ) &nbsp;&nbsp; (von Mises)`)}

<h4>8.3 Mast</h4>
<p>Der Mast wird am Fuss nachgewiesen, Einspannung vorausgesetzt:</p>

${f(`M_Fuss = |M_Joch| + w_Mast · H² / 2<br>
σ_v = N/A + M_Fuss/W`)}

<h4>8.4 Querschnittsklassen</h4>
<p>Jedes Bauteil wird einzeln nach EN 1993-1-1 klassifiziert, damit erkennbar
bleibt, welches Teil die Klasse bestimmt. Klasse 3 wird als Warnung geführt;
bei Klasse 4 wird deutlich ausgewiesen, dass elastisch mit dem Bruttoquerschnitt
gerechnet wird und die Ausnutzung damit <b>auf der unsicheren Seite</b> liegt.</p>

<h4>8.5 Massgebender Lastfall</h4>
<p>Welcher Lastfall massgebend wird, lässt sich nicht ansehen – er wird
gerechnet. Alle Nachweislastfälle laufen durch; ausgewiesen werden der
ungünstigste und eine Umhüllende, die je Station den ungünstigsten Knoten
übernimmt. Die beiden charakteristischen Lastfälle laufen mit, gehen aber weder
in die Umhüllende noch in die Wahl des massgebenden Falls ein.</p>

<p class="hb-quelle">core.querschnitt.js · core.klassen.js · core.vierendeel.js</p>
`,
},

// ===========================================================================
{
  id: 'raster',
  titel: '9 · Knotenraster und Nachweisschnitt',
  html: `
<p>Die Blechstationen folgen der Mass-Tabelle der Zeichnung: vom Jochende nach
innen 750 mm, dann A_n … A_1, wobei A_1 das Feld in Jochmitte ist. Es gilt</p>

${f(`L = 2 · 750 + 2 · ΣA`)}

${skizze('Blecheinteilung nach der Mass-Tabelle: A₁ liegt in Jochmitte',
  '0 0 440 190', [
    `<line class="b" x1="40" y1="52" x2="400" y2="52"/>`,
    `<line class="b" x1="40" y1="112" x2="400" y2="112"/>`,
    // Bindebleche der Vertikalebene
    ...[40, 85, 130, 175, 220, 265, 310, 355, 400].map((x) =>
      `<rect class="blech" x="${x - 5}" y="52" width="10" height="60"/>`),
    // Gabel: an den Enden fehlt das liegende Blech
    txt(40, 40, 'Gabel', 'dim'), txt(400, 40, 'Gabel', 'dim'),
    pf(40, 30, 40, 48, 'm'), pf(400, 30, 400, 48, 'm'),
    // Felder anschreiben
    ...[[62, '750'], [107, 'A&#8323;'], [152, 'A&#8322;'], [197, 'A&#8321;'],
        [242, 'A&#8321;'], [287, 'A&#8322;'], [332, 'A&#8323;'], [377, '750']]
      .map(([x, s]) => txt(x, 134, s, 'dim')),
    `<line class="d" x1="220" y1="44" x2="220" y2="140"/>`,
    txt(220, 156, 'Jochmitte', 'dim'),
    mass(40, 174, 400, 174, 'jt'),
  ].join(''))}

<p>und diese Bedingung wird für jede Tabellenzeile geprüft. Braucht die Zeichnung
eine gerade Feldzahl, schreibt sie das mittlere Feld als zwei halbe A_1 an; dann
steht in Jochmitte kein Blech.</p>

<h4>Die Gabel am Jochende</h4>
<p>An beiden Jochenden steht nur ein <b>vertikales</b> Bindeblech; ein liegendes
gibt es dort nicht. Das Jochende ist oben und unten offen – eine Gabel, mit der
das Joch am Mast montiert wird. Die Stückzahlen der Zeichnung belegen das: die
Vertikalebene hat je Ebene genau zwei Bleche mehr als die Horizontalebene.</p>

<h4>Lage des Nachweisschnitts</h4>
${q(`Der Nachweisschnitt liegt <b>immer mittig zwischen zwei Blechen</b>. Nur
dort schneidet man einen Gurt in seinem Feld und nicht durch einen Rahmenknoten;
ein Schnitt genau durch ein Blech wäre mehrdeutig, weil dort das örtliche
Gurtmoment springt.`)}

<p>An den Schnitt grenzen zwei Bleche. Beide werden gerechnet und ausgewiesen;
massgebend ist das ungünstigere.</p>

<p class="hb-quelle">core.statics.js · <code>knotenraster</code> ·
core.vierendeel.js · <code>schnittstellen</code></p>
`,
},

// ===========================================================================
{
  id: 'grenzen',
  titel: '10 · Modellgrenzen',
  html: `
${q(`Dieser Abschnitt ist der wichtigste des Handbuchs. Er sagt, was das Werkzeug
<b>nicht</b> rechnet – und damit, wofür der Anwender selbst geradesteht.`)}

<h4>10.1 Was gar nicht gerechnet wird</h4>
<table class="dt">
<tr><th>Nicht enthalten</th><th>Folge für den Anwender</th></tr>
<tr><td><b>Stabilität</b>: Knicken, Biegedrillknicken, Beulen</td>
    <td>Der Druckgurt wird nur auf Spannung nachgewiesen. Bei langen Jochen und
    schlanken Winkeln ist der Knicknachweis <b>separat</b> zu führen.</td></tr>
<tr><td><b>Verformungen</b>, Gebrauchstauglichkeit</td>
    <td>Es wird keine Durchbiegung ausgewiesen. Ob das Joch die Anforderungen
    an die Fahrdrahtlage einhält, prüft das Werkzeug nicht.</td></tr>
<tr><td><b>Schweissnähte und Anschlüsse</b></td>
    <td>Die Naht Blech–Gurt, die Gabel am Jochende und die Verbindung zum Mast
    sind nicht bemessen.</td></tr>
<tr><td><b>Ermüdung</b></td>
    <td>Nicht betrachtet. Bei Jochen mit bewegten Lasten oder winderregten
    Schwingungen eigens zu prüfen.</td></tr>
<tr><td><b>Fundament, Fussplatte, Baugrund</b></td>
    <td>Das Auflagerblatt liefert die Kräfte; die Bemessung endet dort.</td></tr>
<tr><td><b>Wölbkrafttorsion</b></td>
    <td>Torsion wird als reiner Schubfluss im geschlossenen Kasten geführt
    (St-Venant). Behinderte Verwölbung am Gabellager bleibt unberücksichtigt.</td></tr>
<tr><td><b>Querschnittsklasse 4</b></td>
    <td>Es wird elastisch mit dem Bruttoquerschnitt gerechnet – der wirksame
    Querschnitt nach EN 1993-1-5 fehlt. Das liegt auf der
    <b>unsicheren Seite</b> und wird als Hinweis ausgewiesen.</td></tr>
</table>

<h4>10.2 Wo das Modell vereinfacht</h4>
<table class="dt">
<tr><th>Annahme</th><th>Richtung</th></tr>
<tr><td>Ersatzbalken statt Rahmenberechnung: die Vierendeel-Wirkung wird über
    Ersatzformeln erfasst, nicht über ein Stabwerk. Momentenumlagerung durch
    unterschiedliche Steifigkeiten der Felder wird nicht abgebildet.</td>
    <td class="hb-neutral">neutral bis leicht unsicher</td></tr>
<tr><td>Spannungen als Betragssumme statt Interaktionsformel</td>
    <td class="hb-sicher">sicher</td></tr>
<tr><td>Örtliches Kräftepaar der Anbauteile wird zum globalen Schubfluss addiert,
    nicht überlagert abgeglichen</td>
    <td class="hb-sicher">sicher</td></tr>
<tr><td>Anbauteile gelten als starr; ihre Eigensteifigkeit trägt nicht mit</td>
    <td class="hb-sicher">sicher</td></tr>
<tr><td>Eigenträgheitsmomente der Winkel bleiben bei der Jochsteifigkeit
    unberücksichtigt (Zwei-Gurt-Idealisierung)</td>
    <td class="hb-sicher">sicher, wenige Prozent</td></tr>
<tr><td>Einspannung wirkt nur auf M_y, nicht auf M_z</td>
    <td class="hb-sicher">sicher für das Joch</td></tr>
<tr><td>Torsion wahlweise als konstante Hüllkurve</td>
    <td class="hb-sicher">sicher</td></tr>
<tr><td>Hebelarm am verjüngten Jochende nach unten begrenzt – dort wirkt das Ende
    nicht mehr als Vierendeelträger, sondern als voller Querschnitt</td>
    <td class="hb-neutral">Näherung, wird ausgewiesen</td></tr>
<tr><td>Wind x und Wind y wirken nie gleichzeitig</td>
    <td class="hb-neutral">Festlegung; schräge Anströmung ist nicht abgedeckt</td></tr>
</table>

<h4>10.3 Grenzen der Eingangsdaten</h4>
<p>Die Rechnung ist nur so gut wie die Typendatenbank. Blecheinteilung,
Profilmasse und Laufmeterlasten stammen aus den Zeichnungen und werden nicht
angepasst. Wer eine Spannweite ausserhalb des Sortiments eingibt, bekommt eine
Warnung – aber trotzdem ein Ergebnis; ob der Typ dort noch sinnvoll ist,
entscheidet der Anwender.</p>

${q(`Kurz: Das Werkzeug rechnet den <b>Feldnachweis eines regelkonformen
Tragjochs</b>. Alles, was mit Stabilität, Anschlüssen, Verformung oder Ermüdung
zu tun hat, gehört in eine eigene Betrachtung.`)}
`,
},

// ===========================================================================
{
  id: 'pruefung',
  titel: '11 · Prüfung und Nachvollzug',
  html: `
<p>Der Rechenkern trägt einen eigenen Prüfstand mit rund 400 Einzelkontrollen:
Einheiten, Grenzfälle, Gleichgewichtskontrollen (etwa V_vert·b + V_horiz·h = T),
Stetigkeit über den Anschlussraster und Vergleichswerte aus der Excel-Rechnung.
Er läuft bei jeder Änderung.</p>

<h4>Wie man einen Wert von Hand nachrechnet</h4>
<ol class="hb-liste">
<li>Im Reiter <b>Lastfälle</b> die Beiwerte des massgebenden Falls ablesen.</li>
<li>Im Reiter <b>Schnitt</b> stehen zu jedem Nachweisschnitt die
Schnittgrössen des Ersatzbalkens, die Ebenenquerkräfte mit ihren drei Anteilen
(Balken, Torsion, örtlich) und das Gurtmoment am Knoten <b>und</b> am
Anschnitt.</li>
<li>Damit lässt sich jede Zeile mit den Formeln der Abschnitte 5 bis 7
nachrechnen – die Zwischenwerte stehen alle da, nichts ist verborgen.</li>
<li>Der Excel-Export enthält dieselben Zwischenwerte je Station.</li>
</ol>

${q(`Wenn eine Zahl nicht nachvollziehbar ist, ist das ein Fehler des Werkzeugs
und kein Anlass, ihr zu glauben.`)}
`,
},
];

/** Das ganze Handbuch als HTML, mit Inhaltsverzeichnis. */
export function handbuchHtml() {
  const toc = HANDBUCH.map((s) =>
    `<a class="hb-toc-e" data-zu="${s.id}">${s.titel}</a>`).join('');
  const rumpf = HANDBUCH.map((s) =>
    `<section class="hb-abschnitt" id="hb-${s.id}">
       <h3>${s.titel}</h3>${s.html}
     </section>`).join('');
  return `<div class="hb">
    <nav class="hb-toc">
      <div class="hb-toc-t">Inhalt</div>${toc}
    </nav>
    <div class="hb-text">
      <p class="notiz">Herleitung des Rechenwegs und Grenzen des Modells.
        Jeder Abschnitt nennt die Datei des Rechenkerns, in der die Formel
        steht – vom Satz zur Zeile.</p>
      ${rumpf}
    </div>
  </div>`;
}

/**
 * Das Handbuch als EIGENSTÄNDIGE HTML-Datei.
 *
 * Eine Datei, die sich weitergeben, ablegen und drucken lässt, ohne die
 * Anwendung mitzuschicken - für die Beilage zur Statik. Das Stylesheet wird
 * aus dem laufenden Dokument geholt: in der gebündelten Ausgabe steht es
 * inline, in der Modulversion als eigene Datei, deren Regeln bei gleicher
 * Herkunft lesbar sind. Gelingt beides nicht, bleibt ein schlichtes
 * Grundgerüst - lieber nüchtern als gar nicht.
 *
 * Das Verzeichnis wird zu echten Sprungmarken; in der Anwendung übernimmt das
 * sonst ein Ereignis, das hier niemand verdrahtet.
 *
 * @param {object} o {titel, stand, fussnote}
 * @returns {string} vollständiges HTML-Dokument
 */
export function handbuchDatei(o = {}) {
  const titel = o.titel ?? 'Tragjoch – Handbuch';
  const stand = o.stand ?? new Date().toLocaleDateString('de-CH');

  let css = '';
  if (typeof document !== 'undefined') {
    css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    if (!css) {
      try {
        css = [...document.styleSheets]
          .flatMap((b) => { try { return [...b.cssRules]; } catch { return []; } })
          .map((r) => r.cssText).join('\n');
      } catch { css = ''; }
    }
  }

  // FARBTOKENS ALS CSS
  // In der Anwendung setzt uebertrageTokens() die Variablen zur Laufzeit auf
  // :root. Eine eigenständige Datei führt kein Skript aus - ohne diesen Block
  // stünde dunkler Text auf dunklem Grund. Genommen wird das HELLE Thema:
  // die Datei ist zum Lesen, Beilegen und Drucken gedacht.
  let tokens = '';
  if (typeof document !== 'undefined') {
    const r = document.documentElement;
    const eigen = r.getAttribute('style') ?? '';
    tokens = eigen.split(';').map((z) => z.trim()).filter((z) => z.startsWith('--'))
      .join(';\n  ');
  }
  const hell = o.tokens ?? null;
  if (hell) {
    tokens = Object.entries(hell)
      .map(([k, v]) => `--${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}: ${v}`)
      .join(';\n  ');
  }

  const toc = HANDBUCH.map((s) =>
    `<a class="hb-toc-e" href="#hb-${s.id}">${s.titel}</a>`).join('');
  const rumpf = HANDBUCH.map((s) =>
    `<section class="hb-abschnitt" id="hb-${s.id}"><h3>${s.titel}</h3>${s.html}</section>`)
    .join('');

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<title>${titel}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${css}</style>
<style>
  :root { ${tokens} }
  /* Eigenständig gelesen gibt es keine Anwendung ringsum: der Text bekommt
     eine Breite, das Verzeichnis läuft oben mit statt seitlich. */
  body { margin: 0; padding: 24px; }
  .hb-datei { max-width: 62rem; margin: 0 auto; }
  .hb-datei h1 { font-size: 1.6rem; margin: 0 0 4px; }
  .hb-datei .hb-stand { margin: 0 0 20px; }
  .hb-datei .hb-toc { position: static; display: flex; flex-wrap: wrap;
    gap: 4px 14px; margin: 0 0 24px; padding: 12px 0; border-width: 1px 0;
    border-style: solid; }
  .hb-datei .hb-toc-e { display: inline; }
  @media print { body { padding: 0; } .hb-datei .hb-toc { break-after: page; } }
</style>
</head><body><div class="hb-datei">
<h1>${titel}</h1>
<p class="notiz hb-stand">Stand ${stand}${o.fussnote ? ` · ${o.fussnote}` : ''}</p>
<nav class="hb-toc"><div class="hb-toc-t">Inhalt</div>${toc}</nav>
${rumpf}
</div></body></html>`;
}
