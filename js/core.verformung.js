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

/* ===========================================================================
 * >>> DIE MASTSPITZE IST KEIN NACHWEIS MEHR (26. September). <<<
 * =========================================================================
 *
 * Weisung: «lassen wir den nachweis für die mastspitze weg bei der
 * verformung und nutzen nur die referenzhöhe (fahrdraht)».
 *
 * Vorausgegangen war die Frage, wie 150 mm zustande kommen. Gerechnet am
 * geteilten Masten einer Reihe 2 × J90/20 m (HEB 240, Kopf 8.50 m), Wind
 * in Gleisrichtung mal ψ 0.70:
 *
 *     Mastwind q = 0.300 kN/m                    16.6 mm   11 %
 *     Jochreaktion T2 auf 7.50 m, F_y 4.575 kN   66.9 mm   44.5 %
 *     Jochreaktion T1 auf 7.50 m, F_y 4.575 kN   66.9 mm   44.5 %
 *                                               ------------------
 *                                               150.5 mm
 *
 * Die Zahl ist richtig gerechnet - der Mast steht in Gleisrichtung als
 * freier Kragarm auf seiner SCHWACHEN Achse (I_q 3923 gegen I 11260 cm⁴)
 * und trägt am geteilten Punkt die Jochkräfte BEIDER Joche. Was sie nicht
 * ist: ein brauchbarer Nachweis. Massgebend für den Betrieb ist die
 * Seitenlage des Fahrdrahts, und die steht auf der Referenzhöhe.
 *
 * >>> WAS BLEIBT UND WAS GEHT. <<<
 *
 * Der NACHWEIS ist nur noch der an der Referenzhöhe (40 mm quer zum
 * Gleis). Die Spitzenverschiebung bleibt als AUSKUNFT stehen - ohne
 * Grenzwert, ohne η, ohne Anteil am Urteil. Sie ganz wegzuwerfen hiesse,
 * die Frage von heute beim nächsten Mal wieder von vorn zu stellen: wer
 * 150 mm nicht sieht, fragt auch nicht, woher sie kommen.
 * ========================================================================= */

/**
 * Die Grenzwerte, an EINER Stelle.
 *
 * `auslegerQuer` ist ein festes Mass in Metern. Die beiden Schlankheiten
 * der Mastspitze (L/100 mit ständig, L/200 nur Wind) stehen noch da, weil
 * die Auskunft sie fuer den Vergleich nennt - sie tragen aber kein η mehr.
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
  /*
   * >>> UND WENN SIE VERWORFEN WIRD, STEHT ES DA (26. September). <<<
   *
   * Der Entscheid vom 24. September - ueber dem Mastkopf gilt die Eingabe
   * nicht - blieb bis hierher STUMM: wer 14 m eintraegt, bekommt einen
   * Nachweis auf 7.50 m, ohne ein Wort. Gefunden beim Browserlauf vom
   * 26. September, an einem Stand, in dem genau das stand.
   *
   * Seit die Mastspitze kein Nachweis mehr ist, haengt der GANZE Nachweis
   * an dieser einen Stelle. Eine verworfene Eingabe ist dann keine
   * Kleinigkeit mehr, sondern verschiebt das einzige eta, das es gibt.
   */
  const verworfen = gesetzt > 0 ? gesetzt : null;
  const mit = (s) => (s && verworfen ? { ...s, verworfen } : s);
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
  if (fd !== null) return mit({ z: fd, was: 'Fahrdraht' });
  const arm = hoechste('aufbau');
  if (arm !== null) return mit({ z: arm, was: 'Ausleger' });
  const H = g?.H ?? 0;
  if (imBild(H) && H < zKopf - 1e-9) return mit({ z: H, was: 'Jochauflager' });
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

    /*
     * DIE HOEHE GEHOERT ZUM NACHWEIS. Ohne sie steht in der Kachel eine
     * Zahl, von der niemand weiss, WO sie auftritt - genau die Frage vom
     * 26. September.
     */
    const pruef = (mess, grenz, was, z) => {
      if (!mess || !(grenz > 0)) return null;
      return { ...mess, grenz, eta: mess.wert / grenz,
               ok: mess.wert <= grenz + 1e-12, was, z };
    };
    /*
     * >>> EIN NACHWEIS, AN DER REFERENZHOEHE (26. September). <<<
     * Siehe den Block oben. Die Mastspitze steht daneben als Auskunft.
     */
    const nw = [
      stelle ? pruef(querS, VERFORMUNG_GRENZEN.auslegerQuer,
                     `${stelle.was} auf ${stelle.z.toFixed(2)} m quer `
                     + `zum Gleis, nur Wind`, stelle.z) : null,
    ].filter(Boolean);
    /*
     * DIE AUSKUNFT: dieselbe Rechnung, aber ohne Grenzwert und ohne eta.
     * Sie sagt, wie weit sich der Mast bewegt - eine Zahl, nach der man
     * fragt, sobald sie gross wird.
     */
    const auskunft = [
      spitzeG ? { ...spitzeG, z: L, was: 'Mastspitze, ständig + Betriebswind',
                  vergleich: L / VERFORMUNG_GRENZEN.spitzeMitG } : null,
      spitzeW ? { ...spitzeW, z: L, was: 'Mastspitze, nur Wind',
                  vergleich: L / VERFORMUNG_GRENZEN.spitzeWind } : null,
    ].filter(Boolean);
    /*
     * >>> OHNE MESSSTELLE KEIN NACHWEIS - UND DAS WIRD GESAGT. <<<
     *
     * Seit dem 26. September steht der Nachweis allein auf der
     * Referenzhoehe (Fahrdraht, sonst Ausleger, sonst Jochauflager). Gibt
     * es keine - ein Einzelmast ohne jedes Anbauteil -, dann gibt es auch
     * keinen Nachweis. Still uebergangen saehe das aus wie «erfuellt»;
     * deshalb kommt der Grund mit, und die Anzeige nennt ihn.
     */
    if (!nw.length) {
      proEnde[ende] = { L, stelle: null, nachweise: [], auskunft,
                        ohneStelle: true, eta: null, ok: null };
      return;
    }

    const schlimmste = nw.reduce((a, b) => (b.eta > a.eta ? b : a));
    proEnde[ende] = { L, stelle, nachweise: nw, auskunft, massgebend: schlimmste,
                      eta: schlimmste.eta, ok: nw.every((q) => q.ok) };
  });

  const enden = Object.values(proEnde);
  if (!enden.length) return null;
  // Enden ohne Messstelle tragen kein eta - sie zaehlen im Urteil nicht mit.
  const gefuehrt = enden.filter((e) => Number.isFinite(e.eta));
  return {
    ...proEnde,
    eta: gefuehrt.length ? Math.max(...gefuehrt.map((e) => e.eta)) : null,
    ok: gefuehrt.length ? gefuehrt.every((e) => e.ok) : null,
    ohneStelle: !gefuehrt.length,
    psi: BETRIEBSWIND,
  };
}
