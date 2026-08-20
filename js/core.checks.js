/**
 * core.checks.js
 * ---------------------------------------------------------------------------
 * RECHENKERN: Querschnittsklassen, geometrische Verträglichkeit und
 * Plausibilität. Reine Funktionen, kein DOM.
 *
 * Einheitliches Schema je Prüfung, damit Oberfläche und Ausleitung sie ohne
 * Sonderfälle darstellen können:
 *   { id, text, vorhanden, erforderlich, einheit, richtung, ok, status }
 * ---------------------------------------------------------------------------
 */

import { U } from './core.constants.js';
import { querschnitt } from './geometry.js';
import { klassifizierung } from './core.klassen.js';

const pruef = (id, text, vorhanden, erforderlich, einheit, richtung, okText, nokText) => {
  const ok = richtung === '<=' ? vorhanden <= erforderlich + 1e-9
                               : vorhanden >= erforderlich - 1e-9;
  return { id, text, vorhanden, erforderlich, einheit, richtung, ok,
           status: ok ? okText : nokText };
};

/** Kleinste und grösste vorkommende Blechabmessung. */
export function blechExtremwerte(m) {
  if (m.dbBleche) {
    const alle = [...(m.joch.bleche.vertikal ?? []), ...(m.joch.bleche.horizontal ?? [])];
    return {
      quelle: `Typendatenbank ${m.joch.typ}`,
      breiteMin: Math.min(...alle.map((b) => b.breite)),
      breiteMax: Math.max(...alle.map((b) => b.breite)),
      dickeMin: Math.min(...alle.map((b) => b.dicke)),
    };
  }
  const breiten = m.endblechWieZwischen ? [m.h2] : [m.h1, m.h2];
  const dicken = m.endblechWieZwischen ? [m.t2] : [m.t1, m.t2];
  return {
    quelle: 'manuelle Eingabe',
    breiteMin: Math.min(...breiten), breiteMax: Math.max(...breiten),
    dickeMin: Math.min(...dicken),
  };
}

/**
 * Prüfliste: Querschnittsklassen aller Bauteile plus Plausibilität.
 * Die Klassifizierung wird je Bauteil einzeln ausgewiesen, damit erkennbar
 * bleibt, welches Teil die Klasse bestimmt.
 */
export function konstruktionsChecks(m) {
  const kl = klassifizierung(m);
  const checks = [];

  kl.teile.forEach((t, i) => {
    const massgebendes = t.kriterien.reduce((a, b) => (b.klasse > a.klasse ? b : a));
    checks.push({
      id: `Q${i + 1}`,
      text: `${t.rolle} ${t.bauteil} – ${massgebendes.id}`,
      vorhanden: massgebendes.ct,
      erforderlich: massgebendes.grenze,
      einheit: 'c/t', richtung: '<=',
      ok: t.klasse <= 3,
      status: `Klasse ${t.klasse}`,
      klasse: t.klasse,
      warnungNichtFehler: t.klasse === 3,
    });
  });

  // --- Plausibilität --------------------------------------------------------
  // Die Befestigungspunkte liegen bei x ± raster/2 und müssen auf dem Joch liegen
  const aktive = (m.anbauteile ?? []).filter((a) => a.aktiv !== false);
  const rand = (a) => [a.x - (a.raster ?? 0.4) / 2, a.x + (a.raster ?? 0.4) / 2];
  const xMax = aktive.length ? Math.max(...aktive.map((a) => rand(a)[1])) : 0;
  const xMin = aktive.length ? Math.min(...aktive.map((a) => rand(a)[0])) : 0;
  const ausserhalb = aktive.filter((a) => rand(a)[0] < 0 || rand(a)[1] > m.L);
  checks.push({
    id: 'P1',
    text: `Befestigungspunkte der ${aktive.length} Anbauteile auf dem Joch`,
    vorhanden: xMax, erforderlich: m.L, einheit: 'm', richtung: '<=',
    ok: ausserhalb.length === 0 && xMin >= 0,
    status: ausserhalb.length === 0 && xMin >= 0
      ? 'OK' : `AUSSERHALB: ${ausserhalb.map((l) => l.name).join(', ') || 'x < 0'}`,
  });

  const n = m.L / m.a1;
  checks.push({
    id: 'P2', text: 'Feldeinteilung:  L / a₁ ganzzahlig',
    vorhanden: n, erforderlich: Math.round(n), einheit: '–', richtung: '=',
    ok: Math.abs(n - Math.round(n)) < 1e-3,
    status: Math.abs(n - Math.round(n)) < 1e-3 ? 'OK' : 'letztes Feld kürzer',
    warnungNichtFehler: true,
  });

  checks.push(pruef('P3', 'Lage des Nachweisschnitts:  0 ≤ x_N ≤ L',
    m.xNachweis ?? 0, m.L, 'm', '<=', 'OK', 'AUSSERHALB'));

  return checks;
}

/** Geometrische Verträglichkeit der Bindeblechflucht. */
export function fluchtChecks(m) {
  const qs = querschnitt(m);
  return { qs, warnungen: qs.warnungen };
}

/** Zusätzliche Hinweise, die kein Ja/Nein-Nachweis sind. */
export function hinweise(m) {
  const h = [];
  const kl = klassifizierung(m);

  if (kl.klasse4.length) {
    h.push(`Klasse 4 bei ${kl.klasse4.map((t) => t.bauteil).join(', ')}: gerechnet ` +
           'wird mit dem Bruttoquerschnitt, nicht dem wirksamen nach ' +
           'EN 1993-1-5 – unsichere Seite.');
  }
  // Altbauweise: der Anschluss ans Mast trägt kein Einspannmoment.
  if (m.bauweise === 'alt' && m.endbedingung !== 'gelenkig') {
    h.push('Altbauweise eingespannt gerechnet. Vorgabe: bei alten Jochen ' +
           'GELENK ansetzen – der Anschluss ans Mast trägt kein Einspannmoment.');
  }
  if (m.profOG.name !== m.profUG.name) {
    h.push(`Gurte verschieden (${m.profOG.name} / ${m.profUG.name}): getrennt ` +
           'nachgewiesen, lokale Biegung hälftig verteilt.');
  }
  [m.profOG, m.profUG].forEach((p) => {
    if (p.hinweis) h.push(`${p.name}: ${p.hinweis}`);
  });
  if (m.breite?.aktiv) {
    // jkk fehlt bei Typen ohne zweiten Knickpunkt - dann nur den ersten nennen.
    const knick = [m.breite.jk, m.breite.jkk].filter(Number.isFinite).join('/');
    h.push(`Grundriss geknickt: Hebelarm b ortsabhängig, ` +
           `${(m.breite.bAn(0) * 1000).toFixed(0)} mm am Auflager gegen ` +
           `${(m.b * 1000).toFixed(0)} mm im Feld` +
           `${knick ? ` (Knick ${knick} mm)` : ''}.`);
    if (m.jbbOG !== m.jbbUG) {
      h.push(`Gurte verschieden breit (${m.jbbOG} / ${m.jbbUG} mm): gerechnet ` +
             'mit dem Mittel der Hebelarme, die Vertikalebenen stehen leicht schräg.');
    }
  } else {
    h.push('Grundriss durchgehend gleich breit; gerechnet mit ' +
           `${m.massVariante === 'aussen' ? 'dem Aussenmass' :
              m.massVariante === 'licht' ? 'dem lichten Mass' : 'dem Schwerpunktsabstand'}.`);
  }
  h.push(m.torsionModell === 'huellkurve'
    ? 'Torsion als konstante Hüllkurve über die Spannweite (konservativ, ' +
      'Gabellagerung vorausgesetzt).'
    : 'Torsion mit Auflagerverteilung (Gabellagerung vorausgesetzt).');
  h.push(m.torsionsverteilung === 'schubfluss'
    ? 'Torsion als umlaufender Schubfluss q = T/(2·b·h) auf alle vier Ebenen, ' +
      'mit der Querkraft überlagert.'
    : 'Torsion allein den Vertikalebenen zugewiesen (V_T = T/b) – doppelt so ' +
      'gross wie der Schubflussanteil.');
  if (m.verlauf?.aktiv) {
    const v = m.verlauf.voute;
    h.push(`Verjüngte Enden: Bauhöhe ${m.jd} → ${v.endJd} mm, Hebelarm h an ` +
           `jeder Station örtlich gerechnet, nach unten abgefangen bei ` +
           `${(m.verlauf.hMin * 1000).toFixed(0)} mm. Bei eingespannten Enden ist ` +
           'der Endbereich gesondert zu betrachten.');
    h.push('EI für Drehfeder und Auflagermoment mit dem Feldquerschnitt ' +
           'gerechnet – sichere Seite für das Feldmoment.');
  }
  if (m.ausfuehrung) {
    h.push(`Blechstaffelung nach Ausführung ${m.ausfuehrung.bez} ` +
           `(${m.ausfuehrung.l[0].toFixed(2)}–${m.ausfuehrung.l[1].toFixed(2)} m); ` +
           `Teilung gleichmässig, exakt auf Schema ${m.joch?.quelle?.schema ?? '–'}.`);
  }
  if (m.dbBleche && !m.joch.staffelung_geprueft) {
    h.push(`Blechstaffelung ${m.joch.typ} aus den Stückzahlen abgeleitet, nicht ` +
           'abgelesen – gegen das Schemablatt zu prüfen.');
  }
  h.push('Kein Knicknachweis – Gesamtstab und Einzelwinkel separat nachzuweisen.');
  return h;
}

/** Sammelurteil über alle Prüfungen. */
export function urteilKonstruktion(checks) {
  const harte = checks.filter((c) => !c.warnungNichtFehler);
  return {
    alleOk: harte.every((c) => c.ok),
    anzahlVerletzt: harte.filter((c) => !c.ok).length,
  };
}

export { klassifizierung };
