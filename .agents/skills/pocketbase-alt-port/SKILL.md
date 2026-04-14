---
name: pocketbase-alt-port
description: Start the repository's PocketBase app on a fresh localhost port using the repo-local pb_data, pb_hooks, pb_migrations, and pb_public paths. Use when PocketBase would otherwise start against the wrong installation directory, when you need a separate verification instance on another port, or when repeated local PocketBase launches should follow the same safe pattern.
---

# PocketBase Alt Port

Start PocketBase through the repo script instead of invoking a shared binary with implicit defaults.

Use:

```powershell
powershell -ExecutionPolicy Bypass -File pocketbase/start-alt-port.ps1 -Port 8112 -Dev
```

Rules:
- Prefer a fresh localhost port for each verification cycle when debugging hook loading, JSVM scope, or route registration.
- Always keep `--indexFallback=false` so missing CMS or fragment routes fail clearly.
- Always point PocketBase at this repository's `pb_data`, `pb_hooks`, `pb_migrations`, and `pb_public` directories.
- Prefer a repo-local `pocketbase.exe` or set `POCKETBASE_BIN` explicitly when the shell PATH still resolves an older installation.
- Prefer `-Dev` while debugging hooks, routes, templates, or migrations.
- After starting the instance, verify at least:
  - `GET /`
  - `GET /cms/login`
  - `GET /fragments/cart/checkout-summary`

Why this skill exists:
- A globally installed `pocketbase.exe` may default to a different installation's directories.
- That failure mode can make repo hooks and migrations appear to be ignored.
- Starting through the repo scripts keeps the runtime rooted in this workspace.
- `start-alt-port.ps1` makes each debug run explicit, isolated, and easier to reason about when a stale server might be hiding JSVM changes.
- `ensure-alt-port.ps1` still exists for deliberate reuse, but it is not the default debugging path for this repository.

If a route still fails:
- If the repo scripts stop before startup, resolve the PocketBase binary mismatch first.
- Treat `404` on custom CMS/fragment paths as a hook-loading or route-registration problem.
- Treat generic `400` JSON errors on custom routes as a PocketBase JSVM runtime problem and inspect dev logs.
- Treat repeated errors such as `renderLoginPage is not defined`, `renderCheckoutSummary is not defined`, or `CONFIG is not defined` as callback-scope / helper-composition issues inside PocketBase JSVM.
