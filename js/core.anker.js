/**
 * core.anker.js
 * ---------------------------------------------------------------------------
 * DER NACHWEIS DER ANKER UND DRUCKSTUETZEN AUS DEN KOMBINATIONEN.
 *
 * Bis zum 19. September stand das in app.js (Durchsicht vom 18. September,
 * Punkt A1: app.js in Module teilen). Es ist reine Rechnung - Kombinationen
 * hinein, Nachweis heraus - und braucht vom Arbeitsstand nur Stahl und
 * γ_M0 fuer die Knick-Kontrolle; die kommen als `satz` herein.
 * ---------------------------------------------------------------------------
 */
import { getStahl } from './data.profiles.js';
import { mastSchnitt } from './core.mast.js';
import { ankerNachweis, ankerKnicken } from './data.anker.js';

/**
 * DER NACHWEIS DER ANKER UND DRUCKSTUETZEN.
 *
 * >>> HUELLKURVE UEBER DIE CHARAKTERISTISCHEN LASTFAELLE. <<<
 *
 * Das Werkzeug rechnet sie ohnehin - «Staendig», «Anbauteile», «Schnee»,
 * «Wind y», «Wind x» und «Staendig + Wind», alle mit Beiwert 1. Der letzte
 * ist der Regelfall fuer diesen Nachweis: die Kraft in der Jochachse kommt
 * aus der Umlenkung (staendig) und aus dem Wind, und dort stehen beide
 * zusammen. Die uebrigen laufen mit, weil eine Huellkurve nie unsicher ist.
 *
 * Was NICHT genommen wird, sind die Kombinationen des
 * Tragsicherheitsnachweises: sie tragen γ_G und γ_Q, und die gehoeren nicht
 * gegen eine zulaessige Kraft.
 */
/**
 * DIE KONTROLLRECHNUNG ZUM KNICKEN, mit den Beiwerten dieser Eingabe.
 *
 * Weisung vom 11. September: ein Knicknachweis der Druckstuetze, «falls
 * einfach umsetzbar.» Was einfach ist und was nicht, steht bei
 * `ankerKnicken` in data.anker.js.
 *
 * >>> ZWEI DINGE HOLT DIESER HELFER, UND BEIDE AUS DER EINGABE. <<<
 *
 * f_y kommt in N/mm² und wird auf kN/cm² gebracht. gamma_M1 gibt es als
 * eigenes Feld nicht; fuer das Knicken gilt derselbe Beiwert wie fuer den
 * Querschnitt (`gammaM0`). Ein zweites Feld, das nie einen anderen Wert
 * traegt, waere ein Feld zuviel.
 *
 * Ohne Sortimentseintrag - und beim Seil - kommt null zurueck, kein Fehler:
 * wer keine Stuetze hat, braucht die Rechnung nicht.
 */
export function ankerKnickenSicher(typ, L, satz) {
  try {
    return ankerKnicken(typ, L, {
      fy: (getStahl(satz?.stahl)?.fy ?? 235) / 10,
      gammaM1: Number(satz?.gammaM0) > 0 ? Number(satz.gammaM0) : 1.0,
    });
  } catch { return null; }
}

export function ankerAuswertung(kombi, satz) {
  const lf = (kombi?.lastfaelle ?? []).filter(
    (l) => l.art === 'charakteristisch');
  if (!lf.length) return null;
  const proEnde = {};
  ['A', 'B'].forEach((ende) => {
    let beste = null;
    // Wo das Seil durchhaengt - gesagt wird es, auch wenn es anderswo traegt.
    const schlaffIn = [];
    const kVon = (key) => kombi.ergebnisse?.[key]?.mast?.[ende]?.ankerkraft ?? null;
    /*
     * DER WIND KOMMT AUS BEIDEN RICHTUNGEN (17. September): die
     * charakteristischen Faelle fuehren ihn seither selbst mit beiden
     * Vorzeichen (core.lasten.js) - der Gegenwind steht damit im Nachweis,
     * ohne dass er hier zusammengesetzt werden muss.
     */
    const faelle = lf.map((l) => ({ key: l.key, bez: l.bez, kraft: kVon(l.key) }));
    faelle.forEach((l) => {
      const k = l.kraft;
      if (!k) return;
      if (k.schlaff) schlaffIn.push(l.bez ?? l.key);
      if (!beste || Math.abs(k.N) > Math.abs(beste.kraft.N)
          || (beste.kraft.schlaff && !k.schlaff)
          || (beste.kraft.schlaff && k.schlaff
              && Math.abs(k.NohneAusfall ?? 0) > Math.abs(beste.kraft.NohneAusfall ?? 0))) {
        beste = { kraft: k, lastfall: l.key, bez: l.bez };
      }
    });
    if (!beste) return;
    const k = beste.kraft;
    const nw = ankerNachweis(k.typ, k.N, k.geo.L,
                             { befestigung: k.befestigung, schlaff: k.schlaff,
                               NohneAusfall: k.NohneAusfall });
    /*
     * >>> DAS KNICKEN DANEBEN - ALS AUSKUNFT, NICHT ALS NACHWEIS. <<<
     *
     * Weisung vom 11. September: «was wir noch ergänzen könnten ist ein
     * knicknachweis der druckstütze, falls einfach umsetzbar.»
     *
     * Einfach ist die Richtung SENKRECHT zur Spreizebene - dort ist der
     * Querschnitt konstant und der Stab einteilig. Die andere Richtung ist
     * ein mehrteiliger Druckstab nach EN 1993-1-1 6.4 und steckt im
     * Bemessungsdiagramm; siehe `ankerKnicken`.
     *
     * Nur auf DRUCK: ein Zugstab knickt nicht, und eine Zahl daneben würde
     * gelesen, als täte er es.
     */
    const knick = k.N < 0 ? ankerKnickenSicher(k.typ, k.geo.L, satz) : null;
    proEnde[ende] = { ...beste, geo: k.geo, nachweis: nw, knick,
                      ueberKopf: k.ueberKopf === true, schlaffIn };
  });
  const enden = Object.values(proEnde);
  if (!enden.length) return null;
  return {
    ...proEnde,
    eta: Math.max(...enden.map((e) => e.nachweis?.eta ?? 0)),
    ok: enden.every((e) => e.nachweis?.ok !== false),
  };
}

/**
 * DER ANKERNACHWEIS AM ABFANGJOCH.
 *
 * >>> ES GEHT NICHT UEBER DIE LASTFAELLE DES TRAGJOCHS. <<<
 *
 * `ankerAuswertung` sammelt die charakteristischen Lastfaelle aus
 * `vergleichKombinationen` - und die rechnen den Tragjoch-Ersatzbalken. Am
 * Abfangjoch waeren das Kraefte aus dem falschen Modell.
 *
 * Das Abfangjoch fuehrt seine charakteristische Kombination selbst mit
 * (`auflager[ende].char`, alle Anteile mit Beiwert 1). Daraus wird ein
 * eigenes Lastbild gebaut und der Masten damit geschnitten; die Ankerkraft
 * faellt dabei an wie sonst auch.
 */
/**
 * Die Faelle des Abfangjochs, je Ende gleich geordnet - dieselbe Stelle in
 * beiden Listen ist derselbe Fall.
 */
export function abfangVarianten(auflager) {
  const A = auflager?.A?.faelle ?? [];
  const B = auflager?.B?.faelle ?? [];
  const n = Math.max(A.length, B.length);
  return Array.from({ length: n }, (_, i) => ({ fa: A[i] ?? B[i], fb: B[i] ?? null }))
    .filter((v) => v.fa);
}

/**
 * >>> EIN LASTBILD DES MASTEN FUER EINEN FALL DES ABFANGJOCHS. <<<
 *
 * Die Kraefte des Jochs kommen aus dem Fall; der Wind auf den Masten und auf
 * seine Anbauteile muss DERSELBE sein - dieselbe Richtung, derselbe Beiwert.
 * Bis zum 17. September kam er aus dem Tragjoch-Lastfall von `berechne`,
 * also in einer Richtung und unabhaengig vom Fall des Jochs.
 *
 * @param {boolean} charakteristisch  alle Beiwerte 1 (fuer den Anker)
 */
export function abfangModell(modell, auflager, fa, fb, charakteristisch) {
  const bw = charakteristisch ? { g: 1, w: 1, s: 1 } : (fa.beiwerte ?? { g: 1, w: 1, s: 1 });
  const wy = fa.windY ?? 1, wx = fa.windX ?? 1;
  const nimm = (f) => (f ? (charakteristisch ? { ...f, ...f.char } : f) : null);
  const ml = modell.mastLast;
  const wind = (s) => (s ? { ...s,
    xd: bw.w * wx * (s.x ?? 0),
    yd: s.y === null || s.y === undefined ? null : bw.w * wy * s.y } : s);
  const faktor = { G: bw.g, WindX: bw.w * wx, WindY: bw.w * wy, Schnee: bw.s };
  const anbauMastFlach = (modell.anbauMastFlach ?? []).map((t) => {
    const proGruppe = {};
    Object.entries(t.kraefte ?? {}).forEach(([g, k]) => {
      const f = faktor[g] ?? 0;
      proGruppe[g] = { Fx: f * (k.Fx ?? 0), Fy: f * (k.Fy ?? 0), Fz: f * (k.Fz ?? 0),
                       Mxx: f * (k.Mxx ?? 0), Myy: f * (k.Myy ?? 0), Mzz: f * (k.Mzz ?? 0) };
    });
    return { ...t, proGruppe };
  });
  return {
    ...modell,
    beiwerte: { ...(modell.beiwerte ?? {}), G: bw.g },
    mastLast: ml ? { ...ml, A: wind(ml.A), B: wind(ml.B) } : ml,
    anbauMastFlach,
    abfangAuflager: { ey: auflager.ey, A: nimm(fa), B: nimm(fb) },
  };
}

export function ankerAmAbfangjoch(modell, auflager, satz) {
  const proEnde = {};
  const varianten = abfangVarianten(auflager);
  ['A', 'B'].forEach((ende) => {
    /*
     * UEBER ALLE FAELLE, charakteristisch, der Wind in beiden Richtungen
     * (17. September). Massgebend ist die groesste Stabkraft; ein Seil, das
     * nur irgendwo traegt, wird dort nachgewiesen, und wo es durchhaengt,
     * steht es in der Liste.
     */
    let beste = null;
    const schlaffIn = [];
    varianten.forEach(({ fa, fb }) => {
      const sch = mastSchnitt(abfangModell(modell, auflager, fa, fb, true), ende);
      const k2 = sch?.ankerkraft;
      if (!k2) return;
      if (k2.schlaff) schlaffIn.push(fa.label);
      const beideSchlaff = beste?.kraft.schlaff && k2.schlaff;
      if (!beste || (beste.kraft.schlaff && !k2.schlaff)
          || (!k2.schlaff && Math.abs(k2.N) > Math.abs(beste.kraft.N))
          // Haengt es ueberall durch, nennt die Kachel den groessten Druck.
          || (beideSchlaff && Math.abs(k2.NohneAusfall ?? 0)
                              > Math.abs(beste.kraft.NohneAusfall ?? 0))) {
        beste = { kraft: k2, lastfall: fa.key, bez: `${fa.label}, charakteristisch` };
      }
    });
    if (!beste) return;
    const k = beste.kraft;
    proEnde[ende] = {
      kraft: k, lastfall: beste.lastfall, bez: beste.bez,
      geo: k.geo, ueberKopf: k.ueberKopf === true,
      nachweis: ankerNachweis(k.typ, k.N, k.geo.L,
                              { befestigung: k.befestigung, schlaff: k.schlaff,
                                NohneAusfall: k.NohneAusfall }),
      schlaffIn,
      // Dieselbe Kontrollrechnung wie am Tragjoch - nur auf DRUCK, ein
      // Zugstab knickt nicht. Siehe `ankerKnicken`.
      knick: k.N < 0 ? ankerKnickenSicher(k.typ, k.geo.L, satz) : null,
    };
  });
  const enden = Object.values(proEnde);
  if (!enden.length) return null;
  return {
    ...proEnde,
    eta: Math.max(...enden.map((e) => e.nachweis?.eta ?? 0)),
    ok: enden.every((e) => e.nachweis?.ok !== false),
  };
}
