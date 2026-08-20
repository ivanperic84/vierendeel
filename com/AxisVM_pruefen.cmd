@echo off
rem ---------------------------------------------------------------------------
rem Startet AxisVM_pruefen.ps1 mit gelockerter Ausfuehrungsrichtlinie.
rem Windows blockiert PowerShell-Skripte sonst standardmaessig; -ExecutionPolicy
rem Bypass gilt NUR fuer diesen einen Aufruf und aendert nichts am Rechner.
rem
rem Doppelklick genuegt.
rem ---------------------------------------------------------------------------
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0AxisVM_pruefen.ps1"
