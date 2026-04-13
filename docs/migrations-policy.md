# Migrations Policy

This document defines the schema migration policy for the self-hosted ecommerce boilerplate.

It supplements:
- `AGENTS.md`
- `docs/implementation-contract.md`
- `docs/data-shape.md`

If there is any conflict, follow:
1. `AGENTS.md`
2. `docs/implementation-contract.md`
3. `docs/data-shape.md`
4. `docs/migrations-policy.md`
5. current task instructions

---

## 1. Policy goal

All durable schema changes must be explicit, reviewable, and reproducible.

This repository must not rely on hand-waved schema drift.
Every collection, field, index, option change, and default that matters to runtime, auth, checkout, export, or build behavior must be represented in `pocketbase/pb_migrations/`.

Schema policy goals:
- deterministic bootstrapping
- reproducible environments
- reviewable schema history
- safe evolution of export contracts, checkout logic, and CMS auth/session behavior

---

## 2. Required rule

If the implementation changes any durable PocketBase schema behavior, it must add or update migrations.

This includes changes to:
- collections, fields, field types
- required flags, unique flags
- relation constraints, select options
- default values, composite uniqueness expectations
- indexes, validation-critical schema metadata

Do not change PocketBase schema only through the admin UI and then leave the repository unaware of it.

---

## 3. Migration ownership

All collection schema changes belong in:
- `pocketbase/pb_migrations/`

Runtime code, export logic, and Hugo templates must not assume schema that migrations do not define.

---

## 4. Collections that must be migration-defined

At minimum, migrations must define: `products`, `categories`, `orders`, `carts`, `build_logs`, `build_state`, `cms_sessions`.

For canonical field definitions, see `docs/implementation-contract.md` §8.

---

## 5. Required schema intent by collection

### products
Must preserve fields required for: storefront export, SEO derivation, CMS editing, pricing, stock state, visibility/active-state decisions, ordering.

### categories
Must preserve fields required for: category page generation, category SEO, storefront grouping, deterministic export order.

### orders
Must preserve fields required for: authoritative server-side checkout results, canonical server-validated address storage, future payment verification boundary, stable order lifecycle state.

### carts
Must preserve fields required for: authoritative authenticated cart state, one row per `(user, product)`, deterministic merge and update behavior.

### build_logs
Must preserve fields required for: CMS build status visibility, build result diagnostics, runtime observability, stale-lock recovery visibility.

### build_state
Must preserve fields required for: durable queue dirtiness, single running lock, rerun signaling, persisted timestamps, stale-lock recovery evaluation. Phase one must maintain exactly one authoritative `build_state` row.

### cms_sessions
Must preserve fields required for: persistent CMS session state, per-request auth validation, synchronizer-token CSRF, expiry and revocation. `admin_ref` must be migration-defined as a text field that stores the authenticated superuser record id.

---

## 6. Composite constraint policy

Where the contract requires composite uniqueness, migrations must encode it explicitly.

Critical example:
- `carts` must enforce uniqueness for `(user, product)`

Do not leave composite uniqueness as an application-only assumption if the schema can enforce it.

---

## 7. Backward compatibility expectations

Schema changes must be evaluated against:
- existing hook logic
- exported JSON shape
- Hugo template expectations
- checkout invariants
- build queue invariants
- CMS auth/session invariants

If a schema change is intentionally breaking, the implementation must update all dependent code and docs in the same change.

---

## 8. Data shape alignment

Migrations and export shape must remain consistent.

Rules:
- `description_markdown` remains canonical authoring source
- visibility-related fields must remain aligned with build and SEO rules
- slug uniqueness must remain schema-enforced
- price and stock fields must not drift in type or meaning
- auth/session fields must be migration-defined

If the export logic expects a field, the schema must define it. If the schema removes or renames a field, export logic and docs must be updated at the same time.

---

## 9. Safe evolution rules

Prefer additive, explicit migration sequences.

Good migration behavior:
1. add the new field
2. update dependent code
3. update export logic
4. update docs
5. migrate or normalize existing data if needed
6. only then retire obsolete assumptions

Avoid:
- silent destructive field repurposing
- partial schema renames without code updates
- undocumented changes to defaults or requiredness
- introducing new critical fields without defining how old rows behave

---

## 10. Environment reproducibility

A fresh environment should be able to reach the expected schema state from migrations alone.

That means:
- the repository documents the intended durable schema
- runtime code does not depend on manual admin-panel-only schema edits
- new contributors or automation can apply migrations and reach the correct collection model

---

## 11. PocketBase JS migration compatibility notes

PocketBase JS migrations in this repository must match the current JS runtime contract, not older examples copied from other versions.

Rules:
- define collection fields with `fields`, not legacy `schema`
- define indexes only after the referenced columns are actually created by the field definitions
- for number fields that must stay integer-only, prefer the PocketBase JS field option `onlyInt: true`
- for relation fields, use the concrete related collection id created earlier in the same migration when needed

Bool field warning:
- in PocketBase JS migrations, `type: "bool", required: true` means the stored value must be `true`
- do not use `required: true` for bool fields that legitimately need to store `false`
- for flags such as `queue_dirty`, `build_running`, `rerun_requested`, `active`, `visible`, or `featured`, allow the field and seed explicit values on created records instead of forcing `required: true`

Failure recovery note:
- if an early bootstrap migration fails partway through on a development database, clear the partial dev state before retrying so the next run starts from a clean schema baseline
- do not assume a partially applied `0001` can always be retried safely without cleanup

---

## 12. Reference migration pattern

```javascript
// pb_migrations/0001_initial_schema.js
migrate(
    // up
    function(app) {
        var products = new Collection({
            name: "products",
            type: "base",
            fields: [
                { name: "sku",        type: "text",   required: true },
                { name: "name",       type: "text",   required: true },
                { name: "slug",       type: "text",   required: true },
                { name: "price",      type: "number", required: true },
                { name: "compare_price", type: "number" },
                { name: "stock",      type: "number", required: true },
                { name: "description_markdown", type: "text" },
                { name: "short_description",    type: "text" },
                { name: "images",     type: "file",   maxSelect: 10 },
                { name: "categories", type: "relation", collectionId: "CATEGORIES_ID" },
                { name: "tags",       type: "json" },
                { name: "active",     type: "bool" },
                { name: "featured",   type: "bool" },
                { name: "visible",    type: "bool" },
                { name: "meta_title", type: "text" },
                { name: "meta_desc",  type: "text" },
                { name: "sort_order", type: "number" }
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_products_sku ON products (sku)",
                "CREATE UNIQUE INDEX idx_products_slug ON products (slug)"
            ]
        });
        app.save(products);

        // ... define categories, orders, carts, build_logs, build_state, cms_sessions
        // carts example with composite unique:
        var carts = new Collection({
            name: "carts",
            type: "base",
            fields: [
                { name: "user",    type: "relation", required: true, collectionId: "USERS_ID" },
                { name: "product", type: "relation", required: true, collectionId: "PRODUCTS_ID" },
                { name: "qty",     type: "number",   required: true }
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_carts_user_product ON carts (user, product)"
            ]
        });
        app.save(carts);
    },
    // down
    function(app) {
        var products = app.findCollectionByNameOrId("products");
        app.delete(products);
        var carts = app.findCollectionByNameOrId("carts");
        app.delete(carts);
    }
);
```

---

## 13. Review checklist

Before considering migration work complete, verify:
- every durable collection change exists in `pb_migrations/`
- `carts` enforces unique `(user, product)`
- `build_state` contains the fields required by the build lock and stale-lock recovery contract
- `cms_sessions` contains the fields required by the CMS auth and CSRF contract
- checkout/runtime code does not assume undocumented schema
- export logic does not depend on fields migrations do not define
