param(
  [int]$Port = 8090,
  [switch]$Dev
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

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

pocketbase @args
