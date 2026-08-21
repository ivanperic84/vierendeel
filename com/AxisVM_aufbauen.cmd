@echo off
rem ---------------------------------------------------------------------------
rem Baut das Tragjoch in AxisVM auf - liest die JSON-Datei daneben.
rem
rem Windows blockiert PowerShell-Skripte standardmaessig; -ExecutionPolicy
rem Bypass gilt NUR fuer diesen einen Aufruf und aendert nichts am Rechner.
rem
rem Doppelklick genuegt, wenn genau EINE *.json daneben liegt.
rem ---------------------------------------------------------------------------
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0AxisVM_aufbauen.ps1" %*
