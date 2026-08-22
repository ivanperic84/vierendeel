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
    <#  Welche Freiheitsgrade freigegeben werden:
          'M'      alle drei Momente - der Stab haengt, er klemmt nicht
          'axial'  die Stabachse (lokal x) - der Stummel uebertraegt dann
                   nichts in seiner Laengsrichtung. Die Stummel der zweiten
                   Reihe liegen in +-y, ihre Achse IST die y-Richtung: so
                   bleibt x/z gehalten und y frei, ohne Zwaengung im Gurt.
        Sonst gilt die Zeichenkette als Liste der Felder.                 #>
    $felder = switch ($art) {
        'M'      { @('xx', 'yy', 'zz') }
        'axial'  { @('x') }
        'laengs' { @('z') }   # lcsZ der querliegenden Staebe zeigt auf [1,0,0]
        default  { $art -split '[,\s]+' | Where-Object { $_ } }
    }
    <#  'laengs' MEINT DIE JOCHACHSE, nicht die Stabachse.
        Der Stummel liegt in +-y; freigegeben wird seine Querrichtung. Welche
        der beiden lokalen Querachsen das ist, haengt daran, wie AxisVM die
        lokalen Achsen legt - und genau das setzt diese Bruecke noch NICHT.
        Solange das offen ist, wird lieber gar nichts freigegeben: ein zu
        steifer Anschluss ist eine bekannte, benannte Abweichung, eine
        Freigabe in der falschen Richtung ein stiller Fehler.             #>
    if ($art -eq 'laengs' -and -not $script:lcsGesetzt) { return $false }
    $rel = NeuerSatz 'RReleases'
    $typ = $rel.GetType()
    $gesetzt = 0
    foreach ($f in $typ.GetFields([Reflection.BindingFlags]'Public,Instance')) {
        if ($f.Name -notin $felder) { continue }
        $ft = $f.FieldType
        if ($ft.IsEnum) {
            $frei = [Enum]::GetNames($ft) | Where-Object { $_ -match 'Free$|Free_' } |
                    Select-Object -First 1
            if (-not $frei) { continue }
            $f.SetValue($rel, [Enum]::Parse($ft, $frei))
        } else {
            $f.SetValue($rel, 0)          # Feder mit Steifigkeit null
        }
        $gesetzt++
    }
    if ($gesetzt -lt $felder.Count) {
        Schreib "  RReleases: nur $gesetzt von $($felder.Count) Feldern gesetzt - vorhanden:"
        foreach ($f in $typ.GetFields([Reflection.BindingFlags]'Public,Instance')) {
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

# --- Typbibliothek -----------------------------------------------------------
Abschnitt 'Typbibliothek'
$typen = TypbibliothekLaden
if (-not $typen) {
    Beenden 11 ('Die Typbibliothek liess sich nicht lesen. Ohne sie sind ' +
                'Staebe, Auflager und Lasten nicht zu setzen.')
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
            'RReleases','RRelease','RReferencePoint','RReferenceVector'
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
        # Fuer die lokalen Stabachsen - ohne sie ist keine Querfreigabe
        # eindeutig zu setzen.
        Signaturen 'IAxisVMReferences' 'Add'
        Signaturen 'IAxisVMLine' 'SetGeomType'

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

# --- 6 - Staebe --------------------------------------------------------------
Abschnitt '6 - Staebe'
<#  Zwei Schritte: Lines.Add legt die LINIE, DefineAsBeam macht daraus einen
    Balken mit Material und Querschnitt. Beide nehmen Verbund-Typen -
    RLineGeomData (fuer die Gerade leer) und zweimal RPoint3d fuer die
    Ausmitte an den Enden (hier null: unsere Knoten liegen bereits auf den
    Schwerelinien).                                                        #>
$geom = NeuerSatz 'RLineGeomData'
$ecc  = NeuerSatz 'RPoint3d'
$st = @{}; $laenge = @{}
$erste = $true; $nG = 0; $nGnein = 0
$lcsGesetzt = $false   # solange die lokalen Achsen ungesetzt bleiben
foreach ($sb in $d.staebe) {
    $vk = $kn[$sb.von]; $bk = $kn[$sb.bis]; $iq = $qs[$sb.querschnitt]
    if (-not $vk -or -not $bk) { Beenden 6 "Stab $($sb.name): Knoten fehlt." }
    if (-not $iq) { Beenden 6 "Stab $($sb.name): Querschnitt $($sb.querschnitt) fehlt." }
    $r = Versuche 'Stab' @(
        @{ name = 'Lines.Add(i, j, lgtStraightLine, RLineGeomData) + DefineAsBeam'; tu = {
            $li = $m.Lines.Add($vk, $bk, $lgtGerade, $geom)
            if ($li -le 0) { throw "Lines.Add meldet $li" }
            $db = $m.Lines.Item($li).DefineAsBeam($iMat, $iq, $iq, $ecc, $ecc)
            if ($db -le 0) { throw "DefineAsBeam meldet $db" }
            $li } }
    ) -Leise:(-not $erste) -Positiv
    if (-not $r.ok) {
        Mitglieder 'Lines' $m.Lines
        Beenden 6 "Stab $($sb.name) nicht anlegbar."
    }
    $st[$sb.name] = $r.wert
    try { $laenge[$sb.name] = $m.Lines.Item($r.wert).Length } catch { $laenge[$sb.name] = 0 }
    if ($sb.gelenkAnfang -or $sb.gelenkEnde) {
        $li = $m.Lines.Item($r.wert)
        if ($sb.gelenkAnfang) {
            if (GelenkSetzen $li 'Anfang' $sb.gelenkAnfang) { $nG++ } else { $nGnein++ }
        }
        if ($sb.gelenkEnde) {
            if (GelenkSetzen $li 'Ende' $sb.gelenkEnde) { $nG++ } else { $nGnein++ }
        }
    }
    $erste = $false
}
if ($nG -gt 0) { Schreib "  $nG Gelenke gesetzt (zweite Anschlussreihe in y frei)" }
if ($nGnein -gt 0) {
    Schreib ''
    Schreib "  >>> WARNUNG: $nGnein Freigaben wurden NICHT gesetzt."
    Schreib '  >>> Die zweite Anschlussreihe der Haengestuetzen haelt damit auch'
    Schreib '  >>> die Jochachse - der Gurt ist zwischen den Reihen gezwaengt.'
    Schreib '  >>> Grund: die lokalen Stabachsen werden noch nicht gesetzt, und'
    Schreib '  >>> ohne sie waere die Freigaberichtung geraten. Lieber zu steif'
    Schreib '  >>> und benannt als still falsch.'
    Schreib '  >>> Dazu die Signaturen aus AxisVM_pruefen.cmd zurueckschicken.'
}
Schreib "  $($st.Count) Staebe"

<#  NACHGESEHEN - aber am richtigen Merkmal.
    Der erste Versuch fragte IsBeam ab und blieb an BV_R_23_3 haengen. Zu
    Unrecht: IsBeam/IsColumn/IsOtherType teilen die Staebe nach ihrer LAGE
    ein, nicht nach ihrem Elementtyp. Ein senkrechter Stab - und das sind
    alle Vertikalbleche - ist fuer AxisVM eine Stuetze, kein Balken.

    Gefragt ist der ELEMENTTYP: hat DefineAsBeam ueberhaupt ein Stabelement
    erzeugt, oder liegt dort nur eine Linie? Das sagt LineType. Der Wert
    kommt aus der Typbibliothek, nicht aus einer Annahme.                 #>
$ltBalken = $null
$tLT = $typen | Where-Object { $_.Name -eq 'ELineType' } | Select-Object -First 1
if ($tLT) {
    $nm = [Enum]::GetNames($tLT) | Where-Object { $_ -match 'Beam$' } | Select-Object -First 1
    if ($nm) { $ltBalken = [int]([Enum]::Parse($tLT, $nm)) ; Schreib "  Elementtyp Balken: $nm = $ltBalken" }
}
$namen = @($st.Keys)
$stich = @($namen[0], $namen[[int]($namen.Count / 2)], $namen[-1])
foreach ($nm in $stich) {
    $li = $null; try { $li = $m.Lines.Item($st[$nm]) } catch { }
    if (-not $li) { Beenden 6 "Stab $nm ist nicht lesbar." }
    $lt = $null; try { $lt = [int]$li.LineType } catch { }
    $lage = @()
    foreach ($f in 'IsBeam', 'IsColumn', 'IsOtherType') {
        $w = $null; try { $w = $li.$f } catch { }
        if ($w -eq 1) { $lage += $f }
    }
    Schreib ("    {0,-16} LineType {1}   Lage: {2}" -f $nm, $lt, ($lage -join ', '))
    if ($null -ne $ltBalken -and $lt -ne $ltBalken) {
        Beenden 6 ("Stab $nm traegt kein Stabelement (LineType $lt statt " +
                   "$ltBalken) - Material oder Querschnitt haben nicht gegriffen.")
    }
}

Schreib '  Die lokale z-Richtung (lcsZ) wird NICHT gesetzt - AxisVM waehlt sie'
Schreib '  selbst. Fuer die Lasten ist das ohne Belang (global aufgebracht),'
Schreib '  fuer das ABLESEN von My/Mz je Stab ist es zu pruefen.'

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

    $stf = NeuerSatz 'RStiffnesses'
    $stf.x  = & $zahl $a.ux  0
    $stf.y  = & $zahl $a.uy  0
    $stf.z  = & $zahl $a.uz  0
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
    Schreib ("    {0} an Knoten {1}:  x {2:N0}  y {3:N0}  z {4:N0}  xx {5:N0}  yy {6:N1}  zz {7:N0}" -f
             $a.ende, $n, $stf.x, $stf.y, $stf.z, $stf.xx, $stf.yy, $stf.zz)
}

# --- 8 - Lastfaelle ----------------------------------------------------------
Abschnitt '8 - Lastfaelle'
<#  Je Einwirkungsgruppe ein Lastfall, CHARAKTERISTISCH. Kombiniert wird in
    AxisVM - nur so bleibt ablesbar, welcher Anteil woher kommt. Alle als
    lctStandard: Schnee und Wind als eigene Typen anzulegen wuerde AxisVM
    dazu bringen, selbst Faelle zu erzeugen.                               #>
$lf = @{}
foreach ($f in $d.lastfaelle) {
    $r = Versuche "Lastfall $($f.key)" @(
        @{ name = 'LoadCases.Add(Name, lctStandard)'; tu = { $m.LoadCases.Add($f.label, $lctNormal) } }
    ) -Leise:($lf.Count -gt 0) -Positiv
    if (-not $r.ok) { Mitglieder 'LoadCases' $m.LoadCases; Beenden 8 "Lastfall $($f.label) nicht anlegbar." }
    $lf[$f.key] = $r.wert
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
Schreib '  Eigengewicht ist NICHT gesetzt - AxisVM rechnet es selbst aus dem'
Schreib '  Material. In der Datei steht es deshalb auch nicht.'

try { $m.EndUpdate() } catch { }
try { $m.FitInView() } catch { }

# --- 10 - Sichern ------------------------------------------------------------
Abschnitt '10 - Sichern'
$axs = [IO.Path]::ChangeExtension($Json, '.axs')
$r = Versuche 'Speichern' @(
    @{ name = 'SaveToFile(datei, lbFalse)'; tu = { $m.SaveToFile($axs, $lbFalsch) } }
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
