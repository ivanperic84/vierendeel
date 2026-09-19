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
import { alleZeigen, nurDiesesZeigen } from './app.kontext.js';
import { zeichnungMenueUmschalten } from './app.zeichnung.js';
import { lageVon, tragwerkeSortiert, tragwerksart, versteckt } from './core.constants.js';
import { MASS, esc, icon, iconKnopf } from './design.js';
import { ANSICHTEN, LASTARTEN, MODI } from './render.3d.js';
import * as ui from './ui.js';
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
  { key: 'blech', icon: 'blech', text: 'Bindebleche' },
  // Anbauteile stehen bei den Bauteilen, nicht bei den Lasten: sie SIND
  // Tragwerk - der Weg, auf dem die Last ans Joch kommt. Wer die Lasten
  // global abstellt, um das Joch zu sehen, will diesen Weg behalten. Was zur
  // Last gehoert - der Wuerfel am Angriffspunkt und die Pfeile - bleibt
  // drueben und geht mit ihr.
  { key: 'anbau', icon: 'anbau', text: 'Anbauteile: Ständer, Ausleger, Traverse' },
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
  { key: 'raster', icon: 'raster', text: 'Bodenraster' },
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
  { key: 'windX', icon: 'wind', text: 'Wind in x (Jochachse)' },
  { key: 'windY', icon: 'wind', text: 'Wind in y (Gleisrichtung)' },
  { key: 'schnee', icon: 'schnee', text: 'Schnee und veränderlich vertikal' },
];

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
    + iconKnopf('v-schnitt', 'schnitt', 'Auf den Nachweisschnitt fahren');
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
  ui.el('ansicht-tools').innerHTML =
    `<button class="btn-icon btn-icon-acc v-handlung${
         app.setzen ? ' laeuft' : ''}" id="v-setzen" type="button"
       title="${app.setzen ? 'Setzen abbrechen'
                       : 'Bauteil setzen, ins Modell klicken, wohin es gehört'}"
       aria-label="${app.setzen ? 'Setzen abbrechen' : 'Bauteil setzen'}"
       aria-pressed="${Boolean(app.setzen)}">${icon('anbau')}</button>`
    /*
     * ZWEITE HANDLUNG, ZURUECKHALTENDER GEZEICHNET. Ohne Akzentfarbe: das
     * Setzen eines Bauteils ist der Weg, den man staendig geht, die
     * Zeichnung legt man einmal ein. Zwei gleich laute Knoepfe nebeneinander
     * heben einander auf.
     */
    + `<button class="btn-icon v-handlung${
         app.zeichnungMenue || app.kalibrierung || app.bildSchieben || app.ausrichtung ? ' laeuft' : ''}" id="v-zeichnung"
       type="button" title="${app.ansicht.zeichnung
         ? 'Zeichnung: neu einmessen, ersetzen oder entfernen'
         : 'Querprofil-Zeichnung einlegen, auch mit Strg+V oder Hineinziehen'}"
       aria-label="Querprofil-Zeichnung"
       aria-pressed="${Boolean(app.zeichnungMenue)}">${icon('zeichnung')}</button>`;
  ui.el('v-setzen').onclick = () => (app.setzen ? app.setzenEnde() : app.setzenStarten());
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
  ui.el('v-ganz').onclick = () => {
    app.station = null; app.ansicht.station = null;
    // Nur wenn wirklich etwas beiseitegelegt ist - sonst schriebe jeder
    // Klick auf «ganzes Querprofil» einen Schritt in den Verlauf.
    if (tragwerkeSortiert(app.werte).some((t) => versteckt(t))) alleZeigen(app);
    app.ansicht.ansichtZuruecksetzen(); app.zeichneAuswertung();
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
export function zeichneModellWerkzeuge(app) {
  const n = ui.el('ebenen-tools');
  if (!n) return;
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
  const gruppe = (id, titel, an, inhalt) =>
    `<div class="wz-gruppe${an ? '' : ' aus'}">
       <button class="wz-t wz-haupt${an ? ' on' : ''}" id="wz-g-${id}" type="button"
         title="Gruppe ${esc(titel)} ${an ? 'ausschalten' : 'einschalten'}"
         aria-pressed="${an}">${esc(titel)}</button>
       <div class="wz-knoepfe">${inhalt}</div></div>`;

  const gM = app.ansicht.gruppen.modell, gL = app.ansicht.gruppen.lasten,
        gR = app.ansicht.gruppen.resultate, gZ = app.ansicht.gruppen.zeichnung;

  n.innerHTML =
    `<div class="wz-gruppe"><div class="wz-t">Blick</div><div class="wz-knoepfe">${
      ANSICHTEN.map((a) => text(`wz-blick-${a.key}`, a.label.slice(0, 3), a.label,
                                a.key === app.ansicht.ansichtKey)).join('')
    }</div></div>` +
    gruppe('modell', 'Modell', gM, WZ_MODELL(app).map((s) =>
      schalter(`wz-m-${s.key}`, s.icon, s.text,
               app.ansicht.ebenen[s.key], !gM)).join('')) +
    gruppe('zeichnung', 'Zeichnung', gZ, WZ_ZEICHNUNG(app).map((s) => {
      const weg = s.fehlt();
      return schalter(`wz-z-${s.key}`, s.icon,
                      weg ? `${s.text} — ${s.fehltText}` : s.text,
                      app.ansicht.ebenen[s.key], !gZ || weg);
    }).join('')) +
    gruppe('lasten', 'Lasten', gL, WZ_LASTEN(app).map((s) => {
      const fehlt = !s.haupt && !da[s.key];
      return schalter(`wz-l-${s.key}`, s.icon,
        fehlt ? `${s.text} – im gewählten Lastfall nicht vorhanden` : s.text,
        s.haupt ? app.ansicht.ebenen.last : app.ansicht.lastarten[s.key], !gL || fehlt);
    }).join('')) +
    gruppe('resultate', 'Resultate', gR,
      schalter('wz-r-kraefte', 'schnitt', 'Schnittkräfte am Nachweisschnitt',
               app.ansicht.ebenen.kraefte, !gR) +
      schalter('wz-r-schnitt', 'wuerfel', 'Schnittebene', app.ansicht.ebenen.schnitt, !gR) +
      schalter('wz-r-werte', 'info', 'Werte im Modell anschreiben',
               app.ansicht.werteAnschreiben, !gR) +
      MODI.map((mo) => text(`wz-p-${mo.key}`, mo.kurz ?? mo.label.slice(0, 3),
                            mo.label, mo.key === app.ansicht.modus, !gR)).join(''));

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
    app.ansicht.zeichne(); zeichneLegende(app); zeichneModellWerkzeuge(app);
  };
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
  });
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
  });
  ui.el('wz-r-kraefte').onclick = () => {
    app.ansicht.ebenen.kraefte = !app.ansicht.ebenen.kraefte; nach();
  };
  ui.el('wz-r-schnitt').onclick = () => {
    app.ansicht.ebenen.schnitt = !app.ansicht.ebenen.schnitt; nach();
  };
  ui.el('wz-r-werte').onclick = () => {
    app.ansicht.werteAnschreiben = !app.ansicht.werteAnschreiben; nach();
  };
  MODI.forEach((mo) => {
    ui.el(`wz-p-${mo.key}`).onclick = () => {
      app.ansicht.modus = mo.key;
      app.ansicht.zeichne(); zeichneLegende(app); zeichneModellWerkzeuge(app);
    };
  });
}

/**
 * Auswahl der dargestellten Einwirkung, oben mittig im Modellfenster.
 * Voreingestellt ist die Umhüllende: je Station der ungünstigste Wert über
 * alle Kombinationen. Einzeln gewählt zeigt das Modell genau eine Kombination.
 */
export function zeichneEinwirkungswahl(app) {
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
  const GRUPPE = [
    ['tragsicherheit', 'Tragsicherheit'],
    ['aussergewoehnlich', 'Aussergewöhnlich (Havarie)'],
    ['charakteristisch', 'Charakteristisch — kein Nachweis'],
    ['gebrauchstauglichkeit', 'Gebrauchstauglichkeit — kein Nachweis'],
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

/** Legende passend zur gewählten Einfärbung. */
export function zeichneLegende(app) {
  const n = ui.el('legende');
  const p = app.ansicht.plotSkala();
  const griff = (titel) =>
    `<div class="legende-griff"><span>${esc(titel)}</span>
       <small>ziehen</small></div>`;
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
    const marken = p.fest
      ? ['0', '0.6', '1.0', '1.25']
      : [0, 0.33, 0.66, 1].map((f) => (p.max * f).toFixed(p.nk));
    n.innerHTML =
      griff(`${p.label}${p.einheit === '–' ? '' : ` [${p.einheit}]`}`) +
      '<div class="legende-bar"></div>' +
      `<div class="legende-skala">${marken.map((s) => `<span>${esc(s)}</span>`).join('')}</div>` +
      (p.fussnote ? `<div class="legende-fuss">${esc(p.fussnote)}</div>` : '') +
      (p.max > 0 || p.fest ? '' : '<div class="legende-fuss">keine Werte vorhanden</div>');
    fertig();
    return;
  }
  if (app.ansicht.modus === 'positionen') {
    const l = app.ansicht.szene?.legende ?? [];
    n.innerHTML = griff('Positionen') + '<div class="legende-liste">' +
      l.map((e) => `<div><span class="legende-farbe" style="background:${e.farbe}"></span>` +
                   `<span>${esc(e.label)}</span></div>`).join('') + '</div>';
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
  const tab = ui.EINGABE_TABS.find((t) => t.gruppen.includes(f?.gruppe));
  if (!tab) return;
  app.tabEingabe = tab.id;
  app.neuRechnen();
  const el = document.getElementById(`feld-${key}`) ??
             ui.el('maske').querySelector(`[data-feld="${key}"]`);
  if (el) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const rahmen = el.closest('.feld') ?? el;
    rahmen.classList.add('blitz');
    setTimeout(() => rahmen.classList.remove('blitz'), 1400);
    if (!el.disabled) el.focus({ preventScroll: true });
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

  let links = 386, rechts = 380;
  // Auf schmalen Fenstern beide Schubladen im Verhältnis zurücknehmen, statt
  // der Mitte zu lassen, was übrig bleibt.
  const frei = platzFuerSchubladen();
  if (links + rechts > frei) {
    const f = frei / (links + rechts);
    links = Math.max(SCHIENE, Math.round(links * f));
    rechts = Math.max(SCHIENE, Math.round(rechts * f));
  }
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
   * ERST DIE RECHTE EINKLAPPEN, NICHT BEIDE. Reicht der Platz fuer zwei
   * Schubladen nicht, bekommt die Eingabe ihn allein - die rechte Schiene
   * zeigt die Hauptnachweise ja weiter.
   */
  if (links < ARBEITSBREITE || rechts < ARBEITSBREITE) {
    const nurLinks = Math.min(386, frei - SCHIENE);
    if (nurLinks >= ARBEITSBREITE) { links = nurLinks; rechts = SCHIENE; }
  }
  if (links < ARBEITSBREITE) links = SCHIENE;
  if (rechts < ARBEITSBREITE) rechts = SCHIENE;
  setze('--sp-links', links); setze('--sp-rechts', rechts);

  // Zuletzt offene Breite je Seite, damit das Einklappen umkehrbar bleibt
  // Beim Start eingeklappt: aufgeklappt wird auf die Vorgabebreite, nicht auf die Schiene.
  const offen = { links: links > SCHIENE ? links : 386, rechts: rechts > SCHIENE ? rechts : 380 };

  const setzeSeite = (seite, v) => {
    if (seite === 'links') { links = v; setze('--sp-links', v); }
    else { rechts = v; setze('--sp-rechts', v); }
    const zu = v <= SCHIENE + 8;
    app.zuSeite[seite] = zu;
    ws.classList.toggle('zu-' + seite, zu);
    ui.el('split-' + seite).classList.toggle('zu', zu);
    if (zu) zeichneSchienen(app);
    app.ansicht?.passeGroesseAn();
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
  const weich = (fn) => {
    ws.classList.add('animiert');
    fn();
    const fertig = () => {
      ws.classList.remove('animiert');
      ws.removeEventListener('transitionend', fertig);
      app.ansicht?.passeGroesseAn();
      // Steht die Fahrt, darf die Ansicht nachgeben: sonst bleibt das Joch
      // links und rechts abgeschnitten, weil der Massstab nur an der Höhe
      // hängt. Nur herausfahren, nie heran - siehe passeEinWennAbgeschnitten.
      app.ansicht?.passeEinWennAbgeschnitten();
    };
    ws.addEventListener('transitionend', fertig);
    setTimeout(fertig, 400);           // falls der Übergang ausbleibt
  };

  const umschalten = (seite) => {
    const jetzt = seite === 'links' ? links : rechts;
    weich(() => {
      if (jetzt <= SCHIENE + 8) setzeSeite(seite, offen[seite] || 386);
      else { offen[seite] = jetzt; setzeSeite(seite, SCHIENE); }
    });
  };
  // Von der Schiene aus wieder ausfahren, und zwar auf einen bestimmten Reiter.
  ausklappen = (seite) => {
    if (!app.zuSeite[seite]) return;
    weich(() => setzeSeite(seite, offen[seite] || (seite === 'links' ? 386 : 380)));
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
    const platz = platzFuerSchubladen();
    const offen = (app.zuSeite.links ? 0 : links) + (app.zuSeite.rechts ? 0 : rechts);
    if (offen <= platz) return;
    const f = platz / offen;
    if (!app.zuSeite.links) setzeSeite('links', Math.max(SCHIENE, Math.round(links * f)));
    if (!app.zuSeite.rechts) setzeSeite('rechts', Math.max(SCHIENE, Math.round(rechts * f)));
  });

  zeichneSchienen(app);
}

/** Wird in baueLayout gesetzt; von den Schienen aus gerufen. */
let ausklappen = () => {};

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
    l.innerHTML = ui.EINGABE_TABS
      .map((t) => knopf(t.id, t.icon, `${t.titel} öffnen`, t.id === app.tabEingabe)).join('');
    l.querySelectorAll('[data-reiter]').forEach((b) => {
      b.onclick = () => { app.tabEingabe = b.dataset.reiter; app.neuRechnen(); ausklappen('links'); };
    });
  }

  const r = ui.el('schiene-rechts');
  if (!r) return;
  const e = app.letzte?.anzeige;
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
        const nw = e.anker[ende]?.nachweis;
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
  }

  // Die Reiter stehen oben, die Nachweise darunter: oben sucht man den Weg
  // zurück in die Auswertung, unten liest man ab. Die Pillen füllen die
  // verbleibende Höhe; ihre Beschriftung steht senkrecht, weil in 42 mm
  // Breite sonst nur zwei Zeichen Platz hätten.
  r.innerHTML =
    ui.AUSWERTUNG_TABS
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
               `<div class="${app.anzeigeKombi === 'umhuellend' ? stufe(v) : ''}"
                     title="${esc(`${g.titel} · ${titel}`)}: η = ${
                       Number.isFinite(v) ? v.toFixed(3)
                         : 'nicht geführt'}">
                  <span class="senkrecht"><i>${esc(k)}</i><b>${
                    Number.isFinite(v) ? v.toFixed(2) : '–'}</b></span>
                </div>`).join('')}</span>`).join('')}</div>` : '');
  r.querySelectorAll('[data-reiter]').forEach((b) => {
    b.onclick = () => { app.tabAuswertung = b.dataset.reiter; app.zeichneAuswertung(); ausklappen('rechts'); };
  });
}
