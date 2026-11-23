/*
 * >>> PROJEKTAUSWERTUNG (23. November). <<<
 *
 * Weisung, im Wortlaut: «auswertung projekt ermöglichen mit auflistung der
 * erfüllungsgrade der einwirkungen auf die fundamente effektiv in der liste
 * und einzeln aufgeführt als tragwerksskizze mit benennung der
 * tragwerksbautypen. die idee ist, dass der auftraggeber eine
 * zusammenfassung sieht und die ausnutzung der jeweiligen positionen.»
 * Auf Rückfrage: «Beides» (Blatt zum Drucken und HTML-Datei zum Weitergeben),
 * «Alle Grössen einzeln», «Skizze + η des Tragwerks».
 *
 * Jeder Eintrag eines Projekts der Ablage wird hier gerechnet wie beim
 * Laden: angehoben (`standAnheben`), Kern für die Gestalt, dann das Stabwerk
 * über das ganze Blatt (`rechneStabwerk`) - dieselben Zahlen wie in der App.
 * Gelesen wird nur, was das Stabwerk ohnehin liefert: `fundamentJe`
 * (Ablauf, alle Nachweise), `reihe` (Joche, Masten, Aufhängung), `knick`,
 * `ankerJe`, `reaktionen` und `skizze`. Nichts wird hier neu gerechnet.
 *
 * Das Blatt ist eine eigenständige HTML-Datei: am Bildschirm sortier- und
 * filterbar, gedruckt A4 quer. Dieselbe Datei geht als «HTML sichern» an
 * den Auftraggeber.
 */
import { standAnheben } from './data.anbauteile.js';
import { standardwerte } from './ui.schema.js';
import { rechensatzMitNachbarn, kernArgumente } from './core.nachbarn.js';
import { berechne } from './core.vierendeel.js';
import { rechneStabwerk } from './app.stabwerk.js';
import { skizzeSvg } from './export.reaktionen.js';
import { APP_NAME, sichtbareTragwerke, tragwerksart, tragwerkPos, tragwerkName,
         mastenVon, mastName, mastenFuer, anschlusshoehe, mastAnzeigeKarte, mastAnzeigeText,
         einzelmastenAufgehen } from './core.constants.js';
import { esc } from './design.js';

/** Die Grössen des Fundaments als Spalten der Liste, in dieser Reihenfolge. */
export const PROJEKT_GROESSEN = [
  { key: 'V', kopf: 'V' }, { key: 'Mq', kopf: 'M_q' }, { key: 'Mqver', kopf: 'M_q ver' },
  { key: 'Hq', kopf: 'H_q' }, { key: 'Ml', kopf: 'M_l' }, { key: 'Mlver', kopf: 'M_l ver' },
  { key: 'Hl', kopf: 'H_l' }, { key: 'T', kopf: 'T' },
];

/** Die Ampel der Anwendung: bis 0.90 erfüllt, bis 1.00 knapp, darüber nicht. */
export const ampelVon = (eta) => (!Number.isFinite(eta) ? 'leer' : eta > 1 ? 'fail' : eta > 0.9 ? 'warn' : 'ok');

const zahl = (v, n = 2) => (Number.isFinite(v) ? v.toFixed(n) : '–');

/**
 * Einen Eintrag der Ablage rechnen und auswerten. Wirft nie - ein Fehler
 * steht im Ergebnis (`fehler`), damit ein Eintrag den Lauf nicht abbricht.
 */
export function eintragAuswerten(e) {
  const kopf = { id: e.id, name: e.name ?? '', projekt: e.projekt ?? '' };
  let w;
  // Wie beim Laden: anheben, dann geht ein Einzelmast im Joch auf, das ihn trägt.
  try { w = einzelmastenAufgehen(standAnheben({ ...standardwerte(), ...(e.werte ?? {}) })).werte; } catch (f) {
    return { ...kopf, fehler: `nicht lesbar: ${f?.message ?? f}` };
  }
  const ort = { linie: w.linie ?? '', km: w.km ?? '', ortschaft: w.ortschaft ?? '' };
  let h;
  try {
    const s = rechensatzMitNachbarn(w);
    const erg = berechne(s, ...kernArgumente(s));
    h = rechneStabwerk({ werte: w, letzte: { erg }, stabwerk: null }, { ohneBestand: true });
  } catch (f) {
    return { ...kopf, ...ort, fehler: String(f?.message ?? f) };
  }
  if (!h || h.fehler || h.ohneModell) {
    return { ...kopf, ...ort, fehler: h?.fehler ?? h?.ohneModell ?? 'nicht gerechnet' };
  }
  const karte = mastAnzeigeKarte(w);
  const anz = (n) => mastAnzeigeText(n, karte);
  const sicht = sichtbareTragwerke(w);
  const reihe = h.reihe ?? [];
  const tragwerke = sicht.map((t) => {
    const pos = tragwerkPos(w, t);
    const art = tragwerksart(t);
    const r = reihe.find((x) => x.art === 'tragwerk' && (x.id === t.id || (!x.id && sicht.length === 1)));
    const auf = art.key === 'tragausleger'
      ? reihe.find((x) => x.art === 'aufhaengung') : null;
    // Der Tragausleger heisst nach seiner Länge, nicht nach dem Masten.
    const bau = art.key === 'tragausleger' ? `L ${(Number(t.L) || 0).toFixed(2)} m` : tragwerkName(t, w);
    return { pos, art: art.key === 'tragausleger' ? 'Tragausleger' : art.label, key: art.key, bau,
             eta: r?.eta ?? null, bez: r?.bez ?? '', aufhaengung: auf?.eta ?? null,
             masten: mastenFuer(w, t).map((m) => mastName(w, m)), H: Number(anschlusshoehe(t, 'A')) || 0 };
  });
  const masten = mastenVon(w).map((m) => {
    const name = mastName(w, m);
    const r = reihe.find((x) => x.art === 'mast' && x.id === name);
    const f = h.fundamentJe?.[name] ?? null;
    const anker = h.ankerJe?.[name] ?? null;
    const zeile = (h.reaktionen ?? []).find((z) => z.art === 'mast' && z.id === name);
    return {
      name, anzeige: anz(name), x: Number(m.x) || 0, profil: m.profil ?? w.mastProfil ?? '',
      laenge: Number(m.laenge) || null, steg: m.steg ?? '',
      eta: r?.eta ?? null, bez: r?.bez ?? '', knick: h.knick?.[name]?.eta ?? null,
      anker: anker ? { typ: anker.typ ?? anker.name ?? 'Anker', eta: anker.eta ?? null } : null,
      unterbau: m.unterbau?.an === true,
      fundament: f ? {
        typ: f.typ?.typ ?? String(f.typ ?? ''), eta: f.eta ?? null, ok: f.ok,
        ausgeglichen: f.ausgeglichen === true, stufe: f.stufe ?? null,
        massgebend: f.massgebend ? { was: f.massgebend.was, kurz: f.massgebend.kurz, wert: f.massgebend.wert,
                                     zul: f.massgebend.zul, einheit: f.massgebend.einheit,
                                     bez: f.massgebend.bez } : null,
        nachweise: (f.nachweise ?? []).map((n) => ({ key: n.key, kurz: n.kurz, einheit: n.einheit,
                                                      wert: n.wert, zul: n.zul, eta: n.eta,
                                                      lenkt: n.lenkt === true, bez: n.bez })),
      } : null,
      zeile: zeile ? { x: zeile.x, z: zeile.z } : null,
    };
  });
  return { ...kopf, ...ort, tragwerke, masten, skizze: h.skizze ?? null, reaktionen: h.reaktionen ?? [],
           windKlasse: w.windKlasse ?? '', schnee: w.schneeAktiv === true };
}

/**
 * Die Skizze eines Eintrags mit den Bautypen und den η: über jedem
 * Tragwerk «T1 Tragjoch J90 · 20.00 m · η 0.42», über jedem Masten Profil
 * und Länge mit η, unter jedem Mastfuss Fundamenttyp und η - farbig nach
 * der Ampel, damit die Lage der knappen Positionen sofort zu sehen ist.
 */
export function eintragSkizze(r) {
  if (!r?.skizze?.linien?.length) return '';
  const zeilen = (r.reaktionen ?? []).map((z) => {
    const m = (r.masten ?? []).find((x) => x.name === z.id);
    return { ...z, xModell: z.x, name: z.art === 'mast' ? (m?.anzeige ?? z.id)
      : z.art === 'anker' ? `A${m?.anzeige ?? z.id}` : z.id };
  });
  const lage = new Map(zeilen.filter((z) => z.art === 'mast').map((z) => [z.id, z]));
  // Kopf des Masten aus den Maststäben der Skizze (art 3) an seiner Stelle.
  const kopfZ = (x, z0) => Math.max(z0, ...r.skizze.linien
    .filter((l) => l[4] === 3 && Math.abs(l[0] - x) < 0.35 && Math.abs(l[2] - x) < 0.35)
    .flatMap((l) => [l[1], l[3]]));
  const titel = [];
  (r.tragwerke ?? []).forEach((t) => {
    const xs = t.masten.map((n) => lage.get(n)).filter(Boolean);
    if (!xs.length) return;
    const fuss = xs[0];
    const x = t.key === 'tragausleger' || t.key === 'einzelmast'
      ? fuss.x : xs.reduce((a, b) => a + b.x, 0) / xs.length;
    if (t.key === 'einzelmast') return;      // der Einzelmast steht beim Masten
    const eta = Number.isFinite(t.eta) ? ` · η ${zahl(t.eta)}` : '';
    titel.push({ text: `${t.pos} ${t.art} ${t.bau}${eta}`, x: t.key === 'tragausleger' ? x + 2 : x,
                 z: fuss.z + t.H + 0.6, amp: ampelVon(t.eta) });
  });
  (r.masten ?? []).forEach((m) => {
    const z = lage.get(m.name);
    if (!z) return;
    const e = Math.max(m.eta ?? 0, m.knick ?? 0);
    const len = m.laenge ? ` · ${m.laenge.toFixed(2)} m` : '';
    titel.push({ text: `${m.profil}${len} · η ${zahl(e)}`, x: z.x, z: kopfZ(z.x, z.z) + 0.25, amp: ampelVon(e) });
  });
  const fuss = new Map((r.masten ?? []).filter((m) => m.fundament).map((m) => [m.name,
    { text: `${m.fundament.typ} · η ${zahl(m.fundament.eta)}`, amp: ampelVon(m.fundament.eta) }]));
  return skizzeSvg(r.skizze, zeilen, { breite: 620, hoehe: 290, daten: { titel }, fuss });
}

/* ---------------------------------------------------------------------- */

const STIL = `
  @page { size: A4 landscape; margin: 11mm; }
  body { font: 11px/1.4 system-ui, sans-serif; color: #111; background: #fff; margin: 18px; }
  h1 { font-size: 18px; margin: 0 0 2px; } h2 { font-size: 14px; margin: 18px 0 6px; }
  .unter { color: #555; margin: 0 0 12px; }
  .zus { display: flex; gap: 10px; flex-wrap: wrap; margin: 6px 0 4px; }
  .k { border: 1px solid #d3d6dc; border-radius: 6px; padding: 6px 10px; min-width: 120px; }
  .k b { display: block; font-size: 17px; } .k span { color: #555; font-size: 10px; }
  table { border-collapse: collapse; width: 100%; font-size: 10px; }
  th, td { border: 1px solid #d0d3d8; padding: 3px 5px; vertical-align: top; }
  thead th { background: #eef0f3; text-align: left; font-weight: 600; position: sticky; top: 0; }
  thead th.s { cursor: pointer; user-select: none; } thead th.s:hover { background: #e2e6ec; }
  .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .n small { display: block; color: #666; font-size: 9px; }
  .lenkt { color: #9aa0a8; }
  .ok b, b.ok { color: #1c7a3d; } .warn b, b.warn { color: #a86400; } .fail b, b.fail { color: #b3261e; }
  td.amp { font-weight: 700; } td.amp.ok { color: #1c7a3d; } td.amp.warn { color: #a86400; } td.amp.fail { color: #b3261e; }
  .marke { display: inline-block; padding: 0 5px; border-radius: 3px; font-size: 9px; font-weight: 700; }
  .marke.ok { background: #e3f3e8; color: #1c7a3d; } .marke.warn { background: #fdf0db; color: #a86400; }
  .marke.fail { background: #fbe3e1; color: #b3261e; } .marke.leer { background: #eee; color: #666; }
  .filter { margin: 6px 0; display: flex; gap: 6px; align-items: center; }
  .filter button { font: inherit; border: 1px solid #c8ccd2; background: #fff; border-radius: 4px; padding: 2px 8px; cursor: pointer; }
  .filter button.an { background: #2f3b8f; color: #fff; border-color: #2f3b8f; }
  tr.zeile { cursor: pointer; } tr.zeile:hover td { background: #f5f7fb; }
  .pos { break-inside: avoid; page-break-inside: avoid; border: 1px solid #d3d6dc; border-radius: 6px;
         padding: 8px 10px; margin: 10px 0; }
  .pos h3 { font-size: 12.5px; margin: 0 0 4px; } .pos .ort { color: #666; font-weight: 400; }
  .pos-in { display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap; }
  .pos table { width: auto; min-width: 300px; }
  .fehler { color: #b3261e; }
  .rollen { overflow-x: auto; } @media print { .rollen { overflow: visible; } }
  .fuss { margin-top: 14px; font-size: 9.5px; color: #777; }
  .hinweis { font-size: 9.5px; color: #555; margin: 4px 0; }
  @media print { .filter { display: none; } thead th { position: static; } .bruch { page-break-before: always; } }
`;

/** Die Projektauswertung als eigenständige HTML-Seite. */
export function projektBlattHtml(res, { fassung = '' } = {}) {
  const ok = res.eintraege.filter((r) => !r.fehler);
  const fund = ok.flatMap((r) => (r.masten ?? []).filter((m) => m.fundament)
    .map((m) => ({ r, m, f: m.fundament })));
  const zaehle = (a) => fund.filter((x) => ampelVon(x.f.eta) === a).length;
  const maxF = fund.reduce((b, x) => (!b || (x.f.eta ?? 0) > (b.f.eta ?? 0) ? x : b), null);
  const bauteile = ok.flatMap((r) => [
    ...(r.tragwerke ?? []).map((t) => ({ r, name: `${t.pos} ${t.art}`, eta: Math.max(t.eta ?? 0, t.aufhaengung ?? 0) })),
    ...(r.masten ?? []).map((m) => ({ r, name: `Mast ${m.anzeige}`, eta: Math.max(m.eta ?? 0, m.knick ?? 0, m.anker?.eta ?? 0) }))]);
  const maxB = bauteile.reduce((b, x) => (!b || x.eta > b.eta ? x : b), null);
  const ueberB = bauteile.filter((x) => x.eta > 1);
  const da = new Set();
  fund.forEach((x) => x.f.nachweise.forEach((n) => da.add(n.key)));
  const spalten = PROJEKT_GROESSEN.filter((g) => da.has(g.key));
  const idx = (r) => res.eintraege.indexOf(r);
  const zellen = (f) => spalten.map((g) => {
    const n = f.nachweise.find((x) => x.key === g.key);
    if (!n) return '<td class="n">–</td>';
    const a = n.lenkt ? 'lenkt' : ampelVon(n.eta);
    return `<td class="n ${a}" data-w="${n.lenkt ? -1 : (n.eta ?? 0)}" title="${esc(`${n.kurz}: ${zahl(n.wert)} von ${zahl(n.zul)} ${n.einheit}${n.bez ? ` · ${n.bez}` : ''}${n.lenkt ? ' · lenkt den Ablauf, kein Nachweis' : ''}`)}"><b>${zahl(n.eta)}</b><small>${zahl(n.wert, 1)} / ${zahl(n.zul, 1)}</small></td>`;
  }).join('');
  const zeilen = fund.map(({ r, m, f }) => {
    const a = ampelVon(f.eta);
    return `<tr class="zeile" data-amp="${a}" data-ziel="pos-${idx(r)}">
      <td data-w="${esc(r.name)}">${esc(r.name)}</td><td data-w="${esc(r.km)}">${esc(r.km)}</td>
      <td data-w="${esc(m.anzeige)}"><b>${esc(m.anzeige)}</b></td>
      <td>${esc(m.profil)}${m.laenge ? ` · ${m.laenge.toFixed(2)} m` : ''}</td>
      <td>${esc(f.typ)}</td>
      ${zellen(f)}
      <td title="${esc(f.massgebend?.bez ?? '')}">${esc(f.massgebend?.was ?? '')}${f.massgebend
        ? `<br><small>${zahl(f.massgebend.wert, 1)} / ${zahl(f.massgebend.zul, 1)} ${esc(f.massgebend.einheit ?? '')}</small>` : ''}</td>
      <td class="n amp ${a}" data-w="${f.eta ?? 0}">${zahl(f.eta)}${f.ausgeglichen ? '<small>ausgeglichen</small>' : ''}</td></tr>`;
  }).join('');
  const positionen = res.eintraege.map((r, i) => {
    if (r.fehler) {
      return `<div class="pos" id="pos-${i}"><h3>${esc(r.name)}</h3><p class="fehler">Nicht gerechnet: ${esc(r.fehler)}</p></div>`;
    }
    const tz = (r.tragwerke ?? []).filter((t) => t.key !== 'einzelmast').map((t) => `<tr><td>${esc(t.pos)}</td>
      <td>${esc(t.art)} ${esc(t.bau)}</td><td class="n amp ${ampelVon(t.eta)}">${zahl(t.eta)}</td>
      <td>${t.aufhaengung !== null ? `Aufhängung ${zahl(t.aufhaengung)}` : esc(t.bez ?? '')}</td></tr>`).join('');
    const mz = (r.masten ?? []).map((m) => `<tr><td>${esc(m.anzeige)}</td>
      <td>Mast ${esc(m.profil)}${m.laenge ? ` · ${m.laenge.toFixed(2)} m` : ''}</td>
      <td class="n amp ${ampelVon(Math.max(m.eta ?? 0, m.knick ?? 0))}">${zahl(Math.max(m.eta ?? 0, m.knick ?? 0))}</td>
      <td>${m.knick !== null ? `Querschnitt ${zahl(m.eta)} · Knicken ${zahl(m.knick)}` : ''}${m.anker
        ? ` · ${esc(m.anker.typ)} ${zahl(m.anker.eta)}` : ''}</td></tr>
      <tr><td></td><td>Fundament ${esc(m.fundament?.typ ?? (m.unterbau ? 'Unterbau (nicht nachgewiesen)' : '–'))}</td>
      <td class="n amp ${ampelVon(m.fundament?.eta)}">${zahl(m.fundament?.eta)}</td>
      <td>${esc(m.fundament?.massgebend?.was ?? '')}</td></tr>`).join('');
    return `<div class="pos" id="pos-${i}">
      <h3>${esc(r.name)} <span class="ort">${esc([r.linie && `Linie ${r.linie}`, r.km && `km ${r.km}`, r.ortschaft]
        .filter(Boolean).join(' · '))}</span></h3>
      <div class="pos-in"><div>${eintragSkizze(r)}</div>
        <table><thead><tr><th></th><th>Bauteil</th><th class="n">η</th><th>massgebend</th></tr></thead>
        <tbody>${tz}${mz}</tbody></table></div></div>`;
  }).join('');
  const fehler = res.eintraege.filter((r) => r.fehler);
  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Projektauswertung ${esc(res.projekt)}</title><style>${STIL}</style></head><body>
  <h1>Projektauswertung · Fundamente und Tragwerke</h1>
  <p class="unter"><b>${esc(res.projekt || 'Ohne Projekt')}</b> · ${res.eintraege.length} Einträge
    · ${esc(res.datum)} · ${esc(fassung)}</p>
  <h2>Zusammenfassung</h2>
  <div class="zus">
    <div class="k"><b>${fund.length}</b><span>Fundamente ausgewertet</span></div>
    <div class="k"><b class="ok">${zaehle('ok')}</b><span>η ≤ 0.90</span></div>
    <div class="k"><b class="warn">${zaehle('warn')}</b><span>0.90 &lt; η ≤ 1.00</span></div>
    <div class="k"><b class="fail">${zaehle('fail')}</b><span>η &gt; 1.00</span></div>
    <div class="k"><b class="${ampelVon(maxF?.f.eta)}">${zahl(maxF?.f.eta)}</b><span>grösstes Fundament: ${esc(maxF ? `${maxF.r.name} · ${maxF.m.anzeige}` : '–')}</span></div>
    <div class="k"><b class="${ampelVon(maxB?.eta)}">${zahl(maxB?.eta)}</b><span>grösstes Tragwerksteil: ${esc(maxB ? `${maxB.r.name} · ${maxB.name}` : '–')}</span></div>
  </div>
  ${ueberB.length ? `<p class="hinweis fail"><b>Tragwerksteile mit η &gt; 1.00:</b> ${esc(ueberB.map((x) => `${x.r.name} · ${x.name} ${zahl(x.eta)}`).join(', '))}</p>` : ''}
  ${fehler.length ? `<p class="hinweis fehler"><b>Nicht gerechnet:</b> ${esc(fehler.map((r) => `${r.name} (${r.fehler})`).join('; '))}</p>` : ''}
  <h2>Fundamente – Erfüllungsgrad je Einwirkung</h2>
  <p class="hinweis">Charakteristische Einwirkungen am Mastfuss gegen die zulässigen Standardlasten des Fundamenttyps;
    je Grösse η (darunter Einwirkung / zulässig). Graue Werte lenken den Fundamentablauf und zählen nicht ins η.
    η gesamt nach dem Fundamentablauf. Ampel: bis 0.90 · bis 1.00 · darüber.</p>
  <div class="filter">Zeigen: <button class="an" data-f="alle">alle</button><button data-f="fail">η &gt; 1.00</button>
    <button data-f="warn">0.90-1.00</button><button data-f="ok">≤ 0.90</button>
    <span style="color:#777">· Spaltenkopf sortiert · Zeile springt zur Skizze</span></div>
  <div class="rollen"><table id="liste"><thead><tr><th class="s">Eintrag</th><th class="s">km</th><th class="s">Mast</th><th>Profil</th>
    <th>Fundament</th>${spalten.map((g) => `<th class="s n">${esc(g.kopf)}</th>`).join('')}
    <th>massgebend</th><th class="s n">η</th></tr></thead><tbody>${zeilen}</tbody></table></div>
  <h2 class="bruch">Positionen</h2>
  <p class="hinweis">Je Eintrag die Übersicht quer zum Gleis aus dem Stabmodell, mit Bautyp und η über den Bauteilen
    und Fundamenttyp mit η unter den Mastfüssen (Farbe nach der Ampel).</p>
  ${positionen}
  <p class="fuss">Gerechnet je Eintrag mit dem Stabwerk über das ganze Blatt, mit der gespeicherten Windstufe
    und den gespeicherten Einstellungen. ${esc(APP_NAME)} ${esc(fassung)}.</p>
  <script>
  (function () {
    var t = document.getElementById('liste'); if (!t) return;
    var tb = t.tBodies[0];
    document.querySelectorAll('.filter button').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('.filter button').forEach(function (x) { x.classList.toggle('an', x === b); });
        Array.prototype.forEach.call(tb.rows, function (r) {
          r.style.display = b.dataset.f === 'alle' || r.dataset.amp === b.dataset.f ? '' : 'none'; });
      };
    });
    Array.prototype.forEach.call(t.tHead.rows[0].cells, function (th, i) {
      if (!th.classList.contains('s')) return;
      var ab = th.classList.contains('n');
      th.onclick = function () {
        ab = !ab;
        var rows = Array.prototype.slice.call(tb.rows);
        rows.sort(function (a, b) {
          var x = a.cells[i].dataset.w, y = b.cells[i].dataset.w;
          var nx = parseFloat(x), ny = parseFloat(y);
          var c = isNaN(nx) || isNaN(ny) ? String(x).localeCompare(String(y), 'de', { numeric: true }) : nx - ny;
          return ab ? -c : c;
        });
        rows.forEach(function (r) { tb.appendChild(r); });
      };
    });
    Array.prototype.forEach.call(tb.rows, function (r) {
      r.onclick = function () { var z = document.getElementById(r.dataset.ziel); if (z) z.scrollIntoView({ behavior: 'smooth' }); };
    });
  })();
  </script></body></html>`;
}

/**
 * Alle Einträge eines Projekts nacheinander rechnen, mit Fortschritt und
 * Abbruch; zwischen zwei Einträgen kommt der Browser zum Zeichnen.
 */
export async function projektAuswerten(eintraege, { fortschritt = () => {}, abgebrochen = () => false } = {}) {
  const liste = [];
  for (let i = 0; i < eintraege.length; i += 1) {
    if (abgebrochen()) break;
    fortschritt(i, eintraege.length, eintraege[i].name);
    await new Promise((ok) => setTimeout(ok, 0));
    liste.push(eintragAuswerten(eintraege[i]));
  }
  return { eintraege: liste, abgebrochen: abgebrochen() };
}

