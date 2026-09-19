/**
 * core.nachbarn.js
 * ---------------------------------------------------------------------------
 * >>> DER GETEILTE MAST TRAEGT BEIDE SEITEN (Sofortmassnahme, 19. September).
 * ---------------------------------------------------------------------------
 *
 * Gemessen am 19. September: auf einer Jochreihe rechnete jedes Tragwerk
 * seinen Zwischenmasten nur mit der EIGENEN Jochkraft. Am geteilten HEB 240
 * einer Reihe J90/20 + J90/20 stieg das Laengsmoment am Fuss mit beiden
 * Seiten von 59.3 auf 104.4 kNm, die Biegespannung von 182 auf 319 N/mm² -
 * die Anwendung zeigte «erfuellt». Weisung: «ja sofortmassnahme zuerst».
 *
 * Hier werden fuer jeden Lastfall des GERECHNETEN Tragwerks die Nachbarn an
 * seinen geteilten Masten mitgerechnet und ihre Jochkraft am Masten
 * abgelegt (`nachbarJochlasten`). `mastLasten` (core.mast.js) legt sie zur
 * eigenen. Die Mastkoepfe gelten dabei als starr - die Rahmenwirkung kommt
 * mit dem gekoppelten Modell der Reihe (Weisung: «die zusammenhängenden
 * jochtragwerke sind als gesamtheitliches tragwerk zu betrachten»).
 *
 * GLEICHZEITIG, AUSSER DER HAVARIE. Staendig, Wind und Schnee wirken auf die
 * ganze Reihe zugleich; die Havarie ist oertlich - «wenn es zu einem
 * leiterbruch am masten kommt ist dann nur dieser selbst betroffen». Im
 * Havariefall des gerechneten Tragwerks bringt der Nachbar deshalb nur
 * seine staendigen Lasten mit (Havarie-Beiwerte null, Regliertemperatur
 * des Falls).
 *
 * WELCHER FALL DES NACHBARN. Ein Tragjoch rechnet mit den Beiwerten des
 * Falls. Ein Abfangjoch fuehrt eigene Faelle (Wind leitend, Schnee
 * leitend, Havarie, je Windrichtung); zugeordnet wird ueber die
 * Leiteinwirkung und die Windrichtung. Faelle ohne Gegenstueck (die
 * charakteristischen Einzelfaelle) bekommen keinen Nachbarn und sagen es.
 * ---------------------------------------------------------------------------
 */

import { tragwerkeVon, mastenFuer, tauscheAktives, rechensatz, tragwerksart,
         versteckt, tragwerkSatz, tragwerkPos } from './core.constants.js';
import { berechne } from './core.vierendeel.js';
import { mastLasten } from './core.mast.js';
import { lastfaelle } from './core.lasten.js';
import { abfangAuswertung, abfangFyd } from './core.abfangjoch.js';
import { abfangVarianten, abfangModell } from './core.anker.js';
import { getAbfangjoch, abfangDbDa } from './data.abfangjoche.js';
import { getProfil, getStahl } from './data.profiles.js';
import { getTragjoch } from './data.tragjoche.js';

/** Profile, Stahl und Joch eines Satzes - wie im Hauptdurchgang der App. */
export function kernArgumente(s) {
  return [getProfil(s.profOG), getProfil(s.profUG), getStahl(s.stahl),
          s.typ && s.typ !== 'frei' ? getTragjoch(s.typ) : null];
}

/**
 * Die Auswertung eines Abfangjochs - vorher nur in app.js, jetzt hier, weil
 * auch ein NACHBAR-Abfangjoch sie braucht. Dieselben Eingaben wie bisher.
 *
 * @param {object} w Blatt, das Abfangjoch aktiv
 * @param {object} stahl
 */
export function abfangAuswertungFuer(w, stahl) {
  if (tragwerksart(w).key !== 'abfangjoch' || !abfangDbDa()) return null;
  const satzA = tragwerkSatz(w);
  const a2 = getAbfangjoch(w.abfangTyp);
  const qpEk = { EK1: '0.9', EK2: '1.1', EK3: '1.3' }[satzA.ek] ?? '1.1';
  const sKl = String(satzA.schneeKlasse ?? '1.25');
  return abfangAuswertung({
    typ: w.abfangTyp, jt: Number(w.L),
    // kg/m -> kN/m; die Sortimentstabelle führt das Gewicht in kg.
    gk: (a2?.gewicht ?? 0) * 9.81 / 1000,
    wk: a2?.wind?.[qpEk] ?? 0,
    sk: satzA.schneeAktiv === false ? 0 : (a2?.schnee?.[sKl] ?? 0),
    anbauteile: satzA.anbauteile ?? [],
    gammaG: w.gammaG, gammaQ: w.gammaQ, psi0: w.psi0,
    /*
     * f_yd AUS STAHL UND γ_M0 (Weisung, 9. September). Hier stand
     * `stahl.fyd` - das Feld gibt es am Stahlobjekt nicht, und die
     * Auswertung fiel still auf 21.8 kN/cm² zurueck.
     */
    fyd: abfangFyd(stahl, w.gammaM0),
    ek: satzA.ek, L_FL: satzA.L_FL, R: satzA.R,
    knotenbereich: 'anschnitt',
  });
}

/** Leiteinwirkung eines Tragjoch-Lastfalls: 'wind' | 'schnee' | 'havarie' | null. */
function leitVon(lf) {
  const b = lf.beiwerte ?? {};
  if (b.HavarieX || b.HavarieY) return 'havarie';
  if (!lf.nachweis) return null;          // charakteristische Einzelfaelle
  if (lf.leit === 'Schnee') return 'schnee';
  return 'wind';
}

/** Tragjoch-Lastfall -> passende Variante eines Abfangjochs. */
function abfangVarianteFuer(varianten, lf) {
  const leit = leitVon(lf);
  if (!leit) return null;
  const b = lf.beiwerte ?? {};
  const sy = Math.sign(b.WindY ?? 0), sx = Math.sign(b.WindX ?? 0);
  return varianten.find(({ fa }) => fa.fall === leit
    && (leit === 'havarie' || (fa.windY === sy && fa.windX === sx))) ?? null;
}

/** Abfangjoch-Fall -> Tragjoch-Lastfall (Schluessel fuer die Temperatur) und Beiwerte. */
function tragjochFallFuer(alle, fa) {
  const bw = fa.beiwerte ?? { g: 1, w: 0, s: 0 };
  const beiwerte = { G: bw.g, WindX: bw.w * (fa.windX ?? 0), WindY: bw.w * (fa.windY ?? 0),
                     Schnee: bw.s, HavarieX: 0, HavarieY: 0 };
  const passend = alle.find((lf) => leitVon(lf) === fa.fall
    && (fa.fall === 'havarie'
      || (Math.sign(lf.beiwerte?.WindY ?? 0) === (fa.windY ?? 0)
          && Math.sign(lf.beiwerte?.WindX ?? 0) === (fa.windX ?? 0))));
  return { key: passend?.key ?? null, beiwerte };
}

/**
 * Die Jochkraefte der Nachbarn an den geteilten Masten des gerechneten
 * Tragwerks, je Fall und Ende.
 *
 * @param {object} w Blatt (werte)
 * @returns {{faelle: Object<string, {A: object[], B: object[]}>,
 *            nachbarn: string[], ohne: string[]}|null}
 *          null, wenn kein Mast geteilt ist
 */
export function nachbarJochlasten(w) {
  const alle = tragwerkeVon(w);
  const aktiv = alle[0];
  if (!aktiv || alle.length < 2) return null;
  const [mA, mB] = mastenFuer(w, aktiv);
  const paare = [];
  [['A', mA], ['B', mB]].forEach(([ende, m]) => {
    if (!m || (m.traegt ?? []).length < 2) return;
    (m.traegt ?? []).filter((id) => id !== aktiv.id).forEach((id) => {
      const t = alle.find((x) => x.id === id);
      if (!t || versteckt(t)) return;
      const [nA, nB] = mastenFuer(w, t);
      const endeN = nA?.id === m.id ? 'A' : nB?.id === m.id ? 'B' : null;
      if (endeN) paare.push({ ende, t, endeN });
    });
  });
  if (!paare.length) return null;

  const satzAktiv = rechensatz(w);
  const stahlAktiv = getStahl(satzAktiv.stahl);
  const lfAktiv = lastfaelle(satzAktiv);
  // Die Faelle des gerechneten Tragwerks: beim Abfangjoch seine eigenen.
  const abfAktiv = tragwerksart(w).key === 'abfangjoch'
    ? (() => { try { return abfangAuswertungFuer(w, stahlAktiv); } catch { return null; } })()
    : null;
  const faelleAktiv = abfAktiv?.auflager
    ? abfangVarianten(abfAktiv.auflager).map(({ fa }) => ({ key: fa.key, abfang: fa }))
    : lfAktiv.map((lf) => ({ key: lf.key, tragjoch: lf }));

  const faelle = {};
  const ohne = new Set();
  paare.forEach(({ ende, t, endeN }) => {
    const wN = tauscheAktives(w, t.id);
    const satzN = rechensatz(wN);
    const argN = kernArgumente(satzN);
    const name = tragwerkPos(w, t);
    const istAbfang = tragwerksart(t).key === 'abfangjoch';
    let abfN = null, basisN = null;
    if (istAbfang) {
      try { abfN = abfangAuswertungFuer(wN, argN[2]); } catch { abfN = null; }
      if (!abfN?.auflager) { ohne.add(`${name}: Abfangjoch nicht rechenbar`); return; }
      basisN = berechne(satzN, ...argN);
    }
    const lfN = istAbfang ? null : lastfaelle(satzN);
    const varN = istAbfang ? abfangVarianten(abfN.auflager) : null;

    faelleAktiv.forEach((f) => {
      let mN = null;
      if (istAbfang) {
        const v = f.abfang
          ? varN.find(({ fa }) => fa.key === f.abfang.key)
          : abfangVarianteFuer(varN, f.tragjoch);
        if (!v) return;
        mN = abfangModell(basisN.modell, abfN.auflager, v.fa, v.fb, false);
      } else {
        const ziel = f.abfang
          ? tragjochFallFuer(lfN, f.abfang)
          : { key: f.key,
              beiwerte: { ...f.tragjoch.beiwerte, HavarieX: 0, HavarieY: 0 } };
        const havarie = f.abfang ? f.abfang.fall === 'havarie'
          : leitVon(f.tragjoch) === 'havarie';
        /*
         * Derselbe Lastfall, wo es ihn gibt - mit ihm seine Regliertemperatur.
         * Feste Beiwerte nur in der Havarie (der Nachbar bleibt staendig)
         * oder wenn der Fall des Abfangjochs kein Gegenstueck hat.
         */
        const fest = havarie || !ziel.key;
        mN = berechne({ ...satzN, lastfall: ziel.key,
                        ...(fest ? { beiwerteFest: ziel.beiwerte } : {}),
                        nurLast: f.tragjoch?.nur ?? null }, ...argN).modell;
      }
      const g = mastLasten(mN, endeN);
      const joch = g?.lasten?.find((l) => l.art === 'joch');
      if (!joch) return;
      const eintrag = { ...joch, art: 'nachbarjoch', name: `Joch ${name}, Anschluss Ende ${endeN}`,
                        nachbar: name };
      (faelle[f.key] ??= { A: [], B: [] })[ende].push(eintrag);
    });
  });
  return { faelle, nachbarn: [...new Set(paare.map((p) => tragwerkPos(w, p.t)))],
           ohne: [...ohne] };
}

/** Der Rechensatz mit den Nachbarkraeften - was Hauptdurchgang und Vergleiche rechnen. */
export function rechensatzMitNachbarn(w) {
  const s = rechensatz(w);
  let n = null;
  try { n = nachbarJochlasten(w); } catch (e) { n = { faelle: {}, nachbarn: [], fehler: e?.message }; }
  return n ? { ...s, nachbarJochlasten: n } : s;
}
