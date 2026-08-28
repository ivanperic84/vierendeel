#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
serve.py — kleiner lokaler Webserver für die Modulversion (index.html).

Die ES-Module in js/ lassen sich per file:// nicht laden (Browser blockieren
Modul-Imports über das Dateiprotokoll). Für die Arbeit an den Modulen:

    python3 serve.py          ->  http://localhost:8731/index.html

Für die Weitergabe reicht die gebündelte Datei vierendeel_tool.html, die per
Doppelklick funktioniert (python3 build_html.py erzeugt sie neu).

Der Dienstarbeiter (sw.js) meldet sich örtlich BEWUSST NICHT an - eine Ablage,
die beim Arbeiten alte Module ausliefert, wäre nur eine Fehlerquelle. Zum
Ausprobieren der installierbaren Fassung:

    http://localhost:8731/index.html?sw=1     anmelden
    http://localhost:8731/index.html?sw=0     abmelden und Ablage leeren
"""

import http.server
import mimetypes
import os
import socketserver
import sys
from pathlib import Path

# Ältere Python-Fassungen kennen die Endung nicht; ohne den richtigen Typ
# weist der Browser das Manifest ab und die Anwendung ist nicht installierbar.
mimetypes.add_type("application/manifest+json", ".webmanifest")

# Der Port kommt aus der Umgebung (so weist ihn die Vorschau zu), sonst vom
# Aufruf, sonst der Vorgabewert. Er ist an nichts gebunden - hier werden nur
# statische Dateien ausgeliefert, keine Rückrufe entgegengenommen.
PORT = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 8731))
WURZEL = Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(WURZEL), **kw)

    def end_headers(self):
        # Beim Entwickeln nie aus dem Cache ausliefern
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s\n" % (fmt % args))


if __name__ == "__main__":
    os.chdir(WURZEL)
    # MEHRFAEDIG, SONST STEHT DER MODULBAUM.
    #
    # TCPServer bedient eine Anfrage nach der anderen. Ein ES-Modulbaum fragt
    # aber zwanzig Dateien auf einmal an, und der Browser haelt die
    # Verbindungen offen: gemessen blieben zwanzig Anfragen ohne Antwort
    # stehen, die Seite kam nie ueber readyState "interactive" hinaus und
    # stand ohne Gestaltung da - die Farbtokens setzt erst das Skript.
    # Bisher ging es gut; das war Glueck, nicht Bauart.
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    socketserver.ThreadingTCPServer.daemon_threads = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Server läuft:  http://localhost:{PORT}/index.html")
        print(f"Wurzel:        {WURZEL}")
        httpd.serve_forever()
