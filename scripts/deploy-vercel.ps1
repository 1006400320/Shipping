[CmdletBinding()]
param(
  [string]$EnvFile = ".env.deploy",
  [switch]$Preview,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Import-DotEnv {
  param([Parameter(Mandatory)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  $lineNumber = 0
  foreach ($line in Get-Content -LiteralPath $Path -Encoding UTF8) {
    $lineNumber++
    $trimmed = $line.Trim()

    if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) {
      continue
    }

    if ($trimmed.StartsWith("export ")) {
      $trimmed = $trimmed.Substring(7).TrimStart()
    }

    $match = [regex]::Match($trimmed, "^(?<key>[A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?<value>.*)$")
    if (-not $match.Success) {
      throw "Invalid env format in $Path at line ${lineNumber}: $line"
    }

    $key = $match.Groups["key"].Value
    $value = $match.Groups["value"].Value.Trim()

    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key, "Process"))) {
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

Import-DotEnv -Path (Join-Path $projectRoot $EnvFile)

if ([string]::IsNullOrWhiteSpace($env:VERCEL_TOKEN)) {
  throw "Missing VERCEL_TOKEN. Set it in $EnvFile or as a process environment variable."
}

if (-not $SkipBuild) {
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) {
    throw "Build failed with exit code $LASTEXITCODE."
  }
}

$deployArgs = @("vercel", "--yes", "--token", $env:VERCEL_TOKEN)
if (-not $Preview) {
  $deployArgs += "--prod"
}

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$deployOutput = & npx.cmd @deployArgs 2>&1
$deployExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
$deployOutput | ForEach-Object { Write-Host $_ }

if ($deployExitCode -ne 0) {
  throw "Vercel deploy failed with exit code $deployExitCode."
}

$deploymentUrl = $deployOutput |
  Where-Object { $_ -match "(Production|Aliased)\s+https://[^\s]+" } |
  ForEach-Object { [regex]::Match($_, "https://[^\s]+").Value.TrimEnd('"', "'", ",") } |
  Select-Object -Last 1

if (-not $deploymentUrl) {
  $deploymentUrl = $deployOutput |
    Where-Object { $_ -match '"url":\s*"https://[^"]+"' } |
    ForEach-Object { [regex]::Match($_, 'https://[^"]+').Value } |
    Select-Object -Last 1
}

if ($deploymentUrl) {
  Write-Host ""
  Write-Host "Deployment URL: $deploymentUrl"
}
