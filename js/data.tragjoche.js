/**
 * data.tragjoche.js
 * ---------------------------------------------------------------------------
 * ZUGRIFF auf die Typendatenbank. Die DATEN selbst stehen in
 * data/tragjoche.json und werden dort gepflegt - dieses Modul enthält nur
 * Ladelogik und Auswertung, keine Zahlenwerte.
 *
 * Laden:
 *   - Modulversion (serve.py): die JSON-Datei wird per fetch gelesen
 *   - Gebündelte Datei: build_html.py legt die JSON in ein
 *     <script type="application/json" id="tragjoch-db"> im HTML
 *   - Node/Tests: setzeDatenbank(obj) vor der ersten Benutzung aufrufen
 *
 * BEZEICHNUNGEN DER ZEICHNUNG siehe data/tragjoche.json (_masskonventionen).
 * Kurz: jd / jba / jbb sind AUSSENMASSE, ja der liegende Schenkel.
 * Die Blechlängen der Stücklisten bestätigen das Modell:
 *      Vertikalblech  laenge = jd  - aV_OG - aV_UG
 *      Horizontalblech laenge = jbb - 2*ja   (Feld)   bzw. jba - 2*ja (Auflager)
 * Die lichte Auflagerbreite ist bauweisenabhängig: 340 mm im heutigen
 * Sortiment, 280 mm in der Altbauweise.
 *
 * ZWEI BAUWEISEN
 *   'neu'  durchgehend gleiche Bauhöhe
 *   'alt'  die Bauhöhe ist an beiden Enden
 *          VERJÜNGT: der Untergurt steigt vom Knick (3000 mm ab Jochende) zum
 *          Auflager an, bis die beiden Gurtschenkel aufeinanderstossen. Die
 *          Verjüngung steckt im Feld 'voute'.
 * ---------------------------------------------------------------------------
 */

let DB = null;

/** Datenbank direkt setzen (Node, Tests, Bündel). */
export function setzeDatenbank(obj) {
  if (!obj || !Array.isArray(obj.typen)) {
    throw new Error('Typendatenbank ungültig: Feld "typen" fehlt.');
  }
  DB = obj;
  return DB;
}

/** Lädt die Datenbank, falls noch nicht geschehen. */
export async function ladeDatenbank(pfad = 'data/tragjoche.json') {
  if (DB) return DB;
  if (typeof document !== 'undefined') {
    // In der Modulversion steht der Platzhalter leer im HTML; erst der Bündler
    // füllt ihn. Nur einen NICHT LEEREN Block auswerten.
    const eingebettet = document.getElementById('tragjoch-db');
    const roh = eingebettet?.textContent?.trim();
    if (roh) return setzeDatenbank(JSON.parse(roh));
  }
  const antwort = await fetch(pfad);
  if (!antwort.ok) {
    throw new Error(`Typendatenbank ${pfad} nicht ladbar (HTTP ${antwort.status}).`);
  }
  return setzeDatenbank(await antwort.json());
}

function db() {
  if (!DB) throw new Error('Typendatenbank nicht geladen – ladeDatenbank() aufrufen.');
  return DB;
}

/** Die ganze Datenbank – für Prüfstand und Ausleitung. */
export const datenbank = () => db();

/** Alle Typen. */
export function tragjoche() {
  return db().typen;
}

export function getTragjoch(typ) {
  const j = db().typen.find((x) => x.typ === typ);
  if (!j) throw new Error(`Unbekannter Tragjochtyp: ${typ}`);
  return j;
}

/**
 * Mögliche Jochlängen eines Typs nach Sortimentstabelle.
 * Die Tabelle führt die Längen im Raster von 0.5 m; Kurz- und Normlängen
 * werden zusammengefasst und als eine Liste geliefert.
 * @returns {{wert:number, art:'kurz'|'norm'}[]}
 */
export function moeglicheLaengen(joch, raster = 0.5) {
  if (!joch) return [];
  const aus = [];
  const bereich = (b, art) => {
    if (!b) return;
    for (let L = b[0]; L <= b[1] + 1e-9; L += raster) {
      aus.push({ wert: Math.round(L * 100) / 100, art });
    }
  };
  bereich(joch.laengeKurz, 'kurz');
  bereich(joch.laengeNorm, 'norm');
  const gesehen = new Set();
  return aus.filter((e) => (gesehen.has(e.wert) ? false : gesehen.add(e.wert)))
            .sort((a, b) => a.wert - b.wert);
}

/**
 * Zulässiger Längenbereich eines Typs nach Sortimentstabelle.
 * Kurz- und Normlängen zusammengefasst.
 * @returns {{min:number, max:number, text:string}}
 */
export function laengenbereich(joch) {
  if (!joch) return { min: 6, max: 40, text: 'frei' };
  const b = [joch.laengeKurz, joch.laengeNorm].filter(Boolean);
  if (!b.length) return { min: 6, max: 40, text: 'frei' };
  return {
    min: Math.min(...b.map((x) => x[0])),
    max: Math.max(...b.map((x) => x[1])),
    text: b.map((x) => `${x[0]}–${x[1]} m`).join(' / '),
  };
}

/** Nächstgelegene zulässige Länge zu einem Wunschwert. */
export function naechsteLaenge(joch, L) {
  const l = moeglicheLaengen(joch);
  if (!l.length) return L;
  return l.reduce((a, b) => (Math.abs(b.wert - L) < Math.abs(a.wert - L) ? b : a)).wert;
}

/** Regel-Teilung eines Typs [mm]. */
export function teilung(joch) {
  return joch?.teilung ?? 750;
}

/** Bauweise: 'neu' (heutiges Sortiment) oder 'alt' (verjüngte Enden). */
export function bauweise(joch) {
  return joch?.bauweise ?? 'neu';
}

// --- Verjüngte Enden (Voute) ------------------------------------------------

/**
 * Verjüngung eines Typs, oder null bei durchgehender Bauhöhe.
 * Alle Masse in mm, gemessen ab Jochende:
 *   endJd    Bauhöhe am Jochende (Gurtschenkel stossen aufeinander)
 *   gerade   paralleles Endstück
 *   neigung  horizontale Länge der Schräge
 *   knick    gerade + neigung, ab hier volle Bauhöhe jd
 */
export function voute(joch) {
  const v = joch?.voute;
  if (!v || !(v.knick > 0)) return null;
  return { ...v, knick: v.knick ?? (v.gerade + v.neigung) };
}

/**
 * Bauhöhe (Aussenmass) an der Stelle x [m] eines Jochs der Spannweite L [m].
 *
 * Die Schräge läuft linear von der Endhöhe bis zur vollen Bauhöhe. Bei kurzen
 * Jochen würden sich die beiden Vouten überschneiden; sie werden dann
 * proportional gestaucht, damit in Feldmitte gerade die volle Höhe erreicht
 * wird. Die Schemazeichnungen machen es genauso (für J60 8.0 m endet die
 * Schräge bei 2800 statt 3000 mm).
 *
 * @returns {number} Bauhöhe [mm]
 */
export function bauhoeheAn(joch, L, x) {
  const jd = joch?.jd ?? 0;
  const v = voute(joch);
  if (!v) return jd;
  const stauchung = Math.min(1, (L * 1000) / (2 * v.knick));
  const gerade = v.gerade * stauchung;
  const neigung = v.neigung * stauchung;
  const s = Math.min(x, L - x) * 1000;            // Abstand zum näheren Ende
  if (s <= gerade) return v.endJd;
  if (s >= gerade + neigung) return jd;
  return v.endJd + ((jd - v.endJd) * (s - gerade)) / neigung;
}

// --- Grundriss: Breite über die Länge ---------------------------------------

/**
 * Aussenbreite eines Gurts an der Stelle x [m].
 *
 * Der Grundriss ist geknickt: vom Jochende bis jk läuft die Auflagerbreite jba
 * durch, zwischen jk und jkk geht sie linear in die Feldbreite jbb über, ab jkk
 * bleibt sie konstant.
 *
 * Die lichte Weite am Auflager ist bei ALLEN Typen gleich - 340 mm im heutigen
 * Sortiment, 280 mm in der Altbauweise. Das ist die Gabel, mit der das Joch auf
 * den Mast passt; sie muss über alle Typen gleich sein. Im Feld sind die Joche
 * dagegen verschieden breit, und ab J100 ist der Obergurt breiter als der
 * Untergurt (z. B. J130: 660 / 640 mm).
 *
 * @param {object} joch
 * @param {'og'|'ug'} gurt
 * @param {number} L Jochlänge [m]
 * @param {number} x Stelle [m]
 * @returns {number} Aussenbreite [mm]
 */
export function breiteAn(joch, gurt, L, x) {
  const s = joch?.[gurt];
  if (!s) return 0;
  const jba = s.jba, jbb = s.jbb;
  if (jba === jbb) return jbb;
  const jk = joch.jk ?? 0;
  const jkk = joch.jkk ?? (jk + 650);
  if (!(jkk > jk)) return jbb;
  // Bei kurzen Jochen die beiden Übergänge stauchen, damit sie sich nicht
  // überschneiden - wie bei der Verjüngung der Bauhöhe.
  const stauchung = Math.min(1, (L * 1000) / (2 * jkk));
  const a = jk * stauchung, b = jkk * stauchung;
  const d = Math.min(x, L - x) * 1000;             // Abstand zum näheren Ende
  if (d <= a) return jba;
  if (d >= b) return jbb;
  return jba + ((jbb - jba) * (d - a)) / (b - a);
}

/** Hat der Typ einen Knick im Grundriss? */
export function hatGrundrissknick(joch) {
  return Boolean(joch) && (joch.og?.jba !== joch.og?.jbb || joch.ug?.jba !== joch.ug?.jbb);
}

// --- Ausführungen -----------------------------------------------------------

/**
 * Ausführung (Blechstaffelung) eines Typs für eine Spannweite.
 * Die Stücklisten der Altbauweise führen je Längenbereich eine eigene
 * Ausführung. Ohne Treffer gilt die längste; ohne Ausführungsliste (heutiges
 * Sortiment) gibt es nur die eine Staffelung des Typs.
 */
export function ausfuehrungFuer(joch, L) {
  const liste = joch?.ausfuehrungen;
  if (!liste?.length) return null;
  return liste.find((a) => L >= a.l[0] - 1e-9 && L <= a.l[1] + 1e-9)
      ?? liste.reduce((a, b) => (Math.abs(b.l[1] - L) < Math.abs(a.l[1] - L) ? b : a));
}

/**
 * Feldabstände A_1 … A_n einer Jochlänge aus der Mass-Tabelle [m].
 * A_1 ist das Feld in Jochmitte. Ohne Eintrag null - dann teilt der Rechenkern
 * den Bereich zwischen den beiden 750er-Endfeldern gleichmässig.
 */
export function abstaendeFuer(joch, L) {
  const z = masstabelleZeile(L);
  return z?.gueltig ? z.werte.map((mm) => mm / 1000) : null;
}

/**
 * Zeile der Mass-Tabelle zu einer Jochlänge.
 *
 * Die Tabelle ist für alle Typen dieselbe - nachgewiesen durch den Vergleich
 * zweier Schemablätter, deren 32 gemeinsame Zeilen Wert
 * für Wert übereinstimmen. Sie hängt allein von der Jochlänge ab.
 *
 * Drei Zeilen gehen in der Zeichnung nicht auf (26.50, 29.00, 29.50 m). Sie
 * stehen unverändert in der Datenbank, werden aber als NICHT GÜLTIG gemeldet:
 * eine stillschweigende Korrektur wäre eine Änderung der Bauteilgeometrie.
 *
 * @returns {{werte:number[], gueltig:boolean, soll:number, ist:number}|null}
 */
export function masstabelleZeile(L) {
  const t = db()?.masstabelle;
  if (!t?.zeilen || !(L > 0)) return null;
  const werte = t.zeilen[L.toFixed(2)];
  if (!werte) return null;
  const ist = 2 * 750 + 2 * werte.reduce((a, b) => a + b, 0);
  const soll = L * 1000;
  return { werte, soll, ist, gueltig: Math.abs(ist - soll) <= 1 };
}

/** Alle Längen, für die die Tabelle nicht aufgeht. */
export function masstabelleUnschluessig() {
  return db()?.masstabelle?._unschluessig?.zeilen ?? [];
}

/** Hat der Typ eine hinterlegte Mass-Tabelle? */
export function hatMasstabelle(joch) {
  return Boolean(db()?.masstabelle?.zeilen);
}

/** Massgebende Staffelung einer Ebene für eine Spannweite. */
export function staffelungFuer(joch, ebene, L) {
  const a = L === undefined ? null : ausfuehrungFuer(joch, L);
  return a?.staffelung?.[ebene] ?? joch?.staffelung?.[ebene] ?? null;
}

// --- Bindebleche ------------------------------------------------------------

/** Blech einer Ebene über seine Positionsnummer. */
export function blechNachPos(joch, ebene, pos) {
  const liste = joch?.bleche?.[ebene] ?? [];
  return liste.find((b) => b.pos === pos) ?? null;
}

/**
 * Bindeblech an einer Station.
 *
 * Die Staffelung läuft VOM AUFLAGER ZUR FELDMITTE und ist symmetrisch. Für die
 * Station i von insgesamt n Stationen ist der Abstand zum näheren Auflager
 * min(i, n-1-i); damit wird die Staffelungsliste abgelaufen.
 *
 * Ein Eintrag mit "pos": null bedeutet: an dieser Station liegt KEIN Blech.
 * Das kommt in der Altbauweise am verjüngten Ende vor, wo die Gurte bereits
 * aufeinanderstossen.
 *
 * @param {object} joch   Typeneintrag
 * @param {'vertikal'|'horizontal'} ebene
 * @param {number} i      Stationsnummer, 0 = linkes Auflager
 * @param {number} n      Gesamtzahl der Stationen
 * @param {number} [L]    Spannweite [m], wählt die Ausführung der Altbauweise
 * @returns {object|null} Blech mit ergänztem Feld 'stufe'
 */
export function blechAnStation(joch, ebene, i, n, L) {
  const st = staffelungFuer(joch, ebene, L);
  if (!st || !st.length) return null;

  let rest = Math.min(i, n - 1 - i);   // Abstand zum näheren Auflager
  for (let k = 0; k < st.length; k++) {
    const eintrag = st[k];
    const offen = eintrag.anzahl === null || eintrag.anzahl === undefined;
    if (offen || rest < eintrag.anzahl) {
      if (eintrag.pos === null) return null;      // Station ohne Blech
      const b = blechNachPos(joch, ebene, eintrag.pos);
      return b ? { ...b, stufe: k, ebene } : null;
    }
    rest -= eintrag.anzahl;
  }
  const letzte = st[st.length - 1];
  if (letzte.pos === null) return null;
  const b = blechNachPos(joch, ebene, letzte.pos);
  return b ? { ...b, stufe: st.length - 1, ebene } : null;
}

/** Hat der Typ eine auswertbare Blechstaffelung? */
export function hatBleche(joch) {
  return Boolean(joch?.bleche?.vertikal?.length && joch?.staffelung?.vertikal?.length);
}

/**
 * Rechnet die AUSSENMASSE der Zeichnung in die SCHWERPUNKTSABSTÄNDE um.
 *
 * Einbaulage nach Schnitt A-A: liegender Schenkel nach AUSSEN, stehender nach
 * INNEN; die Ferse bildet die Aussenkante oben/unten und die äussere Begrenzung
 * der Vertikalebene.
 *
 *   h_Schwerpunkt = jd  - zsH_OG - zsH_UG
 *   lichte Breite = jbb - 2*ja                       (bzw. jba - 2*ja)
 *   b_Schwerpunkt = lichte Breite + zsV_OG + zsV_UG
 */
export function schwerpunktsabstaende(joch, profOG, profUG, breiteAus = 'jbb') {
  const hT = joch.jd - profOG.zsH * 10 - profUG.zsH * 10;
  const lichtOG = joch.og[breiteAus] - 2 * joch.og.ja;
  const lichtUG = joch.ug[breiteAus] - 2 * joch.ug.ja;
  const bOG = lichtOG + 2 * profOG.zsV * 10;
  const bUG = lichtUG + 2 * profUG.zsV * 10;
  return {
    hT: hT / 1000, bT: (bOG + bUG) / 2 / 1000,
    lichtOG, lichtUG, bOG: bOG / 1000, bUG: bUG / 1000,
  };
}

/**
 * Kontrolliert die Datenbank gegen die geometrischen Zwangsbedingungen der
 * Zeichnung. Läuft beim Start und meldet Eingabefehler in der JSON sofort,
 * statt sie in die Bemessung durchschlagen zu lassen.
 *
 * @param {(name:string)=>object} profilNachName Zugriff auf die Profildatenbank
 * @returns {string[]} Liste der Beanstandungen (leer = alles stimmig)
 */
export function pruefeDatenbank(profilNachName) {
  const fehler = [];
  db().typen.forEach((j) => {
    const p = (n) => {
      try { return profilNachName(n); } catch { return null; }
    };
    const pOG = p(j.og.profil), pUG = p(j.ug.profil);
    if (!pOG) fehler.push(`${j.typ}: Obergurtprofil "${j.og.profil}" nicht in der Profildatenbank.`);
    if (!pUG) fehler.push(`${j.typ}: Untergurtprofil "${j.ug.profil}" nicht in der Profildatenbank.`);
    if (!pOG || !pUG) return;

    if (j.og.ja !== pOG.aH) {
      fehler.push(`${j.typ}: ja OG = ${j.og.ja} mm passt nicht zum Profil ${pOG.name} (aH = ${pOG.aH} mm).`);
    }
    if (j.ug.ja !== pUG.aH) {
      fehler.push(`${j.typ}: ja UG = ${j.ug.ja} mm passt nicht zum Profil ${pUG.name} (aH = ${pUG.aH} mm).`);
    }

    // Lichte Breite am Auflager: 340 mm im heutigen Sortiment, 280 mm alt
    const sollAufl = bauweise(j) === 'alt' ? 280 : 340;
    [['OG', j.og], ['UG', j.ug]].forEach(([g, s]) => {
      const licht = s.jba - 2 * s.ja;
      if (Math.abs(licht - sollAufl) > 0.5) {
        fehler.push(`${j.typ}: jba ${g} ergibt lichte Auflagerbreite ${licht} mm ` +
                    `statt ${sollAufl} mm (Bauweise "${bauweise(j)}").`);
      }
    });

    // Verjüngte Enden
    const v = voute(j);
    if (v) {
      if (Math.abs(v.endJd - (pOG.aV + pUG.aV)) > 0.5) {
        fehler.push(`${j.typ}: Endbauhöhe ${v.endJd} mm passt nicht zu den ` +
                    `Gurtschenkeln (${pOG.aV} + ${pUG.aV} = ${pOG.aV + pUG.aV} mm).`);
      }
      if (Math.abs(v.knick - (v.gerade + v.neigung)) > 0.5) {
        fehler.push(`${j.typ}: Voute – knick ${v.knick} mm ist nicht gerade ` +
                    `${v.gerade} + neigung ${v.neigung} mm.`);
      }
    }

    if (!j.bleche) return;

    // Blechlängen gegen die Geometrie. Vouten-Bleche sind schräg zugeschnitten
    // und tragen ihre eigene Höhe – sie werden nur gegen die volle Bauhöhe
    // nach oben abgegrenzt.
    const sollV = j.jd - pOG.aV - pUG.aV;
    (j.bleche.vertikal ?? []).forEach((b) => {
      if (b.zone === 'voute') {
        if (b.laenge >= sollV) {
          fehler.push(`${j.typ} Pos ${b.pos}: Vouten-Vertikalblech ${b.laenge} mm ` +
                      `ist nicht kleiner als die volle lichte Höhe ${sollV} mm.`);
        }
        return;
      }
      if (Math.abs(b.laenge - sollV) > 0.5) {
        fehler.push(`${j.typ} Pos ${b.pos}: Vertikalblech ${b.laenge} mm, erwartet ` +
                    `${sollV} mm (= jd ${j.jd} − aV,OG ${pOG.aV} − aV,UG ${pUG.aV}).`);
      }
    });
    (j.bleche.horizontal ?? []).forEach((b) => {
      const soll = b.zone === 'auflager' ? j.og.jba - 2 * j.og.ja : j.og.jbb - 2 * j.og.ja;
      if (Math.abs(b.laenge - soll) > 0.5) {
        fehler.push(`${j.typ} Pos ${b.pos}: Horizontalblech ${b.laenge} mm, erwartet ` +
                    `${soll} mm (Zone "${b.zone}").`);
      }
    });

    // Staffelung muss auf vorhandene Positionen zeigen - auch die je Ausführung
    const staffelungen = [
      { bez: 'Typ', st: j.staffelung },
      ...(j.ausfuehrungen ?? []).map((a) => ({ bez: `Ausführung ${a.bez}`, st: a.staffelung })),
    ];
    staffelungen.forEach(({ bez, st: alle }) => {
      ['vertikal', 'horizontal'].forEach((ebene) => {
        const st = alle?.[ebene] ?? [];
        st.forEach((s) => {
          if (s.pos !== null && !blechNachPos(j, ebene, s.pos)) {
            fehler.push(`${j.typ} (${bez}): Staffelung ${ebene} verweist auf ` +
                        `Pos ${s.pos}, die es nicht gibt.`);
          }
        });
        if (st.length && st[st.length - 1].anzahl !== null) {
          fehler.push(`${j.typ} (${bez}): Staffelung ${ebene} – der letzte Eintrag ` +
                      `muss "anzahl": null haben (füllt den Rest bis Feldmitte).`);
        }
      });
    });

    // Längenbereich muss von den Ausführungen lückenlos abgedeckt sein
    (j.ausfuehrungen ?? []).forEach((a, k, alle) => {
      if (k === 0) return;
      const luecke = a.l[0] - alle[k - 1].l[1];
      if (luecke > 0.51) {
        fehler.push(`${j.typ}: zwischen Ausführung ${alle[k - 1].bez} (bis ` +
                    `${alle[k - 1].l[1]} m) und ${a.bez} (ab ${a.l[0]} m) klafft eine Lücke.`);
      }
    });
  });
  return fehler;
}

/** Zusammenfassung des Pflegezustands, für die Anzeige im Werkzeug. */
export function datenbankStand() {
  const d = db();
  return {
    version: d._version, stand: d._stand,
    typen: d.typen.length,
    ohneBleche: d.typen.filter((j) => !hatBleche(j)).map((j) => j.typ),
    staffelungUngeprueft: d.typen.filter((j) => hatBleche(j) && !j.staffelung_geprueft).map((j) => j.typ),
    masstabelle: Object.keys(d.masstabelle?.zeilen ?? {}).length,
    masstabelleUnschluessig: masstabelleUnschluessig(),
  };
}
