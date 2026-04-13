# AGENTS.md

## Mission

Build and maintain a production-ready self-hosted ecommerce boilerplate inside this repository.

This project is **static-first** and **Hypermedia-Driven**.

The browser contract is:
- HTML documents
- HTML fragments

Do not introduce a browser-facing JSON application API.
Do not drift into SPA architecture.

## Core architecture

- **Hugo 0.160.1** owns public crawlable pages, SEO rendering, and static output.
- **PocketBase 0.36+** owns runtime state, privileged actions, validation, fragment rendering, and build orchestration.
- **htmx 2.x** transports HTML fragments.
- **Alpine.js** is for micro-interactions only.
- **localStorage** is convenience state only and never authoritative.

Primary rule:
- Pages are static.
- State is dynamic.

## Hard constraints

- All authoritative money fields must use integer minor units.
- Phase one CMS authentication must use an opaque server-managed session identifier backed by persistent storage.
- Phase one privileged CSRF protection must use a synchronizer-token pattern.
- Final checkout success must never exist unless all authoritative stock decrements succeed.
- If full transactional rollback is unavailable during checkout, use explicit compensating failure handling and preserve an auditable failed order state.
- Phase one includes authenticated cart persistence, guest-to-auth cart merge, and checkout continuity.
- Phase one scope still does **not** include storefront customer account pages, account navigation, order history UI, profile management UI, or customer-auth browsing fragments unless explicitly added by a later contract update.
- Guest cart synchronization must use `POST` and HTML form encoding as non-authoritative intent.
- Stale build locks must be explicitly recoverable and operationally logged.
- Stale-lock recovery must be evaluated independently of `queue_dirty`.
- Storefront export must happen after build-lock acquisition and immediately before Hugo invocation.
- `build_state` must be treated as a singleton operational collection.
- `products.tags` must be a deterministic JSON array of strings.
- `cms_sessions.admin_ref` stores the authenticated superuser record id as text.
- `robots.txt` rules must not block public asset delivery such as `/api/files/`.
- Security failures must fail closed. Do not silently bypass auth because of helper errors.

## Required stack

Use exactly:

- Hugo 0.160.1
- PocketBase 0.36+
- PocketBase single binary
- PocketBase pb_hooks JavaScript only
- PocketBase JS migrations
- htmx 2.x
- Alpine.js
- Tailwind CSS v4 through Hugo `css.TailwindCSS` processing
- TOAST UI Editor for CMS only, self-hosted

## Forbidden

Do not introduce:

- React
- Vue
- Next.js
- Nuxt
- separate Go server
- Node.js app runtime
- npm / yarn / pnpm / bun project pipelines for the app runtime
- CDN frontend assets
- browser-facing JSON APIs
- client-rendered commerce views from JSON
- pseudo-code
- placeholders
- TODO comments
- incomplete stubs
- architecture shortcuts that violate the revised contract documents

## Backend runtime rules

PocketBase is the only long-running application process.

In `pb_hooks`:
- use conservative ES5-style JavaScript
- no arrow functions
- no async/await
- no Promise assumptions
- no ESM import/export
- no class syntax
- no browser globals
- no timer-based debounce
- no in-memory queue state as a substitute for persisted queue state

Use:
- `require()`
- explicit validation
- deterministic handlers
- straightforward synchronous flows where practical

## Working style

When editing this repository:

- preserve architecture boundaries
- prefer simple deterministic implementations
- keep route/path consistency
- keep exported JSON shape stable unless the docs are intentionally revised in the same change
- keep fragment responses HTML-only
- keep CMS and storefront concerns separated
- inspect the relevant docs and existing code before editing
- update migrations whenever durable schema behavior changes
- update the nearest relevant docs whenever behavior changes
- summarize changed files, startup order, rebuild flow, CMS auth flow, export flow, migrations, tests/manual verification, and tradeoffs after completion

## Codex execution rules

When working with Codex in this repository:

- read `AGENTS.md` first, then `docs/implementation-contract.md`, then the focused contract document for the area being changed
- before editing, summarize the specific constraints that apply to the current task
- prefer repo-local skills whenever they match the workflow
- do not improvise around known recurring workflows when a skill already exists
- only spawn subagents when the task is large enough to benefit from parallel discovery, implementation, or review
- when using subagents, wait for all of them and synthesize the result before final edits
- do not spawn subagents for trivial one-file edits
- do not choose convenience over the documented contract; call out conflicts and resolve them in favor of the architecture

### Preferred repo-local skills

Use these repo skills when relevant:

- `.agents/skills/architecture-guardrails`
- `.agents/skills/pb-hooks-es5`
- `.agents/skills/checkout-safety`
- `.agents/skills/build-orchestration`
- `.agents/skills/cms-auth-session`
- `.agents/skills/hugo-export-seo`
- `.agents/skills/migration-discipline`
- `.agents/skills/manual-verification`
- `.agents/skills/contract-review`

### Preferred subagents

Use built-in or custom subagents only when the task is non-trivial.

Recommended roles:
- `explorer` for contract/code discovery
- `worker` for implementation
- `contract-auditor` for contract drift and schema/doc/code mismatch review
- `pb-runtime-guard` for PocketBase auth, checkout, stock, hooks, and migration review
- `hugo-seo-builder` for Hugo, export shape, SEO, robots, sitemap, and static rendering review
- `verification-reviewer` for manual verification and regression review

### When to spawn subagents

For cross-cutting feature work that touches Hugo + PocketBase + migrations + docs:
1. spawn one discovery-oriented subagent
2. spawn one runtime-oriented subagent
3. spawn one Hugo/static/SEO-oriented subagent
4. wait for all results
5. then implement centrally

For review tasks:
1. spawn subagents for security, correctness, architecture drift, and verification as needed
2. wait for all results
3. summarize findings by severity before making or proposing edits

## Documentation hierarchy

Read and follow in priority order:

1. `AGENTS.md` (this file — highest authority)
2. `docs/implementation-contract.md`
3. the focused contract document for the area you are changing
4. current task instructions

## Documentation map

Use these focused documents when working on a specific area:

| Area | Document | Scope |
|------|----------|-------|
| Master contract | `docs/implementation-contract.md` | Cross-cutting rules, schema, phase scope, implementation order |
| CMS auth | `docs/auth-session.md` | Cookie session, login/logout, CSRF, per-request validation |
| Build pipeline | `docs/build-flow.md` | Export, queue, quiet window, lock, rerun, Hugo invocation |
| Checkout | `docs/checkout-rules.md` | Guest cart, authenticated cart, merge rules, checkout submission |
| CMS routes | `docs/cms-routes.md` | Route, auth, handler, and CMS boundary rules |
| CMS UI | `docs/cms-ui-guidelines.md` | Layout, forms, feedback, and TOAST UI Editor usage |
| Data shape | `docs/data-shape.md` | Canonical fields, export shape, rendering-safe policies |
| Fragments | `docs/fragment-contract.md` | Runtime HTML fragment endpoints and htmx contract |
| Inventory | `docs/inventory-policy.md` | Stock authority, merge rules, validation points, decrement policy |
| Migrations | `docs/migrations-policy.md` | Schema discipline, indexes, and reproducibility |
| SEO | `docs/seo-rules.md` | Title/meta/canonical/schema/sitemap/robots rules |
| Error handling | `docs/error-handling.md` | Logging, HTTP status use, failure visibility, HTML error output |
| Deployment | `docs/deployment.md` | Startup, TLS, backup, upgrade, and config policy |
| Testing | `docs/testing-strategy.md` | Smoke tests, verification scenarios, and regression checks |

## Completion expectations

When finishing implementation or review work, summarize:

1. files created or changed
2. startup order impact
3. rebuild flow impact
4. CMS auth flow impact
5. PocketBase record → exported JSON → Hugo page flow impact
6. migrations added or changed
7. tests run or manual verification performed
8. tradeoffs, known limits, and remaining risks

The summary must describe the actual implementation, not intention.
