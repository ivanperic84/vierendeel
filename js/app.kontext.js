/**
 * app.kontext.js
 * ---------------------------------------------------------------------------
 * DIE KONTEXTMENUES: Tragwerk, Mast, Anbauteil, Modellgrund.
 *
 * Seit dem 19. September ein eigenes Modul (Durchsicht vom 18. September,
 * Punkt A1: app.js teilen). Den Arbeitsstand bekommt es als app - das
 * Kontextobjekt aus app.js. Es importiert app.js nicht zurueck.
 * ---------------------------------------------------------------------------
 */
import { dialogAnker, dialogMast, dialogTragwerk } from './app.dialoge.js';
import { TRAGWERKSARTEN, aufRaster, lageVon, mastName, mastenFuer, mastenVon, setzeMastAnker, tauscheAktives, tragwerkHinzu, tragwerkName, tragwerkPos, tragwerkTeil, tragwerkeSortiert, tragwerkeVon, tragwerksart, versteckt } from './core.constants.js';
import { flBauteile, getFlBauteil, hatZustandsgleichung, montagezug, zugAusKern, leiterzugKontext, reglierZusatzlast } from './data.fl.js';
import { hatTraeger, passeTraegerAn, rasterGesetzt, rasterNormVon } from './core.anbauteile.js';
import { anbauGruppe } from './data.anbauteile.js';
import { WIND_KLASSEN, SCHNEE_KLASSEN, EK_KLASSEN, ekKlasseVon, ekVonWindklasse, ekBasisVon, istEinheitswind } from './core.lasten.js';
import { mastWindBeide } from './data.masten.js';
import { esc } from './design.js';
import { lastfallName } from './ui.einfach.js';
import { sortimentstypen } from './data.tragjoche.js';
import { abfangjoche } from './data.abfangjoche.js';
import { LEICHT, mehrAn } from './stufe.js';
import * as ui from './ui.js';

/** Das offene Menue, damit ein zweiter Klick es schliesst. */
let kontextMenue = null;
/** Fuer app.js: steht ein Kontextmenue offen? */
export const kontextOffen = () => Boolean(kontextMenue);

/*
 * >>> DIE INSEL WÄCHST UND SCHRUMPFT WEICH (21. November). <<< «die dynamic
 * island funktioniert nicht sauber»: gemessen sprang sie beim Ausfahren in
 * einem Bild von 344 × 34 auf 497 × 169 px. Jetzt Breite und Höhe als FLIP
 * (vorher messen, umstellen, nachher messen, dazwischen animieren).
 */
export function inselMorph(el, aendern) {
  const a = el.getBoundingClientRect();
  aendern();
  const b = el.getBoundingClientRect();
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || typeof el.animate !== 'function' || (a.width === b.width && a.height === b.height)) return;
  el.style.overflow = 'hidden';
  const an = el.animate([{ width: `${a.width}px`, height: `${a.height}px` },
                         { width: `${b.width}px`, height: `${b.height}px` }],
                        { duration: 380, easing: 'cubic-bezier(.3, 1.15, .5, 1)' });
  const fertig = () => { el.style.overflow = ''; };
  an.onfinish = fertig; an.oncancel = fertig;
}

export function kontextSchliessen(app) {
  if (kontextMenue?.inselZu) {
    const n = kontextMenue;
    kontextMenue = null;
    n.inselZu();
    return;
  }
  kontextMenue?.remove();
  kontextMenue = null;
}

/**
 * Ein Menue an einer Bildschirmstelle.
 *
 * @param {[number,number]} bei   Punkt in CSS-Pixeln
 * @param {Array} punkte          {text, tun, warn} - null trennt Gruppen
 */
/*
 * SCHULUNG (15. November): das Kontextmenü bietet nur, was die
 * Freigabeliste erlaubt; die Schulung setzt keine Lasten von Hand zurück.
 * (Die Stufe «viewer» ist am 18. November gestrichen.) Gefiltert
 * wird an EINER Stelle nach dem Wortlaut der Einträge - jeder Menüpunkt
 * geht hier durch.
 */
/*
 * Schulung (15. November, «kontext menus vereinfachen»): ohne Zeichnung,
 * Gruppen, Markieren, Nachweisschnitt, «rechnen», Steg drehen, gemeinsame
 * Angaben und Datenbankwerte; die Bausteinwahl («Typ») ebenso wie in der Karte.
 */
const SCHULUNG_NICHT = /(Zurücksetzen auf die Datenbankwerte|Gemeinsame Angaben|Zeichnung|Steg drehen|^Masten von|Vom Blatt nehmen|Nur das gerechnete|Alle gleichen Typs|Auf den Nachweisschnitt| rechnen$|^#|^ohne Gruppe$)/;
const SCHULUNG_FELD_NICHT = new Set(['Typ']);
function kontextErlaubt(p) {
  if (!LEICHT || typeof p !== 'object') return true;
  const text = p.text ?? '';
  if (p.feld && SCHULUNG_FELD_NICHT.has(p.feld.label)) return false;
  // «Mehr zeigen» (16. November): Steg drehen, Masten von …, Zeichnung.
  if (mehrAn() && /(Steg drehen|^Masten von|Zeichnung)/.test(text)) return true;
  return !SCHULUNG_NICHT.test(text);
}

export function kontextZeigen(app, bei, punkte, opt = {}) {
  kontextSchliessen(app);
  const echte = punkte.filter(Boolean).filter(kontextErlaubt);
  // Eine Kopfzeile ohne Eintrag bis zur nächsten Kopfzeile oder zum Strich fällt weg.
  for (let i = echte.length - 1; i >= 0; i--) {
    const p = echte[i];
    if (p && typeof p === 'object' && p.kopf) {
      const n = echte[i + 1];
      if (n === undefined || n === '-' || (typeof n === 'object' && n.kopf)) echte.splice(i, 1);
    }
  }
  // Kein Trennstrich am Anfang, am Ende oder doppelt (nach dem Filtern).
  for (let i = echte.length - 1; i >= 0; i--) {
    if (echte[i] === '-' && (i === 0 || i === echte.length - 1 || echte[i - 1] === '-')) echte.splice(i, 1);
  }
  if (!echte.length) return;
  const n = document.createElement('div');
  n.className = 'kontext';
  /*
   * ZWEI ARTEN VON EINTRAG.
   *
   * Ein KNOPF tut etwas und schliesst das Menue. Ein FELD nimmt eine Angabe
   * entgegen und laesst es offen - man aendert einen Typ und danach vielleicht
   * noch die Laenge, ohne zweimal rechtszuklicken.
   *
   * Weisung vom 2. September: «beim kontextmenue bauteil parameter typ länge
   * ausrichtung direkt eintragen können.» Genau das: nicht ein Menuepunkt,
   * der die Karte in der Seitenleiste oeffnet, sondern die Angabe selbst,
   * dort wo man auf das Bauteil zeigt.
   */
  n.innerHTML = echte.map((p, i) => {
    if (p === '-') return '<hr>';
    if (p.kopf) return `<div class="kontext-kopf">${esc(p.kopf)}</div>`;
    // Eine Skizze (22. November) - fertiges, selbst erzeugtes SVG, kein Fremdtext.
    if (p.skizze) return `<div class="kontext-skizze">${p.skizze}</div>`;
    // Eine Zeile Auskunft, nichts zum Anklicken (9. Oktober).
    if (p.info) return `<div class="kontext-info${p.warn ? ' warn' : ''}">${esc(p.info)}</div>`;
    // Schalter in einer Reihe (23. November, Ebenen im Leeren): bleiben offen.
    if (p.chips) return `<div class="kontext-chips">${p.chips.map((c, j) =>
      `<button type="button" class="kontext-chip${c.an ? ' an' : ''}" data-kc="${i}:${j}"
         aria-pressed="${c.an}">${esc(c.text)}</button>`).join('')}</div>`;
    if (p.feld) {
      const f = p.feld;
      const eingabe = f.art === 'auswahl'
        ? `<select data-kf="${i}"${f.grau ? ' class="grau" title="Wind und Schnee von Hand - keine EK passt"' : ''}>${(f.optionen ?? []).map((o) =>
            `<option value="${esc(o.wert)}"${String(o.wert) === String(f.wert)
              ? ' selected' : ''}>${esc(o.text)}</option>`).join('')}</select>`
        : f.art === 'text'
          ? `<input type="text" data-kf="${i}" value="${esc(String(f.wert ?? ''))}"
               placeholder="${esc(f.platzhalter ?? '')}">`
          : `<input type="number" data-kf="${i}" value="${esc(String(f.wert ?? ''))}"
             step="${f.schritt ?? 0.1}"${f.platzhalter ? ` placeholder="${esc(f.platzhalter)}"
             title="${esc(f.platzhalter)}"` : ''}>`;
      return `<label class="kontext-feld"><span>${esc(f.label)}</span>
        ${eingabe}<i>${esc(f.einheit ?? '')}</i></label>`;
    }
    return `<button type="button" class="kontext-p${p.warn ? ' warn' : ''}"
         data-k="${i}">${esc(p.text)}</button>`;
  }).join('');
  /*
   * IN DER INSEL (21. November): «anstatt eine neue box könnte man die
   * dynamic island dynamisch ausfahren.» Mit `opt.ziel` steht das Menü als
   * Panel in diesem Element statt schwebend; die Insel fährt dafür aus
   * (Klasse `offen`), und ein Klick in die Insel schliesst es nicht.
   */
  const ziel = opt.ziel ?? null;
  if (ziel) {
    n.classList.add('insel-panel');
    inselMorph(ziel, () => { ziel.appendChild(n); ziel.classList.add('offen'); });
    n.inselZu = () => inselMorph(ziel, () => { n.remove(); ziel.classList.remove('offen'); });
  } else document.body.appendChild(n);
  kontextMenue = n;
  /*
   * DAS MENUE BLEIBT IM FENSTER.
   *
   * Am rechten oder unteren Rand aufgeklappt ragte es sonst hinaus, und die
   * unteren Eintraege waeren nicht erreichbar - gerade dort, wo die
   * gefaehrlichen stehen.
   */
  if (!ziel) {
    const r = n.getBoundingClientRect();
    const x = Math.min(bei[0], window.innerWidth - r.width - 8);
    const y = Math.min(bei[1], window.innerHeight - r.height - 8);
    n.style.left = `${Math.max(4, x)}px`;
    n.style.top = `${Math.max(4, y)}px`;
  }
  n.querySelectorAll('[data-k]').forEach((b2) => {
    b2.addEventListener('click', () => {
      const p = echte[+b2.dataset.k];
      kontextSchliessen(app);
      p?.tun?.();
    });
  });
  n.querySelectorAll('[data-kc]').forEach((b2) => {
    b2.addEventListener('click', () => {
      const [a, j] = b2.dataset.kc.split(':').map(Number);
      const an = echte[a]?.chips?.[j]?.tun?.();
      b2.classList.toggle('an', Boolean(an));
      b2.setAttribute('aria-pressed', String(Boolean(an)));
    });
  });
  n.querySelectorAll('[data-kf]').forEach((el) => {
    const p = echte[+el.dataset.kf];
    const ev = el.tagName === 'SELECT' ? 'change' : 'change';
    el.addEventListener(ev, () => {
      const v = el.tagName === 'SELECT' || el.type === 'text' ? el.value : parseFloat(el.value);
      if (el.tagName !== 'SELECT' && el.type !== 'text' && !Number.isFinite(v)) return;
      // DAS MENUE BLEIBT OFFEN. Wer den Typ aendert, will oft gleich die
      // Laenge nachziehen - zweimal rechtsklicken waere eine Zumutung.
      p?.tun?.(v);
    });
  });
  /*
   * >>> EIN KLICK INS MENUE SCHLIESST ES NICHT. <<<
   *
   * Hier stand ein `pointerdown`-Horcher ohne diese Pruefung. Mit
   * nachgestellten Klicks fiel das nicht auf - die feuern kein
   * `pointerdown`. Mit einer echten Maus schon: das Menue verschwand beim
   * Druecken, und der `click` landete auf nichts. Kein Eintrag haette
   * funktioniert, und die Ursache waere schwer zu sehen gewesen.
   */
  const zu = (e) => {
    /*
     * NUR EIN ZEIGERDRUCK HAT EIN ZIEL IM BAUM.
     *
     * Derselbe Horcher bedient `pointerdown`, `wheel` und `blur`. Beim
     * Fensterwechsel ist `e.target` das FENSTER, und `Node.contains(Window)`
     * wirft - eine Ausnahme bei jedem Wechsel aus dem Fenster heraus,
     * waehrend ein Menue offen steht. Gemessen am 3. September.
     */
    if (e?.target instanceof Node && (n.contains(e.target) || ziel?.contains(e.target))) return;
    if (ziel && e?.type === 'wheel') return;
    kontextSchliessen(app); ab();
  };
  const ab = () => {
    document.removeEventListener('pointerdown', zu, true);
    window.removeEventListener('wheel', zu, true);
    window.removeEventListener('blur', zu);
  };
  setTimeout(() => {
    document.addEventListener('pointerdown', zu, true);
    window.addEventListener('wheel', zu, true);
    window.addEventListener('blur', zu);
  }, 0);
}

/** Die Einträge zu einem Tragwerk - im Modell wie in der Leiste dieselben. */
export function kontextTragwerk(app, id, k = null) {
  const alle = tragwerkeSortiert(app.werte);
  const t = alle.find((x) => x.id === id);
  if (!t) return [];
  const sichtbar = alle.filter((x) => !versteckt(x));
  const aktiv = (app.werte.twId ?? 'T1') === id;
  const p = [];
  /* =======================================================================
   * >>> DAS FENSTER STEHT ZUOBERST. <<<
   * =======================================================================
   *
   * Weisung vom 16. September: «diese maske auch über das kontextmenue
   * aufrufbar machen.»
   *
   * Sie war nur ueber den zweiten Klick auf ein angewaehltes Tragwerk zu
   * erreichen - ein Weg, den man kennen muss. Im Menue steht sie jetzt an
   * erster Stelle: was man am haeufigsten will, wenn man ein Bauteil
   * anklickt, ist es zu aendern.
   */
  p.push({ text: `${tragwerkName(t, app.werte)} bearbeiten …`,
           tun: () => dialogTragwerk(app, id) });
  if (!aktiv && !versteckt(t)) {
    p.push({ text: `${tragwerkName(t, app.werte)} rechnen`,
             tun: () => app.aendern('tragwerkAktiv', id) });
  }
  if (versteckt(t)) {
    p.push({ text: 'Wieder einblenden', tun: () => app.aendern('tragwerkZeigen', id) });
  } else if (sichtbar.length > 1) {
    p.push({ text: 'Nur dieses zeigen', tun: () => nurDiesesZeigen(app, id) });
    p.push({ text: 'Ausblenden', tun: () => app.aendern('tragwerkAus', id) });
  }
  if (alle.some(versteckt)) {
    p.push({ text: 'Alle wieder einblenden', tun: () => alleZeigen(app) });
  }
  // «Joch: Bauteil hier setzen» (23. November): an der angeklickten Stelle,
  // die Auswahl öffnet dort (wie im Modus «Bauteil setzen»).
  if (k?.welt && Number.isFinite(k.welt.x) && tragwerksart(t).traeger && !versteckt(t)) {
    p.push({ text: 'Bauteil hier setzen …', tun: () => app.setzenAnStelle(k.welt, k.bei) });
  }
  /*
   * «ABFANGJOCH DARÜBER SETZEN» ist weg (30. September): «den Punkt
   * Abfangjoch darüber setzen könnte man weglassen. das ist äusserst
   * selten.» Wer eines über ein Joch legen will, wählt im Dialog «Neues
   * Tragwerk» dessen beide Masten.
   */
  /* =========================================================================
   * >>> DIE ART LAESST SICH WECHSELN. <<<
   * =========================================================================
   *
   * Gefunden am 11. September in einem Bedienlauf: wer ein Tragjoch gesetzt
   * hatte und ein Abfangjoch brauchte, musste ein zweites anlegen und das
   * erste loeschen. Das Kontextmenue bot kopieren, zoomen, verschieben -
   * nur nicht das, was man am haeufigsten will.
   *
   * >>> WAS DABEI BLEIBT UND WAS NICHT. <<<
   *
   * Lage, Laenge, Masten und Anbauteile gehoeren dem TRAGWERK und bleiben.
   * Der TYP gehoert der Art: «J90» steht in keiner Abfangjoch-Liste, und
   * «A240» in keiner Tragjoch-Liste. Ein stehengebliebener Typ waere derselbe
   * Fehler, der beim Anlegen schon einmal aufgeschlagen ist - die
   * Auswahlliste zeigt dann den ersten Eintrag, waehrend im Datensatz etwas
   * anderes steht. `tragwerkNeu` setzt ihn deshalb neu, und diese Stelle
   * benutzt denselben Weg.
   *
   * Die Laenge wandert mit: ein A160 fuehrt 5.5-12.5 m, ein J130 bis 34.5 m.
   * Wer von einem 30-m-Joch auf A160 wechselt, bekommt die naechste Laenge,
   * die der neue Typ wirklich fuehrt.
   * ======================================================================= */
  /*
   * >>> KUERZER (6. Oktober). <<< «Allgemein die längeren Kontextmenues
   * kürzen.» Drei Eintraege «Art wechseln auf: …» sind jetzt EINE Auswahl.
   */
  p.push('-');
  p.push({ feld: { art: 'auswahl', label: 'Art', wert: tragwerksart(t).key,
                   optionen: TRAGWERKSARTEN.map((a) => ({ wert: a.key, text: a.label })) },
           tun: (v) => {
             if (v === tragwerksart(t).key) return;
             kontextSchliessen(app);
             artRueckfrage(app, t, id, v);
           } });
  /*
   * >>> TYP UND LÄNGE DIREKT (23. November). <<< Auf Rückfrage zum Ausbau
   * des Kontextmenüs «Joch: Typ und Länge direkt». Derselbe Weg wie die
   * Seitenleiste: erst das Tragwerk zum gerechneten machen, dann `typ`
   * bzw. `abfangTyp` und `L` - die Regeln (Sortiment, Standardlänge) gelten
   * dort. Das Menü bleibt offen; die Felder zeigen den Stand beim Öffnen.
   */
  const art = tragwerksart(t).key;
  const aktivMachen = () => {
    if ((app.werte.twId ?? 'T1') !== id) app.aendern('tragwerkAktiv', id);
  };
  if (art === 'joch' || art === 'abfangjoch') {
    const ab = art === 'abfangjoch';
    const typen = ab
      ? abfangjoche().map((a) => ({ wert: a.typ, text: `${a.typ}${(a.bauweise ?? 'neu') === 'alt' ? ' (Bestand)' : ''}` }))
      : sortimentstypen().map((j) => ({ wert: j.typ, text: `${j.typ}${(j.bauweise ?? 'neu') === 'alt' ? ' (Bestand)' : ''}` }));
    const jetzt = ab ? t.abfangTyp : t.typ;
    if (typen.length) {
      p.push({ feld: { art: 'auswahl', label: ab ? 'Abfangjoch-Typ' : 'Jochtyp', wert: jetzt ?? '',
                       optionen: typen.some((o) => o.wert === jetzt) ? typen
                         : [{ wert: jetzt ?? '', text: jetzt ?? '–' }, ...typen] },
               tun: (v) => {
                 // Mit dem jetzigen Stand vergleichen - das Menü bleibt offen.
                 const nun = tragwerkeVon(app.werte).find((x) => x.id === id);
                 if (!v || v === (ab ? nun?.abfangTyp : nun?.typ)) return;
                 aktivMachen(); app.aendern(ab ? 'abfangTyp' : 'typ', v);
               } });
    }
    p.push({ feld: { art: 'zahl', label: ab ? 'Trägerlänge' : 'Jochlänge', einheit: 'm', schritt: 0.5,
                     wert: Number(t.L) || 0 },
             tun: (v) => { if (!(v > 0)) return; aktivMachen(); app.aendern('L', v); } });
  }
  /*
   * >>> VERSCHIEBEN UND KOPIEREN STEHEN HIER, NICHT AM ZEIGER. <<<
   *
   * Weisung vom 5. September: «nimm die funktion des drag and drop in der
   * sidebar unter tragwerke raus, diese funktion ist zu unpraezise. nimm
   * dafuer beim 3d unter dem kontextmenue die moeglichkeit elemente zu
   * kopieren verschieben und zu loeschen, dies fuer tragwerke und
   * anbauteile.»
   *
   * VERSCHIEBEN ist eine ZAHL, kein Zug: die Lage x₀ steht als Feld da und
   * laesst sich auf den Zentimeter setzen. Was der Zeiger auf einer Bahn von
   * vierzig Metern nie konnte, kostet hier eine Eingabe.
   *
   * KOPIEREN nimmt den ganzen Satz mit - Typ, Laenge, Profile, Bleche,
   * Anbauteile - und setzt ihn um eine Jochlaenge weiter. Das ist die Geste
   * einer Jochreihe: dasselbe Joch noch einmal, nur woanders.
   */
  p.push('-');
  p.push({ feld: { art: 'zahl', label: 'Lage x₀', einheit: 'm', schritt: 0.05,
                   wert: lageVon(t) },
           tun: (v) => app.aendern('tragwerkLage', { id, x: v }) });
  p.push({ text: `${tragwerkName(t, app.werte)} duplizieren …`, tun: () => tragwerkKopieren(app, id) });
  p.push({ text: 'Auf dieses zoomen', tun: () => app.zoomAufTragwerk(id) });
  if (tragwerksart(t).traeger && mastenFuer(app.werte, t).some(Boolean)) {
    p.push({ text: `${tragwerkName(t, app.werte)} entfernen, Masten als Einzelmasten behalten`,
             tun: () => app.aendern('jochZuEinzelmasten', id) });
  }
  if (alle.length > 1) {
    p.push({ text: 'Vom Blatt nehmen', warn: true,
             tun: () => app.aendern('tragwerkWeg', id) });
  }
  return p;
}

/**
 * >>> EIN TRAGWERK NOCH EINMAL, EINE JOCHLAENGE WEITER. <<<
 *
 * Weisung vom 5. September. Die Kopie traegt alles mit, was das Original
 * traegt - `tragwerkHinzu` bekommt den ganzen Satz als Vorlage. Nur die
 * LAGE ist eine andere: um seine eigene Laenge versetzt, damit die beiden
 * nicht uebereinanderstehen und man die Kopie sieht.
 *
 * Sie wird ausserdem zum GERECHNETEN - wer kopiert, will an der Kopie
 * weiterarbeiten, nicht am Original.
 */
/*
 * >>> KOPIEREN FRAGT, WOHIN (6. Oktober). <<< Weisung im Wortlaut: «Beim
 * afangjoch befehl zum duplizieren und nachfrage wo ablegen. Man modelliert
 * meist den träger für die tragseile oder Fahrdrähte und kopiert dann
 * diesen.» Bisher legte die Kopie sich wortlos ins naechste Feld daneben.
 * Jetzt ein Fenster: an DENSELBEN Masten in anderer Anschlusshoehe (beim
 * Abfangjoch die Vorgabe, 1.50 m tiefer - Tragseil oben, Fahrdraht unten)
 * oder daneben bei x; die Anbauteile am Traeger auf Wunsch mit.
 */
export function tragwerkKopieren(app, id) {
  const t = tragwerkeSortiert(app.werte).find((x) => x.id === id);
  if (!t) return;
  const art = tragwerksart(t).key;
  const L = Number(t.L) || 0;
  const H = Number(t.mastH) || 7.5;
  const xDaneben = lageVon(t) + (L || 2);
  const ueber = art === 'abfangjoch' || art === 'tragjoch';
  const d = app.dialog(`${tragwerkName(t, app.werte)} kopieren`, `
    <div class="feld"><label>Wohin</label>
      ${ueber ? `<label class="schalter"><input type="radio" name="kopie-wo" value="hoehe"${art === 'abfangjoch' ? ' checked' : ''}>
        <span>an <b>dieselben Masten</b>, Anschlusshöhe
          <input id="kopie-h" type="number" class="kurz" step="0.1" value="${Math.max(2, H - 1.5).toFixed(2)}"> m</span></label>` : ''}
      <label class="schalter"><input type="radio" name="kopie-wo" value="daneben"${art === 'abfangjoch' && ueber ? '' : ' checked'}>
        <span><b>daneben</b> bei x =
          <input id="kopie-x" type="number" class="kurz" step="0.1" value="${xDaneben.toFixed(2)}"> m</span></label>
    </div>
    <label class="schalter"><input type="checkbox" id="kopie-teile" checked>
      <span>Anbauteile am Träger mitnehmen</span></label>`,
    '<button class="btn btn-acc" data-kopie-ok>Kopieren</button>');
  d.node.querySelector('[data-kopie-ok]').onclick = () => {
    const wo = d.node.querySelector('input[name="kopie-wo"]:checked')?.value ?? 'daneben';
    const hNeu = Number(d.node.querySelector('#kopie-h')?.value);
    const xNeu = Number(d.node.querySelector('#kopie-x')?.value);
    const mitTeilen = d.node.querySelector('#kopie-teile')?.checked !== false;
    d.zu();
    app.handlung('Tragwerk kopieren', () => {
      const satz = { ...tragwerkTeil(t) };
      delete satz.id;
      delete satz.pos;
      if (!mitTeilen) satz.anbauteile = (satz.anbauteile ?? []).filter((a) => a?.ort === 'mastA' || a?.ort === 'mastB');
      const ziel = wo === 'hoehe' && hNeu > 0
        ? { xLage: lageVon(t), mastH: hNeu, mastHB: hNeu }
        : { xLage: Number.isFinite(xNeu) ? xNeu : xDaneben };
      app.werte = tragwerkHinzu(app.werte, art, { ...satz, ...ziel });
      app.mastNachfuehrenGlobal();
      app.neuRechnen();
      app.meldeImBalken(wo === 'hoehe'
        ? `Kopie an denselben Masten, Anschlusshöhe ${hNeu.toFixed(2)} m`
        : `Kopie bei x = ${(Number.isFinite(xNeu) ? xNeu : xDaneben).toFixed(2)} m`);
    });
  };
}

/**
 * NUR EINES ZEIGEN - alle anderen beiseite.
 *
 * Auf einem Querprofil mit sechs Abschnitten ist das der Griff, den man
 * staendig braucht und der sonst fuenf einzelne Klicks kostet. Das
 * angeklickte wird dabei zum gerechneten: wer es allein sehen will, will
 * daran arbeiten.
 */
export function nurDiesesZeigen(app, id) {
  app.handlung('Nur dieses zeigen', () => {
    if ((app.werte.twId ?? 'T1') !== id) app.werte = tauscheAktives(app.werte, id);
    app.werte = { ...app.werte, ausgeblendet: false,
              weitere: (app.werte.weitere ?? []).map(
                (t) => ({ ...t, ausgeblendet: true })) };
    app.mastNachfuehrenGlobal();
    app.neuRechnen();
  });
}

/** Und alles wieder her. */
export function alleZeigen(app) {
  app.handlung('Alle einblenden', () => {
    app.werte = { ...app.werte, ausgeblendet: false,
              weitere: (app.werte.weitere ?? []).map(
                (t) => ({ ...t, ausgeblendet: false })) };
    app.neuRechnen();
  });
}

/**
 * Die Einträge zu einem Masten.
 *
 * >>> WELCHES TRAGWERK GEMEINT IST, SAGT DER MAST. <<<
 *
 * Weisung vom 9. September: «ich versteh die logik nicht beim ein ausblenden
 * der masten.» Hier lag ein Teil davon: `twId` war IMMER das gerechnete
 * Tragwerk, gleichgültig, welchen Masten man angeklickt hatte. Am linken
 * Masten stand «Masten von … ausschalten» und traf das rechte Joch — bei
 * zwei gleichen Jochen einer Reihe sah man dem Menütext nicht einmal an,
 * dass er den falschen meint.
 *
 * Gemeint ist, wer den Masten TRÄGT. Bei einem geteilten das gerechnete,
 * wenn es ihn trägt — dieselbe Regel wie in der Leiste; sonst der erste.
 */
export function kontextMast(app, mastId, twId, k = null) {
  const m = mastenVon(app.werte).find((x) => x.id === mastId);
  if (!m) return [];
  const traegt = m.traegt ?? [];
  const wer = traegt.includes(twId) ? twId : (traegt[0] ?? twId);
  const t = tragwerkeSortiert(app.werte).find((x) => x.id === wer)
         ?? tragwerkeVon(app.werte)[0];
  const p = [
    /*
     * >>> DAS FENSTER STATT DES SPRUNGS (16. September). <<<
     *
     * Weisung: «diese fenster auch für die maste anzeigen ... diese maske
     * auch über das kontextmenue aufrufbar machen.»
     *
     * Hier stand ein Sprung in die Seitenleiste - er waehlte den Masten an
     * und scrollte zum Profilfeld. Das ist ein Umweg ueber eine Liste, in
     * der man dann weitersucht; das Fenster zeigt, was den Masten ausmacht,
     * auf einmal.
     *
     * DER SPRUNG BLEIBT DARUNTER: was das Fenster nicht fuehrt - Fusspunkt,
     * Zuganker, Windbeiwerte - steht weiterhin nur dort.
     */
    { text: `${mastName(app.werte, m)} bearbeiten …`,
      tun: () => dialogMast(app, mastId) },
    { text: 'In der Seitenleiste bearbeiten', tun: () => {
      app.aendern('mastAktiv', mastId);
      app.zeigeFeld('mastProfil');
    } },
    /*
     * DIE STEGRICHTUNG DREHEN (30. September, «falls es nicht schon
     * vorhanden ist, im kontext menue die option aufnehmen»). Sie gehört
     * dem Masten; derselbe Weg wie das Feld in der Seitenleiste.
     */
    { text: `Steg drehen (jetzt ${(m.steg ?? app.werte.mastSteg ?? 'jochachse') === 'quer'
        ? 'längs zum Gleis' : 'quer zum Gleis'})`,
      tun: () => {
        app.aendern('mastAktiv', mastId);
        const jetzt = m.steg ?? app.werte.mastSteg ?? 'jochachse';
        app.aendern('mastSteg', jetzt === 'quer' ? 'jochachse' : 'quer');
      } },
    { text: 'Auf den Masten zoomen',
      tun: () => { app.station = null; app.ansicht.station = null;
                   app.ansicht.zoomAuf(m.x, null, 2); } },
  ];
  /*
   * DIE MASTEN EINES TRAGWERKS AB- ODER ANSCHALTEN - nur dort, wo es einen
   * Traeger gibt. Beim Einzelmasten waere «Masten ausschalten» der Auftrag,
   * das Tragwerk abzuschaffen.
   */
  /*
   * >>> NUR DER MAST (22. November). <<< Weisung, mit Bild des Menüs am
   * Anker: «diese kontextmenue auswahl reduzieren, so dass es übersichtlicher
   * wird. primär sind die bearbeitenfunktionen des angeklicket bauteils.
   * wenn man in die leere fläche klickt dann algemeiner halten zum beispiel
   * neuer mast / Joch etc.» Neue Tragwerke, die Masten eines Tragwerks und
   * seine Einträge stehen nicht mehr hier: das Tragwerk per Klick auf das
   * Tragwerk, Neues per Klick ins Leere.
   */
  /*
   * >>> WIEDER AUSGEBAUT (23. November). <<< Weisung: «das kontextmenue
   * wurde zu fest zurückgebaut, kann man das wieder etwas ausbauen mit
   * nützlichen befehlen wenn man im 3d auf die jeweiligen bauteile oder ins
   * leere klickt.» Auf Rückfrage am Masten: «profil drehen, falls nicht schon
   * vorhanden» (steht: «Steg drehen»), «Anker setzen/bearbeiten», «Bauteil am
   * Masten setzen», «Neues Tragwerk an diesem Mast».
   */
  void t;
  p.push('-');
  p.push({ text: m.anker ? `Anker bearbeiten (${m.anker.typ || 'Anker'}) …` : 'Anker setzen …',
           tun: () => dialogAnker(app, mastId) });
  if (k?.welt && Number.isFinite(k.welt.z)) {
    p.push({ text: `Bauteil hier am Masten setzen …`,
             tun: () => app.setzenAnStelle(k.welt, k.bei, { nurMast: true }) });
  }
  p.push('-', ...neuesAnMast(app, m));
  return p;
}

/**
 * >>> DER ANKER IM KONTEXTMENÜ (30. September). <<<
 *
 * Weisung: «kontext menue beim anker auch ergänzen, sinngemäss wie bei den
 * restlichen tragwerksteilen.» Der Rechtsklick auf Stab oder Fundament des
 * Ankers führte bis hierher ins Menü des Tragwerks - der Anker selbst kam
 * darin nicht vor. Jetzt: bearbeiten (Dialog), in der Seitenleiste
 * bearbeiten, entfernen, heranzoomen; darunter die Einträge seines Masten,
 * dem er gehört.
 */
export function kontextAnker(app, mastId, twId) {
  const m = mastenVon(app.werte).find((x) => x.id === mastId);
  if (!m?.anker) return kontextMast(app, mastId, twId);
  const name = mastName(app.werte, m);
  return [
    { kopf: `${m.anker.typ || 'Anker'} an ${name}` },
    { text: 'Anker bearbeiten …', tun: () => dialogAnker(app, mastId) },
    { text: 'In der Seitenleiste bearbeiten', tun: () => {
      app.aendern('mastAktiv', mastId);
      app.zeigeFeld('ankerTyp');
    } },
    { text: 'Auf den Anker zoomen',
      tun: () => { app.station = null; app.ansicht.station = null;
                   app.ansicht.zoomAuf(m.x, null, 2); } },
    { text: 'Anker entfernen', tun: () => {
      app.werte = setzeMastAnker(app.werte, mastId, null);
      app.werte = { ...app.werte, mastAktiv: mastId };
      app.neuRechnen();
    } },
    // Nur der Anker (22. November) - der Mast hat sein eigenes Menü.
  ];
}

/** Die Einträge eines Tragwerks unter seinem Namen - für Mast und Grund. */
function tragwerkAbschnitt(app, id) {
  const t = tragwerkeSortiert(app.werte).find((x) => x.id === id);
  if (!t) return [];
  return [{ kopf: `${tragwerkPos(app.werte, t)} · ${tragwerkName(t, app.werte)}` },
          ...kontextTragwerk(app, id)];
}

/**
 * >>> EIN NEUES TRAGWERK AN DIESEM MASTEN (30. September). <<<
 *
 * Weisung: «die auswahl der Masten anbieten wo der träger zu liegen kommen
 * soll. man hat den fall das man schon zwei oder drei masten hat und dann
 * ein joch dazwischen legen will.» Vom angeklickten Masten zum Nachbarn
 * links bzw. rechts; der Dialog «Neues Tragwerk» öffnet mit beiden
 * Masten gewählt, Lage und Stützweite folgen daraus.
 */
function neuesAnMast(app, m) {
  const alle = mastenVon(app.werte).slice().sort((a, b) => a.x - b.x);
  const i = alle.findIndex((x) => x.id === m.id);
  const links = i > 0 ? alle[i - 1] : null;
  const rechts = i >= 0 && i < alle.length - 1 ? alle[i + 1] : null;
  const n = (x) => mastName(app.werte, x);
  const p = [{ kopf: `Neues Tragwerk an ${n(m)}` }];
  ['joch', 'abfangjoch'].forEach((art) => {
    const label = TRAGWERKSARTEN.find((a) => a.key === art)?.label ?? art;
    if (rechts) {
      p.push({ text: `${label} zwischen ${n(m)} und ${n(rechts)} …`,
               tun: () => dialogTragwerk(app, null, art, { mastA: m.id, mastB: rechts.id }) });
    }
    if (links) {
      p.push({ text: `${label} zwischen ${n(links)} und ${n(m)} …`,
               tun: () => dialogTragwerk(app, null, art, { mastA: links.id, mastB: m.id }) });
    }
    if (!links && !rechts) {
      p.push({ text: `${label} ab ${n(m)} …`,
               tun: () => dialogTragwerk(app, null, art, { mastA: m.id }) });
    }
  });
  p.push({ text: `Mast mit Tragausleger an ${n(m)} …`,
           tun: () => dialogTragwerk(app, null, 'tragausleger', { mastA: m.id }) });
  return p;
}

/**
 * DIE EINTRAEGE ZU EINEM ANBAUTEIL - mit den Angaben, nicht nur mit Wegen
 * dorthin.
 *
 * Weisung vom 2. September: «beim kontextmenue bauteil parameter typ länge
 * ausrichtung direkt eintragen können.»
 *
 * >>> WELCHE DREI. <<<
 *
 *   TYP          das Bauteil des ersten Moduls. Es traegt die Baugruppe;
 *                was daran haengt, bleibt haengen.
 *   LAGE/HOEHE   am Joch die Stelle x, am Masten die Hoehe ueber Fundament.
 *                Dieselbe Zahl, die der Klick beim Setzen bestimmt hat -
 *                und die man danach auf den Zentimeter nachzieht.
 *   AUSRICHTUNG  auf welche Seite der Jochachse das Teil ausgreift. Bei
 *                einem Ausleger ist das die haeufigste Korrektur ueberhaupt:
 *                man setzt ihn und sieht, dass er zum falschen Gleis zeigt.
 *
 * Nicht mehr. Ein Kontextmenue mit zwoelf Feldern waere die Bauteilkarte,
 * nur an einer schlechteren Stelle - die steht weiter in der Seitenleiste,
 * und «bearbeiten» fuehrt hin.
 */
export function kontextAnbauteil(app, i) {
  const a = (app.werte.anbauteile ?? [])[i];
  if (!a) return [];
  const setz = (fn) => {
    const liste = (app.werte.anbauteile ?? []).map((x, j) => (j === i ? fn(x) : x));
    app.setzeAnbauteile(liste);
  };
  const mod0 = (a.module ?? [])[0];
  const amMasten = a.ort === 'mastA' || a.ort === 'mastB';
  const p = [{ kopf: a.name ?? 'Bauteil' }];

  /*
   * DER TYP: was die Datenbank an dieser Stelle ueberhaupt zulaesst.
   *
   * Gefiltert nach der ROLLE des jetzigen Bauteils - ein Traeger laesst sich
   * gegen einen anderen Traeger tauschen, nicht gegen einen Fahrdraht. Sonst
   * stuende eine Baugruppe da, deren Glieder nicht mehr aufeinanderpassen,
   * und die Pruefungen meldeten es erst hinterher.
   */
  if (mod0) {
    let rolle = null;
    try { rolle = getFlBauteil(mod0.bauteil)?.rolle ?? null; } catch { /* unbekannt */ }
    const wahl = flBauteile(rolle).map((b2) => ({ wert: b2.id, text: b2.name ?? b2.id }));
    if (wahl.length > 1) {
      p.push({ feld: { art: 'auswahl', label: 'Typ', wert: mod0.bauteil,
                       optionen: wahl },
               tun: (v) => setz((x) => ({ ...x,
                 module: (x.module ?? []).map((m, k) => (k === 0
                   ? { ...m, bauteil: v } : m)) })) });
    }
  }

  // LAGE oder HOEHE - je nachdem, woran es haengt.
  p.push(amMasten
    ? { feld: { art: 'zahl', label: 'Höhe', einheit: 'm', schritt: 0.05,
                wert: a.hMast ?? 0 },
        tun: (v) => setz((x) => ({ ...x, hMast: v })) }
    : { feld: { art: 'zahl', label: 'Lage x', einheit: 'm', schritt: 0.1,
                wert: a.x ?? 0 },
        tun: (v) => setz((x) => ({ ...x, x: v })) });

  /*
   * DIE AUSRICHTUNG: das Vorzeichen der Ausladung.
   *
   * Sie steht als AUSWAHL da, nicht als Kreuzchen - «links / rechts» sagt,
   * was man sieht; «gespiegelt: ja» verlangt, dass man sich den
   * Ausgangszustand merkt. Gespiegelt wird die ganze Baugruppe, damit das,
   * was am Ausleger haengt, mitgeht.
   */
  const ausladung = (a.module ?? []).reduce(
    (m, x) => (Math.abs(x.x ?? 0) > Math.abs(m) ? (x.x ?? 0) : m), 0);
  if (Math.abs(ausladung) > 1e-9) {
    p.push({ feld: { art: 'auswahl', label: 'Ausrichtung',
                     wert: ausladung < 0 ? 'links' : 'rechts',
                     optionen: [{ wert: 'links', text: 'nach links' },
                                { wert: 'rechts', text: 'nach rechts' }] },
             tun: (v) => {
               const soll = v === 'links' ? -1 : 1;
               if (Math.sign(ausladung) === soll) return;
               setz((x) => ({ ...x, module: (x.module ?? []).map(
                 (m) => ({ ...m, x: -(m.x ?? 0) })) }));
             } });
  }

  p.push('-');
  p.push({ text: 'In der Seitenleiste bearbeiten', tun: () => app.zeigeAnbauteil(i) });
  p.push({ text: 'Auf das Bauteil zoomen', tun: () => app.zeigeAnbauteil(i) });
  /*
   * ABSCHALTEN IST NICHT ENTFERNEN - dieselbe Trennung wie beim Tragwerk.
   * Ein abgeschaltetes Bauteil bleibt in der Liste und zaehlt nicht mit;
   * ein entferntes ist weg.
   */
  p.push({ text: a.aktiv === false ? 'Wieder mitrechnen' : 'Nicht mitrechnen',
           tun: () => setz((x) => ({ ...x, aktiv: x.aktiv === false })) });
  /*
   * KOPIEREN (Weisung, 5. September). Ein Bauteil steht selten allein - je
   * Gleis dasselbe, nur eine Spannweite weiter. Die Kopie sitzt einen
   * halben Meter daneben, damit sie nicht im Original verschwindet.
   */
  p.push({ text: 'Duplizieren', tun: () => anbauteilDuplizieren(app, i) });
  p.push({ text: 'Entfernen', warn: true,
           tun: () => app.setzeAnbauteile(
             (app.werte.anbauteile ?? []).filter((_, j) => j !== i)) });
  return p;
}

/**
 * >>> DIE GRUNDWERTE DER TRASSE AN DER FUSSLEISTE DES MODELLS (7. Oktober). <<<
 * Weisung, mit Bild der Marke «EK1» unten rechts: «hier unten die globalen
 * trasse parameter einblenden und durch anklicken bearbeitbar machen.» Die
 * Werte gelten dem ganzen Blatt (BLATT_FELDER); geschrieben wird über
 * `aendern`, derselbe Weg wie aus der Maske - Rückgängig und Neurechnen
 * inbegriffen. Das Fenster bleibt offen, bis man daneben klickt.
 */
export function kontextTrasse(app) {
  const w = app.werte;
  const ja = [{ wert: '1', text: 'ein' }, { wert: '', text: 'aus' }];
  /*
   * >>> DIE LASTEN VON HAND STEHEN HIER, MIT RÜCKSETZKNOPF (9. Oktober). <<<
   * Mit Bild des Fensters, im Wortlaut: «Führe hier die angepassten werte
   * auf und mach noch den button reset». Je Joch mit «Werte bearbeiten» die
   * drei Laufmeterlasten, je Mast die von Hand gesetzte Windlast mit dem
   * Tabellenwert daneben. Der Knopf geht denselben Weg wie «Tabellenwerte»
   * im Reiter Lasten (`lastenBearbeiten` aus) - für jedes Tragwerk des
   * Blattes, und der Mastwind fällt an allen Masten weg.
   */
  const f2 = (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(2) : '–');
  const hand = [];
  const tw = tragwerkeVon(w);
  tw.forEach((t) => {
    if (t.lastHerkunft !== 'manuell' || (t.tragwerksart ?? 'joch') === 'einzelmast') return;
    hand.push({ info: `Joch ${tragwerkPos(w, t)}: g_k ${f2(t.gkManuell)} · w_k ${f2(t.wkManuell)}`
      + `${w.schneeAktiv ? ` · s_k ${f2(t.skManuell)}` : ''} kN/m` });
  });
  let masten = [];
  try { masten = mastenVon(w); } catch { masten = []; }
  masten.forEach((m) => {
    const hx = Number.isFinite(m?.windX), hy = Number.isFinite(m?.windY);
    if (!hx && !hy) return;
    let tab = null;
    try { tab = mastWindBeide(m.profil, ekVonWindklasse(w.windKlasse), m.steg ?? 'jochachse'); } catch { tab = null; }
    const teil = [];
    if (hx) teil.push(`quer ${f2(m.windX)} (Tabelle ${f2(tab?.jochachse)})`);
    if (hy) teil.push(`längs ${f2(m.windY)} (Tabelle ${f2(tab?.gleis)})`);
    hand.push({ info: `Mastwind ${mastName(w, m) || m.id}: ${teil.join(' · ')} kN/m` });
  });
  /*
   * EINZELLEITER UND MONTAGEZUG (22. November): welche Einzelleiter unter den
   * Anbauteilen angeboten werden und mit welchem Montagezug bei 10 °C der
   * Kern rechnet.
   */
  const leiterPunkt = [{ text: 'Einzelleiter und Montagezug …', tun: () => dialogEinzelleiter(app) }];
  const handBlock = hand.length ? ['-', { kopf: 'Lasten von Hand (nicht aus der Datenbank)' }, ...hand.map((h) => ({ ...h, warn: true })),
    { text: 'Zurücksetzen auf die Datenbankwerte', warn: true, tun: () => app.lastenZuruecksetzen() }] : [];
  return [
    ...kontextTrasseFelder(app, w, ja), ...leiterPunkt, ...handBlock];
}

/**
 * >>> EINZELLEITER: ANGEBOTEN UND MONTAGEZUG (22. November). <<< Weisung:
 * «die einzelleiter sollen auswählbar sein welche das man unter den
 * anbauteilen auswähl haben will», dazu der Montagezug je Leiter («für
 * einzelleiter wo man die montage leiterzugkraft eingeben kann … es sollte
 * aber einfach zu bedienen sein»). Je Leiter ein Häkchen und ein Feld;
 * daneben die Züge, mit denen gerechnet wird.
 */
export function dialogEinzelleiter(app) {
  const leiter = () => flBauteile('drahtwerk').filter((b) => hatZustandsgleichung(b) && !/-x\d+$/.test(b.id));
  const f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : '–');
  const body = () => {
    const w = app.werte;
    const aus = new Set(w.einzelleiterAus ?? []);
    const L = leiterzugKontext()?.L ?? w.flSpannweite;
    return `<p class="notiz">Zustandsgleichung ab dem Montagezug bei 10 °C über die Spannweite L_FL ${esc(String(L))} m.
      Leer: Montagezug aus dem Sortiment. Ohne Häkchen steht der Leiter nicht in der Bausteinwahl.</p>
      <div class="tabellenrahmen"><table class="dt"><thead><tr><th>angeboten</th><th>Leiter</th>
        <th class="num">Montagezug 10 °C [kN]</th><th class="num">Z +5 °C</th><th class="num">Z −5 °C + Eis</th><th class="num">Z −20 °C</th></tr></thead>
      <tbody>${leiter().map((b) => {
        const hand = w.leiterMontage?.[b.id];
        let z5 = null, zs = null, z20 = null;
        try { z5 = zugAusKern(b.id, 5); zs = zugAusKern(b.id, -5, reglierZusatzlast('schnee')); z20 = zugAusKern(b.id, -20); } catch { /* ohne Kontext */ }
        return `<tr><td><input type="checkbox" data-el-an="${esc(b.id)}"${aus.has(b.id) ? '' : ' checked'}></td>
          <td>${esc(b.name)}</td>
          <td class="num"><input type="number" step="0.1" min="0" data-el-h="${esc(b.id)}" value="${hand ?? ''}"
            placeholder="${f2(montagezug(b, L))}" style="width:70px"></td>
          <td class="num">${f2(z5)}</td><td class="num">${f2(zs)}</td><td class="num">${f2(z20)}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  };
  app.dialog('Einzelleiter', `<div id="el-rahmen">${body()}</div>`, '', 'dialog-breit');
  const rahmen = document.getElementById('el-rahmen');
  const verdrahten = () => {
    rahmen.querySelectorAll('[data-el-an]').forEach((c) => {
      c.onchange = () => {
        const aus = new Set(app.werte.einzelleiterAus ?? []);
        if (c.checked) aus.delete(c.dataset.elAn); else aus.add(c.dataset.elAn);
        app.aendern('einzelleiterAus', [...aus]);
      };
    });
    rahmen.querySelectorAll('[data-el-h]').forEach((inp) => {
      inp.onchange = () => {
        const m = { ...(app.werte.leiterMontage ?? {}) };
        const v = Number(inp.value);
        if (v > 0) m[inp.dataset.elH] = v; else delete m[inp.dataset.elH];
        app.aendern('leiterMontage', m);
        rahmen.innerHTML = body(); verdrahten();
      };
    });
  };
  verdrahten();
}

/*
 * >>> SKIZZE ZUM VORZEICHEN DES RADIUS (22. November). <<<
 * Weisung, mit Bild des Grundwerte-Fensters: «hier ist zu viel leere fläche.
 * man könnte höchstens noch eine abbildung für das bessere verständniss für
 * den radius angeben -> positiv rechts / negativ links». Grundriss mit x
 * nach rechts (wie die Längsansicht im 3D) und dem Gleis nach oben: R > 0
 * biegt nach rechts, die Umlenkung zeigt in +x (core.trasse.js); R < 0 links.
 * Der eingegebene Fall ist hervorgehoben.
 */
export function radiusSkizze(R) {
  const r = Number(R) || 0;
  const an = (s) => (s === Math.sign(r) ? 'var(--acc)' : 'var(--dim)');
  const op = (s) => (s === Math.sign(r) ? 1 : 0.55);
  const bogen = (s) => `<path d="M60 92 Q60 40 ${60 + s * 34} 10" fill="none" stroke="${an(s)}" stroke-width="${s === Math.sign(r) ? 2.2 : 1.4}" opacity="${op(s)}"/>`
    + `<path d="M${60 + s * 6} 52 l${s * 14} 0" stroke="${an(s)}" stroke-width="1.4" opacity="${op(s)}" marker-end="url(#rs-pf${s > 0 ? 'p' : 'm'})"/>`
    + `<text x="${60 + s * 44}" y="${s > 0 ? 30 : 30}" text-anchor="middle" fill="${an(s)}" opacity="${op(s)}" font-size="10">R ${s > 0 ? '> 0' : '< 0'}</text>`;
  const mk = (id, farbe) => `<marker id="${id}" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="${farbe}"/></marker>`;
  return `<svg viewBox="0 0 120 112" width="120" height="112" role="img" aria-label="Vorzeichen des Radius: positiv biegt nach rechts, negativ nach links">
    <defs>${mk('rs-pfp', an(1))}${mk('rs-pfm', an(-1))}${mk('rs-ax', 'var(--dim)')}</defs>
    <line x1="60" y1="92" x2="60" y2="8" stroke="${r === 0 ? 'var(--acc)' : 'var(--ol)'}" stroke-dasharray="7 2 1.5 2"/>
    ${bogen(1)}${bogen(-1)}
    <line x1="14" y1="104" x2="40" y2="104" stroke="var(--dim)" marker-end="url(#rs-ax)"/>
    <text x="44" y="107" fill="var(--dim)" font-size="9">x</text>
    <text x="104" y="107" text-anchor="end" fill="var(--dim)" font-size="9">Gleis ↑</text>
  </svg>`;
}

/** Das Grundwerte-Panel der Insel neu aufbauen (nach einer Wahl, die andere Felder ändert). */
function grundwerteNeu(app) {
  const ziel = kontextMenue?.inselZu ? kontextMenue.parentElement : null;
  if (!ziel) return;
  kontextSchliessen(app);
  kontextZeigen(app, [0, 0], kontextTrasse(app), { ziel });
}

function kontextTrasseFelder(app, w, ja) {
  return [
    { kopf: 'Grundwerte (ganzes Blatt)' },
    /*
     * >>> EK OBEN, WIND UND SCHNEE DARUNTER (23. November). <<< Mit Bild der
     * Insel: «hier ek auswählen können oder den wind und den schnee
     * unabhängig.», dann «eingabeart streichen. man kann dann direkt das ek
     * auswählen und unten passt sich der wert für den wind und schnee an,
     * wenn man von hand einen dieser werte anpasst, dann wird der obige ek
     * ausgegraut oder ein strich wird angezeigt.» Die EK setzt Windstufe und
     * Höhenlage; Wind (auch Einheitswind) und Schnee lassen sich darunter
     * einzeln stellen. Passt das Paar zu keiner EK (Einheitswind), zeigt die
     * EK «–» und steht ausgegraut. Nach jeder Wahl baut sich das Panel neu
     * (`grundwerteNeu`) - vorher blieb die EK stehen, wenn man den Schnee
     * umstellte.
     */
    (() => {
      const ek = ekKlasseVon(w);
      return { feld: { art: 'auswahl', label: 'EK', wert: ek, grau: !ek,
                       optionen: [...(ek ? [] : [{ wert: '', text: '–' }]),
                         ...EK_KLASSEN.map((k) => ({ wert: k.key, text: k.label }))] },
        tun: (v) => {
          if (!v) return;
          if (istEinheitswind(app.werte)) app.aendern('einheitswind', false);
          app.aendern('ekWahl', v);
          if (!app.werte.schneeAktiv) app.aendern('schneeAktiv', true);
          grundwerteNeu(app);
        } };
    })(),
    { feld: { art: 'auswahl', label: 'Wind', wert: String(w.windKlasse ?? '0.9'),
              optionen: WIND_KLASSEN.map((k) => ({ wert: k.key,
                text: k.einheit ? 'Einheitswind 1.0 (alte Norm)' : `q ${k.qp.toFixed(2)} kN/m² (${k.ek}/EK${Number(k.ek.slice(2)) + 3})` })) },
      tun: (v) => {
        if (v === '1.0') app.aendern('einheitswind', true);
        else {
          if (istEinheitswind(app.werte)) app.aendern('einheitswind', false);
          const ek = EK_KLASSEN.find((k) => k.wind === v && k.schnee === String(app.werte.schneeKlasse ?? '1.25'));
          if (ek) app.aendern('ekWahl', ek.key);
        }
        grundwerteNeu(app);
      } },
    { feld: { art: 'auswahl', label: 'Schnee', wert: w.schneeAktiv ? String(w.schneeKlasse ?? '1.25') : '',
              optionen: [{ wert: '', text: 'aus' },
                ...SCHNEE_KLASSEN.map((k) => ({ wert: k.key, text: `${k.hoch ? 'über' : 'unter'} 1000 m · s ${k.sk.toFixed(2)}` }))] },
      tun: (v) => { app.aendern('schneeAktiv', Boolean(v)); if (v) app.aendern('schneeKlasse', v); grundwerteNeu(app); } },
    { feld: { art: 'auswahl', label: 'Reduktion × 0.74', wert: w.windReduktion ? '1' : '',
              optionen: ja },
      tun: (v) => app.aendern('windReduktion', v === '1') },
    { feld: { art: 'zahl', label: 'Spannweite L_FL', wert: w.flSpannweite ?? 40,
              einheit: 'm', schritt: 1 },
      tun: (v) => { if (v > 0) app.aendern('flSpannweite', v); } },
    { feld: { art: 'zahl', label: 'Radius R', wert: w.trasseRadius ?? 0,
              einheit: 'm', schritt: 50, platzhalter: '0 = gerade' },
      tun: (v) => {
        app.aendern('trasseRadius', v);
        // Die Skizze folgt dem Vorzeichen, ohne das Panel neu aufzubauen.
        const sk = document.querySelector('.insel-panel .kontext-skizze');
        if (sk) sk.innerHTML = radiusSkizze(v);
      } },
    // Breit rechts neben den Feldern, schmal darunter (Stilblatt).
    { skizze: radiusSkizze(w.trasseRadius) },
  ];
}

/**
 * >>> DAS KONTEXTFENSTER DER SEITENLEISTE (7. Oktober). <<< Weisung: «man
 * könnte auch über rechtsklick auf ein anbauteil in der sidebar ein kleines
 * kontextfenster einblenden mit (auswahl gleicher typ / hastag vergeben /
 * verschieben auf ein andere gruppe / verschieben oder kopieren auf ein
 * anderes tragwerk und weiter nützliche optionen).» Gilt der markierten
 * Auswahl, wenn das Teil darin liegt, sonst dem Teil allein.
 */
export function kontextAnbauSeite(app, i) {
  const liste = app.werte.anbauteile ?? [];
  const a = liste[i];
  if (!a) return [];
  const markiert = ui.anbauMarkiert();
  const ziele = markiert.includes(a.id) && markiert.length > 1 ? markiert : [a.id];
  const setzAlle = (fn) => app.setzeAnbauteile(
    (app.werte.anbauteile ?? []).map((x) => (ziele.includes(x.id) ? fn(x) : x)));
  const gruppen = [...new Set(liste.map((x) => anbauGruppe(x)).filter(Boolean))];
  const p = [{ kopf: ziele.length > 1 ? `${ziele.length} markierte Anbauteile` : (a.name ?? 'Anbauteil') }];
  p.push({ text: 'Alle gleichen Typs markieren', tun: () => {
    ui.setzeAnbauMarkiert(liste.filter((x) => x.vorlage && x.vorlage === a.vorlage).map((x) => x.id));
    app.neuRechnen();
  } });
  p.push({ feld: { art: 'auswahl', label: 'In Gruppe', wert: anbauGruppe(a),
                   optionen: [{ wert: '', text: 'ohne Gruppe' }, ...gruppen.map((g) => ({ wert: g, text: `#${g}` }))] },
           tun: (v) => setzAlle((x) => ({ ...x, tag: v })) });
  p.push({ feld: { art: 'text', label: 'Neue Gruppe #', wert: '', platzhalter: 'Name, Enter' },
           tun: (v) => { const t = String(v).replace(/^#+/, '').trim(); if (t) setzAlle((x) => ({ ...x, tag: t })); } });
  const andere = (app.werte.weitere ?? []).filter((t) => TRAGWERKSARTEN
    .find((k) => k.key === (t.tragwerksart ?? 'joch'))?.traeger);
  const amJoch = ziele.every((id) => (liste.find((x) => x.id === id)?.ort ?? 'joch') === 'joch');
  if (andere.length && amJoch && app.anbauAufTragwerk) {
    const opt = [{ wert: '', text: '–' }, ...andere.map((t) => ({ wert: t.id, text: tragwerkPos(app.werte, t) }))];
    p.push('-');
    p.push({ feld: { art: 'auswahl', label: 'Kopieren auf', wert: '', optionen: opt },
             tun: (v) => { if (v) { kontextSchliessen(app); app.anbauAufTragwerk(ziele, v, true); } } });
    p.push({ feld: { art: 'auswahl', label: 'Verschieben auf', wert: '', optionen: opt },
             tun: (v) => { if (v) { kontextSchliessen(app); app.anbauAufTragwerk(ziele, v, false); } } });
  }
  p.push('-');
  if (ziele.length === 1) {
    p.push({ text: 'Duplizieren', tun: () => anbauteilDuplizieren(app, i) });
    p.push({ text: 'Im Modell zeigen', tun: () => app.zeigeAnbauteil(i) });
  } else {
    p.push({ text: 'Gemeinsame Angaben bearbeiten …', tun: () => app.anbauAuswahlBearbeiten?.(ziele) });
  }
  const alleAn = liste.filter((x) => ziele.includes(x.id)).every((x) => x.aktiv !== false);
  p.push({ text: alleAn ? 'Nicht mitrechnen' : 'Wieder mitrechnen',
           tun: () => setzAlle((x) => ({ ...x, aktiv: !alleAn })) });
  p.push({ text: ziele.length > 1 ? `${ziele.length} Teile löschen` : 'Löschen', warn: true,
           tun: () => { ui.setzeAnbauMarkiert([]);
             app.setzeAnbauteile((app.werte.anbauteile ?? []).filter((x) => !ziele.includes(x.id))); } });
  return p;
}

/**
 * >>> DUPLIZIEREN - aus dem Modell, der Karte und ihrem Rechtsklick. <<<
 *
 * Weisung vom 5. September (Kopieren im Modell) und vom 19. September: «Bei
 * der eingabe der bauteile ein dubplizieren mit rechtsklick oder button
 * ermöglichen.» Eine Funktion für alle drei Wege.
 *
 * Die Kopie sitzt einen halben Meter daneben, damit sie nicht im Original
 * verschwindet - am Joch in x (am Jochende nach innen), am Masten höher.
 * Ein Träger weicht wie beim Setzen den Bindeblechen aus, das Raster vom
 * Normalmass aus.
 */
export function anbauteilDuplizieren(app, i) {
  const liste = [...(app.werte.anbauteile ?? [])];
  const a = liste[i];
  if (!a) return;
  /*
   * >>> ERST FRAGEN, WOHIN (1. Oktober). <<<
   * «Nach dem duplizieren fragen wo man es absetzen will, dazu das gesamte
   * tragwerksteil zeigen.» Das Duplizieren startet das Setzen mit der Kopie
   * dieser Baugruppe als Vorwahl (derselbe Weg wie «Kopie setzen»): das
   * Tragwerk steht ganz im Bild, der nächste Klick ins Modell setzt sie ab,
   * Esc bricht ab. Die Kopie entsteht erst dort - mit ihren Modulen, Lasten
   * und von Hand geänderten Zahlen.
   */
  if (app.setzenStarten && app.zoomAufTragwerk) {
    app.zoomAufTragwerk(app.werte.twId ?? 'T1');
    app.setzenStarten({ art: 'kopie', id: a.id });
    return;
  }
  let kopie = { ...a, id: `AT-${Math.random().toString(36).slice(2, 8)}`,
                module: (a.module ?? []).map((m) => ({ ...m })),
                lasten: (a.lasten ?? []).map((l) => ({ ...l })) };
  if ((a.ort ?? 'joch') === 'joch') {
    const x = Number(a.x) || 0;
    const L = Number(app.werte.L) || Infinity;
    // Die Module stehen relativ zur Baugruppe (a.x + m.x) und rücken mit.
    kopie.x = x + 0.5 <= L ? x + 0.5 : Math.max(0, x - 0.5);
    const modell = app.letzte?.erg?.modell;
    if (modell && hatTraeger(kopie.module, (id) => getFlBauteil(id).rolle)) {
      const an = passeTraegerAn(kopie.x, rasterNormVon(kopie), modell);
      kopie = { ...rasterGesetzt(kopie, an), x: an.x };
    }
  } else {
    // Am Masten eine Stufe hoeher - ganz oben eine tiefer, sonst rutschte
    // die Kopie mit jedem Klick weiter in die Luft (Befund vom
    // 19. September am Einzelmast). Die Grenze ist seit dem 20. September
    // nicht mehr der Kopf, sondern die Reglerhoehe: Lasten oberhalb der
    // Mastspitze sind zugelassen.
    const h = Number(a.hMast) || 0;
    const kopf = ui.mastReglerHoehe(app.werte, a.ort === 'mastB' ? 'B' : 'A');
    kopie.hMast = Math.round((h + 0.5 <= kopf + 1e-9 ? h + 0.5 : Math.max(0, h - 0.5)) * 100) / 100;
  }
  liste.splice(i + 1, 0, kopie);
  app.setzeAnbauteile(liste);
  app.meldeImBalken?.(`«${a.name ?? 'Bauteil'}» dupliziert als A${i + 2}`);
}

/**
 * Die Einträge auf leerem Grund.
 *
 * Hier steht, was das BILD betrifft und was man sonst unten links oder in
 * der Werkzeugleiste sucht. Kein zweites Hauptmenue - nur die drei Fahrten,
 * die man staendig braucht, und die beiden Handlungen, die im Modell
 * beginnen.
 */
export function kontextGrund(app, k) {
  const p = [
    { text: 'Ganzes Querprofil zeigen',
      tun: () => { app.station = null; app.ansicht.station = null;
                   app.ansicht.schwenkeAufsGanze('iso'); app.zeichneAuswertung(); } },
    { text: 'Nur das gerechnete Tragwerk',
      tun: () => app.zoomAufTragwerk(app.werte.twId ?? 'T1') },
  ];
  // Der Nachweisschnitt gehört zur Kontrollrechnung (Einfeldträger); mit
  // dem Stabwerk gibt es ihn in der Oberfläche nicht mehr (Audit 21. November).
  if (app.letzte?.erg?.schnitt && !app.ohneBalken) {
    p.push({ text: 'Auf den Nachweisschnitt', tun: () => app.ansicht.zeigeSchnitt(2.5) });
  }
  /*
   * >>> EIN TRAGWERK DORT ANLEGEN, WO MAN HINZEIGT. <<<
   *
   * Weisung vom 3. September: «ich könnte mir persönlich ein ähnliches
   * vorgehen vorstellen wie bei den anbauteilen wo man diese in das modell
   * zieht oder per rechtsklick ein neues tragelement hinzufügen könnte.»
   *
   * Genau so. Der Knopf «+ Tragwerk» in der Leiste haengt das naechste
   * rechts an - der Regelfall einer Reihe. Wer es woanders haben will,
   * zeigt hin: ein Abfangjoch UEBER ein bestehendes Tragjoch etwa laesst
   * sich nur so setzen, denn es teilt sich dessen Strecke.
   *
   * Die Stelle wird auf den halben Meter gerastet - dieselbe Grobheit wie
   * beim Ziehen, aus demselben Grund: ein Klick ins Bild trifft keinen
   * Zentimeter.
   */
  if (Number.isFinite(k?.welt?.x)) {
    const wo = aufRaster(k.welt.x);
    /*
     * >>> JE NACH STELLE (6. Oktober). <<< «Beim Abfangjoch ist der
     * Kontextmodal im 3d überladen. Allgemein die längeren Kontextmenues
     * kürzen. Jenachdem wo man klickt die auswahl anpassen (joch / mast /
     * anker / leere stelle etc.)». Ein Klick neben den Traeger im Bereich
     * eines Tragwerks meint dieses Tragwerk - dann nur sein Abschnitt, kein
     * «Neues Tragwerk». An einer freien Stelle das Neue, als EINE Auswahl
     * statt vier Eintraegen.
     */
    const imBereich = tragwerkeSortiert(app.werte)
      .filter((t) => !versteckt(t) && tragwerksart(t).masten >= 2)
      .filter((t) => {
        const x0 = lageVon(t), L = Number(t.L) || 0;
        return k.welt.x >= x0 - 0.3 && k.welt.x <= x0 + L + 0.3;
      });
    // Ins Leere geklickt ist allgemein (22. November): immer «Neu …», auch
    // im Bereich eines Tragwerks - es bearbeitet man per Klick auf es selbst.
    void imBereich; void tragwerkAbschnitt;
    p.push('-');
    p.push({ feld: { art: 'auswahl', label: `Neu bei x ${wo.toFixed(2)}`, wert: '',
                     optionen: [{ wert: '', text: 'Tragwerk wählen …' },
                       ...TRAGWERKSARTEN.map((a) => ({ wert: a.key, text: a.label }))] },
             tun: (v) => {
               if (!v) return;
               kontextSchliessen(app);
               dialogTragwerk(app, null, v, vorbelegungAnStelle(app, v, wo));
             } });
    // «Neuer Einzelmast hier» (23. November) - ohne den Umweg über die Auswahl.
    p.push({ text: `Einzelmast bei x ${wo.toFixed(2)} …`,
             tun: () => dialogTragwerk(app, null, 'einzelmast', vorbelegungAnStelle(app, 'einzelmast', wo)) });
  }
  /*
   * >>> LASTFALL UND EBENEN IM LEEREN (23. November). <<< Auf Rückfrage zum
   * Ausbau: «Lastfall wählen», «Ebenen ein/aus». Der Lastfall geht denselben
   * Weg wie eine Zeile der Lastfallliste (`anzeigeKombi`); die Ebenen
   * schalten dieselben Merker wie die Werkzeugleiste. Das Menü bleibt dabei
   * offen - man schaltet oft mehrere.
   */
  const lf = (app.letzte?.kombi?.lastfaelle ?? []).filter((l) => l.nachweis === true);
  if (lf.length) {
    p.push('-');
    p.push({ feld: { art: 'auswahl', label: 'Lastfall', wert: app.anzeigeKombi ?? 'umhuellend',
                     optionen: [{ wert: 'umhuellend', text: 'umhüllend (alle Fälle)' },
                       ...lf.map((l) => ({ wert: l.key, text: lastfallName(app.letzte.kombi, l) }))] },
             tun: (v) => { app.anzeigeKombi = v; app.neuRechnen(false); } });
  }
  const eb = app.ansicht?.ebenen;
  if (eb) {
    const da = app.ansicht.szene ? app.ansicht.ebenenVorhanden?.() : null;
    const zeichneNeu = () => { app.ansicht.zeichne(); app.zeichneModellWerkzeuge?.(); };
    const chip = (key, text) => ((!da || key === 'last' || key === 'zeichnung' || da.has(key))
      ? { text, an: Boolean(eb[key]),
          tun: () => { eb[key] = !eb[key]; zeichneNeu(); return Boolean(eb[key]); } } : null);
    const chips = [chip('last', 'Lasten'), chip('anbau', 'Anbauteile'), chip('mast', 'Masten'),
      chip('profil', 'Gurte'), chip('masse', 'Masse'),
      app.ansicht.zeichnung ? chip('zeichnung', 'Zeichnung') : null].filter(Boolean);
    if (chips.length) p.push({ kopf: 'Ebenen' }, { chips });
  }
  p.push('-');
  p.push({ text: app.setzen ? 'Bauteil setzen abbrechen' : 'Bauteil setzen',
           tun: () => (app.setzen ? app.setzenEnde() : app.setzenStarten()) });
  if (app.ansicht.zeichnung?.kalibrierung) {
    p.push({ text: 'Zeichnung verschieben', tun: () => app.bildSchiebenStarten() });
    p.push({ text: 'Zeichnung ausrichten', tun: () => app.ausrichtenStarten() });
  }
  if (tragwerkeSortiert(app.werte).some(versteckt)) {
    p.push('-');
    p.push({ text: 'Alle Tragwerke einblenden', tun: () => alleZeigen(app) });
  }
  return p;
}

/**
 * Die Vorbelegung des Dialogs «Neues Tragwerk» an einer Stelle x - für den
 * Rechtsklick auf den Grund und das Ablegen einer Kachel (30. September).
 * Stehen links und rechts der Stelle Masten, sind sie bei den Arten mit
 * zwei Masten gewählt; beim Tragausleger der Mast, der auf 2 m daneben
 * steht.
 */
export function vorbelegungAnStelle(app, art, wo) {
  const ms = mastenVon(app.werte);
  const zwei = (TRAGWERKSARTEN.find((a) => a.key === art)?.masten ?? 1) >= 2;
  if (zwei) {
    const li = ms.filter((m) => m.x <= wo + 1e-9).sort((a, b) => b.x - a.x)[0] ?? null;
    const re = ms.filter((m) => m.x > wo + 1e-9).sort((a, b) => a.x - b.x)[0] ?? null;
    return li ? { x0: wo, mastA: li.id, mastB: re?.id ?? '' } : { x0: wo };
  }
  if (art === 'tragausleger') {
    const nah = naechsterMast(app, wo, 2);
    return nah ? { x0: nah.x, mastA: nah.id } : { x0: wo };
  }
  return { x0: wo };
}

/** Der Mast, der der Stelle am nächsten steht - höchstens `bis` Meter daneben. */
export function naechsterMast(app, wo, bis) {
  return mastenVon(app.werte)
    .map((m) => ({ m, d: Math.abs(m.x - wo) }))
    .filter((o) => o.d <= bis)
    .sort((a, b) => a.d - b.d)[0]?.m ?? null;
}

/**
 * Der Rechtsklick im Modell.
 *
 * Die Ansicht meldet nur, WORAUF geklickt wurde; was dort angeboten wird,
 * entscheidet sich hier. So bleibt die Zeichenflaeche frei von Wissen ueber
 * Ausblenden und Bauteillisten.
 */
export function kontextImModell(app, k) {
  const twId = k.twId ?? app.werte.twId ?? 'T1';
  let punkte;
  if (k.was === 'mast' || k.was === 'anker') {
    // Das Ende gehoert dem Tragwerk, an dem der Mast gezeichnet wurde.
    const t = tragwerkeSortiert(app.werte).find((x) => x.id === twId);
    const [a, b] = t ? mastenFuer(app.werte, t) : [null, null];
    const m = k.mastEnde === 'B' ? b : a;
    punkte = !m ? []
      : k.was === 'anker' ? kontextAnker(app, m.id, twId)
      : kontextMast(app, m.id, twId, k);
  } else if (k.was === 'anbauteil' && k.anbauteil !== null) {
    punkte = kontextAnbauteil(app, k.anbauteil);
  } else if (k.was === 'tragwerk') {
    punkte = kontextTragwerk(app, twId, k);
  } else {
    punkte = kontextGrund(app, k);
  }
  kontextZeigen(app, k.bei, punkte);
}

/*
 * >>> ART UMSTELLEN NUR MIT RÜCKFRAGE (Audit 21. November, Block 3). <<<
 * Auf Rückfrage «Rückfrage einbauen»: im Kontextmenü stellte ein Klick in
 * der Auswahl «Art» das Tragwerk um - ohne Wort; bei einer Art ohne Träger
 * gehen dabei die Anbauteile am Träger weg, Typ und Länge springen aufs
 * Sortiment der neuen Art. Jetzt sagt ein Dialog, was sich ändert.
 */
function artRueckfrage(app, t, id, v) {
  const neu = TRAGWERKSARTEN.find((a) => a.key === v);
  const alt = tragwerksart(t);
  const amTraeger = (t.anbauteile ?? []).filter((a) => a && a.ort !== 'mastA' && a.ort !== 'mastB').length;
  const verlust = !neu?.traeger && amTraeger > 0
    ? `<li><b>${amTraeger} Anbauteil${amTraeger === 1 ? '' : 'e'} am Träger</b> ${amTraeger === 1 ? 'fällt' : 'fallen'} weg (die Teile an den Masten bleiben).</li>` : '';
  const d = app.dialog(`${tragwerkName(t, app.werte)}: Art umstellen`, `
    <p>Von <b>${esc(alt.label)}</b> auf <b>${esc(neu?.label ?? v)}</b>.</p>
    <ul class="notiz">
      <li>Typ und Länge springen auf das Sortiment der neuen Art.</li>
      ${verlust}
      <li>Rückgängig mit Strg+Z.</li>
    </ul>`,
    '<button class="btn btn-acc" data-art-ok>Umstellen</button>');
  d.node.querySelector('[data-art-ok]').onclick = () => {
    d.zu();
    if ((app.werte.twId ?? 'T1') !== id) app.werte = tauscheAktives(app.werte, id);
    app.aendern('tragwerkArt', { id, art: v });
  };
}
