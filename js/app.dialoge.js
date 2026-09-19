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
import { TRAGWERKSARTEN, gewaehlterMast, lageVon, mastName, mastenVon, setzeMastAnker, tauscheAktives, tragwerkName, tragwerkeSortiert, tragwerksart } from './core.constants.js';
import { abfangLaengenbereich, abfangjoche, getAbfangjoch } from './data.abfangjoche.js';
import { ANKER_BEFESTIGUNGEN, ankerTraegtDruck, ankerTypen } from './data.anker.js';
import { STEGRICHTUNGEN, mastprofile } from './data.masten.js';
import { getTragjoch, tragjoche } from './data.tragjoche.js';
import { esc } from './design.js';

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
          >M${j + 1} · ${esc(x.profil ?? 'ohne Profil')} · x ${
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
  let e = {
    profil: m.profil ?? app.werte.mastProfil ?? 'HEB 240',
    steg: m.steg ?? app.werte.mastSteg ?? 'jochachse',
    H: Number(m.H) > 0 ? Number(m.H) : (Number(app.werte.mastH) || 7.5),
    laenge: Number(m.laenge) > 0 ? Number(m.laenge)
                                 : (Number(app.werte.mastLaenge) || 0),
    x: Number(m.x) || 0,
  };
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
      <small class="hinweis">m · über dem Mastfuss. Dieselbe Zahl steht im
        Fenster des Tragwerks.</small></div>`}

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
      if (Math.abs(e.H - (Number(m.H) || Number(app.werte.mastH) || 0)) > 1e-9) {
        app.aendern('mastH', e.H);
      }
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

export function dialogTragwerk(app, id = null, artVor = null) {
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
  };
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
    try {
      const j = getTragjoch(e.typ);
      const ls = (j?.laengen ?? []).map(Number).filter(Number.isFinite);
      if (ls.length) {
        return { min: Math.min(...ls), max: Math.max(...ls),
                 text: `${Math.min(...ls).toFixed(1)}–${Math.max(...ls).toFixed(1)} m` };
      }
    } catch { /* ohne Sortiment freie Laenge */ }
    return { min: 4, max: 40, text: '' };
  };

  const koerper = () => {
    const b = bereich();
    const typListe = istAbfang()
      ? abfangjoche().map((a) => ({ wert: a.typ,
          text: `${a.typ} · ${a.profil} · ${abfangLaengenbereich(a).text}` }))
      : tragjoche().map((j) => ({ wert: j.typ,
          text: `${j.typ} · jd ${j.jd} mm` }));
    const typJetzt = istAbfang() ? e.abfangTyp : e.typ;
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

    ${artDef().traeger ? `<div class="feld">
      <label for="dlg-tw-typ">Welcher Typ</label>
      <select id="dlg-tw-typ">${typListe.map((o) =>
        `<option value="${esc(o.wert)}"${o.wert === typJetzt ? ' selected' : ''}
          >${esc(o.text)}</option>`).join('')}</select>
      <small class="hinweis">${istAbfang()
        ? 'Das Abfangjoch nimmt den Leiterzug auf — zwei Gurte nebeneinander.'
        : 'Das Tragjoch trägt Gewicht, Schnee und Wind — vier Winkelgurte.'}
      </small></div>` : ''}

    ${mitLaenge() ? `<div class="feld">
      <label for="dlg-tw-l">Stützweite</label>
      <input id="dlg-tw-l" type="number" step="0.5" min="${b.min}"
             max="${b.max}" value="${e.L.toFixed(2)}">
      <small class="hinweis">m${b.text
        ? ` · das Sortiment führt ${esc(b.text)}` : ''}</small></div>` : ''}

    ${artDef().masten >= 1 ? `<div class="feld">
      <label for="dlg-tw-h">Anschlusshöhe</label>
      <input id="dlg-tw-h" type="number" step="0.1" min="2" max="20"
             value="${e.H.toFixed(2)}">
      <small class="hinweis">m · über dem Mastfuss, gemessen an
        ${esc(erstenMastVon(app, t)?.id ?? 'M1')}. Der zweite Mast folgt ihr,
        solange er nicht eigens verstellt ist.</small></div>` : ''}

    <div class="feld"><label for="dlg-tw-x">Lage auf dem Querprofil</label>
      <input id="dlg-tw-x" type="number" step="0.05" value="${e.x0.toFixed(2)}">
      <small class="hinweis">m · quer zum Gleis, in der Jochachse, ab dem
        Nullpunkt der Zeichnung.</small></div>

    <p class="notiz">${neuesTragwerk
      ? 'Profile, Bleche und Anbauteile übernimmt das neue Tragwerk vom '
        + 'zuletzt gewählten — sie lassen sich danach in der Maske ändern.'
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
        neu();
      };
    });
    const typ = n.querySelector('#dlg-tw-typ');
    if (typ) typ.onchange = () => {
      if (istAbfang()) e.abfangTyp = typ.value; else e.typ = typ.value;
      const b2 = bereich();
      e.L = Math.min(Math.max(e.L, b2.min), b2.max);
      neu();
    };
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
    n.querySelector('[data-tw-ok]').onclick = () => {
      d.zu();
      if (neuesTragwerk) {
        app.aendern('tragwerkNeu', { art: e.art, xLage: e.x0 });
        // Typ und Laenge danach setzen: `tragwerkHinzu` bringt die Vorgabe
        // der Art mit, und die soll der Entwurf ueberschreiben.
        if (artDef().traeger) {
          app.aendern(istAbfang() ? 'abfangTyp' : 'typ',
                  istAbfang() ? e.abfangTyp : e.typ);
        }
        if (mitLaenge()) app.aendern('L', e.L);
        return;
      }
      if (tragwerksart(t).key !== e.art) {
        app.aendern('tragwerkArt', { id, art: e.art });
      } else if ((app.werte.twId ?? 'T1') !== id) {
        app.werte = tauscheAktives(app.werte, id);
      }
      if (artDef().traeger) {
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
    };
  }
  verdrahte();
}
