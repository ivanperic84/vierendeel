/**
 * render.tragausleger.js
 * ===========================================================================
 * DER TRAGAUSLEGER IM BILD (28. September, Etappe 3c).
 *
 * Bis hierher zeigte das 3D-Bild beim Ausleger das ERSATZJOCH, das der
 * Ersatzbalken für ihn rechnete: vier Winkel, zwei Masten, «J90 · 13.00 m».
 * Das Bauteil sind zwei UPE 140 nebeneinander, Bindebleche oben und unten,
 * eine Aufhängung zum Masten, dazu der Längsanker am Kragarmende.
 *
 * >>> DIE GESTALT KOMMT AUS DEM STABMODELL. <<<
 *
 * `tragauslegerModell` (export.axisvm.tragausleger.js) ist das, was das
 * Stabwerk rechnet und AxisVM baut - samt der Seite (links oder rechts,
 * gespiegelt nur in der Geometrie). Gezeichnet wird dieselbe Liste: die
 * Gurte an ihren Knoten, die Bleche an ihren Stationen, die Aufhängung von
 * ihrem Mastpunkt zur Traverse. Eine zweite Herleitung der Geometrie hätte
 * beim nächsten Umbau eine andere Antwort.
 *
 * Die Szene hat dieselbe Gestalt wie die des Tragjochs und des Abfangjochs
 * (`flaechen`, `linien`, `marken`, `masse`, `bauteiltitel`, `vektoren`,
 * `legende`, `grenzen`), damit Verschieben, Vereinen und die Legende sie
 * ohne Sonderweg annehmen.
 *
 * >>> DIE FARBE KOMMT AUS DEM STABWERK. <<<
 *
 * Der Ausleger wird im Stabwerk nachgewiesen; liegt sein Ergebnis vor
 * (`opt.jeStab`), trägt jeder Gurtabschnitt und jedes Blech sein η. Ohne
 * Stabwerk bleibt der Wertesatz leer - die Ansicht färbt dann neutral, statt
 * eine Zahl zu behaupten, die niemand gerechnet hat.
 * ===========================================================================
 */

import { tragauslegerModell } from './export.axisvm.tragausleger.js';
import { getTragausleger } from './data.abfangjoche.js';
import { getGurtprofil } from './data.profiles.js';
import { getMastprofil, getStegrichtung } from './data.masten.js';
import { baugruppeSumme } from './data.anbauteile.js';
import { anbauKette } from './core.anbauteile.js';
import { ekVonWindklasse } from './core.lasten.js';
import { bauteilFarbe } from './design.js';
import { prisma, platte, stab, schraegerStab, quader, walzProfilPoly,
         mastKoerper } from './render.koerper.js';

const OHNE_WERTE = Object.freeze({});
const pfeilLaenge = (kN) => 0.30 + 0.55 * Math.sqrt(Math.abs(kN) / 20);
const LASTART = { G: 'staendig', WindX: 'windX', WindY: 'windY', Schnee: 'schnee' };

/**
 * Die Szene eines Tragauslegers, örtlich: Mastachse bei x = 0, die Achse
 * des Auslegers auf z = 0, der Mastfuss bei −H.
 *
 * @param {object} satz  Rechensatz des Auslegers
 * @param {object} opt   { mast (Angabe wie beim Abfangjoch: profil, hoehe,
 *                       ueberstand, stegrichtung, name, anker), ergMast,
 *                       ergVerf, jeStab, praefix }
 */
export function auslegerSzene(satz, opt = {}) {
  const d = tragauslegerModell(satz);
  const t = getTragausleger(Number(satz.L));
  const p = getGurtprofil(t.profil);
  const sp = satz.auslegerSeite === 'links' ? -1 : 1;
  const hG = p.h / 100;
  const kn = new Map(d.knoten.map((k) => [k.name, k]));
  // b aus dem Winkel und der Mastkopf, wie das Modell sie baut (28. Sept.).
  const bS = d.tragausleger.b;
  const zKopfModell = Math.max(...d.knoten.filter((k) => /^MAST_A_/.test(k.name)).map((k) => k.z));

  const rohFlaechen = [];
  const flaechen = {
    push: (...f) => rohFlaechen.push(...f.map((x) => ({ werte: OHNE_WERTE, ...x }))),
  };
  const linien = [], marken = [], masse = [], bauteiltitel = [], vektoren = [];
  const bauteile = new Map();
  const farbeFuer = (schluessel, label, art) => {
    if (!bauteile.has(schluessel)) {
      bauteile.set(schluessel, { schluessel, label, art,
                                 farbe: bauteilFarbe(bauteile.size), anzahl: 0 });
    }
    const b = bauteile.get(schluessel);
    b.anzahl += 1;
    return b.farbe;
  };
  /** Die Werte eines Stabes aus dem Stabwerk - im Blatt mit Präfix. */
  const werteVon = (name) => {
    const s = opt.jeStab?.[`${opt.praefix ?? ''}${name}`] ?? opt.jeStab?.[name];
    return s ? { eta: s.eta, sig_v: s.sig, sig: s.sig } : OHNE_WERTE;
  };

  /* --- Die Gurte: je Stab ein Prisma mit dem U-Umriss --------------------- *
   * Die Öffnung zeigt nach aussen, der Stegrücken innen (Schnitt A-A); das
   * gilt auf beiden Seiten des Masten - gespiegelt wird die Lage, nicht das
   * Profil.
   */
  const fbGurt = farbeFuer(`profil|${p.name}`, `Gurt · ${p.name}`, 'profil');
  bauteile.get(`profil|${p.name}`).anzahl = 2;
  d.staebe.filter((s) => /^[VH]_S\d+$/.test(s.name)).forEach((s) => {
    const a = kn.get(s.von), b = kn.get(s.bis);
    const seite = s.name.startsWith('V') ? 1 : -1;
    const poly = walzProfilPoly(p, { oeffnung: seite })
      .map(([y, z]) => [y + a.y * 1000, z]);
    flaechen.push(...prisma(poly, Math.min(a.x, b.x), Math.max(a.x, b.x), {
      gruppe: 'profil', teil: seite > 0 ? 'GURT_V' : 'GURT_H',
      station: Number(s.name.split('_S')[1]), farbeBauteil: fbGurt,
      werte: werteVon(s.name),
      label: `Gurt ${seite > 0 ? 'vorn' : 'hinten'} · ${p.name} · ${s.name}`,
    }));
  });

  /* --- Die Bindebleche, oben und unten ------------------------------------ */
  const d2 = t.spreizung / 1000;
  const zBl = d.knoten.find((k) => /^BL_O\d+_V$/.test(k.name))?.z ?? hG / 2 - 0.011;
  d.staebe.filter((s) => /^BL_[OU]\d+$/.test(s.name)).forEach((s) => {
    const a = kn.get(s.von);
    const oben = s.name.startsWith('BL_O');
    const fb = farbeFuer(`blech|${t.blech.b}x${t.blech.t}`,
                         `Bindeblech FL ${t.blech.b}×${t.blech.t}×${t.blech.l}`, 'blech');
    flaechen.push(...platte(a.x, t.blech.b, 'z', oben ? zBl : -zBl, -d2 / 2, d2 / 2, {
      gruppe: 'blech', teil: s.name, dicke: t.blech.t, farbeBauteil: fb,
      werte: werteVon(s.name),
      label: `Bindeblech ${oben ? 'oben' : 'unten'} · ${s.name}`,
    }));
  });

  /* --- Traverse, Aufhängung, Anschluss am Masten, Längsanker --------------- */
  const tr = kn.get('TRAVERSE_M');
  const seil = kn.get('MAST_A_SEIL');
  const fbAuf = farbeFuer('aufhaengung', `Aufhängung ${t.seil.anzahl} × ${t.seil.querschnitt} mm²`, 'anbau');
  // Zwei Seile an den Enden der Traverse (Entscheid 28. September), sonst
  // eines in der Achse - wie im Modell.
  const enden = ['TRAVERSE_P', 'TRAVERSE_N'].map((n) => kn.get(n)).filter(Boolean);
  const yT = Math.max(d2 / 2 + 0.03, ...enden.map((k) => Math.abs(k.y)));
  if (tr) {
    flaechen.push(...stab([tr.x, -yT, tr.z], [tr.x, yT, tr.z], 0.05, {
      gruppe: 'anbau', teil: 'TRAVERSE', farbeBauteil: fbAuf, label: 'Ankertraverse' }));
  }
  if (tr && seil) {
    const spz = d.tragausleger.spreizung > 0
      ? ` · 2 Seile, Spreizung ±${d.tragausleger.spreizung.toFixed(2)} m` : '';
    (enden.length ? enden : [tr]).forEach((e) => {
      flaechen.push(...schraegerStab([seil.x, seil.y, seil.z], [e.x, e.y, e.z], 0.03, 0.03, {
        gruppe: 'anbau', teil: 'AUFHAENGUNG', farbeBauteil: fbAuf,
        label: `Aufhängung · c₁ ${t.seil.c1.toFixed(2)} m · b ${bS.toFixed(2)} m · `
          + `α ${d.tragausleger.alpha.toFixed(1)}°${spz}`,
        werte: OHNE_WERTE,
      }));
    });
    marken.push({ gruppe: 'anbau', art: 'anbau', teil: 'AUFHAENGUNG',
                  p: [(seil.x + tr.x) / 2, 0, (seil.z + tr.z) / 2 + 0.15], text: 'Seil' });
  }
  // Anschluss: Konsolarm und Stiel zu jedem Gurt - wie im Modell.
  d.staebe.filter((s) => /^(KONSARM|LINKSTIEL)_A[VH]$/.test(s.name)).forEach((s) => {
    const a = kn.get(s.von), b = kn.get(s.bis);
    flaechen.push(...stab([a.x, a.y, a.z], [b.x, b.y, b.z], 0.04, {
      gruppe: 'anbau', teil: 'ANSCHLUSS', farbeBauteil: fbAuf,
      label: 'Anschluss am Masten (Gabel)' }));
  });
  const lv = kn.get('LV_M');
  if (lv) {
    const fbLa = farbeFuer('laengsanker', 'Längsanker (2 Seile ±y)', 'anbau');
    [1, -1].forEach((sy) => {
      flaechen.push(...stab([lv.x, sy * d2 / 2, 0], [lv.x, sy * 1.2, 0], 0.02, {
        gruppe: 'anbau', teil: 'LAENGSANKER', farbeBauteil: fbLa,
        label: `Längsanker ${sy > 0 ? '+y' : '−y'} · nur Zug` }));
      flaechen.push(...quader([lv.x, sy * 1.2, 0], [0.08, 0.08, 0.08], {
        gruppe: 'anbau', teil: 'LAENGSANKER', farbeBauteil: fbLa, label: 'Längsanker' }));
    });
    marken.push({ gruppe: 'anbau', art: 'anbau', teil: 'LAENGSANKER',
                  p: [lv.x, 1.2, 0.15], text: 'LA' });
  }

  /* --- Die Anbauteile: die Kette wie beim Tragjoch ------------------------- *
   * `anbauKette` rechnet örtlich (vom Masten weg); gezeichnet wird mit der
   * Seite gespiegelt. Die KRÄFTE sind global und werden nicht gespiegelt -
   * dieselbe Regel wie im Modell.
   */
  const sOpt = { ek: ekVonWindklasse(satz.windKlasse), R: Number(satz.trasseRadius) || 0,
                 spannweite: Number(satz.flSpannweite) || 0 };
  const xG = (x) => sp * x;
  (satz.anbauteile ?? []).forEach((at, j) => {
    if (!at || at.aktiv === false || (at.ort ?? 'joch') !== 'joch') return;
    const xA = Number(at.x) || 0;
    if (xA < -t.hinten - 1e-9 || xA > t.L - t.hinten + 1e-9) return;
    let s = null;
    try { s = baugruppeSumme(at, sOpt); } catch { s = null; }
    const teile = s?.teile ?? [];
    const teil = `AT_${j + 1}`;
    const fb = farbeFuer(`anbau|${at.vorlage ?? at.name}`, at.name ?? 'Anbauteil', 'anbau');
    const o = (label) => ({ gruppe: 'anbau', teil, farbeBauteil: fb, label });
    const kette = anbauKette(teile, { x0: xA, zAn: 0 });
    kette.glieder.forEach((g) => {
      const p0 = [xG(g.von.x), g.von.y, g.von.z], p1 = [xG(g.bis.x), g.bis.y, g.bis.z];
      const achsen = [0, 1, 2].filter((i) => Math.abs(p1[i] - p0[i]) > 1e-6).length;
      const dk = g.rang === 0 ? 0.045 : 0.038;
      flaechen.push(...(achsen > 1 ? schraegerStab(p0, p1, dk, dk, o(at.name ?? ''))
                                   : stab(p0, p1, dk, o(at.name ?? ''))));
    });
    // Die Klemmen an beiden Gurten.
    [1, -1].forEach((sy) => {
      flaechen.push(...quader([xG(xA), sy * (d.tragausleger.e / 2), -hG / 2 - 0.03],
                              [0.07, 0.07, 0.06], o(`${at.name ?? ''} · Klemme`)));
    });
    let zMin = 0;
    teile.forEach((tp) => {
      const pAn = [xG(Number.isFinite(Number(tp.x)) ? Number(tp.x) : xA),
                   Number(tp.y) || 0, Number(tp.z) || 0];
      zMin = Math.min(zMin, pAn[2]);
      flaechen.push(...quader(pAn, [0.07, 0.07, 0.07],
                              { ...o(`${tp.name ?? ''} · Angriffspunkt`), gruppe: 'last', punkt: true }));
      Object.entries(tp.kraefte ?? {}).forEach(([gruppe, k]) => {
        const art0 = LASTART[gruppe];
        if (!art0 || !k) return;
        [{ w: k.Fz, ri: [0, 0, -1], nm: 'F_z' }, { w: k.Fy, ri: [0, 1, 0], nm: 'F_y' },
         { w: k.Fx, ri: [1, 0, 0], nm: 'F_x' }].forEach((pf) => {
          if (!pf.w) return;
          const art = gruppe === 'G' && pf.nm === 'F_x' && tp.rolle === 'drahtwerk'
            ? 'leiterzug' : art0;
          const f = Math.sign(pf.w) * pfeilLaenge(pf.w);
          vektoren.push({ gruppe: 'last', art: 'last', lastart: art, p: pAn, teil,
                          v: pf.ri.map((c) => c * f),
                          text: `${pf.nm} = ${Math.abs(pf.w).toFixed(2)} kN`,
                          titel: `${tp.name ?? at.name ?? ''} · ${pf.nm}` });
        });
      });
    });
    marken.push({ gruppe: 'anbau', art: 'anbau', teil, p: [xG(xA), 0, zMin - 0.15],
                  text: `A${j + 1}`, textLang: `A${j + 1} · ${at.name ?? ''}`,
                  titel: at.name, farbe: fb });
  });

  /* --- Der Mast ------------------------------------------------------------ */
  const mastBezug = {};
  const md = opt.mast;
  let fussUnten = null;
  if (md?.profil && md.hoehe > 0) {
    let mp = null;
    try { mp = getMastprofil(md.profil); } catch { mp = null; }
    if (mp) {
      const achse = getStegrichtung(md.stegrichtung)?.achse ?? 'y';
      const fb = farbeFuer(`mast|${mp.name}`, `Mast · ${mp.name}`, 'mast');
      /*
       * DER KOPF, DEN DAS STABMODELL BAUT: die eingetragene Länge, sonst
       * H + b - die Aufhängung braucht ihren Punkt am Masten
       * (tragauslegerModell). Die Anschrift nennt dieselbe Länge.
       */
      const zKopf = zKopfModell;
      const mk = mastKoerper({
        profil: mp, achse, x: 0, zFuss: -md.hoehe, zAnschluss: 0, zKopf,
        name: 'A', grund: `Mast ${md.name ?? 'A'} · ${mp.name}`,
        nachweis: opt.ergMast?.A ?? null, etaGzg: opt.ergVerf?.A?.eta ?? null,
        farbeBauteil: fb, anker: md.anker ?? null,
      });
      flaechen.push(...mk.flaechen);
      linien.push(...mk.linien);
      bauteiltitel.push(...(mk.bauteiltitel ?? []));
      masse.push(...(mk.masse ?? []));
      fussUnten = mk.fussUnten;
      mastBezug.A = { x: 0, zF: -md.hoehe, zAn: 0, zAchse: 0, zKopf,
                      laenge: md.hoehe + zKopf };
      const lang = md.hoehe + zKopf;
      bauteiltitel.push({ p: [0, 0, zKopf + 0.55],
        text: `${md.name ? `${md.name} · ` : ''}${mp.name} · ${lang.toFixed(2)} m`,
        mastEnde: 'A', feld: 'mastProfil', tab: 'system', gruppe: 'mast' });
      marken.push({ gruppe: 'auflager', art: 'auflager', p: [0, 0, fussUnten ?? -md.hoehe],
                    text: 'A', ohneSymbol: true });
    }
  }

  /* --- Titel und Masse ----------------------------------------------------- */
  const xE = xG(t.L - t.hinten), x0 = xG(-t.hinten);
  bauteiltitel.push({ p: [(x0 + xE) / 2, 0, hG / 2 + 0.25],
                      // Kurzform wie bei den übrigen Bauteilen («T1 · J90 ·
                      // 20.00 m»); auf Rückfrage (28. September) «TA», damit
                      // er sich vom Masten MT1 unterscheidet.
                      text: `TA · 2 × ${p.name} · ${t.L.toFixed(2)} m`,
                      feld: 'L', tab: 'system' });
  masse.push({ feld: 'L', tab: 'system', achse: 'x', p0: [Math.min(x0, xE), 0, 0],
               p1: [Math.max(x0, xE), 0, 0], ab: [0, 0, -1], d: 0.9,
               text: `L = ${t.L.toFixed(2)} m` });
  masse.push({ tab: 'system', achse: 'x', p0: [Math.min(0, xG(t.seil.c1)), 0, 0],
               p1: [Math.max(0, xG(t.seil.c1)), 0, 0], ab: [0, 0, -1], d: 1.5,
               text: `c₁ = ${t.seil.c1.toFixed(2)} m` });
  // Weiter weg vom Masten (Weisung 28. September: «die vertikale vermassung
  // weiter weg vom bauteil setzen»): 1.0 statt 0.4 m, auf der Seite ohne
  // Ausleger - bei 0.4 m lag die Anschrift auf dem Mastprofil.
  masse.push({ feld: 'auslegerB', tab: 'system', achse: 'z', p0: [0, 0, 0], p1: [0, 0, bS],
               ab: [-sp, 0, 0], d: 1.0,
               text: `b = ${bS.toFixed(2)} m · α ${d.tragausleger.alpha.toFixed(1)}°` });

  /* --- Grenzen ------------------------------------------------------------- */
  let gx0 = Infinity, gx1 = -Infinity, gy0 = Infinity, gy1 = -Infinity, gz0 = Infinity, gz1 = -Infinity;
  rohFlaechen.forEach((f) => f.punkte.forEach((pt) => {
    gx0 = Math.min(gx0, pt[0]); gx1 = Math.max(gx1, pt[0]);
    gy0 = Math.min(gy0, pt[1]); gy1 = Math.max(gy1, pt[1]);
    gz0 = Math.min(gz0, pt[2]); gz1 = Math.max(gz1, pt[2]);
  }));
  if (!Number.isFinite(gx0)) { gx0 = -1; gx1 = 1; gy0 = -1; gy1 = 1; gz0 = -1; gz1 = 1; }

  return {
    flaechen: rohFlaechen, linien, marken, masse, bauteiltitel, vektoren,
    lastflaechen: [],
    legende: [...bauteile.values()],
    grenzen: { xMin: gx0, xMax: gx1, yMin: gy0, yMax: gy1, zMin: gz0 - 1.2, zMax: gz1 + 0.8 },
    stationen: [],
    L: t.L, art: 'tragausleger', seite: sp < 0 ? 'links' : 'rechts',
    xNachweis: null,
    bezug: { joch: null, masten: mastBezug },
  };
}
