# Error Handling Contract

This document defines the error handling, logging, and failure visibility strategy.

It supplements:
- `AGENTS.md`
- `docs/implementation-contract.md`

If there is any conflict, follow:
1. `AGENTS.md`
2. `docs/implementation-contract.md`
3. `docs/error-handling.md`
4. current task instructions

---

## 1. Core principle

All failures must fail closed, be logged server-side, and surface meaningful HTML to the user.

Security failures must never silently downgrade to permissive behavior.
Commerce failures must never silently produce incorrect orders.
Build failures must never silently serve stale content without visibility.

---

## 2. Failure categories

### Security failures
- malformed session cookie → unauthenticated
- expired session → unauthenticated
- missing CSRF token → reject
- CSRF mismatch → reject
- token lookup error → reject conservatively
- uncertain privilege state → deny access

### Commerce failures
- insufficient stock at checkout → reject order, return HTML error
- invalid product (inactive/hidden/deleted) → remove from cart or reject checkout
- address validation failure → return form with field-level errors
- order creation failure → fail entire order, no partial writes
- stock decrement failure → fail entire order closed

### Build failures
- export failure → log, mark build as failed, surface in CMS
- Hugo invocation failure → log output, mark as failed
- stale lock detection → log recovery action, create build_logs entry

### Validation failures
- CMS form field validation → re-render form with server-side errors
- product/category slug conflict → field-level error
- SKU uniqueness violation → field-level error

---

## 3. Server-side logging strategy

Use PocketBase's built-in logger for all significant events.

### Logging API usage

```javascript
// pb_hooks — logging patterns (ES5 only)

// Info-level: successful operations
$app.logger().info(
    "Build completed",
    "duration_ms", durationMs,
    "status", "success",
    "trigger", triggeredBy
);

// Warn-level: recoverable issues
$app.logger().warn(
    "Stock clamped during cart merge",
    "product_id", productId,
    "requested", requestedQty,
    "available", currentStock
);

// Error-level: failures
$app.logger().error(
    "Checkout failed: insufficient stock",
    "product_id", productId,
    "requested", requestedQty,
    "available", currentStock,
    "user_id", userId
);

// Error-level: security events
$app.logger().error(
    "CMS auth failure: invalid session",
    "session_id", sessionId,
    "ip", c.realIP()
);
```

### What to log

| Category | Level | Required fields |
|----------|-------|-----------------|
| Login success | info | admin email |
| Login failure | warn | attempted email, IP |
| Session invalid | warn | session_id snippet, IP |
| CSRF mismatch | error | route, IP |
| Build start | info | trigger source |
| Build success | info | duration_ms |
| Build failure | error | output excerpt |
| Stale lock recovery | warn | lock_age_ms |
| Checkout success | info | order_id, total_amount |
| Checkout stock failure | warn | product_id, requested, available |
| Order creation error | error | error message, cart context |
| Export failure | error | error message |

---

## 4. User-facing error responses

All user-facing errors must be server-rendered HTML. Never raw JSON.

### CMS error patterns

```html
<!-- partials/flash.html -->
{{ if .error }}
<div class="bg-red-50 text-red-800 border border-red-200 rounded p-4 mb-4" role="alert">
  <p class="font-medium">{{ .error }}</p>
</div>
{{ end }}

{{ if .success }}
<div class="bg-green-50 text-green-800 border border-green-200 rounded p-4 mb-4" role="alert">
  <p class="font-medium">{{ .success }}</p>
</div>
{{ end }}
```

### Form field error pattern

```html
<!-- Field-level error rendering -->
<div class="space-y-1">
  <label for="sku" class="block text-sm font-medium text-gray-700">SKU</label>
  <input type="text" id="sku" name="sku" value="{{ .values.sku }}"
         class="block w-full rounded border-{{ if .errors.sku }}red-300{{ else }}gray-300{{ end }} shadow-sm sm:text-sm">
  {{ if .errors.sku }}
  <p class="mt-1 text-sm text-red-600">{{ .errors.sku }}</p>
  {{ end }}
</div>
```

### Storefront error fragment pattern

```html
<!-- Cart/checkout error fragment -->
<div class="bg-yellow-50 border border-yellow-200 rounded p-4">
  <p class="text-yellow-800 font-medium">Some items in your cart have changed</p>
  <ul class="mt-2 text-sm text-yellow-700 list-disc list-inside">
    {{ range .stockWarnings }}
    <li>{{ .productName }}: only {{ .available }} available (was {{ .requested }})</li>
    {{ end }}
  </ul>
</div>
```

---

## 5. HTTP status code policy

Use meaningful HTTP status codes:

| Situation | Status Code |
|-----------|------------|
| Successful page render | 200 |
| Successful form submit + redirect | 302 |
| Validation failure (re-render form) | 422 |
| Unauthenticated (redirect to login) | 302 |
| Unauthenticated (fragment request) | 401 |
| CSRF failure | 403 |
| Resource not found | 404 |
| Insufficient stock (checkout) | 409 |
| Internal server error | 500 |

Rules:
- htmx respects status codes for swap behavior
- use 422 for validation errors so htmx still swaps the response
- use 200 for successful fragment updates
- do not use 200 for error conditions that should be distinguishable

---

## 6. Build failure visibility

Build failures must be visible in the CMS.

Required visibility:
- `build_logs` entry with status `failed` and output excerpt
- build status panel in CMS shows failure state clearly
- failure state is visually distinct (red/error styling) from success
- most recent failure output is accessible without server console access

Build failures must not:
- silently continue serving stale content without any indication
- be hidden behind collapsed UI or logs-only visibility
- prevent CMS CRUD operations from functioning

---

## 7. Graceful degradation rules

When an error occurs:
- CMS: re-render the current page with error context preserved
- Storefront fragments: return error fragment HTML with appropriate styling
- Checkout: return error HTML with specific product/stock information
- Build: log and mark as failed, allow CMS to function independently

When error context is uncertain:
- deny access rather than grant it
- reject the operation rather than partially complete it
- log the uncertainty for investigation

---

## 8. Verification checklist

Before considering error handling complete, verify:
- security failures fail closed
- all error responses are HTML, not JSON
- CMS forms re-render with field-level errors on validation failure
- checkout errors identify specific problematic products/lines
- build failures create `build_logs` entries
- build failure state is visible in CMS without server console access
- server-side logging covers auth, commerce, and build events
- HTTP status codes are meaningful and consistent
- stale lock recovery is logged
- no error path silently swallows failures
