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

import { NUTZUNG_HTML } from './stufe.js';
import { herausgeberHtml } from './herausgeber.js';
import { KURS_FR, KURS_IT } from './doku.kurs.sprachen.js';
import { skizze, pf, mass, knoten, winkel, raus, rein, txt }
  from './doku.skizze.js';

const f = (t) => `<div class="hb-f">${t}</div>`;
const q = (t) => `<p class="hb-q">${t}</p>`;

/*
 * DIE BAUSTEINE DER SKIZZEN STEHEN IN `doku.skizze.js`.
 *
 * Eine Skizze sagt in zwei Sekunden, wofuer der Text zwei Absaetze braucht -
 * aber nur, wenn sie dasselbe meint. Alle Skizzen hier sind deshalb aus den
 * Groessen der Formeln aufgebaut und tragen deren Bezeichnungen, nicht
 * eigene. Seit dem 9. September zeichnet die Auflagerbedingung in der Maske
 * mit denselben Bausteinen; sie liegen darum in einem eigenen Modul.
 */
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
<p>Das Werkzeug bemisst <b>Tragwerke von Fahrleitungsanlagen</b>: Tragjoche,
Abfangjoche, Masten mit Tragausleger und Einzelmasten, jeweils mit ihren
Masten, Fundamenten, Ankern und Anbauteilen. Gerechnet wird ein
<b>räumliches Stabwerk</b> nach Theorie erster Ordnung, linear-elastisch.</p>

<table class="dt">
<tr><th>Tragwerksart</th><th>Aufbau</th></tr>
<tr><td>Tragjoch</td><td>Vierendeelträger aus vier Winkeln (Ober- und Untergurt
  je zwei), verbunden durch Bindebleche in vier Ebenen; auf zwei Masten</td></tr>
<tr><td>Abfangjoch</td><td>zwei liegende Walzprofile (UPE bzw. Altbau UAP / IPE)
  mit Bindeblechen, am Mast als Gabel; nimmt den Leiterzug abgefangener Leiter auf</td></tr>
<tr><td>Mast mit Tragausleger</td><td>Kragarm aus zwei UPE 140 mit Bindeblechen,
  am Mast angeschlossen und über eine Aufhängung abgespannt</td></tr>
<tr><td>Einzelmast</td><td>Mast ohne Träger, mit Anbauteilen am Mast</td></tr>
</table>

<p>Mehrere Tragwerke eines Querprofils (Jochreihe, Abfangjoche übereinander,
Ausleger am Jochmasten) bilden ein gemeinsames Stabwerk; ein Mast, der zwei
Tragwerke trägt, ist ein Stab.</p>

<h4>Grundlagen</h4>
<table class="dt">
<tr><td>Sortimente</td><td>Tragjoche (Geometrie, Blecheinteilung, Laufmeterlasten),
  Abfangjoche, Tragausleger, Masten, Fundamentlasten, Anker – aus der geladenen
  Datenbasis</td></tr>
<tr><td>Lasttabelle</td><td>Gewicht, Windlast und Leiterzug der Bauteile und
  Leiter; Reglagetabelle der Leiterzugkräfte je Temperatur</td></tr>
<tr><td>Normen</td><td>SIA 260 / 261 bzw. Bahnsatz (Beiwerte), EN 1993-1-1
  (Material, Querschnitte), SIA 263 (Knicken)</td></tr>
</table>

<p>Die Geometrie der Jochträger wird aus dem Sortiment unverändert übernommen;
die Blecheinteilung wird nie angepasst.</p>

${q(`Das Werkzeug ist ein Hilfsmittel der Bemessung. Der Rechenkern ist nicht
als Statikprogramm geprüft oder zertifiziert; Ergebnisse sind durch eine
Fachperson zu beurteilen. Was nicht gerechnet wird, steht in Abschnitt 20.`)}
`,
},

// ===========================================================================
{
  id: 'achsen',
  titel: '2 · Achsen, Vorzeichen und Einheiten',
  html: `
<table class="dt">
<tr><th>Achse</th><th>Richtung</th></tr>
<tr><td>x</td><td>quer zum Gleis, in der Jochachse</td></tr>
<tr><td>y</td><td>längs zum Gleis</td></tr>
<tr><td>z</td><td>lotrecht, positiv nach oben</td></tr>
</table>

<p>Kräfte und Momente folgen den globalen Achsen nach der <b>rechten
Hand</b>. Eingaben von Lasten zählen F_z nach oben: ein Gewicht ist negativ.
Im 3D zeigt der Pfeil die Richtung, die Zahl den Betrag.</p>

<h4>Bezugspunkte</h4>
<table class="dt">
<tr><th>Grösse</th><th>Bezug</th></tr>
<tr><td>Lage x eines Tragwerks, eines Masten</td><td>Nullpunkt des Querprofils</td></tr>
<tr><td>x eines Anbauteils am Joch</td><td>Anfang des Jochs</td></tr>
<tr><td>z eines Anbauteils am Joch</td><td>Schwerachse des Gurtes, an dem es
  befestigt ist; bei Befestigung an beiden Gurten ohne Träger die Jochachse</td></tr>
<tr><td>Höhe eines Anbauteils am Masten</td><td>Mastfuss; x, y ab der Mastachse</td></tr>
<tr><td>Anschlusshöhe H</td><td>Mastfuss bis Jochachse</td></tr>
</table>

<h4>Kräfte an Auflager und Fundament</h4>
<p>Auflagerkräfte im Reiter <b>Auflager</b> und auf dem Blatt der
Reaktionskräfte stehen als <b>Wirkung auf das Fundament</b>, charakteristisch,
mit <b>Druck positiv</b> (Z nach unten) und als ± Betrag für die horizontalen
Grössen und Momente. Kräfte am Jochanschluss stehen als Kraft des Jochs auf den
Masten, global, F_z nach oben.</p>

<p>Einheiten: kN, kNm, m; Spannungen in N/mm²; Wege in mm.</p>
`,
},

// ===========================================================================
{
  id: 'modell',
  titel: '3 · Das Rechenmodell',
  html: `
<h4>3.1 Stäbe</h4>
<table class="dt">
<tr><th>Bauteil</th><th>im Modell</th></tr>
<tr><td>Gurtwinkel</td><td>Stab auf der Schwerachse; Querschnitt mit I_y, I_z
  und Deviationsmoment I_yz (schiefe Biegung), Lage nach dem Detailschnitt der
  Werkstattzeichnung</td></tr>
<tr><td>Bindebleche</td><td>Stab zwischen den Gurtachsen; stehende Bleche in der
  Flucht der Schenkel, liegende um 10 mm nach innen versetzt; die Enden vom
  Blechrand zur Gurtachse sind starr. Am verjüngten Joch liegt das
  Untergurtblech in der Neigung des Gurts.</td></tr>
<tr><td>Knotenbereich</td><td>Gurt über die Blechbreite als steifer Abschnitt</td></tr>
<tr><td>Riegel</td><td>an den Knicken der verjüngten Joche, wo kein stehendes
  Blech steht</td></tr>
<tr><td>Masten</td><td>Stab vom Fuss bis zum Kopf, geteilt an jeder Anschluss-
  und Anbauhöhe; Fuss voll eingespannt</td></tr>
<tr><td>Anbauteile</td><td>starre Kette vom Anschluss zu den Lastpunkten</td></tr>
<tr><td>Seile (Anker, Aufhängung)</td><td>Stab, der nur Zug trägt</td></tr>
</table>

<p>Gerechnet wird jeder Stab mit sechs Freiheitsgraden je Knoten, mit
Schubverformung. Starrelemente sind Stäbe mit einem Ersatzquerschnitt hoher
Steifigkeit. Das Eigengewicht der Stäbe folgt aus A · ρ; Starrelemente und
Links wiegen nichts.</p>

<h4>3.2 Anschluss Joch – Mast</h4>
<p>Je Gurt ein <b>Linkelement</b> von 50 mm Länge zwischen Gurt und Mast; die
Kopplung liegt in der Mitte des Links. Die Freiheitsgrade sind global
festgelegt:</p>
<table class="dt">
<tr><th>Stufe</th><th>Obergurt</th><th>Untergurt</th></tr>
<tr><td>wie gebaut (Vorgabe)</td><td>x, y gehalten, K_XX</td><td>y, z gehalten, K_XX</td></tr>
<tr><td>eingespannt bis zur Grenze der Hakenschrauben</td><td>x, y, z, K_XX</td>
  <td>x, y, z, K_XX; Kraft in x höchstens F_Grenz</td></tr>
<tr><td>voll eingespannt</td><td>x, y, z, K_XX</td><td>x, y, z, K_XX</td></tr>
</table>

<p>Nur ein Gurt hält wie gebaut in der Jochachse; der Anschluss wirkt in der
Jochebene gelenkig. Eingespannt halten beide Gurte, und das Kräftepaar der
Gurtkräfte überträgt das Einspannmoment. Bei der Stufe <i>bis zur Grenze der
Hakenschrauben</i> gibt der Untergurt in der Jochachse höchstens F_Grenz
weiter (Vorgabe 24 kN je Anschluss); darüber gleitet er. Die Lagerung lässt
sich in der Auflagerskizze je Gurt und Freiheitsgrad frei setzen.</p>

<p>Ein Joch ohne Masten ist an seinen Enden über die Gurte gelagert; welche
Gurte in x, y, z halten, wird in derselben Skizze gewählt.</p>

<h4>3.3 Begrenzter Halt</h4>
<p>Zwei Haltekräfte sind in ihrer Grösse begrenzt: die Rückhaltekraft der Leiter
(Abschnitt 4.6) und die Grenze der Hakenschrauben. Beide werden linear gerechnet:
je Halt ein Hilfslastfall (Einheitskraft am Haltepunkt), je Kombination ein
kleines Gleichungssystem. Ist der Halt nicht ausgeschöpft, ist der Punkt
gehalten; sonst wirkt die Grenzkraft gegen die Bewegung. Das Ergebnis steht als
Faktor des Hilfslastfalls in der Kombination und gilt für alle Nachweise.</p>

<h4>3.4 Seile nur auf Zug</h4>
<p>Seilanker und Aufhängungen tragen keinen Druck. Müsste ein Seil in einer
Kombination drücken, wird es über einen Hilfslastfall ausgeschaltet; das
Tragwerk trägt dann ohne dieses Seil.</p>

<h4>3.5 Blatt und Reihe</h4>
<p>Alle sichtbaren Tragwerke eines Querprofils stehen in einem Stabwerk. Stossen
zwei Tragjoche auf gleicher Höhe am selben Masten, endet jedes 5 cm vor der
Mastachse; das Endfeld am Stoss wird entsprechend kürzer.</p>

<p class="hb-quelle">export.axisvm.js · core.stabwerk.js · core.stabrueckhalt.js ·
core.stabschraube.js · core.stabseil.js</p>
`,
},

// ===========================================================================
{
  id: 'einwirkungen',
  titel: '4 · Einwirkungen',
  html: `
<h4>4.1 Einwirkungsgruppen</h4>
<table class="dt">
<tr><th>Gruppe</th><th>Art</th><th>Inhalt</th></tr>
<tr><td>G</td><td>ständig</td><td>Eigengewicht von Tragwerk, Masten und
  Anbauteilen; Umlenkkraft und Leiterzug</td></tr>
<tr><td>Wind x</td><td>veränderlich</td><td>Wind quer zum Gleis</td></tr>
<tr><td>Wind y</td><td>veränderlich</td><td>Wind längs zum Gleis</td></tr>
<tr><td>Schnee</td><td>veränderlich</td><td>Schneelast auf Träger und Anbauteile</td></tr>
</table>

<p>Wind wirkt in beiden Vorzeichen und je in einer Richtung, nie quer und längs
zugleich.</p>

<h4>4.2 Laufmeterlasten und Mastwind</h4>
<p>Eigengewicht, Wind und Schnee des Trägers sind charakteristische
Laufmeterlasten aus dem Sortiment, je Einwirkungsklasse EK1 – EK3 (Staudruck
0.90 / 1.10 / 1.30 kN/m²). Der Mastwind kommt je Profil, Stegrichtung und
Einwirkungsklasse aus der Tabelle und lässt sich je Mast und Richtung von Hand
überschreiben. Für dicht überbautes Gebiet wird der Wind mit 0.74 abgemindert;
der Faktor wirkt in den Kombinationen.</p>

<h4>4.3 Umlenkkraft</h4>
<p>Im Bogen knickt die Fahrleitung an jeder Aufhängung um den Ablenkwinkel α;
die Resultierende der Leiterzüge wirkt quer zum Gleis:</p>

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

<p>Die Gleichung ist exakt. Das Vorzeichen von R oder ein am Leiter gesetzter
Winkel bestimmt die Bogenseite. Die Umlenkkraft ist ständig.</p>

<h4>4.4 Leiterzug und Regliertemperatur</h4>
<p>Beweglich abgespannte Leiter (Nachspannung) haben einen konstanten Zug; fix
abgespannte folgen der Temperatur nach der Reglagetabelle (belastete Zeile).</p>
<table class="dt">
<tr><th>Kombination</th><th>Temperatur</th></tr>
<tr><td>Wind leitend</td><td>+5 °C</td></tr>
<tr><td>Schnee leitend</td><td>−5 °C mit Zusatzlast 0.007 kN/m (bis 1000 m ü. M.)</td></tr>
<tr><td>Havarie</td><td>−20 °C</td></tr>
</table>
<p>Fehlt die Reglagezeile eines fix abgespannten Leiters, gilt der Wert bei
+5 °C, und ein Hinweis nennt den Leiter.</p>

<h4>4.5 Abfangung der Leiter</h4>
<table class="dt">
<tr><th>Abfangung</th><th>ständig</th><th>Leiterriss</th></tr>
<tr><td>durchgehend</td><td>kein Längszug</td><td>10 % von Z(−20 °C)</td></tr>
<tr><td>beidseitig abgefangen</td><td>kein Längszug (die Züge heben sich auf)</td>
  <td>voller Zug einseitig</td></tr>
<tr><td>einseitig abgefangen</td><td>voller Zug Z in Zugrichtung</td>
  <td>Zug fällt weg</td></tr>
</table>
<p>Ein einseitig abgefangener Leiter trägt Gewicht, Wind und Umlenkung über die
halbe Spannweite. Am Abfangjoch ist «einseitig» die Vorgabe, die Zugrichtung
folgt der Anbindung. Ein Leiter, dessen Gewicht abgewählt ist (nur abgezogen),
ist kein Kandidat für den Leiterriss.</p>

<h4>4.6 Havariefall</h4>
<p>Je Leiter, der reissen kann, ein aussergewöhnlicher Fall in ±y: der
gerissene Leiter verliert seinen Zug (Abfangart nach 4.5), die übrigen ziehen
mit Z(−20 °C), die Umlenkung des gerissenen Leiters zur Hälfte. Keine
veränderlichen Einwirkungen. Ein Kettenwerk (Tragseil und Fahrdraht an derselben
Stelle) ist ein Leiter. Der Havariefall lässt sich für das Blatt abschalten.</p>

<h4>4.7 Rückhaltekraft</h4>
<p>Leiter, die direkt an einem Tragjoch oder Tragausleger hängen, halten den
Leiterpunkt in Gleisrichtung fest, höchstens mit R = min(p · Z(+5 °C), R_max)
(Vorgabe p = 10 %, R_max = 0.5 kN je Leiter), skaliert mit dem Beiwert des
Winds längs. Gerechnet als begrenzter Halt (Abschnitt 3.3); nur unter Wind
längs, nie im Havariefall.</p>

<p class="hb-quelle">core.lasten.js · core.trasse.js · data.fl.js · data.anbauteile.js</p>
`,
},

// ===========================================================================
{
  id: 'lastfaelle',
  titel: '5 · Lastfälle und Kombinationen',
  html: `
<h4>5.1 Charakteristische Fälle</h4>
<p>Jede Einwirkung allein und mit der ständigen Last, alle Beiwerte 1.0:
Ständig (Tragwerk), Ablenkkräfte ständig, Schnee, Wind ±x, Wind ±y,
Ständig + Wind je Richtung. Sie sind Grundlage der Nachweise gegen zulässige
Kräfte (Anker, Fundament, Aufhängung) und der Reaktionskräfte.</p>

<h4>5.2 Tragsicherheit</h4>
${f(`E_d = γ_G · G &nbsp;+&nbsp; γ_Q · Q_leitend &nbsp;+&nbsp; ψ₀ · Q_begleitend`)}
<table class="dt">
<tr><th>Satz</th><th>γ_G</th><th>γ_Q</th><th>ψ₀</th></tr>
<tr><td>Bahnsatz (Vorgabe)</td><td>1.30</td><td>1.30</td><td>0.65</td></tr>
<tr><td>SIA 260</td><td>1.35</td><td>1.50</td><td>0.60</td></tr>
</table>
<p>Die Begleiteinwirkung steht ohne γ_Q (SIA 260 Gl. 16). Wind leitend in ±x
und ±y; Schnee leitend mit begleitendem Wind in einer Richtung. Eigene Fälle mit
freien Beiwerten sind möglich und werden als abweichend gekennzeichnet.</p>

<h4>5.3 Aussergewöhnlich</h4>
${f(`1.0 · G &nbsp;+&nbsp; A (Leiterriss, −20 °C)`)}

<h4>5.4 Gebrauchstauglichkeit</h4>
<p>Betriebswind: nur Wind, × ψ = 0.70 (Wiederkehrperiode 5 Jahre), je Richtung
und Vorzeichen.</p>

<h4>5.5 Hülle</h4>
<p>Jeder Nachweis nimmt das Maximum über seine Fälle; die Kachel nennt die
massgebende Kombination.</p>

<p class="hb-quelle">core.lasten.js · <code>lastfaelle</code></p>
`,
},

// ===========================================================================
{
  id: 'anbauteile',
  titel: '6 · Anbauteile',
  html: `
<p>Ein Anbauteil besteht aus Bausteinen der Lasttabelle (Träger, Aufbau,
Drahtwerk, Fläche) mit ihren Angriffspunkten. Vorlagen fassen typische
Zusammenstellungen; eigene Vorlagen lassen sich speichern.</p>

<h4>6.1 Lage und Kette</h4>
<p>Vom Anschluss führt eine starre Kette zu jedem Lastpunkt. Sie fährt die
Achsen in der Reihenfolge ab, in der sie eingegeben wurden, ohne Angabe z, y,
x. Ein Träger mit Gesamtlänge (Hängestütze, Jochaufsatz, Ausleger, Konsole)
hat seinen Lastpunkt in der Mitte der Länge; was am Ende hängt, wandert mit
der Länge. Lasten über der Mastspitze hängen an einem starren Rohr; Lasten
unter der Fundamentkote sind nicht zulässig.</p>

<h4>6.2 Befestigung am Joch</h4>
<p>Am Untergurt, am Obergurt oder an beiden, an zwei bzw. vier Punkten im
Abstand des Rasters (meist 400 mm). Ein Leiter direkt am Joch hängt an zwei
Punkten einer Gurtebene.</p>

<h4>6.3 Teile am Masten</h4>
<p>Höhe ab Mastfuss, x und y ab der Mastachse. Leiter direkt am Masten stehen
auf der Mastachse.</p>

<h4>6.4 Wind auf Ausleger und Hängestütze</h4>
<p>Der Wind auf einen Ausleger wirkt wahlweise zur Hälfte auf die Achse des
Trägers (Hängestütze oder Mast): den Rest trägt die gespannte Fahrleitung.
Drahtwerke tragen ihren Wind über die Spannweite der Fahrleitung.</p>

<h4>6.5 Gruppen und Bestand</h4>
<p>Teile lassen sich zu Gruppen zusammenfassen (Name, Farbe, Verschieben).
Mit dem Nachweis Bestandesschutz trägt jedes Teil das Kennzeichen «neu»
(Abschnitt 14).</p>

<p class="hb-quelle">core.anbauteile.js · data.anbauteile.js</p>
`,
},

// ===========================================================================
{
  id: 'nachweise',
  titel: '7 · Nachweise der Bauteile',
  html: `
<p>Material und Querschnitt nach EN 1993-1-1, f_yd = f_y / γ_M0 mit
γ_M0 = 1.05. Die Schnittgrössen kommen aus dem Stabwerk, ausgewertet an den
Stabenden und am Masten alle 0.5 m.</p>

<h4>7.1 Gurtwinkel</h4>
${f(`σ = N / A &nbsp;+&nbsp; Biegung über die Hauptachsen (mit I_yz), an der ungünstigen Ecke<br>
η = |σ| / f_yd`)}
<p>Die Vorzeichen von N, M_y und M_z werden mitgeführt. Im Knotenbereich
(steifer Abschnitt über die Blechbreite) wird am Anschnitt zum freien Gurt
ausgewertet.</p>

<h4>7.2 Bindebleche</h4>
${f(`σ = |N| / A + |M_y| / W_y + |M_z| / W_z &nbsp;&nbsp; τ = 1.5 · V / A<br>
σ_v = √( σ² + 3τ² ) &nbsp;&nbsp; η = σ_v / f_yd`)}
<p>Stehende Bleche, durchgeschweisst an den Gurt (EXC 2), lassen sich plastisch
nachweisen:</p>
${f(`η = N / N_pl + |M_y| / M_pl,y + |M_z| / M_pl,z &nbsp;&nbsp;
t = min( Blech, dünnster Gurtschenkel )`)}
<p>Liegende Bleche bleiben elastisch; Kehlnähte werden nicht nachgewiesen.</p>

<h4>7.3 Masten</h4>
<p>Querschnitt elastisch oder plastisch (Schalter), Querschnittsklasse nach
EN 1993-1-1 Tab. 5.2. Torsion mit Wölbspannung σ_ω des offenen Profils.</p>

<h4>7.4 Knicken der Masten (SIA 263)</h4>
${f(`N_cr = π²·E·I / L²&nbsp;&nbsp;&nbsp; λ̄ = √( N_pl / N_cr )&nbsp;&nbsp;&nbsp; χ nach Knickspannungslinie<br>
η = N / N_b,Rd + k_y · M_y / M_y,Rd + k_z · M_z / M_z,Rd`)}
<p>Knicklänge über den Knicklängenbeiwert β (Kragmast β = 2); die Lasten stehen
auf ihrer Höhe. Der Nachweis ist abschaltbar.</p>

<h4>7.5 Gurtverbindung (Bügelschrauben)</h4>
<p>Grösste Kraft in der Jochachse je Gurtanschluss gegen F_Grenz. Bei der
Stufe «bis zur Grenze der Hakenschrauben» ist der Untergurt auf F_Grenz
begrenzt.</p>

<h4>7.6 Gesamturteil</h4>
<p>Maximum aller geführten Nachweise mit dem massgebenden Bauteil. Mit der
Nachweisart «beide» zählt die Gebrauchstauglichkeit dazu. Abgeschaltete
Nachweise stehen unter «nicht geführt» und zählen nie als erfüllt.</p>

<p class="hb-quelle">core.stabnachweis.js · core.winkel.js · core.mast.js · core.stabmast.js</p>
`,
},

// ===========================================================================
{
  id: 'fundament',
  titel: '8 · Fundament',
  html: `
<p>Standardfundamente nach Masttyp (Zuordnung über Profil und Stegrichtung)
oder gewählt; Gelände bis 14°, 14°–33° horizontal oder 14°–33° Richtung
fallende Böschung. Nachgewiesen werden die charakteristischen Kräfte am
Fundamentkopf gegen die zulässigen Standardlasten, <b>quer und längs zum Gleis
getrennt</b>, nicht überlagert.</p>

<h4>8.1 Ablauf der Fundamentbestimmung</h4>
<p>Je Richtung stehen Basiswerte für den ständigen (st), den veränderlichen
(ver) und den gesamten Anteil (tot), dazu V und T. Ist ein Basiswert
überschritten, gleicht der Ablauf aus, indem er einen anderen zulässigen Wert
abmindert.</p>

<svg viewBox="0 0 680 560" class="hb-bild" role="img"
     aria-label="Ablauf der Fundamentbestimmung, 19 Schritte"
     style="max-width:680px;width:100%;font-family:var(--f-mono);font-size:10.5px">
  <defs>
    <marker id="hbPf" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker>
  </defs>
  <g fill="none" stroke="currentColor" stroke-width="1" opacity=".55" marker-end="url(#hbPf)">
    <path d="M120,48 V70"/><path d="M120,118 V140"/><path d="M120,188 V210"/>
    <path d="M120,258 V280"/><path d="M120,328 V350"/><path d="M120,398 V420"/>
    <path d="M240,234 H420"/><path d="M240,304 H300 V350 H420"/>
    <path d="M540,258 V280"/><path d="M540,328 V350"/><path d="M540,398 V420"/>
    <path d="M540,468 V490"/>
  </g>
  ${[
    // Hauptweg
    [0, 10, '1  alle Basiswerte eingehalten?', 'ja → ZULÄSSIG (Basis)  ·  nein → 2'],
    [0, 80, '2  V, M_tot oder T über zul.?', 'ja → GRÖSSERES FUNDAMENT  ·  nein → 3'],
    [0, 150, '3  M_ver über seiner Grenze?', 'ja → GRÖSSERES FUNDAMENT  ·  nein → 4'],
    [0, 220, '4  H_tot über zul.?', 'ja → 9  ·  nein → 5'],
    [0, 290, '5  H_ver über zul.?', 'ja → 10/11  ·  nein → 6'],
    [0, 360, '6  M_ver über zul.?', 'nein → ZULÄSSIG  ·  ja → 7/8'],
    [0, 430, '7  M_st,zul,neu1 = M_st,zul − ΔM_ver · red_M', '8  M_st > neu1 → GRÖSSER, sonst ZULÄSSIG'],
    // Weg über die Horizontalkraft
    [420, 220, '9  H_ver über zul.?', 'ja → 12/14  ·  nein → 13'],
    [420, 290, '10  H_st,zul,neu = H_st,zul − ΔH_ver · red_M', '11  H_st > neu → 12/14, sonst → 6'],
    [420, 360, '12  H_fikt = H_tot + ΔH_ver·red_M + ΔH_st', '13/14  M_tot,zul,neu = M_tot,zul − ΔH · red_H'],
    [420, 430, '15  M_tot > M_tot,zul,neu → GRÖSSER', '16  Anteile st / ver von M_tot,zul,neu'],
    [420, 500, '17  M_ver ≤ M_ver,neu → ZULÄSSIG', '18/19  M_st,neu2 = neu1 − ΔM_ver·red_M; M_st > neu2 → GRÖSSER'],
  ].map(([x, y, a, b]) => `<g transform="translate(${x},${y})">
      <rect width="${x ? 260 : 240}" height="38" rx="5" fill="var(--s2)" stroke="var(--ol)"/>
      <text x="8" y="15" fill="var(--on)">${a}</text>
      <text x="8" y="30" fill="var(--dim)">${b}</text></g>`).join('')}
</svg>

<table class="dt">
<tr><th>Wert</th><th>Bedeutung</th><th>Schritt</th></tr>
<tr><td>red_M</td><td>kNm zulässiges ständiges Moment weniger je kNm
  Überschreitung des veränderlichen</td><td>7, 10, 12, 18</td></tr>
<tr><td>red_H</td><td>kNm zulässiges Gesamtmoment weniger je kN Überschreitung
  der Horizontalkraft</td><td>13, 14</td></tr>
</table>
<p>Hart bleiben V, T, das Gesamtmoment (Schritt 2) und die Grenze des
veränderlichen Moments M_ver,max (Schritt 3).</p>

<h4>8.2 Ausnutzung</h4>
<p>Horizontalkraft und Moment zählen als <b>Resultierende</b>: massgebend sind
H_tot, M_tot und M_ver gegen M_ver,max, auf einem abgeminderten Weg zusätzlich
M_st gegen den abgeminderten Wert. Die Anteile H_st, H_ver, M_st und M_ver
lenken den Ablauf, sind aber kein eigener Nachweis; Bericht, Diagramm und Kachel
führen sie grau. η liegt genau dann über 1.00, wenn das Fundament nicht
zulässig ist. Ohne Abminderungswerte in der Tabelle bleiben die Momentanteile
Nachweise.</p>

<p>Die Kachel nennt Typ und Weg («Basiswerte eingehalten», «abgemindert
(Schritt n)», «grösseres Fundament nötig») und die massgebende Prüfung.</p>

<p class="hb-quelle">core.fundament.js · <code>fundamentAblauf</code>,
<code>fundamentNachweis</code></p>
`,
},

// ===========================================================================
{
  id: 'anker',
  titel: '9 · Zuganker und Druckstütze',
  html: `
<p>Ein schräger Stab vom Masten zu einem eigenen Fundament, an beiden Enden
gelenkig; er trägt nur Normalkraft. Lage über Höhe h_A am Masten und Abstand a
am Boden, quer oder längs zum Gleis.</p>

<table class="dt">
<tr><th>Typ</th><th>Modell</th><th>Nachweis</th></tr>
<tr><td>Seilanker</td><td>Seil, nur Zug; drückt es, fällt es aus</td>
  <td>Zugkraft gegen die zulässige Kraft</td></tr>
<tr><td>Doppelanker</td><td>zwei Seile von einem Bolzen zu zwei
  Anschlüssen am Masten (Abstand d_A); der Winkel gilt der Resultierenden</td>
  <td>Resultierende gegen 2 × 67 kN, jedes Seil gegen 67 kN</td></tr>
<tr><td>Druckstütze</td><td>Verbundstab aus U-Profilen</td>
  <td>Druck gegen Knicken (Knicklänge = Stablänge), Zug gegen die zulässige Kraft</td></tr>
</table>

<p>Nachgewiesen wird charakteristisch über die charakteristischen und die
aussergewöhnlichen Fälle (Havarie), gegen zulässige Kräfte. Reicht der Typ
nicht, nennt die Kachel die nächste Stufe (Seilanker → Stütze → Doppelanker).</p>

<p class="hb-quelle">core.anker.js · core.stabseil.js · data.anker.js</p>
`,
},

// ===========================================================================
{
  id: 'gzg',
  titel: '10 · Gebrauchstauglichkeit',
  html: `
<p>Unter Betriebswind (nur Wind × 0.70) aus den Knotenwegen des Stabwerks;
zwischen Knoten nach der Biegelinie. Jede Prüfung ist abschaltbar, die
Grenzwerte sind einstellbar.</p>

<table class="dt">
<tr><th>Prüfung</th><th>Grenzwert (Vorgabe)</th></tr>
<tr><td>Seitenlage des Fahrdrahts quer zum Gleis, am Knoten jedes Fahrdrahts</td><td>40 mm</td></tr>
<tr><td>Auslenkung der Mastspitze, quer und längs</td><td>L / 100</td></tr>
<tr><td>Verdrehung des Masten um seine Achse</td><td>5°</td></tr>
<tr><td>Verdrehung des Tragauslegers im Grundriss</td><td>5°</td></tr>
</table>

<p>Ohne Fahrdraht gilt die Referenzhöhe am Masten: automatisch (Ausleger, sonst
Jochauflager), am Ausleger, am Jochauflager oder eine eigene Höhe.</p>

<p class="hb-quelle">core.stabverformung.js · core.verformung.js</p>
`,
},

// ===========================================================================
{
  id: 'abfangjoch',
  titel: '11 · Abfangjoch',
  html: `
<p>Zwei liegende Walzprofile, verbunden durch Bindebleche oben und unten; am
Mastende eine Gabel, am Ende mit der längeren Gabel aufgedoppelt. Die Masten
stehen innerhalb der Trägerlänge; je Länge gilt ein Bereich zulässiger
Stützweiten, Vorgabe ist die grösste (Überstand 25 cm je Seite).</p>

<p>Anschluss je Gurt über ein Linkelement; Vorgabe: hinterer Gurt hält x,
beide halten y und z, K_XX gehalten. Jeder Leiter zieht nach seiner Abfangart
(Abschnitt 4.5), zentrisch in der Trägermittelebene an seiner Stelle x. Die
Kräfte der Anbauteile wirken mit ihrem Hebel zur Trägerachse.</p>

<p>Nachgewiesen werden Gurt und Bindebleche wie die Bauteile des Tragjochs
(Abschnitt 7), dazu Masten, Anker und Fundamente. Mehrere Abfangjoche an
denselben Masten (übereinander) bilden ein Stabwerk.</p>

<p class="hb-quelle">export.axisvm.abfang.js · data.abfangjoche.js</p>
`,
},

// ===========================================================================
{
  id: 'tragausleger',
  titel: '12 · Mast mit Tragausleger',
  html: `
<p>Kragarm aus zwei UPE 140 (280 mm licht) mit Bindeblechen oben und unten, am
Mast als Gabel angeschlossen: beide Gurte halten x, y, z und K_XX. Aufgehängt
an zwei Seilen von einem Punkt am Mast in der Höhe b über dem Ausleger zu den
Enden der Ankertraverse im Abstand c₁ (Spreizung ±0.40 m); b und c₁ aus dem
Sortiment oder über den Winkel α = arctan(b / c₁). Die Mastlänge ist ohne
Eintrag H + b, auf den halben Meter aufgerundet.</p>

<p>Ein Längsanker am Kragarmende hält den Ausleger in Gleisrichtung
(Regelfall, abschaltbar). Der Wind längs wirkt auf den Ausleger selbst
(Laufmeterlast aus der Lasttabelle). Der Ausleger lässt sich nach links oder
rechts setzen; gespiegelt wird die Geometrie, die Einwirkungen bleiben.</p>

<table class="dt">
<tr><th>Nachweis</th><th>Grundlage</th></tr>
<tr><td>UPE und Bindebleche</td><td>wie Abschnitt 7</td></tr>
<tr><td>Aufhängung</td><td>Summe der senkrechten Seilkräfte, charakteristisch,
  gegen V_zul = 5 kN</td></tr>
<tr><td>Mast, Knicken, Fundament</td><td>wie Abschnitte 7 und 8</td></tr>
<tr><td>Verdrehung</td><td>Abschnitt 10</td></tr>
</table>

<p class="hb-quelle">export.axisvm.tragausleger.js · core.tragausleger.js</p>
`,
},

// ===========================================================================
{
  id: 'masten',
  titel: '13 · Masttypen',
  html: `
<h4>13.1 Walzprofile</h4>
<p>HEB und HEM; der Steg liegt quer zum Gleis oder in der Jochachse. Mastlänge
und Fussversatz je Mast; ohne Eintrag gilt die Vorgabe des Tragwerks.</p>

<h4>13.2 Gespreizte Masten (DGP)</h4>
<p>Ein Walzprofil, im unteren Teil L1 in der Stegmitte geteilt und am Fuss
gespreizt. Im Modell zwei T-Hälften mit Bindeblechen in der Stegebene, darüber
das Walzprofil. Nachgewiesen werden die Hälften, die Bleche und das Profil; das
Knicken als Vollstab entfällt.</p>

<h4>13.3 Gittermast</h4>
<p>Vier Gurtwinkel mit den Schenkeln nach innen, unten konisch, Bindebleche auf
vier Seiten; darüber ein Rohr oder ein Mastaufsatz. Das Rohr ist am Kopf
verschraubt und an den tieferen Halterippen nur seitlich gehalten. Wind je Höhe
auf die Ansichtsfläche der Stäbe, das Rohr mit 1.2 · q · d. Nachgewiesen werden
Gurte, Bleche und Rohr je Stab; das Bemessungsdiagramm des Typs steht als
Kontrolle daneben. Kein Knicken als Vollstab, kein Standardfundament. Rohr oder
Aufsatz lassen sich weglassen.</p>

<h4>13.4 Mast auf Perrondach</h4>
<p>Unter dem Mastfuss eine Stütze oder ein Querbalken auf zwei Stützen
(Vorschlagswerte oder frei). Die Kräfte stehen am Übergang; ein Fundament wird
dort nicht nachgewiesen, der Unterbau selbst nicht bemessen.</p>

<p class="hb-quelle">data.masten.js · export.axisvm.gitter.js ·
export.axisvm.gespreizt.js · export.axisvm.unterbau.js</p>
`,
},

// ===========================================================================
{
  id: 'bestand',
  titel: '14 · Einheitswind und Bestandesschutz',
  html: `
<h4>14.1 Einheitswind</h4>
<p>Windstufe der alten Norm: Staudruck 1.0 kN/m² ohne Formbeiwert. Die Werte je
Bauteil stehen in der Datenbasis (EK0); fehlt ein Wert, wird er aus der
Angriffsfläche hergeleitet. Gittermast: 1.52 kN je m² Ansichtsfläche.</p>

<h4>14.2 Bestandesschutz</h4>
<p>Mit eingeschaltetem Nachweis tragen Anbauteile das Kennzeichen «neu». Das
Stabwerk rechnet ein zweites Mal ohne die neuen Teile und vergleicht je
Bauteil die Ausnutzung mit und ohne sie. Liegt die Zunahme unter dem
Grenzwert, ist kein vertiefter Nachweis nötig. Am Fundament wird der grösste
Basiswert verglichen (ohne die Anteile st / ver von H und M). Das Blatt
Bestandesschutz zeigt die neuen Teile rot.</p>

<p class="hb-quelle">core.bestand.js · data.fl.js</p>
`,
},

// ===========================================================================
{
  id: 'ergebnis',
  titel: '15 · Ergebnisse lesen',
  html: `
<h4>15.1 Übersicht</h4>
<p>Die Hauptkachel nennt das grösste η mit dem massgebenden Bauteil; mit der
Nachweisart «beide» einschliesslich der Gebrauchstauglichkeit. Die Fussleiste
zeigt dieselbe Zahl. Darunter je Bauteil eine Kachel mit η, Profil, der
massgebenden Prüfung und der massgebenden Kombination. Solange das Stabwerk
rechnet, stehen vorläufige Werte der Kontrollrechnung (Abschnitt 19).</p>

<h4>15.2 3D-Bild</h4>
<table class="dt">
<tr><th>Plot</th><th>zeigt</th></tr>
<tr><td>η, η w</td><td>Ausnutzung Tragsicherheit bzw. Gebrauchstauglichkeit</td></tr>
<tr><td>σ_v, σ</td><td>Vergleichsspannung, Normalspannung</td></tr>
<tr><td>M, V, N, T</td><td>Schnittgrössen</td></tr>
<tr><td>w</td><td>Weg; dazu die verformte Figur</td></tr>
<tr><td>Pos</td><td>Bauteile nach Position</td></tr>
</table>
<p>Mit «Linie» erscheint die Grösse als Zustandslinie entlang der Stäbe: Ebene
automatisch oder gewählt, Teile wählbar, positive Werte rot, negative blau.
Diagramme von Ober- und Untergurt in einer lotrechten Ebene zeigen mit dem
Betrag nach aussen. «Blick auf die Ebene» dreht die Ansicht einmal auf die
Linie. Rechtsklick auf einen Schalter der Gruppen Lasten oder Modell zeigt nur
diesen, ein zweiter Rechtsklick wieder alle.</p>

<h4>15.3 Weitere Reiter</h4>
<p>Verläufe (η und Schnittgrössen entlang der Gurte, Bleche und Masten),
Auflager (Reaktionskräfte charakteristisch, Kräfte am Jochanschluss).</p>
`,
},

// ===========================================================================
{
  id: 'ausleitung',
  titel: '16 · Berichte und Ausleitung',
  html: `
<table class="dt">
<tr><th>Ausgabe</th><th>Inhalt</th></tr>
<tr><td>Nachweisbericht (PDF)</td><td>Grundlagen, System, Einwirkungen mit
  Lastbildern, Schnittgrössen mit Zustandslinien, Nachweise mit eingesetzten
  Formeln, Fundament mit Ablauf, Gebrauchstauglichkeit mit verformter Figur;
  über das ganze Blatt</td></tr>
<tr><td>Reaktionskräfte (Blatt)</td><td>alle Auflager, charakteristisch, Druck
  positiv, mit Skizze, Achsen und Hinweisen</td></tr>
<tr><td>Kräfte am Jochanschluss (Blatt)</td><td>Resultierende je Jochende, auf
  Wunsch je Gurt</td></tr>
<tr><td>Bestandesschutz (Blatt)</td><td>Vergleich mit und ohne neue Teile</td></tr>
<tr><td>Excel</td><td>Eingabe, Urteil, Zwischenwerte, alle Stäbe, Masten,
  Reaktionen</td></tr>
<tr><td>AxisVM (COM-Brücke, JSON)</td><td>dasselbe Stabmodell: Knoten, Stäbe,
  Querschnitte, Links, Starrkörper, Lasten, Kombinationen; begrenzte Halte als
  Faktoren der Hilfslastfälle</td></tr>
<tr><td>SAF, DXF, PyNite</td><td>Austauschformate und unabhängige Nachrechnung</td></tr>
</table>

<p>Die COM-Brücke baut das Modell in AxisVM auf; rechnen und auslesen auf
Wunsch. Die ausgelesenen Ergebnisse lassen sich einlesen und als
<b>Gegenrechnung</b> neben die eigene Rechnung stellen (dieselbe Auswertung,
nur die Schnittgrössen aus AxisVM).</p>

<p class="hb-quelle">export.stabbericht.js · export.reaktionen.js ·
export.axisvm.js · com/</p>
`,
},

// ===========================================================================
{
  id: 'ablage',
  titel: '17 · Projekte und Datenbasis',
  html: `
<p>Der Arbeitsstand wird im Browser gehalten. Die Projektablage (IndexedDB)
führt Projekte mit ihren Querprofilen, je mit Zeichnung; sie lässt sich als
Paket ausleiten und einlesen. Eine hinterlegte Querprofilzeichnung wird an
zwei Punkten bzw. einer bekannten Länge eingemessen.</p>

<p>Die Datenbasis (Sortimente, Lasttabelle, Reglagetabelle, Fundamentlasten,
Anker) kommt als Datenpaket. Eingelesene Tabellen werden gegen den Bestand
abgeglichen; Änderungen an geprüften Sätzen werden gemeldet. Die Normwerte
der Profile gehören zur Anwendung.</p>
`,
},

// ===========================================================================
{
  id: 'bedienung',
  titel: '18 · Bedienung',
  html: `
<ul class="hb-liste">
<li><b>Reiter</b> System, Anbauteile, Lasten; die Sprungleiste oben öffnet und
  zeigt eine Gruppe.</li>
<li><b>Neues Querprofil</b>: Art, Typ, Länge, Höhe und Grundwerte in einem
  Dialog. Weitere Tragwerke über die Kacheln oder das Kontextmenü, zwischen
  zwei Masten.</li>
<li><b>Ziehen im 3D</b>: Anbauteile, Angriffspunkte auf der Achse ihres
  Glieds, Länge am Ende eines Trägers, Masten an Kopf, Fuss oder Lage. Mit Strg
  wird eine Kopie abgelegt. Raster 0.10 m.</li>
<li><b>Kontextmenü</b> (Rechtsklick) an Tragwerk, Mast, Anker und Anbauteil.</li>
<li><b>Lastfall</b>: «umhüllend» oder ein einzelner Fall; die Liste ordnet die
  Fälle quer und längs zum Gleis.</li>
<li><b>Rückgängig</b> Strg+Z, Wiederholen Strg+Umschalt+Z; die Tastenkürzel
  stehen in der Übersicht der Anwendung.</li>
<li><b>Schulung</b>: die leichte Fassung rechnet mit demselben Stabwerk und zeigt
  nur einen Teil der Eingaben.</li>
<li><b>Viewer</b> (Export → Weitergeben): eine HTML-Datei mit Modell, allen
  Lastfällen, Nachweisbericht und Massenauszug zum Weitergeben; sie rechnet nicht.
  Ein Klick auf ein Bild im Bericht zeigt dieselbe Ansicht im Modell.</li>
</ul>
`,
},

// ===========================================================================
{
  id: 'kontrolle',
  titel: '19 · Kontrollrechnung',
  html: `
<p>Neben dem Stabwerk läuft eine vereinfachte Rechnung: das Joch als
Einfeldträger mit Drehfedern an den Enden, die Masten als Kragarme, die
Schnittgrössen auf Gurte und Bindebleche umgerechnet. Sie liefert sofort
Werte und dient</p>
<ul class="hb-liste">
<li>der vorläufigen Anzeige, solange das Stabwerk rechnet («Kontrollrechnung ·
  vorläufig»),</li>
<li>dem Knicken an Masten, für die das Stabwerk keine Kräfte liefert,</li>
<li>der Plausibilitätsprüfung im Prüfstand.</li>
</ul>
${f(`c_φ = 4 · E · I_Mast / H &nbsp;&nbsp; (Drehfeder des Jochendes aus dem Mast)`)}
<p>Für den Nachweis massgebend ist das Stabwerk. Die Kontrollrechnung sieht die
Biegung der Bleche aus ihrer Ebene nicht und kennt keine Rahmenwirkung über die
Reihe.</p>

<p class="hb-quelle">core.statics.js · core.vierendeel.js · core.querschnitt.js</p>
`,
},

// ===========================================================================
{
  id: 'grenzen',
  titel: '20 · Modellgrenzen',
  html: `
<h4>20.1 Nicht gerechnet</h4>
<table class="dt">
<tr><th>Nicht enthalten</th><th>Folge</th></tr>
<tr><td><b>Knicken</b> von Gurtwinkeln, Bindeblechen und Gittermasten;
  Biegedrillknicken (χ_LT = 1.0); <b>Beulen</b></td>
  <td>separat zu führen</td></tr>
<tr><td><b>Schweissnähte</b> und Anschlüsse (Kehlnähte, Schrauben ausser der
  Grenzkraft der Gurtverbindung, Fussplatten)</td><td>separat zu führen</td></tr>
<tr><td><b>Ermüdung</b></td><td>nicht betrachtet</td></tr>
<tr><td><b>Querschnittsklasse 4</b></td><td>elastisch mit Bruttoquerschnitt –
  unsichere Seite, ein Hinweis nennt es</td></tr>
<tr><td><b>Wölbkrafttorsion</b> der Gurte und Bleche</td><td>nur St.-Venant;
  am Masten mit σ_ω</td></tr>
<tr><td>Theorie zweiter Ordnung, nichtlineares Material</td><td>linear-elastisch;
  Stabilität über die Ersatzstabnachweise</td></tr>
<tr><td>Baugrund, Sonderfundamente, Unterbau auf Perrondach</td><td>Kräfte
  werden ausgegeben, nicht bemessen</td></tr>
</table>

<h4>20.2 Vereinfachungen</h4>
<table class="dt">
<tr><th>Annahme</th><th>Richtung</th></tr>
<tr><td>Anbauteile starr</td><td class="hb-sicher">sicher</td></tr>
<tr><td>Wind nie quer und längs zugleich</td>
  <td class="hb-neutral">Festlegung; schräge Anströmung nicht abgedeckt</td></tr>
<tr><td>Seile ohne Vorspannung, nur Zug</td><td class="hb-neutral">Näherung</td></tr>
<tr><td><b>Verformung</b> unter Betriebswind aus dem linearen Stabwerk</td>
  <td class="hb-neutral">Näherung</td></tr>
<tr><td>Fundamentfuss starr eingespannt</td><td class="hb-neutral">Näherung</td></tr>
</table>

<h4>20.3 Eingangsdaten</h4>
<p>Die Rechnung ist so gut wie die Datenbasis. Geometrie, Blecheinteilung und
Lasten stammen aus den Sortimenten; eine Länge ausserhalb des Sortiments wird
gemeldet und im Stabwerk nicht gerechnet.</p>
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
      <p class="notiz">Rechenmodell, Einwirkungen, Nachweise und Grenzen des
        Modells. Jeder Abschnitt nennt die Datei des Rechenkerns, in der die
        Regel steht.</p>
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
  const titel = o.titel ?? 'Vierendeel – Handbuch';
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

  // Mit `kurs` das Handbuch zum Kurs (Schulung, 15. November), in der
  // Sprache `o.sprache` (16. November).
  const kapitel = o.kurs ? kursKapitel(o.sprache) : HANDBUCH;
  const wo = o.kurs ? (o.sprache ?? 'de') : 'de';
  const toc = kapitel.map((s) =>
    `<a class="hb-toc-e" href="#hb-${s.id}">${s.titel}</a>`).join('');
  const rumpf = kapitel.map((s) =>
    `<section class="hb-abschnitt" id="hb-${s.id}"><h3>${s.titel}</h3>${s.html}</section>`)
    .join('');

  return `<!doctype html>
<html lang="${wo}"><head><meta charset="utf-8">
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
<p class="notiz hb-stand">${STAND_WORT[wo] ?? 'Stand'} ${stand}${o.fussnote ? ` · ${o.fussnote}` : ''}</p>
<nav class="hb-toc"><div class="hb-toc-t">${INHALT_WORT[wo] ?? 'Inhalt'}</div>${toc}</nav>
${rumpf}
</div></body></html>`;
}

/* ==========================================================================
 * >>> DAS HANDBUCH ZUM KURS (15. November). <<<
 * Weisung: «handbuch kürzen entsprechend der funktionalität im kursmodus. und
 * biete noch einzelnen erklärungen bezüglich der tragwerksbemessung.» Die
 * Schulungsfassung zeigt statt der 21 Kapitel der Herleitung dieses kurze
 * Handbuch: was man tut, was das Ergebnis heisst und wie bemessen wird. Die
 * Zahlen sind die Vorgaben der Anwendung (Bahn-Satz, S235) - nichts davon
 * ist hier neu festgelegt.
 * ======================================================================== */
export const KURS_HANDBUCH = [
  /*
   * >>> DER ABLAUF SCHRITT FÜR SCHRITT (16. November). <<< Weisung: «das
   * handbuch ist auch zu aktualisieren und bei der schulungsversion mit den
   * notwendigen erkärungen zum workflow zu versehen.» Kapitel 1-7 führen
   * durch die Bedienung, 8-13 erklären die Bemessung.
   */
  { id: 'k-start', titel: '1 Erste Schritte', html: `
    <p><b>Beim Öffnen</b> stehen die Nutzungsbedingungen (Kapitel 13). Mit
      «Gelesen und einverstanden» geht es weiter.</p>
    <p><b>In der Kopfzeile</b> steht das Tragwerk, an dem man arbeitet (Projekt und
      Name). Ein Klick darauf öffnet den <b>Projektmanager</b>:</p>
    <ul>
      <li><b>Übungsbeispiele</b> - ein Querprofil aus dem Kurs laden; die
        Planzeichnung liegt dabei hinter dem Modell (in der Längsansicht
        sichtbar). Das Beispiel kommt als Eintrag in die Ablage.</li>
      <li><b>Neues Querprofil</b> - mit einem leeren Tragwerk beginnen.</li>
      <li><b>Speichern</b> - der Stand kommt in die Ablage dieses Browsers;
        «Ausleiten» schreibt ihn als Datei, «Einlesen» holt eine Datei herein.</li>
    </ul>
    <p>Die Eingabe läuft in <b>drei Schritten</b> (Reiter links oben, «Weiter»
      unten): 1 Tragwerk, 2 Anbauteile, 3 Trasse, Wind, Schnee. Gerechnet wird
      nach jeder Eingabe von selbst, das Ergebnis steht rechts.</p>
    <p>Rückgängig: <b>Strg+Z</b> (oder die Pfeile oben neben «Export»), wiederherstellen: <b>Strg+Umschalt+Z</b>.</p>` },
  { id: 'k-tragwerk', titel: '2 Schritt 1: Tragwerk', html: `
    <ol>
      <li><b>Art wählen</b> - die Kacheln Tragjoch, Einzelmast, Tragausleger,
        Abfangjoch anklicken oder ins 3D ziehen. Das Band darüber zeigt die
        Lage aller Tragwerke und Masten auf dem Querprofil; ein Klick wählt.</li>
      <li><b>Joch</b> - Typ und Länge (die Längen des Sortiments), Höhe über dem
        Boden. «Anschluss Joch am Masten»: <i>wie gebaut</i> (in der Jochebene
        gelenkig), <i>eingespannt bis zur Grenze der Hakenschrauben</i> (der
        Untergurt gibt am Masten höchstens 24 kN je Anschluss weiter, darüber
        gleitet er) oder <i>voll eingespannt</i> (ohne Grenze, nur zum
        Vergleichen) - so sieht man, wie sich Ausnutzung und Verformung
        ändern.</li>
      <li><b>Masten</b> - Profil, Länge (auf 0.5 m), Ausrichtung des Stegs, Lage.
        Im 3D lässt sich ein Mast am Schaft verschieben und am Kopf verlängern.</li>
      <li><b>Abspannung</b> - Zuganker oder Druckstütze am Masten («Anker» als
        Kachel auf einen Masten ziehen oder unter «Abspannung des Masten»).</li>
      <li><b>Tragausleger</b> - Länge, Seite (links/rechts) und der Längsanker am
        Kragarm mit seiner Stelle.</li>
    </ol>` },
  { id: 'k-anbau', titel: '3 Schritt 2: Anbauteile', html: `
    <h4>Setzen</h4>
    <ol>
      <li>Unter «Anbauteil hinzufügen» eine Vorlage suchen (Suchfeld) und
        anklicken - oder «Bauteil zuweisen» und dann ins Modell klicken; dort
        steht die Auswahl, die an diese Stelle passt.</li>
      <li>Ins 3D an die Stelle klicken: am Joch die Lage x, am Masten die Höhe.
        Ausleger gibt es je <b>nach rechts</b> und <b>nach links</b>.</li>
    </ol>
    <h4>Die Karte</h4>
    <p>Ein Klick auf eine Zeile öffnet die Karte: Name, Standort (Joch oder
      Mast), Lage bzw. Höhe, am Joch die Befestigung (Untergurt, Obergurt,
      beide) mit dem Raster der Klemmen. Darunter je Baustein der
      <b>Angriffspunkt</b> x, y, z (am Joch ab der Schwerachse des Gurts, am
      Masten ab dem Anschluss).</p>
    <p>Die Karte lässt die <b>Bausteine</b> hinzufügen, tauschen und entfernen
      und das Teil einer <b>Gruppe</b> zuordnen (z. B. «Gleis 1»); die Gruppe
      lässt sich benennen und duplizieren.</p>
    <ul>
      <li>Ein Wert mit «Mitte der Gesamtlänge» folgt aus der <b>Gesamtlänge</b>
        darüber - dort ändern.</li>
      <li><b>x ⇄</b> spiegelt einen Ausleger samt Fahrleitung auf die andere Seite.</li>
      <li>Das Häkchen schaltet ein Teil aus (nicht gerechnet), der Papierkorb
        löscht es, das Doppelblatt kopiert es.</li>
    </ul>
    <h4>Im 3D ziehen</h4>
    <ul>
      <li>Das <b>Teil</b> anfassen: am Joch längs verschieben, am Masten in der Höhe.</li>
      <li>Ein <b>Angriffspunkt</b> (Kugel) wandert auf seiner Achse - eine
        Hängestütze lotrecht, ein Ausleger waagrecht; was am Ausleger hängt,
        wandert mit.</li>
      <li>Das <b>Ende</b> (Würfel) eines Teils mit Länge ändert die Gesamtlänge.</li>
      <li>Mit <b>Strg</b> gezogen entsteht eine Kopie. Rechtsklick öffnet die Befehle.</li>
    </ul>` },
  { id: 'k-trasse', titel: '4 Schritt 3: Trasse, Wind, Schnee', html: `
    <ul>
      <li><b>Abstand zum nächsten Masten</b> (Spannweite) und <b>Kurvenradius</b>
        (+ und − für die beiden Kurvenrichtungen; 0 = gerade). Daraus folgt
        die Umlenkkraft der Leitungen.</li>
      <li><b>Windzone</b>, dazu die <b>Windreduktion</b> × 0.74 für dicht
        überbautes Gebiet.</li>
      <li><b>Schnee</b> ein oder aus.</li>
    </ul>
    <p><b>Was gerechnet wird</b> listet die Lastfälle nach Richtung: quer zum
      Gleis (Wind von links oder rechts), längs zum Gleis (vorwärts oder
      rückwärts), Weitere, und darunter die <b>Verformung</b> (nur Wind × 0.70).
      Ein Klick zeigt den Fall im 3D und im Ergebnis; «Alle Fälle» zeigt je
      Bauteil den ungünstigsten. «Alle Kombinationen mit Lastbeiwerten» öffnet
      die ganze Tabelle.</p>` },
  { id: 'k-ergebnis', titel: '5 Das Ergebnis lesen', html: `
    <p><b>Ausnutzung</b> = Beanspruchung geteilt durch Widerstand. 100 % heisst:
      genau an der Grenze. Über 100 % ist ein Bauteil zu schwach.</p>
    <p>Je Gruppe (Träger, Masten, Anker, Fundamente, Verformung) steht das am
      stärksten beanspruchte Bauteil. Die Farbe: grün bis 90 %, gelb bis 100 %,
      rot darüber.</p>
    <p><b>Spannungen in den Profilen</b>: die grösste Vergleichsspannung σ_v im
      Profil und die Grenze, gegen die sie steht, in N/mm². Für Stahl S235 ist
      die Grenze f_yd = 235 / 1.05 = 224 N/mm².</p>
    <p>Ist ein Lastfall gewählt, gelten Satz, Balken und Spannungen diesem Fall
      («Im Fall …»). Der Reiter <b>Auflager</b> zeigt die Reaktionskräfte an
      den Fundamenten (charakteristisch).</p>` },
  { id: 'k-3d', titel: '6 Das 3D-Bild', html: `
    <ul>
      <li><b>Blick</b> - Isometrie, Längsansicht (quer zum Gleis gesehen),
        Querschnitt, Draufsicht. Drehen mit gedrückter Maus, schieben mit der
        rechten, zoomen mit dem Rad.</li>
      <li><b>Zeichnung</b> - ein Querprofil (Bild oder PDF-Seite) hinterlegen
        und an Joch- oder Mastlänge einmessen.</li>
      <li><b>Lasten</b> - je Art ein- und ausblenden (ständig, Umlenkung, Wind
        quer, Wind längs, Schnee), Werte anschreiben. Rechtsklick auf einen
        Knopf zeigt nur diese Last.</li>
      <li><b>Resultate</b> - η (Ausnutzung), σ_v (Vergleichsspannung), M, V, N,
        T (Schnittkräfte), w (Verformung), Pos (Bauteile nach Position).
        <b>Linie</b> zeigt die gewählte Grösse als Zustandslinie entlang der
        Stäbe statt als Farbe; Ebene und Teile wählt man in der Legende.</li>
    </ul>` },
  { id: 'k-mehr', titel: '7 Auflager und Export', html: `
    <p>Der Reiter <b>Auflager</b> zeigt die Reaktionskräfte an den
      Fundamenten, charakteristisch (alle Beiwerte 1.0), getrennt quer und
      längs zum Gleis.</p>
    <p><b>Export</b>: das Blatt der Reaktionskräfte (mit Skizze und Hinweisen)
      und die Kurzzusammenfassung der Berechnung als PDF.</p>
    <p>Die <b>Fussleiste</b> unten sagt dasselbe wie die Ergebniskachel.</p>` },
  { id: 'k-modell', titel: '8 Wie gerechnet wird', html: `
    <p>Das Tragwerk ist ein räumliches <b>Stabwerk</b>: die vier Winkel des Jochs,
      die Bindebleche dazwischen und die Masten sind Stäbe. Die Masten sind am
      Fuss eingespannt; das Joch ist an den Masten angeschlossen.</p>
    <p>Gerechnet wird linear-elastisch: die Schnittgrössen (Normalkraft,
      Querkraft, Biegung, Torsion) folgen aus den Lasten am unverformten
      Tragwerk. Anbauteile hängen über starre Glieder an Joch oder Mast; ihre
      Lasten greifen dort an, wo sie hängen.</p>` },
  { id: 'k-einwirkungen', titel: '9 Einwirkungen', html: `
    <ul>
      <li><b>Eigengewicht</b> - Stäbe, Anbauteile und Leitungen.</li>
      <li><b>Wind</b> - auf Joch, Masten, Anbauteile und Leitungen; die Windzone
        legt den Staudruck fest. Er wirkt je Lastfall in einer Richtung: quer zum
        Gleis (von links oder rechts) oder längs (vorwärts oder rückwärts).</li>
      <li><b>Schnee</b> - auf Joch und Leitungen, wenn eingeschaltet.</li>
      <li><b>Umlenkkraft</b> - in der Kurve zieht jede Leitung seitlich am
        Tragwerk: Z · c / R (Leiterzug mal Abstand zum nächsten Masten durch
        Kurvenradius). Auf gerader Strecke ist sie null.</li>
    </ul>` },
  { id: 'k-kombinationen', titel: '10 Lastfälle und Beiwerte', html: `
    <p>Ein Lastfall (eine Kombination) überlagert die Einwirkungen mit Beiwerten:</p>
    <p class="formel">E_d = γ_G · Eigengewicht + γ_Q · leitende Einwirkung + ψ₀ · begleitende Einwirkung</p>
    <p>Vorgabe (Bahn): γ_G = 1.30, γ_Q = 1.30, ψ₀ = 0.65. «Wind quer zum Gleis, von links»
      ist also 1.30 · Eigengewicht + 1.30 · Wind + 0.65 · Schnee; «Viel Schnee,
      dazu Wind» vertauscht Wind und Schnee. Wo das Eigengewicht entlastet, steht
      es mit 1.0 in der Kombination.</p>
    <p>Die Tabelle aller Kombinationen mit ihren Beiwerten öffnet der Knopf
      «Alle Kombinationen mit Lastbeiwerten» im Schritt 3. Die Verformung
      rechnet eigene Fälle: nur Wind, mit 0.70 abgemindert (Betriebswind).</p>` },
  { id: 'k-nachweise', titel: '11 Nachweise', html: `
    <ul>
      <li><b>Joch und Masten</b> - Spannung: σ_v = √(σ² + 3τ²) ≤ f_yd, an jedem
        Stab, im ungünstigsten Lastfall.</li>
      <li><b>Fundament</b> - die Kräfte am Mastfuss mit allen Beiwerten 1.0
        (charakteristisch) gegen die zulässigen Lasten des Fundamenttyps.</li>
      <li><b>Abspannung</b> - Seil- bzw. Stützenkraft gegen die zulässige Kraft
        des Typs.</li>
      <li><b>Verformung</b> - die Seitenlage des Fahrdrahts quer zum Gleis unter
        Betriebswind (Wind × 0.70) höchstens 40 mm.</li>
    </ul>` },
  { id: 'k-grenzen', titel: '12 Grenzen dieser Fassung', html: `
    <p>Die Schulungsfassung ist eine <b>Vorabprüfung</b>, kein geprüfter
      statischer Nachweis. Das Knicken der Masten ist in der Vorgabe nicht eingeschaltet;
      Rechenmodell, Beiwerte, Lastfälle und Bauteildaten sind fest eingestellt,
      die Havarie (Leiterbruch) wird nicht gerechnet. Den
      Nachweis für ein Projekt führt eine Fachperson mit einem geprüften
      Programm.</p>` },
  // Nutzungsbedingungen (16. November, «lizenztext und verteilungstext
  // einfügen»); der volle Text steht in LIZENZ.md der Ablage.
  { id: 'k-nutzung', titel: '13 Nutzung und Weitergabe', html: NUTZUNG_HTML },
];

/*
 * Sprachen des Kurs-Handbuchs (16. November, «übersetzung ins französische
 * und italienische»): die Kapitel stehen in doku.kurs.sprachen.js mit
 * denselben Kennungen. Der Block trägt `data-kein-tr` - das Wörterbuch der
 * Oberfläche soll nicht in einen schon übersetzten Text greifen.
 */
const INHALT_WORT = { de: 'Inhalt', fr: 'Sommaire', it: 'Indice' };
const STAND_WORT = { de: 'Stand', fr: 'État', it: 'Stato' };
export function kursKapitel(sprache = 'de') {
  return sprache === 'fr' ? KURS_FR : sprache === 'it' ? KURS_IT : KURS_HANDBUCH;
}

export function kursHandbuchHtml(sprache = 'de') {
  const kap = kursKapitel(sprache);
  const toc = kap.map((s) => `<a class="hb-toc-e" data-zu="${s.id}">${s.titel}</a>`).join('');
  // Herausgeber und Rechte (17. November) unter «Nutzung und Weitergabe».
  const rumpf = kap.map((s) =>
    `<section class="hb-abschnitt" id="hb-${s.id}"><h3>${s.titel}</h3>${s.html}${
      s.id === 'k-nutzung' ? herausgeberHtml(sprache) : ''}</section>`).join('');
  return `<div class="hb" data-kein-tr lang="${sprache}">
    <nav class="hb-toc"><div class="hb-toc-t">${INHALT_WORT[sprache] ?? 'Inhalt'}</div>${toc}</nav>
    <div class="hb-text">${rumpf}</div>
  </div>`;
}
