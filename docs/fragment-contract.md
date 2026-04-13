# Fragment Contract

This document defines the runtime HTML fragment contract for the self-hosted ecommerce boilerplate.

It supplements:
- `AGENTS.md`
- `docs/implementation-contract.md`
- `docs/cms-routes.md`
- `docs/checkout-rules.md`

The browser contract for dynamic UI is HTML, not JSON.
All runtime fragment design must preserve that rule.

If there is any conflict, follow:
1. `AGENTS.md`
2. `docs/implementation-contract.md`
3. `docs/fragment-contract.md`
4. current task instructions

---

## 1. Fragment ownership

PocketBase owns runtime fragment rendering.
Hugo owns public crawlable page rendering.

Use fragments for:
- auth-aware UI state
- cart UI updates
- checkout summary blocks
- stock and availability hints
- build status panels
- filtered or refreshed listing regions
- inline validation feedback

Do not use fragments to replace the primary responsibility of Hugo for public SEO pages.

Phase one scope note:
- storefront customer account fragments are out of scope unless explicitly added by a later contract update

---

## 2. Allowed response types

Fragment endpoints must return:
- HTML fragments
or
- full HTML pages when the route is intended to behave as a normal page request

Fragment endpoints must not return:
- browser-facing JSON contracts for storefront rendering
- client-rendered template payloads
- ad hoc JSON-RPC style envelopes for htmx

If the client needs updated UI, return updated HTML.

---

## 3. Endpoint shape

Expected patterns include:
- `GET  /fragments/cart/mini`
- `GET  /fragments/cart/lines`
- `GET  /fragments/cart/checkout-summary`
- `POST /actions/cart/add`
- `POST /actions/cart/update`
- `POST /actions/cart/remove`
- `POST /actions/cart/sync-guest`
- `GET  /fragments/products/listing`
- `GET  /fragments/products/stock-badge?sku=...`
- `POST /actions/checkout/prepare`
- `POST /actions/checkout/submit`
- `GET  /cms/fragments/build-status`

Rules:
- use `GET` for safe retrieval
- use `POST` for state changes
- keep naming clear and stable
- keep CMS and storefront fragment namespaces separated

---

## 4. htmx contract

htmx is the transport for fragment updates.

Allowed patterns:
- `hx-get`, `hx-post`, `hx-target`, `hx-swap`, `hx-trigger`
- `hx-push-url` only where it improves navigation without weakening architecture boundaries

Rules:
- prefer real forms over custom request protocols
- prefer normal path/query/form parameters
- let the server decide the authoritative next HTML state
- do not design mini SPA behavior hidden behind htmx

### Reference pattern — add to cart from product page

```html
<!-- Hugo product page partial: add to cart -->
<form hx-post="/actions/cart/add"
      hx-target="#cart-mini"
      hx-swap="innerHTML">
  <input type="hidden" name="product_id" value="{{ .id }}">
  <div class="flex items-center gap-2">
    <input type="number" name="qty" value="1" min="1"
           class="w-16 rounded border-gray-300 text-sm">
    <button type="submit"
            class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
      Add to Cart
    </button>
  </div>
</form>
```

### Reference pattern — build status polling

```html
<!-- CMS build status panel with polling -->
<div hx-get="/cms/fragments/build-status"
     hx-trigger="every 5s"
     hx-swap="innerHTML"
     id="build-status-panel">
  <!-- server-rendered build status HTML -->
</div>
```

### Reference pattern — cart line update

```html
<!-- Cart line with quantity update -->
<form hx-post="/actions/cart/update"
      hx-target="#cart-lines"
      hx-swap="innerHTML">
  <input type="hidden" name="product_id" value="{{ .productId }}">
  <input type="number" name="qty" value="{{ .qty }}" min="0"
         class="w-16 rounded border-gray-300 text-sm"
         hx-trigger="change">
  <button type="submit" class="text-sm text-indigo-600 hover:underline">Update</button>
</form>
```

---

## 5. Markup consistency

Hugo partials define the storefront markup language.
PocketBase fragments must follow the same structural and visual conventions.

Rules:
- keep class naming coherent
- keep heading hierarchy coherent
- keep button, input, alert, and panel patterns aligned
- keep empty states stylistically aligned
- avoid duplicating the same markup conventions in divergent ways

If a fragment renders a UI pattern that already exists in Hugo partials, match that pattern.

---

## 6. Fragment authority rules

The client is never authoritative for:
- price, stock, cart totals, checkout totals, auth state, order state, payment state

Fragment endpoints must:
- compute authoritative UI output on the server
- revalidate the underlying state before rendering
- return server-truth HTML, not optimistic client-truth HTML

Where optimistic UX is used, the server-rendered fragment remains the correction authority.

---

## 7. Cart fragment rules

Cart-related fragments must be rendered from authoritative server state for authenticated users and from server-validated draft intent for guest flows.

### Mini cart — `GET /fragments/cart/mini`
Should return: item count summary, subtotal summary, empty state when no valid lines exist.

### Cart lines — `GET /fragments/cart/lines`
Should return: rendered line items, quantity controls, per-line totals, empty state, warnings if any line became invalid.

### Checkout summary — `GET /fragments/cart/checkout-summary`
Should return: normalized subtotal, discount/shipping/tax amounts if applicable, total amount, warning or validation blocks when checkout cannot proceed.

Rules:
- never trust client-computed totals
- reflect clamped or invalid quantities explicitly
- surface inactive or removed products clearly

---

## 8. Cart action rules

### Add to cart — `POST /actions/cart/add`
Must: validate product existence, active/visible state, quantity, normalize server-side, merge into existing cart row for authenticated users, return updated cart HTML fragments.

### Update cart — `POST /actions/cart/update`
Must: validate ownership, validate quantity, clamp against stock, remove line when quantity resolves to zero if chosen, return refreshed fragments.

### Remove cart line — `POST /actions/cart/remove`
Must: validate ownership, remove the correct line, return refreshed fragments.

### Sync guest cart — `POST /actions/cart/sync-guest`
Must: accept guest draft cart lines from a normal HTML form submission, treat submitted guest lines as non-authoritative intent only, revalidate products, quantities, visibility, and stock server-side, and return authoritative cart HTML fragments.

---

## 9. Product listing and stock fragments

### Listing fragment — `GET /fragments/products/listing`
May support: category filtering, sort changes, pagination, server-rendered empty results.

### Stock badge fragment — `GET /fragments/products/stock-badge?sku=...`
Must: validate product lookup, return meaningful availability messaging, reflect server-truth.

---

## 10. Checkout fragments and actions

### Prepare checkout — `POST /actions/checkout/prepare`
Must: validate cart lines, products, prices, stock; normalize lines; return HTML stating whether checkout may proceed.

### Submit checkout — `POST /actions/checkout/submit`
Must: revalidate, recompute totals, create an auditable order attempt from authoritative data, and only treat checkout as successful after authoritative stock decrements succeed for all lines; then return confirmation HTML or error HTML.

For full checkout rules, see `docs/checkout-rules.md`.

---

## 11. CMS fragments

### Build status fragment — `GET /cms/fragments/build-status`
Must: require CMS auth, render current queue/build state, surface status and relevant log output.
CMS fragments must never leak privileged information to unauthenticated users.

---

## 12. Error and empty state rules

Fragments must render meaningful server-authored error and empty states.

Rules:
- use proper HTTP status codes
- do not silently fail
- do not rely on raw client-side string assembly for user-facing error states
- keep error markup visually aligned with the design system

---

## 13. Realtime and invalidation rules

If realtime signals are introduced later, they are signal-only, not a rendering contract.

Rules:
- browser receives an invalidation signal
- client triggers a fragment refetch
- server returns authoritative HTML
- raw realtime payloads must not directly render business UI

---

## 14. Tailwind and fragment rendering

Fragment-only Tailwind classes must remain discoverable by the Hugo/Tailwind pipeline.

Rules:
- represent fragment classes in a Hugo-scannable source, or maintain an explicit safelist source.
- Do not allow runtime fragment styling to break because the classes were invisible to the CSS build.

---

## 15. Verification checklist

Before considering fragment work complete, verify:
- fragment endpoints return HTML
- safe retrieval uses `GET`; state changes use `POST`
- cart, stock, and checkout fragments are server-authoritative
- fragment markup matches Hugo conventions
- CMS fragments require CMS auth
- empty states exist; error states exist
- HTTP status codes are meaningful
- no browser-facing JSON contract was introduced
- Tailwind class discovery covers fragment templates
