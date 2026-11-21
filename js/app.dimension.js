/**
 * app.dimension.js - Dimensionieren mit dem Stabwerk (19. November).
 *
 * Weisungen, im Wortlaut: «macht es sinn eine dimensionierungsbutton zu
 * machen für Masten und joche? bei den masten müsste man noch die
 * möglichkeit aufführen wenn sie gedreht werden. und zudem noch die
 * plastische widerstandsbetrachtung», dann «dimensionierung mit dem
 * stabwerk vornehmen und auch die einspannung mitnehmen, es muss nicht in
 * sekundenschnelle ein resultat geliefert werden. ein diagramm mit
 * ausnutzung und materialmasse wäre noch gut als übersicht mit den
 * verschiedenen varianten.»
 *
 * WIE GERECHNET WIRD: jede Variante ist eine Kopie der Eingabe, gerechnet
 * mit dem Kern (Gestalt) und dem Stabwerk (Urteil) - derselbe Weg wie der
 * Knopf «rechnen». Nichts wechselt von selbst; «übernehmen» setzt eine
 * Variante (Strg+Z nimmt sie zurück).
 *
 * DIE VARIANTEN (meine Wahl, um die Zahl der Rechnungen klein zu halten):
 *   1. je Einspannung (wie gebaut / bis zur Grenze der Hakenschrauben /
 *      voll) jeder Jochtyp, der die Länge führt - Masten wie eingegeben;
 *   2. je Einspannung jedes Walzprofil der Masten × Stegrichtung ×
 *      elastisch / plastisch - Joch wie eingegeben; das Fundament ist das
 *      kleinste, das das Sortiment dem Profil zuordnet;
 *   3. je Einspannung die Kombination aus dem leichtesten Joch und dem
 *      leichtesten Mast, die mit der Reserve halten.
 * Beide Masten des Tragwerks bekommen dasselbe Profil.
 */
import { esc, abschnitt } from './design.js';
import { mastenFuer, setzeMastAngabe, tragwerksart, gitterLaengenFest } from './core.constants.js';
import { sortimentstypen, laengenbereich, getTragjoch, bauweise } from './data.tragjoche.js';
import { typUebernehmen } from './ui.schema.js';
import { mastprofileWahl, fundamentKandidaten, STEGRICHTUNGEN } from './data.masten.js';
import { JOCH_EINGESPANNT } from './core.auflager.js';
import { massenauszug } from './core.massenauszug.js';
import { rechneStabwerk } from './app.stabwerk.js';
import * as ui from './ui.js';

export const EINSPANNUNGEN = [
  { key: 'gebaut', label: 'wie gebaut', farbe: '#7c8de0' },
  { key: 'grenze', label: 'bis Grenze Hakenschrauben', farbe: '#d6a33c' },
  { key: 'voll', label: 'voll eingespannt', farbe: '#4bbf8a' },
];
/*
 * Variiert werden nur «wie gebaut» und «bis Grenze Hakenschrauben» (19.
 * November, «wird bei der volleinspannung der nachweis für die schrauben
 * geführt? falls nicht dann weglassen»): der Nachweis der Bügelschrauben
 * zählt in der Dimensionierung nicht, voll eingespannt läge er weit über
 * der Grenze. «voll» bleibt nur, wenn das Blatt selbst so steht und die
 * Einspannung nicht variiert wird.
 */
const EINSPANNUNG_VARIIERT = ['gebaut', 'grenze'];

/*
 * >>> WAS DURCHGERECHNET WIRD: GRUPPEN UND EINZELNE TYPEN (21. November). <<<
 * Weisung: «beim sortiment durchrechnen sollte man eine auswahl machen können
 * welche typen berücksichtigt wreden sollen, einzeln und als gruppe (zum
 * beispiel alte jochtypen / gittermasten / dgp masten) eine empfehlung für
 * otpimierung sollte nie das alte jochsortiment berücksichtigen, da dieses
 * nur für den bestand relevant ist.»
 * Die alten Jochtypen lassen sich zum Vergleich rechnen, stehen aber nie in
 * der Empfehlung und in keiner Kombination.
 */
export const GRUPPEN = [
  { key: 'jochNeu', titel: 'Jochtypen', art: 'joch', an: true },
  { key: 'jochAlt', titel: 'Jochtypen alt (nur Bestand, nie empfohlen)', art: 'joch', an: false },
  { key: 'walz', titel: 'Walzprofile', art: 'mast', an: true },
  { key: 'gitter', titel: 'Gittermasten', art: 'mast', an: false },
  { key: 'dgp', titel: 'Gespreizte Masten (DGP)', art: 'mast', an: false },
];
const AUSWAHL = 'tragjoch-dim-auswahl';

/** Alle Kandidaten je Gruppe, mit Grund, wenn einer die Länge nicht führt. */
export function kandidaten(w) {
  const out = Object.fromEntries(GRUPPEN.map((g) => [g.key, []]));
  sortimentstypen().forEach((j) => {
    const b = laengenbereich(j);
    const geht = w.L >= b.min - 1e-9 && w.L <= b.max + 1e-9;
    out[bauweise(j) === 'neu' ? 'jochNeu' : 'jochAlt'].push({
      name: j.typ, kgm: j.gewicht ?? null,
      grund: geht ? null : `${b.min.toFixed(1)} … ${b.max.toFixed(1)} m` });
  });
  mastprofileWahl().forEach((p) => {
    const g = p.gitter ? 'gitter' : p.gespreizt ? 'dgp' : 'walz';
    out[g].push({ name: p.name, kgm: p.g ?? null, grund: null });
  });
  Object.values(out).forEach((l) => l.sort((a, b) => (a.kgm ?? 1e9) - (b.kgm ?? 1e9)));
  return out;
}

/** Die gewählten Namen: Vorgabe nach Gruppe, Abweichungen im Browser gemerkt. */
export function auswahlLesen(w) {
  let gemerkt = {};
  try { gemerkt = JSON.parse(localStorage.getItem(AUSWAHL) ?? '{}') ?? {}; } catch { gemerkt = {}; }
  const k = kandidaten(w);
  const an = new Set();
  GRUPPEN.forEach((g) => k[g.key].forEach((x) => {
    if (x.grund) return;
    if (gemerkt[x.name] ?? g.an) an.add(x.name);
  }));
  return an;
}
function auswahlMerken(w, an) {
  const k = kandidaten(w);
  const m = {};
  GRUPPEN.forEach((g) => k[g.key].forEach((x) => { if (!x.grund && an.has(x.name) !== g.an) m[x.name] = an.has(x.name); }));
  try { localStorage.setItem(AUSWAHL, JSON.stringify(m)); } catch { /* ohne Speicher */ }
}
const RESERVE = 'tragjoch-vorschlag-reserve';
const kopie = (w) => JSON.parse(JSON.stringify(w));

/** Die Eingabe einer Variante aus der jetzigen Eingabe. */
export function variante(w0, v) {
  let w = kopie(w0);
  if (v.typ && v.typ !== w.typ) {
    const j = getTragjoch(v.typ);
    w = typUebernehmen(w, j);
    w.typ = v.typ;
    w.bearbeiten = false;
  }
  if (v.einsp) {
    w.schraubenGrenze = v.einsp === 'grenze';
    w.auflagerLinks = v.einsp === 'gebaut' ? null
      : { ...kopie(JOCH_EINGESPANNT), ...(v.einsp === 'grenze' ? { schraubenGrenze: true } : {}) };
  }
  if (v.plastisch !== undefined) w.mastPlastisch = v.plastisch === true;
  // Bleche plastisch und Rückhaltekraft als Achsen (19. November).
  if (v.blech !== undefined) w.blechPlastisch = v.blech === true;
  if (v.rueckhalt !== undefined) w.rueckhaltAn = v.rueckhalt === true;
  if (v.profil || v.steg) {
    mastenFuer(w, w).filter(Boolean).forEach((m) => {
      if (v.profil) w = setzeMastAngabe(w, m.id, 'mastProfil', v.profil);
      if (v.steg) w = setzeMastAngabe(w, m.id, 'mastSteg', v.steg);
      const f = fundamentKandidaten(v.profil ?? m.profil, v.steg ?? m.steg ?? 'jochachse', m.gelaende ?? 'bis14')[0];
      if (f?.typ) w = setzeMastAngabe(w, m.id, 'mastFundament', f.typ);
    });
  }
  // Ein Gittermast trägt die Länge seines Typs.
  return gitterLaengenFest(w);
}

/** Die Ausnutzungen aus einem Stabwerksergebnis. */
export function auswerten(h) {
  const max = (l) => l.filter(Number.isFinite).reduce((a, b) => Math.max(a, b), 0);
  const t = Object.entries(h.teile ?? {});
  const joch = max(t.filter(([k]) => !k.startsWith('mast:')).map(([, x]) => x.eta));
  const mast = max([...t.filter(([k]) => k.startsWith('mast:')).map(([, x]) => x.eta),
                    ...Object.values(h.knick ?? {}).map((x) => x?.eta)]);
  const fund = max(Object.values(h.fundamentJe ?? {}).map((x) => x?.eta));
  const anker = max(Object.values(h.ankerJe ?? {}).map((x) => x?.eta));
  let kg = null, m2 = null, kgJoch = null, kgMast = null;
  try {
    const ma = massenauszug(h.roh?.dat);
    kg = ma?.total?.kg ?? null;
    m2 = ma?.total?.m2 ?? null;
    kgMast = (ma?.bauteile ?? []).filter((b) => b.key.startsWith('mast:')).reduce((s, b) => s + b.kg, 0);
    kgJoch = (ma?.bauteile ?? []).filter((b) => !b.key.startsWith('mast:') && !b.key.startsWith('anker:'))
      .reduce((s, b) => s + b.kg, 0);
  } catch { kg = null; }
  const fundTyp = [...new Set(Object.values(h.fundamentJe ?? {}).map((x) => x?.typ?.typ).filter(Boolean))].join(', ');
  return { joch, mast, fund, anker, gesamt: Math.max(joch, mast, fund, anker), kg, m2, kgJoch, kgMast, fundTyp };
}

/** Eine Variante rechnen (Kern + Stabwerk). */
export function rechneVariante(app, v) {
  const w = variante(app.werte, v);
  const r = app.rechneTragwerk(kopie(w), app.jochVonTyp(w));
  // Ohne die Vergleichsläufe (Bestand, ohne Rückhalt) - sie verdoppelten die Zeit.
  const h = rechneStabwerk({ werte: w, letzte: { erg: r.erg }, stabwerk: null, ohneBestand: true, ohneRueckhalt: true });
  if (h?.fehler || h?.ohneModell) return { ...v, fehler: h.fehler ?? h.ohneModell };
  return { ...v, ...auswerten(h) };
}

/** Die Liste der Varianten, Stufe 1 und 2. `an`: die gewählten Typen und Profile. */
export function variantenListe(w, wahl, an = auswahlLesen(w)) {
  const m0 = mastenFuer(w, w).filter(Boolean)[0];
  const einsp = wahl.einspannung ? EINSPANNUNG_VARIIERT : [aktuelleEinspannung(w)];
  const k = kandidaten(w);
  const l = [];
  const typen = [...k.jochNeu.map((x) => ({ ...x, alt: false })), ...k.jochAlt.map((x) => ({ ...x, alt: true }))]
    .filter((x) => !x.grund && an.has(x.name));
  const profile = [...k.walz.map((x) => ({ ...x, walz: true })), ...k.gitter, ...k.dgp]
    .filter((x) => an.has(x.name));
  const stege = wahl.steg ? STEGRICHTUNGEN.map((s) => s.key) : [m0?.steg ?? w.mastSteg ?? 'jochachse'];
  const plast = wahl.plastisch ? [false, true] : [w.mastPlastisch === true];
  const blech = wahl.blech ? [false, true] : [w.blechPlastisch === true];
  const rh = wahl.rueckhalt ? [false, true] : [w.rueckhaltAn === true];
  einsp.forEach((e) => rh.forEach((r) => {
    typen.forEach((j) => blech.forEach((bp) =>
      l.push({ art: 'joch', einsp: e, rueckhalt: r, typ: j.name, blech: bp, kgm: j.kgm, alt: j.alt })));
    // Plastisch nur am Walzprofil - Gitter und Spreizung rechnen ihre Teile je Stab.
    profile.forEach((p) => stege.forEach((st) => (p.walz ? plast : [plast[0]]).forEach((pl) =>
      l.push({ art: 'mast', einsp: e, rueckhalt: r, profil: p.name, steg: st, plastisch: pl, kgm: p.kgm }))));
    if (!typen.length && !profile.length) l.push({ art: 'jetzt', einsp: e, rueckhalt: r, blech: blech[0] });
  }));
  return l;
}

/** Gruppe für das Abbruchkriterium Masse: gleiche Art und gleiche Nebenwahl. */
const massGruppe = (v) => [v.art, v.einsp, v.rueckhalt, v.art === 'mast' ? `${v.steg}|${v.plastisch}` : v.blech].join('|');

/** Vorauswahl mit dem Kern (Kontrollrechnung): grösste Ausnutzung über alle Bauteile. */
export function kernEta(app, v) {
  const w = variante(app.werte, v);
  const r = app.rechneTragwerk(kopie(w), app.jochVonTyp(w));
  const l = (r?.urteil?.bauteile ?? []).map((b) => b.eta).filter(Number.isFinite);
  return l.length ? Math.max(...l) : null;
}

export function aktuelleEinspannung(w) {
  if (!w.auflagerLinks) return 'gebaut';
  return w.auflagerLinks.schraubenGrenze || w.schraubenGrenze ? 'grenze' : 'voll';
}

/** Stufe 3: je Einspannung das leichteste Joch und der leichteste Mast, die halten. */
export function kombinationen(erg, grenze) {
  const out = [];
  EINSPANNUNGEN.forEach(({ key }) => [false, true, undefined].forEach((r) => {
    const ok = (x) => !x.fehler && x.einsp === key && x.rueckhalt === r;
    const j = erg.filter((x) => ok(x) && x.art === 'joch' && !x.alt && x.joch <= grenze)
      .sort((a, b) => (a.kg ?? 1e9) - (b.kg ?? 1e9) || Number(a.blech) - Number(b.blech))[0];
    const m = erg.filter((x) => ok(x) && x.art === 'mast' && Math.max(x.mast, x.fund) <= grenze)
      .sort((a, b) => (a.kg ?? 1e9) - (b.kg ?? 1e9) || Number(a.plastisch) - Number(b.plastisch))[0];
    if (j || m) {
      out.push({ art: 'kombi', einsp: key, rueckhalt: r, ...(j ? { typ: j.typ, blech: j.blech } : {}),
                 ...(m ? { profil: m.profil, steg: m.steg, plastisch: m.plastisch } : {}) });
    }
  }));
  return out;
}

const STEG_KURZ = { jochachse: 'Steg quer', quer: 'Steg längs' };
export function variantenText(v, w) {
  const e = EINSPANNUNGEN.find((x) => x.key === v.einsp)?.label ?? '';
  const teile = [];
  teile.push(v.typ ?? w?.typ ?? '');
  if (v.alt) teile[0] += ' (Bestand)';
  if (v.blech) teile[0] += ' (Bleche plastisch)';
  if (v.profil) teile.push(`${v.profil} ${STEG_KURZ[v.steg] ?? ''}${v.plastisch ? ' (Mast plastisch)' : ''}`);
  return `${teile.filter(Boolean).join(' · ')} · ${e}${v.rueckhalt ? ' · Rückhalt' : ''}`;
}

/* ---------------------------------------------------------------------------
 * Das Fenster: Wahl, Fortschritt, Diagramm, Tabelle.
 * ------------------------------------------------------------------------- */
function reserveLesen() {
  try { const v = Number(localStorage.getItem(RESERVE)); return v >= 0 && v < 90 ? v : 0; } catch { return 0; }
}
/*
 * >>> GRENZEN DER SUCHE (21. November). <<< «beim dimensionieren sollte
 * nicht alles durchgerechnet werden. alle nachweise die über 1.1 gehen sind
 * zu limitieren und bei der oberen grenze die gewichtszunahme als kriterium
 * aufführen.» Auf Rückfrage «wie empfehlung nur einstellbar, da ich nicht
 * weis wie verlässlich die vorauswahl ist»: (1) die Vorauswahl mit dem Kern
 * lässt Varianten über η_V weg (Vorgabe 1.10), (2) nach oben endet die Suche
 * je Gruppe, sobald eine Variante mehr als X % schwerer wäre als die
 * leichteste, die im Stabwerk hält (Vorgabe 30 %). Beide Felder einstellbar.
 */
const GRENZEN = 'tragjoch-dim-grenzen';
function grenzenLesen() {
  try {
    const g = JSON.parse(localStorage.getItem(GRENZEN) ?? '{}') ?? {};
    return { etaV: g.etaV > 0 ? g.etaV : 1.1, plus: g.plus >= 0 ? g.plus : 30 };
  } catch { return { etaV: 1.1, plus: 30 }; }
}

export function dialogDimension(app) {
  if (!app.letzte) return;
  if (tragwerksart(app.werte).key !== 'joch') {
    app.meldeImBalken('Dimensionieren gibt es für das Tragjoch mit Masten.', { dauer: 5000 });
    return;
  }
  let reserve = reserveLesen();
  const wahl = { steg: true, plastisch: true, einspannung: true, blech: false, rueckhalt: false };
  const an = auswahlLesen(app.werte);
  const grenzen = grenzenLesen();
  let ausgelassen = [];
  // Zum Vergleich angekreuzte Varianten (19. November).
  const auswahl = new Set();
  let spinneAn = false;
  let ergebnis = [];
  let abbruch = false;
  const schalter = (k, t, titel = '') => `<label class="dm-wahl"${titel ? ` title="${esc(titel)}"` : ''}><input type="checkbox" data-dm="${k}"${wahl[k] ? ' checked' : ''}> ${t}</label>`;
  const kand = kandidaten(app.werte);
  const gruppeHtml = (g) => {
    const l = kand[g.key];
    if (!l.length) return '';
    const frei = l.filter((x) => !x.grund);
    const n = frei.filter((x) => an.has(x.name)).length;
    return `<details class="dm-gruppe"><summary>
        <label class="dm-wahl"><input type="checkbox" data-dm-gruppe="${g.key}"${n === frei.length && n ? ' checked' : ''}${!frei.length ? ' disabled' : ''}> ${esc(g.titel)}</label>
        <span class="ablage-meta" data-dm-gzahl="${g.key}">${n} / ${frei.length}</span></summary>
      <div class="dm-typen">${l.map((x) => `<label class="dm-wahl"${x.grund ? ` title="Länge nicht im Bereich ${esc(x.grund)}"` : ''}>
        <input type="checkbox" data-dm-typ="${esc(x.name)}" data-dm-g="${g.key}"${an.has(x.name) ? ' checked' : ''}${x.grund ? ' disabled' : ''}> ${esc(x.name)}</label>`).join('')}</div></details>`;
  };
  app.dialog('Dimensionieren', `
    <div class="dm-auswahl">${GRUPPEN.map(gruppeHtml).join('')}</div>
    <div class="dm-kopf">
      ${schalter('steg', 'Mast gedreht')}
      ${schalter('plastisch', 'Mast auch plastisch', 'Jedes Walzprofil zusätzlich mit plastischem Querschnittswiderstand (W_pl, nur Klasse 1/2) rechnen - wie der Schalter «Mast plastisch» unter den Nachweisen. Ohne Haken: wie eingestellt.')}${schalter('blech', 'Bleche plastisch', 'Jeden Jochtyp zusätzlich mit plastisch nachgewiesenen stehenden Blechen rechnen. Ohne Haken: wie eingestellt.')}${schalter('rueckhalt', 'Rückhaltekraft', 'Jede Variante mit und ohne Rückhaltekraft der Leiter (Einstellung unter Lasten). Ohne Haken: wie eingestellt.')}${schalter('einspannung', 'Einspannung', 'Wie gebaut und bis zur Grenze der Hakenschrauben. Voll eingespannt nicht: der Nachweis der Bügelschrauben zählt hier nicht.')}
    </div>
    <div class="dm-kopf">
      <label class="dm-wahl">Reserve <input type="number" id="dm-reserve" min="0" max="50" step="5" value="${reserve}"> %</label>
      <label class="dm-wahl" title="Vorauswahl mit der Kontrollrechnung (Kern): Varianten mit grösserer Ausnutzung werden nicht im Stabwerk gerechnet.">Vorauswahl bis η <input type="number" id="dm-etav" min="1" max="3" step="0.05" value="${grenzen.etaV}"></label>
      <label class="dm-wahl" title="Nach oben endet die Suche je Gruppe, sobald eine Variante mehr als so viel schwerer wäre als die leichteste, die hält.">Masse höchstens + <input type="number" id="dm-plus" min="0" max="500" step="5" value="${grenzen.plus}"> %</label>
      <button class="btn" id="dm-los" type="button">Rechnen</button>
      <span class="ablage-meta" id="dm-zahl"></span>
    </div>
    <div class="dm-fort" id="dm-fort" hidden><div id="dm-balken"></div><span id="dm-text"></span>
      <button class="btn btn-mini" id="dm-stopp" type="button">abbrechen</button></div>
    <div id="dm-ergebnis"><p class="notiz">Zuerst rechnet die Kontrollrechnung (Kern) jede Variante schnell vor;
      im Stabwerk (rund 1 s je Variante) nur, was die Vorauswahl besteht, je Gruppe vom leichtesten aufwärts.
      Gerechnet wird auf Kopien; die Eingabe ändert sich erst mit «übernehmen».</p></div>`,
    '<button class="btn" data-zu>Schliessen</button>', 'dialog-breit',
    { beiZu: () => { abbruch = true; } });

  const box = ui.el('ueberlagerung');
  const zahlNeu = () => { box.querySelector('#dm-zahl').textContent = `${variantenListe(app.werte, wahl, an).length} Varianten vor der Vorauswahl`; };
  box.querySelectorAll('[data-dm]').forEach((c) => { c.onchange = () => { wahl[c.dataset.dm] = c.checked; zahlNeu(); }; });
  const gruppeNachfuehren = (gk) => {
    const frei = kand[gk].filter((x) => !x.grund);
    const n = frei.filter((x) => an.has(x.name)).length;
    const c = box.querySelector(`[data-dm-gruppe="${gk}"]`);
    if (c) { c.checked = n === frei.length && n > 0; c.indeterminate = n > 0 && n < frei.length; }
    const z = box.querySelector(`[data-dm-gzahl="${gk}"]`);
    if (z) z.textContent = `${n} / ${frei.length}`;
  };
  GRUPPEN.forEach((g) => gruppeNachfuehren(g.key));
  box.querySelectorAll('[data-dm-gruppe]').forEach((c) => {
    // Der Haken in der Kopfzeile schaltet die Gruppe, ohne sie auf- und zuzuklappen.
    c.addEventListener('click', (e) => e.stopPropagation());
    c.closest('label')?.addEventListener('click', (e) => e.stopPropagation());
    c.onchange = () => {
      const gk = c.dataset.dmGruppe;
      kand[gk].filter((x) => !x.grund).forEach((x) => { if (c.checked) an.add(x.name); else an.delete(x.name); });
      box.querySelectorAll(`[data-dm-g="${gk}"]`).forEach((t) => { if (!t.disabled) t.checked = c.checked; });
      auswahlMerken(app.werte, an); gruppeNachfuehren(gk); zahlNeu();
    };
  });
  box.querySelectorAll('[data-dm-typ]').forEach((t) => {
    t.onchange = () => {
      if (t.checked) an.add(t.dataset.dmTyp); else an.delete(t.dataset.dmTyp);
      auswahlMerken(app.werte, an); gruppeNachfuehren(t.dataset.dmG); zahlNeu();
    };
  });
  const grenzenSchreiben = () => {
    grenzen.etaV = Math.min(3, Math.max(1, Number(box.querySelector('#dm-etav').value) || 1.1));
    grenzen.plus = Math.min(500, Math.max(0, Number(box.querySelector('#dm-plus').value) || 0));
    try { localStorage.setItem(GRENZEN, JSON.stringify(grenzen)); } catch { /* ohne Speicher */ }
  };
  box.querySelector('#dm-etav').onchange = grenzenSchreiben;
  box.querySelector('#dm-plus').onchange = grenzenSchreiben;
  zahlNeu();
  box.querySelector('#dm-reserve').onchange = (e) => {
    reserve = Math.min(50, Math.max(0, Number(e.target.value) || 0));
    try { localStorage.setItem(RESERVE, String(reserve)); } catch { /* ohne Speicher */ }
    if (ergebnis.length) zeige();
  };
  box.querySelector('#dm-stopp').onclick = () => { abbruch = true; };
  box.querySelector('#dm-los').onclick = async () => {
    abbruch = false;
    ergebnis = [];
    ausgelassen = [];
    auswahl.clear();
    grenzenSchreiben();
    const g = 1 - reserve / 100;
    const liste = variantenListe(app.werte, wahl, an);
    const fort = box.querySelector('#dm-fort');
    fort.hidden = false;
    const t0 = performance.now();
    const melde = async (i, n, text) => {
      box.querySelector('#dm-balken').style.width = `${(100 * i) / Math.max(1, n)}%`;
      box.querySelector('#dm-text').textContent = text;
      await new Promise((r) => setTimeout(r, 0));
    };
    // 1. Vorauswahl mit dem Kern.
    for (let i = 0; i < liste.length && !abbruch; i += 1) {
      const v = liste[i];
      if (i % 4 === 0) await melde(i, liste.length, `Vorauswahl ${i + 1} / ${liste.length} · ${variantenText(v, app.werte)}`);
      try { v.kern = kernEta(app, v); } catch { v.kern = null; }
    }
    const weiter = [];
    liste.forEach((v) => {
      if (Number.isFinite(v.kern) && v.kern > grenzen.etaV) ausgelassen.push({ ...v, grund: 'vorauswahl' });
      else weiter.push(v);
    });
    // 2. Stabwerk je Gruppe vom leichtesten aufwärts, bis zur Massengrenze.
    const gruppen = new Map();
    weiter.forEach((v) => { const k = massGruppe(v); if (!gruppen.has(k)) gruppen.set(k, []); gruppen.get(k).push(v); });
    gruppen.forEach((l) => l.sort((a, b) => (a.kgm ?? 1e9) - (b.kgm ?? 1e9)));
    let i = 0;
    const rechne = async (v, n) => {
      await melde(i, n, `Stabwerk ${i + 1} / ${n} · ${variantenText(v, app.werte)}`);
      i += 1;
      try { return rechneVariante(app, v); } catch (e) { return { ...v, fehler: String(e?.message ?? e) }; }
    };
    for (const l of gruppen.values()) {
      if (abbruch) break;
      let leicht = null;
      for (const v of l) {
        if (abbruch) break;
        if (leicht !== null && Number.isFinite(v.kgm) && v.kgm > leicht * (1 + grenzen.plus / 100) + 1e-9) {
          ausgelassen.push({ ...v, grund: 'masse' });
          continue;
        }
        const x = await rechne(v, weiter.length);
        x.kern = v.kern;
        ergebnis.push(x);
        if (leicht === null && !x.fehler && !x.alt && x.gesamt <= g && Number.isFinite(v.kgm)) leicht = v.kgm;
      }
    }
    if (!abbruch) {
      const k = kombinationen(ergebnis, g);
      for (let j = 0; j < k.length && !abbruch; j += 1) ergebnis.push(await rechne(k[j], i + k.length - j));
    }
    fort.hidden = true;
    box.querySelector('#dm-zahl').textContent = `${ergebnis.length} im Stabwerk, ${ausgelassen.length} ausgelassen · ${((performance.now() - t0) / 1000).toFixed(0)} s${abbruch ? ' (abgebrochen)' : ''}`;
    zeige();
  };

  /*
   * >>> VERGLEICH DER ANGEKREUZTEN VARIANTEN (19. November). <<< «dann
   * ermöglichen eine auswahl zu wählen die dann verglichen werden mit gewicht
   * oberfläche etc.» Je Variante eine Spalte: was gewählt ist, die
   * Ausnutzungen, Masse gesamt / Joch / Masten, Oberfläche, Fundament; die
   * beste Zahl einer Zeile hervorgehoben.
   */
  function vergleichHtml() {
    const l = [...auswahl].map((i) => ergebnis[i]).filter((x) => x && !x.fehler);
    if (!l.length) return '';
    if (l.length < 2) return '<p class="notiz">Eine weitere Variante ankreuzen, um zu vergleichen.</p>';
    const f3 = (v) => (Number.isFinite(v) ? v.toFixed(3) : '–');
    const f0 = (v) => (Number.isFinite(v) ? v.toFixed(0) : '–');
    const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : '–');
    const ein = (v) => EINSPANNUNGEN.find((x) => x.key === v.einsp)?.label ?? '';
    const zeilen = [
      ['Jochtyp', (v) => v.typ ?? app.werte.typ ?? ''],
      ['Mastprofil', (v) => v.profil ?? '(wie eingegeben)'],
      ['Stegrichtung', (v) => (v.steg ? STEG_KURZ[v.steg] : '(wie eingegeben)')],
      ['Mast plastisch', (v) => (v.plastisch === undefined ? '(wie eingestellt)' : v.plastisch ? 'ja' : 'nein')],
      ['Bleche plastisch', (v) => (v.blech === undefined ? '(wie eingestellt)' : v.blech ? 'ja' : 'nein')],
      ['Rückhaltekraft', (v) => (v.rueckhalt === undefined ? '(wie eingestellt)' : v.rueckhalt ? 'ja' : 'nein')],
      ['Einspannung', ein],
      ['Fundament', (v) => v.fundTyp || '–'],
    ];
    const zahlen = [
      ['η Joch', 'joch', f3, 'min'], ['η Mast', 'mast', f3, 'min'], ['η Fundament', 'fund', f3, 'min'],
      ['η Anker', 'anker', (v) => (v > 0 ? f3(v) : '–'), 'min'], ['η gesamt', 'gesamt', f3, 'min'],
      ['Masse gesamt [kg]', 'kg', f0, 'min'], ['Masse Joch [kg]', 'kgJoch', f0, 'min'],
      ['Masse Masten [kg]', 'kgMast', f0, 'min'], ['Oberfläche [m²]', 'm2', f1, 'min'],
    ];
    const g = 1 - reserve / 100;
    const kopf = l.map((v, k) => `<th class="num">Variante ${k + 1}${v.gesamt <= g ? '' : ' ⚠'}</th>`).join('');
    const text = zeilen.map(([n, fn]) => `<tr><td>${esc(n)}</td>${l.map((v) => `<td class="num">${esc(String(fn(v)))}</td>`).join('')}</tr>`).join('');
    const num = zahlen.map(([n, k, fmt]) => {
      const w = l.map((v) => v[k]).filter((x) => Number.isFinite(x) && x > 0);
      // Hervorgehoben nur, wenn sich die Werte unterscheiden.
      const best = w.length && Math.min(...w) < Math.max(...w) ? Math.min(...w) : null;
      return `<tr><td>${esc(n)}</td>${l.map((v) => `<td class="num${Number.isFinite(v[k]) && v[k] === best && w.length > 1 ? ' dm-bestwert' : ''}${
        k !== 'kg' && k !== 'kgJoch' && k !== 'kgMast' && k !== 'm2' && v[k] > g ? ' warn' : ''}">${fmt(v[k])}</td>`).join('')}</tr>`;
    }).join('');
    return `${abschnitt('Vergleich', `${l.length} Varianten · fett = kleinster Wert`)}
      ${spinneAn ? spinneSvg(l, g) : ''}
      <div class="tabellenrahmen dm-vergleich"><table class="dt"><thead><tr><th></th>${kopf}</tr></thead>
        <tbody>${text}${num}</tbody></table></div>
      <p class="notiz"><button class="btn btn-mini${spinneAn ? ' an' : ''}" type="button" data-dm-spinne>${spinneAn ? 'Spinne aus' : 'Spinne zeigen'}</button>
        <button class="btn btn-mini" type="button" data-dm-vergleich-weg>Auswahl leeren</button></p>`;
  }
  function verdrahteVergleich() {
    const b = box.querySelector('[data-dm-vergleich-weg]');
    if (b) b.onclick = () => { auswahl.clear(); zeige(); };
    const s = box.querySelector('[data-dm-spinne]');
    if (s) {
      s.onclick = () => {
        spinneAn = !spinneAn;
        box.querySelector('#dm-vergleich').innerHTML = vergleichHtml();
        verdrahteVergleich();
      };
    }
  }

  function zeige() {
    const g = 1 - reserve / 100;
    const ok = ergebnis.filter((x) => !x.fehler);
    // Bei gleicher Masse (auf 1 kg) die kleinere Ausnutzung zuerst.
    const halt = ok.filter((x) => x.gesamt <= g && !x.alt)
      .sort((a, b) => Math.round(a.kg ?? 1e9) - Math.round(b.kg ?? 1e9) || a.gesamt - b.gesamt);
    const best = halt[0] ?? null;
    const f3 = (v) => (Number.isFinite(v) ? v.toFixed(3) : '–');
    const kl = (v) => (!Number.isFinite(v) ? '' : v > 1 + 1e-9 ? 'fail' : v > g ? 'warn' : 'ok');
    const reihe = [...ok].sort((a, b) => (a.gesamt <= g) === (b.gesamt <= g)
      ? (a.kg ?? 1e9) - (b.kg ?? 1e9) : (a.gesamt <= g ? -1 : 1));
    const zeile = (x) => {
      const i = ergebnis.indexOf(x);
      return `<tr data-dm-zeile="${i}" class="${x === best ? 'dm-best' : ''}">
        <td><input type="checkbox" data-dm-wahl="${i}"${auswahl.has(i) ? ' checked' : ''} aria-label="zum Vergleich"></td>
        <td>${x.art === 'kombi' ? '★ ' : ''}${esc(variantenText(x, app.werte))}</td>
        <td class="num ${kl(x.joch)}">${f3(x.joch)}</td><td class="num ${kl(x.mast)}">${f3(x.mast)}</td>
        <td class="num ${kl(x.fund)}">${f3(x.fund)}</td><td class="num ${kl(x.gesamt)}"><b>${f3(x.gesamt)}</b></td>
        <td class="num">${Number.isFinite(x.kg) ? x.kg.toFixed(0) : '–'}</td>
        <td class="num">${Number.isFinite(x.m2) ? x.m2.toFixed(1) : '–'}</td>
        <td><button class="btn btn-mini" data-dm-nimm="${i}" type="button">übernehmen</button></td></tr>`;
    };
    const fehler = ergebnis.filter((x) => x.fehler);
    box.querySelector('#dm-ergebnis').innerHTML = `
      ${best ? `<div class="dm-empf">Empfehlung (leichteste Variante mit η ≤ ${g.toFixed(2)}):
        <b>${esc(variantenText(best, app.werte))}</b> · η ${f3(best.gesamt)} · ${best.kg?.toFixed(0) ?? '–'} kg
        <button class="btn btn-mini" data-dm-nimm="${ergebnis.indexOf(best)}" type="button">übernehmen</button></div>`
        : `<div class="dm-empf nok">Keine Variante hält mit η ≤ ${g.toFixed(2)}.</div>`}
      ${abschnitt('Ausnutzung und Materialmasse', `${ok.length} Varianten · Klick auf einen Punkt zeigt die Zeile`)}
      ${diagrammSvg(ok, g, best)}
      <div class="dm-legende">${EINSPANNUNGEN.filter((e) => ergebnis.some((x) => x.einsp === e.key)).map((e) => `<span><i style="background:${e.farbe}"></i>${esc(e.label)}</span>`).join('')}
        <span>○ Joch variiert</span><span>□ Mast variiert</span><span>◆ Kombination</span></div>
      <div id="dm-vergleich">${vergleichHtml()}</div>
      ${abschnitt('Varianten', 'zuerst die, die halten, nach Masse · ankreuzen zum Vergleich')}
      <div class="tabellenrahmen dm-tabelle"><table class="dt">
        <thead><tr><th></th><th>Variante</th><th class="num">η Joch</th><th class="num">η Mast</th><th class="num">η Fundament</th>
          <th class="num">η gesamt</th><th class="num">Masse [kg]</th><th class="num">Oberfläche [m²]</th><th></th></tr></thead>
        <tbody>${reihe.map(zeile).join('')}</tbody></table></div>
      ${fehler.length ? `<p class="notiz">Nicht gerechnet: ${fehler.length} Variante(n) - ${esc(fehler[0].fehler)}</p>` : ''}
      ${ausgelassen.length ? `<details class="dm-aus"><summary>Nicht im Stabwerk gerechnet: ${ausgelassen.length}
        (Vorauswahl η > ${grenzen.etaV.toFixed(2)}: ${ausgelassen.filter((x) => x.grund === 'vorauswahl').length},
        Masse über + ${grenzen.plus} %: ${ausgelassen.filter((x) => x.grund === 'masse').length})</summary>
        <div class="tabellenrahmen"><table class="dt"><thead><tr><th>Variante</th><th class="num">η Kern</th><th>Grund</th></tr></thead>
        <tbody>${ausgelassen.map((x) => `<tr><td>${esc(variantenText(x, app.werte))}</td><td class="num">${f3(x.kern)}</td>
          <td>${x.grund === 'vorauswahl' ? 'Vorauswahl' : 'zu schwer'}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
      <p class="notiz">η Mast enthält das Knicken nach SIA 263, wenn es geführt wird; η gesamt dazu
        Joch, Fundament und Anker. Alte Jochtypen («Bestand») stehen zum Vergleich da, nie in der Empfehlung. Masse = Stäbe des Stabwerks (A · L · ρ), Oberfläche = Umfang · L (scharfkantig). Beide Masten mit demselben Profil;
        das Fundament ist das kleinste, das das Sortiment dem Profil zuordnet.</p>`;
    box.querySelectorAll('[data-dm-nimm]').forEach((b) => {
      b.onclick = () => {
        const v = ergebnis[+b.dataset.dmNimm];
        if (!v) return;
        app.werte = variante(app.werte, v);
        app.neuRechnen();
        app.meldeImBalken(`Übernommen: ${variantenText(v, app.werte)} · Strg+Z nimmt es zurück`);
        b.closest('tr')?.classList.add('uebernommen');
      };
    });
    box.querySelectorAll('[data-dm-wahl]').forEach((c) => {
      c.onchange = () => {
        const i = +c.dataset.dmWahl;
        if (c.checked) auswahl.add(i); else auswahl.delete(i);
        box.querySelector('#dm-vergleich').innerHTML = vergleichHtml();
        verdrahteVergleich();
      };
    });
    verdrahteVergleich();
    box.querySelectorAll('[data-dm-punkt]').forEach((p) => {
      p.addEventListener('click', () => {
        box.querySelectorAll('.dm-gewaehlt').forEach((x) => x.classList.remove('dm-gewaehlt'));
        const tr = box.querySelector(`[data-dm-zeile="${p.dataset.dmPunkt}"]`);
        if (tr) { tr.classList.add('dm-gewaehlt'); tr.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      });
    });
  }
}

/*
 * >>> SPINNE ZUM VERGLEICH (19. November). <<< «kannst du einen spider für
 * den vergleich zuschaltbar machen.» Je angekreuzte Variante ein Polygon.
 * Achsen: η Joch, η Mast, η Fundament, η gesamt auf derselben Skala (Rand =
 * das Grössere aus 1.00 und dem grössten η, Ring bei 1.00 und bei der
 * Grenze der Reserve); Masse gesamt und Oberfläche bezogen auf den grössten
 * Wert der Auswahl (Rand = 100 %). Kleiner ist überall besser.
 */
const SPINNE_FARBEN = ['#7c8de0', '#d6a33c', '#4bbf8a', '#e06a6a', '#b07cd6', '#4ab3c8', '#c88a4a', '#8aa04a'];
export function spinneSvg(liste, grenze = 1) {
  const W = 420, H = 330, cx = W / 2, cy = H / 2 + 6, R = 118;
  const etaMax = Math.max(1, ...liste.flatMap((v) => [v.joch, v.mast, v.fund, v.gesamt]).filter(Number.isFinite));
  const relMax = (k) => Math.max(...liste.map((v) => v[k]).filter((x) => Number.isFinite(x) && x > 0), 1e-9);
  const achsen = [
    { name: 'η Joch', wert: (v) => v.joch / etaMax },
    { name: 'η Mast', wert: (v) => v.mast / etaMax },
    { name: 'η Fundament', wert: (v) => v.fund / etaMax },
    { name: 'η gesamt', wert: (v) => v.gesamt / etaMax },
    { name: 'Masse', wert: (v) => v.kg / relMax('kg') },
    { name: 'Oberfläche', wert: (v) => v.m2 / relMax('m2') },
  ];
  const n = achsen.length;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const ring = (f, cls) => `<polygon class="${cls}" points="${achsen.map((_, i) => pt(i, R * f).map((x) => x.toFixed(1)).join(',')).join(' ')}"/>`;
  const ringe = [0.25, 0.5, 0.75, 1].map((f) => ring(f, 'dm-sp-ring')).join('')
    + ring(1 / etaMax, 'dm-sp-eins') + (grenze < 1 ? ring(grenze / etaMax, 'dm-sp-grenze') : '');
  const strahlen = achsen.map((a, i) => {
    const [x, y] = pt(i, R), [tx, ty] = pt(i, R + 16);
    const anker = Math.abs(tx - cx) < 4 ? 'middle' : tx > cx ? 'start' : 'end';
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="dm-sp-strahl"/>
      <text x="${tx.toFixed(1)}" y="${(ty + 3).toFixed(1)}" text-anchor="${anker}" class="dm-achse">${esc(a.name)}</text>`;
  }).join('');
  const polys = liste.map((v, k) => {
    const f = SPINNE_FARBEN[k % SPINNE_FARBEN.length];
    const pts = achsen.map((a, i) => pt(i, R * Math.max(0, Math.min(1.05, Number.isFinite(a.wert(v)) ? a.wert(v) : 0))));
    return `<g><title>Variante ${k + 1}: ${esc(variantenText(v))}</title>
      <polygon points="${pts.map((p) => p.map((x) => x.toFixed(1)).join(',')).join(' ')}" fill="${f}" fill-opacity="0.12" stroke="${f}" stroke-width="1.8"/>
      ${pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" fill="${f}"/>`).join('')}</g>`;
  }).join('');
  const leg = liste.map((v, k) => `<span><i style="background:${SPINNE_FARBEN[k % SPINNE_FARBEN.length]}"></i>Variante ${k + 1}</span>`).join('');
  return `<div class="dm-spinne"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Vergleich als Spinne">${ringe}${strahlen}${polys}</svg>
    <div class="dm-legende">${leg}</div>
    <p class="notiz">η auf einer Skala bis ${etaMax.toFixed(2)} (Ring rot = 1.00${grenze < 1 ? `, gelb = ${grenze.toFixed(2)}` : ''}); Masse und Oberfläche bezogen auf den grössten Wert der Auswahl. Innen ist besser.</p></div>`;
}

/** Streudiagramm: x = Masse, y = η gesamt; Farbe = Einspannung, Form = Art. */
export function diagrammSvg(liste, grenze, best = null) {
  const W = 620, H = 300, L = 52, R = 14, O = 14, U = 40;
  const xs = liste.map((x) => x.kg).filter(Number.isFinite);
  if (!xs.length) return '<p class="notiz">Keine Werte.</p>';
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x1 - x0 < 1) { x0 -= 10; x1 += 10; }
  const pad = (x1 - x0) * 0.05; x0 -= pad; x1 += pad;
  const y1 = Math.max(1.2, ...liste.map((x) => x.gesamt).filter(Number.isFinite)) * 1.05;
  const X = (v) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v) => O + (1 - v / y1) * (H - O - U);
  const farbe = (e) => EINSPANNUNGEN.find((x) => x.key === e)?.farbe ?? '#999';
  const ticksX = Array.from({ length: 5 }, (_, i) => x0 + ((x1 - x0) * i) / 4);
  const ticksY = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3].filter((v) => v <= y1);
  const punkte = liste.map((x) => {
    if (!Number.isFinite(x.kg) || !Number.isFinite(x.gesamt)) return '';
    const cx = X(x.kg), cy = Y(Math.min(x.gesamt, y1)), f = farbe(x.einsp);
    const i = liste.indexOf(x);
    const titel = `${variantenText(x)} · η ${x.gesamt.toFixed(3)} · ${x.kg.toFixed(0)} kg`;
    const leer = x.gesamt > grenze ? ' fill-opacity="0.25"' : ' fill-opacity="0.85"';
    const rand = x === best ? ' stroke="currentColor" stroke-width="2"' : ` stroke="${f}"`;
    const form = x.art === 'mast' ? `<rect x="${cx - 4}" y="${cy - 4}" width="8" height="8" fill="${f}"${leer}${rand}/>`
      : x.art === 'kombi' ? `<path d="M${cx} ${cy - 7}L${cx + 7} ${cy}L${cx} ${cy + 7}L${cx - 7} ${cy}Z" fill="${f}"${leer}${rand}/>`
      : `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${f}"${leer}${rand}/>`;
    return `<g class="dm-punkt" data-dm-punkt="${i}"><title>${esc(titel)}</title>${form}</g>`;
  }).join('');
  return `<svg class="dm-diagramm" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ausnutzung gegen Materialmasse">
    ${ticksY.map((v) => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="dm-gitter"/>
      <text x="${L - 6}" y="${Y(v) + 3}" text-anchor="end" class="dm-achse">${v.toFixed(2)}</text>`).join('')}
    ${ticksX.map((v) => `<text x="${X(v)}" y="${H - U + 16}" text-anchor="middle" class="dm-achse">${v.toFixed(0)}</text>`).join('')}
    <line x1="${L}" x2="${W - R}" y1="${Y(1)}" y2="${Y(1)}" class="dm-eins"/>
    ${grenze < 1 ? `<line x1="${L}" x2="${W - R}" y1="${Y(grenze)}" y2="${Y(grenze)}" class="dm-grenze"/>` : ''}
    <text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" class="dm-achse">Materialmasse Stabwerk [kg]</text>
    <text x="12" y="${(O + H - U) / 2}" text-anchor="middle" class="dm-achse" transform="rotate(-90 12 ${(O + H - U) / 2})">η gesamt</text>
    ${punkte}</svg>`;
}
