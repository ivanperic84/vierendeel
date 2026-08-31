/**
 * core.checks.js
 * ---------------------------------------------------------------------------
 * RECHENKERN: Querschnittsklassen, geometrische Verträglichkeit und
 * Plausibilität. Reine Funktionen, kein DOM.
 *
 * Einheitliches Schema je Prüfung, damit Oberfläche und Ausleitung sie ohne
 * Sonderfälle darstellen können:
 *   { id, text, vorhanden, erforderlich, einheit, richtung, ok, status }
 * ---------------------------------------------------------------------------
 */

import { U } from './core.constants.js';
import { querschnitt } from './geometry.js';
import { klassifizierung } from './core.klassen.js';
import { ENDFELD_ZUSCHLAG } from './core.querschnitt.js';
import { getFlBauteil, istKettenwerk } from './data.fl.js';
import { freieLageAmJoch, hatTraeger } from './core.anbauteile.js';
import { amMast } from './data.anbauteile.js';

const pruef = (id, text, vorhanden, erforderlich, einheit, richtung, okText, nokText) => {
  const ok = richtung === '<=' ? vorhanden <= erforderlich + 1e-9
                               : vorhanden >= erforderlich - 1e-9;
  return { id, text, vorhanden, erforderlich, einheit, richtung, ok,
           status: ok ? okText : nokText };
};

/** Kleinste und grösste vorkommende Blechabmessung. */
export function blechExtremwerte(m) {
  if (m.dbBleche) {
    const alle = [...(m.joch.bleche.vertikal ?? []), ...(m.joch.bleche.horizontal ?? [])];
    return {
      quelle: `Typendatenbank ${m.joch.typ}`,
      breiteMin: Math.min(...alle.map((b) => b.breite)),
      breiteMax: Math.max(...alle.map((b) => b.breite)),
      dickeMin: Math.min(...alle.map((b) => b.dicke)),
    };
  }
  const breiten = m.endblechWieZwischen ? [m.h2] : [m.h1, m.h2];
  const dicken = m.endblechWieZwischen ? [m.t2] : [m.t1, m.t2];
  return {
    quelle: 'manuelle Eingabe',
    breiteMin: Math.min(...breiten), breiteMax: Math.max(...breiten),
    dickeMin: Math.min(...dicken),
  };
}

/**
 * Prüfliste: Querschnittsklassen aller Bauteile plus Plausibilität.
 * Die Klassifizierung wird je Bauteil einzeln ausgewiesen, damit erkennbar
 * bleibt, welches Teil die Klasse bestimmt.
 */
/**
 * WELCHE NACHWEISE DIESES WERKZEUG FÜHRT — und welche nicht.
 *
 * Weisung des Auftraggebers: der Benutzer soll wählen können, welche
 * Nachweise geführt werden. Beim Nachsehen kam ein Befund heraus, der die
 * Aufgabe verändert hat: von den vier genannten gibt es zwei gar nicht.
 *
 *   Knicken       core.vierendeel.js sagt es seit jeher selbst - «KEIN
 *                 Knicknachweis, bewusst nicht enthalten, separat zu führen».
 *   Mast          der Mast steht als Drehfeder c_phi im Modell und seit
 *                 kurzem als Geometrie in der AxisVM-Ausleitung. Ein
 *                 Tragfähigkeitsnachweis ist das nicht.
 *
 * Einen Schalter für einen Nachweis zu bauen, den es nicht gibt, wäre
 * schlimmer als kein Schalter: er behauptet, der Nachweis sei vorhanden und
 * nur gerade aus. Sie stehen deshalb mit `vorhanden: false` in der Liste und
 * lassen sich nicht einschalten - sichtbar, benannt, und ausdrücklich NICHT
 * GEFÜHRT.
 *
 * >>> EIN NICHT GEFÜHRTER NACHWEIS ZÄHLT NIE ALS ERFÜLLT. <<<
 *
 * Das ist die ganze Schwierigkeit an dieser Weisung. Ein abgeschalteter
 * Nachweis, der stillschweigend aus der Liste verschwindet, sieht aus wie
 * ein bestandener. Er wird deshalb überall mitgeführt - im Urteil, im
 * Bericht, in der Ausleitung - und zwar als das, was er ist.
 */
export const NACHWEISGRUPPEN = [
  { key: 'jochtragwerk', titel: 'Jochtragwerk', vorhanden: true, standard: true,
    was: 'Gurte und Bindebleche über die Spannweite, mit Querschnittsklassen',
    // Die Querschnittsklassen gehören zum Tragwerksnachweis: sie entscheiden,
    // ob elastisch gerechnet werden darf.
    gilt: (c) => /^Q\d+$/.test(c.id) },
  /*
   * VOREINGESTELLT AUS (Weisung des Auftraggebers).
   *
   * Der Gurtanschluss ist vorhanden und rechnet - aber er wird nur geführt,
   * wenn man ihn einschaltet. «Vorhanden» und «voreingestellt geführt» sind
   * deshalb zwei verschiedene Angaben; vorher fielen sie zusammen.
   */
  { key: 'auflagerJoch', titel: 'Auflager Joch', vorhanden: true, standard: false,
    was: 'Gurtanschluss am Mast — Kräftepaar M/h gegen die Schraubengrenze',
    gilt: (c) => c.id === 'A1' },
  { key: 'knickenJoch', titel: 'Knicken Joch', vorhanden: false, standard: false,
    was: 'Gesamtstab und Einzelwinkel — in diesem Werkzeug nicht enthalten, '
       + 'separat zu führen' },
  /*
   * SEIT DEM 28. AUGUST VORHANDEN (Weisung, auf ausdrückliche Nachfrage).
   *
   * Bis dahin stand hier «nicht vorhanden» — der Mast war Drehfeder und
   * Modellgeometrie, mehr nicht. Jetzt wird er nachgewiesen: Querschnitt
   * elastisch, plastischer Widerstand auf Wunsch, Schnittgrössen aus dem
   * Ersatzbalken (core.mast.js).
   *
   * WAS ER NICHT ENTHÄLT, steht in `was` und im Nachweisreiter: die
   * STABILITÄT. Biegeknicken und Biegedrillknicken brauchen eine Festlegung
   * der Knicklänge; sie ist Sache des Auftraggebers. Bei einem schlanken
   * Kragmast kann sie massgebend werden.
   */
  { key: 'mast', titel: 'Mast', vorhanden: true, standard: true,
    was: 'Querschnitt am Mastfuss und an jeder Anbaustelle — σ aus N, M_quer '
       + 'und M_längs. OHNE Stabilität: Biegeknicken und Biegedrillknicken '
       + 'sind gesondert zu führen' },
];

/** Voreinstellung je Gruppe. */
export const nachweiseStandard = () => Object.fromEntries(
  NACHWEISGRUPPEN.map((g) => [g.key, g.vorhanden && g.standard]));

/**
 * Die gültige Auswahl: was es nicht gibt, wird nicht geführt - auch wenn es
 * in einer alten Datei auf `true` steht. Fehlt die Angabe, gilt die
 * Voreinstellung der Gruppe, nicht «an».
 */
export function nachweiseAuswahl(gewaehlt) {
  const w = gewaehlt ?? {};
  return Object.fromEntries(NACHWEISGRUPPEN.map((g) =>
    [g.key, g.vorhanden && (w[g.key] ?? g.standard) === true]));
}

/** Zu welcher Gruppe eine Prüfung gehört - oder null, wenn zu keiner. */
export function gruppeVon(check) {
  return NACHWEISGRUPPEN.find((g) => g.gilt && g.gilt(check))?.key ?? null;
}

export function konstruktionsChecks(m) {
  const kl = klassifizierung(m);
  const checks = [];

  kl.teile.forEach((t, i) => {
    const massgebendes = t.kriterien.reduce((a, b) => (b.klasse > a.klasse ? b : a));
    checks.push({
      id: `Q${i + 1}`,
      text: `${t.rolle} ${t.bauteil} – ${massgebendes.id}`,
      vorhanden: massgebendes.ct,
      erforderlich: massgebendes.grenze,
      einheit: 'c/t', richtung: '<=',
      ok: t.klasse <= 3,
      status: `Klasse ${t.klasse}`,
      klasse: t.klasse,
      warnungNichtFehler: t.klasse === 3,
      /*
       * BINDEND FÜR DAS URTEIL.
       *
       * Die Querschnittsklasse entscheidet, ob elastisch gerechnet werden
       * DARF. Klasse 4 heisst: der Querschnitt beult, bevor er fliesst - dann
       * ist η selbst nicht mehr zulässig, nicht bloss knapp. Ein grünes
       * Urteil neben einer Klasse 4 wäre die eine Zeile, die wirklich in die
       * Irre führt.
       *
       * Alle übrigen Prüfungen sind KONSTRUKTIONSREGELN: sie sagen, dass am
       * Bauteil etwas nicht stimmt, nicht dass die Rechnung ungültig ist. Sie
       * werden gemeldet, aber sie färben das Urteil nicht mehr rot.
       */
      urteilBindend: true,
    });
  });

  /*
   * DER GURTANSCHLUSS AM MAST.
   *
   * Weisung: die geometrische Feder geht ins Modell, die Schraubengrenze wird
   * SEPARAT nachgewiesen. Bis dahin lebte die Grenze nur innerhalb der Feder -
   * sie war per Konstruktion eingehalten, und man sah nie, wieviel die
   * Verbindung mit der wirklichen Steifigkeit des Mastes zu tragen hätte.
   *
   * Genau das ist die Frage, die das ausgeleitete Stabmodell stellt: es trägt
   * die geometrische Feder, also auch deren Stützmoment. Gerechnet wird der
   * Wert in core.vierendeel.js (gurtanschluss), hier steht nur der Nachweis.
   */
  const ga = m.gurtanschluss;
  if (ga && ga.Fgrenz > 0) {
    checks.push({
      id: 'A1',
      text: `Gurtanschluss am Mast – Kräftepaar M/h aus der geometrischen Feder`,
      vorhanden: ga.F, erforderlich: ga.Fgrenz, einheit: 'kN', richtung: '<=',
      ok: ga.ok === true,
      status: `M_St ${Math.max(Math.abs(ga.MA), Math.abs(ga.MB)).toFixed(2)} kNm `
            + `/ h ${ga.h.toFixed(3)} m · η ${ga.eta.toFixed(2)}`,
    });
  }

  // --- Plausibilität --------------------------------------------------------
  /*
   * Die Befestigungspunkte liegen bei x ± raster/2 und müssen auf dem Joch
   * liegen.
   *
   * NUR WAS AM JOCH HÄNGT. Ein Bauteil am Masten wird über seine Höhe
   * angesetzt, nicht über x; sein x steht auf 0 und ist bedeutungslos. Vor
   * dieser Zeile fiel jedes Teil am Masten hier durch - ein Rückleiter auf
   * einer Traverse meldete «AUSSERHALB», weil seine halbe Klemmweite links
   * von x = 0 zu liegen kam. Falscher Alarm, entstanden mit den Anbauteilen
   * am Masten; P6, P7 und P8 klammern sie längst aus, P1 nicht.
   */
  const aktive = (m.anbauteile ?? [])
    .filter((a) => a.aktiv !== false && !amMast(a));
  const rand = (a) => [a.x - (a.raster ?? 0.4) / 2, a.x + (a.raster ?? 0.4) / 2];
  const xMax = aktive.length ? Math.max(...aktive.map((a) => rand(a)[1])) : 0;
  const xMin = aktive.length ? Math.min(...aktive.map((a) => rand(a)[0])) : 0;
  const ausserhalb = aktive.filter((a) => rand(a)[0] < 0 || rand(a)[1] > m.L);
  /*
   * DIE ZAHL MUSS DIE VERLETZUNG ZEIGEN. Ragt ein Punkt links über das Joch
   * hinaus, sagt der grösste rechte Rand nichts - die Zeile las sich dann als
   * «10.11 <= 20.00 ✗» und erklärte gar nichts.
   */
  const linksRaus = xMin < 0;
  checks.push({
    id: 'P1',
    text: `Befestigungspunkte der ${aktive.length} Anbauteile auf dem Joch`,
    vorhanden: linksRaus ? xMin : xMax,
    erforderlich: linksRaus ? 0 : m.L,
    einheit: 'm', richtung: linksRaus ? '>=' : '<=',
    ok: ausserhalb.length === 0,
    status: ausserhalb.length === 0
      ? 'OK' : `AUSSERHALB: ${ausserhalb.map((l) => l.name).join(', ')}`,
  });

  /*
   * AM MASTEN GIBT ES KEINEN TRÄGER (Weisung: kein Jochaufsatz, keine
   * Hängestütze).
   *
   * Die Regel steht nicht als Verbotsliste im Code, sie steht in den Daten:
   * die Bauteiltabelle führt drei Rollen, und `traeger` tragen genau die
   * Jochaufsätze und die Hängestütze. Ein Träger IST das, was auf dem Joch
   * sitzt oder daran hängt. Kommt einmal ein neuer hinzu, gilt die Regel
   * für ihn ohne Zutun.
   *
   * Die Bedienoberfläche bietet solche Vorlagen am Masten gar nicht erst an;
   * diese Prüfung fängt, was auf anderem Weg hereinkommt - eine eingelesene
   * Datei, eine umgestellte Baugruppe.
   */
  const mastTeile = m.anbauMastFlach ?? [];
  if (mastTeile.length) {
    const traeger = mastTeile.filter((t) => (t.rolle ?? '') === 'traeger');
    const namen = [...new Set(traeger.map((t) => t.name ?? t.bauteil))];
    checks.push({
      id: 'P6',
      text: `Am Masten kein Träger – ${mastTeile.length} Teile an den Masten`,
      vorhanden: traeger.length, erforderlich: 0, einheit: 'Stk', richtung: '=',
      ok: traeger.length === 0,
      status: traeger.length === 0
        ? 'OK' : `Jochaufsatz/Hängestütze am Masten: ${namen.join(', ')}`,
    });
  }

  /*
   * AM MASTEN HÄNGT KEIN KETTENWERK UNMITTELBAR (Weisung, 27. August).
   *
   * «Die Kettenwerke werden nicht direkt am Masten gehängt, ausser wenn sie
   * abgefangen werden, sondern auf Ausleger. Am Masten werden nur einzelne
   * Leiter gehängt oder, falls es Zusatzleiter sind, über eine Traverse.»
   *
   * Ein Kettenwerk ist Tragseil UND Fahrdraht; die Bauteiltabelle sagt es im
   * Namen (data.fl.js, istKettenwerk). Zwischen ihm und dem Masten gehört
   * ein AUFBAU — der Ausleger. Fehlt er, hängt das Kettenwerk an der
   * Mastachse, und das gibt es so nicht.
   *
   * DIE AUSNAHME IST NOCH NICHT GEBAUT: ein abgefangenes Kettenwerk darf
   * unmittelbar an den Masten. Solange die Abfangung nicht modelliert ist,
   * bleibt dieser Fall ein Hinweis und kein Fehler — deshalb
   * `warnungNichtFehler`.
   */
  const mastGruppen = new Map();
  (m.anbauMastFlach ?? []).forEach((t) => {
    const k = t.baugruppe ?? t.id;
    if (!mastGruppen.has(k)) mastGruppen.set(k, []);
    mastGruppen.get(k).push(t);
  });
  const ohneAusleger = [...mastGruppen.values()].filter((teile) => {
    const kw = teile.filter((t) => {
      let b = null;
      try { b = t.bauteil ? getFlBauteil(t.bauteil) : null; } catch { b = null; }
      return istKettenwerk(b);
    });
    if (!kw.length) return false;
    return !teile.some((t) => (t.rolle ?? '') === 'aufbau');
  });
  if (mastGruppen.size) {
    checks.push({
      id: 'P7',
      text: 'Am Masten kein Kettenwerk ohne Ausleger',
      vorhanden: ohneAusleger.length, erforderlich: 0, einheit: 'Stk',
      richtung: '=',
      ok: ohneAusleger.length === 0,
      status: ohneAusleger.length === 0
        ? 'OK'
        : `Kettenwerk unmittelbar am Masten: `
          + `${ohneAusleger.map((t) => t[0].name ?? t[0].baugruppe).join(', ')} `
          + `– auf einen Ausleger setzen (abgefangen ist noch nicht modelliert)`,
      warnungNichtFehler: true,
    });
  }

  /*
   * TRÄGER UND BINDEBLECH BERÜHREN SICH NICHT (Weisung, 27. August).
   *
   * «Die Hängestütze und Jochaufsätze dürfen sich nicht mit den
   * Verbindungsblechen berühren. Diese sind automatisch nebenan zu
   * schieben.»
   *
   * ABGEHOLFEN WIRD IN ZWEI STUFEN, und die Reihenfolge nennt die Weisung
   * selbst: «die Joche sind fix, die Anbauteile werden drum herum
   * angebracht» - erst wird der KLEMMENABSTAND geweitet, damit die Stütze
   * bleibt, wo sie hingehört, und ihre Klemmen das Blech überspannen. Erst
   * wenn das nicht geht, weicht die Lage aus.
   *
   * Geschieht in der Eingabe (ui.js) und beim Setzen (app.js) - hier
   * steht der Nachweis. Er fängt, was auf anderem Weg hereinkommt: eine
   * eingelesene Datei, eine geänderte Blecheinteilung, ein Joch, dessen
   * Länge nachträglich verstellt wurde. Bei allen dreien wandern die Bleche
   * unter dem Bauteil weg, ohne dass jemand die Lage angefasst hätte.
   */
  const traegerTeile = (m.anbauteile ?? []).filter((a) => {
    if (a.aktiv === false || amMast(a)) return false;
    return hatTraeger(a.module, (id) => getFlBauteil(id).rolle);
  });
  if (traegerTeile.length) {
    const sitzt = traegerTeile.filter((a) =>
      freieLageAmJoch(a.x, a.raster, m).verschoben);
    // Ein geweitetes Raster ist keine Beanstandung, sondern die Abhilfe -
    // es steht aber im Status, damit man sieht, dass es nicht das Normalmass
    // ist.
    const geweitet = traegerTeile.filter((a) => (a.raster ?? 0) > 0.4 + 1e-9);
    checks.push({
      id: 'P8',
      text: `Träger neben den Bindeblechen – ${traegerTeile.length} geprüft`,
      vorhanden: sitzt.length, erforderlich: 0, einheit: 'Stk', richtung: '=',
      ok: sitzt.length === 0,
      status: sitzt.length === 0
        ? (geweitet.length
            ? `OK – ${geweitet.length} mit geweitetem Klemmenabstand: `
              + geweitet.map((a) =>
                  `${a.name ?? a.id} ${(a.raster * 1000).toFixed(0)} mm`).join(', ')
            : 'OK')
        : `Klemme auf einem Blech: ${sitzt.map((a) =>
            `${a.name ?? a.id} bei ${Number(a.x).toFixed(2)} m`).join(', ')}`,
    });
  }

  const n = m.L / m.a1;
  checks.push({
    id: 'P2', text: 'Feldeinteilung:  L / a₁ ganzzahlig',
    vorhanden: n, erforderlich: Math.round(n), einheit: '–', richtung: '=',
    ok: Math.abs(n - Math.round(n)) < 1e-3,
    status: Math.abs(n - Math.round(n)) < 1e-3 ? 'OK' : 'letztes Feld kürzer',
    warnungNichtFehler: true,
  });

  checks.push(pruef('P3', 'Lage des Nachweisschnitts:  0 ≤ x_N ≤ L',
    m.xNachweis ?? 0, m.L, 'm', '<=', 'OK', 'AUSSERHALB'));

  /*
   * Was nicht geführt wird, steht auch nicht in der Liste - aber es
   * verschwindet nicht: urteilKonstruktion nennt die Gruppe ausdrücklich als
   * nicht geführt. Die Plausibilitätsprüfungen P* gehören zu keiner Gruppe
   * und bleiben immer; sie sind Konstruktionsregeln, keine Tragsicherheit.
   */
  const nw = nachweiseAuswahl(m.nachweise);
  return checks.filter((c) => {
    const g = gruppeVon(c);
    return g === null || nw[g];
  });
}

/** Geometrische Verträglichkeit der Bindeblechflucht. */
export function fluchtChecks(m) {
  const qs = querschnitt(m);
  return { qs, warnungen: qs.warnungen };
}

/** Zusätzliche Hinweise, die kein Ja/Nein-Nachweis sind. */
export function hinweise(m) {
  const h = [];
  const kl = klassifizierung(m);

  if (kl.klasse4.length) {
    h.push(`Klasse 4 bei ${kl.klasse4.map((t) => t.bauteil).join(', ')}: gerechnet ` +
           'wird mit dem Bruttoquerschnitt, nicht dem wirksamen nach ' +
           'EN 1993-1-5 – unsichere Seite.');
  }
  // Altbauweise: der Anschluss ans Mast trägt kein Einspannmoment.
  if (m.bauweise === 'alt' && m.endbedingung !== 'gelenkig') {
    h.push('Altbauweise eingespannt gerechnet. Vorgabe: bei alten Jochen ' +
           'GELENK ansetzen – der Anschluss ans Mast trägt kein Einspannmoment.');
  }
  if (m.profOG.name !== m.profUG.name) {
    const art = m.gurtaufteilung ?? 'gemessen';
    const wie = { huellend: 'je Gurt der ungünstigere Anteil (einhüllend)',
                  gemessen: 'gedämpft nach Steifigkeit, an PyNite geeicht',
                  steifigkeit: 'nach Biegesteifigkeit I/ΣI',
                  gleich: 'hälftig' }[art] ?? art;
    h.push(`Gurte verschieden (${m.profOG.name} / ${m.profUG.name}): getrennt ` +
           `nachgewiesen, lokale Biegung ${wie}.`);
  }

  if ((m.knotenbereich ?? 'anschnitt') === 'schwerachsen') {
    h.push('Knotenbereich auf «Achse zu Achse» gestellt: kein vollständiger '
      + 'Nachweis, sondern ein Vergleich gegen Prüfmodelle. Die Abminderung '
      + 'auf den Anschnitt entfällt, Gurt- und Blechmomente liegen 11 bis '
      + '15 % höher. Nachweisgrundlage ist der steife Knotenbereich.');
  }

  // Der Faktor kann seit der Kalibrierung UNTER 1 liegen: gegen ein
  // Rahmenmodell mit demselben Knotenmodell gemessen ueberschaetzt der
  // Ersatzbalken das Endfeld, statt es zu unterschaetzen. Der Hinweis muss
  // deshalb beide Richtungen benennen koennen.
  const kE = m.endfeldZuschlag === false ? 1
    : (Number.isFinite(m.endfeldZuschlag) ? m.endfeldZuschlag : ENDFELD_ZUSCHLAG);
  h.push(Math.abs(kE - 1) > 1e-9
    ? `Bindebleche der beiden äussersten Stationen je Ende: Torsionsanteil `
      + `mit Faktor ${kE.toFixed(2)} angesetzt`
      + (kE < 1
        ? ' – also abgemindert. Gegen ein Rahmenmodell mit demselben '
          + 'Knotenmodell gemessen (0.48, Spanne 0.41 bis 0.64) überschätzt '
          + 'der Ersatzbalken dort, weil er die Torsion als Hüllkurve auf '
          + 'alle vier Ebenen legt.'
        : '. Dort geht die Torsion über die Anschlussebenen in den Mast, und '
          + 'diese örtliche Einleitung führt der Ersatzbalken nicht.')
      + ' Ohne Torsion bleibt der Faktor wirkungslos.'
    : 'Endfeldzuschlag auf die Bindebleche abgeschaltet: die Bleche der '
      + 'äussersten Stationen werden wie alle anderen gerechnet.');

  /*
   * ZU ENGES KLEMMENRASTER.
   *
   * Ein Anbauteil haengt ueber ZWEI Klemmreihen im Abstand `raster` am Joch.
   * Das Sortiment fuehrt durchweg 400 mm (die Leiter-Traverse 600). Ein Wert
   * weit darunter ist erfahrungsgemaess ein Vertipper - in einer Ausleitung
   * standen 20 statt 200 mm, und die beiden Reihen lagen so eng, dass
   * dazwischen ein Gurtstueck von 10 mm entstand. Ein solcher Stab neben
   * 400-mm-Staeben verdirbt die Kondition der Steifigkeitsmatrix, ohne dass
   * die Rechnung abbricht.
   *
   * GESPERRT wird es nicht: Ausnahmen kommen vor, und der Ausleiter legt
   * Reihen unter 25 mm ohnehin zu einem Anschluss zusammen. Gemeldet wird es
   * trotzdem, damit ein Vertipper nicht still durchlaeuft.
   */
  const engesRaster = (m.anbauteile ?? []).filter(
    (a) => a.aktiv !== false && Number.isFinite(a.raster)
        && a.raster > 0 && a.raster < 0.10);
  if (engesRaster.length) {
    h.push('Klemmenraster ungewöhnlich eng: '
      + engesRaster.map((a) => `${a.name ?? a.id} ${(a.raster * 1000).toFixed(0)} mm`)
          .join(', ')
      + '. Das Sortiment führt 400 mm (Leiter-Traverse 600). Bei unter 25 mm '
      + 'legt die Ausleitung die beiden Klemmreihen zu einem Anschluss '
      + 'zusammen; die Rechnung im Werkzeug nimmt den Wert, wie er dasteht. '
      + 'Ist es Absicht, kann der Hinweis stehen bleiben.');
  }

  // EIGENANTEIL DER GURTE am globalen Moment.
  if (m.eigenanteil) {
    const e = m.eigenanteil;
    h.push('Eigenanteil der Gurte ist erfasst: neben dem Kräftepaar trägt '
      + 'jeder Winkel das globale Moment auch über sein eigenes '
      + `Trägheitsmoment mit – zusammen ${(200 * (e.OG.my + e.UG.my)).toFixed(1)} % `
      + `um die waagrechte und ${(200 * (e.OG.mz + e.UG.mz)).toFixed(1)} % um die `
      + 'lotrechte Achse. Er folgt dem globalen Momentenverlauf und ist in '
      + 'Feldmitte, wo die Querkraft null wird, das einzige Moment im Gurt. '
      + 'Die Normalkraft wird dafür nicht vermindert – das liegt auf der '
      + 'sicheren Seite.');
  }

  // SCHIEFE BIEGUNG DER GURTWINKEL -> Moment in den Blechen der anderen Ebene.
  h.push(m.schiefeBiegung !== false
    ? 'Schiefe Biegung der Gurtwinkel ist erfasst: der Winkel weicht unter '
      + 'dem örtlichen Rahmenmoment quer aus (I_yz ≠ 0), die Bindebleche der '
      + 'anderen Ebene halten dagegen. Das Moment ist über die Blechlänge '
      + 'konstant und wird deshalb weder auf den Anschnitt abgemindert noch '
      + 'vom Endfeldzuschlag erfasst. Vorausgesetzt ist die '
      + 'spiegelsymmetrische Anordnung der vier Winkel.'
    : 'Schiefe Biegung der Gurtwinkel abgeschaltet: die Horizontalbleche sind '
      + 'unter reiner Vertikallast dann spannungsfrei. Am nachgerechneten '
      + 'Signaljoch wies das FEM-Modell dort 11 N/mm² aus.');

  // --- AUFLAGER: die Zahlen, an denen ein Eingabefehler auffällt ------------
  // Beim Nachbau eines geprüften FEM-Modells lagen genau hier die grössten
  // Fehler - eine geschätzte Drehfeder um Faktor 3 daneben, die Stützweite um
  // 5 %. Beides sieht man dem Ergebnis nicht an, wenn es nirgends steht.
  if (Number.isFinite(m.kappaA)) {
    const grad = (k) => `${(100 * Math.max(0, Math.min(1, k))).toFixed(0)} %`;
    const cTxt = (c) => (c >= 1e11 ? 'starr'
      : c <= 0 ? '0' : `${c.toFixed(0)} kNm/rad`);
    h.push(`Auflager ${m.federn.art}: c_φ = ${cTxt(m.federn.cA)}`
      + (Math.abs(m.federn.cB - m.federn.cA) > 1 ? ` / ${cTxt(m.federn.cB)}` : '')
      + `, Einspanngrad ${grad(m.kappaA)}`
      + (Math.abs(m.kappaB - m.kappaA) > 0.01 ? ` / ${grad(m.kappaB)}` : '')
      + `, Stützmoment ${Math.abs(m.MA).toFixed(2)}`
      + (Math.abs(Math.abs(m.MB) - Math.abs(m.MA)) > 0.005
         ? ` / ${Math.abs(m.MB).toFixed(2)}` : '') + ' kNm.');
  }
  if (m.federn?.mast) {
    const ma = m.federn.mastA ?? m.federn.mast;
    // Der Mast steht hier als AUFLAGER, nicht als nachzuweisendes Bauteil.
    h.push('Der Mast ist Auflager, nicht Bauteil: nachgewiesen wird nur das '
      + 'Joch. Sein Profil bestimmt die Drehfeder und den Mastwind auf das '
      + 'Jochende; sein eigener Nachweis gehört in ein Rahmenmodell mit '
      + 'beiden Masten, Fusspunkten und Gründung.');
    h.push(m.federn.verschieblich
      ? 'Wind in Jochachse: beide Mastköpfe wollen in dieselbe Richtung, der '
        + 'Rahmen VERSCHIEBT sich. Gerechnet wird deshalb mit dem Kragmast, '
        + `c_φ = ${ma.cVerschieblich.toFixed(0)} kNm/rad.`
      : 'Das Joch bindet die beiden Mastköpfe zusammen; unter dieser '
        + 'Einwirkung sind die Stützmomente gleichsinnig und der Rahmen '
        + 'verschiebt sich NICHT. Gerechnet wird mit der Rahmenfeder '
        + `3.10·E·I/H = ${ma.cUnverschieblich.toFixed(0)} statt mit dem `
        + `Kragmast (${ma.cKragarm.toFixed(0)} kNm/rad). An zwei Rahmen `
        + 'gemessen, Lehrbuchwert wäre 4.00.');
  }
  if (m.federn?.grenze?.begrenzt) {
    h.push(`Drehfeder auf die Gurtverbindung begrenzt: c_φ von `
      + `${m.federn.roh.cA.toFixed(0)} auf ${m.federn.cA.toFixed(0)} kNm/rad `
      + `herabgesetzt, Gurtkraft ${m.federn.grenze.FA.toFixed(1)} kN. `
      + 'Das gilt für die Schnittgrössen des Jochs. Ins AxisVM-Modell geht die '
      + 'GEOMETRISCHE Feder; der Gurtanschluss ist dort separat nachzuweisen '
      + '(Prüfung A1).');
  }
  if (m.kragA > 0 || m.kragB > 0) {
    h.push(`Auflager innerhalb der Gurtenden: Stützweite `
      + `${m.stuetzweite.toFixed(3)} m gegen ${m.L.toFixed(3)} m Gurtlänge, `
      + `Kragarme ${m.kragA.toFixed(3)} / ${m.kragB.toFixed(3)} m. Die `
      + 'Blecheinteilung hängt an der Gurtlänge und bleibt unberührt.');
  } else if (m.endbedingung !== 'gelenkig') {
    h.push('Auflager an den Gurtenden, keine Kragarme. Steht der Mast weiter '
      + 'innen, ist das unter «Kragarm» einzugeben – 5 % Stützweite sind rund '
      + '11 % auf jedes globale Moment.');
  }
  /*
   * «STEIFIGKEIT AUS MAST» GEWAEHLT, ABER KEINER DA.
   *
   * Seit dem 28. August sind das zwei Angaben. Wer die Endbedingung auf
   * «Mast» stellt und die Masten abschaltet, rechnet gelenkig - und das darf
   * nicht still geschehen: es ist der Unterschied zwischen einem
   * eingespannten und einem frei aufliegenden Joch.
   */
  if (m.federn?.mastFehlt) {
    h.push('Endauflager «Steifigkeit aus Mast» gewählt, aber es steht kein '
      + 'Mast im Modell – gerechnet wird GELENKIG. Entweder die Masten unter '
      + '«Masten» einschalten oder eine andere Endbedingung wählen.');
  }
  if (m.mastKopf) {
    const k = m.mastKopf;
    const mr = (v) => (1000 * v).toFixed(2);
    h.push('Die Mastköpfe verdrehen sich, und das Jochende macht es mit: θ₀ = '
      + `${mr(k.A.theta0)} / ${mr(k.B.theta0)} mrad, eingeleitetes Moment bis `
      + `${Math.max(Math.abs(k.A.M0), Math.abs(k.B.M0)).toFixed(2)} kNm. `
      + `Davon aus dem Wind auf den Mast ${mr(k.A.thetaWind)} mrad, aus der `
      + `Längskraft des Jochs ${mr(k.A.thetaKraft)} mrad `
      + `(Kopfkraft ${k.A.P.toFixed(2)} / ${k.B.P.toFixed(2)} kN, `
      + `Kopfweg ${(1000 * k.delta).toFixed(1)} mm). Erfasst ist der Wind IN `
      + 'DER JOCHACHSE; die Verdrehung der Mastköpfe UM die Jochachse aus dem '
      + 'Wind in Gleisrichtung ist nicht angesetzt.');
  } else if (m.federn?.mast) {
    h.push('Die Mastköpfe verdrehen sich unter dieser Einwirkung nicht: kein '
      + 'Wind in Jochachse und keine Längskraft im Joch. Erfasst wäre der '
      + 'Wind IN DER JOCHACHSE; die Verdrehung UM die Jochachse aus dem Wind '
      + 'in Gleisrichtung ist nicht angesetzt.');
  }
  [m.profOG, m.profUG].forEach((p) => {
    if (p.hinweis) h.push(`${p.name}: ${p.hinweis}`);
  });
  if (m.breite?.aktiv) {
    // jkk fehlt bei Typen ohne zweiten Knickpunkt - dann nur den ersten nennen.
    const knick = [m.breite.jk, m.breite.jkk].filter(Number.isFinite).join('/');
    h.push(`Grundriss geknickt: Hebelarm b ortsabhängig, ` +
           `${(m.breite.bAn(0) * 1000).toFixed(0)} mm am Auflager gegen ` +
           `${(m.b * 1000).toFixed(0)} mm im Feld` +
           `${knick ? ` (Knick ${knick} mm)` : ''}.`);
    if (m.jbbOG !== m.jbbUG) {
      h.push(`Gurte verschieden breit (${m.jbbOG} / ${m.jbbUG} mm): gerechnet ` +
             'mit dem Mittel der Hebelarme, die Vertikalebenen stehen leicht schräg.');
    }
  } else {
    h.push('Grundriss durchgehend gleich breit; gerechnet mit ' +
           `${m.massVariante === 'aussen' ? 'dem Aussenmass' :
              m.massVariante === 'licht' ? 'dem lichten Mass' : 'dem Schwerpunktsabstand'}.`);
  }
  h.push(m.torsionModell === 'huellkurve'
    ? 'Torsion als konstante Hüllkurve über die Spannweite (konservativ, ' +
      'Gabellagerung vorausgesetzt).'
    : 'Torsion mit Auflagerverteilung (Gabellagerung vorausgesetzt).');
  h.push(m.torsionsverteilung === 'schubfluss'
    ? 'Torsion als umlaufender Schubfluss q = T/(2·b·h) auf alle vier Ebenen, ' +
      'mit der Querkraft überlagert.'
    : 'Torsion allein den Vertikalebenen zugewiesen (V_T = T/b) – doppelt so ' +
      'gross wie der Schubflussanteil.');
  if (m.verlauf?.aktiv) {
    const v = m.verlauf.voute;
    h.push(`Verjüngte Enden: Bauhöhe ${m.jd} → ${v.endJd} mm, Hebelarm h an ` +
           `jeder Station örtlich gerechnet, nach unten abgefangen bei ` +
           `${(m.verlauf.hMin * 1000).toFixed(0)} mm. Bei eingespannten Enden ist ` +
           'der Endbereich gesondert zu betrachten.');
    h.push('EI für Drehfeder und Auflagermoment mit dem Feldquerschnitt ' +
           'gerechnet – sichere Seite für das Feldmoment.');
  }
  if (m.ausfuehrung) {
    h.push(`Blechstaffelung nach Ausführung ${m.ausfuehrung.bez} ` +
           `(${m.ausfuehrung.l[0].toFixed(2)}–${m.ausfuehrung.l[1].toFixed(2)} m); ` +
           `Teilung gleichmässig, exakt auf Schema ${m.joch?.quelle?.schema ?? '–'}.`);
  }
  if (m.dbBleche && !m.joch.staffelung_geprueft) {
    h.push(`Blechstaffelung ${m.joch.typ} aus den Stückzahlen abgeleitet, nicht ` +
           'abgelesen – gegen das Schemablatt zu prüfen.');
  }
  h.push('Kein Knicknachweis – Gesamtstab und Einzelwinkel separat nachzuweisen.');
  return h;
}

/** Sammelurteil über alle Prüfungen. */
export function urteilKonstruktion(checks, nachweise) {
  const harte = checks.filter((c) => !c.warnungNichtFehler);
  const nw = nachweiseAuswahl(nachweise);
  /*
   * Die nicht geführten Nachweise gehören ins Urteil, nicht in eine Fussnote.
   * «Tragsicherheit erfüllt» neben einem stillschweigend fehlenden Nachweis
   * wäre die gefährlichste Zeile, die diese Anwendung schreiben könnte -
   * deshalb steht die Zahl daneben und die Namen darunter.
   */
  const nichtGefuehrt = NACHWEISGRUPPEN.filter((g) => !nw[g.key])
    .map((g) => ({ key: g.key, titel: g.titel, was: g.was,
                   /*
                    * Der Unterschied zählt: AUSGESCHALTET ist eine
                    * Einstellung, die man umlegen kann, NICHT ENTHALTEN ist
                    * eine Grenze des Werkzeugs. «Abgewählt» stand hier
                    * zuerst - es behauptet aber, der Benutzer habe
                    * entschieden, und das stimmt beim Auflagernachweis
                    * nicht: der ist ab Werk aus.
                    */
                   grund: g.vorhanden ? 'ausgeschaltet' : 'nicht enthalten' }));
  return {
    alleOk: harte.every((c) => c.ok),
    anzahlVerletzt: harte.filter((c) => !c.ok).length,
    // Das Urteil sagte bisher nur, DASS eine Prüfung verletzt ist - welche,
    // stand nur in der Excel-Ausleitung. Wer «1 Prüfung(en) verletzt» liest,
    // will sie sehen können.
    checks,
    verletzt: harte.filter((c) => !c.ok),
    nachweise: nw,
    nichtGefuehrt,
    /*
     * Verletzt UND bindend: nur dann ist η selbst hinfällig. Die Trennung
     * kam auf Weisung - «hier sollte alles grün sein, die Verletzung ist
     * nicht so relevant». Sie ist es für die Konstruktionsregeln; für die
     * Querschnittsklasse ist sie es nicht.
     */
    bindendVerletzt: harte.some((c) => !c.ok && c.urteilBindend === true),
    // Trägt das Joch selbst keinen Nachweis mehr, ist η keine Aussage über
    // die Tragsicherheit mehr - und darf auch nicht als eine auftreten.
    tragwerkGefuehrt: nw.jochtragwerk === true,
  };
}

export { klassifizierung };
