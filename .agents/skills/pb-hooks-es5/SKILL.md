---
name: pb-hooks-es5
description: Implement and review PocketBase pb_hooks code under conservative ES5-only, restart-safe runtime rules.
---

Use this skill whenever a task edits `pocketbase/pb_hooks/**` or introduces hook-side helper logic.

## Runtime target
PocketBase 0.36+ with pb_hooks JavaScript only.

## Required coding rules
- Use conservative ES5-style JavaScript.
- Use `require()` only in plain helper `.js` files when the runtime behavior is proven stable.
- No arrow functions.
- No async/await.
- No Promise assumptions.
- No ESM import/export.
- No class syntax.
- No browser globals.
- No timer-based debounce.
- No in-memory queue state as durable truth.

## Preferred style
- Deterministic handlers.
- Explicit validation and early rejection.
- Straightforward synchronous flows where practical.
- Prefer small self-contained `*.pb.js` route entrypoints over Node/CommonJS-style multi-file composition.
- Small helpers with clear ownership.
- Clear fail-closed behavior for security-sensitive paths.

## Review checklist
1. Confirm the code can run under conservative PocketBase hook JS assumptions.
2. Confirm no syntax requires a modern browser or Node runtime.
3. Confirm no timers or ephemeral in-memory state are used for durable workflow control.
4. Confirm helper failures do not silently bypass auth, stock, or build safety.
5. Confirm logs are meaningful and conservative.

## Typical file targets
- `cms-login.pb.js`
- `cms-dashboard-min.pb.js`
- `cms-builds-min.pb.js`
- `cms-products-min.pb.js`
- `cms-categories-min.pb.js`
- `checkoutsummary.pb.js`
- `utils.js`
- `config.js`

## Finish by reporting
- ES5 compatibility risks found or avoided
- fail-closed decisions
- any restart-safety implications
