/**
 * data.katalog.js
 * ---------------------------------------------------------------------------
 * DER FELDKATALOG: was ein Datensatz führt, in welcher Einheit, und woher er
 * stammt.
 *
 * Weisung vom 16. September: «alle relevanten tragwerksdaten werden
 * ausschliesslich über die datenbank gesteuert, es soll nichts hardcoded in
 * der app sein. die ui und die sbb daten sollen getrennt sein.»
 *
 * >>> WARUM EIN KATALOG UND NICHT NUR TABELLEN. <<<
 *
 * Eine Tabellenansicht liesse sich auch ohne ihn bauen - man nimmt die
 * Schlüssel des ersten Datensatzes als Kopfzeile und ist fertig. Nur wüsste
 * dann niemand, dass `jba` ein Aussenmass in Millimetern ist und `ey` ein
 * Achsabstand in Zentimetern. Genau diese Verwechslung hat in dieser
 * Anwendung zweimal zugeschlagen: einmal beim Ankerquerschnitt, einmal bei
 * den Mastprofilen - beide Male stand h in mm, wo der Rechenweg cm erwartete.
 *
 * Der Katalog beschreibt jedes Feld EINMAL. Daraus kommen:
 *
 *   - die Anschrift und die Einheit in der Tabellenansicht
 *   - die Kopfzeile der Excel-Ausleitung
 *   - die Prüfung beim Einlesen (Pflichtfeld, Zahl, Bereich, Auswahl)
 *   - die Kontrolle im Prüfstand, dass Katalog und Daten zusammenpassen
 *
 * Vier Verwendungen, eine Quelle. Weichen Daten und Katalog voneinander ab,
 * fällt es beim nächsten Prüflauf auf statt im Nachweis.
 *
 * >>> DIE TRENNLINIE: NORM ODER SORTIMENT. <<<
 *
 * Jeder Abschnitt trägt eine `herkunft`, und sie entscheidet, wo die Datei
 * liegen darf:
 *
 *   'norm'       Querschnittswerte und Stahlgüten. Sie stehen in
 *                Profilnormen und in der SIA 263, gehören niemandem und
 *                dürfen in einer öffentlichen Ablage liegen.
 *   'sortiment'  Die Zahlen des Betreibers: welche Typen es gibt, was sie
 *                wiegen, welche Last auf sie anzusetzen ist. Sie bleiben
 *                örtlich (siehe .gitignore) und kommen als Datenpaket.
 *
 * Das ist die Trennung, die die Weisung verlangt: die Anwendung ist
 * allgemein, die Zahlen darin sind es nicht.
 *
 * >>> WAS NICHT HIERHER GEHOERT. <<<
 *
 * Konventionen, an denen Rechenwege hängen - die Stegrichtung etwa, die
 * entscheidet, ob I_y oder I_z die Einspannung trägt. Sie ist keine Zahl,
 * die man pflegt, sondern eine Verzweigung im Rechenweg mit zwei Namen
 * daran. In eine Datenbank geschrieben wäre sie kein Datum, sondern
 * Steuercode - und der gehört in den Code.
 * ---------------------------------------------------------------------------
 */

/* ---------------------------------------------------------------------------
 * DIE BAUSTEINE EINES FELDES.
 *
 *   k        Schlüssel im Datensatz
 *   label    Anschrift in der Tabelle
 *   einheit  Einheit oder null - sie steht in der zweiten Kopfzeile
 *   typ      'text' | 'zahl' | 'bool' | 'wahl' | 'satz' | 'liste' | 'frei'
 *   pflicht  ohne diesen Wert ist der Satz unbrauchbar
 *   von/bis  Bereich einer Zahl; ausserhalb wird gewarnt, nicht abgelehnt
 *   wahl     erlaubte Werte bei typ 'wahl'
 *   unter    Felder des Untersatzes bei 'satz' und 'liste'
 *   notiz    was das Feld bedeutet - ein Satz, kein Absatz
 *
 * 'frei' heisst: beliebiger Inhalt, nicht geprüft. Das ist kein Schlupfloch,
 * sondern die ehrliche Auskunft, dass eine Massliste je Länge sich nicht in
 * Spalten pressen lässt.
 * ------------------------------------------------------------------------- */
const f = (k, label, typ, opt = {}) => ({ k, label, typ, ...opt });
const zahl = (k, label, einheit, opt = {}) =>
  f(k, label, 'zahl', { einheit, ...opt });
const text = (k, label, opt = {}) => f(k, label, 'text', opt);

/** Die Herkunftsangabe jedes geprüften Satzes - überall dieselben drei. */
const HERKUNFT_FELDER = [
  f('quelle', 'Quelle', 'frei',
    { notiz: 'Woher die Zahlen stammen - Blatt, Zeichnung oder Messung.' }),
  f('geprueft', 'Geprüft', 'frei',
    { notiz: 'Was nachgelesen wurde. Leer heisst: noch nicht gegengelesen.' }),
  text('hinweis', 'Hinweis',
    { notiz: 'Was beim Gebrauch dieses Satzes zu beachten ist.' }),
];

/* ===========================================================================
 * DIE ABSCHNITTE.
 * ===========================================================================
 *
 *   key        eindeutig, auch der Name des Excel-Blatts
 *   db         welche Datenbank ihn führt
 *   liste      das Feld darin, das die Sätze trägt
 *   schluessel das Feld, das einen Satz benennt
 * ========================================================================= */
export const ABSCHNITTE = [
  /* ----------------------------------------------------------------- NORM */
  {
    key: 'stahlgueten', db: 'normen', liste: 'stahlgueten',
    titel: 'Stahlgüten', herkunft: 'norm', schluessel: 'name',
    notiz: 'Nach SIA 263, Erzeugnisdicke t ≤ 40 mm.',
    felder: [
      text('name', 'Bezeichnung', { pflicht: true }),
      zahl('fy', 'Fliessgrenze f_y', 'N/mm²',
        { pflicht: true, von: 200, bis: 500 }),
      zahl('fu', 'Zugfestigkeit f_u', 'N/mm²',
        { pflicht: true, von: 300, bis: 700 }),
    ],
  },
  {
    key: 'winkelprofile', db: 'normen', liste: 'winkelprofile',
    titel: 'Winkelprofile', herkunft: 'norm', schluessel: 'name',
    notiz: 'Die vier Gurte eines Tragjochs. Gleichschenklig, wo nicht anders '
         + 'angeschrieben; W ist das KLEINSTE elastische Widerstandsmoment.',
    felder: [
      text('name', 'Bezeichnung', { pflicht: true }),
      f('form', 'Form', 'wahl',
        { wahl: ['gleichschenklig', 'ungleichschenklig'], pflicht: true }),
      zahl('aH', 'Schenkel liegend a_H', 'mm', { pflicht: true, von: 20, bis: 250 }),
      zahl('aV', 'Schenkel stehend a_V', 'mm', { pflicht: true, von: 20, bis: 250 }),
      zahl('t', 'Schenkeldicke t', 'mm', { pflicht: true, von: 3, bis: 30 }),
      zahl('g', 'Eigengewicht', 'kg/m', { pflicht: true, von: 1, bis: 100 }),
      zahl('A', 'Querschnittsfläche', 'cm²', { pflicht: true, von: 1, bis: 150 }),
      zahl('iy', 'Trägheitsradius i_y', 'cm', { pflicht: true, von: 0.5, bis: 12 }),
      zahl('iz', 'Trägheitsradius i_z', 'cm', { pflicht: true, von: 0.5, bis: 12 }),
      zahl('imin', 'kleinster Radius i_min', 'cm',
        { pflicht: true, von: 0.3, bis: 10,
          notiz: 'Hauptachse v-v — sie trägt den Knicknachweis.' }),
      zahl('zsH', 'Schwerpunkt z_sH', 'cm', { pflicht: true, von: 0.3, bis: 10 }),
      zahl('zsV', 'Schwerpunkt z_sV', 'cm', { pflicht: true, von: 0.3, bis: 10 }),
      zahl('Wy', 'Widerstandsmoment W_y', 'cm³', { pflicht: true, von: 0.5, bis: 400 }),
      zahl('Wz', 'Widerstandsmoment W_z', 'cm³', { pflicht: true, von: 0.5, bis: 400 }),
      text('hinweis', 'Hinweis'),
    ],
  },
  {
    key: 'walzprofile', db: 'normen', liste: 'walzprofile',
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
      zahl('ey', 'Schwerpunktabstand e_y', 'cm',
        { von: 0, bis: 10,
          notiz: 'Nur beim U-Profil. Der Achsabstand der Gurte ist k − 2·e_y, '
               + 'nicht k — neun Prozent Unterschied, die voll ins Moment gehen.' }),
    ],
  },
  {
    key: 'mastprofile', db: 'normen', liste: 'mastprofile',
    titel: 'Mastprofile (HEB/HEM)', herkunft: 'norm', schluessel: 'name',
    notiz: 'Querschnittswerte nach EN 10365. ACHTUNG: h und b in '
         + 'MILLIMETERN — anders als bei den Walzprofilen. Welche Typen das '
         + 'Sortiment führt und welche Windlast auf sie wirkt, steht im '
         + 'Abschnitt «Masttypen».',
    felder: [
      text('name', 'Bezeichnung', { pflicht: true }),
      zahl('h', 'Höhe h', 'mm', { pflicht: true, von: 80, bis: 600 }),
      zahl('b', 'Breite b', 'mm', { pflicht: true, von: 80, bis: 400 }),
      zahl('tw', 'Stegdicke t_w', 'mm', { pflicht: true, von: 3, bis: 40 }),
      zahl('tf', 'Flanschdicke t_f', 'mm', { pflicht: true, von: 5, bis: 60 }),
      zahl('g', 'Eigengewicht', 'kg/m', { pflicht: true, von: 20, bis: 400 }),
      zahl('A', 'Querschnittsfläche', 'cm²', { pflicht: true, von: 20, bis: 500 }),
      zahl('Iy', 'Trägheitsmoment I_y', 'cm⁴', { pflicht: true, von: 500, bis: 200000 }),
      zahl('Wy', 'Widerstandsmoment W_y', 'cm³', { pflicht: true, von: 50, bis: 8000 }),
      zahl('iy', 'Trägheitsradius i_y', 'cm', { pflicht: true, von: 3, bis: 30 }),
      zahl('Iz', 'Trägheitsmoment I_z', 'cm⁴', { pflicht: true, von: 100, bis: 50000 }),
      zahl('Wz', 'Widerstandsmoment W_z', 'cm³', { pflicht: true, von: 20, bis: 3000 }),
      zahl('iz', 'Trägheitsradius i_z', 'cm', { pflicht: true, von: 2, bis: 20 }),
      zahl('It', 'Torsionsträgheit I_t', 'cm⁴',
        { pflicht: true, von: 5, bis: 2000,
          notiz: 'Sie trägt den Torsionsnachweis und die Wölbkrafttorsion.' }),
    ],
  },

  /* ------------------------------------------------------------ SORTIMENT */
  {
    key: 'masttypen', db: 'masten', liste: 'typen',
    titel: 'Masttypen', herkunft: 'sortiment', schluessel: 'profil',
    notiz: 'Welche Profile das Sortiment führt und was an Wind auf sie '
         + 'anzusetzen ist. Der Querschnitt steht unter «Mastprofile».',
    felder: [
      text('profil', 'Profil', { pflicht: true,
        notiz: 'Verweist auf einen Satz im Abschnitt «Mastprofile».' }),
      f('wind', 'Windlast', 'satz', {
        pflicht: true,
        notiz: 'Charakteristische Laufmeterlast je Einwirkungsklasse.',
        unter: [
          f('quer', 'quer zum Gleis', 'satz', { unter: [
            zahl('EK1', 'EK1', 'kN/m', { von: 0, bis: 3 }),
            zahl('EK2', 'EK2', 'kN/m', { von: 0, bis: 3 }),
            zahl('EK3', 'EK3', 'kN/m', { von: 0, bis: 3 }),
          ] }),
          f('laengs', 'in Gleisrichtung', 'satz', { unter: [
            zahl('EK1', 'EK1', 'kN/m', { von: 0, bis: 3 }),
            zahl('EK2', 'EK2', 'kN/m', { von: 0, bis: 3 }),
            zahl('EK3', 'EK3', 'kN/m', { von: 0, bis: 3 }),
          ] }),
        ],
      }),
    ],
  },
  {
    key: 'tragjoche', db: 'tragjoche', liste: 'typen',
    titel: 'Tragjochtypen', herkunft: 'sortiment', schluessel: 'typ',
    notiz: 'Masse in Millimetern, Aussenmasse wo nicht anders angeschrieben.',
    felder: [
      text('typ', 'Typ', { pflicht: true }),
      f('bauweise', 'Bauweise', 'wahl', { wahl: ['neu', 'alt'], pflicht: true,
        notiz: 'Die alte Bauweise hat eine Voute am Jochende.' }),
      zahl('jd', 'Bauhöhe jd', 'mm', { pflicht: true, von: 200, bis: 2000,
        notiz: 'Aussenmass Oberkante bis Unterkante.' }),
      zahl('jk', 'erster Knick jk', 'mm', { von: 0, bis: 5000 }),
      zahl('jkk', 'zweiter Knick jkk', 'mm', { von: 0, bis: 8000 }),
      zahl('teilung', 'Blechteilung', 'mm', { pflicht: true, von: 200, bis: 2000,
        notiz: 'Regelabstand der Bindebleche entlang der Jochachse.' }),
      zahl('gewicht', 'Eigengewicht', 'kg/m', { pflicht: true, von: 10, bis: 300 }),
      f('laengeKurz', 'Bereich kurze Ausführung', 'liste', { einheit: 'm',
        notiz: 'Von–bis. Nicht jeder Typ hat eine kurze Ausführung.' }),
      f('laengeNorm', 'Längenbereich', 'liste', { einheit: 'm',
        notiz: 'Von–bis, zwei Zahlen.' }),
      f('og', 'Obergurt', 'satz', { pflicht: true, unter: [
        text('profil', 'Profil', { pflicht: true,
          notiz: 'Verweist auf einen Satz im Abschnitt «Winkelprofile».' }),
        zahl('ja', 'Schenkellänge ja', 'mm', { pflicht: true, von: 20, bis: 250 }),
        zahl('jf', 'Schenkeldicke jf', 'mm', { pflicht: true, von: 3, bis: 30 }),
        zahl('jba', 'Breite Auflager jba', 'mm', { pflicht: true, von: 100, bis: 2000 }),
        zahl('jbb', 'Breite Feld jbb', 'mm', { pflicht: true, von: 100, bis: 2000 }),
      ] }),
      f('ug', 'Untergurt', 'satz', { pflicht: true, unter: [
        text('profil', 'Profil', { pflicht: true }),
        zahl('ja', 'Schenkellänge ja', 'mm', { pflicht: true, von: 20, bis: 250 }),
        zahl('jf', 'Schenkeldicke jf', 'mm', { pflicht: true, von: 3, bis: 30 }),
        zahl('jba', 'Breite Auflager jba', 'mm', { pflicht: true, von: 100, bis: 2000 }),
        zahl('jbb', 'Breite Feld jbb', 'mm', { pflicht: true, von: 100, bis: 2000 }),
      ] }),
      f('schnee', 'Schneelast', 'satz', { einheit: 'kN/m',
        notiz: 'Charakteristisch, Schlüssel ist die Referenz-Schneelast.' }),
      f('wind', 'Windlast', 'satz', { einheit: 'kN/m',
        notiz: 'Charakteristisch, Schlüssel ist der Referenz-Staudruck.' }),
      f('bleche', 'Bindebleche', 'frei',
        { notiz: 'Vertikal und horizontal, je Position Breite, Dicke, '
               + 'Länge, Zone und Werkstoff. Werkstattgeometrie — nicht '
               + 'anzupassen.' }),
      f('staffelung', 'Staffelung', 'frei',
        { notiz: 'Anzahl je Position, vom Auflager zur Feldmitte.' }),
      f('ausfuehrungen', 'Ausführungen', 'frei',
        { notiz: 'Nur alte Bauweise: eigene Staffelung je Längenbereich.' }),
      f('voute', 'Voute', 'frei', { notiz: 'Nur alte Bauweise.' }),
      ...HERKUNFT_FELDER,
    ],
  },
  {
    key: 'abfangjoche', db: 'abfangjoche', liste: 'typen',
    titel: 'Abfangjochtypen', herkunft: 'sortiment', schluessel: 'typ',
    notiz: 'Zwei Gurte statt vier. Masse in Millimetern.',
    felder: [
      text('typ', 'Typ', { pflicht: true }),
      f('bauweise', 'Bauweise', 'wahl', { wahl: ['neu', 'alt'], pflicht: true }),
      text('profil', 'Gurtprofil', { pflicht: true,
        notiz: 'Verweist auf einen Satz im Abschnitt «Walzprofile».' }),
      f('jt', 'Längenbereich', 'liste', { einheit: 'm', pflicht: true }),
      zahl('gewicht', 'Eigengewicht', 'kg/m', { pflicht: true, von: 10, bis: 300 }),
      f('masse', 'Hauptmasse', 'satz', { pflicht: true, unter: [
        zahl('a', 'a', 'mm'), zahl('b', 'b', 'mm'), zahl('c', 'c', 'mm'),
        zahl('d', 'Stegabstand d', 'mm',
          { notiz: 'd ist der STEGABSTAND, nicht die Bauhöhe.' }),
        zahl('e', 'e', 'mm'), zahl('f', 'f', 'mm'), zahl('g', 'g', 'mm'),
        zahl('h', 'h', 'mm'), zahl('k', 'Aussenmass k', 'mm'),
        zahl('jdEnde', 'Bauhöhe am Ende', 'mm'),
        zahl('teilung', 'Blechteilung', 'mm'),
      ] }),
      f('schnee', 'Schneelast', 'satz', { einheit: 'kN/m' }),
      f('wind', 'Windlast', 'satz', { einheit: 'kN/m' }),
      f('aufbau', 'Aufbau', 'frei',
        { notiz: 'Gurtzahl, Werkstoff, Spreizung, Form.' }),
      f('bindeblech', 'Bindebleche', 'frei',
        { notiz: 'Regelblech und die beiden Endbleche. Werkstattgeometrie.' }),
      f('verstaerkung', 'Verstärkung', 'frei',
        { notiz: 'Aufgesetztes Gurtstück an der Gabel.' }),
      f('laengen', 'Längenlisten', 'frei',
        { notiz: 'Je lieferbare Länge eine eigene Blech- und Feldliste.' }),
      f('randmasse', 'Randmasse', 'frei'),
      f('regelfelder', 'Regelfelder', 'frei'),
      f('kroepfung', 'Kröpfung', 'frei'),
      f('quersteifung', 'Quersteifung', 'frei'),
      f('quersteife', 'Quersteife', 'frei'),
      f('deckblech', 'Deckblech', 'frei'),
      f('rippen', 'Rippen', 'frei'),
      ...HERKUNFT_FELDER,
    ],
  },
  {
    key: 'anker', db: 'anker', liste: 'typen',
    titel: 'Zug- und Druckstützen', herkunft: 'sortiment', schluessel: 'id',
    notiz: 'Pendelstäbe am Masten. Die zulässigen Kräfte stammen aus einem '
         + 'Bemessungsdiagramm und sind mit CHARAKTERISTISCHEN Kräften zu '
         + 'vergleichen, nicht mit Bemessungswerten.',
    felder: [
      text('id', 'Kurzzeichen', { pflicht: true }),
      text('name', 'Bezeichnung', { pflicht: true }),
      f('art', 'Art', 'wahl', { wahl: ['stuetze', 'seil'], pflicht: true,
        notiz: 'Eine Stütze trägt Zug und Druck, ein Seil nur Zug.' }),
      text('profil', 'Profil'),
      text('stahl', 'Stahlgüte'),
      /*
       * DIE BEIDEN BAUARTEN FUEHREN VERSCHIEDENE FELDER, und deshalb ist
       * hier fast nichts Pflicht. Eine Stütze hat eine Druckkurve und eine
       * grösste lieferbare Länge; ein Seil hat beides nicht - es knickt
       * nicht, und es wird abgelängt. Umgekehrt trägt nur das Seil eine
       * Betriebslast und eine Dehnung. Pflichtfelder über beide Bauarten zu
       * legen hiesse, für jede die Felder der anderen zu verlangen.
       */
      zahl('laengeMax', 'grösste Länge', 'm', { von: 1, bis: 30,
        notiz: 'Nur Stütze — darüber gibt es den Typ nicht.' }),
      f('druck', 'Druckkurve', 'satz', { unter: [
        f('L', 'Stützstellen Länge', 'liste', { einheit: 'm' }),
        f('N', 'zulässige Druckkraft', 'liste', { einheit: 'kN' }),
        zahl('kappungAb', 'Kappung ab', 'm',
          { notiz: 'Unterhalb dieser Länge begrenzt der Querschnitt, nicht '
                 + 'das Knicken.' }),
        zahl('kappung', 'Kappungswert', 'kN'),
      ] }),
      f('zug', 'Zugkräfte', 'satz', { unter: [
        zahl('ankerplatte', 'an Ankerplatte', 'kN', { von: 0, bis: 500 }),
        zahl('ankereisen', 'an Ankereisen', 'kN', { von: 0, bis: 500 }),
      ], notiz: 'Nur Stütze. Sie hängt an der BEFESTIGUNG, nicht an der '
              + 'Länge — ein Zugstab knickt nicht.' }),
      zahl('zugBetrieb', 'zulässige Betriebslast', 'kN',
        { von: 0, bis: 500,
          notiz: 'Nur Seil. Die Bruchkraft ist ein Vielfaches davon und '
               + 'gehört NICHT in den Nachweis.' }),
      zahl('bruchkraft', 'Bruchkraft', 'kN', { von: 0, bis: 2000,
        notiz: 'Nur Seil. Angabe des Blattes, nicht Grundlage des Nachweises.' }),
      zahl('dehnung', 'Dehnung', 'mm/(m·kN)', { von: 0, bis: 5,
        notiz: 'Nur Seil. Daraus stammt die Dehnsteifigkeit EA.' }),
      zahl('masseFest', 'Festmasse', 'kg', { von: 0, bis: 200,
        notiz: 'Nur Seil — Spannschloss und Beschläge.' }),
      zahl('masseProM', 'Masse je Meter', 'kg/m', { von: 0, bis: 20 }),
      f('querschnitt', 'Querschnitt', 'frei',
        { notiz: 'Masse in mm, Trägheitsmomente in cm — die Einheiten '
               + 'wechseln innerhalb dieses Satzes.' }),
      f('spreizung', 'Spreizung', 'frei'),
      f('bindeblech', 'Bindebleche', 'frei'),
    ],
  },
  {
    key: 'lasttabelle', db: 'fl_bauteile', liste: 'bauteile',
    titel: 'Lasttabelle', herkunft: 'sortiment', schluessel: 'id',
    notiz: 'Was ein Bauteil an Last einträgt. Leere Felder heissen: für '
         + 'diese Klasse ist kein Wert angegeben — sie werden NICHT '
         + 'interpoliert.',
    felder: [
      text('id', 'Kurzzeichen', { pflicht: true }),
      text('gruppe', 'Gruppe', { pflicht: true }),
      text('name', 'Bezeichnung', { pflicht: true }),
      f('einheit', 'Einheit', 'wahl', { wahl: ['kN', 'kN/m'], pflicht: true,
        notiz: 'Bei kN/m ist mit der Länge zu multiplizieren.' }),
      zahl('eigengewicht', 'Eigengewicht', 'kN bzw. kN/m',
        { pflicht: true, von: 0, bis: 50 }),
      f('windQuer', 'Wind quer', 'satz', { einheit: 'kN bzw. kN/m', unter: [
        zahl('EK0', 'EK0', null, { von: 0, bis: 20 }),
        zahl('EK1', 'EK1', null, { von: 0, bis: 20 }),
        zahl('EK2', 'EK2', null, { von: 0, bis: 20 }),
        zahl('EK3', 'EK3', null, { von: 0, bis: 20 }),
      ] }),
      f('windLaengs', 'Wind längs', 'satz', { einheit: 'kN bzw. kN/m', unter: [
        zahl('EK0', 'EK0', null, { von: 0, bis: 20 }),
        zahl('EK1', 'EK1', null, { von: 0, bis: 20 }),
        zahl('EK2', 'EK2', null, { von: 0, bis: 20 }),
        zahl('EK3', 'EK3', null, { von: 0, bis: 20 }),
      ] }),
      f('schnee', 'Schneelast', 'satz', { einheit: 'kN bzw. kN/m', unter: [
        zahl('EK1-3', 'EK1–3', null, { von: 0, bis: 20 }),
        zahl('EK4-6', 'EK4–6', null, { von: 0, bis: 20 }),
      ] }),
      f('rolle', 'Rolle', 'wahl',
        { wahl: ['traeger', 'aufbau', 'drahtwerk', 'stumm'], pflicht: true,
          notiz: '«stumm» heisst: das Teil trägt keine eigene Last.' }),
      zahl('leiterzug', 'Leiterzug', 'kN', { von: 0, bis: 60,
        notiz: 'Nur Drahtwerk — er erzeugt die Umlenkkraft im Bogen.' }),
      f('freieFlaeche', 'über freie Fläche', 'bool',
        { notiz: 'Das Teil steht nicht mit Lastwerten in der Tabelle, '
               + 'sondern wird über seine Angriffsfläche gerechnet: '
               + 'w = A · q_ref(EK) · c.' }),
      text('reglage', 'Reglage'),
      text('bemerkung', 'Bemerkung'),
    ],
  },
  {
    key: 'anbauteile', db: 'anbauteile', liste: 'vorlagen',
    titel: 'Anbauteil-Vorlagen', herkunft: 'sortiment', schluessel: 'id',
    notiz: 'Eine Vorlage ist eine Baugruppe: sie benennt die Bauteile aus '
         + 'der Lasttabelle und sagt, wo sie sitzen. z zählt NACH OBEN, '
         + 'gemessen ab der Schwerachse des Anschlussgurtes.',
    felder: [
      text('id', 'Kurzzeichen', { pflicht: true }),
      text('name', 'Bezeichnung', { pflicht: true }),
      text('gruppe', 'Gruppe'),
      zahl('rang', 'Rang', null, { von: 0, bis: 99,
        notiz: 'Reihenfolge im Wähler.' }),
      text('farbe', 'Farbschlüssel'),
      text('beschreibung', 'Beschreibung'),
      zahl('raster', 'Raster', 'm', { pflicht: true, von: 0, bis: 5,
        notiz: 'Länge der Befestigung in Jochachse. Die Last wird auf '
             + 'x − raster/2 und x + raster/2 verteilt eingeleitet.' }),
      f('befestigung', 'Befestigung', 'wahl',
        { wahl: ['oben', 'unten', 'durchgehend'], pflicht: true }),
      zahl('eigengewicht', 'Eigengewicht', 'kN', { von: 0, bis: 50 }),
      f('windAufTraeger', 'Wind auf Träger', 'bool',
        { notiz: 'Kragarm: nur ein Teil der Windlast erreicht das Joch.' }),
      zahl('windAnteil', 'Windanteil', '%', { von: 0, bis: 100 }),
      zahl('y', 'Versatz y', 'm', { von: -10, bis: 10 }),
      zahl('z', 'Höhe z', 'm', { von: -20, bis: 20 }),
      f('module', 'Module', 'liste', { unter: [
        text('bauteil', 'Bauteil', { pflicht: true,
          notiz: 'Verweist auf ein Kurzzeichen der Lasttabelle.' }),
        zahl('anzahl', 'Anzahl', null, { pflicht: true, von: 0, bis: 20 }),
        zahl('laenge', 'Länge', 'm', { von: 0, bis: 30 }),
        zahl('x', 'Versatz x', 'm', { von: -20, bis: 20 }),
        zahl('y', 'Versatz y', 'm', { von: -20, bis: 20 }),
        zahl('z', 'Höhe z', 'm', { von: -20, bis: 20 }),
        f('umlenkung', 'Umlenkkraft', 'bool'),
        zahl('eigengewicht', 'Eigengewicht', 'kN', { von: 0, bis: 50 }),
        zahl('aQuer', 'Fläche quer', 'm²', { von: 0, bis: 20 }),
        zahl('aLaengs', 'Fläche längs', 'm²', { von: 0, bis: 20 }),
        zahl('cw', 'Kraftbeiwert c_w', null, { von: 0, bis: 3 }),
      ] }),
      f('lasten', 'Freie Lasten', 'frei',
        { notiz: 'Lastblöcke, die keinem Bauteil der Tabelle entsprechen.' }),
    ],
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

/** Welche Datenbanken der Katalog kennt, in der Reihenfolge der Abschnitte. */
export function datenbanken() {
  return [...new Set(ABSCHNITTE.map((a) => a.db))];
}

/**
 * Die Sätze eines Abschnitts aus einem Datenbestand holen.
 *
 * @param {object} best  {normen, masten, tragjoche, …}
 */
export function saetze(best, key) {
  const a = abschnitt(key);
  if (!a) return [];
  const liste = best?.[a.db]?.[a.liste];
  return Array.isArray(liste) ? liste : [];
}

/* ---------------------------------------------------------------------------
 * EINEN WERT FUER DIE ANZEIGE AUFBEREITEN.
 *
 * Verschachteltes wird NICHT ausgeschrieben, sondern gezählt: «5 Einträge».
 * Eine Blechliste in eine Tabellenzelle zu quetschen hiesse, sie unlesbar zu
 * machen und zugleich vorzutäuschen, man könne sie dort pflegen.
 * ------------------------------------------------------------------------- */
export function alsText(wert, feld) {
  if (wert === null || wert === undefined) return '';
  if (typeof wert === 'boolean') return wert ? 'ja' : 'nein';
  if (Array.isArray(wert)) {
    if (wert.every((v) => typeof v === 'number')) return wert.join(' … ');
    return `${wert.length} Einträge`;
  }
  if (typeof wert === 'object') {
    const e = Object.entries(wert).filter(([, v]) =>
      v !== null && typeof v !== 'object');
    if (e.length && e.length === Object.keys(wert).length) {
      return e.map(([k, v]) => `${k} ${v}`).join(' · ');
    }
    return `${Object.keys(wert).length} Felder`;
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
 * Sie trennt ZWEI Schweregrade, und die Trennung ist keine Förmlichkeit:
 *
 *   fehler    Der Satz ist unbrauchbar - ein Pflichtfeld fehlt oder eine
 *             Zahl ist keine. Ein solcher Bestand wird NICHT angewendet.
 *   warnung   Der Wert liegt ausserhalb des erwarteten Bereichs. Das kann
 *             richtig sein - ein neues Profil, eine grössere Länge - und
 *             deshalb wird es gemeldet, nicht abgelehnt.
 *
 * Ein Bereich, der ablehnt statt zu warnen, wäre eine Bevormundung: er
 * verböte genau das, wofür die Datenbank da ist, nämlich neue Typen.
 * ========================================================================= */
export function pruefeSatz(a, satz, i) {
  const fehler = [];
  const warnung = [];
  const wo = satz?.[a.schluessel] ?? `Zeile ${i + 1}`;

  const feld = (fd, obj, pfad) => {
    const v = obj?.[fd.k];
    const leer = v === null || v === undefined || v === '';
    if (leer) {
      if (fd.pflicht) fehler.push(`${wo}: «${pfad}» fehlt.`);
      return;
    }
    if (fd.typ === 'zahl') {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        fehler.push(`${wo}: «${pfad}» ist keine Zahl (${alsText(v, fd)}).`);
        return;
      }
      if (Number.isFinite(fd.von) && v < fd.von) {
        warnung.push(`${wo}: «${pfad}» ist ${v}, erwartet ab ${fd.von}`
                   + `${fd.einheit ? ' ' + fd.einheit : ''}.`);
      }
      if (Number.isFinite(fd.bis) && v > fd.bis) {
        warnung.push(`${wo}: «${pfad}» ist ${v}, erwartet bis ${fd.bis}`
                   + `${fd.einheit ? ' ' + fd.einheit : ''}.`);
      }
    } else if (fd.typ === 'wahl' && !fd.wahl.includes(v)) {
      fehler.push(`${wo}: «${pfad}» ist «${v}», erlaubt sind `
                + fd.wahl.map((x) => `«${x}»`).join(', ') + '.');
    } else if (fd.typ === 'satz' && fd.unter) {
      if (typeof v !== 'object' || Array.isArray(v)) {
        fehler.push(`${wo}: «${pfad}» ist kein Satz von Werten.`);
        return;
      }
      fd.unter.forEach((u) => feld(u, v, `${pfad} · ${u.label}`));
    } else if (fd.typ === 'liste') {
      if (!Array.isArray(v)) {
        fehler.push(`${wo}: «${pfad}» ist keine Liste.`);
        return;
      }
      if (fd.unter) {
        v.forEach((e, j) => fd.unter.forEach((u) =>
          feld(u, e, `${pfad} ${j + 1} · ${u.label}`)));
      }
    }
  };

  a.felder.forEach((fd) => feld(fd, satz, fd.label));
  return { fehler, warnung };
}

/**
 * Einen ganzen Abschnitt prüfen.
 *
 * Doppelte Schlüssel sind ein FEHLER, kein Schönheitsfleck: der Rechenkern
 * sucht mit `find`, also gewönne stillschweigend der erste, und der zweite
 * Satz wäre da, ohne je zu wirken.
 */
export function pruefeAbschnitt(best, key) {
  const a = abschnitt(key);
  if (!a) return { fehler: [`Unbekannter Abschnitt «${key}».`], warnung: [] };
  const liste = saetze(best, key);
  const fehler = [];
  const warnung = [];
  const gesehen = new Set();
  liste.forEach((s, i) => {
    const k = s?.[a.schluessel];
    if (k !== undefined && k !== null) {
      if (gesehen.has(k)) fehler.push(`${a.titel}: «${k}» kommt zweimal vor.`);
      gesehen.add(k);
    }
    const r = pruefeSatz(a, s, i);
    fehler.push(...r.fehler);
    warnung.push(...r.warnung);
  });
  return { fehler, warnung, anzahl: liste.length };
}

/** Alles prüfen, was im Bestand vorliegt. Fehlende Abschnitte werden übergangen. */
export function pruefeBestand(best) {
  const fehler = [];
  const warnung = [];
  const abschnitte = [];
  for (const a of ABSCHNITTE) {
    if (!best?.[a.db]) continue;
    const r = pruefeAbschnitt(best, a.key);
    fehler.push(...r.fehler);
    warnung.push(...r.warnung);
    abschnitte.push({ key: a.key, titel: a.titel, anzahl: r.anzahl,
                      fehler: r.fehler.length, warnung: r.warnung.length });
  }
  return { ok: fehler.length === 0, fehler, warnung, abschnitte };
}
