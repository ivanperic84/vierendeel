@echo off
rem ---------------------------------------------------------------------------
rem NUR ERKUNDEN - baut nichts, aendert nichts, speichert nichts.
rem
rem Startet AxisVM, legt ein leeres Modell an, liest aus, welche COM-Objekte
rem und Methoden DIESE Fassung anbietet, und raeumt wieder auf.
rem Ergebnis: AxisVM_aufbau_bericht.txt daneben - diese Datei zurueckschicken.
rem ---------------------------------------------------------------------------
call "%~dp0AxisVM_aufbauen.cmd" -NurPruefen
