/**
 * core.verformung.js
 * ---------------------------------------------------------------------------
 * DIE VERFORMUNG DES MASTEN IM GEBRAUCHSZUSTAND.
 *
 * Weisung vom 24. September, im Wortlaut:
 *
 *   «Mastfervormung berechnen lassen infolge wind / ständige und deren
 *    kombination. die massgebende werte sind Mastspitze 1:100
 *    (wind+ständige) / 1:200 (nur Wind) und auf höhe Fahrdraht oder
 *    vereinfacht auf höhe Ausleger / Jochauflager -> hier ist der Grenzwert
 *    40mm. Die Gebrauchstauglichkeit kombination ist in diesem fall der Wind
 *    bei 0.70 (Betriebswind Wiederkehrperioda 5 Jahre).»
 *
 * Auf Rückfrage entschieden:
 *   - die 40 mm gelten QUER ZUM GLEIS (die Seitenlage des Fahrdrahts),
 *     die Begrenzung der Mastspitze in BEIDEN Richtungen;
 *   - die 40 mm gegen den Fall NUR WIND.
 *
 * WARUM EINE EIGENE DATEI. Der Nachweis ist keine Rechnung am Querschnitt,
 * sondern eine Auswertung über Lastfälle - dieselbe Bauart wie
 * `core.anker.js`, und aus demselben Grund neben `core.mast.js` statt darin:
 * die Verformung selbst rechnet der Mastkern (`mastVerschiebungen`), hier
 * steht nur, WELCHE Kombination an WELCHER Stelle gegen WELCHEN Grenzwert
 * läuft.
 *
 * >>> DIE GEBRAUCHSTAUGLICHKEIT FAERBT KEIN URTEIL. <<<
 *
 * Entscheid vom 18. September: die Urteilsfarbe folgt allein der
 * Tragsicherheit. Dieser Nachweis steht deshalb als eigene Gruppe da - er
 * wird genannt, gerechnet und angeschrieben, aber er färbt die Hauptkachel
 * nicht.
 */

import { BETRIEBSWIND } from './core.lasten.js';

/**
 * Die Grenzwerte, an EINER Stelle.
 *
 * `spitzeMitG` und `spitzeWind` sind Nenner einer Schlankheit (L/100,
 * L/200), `auslegerQuer` ein festes Mass in Metern.
 */
export const VERFORMUNG_GRENZEN = {
  spitzeMitG: 100,
  spitzeWind: 200,
  auslegerQuer: 0.040,
};

/**
 * WO GEMESSEN WIRD - die zweite Stelle neben der Mastspitze.
 *
 * «auf höhe Fahrdraht oder vereinfacht auf höhe Ausleger / Jochauflager».
 * Die Reihenfolge ist die der Weisung:
 *
 *   1. der FAHRDRAHT - ein Drahtwerk am Masten, das höchste davon
 *   2. der AUSLEGER  - sonst das höchste liegende Teil (Rolle «aufbau»)
 *   3. das JOCHAUFLAGER - sonst die Anschlusshöhe H
 *
 * Am Tragjoch greift in der Regel Punkt 3: die Leiter hängen am Joch, nicht
 * am Masten. Am Einzelmasten mit Ausleger greifen 1 oder 2.
 *
 * @returns {{z:number, was:string}|null}
 */
export function messStelle(m, g, ende = 'A') {
  const zKopf = g?.zKopf ?? 0;
  const imBild = (z) => Number.isFinite(z) && z > 0 && z <= zKopf + 1e-9;
  /* =======================================================================
   * >>> EINE EINGETRAGENE HOEHE GEHT VOR (Weisung vom 24. September). <<<
   * =====================================================================
   *
   * «es sollte einen schieber geben welche höhe für die
   * farhdrahtverschiebung massgebend ist.»
   *
   * Die Automatik darunter trifft den Regelfall, aber sie misst am
   * ANSCHLUSSPUNKT eines Teils - der Fahrdraht hängt darunter, und wie
   * weit, weiss die Zeichnung. Steht eine Zahl da, gilt sie.
   *
   * Ueber dem Mastkopf gilt sie NICHT: dort steht keine Verschiebung,
   * die der Mastkern gerechnet hätte. Dann fällt sie auf die Automatik
   * zurück, statt einen Wert an einer Stelle zu prüfen, die es nicht
   * gibt.
   * ===================================================================== */
  const gesetzt = Number(m?.fdHoehe) || 0;
  if (imBild(gesetzt)) return { z: gesetzt, was: 'Fahrdraht', eigen: true };
  const teile = (m?.anbauMastFlach ?? []).filter((t) => {
    if (t.aktiv === false) return false;
    const e = t.ort === 'mastB' ? 'B' : 'A';
    return e === ende;
  });
  const hoehe = (t) => (Number(t.hMast) || 0) + (Number(t.z) || 0);
  const hoechste = (rolle) => teile
    .filter((t) => t.rolle === rolle)
    .map(hoehe)
    .filter(imBild)
    .sort((a, b) => b - a)[0] ?? null;

  const fd = hoechste('drahtwerk');
  if (fd !== null) return { z: fd, was: 'Fahrdraht' };
  const arm = hoechste('aufbau');
  if (arm !== null) return { z: arm, was: 'Ausleger' };
  const H = g?.H ?? 0;
  if (imBild(H) && H < zKopf - 1e-9) return { z: H, was: 'Jochauflager' };
  /*
   * Kein Anhaltspunkt: dann fällt diese Stelle mit der Spitze zusammen, und
   * ein zweiter Wert daneben wäre nur eine Wiederholung. Die Auswertung
   * lässt sie dann weg, statt 40 mm gegen die Kopfverschiebung zu prüfen -
   * das wäre ein Nachweis, den niemand verlangt hat.
   */
  return null;
}

/** Die Verschiebung an der Stelle z, aus der Liste des Mastkerns. */
function beiZ(verformung, z) {
  if (!Array.isArray(verformung) || !verformung.length) return null;
  let beste = null;
  verformung.forEach((v) => {
    const d = Math.abs((v.z ?? 0) - z);
    if (!beste || d < beste.d) beste = { d, v };
  });
  // Weiter als ein halber Rechenschritt weg: dort steht kein Wert.
  return beste && beste.d < 0.26 ? beste.v : null;
}

/**
 * DER NACHWEIS DER MASTVERFORMUNG.
 *
 * >>> WELCHE KOMBINATION WOHER KOMMT. <<<
 *
 *   ständig + Wind   die eigenen Lastfälle `gtbetriebW…` (G mit 1.00,
 *                    Wind mit ψ = 0.70). Sie müssen eigene sein: G + 0.7·W
 *                    ist ein anderer Zustand als G + 1.0·W, und ein
 *                    Seilanker kann darin anders stehen.
 *
 *   nur Wind         die CHARAKTERISTISCHEN Windfälle (Wind allein,
 *                    Beiwert 1), mal 0.70. Das ist exakt und braucht keinen
 *                    eigenen Lastfall: die Haltekraft eines Ankers skaliert
 *                    mit, ihr Vorzeichen bleibt, also fällt kein Seil
 *                    anders aus.
 *
 * @param {object} kombi Ergebnis aus `vergleichKombinationen`
 * @returns {object|null} je Ende die massgebenden Werte, oder null
 */
export function verformungsNachweis(kombi) {
  const lf = kombi?.lastfaelle ?? [];
  const mitG = lf.filter((l) => l.stufe === 'betrieb');
  const nurW = lf.filter((l) => l.art === 'charakteristisch'
                             && (l.leit === 'WindX' || l.leit === 'WindY'));
  if (!mitG.length && !nurW.length) return null;

  const proEnde = {};
  ['A', 'B'].forEach((ende) => {
    const erstes = kombi.ergebnisse?.[(mitG[0] ?? nurW[0])?.key]?.mast?.[ende];
    if (!erstes) return;
    const m = kombi.ergebnisse?.[(mitG[0] ?? nurW[0])?.key]?.modell;
    const stelle = messStelle(m, erstes, ende);
    const L = erstes.zKopf ?? 0;
    if (!(L > 0)) return;

    /*
     * DER GRÖSSTE BETRAG ÜBER ALLE RICHTUNGEN UND VORZEICHEN. Gesucht ist
     * die Verformung, nicht ihre Richtung: ein Mast, der nach −y kippt,
     * steht so schief wie einer nach +y.
     */
    const grosste = (faelle, faktor, z, achsen) => {
      let best = null;
      faelle.forEach((l) => {
        const v = beiZ(kombi.ergebnisse?.[l.key]?.mast?.[ende]?.verformung, z);
        if (!v) return;
        achsen.forEach((achse) => {
          const wert = Math.abs((v[achse] ?? 0) * faktor);
          if (!best || wert > best.wert) {
            best = { wert, achse, lastfall: l.key, bez: l.bez };
          }
        });
      });
      return best;
    };

    const spitzeG = grosste(mitG, 1, L, ['x', 'y']);
    const spitzeW = grosste(nurW, BETRIEBSWIND, L, ['x', 'y']);
    const querS = stelle ? grosste(nurW, BETRIEBSWIND, stelle.z, ['x']) : null;

    const pruef = (mess, grenz, was) => {
      if (!mess || !(grenz > 0)) return null;
      return { ...mess, grenz, eta: mess.wert / grenz, ok: mess.wert <= grenz + 1e-12, was };
    };
    const nw = [
      pruef(spitzeG, L / VERFORMUNG_GRENZEN.spitzeMitG,
            `Mastspitze, ständig + Betriebswind (L/${VERFORMUNG_GRENZEN.spitzeMitG})`),
      pruef(spitzeW, L / VERFORMUNG_GRENZEN.spitzeWind,
            `Mastspitze, nur Wind (L/${VERFORMUNG_GRENZEN.spitzeWind})`),
      stelle ? pruef(querS, VERFORMUNG_GRENZEN.auslegerQuer,
                     `${stelle.was} auf ${stelle.z.toFixed(2)} m quer `
                     + `zum Gleis, nur Wind`) : null,
    ].filter(Boolean);
    if (!nw.length) return;
    const schlimmste = nw.reduce((a, b) => (b.eta > a.eta ? b : a));
    proEnde[ende] = { L, stelle, nachweise: nw, massgebend: schlimmste,
                      eta: schlimmste.eta, ok: nw.every((q) => q.ok) };
  });

  const enden = Object.values(proEnde);
  if (!enden.length) return null;
  return {
    ...proEnde,
    eta: Math.max(...enden.map((e) => e.eta)),
    ok: enden.every((e) => e.ok),
    psi: BETRIEBSWIND,
  };
}
