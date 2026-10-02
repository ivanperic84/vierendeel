"""
qp_markierungen.py
---------------------------------------------------------------------------
DIE MARKIERUNGEN DES AUFTRAGGEBERS IN DEN QUERPROFILEN AUSLESEN.

Weisung vom 2. Oktober: «Die Bauteile sollten wir bereinigen. wir könnten
ein paar querprofile zusammen durchgehen. ich markiere dir die bauteile im
Querprofil und die tragwerke damit du besser die logik verstehen kannst.»
Vereinbart: markiert wird im PDF (PDF-XChange) mit Rechteck- oder
Wolkenkommentaren, der Kommentartext beginnt mit

    Tragwerk: T1 J90
    Bauteil: NT-Ausleger, Mast 14
    ? ...                          (offen, vom Auftraggeber selbst)

Gezählt werden NUR solche Kommentare, und nur ab einem Datum (Vorgabe
1. Oktober 2026, `--ab JJJJ-MM-TT`): die Kursaufgaben tragen schon 753
Kommentare aus den Jahren 2014-2016, 27 davon lauten genau «?» und hätten
ohne Datumsgrenze als offene Markierung gezählt. Mit --alle stehen auch die
Kommentare ohne Präfix in der Liste (die Datumsgrenze gilt weiter).

Je Markierung: Seite, Rahmen in mm auf dem Blatt (Ursprung oben links),
Kommentartext, Verfasser, Datum, der Vektortext im Rahmen (fehlt bei Plänen,
deren Schrift als Linien exportiert ist - dann ist der Kommentar die einzige
Angabe), die Zahl der Zeichenpfade im Rahmen, ein Bildausschnitt. Je Seite
mit Markierungen eine Übersicht mit nummerierten Rahmen.

Ausgabe nach Versand/qp_markierungen/<Plan>/ (nicht in der Ablage: die
Pläne und alles daraus sind Projektmaterial des Betreibers):

    markierungen.json   alles, maschinenlesbar
    markierungen.csv    dieselbe Liste für Excel (Semikolon, UTF-8 mit BOM)
    s<Seite>_uebersicht.png, s<Seite>_m<Nr>.png

    python qp_markierungen.py                    alle PDFs unter Grundlagen/QP
    python qp_markierungen.py <pdf> [<pdf> ...]  nur diese
    python qp_markierungen.py --alle ...         auch Kommentare ohne Präfix
    python qp_markierungen.py --ab 2026-10-02 .. nur Kommentare ab diesem Tag
---------------------------------------------------------------------------
"""

import csv
import glob
import json
import os
import re
import sys

import fitz  # PyMuPDF

HIER = os.path.dirname(os.path.abspath(__file__))
AUS = os.path.join(HIER, 'Versand', 'qp_markierungen')
PT_MM = 25.4 / 72.0
PRAEFIX = re.compile(r'^\s*(Tragwerk|Bauteil|\?)\s*:?\s*(.*)$', re.S | re.I)
# Bildausschnitte mit Rand, damit man sieht, woran das Markierte hängt.
RAND_PT = 12
ZOOM_AUSSCHNITT = 4
ZOOM_UEBERSICHT = 1.5


def art_von(text):
    m = PRAEFIX.match(text or '')
    if not m:
        return None, (text or '').strip()
    kopf = m.group(1).lower()
    art = {'tragwerk': 'Tragwerk', 'bauteil': 'Bauteil'}.get(kopf, 'offen')
    return art, m.group(2).strip()


def datum_von(info):
    """'D:20161030...' -> '2016-10-30' (leer, wenn nicht lesbar)."""
    roh = (info.get('modDate') or info.get('creationDate') or '')
    m = re.match(r'D:(\d{4})(\d{2})(\d{2})', roh)
    return f'{m.group(1)}-{m.group(2)}-{m.group(3)}' if m else ''


def lies(pdf, alle=False, ab='2026-10-01'):
    doc = fitz.open(pdf)
    stamm = os.path.splitext(os.path.basename(pdf))[0]
    ziel = os.path.join(AUS, re.sub(r'[^\w.-]+', '_', stamm))
    marken = []
    for seite in doc:
        nr_seite = seite.number + 1
        eigene = []
        for a in seite.annots() or []:
            info = a.info or {}
            text = (info.get('content') or '').strip()
            art, rest = art_von(text)
            if art is None and not alle:
                continue
            # Ohne lesbares Datum zählt die Markierung - lieber einmal zu
            # viel in der Liste als eine eigene stillschweigend verloren.
            tag = datum_von(info)
            if tag and tag < ab:
                continue
            eigene.append((a, info, art or 'sonst', rest, text))
        if not eigene:
            continue
        os.makedirs(ziel, exist_ok=True)
        woerter = seite.get_text('words')
        pfade = seite.get_drawings()
        for i, (a, info, art, rest, text) in enumerate(eigene, start=1):
            r = a.rect
            innen = [w[4] for w in woerter if fitz.Rect(w[:4]).intersects(r)]
            n_pfade = sum(1 for d in pfade if d['rect'].intersects(r))
            clip = fitz.Rect(r.x0 - RAND_PT, r.y0 - RAND_PT, r.x1 + RAND_PT, r.y1 + RAND_PT) & seite.rect
            bild = f's{nr_seite}_m{i}.png'
            # Ohne die Kommentare gerendert: der Ausschnitt zeigt den Plan.
            # Ein Linien- oder Textkommentar ohne Fläche gibt einen leeren
            # Ausschnitt, an dem PyMuPDF abbricht - dann eben kein Bild.
            if clip.is_empty or clip.width < 2 or clip.height < 2:
                bild = ''
            else:
                seite.get_pixmap(matrix=fitz.Matrix(ZOOM_AUSSCHNITT, ZOOM_AUSSCHNITT),
                                 clip=clip, annots=False).save(os.path.join(ziel, bild))
            marken.append({
                'plan': os.path.basename(pdf), 'seite': nr_seite, 'nr': i,
                'art': art, 'angabe': rest, 'kommentar': text,
                'typ': a.type[1], 'verfasser': info.get('title', ''),
                'datum': datum_von(info),
                'rahmen_mm': [round(r.x0 * PT_MM, 1), round(r.y0 * PT_MM, 1),
                              round(r.x1 * PT_MM, 1), round(r.y1 * PT_MM, 1)],
                'text_im_rahmen': ' '.join(innen),
                'zeichenpfade_im_rahmen': n_pfade,
                'bild': bild,
            })
        # Übersicht: die Seite MIT den Kommentaren, dazu die Nummern.
        uebersicht = seite.get_pixmap(matrix=fitz.Matrix(ZOOM_UEBERSICHT, ZOOM_UEBERSICHT), annots=True)
        pfad_u = os.path.join(ziel, f's{nr_seite}_uebersicht.png')
        uebersicht.save(pfad_u)
        nummerieren(pfad_u, [(m['nr'], m['rahmen_mm']) for m in marken if m['seite'] == nr_seite])
    if marken:
        os.makedirs(ziel, exist_ok=True)
        with open(os.path.join(ziel, 'markierungen.json'), 'w', encoding='utf-8') as f:
            json.dump(marken, f, ensure_ascii=False, indent=1)
        with open(os.path.join(ziel, 'markierungen.csv'), 'w', encoding='utf-8-sig', newline='') as f:
            w = csv.writer(f, delimiter=';')
            w.writerow(['Plan', 'Seite', 'Nr', 'Art', 'Angabe', 'Rahmen x0 [mm]', 'y0', 'x1', 'y1',
                        'Text im Rahmen', 'Zeichenpfade', 'Bild', 'Verfasser', 'Datum'])
            for m in marken:
                w.writerow([m['plan'], m['seite'], m['nr'], m['art'], m['angabe'], *m['rahmen_mm'],
                            m['text_im_rahmen'], m['zeichenpfade_im_rahmen'], m['bild'],
                            m['verfasser'], m['datum']])
    return ziel, marken


def nummerieren(pfad_png, liste):
    """Schreibt die Nummern an die Rahmen - im Bild, nicht ins PDF."""
    doc = fitz.open()
    pix = fitz.Pixmap(pfad_png)
    s = doc.new_page(width=pix.width, height=pix.height)
    s.insert_image(s.rect, filename=pfad_png)
    k = ZOOM_UEBERSICHT / PT_MM
    for nr, (x0, y0, x1, y1) in liste:
        s.insert_text((x0 * k, max(12, y0 * k - 3)), str(nr), fontsize=14, color=(0.85, 0, 0))
    s.get_pixmap().save(pfad_png)


def main(argv):
    alle = '--alle' in argv
    ab = '2026-10-01'
    if '--ab' in argv:
        i = argv.index('--ab')
        ab = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    dateien = [a for a in argv if not a.startswith('--')] or sorted(
        glob.glob(os.path.join(HIER, 'Grundlagen', 'QP', '*.pdf')))
    gesamt = 0
    for pdf in dateien:
        ziel, marken = lies(pdf, alle, ab)
        gesamt += len(marken)
        zahl = {k: sum(1 for m in marken if m['art'] == k) for k in ('Tragwerk', 'Bauteil', 'offen', 'sonst')}
        print(f'{os.path.basename(pdf)}: {len(marken)} Markierungen '
              f'(Tragwerk {zahl["Tragwerk"]}, Bauteil {zahl["Bauteil"]}, offen {zahl["offen"]}'
              + (f', sonst {zahl["sonst"]}' if alle else '') + ')'
              + (f' -> {os.path.relpath(ziel, HIER)}' if marken else ''))
        for m in marken:
            print(f'   S{m["seite"]} #{m["nr"]:<3} {m["art"]:8s} {m["angabe"][:60]:60s} '
                  f'Text: {m["text_im_rahmen"][:30] or "-"}')
    print(f'Zusammen {gesamt} Markierungen.')


if __name__ == '__main__':
    main(sys.argv[1:])
