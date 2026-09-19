/**
 * core.lasten.js
 * ---------------------------------------------------------------------------
 * RECHENKERN, TEIL 0: Einwirkungen.
 * Reine Funktionen, kein DOM.
 *
 * A) VERTEILTE LASTEN aus der Sortimentstabelle der Typendatenbank.
 *
 *    Die Tabellenwerte sind bereits fertig gerechnete LAUFMETERLASTEN [kN/m]
 *    auf das Joch und CHARAKTERISTISCH. Sie werden hier unverändert
 *    übernommen - es wird nichts mehr mit einer Fläche multipliziert.
 *
 *      - Approx. Gewicht [kg/m] des Jochs (Winkel + Bindebleche)
 *      - Schneelast    [kN/m], je Referenz-Schneelast 0.90 / 1.25 kN/m2
 *      - Windbelastung [kN/m], je Referenz-STAUDRUCK 0.90 / 1.10 / 1.30 kN/m2
 *                      -> hier als Einwirkungsklassen EK1 / EK2 / EK3 geführt
 *
 *    Die Referenzwerte in kN/m2 dienen nur der ORIENTIERUNG: an ihnen lässt
 *    sich ablesen, für welchen Staudruck bzw. welche Schneelast die
 *    Laufmeterlast der Tabelle gilt. Sie gehen selbst nicht in die Rechnung
 *    ein. Der für den Standort massgebende Staudruck ist nach SIA 261 zu
 *    bestimmen und mit der gewählten Klasse zu vergleichen.
 *
 *    Der Windwert gilt für das Joch selbst. Wind auf Fahrleitung und
 *    Hängestützen wird als horizontale Einzellast P_h erfasst (siehe B).
 *
 * B) EINZELLASTEN werden nicht mehr hier geführt, sondern über ANBAUTEILE
 *    (core.anbauteile.js, data/anbauteile.json). Ein Anbauteil beschreibt
 *    Bauteil und Last gemeinsam und leitet sie über vier Punkte ein.
 *
 *    Frühere Beschreibung der Exzentrizitäten, weiterhin gültig:
 *    Jede Einzellast wird mit möglichst wenigen Angaben beschrieben:
 *
 *      x    Lage entlang der Jochachse, ab linkem Auflager        [m]
 *      Pv   vertikale Last, positiv nach unten                    [kN]
 *      Ph   horizontale Last quer zur Jochachse (Gleisrichtung)   [kN]
 *      ev   Abstand des Angriffspunkts zur Jochachse              [m]
 *           positiv = UNTERHALB (Hängestütze),
 *           negativ = OBERHALB  (Jochaufsatz)
 *      ex   Versatz in Gleisrichtung gegenüber der Jochachse      [m]
 *
 *    Torsion je Last:   T = Ph * ev  +  Pv * ex
 *      - die horizontale Last am Hebelarm ev (Hängestütze/Aufsatz)
 *      - die vertikale Last am Hebelarm ex (Versatz in Gleisrichtung)
 *    Wer nur eine der beiden Wirkungen braucht, lässt das andere Mass auf 0.
 * ---------------------------------------------------------------------------
 */

import { U } from './core.constants.js';

/**
 * Windstufen der Zeichnung, als Einwirkungsklassen bezeichnet.
 * qp = Referenz-Staudruck [kN/m2], nur zur Orientierung - die Rechnung
 * verwendet die Laufmeterlast aus der Sortimentstabelle.
 */
export const WIND_KLASSEN = [
  { key: '0.9', ek: 'EK1', qp: 0.90, label: 'EK1. Referenz-Staudruck 0.90 kN/m²' },
  { key: '1.1', ek: 'EK2', qp: 1.10, label: 'EK2. Referenz-Staudruck 1.10 kN/m²' },
  { key: '1.3', ek: 'EK3', qp: 1.30, label: 'EK3. Referenz-Staudruck 1.30 kN/m²' },
];

/** Schneestufen der Zeichnung. sk = Referenz-Schneelast [kN/m2]. */
export const SCHNEE_KLASSEN = [
  { key: '0.9',  sk: 0.90, label: 'Referenz-Schneelast 0.90 kN/m²' },
  { key: '1.25', sk: 1.25, label: 'Referenz-Schneelast 1.25 kN/m²' },
];

/** Einwirkungsklasse zu einer Windstufe – die Lasttabelle spricht in EK. */
export const ekVonWindklasse = (key) =>
  WIND_KLASSEN.find((k) => k.key === key)?.ek ?? 'EK2';

export const LASTHERKUNFT = [
  { key: 'tabelle', label: 'aus Sortimentstabelle der Typendatenbank' },
  { key: 'manuell', label: 'manuell eingeben' },
];

/**
 * Ermittelt die charakteristischen verteilten Einwirkungen.
 * @param {object} inp Eingabewerte
 * @param {object|null} joch Eintrag aus data.tragjoche.js (nur für 'tabelle')
 * @returns {{gk:number, sk:number, wk:number, herkunft:object}} in [kN/m]
 */
export function charakteristischeLasten(inp, joch) {
  if (inp.lastHerkunft === 'manuell' || !joch) {
    return {
      gk: inp.gkManuell, sk: inp.skManuell, wk: inp.wkManuell,
      herkunft: { art: 'manuell', eigengewicht: 'manuell',
                  wind: 'manuell', schnee: 'manuell' },
    };
  }
  const gJoch = (joch.gewicht * U.g) / 1000;
  const wk = joch.wind[inp.windKlasse];
  const sk = joch.schnee[inp.schneeKlasse];
  if (wk === undefined) throw new Error(`Windklasse ${inp.windKlasse} nicht in Tabelle`);
  if (sk === undefined) throw new Error(`Schneeklasse ${inp.schneeKlasse} nicht in Tabelle`);

  return {
    gk: gJoch + inp.gZusatz, sk, wk,
    herkunft: {
      art: 'tabelle', typ: joch.typ, gJoch, gZusatz: inp.gZusatz,
      gewichtTabelle: joch.gewicht,
      eigengewicht: `${joch.gewicht} kg/m (Tabelle) → ${gJoch.toFixed(3)} kN/m` +
                    (inp.gZusatz ? ` + ${inp.gZusatz.toFixed(3)} kN/m Zuschlag` : ''),
      wind: `${WIND_KLASSEN.find((k) => k.key === inp.windKlasse)?.ek} ` +
            `(Referenz-Staudruck ${inp.windKlasse} kN/m²) → ${wk} kN/m Laufmeterlast`,
      schnee: inp.schneeAktiv
        ? `Referenz-Schneelast ${inp.schneeKlasse} kN/m² → ${sk} kN/m Laufmeterlast`
        : 'nicht angesetzt',
    },
  };
}

/**
 * Normensätze für die Lastbeiwerte.
 *
 * SIA 260 unterscheidet ständige und veränderliche Einwirkungen. Das
 * RTE-Regelwerk der Bahnen rechnet mit einem einheitlichen Beiwert 1.30 für
 * ständige wie veränderliche Lasten - deutlich einfacher, aber eben ein
 * anderer Satz.
 *
 * ψ₀ ist der Beiwert der BEGLEITENDEN veränderlichen Einwirkung. Er steht in
 * beiden Sätzen auf 0.50 und gilt für Wind wie für Schnee. (SIA 260 Tab. 1
 * führt für Wind 0.60; der hier angesetzte Wert ist eine Festlegung des
 * Anwenders und über die Optionen jederzeit änderbar.)
 *
 * Wer die Beiwerte von Hand ändert, verlässt beide Sätze; das Werkzeug weist
 * das dann als "abweichend" aus.
 */
export const NORMENSAETZE = [
  {
    key: 'rte', label: 'RTE (Bahn)',
    beiwerte: { gammaG: 1.30, gammaQ: 1.30, psi0: 0.50 },
    hinweis: 'Einheitlicher Beiwert 1.30 für ständige und veränderliche ' +
             'Einwirkungen, Begleiteinwirkung ψ₀ = 0.50. So gerechnet im ' +
             'geprüften Referenzprojekt (46 Kombinationen ausgezählt: auf ' +
             'ständige Lastfälle nur 1.0 und 1.30, auf veränderliche 1.30 ' +
             'und 0.65 = 1.30·0.50).',
  },
  {
    key: 'sia260', label: 'SIA 260',
    beiwerte: { gammaG: 1.35, gammaQ: 1.50, psi0: 0.50 },
    hinweis: 'SIA 260 Gl. (16): γ_G = 1.35, γ_Q = 1.50, Begleiteinwirkung ψ₀ = 0.50.',
  },
];

/** Welcher Normensatz entspricht den aktuellen Beiwerten? */
export function erkenneNormensatz(inp) {
  const passt = (n) => Object.entries(n.beiwerte)
    .every(([k, v]) => Math.abs((inp[k] ?? 0) - v) < 1e-9);
  return NORMENSAETZE.find(passt) ?? null;
}

// ===========================================================================
//  LASTFÄLLE
// ===========================================================================
/**
 * Es gibt VIER Einwirkungsgruppen. Jeder Lastfall ist ein Satz von vier
 * Beiwerten dazu - mehr braucht es nicht:
 *
 *   G       ständig       Eigengewicht Joch und Anbauteile, Umlenkkraft
 *   WindX   veränderlich  Windkraft IN JOCHACHSE      (Q_x der Anbauteile)
 *   WindY   veränderlich  Windkraft IN GLEISRICHTUNG  (Laufmeterlast w_k auf
 *                         das Joch, Q_y der Anbauteile)
 *   Schnee  veränderlich  Laufmeterlast auf das Joch, Q_z der Anbauteile
 *
 * WARUM DER WIND IN ZWEI GRUPPEN LÄUFT
 * Wind ist keine Einwirkung mit fester Richtung. Die Lasttabelle führt für
 * jedes Bauteil eine Angriffsfläche quer und eine längs zum Gleis - das sind
 * zwei WINDRICHTUNGEN, die nicht gemeinsam auftreten. Solange beide in einer
 * Gruppe stecken, lassen sie sich weder einzeln noch mit verschiedenem
 * Vorzeichen ansetzen.
 *
 * Getrennt geführt kann jede Richtung mit + und − in die Kombination gehen;
 * damit steht der Wind, wie er in Wirklichkeit steht: von beiden Seiten. Der
 * frühere Schalter "günstig / ungünstig" der Mastberechnung wird dadurch
 * überflüssig (siehe core.trasse.js).
 *
 * Die STÄNDIGEN Einwirkungen behalten ihre feste Wirkrichtung; sie werden
 * nicht gespiegelt. Wo die Umlenkkraft hinzeigt, entscheidet die Geometrie
 * über das Vorzeichen von R bzw. α.
 *
 * Die frühere eigene Gruppe "Nutzlast" gibt es nicht mehr; die veränderlichen
 * VERTIKALLASTEN der Anbauteile (Q_z) laufen in der Gruppe Schnee mit. Deshalb
 * ist die Gruppe auch dann aktiv, wenn kein Schnee auf dem Joch angesetzt wird,
 * aber Anbauteile ein Q_z tragen.
 */
export const EINWIRKUNGEN = [
  { key: 'G',      label: 'Ständig',  kurz: 'G',      art: 'staendig' },
  { key: 'WindX',  label: 'Wind x',   kurz: 'W_x',    art: 'veraenderlich',
    richtung: 'x', bemerkung: 'Windkraft in Jochachse (Q_x der Anbauteile)' },
  { key: 'WindY',  label: 'Wind y',   kurz: 'W_y',    art: 'veraenderlich',
    richtung: 'y', bemerkung: 'Windkraft in Gleisrichtung: Laufmeterlast w_k ' +
                              'auf das Joch und Q_y der Anbauteile' },
  { key: 'Schnee', label: 'Schnee',   kurz: 'S',      art: 'veraenderlich',
    richtung: 'z' },
  /*
   * >>> DER HAVARIEFALL ALS ZWEI EIGENE GRUPPEN (17. September). <<<
   *
   * Sie tragen nur, was der Havariefall GEGENUEBER DEM STAENDIGEN aendert
   * (siehe `havarieAnteile` in data.anbauteile.js):
   *
   *   HavarieX   die Ablenkkraft bei -20 °C statt +5 °C, beim gebrochenen
   *              Leiter zur Haelfte
   *   HavarieY   der Laengszug des gebrochenen Leiters, 10 % von Z(-20 °C)
   *
   * Getrennt, weil der Laengszug in beide Richtungen gerechnet wird, die
   * Ablenkung aber ihre feste Richtung hat. `intern`: sie sind keine Wahl
   * fuer einen frei eingegebenen Lastblock.
   */
  { key: 'HavarieX', label: 'Havarie Ablenkung', kurz: 'A_x', art: 'aussergewoehnlich',
    richtung: 'x', intern: true,
    bemerkung: 'Änderung der Ablenkkraft bei −20 °C, gebrochener Leiter zur Hälfte' },
  { key: 'HavarieY', label: 'Havarie Längszug', kurz: 'A_y', art: 'aussergewoehnlich',
    richtung: 'y', intern: true,
    bemerkung: 'Längszug des gebrochenen Leiters, 10 % der Leiterzugkraft bei −20 °C' },
];

/* ===========================================================================
 * >>> DIE BEIWERTE DES BRUCHS (Weisung vom 17. September). <<<
 * ===========================================================================
 *
 * «der Ablenkwinkel kann zur hälfte angewendet werden, da der
 *  weiterführende leiter abgelenkt ist. die volle leiterzugkraft wird beim
 *  abfangjoch angesezt. bei den übrigen tragwerken tragjoch mast, wird bei
 *  den leitern direkt an joch oder am masten nur ein anteil von 10% der
 *  leiterzugkraft angesetzt, da man ausgehen kann das die kraft durch die
 *  benachbarten tragwerke kompensiert wird.»
 *
 * Das Abfangjoch rechnet seinen Havariefall selbst (core.abfangjoch.js).
 * ========================================================================= */
export const HAVARIE_ABLENKUNG_BRUCH = 0.5;
export const HAVARIE_LAENGSZUG = 0.10;

/**
 * Fuehrt das Tragwerk einen Leiter, dessen Havariefall zu rechnen ist?
 * Gezaehlt wird am BAUTEIL, nicht an der Kraft - sonst verschwaenden die
 * Lastfaelle in der Geraden, und die Liste der Anwendung und die des
 * Rechenkerns liefen auseinander.
 */
export function havarieVorhanden(inp) {
  /*
   * >>> ABSCHALTBAR (19. September). <<<
   * Weisung vom 19. September: «den havarielastfall deaktivierbar machen
   * (nachweis / export)». Ein Schalter am
   * Tragwerk (`havarieAus`) nimmt die aussergewoehnlichen Faelle aus der
   * Liste - damit fallen sie aus dem Nachweis, der Huelle, dem Bericht und
   * den Kombinationen der Ausleitung zugleich. Vorgabe: gerechnet.
   */
  if (inp.havarieAus === true) return false;
  if (inp.anbauteileFlach) {
    return inp.anbauteileFlach.some((t) => t.rolle === 'drahtwerk');
  }
  return (inp.anbauteile ?? []).filter((a) => a.aktiv !== false)
    .some((a) => (a.module ?? []).some((m) => m.aktiv !== false
      && /^drahtwerk-/.test(String(m.bauteil ?? ''))));
}

/** Beiwertsatz mit allen Gruppen auf 0 - Grundlage jedes Lastfalls. */
export const NULLBEIWERTE = () =>
  Object.fromEntries(EINWIRKUNGEN.map((e) => [e.key, 0]));

/** Ist die Gruppe Schnee/Q_z überhaupt vorhanden? */
export function vertikalVeraenderlich(inp) {
  if (inp.schneeAktiv) return true;
  return (inp.anbauteileFlach ?? inp.anbauteile ?? [])
    .filter((a) => a.aktiv !== false)
    .some((a) => Math.abs(a.kraefte?.Schnee?.Fz ?? a.Qz ?? 0) > 0);
}

/**
 * Die vorgegebenen Lastfälle.
 *
 * ZUOBERST DIE EINZELNEN LASTARTEN, CHARAKTERISTISCH
 * Ständig, Anbauteile, Schnee, Wind y, Wind x - jede für sich, alle Beiwerte
 * 1.00. Sie sind kein Nachweis, sondern der Massstab: nur an einer einzelnen
 * Lastart lässt sich ablesen, ob das Werkzeug den Lastweg richtig führt, und
 * nur so ist es gegen ein FEM-Modell vergleichbar, das seine Lastfälle
 * ebenfalls einzeln ausweist. Der Vergleich mit dem geprüften Signaljoch ist
 * genau so geführt worden.
 *
 * «Anbauteile» ist dabei kein eigener Beiwertsatz, sondern derselbe wie
 * «Ständig», nur auf die Anbauteile beschränkt (`nur: 'anbauteile'`);
 * «Ständig» selbst zeigt das Joch ohne sie. Zusammen ergeben die beiden die
 * volle ständige Last.
 *
 *   LF Ständig             charakteristisch, Eigengewicht des Jochs
 *   LF Anbauteile          charakteristisch, ständige Lasten der Anbauteile
 *   LF Schnee              charakteristisch
 *   LF Wind y / Wind x     charakteristisch
 *   LF Ständig + Wind      charakteristisch, alles zusammen
 *   LF Wind y ±  leitend   γ_G · G ± γ_Q · Wind y + γ_Q · ψ₀ · Schnee
 *   LF Wind x ±  leitend   γ_G · G ± γ_Q · Wind x + γ_Q · ψ₀ · Schnee
 *   LF Schnee ±  leitend   γ_G · G ± γ_Q · ψ₀ · Wind y + γ_Q · Schnee
 *
 * Je Windrichtung stehen BEIDE Vorzeichen. Das ist der Zweck der Trennung:
 * welche Seite massgebend wird, hängt davon ab, wohin die ständigen
 * Horizontallasten (Umlenkkraft) zeigen - und das lässt sich nicht vorab
 * entscheiden. Bei den charakteristischen Einzellastfällen erübrigt sich das:
 * wirkt nur eine Lastart, ist die Gegenrichtung ihr Spiegelbild.
 *
 * Die charakteristischen Lastfälle sind KEIN Tragsicherheitsnachweis
 * (nachweis: false). In Umhüllende und "massgebend" gehen sie nicht ein.
 */
export function standardLastfaelle(inp) {
  const g = inp.gammaG ?? 1.35;
  const q = inp.gammaQ ?? 1.50;
  const p = inp.psi0 ?? 0.50;
  const s = vertikalVeraenderlich(inp);
  const bw = (o) => ({ ...NULLBEIWERTE(), ...o });
  const begleitS = s ? q * p : 0;

  /*
   * >>> DAS GANZE TRAGWERK STAENDIG, DIE ABLENKUNG FUER SICH
   *     (Weisung vom 16. September). <<<
   *
   * «bei den ständigen alle tragwerksteile zusammen nehmen nicht nur joch,
   *  die ablenkkräfte können separat aufgeführt werden. dies auch in den
   *  kombinationen nachführen.»
   *
   * Bis hierher standen «Ständig (Joch)» und «Anbauteile ständig» getrennt
   * - und die AxisVM-Ausleitung kannte die Trennung nicht, beide kamen dort
   * als dieselbe Kombination an. Jetzt: alle Gewichte zusammen, die
   * Ablenkkraft aus dem Kurvenzug als eigener Fall. Sie ist die einzige
   * staendige Last in der Jochachse und die, deren Richtung zaehlt.
   */
  const lf = [
    { key: 'gk', bez: 'Ständig (Tragwerk)', art: 'charakteristisch', nachweis: false,
      nur: 'tragwerk', beiwerte: bw({ G: 1 }) },
    { key: 'ablk', bez: 'Ablenkkräfte ständig', art: 'charakteristisch',
      nachweis: false, nur: 'ablenk', beiwerte: bw({ G: 1 }) },
  ];
  if (s) {
    lf.push({ key: 'sk', bez: 'Schnee', art: 'charakteristisch',
              nachweis: false, beiwerte: bw({ Schnee: 1 }) });
  }
  /*
   * >>> DER WIND AUF BEIDE SEITEN - AUCH CHARAKTERISTISCH (17. September). <<<
   *
   * Weisung: «der wind in y und x sollte immer auf beide seiten angesetzt
   * werden, gemäss den kombinationen für die berechnung in der app, nicht
   * nur im axisvm. es können überlagerungen mit den ständigen (abfangungen)
   * resultieren.» Die Einzelfaelle und «Ständig + Wind» stehen deshalb mit
   * beiden Vorzeichen da; der Ankernachweis, der auf ihnen steht, sieht so
   * auch den Gegenwind. Die bisherigen Schluessel bleiben fuer die
   * +-Richtung.
   */
  lf.push(
    { key: 'wyk', bez: 'Wind +y (Gleisrichtung)', art: 'charakteristisch',
      nachweis: false, leit: 'WindY', vorzeichen: +1, beiwerte: bw({ WindY: 1 }) },
    { key: 'wykm', bez: 'Wind −y (Gleisrichtung)', art: 'charakteristisch',
      nachweis: false, leit: 'WindY', vorzeichen: -1, beiwerte: bw({ WindY: -1 }) },
    { key: 'wxk', bez: 'Wind +x (Jochachse)', art: 'charakteristisch',
      nachweis: false, leit: 'WindX', vorzeichen: +1, beiwerte: bw({ WindX: 1 }) },
    { key: 'wxkm', bez: 'Wind −x (Jochachse)', art: 'charakteristisch',
      nachweis: false, leit: 'WindX', vorzeichen: -1, beiwerte: bw({ WindX: -1 }) },
    /*
     * >>> STAENDIG + WIND JE RICHTUNG, NICHT DIAGONAL (18. September). <<<
     *
     * Weisung: «die lastfälle l7 bis l10 weglassen, da wind sich nicht in x
     * und y überlagern kann.» Dort standen «Ständig + Wind ±x ±y» - beide
     * Richtungen zugleich mit 1.00. Ersatzlos gestrichen haette der
     * Ankernachweis, der auf den charakteristischen Faellen steht, G und
     * Wind nie mehr zusammen gesehen. Entscheid vom selben Tag: je eine
     * Richtung, vier Faelle. `gwk` bleibt der Schluessel fuer +y.
     */
    ...[['WindY', +1, 'gwk', '+y (Gleisrichtung)'], ['WindY', -1, 'gwkm', '−y (Gleisrichtung)'],
        ['WindX', +1, 'gwkx', '+x (Jochachse)'], ['WindX', -1, 'gwkxm', '−x (Jochachse)']]
      .map(([gruppe, vz, key, text]) => ({
        key, bez: `Ständig + Wind ${text}`,
        art: 'charakteristisch', nachweis: false, leit: gruppe, vorzeichen: vz,
        beiwerte: bw({ G: 1, [gruppe]: vz }) })),
  );

  // Wind leitend, je Richtung mit beiden Vorzeichen
  [['Y', 'WindY', 'y (Gleisrichtung)'], ['X', 'WindX', 'x (Jochachse)']]
    .forEach(([tag, gruppe, text]) => {
      [['p', +1, '+'], ['m', -1, '−']].forEach(([suffix, vz, zeichen]) => {
        lf.push({
          key: `wind${tag}${suffix}`,
          bez: `Wind ${zeichen}${text} leitend`,
          art: 'tragsicherheit', nachweis: true, leit: gruppe, vorzeichen: vz,
          beiwerte: bw({ G: g, [gruppe]: vz * q, Schnee: begleitS }),
        });
      });
    });

  if (s) {
    [['p', +1, '+'], ['m', -1, '−']].forEach(([suffix, vz, zeichen]) => {
      lf.push({
        key: `schnee${suffix}`,
        bez: `Schnee leitend, Wind ${zeichen}y`,
        art: 'tragsicherheit', nachweis: true, leit: 'Schnee', vorzeichen: vz,
        beiwerte: bw({ G: g, WindY: vz * q * p, Schnee: q }),
      });
    });
    // Der begleitende Wind auch in der Jochachse, beide Seiten (17. Sept.).
    [['p', +1, '+'], ['m', -1, '−']].forEach(([suffix, vz, zeichen]) => {
      lf.push({
        key: `schneeX${suffix}`,
        bez: `Schnee leitend, Wind ${zeichen}x`,
        art: 'tragsicherheit', nachweis: true, leit: 'Schnee', vorzeichen: vz,
        beiwerte: bw({ G: g, WindX: vz * q * p, Schnee: q }),
      });
    });
  }

  /*
   * >>> HAVARIE: 1.0 · G, OHNE VERAENDERLICHE, LEITERZUG BEI -20 °C. <<<
   *
   * Aussergewoehnliche Bemessungssituation. Der Laengszug des gebrochenen
   * Leiters hat keine vorab bekannte Richtung - also beide.
   */
  /*
   * >>> JE LEITER EIN EIGENER FALL - NUR EINER REISST (19. September). <<<
   *
   * Weisung: «beachte das nur ein leiter im havariefall rissen kann und
   * nicht mehrer.» Bis hierher rissen alle als «Bruch» markierten Leiter
   * im selben Fall. Jetzt steht die Auswahl am Tragwerk (`havarie`), und
   * jeder angehakte Leiter bekommt seine zwei Faelle (±y); massgebend ist
   * die Huelle. Dazu EIN Fall ohne Bruch - die Ablenkung aller Leiter bei
   * -20 °C, die ein Bruch am gerissenen halbiert.
   *
   * Ohne Auswahl bleibt es beim alten Paar (havariep / havariem).
   */
  const kandidaten = Object.entries(inp.havarie ?? {})
    .filter(([, v]) => v?.reisst === true);
  if (havarieVorhanden(inp) && kandidaten.length) {
    lf.push({
      key: 'havariep', bez: 'Havarie (−20 °C), ohne Leiterbruch',
      art: 'aussergewoehnlich', nachweis: true, leit: 'HavarieY', vorzeichen: 1,
      tempFall: 'havarie',
      beiwerte: bw({ G: 1, HavarieX: 1, HavarieY: 1 }),
    });
    kandidaten.forEach(([key, v]) => {
      [['p', +1, '+'], ['m', -1, '−']].forEach(([suffix, vz, zeichen]) => {
        lf.push({
          key: `havarie|${key}|${suffix}`,
          bez: `Havarie: ${v.name ?? key} reisst, Längszug ${zeichen}y`,
          art: 'aussergewoehnlich', nachweis: true, leit: 'HavarieY', vorzeichen: vz,
          tempFall: 'havarie', bruchLeiter: key,
          beiwerte: bw({ G: 1, HavarieX: 1, HavarieY: vz }),
        });
      });
    });
  } else if (havarieVorhanden(inp)) {
    [['p', +1, '+'], ['m', -1, '−']].forEach(([suffix, vz, zeichen]) => {
      lf.push({
        key: `havarie${suffix}`,
        bez: `Havarie (−20 °C), Längszug ${zeichen}y`,
        art: 'aussergewoehnlich', nachweis: true, leit: 'HavarieY', vorzeichen: vz,
        tempFall: 'havarie',
        beiwerte: bw({ G: 1, HavarieX: 1, HavarieY: vz }),
      });
    });
  }

  // --- GEBRAUCHSTAUGLICHKEIT ------------------------------------------------
  // NUR DIE SELTENE KOMBINATION: leitende Einwirkung 1.00, begleitende 0.50.
  // Alle Beiwerte auf Gebrauchsniveau, ohne γ.
  //
  // Die HÄUFIGE Stufe (ψ = 0.70 mit 0.35 begleitend, im geprüften
  // Referenzprojekt die Reihe G110…G123) ist bewusst NICHT geführt: sie
  // verdoppelt die Zahl der Lastfälle, ohne einen Nachweis zu bedienen, den
  // dieses Werkzeug führt. Wer sie braucht, ergänzt sie als eigenen Lastfall.
  //
  // Auch die seltene Stufe ist KEIN Nachweis (nachweis: false): sie liefert
  // die Schnittgrössen für Verformungsbetrachtungen. Der Nachweis der
  // Gebrauchstauglichkeit selbst - Durchbiegung, Verdrehung, Querverschiebung
  // der Mastköpfe - ist im Werkzeug NICHT geführt.
  [['Y', 'WindY', 'y (Gleisrichtung)'], ['X', 'WindX', 'x (Jochachse)']]
    .forEach(([tag, gruppe, richtung]) => {
      [['p', +1, '+'], ['m', -1, '−']].forEach(([suffix, vz, zeichen]) => {
        lf.push({
          key: `gtseltenW${tag}${suffix}`,
          bez: `Gebrauchstauglichkeit selten: Wind ${zeichen}${richtung}`,
          art: 'gebrauchstauglichkeit', nachweis: false,
          leit: gruppe, vorzeichen: vz, stufe: 'selten',
          beiwerte: bw({ G: 1, [gruppe]: vz }),
        });
      });
    });
  if (s) {
    [['p', +1, '+'], ['m', -1, '−']].forEach(([suffix, vz, zeichen]) => {
      lf.push({
        key: `gtseltenS${suffix}`,
        bez: `Gebrauchstauglichkeit selten: Schnee, Wind ${zeichen}y`,
        art: 'gebrauchstauglichkeit', nachweis: false,
        leit: 'Schnee', vorzeichen: vz, stufe: 'selten',
        beiwerte: bw({ G: 1, WindY: vz * p, Schnee: 1 }),
      });
    });
    [['p', +1, '+'], ['m', -1, '−']].forEach(([suffix, vz, zeichen]) => {
      lf.push({
        key: `gtseltenSX${suffix}`,
        bez: `Gebrauchstauglichkeit selten: Schnee, Wind ${zeichen}x`,
        art: 'gebrauchstauglichkeit', nachweis: false,
        leit: 'Schnee', vorzeichen: vz, stufe: 'selten',
        beiwerte: bw({ G: 1, WindX: vz * p, Schnee: 1 }),
      });
    });
  }
  return lf;
}

/**
 * Alle Lastfälle: die vorgegebenen (ggf. von Hand angepasst) und die eigenen.
 *
 *   inp.lastfallAnpassung  {key: {G, Wind, Schnee}} überschreibt einzelne
 *                          Beiwerte eines vorgegebenen Lastfalls
 *   inp.lastfaelleEigen    [{bez, beiwerte}] frei ergänzte Lastfälle
 */
export function lastfaelle(inp) {
  const anp = inp.lastfallAnpassung ?? {};
  const std = standardLastfaelle(inp).map((l) => (anp[l.key]
    ? { ...l, beiwerte: { ...l.beiwerte, ...anp[l.key] }, angepasst: true }
    : l));
  const eigen = (inp.lastfaelleEigen ?? []).map((l, i) => ({
    key: l.key ?? `eigen${i}`,
    bez: l.bez || `Eigener Lastfall ${i + 1}`,
    art: 'eigen', eigen: true, index: i,
    nachweis: l.nachweis !== false,
    beiwerte: { ...NULLBEIWERTE(), ...(l.beiwerte ?? {}) },
  }));
  return markiereDoppelte([...std, ...eigen]);
}

/**
 * DOPPELTE LASTFÄLLE KENNZEICHNEN.
 *
 * Ein von Hand angelegter Lastfall kann dieselben Beiwerte tragen wie ein
 * vorgegebener - meist, weil er angelegt wurde, als es den vorgegebenen noch
 * nicht gab. Er rechnet dann dasselbe zweimal: in der Umhüllenden fällt das
 * nicht auf, in der Liste steht er doppelt und im Bericht auch.
 *
 * Das kommt nicht von ungefähr: mit den charakteristischen Einzellastfällen
 * (Ständig, Anbauteile, Schnee, Wind y, Wind x) sind fünf Fälle dazugekommen,
 * die man sich vorher von Hand anlegen musste.
 *
 * Gekennzeichnet, nicht entfernt. Was jemand eingegeben hat, verschwindet
 * nicht von selbst - das Werkzeug sagt nur, dass es schon da ist.
 */
function markiereDoppelte(liste) {
  const gesehen = new Map();
  return liste.map((l) => {
    const schluessel = JSON.stringify(l.beiwerte) + '|' + (l.nur ?? '');
    const erster = gesehen.get(schluessel);
    /*
     * NUR EIGENE FAELLE WERDEN GEKENNZEICHNET. Seit dem 18. September
     * tragen «Ständig + Wind ±y» ohne Schnee dieselben Beiwerte wie die
     * seltene Gebrauchstauglichkeit - zwei vorgegebene Faelle mit
     * verschiedenem Zweck (Anker hier, Verformung dort). Die Kennzeichnung
     * gilt dem, was jemand von Hand doppelt angelegt hat.
     */
    if (erster === undefined) { gesehen.set(schluessel, l); return l; }
    if (!l.eigen) return l;
    return { ...l, doppeltZu: erster.key, doppeltBez: erster.bez };
  });
}

/** Beiwerte eines Lastfalls; ohne Treffer der erste Nachweislastfall. */
export function lastfallFuer(inp, key) {
  const alle = lastfaelle(inp);
  return alle.find((x) => x.key === key)
      ?? alle.find((x) => x.nachweis) ?? alle[0];
}

export function beiwerteFuer(inp, key) {
  return { ...lastfallFuer(inp, key).beiwerte };
}

/**
 * Übersicht für die Lastfallmatrix: die drei Einwirkungen mit ihren
 * charakteristischen Werten und die Liste der Lastfälle.
 */
export function lastfallUebersicht(inp, char, anbauteile = []) {
  const aktiv = (anbauteile ?? []).filter((a) => a.aktiv !== false);
  // Summe der Beträge einer Gruppe über alle aufgelösten Anbauteile.
  const summe = (gruppe) => aktiv.reduce((s, a) => {
    const k = a.kraefte?.[gruppe];
    if (!k) return s;
    return s + Math.abs(k.Fx ?? 0) + Math.abs(k.Fy ?? 0) + Math.abs(k.Fz ?? 0);
  }, 0);

  const einwirkungen = [
    { key: 'G', label: 'Ständig', kurz: 'G', art: 'staendig',
      wert: char.gk, einheit: 'kN/m', zusatz: summe('G'),
      bemerkung: 'Eigengewicht Joch (Laufmeterlast) und Anbauteile, ' +
                 'dazu die Umlenkkraft aus dem Leiterzug. Feste Wirkrichtung.' },
    { key: 'WindX', label: 'Wind x', kurz: 'W_x', art: 'veraenderlich',
      wert: 0, einheit: 'kN/m', zusatz: summe('WindX'),
      bemerkung: 'Windkraft in JOCHACHSE, nur aus den Anbauteilen (Q_x). ' +
                 'Die Laufmeterlast der Tabelle wirkt in Gleisrichtung.' },
    { key: 'WindY', label: 'Wind y', kurz: 'W_y', art: 'veraenderlich',
      wert: char.wk, einheit: 'kN/m', zusatz: summe('WindY'),
      bemerkung: 'Windkraft in GLEISRICHTUNG: Laufmeterlast auf das Joch ' +
                 'und Q_y der Anbauteile.' },
    { key: 'Schnee', label: 'Schnee', kurz: 'S', art: 'veraenderlich',
      wert: inp.schneeAktiv ? char.sk : 0, einheit: 'kN/m',
      zusatz: summe('Schnee'),
      bemerkung: (inp.schneeAktiv ? 'Laufmeterlast auf das Joch' : 'kein Schnee auf dem Joch') +
                 ' · veränderliche Vertikallasten der Anbauteile (Q_z)' },
  ];

  return { einwirkungen, staendig: einwirkungen[0], lastfaelle: lastfaelle(inp) };
}

/** Prüft, ob die Spannweite im Sortimentsbereich des Typs liegt. */
export function spannweiteImSortiment(joch, L) {
  if (!joch) return { ok: true, text: '' };
  const inB = (b) => b && L >= b[0] - 1e-6 && L <= b[1] + 1e-6;
  if (inB(joch.laengeNorm)) {
    return { ok: true, text: `L = ${L.toFixed(2)} m liegt im Bereich Normlängen ` +
      `${joch.laengeNorm[0]}–${joch.laengeNorm[1]} m.` };
  }
  if (inB(joch.laengeKurz)) {
    return { ok: true, text: `L = ${L.toFixed(2)} m liegt im Bereich Kurzlängen ` +
      `${joch.laengeKurz[0]}–${joch.laengeKurz[1]} m.` };
  }
  const bereiche = [joch.laengeKurz, joch.laengeNorm].filter(Boolean)
    .map((b) => `${b[0]}–${b[1]} m`).join(' bzw. ');
  return { ok: false, text: `L = ${L.toFixed(2)} m liegt AUSSERHALB des Sortiments ` +
    `von ${joch.typ} (${bereiche}).` };
}
