/**
 * data.anker.js
 * ---------------------------------------------------------------------------
 * ZUG-/DRUCKSTÜTZEN UND SEILANKER AM MASTEN.
 *
 * Weisung vom 9. September: «bitte danach die möglichkeit Zuganker oder
 * Drucksützen an den masten zu modelieren. diese sind gelenkig gelagert. …
 * Die Druckstüzen und Zuganker können anhand des bemessungdiagramms
 * nachgewiessen werden.»
 *
 * >>> WAS SIE SIND. <<<
 *
 * Ein schräger Stab vom Masten zu einem eigenen Fundament. Er nimmt dem
 * Masten die waagrechte Kraft ab, die sonst allein sein Fuss halten müsste —
 * und weil er an beiden Enden GELENKIG angeschlossen ist, trägt er nichts
 * als NORMALKRAFT. Ein Pendelstab: keine Biegung, kein Moment.
 *
 * Zwei Bauarten, und der Unterschied ist die Druckseite:
 *
 *   STÜTZE (U12, U14)   zwei U-Profile, gespreizt, verstellbar. Sie trägt
 *                       Zug UND Druck. Ihre Druckkraft ist begrenzt durch
 *                       KNICKEN, also durch ihre eigene Länge.
 *   SEILANKER           ein Rundlitzenseil mit Spannschloss. Es trägt nur
 *                       ZUG; auf Druck hängt es durch und trägt nichts.
 *
 * >>> DER NACHWEIS KOMMT AUS EINEM DIAGRAMM. <<<
 *
 * Das Sortimentsblatt führt die zulässige DRUCKBELASTUNG über die
 * Stützenlänge — eine fallende Kurve je Typ, oben gekappt bei der
 * Querschnittsgrenze, und sie endet an der grössten lieferbaren Länge.
 * Dazwischen wird linear interpoliert; die Stützstellen stehen im halben
 * Meter, und die Kurve ist zwischen ihnen glatt.
 *
 * Auf ZUG ist die Kurve gegenstandslos — ein Zugstab knickt nicht. Dort
 * entscheidet die BEFESTIGUNG: an Ankerplatte und Vorsetzkonsole gilt der
 * grosse Wert, an Ankereisen oder Anschlussbügel der kleinere. Das steht so
 * auf dem Blatt und ist keine Ableitung.
 *
 * >>> ES SIND ZULÄSSIGE KRÄFTE, KEINE BEMESSUNGSWIDERSTÄNDE. <<<
 *
 * Das Blatt sagt «zulässige Druck-Belastung» und «max. … kN». Solche Werte
 * stammen aus dem Verfahren der zulässigen Spannungen und sind mit
 * CHARAKTERISTISCHEN Kräften zu vergleichen, nicht mit Bemessungswerten.
 * Das Werkzeug rechnet sonst durchweg mit Bemessungswerten — welche Kraft
 * hier einzusetzen ist, ist eine Festlegung des Auftraggebers; das Ergebnis
 * benennt sie (`vergleichsbasis`), statt sie stillschweigend zu treffen.
 * ---------------------------------------------------------------------------
 */

let DB = null;

/**
 * Die Datenbank laden - eingebettet oder daneben liegend.
 *
 * Ihr Fehlen ist kein Fehler: wer keinen Anker am Masten hat, braucht sie
 * nicht. Die Typwahl bleibt dann leer und sagt es (`ankerDbDa`).
 */
export async function ladeAnker(pfad = 'data/anker.json') {
  if (DB) return DB;
  if (typeof document !== 'undefined') {
    const eingebettet = document.getElementById('anker-db');
    const roh = eingebettet?.textContent?.trim();
    if (roh) return setzeAnkerDB(JSON.parse(roh));
  }
  try {
    const antwort = await fetch(pfad);
    if (antwort.ok) return setzeAnkerDB(await antwort.json());
  } catch { /* ohne Sortiment weiter */ }
  return null;
}

/** Die Datenbank setzen (aus data/anker.json). */
export function setzeAnkerDB(db) { DB = db; return db; }

/** Ob eine Datenbank geladen ist - die Anwendung läuft auch ohne. */
export const ankerDbDa = () => Boolean(DB?.typen?.length);

/** Alle Typen des Sortiments. */
export function ankerTypen() { return ankerDbDa() ? DB.typen : []; }

export function getAnkerTyp(id) {
  const a = ankerTypen().find((x) => x.id === id);
  if (!a) throw new Error(`Unbekannter Ankertyp: ${id}`);
  return a;
}

/** Trägt dieser Typ auch Druck? Ein Seil tut es nicht. */
export const ankerTraegtDruck = (id) => getAnkerTyp(id).art === 'stuetze';

/**
 * DIE ZULÄSSIGE DRUCKKRAFT EINER STÜTZE [kN].
 *
 * Aus dem Bemessungsdiagramm, linear zwischen den Stützstellen. Zwei Ränder
 * gelten, und beide sind Aussagen des Blattes, nicht Annahmen:
 *
 *   KURZ    unterhalb der Länge, bei der die Kurve die Kappungslinie
 *           schneidet, begrenzt der Querschnitt - die Kurve läuft dort
 *           waagrecht weiter.
 *   LANG    über der grössten lieferbaren Länge gibt es die Stütze nicht.
 *           Dann `null`, nicht ein extrapolierter Wert: die Kurve fortzu-
 *           setzen hiesse, ein Bauteil zu bemessen, das niemand liefert.
 *
 * @returns {number|null} kN, oder null (Seil, oder Länge über dem Sortiment)
 */
export function ankerZulDruck(id, L) {
  const a = getAnkerTyp(id);
  if (a.art !== 'stuetze' || !Number.isFinite(L)) return null;
  const d = a.druck ?? {};
  if (!Array.isArray(d.L) || !Array.isArray(d.N) || d.L.length !== d.N.length) {
    return null;
  }
  if (L > (a.laengeMax ?? Infinity) + 1e-9) return null;
  if (L <= d.L[0]) return d.kappung ?? d.N[0];
  for (let i = 1; i < d.L.length; i += 1) {
    if (L <= d.L[i] + 1e-9) {
      const f = (L - d.L[i - 1]) / (d.L[i] - d.L[i - 1]);
      return d.N[i - 1] + f * (d.N[i] - d.N[i - 1]);
    }
  }
  return d.N[d.N.length - 1];
}

/** Die Befestigungsarten, die die zulässige Zugkraft bestimmen. */
export const ANKER_BEFESTIGUNGEN = [
  { key: 'ankerplatte', label: 'Ankerplatte / Vorsetzkonsole',
    hinweis: 'Fundament mit Ankerplatte und Mast mit Vorsetzkonsole — der '
           + 'grössere zulässige Zug.' },
  { key: 'ankereisen', label: 'Ankereisen / Anschlussbügel',
    hinweis: 'Fundament mit Ankereisen und/oder Mast mit Anschlussbügel — '
           + 'die Befestigung begrenzt, nicht die Stütze.' },
];

/**
 * DIE ZULÄSSIGE ZUGKRAFT [kN].
 *
 * Sie hängt NICHT an der Länge - ein Zugstab knickt nicht -, sondern an der
 * Befestigung an beiden Enden. Beim Seilanker steht sie als zulässige
 * Betriebslast im Blatt; die Bruchkraft ist ein Vielfaches davon und gehört
 * nicht in den Nachweis.
 *
 * @returns {number|null} kN
 */
export function ankerZulZug(id, befestigung = 'ankerplatte') {
  const a = getAnkerTyp(id);
  if (a.art === 'seil') return a.zugBetrieb ?? null;
  const z = a.zug ?? {};
  return z[befestigung] ?? z.ankereisen ?? null;
}

/**
 * DER NACHWEIS EINER STÜTZE ODER EINES ANKERS.
 *
 * @param {string} id    Typ aus dem Sortiment
 * @param {number} N     Normalkraft [kN], DRUCK negativ, ZUG positiv
 * @param {number} L     Länge des Stabes [m]
 * @param {object} opt   {befestigung}
 * @returns {{art, N, L, zul, eta, ok, grund, vergleichsbasis}}
 *          `grund` sagt, WAS begrenzt - das ist die Auskunft, mit der man
 *          einen Typ wechselt: gegen Knicken hilft ein grösserer Typ, gegen
 *          die Befestigung nur eine andere Befestigung.
 */
export function ankerNachweis(id, N, L, opt = {}) {
  const a = getAnkerTyp(id);
  const zug = N >= 0;
  const zul = zug ? ankerZulZug(id, opt.befestigung ?? 'ankerplatte')
                  : ankerZulDruck(id, L);
  /*
   * EIN SEIL AUF DRUCK IST KEIN NACHWEIS, SONDERN EIN FEHLER IM MODELL.
   * Es haengt durch und traegt nichts; wer es auf der Druckseite einsetzt,
   * hat den Stab auf der falschen Seite des Masten. Das wird gemeldet, nicht
   * mit eta = 0 weggerechnet.
   */
  if (!zug && a.art === 'seil') {
    return { art: a.art, typ: id, N, L, zul: 0, eta: Infinity, ok: false,
             grund: 'seilAufDruck',
             text: 'Ein Seilanker trägt keinen Druck — er hängt durch.',
             vergleichsbasis: 'zulaessigeKraft' };
  }
  if (zul === null) {
    return { art: a.art, typ: id, N, L, zul: null, eta: null, ok: null,
             grund: 'ueberSortiment',
             text: `Länge ${L.toFixed(2)} m über der grössten lieferbaren `
                 + `(${(a.laengeMax ?? 0).toFixed(2)} m) — kein Nachweis.`,
             vergleichsbasis: 'zulaessigeKraft' };
  }
  const eta = zul > 0 ? Math.abs(N) / zul : Infinity;
  const gekappt = !zug && L <= (a.druck?.kappungAb ?? 0) + 1e-9;
  return {
    art: a.art, typ: id, N, L, zul, eta, ok: eta <= 1,
    grund: zug ? 'befestigung' : (gekappt ? 'querschnitt' : 'knicken'),
    text: zug
      ? `Zug — zulässig ${zul.toFixed(1)} kN (${opt.befestigung ?? 'ankerplatte'})`
      : `Druck — zulässig ${zul.toFixed(1)} kN bei ${L.toFixed(2)} m`,
    /*
     * WORAUF SICH DAS BEZIEHT. Die Zahlen des Blattes sind ZULAESSIGE
     * KRAEFTE aus dem Verfahren der zulaessigen Spannungen, keine
     * Bemessungswiderstaende. Womit sie zu vergleichen sind, steht hier -
     * damit niemand einen Bemessungswert dagegenhaelt, ohne es zu merken.
     */
    vergleichsbasis: 'zulaessigeKraft',
  };
}

/* ===========================================================================
 * DIE GEOMETRIE AM MASTEN
 * ===========================================================================
 *
 * Der Stab läuft vom Masten schräg hinunter zu einem eigenen Fundament.
 * Beschrieben wird er durch zwei Masse — beide sind das, was auf dem
 * Querprofil steht, und keines davon ist abgeleitet:
 *
 *   h   ANSCHLUSSHÖHE am Masten, über dem Mastfuss
 *   a   ABSTAND des Ankerfundaments vom Mastfuss, waagrecht
 *
 * Daraus folgt alles Übrige: die Länge über Pythagoras, der Winkel gegen die
 * Waagrechte, und die beiden Anteile, mit denen eine Stabkraft am Masten
 * ankommt.
 *
 * >>> DER NEIGUNGSWINKEL IST DIE WICHTIGE ZAHL. <<<
 *
 * Gegen eine waagrechte Kraft wirkt nur der waagrechte Anteil der Stabkraft,
 * also N · cos α. Je STEILER der Stab steht, desto kleiner ist cos α und
 * desto grösser muss N werden, um dieselbe Kraft zu halten — ein steil
 * angesetzter Anker arbeitet gegen sich selbst. Weit vom Masten weg und
 * tief am Masten angeschlossen ist die wirksame Lage; wie weit man gehen
 * kann, sagt die Länge über die Knickkurve.
 * ======================================================================== */

/**
 * Die Geometrie eines Ankers oder einer Stütze.
 *
 * @param {number} h  Anschlusshöhe am Masten [m]
 * @param {number} a  waagrechter Abstand des Fundaments [m]
 * @returns {{h, a, L, alpha, cos, sin}|null}
 *          `alpha` [°] gegen die Waagrechte; `cos`/`sin` die Anteile, mit
 *          denen eine Stabkraft waagrecht bzw. lotrecht wirkt.
 */
export function ankerGeometrie(h, a) {
  const hh = Number(h), aa = Number(a);
  if (!Number.isFinite(hh) || !Number.isFinite(aa)) return null;
  if (hh <= 0 || aa <= 0) return null;
  const L = Math.sqrt(hh * hh + aa * aa);
  return { h: hh, a: aa, L, alpha: (Math.atan2(hh, aa) * 180) / Math.PI,
           cos: aa / L, sin: hh / L };
}

/**
 * DIE STABKRAFT AUS EINER WAAGRECHTEN KRAFT AM ANSCHLUSSPUNKT [kN].
 *
 * Nimmt der Stab die waagrechte Kraft H allein auf, folgt sie aus dem
 * Gleichgewicht am Anschlusspunkt: der waagrechte Anteil der Stabkraft muss
 * H halten, also N = H / cos α.
 *
 * >>> DAS IST DIE OBERE SCHRANKE, NICHT DIE RECHNUNG. <<<
 *
 * Ob der Stab die Kraft WIRKLICH allein aufnimmt, hängt daran, wieviel der
 * eingespannte Mastfuss daneben abträgt — das System ist einfach statisch
 * unbestimmt, und die Aufteilung folgt aus den Steifigkeiten. Solange diese
 * Festlegung nicht getroffen ist, gibt diese Funktion den Wert für «der Stab
 * trägt alles». Er liegt auf der sicheren Seite für den STAB und auf der
 * unsicheren für den MASTFUSS; wer sie benutzt, muss beides wissen.
 */
export function ankerStabkraft(H, geo) {
  if (!geo || !Number.isFinite(H) || !(geo.cos > 0)) return null;
  return H / geo.cos;
}

/**
 * DIE QUERSCHNITTSWERTE EINES ANKERS.
 *
 * Weisung vom 11. September: «die querschnittswerte gemaess c5 szs oder en
 * nachtragen.»
 *
 * >>> SIE STANDEN NIRGENDS. <<<
 *
 * Der Katalog führte die Stütze als «2× UNP 120» — eine Bezeichnung, keine
 * Fläche. UNP-Profile stehen auch nicht im Profilkatalog des Werkzeugs (dort
 * sind die Winkel des Tragjochs und die UPE der Abfangjoche), und der
 * Profilkatalog von AxisVM führt sie unter keinem der naheliegenden Namen.
 * Jetzt stehen sie im Ankerkatalog, mit ihrer Quelle.
 *
 * >>> WAS DER VERBUND HERGIBT, UND WARUM `I_z` EINE FUNKTION IST. <<<
 *
 * `A` und `I_y` sind das Vielfache des Einzelprofils — beide Profile liegen
 * parallel, die starke Achse fällt zusammen. Bei `I_z` ist das anders: die
 * beiden Profile sind GESPREIZT, und zwar keilförmig über die Länge. Damit
 * ist `I_z` keine Zahl, sondern ein Verlauf — der Stab hat einen
 * VERÄNDERLICHEN QUERSCHNITT: `A` bleibt konstant, `I_z` wächst zum weiten
 * Ende hin.
 *
 * Das erklärt zugleich, warum der Nachweis über das Bemessungsdiagramm läuft
 * und nicht aus `A` und `I` gerechnet wird: die Knickkurve des Blattes
 * kennt diesen Verlauf bereits. Aus einem festen `I_z` liesse sich die
 * Kurve gar nicht nachbauen.
 *
 * `querschnitt.Iz` bleibt deshalb `null` — nicht weil das Mass fehlte,
 * sondern weil an dieser Stelle keine einzelne Zahl richtig wäre. Die
 * Geometrie führt `ankerSpreizung`.
 *
 * >>> BEIM SEIL STEHT DIE DEHNUNG IM BLATT, NICHT DIE FLÄCHE. <<<
 *
 * 0.1 mm je Meter und kN heisst E·A = 10 000 kN. Die Ersatzfläche daraus
 * beschreibt das Seil im Stabmodell genauer als eine geschätzte Drahtfläche:
 * gemessen ist die Dehnung, nicht der metallische Querschnitt.
 *
 * @returns {object|null} {profil, anzahl, quelle, A, Iy, Iz, It, …} in
 *          cm, cm², cm⁴ — oder null, wenn der Typ keine führt
 */
export function ankerQuerschnitt(id) {
  const a = typeof id === 'string' ? getAnkerTyp(id) : id;
  return a?.querschnitt ?? null;
}

/* ===========================================================================
 * DAS SPREIZMASS
 * ===========================================================================
 *
 * Weisung vom 11. September: «hier ist ein beispiel der logik für das
 * spreizmass der Druckstüze U12, dises ist auf die restlichen anwendbar. die
 * abstände der beiden enden sind vermasst. diese verlaufen zuerst parallel
 * bis zur ersten vermassung, hier links mit 990 mm und rechts mit 3390 mm
 * angegeben. von da an verläuft der abstand variabel, da verbindungen der
 * beiden enden.»
 *
 * Die Stütze ist ein KEIL: am engen Ende liegen die beiden Profile dicht
 * (U12 104 mm, U14 124 mm), am weiten Ende 225 mm. Von jedem Ende läuft der
 * Abstand zuerst ein Stück PARALLEL — 990 mm am engen, 1610 mm am weiten
 * Ende —, erst dazwischen verändert er sich. Die 3390 mm der Zeichnung sind
 * die 1610 mm vom anderen Ende her; das Blatt des U14 führt beide Masse.
 *
 * >>> ZWEI DINGE SAGT DAS BLATT NICHT, UND SIE WERDEN NICHT ANGENOMMEN. <<<
 *
 * Erstens WORAUF sich die Masslinie bezieht — lichte Weite zwischen den
 * Profilen, Achsabstand oder Aussenmass. Zwischen lichtem Mass und
 * Achsabstand liegen beim UNP 120 rund 120 mm, und `I_z` des Verbunds geht
 * mit dem Quadrat des Achsabstands. Zweitens, WELCHES Ende am Masten sitzt.
 *
 * Beides ist für den Nachweis unerheblich, solange er über das
 * Bemessungsdiagramm läuft — die Kurve kennt die Geometrie schon. Für eine
 * eigene Knickrechnung wäre es erheblich, und dann ist zuerst zu fragen.
 * `bezug: null` hält das offen, statt es stillschweigend zu entscheiden.
 * ======================================================================== */

/**
 * Das Spreizmass eines Typs, wie es im Sortiment steht.
 *
 * @returns {object|null} {schmal, breit, parallelSchmal, parallelBreit,
 *          bezug, quelle} in mm — oder null (Seil, oder Typ ohne Blatt)
 */
export function ankerSpreizung(id) {
  const a = typeof id === 'string' ? getAnkerTyp(id) : id;
  return a?.spreizung ?? null;
}

/**
 * DER ABSTAND DER BEIDEN PROFILE AN EINER STELLE [mm].
 *
 * `x` misst vom ENGEN Ende aus. Drei Abschnitte, genau wie die Zeichnung sie
 * vermasst: parallel eng, veränderlich, parallel weit.
 *
 * >>> KURZE STÜTZEN. <<<
 *
 * Die beiden parallelen Stücke machen zusammen 2.60 m. Ist die Stütze
 * kürzer, überlappen sie — die Zeichnung zeigt diesen Fall nicht. Dann
 * läuft der Abstand über die ganze Länge linear; das trifft die beiden
 * Enden richtig, und mehr gibt das Blatt nicht her.
 *
 * @param {string} id  Typ
 * @param {number} L   Länge der Stütze [m]
 * @param {number} x   Stelle ab dem engen Ende [m]
 * @returns {number|null} mm
 */
export function ankerSpreizungAn(id, L, x) {
  const sp = ankerSpreizung(id);
  if (!sp || !Number.isFinite(L) || !Number.isFinite(x) || !(L > 0)) {
    return null;
  }
  const xx = Math.min(Math.max(x, 0), L);
  const a = (sp.parallelSchmal ?? 0) / 1000;
  const b = L - (sp.parallelBreit ?? 0) / 1000;
  if (!(b > a)) return sp.schmal + (sp.breit - sp.schmal) * (xx / L);
  if (xx <= a) return sp.schmal;
  if (xx >= b) return sp.breit;
  return sp.schmal + (sp.breit - sp.schmal) * ((xx - a) / (b - a));
}

/** Stand der Datenbank - für die Fussleiste und den Bericht. */
export function ankerStand() {
  return DB ? { typen: DB.typen.length, quelle: DB._quelle ?? null } : null;
}
