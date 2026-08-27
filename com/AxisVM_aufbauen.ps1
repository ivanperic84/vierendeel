<#
    AxisVM_aufbauen.ps1
    ===========================================================================
    BAUT DAS TRAGJOCH IN AxisVM AUF - ueber die COM-Schnittstelle.

    Gelesen wird die Datei aus "Ausleiten -> JSON fuer die COM-Bruecke"
    (format: "tragjoch-stabmodell"). Geschrieben werden Material,
    Querschnitte, Knoten, Staebe, Auflager, Lastfaelle und Lasten. Gerechnet
    wird NICHT - das bleibt Ihre Entscheidung im Programm.

    GEGEN EINE VERMESSENE SCHNITTSTELLE, NICHT GEGEN EINE VERMUTETE
    Zwei Laeufe auf AxisVM 18 r1m De (2026-08-21/22) haben ergeben, was diese
    Fassung wirklich anbietet. Daraus stammt jede Methode und jede Konstante
    hier - AddL nimmt METER, das Auflager nimmt FEDERZAHLEN, der Verbund-Typ
    geht SPAET GEBUNDEN durch. Nichts davon ist geraten.

    Was NICHT durch Ausprobieren zu klaeren war, wird zurueckgemessen: eine
    Einheitenverwechslung bei den Querschnitten wirft keinen Fehler, sie
    liefert still einen tausendfach falschen Querschnitt. Deshalb liest
    Schritt 4 die Flaeche zurueck und haelt an, wenn sie nicht passt.

    Wo es doch Spielraum gibt, probiert das Skript je Schritt mehrere
    Schreibweisen durch und merkt sich die erste, die traegt. Findet es fuer
    einen Schritt gar nichts, listet es auf, was das Objekt WIRKLICH
    anbietet, und haelt an - statt ein halbes Modell zurueckzulassen.

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
    [switch]$Auslesen,
    [switch]$Rechnen,
    [string]$Zuordnung,
    [string]$Ziel,
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
<#  -Positiv: AxisVM meldet Fehler NICHT als Ausnahme, sondern als
    NEGATIVE ZAHL - die Referenz sagt "if successful the result is > 0".
    Ohne diese Pruefung gilt ein errNotFound als Erfolg und wandert weiter:
    beim ersten Aufbau kam so -102 als Materialnummer in alle 746 Staebe.  #>
function Versuche([string]$schritt, $kandidaten, [switch]$Leise, [switch]$Positiv) {
    foreach ($k in $kandidaten) {
        try {
            $wert = & $k.tu
            if ($Positiv -and (($null -eq $wert) -or ($wert -le 0))) {
                $wie = FehlerName $wert
                throw ("Rueckgabe $wert" + $(if ($wie) { " = $wie" } else { ' - AxisVM meldet so einen Fehler' }))
            }
            if (-not $Leise) { Schreib ("  {0,-34} {1}" -f $schritt, $k.name) }
            $gefunden.Add("$schritt -> $($k.name)")
            return @{ ok = $true; wert = $wert; name = $k.name }
        } catch {
            if (-not $Leise) {
                # NICHT $m nennen: das ist im ganzen Skript das Modell.
                # Die Bloecke sehen zwar ihren eigenen Gueltigkeitsbereich,
                # aber beim Lesen stolpert man darueber.
                $grund = $_.Exception.Message -replace "`r?`n", ' '
                if ($grund.Length -gt 90) { $grund = $grund.Substring(0, 90) + '...' }
                Schreib ("  {0,-34} {1}  ->  {2}" -f '', $k.name, $grund)
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


<#  DIE TYPBIBLIOTHEK.
    AxisVM nimmt die wichtigen Angaben nicht als einzelne Zahlen, sondern als
    Verbund: Lines.Add(i, j, art, RLineGeomData), AddNodalForce(
    RLoadNodalForce), AddNodalGlobal(RStiffnesses, ...). PowerShell kennt
    diese Typen nicht - sie stehen in der Typbibliothek, die in der
    Programmdatei von AxisVM steckt.

    .NET wandelt eine Typbibliothek zur Laufzeit in eine Baugruppe - dasselbe,
    was tlbimp.exe tut, nur ohne SDK. Gemessen am 2026-08-22: 1643 Typen, und
    die so angelegten Verbund-Typen gehen SPAET GEBUNDEN durch. Frueh binden
    muss man also nicht.

    Rueckgabe: die Typen der Baugruppe, oder $null.                        #>
function TypbibliothekLaden {
if (-not ('TlbHilfe0' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Reflection;
using System.Runtime.InteropServices;

public class TlbSenke : ITypeLibImporterNotifySink {
public void ReportEvent(ImporterEventKind k, int c, string m) { }
public Assembly ResolveRef(object tl) { return null; }
}

public class TlbHilfe0 {
// [MarshalAs(UnmanagedType.Interface)] ist der Punkt: ohne das nimmt
// .NET fuer "object" eine VARIANT an, und LoadTypeLibEx scheitert mit
// DISP_E_BADVARTYPE, obwohl der Aufruf selbst richtig ist.
[DllImport("oleaut32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
public static extern void LoadTypeLibEx(string datei, int art,
    [MarshalAs(UnmanagedType.Interface)] out object tlb);

[DllImport("oleaut32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
public static extern void LoadTypeLib(string datei,
    [MarshalAs(UnmanagedType.Interface)] out object tlb);

[DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
public static extern int GetLongPathName(string kurz, StringBuilder lang, int n);
}
'@
}

$exe = $null
$ordner = $null
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

# --- Ordner von AxisVM ansehen ------------------------------------------
# Liegt dort schon eine fertige Interop-Baugruppe oder eine .tlb, so ist
# das der kuerzere Weg als das Uebersetzen zur Laufzeit.
if ($exe) {
    $ordner = Split-Path -Parent $exe
    try {
        $lang = New-Object System.Text.StringBuilder 260
        [void][TlbHilfe0]::GetLongPathName($ordner, $lang, 260)
        if ($lang.Length -gt 0) { $ordner = $lang.ToString() }
    } catch { }
    Schreib "  Ordner: $ordner"
    foreach ($muster in '*.tlb', 'Interop*.dll', 'AxisVM*.dll') {
        $tr = Get-ChildItem -LiteralPath $ordner -Filter $muster -File -ErrorAction SilentlyContinue
        foreach ($t in $tr) { Schreib ("      {0,-44} {1,10:N0} Byte" -f $t.Name, $t.Length) }
    }
}

$asm = $null
if ($exe) {
    <#  DIE TYPBIBLIOTHEK HOLEN.
        Beim ersten Versuch stand hier nur "out object" - und .NET
        marshallt das als VARIANT*, waehrend LoadTypeLibEx einen
        Schnittstellenzeiger ITypeLib** zurueckgibt. Ergebnis:
        DISP_E_BADVARTYPE, "Die angegebene OLE-Variante ist ungueltig".
        Es fehlte allein [MarshalAs(UnmanagedType.Interface)].         #>
    $quellen = @()
    $quellen += @{ name = 'aus der Programmdatei'; pfad = $exe }
    if ($ordner) {
        Get-ChildItem -LiteralPath $ordner -Filter '*.tlb' -File -ErrorAction SilentlyContinue |
            ForEach-Object { $quellen += @{ name = "aus $($_.Name)"; pfad = $_.FullName } }
    }
    # GetNewClosure() haelt $p fest. Ohne das sehen ALLE Bloecke den
    # letzten Schleifenwert - PowerShell bindet Variablen, nicht Werte.
    $kand = @()
    foreach ($q in $quellen) {
        $p = $q.pfad
        $kand += @{ name = "LoadTypeLibEx $($q.name)"; tu = {
            $t = $null; [TlbHilfe0]::LoadTypeLibEx($p, 2, [ref]$t); $t }.GetNewClosure() }
        $kand += @{ name = "LoadTypeLib $($q.name)"; tu = {
            $t = $null; [TlbHilfe0]::LoadTypeLib($p, [ref]$t); $t }.GetNewClosure() }
    }
    $rt = Versuche 'Typbibliothek lesen' $kand
    if ($rt.ok -and $rt.wert) {
        try {
            $wandler = New-Object System.Runtime.InteropServices.TypeLibConverter
            $asm = $wandler.ConvertTypeLibToAssembly(
                $rt.wert, 'Interop.AxisVM.dll', 0, (New-Object TlbSenke),
                $null, $null, 'AxisVM', $null)
            Schreib "  Baugruppe erzeugt: $($asm.GetTypes().Count) Typen."
            $gefunden.Add('Typbibliothek -> Interop-Baugruppe zur Laufzeit')
        } catch {
            Schreib "  Umwandlung fehlgeschlagen: $($_.Exception.Message)"
        }
    }
}

    if (-not $asm) { return $null }
    try { return $asm.GetTypes() }
    catch [Reflection.ReflectionTypeLoadException] {
        return ($_.Exception.Types | Where-Object { $_ })
    }
}

<#  EINEN AUFZAEHLUNGSWERT NACHSCHLAGEN.
    Dieselbe Ueberlegung wie bei FehlerName: was ein Name bedeutet, steht in
    der Typbibliothek, die ohnehin geladen ist. Raten waere hier besonders
    teuer - ein falscher Kombinationstyp wirft keinen Fehler, er legt die
    Kombination nur in die falsche Familie.                                #>
function Aufzaehlung([string]$typ, [string]$name) {
    $t = $script:typen | Where-Object { $_.Name -eq $typ } | Select-Object -First 1
    if (-not $t) { return $null }
    if ([Enum]::GetNames($t) -notcontains $name) { return $null }
    return [int]([Enum]::Parse($t, $name))
}

<#  WAS BEDEUTET -102?
    AxisVM meldet Fehler als negative Zahl. Welche Zahl was heisst, steht
    NICHT in der Anleitung im Netz - aber in der Typbibliothek, die wir
    ohnehin geladen haben. Also nachschlagen statt eine Liste von Hand
    pflegen: sie ist immer die der laufenden Fassung.                     #>
function FehlerName($code) {
    if (($null -eq $code) -or ($code -gt 0)) { return $null }
    $treffer = @()
    foreach ($t in $script:typen) {
        if (-not $t.IsEnum) { continue }
        foreach ($n in [Enum]::GetNames($t)) {
            if ([int]([Enum]::Parse($t, $n)) -eq [int]$code) {
                $treffer += "$($t.Name).$n"
            }
        }
    }
    if ($treffer.Count -eq 0) { return $null }
    return ($treffer -join ', ')
}

<#  DIE PARAMETERNAMEN.
    Get-Member zeigt an einem COM-Objekt nur die TYPEN: AddSteel_EuroCode
    (string, string, string, uint, uint, double, double, ...) - vierzehn
    namenlose Zahlen. Die Interop-Baugruppe kennt dagegen die NAMEN aus der
    Typbibliothek. Damit ist ablesbar, was an welche Stelle gehoert, ohne
    die Referenz aufzuschlagen.                                           #>
function Signaturen([string]$schnittstelle, [string]$beginntMit) {
    $t = $script:typen | Where-Object { $_.Name -eq $schnittstelle } | Select-Object -First 1
    if (-not $t) { Schreib "  $schnittstelle gibt es nicht in der Baugruppe."; return }
    Schreib ''
    Schreib "SIGNATUREN VON $schnittstelle (mit Parameternamen):"
    foreach ($pr in ($t.GetProperties() | Where-Object { $_.Name -like "$beginntMit*" } | Sort-Object Name)) {
        $ps = $pr.GetIndexParameters() | ForEach-Object { "$($_.ParameterType.Name) $($_.Name)" }
        Schreib ("  [Eigenschaft] {0} : {1}{2}" -f $pr.Name, $pr.PropertyType.Name,
                 $(if ($ps) { " [$($ps -join ', ')]" } else { '' }))
    }
    foreach ($mth in ($t.GetMethods() | Where-Object { $_.Name -like "$beginntMit*" } | Sort-Object Name)) {
        $ps = $mth.GetParameters() | ForEach-Object {
            "$($_.ParameterType.Name.TrimEnd('&')) $($_.Name)"
        }
        Schreib "  $($mth.Name)("
        foreach ($p in $ps) { Schreib "      $p" }
        Schreib '  )'
    }
}

<#  GELENK AN EINEM STABENDE.
    Die Haengestuetze haengt, sie klemmt nicht - am Uebergang zum Joch darf
    kein Moment laufen. AxisVM setzt das ueber SetStartReleases(RReleases).

    Wie RReleases im Innern aussieht, ist NICHT vermessen. Statt es
    anzunehmen, wird der Typ zur Laufzeit gelesen: die Drehfelder heissen
    xx, yy, zz, und ihr "frei"-Wert ist der Aufzaehlungswert, dessen Name
    auf Free endet. Findet sich das nicht, sagt die Funktion es - und der
    Bericht nennt die Felder, statt still eine Einspannung zu bauen.

    Rueckgabe: $true, wenn das Gelenk sitzt.                              #>
function GelenkSetzen($linie, [string]$wo, [string]$art) {
    <#  WELCHE FREIHEITSGRADE:
          'M'      alle drei Momente
          'axial'  die STABACHSE, lokal x. Damit uebertraegt der Stab keine
                   Laengskraft. Beim Anschluss der Haengestuetzen sitzt die
                   Freigabe deshalb im Ast des Anschlusskoerpers und nicht
                   im Querstummel: der Ast liegt in der Jochachse, eine
                   Freigabe in der Stabachse ist dort eindeutig.
        Sonst gilt die Zeichenkette als Liste der Felder.

        AUFBAU VON RReleases. Es ist VERSCHACHTELT: die sechs Felder x, y, z,
        xx, yy, zz sind je ein RRelease mit einem Feld ReleaseType. Ein
        blosser Aufzaehlungswert genuegt nicht - so stand es hier zuerst.
        Gesehen im quelloffenen GrasshopperToAxisVM von InterCAD, das den
        Aufbau zeigt; uebernommen ist davon nichts als die Kenntnis, WIE die
        Schnittstelle aussieht.

        Gesetzt werden ALLE sechs Felder: die freien auf rtFree, die
        uebrigen ausdruecklich auf rtRigid. Ein nicht gesetztes Feld traegt
        den Nullwert der Struktur, und was der bedeutet, ist nicht gesagt. #>
    $felder = switch ($art) {
        'M'      { @('xx', 'yy', 'zz') }
        'axial'  { @('x') }
        default  { $art -split '[,\s]+' | Where-Object { $_ } }
    }

    $tRel = $script:typen | Where-Object { $_.Name -eq 'RRelease' } | Select-Object -First 1
    $tArt = $script:typen | Where-Object { $_.Name -eq 'EReleaseType' } | Select-Object -First 1
    if (-not $tRel -or -not $tArt) {
        Schreib '  RRelease oder EReleaseType fehlt in der Typbibliothek.'
        return $false
    }
    <#  DER FREIE WERT HEISST rtHinged, NICHT rtFree.
        Gemessen am 2026-08-22: EReleaseType fuehrt rtRigid, rtHinged,
        rtSemiRigid, rtPlastic, rtPushover. 'Hinged' ist das Gelenk - fuer
        eine Verschiebung heisst das: frei. Die Suche nimmt beide
        Schreibweisen, damit sie auch auf einer anderen Fassung traegt.   #>
    $nFrei  = [Enum]::GetNames($tArt) |
              Where-Object { $_ -match 'Hinged$|Free$|Released$' } | Select-Object -First 1
    $nStarr = [Enum]::GetNames($tArt) | Where-Object { $_ -match 'Rigid$' } | Select-Object -First 1
    if (-not $nFrei -or -not $nStarr) {
        Schreib "  EReleaseType kennt kein Gelenk/Starr - vorhanden: $([Enum]::GetNames($tArt) -join ', ')"
        return $false
    }
    $fArt = $tRel.GetField('ReleaseType')
    if (-not $fArt) {
        Schreib "  RRelease hat kein Feld ReleaseType - vorhanden: $(($tRel.GetFields() | ForEach-Object { $_.Name }) -join ', ')"
        return $false
    }
    $mach = {
        param($name)
        $r = [Activator]::CreateInstance($tRel)
        $fArt.SetValue($r, [Enum]::Parse($tArt, $name))
        $r
    }
    $frei = & $mach $nFrei
    $starr = & $mach $nStarr
    $script:nFreiName = $nFrei

    $rel = NeuerSatz 'RReleases'
    $gesetzt = 0
    foreach ($f in $rel.GetType().GetFields([Reflection.BindingFlags]'Public,Instance')) {
        if ($f.Name -notin 'x', 'y', 'z', 'xx', 'yy', 'zz') { continue }
        if ($f.Name -in $felder) { $f.SetValue($rel, $frei); $gesetzt++ }
        else { $f.SetValue($rel, $starr) }
    }
    if ($gesetzt -lt $felder.Count) {
        Schreib "  RReleases: nur $gesetzt von $($felder.Count) Feldern gesetzt - vorhanden:"
        foreach ($f in $rel.GetType().GetFields([Reflection.BindingFlags]'Public,Instance')) {
            Schreib ("      {0,-16} {1}" -f $f.Name, $f.FieldType.Name)
        }
        return $false
    }
    $r = if ($wo -eq 'Anfang') { $linie.SetStartReleases($rel) }
         else { $linie.SetEndReleases($rel) }
    return ($r -gt 0)
}

<#  Einen Verbund-Typ anlegen. PowerShell setzt Felder auf einem so
    erzeugten Wert unmittelbar - $r.Fx = 1.0 wirkt.                       #>
function NeuerSatz([string]$name) {
    $t = $script:typen | Where-Object { $_.Name -eq $name } | Select-Object -First 1
    if (-not $t) { Beenden 11 "Verbund-Typ $name fehlt in der Typbibliothek." }
    [Activator]::CreateInstance($t)
}

<#  AUFBAU EINES VERBUND-TYPS ZEIGEN. Geschachtelte Saetze werden mit
    ausgeklappt, Aufzaehlungen mit ihren Namen.                           #>
function SatzAufbauT([Type]$t, [int]$tiefe) {
    $ein = '  ' + ('    ' * $tiefe)
    foreach ($f in $t.GetFields([Reflection.BindingFlags]'Public,Instance')) {
        $ft = $f.FieldType
        Schreib ("$ein{0,-22} {1}" -f $f.Name, $ft.Name)
        if ($ft.IsEnum) {
            Schreib ("$ein    = " + (([Enum]::GetNames($ft)) -join ', '))
        } elseif ($ft.IsValueType -and -not $ft.IsPrimitive -and $tiefe -lt 3) {
            SatzAufbauT $ft ($tiefe + 1)
        }
    }
}
function SatzAufbau([string]$name) {
    $t = $script:typen | Where-Object { $_.Name -eq $name } | Select-Object -First 1
    if (-not $t) { Schreib "  Verbund-Typ $name fehlt in der Baugruppe."; return }
    Schreib ''
    Schreib "AUFBAU VON ${name}:"
    SatzAufbauT $t 0
}

<#  EIN FELD TIEF IM SATZ SETZEN.  $r.Point1.x = 1 geht NICHT: PowerShell
    holt sich bei einem Wertetyp eine Kopie, und die Zuweisung landet ins
    Leere. Deshalb ueber Reflexion, und der geaenderte Untersatz wird
    wieder in den Obersatz zurueckgeschrieben.                            #>
function SatzSetzen($satz, [string[]]$pfad, $wert) {
    if ($null -eq $satz) { return $null }   # ein frueherer Schritt ist schiefgegangen
    $f = $satz.GetType().GetField($pfad[0], [Reflection.BindingFlags]'Public,Instance')
    if (-not $f) { return $null }
    if ($pfad.Count -eq 1) {
        $w = if ($f.FieldType.IsEnum) { [Enum]::Parse($f.FieldType, $wert) }
             else { [Convert]::ChangeType($wert, $f.FieldType) }
        $f.SetValue($satz, $w)
    } else {
        $unter = SatzSetzen ($f.GetValue($satz)) ($pfad[1..($pfad.Count - 1)]) $wert
        if ($null -eq $unter) { return $null }
        $f.SetValue($satz, $unter)
    }
    return $satz
}

<#  Alle Pfade zu Gleitkommafeldern sammeln, auch in Untersaetzen.        #>
function ZahlPfade([Type]$t, [string[]]$pfad, [int]$tiefe, $aus) {
    foreach ($f in $t.GetFields([Reflection.BindingFlags]'Public,Instance')) {
        $p = @($pfad) + $f.Name
        $ft = $f.FieldType
        if (($ft -eq [double]) -or ($ft -eq [single])) { [void]$aus.Add(@($p)) }
        elseif ($ft.IsValueType -and -not $ft.IsPrimitive -and -not $ft.IsEnum -and $tiefe -lt 3) {
            ZahlPfade $ft $p ($tiefe + 1) $aus
        }
    }
}



# --- Modelldatei -------------------------------------------------------------
if (-not $Json) {
    $kand = Get-ChildItem -Path $PSScriptRoot -Filter '*.json' -File |
            Where-Object { $_.Name -notlike '*bericht*' }
    if ($kand.Count -eq 1) { $Json = $kand[0].FullName }
    elseif ($kand.Count -eq 0 -and -not $NurPruefen -and -not $Auslesen) {
        Beenden 1 ('Keine Modelldatei gefunden. Die JSON-Datei aus ' +
                   '"Ausleiten -> JSON fuer die COM-Bruecke" neben dieses Skript legen.')
    } elseif (-not $NurPruefen -and -not $Auslesen) {
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

    <#  IST DIE DATEI AUF DEM STAND DES SKRIPTS?

        Die Formatnummer sagt, wie gelesen wird - nicht, was drinsteht. Eine
        Modelldatei aus einer aelteren Fassung des Werkzeugs liest sich
        tadellos und baut sich klaglos auf; dass die Anbauteile darin einzeln
        am Joch hangen statt in einer Kette, sieht man erst im fertigen
        Modell. Genau so ist einmal ein ganzer Durchlauf verloren gegangen -
        gerechnet, ausgelesen, und erst dann fiel es auf.

        Abgebrochen wird NICHT: was aufgebaut wird, bleibt die Entscheidung
        des Auftraggebers. Aber es steht laut da, oben und unten im Bericht.  #>
    $erwarteteMerkmale = @{
        'anbau-kette' = ('Anbauteile in einer Kette (Traeger -> Aufbau -> ' +
                         'Drahtwerk). Fehlt es, haengt im Modell jedes Teil ' +
                         'EINZELN am Joch.')
    }
    $hat = @()
    if ($d.PSObject.Properties.Name -contains 'merkmale' -and $d.merkmale) {
        $hat = @($d.merkmale)
    }
    $fehlt = @($erwarteteMerkmale.Keys | Where-Object { $hat -notcontains $_ })
    if ($fehlt.Count -gt 0) {
        Schreib ''
        Schreib ('!' * 74)
        Schreib 'DIESE MODELLDATEI STAMMT AUS EINER AELTEREN FASSUNG DES WERKZEUGS.'
        foreach ($f in $fehlt) {
            Schreib "  fehlendes Merkmal: $f"
            Schreib "      $($erwarteteMerkmale[$f])"
        }
        Schreib ''
        Schreib '  Neu ausleiten: im Werkzeug die Seite neu laden (Strg+Umschalt+R),'
        Schreib '  dann "Ausleiten -> JSON fuer die COM-Bruecke". Aufgebaut wird'
        Schreib '  trotzdem - was gebaut wird, entscheiden Sie.'
        Schreib ('!' * 74)
        Schreib ''
        $script:alteDatei = $fehlt
    }
    if ($d.tragwerk.verschoben -and $d.tragwerk.verschoben.Count -gt 0) {
        Schreib "  $($d.tragwerk.verschoben.Count) Schnitte wurden zusammengelegt:"
        foreach ($v in $d.tragwerk.verschoben) {
            Schreib ("      x {0,8:N3} -> {1,8:N3}   {2,6:+0.0;-0.0} mm" -f
                     $v.von, $v.nach, $v.betrag_mm)
        }
        Schreib '  So entstehen im Gurt keine Millimeterstuecke mit dem'
        Schreib '  Ersatzquerschnitt - die verdaeben sonst die Kondition.'
    }
    Schreib ("  $($d.tragwerk.bezeichnung)  -  $($d.knoten.Count) Knoten  -  " +
             "$($d.staebe.Count) Staebe  -  $($d.querschnitte.Count) Querschnitte")
    Schreib ("  Einheiten: $($d.einheiten.laenge) / $($d.einheiten.kraft) / " +
             "$($d.einheiten.moment) / Drehfeder $($d.einheiten.drehfeder)")
    if ($d.tragwerk.federArt) {
        Schreib ("  Endeinspannung: $($d.tragwerk.federArt), " +
                 "c_phi = $($d.tragwerk.federGeometrisch_kNm) kNm/rad")
        if ($null -ne $d.tragwerk.federBegrenzt_kNm) {
            Schreib ("    Die Anwendung rechnet ihre eigenen Schnittgroessen mit " +
                     "$($d.tragwerk.federBegrenzt_kNm) kNm/rad -")
            Schreib '    auf die Grenzlast der Gurtverbindung herabgesetzt. Dieses'
            Schreib '    Modell traegt die STEIFERE, geometrische Feder; der'
            Schreib '    Gurtanschluss ist in der Anwendung eigens nachgewiesen.'
        }
    }
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
<#  BEIM AUSLESEN WIRD NICHTS ANGELEGT.
    Das gerechnete Modell steht bereits offen; ein neues waere leer, und
    leere Ergebnisse sehen aus wie Nullen.                                 #>
if ($Auslesen) {
    $r = Versuche 'Offenes Modell nehmen' @(
        @{ name = 'Models.ActiveIndex'; tu = { [int]$app.Models.ActiveIndex } },
        @{ name = 'Models.CurrentIndex'; tu = { [int]$app.Models.CurrentIndex } },
        @{ name = 'Models.Item(1)'; tu = { if ([int]$app.Models.Count -ge 1) { 1 } else { 0 } } }
    ) -Positiv
    if (-not $r.ok) {
        Mitglieder 'Models' $app.Models
        Beenden 2 ('Kein offenes Modell. AxisVM mit dem gerechneten Modell ' +
                   'offen lassen und erneut starten.')
    }
} else {
    $r = Versuche 'Modell anlegen' @(
        @{ name = 'Models.New()';        tu = { $app.Models.New() } },
        @{ name = 'Models.Add()';        tu = { $app.Models.Add() } }
    )
    if (-not $r.ok) { Mitglieder 'Models' $app.Models; Beenden 2 'Kein Modell anlegbar.' }
}
$idx = $r.wert
$m = $app.Models.Item($idx)
Schreib "  Modell $idx"

# --- Typbibliothek -----------------------------------------------------------
Abschnitt 'Typbibliothek'
$typen = TypbibliothekLaden
if (-not $typen) {
    Beenden 11 ('Die Typbibliothek liess sich nicht lesen. Ohne sie sind ' +
                'Staebe, Auflager und Lasten nicht zu setzen.')
}

# =============================================================================
# ZURUECKLESEN - die Schnittgroessen aus dem gerechneten Modell.
#
# WOZU
# Die Anwendung rechnet einen ERSATZBALKEN mit geschlossenen Formeln, AxisVM
# ein STABWERK. Wo die Formeln danebenliegen, sagt nur der Vergleich - und
# der brauchte bisher einen Excel-Export von Hand und ein Skript, das die
# Staebe aus der Geometrie erraten musste. Hier kommen die Zahlen unmittelbar
# aus dem Modell, und die Zuordnung steht fest (AxisVM_zuordnung.json).
#
# GERECHNET WIRD AUCH HIER NICHT.
# Ob und womit gerechnet wird, bleibt die Entscheidung des Auftraggebers im
# Programm. Dieses Skript sieht nach, OB Ergebnisse da sind (GetResultsValid),
# und sagt andernfalls, was zu tun ist.
#
# WAS VERMESSEN IST (2026-08-26, Bericht der Erkundung)
#   Results.Forces.AllLineForcesByLoadCaseId(int[], RLineForceValues[], double[])
#   RLineForceValues: lfvLineType lfvNx lfvVy lfvVz lfvTx lfvMy lfvMz lfvMyD
#   Results.GetResultsValid(EAnalysisType, int, ELongBoolean)
#   Results.ResultCaseOfLoadCase(EAnalysisType, int)
#   EAnalysisType.atLinearStatic = 0
# =============================================================================
<#  DAS ZURUECKLESEN ALS FUNKTION.

    Gebraucht wird es an ZWEI Stellen: allein (-Auslesen, an einem Modell,
    das der Auftraggeber selbst gerechnet hat) und unmittelbar nach einer
    Berechnung im selben Lauf (-Rechnen -Ziel ...).

    Warum das zweite noetig ist: jeder Aufruf von
    New-Object -ComObject 'AxisVM.AxisVMApplication' bringt eine EIGENE
    Instanz hervor. Rechnet man in einem Lauf und liest im naechsten, sitzt
    das Auslesen an einer anderen Instanz - die kennt die gespeicherte
    Datei, also die Geometrie, aber keine Ergebnisse. Genau so ist es
    passiert: 904 Staebe gefunden, 0 Ergebnisfaelle.  #>
function Lies-Schnittgroessen {
    param($m, $zielDatei)
    Abschnitt 'Zurueckleisen - Schnittgroessen aus dem Modell'

    # --- Die Zuordnung ------------------------------------------------------
    $zuDatei = if ($Zuordnung) { $Zuordnung }
               else { Join-Path $PSScriptRoot 'AxisVM_zuordnung.json' }
    if (-not (Test-Path -LiteralPath $zuDatei)) {
        Beenden 20 ("Es fehlt $zuDatei. Sie entsteht beim Aufbau " +
                    '(AxisVM_aufbauen.cmd) und sagt, welche Linie welcher Stab ist.')
    }
    $zu = Get-Content -LiteralPath $zuDatei -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($zu.format -ne 'tragjoch-axisvm-zuordnung') {
        Beenden 20 "Die Zuordnung hat das Format '$($zu.format)'."
    }
    $stabVon = @{}          # LinienNummer -> Stabname
    foreach ($n in $zu.staebe.PSObject.Properties.Name) {
        $stabVon[[int]$zu.staebe.$n.id] = $n
    }
    Schreib "  Zuordnung: $zuDatei"
    Schreib ("    {0}  -  {1} Staebe, {2} Lastfaelle" -f
             $zu.tragwerk, $stabVon.Count, @($zu.lastfaelle.PSObject.Properties).Count)

    # --- Wurde gerechnet? ---------------------------------------------------
    # Zuerst diese Frage. Ohne Ergebnisse liefern die Leseaufrufe Nullen, und
    # Nullen sehen aus wie ein Ergebnis.
    $atLinear = Aufzaehlung 'EAnalysisType' 'atLinearStatic'
    if ($null -eq $atLinear) { $atLinear = 0 }
    $res = $null
    try { $res = $m.Results } catch { }
    if (-not $res) { Beenden 21 'MODELL.Results ist nicht erreichbar.' }

    $anzFaelle = -1
    try { $anzFaelle = [int]$res.ResultCaseCount($atLinear) } catch { }
    Schreib "  Ergebnisfaelle (linear statisch): $anzFaelle"
    if ($anzFaelle -le 0) {
        Beenden 22 ('Es liegen keine Ergebnisse vor. In AxisVM rechnen lassen ' +
                    '(Linear statisch), dann dieses Skript erneut starten. ' +
                    'Gerechnet wird hier bewusst nicht.')
    }

    # --- Je Lastfall lesen --------------------------------------------------
    <#  WIE DER FALL GEWAEHLT WIRD - VERMESSEN, NICHT GERATEN.

        AllLineForcesByLoadCaseId nimmt KEINE Lastfallnummer; sie haengt am
        Zustand des Ergebniszweigs. Daneben gibt es aber die Get-Variante mit
        ausgeschriebenen Parametern:

            GetAllLineForcesByLoadCaseId(int, int, EAnalysisType,
                int[] SectionCounts, RLineForceValues[] Forces, double[] PosX)

        Die ist zustandsfrei und deshalb der Weg. Die zustandsbehaftete
        Fassung bleibt als Rueckfall stehen, falls eine andere AxisVM-Fassung
        die Get-Variante nicht fuehrt.

        UND DIE ERSTE RUECKGABE SIND NICHT DIE LINIENNUMMERN.
        Sie heisst SectionCounts: wie viele Schnitte auf jede Linie entfallen.
        Die Werte kommen also in Modellreihenfolge, und erst das Aufsummieren
        der Zaehler sagt, welcher Wert zu welcher Linie gehoert. Als
        Liniennummern gelesen ergaebe das stillen Unsinn - genau der Grund,
        warum in diesem Projekt die Schnittstelle vermessen wird.          #>
    $faelle = [ordered]@{}
    $wegName = $null
    $nGelesen = 0

    foreach ($schl in $zu.lastfaelle.PSObject.Properties.Name) {
        $lfNr = [int]$zu.lastfaelle.$schl
        $rc = $lfNr
        try { $rc = [int]$res.ResultCaseOfLoadCase($atLinear, $lfNr) } catch { }

        <#  DER SATZ MUSS VORHER DASTEHEN.

            PowerShell kann fuer einen VERBUND-Rueckgabeparameter keine
            Instanz erzeugen: [ref]$null auf ein RLineForceValues endet in
            einer NullReferenceException, und beim Feldweg (SAFEARRAY) stirbt
            im schlimmsten Fall der ganze Prozess - gemessen, beides.

            Mit einem vorher angelegten Satz (NeuerSatz, derselbe Helfer wie
            beim Aufbau) geht es. Gelesen wird deshalb STAB FUER STAB und
            Schnitt fuer Schnitt statt in einem Feld. Das ist langsamer und
            dafuer belastbar - und es sind ohnehin nur die Staebe, die in der
            Zuordnung stehen.                                             #>
        $wege = @(
            @{ name = 'GetLineForceByLoadCaseId je Stab und Schnitt, Satz vorbereitet'; tu = {
                $liste = New-Object System.Collections.Generic.List[object]
                foreach ($li in ($stabVon.Keys | Sort-Object)) {
                    $nm = $stabVon[$li]
                    for ($si = 1; $si -le 2; $si++) {
                        $v = NeuerSatz 'RLineForceValues'
                        $x = 0.0; $txt = ''
                        $ok = $m.Results.Forces.GetLineForceByLoadCaseId(
                                 $li, $si, $lfNr, 1, $atLinear, [ref]$v, [ref]$x, [ref]$txt)
                        if ($ok -le 0) { continue }
                        $liste.Add(@{ stab = $nm; x = $x; v = $v })
                    }
                }
                if ($liste.Count -eq 0) { throw 'kein einziger Schnitt lesbar' }
                @{ n = $liste.Count; einzeln = $liste } } },
            @{ name = 'LineForceByLoadCaseId ueber den eingestellten Zweig'; tu = {
                $m.Results.Forces.AnalysisType = $atLinear
                try { $res.ResultCase = $rc } catch { }
                $liste = New-Object System.Collections.Generic.List[object]
                foreach ($li in ($stabVon.Keys | Sort-Object)) {
                    $nm = $stabVon[$li]
                    for ($si = 1; $si -le 2; $si++) {
                        $v = NeuerSatz 'RLineForceValues'
                        $x = 0.0; $txt = ''
                        $ok = $m.Results.Forces.LineForceByLoadCaseId(
                                 $li, $si, [ref]$v, [ref]$x, [ref]$txt)
                        if ($ok -le 0) { continue }
                        $liste.Add(@{ stab = $nm; x = $x; v = $v })
                    }
                }
                if ($liste.Count -eq 0) { throw 'kein einziger Schnitt lesbar' }
                @{ n = $liste.Count; einzeln = $liste } } }
        )
        $r = Versuche "Schnittgroessen $schl" $wege -Leise:($null -ne $wegName)
        if (-not $r.ok) {
            Schreib "  >>> $schl : nicht lesbar."
            continue
        }
        if (-not $wegName) {
            $wegName = $r.name
            $gefunden.Add("Schnittgroessen -> $($r.name)")
        }

        # Stab fuer Stab gelesen - der Name steht schon dran.
        $liste = New-Object System.Collections.Generic.List[object]
        foreach ($e in $r.wert.einzeln) {
            $v = $e.v
            $liste.Add([ordered]@{
                stab = $e.stab
                x    = [math]::Round([double]$e.x, 6)
                Nx   = [math]::Round([double]$v.lfvNx, 6)
                Vy   = [math]::Round([double]$v.lfvVy, 6)
                Vz   = [math]::Round([double]$v.lfvVz, 6)
                Tx   = [math]::Round([double]$v.lfvTx, 6)
                My   = [math]::Round([double]$v.lfvMy, 6)
                Mz   = [math]::Round([double]$v.lfvMz, 6)
            })
        }
        $faelle[$schl] = [ordered]@{
            nummer = $lfNr
            name   = [string]$zu.lastfallNamen.$schl
            schnitte = $liste
        }
        $nGelesen++
        Schreib ("    {0,-14} {1,5} Schnitte" -f $schl, $liste.Count)
    }

    if ($nGelesen -eq 0) {
        Mitglieder 'MODELL.Results' $res
        Mitglieder 'MODELL.Results.Forces' $m.Results.Forces
        Beenden 23 'Kein einziger Lastfall war lesbar - siehe die Auflistung oben.'
    }

    # --- Schreiben ----------------------------------------------------------
    $aus = [ordered]@{
        format   = 'tragjoch-axisvm-ergebnisse'
        version  = 1
        erzeugt  = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss')
        tragwerk = [string]$zu.tragwerk
        quelle   = [string]$zu.quelle
        weg      = [string]$wegName
        einheiten = $zu.einheiten
        faelle   = $faelle
    }
    $txt = $aus | ConvertTo-Json -Depth 8 -Compress
    [IO.File]::WriteAllText($zielDatei, $txt, (New-Object Text.UTF8Encoding $false))

    return $nGelesen
}

if ($Auslesen) {
    $zielA = if ($Ziel) { $Ziel }
             else { Join-Path $PSScriptRoot 'AxisVM_ergebnisse.json' }
    $n = Lies-Schnittgroessen $m $zielA
    Abschnitt 'Fertig'
    Schreib "  $zielA"
    Schreib "  $n Lastfaelle gelesen"
    $zeilen | Set-Content -Path $bericht -Encoding UTF8
    Write-Host ''; Write-Host "Bericht: $bericht"
    Write-Host "Ergebnisse: $zielA"
    exit 0
}


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

    if ($typen) {
        # --- die Verbund-Typen, auf die es ankommt --------------------------
        $wichtig = @(
            'RPoint3d','RLineGeomData','RNodalSupportSpringParams',
            'RSpringParamIndexes','RStiffnesses','RNonLinearity','RResistances',
            'RLoadNodalForce','RLoadBeamConcentrated','RLoadBeamDistributed',
            'RLoadMemberConcentrated','RLoadMemberDistributed',
            'RReleases','RRelease','RReferencePoint','RReferenceVector',
            'RLineAttr','RLineAttr_V161','RLineData'
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

        # --- Signaturen mit Parameternamen ---------------------------------
        Abschnitt 'Signaturen mit Parameternamen'
        Schreib 'Get-Member zeigt am COM-Objekt nur die Typen. Die Baugruppe kennt'
        Schreib 'die Namen - hier die Stellen, an denen das den Unterschied macht.'
        Signaturen 'IAxisVMMaterials' 'AddSteel'
        Signaturen 'IAxisVMCrossSections' 'AddL'
        Signaturen 'IAxisVMLine' 'DefineAsBeam'
        Signaturen 'IAxisVMNodalSupports' 'AddNodal'
        Signaturen 'IAxisVMLine' 'SetStartReleases'
        <#  DIE LOKALEN STABACHSEN.
            AxisVM legt ohne Referenz die lokale z-Achse in die Vertikal-
            ebene. Fuer die Gurte trifft das unsere Vorgabe [0,0,1]; fuer
            die BLECHE nicht: deren Rechteck muss mit der Breite in die
            Jochachse stehen, also z nach [1,0,0]. Steht es falsch herum,
            ist die Biegesteifigkeit um (160/10)^2 daneben.

            Gebraucht wird deshalb: wie legt man eine Referenz an, und wie
            haengt man sie an eine Linie.                                 #>
        Signaturen 'IAxisVMReferences' ''
        Signaturen 'IAxisVMLine'  '*Ref'
        Signaturen 'IAxisVMLines' '*Ref'
        SatzAufbau 'RReference'

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

        <#  DIE ERGEBNISSEITE.

            Aufbauen kann die Bruecke. Zurueckgelesen wurde bisher ueber den
            Umweg eines Excel-Exports von Hand (vergleich_axisvm.py). Damit
            der Abgleich ueber ein ganzes Sortiment laufen kann, muessen die
            Schnittgroessen unmittelbar aus dem Modell kommen.

            Was dafuer gebraucht wird, steht hier zur Vermessung an - und
            zwar VOR der ersten Zeile Lesecode, denn Raten kostet einen
            ganzen Durchlauf:

              - wie heisst der Ergebniszweig, und was haengt darunter,
              - wie waehlt man Lastfall bzw. Kombination aus,
              - unter welchem Namen kommen die Stabschnittgroessen,
              - welche Aufzaehlung benennt N, Vy, Vz, T, My, Mz,
              - und woran erkennt man, DASS gerechnet wurde.

            Gerechnet wird auch hier nicht. Es wird nur nachgesehen, was das
            Objekt anbietet.                                              #>
        Abschnitt 'Probe: die Ergebnisseite'

        foreach ($zweig in 'Results','Calculation') {
            $o = $null
            try { $o = $m.$zweig } catch { Schreib "  MODELL.$zweig nicht lesbar" }
            if ($o) { Mitglieder "MODELL.$zweig" $o }
        }

        # Was unter Results haengt. Die Namen sind geraten - genau deshalb
        # steht hinter jedem, ob es ihn gibt.
        $unter = @('Displacements','Forces','Stresses','LineForces','BeamForces',
                   'RibForces','TrussForces','SurfaceForces','SpringForces',
                   'NodalSupportForces','LinkForces','Reactions','Envelopes',
                   'Critical','Eigenvalues','LoadCases','LoadCombinations',
                   'AnalysisType','LoadCaseId','LoadCombinationId','LoadLevelOrTime',
                   'ResultType','MinMaxType','DisplayShape')
        try {
            $res = $m.Results
            Schreib ''
            Schreib 'WAS UNTER RESULTS HAENGT:'
            foreach ($u in $unter) {
                $w = $null; $art = 'fehlt'
                try { $w = $res.$u } catch { }
                if ($null -ne $w) {
                    $art = if ($w -is [ValueType] -or $w -is [string]) { "= $w" }
                           else { $w.GetType().Name }
                }
                Schreib ("      {0,-22} {1}" -f $u, $art)
            }
            # Und was die vielversprechenden Unterobjekte selbst anbieten.
            foreach ($u in 'Displacements','Forces','Stresses','LineForces','BeamForces') {
                $w = $null; try { $w = $res.$u } catch { }
                if ($w) { Mitglieder "MODELL.Results.$u" $w }
            }
        } catch { Schreib "  MODELL.Results nicht lesbar: $($_.Exception.Message)" }

        # --- Signaturen mit Parameternamen ---------------------------------
        # Am COM-Objekt sieht man nur die Typen; die Baugruppe kennt die Namen.
        foreach ($paar in @(
            # Die Parameternamen entscheiden, WIE der Lastfall gewaehlt wird:
            # All...ByLoadCaseId nimmt laut Get-Member keine Nummer, also muss
            # sie anderswo stehen. Ohne die Namen ist das geraten.
            @('IAxisVMForces', 'GetAllLineForces'),
            @('IAxisVMForces', 'GetAllLinkElementForces'),
            @('IAxisVMForces', 'GetAllNodalSupportForces'),
            @('IAxisVMStresses', 'GetAllLineStresses'),
            @('IAxisVMForces', 'AllLineForces'),
            @('IAxisVMResults', 'LoadCase'),
            @('IAxisVMResults', 'ResultCase'),
            @('IAxisVMResults', 'GetResultsValid'),
            @('IAxisVMResults', 'GetSectionCoordinates'),
            @('IAxisVMLoadCases', ''),
            @('IAxisVMLoadCombinations', ''))) {
            Signaturen $paar[0] $paar[1]
        }
        # ANMERKUNG: Get-Member auf MODELL.LoadCases blieb haengen - der
        # Vorgang stand mit eingefrorener CPU. Die Signaturen oben kommen aus
        # der Baugruppe und brauchen keinen COM-Aufruf; sie sagen dasselbe,
        # ohne das Risiko.

        # --- Die Verbund-Typen der Ergebnisse -------------------------------
        if ($typen) {
            Schreib ''
            Schreib 'VERBUND-TYPEN DER ERGEBNISSE (nach Namen gesucht):'
            $treffer = $typen | Where-Object {
                $_.IsValueType -and $_.Name -match '^R.*(Force|Stress|Displacement|Result)'
            } | Sort-Object Name | Select-Object -First 24
            if (-not $treffer) { Schreib '  keiner gefunden' }
            foreach ($t in $treffer) {
                Schreib "  $($t.Name)"
                foreach ($f in $t.GetFields([Reflection.BindingFlags]'Public,Instance')) {
                    Schreib ("      {0,-26} {1}" -f $f.Name, $f.FieldType.Name)
                }
            }

            Schreib ''
            Schreib 'AUFZAEHLUNGEN DER ERGEBNISSE:'
            $auf = $typen | Where-Object {
                $_.IsEnum -and $_.Name -match 'Result|Force|Stress|Analysis|MinMax|Envelope'
            } | Sort-Object Name | Select-Object -First 16
            if (-not $auf) { Schreib '  keine gefunden' }
            foreach ($t in $auf) {
                Schreib "  $($t.Name)"
                foreach ($n in [Enum]::GetNames($t)) {
                    Schreib ("      {0,-34} {1}" -f $n, [int][Enum]::Parse($t, $n))
                }
            }
        }

    }

    Abschnitt 'Das war NUR die Erkundung'
    Schreib 'Es wurde nichts gebaut - das Probemodell wird jetzt verworfen.'
    Schreib ''
    Schreib '  Zum Aufbauen des Tragjochs:   AxisVM_aufbauen.cmd'
    Schreib ''
    Schreib 'Diese Erkundung braucht es nur, wenn etwas nicht traegt: sie sagt'
    Schreib 'dann, was diese AxisVM-Fassung wirklich anbietet.'

    try { $app.Models.Delete($idx) } catch { }
    try { $app.Quit() } catch { }
    $zeilen | Set-Content -Path $bericht -Encoding UTF8
    Write-Host ''; Write-Host "Bericht: $bericht"
    Read-Host "`nWeiter mit Enter"
    exit 0
}


<#  KONSTANTEN DER SCHNITTSTELLE.
    Alle am 2026-08-22 aus der Typbibliothek von AxisVM 18 r1m De gelesen,
    keine davon geraten. Sie stehen hier beisammen, damit eine andere
    Fassung an EINER Stelle nachgezogen wird.                              #>
$lgtGerade   = 0    # ELineGeomType.lgtStraightLine
$cspAnderes  = 0    # ECrossSectionProcess.cspOther
$cspGewalzt  = 1    # ECrossSectionProcess.cspRolled
$ndcSchweiz  = 7    # ENationalDesignCode.ndcSwiss_SIA26x
$ndcEuroCode = 2    # ENationalDesignCode.ndcEuroCode
$lctNormal   = 0    # ELoadCaseType.lctStandard
$sysGlobal   = 0    # ESystem.sysGlobal
$brdtLaenge  = 0    # EBeamRibDistributionType.brdtLength
$lnlLinear   = 0    # ELineNonLinearity.lnlTensionAndCompression
$lbFalsch    = 0    # ELongBoolean.lbFalse

# Waehrend des Aufbaus zeichnet AxisVM sonst jeden Knoten einzeln neu.
try { $m.BeginUpdate() } catch { }

# --- 3 - Material ------------------------------------------------------------
Abschnitt '3 - Material'
$stahl = $d.material.name
<#  Welcher Katalog den Stahl unter welchem Namen fuehrt, ist nicht zu
    erraten - beim ersten Aufbau lieferte (ndcSwiss_SIA26x, 'S235') den
    Fehler -102. Also der Reihe nach, und der Wert wird nachgeprueft.     #>
$ndcEuroGER = 8    # ENationalDesignCode.ndcEuroCode_GER
$kand = @()
$gesehen = New-Object System.Collections.Generic.HashSet[string]
# EuroCode zuerst: der SIA-Katalog fuehrt S235 nicht (errNotFound), und
# die Norm wird in der Schweiz ohnehin uebernommen.
foreach ($nc in @(@{ n = 'ndcEuroCode';     v = $ndcEuroCode },
                  @{ n = 'ndcEuroCode_GER'; v = $ndcEuroGER },
                  @{ n = 'ndcSwiss_SIA26x'; v = $ndcSchweiz })) {
    foreach ($nm in @($stahl, ($stahl -replace '^S\s*', 'S '), ($stahl -replace '\s+', ''))) {
        $bez = "AddFromCatalog($($nc.n), '$nm')"
        if (-not $gesehen.Add($bez)) { continue }
        $v = $nc.v; $x = $nm
        $kand += @{ name = $bez; tu = { $m.Materials.AddFromCatalog($v, $x) }.GetNewClosure() }
    }
}
$r = Versuche 'Material' $kand -Positiv
if (-not $r.ok) {
    Signaturen 'IAxisVMMaterials' 'AddSteel'
    Schreib ''
    Schreib 'Damit laesst sich der Stahl von Hand setzen - unsere Datei fuehrt:'
    Schreib ("  E $($d.material.E) N/mm2, G $($d.material.G), nu $($d.material.nu), " +
             "alpha $($d.material.alpha), rho $($d.material.rho) kg/m3, fy $($d.material.fy)")
    Beenden 3 ("$stahl in keinem Katalog gefunden. AxisVM meldet das als " +
               'negative Zahl, nicht als Fehler - deshalb faellt es sonst ' +
               'erst beim Rechnen auf.')
}
$iMat = $r.wert
try { Schreib "  Katalogname: $($m.Materials.Item($iMat).Name)" } catch { }
Schreib "  $stahl als Nummer $iMat"

<#  DAS STEIFE MATERIAL fuer die Gurtabschnitte im Knotenbereich.
    Vorgabe des Auftraggebers: diese Abschnitte tragen den QUERSCHNITT IHRES
    GURTES, und die Steifigkeit wird im Hintergrund hochgedreht. Dann
    stimmen Eigengewicht und Darstellung - ein Ersatzrechteck von 500x500
    woege das Fuenfzigfache und staende als Klotz in der Ansicht.

    NICHT ueber StiffnessReduction: gemessen am 24.08. nimmt AxisVM dort
    keinen Wert ueber 1 an - gesetzt 1000, gelesen 1, ohne Fehlermeldung.
    Es ist eine Reduktion, keine Steigerung.

    Also ein eigenes Material: gleiche Dichte, gleiche Festigkeit, nur der
    E-Modul vervielfacht. Die Kennwerte werden vom KATALOGMATERIAL gelesen
    statt aus unserer Datei umgerechnet - damit stellt sich die Frage der
    Einheit gar nicht erst (gemessen: Ex = 2.1e8, das sind kN/m2).        #>
$iMatSteif = 0
$brauchtSteif = @($d.staebe | Where-Object { $_.steifesMaterial }).Count
if ($brauchtSteif -gt 0 -and $d.materialSteif) {
    $mo = $null; try { $mo = $m.Materials.Item($iMat) } catch { }
    $lies = {
        param($feld, $ersatz)
        $v = $null; try { $v = $mo.$feld } catch { }
        if ($null -ne $v -and [double]$v -ne 0) { [double]$v } else { [double]$ersatz }
    }
    $fk  = [double]$d.materialSteif.faktor
    $ex  = (& $lies 'Ex' 2.1e8) * $fk
    $nu  = & $lies 'Nux' 0.3
    $al  = & $lies 'Alfax' 1.2e-5
    $rho = & $lies 'Rho' 7850
    $fy  = & $lies 'Fy' 235000
    $fu  = & $lies 'Fu' 360000
    $nameS = [string]$d.materialSteif.name
    try {
        $iMatSteif = $m.Materials.AddSteel_EuroCode('EuroCode', $stahl, $nameS,
            0x999999, 0x666666, $ex, $ex, $ex, $nu, $nu, $nu, $al, $al, $al,
            $rho, $fy, $fu, $fy, $fu)
    } catch {
        Schreib "  >>> AddSteel_EuroCode: $($_.Exception.Message -replace "`r?`n", ' ')"
        $iMatSteif = 0
    }
    if ($iMatSteif -gt 0) {
        Schreib ("  {0,-34} AddSteel_EuroCode(E x {1})" -f 'Steifes Material', $fk)
        Schreib ("    $nameS als Nummer $iMatSteif - E {0:N0} kN/m2, rho {1} kg/m3 wie der Stahl" -f $ex, $rho)
        $gefunden.Add("Steifes Material -> Materials.AddSteel_EuroCode(...)")
    } else {
        $wie = FehlerName $iMatSteif
        Schreib ''
        Schreib "  >>> WARNUNG: das steife Material kam nicht zustande$(if ($wie) { " ($wie)" })."
        Schreib "  >>> Die $brauchtSteif Gurtabschnitte im Knotenbereich bekommen dann den"
        Schreib '  >>> gewoehnlichen Stahl und sind NICHT steif - das Joch rechnet zu weich.'
        Signaturen 'IAxisVMMaterials' 'AddSteel'
    }
}

# --- 4 - Querschnitte --------------------------------------------------------
Abschnitt '4 - Querschnitte'
<#  EINHEIT: METER. Gemessen, nicht angenommen - AddL(100, ...) liefert
    Ax = 1900 m2, AddL(0.1, ...) liefert 0.0019 m2. Eine falsche Einheit
    wirft hier KEINEN Fehler, sie liefert still einen tausendfach falschen
    Querschnitt. Deshalb wird unten die Flaeche zurueckgelesen.            #>
$mm = 0.001
$qs = @{}
foreach ($q in $d.querschnitte) {
    $p = $q.parameter
    $r = Versuche "QS $($q.name)" @(
        @{ name = 'CrossSections.AddL(Name, a, b, tw, tf, r1, r2, cspRolled)'; tu = {
            if ($q.form -ne 'Angle') { throw 'kein Winkel' }
            $m.CrossSections.AddL($q.name, $p[0] * $mm, $p[1] * $mm, $p[2] * $mm,
                                  $p[2] * $mm, $p[3] * $mm, $p[4] * $mm, $cspGewalzt) } },
        @{ name = 'CrossSections.AddRectangular(Name, h, b, cspOther)'; tu = {
            if ($q.form -ne 'Rectangle') { throw 'kein Rechteck' }
            $m.CrossSections.AddRectangular($q.name, $p[0] * $mm, $p[1] * $mm, $cspAnderes) } }
    ) -Leise:($qs.Count -gt 0) -Positiv
    if (-not $r.ok) { Mitglieder 'CrossSections' $m.CrossSections; Beenden 4 "Querschnitt $($q.name) nicht anlegbar." }
    $qs[$q.name] = $r.wert
}
Schreib "  $($qs.Count) Querschnitte"

<#  ZURUECKGELESEN. Der einzige Weg, eine Einheitenverwechslung zu bemerken:
    AxisVM rechnet die Flaeche aus der Geometrie neu; sie muss zu der aus dem
    Profiltabellenwert passen. Ein Rest von ein bis zwei Prozent ist normal -
    die Ausrundungen r1/r2 stehen in unserer Datei auf null, in der Tabelle
    aber nicht.                                                            #>
$schief = 0
foreach ($q in $d.querschnitte) {
    if ($null -eq $q.A) { continue }
    $ist = $null
    try { $ist = $m.CrossSections.Item($qs[$q.name]).Ax } catch { continue }
    if (-not $ist) { continue }
    $ab = ($ist - $q.A) / $q.A * 100
    Schreib ("    {0,-16} A = {1,10:N6} m2   Tabelle {2,10:N6}   {3,6:+0.0;-0.0} %" -f
             $q.name, $ist, $q.A, $ab)
    if ([Math]::Abs($ab) -gt 5) { $schief++ }
}
if ($schief -gt 0) {
    Beenden 4 ("$schief Querschnitte weichen um mehr als 5 % von der Tabelle ab. " +
               'Das deutet auf eine Einheitenverwechslung - nicht weiterbauen.')
}

# --- 5 - Knoten --------------------------------------------------------------
Abschnitt '5 - Knoten'
$kn = @{}
foreach ($k in $d.knoten) {
    $i = $m.Nodes.Add($k.x, $k.y, $k.z)
    if ($i -le 0) { Beenden 5 "Knoten $($k.name) meldet $i." }
    $kn[$k.name] = $i
}
Schreib "  $($kn.Count) Knoten"

<#  WIE EIN STUMMEL GEBAUT WIRD.
    Vorgabe des Auftraggebers: die Starrelemente sind in AxisVM auch als
    solche zu modellieren und nicht als dicke Staebe mit steifem
    Ersatzquerschnitt. AxisVM haelt dafuer zwei Bauteile bereit, und das
    Gelenk entscheidet, welches:

      ohne Gelenk   Starrkoerper - RigidBodies.Add(Int32[] LineIds) haelt
                    alle sechs Freiheitsgrade und kennt keine Freigabe
      mit Gelenk    Linkelement - LinkElements.AddNN(RNNLinkElementRec)
                    traegt die Steifigkeit je Richtung; genau das braucht
                    der Ast zur zweiten Reihe, der laengs frei sein muss

    Die Ausleitung schreibt die Art als Feld 'art' mit. Fehlt sie - bei
    Dateien aus einer aelteren Fassung -, wird sie am Ersatzquerschnitt und
    am Gelenk erkannt. So laeuft auch eine alte Datei durch.              #>
function StabArt($sb) {
    if ($sb.art) { return [string]$sb.art }
    if ($sb.querschnitt -ne 'STARR') { return 'stab' }
    if ($sb.gelenkAnfang -or $sb.gelenkEnde) { return 'link' }
    return 'starr'
}

<#  EIN LINKELEMENT AUS EINER BESTEHENDEN LINIE.
    Vermessen am 23.08.: AddNN nimmt den Satz spaet gebunden, die Linie muss
    vorher liegen (Feld LineId), und DefineAsBeam braucht sie nicht. Die
    Kraftuebertragung steht in Stiffnesses - gehalten mit derselben Zahl wie
    die starren Auflager, frei mit null.

    Der Aufruf geht UNMITTELBAR, nicht ueber "Versuche": ein Verbund-Typ,
    der durch fremde Gueltigkeitsbereiche gereicht wird, kommt am
    COM-Marshaller nicht mehr als Satz an (DISP_E_BADVARTYPE).            #>
function LinkSetzen([int]$li, $sb, [int]$master) {
    $rec = NeuerSatz 'RNNLinkElementRec'
    $rec = SatzSetzen $rec @('LineId') $li
    $rec = SatzSetzen $rec @('SystemGLR') 'sysGlobal'
    $rec = SatzSetzen $rec @('MasterPoint') $master
    # Lage der Verbindung auf halber Laenge (Weisung). Im Dialog von AxisVM
    # ist das "Lage der Verbindung"; ohne Angabe stuende sie auf 0, also am
    # Anfangsknoten.
    $rec = SatzSetzen $rec @('Position') 0.5
    foreach ($f in 'x', 'y', 'z', 'xx', 'yy', 'zz') {
        $wie = if ($sb.kraftuebertragung) { [string]$sb.kraftuebertragung.$f }
               else {
                   # Rueckfall: 'axial' loest die Laengskraft, 'M' die Momente.
                   $g = if ($sb.gelenkAnfang) { $sb.gelenkAnfang } else { $sb.gelenkEnde }
                   if (($g -eq 'axial' -and $f -eq 'x') -or
                       ($g -eq 'M' -and $f -match '^(xx|yy|zz)$')) { 'Free' } else { 'Rigid' }
               }
        $rec = SatzSetzen $rec @('Stiffnesses', $f) $(if ($wie -eq 'Free') { 0.0 } else { $script:STARR_FEDER })
        $rec = SatzSetzen $rec @('NonLinearity', $f) 'lnlTensionAndCompression'
        $rec = SatzSetzen $rec @('Resistances', $f) 0.0
    }
    if ($null -eq $rec) { return 0 }
    try { return $script:m.LinkElements.AddNN($rec) }
    catch {
        Schreib "  >>> LinkElements.AddNN: $($_.Exception.Message -replace "`r?`n", ' ')"
        return 0
    }
}

# Gehalten heisst hier dieselbe Zahl wie bei den starren Auflagern.
$STARR_FEDER = 1e10

# --- 6 - Staebe --------------------------------------------------------------
Abschnitt '6 - Staebe'
<#  Zwei Schritte: Lines.Add legt die LINIE, DefineAsBeam macht daraus einen
    Balken mit Material und Querschnitt. Beide nehmen Verbund-Typen -
    RLineGeomData (fuer die Gerade leer) und zweimal RPoint3d fuer die
    Ausmitte an den Enden (hier null: unsere Knoten liegen bereits auf den
    Schwerelinien).                                                        #>
$geom = NeuerSatz 'RLineGeomData'
$ecc  = NeuerSatz 'RPoint3d'
$st = @{}; $laenge = @{}; $artVon = @{}
$erste = $true; $nG = 0; $nGnein = 0
$nStab = 0; $nLink = 0; $nLinkNein = 0
$starrLinien = New-Object System.Collections.Generic.List[int]
foreach ($sb in $d.staebe) {
    $vk = $kn[$sb.von]; $bk = $kn[$sb.bis]; $iq = $qs[$sb.querschnitt]
    if (-not $vk -or -not $bk) { Beenden 6 "Stab $($sb.name): Knoten fehlt." }
    $art = StabArt $sb
    if ($art -eq 'stab' -and -not $iq) {
        Beenden 6 "Stab $($sb.name): Querschnitt $($sb.querschnitt) fehlt."
    }

    # Die LINIE braucht jeder der drei Wege - der Starrkoerper nimmt ihre
    # Nummer, das Linkelement traegt sie im Satz, der Balken wird auf ihr
    # definiert.
    # Der steife Gurtabschnitt traegt seinen eigenen Querschnitt, aber das
    # hochgedrehte Material - siehe Abschnitt 3.
    $matL = if ($sb.steifesMaterial -and $iMatSteif -gt 0) { $iMatSteif } else { $iMat }
    $r = Versuche 'Stab' @(
        @{ name = 'Lines.Add(i, j, lgtStraightLine, RLineGeomData) + DefineAsBeam'; tu = {
            $li = $m.Lines.Add($vk, $bk, $lgtGerade, $geom)
            if ($li -le 0) { throw "Lines.Add meldet $li" }
            if ($art -eq 'stab') {
                $db = $m.Lines.Item($li).DefineAsBeam($matL, $iq, $iq, $ecc, $ecc)
                if ($db -le 0) { throw "DefineAsBeam meldet $db" }
            }
            $li } }
    ) -Leise:(-not $erste) -Positiv
    if (-not $r.ok) {
        Mitglieder 'Lines' $m.Lines
        Beenden 6 "Stab $($sb.name) nicht anlegbar."
    }
    $st[$sb.name] = $r.wert
    $artVon[$sb.name] = $art
    try { $laenge[$sb.name] = $m.Lines.Item($r.wert).Length } catch { $laenge[$sb.name] = 0 }

    if ($art -eq 'starr') {
        [void]$starrLinien.Add([int]$r.wert)
    } elseif ($art -eq 'link') {
        if ((LinkSetzen ([int]$r.wert) $sb ([int]$vk)) -gt 0) { $nLink++ } else { $nLinkNein++ }
    } else {
        $nStab++
        # Gewoehnliche Stabendgelenke gibt es nur noch am wirklichen Stab -
        # beim Linkelement steckt dieselbe Aussage in der Steifigkeit.
        if ($sb.gelenkAnfang -or $sb.gelenkEnde) {
            $li = $m.Lines.Item($r.wert)
            if ($sb.gelenkAnfang) {
                if (GelenkSetzen $li 'Anfang' $sb.gelenkAnfang) { $nG++ } else { $nGnein++ }
            }
            if ($sb.gelenkEnde) {
                if (GelenkSetzen $li 'Ende' $sb.gelenkEnde) { $nG++ } else { $nGnein++ }
            }
        }
    }
    $erste = $false
}
Schreib "  $nStab Staebe, $($starrLinien.Count) Starrelemente, $nLink Verbindungselemente"

<#  STARRKOERPER AUS DEN GESAMMELTEN LINIEN.
    Je Stummel ein eigener Koerper - das ist die unmittelbare Entsprechung
    des bisherigen steifen Stabes. Alle in EINEN zu legen wuerde das halbe
    Joch starr machen.                                                    #>
$nStarr = 0; $nStarrNein = 0
foreach ($sl in $starrLinien) {
    $ids = [int[]]@($sl)
    try { $nr = $m.RigidBodies.Add($ids) } catch {
        $nr = 0
        if ($nStarrNein -eq 0) {
            Schreib "  >>> RigidBodies.Add: $($_.Exception.Message -replace "`r?`n", ' ')"
        }
    }
    if ($nr -gt 0) { $nStarr++ } else { $nStarrNein++ }
}
if ($nStarr -gt 0) {
    Schreib ("  {0,-34} RigidBodies.Add(Int32[] LineIds)" -f 'Starrkoerper')
    $gefunden.Add('Starrkoerper -> RigidBodies.Add(Int32[] LineIds)')
}
if ($nLink -gt 0) {
    Schreib ("  {0,-34} LinkElements.AddNN(RNNLinkElementRec)" -f 'Verbindungselement')
    $gefunden.Add('Verbindungselement -> LinkElements.AddNN(RNNLinkElementRec)')
}
if ($nStarrNein -gt 0 -or $nLinkNein -gt 0) {
    Schreib ''
    Schreib "  >>> WARNUNG: $nStarrNein Starrkoerper und $nLinkNein Verbindungselemente"
    Schreib '  >>> wurden NICHT angelegt. Die betroffenen Linien stehen dann ohne'
    Schreib '  >>> Eigenschaft im Modell - sie tragen nichts. NICHT rechnen.'
}
if ($nG -gt 0) { Schreib "  $nG Freigaben gesetzt als $nFreiName (zweiter Ast ohne Laengskraft)" }

<#  ZWEI-PUNKT-ANSCHLUESSE.
    Die Verbindungselemente uebertragen sonst nur Kraefte. Haengt ein Anbauteil an
    nur ZWEI Punkten - eine Reihe, eine Ebene -, liegen beide auf einer
    Geraden in Gleisrichtung, und um diese Gerade hielte ihn nichts mehr.
    Dort haelt das Link deshalb zusaetzlich das Moment um y (Weisung). Der
    Bericht fuehrt diese Stellen auf: es ist die einzige, an der ein Link
    mehr als Kraefte uebertraegt.                                        #>
$zp = @($d.tragwerk.zweiPunktAnschluss)
if ($zp.Count -gt 0) {
    Schreib ''
    Schreib "  $($zp.Count) Anbauteile haengen an zwei Punkten - ihre Links halten M_y:"
    foreach ($q in $zp) {
        Schreib ("      {0,-22} x = {1,8:N3} m   Ebene {2}" -f $q.name, $q.x, $q.ebene)
    }
}

# --- 6b - Lokale Stabachsen --------------------------------------------------
Abschnitt '6b - Lokale Stabachsen'
<#  WARUM DAS SEIN MUSS.
    AxisVM legt ohne Referenz die lokale z-Achse in die VERTIKALEBENE. Fuer
    die Gurte trifft das unsere Vorgabe [0,0,1]. Fuer die BLECHE nicht: ihr
    Rechteck muss mit der Breite in die Jochachse stehen, also z nach
    [1,0,0]. Stuende ein 160x10-Blech hochkant, laege seine Biegesteifigkeit
    um (160/10)^2 daneben - das Modell rechnete klaglos Unsinn.

    DER WEG. Vermessen am 22.08.: References kennt genau EINE Add-Methode,
    und die nimmt einen Verbund-Typ:  Add(RReference Item).  Wie RReference
    innen aussieht, wird wieder GELESEN statt geraten - Felder, Typen und
    bei Aufzaehlungen die Namen stehen unten im Bericht. Gefuellt wird
    danach nach Bedeutung: das Aufzaehlungsfeld auf die Vektor-Art, die
    erste Gruppe aus x/y/z auf die Richtung.

    Sollte RReference die Richtung als ZWEI Punkte fuehren statt als einen
    Vektor, trifft die erste Gruppe den Anfangspunkt und der Endpunkt
    bleibt im Ursprung. Die Achse steht dann trotzdem richtig, nur zeigt
    sie in die Gegenrichtung - fuer die Steifigkeit ohne Belang, beim
    Vorzeichen von My beim Ablesen zu beachten.

    Keiner der 942 Staebe steht parallel zu seiner Referenz (geprueft, das
    kleinste Kreuzprodukt liegt bei 1.0) - die Richtung ist also ueberall
    eindeutig.                                                            #>
Signaturen 'IAxisVMReferences' ''
<#  Auch gleich zeigen, WOHIN die fertige Referenz gehoert. Der Filter
    '*Ref' wird zu '*Ref*', es kommt also alles mit Ref im Namen. Das
    steht auch dann im Bericht, wenn das Zuweisen unten glueckt; misslingt
    es, spart die Liste einen ganzen Durchlauf.                        #>
Signaturen 'IAxisVMLine'  '*Ref'
Signaturen 'IAxisVMLines' '*Ref'
SatzAufbau 'RReference'

$tRef = $script:typen | Where-Object { $_.Name -eq 'RReference' } | Select-Object -First 1

<#  DIE KOORDINATENGRUPPE MUSS ZUR ART PASSEN.
    Der Lauf vom 23.08. hat den Aufbau von RReference gelesen, und er
    entscheidet die Frage: unter ReferenceData liegen FUENF Zweige
    nebeneinander - Point, Vector, Axis, Plane, Beta - und AxisVM sieht nur
    den an, auf den ReferenceType zeigt. Die erste x/y/z-Gruppe im Satz
    gehoert aber zu Point, waehrend die Art auf rtVector stand. Die Richtung
    landete damit in einem Zweig, den niemand liest, und der gelesene stand
    auf null.

    Deshalb jetzt: erst die Art bestimmen, dann NUR in ihrem Zweig suchen.
    Ein Vektor wird durch zwei Punkte gefuehrt (P1 -> P2) - die erste Gruppe
    ist der Anfang und kommt auf den Ursprung, die zweite traegt die
    Richtung. Findet sich nur eine Gruppe (so bei Point), traegt sie die
    Richtung selbst.                                                      #>
$koord = $null
$koord0 = $null
$artFeld = $null
$artWert = $null
$namensFeld = $null
if ($tRef) {
    foreach ($f in $tRef.GetFields([Reflection.BindingFlags]'Public,Instance')) {
        if ($f.FieldType.IsEnum -and -not $artFeld) {
            $namen = [Enum]::GetNames($f.FieldType)
            $treffer = $namen | Where-Object { $_ -match 'Vector|Vekt' } | Select-Object -First 1
            if (-not $treffer) { $treffer = $namen | Where-Object { $_ -match 'Point|Punkt' } | Select-Object -First 1 }
            if ($treffer) {
                $artFeld = $f.Name; $artWert = $treffer
                Schreib "  Art der Referenz: $($f.Name) = $treffer"
            }
        }
        if (($f.FieldType -eq [string]) -and -not $namensFeld) { $namensFeld = $f.Name }
    }

    $alle = New-Object System.Collections.ArrayList
    ZahlPfade $tRef @() 0 $alle
    $gruppen = @{}
    $folge = @()
    foreach ($p in $alle) {
        $blatt = $p[$p.Count - 1]
        if ($blatt -notmatch '^[xyz]$') { continue }
        $eltern = if ($p.Count -gt 1) { ($p[0..($p.Count - 2)]) -join '.' } else { '' }
        if (-not $gruppen.ContainsKey($eltern)) { $gruppen[$eltern] = @{}; $folge += $eltern }
        $gruppen[$eltern][$blatt.ToLower()] = @($p)
    }
    $voll = @()
    foreach ($g in $folge) {
        $h = $gruppen[$g]
        if ($h.ContainsKey('x') -and $h.ContainsKey('y') -and $h.ContainsKey('z')) {
            $voll += @{ pfad = $g; felder = $h }
        }
    }
    # 'rtVector' -> Zweig 'Vector'. Das Praefix der Aufzaehlung faellt weg.
    $kern = if ($artWert) { $artWert -replace '^rt', '' } else { '' }
    $imZweig = @()
    if ($kern) { $imZweig = @($voll | Where-Object { $_.pfad -match "(^|\.)$kern(\.|$)" }) }
    if ($imZweig.Count -eq 0) {
        $imZweig = @($voll)
        if ($voll.Count -gt 0 -and $kern) {
            Schreib "  >>> Kein Zweig '$kern' im Satz - genommen wird die erste Gruppe."
        }
    }
    if ($imZweig.Count -ge 2) {
        $koord0 = $imZweig[0].felder
        $koord  = $imZweig[1].felder
        Schreib "  Anfang auf den Ursprung: $($imZweig[0].pfad).x/y/z"
        Schreib "  Richtung geht nach:      $($imZweig[1].pfad).x/y/z"
    } elseif ($imZweig.Count -eq 1) {
        $koord = $imZweig[0].felder
        Schreib "  Richtung geht nach: $($imZweig[0].pfad).x/y/z"
    }
}
if (-not $koord) {
    Schreib '  >>> In RReference sitzt keine Gruppe x/y/z. Der Aufbau steht oben.'
}

$refs = @{}
$refFehler = 0

function ReferenzFuer($vx, $vy, $vz) {
    $schluessel = "$vx|$vy|$vz"
    if ($script:refs.ContainsKey($schluessel)) { return $script:refs[$schluessel] }
    if (-not $script:koord) { $script:refs[$schluessel] = $null; return $null }

    $satz = NeuerSatz 'RReference'
    if ($script:artFeld)    { $satz = SatzSetzen $satz @($script:artFeld) $script:artWert }
    if ($script:namensFeld) { $satz = SatzSetzen $satz @($script:namensFeld) "LCS_${vx}_${vy}_${vz}" }
    if ($script:koord0) {
        foreach ($a in 'x','y','z') { $satz = SatzSetzen $satz $script:koord0[$a] 0.0 }
    }
    $satz = SatzSetzen $satz $script:koord['x'] ([double]$vx)
    $satz = SatzSetzen $satz $script:koord['y'] ([double]$vy)
    $satz = SatzSetzen $satz $script:koord['z'] ([double]$vz)
    if ($null -eq $satz) {
        Schreib '  >>> RReference liess sich nicht fuellen.'
        $script:refs[$schluessel] = $null
        return $null
    }

    <#  $script: GILT IM CLOSURE NICHT MEHR.
        GetNewClosure() legt ein neues dynamisches Modul an. Darin zeigt
        $script: auf DESSEN Modulscope und nicht mehr auf dieses Skript -
        $script:m war deshalb leer, und .References lief auf einem Null.
        Der erste Lauf meldete "Methode fuer einen Ausdruck, der den NULL
        hat" und setzte 0 von 942 Achsen; das Objekt fehlte, nicht das
        Argument.

        Der Block OHNE Closure ist deshalb der erste Weg - genau das
        Muster, das bei den Auflagern traegt: $m findet er ueber den
        Skriptbereich, $s ueber die Aufrufkette. Die Closure-Fassung mit
        lokal gebundenem $mm bleibt als zweiter Weg stehen.               #>
    <#  UNMITTELBAR AUFRUFEN, NICHT UEBER "Versuche".
        Hier gibt es nur EINE Schreibweise - Add(RReference) -, also ist
        nichts durchzuprobieren. Der Umweg kostete sogar: derselbe Satz,
        der auf Skriptebene mit Rueckgabe 1 durchgeht, scheiterte ueber
        den Kandidatenblock mit DISP_E_BADVARTYPE. Ein Verbund-Typ, der
        durch fremde Gueltigkeitsbereiche gereicht wird, kommt am
        COM-Marshaller nicht mehr als Satz an. Also direkt.               #>
    $mod = $script:m
    $nummer = 0
    try {
        $nummer = $mod.References.Add($satz)
    } catch {
        Schreib "  >>> References.Add: $($_.Exception.Message -replace "`r?`n", ' ')"
        Schreib "  >>> Satztyp: $(if ($null -eq $satz) { '(null)' } else { $satz.GetType().FullName })"
        $nummer = 0
    }
    if ($nummer -le 0) {
        $wie = FehlerName $nummer
        Schreib ("  {0,-34} Rueckgabe {1}{2}" -f 'Referenz nicht angelegt', $nummer,
                 $(if ($wie) { " = $wie" } else { '' }))
        $script:refs[$schluessel] = $null
        return $null
    }
    if ($script:refs.Count -eq 0) {
        Schreib ("  {0,-34} References.Add(RReference)" -f 'Referenz')
        $script:gefunden.Add('Referenz -> References.Add(RReference)')
    }
    $r = @{ ok = $true; wert = $nummer }
    $script:refs[$schluessel] = if ($r.ok) { $r.wert } else { $null }
    return $script:refs[$schluessel]
}

<#  ZUWEISEN AN DEN STAB. Wie die Referenz an die Linie kommt, ist nicht
    vermessen - es gibt mehrere Schreibweisen im Umlauf. Der erste Stab
    probiert sie durch, der Rest nimmt die, die getragen hat. Traegt keine,
    stehen die Mitglieder von IAxisVMLine im Bericht.                     #>
$zuweisung = $null
function AchseZuweisen([int]$li, [int]$ref) {
    if ($script:zuweisung) {
        # Der Block ist eine ZUWEISUNG - er liefert nichts zurueck. Wer
        # hier sein Ergebnis auswertet, bekommt $null und haelt einen
        # geglueckten Schritt fuer einen Fehler.
        try { & $script:zuweisung $li $ref; return $true } catch { return $false }
    }
    $wege = @(
        @{ name = 'Lines.Item(i).Reference = n';      tu = { param($l, $r) $script:m.Lines.Item($l).Reference = $r } },
        @{ name = 'Lines.Item(i).ReferenceIndex = n'; tu = { param($l, $r) $script:m.Lines.Item($l).ReferenceIndex = $r } },
        @{ name = 'Lines.Item(i).SetReference(n)';    tu = { param($l, $r) [void]$script:m.Lines.Item($l).SetReference($r) } },
        @{ name = 'Members.Item(i).Reference = n';    tu = { param($l, $r) $script:m.Members.Item($l).Reference = $r } }
    )
    foreach ($w in $wege) {
        try {
            & $w.tu $li $ref
            Schreib ("  {0,-34} {1}" -f 'Achse an den Stab', $w.name)
            $script:zuweisung = $w.tu
            $script:gefunden.Add("Achse an den Stab -> $($w.name)")
            return $true
        } catch { }
    }
    Schreib '  >>> Keine der vier Schreibweisen hat die Referenz angenommen.'
    Signaturen 'IAxisVMLine' ''
    return $false
}

$nRef = 0
$proben = @()
foreach ($sb in $d.staebe) {
    $li = $st[$sb.name]
    if (-not $li -or -not $sb.lcsZ) { continue }
    $v = $sb.lcsZ
    $ref = ReferenzFuer $v[0] $v[1] $v[2]
    if (-not $ref) { $refFehler++; continue }
    if (AchseZuweisen $li $ref) {
        $nRef++
        if ($proben.Count -lt 4) { $proben += @{ name = $sb.name; li = $li; ref = $ref; v = $v } }
    } else {
        # Traegt keine Schreibweise, tragen sie alle nicht - weiterlaufen
        # hiesse 941 gleiche Fehlschlaege in den Bericht schreiben.
        $refFehler = @($d.staebe).Count - $nRef
        break
    }
}
Schreib "  $nRef Staeben eine Referenz zugewiesen, $($refs.Count) Richtungen"

<#  NACHMESSEN. Gesetzt heisst nicht angekommen: eine COM-Eigenschaft kann
    eine Zuweisung klaglos schlucken und doch bei 0 bleiben. Deshalb wird
    an vier Staeben zurueckgelesen, was jetzt wirklich drinsteht.         #>
if ($proben.Count -gt 0) {
    foreach ($pb in $proben) {
        # try als Ausdruck ($x = try {...}) kann erst PowerShell 7 -
        # auf 5.1 ist das ein Syntaxfehler.
        $ist = '(nicht lesbar)'
        try { $ist = $m.Lines.Item($pb.li).Reference } catch { }
        Schreib ("    {0,-16} Referenz gesetzt {1}  gelesen {2}   z nach [{3}]" -f
                 $pb.name, $pb.ref, $ist, ($pb.v -join ' '))
    }
    Schreib '  Steht dort 0 oder (nicht lesbar), ist die Achse NICHT angekommen -'
    Schreib '  dann die Liste IAxisVMLine oben zurueckschicken.'
}
if ($refFehler -gt 0) {
    Schreib ''
    Schreib "  >>> WARNUNG: bei $refFehler Staeben blieb die Achse ungesetzt."
    Schreib '  >>> Die Bindebleche stehen dann hochkant statt flach, und ihre'
    Schreib '  >>> Biegesteifigkeit liegt um (Breite/Dicke)^2 daneben.'
    Schreib '  >>> NICHT rechnen; den Aufbau von RReference oben zurueckschicken.'
}

# --- 7 - Auflager ------------------------------------------------------------
Abschnitt '7 - Auflager'
<#  AddNodalGlobal nimmt FEDERZAHLEN unmittelbar - RStiffnesses mit x, y, z,
    xx, yy, zz. Der andere Weg, AddNodalGlobal_V153, verlangt den Index eines
    BENANNTEN Federsatzes; auf dieser Anlage heissen die deutsch ("Starr -
    Verschiebung"), auf einer englischen anders. Der Weg ueber die Zahlen ist
    davon unabhaengig - und unsere Drehfeder mit 12452 kNm/rad geht ohnehin
    nur so hinein.

    Einheiten wie im ganzen Modell: kN/m fuer die Verschiebung, kNm/rad fuer
    die Verdrehung.                                                        #>
$STARR = 1e10
foreach ($a in $d.auflager) {
    $n = $kn[$a.knoten]
    if (-not $n) { Schreib "  Auflagerknoten $($a.knoten) fehlt - uebersprungen"; continue }
    $zahl = { param($art, $c)
        switch ($art) { 'Rigid' { $STARR } 'Free' { 0.0 } 'Flexible' { [double]$c } default { 0.0 } } }

    <#  ZWEI FEDERN, ZWEI ORTE.

        Am Ersatzbalken (Auflagermodell 'punkt') sitzt die teilweise
        Einspannung als DREHFEDER yy. Haengt das Ende dagegen an den vier
        Gurten, gibt es keinen Punkt fuer eine Drehfeder: das Stuetzmoment
        tritt dort als Kraeftepaar zwischen Ober- und Untergurt ein, und die
        Einspannung steht als LOTRECHTE Feder am Obergurt.

             k = c_phi / (2 h^2)        je Obergurtknoten [kN/m]

        Bis hierher wurde z immer als Rigid/Free gelesen und cUz_kNm
        verworfen - das ausgeleitete Modell war am Ende gelenkig, ganz gleich
        was die Anwendung gerechnet hatte.                                #>
    $stf = NeuerSatz 'RStiffnesses'
    $stf.x  = & $zahl $a.ux  0
    $stf.y  = & $zahl $a.uy  0
    $stf.z  = & $zahl $a.uz  $a.cUz_kNm
    $stf.xx = & $zahl $a.fix 0
    $stf.yy = & $zahl $a.fiy $a.cFiy_kNm
    $stf.zz = & $zahl $a.fiz 0

    # Linear in beide Richtungen, ohne Widerstandsgrenze.
    $nl = NeuerSatz 'RNonLinearity'
    foreach ($f in 'x','y','z','xx','yy','zz') { $nl.$f = $lnlLinear }
    $ws = NeuerSatz 'RResistances'
    foreach ($f in 'x','y','z','xx','yy','zz') { $ws.$f = 0.0 }

    $r = Versuche "Auflager $($a.ende)" @(
        @{ name = 'NodalSupports.AddNodalGlobal(RStiffnesses, RNonLinearity, RResistances, Knoten)'; tu = {
            $m.NodalSupports.AddNodalGlobal($stf, $nl, $ws, $n) } }
    ) -Positiv
    if (-not $r.ok) { Mitglieder 'NodalSupports' $m.NodalSupports; Beenden 7 "Auflager $($a.ende) nicht anlegbar." }
    Schreib ("    {0} an {1,-14} x {2,12:N0}  y {3,12:N0}  z {4,12:N0}" -f
             $a.ende, $a.knoten, $stf.x, $stf.y, $stf.z)
    Schreib ("      {0,-16}  xx {1,11:N0}  yy {2,12:N1}  zz {3,11:N0}" -f
             '', $stf.xx, $stf.yy, $stf.zz)
}

# --- 8 - Lastfaelle ----------------------------------------------------------
Abschnitt '8 - Lastfaelle'
<#  Je Einwirkungsgruppe ein Lastfall, CHARAKTERISTISCH. Kombiniert wird in
    AxisVM - nur so bleibt ablesbar, welcher Anteil woher kommt. Alle als
    lctStandard: Schnee und Wind als eigene Typen anzulegen wuerde AxisVM
    dazu bringen, selbst Faelle zu erzeugen.                               #>
$lf = @{}; $lfName = @{}; $kbId = @{}
foreach ($f in $d.lastfaelle) {
    $r = Versuche "Lastfall $($f.key)" @(
        @{ name = 'LoadCases.Add(Name, lctStandard)'; tu = { $m.LoadCases.Add($f.label, $lctNormal) } }
    ) -Leise:($lf.Count -gt 0) -Positiv
    if (-not $r.ok) { Mitglieder 'LoadCases' $m.LoadCases; Beenden 8 "Lastfall $($f.label) nicht anlegbar." }
    $lf[$f.key] = $r.wert
    $lfName[$f.key] = $f.label
}
Schreib "  $($lf.Count) Lastfaelle: $($lf.Keys -join ', ')"

# --- 9 - Lasten --------------------------------------------------------------
Abschnitt '9 - Lasten'
<#  Achsen: x Jochachse, y Gleisrichtung, z lotrecht nach OBEN. Die Werte im
    JSON stehen bereits in diesem System - hier wird nichts mehr gedreht.
    Alles global aufgebracht (sysGlobal), damit die lokale Stabdrehung ohne
    Einfluss bleibt.                                                       #>
$nP = 0; $nM = 0; $nQ = 0

foreach ($p in $d.lasten.punkt) {
    $n = $kn[$p.knoten]
    if (-not $n) { Schreib "  Punktlast an unbekanntem Knoten $($p.knoten)"; continue }
    if ($null -eq $lf[$p.lastfall]) { Beenden 9 "Lastfall $($p.lastfall) gibt es nicht." }
    $r = NeuerSatz 'RLoadNodalForce'
    $r.LoadCaseId = $lf[$p.lastfall]
    $r.NodeId = $n
    $r.Fx = 0.0; $r.Fy = 0.0; $r.Fz = 0.0
    $r.Mx = 0.0; $r.My = 0.0; $r.Mz = 0.0
    $r.ReferenceId = 0
    switch ($p.richtung) { 'X' { $r.Fx = $p.wert } 'Y' { $r.Fy = $p.wert } 'Z' { $r.Fz = $p.wert } }
    $e = Versuche 'Punktlast' @(
        @{ name = 'Loads.AddNodalForce(RLoadNodalForce)'; tu = { $m.Loads.AddNodalForce($r) } }
    ) -Leise:($nP -gt 0) -Positiv
    if (-not $e.ok) { Mitglieder 'Loads' $m.Loads; Beenden 9 'Punktlast nicht setzbar.' }
    $nP++
}

foreach ($p in $d.lasten.moment) {
    $n = $kn[$p.knoten]
    if (-not $n) { continue }
    $r = NeuerSatz 'RLoadNodalForce'
    $r.LoadCaseId = $lf[$p.lastfall]
    $r.NodeId = $n
    $r.Fx = 0.0; $r.Fy = 0.0; $r.Fz = 0.0
    $r.Mx = 0.0; $r.My = 0.0; $r.Mz = 0.0
    $r.ReferenceId = 0
    switch ($p.richtung) { 'X' { $r.Mx = $p.wert } 'Y' { $r.My = $p.wert } 'Z' { $r.Mz = $p.wert } }
    $e = Versuche 'Punktmoment' @(
        @{ name = 'Loads.AddNodalForce(RLoadNodalForce), M-Anteil'; tu = { $m.Loads.AddNodalForce($r) } }
    ) -Leise:($nM -gt 0) -Positiv
    if (-not $e.ok) { Beenden 9 'Punktmoment nicht setzbar.' }
    $nM++
}

foreach ($p in $d.lasten.strecke) {
    $li = $st[$p.stab]
    if (-not $li) { Schreib "  Streckenlast auf unbekanntem Stab $($p.stab)"; continue }
    if ($null -eq $lf[$p.lastfall]) { Beenden 9 "Lastfall $($p.lastfall) gibt es nicht." }
    $L = $laenge[$p.stab]
    $r = NeuerSatz 'RLoadBeamDistributed'
    $r.LoadCaseId = $lf[$p.lastfall]
    $r.LineId = $li
    foreach ($f in 'qx1','qy1','qz1','mx1','my1','mz1','qx2','qy2','qz2','mx2','my2','mz2') { $r.$f = 0.0 }
    switch ($p.richtung) {
        'X' { $r.qx1 = $p.wert; $r.qx2 = $p.wert }
        'Y' { $r.qy1 = $p.wert; $r.qy2 = $p.wert }
        'Z' { $r.qz1 = $p.wert; $r.qz2 = $p.wert }
    }
    $r.SystemGLR = $sysGlobal
    $r.Position1 = 0.0
    $r.Position2 = $L
    $r.DistributionType = $brdtLaenge
    $r.Trapezoid = $lbFalsch
    $e = Versuche 'Streckenlast' @(
        @{ name = 'Loads.AddBeamDistributed(RLoadBeamDistributed)'; tu = { $m.Loads.AddBeamDistributed($r) } }
    ) -Leise:($nQ -gt 0) -Positiv
    if (-not $e.ok) { Beenden 9 'Streckenlast nicht setzbar.' }
    $nQ++
}
Schreib "  $nP Punktlasten, $nM Punktmomente, $nQ Streckenlasten"
<#  EIGENGEWICHT DER STAEBE als Last (Weisung).
    AddBeamSelfWeight(LineId, LoadCaseId) je Stab, in den Lastfall der
    staendigen Einwirkung. Ein Starrkoerper bekommt keins: er ist kein
    Stabelement, und sein Ersatzquerschnitt waere ohnehin frei erfunden.
    Das Eigengewicht der Gurte im Knotenbereich kommt dagegen mit - sie
    tragen den Querschnitt ihres Gurtes und dessen Dichte.               #>
$nEg = 0; $nEgNein = 0
$lfG = $lf['G']
if ($lfG) {
    foreach ($sb in $d.staebe) {
        if ((StabArt $sb) -ne 'stab') { continue }
        $li = $st[$sb.name]
        if (-not $li) { continue }
        $ok = $false
        try { $ok = ($m.Loads.AddBeamSelfWeight($li, $lfG) -gt 0) } catch { }
        if ($ok) { $nEg++ } else { $nEgNein++ }
    }
    Schreib ("  {0,-34} Loads.AddBeamSelfWeight(LineId, LoadCaseId)" -f 'Eigengewicht')
    Schreib "    $nEg Staebe im Lastfall '$($d.lastfaelle[0].label)'"
    if ($nEgNein -gt 0) {
        Schreib ''
        Schreib "  >>> WARNUNG: bei $nEgNein Staeben blieb das Eigengewicht ungesetzt."
        Schreib '  >>> Das Joch rechnet dann zu leicht.'
    } else {
        $gefunden.Add('Eigengewicht -> Loads.AddBeamSelfWeight(LineId, LoadCaseId)')
    }
} else {
    Schreib '  >>> Kein staendiger Lastfall - Eigengewicht nicht gesetzt.'
}

try { $m.EndUpdate() } catch { }
try { $m.FitInView() } catch { }

# --- 9b - Lastkombinationen --------------------------------------------------
Abschnitt '9b - Lastkombinationen'
<#  DIE KOMBINATIONEN DER ANWENDUNG (Weisung), damit AxisVM dieselben rechnet
    und nicht eigene erzeugt. Vermessen am 24.08.:

        LoadCombinations.Add(Name, ECombinationType, Double[], Int32[])

    Faktoren und Lastfall-Nummern als zwei gleich lange Felder. Gruppen mit
    Beiwert null stehen gar nicht erst drin - ein Faktor 0 waere eine Zeile
    ohne Wirkung.

    Die Art entscheidet den Typ: was die Anwendung als Tragsicherheit fuehrt,
    kommt als ULS herein, die Gebrauchstauglichkeit als SLS. Die
    charakteristischen Einzelfaelle sind KEIN Nachweis - sie liefern die
    Anteile zum Ablesen und laufen deshalb ebenfalls als SLS.             #>
$komb = @($d.kombinationen)
if ($komb.Count -eq 0) {
    Schreib '  Die Datei fuehrt keine Kombinationen - keine angelegt.'
    Schreib '  (Aeltere Ausleitung: dann in AxisVM selbst kombinieren.)'
} else {
    $ctULS = Aufzaehlung 'ECombinationType' 'ctULS'
    $ctSLS = Aufzaehlung 'ECombinationType' 'ctSLSChar'
    if ($null -eq $ctULS) { $ctULS = 0 }
    if ($null -eq $ctSLS) { $ctSLS = 0 }
    $nK = 0; $nKnein = 0
    foreach ($kb in $komb) {
        $fk = @(); $ids = @()
        foreach ($an in $kb.anteile) {
            $nr = $lf[$an.lastfall]
            if (-not $nr) { continue }
            $fk += [double]$an.faktor
            $ids += [int]$nr
        }
        if ($ids.Count -eq 0) { continue }
        $typ = if ($kb.art -eq 'tragsicherheit') { $ctULS } else { $ctSLS }
        $nr = 0
        try { $nr = $m.LoadCombinations.Add([string]$kb.bez, $typ, [double[]]$fk, [int[]]$ids) }
        catch {
            if ($nKnein -eq 0) {
                Schreib "  >>> LoadCombinations.Add: $($_.Exception.Message -replace "`r?`n", ' ')"
            }
            $nr = 0
        }
        if ($nr -gt 0) { $nK++; $kbId[[string]$kb.bez] = [int]$nr } else { $nKnein++ }
    }
    if ($nK -gt 0) {
        Schreib ("  {0,-34} LoadCombinations.Add(Name, Typ, Faktoren, LastfallIds)" -f 'Kombination')
        $gefunden.Add('Kombination -> LoadCombinations.Add(Name, Typ, Faktoren, LastfallIds)')
    }
    $istK = -1; try { $istK = [int]$m.LoadCombinations.Count } catch { }
    Schreib "    $nK Kombinationen angelegt, $istK im Modell"
    foreach ($kb in $komb) {
        $tx = ($kb.anteile | ForEach-Object { "{0} {1:N2}" -f $_.lastfall, $_.faktor }) -join '  '
        Schreib ("      {0,-46} {1}" -f $kb.bez, $tx)
    }
    if ($nKnein -gt 0) {
        Schreib ''
        Schreib "  >>> WARNUNG: $nKnein Kombinationen kamen nicht zustande."
    }
}

# --- 9c - Zuordnung sichern --------------------------------------------------
<#  WER SPAETER ZURUECKLIEST, BRAUCHT DIE NUMMERN.

    Der Aufbau weiss, welche Linie zu welchem Stab gehoert - er hat sie eben
    angelegt ($st, $kn, $lf). Diese Kenntnis ging bisher mit dem Skript
    unter, und der Abgleich musste sie aus der GEOMETRIE erraten (siehe
    vergleich_axisvm.py: Gurte laufen in Jochachse, Bleche stehen quer).

    Das ging fuer ein Joch. Ueber ein Sortiment ist es eine Fehlerquelle,
    die sich vermeiden laesst: hier wird die Zuordnung aufgeschrieben.

    OHNE BOM. Set-Content -Encoding UTF8 setzt in PowerShell 5.1 eine
    Bytefolge an den Anfang, ueber die sowohl JSON.parse als auch
    json.load stolpern.                                                   #>
Abschnitt '9c - Zuordnung fuer das Zurueckleisen'
$zuDatei = Join-Path $PSScriptRoot 'AxisVM_zuordnung.json'
try {
    $staebeZu = [ordered]@{}
    foreach ($n in ($st.Keys | Sort-Object)) {
        $staebeZu[$n] = [ordered]@{ id = $st[$n]; art = $artVon[$n] }
    }
    $zu = [ordered]@{
        format   = 'tragjoch-axisvm-zuordnung'
        version  = 1
        erzeugt  = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss')
        quelle   = [IO.Path]::GetFileName($Json)
        tragwerk = [string]$d.tragwerk.bezeichnung
        einheiten = $d.einheiten
        knoten   = $kn
        staebe   = $staebeZu
        lastfaelle = $lf
        lastfallNamen = $lfName
        kombinationen = $kbId
    }
    $txt = $zu | ConvertTo-Json -Depth 6
    [IO.File]::WriteAllText($zuDatei, $txt, (New-Object Text.UTF8Encoding $false))
    Schreib "  $zuDatei"
    Schreib ("    {0} Knoten, {1} Staebe, {2} Lastfaelle, {3} Kombinationen" -f
             $kn.Count, $staebeZu.Count, $lf.Count, $kbId.Count)
} catch {
    Schreib "  >>> WARNUNG: Zuordnung nicht geschrieben: $($_.Exception.Message)"
    Schreib '      Ohne sie muss das Zurueckleisen die Staebe raten.'
}

# --- 10 - Sichern ------------------------------------------------------------
Abschnitt '10 - Sichern'
$axs = [IO.Path]::ChangeExtension($Json, '.axs')
$r = Versuche 'Speichern' @(
    @{ name = 'SaveToFile(datei, lbFalse)'; tu = { $m.SaveToFile($axs, $lbFalsch) } }
)
if ($r.ok) { Schreib "  $axs" }
else { Schreib '  nicht gespeichert - das Modell steht offen in AxisVM.' }

<#  =========================================================================
    RECHNEN - NUR AUF AUSDRUECKLICHE WEISUNG.

    Die stehende Regel dieses Werkzeugs lautet: gerechnet wird nicht.
    Lastkombinationen und Berechnung bleiben die Entscheidung des
    Auftraggebers im Programm - ein Modell, das klaglos Unsinn rechnet, ist
    schlimmer als eines, das dasteht und wartet.

    Der Schalter -Rechnen hebt das fuer EINEN Lauf auf. Ohne ihn aendert sich
    nichts; mit ihm wird linear statisch gerechnet, damit sich das Modell
    unmittelbar gegen die Anwendung halten laesst.

    VERMESSEN, NICHT GERATEN (Bericht der Erkundung, AxisVM 18 r1k):
      Calculation.LinearAnalysis (ECalculationUserInteraction)
      ECalculationUserInteraction.cuiNoUserInteractionWithAutoCorrectNoShow = 3
      Results.GetResultsValid (EAnalysisType, int, ELongBoolean)
      EAnalysisType.atLinearStatic = 0
    ========================================================================= #>
if ($Rechnen) {
    Abschnitt '10 - Linear statisch rechnen (auf Weisung)'
    $cui = Aufzaehlung 'ECalculationUserInteraction' 'cuiNoUserInteractionWithAutoCorrectNoShow'
    if ($null -eq $cui) { $cui = 3 }
    $atLin = Aufzaehlung 'EAnalysisType' 'atLinearStatic'
    if ($null -eq $atLin) { $atLin = 0 }

    $r = Versuche 'Berechnung' @(
        @{ name = 'Calculation.LinearAnalysis(cuiNoUserInteractionWithAutoCorrectNoShow)'
           tu = { $m.Calculation.LinearAnalysis($cui) } }
    )
    if (-not $r.ok) {
        Mitglieder 'MODELL.Calculation' $m.Calculation
        Beenden 30 'Die Berechnung liess sich nicht anstossen.'
    }
    Schreib "  Rueckgabe: $($r.wert)"

    # Und nachsehen, ob wirklich etwas herausgekommen ist. Eine Rueckgabe
    # allein ist noch kein Ergebnis.
    $anz = -1
    try { $anz = [int]$m.Results.ResultCaseCount($atLin) } catch { }
    Schreib "  Ergebnisfaelle (linear statisch): $anz"
    if ($anz -le 0) {
        Beenden 31 ('Gerechnet, aber es liegen keine Ergebnisse vor. ' +
                    'Der Bericht oben sagt, wo es stehenblieb.')
    }
    $gefunden.Add('Rechnen -> Calculation.LinearAnalysis(ECalculationUserInteraction)')

    # IM SELBEN LAUF LESEN. Eine neue Instanz kennt nur die gespeicherte
    # Datei - Geometrie ja, Ergebnisse nein.
    if ($Ziel) {
        $nGel = Lies-Schnittgroessen $m $Ziel
        Schreib "  $nGel Lastfaelle nach $Ziel geschrieben."
    }
}

Abschnitt 'Fertig'
if ($Rechnen) {
    Schreib 'Das Modell steht und ist linear statisch gerechnet - auf Weisung.'
    Schreib 'Zum Auslesen: AxisVM_auslesen.cmd bei offenem Modell.'
} else {
    Schreib 'Das Modell steht. NICHT gerechnet - Lastkombinationen und Berechnung'
    Schreib 'bleiben Ihre Entscheidung im Programm.'
}
Schreib ''
Schreib 'Danach: Spannungen je Lastfall ausgeben (Blaetter "vm <Name>") und'
Schreib '        python3 vergleich_axisvm.py <export.xlsx> vergleich_werkzeug.json'
Schreib ''
Schreib 'GEFUNDENE SCHREIBWEISEN - die traegt diese AxisVM-Fassung:'
$gefunden | Select-Object -Unique | ForEach-Object { Schreib "  $_" }

if ($script:alteDatei) {
    Schreib ''
    Schreib ('!' * 74)
    Schreib 'ACHTUNG: die Modelldatei war aelter als dieses Skript -'
    Schreib "         fehlende Merkmale: $($script:alteDatei -join ', ')"
    Schreib '         Das Modell steht, aber nicht so, wie das Werkzeug es heute baut.'
    Schreib ('!' * 74)
}

$zeilen | Set-Content -Path $bericht -Encoding UTF8
Write-Host ''
Write-Host "Bericht: $bericht"
Read-Host "`nWeiter mit Enter"
