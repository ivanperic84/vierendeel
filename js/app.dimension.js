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
import { mastenFuer, setzeMastAngabe, tragwerksart } from './core.constants.js';
import { tragjoche, laengenbereich, getTragjoch, bauweise } from './data.tragjoche.js';
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
  return w;
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

/** Die Liste der Varianten, Stufe 1 und 2. */
export function variantenListe(w, wahl) {
  const m0 = mastenFuer(w, w).filter(Boolean)[0];
  const einsp = wahl.einspannung ? EINSPANNUNG_VARIIERT : [aktuelleEinspannung(w)];
  const l = [];
  // Nur das heutige Sortiment (19. November): keine Altbauweise, keine Vergleichsmodelle.
  const typen = wahl.joch ? tragjoche().filter((j) => {
    if (bauweise(j) !== 'neu' || j.sortiment === false) return false;
    const b = laengenbereich(j);
    return w.L >= b.min - 1e-9 && w.L <= b.max + 1e-9;
  }) : [];
  const profile = wahl.mast ? mastprofileWahl().filter((p) => !p.gitter && !p.gespreizt)
    .sort((a, b) => (a.g ?? 0) - (b.g ?? 0)) : [];
  const stege = wahl.steg ? STEGRICHTUNGEN.map((s) => s.key) : [m0?.steg ?? w.mastSteg ?? 'jochachse'];
  const plast = wahl.plastisch ? [false, true] : [w.mastPlastisch === true];
  const blech = wahl.blech ? [false, true] : [w.blechPlastisch === true];
  const rh = wahl.rueckhalt ? [false, true] : [w.rueckhaltAn === true];
  einsp.forEach((e) => rh.forEach((r) => {
    typen.forEach((j) => blech.forEach((bp) =>
      l.push({ art: 'joch', einsp: e, rueckhalt: r, typ: j.typ, blech: bp, kgm: j.gewicht ?? null })));
    profile.forEach((p) => stege.forEach((s) => plast.forEach((pl) =>
      l.push({ art: 'mast', einsp: e, rueckhalt: r, profil: p.name, steg: s, plastisch: pl }))));
    if (!typen.length && !profile.length) l.push({ art: 'jetzt', einsp: e, rueckhalt: r, blech: blech[0] });
  }));
  return l;
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
    const j = erg.filter((x) => ok(x) && x.art === 'joch' && x.joch <= grenze)
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

export function dialogDimension(app) {
  if (!app.letzte) return;
  if (tragwerksart(app.werte).key !== 'joch') {
    app.meldeImBalken('Dimensionieren gibt es für das Tragjoch mit Masten.', { dauer: 5000 });
    return;
  }
  let reserve = reserveLesen();
  const wahl = { joch: true, mast: true, steg: true, plastisch: true, einspannung: true, blech: false, rueckhalt: false };
  // Zum Vergleich angekreuzte Varianten (19. November).
  const auswahl = new Set();
  let ergebnis = [];
  let abbruch = false;
  const schalter = (k, t, titel = '') => `<label class="dm-wahl"${titel ? ` title="${esc(titel)}"` : ''}><input type="checkbox" data-dm="${k}"${wahl[k] ? ' checked' : ''}> ${t}</label>`;
  app.dialog('Dimensionieren (Stabwerk)', `
    <div class="dm-kopf">
      ${schalter('joch', 'Jochtyp')}${schalter('mast', 'Mastprofil')}${schalter('steg', 'Mast gedreht')}
      ${schalter('plastisch', 'Mast auch plastisch', 'Jedes Mastprofil zusätzlich mit plastischem Querschnittswiderstand (W_pl, nur Klasse 1/2) rechnen - wie der Schalter «Mast plastisch» unter den Nachweisen. Ohne Haken: wie eingestellt.')}${schalter('blech', 'Bleche plastisch', 'Jeden Jochtyp zusätzlich mit plastisch nachgewiesenen stehenden Blechen rechnen. Ohne Haken: wie eingestellt.')}${schalter('rueckhalt', 'Rückhaltekraft', 'Jede Variante mit und ohne Rückhaltekraft der Leiter (Einstellung unter Lasten). Ohne Haken: wie eingestellt.')}${schalter('einspannung', 'Einspannung', 'Wie gebaut und bis zur Grenze der Hakenschrauben. Voll eingespannt nicht: der Nachweis der Bügelschrauben zählt hier nicht.')}
      <label class="dm-wahl">Reserve <input type="number" id="dm-reserve" min="0" max="50" step="5" value="${reserve}"> %</label>
      <button class="btn" id="dm-los" type="button">Rechnen</button>
      <span class="ablage-meta" id="dm-zahl"></span>
    </div>
    <div class="dm-fort" id="dm-fort" hidden><div id="dm-balken"></div><span id="dm-text"></span>
      <button class="btn btn-mini" id="dm-stopp" type="button">abbrechen</button></div>
    <div id="dm-ergebnis"><p class="notiz">Je Variante rechnet das Stabwerk (rund 1 s je Variante).
      Gerechnet wird auf Kopien; die Eingabe ändert sich erst mit «übernehmen».</p></div>`,
    '<button class="btn" data-zu>Schliessen</button>', 'dialog-breit',
    { beiZu: () => { abbruch = true; } });

  const box = ui.el('ueberlagerung');
  const zahlNeu = () => { box.querySelector('#dm-zahl').textContent = `${variantenListe(app.werte, wahl).length} Varianten + Kombinationen`; };
  box.querySelectorAll('[data-dm]').forEach((c) => { c.onchange = () => { wahl[c.dataset.dm] = c.checked; zahlNeu(); }; });
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
    auswahl.clear();
    const liste = variantenListe(app.werte, wahl);
    const fort = box.querySelector('#dm-fort');
    fort.hidden = false;
    const t0 = performance.now();
    const schritt = async (v, i, n) => {
      box.querySelector('#dm-balken').style.width = `${(100 * i) / n}%`;
      box.querySelector('#dm-text').textContent = `Variante ${i + 1} / ${n} · ${variantenText(v, app.werte)}`;
      await new Promise((r) => setTimeout(r, 0));
      try { ergebnis.push(rechneVariante(app, v)); } catch (e) { ergebnis.push({ ...v, fehler: String(e?.message ?? e) }); }
    };
    for (let i = 0; i < liste.length && !abbruch; i += 1) await schritt(liste[i], i, liste.length);
    if (!abbruch) {
      const k = kombinationen(ergebnis, 1 - reserve / 100);
      for (let i = 0; i < k.length && !abbruch; i += 1) await schritt(k[i], liste.length + i, liste.length + k.length);
    }
    fort.hidden = true;
    box.querySelector('#dm-zahl').textContent = `${ergebnis.length} gerechnet in ${((performance.now() - t0) / 1000).toFixed(0)} s${abbruch ? ' (abgebrochen)' : ''}`;
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
      <div class="tabellenrahmen dm-vergleich"><table class="dt"><thead><tr><th></th>${kopf}</tr></thead>
        <tbody>${text}${num}</tbody></table></div>
      <p class="notiz"><button class="btn btn-mini" type="button" data-dm-vergleich-weg>Auswahl leeren</button></p>`;
  }
  function verdrahteVergleich() {
    const b = box.querySelector('[data-dm-vergleich-weg]');
    if (b) b.onclick = () => { auswahl.clear(); zeige(); };
  }

  function zeige() {
    const g = 1 - reserve / 100;
    const ok = ergebnis.filter((x) => !x.fehler);
    // Bei gleicher Masse (auf 1 kg) die kleinere Ausnutzung zuerst.
    const halt = ok.filter((x) => x.gesamt <= g)
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
      <p class="notiz">η Mast enthält das Knicken nach SIA 263, wenn es geführt wird; η gesamt dazu
        Joch, Fundament und Anker. Masse = Stäbe des Stabwerks (A · L · ρ), Oberfläche = Umfang · L (scharfkantig). Beide Masten mit demselben Profil;
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
