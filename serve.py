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
import socket
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


class Server(socketserver.ThreadingTCPServer):
    """
    >>> EIN PORT, EIN SERVER (1. Oktober). <<<

    Hier stand `allow_reuse_address = True`. Unter Windows heisst das
    SO_REUSEADDR, und das erlaubt MEHREREN Prozessen, denselben Port zu
    binden. Am 26. September lagen fünf Server zugleich auf 8731; die
    Verbindung landete bei einem toten und wurde ohne Antwort geschlossen -
    ein Bild, das zweimal als verweigerte Sandbox gedeutet wurde.

    Unter Windows bindet der Server jetzt exklusiv (SO_EXCLUSIVEADDRUSE) und
    bricht ab, wenn der Port belegt ist. Anderswo bleibt SO_REUSEADDR - dort
    erlaubt es nur, einen eben beendeten Port sofort wieder zu nehmen.
    """
    daemon_threads = True
    allow_reuse_address = os.name != "nt"

    def server_bind(self):
        if os.name == "nt" and hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


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
    try:
        httpd = Server(("127.0.0.1", PORT), Handler)
    except OSError as e:
        print(f"Port {PORT} ist belegt - läuft schon ein Server? ({e})", file=sys.stderr)
        print("Den laufenden beenden oder einen anderen Port angeben: "
              "python3 serve.py 8732", file=sys.stderr)
        sys.exit(1)
    with httpd:
        print(f"Server läuft:  http://localhost:{PORT}/index.html")
        print(f"Wurzel:        {WURZEL}")
        httpd.serve_forever()
