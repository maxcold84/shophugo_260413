# SEO Rules

This document defines the SEO contract for the self-hosted ecommerce boilerplate.

It supplements:
- `AGENTS.md`
- `docs/implementation-contract.md`
- `docs/data-shape.md`

If implementation convenience conflicts with crawlability or correctness, prefer server-rendered, crawlable output.

If there is any conflict, follow:
1. `AGENTS.md`
2. `docs/implementation-contract.md`
3. `docs/data-shape.md`
4. `docs/seo-rules.md`
5. current task instructions

---

## 1. SEO ownership

SEO-critical rendering belongs to Hugo.

Hugo must own:
- page `<title>` output
- meta description output
- canonical URL output
- Open Graph output
- Twitter Card output
- crawlable body content
- sitemap generation
- robots.txt generation
- structured data output

PocketBase runtime fragments may enhance UX, but they must not replace the SEO contract of statically rendered storefront pages.

---

## 2. Product page requirements

Every statically generated product page must include:
- one unique `<title>`
- one meta description
- one canonical URL
- a visible H1
- semantic headings beneath the H1 where useful
- crawlable product description content
- useful product image alt text
- Open Graph basics
- Twitter Card basics
- breadcrumb structured data where appropriate
- product structured data where appropriate

### Title rules
Priority: 1. `meta_title`  2. safe derived product title based on product name and store context
Titles must be unique, not empty, not keyword-stuffed.

### Meta description rules
Priority: 1. `meta_desc`  2. `short_description`  3. safe derived summary
Do not output an empty description tag. Keep the description factual.

### Visible content rules
Product pages must include crawlable visible content for product name, price context, description content, category context.
Do not make the primary product description client-only.

---

## 3. Category page requirements

Every statically generated category page must include:
- one unique `<title>`
- one meta description
- one canonical URL
- a visible H1
- semantic descriptive content when available
- crawlable product listing markup
- breadcrumb structured data where appropriate

Category pages must remain crawlable even if runtime filters exist.

---

## 4. Site-level SEO output

The site must produce:
- `robots.txt`
- XML sitemap
- organization structured data where appropriate
- canonical URLs that reflect the final public route structure

Rules:
- do not emit broken canonical URLs
- do not emit staging domains in production output
- do not emit empty organization schema blocks
- keep sitemap entries aligned with visible/indexable pages only

---

## 5. Canonical and indexability rules

Canonical rules:
- one canonical per indexable page
- canonical must point to the preferred public URL
- canonical must not point to fragment endpoints
- canonical must not point to internal CMS URLs

Indexability rules:
- non-visible products/categories should not be treated as indexable storefront pages
- avoid conflicting canonical/indexability states

Changes to slug, visibility, or canonical/indexability fields are build-target mutations.

---

## 6. Structured data rules

Structured data must be truthful, minimal, and derived from stored data.

Allowed schema families: Organization, BreadcrumbList, Product

Rules:
- do not fabricate ratings, review counts, or availability claims
- do not emit empty schema objects or invalid JSON-LD
- keep schema aligned with visible page content

### Product schema expectations
Where appropriate: product name, URL, image, description summary, SKU, price data, category/breadcrumb context. No fake offers or fake review data.

### Breadcrumb schema expectations
Breadcrumb structured data should reflect the actual visible page hierarchy.

---

## 7. Open Graph and Twitter rules

Every public product and category page should include basic social metadata.

Minimum: title, description, URL, image when available, card/type fields.

Rules:
- keep values aligned with canonical page content
- avoid placeholder images in production
- avoid empty content attributes

---

## 8. Product description rendering rules

Canonical authoring source: `description_markdown`
Derived rendering source: sanitized HTML derived from Markdown

SEO rules for description content:
- the rendered product description must be present in the static HTML output
- the rendered description must be sanitized
- the rendered description must not depend on client-side editor libraries
- the same derived HTML policy must be used consistently across Hugo pages and PocketBase fragments

---

## 9. Image and alt-text rules

Rules:
- use useful alt text derived from stored product/category context
- avoid empty alt text for primary informative product imagery
- keep image markup stable and semantic

Phase one fallback policy:
- primary product image alt defaults to the product name
- category image alt defaults to the category name

---

## 10. Runtime fragment boundary

Runtime fragments may support: stock badges, mini cart updates, filtered listings.

Runtime fragments must not replace: primary product/category description content, canonical tags, structured data, robots directives, sitemap generation.

SEO-critical output remains a build-time responsibility.

---

## 11. Hugo configuration reference

### config.toml essentials

```toml
baseURL = "https://example.com/"
languageCode = "en-us"
title = "My Store"

[sitemap]
  changefreq = "weekly"
  filename = "sitemap.xml"
  priority = 0.5

[outputs]
  home = ["HTML", "RSS", "SITEMAP"]

[markup]
  [markup.goldmark]
    [markup.goldmark.renderer]
      unsafe = false  # keep safe — HTML comes pre-sanitized from export
```

### robots.txt template

```
<!-- layouts/robots.txt -->
User-agent: *
Allow: /
Allow: /api/files/

Sitemap: {{ .Site.BaseURL }}sitemap.xml

# Disallow internal endpoints
Disallow: /cms/
Disallow: /api/
Disallow: /actions/
Disallow: /fragments/
```

### Head SEO partial

```html
<!-- layouts/partials/head-seo.html -->
<title>{{ with .meta.title }}{{ . }}{{ else }}{{ .name }} | {{ site.Title }}{{ end }}</title>
<meta name="description" content="{{ with .meta.description }}{{ . }}{{ else }}{{ .short_description }}{{ end }}">
<link rel="canonical" href="{{ .Permalink }}">

<!-- Open Graph -->
<meta property="og:title" content="{{ with .meta.title }}{{ . }}{{ else }}{{ .name }}{{ end }}">
<meta property="og:description" content="{{ with .meta.description }}{{ . }}{{ else }}{{ .short_description }}{{ end }}">
<meta property="og:url" content="{{ .Permalink }}">
<meta property="og:type" content="product">
{{ with index .images 0 }}
<meta property="og:image" content="{{ .url }}">
{{ end }}

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{ with .meta.title }}{{ . }}{{ else }}{{ .name }}{{ end }}">
```

---

## 12. Verification checklist

Before considering SEO work complete, verify:
- product pages have unique titles
- category pages have unique titles
- meta descriptions are present and non-empty when appropriate
- canonical URLs are correct and stable
- critical content is present in static HTML
- structured data is valid and non-empty where emitted
- no fabricated rating/review data is present
- OG/Twitter metadata aligns with visible page content
- robots.txt exists, disallows CMS/action/fragment paths, and does not block public product/category image delivery such as `/api/files/`
- sitemap exists
- non-visible entities are not treated as normal public indexable pages
- runtime fragments are not carrying SEO-critical rendering responsibilities
