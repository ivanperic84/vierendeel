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
import { Modellansicht, PLOTS, ANSICHTEN, LASTARTEN } from './render.3d.js';
import { etaFarbe } from './design.js';
import { zustandBauen, ZL_AUS_MODUS } from './core.zustandwerte.js';

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
        <button role="tab" data-seite="bauteile" aria-selected="false">Nachweise und Massen</button>
      </nav>
      <button class="v-knopf" id="v-thema" title="Hell / dunkel">◐</button>
    </header>
    ${(daten.kennwerte ?? []).length ? `<div class="v-kennwerte" title="Grundwerte des Querprofils">${
      esc(daten.kennwerte.join(' · '))}</div>` : ''}
    <main class="v-seite an" id="seite-modell">
      <aside class="v-leiste" id="v-leiste"></aside>
      <div class="v-buehne">
        <canvas id="v-canvas"></canvas>
        <div class="v-info" id="v-info"></div>
        <button class="v-zurueck" id="v-zurueck">‹ zurück zum Bericht</button>
        <div class="v-legende" id="v-legende"></div>
        <label class="v-explo" title="Explosion: Teile auseinanderziehen (nur das Bild)">Explosion
          <input type="range" id="v-explosion" min="0" max="100" step="5" value="0"></label>
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
  // Voreinstellung ohne Lasten (19. November).
  ansicht.ebenen.last = false;

  // «Bauteile (ohne Werte)» weg (21. November); Positionen mit Legende.
  const plots = [...PLOTS.filter((p) => szene.flaechen.some((f) => Number.isFinite(f.werte?.[p.feld]))),
    { key: 'positionen', label: 'Positionen' }];
  let fall = 'huelle';
  /*
   * DIE ZUSTANDSLINIE (19. November, «darstellungsbutton liniendiagramm / bei
   * der explosion das liniendiagramm auch darstellen»): dieselbe Funktion wie
   * in der Anwendung (zustandBauen), aus den Schnittgrössen der Nachweisfälle,
   * die die Datei trägt. Der Renderer zeichnet sie auch explodiert.
   */
  const zDaten = daten.zustand ?? null;
  const zFaelle = zDaten ? zDaten.faelle.map((f) => ({
    key: f.key, bez: f.bez, sig: f.sig,
    w: f.w.map((flach) => Array.from({ length: zDaten.punkte }, (_, p) => flach.slice(p * 6, p * 6 + 6))),
  })) : [];
  let linie = false;

  $('v-leiste').innerHTML = `
    <div class="v-gruppe"><h4>Blick</h4><div class="v-blicke">${ANSICHTEN.filter((a) => ANSICHT_NAMEN[a.key])
      .map((a) => `<button data-blick="${a.key}">${ANSICHT_NAMEN[a.key]}</button>`).join('')}</div></div>
    <div class="v-gruppe"><h4>Darstellung</h4><select id="v-plot">${plots
      .map((p) => `<option value="${p.key}">${esc(p.label)}</option>`).join('')}</select>
      <label class="v-schalter"><input type="checkbox" id="v-werte"> Werte anschreiben</label>
      ${zDaten ? `<label class="v-schalter" title="Zustandslinie statt Farbe (η, σ_v, M, V, N, T), auch in der Explosion"><input type="checkbox" id="v-linie"> Liniendiagramm</label>` : ''}</div>
    <div class="v-gruppe"><h4>Ausnutzung je Bauteil</h4><div class="v-aus" id="v-aus"></div></div>
    <div class="v-gruppe"><h4>Lastfall</h4><select id="v-fall">
      <option value="huelle">umhüllend (alle Nachweisfälle)</option>
      ${(daten.faelle ?? []).map((l, i) => `<option value="${i}">${esc(l.gruppe ? `${l.gruppe}: ` : '')}${esc(l.bez)}${
        Number.isFinite(l.eta) ? ` · η ${zahl(l.eta, 2)}` : Number.isFinite(l.wMax) ? ` · w ${zahl(l.wMax, 0)} mm` : ''}</option>`).join('')}</select>
      <div class="v-notiz">je Einwirkungsrichtung der massgebende Fall</div></div>
    <div class="v-gruppe"><h4>Teilmodell</h4><div class="v-blicke">
      ${[['alles', 'Alles'], ['joch', 'Jochträger'], ['mast', 'Masten']].map(([k, t]) =>
        `<button data-teilmodell="${k}"${k === 'alles' ? ' class="an"' : ''}>${t}</button>`).join('')}</div>
      <div class="v-notiz">wirkt auf Farben, Skala und Liniendiagramm</div></div>
    <div class="v-gruppe"><h4>Ebenen</h4>${EBENEN.map(([k, t]) =>
      `<label class="v-schalter"><input type="checkbox" data-ebene="${k}"${k === 'last' ? '' : ' checked'}> ${t}</label>`).join('')}
      <div class="v-lastarten" id="v-lastarten">${LASTARTEN.map((l) =>
        `<label class="v-schalter v-lastart"><input type="checkbox" data-lastart="${l.key}" checked> ${esc(l.label)}</label>`).join('')}</div></div>
    <div class="v-gruppe"><button class="v-knopf" id="v-ganz" style="width:100%">Ganzes Modell</button></div>`;

  function zustandNeu() {
    const g = ZL_AUS_MODUS[ansicht.modus];
    if (!linie || !zDaten || !g) { ansicht.zustand = null; return; }
    const l = fall === 'huelle' ? null : daten.faelle[Number(fall)];
    const fs = l ? zFaelle.filter((f) => f.key === l.key) : zFaelle;
    // Die Linie folgt den Ebenen bzw. dem Teilmodell (21. November).
    const e = ansicht.ebenen;
    const sicht = (s) => {
      if (s.r === 'mast' || /(^|_)(ANKER|SEILKOPF|ANKERGELENK)/.test(s.n ?? '')) return e.mast !== false;
      if (/^gurt/.test(s.r ?? '')) return e.profil !== false;
      if (s.r === 'blech') return e.blechSteh !== false || e.blechLieg !== false;
      return true;
    };
    ansicht.zustand = fs.length ? zustandBauen({ geo: zDaten.geo, aussen: zDaten.aussen, faelle: fs, groesse: g,
      eb: 'auto', sicht, dx: zDaten.versatz?.dx ?? 0, dz: zDaten.versatz?.dz ?? 0, fyd: zDaten.fyd }) : null;
  }
  const zeichne = () => { zustandNeu(); ansicht._bereichCache = null; ansicht.zeichne(); legende(); };
  // Eingepasst auf das ganze Modell (21. November, «die blickrichtungen sind
  // nicht sauber ausgerichtet»): derselbe Schwenk wie «Ganzes Modell».
  const blick = (k) => {
    if (ansicht.schwenkeAufsGanze) ansicht.schwenkeAufsGanze(k); else ansicht.blickrichtung(k);
    document.querySelectorAll('[data-blick]').forEach((b) => b.classList.toggle('an', b.dataset.blick === k));
  };
  document.querySelectorAll('[data-blick]').forEach((b) => { b.onclick = () => blick(b.dataset.blick); });
  const setzeModus = (m) => { ansicht.modus = m; $('v-plot').value = m; zeichne(); };
  $('v-plot').onchange = (e) => setzeModus(e.target.value);
  $('v-werte').onchange = (e) => { ansicht.werteAnschreiben = e.target.checked; zeichne(); };
  if ($('v-linie')) $('v-linie').onchange = (e) => { linie = e.target.checked; zeichne(); };
  $('v-explosion').oninput = (e) => { ansicht.explosion = Number(e.target.value) / 100; zeichne(); };
  $('v-ganz').onclick = () => ansicht.schwenkeAufsGanze?.(ansicht.ansichtKey ?? 'iso');
  const lastartenZeigen = () => { $('v-lastarten').style.display = ansicht.ebenen.last ? '' : 'none'; };
  document.querySelectorAll('[data-ebene]').forEach((c) => {
    c.onchange = () => { ansicht.ebenen[c.dataset.ebene] = c.checked; lastartenZeigen(); zeichne(); };
  });
  // Lastarten einzeln (21. November, «lasten darstellung auswählbar machen»).
  document.querySelectorAll('[data-lastart]').forEach((c) => {
    c.onchange = () => { ansicht.lastarten[c.dataset.lastart] = c.checked; zeichne(); };
  });
  lastartenZeigen();
  /*
   * >>> TEILMODELL (21. November). <<< «Teilmodelle auswahl (masten /
   * jochträger) sollte sich auf die plots der spannungen und deren massstab
   * auswirken.» Schaltet die Ebenen; Skala und Linie rechnen nur mit dem,
   * was zu sehen ist.
   */
  const TEIL_EBENEN = { alles: { profil: true, blechSteh: true, blechLieg: true, mast: true },
    joch: { profil: true, blechSteh: true, blechLieg: true, mast: false },
    mast: { profil: false, blechSteh: false, blechLieg: false, mast: true } };
  document.querySelectorAll('[data-teilmodell]').forEach((b) => {
    b.onclick = () => {
      Object.assign(ansicht.ebenen, TEIL_EBENEN[b.dataset.teilmodell]);
      document.querySelectorAll('[data-teilmodell]').forEach((x) => x.classList.toggle('an', x === b));
      document.querySelectorAll('[data-ebene]').forEach((c) => { c.checked = ansicht.ebenen[c.dataset.ebene] !== false; });
      ansicht._bereichCache = null;
      zeichne();
    };
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
    // Die verformte Figur gehört zur Hülle (massgebender Fall der Gebrauchstauglichkeit);
    // der Fall der Gebrauchstauglichkeit bringt seine eigene mit (21. November).
    ansicht.verformt = l ? (l.verformt ?? null) : verformt;
    $('v-fall').value = key;
    if (l?.gruppeKey === 'gzg' && [...$('v-plot').options].some((o) => o.value === 'w')) { setzeModus('w'); return; }
    zeichne();
  }

  function legende() {
    const el = $('v-legende');
    const lf = fall === 'huelle' ? 'umhüllend' : daten.faelle[Number(fall)]?.bez;
    const z = ansicht.zustand;
    if (z) {
      const f = (v) => (z.k === 'eta' ? v.toFixed(3) : Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2));
      const e = z.einheit ? ` ${z.einheit}` : '';
      el.style.display = '';
      el.innerHTML = `<b>Liniendiagramm ${esc(z.name)}</b>
        ${z.mg ? `<div style="margin-top:4px"><b>${esc(f(z.mg.v) + e)}</b> · ${esc(ansicht.anzeigeText(z.mg.wo))}</div>` : ''}
        ${z.gg ? `<div style="color:var(--dim)">Gegenwert ${esc(f(z.gg.v) + e)} · ${esc(ansicht.anzeigeText(z.gg.wo))}</div>` : ''}
        <div style="color:var(--dim);margin-top:4px">rot positiv, blau negativ · ${esc(lf ?? '')}</div>`;
      return;
    }
    // Positionen: Legende der Bauteile mit Farbe (21. November); Klick zeigt den Querschnitt.
    if (ansicht.modus === 'positionen') {
      const je = new Map();
      szene.flaechen.forEach((f) => {
        if (!f.farbeBauteil || (ansicht._flaecheAn && !ansicht._flaecheAn(f))) return;
        const name = ansicht.anzeigeText(String(f.label ?? f.teil ?? '').split(' · ')[0]);
        const k = `${f.farbeBauteil}|${name}`;
        if (!je.has(k)) je.set(k, { farbe: f.farbeBauteil, name });
      });
      const zeilen = [...je.values()].slice(0, 18);
      el.style.display = zeilen.length ? '' : 'none';
      el.innerHTML = `<b>Positionen</b>${zeilen.map((z) => `<div class="v-pos"><i style="background:${esc(z.farbe)}"></i>${esc(z.name)}</div>`).join('')}
        <div style="color:var(--dim);margin-top:4px">Klick auf ein Bauteil zeigt seinen Querschnitt</div>`;
      return;
    }
    const s = ansicht.plotSkala();
    if (!s) { el.style.display = 'none'; return; }
    el.style.display = '';
    /*
     * η: der Balken endet bei 1.0 (19. November, «die grenze bei der
     * ausnutzung beim farbbalken bei 1.0 setezen nicht 1.25») - was darüber
     * liegt, steht rot. Die Farben im Modell bleiben dieselben.
     */
    const bis = s.fest ? 1 : 1.25;
    const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => `${etaFarbe(t * bis)} ${t * 100}%`).join(',');
    const max = s.fest ? 1 : s.max;
    el.innerHTML = `<b>${esc(s.label)}</b>${s.einheit && s.einheit !== '–' ? ` [${esc(s.einheit)}]` : ''}
      <div class="rampe" style="background:linear-gradient(90deg,${stops})"></div>
      <div class="skala"><span>0</span><span>${zahl(max / 2, s.nk ?? 2)}</span><span>${s.fest ? '≥ 1.00' : zahl(max, s.nk ?? 2)}</span></div>
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
  const fu = daten.fundamente ?? [];
  const STUFE = { basis: 'Basiswerte eingehalten', angepasst: 'zulässig mit abgeminderten Werten', nicht: 'grösseres Fundament nötig' };
  const fundHtml = fu.length ? `<h3 id="v-fund">Fundamentnachweis - Zusammenfassung</h3>
    <p class="notiz">Charakteristische Einwirkungen am Mastfuss gegen die zulässigen Standardlasten des Fundamenttyps.
      Grau: Anteile, die nur den Ablauf lenken (kein eigener Nachweis); massgebend ist der Weg des Ablaufs.</p>
    ${fu.map((f) => `<div class="v-fund">
      <div class="v-fund-kopf"><b>Fundament ${esc(ansicht.anzeigeText(f.mast))}</b> · ${esc(f.typ)}
        <span class="z" style="color:var(--${ampel(f.eta) || 'dim'})">η ${zahl(f.eta, 3)}</span>
        <span class="v-dim">${esc(STUFE[f.stufe] ?? '')}</span></div>
      <p>${esc(ansicht.anzeigeText(f.text))}</p>
      ${f.ablauf.length ? `<p class="v-dim">Ablauf: ${f.ablauf.map((r) => `${esc(r.richtung)} ${esc(STUFE[r.ergebnis] ?? r.ergebnis)}
        (Schritt ${esc(r.schritt)}, η ${zahl(r.eta, 3)})`).join(' · ')}</p>` : ''}
      <table><thead><tr><th>Prüfung</th><th>Einwirkung</th><th>zulässig</th><th>η</th><th>Lastfall</th></tr></thead><tbody>
      ${f.zeilen.map((z) => `<tr${z.lenkt ? ' class="v-grau"' : ''}><td>${esc(z.was)}</td>
        <td class="z">${zahl(z.wert, 2)} ${esc(z.einheit)}</td><td class="z">${zahl(z.zul, 2)}</td>
        <td class="z"${z.lenkt ? '' : ` style="color:var(--${ampel(z.eta) || 'dim'})"`}>${zahl(z.eta, 3)}</td><td>${esc(z.bez ?? '')}</td></tr>`).join('')}
      </tbody></table></div>`).join('')}` : '';
  $('v-bauteile').innerHTML = `
    <h3>Ausnutzung je Bauteil</h3>
    <table><thead><tr><th>Bauteil</th><th>η</th><th>massgebender Fall</th></tr></thead><tbody>
      ${(U.liste ?? []).map((x) => `<tr><td>${esc(ansicht.anzeigeText(x.name))}</td>
        <td class="z" style="color:var(--${ampel(x.eta) || 'dim'})">${zahl(x.eta, 3)}</td><td>${esc(x.bez ?? '')}</td></tr>`).join('')}
    </tbody></table>
    ${fundHtml}
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

  // Einzelne Ausnutzungen in der Leiste (19. November): je Bauteil ein Balken.
  $('v-aus').innerHTML = (U.liste ?? []).slice().sort((a, b) => b.eta - a.eta).map((x) => {
    const fund = /^Fundament/.test(x.name);
    return `<button class="v-aus-z ${ampel(x.eta)}" title="${esc(x.bez ?? '')}"${fund ? ' data-fund' : ''}${x.stab ? ` data-stab="${esc(x.stab)}"` : ''}>
      <span>${esc(ansicht.anzeigeText(x.name))}</span><b>${zahl(x.eta, 2)}</b>
      <i style="width:${Math.min(100, Math.max(0, x.eta * 100)).toFixed(0)}%"></i></button>`;
  }).join('') || '<div class="v-notiz">keine</div>';
  // Klick auf eine Ausnutzung hebt das Bauteil im 3D hervor (21. November).
  document.querySelectorAll('[data-stab]').forEach((b) => {
    b.onclick = () => { ansicht.zeigeStab?.(b.dataset.stab); };
  });
  document.querySelectorAll('[data-fund]').forEach((b) => {
    b.onclick = () => { reiter('bauteile'); requestAnimationFrame(() => $('v-fund')?.scrollIntoView({ block: 'start' })); };
  });
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
