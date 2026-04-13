# Deployment Contract

This document defines the deployment, startup, security configuration, backup, and operational policy.

It supplements:
- `AGENTS.md`
- `docs/implementation-contract.md`

If there is any conflict, follow:
1. `AGENTS.md`
2. `docs/implementation-contract.md`
3. `docs/deployment.md`
4. current task instructions

---

## 1. Architecture overview

The production deployment runs exactly two processes:
- **PocketBase** — the only long-running application process (serves `pb_public`, runs hooks, handles API)
- **Hugo** — invoked by PocketBase build hooks as a child process, not a long-running server

No additional runtime processes are required. No Node.js server, no separate Go server.

---

## 2. Startup sequence

```bash
# 1. Ensure Hugo and Tailwind CSS CLI are available in PATH
which hugo  # must resolve
where tailwindcss  # must resolve

# Windows note:
# PocketBase launches Hugo as a child process, so the Tailwind standalone
# executable must resolve from the runtime PATH seen by that process.
# A known-good location is:
# %LOCALAPPDATA%\\Microsoft\\WinGet\\Links\\tailwindcss.exe

# 2. Start PocketBase with explicit repo-local paths
cd pocketbase/
./serve.ps1

# PocketBase will automatically:
#   - apply pending migrations from pb_migrations/
#   - load pb_hooks/main.pb.js
#   - serve pb_public/ as static files
#   - start cron workers defined in hooks
#   - keep index fallback disabled so missing CMS/fragment routes are not masked
```

Hook loading notes:
- treat `pb_hooks/main.pb.js` as the PocketBase JSVM entrypoint
- load shared helper scripts from `main.pb.js` into the same JSVM context
- do not rely on `module.exports` or Node/CommonJS module boundaries inside PocketBase hook entrypoints
- if PocketBase reports `ReferenceError: module is not defined`, check whether a hook file is assuming Node/CommonJS semantics
- if routes return `404` even though hook files exist, first confirm PocketBase is using this repo's `--hooksDir` and not the executable's default external path
- if routes return generic `400` JSON with custom hook paths, check whether helper symbols are crossing JSVM file boundaries incorrectly; prefer loading helpers from `main.pb.js` in one shared context
- if dev logs show `renderLoginPage is not defined`, `renderCheckoutSummary is not defined`, `Cannot read property 'renderLoginPage' of undefined or null`, or `CONFIG is not defined`, treat that as a JSVM callback-scope failure rather than a normal route validation issue

On first startup:
- Create a superuser through PocketBase admin UI at `/_/`
- Seed initial data through CMS at `/cms/login`
- Trigger an initial build through CMS or wait for cron

If Hugo reports `binary with name "tailwindcss" not found using npx`:
- verify `where tailwindcss` succeeds in the same shell context that launches PocketBase
- prefer the Tailwind standalone executable over a repo-local npm install
- on Windows, copy or install `tailwindcss.exe` into `%LOCALAPPDATA%\\Microsoft\\WinGet\\Links\\`
- restart PocketBase after changing machine or user PATH if the service was already running

If `GET /cms/login` returns `404`:
- do not debug the route first
- verify the PocketBase process was started with:
  - `--dir=<repo>/pocketbase/pb_data`
  - `--hooksDir=<repo>/pocketbase/pb_hooks`
  - `--migrationsDir=<repo>/pocketbase/pb_migrations`
  - `--publicDir=<repo>/pocketbase/pb_public`
- the default values may point to the PocketBase binary's own directory, especially when using a globally installed binary
- `serve.ps1` exists to avoid this drift

If a custom HTML route returns generic PocketBase `400` JSON:
- inspect dev logs immediately
- if the response body is:
  - `{"data":{},"message":"Something went wrong while processing your request.","status":400}`
  treat it as hook execution failure
- common repeated local causes have been:
  - JSVM helper state not surviving into route callbacks
  - callback references to symbols that are not stable in PocketBase JSVM
  - mixing Node/CommonJS assumptions into PocketBase hook composition

If you need a disposable debug instance:
- use `powershell -ExecutionPolicy Bypass -File pocketbase/start-alt-port.ps1 -Port <fresh-port> -Dev`
- prefer a fresh localhost port over reusing an unknown old dev instance

If an unknown CMS or fragment path returns the storefront home page:
- check whether PocketBase was started with `--indexFallback=true`
- for this repository, default startup should keep `--indexFallback=false`
- this app uses real static routes from Hugo output, not SPA history fallback

---

## 3. Environment variables and secrets

### Required configuration

Define these in a server-side config file (`pb_hooks/config.js`) or as environment variables. Never commit secrets to the repository.

```javascript
// pb_hooks/config.js — configuration (ES5 only)
var CONFIG = {
    // Session
    SESSION_COOKIE_NAME: "cms_session",
    SESSION_DURATION_HOURS: 4,
    SESSION_COOKIE_SECURE: true,  // set false for local dev without TLS

    // Build
    QUIET_WINDOW_MS: 3000,
    STALE_LOCK_THRESHOLD_MS: 300000,  // 5 minutes
    HUGO_SOURCE_PATH: "hugo-site",
    HUGO_DESTINATION_PATH: "pb_public",

    // Inventory
    LOW_STOCK_THRESHOLD: 5,

    // Site
    SITE_BASE_URL: "https://example.com"
};

module.exports = CONFIG;
```

### Sensitive values

These should be managed through environment variables or PocketBase settings, never hardcoded:
- superuser email and password (set through PocketBase admin UI)
- TLS certificate paths (managed by reverse proxy or PocketBase)
- any future payment gateway keys

---

## 4. TLS and HTTPS

Production deployments must serve over HTTPS.

### Option A: Reverse proxy (recommended)

```nginx
# nginx example
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

### Option B: PocketBase built-in HTTPS

```bash
./pocketbase serve --https="0.0.0.0:443" --origins="https://example.com"
```

PocketBase can automatically manage Let's Encrypt certificates.

### Cookie implications

When TLS is active:
- set `SESSION_COOKIE_SECURE: true` in config
- ensure `SameSite=Strict` on CMS session cookies
- verify cookie `Path` is restricted to `/cms`

---

## 5. Backup and recovery

### What to back up

| Path | Contents | Frequency |
|------|----------|-----------|
| `pb_data/` | SQLite database, uploaded files | Daily minimum |
| `pb_migrations/` | Schema migrations | Git-tracked |
| `pb_hooks/` | Application logic | Git-tracked |
| `hugo-site/` | Hugo source | Git-tracked |

### Backup strategy

```bash
# Simple backup script
#!/bin/bash
BACKUP_DIR="/backups/pocketbase/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Stop writes temporarily or use SQLite online backup
cp -r pocketbase/pb_data/ "$BACKUP_DIR/pb_data/"

echo "Backup completed: $BACKUP_DIR"
```

### Recovery

1. Stop PocketBase
2. Replace `pb_data/` with backup
3. Restart PocketBase (migrations will reconcile if needed)
4. Verify CMS access and storefront rendering

### Critical rule

`pb_data/` contains the SQLite database and all uploaded files. Losing it means losing all content. Back it up regularly.

---

## 6. PocketBase upgrade policy

When upgrading PocketBase:

1. Read the PocketBase changelog for breaking changes
2. Back up `pb_data/` before upgrading
3. Replace the `pocketbase` binary
4. Start PocketBase — it will run any internal migrations
5. Verify:
   - CMS login works
   - product CRUD works
   - build triggers and completes
   - storefront renders correctly
6. Test `pb_hooks` compatibility (Goja runtime may change)

### Version pinning

Document the PocketBase version in use:

```bash
# Check current version
./pocketbase version

# Record in project
echo "pocketbase-version: 0.25.x" >> .env.example
```

---

## 7. Monitoring recommendations

### Health check

```bash
# Simple HTTP health check
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8090/
# Should return 200 when pb_public has content

# Verify custom hook routes are loaded
curl -I http://127.0.0.1:8090/cms/login
curl -I http://127.0.0.1:8090/fragments/cart/checkout-summary
# Both should return 200 and HTML content type

# If either returns generic 400 JSON, inspect dev logs before changing route patterns
```

### Key metrics to watch

- PocketBase process uptime
- `pb_data/` disk usage growth
- Build success/failure ratio (query `build_logs`)
- CMS session count (query `cms_sessions`)
- Response times for storefront pages

### Log monitoring

PocketBase logs to stdout by default. In production, redirect to a file or log aggregator:

```bash
./pocketbase serve 2>&1 | tee /var/log/pocketbase.log
```

---

## 8. Development vs production differences

| Setting | Development | Production |
|---------|-------------|------------|
| `SESSION_COOKIE_SECURE` | `false` | `true` |
| TLS | Not required | Required |
| `baseURL` in Hugo config | `http://localhost:8090/` | `https://example.com/` |
| PocketBase bind | `127.0.0.1:8090` | Behind reverse proxy or `0.0.0.0:443` |
| Backup | Optional | Required |
| Log level | Verbose | Standard |

---

## 9. Verification checklist

Before considering deployment ready, verify:
- PocketBase starts and serves `pb_public/`
- PocketBase is started against this repo's `pb_data/`, `pb_hooks/`, `pb_migrations/`, and `pb_public/` directories
- migrations apply cleanly on fresh database
- `pb_hooks/main.pb.js` loads and custom CMS/fragment routes respond
- `/cms/login` returns HTML rather than generic PocketBase `400` JSON
- `/fragments/cart/checkout-summary` returns HTML rather than generic PocketBase `400` JSON
- CMS login works with HTTPS cookies
- Hugo build completes via cron hook
- robots.txt disallows `/cms/`, `/api/`, `/actions/`, `/fragments/`
- backup script exists and has been tested
- no secrets are committed to the repository
- TLS is configured for production
- session cookies have `Secure` flag in production
