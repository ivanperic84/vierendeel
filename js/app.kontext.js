/**
 * app.kontext.js
 * ---------------------------------------------------------------------------
 * DIE KONTEXTMENUES: Tragwerk, Mast, Anbauteil, Modellgrund.
 *
 * Seit dem 19. September ein eigenes Modul (Durchsicht vom 18. September,
 * Punkt A1: app.js teilen). Den Arbeitsstand bekommt es als app - das
 * Kontextobjekt aus app.js. Es importiert app.js nicht zurueck.
 * ---------------------------------------------------------------------------
 */
import { dialogMast, dialogTragwerk } from './app.dialoge.js';
import { TRAGWERKSARTEN, aufRaster, lageVon, mastName, mastenFuer, mastenVon, tauscheAktives, tragwerkHinzu, tragwerkName, tragwerkPos, tragwerkTeil, tragwerkeSortiert, tragwerkeVon, tragwerksart, versteckt } from './core.constants.js';
import { flBauteile, getFlBauteil } from './data.fl.js';
import { hatTraeger, passeTraegerAn, rasterGesetzt, rasterNormVon } from './core.anbauteile.js';
import { esc } from './design.js';
import * as ui from './ui.js';

/** Das offene Menue, damit ein zweiter Klick es schliesst. */
let kontextMenue = null;
/** Fuer app.js: steht ein Kontextmenue offen? */
export const kontextOffen = () => Boolean(kontextMenue);

export function kontextSchliessen(app) {
  kontextMenue?.remove();
  kontextMenue = null;
}

/**
 * Ein Menue an einer Bildschirmstelle.
 *
 * @param {[number,number]} bei   Punkt in CSS-Pixeln
 * @param {Array} punkte          {text, tun, warn} - null trennt Gruppen
 */
export function kontextZeigen(app, bei, punkte) {
  kontextSchliessen(app);
  const echte = punkte.filter(Boolean);
  if (!echte.length) return;
  const n = document.createElement('div');
  n.className = 'kontext';
  /*
   * ZWEI ARTEN VON EINTRAG.
   *
   * Ein KNOPF tut etwas und schliesst das Menue. Ein FELD nimmt eine Angabe
   * entgegen und laesst es offen - man aendert einen Typ und danach vielleicht
   * noch die Laenge, ohne zweimal rechtszuklicken.
   *
   * Weisung vom 2. September: «beim kontextmenue bauteil parameter typ länge
   * ausrichtung direkt eintragen können.» Genau das: nicht ein Menuepunkt,
   * der die Karte in der Seitenleiste oeffnet, sondern die Angabe selbst,
   * dort wo man auf das Bauteil zeigt.
   */
  n.innerHTML = echte.map((p, i) => {
    if (p === '-') return '<hr>';
    if (p.kopf) return `<div class="kontext-kopf">${esc(p.kopf)}</div>`;
    if (p.feld) {
      const f = p.feld;
      const eingabe = f.art === 'auswahl'
        ? `<select data-kf="${i}">${(f.optionen ?? []).map((o) =>
            `<option value="${esc(o.wert)}"${String(o.wert) === String(f.wert)
              ? ' selected' : ''}>${esc(o.text)}</option>`).join('')}</select>`
        : `<input type="number" data-kf="${i}" value="${esc(String(f.wert ?? ''))}"
             step="${f.schritt ?? 0.1}">`;
      return `<label class="kontext-feld"><span>${esc(f.label)}</span>
        ${eingabe}${f.einheit ? `<i>${esc(f.einheit)}</i>` : ''}</label>`;
    }
    return `<button type="button" class="kontext-p${p.warn ? ' warn' : ''}"
         data-k="${i}">${esc(p.text)}</button>`;
  }).join('');
  document.body.appendChild(n);
  kontextMenue = n;
  /*
   * DAS MENUE BLEIBT IM FENSTER.
   *
   * Am rechten oder unteren Rand aufgeklappt ragte es sonst hinaus, und die
   * unteren Eintraege waeren nicht erreichbar - gerade dort, wo die
   * gefaehrlichen stehen.
   */
  const r = n.getBoundingClientRect();
  const x = Math.min(bei[0], window.innerWidth - r.width - 8);
  const y = Math.min(bei[1], window.innerHeight - r.height - 8);
  n.style.left = `${Math.max(4, x)}px`;
  n.style.top = `${Math.max(4, y)}px`;
  n.querySelectorAll('[data-k]').forEach((b2) => {
    b2.addEventListener('click', () => {
      const p = echte[+b2.dataset.k];
      kontextSchliessen(app);
      p?.tun?.();
    });
  });
  n.querySelectorAll('[data-kf]').forEach((el) => {
    const p = echte[+el.dataset.kf];
    const ev = el.tagName === 'SELECT' ? 'change' : 'change';
    el.addEventListener(ev, () => {
      const v = el.tagName === 'SELECT' ? el.value : parseFloat(el.value);
      if (el.tagName !== 'SELECT' && !Number.isFinite(v)) return;
      // DAS MENUE BLEIBT OFFEN. Wer den Typ aendert, will oft gleich die
      // Laenge nachziehen - zweimal rechtsklicken waere eine Zumutung.
      p?.tun?.(v);
    });
  });
  /*
   * >>> EIN KLICK INS MENUE SCHLIESST ES NICHT. <<<
   *
   * Hier stand ein `pointerdown`-Horcher ohne diese Pruefung. Mit
   * nachgestellten Klicks fiel das nicht auf - die feuern kein
   * `pointerdown`. Mit einer echten Maus schon: das Menue verschwand beim
   * Druecken, und der `click` landete auf nichts. Kein Eintrag haette
   * funktioniert, und die Ursache waere schwer zu sehen gewesen.
   */
  const zu = (e) => {
    /*
     * NUR EIN ZEIGERDRUCK HAT EIN ZIEL IM BAUM.
     *
     * Derselbe Horcher bedient `pointerdown`, `wheel` und `blur`. Beim
     * Fensterwechsel ist `e.target` das FENSTER, und `Node.contains(Window)`
     * wirft - eine Ausnahme bei jedem Wechsel aus dem Fenster heraus,
     * waehrend ein Menue offen steht. Gemessen am 3. September.
     */
    if (e?.target instanceof Node && n.contains(e.target)) return;
    kontextSchliessen(app); ab();
  };
  const ab = () => {
    document.removeEventListener('pointerdown', zu, true);
    window.removeEventListener('wheel', zu, true);
    window.removeEventListener('blur', zu);
  };
  setTimeout(() => {
    document.addEventListener('pointerdown', zu, true);
    window.addEventListener('wheel', zu, true);
    window.addEventListener('blur', zu);
  }, 0);
}

/** Die Einträge zu einem Tragwerk - im Modell wie in der Leiste dieselben. */
export function kontextTragwerk(app, id) {
  const alle = tragwerkeSortiert(app.werte);
  const t = alle.find((x) => x.id === id);
  if (!t) return [];
  const sichtbar = alle.filter((x) => !versteckt(x));
  const aktiv = (app.werte.twId ?? 'T1') === id;
  const p = [];
  /* =======================================================================
   * >>> DAS FENSTER STEHT ZUOBERST. <<<
   * =======================================================================
   *
   * Weisung vom 16. September: «diese maske auch über das kontextmenue
   * aufrufbar machen.»
   *
   * Sie war nur ueber den zweiten Klick auf ein angewaehltes Tragwerk zu
   * erreichen - ein Weg, den man kennen muss. Im Menue steht sie jetzt an
   * erster Stelle: was man am haeufigsten will, wenn man ein Bauteil
   * anklickt, ist es zu aendern.
   */
  p.push({ text: `${tragwerkName(t, app.werte)} bearbeiten …`,
           tun: () => dialogTragwerk(app, id) });
  if (!aktiv && !versteckt(t)) {
    p.push({ text: `${tragwerkName(t, app.werte)} rechnen`,
             tun: () => app.aendern('tragwerkAktiv', id) });
  }
  if (versteckt(t)) {
    p.push({ text: 'Wieder einblenden', tun: () => app.aendern('tragwerkZeigen', id) });
  } else if (sichtbar.length > 1) {
    p.push({ text: 'Nur dieses zeigen', tun: () => nurDiesesZeigen(app, id) });
    p.push({ text: 'Ausblenden', tun: () => app.aendern('tragwerkAus', id) });
  }
  if (alle.some(versteckt)) {
    p.push({ text: 'Alle wieder einblenden', tun: () => alleZeigen(app) });
  }
  /*
   * >>> EIN ABFANGJOCH GEHOERT UEBER EIN BESTIMMTES JOCH. <<<
   *
   * «Neues Tragwerk bei x = 18.50 m» auf dem leeren Grund setzt es an die
   * Stelle, auf die man gezeigt hat - das ist richtig, aber ungenau: ein
   * Abfangjoch sitzt nicht IRGENDWO, sondern auf DEN MASTEN des Jochs
   * darunter, ueber dessen ganze Strecke. Hier gezeigt, hier uebernommen:
   * Lage und Laenge kommen vom angeklickten Tragwerk.
   *
   * Was danach noch zu setzen bleibt, ist die Anschlusshoehe - die eine
   * Angabe, die zwei uebereinanderstehende Abfangjoche unterscheidet.
   */
  if (tragwerksart(t).masten >= 2) {
    p.push('-');
    p.push({ text: 'Abfangjoch darüber setzen', tun: () => {
      if ((app.werte.twId ?? 'T1') !== id) app.werte = tauscheAktives(app.werte, id);
      app.aendern('tragwerkNeu', { art: 'abfangjoch', xLage: lageVon(t) });
    } });
  }
  /* =========================================================================
   * >>> DIE ART LAESST SICH WECHSELN. <<<
   * =========================================================================
   *
   * Gefunden am 11. September in einem Bedienlauf: wer ein Tragjoch gesetzt
   * hatte und ein Abfangjoch brauchte, musste ein zweites anlegen und das
   * erste loeschen. Das Kontextmenue bot kopieren, zoomen, verschieben -
   * nur nicht das, was man am haeufigsten will.
   *
   * >>> WAS DABEI BLEIBT UND WAS NICHT. <<<
   *
   * Lage, Laenge, Masten und Anbauteile gehoeren dem TRAGWERK und bleiben.
   * Der TYP gehoert der Art: «J90» steht in keiner Abfangjoch-Liste, und
   * «A240» in keiner Tragjoch-Liste. Ein stehengebliebener Typ waere derselbe
   * Fehler, der beim Anlegen schon einmal aufgeschlagen ist - die
   * Auswahlliste zeigt dann den ersten Eintrag, waehrend im Datensatz etwas
   * anderes steht. `tragwerkNeu` setzt ihn deshalb neu, und diese Stelle
   * benutzt denselben Weg.
   *
   * Die Laenge wandert mit: ein A160 fuehrt 5.5-12.5 m, ein J130 bis 34.5 m.
   * Wer von einem 30-m-Joch auf A160 wechselt, bekommt die naechste Laenge,
   * die der neue Typ wirklich fuehrt.
   * ======================================================================= */
  const andere = TRAGWERKSARTEN.filter((a) => a.key !== tragwerksart(t).key);
  if (andere.length) {
    p.push('-');
    andere.forEach((a) => {
      p.push({ text: `Art wechseln auf: ${a.label}`, tun: () => {
        if ((app.werte.twId ?? 'T1') !== id) app.werte = tauscheAktives(app.werte, id);
        app.aendern('tragwerkArt', { id, art: a.key });
      } });
    });
  }
  /*
   * >>> VERSCHIEBEN UND KOPIEREN STEHEN HIER, NICHT AM ZEIGER. <<<
   *
   * Weisung vom 5. September: «nimm die funktion des drag and drop in der
   * sidebar unter tragwerke raus, diese funktion ist zu unpraezise. nimm
   * dafuer beim 3d unter dem kontextmenue die moeglichkeit elemente zu
   * kopieren verschieben und zu loeschen, dies fuer tragwerke und
   * anbauteile.»
   *
   * VERSCHIEBEN ist eine ZAHL, kein Zug: die Lage x₀ steht als Feld da und
   * laesst sich auf den Zentimeter setzen. Was der Zeiger auf einer Bahn von
   * vierzig Metern nie konnte, kostet hier eine Eingabe.
   *
   * KOPIEREN nimmt den ganzen Satz mit - Typ, Laenge, Profile, Bleche,
   * Anbauteile - und setzt ihn um eine Jochlaenge weiter. Das ist die Geste
   * einer Jochreihe: dasselbe Joch noch einmal, nur woanders.
   */
  p.push('-');
  p.push({ feld: { art: 'zahl', label: 'Lage x₀', einheit: 'm', schritt: 0.05,
                   wert: lageVon(t) },
           tun: (v) => app.aendern('tragwerkLage', { id, x: v }) });
  p.push({ text: `${tragwerkName(t, app.werte)} kopieren`, tun: () => tragwerkKopieren(app, id) });
  p.push({ text: 'Auf dieses zoomen', tun: () => app.zoomAufTragwerk(id) });
  if (tragwerksart(t).traeger && mastenFuer(app.werte, t).some(Boolean)) {
    p.push({ text: `${tragwerkName(t, app.werte)} entfernen, Masten als Einzelmasten behalten`,
             tun: () => app.aendern('jochZuEinzelmasten', id) });
  }
  if (alle.length > 1) {
    p.push({ text: 'Vom Blatt nehmen', warn: true,
             tun: () => app.aendern('tragwerkWeg', id) });
  }
  return p;
}

/**
 * >>> EIN TRAGWERK NOCH EINMAL, EINE JOCHLAENGE WEITER. <<<
 *
 * Weisung vom 5. September. Die Kopie traegt alles mit, was das Original
 * traegt - `tragwerkHinzu` bekommt den ganzen Satz als Vorlage. Nur die
 * LAGE ist eine andere: um seine eigene Laenge versetzt, damit die beiden
 * nicht uebereinanderstehen und man die Kopie sieht.
 *
 * Sie wird ausserdem zum GERECHNETEN - wer kopiert, will an der Kopie
 * weiterarbeiten, nicht am Original.
 */
export function tragwerkKopieren(app, id) {
  app.handlung('Tragwerk kopieren', () => {
    const t = tragwerkeSortiert(app.werte).find((x) => x.id === id);
    if (!t) return;
    const satz = { ...tragwerkTeil(t) };
    delete satz.id;
    delete satz.pos;
    const L = Number(t.L) || 0;
    app.werte = tragwerkHinzu(app.werte, tragwerksart(t).key,
                          { ...satz, xLage: lageVon(t) + (L || 2) });
    app.mastNachfuehrenGlobal();
    app.neuRechnen();
  });
}

/**
 * NUR EINES ZEIGEN - alle anderen beiseite.
 *
 * Auf einem Querprofil mit sechs Abschnitten ist das der Griff, den man
 * staendig braucht und der sonst fuenf einzelne Klicks kostet. Das
 * angeklickte wird dabei zum gerechneten: wer es allein sehen will, will
 * daran arbeiten.
 */
export function nurDiesesZeigen(app, id) {
  app.handlung('Nur dieses zeigen', () => {
    if ((app.werte.twId ?? 'T1') !== id) app.werte = tauscheAktives(app.werte, id);
    app.werte = { ...app.werte, ausgeblendet: false,
              weitere: (app.werte.weitere ?? []).map(
                (t) => ({ ...t, ausgeblendet: true })) };
    app.mastNachfuehrenGlobal();
    app.neuRechnen();
  });
}

/** Und alles wieder her. */
export function alleZeigen(app) {
  app.handlung('Alle einblenden', () => {
    app.werte = { ...app.werte, ausgeblendet: false,
              weitere: (app.werte.weitere ?? []).map(
                (t) => ({ ...t, ausgeblendet: false })) };
    app.neuRechnen();
  });
}

/**
 * Die Einträge zu einem Masten.
 *
 * >>> WELCHES TRAGWERK GEMEINT IST, SAGT DER MAST. <<<
 *
 * Weisung vom 9. September: «ich versteh die logik nicht beim ein ausblenden
 * der masten.» Hier lag ein Teil davon: `twId` war IMMER das gerechnete
 * Tragwerk, gleichgültig, welchen Masten man angeklickt hatte. Am linken
 * Masten stand «Masten von … ausschalten» und traf das rechte Joch — bei
 * zwei gleichen Jochen einer Reihe sah man dem Menütext nicht einmal an,
 * dass er den falschen meint.
 *
 * Gemeint ist, wer den Masten TRÄGT. Bei einem geteilten das gerechnete,
 * wenn es ihn trägt — dieselbe Regel wie in der Leiste; sonst der erste.
 */
export function kontextMast(app, mastId, twId) {
  const m = mastenVon(app.werte).find((x) => x.id === mastId);
  if (!m) return [];
  const traegt = m.traegt ?? [];
  const wer = traegt.includes(twId) ? twId : (traegt[0] ?? twId);
  const t = tragwerkeSortiert(app.werte).find((x) => x.id === wer)
         ?? tragwerkeVon(app.werte)[0];
  const p = [
    /*
     * >>> DAS FENSTER STATT DES SPRUNGS (16. September). <<<
     *
     * Weisung: «diese fenster auch für die maste anzeigen ... diese maske
     * auch über das kontextmenue aufrufbar machen.»
     *
     * Hier stand ein Sprung in die Seitenleiste - er waehlte den Masten an
     * und scrollte zum Profilfeld. Das ist ein Umweg ueber eine Liste, in
     * der man dann weitersucht; das Fenster zeigt, was den Masten ausmacht,
     * auf einmal.
     *
     * DER SPRUNG BLEIBT DARUNTER: was das Fenster nicht fuehrt - Fusspunkt,
     * Zuganker, Windbeiwerte - steht weiterhin nur dort.
     */
    { text: `${mastName(app.werte, m)} bearbeiten …`,
      tun: () => dialogMast(app, mastId) },
    { text: 'In der Seitenleiste bearbeiten', tun: () => {
      app.aendern('mastAktiv', mastId);
      app.zeigeFeld('mastProfil');
    } },
    { text: 'Auf den Masten zoomen',
      tun: () => { app.station = null; app.ansicht.station = null;
                   app.ansicht.zoomAuf(m.x, null, 2); } },
  ];
  /*
   * DIE MASTEN EINES TRAGWERKS AB- ODER ANSCHALTEN - nur dort, wo es einen
   * Traeger gibt. Beim Einzelmasten waere «Masten ausschalten» der Auftrag,
   * das Tragwerk abzuschaffen.
   */
  if (t && tragwerksart(t).traeger) {
    p.push('-');
    p.push({ text: `Masten von ${tragwerkPos(app.werte, t)} (${tragwerkName(t, app.werte)}) `
      + (t.mastVorhanden === false ? 'einschalten' : 'ausschalten'),
      tun: () => app.aendern('tragwerkMasten', t.id) });
  }
  return p;
}

/**
 * DIE EINTRAEGE ZU EINEM ANBAUTEIL - mit den Angaben, nicht nur mit Wegen
 * dorthin.
 *
 * Weisung vom 2. September: «beim kontextmenue bauteil parameter typ länge
 * ausrichtung direkt eintragen können.»
 *
 * >>> WELCHE DREI. <<<
 *
 *   TYP          das Bauteil des ersten Moduls. Es traegt die Baugruppe;
 *                was daran haengt, bleibt haengen.
 *   LAGE/HOEHE   am Joch die Stelle x, am Masten die Hoehe ueber Fundament.
 *                Dieselbe Zahl, die der Klick beim Setzen bestimmt hat -
 *                und die man danach auf den Zentimeter nachzieht.
 *   AUSRICHTUNG  auf welche Seite der Jochachse das Teil ausgreift. Bei
 *                einem Ausleger ist das die haeufigste Korrektur ueberhaupt:
 *                man setzt ihn und sieht, dass er zum falschen Gleis zeigt.
 *
 * Nicht mehr. Ein Kontextmenue mit zwoelf Feldern waere die Bauteilkarte,
 * nur an einer schlechteren Stelle - die steht weiter in der Seitenleiste,
 * und «bearbeiten» fuehrt hin.
 */
export function kontextAnbauteil(app, i) {
  const a = (app.werte.anbauteile ?? [])[i];
  if (!a) return [];
  const setz = (fn) => {
    const liste = (app.werte.anbauteile ?? []).map((x, j) => (j === i ? fn(x) : x));
    app.setzeAnbauteile(liste);
  };
  const mod0 = (a.module ?? [])[0];
  const amMasten = a.ort === 'mastA' || a.ort === 'mastB';
  const p = [{ kopf: a.name ?? 'Bauteil' }];

  /*
   * DER TYP: was die Datenbank an dieser Stelle ueberhaupt zulaesst.
   *
   * Gefiltert nach der ROLLE des jetzigen Bauteils - ein Traeger laesst sich
   * gegen einen anderen Traeger tauschen, nicht gegen einen Fahrdraht. Sonst
   * stuende eine Baugruppe da, deren Glieder nicht mehr aufeinanderpassen,
   * und die Pruefungen meldeten es erst hinterher.
   */
  if (mod0) {
    let rolle = null;
    try { rolle = getFlBauteil(mod0.bauteil)?.rolle ?? null; } catch { /* unbekannt */ }
    const wahl = flBauteile(rolle).map((b2) => ({ wert: b2.id, text: b2.name ?? b2.id }));
    if (wahl.length > 1) {
      p.push({ feld: { art: 'auswahl', label: 'Typ', wert: mod0.bauteil,
                       optionen: wahl },
               tun: (v) => setz((x) => ({ ...x,
                 module: (x.module ?? []).map((m, k) => (k === 0
                   ? { ...m, bauteil: v } : m)) })) });
    }
  }

  // LAGE oder HOEHE - je nachdem, woran es haengt.
  p.push(amMasten
    ? { feld: { art: 'zahl', label: 'Höhe', einheit: 'm', schritt: 0.05,
                wert: a.hMast ?? 0 },
        tun: (v) => setz((x) => ({ ...x, hMast: v })) }
    : { feld: { art: 'zahl', label: 'Lage x', einheit: 'm', schritt: 0.1,
                wert: a.x ?? 0 },
        tun: (v) => setz((x) => ({ ...x, x: v })) });

  /*
   * DIE AUSRICHTUNG: das Vorzeichen der Ausladung.
   *
   * Sie steht als AUSWAHL da, nicht als Kreuzchen - «links / rechts» sagt,
   * was man sieht; «gespiegelt: ja» verlangt, dass man sich den
   * Ausgangszustand merkt. Gespiegelt wird die ganze Baugruppe, damit das,
   * was am Ausleger haengt, mitgeht.
   */
  const ausladung = (a.module ?? []).reduce(
    (m, x) => (Math.abs(x.x ?? 0) > Math.abs(m) ? (x.x ?? 0) : m), 0);
  if (Math.abs(ausladung) > 1e-9) {
    p.push({ feld: { art: 'auswahl', label: 'Ausrichtung',
                     wert: ausladung < 0 ? 'links' : 'rechts',
                     optionen: [{ wert: 'links', text: 'nach links' },
                                { wert: 'rechts', text: 'nach rechts' }] },
             tun: (v) => {
               const soll = v === 'links' ? -1 : 1;
               if (Math.sign(ausladung) === soll) return;
               setz((x) => ({ ...x, module: (x.module ?? []).map(
                 (m) => ({ ...m, x: -(m.x ?? 0) })) }));
             } });
  }

  p.push('-');
  p.push({ text: 'In der Seitenleiste bearbeiten', tun: () => app.zeigeAnbauteil(i) });
  p.push({ text: 'Auf das Bauteil zoomen', tun: () => app.ansicht.zeigeAnbauteil(i) });
  /*
   * ABSCHALTEN IST NICHT ENTFERNEN - dieselbe Trennung wie beim Tragwerk.
   * Ein abgeschaltetes Bauteil bleibt in der Liste und zaehlt nicht mit;
   * ein entferntes ist weg.
   */
  p.push({ text: a.aktiv === false ? 'Wieder mitrechnen' : 'Nicht mitrechnen',
           tun: () => setz((x) => ({ ...x, aktiv: x.aktiv === false })) });
  /*
   * KOPIEREN (Weisung, 5. September). Ein Bauteil steht selten allein - je
   * Gleis dasselbe, nur eine Spannweite weiter. Die Kopie sitzt einen
   * halben Meter daneben, damit sie nicht im Original verschwindet.
   */
  p.push({ text: 'Duplizieren', tun: () => anbauteilDuplizieren(app, i) });
  p.push({ text: 'Entfernen', warn: true,
           tun: () => app.setzeAnbauteile(
             (app.werte.anbauteile ?? []).filter((_, j) => j !== i)) });
  return p;
}

/**
 * >>> DUPLIZIEREN - aus dem Modell, der Karte und ihrem Rechtsklick. <<<
 *
 * Weisung vom 5. September (Kopieren im Modell) und vom 19. September: «Bei
 * der eingabe der bauteile ein dubplizieren mit rechtsklick oder button
 * ermöglichen.» Eine Funktion für alle drei Wege.
 *
 * Die Kopie sitzt einen halben Meter daneben, damit sie nicht im Original
 * verschwindet - am Joch in x (am Jochende nach innen), am Masten höher.
 * Ein Träger weicht wie beim Setzen den Bindeblechen aus, das Raster vom
 * Normalmass aus.
 */
export function anbauteilDuplizieren(app, i) {
  const liste = [...(app.werte.anbauteile ?? [])];
  const a = liste[i];
  if (!a) return;
  let kopie = { ...a, id: `AT-${Math.random().toString(36).slice(2, 8)}`,
                module: (a.module ?? []).map((m) => ({ ...m })),
                lasten: (a.lasten ?? []).map((l) => ({ ...l })) };
  if ((a.ort ?? 'joch') === 'joch') {
    const x = Number(a.x) || 0;
    const L = Number(app.werte.L) || Infinity;
    // Die Module stehen relativ zur Baugruppe (a.x + m.x) und rücken mit.
    kopie.x = x + 0.5 <= L ? x + 0.5 : Math.max(0, x - 0.5);
    const modell = app.letzte?.erg?.modell;
    if (modell && hatTraeger(kopie.module, (id) => getFlBauteil(id).rolle)) {
      const an = passeTraegerAn(kopie.x, rasterNormVon(kopie), modell);
      kopie = { ...rasterGesetzt(kopie, an), x: an.x };
    }
  } else {
    // Am Masten eine Stufe hoeher - am Kopf eine tiefer, sonst stuende die
    // Kopie ueber dem Masten (Befund vom 19. September am Einzelmast).
    const h = Number(a.hMast) || 0;
    const kopf = ui.mastKopfHoehe(app.werte, a.ort === 'mastB' ? 'B' : 'A');
    kopie.hMast = Math.round((h + 0.5 <= kopf + 1e-9 ? h + 0.5 : Math.max(0, h - 0.5)) * 100) / 100;
  }
  liste.splice(i + 1, 0, kopie);
  app.setzeAnbauteile(liste);
  app.meldeImBalken?.(`«${a.name ?? 'Bauteil'}» dupliziert als A${i + 2}`);
}

/**
 * Die Einträge auf leerem Grund.
 *
 * Hier steht, was das BILD betrifft und was man sonst unten links oder in
 * der Werkzeugleiste sucht. Kein zweites Hauptmenue - nur die drei Fahrten,
 * die man staendig braucht, und die beiden Handlungen, die im Modell
 * beginnen.
 */
export function kontextGrund(app, k) {
  const p = [
    { text: 'Ganzes Querprofil zeigen',
      tun: () => { app.station = null; app.ansicht.station = null;
                   app.ansicht.ansichtZuruecksetzen(); app.zeichneAuswertung(); } },
    { text: 'Nur das gerechnete Tragwerk',
      tun: () => app.zoomAufTragwerk(app.werte.twId ?? 'T1') },
  ];
  if (app.letzte?.erg?.schnitt) {
    p.push({ text: 'Auf den Nachweisschnitt', tun: () => app.ansicht.zeigeSchnitt(2.5) });
  }
  /*
   * >>> EIN TRAGWERK DORT ANLEGEN, WO MAN HINZEIGT. <<<
   *
   * Weisung vom 3. September: «ich könnte mir persönlich ein ähnliches
   * vorgehen vorstellen wie bei den anbauteilen wo man diese in das modell
   * zieht oder per rechtsklick ein neues tragelement hinzufügen könnte.»
   *
   * Genau so. Der Knopf «+ Tragwerk» in der Leiste haengt das naechste
   * rechts an - der Regelfall einer Reihe. Wer es woanders haben will,
   * zeigt hin: ein Abfangjoch UEBER ein bestehendes Tragjoch etwa laesst
   * sich nur so setzen, denn es teilt sich dessen Strecke.
   *
   * Die Stelle wird auf den halben Meter gerastet - dieselbe Grobheit wie
   * beim Ziehen, aus demselben Grund: ein Klick ins Bild trifft keinen
   * Zentimeter.
   */
  if (Number.isFinite(k?.welt?.x)) {
    const wo = aufRaster(k.welt.x);
    p.push('-');
    p.push({ kopf: `Neues Tragwerk bei x = ${wo.toFixed(2)} m` });
    TRAGWERKSARTEN.forEach((a) => {
      p.push({ text: a.label,
               tun: () => app.aendern('tragwerkNeu', { art: a.key, xLage: wo }) });
    });
  }
  p.push('-');
  p.push({ text: app.setzen ? 'Bauteil setzen abbrechen' : 'Bauteil setzen',
           tun: () => (app.setzen ? app.setzenEnde() : app.setzenStarten()) });
  if (app.ansicht.zeichnung?.kalibrierung) {
    p.push({ text: 'Zeichnung verschieben', tun: () => app.bildSchiebenStarten() });
    p.push({ text: 'Zeichnung ausrichten', tun: () => app.ausrichtenStarten() });
  }
  if (tragwerkeSortiert(app.werte).some(versteckt)) {
    p.push('-');
    p.push({ text: 'Alle Tragwerke einblenden', tun: () => alleZeigen(app) });
  }
  return p;
}

/**
 * Der Rechtsklick im Modell.
 *
 * Die Ansicht meldet nur, WORAUF geklickt wurde; was dort angeboten wird,
 * entscheidet sich hier. So bleibt die Zeichenflaeche frei von Wissen ueber
 * Ausblenden und Bauteillisten.
 */
export function kontextImModell(app, k) {
  const twId = k.twId ?? app.werte.twId ?? 'T1';
  let punkte;
  if (k.was === 'mast') {
    // Das Ende gehoert dem Tragwerk, an dem der Mast gezeichnet wurde.
    const t = tragwerkeSortiert(app.werte).find((x) => x.id === twId);
    const [a, b] = t ? mastenFuer(app.werte, t) : [null, null];
    const m = k.mastEnde === 'B' ? b : a;
    punkte = m ? kontextMast(app, m.id, twId) : [];
  } else if (k.was === 'anbauteil' && k.anbauteil !== null) {
    punkte = kontextAnbauteil(app, k.anbauteil);
  } else if (k.was === 'tragwerk') {
    punkte = kontextTragwerk(app, twId);
  } else {
    punkte = kontextGrund(app, k);
  }
  kontextZeigen(app, k.bei, punkte);
}
