# Build Flow Contract

This document defines the build orchestration, export sequence, and rebuild rules.

It supplements:
- `AGENTS.md`
- `docs/implementation-contract.md`

If there is any conflict, follow:
1. `AGENTS.md`
2. `docs/implementation-contract.md`
3. `docs/build-flow.md`
4. current task instructions

---

## 1. Build philosophy

This project is static-first.

That means:
- public crawlable storefront pages come from Hugo
- PocketBase is the canonical data source
- storefront rendering is produced by exporting normalized data first and building second
- runtime fragments do not replace the static storefront build contract

Core sequence:
- PocketBase record state
- normalized JSON export
- Hugo static build
- output written to `pb_public`

---

## 2. Build responsibilities

### PocketBase responsibilities
PocketBase is responsible for:
- detecting build-target mutations
- exporting normalized storefront data
- persisting build queue state
- enforcing build lock rules
- invoking Hugo on the same machine
- persisting build logs
- surfacing build state to CMS

### Hugo responsibilities
Hugo is responsible for:
- reading exported JSON data
- rendering product and category pages
- rendering storefront and landing pages
- rendering SEO metadata and structured data
- writing static output for serving through PocketBase `pb_public`

---

## 3. Canonical rebuild flow

Required rebuild flow (12 steps):

1. a build-target mutation occurs
2. PocketBase marks `build_state.queue_dirty = true`
3. PocketBase updates `build_state.last_changed_at`
4. a cron worker evaluates build eligibility
5. stale-lock recovery is evaluated independently of `queue_dirty`
6. the quiet window is enforced using persisted timestamps
7. a persistent build lock is acquired
8. PocketBase exports normalized storefront data immediately before the Hugo invocation
9. Hugo runs against the freshly exported data
10. build output is written into `pb_public`
11. the result is written into `build_logs`
12. if additional build-target mutations arrived during the build, queue exactly one rerun

Export must happen after lock acquisition and before Hugo runs.
Build must never run from stale intended data when fresher exported data can be produced from current canonical records.

---

## 4. Build-target mutations

These mutations must mark the queue dirty when they affect storefront-visible state:
- product create
- product update
- product delete
- category create
- category update
- category delete
- slug changes
- meta title/meta description changes
- visibility changes
- active state changes that alter storefront presence
- canonical/indexability affecting changes

These operations must not trigger rebuilds:
- cart mutations
- authenticated cart synchronization
- login/logout
- CMS page loads
- CMS build status polling
- checkout operations
- stock-only runtime checks that do not alter static storefront output
- fragment retrieval requests

---

## 5. Build queue state model

Build queue state must be persisted using the `build_state` collection.

Phase one requires `build_state` to behave as a singleton operational collection with exactly one authoritative row.

Required fields:
- `queue_dirty`
- `build_running`
- `rerun_requested`
- `last_changed_at`
- `last_built_at`
- `build_started_at`
- `lock_owner` (optional but recommended)

Rules:
- the database is the source of truth for queue state
- queue state must survive process restarts
- only one build may run at a time
- a second full queue must not form while a build is active
- during an active build, additional changes set `rerun_requested = true`
- after the active build finishes, at most one rerun is scheduled from that flag

Must not rely on:
- in-memory booleans as the durable queue source of truth
- timer-based debounce in request handlers
- per-request goroutine-like assumptions in hook logic

---

## 6. Quiet window rules

The rebuild strategy requires a quiet window.

Target rule:
- only start a build when at least 3 seconds have elapsed since the most recent build-target mutation

Implementation rule:
- enforce this using persisted timestamps
- do not implement this with `setTimeout` or timer-based debounce logic in hooks
- the cron cadence may be coarser than the quiet window, but the quiet-window decision must still be based on persisted state

This keeps build orchestration durable and restart-safe.

---

## 7. Locking rules

A build lock must be persistent and authoritative.

Required behavior:
- a build must set `build_running = true` before invoking Hugo
- a build must set `build_started_at = current_time` when the lock is acquired
- concurrent build attempts must see the persisted running state and refuse to start
- finishing the build must clear the running lock
- if a crash leaves stale running state, stale-lock recovery must be explicitly supported

Stale lock policy:
- if `build_running = true` and the configured stale-lock threshold is exceeded, the lock is recoverable
- recovery must occur through:
  - an explicit admin CMS unlock action, or
  - documented startup/cron stale-lock recovery logic
- do not silently clear uncertain locks
- every stale-lock recovery decision must create a `build_logs` entry or equivalent operational record

The implementation may be conservative.
Correctness matters more than aggressive throughput.

---

## 8. Export contract

Before Hugo runs, PocketBase must export normalized storefront data into:
- `hugo-site/data/products.json`
- `hugo-site/data/categories.json`

Export rules:
- export only storefront-needed fields
- flatten relations enough to avoid runtime joins in Hugo
- preserve a deterministic ordering
- preserve a stable data shape
- sanitize derived HTML before export
- fail loudly when required storefront data is invalid

Optional enrichments may fail softly.
Required storefront data must fail the build.

### Product description export rule
Canonical authoring source: `description_markdown`
Derived storefront rendering source: sanitized HTML derived from Markdown

Rules:
- Markdown is canonical
- raw editor output is never the rendering contract
- Hugo receives safe derived HTML, not untrusted editor output

---

## 9. Hugo build contract

Hugo must render from exported normalized data.

Expected Hugo data sources:
- `hugo.Data.products`
- `hugo.Data.categories`

Hugo is responsible for producing:
- product pages, category pages, landing pages
- metadata tags, canonical tags
- robots.txt, sitemap, structured data

Tailwind contract for this repository:
- keep CSS processing on Hugo native `css.TailwindCSS`
- enable Hugo `buildStats` and mount `hugo_stats.json` into assets for class discovery
- keep the CSS entry file sourcing `hugo_stats.json`
- defer CSS rendering from the base template through a dedicated partial so Tailwind runs after page rendering data is available
- on Windows, the Tailwind standalone executable must be reachable from the PATH seen by the PocketBase -> Hugo child process chain

Build output must be written directly into:
- `pocketbase/pb_public`

Do not build into an unrelated directory and copy later unless the implementation documents a strict reason.

---

## 10. Build logs contract

Each build attempt must produce a log record in `build_logs`.

Required logged information:
- status
- triggered source or trigger category
- output or summarized diagnostics
- duration where available

Additional requirement:
- stale-lock recovery actions must also produce an operationally visible log record

---

## 11. Reference patterns

### Cron worker registration

```javascript
// pb_hooks/build.pb.js — cron worker (ES5 only)
cronAdd("build_check", "*/5 * * * * *", function() {
    var states = $app.findRecordsByFilter("build_state", "id != ''", "", 1, 0);
    if (!states || states.length === 0) { return; }

    var state = states[0];
    if (state.getBool("build_running")) {
        // Check stale lock threshold first, even when queue_dirty is false
        var startedAt = state.getDateTime("build_started_at").time().unixMilli();
        var now = Date.now();
        var staleLockMs = 300000; // 5 minutes
        if ((now - startedAt) > staleLockMs) {
            logBuild($app, "failed", "stale_lock_recovery", "Stale lock cleared after threshold.");
            state.set("build_running", false);
            $app.save(state);
        }
        return;
    }
    if (!state.getBool("queue_dirty")) { return; }

    // Quiet window check (3 seconds)
    var lastChanged = state.getDateTime("last_changed_at").time().unixMilli();
    var now2 = Date.now();
    if ((now2 - lastChanged) < 3000) { return; }

    // Acquire lock and build
    state.set("build_running", true);
    state.set("build_started_at", new Date().toISOString());
    state.set("queue_dirty", false);
    state.set("rerun_requested", false);
    $app.save(state);

    runBuild($app, state);
});
```

### Hugo invocation

```javascript
// pb_hooks/build.pb.js — Hugo build runner (ES5 only)
function runBuild(app, state) {
    var startMs = Date.now();
    var result;

    try {
        // Export data first
        exportStorefrontData(app);

        // Run Hugo
        var cmd = $os.exec("hugo", "--source", "hugo-site", "--destination", "../pb_public");
        cmd.dir = __hooks;  // or configured base path
        var output = String.fromCharCode.apply(null, cmd.output());

        result = { status: "success", output: output };
    } catch (e) {
        result = { status: "failed", output: String(e) };
    }

    var durationMs = Date.now() - startMs;
    logBuild(app, result.status, "cron", result.output, durationMs);

    // Release lock
    state.set("build_running", false);
    state.set("last_built_at", new Date().toISOString());

    // Check rerun
    var fresh = app.findRecordsByFilter("build_state", "id != ''", "", 1, 0);
    if (fresh && fresh.length > 0 && fresh[0].getBool("rerun_requested")) {
        fresh[0].set("queue_dirty", true);
        fresh[0].set("rerun_requested", false);
        app.save(fresh[0]);
    }

    app.save(state);
}
```

---

## 12. Review checklist

Before considering build-flow work complete, verify:
- export always happens before build
- queue state is DB-backed and restart-safe
- only one build runs at a time
- rerun behavior is bounded to exactly one queued rerun while a build is active
- quiet-window enforcement uses persisted timestamps
- no timer-based debounce logic exists in hooks
- stale-lock recovery is explicit, recoverable, and logged
- build failures surface in CMS visibility paths
- build output lands in `pb_public`
