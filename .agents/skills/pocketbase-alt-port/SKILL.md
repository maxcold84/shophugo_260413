---
name: pocketbase-alt-port
description: Start the repository's PocketBase app on a fresh localhost port using the repo-local pb_data, pb_hooks, pb_migrations, and pb_public paths. Use when PocketBase would otherwise start against the wrong installation directory, when you need a separate verification instance on another port, or when repeated local PocketBase launches should follow the same safe pattern.
---

# PocketBase Alt Port

Start PocketBase through the repo script instead of invoking a shared binary with implicit defaults.

Use:

```powershell
powershell -ExecutionPolicy Bypass -File pocketbase/ensure-alt-port.ps1 -Port 8112 -Dev
```

Rules:
- Prefer the currently running repo-local PocketBase port first.
- Only start a fresh localhost port when no reusable local verification instance is already running.
- Always keep `--indexFallback=false` so missing CMS or fragment routes fail clearly.
- Always point PocketBase at this repository's `pb_data`, `pb_hooks`, `pb_migrations`, and `pb_public` directories.
- Prefer `-Dev` while debugging hooks, routes, templates, or migrations.
- After starting the instance, verify at least:
  - `GET /`
  - `GET /cms/login`
  - `GET /fragments/cart/checkout-summary`

Why this skill exists:
- A globally installed `pocketbase.exe` may default to a different installation's directories.
- That failure mode can make repo hooks and migrations appear to be ignored.
- Starting through the repo scripts keeps the runtime rooted in this workspace.
- `ensure-alt-port.ps1` avoids spawning unnecessary extra local servers by reusing the last known active port when possible.

If a route still fails:
- Treat `404` on custom CMS/fragment paths as a hook-loading or route-registration problem.
- Treat generic `400` JSON errors on custom routes as a PocketBase JSVM runtime problem and inspect dev logs.
- Treat repeated errors such as `renderLoginPage is not defined`, `renderCheckoutSummary is not defined`, or `CONFIG is not defined` as callback-scope / helper-composition issues inside PocketBase JSVM.
