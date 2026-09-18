/**
 * export.nachweisbericht.js
 * ---------------------------------------------------------------------------
 * DER PRUEFFAEHIGE NACHWEISBERICHT - A4-Seiten, im Browser als PDF gedruckt.
 *
 * Weisung vom 18. September: Druckbericht -> PDF, Hauptteil mit Anhang,
 * «die bilder ausschaltbar und den umfang der nachweise einstellbar
 * machen», zuerst das Tragjoch mit Masten.
 *
 * >>> DER BERICHT RECHNET NICHTS. <<<
 *
 * Jede Zahl ist eine, die der Rechenkern schon geliefert hat: die Kette
 * Gurtkraft -> Teilspannungen -> sigma -> eta an der Station, das Blech mit
 * sigma, tau und sigma_v, der Mast mit Gleichung (50) aus N_cr, chi, omega.
 * Der Bericht setzt sie in die Formel ein und schreibt sie hin. Eine zweite
 * Rechnung hier waere ein zweiter Ort, an dem dieselbe Zahl entsteht - und
 * der Tag kaeme, an dem beide auseinanderlaufen. Der Pruefstand rechnet die
 * eingesetzten Formeln nach und haelt sie gegen die Zahl daneben.
 *
 * Rein bis auf nichts: kein DOM, kein Fenster. Die Bilder reicht app.js als
 * fertiges SVG bzw. Bild-URL herein; hier werden sie nur eingebettet.
 * ---------------------------------------------------------------------------
 */

import { verortung, tragwerksart } from './core.constants.js';
import { NACHWEISGRUPPEN } from './core.checks.js';
import { FELDER } from './ui.schema.js';

/** Wie ausfuehrlich die Nachweise stehen. */
export const UMFAENGE = [
  { key: 'massgebend', label: 'Nur massgebend',
    text: 'Je Bauteil der massgebende Nachweis mit Formel und Zwischenwerten, ohne Anhang.' },
  { key: 'anhang', label: 'Hauptteil und Anhang',
    text: 'Dazu im Anhang: η je Kombination, die Stationen der Umhüllenden und die Mastfusskräfte.' },
  { key: 'vollstaendig', label: 'Vollständig',
    text: 'Dazu je Nachweiskombination alle Stationen des Jochs.' },
];

/** Die Bilder, jedes einzeln abschaltbar. */
export const BILDER = [
  { key: 'skizze', label: 'Systemskizze' },
  { key: 'verlaeufe', label: 'Schnittgrössenverläufe' },
  { key: 'modell3d', label: '3D-Ansicht' },
  { key: 'eta', label: 'Ausnutzungsverlauf' },
];

/** Tragwerksarten, die diese Fassung des Berichts abdeckt. */
// Das Abfangjoch bleibt draussen (Weisung vom 18. September: «den
// abfangjoch weglassen»), der Tragausleger folgt nach seiner Modellfrage.
export const BERICHT_ARTEN = ['joch', 'einzelmast'];

export function berichtVorgabe() {
  return { umfang: 'anhang',
           bilder: Object.fromEntries(BILDER.map((b) => [b.key, true])) };
}

// --- Satz ------------------------------------------------------------------

const esc = (s) => String(s ?? '').replace(/[&<>"]/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Zahl mit festen Stellen, echtes Minuszeichen, Strich fuer «fehlt». */
export function zahl(v, n = 2) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  const t = Number(v).toFixed(n);
  return t.startsWith('-') && Number(t) !== 0 ? `−${t.slice(1)}` : t.replace(/^-/, '');
}

const tabelle = (kopf, zeilen, klasse = '') => `
  <table class="${klasse}"><thead><tr>${kopf.map((k) => `<th>${k}</th>`).join('')}</tr></thead>
  <tbody>${zeilen.map((z) => `<tr>${z.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

/** Zweispaltige Angabentabelle: Bezeichnung | Wert. */
const angaben = (paare) => `<table class="angaben"><tbody>${paare
  .filter(Boolean)
  .map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</tbody></table>`;

/**
 * Eine Formelzeile: Symbol = Formel = eingesetzt = Ergebnis Einheit.
 * Alles schon gesetzt; hier nur die Anordnung.
 */
const formel = (sym, form, eingesetzt, erg, einheit = '') =>
  `<div class="formel"><span class="sym">${sym}</span> = <span class="form">${form}</span>`
  + (eingesetzt ? ` = <span class="ein">${eingesetzt}</span>` : '')
  + ` = <b>${erg}</b>${einheit ? ` ${einheit}` : ''}</div>`;

const urteilMarke = (eta, ueber = false) => {
  if (eta === null || eta === undefined) return '<span class="marke offen">ohne η</span>';
  const ok = !ueber && eta <= 1 + 1e-9;
  return `<span class="marke ${ok ? 'ok' : 'nok'}">${ok ? 'erfüllt' : 'NICHT erfüllt'}</span>`;
};

const bild = (inhalt, titel) => inhalt
  ? `<figure>${String(inhalt).startsWith('<') ? inhalt
      : `<img src="${esc(inhalt)}" alt="${esc(titel)}">`}<figcaption>${esc(titel)}</figcaption></figure>`
  : '';

// --- Kapitel ---------------------------------------------------------------

/** Einzelmast: kein Joch, nur der Mast und sein Anker. */
const istMast = (d) => tragwerksart(d.werte).key === 'einzelmast';

/*
 * Die Rechenoptionen, die nur den Traeger betreffen - beim Einzelmast stehen
 * sie nicht im Bericht, weil nichts mit ihnen gerechnet wird.
 */
const NUR_JOCH = ['massVariante', 'ausrOG', 'ausrUG', 'blechQuelle', 'lastHerkunft',
  'auflagerVorgabe', 'torsionModell', 'torsionsverteilung', 'gurtaufteilung',
  'knotenbereich', 'endfeldZuschlag', 'schiefeBiegung', 'spannungsmodell',
  'ebenenUeberlagerung'];

/** Bezeichnung einer Kombination aus ihrem Schluessel. */
const fallText = (kombi, k) => (kombi?.lastfaelle ?? []).find((l) => l.key === k)?.bez ?? k ?? '—';

function deckblatt(d) {
  const { werte, urteil, fassung, datum } = d;
  const bt = urteil?.bauteile;
  const art = tragwerksart(werte);
  const ort = verortung(werte);
  return `<section class="deckblatt">
    <p class="ueber">Statischer Nachweis</p>
    <h1>${esc(werte.name || art.label)}</h1>
    ${ort ? `<p class="ort">${esc(ort)}</p>` : ''}
    ${angaben([
      ['Tragwerksart', esc(art.label)],
      ['Tragwerk', istMast(d)
        ? esc(`${d.erg.mast?.A?.profil?.name ?? ''} · Länge ${zahl(d.erg.mast?.A?.laenge, 2)} m`)
        : esc(`${werte.typ ?? ''} · L = ${zahl(werte.L, 2)} m`)],
      werte.projektNr ? ['Projekt-Nr.', esc(werte.projektNr)] : null,
      werte.bearbeiter ? ['Bearbeiter', esc(werte.bearbeiter)] : null,
      ['Datum', esc(werte.datum || datum || '')],
      ['Programm', esc(fassung ?? '')],
    ])}
    <div class="gesamturteil ${bt && !bt.ueber && bt.eta <= 1 ? 'ok' : 'nok'}">
      <div class="gz">η = ${zahl(bt?.eta, 3)}</div>
      <div>${bt && !bt.ueber && bt.eta <= 1 ? 'Tragsicherheit erfüllt' : 'Tragsicherheit NICHT erfüllt'}
        ${bt?.massgebend ? ` · massgebend: ${esc(bt.massgebend.name)}` : ''}</div>
      ${urteil?.anzahlVerletzt ? `<div class="klein">${urteil.anzahlVerletzt} Konstruktionsprüfung(en) verletzt — siehe Kapitel {{K_PRUEF}}</div>` : ''}
      ${urteil?.nichtGefuehrt?.length ? `<div class="klein">${urteil.nichtGefuehrt.length} Nachweis(e) nicht geführt — siehe Kapitel {{K_NG}}</div>` : ''}
    </div>
    ${bt?.liste?.length ? tabelle(['Bauteil', 'η', 'Urteil'],
      bt.liste.map((x) => [esc(x.name), zahl(x.eta, 3), urteilMarke(x.eta, x.ueber)])) : ''}
  </section>`;
}

/** Wert einer Eingabe so, wie ihn die Maske anschreibt. */
function feldText(f, werte) {
  const v = werte[f.key];
  if (f.typ === 'auswahl') {
    const liste = f.optionen ?? f.optionenAus?.(werte) ?? [];
    return liste.find((o) => o.wert === v)?.text ?? String(v ?? '—');
  }
  if (f.typ === 'schalter') return v ? 'ja' : 'nein';
  const einheit = f.einheit && f.einheit !== '–' ? ` ${f.einheit}` : '';
  return `${typeof v === 'number' ? v : (v ?? '—')}${einheit}`;
}

function grundlagen(d) {
  const { werte, erg } = d;
  const m = erg.modell;
  // Nur was die Rechnung beruehrt - die Anzeigeoptionen (Gruppe «ansicht»)
  // gehoeren nicht in einen Nachweis.
  const optionen = FELDER.filter((f) => f.optionenDialog && f.gruppe !== 'ansicht'
                                     && werte[f.key] !== undefined
                                     && !(istMast(d) && NUR_JOCH.includes(f.key)));
  return `<section><h2>§ Grundlagen</h2>
    <h3>§.1 Normen</h3>
    <ul>
      <li>Werkstoff und Querschnitt: EN 1993-1-1 (Eurocode 3)</li>
      <li>Stabilität der Masten: SIA 263, Ziffer 5.1.10.1, Gleichung (50); das Kippen wird nicht geführt</li>
      <li>Fahrleitungen: EN 50119</li>
    </ul>
    <h3>§.2 Werkstoff und Beiwerte</h3>
    ${angaben([
      ['Stahl', `${esc(m.stahl?.name)} · f<sub>y</sub> = ${zahl(m.stahl?.fy, 0)} N/mm²`],
      ['γ<sub>M0</sub>', zahl(m.gammaM0, 2)],
      ['f<sub>yd</sub> = f<sub>y</sub> / γ<sub>M0</sub>', `${zahl(m.stahl?.fy, 0)} / ${zahl(m.gammaM0, 2)} = ${zahl(m.stahl?.fy / m.gammaM0, 1)} N/mm²`],
      ['γ<sub>G</sub> · γ<sub>Q</sub> · ψ<sub>0</sub>', `${zahl(werte.gammaG, 2)} · ${zahl(werte.gammaQ, 2)} · ${zahl(werte.psi0, 2)}`],
    ])}
    <h3>§.3 Rechenmodell</h3>
    ${istMast(d) ? `<p>Der Mast wird als Kragarm im Fundament gerechnet. Er trägt
    seinen Wind über die ganze Länge und die Anbauteile auf ihrer eigenen
    Befestigungshöhe; ein Zuganker oder eine Druckstütze wirkt als
    Normalkraftstab, ein Seilanker nur auf Zug. Die Herleitung steht im
    Handbuch der Anwendung.</p>` : `<p>Das Joch wird als Ersatzbalken gerechnet; die Schnittgrössen werden über
    die Hebelarme h und b auf die vier Winkelgurte und die Bindebleche
    aufgeteilt (Vierendeelwirkung). Die Masten werden mit den Auflagerkräften
    des Jochs, ihrem Wind und ihren Anbauteilen nachgewiesen. Die Herleitung
    steht im Handbuch der Anwendung.</p>`}
    <h3>§.4 Womit gerechnet wurde</h3>
    ${tabelle(['Einstellung', 'gewählt'], optionen.map((f) => [esc(f.label), esc(feldText(f, werte))]))}
  </section>`;
}

/** Bleche einer Ebene zaehlen: Position -> Anzahl und Abmessung. */
function blechUebersicht(stationen, ebene) {
  const z = new Map();
  (stationen ?? []).forEach((s) => {
    const b = s[ebene];
    if (!b?.breite) return;
    const k = String(b.pos);
    const e = z.get(k) ?? { ...b, n: 0 };
    e.n += 1;
    z.set(k, e);
  });
  return [...z.values()];
}

function system(d) {
  const { erg, bilder, opt } = d;
  const m = erg.modell;
  const namen = m.federn?.namen ?? {};
  const mastZeilen = ['A', 'B'].map((e) => {
    const n = erg.mast?.[e];
    if (!n) return null;
    return [esc(namen[e] ? `Mast ${namen[e]}` : `Mast ${e}`), esc(n.profil?.name),
            zahl(n.laenge, 2), zahl(n.H, 2), esc(n.stegrichtung?.label ?? ''),
            n.anker ? esc(n.anker.typ ?? 'ja') : '—'];
  }).filter(Boolean);
  const bl = (ebene) => blechUebersicht(m.stationsListe, ebene)
    .map((b) => [esc(b.pos), `${zahl(b.breite, 0)} × ${zahl(b.dicke, 0)}${b.laenge ? ` × ${zahl(b.laenge, 0)}` : ''}`, String(b.n)]);
  if (istMast(d)) {
    const n = erg.mast?.A;
    const a = n?.anker;
    return `<section><h2>§ System</h2>
    <h3>§.1 Mast</h3>
    ${n ? angaben([
      ['Profil', `${esc(n.profil?.name)} · A = ${zahl(n.A, 1)} cm² · W<sub>quer</sub> = ${zahl(n.Wq, 1)} cm³ · W<sub>längs</sub> = ${zahl(n.Wl, 1)} cm³`],
      ['Länge (Fuss bis Kopf)', `${zahl(n.laenge, 2)} m`],
      ['Stegrichtung', esc(n.stegrichtung?.label ?? '')],
      ['Lagerung', 'im Fundament eingespannt, Kopf frei'],
      a ? ['Anker', esc(`${a.typ ?? ''}${a.richtung ? ` · Ebene ${a.richtung}` : ''}${a.seite ? ` · Seite ${a.seite}` : ''}`
        + `${Number.isFinite(a.h) ? ` · Anschluss ${zahl(a.h, 2)} m` : ''}${Number.isFinite(a.a) ? ` · Abstand ${zahl(a.a, 2)} m` : ''}`)] : null,
    ]) : '<p>Kein Mast im Modell.</p>'}
    ${opt.bilder.skizze ? bild(bilder?.skizze, 'Systemskizze') : ''}
  </section>`;
  }
  return `<section><h2>§ System</h2>
    <h3>§.1 Joch</h3>
    ${angaben([
      ['Typ', `${esc(m.typ ?? '')} · Blechangaben aus ${m.blechQuelle === 'datenbank' ? 'der Typendatenbank' : 'Ersatzwerten'}`],
      ['Länge L', `${zahl(m.L, 2)} m`],
      ['Bauhöhe jd', `${zahl(m.jd, 0)} mm`],
      ['Hebelarme h · b', `${zahl(m.h * 1000, 1)} mm · ${zahl(m.b * 1000, 1)} mm (${esc(m.massVariante ?? '')})`],
      ['Endfeld a<sub>1</sub>', `${zahl(m.a1, 3)} m`],
      ['Obergurt', `${esc(m.profOG?.name)} · A = ${zahl(m.profOG?.A, 2)} cm² · W = ${zahl(m.profOG?.Wy, 2)} cm³`],
      ['Untergurt', `${esc(m.profUG?.name)} · A = ${zahl(m.profUG?.A, 2)} cm² · W = ${zahl(m.profUG?.Wy, 2)} cm³`],
      ['Stationen', String(m.stationsListe?.length ?? '—')],
    ])}
    <h3>§.2 Bindebleche</h3>
    <p>Stehende Bleche (Seitenebenen), je Ebene:</p>
    ${tabelle(['Pos.', 'b × t × l [mm]', 'Anzahl'], bl('vertikal'))}
    <p>Liegende Bleche (Gurtebenen), je Ebene:</p>
    ${tabelle(['Pos.', 'b × t × l [mm]', 'Anzahl'], bl('horizontal'))}
    <h3>§.3 Masten und Lagerung</h3>
    ${mastZeilen.length ? tabelle(['Mast', 'Profil', 'Länge [m]', 'Anschluss H [m]', 'Stegrichtung', 'Anker'], mastZeilen) : '<p>Ohne Masten gerechnet.</p>'}
    ${opt.bilder.skizze ? bild(bilder?.skizze, 'Systemskizze') : ''}
  </section>`;
}

function einwirkungen(d) {
  const { erg, kombi } = d;
  const m = erg.modell;
  const at = (m.anbauteileFlach ?? []).filter((t) => t.aktiv !== false);
  const summe = (t, g, k) => t.kraefte?.[g]?.[k] ?? 0;
  if (istMast(d)) {
    const n = erg.mast?.A;
    const am = (m.anbauMastFlach ?? []).filter((t) => t.aktiv !== false);
    return `<section><h2>§ Einwirkungen</h2>
    <h3>§.1 Wind auf den Masten</h3>
    ${angaben([
      ['quer zum Gleis (in x)', `${zahl(Math.abs(n?.wQuer ?? 0), 3)} kN/m`],
      ['in Gleisrichtung (in y)', `${zahl(Math.abs(n?.wLaengs ?? 0), 3)} kN/m`],
    ])}
    <p class="klein">Bemessungswerte der massgebenden Kombination, über die ganze Mastlänge.</p>
    <h3>§.2 Anbauteile am Masten (charakteristisch)</h3>
    ${am.length ? tabelle(['Bezeichnung', 'Höhe [m]', 'Ausladung [m]', 'G: F<sub>z</sub> [kN]',
      'Wind: F<sub>x</sub> [kN]', 'Wind: F<sub>y</sub> [kN]'],
      am.map((t) => [esc(t.name), zahl(t.hMast, 2), zahl(t.x, 2), zahl(summe(t, 'G', 'Fz'), 3),
        zahl(summe(t, 'WindX', 'Fx'), 3), zahl(summe(t, 'WindY', 'Fy'), 3)]), 'eng')
      : '<p>Keine Anbauteile am Masten.</p>'}
  </section>`;
  }
  return `<section><h2>§ Einwirkungen</h2>
    <h3>§.1 Einwirkungsgruppen</h3>
    ${tabelle(['Gruppe', 'Wert', 'Bemerkung'], (kombi?.einwirkungen ?? []).map((e) =>
      [esc(e.label), `${zahl(e.wert, 3)} ${esc(e.einheit ?? '')}`, esc(e.bemerkung ?? '')]))}
    <h3>§.2 Lasten am Joch (charakteristisch)</h3>
    ${angaben([
      ['Eigengewicht g<sub>k</sub>', `${zahl(m.char?.gk, 3)} kN/m`],
      ['Wind w<sub>k</sub>', `${zahl(m.char?.wk, 3)} kN/m`],
      ['Schnee s<sub>k</sub>', `${zahl(m.char?.sk, 3)} kN/m${m.schneeAktiv ? '' : ' (nicht angesetzt)'}`],
    ])}
    <h3>§.3 Anbauteile, aufgelöst (charakteristisch)</h3>
    ${at.length ? tabelle(['Bezeichnung', 'x [m]', 'y [m]', 'z [m]', 'G: F<sub>z</sub> [kN]', 'G: F<sub>y</sub> [kN]', 'Wind: F<sub>y</sub> [kN]'],
      at.map((t) => [esc(t.name), zahl(t.x, 2), zahl(t.y, 2), zahl(t.z, 2),
        zahl(summe(t, 'G', 'Fz'), 3), zahl(summe(t, 'G', 'Fy'), 3), zahl(summe(t, 'WindY', 'Fy'), 3)]), 'eng')
      : '<p>Keine Anbauteile am Joch.</p>'}
  </section>`;
}

function kombinationen(d) {
  const lf = d.kombi?.lastfaelle ?? [];
  const gruppen = ['G', 'WindX', 'WindY', 'Schnee', 'HavarieX', 'HavarieY'];
  const ART = { charakteristisch: 'char.', tragsicherheit: 'Tragsicherheit',
                aussergewoehnlich: 'aussergew.', gebrauchstauglichkeit: 'Gebrauch' };
  return `<section><h2>§ Lastfälle und Kombinationen</h2>
    <p>Beiwerte je Einwirkungsgruppe. Nachgewiesen wird mit den Fällen der
    Tragsicherheit und den aussergewöhnlichen; die Umhüllende über diese ist
    die Grundlage des Urteils. Massgebend für ${istMast(d) ? 'den Mast' : 'das Joch'}:
    <b>${esc(istMast(d) ? fallText(d.kombi, d.erg.mast?.A?.fall)
                        : fallText(d.kombi, d.kombi?.massgebend))}</b>.</p>
    ${tabelle(['Nr.', 'Kombination', 'Art', ...gruppen.map((g) => g.replace('Havarie', 'Hav. ')),
               istMast(d) ? 'η Mast' : 'η Joch'],
      lf.map((l, i) => [`LF${i + 1}`, esc(l.bez), esc(ART[l.art] ?? l.art),
        ...gruppen.map((g) => zahl(l.beiwerte?.[g] ?? 0, 2)),
        l.nachweis ? `<b>${zahl(l.eta, 3)}</b>` : zahl(l.eta, 3)]), 'eng')}
  </section>`;
}

function schnittgroessen(d) {
  const { erg, bilder, opt } = d;
  const x = erg.extrem ?? {};
  if (istMast(d)) {
    const n = erg.mast?.A;
    return `<section><h2>§ Schnittgrössen am Masten (massgebende Kombination)</h2>
    <p>Kombination ${esc(fallText(d.kombi, n?.fall))}; z ab Fundament, globale Achsen.</p>
    ${mastStationen(n)}
    ${opt.bilder.verlaeufe ? bild(bilder?.verlaeufe, 'Schnittgrössen über die Masthöhe') : ''}
    ${opt.bilder.eta ? bild(bilder?.eta, 'Ausnutzung über die Masthöhe') : ''}
  </section>`;
  }
  return `<section><h2>§ Schnittgrössen (Umhüllende, Bemessung)</h2>
    ${tabelle(['Grösse', 'Grösstwert', 'bei x [m]'], [
      ['M<sub>y</sub> max [kNm]', zahl(x.MyMax, 2), zahl(x.xMyMax, 2)],
      ['M<sub>y</sub> min [kNm]', zahl(x.MyMin, 2), zahl(x.xMyMin, 2)],
      ['M<sub>z</sub> [kNm]', zahl(x.MzMax, 2), zahl(x.xMzMax, 2)],
      ['V<sub>z</sub> [kN]', zahl(x.VzMax, 2), zahl(x.xVzMax, 2)],
      ['V<sub>y</sub> [kN]', zahl(x.VyMax, 2), zahl(x.xVyMax, 2)],
      ['T<sub>x</sub> [kNm]', zahl(x.TxMax, 2), zahl(x.xTxMax, 2)],
      ['N<sub>x</sub> [kN]', zahl(x.NxMax, 2), zahl(x.xNxMax, 2)],
    ])}
    ${opt.bilder.verlaeufe ? bild(bilder?.verlaeufe, 'Schnittgrössenverläufe, Umhüllende') : ''}
    ${opt.bilder.eta ? bild(bilder?.eta, 'Ausnutzung entlang des Jochs') : ''}
  </section>`;
}

/** Die Schnittgroessen des Masten ueber die Hoehe, wie der Kern sie fuehrt. */
function mastStationen(n) {
  if (!n?.stationen?.length) return '<p>Keine Werte.</p>';
  return tabelle(['z [m]', 'F<sub>z</sub> [kN]', 'F<sub>x</sub> [kN]', 'F<sub>y</sub> [kN]',
    'M<sub>yy</sub> [kNm]', 'M<sub>xx</sub> [kNm]', 'M<sub>zz</sub> [kNm]', 'σ [N/mm²]', 'η'],
    n.stationen.map((st) => [zahl(st.z, 2), zahl(st.Fz, 2), zahl(st.Fx, 2), zahl(st.Fy, 2),
      zahl(st.Myy, 2), zahl(st.Mxx, 2), zahl(st.Mzz, 3), zahl(st.sig, 1), zahl(st.eta, 3)]), 'eng');
}

/**
 * Der Gurtnachweis an der massgebenden Station - die Kette, wie der Kern
 * sie rechnet. `st` ist die Station der massgebenden Kombination.
 */
export function gurtNachweis(st, fyd) {
  const e = st?.massgebendeEcke;
  if (!e) return '<p>Kein Gurtnachweis vorhanden.</p>';
  return `
    <p><b>${esc(e.label)}</b> (${esc(e.profil)}, ${esc(e.art)}) bei x = ${zahl(st.x, 2)} m.
    Schnittgrössen dort: M<sub>y</sub> = ${zahl(st.My, 2)} kNm, M<sub>z</sub> = ${zahl(st.Mz, 2)} kNm,
    T<sub>x</sub> = ${zahl(st.Tx, 2)} kNm; Hebelarme h = ${zahl(st.h * 1000, 1)} mm, b = ${zahl(st.b * 1000, 1)} mm.</p>
    ${formel('N<sub>My</sub>', 'M<sub>y</sub> / (2 h)', `${zahl(Math.abs(st.My), 2)} / (2 · ${zahl(st.h, 4)})`, zahl(Math.abs(e.N_My), 2), 'kN')}
    ${formel('N<sub>Mz</sub>', 'M<sub>z</sub> / (2 b)', `${zahl(Math.abs(st.Mz), 2)} / (2 · ${zahl(st.b, 4)})`, zahl(Math.abs(e.N_Mz), 2), 'kN')}
    ${formel('|N|', '|N<sub>My</sub> + N<sub>Mz</sub> + N<sub>ax</sub>|', `|${zahl(e.N_My, 2)} + ${zahl(e.N_Mz, 2)} + ${zahl(e.N_ax, 2)}|`, zahl(Math.abs(e.N), 2), 'kN')}
    ${formel('σ<sub>N</sub>', '|N| / A', `${zahl(Math.abs(e.N), 2)} / ${zahl(e.A, 2)} cm²`, zahl(e.sig_N, 2), 'N/mm²')}
    ${formel('σ<sub>My</sub>', 'M<sub>y,lok</sub> / W<sub>y</sub>', `${zahl(e.My_lokal, 4)} kNm / ${zahl(e.Wy, 2)} cm³`, zahl(e.sig_My, 2), 'N/mm²')}
    ${formel('σ<sub>Mz</sub>', 'M<sub>z,lok</sub> / W<sub>z</sub>', `${zahl(e.Mz_lokal, 4)} kNm / ${zahl(e.Wz, 2)} cm³`, zahl(e.sig_Mz, 2), 'N/mm²')}
    <p class="klein">M<sub>lok</sub>: örtliches Moment im Winkel aus der Vierendeelwirkung, einschliesslich
    Eigenanteil (M<sub>y</sub>: ${zahl(e.eigenMy, 4)}, M<sub>z</sub>: ${zahl(e.eigenMz, 4)} kNm).</p>
    ${formel('σ', 'σ<sub>N</sub> + σ<sub>My</sub> + σ<sub>Mz</sub>', `${zahl(e.sig_N, 2)} + ${zahl(e.sig_My, 2)} + ${zahl(e.sig_Mz, 2)}`, zahl(e.sig_v, 2), 'N/mm²')}
    ${formel('η', 'σ / f<sub>yd</sub>', `${zahl(e.sig_v, 2)} / ${zahl(fyd, 2)}`, zahl(e.eta, 3))}
    <p>${urteilMarke(e.eta)}</p>`;
}

/** Der Blechnachweis an der fuer das Blech massgebenden Station. */
export function blechNachweis(st, fyd) {
  if (!st || !(st.hBB > 0)) return '<p>Kein Blechnachweis vorhanden.</p>';
  return `
    <p>Bindeblech Pos. ${esc(st.blechPos)} (${zahl(st.hBB, 0)} × ${zahl(st.tBB, 0)} mm) bei x = ${zahl(st.x, 2)} m.</p>
    ${formel('W', 't · b² / 6', `${zahl(st.tBB, 0)} · ${zahl(st.hBB, 0)}² / 6`, zahl(st.W_Blech, 0), 'mm³')}
    ${formel('σ', 'M / W', `${zahl(st.M_Blech, 4)} kNm / ${zahl(st.W_Blech, 0)} mm³`, zahl(st.sig_B, 2), 'N/mm²')}
    ${formel('τ', '1.5 · V / (t · b)', `1.5 · ${zahl(st.V_Blech, 3)} kN / (${zahl(st.tBB, 0)} · ${zahl(st.hBB, 0)})`, zahl(st.tau_B, 2), 'N/mm²')}
    ${formel('σ<sub>v</sub>', '√(σ² + 3 τ²)', `√(${zahl(st.sig_B, 2)}² + 3 · ${zahl(st.tau_B, 2)}²)`, zahl(st.sig_vB, 2), 'N/mm²')}
    ${formel('η', 'σ<sub>v</sub> / f<sub>yd</sub>', `${zahl(st.sig_vB, 2)} / ${zahl(fyd, 2)}`, zahl(st.etaB, 3))}
    <p>${urteilMarke(st.etaB)}</p>`;
}

/** Der Mastnachweis: Querschnitt am Fuss, dann SIA 263 Gleichung (50). */
export function mastNachweis(n, name, fallText) {
  if (!n) return '';
  const q = n.massgebend ?? {};
  const s = n.stabil;
  const quer = `
    <h4>Querschnitt (massgebend bei z = ${zahl(q.z, 2)} m)</h4>
    <p>N = ${zahl(q.N, 2)} kN · M<sub>quer</sub> = ${zahl(q.Myy, 2)} kNm · M<sub>längs</sub> = ${zahl(q.Mxx, 2)} kNm ·
    A = ${zahl(n.A, 1)} cm² · W<sub>quer</sub> = ${zahl(n.Wq, 1)} cm³ · W<sub>längs</sub> = ${zahl(n.Wl, 1)} cm³</p>
    ${formel('σ<sub>N</sub>', 'N / A', `${zahl(q.N, 2)} / ${zahl(n.A, 1)} cm²`, zahl(q.sigN, 2), 'N/mm²')}
    ${formel('σ<sub>quer</sub>', 'M<sub>quer</sub> / W<sub>quer</sub>', `${zahl(Math.abs(q.Myy), 2)} / ${zahl(n.Wq, 1)} cm³`, zahl(q.sigQ, 2), 'N/mm²')}
    ${formel('σ<sub>längs</sub>', 'M<sub>längs</sub> / W<sub>längs</sub>', `${zahl(Math.abs(q.Mxx), 2)} / ${zahl(n.Wl, 1)} cm³`, zahl(q.sigL, 2), 'N/mm²')}
    ${formel('σ', 'σ<sub>N</sub> + σ<sub>quer</sub> + σ<sub>längs</sub> + σ<sub>w</sub>', `${zahl(q.sigN, 2)} + ${zahl(q.sigQ, 2)} + ${zahl(q.sigL, 2)} + ${zahl(q.sigW, 2)}`, zahl(q.sig, 2), 'N/mm²')}
    ${formel('η', 'σ / f<sub>yd</sub>', `${zahl(q.sig, 2)} / ${zahl(n.fyd, 2)}`, zahl(q.eta ?? n.eta, 3))}`;
  const stab = s && !s.ohneNachweis ? `
    <h4>Stabilität nach SIA 263, Ziffer 5.1.10.1</h4>
    <p>Knicklänge L<sub>cr</sub> = β · L = ${zahl(s.beta, 2)} · ${zahl(s.L, 2)} = ${zahl(s.Lcr, 2)} m ·
    γ<sub>M1</sub> = ${zahl(s.gammaM1, 2)} · ω = ${zahl(s.omega, 2)} (Ziffer 5.1.10.3)</p>
    ${tabelle(['', 'um y (quer)', 'um z (längs)'], [
      ['N<sub>cr</sub> [kN]', zahl(s.NcrY, 1), zahl(s.NcrZ, 1)],
      ['λ̄', zahl(s.lamY, 3), zahl(s.lamZ, 3)],
      ['α (Knicklinie)', `${zahl(s.alphaY, 2)} (${esc(s.knicklinie?.y ?? '')})`, `${zahl(s.alphaZ, 2)} (${esc(s.knicklinie?.z ?? '')})`],
      ['χ', zahl(s.chiY, 3), zahl(s.chiZ, 3)],
      ['N<sub>K,Rd</sub> = χ · N<sub>Rk</sub> / γ<sub>M1</sub> [kN]', zahl(s.NKyRd, 1), zahl(s.NKzRd, 1)],
      ['M<sub>Rd</sub> [kNm]', zahl(s.MyRd, 2), zahl(s.MzRd, 2)],
      ['1 / (1 − N<sub>Ed</sub>/N<sub>cr</sub>)', zahl(s.vy, 4), zahl(s.vz, 4)],
    ])}
    <p>N<sub>Ed</sub> = ${zahl(s.NEd, 2)} kN · M<sub>y,Ed</sub> = ${zahl(s.MyEd, 2)} kNm · M<sub>z,Ed</sub> = ${zahl(s.MzEd, 2)} kNm
    (Theorie 1. Ordnung) · N<sub>K,Rd</sub> = min = ${zahl(s.NKRd, 1)} kN</p>
    ${formel('η<sub>(50)</sub>',
      'N<sub>Ed</sub>/N<sub>K,Rd</sub> + ω/(1−N<sub>Ed</sub>/N<sub>cr,y</sub>) · M<sub>y,Ed</sub>/M<sub>y,Rd</sub> + ω/(1−N<sub>Ed</sub>/N<sub>cr,z</sub>) · M<sub>z,Ed</sub>/M<sub>z,Rd</sub>',
      `${zahl(s.NEd, 2)}/${zahl(s.NKRd, 1)} + ${zahl(s.omega, 2)} · ${zahl(s.vy, 4)} · ${zahl(s.MyEd, 2)}/${zahl(s.MyRd, 2)} + ${zahl(s.omega, 2)} · ${zahl(s.vz, 4)} · ${zahl(s.MzEd, 2)}/${zahl(s.MzRd, 2)}`,
      zahl(s.eta50, 3))}
    <p class="klein">Zum Vergleich Gleichung (51): η = ${zahl(s.eta51, 3)} (ausgewiesen, nicht geführt).
    Massgebend: ${esc(s.massgebend ?? '')}.</p>`
    : '<p>Stabilitätsnachweis nicht geführt.</p>';
  return `<h3>${name.startsWith('§') ? name : esc(name)} — ${esc(n.profil?.name)}</h3>
    ${fallText ? `<p class="klein">Massgebende Kombination: ${esc(fallText)}</p>` : ''}
    ${quer}${stab}
    <p>η = max(Querschnitt ${zahl(n.eta, 3)}; Stabilität ${zahl(s?.eta, 3)}) = <b>${zahl(n.etaMitStabilitaet ?? n.eta, 3)}</b>
    ${urteilMarke(n.etaMitStabilitaet ?? n.eta)}</p>`;
}

function nachweise(d) {
  const { erg, kombi } = d;
  const m = erg.modell;
  const fyd = m.stahl?.fy / m.gammaM0;
  const fallBez = (k) => (kombi?.lastfaelle ?? []).find((l) => l.key === k)?.bez ?? k;
  // Die Kette steht auf EINER Kombination - der fuer das Joch massgebenden.
  // Ihr eta ist das der Umhuellenden; die Zwischenwerte gehoeren zusammen.
  const kk = kombi?.massgebend;
  const km = kk ? kombi.ergebnisse?.[kk] : null;
  const stGurt = km?.max?.eta ?? erg.max?.eta;
  const stBlech = km?.max?.etaB ?? erg.max?.etaB;
  const namen = m.federn?.namen ?? {};
  const anker = ['A', 'B'].map((e) => {
    const a = erg.anker?.[e]?.nachweis;
    if (!a) return null;
    return [esc(`${a.typ ?? 'Anker'} ${namen[e] ?? e}`), zahl(a.N, 2), zahl(a.zul, 1),
            zahl(a.L, 2), esc(a.text ?? ''), a.eta === null ? '—' : zahl(a.eta, 3),
            urteilMarke(a.eta, a.lieferbar === false)];
  }).filter(Boolean);
  const ankerBlock = (nr) => (anker.length ? `<h3>§.${nr} Zuganker und Druckstützen</h3>
      <p>Charakteristische Kraft gegen die zulässige Kraft des Bemessungsblatts.</p>
      ${tabelle(['Bauteil', 'N<sub>k</sub> [kN]', 'zul [kN]', 'L [m]', 'Grundlage', 'η', ''], anker)}` : '');
  if (istMast(d)) {
    return `<section><h2>§ Nachweise</h2>
    <p>f<sub>yd</sub> = ${zahl(fyd, 2)} N/mm². Je Nachweis die Zwischenwerte der für den Mast
    massgebenden Kombination; ihr η ist das der Umhüllenden über alle Kombinationen.</p>
    ${erg.mast?.A ? mastNachweis(erg.mast.A, namen.A ? `§.1 Mast ${namen.A}` : '§.1 Mast',
                                 fallBez(erg.mast.A.fall)) : '<p>Kein Mast im Modell.</p>'}
    ${ankerBlock(2)}
  </section>`;
  }
  return `<section><h2>§ Nachweise</h2>
    <p>f<sub>yd</sub> = ${zahl(fyd, 2)} N/mm². Zwischenwerte aus der massgebenden Kombination
    <b>${esc(fallBez(kk))}</b>; ihr η ist das der Umhüllenden.</p>
    <h3>§.1 Joch — Winkelgurte</h3>
    ${gurtNachweis(stGurt, fyd)}
    <h3>§.2 Joch — Bindebleche</h3>
    ${blechNachweis(stBlech, fyd)}
    <h3>§.3 Masten</h3>
    ${['A', 'B'].map((e) => erg.mast?.[e]
      ? mastNachweis(erg.mast[e], namen[e] ? `Mast ${namen[e]}` : `Mast ${e}`, fallBez(erg.mast[e].fall))
      : '').join('') || '<p>Ohne Masten.</p>'}
    ${ankerBlock(4)}
  </section>`;
}

/** Ganze Millimeter und Stueckzahlen ohne Nachkommastellen. */
const stellen = (einheit) => (['mm', 'Stk'].includes(einheit) ? 0 : 2);

function pruefungen(d) {
  const ch = d.checks ?? [];
  if (!ch.length) return '';
  return `<section><h2>§ Konstruktionsprüfungen</h2>
    ${tabelle(['Nr.', 'Prüfung', 'vorhanden', '', 'verlangt', 'Einheit', 'Befund'],
      ch.map((c) => [esc(c.id), esc(c.text), zahl(c.vorhanden, stellen(c.einheit)), esc(c.richtung ?? ''),
        zahl(c.erforderlich, stellen(c.einheit)), esc(c.einheit ?? ''),
        `<span class="marke ${c.ok ? 'ok' : (c.warnungNichtFehler ? 'offen' : 'nok')}">${esc(c.status ?? '')}</span>`]), 'eng')}
  </section>`;
}

function nichtGefuehrt(d) {
  const ng = d.urteil?.nichtGefuehrt ?? [];
  const hw = d.hinweise ?? [];
  return `<section><h2>§ Nicht geführte Nachweise und Gültigkeit</h2>
    ${ng.length ? tabelle(['Nachweis', 'Was fehlt', 'Grund'], ng.map((g) =>
      [esc(g.titel), esc(g.was ?? ''), g.grund === 'ausgeschaltet' ? 'in der Eingabe ausgeschaltet' : 'im Werkzeug nicht enthalten']))
      : '<p>Alle Nachweisgruppen werden geführt.</p>'}
    ${hw.length ? `<h3>Hinweise zur Gültigkeit</h3><ul>${hw.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
  </section>`;
}

function mastFussZeilen(mast, namen) {
  return ['A', 'B'].map((e) => {
    const f = mast?.[e]?.stationen?.[0];
    if (!f) return null;
    return [esc(namen[e] ? `Mast ${namen[e]}` : `Mast ${e}`), zahl(f.Fz, 2), zahl(f.Fx, 2), zahl(f.Fy, 2),
            zahl(f.Myy, 2), zahl(f.Mxx, 2), zahl(f.Mzz, 2)];
  }).filter(Boolean);
}

function auflagerkraefte(d) {
  const { erg } = d;
  const namen = erg.modell?.federn?.namen ?? {};
  const z = mastFussZeilen(erg.mast, namen);
  return `<section><h2>§ Kräfte am Mastfuss</h2>
    <p>Bemessungswerte der massgebenden Kombination je Mast — Übergabe an den Fundamentnachweis.
    Die Werte je Kombination stehen im Anhang.</p>
    ${z.length ? tabelle(['Mast', 'F<sub>z</sub> [kN]', 'F<sub>x</sub> [kN]', 'F<sub>y</sub> [kN]',
      'M<sub>quer</sub> [kNm]', 'M<sub>längs</sub> [kNm]', 'M<sub>t</sub> [kNm]'], z) : '<p>Ohne Masten.</p>'}
  </section>`;
}

function anhang(d) {
  const { kombi, erg, opt } = d;
  if (opt.umfang === 'massgebend') return '';
  const namen = erg.modell?.federn?.namen ?? {};
  const nachweisFaelle = (kombi?.lastfaelle ?? []).filter((l) => l.nachweis);
  const hk = kombi?.huellkurve ?? erg;
  const stTab = (knoten) => tabelle(['Nr.', 'x [m]', 'M<sub>y</sub>', 'M<sub>z</sub>', 'V<sub>z</sub>', 'V<sub>y</sub>',
    'T<sub>x</sub>', 'η Gurt', 'η Blech', 'η'],
    (knoten ?? []).map((k) => [String(k.i), zahl(k.x, 2), zahl(k.My, 2), zahl(k.Mz, 2), zahl(k.Vz, 2),
      zahl(k.Vy, 2), zahl(k.Tx, 2), zahl(k.etaL, 3), zahl(k.etaB, 3), zahl(k.eta, 3)]), 'eng');
  const fuss = nachweisFaelle.flatMap((l) => mastFussZeilen(kombi.ergebnisse?.[l.key]?.mast, namen)
    .map((z) => [esc(l.bez), ...z]));
  const fussTab = fuss.length ? tabelle(['Kombination', 'Mast', 'F<sub>z</sub>', 'F<sub>x</sub>', 'F<sub>y</sub>',
      'M<sub>quer</sub>', 'M<sub>längs</sub>', 'M<sub>t</sub>'], fuss, 'eng') : '<p>Ohne Masten.</p>';
  if (istMast(d)) {
    return `<section class="anhang"><h2>Anhang</h2>
    <h3>A1 η des Masten je Kombination</h3>
    ${tabelle(['Kombination', 'η Mast'], (kombi?.lastfaelle ?? []).map((l) =>
      [esc(l.bez), zahl(kombi.ergebnisse?.[l.key]?.mast?.A?.etaMitStabilitaet
                        ?? kombi.ergebnisse?.[l.key]?.mast?.A?.eta, 3)]), 'eng')}
    <h3>A2 Kräfte am Mastfuss je Nachweiskombination</h3>
    ${fussTab}
    ${opt.umfang === 'vollstaendig' ? nachweisFaelle.map((l, i) =>
      `<h3>A${3 + i} Mast über die Höhe: ${esc(l.bez)}</h3>${mastStationen(kombi.ergebnisse?.[l.key]?.mast?.A)}`).join('') : ''}
  </section>`;
  }
  return `<section class="anhang"><h2>Anhang</h2>
    <h3>A1 η je Kombination</h3>
    ${tabelle(['Kombination', 'η Obergurt', 'η Untergurt', 'η Blech', 'η', 'bei x [m]'],
      (kombi?.lastfaelle ?? []).map((l) => [esc(l.bez), zahl(l.etaOG, 3), zahl(l.etaUG, 3),
        zahl(l.etaB, 3), zahl(l.eta, 3), zahl(l.xMax, 2)]), 'eng')}
    <h3>A2 Stationen der Umhüllenden (kNm, kN)</h3>
    ${stTab(hk.knoten)}
    <h3>A3 Kräfte am Mastfuss je Nachweiskombination</h3>
    ${fussTab}
    ${opt.umfang === 'vollstaendig' ? nachweisFaelle.map((l, i) =>
      `<h3>A${4 + i} Stationen: ${esc(l.bez)}</h3>${stTab(kombi.ergebnisse?.[l.key]?.knoten)}`).join('') : ''}
  </section>`;
}

// --- Seite -----------------------------------------------------------------

/*
 * Die Diagramme tragen die Klassen der Anwendung (.serie-1, .grid, …); ihre
 * Regeln reicht app.js als `d.stil` herein, damit sie nicht zweimal
 * gepflegt werden. Hier stehen nur die Farben dazu - hell, fuer Papier.
 */
const FARBEN_DRUCK = `
  :root { --acc: #1f5fbf; --fail: #b00020; --ok: #1a6b2a; --warn: #a86b00;
    --ol: #cfcfcf; --dim: #555; --xdim: #777; --on2: #222; --achse: #333;
    --s1: #fff; --f-mono: Consolas, "Courier New", monospace; }
  figure svg { background: #fff; }
`;

const STIL = `
  @page { size: A4; margin: 18mm 16mm 20mm 20mm;
    @bottom-right { content: "Seite " counter(page) " / " counter(pages); font: 8pt sans-serif; color: #555; } }
  * { box-sizing: border-box; }
  body { font: 9.5pt/1.4 "Segoe UI", Arial, sans-serif; color: #111; margin: 0; background: #fff; }
  .blatt { max-width: 180mm; margin: 0 auto; padding: 8mm 0; }
  h1 { font-size: 20pt; margin: 4mm 0 2mm; }
  h2 { font-size: 13pt; border-bottom: 1.5px solid #111; padding-bottom: 1mm; margin: 8mm 0 3mm; break-after: avoid; }
  h3 { font-size: 10.5pt; margin: 5mm 0 2mm; break-after: avoid; }
  h4 { font-size: 9.5pt; margin: 3mm 0 1mm; break-after: avoid; }
  section { break-inside: auto; }
  section + section { break-before: page; }
  .anhang { break-before: page; }
  table { border-collapse: collapse; width: 100%; margin: 2mm 0; break-inside: auto; }
  tr { break-inside: avoid; }
  th, td { border: 0.5px solid #999; padding: 1mm 1.5mm; text-align: left; vertical-align: top; }
  thead th { background: #eee; font-weight: 600; }
  td { font-variant-numeric: tabular-nums; }
  table.eng th, table.eng td { padding: 0.6mm 1.2mm; font-size: 8pt; }
  table.angaben th { width: 45%; background: #f6f6f6; font-weight: 500; }
  .formel { margin: 1mm 0 1mm 4mm; font-variant-numeric: tabular-nums; }
  .formel .sym { display: inline-block; min-width: 14mm; }
  .klein { font-size: 8pt; color: #444; }
  .marke { font-weight: 600; }
  .marke.ok { color: #1a6b2a; } .marke.nok { color: #b00020; } .marke.offen { color: #8a5a00; }
  .deckblatt .ueber { text-transform: uppercase; letter-spacing: .12em; color: #555; margin-top: 20mm; }
  .deckblatt .ort { font-size: 11pt; color: #333; }
  .gesamturteil { border: 2px solid; padding: 4mm; margin: 8mm 0 4mm; }
  .gesamturteil.ok { border-color: #1a6b2a; } .gesamturteil.nok { border-color: #b00020; }
  .gesamturteil .gz { font-size: 18pt; font-weight: 700; }
  figure { margin: 3mm 0; break-inside: avoid; text-align: center; }
  figure svg, figure img { max-width: 100%; height: auto; }
  figcaption { font-size: 8pt; color: #555; margin-top: 1mm; }
  @media print { .blatt { padding: 0; } }
`;

/*
 * DIE KAPITEL WERDEN GEZAEHLT, NICHT HINGESCHRIEBEN. Beim Einzelmast gibt es
 * keine Konstruktionspruefungen, ohne 3D-Bild keine Uebersicht - feste
 * Nummern haetten Luecken. Die Kapitel tragen «§»; hier bekommen sie ihre
 * Zahl, und das Deckblatt verweist auf die Zahl, die sie wirklich haben.
 */
function nummeriert(dd, o) {
  const teile = [
    ['uebersicht', o.bilder.modell3d && dd.bilder?.modell3d
      ? `<section><h2>§ Übersicht</h2>${bild(dd.bilder.modell3d, '3D-Ansicht mit Ausnutzung')}</section>` : ''],
    ['grundlagen', grundlagen(dd)], ['system', system(dd)], ['einwirkungen', einwirkungen(dd)],
    ['kombinationen', kombinationen(dd)], ['schnittgroessen', schnittgroessen(dd)],
    ['nachweise', nachweise(dd)], ['pruefungen', pruefungen(dd)],
    ['nichtGefuehrt', nichtGefuehrt(dd)], ['auflager', auflagerkraefte(dd)],
  ].filter(([, html]) => html);
  const nr = {};
  const kapitel = teile.map(([key, html], i) => {
    nr[key] = i + 1;
    return html.replace(/<h2>§ /g, `<h2>${i + 1} `).replace(/<h3>§\./g, `<h3>${i + 1}.`);
  });
  const deck = deckblatt(dd)
    .replace('{{K_PRUEF}}', String(nr.pruefungen ?? '—'))
    .replace('{{K_NG}}', String(nr.nichtGefuehrt ?? '—'));
  return [deck, ...kapitel, anhang(dd)].join('\n');
}

/**
 * Den ganzen Bericht als eigenständiges HTML-Dokument.
 *
 * @param {object} d  {werte, erg, kombi, checks, urteil, hinweise, fassung,
 *                     datum, bilder: {skizze, verlaeufe, modell3d, eta}}
 *                    `erg` ist die Bemessung (Umhüllende) mit Mast und Anker.
 * @param {object} opt {umfang, bilder: {key: bool}} - siehe berichtVorgabe()
 */
export function nachweisbericht(d, opt = berichtVorgabe()) {
  const art = tragwerksart(d.werte).key;
  if (!BERICHT_ARTEN.includes(art)) {
    throw new Error(`Der Nachweisbericht deckt in dieser Fassung das Tragjoch mit Masten `
      + `und den Einzelmast ab — nicht «${tragwerksart(d.werte).label}».`);
  }
  const o = { ...berichtVorgabe(), ...opt,
              bilder: { ...berichtVorgabe().bilder, ...(opt?.bilder ?? {}) } };
  const dd = { ...d, opt: o };
  const titel = `Nachweis ${d.werte.name || ''} ${verortung(d.werte) || ''}`.trim();
  return `<!DOCTYPE html><html lang="de-CH"><head><meta charset="utf-8">
<title>${esc(titel)}</title><style>${FARBEN_DRUCK}${d.stil ?? ''}${STIL}</style></head><body>
<div class="blatt">
${nummeriert(dd, o)}
</div></body></html>`;
}

export { NACHWEISGRUPPEN };
