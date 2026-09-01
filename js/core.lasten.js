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
];

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

  const lf = [
    { key: 'gk', bez: 'Ständig (Joch)', art: 'charakteristisch', nachweis: false,
      nur: 'joch', beiwerte: bw({ G: 1 }) },
    { key: 'ak', bez: 'Anbauteile ständig', art: 'charakteristisch',
      nachweis: false, nur: 'anbauteile', beiwerte: bw({ G: 1 }) },
  ];
  if (s) {
    lf.push({ key: 'sk', bez: 'Schnee', art: 'charakteristisch',
              nachweis: false, beiwerte: bw({ Schnee: 1 }) });
  }
  lf.push(
    { key: 'wyk', bez: 'Wind y (Gleisrichtung)', art: 'charakteristisch',
      nachweis: false, leit: 'WindY', beiwerte: bw({ WindY: 1 }) },
    { key: 'wxk', bez: 'Wind x (Jochachse)', art: 'charakteristisch',
      nachweis: false, leit: 'WindX', beiwerte: bw({ WindX: 1 }) },
    { key: 'gwk', bez: 'Ständig + Wind', art: 'charakteristisch', nachweis: false,
      beiwerte: bw({ G: 1, WindX: 1, WindY: 1 }) },
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
    if (erster === undefined) { gesehen.set(schluessel, l); return l; }
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
