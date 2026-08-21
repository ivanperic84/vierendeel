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
                   'NodalSupports','LoadCases','LoadGroups','Loads') {
        $t = $null; try { $t = $m.$n } catch { }
        Mitglieder "MODELL.$n" $t
    }

    # =======================================================================
    # DIE VERBUND-TYPEN.
    #
    # AxisVM nimmt die wichtigen Angaben nicht als einzelne Zahlen, sondern
    # als Verbund: Lines.Add(i, j, art, RLineGeomData), AddNodalForce(
    # RLoadNodalForce), AddNodalGlobal(RStiffnesses, ...). PowerShell kennt
    # diese Typen nicht - sie stehen in der Typbibliothek, die in der
    # Programmdatei von AxisVM steckt.
    #
    # .NET kann eine Typbibliothek zur Laufzeit in eine Baugruppe wandeln -
    # dasselbe, was tlbimp.exe tut, nur ohne SDK. Danach lassen sich die
    # Verbund-Typen anlegen und ihre FELDER auslesen. Genau die fehlen noch:
    # ohne die Feldnamen ist keine einzige Last zu setzen.
    # =======================================================================
    Abschnitt 'Verbund-Typen (Records) und Aufzaehlungen'

    $exe = $null
    $r = Versuche 'Programmdatei finden' @(
        @{ name = 'laufender Prozess'; tu = {
            $p = Get-Process -Name 'AxisVM*' -ErrorAction Stop |
                 Where-Object { $_.Path } | Select-Object -First 1
            if (-not $p) { throw 'kein Prozess mit Pfad' }
            $p.Path } },
        @{ name = 'Registry ProgID -> LocalServer32'; tu = {
            $c = (Get-ItemProperty 'HKLM:\SOFTWARE\Classes\AxisVM.AxisVMApplication\CLSID' -ErrorAction Stop).'(default)'
            $s = (Get-ItemProperty "HKLM:\SOFTWARE\Classes\CLSID\$c\LocalServer32" -ErrorAction Stop).'(default)'
            ($s -replace '^"([^"]+)".*$', '$1') -replace '\s+/.*$', '' } }
    )
    if ($r.ok) { $exe = $r.wert; Schreib "  $exe" }

    $asm = $null
    if ($exe -and (Test-Path -LiteralPath $exe)) {
        try {
            if (-not ('TlbHilfe' -as [type])) {
                Add-Type -TypeDefinition @'
using System;
using System.Reflection;
using System.Runtime.InteropServices;
public class TlbSenke : ITypeLibImporterNotifySink {
    public void ReportEvent(ImporterEventKind k, int c, string m) { }
    public Assembly ResolveRef(object tl) { return null; }
}
public class TlbHilfe {
    [DllImport("oleaut32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
    public static extern void LoadTypeLibEx(string datei, int art, out object tlb);
}
'@
            }
            $tlb = $null
            [TlbHilfe]::LoadTypeLibEx($exe, 2, [ref]$tlb)   # 2 = REGKIND_NONE
            Schreib '  Typbibliothek gelesen.'
            $wandler = New-Object System.Runtime.InteropServices.TypeLibConverter
            $asm = $wandler.ConvertTypeLibToAssembly(
                $tlb, 'Interop.AxisVM.dll', 0, (New-Object TlbSenke),
                $null, $null, 'AxisVM', $null)
            Schreib "  Baugruppe erzeugt: $($asm.GetTypes().Count) Typen."
            $gefunden.Add('Typbibliothek -> Interop-Baugruppe zur Laufzeit')
        } catch {
            Schreib "  Umwandlung fehlgeschlagen: $($_.Exception.Message)"
        }
    }

    if ($asm) {
        $typen = @()
        try { $typen = $asm.GetTypes() }
        catch [Reflection.ReflectionTypeLoadException] { $typen = $_.Exception.Types | Where-Object { $_ } }

        # --- die Verbund-Typen, auf die es ankommt --------------------------
        $wichtig = @(
            'RPoint3d','RLineGeomData','RNodalSupportSpringParams',
            'RSpringParamIndexes','RStiffnesses','RNonLinearity','RResistances',
            'RLoadNodalForce','RLoadBeamConcentrated','RLoadBeamDistributed',
            'RLoadMemberConcentrated','RLoadMemberDistributed'
        )
        Schreib ''
        Schreib 'FELDER DER VERBUND-TYPEN:'
        foreach ($w in $wichtig) {
            $t = $typen | Where-Object { $_.Name -eq $w } | Select-Object -First 1
            if (-not $t) { Schreib "  $w  ->  gibt es nicht"; continue }
            Schreib "  $($t.Name)"
            foreach ($f in $t.GetFields([Reflection.BindingFlags]'Public,Instance')) {
                Schreib ("      {0,-28} {1}" -f $f.Name, $f.FieldType.Name)
            }
        }

        # --- alle Aufzaehlungen: ohne sie ist jede Zahl geraten -------------
        Schreib ''
        Schreib 'AUFZAEHLUNGEN:'
        foreach ($t in ($typen | Where-Object { $_.IsEnum } | Sort-Object Name)) {
            $n = [Enum]::GetNames($t)
            if ($n.Count -gt 24) {
                Schreib "  $($t.Name)  ($($n.Count) Werte, erste 24)"
                $n = $n[0..23]
            } else {
                Schreib "  $($t.Name)"
            }
            foreach ($e in $n) {
                Schreib ("      {0,-40} {1}" -f $e, [int]([Enum]::Parse($t, $e)))
            }
        }

        # --- der entscheidende Versuch -------------------------------------
        # Traegt ein Verbund-Typ durch die spaete Bindung? Wenn ja, genuegt
        # PowerShell; wenn nein, muss frueh gebunden werden.
        Abschnitt 'Probe: laesst sich damit wirklich bauen?'
        $n1 = $m.Nodes.Add(0.0, 0.0, 0.0)
        $n2 = $m.Nodes.Add(1.0, 0.0, 0.0)
        Schreib "  zwei Probeknoten: $n1, $n2"
        $tG = $typen | Where-Object { $_.Name -eq 'RLineGeomData' } | Select-Object -First 1
        $rL = Versuche 'Stab mit Verbund-Typ' @(
            @{ name = 'spaet gebunden, Wert';   tu = {
                $g = [Activator]::CreateInstance($tG)
                $m.Lines.Add($n1, $n2, 0, $g) } },
            @{ name = 'spaet gebunden, [ref]';  tu = {
                $g = [Activator]::CreateInstance($tG)
                $m.Lines.Add($n1, $n2, 0, [ref]$g) } },
            @{ name = 'frueh gebunden ueber IAxisVMModel'; tu = {
                $ti = $typen | Where-Object { $_.Name -eq 'IAxisVMModel' } | Select-Object -First 1
                if (-not $ti) { throw 'IAxisVMModel nicht in der Baugruppe' }
                $mi = [System.Runtime.InteropServices.Marshal]::CreateWrapperOfType($m, $ti)
                $g = [Activator]::CreateInstance($tG)
                $mi.Lines.Add($n1, $n2, 0, [ref]$g) } },
            @{ name = 'ohne Verbund-Typ';       tu = { $m.Lines.Add($n1, $n2, 0) } }
        )
        # Steht eine Linie, so haengen IHR Material und Querschnitt an Item(i)
        # - DefineAsBeam(mat, qs, qs, ref RPoint3d, ref RPoint3d). Was diese
        # Methode wirklich verlangt, war bisher nicht zu sehen: es gab keine
        # Linie zum Hineinschauen.
        if ($rL.ok -and $rL.wert) {
            try { Mitglieder 'MODELL.Lines.Item(1)' $m.Lines.Item($rL.wert) }
            catch { Schreib "  Lines.Item nicht lesbar: $($_.Exception.Message)" }
        }

        # --- Federsaetze ---------------------------------------------------
        # AddNodalGlobal_V153 nimmt RNodalSupportSpringParams, und darin
        # stehen INDIZES benannter Federsaetze - keine Federzahlen:
        #   .SpringParamIndexes.x = SpringParams.IndexOfName('Rigid - ...')
        # Unsere Drehfeder hat c = 12452 kNm/rad, dafuer braucht es einen
        # EIGENEN Federsatz. Ob sich einer anlegen laesst, entscheidet hier.
        Abschnitt 'Probe: Federsaetze fuer die Auflager'
        try {
            $sp = $m.SpringParams
            Mitglieder 'MODELL.SpringParams' $sp
            $anz = 0; try { $anz = $sp.Count } catch { }
            Schreib "  vorhandene Federsaetze: $anz"
            for ($i = 1; $i -le [Math]::Min($anz, 40); $i++) {
                $nm = $null
                foreach ($z in 'Name','ItemName') {
                    try { $nm = $sp.$z($i) } catch { }
                    if ($nm) { break }
                }
                Schreib ("      {0,3}  {1}" -f $i, $nm)
            }
            foreach ($g in 'Rigid - Translational','Rigid - Rotational',
                           'Soft - Rotational','Free - Rotational') {
                $ix = $null; try { $ix = $sp.IndexOfName($g) } catch { }
                Schreib ("      IndexOfName('{0}') = {1}" -f $g, $ix)
            }
        } catch { Schreib "  SpringParams nicht lesbar: $($_.Exception.Message)" }

        # --- Einheit der Querschnittsmasse ---------------------------------
        # AddL nimmt sechs Zahlen. Ob mm oder m erwartet wird, WIRFT KEINEN
        # FEHLER - es entsteht still ein tausendfach falscher Querschnitt.
        # Also beide anlegen und die Flaeche zurueckmessen:
        # L 100x100x10 hat A = 19.2 cm2 = 0.00192 m2.
        Abschnitt 'Probe: Querschnittsmasse in mm oder in m?'
        foreach ($v in @(@{ n = 'PROBE_MM'; f = 1.0 }, @{ n = 'PROBE_M'; f = 0.001 })) {
            try {
                $i = $m.CrossSections.AddL($v.n, 100 * $v.f, 100 * $v.f, 10 * $v.f,
                                           10 * $v.f, 0, 0, 0)
                Schreib "  $($v.n) angelegt als Nummer $i"
                $cs = $m.CrossSections.Item($i)
                foreach ($f in 'A','Ax','Ay','Az','Ix','Iy','Iz','It','h','b') {
                    $w = $null; try { $w = $cs.$f } catch { }
                    if ($null -ne $w) { Schreib ("      {0,-6} {1}" -f $f, $w) }
                }
                if ($v.n -eq 'PROBE_MM') { try { Mitglieder 'QUERSCHNITT' $cs } catch { } }
            } catch { Schreib "  $($v.n): $($_.Exception.Message)" }
        }
        Schreib '  Erwartet fuer L 100x100x10:  A = 0.00192 m2'
    } else {
        Schreib ''
        Schreib '  OHNE die Typbibliothek geht es nicht weiter - Lines, Auflager'
        Schreib '  und saemtliche Lasten nehmen Verbund-Typen.'
    }

    try { $app.Models.Delete($idx) } catch { }
    try { $app.Quit() } catch { }
    $zeilen | Set-Content -Path $bericht -Encoding UTF8
    Write-Host ''; Write-Host "Bericht: $bericht"
    Write-Host 'Diese Datei zurueckschicken.'
    Read-Host "`nWeiter mit Enter"
    exit 0
}


<#  STAND DES BAUWEGS.
    Der Bericht vom 2026-08-21 (AxisVM 18 r1m De) zeigt: Material, Quer-
    schnitte, Knoten und Lastfaelle nehmen einfache Zahlen und tragen. Staebe,
    Auflager und SAEMTLICHE Lasten nehmen dagegen Verbund-Typen -
    Lines.Add(i, j, ELineGeomType, RLineGeomData), AddNodalGlobal_V153(
    RNodalSupportSpringParams, int), AddBeamDistributed(RLoadBeamDistributed).
    Die braucht es frueh gebunden, ueber die Typbibliothek.

    Bauen wir trotzdem los, so stehen nach kurzer Zeit 607 Knoten in einem
    Modell, das bei Schritt 6 abbricht und nichts traegt. Deshalb der Riegel:
    erst messen, dann bauen.                                               #>
if (-not $NurPruefen) {
    Beenden 10 ('Der Bauweg ist noch nicht anschlussfaehig. Staebe, Auflager ' +
                'und Lasten nehmen Verbund-Typen, die erst ueber die Typ- ' +
                'bibliothek angelegt werden muessen. Bitte AxisVM_pruefen.cmd ' +
                'laufen lassen und den Bericht zurueckschicken.')
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
