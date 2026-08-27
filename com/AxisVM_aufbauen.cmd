@echo off
setlocal
rem ---------------------------------------------------------------------------
rem Baut das Tragjoch in AxisVM auf - liest die JSON-Datei daneben.
rem
rem Windows blockiert PowerShell-Skripte standardmaessig; -ExecutionPolicy
rem Bypass gilt NUR fuer diesen einen Aufruf und aendert nichts am Rechner.
rem
rem Doppelklick genuegt: genommen wird die JUENGSTE Modelldatei daneben.
rem Die Datei laesst sich auch auf dieses Symbol ZIEHEN - dann muss sie gar
rem nicht erst in diesen Ordner kopiert werden.
rem
rem EIN GANZER ORDNER geht ebenso: dann wird jede Modelldatei darin gebaut,
rem je Modell ein eigenes AxisVM-Modell und eine eigene .axs daneben.
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
rem EINE HINEINGEZOGENE DATEI kommt als blosser Pfad an, nicht als -Json.
rem Windows uebergibt beim Ziehen den Dateinamen als erstes Argument; ohne
rem diese Umsetzung landete er als unbekannter Positionsparameter im Skript
rem und wurde stillschweigend uebergangen. Faengt das erste Argument mit
rem einem Bindestrich an, ist es ein Schalter und alles bleibt, wie es war.
rem KEINE Klammerbloecke hier: der Browser nennt eine zweite Ausleitung
rem "... (1).json", und eine Klammer im Pfad wuerde einen Block vorzeitig
rem schliessen. Mit Sprungmarken passiert das nicht.
set "ERSTES=%~1"
set "ARGS=%*"
if not defined ERSTES goto :starten
if "%ERSTES:~0,1%"=="-" goto :starten
if not exist "%ERSTES%" goto :starten
rem EIN ORDNER heisst: alle Modelldateien darin, je Modell ein AxisVM-Modell.
rem Erkannt an "%ERSTES%\*" - das trifft nur auf Ordner zu; ein blosses
rem "exist" unterscheidet Datei und Ordner nicht.
set "ARGS=-Json "%ERSTES%""
if exist "%ERSTES%\*" set "ARGS=-Ordner "%ERSTES%""
echo Hineingezogen: "%ERSTES%"
echo.
rem Die weiteren Argumente muessen mit. AxisVM_auslesen.cmd ruft diese Datei
rem als "<datei> -Auslesen" auf - ohne diese Schleife fiele der Schalter weg
rem und es wuerde gebaut statt gelesen.
shift
:sammeln
if "%~1"=="" goto :starten
set "ARGS=%ARGS% %1"
shift
goto :sammeln

:starten
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" %ARGS%
set RC=%ERRORLEVEL%

echo.
echo ---------------------------------------------------------------------------
rem DER BERICHT LIEGT BEIM MODELL, nicht mehr hier - deshalb steht sein Pfad
rem nicht in dieser Datei, sondern in der letzten Zeile des Skripts oben.
if "%RC%"=="0" (
  echo Fertig. Den Pfad des Berichts nennt die Zeile "Bericht:" oben.
) else (
  echo ABGEBROCHEN - Rueckgabe %RC%
  echo Den Bericht nennt die Zeile "Bericht:" oben - diese Datei zurueckschicken.
)
echo ---------------------------------------------------------------------------

:ende
echo.
pause
endlocal
