/**
 * core.stabschraube.js
 * ---------------------------------------------------------------------------
 * >>> EINSPANNUNG DES JOCHS BIS ZUR GRENZE DER HAKENSCHRAUBEN (17. November). <<<
 *
 * Befund am Übungsbeispiel 1 (J100 / 21.5 m, HEB 260): voll eingespannt
 * tragen die Gurtanschlüsse am Masten 57.5 kN je Gurt, zulässig sind
 * F_Grenz = 24 kN; wie gebaut 3.2 kN. Auf Rückfrage «bis zur
 * schraubengrenze», dazu: «beide gurte gleich begrenzen wenn das einen
 * einfluss hat auf den einspanngrad. sonst belassen um die performance nicht
 * einzubüsen. der grenzwert gilt global für alle typen und längen.»
 *
 * WAS GERECHNET WIRD. Der Anschluss ist eingespannt wie «eingespannt»
 * (beide Gurte halten x, y, z und K_XX) - nur die Kraft in der JOCHACHSE
 * (x) je Gurtanschluss ist höchstens F_Grenz. Darüber gleitet der Anschluss:
 * es wirkt genau F_Grenz, und der Gurt bewegt sich gegenüber dem Masten.
 * Die Einspannung stellt sich damit je Modell von selbst ein - ohne Tabelle
 * je Jochtyp oder Länge, und ohne Schleife.
 *
 * WIE: derselbe begrenzte Halt wie die Rückhaltekraft der Leiter
 * (`begrenzterHalt`, core.stabrueckhalt.js). Das Linkelement gibt x frei; je
 * Anschluss ein HILFSLASTFALL - ein Kräftepaar 1 kN in x an den beiden
 * Knoten des Links (`Schraube|<Link>|<F_Grenz>`). Der Löser rechnet die
 * Hilfsfälle auf derselben Matrix mit; je Kombination ein kleines
 * Gleichungssystem (gehalten = Gleitweg 0, ausgeschöpft = ±F_Grenz). Das
 * Ergebnis steht als Faktor des Hilfsfalls in `dat.kombinationen` - alle
 * Nachweise lesen es über `anteileFuer`, und AxisVM rechnet die Datei
 * LINEAR nach.
 *
 * WELCHE GURTE: nur der Untergurt (gemessen, siehe GURTE unten).
 * ---------------------------------------------------------------------------
 */

import { BUEGEL_LINK } from './core.stabnachweis.js';

/** Vorsilbe der Hilfsfälle - einer je Gurtanschluss. */
export const SCHRAUBE_FALL = 'Schraube|';
/** Grenzlast je Gurtanschluss, ohne Eintrag [kN] (global für alle Typen). */
export const F_GRENZ_VORGABE = 24;

/*
 * NUR DER UNTERGURT (gemessen am 17. November, Übungsbeispiel 1, J100 /
 * 21.5 m, HEB 260): voll eingespannt 57.5 kN am Untergurt, 50.2 kN am
 * Obergurt; mit dem Untergurt begrenzt trägt er genau 24.0 kN und der
 * Obergurt 3.2 kN - so viel wie «wie gebaut». Die Grenze am Obergurt griffe
 * nie und änderte den Einspanngrad nicht; dazu wären beide Gurte in x frei,
 * hätte das Joch in Jochachse keinen festen Halt mehr (singuläres System).
 * Weisung: «sonst belassen um die performance nicht einzubüsen». Die Kraft
 * am Obergurt prüft weiter der Nachweis der Bügelschrauben.
 *
 * RECHENZEIT: jeder Hilfsfall wird gelöst wie ein Lastfall (Einsetzen mit
 * Nachiteration, Stabkräfte). Vier Hilfsfälle (zwei Masten, links / rechts)
 * kosten am Beispiel rund 0.3 s je Rechnung (0.5 → 0.8 s), nur wenn die
 * Stufe gewählt ist; ein Wechsel von Typ oder Länge kostet nichts dazu.
 */
export const GURTE = ['UG'];

/** Ist der Anschluss dieses Satzes «eingespannt bis zur Schraubengrenze»? */
export const schraubenGrenzeAn = (satz) => satz?.auflagerLinks?.schraubenGrenze === true;

/** F_Grenz eines Satzes [kN]. */
export function fGrenzVon(satz) {
  const f = Number(satz?.schraubenFgrenz);
  return f > 0 ? f : F_GRENZ_VORGABE;
}

/**
 * Setzt die Hilfsfälle in die Modelldatei, VOR dem Lösen. Gibt die Zahl der
 * begrenzten Anschlüsse zurück. Zweimal gerufen tut es nichts mehr.
 *
 * @param {object} dat  Modelldatei (stabmodellJson)
 * @param {Array<object>} eingaben  die Sätze der Tragwerke, das aktive zuerst
 */
export function schraubenGrenzeEinsetzen(dat, eingaben) {
  if (!dat?.staebe || !eingaben?.length) return 0;
  const punkt = dat.lasten?.punkt ?? [];
  if (punkt.some((l) => String(l.lastfall ?? '').startsWith(SCHRAUBE_FALL))) return 0;
  const satzFuer = (praefix) => {
    if (!praefix) return eingaben[0];
    const tw = praefix.replace(/_$/, '');
    return eingaben.find((s) => s.twId === tw) ?? null;
  };
  const faelle = [];
  const kn = new Map((dat.knoten ?? []).map((k) => [k.name, k]));
  const moment = dat.lasten?.moment ?? [];
  dat.staebe.forEach((s) => {
    if (s.art !== 'link') return;
    const m = BUEGEL_LINK.exec(s.name ?? '');
    if (!m) return;
    const satz = satzFuer(m[1]);
    if (!schraubenGrenzeAn(satz) || !GURTE.includes(m[3])) return;
    const key = `${SCHRAUBE_FALL}${s.name}|${fGrenzVon(satz).toFixed(4)}`;
    s.kraftuebertragung = { ...(s.kraftuebertragung ?? {}), x: 'Free' };
    /*
     * Kräftepaar: +1 am Gurt, −1 am Masten - die Arbeit ist der Gleitweg.
     * DER GLEITWEG IN DER LINKMITTE: der Löser koppelt jedes Link in seiner
     * Mitte (Hebel L/2 an beiden Knoten, 26. September). Ohne die Momente
     * r × e_x an beiden Knoten mässe der Hilfsfall den Weg an den Knoten,
     * und «gehalten» wäre nicht dasselbe wie «starr» (gemessen: 19.9 statt
     * 20.4 kN am Startjoch, bei nicht greifender Grenze).
     */
    punkt.push({ name: `SG_${s.name}_B`, knoten: s.bis, richtung: 'X', wert: 1, lastfall: key });
    punkt.push({ name: `SG_${s.name}_A`, knoten: s.von, richtung: 'X', wert: -1, lastfall: key });
    const kA = kn.get(s.von); const kB = kn.get(s.bis);
    if (kA && kB) {
      const mz = (kA.z + kB.z) / 2;  const my = (kA.y + kB.y) / 2;
      // (r × e_x) = (0, r_z, −r_y); am Masten mit −.
      const m = (k, vz) => {
        const rz = mz - k.z; const ry = my - k.y;
        if (Math.abs(rz) > 1e-12) moment.push({ name: `SG_${s.name}_${k.name}_My`, knoten: k.name, richtung: 'My', wert: vz * rz, lastfall: key });
        if (Math.abs(ry) > 1e-12) moment.push({ name: `SG_${s.name}_${k.name}_Mz`, knoten: k.name, richtung: 'Mz', wert: -vz * ry, lastfall: key });
      };
      m(kB, +1); m(kA, -1);
    }
    faelle.push({ key, label: `Schraube ${s.name} (Hilfsfall, 1 kN in x)`, art: 'Others', hilfsfall: true });
  });
  if (!faelle.length) return 0;
  dat.lasten = { ...(dat.lasten ?? {}), punkt, moment };
  dat.lastfaelle = [...(dat.lastfaelle ?? []), ...faelle];
  return faelle.length;
}

/** Je Kombination ohne Skalierung: die Grenze gilt jedem Lastniveau gleich. */
export const SCHRAUBE_SKALA = () => 1;
