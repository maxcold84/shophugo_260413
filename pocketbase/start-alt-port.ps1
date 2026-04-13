param(
  [int]$Port = 8090,
  [switch]$Dev
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$stateFile = Join-Path $root '.last-dev-port.txt'
$stdoutLog = Join-Path $root ("pb-serve-{0}.log" -f $Port)
$stderrLog = Join-Path $root ("pb-serve-{0}.err.log" -f $Port)
$args = @(
  '-ExecutionPolicy', 'Bypass',
  '-File', "$root\serve-alt-port.ps1",
  '-Port', "$Port"
)

if ($Dev) {
  $args += '-Dev'
}

Remove-Item -LiteralPath $stdoutLog -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $stderrLog -ErrorAction SilentlyContinue

$process = Start-Process -FilePath powershell -ArgumentList $args -WorkingDirectory $root -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru
"$Port" | Set-Content -LiteralPath $stateFile
$process.Id
