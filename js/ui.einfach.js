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

/* --------------------------------------------------------------------------
 * >>> SPANNUNGEN IN DEN PROFILEN (15. November). <<< Frage: «wäre es möglich
 * in der übersicht sidebar eine neuen gruppe zu erstellen und die
 * massgebenden Profile mit deren inneren spannung aufzuzeigen?» Je Teil
 * (Obergurt, Untergurt, Bindeblech, jeder Mast …) die grösste
 * Vergleichsspannung σ_v aus dem Stabwerk (Hülle) und die Grenze, gegen
 * die sie steht. Die Grenze ist σ_v / η - dieselbe Zahl, mit der der
 * Nachweis rechnet (f_yd bzw. beim plastischen Nachweis η · f_yd); nichts
 * wird neu gerechnet. Das Profil kommt aus der Kachel desselben Teils.
 * ------------------------------------------------------------------------ */
const TEIL_TEXT = { OG: 'Obergurt', UG: 'Untergurt', blech: 'Bindeblech', mast: 'Mast',
                    UPE: 'Gurt UPE', gurt: 'Gurtwinkel', rohr: 'Rohr' };

function profilAusKacheln(kacheln, teil, name) {
  const id = /^Mast (.+)$/.exec(name ?? '')?.[1];
  const k = (kacheln ?? []).find((x) => (teil === 'mast' && id
    ? new RegExp(`^η\\s*${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`).test(x.titel)
    : String(x.titel).includes(TEIL_TEXT[teil] ?? '§')));
  const p = String(k?.einheit ?? '').split(' · ')[0].trim();
  return p && !/massgebend/i.test(p) ? p : '';
}

export function spannungenHtml(teile, kacheln = []) {
  const liste = Object.values(teile ?? {})
    .filter((t) => Number.isFinite(t?.sig) && Number.isFinite(t?.eta) && t.eta > 0)
    .map((t) => ({ ...t, grenze: t.sig / t.eta }))
    .sort((a, b) => b.eta - a.eta);
  if (!liste.length) return '';
  const mehrereJoche = new Set(liste.filter((t) => t.teil !== 'mast').map((t) => t.name)).size > 1;
  const zeilen = liste.map((t) => {
    const was = t.teil === 'mast' ? t.name
      : `${TEIL_TEXT[t.teil] ?? t.teil}${mehrereJoche ? ` · ${t.name}` : ''}`;
    const profil = profilAusKacheln(kacheln, t.teil, t.name);
    const b = Math.min(t.eta, 1.25) / 1.25 * 100;
    return `<div class="ef-zeile" title="${esc(was)}: σ_v ${t.sig.toFixed(0)} von ${t.grenze.toFixed(0)} N/mm² (η ${t.eta.toFixed(2)})">
      <span class="ef-name">${esc(was)}</span>
      <span class="ef-bahn"><span class="ef-balken ${farbe(t.eta)}" style="width:${b.toFixed(1)}%"></span
        ><span class="ef-grenze"></span></span>
      <span class="ef-wert ${farbe(t.eta)}">${t.sig.toFixed(0)} / ${t.grenze.toFixed(0)}</span>
      <span class="ef-wer">${esc(profil ? `${profil} · ` : '')}σ_v in N/mm²</span>
    </div>`;
  }).join('');
  return `<div class="sec">Spannungen in den Profilen</div>
    <div class="ef-balkenfeld">${zeilen}</div>`;
}

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
      <span class="ef-name">${esc(g.titel)} ${begriffKnopf(GRUPPE_BEGRIFF[g.key])}</span>
      <span class="ef-bahn"><span class="ef-balken ${farbe(g.eta)}" style="width:${b.toFixed(1)}%"></span
        ><span class="ef-grenze"></span></span>
      <span class="ef-wert ${farbe(g.eta)}">${prozent(g.eta)}</span>
      <span class="ef-wer">${esc(g.name)}</span>
    </div>`;
  }).join('');
  // In der Designsprache der App: Hauptkachel `.urteil` (ok / warn / nok)
  // und Überschrift `.sec` wie die übrigen Blöcke der Übersicht.
  const zustand = f === 'fail' ? 'nok' : f;
  const html = `<div class="einfach">
    <div class="urteil ${zustand}">
      <span class="urteil-zahl">${prozent(max.eta)}</span>
      <span class="ef-satz">${satz} ${begriffKnopf('ausnutzung')}</span>
    </div>
    ${opt.vorlaeufig ? '<p class="ef-leg">Vorläufig - die genaue Rechnung läuft.</p>' : ''}
    <div class="sec">Ausnutzung je Bauteilgruppe</div>
    <div class="ef-balkenfeld">${balken}</div>
    ${spannungenHtml(opt.teile, kacheln)}
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
    const einheit = k.querySelector('.kz-e')?.textContent?.trim() ?? '';
    return { titel, eta, kopf, einheit };
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

/* ==========================================================================
 * >>> BEGRIFFE ERKLÄREN (15. November, Paket 2). <<<
 * Vorschlag 7: «Fachwörter wie Joch, Mast, Anker, Hängestütze und Ausnutzung
 * sind anklickbar und öffnen eine kurze Erklärung.» In der Schulung trägt
 * jedes Feld, das einen solchen Begriff braucht, ein «?»; dazu die Balken
 * des Ergebnisses. Der Text ist für Laien geschrieben, ohne Formeln.
 * ======================================================================== */
export const BEGRIFFE = {
  joch: { titel: 'Joch (Tragjoch)', text: 'Der Träger quer über die Gleise, an dem die Fahrleitung hängt. Er liegt auf zwei Masten. Die Nummer (J60 bis J130) steht für die Grösse: grössere Nummer, kräftigeres Joch.' },
  mast: { titel: 'Mast', text: 'Die Stütze neben dem Gleis. Sie trägt Joch oder Ausleger und leitet alle Kräfte in das Fundament. Das Profil (z. B. HEB 260) bestimmt, wie kräftig der Mast ist.' },
  anker: { titel: 'Abspannung (Anker)', text: 'Ein Seil (Zuganker) oder eine Stütze (Druckstütze) schräg vom Masten zum Boden. Sie nimmt dem Masten einen Teil der Kraft ab, wenn er allein zu schwach wäre.' },
  fundament: { titel: 'Fundament', text: 'Der Betonblock im Boden unter dem Masten. Jeder Fundamenttyp verträgt bestimmte Kräfte; die Ausnutzung zeigt, wie viel davon gebraucht wird.' },
  ausnutzung: { titel: 'Ausnutzung', text: 'Wie viel der zulässigen Beanspruchung ein Bauteil braucht. 100 % heisst: genau an der Grenze. Über 100 % ist das Bauteil zu schwach - ein kräftigeres Bauteil oder eine Abspannung hilft.' },
  verformung: { titel: 'Verformung', text: 'Wie weit sich der Mast unter Wind zur Seite bewegt. Bewegt er sich zu viel, wandert der Fahrdraht gegenüber dem Stromabnehmer des Zuges.' },
  wind: { titel: 'Windzone', text: 'Wie stark der Wind am Standort angenommen wird. Zone 1 ist schwach, Zone 3 stark (z. B. Höhenlage, offenes Gelände).' },
  schnee: { titel: 'Schnee', text: 'Schnee auf Joch und Leitungen macht sie schwerer. In schneereichen Gegenden wird er mitgerechnet.' },
  spannweite: { titel: 'Abstand zum nächsten Masten', text: 'Die Fahrleitung spannt von Tragwerk zu Tragwerk entlang des Gleises. Je länger dieses Feld, desto mehr Gewicht und Wind hängt an jedem Tragwerk.' },
  radius: { titel: 'Kurvenradius', text: 'In einer Kurve zieht die Fahrleitung seitlich am Tragwerk. Je enger die Kurve (kleiner Radius), desto grösser dieser Zug. Ein gerades Gleis hat keinen.' },
  anbauteil: { titel: 'Anbauteile', text: 'Alles, was am Joch oder am Masten hängt: Hängestützen mit Fahrleitung, Ausleger, Leiter, Lampen. Sie bringen Gewicht, Wind und Zugkräfte auf das Tragwerk.' },
};

// Welches Feld welchen Begriff erklärt.
const FELD_BEGRIFF = {
  typ: 'joch', L: 'joch', abfangTyp: 'joch',
  mastProfil: 'mast', mastLaenge: 'mast',
  ankerTyp: 'anker',
  windKlasse: 'wind', schneeAktiv: 'schnee',
  flSpannweite: 'spannweite', trasseRadius: 'radius',
};
const GRUPPE_BEGRIFF = { traeger: 'joch', mast: 'mast', anker: 'anker',
                         fundament: 'fundament', verformung: 'verformung' };

export function begriffKnopf(key) {
  const b = BEGRIFFE[key];
  if (!b) return '';
  return `<button type="button" class="begriff-knopf" data-begriff="${esc(key)}"
    title="Was heisst «${esc(b.titel)}»?" aria-label="Erklärung: ${esc(b.titel)}">?</button>`;
}

/** Setzt in der Maske hinter die Bezeichnung der Felder ein «?». */
export function begriffeInMaske(container) {
  if (!container) return;
  container.querySelectorAll('[data-feld]').forEach((inp) => {
    const key = FELD_BEGRIFF[inp.dataset.feld];
    const label = inp.closest('.feld')?.querySelector('label');
    if (!key || !label || label.querySelector('.begriff-knopf')) return;
    label.insertAdjacentHTML('beforeend', ' ' + begriffKnopf(key));
  });
  const kopf = container.querySelector('[data-grp="anbau"] .grp-t');
  if (kopf && !kopf.querySelector('.begriff-knopf')) {
    kopf.insertAdjacentHTML('beforeend', ' ' + begriffKnopf('anbauteil'));
  }
}

let horcher = false;
/** Ein Horcher für die ganze Seite: Klick auf «?» zeigt die Erklärung daneben. */
export function begriffeVerdrahten() {
  if (horcher || typeof document === 'undefined') return;
  horcher = true;
  document.addEventListener('click', (e) => {
    const k = e.target instanceof Element ? e.target.closest('[data-begriff]') : null;
    const alt = document.querySelector('.begriff-pop');
    if (!k) {
      if (alt && !(e.target instanceof Element && e.target.closest('.begriff-pop'))) alt.remove();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    alt?.remove();
    const b = BEGRIFFE[k.dataset.begriff];
    if (!b) return;
    const pop = document.createElement('div');
    pop.className = 'begriff-pop';
    pop.setAttribute('role', 'dialog');
    pop.innerHTML = `<b>${esc(b.titel)}</b><p>${esc(b.text)}</p>`;
    document.body.appendChild(pop);
    const r = k.getBoundingClientRect();
    const breite = Math.min(300, window.innerWidth - 24);
    pop.style.width = `${breite}px`;
    pop.style.left = `${Math.max(12, Math.min(r.left, window.innerWidth - breite - 12))}px`;
    pop.style.top = `${r.bottom + 6 + window.scrollY}px`;
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelector('.begriff-pop')?.remove();
  });
}
