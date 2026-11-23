/*
 * >>> AUSGANGSZUSTAND UND ÄNDERUNGSPROTOKOLL DER BAUTEILTYPEN (23. November). <<<
 *
 * Weisung, im Wortlaut: «einen änderungsprotokoll für die bauteiltypen
 * müsste man noch aufführen, gilt primär für masten und joche», auf den
 * Vorschlag (Ausgangszustand beim ersten Speichern oder Einlesen): «ich finde
 * es gut, es wäre aber auch noch praktisch dass sich die app jede relevante
 * anpassung merkt in einem protokoll unabhängig diesen outputs, dann kann
 * man auch den ausgangzustand auch anpassen nachträglich, es kann sein das
 * der skill ein tragwerk falsch interpretiert und ich es dann von hand
 * anpasse.»
 *
 * Ein Eintrag der Ablage trägt dafür zwei Felder:
 *   ausgang    der Stand der Bauteiltypen beim ersten Speichern / Einlesen
 *              (nachträglich neu setzbar, `ausgangSetzen`)
 *   protokoll  je Speichern mit einer Änderung an den Bauteiltypen ein
 *              Eintrag {datum, art, aenderungen: [{wer, feld, alt, neu}]}
 * Verglichen werden nur die Bauteiltypen (Masten, Joche, Ausleger,
 * Fundamente, Anker) - keine Lasten, keine Anbauteile.
 */
import { mastenVon, mastName, sichtbareTragwerke, tragwerksart, tragwerkPos } from './core.constants.js';

const zahl = (v) => (Number.isFinite(Number(v)) && Number(v) !== 0 ? Number(v).toFixed(2) : '');

/** Die Bauteiltypen eines Blattes: was das Protokoll vergleicht. */
export function bauteilStand(w) {
  const stand = { tragwerke: {}, masten: {} };
  if (!w) return stand;
  try {
    sichtbareTragwerke(w).forEach((t) => {
      const art = tragwerksart(t);
      const typ = art.key === 'abfangjoch' ? (t.abfangTyp ?? '') : art.key === 'joch' ? (t.typ ?? '') : '';
      stand.tragwerke[tragwerkPos(w, t)] = {
        Art: art.label, Typ: typ,
        'Länge [m]': art.key === 'einzelmast' ? '' : zahl(t.L),
        'Höhe [m]': art.key === 'einzelmast' ? '' : zahl(t.mastH),
      };
    });
    mastenVon(w).forEach((m) => {
      stand.masten[mastName(w, m)] = {
        Profil: m.profil ?? '', 'Länge [m]': zahl(m.laenge) || 'Vorgabe',
        Steg: m.steg === 'quer' ? 'quer' : 'Jochachse',
        Fundament: m.fundament || 'nach Masttyp',
        Anker: m.anker?.typ ?? '',
      };
    });
  } catch { /* ein unlesbarer Stand vergleicht leer */ }
  return stand;
}

/** Was sich zwischen zwei Ständen geändert hat, je Bauteil und Feld. */
export function bauteilAenderungen(alt, neu) {
  const liste = [];
  ['tragwerke', 'masten'].forEach((gruppe) => {
    const a = alt?.[gruppe] ?? {}, n = neu?.[gruppe] ?? {};
    new Set([...Object.keys(a), ...Object.keys(n)]).forEach((wer) => {
      if (!a[wer]) { liste.push({ wer, feld: 'neu', alt: '', neu: Object.values(n[wer]).filter(Boolean).join(' · ') }); return; }
      if (!n[wer]) { liste.push({ wer, feld: 'entfernt', alt: Object.values(a[wer]).filter(Boolean).join(' · '), neu: '' }); return; }
      new Set([...Object.keys(a[wer]), ...Object.keys(n[wer])]).forEach((feld) => {
        const x = String(a[wer][feld] ?? ''), y = String(n[wer][feld] ?? '');
        if (x !== y) liste.push({ wer, feld, alt: x, neu: y });
      });
    });
  });
  return liste;
}

/**
 * Beim Speichern: Ausgangszustand setzen, wo keiner ist, und eine Änderung
 * gegenüber dem vorher gespeicherten Stand ins Protokoll schreiben.
 */
export function protokollNachfuehren(vorher, satz, jetzt = new Date().toISOString()) {
  const stand = bauteilStand(satz.werte);
  const ausgang = satz.ausgang ?? vorher?.ausgang ?? { datum: jetzt, stand };
  const protokoll = [...(satz.protokoll ?? vorher?.protokoll ?? [])];
  if (vorher?.werte) {
    const aenderungen = bauteilAenderungen(bauteilStand(vorher.werte), stand);
    if (aenderungen.length) protokoll.push({ datum: jetzt, art: 'geaendert', aenderungen });
  } else if (!protokoll.length) {
    protokoll.push({ datum: jetzt, art: 'ausgang', aenderungen: [] });
  }
  return { ausgang, protokoll };
}

/** Den jetzigen Stand als Ausgangszustand übernehmen (von Hand, mit Vermerk). */
export function ausgangSetzen(satz, grund = '', jetzt = new Date().toISOString()) {
  const stand = bauteilStand(satz.werte);
  const vorher = satz.ausgang?.stand ?? null;
  return {
    ausgang: { datum: jetzt, stand, vonHand: true, grund },
    protokoll: [...(satz.protokoll ?? []), { datum: jetzt, art: 'ausgang-neu', grund,
      aenderungen: vorher ? bauteilAenderungen(vorher, stand) : [] }],
  };
}

/** Abweichungen des jetzigen Stands vom Ausgangszustand. */
export function seitAusgang(satz) {
  if (!satz?.ausgang?.stand) return [];
  return bauteilAenderungen(satz.ausgang.stand, bauteilStand(satz.werte));
}
