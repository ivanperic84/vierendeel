@echo off
setlocal
rem ---------------------------------------------------------------------------
rem Baut das Tragjoch in AxisVM auf - liest die JSON-Datei daneben.
rem
rem Windows blockiert PowerShell-Skripte standardmaessig; -ExecutionPolicy
rem Bypass gilt NUR fuer diesen einen Aufruf und aendert nichts am Rechner.
rem
rem Doppelklick genuegt, wenn genau EINE *.json daneben liegt.
rem
rem DIESES FENSTER SCHLIESST SICH NIE VON SELBST. Vor dem Start wird das
rem Skript auf Lesbarkeit geprueft - so steht auch bei einem Fehler IM Skript
rem die Stelle da, statt dass das Fenster verschwindet.
rem ---------------------------------------------------------------------------

set "PS1=%~dp0AxisVM_aufbauen.ps1"
set "LOG=%~dp0AxisVM_aufbau_protokoll.txt"

echo.
echo === AxisVM COM-Bruecke =====================================================
echo.

if not exist "%PS1%" (
  echo Das Skript fehlt: "%PS1%"
  echo AxisVM_aufbauen.ps1 und AxisVM_aufbauen.cmd gehoeren in denselben Ordner.
  goto :ende
)

rem --- 0 - laeuft PowerShell ueberhaupt? --------------------------------------
powershell -NoProfile -Command "exit 0" >nul 2>&1
if errorlevel 1 (
  echo PowerShell antwortet nicht.
  echo Windows-Taste druecken, "powershell" tippen, Enter - laeuft es dort?
  goto :ende
)

rem --- 1 - Markierung "aus dem Internet" entfernen -----------------------------
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -LiteralPath '%~dp0' -File | Unblock-File" >nul 2>&1

rem --- 2 - laesst sich das Skript lesen? ---------------------------------------
echo Pruefe das Skript ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f=$null;$e=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('%PS1%',[ref]$f,[ref]$e); if($e -and $e.Count){ $t=$e|ForEach-Object{ 'Zeile {0}: {1}' -f $_.Extent.StartLineNumber,$_.Message }; $t|Write-Host; $t|Set-Content -LiteralPath '%LOG%' -Encoding UTF8; exit 2 }"
if errorlevel 2 (
  echo.
  echo Das Skript selbst ist fehlerhaft - es wurde nichts gebaut.
  echo Die Meldungen oben stehen auch in:
  echo   %LOG%
  echo Diese Datei zurueckschicken.
  goto :ende
)
echo   lesbar.
echo.

rem --- 3 - aufbauen ------------------------------------------------------------
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" %*
set RC=%ERRORLEVEL%

echo.
echo ---------------------------------------------------------------------------
if "%RC%"=="0" (
  echo Fertig. Bericht: %~dp0AxisVM_aufbau_bericht.txt
) else (
  echo ABGEBROCHEN - Rueckgabe %RC%
  echo Bericht: %~dp0AxisVM_aufbau_bericht.txt
  echo Diese Datei zurueckschicken.
)
echo ---------------------------------------------------------------------------

:ende
echo.
pause
endlocal
