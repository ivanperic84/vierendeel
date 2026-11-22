/**
 * doku.aenderungen.js - das Änderungsprotokoll für die Anwender.
 *
 * Weisung vom 7. Oktober: «verfasse ein änderungsprotokoll wenn man auf die
 * versionsnummer klickt unten rechts.» Ein Klick auf die Fassung in der
 * Fussleiste öffnet diese Liste. Sie sagt in Worten der Bedienung, was sich
 * geändert hat - und, wo eine Zahl sich ändert, in welche Richtung. Das
 * Protokoll im Kleinen bleibt der Git-Verlauf; hier steht, was ein Anwender
 * davon wissen muss. Neue Einträge oben.
 */

/** Je Tag: Titel und Punkte. `rechnung: true` = ändert Nachweiszahlen. */
/*
 * Geleert am 17. November 2026 (Weisung: «das änderungsprotokoll leeren»);
 * die frühere Liste steht im Git-Verlauf dieser Datei. Neue Einträge oben.
 */
export const AENDERUNGEN = [
  {
    datum: '2026-11-22',
    punkte: [
      { text: 'Die Trasse steht im 3D mit dem Radius; ein Klick darauf öffnet die Eingabe. Das Grundwerte-Fenster zeigt das Vorzeichen des Radius als Skizze.' },
      { text: 'Dimensionieren behält die letzte Rechnung; die Kamera fährt weich auf Bauteile, auch in der Explosion.' },
      { text: 'Die Seitenleisten fahren geschmeidig ein und aus; das 3D-Bild bleibt während der Fahrt stehen. Klappabschnitte öffnen weich.' },
      { text: 'Havarie «Last aufs Tragwerk übertragen (in der Achse)» gilt jetzt auch für Teile am Masten von Abfangjoch und Tragausleger.', rechnung: true },
    ],
  },
  {
    datum: '2026-11-21',
    punkte: [
      { text: 'Ein Klick auf die Grundwerte oben im 3D fährt die Lastfall-Insel mit Wind, Reduktion, Spannweite, Radius und Schnee aus; ein zweiter Klick fährt sie wieder ein.' },
      { text: 'Lastfall oben im 3D: × führt zurück auf «umhüllend», bei verformter Figur oder Knickfigur ▶ / ■ zum Schwingen; die Insel wächst und schrumpft weich. Ein Klick auf den Lastfall lässt seine Zeile in der Seitenleiste aufleuchten.' },
      { text: 'Neues Querprofil: ein Abfangjoch startet mit zwei abgefangenen Tragseilen und Druckstützen an beiden Masten (wie die Vorlage «Abfangjoch mit Anker»), ein Tragausleger mit HEM 240 - beide halten von Anfang an. Die Prüfung P2 «letztes Feld kürzer» meldet sich nicht mehr bei Jochen des Sortiments (dort legt die Mass-Tabelle die Felder fest). Typenliste ohne Vergleichsmodelle, alte Typen mit «(Bestand)». Der Lastfall oben heisst wie in der Lastfallliste.' },
      { text: 'Ein Knopf «Dimensionieren» statt «Sortiment durchrechnen» daneben. Am Tragjoch: Typen je Gruppe oder einzeln wählen (Jochtypen, alte Jochtypen, Walzprofile, Gittermasten, DGP); alte Jochtypen stehen nur zum Vergleich da und werden nie empfohlen. Zuerst eine schnelle Vorauswahl mit der Kontrollrechnung (Vorgabe bis η 1.10), dann das Stabwerk je Gruppe vom leichtesten aufwärts, bis eine Variante mehr als 30 % schwerer wäre als die leichteste, die hält - beide Grenzen einstellbar.' },
      { text: '3D: der Lastfall oben ist eine einzeilige «Insel» - ein langer Name endet mit «…» und läuft beim Überfahren aus, ein Wechsel gleitet weich. Die Figur schwingt über den Knopf w (nochmals drücken), die Knickfigur hat einen Knopf «Knick» unter Resultate. Lasten eines ausgeblendeten Bauteils werden nicht mehr gezeichnet.' },
      { text: 'Übersicht kürzer (Tragjoch 2800 → 1400 px): «Höchstbeanspruchte Stellen» und «Konstruktionsprüfungen» zugeklappt mit dem Wichtigsten im Kopf (z. B. «1 verletzt: P2»); Bügelschrauben bei ausgeschalteter Gruppe nur als Zeile; «· Stabwerk» nicht mehr an jeder Nachweiszeile; «Nicht geführte Nachweise».' },
      { text: 'Einzelmast: die Kontrollrechnung des Masten steht zugeklappt unter den Stabwerksnachweisen. Abfangjoch / Tragausleger: «Stabilität Abfangjoch» bzw. «Stabilität Tragausleger» statt «Stabilität Joch». Bügelschrauben ohne «k0» im Mastnamen.' },
      { text: 'Verläufe in der Breite der Seitenleiste gezeichnet - rund 200 statt 80 px hoch, lesbare Schrift. Bauteilkarte ohne doppeltes α und ohne «kN/m» an Kräften; mit ausgeschalteten Erklärtexten auch ohne die «Hinweis»-Zeilen. Im Dialog «Windbelastung» wie unter Lasten.' },
      { text: '3D-Fenster: Legende, Meldungen und Kopfzeile stehen neben der Werkzeugleiste statt darauf; die Leiste bekommt in niedrigen Fenstern einen Bildlauf und klappt unter 520 px Höhe von selbst ein; das Modell wird links von der Leiste eingepasst (auch in der Isometrie und nach dem Setzen eines Tragauslegers).' },
      { text: 'Kontextmenü im 3D: die Tragwerksart wird erst nach einer Rückfrage umgestellt (was wegfällt, Strg+Z); «Auf den Nachweisschnitt» steht im Stabwerk nicht mehr.' },
      { text: 'Farbskala σ_v nennt die Grenze f_yd (Strich im Balken bzw. «Skala endet bei … % davon»).' },
      { text: 'Die Markierungen «↑ / ↓» nach einer Eingabe vergleichen nur noch mit demselben Tragwerk: nach «Neues Querprofil», beim Laden und beim Wechsel der Tragwerksart erscheinen keine; an mm-Werten (Verformung) steht keine η-Differenz mehr.' },
      { text: 'Im Einzellastfall nennen Hinweis und Fussleiste dieselbe Bemessungszahl wie die Hauptkachel bei «umhüllend» (vorher drei verschiedene: nur Joch, ohne Gebrauchstauglichkeit, mit).' },
      { text: 'Schulung: das Knicken eines Masten zählt in der Gruppe «Masten», nicht mehr beim Tragjoch.' },
      { text: 'Grossschrift verwandelt keine Werte mehr: in Klapptiteln, Tabellenköpfen und der Fundamentzeile stehen η, m, kN, cm² und «DP2a» wie geschrieben (vorher «Η», «M», «KN»).' },
      { text: 'Abfangjoch und Tragausleger mit Druckstütze: die Hilfsglieder der Stütze trugen fälschlich ein Eigengewicht (rund 19 kN je Meter) - behoben; Mastfuss- und Ankerreaktionen sinken deutlich.', rechnung: true },
      { text: 'Im gewählten Lastfall zeigt das 3D nur dessen Lasten (Havarie ohne Wind und Schnee); Havariepfeile auf der Seite, zu der sie ziehen; Leiter werden nur beim Überfahren oder im gewählten Havariefall hervorgehoben.' },
      { text: 'Lastfall oben in der Mitte des 3D und in der Legende anklickbar - führt zu den Lastfällen in der Seitenleiste; Havariefälle mit Leiter und Richtung in eigenem Block.' },
      { text: 'Liniendiagramm: ausgeblendete Masten nehmen ihre Druckstütze mit; Werte nahe null liegen auf der Stabachse. Reaktionsblatt: umgeklappte Druckstützen nach aussen.' },
      { text: 'Viewer: Lastarten einzeln, Explosion im 3D-Fenster, Teilmodell Jochträger / Masten (wirkt auf Skala und Linie), Fall der Gebrauchstauglichkeit mit Figur, Klick auf eine Ausnutzung hebt das Bauteil hervor, Positionen mit Legende, Blickrichtungen eingepasst.' },
    ],
  },
  {
    datum: '2026-11-20',
    punkte: [
      { text: 'Havarie am Abfangjoch: bei beidseitig abgefangenen und durchgehenden Leitern wird der Riss jetzt in beiden Richtungen (+y / −y) gerechnet, im Kern und im Stabwerk; einseitig bleibt die Richtung fest.', rechnung: true },
      { text: 'Havarie am Abfangjoch: Leiter an Teilen am Masten (z. B. NT-Ausleger) bekommen ihren Havariefall auch im Stabwerk; «kann reissen» wirkt jetzt dort.', rechnung: true },
      { text: 'Havariefälle heissen nach Anbauteil und Leiter statt nach der internen Kennung; die Nummern L1 … folgen den Tragwerken und wechseln nicht mehr mit dem gewählten.' },
      { text: 'Lasten → Havarie: Längszug beim Riss eines durchgehenden Leiters einstellbar (Vorgabe 10 %).', rechnung: true },
      { text: 'Kettenwerk über zwei Joche (Tragseil oben, Fahrdraht unten, gleicher Kettenwerk-Name an derselben Stelle): Havarie «ganzes Kettenwerk», «nur Tragseil», «nur Fahrdraht»; die Wahl gilt allen Tragwerken des Blattes.', rechnung: true },
      { text: 'Abfangjoche übereinander: die Übersicht zeigt jedes Joch am Mastpaar mit eigenen Zeilen (Gurt, Bindeblech), das Urteil nimmt das grösste - nicht mehr nur das gewählte.' },
      { text: 'Abfangjoch: ein Leiter «Mitte Träger, durchgehend» brach das Stabwerk ab; er hängt jetzt an beiden Gurten.' },
      { text: 'Abfangjoch: die Abfangung steht nur noch am Leiter (Feld «Verlauf des Leiters» entfällt); beidseitig und durchgehend hängt der Leiter an beiden Gurten, einseitig am gezogenen. Im 3D unterscheidbar: einseitig ein Ende, beidseitig zwei Enden, durchgehend ohne Ende.', rechnung: true },
      { text: 'Havarie am Ausleger: die Kraft greift in der Achse der Hängestütze bzw. des Masten an (in x geschoben), ohne den Hebel des Auslegers.', rechnung: true },
      { text: 'Im 3D neue Lastart «Havarie (Leiterriss)»: beim gewählten Havariefall erscheinen die Kräfte des Risses.' },
      { text: 'Im 3D zeigt der Leiterstrich auch am Tragjoch und am Masten die Abfangart (einseitig, beidseitig, durchgehend).' },
      { text: 'Schiene rechts: je Tragwerkselement eine Zahl (Joch, Mast mit Knicken, Anker, Fundament) statt jedes Einzelwerts. Explosion: Knopf «auf» weg, Rechtsklick auf den Schieber fährt auf bzw. zu.' },
    ],
  },
  {
    datum: '2026-11-18',
    punkte: [
      { text: 'Übersicht ruhiger: die Nachweise stehen als Zeilen mit dünnem Balken statt als Kacheln, die Stabwerksleiste in einer Zeile; die Schalter Tragsicherheit / Gebrauchstauglichkeit sind weg (Nachweise ein- und ausschalten unter Optionen → Nachweise).' },
      { text: 'Linie im 3D: ein Klick auf den Farbbalken stellt die Farben der Linie ein (+ / −, Skala, eine Farbe); das Modell folgt der Plotgrösse. Die Knöpfe zur Knickfigur stehen in der Kachel α_cr.' },
      { text: 'Neu: «Dimensionieren» rechnet Jochtyp, Mastprofil, Stegrichtung, elastisch/plastisch und Einspannung mit dem Stabwerk durch, mit Diagramm Ausnutzung gegen Materialmasse. «Mast plastisch» gilt jetzt auch im Stabwerk.', rechnung: true },
      { text: 'Knicken Mast (SIA 263) ist bei neuen Querprofilen wieder voreingestellt eingeschaltet.', rechnung: true },
      { text: 'Farbbalken: Ausnutzung bis 1.0, Lastfall darunter, Klick auf den Balken für Farbe (Nachweis / Resultat / frei), Skala und Werte. Liniendiagramm: sehr kleine Werte werden nicht mehr gross gezeichnet. Kachel überfahren hebt den Stab hervor; Leiste oben, solange das Stabwerk rechnet. Knopf «Bauteil setzen» im 3D entfernt.' },
      { text: 'Neu im 3D: Figur schwingt (Knopf «Figur ▶»), Wert unter der Maus, weiche Übergänge bei Plot und Lastfall, Explosion «auf / zu»; nach einer Eingabe zeigen die Kacheln kurz die Änderung von η.' },
      { text: 'Linie im 3D: folgt den Ebenen der Werkzeugleiste (keine Teile-Auswahl mehr), N lotrecht, Modell farbig nach Nachweis / Resultat / frei wählbar; Schieber «Grenze» mit Wert und Einheit, auch für die Linie.' },
      { text: 'Theorie 2. Ordnung: auch Fundament und Anker, Masten knicken dann mit β = 1; Näherung 1/(1 − 1/α_cr) entfernt, Stabilitätsanzeige und Bericht gekürzt.', rechnung: true },
      { text: 'Viewer: Liniendiagramm (auch in der Explosion), Ausnutzung je Bauteil in der Leiste, Lastfälle nur der massgebende je Einwirkungsrichtung, Zusammenfassung des Fundamentnachweises, Hauptkennwerte (EK, Trasse, Reduktion) im Kopf, Lasten voreingestellt aus, Farbbalken der Ausnutzung bis 1.0.' },
      { text: 'Nachweisbericht: das 3D-Bild auf dem Deckblatt wird nicht mehr abgeschnitten (festes Format, an der Szene eingepasst).' },
      { text: 'Neu: Schieber «Auffällig» bei den Resultaten im 3D - was unter der Schwelle liegt (η bzw. Anteil am grössten Wert), tritt stark durchsichtig zurück.' },
      { text: 'Explosionsdarstellung: Zustandslinien werden mit den Teilen auseinandergezogen, die Abstände sind doppelt so gross, die Anbauteile stehen in der Explosion nicht.' },
      { text: 'Werkzeugleiste im 3D ohne «Teil» und «η w»; Erklärtexte unter den Feldern sind bei neuen Querprofilen voreingestellt aus.' },
      { text: 'Neu: Gruppe «Stabilität» in der Nachweiskarte - Kachel «α_cr Gesamtsystem» mit Bewertung (Knopf «α_cr rechnen», Knickfigur) und das Knicken der Masten. «Stabilität Joch» gilt mit α_cr ≥ 10 oder der Theorie 2. Ordnung als geführt, sonst steht sie unter «nicht geführt».' },
      { text: 'Nachweisbericht: in den Grundlagen der Abschnitt «Theorie 2. Ordnung und Stabilität» - gerechnetes Verfahren, Schiefstellung mit allen Grössen und, wenn gerechnet, α_cr mit Bewertung.' },
      { text: 'Neu: Optionen → Nachweise «Theorie 2. Ordnung» - jede Nachweis-Kombination am verformten System mit Schiefstellung der Masten nach EN 1993-1-1, 5.3.2; Nachweise und Urteil lesen dann diese Schnittgrössen (Vorgabe aus, der Knicknachweis der Masten bleibt). Gegen AxisVM nichtlinear nachgerechnet: Wege und Stabkräfte auf 0.5-3 %.', rechnung: true },
      { text: 'Stabilität: unter dem α_cr steht die Ausnutzung mit dem Vergrösserungsfaktor 1/(1 − 1/α_cr) je Kombination (Näherung für Theorie 2. Ordnung nach EN 1993-1-1, 5.2.2; Auskunft, kein Nachweis). Gegen AxisVM nachgerechnet: α_cr stimmt auf 0.1 bzw. 3 % (Werkzeug auf der sicheren Seite).' },
      { text: 'Neu: Stabilität des Stabwerks - in der Stabwerksleiste «Stabilität (α_cr) rechnen» gibt den kleinsten Knick-Eigenwert über die Kombinationen und ob die Theorie 1. Ordnung genügt (Auskunft, kein Nachweis); «Knickfigur zeigen» legt die Eigenform über das Modell.' },
      { text: 'Reiter Anbauteile mit Sprungleiste (Abschnitte und Gruppen, alle zu / auf). Im 3D oben die Grundwerte statt des Lastfallfelds; der Lastfall wird in der Liste gewählt, dort jetzt auch die einzelnen Lasten (ständig, Wind quer / längs, Schnee).' },
      { text: 'Zustandslinie: die Diagramme der Bindebleche zeigen nach aussen (liegende nach oben bzw. unten, stehende zur Seite), damit sie sich nicht überdecken.' },
      { text: 'Lastpfeile im Modell folgen dem gewählten Lastfall jetzt auch am Tragausleger und an den Nachbartragwerken.' },
      { text: 'Die leichte Fassung «Viewer» entfällt (nie benutzt); an ihre Stelle tritt die Viewer-Ausleitung. Die Schulung bleibt.' },
      { text: 'Neu: Export → «Viewer (HTML: Modell, Bericht, Massen)» - eine Datei zum Weitergeben, die das Modell mit allen Lastfällen, den Nachweisbericht und den Massenauszug zeigt und nicht rechnet. Im Bericht führt ein Klick auf ein Bild zur selben Ansicht im Modell.' },
      { text: 'Nachweisbericht: neues Kapitel «Tragwerksteile und Massenauszug» (Querschnitte, Stablängen, Massen je Bauteil).' },
      { text: 'Explosionsdarstellung: die Bindebleche liegen auf einer eigenen Ebene ausserhalb der Gurte, die Anbauteile weiter aussen. Farbe und Werte der Resultate bleiben darin sichtbar.' },
      { text: 'Gespreizte Masten (DGP): die Torsionssteifigkeit der beiden Hälften ist jetzt die Hälfte des Walzprofils (mit Ausrundungen, bisher ohne, 19 % weniger). Gegen AxisVM nachgerechnet; ändert die Zahlen nur bei Torsion am Masten, meist erst in der dritten Stelle.', rechnung: true },
    ],
  },
  {
    datum: '2026-11-17',
    punkte: [
      { text: 'Modell: Explosionsdarstellung (Schieber «Explosion» in der Gruppe Modell, Doppelklick setzt zurück) und stehende / liegende Bindebleche getrennt schaltbar. Nur das Bild.' },
      { text: 'Fundament: Horizontalkraft und Moment zählen als Resultierende (H_tot, M_tot, M_ver gegen die Grenze M_ver,max); die Anteile ständig / veränderlich lenken den Ablauf, sind aber kein eigener Nachweis mehr. Gespeicherte Stände können beim Fundament tiefer liegen.', rechnung: true },
      { text: 'Anschluss Joch am Masten: Stufe «eingespannt bis zur Grenze der Hakenschrauben» unter Auflager wählbar; der Knopf «Grenzfeder K_X suchen» entfällt.', rechnung: true },
      { text: 'Kacheln Fundament, Verformung und Bügelschrauben nennen die massgebende Prüfung; Fussleiste mit derselben Zahl wie die Hauptkachel; Export ohne «Drucken».' },
      { text: 'Handbuch neu geschrieben: technisch, nach dem heutigen Rechenweg (Stabwerk), in 20 Abschnitten.' },
      { text: 'Rechnung immer mit dem Stabwerk: die Wahl «Ersatzbalken» entfällt, der vereinfachte Kern zeigt nur noch vorläufige Werte als «Kontrollrechnung». Gespeicherte Stände mit Ersatzbalken rechnen mit dem Stabwerk.', rechnung: true },
      { text: 'Kein Reiter «Profile» mehr: Profile, Bindebleche und Stückliste stehen zugeklappt unten im Reiter System.' },
      { text: 'Zustandslinie: Obergurt-Diagramme nach oben, Untergurt nach unten (Vorzeichen über Farbe); ohne Reaktionen; statt «Ansicht folgt» ein Knopf «Blick auf die Ebene».' },
    ],
  },
];

const datumText = (d) => d.split('-').reverse().join('.');

/** Das Protokoll als HTML für den Dialog. */
export function aenderungenHtml(esc = (s) => s) {
  return `<p class="notiz" style="margin-top:0">Was sich geändert hat, neueste zuerst.
      <span class="aend-rechnung">Σ</span> = ändert Nachweiszahlen; ein gespeicherter Stand kann
      danach anders dastehen.</p>
    ${AENDERUNGEN.length ? '' : '<p class="notiz">Noch keine Einträge.</p>'}
    ${AENDERUNGEN.map((t) => `<h4 class="aend-tag">${datumText(t.datum)}</h4>
      <ul class="aend-liste">${t.punkte.map((p) => `<li>${p.rechnung
        ? '<span class="aend-rechnung" title="ändert Nachweiszahlen">Σ</span> ' : ''}${esc(p.text)}</li>`).join('')}</ul>`).join('')}`;
}
