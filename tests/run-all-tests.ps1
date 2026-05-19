#Requires -Version 5.1
<#
.SYNOPSIS
    Lance tous les tests fonctionnels Playwright du projet Gestion Joda, un apres l'autre.

.DESCRIPTION
    - Verifie les prerequis (Node, .env.local, dependances)
    - Installe les navigateurs Playwright si necessaire
    - Lance les 22 fichiers de tests sequentiellement (module 1 a 22)
    - Genere un rapport HTML consolide dans tests/.report
    - Affiche un resume global

.EXAMPLE
    .\tests\run-all-tests.ps1                    # Execution complete
    .\tests\run-all-tests.ps1 -Headed            # Voir le navigateur
    .\tests\run-all-tests.ps1 -Module 7          # Un seul module
    .\tests\run-all-tests.ps1 -KeepData          # Ne pas nettoyer la base apres
    .\tests\run-all-tests.ps1 -SkipWebServer     # Si le serveur tourne deja
#>

[CmdletBinding()]
param(
    [int]$Module,
    [switch]$Headed,
    [switch]$KeepData,
    [switch]$SkipWebServer,
    [switch]$StopOnFail,
    [switch]$OpenReport
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Write-Section {
    param([string]$msg)
    $sep = '=' * 70
    Write-Host ""
    Write-Host $sep -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host $sep -ForegroundColor Cyan
}

function Write-Step {
    param([string]$msg)
    Write-Host ">> $msg" -ForegroundColor Yellow
}

function Write-OK {
    param([string]$msg)
    Write-Host "[OK] $msg" -ForegroundColor Green
}

function Write-Fail {
    param([string]$msg)
    Write-Host "[FAIL] $msg" -ForegroundColor Red
}

Write-Section "JODA COMPANY - Suite de tests fonctionnels"

# 1. Verifications prerequis
Write-Step "Verification de Node.js"
$nodeVer = & node --version 2>$null
if (-not $nodeVer) { throw "Node.js non trouve. Installe Node 18+." }
Write-OK "Node.js $nodeVer"

Write-Step "Verification de .env.local"
$envPath = Join-Path $ProjectRoot ".env.local"
if (-not (Test-Path $envPath)) {
    throw ".env.local introuvable. Cree-le depuis .env.example avec les cles Supabase."
}
$envContent = Get-Content $envPath -Raw
foreach ($k in @('NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY')) {
    if ($envContent -notmatch "(?m)^$k\s*=\s*\S") {
        throw "Variable manquante dans .env.local : $k"
    }
}
Write-OK ".env.local valide"

Write-Step "Verification node_modules"
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
    Write-Host "  Installation des dependances..."
    & npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install a echoue" }
}
Write-OK "node_modules present"

Write-Step "Verification de @playwright/test"
$pwPkg = Join-Path $ProjectRoot "node_modules\@playwright\test\package.json"
if (-not (Test-Path $pwPkg)) {
    Write-Host "  Installation de @playwright/test..."
    & npm install -D "@playwright/test" dotenv
    if ($LASTEXITCODE -ne 0) { throw "Installation Playwright echouee" }
}
Write-OK "@playwright/test present"

Write-Step "Verification navigateur Chromium"
$pwCachePath = Join-Path $env:LOCALAPPDATA "ms-playwright"
$browserInstalled = $false
if (Test-Path $pwCachePath) {
    $count = (Get-ChildItem $pwCachePath -ErrorAction SilentlyContinue | Measure-Object).Count
    if ($count -gt 0) { $browserInstalled = $true }
}
if (-not $browserInstalled) {
    & npx playwright install chromium
    if ($LASTEXITCODE -ne 0) { Write-Host "  (warning) Installation chromium echouee" -ForegroundColor DarkYellow }
} else {
    Write-OK "Chromium deja installe"
}

# 2. Variables d'environnement runtime
if ($KeepData) { $env:E2E_KEEP_DATA = '1' }
if ($SkipWebServer) { $env:E2E_SKIP_WEBSERVER = '1' }

# Tableau de modules : on n'utilise PAS [ordered]@{} car PowerShell 5.1 a des
# problèmes de coercion sur les clés numériques. Tableau de hashtables = simple et fiable.
$moduleDefs = @(
    @{ Num =  1; Title = 'Authentification'      ; Spec = 'tests/e2e/01-auth.spec.ts' }
    @{ Num =  2; Title = 'Etudiants'             ; Spec = 'tests/e2e/02-etudiants.spec.ts' }
    @{ Num =  3; Title = 'Candidatures'          ; Spec = 'tests/e2e/03-candidatures.spec.ts' }
    @{ Num =  4; Title = 'Universites'           ; Spec = 'tests/e2e/04-universites.spec.ts' }
    @{ Num =  5; Title = 'Utilisateurs staff'    ; Spec = 'tests/e2e/05-utilisateurs.spec.ts' }
    @{ Num =  6; Title = 'Dossiers bourses'      ; Spec = 'tests/e2e/06-dossiers.spec.ts' }
    @{ Num =  7; Title = 'Paiements'             ; Spec = 'tests/e2e/07-paiements.spec.ts' }
    @{ Num =  8; Title = 'Cours langues'         ; Spec = 'tests/e2e/08-cours-langues.spec.ts' }
    @{ Num =  9; Title = 'Comptabilite'          ; Spec = 'tests/e2e/09-comptabilite.spec.ts' }
    @{ Num = 10; Title = 'Configuration frais'   ; Spec = 'tests/e2e/10-configuration-frais.spec.ts' }
    @{ Num = 11; Title = 'Communication'         ; Spec = 'tests/e2e/11-communication.spec.ts' }
    @{ Num = 12; Title = 'Newsletter'            ; Spec = 'tests/e2e/12-newsletter.spec.ts' }
    @{ Num = 13; Title = 'Logs activites'        ; Spec = 'tests/e2e/13-logs.spec.ts' }
    @{ Num = 14; Title = 'Notifications'         ; Spec = 'tests/e2e/14-notifications.spec.ts' }
    @{ Num = 15; Title = 'Performances'          ; Spec = 'tests/e2e/15-performances.spec.ts' }
    @{ Num = 16; Title = 'Stockage'              ; Spec = 'tests/e2e/16-stockage.spec.ts' }
    @{ Num = 17; Title = 'Portail etudiant'      ; Spec = 'tests/e2e/17-portail-etudiant.spec.ts' }
    @{ Num = 18; Title = 'Documents'             ; Spec = 'tests/e2e/18-documents.spec.ts' }
    @{ Num = 19; Title = 'Tableau de bord'       ; Spec = 'tests/e2e/19-dashboard.spec.ts' }
    @{ Num = 20; Title = 'Internationalisation'  ; Spec = 'tests/e2e/20-i18n.spec.ts' }
    @{ Num = 21; Title = 'Securite'              ; Spec = 'tests/e2e/21-securite.spec.ts' }
    @{ Num = 22; Title = 'Cron'                  ; Spec = 'tests/e2e/22-cron.spec.ts' }
)

if ($Module) {
    $modulesToRun = @($moduleDefs | Where-Object { $_.Num -eq $Module })
    if ($modulesToRun.Count -eq 0) {
        Write-Fail "Module $Module inconnu (1-22)"
        exit 1
    }
} else {
    $modulesToRun = $moduleDefs
}

$results = @()
$totalPassed = 0
$totalFailed = 0
$globalStart = Get-Date

foreach ($mod in $modulesToRun) {
    $i = $mod.Num
    $title = $mod.Title
    $spec = $mod.Spec

    Write-Section "MODULE $i - $title"
    Write-Host "  $spec" -ForegroundColor DarkGray

    $moduleStart = Get-Date

    $pwArgs = @($spec, '--reporter=list', '--workers=1')
    if ($Headed) { $pwArgs += '--headed' }

    # Sur Windows, npx est en réalité npx.cmd. Start-Process veut un .exe,
    # donc on utilise le call operator `&` qui gère bien les .cmd/.ps1.
    & npx playwright test @pwArgs
    $exitCode = $LASTEXITCODE

    $duration = ((Get-Date) - $moduleStart).TotalSeconds
    $durationFmt = [math]::Round($duration, 1)

    if ($exitCode -eq 0) {
        Write-OK "Module $i ($durationFmt s)"
        $totalPassed++
        $results += [pscustomobject]@{ Module = $i; Titre = $title; Statut = 'PASS'; Duree = $duration }
    } else {
        Write-Fail "Module $i ($durationFmt s) - exit code $exitCode"
        $totalFailed++
        $results += [pscustomobject]@{ Module = $i; Titre = $title; Statut = 'FAIL'; Duree = $duration }
        if ($StopOnFail) {
            Write-Host ""
            Write-Host "Arret demande apres echec (StopOnFail)" -ForegroundColor Red
            break
        }
    }
}

$globalDuration = ((Get-Date) - $globalStart).TotalSeconds
$globalDurationFmt = [math]::Round($globalDuration, 1)
$failColor = 'Green'
if ($totalFailed -gt 0) { $failColor = 'Red' }

Write-Section "RESUME GLOBAL"
$results | Format-Table -AutoSize Module, Titre, Statut, @{ Name = 'Duree (s)'; Expression = { [math]::Round($_.Duree, 1) } }

Write-Host ""
Write-Host "Modules passes  : $totalPassed" -ForegroundColor Green
Write-Host "Modules echoues : $totalFailed" -ForegroundColor $failColor
Write-Host "Duree totale    : $globalDurationFmt s" -ForegroundColor Cyan
Write-Host ""

$reportPath = Join-Path $ProjectRoot 'tests\.report\index.html'
if (Test-Path $reportPath) {
    Write-Host "Rapport HTML : $reportPath" -ForegroundColor Cyan
    if ($OpenReport) { Start-Process $reportPath }
}

$csvPath = Join-Path $ProjectRoot 'tests\.report\summary.csv'
$null = New-Item -ItemType Directory -Path (Split-Path $csvPath) -Force -ErrorAction SilentlyContinue
$results | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
Write-Host "Synthese CSV : $csvPath" -ForegroundColor Cyan

if ($totalFailed -gt 0) { exit 1 } else { exit 0 }
