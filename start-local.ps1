#requires -Version 5.1
$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 5175
$HostAddress = '127.0.0.1'
$PidFile = Join-Path $ProjectRoot '.vite-dev.pid'
$OutLog = Join-Path $ProjectRoot '.vite-dev.out.log'
$ErrLog = Join-Path $ProjectRoot '.vite-dev.err.log'

function Get-PortProcess {
    param([int]$LocalPort)

    $conn = Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if (-not $conn) {
        return $null
    }

    try {
        return Get-CimInstance Win32_Process -Filter "ProcessId = $($conn.OwningProcess)" -ErrorAction Stop
    } catch {
        $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if (-not $process) {
            return $null
        }

        return [pscustomobject]@{
            ProcessId = $process.Id
            Name = $process.ProcessName
        }
    }
}

function Stop-ProcessIfRunning {
    param([int]$ProcessId)

    if ($ProcessId -le 0) {
        return
    }

    $running = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($running) {
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

$previousPid = $null
if (Test-Path -LiteralPath $PidFile) {
    $pidText = (Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
    if ($pidText -match '^\d+$') {
        $previousPid = [int]$pidText
    }
}

$existing = Get-PortProcess -LocalPort $Port
if ($existing) {
    Stop-ProcessIfRunning -ProcessId $existing.ProcessId
}

if ($previousPid) {
    Stop-ProcessIfRunning -ProcessId $previousPid
}

if (-not (Test-Path (Join-Path $ProjectRoot 'node_modules/vite/bin/vite.js'))) {
    throw "Missing dependencies. Run: npm install"
}

if (Test-Path $PidFile) { Remove-Item -LiteralPath $PidFile -Force }
if (Test-Path $OutLog) { Clear-Content -LiteralPath $OutLog }
if (Test-Path $ErrLog) { Clear-Content -LiteralPath $ErrLog }

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source

$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = $env:ComSpec
$processInfo.WorkingDirectory = $ProjectRoot
$processInfo.UseShellExecute = $false
$processInfo.CreateNoWindow = $true
$processInfo.RedirectStandardOutput = $false
$processInfo.RedirectStandardError = $false

$escapedNpm = '"' + ($npm -replace '"', '\"') + '"'
$escapedOutLog = '"' + ($OutLog -replace '"', '\"') + '"'
$escapedErrLog = '"' + ($ErrLog -replace '"', '\"') + '"'
$processInfo.Arguments = "/d /s /c ""$escapedNpm run dev 1> $escapedOutLog 2> $escapedErrLog"""

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $processInfo

$null = $process.Start()

$listener = $null
for ($attempt = 1; $attempt -le 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    $listener = Get-PortProcess -LocalPort $Port
    if ($listener) {
        break
    }

    if ($process.HasExited) {
        break
    }
}

if (-not $listener) {
    $err = if (Test-Path $ErrLog) { Get-Content -LiteralPath $ErrLog -Raw } else { '' }
    $out = if (Test-Path $OutLog) { Get-Content -LiteralPath $OutLog -Raw } else { '' }
    $details = ($err, $out | Where-Object { $_ }) -join "`n"
    throw "Failed to start local service.`n$details"
}

Set-Content -LiteralPath $PidFile -Value $listener.ProcessId
Write-Host "Local service started:"
Write-Host "  URL: http://${HostAddress}:$Port"
Write-Host "  PID: $($listener.ProcessId)"
Write-Host "  Logs: $OutLog"
