/**
 * app.dialoge.js
 * ---------------------------------------------------------------------------
 * DIE DIALOGE ZU MAST, ANKER UND TRAGWERK.
 *
 * Seit dem 19. September ein eigenes Modul (Durchsicht vom 18. September,
 * Punkt A1: app.js teilen). Den Arbeitsstand bekommt es als app - das
 * Kontextobjekt aus app.js. Es importiert app.js nicht zurueck.
 * ---------------------------------------------------------------------------
 */
import { einzelmastLaenge } from './core.auflager.js';
import { TRAGWERKSARTEN, anschlusshoehe, gewaehlterMast, lageVon, mastName, mastenFuer, mastenVon, setzeMastAnker, tauscheAktives, tragwerkName, tragwerkPos, tragwerkeSortiert, tragwerkeVon, tragwerksart } from './core.constants.js';
import { abfangLaengenbereich, abfangjoche, getAbfangjoch, tragauslegerNaechsteLaenge,
         tragauslegerTypen } from './data.abfangjoche.js';
import { ANKER_BEFESTIGUNGEN, ankerTraegtDruck, ankerTypen } from './data.anker.js';
import { STEGRICHTUNGEN, mastprofile } from './data.masten.js';
import { getTragjoch, laengenbereich, tragjoche } from './data.tragjoche.js';
import { esc } from './design.js';
import { WIND_KLASSEN, ekVonWindklasse } from './core.lasten.js';
import { signalteile, signalFlaeche, SIGNAL_CW } from './data.anbauteile.js';
import { istBildUrl } from './data.katalog.js';
import { windAusFlaeche } from './data.fl.js';
import { istGerade } from './core.trasse.js';
import { abfangFuerStuetzweite } from './core.abfangjoch.js';

/* ===========================================================================
 * DER ZUGANKER ODER DIE DRUCKSTUETZE - IN EINEM FENSTER
 * ===========================================================================
 *
 * Weisung vom 11. September: «am besten in einem separatem modal wo
 * abgefragt wird welchen an welchem masten und wie angeordnet.»
 *
 * Drei Fragen, in dieser Reihenfolge, weil eine die naechste bestimmt:
 *
 *   1. AN WELCHEM MASTEN   ohne Masten gibt es keinen Anker
 *   2. WELCHER TYP         die Stuetze traegt Druck, das Seil nur Zug
 *   3. WIE ANGEORDNET      quer zum Gleis oder laengs, und auf welcher Seite
 *
 * >>> DIE ANORDNUNG IST DIE WICHTIGE FRAGE. <<<
 *
 * Ein Stab haelt nur die Richtung, in der er liegt. Steht er quer, waehrend
 * die grosse Kraft laengs zieht, haelt er rechnerisch NICHTS - und der
 * Nachweis sieht trotzdem gut aus, weil die Kraft am Mastfuss ankommt.
 * Deshalb stehen die vier Moeglichkeiten als KNOEPFE da, in den Worten des
 * Querprofils, und der Vorschlag folgt der Tragwerksart.
 * ========================================================================= */
export function dialogAnker(app, mastId = null) {
  const masten = mastenVon(app.werte);
  if (!masten.length) {
    app.dialog('Zuganker / Druckstütze',
      `<p class="notiz">Auf diesem Querprofil steht kein Mast. Ein Anker
         hängt an einem Masten — ohne Masten gibt es ihn nicht.</p>`,
      '<button class="btn" data-zu>Schliessen</button>');
    return;
  }
  // Vorbelegt: der angeklickte, sonst der angewaehlte, sonst der erste.
  let id = mastId ?? app.werte.mastAktiv ?? gewaehlterMast(app.werte)?.id
           ?? masten[0].id;
  const holen = () => mastenVon(app.werte).find((m) => m.id === id) ?? masten[0];
  /*
   * DER ENTWURF STEHT IM FENSTER, NICHT IM DATENSATZ. Geschrieben wird erst
   * beim «Setzen» - sonst haette ein abgebrochener Dialog den Anker schon
   * angelegt, und «Abbrechen» hiesse nichts.
   */
  const vorhanden = holen().anker ?? null;
  let e = { ...app.ANKER_STANDARD, richtung: app.ankerRichtungVor(app.werte),
            ...(vorhanden ?? {}) };
  if (!e.typ) e.typ = ankerTypen()[0]?.id ?? '';

  const LAGEN = [
    { r: 'y', s: 'plus',  t: 'Längs · vorn',
      k: 'in Gleisrichtung, Fundament auf der vorderen Seite' },
    { r: 'y', s: 'minus', t: 'Längs · hinten',
      k: 'in Gleisrichtung, Fundament auf der hinteren Seite' },
    { r: 'x', s: 'plus',  t: 'Quer · vom Gleis weg',
      k: 'in der Jochachse, Fundament vom Gleis weg' },
    { r: 'x', s: 'minus', t: 'Quer · zum Gleis hin',
      k: 'in der Jochachse, Fundament zum Gleis hin' },
  ];

  const folgeText = () => {
    const L = Math.sqrt((e.h || 0) ** 2 + (e.a || 0) ** 2);
    const al = (e.a > 0) ? (Math.atan2(e.h || 0, e.a) * 180) / Math.PI : 0;
    return `Daraus: Länge <b>${L.toFixed(2)} m</b> · Neigung gegen die `
      + `Waagrechte <b>${al.toFixed(1)}°</b>. Je flacher der Stab, desto `
      + 'wirksamer hält er — und desto länger wird er.';
  };

  const koerper = () => {
    const m = holen();
    const seil = (() => {
      try { return !ankerTraegtDruck(e.typ); } catch { return false; }
    })();
    return `
    <div class="feld"><label for="dlg-ank-mast">An welchem Masten</label>
      <select id="dlg-ank-mast">${mastenVon(app.werte).map((x, j) =>
        `<option value="${esc(x.id)}"${x.id === m.id ? ' selected' : ''}
          >${esc(mastName(app.werte, x) || `M${j + 1}`)} · ${esc(x.profil ?? 'ohne Profil')} · x ${
            x.x.toFixed(2)} m${x.anker?.typ
              ? ` — trägt schon ${esc(x.anker.typ)}` : ''}</option>`
        ).join('')}</select>
      <small class="hinweis">Der Stab hängt am Masten, nicht am Querprofil.${
        m.anker?.typ
          ? ' Dieser Mast trägt bereits einen — «Setzen» ersetzt ihn.' : ''}
      </small></div>

    <div class="feld"><label for="dlg-ank-typ">Welcher Typ</label>
      <select id="dlg-ank-typ">${ankerTypen().map((t2) =>
        `<option value="${esc(t2.id)}"${t2.id === e.typ ? ' selected' : ''}
          >${esc(t2.name)} · ${t2.art === 'seil' ? 'nur Zug'
            : `bis ${(t2.laengeMax ?? 0).toFixed(2)} m`}</option>`).join('')}
      </select>
      <small class="hinweis">${seil
        ? 'Ein Seilanker trägt nur ZUG — auf der Druckseite hängt er durch '
          + 'und trägt nichts.'
        : 'Die Stütze trägt Zug UND Druck; ihre Druckkraft begrenzt das '
          + 'Knicken, also ihre Länge.'}</small></div>

    <div class="feld"><label>Wie angeordnet</label>
      <div class="ank-lagen" role="radiogroup" aria-label="Anordnung">
        ${LAGEN.map((l) => {
          const an = l.r === e.richtung && l.s === e.seite;
          return `<button type="button" class="btn btn-mini${an ? ' an' : ''}"
            data-ank-lage="${l.r}|${l.s}" role="radio" aria-checked="${an}"
            title="${esc(l.k)}">${esc(l.t)}</button>`;
        }).join('')}
      </div>
      <small class="hinweis">Der Stab hält nur die Richtung, in der er
        liegt. Am Abfangjoch ist die grosse Kraft der Leiterzug in
        GLEISRICHTUNG; ein Anker quer dazu hält davon nichts.</small></div>

    <div class="feld"><label for="dlg-ank-h">Anschlusshöhe am Masten</label>
      <input id="dlg-ank-h" type="number" step="0.05" min="0.5" max="20"
             value="${(e.h ?? 0).toFixed(2)}">
      <small class="hinweis">m über dem Mastfuss.</small></div>
    <div class="feld"><label for="dlg-ank-a">Abstand des Fundaments</label>
      <input id="dlg-ank-a" type="number" step="0.05" min="0.5" max="20"
             value="${(e.a ?? 0).toFixed(2)}">
      <small class="hinweis">m waagrecht vom Mastfuss.</small></div>

    ${!seil ? `<div class="feld">
      <label for="dlg-ank-bef">Befestigung an Fundament und Mast</label>
      <select id="dlg-ank-bef">${ANKER_BEFESTIGUNGEN.map((b) =>
        `<option value="${esc(b.key)}"${b.key === e.befestigung
          ? ' selected' : ''}>${esc(b.label)}</option>`).join('')}</select>
      <small class="hinweis">Auf ZUG begrenzt nicht die Stütze, sondern die
        Befestigung.</small></div>` : ''}

    ${/*
       * DIE BEIDEN FOLGEGROESSEN stehen da, weil man in ihnen denkt: «der
       * anker hat einen winkel von ca 60°» (Weisung, 11. September). Sie
       * sind KEINE Eingabe - sie folgen aus Hoehe und Abstand, und zwei
       * Speicherorte fuer dieselbe Groesse laufen auseinander.
       */''}
    <p class="notiz" id="dlg-ank-folge">${folgeText()}</p>`;
  };

  const d = app.dialog('Zuganker / Druckstütze', koerper(),
    `${vorhanden ? '<button class="btn btn-fail" data-ank-weg>Entfernen</button>'
                 : ''}
     <button class="btn" data-zu>Abbrechen</button>
     <button class="btn btn-acc" data-ank-ok>Setzen</button>`);

  const neu = () => {
    d.node.querySelector('.dialog-koerper').innerHTML = koerper();
    verdrahte();
  };
  function verdrahte() {
    const n = d.node;
    n.querySelector('#dlg-ank-mast').onchange = (ev) => {
      id = ev.target.value;
      // Der neue Mast bringt seinen eigenen Anker mit, wenn er einen hat.
      const v = holen().anker;
      e = { ...app.ANKER_STANDARD, richtung: app.ankerRichtungVor(app.werte),
            ...(v ?? {}), typ: v?.typ ?? e.typ };
      neu();
    };
    n.querySelector('#dlg-ank-typ').onchange = (ev) => {
      e = { ...e, typ: ev.target.value };
      neu();
    };
    n.querySelectorAll('[data-ank-lage]').forEach((b) => {
      b.onclick = () => {
        const [r, s] = b.dataset.ankLage.split('|');
        e = { ...e, richtung: r, seite: s };
        neu();
      };
    });
    /*
     * DIE ZAHLENFELDER FUEHREN NUR DIE FOLGEZEILE NACH, nicht den ganzen
     * Koerper: ein Neuaufbau naehme mitten im Tippen den Fokus, und aus
     * «7.7» wuerde nie «7.79».
     */
    const zahl = (sel, feld) => {
      const el = n.querySelector(sel);
      if (!el) return;
      el.oninput = () => {
        const v = parseFloat(el.value);
        if (!Number.isFinite(v)) return;
        e = { ...e, [feld]: v };
        const f = n.querySelector('#dlg-ank-folge');
        if (f) f.innerHTML = folgeText();
      };
    };
    zahl('#dlg-ank-h', 'h');
    zahl('#dlg-ank-a', 'a');
    const bef = n.querySelector('#dlg-ank-bef');
    if (bef) bef.onchange = () => { e = { ...e, befestigung: bef.value }; };
    const weg = n.querySelector('[data-ank-weg]');
    if (weg) weg.onclick = () => {
      app.werte = setzeMastAnker(app.werte, id, null);
      app.werte = { ...app.werte, mastAktiv: id };
      d.zu();
      app.neuRechnen();
    };
    n.querySelector('[data-ank-ok]').onclick = () => {
      app.werte = setzeMastAnker(app.werte, id, { ...e });
      /*
       * DER GESETZTE MAST WIRD ANGEWAEHLT: die Felder der Maske zeigen dann
       * denselben Anker, und wer nach dem Schliessen etwas nachjustiert,
       * aendert den, den er eben gesetzt hat.
       */
      app.werte = { ...app.werte, mastAktiv: id };
      d.zu();
      app.neuRechnen();
    };
  }
  verdrahte();
}

/* ===========================================================================
 * DAS TRAGWERK - IN EINEM FENSTER
 * ===========================================================================
 *
 * Weisung vom 11. September: «fuer die restlichen elemente eine gleiches
 * modal machen wie beim anker, dies beim erstellen eines tragweks einblenden
 * und wenn man es anklickt.»
 *
 * >>> DIESELBEN DREI FRAGEN WIE BEIM ANKER. <<<
 *
 *   1. WELCHE ART      Tragjoch, Einzelmast, Tragausleger, Abfangjoch
 *   2. WELCHER TYP     das Sortiment haengt an der Art
 *   3. WO UND WIE LANG Lage auf dem Querprofil, Stuetzweite
 *
 * Bis hierher gab es zwei Wege und keinen ganzen: «+ Tragwerk» legte eines
 * mit Vorgabewerten an, und danach suchte man in der Maske die vier Felder
 * zusammen. Die Art liess sich ueberhaupt erst seit heute wechseln, und auch
 * das nur ueber das Kontextmenue.
 *
 * >>> BEIM ANLEGEN UND BEIM ANKLICKEN. <<<
 *
 * Angelegt wird erst beim «Setzen» - ein abgebrochener Dialog hinterlaesst
 * kein halbes Tragwerk. Beim Anklicken eines BESTEHENDEN oeffnet er sich mit
 * dessen Werten; der erste Klick waehlt es an, der zweite oeffnet das
 * Fenster. So bleibt das schnelle Umschalten zwischen zwei Tragwerken, was
 * es war, und die Bearbeitung ist einen Klick entfernt.
 * ========================================================================= */
/* ===========================================================================
 * >>> DAS FENSTER DES MASTEN. <<<
 * ===========================================================================
 *
 * Weisung vom 16. September: «diese fenster auch für die maste anzeigen.»
 *
 * Dasselbe Muster wie beim Tragwerk: was ein Bauteil AUSMACHT, steht in
 * einem Fenster beisammen - nicht verteilt über eine Seitenleiste, in der
 * man scrollt. Beim Masten sind das fünf Zahlen: Profil, Stegrichtung,
 * Anschlusshöhe, Gesamtlänge und die Stelle auf dem Querprofil.
 *
 * >>> WAS NICHT HINEINGEHOERT. <<<
 *
 * Alles, was einen Regelwert hat, den man selten verlässt: Fusspunkt,
 * Zuganker, Windbeiwerte, die zweite Mastreihe. Sie bleiben in der
 * Seitenleiste - dieselbe Regel wie in der Karte Anbauteile, nur hier
 * strenger, weil ein Fenster kein Scrollen verträgt.
 *
 * >>> DIE HOEHE IST DIESELBE ZAHL WIE IM TRAGWERKSFENSTER. <<<
 *
 * Dort heisst sie «Anschlusshöhe, gemessen an M1», hier gehört sie dem
 * Masten, den man angeklickt hat. Zwei Fenster auf dieselbe Zahl - deshalb
 * lesen und schreiben beide über denselben Weg (`mastAktiv`, dann `mastH`).
 * ========================================================================= */
export function dialogMast(app, mastId) {
  const alle = mastenVon(app.werte);
  const m = alle.find((x) => x.id === mastId) ?? alle[0];
  if (!m) return null;
  /*
   * >>> DIE HÖHE DES TRAGWERKS, DAS DIESER MAST TRÄGT (1. Oktober). <<<
   *
   * Hier stand `m.H`, ersatzweise `werte.mastH` - und `m.H` setzt niemand.
   * Der Dialog zeigte damit immer die Höhe des GEWÄHLTEN Tragwerks, auch
   * für einen Masten, den nur ein anderes trägt (gesehen: M1 von T1 zeigte
   * 6.50 von T2). Gelesen wird jetzt dort, wohin «Übernehmen» schreibt:
   * am Tragwerk, das nach `mastAktiv` das gewählte ist (das bisherige, wenn
   * es diesen Masten trägt, sonst sein erstes), an dem Ende, an dem der
   * Mast steht (`anschlusshoehe`).
   */
  const jetzt = app.werte.twId ?? 'T1';
  const tIds = m.traegt ?? [];
  const tZiel = tragwerkeVon(app.werte).find((t) => t.id
    === (tIds.includes(jetzt) ? jetzt : (tIds[0] ?? jetzt))) ?? null;
  const [mA, mB] = tZiel ? mastenFuer(app.werte, tZiel) : [null, null];
  const ende = mB?.id === m.id && mA?.id !== m.id ? 'B' : 'A';
  // Am Ende B mit eigener Höhe `mastHB`; sonst folgt B der Höhe von A.
  const eigenB = ende === 'B' && (tZiel?.mastHZwei ?? tZiel?.mastZwei) === true;
  const feldH = eigenB ? 'mastHB' : 'mastH';
  const hTw = tZiel ? anschlusshoehe(tZiel, ende) : 0;
  let e = {
    profil: m.profil ?? tZiel?.mastProfil ?? app.werte.mastProfil ?? 'HEB 260',
    steg: m.steg ?? tZiel?.mastSteg ?? app.werte.mastSteg ?? 'jochachse',
    H: hTw > 0 ? hTw : (Number(app.werte.mastH) || 7.5),
    // Die Länge gehört dem Masten; ohne eigene zeigt das Feld die Vorgabe.
    laenge: Number(m.laenge) > 0 ? Number(m.laenge) : 0,
    x: Number(m.x) || 0,
  };
  const H0 = e.H;
  /*
   * DIE LAENGE FOLGT DER HOEHE, solange niemand sie eigens setzt: seit dem
   * 5. September ist die Vorgabe H + 0.50 m. Das Feld zeigt deshalb, was
   * gilt - und sagt daneben, woher es kommt.
   */
  /*
   * EIN MAST, DER NUR EINZELMASTEN TRAEGT, hat keine Anschlusshoehe
   * (Weisung, 18. September) - es schliesst kein Joch an. Er rechnet mit
   * seiner Laenge; ohne eigene Angabe mit der, die der Kern nimmt.
   */
  const traegt = (m.traegt ?? []).map((id) => tragwerkeSortiert(app.werte)
    .find((t) => t.id === id)).filter(Boolean);
  const nurEinzel = traegt.length > 0
    && traegt.every((t) => tragwerksart(t).key === 'einzelmast');
  const laengeVorgabe = () => (nurEinzel
    ? einzelmastLaenge({ ...app.werte, mastH: e.H, mastLaenge: 0 })
    : Math.round((e.H + 0.5) * 100) / 100);

  const koerper = () => `
    <div class="feld"><label for="dlg-m-profil">Mastprofil</label>
      <select id="dlg-m-profil">${mastprofile().map((p) =>
        `<option value="${esc(p.name)}"${p.name === e.profil ? ' selected' : ''}
          >${esc(p.name)}</option>`).join('')}</select>
      <small class="hinweis">Er bestimmt die Drehfeder am Jochende und trägt
        den Nachweis über die ganze Höhe.</small></div>

    <div class="feld"><label>Stegrichtung</label>
      <div class="ank-lagen" role="radiogroup" aria-label="Stegrichtung">
        ${STEGRICHTUNGEN.map((s) => `
          <button type="button" class="btn btn-mini${
              s.key === e.steg ? ' an' : ''}"
            data-m-steg="${esc(s.key)}" role="radio"
            aria-checked="${s.key === e.steg}"
            title="${esc(s.kurz ?? s.label)}">${esc(s.label)}</button>`).join('')}
      </div>
      <small class="hinweis">Welche Achse quer zum Gleis steht — sie
        entscheidet, ob die starke oder die schwache Achse das Joch
        hält.</small></div>

    ${nurEinzel ? '' : `<div class="feld"><label for="dlg-m-h">Anschlusshöhe</label>
      <input id="dlg-m-h" type="number" step="0.1" min="2" max="20"
             value="${e.H.toFixed(2)}">
      <small class="hinweis">m · über dem Mastfuss, ${esc(tZiel
        ? `${tragwerkPos(app.werte, tZiel)} am Ende ${ende}` : 'am Tragwerk')}${
        ende === 'B' && !eigenB ? ' (Ende B folgt Ende A, gilt für beide)' : ''}.
        Dieselbe Zahl steht im Fenster des Tragwerks.</small></div>`}

    <div class="feld"><label for="dlg-m-l">Mastlänge gesamt</label>
      <input id="dlg-m-l" type="number" step="0.1" min="2" max="25"
             value="${(e.laenge > 0 ? e.laenge : laengeVorgabe()).toFixed(2)}">
      <small class="hinweis">${nurEinzel
        ? 'm · Fuss bis Kopf. Der Einzelmast rechnet mit dieser Länge; die '
          + 'Anbauteile stehen mit ihrer Höhe über Fundament.'
        : `m · Fuss bis Kopf. Ohne eigene Angabe gilt
        Anschlusshöhe + 0.50 m, hier also
        ${laengeVorgabe().toFixed(2)} m.`}</small></div>

    <div class="feld"><label for="dlg-m-x">Lage auf dem Querprofil</label>
      <input id="dlg-m-x" type="number" step="0.05" value="${e.x.toFixed(2)}">
      <small class="hinweis">m · quer zum Gleis, ab dem Nullpunkt der
        Zeichnung.${(m.traegt ?? []).length > 1
          ? ' Dieser Mast trägt zwei Tragwerke — die Stelle verschiebt beide.'
          : ''}</small></div>

    <p class="notiz">Fusspunkt, Zuganker und Windbeiwerte bleiben in der
      Seitenleiste — sie haben Regelwerte, die man selten verlässt.</p>`;

  const d = app.dialog(`${mastName(app.werte, m)} bearbeiten`, koerper(),
    `<button class="btn" data-zu>Abbrechen</button>
     <button class="btn btn-acc" data-m-ok>Übernehmen</button>`);

  const neu = () => {
    d.node.querySelector('.dialog-koerper').innerHTML = koerper();
    verdrahte();
  };
  function verdrahte() {
    const n = d.node;
    n.querySelectorAll('[data-m-steg]').forEach((b) => {
      b.onclick = () => {
        if (b.dataset.mSteg === e.steg) return;
        e = { ...e, steg: b.dataset.mSteg };
        neu();
      };
    });
    const s = n.querySelector('#dlg-m-profil');
    if (s) s.onchange = () => { e = { ...e, profil: s.value }; };
    const zahl = (sel, feld) => {
      const el = n.querySelector(sel);
      if (!el) return;
      el.oninput = () => {
        const v = Number(el.value);
        if (Number.isFinite(v)) e = { ...e, [feld]: v };
      };
    };
    zahl('#dlg-m-h', 'H');
    zahl('#dlg-m-l', 'laenge');
    zahl('#dlg-m-x', 'x');
    n.querySelector('[data-m-ok]').onclick = () => {
      d.zu();
      /*
       * ERST DEN MASTEN WAEHLEN, DANN SCHREIBEN. `mastProfil`, `mastH` und
       * die uebrigen gehoeren dem GEWAEHLTEN Masten - ohne diesen Schritt
       * landeten sie bei einem anderen.
       */
      app.aendern('mastAktiv', m.id);
      if (e.profil !== (m.profil ?? app.werte.mastProfil)) {
        app.aendern('mastProfil', e.profil);
      }
      if (e.steg !== (m.steg ?? app.werte.mastSteg)) app.aendern('mastSteg', e.steg);
      // Verglichen mit der Zahl, die das Feld zeigte; geschrieben ins Feld
      // des Endes, an dem der Mast steht.
      if (Math.abs(e.H - H0) > 1e-9) app.aendern(feldH, e.H);
      if (Number.isFinite(e.laenge) && e.laenge > 0
          && Math.abs(e.laenge - (Number(m.laenge) || 0)) > 1e-9) {
        app.aendern('mastLaenge', e.laenge);
      }
      if (Math.abs(e.x - (Number(m.x) || 0)) > 1e-9) app.aendern('mastX', e.x);
    };
  }
  verdrahte();
  return d;
}

/** Der erste Mast eines Tragwerks - an ihm haengt die Anschlusshoehe. */
function erstenMastVon(app, t) {
  if (!t?.id) return null;
  return mastenVon(app.werte).find((m) => (m.traegt ?? []).includes(t.id)) ?? null;
}

/**
 * Die Anschlusshoehe eines Tragwerks, gelesen an seinem ersten Masten.
 *
 * Steht sie dort nicht, gilt die des Satzes - so liest es die Maske auch
 * (`amMast('H', 'mastH')` in ui.schema.js). Zwei Leseregeln fuer dieselbe
 * Zahl waeren zwei Gelegenheiten, sich zu irren.
 */
function hoeheVonM1(app, t) {
  const m = erstenMastVon(app, t);
  const h = Number(m?.H);
  return Number.isFinite(h) && h > 0 ? h : (Number(app.werte.mastH) || 7.5);
}

/**
 * @param {object} vor  Vorbelegung aus Kontextmenü oder Kachel (30. Sept.):
 *                      {x0, mastA, mastB} - Lage bzw. die Masten, zwischen
 *                      bzw. an denen das neue Tragwerk liegen soll
 */
export function dialogTragwerk(app, id = null, artVor = null, vor = {}) {
  const neuesTragwerk = !id;
  const alle = tragwerkeSortiert(app.werte);
  const t = id ? alle.find((x) => x.id === id) : null;
  /*
   * DER ENTWURF LEBT IM FENSTER. Beim bestehenden Tragwerk kommen die Werte
   * aus ihm, beim neuen aus dem zuletzt angewaehlten - wer ein zweites Joch
   * setzt, will meistens dasselbe noch einmal.
   */
  const vorlage = t ?? alle.find((x) => x.id === (app.werte.twId ?? 'T1')) ?? alle[0];
  let e = {
    // Die angeklickte Art des Menues gewinnt - sie ist die Absicht des
    // Klicks; die Vorlage liefert nur, was sie sonst noch mitbringt.
    art: artVor ?? tragwerksart(vorlage ?? app.werte).key,
    typ: vorlage?.typ ?? app.werte.typ,
    abfangTyp: vorlage?.abfangTyp ?? app.werte.abfangTyp,
    L: Number(vorlage?.L ?? app.werte.L) || 20,
    x0: neuesTragwerk ? (lageVon(vorlage) || 0) + (Number(vorlage?.L) || 0)
                      : lageVon(t),
    /* =====================================================================
     * >>> DIE ANSCHLUSSHOEHE GEHOERT INS FENSTER. <<<
     * =====================================================================
     *
     * Weisung vom 16. September: «bei den jochen noch die anschlusshöhe
     * (bezogen auf m1) ergänzen als feld.»
     *
     * Sie ist die dritte Zahl, die ein Joch beschreibt - Typ, Stützweite,
     * Höhe -, und sie stand als einzige nicht hier. Wer ein Joch einrichtet,
     * musste dafür in die Seitenleiste wechseln.
     *
     * BEZOGEN AUF M1, wie die Weisung sagt: die Höhe gehört dem MASTEN,
     * nicht dem Tragwerk, und ein Joch hat zwei davon. Der erste ist der,
     * an dem man sie ansetzt; der zweite folgt ihm, solange er nicht
     * eigens verstellt ist. Das Feld sagt das auch.
     */
    H: hoeheVonM1(app, t ?? vorlage),
    // Die Seite des Auslegers (28. September) - im Dialog wie in der Maske.
    seite: (t ?? vorlage)?.auslegerSeite === 'links' ? 'links' : 'rechts',
    /*
     * >>> DIE GRUNDWERTE DES QUERPROFILS (29. September). <<<
     *
     * Weisung: «was noch vergessen geht ist die EK Eingabe die Spannweite
     * und Radius eingabe, diese könnte man beim erstellen eines neuen
     * tragwerks in einem modall festhalten als eingabeparameter und eine
     * checkbox nicht mehr nachfragen in deisem projekt.»
     *
     * Die drei Angaben gehören dem BLATT (`BLATT_FELDER`), nicht dem
     * Tragwerk: sie gelten jedem Tragwerk des Querprofils. Der Dialog zeigt
     * deshalb die geltenden Werte und schreibt sie ins Blatt zurück. Mit dem
     * Kästchen merkt sich das Blatt, dass nicht mehr gefragt wird
     * (`grundwerteFragen`, in der Maske unter *Lasten → Trasse* wieder
     * einzuschalten).
     */
    ek: String(app.werte.windKlasse ?? '0.9'),
    spw: Number(app.werte.flSpannweite) || 40,
    R: Number(app.werte.trasseRadius) || 0,
    nichtMehr: false,
    // Anbauteile des Jochs: ohne (Vorgabe) oder vom gewählten übernehmen
    // (1. Oktober: «Beim setzen eines neuen tragjochs auswahl, ohne
    // bauteilbelegung»).
    teileMit: false,
    // Die gewählten Masten (30. September) - leer heisst «neu setzen».
    mA: '', mB: '',
  };
  const grundwerteFragen = neuesTragwerk && app.werte.grundwerteFragen !== false;
  /*
   * KOMMT DIE ART AUS DEM MENUE, bringt sie ihr eigenes Sortiment mit - die
   * Vorlage daneben ist vielleicht ein Tragjoch, und «J90» steht in keiner
   * Abfangjoch-Liste.
   */
  if (artVor) {
    const v = app.artVorgabe(artVor, { ...app.werte, L: e.L });
    if (v.abfangTyp) e.abfangTyp = v.abfangTyp;
    if (Number.isFinite(v.L)) e.L = v.L;
  }

  const artDef = () => TRAGWERKSARTEN.find((a) => a.key === e.art)
                    ?? TRAGWERKSARTEN[0];
  const istAbfang = () => e.art === 'abfangjoch';
  /*
   * >>> DER TRAGAUSLEGER HAT SEIN EIGENES SORTIMENT (29. September). <<<
   * Gemeldet mit Bild: «ich kann keinen tragausleger bauen, es kommen nur
   * die joche als auswahl.» Der Dialog kannte nur «Abfangjoch oder sonst
   * Tragjoch» und bot beim Ausleger J60 … J130 an. Hier wählt man seine
   * LÄNGE aus dem Sortiment (6 … 13 m, 2 × UPE 140) und die Seite; die
   * Länge ist zugleich sein Typ.
   */
  const istAusleger = () => e.art === 'tragausleger';

  /*
   * DIE LAENGE GIBT ES NUR, WO ES EINEN TRAEGER GIBT. Ein Einzelmast hat
   * keine Stuetzweite; ein Feld dafuer waere eine Frage ohne Gegenstand.
   */
  const mitLaenge = () => artDef().masten >= 2;

  /** Der Laengenbereich des gewaehlten Typs - er begrenzt die Eingabe. */
  const bereich = () => {
    if (istAbfang()) {
      try {
        const a = getAbfangjoch(e.abfangTyp);
        const b = abfangLaengenbereich(a);
        return { min: b.min, max: b.max, text: b.text };
      } catch { return { min: 5, max: 35, text: '' }; }
    }
    /*
     * Das Sortiment führt die Längen als laengeKurz / laengeNorm, nicht als
     * Liste - hier stand `j.laengen`, das es nie gab, und der Dialog fiel
     * immer auf 4 … 40 m zurück (gefunden 30. September).
     */
    try {
      const j = getTragjoch(e.typ);
      if (j) return laengenbereich(j);
    } catch { /* ohne Sortiment freie Laenge */ }
    return { min: 4, max: 40, text: '' };
  };

  /* =======================================================================
   * >>> ZWISCHEN WELCHEN MASTEN (30. September). <<<
   * =======================================================================
   *
   * Weisung: «was man aber machen könnte ist die auswahl der Masten
   * anbieten wo der träger zu liegen kommen soll. man hat den fall das man
   * schon zwei oder drei masten hat und dann ein joch dazwischen legen
   * will.» Gewählt werden die Masten, Lage und Stützweite folgen daraus:
   * Tragjoch L = Abstand der Mastachsen (passt der Typ nicht, der erste des
   * Sortiments, der ihn führt); Abfangjoch über `abfangFuerStuetzweite`
   * (kürzeste passende Länge, sonst der nächste Typ - Entscheid 20. Sept.);
   * Tragausleger an EINEM Masten. Geteilt werden die Masten danach über die
   * Lage, wie überall auf dem Blatt.
   * ===================================================================== */
  const f2 = (v) => Number(v).toFixed(2);
  const masten = () => mastenVon(app.werte).slice().sort((a, b) => a.x - b.x);
  const mastVon = (mid) => masten().find((m) => m.id === mid) ?? null;
  const mName = (m) => mastName(app.werte, m);
  const mastWahl = () => neuesTragwerk && masten().length > 0 && e.art !== 'einzelmast';
  let mastNotiz = '';
  const passtJoch = (j, d) => {
    const b = laengenbereich(j);
    return d >= b.min - 1e-9 && d <= b.max + 1e-9;
  };
  const mastenAnwenden = (typFest = false) => {
    mastNotiz = '';
    const a = mastVon(e.mA);
    if (!a) return;
    if (artDef().masten < 2) {
      e.x0 = a.x;
      mastNotiz = `An ${mName(a)} bei x = ${f2(a.x)} m.`;
      /*
       * >>> DER AUSLEGER AM MASTEN EINES JOCHS (30. September). <<<
       * Frage: «theoretisch kann ein Tragausleger auch an ein bestehendes
       * Jochtragwerk auf die aussenseite angehängt werden, kann man in diesem
       * fall die kachel für diesen fall auch nutzen?» Ja: steht am gewählten
       * Masten schon ein Tragwerk, zeigt der Ausleger von ihm weg - nach
       * aussen. Liegt der Mast mitten in einer Reihe, bleibt die Seite, wie
       * sie ist, und die Notiz sagt es.
       */
      if (istAusleger()) {
        const fremde = (a.traegt ?? []).map((tid) => alle.find((x) => x.id === tid))
          .filter((x) => x && tragwerksart(x).masten >= 2);
        if (fremde.length) {
          const links = fremde.some((x) => lageVon(x) < a.x - 0.05);
          const rechts = fremde.some((x) => lageVon(x) + (Number(x.L) || 0) > a.x + 0.05);
          if (links !== rechts) {
            e.seite = links ? 'rechts' : 'links';
            mastNotiz += ` Am Masten von ${fremde.map((x) => tragwerkName(x, app.werte)).join(', ')}`
              + ` - Ausleger nach aussen (${e.seite}).`;
          } else {
            mastNotiz += ' Der Mast liegt zwischen zwei Tragwerken - die Seite bitte prüfen.';
          }
          // Seit dem 3. Oktober rechnet das Stabwerk den Ausleger am
          // Masten eines anderen Tragwerks mit (die Sperre ist weg).
          mastNotiz += ' Das Stabwerk rechnet Joch, Mast und Ausleger zusammen.';
        }
      }
      return;
    }
    const b = mastVon(e.mB);
    /*
     * MIT KRAGARM beginnt der Gurt um c_A vor dem Masten, und L ist die
     * Stützweite plus beide Kragarme (Rückfrage 30. September, «Stützweite
     * eingeben»). Ein NEUES Tragjoch hat keinen (Rückfrage 1. Oktober, «Ohne
     * Kragarm»): übernommen setzte ein Kragarm des bisherigen das neue Joch
     * um c_A neben den gewählten Masten, und die Reihe stand getrennt da.
     * Den Überstand setzt man danach am Joch selbst.
     */
    const [kA, kB] = [0, 0];
    if (!b) {
      e.x0 = a.x - kA;
      mastNotiz = `Beginnt an ${mName(a)}; der zweite Mast wird neu gesetzt.`;
      return;
    }
    const [l, r] = a.x <= b.x ? [a, b] : [b, a];
    const d = r.x - l.x;
    if (!(d > 0.05)) { mastNotiz = 'Die beiden Masten stehen an derselben Stelle.'; return; }
    e.x0 = l.x - kA;
    if (istAbfang()) {
      e.x0 = l.x;
      const k = abfangFuerStuetzweite(e.abfangTyp, d);
      if (!k) { mastNotiz = `Kein Abfangjoch des Sortiments überspannt ${f2(d)} m.`; return; }
      if (k.typ !== e.abfangTyp) mastNotiz = `${e.abfangTyp} überspannt ${f2(d)} m nicht - ${k.typ} gewählt. `;
      e.abfangTyp = k.typ;
      e.L = k.L;
      const jsMax = k.js[1];
      mastNotiz += d < jsMax - 0.01
        ? `⚠ ${k.typ} L = ${f2(k.L)} m setzt seinen zweiten Mast auf die grösste Stützweite `
          + `${f2(jsMax)} m (x = ${f2(l.x + jsMax)}); ${mName(r)} bei ${f2(r.x)} m wird nicht geteilt.`
        : `${k.typ} L = ${f2(k.L)} m, Stützweite ${f2(d)} m zwischen ${mName(l)} und ${mName(r)}.`;
      return;
    }
    const Lg = d + kA + kB;
    e.L = Lg;
    let j = null;
    try { j = getTragjoch(e.typ); } catch { /* ohne Sortiment */ }
    if (j && !passtJoch(j, Lg) && typFest) {
      mastNotiz = `⚠ ${e.typ} führt ${f2(Lg)} m nicht. `;
    } else if (j && !passtJoch(j, Lg)) {
      const alt = String(e.typ).endsWith('-alt');
      const n = tragjoche().find((x) => !/^SIGNAL/.test(x.typ)
        && String(x.typ).endsWith('-alt') === alt && passtJoch(x, Lg));
      if (n) {
        mastNotiz = `${e.typ} führt ${f2(Lg)} m nicht - ${n.typ} gewählt. `;
        e.typ = n.typ;
      } else {
        mastNotiz = `⚠ Kein Tragjoch des Sortiments führt ${f2(Lg)} m. `;
      }
    }
    mastNotiz += `Stützweite ${f2(d)} m zwischen ${mName(l)} und ${mName(r)}`
      + (kA > 0 || kB > 0 ? `, Kragarme ${f2(kA)} / ${f2(kB)} m, L = ${f2(Lg)} m.` : '.');
  };
  const mastOptionen = (wert) => `<option value="">— neuer Mast —</option>${masten().map((m) =>
    `<option value="${esc(m.id)}"${m.id === wert ? ' selected' : ''}>${esc(mName(m))} · x ${f2(m.x)} m</option>`).join('')}`;
  const mastenHtml = () => {
    if (!mastWahl()) return '';
    const zwei = artDef().masten >= 2;
    return `<div class="feld"><label>${zwei ? 'Zwischen den Masten' : 'An Mast'}</label>
      <div class="dlg-masten">
        <select id="dlg-tw-ma" aria-label="${zwei ? 'erster Mast' : 'Mast'}">${mastOptionen(e.mA)}</select>
        ${zwei ? `<span>und</span><select id="dlg-tw-mb" aria-label="zweiter Mast">${mastOptionen(e.mB)}</select>` : ''}
      </div>
      <small class="hinweis">${esc(mastNotiz || (zwei
        ? 'Vorhandene Masten wählen - Lage und Stützweite folgen daraus.'
        : 'Vorhandenen Masten wählen - die Lage folgt daraus.'))}</small></div>`;
  };
  // Vorbelegung aus Kontextmenü oder Kachel.
  if (Number.isFinite(vor.x0)) e.x0 = vor.x0;
  if (vor.mastA) { e.mA = vor.mastA; e.mB = vor.mastB ?? ''; mastenAnwenden(); }

  /** Kurzform der Grundwerte - für die Zeile, wenn nicht mehr gefragt wird. */
  const grundwerteKurz = () => {
    const ek = WIND_KLASSEN.find((k) => k.key === e.ek)?.ek ?? e.ek;
    return `${ek} · Spannweite ${e.spw.toFixed(1)} m · `
      + (istGerade(e.R) ? 'gerades Gleis' : `Radius ${e.R.toFixed(0)} m`);
  };
  const grundwerteHtml = () => {
    if (!neuesTragwerk) return '';
    if (!grundwerteFragen) {
      return `<p class="notiz">Grundwerte des Querprofils: ${esc(grundwerteKurz())}
        — unter <em>Lasten → Trasse</em> und <em>Einwirkungen</em> zu ändern.</p>`;
    }
    return `<fieldset class="dlg-grundwerte">
      <legend>Grundwerte des Querprofils — gelten allen Tragwerken</legend>
      <div class="feld"><label for="dlg-tw-ek">Einwirkungsklasse</label>
        <select id="dlg-tw-ek">${WIND_KLASSEN.map((k) =>
          `<option value="${esc(k.key)}"${k.key === e.ek ? ' selected' : ''}>${esc(k.label)}</option>`).join('')}
        </select>
        <small class="hinweis">Aus der Linienkarte — sie wählt den Wind auf Joch,
          Masten und Anbauteile.</small></div>
      <div class="feld"><label for="dlg-tw-spw">Spannweite der Fahrleitung</label>
        <input id="dlg-tw-spw" type="number" step="1" min="1" value="${e.spw.toFixed(1)}">
        <small class="hinweis">m · Abstand zweier Aufhängungen, nicht der
          Jochabstand.</small></div>
      <div class="feld"><label for="dlg-tw-r">Radius der Trasse</label>
        <input id="dlg-tw-r" type="number" step="50" value="${e.R.toFixed(0)}">
        <small class="hinweis">m · 0 = gerades Gleis; R &gt; 0 lenkt in +x,
          R &lt; 0 in −x.</small></div>
      <label class="dlg-nicht-mehr"><input type="checkbox" id="dlg-tw-nichtmehr"${
        e.nichtMehr ? ' checked' : ''}> In diesem Projekt nicht mehr nachfragen</label>
    </fieldset>`;
  };

  const koerper = () => {
    const b = bereich();
    if (istAusleger()) e.L = tragauslegerNaechsteLaenge(e.L) ?? e.L;
    const typListe = istAusleger()
      ? tragauslegerTypen().map((a) => ({ wert: String(a.L),
          text: `Tragausleger ${Number(a.L).toFixed(2)} m · 2 × ${a.profil ?? 'UPE 140'}` }))
      : istAbfang()
      ? abfangjoche().map((a) => ({ wert: a.typ,
          text: `${a.typ} · ${a.profil} · ${abfangLaengenbereich(a).text}` }))
      : tragjoche().map((j) => ({ wert: j.typ,
          text: `${j.typ} · jd ${j.jd} mm` }));
    const typJetzt = istAusleger() ? String(e.L) : istAbfang() ? e.abfangTyp : e.typ;
    return `
    <div class="feld"><label>Welche Art</label>
      <div class="ank-lagen" role="radiogroup" aria-label="Tragwerksart">
        ${TRAGWERKSARTEN.map((a) => `
          <button type="button" class="btn btn-mini${
              a.key === e.art ? ' an' : ''}"
            data-tw-art="${esc(a.key)}" role="radio"
            aria-checked="${a.key === e.art}"
            title="${esc(a.kurz)}">${esc(a.label)}</button>`).join('')}
      </div>
      <small class="hinweis">${esc(artDef().kurz)}</small></div>

    ${mastenHtml()}

    ${artDef().traeger ? `<div class="feld">
      <label for="dlg-tw-typ">${istAusleger() ? 'Auslegerlänge' : 'Welcher Typ'}</label>
      <select id="dlg-tw-typ">${typListe.map((o) =>
        `<option value="${esc(o.wert)}"${o.wert === typJetzt ? ' selected' : ''}
          >${esc(o.text)}</option>`).join('')}</select>
      <small class="hinweis">${istAusleger()
        ? 'Länge des Sortiments — sie wählt Blechraster und Aufhängung.'
        : istAbfang()
        ? 'Das Abfangjoch nimmt den Leiterzug auf — zwei Gurte nebeneinander.'
        : 'Das Tragjoch trägt Gewicht, Schnee und Wind — vier Winkelgurte.'}
      </small></div>` : ''}

    ${istAusleger() ? `<div class="feld"><label>Seite des Auslegers</label>
      <div class="ank-lagen" role="radiogroup" aria-label="Seite des Auslegers">
        ${[['rechts', 'rechts (+x)'], ['links', 'links (−x)']].map(([k, txt]) => `
          <button type="button" class="btn btn-mini${e.seite === k ? ' an' : ''}"
            data-tw-seite="${k}" role="radio" aria-checked="${e.seite === k}">${txt}</button>`).join('')}
      </div></div>` : ''}

    ${mitLaenge() ? `<div class="feld">
      <label for="dlg-tw-l">${istAbfang() ? 'Jochlänge (Träger)' : 'Stützweite'}</label>
      <input id="dlg-tw-l" type="number" step="0.5" min="${b.min}"
             max="${b.max}" value="${e.L.toFixed(2)}">
      <small class="hinweis">m${b.text
        ? ` · das Sortiment führt ${esc(b.text)}` : ''}</small></div>` : ''}

    ${artDef().masten >= 1 ? `<div class="feld">
      <label for="dlg-tw-h">${istAusleger() ? 'Höhe Ausleger über Fundament' : 'Anschlusshöhe'}</label>
      <input id="dlg-tw-h" type="number" step="0.1" min="2" max="20"
             value="${e.H.toFixed(2)}">
      <small class="hinweis">m · über dem Mastfuss, gemessen an
        ${esc(erstenMastVon(app, t)?.id ?? 'M1')}. Der zweite Mast folgt ihr,
        solange er nicht eigens verstellt ist.</small></div>` : ''}

    <div class="feld"><label for="dlg-tw-x">Lage auf dem Querprofil</label>
      <input id="dlg-tw-x" type="number" step="0.05" value="${e.x0.toFixed(2)}">
      <small class="hinweis">m · quer zum Gleis, in der Jochachse, ab dem
        Nullpunkt der Zeichnung.</small></div>

    ${grundwerteHtml()}

    ${neuesTragwerk && artDef().traeger ? `<div class="feld"><label>Anbauteile am Träger</label>
      <div class="dlg-wahl">
        <label><input type="radio" name="dlg-tw-teile" value="ohne"${e.teileMit ? '' : ' checked'}> ohne</label>
        <label><input type="radio" name="dlg-tw-teile" value="mit"${e.teileMit ? ' checked' : ''}>
          vom gewählten Tragwerk übernehmen</label></div>
      <small class="hinweis">Teile an den Masten gehören dem Masten und bleiben.</small></div>` : ''}

    <p class="notiz">${neuesTragwerk
      ? 'Profile und Bleche übernimmt das neue Tragwerk vom zuletzt gewählten '
        + '— sie lassen sich danach in der Maske ändern.'
      : 'Profile, Bleche, Masten und Anbauteile bleiben, wie sie sind. Ein '
        + 'Wechsel der ART setzt Typ und Länge auf das Sortiment der neuen '
        + 'Art — «J90» steht in keiner Abfangjoch-Liste.'}</p>`;
  };

  const d = app.dialog(neuesTragwerk ? 'Neues Tragwerk'
                                 : `${tragwerkName(t, app.werte)} bearbeiten`,
    koerper(),
    `<button class="btn" data-zu>Abbrechen</button>
     <button class="btn btn-acc" data-tw-ok>${
       neuesTragwerk ? 'Setzen' : 'Übernehmen'}</button>`);

  const neu = () => {
    d.node.querySelector('.dialog-koerper').innerHTML = koerper();
    verdrahte();
  };
  function verdrahte() {
    const n = d.node;
    n.querySelectorAll('[data-tw-art]').forEach((b) => {
      b.onclick = () => {
        if (b.dataset.twArt === e.art) return;
        e = { ...e, art: b.dataset.twArt };
        /*
         * DER TYP MUSS ZUR ART PASSEN. «J90» steht in keiner
         * Abfangjoch-Liste; der Browser zeigte sonst den ersten Eintrag,
         * waehrend im Entwurf etwas anderes stuende - dieselbe Falle, die
         * beim Anlegen schon einmal zugeschnappt ist.
         */
        const v = app.artVorgabe(e.art, { ...app.werte, L: e.L });
        if (v.abfangTyp) e.abfangTyp = v.abfangTyp;
        if (Number.isFinite(v.L)) e.L = v.L;
        const b2 = bereich();
        e.L = Math.min(Math.max(e.L, b2.min), b2.max);
        // Gewählte Masten gelten auch für die neue Art (30. September).
        if (e.mA) mastenAnwenden();
        neu();
      };
    });
    n.querySelectorAll('[data-tw-seite]').forEach((b) => {
      b.onclick = () => { e = { ...e, seite: b.dataset.twSeite }; neu(); };
    });
    const typ = n.querySelector('#dlg-tw-typ');
    if (typ) typ.onchange = () => {
      if (istAusleger()) { e.L = Number(typ.value); neu(); return; }
      if (istAbfang()) e.abfangTyp = typ.value; else e.typ = typ.value;
      /*
       * Sind Masten gewählt, bleibt die Stützweite ihr Abstand: beim
       * Abfangjoch sucht die Regel von diesem Typ aus die passende Länge,
       * beim Tragjoch bleibt der gewählte Typ und die Notiz sagt, wenn er
       * den Abstand nicht führt.
       */
      if (e.mA && e.mB) { mastenAnwenden(!istAbfang()); neu(); return; }
      const b2 = bereich();
      e.L = Math.min(Math.max(e.L, b2.min), b2.max);
      neu();
    };
    const ma = n.querySelector('#dlg-tw-ma'), mb = n.querySelector('#dlg-tw-mb');
    if (ma) ma.onchange = () => { e = { ...e, mA: ma.value }; mastenAnwenden(); neu(); };
    if (mb) mb.onchange = () => { e = { ...e, mB: mb.value }; mastenAnwenden(); neu(); };
    const zahl = (sel, feld) => {
      const el = n.querySelector(sel);
      if (!el) return;
      el.oninput = () => {
        const v = parseFloat(el.value);
        if (Number.isFinite(v)) e = { ...e, [feld]: v };
      };
    };
    zahl('#dlg-tw-l', 'L');
    zahl('#dlg-tw-h', 'H');
    zahl('#dlg-tw-x', 'x0');
    // Wer Lage oder Länge von Hand setzt, verlässt die Mastwahl.
    ['#dlg-tw-l', '#dlg-tw-x'].forEach((sel) => {
      const el = n.querySelector(sel);
      if (!el) return;
      el.addEventListener('input', () => {
        if (!e.mA && !e.mB) return;
        e = { ...e, mA: '', mB: '' };
        if (ma) ma.value = '';
        if (mb) mb.value = '';
      });
    });
    zahl('#dlg-tw-spw', 'spw');
    zahl('#dlg-tw-r', 'R');
    const ek = n.querySelector('#dlg-tw-ek');
    if (ek) ek.onchange = () => { e = { ...e, ek: ek.value }; };
    const nm = n.querySelector('#dlg-tw-nichtmehr');
    if (nm) nm.onchange = () => { e = { ...e, nichtMehr: nm.checked }; };
    n.querySelectorAll('input[name="dlg-tw-teile"]').forEach((r) => {
      r.onchange = () => { if (r.checked) e = { ...e, teileMit: r.value === 'mit' }; };
    });
    n.querySelector('[data-tw-ok]').onclick = () => {
      d.zu();
      if (neuesTragwerk) {
        app.aendern('tragwerkNeu', { art: e.art, xLage: e.x0 });
        // Ohne Bauteilbelegung: die Teile am Träger fallen weg, die an den
        // Masten bleiben (sie gehören dem Masten).
        if (artDef().traeger && !e.teileMit) {
          app.setzeAnbauteile((app.werte.anbauteile ?? [])
            .filter((a) => a?.ort === 'mastA' || a?.ort === 'mastB'));
        }
        /*
         * Die Grundwerte gehören dem Blatt - geschrieben wird nur, was
         * sich geändert hat, damit der Verlauf keine leeren Schritte führt.
         */
        if (grundwerteFragen) {
          if (e.ek !== String(app.werte.windKlasse ?? '0.9')) app.aendern('windKlasse', e.ek);
          if (e.spw > 0 && e.spw !== Number(app.werte.flSpannweite)) app.aendern('flSpannweite', e.spw);
          if (e.R !== (Number(app.werte.trasseRadius) || 0)) app.aendern('trasseRadius', e.R);
          if (e.nichtMehr) app.aendern('grundwerteFragen', false);
        }
        // Typ und Laenge danach setzen: `tragwerkHinzu` bringt die Vorgabe
        // der Art mit, und die soll der Entwurf ueberschreiben.
        if (istAusleger()) {
          app.aendern('L', e.L);
          app.aendern('auslegerSeite', e.seite);
          // Der Mast wächst bis zur Aufhängung mit (30. September).
          app.aendern('auslegerMastAnbau', true);
          return;
        }
        if (artDef().traeger) {
          app.aendern(istAbfang() ? 'abfangTyp' : 'typ',
                  istAbfang() ? e.abfangTyp : e.typ);
        }
        if (mitLaenge()) app.aendern('L', e.L);
        /*
         * >>> UND DIE ANSCHLUSSHÖHE (1. Oktober). <<<
         *
         * Beim NEUEN Tragwerk stand das Feld da und wirkte nicht - geschrieben
         * wurde es nur beim Bearbeiten (gefunden 29. September). Jetzt
         * derselbe Weg: das neue Tragwerk ist das aktive, sein erster Mast
         * wird angewählt, dann `mastH`. Ein geteilter Mast wird dabei nie
         * unter das Nachbarjoch gekürzt (`mastLaengeMindestens`).
         */
        const tNeu = { id: app.werte.twId ?? 'T1' };
        const m1Neu = erstenMastVon(app, tNeu);
        if (artDef().masten >= 2 && m1Neu && Number.isFinite(e.H) && e.H > 0
            && Math.abs(e.H - (Number(app.werte.mastH) || 0)) > 1e-9) {
          app.aendern('mastAktiv', m1Neu.id);
          app.aendern('mastH', e.H);
        }
        return;
      }
      if (tragwerksart(t).key !== e.art) {
        app.aendern('tragwerkArt', { id, art: e.art });
      } else if ((app.werte.twId ?? 'T1') !== id) {
        app.werte = tauscheAktives(app.werte, id);
      }
      if (istAusleger()) {
        app.aendern('L', e.L);
        app.aendern('auslegerSeite', e.seite);
      } else if (artDef().traeger) {
        app.aendern(istAbfang() ? 'abfangTyp' : 'typ',
                istAbfang() ? e.abfangTyp : e.typ);
      }
      if (mitLaenge()) app.aendern('L', e.L);
      app.aendern('tragwerkLage', { id, x: e.x0 });
      /*
       * DIE HOEHE ZULETZT, und ueber den MASTEN: `mastH` gehoert dem
       * gewaehlten Masten, nicht dem Tragwerk. Erst M1 anwaehlen, dann
       * schreiben - derselbe Weg, den die Seitenleiste geht.
       */
      const m1 = erstenMastVon(app, t);
      if (m1 && Number.isFinite(e.H) && Math.abs(e.H - hoeheVonM1(app, t)) > 1e-9) {
        app.aendern('mastAktiv', m1.id);
        app.aendern('mastH', e.H);
      }
      // Nach der Höhe: der Mast wächst bis zur Aufhängung mit (30. Sept.).
      if (istAusleger()) app.aendern('auslegerMastAnbau', true);
    };
  }
  verdrahte();
}

/* ===========================================================================
 * >>> DER SIGNALBAUER (30. September). <<<
 * ===========================================================================
 *
 * Weisung: «die signaleteile zu einem separatem signalbauer, da kann man die
 * teile auswählen und die resultierende last wird dann daraus berechnet und
 * man muss nur noch den angriffspunkt wie bei den übrigen bauteilen
 * definieren. Die Tragwerksteile für die Signalaufhängung können auch
 * separat aufgeführt werden, da diese nur in ausnahmen an die FL-Tragwerke
 * montiert werden.»
 *
 * Je Teil der Tabelle eine Anzahl; die Tragwerksteile stehen als eigene,
 * eingeklappte Gruppe mit ihrer Länge (Fläche und Masse gelten je Meter).
 * Unten die Summe, wie sie das Modul rechnen wird, samt Wind bei der EK des
 * Blattes. Übernommen wird nur, was eine Anzahl hat.
 * =========================================================================== */
const SIGNAL_GRUPPEN = [
  ['signal', 'Signale und Tafeln', true],
  ['korb', 'Arbeitskorb und Schutz', true],
  ['tragwerk', 'Tragwerksteile der Signalaufhängung — nur in Ausnahmen am FL-Tragwerk', false],
];

export function dialogSignal(app, auswahl, fertig) {
  const teile = signalteile();
  const ek = ekVonWindklasse(app.werte.windKlasse);
  // Der Entwurf: je Teil Anzahl und Länge.
  const e = new Map((auswahl ?? []).map((s) => [s.id, { anzahl: Number(s.anzahl) || 0,
                                                     laenge: Number(s.laenge) || null }]));
  const wert = (t) => e.get(t.id) ?? { anzahl: 0, laenge: null };
  const zahl = (v, n = 2) => (Number(v) || 0).toFixed(n);

  const zeile = (t) => {
    const w = wert(t);
    const jeMeter = (Number(t.laenge) || 0) > 0;
    return `<tr${w.anzahl > 0 ? ' class="an"' : ''}>
      <td>${esc(t.name)}${t.profil ? `<br><span class="ablage-meta">${esc(t.profil)}</span>` : ''}</td>
      <td class="num">${zahl(t.aQuer)} / ${zahl(t.aLaengs)}${jeMeter ? '<br><span class="ablage-meta">je m</span>' : ''}</td>
      <td class="num">${zahl(t.masse, 0)}${jeMeter ? ' /m' : ''}</td>
      <td>${jeMeter ? `<input type="number" class="sig-l" data-sig="${esc(t.id)}" step="0.5" min="0"
             value="${zahl(w.laenge ?? t.laenge)}" title="Länge [m]">` : ''}</td>
      <td><input type="number" class="sig-n" data-sig="${esc(t.id)}" step="1" min="0"
             value="${w.anzahl}"></td>
    </tr>`;
  };
  const summeHtml = () => {
    const sf = signalFlaeche(liste());
    return `<b>Summe:</b> G ${zahl(sf.eigengewicht)} kN · A quer ${zahl(sf.aQuer)} m²
      · A längs ${zahl(sf.aLaengs)} m² → Wind (${esc(ek)}, c ${SIGNAL_CW})
      quer ${zahl(windAusFlaeche(sf.aQuer, ek, SIGNAL_CW))} kN,
      längs ${zahl(windAusFlaeche(sf.aLaengs, ek, SIGNAL_CW))} kN`;
  };
  const liste = () => [...e.entries()]
    .filter(([, w]) => w.anzahl > 0)
    .map(([id, w]) => ({ id, anzahl: w.anzahl,
                         ...(w.laenge ? { laenge: w.laenge } : {}) }));

  /*
   * >>> SIGNALE ALS BILDKACHELN (4. Oktober). <<<
   * Weisung: «kann man bei diesem die signal-bilder aus der excel als
   * symbole hinterlegen um die zusammenstellung schnelle vorzunehmen, da
   * man sonst wissen muss wie jedes signal heisst und ich bin nicht vom fach
   * der signale sondern nur tragwerk.» Die Bilder stehen in der Tabelle
   * (Spalte `bild`, aus der Mappe, im Sortiment - nicht in der Ablage). Ein
   * Klick aufs Bild zählt eins dazu, − und + daneben; Name, Flächen und
   * Masse stehen im Titel. In der Fusszeile stehen Fläche längs / quer und
   * Masse je Stück (4. Oktober: «so hat man die möglichkeit bei ähnlichen
   * signalen, die vielleicht nicht aufgeführt sind eine auswahl zu
   * machen») - man wählt dann das Signal mit passenden Werten. Ohne Bild steht die Positionsnummer da - die
   * Kachel bleibt bedienbar. Arbeitskorb und Tragwerksteile behalten die
   * Tabelle (sie haben keine Bilder, und die Tragwerksteile eine Länge).
   */
  const kachel = (t) => {
    const w = wert(t);
    const bild = istBildUrl(t.bild)
      ? `<img src="${esc(t.bild)}" alt="">`
      : `<span class="sig-ohne">${esc(String(t.nr ?? ''))}</span>`;
    return `<div class="sig-kachel${w.anzahl > 0 ? ' an' : ''}" data-sig-kachel="${esc(t.id)}"
        title="${esc(`${t.nr ? `Nr. ${t.nr} · ` : ''}${t.name} · A quer ${zahl(t.aQuer)} / längs ${zahl(t.aLaengs)} m² · ${zahl(t.masse, 0)} kg`)}">
      <button type="button" class="sig-bild" data-sig-plus="${esc(t.id)}"
        aria-label="${esc(t.name)} hinzufügen">${bild}</button>
      <span class="sig-name">${esc(t.name)}</span>
      <span class="sig-zahl">
        <button type="button" class="btn btn-mini" data-sig-minus="${esc(t.id)}" aria-label="eins weniger">−</button>
        <input type="number" class="sig-n" data-sig="${esc(t.id)}" step="1" min="0" value="${w.anzahl}">
        <button type="button" class="btn btn-mini" data-sig-plus="${esc(t.id)}" aria-label="eins mehr">+</button>
      </span>
      <span class="sig-werte" data-sig-werte="${esc(t.id)}"><span>A längs ${zahl(t.aLaengs)} · quer ${zahl(t.aQuer)} m²</span><span>${zahl(t.masse, 0)} kg</span></span>
    </div>`;
  };
  // Was gewählt ist, oben in einer Zeile - mit Bild, damit man es wiedererkennt.
  const gewaehltHtml = () => {
    const tab = new Map(teile.map((t) => [t.id, t]));
    const l = liste();
    if (!l.length) return '<span class="ablage-meta">Noch nichts gewählt - Bild anklicken zählt eins dazu.</span>';
    return l.map((x) => {
      const t = tab.get(x.id);
      const b = t && istBildUrl(t.bild) ? `<img src="${esc(t.bild)}" alt="">` : '';
      return `<span class="sig-chip">${b}${x.anzahl} × ${esc(t?.name ?? x.id)}</span>`;
    }).join('');
  };

  const koerper = teile.length ? `<div class="sig-gewaehlt">${gewaehltHtml()}</div>`
    + SIGNAL_GRUPPEN.map(([g, titel, offen]) => {
    const l = teile.filter((t) => t.gruppe === g);
    if (!l.length) return '';
    const gewaehlt = l.some((t) => wert(t).anzahl > 0);
    const inhalt = g === 'signal'
      ? `<div class="sig-kacheln">${l.map(kachel).join('')}</div>`
      : `<table class="dt sig-tab"><thead><tr><th>Teil</th><th class="num">A quer / längs [m²]</th>
        <th class="num">Masse [kg]</th><th>L [m]</th><th>Anzahl</th></tr></thead>
        <tbody>${l.map(zeile).join('')}</tbody></table>`;
    return `<details class="sig-gruppe"${offen || gewaehlt ? ' open' : ''}>
      <summary>${esc(titel)} <span class="ablage-meta">${l.length} Teile</span></summary>
      ${inhalt}</details>`;
  }).join('') + `<p class="notiz sig-summe">${summeHtml()}</p>
    <p class="notiz">G = Anzahl · Masse / 100 kN (wie die Mappe, 10 N/kg);
      A quer trifft der Wind quer zum Gleis (x), A längs der Wind längs zum Gleis (y).
      Den Angriffspunkt setzt man danach in der Karte.</p>`
    : '<p class="notiz">Die Datenbasis führt keine Signalteile (Tabelle «Signalteile» im Sortiment der Anbauteile).</p>';

  const d = app.dialog('Signalbauer', koerper,
    `<button class="btn" data-zu>Abbrechen</button>
     <button class="btn btn-acc" data-sig-ok${teile.length ? '' : ' disabled'}>Übernehmen</button>`,
    'dialog-signal');
  const n = d.node;
  const neuSumme = () => {
    const p = n.querySelector('.sig-summe'); if (p) p.innerHTML = summeHtml();
    const g = n.querySelector('.sig-gewaehlt'); if (g) g.innerHTML = gewaehltHtml();
  };
  // Eine Anzahl setzen - aus dem Feld, aus − und + und aus dem Bild.
  const setzeAnzahl = (id, v) => {
    v = Math.max(0, Math.round(Number(v) || 0));
    e.set(id, { ...(e.get(id) ?? { laenge: null }), anzahl: v });
    n.querySelectorAll(`.sig-n[data-sig="${CSS.escape(id)}"]`).forEach((inp) => {
      if (String(inp.value) !== String(v)) inp.value = v;
      inp.closest('tr')?.classList.toggle('an', v > 0);
    });
    n.querySelector(`[data-sig-kachel="${CSS.escape(id)}"]`)?.classList.toggle('an', v > 0);
    neuSumme();
  };
  n.querySelectorAll('.sig-n').forEach((inp) => {
    inp.oninput = () => setzeAnzahl(inp.dataset.sig, parseFloat(inp.value));
  });
  n.querySelectorAll('[data-sig-plus]').forEach((b) => {
    b.onclick = () => setzeAnzahl(b.dataset.sigPlus, (e.get(b.dataset.sigPlus)?.anzahl ?? 0) + 1);
  });
  n.querySelectorAll('[data-sig-minus]').forEach((b) => {
    b.onclick = () => setzeAnzahl(b.dataset.sigMinus, (e.get(b.dataset.sigMinus)?.anzahl ?? 0) - 1);
  });
  n.querySelectorAll('.sig-l').forEach((inp) => {
    inp.oninput = () => {
      const id = inp.dataset.sig;
      const v = parseFloat(inp.value);
      e.set(id, { ...(e.get(id) ?? { anzahl: 0 }), laenge: v > 0 ? v : null });
      neuSumme();
    };
  });
  n.querySelector('[data-sig-ok]').onclick = () => {
    d.zu();
    fertig(liste());
  };
  return d;
}
