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
import { hatTraeger, passeTraegerAn } from './core.anbauteile.js';
import { blattNachLokal, fangeAufMasskette, lokalNachBlatt, tragwerkBeiX, tragwerkeVon } from './core.constants.js';
import { getVorlage, neuesAnbauteil, vorlagen } from './data.anbauteile.js';
import { getFlBauteil } from './data.fl.js';
import { esc } from './design.js';
import * as ui from './ui.js';

export function setzenStarten(app, vorwahl = null) {
  if (app.kalibrierung) kalibrierenEnde(app);
  if (app.ausrichtung) ausrichtenEnde(app, false);
  app.setzen = { stelle: null, vorwahl };
  app.ansicht.beiStelle = (w) => stelleGewaehlt(app, w);
  ui.el('canvas3d').style.cursor = 'crosshair';
  // Der Knopf sagt jetzt «Abbrechen» - er muss deshalb mitgezeichnet werden.
  baueModellWerkzeuge(app);
  app.zeichneBalken();
}

export function setzenEnde(app) {
  app.setzen = null;
  app.ansicht.beiStelle = null;
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
  if (xl >= -0.3 && xl <= L + 0.3 && Math.abs(zl) <= h / 2 + 0.6) {
    const xb = fangeAufMasskette(
      lokalNachBlatt(t, Math.max(0, Math.min(L, xl))), m.masskette ?? []);
    const x = Math.max(0, Math.min(L, blattNachLokal(t, xb)));
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
  if (H > 0 && (nahA || nahB) && zl < oben - H - (h / 2) + 1e-9) {
    // AUF DEN SCHRITT DES REGLERS GERUNDET (5 cm). Sonst zeigt die Karte
    // eine andere Zahl an, als der Klick gesetzt hat - der Regler rastet
    // auf seinen Schritt, und der Anwender sieht 5.20, wo 5.15 steht.
    const hM = Math.max(0, Math.min(oben, zl + H));
    return { ort: nahA ? 'mastA' : 'mastB', hMast: Math.round(hM * 20) / 20 };
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
    app.setzen = { stelle: null, vorwahl: null,
               hinweis: `«${roh.name}» hängt an einem Träger, am Masten gibt`
                        + ' es keinen. Ans Joch damit, oder abbrechen.' };
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
        const an = passeTraegerAn(gesetzt.x, gesetzt.raster, app.letzte?.erg?.modell);
        return { ...gesetzt, x: an.x, raster: an.raster };
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
  app.setzeAnbauteile([...(app.werte.anbauteile ?? []), t]);
  if (st.ort === 'joch') {
    // Im Blatt, nicht im Tragwerk - siehe `blattVersatz`.
    app.ansicht.zoomAuf(app.blattVersatz() + t.x, null, Math.max(2, app.werte.L / 8));
  }
  else app.ansicht.zeigeAnbauteil((app.werte.anbauteile ?? []).length - 1);
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

/** Name der Vorwahl - fuer den Balken beim Ziehen. */
export function vorwahlName(app, vw) {
  if (!vw) return null;
  if (vw.art === 'kopie') {
    return (app.werte.anbauteile ?? []).find((a) => a.id === vw.id)?.name ?? null;
  }
  try { return getVorlage(vw.id)?.name ?? null; } catch { return null; }
}

/** Das gewaehlte Bauteil an die gemerkte Stelle setzen. */
export function setzeVorlageAnStelle(app, vorlageId) {
  setzeBaugruppeAnStelle(app, neuesAnbauteil(vorlageId, 0));
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
  setzeBaugruppeAnStelle(app, kopie);
}

/** Die Vorwahl - Vorlage oder Kopie - an die gemerkte Stelle setzen. */
export function setzeVorwahlAnStelle(app) {
  const v = app.setzen?.vorwahl;
  if (!v) return;
  if (v.art === 'kopie') setzeKopieAnStelle(app, v.id);
  else setzeVorlageAnStelle(app, v.id);
}
