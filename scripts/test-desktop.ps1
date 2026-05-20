$ErrorActionPreference = 'Continue'
Remove-Item env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
Write-Host "ELECTRON_RUN_AS_NODE: '$env:ELECTRON_RUN_AS_NODE'"

Get-Process | Where-Object { $_.ProcessName -like '*Joda*' } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$jdir = Join-Path $env:APPDATA 'Joda Company'
if (Test-Path "$jdir\joda-offline.db") { Remove-Item "$jdir\joda-offline.db" -Force }
if (Test-Path "$env:TEMP\joda-electron-boot.log") { Remove-Item "$env:TEMP\joda-electron-boot.log" -Force }

$exe = 'c:\Users\KEPSEU Franck\Documents\Gestion_Joda\release\win-unpacked\Joda Company.exe'
$p = Start-Process -FilePath $exe -PassThru
Write-Host "Launched PID=$($p.Id)"
Start-Sleep -Seconds 45

$alive = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
Write-Host "Alive at 30s: $($alive -ne $null)"

$db = Test-Path "$jdir\joda-offline.db"
Write-Host "SQLite DB created: $db"
if ($db) { Write-Host "  DB size: $((Get-Item "$jdir\joda-offline.db").Length) bytes" }

$jodaProcs = Get-Process | Where-Object { $_.ProcessName -like '*Joda*' }
$ports = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $jodaProcs.Id -contains $_.OwningProcess }
Write-Host "Listening ports: $($ports.LocalPort -join ', ')"
if ($ports) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$($ports[0].LocalPort)/fr/login" -UseBasicParsing -TimeoutSec 6
    Write-Host "HTTP /fr/login: $($r.StatusCode) ($($r.Content.Length) bytes)"
    if ($r.Content -match 'login-identifier') { Write-Host "  login-identifier testid: FOUND" }
  } catch { Write-Host "HTTP error: $($_.Exception.Message)" }
}

Get-Process | Where-Object { $_.ProcessName -like '*Joda*' } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "=== EARLY LOG ==="
Get-Content "$env:TEMP\joda-electron-boot.log" -ErrorAction SilentlyContinue
