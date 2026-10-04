/**
 * core.bestand.js
 * ---------------------------------------------------------------------------
 * DER BESTANDESSCHUTZ: BESTAND GEGEN BESTAND + NEUE BAUTEILE (4. Oktober).
 *
 * Weisung vom 3. Oktober: «wir haben eine Bestandesschutz regelung. diese
 * besagt wenn die lastzunahme nicht höher als 5% bezogen auf die
 * grenzausnutzung überschreitet, kann von einem vertieftem nachweis
 * abgesehen werden, solange man davon ausgehen kann, dass dazumal nach den
 * gültigen normen gerechnet wurde.»
 *
 * Am 4. Oktober: «Kennzeichen «neu» je Anbauteil, diese option sollte aber
 * erst aufgeführt sein, wenn man die auswahl betätigt, bestandesschutz
 * nachweis, da man diesen nachweis nicht so oft führt.» Auf Rückfrage:
 *
 *   - «Δη ≤ 0.05 absolut»: je Bauteil η(Bestand + neue Teile) − η(Bestand)
 *     ≤ 0.05, bezogen auf die Grenzausnutzung 1.00;
 *   - «Beide mit der gewählten Stufe»: beide Zustände mit der Windstufe,
 *     die unter Lasten eingestellt ist (für die alte Norm der Einheitswind).
 *
 * Gerechnet wird zweimal dasselbe Stabwerk (app.stabwerk.js): einmal wie
 * eingegeben, einmal mit den als «neu» gekennzeichneten Teilen
 * ausgeschaltet (`aktiv: false` - sie bleiben in der Liste, damit Namen und
 * Zuordnungen dieselben sind). Verglichen wird je Bauteil, was das Urteil
 * führt: Joch (bzw. Abfangjoch, Ausleger) und Masten aus dem Stabwerk, dazu
 * Knicken, Fundament und Anker je Mast. Ein VERGLEICH, kein
 * Tragsicherheitsnachweis - er färbt das Urteil nicht.
 * ---------------------------------------------------------------------------
 */

/** Die Grenze der Lastzunahme, bezogen auf die Grenzausnutzung 1.00. */
export const BESTAND_GRENZE = 0.05;

/** Ist ein Anbauteil als neu gekennzeichnet? */
export const istNeu = (a) => a?.neu === true;

/**
 * Das Blatt ohne die neuen Teile - ausgeschaltet, nicht entfernt.
 * Gilt für die Teile am Joch jedes Tragwerks und für die Teile am Masten.
 *
 * @returns {{ werte: object, anzahl: number }}
 */
export function ohneNeueTeile(w) {
  // Gezählt je Kennung: ein Teil am Masten steht im Satz zweimal (in der
  // Projektion `anbauteile` des aktiven Tragwerks und in `mastAnbauteile`).
  const neuIds = new Set();
  const aus = (liste) => (Array.isArray(liste) ? liste.map((a) => {
    if (!istNeu(a)) return a;
    neuIds.add(a.id ?? a);
    return { ...a, aktiv: false };
  }) : liste);
  const werte = {
    ...w,
    anbauteile: aus(w?.anbauteile),
    mastAnbauteile: aus(w?.mastAnbauteile),
    ...(Array.isArray(w?.weitere)
      ? { weitere: w.weitere.map((t) => ({ ...t, anbauteile: aus(t.anbauteile) })) } : {}),
  };
  return { werte, anzahl: neuIds.size };
}

/**
 * Der Vergleich je Bauteil.
 *
 * @param {object} neu      Ergebnis des Stabwerks wie eingegeben
 * @param {object} bestand  Ergebnis ohne die neuen Teile
 * @returns {{ zeilen: Array<{name, alt, neu, d, ok}>, dMax, wer, ok, grenze }}
 */
export function bestandVergleich(neu, bestand, grenze = BESTAND_GRENZE) {
  const zeilen = [];
  const dazu = (name, a, b) => {
    if (!Number.isFinite(a) && !Number.isFinite(b)) return;
    const alt = Number.isFinite(a) ? a : 0;
    const nn = Number.isFinite(b) ? b : 0;
    const d = nn - alt;
    zeilen.push({ name, alt, neu: nn, d, ok: d <= grenze + 1e-12 });
  };
  const namen = new Set([...Object.keys(neu?.bauteile ?? {}), ...Object.keys(bestand?.bauteile ?? {})]);
  [...namen].forEach((k) => {
    const n = neu?.bauteile?.[k], b = bestand?.bauteile?.[k];
    dazu(n?.name ?? b?.name ?? k, b?.eta, n?.eta);
  });
  const jeMast = (feld, titel) => {
    const ids = new Set([...Object.keys(neu?.[feld] ?? {}), ...Object.keys(bestand?.[feld] ?? {})]);
    const eta = (v) => v?.eta ?? v?.nachweis?.eta;
    [...ids].forEach((id) => dazu(`${titel} ${id}`, eta(bestand?.[feld]?.[id]), eta(neu?.[feld]?.[id])));
  };
  jeMast('knick', 'Knicken');
  jeMast('fundamentJe', 'Fundament');
  jeMast('ankerJe', 'Anker');
  if (neu?.ausleger?.aufhaengung || bestand?.ausleger?.aufhaengung) {
    dazu('Aufhängung', bestand?.ausleger?.aufhaengung?.eta, neu?.ausleger?.aufhaengung?.eta);
  }
  zeilen.sort((p, q) => q.d - p.d);
  const m = zeilen[0] ?? null;
  return { zeilen, dMax: m?.d ?? 0, wer: m?.name ?? null,
           ok: zeilen.every((z) => z.ok), grenze };
}
