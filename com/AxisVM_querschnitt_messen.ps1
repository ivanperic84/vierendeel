# ---------------------------------------------------------------------------
# DER VERBUNDQUERSCHNITT DER GABEL - SAUBER IN AXISVM AUFGEBAUT.
#
# Die Gabel am Jochende ist zwei UPE nebeneinander, GLEICHSINNIG: der Flansch
# des Gurtes stoesst an den Steg der Aufdoppelung (Schnitt A-A, 45-Grad-Naht).
# Kein parametrischer Querschnitt trifft das - AddDoubleU kennt nur "opened"
# (Ruecken an Ruecken) und "closed" (Oeffnungen zueinander), beide symmetrisch.
#
# Vorgabe des Auftraggebers vom 4. September: "den querschnitt sauber in axis
# aufbauen nicht ueber kennwerte modifizieren." Damit bleibt AddCustom.
#
# GEMESSEN, NICHT GERATEN - die stehende Regel des Projekts. Der erste Lauf
# ergab:
#
#   ShapePolygonList   Add, Clear, Count, Delete, Item
#   ein Polygon        AddLine, BulkGetLineData, Hole, Line, LineCount
#   eine Linie         GetPoint, SetPoint, GetLinePoints, SetLinePoints,
#                      LineType, CircleArcOrientation
#   AddCustom          nimmt die Liste an und baut denselben Querschnitt
#
# Was fehlte: GetPoint braucht einen VERBUND-TYP als out-Parameter, und den
# gibt es erst mit der Interop-Baugruppe. Die wird hier zur Laufzeit aus der
# Typbibliothek erzeugt - derselbe Weg wie im Aufbauskript.
#
# DIE PROBE STEHT FEST. Der Auftraggeber hat den Verbund im
# Querschnittsmodul gebaut und gemessen:
#
#   A = 4334.70 mm2   Iy = 1.8222E+7   Iz = 7446516   y_G = 35.0 mm
#
# Trifft der aufgebaute Querschnitt diese Zahlen, ist er richtig.
#
# Es wird nichts gerechnet und nichts gespeichert.
# ---------------------------------------------------------------------------
param([switch]$Sichtbar)

$ErrorActionPreference = 'Stop'
$zeilen = New-Object System.Collections.Generic.List[string]
function Schreib([string]$t) { Write-Host $t; $zeilen.Add($t) }
function Abschnitt([string]$t) {
    Schreib ''; Schreib ('-' * 78); Schreib $t; Schreib ('-' * 78)
}
$bericht = Join-Path $PSScriptRoot 'AxisVM_querschnitt_bericht.txt'

# AUCH BEIM ABBRUCH FREIGEBEN. Sonst bleibt AxisVM stehen, und der naechste
# Lauf haengt sich daran auf - teuer gelernt am 3. September.
function Schluss([int]$code) {
    Schreib ''
    Schreib "  Bericht: $bericht"
    $zeilen | Set-Content -LiteralPath $bericht -Encoding ASCII
    if ($null -ne $script:app) {
        try {
            [System.Runtime.InteropServices.Marshal]::ReleaseComObject($script:app) | Out-Null
        } catch { }
        $script:app = $null
        [System.GC]::Collect()
    }
    exit $code
}

# --- Die Typbibliothek, wie im Aufbauskript --------------------------------
if (-not ('TlbHilfe1' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Reflection;
using System.Runtime.InteropServices;
public class TlbSenke1 : ITypeLibImporterNotifySink {
    public void ReportEvent(ImporterEventKind k, int c, string m) { }
    public Assembly ResolveRef(object tl) { return null; }
}
public class TlbHilfe1 {
    // Ohne [MarshalAs(UnmanagedType.Interface)] nimmt .NET eine VARIANT an,
    // und LoadTypeLibEx scheitert mit DISP_E_BADVARTYPE.
    [DllImport("oleaut32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
    public static extern void LoadTypeLibEx(string datei, int art,
        [MarshalAs(UnmanagedType.Interface)] out object tlb);
}
'@
}

Abschnitt 'COM-Server'
$script:app = $null
try { $script:app = New-Object -ComObject 'AxisVM.AxisVMApplication' }
catch { Schreib "Kein COM-Server: $($_.Exception.Message)"; Schluss 1 }
foreach ($e in @(@{n='Visible'; v=$(if ($Sichtbar) { 1 } else { 0 })},
                 @{n='AskSaveOnLastReleased'; v=0},
                 @{n='AskCloseOnLastReleased'; v=0},
                 @{n='CloseOnLastReleased'; v=1})) {
    try { $script:app.($e.n) = $e.v } catch { }
}
$m = $script:app.Models.Item($script:app.Models.New())
Schreib '  AxisVM laeuft, Modell angelegt'

Abschnitt 'Typbibliothek'
$asm = $null
$p = (Get-Process -Name 'AxisVM*' | Where-Object { $_.Path } |
      Select-Object -First 1).Path
if (-not $p) { Schreib '  Kein Prozesspfad.'; Schluss 3 }
Schreib "  $p"
$tlb = $null
try { [TlbHilfe1]::LoadTypeLibEx($p, 2, [ref]$tlb) }
catch { Schreib "  LoadTypeLibEx warf: $($_.Exception.Message)"; Schluss 3 }
try {
    $wandler = New-Object System.Runtime.InteropServices.TypeLibConverter
    $asm = $wandler.ConvertTypeLibToAssembly($tlb, 'Interop.AxisVM.dll', 0,
                                             (New-Object TlbSenke1), $null, $null,
                                             'AxisVM', $null)
    Schreib "  Baugruppe: $($asm.GetTypes().Count) Typen"
} catch { Schreib "  Umwandlung scheiterte: $($_.Exception.Message)"; Schluss 3 }

$alle = $asm.GetTypes()
$tPunkt = $alle | Where-Object { $_.Name -eq 'RPoint2d' } | Select-Object -First 1
if (-not $tPunkt) {
    $tPunkt = $alle | Where-Object { $_.Name -like 'RPoint2*' } | Select-Object -First 1
}
if ($tPunkt) {
    Schreib "  Punkt-Typ: $($tPunkt.FullName)"
    foreach ($f in $tPunkt.GetFields()) {
        Schreib ("    {0,-10} {1}" -f $f.Name, $f.FieldType.Name)
    }
} else {
    Schreib '  KEIN RPoint2d in der Baugruppe. Was es gibt:'
    $alle | Where-Object { $_.Name -like '*Point*' } |
        ForEach-Object { Schreib "    $($_.Name)" }
    Schluss 3
}

# --- DIE SIGNATUREN, SCHWARZ AUF WEISS -------------------------------------
# Die Baugruppe kennt sie; raten waere hier besonders teuer, weil ein
# falscher Aufruf keine Fehlermeldung gibt, sondern eine Ueberladungssuche.
Abschnitt 'Signaturen von Polygon2dList und Polygon2d'
foreach ($nm in @('IAxisVMPolygon2dList', 'IAxisVMPolygon2d', 'IAxisVMPolygon2dLine')) {
    $t = $alle | Where-Object { $_.Name -eq $nm } | Select-Object -First 1
    if (-not $t) { Schreib "  $nm - nicht in der Baugruppe"; continue }
    Schreib "  $($t.FullName)"
    foreach ($mi in ($t.GetMethods() | Sort-Object Name)) {
        $ps = ($mi.GetParameters() | ForEach-Object {
                 $r = if ($_.ParameterType.IsByRef) { 'ref ' } else { '' }
                 "$r$($_.ParameterType.Name) $($_.Name)" }) -join ', '
        Schreib ("    {0} {1}({2})" -f $mi.ReturnType.Name, $mi.Name, $ps)
    }
}

# --- Material und ein UPE 160 ----------------------------------------------
Abschnitt 'Ein UPE 160 als Vorlage'
$matNr = 0
foreach ($nc in @(2, 8, 7)) {
    foreach ($nm in @('S 235', 'S235')) {
        try { $matNr = $m.Materials.AddFromCatalog($nc, $nm) } catch { $matNr = 0 }
        if ($matNr -gt 0) { break }
    }
    if ($matNr -gt 0) { break }
}
Schreib "  Material -> $matNr"
# cspOther = 0 (NICHT 2 - mit 2 meldet AddU -100002), Masse in METERN.
$mm = 0.001
# >>> DIE REIHENFOLGE VON e UND tw - HIER ENTSCHEIDET SIE SICH. <<<
# Beide Belegungen werden gebaut und an ihrem I_y gemessen. Der Sollwert
# steht in der Profilnorm: UPE 160 hat I_y = 911.1 cm4 = 9'111'000 mm4.
foreach ($v in @(@{n='e=tf(9.5), tw=tw(5.5)'; a=9.5; b=5.5},
                 @{n='e=tw(5.5), tw=tf(9.5)'; a=5.5; b=9.5})) {
    $t = $m.CrossSections.AddU("PROBE_$($v.a)", 160 * $mm, 70 * $mm,
                               $v.a * $mm, $v.b * $mm, 10 * $mm, 0)
    if ($t -gt 0) {
        $qt = $m.CrossSections.Item($t)
        Schreib ("    {0,-24} A = {1,8:N1}   Iy = {2,10:N0}   Iz = {3,9:N0}" -f
                 $v.n, ($qt.Ax * 1e6), ($qt.Iy * 1e12), ($qt.Iz * 1e12))
    } else { Schreib "    $($v.n) -> AddU meldet $t" }
}
Schreib '    Soll (Profilnorm)         A =  2167.0   Iy =  9111000   Iz =  1068300'
# Genommen wird die Belegung, die I_y trifft.
$nr = $m.CrossSections.AddU('UPE160', 160 * $mm, 70 * $mm, 5.5 * $mm,
                            9.5 * $mm, 10 * $mm, 0)
if ($nr -le 0) { Schreib "  AddU meldet $nr - Abbruch."; Schluss 2 }
$qs = $m.CrossSections.Item($nr)
Schreib ("  A = {0:N2} mm2   Iy = {1:N0}   Iz = {2:N0}" -f
         ($qs.Ax * 1e6), ($qs.Iy * 1e12), ($qs.Iz * 1e12))

# --- Die Linien des Polygons lesen -----------------------------------------
Abschnitt 'Die Linien - mit dem Verbund-Typ als out-Parameter'
$pl = $qs.ShapePolygonList
$pg = $pl.Item(1)
Schreib "  LineCount = $($pg.LineCount), Hole = $($pg.Hole)"
$punkte = New-Object System.Collections.Generic.List[object]
for ($i = 1; $i -le $pg.LineCount; $i++) {
    $ln = $pg.Line($i)
    $a = [Activator]::CreateInstance($tPunkt)
    $b = [Activator]::CreateInstance($tPunkt)
    $ok = $false
    # Zwei Schreibweisen kommen in Frage - die tragende wird genommen.
    try { $null = $ln.GetLinePoints([ref]$a, [ref]$b); $ok = $true } catch { }
    if (-not $ok) {
        try {
            $null = $ln.GetPoint(1, [ref]$a)
            $null = $ln.GetPoint(2, [ref]$b)
            $ok = $true
        } catch { }
    }
    if ($ok) {
        # RPoint2d heisst Coord1/Coord2, nicht x/y - gemessen am 4. September.
        $punkte.Add(@{ ax = $a.Coord1; ay = $a.Coord2
                       bx = $b.Coord1; by = $b.Coord2 })
        Schreib ("    [{0}] ({1,9:N4} {2,9:N4}) -> ({3,9:N4} {4,9:N4})" -f
                 $i, $a.Coord1, $a.Coord2, $b.Coord1, $b.Coord2)
    } else {
        if ($i -eq 1) { Schreib '    Keine der beiden Schreibweisen traegt.' }
        break
    }
}
if ($punkte.Count -eq 0) { Schreib '  Die Linien liessen sich nicht lesen.'; Schluss 4 }

# --- Das zweite Polygon: ein zweiter UPE, verschoben -----------------------
# ADD UND ADDLINE NEHMEN OBJEKTE, KEINE WERTE:
#   Int32 Add(AxisVMPolygon2d Polygon)
#   Int32 AddLine(AxisVMLine2d Line)
# Ein Polygon2d laesst sich nicht einfach erzeugen - aber AxisVM baut eines,
# sobald ein Querschnitt entsteht. Also: einen ZWEITEN UPE anlegen, dessen
# Polygon um die Flanschbreite verschieben und der ersten Liste anhaengen.
Abschnitt 'Der Verbund: zweiter UPE, verschoben und angehaengt'
$b_m = 70 * $mm
$nr2 = $m.CrossSections.AddU('UPE160_2', 160 * $mm, 70 * $mm, 9.5 * $mm,
                             5.5 * $mm, 10 * $mm, 0)
if ($nr2 -le 0) { Schreib "  Zweites AddU meldet $nr2 - Abbruch."; Schluss 5 }
$qs2 = $m.CrossSections.Item($nr2)
$pg2 = $qs2.ShapePolygonList.Item(1)
Schreib "  Zweites Polygon: LineCount = $($pg2.LineCount)"

$verschoben = 0
for ($i = 1; $i -le $pg2.LineCount; $i++) {
    $ln = $pg2.Line($i)
    $a = [Activator]::CreateInstance($tPunkt)
    $b = [Activator]::CreateInstance($tPunkt)
    $gelesen = $false
    try { $null = $ln.GetLinePoints([ref]$a, [ref]$b); $gelesen = $true } catch { }
    if (-not $gelesen) {
        try { $null = $ln.GetPoint(1, [ref]$a); $null = $ln.GetPoint(2, [ref]$b)
              $gelesen = $true } catch { }
    }
    if (-not $gelesen) { Schreib "  Linie $i nicht lesbar."; break }
    $a.Coord1 = $a.Coord1 + $b_m
    $b.Coord1 = $b.Coord1 + $b_m
    $gesetzt = $false
    try { $null = $ln.SetLinePoints($a, $b); $gesetzt = $true } catch { }
    if (-not $gesetzt) {
        try { $null = $ln.SetPoint(1, $a); $null = $ln.SetPoint(2, $b)
              $gesetzt = $true } catch {
            if ($i -eq 1) { Schreib "  SetPoint warf: $($_.Exception.Message)" }
        }
    }
    if ($gesetzt) { $verschoben++ }
    if ($i -eq 1) {
        Schreib ("    Linie 1 jetzt ({0,8:N4} {1,8:N4}) -> ({2,8:N4} {3,8:N4})" -f
                 $a.Coord1, $a.Coord2, $b.Coord1, $b.Coord2)
    }
}
Schreib "  $verschoben Linien verschoben"

# >>> DIE GELESENE LISTE IST SCHREIBGESCHUETZT. <<<
# ShapePolygonList steht in der Typbibliothek als {get}: Add meldet -1, und
# AddLine laesst LineCount unveraendert. Gebaut wird deshalb eine EIGENE
# Liste aus den CoClasses der Baugruppe, gefuellt mit eigenen Polygonen und
# eigenen Linien.
Abschnitt 'Eine eigene Liste aus den CoClasses'
$kListe = $alle | Where-Object { $_.Name -eq 'AxisVMPolygon2dListClass' } | Select-Object -First 1
$kPoly  = $alle | Where-Object { $_.Name -eq 'AxisVMPolygon2dClass' } | Select-Object -First 1
$kLinie = $alle | Where-Object { $_.Name -like 'AxisVMLine2d*Class' } | Select-Object -First 1
Schreib "  Liste:   $($kListe.Name)"
Schreib "  Polygon: $($kPoly.Name)"
Schreib "  Linie:   $(if ($kLinie) { $kLinie.Name } else { '<keine CoClass>' })"
if (-not $kLinie) {
    $alle | Where-Object { $_.Name -like '*Line2d*' } |
        ForEach-Object { Schreib "    (gefunden: $($_.Name))" }
}

# Die Kontur des Verbunds: die acht Linien des UPE, einmal an Ort und einmal
# um die Flanschbreite versetzt.
$b_m = 70 * $mm
$konturen = @($punkte, ($punkte | ForEach-Object {
    @{ ax = $_.ax + $b_m; ay = $_.ay; bx = $_.bx + $b_m; by = $_.by } }))

$liste = $null
try { $liste = [Activator]::CreateInstance($kListe) }
catch { Schreib "  Liste: $($_.Exception.Message)" }
$fertig = 0
if ($liste -and $kLinie) {
    foreach ($kont in $konturen) {
        $poly = [Activator]::CreateInstance($kPoly)
        $n3 = 0
        foreach ($pkt in $kont) {
            $li = [Activator]::CreateInstance($kLinie)
            $a3 = [Activator]::CreateInstance($tPunkt)
            $b3 = [Activator]::CreateInstance($tPunkt)
            $a3.Coord1 = $pkt.ax; $a3.Coord2 = $pkt.ay
            $b3.Coord1 = $pkt.bx; $b3.Coord2 = $pkt.by
            $gesetzt = $false
            try { $null = $li.SetLinePoints($a3, $b3); $gesetzt = $true } catch { }
            if (-not $gesetzt) {
                try { $null = $li.SetPoint(1, $a3); $null = $li.SetPoint(2, $b3)
                      $gesetzt = $true } catch {
                    if ($n3 -eq 0) { Schreib "  SetLinePoints/SetPoint: $($_.Exception.Message)" }
                }
            }
            if (-not $gesetzt) { break }
            try { $li.LineType = 0 } catch { }
            try { $null = $poly.AddLine($li); $n3++ } catch {
                if ($n3 -eq 0) { Schreib "  AddLine: $($_.Exception.Message)" }
                break
            }
        }
        Schreib "    Polygon mit $n3 Linien (LineCount = $($poly.LineCount))"
        if ($n3 -gt 0) {
            try {
                $r3 = $liste.Add($poly)
                Schreib "    Add meldet $r3, Count = $($liste.Count)"
                if ($r3 -gt 0) { $fertig++ }
            } catch { Schreib "    Add warf: $($_.Exception.Message)" }
        }
    }
}
if ($fertig -eq 2) { $pl = $liste }
else { Schreib '  Die eigene Liste kam nicht zustande - die Probe faellt auf den Einzelquerschnitt zurueck.' }

Abschnitt 'AddCustom - und die Probe'
$neu = 0
try { $neu = $m.CrossSections.AddCustom('GABEL_UPE160', $pl, 0) }
catch { Schreib "  AddCustom warf: $($_.Exception.Message)" }
if ($neu -gt 0) {
    $q2 = $m.CrossSections.Item($neu)
    $A = $q2.Ax * 1e6; $Iy = $q2.Iy * 1e12; $Iz = $q2.Iz * 1e12
    Schreib ("  A  = {0,12:N2} mm2    soll  4334.70" -f $A)
    Schreib ("  Iy = {0,12:N0} mm4    soll 18222000" -f $Iy)
    Schreib ("  Iz = {0,12:N0} mm4    soll  7446516" -f $Iz)
    $gut = ([Math]::Abs($A - 4334.70) / 4334.70 -lt 0.02) -and
           ([Math]::Abs($Iz - 7446516) / 7446516 -lt 0.02)
    if ($gut) { Schreib '  >>> TRIFFT. Der Verbund steht als echter Querschnitt.' }
    else { Schreib '  >>> Weicht ab - die Lage des zweiten Polygons stimmt nicht.' }
} else {
    Schreib "  AddCustom meldet $neu"
}
Schluss 0
