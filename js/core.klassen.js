/**
 * core.klassen.js
 * ---------------------------------------------------------------------------
 * QUERSCHNITTSKLASSIFIZIERUNG nach SIA 263 / EN 1993-1-1 Tab. 5.2.
 * Reine Funktionen, kein DOM.
 *
 * Grenzwerte
 * ----------
 * Beidseitig freie Ränder (Schenkel, Blechrand) sind AUSKRAGENDE Teile:
 *      Klasse 1   c/t <=  9*eps
 *      Klasse 2   c/t <= 10*eps
 *      Klasse 3   c/t <= 14*eps
 *      sonst      Klasse 4
 *
 * Für WINKELPROFILE UNTER DRUCK gilt zusätzlich das eigene Kriterium
 * (Tab. 5.2 Blatt 3), das den Gesamtquerschnitt erfasst:
 *      h/t <= 15*eps   UND   (b+h)/(2t) <= 11.5*eps   ->  Klasse 3
 * Wird es verletzt, ist der Querschnitt Klasse 4, auch wenn der einzelne
 * Schenkel für sich genommen kompakter wäre. Massgebend ist deshalb die
 * UNGÜNSTIGSTE der beiden Betrachtungen.
 *
 * eps = sqrt(235 / f_y)
 * ---------------------------------------------------------------------------
 */

/** Grenzwerte auskragender Teile, Vielfache von eps. */
export const GRENZEN_AUSKRAGEND = { k1: 9, k2: 10, k3: 14 };

/** Zusatzkriterium für Winkel unter Druck, Vielfache von eps. */
export const GRENZEN_WINKEL = { hT: 15, bh2t: 11.5 };

/** Klasse aus einem c/t-Verhältnis eines auskragenden Teils. */
export function klasseAuskragend(ct, eps) {
  if (ct <= GRENZEN_AUSKRAGEND.k1 * eps) return 1;
  if (ct <= GRENZEN_AUSKRAGEND.k2 * eps) return 2;
  if (ct <= GRENZEN_AUSKRAGEND.k3 * eps) return 3;
  return 4;
}

const beurteilung = (k) => ({
  1: 'Klasse 1 – plastische Berechnung und Rotation zulässig.',
  2: 'Klasse 2 – plastisches Moment erreichbar, Rotationsfähigkeit begrenzt.',
  3: 'Klasse 3 – elastischer Spannungsnachweis mit dem Bruttoquerschnitt.',
  4: 'Klasse 4 – lokales Beulen massgebend, wirksamer Querschnitt nach ' +
     'EN 1993-1-5 erforderlich. Dieses Werkzeug rechnet elastisch mit dem ' +
     'BRUTTOQUERSCHNITT; die Ausnutzung liegt damit auf der unsicheren Seite.',
}[k]);

/**
 * Klassifizierung eines Winkelprofils.
 *
 * Als mitwirkende Länge c wird die volle Schenkellänge angesetzt (der Schenkel
 * kragt von der Ferse aus und ist am freien Rand ungestützt). Das ist die
 * strenge Auslegung; ein Abzug von Dicke und Ausrundung würde günstiger, aber
 * weniger konservativ rechnen.
 *
 * @param {object} p Profil (aH, aV, t, name)
 * @param {number} eps
 */
export function klassifiziereWinkel(p, eps) {
  const kriterien = [
    {
      id: 'liegender Schenkel', ct: p.aH / p.t,
      grenze: GRENZEN_AUSKRAGEND.k3 * eps, klasse: klasseAuskragend(p.aH / p.t, eps),
      art: 'auskragend',
    },
    {
      id: 'stehender Schenkel', ct: p.aV / p.t,
      grenze: GRENZEN_AUSKRAGEND.k3 * eps, klasse: klasseAuskragend(p.aV / p.t, eps),
      art: 'auskragend',
    },
    {
      id: 'Winkel unter Druck  h/t', ct: Math.max(p.aH, p.aV) / p.t,
      grenze: GRENZEN_WINKEL.hT * eps,
      klasse: Math.max(p.aH, p.aV) / p.t <= GRENZEN_WINKEL.hT * eps ? 3 : 4,
      art: 'winkel',
    },
    {
      id: 'Winkel unter Druck  (b+h)/(2t)', ct: (p.aH + p.aV) / (2 * p.t),
      grenze: GRENZEN_WINKEL.bh2t * eps,
      klasse: (p.aH + p.aV) / (2 * p.t) <= GRENZEN_WINKEL.bh2t * eps ? 3 : 4,
      art: 'winkel',
    },
  ];
  const klasse = Math.max(...kriterien.map((k) => k.klasse));
  return {
    bauteil: p.name, eps, kriterien, klasse,
    massgebend: kriterien.find((k) => k.klasse === klasse).id,
    hinweis: beurteilung(klasse),
    grenzen: {
      k1: GRENZEN_AUSKRAGEND.k1 * eps,
      k2: GRENZEN_AUSKRAGEND.k2 * eps,
      k3: GRENZEN_AUSKRAGEND.k3 * eps,
    },
  };
}

/**
 * Klassifizierung eines Bindeblechs (Flachstahl) unter Biegung in seiner Ebene.
 * Der gedrückte Rand kragt über die halbe Blechbreite aus, also c = b/2.
 *
 * @param {object} b Blech (breite, dicke, pos)
 */
export function klassifiziereBlech(b, eps) {
  const c = b.breite / 2;
  const ct = c / b.dicke;
  const klasse = klasseAuskragend(ct, eps);
  return {
    bauteil: `Blech ${b.breite}×${b.dicke}`, pos: b.pos, eps,
    c, ct, klasse, hinweis: beurteilung(klasse),
    kriterien: [{ id: 'gedrückter Rand c = b/2', ct, art: 'auskragend',
                  grenze: GRENZEN_AUSKRAGEND.k3 * eps, klasse }],
    grenzen: {
      k1: GRENZEN_AUSKRAGEND.k1 * eps,
      k2: GRENZEN_AUSKRAGEND.k2 * eps,
      k3: GRENZEN_AUSKRAGEND.k3 * eps,
    },
  };
}

/** Klassifizierung aller Bauteile des Modells. */
export function klassifizierung(m) {
  const eps = m.eps;
  const teile = [
    { rolle: 'Obergurt', ...klassifiziereWinkel(m.profOG, eps) },
    { rolle: 'Untergurt', ...klassifiziereWinkel(m.profUG, eps) },
  ];

  const bleche = m.dbBleche
    ? [...(m.joch.bleche.vertikal ?? []), ...(m.joch.bleche.horizontal ?? [])]
    : [{ breite: m.h2, dicke: m.t2, pos: 'manuell' }];
  // gleiche Abmessungen nur einmal ausweisen
  const gesehen = new Set();
  bleche.forEach((b) => {
    const s = `${b.breite}x${b.dicke}`;
    if (gesehen.has(s)) return;
    gesehen.add(s);
    teile.push({ rolle: 'Bindeblech', ...klassifiziereBlech(b, eps) });
  });

  const schlechteste = Math.max(...teile.map((t) => t.klasse));
  return {
    eps, teile, klasse: schlechteste,
    klasse4: teile.filter((t) => t.klasse === 4),
    hinweis: beurteilung(schlechteste),
  };
}
