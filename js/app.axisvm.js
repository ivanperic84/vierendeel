/**
 * app.axisvm.js
 * ---------------------------------------------------------------------------
 * DIE AUSLEITUNG NACH AXISVM: Dialog (COM, SAF, DXF, PyNite) und Klick.
 *
 * Seit dem 19. September ein eigenes Modul (Durchsicht vom 18. September,
 * Punkt A1: app.js teilen). Den Arbeitsstand bekommt es als `app` -
 * siehe das Kontextobjekt in app.js. Es importiert app.js nicht zurueck.
 * ---------------------------------------------------------------------------
 */
import { mastenVon, tragwerkSatz, tragwerksart } from './core.constants.js';
import { berechne, modell } from './core.vierendeel.js';
import { getProfil, getStahl } from './data.profiles.js';
import { getTragjoch } from './data.tragjoche.js';
import { esc } from './design.js';
import { exportiereAbfangJson } from './export.axisvm.abfang.js';
import { KNOTENMODELLE, auflagerAngebot, auflagerVorgabe, exportiereAxisvm, exportiereDxf, exportiereJson } from './export.axisvm.js';
import { exportierePynite } from './export.pynite.js';

/**
 * AxisVM-Ausleitung (SAF).
 *
 * Das Knotenmodell wird GEFRAGT, nicht angenommen: es entscheidet, ob AxisVM
 * auf den Schwerachsen oder am Anschnitt rechnet, und damit über die Momente,
 * die hinterher verglichen werden.
 */
export function dialogAxisvm(app) {
  if (!app.letzte) return;
  /*
   * >>> DIESELBE MASKE FUER ALLE ARTEN. <<<
   *
   * Weisung vom 4. September: «die gleiche maske fuer alle arten von
   * tragwerken. die bennenung und auswahl ist dann entsprechend
   * anzupassen.»
   *
   * Bis dahin bekam das Abfangjoch einen eigenen, kuerzeren Dialog - die
   * Wahl war dort im Modell entschieden. Das war bequem und uneinheitlich:
   * wer zwischen zwei Tragwerken wechselt, sah zwei verschiedene Masken
   * fuer dieselbe Handlung.
   *
   * Jetzt steht eine Maske da. Was fuer eine Art nicht gilt, faellt aus der
   * Liste; was anders heisst, traegt seinen eigenen Namen (`labelAbfang`).
   */
  const art = tragwerksart(app.werte).key;
  const istAbfang = art === 'abfangjoch';
  const wahl = KNOTENMODELLE.map((k, i) => `
    <label class="schalter">
      <input type="radio" name="km" value="${k.key}"${i === 0 ? ' checked' : ''}>
      <span>${esc(k.label)}</span>
    </label>`).join('');
  // Die Vorgabe hängt an der Bauweise: die Altbauweise ist zu flach, als
  // dass ein Kräftepaar aus Ober- und Untergurt das Ende halten dürfte.
  const vorgabe = istAbfang ? 'punkt' : auflagerVorgabe(app.letzte.erg.modell);
  // Das Mastmodell baut den Mast wirklich auf - ohne Mast in der Eingabe
  // gibt es nichts zu bauen. Ausgegraut statt versteckt: so ist zu sehen,
  // dass es das Modell gibt und woran es haengt.
  const hatMast = !!app.letzte.erg.modell.federn?.mast;
  /*
   * >>> NUR DIE LAGERUNG, DIE DIESES TRAGWERK HAT. <<<
   *
   * Weisung vom 12. September: «kannst du beim output die lagerung gemaess
   * unseren aktuellen definition anbieten und die restlichen weglassen,
   * falls nicht wirklich notwendig.»
   *
   * Hier standen alle vier Modelle nebeneinander, drei davon ohne Bezug zum
   * Tragwerk auf dem Tisch. Es bleiben zwei: seine eigene Lagerung und der
   * Punkt je Ende fuer den Abgleich mit dem Ersatzbalken. Was das kann und
   * was nicht, steht bei `auflagerAngebot`.
   */
  const lager = auflagerAngebot(app.letzte.erg.modell, art, hatMast).map((k) => {
    /*
     * DER MAST IM ABFANGJOCH-MODELL FEHLT NOCH. Die Weisung nennt ihn -
     * «spaeter beim masten wie bei den tragjochen vorgehen» -, gebaut ist
     * er nicht: das Modell setzt bisher einen Auflagerpunkt je Ende. Die
     * Zeile steht trotzdem da, damit die Maske dieselbe ist.
     */
    /*
     * SEIT DEM 11. SEPTEMBER KANN AUCH DAS ABFANGJOCH MIT MAST (Weisung:
     * «Auflager so machen dass zuerst die starrelemente von mast ausgeht»).
     * Hier stand `istAbfang ? false` - die Zeile war ausgegraut, weil das
     * Modell keinen Masten kannte. Jetzt gilt fuer beide Arten dieselbe
     * Bedingung: es braucht einen Masten im Tragwerk.
     */
    const geht = k.braucht !== 'mast' ? true : hatMast;
    return `
    <label class="schalter${geht ? '' : ' aus'}">
      <input type="radio" name="am" value="${k.key}"${k.key === vorgabe ? ' checked' : ''}${geht ? '' : ' disabled'}>
      <span>${esc(k.label)}${geht ? ''
        : ' — braucht einen Masten im Tragwerk'}</span>
    </label>`;
  }).join('');
  const d = app.dialog('AxisVM-Ausleitung', `
    <p>${istAbfang
      ? `Schreibt das Stabmodell des <b>${esc(app.werte.abfangTyp ?? '')}</b> über
         <b>${Number(app.werte.L).toFixed(2)} m</b> aus: zwei Gurte, die
         Bindebleche jeder Station auf Flanschhöhe, die Quersteifen an den
         Bereichsgrenzen und die Gabel am Jochende auf ihrer versetzten
         Achse.`
      : `Schreibt das Stabmodell aus: vier Gurte, die Bindebleche jeder Station,
         die Gabellagerung und die Anbauteile am wirklichen Angriffspunkt. Die
         Lasten laufen <b>je Einwirkungsgruppe getrennt und charakteristisch</b>
         heraus; die ständige Last dabei nochmals geteilt in <b>Joch,
         Anbauteile und Ablenkkräfte</b>.`}</p>
    <p class="notiz">Über die COM-Brücke kommen ausserdem mit: das
       <b>Eigengewicht der Stäbe</b> als Last im ständigen Lastfall und die
       <b>Lastkombinationen dieser Anwendung</b> — AxisVM erzeugt also keine
       eigenen. Gerechnet wird nicht; der Startknopf bleibt Ihre
       Entscheidung.</p>
    <div class="feld"><label>Format</label>
      <label class="schalter"><input type="radio" name="fmt" value="json" checked>
        <span>JSON für die COM-Brücke, vollständig, ohne Zusatzmodul.
              Datei neben <code>com/AxisVM_aufbauen.cmd</code> legen</span></label>
      ${['saf', 'dxf', 'pynite'].map((f) => {
        const t = { saf: 'SAF-Mappe (.xlsx), vollständig, braucht aber das '
                       + 'SAF-Interface in AxisVM (kostenpflichtiges Modul)',
                    dxf: 'DXF + Zuordnungsmappe, nur die Geometrie; '
                       + 'Querschnitte, Auflager und Lasten von Hand',
                    pynite: 'PyNite-Skript (.py), freie Gegenrechnung, '
                          + 'läuft ohne AxisVM' }[f];
        /*
         * WAS ES NICHT GIBT, STEHT AUSGEGRAUT DA - nicht versteckt. So ist
         * zu sehen, dass es den Weg gibt und woran er haengt; ein Feld, das
         * je nach Tragwerk verschwindet, laesst den Benutzer suchen.
         */
        return `<label class="schalter${istAbfang ? ' aus' : ''}">
          <input type="radio" name="fmt" value="${f}"${istAbfang ? ' disabled' : ''}>
          <span>${t}${istAbfang ? ' — für das Abfangjoch noch nicht gebaut' : ''}</span>
        </label>`;
      }).join('')}
    </div>
    ${istAbfang ? '' : `<div class="feld"><label>Knotenmodell</label>${wahl}</div>`}
    <div class="feld"><label>Auflagermodell</label>${lager}
      <p class="notiz">In Jochachse hält <b>genau ein Knoten</b> — mehr verlangt
         das Gleichgewicht nicht, und jeder weitere wäre ein Zwang. Nur im
         Mastmodell halten beide Fundamente, dort aber über die Biegung der
         Maste.</p></div>
    ${istAbfang ? '' : `<div class="feld"><label>Starrelemente</label>
      <label class="schalter"><input type="radio" name="starr" value="koerper" checked>
        <span>als Starrkörper und Verbindungselemente, so, wie AxisVM sie
              führt. Der Übergang Gurt → Anbauteil wird ein
              Verbindungselement; dort lässt sich die Kraftübertragung je
              Richtung einstellen</span></label>
      <label class="schalter"><input type="radio" name="starr" value="staebe">
        <span>als steife Stäbe, dicker Ersatzquerschnitt mit der Güte des
              Tragwerks, gewöhnliche Stabendgelenke</span></label>
    </div>`}
    ${istAbfang ? '' : `<div class="feld" id="feld-schott" hidden>
      <label>Ausgabe</label>
      <label class="schalter"><input type="checkbox" name="schott">
        <span>Endschott aus der PyNite-Resultattabelle ausblenden, es bleibt
              tragendes Bauteil im Modell</span></label>
      <p class="notiz">Betrifft nur die Stabkräfte-Tabelle des
         PyNite-Skripts — und dort nur das Modell «ein Punkt je Ende»: die
         Endschotte gibt es allein in ihm. Am ausgeleiteten Modell ändert der
         Schalter nichts.</p>
    </div>`}
    <p class="notiz">Für einen Vergleich beide Modelle rechnen: erst ihre
       Differenz trennt die Frage des Knotenmodells von der des Rechenwegs.
       Das Blatt «Anleitung» in der Mappe nennt, was beim Import zu prüfen
       bleibt.</p>`,
    `<button class="btn btn-acc" data-los>Ausleiten</button>
     <button class="btn" data-zu>Abbrechen</button>`);
  /*
   * >>> DER SCHOTTSCHALTER ERSCHEINT MIT SEINEM FORMAT. <<<
   *
   * Er wirkt allein im PyNite-Skript: dort laesst er die SCHOTT-Staebe aus
   * der Stabkraefte-Tabelle heraus (`SCHOTT_AUSBLENDEN`). In JSON, SAF und
   * DXF tut er nichts - er stand trotzdem immer da und versprach eine
   * Wirkung, die es nicht gab.
   */
  const schottFeld = d.node.querySelector('#feld-schott');
  const schottZeigen = () => {
    if (!schottFeld) return;
    const f = d.node.querySelector('input[name="fmt"]:checked')?.value;
    schottFeld.hidden = f !== 'pynite';
  };
  d.node.querySelectorAll('input[name="fmt"]').forEach((r) => {
    r.addEventListener('change', schottZeigen);
  });
  schottZeigen();
  d.node.querySelector('[data-los]').onclick = () => {
    // Was beim Abfangjoch nicht zur Wahl steht, traegt seinen festen Wert.
    const lies = (n, vorgabe) => {
      const el = d.node.querySelector(`input[name="${n}"]:checked`)
              ?? d.node.querySelector(`input[name="${n}"]`);
      if (!el) return vorgabe;
      return el.type === 'checkbox' ? el.checked : el.value;
    };
    const km = lies('km', 'anschnitt');
    const fmt = lies('fmt', 'json');
    const aus = lies('schott', false);
    const am = lies('am', 'punkt');
    const sm = lies('starr', 'koerper');
    d.zu();
    axisvmKlick(app, km, fmt, aus, am, sm);
  };
}

function axisvmKlick(app, knotenmodell, format = 'saf', schottAusblenden = false,
                    auflagerModell = null, starrModell = 'koerper') {
  const m = app.letzte.erg.modell;
  /*
   * >>> DAS ABFANGJOCH GEHT SEINEN EIGENEN WEG. <<<
   *
   * Es ist ein LIEGENDER Vierendeeltraeger: zwei Gurte statt vier, Bleche
   * auf Flanschhoehe, Quersteifen ab A240, die Gabel am Jochende. Sein
   * Modell entsteht aus Typ und Laenge, nicht aus dem Blattmodell des
   * Tragjochs - `stabmodellJson` haette dafuer keinen Gurt.
   *
   * Die uebrigen Wege (SAF, DXF, PyNite) gibt es dafuer noch nicht; der
   * Dialog bietet sie beim Abfangjoch deshalb nicht an.
   */
  if (tragwerksart(app.werte).key === 'abfangjoch') {
    const typ = app.werte.abfangTyp;
    const jt = Number(app.werte.L);
    // Der Satz des AKTIVEN Tragwerks - dort stehen seine Anbauteile, seine
    // Fahrleitungsspannweite und sein Radius, nicht im Blattobjekt.
    const aktSatz = tragwerkSatz(app.werte);
    // Das Knotenmodell reicht durch: es entscheidet, ob die Riegelenden
    // steif ausgebildet werden oder das Modell Achse zu Achse rechnet.
    /*
     * DIE ANBAUTEILE REICHEN MIT DURCH (Weisung, 4. September). Ohne sie
     * baut die Ausleitung ein nacktes Joch und wirft eine pauschale
     * Abfangkraft in die Mitte - die Eingabe waere still verloren.
     */
    /*
     * DAS MASTPROFIL FUER DIE ABFANGJOCH-AUSLEITUNG.
     *
     * Beide Enden tragen denselben Masten, solange nichts anderes
     * eingestellt ist; abweichende Profile je Ende kennt das
     * Abfangjoch-Modell noch nicht, und eines zu erfinden waere schlimmer
     * als eines wegzulassen. Genommen wird Ende A.
     */
    const mastFuerAbfang = (satz) => {
      if (satz?.mastVorhanden === false) return null;
      const mst = mastenVon({ ...werte, ...satz });
      const m0 = mst[0];
      if (!m0?.profil) return null;
      const hoehe = Number(satz?.H ?? app.werte.H) || 0;
      // Die Stegrichtung gehoert dazu - ohne sie hatte der lotrechte Mast
      // im Modell keine lokale Achse (16. September).
      const stegrichtung = satz?.mastSteg ?? app.werte.mastSteg ?? 'jochachse';
      return hoehe > 0 ? { profil: m0.profil, hoehe, stegrichtung } : null;
    };
    return app.handlung('COM-Ausleitung',
      () => exportiereAbfangJson(typ, jt, {
        knotenbereich: knotenmodell, auflagerModell,
        anbauteile: aktSatz.anbauteile ?? [],
        // Die Auflagerbedingung je Gurt - vorn und hinten getrennt.
        auflagerLinks: aktSatz.auflagerLinks, auflagerVorgabe: app.werte.auflagerVorgabe,
        L_FL: Number(aktSatz.L_FL) || 0,
        R: Number(aktSatz.R) || 0,
        ek: aktSatz.ek,
        // Schnee und Wind auf den Traeger kommen aus der Sortimentstabelle;
        // welche Spalte gilt, sagt die Eingabe.
        schneeAktiv: aktSatz.schneeAktiv,
        schneeKlasse: aktSatz.schneeKlasse,
        /*
         * >>> UND DER MAST, WENN EINER DASTEHT. <<<
         *
         * Weisung vom 11. September: «Auflager so machen dass zuerst die
         * starrelemente von mast ausgeht (150 mm) …» Das setzt einen Masten
         * voraus, und bis hierher hatte das Abfangjoch-Modell keinen: es
         * lagerte auf einem Punkt je Ende.
         *
         * Gereicht wird das Profil des ANGEWAEHLTEN Endes und die
         * Anschlusshoehe. Steht kein Mast im Tragwerk, bleibt `mast` null -
         * dann baut die Ausleitung wie bisher auf Punkten.
         */
        mast: auflagerModell === 'mast' ? mastFuerAbfang(aktSatz) : null,
      }));
  }
  /*
   * `modellVon` BAUT EIN BELIEBIGES TRAGWERK DES BLATTES.
   *
   * Die Ausleitung braucht es, seit sie bei einer Jochreihe ALLE Tragwerke
   * zusammen modelliert (Weisung: Rahmenwirkung). Ohne diesen Zugang koennte
   * sie nur das aktive bauen - und genau das war der Befund des Durchlaufs.
   */
  const deps = { berechne, modell, profOG: m.profOG, profUG: m.profUG,
                 stahl: m.stahl, joch: m.joch,
                 modellVon: (satz) => modell({ ...satz, beiwerteFest: null },
                   getProfil(satz.profOG), getProfil(satz.profUG),
                   getStahl(satz.stahl), getTragjoch(satz.typ)) };
  const o = { knotenmodell, schottAusblenden, starrModell,
              auflagerModell: auflagerModell ?? auflagerVorgabe(m) };
  // Alle vier Wege durch dieselbe Klammer: was hier bricht, bricht sichtbar.
  const name = { json: 'COM-Ausleitung', dxf: 'DXF-Ausleitung',
                 pynite: 'PyNite-Ausleitung' }[format] ?? 'SAF-Ausleitung';
  return app.handlung(name, () => {
    if (format === 'json') return exportiereJson(app.werte, deps, o);
    if (format === 'dxf') return exportiereDxf(app.werte, deps, o);
    if (format === 'pynite') return exportierePynite(app.werte, deps, o);
    return exportiereAxisvm(app.werte, deps, o);
  });
}
