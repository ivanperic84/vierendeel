/**
 * app.zeichnung.js
 * ---------------------------------------------------------------------------
 * DIE HINTERLEGTE ZEICHNUNG: Einlegen, Sichern, Einmessen, Schieben, Ausrichten.
 *
 * Seit dem 19. September ein eigenes Modul (Durchsicht vom 18. September,
 * Punkt A1: app.js teilen). Die Zustaende (kalibrierung, erkannt,
 * zeichnungMenue, bildSchieben, ausrichtung) bleiben in app.js - der
 * Balken und die Werkzeugleiste lesen sie auch - und kommen ueber das
 * Kontextobjekt app. Es importiert app.js nicht zurueck.
 * ---------------------------------------------------------------------------
 */
import { erkenneTragwerk } from './bild.erkennung.js';
import { ausrichtPunkte, ausrichten, bezuegeFuer, bildNachWelt, erkennungsWelt, kalibriere, kalibriereFrei, verkleinere, vorlaeufigeLage } from './bild.zeichnung.js';
import * as store from './store.js';
import * as ui from './ui.js';

export async function zeichnungEinlegen(app, blob, name = 'Zeichnung') {
  try {
    const roh = await verkleinere(blob);
    const bild = await createImageBitmap(new Blob([roh.daten], { type: roh.art }));
    const alt = app.ansicht.zeichnung?.kalibrierung ?? null;
    app.ansicht.zeichnung = {
      bild, breite: roh.breite, hoehe: roh.hoehe, daten: roh.daten,
      art: roh.art, name,
      // Eine bestehende Kalibrierung bleibt nur stehen, wenn das neue Bild
      // dieselbe Grösse hat - sonst sässe sie auf einem anderen Ausschnitt.
      kalibrierung: alt && app.ansicht.zeichnung
        && app.ansicht.zeichnung.breite === roh.breite ? alt
        : vorlaeufigeLage(app.ansicht.szene?.grenzen, roh.breite, roh.hoehe),
      vorlaeufig: true,
    };
    app.ansicht.ebenen.zeichnung = true;
    // Die Zeichnung gilt nur in der Laengsansicht - also gleich dorthin.
    app.ansicht.blickrichtung('laengs');
    app.zeichneModellWerkzeuge();
    app.ansicht.zeichne();
    /*
     * SELBST EINMESSEN, WENN DAS TRAGWERK ZU ERKENNEN IST.
     *
     * Die Masten sind die längsten Senkrechten des Blattes, das Joch liegt
     * auf ihnen - daraus ergeben sich genau die beiden Punkte, die das
     * Einmessen braucht.
     *
     * >>> VORGELEGT, NICHT ÜBERNOMMEN. <<< Der Balken sagt, dass gerechnet
     * und nicht gemessen wurde, und die zwei Klicks stehen einen Knopfdruck
     * entfernt. Eine Vermutung, die sich als Messung ausgibt, wäre schlimmer
     * als gar keine.
     */
    app.erkannt = null;
    const t = roh.maske
      ? erkenneTragwerk(roh.maske, roh.breite, roh.hoehe) : null;
    /*
     * >>> AUCH DIE SELBSTERKENNUNG BRAUCHT EINEN BEZUG. <<<
     *
     * Sie nahm bisher immer das Joch. Hat das Modell keines - ein
     * Einzelmast -, gab `bezugPunkte('joch')` null, es wurde nichts
     * eingemessen, und der Ruecksprung auf das Einmessen von Hand lief in
     * dieselbe Wand: die Zeichnung blieb vorlaeufig liegen, ohne dass ein
     * Wort darueber fiel.
     *
     * Dieselbe Erkennung traegt beide Paare. WAAGRECHT sind es die beiden
     * Mastachsen auf der Jochachse, LOTRECHT Fundamentoberkante und
     * Jochachse am linken Masten. Genommen wird der erste Bezug, den das
     * Modell hergibt - das Joch, wo es eines gibt, sonst der Mast.
     */
    const moeglich = bezuegeFuer(app.letzte?.erg?.modell ?? null, app.ansicht.szene);
    /*
     * DIE MODELLPUNKTE PASSEND ZU DEM, WAS GEFUNDEN WIRD: die Erkennung
     * findet Mastachsen auf der Jochachse und den Mastfuss, nicht Jochenden
     * und Anschluss (bild.zeichnung.js, erkennungsWelt).
     */
    const bez = ['joch', 'mast']
      .map((key) => ({ key, welt: erkennungsWelt(key, app.letzte?.erg?.modell ?? null,
                                                  app.ansicht.szene),
                       label: moeglich.find((b) => b.key === key)?.label }))
      .find((b) => b.welt) ?? null;
    const bildPaar = (key) => (key === 'mast'
      ? [{ px: t.masten.links, py: t.fuesse.links },
         { px: t.masten.links, py: t.jochY }]
      : [t.p1, t.p2]);
    const k = t && bez && t.guete >= app.ERKENNUNG_GRENZE
      ? kalibriere(...bildPaar(bez.key), bez.welt[0], bez.welt[1]) : null;
    // Der Zeichnungsknopf und die Ebenengruppe aendern sich mit dem Bild:
    // vorher «Zeichnung…» und zwei graue Schalter, jetzt beides scharf. Ohne
    // dieses Nachzeichnen behauptete der Knopf weiter, es gebe keine.
    app.baueModellWerkzeuge();
    if (k) {
      app.ansicht.zeichnung.kalibrierung = k;
      app.ansicht.zeichnung.vorlaeufig = false;
      app.ansicht.zeichne();
      app.erkannt = { guete: t.guete, label: bez.label };
      app.zeichneBalken();
      await zeichnungSichernFallsMoeglich(app);
      return;
    }
    await zeichnungSichernFallsMoeglich(app);
    kalibrierenStarten(app);
  } catch (f) {
    // Der Handlungsbalken ueber dem Modell: dort steht ohnehin, was als
    // Naechstes zu tun ist, und dorthin schaut man beim Einlegen eines
    // Bildes. Die Modellueberschrift, die das frueher trug, gibt es nicht
    // mehr.
    app.meldeImBalken(`Das Bild liess sich nicht einlesen: ${f.message}`);
  }
}

/** In die Ablage, sobald das Tragwerk eine Id hat. */
export async function zeichnungSichernFallsMoeglich(app) {
  const z = app.ansicht.zeichnung;
  if (!z || !app.projekt.id) return;
  await store.zeichnungSichern(app.projekt.id, {
    daten: z.daten, breite: z.breite, hoehe: z.hoehe, art: z.art,
    name: z.name, kalibrierung: z.kalibrierung,
  }).catch(() => {});
}

/** Zeichnung eines geladenen Tragwerks holen. */
export async function zeichnungHolen(app, id) {
  const s = await store.zeichnungLaden(id).catch(() => null);
  if (!s) { app.ansicht.zeichnung = null; return; }
  const bild = await createImageBitmap(new Blob([s.daten], { type: s.art }))
    .catch(() => null);
  if (!bild) { app.ansicht.zeichnung = null; return; }
  app.ansicht.zeichnung = { bild, breite: s.breite, hoehe: s.hoehe, daten: s.daten,
                        art: s.art, name: s.name, kalibrierung: s.kalibrierung,
                        vorlaeufig: !s.kalibrierung };
}

/**
 * KALIBRIEREN: zwei Klicks auf ein bekanntes Mass.
 *
 * Die Modellpunkte stehen schon in der Eingabe - Jochlänge oder Masthöhe.
 * Eingetippt werden muss nichts; man klickt, was man ohnehin weiss.
 */
/*
 * DIE ZEICHNUNG ALS HANDLUNG.
 *
 * Bis hierher fuehrten nur zwei Wege zu einer Zeichnung: Strg+V und
 * Hineinziehen. Beide unsichtbar. Und war sie einmal eingemessen, gab es
 * ueberhaupt keinen Weg zurueck - die Frage des Auftraggebers, wie man die
 * Punkte nachtraeglich aendert, hatte schlicht keine Antwort.
 *
 * Der Knopf traegt jetzt alles, was man mit ihr tun kann. Ohne Bild oeffnet
 * er die Dateiwahl, mit Bild fragt er, was zu tun ist.
 */

export function zeichnungMenueUmschalten(app) {
  if (app.bildSchieben) { bildSchiebenEnde(app, false); return; }
  if (app.ausrichtung) { ausrichtenEnde(app, false); return; }
  if (app.kalibrierung) kalibrierenEnde(app);
  if (app.setzen) app.setzenEnde();
  if (!app.ansicht.zeichnung) { zeichnungWaehlen(app); return; }
  app.zeichnungMenue = !app.zeichnungMenue;
  app.baueModellWerkzeuge();
  app.zeichneBalken();
}

export function zeichnungMenueEnde(app) {
  app.zeichnungMenue = false;
  app.baueModellWerkzeuge();
  app.zeichneBalken();
}

/** Dateiwahl fuer ein Bild - derselbe Weg wie Einfuegen und Ziehen. */
export function zeichnungWaehlen(app) {
  const f = document.createElement('input');
  f.type = 'file';
  f.accept = 'image/*';
  f.onchange = async () => {
    const b = f.files?.[0];
    if (b) await zeichnungEinlegen(app, b, b.name ?? 'Datei');
    zeichnungMenueEnde(app);
  };
  f.click();
}

export async function zeichnungEntfernen(app) {
  app.ansicht.zeichnung = null;
  app.ansicht.zeichne();
  try { await store.zeichnungLoeschen(app.projekt.id); } catch { /* nie gesichert */ }
  zeichnungMenueEnde(app);
}

/*
 * DAS ABGELEGTE BILD NACHTRAEGLICH VERSCHIEBEN.
 *
 * Weisung vom 2. September: «es waere daher noch gut das abgelegte QP Bild
 * schieben zu koennen nachtraeglich, falls die Lage der Abstraktion nicht
 * ganz gleicht bei einer Jochreihe.»
 *
 * >>> DIE ALTE LAGE WIRD FESTGEHALTEN, BEVOR ETWAS PASSIERT. <<<
 *
 * Verschieben ist eine Handlung, die man daneben treffen kann - und was
 * zwei Klicks eingemessen haben, darf ein ungeschickter Zug nicht wortlos
 * verbrauchen. Solange der Modus laeuft, steht «zurueck» daneben; er setzt
 * genau auf die Kalibrierung zurueck, die vorher galt.
 *
 * Gesichert wird erst am Ende. Waehrend des Ziehens liefen sonst dutzende
 * Schreibvorgaenge in die Ablage, je Bild einer.
 */

export function bildSchiebenStarten(app) {
  const z = app.ansicht.zeichnung;
  if (!z?.kalibrierung) return;
  if (app.kalibrierung) kalibrierenEnde(app);
  if (app.ausrichtung) ausrichtenEnde(app, false);
  if (app.setzen) app.setzenEnde();
  app.zeichnungMenue = false;
  app.bildSchieben = { vorher: { ...z.kalibrierung } };
  // Die Zeichnung gilt nur in der Laengsansicht - dort wird auch geschoben.
  if (app.ansicht.ansichtKey !== 'laengs') app.ansicht.blickrichtung('laengs');
  app.ansicht.zeichnungSchieben = true;
  app.ansicht.ebenen.zeichnung = true;
  const cv = ui.el('canvas3d');
  if (cv) cv.style.cursor = 'grab';
  app.baueModellWerkzeuge();
  app.zeichneBalken();
  app.ansicht.zeichne();
  /*
   * DER FANG GEHOERT ANS ENDE, nicht an den Anfang.
   *
   * Die Pfeiltasten hoeren an der ZEICHENFLAECHE - ohne Fokus dort passiert
   * beim Druecken nichts. Vorne gesetzt war er sofort wieder weg: der
   * Balken wird gleich darauf neu gebaut, und der Knopf, ueber den man
   * hierher kam, verschwindet dabei mitsamt dem Fokus. Gemessen am
   * 2. September - Ziehen ging, die Pfeile taten nichts.
   */
  cv?.focus?.({ preventScroll: true });
}

export async function bildSchiebenEnde(app, zurueck = false) {
  if (!app.bildSchieben) return;
  const z = app.ansicht.zeichnung;
  if (zurueck && z) z.kalibrierung = { ...app.bildSchieben.vorher };
  app.bildSchieben = null;
  app.ansicht.zeichnungSchieben = false;
  ui.el('canvas3d')?.style.removeProperty('cursor');
  if (z && !zurueck) await zeichnungSichernFallsMoeglich(app);
  app.baueModellWerkzeuge();
  app.zeichneBalken();
  app.ansicht.zeichne();
}

/**
 * Das Einmessen beginnen - mit der Frage, WONACH.
 *
 * >>> DIE WAHL GEHOERT VOR DIE KLICKS. <<<
 *
 * Weisung vom 12. September: "man muesste hier eine auswahl vornehmen ob ein
 * mast (vertikal) oder ein joch (horizontal) als referenz dient."
 *
 * Bisher begann jedes Einmessen beim Joch, und das lotrechte Mass lag hinter
 * einem Knopf namens "anderes Mass" - zu finden erst, wenn man schon im
 * Fadenkreuz stand und die erste Anweisung vom falschen Punkt sprach. Wer
 * eine angeschnittene Zeichnung einlegt, auf der kein Jochende zu sehen ist,
 * musste das erst merken und dann suchen.
 *
 * Ohne Schluessel wird gefragt; mit Schluessel geht es unmittelbar los. Gibt
 * es nur einen Bezug, wird nicht gefragt - eine Wahl mit einer Antwort ist
 * keine.
 */
export function kalibrierenStarten(app, bezugKey = null) {
  if (app.ausrichtung) ausrichtenEnde(app, false);
  const moeglich = bezuegeFuer(app.letzte?.erg?.modell ?? null, app.ansicht.szene);
  if (!moeglich.length || !app.ansicht.zeichnung) { kalibrierenEnde(app); return; }
  const key = bezugKey ?? (moeglich.length === 1 ? moeglich[0].key : null);
  if (!key) {
    app.kalibrierung = { wahl: moeglich, punkte: [] };
    app.ansicht.kalibrierPunkte = [];
    app.ansicht.beiZeichnungsklick = null;
    app.zeichneBalken();
    return;
  }
  const b = moeglich.find((x) => x.key === key);
  if (!b) { kalibrierenEnde(app); return; }
  const welt = b.frei
    ? [{ text: 'Anfang des bekannten Masses' }, { text: 'Ende des bekannten Masses' }]
    : b.welt;
  app.kalibrierung = { bezug: b.key, label: b.label, wahlbar: moeglich.length > 1,
                   welt, punkte: [], frei: Boolean(b.frei) };
  // Der Geraetepunkt kommt als zweites Argument - er wird gebraucht, um den
  // gesetzten Punkt stehen zu lassen, waehrend man den zweiten sucht.
  app.ansicht.kalibrierPunkte = [];
  app.ansicht.beiZeichnungsklick = (t, g) => kalibrierKlick(app, t, g);
  ui.el('canvas3d').style.cursor = 'crosshair';
  app.zeichneBalken();
}

export function kalibrierenEnde(app) {
  app.kalibrierung = null;
  app.erkannt = null;
  app.ansicht.beiZeichnungsklick = null;
  app.ansicht.kalibrierPunkte = [];
  app.ansicht._fadenkreuz = null;
  ui.el('canvas3d')?.style.removeProperty('cursor');
  app.baueModellWerkzeuge();
  app.zeichneBalken();
  app.ansicht.zeichne();
}

async function kalibrierKlick(app, t, geraet) {
  if (!app.kalibrierung) return;
  if (app.kalibrierung.frei && app.kalibrierung.punkte.length >= 2) return;
  app.kalibrierung.punkte.push(t);
  if (geraet) app.ansicht.kalibrierPunkte = [...app.ansicht.kalibrierPunkte, geraet];
  if (app.kalibrierung.punkte.length < 2) { app.zeichneBalken(); app.ansicht.zeichne(); return; }
  /*
   * DAS FREIE MASS FRAGT NACH DEN ZWEI KLICKS NACH DER LAENGE.
   *
   * Weitere Klicks gehen ins Leere, bis sie eingegeben ist: ein dritter
   * Punkt waere nicht gemeint und stuende sonst stumm in der Liste.
   */
  if (app.kalibrierung.frei) {
    // Die Kreuze bleiben stehen, solange die Laenge fehlt - man sieht, was
    // man gemessen hat.
    app.zeichneBalken();
    app.ansicht.zeichne();
    ui.el('viewer-balken')?.querySelector('[data-kalib-laenge]')?.focus();
    return;
  }
  const [p1, p2] = app.kalibrierung.punkte;
  const [w1, w2] = app.kalibrierung.welt;
  const k = kalibriere(p1, p2, w1, w2);
  if (k && app.ansicht.zeichnung) {
    app.ansicht.zeichnung.kalibrierung = k;
    app.ansicht.zeichnung.vorlaeufig = false;
    await zeichnungSichernFallsMoeglich(app);
  }
  kalibrierenEnde(app);
}

/**
 * Das freie Mass abschliessen: Laenge eingegeben, Massstab daraus.
 *
 * Danach geht es GLEICH ins Ausrichten. Ein freies Mass sagt nur, wie gross
 * das Bild ist, nicht wohin es gehoert - liesse man es hier stehen, laege es
 * im richtigen Massstab am falschen Ort, und das sieht aus wie ein Fehler.
 */
export async function freiesMassUebernehmen(app, laenge) {
  const z = app.ansicht.zeichnung;
  if (!app.kalibrierung?.frei || !z || app.kalibrierung.punkte.length < 2) return;
  const [p1, p2] = app.kalibrierung.punkte;
  const k = kalibriereFrei(p1, p2, laenge, z.kalibrierung);
  // Ohne brauchbare Laenge bleibt die Frage stehen - die beiden Punkte
  // sind gesetzt, und sie noch einmal zu klicken, waere verlorene Arbeit.
  if (!k) {
    ui.el('viewer-balken')?.querySelector('[data-kalib-laenge]')?.focus();
    return;
  }
  z.kalibrierung = k;
  z.vorlaeufig = false;
  await zeichnungSichernFallsMoeglich(app);
  kalibrierenEnde(app);
  ausrichtenStarten(app, { nachMass: true });
}

/*
 * >>> AUSRICHTEN AN EINEM PUNKT (Weisung, 18. September). <<<
 *
 * «Die Referenz ist starr am Mastfuss» - das Einmessen legt Massstab UND
 * Lage in einem, und die Lage hing an den beiden Punkten, die man gerade
 * geklickt hatte. Wer die Zeichnung am Mastkopf oder am Jochende
 * deckungsgleich haben wollte, musste schieben und schaetzen.
 *
 * Jetzt waehlt man den Bezugspunkt: einen aus dem Modell - Mastfuss,
 * Anschluss, Mastkopf, Jochende - oder einen frei angeklickten. Dann klickt
 * man die Stelle auf der Zeichnung, die dorthin gehoert. Das Bild wird nur
 * VERSCHOBEN; der Massstab bleibt, wie er gemessen wurde.
 */

export function ausrichtenStarten(app, o = {}) {
  const z = app.ansicht.zeichnung;
  if (!z?.kalibrierung) return;
  if (app.kalibrierung) kalibrierenEnde(app);
  if (app.bildSchieben) bildSchiebenEnde(app, false);
  if (app.setzen) app.setzenEnde();
  app.zeichnungMenue = false;
  if (app.ansicht.ansichtKey !== 'laengs') app.ansicht.blickrichtung('laengs');
  app.ansicht.ebenen.zeichnung = true;
  app.ausrichtung = { wahl: ausrichtPunkte(app.ansicht.szene), vorher: { ...z.kalibrierung },
                  punkte: [], nachMass: o.nachMass === true };
  app.ansicht.beiZeichnungsklick = null;
  app.ansicht.kalibrierPunkte = [];
  app.baueModellWerkzeuge();
  app.zeichneBalken();
  app.ansicht.zeichne();
}

export function ausrichtenWaehlen(app, key) {
  if (!app.ausrichtung) return;
  if (key === 'frei') {
    app.ausrichtung.frei = true;
    app.ausrichtung.ziel = null;
  } else {
    const p = app.ausrichtung.wahl.find((w) => w.key === key);
    if (!p) return;
    app.ausrichtung.ziel = p;
    app.ausrichtung.frei = false;
  }
  app.ausrichtung.punkte = [];
  app.ansicht.kalibrierPunkte = [];
  app.ansicht.beiZeichnungsklick = (t, g) => ausrichtKlick(app, t, g);
  const cv = ui.el('canvas3d');
  if (cv) cv.style.cursor = 'crosshair';
  app.zeichneBalken();
  app.ansicht.zeichne();
}

async function ausrichtKlick(app, t, geraet) {
  const z = app.ansicht.zeichnung;
  if (!app.ausrichtung || !z?.kalibrierung) return;
  let ziel = app.ausrichtung.ziel;
  if (app.ausrichtung.frei) {
    // Erst der Punkt auf der Zeichnung, dann die Stelle im Modell, wohin er
    // gehoert. Der zweite Klick zaehlt als Ort in der Welt, nicht im Bild.
    if (!app.ausrichtung.punkte.length) {
      app.ausrichtung.punkte.push(t);
      if (geraet) app.ansicht.kalibrierPunkte = [geraet];
      app.zeichneBalken();
      app.ansicht.zeichne();
      return;
    }
    ziel = bildNachWelt(z.kalibrierung, t.px, t.py);
    t = app.ausrichtung.punkte[0];
  }
  const k = ausrichten(z.kalibrierung, t, ziel);
  if (k) {
    z.kalibrierung = k;
    await zeichnungSichernFallsMoeglich(app);
  }
  ausrichtenEnde(app, false);
}

export async function ausrichtenEnde(app, zurueck = false) {
  const z = app.ansicht.zeichnung;
  if (zurueck && z && app.ausrichtung?.vorher) z.kalibrierung = { ...app.ausrichtung.vorher };
  const war = app.ausrichtung;
  app.ausrichtung = null;
  app.ansicht.beiZeichnungsklick = null;
  app.ansicht.kalibrierPunkte = [];
  app.ansicht._fadenkreuz = null;
  ui.el('canvas3d')?.style.removeProperty('cursor');
  if (zurueck && z && war) await zeichnungSichernFallsMoeglich(app);
  app.baueModellWerkzeuge();
  app.zeichneBalken();
  app.ansicht.zeichne();
}
