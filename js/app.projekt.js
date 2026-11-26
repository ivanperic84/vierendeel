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
         einzelmastenAufgehen, lageVon, lageOrtsnull } from './core.constants.js';
import { esc } from './design.js';
import { normalisiereAnbauteil, expandiereAnbauteile, istSignalModul } from './data.anbauteile.js';
import { anbauKette, bezugsHoehe } from './core.anbauteile.js';
import { getFlBauteil } from './data.fl.js';
import { ekKlasseVon } from './core.lasten.js';
import { seitAusgang } from './core.protokoll.js';
import { XLS_AMPEL } from './export.xlsx.js';

/** Die Grössen des Fundaments als Spalten der Liste, in dieser Reihenfolge. */
export const PROJEKT_GROESSEN = [
  { key: 'V', kopf: 'V' }, { key: 'Mq', kopf: 'M_q' }, { key: 'Mqver', kopf: 'M_q ver' },
  { key: 'Hq', kopf: 'H_q' }, { key: 'Ml', kopf: 'M_l' }, { key: 'Mlver', kopf: 'M_l ver' },
  { key: 'Hl', kopf: 'H_l' }, { key: 'T', kopf: 'T' },
];

/** Die Ampel der Anwendung: bis 0.90 erfüllt, bis 1.00 knapp, darüber nicht. */
export const ampelVon = (eta) => (!Number.isFinite(eta) ? 'leer' : eta > 1 ? 'fail' : eta > 0.9 ? 'warn' : 'ok');

const zahl = (v, n = 2) => (Number.isFinite(v) ? v.toFixed(n) : '–');


/*
 * >>> ALLE ANBAUTEILE IN DER SKIZZE (23. November). <<< Weisung, im
 * Wortlaut: «die anbauteile sind fein eingezeichnet darzustellen (alle nicht
 * nur hängestützen) sonst denkt der user es sind nicht alle elemente für die
 * bemessung berücksichtigt.» Das Stabmodell führt nur einen Teil der
 * Anbauteile als Stäbe (am Abfangjoch und an den Masten stehen sie als
 * Lasten am Knoten). Gezeichnet wird deshalb aus den Eingaben, wie die
 * Vorschau der Projektablage (`eintragVorschauHtml`): Kette, Leiter, Abzug,
 * Fläche - auf dem Blatt, Mastfuss auf z = 0.
 */
function anbauGeometrie(w) {
  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const linien = [], leiter = [], kasten = [];
  const ms = mastenVon(w).map((m) => ({ m, x: num(m.x) }));
  sichtbareTragwerke(w).forEach((t) => {
    const art = tragwerksart(t).key;
    const H = num(t.mastH, 7.5), L = num(t.L);
    const x0 = art === 'abfangjoch' ? lageOrtsnull(t) : lageVon(t);
    const seite = t.auslegerSeite === 'links' ? -1 : 1;
    const x1 = art === 'tragausleger' ? x0 + seite * L : x0 + L;
    const jd = art === 'joch' ? Math.max(0.3, num(t.jd, 500) / 1000) : 0.16;
    const aktive = (t.anbauteile ?? []).filter((a) => a && a.aktiv !== false);
    let flach = [];
    try { flach = expandiereAnbauteile(aktive, { ek: 'EK1' }); } catch { flach = []; }
    aktive.forEach((roh) => {
      let a;
      try { a = normalisiereAnbauteil(roh); } catch { return; }
      const meine = flach.filter((x) => x.baugruppe === a.id);
      if (!meine.length) return;
      const zeichne = (kette, welt) => {
        (kette.glieder ?? []).forEach((g) => {
          const p = welt(g.von), r = welt(g.bis);
          if (Math.hypot(p[0] - r[0], p[1] - r[1]) > 1e-3) linien.push([p[0], p[1], r[0], r[1]]);
        });
        (kette.belegung ?? []).forEach(({ teil: x, punkt }) => {
          if (!punkt) return;
          const [px, pz] = welt(punkt);
          if (x.rolle === 'drahtwerk') leiter.push([px, pz, x.wirkung?.G === false ? 1 : 0]);
          else if (x.art === 'modul') {
            const m = (a.module ?? [])[x.modulIndex];
            let flaeche = false;
            try { flaeche = (m && istSignalModul(m)) || getFlBauteil(x.bauteil)?.freieFlaeche === true; } catch { flaeche = false; }
            if (flaeche) kasten.push([px, pz]);
          }
        });
      };
      try {
        if (String(a.ort ?? '').startsWith('mast')) {
          const soll = a.ort === 'mastB' ? x1 : x0;
          const mast = ms.find((mm) => a.mastId && mm.m.id === a.mastId)
            ?? ms.reduce((b, mm) => (!b || Math.abs(mm.x - soll) < Math.abs(b.x - soll) ? mm : b), null);
          if (!mast) return;
          zeichne(anbauKette(meine, { x0: 0, zAn: 0, amMast: true }),
                  (p) => [mast.x + (p.x ?? 0), num(a.hMast) + (p.z ?? 0)]);
          return;
        }
        if (art === 'einzelmast') return;
        const zOG = H + jd / 2, zUG = H - jd / 2;
        const stat = art === 'tragausleger' ? x0 + seite * num(a.x) : x0 + num(a.x);
        const mitTraeger = meine.some((x) => (x.rolle ?? '') === 'traeger');
        const tr = meine.find((x) => (x.rolle ?? '') === 'traeger') ?? meine[0];
        const bef = a.befestigung === 'beide' ? 'durchgehend' : a.befestigung;
        zeichne(anbauKette(meine, { x0: num(a.x),
          zAn: bezugsHoehe({ befestigung: bef, z: tr?.z ?? 0, mitTraeger }, zOG, zUG) }),
        (p) => [stat + ((p.x ?? 0) - num(a.x)), p.z ?? 0]);
      } catch { /* diese Gruppe bleibt ohne Bild */ }
    });
  });
  return { linien, leiter, kasten };
}

/**
 * Einen Eintrag der Ablage rechnen und auswerten. Wirft nie - ein Fehler
 * steht im Ergebnis (`fehler`), damit ein Eintrag den Lauf nicht abbricht.
 */
export function eintragAuswerten(e) {
  const kopf = { id: e.id, name: e.name ?? '', projekt: e.projekt ?? '', bemerkung: e.bemerkung ?? '',
                 // Änderungen der Bauteiltypen gegenüber dem Ausgangszustand (23. November).
                 aenderungen: (() => { try { return seitAusgang(e); } catch { return []; } })(),
                 ausgangDatum: e.ausgang?.datum ?? null, ausgangVonHand: e.ausgang?.vonHand === true };
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
      // Die Geometrie des Ankers (h, a, Typ) für die Skizze - wie im Reaktionsblatt.
      ankerGeo: m.anker && typeof m.anker === 'object' ? m.anker : null,
      // Das Ankerfundament (23. November, core.ankerfundament.js).
      ankerFundament: h.ankerfundamentJe?.[name] ?? null,
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
  // Länge des Masten aus dem Modell (Maststäbe der Skizze), wo die Liste keine führt.
  const kopfZ = (x, z0) => Math.max(z0, ...(h.skizze?.linien ?? [])
    .filter((l) => l[4] === 3 && Math.abs(l[0] - x) < 0.35 && Math.abs(l[2] - x) < 0.35)
    .flatMap((l) => [l[1], l[3]]));
  masten.forEach((m) => {
    if (!m.laenge && m.zeile) { const L = kopfZ(m.zeile.x, m.zeile.z) - m.zeile.z; if (L > 0.5) m.laenge = L; }
  });
  /*
   * DIE EINGABEPARAMETER DES BLATTES (23. November, «die globalen
   * eingabeparameter angeben»): was für alle Tragwerke des Eintrags gilt.
   */
  const nw = w.nachweise ?? {};
  const param = {
    ek: ekKlasseVon(w) || (String(w.windKlasse) === '1.0' ? 'Einheitswind' : `Wind ${w.windKlasse ?? ''}`),
    schnee: w.schneeAktiv === true ? 'ja' : 'nein',
    lfl: Number(w.flSpannweite) || 0,
    radius: Number(w.trasseRadius) || 0,
    reduktion: w.windReduktion === true ? '× 0.74' : '–',
    havarie: w.havarieAus === true ? 'aus' : 'ein',
    th2: w.theorie2 === true ? 'ja' : 'nein',
    knicken: nw.knickenMast === false ? 'aus' : 'ein',
    stahl: [w.stahl, w.stahlMast && w.stahlMast !== w.stahl ? `Mast ${w.stahlMast}` : ''].filter(Boolean).join(' · '),
  };
  let anbau = null;
  try {
    const bezug = masten.find((m) => m.zeile);
    if (bezug) {
      const dx = bezug.zeile.x - bezug.x, dz = bezug.zeile.z;
      const g = anbauGeometrie(w);
      anbau = { linien: g.linien.map((l) => [l[0] + dx, l[1] + dz, l[2] + dx, l[3] + dz]),
                leiter: g.leiter.map((p) => [p[0] + dx, p[1] + dz, p[2]]),
                kasten: g.kasten.map((p) => [p[0] + dx, p[1] + dz]) };
    }
  } catch { anbau = null; }
  // Die Auflager mit Namen wie im Reaktionsblatt (25. November, Ansicht «Reaktionskräfte»).
  const reaktionen = (h.reaktionen ?? []).map((z) => ({ ...z,
    anzeige: z.art === 'anker' ? `A${anz(z.id)}` : z.art === 'laengsanker' ? 'Längsanker'
      : z.art === 'jochende' ? `${z.tw ? `${z.tw} · ` : ''}Jochende ${z.ende}`
      : z.art === 'mast' ? anz(z.id) : String(z.id ?? '') }));
  return { ...kopf, ...ort, tragwerke, masten, param, anbau, skizze: h.skizze ?? null, reaktionen };
}

/**
 * Die Skizze eines Eintrags mit den Bautypen und den η: über jedem
 * Tragwerk «T1 Tragjoch J90 · 20.00 m · η 0.42», über jedem Masten Profil
 * und Länge mit η, unter jedem Mastfuss Fundamenttyp und η - farbig nach
 * der Ampel, damit die Lage der knappen Positionen sofort zu sehen ist.
 */
export function eintragSkizze(r) {
  if (!r?.skizze?.linien?.length) return '';
  const lageVonZeile = (id) => (r.reaktionen ?? []).find((y) => y.art === 'mast' && y.id === id)?.x;
  const zeilen = (r.reaktionen ?? []).map((z) => {
    const m = (r.masten ?? []).find((x) => x.name === z.id);
    // Stegrichtung fürs Profilzeichen (nur Walzprofile; Gitter- und gespreizte Masten ohne).
    const steg = z.art === 'mast' && m && /^HE[BMA] /.test(m.profil) ? (m.steg === 'quer' ? 'quer' : 'jochachse') : null;
    /*
     * DER ANKER AUSGESCHRIEBEN UND GEZEICHNET (23. November, im Wortlaut:
     * «Anker MT1 · U12 längs benennen und in der zeichnung sollte dieser auch
     * beim tragausleger schematisch ersichlich sein wie bei den jochen»): die
     * Geometrie des Masten (`ankerGeo`) für die Strebe, der Name mit Typ.
     */
    if (z.art === 'anker') {
      const laengs = Math.abs((z.x ?? 0) - (lageVonZeile(z.id) ?? z.x)) < 0.1;
      const typ = m?.ankerGeo?.typ ?? m?.anker?.typ ?? '';
      return { ...z, xModell: z.x, anker: m?.ankerGeo ?? null,
               amp: ampelVon(m?.ankerFundament?.eta),
               nameVoll: `Anker ${m?.anzeige ?? z.id}\n${[typ, laengs ? 'längs' : ''].filter(Boolean).join(' ')}${
                 m?.ankerFundament ? `\n${m.ankerFundament.typ}\nη ${zahl(m.ankerFundament.eta)}` : ''}` };
    }
    return { ...z, steg, xModell: z.x, name: z.art === 'mast' ? (m?.anzeige ?? z.id) : z.id };
  });
  const lage = new Map(zeilen.filter((z) => z.art === 'mast').map((z) => [z.id, z]));
  // Kopf des Masten aus den Maststäben der Skizze (art 3) an seiner Stelle.
  const kopfZ = (x, z0) => Math.max(z0, ...r.skizze.linien
    .filter((l) => l[4] === 3 && Math.abs(l[0] - x) < 0.35 && Math.abs(l[2] - x) < 0.35)
    .flatMap((l) => [l[1], l[3]]));
  const titel = [];
  /*
   * >>> ABFANGJOCHE ÜBEREINANDER: EIN TITEL, DAS MASSGEBENDE (23. November). <<<
   * Weisung, mit Bild: «die abfangjoche wenn sie übereinander sind kann man
   * zusammennehmen und nur den massgebenden aufführen». Am selben Mastpaar
   * steht ein Titel «A1 / A2 Abfangjoch» mit Bautyp und η des massgebenden.
   */
  const gruppen = new Map();
  (r.tragwerke ?? []).forEach((t) => {
    if (t.key !== 'abfangjoch') return;
    const k = [...t.masten].sort().join('|');
    gruppen.set(k, [...(gruppen.get(k) ?? []), t]);
  });
  const ersetzt = new Set();
  gruppen.forEach((g) => {
    if (g.length < 2) return;
    const mg = g.reduce((b, t) => ((t.eta ?? 0) > (b.eta ?? 0) ? t : b), g[0]);
    g.forEach((t) => ersetzt.add(t));
    ersetzt.delete(mg);
    mg.titelPos = `${g.map((t) => t.pos).join(' / ')}`;
    mg.titelZusatz = ` (${mg.pos})`;
  });
  (r.tragwerke ?? []).filter((t) => !ersetzt.has(t)).forEach((t) => {
    const xs = t.masten.map((n) => lage.get(n)).filter(Boolean);
    if (!xs.length) return;
    const fuss = xs[0];
    const x = t.key === 'tragausleger' || t.key === 'einzelmast'
      ? fuss.x : xs.reduce((a, b) => a + b.x, 0) / xs.length;
    if (t.key === 'einzelmast') return;      // der Einzelmast steht beim Masten
    // Am Tragausleger zählt die Aufhängung mit (gegen V_zul).
    const e = Math.max(t.eta ?? 0, t.aufhaengung ?? 0);
    const eta = Number.isFinite(t.eta) ? ` · η ${zahl(e)}` : '';
    // Zwei- bis dreizeilig (23. November): Position und Art, Bautyp, η.
    titel.push({ text: `${t.titelPos ?? t.pos} ${t.art}\n${t.bau}${eta ? `\n${eta.replace(/^ · /, '')}${t.titelZusatz ?? ''}` : ''}`, x: t.key === 'tragausleger' ? x + 2 : x,
                 z: fuss.z + t.H + 0.6, amp: ampelVon(e) });
  });
  (r.masten ?? []).forEach((m) => {
    const z = lage.get(m.name);
    if (!z) return;
    const e = Math.max(m.eta ?? 0, m.knick ?? 0);
    const len = m.laenge ? ` · ${m.laenge.toFixed(2)} m` : '';
    titel.push({ text: `${m.profil}${len.replace(/^ · /, '\n')}\nη ${zahl(e)}`, x: z.x, z: kopfZ(z.x, z.z) + 0.25, amp: ampelVon(e) });
  });
  const fuss = new Map((r.masten ?? []).filter((m) => m.fundament).map((m) => [m.name,
    { text: `${m.fundament.typ}\nη ${zahl(m.fundament.eta)}`, amp: ampelVon(m.fundament.eta) }]));
  return skizzeSvg(r.skizze, zeilen, { breite: 560, hoehe: 280, daten: { titel }, fuss, anbau: r.anbau });
}

/* ---------------------------------------------------------------------- */
/*
 * >>> TECHNISCHER KOPF, AUSWAHL, ORDNEN (23. November). <<< Mit Bild der
 * ersten Fassung, im Wortlaut: «den oberen teil technischer gestalten und
 * die globalen eingabeparameter angeben. unten die auswahl ermögliche
 * zwischen fundamente / masten / joche für die auswertung. ordnen nach km
 * und oder typ ermöglichen neben den erfüllungsgraden.»
 * Oben statt der Kacheln eine Tabelle der Kennzahlen je Bauteilgruppe und
 * die Eingabeparameter (gemeinsame als Zeile, je Eintrag als Tabelle).
 * Unten drei Listen (Fundamente, Masten, Joche) mit Umschalter; geordnet
 * nach einem ersten und einem zweiten Schlüssel (η, km, Typ, Eintrag),
 * der Spaltenkopf sortiert weiter einzeln.
 */
const PARAM = [
  { key: 'ek', kopf: 'EK', titel: 'Einwirkungsklasse (Wind und Höhenlage)' },
  { key: 'schnee', kopf: 'Schnee', titel: 'Schnee leitend gerechnet' },
  // Spannweite und Radius gehören dem Blatt, nicht dem Projekt (23. November:
  // «die spannweite und der radius sind blatt abhängig und nicht global zu verstehen»).
  { key: 'lfl', kopf: 'L_FL [m]', titel: 'Spannweite der Fahrleitung', zahl: 1, blatt: true },
  { key: 'radius', kopf: 'R [m]', titel: 'Radius der Trasse (0 = gerade)', zahl: 0, blatt: true },
  { key: 'reduktion', kopf: 'Wind red.', titel: 'Windreduktion dicht überbautes Gebiet' },
  { key: 'havarie', kopf: 'Havarie', titel: 'Havariefall gerechnet' },
  // «diesen eintrag nicht aufführen» (23. November, mit Bild): Theorie
  // 2. Ordnung und Knicknachweis stehen nicht in den Grundlagen.
  { key: 'stahl', kopf: 'Stahl', titel: 'Stahlgüte' },
];
const paramText = (p, v) => (p.zahl !== undefined && Number.isFinite(v)
  ? (p.key === 'radius' && !v ? 'gerade' : v.toFixed(p.zahl)) : String(v ?? '–'));

const STIL = `
  @page { size: A4 landscape; margin: 10mm; }
  body { font: 10.5px/1.35 system-ui, sans-serif; color: #111; background: #fff; margin: 16px; }
  h1 { font-size: 16px; margin: 0 0 2px; } h2 { font-size: 12.5px; margin: 14px 0 5px; text-transform: uppercase; letter-spacing: .04em; color: #333; }
  .unter { color: #555; margin: 0 0 8px; }
  .kopf { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 14px; align-items: start; }
  .t-info th { width: auto !important; white-space: nowrap; } .t-info td { white-space: nowrap; }
  @media (max-width: 900px) { .kopf { grid-template-columns: 1fr; } }
  table { border-collapse: collapse; width: 100%; font-size: 10px; }
  th, td { border: 1px solid #d0d3d8; padding: 2px 5px; vertical-align: top; }
  thead th { background: #eef0f3; text-align: left; font-weight: 600; }
  .t-info th { background: #f6f7f9; font-weight: 600; text-align: left; width: 38%; }
  thead th.s { cursor: pointer; user-select: none; } thead th.s:hover { background: #e2e6ec; }
  .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .n small { display: block; color: #666; font-size: 8.5px; }
  .lenkt { color: #9aa0a8; } .lenkt b { color: #9aa0a8; }
  .ok b, b.ok { color: #1c7a3d; } .warn b, b.warn { color: #a86400; } .fail b, b.fail { color: #b3261e; }
  td.amp { font-weight: 700; } td.amp.ok, .ok-t { color: #1c7a3d; } td.amp.warn, .warn-t { color: #a86400; }
  td.amp.fail, .fail-t { color: #b3261e; }
  .abw { background: #fff7e6; }
  .wahl { margin: 6px 0; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .seg { display: inline-flex; border: 1px solid #c8ccd2; border-radius: 5px; overflow: hidden; }
  .seg button { font: inherit; border: 0; border-right: 1px solid #c8ccd2; background: #fff; padding: 3px 10px; cursor: pointer; }
  .seg button:last-child { border-right: 0; } .seg button.an { background: #2f3b8f; color: #fff; }
  .wahl select { font: inherit; padding: 2px 4px; }
  .liste[hidden] { display: none; } .lt { font-size: 11px; margin: 8px 0 3px; }
  tr.zeile { cursor: pointer; } tr.zeile:hover td { background: #f5f7fb; }
  .rollen { overflow-x: auto; }
  .pos { break-inside: avoid; page-break-inside: avoid; border: 1px solid #d3d6dc; border-radius: 4px;
         padding: 6px 8px; margin: 8px 0; }
  .pos h3 { font-size: 11.5px; margin: 0 0 4px; } .pos .ort { color: #666; font-weight: 400; }
  .pos-rk { margin-top: 8px; } .pos-rk h4 { margin: 0 0 4px; font-size: 11px; }
  .pos-in { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
  .pos table { width: auto; min-width: 300px; }
  .aenderung { margin: 0 0 4px; color: #7a4a00; } .fehler { color: #b3261e; } .kommentar { margin: 0 0 4px; font-style: italic; color: #333; }
  .fuss { margin-top: 12px; font-size: 9px; color: #777; }
  .hinweis { font-size: 9px; color: #555; margin: 3px 0; }
  @media print { .wahl { display: none; } .liste[hidden] { display: block; } .rollen { overflow: visible; }
                 .bruch { page-break-before: always; } }
`;

/** km als Zahl (zum Ordnen), sonst leer. */
const kmZahlVon = (r) => { const v = parseFloat(String(r.km ?? '').replace(/[^0-9.+-]/g, '')); return Number.isFinite(v) ? v : ''; };


/*
 * >>> FOKUS AUF DIE FUNDAMENT-REAKTIONSKRÄFTE (25. November). <<< Weisung:
 * «biete bei der auswertung noch die möglichkeit den fokus auf die fundament
 * reaktionskräfte zu legen.», auf Rückfrage «Projektauswertung» und «Wie
 * Reaktionsblatt»: je Auflager aller Einträge V min / max, ±M_q, ±H_q, ±M_l,
 * ±H_l, ±T charakteristisch mit massgebendem Fall, dazu Havarie, Anteil
 * ständig / veränderlich und die Standardlasten des Fundaments. Dieselben
 * Zeilen wie das Reaktionsblatt (`reaktionsZeilen`); nichts neu gerechnet.
 */
const RK_ARTEN = new Set(['mast', 'anker', 'laengsanker', 'jochende']);
const RK_SP = ['Mq', 'Hq', 'Ml', 'Hl', 'T'];
const RK_KOPF = { Mq: ['M_q', 'kNm'], Hq: ['H_q', 'kN'], Ml: ['M_l', 'kNm'], Hl: ['H_l', 'kN'], T: ['T', 'kNm'] };
function rkSpalten(z) {
  if (z.art === 'mast' || z.art === 'jochende') return new Set(RK_SP);
  if (z.art === 'laengsanker') return new Set(['Hl']);
  if (z.art === 'anker') {
    const ri = z.anker?.richtung;
    return new Set(ri === 'y' ? ['Hl'] : ri === 'x' ? ['Hq'] : ['Hq', 'Hl']);
  }
  return new Set(['Hq', 'Hl']);
}
/** Zulässige Standardlast einer Grösse am Mastfundament (aus dem Nachweis). */
const rkZul = (m, key) => m?.fundament?.nachweise?.find((n) => n.key === key)?.zul ?? null;
function rkFundament(z, m) {
  if (z.art === 'mast') return m?.fundament?.typ ?? (m?.unterbau ? 'Unterbau' : '–');
  if (z.art === 'anker') return m?.ankerFundament?.typ ? `${m.ankerFundament.typ} · Anker` : 'Ankerfundament';
  return z.art === 'laengsanker' ? 'Seil in Gleisrichtung' : 'Jochauflager';
}
const rkEta = (z, m) => (z.art === 'mast' ? m?.fundament?.eta : z.art === 'anker' ? m?.ankerFundament?.eta : null) ?? NaN;
const rkKurz = (bez) => String(bez ?? '')
  .replace(/^Havarie: .* reisst, Längszug (.)y$/, 'Leiterriss, Längszug $1y')
  .replace(/^Havarie \(−20 °C\), ohne Leiterbruch$/, 'ohne Leiterbruch');
function rkFall(z, b) {
  if (!b) return '';
  const hat = rkSpalten(z);
  const f = (x) => (x?.bez && Math.abs(x.wert) >= 0.005 ? rkKurz(x.bez) : '');
  const q = hat.has('Mq') ? b.Mq : hat.has('Hq') ? b.Hq : null;
  const l = hat.has('Ml') ? b.Ml : hat.has('Hl') ? b.Hl : null;
  return [f(q) ? `quer: ${f(q)}` : '', f(l) ? `längs: ${f(l)}` : ''].filter(Boolean).join(' · ');
}
/*
 * >>> DIE LISTEN EINER AUSWERTUNG AN EINER STELLE (23. November). <<< Blatt
 * (`projektBlattHtml`) und Excel-Mappe (`projektMappe`) lesen dieselben
 * Zeilen - dieselben Zahlen in beiden Ausgaben.
 */
export function projektListen(res) {
  const ok = res.eintraege.filter((r) => !r.fehler);
  /*
   * Die Ankerfundamente stehen mit in der Fundamentliste (23. November): Pos.
   * «A M1», η für V in der Spalte V, für H in der Spalte H_l - je der
   * massgebende aus Zug und Druck.
   */
  const ankerF = (m) => {
    const q = m.ankerFundament;
    const best = (a, b) => [a, b].filter(Boolean).reduce((x, y) => (!x || y.eta > x.eta ? y : x), null);
    const nV = best(q.nachweise.find((n) => n.key === 'Vzug'), q.nachweise.find((n) => n.key === 'Vdruck'));
    const nH = best(q.nachweise.find((n) => n.key === 'Hzug'), q.nachweise.find((n) => n.key === 'Hdruck'));
    return { typ: `${q.typ} · Anker`, eta: q.eta, massgebend: q.massgebend, ausgeglichen: false,
             nachweise: [nV && { ...nV, key: 'V', kurz: nV.was }, nH && { ...nH, key: 'Hl', kurz: nH.was }].filter(Boolean) };
  };
  const fund = ok.flatMap((r) => (r.masten ?? []).flatMap((m) => [
    ...(m.fundament ? [{ r, m, f: m.fundament }] : []),
    ...(m.ankerFundament ? [{ r, m: { ...m, anzeige: `A${m.anzeige}` }, f: ankerF(m) }] : []),
  ]));
  const mast = ok.flatMap((r) => (r.masten ?? []).map((m) => ({ r, m, eta: Math.max(m.eta ?? 0, m.knick ?? 0) })));
  const joch = ok.flatMap((r) => (r.tragwerke ?? []).filter((t) => t.key !== 'einzelmast')
    .map((t) => ({ r, t, eta: Math.max(t.eta ?? 0, t.aufhaengung ?? 0) })));
  const da = new Set();
  fund.forEach((x) => x.f.nachweise.forEach((n) => da.add(n.key)));
  const spalten = PROJEKT_GROESSEN.filter((g) => da.has(g.key));
  const rk = ok.flatMap((r) => (r.reaktionen ?? [])
    .filter((z) => z.haupt && RK_ARTEN.has(z.art))
    .map((z) => ({ r, z, m: (r.masten ?? []).find((mm) => mm.name === z.id) ?? null })));
  return { ok, fund, mast, joch, spalten, rk };
}

/*
 * >>> DIE PROJEKTAUSWERTUNG ALS EXCEL (23. November). <<< Weisung «und
 * dann mit der projektauswertung weiter», auf Rückfrage «Excel-Ausgabe»
 * (Block 2 des Auftrags «Projektauswertung Vorbemessung»). Dieselben Listen
 * wie das Blatt (`projektListen`), als Zahlen statt Text, damit sich in
 * Excel filtern, ordnen und weiterrechnen lässt: Übersicht (Grundlagen,
 * Kennzahlen, nicht gerechnete), Fundamente (je Grösse η, Einwirkung,
 * zulässig), Masten, Joche / Ausleger, Parameter je Eintrag, Änderungen
 * seit Ausgangszustand. η-Zellen in der Ampel der Anwendung (0.90 / 1.00),
 * Kopfzeile fest, Autofilter.
 */
export function projektMappe(res, { fassung = '' } = {}) {
  const { ok, fund, mast, joch, spalten, rk } = projektListen(res);
  const H = (t) => ({ v: t, s: 1 });
  const ETA = (e) => (Number.isFinite(e) ? { v: Math.round(e * 1000) / 1000, s: XLS_AMPEL[ampelVon(e)] } : '');
  const Z2 = (v) => (Number.isFinite(v) ? { v: Math.round(v * 100) / 100, s: 4 } : '');
  const T = (v) => ({ v: String(v ?? ''), s: 9 });
  const km = (r) => { const z = kmZahlVon(r); return z === '' ? T(r.km ?? '') : { v: z, s: 3 }; };
  const filter = (rows, kopf) => `A${kopf}:${spalteBuchstabe(Math.max(...rows.map((r) => r.length)) - 1)}${rows.length}`;

  /* Übersicht */
  const kenn = (titel, liste, etaVon, wer) => {
    const z = (a) => liste.filter((x) => ampelVon(etaVon(x)) === a).length;
    const max = liste.reduce((b, x) => (!b || (etaVon(x) ?? 0) > (etaVon(b) ?? 0) ? x : b), null);
    return [T(titel), liste.length, z('ok'), z('warn'), z('fail'), ETA(max ? etaVon(max) : NaN), T(max ? wer(max) : '–')];
  };
  const gleich = (p) => {
    const v = new Set(ok.map((r) => paramText(p, r.param?.[p.key])));
    return v.size <= 1 ? [...v][0] ?? '–' : 'je Eintrag (Blatt Parameter)';
  };
  const uebersicht = [
    [{ v: `Projektauswertung ${res.projekt ?? ''}`.trim(), s: 8 }],
    [`${res.datum ?? ''}${fassung ? ` · ${fassung}` : ''} · ${APP_NAME}`],
    [],
    [H('Grundlagen'), H('')],
    [T('Einträge'), T(`${res.eintraege.length} (gerechnet ${ok.length}${res.abgebrochen ? ', abgebrochen' : ''})`)],
    [T('Rechnung'), T('Stabwerk je Blatt')],
    [T('Fundamente'), T('charakteristisch gegen Standardlasten, Ablauf')],
    ...PARAM.filter((p) => !p.blatt).map((p) => [T(p.kopf), T(gleich(p))]),
    [],
    [H('Gruppe'), H('Anzahl'), H('η ≤ 0.90'), H('0.90 < η ≤ 1.00'), H('η > 1.00'), H('η max'), H('massgebend')],
    kenn('Fundamente', fund, (x) => x.f.eta, (x) => `${x.r.name} · ${x.m.anzeige} · ${x.f.typ} · ${x.f.massgebend?.was ?? ''}`),
    kenn('Masten', mast, (x) => x.eta,
         (x) => `${x.r.name} · ${x.m.anzeige} · ${x.m.profil}${x.m.knick !== null && x.m.knick >= (x.m.eta ?? 0) ? ' · Knicken' : ''}`),
    kenn('Joche / Ausleger', joch, (x) => x.eta, (x) => `${x.r.name} · ${x.t.pos} ${x.t.art} ${x.t.bau}`),
  ];
  const fehlend = res.eintraege.filter((r) => r.fehler);
  if (fehlend.length) {
    uebersicht.push([], [H('Nicht gerechnet'), H('Grund')], ...fehlend.map((r) => [T(r.name), T(r.fehler)]));
  }
  uebersicht.push([], [{ v: 'Ampel wie in der Anwendung: grün η ≤ 0.90, gelb bis 1.00, rot darüber. '
    + 'Fundamente charakteristisch, Masten und Joche Bemessung (Stabwerk).', s: 11 }]);

  /* Fundamente: je Grösse η, Einwirkung, zulässig */
  const fKopf = [H('Eintrag'), H('km'), H('Pos.'), H('Fundament'), H('Mast'),
    ...spalten.flatMap((g) => [H(`η ${g.kopf}`), H(`${g.kopf} Einw.`), H(`${g.kopf} zul.`)]),
    H('massgebend'), H('η'), H('Bemerkung')];
  const fRows = [fKopf, ...fund.map(({ r, m, f }) => [T(r.name), km(r), T(m.anzeige), T(f.typ), T(m.profil),
    ...spalten.flatMap((g) => {
      const n = f.nachweise.find((x) => x.key === g.key);
      if (!n) return ['', '', ''];
      // Ein Anteil, der nur den Ablauf lenkt, trägt keine Ampel (wie grau im Blatt).
      return [n.lenkt ? { v: Math.round((n.eta ?? 0) * 1000) / 1000, s: 3 } : ETA(n.eta), Z2(n.wert), Z2(n.zul)];
    }),
    T(f.massgebend?.was ?? ''), ETA(f.eta),
    T([f.ausgeglichen ? 'mit abgeminderten Werten' : '',
       f.nachweise.some((n) => n.lenkt) ? 'η ohne Ampel: lenkt den Ablauf, kein Nachweis' : ''].filter(Boolean).join(' · '))])];

  /* Masten */
  const mKopf = [H('Eintrag'), H('km'), H('Pos.'), H('Profil'), H('L [m]'), H('Steg'), H('η Querschnitt'), H('η Knicken'),
    H('Anker'), H('η Anker'), H('Ankerfundament'), H('η Ankerfund.'), H('Fundament'), H('η Fundament'), H('Lastfall'), H('η')];
  const mRows = [mKopf, ...mast.map(({ r, m, eta }) => [T(r.name), km(r), T(m.anzeige), T(m.profil), Z2(m.laenge),
    T(m.steg === 'quer' ? 'quer' : 'Jochachse'), ETA(m.eta), ETA(m.knick),
    T(m.anker?.typ ?? ''), ETA(m.anker?.eta), T(m.ankerFundament?.typ ?? ''), ETA(m.ankerFundament?.eta),
    T(m.fundament?.typ ?? (m.unterbau ? 'Unterbau' : '')), ETA(m.fundament?.eta), T(m.bez ?? ''), ETA(eta)])];

  /* Joche / Ausleger */
  const jKopf = [H('Eintrag'), H('km'), H('Pos.'), H('Art'), H('Bautyp'), H('H [m]'), H('Masten'),
    H('η Träger'), H('η Aufhängung'), H('Lastfall'), H('η')];
  const jRows = [jKopf, ...joch.map(({ r, t, eta }) => [T(r.name), km(r), T(t.pos), T(t.art), T(t.bau), Z2(t.H),
    T(t.masten.join(' – ')), ETA(t.eta), ETA(t.aufhaengung), T(t.bez ?? ''), ETA(eta)])];

  /* Reaktionskräfte (25. November): je Auflager Einwirkung, Havarie, Standardlast */
  const rKopf = [H('Eintrag'), H('km'), H('Pos.'), H('Fundament'), H('Zeile'), H('V min [kN]'), H('V max [kN]'),
    ...RK_SP.map((k) => H(`±${RK_KOPF[k][0]} [${RK_KOPF[k][1]}]`)), H('ständig [%]'), H('massgebender Fall'), H('η')];
  const rRows = [rKopf, ...rk.flatMap(({ r, z, m }) => {
    const hat = rkSpalten(z);
    const zeile = (art, b) => [T(r.name), km(r), T(z.anzeige), T(rkFundament(z, m)), T(art),
      Z2(b?.Vmin?.wert), Z2(b?.Vmax?.wert), ...RK_SP.map((k) => (hat.has(k) ? Z2(b?.[k]?.wert) : '')),
      art === 'Einwirkung' && z.anteil?.quer ? Z2(z.anteil.quer.prozent * 100) : '',
      T(rkFall(z, b)), art === 'Einwirkung' ? ETA(rkEta(z, m)) : ''];
    const aus = [zeile('Einwirkung', z.haupt)];
    if (z.havarie) aus.push(zeile('Havarie', z.havarie));
    if (z.art === 'mast' && m?.fundament) {
      aus.push([T(r.name), km(r), T(z.anzeige), T(rkFundament(z, m)), T('Standardlast'), Z2(0), Z2(rkZul(m, 'V')),
        ...RK_SP.map((k) => Z2(rkZul(m, k))), '', T('zulässig'), '']);
    }
    return aus;
  })];

  /* Parameter je Eintrag */
  const pRows = [[H('Eintrag'), H('km'), H('Projekt'), H('Bemerkung'), ...PARAM.map((p) => H(p.kopf))],
    ...ok.map((r) => [T(r.name), km(r), T(r.projekt), T(r.bemerkung), ...PARAM.map((p) => {
      const v = r.param?.[p.key];
      return p.zahl !== undefined && Number.isFinite(v) ? { v, s: p.zahl ? 10 : 9 } : T(paramText(p, v));
    })])];

  const blaetter = [
    { name: 'Übersicht', rows: uebersicht, breiten: [22, 34, 12, 16, 12, 10, 60] },
    { name: 'Fundamente', rows: fRows, fest: 1, filter: filter(fRows, 1),
      breiten: [18, 10, 8, 18, 12, ...spalten.flatMap(() => [8, 9, 9]), 16, 8, 30] },
    { name: 'Reaktionen', rows: rRows, fest: 1, filter: filter(rRows, 1),
      breiten: [18, 10, 8, 18, 12, 10, 10, ...RK_SP.map(() => 10), 10, 34, 8] },
    { name: 'Masten', rows: mRows, fest: 1, filter: filter(mRows, 1),
      breiten: [18, 10, 8, 14, 8, 10, 11, 10, 12, 9, 14, 10, 16, 11, 34, 8] },
    { name: 'Joche', rows: jRows, fest: 1, filter: filter(jRows, 1),
      breiten: [18, 10, 8, 14, 18, 8, 12, 10, 12, 34, 8] },
    { name: 'Parameter', rows: pRows, fest: 1, filter: filter(pRows, 1),
      breiten: [18, 10, 16, 30, ...PARAM.map(() => 12)] },
  ];
  const geaendert = res.eintraege.flatMap((r) => (r.aenderungen ?? []).map((a) => ({ r, a })));
  if (geaendert.length) {
    const aRows = [[H('Eintrag'), H('km'), H('Bauteil'), H('Angabe'), H('Ausgang'), H('jetzt')],
      ...geaendert.map(({ r, a }) => [T(r.name), km(r), T(a.wer), T(a.feld), T(a.alt || '–'), T(a.neu || '–')])];
    blaetter.push({ name: 'Änderungen', rows: aRows, fest: 1, filter: filter(aRows, 1), breiten: [18, 10, 16, 16, 18, 18] });
  }
  return blaetter;
}

/** Spaltenbuchstabe zu einem Index ab 0 (A, B, …, AA). */
function spalteBuchstabe(i) {
  let s = ''; i += 1;
  while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = (i - r - 1) / 26; }
  return s;
}

/** Die Projektauswertung als eigenständige HTML-Seite. */
export function projektBlattHtml(res, { fassung = '' } = {}) {
  const { ok, fund, mast, joch, spalten, rk } = projektListen(res);
  const idx = (r) => res.eintraege.indexOf(r);
  const kmZahl = kmZahlVon;
  /* ---------- Kennzahlen je Gruppe ---------- */
  const kenn = (titel, liste, etaVon, wer) => {
    const z = (a) => liste.filter((x) => ampelVon(etaVon(x)) === a).length;
    const max = liste.reduce((b, x) => (!b || (etaVon(x) ?? 0) > (etaVon(b) ?? 0) ? x : b), null);
    return `<tr><th style="text-align:left">${titel}</th><td class="n">${liste.length}</td><td class="n ok-t">${z('ok')}</td>
      <td class="n warn-t">${z('warn')}</td><td class="n fail-t">${z('fail')}</td>
      <td class="n amp ${ampelVon(max ? etaVon(max) : NaN)}">${zahl(max ? etaVon(max) : NaN)}</td>
      <td>${max ? esc(wer(max)) : '–'}</td></tr>`;
  };
  // Spalten als Bereiche (23. November: «ich verstehe diese zweite angabe nicht ganz» - «≤ 1.00» meinte 0.90 < η ≤ 1.00).
  const kennzahlen = `<table><thead><tr><th>Gruppe</th><th class="n">Anzahl</th><th class="n">η ≤ 0.90</th>
      <th class="n">0.90 &lt; η ≤ 1.00</th><th class="n">η &gt; 1.00</th><th class="n">η max</th><th>massgebend</th></tr></thead><tbody>
    ${kenn('Fundamente', fund, (x) => x.f.eta, (x) => `${x.r.name} · ${x.m.anzeige} · ${x.f.typ} · ${x.f.massgebend?.was ?? ''}`)}
    ${kenn('Masten', mast, (x) => x.eta, (x) => `${x.r.name} · ${x.m.anzeige} · ${x.m.profil}${x.m.knick !== null && x.m.knick >= (x.m.eta ?? 0) ? ' · Knicken' : ''}`)}
    ${kenn('Joche / Ausleger', joch, (x) => x.eta, (x) => `${x.r.name} · ${x.t.pos} ${x.t.art} ${x.t.bau}`)}
  </tbody></table>`;
  /* ---------- Eingabeparameter ---------- */
  const gleich = (p) => { const v = new Set(ok.map((r) => paramText(p, r.param?.[p.key]))); return v.size <= 1 ? [...v][0] ?? '–' : null; };
  /*
   * KOMPAKT (23. November, «mach das so kompakt wie möglich mit den
   * grundlagen, es ist viel weisse fläche vorhanden»): Paare in drei
   * Spalten, kurze Begriffe; je Eintrag nur, was abweicht.
   */
  const paare = [
    ['Einträge', `${res.eintraege.length} (gerechnet ${ok.length}${res.abgebrochen ? ', abgebrochen' : ''})`],
    ['Rechnung', 'Stabwerk je Blatt'],
    ['Fundamente', 'char. / Standardlasten, Ablauf'],
    ...PARAM.filter((p) => !p.blatt).map((p) => { const v = gleich(p); return [p.kopf, v === null ? 'je Eintrag ↓' : v, p.titel]; }),
  ];
  const SP = 3;
  const gemein = `<table class="t-info"><tbody>${Array.from({ length: Math.ceil(paare.length / SP) }, (_, i) =>
    `<tr>${paare.slice(i * SP, i * SP + SP).map(([k, v, t]) => `<th${t ? ` title="${esc(t)}"` : ''}>${esc(k)}</th><td>${esc(v)}</td>`).join('')}</tr>`).join('')}
  </tbody></table>`;
  const abweichend = new Set(PARAM.filter((p) => gleich(p) === null).map((p) => p.key));
  const fehlend = res.eintraege.filter((r) => r.fehler);
  // Änderungsprotokoll der Bauteiltypen (23. November): was seit dem Ausgangszustand geändert ist.
  const geaendert = res.eintraege.flatMap((r) => (r.aenderungen ?? []).map((a) => ({ r, a })));
  const aenderungTabelle = geaendert.length ? `<h2>Änderungen seit Ausgangszustand</h2>
    <table><thead><tr><th>km</th><th>Eintrag</th><th>Bauteil</th><th>Angabe</th><th>Ausgang</th><th>jetzt</th></tr></thead><tbody>
    ${geaendert.map(({ r, a }) => `<tr><td>${esc(r.km)}</td><td>${esc(r.name)}</td><td>${esc(a.wer)}</td><td>${esc(a.feld)}</td>
      <td>${esc(a.alt || '–')}</td><td><b>${esc(a.neu || '–')}</b></td></tr>`).join('')}</tbody></table>` : '';
  const PA = PARAM.filter((p) => p.blatt || abweichend.has(p.key));
  const jeEintrag = PA.length ? `<div class="rollen"><table><thead><tr><th>Eintrag</th><th>km</th>
      ${PA.map((p) => `<th title="${esc(p.titel)}">${esc(p.kopf)}</th>`).join('')}</tr></thead><tbody>
    ${ok.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.km)}</td>${PA.map((p) =>
      `<td>${esc(paramText(p, r.param?.[p.key]))}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div>` : '';
  const fehlerZeile = fehlend.length ? `<p class="hinweis fehler">Nicht gerechnet: ${esc(fehlend.map((r) =>
    `${r.name} (${r.fehler})`).join('; '))}</p>` : '';
  /* ---------- Listen ---------- */
  const attr = (r, typ, eta) => `class="zeile" data-amp="${ampelVon(eta)}" data-ziel="pos-${idx(r)}"
    data-eta="${Number.isFinite(eta) ? eta : -1}" data-km="${kmZahl(r)}" data-typ="${esc(typ)}" data-eintrag="${esc(r.name)}"`;
  const kopfZellen = (r, nr) => `<td data-w="${esc(r.name)}">${esc(r.name)}</td><td class="n" data-w="${kmZahl(r)}">${esc(r.km)}</td>
    <td data-w="${esc(nr)}"><b>${esc(nr)}</b></td>`;
  const fundZeilen = fund.map(({ r, m, f }) => `<tr ${attr(r, f.typ, f.eta)}>${kopfZellen(r, m.anzeige)}
      <td data-w="${esc(f.typ)}">${esc(f.typ)}</td><td>${esc(m.profil)}</td>
      ${spalten.map((g) => {
        const n = f.nachweise.find((x) => x.key === g.key);
        if (!n) return '<td class="n" data-w="-1">–</td>';
        return `<td class="n ${n.lenkt ? 'lenkt' : ampelVon(n.eta)}" data-w="${n.lenkt ? -1 : (n.eta ?? 0)}" title="${esc(`${n.kurz}: ${zahl(n.wert)} von ${zahl(n.zul)} ${n.einheit}${n.bez ? ` · ${n.bez}` : ''}${n.lenkt ? ' · lenkt den Ablauf, kein Nachweis' : ''}`)}"><b>${zahl(n.eta)}</b><small>${zahl(n.wert, 1)} / ${zahl(n.zul, 1)}</small></td>`;
      }).join('')}
      <td title="${esc(f.massgebend?.bez ?? '')}">${esc(f.massgebend?.was ?? '')}</td>
      <td class="n amp ${ampelVon(f.eta)}" data-w="${f.eta ?? 0}">${zahl(f.eta)}${f.ausgeglichen ? '<small>ausgeglichen</small>' : ''}</td></tr>`).join('');
  const mastZeilen = mast.map(({ r, m, eta }) => `<tr ${attr(r, m.profil, eta)}>${kopfZellen(r, m.anzeige)}
      <td data-w="${esc(m.profil)}">${esc(m.profil)}</td><td class="n" data-w="${m.laenge ?? 0}">${m.laenge ? m.laenge.toFixed(2) : '–'}</td>
      <td>${esc(m.steg === 'quer' ? 'quer' : 'Jochachse')}</td>
      <td class="n ${ampelVon(m.eta)}" data-w="${m.eta ?? 0}"><b>${zahl(m.eta)}</b></td>
      <td class="n ${ampelVon(m.knick)}" data-w="${m.knick ?? -1}"><b>${zahl(m.knick)}</b></td>
      <td>${m.anker ? `${esc(m.anker.typ)} <b class="${ampelVon(m.anker.eta)}">${zahl(m.anker.eta)}</b>` : '–'}</td>
      <td>${esc(m.bez ?? '')}</td>
      <td class="n amp ${ampelVon(eta)}" data-w="${eta}">${zahl(eta)}</td></tr>`).join('');
  const jochZeilen = joch.map(({ r, t, eta }) => `<tr ${attr(r, `${t.art} ${t.bau}`, eta)}>${kopfZellen(r, t.pos)}
      <td data-w="${esc(t.art)}">${esc(t.art)}</td><td data-w="${esc(t.bau)}">${esc(t.bau)}</td>
      <td class="n" data-w="${t.H}">${t.H ? t.H.toFixed(2) : '–'}</td><td>${esc(t.masten.join(' – '))}</td>
      <td class="n ${ampelVon(t.eta)}" data-w="${t.eta ?? 0}"><b>${zahl(t.eta)}</b></td>
      <td class="n" data-w="${t.aufhaengung ?? -1}">${t.aufhaengung !== null ? `<b class="${ampelVon(t.aufhaengung)}">${zahl(t.aufhaengung)}</b>` : '–'}</td>
      <td>${esc(t.bez ?? '')}</td>
      <td class="n amp ${ampelVon(eta)}" data-w="${eta}">${zahl(eta)}</td></tr>`).join('');
  const f0 = (v) => (Number.isFinite(v) ? v.toFixed(0) : '–');
  /*
   * Die Zellen einer Reaktionszeile ab «Fundament» - für die Liste und (26.
   * November) für die Positionen: «wenn unter der auswertung die
   * reaktionskräfte als filter ausgewählt dann die reaktionskräfte bei den
   * unteren positionen unterhalb der schemata aufführen.»
   */
  const rkInhalt = (z, m) => {
    const hat = rkSpalten(z), h = z.haupt, hv = z.havarie, eta = rkEta(z, m);
    const zellen = RK_SP.map((k) => {
      if (!hat.has(k) || !h?.[k]) return '<td class="n" data-w="-1">–</td>';
      const zul = z.art === 'mast' ? rkZul(m, k) : null;
      const ueber = Number.isFinite(zul) && h[k].wert > zul + 1e-9;
      return `<td class="n${ueber ? ' fail' : ''}" data-w="${h[k].wert}" title="${esc(h[k].bez ?? '')}"><b>${f0(h[k].wert)}</b>${
        hv?.[k] ? `<small>Hav. ${f0(hv[k].wert)}</small>` : ''}${Number.isFinite(zul) ? `<small>zul ${f0(zul)}</small>` : ''}</td>`;
    }).join('');
    const vZul = z.art === 'mast' ? rkZul(m, 'V') : null;
    const a = z.anteil?.quer;
    const fu = rkFundament(z, m);
    return `<td data-w="${esc(fu)}">${esc(fu)}</td>
      <td class="n" data-w="${h?.Vmax?.wert ?? 0}" title="${esc(`min: ${h?.Vmin?.bez ?? ''} · max: ${h?.Vmax?.bez ?? ''}`)}"><b>${f0(h?.Vmin?.wert)} / ${f0(h?.Vmax?.wert)}</b>${
        hv ? `<small>Hav. ${f0(hv.Vmin?.wert)} / ${f0(hv.Vmax?.wert)}</small>` : ''}${Number.isFinite(vZul) ? `<small>zul 0 / ${f0(vZul)}</small>` : ''}</td>
      ${zellen}
      <td class="n" title="${a ? esc(`ständig ${f0(a.staendig)}, veränderlich ${f0(a.veraenderlich)}`) : ''}">${a ? `${Math.round(a.prozent * 100)} / ${Math.round((1 - a.prozent) * 100)}` : '–'}</td>
      <td>${esc(rkFall(z, h))}</td>
      <td class="n amp ${ampelVon(eta)}" data-w="${Number.isFinite(eta) ? eta : -1}">${zahl(eta)}</td>`;
  };
  const rkZeilen = rk.map(({ r, z, m }) => `<tr ${attr(r, rkFundament(z, m), rkEta(z, m))}>${kopfZellen(r, z.anzeige)}
      ${rkInhalt(z, m)}</tr>`).join('');
  const rkKopf = `<th class="s">Fundament</th>
    <th class="s n">V min / max [kN]</th>${RK_SP.map((k) => `<th class="s n">±${RK_KOPF[k][0]} [${RK_KOPF[k][1]}]</th>`).join('')}
    <th class="n">ständig / veränderl. [%]</th><th>massgebender Fall</th><th class="s n">η</th>`;
  // Je Eintrag die Reaktionen unter dem Schema; sichtbar mit dem Umschalter «Reaktionskräfte».
  const rkPos = (r) => {
    const zl = rk.filter((x) => x.r === r);
    return zl.length ? `<div class="pos-rk" hidden><h4>Reaktionskräfte der Fundamente (charakteristisch)</h4>
      <div class="rollen"><table><thead><tr><th class="s">Pos.</th>${rkKopf}</tr></thead><tbody>${zl.map(({ z, m }) =>
        `<tr><td><b>${esc(z.anzeige)}</b></td>${rkInhalt(z, m)}</tr>`).join('')}</tbody></table></div></div>` : '';
  };
  const kopfR = '<th class="s">Eintrag</th><th class="s n">km</th><th class="s">Pos.</th>';
  const listen = `
  <div class="liste" data-liste="fund"><h3 class="lt">Fundamente</h3><div class="rollen"><table><thead><tr>${kopfR}<th class="s">Fundament</th><th>Mast</th>
    ${spalten.map((g) => `<th class="s n">${esc(g.kopf)}</th>`).join('')}<th>massgebend</th><th class="s n">η</th></tr></thead>
    <tbody>${fundZeilen}</tbody></table></div>
    <p class="hinweis">Charakteristische Einwirkungen am Mastfuss gegen die zulässigen Standardlasten; je Grösse η, darunter
      Einwirkung / zulässig [kN, kNm]. Grau: lenkt den Fundamentablauf, kein Nachweis. η nach dem Ablauf.</p></div>
  <div class="liste" data-liste="rk" hidden><h3 class="lt">Reaktionskräfte der Fundamente</h3><div class="rollen"><table><thead><tr>${kopfR}${rkKopf}</tr></thead>
    <tbody>${rkZeilen}</tbody></table></div>
    <p class="hinweis">Charakteristisch (alle Beiwerte 1, Wind ohne 0.7) am Mastfuss bzw. Ankerfundament, Druck positiv; je Grösse
      der massgebende Betrag, darunter klein Havarie und zulässige Standardlast (rot: über der Standardlast). η des Fundaments nach dem Ablauf.</p></div>
  <div class="liste" data-liste="mast" hidden><h3 class="lt">Masten</h3><div class="rollen"><table><thead><tr>${kopfR}<th class="s">Profil</th>
    <th class="s n">L [m]</th><th>Steg</th><th class="s n">η Querschn.</th><th class="s n">η Knicken</th><th>Anker</th>
    <th>Lastfall</th><th class="s n">η</th></tr></thead><tbody>${mastZeilen}</tbody></table></div>
    <p class="hinweis">Bemessung (Tragsicherheit) aus dem Stabwerk; η = Maximum aus Querschnitt und Knicken (SIA 263).</p></div>
  <div class="liste" data-liste="joch" hidden><h3 class="lt">Joche / Ausleger</h3><div class="rollen"><table><thead><tr>${kopfR}<th class="s">Art</th>
    <th class="s">Bautyp</th><th class="s n">H [m]</th><th>Masten</th><th class="s n">η Träger</th><th class="s n">η Aufhäng.</th>
    <th>Lastfall</th><th class="s n">η</th></tr></thead><tbody>${jochZeilen}</tbody></table></div>
    <p class="hinweis">Gurte und Bindebleche aus dem Stabwerk (Tragsicherheit); am Tragausleger dazu die Aufhängung gegen V_zul.</p></div>`;
  /* ---------- Positionen ---------- */
  const positionen = res.eintraege.map((r, i) => {
    if (r.fehler) {
      return `<div class="pos" id="pos-${i}"><h3>${esc(r.name)}</h3><p class="fehler">Nicht gerechnet: ${esc(r.fehler)}</p></div>`;
    }
    const tz = (r.tragwerke ?? []).filter((t) => t.key !== 'einzelmast').map((t) => `<tr><td>${esc(t.pos)}</td>
      <td>${esc(t.art)} ${esc(t.bau)}</td><td class="n amp ${ampelVon(Math.max(t.eta ?? 0, t.aufhaengung ?? 0))}">${zahl(Math.max(t.eta ?? 0, t.aufhaengung ?? 0))}</td>
      <td>${t.aufhaengung !== null ? `Aufhängung ${zahl(t.aufhaengung)}` : esc(t.bez ?? '')}</td></tr>`).join('');
    const mz = (r.masten ?? []).map((m) => `<tr><td>${esc(m.anzeige)}</td>
      <td>Mast ${esc(m.profil)}${m.laenge ? ` · ${m.laenge.toFixed(2)} m` : ''}</td>
      <td class="n amp ${ampelVon(Math.max(m.eta ?? 0, m.knick ?? 0))}">${zahl(Math.max(m.eta ?? 0, m.knick ?? 0))}</td>
      <td>${m.knick !== null ? `Querschnitt ${zahl(m.eta)} · Knicken ${zahl(m.knick)}` : ''}${m.anker
        ? ` · ${esc(m.anker.typ)} ${zahl(m.anker.eta)}` : ''}</td></tr>
      <tr><td></td><td>Fundament ${esc(m.fundament?.typ ?? (m.unterbau ? 'Unterbau (nicht nachgewiesen)' : '–'))}</td>
      <td class="n amp ${ampelVon(m.fundament?.eta)}">${zahl(m.fundament?.eta)}</td>
      <td>${esc(m.fundament?.massgebend?.was ?? '')}</td></tr>${m.ankerFundament ? `
      <tr><td>A${esc(m.anzeige)}</td><td>Ankerfundament ${esc(m.ankerFundament.typ)}</td>
      <td class="n amp ${ampelVon(m.ankerFundament.eta)}">${zahl(m.ankerFundament.eta)}</td>
      <td>${esc(m.ankerFundament.massgebend?.was ?? '')}</td></tr>` : ''}`).join('');
    return `<div class="pos" id="pos-${i}">
      <h3>${esc([r.km && `km ${r.km}`, (r.masten ?? []).map((m) => m.anzeige).join(' – ')].filter(Boolean).join(' · '))}
        <span class="ort">${esc([r.name, r.linie && `Linie ${r.linie}`, r.ortschaft,
          `L_FL ${paramText(PARAM.find((p) => p.key === 'lfl'), r.param?.lfl)} m`,
          `R ${paramText(PARAM.find((p) => p.key === 'radius'), r.param?.radius)}`].filter(Boolean).join(' · '))}</span></h3>
      ${r.bemerkung ? `<p class="kommentar">${esc(r.bemerkung)}</p>` : ''}
      ${r.aenderungen?.length ? `<p class="aenderung"><b>Geändert seit Ausgangszustand${r.ausgangDatum
        ? ` (${esc(new Date(r.ausgangDatum).toLocaleDateString('de-CH'))})` : ''}:</b> ${esc(r.aenderungen.map((a) =>
        `${a.wer} ${a.feld === 'neu' || a.feld === 'entfernt' ? a.feld : `${a.feld} ${a.alt || '–'} → ${a.neu || '–'}`}`).join(' · '))}</p>` : ''}
      <div class="pos-in"><div>${eintragSkizze(r)}<p class="hinweis">Profilzeichen am Mastfuss (Grundriss):
        H = Steg in der Jochachse, I = Steg quer zur Jochachse.</p></div>
        <table><thead><tr><th></th><th>Bauteil</th><th class="n">η</th><th>massgebend</th></tr></thead>
        <tbody>${tz}${mz}</tbody></table></div>${rkPos(r)}</div>`;
  }).join('');
  const ordnen = (id) => `<select data-ordnen="${id}">${[['eta', 'η (absteigend)'], ['km', 'km'], ['typ', 'Typ'],
    ['eintrag', 'Eintrag']].map(([k, t], i) => `<option value="${k}"${(id === 1 ? i === 0 : false) ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Projektauswertung ${esc(res.projekt)}</title><style>${STIL}</style></head><body>
  <h1>Projektauswertung</h1>
  <p class="unter">${esc(res.projekt || 'Ohne Projekt')} · ${res.eintraege.length} Einträge · ${esc(res.datum)}</p>
  <div class="kopf">
    <div><h2>Grundlagen</h2>${gemein}${jeEintrag ? `<p class="hinweis">Je Eintrag (Spannweite und Radius gelten dem Blatt):</p>${jeEintrag}` : ''}</div>
    <div><h2>Kennzahlen</h2>${kennzahlen}
      <p class="hinweis">Anzahl Positionen je Bereich des Erfüllungsgrads η. Masten mit Knicken, Joche mit Aufhängung.</p>
      ${fehlerZeile}${aenderungTabelle}</div>
  </div>
  <h2>Auswertung</h2>
  <div class="wahl">
    <span class="seg" data-seg="liste"><button data-l="alle">Alle</button><button class="an" data-l="fund">Fundamente</button><button data-l="rk">Reaktionskräfte</button><button data-l="mast">Masten</button><button data-l="joch">Joche</button></span>
    <span class="seg" data-seg="amp"><button class="an" data-f="alle">alle</button><button data-f="fail">&gt; 1.00</button><button data-f="warn">0.90-1.00</button><button data-f="ok">≤ 0.90</button></span>
    <label>Ordnen nach ${ordnen(1)}</label><label>dann nach <select data-ordnen="2"><option value="">–</option>
      <option value="eta">η (absteigend)</option><option value="km">km</option><option value="typ">Typ</option><option value="eintrag">Eintrag</option></select></label>
  </div>
  ${listen}
  <h2 class="bruch">Positionen</h2>
  <p class="hinweis">Übersicht quer zum Gleis aus dem Stabmodell: über den Bauteilen Bautyp und η, unter den Mastfüssen
    Fundamenttyp und η (Farbe nach der Ampel).</p>
  ${positionen}
  <p class="fuss">${esc(APP_NAME)} ${esc(fassung)}.</p>
  <script>
  (function () {
    var listen = document.querySelectorAll('.liste');
    var aktiv = function () { return document.querySelector('.liste:not([hidden]) tbody'); };
    var filter = 'alle';
    var wert = function (r, k) {
      if (k === 'eta') return -parseFloat(r.dataset.eta);
      if (k === 'km') { var v = parseFloat(r.dataset.km); return isNaN(v) ? Infinity : v; }
      return k === 'typ' ? r.dataset.typ : r.dataset.eintrag;
    };
    var vgl = function (a, b) { return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de', { numeric: true }); };
    var ordne = function () {
      var k1 = document.querySelector('[data-ordnen="1"]').value, k2 = document.querySelector('[data-ordnen="2"]').value;
      listen.forEach(function (l) {
        var tb = l.querySelector('tbody'), rows = Array.prototype.slice.call(tb.rows);
        rows.sort(function (a, b) { return vgl(wert(a, k1), wert(b, k1)) || (k2 ? vgl(wert(a, k2), wert(b, k2)) : 0); });
        rows.forEach(function (r) { tb.appendChild(r); });
      });
    };
    var zeige = function () {
      listen.forEach(function (l) { Array.prototype.forEach.call(l.querySelector('tbody').rows, function (r) {
        r.style.display = filter === 'alle' || r.dataset.amp === filter ? '' : 'none'; }); });
    };
    document.querySelectorAll('[data-seg="liste"] button').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('[data-seg="liste"] button').forEach(function (x) { x.classList.toggle('an', x === b); });
        listen.forEach(function (l) { l.hidden = b.dataset.l !== 'alle' && l.dataset.liste !== b.dataset.l; });
        document.querySelectorAll('.pos-rk').forEach(function (d) { d.hidden = b.dataset.l !== 'rk'; });
      };
    });
    document.querySelectorAll('[data-seg="amp"] button').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('[data-seg="amp"] button').forEach(function (x) { x.classList.toggle('an', x === b); });
        filter = b.dataset.f; zeige();
      };
    });
    document.querySelectorAll('[data-ordnen]').forEach(function (s) { s.onchange = ordne; });
    listen.forEach(function (l) {
      var t = l.querySelector('table'), tb = t.tBodies[0];
      Array.prototype.forEach.call(t.tHead.rows[0].cells, function (th, i) {
        if (!th.classList.contains('s')) return;
        var ab = th.classList.contains('n');
        th.onclick = function () {
          ab = !ab;
          var rows = Array.prototype.slice.call(tb.rows);
          rows.sort(function (a, b) {
            var x = a.cells[i].dataset.w, y = b.cells[i].dataset.w, nx = parseFloat(x), ny = parseFloat(y);
            var c = isNaN(nx) || isNaN(ny) ? String(x).localeCompare(String(y), 'de', { numeric: true }) : nx - ny;
            return ab ? -c : c;
          });
          rows.forEach(function (r) { tb.appendChild(r); });
        };
      });
      Array.prototype.forEach.call(tb.rows, function (r) {
        r.onclick = function () { var z = document.getElementById(r.dataset.ziel); if (z) z.scrollIntoView({ behavior: 'smooth' }); };
      });
    });
    ordne();
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

