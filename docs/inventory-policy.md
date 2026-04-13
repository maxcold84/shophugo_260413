# Inventory Policy

This document is the **single source of truth** for inventory and stock-handling rules. Other documents that reference stock validation (such as `checkout-rules.md` and `fragment-contract.md`) defer to this document for canonical stock policy.

It supplements:
- `AGENTS.md`
- `docs/implementation-contract.md`

If implementation choices conflict, prefer correctness over convenience.
Oversell prevention is more important than UX optimism.

If there is any conflict, follow:
1. `AGENTS.md`
2. `docs/implementation-contract.md`
3. `docs/inventory-policy.md`
4. current task instructions

---

## 1. Inventory principles

Inventory is server-authoritative.

The browser is never authoritative for:
- current stock
- reservable quantity
- final checkout availability
- decrement success

Static storefront pages may show stock-related hints, but those hints are not final truth.
Runtime validation must decide whether an item is purchasable.

---

## 2. Canonical stock source

The canonical stock source is PocketBase `products.stock`.

Rules:
- treat `stock` as the currently available sellable quantity
- do not trust client-submitted quantity assumptions
- do not trust stale static page stock text at checkout time
- do not derive final stock from localStorage or HTML-only state

A product is purchasable only when all of the following are true:
- `active = true`
- `visible = true`
- `stock > 0`
- price is valid
- server-side checks pass at the time of cart mutation or checkout

---

## 3. Static versus runtime stock rendering

### Static layer
Hugo may render:
- in-stock / low-stock / out-of-stock hints
- stock badge placeholders
- availability-related copy that improves UX and SEO

Static output must be treated as informative only.

### Runtime layer
PocketBase must validate stock for:
- authenticated cart mutations
- guest cart revalidation before checkout
- checkout preparation
- checkout submission
- final order creation

All runtime stock responses must be HTML.

---

## 4. Cart-level stock rules

### Guest cart
Guest cart is draft state only.
- localStorage may contain optimistic quantities
- quantities must be revalidated server-side before checkout
- invalid quantities must be clamped or rejected with HTML feedback
- inactive, invisible, or missing products must be removed during revalidation

### Authenticated cart
Authenticated cart is stored in PocketBase `carts`.
- one row per `(user, product)`
- every quantity update must be validated against current stock
- quantity increases must not exceed sellable stock
- invalid products must not remain silently valid in the cart

### Merge on login
When guest cart merges into authenticated cart:
- consolidate duplicate products
- validate merged quantity against current stock
- clamp to the maximum valid quantity when appropriate
- remove inactive, invisible, deleted, or invalid items
- return authoritative HTML fragments after merge

---

## 5. Stock state categories

Recommended states:
- `available`: product is active, visible, and `stock > low_stock_threshold`
- `low_stock`: product is active, visible, and `0 < stock <= low_stock_threshold`
- `out_of_stock`: product is active and visible but `stock <= 0`
- `unavailable`: product is inactive, hidden, missing, or not purchasable

These states are presentation helpers only.
The final purchase decision must still use raw server-side validation.

---

## 6. Low-stock threshold policy

Recommended default: `5`

Rules:
- threshold must be deterministic
- threshold must be used only for presentation and warnings
- threshold must not replace exact quantity checks
- keep it centralized in server-side config

---

## 7. Checkout-time stock validation

Stock must be revalidated at checkout time even if it was previously validated in cart flows.

Required validation:
- product still exists
- product is still active and visible
- product price is still valid
- requested quantity is positive and valid
- requested quantity does not exceed current stock

If any line fails:
- do not create the order silently
- return HTML error or correction fragments
- keep feedback product-specific where practical

---

## 8. Stock decrement policy

Stock decrement must happen on the server.

Rules:
- decrement only from authoritative validated checkout data
- do not decrement from client-submitted totals
- apply conservative race-handling logic
- prefer rejecting an order over overselling stock

Required final-write behavior:
- re-read product state as close as possible to final order creation
- validate requested quantity again
- use a compare-and-update style authoritative stock decrement or an equivalent fail-closed safe write pattern
- decrement only if sufficient authoritative stock remains
- fail the order creation path safely when stock no longer suffices

Do not assume that earlier cart validation remains true during final submission.

For the code reference pattern, see `docs/checkout-rules.md` §12.

---

## 9. Race condition policy

Correctness is more important than convenience.

Must do:
- treat concurrent checkouts as possible
- treat stale cart state as normal
- revalidate near the final write
- return meaningful HTML errors when stock changed mid-flow

Must not do:
- accept oversell because the page looked valid earlier
- trust static pages as reservation guarantees
- rely on browser timing to preserve stock integrity

---

## 10. Inventory-related fragment behavior

Recommended behavior:
- mini cart reflects current valid quantities
- cart lines show quantity corrections when stock changed
- checkout summary shows blocking errors when stock is insufficient
- stock badges show current availability state

Responses must be: HTML only, clear user-facing status text, deterministic server-calculated values, proper HTTP status codes for blocking failures.

---

## 11. Empty and invalid stock edge cases

Handle these cases explicitly:
- product deleted after being added to cart
- product hidden after being added to cart
- product deactivated after being added to cart
- stock reduced below cart quantity
- stock becomes `0` during checkout
- negative or malformed quantity input
- duplicate cart rows caused by unexpected state drift

Expected handling:
- remove invalid rows where appropriate
- clamp quantities where appropriate
- block final checkout when required
- return authoritative HTML reflecting the corrected state

---

## 12. Observability and admin visibility

Inventory-affecting failures should be visible in CMS and logs when practical.

Recommended visibility:
- checkout failures due to stock mismatch are represented clearly in server logs
- admin UI can infer current stock from products data
- future inventory tooling should build on the same canonical `products.stock` field

Do not build a second source of truth for stock.

---

## 13. Implementation checklist

Before closing stock-related work, verify:
- stock is canonical in PocketBase
- guest cart is never treated as authoritative
- authenticated cart updates validate quantity against stock
- login merge clamps or removes invalid items
- checkout revalidates all quantities
- final order creation decrements stock conservatively and fails closed when necessary
- stock-related UI fragments return HTML only
- oversell prevention is favored over optimistic UX
