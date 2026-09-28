/**
 * core.tragausleger.js
 * ---------------------------------------------------------------------------
 * DER KRAGARM-KERN DES TRAGAUSLEGERS - die lotrechte Ebene, fuer die
 * vorlaeufige Anzeige (28. September, Etappe 3b).
 *
 * Entscheid vom 26. September: «Kern für die Anzeige: den Abfangjoch-Kern
 * anpassen (Gelenk am Mast, Seilauflager bei c₁, Kragarm c₂); das Urteil
 * bleibt beim Stabwerk.» Auf Rückfrage am 28. September zum Umfang:
 * «Lotrecht» - nur die lotrechte Ebene. Das ist die Kontrollformel der
 * Zeichnung,
 *
 *      V = Σ(F_V · x) / c₁  +  Σ(F_H · z) / c₁
 *
 * Bindebleche, Torsion aus Wind in Gleisrichtung und der Längsanker stehen
 * NUR im Stabwerk; die Anzeige sagt es an den Kacheln.
 *
 * >>> DAS SYSTEM <<<
 *
 *   - Balken von x0 = −hinten (die Gabel hinter der Mastachse) bis xE
 *   - Gelenk am Masten (x = 0): trägt lotrecht und in der Auslegerachse
 *   - Seil bei c₁ zum Masten, b über dem Ausleger: trägt die lotrechte
 *     Kraft S_v; seine waagrechte Komponente H = S_v · c₁ / b drückt den
 *     Ausleger zwischen Masten und Seilpunkt
 *   - statisch bestimmt - die Momentensumme um das Gelenk gibt S_v
 *
 * >>> DIE LASTEN KOMMEN AUS DEM STABMODELL, NICHT AUS EINER ZWEITEN
 * HERLEITUNG. <<<
 *
 * `tragauslegerModell` (export.axisvm.tragausleger.js) setzt jedes
 * Anbauteil mit allen drei Momenten auf die Auslegerachse um und schreibt es
 * je Lastgruppe (G_Anbau, G_Ablenk, WindX, WindY, Schnee) an die beiden
 * Gurtknoten seiner Station. Dieser Kern liest genau diese Liste - Kern und
 * Stabwerk sehen dieselben Lasten. Das Eigengewicht ist das des
 * Sortiments (Gewicht der Zeile über die Länge verteilt): «Massgebend sind
 * die Daten».
 *
 * >>> ACHSEN WIE UEBERALL: x Auslegerachse, y Gleisrichtung, z lotrecht
 * nach oben; F_z der Lastliste positiv nach oben. <<<
 * ---------------------------------------------------------------------------
 */

import { tragauslegerModell } from './export.axisvm.tragausleger.js';
import { getTragausleger } from './data.abfangjoche.js';
import { getGurtprofil } from './data.profiles.js';
import { wirklicheZustaende } from './core.stabnachweis.js';
import { mastNachweise, mastNachweiseHuelle } from './core.mast.js';

const G_ERD = 9.81;

/*
 * Die Lastgruppen des Stabmodells und ihr Beiwert aus einem Lastfall.
 * «Ständig (Tragwerk)» (`nur: 'tragwerk'`) nimmt die Gewichte ohne die
 * Ablenkkraft, «Ablenkkräfte ständig» (`nur: 'ablenk'`) nur sie - wie im
 * Tragjoch-Kern und in der Ausleitung.
 */
function gruppenFaktor(lf, gruppe) {
  const bw = lf.beiwerte ?? {};
  const g = Number(bw.G) || 0;
  switch (gruppe) {
    case 'G_Anbau': case 'Eigengewicht': return lf.nur === 'ablenk' ? 0 : g;
    case 'G_Ablenk': return lf.nur === 'tragwerk' ? 0 : g;
    case 'WindX': return Number(bw.WindX) || 0;
    case 'WindY': return Number(bw.WindY) || 0;
    case 'Schnee': return Number(bw.Schnee) || 0;
    default: return 0;           // Havarie: im Stabmodell noch nicht angesetzt
  }
}

/**
 * Die Lasten des Auslegers je Gruppe, auf Stationen zusammengefasst.
 * @returns {{t, x0, xE, c1, b, q, lasten: {x, gruppe, F:[3], My}[]}}
 */
export function auslegerLasten(satz) {
  const d = tragauslegerModell(satz);
  const t = getTragausleger(Number(satz.L));
  /*
   * DIE SEITE (28. September): ein Ausleger links steht im Modell bei −x.
   * Der Kern rechnet örtlich (+x vom Masten weg) und spiegelt dafür zurück:
   * x, F_x und M_y wechseln das Vorzeichen (siehe `spiegeln` in
   * export.axisvm.tragausleger.js).
   */
  const sp = satz.auslegerSeite === 'links' ? -1 : 1;
  const kx = new Map(d.knoten.map((k) => [k.name, k]));
  const proStation = new Map();
  const eintrag = (x, gruppe) => {
    const k = `${x.toFixed(6)}|${gruppe}`;
    if (!proStation.has(k)) proStation.set(k, { x, gruppe, F: [0, 0, 0], My: 0 });
    return proStation.get(k);
  };
  d.lasten.punkt.forEach((p) => {
    const kn = kx.get(p.knoten);
    if (!kn) return;
    const e = eintrag(sp * kn.x, p.lastfall);
    const j = 'XYZ'.indexOf(p.richtung);
    e.F[j] += (j === 0 ? sp : 1) * (Number(p.wert) || 0);
  });
  d.lasten.moment.forEach((m) => {
    const kn = kx.get(m.knoten);
    if (!kn || m.richtung !== 'My') return;
    eintrag(sp * kn.x, m.lastfall).My += sp * (Number(m.wert) || 0);
  });
  const x0 = -t.hinten;
  const xE = t.L - t.hinten;
  return {
    // b aus dem Winkel, wie das Modell es baut (28. September).
    t, x0, xE, c1: t.seil.c1, b: d.tragausleger.b, sp,
    spreizung: d.tragausleger.spreizung ?? 0,
    // kg über die ganze Länge -> kN/m, nach unten
    q: (Number(t.gewicht) || 0) * G_ERD / 1000 / t.L,
    lasten: [...proStation.values()],
    hinweise: d.hinweise,
  };
}

/**
 * Ein Lastfall: Reaktionen und Schnittgrössen der lotrechten Ebene.
 *
 * Momente um die y-Achse, positiv im Drehsinn +y (eine Last nach unten
 * rechts vom Schnitt gibt am Schnitt ein positives, «hängendes» Moment).
 */
export function auslegerFall(la, lf) {
  const { x0, xE, c1, b } = la;
  const fG = gruppenFaktor(lf, 'Eigengewicht');
  const q = la.q * fG;                           // nach unten
  const punkte = la.lasten.map((l) => {
    const f = gruppenFaktor(lf, l.gruppe);
    return { x: l.x, F: l.F.map((v) => v * f), My: l.My * f };
  }).filter((p) => p.F.some((v) => v) || p.My);

  // Momentensumme um das Gelenk (x = 0, z = 0): −x·F_z + M_y, dazu q.
  const mLast = punkte.reduce((s, p) => s - p.x * p.F[2] + p.My, 0)
    + q * (xE * xE - x0 * x0) / 2;
  const Sv = mLast / c1;                          // Seil, lotrecht nach oben
  const H = Sv * c1 / b;                          // waagrecht zum Masten
  const sum = (j) => punkte.reduce((s, p) => s + p.F[j], 0);
  const Fz = sum(2) - q * (xE - x0);              // alle äusseren, nach oben
  const RAz = -Fz - Sv;                           // Gelenk, nach oben
  const RAx = H - sum(0);                         // Gelenk, in +x

  /*
   * SCHNITTGROESSEN von rechts: was rechts vom Schnitt liegt, samt
   * Reaktionen. M_y wie oben (positiv = hängend), N Zug positiv.
   */
  const kraefte = [...punkte,
    { x: 0, F: [RAx, 0, RAz], My: 0 },
    { x: c1, F: [-H, 0, Sv], My: 0 }];
  const schnitt = (x) => {
    let M = 0, N = 0, V = 0;
    kraefte.forEach((p) => {
      if (p.x <= x + 1e-12) return;
      M += -(p.x - x) * p.F[2] + p.My;
      N += p.F[0];
      V += -p.F[2];
    });
    const r = xE - Math.max(x, x0);
    M += q * r * r / 2;
    V += q * r;
    return { x, M, N, V };
  };
  const xs = new Set([x0, 0, c1, xE, ...punkte.map((p) => p.x)]);
  const n = 120;
  for (let i = 0; i <= n; i++) xs.add(x0 + (xE - x0) * i / n);
  const stationen = [...xs].filter((x) => x >= x0 - 1e-9 && x <= xE + 1e-9)
    .sort((u, v) => u - v).flatMap((x) => [schnitt(x - 1e-9), schnitt(x)]);
  return {
    Sv, N: Math.hypot(Sv, H), H, RAz, RAx, Fy: sum(1),
    stationen,
    /** Die Kräfte, die am Masten ankommen (F_z positiv nach UNTEN). */
    mast: [
      // Global: am Ausleger links zeigen die x-Kräfte andersherum.
      { name: 'Ausleger, Gelenk', dz: 0, Fz: RAz, Fx: -RAx * (la.sp ?? 1), Fy: sum(1) },
      { name: 'Ausleger, Aufhängung', dz: b, Fz: Sv, Fx: H * (la.sp ?? 1), Fy: 0 },
    ],
    // Probe: das Moment am Anfang des Auslegers muss verschwinden.
    restmoment: schnitt(x0 - 1e-9).M,
  };
}

/**
 * Der Gurtnachweis EINES UPE in einem Fall: halbe Normalkraft, halbes
 * Biegemoment um die starke Achse (die beiden UPE liegen nebeneinander und
 * biegen lotrecht gleich). σ = N/(2A) + M/(2W_y) gegen f_yd.
 */
function gurtEta(fall, p, fyd) {
  let best = null;
  fall.stationen.forEach((s) => {
    const sigma = Math.abs(s.N) / 2 / p.A + Math.abs(s.M) * 100 / 2 / p.Wy;
    if (!best || sigma > best.sigma) best = { ...s, sigma };
  });
  return best ? { ...best, eta: fyd > 0 ? best.sigma / fyd : Infinity } : null;
}

/**
 * DIE AUSWERTUNG über alle Lastfälle.
 *
 * @param {object} satz     Rechensatz des Auslegers
 * @param {object[]} faelle Lastfälle (core.lasten.js, `lastfaelle`)
 * @param {number} fyd      kN/cm²
 * @returns {object|null}   null, wenn der Ausleger kein Modell hat (Länge
 *                          ausserhalb des Sortiments, kein Mast) - mit Grund
 */
export function auslegerAuswertung(satz, faelle, fyd) {
  let la;
  try { la = auslegerLasten(satz); }
  catch (e) { return { fehler: e?.message ?? String(e) }; }
  const p = getGurtprofil(la.t.profil);
  const jeFall = new Map();
  const fall = (lf) => {
    if (!jeFall.has(lf.key)) jeFall.set(lf.key, auslegerFall(la, lf));
    return jeFall.get(lf.key);
  };

  // UPE über die Nachweis-Kombinationen (Bemessungswerte).
  let gurt = null;
  faelle.filter((l) => l.nachweis).forEach((lf) => {
    const g = gurtEta(fall(lf), p, fyd);
    if (g && (!gurt || g.eta > gurt.eta)) gurt = { ...g, fall: lf.key, bez: lf.bez };
  });

  /*
   * DIE AUFHAENGUNG GEGEN V_zul - charakteristisch, nur wirkliche Zustände
   * (Entscheid 28. September), dieselbe Auswahl wie im Stabwerk.
   */
  let aufh = null, druck = null;
  wirklicheZustaende(faelle).forEach((lf) => {
    const f = fall(lf);
    if (!aufh || f.Sv > aufh.Sv) aufh = { Sv: f.Sv, N: f.N, fall: lf.key, bez: lf.bez };
    if (f.Sv < -0.01 && (!druck || f.Sv < druck.Sv)) {
      druck = { Sv: f.Sv, N: -f.N, fall: lf.key, bez: lf.bez };
    }
  });
  const Vzul = Number(la.t.Vzul) || 0;
  /*
   * ZWEI SEILE (Entscheid 28. September): der Kern rechnet die lotrechte
   * Ebene, S_v und N sind die Summe beider. Je Seil die Hälfte, aus der
   * Ebene hinaus um die Spreizung s geneigt: N_je = N/2 · √(c₁² + b² + s²)
   * / √(c₁² + b²). Die Torsion, die die Spreizung hält, sieht er nicht.
   */
  const s = Number(la.spreizung) || 0;
  const seile = s > 0 ? 2 : 1;
  const neig = s > 0 ? Math.hypot(la.c1, la.b, s) / Math.hypot(la.c1, la.b) : 1;
  if (aufh) aufh.Nje = aufh.N / seile * neig;
  const aufhaengung = aufh ? { ...aufh, seile, spreizung: s, Vzul, druck,
    eta: Vzul > 0 ? Math.max(0, aufh.Sv) / Vzul : null,
    ueber: (Vzul > 0 && aufh.Sv > Vzul) || Boolean(druck) } : null;

  return {
    profil: p.name, Vzul, c1: la.c1, b: la.b, x0: la.x0, xE: la.xE, q: la.q,
    gurt, aufhaengung,
    fall,                        // je Lastfall die lotrechte Ebene
    max: { eta: Math.max(gurt?.eta ?? 0, aufhaengung?.eta ?? 0) },
    hinweise: la.hinweise,
  };
}

/**
 * >>> DAS LASTBILD DES MASTEN FUER EINEN FALL. <<<
 *
 * Wie `abfangModell` (core.anker.js): der Wind auf den Masten und auf seine
 * Anbauteile mit den Beiwerten DESSELBEN Falls, dazu die beiden Kräfte des
 * Auslegers (`auslegerAuflager`, core.mast.js).
 */
export function auslegerMastModell(modell, ausw, lf) {
  const bw = lf.beiwerte ?? {};
  const fX = Number(bw.WindX) || 0, fY = Number(bw.WindY) || 0;
  const fG = gruppenFaktor(lf, 'G_Anbau');
  const ml = modell.mastLast;
  const wind = (s) => (s ? { ...s, xd: fX * (s.x ?? 0),
    yd: s.y === null || s.y === undefined ? null : fY * s.y } : s);
  const faktor = { G: fG, WindX: fX, WindY: fY, Schnee: Number(bw.Schnee) || 0 };
  const anbauMastFlach = (modell.anbauMastFlach ?? []).map((t) => {
    const proGruppe = {};
    Object.entries(t.kraefte ?? {}).forEach(([g, k]) => {
      const f = faktor[g] ?? 0;
      proGruppe[g] = { Fx: f * (k.Fx ?? 0), Fy: f * (k.Fy ?? 0), Fz: f * (k.Fz ?? 0),
                       Mxx: f * (k.Mxx ?? 0), Myy: f * (k.Myy ?? 0), Mzz: f * (k.Mzz ?? 0) };
    });
    return { ...t, proGruppe };
  });
  return {
    ...modell,
    beiwerte: { ...(modell.beiwerte ?? {}), G: Number(bw.G) || 0 },
    nurLast: lf.nur ?? null,
    mastLast: ml ? { ...ml, A: wind(ml.A), B: wind(ml.B) } : ml,
    anbauMastFlach,
    auslegerAuflager: { A: ausw.fall(lf).mast },
    lastfallKey: lf.key,
  };
}

/**
 * >>> DER MAST DES AUSLEGERS UEBER ALLE LASTFAELLE. <<<
 *
 * Gibt eine Liste in der Form von `vergleichKombinationen` zurueck
 * (`lastfaelle`, `ergebnisse[key].mast`, `.modell`) - Anker, Verformung und
 * Fundament lesen genau das und rechnen damit ohne Umbau auf den Kraeften
 * des Auslegers statt auf denen des Phantomjochs. Dazu die Huelle des
 * Mastnachweises ueber die Nachweis-Kombinationen.
 *
 * @param {object} optM  Optionen des Mastnachweises (plastisch, knicken …)
 */
export function auslegerKombi(modell, ausw, faelle, optM = {}) {
  const ergebnisse = {};
  faelle.forEach((lf) => {
    const mm = auslegerMastModell(modell, ausw, lf);
    ergebnisse[lf.key] = { modell: mm, mast: mastNachweise(mm, optM) };
  });
  const mast = mastNachweiseHuelle(faelle.filter((l) => l.nachweis)
    .map((l) => ({ fall: l.key, erg: ergebnisse[l.key].mast })));
  return { kombi: { lastfaelle: faelle, ergebnisse }, mast };
}
