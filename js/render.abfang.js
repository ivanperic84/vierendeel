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
         abfangAnbindung, abfangAnbauLasten } from './core.abfangjoch.js';
import { getAbfangjoch, abfangAufbau, abfangBindeblech,
         abfangEndverstaerkung, abfangQuersteife,
         abfangKroepfung, abfangLichteWeite,
         abfangLichtFeld } from './data.abfangjoche.js';
import { getGurtprofil } from './data.profiles.js';
import { bauteilFarbe } from './design.js';
import { prisma, prismaY, platte, prismaZ, stab, quader,
         iProfilPoly, walzProfilPoly,
         mastKoerper } from './render.koerper.js';

import { getMastprofil, getStegrichtung } from './data.masten.js';
import { linkEinspannung } from './core.auflager.js';

/*
 * >>> OHNE WERTE KEINE FARBE AUS DER SKALA. <<<
 *
 * Weisung vom 4. September: «die farbe fuer die resultatauswertung fuer das
 * abfangjoch modell nachziehen.»
 *
 * Die Modellansicht faerbt nach `f.werte[feld]`: ist der Wert eine Zahl,
 * kommt eine Farbe der Ausnutzungsskala; fehlt das Feld `werte` GANZ, faellt
 * sie auf die Bauteilfarbe zurueck - das Abfangjoch stuende in den
 * Plot-Ansichten im gewoehnlichen Stahlton da, als waere es nachgewiesen.
 *
 * Ein LEERER Wertesatz sagt das Gegenteil: das Feld ist da, die Zahl fehlt,
 * und die Ansicht faerbt neutral.
 *
 * >>> SEIT ES SEINEN NACHWEIS HAT, STEHEN DORT ZAHLEN. <<<
 *
 * Weisung vom 9. September: «das abfangjoch im modell fertig bauen, es ist
 * noch alles grau und ohne anbauteile. achte darauf das die darstellung dem
 * prinzip der tragjoche entspricht.»
 *
 * `abfangAuswertung` rechnet seit dem 8. September Gurt und Bleche Station
 * fuer Station. Bekommt die Szene dieses Ergebnis (`opt.erg`), traegt jeder
 * Gurtabschnitt und jedes Blech seine eigenen Werte - dieselben Felder wie
 * beim Tragjoch, damit die Plotumschaltung ohne Sonderfall arbeitet:
 *
 *      eta     Ausnutzung
 *      sig_v   Gurt: Summe der Normalspannungen · Blech: von Mises
 *      sig     Gurt: aus der Normalkraft · Blech: aus dem Anschnittmoment
 *      M       Gurt: oertliches Rahmenmoment · Blech: Anschnittmoment
 *      V       nur die Bleche - wie beim Tragjoch bleiben die Gurte grau
 *
 * OHNE Ergebnis bleibt es beim leeren Satz: ein Typ ohne erfasste Blechlage
 * ist nicht rechenbar, und ein Nachbartragwerk wird gar nicht gerechnet.
 */
const OHNE_WERTE = Object.freeze({});

/**
 * DIE SZENE EINES ABFANGJOCHS.
 *
 * @param {string} typ  z.B. 'A160'
 * @param {number} jt   Jochlänge [m], eine der geführten
 * @param {object} opt  {mastZeichnen}
 */
/**
 * Die Szene eines Abfangjochs.
 *
 * @param {string} typ   Abfangjochtyp
 * @param {number} jt    Jochlaenge [m]
 * @param {object} opt   { mast, anbauteile, lager } - `lager` ist der
 *                       Eingabesatz; daraus liest die Szene die
 *                       Auflagerbedingung fuer die Beschriftung.
 */
export function abfangSzene(typ, jt, opt = {}) {
  const a = getAbfangjoch(typ);
  const auf = abfangAufbau(a);
  const q = abfangQuerschnitt(typ);
  const p = getGurtprofil(auf.gurtprofil);
  const ein = abfangBlechstationen(typ, jt);
  const bl = abfangBindeblech(typ);
  const sw = abfangStuetzweite(typ, jt);

  /*
   * DIE WERTE JE STELLE - aus der Reihe des Gurtnachweises.
   *
   * Genommen wird die naechstgelegene Stelle, nicht interpoliert: die Reihe
   * steht an den Stationen und an den Auflagern, und dazwischen aendert sich
   * die Ausnutzung stetig. Ein Abschnitt traegt damit den Wert der Stelle,
   * die ihm gehoert - so faerbt auch das Tragjoch.
   */
  const A = opt.erg ?? null;
  const gurtWerte = (x) => {
    const r = A?.reihe;
    if (!Array.isArray(r) || !r.length) return OHNE_WERTE;
    const n = r.reduce((a2, b2) =>
      (Math.abs(b2.x - x) < Math.abs(a2.x - x) ? b2 : a2), r[0]);
    return { eta: n.eta, sig_v: n.sigma, sig: n.sigN, M: n.Moertl, N: n.N };
  };
  /** Die Werte eines Blechs oder einer Quersteife an der Station x. */
  const blechWerte = (x) => {
    const liste = A?.bleche?.bleche;
    if (!Array.isArray(liste) || !liste.length) return OHNE_WERTE;
    const n = liste.reduce((a2, b2) =>
      (Math.abs(b2.x - x) < Math.abs(a2.x - x) ? b2 : a2), liste[0]);
    return { eta: n.eta, sig_v: n.sigmaV, sig: n.sigma,
             M: n.Mblech, V: n.Vblech };
  };

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

  /*
   * Alles, was hier in `flaechen` kommt, traegt `werte: OHNE_WERTE` - siehe
   * oben. `push` ist der eine Ort, an dem sich das sicherstellen laesst;
   * jede Aufrufstelle einzeln zu bedienen hiesse, eine zu vergessen.
   */
  /*
   * ==================== DIE LASTEN IM BILD ===============================
   *
   * Weisung vom 4. September: «Die lasten darstellen im 3d die die
   * leiterzugkraefte ausweisen.»
   *
   * Gezeichnet wird, was das Modell aufbringt - dieselben Zahlen aus
   * `abfangAnbauLasten`. Die Art faerbt den Pfeil: Leiterzug, Wind,
   * staendig. Die Laenge waechst mit der WURZEL der Kraft; linear
   * erschluege ein Pfeil von 22 kN jeden von einem.
   */
  const vektoren = [];
  const lastflaechen = [];
  const pfeilLaenge = (kN) => 0.30 + 0.55 * Math.sqrt(Math.abs(kN) / 20);
  const rohFlaechen = [];
  const flaechen = {
    push: (...f) => rohFlaechen.push(
      ...f.map((x) => ({ werte: OHNE_WERTE, ...x }))),
    forEach: (fn) => rohFlaechen.forEach(fn),
    get length() { return rohFlaechen.length; },
  };
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
        werte: gurtWerte((xs[i] + xs[i + 1]) / 2),
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
        werte: blechWerte(x),
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
        dicke: m2.t ?? 8, farbeBauteil: fb, werte: blechWerte(x),
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
    /*
     * >>> DER VERLAUF DES LEITERS IST ZU SEHEN. <<<
     *
     * Weisung vom 4. September: «dies sollte dann auch im 3d entsprechend
     * sichtbar sein beim anbauteil.»
     *
     * Ein DURCHGEHENDER Leiter laeuft nach beiden Seiten weiter - er endet
     * nicht am Joch, und er faengt nichts ab. Ein abgefangener endet dort,
     * auf seiner Seite. Gezeichnet wird beides auf der Hoehe des Drahtwerks:
     * ein Strich nach vorn, nach hinten oder nach beiden Seiten.
     */
    let abspannung = null;                // wo der Leiter endet
    if (an.art === 'mitte') {
      const zL = zs.length ? Math.min(...zs) : -0.35;
      const richtungen = an.verlauf === 'durchgehend' ? [1, -1]
        : [an.seite === 'H' ? -1 : 1];
      richtungen.forEach((sy) => {
        flaechen.push(...stab([x, 0, zL], [x, sy * 1.1, zL], 0.03, {
          ...opt2, teil: `${teil}_L`,
          label: `${at.name ?? 'Leiter'} · ${an.verlauf === 'durchgehend'
            ? 'durchgehend, keine Abfangkraft'
            : `${an.verlauf === 'hinten' ? 'hinten' : 'vorn'} abgefangen`}`,
        }));
      });
      // Das ENDE bekommt einen Klotz - dort sitzt die Abspannung.
      if (an.verlauf !== 'durchgehend') {
        const sy = an.seite === 'H' ? -1 : 1;
        abspannung = [x, sy * 1.1, zL];
        flaechen.push(...quader(abspannung, [0.10, 0.14, 0.10],
                                { ...opt2, teil: `${teil}_A` }));
      }
    }
    /*
     * DIE KRAEFTE DES BAUTEILS greifen am Knoten auf der Jochachse an -
     * genau dort, wo sie auch im Stabmodell sitzen.
     *
     * >>> DER ZUG NICHT. <<<
     *
     * Weisung vom 9. September: «den kraftvektor auf die markierung
     * schieben und nicht in der mitte joch.»
     *
     * Der Leiter endet an der ABSPANNUNG - dem Klotz am Ende des Strichs -,
     * und dort zieht er. Der Pfeil stand auf der Jochachse und sah aus, als
     * greife die Kraft am Traeger selbst an; wo sie herkommt, war einen
     * Meter weiter zu sehen und ohne Zusammenhang.
     *
     * DAS MODELL BLEIBT, WIE ES IST: die Ausleitung setzt Z weiterhin auf
     * den Knoten der Traegerachse («Die Abgefangenen Leiter wirken auf mitte
     * Traeger», Weisung vom 4. September). Verschoben ist der PFEIL, nicht
     * der Angriffspunkt - er zeigt, woher der Zug kommt, und der Strich
     * dazwischen sagt, wie er ans Joch gelangt.
     */
    const lw = abfangAnbauLasten(at, {
      ek: opt.ek ?? 'EK2', R: opt.R, spannweite: opt.L_FL,
      tempFall: opt.tempFall });
    const pAn = [x, 0, 0];
    const pfeil = (art, ri, wert, nm, p = pAn) => {
      if (!wert) return;
      const f = Math.sign(wert) * pfeilLaenge(wert);
      vektoren.push({
        gruppe: 'last', art: 'last', lastart: art, p, teil,
        v: [ri[0] * f, ri[1] * f, ri[2] * f],
        text: `${nm} = ${Math.abs(wert).toFixed(2)} kN`,
        titel: `${at.name ?? 'Anbauteil'} · ${nm}`,
      });
    };
    pfeil('leiterzug', [0, 1, 0], lw.Z, 'Z_ab', abspannung ?? pAn);
    pfeil('staendig', [0, 0, -1], Math.abs(lw.Gz), 'G');
    pfeil('windX', [1, 0, 0], lw.Qx, 'W_x');
    pfeil('windY', [0, 1, 0], lw.Qy, 'W_y');

    marken.push({ gruppe: 'anbau', art: 'anbau', teil,
                  p: [x, 0, zTief < -0.01 ? zTief - 0.12 : hG / 2 + 0.12],
                  text: at.name ?? `A${j + 1}` });
  });

  /*
   * ========================= DIE MASTEN ==================================
   *
   * Weisung vom 4. September: «Die Masten im 3D noch darstellen.»
   *
   * Sie stehen unter den beiden Auflagern und reichen vom Fundament bis zur
   * Jochachse. Gezeichnet wird der ECHTE Profilumriss - `prismaZ` mit dem
   * I-Polygon, derselbe Weg wie beim Tragjoch; ein Kasten wäre hier so
   * falsch wie bei den Gurten.
   *
   * Die Stegrichtung entscheidet, wie er im Raum liegt: «Steg quer zum
   * Gleis» stellt die Profilhöhe in die Jochachse, gedreht ist es umgekehrt.
   * Genau das unterscheidet die starke von der schwachen Achse quer zum
   * Gleis, und man soll es dem Bild ansehen.
   *
   * OHNE MASTANGABE WIRD NICHTS GEZEICHNET. Ein Mast, den niemand gewählt
   * hat, wäre eine Behauptung über die Lagerung.
   */
  /*
   * >>> DERSELBE BAUSTEIN WIE BEIM TRAGJOCH. <<<
   *
   * Weisung vom 10. September: «warum sehen die masten anders aus im 3d als
   * die bei den tragjochen? wurden diese nicht fertig gebaut?»
   *
   * Hier stand ein einzelnes Prisma vom Fuss bis zur Jochachse, einfarbig -
   * waehrend die Tragjochszene daneben die Ausnutzung ueber die Hoehe zeigte,
   * den Ueberstand, die Fussschraffur und den Zuganker. Es war nicht
   * unfertig, sondern eine ZWEITE Zeichnung desselben Bauteils, und die
   * blieb hinter der ersten zurueck.
   *
   * `mastKoerper` steht jetzt in `render.koerper.js` und gilt beiden.
   *
   * >>> UND JEDES ENDE BEKOMMT SEINEN EIGENEN. <<<
   *
   * `opt.mast` war EINE Angabe fuer beide Masten; sie stammt aus den flachen
   * Feldern des Satzes. Profil, Hoehe und Anker koennen sich zwischen den
   * Enden unterscheiden - `opt.masten` traegt sie einzeln, wo sie da sind.
   */
  if (opt.mast?.profil && opt.mast.hoehe > 0) {
    const enden = [['A', ue], ['B', jt - ue]];
    for (const [name, x] of enden) {
      const md = opt.masten?.[name] ?? opt.mast;
      if (!md?.profil || !(md.hoehe > 0)) continue;
      let mp = null;
      try { mp = getMastprofil(md.profil); } catch { mp = null; }
      if (!mp) continue;
      const achse = getStegrichtung(md.stegrichtung)?.achse ?? 'y';
      const fb = farbeFuer(`mast|${mp.name}`, `Mast · ${mp.name}`, 'mast');
      const stegText = achse === 'y'
        ? 'Steg quer zum Gleis' : 'Steg längs zum Gleis';
      const nwA = opt.ergAnker?.[name]?.nachweis ?? null;
      const mk = mastKoerper({
        profil: mp, achse, x, zFuss: -md.hoehe, zAnschluss: 0,
        /*
         * DER KOPF RAGT UEBER DEN ANSCHLUSS - mindestens den halben Meter,
         * den die stehende Vorgabe verlangt, und ueber die Oberkante des
         * Traegers hinaus. Ohne das endete der Mast an der Jochachse, und
         * der Ueberstand mit seinen Traversen fehlte im Bild.
         */
        zKopf: Math.max(hG / 2 + 0.5, md.ueberstand ?? 0),
        name, grund: `Mast ${md.name ?? name} · ${mp.name} · ${stegText}`,
        nachweis: opt.ergMast?.[name] ?? null,
        farbeBauteil: fb,
        anker: md.anker ?? null,
        ankerText: nwA
          ? `${nwA.typ} · ${nwA.N >= 0 ? 'Zug' : 'Druck'} `
            + `${Math.abs(nwA.N).toFixed(1)} kN · η `
            + `${(nwA.eta ?? 0).toFixed(3)}`
          : null,
      });
      flaechen.push(...mk.flaechen);
      linien.push(...mk.linien);
      bauteiltitel.push(...(mk.bauteiltitel ?? []));
      masse.push(...(mk.masse ?? []));
      /*
       * >>> UND SEINE ANSCHRIFT. <<<
       *
       * Weisung vom 11. September: «die beschriftungspillen im 3d fehlen
       * bei den masten.»
       *
       * Beim Tragjoch steht ueber jedem Mastkopf «M2 · HEB 240 · 8.00 m»,
       * und ein Klick darauf oeffnet sein Profilfeld - fuer GENAU diesen
       * Masten. Hier fehlte sie ganz; das Bild nannte den Masten nirgends,
       * und anklicken liess er sich auch nicht.
       *
       * DIE LAENGE, NICHT DIE HOEHE: angeschrieben ist auf dem Querprofil
       * die Gesamtlaenge. Ohne Angabe steht die Hoehe bis zur Jochachse.
       *
       * `mastEnde` sagt, WELCHEN Masten die Anschrift meint - sonst
       * bearbeitet man M2 und klickt auf M3.
       */
      const lang = (md.ueberstand ?? 0) > 0
        ? md.hoehe + md.ueberstand : md.hoehe;
      bauteiltitel.push({
        p: [x, 0, Math.max(hG / 2 + 0.5, md.ueberstand ?? 0) + 0.55],
        text: `${md.name ? `${md.name} · ` : ''}${mp.name}`
            + ` · ${lang.toFixed(2)} m`,
        mastEnde: name, feld: 'mastProfil', tab: 'system', gruppe: 'mast',
      });
    }
  }

  /* =========================================================================
   * DIE VERTEILTEN LASTEN
   * =========================================================================
   *
   * Weisung vom 11. September: «die lasten sind nicht abgebildet wenn
   * abfangjoch ausgewählt.»
   *
   * Die Szene zeichnete nur die EINZELLASTEN der Anbauteile — Zug, Gewicht,
   * Wind je Bauteil. Was über die ganze Länge wirkt, fehlte: das
   * Eigengewicht des Jochs, der Schnee darauf und der Wind dagegen. Ohne
   * Anbauteile war das Bild damit leer, obwohl das Joch sich selbst trägt.
   *
   * >>> DIE ZAHLEN KOMMEN AUS DEM NACHWEIS, NICHT AUS DER TABELLE. <<<
   *
   * `erg.lasten` trägt gk, wk und sk — dieselben Werte, mit denen
   * `abfangAuswertung` rechnet. Sie hier ein zweites Mal aus dem Sortiment
   * zu holen hiesse, zwei Quellen zu führen; genau das ist am 9. September
   * schon einmal auseinandergelaufen (Bild 0.50 kN gegen Nachweis 1.70).
   *
   * >>> DIE RICHTUNGEN SIND DIE DES LIEGENDEN TRÄGERS. <<<
   *
   *   g, s   lotrecht nach unten, gestapelt über dem Träger
   *   w      in GLEISRICHTUNG, seitlich gegen den Träger — nicht quer wie
   *          beim Tragjoch. Die Rahmenebene liegt hier waagrecht, und der
   *          Wind wirkt darin.
   * ======================================================================= */
  const la = opt.erg?.lasten;
  if (la) {
    let zStapel = hG / 2 + 0.30;
    [{ w: la.gk ?? 0, art: 'staendig', nm: 'g_k' },
     { w: la.sk ?? 0, art: 'schnee', nm: 's_k' }].forEach((teil) => {
      if (!(teil.w > 0)) return;
      const zVon = zStapel;
      const zBis = zStapel + Math.min(0.5, 0.12 + teil.w * 0.12);
      zStapel = zBis;
      const n = Math.max(6, Math.min(24, Math.round(jt / 1.2)));
      for (let i = 0; i <= n; i += 1) {
        const x = (i * jt) / n;
        vektoren.push({
          gruppe: 'last', art: 'gleichlast', lastart: teil.art,
          p: [x, 0, zBis], v: [0, 0, -(zBis - zVon) - 0.16], schlank: true,
          text: i === Math.round(n / 2)
            ? `${teil.nm} = ${teil.w.toFixed(2)} kN/m` : '',
        });
      }
      lastflaechen.push({
        gruppe: 'last', art: 'gleichlast', lastart: teil.art,
        punkte: [[0, 0, zBis], [jt, 0, zBis], [jt, 0, zVon], [0, 0, zVon]],
        titel: `${teil.nm} = ${teil.w.toFixed(2)} kN/m`,
      });
    });

    /*
     * DER WIND STEHT AUF DER SEITE, VON DER ER KOMMT — sonst stünden die
     * Pfeile im Bauteil. Beim liegenden Träger ist das die Flanke in
     * Gleisrichtung, also die Aussenkante des vorderen Gurtes.
     */
    if ((la.wk ?? 0) > 1e-9) {
      const yKante = e / 2 + bG / 2;
      const yAus = yKante + 0.42;
      const n = Math.max(5, Math.min(18, Math.round(jt / 1.6)));
      for (let i = 0; i <= n; i += 1) {
        const x = (i * jt) / n;
        vektoren.push({
          gruppe: 'last', art: 'wind', lastart: 'windY',
          p: [x, yAus, 0], v: [0, -0.34, 0], schlank: true,
          text: i === Math.round(n / 2)
            ? `w_k = ${la.wk.toFixed(2)} kN/m` : '',
        });
      }
      lastflaechen.push({
        gruppe: 'last', art: 'wind', lastart: 'windY',
        punkte: [[0, yAus, 0], [jt, yAus, 0], [jt, yKante, 0], [0, yKante, 0]],
        titel: `w_k = ${la.wk.toFixed(2)} kN/m`,
      });
    }
  }

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
  /*
   * >>> UND SIE SAGEN, WIE GELAGERT IST. <<<
   *
   * Weisung vom 9. September: «die auswirkung im modell 3d noch pruefen.»
   * Beim Tragjoch steht an der Marke, was das Ende haelt - «HEB 240 · 7.0 m»
   * und darunter «c_φ 2110 · κ 24 %». Beim Abfangjoch stand «Auflager», und
   * das war alles: was in der Auflagerbedingung eingestellt ist, war im Bild
   * nicht zu sehen.
   *
   * Der Hebelarm des Kraeftepaars ist hier `e` - der Achsabstand der beiden
   * Gurte, die NEBENEINANDER liegen. Deshalb rechnet die Szene die
   * Einspannung selbst: das Mass liegt genau hier vor, und es von aussen
   * hereinzureichen hiesse, es ein zweites Mal zu bestimmen.
   */
  const lagerText = () => {
    if (!opt.lager) return null;
    const ein = linkEinspannung(opt.lager, 'abfangjoch', e);
    if (ein.art === 'gelenk') return 'Gelenk um z';
    if (ein.art === 'eingespannt') return 'eingespannt um z';
    return `c_φ ${Math.round(ein.cPhi)} um z`;
  };
  const lz = lagerText();
  for (const [name, x] of [['A', ue], ['B', jt - ue]]) {
    const md = opt.masten?.[name] ?? opt.mast;
    const mastDa = Boolean(md?.profil && md.hoehe > 0);
    /*
     * >>> DAS LAGER SITZT AM MASTFUSS, NICHT AN DER JOCHACHSE. <<<
     *
     * Weisung vom 10. September: «bei den masten beim abfangjoch sind noch
     * lagersymbole beim auflager zum masten, diese sind so bei den
     * tragjochen nicht vorhanden.»
     *
     * Dieselbe Stelle, dieselbe Begruendung wie beim Tragjoch, wo sie schon
     * einmal verlegt wurde: unten steht das FUNDAMENT, und dort ist
     * eingespannt. Am Jochende sitzt kein Lager, sondern der ANSCHLUSS ans
     * Joch - beim Abfangjoch die Drehfeder um z, die daneben angeschrieben
     * ist.
     *
     * Ein Auflagersymbol dort las sich wie ein Lager und war damit die
     * Aussage, die beim Nachbau eines geprueften FEM-Modells am teuersten
     * war. Es zweimal zu machen war nur moeglich, weil die beiden Szenen
     * ihre Marken getrennt setzen - wie zuvor schon die Mastkoerper.
     *
     * OHNE MAST GIBT ES KEINEN FUSS - dann bleibt die Marke am Joch, wie
     * beim Tragjoch auch.
     */
    const zMarke = mastDa ? -md.hoehe : -hG / 2 - 0.15;
    marken.push({ gruppe: 'auflager', art: 'auflager',
                  p: [x, 0, zMarke], text: name,
                  // Mit Mast steht die Fussschraffur da - siehe render.3d.js.
                  ohneSymbol: mastDa });
    if (mastDa || lz) {
      marken.push({ gruppe: 'auflager', art: 'auflagertext',
                    p: [x, 0, zMarke],
                    zeilen: [
                      mastDa ? `${md.profil} · ${md.hoehe.toFixed(1)} m`
                             : null,
                      lz,
                    ].filter(Boolean) });
    }
  }

  /*
   * DER NAME IST DER NAME (Weisung, 9. September: «nimm beim namen des jochs
   * im 3d die station weg»). Wieviele Blechstationen der Typ fuehrt, steht
   * in der Stueckliste und an den Blechen selbst; im Titel war es eine
   * dritte Zahl, die niemand liest - beim Tragjoch steht dort auch nur Typ
   * und Laenge.
   */
  bauteiltitel.push({
    p: [jt / 2, 0, hG / 2 + 0.25],
    text: `${typ} · ${jt.toFixed(2)} m`,
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
  rohFlaechen.forEach((f) => f.punkte.forEach((pt) => {
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
    flaechen: rohFlaechen, linien, marken, masse, bauteiltitel,
    vektoren, lastflaechen,
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
