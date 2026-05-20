[CmdletBinding()]
param(
  [string]$EnvFile = ".env.deploy",
  [switch]$Preview
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

& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
  throw "Build failed with exit code $LASTEXITCODE."
}

$deployArgs = @("vercel", "--yes", "--token", $env:VERCEL_TOKEN)
if (-not $Preview) {
  $deployArgs += "--prod"
}

& npx.cmd @deployArgs
if ($LASTEXITCODE -ne 0) {
  throw "Vercel deploy failed with exit code $LASTEXITCODE."
}
