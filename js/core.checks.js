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
    const art = m.gurtaufteilung ?? 'gemessen';
    const wie = { huellend: 'je Gurt der ungünstigere Anteil (einhüllend)',
                  gemessen: 'gedämpft nach Steifigkeit, an PyNite geeicht',
                  steifigkeit: 'nach Biegesteifigkeit I/ΣI',
                  gleich: 'hälftig' }[art] ?? art;
    h.push(`Gurte verschieden (${m.profOG.name} / ${m.profUG.name}): getrennt ` +
           `nachgewiesen, lokale Biegung ${wie}.`);
  }

  // Der Vergleichsmodus darf nicht als Nachweis durchgehen.
  if ((m.knotenbereich ?? 'anschnitt') === 'schwerachsen') {
    h.push('KEIN NACHWEIS: der Knotenbereich ist auf «Achse zu Achse» '
      + 'gestellt. Das ist ein Vergleichsmodus gegen Prüfmodelle – die '
      + 'Abminderung auf den Anschnitt entfällt, Gurt- und Blechmomente '
      + 'liegen 11 bis 15 % höher. Nachweisgrundlage ist der STEIFE '
      + 'Knotenbereich.');
  }

  // --- AUFLAGER: die Zahlen, an denen ein Eingabefehler auffällt ------------
  // Beim Nachbau eines geprüften FEM-Modells lagen genau hier die grössten
  // Fehler - eine geschätzte Drehfeder um Faktor 3 daneben, die Stützweite um
  // 5 %. Beides sieht man dem Ergebnis nicht an, wenn es nirgends steht.
  if (Number.isFinite(m.kappaA)) {
    const grad = (k) => `${(100 * Math.max(0, Math.min(1, k))).toFixed(0)} %`;
    const cTxt = (c) => (c >= 1e11 ? 'starr'
      : c <= 0 ? '0' : `${c.toFixed(0)} kNm/rad`);
    h.push(`Auflager ${m.federn.art}: c_φ = ${cTxt(m.federn.cA)}`
      + (Math.abs(m.federn.cB - m.federn.cA) > 1 ? ` / ${cTxt(m.federn.cB)}` : '')
      + `, Einspanngrad ${grad(m.kappaA)}`
      + (Math.abs(m.kappaB - m.kappaA) > 0.01 ? ` / ${grad(m.kappaB)}` : '')
      + `, Stützmoment ${Math.abs(m.MA).toFixed(2)}`
      + (Math.abs(Math.abs(m.MB) - Math.abs(m.MA)) > 0.005
         ? ` / ${Math.abs(m.MB).toFixed(2)}` : '') + ' kNm.');
  }
  if (m.federn?.mast) {
    const ma = m.federn.mastA ?? m.federn.mast;
    h.push(m.federn.verschieblich
      ? 'Wind in Jochachse: beide Mastköpfe wollen in dieselbe Richtung, der '
        + 'Rahmen VERSCHIEBT sich. Gerechnet wird deshalb mit dem Kragmast, '
        + `c_φ = ${ma.cVerschieblich.toFixed(0)} kNm/rad.`
      : 'Das Joch bindet die beiden Mastköpfe zusammen; unter dieser '
        + 'Einwirkung sind die Stützmomente gleichsinnig und der Rahmen '
        + 'verschiebt sich NICHT. Gerechnet wird mit der Rahmenfeder '
        + `3.10·E·I/H = ${ma.cUnverschieblich.toFixed(0)} statt mit dem `
        + `Kragmast (${ma.cKragarm.toFixed(0)} kNm/rad). An zwei Rahmen `
        + 'gemessen, Lehrbuchwert wäre 4.00.');
  }
  if (m.federn?.grenze?.begrenzt) {
    h.push(`Drehfeder auf die Gurtverbindung begrenzt: c_φ von `
      + `${m.federn.roh.cA.toFixed(0)} auf ${m.federn.cA.toFixed(0)} kNm/rad `
      + `herabgesetzt, Gurtkraft ${m.federn.grenze.FA.toFixed(1)} kN.`);
  }
  if (m.kragA > 0 || m.kragB > 0) {
    h.push(`Auflager innerhalb der Gurtenden: Stützweite `
      + `${m.stuetzweite.toFixed(3)} m gegen ${m.L.toFixed(3)} m Gurtlänge, `
      + `Kragarme ${m.kragA.toFixed(3)} / ${m.kragB.toFixed(3)} m. Die `
      + 'Blecheinteilung hängt an der Gurtlänge und bleibt unberührt.');
  } else if (m.endbedingung !== 'gelenkig') {
    h.push('Auflager an den Gurtenden, keine Kragarme. Steht der Mast weiter '
      + 'innen, ist das unter «Kragarm» einzugeben – 5 % Stützweite sind rund '
      + '11 % auf jedes globale Moment.');
  }
  if (m.mastKopf) {
    h.push(`Wind auf den Mast verdreht das Jochende: θ₀ = `
      + `${(1000 * m.mastKopf.A.theta0).toFixed(2)} mrad, eingeleitetes Moment `
      + `bis ${m.mastKopf.A.M0.toFixed(2)} kNm je Ende. Der Mastwind in `
      + 'GLEISRICHTUNG ist damit nicht erfasst.');
  } else if (m.federn?.mast) {
    h.push('Mastwind wirkt nur auf den Mast, nicht auf das Joch. Am '
      + 'nachgerechneten Signaljoch fehlte damit die Hälfte der Einwirkung '
      + 'des Lastfalls Wind in Jochachse.');
  }
  if (m.mastDrehung) {
    const d = m.mastDrehung;
    h.push(d.gleich
      ? 'Wind auf den Mast in Gleisrichtung: beide Enden verdrehen sich gleich '
        + `(${(1000 * d.phiA).toFixed(2)} mrad um die Jochachse), das Joch dreht `
        + 'sich starr mit – daraus entsteht KEINE Torsion. Erst verschiedene '
        + 'Maste an den beiden Enden verwinden es.'
      : `Wind auf den Mast in Gleisrichtung: Kopfverdrehung um die Jochachse `
        + `${(1000 * d.phiA).toFixed(2)} / ${(1000 * d.phiB).toFixed(2)} mrad, `
        + `Differenz ergibt T₀ = ${Math.abs(d.T0).toFixed(2)} kNm Torsion über `
        + 'die ganze Jochlänge. Das Joch ist dabei als torsionsstarr '
        + 'angenommen – die obere Schranke. Der Term ist hergeleitet, nicht '
        + 'geeicht: gegen das eine verfügbare FEM-Modell verschlechtert er die '
        + 'Übereinstimmung, er liegt aber auf der sicheren Seite.');
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
