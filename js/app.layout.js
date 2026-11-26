/**
 * app.layout.js
 * ---------------------------------------------------------------------------
 * ARBEITSFLAECHE UND WERKZEUGE: Werkzeugleisten am Modell, Lastfallwahl,
 * Legende, Schubladen und Schienen.
 *
 * Seit dem 19. September ein eigenes Modul (Durchsicht vom 18. September,
 * Punkt A1: app.js teilen). Den Arbeitsstand bekommt es als app - das
 * Kontextobjekt aus app.js. Es importiert app.js nicht zurueck.
 * ---------------------------------------------------------------------------
 */
import { alleZeigen, nurDiesesZeigen, inselMorph } from './app.kontext.js';
import { zeichnungMenueUmschalten } from './app.zeichnung.js';
import { lageVon, tragwerkeSortiert, tragwerksart, versteckt } from './core.constants.js';
import { MASS, esc, icon, iconKnopf, tokensAufElement } from './design.js';
import { morph } from './ui.bewegung.js';
import { ANSICHTEN, LASTARTEN, MODI, PLOTS, FIGUR_MODI } from './render.3d.js';
import { plotErlaubt, EINFACH } from './stufe.js';
import * as ui from './ui.js';
import { zl, zlSetzeAn, zlGroesse, zustandLegendeHtml, zustandLegendeVerdrahten } from './app.zustand.js';
import { FELDER } from './ui.schema.js';

/**
 * WERKZEUGE DER MODELLANSICHT, nach Art geordnet.
 *
 * Vorher steckten alle Schalter in einer einzigen Liste hinter einem
 * Aufklappfenster: zwei Klicks für jede Änderung, und Profile standen neben
 * Schnittkräften, als wäre das dasselbe. Es sind aber drei verschiedene Fragen:
 *
 *   MODELL     was vom Bauteil zu sehen ist
 *   LASTEN     welche Einwirkungen aufgetragen werden
 *   RESULTATE  was eingefärbt und als Schnittkraft gezeigt wird
 *
 * Jede Gruppe steht als Reihe kleiner Schalter offen da. Man sieht damit auf
 * einen Blick, was ein- und was ausgeschaltet ist, und braucht einen Klick
 * statt drei.
 */
const WZ_MODELL = (app) => [
  { key: 'profil', icon: 'profil', text: 'Gurtprofile' },
  // Stehende und liegende Bleche getrennt (17. November, «die bleche sollten
  // auch separiert werden können»).
  { key: 'blechSteh', icon: 'blechSteh', text: 'Stehende Bindebleche' },
  { key: 'blechLieg', icon: 'blechLieg', text: 'Liegende Bindebleche' },
  // Anbauteile stehen bei den Bauteilen, nicht bei den Lasten: sie SIND
  // Tragwerk - der Weg, auf dem die Last ans Joch kommt. Wer die Lasten
  // global abstellt, um das Joch zu sehen, will diesen Weg behalten. Was zur
  // Last gehoert - der Wuerfel am Angriffspunkt und die Pfeile - bleibt
  // drueben und geht mit ihr.
  { key: 'anbau', icon: 'anbau', text: 'Anbauteile: Ständer, Ausleger, Traverse' },
  // Leiter und Trasse (26. November): «wie kann man die leiter und das trasse
  // ausschalten?», dann «und als layersteuerung?». Nur das Bild.
  { key: 'leiter', icon: 'leiter', text: 'Leiter (feine Striche in Gleisrichtung)' },
  { key: 'trasse', icon: 'trasse', text: 'Trasse (Gleis zur Orientierung)' },
  // Die Schwerachsen SIND das Stabmodell: sie tragen feldweise dieselben
  // Kennwerte wie die Volumenkörper und werden ebenso eingefärbt. Wer das
  // Stabmodell allein sehen will, schaltet Gurtprofile und Bindebleche ab -
  // ein eigener Schalter dafür sagte nichts, was diese beiden nicht schon
  // sagen. Der Platz gehört jetzt der Auflagerdefinition, und die ist eine
  // eigene Frage: sie war beim Nachbau eines geprüften FEM-Modells der
  // grösste einzelne Fehler.
  { key: 'achse', icon: 'achse', text: 'Schwerachsen (Stabmodell, eingefärbt)' },
  { key: 'auflager', icon: 'auflager', text: 'Auflager: Lage, Feder, Einspannung' },
  // Der Mast ist ein BAUTEIL und kein Auflagerzeichen: er traegt Wind und
  // Anbauteile und wird ausgeleitet. In der Laengsansicht verdeckt er zudem
  // das halbe Joch - man muss ihn allein wegnehmen koennen.
  { key: 'mast', icon: 'mast', text: 'Masten' },
  { key: 'masse', icon: 'mass', text: 'Bemassung' },
  // Bodenraster ohne Knopf (18. November, «bodenrasten layerbutton entfernen»);
  // das Raster selbst bleibt im Bild.
];

/*
 * DIE EINGEFÜGTE ZEICHNUNG BEKOMMT EINE EIGENE GRUPPE (Weisung).
 *
 * Sie stand als neunter Schalter zwischen den Bauteilen - dort, wo Gurte,
 * Bleche und Auflager liegen. Sie ist aber nichts davon: sie ist eine
 * FREMDE Vorlage, die hinter dem Modell liegt, und sie kommt nicht aus der
 * Rechnung, sondern aus einem Blatt. Eine eigene Gruppe sagt das, und der
 * Hauptschalter darüber legt beides zugleich weg.
 *
 * Und die Masskette bekommt endlich ihren eigenen Schalter. Sie hing bisher
 * am Schalter der Zeichnung mit - wer das Bild wegnahm, verlor die
 * Fanglinien, obwohl die aus der Eingabe stammen und ohne Bild bestehen.
 */
const WZ_ZEICHNUNG = (app) => [
  { key: 'zeichnung', icon: 'zeichnung',
    text: 'Eingefügte Querprofil-Zeichnung (nur in der Längsansicht)',
    fehlt: () => !app.ansicht.zeichnung,
    fehltText: 'noch kein Bild eingefügt, Strg+V im Modell' },
  { key: 'masskette', icon: 'mass',
    text: 'Masskette als Fanglinien (nur in der Längsansicht)',
    fehlt: () => !(app.ansicht.masskette && app.ansicht.masskette.length),
    fehltText: 'keine Masskette eingetragen' },
];

const WZ_LASTEN = (app) => [
  { key: 'last', icon: 'lastpfeil', text: 'Lasten überhaupt zeigen', haupt: true },
  { key: 'staendig', icon: 'gewicht', text: 'Ständige Lasten' },
  { key: 'leiterzug', icon: 'leiterzug', text: 'Leiterzugkräfte (Umlenkung)' },
  { key: 'windX', icon: 'wind', text: 'Wind in x (quer zum Gleis)' },
  { key: 'windY', icon: 'wind', text: 'Wind in y (längs zum Gleis)' },
  { key: 'schnee', icon: 'schnee', text: 'Schnee und veränderlich vertikal' },
  { key: 'havarie', icon: 'riss', text: 'Havarie (Leiterriss) - erscheint, wenn ein Havariefall gewählt ist' },
];

/**
 * Die untere Leiste folgt dem Rechenverfahren: beim Ersatzbalken der Knopf
 * zum Nachweisschnitt, im Stabwerk die verformte Figur (30. September).
 */
/*
 * >>> STRICHBILD (26. November). <<< Ein Schalter unten links, gemerkt im
 * Browser (`tragjoch-strichbild`): das 3D wie die Bilder des Berichts
 * (render.3d.js, `strich`). Gilt auch für «Bild aufnehmen».
 */
const STRICH_KEY = 'tragjoch-strichbild';
export function strichAn() {
  try { return localStorage.getItem(STRICH_KEY) === '1'; } catch { return false; }
}
export function strichSetzen(app, an) {
  try { localStorage.setItem(STRICH_KEY, an ? '1' : '0'); } catch { /* ohne Speicher */ }
  if (app.ansicht) { app.ansicht.strich = an; app.ansicht.zeichne(); }
  // Lesbarkeit (26. November): auf weissem Grund das helle Design am Modellfenster.
  tokensAufElement(ui.el('viewer'), an ? 'hell' : null);
  const k = ui.el('v-strich');
  if (k) { k.classList.toggle('on', an); k.setAttribute('aria-pressed', String(an)); }
}

function untereLeiste(app) {
  // Der Knopf δ ist weg (3. Oktober): die verformte Figur erscheint mit
  // dem Plot «w» bzw. «η w».
  const s = ui.el('v-schnitt');
  if (!s) return;
  s.hidden = app.ohneBalken;
}

export function baueModellWerkzeuge(app) {
  // Ein Knopf für «alles zeigen»: die frühere Trennung in «Ansicht
  // zurücksetzen» und «Ganzes Joch» führte zweimal zum selben Bild. Der
  // Schnitt-Zoom sitzt jetzt im Auswertungsreiter «Schnitt», wo er hingehört.
  /*
   * HANDLUNG UND SCHALTER SEHEN VERSCHIEDEN AUS (Weisung).
   *
   * «Bauteil setzen» stand als eines von zwei gleich aussehenden Symbolen
   * neben dem Zoom und sah damit aus wie die Ebenenschalter drüben: etwas,
   * das man an- und ausknipst. Es ist aber eine HANDLUNG - man startet sie,
   * zielt, wählt, und sie ist vorbei.
   *
   * Beschriftet und in der Akzentfarbe, wie der AxisVM-Knopf im Banner: die
   * Anwendung hat damit zwei Formen, eine für Schalter und eine für Wege,
   * die man geht. Läuft die Handlung, steht der Knopf auf «Abbrechen» - er
   * sagt dann, was der nächste Klick tut, statt was er einmal getan hat.
   */
  // Unten links, in der Fussleiste - dort, wo auch die Stelle steht, an der
  // man gerade ist. Zuruecksetzen gehoert zum Navigieren, nicht zum Bauen.
  /*
   * NAVIGATION UNTEN LINKS (Weisung, 2. September).
   *
   * Drei Handlungen, die man beim Arbeiten am Bild immer wieder braucht -
   * und die man sonst mit Rad und Ziehen zusammensuchen muss:
   *
   *   ganz     alles zeigen, was auf dem Blatt steht. Seit mehrere
   *            Tragwerke nebeneinanderstehen ist das nicht mehr dasselbe
   *            wie «ein Joch zeigen» - deshalb heisst es jetzt anders.
   *   teil     nur das gerechnete Tragwerk. Bei einer Jochreihe steht man
   *            sonst vor drei Jochen und sucht das, dessen Zahlen rechts
   *            stehen.
   *   schnitt  auf den Nachweisschnitt. Die Stelle, an der die Auswertung
   *            gerade rechnet - der haeufigste Grund, ueberhaupt
   *            heranzufahren.
   *
   * Sie stehen UNTEN LINKS, weil dort schon der erste stand und weil oben
   * rechts die Blickrichtungen sitzen: das eine ist «wohin schaue ich», das
   * andere «worauf».
   */
  ui.el('ansicht-tools-u').innerHTML =
    iconKnopf('v-ganz', 'querprofilGanz',
              'Ganzes Querprofil — alle Tragwerke einblenden')
    + iconKnopf('v-teil', 'querprofilEines',
                'Nur das gerechnete Tragwerk — die übrigen beiseitelegen')
    + iconKnopf('v-schnitt', 'schnitt', 'Auf den Nachweisschnitt fahren')
    // Strichbild wie die Berichtsbilder (26. November, «unten links als button»).
    + iconKnopf('v-strich', 'strich', 'Strichbild wie im Bericht: weisser Grund, Körper blass, '
      + 'Schwerachsen in der Plotfarbe; mit «Linie» das graue System mit der Zustandslinie', strichAn())
    // Bild aufnehmen (26. November, «gibt es einen bild aufnehmen button für die
    // resultat bibliothek?»): neben dem Strichbild - erst einstellen, dann aufnehmen.
    + iconKnopf('v-bild', 'kamera', 'Bild des 3D aufnehmen - in die Bildsammlung und die Zwischenablage (Taste a). '
      + 'Rechtsklick: Rahmen (Bildausschnitt) festlegen')
    // Ansicht festhalten (26. November, «kamerafreez»): Blick, Ausschnitt, Ebenen, Plot.
    + iconKnopf('v-fest', 'ansicht', 'Ansichten: speichern, überschreiben, löschen (Blick, Ausschnitt, Ebenen, Plot, Darstellung). '
      + 'Rechtsklick: gespeicherte Ansicht aufrufen');
  // Oben links, auf der Hoehe des Lastfalls (Weisung): die eine Handlung,
  // die man im Modell beginnt, steht auf derselben Zeile wie die eine
  // Auswahl, die man darueber trifft.
  /*
   * NUR DAS SYMBOL (Weisung, 28. August: «die zwei Buttons Bauteile,
   * Zeichnung nur mit Symbolen»).
   *
   * Sie standen mit Beschriftung da und nahmen damit die halbe Breite des
   * Modellfensters ein - über einer eingelegten Zeichnung liegt dort das
   * Tragwerk. Was sie tun, sagt der Titel beim Überfahren und der
   * Handlungsbalken, sobald man sie drückt; die laufende Handlung sagt die
   * Akzentfarbe (`laeuft`).
   */
  // «Bauteil setzen» als Knopf entfernt (19. November, «nimm diesen button bauteil
  // setzen weg»): gesetzt wird über die Kacheln, das Kontextmenü und Taste b.
  ui.el('ansicht-tools').innerHTML = ''
    + `<button class="btn-icon v-handlung${
         app.zeichnungMenue || app.kalibrierung || app.bildSchieben || app.ausrichtung ? ' laeuft' : ''}" id="v-zeichnung"
       type="button" title="${app.ansicht.zeichnung
         ? 'Zeichnung: neu einmessen, ersetzen oder entfernen'
         : 'Querprofil-Zeichnung einlegen, auch mit Strg+V oder Hineinziehen'}"
       aria-label="Querprofil-Zeichnung"
       aria-pressed="${Boolean(app.zeichnungMenue)}">${icon('zeichnung')}</button>`;
  ui.el('v-setzen')?.addEventListener('click', () => (app.setzen ? app.setzenEnde() : app.setzenStarten()));
  ui.el('v-zeichnung').onclick = () => zeichnungMenueUmschalten(app);
  /*
   * >>> DIE BEIDEN SIND EIN PAAR: ALLES oder NUR DIESES. <<<
   *
   * Bis zum 3. September fuhren sie bloss die KAMERA - herangezoomt stand
   * der Nachbar weiter da, nur ausserhalb des Ausschnitts. Seine Jochachse
   * und die Flaechen seiner Linienlasten ragten von links ins Bild, und man
   * konnte sie nicht loswerden, weil der Knopf gar nichts ausblendete.
   *
   * Gemeldet mit Bild: «hier der screenshot mit den ueberstehenden
   * lastflaechen und schwerelinien, die nicht sauber ausgeblendet werden.»
   *
   * Die Teile SIND je Tragwerk zugeschnitten - gemessen ragt nur die halbe
   * Blech- und Mastdicke ueber die Grenze, ±0.12 m. Was fehlte, war das
   * Ausblenden selbst. `nurDiesesZeigen` gibt es seit dem Kontextmenue;
   * der Knopf ruft jetzt dieselbe Handlung und faehrt danach heran.
   */
  if (app.ansicht) app.ansicht.strich = strichAn();
  tokensAufElement(ui.el('viewer'), strichAn() ? 'hell' : null);
  ui.el('v-strich').setAttribute('aria-pressed', String(strichAn()));
  ui.el('v-strich').onclick = () => strichSetzen(app, !strichAn());
  ui.el('v-bild').onclick = () => app.bildAufnehmen?.();
  ui.el('v-bild').oncontextmenu = (e) => { e.preventDefault(); app.bildRahmen?.(); };
  // Klick: Fenster der Ansichten (26. November); Rechtsklick: direkt aufrufen.
  ui.el('v-fest').onclick = () => app.ansichtenVerwalten?.();
  ui.el('v-fest').oncontextmenu = (e) => { e.preventDefault(); app.ansichtWahl?.(e); };
  ui.el('v-ganz').onclick = () => {
    app.station = null; app.ansicht.station = null;
    // Nur wenn wirklich etwas beiseitegelegt ist - sonst schriebe jeder
    // Klick auf «ganzes Querprofil» einen Schritt in den Verlauf.
    if (tragwerkeSortiert(app.werte).some((t) => versteckt(t))) alleZeigen(app);
    /*
     * SCHWENKEN, NICHT SPRINGEN (3. Oktober: «wenn button ganzes
     * querprofil, kamera schwenken, nicht springen»). `ansichtZuruecksetzen`
     * setzte Ziel, Abstand und Blick hart; `schwenkeAufsGanze` fährt
     * Ziel, Verschiebung, Abstand und Blickwinkel gemeinsam dorthin.
     */
    app.ansicht.schwenkeAufsGanze('iso'); app.zeichneAuswertung();
  };
  /*
   * NUR DAS GERECHNETE TRAGWERK.
   *
   * Sein Bereich steht fest: von seiner Lage bis Lage plus Laenge. Ein
   * Einzelmast hat keine Laenge - dort waere der Ausschnitt null breit und
   * die Kamera fuehre ins Unendliche. Zwei Meter sind das Mindestmass; sie
   * zeigen den Masten mit etwas Luft daneben.
   */
  ui.el('v-teil').onclick = () => {
    const t = tragwerkeSortiert(app.werte).find((x) => x.aktiv)
           ?? tragwerkeSortiert(app.werte)[0];
    if (!t) return;
    // ERST beiseitelegen, DANN heranfahren: `nurDiesesZeigen` rechnet neu
    // und baut die Szene auf, der Zoom setzt nur die Kamera.
    if (tragwerkeSortiert(app.werte).some((x) => x.id !== t.id && !versteckt(x))) {
      nurDiesesZeigen(app, t.id);
    }
    const x0 = lageVon(t);
    const L = tragwerksart(t).masten >= 2 ? (Number(t.L) || 0) : 0;
    const halb = Math.max(1, L / 2);
    app.station = null; app.ansicht.station = null;
    app.ansicht.zoomAuf(x0 + L / 2, null, halb);
  };
  // Der Nachweisschnitt: die Stelle, an der die Auswertung gerade rechnet.
  ui.el('v-schnitt').onclick = () => app.ansicht.zeigeSchnitt(2.5);
  zeichneModellWerkzeuge(app);
  zeichneLegende(app);
}

/**
 * Welche Lastarten im gewählten Lastfall überhaupt vorkommen.
 *
 * Ein Beiwert 0 heisst: diese Einwirkung wirkt in diesem Lastfall nicht mit.
 * Sie im Modell einschalten zu können, ohne dass etwas erscheint, ist eine
 * Falle - der Schalter wird deshalb ausgegraut und unklickbar.
 *
 * Bei der Umhüllenden ist alles möglich, denn dort laufen alle Lastfälle mit.
 */
function lastartenVorhanden(app) {
  const alle = Object.fromEntries(LASTARTEN.map((l) => [l.key, true]));
  if (!app.letzte || app.anzeigeKombi === 'umhuellend') return alle;
  const lf = app.letzte.kombi.lastfaelle.find((k) => k.key === app.anzeigeKombi);
  if (!lf) return alle;
  const b = lf.beiwerte ?? {};
  return {
    staendig: Boolean(b.G),
    leiterzug: Boolean(b.G),
    windX: Boolean(b.WindX),
    windY: Boolean(b.WindY),
    schnee: Boolean(b.Schnee),
  };
}

/**
 * Die Werkzeuggruppen zeichnen und verdrahten: Blick, Modell, Zeichnung,
 * Lasten, Resultate.
 *
 * Bild und Masskette fragen einzeln nach, ob es sie gibt - die Kette steht in
 * der Eingabe, das Bild kommt von aussen, und das eine kann ohne das andere
 * da sein. Vorher lief beides über eine gemeinsame Abfrage, und der Schalter
 * war schon offen, wenn nur eines von beiden vorlag.
 */
/* ===========================================================================
 * >>> DIE PLOTLISTE FOLGT DER GEWAEHLTEN NACHWEISART (24. September). <<<
 * =========================================================================
 *
 * Weisung: «setze noch ein resultat plott gebrauchstauglichkeit das müsste
 * man dann auch irgendwie in den ergebnissen auswählbar machen,
 * Tragsicherheit Gebrauchstagulichkeit oder beide.» Auf Rückfrage: die Wahl
 * wirkt auf die Ergebnisleiste UND auf die Plotliste.
 *
 * Ein Plot OHNE Angabe gehört der Tragsicherheit - η, σ, M, V, N, T stehen
 * alle auf Bemessungswerten. Ausgezeichnet werden muss deshalb nur, was
 * NICHT dorthin gehört (`nachweisart: 'gzg'` in render.3d.js); eine
 * Angabe, die man vergessen kann, führt so zur harmloseren Zuordnung.
 *
 * Die Bauteilmodi (Positionen, Bauteile) tragen keine Grösse und bleiben
 * immer da - sie zeigen das Modell, nicht ein Ergebnis.
 * ========================================================================= */
/*
 * Nicht mehr in der Leiste (19. November, Weisung «den layerbutton Teil /
 * ausnutzung gebrauchstauglichkeit wegnehmen»): «Teil» (Bauteile neutral)
 * und «η w». Die Gebrauchstauglichkeit zeigt weiter «w» mit der verformten
 * Figur; ihre Ausnutzung steht in den Kacheln.
 */
export const OHNE_KNOPF = new Set(['neutral', 'etaGzg']);

/*
 * Anschrift des Schiebers «Grenze» (19. November, «dies als Grenze anschreiben
 * und für alle möglichen resultatplots ermöglichen»): aus, «η ≥ 0.60» oder
 * der Wert in der Einheit der Plotgrösse mit dem Anteil am grössten Wert.
 */
function auffText(app) {
  const a = app.ansicht.auffaellig ?? 0;
  if (!(a > 0)) return 'aus';
  const p = PLOTS.find((x) => x.key === app.ansicht.modus);
  if (!p) return `${Math.round(a * 100)} %`;
  if (p.fest) return `η ≥ ${a.toFixed(2)}`;
  const max = app.ansicht.zustand?.vmax || app.ansicht._bereichSichtbar?.(p.feld) || 0;
  const e = p.einheit && p.einheit !== '–' ? ` ${p.einheit}` : '';
  return max > 0 ? `≥ ${(a * max).toFixed(p.nk ?? 1)}${e} (${Math.round(a * 100)} %)` : `≥ ${Math.round(a * 100)} %`;
}

export function modiFuer(art = 'beide') {
  // Viewer (15. November): Ausnutzung und Verformung, Fokus aufs Abbilden.
  const alle = MODI.filter((m) => plotErlaubt(m.key) && !OHNE_KNOPF.has(m.key));
  if (art !== 'trag' && art !== 'gzg') return alle;
  return alle.filter((m) => m.art !== 'plot' || (m.nachweisart ?? 'trag') === art);
}

/**
 * Der aufgetragene Plot muss in der Liste stehen, die man sieht.
 *
 * Ohne das blättert die Wahl «nur Gebrauchstauglichkeit» einen Knopf weg,
 * während das Modell weiter σ_v zeigt - mit einer Legende dazu und ohne
 * eine Möglichkeit, es zurückzustellen.
 */
export function modusKorrigieren(app) {
  const da = modiFuer(app.nachweisart);
  if (da.some((m) => m.key === app.ansicht.modus)) return false;
  app.ansicht.modus = (da.find((m) => m.art === 'plot') ?? da[0])?.key ?? 'neutral';
  return true;
}

/*
 * >>> DIE RECHTE WERKZEUGLEISTE LAESST SICH EINKLAPPEN (14. November). <<<
 * Durchsicht der Bedienung, Punkt 5: die Leiste deckte 17 % des Modells
 * (1440 px) und lag unter rund 1000 px Fensterbreite ueber Masttitel und
 * Legende. Eingeklappt steht nur ein Knopf da. Ohne eigene Wahl klappt sie
 * von selbst ein, wenn das Modellfenster schmaler als 560 px ist; die Wahl
 * des Benutzers ('1' zu, '0' offen) bleibt im Browser gemerkt.
 */
const WZ_MERKER = 'tragjoch-wz-zu';
const WZ_SCHMAL = 560;
// Audit 21. November, Block 3: die Leiste ist offen gut 700 px hoch. In einem
// niedrigen Modellfenster klappt sie deshalb auch nach der HÖHE von selbst
// ein; darüber bekommt sie einen Bildlauf statt in die Fussleiste zu laufen.
const WZ_NIEDRIG = 520;
function wzZu() {
  // Schulung (15. November, «das einklappen button entfernen»): die Leiste
  // ist kurz und steht immer offen.
  if (EINFACH) return false;
  let wahl = null;
  try { wahl = localStorage.getItem(WZ_MERKER); } catch { /* kein Speicher */ }
  if (wahl === '1') return true;
  if (wahl === '0') return false;
  const b = ui.el('viewer')?.clientWidth ?? 0;
  const h = ui.el('viewer')?.clientHeight ?? 0;
  return (b > 0 && b < WZ_SCHMAL) || (h > 0 && h < WZ_NIEDRIG);
}

/*
 * >>> DIE LEISTE MELDET IHRE BREITE (Audit 21. November, Block 3). <<<
 * Weisung «Ja, Block 3». Gemessen lag die Legende in JEDER Plotgrösse auf der
 * Werkzeugleiste (1400 px² bei η, 12 000 px² mit «Linie» - genau über den
 * Knöpfen der Resultate), Meldungen oben lagen über der Gruppe «Blick», und
 * das Modell rückte nach dem Setzen hinter die Leiste. Die offene Leiste
 * setzt deshalb `--wz-breite` am Modellfenster (Legende und Kopfzeile halten
 * diesen Abstand) und `randRechts` am Renderer (die Bildmitte liegt links von
 * ihr). Eingeklappt ist sie ein kleiner Knopf oben: dann 0.
 */
let breiteOffen = null;
/*
 * >>> DIE LEGENDE WEICHT NUR AUS, WENN ES IN DER HÖHE NICHT REICHT
 * (26. November). <<< Weisung: «die box unten rechts nicht immer automatisch
 * in die mitte schieben wenn sich die layersteuerung öffnet sondern erst dann
 * wenn es keinen platz in der höhe hat (je nach der fensterhöhe /
 * auflösung).» Ändert den 21. November («in die mitte ziehen»): die Legende
 * bleibt unten rechts, solange die offene Leiste über ihr endet; erst wenn
 * sich beide in der Höhe überdecken, rückt sie in die Mitte der freien
 * Fläche (Klasse `wz-eng`). Neu bewertet bei jedem Melden der Leiste und bei
 * jeder Grösse des Fensters oder der Legende.
 */
let legendeBeobachter = null;
function legendeAusweichen(v, n, offen) {
  const lg = v.querySelector('.legende');
  let eng = false;
  if (offen && lg && !lg.classList.contains('gezogen')) {
    const unten = n.getBoundingClientRect().bottom;
    const r = lg.getBoundingClientRect();
    // Seit dem 26. November hat die Legende in beiden Lagen dieselbe Breite
    // und damit dieselbe Höhe (style.css) - sonst kippte sie hin und her.
    const oben = r.top;
    eng = r.top > 0 && unten + 6 > oben;
  }
  v.classList.toggle('wz-eng', eng);
  if (!legendeBeobachter && typeof ResizeObserver !== 'undefined') {
    legendeBeobachter = new ResizeObserver(() => {
      const nn = document.getElementById('ebenen-tools');
      const lg2 = v.querySelector('.legende');
      if (nn) legendeAusweichen(v, nn, !!nn.querySelector('.wz-gruppe'));
      if (lg2 && !legendeBeobachter._lg) { legendeBeobachter.observe(lg2); legendeBeobachter._lg = lg2; }
    });
    legendeBeobachter.observe(v);
    if (lg) { legendeBeobachter.observe(lg); legendeBeobachter._lg = lg; }
  } else if (legendeBeobachter && lg && legendeBeobachter._lg !== lg) {
    legendeBeobachter.observe(lg); legendeBeobachter._lg = lg;
  }
}
export function leisteMelden(app) {
  const v = ui.el('viewer'), n = ui.el('ebenen-tools');
  if (!v || !n) return;
  const offen = !!n.querySelector('.wz-gruppe');
  // Eingeklappt ist sie ein Knopf oben rechts: die Kopfzeile weicht ihm aus,
  // die Bildmitte nicht (er steht über dem Himmel, nicht über dem Modell).
  const kn = Math.ceil(n.getBoundingClientRect().width) + 8;
  /*
   * DAS MODELL SPRINGT NICHT (21. November, «das modell so bleiben wo es ist
   * und nicht springen»): die Bildmitte rechnet immer mit der Breite der
   * OFFENEN Leiste - auch eingeklappt -, so bleibt das Modell beim Auf- und
   * Zuklappen stehen. Die Breite der offenen Leiste wird gemerkt.
   */
  if (offen) breiteOffen = kn;
  // Noch nie offen: die gemessene Breite der offenen Leiste (99 px + 8).
  const b = offen ? kn : (breiteOffen ?? 107);
  v.style.setProperty('--wz-breite', `${kn}px`);
  // Die Insel oben bleibt stehen (22. November, «die obere mittlere box
  // sollte sich dann nicht bewegen»): die Kopfzeile rechnet wie die
  // Bildmitte immer mit der Breite der OFFENEN Leiste.
  v.style.setProperty('--wz-kopf', `${b}px`);
  v.style.setProperty('--wz-legende', `${offen ? kn : 0}px`);   // die Legende unten nur bei offener Leiste
  v.classList.toggle('wz-offen', offen);
  legendeAusweichen(v, n, offen);
  const a = app.ansicht;
  if (a && a.randRechts !== b) {
    a.randRechts = b;
    // Der Abstand hängt an der freien Breite: ohne eigenen Ausschnitt neu
    // einpassen, sonst lag M2 nach dem Start hinter der Leiste.
    try { if (!a.passeEinWennAbgeschnitten?.()) a.zeichne(); } catch { /* noch keine Szene */ }
  }
}
function wzSetzen(zu) {
  try { localStorage.setItem(WZ_MERKER, zu ? '1' : '0'); } catch { /* kein Speicher */ }
}

export function zeichneModellWerkzeuge(app) {
  untereLeiste(app);
  const n = ui.el('ebenen-tools');
  if (!n) return;
  if (wzZu()) {
    const mo = modiFuer(app.nachweisart).find((m) => m.key === app.ansicht.modus);
    n.innerHTML = `<button class="wz-s wz-txt wz-klapp" id="wz-auf" type="button"
      title="Werkzeugleiste einblenden: Blick, Modell, Zeichnung, Lasten, Resultate"
      aria-expanded="false">Ebenen${mo ? ` · ${esc(mo.kurz ?? mo.label.slice(0, 3))}` : ''} ‹</button>`;
    // Auf- und Zuklappen wie die Insel: die Box wächst weich (21. November,
    // «diese animation der island anpassen und eine box bilden mit allen»).
    ui.el('wz-auf').onclick = () => inselMorph(n, () => { wzSetzen(false); zeichneModellWerkzeuge(app); });
    leisteMelden(app);
    return;
  }
  const da = lastartenVorhanden(app);
  const schalter = (id, sym, titel, an, aus = false) =>
    `<button class="wz-s${an ? ' on' : ''}${aus ? ' aus' : ''}" id="${id}"
       type="button" title="${esc(titel)}" aria-pressed="${an}"
       ${aus ? 'disabled' : ''}>${icon(sym, 14)}</button>`;
  const text = (id, beschriftung, titel, an, aus = false) =>
    `<button class="wz-s wz-txt${an ? ' on' : ''}${aus ? ' aus' : ''}" id="${id}"
       type="button" title="${esc(titel)}" aria-pressed="${an}"
       ${aus ? 'disabled' : ''}>${esc(beschriftung)}</button>`;
  // Jede Gruppe hat einen HAUPTSCHALTER in der Kopfzeile. Ausgeschaltet
  // verschwindet die ganze Gruppe aus dem Bild und ihre Einzelschalter werden
  // ausgegraut - so sieht man, dass sie noch da sind, aber gerade nicht gelten.
  const gruppe = (id, titel, an, inhalt, zusatz = '') =>
    `<div class="wz-gruppe${an ? '' : ' aus'}">
       <button class="wz-t wz-haupt${an ? ' on' : ''}" id="wz-g-${id}" type="button"
         title="Gruppe ${esc(titel)} ${an ? 'ausschalten' : 'einschalten'}${esc(zusatz)}"
         aria-pressed="${an}">${esc(titel)}</button>
       <div class="wz-knoepfe">${inhalt}</div></div>`;

  // Was das Bild nicht enthaelt, wird nicht angeboten (Einzelmast: keine
  // Gurte, keine Bleche, kein Joch-Auflager).
  const vorhanden = app.ansicht.szene ? app.ansicht.ebenenVorhanden() : null;
  const gM = app.ansicht.gruppen.modell, gL = app.ansicht.gruppen.lasten,
        gR = app.ansicht.gruppen.resultate, gZ = app.ansicht.gruppen.zeichnung;
  const ohneBalken = app.ohneBalken;

  n.innerHTML =
    `<button class="wz-s wz-txt wz-klapp" id="wz-zu" type="button"
       title="Werkzeugleiste einklappen - das Modell bekommt den Platz"
       aria-expanded="true">einklappen ›</button>` +
    `<div class="wz-gruppe"><div class="wz-t">Blick</div><div class="wz-knoepfe">${
      ANSICHTEN.map((a) => text(`wz-blick-${a.key}`, a.label.slice(0, 3), a.label,
                                a.key === app.ansicht.ansichtKey)).join('')
    }</div></div>` +
    gruppe('modell', 'Modell', gM, WZ_MODELL(app).map((s) => {
      const leer = vorhanden && !vorhanden.has(s.key);
      return schalter(`wz-m-${s.key}`, s.icon,
                      leer ? `${s.text} – in diesem Tragwerk nicht vorhanden` : s.text,
                      app.ansicht.ebenen[s.key], !gM || leer);
    }).join('')
      // Explosionsdarstellung (17. November): Teile auseinanderziehen.
      // Knopf «auf / zu» weg (20. November, «diesen auf button entfernen, wenn
      // man auf den slider mit rechtsklick drückt dann die funtion ausführen»).
      + `<label class="wz-explo" title="Explosionsdarstellung: Gurte, Bleche, Masten und Anbauteile auseinanderziehen (nur das Bild). Rechtsklick auf den Schieber: weich auf- bzw. zufahren. Doppelklick: zurück.">
           <span>Explosion</span><input type="range" id="wz-explosion" min="0" max="100" step="5"
             value="${Math.round((app.ansicht.explosion ?? 0) * 100)}"
             aria-label="Explosionsdarstellung"></label>`) +
    gruppe('zeichnung', 'Zeichnung', gZ, WZ_ZEICHNUNG(app).map((s) => {
      const weg = s.fehlt();
      return schalter(`wz-z-${s.key}`, s.icon,
                      weg ? `${s.text} — ${s.fehltText}` : s.text,
                      app.ansicht.ebenen[s.key], !gZ || weg);
    }).join('')) +
    gruppe('lasten', 'Lasten', gL, WZ_LASTEN(app).map((s) => {
      const fehlt = !s.haupt && !da[s.key];
      return schalter(`wz-l-${s.key}`, s.icon,
        fehlt ? `${s.text} – im gewählten Lastfall nicht vorhanden`
          : `${s.text}${s.haupt ? '' : ' · Rechtsklick: nur diese Last'}`,
        s.haupt ? app.ansicht.ebenen.last : app.ansicht.lastarten[s.key], !gL || fehlt);
    }).join('')) +
    gruppe('resultate', 'Resultate', gR,
      // Zustandslinie statt Farbe (14. November) - für η, σ_v, M, V, N, T.
      // Abgesetzt zuoberst über die ganze Breite («die funktion linien
      // separat aufführen, damit sichtbarer da wichtig»).
      text('wz-r-linie', 'Linie', 'Zustandslinie statt Farbe (η, σ_v, M, V, N, T) - wie in den '
           + 'Statikprogrammen; Ebene, Reaktionen und Teile in der Legende', zl.an, !gR)
        .replace('class="wz-s wz-txt', 'class="wz-s wz-txt wz-linie') +
      // Schnittkräfte am Nachweisschnitt und Schnittebene gehören dem
      // Ersatzbalken; im Stabwerk gibt es keinen Nachweisschnitt (Weisung
      // 30. September, «die zwei braucht es nicht wenn stabwerk aktiv»).
      (ohneBalken ? '' :
        schalter('wz-r-kraefte', 'schnitt', 'Schnittkräfte am Nachweisschnitt',
                 app.ansicht.ebenen.kraefte, !gR) +
        schalter('wz-r-schnitt', 'wuerfel', 'Schnittebene', app.ansicht.ebenen.schnitt, !gR)) +
      schalter('wz-r-werte', 'info', 'Werte im Modell anschreiben',
               app.ansicht.werteAnschreiben, !gR) +
      /*
       * >>> DIE FIGUR SCHWINGT IM KNOPF w (21. November). <<< Weisung: «Die
       * animation der verformung soll als kleines play symbol im w button
       * erscheinen und wenn man den button nochmals drückt dann startet die
       * animation, so muss nicht ein zusätzlicher button eingeblendet
       * werden.» Der Knopf «Figur ▶» ist weg.
       */
      // Das Abspielen steht nur in der Insel (21. November: «die
      // playfunktion hier unten weglassen»).
      // Positionen zuletzt (22. November, «unter den resultat layern die
      // position als letzte nehmen»), nach K und der Überhöhung.
      modiFuer(app.nachweisart).filter((mo) => mo.key !== 'positionen').map((mo) =>
        text(`wz-p-${mo.key}`, mo.kurz ?? mo.label.slice(0, 3), mo.label, mo.key === app.ansicht.modus, !gR)).join('') +
      /*
       * >>> KNICKFIGUR IN DER LEISTE (21. November). <<< «was noch umständlich
       * ist, das die knickform separat ein und ausgeschaltet werden muss über
       * die sidebar. diese sollte wenn möglich auch in die layersteuerung
       * implementiert werden.» Ein Knopf: aus → Knickfigur (rechnet α_cr,
       * wenn er zum Stand fehlt) → schwingt → aus.
       */
      knickKnopf(app, gR, text)
      /*
       * >>> ÜBERHÖHUNG IN DREI STUFEN (22. November). <<< «einen button
       * anfügen für den grad der überhöhung, die jetzige ist die stufe 1 und
       * noch diese jeweils um 30% erhöehn für die nächsten zwei.» Ein Klick
       * schaltet 1 → 2 → 3 → 1. Nachtrag: «hier mit 50% jeweils überhöhen
       * anstatt den 30% und auch für die liniendiagramme soll es gültigkeit
       * haben» - × 1.00 / 1.50 / 2.25, Figur, Knickfigur und Zustandslinie.
       */
      + text('wz-r-ueber', `Ü${(app.ueberStufe ?? 0) + 1}`,
        `Überhöhung von Figur und Liniendiagramm: Stufe ${(app.ueberStufe ?? 0) + 1} von 3 (× ${(1.5 ** (app.ueberStufe ?? 0)).toFixed(2)}) - Klick: nächste Stufe`,
        (app.ueberStufe ?? 0) > 0, !gR)
      + modiFuer(app.nachweisart).filter((mo) => mo.key === 'positionen').map((mo) =>
        text(`wz-p-${mo.key}`, mo.kurz ?? mo.label.slice(0, 3), mo.label, mo.key === app.ansicht.modus, !gR)).join('')
      /*
       * >>> NUR AUFFÄLLIGE TEILE (19. November). <<< Weisung: «Nur
       * auffällige Teile schieber für die darstellung im modell bei den
       * resultatenplott. der rest wird stark transparent zurückgenommen.»
       * Bei η die Schwelle in η (0 … 1.00), bei σ_v, σ, M, V, N, T, w in
       * Prozent des grössten Werts im Bild. Nur das Bild, nicht gespeichert.
       */
      /*
       * >>> SCHIEBER «GRENZE» WEG (26. November). <<< Weisung: «diesen slider
       * braucht es nicht, die eingabe kann man viel präziser über die
       * legendenbox vornehmen» (Skala von / bis). Die Schwelle im Renderer
       * (`auffaellig`) bleibt 0; Code und Prüfung des Renderers bleiben.
       */
      + '',
      /*
       * WER EINEN KNOPF VERMISST, SOLL ERFAHREN WARUM. Die Wahl steht in
       * der Ergebnisleiste, nicht hier - ohne diesen Satz sieht die
       * gekürzte Liste wie ein Fehler aus.
       */
      app.nachweisart === 'trag'
        ? ' — nur Tragsicherheit (Wahl in der Ergebnisleiste)'
        : (app.nachweisart === 'gzg'
          ? ' — nur Gebrauchstauglichkeit (Wahl in der Ergebnisleiste)' : ''));

  /*
   * DIE LEGENDE GEHOERT ZUM BILD (Weisung, 1. September).
   *
   * Wer den Masten ausblendet, aendert die Skala: seine Momente sind um
   * Groessenordnungen groesser als die der Bindebleche, und ohne ihn wird
   * aus 69 kNm eine Spanne bis 1.1. Die Koerper folgten dem schon
   * (_bereichSichtbar), die Legende nicht - sie wurde beim Umschalten einer
   * Ebene gar nicht neu gezeichnet und behauptete weiter den alten Endwert.
   */
  const nach = () => {
    // Mit der Linie folgen ihre Teile den Ebenen (19. November).
    if (zl.an) app.zustandNeu(); else app.ansicht.zeichne();
    zeichneLegende(app); zeichneModellWerkzeuge(app);
  };
  ui.el('wz-zu').onclick = () => inselMorph(ui.el('ebenen-tools'), () => { wzSetzen(true); zeichneModellWerkzeuge(app); });
  ['modell', 'zeichnung', 'lasten', 'resultate'].forEach((g) => {
    ui.el(`wz-g-${g}`).onclick = () => {
      app.ansicht.gruppen[g] = !app.ansicht.gruppen[g]; nach();
    };
  });
  ANSICHTEN.forEach((a) => {
    ui.el(`wz-blick-${a.key}`).onclick = () => {
      app.ansicht.blickrichtung(a.key); zeichneModellWerkzeuge(app);
    };
  });
  WZ_MODELL(app).forEach((s) => {
    ui.el(`wz-m-${s.key}`).onclick = () => {
      app.ansicht.ebenen[s.key] = !app.ansicht.ebenen[s.key]; nach();
    };
    /*
     * >>> RECHTSKLICK: NUR DIESE EBENE (17. November). <<< Mit Bild der
     * Gruppe Modell: «hier auch mit rechtsklick einzelauswahl ermöglichen und
     * wenn man wieder mit rechtsklick macht dann alle ein» - wie bei den
     * Lasten. Gezählt werden nur Ebenen, die es in diesem Tragwerk gibt.
     */
    ui.el(`wz-m-${s.key}`).oncontextmenu = (e) => {
      e.preventDefault();
      const da = app.ansicht.szene ? app.ansicht.ebenenVorhanden() : null;
      const keys = WZ_MODELL(app).map((x) => x.key).filter((k) => !da || da.has(k));
      const allein = keys.every((k) => Boolean(app.ansicht.ebenen[k]) === (k === s.key));
      keys.forEach((k) => { app.ansicht.ebenen[k] = allein ? true : k === s.key; });
      app.ansicht.gruppen.modell = true;
      nach();
    };
  });
  const au = ui.el('wz-auffaellig');
  if (au) {
    const setze = (v) => {
      app.ansicht.auffaellig = v;
      const w = ui.el('wz-auff-wert'); if (w) w.textContent = auffText(app);
      app.ansicht.zeichne();
    };
    au.oninput = () => setze(Number(au.value) / 100);
    au.ondblclick = () => { au.value = 0; setze(0); };
  }
  const ef = ui.el('wz-explosion');
  if (ef) {
    // Rechtsklick fährt die Explosion weich auf bzw. zu (20. November).
    ef.oncontextmenu = (e) => {
      e.preventDefault(); e.stopPropagation();
      const ziel = (app.ansicht.explosion ?? 0) > 0.5 ? 0 : 1;
      app.ansicht.explosionFahren(ziel, 650, (v) => { ef.value = Math.round(v * 100); });
    };
  }
  const ue = ui.el('wz-r-ueber');
  if (ue) ue.onclick = () => { app.ueberStufe = ((app.ueberStufe ?? 0) + 1) % 3; if (zl.an) app.zustandNeu(true); app.figurNeu?.(); zeichneModellWerkzeuge(app); };
  const kn = ui.el('wz-r-knick');
  if (kn) {
    kn.onclick = () => {
      const k = app.knickInfo?.();
      /*
       * Knickfigur und Verformung schliessen sich aus (21. November: «wenn
       * man es auswählt soll nicht gleichzeitig w ausgewählt bleiben»): mit
       * der Knickfigur wechselt ein Plot w / η w auf η.
       */
      const wegVonW = () => {
        if (FIGUR_MODI.includes(app.ansicht.modus)) { app.ansicht.modus = 'eta'; zeichneLegende(app); }
      };
      if (!k?.gilt) {
        kn.textContent = '…';
        setTimeout(() => { app.knickRechnen(); wegVonW(); zeichneModellWerkzeuge(app); }, 30);
        return;
      }
      // Ein / aus; geschwungen wird über die Insel.
      if (k.zeigen) app.ansicht.schwingen(false); else wegVonW();
      app.knickFigurSchalten();
      zeichneModellWerkzeuge(app);
    };
  }
  const ex = ui.el('wz-explosion');
  if (ex) {
    ex.oninput = () => { app.ansicht.explosion = Number(ex.value) / 100; app.ansicht.zeichne(); };
    // Doppelklick setzt zurück.
    ex.ondblclick = () => { ex.value = 0; app.ansicht.explosion = 0; app.ansicht.zeichne(); };
  }
  WZ_ZEICHNUNG(app).forEach((s) => {
    ui.el(`wz-z-${s.key}`).onclick = () => {
      app.ansicht.ebenen[s.key] = !app.ansicht.ebenen[s.key]; nach();
    };
  });
  WZ_LASTEN(app).forEach((s) => {
    ui.el(`wz-l-${s.key}`).onclick = () => {
      if (s.haupt) app.ansicht.ebenen.last = !app.ansicht.ebenen.last;
      else app.ansicht.lastarten[s.key] = !app.ansicht.lastarten[s.key];
      nach();
    };
    /*
     * >>> RECHTSKLICK: NUR DIESE LAST (15. November). <<< Weisung, mit Bild
     * der Gruppe Lasten: «hier mit rechtsklick die last separieren (alle
     * anderen ausblenden)». Steht sie schon allein, holt ein zweiter
     * Rechtsklick alle zurück.
     */
    if (!s.haupt) {
      ui.el(`wz-l-${s.key}`).oncontextmenu = (e) => {
        e.preventDefault();
        const arten = WZ_LASTEN(app).filter((x) => !x.haupt).map((x) => x.key);
        const allein = arten.every((k) => Boolean(app.ansicht.lastarten[k]) === (k === s.key));
        arten.forEach((k) => { app.ansicht.lastarten[k] = allein ? true : k === s.key; });
        app.ansicht.ebenen.last = true;
        nach();
      };
    }
  });
  if (!ohneBalken) {
    ui.el('wz-r-kraefte').onclick = () => {
      app.ansicht.ebenen.kraefte = !app.ansicht.ebenen.kraefte; nach();
    };
    ui.el('wz-r-schnitt').onclick = () => {
      app.ansicht.ebenen.schnitt = !app.ansicht.ebenen.schnitt; nach();
    };
  }
  ui.el('wz-r-werte').onclick = () => {
    app.ansicht.werteAnschreiben = !app.ansicht.werteAnschreiben; nach();
  };
  ui.el('wz-r-linie').onclick = () => {
    zlSetzeAn(!zl.an);
    app.zustandNeu(true); zeichneModellWerkzeuge(app);
  };
  modiFuer(app.nachweisart).forEach((mo) => {
    ui.el(`wz-p-${mo.key}`).onclick = () => {
      if (app.ansicht.figurSchwingt && !app.knickInfo?.().zeigen) app.ansicht.schwingen(false);
      // w / η w nimmt die Knickfigur weg (sie schliessen sich aus).
      if (FIGUR_MODI.includes(mo.key) && app.knickInfo?.().zeigen) { app.ansicht.schwingen(false); app.knickFigurSchalten(); }
      app.ansicht.modus = mo.key;
      // Mit eingeschalteter Linie gehört zur neuen Grösse eine neue Linie.
      if (zl.an) app.zustandNeu(true);
      app.ansicht.zeichne(); zeichneLegende(app); zeichneModellWerkzeuge(app);
    };
  });
  leisteMelden(app);
  // Die Insel oben zeigt Play / Stopp der Figur - sie folgt der Leiste.
  app.inselSteuerung?.();
}

/** Der Knopf der Knickfigur - nur am Tragjoch mit gültigem Stabwerk. */
function knickKnopf(app, gR, text) {
  const k = app.knickInfo?.();
  if (!k?.stabwerk || tragwerksart(app.werte).key !== 'joch') return '';
  const an = k.zeigen && k.gilt;
  // Kurz wie die übrigen Plotknöpfe (21. November: «hier mit K knicken anschreiben»).
  const lab = 'K';
  const tit = !k.gilt ? 'Knickfigur: α_cr rechnen (rund 2-5 s) und die erste Eigenform zeigen'
    : !an ? `Knickfigur zeigen · α_cr = ${k.gilt.alpha.toFixed(2)}` : 'Knickfigur ausblenden';
  return text('wz-r-knick', lab, tit, an, !gR).replace('class="wz-s wz-txt', 'class="wz-s wz-txt wz-knick');
}

/**
 * Auswahl der dargestellten Einwirkung, oben mittig im Modellfenster.
 * Voreingestellt ist die Umhüllende: je Station der ungünstigste Wert über
 * alle Kombinationen. Einzeln gewählt zeigt das Modell genau eine Kombination.
 */
export function zeichneEinwirkungswahl(app) {
  /*
   * >>> DAS AUSWAHLFELD IM 3D IST WEG (18. November). <<< Weisung: «man kann
   * das auswahlfeld weglassen im 3d modell, da dieses schon in der sidebar
   * übersichtlicher aufgeführt ist. anstelle dieses felds die globalen
   * eingaben ek radius etc. schieben». Der Lastfall wird in der Lastfallliste
   * der Seitenleiste gewählt; oben stehen die Grundwerte (#pos-ek). Der Code
   * darunter bleibt für einen späteren Weg zurück, er läuft nicht.
   */
  if (app) return;
  const n = ui.el('einwirkung-wahl');
  if (!n || !app.letzte) return;
  /*
   * >>> NACH ART GEGLIEDERT (Durchsicht vom 18. September, Punkt U6). <<<
   *
   * Zwanzig Faelle standen in einer Reihe; die Frage «welcher ist ein
   * Nachweis?» musste man aus dem Namen lesen. Jetzt in Gruppen: was
   * nachgewiesen wird, was nur eine Einwirkung zeigt, was die Verformung
   * betrifft. Die Nummern LF1 … bleiben - sie stehen so im Bericht und in
   * der Ausleitung.
   */
  /*
   * >>> WORAUF JEDE GRUPPE STEHT (29. September). <<<
   *
   * Auf Rückfrage «Die Gruppennamen wie vorgeschlagen»: hier stand zweimal
   * «— kein Nachweis». Beides war überholt - auf den charakteristischen
   * Fällen stehen Anker, Fundament und die Aufhängung des Tragauslegers
   * (gegen zulässige Kräfte), auf dem Betriebswind die Verformung.
   */
  const GRUPPE = [
    ['tragsicherheit', 'Tragsicherheit'],
    ['aussergewoehnlich', 'Aussergewöhnlich (Havarie)'],
    ['charakteristisch', 'Charakteristisch — Anker, Fundament, Aufhängung'],
    ['gebrauchstauglichkeit', 'Gebrauchstauglichkeit — Verformung (Betriebswind)'],
  ];
  const lf = [{ wert: 'umhuellend', text: 'umhüllend', gruppe: '' },
              ...app.letzte.kombi.lastfaelle.map((k, i) => ({
                wert: k.key,
                text: `LF${i + 1} · ${k.bez.replace(/^Gebrauchstauglichkeit /, '')}`,
                gruppe: k.eigen ? 'Eigene Lastfälle'
                  : (GRUPPE.find(([a]) => a === k.art)?.[1] ?? 'Weitere') }))];
  const wahl = (id, beschriftung, punkte, jetzt) => {
    const opt = (o) => `<option value="${esc(o.wert)}"${o.wert === jetzt ? ' selected' : ''}
         >${esc(o.text)}</option>`;
    const namen = [...GRUPPE.map(([, n]) => n), 'Eigene Lastfälle', 'Weitere'];
    return `<label for="${id}">${esc(beschriftung)}</label>
     <select id="${id}">${punkte.filter((o) => !o.gruppe).map(opt).join('')}${
       namen.map((g) => {
         const drin = punkte.filter((o) => o.gruppe === g);
         return drin.length ? `<optgroup label="${esc(g)}">${drin.map(opt).join('')}</optgroup>` : '';
       }).join('')}</select>`;
  };

  // NICHT NEU BAUEN, WENN DIESELBE LISTE DASTEHT.
  //
  // Der Weg war ein Kreis: die Auswahl löst onchange aus, onchange rechnet,
  // und das Rechnen ruft hierher zurück - mitten in die eben erst
  // geschlossene Liste hinein. Der <select>-Knoten verschwand und ein neuer
  // erschien; im Edge sieht man das als AUFBLINKEN, weil dessen Liste beim
  // Schliessen noch nachblendet.
  //
  // Dieselbe Regel gilt schon für die Eingabemaske (siehe maskenSignatur):
  // solange sich die Struktur nicht ändert, bleiben die Felder stehen. Hier
  // ist die Struktur die Liste der Lastfälle - ändert sie sich nicht, wird
  // nur der gewählte Punkt nachgezogen.
  const sig = JSON.stringify(lf);
  const steht = ui.el('wahl-einwirkung');
  if (steht && steht.dataset.sig === sig) {
    if (steht.value !== app.anzeigeKombi) steht.value = app.anzeigeKombi;
    return;
  }

  // Nur noch der Lastfall: die aufgetragene Grösse steht jetzt bei den
  // Werkzeugen unter «Resultate», wo sie neben den übrigen Darstellungsfragen
  // hingehört.
  n.innerHTML = wahl('wahl-einwirkung', 'Lastfall', lf, app.anzeigeKombi);
  ui.el('wahl-einwirkung').dataset.sig = sig;

  ui.el('wahl-einwirkung').onchange = (e) => {
    app.anzeigeKombi = e.target.value;
    // Der Lastfall entscheidet, welche Lastarten überhaupt vorkommen - die
    // Werkzeugleiste muss das sofort zeigen, nicht erst nach der Rechnung.
    app.neuRechnen(false);
    zeichneModellWerkzeuge(app);
  };
}

/**
 * Legende verschiebbar machen.
 *
 * In der Betriebsart «Positionen» wird sie so lang, dass sie die Werkzeuge
 * verdeckt - und es gibt keine Ecke, in der sie immer richtig läge. Gezogen
 * wird an der Kopfzeile, Doppelklick stellt sie zurück.
 */
function verdrahteLegendeZiehen(app, n) {
  const griff = n.querySelector('.legende-griff');
  if (!griff) return;
  griff.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    try { griff.setPointerCapture(e.pointerId); } catch { /* kein Fang */ }
    const buehne = ui.el('viewer').getBoundingClientRect();
    const kasten = n.getBoundingClientRect();
    const dx = e.clientX - kasten.left, dy = e.clientY - kasten.top;
    // Lage, von der aus verschoben wird. Ab hier bewegt nur noch der VERSATZ.
    const start = { links: kasten.left - buehne.left, oben: kasten.top - buehne.top };
    let ziel = { ...start };
    let angefordert = 0;
    let bewegt = false;
    n.classList.add('zieht');

    /*
     * WARUM VERSATZ UND NICHT left/top.
     *
     * left/top zu setzen heisst, den Browser bei jeder Zeigerbewegung neu
     * rechnen zu lassen, wo alles liegt - für einen Kasten, der sich nur
     * verschiebt. Ein transform ist dagegen Sache des Compositors und kostet
     * kein Layout. Festgeschrieben wird erst am Schluss, denn die gemerkte
     * Lage muss ohne Versatz gelten.
     *
     * UND HÖCHSTENS EIN SCHREIBEN JE BILD. Ein Zeiger schickt mehr
     * Ereignisse, als der Bildschirm Bilder zeigt; jedes davon sofort
     * auszuführen heisst, mehrfach für dasselbe Bild zu arbeiten. Genau das
     * ruckelt.
     */
    const male = () => {
      angefordert = 0;
      n.style.transform =
        `translate3d(${ziel.links - start.links}px, ${ziel.oben - start.oben}px, 0)`;
    };
    const bewegen = (ev) => {
      ziel = {
        links: Math.max(4, Math.min(buehne.width - kasten.width - 4,
                                    ev.clientX - buehne.left - dx)),
        oben: Math.max(4, Math.min(buehne.height - kasten.height - 4,
                                   ev.clientY - buehne.top - dy)),
      };
      // Erst wenn wirklich gezogen wurde, gilt die Legende als verschoben -
      // ein blosser Klick auf den Griff soll sie nicht aus der Ecke lösen.
      if (!bewegt && (Math.abs(ziel.links - start.links) > 2 ||
                      Math.abs(ziel.oben - start.oben) > 2)) {
        bewegt = true;
        n.classList.add('gezogen');
        n.style.left = `${start.links}px`;
        n.style.top = `${start.oben}px`;
      }
      if (bewegt && !angefordert) angefordert = requestAnimationFrame(male);
    };
    const ende = () => {
      if (angefordert) { cancelAnimationFrame(angefordert); angefordert = 0; }
      griff.removeEventListener('pointermove', bewegen);
      griff.removeEventListener('pointerup', ende);
      griff.removeEventListener('pointercancel', ende);
      n.classList.remove('zieht');
      n.style.transform = '';
      if (!bewegt) return;
      legendeLage = ziel;
      n.style.left = `${ziel.links}px`;
      n.style.top = `${ziel.oben}px`;
    };
    griff.addEventListener('pointermove', bewegen);
    griff.addEventListener('pointerup', ende);
    griff.addEventListener('pointercancel', ende);
  });
  griff.addEventListener('dblclick', () => {
    legendeLage = null;
    n.classList.remove('gezogen');
    n.style.left = ''; n.style.top = '';
  });
}

/** Gemerkte Lage der Legende, damit sie beim Neuzeichnen stehen bleibt. */
let legendeLage = null;
/** Legende «Positionen»: null = nach Länge, sonst die Wahl des Nutzers. */
let posLegendeZu = null;
/** Ab so vielen Einträgen steht die Positionsliste zugeklappt da. */
const POS_LEGENDE_LANG = 8;

/*
 * >>> DER FARBBALKEN (19. November). <<< Weisungen, im Wortlaut: «hier
 * überall auf den maximalwert 1.0 setzen und wenn man den balken anklickt
 * dann kann man die farben und andere anpasungen für den plot vornehmen»,
 * «den aktuellen lastfall sollte noch in der box unten rechts wo der balken
 * ist aufführen. dafür die einstellung nachweis resultat und frei in einem
 * modal oder durch ausfahren und in untermenues aufführen. dies bei allen
 * abbildungen nachführen, auch wenn linien nicht aktiv ist.»
 * Ein Balken für alle Plots: η endet bei 1.0 (darüber rot), unter dem
 * Balken der Lastfall; ein Klick klappt die Einstellungen auf - Farbe des
 * Modells (Nachweis / Resultat / frei) und der Höchstwert der Skala.
 */
let balkenOffen = false;
let legendeInfo = false;
function lastfallText(app) {
  const k = app.anzeigeKombi;
  if (!k || k === 'umhuellend') return 'Lastfall: umhüllend (alle Nachweisfälle)';
  const l = (app.letzte?.kombi?.lastfaelle ?? []).find((x) => x.key === k);
  return `Lastfall: ${l?.bez ?? k}`;
}
/*
 * Marke der Grenze im Balken (Audit 21. November, «Marke f_yd zeigen»): liegt
 * f_yd innerhalb der Skala, ein Strich an seiner Stelle; sonst sagt eine
 * Zeile unter dem Balken, wie weit die Skala darunter endet.
 */
function grenzMarke(p) {
  const g = p?.grenze;
  if (!(g > 0) || !(p.max > (p.min ?? 0))) return '';
  const f = (g - (p.min ?? 0)) / (p.max - (p.min ?? 0));
  if (f < 0 || f > 1) return '';
  return `<span class="legende-grenze" style="left:${(f * 100).toFixed(1)}%" title="Grenze f_yd ${g.toFixed(0)} N/mm²"></span>`;
}
function grenzZeile(p) {
  const g = p?.grenze;
  if (!(g > 0)) return '';
  const innen = g <= p.max && g >= (p.min ?? 0);
  return `<div class="legende-grenzzeile">f_yd ${g.toFixed(0)} N/mm²${innen ? ' (Strich)'
    : ` · Skala endet bei ${Math.round(100 * p.max / g)} % davon`}</div>`;
}
function balkenHtml(app, p, linie = false) {
  const a = app.ansicht;
  // Mit der Linie stellt der Balken die Farben der LINIE ein (19. November).
  if (linie) return balkenLinieHtml(app, p);
  /*
   * >>> FARBEN WIE BEI DER LINIE (22. November). <<< «die einstellauswahl
   * für die farben sollten wie bei den liniendigramme übernommen werden,
   * diese machen nicht so viel sinn hier.» Statt Nachweis / Resultat / frei:
   * «Skala» (Farbbalken der Grösse) oder «Verlauf» (zwei Farben, klein → gross).
   */
  const lf = a.linienFarbe === 'verlauf' ? 'verlauf' : 'resultat';
  const marken = !p ? [] : p.fest ? ['0', '0.5', '≥ 1.0']
    : [0, 0.33, 0.66, 1].map((f) => ((p.min ?? 0) + (p.max - (p.min ?? 0)) * f).toFixed(p.nk));
  const farbName = { resultat: 'Skala', verlauf: 'Verlauf' }[lf];
  const barStil = lf === 'verlauf' ? ` style="background:linear-gradient(90deg, ${esc(a.flFreiVon ?? '#f3e2bd')}, ${esc(a.flFrei ?? '#e0a030')})"` : '';
  const bar = p ? `<button type="button" class="legende-balken" data-balken title="Einstellungen der Farbe">
      <div class="legende-bar${p.fest ? ' bis1' : ''}"${barStil}>${grenzMarke(p)}</div>
      <div class="legende-skala">${marken.map((s) => `<span>${esc(s)}</span>`).join('')}</div>${grenzZeile(p)}</button>`
    : `<button type="button" class="legende-balken leer" data-balken title="Einstellungen der Farbe">Farbe: ${esc(farbName)} ▾</button>`;
  const einst = !balkenOffen ? '' : `<div class="leg-einst">
      <div class="leg-zeile"><span>Farbe</span><div class="zl-reihe zl-klein">${[['resultat', 'Skala'],
        ['verlauf', 'Verlauf']].map(([k, tx]) =>
        `<button type="button" data-leg-farbe="${k}" class="${lf === k ? 'an' : ''}">${tx}</button>`).join('')}</div></div>
      ${lf === 'verlauf' ? `<div class="leg-zeile"><span>Verlauf</span><div class="leg-farben"><input type="color" data-leg-vvon
          value="${esc(a.flFreiVon ?? '#f3e2bd')}" title="Farbe für kleine Werte"><span>→</span><input type="color" data-leg-vbis
          value="${esc(a.flFrei ?? '#e0a030')}" title="Farbe für grosse Werte"></div></div>` : ''}
      ${p && !p.fest ? `<div class="leg-zeile"><span>Skala von</span><input type="number" data-leg-min min="0" step="any"
          placeholder="0" value="${a.skalaMin > 0 ? a.skalaMin : ''}"><small>${esc(p.einheit && p.einheit !== '–' ? p.einheit : '')}</small></div>
        <div class="leg-zeile"><span>Skala bis</span><input type="number" data-leg-max min="0" step="any"
          placeholder="auto" value="${a.skalaMax > 0 ? a.skalaMax : ''}"><small>${esc(p.einheit && p.einheit !== '–' ? p.einheit : '')}</small></div>` : ''}
      <div class="leg-zeile"><span>Werte</span><label><input type="checkbox" data-leg-werte${a.werteAnschreiben ? ' checked' : ''}> anschreiben</label></div>
    </div>`;
  /*
   * >>> DER LASTFALL STEHT WIEDER UNTER DER SKALA (22. November). <<< «warum
   * wird hier nicht der aktuelle lastfall in der unteren box abgebildet?» -
   * kurz, als Zeile; ändert «Oben was, unten Skala» vom 21. November.
   */
  return `${bar}<div class="legende-fall">${esc(lastfallText(app))}${lf !== 'resultat' ? ` · Farbe ${esc(farbName)}` : ''}</div>${einst}`;
}
function balkenLinieHtml(app, p) {
  const a = app.ansicht;
  const zf = a.zlFarbe ?? 'skala';
  const marken = !p ? [] : p.fest ? ['0', '0.5', '≥ 1.0']
    : [0, 0.33, 0.66, 1].map((f) => ((p.min ?? 0) + (p.max - (p.min ?? 0)) * f).toFixed(p.nk));
  const name = { vorzeichen: 'Vorzeichen', skala: 'Skala', frei: 'Verlauf' }[zf];
  // Mit «Verlauf» zeigt der Balken die beiden gewählten Farben.
  const barStil = zf === 'frei' ? ` style="background:linear-gradient(90deg, ${esc(a.zlFreiVon ?? '#f3e2bd')}, ${esc(a.zlFrei ?? '#e0a030')})"` : '';
  const bar = p ? `<button type="button" class="legende-balken" data-balken title="Farben der Linie einstellen">
      <div class="legende-bar${p.fest ? ' bis1' : ''}"${barStil}></div>
      <div class="legende-skala">${marken.map((s) => `<span>${esc(s)}</span>`).join('')}</div></button>`
    : `<button type="button" class="legende-balken leer" data-balken>Farbe der Linie: ${esc(name)} ▾</button>`;
  const einst = !balkenOffen ? '' : `<div class="leg-einst">
      <div class="leg-zeile"><span>Linie</span><div class="zl-reihe zl-klein">${[['vorzeichen', '+ / −'],
        ['skala', 'Skala'], ['frei', 'Verlauf']].map(([k, tx]) =>
        `<button type="button" data-leg-zl="${k}" class="${zf === k ? 'an' : ''}">${tx}</button>`).join('')}</div></div>
      ${zf === 'frei' ? `<div class="leg-zeile"><span>Verlauf</span><div class="leg-farben"><input type="color" data-leg-zlvon
          value="${esc(a.zlFreiVon ?? '#f3e2bd')}" title="Farbe für kleine Werte"><span>→</span><input type="color" data-leg-zlfrei
          value="${esc(a.zlFrei ?? '#e0a030')}" title="Farbe für grosse Werte"></div></div>` : ''}
      ${p && !p.fest ? `<div class="leg-zeile"><span>Skala von</span><input type="number" data-leg-min min="0" step="any"
          placeholder="0" value="${a.skalaMin > 0 ? a.skalaMin : ''}"><small>${esc(p.einheit && p.einheit !== '–' ? p.einheit : '')}</small></div>
        <div class="leg-zeile"><span>Skala bis</span><input type="number" data-leg-max min="0" step="any"
          placeholder="auto" value="${a.skalaMax > 0 ? a.skalaMax : ''}"><small>${esc(p.einheit && p.einheit !== '–' ? p.einheit : '')}</small></div>` : ''}
      <div class="leg-zeile"><span>Werte</span><label><input type="checkbox" data-leg-werte${a.werteAnschreiben ? ' checked' : ''}> anschreiben</label></div>
    </div>`;
  return `${bar}<div class="legende-fall">${esc(lastfallText(app))} · Linie ${esc(name)}</div>${einst}`;
}
function balkenVerdrahten(app, n) {
  // Die Lastfallzeile führt zu den Lastfällen (21. November).
  n.querySelectorAll('[data-lf-link]').forEach((b) => {
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); app.zeigeLastfaelle?.(); };
  });
  const stopp = (el) => el.addEventListener('pointerdown', (e) => e.stopPropagation());
  const neu = () => { app.ansicht.zeichne(); zeichneLegende(app); };
  n.querySelectorAll('[data-balken]').forEach((b) => { stopp(b); b.onclick = () => morph(ui.el('legende'), () => { balkenOffen = !balkenOffen; zeichneLegende(app); }); });
  n.querySelectorAll('[data-leg-farbe]').forEach((b) => {
    stopp(b); b.onclick = () => { app.ansicht.linienFarbe = b.dataset.legFarbe; neu(); };
  });
  n.querySelectorAll('[data-leg-zl]').forEach((b) => {
    stopp(b); b.onclick = () => { app.ansicht.zlFarbe = b.dataset.legZl; neu(); };
  });
  const zfr = n.querySelector('[data-leg-zlfrei]');
  if (zfr) { stopp(zfr); zfr.oninput = () => { app.ansicht.zlFrei = zfr.value; app.ansicht.zeichne(); }; zfr.onchange = neu; }
  const zvo = n.querySelector('[data-leg-zlvon]');
  if (zvo) { stopp(zvo); zvo.oninput = () => { app.ansicht.zlFreiVon = zvo.value; app.ansicht.zeichne(); }; zvo.onchange = neu; }
  const mn = n.querySelector('[data-leg-min]');
  if (mn) {
    stopp(mn);
    mn.onchange = () => { const v = Number(mn.value); app.ansicht.skalaMin = v > 0 ? v : null; neu(); };
  }
  const fr = n.querySelector('[data-leg-frei]');
  if (fr) { stopp(fr); fr.oninput = () => { app.ansicht.linienFrei = fr.value; app.ansicht.zeichne(); }; }
  // Verlauf der Flächen (22. November): zwei Farben, klein → gross.
  [['[data-leg-vvon]', 'flFreiVon'], ['[data-leg-vbis]', 'flFrei']].forEach(([sel, k]) => {
    const el = n.querySelector(sel);
    if (el) { stopp(el); el.oninput = () => { app.ansicht[k] = el.value; app.ansicht._farbCacheWeg?.(); app.ansicht.zeichne(); }; el.onchange = neu; }
  });
  const mx = n.querySelector('[data-leg-max]');
  if (mx) {
    stopp(mx);
    mx.onchange = () => { const v = Number(mx.value); app.ansicht.skalaMax = v > 0 ? v : null; neu(); };
  }
  const we = n.querySelector('[data-leg-werte]');
  if (we) {
    stopp(we);
    we.onchange = () => { app.ansicht.werteAnschreiben = we.checked; app.ansicht.zeichne(); zeichneModellWerkzeuge(app); };
  }
}

/** Legende passend zur gewählten Einfärbung. */
export function zeichneLegende(app) {
  const n = ui.el('legende');
  /*
   * >>> MIT DER ZUSTANDSLINIE STEHT HIER IHRE STEUERUNG (14. November). <<<
   * Massgebender Wert mit Ort, Ebene (auto / quer / längs / dritte),
   * «Reaktionen dazu», Teile, «Ansicht folgt», Achsen - nur solange «Linie»
   * an ist; sonst die gewohnte Legende.
   */
  const zlHtml = zl.an && n ? zustandLegendeHtml(app) : null;
  if (zlHtml) {
    const z = app.ansicht.zustand;
    const titel = z ? `${z.name}${z.einheit ? ` [${z.einheit}]` : ''}${z.ebAuto && zlGroesse(app.ansicht.modus) && 'VM'.includes(zlGroesse(app.ansicht.modus)) ? ' · Ebene auto' : ''}`
      : 'Zustandslinie';
    /*
     * Der Farbbalken bleibt (19. November, «bei der darstellungsart linie
     * kann diese box bestehen bleiben und die farbe auch»). Ein Klick darauf
     * stellt die Farben der LINIE ein - «gemeint war nicht das man die
     * linien des modells anpasst, sondern den plott und die farben dazu»;
     * das Modell folgt mit der Linie immer der Plotgrösse.
     */
    const pp = app.ansicht.plotSkala();
    /*
     * >>> ZUSATZINFOS EINKLAPPBAR (22. November). <<< Weisung: «kann man bei
     * dieser box wenn liniendiagramm eingeschaltet ist, die zusatzinfos so
     * weit wie möglich einklappbar machen ähnlich wie beim fall ohne
     * liniendigramm. zudem funktioniert der button blick auf die eben nicht
     * sauber ich würde diesen weglassen.» Zu: Titel und Balken; ⓘ klappt
     * Wert, Ebene und Achsen auf (dieselbe Wahl wie ohne Linie).
     */
    const info = `<button type="button" class="legende-klapp${legendeInfo ? ' an' : ''}" data-leg-info title="${legendeInfo ? 'Angaben einklappen' : 'Grösster Wert, Ebene und Achsen zeigen'}">ⓘ</button>`;
    n.innerHTML = `<div class="legende-griff"><span>${esc(titel)}</span><small>ziehen</small>${info}</div>${balkenHtml(app, pp, true)}${legendeInfo ? zlHtml : ''}`;
    balkenVerdrahten(app, n);
    const ibz = n.querySelector('[data-leg-info]');
    ibz.addEventListener('pointerdown', (e) => e.stopPropagation());
    ibz.onclick = (e) => { e.stopPropagation(); morph(ui.el('legende'), () => { legendeInfo = !legendeInfo; zeichneLegende(app); }); };
    if (legendeLage) {
      n.classList.add('gezogen'); n.style.left = `${legendeLage.links}px`; n.style.top = `${legendeLage.oben}px`;
    } else { n.classList.remove('gezogen'); n.style.left = ''; n.style.top = ''; }
    verdrahteLegendeZiehen(app, n);
    zustandLegendeVerdrahten(app, n, (folgen) => app.zustandNeu(folgen));
    return;
  }
  const p = app.ansicht.plotSkala();
  const griff = (titel, klapp = '') =>
    `<div class="legende-griff"><span>${esc(titel)}</span>
       <small>ziehen</small>${klapp}</div>`;
  // Nach dem Neuaufbau die gemerkte Lage wiederherstellen und neu verdrahten.
  const fertig = () => {
    if (legendeLage) {
      n.classList.add('gezogen');
      n.style.left = `${legendeLage.links}px`;
      n.style.top = `${legendeLage.oben}px`;
    } else {
      n.classList.remove('gezogen');
      n.style.left = ''; n.style.top = '';
    }
    verdrahteLegendeZiehen(app, n);
  };
  if (p) {
    // η hat eine feste Skala bis 1.25; alle übrigen Grössen werden auf den
    // grössten Betrag im Modell bezogen, der deshalb dabeisteht.
    /*
     * Schulung (15. November, «hier sollte die Grenze bei 1.0 sein und nicht
     * 1.25, sonst kann das missverstanden werden vom user»): die Skala endet
     * bei 1.0, was darüber liegt, steht rot. Die Farben bleiben dieselben.
     */
    // Seit dem 19. November überall bis 1.0 und mit Lastfall (balkenHtml).
    // Der Erklärsatz steht hinter ⓘ (21. November, «Oben was, unten Skala»).
    const info = p.fussnote && !p.fest
      ? `<button type="button" class="legende-klapp" data-leg-info title="${esc(p.fussnote)}">ⓘ</button>` : '';
    n.innerHTML =
      griff(`${p.label}${p.einheit === '–' ? '' : ` [${p.einheit}]`}`, info) +
      balkenHtml(app, p) +
      (p.fussnote && !p.fest && legendeInfo ? `<div class="legende-fuss">${esc(p.fussnote)}</div>` : '') +
      (p.max > 0 || p.fest ? '' : '<div class="legende-fuss">keine Werte vorhanden</div>');
    balkenVerdrahten(app, n);
    const ib = n.querySelector('[data-leg-info]');
    if (ib) {
      ib.addEventListener('pointerdown', (e) => e.stopPropagation());
      ib.onclick = (e) => { e.stopPropagation(); morph(ui.el('legende'), () => { legendeInfo = !legendeInfo; zeichneLegende(app); }); };
    }
    fertig();
    return;
  }
  /*
   * >>> FARBE «FREI» BEHÄLT IHRE EINSTELLUNGEN (22. November). <<< «der button
   * frei unter dem resultat box wenn man die farbskala anklickt funktioniert
   * nicht richtig»: mit «frei» gibt es keine Skala, die Legende fiel auf
   * «Bauteile» zurück - die Einstellungen verschwanden, und man kam nicht
   * mehr zurück zu «Resultat». Jetzt bleibt der Balken mit «Farbe: frei ▾».
   */
  if (!p && app.ansicht.linienFarbe === 'frei' && PLOTS.some((x) => x.key === app.ansicht.modus)) {
    const mo = MODI.find((m) => m.key === app.ansicht.modus);
    n.innerHTML = griff(mo?.label ?? 'Farbe') + balkenHtml(app, null);
    balkenVerdrahten(app, n);
    fertig();
    return;
  }
  if (app.ansicht.modus === 'positionen') {
    const l = app.ansicht.szene?.legende ?? [];
    /*
     * >>> ZUKLAPPBAR, WENN SIE LANG WIRD (6. Oktober). <<< «Die Legende bei
     * pos zuklappbar machen, da sie eine gewisse länge überschreitet.» Ein
     * Knopf im Griff klappt die Liste zu; ohne eigene Wahl ist sie ab
     * POS_LEGENDE_LANG Einträgen zu. Die Wahl gilt bis zum Neuladen.
     */
    const lang = l.length > POS_LEGENDE_LANG;
    const zu = posLegendeZu ?? lang;
    const knopf = l.length > 3
      ? `<button type="button" class="legende-klapp" title="${zu ? 'Liste aufklappen' : 'Liste zuklappen'}">` +
        `${zu ? `▸ ${l.length}` : '▾'}</button>` : '';
    n.innerHTML = griff('Positionen', knopf) + (zu ? '' : '<div class="legende-liste">' +
      l.map((e) => `<div><span class="legende-farbe" style="background:${e.farbe}"></span>` +
                   `<span>${esc(e.label)}</span></div>`).join('') + '</div>');
    const b = n.querySelector('.legende-klapp');
    if (b) {
      // Der Knopf sitzt im Griff - sein Druck darf kein Ziehen beginnen.
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        posLegendeZu = !zu;
        zeichneLegende(app);
      });
    }
    fertig();
    return;
  }
  n.innerHTML = griff('Bauteile') + '<div class="legende-liste">' +
    '<div><span class="legende-farbe" style="background:var(--stahl)"></span><span>Gurtwinkel</span></div>' +
    '<div><span class="legende-farbe" style="background:var(--blech)"></span><span>Bindeblech</span></div>' +
    '<div><span class="legende-farbe" style="background:var(--achse)"></span><span>Anbauteil</span></div></div>';
  fertig();
}

/** Klick auf eine Bemassung im Modell: passendes Eingabefeld öffnen. */
export function zeigeFeld(app, key) {
  const f = FELDER.find((x) => x.key === key);
  const tab = ui.eingabeTabs().find((t) => t.gruppen.includes(f?.gruppe));
  if (!tab) return;
  app.tabEingabe = tab.id;
  app.neuRechnen();
  const el = document.getElementById(`feld-${key}`) ??
             ui.el('maske').querySelector(`[data-feld="${key}"]`);
  if (el) {
    /*
     * >>> DER SPRUNG IST KEIN BEDIENEN (4. Oktober). <<<
     * Gemeldet: «wenn ich einen masten anklicke über den text im 3d um auf
     * die stelle in der sidebar zu gelangen, springt diese dann nach obern
     * wenn ich den masttyp da anpassen will.» Gemessen (Klick auf den
     * Masttitel aus dem Reiter Anbauteile): die Leiste rollte in 0.4 s auf
     * 1106 px und stand 1.2 s später wieder auf 0. Der Fokus unten löst
     * `focusin` aus, und der Anker der Seitenleiste merkte sich das Feld an
     * seiner Stelle VOR dem weichen Rollen (1631 px tief); der Neuaufbau
     * eine Sekunde später (Stabwerk) rollte es dorthin zurück. Fokus zuerst,
     * dann den Anker lösen, dann rollen - der Neuaufbau behält danach die
     * Rollstellung des Reiters.
     */
    // Liegt das Feld in einer zugeklappten Gruppe, geht sie auf (13. November).
    for (let d = el.closest('details'); d; d = d.parentElement?.closest('details')) {
      if (!d.open) d.open = true;
    }
    if (!el.disabled) el.focus({ preventScroll: true });
    app.maskenAnkerLoesen?.();
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const rahmen = el.closest('.feld') ?? el;
    rahmen.classList.add('blitz');
    setTimeout(() => rahmen.classList.remove('blitz'), 1400);
  }
}

// --- Layout -----------------------------------------------------------------

/**
 * Breite, auf die eine Schublade einklappt.
 * Nicht null: die Schiene bleibt stehen und trägt die Reiter weiter.
 */
const SCHIENE = 42;


/**
 * Was die Modellspalte mindestens braucht [px].
 *
 * Die beiden Werkzeugleisten im Modellfenster sind zusammen rund 150 px
 * breit; darunter liegen sie übereinander und über dem Joch. Auf einem
 * 900-px-Fenster blieben der Mitte bei festen 386 + 380 px genau 92 px - eine
 * Spalte, in der man nichts mehr erkennt und die man auch nicht aufziehen
 * kann, ohne eine Schublade zu opfern.
 */
const MODELL_MIN = 320;

/** Breite eines Splitters [px] - dieselbe Marke, aus der die CSS sie bezieht. */
const SPLIT_PX = MASS.splitBreite;

export function baueLayout(app) {
  const ws = ui.el('ws');
  /*
   * AM ARBEITSBLATT SELBST, NICHT AN DER WURZEL.
   *
   * .ws setzt --sp-links / --sp-rechts als Vorgabe auf sich selbst (siehe
   * style.css) - eine eigene Festlegung am Element gewinnt gegen die geerbte
   * von :root. Solange das Skript dieselben 386/380 px schrieb, fiel das nie
   * auf; sobald es andere Breiten berechnet, wurden sie stillschweigend
   * verworfen. Am Element geschrieben, wirken sie.
   */
  const setze = (name, px) => ws.style.setProperty(name, px + 'px');

  /** Wieviel Platz die Schubladen zusammen höchstens einnehmen dürfen. */
  /*
   * >>> DAS MODELL BEKOMMT MINDESTENS 42 % DER BREITE (Durchsicht vom
   *     18. September, Punkt U5). <<<
   *
   * Mit festen 320 px blieben ihm auf einem Laptop (1280 px) 486 px - ein
   * Streifen neben zwei vollen Schubladen. Jetzt geben die Schubladen im
   * Verhaeltnis nach, bis das Modell 42 % hat: bei 1280 px 538 px, die
   * Schubladen rund 360/355 px. Ab etwa 1830 px bleibt alles wie bisher.
   */
  const modellMin = () =>
    Math.max(MODELL_MIN, Math.round(0.42 * document.documentElement.clientWidth));
  const platzFuerSchubladen = () =>
    Math.max(2 * SCHIENE,
             document.documentElement.clientWidth - 2 * SPLIT_PX - modellMin());

  /*
   * >>> ENTWEDER BREIT GENUG ZUM ARBEITEN ODER EINGEKLAPPT. <<<
   *
   * Gefunden am 11. September in einem Bedienlauf bei 835 px Fensterbreite:
   * die Ruecknahme oben stauchte die Schublade auf rund 230 px. Das ist
   * schmaler, als ihr Inhalt werden kann - die Anbauteilliste braucht mit
   * Punkt, Position, Name, Station und Kraeften ihre gut 250 px -, und die
   * Spalte bekam einen waagrechten Bildlauf. Beim Scrollen wanderten dann
   * die Beschriftungen nach links aus dem Bild: «...ARME DES KRAEFTEPAARS»
   * statt «HEBELARME», «...st durchlaufend» statt «Mast durchlaufend».
   *
   * Eine Schublade, in der man die Beschriftungen wegschieben muss, ist
   * keine Schublade mehr. Unterhalb der Arbeitsbreite wird sie deshalb ganz
   * EINGEKLAPPT - dann steht die Schiene mit ihren Symbolen da, und der Weg
   * zurueck ist ein Klick. Das ist der Zustand, den die Schiene seit dem
   * 5. September vorsieht; er wurde nur nie von selbst erreicht.
   */
  const ARBEITSBREITE = 260;
  /*
   * WUNSCHBREITE JE SEITE (13. November, Durchsicht der Bedienung, Punkt 1:
   * «mit 1 anfangen …» - Seitenleisten mit dem Schirm wachsen lassen).
   *
   * Bisher standen feste 386 / 380 px da, und ein schmal gewordenes Fenster
   * nahm die Schubladen zurueck, ein wieder breites gab ihnen nichts zurueck:
   * gemessen 245 / 241 px bei 1440 px Fensterbreite, nachdem das Fenster
   * einmal 887 px breit war - die Lastfalltabelle brauchte 371 px in 205.
   * Jetzt gibt es je Seite einen WUNSCH: was der Benutzer gezogen hat
   * (gemerkt im Browser), sonst rund ein Viertel der Fensterbreite zwischen
   * 386 und 460 px. `einpassen` rechnet bei Start UND bei jeder
   * Groessenaenderung vom Wunsch aus - nach unten wie nach oben.
   */
  const LEISTEN_MERKER = 'tragjoch-leisten';
  const vorgabe = (seite) => {
    const vw = document.documentElement.clientWidth;
    const v = Math.round(0.24 * vw);
    return seite === 'links' ? Math.max(386, Math.min(460, v)) : Math.max(380, Math.min(450, v));
  };
  const gemerkt = (() => {
    try { return JSON.parse(localStorage.getItem(LEISTEN_MERKER) || '{}') || {}; } catch { return {}; }
  })();
  const wunschVon = (seite) => {
    const g = Number(gemerkt[seite]);
    return Number.isFinite(g) && g >= 260 && g <= 640 ? g : vorgabe(seite);
  };
  const merken = (seite, v) => {
    gemerkt[seite] = v;
    try { localStorage.setItem(LEISTEN_MERKER, JSON.stringify(gemerkt)); } catch { /* ohne Speicher */ }
  };
  // Von Hand eingeklappt bleibt eingeklappt - das war eine Entscheidung.
  const vonHandZu = { links: false, rechts: false };
  let links = wunschVon('links'), rechts = wunschVon('rechts');
  /**
   * Breiten aus Wunsch und Platz. Entweder breit genug zum Arbeiten oder
   * eingeklappt (siehe ARBEITSBREITE unten).
   */
  const verteile = () => {
    let l = vonHandZu.links ? SCHIENE : wunschVon('links');
    let r = vonHandZu.rechts ? SCHIENE : wunschVon('rechts');
    const frei = platzFuerSchubladen();
    const offenL = vonHandZu.links ? 0 : l, offenR = vonHandZu.rechts ? 0 : r;
    const fest = (vonHandZu.links ? SCHIENE : 0) + (vonHandZu.rechts ? SCHIENE : 0);
    if (offenL + offenR + fest > frei && offenL + offenR > 0) {
      const f = Math.max(0, frei - fest) / (offenL + offenR);
      if (!vonHandZu.links) l = Math.max(SCHIENE, Math.round(l * f));
      if (!vonHandZu.rechts) r = Math.max(SCHIENE, Math.round(r * f));
    }
    if (!vonHandZu.links && !vonHandZu.rechts && (l < ARBEITSBREITE || r < ARBEITSBREITE)) {
      const nurLinks = Math.min(wunschVon('links'), frei - SCHIENE);
      if (nurLinks >= ARBEITSBREITE) { l = nurLinks; r = SCHIENE; }
    }
    if (l < ARBEITSBREITE) l = SCHIENE;
    if (r < ARBEITSBREITE) r = SCHIENE;
    return { l, r };
  };
  ({ l: links, r: rechts } = verteile());
  setze('--sp-links', links); setze('--sp-rechts', rechts);

  // Zuletzt offene Breite je Seite, damit das Einklappen umkehrbar bleibt
  // Beim Start eingeklappt: aufgeklappt wird auf die Vorgabebreite, nicht auf die Schiene.
  const offen = { links: links > SCHIENE ? links : wunschVon('links'), rechts: rechts > SCHIENE ? rechts : wunschVon('rechts') };

  const klasseSetzen = (seite, zu) => {
    ws.classList.toggle('zu-' + seite, zu);
    ui.el('split-' + seite).classList.toggle('zu', zu);
    if (zu) zeichneSchienen(app);
  };
  /*
   * >>> GESCHMEIDIG EIN- UND AUSFAHREN (22. November). <<<
   * Weisung: «das ein und ausfahren der bereiche und insbesondere der
   * sidebar geschmeidiger gestalten.» Gemessen ruckelte es, weil der Inhalt
   * beim Einklappen sofort der Schiene wich und während der Fahrt jedes
   * Bild neu umbrach. Jetzt behält der Inhalt seine Breite (er wird nur
   * abgedeckt), blendet aus bzw. ein, und die Schiene kommt erst am Ende
   * der Fahrt (`klasseSpaet`).
   */
  const setzeSeite = (seite, v, { klasseSpaet = false } = {}) => {
    if (seite === 'links') { links = v; setze('--sp-links', v); }
    else { rechts = v; setze('--sp-rechts', v); }
    const zu = v <= SCHIENE + 8;
    app.zuSeite[seite] = zu;
    if (!klasseSpaet) klasseSetzen(seite, zu);
    // Während der Fahrt nicht neu zeichnen - das Ende tut es einmal.
    if (!ws.classList.contains('animiert')) app.ansicht?.passeGroesseAn();
    // Die Werkzeugleiste im 3D klappt je nach Breite des Modellfensters (14. November).
    if (app.ansicht?.gruppen) zeichneModellWerkzeuge(app);
  };
  /*
   * AUCH BEIM START EINGEKLAPPT, NICHT NUR SCHMAL. Hier wurde bisher nur die
   * Breite auf die Schiene gesetzt, die Klasse `zu-…` fehlte - der ganze
   * Inhalt stand dann in 42 px zusammengequetscht (gesehen bei 800 px).
   */
  if (links <= SCHIENE) setzeSeite('links', SCHIENE);
  if (rechts <= SCHIENE) setzeSeite('rechts', SCHIENE);

  // Beim KLICKEN weich fahren, beim ZIEHEN nicht: eine Übergangszeit am
  // Mauszeiger fühlt sich wie Verzögerung an, nicht wie Führung.
  const weich = (fn, { seite = null, zu = false, danach = null } = {}) => {
    const panel = seite ? ws.querySelector(seite === 'links' ? '.panel-links' : '.panel-rechts') : null;
    if (panel) {
      // Der Inhalt fährt mit seiner offenen Breite, statt jedes Bild umzubrechen.
      const breit = zu ? panel.getBoundingClientRect().width : (offen[seite] || wunschVon(seite));
      panel.style.setProperty('--inhalt-breite', `${Math.round(breit)}px`);
      panel.classList.remove('blendet-ein', 'blendet-aus');
      void panel.offsetWidth;
      panel.classList.add(zu ? 'blendet-aus' : 'blendet-ein');
    }
    // Die Zeichenfläche behält ihr Bild (und ihre Mitte) bis zum Ende der Fahrt.
    const cv = ui.el('canvas3d');
    if (cv) {
      const w = Math.round(cv.getBoundingClientRect().width);
      cv.style.width = `${w}px`;
      cv.style.marginLeft = `calc(50% - ${w / 2}px)`;
    }
    ws.classList.add('animiert');
    fn();
    // Ausfahren: die Zielbreite steht erst nach `fn` fest.
    if (panel && !zu) panel.style.setProperty('--inhalt-breite', `${seite === 'links' ? links : rechts}px`);
    let einmal = false;
    const fertig = (e) => {
      // Nur das Ende DER Fahrt zählt - ein Übergang im Inhalt (Knopf,
      // Hover) meldet sich ebenfalls hier und beendete sie zu früh.
      if (e && (e.target !== ws || e.propertyName !== 'grid-template-columns')) return;
      if (einmal) return;
      einmal = true;
      danach?.();
      panel?.classList.remove('blendet-ein', 'blendet-aus');
      ws.classList.remove('animiert');
      if (cv) { cv.style.width = ''; cv.style.marginLeft = ''; }
      ws.removeEventListener('transitionend', fertig);
      app.ansicht?.passeGroesseAn();
      // Steht die Fahrt, darf die Ansicht nachgeben: sonst bleibt das Joch
      // links und rechts abgeschnitten, weil der Massstab nur an der Höhe
      // hängt. Nur herausfahren, nie heran - siehe passeEinWennAbgeschnitten.
      app.ansicht?.passeEinWennAbgeschnitten();
    };
    ws.addEventListener('transitionend', fertig);
    setTimeout(() => fertig(), 520);           // falls der Übergang ausbleibt
  };

  const umschalten = (seite) => {
    const jetzt = seite === 'links' ? links : rechts;
    if (jetzt <= SCHIENE + 8) {
      weich(() => {
        vonHandZu[seite] = false;
        const v = verteile();
        const ziel = seite === 'links' ? v.l : v.r;
        setzeSeite(seite, ziel > SCHIENE ? ziel : (offen[seite] || wunschVon(seite)));
      }, { seite, zu: false });
    } else {
      offen[seite] = jetzt; vonHandZu[seite] = true;
      weich(() => setzeSeite(seite, SCHIENE, { klasseSpaet: true }),
        { seite, zu: true, danach: () => klasseSetzen(seite, true) });
    }
  };
  // Von der Schiene aus wieder ausfahren, und zwar auf einen bestimmten Reiter.
  ausklappen = (seite) => {
    if (!app.zuSeite[seite]) return;
    vonHandZu[seite] = false;
    weich(() => setzeSeite(seite, offen[seite] || wunschVon(seite)), { seite, zu: false });
  };

  const zieher = (id, seite) => {
    const g = ui.el(id);
    g.title = 'Ziehen zum Verbreitern, klicken zum Ein- und Ausklappen';
    g.addEventListener('pointerdown', (e) => {
      // Kann werfen, wenn der Zeiger schon wieder weg ist. Ungesichert riss
      // es den ganzen Griff ab: die Zuhoerer fuer Bewegen und Loslassen
      // kamen dann gar nicht mehr, und der Bereich liess sich weder ziehen
      // noch einklappen.
      try { g.setPointerCapture(e.pointerId); } catch { /* kein Fang */ }
      const start = e.clientX;
      const a0 = seite === 'links' ? links : rechts;
      let bewegt = false;
      const bewegen = (ev) => {
        const d = (ev.clientX - start) * (seite === 'links' ? 1 : -1);
        if (Math.abs(ev.clientX - start) > 3) bewegt = true;
        // Obergrenze ist nicht mehr eine feste Zahl, sondern das, was der
        // Mitte bleiben muss. Zwei Schubladen zu je 640 px passten auf kein
        // Fenster unter 1600 px, ohne das Modell zu erdrücken.
        if (bewegt) {
          const andere = seite === 'links' ? rechts : links;
          const grenze = Math.max(SCHIENE,
            Math.min(640, platzFuerSchubladen() - andere));
          setzeSeite(seite, Math.max(SCHIENE, Math.min(grenze, a0 + d)));
        }
      };
      const ende = () => {
        g.removeEventListener('pointermove', bewegen);
        g.removeEventListener('pointerup', ende);
        // Klick ohne Bewegung klappt den Bereich ein oder wieder aus
        if (!bewegt) umschalten(seite);
        else {
          // Gezogen: das ist der neue Wunsch dieser Seite, auch beim naechsten Start.
          const v = seite === 'links' ? links : rechts;
          vonHandZu[seite] = v <= SCHIENE + 8;
          if (v >= ARBEITSBREITE) merken(seite, v);
        }
      };
      g.addEventListener('pointermove', bewegen);
      g.addEventListener('pointerup', ende);
    });
  };
  zieher('split-links', 'links');
  zieher('split-rechts', 'rechts');

  /*
   * WIRD DAS FENSTER SCHMALER, GEBEN DIE SCHUBLADEN NACH.
   *
   * Sonst schrumpft nur die Mitte gegen null - und der Weg zurück führt über
   * zwei Züge am Splitter, die man erst finden muss. Eingeklappte Seiten
   * bleiben eingeklappt: das war eine Entscheidung des Benutzers.
   */
  window.addEventListener('resize', () => {
    const v = verteile();
    if (v.l !== links) setzeSeite('links', v.l);
    if (v.r !== rechts) setzeSeite('rechts', v.r);
    if (v.l > SCHIENE) offen.links = v.l;
    if (v.r > SCHIENE) offen.rechts = v.r;
    if (app.ansicht?.gruppen) zeichneModellWerkzeuge(app);
  });

  zeichneSchienen(app);
}

/** Wird in baueLayout gesetzt; von den Schienen aus gerufen. */
let ausklappen = () => {};
/**
 * Eine Leiste von aussen ausfahren (6. Oktober). `zeigeAnbauteil` in app.js
 * rief `ausklappen` auf, das seit dem Aufteilen (A1) nur hier steht - der
 * ReferenceError brach das Loslassen im 3D ab, der Griff blieb haengen, und
 * die naechste Bewegung zog das Teil («Wenn Sidebar links geschlossen,
 * funktioniert anklicken nicht der anbauteile nicht richtig, es geht hinüber
 * in den drag an drop modus.»).
 */
export function seiteAusklappen(seite) { ausklappen(seite); }

/**
 * INHALT DER SCHIENEN.
 *
 * Links die Reiter der Eingabe, rechts zuoberst die Hauptnachweise und darunter
 * die Reiter der Auswertung. Der Sinn der rechten Schiene ist genau das: wer
 * das Modell breit macht, soll trotzdem sehen, ob der Nachweis hält - sonst
 * rechnet man im Blindflug und klappt alle zwei Minuten wieder auf.
 */
export function zeichneSchienen(app) {
  const knopf = (id, sym, titel, an) =>
    `<button class="schiene-knopf${an ? ' on' : ''}" data-reiter="${id}"
       type="button" title="${esc(titel)}">${icon(sym, 15)}</button>`;

  const l = ui.el('schiene-links');
  if (l) {
    l.innerHTML = ui.eingabeTabs()
      .map((t) => knopf(t.id, t.icon, `${t.titel} öffnen`, t.id === app.tabEingabe)).join('');
    l.querySelectorAll('[data-reiter]').forEach((b) => {
      b.onclick = () => { app.tabEingabe = b.dataset.reiter; app.neuRechnen(); ausklappen('links'); };
    });
  }

  const r = ui.el('schiene-rechts');
  if (!r) return;
  const e = app.letzte?.anzeige;
  // Führt das Stabwerk (28. September), zeigt die Schiene seine Zahlen -
  // seit dem 4. Oktober auch im gewählten Fall (dieselben wie die Kacheln).
  const swG = app.stabwerkAnsicht?.() ?? null;
  /*
   * OHNE ZAHL KEINE AMPEL. Ueber der groessten lieferbaren Laenge gibt es
   * fuer den Anker kein eta - dort steht ein Strich, und der ist ein Befund:
   * das Bauteil ist nicht belegt. Gruen waere die falsche Farbe, rot die
   * Behauptung einer Ueberschreitung, die niemand gerechnet hat.
   */
  const stufe = (v) => (!Number.isFinite(v) ? 'nok'
    : v > 1 ? 'nok' : v > 0.9 ? 'warn' : 'ok');
  // Die drei Einzelnachweise. η gesamt stand hier zuoberst und ist weg: es
  // sagt nichts, was diese drei nicht schon sagen - es IST das grösste von
  // ihnen -, und in der Fusszeile steht es ohnehin mitsamt Urteil.
  /*
   * DIE SCHIENE ZEIGT, WAS ES GIBT.
   *
   * Beim Joch sind das die drei Einzelnachweise. Beim Einzelmast gibt es
   * weder Ober- noch Untergurt noch Bindeblech - dort steht der eine
   * Nachweis, den er hat. Die Schiene ist bei eingeklappter Schublade das
   * Einzige, was von der Auswertung bleibt; sie darf nicht leer sein und
   * erst recht nicht von Bauteilen sprechen, die nicht dastehen.
   */
  /*
   * >>> ALLE NACHWEISE, NACH BAUTEIL GRUPPIERT. <<<
   *
   * Weisung vom 3. September: «Hier die pillen mit den restlichen nachweisen
   * (mast etc.) erweitern und etwas gruppiert darstellen.»
   *
   * Hier standen drei Pillen: Obergurt, Untergurt, Bindeblech. Der Mast
   * fehlte - und er ist auf einer Jochreihe regelmaessig der massgebende
   * (0.87 gegen 0.45 im gemessenen Fall). Wer die Schublade zuklappt und nur
   * die Schiene sieht, las damit den kleineren der beiden Werte und hielt
   * ihn fuer den Stand des Tragwerks.
   *
   * >>> GRUPPIERT, WEIL ES ZWEI BAUTEILE SIND. <<<
   *
   * Joch und Mast sind nicht dasselbe Tragglied. Fuenf Pillen in einer Reihe
   * lesen sich wie eine Steigerung; mit einem Trenner dazwischen liest man
   * zwei Gruppen. Der Trenner kostet drei Pixel und spart die Rueckfrage,
   * was «M2» neben «Bl» zu suchen hat.
   *
   * DIE MASTEN STEHEN UNTER IHREM NAMEN da (M1, M2) - dieselbe Regel wie in
   * den Kacheln der Auswertung. Sind beide Enden derselbe Mast, steht er
   * einmal: zwei gleiche Pillen waeren keine Auskunft, sondern ein Verdacht.
   */
  const gruppen = [];
  if (e) {
    if (app.letzte?.mitJoch === false) {
      gruppen.push({ titel: 'Mast',
        teile: [['Ma', app.letzte.erg?.mast?.eta ?? 0, 'Mast, Querschnitt']] });
    } else if (e.abfang && swG?.h?.teile?.[`${swG.jochKey}|UPE`]) {
      /*
       * >>> AM ABFANGJOCH WIE IN DEN KACHELN (3. Oktober). <<<
       * Weisung: «Schiene am Abfangjoch auch auf das Stabwerk umstellen.»
       * Die Schiene zeigte den Gurt des Ersatzbalkens (einfacher Balken,
       * 1.14 im gemeldeten Fall), die Kachel daneben den des Stabwerks
       * (0.88) - zwei Zahlen für dasselbe Bauteil.
       */
      // Abfangjoche übereinander: je Joch eine Gruppe (20. November).
      const joche = (swG.jochKeys?.length ?? 0) > 1 ? swG.jochKeys : [{ key: swG.jochKey, name: '' }];
      joche.forEach((j) => {
        const t = (k) => swG.h.teile[`${j.key}|${k}`];
        gruppen.push({ titel: `Abfangjoch${j.name ? ` ${j.name}` : ''} · Stabwerk`, teile: [
          ['G', t('UPE')?.eta ?? 0, `Gurt ${e.abfang.q.gurt.name}${j.name ? ` ${j.name}` : ''} (Stabwerk)`],
          ['Bl', t('blech')?.eta ?? 0, `Bindeblech${j.name ? ` ${j.name}` : ''} (Stabwerk)`],
        ] });
      });
    } else if (e.abfang) {
      /*
       * >>> DAS ABFANGJOCH HAT ZWEI GURTE, NICHT VIER. <<<
       *
       * Weisung vom 4. September: «nachweise beim Abfangjoch
       * aktualisieren.» Hier standen «OG», «UG» und «Bl» - die Pillen des
       * Tragjochs. Wer die Schublade zuklappt, sieht nur diese Schiene;
       * sie darf nicht von Bauteilen sprechen, die es nicht gibt.
       */
      gruppen.push({ titel: 'Abfangjoch', teile: [
        ['G', e.abfang.gurt?.eta ?? 0, `Gurt ${e.abfang.q.gurt.name}`],
        ['Bl', e.abfang.blech?.eta ?? 0, 'Bindeblech, massgebende Station'],
      ] });
    } else if (swG?.h?.ausleger && swG.h.teile?.[`${swG.jochKey}|UPE`]) {
      // Der Tragausleger aus dem Stabwerk (28. September): Gurt, Blech, Seil.
      const t = (k) => swG.h.teile[`${swG.jochKey}|${k}`];
      const a = swG.h.ausleger.aufhaengung;
      gruppen.push({ titel: 'Tragausleger · Stabwerk', teile: [
        ['UPE', t('UPE')?.eta ?? 0, 'Gurt UPE (Stabwerk)'],
        ['Bl', t('blech')?.eta ?? 0, 'Bindeblech (Stabwerk)'],
        ['Se', a?.druck ? NaN : (a?.eta ?? 0),
         a ? `Aufhängung S_v ${a.Sv.toFixed(2)} / ${swG.h.ausleger.Vzul} kN (charakteristisch)`
           : 'Aufhängung nicht gerechnet'],
      ] });
    } else if (e.ausleger?.gurt) {
      /*
       * Ohne gueltiges Stabwerk der Kragarm-Kern (28. September, 3b): UPE
       * lotrecht und das Seil. Kein Blech - das rechnet nur das Stabwerk,
       * und eine Pille des Phantomjochs stuende fuer ein Bauteil, das es
       * nicht gibt.
       */
      const a = e.ausleger.aufhaengung;
      gruppen.push({ titel: 'Tragausleger · Kragarm-Kern', teile: [
        ['UPE', e.ausleger.gurt.eta, `Gurt ${e.ausleger.profil}, lotrecht (Kragarm-Kern)`],
        ['Se', a?.druck ? NaN : (a?.eta ?? 0),
         a ? `Aufhängung S_v ${a.Sv.toFixed(2)} / ${e.ausleger.Vzul} kN (charakteristisch, Kragarm-Kern)`
           : 'Aufhängung nicht gerechnet'],
      ] });
    } else if (swG?.h?.teile?.[`${swG.jochKey}|OG`]) {
      /*
       * STABWERK FUEHRT (28. September): dieselben Zahlen wie die Kacheln
       * der Auswertung - die Schiene ist bei eingeklappter Schublade das
       * Einzige, was davon bleibt.
       */
      const t = (k) => swG.h.teile[`${swG.jochKey}|${k}`];
      gruppen.push({ titel: 'Joch · Stabwerk', teile: [
        ['OG', t('OG')?.eta ?? 0, `Obergurt ${e.modell.profOG.name} (Stabwerk)`],
        ['UG', t('UG')?.eta ?? 0, `Untergurt ${e.modell.profUG.name} (Stabwerk)`],
        ['Bl', t('blech')?.eta ?? 0, 'Bindeblech (Stabwerk)'],
      ] });
    } else {
      gruppen.push({ titel: 'Joch', teile: [
        ['OG', e.max.etaOG.og.eta, `Obergurt ${e.modell.profOG.name}`],
        ['UG', e.max.etaUG.ug.eta, `Untergurt ${e.modell.profUG.name}`],
        ['Bl', e.max.etaB.etaB, 'Bindeblech, massgebende Ebene'],
      ] });
    }
    /*
     * Nur wenn der Nachweis auch GEFUEHRT wird: die Gruppe laesst sich
     * abschalten, und dann hat hier keine Zahl zu stehen. Dieselbe Regel
     * wie bei den Kacheln - sonst zeigte die Schiene mehr, als die
     * Auswertung verantwortet.
     */
    /* =====================================================================
     * >>> DIE MASTEN STEHEN AUCH AM ABFANGJOCH IN DER SCHIENE. <<<
     * =====================================================================
     *
     * Weisung vom 11. September: «beim abfangjoch die pillen fuer masten
     * (anker druckstuetzen) beim zugeklappten zustand auffuehren und
     * gruppieren wie beim tragjoch.»
     *
     * Hier stand: «Beim Abfangjoch steht keine Mastpille - `erg.mast` kommt
     * aus der Tragjochrechnung und gilt fuer dieses Tragwerk nicht.» Das war
     * richtig bis zum 10. September; seither wird der Mastnachweis am
     * Abfangjoch mit dessen EIGENEN Auflagerkraeften gebildet und ersetzt
     * den alten (`anzeige.mast`). Der Grund fuer die Auslassung ist damit
     * weggefallen, die Auslassung war geblieben.
     *
     * Und sie war die gefaehrlichere Haelfte: gerade am Abfangjoch wird der
     * Mast regelmaessig massgebend - im Bedienlauf vom 11. September stand
     * das Joch bei 0.52 und ein Mast bei 1.47. Wer die Schublade zuklappt,
     * sah nur den kleineren Wert.
     * =================================================================== */
    const mastGefuehrt = app.letzte?.urteil?.nachweise?.mast !== false;
    if (app.letzte?.mitJoch !== false && e.mast && mastGefuehrt) {
      const namen = e.modell.federn?.namen ?? {};
      const gesehen = new Set();
      const teile = [];
      ['A', 'B'].forEach((ende) => {
        const n = e.mast[ende];
        if (!n) return;
        const name = namen[ende] || `Ende ${ende}`;
        if (gesehen.has(name)) return;
        gesehen.add(name);
        /*
         * STABWERK FUEHRT, KNICKEN ERGAENZT (28. September): der
         * Querschnitt aus dem Stabwerk, das Knicken als eigene Pille aus
         * dem Kern - wie die Kacheln der Auswertung.
         */
        const swM = swG?.h?.bauteile?.[`mast:${name}`];
        // Am Tragausleger gibt es keinen zweiten Masten (Phantom des Kerns).
        if (swG?.h?.ausleger && !swM) return;
        if (swM) {
          teile.push([name, swM.eta ?? 0, `${name} Querschnitt (Stabwerk)`]);
          // Das Knicken aus dem Stabwerk: am Ausleger, seit dem 28. September
          // auch am Tragjoch (`knick` je Mast); sonst das des Kerns.
          const knA = swG.h.ausleger?.knick ?? swG.h.knick?.[name];
          if (knA && Number.isFinite(knA.eta)) {
            teile.push([`K${name}`, knA.eta, `Knicken ${name} (Stabwerk)`]);
          } else if (!swG.h.ausleger && Number.isFinite(n.stabil?.eta)) {
            teile.push([`K${name}`, n.stabil.eta, `Knicken ${name} (Kontrollrechnung)`]);
          }
          return;
        }
        // Wie in den Kacheln: fuer das Urteil zaehlt der NACHWEIS, nicht
        // der Querschnitt allein - Stabilitaet eingeschlossen.
        teile.push([name, n.etaMitStabilitaet ?? n.eta ?? 0,
                    `${name}${n.profil ? ` ${n.profil}` : ''}`]);
      });
      if (teile.length) gruppen.push({ titel: 'Masten', teile });
    }
    /* =====================================================================
     * >>> UND DIE ANKER ALS EIGENE GRUPPE. <<<
     * =====================================================================
     *
     * Weisung vom 11. September (dieselbe): «(anker druckstuetzen)».
     *
     * Sie bekommen eine eigene Gruppe und nicht einen Platz bei den Masten,
     * denn ihr eta steht auf einer anderen Grundlage: CHARAKTERISTISCHE
     * Kraft gegen die zulaessige des Bemessungsdiagramms, waehrend Joch und
     * Mast auf Bemessungswerten stehen. Zwei Zahlen in einer Reihe lesen
     * sich als vergleichbar - genau das sind sie nicht, und der Titel der
     * Gruppe sagt es.
     *
     * UEBER DEM SORTIMENT gibt es kein eta. Die Pille steht trotzdem da,
     * mit einem Strich: eine fehlende Pille laese sich als «kein Anker»
     * lesen, und das waere die falsche Auskunft.
     */
    if (e.anker) {
      const namen = e.modell.federn?.namen ?? {};
      const gesehen = new Set();
      const teile = [];
      ['A', 'B'].forEach((ende) => {
        // Aus dem Stabwerk, wenn es gilt (9. Oktober): die Kachel zeigte den
        // Anker schon von dort, die Schiene noch den Kern - am Tragausleger
        // 0.11 neben 0.57 (der Kern kennt den Wind auf den Ausleger nicht).
        const nw = swG?.h?.ankerJe?.[namen[ende]]?.nachweis ?? e.anker[ende]?.nachweis;
        if (!nw) return;
        const name = namen[ende] || `Ende ${ende}`;
        if (gesehen.has(name)) return;
        gesehen.add(name);
        const wie = `${name} · ${nw.typ} · ${nw.N >= 0 ? 'Zug' : 'Druck'} `
          + `${Math.abs(nw.N).toFixed(1)} kN charakteristisch`
          + (nw.lieferbar === false ? ' · ÜBER DEM SORTIMENT' : '');
        /*
         * >>> DIE PILLE HEISST NICHT WIE DER MAST. <<<
         *
         * Weisung vom 16. September: «beim anker noch ergänzung anschreiben,
         * damit es nicht gleich ist wie beim mast m2.»
         *
         * Sie trug den MASTNAMEN - in der Schiene standen dann zwei Pillen
         * «M2» untereinander, eine mit 0.95 und eine mit 0.11, und nichts
         * sagte, dass die zweite der Stütze gehört. Der Gruppentitel steht
         * nur im Tooltip, und den liest niemand im Vorbeigehen.
         */
        teile.push([`Ank ${name}`,
                    Number.isFinite(nw.eta) ? nw.eta : null, wie]);
      });
      if (teile.length) gruppen.push({ titel: 'Anker · char.', teile });
    }
    /*
     * >>> DIE FUNDAMENTE (17. November). <<< «die ausnutzung fundament
     * aufführen im zusammengeklappten sidebar». Je Mast eine Pille, dieselbe
     * Zahl wie die Kachel: aus dem Stabwerk, wenn es gilt, sonst aus dem
     * Kern. Charakteristisch gegen zulässige Lasten - eigene Gruppe wie der
     * Anker.
     */
    if (app.werte?.nachweise?.fundament !== false) {
      const namen = e.modell?.federn?.namen ?? {};
      const gesehen = new Set();
      const teile = [];
      const taRoh = swG?.h?.ausleger?.fundament;
      const ta = taRoh?.A ?? (Number.isFinite(taRoh?.eta) ? taRoh : null);
      ['A', 'B'].forEach((ende) => {
        const name = namen[ende] || `Ende ${ende}`;
        const q = swG?.h?.fundamentJe?.[namen[ende]] ?? (ende === 'A' && ta) ?? e.fundament?.[ende];
        if (!q || q.fehlt || !Number.isFinite(q.eta) || gesehen.has(name)) return;
        gesehen.add(name);
        teile.push([`Fu ${name}`, q.eta, `Fundament ${name} · ${q.typ?.typ ?? ''}`
          + `${q.massgebend?.kurz ? ` · ${q.massgebend.kurz}` : ''} · charakteristisch`]);
      });
      if (teile.length) gruppen.push({ titel: 'Fundament · char.', teile });
    }
  }

  /*
   * >>> JE TRAGWERKSELEMENT EINE PILLE (20. November). <<< Weisung mit Bild
   * der Schiene: «hier die auswertung je tragwerkselement aufführen und
   * nicht jeden einzelnen erfüllungswert auflisten.» Ein Joch (Gurte und
   * Bindeblech) ist eine Pille, ein Mast (Querschnitt und Knicken) eine;
   * Anker und Fundament bleiben eigene Elemente. Die Zahl ist das Grösste,
   * die Einzelwerte stehen im Titel.
   */
  const jeElement = (g) => {
    const el = new Map();
    g.teile.forEach(([k, v, titel]) => {
      let name = k;
      const jm = /^Abfangjoch(?: ([A-Z]+\d+))?/.exec(g.titel) ?? /^(?:Joch|Tragausleger)/.exec(g.titel);
      if (jm) name = jm[1] ?? (g.titel.startsWith('Tragausleger') ? 'TA' : 'Joch');
      // Knicken «K<Mast>» gehört zum Masten.
      else if (g.titel === 'Masten' && /^K/.test(k) && g.teile.some(([k2]) => k2 === k.slice(1))) name = k.slice(1);
      const e = el.get(name) ?? { v: null, teil: [] };
      if (Number.isFinite(v) && (e.v === null || v > e.v)) e.v = v;
      e.teil.push(`${titel}: ${Number.isFinite(v) ? v.toFixed(3) : '–'}`);
      el.set(name, e);
    });
    return { ...g, teile: [...el.entries()].map(([n, e]) => [n, e.v, e.teil.join(' · ')]) };
  };
  gruppen.splice(0, gruppen.length, ...gruppen.map(jeElement));

  // Die Reiter stehen oben, die Nachweise darunter: oben sucht man den Weg
  // zurück in die Auswertung, unten liest man ab. Die Pillen füllen die
  // verbleibende Höhe; ihre Beschriftung steht senkrecht, weil in 42 mm
  // Breite sonst nur zwei Zeichen Platz hätten.
  r.innerHTML =
    // Dieselben Reiter wie oben in der Leiste (ohne Schnitt am Einzelmasten
    // und im Stabwerksweg, 29. Sept.) - eine Stelle, `auswertungTabs`.
    ui.auswertungTabs(app.werte, app.letzte?.mitJoch !== false)
      .map((t) => knopf(t.id, t.icon, `${t.titel} öffnen`, t.id === app.tabAuswertung)).join('') +
    (gruppen.length ? '<div class="schiene-trenner"></div>' +
         `<div class="schiene-nw">${gruppen.map((g, i) =>
           (i ? '<span class="nw-gruppe-trenner"></span>' : '') +
           `<span class="nw-gruppe" title="${esc(g.titel)}">${
             /*
              * >>> OHNE URTEIL KEINE FARBE - AUCH HIER. <<<
              *
              * Weisung vom 16. September zur Uebersicht: «wenn kein
              * tragsicherheitsurteil, dann ohne farbe.» Die Pillen zeigen
              * dieselben Zahlen wie die Kacheln, und beim Einzellastfall
              * waren sie gruen, waehrend die Uebersicht daneben grau war -
              * zwei Aussagen ueber dieselbe Sache.
              *
              * EINHEITLICH FUER ALLE PILLEN, auch die des Ankers: seine
              * Zahl haengt zwar nicht an der Anzeigewahl (er rechnet auf
              * charakteristischen Lastfaellen), aber eine farbige Pille
              * zwischen fuenf grauen laese sich als Urteil ueber das ganze
              * Tragwerk lesen. Der Tooltip sagt weiterhin, was sie ist.
              */
             g.teile.map(([k, v, titel]) =>
               `<div class="${app.anzeigeKombi === 'umhuellend' ? stufe(v) : ''}" role="button" tabindex="0"
                     data-pille="${esc(k)}" data-pille-eta="${Number.isFinite(v) ? v.toFixed(3) : ''}"
                     title="${esc(`${g.titel} · ${titel}`)}: η = ${
                       Number.isFinite(v) ? v.toFixed(3)
                         : 'nicht geführt'}">
                  <span class="senkrecht"><i>${esc(k)}</i><b>${
                    Number.isFinite(v) ? v.toFixed(2) : '–'}</b></span>
                </div>`).join('')}</span>`).join('')}</div>` : '');
  r.querySelectorAll('[data-reiter]').forEach((b) => {
    b.onclick = () => { app.tabAuswertung = b.dataset.reiter; app.zeichneAuswertung(); ausklappen('rechts'); };
  });
  /*
   * >>> DIE PILLEN SIND ANKLICKBAR (22. November, «diese buttons anklickbar
   * machen»). <<< Ein Klick klappt die Leiste auf, zeigt die Übersicht,
   * rollt zur Kachel dieses Elements (gleiche Zahl, Name im Titel), lässt
   * sie aufleuchten und zeigt ihren massgebenden Stab im 3D (Klick der Kachel).
   */
  r.querySelectorAll('[data-pille]').forEach((p) => {
    const geh = () => {
      const name = p.dataset.pille;
      const eta = p.dataset.pilleEta;
      app.tabAuswertung = 'uebersicht';
      app.zeichneAuswertung();
      ausklappen('rechts');
      setTimeout(() => {
        const wort = name.replace(/^Fu /, 'Fundament ');
        const alle = [...(ui.el('auswertung')?.querySelectorAll('.kz') ?? [])];
        const passt = (k) => (k.dataset.eta !== undefined && Number(k.dataset.eta).toFixed(3) === eta)
          || (k.querySelector('.kz-w')?.textContent ?? '').trim().startsWith(eta);
        const mitName = (k) => /^(Joch|TA)$/.test(name) || (k.textContent ?? '').includes(wort);
        const k = alle.find((x) => passt(x) && mitName(x)) ?? alle.find(mitName);
        if (!k) return;
        k.scrollIntoView({ block: 'center', behavior: 'smooth' });
        k.classList.remove('blitz'); void k.offsetWidth; k.classList.add('blitz');
        setTimeout(() => k.classList.remove('blitz'), 1400);
        k.click();
      }, 60);
    };
    p.onclick = geh;
    p.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); geh(); } };
  });
}
