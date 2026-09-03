# ---------------------------------------------------------------------------
# WAS IST EINE AxisVMPolygon2dList - UND LAESST SICH EINE BAUEN?
#
# Die Gabel am Jochende ist zwei UPE nebeneinander, GLEICHSINNIG: der Flansch
# des Gurtes stoesst an den Steg der Aufdoppelung (Schnitt A-A, 45-Grad-Naht).
# Kein parametrischer Querschnitt der Typbibliothek trifft das - AddDoubleU
# kennt nur "opened" (Ruecken an Ruecken) und "closed" (Oeffnungen zueinander),
# beide symmetrisch.
#
# Vorgabe des Auftraggebers vom 4. September: "den querschnitt sauber in axis
# aufbauen nicht ueber kennwerte modifizieren." Damit bleibt AddCustom, und
# das nimmt eine AxisVMPolygon2dList. Wie die aussieht, steht in keiner der
# erfassten Signaturen - also wird sie gemessen.
#
# Gemessen wird an einem Querschnitt, den AxisVM SELBST gebaut hat: ein
# UPE 160 ueber AddU. Seine ShapePolygonList ist die Vorlage, aus der sich
# ablesen laesst, wie eine eigene zu fuellen waere.
#
# Es wird NICHTS gebaut und nichts gerechnet - nur gelesen und berichtet.
# ---------------------------------------------------------------------------
param([switch]$Sichtbar)

$ErrorActionPreference = 'Stop'
$zeilen = New-Object System.Collections.Generic.List[string]
function Schreib([string]$t) { Write-Host $t; $zeilen.Add($t) }
function Abschnitt([string]$t) {
    Schreib ''; Schreib ('-' * 78); Schreib $t; Schreib ('-' * 78)
}

$bericht = Join-Path $PSScriptRoot 'AxisVM_querschnitt_bericht.txt'

Abschnitt 'COM-Server'
try {
    $app = New-Object -ComObject 'AxisVM.AxisVMApplication'
} catch {
    Schreib "Kein COM-Server: $($_.Exception.Message)"
    $zeilen | Set-Content -LiteralPath $bericht -Encoding ASCII
    exit 1
}
# NICHT JEDE FASSUNG KENNT JEDE EIGENSCHAFT. Ein fehlendes AskCloseAll darf
# den Messlauf nicht abbrechen - gemessen werden soll der Querschnitt.
foreach ($e in @(@{n='Visible'; v=$(if ($Sichtbar) { 1 } else { 0 })},
                 @{n='AskSaveOnLastReleased'; v=0},
                 @{n='AskCloseOnLastReleased'; v=0},
                 @{n='CloseOnLastReleased'; v=1})) {
    try { $app.($e.n) = $e.v } catch { Schreib "  ($($e.n) gibt es nicht)" }
}
Schreib "  AxisVM laeuft"

$m = $app.Models.Item($app.Models.New())
Schreib "  Modell angelegt"

# --- Erst das Material -----------------------------------------------------
# ZWEI STOLPERSTELLEN, BEIDE IM AUFBAUSKRIPT SCHON VERMESSEN:
#   1. Ohne Material weist AxisVM jeden Querschnitt ab (-100002).
#   2. Die Masse kommen in METERN, nicht in Millimetern - $mm = 0.001.
Abschnitt 'Material'
# ndcEuroCode = 2, nicht 4 - die Zahl steht im Aufbauskript, aus der
# Typbibliothek gelesen. Der Name traegt ein Leerzeichen: 'S 235'.
$matNr = 0
foreach ($nc in @(2, 8, 7)) {
    foreach ($nm in @('S 235', 'S235')) {
        try { $matNr = $m.Materials.AddFromCatalog($nc, $nm) } catch { $matNr = 0 }
        if ($matNr -gt 0) { Schreib "  Material '$nm' (Katalog $nc) -> $matNr"; break }
    }
    if ($matNr -gt 0) { break }
}
if ($matNr -le 0) { Schreib '  WARNUNG: kein Material - AddU kann scheitern.' }

# --- Ein UPE 160, von AxisVM selbst gebaut ---------------------------------
Abschnitt 'Ein UPE 160 ueber AddU'
$mm = 0.001
$nr = $m.CrossSections.AddU('UPE160', 160 * $mm, 70 * $mm, 9.5 * $mm,
                            5.5 * $mm, 10 * $mm, 0)   # cspOther = 0, NICHT 2
# Die Konstanten stehen im Aufbauskript, aus der Typbibliothek gelesen:
#   cspOther = 0, cspRolled = 1. Mit 2 meldet AddU -100002.
Schreib "  AddU meldet $nr"
if ($nr -le 0) {
    Schreib '  ABBRUCH: der Querschnitt kam nicht zustande.'
    $zeilen | Set-Content -LiteralPath $bericht -Encoding ASCII
    # AUCH BEIM ABBRUCH FREIGEBEN. Sonst bleibt AxisVM stehen, und der
    # naechste Lauf haengt sich daran auf - teuer gelernt am 3. September.
    $m = $null; $qs = $null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null
    $app = $null; [System.GC]::Collect()
    exit 2
}
$qs = $m.CrossSections.Item($nr)
Schreib ("  A = {0:N6} m2   Iy = {1:N8}   Iz = {2:N8}" -f $qs.Ax, $qs.Iy, $qs.Iz)

# --- Seine Polygonliste ----------------------------------------------------
Abschnitt 'ShapePolygonList - was ist das fuer ein Ding?'
$pl = $null
try { $pl = $qs.ShapePolygonList } catch {
    Schreib "  Zugriff scheiterte: $($_.Exception.Message)"
}
if ($null -eq $pl) {
    Schreib '  Die Liste ist leer - AddU legt offenbar kein Polygon ab.'
} else {
    Schreib "  Typ: $($pl.GetType().FullName)"
    Schreib "  IsArray: $($pl.GetType().IsArray)"
    if ($pl.GetType().IsArray) {
        Schreib "  Laenge: $($pl.Length)"
        if ($pl.Length -gt 0) {
            $e = $pl[0]
            Schreib "  Element 0 Typ: $($e.GetType().FullName)"
            Schreib '  Mitglieder von Element 0:'
            foreach ($mem in ($e | Get-Member | Sort-Object Name)) {
                Schreib ("    {0,-28} {1}" -f $mem.Name, $mem.MemberType)
            }
            # Die Felder mit ihren Werten - so weit sie sich lesen lassen.
            Schreib '  Werte:'
            foreach ($f in ($e | Get-Member -MemberType Property | Sort-Object Name)) {
                $v = $null
                try { $v = $e.($f.Name) } catch { $v = "<$($_.Exception.Message)>" }
                if ($null -ne $v -and $v.GetType().IsArray) {
                    Schreib ("    {0,-24} Array[{1}]" -f $f.Name, $v.Length)
                    for ($i = 0; $i -lt [Math]::Min(6, $v.Length); $i++) {
                        $p = $v[$i]
                        $txt = try { ("x={0} y={1}" -f $p.x, $p.y) } catch { "$p" }
                        Schreib ("      [{0}] {1}" -f $i, $txt)
                    }
                } else {
                    Schreib ("    {0,-24} {1}" -f $f.Name, $v)
                }
            }
        }
    } else {
        Schreib '  Mitglieder:'
        foreach ($mem in ($pl | Get-Member | Sort-Object Name)) {
            Schreib ("    {0,-28} {1}" -f $mem.Name, $mem.MemberType)
        }
        Schreib "  Count = $($pl.Count)"
        # --- Was ist ein einzelnes Polygon? --------------------------------
        for ($k = 1; $k -le [Math]::Min(2, $pl.Count); $k++) {
            $pg = $null
            try { $pg = $pl.Item($k) } catch { Schreib "  Item($k) warf: $($_.Exception.Message)" }
            if ($null -eq $pg) { continue }
            Schreib ""
            Schreib "  --- Polygon $k ---"
            Schreib "  Typ: $($pg.GetType().FullName)"
            foreach ($mem in ($pg | Get-Member | Sort-Object Name)) {
                Schreib ("    {0,-28} {1}" -f $mem.Name, $mem.MemberType)
            }
            foreach ($f in ($pg | Get-Member -MemberType Property | Sort-Object Name)) {
                $v = $null
                try { $v = $pg.($f.Name) } catch { $v = '<nicht lesbar>' }
                Schreib ("    {0,-24} = {1}" -f $f.Name, $v)
            }
            # Die Punkte, so weit sie sich zaehlen und lesen lassen.
            $anz = 0
            try { $anz = $pg.Count } catch { }
            if ($anz -gt 0) {
                Schreib "    Punkte ($anz):"
                for ($i = 1; $i -le [Math]::Min(12, $anz); $i++) {
                    try {
                        $pt = $pg.Item($i)
                        $t = ($pt | Get-Member -MemberType Property |
                              ForEach-Object { "$($_.Name)=$($pt.($_.Name))" }) -join '  '
                        Schreib ("      [{0}] {1}" -f $i, $t)
                    } catch { Schreib "      [$i] <$($_.Exception.Message)>" }
                }
            }
        }
    }
}

# --- Laesst sich eine eigene Liste bauen? ----------------------------------
Abschnitt 'Eine eigene Liste - geht das ueberhaupt?'
Schreib '  Versuch: dieselbe Liste unveraendert an AddCustom zurueckgeben.'
Schreib '  Gelingt das, ist der Weg offen: Punkte verschieben, zweites'
Schreib '  Polygon anhaengen, und der Verbund steht als echter Querschnitt.'
if ($null -ne $pl) {
    try {
        $neu = $m.CrossSections.AddCustom('PROBE', $pl, 0)
        Schreib "  AddCustom meldet $neu"
        if ($neu -gt 0) {
            $q2 = $m.CrossSections.Item($neu)
            Schreib ("  A = {0:N6} m2   Iy = {1:N8}   Iz = {2:N8}" -f $q2.Ax, $q2.Iy, $q2.Iz)
            Schreib '  >>> Der Weg traegt: AddCustom nimmt die Liste an.'
        } else {
            Schreib '  >>> AddCustom hat abgelehnt (Rueckgabe nicht positiv).'
        }
    } catch {
        Schreib "  AddCustom warf: $($_.Exception.Message)"
    }
} else {
    Schreib '  Entfaellt - es gibt keine Liste zum Zurueckgeben.'
}

Abschnitt 'Fertig'
Schreib "  Bericht: $bericht"
$zeilen | Set-Content -LiteralPath $bericht -Encoding ASCII
$m = $null; $qs = $null; $pl = $null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null
$app = $null
[System.GC]::Collect()
