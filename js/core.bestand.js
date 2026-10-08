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

/*
 * >>> DIE GRENZE EINSTELLBAR, MIT BEZUG (6. Oktober). <<< Weisung: «Beim
 * Bestandesschutz das Delta 5% einstellbar machen auf tatsächliche
 * ausnutzung oder den Grenzwert de Bauteils.» Zwei Felder des Blattes:
 *   - `bestandProzent` (Vorgabe 5),
 *   - `bestandBezug`: «grenzwert» (Vorgabe, wie bisher) Δη ≤ p/100 · 1.00,
 *     «ausnutzung» Δη ≤ p/100 · η(Bestand) - die Zunahme gemessen an der
 *     vorhandenen Ausnutzung des Bauteils (strenger, solange η < 1).
 */
export const BESTAND_BEZUEGE = [
  { key: 'grenzwert', titel: 'Grenzwert des Bauteils (η = 1.00)' },
  { key: 'ausnutzung', titel: 'tatsächliche Ausnutzung (η Bestand)' },
];

/** Die Regel aus dem Satz: Prozent und Bezug, mit Vorgaben. */
export function bestandRegel(w) {
  const p = Number(w?.bestandProzent);
  return { prozent: Number.isFinite(p) && p > 0 ? p : BESTAND_GRENZE * 100,
           bezug: w?.bestandBezug === 'ausnutzung' ? 'ausnutzung' : 'grenzwert' };
}

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
export function bestandVergleich(neu, bestand, regel = {}) {
  // Eine Zahl gilt als Grenze auf den Grenzwert (alter Aufruf).
  const r = typeof regel === 'number'
    ? { prozent: regel * 100, bezug: 'grenzwert' } : bestandRegel(regel);
  const grenze = r.prozent / 100;
  const zeilen = [];
  const dazu = (name, a, b, gruppe = 'joch') => {
    if (!Number.isFinite(a) && !Number.isFinite(b)) return;
    const alt = Number.isFinite(a) ? a : 0;
    const nn = Number.isFinite(b) ? b : 0;
    const d = nn - alt;
    // Zulaessige Zunahme je Bauteil: fest oder anteilig an η(Bestand).
    const zul = r.bezug === 'ausnutzung' ? grenze * alt : grenze;
    // `gruppe` (8. Oktober): joch / mast / fundament - für die Auswahl im Blatt.
    zeilen.push({ name, gruppe, alt, neu: nn, d, zul, rel: alt > 1e-12 ? d / alt : null,
                  q: zul > 1e-12 ? d / zul : (d > 1e-12 ? Infinity : 0),
                  ok: d <= zul + 1e-12 });
  };
  const namen = new Set([...Object.keys(neu?.bauteile ?? {}), ...Object.keys(bestand?.bauteile ?? {})]);
  [...namen].forEach((k) => {
    const n = neu?.bauteile?.[k], b = bestand?.bauteile?.[k];
    dazu(n?.name ?? b?.name ?? k, b?.eta, n?.eta, k.startsWith('mast:') ? 'mast' : 'joch');
  });
  const jeMast = (feld, titel, gruppe = 'mast') => {
    const ids = new Set([...Object.keys(neu?.[feld] ?? {}), ...Object.keys(bestand?.[feld] ?? {})]);
    const eta = (v) => v?.eta ?? v?.nachweis?.eta;
    [...ids].forEach((id) => dazu(`${titel} ${id}`, eta(bestand?.[feld]?.[id]), eta(neu?.[feld]?.[id]), gruppe));
  };
  jeMast('knick', 'Knicken');
  jeMast('fundamentJe', 'Fundament', 'fundament');
  jeMast('ankerJe', 'Anker');
  if (neu?.ausleger?.aufhaengung || bestand?.ausleger?.aufhaengung) {
    dazu('Aufhängung', bestand?.ausleger?.aufhaengung?.eta, neu?.ausleger?.aufhaengung?.eta);
  }
  // Massgebend ist das Bauteil, das seine Grenze am meisten ausschöpft.
  zeilen.sort((p, q) => q.q - p.q || q.d - p.d);
  const m = zeilen[0] ?? null;
  return { zeilen, dMax: m?.d ?? 0, relMax: m?.rel ?? null, wer: m?.name ?? null,
           ok: zeilen.every((z) => z.ok), grenze, prozent: r.prozent, bezug: r.bezug };
}
