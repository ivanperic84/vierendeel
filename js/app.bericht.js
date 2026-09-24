/**
 * app.bericht.js
 * ---------------------------------------------------------------------------
 * DER NACHWEISBERICHT: Dialog, Bilder, Ebene zum Drucken.
 *
 * Seit dem 19. September ein eigenes Modul (Durchsicht vom 18. September,
 * Punkt A1: app.js teilen). Den Arbeitsstand bekommt es als `app` - das
 * Kontextobjekt aus app.js mit Gettern (app.werte, app.letzte …) und den
 * gemeinsamen Hilfen (app.dialog, app.handlung, app.meldeImBalken). Es
 * importiert app.js nicht zurueck; einen Kreis vertraegt der Buendler nicht.
 * ---------------------------------------------------------------------------
 */
import { nachweisbericht, berichtVorgabe, UMFAENGE, BILDER,
         BERICHT_ARTEN } from './export.nachweisbericht.js';
import { APP_NAME, tragwerksart, rechensatz } from './core.constants.js';
import { esc, uebertrageTokens } from './design.js';
/*
 * Die drei neuen Balkenbilder (24. September). render.charts.js rechnet
 * nichts und importiert nichts - die Ampelfarbe geht deshalb als Funktion
 * hinein, siehe unten.
 */
import { bauteilDiagramm, fundamentDiagramm,
         fussKraftDiagramm } from './render.charts.js';

/* ===========================================================================
 * >>> DER NACHWEISBERICHT (Weisung vom 18. September). <<<
 * ===========================================================================
 *
 * «die bilder ausschaltbar und den umfang der nachweise einstellbar
 * machen.» Der Dialog fragt beides; die Wahl bleibt fuer das naechste Mal
 * im Browser stehen. Der Bericht selbst entsteht in
 * export.nachweisbericht.js aus dem, was `letzte` schon traegt - hier
 * werden nur die Bilder gemacht, die ein Browser braucht.
 * ========================================================================= */
const BERICHT_WAHL = 'tragjoch-bericht';

function berichtWahl() {
  try {
    const w = JSON.parse(localStorage.getItem(BERICHT_WAHL) ?? 'null');
    if (w?.umfang) return { ...berichtVorgabe(), ...w, bilder: { ...berichtVorgabe().bilder, ...w.bilder } };
  } catch { /* ohne Speicher die Vorgabe */ }
  return berichtVorgabe();
}

/** Die Regeln der Diagrammklassen aus dem eigenen Stylesheet. */
function diagrammStil() {
  const muster = /\.(grid|nulllinie|grenze|tick|achse|legende|serie|band|marke|lbl|micro)\b/;
  return [...document.styleSheets].flatMap((s) => {
    try { return [...s.cssRules]; } catch { return []; }
  }).filter((r) => r.selectorText && muster.test(r.selectorText))
    .map((r) => r.cssText).join('\n');
}

export function dialogBericht(app) {
  if (!app.letzte) return;
  const art = tragwerksart(app.werte);
  if (!BERICHT_ARTEN.includes(art.key)) {
    app.meldeImBalken(`Der Nachweisbericht deckt das Tragjoch mit Masten und den Einzelmast ab — `
      + `«${art.label}» ist nicht enthalten.`);
    return;
  }
  const w = berichtWahl();
  const koerper = `
    <p>Der Bericht öffnet sich in einem eigenen Fenster; dort als PDF drucken.
    Die Bilder zeigen die Modellansicht in ihrer jetzigen Darstellung.</p>
    <h3>Umfang der Nachweise</h3>
    ${UMFAENGE.map((u) => `<label class="schalter"><input type="radio" name="umfang"
      value="${u.key}"${u.key === w.umfang ? ' checked' : ''}>
      <span><b>${esc(u.label)}</b> — ${esc(u.text)}</span></label>`).join('')}
    <h3>Bilder</h3>
    ${BILDER.map((b) => `<label class="schalter"><input type="checkbox" name="bild"
      value="${b.key}"${w.bilder[b.key] ? ' checked' : ''}><span>${esc(b.label)}</span></label>`).join('')}`;
  const { node, zu } = app.dialog('Nachweisbericht', koerper,
    `<button class="btn" data-zu>Abbrechen</button>
     <button class="btn btn-acc" id="bericht-los">Bericht erzeugen</button>`);
  node.querySelector('#bericht-los').onclick = () => {
    const wahl = {
      umfang: node.querySelector('input[name=umfang]:checked')?.value ?? 'anhang',
      bilder: Object.fromEntries(BILDER.map((b) => [b.key,
        !!node.querySelector(`input[name=bild][value=${b.key}]`)?.checked])),
    };
    try { localStorage.setItem(BERICHT_WAHL, JSON.stringify(wahl)); } catch { /* egal */ }
    zu();
    app.handlung('Nachweisbericht', () => berichtOeffnen(app, wahl));
  };
}

function berichtOeffnen(app, wahl) {
  /*
   * DIE BEMESSUNG, nicht die Anzeige: gleich welcher Lastfall oben gewaehlt
   * ist, der Bericht steht auf der Umhuellenden - wie das Urteil.
   */
  const bem = app.letzte.bemessung;
  const b = wahl.bilder;
  const mitJoch = app.letzte.mitJoch !== false;
  /*
   * OHNE JOCH NUR DIE MASTDIAGRAMME: `diagrammSatz` legt die Kurven des
   * Traeger-Ersatzbalkens dazu, und die rechnet beim Einzelmast ein Joch,
   * das es nicht gibt.
   */
  const satz = (b.verlaeufe || b.eta || b.verformung)
    ? (mitJoch ? app.diagrammSatz(bem, 900)
      : Object.fromEntries(app.weitereDiagramme(bem, 900).flatMap((w, i) => [
        [`mast-schnitt-${i}`, { svg: w.schnitt }],
        [`mast-eta-${i}`, { svg: w.ausnutzung }],
        // Ohne Joch fehlte die Verformung im Bericht - sie ist gerade
        // dort die Auskunft, wo kein Joch den Kopf haelt.
        [`mast-verf-${i}`, { svg: w.verformung }],
        [`anker-bem-${i}`, { svg: w.bemessung }]])))
    : {};
  const reihe = (schluessel) => Object.entries(satz)
    .filter(([k, v]) => v.svg && schluessel.some((s) => k === s || k.startsWith(`${s}-`)))
    // Jedes Diagramm traegt seinen Titel selbst - ein zweiter waere doppelt.
    .map(([, v]) => `<div class="dia">${v.svg}</div>`).join('');
  /*
   * DIE BILDER IM HELLEN DESIGN (Weisung vom 18. September: «bei den
   * skizzen abbildungen das helle appdesign nehmen»). Fuer die Aufnahme
   * wird kurz umgeschaltet und danach zurueck - wer dunkel arbeitet, merkt
   * davon nichts.
   */
  const aufnahme = (key) => {
    if (!app.ansicht) return null;
    const vorher = app.thema;
    if (vorher !== 'hell') uebertrageTokens('hell');
    try {
      return app.ansicht.momentaufnahme(key);
    } finally {
      if (vorher !== 'hell') { uebertrageTokens(vorher); app.ansicht.zeichneJetzt(); }
    }
  };
  /* =========================================================================
   * >>> VIER NEUE BILDER (Weisung vom 24. September). <<<
   * =======================================================================
   *
   * «kann man noch zusätzliche diagramme ergänzen, die aber auch
   * gegengeprüft werden müssen auf richtigkeit (vektor richtung etc.).»
   *
   * Sie entstehen HIER und nicht im Bericht: der rechnet nichts und
   * zeichnet nichts, er bettet ein (siehe seinen Kopf). Die Ampelfarbe
   * geht als Funktion mit - `render.charts.js` importiert nichts und
   * kennt die Schwellen nicht.
   */
  const farbeVon = (eta) => (eta > 1 ? 'var(--fail)'
    : (eta > 0.9 ? 'var(--warn)' : 'var(--ok)'));
  const namenB = bem?.modell?.federn?.namen ?? {};

  /*
   * DIE FUNDAMENTBILDER JE ENDE - der Bericht holt sie unter `[e]`.
   * Zwei Masten haben zwei Fundamente, und sie können verschiedene
   * Typen sein (HEM 240 quer und längs).
   */
  const fundBilder = {};
  if (b.fundament && bem?.fundament) {
    ['A', 'B'].forEach((e) => {
      const q = bem.fundament[e];
      if (!q?.nachweise?.length) return;
      fundBilder[e] = fundamentDiagramm(q, { breite: 860, farbeVon });
    });
  }

  /*
   * DIE FUSSKRAFT: das MOMENT QUER zum Gleis, je Lastfall, mit
   * Vorzeichen. Quer und nicht längs, weil es am Fundament in aller
   * Regel das massgebende ist - und weil ein zweites Bild daneben die
   * Seite sprengte. Welche Richtung gemeint ist, steht in der
   * Bildunterschrift.
   */
  const fussBild = b.fusskraft && app.letzte?.kombi
    ? fussKraftDiagramm(app.letzte.kombi, {
        breite: 860, ende: 'A', feld: 'Myy', einheit: 'kNm',
        name: `M quer (M_yy) · Mast ${namenB.A ?? 'A'}`, nk: 2 })
    : null;

  const bilder = {
    skizze: b.skizze ? aufnahme('laengs') : null,
    modell3d: b.modell3d ? aufnahme('iso') : null,
    verlaeufe: b.verlaeufe ? reihe(['schnittgroessen', 'ebene', 'mast-schnitt', 'anker-bem']) : null,
    eta: b.eta ? reihe(['ausnutzung', 'mast-eta']) : null,
    // Das Verformungsbild steht schon im Diagrammsatz (24. September).
    verformung: b.verformung ? reihe(['mast-verf']) : null,
    bauteile: b.bauteile && app.letzte?.urteil?.bauteile
      ? bauteilDiagramm(app.letzte.urteil.bauteile, { breite: 860, farbeVon }) : null,
    fundament: Object.keys(fundBilder).length ? fundBilder : null,
    fusskraft: fussBild,
  };
  const html = nachweisbericht({
    werte: { ...rechensatz(app.werte), name: app.projekt.name },
    erg: bem, kombi: app.letzte.kombi, checks: app.letzte.checks, urteil: app.letzte.urteil,
    hinweise: app.letzte.hinw, fassung: `${APP_NAME} ${app.VERSION}`,
    datum: new Date().toLocaleDateString('de-CH'), bilder, stil: diagrammStil(),
  }, wahl);
  berichtZeigen(html);
}

/*
 * IN DER ANWENDUNG, NICHT IN EINEM NEUEN FENSTER. Der erste Anlauf oeffnete
 * ein Fenster - und die Pop-up-Sperre des Browsers hielt es auf. Eine Ebene
 * mit eingebettetem Dokument braucht keine Erlaubnis, laeuft auch in der
 * installierten und der eigenstaendigen Fassung, und gedruckt wird nur das
 * eingebettete Dokument, nicht die Anwendung dahinter.
 */
function berichtZeigen(html) {
  document.getElementById('bericht-ebene')?.remove();
  const ebene = document.createElement('div');
  ebene.id = 'bericht-ebene';
  ebene.innerHTML = `<div class="bericht-leiste">
      <b>Nachweisbericht</b>
      <button class="btn btn-acc" id="bericht-drucken">Drucken / als PDF sichern</button>
      <button class="btn" id="bericht-zu">Schliessen</button></div>
    <iframe title="Nachweisbericht"></iframe>`;
  document.body.appendChild(ebene);
  const rahmen = ebene.querySelector('iframe');
  rahmen.srcdoc = html;
  ebene.querySelector('#bericht-drucken').onclick = () => rahmen.contentWindow?.print();
  ebene.querySelector('#bericht-zu').onclick = () => ebene.remove();
}
