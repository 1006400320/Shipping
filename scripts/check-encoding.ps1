#Requires -Version 5.1
[CmdletBinding()]
param(
  [string]$Root
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Root)) {
  $scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
  $Root = (Resolve-Path (Join-Path $scriptDirectory '..')).Path
} else {
  $Root = (Resolve-Path $Root).Path
}

$ignoredDirectories = @(
  '.git',
  '.codegraph',
  '.npm-cache',
  '.requirements_doc_render',
  '.requirements_doc_render_word',
  '.vercel',
  'dist',
  'node_modules'
)

$textExtensions = @(
  '.vue',
  '.js',
  '.css',
  '.html',
  '.md',
  '.json',
  '.ps1',
  '.py',
  '.svg'
)

$replacementCharacter = [string][char]0xFFFD
$gbkMojibakeMarker = [string]([char]0x951F) + [string]([char]0x65A4) + [string]([char]0x62F7)
$latinMojibakeMarker = [string]([char]0x00C3) + '|' +
  [string]([char]0x00C2) + '|' +
  [string]([char]0x00D0) + '|' +
  [string]([char]0x00D1) + '|' +
  [string]([char]0x00E6) + '|' +
  [string]([char]0x00E7) + '|' +
  [string]([char]0x00E5) + '|' +
  [string]([char]0x00E4) + '|' +
  [string]([char]0x00E8) + '|' +
  [string]([char]0x00E9) + '|' +
  [string]([char]0x00CA) + '|' +
  [string]([char]0x00CB) + '|' +
  [string]([char]0x0192)

$badTextPatterns = @(
  [PSCustomObject]@{ Name = 'replacement character'; Pattern = [regex]::new([regex]::Escape($replacementCharacter)) },
  [PSCustomObject]@{ Name = 'gbk mojibake marker'; Pattern = [regex]::new([regex]::Escape($gbkMojibakeMarker)) },
  [PSCustomObject]@{ Name = 'latin mojibake marker'; Pattern = [regex]::new($latinMojibakeMarker) }
)

function Test-IsIgnoredPath {
  param([string]$Path)

  $relativePath = Get-RelativePath -Path $Path
  $segments = $relativePath -split '[\\/]'

  foreach ($segment in $segments) {
    if ($ignoredDirectories -contains $segment) {
      return $true
    }
  }

  return $false
}

function Get-RelativePath {
  param([string]$Path)

  $rootPath = [System.IO.Path]::GetFullPath($Root).TrimEnd('\', '/')
  $fullPath = [System.IO.Path]::GetFullPath($Path)

  if ($fullPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $fullPath.Substring($rootPath.Length).TrimStart('\', '/')
  }

  return $fullPath
}

$utf8Decoder = [System.Text.UTF8Encoding]::new($false, $true)
$failures = [System.Collections.Generic.List[string]]::new()

$files = Get-ChildItem -LiteralPath $Root -Recurse -File |
  Where-Object {
    -not (Test-IsIgnoredPath -Path $_.FullName) -and
    ($textExtensions -contains $_.Extension.ToLowerInvariant())
  }

foreach ($file in $files) {
  $relativePath = Get-RelativePath -Path $file.FullName
  $bytes = [System.IO.File]::ReadAllBytes($file.FullName)

  try {
    $content = $utf8Decoder.GetString($bytes)
  } catch {
    $failures.Add("INVALID_UTF8`t$relativePath")
    continue
  }

  foreach ($pattern in $badTextPatterns) {
    $matches = $pattern.Pattern.Matches($content)
    if ($matches.Count -gt 0) {
      $firstMatch = $matches[0]
      $lineNumber = ($content.Substring(0, $firstMatch.Index) -split "`n").Count
      $failures.Add("SUSPECT_TEXT`t$relativePath`tline $lineNumber`t$($pattern.Name)")
    }
  }
}

if ($failures.Count -gt 0) {
  Write-Error ("Encoding check failed:`n" + ($failures -join "`n"))
  exit 1
}

Write-Output "Encoding check passed. Checked $($files.Count) UTF-8 text files."
