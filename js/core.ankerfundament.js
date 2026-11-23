/*
 * >>> DAS ANKERFUNDAMENT (23. November). <<<
 *
 * Frage, im Wortlaut: «hast du für die ankerfundamente die grenzlasten schon
 * in der app hinterlegt? diese sollten im standardfundamente regelwerk drin
 * stehen, jenachdem wie gross die vertikal und horizontal (längsrichtung) ist,
 * muss man eine dp1a oder dp2a ansetzen als typ.» Quelle: das Bausortiment
 * der Standardfundamente (ab 2019), Tabelle «Zulässige Lasten mit
 * Ankerplatte», charakteristisch, Gelände bis 33° - je Typ Zug (Seilanker,
 * Druckstütze auf Zug) und Druck (Druckstütze auf Druck), je V und H_l. Die
 * Werte stehen nur in der Datenbasis (`ankerfundamente` in masten.json).
 *
 * Auf Rückfrage «V und H einzeln, kleinster Typ» und «Ja, wie Mastfundamente»:
 * je charakteristischem Zustand (ständig, ständig + veränderlich, Havarie)
 * entscheidet das Vorzeichen von V, ob die Zug- oder die Druckspalte gilt;
 * η = max(V / V_zul, H / H_zul) ohne Interaktion. H ist die Horizontalkraft
 * in Ankerrichtung (längs; ein quer gestellter Anker wird gegen dieselbe
 * Spalte geprüft - meine Lesart, die Tabelle führt nur H_l). Ohne Wahl gilt
 * der kleinste Typ, der hält; reicht keiner, der grösste mit η > 1.
 * Im Gelände über 14° gelten die reduzierten Zugwerte («_steil»).
 */

/** Zug (V < 0, abhebend) oder Druck je Zustand, mit V und H. */
function pruefe(typ, z, steil) {
  const zug = z.V < 0;
  const vZul = zug ? (steil && Number.isFinite(typ.zugV_steil) ? typ.zugV_steil : typ.zugV) : typ.druckV;
  const hZul = zug ? (steil && Number.isFinite(typ.zugHl_steil) ? typ.zugHl_steil : typ.zugHl) : typ.druckHl;
  const eV = Math.abs(z.V) / vZul, eH = Math.abs(z.H) / hZul;
  return { zug, vZul, hZul, eV, eH, eta: Math.max(eV, eH) };
}

/**
 * @param {Array<{V:number, H:number, bez:string, key:string}>} zustaende  V Druck positiv
 * @param {Array} typen  Tabelle `ankerfundamente`
 * @param {{gewaehlt?:string, gelaende?:string}} o
 */
export function ankerFundamentNachweis(zustaende, typen, o = {}) {
  const liste = (typen ?? []).filter((t) => Number.isFinite(t?.zugV) && Number.isFinite(t?.druckV))
    .sort((a, b) => a.zugV - b.zugV || a.druckV - b.druckV);
  if (!liste.length || !(zustaende ?? []).length) return null;
  const steil = o.gelaende === 'ueber14' || o.gelaende === 'ueber14fallend';
  const auswerten = (typ) => {
    const nw = { Vzug: null, Hzug: null, Vdruck: null, Hdruck: null };
    let mg = null;
    zustaende.forEach((z) => {
      const p = pruefe(typ, z, steil);
      const kV = p.zug ? 'Vzug' : 'Vdruck', kH = p.zug ? 'Hzug' : 'Hdruck';
      if (!nw[kV] || p.eV > nw[kV].eta) nw[kV] = { wert: Math.abs(z.V), zul: p.vZul, eta: p.eV, bez: z.bez, lastfall: z.key };
      if (!nw[kH] || p.eH > nw[kH].eta) nw[kH] = { wert: Math.abs(z.H), zul: p.hZul, eta: p.eH, bez: z.bez, lastfall: z.key };
      if (!mg || p.eta > mg.eta) mg = { ...p, z };
    });
    const nachweise = [
      ['Vzug', 'V Zug (abhebend)', 'kN'], ['Hzug', 'H_l bei Zug', 'kN'],
      ['Vdruck', 'V Druck', 'kN'], ['Hdruck', 'H_l bei Druck', 'kN'],
    ].filter(([k]) => nw[k]).map(([k, was, einheit]) => ({ key: k, was, kurz: was, einheit, ...nw[k] }));
    const m = nachweise.reduce((b, n) => (!b || n.eta > b.eta ? n : b), null);
    return { typ: typ.typ, abmessung: typ.abmessung ?? '', eta: mg.eta, ok: mg.eta <= 1 + 1e-9,
             nachweise, massgebend: m, steil };
  };
  if (o.gewaehlt) {
    const t = liste.find((x) => x.typ === o.gewaehlt);
    if (t) return { ...auswerten(t), gewaehlt: true };
  }
  for (const t of liste) {
    const r = auswerten(t);
    if (r.ok) return { ...r, gewaehlt: false };
  }
  return { ...auswerten(liste[liste.length - 1]), gewaehlt: false, keinerReicht: true };
}
