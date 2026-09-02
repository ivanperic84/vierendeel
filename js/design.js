/**
 * design.js
 * ---------------------------------------------------------------------------
 * SYSTEM-DESIGN-MODUL.
 *
 * Eine Quelle für Farben, Abstände, Typografie, Icons und die wiederkehrenden
 * Bausteine der Oberfläche. Wer das Erscheinungsbild ändern will, ändert es
 * hier - nicht verstreut in den Ansichten.
 *
 * Die Farbwerte werden ZUSÄTZLICH als CSS-Variablen auf :root gesetzt
 * (uebertrageTokens), damit dieselben Werte im Stylesheet und in den
 * gezeichneten Ansichten (SVG, 3D-Canvas) gelten.
 * ---------------------------------------------------------------------------
 */

/** Farbtokens. Dunkel ist die Leitdarstellung, hell die Umkehrung. */
export const FARBEN = {
  dunkel: {
    bg: '#0e0f11',
    s1: '#15161a', s2: '#1c1d22', s3: '#232428', s4: '#2a2c32',
    ol: '#353740', ol2: '#44464f',
    on: '#e1e2e8', on2: '#b8bac4', dim: '#787a84', xdim: '#4e5058',
    acc: '#7c8de0', accS: 'rgba(124,141,224,0.14)',
    ok: '#6fcf8e', okS: 'rgba(111,207,142,0.10)',
    warn: '#c9a84c', warnS: 'rgba(201,168,76,0.10)',
    fail: '#cf7070', failS: 'rgba(207,112,112,0.10)',
    scrim: 'rgba(0,0,0,0.55)',
    viewerBg: '#090a0d',
    stahl: '#8f9bb3', stahlKante: '#c6cede',
    blech: '#d2953c', blechKante: '#f0b968',
    achse: '#cf7070',
  },
  hell: {
    bg: '#f2f3f6',
    s1: '#ffffff', s2: '#f7f8fa', s3: '#eef0f4', s4: '#e4e7ec',
    ol: '#d5d9e0', ol2: '#c2c7d1',
    on: '#111218', on2: '#3a3c48', dim: '#70727e', xdim: '#9497a1',
    acc: '#4a5cb8', accS: 'rgba(74,92,184,0.10)',
    ok: '#2f9e54', okS: 'rgba(47,158,84,0.09)',
    warn: '#9a7b1a', warnS: 'rgba(154,123,26,0.10)',
    fail: '#a02020', failS: 'rgba(160,32,32,0.08)',
    scrim: 'rgba(0,0,0,0.35)',
    viewerBg: '#e8eaef',
    stahl: '#9aa5b8', stahlKante: '#5a6478',
    blech: '#c98a35', blechKante: '#8a5c18',
    achse: '#a02020',
  },
};

/** Geometrie der Oberfläche. */
export const MASS = {
  r1: 4, r2: 10, r3: 16, r4: 24,
  kopfhoehe: 46,
  fusshoehe: 24,
  seiteMin: 300, seiteMax: 620, seiteStd: 386,
  auswertungStd: 360,
  splitBreite: 14,
};

/** Typografie. Systemschriften, damit die Datei ohne Netz auskommt. */
export const SCHRIFT = {
  ui: 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
};

/**
 * Ampelfarbe zu einem Ausnutzungsgrad.
 * @returns {'ok'|'warn'|'fail'}
 */
export function ampel(eta) {
  if (!Number.isFinite(eta)) return 'dim';
  if (eta > 1) return 'fail';
  if (eta > 0.9) return 'warn';
  return 'ok';
}

/**
 * Farbverlauf für die Spannungsdarstellung im 3D-Modell.
 * 0 -> gedämpftes Blau, 1 -> Rot. Bewusst nicht der klassische Regenbogen:
 * die Helligkeit wächst monoton, damit die Reihenfolge auch bei
 * Farbsehschwäche und im Ausdruck erkennbar bleibt.
 */
export function etaFarbe(eta) {
  const t = Math.max(0, Math.min(1.25, Number.isFinite(eta) ? eta : 0)) / 1.25;
  const stufen = [
    [0.00, [ 60,  92, 168]],
    [0.35, [ 74, 158, 172]],
    [0.60, [190, 178,  86]],
    [0.80, [214, 132,  60]],
    [1.00, [198,  62,  62]],
  ];
  for (let i = 1; i < stufen.length; i++) {
    if (t <= stufen[i][0] || i === stufen.length - 1) {
      const [t0, c0] = stufen[i - 1], [t1, c1] = stufen[i];
      const f = (t - t0) / (t1 - t0 || 1);
      const c = c0.map((v, k) => Math.round(v + (c1[k] - v) * Math.max(0, Math.min(1, f))));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return 'rgb(198,62,62)';
}

/**
 * Qualitative Palette für die BAUTEILDARSTELLUNG im Modell.
 *
 * Anders als etaFarbe() ordnet sie keine Grössenordnung, sondern unterscheidet
 * Teile: jede Blechposition der Stückliste und jedes Gurtprofil bekommt eine
 * eigene Farbe. Damit lässt sich mit blossem Auge prüfen, ob die Staffelung
 * am richtigen Ort wechselt. Die Farbtöne sind so gewählt, dass sie sich auch
 * bei Rot-Grün-Schwäche in der Helligkeit unterscheiden.
 */
export const BAUTEIL_PALETTE = [
  '#4a76c8', '#d98a2b', '#4fa88a', '#b7566f', '#8a76c0', '#c9a83c',
  '#5f9ed6', '#a86a3c', '#6fbf73', '#c2607e', '#7f8ba0', '#d0703f',
];

/** Farbe je Bauteilschlüssel, stabil über die Reihenfolge der Vergabe. */
export function bauteilFarbe(index) {
  return BAUTEIL_PALETTE[index % BAUTEIL_PALETTE.length];
}

/** Icons als SVG-Pfade, 20×20 Raster, ohne Fremddateien. */
export const ICONS = {
  projekte: 'M3 6h6l2 2h6a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1z',
  speichern: 'M4 3h9l3 3v11a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zM7 3v5h6V3M6 12h8',
  neu: 'M10 4v12M4 10h12',
  // Stift: Schaft, Spitze, Radiergummi-Ende - für «umbenennen».
  bearbeiten: 'M13.5 3.5l3 3L7 16H4v-3zM11.5 5.5l3 3',
  kopie: 'M7 7h9v9H7zM4 4h9v3M4 4v9h3',
  loeschen: 'M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10',
  import: 'M10 3v9M6 9l4 4 4-4M3 16h14',
  // Pfeil in eine Schale: «auf dem Gerät ablegen»
  installieren: 'M10 2v8M6.5 7l3.5 3 3.5-3M4 12v3a2 2 0 002 2h8a2 2 0 002-2v-3',
  export: 'M10 13V4M6 8l4-4 4 4M3 16h14',
  drucken: 'M6 8V3h8v5M6 15H4v-5h12v5h-2M6 12h8v5H6z',
  zuruecksetzen: 'M4 10a6 6 0 106-6 6 6 0 00-4.2 1.8L4 7M4 4v3h3',
  hell: 'M10 3v2M10 15v2M3 10h2M15 10h2M5.5 5.5l1.4 1.4M13.1 13.1l1.4 1.4M5.5 14.5l1.4-1.4M13.1 6.9l1.4-1.4M10 7a3 3 0 100 6 3 3 0 000-6z',
  dunkel: 'M15 11.5A6 6 0 018.5 5a6 6 0 106.5 6.5z',
  zoom: 'M9 4a5 5 0 100 10A5 5 0 009 4zM12.5 12.5L17 17',
  // Vier Ecken nach aussen: «ins grosse Fenster ziehen»
  aufziehen: 'M3 8V3h5M17 12v5h-5M3 3l6 6M17 17l-6-6',
  raster: 'M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z',
  // Ein Blatt mit einem Riss darauf: die hinterlegte Zeichnung.
  zeichnung: 'M3 3h14v14H3zM3 13l4-4 3 3 4-5 3 4',
  achsen: 'M4 16V4M4 16h12M4 16l4-4M4 16l-1-1',
  schnitt: 'M10 2v16M6 6l8 8M14 6l-8 8',
  ansichtReset: 'M10 3a7 7 0 107 7M10 3v4M10 3h4',
  info: 'M10 3a7 7 0 100 14 7 7 0 000-14zM10 9v5M10 6.5v.01',
  optionen: 'M8.2 3.4l.5-1.4h2.6l.5 1.4 1.3.55 1.35-.65 1.85 1.85-.65 1.35.55 1.3 1.4.5v2.6l-1.4.5-.55 1.3.65 1.35-1.85 1.85-1.35-.65-1.3.55-.5 1.4H8.7l-.5-1.4-1.3-.55-1.35.65-1.85-1.85.65-1.35-.55-1.3-1.4-.5V8.7l1.4-.5.55-1.3-.65-1.35 1.85-1.85 1.35.65 1.3-.55zM10 7.6a2.4 2.4 0 100 4.8 2.4 2.4 0 000-4.8z',
  links: 'M12 4l-5 6 5 6',
  rechts: 'M8 4l5 6-5 6',
  // --- Reiter der Schubladen (Symbole der eingeklappten Schienen) -----------
  system: 'M2 7h16M2 13h16M6 7v6M14 7v6',          // Vierendeel-Feld
  profil: 'M5 3v14h12v-3H8V3z',                     // Winkelprofil
  anbau: 'M3 5h14M10 5v7M7 12h6v3H7z',              // Hängestütze am Joch
  lastpfeil: 'M10 3v11M6 10l4 4 4-4M3 17h14',       // Last nach unten
  uebersicht: 'M3 16V8M8 16V4M13 16v-6M18 16v-9',   // Balken
  auflager: 'M10 3v9M4 17l6-5 6 5M3 17h14',         // Auflagerdreieck
  // Der Mast: Stiel mit Fundament und dem Joch, das oben ansetzt.
  mast: 'M9 3v14M11 3v14M5 17h10M4 19l2-2M8 19l2-2M12 19l2-2M11 6h6',
  // Ein durchgestrichenes Auge: beiseitegelegt, nicht geloescht.
  auge: 'M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5M8.5 10a1.5 1.5 0 103 0'
      + 'a1.5 1.5 0 10-3 0M3 3l14 14',
  stueck: 'M4 5h12M4 10h12M4 15h12M2 5v.01M2 10v.01M2 15v.01',
  // --- Werkzeuge der Modellansicht -----------------------------------------
  wuerfel: 'M10 2l7 4v8l-7 4-7-4V6zM10 10l7-4M10 10v8M10 10L3 6',
  blech: 'M4 6h5v8H4zM11 6h5v8h-5z',
  achse: 'M3 10h14M10 3v14',
  stab: 'M4 5h12M4 15h12M4 5v10M16 5v10M10 5v10',
  mass: 'M3 7v6M17 7v6M3 10h14',
  wind: 'M3 7h9a2 2 0 10-2-2M3 11h11a2 2 0 11-2 2M3 15h6',
  leiterzug: 'M2 6h16M4 6c3 4 9 4 12 0M10 8v8M8 16h4',
  schnee: 'M10 3v14M4 6.5l12 7M16 6.5l-12 7',
  gewicht: 'M10 3a2 2 0 100 4 2 2 0 000-4zM6 8h8l2 9H4z',
};

/** Ein Icon als SVG-Markup. */
export function icon(name, groesse = 16) {
  const d = ICONS[name];
  if (!d) throw new Error(`Unbekanntes Icon: ${name}`);
  return `<svg viewBox="0 0 20 20" width="${groesse}" height="${groesse}" fill="none"
    stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}

// --- Bausteine --------------------------------------------------------------

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Abschnittsüberschrift mit Akzentbalken. */
export function abschnitt(titel, rechts = '') {
  return `<div class="sec">${esc(titel)}${rechts ? `<span class="sec-r">${rechts}</span>` : ''}</div>`;
}

/** Werkzeugleisten-Knopf mit Icon. */
export function iconKnopf(id, name, titel, aktiv = false) {
  return `<button class="btn-icon${aktiv ? ' on' : ''}" id="${esc(id)}" type="button"
    title="${esc(titel)}" aria-label="${esc(titel)}">${icon(name)}</button>`;
}

/**
 * Kennzahlkachel.
 *
 * Mit ziel = {x, station} wird sie anklickbar und fährt das Modell an die
 * Stelle, an der die Kennzahl auftritt.
 */
export function kachel(titel, wert, einheit = '', zustand = '', ziel = null) {
  const k = ziel && Number.isFinite(ziel.x)
    ? ` klick" data-kz-x="${ziel.x}" data-kz-station="${ziel.station ?? ''}` +
      `" title="Im Modell anfahren: x = ${ziel.x.toFixed(2)} m`
    : '';
  return `<div class="kz${zustand ? ' ' + zustand : ''}${k}">
    <div class="kz-t">${esc(titel)}</div>
    <div class="kz-w">${esc(wert)}</div>
    ${einheit ? `<div class="kz-e">${esc(einheit)}</div>` : ''}
  </div>`;
}

/**
 * Einklappbarer Abschnitt.
 *
 * Alles, was nicht unmittelbar der Eingabe oder dem Ablesen eines Ergebnisses
 * dient - Erklärungen, Herleitungen, Nebenrechnungen -, gehört hier hinein.
 * Der Zustand wird über den Schlüssel gemerkt, damit jede Person ihre Ansicht
 * behält (siehe merkeKlapp in ui.js).
 *
 * @param {string} schluessel eindeutiger Name, für das Merken des Zustands
 * @param {string} titel      Kopfzeile
 * @param {string} inhalt     HTML
 * @param {string} rechts     kleiner Zusatz in der Kopfzeile
 */
export function klapp(schluessel, titel, inhalt, rechts = '', offen = false) {
  return `<details class="klapp" data-klapp="${esc(schluessel)}"${offen ? ' open' : ''}>
    <summary><span class="klapp-t">${esc(titel)}</span>${
      rechts ? `<span class="klapp-r">${esc(rechts)}</span>` : ''}</summary>
    <div class="klapp-koerper">${inhalt}</div>
  </details>`;
}

/** Statusplakette. */
export function plakette(text, zustand) {
  return `<span class="pl pl-${zustand}">${esc(text)}</span>`;
}

/** Setzt die Tokens des gewählten Themas als CSS-Variablen auf :root. */
export function uebertrageTokens(thema = 'dunkel') {
  const f = FARBEN[thema] ?? FARBEN.dunkel;
  const r = document.documentElement;
  Object.entries(f).forEach(([k, v]) => {
    r.style.setProperty('--' + k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), v);
  });
  Object.entries(MASS).forEach(([k, v]) => {
    r.style.setProperty('--m-' + k, typeof v === 'number' ? v + 'px' : v);
  });
  r.style.setProperty('--f-ui', SCHRIFT.ui);
  r.style.setProperty('--f-mono', SCHRIFT.mono);
  r.dataset.thema = thema;
  // WAS DER BROWSER SELBST ZEICHNET, muss mitgehen: Rollbalken, das Kreuzchen
  // im Suchfeld, aufgeklappte Auswahllisten, Datumsfelder. Ohne color-scheme
  // bleiben sie hell und stechen aus der dunklen Oberfläche heraus.
  r.style.colorScheme = thema === 'hell' ? 'light' : 'dark';
  // Die Fensterfarbe des Browsers mitziehen. Als installiertes Programm ist
  // das die Farbe der Titelleiste bzw. der Statusleiste des Geräts - bleibt
  // sie stehen, sitzt ein heller Streifen über einer dunklen Oberfläche.
  const marke = document.querySelector('meta[name="theme-color"]');
  if (marke) marke.setAttribute('content', f.bg);
  return f;
}

/** Aktuelle Farbtokens (nach uebertrageTokens). */
export function tokens(thema) {
  return FARBEN[thema ?? (typeof document !== 'undefined'
    ? document.documentElement.dataset.thema : 'dunkel') ?? 'dunkel'] ?? FARBEN.dunkel;
}

export { esc };
