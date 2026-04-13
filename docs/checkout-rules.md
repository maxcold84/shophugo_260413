# Checkout Rules Contract

This document defines the checkout, stock validation, order creation, and future payment-boundary rules.

It supplements:
- `AGENTS.md`
- `docs/implementation-contract.md`

If there is any conflict, follow:
1. `AGENTS.md`
2. `docs/implementation-contract.md`
3. `docs/checkout-rules.md`
4. current task instructions

---

## 1. Purpose

Checkout in phase one is intentionally conservative.

Goals:
- server-authoritative totals
- server-authoritative product validation
- conservative stock handling
- deterministic order creation
- no client trust for final commerce truth
- future payment integration without architectural rewrite

This phase does not implement a full payment gateway.
It defines the boundary so one can be added later without changing core truth rules.

---

## 2. Core checkout truth rules

The client is never authoritative for:
- price, stock, discounts, tax, shipping amount, subtotal, total amount, payment success, order finalization

The server must always recompute:
- line item normalization, subtotal, discount amount, shipping amount, tax amount, total amount

The server must always validate:
- product exists, product is active, product is visible, requested quantity is valid, stock is sufficient at checkout time, cart items are still purchasable

---

## 3. Scope of phase one checkout

Phase one checkout must support:
- guest cart revalidation
- authenticated cart revalidation
- checkout preparation
- order submission
- stock decrement on successful order creation
- HTML confirmation or HTML error responses only

Phase one checkout must not require:
- live payment gateway integration
- browser-facing payment status APIs
- client-side total authority
- optimistic stock trust from browser state

---

## 4. Expected endpoint shape

Recommended endpoint shape:
- `POST /actions/checkout/prepare`
- `POST /actions/checkout/submit`
- `GET /fragments/cart/checkout-summary`

Rules:
- checkout endpoints return HTML fragments or full HTML pages only
- do not return JSON as the storefront rendering contract
- use POST for checkout state transitions
- use GET only for safe read-only fragment retrieval

---

## 5. Guest checkout rules

Guest cart lives in localStorage as draft UX state only.

Before checkout:
- submit guest cart intent to the server
- validate every requested line server-side
- ignore any client-submitted totals as authoritative truth
- normalize guest cart lines into authoritative server-side checkout lines

Guest cart submission contract:
- guest cart lines must be submitted through normal form fields or an equivalent HTML form encoding
- the browser may serialize localStorage draft lines into hidden inputs before submission
- guest cart synchronization must use `POST`, not side-effecting `GET`
- the submitted payload is draft intent only, never authoritative totals or stock truth

If a guest line is invalid:
- remove it from authoritative checkout calculation
- or reject checkout with a clear server-rendered error
- choose one pattern and keep it consistent

Possible invalid cases:
- product no longer exists
- product is inactive
- product is hidden and no longer purchasable
- requested quantity exceeds stock
- price changed since cart drafting

---

## 6. Authenticated checkout rules

Authenticated cart is stored in PocketBase `carts` rows.

Rules:
- treat PocketBase cart rows as the source of truth for the authenticated cart
- still revalidate all line items at checkout time
- do not assume cart persistence means the items are still valid for purchase

At checkout time, the server must:
- load the authoritative cart rows
- load current product state
- validate product eligibility
- validate stock
- normalize quantities
- compute totals from current authoritative pricing

---

## 7. Login merge rules before checkout

When a guest user authenticates, merge guest cart state into the authenticated cart.
For full stock validation rules during merge, see `docs/inventory-policy.md` §4.

Must do:
- merge by product identity
- consolidate duplicate products
- clamp merged quantities against current stock
- remove invalid or inactive products
- return refreshed authoritative cart HTML fragments

Must not do:
- trust client totals
- trust stale client assumptions about stock or pricing
- keep duplicate line semantics after merge

The merge result becomes the new authoritative cart basis.

---

## 8. Checkout preparation rules

`POST /actions/checkout/prepare` should establish a server-authoritative checkout summary before final submission.

The prepare step should:
- load candidate cart lines
- validate product existence and eligibility
- validate current pricing
- validate requested quantities
- validate stock
- normalize all eligible line items
- compute subtotal and final totals
- render an authoritative checkout summary fragment

The prepare step must not:
- create a paid order state
- trust client totals
- finalize payment state

---

## 9. Order submission rules

`POST /actions/checkout/submit` must create an order only from authoritative server calculations.

Required steps:
1. reload authoritative line items
2. revalidate stock again
3. recompute all monetary totals again
4. validate address payload server-side
5. create an internal order attempt or pending order record from authoritative server data
6. perform authoritative stock decrement as the final inventory write
7. if any stock decrement fails, fail closed and either:
   - roll back the order attempt within the same transaction, or
   - mark the created order record as `failed` and ensure it is not treated as a successful order
8. only after successful stock decrement for all lines may the order be treated as successfully created
9. return HTML confirmation or HTML error

Rules:
- do not create orders from client-submitted total fields
- do not skip the second stock validation simply because prepare already ran
- do not assume browser state remained fresh between prepare and submit
- no user-visible successful order may exist unless all authoritative stock decrements succeeded
- if full transactional rollback is unavailable, the implementation must use explicit compensating failure handling
- do not leave inventory decremented for an order that is not persisted as a final auditable result

---

## 10. Order items shape rules

The `orders.items` field is JSON and should preserve enough information for historical accuracy.

Recommended item fields:
- product record id
- sku
- name snapshot
- slug snapshot if useful
- unit price snapshot in integer minor units
- quantity
- line subtotal in integer minor units
- optional image or category snapshot if needed for later display

Rules:
- order items should be a snapshot of the purchased state, not a live pointer contract alone
- historical order display should not depend entirely on current mutable product data
- do not store only client-originating item payloads

---

## 11. Pricing rules

Pricing is always server-derived from current authoritative product records.

Rules:
- `price` is authoritative
- `compare_price` is display-only and must not drive totals
- discounts must be server-calculated if introduced later
- shipping and tax must also be server-calculated if introduced later
- client-submitted price values must be ignored for final totals
- authoritative monetary values must use integer minor units

---

## 12. Stock validation and decrement rules

For the canonical stock validation and decrement policy, see `docs/inventory-policy.md`.

Summary of critical rules:
- validate stock at prepare time
- validate stock again at submit time
- only treat an order as successful after authoritative stock decrement succeeds for all validated lines
- never trust client-side quantity assumptions
- use a compare-and-update style authoritative stock decrement or an equivalent fail-closed safe write pattern

### Reference pattern — compare-and-update stock decrement

```javascript
// pb_hooks/checkout.pb.js — stock decrement (ES5 only)
function decrementStock(app, productId, requestedQty) {
    var product = app.findRecordById("products", productId);
    var currentStock = product.getInt("stock");

    // Compare: verify stock still sufficient
    if (currentStock < requestedQty) {
        throw new Error("Insufficient stock for product " + productId +
            ": requested " + requestedQty + ", available " + currentStock);
    }

    // Update: decrement only the exact amount
    product.set("stock", currentStock - requestedQty);
    app.save(product);

    // If save fails (concurrent modification), PocketBase will throw,
    // and the caller must handle the error by failing the order closed.
}

// Usage in order submission:
function submitOrder(app, cartLines, addressPayload) {
    var validatedLines = revalidateCartLines(app, cartLines);
    var totals = computeTotals(validatedLines);
    validateAddress(addressPayload);

    var orders = app.findCollectionByNameOrId("orders");
    var order = new Record(orders);
    order.set("status", "pending");
    order.set("items", buildItemsSnapshot(validatedLines));
    order.set("subtotal_amount", totals.subtotal);
    order.set("total_amount", totals.total);
    order.set("address", addressPayload);
    app.save(order);

    try {
        for (var i = 0; i < validatedLines.length; i++) {
            decrementStock(app, validatedLines[i].productId, validatedLines[i].qty);
        }
        return order;
    } catch (e) {
        order.set("status", "failed");
        app.save(order);
        throw e;
    }
}
```

---

## 13. Address validation rules

The `orders.address` field is JSON and must be validated server-side.

Phase one canonical address shape:

```json
{
  "recipient_name": "string",
  "phone": "string",
  "country_code": "string",
  "postal_code": "string",
  "state_region": "string",
  "city": "string",
  "address_line1": "string",
  "address_line2": "string"
}
```

Required fields:
- `recipient_name`
- `phone`
- `country_code`
- `postal_code`
- `city`
- `address_line1`

Optional fields:
- `state_region`
- `address_line2`

Rules:
- validate required address fields before creating the order
- normalize predictable fields consistently
- do not trust the shape purely because the client submitted JSON
- reject malformed or incomplete address payloads with HTML errors

---

## 14. Error response rules

Checkout failures must return meaningful server-rendered HTML.

Possible failure categories:
- invalid cart lines
- insufficient stock
- inactive product
- hidden/unpurchasable product
- invalid address
- internal order creation failure

Rules:
- do not return raw JSON as the user-facing checkout contract
- include enough explanation for recovery
- keep error fragments consistent with storefront design language
- do not silently swallow order creation or stock errors

For the full error handling and logging strategy, see `docs/error-handling.md`.

---

## 15. Success response rules

Successful checkout submission may:
- render a confirmation page
- redirect to an order confirmation page
- render a confirmation fragment in a consistent HDA flow

Choose one pattern and keep it consistent.

The confirmation must reflect authoritative server state.
Do not present unverified or client-assumed totals as final truth.

---

## 16. Future payment integration boundary

A future payment gateway may be added later, but core truth rules stay the same.

Future boundary rules:
- the client may initiate a payment window or payment intent handoff
- the server must verify the amount against the authoritative order total
- client-submitted payment success is never sufficient by itself
- webhook handling must be idempotent
- final paid state is only set after server verification
- payment secrets must never be embedded in frontend code

Suggested future flow:
1. create authoritative pending order
2. hand off payment initialization to the client with non-secret identifiers only
3. verify payment server-side
4. update order to `paid` only after verification succeeds
