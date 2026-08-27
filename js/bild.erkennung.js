/**
 * bild.erkennung.js
 * ---------------------------------------------------------------------------
 * MASTEN UND JOCH IN EINER QUERPROFIL-ZEICHNUNG FINDEN.
 *
 * Das Einmessen kostet zwei Klicks. Das ist wenig — aber es ist zweimal
 * zielen, und beim zwanzigsten Tragwerk eines Projekts ist es vierzigmal.
 * Diese Datei sucht die beiden Punkte selbst.
 *
 * >>> SIE SCHLÄGT VOR, SIE ENTSCHEIDET NICHT. <<<
 *
 * Eine Zeichnung ist kein Datensatz: was auf ihr steht, steht dort für einen
 * Menschen. Jede Erkennung ist deshalb eine Vermutung, und eine Vermutung,
 * die sich als Messung ausgibt, ist schlimmer als gar keine. Das Ergebnis
 * trägt sein Zutrauen bei sich, und die zwei Klicks bleiben immer erreichbar.
 *
 * WORAN MAN EIN TRAGWERK ERKENNT
 *
 * Ein Querprofil zeigt Gleise, Lichtraumprofile, Bemassung, Schriftfeld — und
 * darüber ein Joch auf zwei Masten. Die Masten sind die LÄNGSTEN SENKRECHTEN
 * Striche des Blattes: sie laufen vom Joch bis zum Fundament, über die halbe
 * Blatthöhe. Nichts sonst auf einem Querprofil ist so lang und so senkrecht —
 * ein Lichtraumprofil ist rund, eine Bemassungslinie kurz, ein Schriftfeld
 * flach.
 *
 * Zwischen den beiden Masten liegt das Joch: die Zeile mit der meisten Tinte
 * in dem Streifen, den sie aufspannen.
 *
 * Damit sind die beiden Punkte gefunden, die das Einmessen braucht — die
 * Mastachsen auf Höhe der Jochachse, also x = 0 und x = L.
 *
 * GERECHNET WIRD AUF EINER MASKE, nicht auf Farben. Was die Maske für dunkel
 * hält, entscheidet der Aufrufer; hier steht nur die Geometrie. Damit ist die
 * Erkennung im Prüfstand nachrechenbar, ohne Browser und ohne Bild.
 * ---------------------------------------------------------------------------
 */

/**
 * Wie lang der längste senkrechte Strich je Spalte ist.
 *
 * Ein einzelner Ausreisser soll nicht zählen: kurze Unterbrechungen — eine
 * Bemassungslinie, die den Masten kreuzt, ein weisser Punkt in der Rasterung —
 * werden überbrückt. Ohne das zerfiele ein Mast in ein Dutzend Stücke.
 */
export function senkrechteLaeufe(maske, breite, hoehe, luecke = 3) {
  const laenge = new Int32Array(breite);
  // WO der Lauf beginnt, ist die wichtigere Hälfte: dort sitzt der Mastkopf,
  // und damit das Joch. Ohne diese Angabe müsste die Jochachse auf dem
  // ganzen Blatt gesucht werden - und der Blattrahmen läuft ebenso durch wie
  // ein Gurt.
  const oben = new Int32Array(breite).fill(-1);
  for (let x = 0; x < breite; x++) {
    let best = 0, bestOben = -1, lauf = 0, leer = 0, anfang = -1;
    for (let y = 0; y < hoehe; y++) {
      if (maske[y * breite + x]) {
        if (lauf === 0) anfang = y;
        lauf += leer + 1; leer = 0;
        if (lauf > best) { best = lauf; bestOben = anfang; }
      } else if (lauf > 0) {
        leer++;
        if (leer > luecke) { lauf = 0; leer = 0; anfang = -1; }
      }
    }
    laenge[x] = best; oben[x] = bestOben;
  }
  return { laenge, oben };
}

/**
 * DIE ZWEI MASTEN.
 *
 * Gesucht sind zwei Spaltengruppen mit langen senkrechten Läufen, weit
 * auseinander. «Weit» heisst: mindestens ein Viertel der Blattbreite — näher
 * beieinander wäre es kein Joch, sondern zweimal derselbe Mast.
 *
 * DIE BLATTKANTE IST KEIN MAST. Ein Rahmen läuft über die ganze Höhe und
 * schlüge jeden Masten; die äussersten Prozente des Blattes bleiben deshalb
 * aussen vor. Aus demselben Grund zählt nur, was über MEHRERE Spalten dick
 * ist: ein Mastprofil ist breit, eine Rahmenlinie ein Strich.
 */
export function findeMasten(maske, breite, hoehe, o = {}) {
  const rand = Math.round(breite * (o.rand ?? 0.02));
  const mindestLauf = hoehe * (o.mindestHoehe ?? 0.25);
  const mindestAbstand = breite * (o.mindestAbstand ?? 0.25);
  const { laenge: laeufe, oben: obenVon } = senkrechteLaeufe(maske, breite, hoehe,
                                                             o.luecke ?? 3);

  // Zusammenhängende Spaltengruppen, in denen der Lauf lang genug ist.
  const gruppen = [];
  let start = -1;
  for (let x = rand; x < breite - rand; x++) {
    const gut = laeufe[x] >= mindestLauf;
    if (gut && start < 0) start = x;
    if ((!gut || x === breite - rand - 1) && start >= 0) {
      const bis = gut ? x : x - 1;
      let hoch = 0, kopf = hoehe, fuss = 0;
      for (let i = start; i <= bis; i++) {
        hoch = Math.max(hoch, laeufe[i]);
        if (obenVon[i] >= 0) {
          kopf = Math.min(kopf, obenVon[i]);
          fuss = Math.max(fuss, obenVon[i] + laeufe[i] - 1);
        }
      }
      gruppen.push({ von: start, bis, mitte: (start + bis) / 2,
                     dicke: bis - start + 1, hoehe: hoch, kopf, fuss });
      start = -1;
    }
  }
  // Ein Strich ist kein Profil: mindestens zwei Spalten dick.
  const echte = gruppen.filter((g) => g.dicke >= (o.mindestDicke ?? 2));
  if (echte.length < 2) return null;

  // Die beiden HÖCHSTEN, die weit genug auseinanderliegen. Nach Höhe
  // sortiert, dann das erste Paar, das den Abstand einhält - so gewinnt
  // nicht ein zufälliges Paar am Blattrand.
  const nachHoehe = [...echte].sort((a, b) => b.hoehe - a.hoehe);
  for (let i = 0; i < nachHoehe.length; i++) {
    for (let j = i + 1; j < nachHoehe.length; j++) {
      const a = nachHoehe[i], b = nachHoehe[j];
      if (Math.abs(a.mitte - b.mitte) < mindestAbstand) continue;
      const links = a.mitte < b.mitte ? a : b;
      const rechts = a.mitte < b.mitte ? b : a;
      return { links, rechts,
               // Zutrauen: wie deutlich sich die beiden vom Rest abheben.
               // Gibt es einen dritten, fast ebenso hohen Strich, ist die
               // Sache nicht eindeutig - und das soll man sehen.
               guete: dritterAbstand(nachHoehe, links, rechts) };
    }
  }
  return null;
}

/** Wie deutlich sich die beiden Gewählten vom nächsten Bewerber abheben (0…1). */
function dritterAbstand(nachHoehe, links, rechts) {
  const dritter = nachHoehe.find((g) => g !== links && g !== rechts);
  if (!dritter) return 1;
  const kleiner = Math.min(links.hoehe, rechts.hoehe);
  if (!(kleiner > 0)) return 0;
  return Math.max(0, Math.min(1, (kleiner - dritter.hoehe) / kleiner));
}

/**
 * DIE JOCHACHSE, zwischen den beiden Masten.
 *
 * Gesucht ist die Zeile mit der meisten Tinte in dem Streifen, den die Masten
 * aufspannen. Das Joch ist dort das breiteste waagrechte Gebilde — es läuft
 * von einem Masten zum anderen, und nichts sonst tut das.
 *
 * DIE MASSKETTE STEHT DARÜBER und ist ebenfalls eine lange Waagrechte. Sie
 * ist aber DÜNN: eine Linie, keine zwei Gurte mit Füllstäben. Gewertet wird
 * deshalb ein FENSTER von mehreren Zeilen — über die Höhe eines Jochs
 * gemittelt gewinnt das Joch, über eine einzelne Zeile könnte die Masskette
 * gleichziehen.
 */
export function findeJochachse(maske, breite, hoehe, vonX, bisX, o = {}) {
  const a = Math.max(0, Math.round(Math.min(vonX, bisX)));
  const b = Math.min(breite - 1, Math.round(Math.max(vonX, bisX)));
  if (b - a < 2) return null;
  const streifen = b - a + 1;
  const tinte = new Int32Array(hoehe);
  for (let y = 0; y < hoehe; y++) {
    let n = 0;
    for (let x = a; x <= b; x++) if (maske[y * breite + x]) n++;
    tinte[y] = n;
  }

  /*
   * GESUCHT WIRD AUF DER LÄNGE DER MASTEN, nicht auf dem ganzen Blatt.
   *
   * Ein Blattrahmen läuft ebenso durch wie ein Gurt und schlägt ihn an Tinte
   * - am nachgebauten Querprofil gemessen, und das Ergebnis war die
   * Blattkante statt des Jochs. Der Rahmen steht aber ausserhalb der Masten:
   * seine obere Kante über ihren Köpfen, seine untere unter ihren Füssen.
   * Dasselbe gilt für eine Masskette über dem Tragwerk und für das
   * Schriftfeld darunter.
   *
   * DER MASTKOPF ALLEIN GENÜGT NICHT. Er war der erste Anker - bis ein
   * Querprofil kam, dessen Masten ÜBER das Joch hinauslaufen: oben tragen
   * sie je eine Traverse mit einem Einzelleiter. Die Erkennung fand die
   * Traverse. Das Joch sitzt eben nicht zwingend auf den Masten, es hängt
   * irgendwo auf ihrer Länge - und genau die ist der Suchbereich.
   */
  const vonY = Math.max(0, Math.round(o.kopf ?? 0));
  const bisY = Math.min(hoehe - 1, Math.round(o.fuss ?? (hoehe - 1)));
  if (bisY - vonY < 2) return null;

  /*
   * DAS JOCH IST DAS TINTENREICHSTE DURCHLAUFENDE GEBILDE.
   *
   * Zwischen den Masten spannt vieles: eine Traverse ein Zehntel des
   * Streifens, ein Lichtraumprofil ein Viertel, eine strichpunktierte
   * Terrainlinie gut die Hälfte. Nur das Joch spannt ihn GANZ, und es tut es
   * zweimal - Ober- und Untergurt - mit Füllstäben dazwischen.
   *
   * Gewertet wird deshalb nicht die stärkste ZEILE, sondern das stärkste
   * BAND. Die stärkste Zeile allein wäre trügerisch: eine Masskette ist eine
   * volle Zeile wie ein Gurt. Ihr Band bleibt aber dünn, während das des
   * Jochs über beide Gurte reicht - und das trägt zehnmal so viel Tinte.
   */
  let stark = vonY;
  for (let y = vonY; y <= bisY; y++) if (tinte[y] > tinte[stark]) stark = y;
  if (!(tinte[stark] > 0)) return null;

  /*
   * DIE SCHWELLE MUSS DIE FÜLLSTÄBE MITNEHMEN.
   *
   * Zwischen den beiden Gurten steht nicht nichts, aber auch nicht viel:
   * am nachgebauten Joch tragen die Füllstäbe rund 5 % der Tinte eines
   * Gurtes. Mit 12 % blieb das Band am Obergurt hängen und die «Achse» lag
   * auf ihm statt zwischen den Gurten. Drei Prozent nehmen die Stäbe mit.
   */
  const schwelle = Math.max(1, tinte[stark] * (o.bandAnteil ?? 0.03));
  const luecke = Math.max(2, Math.round(hoehe * (o.bandLuecke ?? 0.004)));
  const bandUm = (mitte) => {
    const waechst = (richtung) => {
      let y = mitte, leer = 0, letzt = mitte;
      while (y >= vonY && y <= bisY) {
        if (tinte[y] >= schwelle) { letzt = y; leer = 0; } else if (++leer > luecke) break;
        y += richtung;
      }
      return letzt;
    };
    return { von: waechst(-1), bis: waechst(+1) };
  };

  /*
   * Bewerber sind alle Zeilen, die den Streifen zur Hälfte füllen - alles
   * darunter ist ein Anbauteil, kein durchlaufendes Bauteil. Jede spannt ihr
   * Band auf; gewonnen hat das mit der meisten Tinte. Mehrere Zeilen desselben
   * Bandes führen zum selben Ergebnis, das kostet nur Rechnung.
   */
  const mindest = tinte[stark] * (o.zeileAnteil ?? 0.5);
  let oben = null, unten = null, beste = -1;
  for (let y = vonY; y <= bisY; y++) {
    if (tinte[y] < mindest) continue;
    const b = bandUm(y);
    if (oben !== null && b.von === oben && b.bis === unten) continue;
    let ink = 0;
    for (let i = b.von; i <= b.bis; i++) ink += tinte[i];
    if (ink > beste) { beste = ink; oben = b.von; unten = b.bis; }
  }
  if (oben === null) return null;
  // Die Zeile, an der das gewählte Band sein Zutrauen misst.
  let spitze = oben;
  for (let y = oben; y <= unten; y++) if (tinte[y] > tinte[spitze]) spitze = y;

  // Die Achse ist der Schwerpunkt des Bandes: bei ungleich schweren Gurten
  // trifft er die Mitte besser als das blosse Mittel der Grenzen.
  let summe = 0, gewicht = 0, hoehePx = 0;
  for (let y = oben; y <= unten; y++) {
    summe += tinte[y] * y; gewicht += tinte[y];
    if (tinte[y] >= schwelle) hoehePx++;
  }
  if (!(gewicht > 0)) return null;
  return {
    y: summe / gewicht, von: oben, bis: unten, tinte: gewicht,
    /*
     * ZUTRAUEN: LÄUFT DAS BAND WIRKLICH DURCH?
     *
     * Ein Joch reicht von einem Masten zum anderen; sein stärkster Gurt
     * füllt den Streifen fast ganz. Ein zufälliger Treffer - eine
     * Bemassungslinie, ein Stück Lichtraumprofil - füllt ihn nicht.
     */
    guete: Math.max(0, Math.min(1, tinte[spitze] / streifen)),
    bandhoehe: hoehePx,
  };
}

/**
 * Beides zusammen: die zwei Punkte, die das Einmessen braucht.
 *
 * @returns {{p1:{px,py}, p2:{px,py}, guete:number}|null}
 */
export function erkenneTragwerk(maske, breite, hoehe, o = {}) {
  const m = findeMasten(maske, breite, hoehe, o);
  if (!m) return null;
  // Der höhere der beiden Mastköpfe ist der Anker: das Joch liegt dort, wo
  // beide Masten enden. Bei ungleich hohen Masten (das ist der Normalfall)
  // ist es der obere.
  // Die Masten spannen den Suchbereich auf: vom oberen Kopf bis zum tieferen
  // Fuss. Was darüber oder darunter durchläuft, gehört nicht zum Tragwerk.
  const kopf = Math.min(m.links.kopf, m.rechts.kopf);
  const fuss = Math.max(m.links.fuss, m.rechts.fuss);
  const j = findeJochachse(maske, breite, hoehe, m.links.mitte, m.rechts.mitte,
                           { ...o, kopf, fuss });
  if (!j) return null;
  return {
    p1: { px: m.links.mitte, py: j.y },
    p2: { px: m.rechts.mitte, py: j.y },
    // Das schwächste Glied bestimmt das Ergebnis: zwei gute Masten mit einer
    // fraglichen Jochachse sind kein gutes Ergebnis.
    guete: Math.min(m.guete, j.guete),
    masten: { links: m.links.mitte, rechts: m.rechts.mitte },
    jochY: j.y,
  };
}

/**
 * Aus Bilddaten eine Maske: dunkel oder nicht.
 *
 * Die Schwelle liegt bei 160 von 255 und meint die WAHRGENOMMENE Helligkeit.
 * Damit zählt auch ROT als dunkel — auf einem Querprofil ist das Neue rot
 * gezeichnet, und der Mast, den man sucht, ist oft genau das. Reines Rot hat
 * eine Helligkeit von 76: deutlich unter der Schwelle, obwohl sein Rotkanal
 * voll ausgesteuert ist. Wer nur den Rotkanal prüfte, sähe es als hell.
 */
export function maskeAusBild(daten, breite, hoehe, schwelle = 160) {
  const maske = new Uint8Array(breite * hoehe);
  for (let i = 0, p = 0; i < maske.length; i++, p += 4) {
    const hell = 0.2126 * daten[p] + 0.7152 * daten[p + 1] + 0.0722 * daten[p + 2];
    // Durchsichtiges zählt als hell: ein PNG mit freigestelltem Rand hätte
    // sonst einen schwarzen Rahmen.
    maske[i] = (daten[p + 3] > 128 && hell < schwelle) ? 1 : 0;
  }
  return maske;
}
