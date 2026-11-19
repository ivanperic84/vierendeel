/**
 * app.viewer.js - die Viewer-Ausleitung (18. November).
 *
 * Weisung: «als viewer stelle ich mir eine html ausleitung vor wo man das
 * modell betrachten kann und der bericht enthalten ist, alles hardcoded»,
 * dazu «ist es auch möglich den bericht interaktiv zu gestalten wo man die
 * auf die jeweiligen abbildungen klicken kann und man dann zu der 3d switcht
 * dynamisch? zustäzlich noch die verwendeten tragwersteile mit den
 * dazugehörigen querschnitten und einem Massenauszug aufführen.»
 *
 * EINE DATEI, DIE NICHT RECHNET. Sie trägt:
 *   - die Szene des 3D-Bildes (Hülle, mit verformter Figur) als Zahlen,
 *   - je Lastfall die Werte der Flächen (η, σ_v, σ, M, V, N, T),
 *   - den Nachweisbericht des Stabwerks (mit Ansichtsangaben an den Bildern),
 *   - die Tragwerksteile mit Querschnitten und den Massenauszug,
 *   - die Laufzeit (js/viewer.js, beim Bündeln nach js/viewer.laufzeit.js).
 * Keine Sortimente, kein Rechenkern, keine Eingabe. Was im Bericht steht,
 * steht dort schon gerechnet - mehr verrät die Datei nicht.
 */
import { VIEWER_LAUFZEIT } from './viewer.laufzeit.js';
import { berichtStabwerkHtml, stabwerkBerichtDaten } from './app.bericht.js';
import { berichtVorgabe } from './export.nachweisbericht.js';
import { blattUrteil } from './export.stabbericht.js';
import { reiheOhneStabmodell } from './app.stabwerk.js';
import { APP_NAME, dateiStamm, rechensatz, verortung } from './core.constants.js';
import { dateiSpeichern } from './store.js';
import { zustandGeometrie, zustandAussen, zustandFall, ZL_PUNKTE } from './core.zustandslinien.js';
import { versatz as zustandVersatz } from './app.zustand.js';
import { fundamentNachweisText } from './ui.js';
import { ekVonWindklasse } from './core.lasten.js';

/** Die Grössen, die je Lastfall wechseln (w und η w gelten der Hülle). */
export const VIEWER_FELDER = ['eta', 'sig_v', 'sig', 'M', 'V', 'N', 'T'];

/** Zahl auf vier Stellen nach dem Komma - Koordinaten auf 0.1 mm, η auf 1e-4. */
const rund = (v) => (Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : v);

/**
 * Eine Szene als reine Daten: ohne Funktionen, ohne Merkfelder (`_…`),
 * Zahlen gerundet. Geteilte Teilobjekte werden mehrfach geschrieben - die
 * Szene hat keine echten Zyklen (gemessen: JSON.stringify geht durch).
 */
export function szeneDaten(sz) {
  return JSON.parse(JSON.stringify(sz, (k, v) => {
    if (typeof v === 'function' || k.startsWith('_')) return undefined;
    if (v instanceof Map) return undefined;
    return typeof v === 'number' ? rund(v) : v;
  }));
}

/** Kennung einer Fläche, um sie in der Szene eines Lastfalls wiederzufinden. */
const flaechenKey = (f) => `${f.gruppe}|${f.teil ?? ''}|${f.station ?? ''}|${rund(f.xMitte ?? 0)}|${f.twId ?? ''}`;

/**
 * Je Lastfall die Werte der Flächen der Hülle, in derselben Reihenfolge
 * (null, wo die Fläche keinen Wert trägt). Zugeordnet über die Kennung der
 * Fläche und ihr Vorkommen, nicht über den Index: Pfeile und Marken können
 * je Fall anders ausfallen.
 */
export function werteJeFall(huelle, faelle) {
  const index = new Map();
  huelle.flaechen.forEach((f, i) => {
    const k = flaechenKey(f);
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(i);
  });
  return faelle.map((fa) => {
    // Je Fläche ein Verweis in die Wertetabelle des Falls (-1 = ohne Wert):
    // die Flächen eines Stabes tragen dieselben Werte, die Tabelle ist
    // deshalb viel kürzer als die Flächenliste (J90/20 m: 4.4 MB → s. Prüfstand).
    const idx = new Array(huelle.flaechen.length).fill(-1);
    const tab = [], tabIndex = new Map();
    const zaehler = new Map();
    let gefunden = 0;
    (fa.szene?.flaechen ?? []).forEach((f) => {
      if (!f.werte) return;
      const k = flaechenKey(f);
      const n = zaehler.get(k) ?? 0;
      zaehler.set(k, n + 1);
      const i = index.get(k)?.[n];
      if (i === undefined) return;
      const zeile = VIEWER_FELDER.map((feld) => rund(f.werte[feld] ?? null));
      const k2 = zeile.join('|');
      if (!tabIndex.has(k2)) { tabIndex.set(k2, tab.length); tab.push(zeile); }
      idx[i] = tabIndex.get(k2);
      gefunden++;
    });
    return { key: fa.key, bez: fa.bez, art: fa.art, tab, idx, gefunden };
  });
}


/*
 * >>> ERGÄNZUNGEN VOM 19. NOVEMBER. <<< Weisung, im Wortlaut: «einzelne
 * ausnutzungen anzeigen / lastfälle nur massgebende je einwirkungsrichtung /
 * darstellungsbutton liniendiagramm / bei der explosion das liniendiagramm
 * auch darstellen / zusammenfassung für fundamentnachweis bestimmung. /
 * voreinstellung ohne lasten / die grenze bei der ausnutzung beim farbbalken
 * bei 1.0 setezen nicht 1.25 […] die hauptkennwerte (EK / Trasse / reduktion)
 * aufführen.»
 */

/**
 * Die Einwirkungsrichtung eines Nachweisfalls (nur Tragsicherheit und
 * Havarie), oder null. Meine Lesart von «je Einwirkungsrichtung»: der
 * leitende Wind quer bzw. längs zum Gleis, Schnee mit Begleitwind quer bzw.
 * längs, Havarie.
 */
export function viewerRichtung(l) {
  if (l.art === 'aussergewoehnlich') return { key: 'havarie', label: 'Havarie' };
  if (l.art !== 'tragsicherheit') return null;
  const b = l.beiwerte ?? {};
  if (l.leit === 'Schnee') {
    return Math.abs(Number(b.WindX) || 0) > Math.abs(Number(b.WindY) || 0)
      ? { key: 'schneeQuer', label: 'Schnee, Wind quer' } : { key: 'schneeLaengs', label: 'Schnee, Wind längs' };
  }
  if (l.leit === 'WindX') return { key: 'quer', label: 'Wind quer zum Gleis' };
  if (l.leit === 'WindY') return { key: 'laengs', label: 'Wind längs zum Gleis' };
  return { key: 'andere', label: 'Weitere' };
}
const RICHTUNG_FOLGE = ['quer', 'laengs', 'schneeQuer', 'schneeLaengs', 'havarie', 'andere'];

/** Je Einwirkungsrichtung der Fall mit dem grössten η (aus den Werten der Flächen). */
export function massgebendeFaelle(werte, faelle) {
  const best = new Map();
  werte.forEach((w, i) => {
    const r = viewerRichtung(faelle[i] ?? {});
    if (!r) return;
    const eta = Math.max(0, ...w.tab.map((z) => (Number.isFinite(z[0]) ? z[0] : 0)));
    const b = best.get(r.key);
    if (!b || eta > b.eta) best.set(r.key, { ...w, eta, gruppe: r.label, gruppeKey: r.key });
  });
  return RICHTUNG_FOLGE.filter((k) => best.has(k)).map((k) => best.get(k));
}

const r3 = (v) => (Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null);

/**
 * Die Zustandslinien als Daten: Geometrie der Stäbe und je Nachweisfall die
 * sechs Schnittgrössen an 11 Stellen (dazu σ_v). Der Viewer baut daraus die
 * Linie mit derselben Funktion wie die Anwendung (core.zustandwerte.js).
 */
export function zustandDaten(app) {
  const g = app.stabwerkGilt?.();
  const roh = g?.h?.roh;
  if (!roh?.dat || !roh.lsg) return null;
  const geo = zustandGeometrie(roh.dat);
  const fyd = roh.auswertung?.fyd ?? 1;
  const faelle = (roh.auswertung?.faelle ?? []).map((lf) => {
    const f = zustandFall(roh.dat, roh.lsg, geo, lf, { spannung: true, fyd, auswertung: roh.auswertung?.opt });
    return { key: lf.key, bez: lf.bez,
      w: f.w.map((pkt) => pkt.flatMap((q) => q.map(r3))),
      sig: f.sig ? f.sig.map((z) => z.map((v) => (v === null ? null : Math.round(v * 10) / 10))) : null };
  });
  const v = (a) => (a ? a.map((c) => rund(c)) : null);
  return {
    punkte: ZL_PUNKTE, fyd, versatz: zustandVersatz(app, roh),
    geo: geo.map((s) => ({ n: s.n, r: s.r, a: v(s.a), b: v(s.b), ex: v(s.ex), ey: v(s.ey), ez: v(s.ez), dSig: v(s.dSig) })),
    aussen: zustandAussen(geo),
    faelle,
  };
}

/** Die Zusammenfassung des Fundamentnachweises je Mast. */
export function fundamentDaten(d) {
  return (d.masten ?? []).filter((m) => m.fundament && !m.fundament.fehlt && m.fundament.nachweise).map((m) => {
    const q = m.fundament;
    const ablauf = Object.values(q.ablauf ?? {}).map((r) => ({
      richtung: r.richtung, ergebnis: r.ergebnis, schritt: r.schritt, eta: r.eta }));
    return {
      mast: m.anzeige, typ: q.typ?.typ ?? m.fundamentTyp ?? '', gelaende: q.gelaende ?? null,
      eta: q.eta, stufe: q.stufe, ok: q.ok, text: fundamentNachweisText(q, m.anzeige),
      ablauf,
      zeilen: q.nachweise.map((n) => ({ was: n.was, wert: n.wert, zul: n.zul, eta: n.eta,
        einheit: n.einheit ?? '', lenkt: n.lenkt === true, bez: n.bez ?? null })),
    };
  });
}

/** Die Hauptkennwerte des Querprofils (wie die Grundwerte über dem 3D). */
export function kennwerteDaten(w) {
  const ek = ekVonWindklasse(w.windKlasse);
  const R = Number(w.trasseRadius) || 0;
  const k = [ek === 'EK0' ? 'Einheitswind' : ek, `Spannweite L_FL ${(Number(w.flSpannweite) || 0).toFixed(0)} m`,
    Math.abs(R) < 1e-9 || Math.abs(R) >= 1e5 ? 'gerades Gleis' : `Radius ${R.toFixed(0)} m`];
  k.push(w.windReduktion ? 'Wind × 0.74' : 'ohne Windreduktion');
  k.push(w.schneeAktiv ? 'mit Schnee' : 'ohne Schnee');
  if (w.theorie2) k.push('Theorie 2. Ordnung');
  return k;
}

/** Die Daten des Viewers (ohne Laufzeit) - auch für den Prüfstand. */
export function viewerDaten(app) {
  const grund = reiheOhneStabmodell(app.werte);
  if (grund) throw new Error(`Viewer nicht möglich: ${grund}`);
  const d = stabwerkBerichtDaten(app);
  const wahl = { ...berichtVorgabe(), umfang: 'anhang' };
  const bericht = berichtStabwerkHtml(app, wahl, d);
  const sz = app.viewerSzenen();
  if (!sz) throw new Error('Viewer nicht möglich: kein gültig gerechnetes Stabwerk.');
  const huelle = szeneDaten(sz.szene);
  const U = blattUrteil(d);
  return {
    format: 'vierendeel-viewer', version: 1,
    titel: app.projekt?.name || 'Querprofil', ort: verortung(app.werte) || '',
    fassung: `${APP_NAME} ${app.VERSION}`, datum: new Date().toLocaleDateString('de-CH'),
    urteil: { eta: U.eta, massgebend: U.massgebend?.name ?? null,
              liste: U.liste.map((x) => ({ name: x.name, eta: x.eta, ueber: x.ueber, bez: x.bez ?? null })) },
    szene: huelle,
    verformt: sz.verformt ? szeneDaten(sz.verformt) : null,
    felder: VIEWER_FELDER,
    // Nur der massgebende Fall je Einwirkungsrichtung (19. November).
    faelle: massgebendeFaelle(werteJeFall(sz.szene, sz.faelle), sz.faelle),
    kennwerte: kennwerteDaten(rechensatz(app.werte)),
    fundamente: fundamentDaten(d),
    zustand: zustandDaten(app),
    karte: sz.karte,
    massen: d.massen,
    bericht,
  };
}

/** Die fertige HTML-Datei. */
export function viewerHtml(daten) {
  const json = JSON.stringify(daten).replace(/</g, '\\u003c');
  const titel = String(daten.titel ?? 'Viewer').replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  return VIEWER_LAUFZEIT
    .replace('__VIEWER_TITEL__', titel)
    .replace('__VIEWER_DATEN__', () => json);
}

/** Der Knopf im Exportmenü. */
export function viewerAusleiten(app) {
  const daten = viewerDaten(app);
  const html = viewerHtml(daten);
  dateiSpeichern(html, `${dateiStamm(rechensatz(app.werte))}_Viewer.html`, 'text/html');
  const mb = (html.length / 1048576).toFixed(1);
  app.meldeImBalken(`Viewer ausgeleitet (${mb} MB, ${daten.faelle.length} Lastfälle).`);
}
