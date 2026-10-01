/**
 * export.stabbericht.js
 * ---------------------------------------------------------------------------
 * DER NACHWEISBERICHT AUF DEM STABWERKSWEG - das ganze Blatt in einem Bericht.
 *
 * Weisung vom 1. Oktober: «Bericht und Excel auf den Stabwerksweg umstellen,
 * dazu je ein Bericht für Abfangjoch und Tragausleger.» Auf Rückfrage:
 *
 *   «Formel + Stabliste»   je Bauteil der massgebende Stab mit Kombination,
 *                          Endkräften und eingesetzter Spannungsformel, dazu
 *                          die zehn höchstbeanspruchten Stäbe des Teils;
 *   «Ganzes Blatt»         ein Bericht für alle Tragwerke und Masten, die das
 *                          Stabwerk zusammen rechnet - geteilte Masten einmal;
 *   «Weg, ausser Knicken»  keine Zahl des Ersatzbalkens mehr; das Knicken nach
 *                          SIA 263 Gleichung (50) mit den Kräften des
 *                          Stabwerks, wie in der Anzeige;
 *   «Erst rechnen»         ohne gültiges Stabwerk rechnet der Knopf zuerst
 *                          (app.bericht.js).
 *
 * Abfangjoch und Tragausleger haben damit ihren Bericht: sie stehen im
 * Stabwerk mit ihren eigenen Teilen (Gurte UPE, Bindebleche, Aufhängung).
 *
 * >>> DER BERICHT RECHNET NICHTS. <<<
 *
 * Wie der Bericht des Ersatzbalkens (export.nachweisbericht.js): jede Zahl
 * kommt aus dem Stabwerk (`stabSpannung` gibt die Zwischenwerte mit) oder
 * aus dem Kern des Tragwerks; hier werden sie in die Formeln gesetzt. Der
 * Prüfstand (Abschnitt 183) rechnet die eingesetzten Formeln nach.
 * Ausgewählt wird hier nur: das Grösste einer Liste, die höchsten zehn.
 * ---------------------------------------------------------------------------
 */

import { esc, zahl, tabelle, angaben, formel, urteilMarke, bild, feldText,
         STIL, FARBEN_DRUCK, knickHtml, fundamentHtml, FUNDAMENT_TEXT,
         gebrauchKapitel, NUR_JOCH, berichtVorgabe } from './export.nachweisbericht.js';
import { FELDER } from './ui.schema.js';
import { reaktionenTabelleHtml } from './export.reaktionen.js';

/** Wie die Teile eines Tragwerks im Bericht heissen. */
export const TEIL_NAMEN = { OG: 'Obergurt', UG: 'Untergurt', blech: 'Bindebleche',
                            UPE: 'Gurte UPE', mast: 'Mast' };
const TEILE = ['OG', 'UG', 'UPE', 'blech'];

/** Die Endkräfte am massgebenden Ende: i = 0..5, j = 6..11. */
export function endkraefte(z) {
  if (!z?.f) return null;
  const o = z.ende === 'j' ? 6 : 0;
  return { N: z.f[o], Vy: z.f[o + 1], Vz: z.f[o + 2], T: z.f[o + 3],
           My: z.f[o + 4], Mz: z.f[o + 5] };
}

/* ===========================================================================
 * >>> DAS URTEIL DES BLATTES. <<<
 *
 * Dieselbe Regel wie `bauteileMitStabwerk` (core.stabnachweis.js) - je
 * Bauteil das grösste η mit Fall, ein nicht lieferbares Bauteil vor jeder
 * Zahl -, nur über ALLE Tragwerke und Masten des Blattes statt über das
 * aktive. Ein geteilter Mast steht einmal.
 * ========================================================================= */
export function blattUrteil(d) {
  const sw = d.sw ?? {};
  const liste = [];
  const nimm = (x) => {
    const e = Number.isFinite(x.eta) ? x.eta : null;
    liste.push({ ...x, eta: e, ueber: x.ueber ?? (e !== null && e > 1 + 1e-9) });
  };
  (d.tragwerke ?? []).forEach((tw) => {
    TEILE.forEach((teil) => {
      const t = sw.teile?.[`${tw.stabKey}|${teil}`];
      if (!t) return;
      nimm({ key: `${tw.stabKey}|${teil}`, name: `${tw.pos} · ${TEIL_NAMEN[teil]}`,
             eta: t.eta, fall: t.fall, bez: t.bez, gruppe: 'tragwerk' });
    });
    const a = tw.art === 'tragausleger' ? sw.ausleger?.aufhaengung : null;
    if (a) {
      nimm({ key: 'aufhaengung', name: `${tw.pos} · Aufhängung`, eta: a.eta,
             fall: a.fall, bez: a.bez, ueber: a.ueber ?? null, gruppe: 'tragwerk' });
    }
  });
  (d.masten ?? []).forEach((m) => {
    const t = sw.teile?.[`mast:${m.id}|mast`] ?? sw.bauteile?.[`mast:${m.id}`];
    if (t) {
      nimm({ key: `mast:${m.id}`, name: `Mast ${m.anzeige}`, eta: t.eta,
             fall: t.fall, bez: t.bez, gruppe: 'mast' });
    }
    if (m.knick && Number.isFinite(m.knick.eta)) {
      nimm({ key: `knick:${m.id}`, name: `Knicken ${m.anzeige}`, eta: m.knick.eta,
             fall: m.knick.fall, bez: m.knick.bez, gruppe: 'mast' });
    }
    const a = m.anker?.nachweis;
    // Ein schlaffes Seil ist kein Nachweis (wie in der Anzeige).
    if (a && a.grund !== 'schlaff') {
      nimm({ key: `anker:${m.id}`, name: `Anker ${a.typ ?? ''} ${m.anzeige}`.replace(/\s+/g, ' '),
             eta: a.eta ?? null, fall: m.anker.lastfall, bez: m.anker.bez,
             ueber: a.lieferbar === false ? true : null, gruppe: 'anker' });
    }
    if (m.fundament && Number.isFinite(m.fundament.eta)) {
      nimm({ key: `fundament:${m.id}`, name: `Fundament ${m.anzeige}`, eta: m.fundament.eta,
             fall: m.fundament.massgebend?.lastfall, bez: m.fundament.massgebend?.bez,
             gruppe: 'fundament' });
    }
  });
  const massgebend = liste.reduce((best, x) => {
    if (!best) return x;
    if (x.ueber && x.eta === null) return best.ueber && best.eta === null ? best : x;
    if (best.ueber && best.eta === null) return best;
    return (x.eta ?? 0) > (best.eta ?? 0) ? x : best;
  }, null);
  const zahlen = liste.map((x) => x.eta).filter((v) => v !== null);
  return { liste, massgebend, eta: zahlen.length ? Math.max(...zahlen) : null,
           ueber: liste.some((x) => x.ueber) };
}

/* ===========================================================================
 * >>> DIE SPANNUNGSFORMEL EINES STABES, EINGESETZT. <<<
 * ========================================================================= */

/** Grosse Zahlen als a·10⁶ - die Flächenmomente der Winkel in mm⁴. */
const e6 = (v) => `${zahl(v / 1e6, 4)}·10⁶`;
/** Zahlen mit fünf gültigen Stellen (die Hilfsgrössen k in N/mm³). */
const g5 = (v) => (Number.isFinite(v) ? (v < 0 ? '−' : '') + Math.abs(v).toPrecision(5) : '—');
const klammer = (s) => (String(s).startsWith('−') ? `(${s})` : s);

export function stabFormelHtml(z, fyd) {
  const d = z?.detail;
  if (!d) return '<p>Keine Zwischenwerte vorhanden.</p>';
  const kopf = `<p>Stab <b>${esc(z.wo ?? z.name)}</b>, Ende ${esc(d.ende)}, Kombination
    <b>${esc(z.bez ?? z.fall ?? '')}</b>. Endkräfte dort (Stabachsen):
    N = ${zahl(d.N, 3)} kN · M<sub>y</sub> = ${zahl(d.My, 4)} kNm · M<sub>z</sub> = ${zahl(d.Mz, 4)} kNm${
      Number.isFinite(d.T) ? ` · T = ${zahl(d.T, 4)} kNm` : ''}${
      Number.isFinite(d.V) ? ` · V = ${zahl(d.V, 3)} kN` : ''}.</p>`;
  if (d.art === 'winkel') {
    return `${kopf}
    <p class="klein">Winkel ${esc(d.profil ?? '')}: A = ${zahl(d.A, 1)} mm² ·
    I<sub>y</sub> = ${e6(d.Iy)} · I<sub>z</sub> = ${e6(d.Iz)} · I<sub>yz</sub> = ${e6(d.Iyz)} mm⁴ ·
    massgebende Ecke y = ${zahl(d.y, 1)} mm, z = ${zahl(d.z, 1)} mm (ab Schwerpunkt).
    Schiefe Biegung über das Deviationsmoment, Momente vorzeichenrichtig, N mit seinem Betrag.</p>
    ${formel('σ<sub>N</sub>', '|N| / A', `${zahl(Math.abs(d.N) * 1000, 1)} N / ${zahl(d.A, 1)} mm²`, zahl(d.sigN, 2), 'N/mm²')}
    ${formel('k<sub>y</sub>', '(M<sub>y</sub> I<sub>z</sub> + M<sub>z</sub> I<sub>yz</sub>) / (I<sub>y</sub> I<sub>z</sub> − I<sub>yz</sub>²)',
      `(${zahl(d.My, 4)}·10⁶ · ${e6(d.Iz)} + ${klammer(zahl(d.Mz, 4))}·10⁶ · ${klammer(e6(d.Iyz))}) / (${e6(d.Iy)} · ${e6(d.Iz)} − ${klammer(e6(d.Iyz))}²)`,
      g5(d.ky), 'N/mm³')}
    ${formel('k<sub>z</sub>', '(M<sub>z</sub> I<sub>y</sub> + M<sub>y</sub> I<sub>yz</sub>) / (I<sub>y</sub> I<sub>z</sub> − I<sub>yz</sub>²)',
      `(${zahl(d.Mz, 4)}·10⁶ · ${e6(d.Iy)} + ${klammer(zahl(d.My, 4))}·10⁶ · ${klammer(e6(d.Iyz))}) / (${e6(d.Iy)} · ${e6(d.Iz)} − ${klammer(e6(d.Iyz))}²)`,
      g5(d.kz), 'N/mm³')}
    ${formel('σ<sub>M</sub>', '|k<sub>y</sub> · z − k<sub>z</sub> · y|',
      `|${g5(d.ky)} · ${klammer(zahl(d.z, 1))} − ${klammer(g5(d.kz))} · ${klammer(zahl(d.y, 1))}|`, zahl(d.sigM, 2), 'N/mm²')}
    ${formel('σ', 'σ<sub>N</sub> + σ<sub>M</sub>', `${zahl(d.sigN, 2)} + ${zahl(d.sigM, 2)}`, zahl(d.sig, 2), 'N/mm²')}
    ${formel('η', 'σ / f<sub>yd</sub>', `${zahl(d.sig, 2)} / ${zahl(fyd, 2)}`, zahl(z.eta, 3))}
    <p>${urteilMarke(z.eta)}</p>`;
  }
  // Rechteck, I-Profil, U-Profil: N/A + M/W (+ Wölbspannung, + Schub am Blech).
  const A = d.A * 1e4, Wy = d.Wy * 1e6, Wz = d.Wz * 1e6;      // cm², cm³
  const blech = Number.isFinite(d.tau);
  const sigNorm = blech ? d.sigNorm : d.sig;
  return `${kopf}
    <p class="klein">A = ${zahl(A, 2)} cm² · W<sub>y</sub> = ${zahl(Wy, 2)} cm³ · W<sub>z</sub> = ${zahl(Wz, 2)} cm³
    (1 kN/cm² = 10 N/mm², 1 kNm/cm³ = 1000 N/mm²).</p>
    ${formel('σ<sub>N</sub>', '|N| / A', `${zahl(Math.abs(d.N), 3)} kN / ${zahl(A, 2)} cm²`, zahl(d.sigN, 2), 'N/mm²')}
    ${formel('σ<sub>My</sub>', '|M<sub>y</sub>| / W<sub>y</sub>', `${zahl(Math.abs(d.My), 4)} kNm / ${zahl(Wy, 2)} cm³`, zahl(d.sigMy, 2), 'N/mm²')}
    ${formel('σ<sub>Mz</sub>', '|M<sub>z</sub>| / W<sub>z</sub>', `${zahl(Math.abs(d.Mz), 4)} kNm / ${zahl(Wz, 2)} cm³`, zahl(d.sigMz, 2), 'N/mm²')}
    ${d.sigW > 0 ? formel('σ<sub>ω</sub>', 'Wölbspannung aus T (Fuss wölbeingespannt, Kopf wölbfrei)', '', zahl(d.sigW, 2), 'N/mm²') : ''}
    ${formel(blech ? 'σ' : 'σ', `σ<sub>N</sub> + σ<sub>My</sub> + σ<sub>Mz</sub>${d.sigW > 0 ? ' + σ<sub>ω</sub>' : ''}`,
      `${zahl(d.sigN, 2)} + ${zahl(d.sigMy, 2)} + ${zahl(d.sigMz, 2)}${d.sigW > 0 ? ` + ${zahl(d.sigW, 2)}` : ''}`,
      zahl(sigNorm, 2), 'N/mm²')}
    ${blech ? `${formel('τ', '1.5 · V / A', `1.5 · ${zahl(d.V, 3)} kN / ${zahl(A, 2)} cm²`, zahl(d.tau, 2), 'N/mm²')}
    ${formel('σ<sub>v</sub>', '√(σ² + 3 τ²)', `√(${zahl(sigNorm, 2)}² + 3 · ${zahl(d.tau, 2)}²)`, zahl(d.sig, 2), 'N/mm²')}` : ''}
    ${formel('η', `${blech ? 'σ<sub>v</sub>' : 'σ'} / f<sub>yd</sub>`, `${zahl(d.sig, 2)} / ${zahl(fyd, 2)}`, zahl(z.eta, 3))}
    <p>${urteilMarke(z.eta)}</p>`;
}

/** Die zehn höchstbeanspruchten Stäbe eines Teils (Rückfrage «Formel + Stabliste»). */
export function stabListe(sw, bauteil, teil, n = 10) {
  return Object.values(sw?.jeStab ?? {})
    .filter((z) => z.bauteil === bauteil && z.teil === teil && Number.isFinite(z.eta))
    .sort((a, b) => b.eta - a.eta)
    .slice(0, n);
}

function stabTabelle(liste) {
  if (!liste.length) return '';
  return tabelle(['Stab', 'Kombination', 'Ende', 'N [kN]', 'V<sub>y</sub> [kN]', 'V<sub>z</sub> [kN]',
                  'T [kNm]', 'M<sub>y</sub> [kNm]', 'M<sub>z</sub> [kNm]', 'σ [N/mm²]', 'η'],
    liste.map((z) => {
      const k = endkraefte(z) ?? {};
      return [esc(z.name), esc(z.bez ?? z.fall ?? ''), esc(z.ende ?? ''), zahl(k.N, 2), zahl(k.Vy, 2),
              zahl(k.Vz, 2), zahl(k.T, 3), zahl(k.My, 3), zahl(k.Mz, 3), zahl(z.sig, 1),
              `<b>${zahl(z.eta, 3)}</b>`];
    }), 'eng');
}

// --- Kapitel ---------------------------------------------------------------

const artText = (tw) => ({
  joch: 'Tragjoch', einzelmast: 'Einzelmast', abfangjoch: 'Abfangjoch',
  tragausleger: 'Mast mit Tragausleger' }[tw.art] ?? tw.artLabel ?? tw.art);

function deckblatt(d, U) {
  const b = d.blatt ?? {};
  const gut = U.eta !== null && !U.ueber && U.eta <= 1 + 1e-9;
  return `<section class="deckblatt">
    <p class="ueber">Statischer Nachweis · Stabwerk</p>
    <h1>${esc(b.name || 'Querprofil')}</h1>
    ${b.ort ? `<p class="ort">${esc(b.ort)}</p>` : ''}
    ${angaben([
      ['Tragwerke', esc((d.tragwerke ?? []).map((tw) => `${tw.pos} ${artText(tw)} (${tw.label})`).join(' · '))],
      ['Masten', esc((d.masten ?? []).map((m) => `${m.anzeige} ${m.profil ?? ''}`).join(' · '))],
      b.projektNr ? ['Projekt-Nr.', esc(b.projektNr)] : null,
      b.bearbeiter ? ['Bearbeiter', esc(b.bearbeiter)] : null,
      ['Datum', esc(b.datum || d.datum || '')],
      ['Programm', esc(d.fassung ?? '')],
      ['Rechenverfahren', 'räumliches Stabwerk, alle Tragwerke des Blattes in einem Modell'],
    ])}
    <div class="gesamturteil ${gut ? 'ok' : 'nok'}">
      <div class="gz">η = ${zahl(U.eta, 3)}</div>
      <div>${gut ? 'Tragsicherheit erfüllt' : 'Tragsicherheit NICHT erfüllt'}
        ${U.massgebend ? ` · massgebend: ${esc(U.massgebend.name)}` : ''}</div>
      ${d.nichtGefuehrt?.length ? `<div class="klein">${d.nichtGefuehrt.length} Nachweis(e) nicht geführt — siehe Kapitel {{K_NG}}</div>` : ''}
    </div>
    ${U.liste.length ? tabelle(['Bauteil', 'η', 'massgebende Kombination', 'Urteil'],
      U.liste.map((x) => [esc(x.name), zahl(x.eta, 3), esc(x.bez ?? x.fall ?? ''),
                          urteilMarke(x.eta, x.ueber)])) : ''}
  </section>`;
}

function grundlagen(d) {
  const w = d.blatt?.werte ?? {};
  const sw = d.sw;
  const optionen = FELDER.filter((f) => f.optionenDialog && f.gruppe !== 'ansicht'
    && w[f.key] !== undefined && !NUR_JOCH.includes(f.key));
  return `<section><h2>§ Grundlagen</h2>
    <h3>§.1 Normen</h3>
    <ul>
      <li>Werkstoff und Querschnitt: EN 1993-1-1 (Eurocode 3)</li>
      <li>Stabilität der Masten: SIA 263, Ziffer 5.1.10.1, Gleichung (50); das Kippen wird nicht geführt</li>
      <li>Fahrleitungen: EN 50119</li>
    </ul>
    <h3>§.2 Werkstoff und Beiwerte</h3>
    ${angaben([
      ['f<sub>yd</sub> = f<sub>y</sub> / γ<sub>M0</sub>', `${zahl(sw.fyd, 1)} N/mm²`],
      ['γ<sub>G</sub> · γ<sub>Q</sub> · ψ<sub>0</sub>', `${zahl(w.gammaG, 2)} · ${zahl(w.gammaQ, 2)} · ${zahl(w.psi0, 2)}`],
    ])}
    <h3>§.3 Rechenmodell</h3>
    <p>Alle Tragwerke des Blattes stehen in <b>einem räumlichen Stabwerk</b>
    (sechs Freiheitsgrade je Knoten, Schubverformung, Deviationsmoment der
    Winkel): Gurte, Bindebleche, Masten und Anbauteile als Stäbe, die
    Anschlüsse als Starrkörper und Linkelemente; ein Mast, an dem zwei
    Tragwerke hängen, ist <b>ein</b> Stab. Die Spannung wird an beiden
    Stabenden aus den Endkräften gerechnet - am Winkel über die
    Hauptachsen mit dem Deviationsmoment, sonst als N/A + M/W, an den
    Bindeblechen als Vergleichsspannung mit dem Schub. Seilanker tragen nur
    Zug (Ausfall über Hilfslastfälle). Die <b>Stabilität</b> der Masten
    (SIA 263, Gleichung 50) wird mit den Kräften aus diesem Stabwerk
    nachgewiesen. Anker und Fundament stehen auf den charakteristischen
    Fällen gegen zulässige Lasten.</p>
    ${angaben([
      ['Knoten · Stäbe · Freiheitsgrade', `${sw.knoten ?? '—'} · ${sw.staebe ?? '—'} · ${sw.freiheitsgrade ?? '—'}`],
      ['Nachweis-Kombinationen', String(sw.faelle ?? '—')],
    ])}
    <h3>§.4 Womit gerechnet wurde</h3>
    ${tabelle(['Einstellung', 'gewählt'], optionen.map((f) => [esc(f.label), esc(feldText(f, w))]))}
  </section>`;
}

function system(d) {
  const tws = (d.tragwerke ?? []).map((tw) => {
    const s = tw.satz ?? {};
    const zeilen = [
      ['Art', esc(artText(tw))],
      tw.art === 'abfangjoch' ? ['Typ · Länge', esc(`${s.abfangTyp ?? ''} · ${zahl(s.L, 2)} m`)] : null,
      tw.art === 'joch' ? ['Typ · Länge', esc(`${s.typ ?? ''} · ${zahl(s.L, 2)} m`)] : null,
      tw.art === 'joch' && tw.modell ? ['Bauhöhe · Gurte', esc(`${zahl(tw.modell.jd, 0)} mm · OG ${tw.modell.profOG?.name ?? ''} · UG ${tw.modell.profUG?.name ?? ''}`)] : null,
      tw.art === 'tragausleger' ? ['Ausleger', esc(`2 × UPE 140 · L = ${zahl(s.L, 2)} m · Seite ${s.auslegerSeite ?? 'rechts'}`)] : null,
      tw.art === 'tragausleger' ? ['Längsanker', s.laengsverankerung === false ? 'ohne' : 'am Kragarmende'] : null,
      ['Lage auf dem Querprofil', `${zahl(tw.x0, 2)} m`],
      tw.art !== 'einzelmast' ? ['Anschlusshöhe', `${zahl(s.mastH, 2)} m`] : null,
    ];
    return `<h3>§.${tw.nr} ${esc(tw.pos)} — ${esc(tw.label)}</h3>${angaben(zeilen)}`;
  }).join('');
  const masten = (d.masten ?? []).map((m) => [esc(m.anzeige), esc(m.profil ?? ''), zahl(m.laenge, 2),
    esc(m.steg ?? ''), zahl(m.x, 2), esc(m.traegt ?? ''), esc(m.ankerText ?? '—'), esc(m.fundamentTyp ?? '—')]);
  return `<section><h2>§ System</h2>
    ${tws}
    <h3>Masten</h3>
    ${tabelle(['Mast', 'Profil', 'Länge [m]', 'Stegrichtung', 'x [m]', 'trägt', 'Anker', 'Fundament'], masten)}
    ${d.opt.bilder.skizze ? bild(d.bilder?.skizze, 'Systemskizze') : ''}
  </section>`;
}

function einwirkungen(d) {
  const summe = (t, g, k) => t.kraefte?.[g]?.[k] ?? 0;
  const teile = (d.tragwerke ?? []).map((tw) => {
    const m = tw.modell ?? {};
    const at = [...(m.anbauteileFlach ?? []), ...(m.anbauMastFlach ?? [])]
      .filter((t) => t.aktiv !== false);
    const jochLasten = tw.art === 'joch' && m.char ? angaben([
      ['Eigengewicht g<sub>k</sub>', `${zahl(m.char.gk, 3)} kN/m`],
      ['Wind w<sub>k</sub>', `${zahl(m.char.wk, 3)} kN/m`],
      ['Schnee s<sub>k</sub>', `${zahl(m.char.sk, 3)} kN/m${m.schneeAktiv ? '' : ' (nicht angesetzt)'}`],
    ]) : '';
    return `<h3>§.${tw.nr} ${esc(tw.pos)} — ${esc(tw.label)}</h3>${jochLasten}
      ${at.length ? tabelle(['Bezeichnung', 'x [m]', 'y [m]', 'z [m]', 'G: F<sub>z</sub> ↑ [kN]',
        'Wind: F<sub>x</sub> [kN]', 'Wind: F<sub>y</sub> [kN]'],
        // F_z nach oben (rechte Hand, 1. Oktober): das Gewicht negativ.
        at.map((t) => [esc(t.name), zahl(t.x, 2), zahl(t.y, 2), zahl(t.z ?? t.hMast, 2),
          zahl(-summe(t, 'G', 'Fz'), 3), zahl(summe(t, 'WindX', 'Fx'), 3), zahl(summe(t, 'WindY', 'Fy'), 3)]), 'eng')
        : '<p>Keine Anbauteile.</p>'}`;
  }).join('');
  return `<section><h2>§ Einwirkungen (charakteristisch)</h2>
    <p>Je Tragwerk die Lasten am Träger und die Anbauteile, aufgelöst in ihre
    Angriffspunkte. Der Wind auf die Masten folgt der Lasttabelle des
    Profils; das Eigengewicht der Stäbe rechnet das Stabwerk aus A · ρ · g.</p>
    ${teile}
  </section>`;
}

function kombinationen(d) {
  const lf = (d.faelle ?? []);
  const gruppen = ['G', 'WindX', 'WindY', 'Schnee', 'HavarieX', 'HavarieY'];
  const ART = { charakteristisch: 'char.', tragsicherheit: 'Tragsicherheit',
                aussergewoehnlich: 'aussergew.', gebrauchstauglichkeit: 'Gebrauch' };
  const etaFall = new Map((d.sw.jeFall ?? []).map((f) => [f.key, f.hoechste?.eta ?? null]));
  return `<section><h2>§ Lastfälle und Kombinationen</h2>
    <p>Beiwerte je Einwirkungsgruppe, für das ganze Blatt dieselben. Die
    <b>Stäbe</b> werden mit den Fällen der Tragsicherheit und den
    aussergewöhnlichen nachgewiesen; <b>Anker und Fundament</b> stehen auf
    den charakteristischen und aussergewöhnlichen Fällen (zulässige Lasten,
    ohne Teilsicherheitsbeiwerte), die <b>Verformung</b> auf dem
    Betriebswind (ψ 0.70). Die letzte Spalte nennt das grösste η eines
    Stabes in der Kombination.</p>
    ${tabelle(['Nr.', 'Kombination', 'Art', ...gruppen.map((g) => g.replace('Havarie', 'Hav. ')), 'η max'],
      lf.map((l, i) => [`LF${i + 1}`, esc(l.bez), esc(ART[l.art] ?? l.art),
        ...gruppen.map((g) => zahl(l.beiwerte?.[g] ?? 0, 2)),
        etaFall.has(l.key) ? zahl(etaFall.get(l.key), 3) : '—']), 'eng')}
  </section>`;
}

function schnittgroessen(d) {
  const sw = d.sw;
  const huelleVon = (bauteil, teil) => Object.values(sw.jeStab ?? {})
    .filter((z) => z.bauteil === bauteil && z.teil === teil && z.huelle)
    .reduce((h, z) => ({ N: Math.max(h.N, z.huelle.N), V: Math.max(h.V, z.huelle.V),
                         M: Math.max(h.M, z.huelle.M), T: Math.max(h.T, z.huelle.T), n: h.n + 1 }),
            { N: 0, V: 0, M: 0, T: 0, n: 0 });
  const zeilen = [];
  (d.tragwerke ?? []).forEach((tw) => TEILE.forEach((teil) => {
    const h = huelleVon(tw.stabKey, teil);
    if (h.n) zeilen.push([esc(`${tw.pos} · ${TEIL_NAMEN[teil]}`), String(h.n), zahl(h.N, 2), zahl(h.V, 2), zahl(h.M, 3), zahl(h.T, 3)]);
  }));
  (d.masten ?? []).forEach((m) => {
    const h = huelleVon(`mast:${m.id}`, 'mast');
    if (h.n) zeilen.push([esc(`Mast ${m.anzeige}`), String(h.n), zahl(h.N, 2), zahl(h.V, 2), zahl(h.M, 3), zahl(h.T, 3)]);
  });
  return `<section><h2>§ Schnittgrössen (Stabwerk, Hülle der Bemessung)</h2>
    <p>Je Teil die grössten Beträge über alle Stäbe, beide Enden und alle
    Nachweis-Kombinationen; V und M je das Grössere der beiden
    Querrichtungen. Welche Kombination sie gibt, steht je Stab in der
    Stabliste der Nachweise.</p>
    ${tabelle(['Teil', 'Stäbe', '|N| [kN]', '|V| [kN]', '|M| [kNm]', '|T| [kNm]'], zeilen)}
    ${d.opt.bilder.verlaeufe ? bild(d.bilder?.verlaeufe, 'Verläufe aus dem Stabwerk') : ''}
    ${d.opt.bilder.eta ? bild(d.bilder?.eta, 'Ausnutzung aus dem Stabwerk') : ''}
  </section>`;
}

function teilAbschnitt(d, titel, bauteil, teil) {
  const t = d.sw.teile?.[`${bauteil}|${teil}`];
  if (!t) return '';
  return `<h4>${esc(titel)} — η = ${zahl(t.eta, 3)}</h4>
    ${stabFormelHtml(t, d.sw.fyd)}
    <p class="klein">Die zehn höchstbeanspruchten Stäbe, je in ihrer massgebenden Kombination:</p>
    ${stabTabelle(stabListe(d.sw, bauteil, teil))}`;
}

function nachweise(d, U) {
  const sw = d.sw;
  let nr = 0;
  const h3 = (t) => `<h3>§.${++nr} ${t}</h3>`;
  const tw = (d.tragwerke ?? []).map((t) => {
    const teile = TEILE.map((teil) => teilAbschnitt(d, `${t.pos} · ${TEIL_NAMEN[teil]}`, t.stabKey, teil)).join('');
    const a = t.art === 'tragausleger' ? sw.ausleger?.aufhaengung : null;
    const la = t.art === 'tragausleger' ? sw.ausleger?.laengsanker : null;
    const auf = a ? `<h4>${esc(t.pos)} · Aufhängung — η = ${zahl(a.eta, 3)}</h4>
      <p>Senkrechter Anteil der Seilkräfte (${a.seile ?? 1} Seil${(a.seile ?? 1) > 1 ? 'e' : ''}),
      charakteristisch über die wirklichen Zustände, gegen den Kontrollwert der Zeichnung.</p>
      ${formel('η', 'S<sub>v</sub> / V<sub>zul</sub>', `${zahl(a.Sv, 3)} kN / ${zahl(a.Vzul, 2)} kN`, zahl(a.eta, 3))}
      <p class="klein">Massgebend: ${esc(a.bez ?? a.fall ?? '')}.${a.druck ? ` ⚠ Ein Seil wird gedrückt: ${zahl(a.druck.N, 2)} kN in «${esc(a.druck.bez ?? '')}».` : ''}</p>
      <p>${urteilMarke(a.eta, a.ueber)}</p>` : '';
    const lang = la?.charakteristisch ? `<h4>${esc(t.pos)} · Längsanker (Auskunft)</h4>
      <p>Seilkraft charakteristisch ${zahl(Math.abs(la.charakteristisch.F), 2)} kN
      (${esc(la.charakteristisch.seite ?? '')}, ${esc(la.charakteristisch.bez ?? '')}),
      Bemessung ${zahl(Math.abs(la.bemessung?.F ?? 0), 2)} kN. Kein Widerstand im Sortiment.</p>` : '';
    if (!teile && !auf) return '';
    return `${h3(`${esc(t.pos)} — ${esc(t.label)}`)}${teile}${auf}${lang}`;
  }).join('');
  const masten = (d.masten ?? []).map((m) => {
    const q = teilAbschnitt(d, `Mast ${m.anzeige} · Querschnitt`, `mast:${m.id}`, 'mast');
    const k = m.knick ? `<h4>Mast ${esc(m.anzeige)} · Knicken — η = ${zahl(m.knick.eta, 3)}</h4>
      <p class="klein">Kombination ${esc(m.knick.bez ?? m.knick.fall ?? '')}; Kräfte aus dem Stabwerk.</p>
      ${knickHtml(m.knick)}<p>${urteilMarke(m.knick.eta)}</p>` : '';
    if (!q && !k) return '';
    return `${h3(`Mast ${esc(m.anzeige)} — ${esc(m.profil ?? '')}`)}${q}${k}`;
  }).join('');
  const anker = (d.masten ?? []).filter((m) => m.anker?.nachweis).map((m) => {
    const a = m.anker.nachweis;
    return [esc(`${a.typ ?? 'Anker'} ${m.anzeige}`), zahl(a.N, 2), zahl(a.zul, 1), zahl(a.L, 2),
            esc(a.text ?? ''), a.eta === null ? '—' : zahl(a.eta, 3), esc(m.anker.bez ?? ''),
            a.grund === 'schlaff' ? '<span class="marke offen">schlaff</span>' : urteilMarke(a.eta, a.lieferbar === false)];
  });
  const ankerBlock = anker.length ? `${h3('Zuganker und Druckstützen')}
    <p>Charakteristische Kraft aus dem Stabwerk gegen die zulässige Kraft des Bemessungsblatts.</p>
    ${tabelle(['Bauteil', 'N<sub>k</sub> [kN]', 'zul [kN]', 'L [m]', 'Grundlage', 'η', 'massgebender Lastfall', ''], anker)}` : '';
  const fund = (d.masten ?? []).filter((m) => m.fundament?.nachweise?.length || m.fundament?.fehlt)
    .map((m) => (m.fundament.fehlt
      ? `<p><b>Mast ${esc(m.anzeige)}:</b> für ${esc(m.fundament.profil ?? 'dieses Profil')} führt das Sortiment kein Standardfundament — Sonderfundament, nicht nachgewiesen.</p>`
      : fundamentHtml(m.fundament, m.anzeige, m.id,
          (d.opt.bilder.fundament && d.bilder?.fundament?.[m.id])
            ? bild(d.bilder.fundament[m.id], `Mastfundament ${m.anzeige} — η je Nachweis`) : ''))).join('');
  const fundBlock = fund ? `${h3('Mastfundamente')}${FUNDAMENT_TEXT}${fund}` : '';
  const uebersicht = (d.opt.bilder.bauteile && d.bilder?.bauteile)
    ? bild(d.bilder.bauteile, 'Ausnutzung je Bauteil — Tragsicherheit, η = 1.00 als Marke') : '';
  return `<section><h2>§ Nachweise</h2>
    ${uebersicht}
    <p>f<sub>yd</sub> = ${zahl(sw.fyd, 2)} N/mm². Je Bauteil der massgebende
    Stab mit den Endkräften seiner massgebenden Kombination und der
    eingesetzten Spannungsformel; darunter die zehn höchstbeanspruchten
    Stäbe des Teils. Das Urteil des Blattes: η = <b>${zahl(U.eta, 3)}</b>${
      U.massgebend ? ` (${esc(U.massgebend.name)})` : ''}.</p>
    ${tw}${masten}${ankerBlock}${fundBlock}
  </section>`;
}

function gebrauch(d) {
  const eintraege = (d.tragwerke ?? []).map((tw) => ({ v: tw.verformung, namen: tw.namen ?? {} }));
  return gebrauchKapitel(eintraege,
    (d.opt.bilder.verformung && d.bilder?.verformung)
      ? bild(d.bilder.verformung, 'Verformung über die Masthöhe') : '',
    d.anzeige ?? ((x) => x), 'stabwerk');
}

function pruefungen(d) {
  const bloecke = (d.tragwerke ?? []).filter((tw) => tw.checks?.length).map((tw) =>
    `<h3>§.${tw.nr} ${esc(tw.pos)} — ${esc(tw.label)}</h3>
    ${tabelle(['Nr.', 'Prüfung', 'vorhanden', '', 'verlangt', 'Einheit', 'Befund'],
      tw.checks.map((c) => [esc(c.id), esc(c.text), zahl(c.vorhanden, ['mm', 'Stk'].includes(c.einheit) ? 0 : 2),
        esc(c.richtung ?? ''), zahl(c.erforderlich, ['mm', 'Stk'].includes(c.einheit) ? 0 : 2), esc(c.einheit ?? ''),
        `<span class="marke ${c.ok ? 'ok' : (c.warnungNichtFehler ? 'offen' : 'nok')}">${esc(c.status ?? '')}</span>`]), 'eng')}`).join('');
  return bloecke ? `<section><h2>§ Konstruktionsprüfungen</h2>${bloecke}</section>` : '';
}

function nichtGefuehrt(d) {
  const ng = d.nichtGefuehrt ?? [];
  const hw = (d.tragwerke ?? []).flatMap((tw) => (tw.hinweise ?? []).map((h) => `${tw.pos}: ${h}`));
  return `<section><h2>§ Nicht geführte Nachweise und Gültigkeit</h2>
    ${ng.length ? tabelle(['Nachweis', 'Was fehlt', 'Grund'], ng.map((g) =>
      [esc(g.titel), esc(g.was ?? ''), g.grund === 'ausgeschaltet' ? 'in der Eingabe ausgeschaltet' : 'im Werkzeug nicht enthalten']))
      : '<p>Alle Nachweisgruppen werden geführt.</p>'}
    ${hw.length ? `<h3>Hinweise zur Gültigkeit</h3><ul>${hw.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
  </section>`;
}

function auflager(d) {
  // Die Zeilen des Reiters (Name mit Mastnummer, Fundamenttyp, Anker).
  const z = d.reaktionen ?? d.sw.reaktionen ?? [];
  if (!z.length) return '';
  return `<section><h2>§ Reaktionskräfte (charakteristisch)</h2>
    <p>Je Auflager des Blattes die charakteristischen Kräfte aus dem
    Stabwerk, Wind ohne ψ 0.70, Druck positiv, Havarie in eigener Zeile -
    dieselbe Tabelle wie im Reiter Auflager und auf dem Blatt der
    Reaktionskräfte.</p>
    ${reaktionenTabelleHtml({ zeilen: z })}
  </section>`;
}

function anhang(d) {
  const o = d.opt;
  if (o.umfang === 'massgebend') return '';
  const sw = d.sw;
  const rollen = [...new Set((sw.jeFall ?? []).flatMap((f) => Object.keys(f.gruppen ?? {})))];
  const ROLLE = { gurt: 'Gurt (Winkel)', gurtU: 'Gurt UPE', blech: 'Bindeblech', mast: 'Mast' };
  const a1 = tabelle(['Kombination', ...rollen.map((r) => `η ${ROLLE[r] ?? r}`)],
    (sw.jeFall ?? []).map((f) => [esc(f.bez ?? f.key), ...rollen.map((r) => zahl(f.gruppen?.[r]?.eta, 3))]), 'eng');
  const alle = Object.values(sw.jeStab ?? {}).filter((z) => Number.isFinite(z.eta))
    .sort((a, b) => b.eta - a.eta);
  const liste = o.umfang === 'vollstaendig' ? alle : alle.filter((z) => z.eta >= 0.5).slice(0, 200);
  return `<section class="anhang"><h2>Anhang</h2>
    <h3>A1 η je Kombination und Stabart</h3>${a1}
    <h3>A2 ${o.umfang === 'vollstaendig' ? 'Alle nachgewiesenen Stäbe' : 'Stäbe mit η ≥ 0.50 (höchstens 200)'}</h3>
    ${liste.length ? stabTabelle(liste) : '<p>Kein Stab mit η ≥ 0.50.</p>'}
  </section>`;
}

function nummeriert(d) {
  const U = blattUrteil(d);
  const teile = [
    ['uebersicht', d.opt.bilder.modell3d && d.bilder?.modell3d
      ? `<section><h2>§ Übersicht</h2>${bild(d.bilder.modell3d, '3D-Ansicht mit Ausnutzung')}</section>` : ''],
    ['grundlagen', grundlagen(d)], ['system', system(d)], ['einwirkungen', einwirkungen(d)],
    ['kombinationen', kombinationen(d)], ['schnittgroessen', schnittgroessen(d)],
    ['nachweise', nachweise(d, U)], ['gebrauch', gebrauch(d)], ['pruefungen', pruefungen(d)],
    ['nichtGefuehrt', nichtGefuehrt(d)], ['auflager', auflager(d)],
  ].filter(([, html]) => html);
  const nr = {};
  const kapitel = teile.map(([key, html], i) => {
    nr[key] = i + 1;
    return html.replace(/<h2>§ /g, `<h2>${i + 1} `).replace(/<h3>§\./g, `<h3>${i + 1}.`);
  });
  const deck = deckblatt(d, U).replace('{{K_NG}}', String(nr.nichtGefuehrt ?? '—'));
  return [deck, ...kapitel, anhang(d)].join('\n');
}

/**
 * Der Bericht des Blattes als eigenständiges HTML-Dokument.
 *
 * @param {object} d  { blatt: {name, ort, projektNr, bearbeiter, datum, werte},
 *                      sw (Ergebnis von rechneStabwerk, mit `roh.faelle`),
 *                      faelle, tragwerke: [{id, pos, label, art, nr, x0, satz,
 *                      modell, stabKey, checks, hinweise, verformung, namen}],
 *                      masten: [{id, anzeige, profil, laenge, steg, x, traegt,
 *                      ankerText, fundamentTyp, knick, fundament, anker}],
 *                      nichtGefuehrt, anzeige, fassung, datum, bilder, stil }
 * @param {object} opt { umfang, bilder } - wie beim Bericht des Ersatzbalkens
 */
export function stabwerkBericht(d, opt = berichtVorgabe()) {
  if (!d?.sw || d.sw.fehler || d.sw.ohneModell) {
    throw new Error('Der Bericht braucht ein gültig gerechnetes Stabwerk.');
  }
  const o = { ...berichtVorgabe(), ...opt,
              bilder: { ...berichtVorgabe().bilder, ...(opt?.bilder ?? {}) } };
  const dd = { ...d, opt: o };
  const titel = `Nachweis ${d.blatt?.name || ''} ${d.blatt?.ort || ''}`.trim();
  return `<!DOCTYPE html><html lang="de-CH"><head><meta charset="utf-8">
<title>${esc(titel)}</title><style>${FARBEN_DRUCK}${d.stil ?? ''}${STIL}</style></head><body>
<div class="blatt">
${nummeriert(dd)}
</div></body></html>`;
}
