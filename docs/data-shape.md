# Data Shape Contract

This document defines the canonical data model, export shape expectations, and rendering-safe field policies for the storefront.

It supplements:
- `AGENTS.md`
- `docs/implementation-contract.md`

If there is any conflict, follow:
1. `AGENTS.md`
2. `docs/implementation-contract.md`
3. `docs/data-shape.md`
4. current task instructions

---

## 1. Purpose

PocketBase is the canonical source of truth.
Hugo is the canonical public page renderer.

This document exists to keep the handoff boundary stable between:
- PocketBase records
- normalized exported JSON
- Hugo templates
- runtime PocketBase fragments

Goals:
- deterministic exports
- stable field naming
- safe rendering inputs
- minimal runtime joining in Hugo
- no accidental frontend JSON API drift

---

## 2. Canonical content model

### Product description

Canonical authoring field: `description_markdown`
Authoring surface: TOAST UI Editor in CMS only
Derived rendering field: sanitized HTML derived from Markdown

Rules:
- Markdown is the only canonical long-form product description source
- raw editor-generated HTML is never authoritative
- any derived HTML must be sanitized server-side before export or privileged rendering
- Hugo pages and PocketBase fragments must render from the same derived HTML policy

### Short description

Canonical field: `short_description`

Rules:
- short description is plain text or plain-safe content only
- do not treat short description as arbitrary trusted HTML
- keep it concise and storefront-safe

---

## 3. Canonical collection fields

For full schema definitions and migration requirements, see `docs/implementation-contract.md` §8 and `docs/migrations-policy.md`.

### products
sku, name, slug, price, compare_price, stock, description_markdown, short_description, images, categories, tags (stable array of strings), active, featured, visible, meta_title, meta_desc, sort_order

### categories
name, slug, description, image, visible, sort_order, meta_title, meta_desc

### orders
user, email, status, items, subtotal_amount, discount_amount, shipping_amount, tax_amount, total_amount, address, paid_at, cancelled_at

### carts
user, product, qty
Constraint: unique composite (user, product)

---

## 4. Export boundary rules

Storefront pages must render from exported JSON files:
- `pocketbase/hugo-site/data/products.json`
- `pocketbase/hugo-site/data/categories.json`

Hugo must read:
- `hugo.Data.products`
- `hugo.Data.categories`

Export rules:
- export only storefront-needed fields
- export only storefront-eligible records
- flatten relations enough to avoid runtime joins in Hugo
- keep export ordering deterministic
- keep field presence predictable
- preserve stable field names over time
- sanitize any derived HTML before export
- fail loudly when required storefront data is invalid

Optional enrichments may fail softly.
Required storefront data must fail the build.

Public export may retain explicit `active` and `visible` booleans for template clarity, but must not leak ineligible records.

---

## 5. Suggested normalized export shape

### Product export shape

```json
{
  "id": "product_record_id",
  "sku": "SKU-001",
  "slug": "sample-product",
  "name": "Sample Product",
  "price": 19900,
  "compare_price": 24900,
  "active": true,
  "visible": true,
  "featured": false,
  "sort_order": 10,
  "short_description": "Short plain-text description.",
  "description_html": "<p>Sanitized storefront-safe HTML.</p>",
  "meta": {
    "title": "Sample Product",
    "description": "SEO description"
  },
  "images": [
    {
      "url": "/api/files/products/record/image.jpg",
      "alt": "Sample Product image",
      "position": 0
    }
  ],
  "categories": [
    {
      "id": "category_record_id",
      "slug": "sample-category",
      "name": "Sample Category"
    }
  ],
  "tags": ["tag-one", "tag-two"]
}
```

### Category export shape

```json
{
  "id": "category_record_id",
  "slug": "sample-category",
  "name": "Sample Category",
  "description": "Category description",
  "visible": true,
  "sort_order": 5,
  "meta": {
    "title": "Sample Category",
    "description": "Category SEO description"
  },
  "image": {
    "url": "/api/files/categories/record/image.jpg",
    "alt": "Sample Category image"
  }
}
```

---

## 6. Field-level rendering rules

### Text fields
Use raw text for: `name`, `short_description`, `meta_title`, `meta_desc`, category `description`
Rules: escape by default in templates. Only render as HTML when the field is explicitly exported as sanitized HTML.

### HTML fields
Allowed storefront HTML field: `description_html`
Rules: must be server-derived, must be sanitized, must never come directly from unsanitized CMS editor output.

### Numeric fields
Use numeric types for: `price`, `compare_price`, `stock`, `sort_order`, order amount fields.
Rules: authoritative commerce amounts must use integer minor units. Keep raw numeric values in export. Do not export preformatted currency strings.

### Boolean fields
Use booleans for: `active`, `visible`, `featured`.
Rules: do not overload string values. Rendering logic should not guess boolean intent.

---

## 7. Hugo template consumption patterns

### Product listing

```html
<!-- layouts/_default/list.html -->
{{ range sort .Site.Data.products "sort_order" "asc" }}
  {{ if and .active .visible }}
    <div class="product-card">
      <a href="/products/{{ .slug }}/">
        {{ with index .images 0 }}
          <img src="{{ .url }}" alt="{{ .alt }}" />
        {{ end }}
        <h3>{{ .name }}</h3>
        <p>{{ printf "$%d.%02d" (div .price 100) (mod .price 100) }}</p>
      </a>
    </div>
  {{ end }}
{{ end }}
```

### Price formatting partial

```html
<!-- layouts/partials/format-price.html -->
<!-- Usage: {{ partial "format-price.html" .price }} -->
{{ $dollars := div . 100 }}
{{ $cents := mod . 100 }}
<span class="price">${{ $dollars }}.{{ printf "%02d" $cents }}</span>
```

### Category page with product filtering

```html
<!-- layouts/categories/single.html -->
{{ $catSlug := .Params.slug }}
{{ range sort .Site.Data.products "sort_order" "asc" }}
  {{ if and .active .visible }}
    {{ range .categories }}
      {{ if eq .slug $catSlug }}
        <!-- render product card -->
      {{ end }}
    {{ end }}
  {{ end }}
{{ end }}
```

---

## 8. Image normalization rules

Each exported image object should be stable enough to support:
- URL, alt text, position/order, optional width/height when available

Rules:
- keep ordering deterministic
- derive useful alt text conservatively
- do not fabricate rich descriptive claims

Phase one fallback policy:
- product image alt defaults to the product name
- category image alt defaults to the category name

---

## 9. Category relation normalization rules

Products may relate to one or more categories.

Export rules:
- normalize category references into lightweight embedded objects
- include enough information for Hugo page rendering and linking
- avoid requiring Hugo to perform runtime joins

Recommended category relation fields inside product export: `id`, `slug`, `name`

---

## 10. Tags rules

Tags should export as a stable array of strings.
Avoid mixed shapes across records. Preserve ordering consistently. Do not allow null-heavy or inconsistent tag output.

---

## 11. Storefront visibility rules

### Products
A product is storefront-eligible only when: `active = true` AND `visible = true`

### Categories
A category is storefront-eligible only when: `visible = true`

Rules:
- hidden or inactive records must not accidentally leak into public listing pages
- export logic must make eligibility explicit and deterministic

---

## 12. Sort order rules

Use numeric sort fields for deterministic listing order.
Primary ordering: `sort_order`. Secondary ordering: `name` or `slug`.
Do not rely on database insertion order.

---

## 13. SEO field rules

SEO fields: `meta_title`, `meta_desc`

Recommended fallback pattern:
- `meta.title` falls back to `name`
- `meta.description` falls back to `short_description` or a safe truncated text summary

---

## 14. Runtime fragment data alignment

PocketBase runtime fragments must stay aligned with the same data rules used for static rendering.

Rules:
- the same sanitized HTML policy must apply to product descriptions
- the same visibility logic must apply to cart and listing fragments
- the same price source of truth must apply everywhere
- runtime HTML must not invent alternate field semantics

---

## 15. What must never be exported

Do not expose:
- raw admin/session tokens
- operational build queue fields
- internal validation-only flags
- unsanitized editor HTML
- raw payment secrets
- CMS-only helper state

---

## 16. Verification checklist

Before treating export work as complete, verify:
- exported product/category arrays are deterministic
- field names are stable and predictable
- `description_markdown` remains canonical in storage
- `description_html` is derived and sanitized
- hidden/inactive records do not leak into public exports
- category relations are flattened enough for Hugo
- image objects are normalized consistently
- numeric pricing data stays numeric
- authoritative money fields remain integer minor units
- no privileged or operational-only fields leak into export
- Hugo templates can render without runtime guessing
