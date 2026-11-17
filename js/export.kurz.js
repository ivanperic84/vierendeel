/**
 * export.kurz.js
 * ---------------------------------------------------------------------------
 * >>> DIE KURZZUSAMMENFASSUNG DER BERECHNUNG (17. November). <<<
 *
 * Weisung: «mach beim export die funktion druck weg und dafür eine
 * kurzzusammenfassung der berechnung mit diagramm darstellung der
 * einwirkungen und modelleingaben und resultate als pdf output.»
 *
 * Ein Dokument von wenigen Seiten, A4 hoch, gedruckt «als PDF sichern»:
 * Kopf, Modelleingaben (Tragwerke, Masten, Anbauteile, Trasse und
 * Einwirkungen) mit Systemskizze und 3D-Bild, die Einwirkungen als
 * Lastbilder je Lastfall, die Resultate (Urteil, Ausnutzung je Bauteil als
 * Balken, Verformung) und die Hinweise. Es rechnet nicht: alle Zahlen
 * kommen aus `stabwerkBerichtDaten` (dieselben wie die Anzeige).
 * ---------------------------------------------------------------------------
 */

import { esc } from './design.js';

const f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : '–');
const pz = (eta) => (Number.isFinite(eta)
  ? `${eta > 1 ? Math.max(101, Math.round(eta * 100)) : Math.round(eta * 100)} %` : '–');
const farbe = (eta) => (eta > 1 ? '#c0392b' : eta > 0.9 ? '#c88a12' : '#2e8b57');

/** Die Stufe des Anschlusses Joch-Mast in Worten. */
function anschlussText(satz) {
  const l = satz?.auflagerLinks;
  if (l?.schraubenGrenze) return 'eingespannt bis zur Grenze der Hakenschrauben';
  if (l?.OG?.x === 'Rigid' && l?.UG?.x === 'Rigid') return 'voll eingespannt';
  return 'wie gebaut (in der Jochebene gelenkig)';
}

const tabelle = (kopf, zeilen) => (zeilen.length
  ? `<table><thead><tr>${kopf.map((k) => `<th>${esc(k)}</th>`).join('')}</tr></thead>
     <tbody>${zeilen.map((z) => `<tr>${z.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  : '<p class="leise">–</p>');

/**
 * @param {object} d  stabwerkBerichtDaten(app)
 * @param {object} o  { bilder: {skizze, modell3d, lasten[], bauteile, verformung},
 *                      gruppen: [{titel, eta, name}], satz, windText, wasserzeichen }
 */
export function kurzBerichtHtml(d, o = {}) {
  const w = d.blatt?.werte ?? {};
  const kopfZeile = [d.blatt?.name, d.blatt?.ort].filter(Boolean).map(esc).join(' · ') || 'ohne Projekt';
  const tw = (d.tragwerke ?? []).map((t) => [
    esc(t.pos), esc(t.label ?? ''),
    t.art === 'joch' || t.art === 'abfangjoch' ? `${f2(Number(t.satz?.L))} m` : '–',
    Number(t.satz?.mastH) > 0 && t.art !== 'einzelmast' ? `${f2(Number(t.satz.mastH))} m` : '–',
    t.art === 'joch' ? esc(anschlussText(t.satz)) : '–',
  ]);
  const ma = (d.masten ?? []).map((m) => [esc(m.anzeige), esc(m.profil ?? ''), `${f2(Number(m.laenge))} m`,
    esc(m.steg ?? ''), esc(m.fundamentTyp ?? '–'), esc(m.ankerText ?? '–')]);
  const anbau = [];
  (d.tragwerke ?? []).forEach((t) => (t.satz?.anbauteile ?? []).forEach((a) => {
    if (a.aktiv === false) return;
    const amMast = String(a.ort ?? '').startsWith('mast');
    anbau.push([esc(t.pos), esc(a.name ?? a.vorlage ?? ''), amMast ? 'am Masten' : 'am Joch',
      amMast ? `h ${f2(Number(a.hMast))} m` : `x ${f2(Number(a.x))} m`]);
  }));
  const trasse = [
    ['Abstand zum nächsten Masten (Spannweite)', `${f2(Number(w.flSpannweite))} m`],
    ['Kurvenradius', Number(w.trasseRadius) ? `${Number(w.trasseRadius).toFixed(0)} m` : 'gerade'],
    ['Wind', esc(o.windText ?? String(w.windKlasse ?? ''))],
    ['Windreduktion (dicht überbaut)', w.windReduktion ? 'ja, × 0.74' : 'nein'],
    ['Schnee', w.schneeAktiv ? 'ja' : 'nein'],
  ];
  const b = o.bilder ?? {};
  const lasten = (b.lasten ?? []).map((l) => `<figure class="halb"><figcaption>${esc(l.titel)}</figcaption>${l.svg}</figure>`).join('');
  const max = (o.gruppen ?? []).reduce((a, g) => (!a || g.eta > a.eta ? g : a), null);
  const satz = max
    ? (max.eta > 1 ? `Das Tragwerk ist <b>überlastet</b>: ${esc(max.name)} erreicht ${pz(max.eta)} seiner Grenze.`
                   : `Das Tragwerk ist zu <b>${pz(max.eta)}</b> ausgelastet. Am stärksten beansprucht: ${esc(max.name)}.`)
    : 'Kein Ergebnis.';
  const balken = (o.gruppen ?? []).map((g) => `<div class="bz"><span>${esc(g.titel)}</span>
      <span class="bb"><i style="width:${Math.min(100, (g.eta || 0) * 100).toFixed(1)}%;background:${farbe(g.eta)}"></i></span>
      <b style="color:${farbe(g.eta)}">${pz(g.eta)}</b><small>${esc(g.name ?? '')}</small></div>`).join('');
  const wz = o.wasserzeichen ? `<div class="wz">${esc(o.wasserzeichen)}</div>` : '';
  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
  <title>Kurzzusammenfassung</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    body { font: 11px/1.4 system-ui, sans-serif; color: #222; margin: 0 auto; max-width: 190mm; padding: 10px; }
    h1 { font-size: 18px; margin: 0 0 2px; } h2 { font-size: 13px; margin: 16px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
    .meta { color: #666; margin: 0 0 8px; }
    table { border-collapse: collapse; width: 100%; margin: 4px 0 8px; }
    th, td { border-bottom: 1px solid #e3e3e3; padding: 3px 6px; text-align: left; vertical-align: top; }
    th { font-weight: 600; color: #555; background: #f6f6f6; }
    figure { margin: 6px 0; break-inside: avoid; } figcaption { font-weight: 600; margin-bottom: 2px; }
    figure svg, figure img { width: 100%; height: auto; }
    .zwei { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .halb { margin: 0; }
    .urteil { padding: 8px 10px; border: 1px solid #ccc; border-left: 5px solid ${farbe(max?.eta ?? 0)}; margin: 6px 0 10px; font-size: 12px; }
    .bz { display: grid; grid-template-columns: 110px 1fr 52px 1fr; gap: 8px; align-items: center; margin: 3px 0; }
    .bb { height: 8px; background: #eee; border-radius: 4px; position: relative; overflow: hidden; }
    .bb i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; }
    .bz small { color: #666; }
    .leise { color: #777; }
    .hinweis { font-size: 10px; color: #555; }
    .seitenumbruch { break-before: page; }
    .wz { position: fixed; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 30px; font-weight: 700; color: #000; opacity: .10; white-space: nowrap;
          pointer-events: none; z-index: 10; letter-spacing: .04em; }
    ${o.stil ?? ''}
  </style></head><body>${wz}
  <h1>Kurzzusammenfassung der Berechnung</h1>
  <p class="meta">${kopfZeile} · ${esc(d.datum ?? '')} · ${esc(d.fassung ?? '')}</p>
  <div class="urteil">${satz}</div>

  <h2>1 Modelleingaben</h2>
  ${tabelle(['Tragwerk', 'Typ', 'Länge', 'Höhe', 'Anschluss am Masten'], tw)}
  ${tabelle(['Mast', 'Profil', 'Länge', 'Steg', 'Fundament', 'Abspannung'], ma)}
  ${tabelle(['Tragwerk', 'Anbauteil', 'Ort', 'Lage'], anbau)}
  ${tabelle(['Trasse und Einwirkungen', 'Wert'], trasse.map(([a, v]) => [esc(a), v]))}
  ${b.skizze ? `<figure><figcaption>System</figcaption>${b.skizze}</figure>` : ''}
  ${b.modell3d ? `<figure><figcaption>Modell</figcaption><img src="${b.modell3d}" alt="Modell"></figure>` : ''}

  <h2 class="seitenumbruch">2 Einwirkungen (charakteristisch, je Lastfall)</h2>
  ${lasten ? `<div class="zwei">${lasten}</div>` : '<p class="leise">Keine Lastbilder.</p>'}

  <h2>3 Resultate</h2>
  <div>${balken}</div>
  ${b.bauteile ? `<figure>${b.bauteile}</figure>` : ''}
  ${b.verformung ? `<figure><figcaption>Verformte Figur quer zum Gleis (Betriebswind)</figcaption>${b.verformung}</figure>` : ''}

  <h2>4 Hinweise</h2>
  <ul class="hinweis">
    <li>Vordimensionierung - kein geprüfter statischer Nachweis. Die Ergebnisse dürfen nicht als statischer Nachweis verwendet werden.</li>
    <li>Rechenkern: räumliches Stabwerk, linear-elastisch, eigener, nicht als Statikprogramm geprüfter Löser.</li>
    <li>Ausnutzung = Beanspruchung / Widerstand; Bauteile mit Bemessungswerten, Fundamente charakteristisch gegen zulässige Lasten, Verformung unter Betriebswind (Wind × 0.70).</li>
  </ul>
  </body></html>`;
}
