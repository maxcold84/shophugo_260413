# Testing Strategy

This document defines the verification and testing approach for the self-hosted ecommerce boilerplate.

It supplements:
- `AGENTS.md`
- `docs/implementation-contract.md`

If there is any conflict, follow:
1. `AGENTS.md`
2. `docs/implementation-contract.md`
3. `docs/testing-strategy.md`
4. current task instructions

---

## 1. Testing philosophy

Phase one prioritizes manual verification with structured scenarios.

Goals:
- every critical path has a defined verification scenario
- each document's verification checklist maps to testable behavior
- failures are detectable without production traffic

Automated testing may be added later, but manual verification must be complete first.

---

## 2. Smoke test scenarios

These scenarios must pass before considering any major implementation complete.

### Scenario 1: Fresh start
1. Delete `pb_data/` (fresh database)
2. Start PocketBase with repo-local paths
3. Preferred: `cd pocketbase && .\serve.ps1`
4. If using a global `pocketbase.exe`, pass `--dir`, `--hooksDir`, `--migrationsDir`, and `--publicDir` explicitly
5. Verify the process is not pointing at another installation's default directories
6. Verify migrations apply without errors
7. Verify PocketBase admin UI is accessible at `/_/`
8. Create a superuser account
9. Verify `/cms/login` page renders
10. Verify `GET /fragments/cart/checkout-summary` returns HTML

If Scenario 1 fails during bootstrap:
- treat the failed run as potentially partial state
- for development verification, clear the dev `pb_data/` again before retrying
- do not trust a partially applied initial migration to self-heal on the next boot without cleanup

If Scenario 1 fails with `404` on custom routes:
- treat it as a startup-path problem first, not a route-definition problem
- verify the running PocketBase process is using this repo's `pb_hooks/`

If Scenario 1 fails with `ReferenceError: module is not defined`:
- treat it as a PocketBase JSVM/CommonJS mismatch
- keep the single-entry `pb_hooks/main.pb.js` loader structure and do not convert `.pb.js` entrypoints into Node-style modules

### Scenario 2: CMS authentication
1. Navigate to `/cms/dashboard` — expect redirect to `/cms/login`
2. Submit invalid credentials — expect HTML error, no sensitive leaks
3. Submit valid credentials — expect redirect to `/cms/dashboard`
4. Verify `cms_session` cookie is set with `HttpOnly` and correct `Path`
5. Navigate to `/cms/products` — expect successful render
6. Open browser console — verify no admin tokens in `localStorage` or JS-accessible cookies
7. Click logout — expect cookie cleared, session invalidated
8. Navigate to `/cms/dashboard` — expect redirect to `/cms/login`

### Scenario 3: Product CRUD
1. Navigate to `/cms/products/new`
2. Submit with missing required fields — expect field-level HTML errors
3. Submit with duplicate SKU — expect SKU uniqueness error
4. Submit with valid data — expect success redirect to product list
5. Edit the product — verify form pre-fills correctly
6. Update the product — verify changes persist
7. Delete the product — verify removed from list
8. Verify each mutation marks build queue dirty

### Scenario 4: Category CRUD
1. Create a category with valid data
2. Verify slug uniqueness enforcement
3. Edit and update the category
4. Delete the category
5. Verify build queue dirty after mutations

### Scenario 5: Build pipeline
1. Create a product and category (should mark queue dirty)
2. Wait for cron worker to detect dirty queue
3. Verify quiet window is respected (3+ seconds after last change)
4. Verify export produces `data/products.json` and `data/categories.json`
5. Verify Hugo builds successfully
6. Verify output appears in `pb_public/`
7. Verify storefront page is accessible and renders the product
8. Verify `build_logs` entry with status `success`
9. Make a rapid sequence of edits — verify only one build runs
10. Verify rerun logic triggers at most one additional build

### Scenario 6: Build lock and recovery
1. Simulate a stale lock (set `build_running=true`, `build_started_at` to old time)
2. Verify cron detects stale lock after threshold
3. Verify `build_logs` records the stale lock recovery
4. Verify next build proceeds normally

### Scenario 7: Guest cart flow
1. Open storefront product page
2. Add product to cart (localStorage)
3. Sync guest cart intent with `POST /actions/cart/sync-guest`
4. Verify mini cart updates via htmx fragment
5. Update quantity — verify response reflects server-validated state
6. Remove item — verify empty cart state renders

### Scenario 8: Authenticated cart and merge
1. Add items to guest cart (localStorage)
2. Log in through the phase-one customer-auth entry point used for authenticated cart persistence
3. Verify guest cart merges into authenticated cart
4. Verify duplicate products are consolidated
5. Verify quantities are clamped against stock
6. Verify invalid products are removed
7. Verify authoritative cart HTML fragments are returned

### Scenario 9: Checkout prepare
1. Add products to authenticated cart
2. Call `POST /actions/checkout/prepare`
3. Verify server revalidates all products and stock
4. Verify totals are server-computed (integer minor units)
5. Verify checkout summary HTML is returned
6. Reduce stock of one product below cart quantity
7. Call prepare again — verify warning or correction in response

### Scenario 10: Checkout submit and stock decrement
1. Prepare checkout with valid cart
2. Call `POST /actions/checkout/submit` with valid address
3. Verify order is created in `orders` collection
4. Verify `orders.items` contains snapshot data (name, sku, price at time of purchase)
5. Verify stock is decremented for each product
6. Verify HTML confirmation is returned
7. Attempt to submit again with insufficient stock — verify fail-closed error

### Scenario 11: Oversell prevention
1. Set product stock to 1
2. Open two browser tabs
3. Add the product to cart in both tabs
4. Submit checkout in tab 1 — expect success
5. Submit checkout in tab 2 — expect stock error, order not created
6. Verify final stock is 0, not negative

### Scenario 12: SEO output
1. Build the storefront
2. Verify product page has unique `<title>`, meta description, canonical URL
3. Verify Open Graph and Twitter meta tags
4. Verify `robots.txt` exists, disallows `/cms/`, `/actions/`, and `/fragments/`, and does not block public image delivery such as `/api/files/`
5. Verify `sitemap.xml` exists and includes only visible product/category pages
6. Verify structured data is valid JSON-LD (use Google Rich Results Test)
7. Verify non-visible products do not appear in sitemap

### Scenario 13: CSRF protection
1. Log in to CMS
2. Submit a product creation form — expect success
3. Remove the `_csrf` hidden field from a form and submit — expect rejection
4. Modify the `_csrf` value and submit — expect rejection
5. Verify CSRF failure returns HTML error, not raw exception

---

## 3. Edge case scenarios

### Stock edge cases
- Add product to cart, then set stock to 0 via CMS — cart should reflect unavailability
- Add product to cart, then deactivate product — checkout should reject it
- Set stock to exactly the cart quantity — checkout should succeed and leave stock at 0

### Session edge cases
- Let CMS session expire — next request should redirect to login
- Clear cookie manually — next request should redirect to login
- Use a revoked session — should fail closed

### Build edge cases
- Trigger build with no products — Hugo should build with empty listing
- Trigger build with invalid product data — build should fail and log
- Edit product during active build — verify rerun flag is set

---

## 4. Verification checklist mapping

Each document's verification checklist corresponds to testable behaviors. Use these mappings to ensure coverage:

| Document | Covered by scenarios |
|----------|---------------------|
| `auth-session.md` | Scenario 2, 13, session edge cases |
| `build-flow.md` | Scenario 5, 6, build edge cases |
| `checkout-rules.md` | Scenario 9, 10, 11 |
| `cms-routes.md` | Scenario 3, 4 |
| `cms-ui-guidelines.md` | Scenario 3, 4 (form rendering) |
| `data-shape.md` | Scenario 5 (export verification) |
| `fragment-contract.md` | Scenario 7, 8, 9 |
| `inventory-policy.md` | Scenario 10, 11, stock edge cases |
| `migrations-policy.md` | Scenario 1 |
| `seo-rules.md` | Scenario 12 |
| `error-handling.md` | All failure paths in scenarios |
| `deployment.md` | Scenario 1 |

---

## 5. Future automation opportunities

When adding automated tests:
- use HTTP-level integration tests against a running PocketBase instance
- test fragment responses for HTML content type
- test stock decrement with concurrent requests
- test CSRF rejection
- validate JSON-LD structured data output
- validate exported JSON shape stability

Do not add tests that depend on PocketBase internal APIs not covered by the public route contract.

---

## 6. Completion criteria

Testing is considered adequate when:
- all 13 smoke test scenarios pass
- all edge case scenarios are verified
- every document's verification checklist items are covered
- no silent failures were discovered during testing
- error responses are HTML throughout
- security failures fail closed in all tested paths
