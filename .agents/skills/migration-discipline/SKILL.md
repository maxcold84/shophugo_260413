---
name: migration-discipline
description: Keep PocketBase schema changes explicit, reproducible, and aligned with docs, code, and export contracts.
---

Use this skill whenever a task changes collections, fields, defaults, uniqueness, indexes, relation constraints, or durable state expectations.

## Core rule
If the implementation changes any durable PocketBase schema behavior, add or update migrations in `pocketbase/pb_migrations/`.

## Must-cover collections
At minimum, keep these migration-defined and contract-aligned:
- `products`
- `categories`
- `orders`
- `carts`
- `build_logs`
- `build_state`
- `cms_sessions`

## Specific contract requirements
- `build_state` is a singleton operational collection in phase one.
- `carts` enforces uniqueness for `(user, product)`.
- `products.tags` is a JSON array of strings with deterministic ordering.
- `cms_sessions.admin_ref` stores the authenticated superuser record id as text.
- Price and money-related fields remain integer minor-unit authority.

## Review checklist
1. Did a durable behavior change without a migration?
2. Did code or docs assume fields that migrations do not define?
3. Did a schema rename ripple through code, docs, and export shape?
4. Are defaults, uniqueness rules, and constraints explicitly encoded?
5. Can a fresh environment reach the expected schema state from migrations alone?

## Finish by reporting
- migrations created or updated
- code/doc/schema alignment status
- backward-compatibility considerations
