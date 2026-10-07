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

import { getFundament, fundamentFuerMast, fundamenteDa, fundamentWerte,
         gelaendeVon } from './data.masten.js';

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
  // Seit dem Ablauf (7. Oktober): die ständigen Anteile allein und die
  // veränderlichen längs - nur wo die Tabelle sie führt.
  { key: 'Mqst',  feld: 'Myy', zul: 'Mq_st',  was: 'Moment quer, ständiger Anteil', kurz: 'M_q ständig',
    einheit: 'kNm', nurSt: true },
  { key: 'Hqst',  feld: 'Fx',  zul: 'Hq_st',  was: 'Horizontalkraft quer, ständiger Anteil', kurz: 'H_q ständig',
    einheit: 'kN', nurSt: true },
  { key: 'Mlst',  feld: 'Mxx', zul: 'Ml_st',  was: 'Moment längs, ständiger Anteil', kurz: 'M_l ständig',
    einheit: 'kNm', nurSt: true },
  { key: 'Mlver', feld: 'Mxx', zul: 'Ml_ver', was: 'Moment längs, veränderlicher Anteil', kurz: 'M_l veränderlich',
    einheit: 'kNm', nurVer: true },
  { key: 'Hlst',  feld: 'Fy',  zul: 'Hl_st',  was: 'Horizontalkraft längs, ständiger Anteil', kurz: 'H_l ständig',
    einheit: 'kN', nurSt: true },
  { key: 'Hlver', feld: 'Fy',  zul: 'Hl_ver', was: 'Horizontalkraft längs, veränderlicher Anteil', kurz: 'H_l veränderlich',
    einheit: 'kN', nurVer: true },
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
 * Trägt dieser Lastfall NUR ständige Last? Das sind «Ständig (Tragwerk)» und
 * «Ablenkkräfte ständig» - zusammen das ganze G (7. Oktober, für den Ablauf).
 */
function nurStaendig(lf) {
  if (lf?.art !== 'charakteristisch') return false;
  const b = lf?.beiwerte ?? {};
  return Math.abs(Number(b.G) || 0) > 1e-12
    && Object.entries(b).every(([k, v]) => k === 'G' || !(Math.abs(Number(v) || 0) > 1e-12));
}
/* ===========================================================================
 * >>> DER ABLAUF DER FUNDAMENTBESTIMMUNG (7. Oktober). <<<
 * ===========================================================================
 *
 * Weisung: «bei den zulässigen standardlasten gibt es einen flow der bei
 * einer überschreitung der einzelnen werte die kompensation infolge der
 * abminderung der übrigen werte vornimmt», dann «fundamentflow und gelände
 * >14° einbauen». Nachgebaut nach der alten Maststatik-Mappe (Blatt der
 * Fundamentbestimmung, 19 Schritte), je Richtung - quer und längs zum
 * Gleis - für sich:
 *
 *   1   alle Basiswerte eingehalten                      → zulässig
 *   2   V, M_tot oder T überschritten                     → grösserer Typ
 *   3   M_ver über seiner Grenze                          → grösserer Typ
 *   4   H_tot überschritten?          ja → 9,  nein → 5
 *   5   H_ver überschritten?          ja → 10/11, nein → 6
 *   6   M_ver überschritten?          ja → 7/8, nein → zulässig
 *   7   M_st,zul,neu1 = M_st,zul − (M_ver − M_ver,zul)·red_M
 *   8   M_st > M_st,zul,neu1          → grösserer Typ, sonst zulässig
 *   9   H_ver überschritten?          ja → 12/14/15, nein → 13/15
 *   10  H_st,zul,neu = H_st,zul − (H_ver − H_ver,zul)·red_M
 *   11  H_st > H_st,zul,neu            ja → 12/14/15, nein → 6
 *   12  H_tot,fiktiv = H_tot + (H_ver − H_ver,zul)·red_M + (H_st − H_st,zul bzw. ,neu)
 *   13  M_tot,zul,neu = M_tot,zul − (H_tot − H_tot,zul)·red_H
 *   14  M_tot,zul,neu = M_tot,zul − (H_tot,fiktiv − H_tot,zul)·red_H
 *   15  M_tot > M_tot,zul,neu         → grösserer Typ, sonst 16/17
 *   16  M_ver,zul,neu = M_tot,zul,neu·%ver ; M_st,zul,neu1 = M_tot,zul,neu·%st
 *   17  M_ver > M_ver,zul,neu         ja → 18/19, nein → zulässig
 *   18  M_st,zul,neu2 = M_st,zul,neu1 − (M_ver − M_ver,zul,neu)·red_M
 *   19  M_st > M_st,zul,neu2          → grösserer Typ, sonst zulässig
 *
 * Kern der Regel: eine Überschreitung beim veränderlichen Anteil wird durch
 * Abminderung des zulässigen ständigen Anteils ausgeglichen (red_M, kNm je
 * kNm), eine Überschreitung der Horizontalkraft durch Abminderung des
 * zulässigen Moments (red_H, kNm je kN). V, T, M_tot und die Grenze des
 * veränderlichen Moments bleiben hart.
 *
 * ⚠ Zwei Stellen übernommen, wie die Zellen der Mappe rechnen (nicht wie
 * ihre Formeltafel schreibt): Schritt 12 ADDIERT den Überschuss des
 * veränderlichen Anteils (sichere Seite), und Schritt 10 mindert mit dem
 * Abminderungswert der Momente (red_M). Dem Auftraggeber zur Bestätigung
 * vorgelegt.
 *
 * Das η des Ablaufs ist das grösste Verhältnis der Prüfungen, die auf dem
 * Weg EINGEHALTEN sein müssen. Eine Überschreitung, die der Ablauf
 * ausgleicht (Schritte 4, 5, 6, 9, 11, 17 mit «ja»), zählt nicht - sie ist
 * der Grund für die Abminderung, nicht ihr Ergebnis.
 */
const EPS = 1e-9;

/**
 * @param {object} e  vorhandene Werte {Mst, Mver, Mtot, Hst, Hver, Htot, V, T}
 * @param {object} z  zulässige Werte {Mst, Mver, Mtot, Hst, Hver, Htot, V, T,
 *                    Mvermax, redM, redH}
 * @returns {{ergebnis:'basis'|'angepasst'|'nicht', schritt:number, eta:number,
 *            schritte:Array, massgebend:object}}
 */
export function fundamentAblauf(e, z) {
  const schritte = [];
  const pruef = [];          // was eingehalten sein muss: {was, wert, zul}
  const notiere = (nr, text, extra = {}) => schritte.push({ nr, text, ...extra });
  const muss = (was, wert, zul) => pruef.push({ was, wert, zul, eta: zul > 0 ? wert / zul : (wert > EPS ? Infinity : 0) });
  const ueber = (wert, zul) => wert > zul + EPS;
  const ende = (ergebnis, schritt) => {
    const m = pruef.reduce((a, b) => (!a || b.eta > a.eta ? b : a), null)
      ?? { was: '–', wert: 0, zul: 1, eta: 0 };
    return { ergebnis, schritt, eta: m.eta, massgebend: m, schritte };
  };

  // 1 - alle Basiswerte
  const basis = [['V', e.V, z.V], ['M_st', e.Mst, z.Mst], ['H_st', e.Hst, z.Hst],
    ['M_ver', e.Mver, z.Mver], ['H_ver', e.Hver, z.Hver], ['M_tot', e.Mtot, z.Mtot],
    ['H_tot', e.Htot, z.Htot], ['T', e.T, z.T]];
  if (basis.every(([, w, zz]) => !ueber(w, zz))) {
    basis.forEach(([was, w, zz]) => muss(was, w, zz));
    notiere(1, 'alle Basiswerte eingehalten');
    return ende('basis', 1);
  }
  notiere(1, 'Basiswerte nicht alle eingehalten');
  // 2 - harte Grenzen
  muss('V', e.V, z.V); muss('M_tot', e.Mtot, z.Mtot); muss('T', e.T, z.T);
  if (ueber(e.V, z.V) || ueber(e.Mtot, z.Mtot) || ueber(e.T, z.T)) {
    notiere(2, 'V, M_tot oder T über dem zulässigen Wert');
    return ende('nicht', 2);
  }
  notiere(2, 'V, M_tot und T eingehalten');
  // 3 - Grenze des veränderlichen Moments
  muss('M_ver gegen Grenze', e.Mver, z.Mvermax);
  if (ueber(e.Mver, z.Mvermax)) {
    notiere(3, 'M_ver über seiner Grenze');
    return ende('nicht', 3);
  }
  notiere(3, 'M_ver unter seiner Grenze');

  // 6 - 8: veränderliches Moment, ausgeglichen über das ständige
  const schritt6 = () => {
    if (!ueber(e.Mver, z.Mver)) {
      muss('M_ver', e.Mver, z.Mver);
      notiere(6, 'M_ver eingehalten');
      return ende('angepasst', 6);
    }
    const neu1 = z.Mst - (e.Mver - z.Mver) * z.redM;
    notiere(7, 'M_st,zul abgemindert', { wert: neu1 });
    muss('M_st gegen M_st,zul,neu1', e.Mst, neu1);
    if (ueber(e.Mst, neu1)) { notiere(8, 'M_st über dem abgeminderten Wert'); return ende('nicht', 8); }
    notiere(8, 'M_st unter dem abgeminderten Wert');
    return ende('angepasst', 8);
  };
  // 13/14 - 19: Horizontalkraft, ausgeglichen über das Gesamtmoment
  const schritt15 = (Hwirk, nr) => {
    const MtotNeu = z.Mtot - (Hwirk - z.Htot) * z.redH;
    notiere(nr, nr === 14 ? 'M_tot,zul abgemindert mit H_tot,fiktiv' : 'M_tot,zul abgemindert mit H_tot',
      { wert: MtotNeu });
    muss('M_tot gegen M_tot,zul,neu', e.Mtot, MtotNeu);
    if (ueber(e.Mtot, MtotNeu)) { notiere(15, 'M_tot über dem abgeminderten Wert'); return ende('nicht', 15); }
    notiere(15, 'M_tot unter dem abgeminderten Wert');
    const anteilVer = z.Mtot > 0 ? z.Mver / z.Mtot : 0;
    const anteilSt = z.Mtot > 0 ? z.Mst / z.Mtot : 0;
    const MverNeu = MtotNeu * anteilVer, MstNeu1 = MtotNeu * anteilSt;
    notiere(16, 'Anteile ständig / veränderlich am abgeminderten M_tot', { wert: MverNeu });
    if (!ueber(e.Mver, MverNeu)) {
      muss('M_ver gegen M_ver,zul,neu', e.Mver, MverNeu);
      notiere(17, 'M_ver eingehalten');
      return ende('angepasst', 17);
    }
    notiere(17, 'M_ver über dem abgeminderten Wert');
    const neu2 = MstNeu1 - (e.Mver - MverNeu) * z.redM;
    notiere(18, 'M_st,zul abgemindert', { wert: neu2 });
    muss('M_st gegen M_st,zul,neu2', e.Mst, neu2);
    if (ueber(e.Mst, neu2)) { notiere(19, 'M_st über dem abgeminderten Wert'); return ende('nicht', 19); }
    notiere(19, 'M_st unter dem abgeminderten Wert');
    return ende('angepasst', 19);
  };
  const fiktiv = (HstUeberschuss) => {
    const H = e.Htot + (e.Hver - z.Hver) * z.redM + HstUeberschuss;
    notiere(12, 'H_tot,fiktiv', { wert: H });
    return schritt15(H, 14);
  };

  // 4
  if (ueber(e.Htot, z.Htot)) {
    notiere(4, 'H_tot über dem zulässigen Wert');
    // 9
    if (ueber(e.Hver, z.Hver)) { notiere(9, 'H_ver über dem zulässigen Wert'); return fiktiv(e.Hst - z.Hst); }
    notiere(9, 'H_ver eingehalten');
    muss('H_ver', e.Hver, z.Hver);
    return schritt15(e.Htot, 13);
  }
  notiere(4, 'H_tot eingehalten');
  muss('H_tot', e.Htot, z.Htot);
  // 5
  if (!ueber(e.Hver, z.Hver)) {
    notiere(5, 'H_ver eingehalten');
    muss('H_ver', e.Hver, z.Hver);
    return schritt6();
  }
  notiere(5, 'H_ver über dem zulässigen Wert');
  // 10 / 11
  const HstNeu = z.Hst - (e.Hver - z.Hver) * z.redM;
  notiere(10, 'H_st,zul abgemindert', { wert: HstNeu });
  if (ueber(e.Hst, HstNeu)) { notiere(11, 'H_st über dem abgeminderten Wert'); return fiktiv(e.Hst - HstNeu); }
  notiere(11, 'H_st unter dem abgeminderten Wert');
  muss('H_st gegen H_st,zul,neu', e.Hst, HstNeu);
  return schritt6();
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
  // Das Gelände wählt die Werte (7. Oktober); ohne Angabe bis 14°.
  const gel = gelaendeVon(mast?.gelaende).key;
  const eigen = String(mast?.fundament ?? '').trim();
  if (eigen && eigen !== 'auto') {
    const t = fundamentWerte(eigen, gel) ?? (gel === 'bis14' ? getFundament(eigen) : null);
    if (t) return { typ: t, gewaehlt: true, gelaende: gel };
    // Gewählt, aber für dieses Gelände nicht geführt: das ist eine Auskunft.
    if (getFundament(eigen) || fundamentWerte(eigen, 'bis14')) {
      return { typ: null, gewaehlt: true, gelaende: gel, nichtImGelaende: eigen };
    }
  }
  const t = fundamentFuerMast(mast?.profil, mast?.stegrichtung ?? mast?.steg, gel);
  return t ? { typ: t, gewaehlt: false, gelaende: gel } : null;
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
      gelaende: (ende === 'B' ? satz?.mastGelaendeB : null) || satz?.mastGelaende,
    };
    const f = fundamentVon(mast);
    if (!f || !f.typ) {
      proEnde[ende] = { fehlt: true, profil: mast?.profil ?? null,
                        gelaende: f?.gelaende ?? null, nichtImGelaende: f?.nichtImGelaende ?? null };
      return;
    }

    /*
     * DIE HÜLLKURVE JE GRÖSSE - und die grösste steht mit ihrem Lastfall da.
     * Gesucht ist der BETRAG: die Tabelle führt ihre Werte als «+/−», und
     * ein Moment nach der einen Seite belastet das Fundament wie eines nach
     * der anderen (die Geländeneigung, die daran etwas ändern würde, ist
     * auf Weisung draussen).
     */
    /*
     * >>> DAS GANZE G (7. Oktober). <<< Die beiden ständigen Hälften
     * zusammen - linear, also die Summe ihrer Fusskräfte mit Vorzeichen.
     */
    const staendig = (feld) => {
      let s = 0, da = false;
      lf.forEach((l) => {
        if (!nurStaendig(l)) return;
        const st = kombi.ergebnisse?.[l.key]?.mast?.[ende]?.stationen?.[0];
        if (!st) return;
        s += Number(st[feld]) || 0; da = true;
      });
      return da ? { wert: Math.abs(s), lastfall: 'staendig', bez: 'Ständig (ganzes G)',
                    vorzeichen: Math.sign(s) } : null;
    };
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

    // Das Total ist das Grösste aus den Fällen MIT ständiger Last und dem
    // ganzen G allein (das als Fall nicht dasteht).
    const total = (feld) => {
      const a = groesste(feld, false), g = staendig(feld);
      return (!a || (g && g.wert > a.wert)) ? (g ?? a) : a;
    };
    const nw = [];
    FUNDAMENT_NACHWEISE.forEach((n) => {
      const zul = Number(f.typ[n.zul]);
      if (!(zul > 0)) return;
      const mess = n.nurSt ? staendig(n.feld)
        : n.nurVer ? groesste(n.feld, true) : total(n.feld);
      if (!mess) return;
      nw.push({ ...n, zul, wert: mess.wert, eta: mess.wert / zul,
                ok: mess.wert <= zul + 1e-12,
                lastfall: mess.lastfall, bez: mess.bez,
                vorzeichen: mess.vorzeichen });
    });
    if (!nw.length) return;
    let schlimmste = nw.reduce((a, b) => (b.eta > a.eta ? b : a));

    /*
     * >>> DER ABLAUF JE RICHTUNG (7. Oktober). <<< Nur wo die Tabelle die
     * Abminderungswerte führt; sonst bleibt es bei den Einzelnachweisen.
     */
    const ablauf = {};
    const wertVon = (feld, art) => (art === 'st' ? staendig(feld)
      : art === 'ver' ? groesste(feld, true) : total(feld));
    const V = total('Fz'), T = total('Mzz');
    [['q', 'quer', 'Myy', 'Fx'], ['l', 'längs', 'Mxx', 'Fy']].forEach(([r, wort, mF, hF]) => {
      const t = f.typ;
      const z = { Mst: +t[`M${r}_st`], Mver: +t[`M${r}_ver`], Mtot: +t[`M${r}`],
                  Hst: +t[`H${r}_st`], Hver: +t[`H${r}_ver`], Htot: +t[`H${r}`],
                  V: +t.Vmax, T: +t.T, Mvermax: +t[`M${r}_vermax`],
                  redM: +t[`red_M${r}`], redH: +t[`red_H${r}`] };
      if (!Object.values(z).every((x) => Number.isFinite(x))) return;
      const quelle = { Mst: wertVon(mF, 'st'), Mver: wertVon(mF, 'ver'), Mtot: wertVon(mF, 'tot'),
                       Hst: wertVon(hF, 'st'), Hver: wertVon(hF, 'ver'), Htot: wertVon(hF, 'tot'),
                       V, T };
      const e = Object.fromEntries(Object.entries(quelle).map(([k, q]) => [k, q?.wert ?? 0]));
      const a = fundamentAblauf(e, z);
      const groesse = ({ M_st: 'Mst', M_ver: 'Mver', M_tot: 'Mtot', H_st: 'Hst', H_ver: 'Hver',
                         H_tot: 'Htot', V: 'V', T: 'T' })[a.massgebend.was.split(' ')[0]];
      const q = quelle[groesse];
      ablauf[r] = { ...a, richtung: wort, werte: e, zul: z,
        massgebend: { ...a.massgebend, groesse, lastfall: q?.lastfall, bez: q?.bez,
                      einheit: /^[MT]/.test(groesse ?? '') ? 'kNm' : 'kN' } };
    });
    const richt = Object.values(ablauf);
    let eta = schlimmste.eta, ok = nw.every((q) => q.ok), stufe = ok ? 'basis' : 'nicht';
    if (richt.length === 2) {
      const r = richt.reduce((a, b) => (b.eta > a.eta ? b : a));
      eta = r.eta;
      ok = richt.every((x) => x.ergebnis !== 'nicht');
      stufe = !ok ? 'nicht' : richt.some((x) => x.ergebnis === 'angepasst') ? 'angepasst' : 'basis';
      const m = r.massgebend;
      schlimmste = { key: `ablauf-${r.richtung}`, was: `${r.richtung}: ${m.was}`,
        kurz: `${r.richtung} · Schritt ${r.schritt}`, wert: m.wert, zul: m.zul, eta: r.eta,
        einheit: m.einheit, lastfall: m.lastfall, bez: m.bez, fall: m.lastfall };
    }

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
      typ: f.typ, gewaehlt: f.gewaehlt, gelaende: f.gelaende, nachweise: nw,
      massgebend: schlimmste, eta, ok, stufe, ablauf, abheben,
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
