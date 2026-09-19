/**
 * app.optionen.js
 * ---------------------------------------------------------------------------
 * OPTIONEN UND NACHSCHLAGEN: Klassen, Sortiment, Handbuch, Optionen,
 * eigene Lastfaelle.
 *
 * Seit dem 19. September ein eigenes Modul (Durchsicht vom 18. September,
 * Punkt A1: app.js teilen). Den Arbeitsstand bekommt es als app - das
 * Kontextobjekt aus app.js. Es importiert app.js nicht zurueck.
 * ---------------------------------------------------------------------------
 */
import { abfangAuswertung, abfangFyd } from './core.abfangjoch.js';
import { tragwerkSatz, tragwerksart } from './core.constants.js';
import { lastfaelle } from './core.lasten.js';
import { berechne } from './core.vierendeel.js';
import { abfangLaengenbereich, abfangjoche } from './data.abfangjoche.js';
import { paketAnwenden, paketAus, pruefePaket, speicherLeeren } from './data.paket.js';
import { getProfil, getStahl } from './data.profiles.js';
import { laengenbereich, tragjoche } from './data.tragjoche.js';
import { abschnitt, esc, FARBEN as farben, icon } from './design.js';
import { handbuchDatei, handbuchHtml } from './doku.handbuch.js';
import * as store from './store.js';
import * as ui from './ui.js';
import { typUebernehmen } from './ui.schema.js';

function dialogKlassen(app) {
  if (!app.letzte) return;
  app.dialog('Querschnittsklassen, Herleitung', ui.klassenTabelle(app.letzte.kl), '');
}

/**
 * SORTIMENT DURCHRECHNEN - und was jetzt?
 *
 * Das Werkzeug sagte bisher klar, DASS es nicht hält und welche Stelle
 * massgebend ist. Die nächste Frage stellt sich von selbst und blieb offen:
 * welcher Typ hält denn? Das ist keine Kunst, nur Fleissarbeit - genau das,
 * was ein Rechner besser kann als ein Mensch mit einer Auswahlliste.
 *
 * ZWEI REGELN, die hier bindend sind:
 *
 *   1. DER TYP WECHSELT NICHT VON SELBST. Gerechnet wird auf Kopien; die
 *      Auswahl bleibt die Entscheidung des Benutzers. Ein Werkzeug, das den
 *      Nachweis dadurch erfüllt, dass es das Tragwerk austauscht, ist kein
 *      Nachweiswerkzeug.
 *
 *   2. WAS NICHT GEHT, WIRD GESAGT. Nicht jeder Typ trägt jede Länge - das
 *      Sortiment gibt je Typ einen Längenbereich vor. Solche Zeilen fallen
 *      nicht weg, sie stehen mit ihrem Grund da.
 *
 * Alles Übrige bleibt, wie es eingegeben wurde: Profile, Bleche und Masse
 * kommen beim Typwechsel aus der Datenbank (typUebernehmen), die Lasten und
 * die Anbauteile bleiben unangetastet.
 */
export function dialogSortiment(app) {
  if (!app.letzte) return;
  const stahl = getStahl(app.werte.stahl);
  const f0 = (v) => (Number.isFinite(v) ? v.toFixed(0) : '–');
  const f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : '–');
  const f3 = (v) => (Number.isFinite(v) ? v.toFixed(3) : '–');
  /*
   * >>> BEIM ABFANGJOCH SEIN EIGENES SORTIMENT. <<<
   *
   * Weisung vom 9. September: «den groesseren typ pruefen der die
   * abfangkraft traegt.»
   *
   * Der Dialog rechnete nur Tragjoche durch - beim Abfangjoch waere die
   * Liste die eines fremden Bauteils gewesen. Jetzt gilt dieselbe Frage fuer
   * beide Sortimente: welcher Typ traegt DIESE Lasten bei DIESER Laenge.
   *
   * Der Unterschied liegt nur in den Quellen: `abfangAuswertung` statt
   * `berechne`, das Abfangjoch-Sortiment statt der Typendatenbank, und die
   * Lasten des Jochs kommen aus seiner eigenen Tabelle (Gewicht, Wind,
   * Schnee je Typ) statt aus den Feldern der Maske.
   */
  if (tragwerksart(app.werte).key === 'abfangjoch') {
    dialogSortimentAbfang(app, { f0, f2, f3 });
    return;
  }

  const zeilen = tragjoche().map((j) => {
    const b = laengenbereich(j);
    if (app.werte.L < b.min - 1e-9 || app.werte.L > b.max + 1e-9) {
      return { typ: j.typ, name: j.typ, eta: null,
               grund: `Länge ${f2(app.werte.L)} m ausserhalb ${f2(b.min)} … ${f2(b.max)} m` };
    }
    try {
      const w = typUebernehmen({ ...app.werte }, j);
      const e = berechne(w, getProfil(w.profOG), getProfil(w.profUG), stahl, j);
      return { typ: j.typ, name: j.typ, eta: e.max.etaGesamt,
               masse: `${f0(w.jd)} × ${f0(w.jbbOG)} mm`,
               profil: w.profOG, gewicht: j.gewicht ?? null };
    } catch (f) {
      return { typ: j.typ, name: j.typ, eta: null, grund: String(f.message ?? f) };
    }
  });

  // Nach Ausnutzung, aber die Tragfähigen zuerst - gesucht ist der kleinste,
  // der noch hält, und der steht damit zuoberst unter den grünen.
  const traegt = zeilen.filter((z) => z.eta !== null && z.eta <= 1)
    .sort((a, b) => b.eta - a.eta);
  const zuKlein = zeilen.filter((z) => z.eta !== null && z.eta > 1)
    .sort((a, b) => a.eta - b.eta);
  const geht = zeilen.filter((z) => z.eta === null);

  const zeile = (z) => `
    <tr class="${z.eta === null ? '' : z.eta <= 1 ? 'klick' : 'klick nok'}"
        ${z.eta === null ? '' : `data-typ="${esc(z.typ)}"`}>
      <td><b>${esc(z.name)}</b>${z.typ === app.werte.typ
        ? ' <span class="ablage-meta">gewählt</span>' : ''}</td>
      <td class="num">${z.eta === null ? '–' : f3(z.eta)}</td>
      <td>${z.eta === null ? esc(z.grund)
        : `${esc(z.masse)} · ${esc(z.profil)}${
            z.gewicht ? ` · ${f0(z.gewicht)} kg/m` : ''}`}</td>
    </tr>`;

  const block = (titel, liste) => (liste.length ? `
    ${abschnitt(titel, `${liste.length} Typ${liste.length === 1 ? '' : 'en'}`)}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Typ</th><th class="num">η</th><th>Masse · Gurtprofil</th></tr></thead>
      <tbody>${liste.map(zeile).join('')}</tbody></table></div>` : '');

  app.dialog('Sortiment durchrechnen',
    `<p class="notiz" style="margin-top:0">Dieselbe Geometrie, dieselben Lasten,
       dieselben Anbauteile, nur der Tragjoch-Typ wechselt. Profile, Bleche und
       Masse kommen dabei aus der Typendatenbank.
       <b>Der gewählte Typ ändert sich nicht von selbst:</b> eine Zeile
       anklicken übernimmt ihn.</p>
     ${block('Trägt', traegt)}
     ${block('Zu klein', zuKlein)}
     ${block('Nicht gerechnet', geht)}`,
    '<button class="btn" data-zu>Schliessen</button>', 'dialog-breit');

  ui.el('ueberlagerung').querySelectorAll('[data-typ]').forEach((tr) => {
    tr.addEventListener('click', () => {
      ui.el('ueberlagerung').querySelector('[data-zu]')?.click();
      app.aendern('typ', tr.dataset.typ);
    });
  });
}

/**
 * >>> WELCHER ABFANGJOCHTYP TRAEGT DIESE LASTEN? <<<
 *
 * Weisung vom 9. September: «den groesseren typ pruefen der die abfangkraft
 * traegt.» Dieselbe Frage wie beim Tragjoch, dasselbe Verfahren - nur das
 * Sortiment und der Rechenkern sind andere.
 *
 * >>> DIE LAENGE ENTSCHEIDET MIT. <<<
 *
 * Das Abfangjoch-Sortiment fuehrt je Typ einen Laengenbereich, und die
 * Bereiche ueberlappen nur teilweise: A160 endet bei 12.50 m, A300 beginnt
 * bei 13.00 m. Ein Typ, der die eingestellte Laenge NICHT fuehrt, wird
 * deshalb nicht stillschweigend uebergangen - er steht mit seinem Bereich
 * da. Sonst suchte man den naechstgroesseren und faende ihn nicht.
 */
function dialogSortimentAbfang(app, { f0, f2, f3 }) {
  const satz = tragwerkSatz(app.werte);
  const jt = Number(app.werte.L) || 0;
  const qpEk = { EK1: '0.9', EK2: '1.1', EK3: '1.3' }[satz.ek] ?? '1.1';
  const sKl = String(satz.schneeKlasse ?? '1.25');

  const zeilen = abfangjoche().map((a) => {
    const b = abfangLaengenbereich(a);
    const grund = jt < b.min - 1e-9 || jt > b.max + 1e-9
      ? `Länge ${f2(jt)} m ausserhalb ${b.text}` : null;
    if (grund) return { typ: a.typ, eta: null, grund, profil: a.profil };
    try {
      const r = abfangAuswertung({
        typ: a.typ, jt,
        gk: (a.gewicht ?? 0) * 9.81 / 1000,
        wk: a.wind?.[qpEk] ?? 0,
        sk: satz.schneeAktiv === false ? 0 : (a.schnee?.[sKl] ?? 0),
        anbauteile: satz.anbauteile ?? [],
        gammaG: app.werte.gammaG, gammaQ: app.werte.gammaQ, psi0: app.werte.psi0,
        fyd: abfangFyd(getStahl(app.werte.stahl), app.werte.gammaM0), ek: satz.ek,
        L_FL: satz.L_FL, R: satz.R, knotenbereich: 'anschnitt',
      });
      if (!r) return { typ: a.typ, eta: null, profil: a.profil,
                       grund: 'nicht rechenbar — Blechlage nicht erfasst' };
      return { typ: a.typ, eta: r.max.eta, profil: a.profil,
               etaGurt: r.gurt?.eta, etaBlech: r.blech?.eta,
               N: r.gurt?.N, gewicht: a.gewicht ?? null };
    } catch (f) {
      return { typ: a.typ, eta: null, profil: a.profil,
               grund: String(f.message ?? f) };
    }
  });

  const traegt = zeilen.filter((z) => z.eta !== null && z.eta <= 1)
    .sort((a, b) => b.eta - a.eta);
  const zuKlein = zeilen.filter((z) => z.eta !== null && z.eta > 1)
    .sort((a, b) => a.eta - b.eta);
  const geht = zeilen.filter((z) => z.eta === null);

  const zeile = (z) => `
    <tr class="${z.eta === null ? '' : z.eta <= 1 ? 'klick' : 'klick nok'}"
        ${z.eta === null ? '' : `data-abfangtyp="${esc(z.typ)}"`}>
      <td><b>${esc(z.typ)}</b>${z.typ === app.werte.abfangTyp
        ? ' <span class="ablage-meta">gewählt</span>' : ''}</td>
      <td class="num">${z.eta === null ? '–' : f3(z.eta)}</td>
      <td>${z.eta === null ? esc(z.grund)
        : `${esc(z.profil)} · Gurt ${f3(z.etaGurt)} · Blech ${f3(z.etaBlech)}`
          + ` · N ${f0(Math.abs(z.N ?? 0))} kN`
          + `${z.gewicht ? ` · ${f0(z.gewicht)} kg/m` : ''}`}</td>
    </tr>`;

  const block = (titel, liste) => (liste.length ? `
    ${abschnitt(titel, `${liste.length} Typ${liste.length === 1 ? '' : 'en'}`)}
    <div class="tabellenrahmen"><table class="dt">
      <thead><tr><th>Typ</th><th class="num">η</th>
        <th>Profil · Gurt · Blech · Kräftepaar</th></tr></thead>
      <tbody>${liste.map(zeile).join('')}</tbody></table></div>` : '');

  app.dialog('Sortiment durchrechnen',
    `<p class="notiz" style="margin-top:0">Dieselbe Länge (${f2(jt)} m),
       dieselben Anbauteile und Beiwerte, nur der Abfangjoch-Typ wechselt.
       Eigengewicht, Wind und Schnee des Jochs kommen dabei aus der
       Sortimentstabelle des jeweiligen Typs.
       <b>Der gewählte Typ ändert sich nicht von selbst:</b> eine Zeile
       anklicken übernimmt ihn.</p>
     ${block('Trägt', traegt)}
     ${block('Zu klein', zuKlein)}
     ${block('Nicht gerechnet', geht)}`,
    '<button class="btn" data-zu>Schliessen</button>', 'dialog-breit');

  ui.el('ueberlagerung').querySelectorAll('[data-abfangtyp]').forEach((tr) => {
    tr.addEventListener('click', () => {
      ui.el('ueberlagerung').querySelector('[data-zu]')?.click();
      app.aendern('abfangTyp', tr.dataset.abfangtyp);
    });
  });
}

/**
 * HANDBUCH: Herleitung des Rechenwegs und Grenzen des Modells.
 *
 * Es steht bewusst im Banner und nicht in einem Reiter der Auswertung: es
 * gehört nicht zu einem einzelnen Ergebnis, sondern zum ganzen Werkzeug. Wer
 * eine Zahl nicht einordnen kann, soll ohne Umweg hierher kommen.
 *
 * Beim Drucken wird nur das Handbuch gesetzt (Klasse am body); sonst käme das
 * Arbeitsblatt mit aufs Papier.
 */
/** Farbtokens eines Themas – für Ausleitungen, die kein Skript ausführen. */
const farbtokens = (thema) => farben[thema] ?? farben.hell;

export function dialogHandbuch(app) {
  const d = app.dialog('Handbuch, Herleitung und Modellgrenzen', handbuchHtml(),
    '<button class="btn" data-datei>Als Datei sichern</button>' +
    '<button class="btn" data-drucken>Drucken / PDF</button>' +
    '<button class="btn" data-zu>Schliessen</button>', 'dialog-breit');

  // Das Handbuch als eigenständige HTML-Datei – Beilage zur Statik, ohne
  // dass die ganze Anwendung mitgeschickt werden muss.
  d.node.querySelector('[data-datei]').onclick = () => {
    // Helles Thema: die Datei wird gelesen, beigelegt und gedruckt.
    const html = handbuchDatei({ fussnote: `${APP_NAME} ${VERSION}`,
                                 tokens: farbtokens('hell') });
    store.dateiSpeichern(html, `${APP_NAME}_Handbuch_${new Date().toISOString().slice(0, 10)}.html`,
                         'text/html;charset=utf-8');
  };

  const koerper = d.node.querySelector('.dialog-koerper');
  const eintraege = [...d.node.querySelectorAll('.hb-toc-e')];
  const abschnitte = [...d.node.querySelectorAll('.hb-abschnitt')];
  // Lage eines Abschnitts IM Bildlauffenster. Über offsetTop ginge es nicht:
  // der nächste positionierte Vorfahr ist der Vorhang, nicht der Textkörper.
  const lage = (s) =>
    s.getBoundingClientRect().top - koerper.getBoundingClientRect().top
    + koerper.scrollTop;

  // Inhaltsverzeichnis: Sprung innerhalb des Dialogs, nicht der Seite - ein
  // Anker würde die ganze Anwendung scrollen.
  eintraege.forEach((a) => {
    a.onclick = () => {
      const ziel = d.node.querySelector(`#hb-${a.dataset.zu}`);
      if (!ziel) return;
      koerper.scrollTop = lage(ziel) - 8;
      eintraege.forEach((x) => x.classList.remove('on'));
      a.classList.add('on');
    };
  });
  // Mitlaufende Markierung im Verzeichnis
  koerper.onscroll = () => {
    const y = koerper.scrollTop + 24;
    let letzterId = abschnitte[0]?.id.replace(/^hb-/, '') ?? null;
    abschnitte.forEach((s) => {
      if (lage(s) <= y) letzterId = s.id.replace(/^hb-/, '');
    });
    eintraege.forEach((x) => x.classList.toggle('on', x.dataset.zu === letzterId));
  };
  koerper.onscroll();

  d.node.querySelector('[data-drucken]').onclick = () => {
    document.body.classList.add('druck-handbuch');
    window.print();
    document.body.classList.remove('druck-handbuch');
  };
}

/**
 * Optionen: alles, was die Rechnung steuert, aber nicht zum Bauteil gehört.
 * Der Dialog bleibt offen, während gerechnet wird - so sieht man die Wirkung
 * einer Änderung sofort in der Auswertung.
 */
/**
 * Welcher Reiter der Optionen zuletzt offen stand.
 *
 * Er ueberlebt das Schliessen des Dialogs: wer an den Lastbeiwerten arbeitet,
 * schliesst, rechnet, schaut nach - und will nicht jedes Mal wieder
 * hinklicken.
 */
let optThema = 'modell';

export function dialogOptionen(app) {
  const koerper = () =>
    ui.optionenReiterHtml(app.werte, optThema)
    + `<div id="opt-koerper">${ui.optionenHtml(app.werte, optThema)}</div>`;
  // FESTE HOEHE (Weisung, 1. September): sechs Reiter mit sehr verschieden
  // viel Inhalt, und der Scrim zentriert. Ohne feste Hoehe sprang das Fenster
  // bei jedem Reiterwechsel.
  const d = app.dialog('Optionen', `<div id="opt-rahmen">${koerper()}</div>`,
    `<button class="btn" data-bauteildaten>${icon('tabelle', 13)} Bauteildaten</button>
     <button class="btn" data-tasten>${icon('tastatur', 13)} Tastenkürzel</button>
     <button class="btn" data-thema>${app.thema === 'dunkel' ? 'Helle' : 'Dunkle'} Darstellung</button>
     <button class="btn btn-fail" data-reset>Eingaben zurücksetzen</button>
     <button class="btn" data-zu>Fertig</button>`, 'dialog-reiter');

  // Der Reiter faellt beim Neuaufbau nicht heraus: gezeichnet wird IMMER der
  // ganze Rahmen samt Leiste, und optThema sagt, welcher offen ist. Nur den
  // Koerper zu tauschen haette die Leiste stehen lassen - und mit ihr die
  // Hervorhebung des vorigen Reiters.
  const verdrahte = () => {
    const rahmen = ui.el('opt-rahmen');
    rahmen.querySelectorAll('[data-opt-thema]').forEach((b) => {
      b.onclick = () => {
        optThema = b.dataset.optThema;
        hoeheWandern(neu);
      };
    });
    ui.verdrahteOptionen(ui.el('opt-koerper'), app.werte, (k, v, zwischenstand) => {
      app.aendern(k, v);
      // Abhaengige Felder gehen mit - aber erst, wenn die Eingabe steht.
      // Waehrend des Tippens bliebe sonst keine mehrstellige Zahl stehen.
      if (!zwischenstand) neu();
    });
    /*
     * DER REITER «DATENBASIS» wird hier verdrahtet, nicht in ui.js: dort ist
     * die Form zu Hause, hier die Handlung. Dateien lesen, das Paket
     * anwenden und die Anwendung neu starten gehoert in die Anwendung.
     */
    const stand = (text, schlecht = false) => {
      const n = ui.el('d-paket-stand');
      if (!n) return;
      n.textContent = text;
      n.style.color = schlecht ? 'var(--fail, #c00)' : '';
    };
    const datei = rahmen.querySelector('#d-paket');
    if (datei) datei.onchange = async (ev) => {
      const f = ev.target.files?.[0];
      if (!f) return;
      try {
        const obj = JSON.parse(await f.text());
        const p = pruefePaket(obj);
        if (!p.ok) { stand(p.fehler.join(' '), true); return; }
        paketAnwenden(obj);
        stand(`Geladen: ${p.teile.map((x) => `${x.anzahl} ${x.einheit}`).join(' · ')}`
              + ' — die Anwendung wird neu gestartet.');
        setTimeout(() => location.reload(), 900);
      } catch (fehler) {
        stand(`Datei nicht lesbar: ${fehler.message}`, true);
      }
    };
    const fenster = rahmen.querySelector('[data-daten-fenster]');
    if (fenster) fenster.onclick = () => app.dialogBauteildaten();
    const sichern = rahmen.querySelector('[data-daten-sichern]');
    if (sichern) sichern.onclick = () => {
      try {
        const paket = paketAus(app.projekt.projekt || '');
        store.dateiSpeichern(JSON.stringify(paket, null, 1),
                             `${APP_NAME}_Datenpaket_${paket.stand}.json`);
      } catch (fehler) {
        stand(`Nichts zu sichern: ${fehler.message}`, true);
      }
    };
    const leeren = rahmen.querySelector('[data-daten-leeren]');
    if (leeren) leeren.onclick = () => {
      speicherLeeren();
      stand('Hinterlegtes Paket gelöscht, beim nächsten Start ist es weg.');
    };

    // Die Nachweisschalter tragen keinen Feldschluessel: sie sitzen zusammen
    // in EINEM Wert. Einzeln geschrieben ginge die uebrige Auswahl verloren.
    rahmen.querySelectorAll('[data-nachweis]').forEach((inp) => {
      inp.onchange = () => {
        app.aendern('nachweise', { ...(app.werte.nachweise ?? {}),
                               [inp.dataset.nachweis]: inp.checked });
        neu();
      };
    });
  };
  /*
   * DER FOKUS UEBERLEBT DEN NEUAUFBAU.
   *
   * Ein Zahlenfeld meldet jede Taste (`input`), und jede Meldung baute den
   * ganzen Rahmen neu. Danach war das Feld ein ANDERES DOM-Element: der
   * Fokus lag nirgends, die Schreibmarke war fort, und es liess sich immer
   * nur eine Ziffer eintippen, dann musste man neu hineinklicken.
   *
   * Neu gebaut werden muss trotzdem, denn abhaengige Felder gehen mit. Also
   * wird gemerkt, wo der Zeiger stand, und danach dorthin zurueckgesetzt.
   * Die Auswahl (selectionStart/End) kommt mit, sonst springt die Marke bei
   * jeder Ziffer ans Ende und ein Einfuegen in der Mitte ist unmoeglich.
   */
  /*
   * DIE HOEHE WANDERT, STATT ZU SPRINGEN.
   *
   * Der Versuch, das allein mit CSS zu loesen, ist gescheitert, und der Grund
   * ist lehrreich: `transition: height` braucht einen Startwert, den es bei
   * einer Hoehe aus dem Inhalt nicht gibt. Auch mit `height: auto` und
   * `interpolate-size` sprang sie - nachgemessen von 308 auf 794 px, und
   * vierzehn Bilder hintereinander zeigten bereits den Endwert. Der Grund ist
   * der harte Austausch: der ganze Rahmen wird ersetzt, und der Browser sieht
   * keinen Zwischenzustand.
   *
   * Also von Hand, in der ueblichen Folge: alte Hoehe festhalten, tauschen,
   * neue Hoehe messen, dann von der einen zur anderen laufen lassen und am
   * Ende wieder freigeben. Die Freigabe ist wichtig - bliebe eine feste Hoehe
   * stehen, wuerde der naechste Inhalt abgeschnitten.
   */
  const hoeheWandern = (tauschen) => {
    const k = d.node.querySelector('.dialog');
    if (!k || typeof k.animate !== 'function') { tauschen(); return; }
    const von = k.getBoundingClientRect().height;
    tauschen();
    const bis = k.getBoundingClientRect().height;
    if (Math.abs(bis - von) < 1) return;
    // Die Dauer folgt der Vorgabe der Anwendung; ausgelesen statt geraten,
    // damit «Bewegung reduzieren» auch hier gilt.
    const stil = getComputedStyle(document.documentElement);
    const ms = (parseFloat(stil.getPropertyValue('--t-ruhig')) || 0.3) * 1000;
    k.animate([{ height: `${von}px` }, { height: `${bis}px` }],
              { duration: ms, easing: 'cubic-bezier(.22, 1, .3, 1)' });
  };

  const neu = () => {
    const vorher = document.activeElement;
    const merk = vorher && vorher.dataset && vorher.dataset.feld
      ? { feld: vorher.dataset.feld, text: vorher.value,
          von: vorher.selectionStart, bis: vorher.selectionEnd }
      : null;
    ui.el('opt-rahmen').innerHTML = koerper();
    verdrahte();
    if (!merk) return;
    const wieder = ui.el('opt-rahmen')
      .querySelector(`[data-feld="${merk.feld}"]`);
    if (!wieder) return;
    /*
     * DER GETIPPTE TEXT UEBERLEBT AUCH.
     *
     * Der Fokus allein genuegte nicht. Das neu gebaute Feld traegt den
     * GEPARSTEN Wert aus `werte`, nicht den getippten Text - und wer «1.25»
     * eingibt, tippt zwischendurch «1.», was als Zahl 1 ist. Das Feld sprang
     * auf «1» zurueck, die naechste Ziffer machte «12» daraus, und am Ende
     * stand «25». Genau die Beobachtung des Auftraggebers: es gehen nur
     * einzelne Ziffern.
     *
     * Solange der Zeiger im Feld steht, gilt deshalb der getippte Text.
     */
    if (merk.text !== undefined && wieder.value !== merk.text) {
      wieder.value = merk.text;
    }
    wieder.focus();
    // Nur Textfelder kennen eine Schreibmarke; ein Auswahlfeld wirft hier.
    try {
      if (merk.von !== null && merk.von !== undefined) {
        wieder.setSelectionRange(merk.von, merk.bis);
      }
    } catch { /* Feldart ohne Schreibmarke */ }
  };
  verdrahte();
  d.node.querySelector('[data-thema]').onclick = () => { d.zu(); app.themaWechseln(); };
  d.node.querySelector('[data-bauteildaten]').onclick = () => { d.zu(); app.dialogBauteildaten(); };
  d.node.querySelector('[data-tasten]').onclick = () => { d.zu(); app.dialogTasten(); };
  d.node.querySelector('[data-reset]').onclick = () => { d.zu(); app.zuruecksetzen(); };
}

// --- Lastfälle --------------------------------------------------------------
/**
 * Knöpfe der Lastfallmatrix.
 *
 * Die vorgegebenen Lastfälle folgen dem Normensatz. Wird ein Beiwert von Hand
 * geändert, merkt sich werte.lastfallAnpassung genau diese Abweichung - der
 * Rest des Lastfalls folgt weiterhin dem Normensatz, und «×» nimmt die
 * Anpassung wieder zurück. Eigene Lastfälle stehen vollständig in
 * werte.lastfaelleEigen.
 */
/** Knöpfe in den mitgeführten Ergebnisstücken der Eingabemaske. */
export function verdrahteExtras(app) {
  ui.el('maske').querySelectorAll('[data-qsk]').forEach((b) => {
    b.onclick = () => dialogKlassen(app);
  });
  verdrahteLastfaelle(app);
}

function verdrahteLastfaelle(app) {
  const n = ui.el('maske');
  n.querySelectorAll('[data-lf]').forEach((b) => {
    b.onclick = () => dialogLastfall(app, b.dataset.lf);
  });
  n.querySelectorAll('[data-lf-neu]').forEach((b) => {
    b.onclick = () => dialogLastfall(app, null);
  });
  n.querySelectorAll('[data-lf-weg]').forEach((b) => {
    b.onclick = () => entferneLastfall(app, b.dataset.lfWeg);
  });
}

function entferneLastfall(app, key) {
  const lf = lastfaelle(app.werte).find((l) => l.key === key);
  if (!lf) return;
  if (lf.eigen) {
    if (!confirm(`Lastfall «${lf.bez}» entfernen?`)) return;
    app.werte = { ...app.werte,
              lastfaelleEigen: (app.werte.lastfaelleEigen ?? []).filter((_, i) => i !== lf.index) };
  } else {
    const anp = { ...(app.werte.lastfallAnpassung ?? {}) };
    delete anp[key];
    app.werte = { ...app.werte, lastfallAnpassung: anp };
  }
  if (app.anzeigeKombi === key) app.anzeigeKombi = 'umhuellend';
  app.neuRechnen();
}

/** Beiwerte eines Lastfalls anpassen, oder einen neuen anlegen (key = null). */
function dialogLastfall(app, key) {
  if (!app.letzte) return;
  const ein = app.letzte.kombi.einwirkungen;
  const alle = lastfaelle(app.werte);
  const lf = key ? alle.find((l) => l.key === key) : {
    bez: `Eigener Lastfall ${(app.werte.lastfaelleEigen ?? []).length + 1}`,
    eigen: true, nachweis: true,
    beiwerte: { G: app.werte.gammaG, WindX: 0, WindY: app.werte.gammaQ, Schnee: 0 },
  };
  if (!lf) return;

  const d = app.dialog(key ? `Lastfall: ${lf.bez}` : 'Neuer Lastfall',
    ui.lastfallFormular(lf, ein),
    (key && !lf.eigen ? '<button class="btn" data-std>Auf Normensatz zurück</button>' : '') +
    '<button class="btn btn-acc" data-ok>Übernehmen</button>');

  d.node.querySelector('[data-ok]').onclick = () => {
    const beiwerte = {};
    ein.forEach((e) => {
      const v = parseFloat(ui.el(`lf-${e.key}`).value);
      beiwerte[e.key] = Number.isFinite(v) ? v : 0;
    });
    const bez = ui.el('lf-bez').value.trim();
    const nachweis = ui.el('lf-nachweis').checked;
    if (!key || lf.eigen) {
      const liste = [...(app.werte.lastfaelleEigen ?? [])];
      const eintrag = { key: lf.key ?? `eigen-${Date.now().toString(36)}`,
                        bez: bez || lf.bez, beiwerte, nachweis };
      if (key && lf.index !== undefined) liste[lf.index] = eintrag;
      else liste.push(eintrag);
      app.werte = { ...app.werte, lastfaelleEigen: liste };
    } else {
      // Nur die Abweichung merken, nicht den ganzen Lastfall
      app.werte = { ...app.werte,
                lastfallAnpassung: { ...(app.werte.lastfallAnpassung ?? {}), [key]: beiwerte } };
    }
    d.zu();
    app.neuRechnen();
  };
  const std = d.node.querySelector('[data-std]');
  if (std) std.onclick = () => { d.zu(); entferneLastfall(app, key); };
}
