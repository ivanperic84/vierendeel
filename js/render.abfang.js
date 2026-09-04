/**
 * render.abfang.js
 * ===========================================================================
 * DAS ABFANGJOCH IM BILD.
 *
 * Weisung vom 4. September: «können wir die abbildung 3d in die app und den
 * katalog der typen und längen der abfangjoche übernehmen in die sidebar,
 * damit man die modelle in axis aufbauen kann.» — und, nachdem der erste
 * Wurf stand: «diese sind ähnlich detailiert wie die tragjoche darzustellen
 * und nicht als einfache abstrakte quader.»
 *
 * >>> DIE KÖRPER KOMMEN AUS DEM SORTIMENT, NICHT AUS DER ANSCHAUUNG. <<<
 *
 * Der erste Wurf zeichnete jedes Bauteil als Kasten mit den Aussenmassen des
 * Profils — h × b, gefüllt. Das ist schnell und falsch: ein UPE 160 ist ein
 * C, kein Balken, und wohin seine Öffnung zeigt, entscheidet über den
 * Anschluss der Bindebleche. Gezeichnet wird jetzt der Umriss aus
 * `data.profiles.js`, über `walzProfilPoly` in `render.koerper.js` — dasselbe
 * Modul, aus dem das Tragjoch seine Winkel bekommt, und dasselbe, das der
 * Tragausleger benutzen wird.
 *
 * >>> WARUM ES TROTZDEM EIN EIGENES MODUL IST. <<<
 *
 * `erzeugeSzene` in render.3d.js baut das TRAGJOCH: vier Winkelgurte aus
 * `querschnitt(m)`, Bindebleche in zwei Ebenen, Mast und Anbauteile. Jede
 * dieser Grössen fehlt dem Abfangjoch oder bedeutet dort etwas anderes — es
 * hat ZWEI Gurte, seine Bleche liegen flach auf Flanschhöhe, und ab A240
 * stehen an den Bereichsgrenzen Quersteifen aus Walzprofil. Gemeinsam sind
 * die BAUSTEINE, nicht der Aufbau.
 *
 * Die Szene trägt dieselbe Gestalt wie die des Tragjochs (`flaechen`,
 * `linien`, `marken`, `bauteiltitel`, `masse`, `legende`, `grenzen`), damit
 * `szeneVerschieben`, `szenenVereinen` und die Legendenspalte sie ohne
 * Sonderweg annehmen.
 *
 * Gezeichnet wird, was das Modell auch nach AxisVM ausleitet — dieselbe
 * Quelle, dieselben Stationen. Was im Bild steht, lässt sich dort bauen.
 * ===========================================================================
 */

import { abfangQuerschnitt, abfangBlechstationen, abfangStuetzweite,
         abfangAnbindung } from './core.abfangjoch.js';
import { getAbfangjoch, abfangAufbau, abfangBindeblech,
         abfangEndverstaerkung, abfangQuersteife,
         abfangKroepfung, abfangLichteWeite,
         abfangLichtFeld } from './data.abfangjoche.js';
import { getGurtprofil } from './data.profiles.js';
import { bauteilFarbe } from './design.js';
import { prisma, prismaY, platte, stab, quader,
         walzProfilPoly } from './render.koerper.js';

/**
 * DIE SZENE EINES ABFANGJOCHS.
 *
 * @param {string} typ  z.B. 'A160'
 * @param {number} jt   Jochlänge [m], eine der geführten
 * @param {object} opt  {mastZeichnen}
 */
export function abfangSzene(typ, jt, opt = {}) {
  const a = getAbfangjoch(typ);
  const auf = abfangAufbau(a);
  const q = abfangQuerschnitt(typ);
  const p = getGurtprofil(auf.gurtprofil);
  const ein = abfangBlechstationen(typ, jt);
  const bl = abfangBindeblech(typ);
  const sw = abfangStuetzweite(typ, jt);

  const e = q.e / 100;                    // cm -> m, Achsabstand der Gurte
  const hG = p.h / 100;                   // Profilhöhe [m]
  const bG = p.b / 100;                   // Flanschbreite [m]
  const zf = (p.h - p.tf) / 2 / 100;      // Flanschmitte über der Schwerachse
  const js = sw ? sw.bis : jt;
  const ue = Math.max(0, (jt - js) / 2);

  /*
   * >>> DIE JOCHENDEN SIND ABGEKRÖPFT. <<<
   *
   * Weisung vom 4. September: «zudem sind die jochenden in der gesamtbreite
   * nicht verfuengt (abgekroepft)». In der Draufsicht laufen die Gurte zum
   * Ende hin zusammen — bei A300 von 600 lichter Weite im Feld auf 300 am
   * Ende, mit einem Knick bei 850 (langes Ende) bzw. 920 (kurzes) und voller
   * Weite ab 1920.
   *
   * ALLES QUER HÄNGT DARAN: die Gurtachsen, die Länge jedes Bindeblechs, die
   * Lage der Gabel und des Deckblechs. Deshalb steht die lichte Weite hier
   * als Funktion von x und nicht als Zahl.
   *
   * `versatzAchse` ist der Abstand von der lichten Kante zur Schwerachse des
   * Gurtes — beim U die Schwerpunktlage e_y, beim I die halbe Flanschbreite.
   * Er folgt aus den Daten (e − d)/2 und muss nicht unterschieden werden.
   */
  const kr = abfangKroepfung(a);
  /*
   * >>> GEGEN DIE LICHTE WEITE, NICHT GEGEN `d`. <<<
   *
   * Hier stand `(e - d)/2`. Das galt, solange `d` die lichte Weite war -
   * seit dem Befund vom 4. September ist es der STEGABSTAND, und beim I ist
   * er gleich dem Achsabstand. Der Versatz kam damit auf NULL heraus, und
   * die Gurte standen um eine halbe Flanschbreite zu weit innen: bei A300
   * lag die Achse auf 150 statt 225 mm.
   *
   * Zu sehen war es am Deckblech, nicht am Gurt - es sitzt an der inneren
   * Flanschspitze, und die lag damit genau auf der Gurtachse. Genau so hat
   * es der Auftraggeber gemeldet: «Die Deckbleche liegen auf der achse des
   * IPE.» Die Ausleitung war nicht betroffen, sie rechnet schon gegen
   * `abfangLichtFeld`.
   */
  const versatzAchse = (q.e * 10 - abfangLichtFeld(a)) / 2;      // mm
  const licht = (x) => abfangLichteWeite(a, x, jt);        // mm
  const yAchse = (x) => (licht(x) / 2 + versatzAchse) / 1000;   // m
  /** Der Gurtumriss an der Stelle x, auf seiner Seite s. */
  const polyGurt = (x, s, aus = 0) => walzProfilPoly(p, { oeffnung: s })
    .map(([y, z]) => [y + s * (yAchse(x) + aus) * 1000, z]);

  const flaechen = [];
  const linien = [];
  const marken = [];
  const masse = [];
  const bauteiltitel = [];

  /*
   * DIE LEGENDE IST EINE STÜCKLISTE. Jedes Bauteil bekommt beim ersten
   * Auftreten seine Farbe und zählt danach mit — wie beim Tragjoch. So steht
   * neben dem Bild, was verbaut ist und wie oft, und beides kommt aus
   * derselben Quelle wie die Ausleitung.
   */
  const bauteile = new Map();
  const farbeFuer = (schluessel, label, art) => {
    if (!bauteile.has(schluessel)) {
      bauteile.set(schluessel, {
        schluessel, label, art, farbe: bauteilFarbe(bauteile.size), anzahl: 0,
      });
    }
    const b2 = bauteile.get(schluessel);
    b2.anzahl++;
    return b2.farbe;
  };

  /*
   * >>> DIE VERSTÄRKUNG SITZT NUR AN EINEM ENDE. <<<
   *
   * Weisung vom 4. September: «beachte das die verstärkung nur einseitig ist
   * aufgrund der längeren gabel für das einfädelde montieren der träger
   * zwischen zwei masten.»
   *
   * Das erklärt zugleich die ungleichen Endbereiche der Blecheinteilung —
   * links 1450 bis zum ersten Blech, rechts 900. Das lange Ende ist die
   * Montagegabel: der Träger wird zwischen zwei stehende Masten eingefädelt,
   * und dafür braucht ein Ende Überlänge. Verstärkt wird genau dieses eine.
   *
   * Die Stückliste sagt dasselbe: `anzahl: 2` heisst bei zwei Gurten EIN
   * Stück je Gurt an einem Ende, nicht vier Stücke an beiden. Bis hierher
   * stand die Gabel an beiden Enden — im Bild und im Rechenmodell.
   */
  const verst = abfangEndverstaerkung(typ);
  const gabel = verst?.art === 'gabel' ? verst.teile[0] : null;
  const gBereiche = [];
  if (gabel?.beginn > 0 && gabel?.laenge > 0) {
    gBereiche.push([gabel.beginn / 1000, (gabel.beginn + gabel.laenge) / 1000]);
  }

  /*
   * DIE SCHNITTE ENTLANG DER ACHSE. Ein Prisma je Abschnitt, damit ein
   * Bauteil später Farbe und Wert je Feld tragen kann — das Tragjoch macht
   * es ebenso. Die Blechstationen sind die Schnitte, dazu die beiden Enden
   * und die Grenzen der Gabel.
   */
  const stationen = ein?.stationen ?? [];
  // Die Knickstellen sind Schnitte wie jede Station - sonst liefe der Gurt
  // geradlinig ueber den Knick hinweg.
  const knicke = kr
    ? [kr.knickLangesEnde, kr.vollbreiteAb].flatMap(
        (v) => [v / 1000, jt - v / 1000])
      .concat([kr.knickKurzesEnde / 1000, jt - kr.knickKurzesEnde / 1000])
    : [];
  const xs = [0, jt, ...stationen, ...gBereiche.flat(), ...knicke]
    .map((x) => Math.round(x * 1e6) / 1e6)
    .filter((x) => x >= 0 && x <= jt)
    .sort((u, v) => u - v)
    .filter((x, i, arr) => i === 0 || x - arr[i - 1] > 1e-9);

  /*
   * >>> WAS AM GURT SITZT, FOLGT DEM GURT. <<<
   *
   * Weisung vom 4. September: «die langen deckbleche innen sind auch
   * gekröpft, sie folgen somit dem Gurt und sind keine direktverbindung.»
   *
   * Ein Prisma zwischen zwei Querschnitten ist GERADE. Deckblech und Gabel
   * reichen aber über den Knick hinweg — das Deckblech am langen Ende über
   * 1450 mm, der Knick liegt bei 850. Mit nur zwei Querschnitten schnitt das
   * Blech geradlinig über die Kröpfung hinweg statt ihr zu folgen; im Bild
   * war genau das zu sehen.
   *
   * `band` legt deshalb an jeder Knickstelle im Bereich einen Schnitt und
   * setzt das Bauteil aus Abschnitten zusammen — so, wie es geschweisst ist.
   */
  const band = (fnPoly, x0, x1, opt) => {
    const cuts = [x0, ...xs.filter((v) => v > x0 + 1e-9 && v < x1 - 1e-9), x1];
    for (let i = 0; i < cuts.length - 1; i++) {
      flaechen.push(...prisma(fnPoly(cuts[i]), cuts[i], cuts[i + 1], opt,
                              0, 0, fnPoly(cuts[i + 1])));
    }
  };

  /*
   * DIE GURTE. Zwei Profile bei y = ±e/2 — dort, wo auch das AxisVM-Modell
   * sie führt. Die Öffnung des C zeigt nach aussen (Weisung, 4. September:
   * «gurte spiegelsymetrisch auf die jochachse bezogen»); der Stegrücken
   * liegt damit innen, und genau dort stossen die Bindebleche an.
   */
  let fbGurt = null;
  for (const s of [1, -1]) {
    // Je Gurt EIN Eintrag in der Stueckliste - nicht je Feld, sonst zaehlte
    // sie Prismen statt Bauteile.
    fbGurt = farbeFuer(`profil|${p.name}`, `Gurt · ${p.name}`, 'profil');
    for (let i = 0; i < xs.length - 1; i++) {
      // Anfangs- UND Endumriss: dazwischen zieht `prisma` die Schräge des
      // Knicks. Genau dafür nimmt es einen zweiten Querschnitt.
      flaechen.push(...prisma(polyGurt(xs[i], s), xs[i], xs[i + 1], {
        gruppe: 'profil', teil: s > 0 ? 'GURT_V' : 'GURT_H', station: i,
        farbeBauteil: fbGurt,
        label: `Gurt ${s > 0 ? 'vorn' : 'hinten'} · ${p.name}`,
      }, 0, 0, polyGurt(xs[i + 1], s)));
    }
  }

  /*
   * DIE GABEL. Ein zweites Gurtstück, AUSSEN angeschweisst — der Steg an den
   * Flanschspitzen des Gurtes (Schnitt A-A). Seine Achse liegt damit um eine
   * ganze Flanschbreite weiter aussen; im Bild ist genau das zu sehen, und
   * im Modell trägt dort der Verbundquerschnitt.
   */
  if (gabel) {
    for (const s of [1, -1]) {
      const fb = farbeFuer(`profil|gabel|${gabel.profil}`,
                           `Gabel · ${gabel.profil} × ${gabel.laenge}`, 'profil');
      for (const [x0, x1] of gBereiche) {
        band((x) => polyGurt(x, s, bG), x0, x1, {
          gruppe: 'profil', teil: 'GABEL', farbeBauteil: fb,
          label: `Gabel · ${gabel.profil} × ${gabel.laenge}`,
        });
      }
    }
  }

  /*
   * DAS DECKBLECH — ab A270 tritt es an die Stelle der Gabel.
   *
   * >>> ES LIEGT INNEN, NICHT BÜNDIG AUSSEN. <<<
   *
   * Weisung vom 4. September: «die Deckbleche in diesem fall ist nicht
   * bündig zum C-Profil (innenliegend), dies sieht man auch auf den
   * Schemazeichnungen (stärkere nachzeichnung innenliegend).»
   *
   * Damit geht die Massenkette der Werkstattzeichnung auf: am Jochende misst
   * A300 aussen 600, das sind 300 lichte Weite plus zweimal die Flanschbreite
   * 150. Die beiden Deckbleche zu 10 springen nach innen vor und machen aus
   * den 300 die SPREIZUNG 280 — die Zahl, die das Sortiment für jeden Typ
   * führt. Läge das Blech aussen, wäre die Spreizung 320 und die Angabe
   * falsch.
   *
   * Seine Breite ist die Profilhöhe weniger 10 (A270 260/270, A300 290/300,
   * A330 320/330, A360 350/360) — es deckt den Steg zwischen den Flanschen,
   * nicht den Flansch.
   */
  for (const db of (verst?.art === 'deckblech' ? verst.teile : [])) {
    const l2 = (db.l ?? 0) / 1000;
    if (!(l2 > 0)) continue;
    const [x0, x1] = db.lage === 'R' ? [jt - l2, jt] : [0, l2];
    const t2 = db.t ?? 10;                        // mm
    const hD = db.b ?? p.h * 10;                  // mm, Breite = Profilhöhe − 10
    /** Der Blechumriss an der Stelle x - er folgt der Kröpfung wie der Gurt. */
    const polyDeck = (x, s) => {
      const yi = s * licht(x) / 2;                // innere Kante des Gurtes
      return [[yi - s * t2, -hD / 2], [yi, -hD / 2],
              [yi, hD / 2], [yi - s * t2, hD / 2]];
    };
    for (const s of [1, -1]) {
      const fb = farbeFuer(`blech|deck|${db.b}x${db.t}`,
                           `Deckblech ${db.b}×${db.t}`, 'blech');
      band((x) => polyDeck(x, s), x0, x1, {
        gruppe: 'blech', teil: `DECK_${db.lage}`, farbeBauteil: fb,
        label: `Deckblech ${db.b}×${db.t}×${db.l} (${db.lage})`,
      });
    }
  }

  /*
   * DIE RIEGEL. An jeder Station entweder ein Blechpaar auf Flanschhöhe oder
   * — ab A240 an den Grenzen der QV-Bereiche — eine Quersteife aus
   * Walzprofil auf der Schwerachse.
   *
   * >>> SIE SPANNEN ÜBER DIE LICHTE WEITE AN IHRER STATION. <<<
   *
   * Weisung vom 4. September: «die liegenden verbinungsbleche sind zu kurz».
   * Zuvor stand hier die Länge `l` aus der Stückliste, und bei den
   * IPE-Typen reichte das Blech nicht bis an die Gurte: A300 führt 447, die
   * lichte Weite ist dort 600. Ein Riegel, der nicht anschliesst, ist kein
   * Riegel.
   *
   * Weil der Träger zum Ende hin abgekröpft ist, ist diese Weite an jeder
   * Station eine andere — deshalb `licht(x)` und keine feste Zahl. Die
   * Stücklistenlänge steht weiter in der Beschriftung; wofür sie bei den
   * IPE-Typen gilt, ist offen (sie liegt durchweg bei d − b − 2.5).
   */
  const qsSt = abfangQuersteife(typ);
  const pSt = qsSt?.profil ? getGurtprofil(qsSt.profil) : null;
  stationen.forEach((x, k) => {
    const art = ein.arten?.[k]?.art;
    if ((art === 'steife' || art === 'steifeEnde') && pSt) {
      /*
       * Schnitt C-C: senkrechter Steg zwischen die Gurtstege geschweisst.
       * Seine beiden Flansche liegen damit dort, wo sonst die zwei
       * Bindebleche liegen — er ersetzt das Paar, und das soll man sehen.
       */
      // Auch sie schliesst an die Gurte an - Stuecklistenlaenge im Namen.
      const lSt = licht(x) / 1000;
      const mm = (art === 'steifeEnde' ? qsSt.ende?.laenge : qsSt.laenge)
                 ?? Math.round(lSt * 1000);
      const fb = farbeFuer(`profil|steife|${pSt.name}|${mm}`,
                           `Quersteife · ${pSt.name} × ${mm}`, 'profil');
      flaechen.push(...prismaY(walzProfilPoly(pSt), x, -lSt / 2, lSt / 2, {
        /*
         * DIE QUERSTEIFE IST EIN BLECH IM SINNE DER EBENEN. Der Renderer
         * kennt `profil`, `blech`, `anbau` — eine eigene Ebene 'steife' gäbe
         * es nicht, und `_ebeneAn` liesse sie stillschweigend weg. Sie steht
         * an derselben Stelle wie ein Blechpaar und gehört zu derselben
         * Schaltergruppe.
         */
        gruppe: 'blech', teil: `STEIFE_${k}`, station: k, farbeBauteil: fb,
        label: `Quersteife · ${pSt.name} × ${mm}`,
      }));
      return;
    }
    const m2 = ein.arten?.[k]?.masse ?? bl?.regel;
    if (!m2) return;
    const lB = licht(x) / 1000;                     // Blechlänge quer [m]
    const kurz = { endeL: 'Endblech links', endeR: 'Endblech rechts' }[art]
              ?? 'Bindeblech';
    for (const s of [1, -1]) {
      const fb = farbeFuer(`blech|${art ?? 'regel'}|${m2.b}x${m2.t}x${m2.l}`,
                           `${kurz} ${m2.b}×${m2.t}×${m2.l}`, 'blech');
      flaechen.push(...platte(x, m2.b ?? 100, 'z', s * zf, -lB / 2, lB / 2, {
        gruppe: 'blech', teil: `BL_${s > 0 ? 'O' : 'U'}${k}`, station: k,
        dicke: m2.t ?? 8, farbeBauteil: fb,
        label: `${kurz} ${m2.b}×${m2.t}×${m2.l}`,
      }));
    }
  });

  /*
   * ================== DIE ANBAUTEILE AM ABFANGJOCH =======================
   *
   * Weisung vom 4. September: «die anbindung an das joch erfolgt über die
   * beiden gurte für die vertikalen elemente (jochaufsatz / hängestütze /
   * fahrleitung etc.) Die Abgefangenen Leiter wirken auf mitte Träger.»
   *
   * Gezeichnet wird, was das Modell auch baut: ein Punkt auf der Jochachse
   * und von dort die Arme zu den Gurten — beide beim vertikalen Element,
   * einer beim abgefangenen Leiter. Der Ständer hängt am selben Punkt und
   * reicht bis zur Höhe des Bauteils.
   */
  (opt.anbauteile ?? []).forEach((at, j) => {
    if (!at || at.aktiv === false) return;
    if ((at.ort ?? 'joch') !== 'joch') return;
    const x = Math.min(Math.max(Number(at.x) || 0, 0), jt);
    const an = abfangAnbindung(at);
    const fb = farbeFuer(`anbau|${at.vorlage ?? at.name}`,
                         at.name ?? 'Anbauteil', 'anbau');
    const teil = `AT_${j + 1}`;
    const opt2 = { gruppe: 'anbau', teil, farbeBauteil: fb,
                   label: `${at.name ?? 'Anbauteil'} · ${an.art === 'mitte'
                     ? `Mitte Träger (${an.seite === 'H' ? 'hinten' : 'vorn'})`
                     : 'über beide Gurte'}` };
    // Die Arme zu den Gurten - dieselbe Wahl wie im Stabmodell.
    const seiten = an.art === 'mitte' ? [an.seite === 'H' ? -1 : 1] : [1, -1];
    seiten.forEach((sg) => {
      flaechen.push(...stab([x, 0, 0], [x, sg * yAchse(x), 0], 0.035, opt2));
    });
    /*
     * DER STAENDER. Seine Länge ist die tiefste Modulhöhe der Baugruppe -
     * so weit reicht das Bauteil unter das Joch. Ohne Modul bleibt ein
     * Stummel: es steht etwas da, und man sieht, dass es keine Höhe führt.
     */
    const zs = (at.module ?? []).map((m2) => Number(m2?.z) || 0);
    const zTief = zs.length ? Math.min(...zs, 0) : -0.25;
    const zHoch = zs.length ? Math.max(...zs, 0) : 0;
    if (zTief < -0.01) {
      flaechen.push(...stab([x, 0, 0], [x, 0, zTief], 0.045, opt2));
      flaechen.push(...quader([x, 0, zTief], [0.09, 0.09, 0.06], opt2));
    }
    if (zHoch > 0.01) {
      flaechen.push(...stab([x, 0, 0], [x, 0, zHoch], 0.045, opt2));
      flaechen.push(...quader([x, 0, zHoch], [0.09, 0.09, 0.06], opt2));
    }
    marken.push({ gruppe: 'anbau', art: 'anbau', teil,
                  p: [x, 0, zTief < -0.01 ? zTief - 0.12 : hG / 2 + 0.12],
                  text: at.name ?? `A${j + 1}` });
  });

  /*
   * DIE AUFLAGER. Zwei Marken auf der Jochachse, um den Überstand eingerückt
   * — dort hängt im Modell der Auflagerpunkt an beiden Gurten.
   *
   * >>> DIE FELDNAMEN SIND DIE DES RENDERERS. <<<
   *
   * Erster Anlauf: `punkt`, `von`, `bis`, `label`. Der Renderer liest aber
   * `p`, `p0`, `p1`, `text` — und stolperte an `mk.p[0]` über undefined,
   * bevor irgendetwas gezeichnet war. Ergebnis: eine leere Fläche und
   * zweihundert gleiche Zeilen in der Konsole. Gemeldet hat es der
   * Auftraggeber, nicht der Prüfstand: er baut die Szene, aber er malt sie
   * nicht.
   */
  for (const x of [ue, jt - ue]) {
    marken.push({ gruppe: 'auflager', art: 'auflager',
                  p: [x, 0, -hG / 2 - 0.15], text: 'Auflager' });
  }

  bauteiltitel.push({
    p: [jt / 2, 0, hG / 2 + 0.25],
    text: `${typ} · ${jt.toFixed(2)} m · ${ein?.anzahl ?? 0} Stationen`,
    feld: 'abfangTyp', tab: 'system',
  });
  masse.push({
    feld: 'L', tab: 'system', achse: 'x',
    p0: [0, 0, 0], p1: [jt, 0, 0], ab: [0, 0, -1], d: 0.9,
    text: `jt = ${jt.toFixed(2)} m`,
  });
  if (sw) {
    masse.push({
      tab: 'system', achse: 'x',
      p0: [ue, 0, 0], p1: [jt - ue, 0, 0], ab: [0, 0, -1], d: 1.5,
      text: `js = ${js.toFixed(2)} m`,
    });
  }
  // Das Montageende zeigt sich an der Masskette, nicht nur am Bauteil.
  if (gBereiche.length) {
    const [g0, g1] = gBereiche[0];
    masse.push({
      tab: 'system', achse: 'x',
      p0: [g0, 0, 0], p1: [g1, 0, 0], ab: [0, 0, 1], d: 0.55,
      text: `Gabel ${Math.round((g1 - g0) * 1000)}`,
    });
  }

  /*
   * >>> OHNE `grenzen` BLEIBT DIE KAMERA STEHEN. <<<
   *
   * `ansichtZuruecksetzen` liest sie als Erstes und kehrt ohne sie sofort
   * zurück — die Szene ist dann da, das Bild aber leer, weil die Kamera noch
   * auf das vorige Tragwerk sieht. Genau das hat der Auftraggeber gemeldet:
   * «ich sehe die abfangjoche im 3d noch nicht.» Zweihundert Flächen, kein
   * Pixel.
   *
   * Gebildet wird sie aus dem, was wirklich gezeichnet wird — so macht es
   * `grenzenVon` für den Ersatzquerschnitt auch.
   */
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  let z0 = Infinity, z1 = -Infinity;
  flaechen.forEach((f) => f.punkte.forEach((pt) => {
    if (pt[0] < x0) x0 = pt[0];
    if (pt[0] > x1) x1 = pt[0];
    if (pt[1] < y0) y0 = pt[1];
    if (pt[1] > y1) y1 = pt[1];
    if (pt[2] < z0) z0 = pt[2];
    if (pt[2] > z1) z1 = pt[2];
  }));
  if (!Number.isFinite(x0)) {
    x0 = 0; x1 = jt; y0 = -0.5; y1 = 0.5; z0 = -0.5; z1 = 0.5;
  }

  return {
    flaechen, linien, marken, masse, bauteiltitel,
    vektoren: [], lastflaechen: [],
    legende: [...bauteile.values()],
    // Etwas Luft nach oben und unten für Titel und Masskette.
    grenzen: { xMin: x0, xMax: x1, yMin: y0, yMax: y1,
               zMin: z0 - 1.2, zMax: z1 + 0.8 },
    stationen,
    L: jt, art: 'abfangjoch', typ,
    // Der Nachweisschnitt liegt im Randfeld - dort fällt er (Randfeld ist
    // das längste Feld, siehe abfangRahmenfeld).
    xNachweis: stationen[0] ?? null,
  };
}
