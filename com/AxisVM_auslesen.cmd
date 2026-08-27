@echo off
rem ---------------------------------------------------------------------------
rem NUR LESEN - baut nichts, rechnet nichts, aendert nichts am Modell.
rem
rem Holt die Schnittgroessen aller Staebe je Lastfall aus dem OFFENEN,
rem GERECHNETEN Modell und schreibt sie neben die Modelldatei, als
rem <modell>_ergebnisse.json. Auch die Zuordnung wird dort gesucht.
rem
rem Die Modelldatei laesst sich auf dieses Symbol ZIEHEN. Ohne Angabe gilt
rem die juengste Modelldatei neben AxisVM_aufbauen.cmd.
rem
rem VORHER:
rem   1. AxisVM_aufbauen.cmd  -  baut das Modell und schreibt die Zuordnung
rem   2. in AxisVM rechnen lassen (linear statisch)
rem   3. AxisVM offen lassen und dieses Skript starten
rem
rem Gerechnet wird hier bewusst nicht: womit gerechnet wird, bleibt Ihre
rem Entscheidung im Programm. Fehlen Ergebnisse, sagt das Skript es und hoert
rem auf - statt Nullen zu liefern, die wie ein Ergebnis aussehen.
rem ---------------------------------------------------------------------------
rem Ein hineingezogener Pfad wird zu -Json; das erledigt AxisVM_aufbauen.cmd.
call "%~dp0AxisVM_aufbauen.cmd" %* -Auslesen
