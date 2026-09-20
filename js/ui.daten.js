/**
 * ui.daten.js
 * ---------------------------------------------------------------------------
 * DAS FENSTER DER BAUTEILDATEN - Tabellen, Blecheinteilung, Einlesen.
 *
 * Weisungen vom 16. September: die hinterlegten Bauteile in Tabellen
 * aufführen, als eigenes, verdrahtetes Modul; die Daten strukturierter
 * machen, eine Logik der Blecheinteilung zeigen, das Einlesen umsetzen.
 *
 * >>> WAS DIESES MODUL IST UND WAS NICHT. <<<
 *
 * Es ist FORM: es nimmt einen Datenbestand und macht daraus Tabellen - auf
 * dem Schirm und als Blätter für Excel -, zeigt die Blecheinteilung und die
 * Vorschau eines Abgleichs. Dateien lesen, Stände anwenden, herunterladen -
 * das steht in app.js.
 *
 * >>> DIE TABELLEN SIND DIE DER DATEIEN. <<<
 *
 * Was hier steht, steht so in data/<sortiment>.json: dieselben Tabellen,
 * dieselben Spalten, dieselbe Reihenfolge. Eine Ansicht, die anders
 * gliederte als die Datei, müsste man beim Pflegen im Kopf übersetzen.
 *
 * >>> DIE EXCEL-MAPPE IST ZUM ZURUECKLESEN GEBAUT. <<<
 *
 * Jedes Blatt trägt über den Daten drei Zeilen: Anschrift, Einheit und den
 * SPALTENPFAD. Die ersten beiden sind für Menschen, die dritte ist für das
 * Einlesen - an ihr erkennt es, welche Spalte welches Feld ist, auch wenn
 * jemand Spalten umstellt. Das Blatt «Übersicht» sagt, welches Blatt welche
 * Tabelle trägt.
 * ---------------------------------------------------------------------------
 */

import { ABSCHNITTE, tabellenKatalog, spaltenVon, alsText, pruefeTabelle,
         datenbanken } from './data.katalog.js';
import { AUFBAU, zerlege, zelleAus } from './data.tabellen.js';
import { einteilung, einteilungAbfang, pruefeAlle,
         pruefeTragjoch, pruefeAbfangjoch } from './core.blechregel.js';
import { moeglicheLaengen } from './data.tragjoche.js';
import { abfangLaengen } from './data.abfangjoche.js';
import { blattname } from './export.xlsx.js';
import { esc } from './design.js';

/** Kurze Vorsilben für Blattnamen - Excel erlaubt nur 31 Zeichen. */
const KURZ = {
  normen: 'Normen', masten: 'Masten', tragjoche: 'Trag', abfangjoche: 'Abfang',
  anker: 'Anker', fl_bauteile: 'Lasten', anbauteile: 'Anbau',
};

/** Der Bestand in Tabellenform, je Sortiment. */
export function alsTabellen(best) {
  const aus = {};
  for (const db of datenbanken()) {
    if (best?.[db]) aus[db] = zerlege(db, best[db]);
  }
  return aus;
}

const zeilenVon = (tab, name) => (name === 'angaben'
  ? (tab?.angaben ?? []) : (tab?.tabellen?.[name] ?? []));

/* ===========================================================================
 * >>> DIE EXCEL-BLAETTER. <<<
 * ========================================================================= */
export const PFADZEILE = 5;

/**
 * @param {object} tabBestand  {db: Tabellenform}
 * @param {object} STIL        Stilnummern aus export.xlsx.js
 * @param {object} [pruefung]  {blech: Ergebnis von pruefeAlle()}
 */
export function blaetter(tabBestand, STIL, pruefung = null) {
  const T = (v) => ({ v, s: STIL.TEXT });
  const K = (v) => ({ v, s: STIL.KOPF });
  const B = (v) => ({ v, s: STIL.TITEL });
  const N = (v) => ({ v, s: STIL.NOTIZ });

  const deck = [
    [B('Bauteildaten · Vierendeel')],
    [N(`Ausgeleitet am ${new Date().toISOString().slice(0, 10)}. Jedes Blatt `
       + 'trägt über den Daten Anschrift, Einheit und Spaltenpfad; die Pfadzeile '
       + 'braucht das Einlesen - bitte nicht löschen. Zeilen und Spalten dürfen '
       + 'umgestellt, ergänzt und gelöscht werden.')],
    [],
    [K('Blatt'), K('Sortiment'), K('Tabelle'), K('Titel'), K('Herkunft'),
     K('Zeilen'), K('Pfadzeile')],
  ];
  const namen = new Set(['Übersicht', 'Prüfung']);
  const bl = [];
  for (const db of datenbanken()) {
    const tab = tabBestand[db];
    if (!tab) continue;
    for (const t of tabellenKatalog(db)) {
      const zeilen = zeilenVon(tab, t.name);
      let name = blattname(`${KURZ[db]} · ${t.titel}`);
      for (let k = 2; namen.has(name); k++) name = blattname(`${KURZ[db]} · ${t.titel}`.slice(0, 28) + ` ${k}`);
      namen.add(name);
      const sp = spaltenVon(db, t.name, zeilen);
      deck.push([T(name), T(db), T(t.name), T(t.titel),
                 T(t.herkunft === 'norm' ? 'Norm' : 'Sortiment'),
                 T(zeilen.length), T(PFADZEILE)]);
      bl.push({
        name,
        rows: [
          [B(`${AUFBAU[db].titel} · ${t.titel}`)],
          [N((t.herkunft === 'norm' ? 'Normwerte - keine Betreiberdaten. '
                                    : 'Sortiment des Betreibers. ') + (t.notiz ?? ''))],
          sp.map((s) => K(s.kopf)),
          sp.map((s) => N(s.feld.einheit ?? '')),
          sp.map((s) => N(s.pfad)),
          ...zeilen.map((z) => sp.map((s) => {
            const v = zelleAus(z[s.pfad]);
            return v === null ? null : { v, s: STIL.TEXT };
          })),
        ],
        breiten: sp.map((s) => Math.min(40, Math.max(8, s.kopf.length + 2))),
      });
    }
  }
  const aus = [{ name: 'Übersicht', rows: deck, breiten: [30, 12, 22, 28, 11, 8, 10] }, ...bl];

  if (pruefung?.blech) {
    const rows = [
      [B('Prüfung der Blecheinteilung')],
      [N('Die Regel ist die des Rechenkerns; ein Befund ist eine Auskunft, '
         + 'keine Korrektur. Dieses Blatt wird beim Einlesen übergangen.')],
      [],
      [K('Typ'), K('Stufe'), K('Befund')],
    ];
    for (const p of pruefung.blech) {
      for (const [art, liste] of [['Fehler', p.fehler], ['Warnung', p.warnung],
                                  ['Hinweis', p.hinweis]]) {
        for (const x of liste) rows.push([T(p.typ), T(art), T(x)]);
      }
    }
    aus.push({ name: 'Prüfung', rows, breiten: [16, 10, 120] });
  }
  return aus;
}

/* ===========================================================================
 * >>> DIE ANSICHT. <<<
 * ========================================================================= */

/** Die Leiste links: Sortimente mit ihren Tabellen, dann die Prüfungen. */
function leiste(tabBestand, aktiv, befunde) {
  const eintrag = (key, titel, zahl, klasse = '') => `
    <button type="button" class="dat-eintrag${key === aktiv ? ' an' : ''}${klasse}"
            data-ansicht="${esc(key)}">
      <span class="dat-titel">${esc(titel)}</span>
      <span class="dat-zahl">${zahl}</span>
    </button>`;
  const gruppe = (titel, hinweis, inhalt) => `
    <div class="dat-gruppe">
      <div class="dat-gruppe-kopf">${esc(titel)}</div>
      ${hinweis ? `<div class="dat-gruppe-hinweis">${esc(hinweis)}</div>` : ''}
      ${inhalt}
    </div>`;
  const sortiment = (db) => {
    const tab = tabBestand[db];
    if (!tab) {
      return `<div class="dat-sortiment leer">${esc(AUFBAU[db].titel)}
        <span class="dat-zahl">—</span></div>`;
    }
    const kat = tabellenKatalog(db);
    const einzeln = kat.filter((t) => t.name !== 'angaben').length === 1;
    return `<div class="dat-sortiment">
      ${db === 'normen' ? '' : `<div class="dat-sortiment-kopf">${esc(AUFBAU[db].titel)}</div>`}
      ${kat.map((t) => eintrag(`tabelle:${db}:${t.name}`,
        einzeln && t.haupt ? 'Sätze' : t.titel,
        zeilenVon(tab, t.name).length,
        t.haupt ? ' haupt' : (t.name === 'angaben' ? ' neben' : ' unter'))).join('')}
    </div>`;
  };
  const f = befunde ? befunde.reduce((s, p) => s + p.fehler.length, 0) : 0;
  const w = befunde ? befunde.reduce((s, p) => s + p.warnung.length, 0) : 0;
  return gruppe('Normwerte', 'Profiltabellen und Stahlgüten. Liegen in der Ablage bei.',
                sortiment('normen'))
    + gruppe('Sortiment', 'Die Zahlen des Betreibers. Kommen als Datenpaket.',
             datenbanken().filter((d) => d !== 'normen').map(sortiment).join(''))
    + gruppe('Prüfen', null,
             eintrag('einteilung', 'Blecheinteilung',
                     befunde ? (f ? `${f} F` : (w ? `${w} W` : '✓')) : '—',
                     f ? ' schlecht' : (w ? ' warn' : '')));
}

/** Eine Tabelle. */
function tabelle(tabBestand, db, name, filter = '') {
  const tab = tabBestand[db];
  const t = tabellenKatalog(db).find((x) => x.name === name);
  if (!tab || !t) {
    return '<p class="notiz">Nicht geladen. Das Sortiment kommt als Datenpaket '
         + '(Optionen · Datenbasis) oder über «Einlesen».</p>';
  }
  const zeilen = zeilenVon(tab, name);
  const sp = spaltenVon(db, name, zeilen);
  const pr = pruefeTabelle(db, name, zeilen);
  const meldung = (art, liste) => (liste.length ? `
    <details class="dat-meldung ${art}">
      <summary>${liste.length} ${art === 'fehler' ? 'Fehler' : 'Hinweis(e)'}
        aus der Prüfung gegen den Feldkatalog</summary>
      <ul>${liste.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>` : '');
  const eltern = t.eltern ? tabellenKatalog(db).find((x) => x.name === t.eltern) : null;
  const schl = sp.filter((s) => s.schluessel).map((s) => s.pfad);
  return `
    <div class="dat-kopf">
      <h3>${esc(t.titel)}
        <span class="dat-herkunft ${t.herkunft}">${t.herkunft === 'norm' ? 'Norm' : 'Sortiment'}</span>
        <span class="dat-datei">data/${esc(db)}.json · ${esc(name)}</span></h3>
      ${t.notiz ? `<p class="notiz">${esc(t.notiz)}</p>` : ''}
      <p class="notiz">${zeilen.length} Zeilen · ${sp.length} Spalten${eltern
        ? ` · gehört zu «${esc(eltern.titel)}» über ${t.bezug
            .map((k) => `«${esc(k)}»`).join(', ')}` : ''}${t.teil
        ? ` · unterschieden nach «${esc(t.teil)}»` : ''}</p>
      <div class="dat-werkzeug">
        <input type="search" class="dat-suche" placeholder="Zeilen filtern …"
               value="${esc(filter)}" aria-label="Zeilen filtern">
      </div>
      ${meldung('fehler', pr.fehler)}
      ${meldung('warnung', pr.warnung)}
    </div>
    <div class="dat-tabelle-rahmen">
      <table class="dat-tabelle">
        <thead>
          <tr>${sp.map((s) => `<th class="${s.schluessel ? 'schl' : ''}"${s.feld.notiz
            ? ` title="${esc(s.feld.notiz)}"` : ''}>${esc(s.kopf)}</th>`).join('')}</tr>
          <tr class="dat-einheit">${sp.map((s) =>
            `<th title="${esc(s.pfad)}">${esc(s.feld.einheit ?? '')}</th>`).join('')}</tr>
        </thead>
        <tbody>${zeilen.map((z) => {
          const such = schl.map((k) => z[k] ?? '').join(' ').toLowerCase();
          const zeigen = !filter || such.includes(filter.toLowerCase());
          return `<tr data-such="${esc(such)}"${zeigen ? '' : ' hidden'}>${sp.map((s) => {
            const txt = alsText(z[s.pfad], s.feld);
            /*
             * EINE LEERE ZELLE IST EINE AUSSAGE. Die Lasttabelle sagt
             * ausdrücklich: leere Felder werden NICHT interpoliert.
             */
            return `<td class="${txt === '' ? 'leer' : ''}${s.feld.typ === 'zahl' ? ' zahl' : ''}${
              s.schluessel ? ' schl' : ''}">${txt === '' ? '·' : esc(txt)}</td>`;
          }).join('')}</tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
}

/* ---------------------------------------------------------------------------
 * DIE BLECHEINTEILUNG.
 * ------------------------------------------------------------------------- */
const mmZahl = (v) => (Number.isFinite(v) ? String(v) : '');
const blechText = (b) => (b ? `Pos. ${b.pos} · ${mmZahl(b.breite)}×${mmZahl(b.dicke)}×${mmZahl(b.laenge)}` : '—');

function befundListe(p) {
  const zeile = (art, x) => `<li class="${art}"><b>${
    { fehler: 'Fehler', warnung: 'Warnung', hinweis: 'Hinweis' }[art]}</b> ${esc(x)}</li>`;
  const alle = [...p.fehler.map((x) => zeile('fehler', x)),
                ...p.warnung.map((x) => zeile('warnung', x)),
                ...p.hinweis.map((x) => zeile('hinweis', x))];
  return alle.length ? `<ul class="dat-befunde">${alle.join('')}</ul>`
                     : '<p class="notiz">Keine Befunde - die Daten passen zu sich selbst.</p>';
}

/**
 * @param {object} opt  {tragjoche, abfangjoche, typ, L, befunde}
 */
function einteilungAnsicht(opt) {
  const tj = opt.tragjoche ?? [];
  const aj = (opt.abfangjoche ?? []).filter((a) => abfangLaengen(a).length);
  const alle = [...tj.map((j) => ({ art: 'tragjoch', typ: j.typ, satz: j })),
                ...aj.map((a) => ({ art: 'abfangjoch', typ: a.typ, satz: a }))];
  if (!alle.length) {
    return '<p class="notiz">Keine Joch- oder Abfangjochtypen geladen.</p>';
  }
  const wahl = alle.find((x) => x.typ === opt.typ) ?? alle[0];
  const laengen = wahl.art === 'tragjoch'
    ? moeglicheLaengen(wahl.satz).map((x) => x.wert) : abfangLaengen(wahl.satz);
  const L = laengen.includes(opt.L) ? opt.L
    : (laengen.find((x) => x >= 12) ?? laengen[0]);
  const p = wahl.art === 'tragjoch' ? pruefeTragjoch(wahl.satz) : pruefeAbfangjoch(wahl.satz);

  let koerper;
  if (wahl.art === 'tragjoch') {
    const e = einteilung(wahl.satz, L);
    const stueck = (eb) => Object.entries(e.stueck[eb]).map(([pos, n]) =>
      `${n} × Pos. ${esc(pos)}`).join(' · ') || '—';
    koerper = `
      <dl class="dat-regel">
        <dt>Endfeld</dt><dd>${(e.endfeld * 1000).toFixed(0)} mm (Blechteilung des Typs)</dd>
        <dt>Feldweiten</dt><dd>${e.quelle === 'masstabelle'
          ? `aus der Masstabelle, Zeile ${L.toFixed(2)} m (A_1 in Jochmitte)`
          : (e.masstabelle ? 'Zeile vorhanden, geht aber nicht auf - gleichmässig geteilt'
                           : 'keine Zeile in der Masstabelle - gleichmässig geteilt')}</dd>
        <dt>Staffelung</dt><dd>${e.mitBlechen
          ? (e.ausfuehrung ? `Ausführung ${esc(e.ausfuehrung)}` : 'die des Typs')
          : 'keine hinterlegt'}</dd>
        <dt>Stationen</dt><dd>${e.anzahl}${e.mitteOhneBlech
          ? ' - gerade Feldzahl, in Jochmitte steht kein Blech' : ''}</dd>
        <dt>Stückzahl vertikal</dt><dd>${stueck('vertikal')}</dd>
        <dt>Stückzahl horizontal</dt><dd>${stueck('horizontal')}</dd>
      </dl>
      <div class="dat-tabelle-rahmen">
        <table class="dat-tabelle">
          <thead><tr><th>Nr.</th><th>x</th><th>Feld</th><th>ab Auflager</th>
            <th>vertikal</th><th>Stufe</th><th>horizontal</th><th>Stufe</th></tr>
            <tr class="dat-einheit"><th></th><th>m</th><th>m</th><th>Station</th>
            <th>b × t × l mm</th><th></th><th>b × t × l mm</th><th></th></tr></thead>
          <tbody>${e.stationen.map((s) => `<tr>
            <td class="zahl">${s.nr}</td><td class="zahl">${s.x.toFixed(3)}</td>
            <td class="zahl">${s.feld === null ? '·' : s.feld.toFixed(3)}</td>
            <td class="zahl">${s.vomAuflager}</td>
            <td>${blechText(s.vertikal)}</td>
            <td class="zahl">${s.vertikal ? s.vertikal.stufe + 1 : '·'}</td>
            <td>${blechText(s.horizontal)}</td>
            <td class="zahl">${s.horizontal ? s.horizontal.stufe + 1 : '·'}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>`;
  } else {
    const e = einteilungAbfang(wahl.satz, L);
    koerper = e ? `
      <dl class="dat-regel">
        <dt>Stationen</dt><dd>${e.anzahl}${e.quersteifen
          ? `, davon ${e.quersteifen} mit Quersteife` : ''}</dd>
        <dt>Stückliste</dt><dd>${e.stationenListe ?? '—'} Stationen${
          e.blechzahlStimmt === false ? ' - WEICHT AB' : (e.blechzahlStimmt ? ' - stimmt' : '')}</dd>
        <dt>Vierendeel-Bereiche</dt><dd>${e.bereiche.map((b) =>
          `${b.nr}: ${b.laenge.toFixed(2)} m`).join(' · ')}</dd>
      </dl>
      <div class="dat-tabelle-rahmen">
        <table class="dat-tabelle">
          <thead><tr><th>Nr.</th><th>x</th><th>Feld</th><th>Art</th><th>Blech / Profil</th></tr>
            <tr class="dat-einheit"><th></th><th>m</th><th>m</th><th></th><th>b / t × l mm</th></tr></thead>
          <tbody>${e.stationen.map((s) => `<tr>
            <td class="zahl">${s.nr}</td><td class="zahl">${s.x.toFixed(3)}</td>
            <td class="zahl">${s.feld === null ? '·' : s.feld.toFixed(3)}</td>
            <td>${esc({ regel: 'Regelblech', endeL: 'Endblech links',
                        endeR: 'Endblech rechts', steife: 'Quersteife',
                        steifeEnde: 'Quersteife am Ende' }[s.art] ?? s.art)}</td>
            <td>${s.masse ? `${mmZahl(s.masse.b)} / ${mmZahl(s.masse.t)} × ${mmZahl(s.masse.l)}`
                          : esc(s.profil ?? '')}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>` : '<p class="notiz">Für diese Länge lässt sich keine Einteilung legen.</p>';
  }

  const befunde = opt.befunde ?? pruefeAlle();
  const uebersicht = `
    <details class="dat-alle"${opt.alleOffen ? ' open' : ''}>
      <summary>Alle Typen im Überblick</summary>
      <table class="dat-tabelle">
        <thead><tr><th>Typ</th><th>Längen</th><th>Fehler</th><th>Warnungen</th><th>Hinweise</th></tr></thead>
        <tbody>${befunde.map((b) => `<tr${b.typ === wahl.typ ? ' class="an"' : ''}
            ${b.art !== 'masstabelle' ? `data-regel-typ="${esc(b.typ)}"` : ''}>
          <td>${esc(b.typ)}</td><td class="zahl">${b.laengen.length}</td>
          <td class="zahl${b.fehler.length ? ' schlecht' : ''}">${b.fehler.length || '·'}</td>
          <td class="zahl${b.warnung.length ? ' warn' : ''}">${b.warnung.length || '·'}</td>
          <td class="zahl">${b.hinweis.length || '·'}</td></tr>`).join('')}</tbody>
      </table>
      ${befunde.filter((b) => b.art === 'masstabelle').map(befundListe).join('')}
    </details>`;

  return `
    <div class="dat-kopf">
      <h3>Blecheinteilung</h3>
      <p class="notiz">Die Regel des Rechenkerns, sichtbar gemacht: Endfeld,
        Feldweiten aus der Masstabelle, Blech je Station aus der Staffelung. Hier
        wird nichts hergeleitet - so, wie es hier steht, wird gerechnet.</p>
      <div class="dat-werkzeug">
        <label>Typ <select data-regel-wahl="typ">
          ${tj.length ? `<optgroup label="Tragjoche">${tj.map((j) =>
            `<option value="${esc(j.typ)}"${j.typ === wahl.typ ? ' selected' : ''}>${esc(j.typ)}</option>`).join('')}</optgroup>` : ''}
          ${aj.length ? `<optgroup label="Abfangjoche">${aj.map((a) =>
            `<option value="${esc(a.typ)}"${a.typ === wahl.typ ? ' selected' : ''}>${esc(a.typ)}</option>`).join('')}</optgroup>` : ''}
        </select></label>
        <label>Länge <select data-regel-wahl="L">
          ${laengen.map((x) => `<option value="${x}"${x === L ? ' selected' : ''}>${x.toFixed(2)} m</option>`).join('')}
        </select></label>
      </div>
      ${befundListe(p)}
    </div>
    ${koerper}
    ${uebersicht}`;
}

/* ===========================================================================
 * >>> DAS GANZE FENSTER. <<<
 * ========================================================================= */

/**
 * @param {object} best  der Bestand in Baumform, je Sortiment
 * @param {string} aktiv 'tabelle:<db>:<name>' oder 'einteilung'
 * @param {object} opt   {filter, regel: {typ, L}, eingelesen, tragjoche,
 *                        abfangjoche, befunde}
 */
export function zeichneDaten(best, aktiv, opt = {}) {
  const tb = opt.tabellen ?? alsTabellen(best);
  let inhalt;
  if (aktiv === 'einteilung') {
    inhalt = einteilungAnsicht({ ...opt.regel, tragjoche: opt.tragjoche,
                                 abfangjoche: opt.abfangjoche, befunde: opt.befunde });
  } else {
    const [, db, name] = String(aktiv).split(':');
    inhalt = tabelle(tb, db, name, opt.filter ?? '');
  }
  const e = opt.eingelesen;
  const banner = e?.stand ? `
    <div class="dat-banner">
      <b>Eingelesener Stand gilt</b> - seit ${esc(new Date(e.stand).toLocaleString('de-CH'))}${
        e.quelle ? `, aus «${esc(e.quelle)}»` : ''}, für
      ${Object.keys(e.teile ?? {}).map((d) => esc(AUFBAU[d]?.titel ?? d)).join(', ')}.
      Die Dateien neben der Anwendung sind davon unberührt.
      <span class="dat-banner-knoepfe">
        <button type="button" class="btn btn-mini" data-eingelesen="sichern">Als Dateien sichern</button>
        <button type="button" class="btn btn-mini" data-eingelesen="verwerfen">Verwerfen</button>
      </span>
    </div>` : '';
  return `${banner}<div class="dat-rahmen">
    <div class="dat-leiste">${leiste(tb, aktiv, opt.befunde)}</div>
    <div class="dat-inhalt">${inhalt}</div>
  </div>`;
}

/** Die erste Tabelle, die Zeilen hat - damit das Fenster nie leer aufgeht. */
export function ersteAnsicht(best) {
  for (const a of ABSCHNITTE) {
    if (best?.[a.db]) return `tabelle:${a.db}:${a.tabelle}`;
  }
  return 'einteilung';
}

/* ===========================================================================
 * >>> DIE VORSCHAU EINES ABGLEICHS. <<<
 * ========================================================================= */
const wertText = (v) => (v === undefined ? '—' : (v === null ? 'leer'
  : (typeof v === 'object' ? JSON.stringify(v) : String(v))));

/**
 * @param {object[]} ergebnisse  je Sortiment das Ergebnis von `abgleich`
 * @param {object} info          {datei, quelle, hinweise}
 */
export function zeichneAbgleich(ergebnisse, info = {}) {
  const gesamt = ergebnisse.reduce((s, r) => s + r.aenderungen, 0);
  const fehler = ergebnisse.filter((r) => r.aenderungen)
    .flatMap((r) => r.pruefung.fehler.map((x) => `${r.titel}: ${x}`));
  // Befunde in Sortimenten, die sich nicht ändern: bestehend, nicht sperrend
  const bestehend = ergebnisse.filter((r) => !r.aenderungen)
    .flatMap((r) => r.pruefung.fehler.map((x) => `${r.titel}: ${x}`));
  const warn = ergebnisse.flatMap((r) => r.pruefung.warnung.map((x) => `${r.titel}: ${x}`));
  const geprueft = ergebnisse.flatMap((r) => r.geprueft.map((k) => `${r.titel} · ${k}`));
  const ZEIGEN = 40;
  const idText = (e) => {
    try { return JSON.parse(e.id.replace(/#\d+$/, '')).filter((x) => x !== null).join(' · '); }
    catch { return e.id; }
  };
  /*
   * >>> KURZ OBEN, EINZELHEITEN AUF KLICK (Weisung, 20. September). <<<
   *
   * «das einlesen der daten ist etwas komplizier, können wir dies
   * vereinfachen.» Der Bericht zeigte je Sortiment eine Tabelle, auch die
   * mit null Aenderungen - bei einer vollen Mappe sieben Tabellen, durch
   * die man scrollen musste, um die eine Zeile zu finden, die sich
   * bewegt.
   *
   * Jetzt steht oben, WAS sich aendert, und darunter nur noch das. Was
   * SPERRT (Fehler) und was die stehende Vorgabe beruehrt (geprüfte
   * Saetze) bleibt offen - das soll niemand aufklappen muessen.
   */
  const mitAend = ergebnisse.filter((r) => r.aenderungen);
  const ohneAend = ergebnisse.filter((r) => !r.aenderungen);
  return `
    <p>Datei <b>${esc(info.datei ?? '')}</b> (${info.quelle === 'excel' ? 'Excel' : 'JSON'}) ·
      <b>${gesamt}</b> Änderung(en) in ${mitAend.length} von
      ${ergebnisse.length} Sortiment(en).</p>
    ${mitAend.length ? `<p class="notiz">${mitAend.map((r) =>
      `${esc(r.titel)} <b>${r.aenderungen}</b>`).join(' · ')}</p>` : ''}
    ${(info.hinweise ?? []).length ? `<ul class="dat-befunde">${info.hinweise.map((x) =>
      `<li class="hinweis">${esc(x)}</li>`).join('')}</ul>` : ''}
    ${fehler.length ? `<div class="dat-meldung fehler offen"><b>${fehler.length} Fehler -
      so lässt sich der Stand nicht übernehmen.</b><ul>${fehler.slice(0, 30).map((x) =>
      `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    ${bestehend.length ? `<details class="dat-meldung"><summary>${bestehend.length}
      bestehende(r) Befund(e) in unveränderten Sortimenten - sie sperren nichts</summary>
      <ul>${bestehend.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
    ${geprueft.length ? `<div class="dat-meldung warnung offen"><b>Geprüfte Sätze ändern sich:</b>
      ${geprueft.map(esc).join(', ')}. Die stehende Vorgabe verlangt, die Geometrie
      der Jochträger im Detail zu übernehmen - bitte gegen die Zeichnung prüfen.</div>` : ''}
    ${warn.length ? `<details class="dat-meldung warnung"><summary>${warn.length} Hinweis(e)
      aus der Prüfung</summary><ul>${warn.slice(0, 60).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
    ${mitAend.map((r) => `
      <details class="dat-abgleich-teil"${mitAend.length === 1 ? ' open' : ''}>
      <summary class="dat-abgleich-kopf">${esc(r.titel)} <span class="dat-zahl">${r.aenderungen} Änderung(en)</span></summary>
      <table class="dat-tabelle dat-abgleich">
        <thead><tr><th>Tabelle</th><th>neu</th><th>geändert</th><th>entfernt</th><th>gleich</th></tr></thead>
        <tbody>${r.tabellen.map((t) => `<tr>
          <td>${esc(t.titel)}${t.uebernommen ? ' <span class="notiz">(nicht in der Datei - bleibt)</span>' : ''}</td>
          <td class="zahl${t.neu.length ? ' neu' : ''}">${t.neu.length || '·'}</td>
          <td class="zahl${t.geaendert.length ? ' warn' : ''}">${t.geaendert.length || '·'}</td>
          <td class="zahl${t.entfernt.length ? ' schlecht' : ''}">${t.entfernt.length || '·'}</td>
          <td class="zahl">${t.uebernommen ? '·' : t.gleich}</td></tr>`).join('')}</tbody>
      </table>
      ${r.tabellen.filter((t) => t.neu.length + t.geaendert.length + t.entfernt.length)
        .map((t) => `<details class="dat-einzeln"><summary>${esc(t.titel)} - Einzelheiten</summary>
          <ul>
            ${t.neu.slice(0, ZEIGEN).map((e) => `<li class="neu">neu: <b>${esc(idText(e))}</b></li>`).join('')}
            ${t.entfernt.slice(0, ZEIGEN).map((e) => `<li class="schlecht">entfernt: <b>${esc(idText(e))}</b></li>`).join('')}
            ${t.geaendert.slice(0, ZEIGEN).map((e) => `<li class="warn">geändert: <b>${esc(idText(e))}</b>
              <ul>${e.felder.map((fd) => `<li><code>${esc(fd.pfad)}</code>:
                ${esc(wertText(fd.alt))} → <b>${esc(wertText(fd.neu))}</b></li>`).join('')}</ul></li>`).join('')}
            ${t.neu.length + t.entfernt.length + t.geaendert.length > 3 * ZEIGEN
              ? '<li class="notiz">… weitere nicht gezeigt</li>' : ''}
          </ul></details>`).join('')}
      </details>
    `).join('')}
    ${ohneAend.length ? `<p class="notiz">Ohne Änderung: ${ohneAend.map((r) =>
      esc(r.titel)).join(' · ')}.</p>` : ''}`;
}
