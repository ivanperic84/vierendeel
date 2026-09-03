/**
 * export.axisvm.abfang.js
 * ---------------------------------------------------------------------------
 * DAS ABFANGJOCH ALS STABMODELL FÜR AxisVM.
 *
 * `export.axisvm.js` baut das Tragjoch: vier Winkelgurte, zwei Blechebenen,
 * ein Rahmen, der SENKRECHT steht. Das Abfangjoch ist ein anderes Tragwerk —
 * zwei Walzgurte nebeneinander, Bindebleche oben und unten, und der Rahmen
 * LIEGT. Es hier eigens zu bauen ist billiger, als den Jochexport um eine
 * zweite Bauart zu erweitern, die mit seiner nichts teilt ausser dem Format.
 *
 * ======================= DIE ACHSEN =======================================
 *
 *      x   Jochachse, quer zum Gleis — die Trägerachse
 *      y   Gleisrichtung — hier stehen die beiden Gurte nebeneinander
 *      z   lotrecht
 *
 * Damit liegt die Rahmenebene waagrecht (xy), und der Leiterzug wirkt in y:
 * er biegt den Träger in seiner Rahmenebene. Das Eigengewicht wirkt in z,
 * quer dazu.
 *
 * >>> DIE GURTE STEHEN AUFRECHT, MIT DER OEFFNUNG NACH AUSSEN. <<<
 *
 * Ihr Steg ist senkrecht und liegt INNEN, die Flansche zeigen nach aussen —
 * so steht es im Schnitt A-A, und die Gegenprobe geht auf: d/2 + b = k/2.
 * Hier stand zuerst das Gegenteil («Flansche zur Trägermitte»); das ergab
 * einen Hebelarm, der bei A160 siebzehn Prozent zu gross war.
 *
 * Damit ist ihre STARKE Achse waagrecht — sie trägt das Eigengewicht — und
 * ihre SCHWACHE liegt in der Rahmenebene, wo der Vierendeel-Verband wirkt.
 * Genau die Zuordnung, mit der auch der Kern rechnet.
 *
 * >>> UND DIE BLECHE LIEGEN AUF DEN FLANSCHEN, OBEN UND UNTEN. <<<
 *
 * Nicht mittig zwischen den Gurten. Zwei Bleche auf verschiedenen Höhen
 * bilden mit den Gurten einen KASTEN und tragen Torsion; ein mittiger
 * Riegel tut das nicht. Angeschlossen sind sie über starre Arme von der
 * Gurtschwerachse zur Flanschmitte — dort und nur dort stimmen die
 * Trägheitsmomente des Gurtstabs.
 *
 * >>> DIESES MODELL RECHNET NOCH NICHT. <<<
 *
 * Der Lauf vom 3. September gab Rueckgabe 0 und null Ergebnisfaelle; die
 * Fassung mit EINEM mittigen Riegel gab 1 und fünf. Die sechzig starren Arme
 * sind der Verdacht — als Mechanismus oder als numerisch schlecht
 * konditioniertes System. Zu prüfen ist zuerst, ob die Blechknoten wirklich
 * gehalten sind: die Auflager sitzen an den Gurtknoten auf z = 0, die
 * Blechebenen hängen allein an den Armen.
 *
 * ======================= WAS DIESES MODELL PRÜFEN SOLL ====================
 *
 * PyNite zeigt: der Kern überschätzt die Gurtkraft um rund 40 % und
 * unterschätzt die örtliche Biegung um Faktor 5. Ob das am Rechenweg liegt
 * oder an meinem PyNite-Ersatzmodell, entscheidet sich hier — dieses Modell
 * bildet ab, was dort fehlte: die Endverstärkung und die Endbleche als das,
 * was sie sind.
 * ---------------------------------------------------------------------------
 */

import { getAbfangjoch, abfangAufbau, abfangBindeblech,
         abfangEndverstaerkung, abfangQuersteife } from './data.abfangjoche.js';
import { abfangQuerschnitt, abfangBlechstationen,
         abfangStuetzweite } from './core.abfangjoch.js';
import { getGurtprofil } from './data.profiles.js';

/** Ausrundungsradius je Profilreihe [mm] — aus dem Katalog des Profils. */
const RADIUS = { 'UPE 160': 10, 'UPE 200': 11, 'UPE 240': 12,
                 'IPE 240': 15, 'IPE 270': 15, 'IPE 300': 15,
                 'IPE 330': 18, 'IPE 360': 18 };

/**
 * Das Stabmodell eines Abfangjochs im Austauschformat des Aufbauskripts.
 *
 * @param {string} typ   Abfangjochtyp (A160 … A360)
 * @param {number} jt    Jochlänge [m] — eine GEFÜHRTE Länge
 * @param {object} opt   { Fh: horizontale Abfangkraft [kN], gd, sd }
 */
export function abfangAxisvmModell(typ, jt, opt = {}) {
  const a = getAbfangjoch(typ);
  const auf = abfangAufbau(a);
  const q = abfangQuerschnitt(typ);
  const ein = abfangBlechstationen(typ, jt);
  if (!ein) {
    throw new Error(
      `Abfangjoch ${typ} / ${jt} m: Blecheinteilung nicht erfasst — `
      + 'kein Modell. Ohne sie stünden die Bleche irgendwo.');
  }
  const bl = abfangBindeblech(typ);
  const sw = abfangStuetzweite(typ, jt);
  /*
   * >>> DER TRAEGER IST jt LANG, NICHT js. <<<
   *
   * Hier stand `L = js` als Traegerlaenge, und die Auflager sassen an
   * seinen Enden. Damit fehlte der UEBERSTAND: bei A160 / 9.50 m endete das
   * Modell bei 9.00, waehrend die Blechstationen fuer 9.50 gerechnet waren -
   * das letzte Blech lag 400 statt 900 mm vom Ende, und das Randfeld links
   * begann am Auflager statt am Jochende.
   *
   * Aufgefallen am 3. September beim Vergleich: der Kern rechnete ein
   * Randfeld von 1.20 m (Auflager bis erstes Blech), das Modell eines von
   * 1.45 m (Jochende bis erstes Blech) - sie verglichen zwei verschiedene
   * Traeger.
   *
   * Richtig: der Traeger laeuft von 0 bis jt, die Auflager sitzen um den
   * Ueberstand ue = (jt - js)/2 eingerueckt, und er kragt an beiden Enden
   * darueber hinaus.
   */
  const js = sw ? sw.bis : jt;
  const ue = Math.max(0, (jt - js) / 2);
  const L = jt;
  const e = q.e / 100;                       // cm -> m, Achsabstand der Gurte

  /*
   * DIE QUERSCHNITTE.
   *
   * Der Gurt als U oder I - vermessen am 3. September: AddC nimmt
   * (h, b, e, tw, R), AddI nimmt (h, b, tw, tf, R). Die Reihenfolge ist
   * NICHT dieselbe, und sie zu vertauschen gäbe ein Profil, das plausibel
   * aussieht und falsch ist.
   */
  const p = q.gurt;
  const istU = p.reihe === 'UPE';
  const querschnitte = [{
    name: 'GURT',
    form: istU ? 'Channel' : 'I',
    parameter: istU
      ? [p.h * 10, p.b * 10, p.tf * 10, p.tw * 10, RADIUS[p.name] ?? 10]
      : [p.h * 10, p.b * 10, p.tw * 10, p.tf * 10, RADIUS[p.name] ?? 15],
    profil: p.name,
    A: p.A / 1e4, Iy: p.Iy / 1e8, Iz: p.Iz / 1e8, It: p.It / 1e8,
  }];
  /*
   * >>> DIE BLECHE LIEGEN FLACH. <<<
   *
   * Weisung vom 3. September: «die bleche sind nicht nur mittig sondern
   * liegen jeweils auf flansch lage oben und unten.» Sie liegen also AUF den
   * Flanschen, nicht hochkant zwischen den Gurten.
   *
   * >>> DIE BREITE STEHT VORN, DIE REFERENZ DREHT SIE. <<<
   *
   * `AddRectangular(h, b)` nimmt h in lokaler z. Beim Tragjoch steht dort
   * die BREITE des Blechs (160 bei einem 160x10), und die Referenz legt die
   * lokale z dorthin, wo die Breite hinsoll - in die Jochachse, `[1,0,0]`.
   *
   * Genau so hier. Erst stand `[t, b]` mit einer z-Referenz nach oben; das
   * gab hochkant stehende Bleche (im Bild gesehen). Der Kommentar in
   * AxisVM_aufbauen.ps1 sagt es seit dem 22. August: «Stuende ein
   * 160x10-Blech hochkant, laege seine Biegesteifigkeit um (160/10)^2
   * daneben - das Modell rechnete klaglos Unsinn.»
   */
  /*
   * >>> DIE BLECHE LIEGEN FLACH - GEPRUEFT AM MODELL. <<<
   *
   * Weisung vom 4. September, nach Blick ins aufgebaute Modell: «die bleche
   * sind stehen anstatt liegend».
   *
   * Hier stand `[m.b, m.t]` mit der Referenz `[1,0,0]` - dieselbe Paarung
   * wie beim Tragjoch, wo sie stimmt. Beim Abfangjoch laeuft der Riegel in
   * y, und die Rechnung ging nur auf, WENN die Referenz greift. Sie tat es
   * nicht, und AxisVM legte seine lokale z in die Vertikalebene: damit
   * stand die 140-mm-Breite senkrecht statt in der Traegerachse.
   *
   * >>> ZWEIMAL DANEBEN, BEIM DRITTEN MAL GEMESSEN. <<<
   *
   * Erst stand `[b, t]` mit der Referenz `[1,0,0]`, dann `[t, b]` mit
   * `[0,0,1]`. Der Auftraggeber hat BEIDE im Modell stehen sehen - und das
   * ist kein Zufall: die zwei Aenderungen heben einander auf, wenn die
   * Referenz die Achsen vertauscht. Zwei Fassungen, dieselbe Lage.
   *
   * Daraus folgt, was die Signatur nicht sagt: `AddRectangular(h, b)` legt
   * h in die lokale y und b in die lokale z, nicht umgekehrt. Mit der
   * Referenz `[0,0,1]` (lokale z senkrecht) gehoert die BREITE nach vorn
   * und die Dicke nach hinten:
   *
   *      parameter [b, t]   mit   lcsZ [0,0,1]     -> liegt flach
   *
   * Weisung vom 4. September: «die liegenden bleche muessen um 90 Grad
   * gekippt werden.»
   */
  const blechQs = (name, m) => ({
    name, form: 'Rectangle', parameter: [m.b, m.t],
    profil: `Flachstahl ${m.b}/${m.t}`,
    A: (m.b * m.t) / 1e6,
    Iy: (m.t * m.b ** 3) / 12 / 1e12,
    Iz: (m.b * m.t ** 3) / 12 / 1e12,
    It: (m.b * m.t ** 3) / 3 / 1e12,
  });
  querschnitte.push(blechQs('BLECH', bl.regel));
  const enden = [bl.endeL, ...(Array.isArray(bl.endeR) ? bl.endeR
    : bl.endeR ? [bl.endeR] : [])].filter(Boolean);
  if (enden.length) querschnitte.push(blechQs('BLECH_ENDE', enden[0]));
  /*
   * >>> DIE QUERSTEIFE IST EIN WALZPROFIL, KEIN BLECH. <<<
   *
   * Ab A240 sitzt an den Grenzen der QV-Bereiche ein Riegel aus Walzprofil
   * statt eines Bindeblechpaares - bei A240 ein IPE 240 x 600, bei den
   * uebrigen das Gurtprofil selbst. Ihn als zwei Flachstaehle zu bauen
   * hiesse, die Steifigkeit zu unterschlagen, die der Steg dazwischen
   * bringt: das I haelt seine beiden Flansche auf Abstand, ein Blechpaar
   * tut das nur ueber die Gurte.
   */
  const qsteife = ein.arten?.some((a2) => a2.art === 'steife'
                                       || a2.art === 'steifeEnde')
    ? getGurtprofil(ein.arten.find((a2) => a2.profil).profil) : null;
  if (qsteife) {
    querschnitte.push({
      name: 'STEIFE', form: 'I',
      parameter: [qsteife.h * 10, qsteife.b * 10,
                  qsteife.tw * 10, qsteife.tf * 10, RADIUS[qsteife.name] ?? 15],
      profil: qsteife.name,
      A: qsteife.A / 1e4, Iy: qsteife.Iy / 1e8,
      Iz: qsteife.Iz / 1e8, It: qsteife.It / 1e8,
    });
  }

  /*
   * DIE KNOTEN. An jeder Blechstation und an beiden Auflagern, je Gurt
   * einer. `V` ist der Gurt in +y, `H` der in -y.
   */
  const xs = [...new Set([0, ue, ...ein.stationen, L - ue, L]
    .map((v) => Math.round(v * 1e6) / 1e6))].sort((u, v) => u - v)
    .filter((v) => v >= -1e-9 && v <= L + 1e-9);
  /*
   * Die beiden Auflagerknoten - nicht mehr die Traegerenden. `iA` und `iB`
   * zeigen auf sie; die Enden bleiben als Knoten stehen, weil der Traeger
   * dort ueberkragt und das Endblech sie verbindet.
   */
  const iA = xs.findIndex((v) => Math.abs(v - ue) < 1e-9);
  const iB = xs.findIndex((v) => Math.abs(v - (L - ue)) < 1e-9);
  /*
   * ===================== DER STEIFE KNOTENBEREICH ========================
   *
   * Weisung vom 3. September: «im bereich der knoten die ueberlagerung der
   * traeger und verbindungsbleche steif ausbilden, achte darauf dass die
   * linienlast durchgeht, wie bei tragjoch.»
   *
   * >>> WARUM ES OHNE DAS NICHT AUFGING. <<<
   *
   * Gemessen am 3. September an A300 / 13.00 m: die Bindebleche trugen im
   * Modell fast nichts (1.3 kN im Mittel), und das Gurtmoment stieg auf
   * 19.7 kNm. Der Grund stand in der Stueckliste: das Regelblech ist
   * 447 mm lang, der Achsabstand der Gurte aber 750. Der Riegel lief im
   * Modell ueber die volle Laenge und war damit um zwei Drittel zu weich -
   * in Wirklichkeit ist er ueber die Gurtbreite hinweg verschweisst.
   *
   * Bei A160 (Blech 280, e = 317) sind es nur 13 %, deshalb fiel es dort
   * nicht auf.
   *
   * DAS TRAGJOCH LOEST ES SEIT LANGEM SO (`blechStab` in
   * export.axisvm.js): «Die Blechlaenge aus dem Sortiment hat Vorrang; sie
   * legt beide steifen Stuecke symmetrisch fest.» Drei Staebe je Riegel -
   * starr, Bauteil, starr.
   *
   * Und der GURT ist ueber die Blechbreite ebenso steif: dort liegt das
   * Blech auf und ist mit ihm verschweisst. Das ist dieselbe Annahme, die
   * `abfangGurtnachweis` als Anschnittminderung (a - b_Bl)/a fuehrt - jetzt
   * steht sie auch im Modell.
   */
  const km = opt.knotenmodell ?? 'anschnitt';
  /*
   * Was an einer Station sitzt: Laenge (fuer die steifen Riegelenden) und
   * Breite in Traegerrichtung (fuer den steifen Gurtabschnitt). Beim Blech
   * sind das l und b des Flachstahls, bei der Steife die Profilhoehe quer
   * und die FLANSCHBREITE laengs - sie liegt in der Traegerachse, weil der
   * Riegel mit senkrechtem Steg steht.
   */
  /*
   * >>> DER RIEGEL REICHT BIS AN DIE STIRNSEITE DER FLANSCHE. <<<
   *
   * Weisung vom 4. September: «sie gehen nicht bis zu den stirnseiten der
   * flansche (gurte)».
   *
   * Hier stand die Bauteillaenge aus der Stueckliste. Bei A160 stimmt sie
   * mit dem lichten Abstand ueberein (Blech 280, d = 280), bei A300 nicht
   * (Blech 447, d = 600) - dort endete der Riegel im Modell 76 mm vor dem
   * Gurt und haette in der Luft angeschweisst werden muessen.
   *
   * Massgebend ist die GEOMETRIE, nicht der Zuschnitt: der Riegel spannt
   * von Flanschstirn zu Flanschstirn, also ueber `d`, den lichten Abstand
   * der Gurte. Was von der Gurtachse bis dorthin liegt, ist der steife
   * Bereich - beim IPE die halbe Flanschbreite, beim UPE der Abstand e_y
   * zwischen Schwerachse und Stegruecken.
   *
   * Probe: A300  e 750 - d 600 = 150 = b(IPE 300) ✓
   *        A160  e 316.8 - d 280 = 36.8 = 2·e_y(UPE 160) ✓
   */
  const lichteWeite = auf.d ?? 0;               // mm
  /*
   * =================== DIE GABEL AM JOCHENDE ==============================
   *
   * Weisung vom 4. September: «was noch fehlt ist die profilaufdoppelung
   * (ueber eine laenge von 660 mm) bei der langen gabel 1450mm. achte dabei
   * dass die schwerelinie versetzt ist, da der gurt durchlaeuft und die
   * aufdoppelung aussen angeschweisst ist.» - «ja versatz sauber
   * modellieren.»
   *
   * >>> ZWEI PROFILE, ZWEI ACHSEN, STARR GEKOPPELT. <<<
   *
   * Der Schnitt A-A zeigt es: Pos 1 (Gurt) laeuft durch, Pos 2 (Verstaerkung,
   * dasselbe UPE) sitzt AUSSEN, ihr Steg an den Flanschspitzen des Gurtes.
   * Beide oeffnen in dieselbe Richtung, ihre Schwerachsen liegen deshalb um
   * genau eine Flanschbreite `b` auseinander.
   *
   * Den Verbund als EINEN Stab mit gemittelten Kennwerten zu bauen waere
   * bequem und falsch: seine Achse laege 3.5 cm weiter aussen als die des
   * Gurtes, und der Uebergang dorthin waere ein Sprung, den niemand sieht.
   * Gebaut wird deshalb, was dasteht - zwei Staebe auf ihren eigenen Achsen,
   * an den Knoten starr verbunden. Der Verbund und sein Versatz stellen sich
   * dann von selbst ein.
   *
   * Nur die GABEL (A160 bis A240). Ab A270 tritt an ihre Stelle ein
   * Deckblech, und das ist ein anderes Bauteil - es fehlt hier noch.
   */
  const verst = abfangEndverstaerkung(typ);
  const gabel = verst?.art === 'gabel' ? verst.teile[0] : null;
  const gBereiche = [];
  if (gabel?.beginn > 0 && gabel?.laenge > 0) {
    const v0 = gabel.beginn / 1000;
    const v1 = (gabel.beginn + gabel.laenge) / 1000;
    gBereiche.push([v0, v1], [L - v1, L - v0]);
    gBereiche.forEach(([u, o]) => { xs.push(Math.round(u * 1e6) / 1e6,
                                            Math.round(o * 1e6) / 1e6); });
    xs.sort((u, v) => u - v);
    for (let i = xs.length - 1; i > 0; i--) {
      if (Math.abs(xs[i] - xs[i - 1]) < 1e-9) xs.splice(i, 1);
    }
  }
  /** Ob ein Feld im Bereich der Gabel liegt. */
  const inGabel = (u, o) => gBereiche.some(
    ([a2, b2]) => u >= a2 - 1e-9 && o <= b2 + 1e-9);
  /*
   * >>> IM GURT WIRD NICHTS AUSGESTEIFT. <<<
   *
   * Weisung vom 4. September: «die aussteiffung in den gurten wuerde ich
   * weglassen (graue bereiche), da diese auch die biegung um y
   * beeinflussen.»
   *
   * Hier stand ein steifer Abschnitt ueber die Blechbreite, nach dem
   * Vorbild des Tragjochs. Beim liegenden Traeger trifft das aber zwei
   * Richtungen auf einmal: der Gurt biegt in der Rahmenebene (um z) UND
   * quer dazu unter Eigengewicht und Schnee (um y). Ein steifer Abschnitt
   * verhaertet beide - und die zweite Richtung hat mit dem Knoten nichts zu
   * tun.
   *
   * Der steife Bereich bleibt damit dort, wo er hingehoert: in den ENDEN
   * DER RIEGEL, von der Gurtachse bis an die Flanschstirn. Der Gurt laeuft
   * ununterbrochen durch, und mit ihm die Linienlast.
   *
   * Im NACHWEIS bleibt die Anschnittminderung (a - b_Bl)/a bestehen - sie
   * betrifft allein die Biegung in der Rahmenebene und ist dort eine
   * Absprache, keine Modelleigenschaft.
   */
  const nm = (g, i) => `${g}_${xs[i].toFixed(3)}`;
  /*
   * >>> DREI EBENEN JE GURT. <<<
   *
   * Die SCHWERACHSE trägt den Gurtstab - dort und nur dort stimmen seine
   * Trägheitsmomente. Die Bleche greifen aber am OBER- und UNTERFLANSCH an,
   * um `zf` darüber und darunter. Sie an die Schwerachse zu hängen wäre
   * bequem und falsch: dann läge ihre Ebene in der Trägermitte, und der
   * Kasten, den sie mit den Gurten bilden, entstünde gar nicht.
   *
   * Also eigene Knoten auf Flanschhöhe, starr an den Gurtknoten gekoppelt.
   * `zf` ist die Mitte des Flansches: halbe Profilhöhe minus halbe
   * Flanschdicke.
   */
  const zf = (p.h - p.tf) / 2 / 100;      // cm -> m
  /*
   * >>> KEINE FLANSCHKNOTEN MEHR - EIN STARRKOERPER JE RIEGELENDE. <<<
   *
   * Bis zum 4. September lief der Weg vom Gurt zum Blech ueber ZWEI
   * Starrkoerper hintereinander: erst ein Arm von der Schwerachse auf
   * Flanschhoehe, dann das steife Riegelende bis zum Blechanfang. Dazwischen
   * lag ein Knoten, der damit zu beiden Koerpern gehoerte.
   *
   * Gemessen an A300 / 13.00 m: die Bleche trugen 0.28 kN statt der
   * erwarteten 3.7, waehrend die vier Quersteifen - die OHNE Arm direkt auf
   * der Schwerachse sitzen - 30 kN aufnahmen. Ein Steifigkeitsunterschied
   * von 1.3 kann das nicht erklaeren; eine unterbrochene Kette schon.
   *
   * Der starre Bereich ueberbrueckt jetzt beides in EINEM Stueck: von der
   * Gurtachse (y = ±e/2, z = 0) schraeg zum Blechanfang (y = ∓d/2,
   * z = ±zf). Das ist geometrisch dasselbe und im Modell ein einziger
   * Koerper.
   */
  const knoten = [];
  xs.forEach((x, i) => {
    knoten.push({ name: nm('V', i), x, y: e / 2, z: 0 });
    knoten.push({ name: nm('H', i), x, y: -e / 2, z: 0 });
  });

  /*
   * DIE STÄBE. Gurte längs, Bindebleche quer.
   *
   * `lcsZ` = [0,0,1] lässt den Querschnitt aufrecht stehen: Steg senkrecht,
   * starke Achse waagrecht. Ohne diese Angabe legt AxisVM die lokale Achse
   * nach eigener Regel, und der Gurt läge auf der Seite — mit vertauschten
   * Trägheitsmomenten und einem Ergebnis, dem man es nicht ansieht.
   */
  /*
   * >>> DIE GURTE STEHEN SPIEGELBILDLICH. <<<
   *
   * Weisung vom 4. September: «gurte spiegelsymetrisch auf die jochachse
   * bezogen (c ist gegen aussen offen)».
   *
   * Ein U-Profil laesst sich in AxisVM nicht spiegeln - dieselbe Lage wie
   * beim Tragjoch, wo es der Winkel ist: «beim gleichschenkligen Winkel ist
   * das Spiegelbild eine Drehung um 90 Grad um die Stabachse, und die
   * steuert die Referenzrichtung.» Beim UPE sind es 180 Grad, und die
   * Referenz dreht sie: `[0,0,1]` fuer den einen Gurt, `[0,0,-1]` fuer den
   * anderen. Das UPE ist symmetrisch zu seiner starken Achse, also
   * vertauscht die Drehung nur die Oeffnungsrichtung - genau das, was
   * gebraucht wird.
   *
   * Beim IPE (ab A270) ist sie ohne Wirkung: das Profil ist doppelt
   * symmetrisch, und ein gedrehtes I sieht aus wie ein ungedrehtes.
   */
  const lcsGurt = (g) => (g === 'V' ? [0, 0, 1] : [0, 0, -1]);
  const staebe = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (const g of ['V', 'H']) {
      staebe.push({
        name: `${g}_S${i}`, von: nm(g, i), bis: nm(g, i + 1),
        querschnitt: 'GURT', steifesMaterial: false,
        lcsZ: lcsGurt(g), gelenkAnfang: null, gelenkEnde: null, art: 'stab',
      });
    }
  }
  /*
   * Die Bindebleche stehen quer und liegen FLACH - ihre Dicke misst in z.
   * `lcsZ` = [0,0,1] gilt auch hier; das Rechteck ist mit h = Breite in
   * Trägerrichtung angelegt, und die dreht der Riegel selbst mit.
   */
  /*
   * DIE STARREN ARME von der Schwerachse zum Flansch. Sie tragen nichts
   * eigenes - sie halten den Anschlusspunkt dort, wo er sitzt.
   *
   * >>> ALS STARRKOERPER, NICHT ALS DICKER STAB. <<<
   *
   * Stehende Vorgabe des Auftraggebers, in AxisVM_aufbauen.ps1 seit dem
   * 22. August festgehalten: «die Starrelemente sind in AxisVM auch als
   * solche zu modellieren und nicht als dicke Staebe mit steifem
   * Ersatzquerschnitt». Das Skript baut aus `art: 'starr'` einen
   * RigidBody - er haelt alle sechs Freiheitsgrade und kennt keine
   * Freigabe.
   *
   * Erst standen hier `steifesMaterial: true` UND `art: 'starr'`. Das war
   * beides zugleich und damit gegen die Vorgabe; ein Ersatzquerschnitt mit
   * Faktor 1000 neben neun Meter langen Gurtstaeben ist zudem numerisch
   * schlecht konditioniert - ein Verdacht fuer die Rechnung, die null
   * Ergebnisfaelle lieferte.
   */

  /*
   * >>> ZWEI BLECHE JE STATION, OBEN UND UNTEN. <<<
   *
   * Bisher stand hier EIN Riegel in der Trägermitte, mit der Steifigkeit
   * beider Bleche. Das war die falsche Bauform: zwei Bleche auf
   * verschiedenen Höhen bilden mit den Gurten einen KASTEN und tragen
   * Torsion, ein mittiger Riegel tut das nicht.
   */
  /*
   * DIE GABEL: je Gurt ein zweiter Stab, um `b` weiter aussen, und an jedem
   * Knoten ein starrer Querarm zum Gurt. Der Arm ist kurz (eine
   * Flanschbreite) und traegt nichts eigenes - er haelt die beiden Profile
   * dort zusammen, wo die Schweissnaht sie zusammenhaelt.
   */
  const yv = p.b / 100;                          // cm -> m, eine Flanschbreite
  if (gabel) {
    const nmG = (g, i) => `G${g}_${xs[i].toFixed(3)}`;
    xs.forEach((x, i) => {
      const drin = gBereiche.some(([u, o]) => x >= u - 1e-9 && x <= o + 1e-9);
      if (!drin) return;
      for (const g of ['V', 'H']) {
        const sgn = g === 'V' ? 1 : -1;
        knoten.push({ name: nmG(g, i), x, y: sgn * (e / 2 + yv), z: 0 });
        staebe.push({
          name: `GARM_${g}${i}`, von: nm(g, i), bis: nmG(g, i),
          querschnitt: 'GURT', steifesMaterial: false,
          lcsZ: [0, 0, 1], gelenkAnfang: null, gelenkEnde: null, art: 'starr',
        });
      }
    });
    for (let i = 0; i < xs.length - 1; i++) {
      if (!inGabel(xs[i], xs[i + 1])) continue;
      for (const g of ['V', 'H']) {
        staebe.push({
          name: `GABEL_${g}${i}`, von: nmG(g, i), bis: nmG(g, i + 1),
          querschnitt: 'GURT', steifesMaterial: false,
          lcsZ: lcsGurt(g), gelenkAnfang: null, gelenkEnde: null, art: 'stab',
        });
      }
    }
  }

  /*
   * >>> EIN RIEGEL, DREI STAEBE: STARR - BAUTEIL - STARR. <<<
   *
   * Genau wie `blechStab` beim Tragjoch. Die Laenge aus dem Sortiment legt
   * beide steifen Stuecke symmetrisch fest; fehlt sie, bleibt der Riegel
   * ein einzelner Stab ueber die volle Laenge - dann sagt das Modell mit
   * `knotenbereich: 'schwerachsen'`, dass es Achse zu Achse rechnet.
   *
   * Die steifen Enden sind STARRKOERPER (`art: 'starr'`), nicht dicke
   * Staebe: stehende Vorgabe des Auftraggebers, und beim Tragjoch traegt
   * `blechende` dieselbe Rolle.
   */
  /*
   * EIN RIEGEL: STARR - BAUTEIL - STARR, und die beiden starren Stuecke
   * fuehren von der GURTACHSE zum Bauteilende. `zo` sagt, auf welcher Hoehe
   * das Bauteil liegt: 0 fuer die Quersteife auf der Schwerachse, ±zf fuer
   * die Bleche auf Flanschhoehe.
   */
  const riegel = (name, qsName, i, zo, lmm, lcsZ) => {
    const x = xs[i];
    const halb = (Number(lmm) || 0) / 2000;          // halbe Bauteillaenge [m]
    if (!(km === 'anschnitt' && halb > 0 && halb < e / 2)) {
      staebe.push({ name, von: nm('H', i), bis: nm('V', i),
                    querschnitt: qsName, steifesMaterial: false, lcsZ,
                    gelenkAnfang: null, gelenkEnde: null, art: 'stab' });
      return;
    }
    const na = `${name}_a`, nb2 = `${name}_b`;
    knoten.push({ name: na, x, y: -halb, z: zo },
                { name: nb2, x, y: halb, z: zo });
    staebe.push({ name: `${name}_1`, von: nm('H', i), bis: na,
                  querschnitt: qsName, steifesMaterial: false, lcsZ,
                  gelenkAnfang: null, gelenkEnde: null, art: 'starr' });
    staebe.push({ name: `${name}_2`, von: na, bis: nb2,
                  querschnitt: qsName, steifesMaterial: false, lcsZ,
                  gelenkAnfang: null, gelenkEnde: null, art: 'stab' });
    staebe.push({ name: `${name}_3`, von: nb2, bis: nm('V', i),
                  querschnitt: qsName, steifesMaterial: false, lcsZ,
                  gelenkAnfang: null, gelenkEnde: null, art: 'starr' });
  };

  ein.stationen.forEach((s, k) => {
    const i = xs.indexOf(Math.round(s * 1e6) / 1e6);
    if (i < 0) return;

    /*
     * >>> AN EINER STEIFEN-STATION STEHT EIN RIEGEL, KEIN PAAR. <<<
     *
     * Er sitzt auf der SCHWERACHSE der Gurte (z = 0), nicht auf Flanschhoehe
     * - der Schnitt C-C zeigt ihn ueber die ganze Profilhoehe zwischen die
     * Gurtstege geschweisst, mit R19 ausgeklinkt. Seine Flansche liegen
     * dabei von selbst dort, wo sonst die Bleche liegen.
     *
     * Die Referenz ist `[0,0,1]`, nicht `[1,0,0]` wie beim Blech: der
     * Riegel steht mit SENKRECHTEM Steg. Damit wirkt in der waagrechten
     * Rahmenebene seine schwache Achse - genau so, wie der Nachweis
     * (`abfangSteifennachweis`) sie ansetzt. Stuende er andersherum, waere
     * das Modell um den Faktor Iy/Iz daneben, bei IPE 240 um das
     * Vierzehnfache.
     */
    const art = ein.arten?.[k]?.art;
    if (art === 'steife' || art === 'steifeEnde') {
      riegel(`STEIFE_${k}`, 'STEIFE', i, 0, lichteWeite, [0, 0, 1]);
      return;
    }
    /*
     * >>> DAS ENDBLECH SITZT AN SEINER STATION, NICHT AM TRAEGERENDE. <<<
     *
     * Weisung vom 4. September: «diese letzten stehenden bleche am schluss
     * des traegers sollten nicht sein.»
     *
     * Sie standen dort, weil das Modell die beiden Gurte am Ende koppeln
     * musste - eine Notloesung aus der Zeit, als das Auflager an den
     * Gurtknoten hing. Die Zeichnung kennt sie nicht: das erste Blech sitzt
     * bei R1 vom Jochende (A300: 1390 mm), das letzte bei Re (920 mm), und
     * dazwischen ragt der Traeger frei aus. `abfangBlechstationen` fuehrt
     * beide als 'endeL' und 'endeR' - sie bekommen hier nur den staerkeren
     * Querschnitt, sonst nichts.
     */
    const qsRiegel = (art === 'endeL' || art === 'endeR') && enden.length
      ? 'BLECH_ENDE' : 'BLECH';
    for (const o of ['O', 'U']) {
      riegel(`BL_${o}${k}`, qsRiegel, i, o === 'O' ? zf : -zf,
             lichteWeite, [0, 0, 1]);
    }
  });
  /*
   * >>> AM JOCHENDE STEHT NICHTS MEHR. <<<
   *
   * Hier koppelten zwei Bleche die Gurte an den Traegerenden - «ohne diesen
   * Riegel stuenden sie dort unverbunden nebeneinander», so stand es, und
   * im PyNite-Modell gab das eine Durchbiegung bis zum 19-fachen.
   *
   * Das galt, solange das AUFLAGER an den Gurtknoten hing und die Enden
   * halten musste. Seit ein Punkt je Ende ueber ein Schott an beiden Gurten
   * haengt (Weisung vom 4. September), braucht es dort keinen Riegel mehr -
   * und die Zeichnung zeigt auch keinen: das aeusserste Blech sitzt Re vom
   * Ende, dahinter kragt der Traeger frei aus.
   *
   * Der staerkere Querschnitt der beiden Endbleche wird weiterhin gefuehrt;
   * er sitzt jetzt an den Stationen 'endeL' und 'endeR', wo er hingehoert.
   */
  /*
   * ================= EIN PUNKT JE ENDE, NICHT ZWEI GURTE ==================
   *
   * Weisung vom 4. September: «die gabel gegen ende hin ist offen. nur ueber
   * die auflagerpunkte lagern - spaeter beim masten wie bei den tragjochen
   * vorgehen.»
   *
   * >>> WARUM DAS EINEN UNTERSCHIED MACHT. <<<
   *
   * Beide Gurte einzeln zu halten heisst: das Auflager kann ein KRAEFTEPAAR
   * aufnehmen - ein Gurt drueckt, der andere zieht, und das Ende ist um z
   * eingespannt. Das Bauwerk kann das nicht: die Gabel ist gegen das Ende
   * hin OFFEN, dort verbindet die beiden Gurte nichts mehr. Ein Modell, das
   * dort eine Einspannung annimmt, rechnet ein Joch, das so nicht steht.
   *
   * Genommen wird deshalb EIN Auflagerpunkt je Ende, auf der Jochachse
   * (y = 0), starr an die beiden Gurtknoten gehaengt - dasselbe, was das
   * Tragjoch unter `auflagerModell: 'punkt'` fuehrt. Was spaeter der MAST
   * traegt, kommt wie dort dazu.
   *
   * >>> OFFEN: STARRES SCHOTT ODER LINKELEMENT. <<<
   *
   * Weisung vom 4. September: «man muesste sich noch ueberlegen ob man den
   * uebergang vom auflager zu den beiden gurten mit einem linkelement loesen
   * sollte, so kann man die momentuebertragung (drehsteifigkeit 0)
   * unterbrechen.»
   *
   * Der Punkt trifft: das Schott ist ein Starrkoerper und koppelt die beiden
   * Gurte biegesteif miteinander. Zusammen sind sie damit doch wieder um z
   * eingespannt - dieselbe Wirkung, die zwei getrennte Auflager haetten,
   * nur an einem Knoten gebuendelt. Ein Linkelement mit Drehsteifigkeit
   * null wuerde das aufheben.
   *
   * `opt.auflagerAnschluss` haelt beide Wege auseinander. Vorgabe ist
   * weiterhin 'schott' - die Wahl ist fuer den Nachweis erheblich und
   * gehoert dem Auftraggeber, nicht diesem Modul.
   */
  const anschluss = opt.auflagerAnschluss ?? 'schott';
  const auflager = [];
  [['A', iA], ['B', iB]].forEach(([ende, i]) => {
    const kA = `AUFL_${ende}`;
    knoten.push({ name: kA, x: xs[i], y: 0, z: 0 });
    for (const g of ['V', 'H']) {
      staebe.push({
        name: `SCHOTT_${ende}${g}`, von: kA, bis: nm(g, i),
        querschnitt: 'GURT', steifesMaterial: false,
        lcsZ: [0, 0, 1],
        /*
         * Das Skript baut aus `art: 'link'` ein LinkElement und liest die
         * Steifigkeit je Richtung aus `kraftuebertragung`. Die Kraefte
         * bleiben gehalten, die drei Drehungen sind frei - genau die
         * Unterbrechung, um die es geht.
         */
        gelenkAnfang: anschluss === 'link' ? 'M' : null, gelenkEnde: null,
        art: anschluss === 'link' ? 'link' : 'starr',
        kraftuebertragung: anschluss === 'link'
          ? { x: 'Rigid', y: 'Rigid', z: 'Rigid',
              xx: 'Free', yy: 'Free', zz: 'Free' } : null,
      });
    }
    auflager.push({
      ende, knoten: kA, x: xs[i], modell: 'punkt',
      ux: ende === 'A' ? 'Rigid' : 'Free',
      uy: 'Rigid', uz: 'Rigid',
      fix: 'Rigid',        // Torsion um die Trägerachse gehalten
      fiy: 'Free', fiz: 'Free',
      cFiy_MNm: null, cFiy_kNm: null, cUz_MN: null, cUz_kNm: null,
    });
  });

  /*
   * DIE LASTEN.
   *
   * Der Leiterzug greift IN DER TRÄGERMITTELEBENE an (Weisung) - also auf
   * beide Gurte gleich, keine planmässige Torsion. Er wirkt in y, der
   * Gleisrichtung.
   *
   * Das Eigengewicht als Streckenlast in -z, je Gurt die Hälfte: quer zur
   * Rahmenebene trägt jeder Gurt für sich.
   */
  const Fh = Number(opt.Fh) || 22;              // kN, Regelfall der Abfangung
  const gd = Number(opt.gd ?? (a.gewicht / 100));   // kg/m -> kN/m
  /*
   * >>> DIE MITTE IST EIN ORT, KEIN INDEX. <<<
   *
   * Hier stand `Math.round(n / 2)` - der mittlere KNOTEN der Reihe. Bei
   * ungleichen Feldern trifft der die Traegermitte nicht: bei A160 / 9.50 m
   * sass die Last dadurch bei 5.000 statt bei 4.750, und der Vergleich mass
   * ein lastnahes Moment gegen ein Feldmoment.
   *
   * Genommen wird jetzt der Knoten, der der geometrischen Mitte am
   * naechsten liegt.
   */
  const xM = L / 2;
  let mitte = 0;
  xs.forEach((v, i) => {
    if (Math.abs(v - xM) < Math.abs(xs[mitte] - xM)) mitte = i;
  });
  const punkt = [];
  for (const g of ['V', 'H']) {
    punkt.push({ name: `FH_${g}`, knoten: nm(g, mitte), richtung: 'Y',
                 wert: Fh / 2, lastfall: 'Leiterzug' });
  }
  const strecke = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (const g of ['V', 'H']) {
      strecke.push({ name: `G_${g}${i}`, stab: `${g}_S${i}`, richtung: 'Z',
                     wert: -gd / 2, lastfall: 'G' });
    }
  }

  return {
    format: 'tragjoch-stabmodell',
    version: 1,
    merkmale: ['abfangjoch', 'liegender-vierendeel'],
    erzeugt: new Date().toISOString().slice(0, 19),
    einheiten: { laenge: 'm', parameter: 'mm', kraft: 'kN', moment: 'kNm',
                 drehfeder: 'kNm/rad', flaeche: 'm2', traegheit: 'm4' },
    achsen: 'x Jochachse, y Gleisrichtung, z lotrecht nach oben',
    tragwerk: {
      typ, L: jt, js, ueberstand: ue, e, k: auf.k / 1000,
      art: 'abfangjoch', bauform: 'liegender Vierendeeltraeger',
      gurtprofil: p.name, bleche: ein.anzahl,
      blechlage: ein.randGenau ? 'aus dem Schema' : 'genaehert',
      quersteifen: ein.quersteifen ?? 0,
      knotenbereich: km,
      gabel: gabel ? { profil: gabel.profil, laenge: gabel.laenge,
                       beginn: gabel.beginn, versatz: yv } : null,
      endverstaerkung: abfangEndverstaerkung(typ)?.art ?? 'keine',
    },
    material: { name: 'S235', art: 'Steel', rho: 7850, E: 210000, G: 81000,
                nu: 0.3, alpha: 1.2e-5, fy: 235 },
    materialSteif: { name: 'S235 steif', faktor: 1000 },
    querschnitte, knoten, staebe, auflager,
    lastfaelle: [
      { key: 'G', label: 'Staendig - Joch', art: 'Others' },
      { key: 'Leiterzug', label: 'Leiterzug (Abfangung)', art: 'Others' },
    ],
    kombinationen: [
      { key: 'gk', bez: 'Staendig', art: 'charakteristisch', nachweis: false,
        anteile: [{ lastfall: 'G', faktor: 1 }] },
      { key: 'ULS', bez: 'Tragsicherheit', art: 'Bemessung', nachweis: true,
        anteile: [{ lastfall: 'G', faktor: 1.35 },
                  { lastfall: 'Leiterzug', faktor: 1.5 }] },
    ],
    lasten: { punkt, strecke },
  };
}
