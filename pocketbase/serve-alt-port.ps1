param(
  [int]$Port = 8090,
  [switch]$Dev
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$resolver = Join-Path $root 'resolve-pocketbase.ps1'
$pocketbaseExe = & $resolver

if (-not $pocketbaseExe) {
  exit 1
}

$args = @(
  'serve',
  "--http=127.0.0.1:$Port",
  '--indexFallback=false',
  "--dir=$root\pb_data",
  "--hooksDir=$root\pb_hooks",
  "--migrationsDir=$root\pb_migrations",
  "--publicDir=$root\pb_public"
)

if ($Dev) {
  $args = @('--dev') + $args
}

& $pocketbaseExe @args
