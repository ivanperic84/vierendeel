/**
 * data.abfangjoche.js
 * ---------------------------------------------------------------------------
 * DAS SORTIMENT DER ABFANGJOCHE.
 *
 * Ein Abfangjoch nimmt die LEITERZUGKRÄFTE auf, nicht das Gewicht der
 * Fahrleitung. Es wird über einem Tragjoch montiert, auf denselben Masten,
 * und mehrere übereinander sind der Regelfall.
 *
 * >>> ES IST EIN LIEGENDER VIERENDEELTRÄGER. <<<
 *
 * Weisung vom 3. September: «Die Abfangjoche sind liegende Vierendeelträger.»
 * Der Schnitt A-A zeigt es: ZWEI Gurte nebeneinander (UPE, ab A270 IPE),
 * lichter Abstand d, verbunden durch BINDEBLECHE im 500er-Raster — je eines
 * oben und unten, wie beim Tragjoch. Gurte und Pfosten ohne Diagonalen: ein
 * Vierendeel-Rahmen, nur in EINER Ebene statt in zweien, und diese Ebene
 * LIEGT.
 *
 * >>> DER HEBELARM IST k, DAS AUSSENMASS. <<<
 *
 * Weisung vom 3. September, auf Nachfrage: nicht h. Die Gurte stehen
 * NEBENEINANDER, k = d + 2b spannt die Rahmenebene auf (A160: 70+280+70 =
 * 420). Die Bauhöhe a ist die Profilhöhe — der Träger ist 160 hoch und
 * 420 breit.
 *
 * >>> UND DIE GABEL AM JOCHENDE GEHÖRT DAZU. <<<
 *
 * Ein aufgesetztes Gurtstück gleichen Profils (bei A160: UPE 160 × 660,
 * zweimal) verdoppelt den Gurtquerschnitt im Anschlussbereich. Für den
 * Nachweisschnitt am Auflager ist das erheblich, und die stehende Vorgabe
 * verlangt die Geometrie im Detail.
 *
 * Das dreht die Tragwirkung gegenüber dem Tragjoch:
 *
 *   Tragjoch     Rahmenebene senkrecht, Vierendeel trägt das GEWICHT
 *   Abfangjoch   Rahmenebene waagrecht, Vierendeel trägt den LEITERZUG
 *
 * Ein früherer Kommentar an dieser Stelle behauptete, der Kern dieser
 * Anwendung passe darauf nicht. Das war falsch und aus dem Blatt allein
 * gelesen: zwei Gurte statt vier, eine Blechebene statt zweier - der
 * Rechenweg ist derselbe.
 *
 * Was hier steht, ist das Sortiment: Typen, Längen, Gewichte, Konstruktions-
 * masse, Schnee- und Windlasten je Laufmeter.
 *
 * ================== ZWEI SORTIMENTE, ZWEI BENENNUNGEN =====================
 *
 * AKTUELL heissen sie nach einer A-Nummer: A160 bis A360. Die Zahl ist die
 * Höhe des Gurtprofils in Millimetern — A160 trägt UPE 160, A360 trägt
 * IPE 360.
 *
 * DIE ALTBAUWEISE heisst nach dem PROFIL selbst: «UAP 130», «IPE 270». Der
 * Unterschied liegt nicht im Profil, sondern im ZUSAMMENBAU (Weisung vom
 * 3. September) — deshalb gibt es Paare wie A270 und IPE 270, die dasselbe
 * Profil führen und trotzdem verschieden schwer sind (98 gegen 111 kg/m).
 *
 * Beide stehen zur Wahl: die Altbauweise ist im Bestand vorhanden und muss
 * nachgewiesen werden können, auch wenn sie nicht mehr verbaut wird.
 * ---------------------------------------------------------------------------
 */

let DB = null;

/**
 * Die Datenbank laden - eingebettet oder daneben liegend.
 *
 * >>> IHR FEHLEN IST KEIN FEHLER. <<<
 *
 * Anders als bei den Tragjochen laeuft die Anwendung ohne dieses Sortiment
 * weiter: wer kein Abfangjoch auf dem Blatt hat, braucht es nicht. Die
 * Typwahl bleibt dann leer und sagt es (abfangDbDa), statt den Start mit
 * einer Ausnahme abzubrechen.
 */
export async function ladeAbfangjoche(pfad = 'data/abfangjoche.json') {
  if (DB) return DB;
  if (typeof document !== 'undefined') {
    const eingebettet = document.getElementById('abfangjoch-db');
    const roh = eingebettet?.textContent?.trim();
    if (roh) return setzeAbfangDB(JSON.parse(roh));
  }
  try {
    const antwort = await fetch(pfad);
    if (antwort.ok) return setzeAbfangDB(await antwort.json());
  } catch { /* ohne Sortiment weiter */ }
  return null;
}

/** Die Datenbank setzen (aus data/abfangjoche.json). */
export function setzeAbfangDB(db) { DB = db; return db; }

/** Ob eine Datenbank geladen ist - die Anwendung läuft auch ohne. */
export const abfangDbDa = () => Boolean(DB?.typen?.length);

function db() {
  if (!DB) throw new Error('Abfangjoch-Datenbank nicht geladen');
  return DB;
}

/** Alle Typen, aktuelles Sortiment zuerst. */
export function abfangjoche() {
  return abfangDbDa() ? db().typen : [];
}

export function getAbfangjoch(typ) {
  const a = abfangjoche().find((x) => x.typ === typ);
  if (!a) throw new Error(`Unbekannter Abfangjochtyp: ${typ}`);
  return a;
}

/**
 * Der Längenbereich eines Typs [m].
 *
 * >>> DIE ALTBAUWEISE FÜHRT NUR EINE GRÖSSTE LÄNGE. <<<
 *
 * Auf ihren Blättern steht «jt max.» und keine kleinste Länge. Eine
 * erfundene Untergrenze wäre eine Angabe, die niemand gemacht hat; genommen
 * wird deshalb die kleinste Länge, die das Sortiment überhaupt führt.
 */
export function abfangLaengenbereich(typ) {
  const a = typeof typ === 'string' ? getAbfangjoch(typ) : typ;
  const [min, max] = a?.jt ?? [];
  const kleinste = Math.min(...abfangjoche()
    .map((x) => x.jt?.[0]).filter((v) => Number.isFinite(v)));
  return {
    min: Number.isFinite(min) ? min : (Number.isFinite(kleinste) ? kleinste : 5.5),
    max: Number.isFinite(max) ? max : 30,
    text: Number.isFinite(min) ? `${min}–${max} m` : `bis ${max} m`,
  };
}

/**
 * DER AUFBAU EINES TYPS - was der Rechenkern braucht.
 *
 * >>> DER HEBELARM IST k, NICHT h. <<<
 *
 * Weisung vom 3. September auf Nachfrage. Die beiden Gurte stehen
 * NEBENEINANDER; k = d + 2b ist das Aussenmass im Feld und spannt die
 * Rahmenebene auf. `h` ist das Aussenmass am JOCHENDE (Spreizung + 2b) - bei
 * den gekropften Typen ein anderes Mass, und es zu verwechseln hiesse, mit
 * dem falschen Hebelarm zu rechnen.
 *
 * Der Achsabstand der Gurte ist kleiner als k: die Schwerachse jedes Gurtes
 * liegt um e_y innerhalb des Stegruckens. Diesen Abzug macht `gurtAchsabstand`
 * in data.profiles.js - er braucht dafuer den Profilkatalog.
 *
 * >>> UND `c` IST DIE FLANSCHDICKE. <<<
 *
 * Nicht die Stegdicke, wie hier zuerst stand. Gegengeprueft an allen sieben
 * Typen gegen die Profilnorm: UPE 160 fuehrt c = 9.5, und das ist t_f -
 * t_w waere 5.5.
 */
export function abfangAufbau(typ) {
  const a = typeof typ === 'string' ? getAbfangjoch(typ) : typ;
  return a?.aufbau ?? null;
}

/** Die Bindebleche eines Typs: Regelblech im Feld, Endbleche links/rechts. */
export function abfangBindeblech(typ) {
  const a = typeof typ === 'string' ? getAbfangjoch(typ) : typ;
  return a?.bindeblech ?? null;
}

/**
 * DIE GABEL AM JOCHENDE (Weisung, 3. September: «beachte noch die
 * verstaerkung zu den jochenden (Gabel)»).
 *
 * Ein aufgesetztes Gurtstueck gleichen Profils - bei A160 ein UPE 160 x 660,
 * zweimal. Es VERDOPPELT den Gurtquerschnitt im Anschlussbereich, und genau
 * dort liegt der Nachweisschnitt am Auflager. Wer es weglaesst, weist den
 * schwaechsten Querschnitt an der Stelle nach, an der der staerkste steht.
 */
export function abfangGabel(typ) {
  const a = typeof typ === 'string' ? getAbfangjoch(typ) : typ;
  return a?.verstaerkung ?? null;
}

/**
 * DIE ENDVERSTAERKUNG - in der Bauart, die der Typ fuehrt.
 *
 * >>> AB A270 IST ES KEINE GABEL MEHR. <<<
 *
 * A160 bis A240 setzen ein Gurtstueck gleichen Profils auf (UPE 160 x 660
 * bei A160). Ab A270 tritt an seine Stelle ein DECKBLECH, und zwar
 * asymmetrisch: 1450 mm am linken Jochende, 650 mm am rechten. Derselbe
 * Zweck, andere Bauart - und wer nur nach `verstaerkung` fragt, findet bei
 * den vier grossen Typen nichts und weist den unverstaerkten Querschnitt
 * nach.
 *
 * @returns {{art: string, teile: Array}|null}
 */
export function abfangEndverstaerkung(typ) {
  const a = typeof typ === 'string' ? getAbfangjoch(typ) : typ;
  if (a?.verstaerkung) {
    return { art: 'gabel', teile: [a.verstaerkung] };
  }
  if (a?.deckblech?.length) {
    return { art: 'deckblech', teile: a.deckblech };
  }
  return null;
}

/**
 * Die Zeile der Mass-Tabelle zu einer Jochlaenge.
 *
 * >>> MASSGEBEND SIND DIE DATEN. <<<
 *
 * Die Blecheinteilung liesse sich herleiten - QV1 = jt - 4.0 m, A1 wechselt
 * zwischen 250 und 500 - und genau das waere der Fehler: fuehrt das Schema
 * eine Zeile, gilt sie. Gesucht wird deshalb die gefuehrte Laenge, nicht die
 * gerechnete; ohne Treffer kommt null zurueck und der Aufrufer sagt es.
 */
export function abfangMasse(typ, jt) {
  const a = typeof typ === 'string' ? getAbfangjoch(typ) : typ;
  const zeilen = a?.laengen ?? [];
  if (!zeilen.length) return null;
  let beste = null, ab = Infinity;
  for (const z of zeilen) {
    const d = Math.abs(z.jt - jt);
    if (d < ab) { ab = d; beste = z; }
  }
  return ab <= 0.001 ? beste : null;
}

/**
 * DIE RANDMASSE DER BLECHEINTEILUNG - die beiden Endbereiche.
 *
 * >>> DIE ENDEN SIND NICHT GLEICH LANG. <<<
 *
 * Weisung vom 3. September: «beachte zudem das die enden hier nicht gleich
 * lang sind (gabellaenge). auf der linken seite kommt das erste blech schon
 * bei 1450mm und dann das naechste nach 550 und auf der rechten sind es 900
 * und dann zweimal 550 mm der rest wird gemaess der tabelle verteilt.»
 *
 * Das Schemablatt zeigt es fuer jede abgebildete Laenge gleich:
 *
 *   |<-- 2000 -->|<--------- QV = jt - 4000 --------->|<-- 2000 -->|
 *   | 1450 | 550 | An .. A2 A1 A1 A2 .. An            | 550|550|900|
 *
 * Links traegt das Jochende die GABEL, rechts nicht - daher der Unterschied.
 * Beide Endbereiche messen 2000; nur ihre Einteilung ist verschieden. Die
 * Werte sind typspezifisch (A160 1450/550, A200 1375/625, A330 540/535/925)
 * und im Schemablatt jeder Groesse einzeln nachgemessen.
 *
 * @returns {{linksErstesBlech, linksZweitesFeld, rechtsFelder: number[],
 *            rechtsBisEnde, aussenBereich}|null} alles in mm
 */
export function abfangRandmasse(typ) {
  const a = typeof typ === 'string' ? getAbfangjoch(typ) : typ;
  return a?.randmasse ?? null;
}

/** Die gefuehrten Laengen eines Typs [m] - aus der Mass-Tabelle. */
export function abfangLaengen(typ) {
  const a = typeof typ === 'string' ? getAbfangjoch(typ) : typ;
  return (a?.laengen ?? []).map((z) => z.jt);
}

/**
 * Ob ein Typ vollstaendig erfasst ist.
 *
 * Ohne Mass-Tabelle steht der Aufbau da, aber keine Blecheinteilung - und
 * ohne die gibt es keinen Nachweisschnitt. Die Maske sagt es beim Typ,
 * statt eine Rechnung auf halben Daten zu fuehren.
 */
export function abfangVollstaendig(typ) {
  const a = typeof typ === 'string' ? getAbfangjoch(typ) : typ;
  return Boolean(a?.aufbau && a?.bindeblech && a?.laengen?.length
                 && (a.verstaerkung || a.deckblech?.length));
}
