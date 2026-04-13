---
name: hugo-export-seo
description: Keep Hugo storefront rendering, exported JSON shape, and SEO outputs aligned with the static-first contract.
---

Use this skill whenever a task touches `hugo-site/`, exported data files, product/category pages, metadata, sitemap, robots, or structured data.

## Ownership
- Hugo owns public crawlable storefront pages.
- Hugo owns titles, meta descriptions, canonical URLs, OG/Twitter metadata, sitemap, robots.txt, and structured data.
- PocketBase may enhance UX through runtime fragments but must not replace static SEO-critical output.

## Export boundary
- Public storefront pages render from exported JSON.
- Keep stable field names and predictable field presence.
- `products.tags` is a JSON array of strings with deterministic ordering.
- `description_markdown` is canonical authoring source.
- `description_html` is derived, sanitized, storefront-safe HTML.

## SEO rules
- Product and category pages must include one title, one meta description, one canonical URL, and visible crawlable body content.
- Do not make the primary product description client-only.
- Canonicals must point to public routes, never fragments or CMS URLs.
- Do not output fake ratings, fake review data, or broken JSON-LD.
- robots rules must not block public asset delivery such as `/api/files/`.

## Review checklist
1. Did any change alter the export shape consumed by Hugo templates?
2. Are titles/meta/canonical values still derived correctly?
3. Is sanitized HTML rendered statically where required?
4. Do sitemap and robots match current public indexability rules?
5. Are product/category images and alt text still storefront-safe?

## Finish by reporting
- export flow impact
- SEO output impact
- any template or schema coupling changed
