/**
 * app.setzen.js
 * ---------------------------------------------------------------------------
 * BAUTEIL SETZEN: Stelle waehlen, Vorlagen und Kopien anbieten, Baugruppe ablegen.
 *
 * Seit dem 19. September ein eigenes Modul (Durchsicht vom 18. September,
 * Punkt A1: app.js teilen). Der Zustand «setzen» bleibt in app.js (Balken,
 * Kontextmenue und Werkzeugleiste lesen ihn) und kommt ueber das
 * Kontextobjekt app. Es importiert app.js nicht zurueck.
 * ---------------------------------------------------------------------------
 */
import { baueModellWerkzeuge } from './app.layout.js';
import { ausrichtenEnde, kalibrierenEnde } from './app.zeichnung.js';
import { hatTraeger, passeTraegerAn, rasterGesetzt, rasterNormVon } from './core.anbauteile.js';
import { blattNachLokal, fangeAufMasskette, lokalNachBlatt, tragwerkBeiX, tragwerkeVon, tragwerksart } from './core.constants.js';
import { abfangVorgabeFuer } from './core.lasten.js';
import { getVorlage, havarieKopieren, istSignalVorlage, leiterKennung, mitSignalAuswahl, neuesAnbauteil, signalVorlage, vorlageAbfangung, vorlagen, vorlagePasstAn } from './data.anbauteile.js';
import { getFlBauteil } from './data.fl.js';
import { esc } from './design.js';
import * as ui from './ui.js';
import { vorlageSymbol, vorlageSuchtext, suchtextPasst } from './ui.anbausymbol.js';

export function setzenStarten(app, vorwahl = null) {
  if (app.kalibrierung) kalibrierenEnde(app);
  if (app.ausrichtung) ausrichtenEnde(app, false);
  app.setzen = { stelle: null, vorwahl };
  app.ansicht.beiStelle = (w) => stelleGewaehlt(app, w);
  ui.el('canvas3d').style.cursor = 'crosshair';
  /*
   * Wo geklickt wurde - dort öffnet die Auswahl (3. Oktober). Der Klick
   * selbst kommt als Weltpunkt; die Stelle im Bild merkt sich der Zeiger.
   */
  const cv = ui.el('canvas3d');
  if (cv && !app._setzZeiger) {
    app._setzZeiger = (e) => {
      const r = ui.el('viewer')?.getBoundingClientRect();
      if (r) app.setzenPunkt = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    cv.addEventListener('pointerdown', app._setzZeiger);
  }
  // Der Knopf sagt jetzt «Abbrechen» - er muss deshalb mitgezeichnet werden.
  baueModellWerkzeuge(app);
  app.zeichneBalken();
}

export function setzenEnde(app) {
  app.setzen = null;
  app.ansicht.beiStelle = null;
  if (app._setzZeiger) {
    ui.el('canvas3d')?.removeEventListener('pointerdown', app._setzZeiger);
    app._setzZeiger = null;
  }
  setzWahlWeg();
  ui.el('canvas3d')?.style.removeProperty('cursor');
  baueModellWerkzeuge(app);
  app.zeichneBalken();
}

/**
 * WO IM TRAGWERK LIEGT DIESER PUNKT?
 *
 * Entschieden wird an der Stelle, an der ein Bauteil ANGESCHLOSSEN wird -
 * darauf zielt man. Am Joch ist das die Jochachse ueber ihre ganze Laenge, am
 * Masten die Mastachse unterhalb des Jochs.
 *
 * Die Fangbereiche sind bewusst grosszuegig: ein halber Meter neben der
 * Jochachse ist immer noch eindeutig gemeint, und wer daneben klickt, bekommt
 * eine Meldung statt eines Bauteils an falscher Stelle.
 */
export function stelleAus(app, w) {
  const m = app.letzte?.erg?.modell;
  if (!m || !w) return null;
  const L = m.L, h = m.h ?? 0.4;
  /*
   * >>> ERST INS TRAGWERK RECHNEN, DANN VERGLEICHEN. <<<
   *
   * `w.x` kommt aus der Ansicht und ist eine BLATTKOORDINATE - die Szene
   * zeigt jedes Tragwerk an seiner Lage. Die Bauteillage zaehlt dagegen ab
   * dem linken Ende des Tragwerks. Hier wurde beides gleichgesetzt, und bei
   * einer Jochreihe landete das Bauteil damit am falschen Joch (siehe
   * blattNachLokal in core.constants.js).
   *
   * DIE MASSKETTE FAENGT IM BLATT. Sie beschreibt die Zeichnung, gilt dem
   * ganzen Querprofil und wird auch dort gezeichnet; gefangen wird deshalb
   * in Blattkoordinaten, und erst das Ergebnis wandert ins Tragwerk.
   */
  const t = tragwerkeVon(app.werte)[0];
  const xl = blattNachLokal(t, w.x);
  /*
   * >>> AUCH DIE HOEHE GEHOERT UMGERECHNET. <<<
   *
   * Weisung vom 9. September: «anbauteile lassen sich nicht zuweisen ueber
   * den button im 3d fenster und auch nicht ueber drag and drop per kachel.»
   *
   * Sie liessen sich nicht setzen, seit die Blattszene jedes Tragwerk um
   * seine Anschlusshoehe ANHEBT (`hebungVon`): auf dem Blatt liegt die
   * Jochachse bei z = H, im Tragwerk bei z = 0. Gefangen wurde weiter um 0 -
   * also 7.50 m UNTER dem Joch, in Fusshoehe. Wer aufs Joch zeigte, bekam
   * «daneben»; getroffen haette nur, wer in die Luft darunter klickt.
   *
   * Fuer x stand die Umrechnung laengst da (`blattNachLokal`); fuer z
   * fehlte sie. Beides ist dieselbe Frage: wo im TRAGWERK liegt der Punkt,
   * auf den im BLATT gezeigt wurde.
   */
  const zl = w.z - app.hebungVon(t);
  /*
   * >>> AM EINZELMAST GIBT ES KEIN JOCH (19. September). <<<
   *
   * Weisung: «checke die eingabe der anbauteile am einzelmasten über all
   * die verschiedene möglichkeiten. insobesondere über den button im 3d
   * fenster.» Befund: seine Szene steht mit dem KOPF auf z = 0, und L ist
   * null - der Fangbereich des Jochs (|z| < 0.8 m um die «Jochachse»)
   * lag damit auf den obersten 80 cm des Masten. Genau dort sitzt die
   * Traverse (L - 0.5); ein Klick dorthin setzte ein Jochteil, und das
   * rechnet ein Einzelmast nicht - still weggefallen. Alle Wege ueber das
   * Bild laufen hier durch (Knopf, Kontextmenue, Kachel ziehen, Vorwahl).
   */
  const einzel = m.tragwerksart === 'einzelmast';
  if (!einzel && xl >= -0.3 && xl <= L + 0.3 && Math.abs(zl) <= h / 2 + 0.6) {
    const roh = lokalNachBlatt(t, Math.max(0, Math.min(L, xl)));
    const xb = fangeAufMasskette(roh, m.masskette ?? []);
    /*
     * >>> AUF 0.10 m GERUNDET (1. Oktober). <<<
     * «Beim Absetzen der Bauteile auf 0.10m den x oder z Wert runden.»
     * Ausser die Masskette der Zeichnung hat gefangen - deren Stelle ist
     * gemessen und bleibt, wie sie ist.
     */
    const gefangen = Math.abs(xb - roh) > 1e-9;
    const xr = blattNachLokal(t, xb);
    const x = Math.max(0, Math.min(L, gefangen ? xr : Math.round(xr * 10) / 10));
    return { ort: 'joch', x: Math.round(x * 1000) / 1000 };
  }
  // Am Masten nur, wenn einer im Modell steht - sonst gibt es dort nichts,
  // woran etwas haengen koennte.
  const mA = m.federn?.mastA ?? m.federn?.mast;
  const mB = m.federn?.mastB ?? m.federn?.mast;
  const nahA = Math.abs(xl) <= 0.8;
  const nahB = Math.abs(xl - L) <= 0.8;
  const md = nahA ? mA : mB;
  const H = md?.H ?? 0;
  /*
   * AUCH UEBER DEM JOCH. Ein langer Mast traegt oben Traversen mit
   * Zusatzleitern - genau die sollen sich ansetzen lassen. Die obere Grenze
   * ist deshalb nicht mehr die Jochachse, sondern der Mastkopf: H plus dem
   * angegebenen Ueberstand. Ohne Laengenangabe bleibt es bei H, denn dann
   * ragt der Mast nur den knappen halben Meter hinaus, und darauf sitzt
   * nichts.
   */
  const oben = H + (md?.ueberstand ?? 0);
  // Am Einzelmast ist H seine Laenge und z = 0 sein Kopf: gefangen wird
  // bis dorthin, mit 30 cm Spiel darueber - wer auf den Kopf zielt, meint ihn.
  const grenze = einzel ? 0.3 : oben - H - (h / 2);
  if (H > 0 && (nahA || nahB) && zl < grenze + 1e-9) {
    // AUF 0.10 m GERUNDET (1. Oktober: «Beim Absetzen der Bauteile auf
    // 0.10m den x oder z Wert runden»; vorher 5 cm, der Schritt des Reglers).
    const hM = Math.max(0, Math.min(oben, zl + H));
    return { ort: nahA ? 'mastA' : 'mastB',
             hMast: Math.min(Math.round(hM * 10) / 10, Math.floor(oben * 10) / 10) };
  }
  return null;
}

function stelleGewaehlt(app, w) {
  let st = stelleAus(app, w);
  /*
   * >>> WER AUF EIN ANDERES JOCH ZEIGT, MEINT DIESES JOCH. <<<
   *
   * Weisung vom 2. September: «Die eingabe der bauteile auf die tragwerke
   * funktioniert nicht ganz.»
   *
   * Auf dem Blatt stehen alle Tragwerke, und man zielt auf eines davon.
   * Gerechnet wird immer nur EINES - das angeklickte in der Liste -, und
   * ein Bauteil gehoert dem Tragwerk, an dem es haengt. Bisher hiess das:
   * erst in der Liste umschalten, dann setzen. Wer es vergass, bekam
   * «daneben», obwohl der Zeiger mitten auf einem Joch stand.
   *
   * Jetzt schaltet der Klick selbst um. Das ist derselbe Weg, den ein Klick
   * ausserhalb des Setzens schon geht (beiTragwerk) - und dieselbe Antwort
   * auf dieselbe Geste.
   *
   * NEU GERECHNET WIRD DABEI SOFORT: `stelleAus` liest das gerechnete
   * Modell (Laenge, Masthoehen), und das ist nach dem Wechsel ein anderes.
   */
  if (!st) {
    const ziel = tragwerkBeiX(app.werte, w.x);
    if (ziel && ziel.id !== (app.werte.twId ?? 'T1')) {
      app.aendern('tragwerkAktiv', ziel.id);
      st = stelleAus(app, w);
    }
  }
  if (!st) {
    // WO MAN GELANDET IST, statt nur «daneben». Wer zwei Meter neben dem
    // Joch klickt, sieht am Wert, in welche Richtung er zielen muss - und
    // ob überhaupt das Modell gemeint ist oder eine leere Stelle im Raum.
    // Die VORWAHL ueberlebt einen Fehlklick. Sie hier fallen zu lassen hiess:
    // wer neben das Joch klickt, faengt von vorn an - und bekommt beim
    // naechsten Treffer wieder das ganze Menue, obwohl er laengst gewaehlt hat.
    app.setzen = { ...app.setzen, stelle: null, daneben: w };
    app.zeichneBalken();
    return;
  }
  app.setzen = { ...app.setzen, stelle: st };
  // Ist das Bauteil schon gewaehlt, wird jetzt gesetzt statt gefragt.
  if (app.setzen.vorwahl) { setzeVorwahlAnStelle(app); return; }
  app.zeichneBalken();
}

/**
 * WAS AN DIESER STELLE SEIN KANN.
 *
 * Am Masten gibt es keinen TRAEGER - ein Traeger ist das, was auf dem Joch
 * sitzt oder daran haengt, und genau vier Bauteile tragen diese Rolle: die
 * drei Jochaufsaetze und die Haengestuetze (siehe P6). Die Regel steht in den
 * Daten; hier wird sie nur vorwaerts angewandt statt nur pruefend.
 *
 * SORTIERT NACH ROLLE. Was traegt, steht vorn - man baut von unten nach oben.
 * Innerhalb der Rolle bleibt die Reihenfolge der Datenbank; sie ist die des
 * Sortiments.
 */
export function vorlagenFuer(app, ort) {
  const rolleVon = (v) => {
    const ids = (v.module ?? []).map((x) => x.bauteil).filter(Boolean);
    for (const id of ids) {
      try { if (getFlBauteil(id).rolle === 'traeger') return 'traeger'; } catch { /* unbekannt */ }
    }
    for (const id of ids) {
      try { if (getFlBauteil(id).rolle === 'aufbau') return 'aufbau'; } catch { /* unbekannt */ }
    }
    return 'drahtwerk';
  };
  const rang = { traeger: 0, aufbau: 1, drahtwerk: 2 };
  return vorlagen()
    .map((v) => ({ v, rolle: rolleVon(v) }))
    .filter((e) => ort === 'joch' || e.rolle !== 'traeger')
    // Nach Ort getrennt (19. September): der Ausleger am Masten nicht ans Joch.
    .filter((e) => vorlagePasstAn(e.v, ort))
    .sort((a, b) => rang[a.rolle] - rang[b.rolle]);
}

/**
 * Eine fertige Baugruppe an die gemerkte Stelle setzen.
 *
 * Der Weg ist derselbe, ob das Teil aus einer Vorlage kommt oder als Kopie
 * einer schon eingegebenen Baugruppe: die STELLE bestimmt Ort, Lage und
 * Hoehe, und sie ueberschreibt, was die Quelle darueber mitbrachte. Sonst
 * traegt eine Kopie ihre alte Station in die neue Stelle hinein.
 */
function setzeBaugruppeAnStelle(app, roh) {
  const st = app.setzen?.stelle;
  if (!st || !roh) return;
  /*
   * DIE REGEL GILT AUCH BEIM ZIEHEN.
   *
   * Die Knopfspalten fragen sie vorher ab - was am Masten nichts zu suchen
   * hat, steht dort gar nicht erst. Beim Ablegen gibt es aber keine Spalte:
   * dort kommt eine Baugruppe herein, und die Stelle steht erst danach fest.
   * Ohne diese Sperre landete eine Haengestuette am Masten, wo es keine
   * geben kann - lautlos, denn gezeichnet wird sie ja.
   */
  if (st.ort !== 'joch' && traegerDrin(app, roh)) {
    // Am Einzelmast gibt es kein Joch - der Rat «ans Joch damit» fuehrte
    // ins Leere (Befund vom 19. September).
    const ohneJoch = tragwerksart(app.werte).traeger !== true;
    app.setzen = { stelle: null, vorwahl: null,
               hinweis: `«${roh.name}» hängt an einem Träger, am Masten gibt`
                        + (ohneJoch
                          ? ' es keinen, und dieses Tragwerk hat kein Joch. Ein Teil ohne Träger wählen, oder abbrechen.'
                          : ' es keinen. Ans Joch damit, oder abbrechen.') };
    app.zeichneBalken();
    return;
  }
  /*
   * DIE VORLAGE GEHOERT AN IHREN ORT (19. September): ein Ausleger am Masten
   * nicht ans Joch, eine Joch-Vorlage nicht an den Masten. Die Knopfspalten
   * bieten ohnehin nur Passendes an; beim Ziehen und bei der Vorwahl steht
   * die Stelle erst danach fest.
   */
  const vorl = (() => { try { return roh.vorlage ? getVorlage(roh.vorlage) : null; } catch { return null; } })();
  if (vorl && !vorlagePasstAn(vorl, st.ort)) {
    const keinJoch = tragwerksart(app.werte).traeger !== true;
    app.setzen = { stelle: null, vorwahl: null,
               hinweis: st.ort !== 'joch' && keinJoch
                 ? `«${roh.name}» ist eine Vorlage fürs Joch, und dieses Tragwerk hat keines.`
                   + ' Eine Vorlage für den Masten wählen, oder abbrechen.'
                 : `«${roh.name}» gehört ${st.ort === 'joch' ? 'an einen Masten' : 'ans Joch'}`
                   + ' — dort setzen, oder abbrechen.' };
    app.zeichneBalken();
    return;
  }
  const gesetzt = st.ort === 'joch'
    ? { ...roh, ort: 'joch', x: st.x, hMast: 0 }
    : { ...roh, ort: st.ort, x: 0, hMast: st.hMast };
  // Erst jetzt ist das Raster der Vorlage bekannt - und damit, wo die
  // beiden Klemmen sitzen. Ein Traeger weicht den Blechen aus.
  const t = st.ort === 'joch'
        && hatTraeger(gesetzt.module, (id) => getFlBauteil(id).rolle)
    ? (() => {
        // Vom Normalmass aus - eine kopierte Baugruppe bringt sonst ihr
        // schon geweitetes Raster mit, und es wuechse bei jedem Setzen.
        const an = passeTraegerAn(gesetzt.x, rasterNormVon(gesetzt), app.letzte?.erg?.modell);
        return { ...rasterGesetzt(gesetzt, an), x: an.x };
      })()
    : gesetzt;
  setzenEnde(app);
  app.tabEingabe = 'anbau';
  /*
   * DIE KARTE GEHT AUF (Weisung: das Absetzen war fummelig).
   *
   * Quer ueber ein perspektivisches Bild trifft man keine Station auf den
   * Zentimeter - und muss es auch nicht, wenn die Zahl gleich danach im
   * Feld steht. Der Klick setzt grob, die Karte stellt genau.
   */
  (app.werte.anbauteile ?? []).forEach((x) => ui.setzeKlapp(`at-${x.id}`, false));
  ui.setzeKlapp(`at-${t.id}`, true);
  /*
   * >>> DIE VORLAGE BRINGT IHRE ABFANGART MIT (3. Oktober). <<<
   * «was noch fehlt bei den anbauteilen sind die tragseile / fahrdraht
   * einseitig abgefangen für das abfangjoch.» Die Art steht je Leiter am
   * Tragwerk (`havarie[leiterKennung]`); eine Vorlage «… abgefangen» setzt
   * sie beim Absetzen - auch an einem Tragjoch, wo die Vorgabe sonst
   * «durchgehend» wäre. Wo sie der Vorgabe gleicht, bleibt der Eintrag
   * leer (wie in der Karte).
   */
  const artV = vorlageAbfangung(t);
  if (artV && artV !== abfangVorgabeFuer(tragwerksart(app.werte).key)) {
    const hav = { ...(app.werte.havarie ?? {}) };
    (t.module ?? []).forEach((m, i) => {
      let b; try { b = getFlBauteil(m.bauteil); } catch { return; }
      if (b.rolle !== 'drahtwerk') return;
      const k = leiterKennung(t, m, i);
      if (hav[k]?.art) return;                       // eine Kopie bringt ihre Wahl mit
      hav[k] = { ...(hav[k] ?? {}), art: artV, name: hav[k]?.name ?? `${t.name} · ${b.name}` };
    });
    app.werte.havarie = hav;
  }
  app.setzeAnbauteile([...(app.werte.anbauteile ?? []), t]);
  /*
   * >>> DIE SEITENLEISTE FÄHRT AUF DIE EINGABE (1. Oktober). <<<
   * «beim absetzen eines bauteils im 3d auf die eingabe in der sidebar
   * fahren.» Derselbe Weg wie ein Klick auf das Teil im Bild: Karte auf,
   * Leiste ausgeklappt und dorthin gerollt, das Teil herangeholt.
   */
  const i = (app.werte.anbauteile ?? []).findIndex((x) => x.id === t.id);
  if (i >= 0) app.zeigeAnbauteil(i);
}

/**
 * WAS SCHON IM MODELL STEHT - als Knopfspalte neben den Vorlagen.
 *
 * ZUSAMMENGEFASST, NICHT AUFGEZAEHLT. Auf einem langen Joch stehen zwanzig
 * Baugruppen, und fuenfzehn davon sind dasselbe Teil an anderer Stelle.
 * Zwanzig Knoepfe waeren keine Auswahl mehr, sondern eine zweite Liste.
 * Gleich ist, was in Name, Vorlage, Modulen und Lasten uebereinstimmt - die
 * Stelle zaehlt ausdruecklich nicht dazu, denn sie ist ja das, was neu
 * gewaehlt wird.
 */
/**
 * TRAEGT DIESE BAUGRUPPE EINEN TRAEGER?
 *
 * Ein Traeger ist das, was auf dem Joch sitzt oder daran haengt - die drei
 * Jochaufsaetze und die Haengestuetze. Am Masten gibt es ihn nicht. Die
 * Regel steht in den Daten (Rolle `traeger`), hier wird sie nur gelesen.
 */
function traegerDrin(app, a) {
  try { return hatTraeger(a?.module, (id) => getFlBauteil(id).rolle); }
  catch { return false; }
}

function kopierbare(app, ort) {
  const raus = new Map();
  (app.werte.anbauteile ?? []).forEach((a) => {
    // Dieselbe Regel wie bei den Vorlagen: am Masten gibt es keinen Traeger.
    if (ort !== 'joch' && traegerDrin(app, a)) return;
    const kennung = JSON.stringify([a.name, a.vorlage ?? '', a.raster ?? null,
                                    a.befestigung ?? null, a.module ?? [],
                                    a.lasten ?? []]);
    if (!raus.has(kennung)) raus.set(kennung, { a, anzahl: 0 });
    raus.get(kennung).anzahl += 1;
  });
  return [...raus.values()];
}

/** Die Spalte dazu, oder '' wenn noch nichts dasteht. */
export function kopierbareHtml(app, ort) {
  const liste = kopierbare(app, ort);
  if (!liste.length) return '';
  return `<div class="wahl-spalte">
      <div class="wahl-t">Schon im Modell</div>
      ${liste.map(({ a, anzahl }) => `<button class="btn btn-mini"
         data-setz-kopie="${esc(a.id)}"
         title="Kopie von «${esc(a.name)}» — mit allen Zahlen, die daran von
Hand geändert wurden. Steht ${anzahl}× im Modell."
         >${esc(a.name)}${anzahl > 1 ? ` <small>${anzahl}×</small>` : ''}</button>`).join('')}
    </div>`;
}

/* ===========================================================================
 * >>> SIGNAL: ERST WÄHLEN, DANN SETZEN (4. Oktober). <<<
 * ===========================================================================
 *
 * Gemeldet: «ich finde den signalbauer nicht.» Die Vorlage «Signal
 * (Signalbauer)» setzte ein LEERES Signal (G 0, keine Fläche); den
 * Signalbauer fand man danach nur in der Modulzeile der Karte. Jetzt öffnet
 * er sich, bevor gesetzt wird - über den Knopf «Signal zusammenstellen»
 * (zuerst die Signale, dann die Stelle) und über die Vorlage selbst (zuerst
 * die Stelle, dann die Signale). Ohne Auswahl wird nichts gesetzt.
 * =========================================================================== */
export function signalZusammenstellen(app) {
  const v = signalVorlage();
  if (!v || typeof app.signalbauer !== 'function') return;
  app.signalbauer([], (auswahl) => {
    if (!auswahl?.length) return;
    setzenStarten(app, { art: 'signal', id: v.id, signal: auswahl });
    app.meldeImBalken?.('Signal gewählt - jetzt ins Modell klicken, wo es hin soll (Joch oder Mast); Esc bricht ab.');
  });
}

/** Ist diese Vorlage eine, die der Signalbauer füllt? */
function signalVorlageId(id) {
  try { return istSignalVorlage(getVorlage(id)); } catch { return false; }
}

/** Name der Vorwahl - fuer den Balken beim Ziehen. */
export function vorwahlName(app, vw) {
  if (!vw) return null;
  if (vw.art === 'signal') {
    return `Signal (${vw.signal.reduce((s, x) => s + (x.anzahl || 0), 0)} Teile)`;
  }
  if (vw.art === 'kopie') {
    return (app.werte.anbauteile ?? []).find((a) => a.id === vw.id)?.name ?? null;
  }
  try { return getVorlage(vw.id)?.name ?? null; } catch { return null; }
}

/** Das gewaehlte Bauteil an die gemerkte Stelle setzen. */
export function setzeVorlageAnStelle(app, vorlageId) {
  zuletztMerken(vorlageId);
  // Ein Signal ohne Auswahl wöge nichts - erst der Signalbauer (4. Oktober).
  // Die Stelle bleibt gemerkt, solange der Dialog offen ist.
  if (signalVorlageId(vorlageId) && typeof app.signalbauer === 'function') {
    setzWahlWeg();
    app.signalbauer([], (auswahl) => {
      if (!auswahl?.length) return;
      setzeBaugruppeAnStelle(app, mitSignalAuswahl(neuesAnbauteil(vorlageId, 0), auswahl));
    });
    return;
  }
  setzeBaugruppeAnStelle(app, neuesAnbauteil(vorlageId, 0));
}

/* ===========================================================================
 * >>> DIE AUSWAHL AN DER STELLE (3. Oktober). <<<
 * ===========================================================================
 *
 * Rückfrage zu den Anbauteilen, im Wortlaut: «die auswahl nur verwenden wenn
 * bauteil setzen aktiv ist, sonst könnte es zu klicky werden, da wir schon
 * ein kontextmenue haben im üblichen 3d. da kann man dann auch zuletzt
 * verwendet aufführen.» Bisher standen die Vorlagen beim Setzen als
 * Textknöpfe in drei Spalten im Balken oben - weit weg von der Stelle, auf
 * die man eben geklickt hat. Jetzt öffnet dort ein kleines Fenster: oben
 * die Suche (sofort im Fokus, Enter setzt den ersten Treffer), dann
 * «zuletzt verwendet», die Vorlagen als Symbolkacheln nach Rolle (Träger,
 * Aufbau, Drahtwerk - die Bau-Reihenfolge), darunter was schon im Modell
 * steht. Es gibt nur, was an dieser Stelle möglich ist (`vorlagenFuer`).
 *
 * «Zuletzt verwendet» ist Ansichtssache dieses Browsers (localStorage);
 * fehlt der Speicher, fehlt die Zeile.
 */
const ZULETZT = 'tragjoch-zuletzt-vorlagen';

function zuletztLesen() {
  try { return JSON.parse(localStorage.getItem(ZULETZT) ?? '[]').filter((x) => typeof x === 'string'); }
  catch { return []; }
}

function zuletztMerken(id) {
  if (!id || id === 'frei') return;
  try {
    localStorage.setItem(ZULETZT, JSON.stringify([id, ...zuletztLesen().filter((x) => x !== id)].slice(0, 8)));
  } catch { /* ohne Speicher keine Zeile */ }
}

/** Die zuletzt gesetzten Vorlagen, die an diesen Ort passen (höchstens 5). */
export function zuletztFuer(app, ort) {
  const passend = new Map(vorlagenFuer(app, ort).map((e) => [e.v.id, e.v]));
  return zuletztLesen().map((id) => passend.get(id)).filter(Boolean).slice(0, 5);
}

const ROLLENTITEL = { traeger: 'Träger', aufbau: 'Aufbau', drahtwerk: 'Drahtwerk' };

function wahlKachel(v) {
  return `<button type="button" class="kachel at-kachel" data-setz-vorlage="${esc(v.id)}"
      data-suche="${esc(vorlageSuchtext(v))}"
      title="${esc(`${v.name}${v.beschreibung ? ` - ${v.beschreibung}` : ''}`)}">
      ${vorlageSymbol(v)}<span class="kachel-name">${esc(v.name)}</span></button>`;
}

/** Inhalt des Fensters an der Stelle. */
export function setzWahlHtml(app, st, wo) {
  const zul = zuletztFuer(app, st.ort);
  const nachRolle = new Map();
  vorlagenFuer(app, st.ort).forEach(({ v, rolle }) => {
    if (v.id === 'frei') return;
    if (!nachRolle.has(rolle)) nachRolle.set(rolle, []);
    nachRolle.get(rolle).push(v);
  });
  const gruppe = (titel, vs, cls = '') => `<div class="sw-gruppe${cls}">
      <div class="sw-t">${esc(titel)}</div>
      <div class="kacheln">${vs.map(wahlKachel).join('')}</div></div>`;
  return `<div class="sw-kopf"><span>Was kommt ${wo}?</span>
      <button class="btn btn-mini" data-setz-neu type="button">andere Stelle</button>
      <button class="btn btn-mini" data-setz-ab type="button">Abbrechen</button></div>
    <input type="search" class="vl-suche sw-suche" placeholder="Suchen … Enter setzt den ersten"
      aria-label="Vorlagen an dieser Stelle durchsuchen">
    <div class="sw-liste">
      ${zul.length ? gruppe('Zuletzt verwendet', zul, ' sw-zuletzt') : ''}
      ${[...nachRolle.entries()].map(([r, vs]) => gruppe(ROLLENTITEL[r] ?? r, vs)).join('')}
      ${kopierbareHtml(app, st.ort)}
      <p class="notiz sw-keine" hidden>Keine Vorlage passt.</p>
      <button class="btn btn-mini" data-setz-frei type="button"
        title="Freies Bauteil - Typ, Länge und Lasten selbst eintragen">Freies Bauteil …</button>
    </div>`;
}

export function setzWahlWeg() {
  document.getElementById('setz-wahl')?.remove();
}

/**
 * Das Fenster zeigen (oder stehen lassen, wenn es für dieselbe Stelle schon
 * offen ist - der Balken wird oft neu gezeichnet, Suche und Fokus bleiben).
 */
export function setzWahlZeigen(app, st, wo, { neu, ab }) {
  const kenn = `${st.ort}|${st.x ?? ''}|${st.hMast ?? ''}`;
  let el = document.getElementById('setz-wahl');
  if (el && el.dataset.kenn === kenn) return;
  setzWahlWeg();
  const viewer = ui.el('viewer');
  if (!viewer) return;
  el = document.createElement('div');
  el.id = 'setz-wahl';
  el.className = 'setz-wahl';
  el.dataset.kenn = kenn;
  el.innerHTML = setzWahlHtml(app, st, wo);
  viewer.appendChild(el);
  // An die Stelle, im Bild gehalten.
  const r = viewer.getBoundingClientRect();
  const p = app.setzenPunkt ?? { x: r.width / 2, y: r.height / 3 };
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = `${Math.max(8, Math.min(p.x + 14, r.width - w - 8))}px`;
  el.style.top = `${Math.max(8, Math.min(p.y - 20, r.height - h - 8))}px`;

  el.querySelectorAll('[data-setz-vorlage]').forEach((b) => {
    b.onclick = () => setzeVorlageAnStelle(app, b.dataset.setzVorlage);
  });
  el.querySelectorAll('[data-setz-kopie]').forEach((b) => {
    b.onclick = () => setzeKopieAnStelle(app, b.dataset.setzKopie);
  });
  el.querySelector('[data-setz-frei]').onclick = () => setzeVorlageAnStelle(app, 'frei');
  el.querySelector('[data-setz-neu]').onclick = () => { setzWahlWeg(); neu(); };
  el.querySelector('[data-setz-ab]').onclick = () => ab();
  const such = el.querySelector('.sw-suche');
  const filtern = () => {
    let n = 0;
    el.querySelectorAll('.sw-gruppe').forEach((g) => {
      let k = 0;
      g.querySelectorAll('[data-suche]').forEach((b) => {
        const an = suchtextPasst(b.dataset.suche, such.value);
        b.hidden = !an;
        if (an) k += 1;
      });
      g.hidden = k === 0;
      // «Zuletzt» doppelt die Gruppen - gezählt wird ohne sie.
      if (!g.classList.contains('sw-zuletzt')) n += k;
    });
    // Bei einer Suche stehen die bestehenden Teile nicht im Weg.
    el.querySelectorAll('.wahl-spalte').forEach((s) => { s.hidden = Boolean(such.value.trim()); });
    el.querySelector('.sw-keine').hidden = n > 0;
  };
  such.addEventListener('input', filtern);
  such.addEventListener('keydown', (e) => {
    // Esc beendet das Setzen wie überall (`tastendruck` in app.js).
    if (e.key !== 'Enter') return;
    const erste = [...el.querySelectorAll('.sw-gruppe:not([hidden]) [data-setz-vorlage]:not([hidden])')][0];
    erste?.click();
  });
  // Sofort tippen können, ohne erst ins Feld zu klicken.
  such.focus({ preventScroll: true });
}

/**
 * EINE SCHON EINGEGEBENE BAUGRUPPE NOCHMALS SETZEN (Weisung).
 *
 * Der zweite Rueckleiter am anderen Mastende ist derselbe wie der erste -
 * mit denselben Modulen, denselben Lasten, demselben Namen. Ihn ueber die
 * Vorlage neu aufzubauen hiesse, jede von Hand geaenderte Zahl noch einmal
 * einzugeben. Kopiert wird deshalb die BAUGRUPPE, nicht ihre Vorlage; nur
 * die Kennung ist neu, damit beide nebeneinander bestehen koennen.
 */
export function setzeKopieAnStelle(app, id) {
  const quelle = (app.werte.anbauteile ?? []).find((a) => a.id === id);
  if (!quelle) return;
  const kopie = JSON.parse(JSON.stringify(quelle));
  kopie.id = `AT-${Math.random().toString(36).slice(2, 8)}`;
  kopie.aktiv = true;
  // Abfangart und Zugrichtung der Leiter gehen mit (siehe `havarieKopieren`).
  app.werte.havarie = havarieKopieren(app.werte.havarie, quelle, kopie);
  setzeBaugruppeAnStelle(app, kopie);
}

/** Die Vorwahl - Vorlage oder Kopie - an die gemerkte Stelle setzen. */
export function setzeVorwahlAnStelle(app) {
  const v = app.setzen?.vorwahl;
  if (!v) return;
  if (v.art === 'kopie') setzeKopieAnStelle(app, v.id);
  else if (v.art === 'signal') {
    zuletztMerken(v.id);
    setzeBaugruppeAnStelle(app, mitSignalAuswahl(neuesAnbauteil(v.id, 0), v.signal));
  } else setzeVorlageAnStelle(app, v.id);
}
