/**
 * data.katalog.js
 * ---------------------------------------------------------------------------
 * DER FELDKATALOG: was jede Tabelle führt, in welcher Einheit, und woher es
 * stammt.
 *
 * Weisung vom 16. September: «alle relevanten tragwerksdaten werden
 * ausschliesslich über die datenbank gesteuert, es soll nichts hardcoded in
 * der app sein. die ui und die [Betreiber]daten sollen getrennt sein.» Und
 * danach: «ist es möglich die daten strukturierter zu machen … den import
 * auch umsetzen.»
 *
 * >>> WARUM EIN KATALOG UND NICHT NUR TABELLEN. <<<
 *
 * Eine Tabellenansicht liesse sich auch ohne ihn bauen - man nimmt die
 * Spalten der Datei als Kopfzeile und ist fertig. Nur wüsste dann niemand,
 * dass `jba` ein Aussenmass in Millimetern ist und `ey` ein Achsabstand in
 * Zentimetern. Genau diese Verwechslung hat in dieser Anwendung zweimal
 * zugeschlagen: beim Ankerquerschnitt und bei den Mastprofilen.
 *
 * Der Katalog beschreibt jede Spalte jeder Tabelle EINMAL. Daraus kommen:
 *
 *   - Anschrift und Einheit in der Tabellenansicht
 *   - Kopf- und Einheitenzeile der Excel-Ausleitung
 *   - die Prüfung beim Einlesen (Pflichtfeld, Zahl, Bereich, Auswahl)
 *   - die Kontrolle im Prüfstand, dass jede Spalte der Dateien hier steht
 *
 * >>> DIE TABELLEN SIND DIE DER DATEIEN. <<<
 *
 * Seit dem 16. September stehen die Datendateien in Tabellenform
 * (js/data.tabellen.js). Der Katalog beschreibt GENAU DIESE Tabellen: die
 * Haupttabelle eines Abschnitts über `felder`, ihre Untertabellen über
 * `tabellen`. Spalten verschachtelter Sätze heissen wie in der Datei, mit
 * «/» als Pfadzeichen - `og/ja`, `wind/quer/EK2`.
 *
 * >>> DIE TRENNLINIE: NORM ODER SORTIMENT. <<<
 *
 *   'norm'       Querschnittswerte und Stahlgüten. Sie stehen in Normen,
 *                gehören niemandem und dürfen in einer öffentlichen Ablage
 *                liegen.
 *   'sortiment'  Die Zahlen des Betreibers. Sie bleiben örtlich (siehe
 *                .gitignore) und kommen als Datenpaket.
 *
 * >>> WAS NICHT HIERHER GEHOERT. <<<
 *
 * Konventionen, an denen Rechenwege hängen - die Stegrichtung etwa. Sie ist
 * keine Zahl, die man pflegt, sondern eine Verzweigung im Rechenweg.
 * ---------------------------------------------------------------------------
 */

import { zerlege, tabellenVon } from './data.tabellen.js';

/* ---------------------------------------------------------------------------
 * DIE BAUSTEINE EINES FELDES.
 *
 *   k        Schlüssel im Datensatz
 *   label    Anschrift in der Tabelle
 *   einheit  Einheit oder null - sie steht in der zweiten Kopfzeile
 *   typ      'text' | 'zahl' | 'bool' | 'wahl' | 'satz' | 'liste' | 'frei'
 *   pflicht  ohne diesen Wert ist die Zeile unbrauchbar
 *   von/bis  Bereich einer Zahl; ausserhalb wird gewarnt, nicht abgelehnt
 *   wahl     erlaubte Werte bei typ 'wahl'
 *   unter    Felder eines Satzes - sie werden zu Spalten «satz/feld»
 *   notiz    was das Feld bedeutet - ein Satz, kein Absatz
 *
 * 'liste' ist eine Liste von Werten in EINER Zelle (Längenbereich,
 * Stützstellen). 'frei' heisst: beliebiger Inhalt, nicht geprüft - nur noch
 * für Felder, die in den Daten mal Zahl, mal Liste, mal Text sind.
 * ------------------------------------------------------------------------- */
const f = (k, label, typ, opt = {}) => ({ k, label, typ, ...opt });
const zahl = (k, label, einheit, opt = {}) =>
  f(k, label, 'zahl', { einheit, ...opt });
const text = (k, label, opt = {}) => f(k, label, 'text', opt);
const bool = (k, label, opt = {}) => f(k, label, 'bool', opt);
const liste = (k, label, einheit, opt = {}) =>
  f(k, label, 'liste', { einheit, ...opt });
const satz = (k, label, unter, opt = {}) => f(k, label, 'satz', { unter, ...opt });
const mm = (k, label, opt = {}) => zahl(k, label, 'mm', opt);

/** Die Herkunftsangabe eines geprüften Satzes. */
const HERKUNFT = [
  f('geprueft', 'Geprüft', 'frei',
    { notiz: 'Was nachgelesen wurde - wahr/falsch oder ein Vermerk.' }),
  text('hinweis', 'Hinweis',
    { notiz: 'Was beim Gebrauch dieses Satzes zu beachten ist.' }),
];

/** Windlast je Einwirkungsklasse, quer und längs. */
const EK = (einheit, klassen = ['EK1', 'EK2', 'EK3']) =>
  klassen.map((e) => zahl(e, e, einheit, { von: 0, bis: 20 }));

/** Schnee- und Windlast eines Jochs, geschlüsselt nach Referenzwert. */
const JOCHLASTEN = [
  satz('schnee', 'Schneelast', [
    zahl('0.9', 'bei 0.9 kN/m²', 'kN/m', { von: 0, bis: 5 }),
    zahl('1.25', 'bei 1.25 kN/m²', 'kN/m', { von: 0, bis: 5 }),
  ], { notiz: 'Charakteristisch; die Spalte nennt die Referenz-Schneelast.' }),
  satz('wind', 'Windlast', [
    zahl('0.9', 'bei 0.9 kN/m²', 'kN/m', { von: 0, bis: 5 }),
    zahl('1.1', 'bei 1.1 kN/m²', 'kN/m', { von: 0, bis: 5 }),
    zahl('1.3', 'bei 1.3 kN/m²', 'kN/m', { von: 0, bis: 5 }),
  ], { notiz: 'Charakteristisch; die Spalte nennt den Referenz-Staudruck.' }),
];

/** Pos und Anzahl einer Staffelungsstufe - bei Typ und Ausführung gleich. */
const STAFFEL = [
  zahl('pos', 'Blech-Pos.', null, { von: 0, bis: 99,
    notiz: 'Verweist auf die Tabelle Bleche. Leer heisst: an diesen Stationen '
         + 'liegt KEIN Blech.' }),
  zahl('anzahl', 'Anzahl Stationen', null, { von: 0, bis: 99,
    notiz: 'Vom Auflager zur Feldmitte gezählt. Leer heisst: bis zur '
         + 'Feldmitte.' }),
];

const EBENE = f('ebene', 'Ebene', 'wahl', { pflicht: true,
  wahl: ['vertikal', 'horizontal'] });

/* ===========================================================================
 * DIE ABSCHNITTE - einer je Haupttabelle.
 * ===========================================================================
 *
 *   key        eindeutig
 *   db         das Sortiment in js/data.tabellen.js
 *   tabelle    der Name der Haupttabelle dort
 *   liste      wo die Sätze im zusammengesetzten Baum stehen
 *   schluessel die Spalte, die einen Satz benennt
 *   tabellen   die Untertabellen, je {titel, notiz, teil, felder}
 * ========================================================================= */
export const ABSCHNITTE = [
  /* ----------------------------------------------------------------- NORM */
  {
    key: 'stahlgueten', db: 'normen', tabelle: 'stahlgueten', liste: 'stahlgueten',
    titel: 'Stahlgüten', herkunft: 'norm', schluessel: 'name',
    notiz: 'Nach SIA 263, Erzeugnisdicke t ≤ 40 mm.',
    felder: [
      text('name', 'Bezeichnung', { pflicht: true }),
      zahl('fy', 'Fliessgrenze f_y', 'N/mm²', { pflicht: true, von: 200, bis: 500 }),
      zahl('fu', 'Zugfestigkeit f_u', 'N/mm²', { pflicht: true, von: 300, bis: 700 }),
    ],
  },
  {
    key: 'winkelprofile', db: 'normen', tabelle: 'winkelprofile',
    liste: 'winkelprofile', titel: 'Winkelprofile', herkunft: 'norm',
    schluessel: 'name',
    notiz: 'Die vier Gurte eines Tragjochs. W ist das KLEINSTE elastische '
         + 'Widerstandsmoment. Schenkel in mm, Querschnittswerte in cm.',
    felder: [
      text('name', 'Bezeichnung', { pflicht: true }),
      f('form', 'Form', 'wahl',
        { wahl: ['gleichschenklig', 'ungleichschenklig'], pflicht: true }),
      mm('aH', 'Schenkel liegend a_H', { pflicht: true, von: 20, bis: 250 }),
      mm('aV', 'Schenkel stehend a_V', { pflicht: true, von: 20, bis: 250 }),
      mm('t', 'Schenkeldicke t', { pflicht: true, von: 3, bis: 30 }),
      zahl('g', 'Eigengewicht', 'kg/m', { pflicht: true, von: 1, bis: 100 }),
      zahl('A', 'Querschnittsfläche', 'cm²', { pflicht: true, von: 1, bis: 150 }),
      zahl('iy', 'Trägheitsradius i_y', 'cm', { pflicht: true, von: 0.5, bis: 12 }),
      zahl('iz', 'Trägheitsradius i_z', 'cm', { pflicht: true, von: 0.5, bis: 12 }),
      zahl('imin', 'kleinster Radius i_min', 'cm', { pflicht: true, von: 0.3, bis: 10,
        notiz: 'Hauptachse v-v — sie trägt den Knicknachweis.' }),
      zahl('zsH', 'Schwerpunkt z_sH', 'cm', { pflicht: true, von: 0.3, bis: 10,
        notiz: 'Ab Aussenfläche des liegenden Schenkels.' }),
      zahl('zsV', 'Schwerpunkt z_sV', 'cm', { pflicht: true, von: 0.3, bis: 10,
        notiz: 'Ab Aussenfläche des stehenden Schenkels.' }),
      zahl('Wy', 'Widerstandsmoment W_y', 'cm³', { pflicht: true, von: 0.5, bis: 400 }),
      zahl('Wz', 'Widerstandsmoment W_z', 'cm³', { pflicht: true, von: 0.5, bis: 400 }),
      text('hinweis', 'Hinweis'),
    ],
  },
  {
    key: 'walzprofile', db: 'normen', tabelle: 'walzprofile', liste: 'walzprofile',
    titel: 'Walzprofile (UPE/IPE)', herkunft: 'norm', schluessel: 'name',
    notiz: 'Gurte und Quersteifen der Abfangjoche. ACHTUNG: h und b in '
         + 'ZENTIMETERN — anders als bei den Mastprofilen.',
    felder: [
      text('name', 'Bezeichnung', { pflicht: true }),
      f('reihe', 'Reihe', 'wahl', { wahl: ['UPE', 'IPE'], pflicht: true }),
      zahl('h', 'Höhe h', 'cm', { pflicht: true, von: 5, bis: 60 }),
      zahl('b', 'Breite b', 'cm', { pflicht: true, von: 3, bis: 40 }),
      zahl('tw', 'Stegdicke t_w', 'cm', { pflicht: true, von: 0.2, bis: 3 }),
      zahl('tf', 'Flanschdicke t_f', 'cm', { pflicht: true, von: 0.3, bis: 5 }),
      zahl('r', 'Ausrundung r', 'cm', { von: 0, bis: 5 }),
      zahl('A', 'Querschnittsfläche', 'cm²', { pflicht: true, von: 5, bis: 300 }),
      zahl('G', 'Eigengewicht', 'kg/m', { pflicht: true, von: 5, bis: 250 }),
      zahl('Iy', 'Trägheitsmoment I_y', 'cm⁴', { pflicht: true, von: 50, bis: 100000 }),
      zahl('Wy', 'Widerstandsmoment W_y', 'cm³', { pflicht: true, von: 10, bis: 5000 }),
      zahl('iy', 'Trägheitsradius i_y', 'cm', { pflicht: true, von: 2, bis: 30 }),
      zahl('Iz', 'Trägheitsmoment I_z', 'cm⁴', { pflicht: true, von: 10, bis: 20000 }),
      zahl('Wz', 'Widerstandsmoment W_z', 'cm³', { pflicht: true, von: 5, bis: 2000 }),
      zahl('iz', 'Trägheitsradius i_z', 'cm', { pflicht: true, von: 1, bis: 15 }),
      zahl('It', 'Torsionsträgheit I_t', 'cm⁴', { pflicht: true, von: 0.5, bis: 500 }),
      zahl('ey', 'Schwerpunktabstand e_y', 'cm', { von: 0, bis: 10,
        notiz: 'Nur beim U-Profil; beim I-Profil 0.' }),
    ],
  },
  {
    key: 'mastprofile', db: 'normen', tabelle: 'mastprofile', liste: 'mastprofile',
    titel: 'Mastprofile (HEB/HEM)', herkunft: 'norm', schluessel: 'name',
    notiz: 'Querschnittswerte nach EN 10365. ACHTUNG: h und b in MILLIMETERN — '
         + 'anders als bei den Walzprofilen. Welche Typen das Sortiment führt, '
         + 'steht unter «Masttypen».',
    felder: [
      text('name', 'Bezeichnung', { pflicht: true }),
      mm('h', 'Höhe h', { pflicht: true, von: 80, bis: 600 }),
      mm('b', 'Breite b', { pflicht: true, von: 80, bis: 400 }),
      mm('tw', 'Stegdicke t_w', { pflicht: true, von: 3, bis: 40 }),
      mm('tf', 'Flanschdicke t_f', { pflicht: true, von: 5, bis: 60 }),
      zahl('g', 'Eigengewicht', 'kg/m', { pflicht: true, von: 20, bis: 400 }),
      zahl('A', 'Querschnittsfläche', 'cm²', { pflicht: true, von: 20, bis: 500 }),
      zahl('Iy', 'Trägheitsmoment I_y', 'cm⁴', { pflicht: true, von: 500, bis: 200000 }),
      zahl('Wy', 'Widerstandsmoment W_y', 'cm³', { pflicht: true, von: 50, bis: 8000 }),
      zahl('iy', 'Trägheitsradius i_y', 'cm', { pflicht: true, von: 3, bis: 30 }),
      zahl('Iz', 'Trägheitsmoment I_z', 'cm⁴', { pflicht: true, von: 100, bis: 50000 }),
      zahl('Wz', 'Widerstandsmoment W_z', 'cm³', { pflicht: true, von: 20, bis: 3000 }),
      zahl('iz', 'Trägheitsradius i_z', 'cm', { pflicht: true, von: 2, bis: 20 }),
      zahl('It', 'Torsionsträgheit I_t', 'cm⁴', { pflicht: true, von: 5, bis: 2000,
        notiz: 'Sie trägt den Torsionsnachweis und die Wölbkrafttorsion.' }),
    ],
  },

  /* ------------------------------------------------------------ SORTIMENT */
  {
    key: 'masttypen', db: 'masten', tabelle: 'typen', liste: 'typen',
    titel: 'Masttypen', herkunft: 'sortiment', schluessel: 'profil',
    notiz: 'Welche Profile das Sortiment führt und was an Wind auf sie '
         + 'anzusetzen ist. Der Querschnitt steht unter «Mastprofile».',
    felder: [
      text('profil', 'Profil', { pflicht: true,
        notiz: 'Verweist auf einen Satz der Mastprofile.' }),
      satz('wind', 'Windlast', [
        satz('quer', 'quer zum Gleis', EK('kN/m')),
        satz('laengs', 'in Gleisrichtung', EK('kN/m')),
      ], { pflicht: true, notiz: 'Charakteristische Laufmeterlast je Klasse.' }),
    ],
  },
  {
    key: 'tragjoche', db: 'tragjoche', tabelle: 'typen', liste: 'typen',
    titel: 'Tragjochtypen', herkunft: 'sortiment', schluessel: 'typ',
    notiz: 'Masse in Millimetern, Aussenmasse wo nicht anders angeschrieben. '
         + 'Die Bleche, ihre Staffelung und die Masstabelle stehen in eigenen '
         + 'Tabellen.',
    felder: [
      text('typ', 'Typ', { pflicht: true }),
      text('bezeichnung', 'Bezeichnung'),
      f('bauweise', 'Bauweise', 'wahl', { wahl: ['neu', 'alt'], pflicht: true,
        notiz: 'Die alte Bauweise hat eine Voute am Jochende.' }),
      bool('sortiment', 'im Sortiment',
        { notiz: '«nein» heisst: Vergleichsmodell, nicht lieferbar.' }),
      satz('quelle', 'Quelle', [
        text('zeichnung', 'Zeichnung'), text('index', 'Index'),
        text('schema', 'Schema'),
      ]),
      ...HERKUNFT,
      bool('staffelung_geprueft', 'Staffelung geprüft'),
      text('lastenQuelle', 'Herkunft der Lasten'),
      mm('jd', 'Bauhöhe jd', { pflicht: true, von: 200, bis: 2000 }),
      mm('jk', 'erster Knick jk', { von: 0, bis: 5000 }),
      mm('jkk', 'zweiter Knick jkk', { von: 0, bis: 8000 }),
      mm('teilung', 'Blechteilung', { pflicht: true, von: 200, bis: 2000,
        notiz: 'Regelabstand der Bindebleche entlang der Jochachse.' }),
      zahl('gewicht', 'Eigengewicht', 'kg/m', { pflicht: true, von: 10, bis: 300 }),
      liste('laengeKurz', 'Bereich kurze Ausführung', 'm',
        { notiz: 'Von–bis. Nicht jeder Typ hat eine kurze Ausführung.' }),
      liste('laengeNorm', 'Längenbereich', 'm', { notiz: 'Von–bis.' }),
      ...['og', 'ug'].map((g) => satz(g, g === 'og' ? 'Obergurt' : 'Untergurt', [
        text('profil', 'Profil', { pflicht: true,
          notiz: 'Verweist auf einen Satz der Winkelprofile.' }),
        mm('ja', 'Schenkellänge ja', { pflicht: true, von: 20, bis: 250 }),
        mm('jf', 'Schenkeldicke jf', { pflicht: true, von: 3, bis: 30 }),
        mm('jba', 'Breite Auflager jba', { pflicht: true, von: 100, bis: 2000 }),
        mm('jbb', 'Breite Feld jbb', { pflicht: true, von: 100, bis: 2000 }),
      ], { pflicht: true })),
      ...JOCHLASTEN,
      satz('voute', 'Voute', [
        mm('endJd', 'Bauhöhe am Ende'), mm('gerade', 'gerades Endstück'),
        mm('neigung', 'Länge der Schräge'), mm('knick', 'volle Höhe ab'),
      ], { notiz: 'Nur Bauweise alt. knick = gerade + neigung.' }),
    ],
    tabellen: {
      bleche: {
        titel: 'Bindebleche', teil: EBENE,
        notiz: 'Werkstattgeometrie — nicht anzupassen. Die Breite ist das Mass '
             + 'ENTLANG der Jochachse, die Länge überspannt den Gurtabstand.',
        felder: [
          zahl('pos', 'Pos.', null, { pflicht: true, von: 0, bis: 99 }),
          mm('breite', 'Breite (in Jochachse)', { pflicht: true, von: 20, bis: 500 }),
          mm('dicke', 'Dicke', { pflicht: true, von: 3, bis: 40 }),
          mm('laenge', 'Länge (quer)', { pflicht: true, von: 50, bis: 2000 }),
          f('zone', 'Zone', 'wahl', { wahl: ['auflager', 'feld', 'voute'],
            notiz: 'Nur horizontale Bleche und die Voute.' }),
          text('material', 'Werkstoff'),
        ],
      },
      staffelung: {
        titel: 'Staffelung', teil: EBENE,
        notiz: 'Welches Blech an welchen Stationen liegt, vom Auflager zur '
             + 'Feldmitte, symmetrisch. Die letzte Stufe gilt bis zur Mitte.',
        felder: STAFFEL,
      },
      ausfuehrungen: {
        titel: 'Ausführungen',
        notiz: 'Nur Altbauweise: je Längenbereich eine eigene Staffelung.',
        felder: [
          text('bez', 'Bezeichnung', { pflicht: true }),
          liste('l', 'Längenbereich', 'm', { pflicht: true }),
        ],
      },
      ausfuehrung_staffelung: {
        titel: 'Staffelung je Ausführung', teil: EBENE,
        notiz: 'Wie die Staffelung des Typs, aber für eine Ausführung.',
        felder: STAFFEL,
      },
      typ_masse: {
        titel: 'Feldweiten je Typ',
        notiz: 'Nur Vergleichsmodelle mit eigener Einteilung.',
        felder: [
          zahl('L', 'Jochlänge', 'm', { pflicht: true, von: 3, bis: 40 }),
          liste('a', 'Feldweiten A_1 … A_n', 'mm', { pflicht: true }),
        ],
      },
      masstabelle: {
        titel: 'Masstabelle', karte: true,
        teil: text('L', 'Jochlänge', { einheit: 'm', pflicht: true }),
        notiz: 'Für alle Typen dieselbe. A_1 ist das Feld in Jochmitte; es gilt '
             + 'L = 2·750 + 2·ΣA.',
        felder: [liste('feldweiten', 'Feldweiten A_1 … A_n', 'mm', { pflicht: true })],
      },
    },
  },
  {
    key: 'abfangjoche', db: 'abfangjoche', tabelle: 'typen', liste: 'typen',
    titel: 'Abfangjochtypen', herkunft: 'sortiment', schluessel: 'typ',
    notiz: 'Zwei Gurte statt vier. Masse in Millimetern.',
    felder: [
      text('typ', 'Typ', { pflicht: true }),
      f('bauweise', 'Bauweise', 'wahl', { wahl: ['neu', 'alt'], pflicht: true }),
      text('profil', 'Gurtprofil', { pflicht: true,
        notiz: 'Verweist auf einen Satz der Walzprofile.' }),
      liste('jt', 'Längenbereich', 'm', { pflicht: true }),
      zahl('gewicht', 'Eigengewicht', 'kg/m', { pflicht: true, von: 10, bis: 300 }),
      satz('quelle', 'Quelle', [text('zeichnung', 'Zeichnung'), text('blatt', 'Blatt')]),
      ...HERKUNFT,
      satz('masse', 'Hauptmasse', [
        mm('a', 'Profilhöhe a'), mm('b', 'Flanschbreite b'),
        mm('c', 'Flanschdicke c'),
        mm('d', 'Stegabstand d', { notiz: 'Der Abstand der GURTSTEGE.' }),
        mm('e', 'Sprossenlänge e'), mm('f', 'f'), mm('g', 'g'),
        mm('h', 'Aussenmass Jochende h'),
        mm('k', 'Aussenmass Feld k', { notiz: 'd + 2b.' }),
        mm('jdEnde', 'Bauhöhe am Ende'), mm('endHoehe', 'Höhe Endstück'),
        mm('teilung', 'Sprossenabstand'),
        text('gurtEnde', 'Profil der Endstücke'),
      ], { pflicht: true }),
      ...JOCHLASTEN,
      satz('aufbau', 'Aufbau', [
        zahl('gurte', 'Gurte', null, { von: 1, bis: 4 }),
        text('gurtprofil', 'Gurtprofil'), text('stahl', 'Stahl'),
        mm('a', 'a'), mm('b', 'b'), mm('c', 'c'), mm('d', 'd'), mm('k', 'k'),
        text('k_quelle', 'Herkunft k'),
        mm('spreizung', 'Spreizung am Ende'),
        text('form', 'Form'), text('hinweis', 'Hinweis'),
      ]),
      zahl('bindeblech/ebenen', 'Blechebenen', null, { von: 1, bis: 4 }),
      satz('verstaerkung', 'Verstärkung (Gabel)', [
        text('profil', 'Profil'), mm('laenge', 'Länge'),
        zahl('anzahl', 'Anzahl', null), text('stahl', 'Stahl'),
        mm('beginn', 'Beginn ab Jochende'), bool('imAnzug', 'im Anzug'),
        text('lage', 'Lage'), text('zweck', 'Zweck'), text('quelle', 'Quelle'),
        text('anmerkung', 'Anmerkung'),
      ]),
      satz('randmasse', 'Randmasse', [
        mm('linksErstesBlech', 'links erstes Blech'),
        mm('linksZweitesFeld', 'links zweites Feld'),
        liste('rechtsFelder', 'rechts Felder', 'mm'),
        mm('rechtsBisEnde', 'rechts bis Ende'),
        mm('aussenBereich', 'Endbereich'),
        text('quelle', 'Quelle'), text('anmerkung', 'Anmerkung'),
      ]),
      zahl('regelfelder', 'Regelfelder bis A_n', null, { von: 1, bis: 60 }),
      satz('kroepfung', 'Kröpfung', [
        mm('knickLangesEnde', 'Knick langes Ende'),
        mm('knickKurzesEnde', 'Knick kurzes Ende'),
        mm('vollbreiteAb', 'volle Breite ab'), mm('lichtEnde', 'licht am Ende'),
        text('quelle', 'Quelle'),
      ]),
      satz('quersteife', 'Quersteife (Riegel)', [
        text('profil', 'Profil'), mm('laenge', 'Länge'),
        text('anzahl', 'Anzahl'), text('lage', 'Lage'), text('stahl', 'Stahl'),
        text('quelle', 'Quelle'),
        satz('ende', 'am Ende', [
          text('profil', 'Profil'), mm('laenge', 'Länge'),
          zahl('anzahl', 'Anzahl', null), text('lage', 'Lage'),
          text('anschluss', 'Anschluss'), text('quelle', 'Quelle'),
        ]),
      ]),
      satz('rippen', 'Rippen', [
        mm('b', 'Breite'), mm('t', 'Dicke'), mm('l', 'Länge'),
        zahl('anzahl', 'Anzahl', null),
      ]),
    ],
    tabellen: {
      bindebleche: {
        titel: 'Bindebleche',
        teil: f('lage', 'Lage', 'wahl', { pflicht: true,
          wahl: ['regel', 'endeL', 'endeR'] }),
        notiz: 'Flachstahl b/t × l. Regelblech im Feld, Endbleche links und '
             + 'rechts. Eine Nummer steht nur, wo ein Ende mehrere Bleche führt.',
        felder: [
          mm('b', 'Breite b', { pflicht: true, von: 20, bis: 500 }),
          mm('t', 'Dicke t', { pflicht: true, von: 3, bis: 40 }),
          mm('l', 'Länge l', { pflicht: true, von: 50, bis: 2000 }),
          text('stahl', 'Stahl'),
        ],
      },
      laengen: {
        titel: 'Längen',
        notiz: 'Die Masstabelle des Schemablatts, eine Zeile je geführte Länge. '
             + 'Die Endbereiche (je 2000 mm) stehen unter «Randmasse».',
        felder: [
          text('dm', 'Kennung'),
          zahl('jt', 'Jochlänge', 'm', { pflicht: true, von: 3, bis: 40 }),
          liste('js', 'Stützweiten', 'm'),
          mm('A1', 'erstes Blechfeld A_1', { von: 0, bis: 2000 }),
          mm('A', 'Regelfeld A', { von: 0, bis: 2000 }),
          mm('QV1', 'Bindeblechbereich QV_1', { von: 0, bis: 40000 }),
          liste('QV', 'Vierendeel-Bereiche', 'mm'),
          liste('S', 'Überstände', 'mm'),
          liste('pf/Pf1', 'Überhöhung Pf1 (Soll, max)', 'mm'),
          liste('pf/Pf2', 'Überhöhung Pf2 (Soll, max)', 'mm'),
          liste('pf/Pf3', 'Überhöhung Pf3 (Soll, max)', 'mm'),
          zahl('gewicht', 'Gewicht', 'kg', { von: 0, bis: 5000 }),
          zahl('bleche', 'Regelbindebleche', null, { von: 0, bis: 500,
            notiz: 'Über beide Ebenen.' }),
          zahl('blechStationen', 'Blechstationen', null, { von: 0, bis: 250,
            notiz: 'Die Hälfte der Regelbindebleche.' }),
          text('blechFraglich', 'Blechzahl fraglich'),
        ],
      },
      quersteifung: {
        titel: 'Quersteifung',
        notiz: 'Aus dem Gurtprofil; trennt die Vierendeel-Bereiche.',
        felder: [
          text('profil', 'Profil', { pflicht: true }),
          mm('laenge', 'Länge'),
          f('anzahl', 'Anzahl', 'frei',
            { notiz: 'Eine Zahl oder [min, max] über das Sortiment.' }),
        ],
      },
      deckbleche: {
        titel: 'Deckbleche',
        notiz: 'Ab A270 anstelle der Gabel, links und rechts verschieden lang.',
        felder: [
          mm('b', 'Breite'), mm('t', 'Dicke'), mm('l', 'Länge'),
          zahl('anzahl', 'Anzahl', null), text('lage', 'Lage'),
        ],
      },
    },
  },
  {
    key: 'anker', db: 'anker', tabelle: 'typen', liste: 'typen',
    titel: 'Zug- und Druckstützen', herkunft: 'sortiment', schluessel: 'id',
    notiz: 'Pendelstäbe am Masten. Die zulässigen Kräfte stammen aus einem '
         + 'Diagramm und sind mit CHARAKTERISTISCHEN Kräften zu vergleichen. '
         + 'Im Querschnitt stehen die Masse in mm, e_y und die '
         + 'Trägheitsmomente in cm.',
    felder: [
      text('id', 'Kurzzeichen', { pflicht: true }),
      text('name', 'Bezeichnung', { pflicht: true }),
      f('art', 'Art', 'wahl', { wahl: ['stuetze', 'seil'], pflicht: true }),
      text('profil', 'Profil'),
      text('stahl', 'Stahlgüte'),
      zahl('laengeMax', 'grösste Länge', 'm', { von: 1, bis: 30,
        notiz: 'Nur Stütze.' }),
      satz('druck', 'Druckkurve', [
        liste('L', 'Stützstellen Länge', 'm'),
        liste('N', 'zulässige Druckkraft', 'kN'),
        zahl('kappungAb', 'Kappung ab', 'm'),
        zahl('kappung', 'Kappungswert', 'kN'),
      ]),
      satz('zug', 'zulässiger Zug', [
        zahl('ankerplatte', 'an Ankerplatte', 'kN', { von: 0, bis: 500 }),
        zahl('ankereisen', 'an Ankereisen', 'kN', { von: 0, bis: 500 }),
      ], { notiz: 'Nur Stütze. Er hängt an der Befestigung, nicht an der Länge.' }),
      zahl('zugBetrieb', 'zulässige Betriebslast', 'kN', { von: 0, bis: 500,
        notiz: 'Nur Seil. Die Bruchkraft gehört NICHT in den Nachweis.' }),
      zahl('bruchkraft', 'Bruchkraft', 'kN', { von: 0, bis: 2000 }),
      zahl('dehnung', 'Dehnung', 'mm/(m·kN)', { von: 0, bis: 5 }),
      zahl('masseFest', 'Festmasse', 'kg', { von: 0, bis: 200 }),
      zahl('masseProM', 'Masse je Meter', 'kg/m', { von: 0, bis: 20 }),
      satz('querschnitt', 'Querschnitt', [
        text('profil', 'Profil'), zahl('anzahl', 'Anzahl Profile', null),
        text('quelle', 'Quelle'),
        mm('h', 'Höhe h'), mm('b', 'Breite b'), mm('tw', 'Stegdicke t_w'),
        mm('tf', 'Flanschdicke t_f'), mm('r', 'Ausrundung r'),
        zahl('ey', 'Schwerpunktabstand e_y', 'cm'),
        zahl('A', 'Fläche Verbund', 'cm²'), zahl('AEinzel', 'Fläche Einzel', 'cm²'),
        zahl('Iy', 'I_y Verbund', 'cm⁴'), zahl('IyEinzel', 'I_y Einzel', 'cm⁴'),
        zahl('Iz', 'I_z Verbund', 'cm⁴'), zahl('IzEinzel', 'I_z Einzel', 'cm⁴'),
        zahl('It', 'I_t', 'cm⁴'), zahl('G', 'Eigengewicht', 'kg/m'),
        zahl('EA', 'Dehnsteifigkeit EA', 'kN'),
      ]),
      satz('spreizung', 'Spreizung', [
        mm('schmal', 'schmal'), mm('breit', 'breit'),
        mm('parallelSchmal', 'parallel schmal'), mm('parallelBreit', 'parallel breit'),
        text('bezug', 'Bezug'), text('weitesEnde', 'weites Ende'),
        text('engesEnde', 'enges Ende'), text('quelle', 'Quelle'),
      ]),
      satz('bindeblech', 'Bindebleche', [
        mm('laenge', 'Länge'), mm('dicke', 'Dicke'),
        mm('abstandMax', 'grösster Abstand'),
        mm('vonEng', 'ab engem Ende'), mm('vonBreit', 'ab weitem Ende'),
        zahl('jeStation', 'je Station', null), text('quelle', 'Quelle'),
      ]),
    ],
  },
  {
    key: 'lastgruppen', db: 'fl_bauteile', tabelle: 'gruppen', liste: 'gruppen',
    titel: 'Lastgruppen', herkunft: 'sortiment', schluessel: 'id',
    notiz: 'Die Gliederung der Lasttabelle.',
    felder: [
      text('id', 'Kurzzeichen', { pflicht: true }),
      text('titel', 'Titel', { pflicht: true }),
    ],
  },
  {
    key: 'lasttabelle', db: 'fl_bauteile', tabelle: 'bauteile', liste: 'bauteile',
    titel: 'Lasttabelle', herkunft: 'sortiment', schluessel: 'id',
    notiz: 'Was ein Bauteil an Last einträgt. Leere Felder heissen: für diese '
         + 'Klasse ist kein Wert angegeben — sie werden NICHT interpoliert.',
    felder: [
      text('id', 'Kurzzeichen', { pflicht: true }),
      text('gruppe', 'Gruppe', { pflicht: true,
        notiz: 'Verweist auf eine Lastgruppe.' }),
      text('name', 'Bezeichnung', { pflicht: true }),
      f('einheit', 'Einheit', 'wahl', { wahl: ['kN', 'kN/m'], pflicht: true,
        notiz: 'Bei kN/m ist mit der Länge zu multiplizieren.' }),
      zahl('eigengewicht', 'Eigengewicht', 'kN bzw. kN/m',
        { pflicht: true, von: 0, bis: 50 }),
      satz('windQuer', 'Wind quer', EK('kN bzw. kN/m', ['EK0', 'EK1', 'EK2', 'EK3'])),
      satz('windLaengs', 'Wind längs', EK('kN bzw. kN/m', ['EK0', 'EK1', 'EK2', 'EK3'])),
      satz('schnee', 'Schnee', [
        zahl('EK1-3', 'EK1–3', 'kN bzw. kN/m', { von: 0, bis: 20 }),
        zahl('EK4-6', 'EK4–6', 'kN bzw. kN/m', { von: 0, bis: 20 }),
      ]),
      f('rolle', 'Rolle', 'wahl',
        { wahl: ['traeger', 'aufbau', 'drahtwerk', 'stumm'], pflicht: true,
          notiz: '«stumm»: geführt, aber nicht als Vorlage angeboten.' }),
      zahl('leiterzug', 'Leiterzug', 'kN', { von: 0, bis: 60,
        notiz: 'Nur Drahtwerk — er erzeugt die Umlenkkraft im Bogen.' }),
      satz('reglage', 'Reglage', [
        liste('temps', 'Regliertemperaturen', '°C'),
        liste('vals', 'Leiterzug je Temperatur', 'kN'),
        satz('zusatz', 'mit Zusatzlast', [
          zahl('T', 'Temperatur', '°C'),
          liste('lasten', 'Zusatzlasten', 'kN/m'),
          liste('vals', 'Leiterzug', 'kN'),
        ]),
      ], { notiz: 'Nur fix abgefangene Leiter.' }),
      bool('freieFlaeche', 'über freie Fläche',
        { notiz: 'Gerechnet über die Angriffsfläche: w = A · q_ref(EK) · c.' }),
      text('bemerkung', 'Bemerkung'),
    ],
  },
  {
    key: 'anbauteile', db: 'anbauteile', tabelle: 'vorlagen', liste: 'vorlagen',
    titel: 'Anbauteil-Vorlagen', herkunft: 'sortiment', schluessel: 'id',
    notiz: 'Eine Vorlage ist eine Baugruppe: sie benennt Bauteile der '
         + 'Lasttabelle und sagt, wo sie sitzen. z zählt NACH OBEN, ab der '
         + 'Schwerachse des Anschlussgurtes.',
    felder: [
      text('id', 'Kurzzeichen', { pflicht: true }),
      text('name', 'Bezeichnung', { pflicht: true }),
      text('gruppe', 'Gruppe'),
      zahl('rang', 'Rang', null, { von: 0, bis: 99, notiz: 'Reihenfolge im Wähler.' }),
      text('farbe', 'Farbschlüssel'),
      text('beschreibung', 'Beschreibung'),
      zahl('raster', 'Raster', 'm', { pflicht: true, von: 0, bis: 5,
        notiz: 'Länge der Befestigung in Jochachse.' }),
      f('befestigung', 'Befestigung', 'wahl',
        { wahl: ['oben', 'unten', 'durchgehend'], pflicht: true }),
      zahl('eigengewicht', 'Eigengewicht', 'kN', { von: 0, bis: 50 }),
      bool('windAufTraeger', 'Wind auf Träger',
        { notiz: 'Kragarm: nur ein Teil der Windlast erreicht das Joch.' }),
      zahl('windAnteil', 'Windanteil', '%', { von: 0, bis: 100 }),
      zahl('y', 'Versatz y', 'm', { von: -10, bis: 10 }),
      zahl('z', 'Höhe z', 'm', { von: -20, bis: 20 }),
      satz('lasten', 'Lasten', [
        zahl('Gz', 'ständig vertikal G_z', 'kN'),
        zahl('Qz', 'veränderlich vertikal Q_z', 'kN'),
        zahl('Qx', 'veränderlich in Jochachse Q_x', 'kN'),
        zahl('Qy', 'veränderlich in Gleisrichtung Q_y', 'kN'),
      ]),
    ],
    tabellen: {
      module: {
        titel: 'Module',
        notiz: 'Die Bauteile einer Vorlage, in ihrer Reihenfolge.',
        felder: [
          text('bauteil', 'Bauteil', { pflicht: true,
            notiz: 'Verweist auf ein Kurzzeichen der Lasttabelle.' }),
          zahl('anzahl', 'Anzahl', null, { pflicht: true, von: 0, bis: 20 }),
          zahl('laenge', 'Länge', 'm', { von: 0, bis: 30 }),
          zahl('x', 'Versatz x', 'm', { von: -20, bis: 20 }),
          zahl('y', 'Versatz y', 'm', { von: -20, bis: 20 }),
          zahl('z', 'Höhe z', 'm', { von: -20, bis: 20 }),
          bool('umlenkung', 'Umlenkkraft'),
          zahl('eigengewicht', 'Eigengewicht', 'kN', { von: 0, bis: 50 }),
          zahl('aQuer', 'Fläche quer', 'm²', { von: 0, bis: 20 }),
          zahl('aLaengs', 'Fläche längs', 'm²', { von: 0, bis: 20 }),
          zahl('cw', 'Kraftbeiwert c_w', null, { von: 0, bis: 3 }),
        ],
      },
      lasten: {
        titel: 'Freie Lastblöcke',
        notiz: 'Lastblöcke, die keinem Bauteil der Tabelle entsprechen.',
        felder: [
          text('einwirkung', 'Einwirkung', { pflicht: true }),
          zahl('x', 'x', 'm'), zahl('y', 'y', 'm'), zahl('z', 'z', 'm'),
          zahl('Fx', 'F_x', 'kN'), zahl('Fy', 'F_y', 'kN'), zahl('Fz', 'F_z', 'kN'),
          zahl('Mxx', 'M_xx', 'kNm'), zahl('Myy', 'M_yy', 'kNm'),
          zahl('Mzz', 'M_zz', 'kNm'),
        ],
      },
    },
  },
];

/** Ein Abschnitt nach seinem Schlüssel. */
export function abschnitt(key) {
  return ABSCHNITTE.find((a) => a.key === key) ?? null;
}

/** Alle Abschnitte einer Herkunft - 'norm' oder 'sortiment'. */
export function abschnitteVon(herkunft) {
  return ABSCHNITTE.filter((a) => a.herkunft === herkunft);
}

/** Die Sortimente in der Reihenfolge der Abschnitte. */
export function datenbanken() {
  return [...new Set(ABSCHNITTE.map((a) => a.db))];
}

/** Die Sätze eines Abschnitts aus einem Bestand in Baumform. */
export function saetze(best, key) {
  const a = abschnitt(key);
  const l = best?.[a?.db]?.[a?.liste];
  return Array.isArray(l) ? l : [];
}

/* ===========================================================================
 * >>> DIE SPALTEN EINER TABELLE. <<<
 * ===========================================================================
 *
 * Ein Satz mit `unter` wird zu Spalten mit Pfad: `wind` → `wind/quer/EK1`,
 * Anschrift «Windlast · quer zum Gleis · EK1». So steht in jeder Zelle ein
 * Wert, und die Tabelle lässt sich rechnen.
 * ========================================================================= */
function flach(felder, pfad = '', kopf = '') {
  const aus = [];
  for (const fd of felder) {
    const p = pfad ? `${pfad}/${fd.k}` : fd.k;
    const kp = kopf ? `${kopf} · ${fd.label}` : fd.label;
    if (fd.typ === 'satz' && fd.unter) aus.push(...flach(fd.unter, p, kp));
    else aus.push({ pfad: p, kopf: kp, feld: fd });
  }
  return aus;
}

/** Der Titel einer Haupttabelle im Singular - für die Schlüsselspalten. */
const bezugLabel = { typ: 'Typ', id: 'Kurzzeichen', profil: 'Profil', name: 'Name' };

/**
 * Alle Tabellen eines Sortiments mit ihren Spalten, in Dateireihenfolge.
 *
 * @returns {{name, titel, notiz, abschnitt, haupt, spalten: {pfad,kopf,feld,
 *           schluessel?}[], schluesselSpalten: string[]}[]}
 */
const TK = new Map();
export function tabellenKatalog(db) {
  if (TK.has(db)) return TK.get(db);
  const aus = [];
  const eigen = ABSCHNITTE.filter((a) => a.db === db);
  for (const t of tabellenVon(db)) {
    let a;
    let beschr;
    if (t.haupt) {
      a = eigen.find((x) => x.tabelle === t.name);
      beschr = a ? { titel: a.titel, notiz: a.notiz, felder: a.felder } : null;
    } else {
      a = eigen.find((x) => x.tabellen?.[t.name]);
      beschr = a?.tabellen?.[t.name] ?? null;
    }
    const spalten = [];
    const schl = t.schluesselSpalten ?? [];
    for (const k of schl) {
      if (t.haupt) continue;           // der Schlüssel ist ein eigenes Feld
      let feld;
      if (k === 'nr') {
        feld = zahl('nr', 'Nr.', null, { notiz: 'Reihenfolge in ihrer Liste.' });
      } else if (k === t.teil && beschr?.teil) {
        feld = beschr.teil;
      } else if (k === t._elternBezug) {
        feld = zahl(k, 'Ausführung Nr.', null, { pflicht: true });
      } else {
        feld = text(k, bezugLabel[k] ?? k, { pflicht: true });
      }
      spalten.push({ pfad: k, kopf: feld.label, feld, schluessel: true });
    }
    spalten.push(...flach(beschr?.felder ?? []));
    /*
     * DIE BEHAELTERSPALTEN. Hat ein Typ keine Bleche (null) oder eine leere
     * Staffelung ({}), steht das als Wert in der Spalte des Behälters - sonst
     * wäre «leer» nicht von «fehlt» zu unterscheiden.
     */
    for (const u of tabellenVon(db).filter((x) => x.eltern === t.name)) {
      const teile = u.pfad.split('/').filter((x) => x !== '*');
      const p = teile.join('/');
      if (!spalten.some((s) => s.pfad === p)) {
        const ut = eigen.find((x) => x.tabellen?.[u.name])?.tabellen?.[u.name];
        spalten.push({ pfad: p, kopf: `${ut?.titel ?? u.name} (leer)`,
                       feld: f(p, `${ut?.titel ?? u.name} (leer)`, 'frei',
                         { notiz: 'Steht nur, wenn die Liste leer ist oder fehlt.' }) });
      }
    }
    aus.push({
      name: t.name,
      titel: beschr?.titel ?? t.name,
      notiz: beschr?.notiz ?? '',
      abschnitt: a?.key ?? null,
      herkunft: a?.herkunft ?? (db === 'normen' ? 'norm' : 'sortiment'),
      haupt: Boolean(t.haupt),
      karte: Boolean(t.karte),
      eltern: t.eltern,
      teil: t.teil ?? null,
      // Die Spalten, die auf die Elterntabelle verweisen
      bezug: t.haupt ? [] : schl.filter((k) => k !== 'nr' && k !== t.teil),
      schluesselSpalten: t.haupt ? [t.schluessel] : schl,
      spalten,
    });
  }
  aus.push({
    name: 'angaben', titel: 'Angaben', abschnitt: null,
    herkunft: db === 'normen' ? 'norm' : 'sortiment',
    notiz: 'Erläuterungen, Konventionen und Quellen der Datei, als Pfad und '
         + 'Wert. Sie tragen keine Rechenwerte bis auf die Liste der '
         + 'unschlüssigen Längen der Masstabelle.',
    haupt: false, karte: false, eltern: null, schluesselSpalten: ['pfad'],
    spalten: [
      { pfad: 'pfad', kopf: 'Pfad', feld: text('pfad', 'Pfad', { pflicht: true }),
        schluessel: true },
      { pfad: 'wert', kopf: 'Wert', feld: f('wert', 'Wert', 'frei') },
    ],
  });
  TK.set(db, aus);
  return aus;
}

/** Eine Tabelle eines Sortiments. */
export function tabelleKatalog(db, name) {
  return tabellenKatalog(db).find((t) => t.name === name) ?? null;
}

/**
 * Die Spalten, die eine Tabelle WIRKLICH führt, in Katalogreihenfolge -
 * dazu jene, die der Katalog nicht kennt, hinten angehängt.
 */
export function spaltenVon(db, name, zeilen) {
  const tk = tabelleKatalog(db, name);
  const da = new Set();
  for (const z of zeilen) for (const k of Object.keys(z)) da.add(k);
  const aus = (tk?.spalten ?? []).filter((s) => s.schluessel || da.has(s.pfad));
  const bekannt = new Set(aus.map((s) => s.pfad));
  for (const k of da) {
    if (!bekannt.has(k)) {
      aus.push({ pfad: k, kopf: k, feld: f(k, k, 'frei'), unbekannt: true });
    }
  }
  return aus;
}

/* ---------------------------------------------------------------------------
 * EINEN WERT FUER DIE ANZEIGE AUFBEREITEN.
 * ------------------------------------------------------------------------- */
export function alsText(wert, feld) {
  if (wert === null || wert === undefined) return '';
  if (typeof wert === 'boolean') return wert ? 'ja' : 'nein';
  if (Array.isArray(wert)) {
    if (wert.every((v) => v === null || typeof v === 'number')) {
      return wert.length ? wert.map((v) => (v === null ? '–' : v)).join(' · ') : '[ ]';
    }
    return `${wert.length} Einträge`;
  }
  if (typeof wert === 'object') {
    return Object.keys(wert).length ? JSON.stringify(wert) : '{ }';
  }
  if (typeof wert === 'number' && feld?.typ === 'zahl') {
    return String(Math.round(wert * 1e6) / 1e6);
  }
  return String(wert);
}

/* ===========================================================================
 * >>> DIE PRUEFUNG. <<<
 * ===========================================================================
 *
 *   fehler    Die Zeile ist unbrauchbar - ein Pflichtfeld fehlt, eine Zahl
 *             ist keine, eine Auswahl ist nicht vorgesehen, ein Schlüssel
 *             steht doppelt. Ein solcher Bestand wird NICHT angewendet.
 *   warnung   Ein Wert liegt ausserhalb des erwarteten Bereichs, oder eine
 *             Spalte steht nicht im Katalog. Das kann richtig sein - ein
 *             neues Profil, eine grössere Länge - und wird deshalb gemeldet,
 *             nicht abgelehnt.
 *
 * Ein Bereich, der ablehnt statt zu warnen, verböte genau das, wofür die
 * Datenbank da ist: einen neuen Typ.
 * ========================================================================= */
function pruefeWert(s, v, wo, fehler, warnung) {
  const fd = s.feld;
  const leer = v === null || v === undefined || v === '';
  if (leer) {
    if (fd.pflicht) fehler.push(`${wo}: «${s.kopf}» fehlt.`);
    return;
  }
  const einheit = fd.einheit ? ` ${fd.einheit}` : '';
  if (fd.typ === 'zahl') {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      fehler.push(`${wo}: «${s.kopf}» ist keine Zahl (${alsText(v)}).`);
      return;
    }
    if (Number.isFinite(fd.von) && v < fd.von) {
      warnung.push(`${wo}: «${s.kopf}» ist ${v}, erwartet ab ${fd.von}${einheit}.`);
    }
    if (Number.isFinite(fd.bis) && v > fd.bis) {
      warnung.push(`${wo}: «${s.kopf}» ist ${v}, erwartet bis ${fd.bis}${einheit}.`);
    }
  } else if (fd.typ === 'wahl') {
    if (!fd.wahl.includes(v)) {
      fehler.push(`${wo}: «${s.kopf}» ist «${v}», erlaubt sind `
                + fd.wahl.map((x) => `«${x}»`).join(', ') + '.');
    }
  } else if (fd.typ === 'bool') {
    if (typeof v !== 'boolean') {
      fehler.push(`${wo}: «${s.kopf}» ist weder ja noch nein (${alsText(v)}).`);
    }
  } else if (fd.typ === 'text') {
    if (typeof v !== 'string') {
      fehler.push(`${wo}: «${s.kopf}» ist kein Text (${alsText(v)}).`);
    }
  } else if (fd.typ === 'liste') {
    if (!Array.isArray(v)) {
      fehler.push(`${wo}: «${s.kopf}» ist keine Liste (${alsText(v)}).`);
    } else if (v.some((x) => x !== null && typeof x !== 'number')) {
      fehler.push(`${wo}: «${s.kopf}» enthält etwas anderes als Zahlen.`);
    }
  }
}

/** Wie eine Zeile in einer Meldung heisst. */
function zeileName(t, z, i) {
  const teile = t.schluesselSpalten
    .filter((k) => z[k] !== undefined && z[k] !== null)
    .map((k) => (k === 'nr' ? `Nr. ${z[k]}` : String(z[k])));
  return `${t.titel}${teile.length ? ` ${teile.join(' · ')}` : ` Zeile ${i + 1}`}`;
}

/**
 * Eine Tabelle prüfen.
 *
 * @param {string} db
 * @param {string} name
 * @param {object[]} zeilen
 */
export function pruefeTabelle(db, name, zeilen) {
  const t = tabelleKatalog(db, name);
  const fehler = [];
  const warnung = [];
  if (!t) return { fehler: [`Unbekannte Tabelle «${name}».`], warnung, anzahl: 0 };
  /*
   * GEPRUEFT WIRD JEDE SPALTE DES KATALOGS, nicht nur jede, die vorkommt.
   * Fehlt eine Pflichtspalte ganz - in Excel gelöscht -, muss das auffallen.
   * Die Anzeige zeigt dagegen nur, was da ist (spaltenVon).
   */
  const vorhanden = spaltenVon(db, name, zeilen);
  const unbekannt = vorhanden.filter((s) => s.unbekannt).map((s) => s.pfad);
  const sp = t.spalten;
  if (unbekannt.length) {
    warnung.push(`${t.titel}: Spalte(n) ohne Katalogeintrag - `
               + unbekannt.map((k) => `«${k}»`).join(', ') + '.');
  }
  /*
   * DOPPELTE SCHLUESSEL SIND EIN FEHLER. Der Rechenkern sucht mit `find`,
   * also gewönne stillschweigend der erste Satz, und der zweite wäre da,
   * ohne je zu wirken.
   */
  const gesehen = new Set();
  zeilen.forEach((z, i) => {
    const wo = zeileName(t, z, i);
    if (t.schluesselSpalten.length) {
      const id = JSON.stringify(t.schluesselSpalten.map((k) => z[k] ?? null));
      if (gesehen.has(id)) fehler.push(`${wo} kommt zweimal vor.`);
      gesehen.add(id);
    }
    for (const s of sp) {
      if (s.unbekannt) continue;
      // Die Nummer fehlt bei Einzelsätzen unter einem Stern - das ist Absicht.
      if (s.pfad === 'nr') continue;
      pruefeWert(s, z[s.pfad], wo, fehler, warnung);
    }
  });
  return { fehler, warnung, anzahl: zeilen.length };
}

/**
 * Alle Tabellen eines Sortiments prüfen - in Tabellenform.
 *
 * Dazu die VERWEISE: ein Blech, dessen Typ es nicht gibt, bricht beim
 * Zusammensetzen ohnehin ab; hier wird es vorher gesagt, mit der Zeile.
 */
export function pruefeTabellen(db, tab) {
  const fehler = [];
  const warnung = [];
  const jeTabelle = {};
  const kat = tabellenKatalog(db);
  for (const t of kat) {
    const zeilen = t.name === 'angaben' ? (tab.angaben ?? [])
                                         : (tab.tabellen?.[t.name] ?? []);
    const r = pruefeTabelle(db, t.name, zeilen);
    fehler.push(...r.fehler);
    warnung.push(...r.warnung);
    jeTabelle[t.name] = { anzahl: r.anzahl, fehler: r.fehler.length,
                          warnung: r.warnung.length };
  }
  for (const n of Object.keys(tab.tabellen ?? {})) {
    if (!kat.some((t) => t.name === n)) {
      fehler.push(`Tabelle «${n}» gehört nicht zum Sortiment «${db}».`);
    }
  }
  // Verweise der Untertabellen auf ihre Eltern
  const flachT = tabellenVon(db);
  for (const t of flachT.filter((x) => x.eltern)) {
    const e = flachT.find((x) => x.name === t.eltern);
    const ids = new Set((tab.tabellen?.[e.name] ?? []).map((z) =>
      JSON.stringify((e.haupt ? [e.schluessel] : e.schluesselSpalten)
        .map((k) => z[k] ?? null))));
    const tk = kat.find((x) => x.name === t.name);
    (tab.tabellen?.[t.name] ?? []).forEach((z, i) => {
      const ez = (e.haupt ? [e.schluessel] : e.schluesselSpalten)
        .map((k) => (k === 'nr' ? z[t._elternBezug] : z[k]) ?? null);
      if (!ids.has(JSON.stringify(ez))) {
        fehler.push(`${zeileName(tk, z, i)}: in «${kat.find((x) => x.name === e.name)
          ?.titel ?? e.name}» gibt es keine Zeile ${ez.join(' · ')}.`);
      }
    });
  }
  return { ok: fehler.length === 0, fehler, warnung, jeTabelle };
}

/**
 * Einen Satz in Baumform prüfen - für Stellen, die einen einzelnen Satz in
 * der Hand haben. Er wird dazu als Tabelle zerlegt.
 */
export function pruefeSatz(a, satz, i = 0) {
  const tab = zerlege(a.db, { [a.liste]: [satz] });
  const r = pruefeTabellen(a.db, tab);
  return { fehler: r.fehler, warnung: r.warnung };
}

/** Einen Abschnitt prüfen: Haupttabelle und ihre Untertabellen. */
export function pruefeAbschnitt(best, key) {
  const a = abschnitt(key);
  if (!a) return { fehler: [`Unbekannter Abschnitt «${key}».`], warnung: [] };
  if (!best?.[a.db]) return { fehler: [], warnung: [], anzahl: 0 };
  const tab = zerlege(a.db, best[a.db]);
  const namen = new Set([a.tabelle, ...Object.keys(a.tabellen ?? {})]);
  const fehler = [];
  const warnung = [];
  for (const n of namen) {
    const zeilen = tab.tabellen[n] ?? [];
    const r = pruefeTabelle(a.db, n, zeilen);
    fehler.push(...r.fehler);
    warnung.push(...r.warnung);
  }
  return { fehler, warnung, anzahl: tab.tabellen[a.tabelle]?.length ?? 0 };
}

/**
 * Alles prüfen, was im Bestand vorliegt - der Bestand in Baumform, je
 * Sortiment. Fehlende Sortimente werden übergangen.
 */
export function pruefeBestand(best) {
  const fehler = [];
  const warnung = [];
  const abschnitte = [];
  for (const db of datenbanken()) {
    if (!best?.[db]) continue;
    const r = pruefeTabellen(db, zerlege(db, best[db]));
    fehler.push(...r.fehler);
    warnung.push(...r.warnung);
    for (const a of ABSCHNITTE.filter((x) => x.db === db)) {
      const j = r.jeTabelle[a.tabelle];
      abschnitte.push({ key: a.key, titel: a.titel, anzahl: j?.anzahl ?? 0,
                        fehler: j?.fehler ?? 0, warnung: j?.warnung ?? 0 });
    }
  }
  return { ok: fehler.length === 0, fehler, warnung, abschnitte };
}
