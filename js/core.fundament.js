/**
 * core.fundament.js
 * ---------------------------------------------------------------------------
 * DER NACHWEIS DES MASTFUNDAMENTS GEGEN DIE ZULÄSSIGEN STANDARDLASTEN.
 *
 * Weisung vom 24. September, im Wortlaut:
 *
 *   «die Fundamentzuordnug zu den einzelnen Masttypen. Diese kannst du unter
 *    Grundlagen Einwirkungen finden im pdf zulässige Standardlsten (die
 *    Gelä[nde]neigung nicht berücksichtigen. die Fundamente auch noch separat
 *    als ausnutzungsbeiwert in die nachweisführung aufnehmen
 *    (gesamtheitliche Tragwerksbetrachtung). diesen nachweis auch unter
 *    optionen ausschaltbar machen.»
 *
 * >>> WARUM EINE EIGENE DATEI, UND WARUM NEBEN core.anker.js. <<<
 *
 * Es ist dieselbe Bauart: eine Auswertung ÜBER LASTFÄLLE, nicht eine
 * Rechnung am Querschnitt. Kombinationen hinein, Nachweis heraus. Und es ist
 * derselbe Nachweistyp — eine charakteristische Einwirkung gegen eine
 * ZULÄSSIGE Last, ohne Teilsicherheitsbeiwerte auf beiden Seiten.
 *
 * >>> DIE TABELLE HAT ZWEI SPALTENPAARE, UND DAS IST KEIN ZUFALL. <<<
 *
 * Für das Moment quer und die Horizontalkraft quer führt die Quelle je eine
 * Spalte «ständig und veränderlich» und eine «veränderlich» allein. Die
 * zweite ist die schärfere: sie begrenzt den Anteil, der aus Wind und Schnee
 * kommt, unabhängig davon, wie viel ständige Last daneben steht.
 *
 * Beide Spalten haben in diesem Werkzeug einen Lastfall, der genau sie
 * trifft — die charakteristischen Fälle führen den Wind mit Beiwert 1,
 * einmal MIT ständiger Last («Ständig + Wind +y») und einmal OHNE
 * («Wind +y»). Es muss also nichts zerlegt werden; es muss nur die richtige
 * Gruppe gegriffen werden.
 *
 * >>> QUER UND LÄNGS WERDEN NICHT ÜBERLAGERT. <<<
 *
 * Die Quelle sagt es ausdrücklich: «Die Lasten quer und längs zum Gleis
 * treten nicht gleichzeitig in voller Grösse auf. Lastkombinationen quer und
 * längs zum Gleis werden genügend abgedeckt, wenn die Nachweise für die
 * maximalen Lasten quer und längs zum Gleis einzeln erbracht werden.»
 *
 * Deshalb steht hier keine Interaktionsformel, sondern eine Liste von
 * Einzelnachweisen — und das Urteil ist das Maximum über sie.
 *
 * >>> DIE GELÄNDENEIGUNG BLEIBT DRAUSSEN (Weisung). <<<
 *
 * Die Quelle führt zwei Blöcke: bis 14° und von 14° bis 33°. Übernommen ist
 * der erste. Im zweiten sind die Werte Richtung fallender Böschung kleiner
 * (dort steht «+ 200 / − 153» statt «+/− 200»); wer an einer Böschung baut,
 * rechnet hiermit auf der unsicheren Seite. Der Hinweis in `hinweise` sagt
 * es, damit es nicht stillschweigend geschieht.
 * ---------------------------------------------------------------------------
 */

import { getFundament, fundamentFuerMast, fundamenteDa } from './data.masten.js';

/**
 * WELCHE LASTFÄLLE GEGEN DIE ZULÄSSIGE LAST LAUFEN.
 *
 * Dieselbe Liste wie beim Seilanker (`ANKER_FALLARTEN`), und aus demselben
 * Grund: die charakteristischen Fälle tragen alle Beiwerte 1, der
 * Havariefall ebenso. Was NICHT hineingehört, sind die Kombinationen des
 * Tragsicherheitsnachweises — sie tragen γ_G und γ_Q, und die gehören nicht
 * gegen eine zulässige Last.
 *
 * Dass der Havariefall dazugehört, ist der Entscheid vom 24. September zum
 * Anker: «ja, gegen dieselbe zulässige Kraft». Ein Fundament, das den
 * Leiterriss nicht sieht, wäre bei beidseitiger Abfangung um ein Vielfaches
 * zu günstig nachgewiesen — dort entsteht die grosse Kraft erst beim Riss.
 */
export const FUNDAMENT_FALLARTEN = ['charakteristisch', 'aussergewoehnlich'];

/**
 * DIE EINZELNACHWEISE, an einer Stelle.
 *
 *   feld     die Schnittgrösse am Mastfuss
 *   zul      die Spalte der Tabelle
 *   nurVer   true: nur die Lastfälle OHNE ständige Last
 *
 * `F_x` wirkt in der Jochachse, also QUER zum Gleis, und gehört zu `M_yy`
 * (Moment um die y-Achse). Die Quelle sagt dasselbe in ihrer Sprache:
 * «Hq in x-Richtung mit Mq um y-Achse». `F_y` und `M_xx` sind die
 * Gleisrichtung, `M_zz` die Torsion.
 */
export const FUNDAMENT_NACHWEISE = [
  { key: 'V',     feld: 'Fz',  zul: 'Vmax',   was: 'Vertikalkraft V', kurz: 'V',
    einheit: 'kN' },
  { key: 'Mq',    feld: 'Myy', zul: 'Mq',     was: 'Moment quer zum Gleis M_q', kurz: 'M_q',
    einheit: 'kNm' },
  { key: 'Mqver', feld: 'Myy', zul: 'Mq_ver', was: 'Moment quer, veränderlicher Anteil', kurz: 'M_q veränderlich',
    einheit: 'kNm', nurVer: true },
  { key: 'Ml',    feld: 'Mxx', zul: 'Ml',     was: 'Moment längs zum Gleis M_l', kurz: 'M_l',
    einheit: 'kNm' },
  { key: 'Hq',    feld: 'Fx',  zul: 'Hq',     was: 'Horizontalkraft quer H_q', kurz: 'H_q',
    einheit: 'kN' },
  { key: 'Hqver', feld: 'Fx',  zul: 'Hq_ver', was: 'Horizontalkraft quer, veränderlicher Anteil', kurz: 'H_q veränderlich',
    einheit: 'kN', nurVer: true },
  { key: 'Hl',    feld: 'Fy',  zul: 'Hl',     was: 'Horizontalkraft längs H_l', kurz: 'H_l',
    einheit: 'kN' },
  { key: 'T',     feld: 'Mzz', zul: 'T',      was: 'Torsionsmoment T', kurz: 'T',
    einheit: 'kNm' },
];

/**
 * Trägt dieser Lastfall ständige Last?
 *
 * Gefragt wird der Beiwert, nicht der Name: `G` ist die Gruppe der ständigen
 * Einwirkungen, und ein Fall ohne sie ist ein rein veränderlicher.
 */
function nurVeraenderlich(lf) {
  const b = lf?.beiwerte ?? {};
  return !(Math.abs(Number(b.G) || 0) > 1e-12);
}

/**
 * DAS FUNDAMENT EINES MASTEN BESTIMMEN.
 *
 * Eingetragen geht vor gefunden: wer den Typ in der Mastkachel wählt, hat
 * einen Grund dafür (Bestand, Sonderfall). Steht dort nichts oder
 * «automatisch», entscheiden Profil und Stegrichtung.
 *
 * @returns {{typ:object, gewaehlt:boolean}|null}
 */
export function fundamentVon(mast) {
  const eigen = String(mast?.fundament ?? '').trim();
  if (eigen && eigen !== 'auto') {
    const t = getFundament(eigen);
    if (t) return { typ: t, gewaehlt: true };
  }
  const t = fundamentFuerMast(mast?.profil, mast?.stegrichtung ?? mast?.steg);
  return t ? { typ: t, gewaehlt: false } : null;
}

/**
 * DER NACHWEIS.
 *
 * @param {object} kombi  Ergebnis aus `vergleichKombinationen`
 * @param {object} satz   der gerechnete Satz (für die Mastangaben)
 * @returns {object|null} je Ende die Nachweise, oder null
 */
export function fundamentNachweis(kombi, satz) {
  if (!fundamenteDa()) return null;
  const lf = (kombi?.lastfaelle ?? []).filter(
    (l) => FUNDAMENT_FALLARTEN.includes(l.art));
  if (!lf.length) return null;

  const proEnde = {};
  ['A', 'B'].forEach((ende) => {
    const erstes = kombi.ergebnisse?.[lf[0].key]?.mast?.[ende];
    if (!erstes) return;
    /*
     * >>> DIE ANGABEN KOMMEN AUS DEM MASTERGEBNIS. <<<
     *
     * Nicht aus dem flachen Satz: die beiden Enden eines Jochs stehen
     * selten auf demselben Masten, und Profil wie Stegrichtung können
     * sich unterscheiden (seit dem 13. September führt `mastSchnitt` sie
     * je Ende mit). Genau daran hängt hier die Zuordnung: ein HEM 240
     * quer und einer längs bekommen verschiedene Fundamente.
     *
     * Der WUNSCH des Benutzers steht dagegen im Satz - ein Typ, den er in
     * der Mastkachel gewählt hat. Er geht vor (siehe `fundamentVon`).
     */
    const mast = {
      profil: erstes.profil?.name ?? satz?.mastProfil,
      stegrichtung: erstes.stegrichtung?.key ?? satz?.mastSteg,
      fundament: (ende === 'B' ? satz?.mastFundamentB : null)
                 || satz?.mastFundament,
    };
    const f = fundamentVon(mast);
    if (!f) {
      proEnde[ende] = { fehlt: true, profil: mast?.profil ?? null };
      return;
    }

    /*
     * DIE HÜLLKURVE JE GRÖSSE - und die grösste steht mit ihrem Lastfall da.
     * Gesucht ist der BETRAG: die Tabelle führt ihre Werte als «+/−», und
     * ein Moment nach der einen Seite belastet das Fundament wie eines nach
     * der anderen (die Geländeneigung, die daran etwas ändern würde, ist
     * auf Weisung draussen).
     */
    const groesste = (feld, nurVer) => {
      let best = null;
      lf.forEach((l) => {
        if (nurVer && !nurVeraenderlich(l)) return;
        const st = kombi.ergebnisse?.[l.key]?.mast?.[ende]?.stationen?.[0];
        if (!st) return;
        const wert = Math.abs(Number(st[feld]) || 0);
        if (!best || wert > best.wert) {
          best = { wert, lastfall: l.key, bez: l.bez, vorzeichen: Math.sign(Number(st[feld]) || 0) };
        }
      });
      return best;
    };

    const nw = [];
    FUNDAMENT_NACHWEISE.forEach((n) => {
      const zul = Number(f.typ[n.zul]);
      if (!(zul > 0)) return;
      const mess = groesste(n.feld, n.nurVer === true);
      if (!mess) return;
      nw.push({ ...n, zul, wert: mess.wert, eta: mess.wert / zul,
                ok: mess.wert <= zul + 1e-12,
                lastfall: mess.lastfall, bez: mess.bez,
                vorzeichen: mess.vorzeichen });
    });
    if (!nw.length) return;
    const schlimmste = nw.reduce((a, b) => (b.eta > a.eta ? b : a));

    /*
     * >>> ABHEBEN IST KEIN NACHWEIS, SONDERN EIN BEFUND. <<<
     *
     * Die Tabelle gilt für V zwischen 0 und 150 kN. Eine abhebende
     * Vertikalkraft liegt ausserhalb - nicht «zu gross», sondern gar nicht
     * abgedeckt. Sie wird deshalb genannt und nicht in ein η gerechnet.
     */
    let abheben = null;
    lf.forEach((l) => {
      const st = kombi.ergebnisse?.[l.key]?.mast?.[ende]?.stationen?.[0];
      const fz = Number(st?.Fz);
      if (!Number.isFinite(fz) || fz >= -1e-9) return;
      if (!abheben || fz < abheben.wert) abheben = { wert: fz, bez: l.bez };
    });

    proEnde[ende] = {
      typ: f.typ, gewaehlt: f.gewaehlt, nachweise: nw,
      massgebend: schlimmste, eta: schlimmste.eta,
      ok: nw.every((q) => q.ok), abheben,
    };
  });

  const enden = Object.values(proEnde).filter((e) => !e.fehlt && e.nachweise);
  if (!enden.length) {
    // Nur «kein Standardfundament» - die Auskunft bleibt, das Urteil nicht.
    const fehlend = Object.values(proEnde).filter((e) => e.fehlt);
    return fehlend.length ? { ...proEnde, eta: 0, ok: true, ohneTyp: true } : null;
  }
  return {
    ...proEnde,
    eta: Math.max(...enden.map((e) => e.eta)),
    ok: enden.every((e) => e.ok),
  };
}
