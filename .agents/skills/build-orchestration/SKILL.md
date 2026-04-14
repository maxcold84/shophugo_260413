---
name: build-orchestration
description: Maintain restart-safe build queueing, stale-lock recovery, export timing, and Hugo invocation rules.
---

Use this skill whenever a task touches export, build queue state, Hugo invocation, cron behavior, build logs, or stale-lock handling.

## Compose with pocketbase-alt-port
When build verification needs a fresh local PocketBase instance, use `.agents/skills/pocketbase-alt-port/SKILL.md` together with this skill.
Prefer:
- `powershell -ExecutionPolicy Bypass -File pocketbase/start-alt-port.ps1 -Port <fresh-port> -Dev`
- a fresh localhost port when build/export behavior may be masked by an older dev server
- repo-local `pb_data`, `pb_hooks`, `pb_migrations`, and `pb_public` only

Use this composition when:
- the global PocketBase binary may point at the wrong default directories
- a stale dev server could hide build/export changes
- you need to inspect build hook behavior without disturbing another local instance

## Canonical flow
1. A build-target mutation occurs.
2. PocketBase marks `build_state.queue_dirty = true`.
3. PocketBase updates `build_state.last_changed_at`.
4. A cron worker evaluates build eligibility.
5. Stale-lock recovery is evaluated independently of `queue_dirty`.
6. The quiet window is enforced using persisted timestamps.
7. A persistent build lock is acquired.
8. PocketBase exports normalized storefront data immediately before Hugo invocation.
9. Hugo runs against the freshly exported data.
10. Output is written into `pb_public`.
11. Result is written into `build_logs`.
12. If changes arrived during the build, queue exactly one rerun.

## Hard rules
- `build_state` is a singleton operational collection.
- Queue state must survive restarts.
- Only one build may run at a time.
- Do not use timer-based debounce in hooks.
- Do not use in-memory queue state as durable truth.
- Do not silently clear uncertain locks.
- Stale-lock recovery must be explicitly logged.

## Export rules
- Export after lock acquisition and before Hugo runs.
- Export only storefront-needed fields.
- Preserve deterministic ordering and stable field names.
- Sanitize derived HTML before export.
- Fail loudly when required storefront data is invalid.

## Review checklist
1. Does stale-lock recovery run even when `queue_dirty` is false?
2. Is build start gated by persisted timestamps instead of timers?
3. Is rerun logic capped to one queued rerun during an active build?
4. Does any failure surface in build logs and CMS status?
5. Is Hugo invoked with the intended source and destination paths?

## Finish by reporting
- build flow impact
- lock/recovery behavior
- export timing correctness
- rerun behavior
