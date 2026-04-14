param(
  [switch]$AllowOlder
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoBinary = Join-Path $root 'pocketbase.exe'
$candidates = @()
$seen = @{}
$failures = @()

function Add-Candidate {
  param([string]$PathValue)

  if (-not $PathValue) {
    return
  }

  if (-not (Test-Path -LiteralPath $PathValue)) {
    return
  }

  if ($seen.ContainsKey($PathValue)) {
    return
  }

  $seen[$PathValue] = $true
  $script:candidates += $PathValue
}

function Get-VersionText {
  param([string]$BinaryPath)

  try {
    $output = & $BinaryPath version 2>$null
    return [string]::Join(" ", ($output | ForEach-Object { [string]$_ }))
  } catch {
    return ""
  }
}

function Parse-Version {
  param([string]$VersionText)

  $match = [regex]::Match($VersionText, '(\d+)\.(\d+)\.(\d+)')
  if (-not $match.Success) {
    return $null
  }

  return [pscustomobject]@{
    Major = [int]$match.Groups[1].Value
    Minor = [int]$match.Groups[2].Value
    Patch = [int]$match.Groups[3].Value
    Text  = $match.Value
  }
}

Add-Candidate $repoBinary
Add-Candidate $env:POCKETBASE_BIN

try {
  $command = Get-Command pocketbase -ErrorAction Stop
  Add-Candidate $command.Source
} catch {
}

foreach ($candidate in $candidates) {
  $versionText = Get-VersionText -BinaryPath $candidate
  $version = Parse-Version -VersionText $versionText

  if (-not $version) {
    $failures += ($candidate + ' (version output unreadable)')
    continue
  }

  if ($AllowOlder -or $version.Major -gt 0 -or $version.Minor -ge 36) {
    Write-Output $candidate
    exit 0
  }

  $failures += ($candidate + ' (' + $version.Text + ')')
}

$message = @(
  'PocketBase 0.36+ binary could not be resolved.',
  'Checked candidates:',
  ($(if ($failures.Count) { $failures -join [Environment]::NewLine } else { '- none found' })),
  '',
  'Fix one of these before running the repo scripts:',
  '- place pocketbase.exe in D:\cod\codex\pokcet-hugo\pocketbase\',
  '- or set POCKETBASE_BIN to the 0.36+ binary path for this shell/session'
) -join [Environment]::NewLine

Write-Error $message
exit 1
