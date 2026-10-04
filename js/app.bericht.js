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
import { APP_NAME, tragwerksart, rechensatz, sichtbareTragwerke, tauscheAktives,
         tragwerkPos, tragwerkName, lageVon, mastenVon, mastName, mastAnzeigeKarte,
         mastAnzeigeText, verortung } from './core.constants.js';
import { stabwerkBericht, blattUrteil } from './export.stabbericht.js';
import { verfahrenVon } from './core.stabnachweis.js';
import { stabwerkStand, reiheOhneStabmodell, ankerFuerMast,
         verformungFuer } from './app.stabwerk.js';
import { STEGRICHTUNGEN } from './data.masten.js';
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

/*
 * >>> WELCHER BERICHT (1. Oktober). <<<
 *
 * Weisung «Bericht und Excel auf den Stabwerksweg umstellen, dazu je ein
 * Bericht für Abfangjoch und Tragausleger». Mit Rechenverfahren Stabwerk
 * (Vorgabe) der Bericht des Stabwerks über das ganze Blatt
 * (export.stabbericht.js); Abfangjoch und Tragausleger haben nur diesen.
 * Wer in den Optionen den Ersatzbalken wählt, bekommt am Tragjoch und
 * Einzelmast weiter den Bericht des Ersatzbalkens.
 */
export function berichtUeberStabwerk(werte) {
  return verfahrenVon(werte) === 'stabwerk'
    || !BERICHT_ARTEN.includes(tragwerksart(werte).key);
}

export function dialogBericht(app) {
  if (!app.letzte) return;
  const mitStabwerk = berichtUeberStabwerk(app.werte);
  const grund = mitStabwerk ? reiheOhneStabmodell(app.werte) : null;
  if (grund) {
    app.meldeImBalken(`Nachweisbericht nicht möglich: ${grund}`);
    return;
  }
  const w = berichtWahl();
  const koerper = `
    <p>Der Bericht öffnet sich in einem eigenen Fenster; dort als PDF drucken.
    Die Bilder zeigen die Modellansicht in ihrer jetzigen Darstellung.</p>
    ${mitStabwerk ? `<p class="hinweis">Aus dem <b>Stabwerk</b>, über alle Tragwerke des
    Blattes. Ist es nicht gültig gerechnet, wird es vorher gerechnet.</p>`
      : '<p class="hinweis">Aus dem <b>Ersatzbalken</b> (Rechenverfahren in den Optionen).</p>'}
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
  if (berichtUeberStabwerk(app.werte)) { berichtStabwerk(app, wahl); return; }
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
/* ===========================================================================
 * >>> DER BERICHT AUS DEM STABWERK (1. Oktober). <<<
 *
 * Rückfragen: «Erst rechnen» - ist das Stabwerk nicht gültig, rechnet der
 * Knopf es zuerst; «Ganzes Blatt» - je Tragwerk sein Kern (`rechneTragwerk`,
 * dieselbe Rechnung wie die Anzeige) für Lasten, Prüfungen, Hinweise und
 * die Messstelle der Verformung, je Mast Knicken, Fundament und Anker aus
 * dem Stabwerk. Der Bericht selbst rechnet nicht (export.stabbericht.js).
 * ========================================================================= */
export function stabwerkBerichtDaten(app) {
  if (stabwerkStand(app) !== 'gueltig') app.stabwerkRechnen();
  const sw = app.stabwerk;
  if (!sw || sw.fehler || sw.ohneModell) {
    throw new Error(sw?.fehler ?? sw?.ohneModell ?? 'kein gültiges Stabwerk');
  }
  const w0 = app.werte;
  const karte = mastAnzeigeKarte(w0);
  const anzeige = (s) => mastAnzeigeText(s, karte);
  const mitPraefix = Object.keys(sw.teile ?? {}).some((k) => k.startsWith('tragwerk:'));
  const jetzt = w0.twId ?? 'T1';
  const tragwerke = sichtbareTragwerke(w0).map((t, i) => {
    const w = t.id === jetzt ? w0 : tauscheAktives(w0, t.id);
    let r = null;
    try { r = app.rechneTragwerk(JSON.parse(JSON.stringify(w)), app.jochVonTyp(w)); }
    catch (e) { console.warn('Bericht, Kern', t.id, e); }
    const namen = r?.erg?.modell?.federn?.namen ?? {};
    return {
      id: t.id, nr: i + 1, pos: tragwerkPos(w0, t), label: tragwerkName(t, w0),
      art: tragwerksart(t).key, x0: lageVon(t), satz: rechensatz(w),
      modell: r?.erg?.modell ?? null, r,
      stabKey: mitPraefix ? `tragwerk:${t.id}` : 'tragwerk',
      checks: r?.checks ?? [], hinweise: r?.hinw ?? [], namen,
      verformung: verformungFuer(sw, r?.erg?.verformung ?? null, namen, t.id),
    };
  });
  const traegerName = (ids) => (ids ?? []).map((id) => {
    const t = sichtbareTragwerke(w0).find((x) => x.id === id);
    return t ? tragwerkPos(w0, t) : id;
  }).join(', ');
  const masten = mastenVon(w0).map((m) => {
    const id = mastName(w0, m);
    const imModell = sw.teile?.[`mast:${id}|mast`] || sw.bauteile?.[`mast:${id}`];
    if (!imModell) return null;
    // Der Kern eines Tragwerks, das diesen Masten trägt - für Länge und Anker.
    let kern = null, ende = null, satz = null;
    tragwerke.some((tw) => ['A', 'B'].some((e) => {
      if (tw.namen?.[e] !== id || !tw.r?.erg?.mast?.[e]) return false;
      kern = tw.r.erg; ende = e; satz = tw.satz;
      return true;
    }));
    const amAusleger = sw.ausleger && sw.ausleger.name === `Mast ${id}`;
    const meta = kern?.anker?.[ende]?.kraft ?? null;
    let anker = sw.ankerJe?.[id] ?? null;
    if (!anker && meta) {
      try { anker = ankerFuerMast(sw, id, meta, satz); } catch { anker = null; }
    }
    const fundament = sw.fundamentJe?.[id] ?? (amAusleger ? sw.ausleger.fundament?.A : null) ?? null;
    const steg = STEGRICHTUNGEN.find((s) => s.key === (m.steg ?? 'jochachse'));
    return {
      id, anzeige: anzeige(id), profil: m.profil ?? kern?.mast?.[ende]?.profil?.name,
      laenge: kern?.mast?.[ende]?.laenge ?? m.laenge, steg: steg?.label ?? m.steg,
      x: m.x, traegt: traegerName(m.traegt),
      ankerText: m.anker?.typ ? `${m.anker.typ} · h ${Number(m.anker.h).toFixed(2)} m · a ${Number(m.anker.a).toFixed(2)} m` : null,
      fundamentTyp: fundament?.typ?.typ ?? (m.fundament || null),
      knick: sw.knick?.[id] ?? (amAusleger ? sw.ausleger.knick : null) ?? null,
      fundament, anker,
    };
  }).filter(Boolean);
  return {
    blatt: { name: app.projekt?.name, ort: verortung(w0), projektNr: w0.projektNr,
             bearbeiter: w0.bearbeiter, datum: w0.datum, werte: rechensatz(w0) },
    sw, faelle: sw.roh?.faelle ?? [], tragwerke, masten,
    nichtGefuehrt: app.letzte?.urteil?.nichtGefuehrt ?? [], anzeige,
    reaktionen: app.reaktionsDaten?.()?.zeilen ?? null,
    fassung: `${APP_NAME} ${app.VERSION}`, datum: new Date().toLocaleDateString('de-CH'),
  };
}

function berichtStabwerk(app, wahl) {
  const d = stabwerkBerichtDaten(app);
  const b = wahl.bilder;
  const satz = (b.verlaeufe || b.eta) ? app.diagrammSatz(app.letzte.bemessung, 900) : {};
  const reihe = (schluessel) => Object.entries(satz)
    .filter(([k, v]) => v.svg && schluessel.some((s) => k === s || k.startsWith(`${s}-`)))
    .map(([, v]) => `<div class="dia">${v.svg}</div>`).join('');
  const aufnahme = (key) => {
    if (!app.ansicht) return null;
    const vorher = app.thema;
    if (vorher !== 'hell') uebertrageTokens('hell');
    try { return app.ansicht.momentaufnahme(key); }
    finally { if (vorher !== 'hell') { uebertrageTokens(vorher); app.ansicht.zeichneJetzt(); } }
  };
  const farbeVon = (eta) => (eta > 1 ? 'var(--fail)' : (eta > 0.9 ? 'var(--warn)' : 'var(--ok)'));
  const fund = {};
  if (b.fundament) {
    d.masten.forEach((m) => {
      if (m.fundament?.nachweise?.length) fund[m.id] = fundamentDiagramm(m.fundament, { breite: 860, farbeVon });
    });
  }
  d.bilder = {
    skizze: b.skizze ? aufnahme('laengs') : null,
    modell3d: b.modell3d ? aufnahme('iso') : null,
    // Nur die Verläufe des Stabwerks - der Ersatzbalken steht nicht mehr im Bericht.
    verlaeufe: b.verlaeufe ? reihe(['sw-gurt', 'sw-kraft', 'sw-blech', 'sw-mast-schnitt']) : null,
    eta: b.eta ? reihe(['sw-mast-eta']) : null,
    bauteile: b.bauteile ? bauteilDiagramm(blattUrteil(d), { breite: 860, farbeVon }) : null,
    fundament: Object.keys(fund).length ? fund : null,
  };
  d.stil = diagrammStil();
  berichtZeigen(stabwerkBericht(d, wahl));
}

// Auch das Blatt der Reaktionskräfte geht diesen Weg (30. September).
/*
 * `wahl` (30. September, Blatt der Reaktionskräfte): Kästchen in der
 * Leiste - { optionen: [{key, label}], zustand: {key: bool}, bauen(zustand)
 * -> html }. Ein Klick baut das Dokument neu; gedruckt wird, was dasteht.
 */
export function berichtZeigen(html, titel = 'Nachweisbericht', wahl = null) {
  document.getElementById('bericht-ebene')?.remove();
  const ebene = document.createElement('div');
  ebene.id = 'bericht-ebene';
  const kaesten = (wahl?.optionen ?? []).map((o) => `<label class="bericht-wahl">
      <input type="checkbox" data-bericht-wahl="${o.key}"${wahl.zustand?.[o.key] !== false
        ? ' checked' : ''}> ${o.label}</label>`).join('');
  // Knöpfe einer Seite (1. Oktober: Hinweise als Vorlage speichern).
  const aktionen = (wahl?.aktionen ?? []).map((a) => `<button class="btn btn-mini"
      data-bericht-aktion="${a.key}" title="${a.titel ?? ''}">${a.label}</button>`).join('');
  ebene.innerHTML = `<div class="bericht-leiste">
      <b>${titel}</b>${kaesten}${aktionen}
      <button class="btn btn-acc" id="bericht-drucken">Drucken / als PDF sichern</button>
      <button class="btn" id="bericht-zu">Schliessen</button></div>
    <iframe title="${titel}"></iframe>`;
  document.body.appendChild(ebene);
  const rahmen = ebene.querySelector('iframe');
  rahmen.srcdoc = html;
  ebene.querySelector('#bericht-drucken').onclick = () => rahmen.contentWindow?.print();
  ebene.querySelectorAll('[data-bericht-wahl]').forEach((k) => {
    k.onchange = () => {
      // Was auf dem Blatt bearbeitet wurde, übersteht den Neuaufbau.
      wahl.merken?.(rahmen);
      wahl.zustand = { ...(wahl.zustand ?? {}), [k.dataset.berichtWahl]: k.checked };
      rahmen.srcdoc = wahl.bauen(wahl.zustand);
    };
  });
  ebene.querySelectorAll('[data-bericht-aktion]').forEach((b) => {
    const a = (wahl?.aktionen ?? []).find((x) => x.key === b.dataset.berichtAktion);
    b.onclick = () => a?.tun(rahmen, () => { rahmen.srcdoc = wahl.bauen(wahl.zustand); });
  });
  ebene.querySelector('#bericht-zu').onclick = () => ebene.remove();
}
