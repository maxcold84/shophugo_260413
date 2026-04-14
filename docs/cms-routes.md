# CMS Routes Contract

This document defines the route, auth, and handler contract for the CMS layer.

It supplements:
- `AGENTS.md`
- `docs/implementation-contract.md`
- `docs/auth-session.md`

If there is any conflict, follow:
1. `AGENTS.md`
2. `docs/implementation-contract.md`
3. `docs/auth-session.md`
4. `docs/cms-routes.md`
5. current task instructions

---

## 1. Scope

All `/cms/**` routes are part of the privileged CMS surface.
Exception:
- `GET /cms/login`
- `POST /cms/login`

These two routes are public entry points to the privileged CMS boundary.
All other `/cms/**` routes are privileged and exist only for superuser CMS management.

The CMS layer is responsible for:
- login and logout
- authenticated dashboard rendering
- product CRUD forms
- category CRUD forms
- build status visibility
- server-side validation for all privileged writes

The CMS layer is not responsible for:
- public storefront rendering
- browser-facing JSON APIs
- client-side authorization decisions
- background worker ownership outside PocketBase hooks

---

## 2. Auth boundary

All privileged `/cms/**` routes require a custom server-issued HttpOnly cookie session wrapper. `GET /cms/login` and `POST /cms/login` are the explicit public entry exceptions.
For full auth contract details, see `docs/auth-session.md`.

Summary rules:
- PocketBase remains stateless by default
- the CMS session wrapper must be implemented explicitly in active PocketBase `pb_hooks/*.pb.js` CMS route entrypoints
- privileged authorization must be checked server-side on every CMS request
- privileged POST routes must include synchronizer-token CSRF protections
- admin or superuser tokens must never be exposed to browser JavaScript

Unauthorized requests must:
- redirect to `/cms/login` for page requests
- return appropriate HTML error or redirect behavior for fragment requests

---

## 3. Route map

Expected CMS routes:

### Auth routes
- `GET  /cms/login`
- `POST /cms/login`
- `POST /cms/logout`

### Dashboard routes
- `GET  /cms`
- `GET  /cms/dashboard`

### Product routes
- `GET  /cms/products`
- `GET  /cms/products/new`
- `POST /cms/products`
- `GET  /cms/products/:id/edit`
- `POST /cms/products/:id`
- `POST /cms/products/:id/delete`

### Category routes
- `GET  /cms/categories`
- `GET  /cms/categories/new`
- `POST /cms/categories`
- `GET  /cms/categories/:id/edit`
- `POST /cms/categories/:id`
- `POST /cms/categories/:id/delete`

### Build status routes
- `GET  /cms/builds`
- `GET  /cms/fragments/build-status`

The exact route names may vary slightly if the implementation is internally consistent, but the above shape is the target contract.

Current verified minimal baseline on April 14, 2026:
- `GET /cms/login` returns `200` HTML
- unauthenticated `GET /cms/dashboard` redirects to `/cms/login`
- unauthenticated `GET /cms/builds` redirects to `/cms/login`
- unauthenticated `GET /cms/fragments/build-status` returns `401`
- authenticated `dashboard`, `builds`, `products`, and `categories` pages render through the current minimal CMS route set

---

## 4. View and fragment ownership

CMS page views live under:
- `pocketbase/pb_hooks/views/cms/`

Runtime storefront fragments live under:
- `pocketbase/pb_hooks/views/hda/`

CMS templates must not drift into public storefront responsibilities.
Storefront templates must not become a hidden admin surface.

Expected CMS view files include:
- `login.html`
- `dashboard.html`
- `products-list.html`
- `product-form.html`
- `categories-list.html`
- `category-form.html`
- `build-status.html`
- `partials/flash.html`
- `partials/form-errors.html`

---

## 5. Request handling rules

### GET routes
Use GET for:
- page rendering, form rendering, safe build status reads, safe list/filter views

GET routes must:
- validate CMS auth first, except `GET /cms/login`
- render full HTML pages or HTML fragments only
- never expose privileged data through browser-facing JSON contracts

### POST routes
Use POST for:
- login, logout, create, update, delete, privileged build actions if added later

POST routes must:
- validate CMS auth before mutation, except login
- validate synchronizer-token CSRF expectations
- validate record-level inputs on the server
- re-render authoritative HTML on validation failure
- never use browser-facing JSON as the CMS write contract

---

## 6. Product form contract

The product create/edit form must support at minimum:
- sku, name, slug, price, compare_price, stock
- description_markdown, short_description
- images, categories, tags
- active, featured, visible
- meta_title, meta_desc, sort_order

Rules:
- TOAST UI Editor is used only for `description_markdown`
- Markdown is canonical
- any preview or derived HTML is non-canonical
- server-side validation decides the final persisted value
- slug uniqueness and sku uniqueness must be enforced server-side
- image handling must remain self-hosted and repository-compatible

Validation failures must:
- return the form with errors in HTML
- preserve safe user-entered values where practical
- not produce partial invalid writes

---

## 7. Category form contract

The category create/edit form must support at minimum:
- name, slug, description, image, visible, sort_order, meta_title, meta_desc

Rules:
- slug uniqueness must be enforced server-side
- visibility changes are build-target mutations
- category writes must keep exported storefront shape deterministic

---

## 8. Build status panel contract

The CMS build status panel exists to surface build queue and build results.

It must show authoritative server-rendered state for:
- whether the queue is dirty
- whether a build is currently running
- whether a rerun is requested
- last changed timestamp
- last built timestamp
- recent build result status
- recent build output or summarized diagnostics

Default implementation rule:
- use polling or fragment refresh
- do not make raw realtime payloads the rendering contract

Expected endpoint:
- `GET /cms/fragments/build-status`

This endpoint must return HTML.

---

## 9. Failure handling rules

### Validation failures
Validation failures must:
- use server-rendered HTML
- keep route and form semantics understandable
- show field-level and form-level errors where possible

### Permission failures
Permission failures must:
- redirect to login when unauthenticated
- deny access clearly when authenticated but unauthorized
- avoid leaking privileged implementation details

Choose one consistent HTML response pattern for fragment failures and keep it stable.

---

## 10. Build-trigger coupling

CMS writes are one of the main sources of build-target mutations.

The following CMS mutations must mark the build queue dirty when they affect storefront-visible state:
- product create, product update, product delete
- category create, category update, category delete
- SEO-visible field changes, slug changes
- visible/active state changes

The following CMS interactions must not trigger builds:
- login, logout
- build status polling
- viewing forms without saving
- validation failures that do not persist changes

---

## 11. File ownership

Current verified ownership by active hook file:

- `cms-login.pb.js`
  - login handler, logout handler
  - session creation
  - logout invalidation
  - CMS cookie and CSRF issuance

- `cms-dashboard-min.pb.js`
  - CMS dashboard routes

- `cms-builds-min.pb.js`
  - build status page route
  - build status fragment route

- `cms-products-min.pb.js`
  - product list route
  - minimal product create entry route

- `cms-categories-min.pb.js`
  - category list route
  - minimal category create entry route

- `checkoutsummary.pb.js`
  - runtime checkout summary fragment route

Legacy experimental files may remain beside these as `*.pb.js.disabled` or `.bak`.
Those are not active runtime entrypoints and must not be treated as loaded hooks.

---

## 12. Verification checklist

Before considering CMS work complete, verify:
- all `/cms/**` routes are protected correctly
- login sets the CMS cookie session wrapper correctly
- logout clears the CMS cookie correctly
- the persistent CMS session view is invalidated or revoked on logout
- privileged POST routes validate synchronizer-token CSRF
- admin tokens are not accessible from frontend JavaScript
- product and category form validation happens server-side
- TOAST UI Editor is loaded only where needed
- validation failures return HTML, not JSON
- build-target mutations mark the queue dirty
- non-build CMS interactions do not trigger builds
- the build status panel reflects persisted build state
- route naming is consistent across templates and handlers
