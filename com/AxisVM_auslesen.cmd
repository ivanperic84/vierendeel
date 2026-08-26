@echo off
rem ---------------------------------------------------------------------------
rem NUR LESEN - baut nichts, rechnet nichts, aendert nichts am Modell.
rem
rem Holt die Schnittgroessen aller Staebe je Lastfall aus dem OFFENEN,
rem GERECHNETEN Modell und schreibt sie nach AxisVM_ergebnisse.json.
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
call "%~dp0AxisVM_aufbauen.cmd" -Auslesen
