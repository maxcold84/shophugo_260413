# Self-Hosted Ecommerce Boilerplate

Production-ready self-hosted ecommerce boilerplate built with a **static-first Hypermedia-Driven Application** architecture.

This repository uses:
- **Hugo** for public crawlable pages and SEO rendering
- **PocketBase** as the only long-running application process
- **htmx** for HTML fragment transport
- **Alpine.js** for micro-interactions
- **Tailwind CSS v4** through Hugo processing
- **TOAST UI Editor** for CMS authoring only

## Quick start

```bash
# 1. Use PocketBase 0.36+ and Hugo 0.160.x with Tailwind CLI available
#    Install the Tailwind standalone executable outside the repo and on PATH
#    if you are not using an npm-based toolchain
#    (for example on Windows: %USERPROFILE%\\.local\\bin\\tailwindcss.exe)
#    If child processes still cannot find it, place the binary in a broadly
#    visible PATH directory such as:
#    %LOCALAPPDATA%\\Microsoft\\WinGet\\Links\\tailwindcss.exe

# 2. Start PocketBase with the repo-local data/hooks/migrations/public paths
cd pocketbase && .\serve.ps1

# 3. Create a superuser via PocketBase admin UI
#    Visit http://127.0.0.1:8090/_/

# 4. Run Hugo build manually once (or let PocketBase cron handle it)
cd pocketbase/hugo-site && hugo --destination ../pb_public
```

The build/export flow writes:
- normalized storefront JSON into `pocketbase/hugo-site/data/`
- generated route content into `pocketbase/hugo-site/content/generated/`
- final static output into `pocketbase/pb_public/`

## Startup pitfalls

These are the two failure modes that were reproduced locally and then fixed:

1. **Wrong PocketBase working paths**
   If you launch a shared/global `pocketbase.exe` directly, it may default to that binary's own `pb_data/`, `pb_hooks/`, `pb_migrations/`, and `pb_public/` directories instead of this repository.
   Symptom:
   - `/cms/login` returns `404`
   - custom fragment routes return `404`
   - migrations/hooks from this repo appear to be ignored

   Prevention:
   - start PocketBase through `pocketbase/serve.ps1`
   - or pass `--dir`, `--hooksDir`, `--migrationsDir`, and `--publicDir` explicitly

2. **PocketBase JSVM module assumptions**
   PocketBase `pb_hooks` are **not** Node/CommonJS modules.
   Symptoms:
   - `ReferenceError: module is not defined`
   - helpers exported from one hook file are `undefined` inside another
   - routes load but return generic `400` JSON errors

   Prevention:
   - keep PocketBase-facing hook entry at `pocketbase/pb_hooks/main.pb.js`
   - treat `main.pb.js` as the only JSVM entrypoint
   - load helper files into the same JSVM context from `main.pb.js`
   - do not rely on `module.exports` inside `.pb.js` files

Current hook layout:
- `pocketbase/pb_hooks/main.pb.js` is the single PocketBase entrypoint
- `config.js`, `utils.js`, `auth.js`, `build.js`, `cart.js` are shared helper sources loaded by `main.pb.js`
- `routes_*.js` files register routes/cron jobs inside the same JSVM context

Tailwind processing notes:
- the storefront uses Hugo native `css.TailwindCSS`
- `pocketbase/hugo-site/config.toml` enables `buildStats` and mounts `hugo_stats.json`
- `pocketbase/hugo-site/assets/css/input.css` imports `tailwindcss` and sources `hugo_stats.json`
- the base template defers CSS rendering through `layouts/partials/css.html`
- do not replace this with an npm build pipeline

## Core principles

- Pages are static.
- State is dynamic.
- The browser contract is **HTML documents and HTML fragments**.
- PocketBase is the canonical data source.
- Hugo renders storefront pages from exported normalized JSON.
- The client is never authoritative for price, stock, totals, auth, or payment state.

Phase one clarification:
- authenticated cart persistence and guest-to-auth cart merge are in scope
- this does not imply a full storefront customer account UI
- customer account pages, account navigation, profile management, and order history UI remain out of scope in phase one

## Source of truth

For implementation rules, read these in order:

1. `AGENTS.md`
2. `docs/implementation-contract.md`
3. the focused contract document for the area you are changing
4. current task instructions

## Documentation map

Use these focused documents when working on a specific area:

- `docs/implementation-contract.md` — cross-cutting rules, schema, phase scope, implementation order
- `docs/auth-session.md` — CMS cookie session, login/logout, CSRF, per-request validation
- `docs/build-flow.md` — export, queue state, quiet window, build lock, rerun rules
- `docs/checkout-rules.md` — guest cart, authenticated cart, merge rules, checkout submission
- `docs/cms-routes.md` — CMS routes, auth, forms, and admin UI expectations
- `docs/cms-ui-guidelines.md` — admin layout, forms, feedback, and TOAST UI Editor usage rules
- `docs/data-shape.md` — normalized export shape, canonical fields, Hugo data expectations
- `docs/fragment-contract.md` — runtime HTML fragment endpoints and htmx contract
- `docs/inventory-policy.md` — stock authority, validation points, decrement policy, oversell prevention
- `docs/migrations-policy.md` — schema discipline, migration requirements, evolution rules
- `docs/seo-rules.md` — title/meta/canonical/schema/sitemap/robots rules
- `docs/error-handling.md` — logging strategy, error responses, failure visibility
- `docs/deployment.md` — startup, TLS, secrets, backup, upgrade policy
- `docs/testing-strategy.md` — smoke tests, verification scenarios

## Architecture summary

### Build-time layer: Hugo
Hugo owns:
- public storefront pages
- product and category pages
- SEO metadata
- canonical URLs
- Open Graph and Twitter metadata
- sitemap and robots.txt
- structured data
- static rendering from exported normalized JSON

### Runtime layer: PocketBase
PocketBase owns:
- CMS routes and form handling
- runtime HTML fragments
- cart validation and synchronization
- authenticated cart persistence and guest-to-auth cart merge
- stock validation
- checkout preparation and order creation
- privileged server-side validation
- build queue state and build execution

### Client enhancement layer
The browser may:
- request HTML fragments with htmx
- manage tiny UI state with Alpine.js
- use localStorage for guest cart draft state, recently viewed items, and lightweight UI preferences

The browser may not be the source of truth for:
- price
- stock
- cart totals
- checkout totals
- authorization
- order state
- payment status

## Repository layout

```text
pocketbase/
├── pb_data/
├── pb_hooks/
│   ├── main.pb.js
│   ├── config.js
│   ├── utils.js
│   ├── auth.js
│   ├── build.js
│   ├── cart.js
│   ├── routes_auth.js
│   ├── routes_build.js
│   ├── routes_cms.js
│   ├── routes_products.js
│   ├── routes_categories.js
│   ├── routes_cart.js
│   ├── routes_checkout.js
│   ├── routes_stock.js
│   └── views/
│       ├── cms/
│       └── hda/
├── pb_migrations/
├── pb_public/
├── serve.ps1
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

## Non-negotiable constraints

Do not introduce:
- React, Vue, Next.js, Nuxt
- separate Go server or Node.js app runtime
- npm / yarn / pnpm / bun build pipeline
- CDN frontend assets
- browser-facing JSON APIs
- client-rendered commerce views from JSON

In `pb_hooks`:
- no arrow functions, no async/await, no Promise assumptions
- no ESM import/export, no class syntax
- no timer-based debounce, no in-memory queue state as durable truth
