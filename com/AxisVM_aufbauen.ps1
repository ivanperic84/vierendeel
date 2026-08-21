<#
    AxisVM_aufbauen.ps1
    ===========================================================================
    BAUT DAS TRAGJOCH IN AxisVM AUF - ueber die COM-Schnittstelle.

    Gelesen wird die Datei aus "Ausleiten -> JSON fuer die COM-Bruecke"
    (format: "tragjoch-stabmodell"). Geschrieben werden Material,
    Querschnitte, Knoten, Staebe, Auflager, Lastfaelle und Lasten. Gerechnet
    wird NICHT - das bleibt Ihre Entscheidung im Programm.

    WARUM DIESES SKRIPT SICH SELBST FINDET
    Die Namen der COM-Methoden verschieben sich zwischen den AxisVM-Fassungen:
    was in der einen `Lines.Add` heisst, heisst in der naechsten anders oder
    nimmt andere Argumente. Ein Skript, das eine Schreibweise fest annimmt,
    scheitert mitten im Aufbau und laesst ein halbes Modell zurueck.

    Dieses Skript probiert deshalb je Schritt MEHRERE bekannte Schreibweisen
    durch, merkt sich die erste, die traegt, und schreibt am Ende einen
    Bericht. Findet es fuer einen Schritt gar nichts, listet es auf, was das
    betreffende Objekt WIRKLICH anbietet, und haelt an - statt weiterzubauen.

    >>> Es ist gegen keine laufende AxisVM-Fassung erprobt. Der erste Lauf ist
    >>> deshalb zugleich der Versuch: er baut das Modell, oder er sagt genau,
    >>> woran es liegt. Den Bericht zurueckschicken. <<<

    AUFRUF
        Doppelklick auf AxisVM_aufbauen.cmd
    oder
        powershell -ExecutionPolicy Bypass -File AxisVM_aufbauen.ps1 -Json modell.json

    SCHALTER
        -Json <datei>   die Modelldatei; ohne Angabe die einzige *.json daneben
        -NurPruefen     nichts bauen, nur die Schnittstelle erkunden
        -Unsichtbar     AxisVM im Hintergrund halten
    ===========================================================================
#>
param(
    [string]$Json,
    [switch]$NurPruefen,
    [switch]$Unsichtbar
)

$ErrorActionPreference = 'Stop'
$bericht = Join-Path $PSScriptRoot 'AxisVM_aufbau_bericht.txt'
$zeilen  = New-Object System.Collections.Generic.List[string]
$gefunden = New-Object System.Collections.Generic.List[string]

<#  LETZTES NETZ.
    Reisst irgendwo etwas, das nicht vorgesehen war, so schliesst sich sonst
    das Fenster, bevor man den Grund lesen kann. Diese Falle schreibt ihn in
    den Bericht und haelt an.                                             #>
trap {
    $t = @(
        ''
        ('=' * 78)
        'UNERWARTETER FEHLER - hier blieb es stehen:'
        ('=' * 78)
        "  $($_.Exception.Message)"
        ''
        "  Zeile:  $($_.InvocationInfo.ScriptLineNumber)"
        "  Stelle: $($_.InvocationInfo.Line -replace '^\s+','')"
        ''
        $_.ScriptStackTrace
    )
    $t | ForEach-Object { Write-Host $_ }
    try { ($zeilen + $t) | Set-Content -Path $bericht -Encoding UTF8
          Write-Host ''; Write-Host "Bericht: $bericht"
          Write-Host 'Diese Datei zurueckschicken.' } catch { }
    Read-Host "`nWeiter mit Enter"
    exit 9
}

function Schreib([string]$t) { Write-Host $t; $zeilen.Add($t) }
function Abschnitt([string]$t) { Schreib ''; Schreib ('-' * 78); Schreib $t; Schreib ('-' * 78) }

function Beenden([int]$code, [string]$grund) {
    Schreib ''
    Schreib "ABBRUCH: $grund"
    Schreib ''
    Schreib 'WAS GEFUNDEN WURDE, bevor es haengen blieb:'
    if ($gefunden.Count -eq 0) { Schreib '  (nichts)' }
    else { $gefunden | ForEach-Object { Schreib "  $_" } }
    $zeilen | Set-Content -Path $bericht -Encoding UTF8
    Write-Host ''
    Write-Host "Bericht: $bericht"
    Write-Host 'Diese Datei zurueckschicken.'
    Read-Host "`nWeiter mit Enter"
    exit $code
}

<#  Probiert mehrere Schreibweisen und nimmt die erste, die traegt.
    $kandidaten ist eine Liste aus @{ name = 'Beschriftung'; tu = { ... } }.
    Rueckgabe: der Wert des erfolgreichen Blocks, oder $null.            #>
function Versuche([string]$schritt, $kandidaten, [switch]$Leise) {
    foreach ($k in $kandidaten) {
        try {
            $wert = & $k.tu
            if (-not $Leise) { Schreib ("  {0,-34} {1}" -f $schritt, $k.name) }
            $gefunden.Add("$schritt -> $($k.name)")
            return @{ ok = $true; wert = $wert; name = $k.name }
        } catch {
            if (-not $Leise) {
                $m = $_.Exception.Message -replace "`r?`n", ' '
                if ($m.Length -gt 90) { $m = $m.Substring(0, 90) + '...' }
                Schreib ("  {0,-34} {1}  ->  {2}" -f '', $k.name, $m)
            }
        }
    }
    return @{ ok = $false }
}

<#  Listet auf, was ein COM-Objekt wirklich anbietet - die Grundlage dafuer,
    die Kandidatenliste zu ergaenzen.                                     #>
function Mitglieder([string]$titel, $obj) {
    Schreib ''
    Schreib "WAS $titel ANBIETET:"
    if ($null -eq $obj) { Schreib '  (nicht vorhanden)'; return }
    try {
        $obj | Get-Member -Force |
            Where-Object { $_.MemberType -match 'Method|Property' } |
            Sort-Object Name |
            ForEach-Object { Schreib ("  {0}" -f $_.Definition) }
    } catch { Schreib "  Auslesen fehlgeschlagen: $($_.Exception.Message)" }
}

# ===========================================================================
Schreib "AxisVM COM-Aufbau  -  $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
Schreib ('=' * 78)
Schreib "PowerShell $($PSVersionTable.PSVersion)  -  $(if ([Environment]::Is64BitProcess) {'64'} else {'32'})-bit"

# --- Modelldatei -------------------------------------------------------------
if (-not $Json) {
    $kand = Get-ChildItem -Path $PSScriptRoot -Filter '*.json' -File |
            Where-Object { $_.Name -notlike '*bericht*' }
    if ($kand.Count -eq 1) { $Json = $kand[0].FullName }
    elseif ($kand.Count -eq 0 -and -not $NurPruefen) {
        Beenden 1 ('Keine Modelldatei gefunden. Die JSON-Datei aus ' +
                   '"Ausleiten -> JSON fuer die COM-Bruecke" neben dieses Skript legen.')
    } elseif (-not $NurPruefen) {
        Beenden 1 ("Mehrere JSON-Dateien daneben: $($kand.Name -join ', '). " +
                   'Mit -Json <datei> auswaehlen.')
    }
}

$d = $null
if ($Json) {
    Schreib "Modelldatei: $Json"
    $d = Get-Content -Path $Json -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($d.format -ne 'tragjoch-stabmodell') {
        Beenden 1 "Die Datei hat das Format '$($d.format)', erwartet 'tragjoch-stabmodell'."
    }
    Schreib ("  $($d.tragwerk.bezeichnung)  -  $($d.knoten.Count) Knoten  -  " +
             "$($d.staebe.Count) Staebe  -  $($d.querschnitte.Count) Querschnitte")
    Schreib ("  Einheiten: $($d.einheiten.laenge) / $($d.einheiten.kraft) / " +
             "$($d.einheiten.moment) / Drehfeder $($d.einheiten.drehfeder)")
}

# --- 1 - Anwendung -----------------------------------------------------------
Abschnitt '1 - AxisVM ansprechen'
$app = $null
try { $app = New-Object -ComObject 'AxisVM.AxisVMApplication' }
catch {
    Schreib "FEHLGESCHLAGEN: $($_.Exception.Message)"
    Schreib '  - AxisVM installiert? COM einmal als Administrator registrieren lassen?'
    Schreib '  - Bit-Breite: 64-bit-PowerShell gegen 32-bit-AxisVM.'
    Schreib '    Dann SysWOW64\WindowsPowerShell\v1.0\powershell.exe nehmen.'
    Beenden 1 'Kein COM-Server.'
}
Schreib '  erreichbar.'
foreach ($n in 'Version','BuildNumber','CodeVersion','FullVersionString') {
    try { Schreib ("  {0,-20} {1}" -f $n, $app.$n) } catch { }
}
foreach ($p in @(@{n='Visible'; v=$(if ($Unsichtbar) {0} else {1})},
                 @{n='AskCloseAll'; v=1}, @{n='AskSaveOnLastReleased'; v=0},
                 @{n='AskCloseOnLastReleased'; v=0}, @{n='CloseOnLastReleased'; v=0})) {
    try { $app.($p.n) = $p.v } catch { }
}

# --- 2 - Modell --------------------------------------------------------------
Abschnitt '2 - Modell anlegen'
$r = Versuche 'Modell anlegen' @(
    @{ name = 'Models.New()';        tu = { $app.Models.New() } },
    @{ name = 'Models.Add()';        tu = { $app.Models.Add() } }
)
if (-not $r.ok) { Mitglieder 'Models' $app.Models; Beenden 2 'Kein Modell anlegbar.' }
$idx = $r.wert
$m = $app.Models.Item($idx)
Schreib "  Modell $idx"

if ($NurPruefen) {
    Abschnitt 'Nur erkundet - was das Modell anbietet'
    Mitglieder 'MODELL' $m
    foreach ($n in 'Materials','CrossSections','Nodes','Lines','Members',
                   'NodalSupports','LoadCases','LoadGroups','ConcentratedLoads',
                   'LineLoads','MemberLoads','SurfaceLoads','Loads') {
        $t = $null; try { $t = $m.$n } catch { }
        Mitglieder "MODELL.$n" $t
    }
    try { $app.Models.Delete($idx) } catch { }
    try { $app.Quit() } catch { }
    $zeilen | Set-Content -Path $bericht -Encoding UTF8
    Write-Host ''; Write-Host "Bericht: $bericht"
    Read-Host "`nWeiter mit Enter"
    exit 0
}

# --- 3 - Material ------------------------------------------------------------
Abschnitt '3 - Material'
$stahl = $d.material.name
$r = Versuche 'Material' @(
    @{ name = "Materials.AddFromCatalog(1, '$stahl')"; tu = { $m.Materials.AddFromCatalog(1, $stahl) } },
    @{ name = "Materials.AddFromCatalog(0, '$stahl')"; tu = { $m.Materials.AddFromCatalog(0, $stahl) } },
    @{ name = "Materials.AddFromCatalog('$stahl')";    tu = { $m.Materials.AddFromCatalog($stahl) } },
    @{ name = 'Materials.Add(...) von Hand';           tu = {
        $m.Materials.Add($stahl, 1, $d.material.E * 1000, $d.material.nu,
                         $d.material.alpha, $d.material.rho * 9.81 / 1000) } }
)
if (-not $r.ok) { Mitglieder 'Materials' $m.Materials; Beenden 3 'Kein Material anlegbar.' }
$iMat = $r.wert

# --- 4 - Querschnitte --------------------------------------------------------
Abschnitt '4 - Querschnitte'
# Bevorzugt werden die AUSGERECHNETEN Werte (A, I_y, I_z, I_t in m2 bzw. m4):
# sie sind eindeutig, waehrend die parametrischen Formen je Fassung anders
# heissen und anders herum orientiert sind.
$qs = @{}
foreach ($q in $d.querschnitte) {
    $A  = $q.A;  $Iy = $q.Iy;  $Iz = $q.Iz;  $It = $q.It
    if ($null -eq $A) {
        # Rechteck ohne Tabellenwerte: aus den Parametern rechnen [mm -> m]
        $h = $q.parameter[0] / 1000.0; $b = $q.parameter[1] / 1000.0
        $A = $h * $b
        $Iy = $b * [Math]::Pow($h, 3) / 12.0
        $Iz = $h * [Math]::Pow($b, 3) / 12.0
        $lang = [Math]::Max($h, $b); $kurz = [Math]::Min($h, $b)
        $It = $lang * [Math]::Pow($kurz, 3) / 3.0
    }
    $r = Versuche "QS $($q.name)" @(
        @{ name = 'CrossSections.AddCustom(Name,A,Ay,Az,Ix,Iy,Iz,...)'; tu = {
            $m.CrossSections.AddCustom($q.name, $A, $A, $A, $It, $Iy, $Iz, 0, 0, 0, 0) } },
        @{ name = 'CrossSections.AddCustom(Name,A,Ix,Iy,Iz)'; tu = {
            $m.CrossSections.AddCustom($q.name, $A, $It, $Iy, $Iz) } },
        @{ name = 'CrossSections.Add(Name,A,Ix,Iy,Iz)'; tu = {
            $m.CrossSections.Add($q.name, $A, $It, $Iy, $Iz) } }
    ) -Leise:($qs.Count -gt 0)
    if (-not $r.ok) { Mitglieder 'CrossSections' $m.CrossSections; Beenden 4 "Querschnitt $($q.name) nicht anlegbar." }
    $qs[$q.name] = $r.wert
}
Schreib "  $($qs.Count) Querschnitte"

# --- 5 - Knoten --------------------------------------------------------------
Abschnitt '5 - Knoten'
$kn = @{}
$erste = $true
foreach ($k in $d.knoten) {
    $r = Versuche "Knoten" @(
        @{ name = 'Nodes.Add(x,y,z)'; tu = { $m.Nodes.Add($k.x, $k.y, $k.z) } },
        @{ name = 'Nodes.AddWithDOF(x,y,z,dof)'; tu = { $m.Nodes.AddWithDOF($k.x, $k.y, $k.z, 63) } }
    ) -Leise:(-not $erste)
    if (-not $r.ok) { Mitglieder 'Nodes' $m.Nodes; Beenden 5 'Knoten nicht anlegbar.' }
    $kn[$k.name] = $r.wert
    $erste = $false
}
Schreib "  $($kn.Count) Knoten"

# --- 6 - Staebe --------------------------------------------------------------
Abschnitt '6 - Staebe'
$erste = $true; $nStab = 0
foreach ($s in $d.staebe) {
    $a = $kn[$s.von]; $b = $kn[$s.bis]; $q = $qs[$s.querschnitt]
    if (-not $a -or -not $b) { Beenden 6 "Stab $($s.name): Knoten fehlt." }
    $r = Versuche "Stab" @(
        @{ name = 'Lines.Add + DefineAsBeam'; tu = {
            $li = $m.Lines.Add($a, $b, 0, 0)
            $m.Lines.Item($li).DefineAsBeam($iMat, $q, $q, 0, 0)
            $li } },
        @{ name = 'Members.AddBeam(n1,n2,mat,qs)'; tu = { $m.Members.AddBeam($a, $b, $iMat, $q) } },
        @{ name = 'Members.Add(n1,n2,mat,qs)';     tu = { $m.Members.Add($a, $b, $iMat, $q) } },
        @{ name = 'Lines.Add(n1,n2,mat,qs)';       tu = { $m.Lines.Add($a, $b, $iMat, $q) } }
    ) -Leise:(-not $erste)
    if (-not $r.ok) {
        Mitglieder 'Lines' $m.Lines
        try { Mitglieder 'Members' $m.Members } catch { }
        Beenden 6 "Stab $($s.name) nicht anlegbar."
    }
    $nStab++; $erste = $false
}
Schreib "  $nStab Staebe"

# --- 7 - Auflager ------------------------------------------------------------
Abschnitt '7 - Auflager'
# Der Rechenkern haelt beide Enden quer und lotrecht, die Torsion ebenfalls
# (Gabellagerung). Die Vertikalbiegung laeuft ueber eine DREHFEDER; im
# Grundriss bleibt es gelenkig. Ein Ende ist laengs frei.
$STARR = 1e10
foreach ($a in $d.auflager) {
    $n = $kn[$a.knoten]
    if (-not $n) { Schreib "  Auflagerknoten $($a.knoten) fehlt - uebersprungen"; continue }
    $wert = { param($f, $c)
        switch ($f) { 'Rigid' { $STARR } 'Free' { 0 } 'Flexible' { $c } default { 0 } } }
    $rx = & $wert $a.ux 0;  $ry = & $wert $a.uy 0;  $rz = & $wert $a.uz 0
    $mx = & $wert $a.fix 0
    $my = & $wert $a.fiy ([double]$a.cFiy_kNm)      # kNm/rad
    $mz = & $wert $a.fiz 0
    $r = Versuche "Auflager $($a.ende)" @(
        @{ name = 'NodalSupports.AddNodalGlobal(rx,ry,rz,mx,my,mz,node)'; tu = {
            $m.NodalSupports.AddNodalGlobal($rx, $ry, $rz, $mx, $my, $mz, $n) } },
        @{ name = 'NodalSupports.AddGlobal(...)'; tu = {
            $m.NodalSupports.AddGlobal($rx, $ry, $rz, $mx, $my, $mz, $n) } },
        @{ name = 'NodalSupports.Add(node, rx..mz)'; tu = {
            $m.NodalSupports.Add($n, $rx, $ry, $rz, $mx, $my, $mz) } }
    )
    if (-not $r.ok) { Mitglieder 'NodalSupports' $m.NodalSupports; Beenden 7 'Auflager nicht anlegbar.' }
    Schreib ("    $($a.ende): ux $($a.ux) - uy $($a.uy) - uz $($a.uz) - " +
             "fix $($a.fix) - fiy $($a.fiy) c=$($a.cFiy_kNm) kNm/rad - fiz $($a.fiz)")
}

# --- 8 - Lastfaelle ----------------------------------------------------------
Abschnitt '8 - Lastfaelle'
# Je Einwirkungsgruppe ein Lastfall, CHARAKTERISTISCH. Kombiniert wird in
# AxisVM - nur so bleibt ablesbar, welcher Anteil woher kommt.
$lf = @{}
foreach ($f in $d.lastfaelle) {
    $r = Versuche "Lastfall $($f.key)" @(
        @{ name = 'LoadCases.Add(name, 0)'; tu = { $m.LoadCases.Add($f.label, 0) } },
        @{ name = 'LoadCases.Add(name)';    tu = { $m.LoadCases.Add($f.label) } },
        @{ name = 'LoadCases.AddCase(name, 0)'; tu = { $m.LoadCases.AddCase($f.label, 0) } }
    ) -Leise:($lf.Count -gt 0)
    if (-not $r.ok) { Mitglieder 'LoadCases' $m.LoadCases; Beenden 8 'Lastfall nicht anlegbar.' }
    $lf[$f.key] = $r.wert
}
Schreib "  $($lf.Count) Lastfaelle: $($lf.Keys -join ', ')"

# --- 9 - Lasten --------------------------------------------------------------
Abschnitt '9 - Lasten'
# Achsen: x Jochachse, y Gleisrichtung, z lotrecht nach OBEN. Die Werte im
# JSON sind bereits in diesem System - hier wird nichts mehr gedreht.
$nP = 0; $erste = $true
foreach ($p in $d.lasten.punkt) {
    $n = $kn[$p.knoten]; if (-not $n) { continue }
    $fx = 0.0; $fy = 0.0; $fz = 0.0
    switch ($p.richtung) { 'X' { $fx = $p.wert } 'Y' { $fy = $p.wert } 'Z' { $fz = $p.wert } }
    $r = Versuche 'Punktlast' @(
        @{ name = 'ConcentratedLoads.AddNodalForce(node,Fx..Mz,lc)'; tu = {
            $m.ConcentratedLoads.AddNodalForce($n, $fx, $fy, $fz, 0, 0, 0, $lf[$p.lastfall]) } },
        @{ name = 'NodalLoads.Add(node,Fx..Mz,lc)'; tu = {
            $m.NodalLoads.Add($n, $fx, $fy, $fz, 0, 0, 0, $lf[$p.lastfall]) } },
        @{ name = 'Loads.AddNodalForce(...)'; tu = {
            $m.Loads.AddNodalForce($n, $fx, $fy, $fz, 0, 0, 0, $lf[$p.lastfall]) } }
    ) -Leise:(-not $erste)
    if (-not $r.ok) {
        try { Mitglieder 'ConcentratedLoads' $m.ConcentratedLoads } catch { }
        try { Mitglieder 'Loads' $m.Loads } catch { }
        Beenden 9 'Punktlast nicht anlegbar.'
    }
    $nP++; $erste = $false
}

$nM = 0; $erste = $true
foreach ($p in $d.lasten.moment) {
    $n = $kn[$p.knoten]; if (-not $n) { continue }
    $mx = 0.0; $my = 0.0; $mz = 0.0
    switch ($p.richtung) { 'Mx' { $mx = $p.wert } 'My' { $my = $p.wert } 'Mz' { $mz = $p.wert } }
    $r = Versuche 'Punktmoment' @(
        @{ name = 'ConcentratedLoads.AddNodalForce(node,0,0,0,Mx,My,Mz,lc)'; tu = {
            $m.ConcentratedLoads.AddNodalForce($n, 0, 0, 0, $mx, $my, $mz, $lf[$p.lastfall]) } },
        @{ name = 'NodalLoads.Add(node,0,0,0,Mx,My,Mz,lc)'; tu = {
            $m.NodalLoads.Add($n, 0, 0, 0, $mx, $my, $mz, $lf[$p.lastfall]) } }
    ) -Leise:(-not $erste)
    if (-not $r.ok) { Beenden 9 'Punktmoment nicht anlegbar.' }
    $nM++; $erste = $false
}

# Streckenlasten liegen auf STAEBEN. Die Stabnummer ist die Reihenfolge des
# Aufbaus - deshalb wird sie beim Bauen mitgefuehrt.
$stabNr = @{}
$i = 1
foreach ($s in $d.staebe) { $stabNr[$s.name] = $i; $i++ }

$nQ = 0; $erste = $true
foreach ($q in $d.lasten.strecke) {
    $sn = $stabNr[$q.stab]; if (-not $sn) { continue }
    # Richtung im globalen System: 1=X, 2=Y, 3=Z (je Fassung verschieden -
    # deshalb mehrere Versuche)
    $ri = switch ($q.richtung) { 'X' { 1 } 'Y' { 2 } 'Z' { 3 } default { 3 } }
    $w = [double]$q.wert
    $r = Versuche 'Streckenlast' @(
        @{ name = 'MemberLoads.AddDistributed(mem,dir,q1,q2,lc)'; tu = {
            $m.MemberLoads.AddDistributed($sn, $ri, $w, $w, $lf[$q.lastfall]) } },
        @{ name = 'LineLoads.AddBeamDistributed(...)'; tu = {
            $m.LineLoads.AddBeamDistributed($sn, $ri, $w, $w, $lf[$q.lastfall]) } },
        @{ name = 'Loads.AddBeamDistributed(...)'; tu = {
            $m.Loads.AddBeamDistributed($sn, $ri, $w, $w, $lf[$q.lastfall]) } }
    ) -Leise:(-not $erste)
    if (-not $r.ok) {
        foreach ($n in 'MemberLoads','LineLoads','Loads') {
            $t = $null; try { $t = $m.$n } catch { }
            if ($t) { Mitglieder $n $t }
        }
        Beenden 9 'Streckenlast nicht anlegbar.'
    }
    $nQ++; $erste = $false
}
Schreib "  $nP Punktlasten - $nM Punktmomente - $nQ Streckenlasten"

# --- 10 - Sichern ------------------------------------------------------------
Abschnitt '10 - Sichern'
$axs = [IO.Path]::ChangeExtension($Json, '.axs')
$r = Versuche 'Speichern' @(
    @{ name = 'SaveAs(datei)';        tu = { $m.SaveAs($axs) } },
    @{ name = 'SaveToFile(datei, 0)'; tu = { $m.SaveToFile($axs, 0) } },
    @{ name = 'Save(datei)';          tu = { $m.Save($axs) } }
)
if ($r.ok) { Schreib "  $axs" }
else { Schreib '  nicht gespeichert - das Modell steht offen in AxisVM.' }

Abschnitt 'Fertig'
Schreib 'Das Modell steht. NICHT gerechnet - Lastkombinationen und Berechnung'
Schreib 'bleiben Ihre Entscheidung im Programm.'
Schreib ''
Schreib 'Danach: Spannungen je Lastfall ausgeben (Blaetter "vm <Name>") und'
Schreib '        python3 vergleich_axisvm.py <export.xlsx> vergleich_werkzeug.json'
Schreib ''
Schreib 'GEFUNDENE SCHREIBWEISEN - die traegt diese AxisVM-Fassung:'
$gefunden | Select-Object -Unique | ForEach-Object { Schreib "  $_" }

$zeilen | Set-Content -Path $bericht -Encoding UTF8
Write-Host ''
Write-Host "Bericht: $bericht"
Read-Host "`nWeiter mit Enter"
