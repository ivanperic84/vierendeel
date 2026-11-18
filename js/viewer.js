/**
 * viewer.js - die Laufzeit der Viewer-Datei (18. November).
 *
 * Weisung: «als viewer stelle ich mir eine html ausleitung vor wo man das
 * modell betrachten kann und der bericht enthalten ist, alles hardcoded»;
 * «ist es auch möglich den bericht interaktiv zu gestalten wo man die auf
 * die jeweiligen abbildungen klicken kann und man dann zu der 3d switcht
 * dynamisch? zustäzlich noch die verwendeten tragwersteile mit den
 * dazugehörigen querschnitten und einem Massenauszug aufführen.»
 *
 * Wird NICHT in die Anwendung gebündelt, sondern für sich (build_html.py
 * schreibt js/viewer.laufzeit.js); app.viewer.js setzt die Daten ein. Die
 * Datei rechnet nichts: sie zeigt die Szene, die die Anwendung gebaut hat,
 * mit dem Renderer der Anwendung, und tauscht je Lastfall die Werte der
 * Flächen aus. Drei Reiter: Modell, Bericht, Bauteile.
 */
import { Modellansicht, PLOTS, ANSICHTEN } from './render.3d.js';
import { etaFarbe } from './design.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const zahl = (v, n = 2) => (Number.isFinite(Number(v)) && v !== null ? Number(v).toFixed(n) : '—');
const ampel = (eta) => (!Number.isFinite(eta) ? '' : eta > 1 + 1e-9 ? 'fail' : eta > 0.9 ? 'warn' : 'ok');

/** Die Mastnummer statt M1 (wie mastAnzeigeText in core.constants.js). */
function anzeigeTextVon(karte) {
  const k = new Map(karte ?? []);
  return (s) => (!k.size || s === null || s === undefined ? s
    : String(s).replace(/\b(MT?\d+)\b/g, (t) => k.get(t) ?? t));
}

const ANSICHT_NAMEN = { iso: 'Isometrie', laengs: 'Längs', quer: 'Quer', oben: 'Draufsicht' };
const EBENEN = [
  ['profil', 'Gurte'], ['blechSteh', 'Stehende Bleche'], ['blechLieg', 'Liegende Bleche'],
  ['mast', 'Masten'], ['anbau', 'Anbauteile'], ['last', 'Lasten'], ['achse', 'Achsen'], ['masse', 'Masse'],
];

export function starte(daten) {
  const thema = (() => { try { return localStorage.getItem('vierendeel-viewer-thema'); } catch { return null; } })()
    ?? (matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dunkel' : 'hell');
  document.documentElement.dataset.thema = thema;
  const U = daten.urteil ?? {};
  document.body.innerHTML = `
    <header class="v-kopf">
      <span class="v-titel">${esc(daten.titel)}</span>
      ${daten.ort ? `<span class="v-ort">${esc(daten.ort)}</span>` : ''}
      ${Number.isFinite(U.eta) ? `<span class="v-urteil ${ampel(U.eta)}" title="Tragsicherheit über das ganze Blatt, massgebend: ${esc(U.massgebend ?? '')}">
        Tragsicherheit η ${zahl(U.eta, 3)}${U.massgebend ? ` · ${esc(U.massgebend)}` : ''}</span>` : ''}
      <nav class="v-reiter" role="tablist">
        <button role="tab" data-seite="modell" aria-selected="true">Modell</button>
        <button role="tab" data-seite="bericht" aria-selected="false">Bericht</button>
        <button role="tab" data-seite="bauteile" aria-selected="false">Bauteile und Massen</button>
      </nav>
      <button class="v-knopf" id="v-thema" title="Hell / dunkel">◐</button>
    </header>
    <main class="v-seite an" id="seite-modell">
      <aside class="v-leiste" id="v-leiste"></aside>
      <div class="v-buehne">
        <canvas id="v-canvas"></canvas>
        <div class="v-info" id="v-info"></div>
        <button class="v-zurueck" id="v-zurueck">‹ zurück zum Bericht</button>
        <div class="v-legende" id="v-legende"></div>
        <div class="v-hinweis">Ziehen dreht, rechte Taste oder zwei Finger schieben, Rad oder Spreizen zoomt.
          Klick auf ein Bauteil zeigt seine Werte.</div>
      </div>
    </main>
    <main class="v-seite" id="seite-bericht"><div class="v-bericht">
      <div class="v-bericht-leiste"><button class="v-knopf" id="v-drucken">Bericht drucken / als PDF</button>
        <span>Bilder mit Rahmen anklicken: das Modell zeigt dieselbe Ansicht.</span></div>
      <iframe id="v-iframe" title="Nachweisbericht"></iframe></div></main>
    <main class="v-seite" id="seite-bauteile"><div class="v-bauteile" id="v-bauteile"></div></main>
    <footer class="v-fuss">${esc(daten.fassung)} · ausgeleitet ${esc(daten.datum)} · Viewer: zeigt die
      gerechneten Ergebnisse, rechnet nicht.</footer>`;

  // --- Modell -------------------------------------------------------------
  const ansicht = new Modellansicht($('v-canvas'), {
    beiAuswahl: (_st, f) => info(f),
    beiTragwerk: () => {},
  });
  ansicht.anzeigeText = anzeigeTextVon(daten.karte);
  const szene = daten.szene;
  // Die Werte der Hülle, um nach einem Lastfall dorthin zurückzukehren.
  const huelle = szene.flaechen.map((f) => (f.werte ? { ...f.werte } : null));
  const verformt = daten.verformt ?? null;
  ansicht.verformt = verformt;
  ansicht.setzeSzene(szene, false);

  const plots = [...PLOTS.filter((p) => szene.flaechen.some((f) => Number.isFinite(f.werte?.[p.feld]))),
    { key: 'positionen', label: 'Positionen' }, { key: 'neutral', label: 'Bauteile (ohne Werte)' }];
  let fall = 'huelle';

  $('v-leiste').innerHTML = `
    <div class="v-gruppe"><h4>Blick</h4><div class="v-blicke">${ANSICHTEN.filter((a) => ANSICHT_NAMEN[a.key])
      .map((a) => `<button data-blick="${a.key}">${ANSICHT_NAMEN[a.key]}</button>`).join('')}</div></div>
    <div class="v-gruppe"><h4>Darstellung</h4><select id="v-plot">${plots
      .map((p) => `<option value="${p.key}">${esc(p.label)}</option>`).join('')}</select>
      <label class="v-schalter"><input type="checkbox" id="v-werte"> Werte anschreiben</label></div>
    <div class="v-gruppe"><h4>Lastfall</h4><select id="v-fall">
      <option value="huelle">umhüllend (alle Nachweisfälle)</option>
      ${(daten.faelle ?? []).map((l, i) => `<option value="${i}">${esc(l.bez)}</option>`).join('')}</select></div>
    <div class="v-gruppe"><h4>Ebenen</h4>${EBENEN.map(([k, t]) =>
      `<label class="v-schalter"><input type="checkbox" data-ebene="${k}" checked> ${t}</label>`).join('')}</div>
    <div class="v-gruppe"><h4>Explosion</h4><input type="range" id="v-explosion" min="0" max="100" step="5" value="0"></div>
    <div class="v-gruppe"><button class="v-knopf" id="v-ganz" style="width:100%">Ganzes Modell</button></div>`;

  const zeichne = () => { ansicht._bereichCache = null; ansicht.zeichne(); legende(); };
  const blick = (k) => {
    ansicht.blickrichtung(k);
    document.querySelectorAll('[data-blick]').forEach((b) => b.classList.toggle('an', b.dataset.blick === k));
  };
  document.querySelectorAll('[data-blick]').forEach((b) => { b.onclick = () => blick(b.dataset.blick); });
  const setzeModus = (m) => { ansicht.modus = m; $('v-plot').value = m; zeichne(); };
  $('v-plot').onchange = (e) => setzeModus(e.target.value);
  $('v-werte').onchange = (e) => { ansicht.werteAnschreiben = e.target.checked; zeichne(); };
  $('v-explosion').oninput = (e) => { ansicht.explosion = Number(e.target.value) / 100; zeichne(); };
  $('v-ganz').onclick = () => ansicht.schwenkeAufsGanze?.(ansicht.ansichtKey ?? 'iso');
  document.querySelectorAll('[data-ebene]').forEach((c) => {
    c.onchange = () => { ansicht.ebenen[c.dataset.ebene] = c.checked; zeichne(); };
  });
  $('v-fall').onchange = (e) => setzeFall(e.target.value);

  /** Die Werte eines Lastfalls auf die Flächen legen (oder die Hülle zurück). */
  function setzeFall(key) {
    fall = key;
    const l = key === 'huelle' ? null : daten.faelle[Number(key)];
    szene.flaechen.forEach((f, i) => {
      if (!huelle[i]) return;
      if (!l) { f.werte = { ...huelle[i] }; return; }
      const a = l.idx[i] >= 0 ? l.tab[l.idx[i]] : null;
      const w = { ...huelle[i] };
      daten.felder.forEach((feld, k) => { w[feld] = a ? a[k] : null; });
      f.werte = w;
    });
    // Die verformte Figur gehört zur Hülle (massgebender Fall der Gebrauchstauglichkeit).
    ansicht.verformt = l ? null : verformt;
    $('v-fall').value = key;
    zeichne();
  }

  function legende() {
    const s = ansicht.plotSkala();
    const el = $('v-legende');
    if (!s) { el.style.display = 'none'; return; }
    el.style.display = '';
    const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => `${etaFarbe(t * 1.25)} ${t * 100}%`).join(',');
    const lf = fall === 'huelle' ? 'umhüllend' : daten.faelle[Number(fall)]?.bez;
    el.innerHTML = `<b>${esc(s.label)}</b>${s.einheit && s.einheit !== '–' ? ` [${esc(s.einheit)}]` : ''}
      <div class="rampe" style="background:linear-gradient(90deg,${stops})"></div>
      <div class="skala"><span>0</span><span>${zahl(s.max / 2, s.nk ?? 2)}</span><span>${zahl(s.max, s.nk ?? 2)}</span></div>
      <div style="color:var(--dim);margin-top:4px">${esc(lf ?? '')}</div>`;
  }

  function info(f) {
    const el = $('v-info');
    if (!f) { el.classList.remove('an'); return; }
    const w = f.werte ?? {};
    const zeilen = PLOTS.filter((p) => Number.isFinite(w[p.feld]))
      .map((p) => `<tr><td>${esc(p.kurz)}</td><td>${zahl(w[p.feld], p.nk ?? 2)} ${p.einheit !== '–' ? esc(p.einheit) : ''}</td></tr>`).join('');
    el.innerHTML = `<b>${esc(ansicht.anzeigeText(f.label ?? f.teil ?? 'Bauteil'))}</b>
      ${zeilen ? `<table>${zeilen}</table>` : '<div style="color:var(--dim)">ohne Werte</div>'}
      <div style="color:var(--dim);margin-top:4px">${esc(fall === 'huelle' ? 'umhüllend' : daten.faelle[Number(fall)]?.bez)}</div>`;
    el.classList.add('an');
  }

  // --- Reiter -------------------------------------------------------------
  let zurueckZu = null;
  const reiter = (seite) => {
    document.querySelectorAll('[data-seite]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.seite === seite)));
    document.querySelectorAll('.v-seite').forEach((s) => s.classList.toggle('an', s.id === `seite-${seite}`));
    if (seite === 'modell') requestAnimationFrame(() => { ansicht.passeGroesseAn?.(); zeichne(); });
    if (seite !== 'modell') $('v-zurueck').classList.remove('an');
  };
  document.querySelectorAll('[data-seite]').forEach((b) => { b.onclick = () => reiter(b.dataset.seite); });
  $('v-thema').onclick = () => {
    const t = document.documentElement.dataset.thema === 'dunkel' ? 'hell' : 'dunkel';
    document.documentElement.dataset.thema = t;
    try { localStorage.setItem('vierendeel-viewer-thema', t); } catch { /* egal */ }
    zeichne();
  };

  // --- Bericht: Klick auf ein Bild zeigt dieselbe Ansicht im Modell -------
  const iframe = $('v-iframe');
  iframe.addEventListener('load', () => {
    const doc = iframe.contentDocument;
    if (!doc) return;
    const st = doc.createElement('style');
    st.textContent = `[data-ansicht]{cursor:pointer;outline:1px dashed #3e63c8;outline-offset:3px;position:relative}
      [data-ansicht]:hover{outline:2px solid #3e63c8}
      [data-ansicht]::after{content:"im Modell zeigen ›";position:absolute;right:4px;top:4px;font:11px system-ui;
        color:#fff;background:#3e63c8;border-radius:4px;padding:2px 6px;opacity:0;transition:opacity .15s}
      [data-ansicht]:hover::after{opacity:1}
      @media print{[data-ansicht]{outline:0}[data-ansicht]::after{display:none}}`;
    doc.head.appendChild(st);
    doc.querySelectorAll('[data-ansicht]').forEach((el) => {
      el.title = 'Klicken: dieselbe Ansicht im Modell';
      el.addEventListener('click', () => {
        let a = null;
        try { a = JSON.parse(el.dataset.ansicht); } catch { return; }
        zurueckZu = { el, scroll: doc.scrollingElement?.scrollTop ?? 0 };
        zeigeAnsicht(a);
      });
    });
  });
  iframe.srcdoc = daten.bericht ?? '<p>Kein Bericht.</p>';
  $('v-drucken').onclick = () => iframe.contentWindow?.print();
  $('v-zurueck').onclick = () => {
    reiter('bericht');
    const z = zurueckZu;
    if (z) requestAnimationFrame(() => z.el.scrollIntoView({ block: 'center' }));
  };

  /** Eine Ansichtsangabe des Berichts anwenden (Blick, Plot, Lastarten). */
  function zeigeAnsicht(a) {
    reiter('modell');
    setzeFall('huelle');
    if (a.modus && [...$('v-plot').options].some((o) => o.value === a.modus)) setzeModus(a.modus);
    else setzeModus('eta');
    const lasten = Array.isArray(a.lasten) ? a.lasten : null;
    ansicht.ebenen.last = Boolean(lasten);
    Object.keys(ansicht.lastarten).forEach((k) => { ansicht.lastarten[k] = !lasten || lasten.includes(k); });
    const cb = document.querySelector('[data-ebene="last"]');
    if (cb) cb.checked = ansicht.ebenen.last;
    $('v-explosion').value = 0; ansicht.explosion = 0;
    requestAnimationFrame(() => { blick(a.blick ?? 'iso'); zeichne(); });
    $('v-zurueck').classList.add('an');
  }

  // --- Bauteile und Massen -----------------------------------------------
  const m = daten.massen;
  const cm2 = (v) => zahl(v * 1e4, 2), cm4 = (v) => zahl(v * 1e8, 1);
  $('v-bauteile').innerHTML = `
    <h3>Ausnutzung je Bauteil</h3>
    <table><thead><tr><th>Bauteil</th><th>η</th><th>massgebender Fall</th></tr></thead><tbody>
      ${(U.liste ?? []).map((x) => `<tr><td>${esc(ansicht.anzeigeText(x.name))}</td>
        <td class="z" style="color:var(--${ampel(x.eta) || 'dim'})">${zahl(x.eta, 3)}</td><td>${esc(x.bez ?? '')}</td></tr>`).join('')}
    </tbody></table>
    ${m?.zeilen?.length ? `<h3>Tragwerksteile, Querschnitte und Massen</h3>
    <p class="notiz">Die Stäbe des Stabwerks (A · L · ρ, ρ = ${zahl(m.rho, 0)} kg/m³), dieselbe Masse wie das
      Eigengewicht der Rechnung. Ohne Anschlusswinkel, Laschen, Schrauben, Fussplatten und Anbauteile.
      Die Stäbe der Gurte sind Rechenabschnitte, keine Stückzahl.</p>
    <table><thead><tr><th>Bauteil</th><th>Teil</th><th>Querschnitt</th><th>A [cm²]</th><th>I_y [cm⁴]</th>
      <th>I_z [cm⁴]</th><th>Stäbe</th><th>Länge [m]</th><th>Masse [kg]</th></tr></thead><tbody>
      ${m.zeilen.map((z) => `<tr><td>${esc(z.bauteil)}</td><td>${esc(z.rolle)}</td><td>${esc(z.profil)}</td>
        <td class="z">${cm2(z.A)}</td><td class="z">${cm4(z.Iy)}</td><td class="z">${cm4(z.Iz)}</td>
        <td class="z">${z.staebe}</td><td class="z">${zahl(z.laenge, 2)}</td><td class="z">${zahl(z.kg, 1)}</td></tr>`).join('')}
    </tbody></table>
    <h3>Massen je Bauteil</h3>
    <table><thead><tr><th>Bauteil</th><th>Stablänge [m]</th><th>Masse [kg]</th></tr></thead><tbody>
      ${m.bauteile.map((b) => `<tr><td>${esc(b.name)}</td><td class="z">${zahl(b.laenge, 2)}</td><td class="z">${zahl(b.kg, 1)}</td></tr>`).join('')}
      <tr><td><b>Total</b></td><td class="z"><b>${zahl(m.total.laenge, 2)}</b></td><td class="z"><b>${zahl(m.total.kg, 1)}</b></td></tr>
    </tbody></table>` : '<p class="notiz">Kein Massenauszug.</p>'}`;

  window.addEventListener('resize', () => { ansicht.passeGroesseAn?.(); zeichne(); });
  requestAnimationFrame(() => { ansicht.passeGroesseAn?.(); blick('iso'); setzeModus('eta'); });
  return { ansicht, setzeFall, zeigeAnsicht };
}

// Ohne Datenblock (Prüfstand, Modulversion) nichts starten.
if (typeof document !== 'undefined') {
  const el = document.getElementById('viewer-daten');
  if (el) {
    try { window.__viewer = starte(JSON.parse(el.textContent)); }
    catch (e) { document.body.textContent = `Der Viewer liess sich nicht öffnen: ${e.message}`; }
  }
}
