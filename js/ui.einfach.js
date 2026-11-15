/**
 * ui.einfach.js - DAS EINFACHE ERGEBNISFELD DER SCHULUNG (15. November).
 *
 * Weisung, im Wortlaut: «die schulungsversion wirkt zu überladen aus meiner
 * sicht. es sollte nur das nötigste dargestellt und beschrieben werden. es
 * wirkt zu überladen und der user der nicht vertraut ist mit statikbegriffen
 * überfordert.» Auf den Vorschlag (Paket 1: ein Urteil mit Balken, nur
 * Änderbares zeigen, einfache Sprache, 3D entrümpeln): «Ja, Paket 1 bauen».
 *
 * Gemessen war die Übersicht 19 Kacheln, 606 Wörter und fast drei
 * Bildschirmhöhen. Hier steht stattdessen EIN Satz und je Gruppe EIN Balken
 * in Prozent; die Kacheln der Fachperson bleiben darunter, zugeklappt.
 *
 * >>> ES WIRD NICHTS NEU GERECHNET. <<< Das Feld liest die Kacheln, die die
 * Übersicht eben gezeichnet hat (Zahl im Feld bzw. `data-eta`) - dieselbe
 * Quelle für beide Darstellungen, keine zweite Wahrheit. 100 % ist η = 1.00.
 *
 * Reine Zeichenkettenarbeit in `einfachAusKacheln` (läuft im Prüfstand ohne
 * DOM); `einfachesErgebnis` hängt es in die Seite.
 */

const esc = (s) => String(s ?? '').replace(/[&<>"]/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Gruppe einer Kachel: aus der Überschrift ihrer Reihe, sonst aus dem Titel. */
export function gruppeVon(titel, kopf = '') {
  const t = String(titel ?? '');
  if (/^(Verformung|Seitenlage|Verdrehung)/i.test(t)) return 'verformung';
  if (/Fundament/i.test(t)) return 'fundament';
  if (/Anker|Aufhängung|Längsanker|Seil|Stütze/i.test(t)) return 'anker';
  const k = String(kopf ?? '').trim().toLowerCase();
  if (k.startsWith('mast')) return 'mast';
  if (k.startsWith('fundament')) return 'fundament';
  if (k.startsWith('anker')) return 'anker';
  if (k) return 'traeger';
  if (/Obergurt|Untergurt|Bindeblech|Blech|Gurt|UPE|Joch|Ausleger/i.test(t)
      && !/\bM\d|Mast/i.test(t)) return 'traeger';
  return 'mast';
}

const GRUPPEN = [
  { key: 'traeger', titel: 'Träger' },
  { key: 'mast', titel: 'Masten' },
  { key: 'anker', titel: 'Anker und Seile' },
  { key: 'fundament', titel: 'Fundamente' },
  { key: 'verformung', titel: 'Verformung' },
];

/** «η M1» → «Mast M1», «η Fundament M2» → «Fundament M2». */
export function bauteilName(titel, gruppe) {
  let t = String(titel ?? '').replace(/^η\s*/, '').trim();
  if (gruppe === 'mast' && /^(MT?)?\d/.test(t)) t = `Mast ${t}`;
  if (gruppe === 'mast' && /^Knicken /.test(t)) t = `Mast ${t.slice(8)} (Knicken)`;
  return t;
}

const farbe = (eta) => (eta > 1 ? 'fail' : eta >= 0.9 ? 'warn' : 'ok');
const prozent = (eta) => `${Math.round(eta * 100)} %`;

/**
 * @param {Array<{titel:string, eta:number, kopf?:string}>} kacheln
 * @param {{traeger?:string, vorlaeufig?:boolean}} opt  Name des Trägers (Joch, Abfangjoch, Tragausleger)
 * @returns {{html:string, gesamt:number|null, gruppen:Array}}
 */
export function einfachAusKacheln(kacheln, opt = {}) {
  const je = new Map();
  (kacheln ?? []).forEach((k) => {
    if (!Number.isFinite(k.eta)) return;
    const g = gruppeVon(k.titel, k.kopf);
    const alt = je.get(g);
    if (!alt || k.eta > alt.eta) je.set(g, { eta: k.eta, name: bauteilName(k.titel, g) });
  });
  const gruppen = GRUPPEN.filter((g) => je.has(g.key)).map((g) => ({
    ...g, titel: g.key === 'traeger' ? (opt.traeger ?? g.titel) : g.titel, ...je.get(g.key),
  }));
  if (!gruppen.length) {
    return { html: `<div class="einfach"><p class="ef-satz">Das Tragwerk wird berechnet …</p></div>`,
             gesamt: null, gruppen };
  }
  const max = gruppen.reduce((a, b) => (b.eta > a.eta ? b : a));
  const f = farbe(max.eta);
  const satz = max.eta > 1
    ? `Das Tragwerk ist <b>überlastet</b>: ${esc(max.name)} erreicht ${prozent(max.eta)} seiner Grenze.`
    : `Das Tragwerk ist zu <b>${prozent(max.eta)}</b> ausgelastet. Am stärksten beansprucht: ${esc(max.name)}.`;
  const balken = gruppen.map((g) => {
    const b = Math.min(g.eta, 1.25) / 1.25 * 100;
    return `<div class="ef-zeile" title="${esc(g.name)}: ${prozent(g.eta)} (η ${g.eta.toFixed(2)})">
      <span class="ef-name">${esc(g.titel)}</span>
      <span class="ef-bahn"><span class="ef-balken ${farbe(g.eta)}" style="width:${b.toFixed(1)}%"></span
        ><span class="ef-grenze"></span></span>
      <span class="ef-wert ${farbe(g.eta)}">${prozent(g.eta)}</span>
      <span class="ef-wer">${esc(g.name)}</span>
    </div>`;
  }).join('');
  const html = `<div class="einfach">
    <div class="ef-urteil ${f}">
      <span class="ef-zahl">${prozent(max.eta)}</span>
      <p class="ef-satz">${satz}</p>
    </div>
    ${opt.vorlaeufig ? '<p class="ef-leg">Vorläufig - die genaue Rechnung läuft.</p>' : ''}
    <div class="ef-balkenfeld">${balken}</div>
    <p class="ef-leg">100 % = die Grenze ist erreicht (Strich). Gezeigt ist je Gruppe das am
      stärksten beanspruchte Bauteil, unter Wind, Schnee und Eigengewicht.</p>
  </div>`;
  return { html, gesamt: max.eta, gruppen };
}

let offen = false;

/**
 * Legt das einfache Feld über die gezeichnete Übersicht und klappt den Rest
 * darunter zu. Mehrfach aufrufbar (die Übersicht wird bei jeder Eingabe neu
 * gezeichnet).
 */
export function einfachesErgebnis(node, opt = {}) {
  if (!node || node.querySelector(':scope > .einfach')) return;
  const kacheln = [...node.querySelectorAll('.kz')].map((k) => {
    const titel = k.querySelector('.kz-t')?.textContent?.trim() ?? '';
    const eta = k.dataset.eta !== undefined ? Number(k.dataset.eta)
      : (/^η/.test(titel) ? parseFloat(k.querySelector('.kz-w')?.textContent ?? '') : NaN);
    // Überschrift der Reihe: das `.sec-klein` vor dem Kachelfeld.
    const feld = k.closest('.kennzahlen');
    const vor = feld?.previousElementSibling;
    const kopf = vor?.classList?.contains('sec-klein') ? (vor.childNodes[0]?.textContent ?? '') : '';
    return { titel, eta, kopf };
  });
  const vorlaeufig = /vorläufig/i.test(node.querySelector('.sw-leiste, .stabwerk-leiste')?.textContent ?? '');
  const { html } = einfachAusKacheln(kacheln, { ...opt, vorlaeufig });
  const rest = document.createElement('details');
  rest.className = 'ef-mehr';
  rest.open = offen;
  rest.innerHTML = '<summary>Einzelheiten je Bauteil (für Fachpersonen)</summary>';
  while (node.firstChild) rest.appendChild(node.firstChild);
  rest.addEventListener('toggle', () => { offen = rest.open; });
  node.insertAdjacentHTML('afterbegin', html);
  node.appendChild(rest);
}
