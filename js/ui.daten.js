/**
 * ui.daten.js
 * ---------------------------------------------------------------------------
 * DIE BAUTEILDATEN IN TABELLEN - ein eigenes Fenster, nur zum Ansehen und
 * Ausleiten.
 *
 * Weisung vom 16. September: «kannst du noch für die hinterlegten bauteile
 * anbauteile alle relevanten parameter werte in tabellen aufführen. diese
 * dienen dann auch für den import export der daten grundlagen und könnten
 * dann auch einfacher modifiziert werden in der app oder über die excel.
 * diese datenbank in der app sollte demnach ein separates modul sein, das
 * verdrahtet ist.»
 *
 * >>> WAS DIESES MODUL IST UND WAS NICHT. <<<
 *
 * Es ist FORM: es nimmt einen Datenbestand und den Feldkatalog
 * (js/data.katalog.js) und macht daraus Tabellen - auf dem Schirm und als
 * Blätter für die Excel-Ausleitung. Beide aus derselben Spaltenliste, damit
 * das Blatt zeigt, was der Schirm zeigt.
 *
 * Es ist KEINE Handlung: Dateien lesen, Pakete anwenden, herunterladen -
 * das steht in app.js. Dieselbe Trennung wie zwischen ui.js und app.js, und
 * aus demselben Grund: eine Ansicht, die nebenbei Zustand ändert, lässt sich
 * nicht prüfen.
 *
 * >>> WARUM NUR ANSEHEN. <<<
 *
 * Die stehende Vorgabe des Auftraggebers lautet: «Die Geometrie der
 * Jochträger (neu wie alt) ist im Detail zu übernehmen - eine Anpassung der
 * Blecheinteilung ist nicht zulässig.» Eine Maske, in der man Blechbreiten
 * überschreiben kann, stünde quer dazu. Die Sätze sind deshalb sichtbar,
 * durchsuchbar und ausleitbar - aber nicht überschreibbar. Wer etwas ändern
 * will, ändert die Datei und liest sie als Paket wieder ein; dann läuft die
 * Änderung durch die Prüfung des Katalogs.
 *
 * >>> VERSCHACHTELTES WIRD AUFGEFALTET, NICHT ZUSAMMENGEQUETSCHT. <<<
 *
 * Ein Satz von Werten mit bekannten Feldern - die Windlast je
 * Einwirkungsklasse etwa - wird zu EINER SPALTE JE WERT: «Wind quer · EK2».
 * So steht in jeder Zelle eine Zahl, und das Blatt lässt sich rechnen.
 *
 * Was sich nicht auffalten lässt, wird GEZAEHLT statt ausgeschrieben: eine
 * Blechliste je Länge gehört nicht in eine Tabellenzelle. Dort steht dann
 * «5 Einträge» - eine ehrliche Auskunft, keine Attrappe.
 * ---------------------------------------------------------------------------
 */

import { ABSCHNITTE, abschnitt, saetze, alsText,
         pruefeAbschnitt } from './data.katalog.js';
import { esc } from './design.js';

/* ---------------------------------------------------------------------------
 * DIE SPALTEN EINES ABSCHNITTS.
 *
 * Eine Spalte ist {kopf, einheit, hol, feld}. `hol` zieht den Wert aus dem
 * Satz - bei aufgefalteten Feldern über mehrere Ebenen.
 * ------------------------------------------------------------------------- */
export function spalten(a) {
  const aus = [];
  const gehe = (fd, pfad, kopf) => {
    /*
     * NUR EIN SATZ MIT BEKANNTEN FELDERN WIRD AUFGEFALTET. Steht im Katalog
     * kein `unter`, sind die Schlüssel frei - etwa die Schneelast des
     * Jochs, deren Schlüssel der Referenzwert ist. Solche Sätze bekommen
     * eine Spalte mit Zusammenfassung; eine Spalte je Schlüssel hiesse, die
     * Tabelle nach dem ersten Satz zu formen.
     */
    if (fd.typ === 'satz' && Array.isArray(fd.unter)) {
      fd.unter.forEach((u) => gehe(u, [...pfad, fd.k], `${kopf} · ${u.label}`));
      return;
    }
    aus.push({
      kopf,
      einheit: fd.einheit ?? null,
      feld: fd,
      hol: (satz) => {
        let v = satz;
        for (const k of pfad) v = v?.[k];
        return v?.[fd.k];
      },
    });
  };
  a.felder.forEach((fd) => gehe(fd, [], fd.label));
  return aus;
}

/** Ein Abschnitt als Zeilen: erste Zeile Kopf, zweite Einheiten, dann Werte. */
export function zeilen(best, key) {
  const a = abschnitt(key);
  if (!a) return [];
  const sp = spalten(a);
  const daten = saetze(best, key);
  return [
    sp.map((s) => s.kopf),
    sp.map((s) => s.einheit ?? ''),
    ...daten.map((satz) => sp.map((s) => alsText(s.hol(satz), s.feld))),
  ];
}

/* ---------------------------------------------------------------------------
 * DIE BLAETTER FUER DIE EXCEL-AUSLEITUNG.
 *
 * Ein Blatt je Abschnitt, dazu ein Deckblatt, das sagt, woher die Zahlen
 * stammen und welche davon Betreiberdaten sind. Ein Blatt ohne diese
 * Auskunft wanderte sonst weiter, ohne dass jemand die Herkunft noch
 * zuordnen könnte.
 *
 * @param {object} best  der Datenbestand
 * @param {object} STIL  die Stilnummern aus export.xlsx.js
 * @returns {{name:string, rows:Array, breiten?:number[]}[]}
 * ------------------------------------------------------------------------- */
export function blaetter(best, STIL) {
  const T = (v) => ({ v, s: STIL.TEXT });
  const K = (v) => ({ v, s: STIL.KOPF });
  const B = (v) => ({ v, s: STIL.TITEL });
  const N = (v) => ({ v, s: STIL.NOTIZ });

  const deck = [
    [B('Bauteildaten des Tragjoch-Werkzeugs')],
    [N('Ein Blatt je Abschnitt. Kopfzeile und Einheit stammen aus dem '
       + 'Feldkatalog der Anwendung.')],
    [],
    [K('Abschnitt'), K('Herkunft'), K('Sätze'), K('Anmerkung')],
  ];

  const bl = [];
  for (const a of ABSCHNITTE) {
    if (!best?.[a.db]) continue;
    const daten = saetze(best, a.key);
    deck.push([T(a.titel),
               T(a.herkunft === 'norm' ? 'Norm' : 'Sortiment'),
               T(daten.length), T(a.notiz ?? '')]);
    const z = zeilen(best, a.key);
    if (!z.length) continue;
    const [kopf, einh, ...rest] = z;
    bl.push({
      name: a.titel.slice(0, 31),
      rows: [
        [B(a.titel)],
        [N(a.herkunft === 'norm'
          ? 'Normwerte — keine Betreiberdaten.'
          : 'Sortiment des Betreibers.')],
        ...(a.notiz ? [[N(a.notiz)]] : []),
        [],
        kopf.map(K),
        einh.map(N),
        ...rest.map((r) => r.map(T)),
      ],
      // Die erste Spalte trägt den Namen und ist meist die längste.
      breiten: kopf.map((_, i) => (i === 0 ? 26 : 14)),
    });
  }
  deck.push([]);
  deck.push([N('«Norm» heisst: die Zahlen stehen in einer Profilnorm oder in '
             + 'der SIA 263 und gehören keinem Betreiber. «Sortiment» heisst: '
             + 'sie stammen aus den Unterlagen des Betreibers.')]);
  return [{ name: 'Übersicht', rows: deck, breiten: [26, 14, 8, 60] }, ...bl];
}

/* ---------------------------------------------------------------------------
 * DIE ANSICHT.
 * ------------------------------------------------------------------------- */

/** Die Liste der Abschnitte, nach Herkunft gegliedert. */
function leiste(best, aktiv) {
  const gruppe = (herkunft, titel, hinweis) => {
    const teil = ABSCHNITTE.filter((a) => a.herkunft === herkunft);
    if (!teil.length) return '';
    return `<div class="dat-gruppe">
      <div class="dat-gruppe-kopf">${esc(titel)}</div>
      <div class="dat-gruppe-hinweis">${esc(hinweis)}</div>
      ${teil.map((a) => {
        const da = Boolean(best?.[a.db]);
        const n = da ? saetze(best, a.key).length : 0;
        return `<button type="button" class="dat-eintrag${
                  a.key === aktiv ? ' an' : ''}${da ? '' : ' leer'}"
            data-abschnitt="${esc(a.key)}"${da ? '' : ' disabled'}>
          <span class="dat-titel">${esc(a.titel)}</span>
          <span class="dat-zahl">${da ? n : '—'}</span>
        </button>`;
      }).join('')}
    </div>`;
  };
  return gruppe('norm', 'Normwerte',
                'Profiltabellen und Stahlgüten. Liegen in der Ablage bei.')
       + gruppe('sortiment', 'Sortiment',
                'Die Zahlen des Betreibers. Kommen als Datenpaket.');
}

/** Eine Tabelle. */
function tabelle(best, key) {
  const a = abschnitt(key);
  if (!a) return '<p class="notiz">Kein Abschnitt gewählt.</p>';
  if (!best?.[a.db]) {
    return `<p class="notiz">«${esc(a.titel)}» ist nicht geladen. `
         + 'Das Sortiment kommt als Datenpaket (Optionen · Datenbasis).</p>';
  }
  const sp = spalten(a);
  const daten = saetze(best, a.key);
  const pr = pruefeAbschnitt(best, key);

  const meldung = (art, liste) => {
    if (!liste.length) return '';
    return `<details class="dat-meldung ${art}">
      <summary>${liste.length} ${art === 'fehler' ? 'Fehler' : 'Hinweis(e)'}
        aus der Prüfung gegen den Feldkatalog</summary>
      <ul>${liste.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`;
  };

  return `
    <div class="dat-kopf">
      <h3>${esc(a.titel)}
        <span class="dat-herkunft ${a.herkunft}">${
          a.herkunft === 'norm' ? 'Norm' : 'Sortiment'}</span></h3>
      ${a.notiz ? `<p class="notiz">${esc(a.notiz)}</p>` : ''}
      <p class="notiz">${daten.length} Sätze · ${sp.length} Felder</p>
      ${meldung('fehler', pr.fehler)}
      ${meldung('warnung', pr.warnung)}
    </div>
    <div class="dat-tabelle-rahmen">
      <table class="dat-tabelle">
        <thead>
          <tr>${sp.map((s) => `<th${s.feld.notiz
              ? ` title="${esc(s.feld.notiz)}"` : ''}>${esc(s.kopf)}</th>`).join('')}</tr>
          <tr class="dat-einheit">${sp.map((s) =>
            `<th>${esc(s.einheit ?? '')}</th>`).join('')}</tr>
        </thead>
        <tbody>${daten.map((satz) => `<tr>${sp.map((s) => {
          const t = alsText(s.hol(satz), s.feld);
          /*
           * EINE LEERE ZELLE IST EINE AUSSAGE. Die Lasttabelle sagt
           * ausdruecklich: leere Felder werden NICHT interpoliert. Sie
           * bekommt deshalb ein Zeichen, damit man sie nicht fuer ein
           * Anzeigeversehen haelt.
           */
          return `<td class="${t === '' ? 'leer' : ''}${
            s.feld.typ === 'zahl' ? ' zahl' : ''}">${t === '' ? '·' : esc(t)}</td>`;
        }).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>`;
}

/**
 * Das ganze Fenster.
 *
 * @param {object} best   {normen, tragjoche, …}
 * @param {string} aktiv  Schlüssel des offenen Abschnitts
 */
export function zeichneDaten(best, aktiv) {
  return `<div class="dat-rahmen">
    <div class="dat-leiste">${leiste(best, aktiv)}</div>
    <div class="dat-inhalt" id="dat-inhalt">${tabelle(best, aktiv)}</div>
  </div>`;
}

/** Der erste Abschnitt, der Daten hat - damit das Fenster nie leer aufgeht. */
export function ersterAbschnitt(best) {
  return (ABSCHNITTE.find((a) => best?.[a.db] && saetze(best, a.key).length)
          ?? ABSCHNITTE[0]).key;
}
