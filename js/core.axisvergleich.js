/**
 * core.axisvergleich.js
 * ---------------------------------------------------------------------------
 * DIE GEGENRECHNUNG MIT AXISVM, IN DER ANWENDUNG (9. Oktober).
 *
 * Frage des Auftraggebers nach zwei Abstürzen der Ergebnisanzeige über COM:
 * «macht es vielleich mehr sinn die resultate in diese app zurückzuführen und
 * den bericht hier zusammenzustellen?», dann: «Bericht so wie vorgeschlagen in
 * der App bauen, wäre es möglich die spannungsverläufe zu plotten so wi im
 * Axisvm?»
 *
 * Die Brücke liest aus dem gerechneten AxisVM-Modell je LASTFALL die
 * Schnittgrössen an den Stabschnitten, die Knotenwege und die Linkkräfte
 * (`<modell>_ergebnisse.json`, Format `tragjoch-axisvm-ergebnisse`). Hier
 * werden sie wie eine zweite Lösung desselben Stabmodells behandelt:
 *
 *   - `axisLoesung` gibt die Endkräfte je Stab und Lastfall in der Form des
 *     eigenen Lösers (`stabkraft`);
 *   - `stabwerkHuelle` - DIESELBE Funktion, die das Urteil der Anwendung
 *     rechnet - wertet sie über dieselben Kombinationen aus: dieselbe
 *     Spannungsformel, dieselben Querschnittswerte, dieselbe Regel für den
 *     Knotenbereich. Was sich unterscheidet, sind allein die Schnittgrössen.
 *
 * Das ist ein Vergleich der RECHNUNG (Modell und Löser), nicht der
 * Spannungsanzeige von AxisVM: deren eigene Spannungen rechnet AxisVM aus
 * seinem Querschnitt (ohne Ausrundung, andere Auswertepunkte).
 *
 * Nichts hier rechnet das Tragwerk neu, und nichts ändert ein Urteil.
 * ---------------------------------------------------------------------------
 */

import { stabwerkHuelle, stabZuordnung } from './core.stabnachweis.js';

export const AXIS_FORMAT = 'tragjoch-axisvm-ergebnisse';

/** Ist das eine Ergebnisdatei der Brücke? */
export function istAxisErgebnis(o) {
  return Boolean(o && o.format === AXIS_FORMAT && o.faelle && typeof o.faelle === 'object');
}

/**
 * Die AxisVM-Ergebnisse als «Lösung» in der Form des eigenen Lösers.
 *
 * Je Stab der erste und der letzte Schnitt als Stabenden; am Anfang das
 * Negative (Konvention von `stabkraft`: Kräfte AM Stab, an beiden Enden).
 * Ein Stab, dessen letzter Schnitt nicht am Stabende liegt (alte Dateien:
 * die Brücke las Schnitt 2 von 11, also x = L/10), wird ausgelassen und
 * gezählt.
 */
export function axisLoesung(dat, erg) {
  const kn = new Map((dat?.knoten ?? []).map((k) => [k.name, k]));
  const laenge = new Map((dat?.staebe ?? []).map((s) => {
    const a = kn.get(s.von), b = kn.get(s.bis);
    return [s.name, a && b ? Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) : 0];
  }));
  const ohneEnde = new Set();
  const jeFall = new Map();
  Object.entries(erg?.faelle ?? {}).forEach(([fall, f]) => {
    const jeStab = new Map();
    (f.schnitte ?? []).forEach((s) => {
      let a = jeStab.get(s.stab);
      if (!a) { a = []; jeStab.set(s.stab, a); }
      a.push(s);
    });
    const out = new Map();
    jeStab.forEach((a, stab) => {
      if (!laenge.has(stab)) return;
      a.sort((p, q) => p.x - q.x);
      const i = a[0], j = a[a.length - 1];
      const L = laenge.get(stab);
      if (a.length < 2 || Math.abs(i.x) > 1e-3 + 0.01 * L || Math.abs(j.x - L) > 1e-3 + 0.01 * L) {
        ohneEnde.add(stab);
        return;
      }
      out.set(stab, Float64Array.from([-i.Nx, -i.Vy, -i.Vz, -i.Tx, -i.My, -i.Mz,
                                       j.Nx, j.Vy, j.Vz, j.Tx, j.My, j.Mz]));
    });
    jeFall.set(fall, out);
  });
  return {
    u: jeFall,                                   // nur `has` wird gebraucht
    stabkraft: (fall) => jeFall.get(fall) ?? new Map(),
    ohneEnde: [...ohneEnde],
    staebe: new Set([...jeFall.values()].flatMap((m) => [...m.keys()])).size,
  };
}

/**
 * Gehört die Ergebnisdatei zum Modell, das die Anwendung gerade rechnet?
 * Geprüft wird, was sich prüfen lässt: jeder Stab der Ergebnisse steht im
 * Modell, jeder echte Stab des Modells hat Ergebnisse, die Lastfälle der
 * Kombinationen sind da.
 */
export function axisPassung(dat, erg) {
  if (!istAxisErgebnis(erg)) return { ok: false, grund: 'keine Ergebnisdatei der COM-Brücke (Format tragjoch-axisvm-ergebnisse)' };
  const imModell = new Map((dat?.staebe ?? []).map((s) => [s.name, s.art ?? 'stab']));
  const inErg = new Set(Object.values(erg.faelle).flatMap((f) => (f.schnitte ?? []).map((s) => s.stab)));
  const fremd = [...inErg].filter((n) => !imModell.has(n));
  const echte = [...imModell].filter(([, a]) => a === 'stab').map(([n]) => n);
  const fehlt = echte.filter((n) => !inErg.has(n));
  const lf = new Set((dat?.lastfaelle ?? []).map((l) => l.key ?? l.name));
  const lfFehlt = [...new Set((dat?.kombinationen ?? []).flatMap((k) => (k.anteile ?? []).map((a) => a.lastfall)))]
    .filter((n) => lf.has(n) && !(n in erg.faelle));
  const info = { staebeModell: echte.length, staebeErgebnis: inErg.size, fremd, fehlt, lastfaelleFehlen: lfFehlt };
  if (!inErg.size) return { ok: false, grund: 'die Datei führt keine Schnittgrössen', ...info };
  if (fremd.length) {
    return { ok: false, ...info,
             grund: `${fremd.length} Stäbe der Ergebnisse stehen nicht im jetzigen Modell (z. B. ${fremd.slice(0, 3).join(', ')}) - die Datei gehört zu einem anderen Stand` };
  }
  if (fehlt.length > 0.02 * echte.length) {
    return { ok: false, ...info,
             grund: `${fehlt.length} von ${echte.length} Stäben des Modells haben keine Ergebnisse (z. B. ${fehlt.slice(0, 3).join(', ')}) - die Datei gehört zu einem anderen Stand` };
  }
  return { ok: true, ...info };
}

const mitte = (a, b) => (a + b) / 2;

/**
 * Der Vergleich: Ausnutzung je Bauteil und Teil, Spannungsverläufe entlang
 * der Stäbe, grösster Knotenweg je Lastfall.
 *
 * @param {object} sw   Ergebnis von rechneStabwerk (mit `roh`: dat, lsg,
 *                      auswertung {faelle, fyd, opt})
 * @param {object} erg  Ergebnisdatei der Brücke
 */
export function axisVergleich(sw, erg) {
  const roh = sw?.roh;
  if (!roh?.dat || !roh?.lsg || !roh?.auswertung) return { ok: false, grund: 'kein gerechnetes Stabwerk' };
  const { dat, lsg } = roh;
  const pass = axisPassung(dat, erg);
  if (!pass.ok) return { ok: false, grund: pass.grund, passung: pass };
  const ax = axisLoesung(dat, erg);
  const { faelle, fyd, opt } = roh.auswertung;
  const hA = stabwerkHuelle(dat, ax, faelle, fyd, opt);
  // Die eigene Hülle noch einmal mit demselben Aufruf - so stehen beide
  // Seiten sicher auf denselben Kombinationen und Optionen.
  const hL = stabwerkHuelle(dat, lsg, faelle, fyd, opt);

  const abw = (a, l) => (Number.isFinite(a) && Number.isFinite(l) && Math.abs(l) > 1e-9 ? a / l - 1 : null);
  const schluessel = new Set([...Object.keys(hL.teile ?? {}), ...Object.keys(hA.teile ?? {})]);
  const teile = [...schluessel].map((k) => {
    const l = hL.teile?.[k], a = hA.teile?.[k];
    return { key: k, name: l?.name ?? a?.name, teil: l?.teil ?? a?.teil,
             etaApp: l?.eta ?? null, etaAxis: a?.eta ?? null,
             sigApp: l?.sig ?? null, sigAxis: a?.sig ?? null,
             abw: abw(a?.sig, l?.sig),
             woApp: l?.wo ?? null, woAxis: a?.wo ?? null,
             fallApp: l?.bez ?? null, fallAxis: a?.bez ?? null };
  }).sort((p, q) => (q.etaApp ?? 0) - (p.etaApp ?? 0));

  /*
   * >>> DIE SPANNUNGSVERLÄUFE (Frage: «wäre es möglich die
   *     spannungsverläufe zu plotten so wi im Axisvm?»). <<<
   * Je Bauteil und Teil die Randspannung der Hülle entlang der Stäbe: am
   * Joch über x (je Stab ein Stück, je Stelle das Grösste der Gurte bzw.
   * Bleche dieses Teils), am Masten über die Höhe. Zwei Linien: Anwendung
   * und AxisVM. Nur Zahlen - gezeichnet wird im Bericht als Vektor, die
   * Datei wächst je Bild um wenige Kilobyte.
   */
  const kn = new Map(dat.knoten.map((k) => [k.name, k]));
  const gruppen = new Map();
  dat.staebe.forEach((s) => {
    if ((s.art ?? 'stab') !== 'stab') return;
    const zl = hL.jeStab?.[s.name], za = hA.jeStab?.[s.name];
    if (!zl && !za) return;
    const teil = zl?.teil ?? za?.teil;
    if (!teil) return;
    const zu = stabZuordnung(s.name);
    const a = kn.get(s.von), b = kn.get(s.bis);
    if (!a || !b) return;
    const lotrecht = Math.abs(b.z - a.z) > Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    const amMast = zu.key.startsWith('mast:');
    const k = `${zu.key}|${teil}`;
    let g = gruppen.get(k);
    if (!g) { g = { key: k, name: zu.name, teil, achse: amMast ? 'z' : 'x', stuecke: [] }; gruppen.set(k, g); }
    const [u0, u1] = g.achse === 'z' ? [a.z, b.z] : [a.x, b.x];
    // Bleche des Jochs stehen quer zur Achse: sie sind ein Punkt je Station.
    const punkt = !amMast && lotrecht || Math.abs(u1 - u0) < 1e-6;
    /*
     * Am Masten der Verlauf IM Stab (alle 0.5 m aus Endkräften und
     * Gleichlast, wie der Nachweis ihn führt) - der unterste Stab reicht
     * vom Fuss bis unter den Anschluss und wäre sonst ein einziger Wert.
     */
    const vl = zl?.verlauf, va = za?.verlauf;
    if (amMast && Array.isArray(vl) && vl.length > 1 && Array.isArray(va) && va.length === vl.length
        && vl.every((p) => Number.isFinite(p.z))) {
      vl.forEach((p, i) => g.stuecke.push({ u0: p.z, u1: p.z, um: p.z, punkt: true, linie: true,
                                           app: p.sig, axis: va[i].sig }));
      return;
    }
    g.stuecke.push({ u0: Math.min(u0, u1), u1: Math.max(u0, u1), um: mitte(u0, u1), punkt,
                     // Im Knotenbereich (Anschnitt) trägt der Stab keine Ausnutzung - er fehlt im Verlauf.
                     app: zl && !zl.imKnoten ? zl.sig : null, axis: za && !za.imKnoten ? za.sig : null });
  });
  const verlaeufe = [...gruppen.values()].map((g) => {
    // Je Stelle das Grösste (linker und rechter Gurt, alle Bleche einer Station).
    const jeStelle = new Map();
    g.stuecke.forEach((st) => {
      const k = st.punkt ? `p${st.um.toFixed(3)}` : `${st.u0.toFixed(3)}|${st.u1.toFixed(3)}`;
      const v = jeStelle.get(k) ?? { u0: st.punkt ? st.um : st.u0, u1: st.punkt ? st.um : st.u1, app: null, axis: null };
      if (Number.isFinite(st.app)) v.app = Math.max(v.app ?? 0, st.app);
      if (Number.isFinite(st.axis)) v.axis = Math.max(v.axis ?? 0, st.axis);
      jeStelle.set(k, v);
    });
    const punkte = [...jeStelle.values()].filter((v) => v.app !== null || v.axis !== null)
      .sort((p, q) => p.u0 - q.u0 || p.u1 - q.u1);
    const u0 = Math.min(...punkte.map((p) => p.u0));
    return { key: g.key, name: g.name, teil: g.teil, achse: g.achse,
             punkte: punkte.map((p) => ({ ...p, u0: p.u0 - (g.achse === 'z' ? u0 : 0), u1: p.u1 - (g.achse === 'z' ? u0 : 0) })),
             maxApp: Math.max(0, ...punkte.map((p) => p.app ?? 0)),
             maxAxis: Math.max(0, ...punkte.map((p) => p.axis ?? 0)) };
  }).filter((v) => v.punkte.length > 1);

  // Die Knotenwege je Lastfall: der grösste Betrag der Verschiebung.
  const wege = [];
  const idx = lsg.knotenIdx;
  Object.entries(erg.faelle).forEach(([fall, f]) => {
    if (!f.wege || !lsg.u?.has?.(fall) || !idx) return;
    const uv = lsg.u.get(fall);
    let mA = 0, mL = 0, wo = null;
    Object.entries(f.wege).forEach(([name, w]) => {
      const i = idx.get(name);
      if (i === undefined) return;
      const a = Math.hypot(w[0], w[1], w[2]);
      const l = Math.hypot(uv[i * 6], uv[i * 6 + 1], uv[i * 6 + 2]);
      if (a > mA) { mA = a; wo = name; }
      if (l > mL) mL = l;
    });
    if (mA > 1e-7 || mL > 1e-7) wege.push({ fall, name: f.name ?? fall, app: mL * 1000, axis: mA * 1000, abw: abw(mA, mL), wo });
  });
  wege.sort((p, q) => q.axis - p.axis);

  // Was die Zahlen einschränkt, steht dabei.
  const hinweise = [];
  if (ax.ohneEnde.length) {
    hinweise.push(`${ax.ohneEnde.length} Stäbe ohne Schnitt am Stabende in der Ergebnisdatei (ältere Brücke) - sie fehlen im Vergleich.`);
  }
  if (pass.fehlt.length) hinweise.push(`${pass.fehlt.length} Stäbe des Modells ohne Ergebnisse - sie fehlen im Vergleich.`);
  if (pass.lastfaelleFehlen.length) {
    hinweise.push(`Lastfälle ohne AxisVM-Ergebnis: ${pass.lastfaelleFehlen.join(', ')} - Kombinationen mit ihnen sind auf der AxisVM-Seite unvollständig.`);
  }
  if (dat.staebe.some((s) => s.nichtlinear?.x === 'nurZug')) {
    hinweise.push('Das Blatt führt Seile, die nur Zug tragen: die Anwendung lässt ein gedrücktes Seil ausfallen, die AxisVM-Ergebnisse sind linear je Lastfall - in Kombinationen mit Seilausfall weichen die beiden deshalb ab.');
  }
  const massgebend = teile.filter((t) => Number.isFinite(t.abw) && (t.etaApp ?? 0) >= 0.1)
    .sort((p, q) => Math.abs(q.abw) - Math.abs(p.abw))[0] ?? null;
  return {
    ok: true,
    quelle: { erzeugt: erg.erzeugt ?? null, tragwerk: erg.tragwerk ?? null, datei: erg.quelle ?? null },
    passung: pass, teile, verlaeufe, wege, hinweise,
    etaApp: Math.max(0, ...teile.map((t) => t.etaApp ?? 0)),
    etaAxis: Math.max(0, ...teile.map((t) => t.etaAxis ?? 0)),
    abwMax: massgebend,
  };
}
