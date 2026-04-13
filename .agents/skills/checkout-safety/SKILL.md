---
name: checkout-safety
description: Preserve server-authoritative checkout, stock validation, and auditable failure handling for carts and orders.
---

Use this skill whenever a task touches carts, checkout, stock, orders, totals, guest cart merge, or order submission.

## Goals
Protect the commerce truth boundary:
- The client is never authoritative for price, stock, totals, order state, or payment state.
- All authoritative money values use integer minor units.
- Checkout revalidates product eligibility and stock on the server.
- A user-visible successful order must never exist unless all authoritative stock decrements succeed.

## Required checks
1. Revalidate product existence, active state, visible state, price, and requested quantity.
2. Recompute authoritative totals on the server.
3. Revalidate stock again during final submit even if prepare already ran.
4. Ensure decrement/write logic is fail-closed.
5. If transactional rollback is unavailable, use explicit compensating failure handling and keep an auditable failed order state.

## Guest cart rules
- localStorage guest cart is draft intent only.
- Guest cart sync must use POST and HTML form encoding.
- Submitted guest cart lines are non-authoritative intent.
- Server returns authoritative HTML fragments.

## Authenticated cart rules
- PocketBase `carts` rows are authoritative for authenticated cart state.
- Merge guest cart into authenticated cart by product identity.
- Clamp quantities against current stock.
- Remove invalid, inactive, or invisible items.

## Order safety rules
- Never create an order from client-submitted totals.
- Never skip the second stock validation.
- Never leave inventory decremented for an order that is not persisted as a final auditable result.
- Prefer `pending` -> `success`/`failed` state transitions when atomic commit is unavailable.

## Finish by reporting
- checkout invariants preserved
- stock decrement strategy used
- compensation or rollback behavior
- affected docs and tests
