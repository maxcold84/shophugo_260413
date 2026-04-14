$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$resolver = Join-Path $root 'resolve-pocketbase.ps1'
$pocketbaseExe = & $resolver

if (-not $pocketbaseExe) {
  exit 1
}

& $pocketbaseExe serve `
  --http=127.0.0.1:8090 `
  --indexFallback=false `
  --dir="$root\pb_data" `
  --hooksDir="$root\pb_hooks" `
  --migrationsDir="$root\pb_migrations" `
  --publicDir="$root\pb_public"
