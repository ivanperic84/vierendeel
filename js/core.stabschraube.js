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

import { BUEGEL_LINK, anteileFuer } from './core.stabnachweis.js';
import { rueckhaltPunkte, loeseKlein } from './core.stabrueckhalt.js';

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
  if (!dat?.staebe || !eingaben?.length || dat.hakenschrauben) return 0;
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

/* ===========================================================================
 * >>> GRENZFEDER UND MONTAGEZUSTAND (25. November). <<<
 * ===========================================================================
 * Weisung zum Weg über Hilfslastfall und Faktoren je Kombination: «dieser
 * ansatz ist nicht erwünscht, es sollte der weg mit den knotensteifigkeiten
 * gewählt werden falls möglich», auf Rückfrage «Grenzfeder automatisch».
 * Dazu der Montagezustand, im Wortlaut: «das joch wird bei der montage auf
 * das untere auflager gestellt und erst dann oben befestigt, das
 * einspannmoment erfolgt dann erst beim ausbau (anbauteile) oder dem wind.»,
 * auf Rückfrage «Weg 1» (Gegenlast im eigenen Lastfall) und «So bauen, mit
 * Vermerk».
 *
 * GRENZFEDER. Der Untergurt-Anschluss in Jochachse ist eine lineare Feder
 * K_X (Linkelement, x = Zahl). Die App sucht K_X je Tragwerk so, dass die
 * grösste Kraft einer Hakenschraube über die Bemessungskombinationen gerade
 * F_Grenz erreicht. Reicht auch ein praktisch starrer Anschluss nicht bis
 * F_Grenz, gilt K_MAX = 100 × die Steifigkeit, mit der das Tragwerk den
 * Anschluss selbst hält (Kräfte dann innerhalb rund 1 % von starr).
 * Gerechnet auf einer Lösung mit freiem Untergurt und den Einheitspaaren
 * (`schraubenGrenzeEinsetzen`): a = Gleitweg je Einheitspaar, w0 = Gleitweg
 * der Lasten; mit Feder (a + I/K) T = −w0, T = Schraubenkraft.
 *
 * MONTAGE. Das Eigengewicht (Lastfall G) trägt das Joch wie aufgestellt:
 * der Untergurt gleitet um w_G, die Schraube trägt nichts davon. In einem
 * linearen Modell mit Feder heisst das: ein eigener Lastfall «Montage» mit
 * dem Kräftepaar P = K · w_G an den Knoten des Links (Form des
 * Einheitspaars), in jeder Kombination mit dem Beiwert von G. Joch und Mast
 * sind dann unter G + Montage genau wie mit freiem Untergurt.
 * ⚠ Die Linkkraft in x zeigt unter G + Montage K · w_G statt 0 - die
 * Schraubenkraft ist Linkkraft plus Montagepaar. Nachweis und Reaktionen
 * lassen deshalb an den Links mit Montage die x-Anteile von G und Montage
 * weg (sie heben sich in der Schraube auf); die Datei vermerkt es.
 * ---------------------------------------------------------------------------
 */
export const MONTAGE_FALL = 'Montage';

/**
 * Setzt die Grenzfeder und den Montagefall in die Datei. `lsg` ist die
 * Lösung MIT den Einheitspaaren (Untergurt frei). Entfernt danach die
 * Einheitspaare - die Datei ist dann ein gewöhnliches lineares Modell.
 *
 * @param {object} dat
 * @param {object} lsg     Lösung aus loese(dat) mit den Hilfsfällen
 * @param {Array<object>} faelle  Kombinationen (lastfaelle)
 * @returns {object|null}  { K: {praefix: K}, links, montage: {link: P}, kMax }
 */
export function grenzfederEinsetzen(dat, lsg, faelle) {
  const punkte = rueckhaltPunkte(dat, SCHRAUBE_FALL);
  if (!punkte.length || !lsg?.u) return null;
  const weg = (p, fall) => {
    const uv = lsg.u.get(fall);
    if (!uv) return 0;
    let s = 0;
    p.lasten.forEach((l) => {
      const i = lsg.knotenIdx.get(l.knoten);
      if (i !== undefined) s += l.wert * uv[i * 6 + l.c];
    });
    return s;
  };
  const link = (p) => String(p.key).split('|')[1];
  const praefix = punkte.map((p) => BUEGEL_LINK.exec(link(p))?.[1] ?? '');
  const a = punkte.map((pi) => punkte.map((pj) => weg(pi, pj.key)));
  const wG = punkte.map((p) => weg(p, 'G'));
  // Gleitweg der Lasten je Kombination OHNE G (Montage) und ohne Hilfsfälle.
  const rest = faelle.filter((lf) => lf.nachweis !== false).map((lf) => {
    const an = anteileFuer(lf, dat).filter((x) => x.lastfall !== 'G'
      && !String(x.lastfall).startsWith(SCHRAUBE_FALL) && x.lastfall !== MONTAGE_FALL);
    return punkte.map((p) => an.reduce((s, { lastfall, faktor }) => s + (faktor || 0) * weg(p, lastfall), 0));
  }).filter((w) => w.some((v) => Math.abs(v) > 1e-15));
  const steif = Math.max(0, ...a.map((z, i) => (z[i] > 0 ? 1 / z[i] : 0)));
  const kMax = steif > 0 ? 100 * steif : 1e6;
  const gruppen = [...new Set(praefix)];
  const K = new Map(gruppen.map((g) => [g, kMax]));
  const Ki = () => praefix.map((g) => K.get(g));
  const quote = (Kv, nurG = null) => {
    let q = 0;
    rest.forEach((w0) => {
      const A = a.map((z, i) => z.map((v, j) => v + (i === j ? 1 / Kv[i] : 0)));
      const T = loeseKlein(A, w0.map((v) => -v));
      if (!T) return;
      T.forEach((t, i) => {
        if (nurG !== null && praefix[i] !== nurG) return;
        const g = punkte[i].max > 0 ? Math.abs(t) / punkte[i].max : 0;
        if (g > q) q = g;
      });
    });
    return q;
  };
  if (quote(Ki()) > 1 + 1e-9) {
    // Je Tragwerk halbieren (log K), drei Durchgänge - die Joche koppeln über
    // den geteilten Masten.
    for (let durchgang = 0; durchgang < 3; durchgang += 1) {
      gruppen.forEach((g) => {
        const mit = (lk) => { const m = new Map(K); m.set(g, 10 ** lk); return praefix.map((x) => m.get(x)); };
        if (quote(mit(Math.log10(kMax)), g) <= 1) { K.set(g, kMax); return; }
        let lo = 0; let hi = Math.log10(kMax);
        for (let i = 0; i < 40 && hi - lo > 1e-4; i += 1) {
          const mid = (lo + hi) / 2;
          if (quote(mit(mid), g) > 1) hi = mid; else lo = mid;
        }
        K.set(g, 10 ** lo);
      });
    }
  }
  // Auf zwei geltende Ziffern abgerundet (die Grenze bleibt eingehalten).
  K.forEach((v, g) => {
    const p = 10 ** (Math.floor(Math.log10(v)) - 1);
    K.set(g, Math.max(p, Math.floor(v / p) * p));
  });
  const Kend = Ki();
  /*
   * Die Kraft je Link unter G mit FREIEM Untergurt (wie aufgestellt), am
   * Mastknoten (Knoten i), sechs Komponenten wie `anschlussKraefte`: so
   * wirken G und Montage zusammen auf die Schraube und den Masten.
   */
  const gFrei = {};
  const uG = lsg.u.get('G');
  (lsg.elemente ?? []).forEach((e) => {
    if (!uG || !punkte.some((p) => link(p) === e.s.name)) return;
    const f = [0, 0, 0, 0, 0, 0];
    for (let r = 0; r < 6; r += 1) {
      let sum = 0;
      for (let b = 0; b < 12; b += 1) sum += e.kG[r * 12 + b] * uG[b < 6 ? e.i * 6 + b : e.j * 6 + (b - 6)];
      f[r] = -sum;
    }
    gFrei[e.s.name] = f;
  });
  // Feder ins Link, Einheitspaare in den Montagefall umwandeln, Hilfsfälle weg.
  const istHilfs = (l) => String(l?.lastfall ?? '').startsWith(SCHRAUBE_FALL);
  const montage = {};
  const faktorJe = new Map(punkte.map((p, i) => [p.key, Kend[i] * wG[i]]));
  punkte.forEach((p) => { montage[link(p)] = faktorJe.get(p.key); });
  const nachMontage = (l) => ({ ...l, name: String(l.name).replace(/^SG_/, 'MON_'),
    wert: l.wert * (faktorJe.get(l.lastfall) ?? 0), lastfall: MONTAGE_FALL });
  dat.lasten = dat.lasten ?? {};
  ['punkt', 'moment'].forEach((art) => {
    const liste = dat.lasten[art] ?? [];
    const hilf = liste.filter(istHilfs);
    dat.lasten[art] = [...liste.filter((l) => !istHilfs(l)),
      ...hilf.filter((l) => Math.abs(faktorJe.get(l.lastfall) ?? 0) > 1e-12).map(nachMontage)];
  });
  const kJeLink = new Map(punkte.map((p, i) => [link(p), Kend[i]]));
  (dat.staebe ?? []).forEach((s) => {
    if (!kJeLink.has(s.name)) return;
    s.kraftuebertragung = { ...(s.kraftuebertragung ?? {}), x: kJeLink.get(s.name) };
  });
  dat.lastfaelle = (dat.lastfaelle ?? []).filter((l) => !String(l.key).startsWith(SCHRAUBE_FALL));
  const mitMontage = Object.values(montage).some((v) => Math.abs(v) > 1e-12);
  if (mitMontage) {
    if (!dat.lastfaelle.some((l) => l.key === MONTAGE_FALL)) {
      const artG = dat.lastfaelle.find((l) => l.key === 'G')?.art ?? 'Permanent';
      dat.lastfaelle.push({ key: MONTAGE_FALL, label: 'Montage (Joch gleitet beim Aufstellen, Hakenschrauben)', art: artG });
    }
    (dat.kombinationen ?? []).forEach((k) => {
      const g = (k.anteile ?? []).find((x) => x.lastfall === 'G');
      if (g && !k.anteile.some((x) => x.lastfall === MONTAGE_FALL)) {
        k.anteile = [...k.anteile, { lastfall: MONTAGE_FALL, faktor: g.faktor }];
      }
    });
  }
  dat.hakenschrauben = {
    K: Object.fromEntries([...K.entries()]), links: [...kJeLink.keys()],
    montage: mitMontage ? montage : {}, gFrei: mitMontage ? gFrei : {}, kMax,
    vermerk: 'Hakenschrauben: Untergurt-Anschluss als Grenzfeder K_X (Linkelement x). Lastfall '
      + '«Montage» = Gegenlast K·w_G (Joch gleitet beim Aufstellen). Schraubenkraft = Linkkraft x '
      + 'plus Montagepaar; unter G + Montage ist sie 0, die Linkkraft zeigt K·w_G.',
  };
  return dat.hakenschrauben;
}

/** Trägt dieser Lastfall an diesem Link keine Schraubenkraft (G und Montage)? */
export const ohneSchraubenkraft = (dat, linkName, lastfall) =>
  (lastfall === 'G' || lastfall === MONTAGE_FALL)
  && Object.prototype.hasOwnProperty.call(dat?.hakenschrauben?.montage ?? {}, linkName);
