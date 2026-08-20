<#
    AxisVM_pruefen.ps1
    ===========================================================================
    ERKUNDET DIE COM-SCHNITTSTELLE VON AxisVM AUF DIESEM RECHNER.

    Warum dieses Skript vor der eigentlichen Brücke: die Namen der COM-Objekte
    und ihrer Methoden verschieben sich zwischen den AxisVM-Fassungen. Ein
    Skript, das gegen die falsche Fassung geschrieben ist, scheitert erst beim
    ersten Lauf - und dann irgendwo mitten im Modellaufbau. Hier wird einmal
    ausgelesen, was DIESE Fassung wirklich anbietet.

    PowerShell statt Python: PowerShell ist auf jedem Windows vorhanden, kann
    COM von Haus aus und braucht keine Installation.

    Das Skript ist ERKUNDEND. Es startet AxisVM, legt ein LEERES Modell an,
    liest die Namen der Objekte und Methoden aus und räumt wieder auf. Es
    öffnet, ändert und speichert keine Datei.

    AUFRUF
        Doppelklick auf AxisVM_pruefen.cmd
    oder
        powershell -ExecutionPolicy Bypass -File AxisVM_pruefen.ps1

    ERGEBNIS
        AxisVM_schnittstelle.txt neben diesem Skript. Diese Datei zurück-
        schicken - daraus entsteht die Brücke.
    ===========================================================================
#>

$ErrorActionPreference = 'Stop'
$ziel = Join-Path $PSScriptRoot 'AxisVM_schnittstelle.txt'
$zeilen = New-Object System.Collections.Generic.List[string]

function Schreib([string]$t) {
    Write-Host $t
    $zeilen.Add($t)
}

Schreib "AxisVM COM-Erkundung  -  $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
Schreib ("=" * 78)
Schreib "PowerShell $($PSVersionTable.PSVersion)  -  $(if ([Environment]::Is64BitProcess) {'64'} else {'32'})-bit"
Schreib ""

# --- 1 - Server ansprechen ---------------------------------------------------
$app = $null
try {
    Schreib "Starte AxisVM ueber COM (AxisVM.AxisVMApplication) ..."
    $app = New-Object -ComObject 'AxisVM.AxisVMApplication'
} catch {
    Schreib "FEHLGESCHLAGEN: $($_.Exception.Message)"
    Schreib ""
    Schreib "Moegliche Gruende:"
    Schreib "  - AxisVM ist nicht installiert"
    Schreib "  - die COM-Registrierung fehlt: AxisVM einmal als Administrator starten"
    Schreib "  - Bit-Breite: 64-bit-PowerShell gegen 32-bit-AxisVM."
    Schreib "    Dann mit SysWOW64\WindowsPowerShell\v1.0\powershell.exe versuchen."
    $zeilen | Set-Content -Path $ziel -Encoding UTF8
    Read-Host "`nWeiter mit Enter"
    exit 1
}
Schreib "  erreichbar."

foreach ($n in 'Version','BuildNumber','CodeVersion','FullVersionString','LibraryVersion') {
    try { Schreib ("  {0,-20} {1}" -f $n, $app.$n) } catch { }
}
Schreib ""

# --- 2 - Leeres Modell -------------------------------------------------------
# Ob sich ein Modell anlegen laesst, ist zugleich die Probe auf die
# Freischaltung der API.
$modell = $null
try {
    $app.AskCloseAll = 1            # keine Rueckfragen beim Aufraeumen
    $i = $app.Models.New()
    $modell = $app.Models.Item($i)
    Schreib "Leeres Modell angelegt (Index $i) - die API antwortet."
} catch {
    Schreib "Modell anlegen NICHT moeglich: $($_.Exception.Message)"
    Schreib "Ohne Modell laesst sich der Rest nicht auslesen."
    $zeilen | Set-Content -Path $ziel -Encoding UTF8
    Read-Host "`nWeiter mit Enter"
    exit 2
}
Schreib ""

# --- 3 - Was bietet die Fassung an? -----------------------------------------
# Get-Member liest die Typbibliothek aus. Genau diese Namen braucht die Bruecke.
function Zeige([string]$titel, $obj, [string[]]$nurTyp = @('Method','Property','ParameterizedProperty')) {
    Schreib ("-" * 78)
    Schreib $titel
    Schreib ("-" * 78)
    if ($null -eq $obj) { Schreib "  (nicht vorhanden)"; Schreib ""; return }
    try {
        $obj | Get-Member -Force |
            Where-Object { $nurTyp -contains $_.MemberType } |
            Sort-Object MemberType, Name |
            ForEach-Object { Schreib ("  {0,-22} {1}" -f $_.MemberType, $_.Definition) }
    } catch {
        Schreib "  Auslesen fehlgeschlagen: $($_.Exception.Message)"
    }
    Schreib ""
}

Zeige "APPLICATION" $app
Zeige "MODELL" $modell

# Die Sammlungen, die die Bruecke fuellen muss. Fehlt eine, sagt es die Ausgabe.
foreach ($name in 'Materials','CrossSections','Nodes','Lines','Members','Domains',
                  'NodalSupports','LineSupports','LoadCases','LoadGroups','LoadCombinations',
                  'Loads','Calculation','Results','Settings') {
    $teil = $null
    try { $teil = $modell.$name } catch { }
    Zeige "MODELL.$name" $teil
}

# --- 4 - Aufraeumen ----------------------------------------------------------
try { $app.Models.Delete($i) } catch { }
try { $app.Quit() } catch { }
try { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app) } catch { }

$zeilen | Set-Content -Path $ziel -Encoding UTF8
Write-Host ""
Write-Host "Geschrieben: $ziel"
Write-Host "Diese Datei zurueckschicken - daraus entsteht die Bruecke."
Read-Host "`nWeiter mit Enter"
