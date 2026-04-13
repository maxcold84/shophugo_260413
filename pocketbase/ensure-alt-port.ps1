param(
  [int]$Port = 8090,
  [switch]$Dev
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$stateFile = Join-Path $root '.last-dev-port.txt'

function Test-PortOpen {
  param([int]$TestPort)

  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $async = $tcp.BeginConnect('127.0.0.1', $TestPort, $null, $null)
    $ok = $async.AsyncWaitHandle.WaitOne(500)
    if (-not $ok) {
      $tcp.Close()
      return $false
    }
    $tcp.EndConnect($async)
    $tcp.Close()
    return $true
  } catch {
    return $false
  }
}

if (Test-Path $stateFile) {
  $savedPort = Get-Content -LiteralPath $stateFile -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($savedPort) {
    $savedPortInt = [int]$savedPort
    if (Test-PortOpen -TestPort $savedPortInt) {
      Write-Output $savedPortInt
      exit 0
    }
  }
}

if (Test-PortOpen -TestPort $Port) {
  "$Port" | Set-Content -LiteralPath $stateFile
  Write-Output $Port
  exit 0
}

$args = @(
  '-ExecutionPolicy', 'Bypass',
  '-File', "$root\start-alt-port.ps1",
  '-Port', "$Port"
)

if ($Dev) {
  $args += '-Dev'
}

$null = powershell @args
Start-Sleep -Seconds 2
"$Port" | Set-Content -LiteralPath $stateFile
Write-Output $Port
