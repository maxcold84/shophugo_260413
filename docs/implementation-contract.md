# Master Implementation Contract

## 1. Mission

Build a production-ready self-hosted ecommerce boilerplate using a static-first Hypermedia-Driven Application architecture.

The browser contract is:
- HTML documents
- HTML fragments

The browser contract is not:
- a browser-facing JSON application API
- a SPA state protocol
- a client-rendered product catalog

Primary rule:
- Pages are static.
- State is dynamic.

---

## 2. Architecture ownership

### Hugo owns
- public crawlable storefront pages
- product pages, category pages, landing pages
- SEO-critical rendering (title/meta/canonical/OG/Twitter/sitemap/robots/structured data)
- static rendering from exported normalized JSON

### PocketBase owns
- the only long-running application process
- CMS routes and session validation
- privileged mutations
- runtime HTML fragments
- cart validation, stock validation, checkout preparation
- authoritative order creation
- build queue persistence, build execution, build logs

### Client enhancement owns only
- htmx requests/swaps
- Alpine micro-interactions
- guest cart draft UX in localStorage
- recently viewed items and small UI preferences

The client is never authoritative for:
- price, stock, cart totals, checkout totals, order state, authorization, payment state

---

## 3. Required stack

Use exactly:
- Hugo
- PocketBase single binary
- PocketBase pb_hooks JavaScript only
- PocketBase JS migrations
- htmx 2.x
- Alpine.js
- Tailwind CSS v4 via Hugo css.TailwindCSS only
- TOAST UI Editor for CMS only, self-hosted

Do not introduce:
- React, Vue, Next.js, Nuxt
- separate Go server or Node.js app runtime
- npm/yarn/pnpm/bun pipelines
- CDN frontend assets
- browser-facing JSON APIs
- client-rendered catalog views from JSON
- placeholder code, TODO comments, incomplete stubs

---

## 4. Phase one scope

Phase one includes:
- public storefront pages
- CMS auth and CRUD
- product/category management
- build status visibility
- guest cart draft flow
- authenticated cart flow
- guest-to-auth cart merge
- checkout prepare and submit
- authoritative order creation
- stock decrement
- SEO output
- runtime HTML fragments

Phase one excludes:
- storefront customer account system
- customer-auth fragments
- account navigation fragments
- payment gateway integration
- browser-facing payment APIs

Clarification:
- Phase one may use a server-side authenticated customer identity only for authoritative cart persistence, cart merge, and checkout continuity.
- This does not imply a full storefront customer account system.
- Phase one still excludes customer account pages, account navigation, profile management, order history UI, and customer-auth-specific browsing fragments.

---

## 5. Repository structure

```
pocketbase/
├── pocketbase
├── pb_data/
├── pb_public/
├── pb_hooks/
│   ├── views/
│   │   ├── cms/
│   │   └── hda/
│   ├── auth.pb.js
│   ├── build.pb.js
│   ├── cms.pb.js
│   ├── products.pb.js
│   ├── categories.pb.js
│   ├── cart.pb.js
│   ├── checkout.pb.js
│   ├── stock.pb.js
│   ├── utils.js
│   └── config.js
├── pb_migrations/
└── hugo-site/
    ├── assets/
    │   ├── css/input.css
    │   └── js/
    ├── content/
    ├── data/
    │   ├── products.json
    │   └── categories.json
    ├── layouts/
    ├── static/
    └── config.toml
```

---

## 6. Backend runtime rules

PocketBase is the only long-running application process.

In pb_hooks:
- use conservative ES5-style JavaScript
- no arrow functions
- no async/await
- no Promise assumptions
- no ESM import/export
- no class syntax
- no browser globals
- no timer-based debounce
- no in-memory queue state as durable truth

Use:
- `require()`
- explicit validation
- deterministic handlers
- straightforward synchronous flows where practical

---

## 7. Money rules

All authoritative commerce amounts must use integer minor units.

This includes:
- price, compare_price
- subtotal_amount, discount_amount, shipping_amount, tax_amount, total_amount
- unit price snapshots, line subtotal snapshots

Do not use floating-point authority for pricing or totals.
Format currency only at render time.

---

## 8. Required collections

Migrations must define and maintain these collections. See `docs/migrations-policy.md` for full policy and `docs/data-shape.md` for export shape.

### products
sku (text, unique, required), name (text, required), slug (text, unique, required), price (number, required), compare_price (number, optional), stock (number, default 0), description_markdown (text, optional), short_description (text, optional), images (file, multiple), categories (relation), tags (json array of strings, deterministic ordering), active (bool, default true), featured (bool, default false), visible (bool, default true), meta_title (text, optional), meta_desc (text, optional), sort_order (number, default 0)

### categories
name (text, required), slug (text, unique, required), description (text, optional), image (file, optional), visible (bool, default true), sort_order (number, default 0), meta_title (text, optional), meta_desc (text, optional)

### orders
user (relation, optional), email (email, optional), status (select: pending|paid|cancelled|failed|shipped|done), items (json, required), subtotal_amount (number, required), discount_amount (number, default 0), shipping_amount (number, default 0), tax_amount (number, default 0), total_amount (number, required), address (json, required), paid_at (date, optional), cancelled_at (date, optional)

### carts
user (relation, required), product (relation, required), qty (number, required)
Constraint: unique composite (user, product)

### build_logs
status (select: pending|running|success|failed), triggered_by (text), output (text), duration_ms (number)

### build_state
Exactly one authoritative row must exist in phase one.
queue_dirty (bool), build_running (bool), rerun_requested (bool), last_changed_at (date), last_built_at (date, optional), build_started_at (date, optional), lock_owner (text, optional)

### cms_sessions
session_id (text, unique, required), admin_ref (text, required; stores the authenticated superuser record id), csrf_token (text, required), expires_at (date, required), last_seen_at (date, optional), revoked_at (date, optional)

---

## 9. Cross-cutting contract summaries

Each area has a dedicated focused document. This section provides only the key invariant for each. Always read the focused document for full rules.

### Build contract → `docs/build-flow.md`
Only build-target mutations trigger rebuilds. Queue state must be DB-backed and restart-safe. Export occurs after lock acquisition and immediately before Hugo invocation. Only one build at a time. Stale lock recovery must be explicit and logged.

### CMS auth → `docs/auth-session.md`
All privileged `/cms/**` routes require authenticated superuser access through a custom server-issued HttpOnly cookie session wrapper, except the public login entry routes. Phase one uses opaque persistent sessions with synchronizer-token CSRF. Security failures must fail closed.

### CMS routes → `docs/cms-routes.md`
CMS provides auth, dashboard, product CRUD, category CRUD, and build status visibility. All responses are HTML. All mutations validate CSRF.

### Checkout → `docs/checkout-rules.md`
Server-authoritative totals and stock validation. Prepare and submit are separate steps. Final submit succeeds only when authoritative stock decrements succeed for all lines. No client trust for commerce truth.

### Fragments → `docs/fragment-contract.md`
Runtime interactions return HTML fragments or full HTML pages. Never browser-facing JSON. htmx is transport only. Fragment markup must align with Hugo conventions.

### Data shape → `docs/data-shape.md`
Markdown is canonical for product descriptions. Export sanitized derived HTML. Keep field names stable and deterministic. No privileged fields in storefront export.

### Inventory → `docs/inventory-policy.md`
Stock is server-authoritative. Validate at cart mutation, checkout prepare, and checkout submit. Decrement uses fail-closed safe write. Oversell prevention is more important than UX optimism.

### SEO → `docs/seo-rules.md`
Hugo owns all SEO-critical rendering. Runtime fragments must not replace SEO responsibilities. No fabricated ratings or empty schema blocks.

### Migrations → `docs/migrations-policy.md`
All durable schema changes must exist in `pb_migrations/`. Runtime code must not assume schema that migrations do not define.

### Tailwind
Use Hugo native Tailwind processing only. No npm-based CSS pipelines. Fragment-only classes must be discoverable via Hugo-scannable safelist source.

### Error handling → `docs/error-handling.md`
All failures must be logged server-side and surfaced as HTML to the user. Security failures fail closed. Build failures must be visible in CMS.

---

## 10. Implementation order

1. define migrations
2. implement shared config/constants and schema-aligned helpers
3. implement build.pb.js
4. implement auth.pb.js
5. implement cms.pb.js
6. implement products.pb.js and categories.pb.js
7. implement cart.pb.js, checkout.pb.js, and stock.pb.js
8. implement Hugo config and input.css
9. implement layouts, partials, CMS views, and fragments

Do not implement runtime assumptions before their schema is migration-defined.

---

## 11. Verification checklist

Before completion verify:

Architecture:
- public page rendering remains in Hugo
- runtime fragments remain in PocketBase
- no JSON storefront API exists
- no SPA drift occurred

Auth:
- CMS routes are protected
- login sets the intended cookie
- logout clears the cookie and invalidates the session
- privileged requests validate auth server-side
- privileged POST validates synchronizer-token CSRF
- admin tokens are never available to browser JavaScript

Build:
- export runs before build
- build queue is DB-backed
- build lock is persistent
- stale-lock recovery is explicit and logged
- rerun logic is bounded to one rerun

Data:
- exported JSON shape is deterministic
- Markdown is canonical; derived HTML is sanitized
- no required storefront field is silently missing

Commerce:
- totals are server-calculated
- stock is revalidated before order creation
- decrement fails closed when necessary
- cart merge is deterministic

Migrations:
- every schema change exists in pb_migrations
- composite unique (user, product) exists for carts

---

## 12. Completion summary

When finishing implementation, summarize:
1. files created or changed
2. startup order
3. rebuild flow
4. CMS auth flow
5. PocketBase record → exported JSON → Hugo page flow
6. hard tradeoffs or known limits

The summary must describe the actual implementation, not intention.
