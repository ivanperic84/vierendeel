<#  AxisVM_modell_lesen.ps1  -  NUR LESEN.

    Oeffnet eine vorhandene AxisVM-Datei ueber COM und schreibt ihren Aufbau
    (Knoten, Linien, Querschnitte, Lager, Lastfaelle) als JSON. Es wird
    NICHT gerechnet und NICHT gespeichert; die Datei bleibt, wie sie ist.

    Weisung 3. Oktober 2026 (Gittermast): die Beispielmodelle im
    Grundlagenordner auslesen - auf Rueckfrage "Ja, nur lesen".

    Aufruf:
      powershell -NoProfile -ExecutionPolicy Bypass -File AxisVM_modell_lesen.ps1 `
                 -Datei <modell.axs> -Aus <ergebnis.json>

    Die Datei muss reines ASCII bleiben (wie AxisVM_aufbauen.ps1).         #>
param(
    [Parameter(Mandatory = $true)][string]$Datei,
    [Parameter(Mandatory = $true)][string]$Aus
)
$ErrorActionPreference = 'Stop'
$log = New-Object System.Collections.Generic.List[string]
function Schreib([string]$t) { $log.Add($t); Write-Host $t }

# --- Typbibliothek -> Interop-Baugruppe (wie in AxisVM_aufbauen.ps1) --------
if (-not ('TlbHilfeL' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Reflection;
using System.Runtime.InteropServices;
public class TlbSenkeL : ITypeLibImporterNotifySink {
public void ReportEvent(ImporterEventKind k, int c, string m) { }
public Assembly ResolveRef(object tl) { return null; }
}
public class TlbHilfeL {
[DllImport("oleaut32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
public static extern void LoadTypeLibEx(string datei, int art,
    [MarshalAs(UnmanagedType.Interface)] out object tlb);
}
'@
}
$typen = @()
try {
    $c = (Get-ItemProperty 'HKLM:\SOFTWARE\Classes\AxisVM.AxisVMApplication\CLSID').'(default)'
    $s = (Get-ItemProperty "HKLM:\SOFTWARE\Classes\CLSID\$c\LocalServer32").'(default)'
    $exe = ($s -replace '^"([^"]+)".*$', '$1') -replace '\s+/.*$', ''
    Schreib "Programm: $exe"
    $tlb = $null
    [TlbHilfeL]::LoadTypeLibEx($exe, 2, [ref]$tlb)
    $wandler = New-Object System.Runtime.InteropServices.TypeLibConverter
    $asm = $wandler.ConvertTypeLibToAssembly($tlb, 'Interop.AxisVM.Lesen.dll', 0,
        (New-Object TlbSenkeL), $null, $null, 'AxisVMLesen', $null)
    try { $typen = $asm.GetTypes() }
    catch [Reflection.ReflectionTypeLoadException] { $typen = $_.Exception.Types | Where-Object { $_ } }
    Schreib "Typbibliothek: $($typen.Count) Typen"
} catch { Schreib "Typbibliothek nicht geladen: $($_.Exception.Message)" }

function Satz([string]$name) {
    $t = $typen | Where-Object { $_.Name -eq $name } | Select-Object -First 1
    if (-not $t) { return $null }
    [Activator]::CreateInstance($t)
}
function SatzAlsTabelle($s) {
    if ($null -eq $s) { return $null }
    $o = [ordered]@{}
    foreach ($f in $s.GetType().GetFields([Reflection.BindingFlags]'Public,Instance')) {
        $v = $f.GetValue($s)
        if ($null -eq $v) { $o[$f.Name] = $null }
        elseif ($f.FieldType.IsEnum) { $o[$f.Name] = "$v" }
        elseif ($f.FieldType.IsPrimitive -or $v -is [string]) { $o[$f.Name] = $v }
        elseif ($f.FieldType.IsValueType) { $o[$f.Name] = SatzAlsTabelle $v }
        else { $o[$f.Name] = "$v" }
    }
    $o
}
function Mitglieder($obj) {
    try { ($obj | Get-Member -ErrorAction Stop | ForEach-Object { "$($_.MemberType) $($_.Name)" }) }
    catch { @("(nicht lesbar: $($_.Exception.Message))") }
}
function Eig($obj, [string[]]$namen) {
    $o = [ordered]@{}
    foreach ($n in $namen) {
        try { $v = $obj.$n; if ($null -ne $v -and ($v -is [ValueType] -or $v -is [string])) { $o[$n] = $v } }
        catch { }
    }
    $o
}

# --- AxisVM -----------------------------------------------------------------
# Welche AxisVM-Prozesse laufen schon? Am Ende wird nur der EIGENE beendet.
$vorher = @(Get-Process -Name 'AxisVM*' -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$app = New-Object -ComObject 'AxisVM.AxisVMApplication'
Start-Sleep -Milliseconds 800
$eigene = @(Get-Process -Name 'AxisVM*' -ErrorAction SilentlyContinue |
            Where-Object { $vorher -notcontains $_.Id } | ForEach-Object { $_.Id })
foreach ($p in @(@{n='Visible'; v=0}, @{n='AskCloseAll'; v=0}, @{n='AskSaveOnLastReleased'; v=0},
                 @{n='AskCloseOnLastReleased'; v=0}, @{n='CloseOnLastReleased'; v=1})) {
    try { $app.($p.n) = $p.v } catch { }
}
$wart = 0
while ($wart -lt 60) { try { if ([int]$app.Loaded -ne 0) { break } } catch { }; Start-Sleep -Milliseconds 500; $wart++ }
$idx = $app.Models.New()
$m = $app.Models.Item($idx)
$pfad = (Resolve-Path -LiteralPath $Datei).Path
$r = $m.LoadFromFile($pfad)
Schreib "LoadFromFile -> $r  ($pfad)"

$erg = [ordered]@{ datei = (Split-Path -Leaf $pfad); geladen = "$r" }

# --- Knoten -----------------------------------------------------------------
$nK = [int]$m.Nodes.Count
Schreib "Knoten: $nK"
$knoten = New-Object System.Collections.Generic.List[object]
$wegK = ''
for ($i = 1; $i -le $nK; $i++) {
    $p = Satz 'RPoint3d'
    $ok = 0
    try { $ok = $m.Nodes.GetNodeCoord($i, [ref]$p); $wegK = 'GetNodeCoord ref' } catch { $ok = -1 }
    $x = $null; $y = $null; $z = $null
    if ($ok -gt 0 -and $p) { $x = [double]$p.x; $y = [double]$p.y; $z = [double]$p.z }
    $knoten.Add([ordered]@{ i = $i; x = $x; y = $y; z = $z })
}
$erg.knotenWeg = $wegK
$erg.knoten = $knoten

# --- Querschnitte -----------------------------------------------------------
$nQ = [int]$m.CrossSections.Count
Schreib "Querschnitte: $nQ"
$qs = New-Object System.Collections.Generic.List[object]
$qEig = 'Name','Ax','Ay','Az','Ix','Iy','Iz','Iyz','I1','I2','h','b','tw','tf','r1','W1t','W1b','W2t','W2b','CrossSectionShape','Yg','Zg','Alpha','UID'
for ($i = 1; $i -le $nQ; $i++) {
    $o = [ordered]@{ i = $i }
    try { $o.name = [string]$m.CrossSections.Name($i) } catch { }
    try {
        $c = $m.CrossSections.Item($i)
        if ($i -eq 1) { $erg.querschnittMitglieder = Mitglieder $c }
        foreach ($e in (Eig $c $qEig).GetEnumerator()) { $o[$e.Key] = $e.Value }
    } catch { $o.fehler = $_.Exception.Message }
    $qs.Add($o)
}
$erg.querschnitte = $qs

# --- Materialien ------------------------------------------------------------
$mat = New-Object System.Collections.Generic.List[object]
try {
    $nM = [int]$m.Materials.Count
    for ($i = 1; $i -le $nM; $i++) { $mat.Add([ordered]@{ i = $i; name = [string]$m.Materials.Name($i) }) }
} catch { }
$erg.materialien = $mat

# --- Linien -----------------------------------------------------------------
$nL = [int]$m.Lines.Count
Schreib "Linien: $nL"
$linien = New-Object System.Collections.Generic.List[object]
$lEig = 'StartNode','EndNode','LineType','Length','CrossSectionIndex','StartCrossSectionIndex','EndCrossSectionIndex','MaterialIndex','IsRigid','GeomType','Angle','MemberId','UID'
for ($i = 1; $i -le $nL; $i++) {
    $o = [ordered]@{ i = $i }
    try {
        $l = $m.Lines.Item($i)
        if ($i -eq 1) { $erg.linieMitglieder = Mitglieder $l }
        foreach ($e in (Eig $l $lEig).GetEnumerator()) { $o[$e.Key] = $e.Value }
        try { $o.name = [string]$m.Lines.Name($i) } catch { }
        try { $o.RigidBodyId = [int]$l.RigidBodyId } catch { }
        # Balken- bzw. Fachwerkdaten: der Querschnitt je Linie.
        foreach ($art in @(@{t='RBeamData'; f='GetBeamData'}, @{t='RTrussData'; f='GetTrussData'},
                           @{t='RRibData'; f='GetRibData'})) {
            $bd = Satz $art.t
            if (-not $bd) { continue }
            try {
                $okb = $l.($art.f).Invoke([ref]$bd)
            } catch {
                try { $okb = $l.PSObject.Methods[$art.f].Invoke([ref]$bd) } catch { $okb = -1 }
            }
            if ($okb -gt 0) { $o[$art.t] = SatzAlsTabelle $bd; break }
        }
    } catch { $o.fehler = $_.Exception.Message }
    $linien.Add($o)
}
$erg.linien = $linien

# Dazu der ganze Satz je Linie (RLineData), falls er durchgeht.
try {
    $ld = Satz 'RLineData'
    if ($ld) { $erg.rLineDataFelder = (SatzAlsTabelle $ld).Keys }
} catch { }

# --- Lager, Links, Starrkoerper ---------------------------------------------
foreach ($n in 'NodalSupports','LineSupports','LinkElements','Members','Domains','LoadCases','LoadCombinations','LoadGroups') {
    try { $erg["anzahl_$n"] = [int]$m.$n.Count } catch { $erg["anzahl_$n"] = $null }
}
try { $erg.starrkoerper = [int]$m.Lines.RigidBodyCount } catch { }
$lager = New-Object System.Collections.Generic.List[object]
try {
    $nS = [int]$m.NodalSupports.Count
    for ($i = 1; $i -le $nS; $i++) {
        $o = [ordered]@{ i = $i }
        try { $s = $m.NodalSupports.Item($i); if ($i -eq 1) { $erg.lagerMitglieder = Mitglieder $s }
              foreach ($e in (Eig $s @('NodeId','SupportType','Angle','UID')).GetEnumerator()) { $o[$e.Key] = $e.Value } } catch { }
        $lager.Add($o)
    }
} catch { }
$erg.lager = $lager

# --- Lastfaelle -------------------------------------------------------------
$lf = New-Object System.Collections.Generic.List[object]
try {
    $nLC = [int]$m.LoadCases.Count
    for ($i = 1; $i -le $nLC; $i++) {
        $o = [ordered]@{ i = $i }
        try { $o.name = [string]$m.LoadCases.Name($i) } catch { }
        $lf.Add($o)
    }
} catch { }
$erg.lastfaelle = $lf
foreach ($n in 'Loads') {
    try { $erg.lastenMitglieder = Mitglieder $m.Loads } catch { }
}

$erg.protokoll = $log
($erg | ConvertTo-Json -Depth 8) | Out-File -LiteralPath $Aus -Encoding utf8
Schreib "geschrieben: $Aus"

# --- Schliessen, ohne zu speichern ------------------------------------------
try { $app.Models.Delete($idx) } catch { }
$m = $null
[void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($app)
$app = $null
[GC]::Collect(); [GC]::WaitForPendingFinalizers()
<#  Gemessen am 3. Oktober 2026: die Instanz blieb nach dem Loslassen der
    Verweise stehen und hielt die Datei gesperrt (drei Laeufe, drei Fenster).
    Deshalb wird der Prozess, den DIESER Lauf gestartet hat, beendet - nie
    einer, der vorher schon lief.                                          #>
Start-Sleep -Seconds 2
foreach ($id in $eigene) {
    try { if (Get-Process -Id $id -ErrorAction SilentlyContinue) { Stop-Process -Id $id -Force -Confirm:$false } } catch { }
}
