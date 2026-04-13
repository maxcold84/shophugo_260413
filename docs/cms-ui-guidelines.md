# CMS UI Guidelines

This document defines CMS UI expectations for the self-hosted ecommerce boilerplate.

It supplements:
- `AGENTS.md`
- `docs/implementation-contract.md`
- `docs/cms-routes.md`
- `docs/auth-session.md`

If there is any conflict, follow:
1. `AGENTS.md`
2. `docs/implementation-contract.md`
3. `docs/cms-routes.md`
4. `docs/auth-session.md`
5. `docs/cms-ui-guidelines.md`
6. current task instructions

---

## 1. CMS purpose

The CMS exists to manage canonical commerce data and operational visibility.

It is not:
- a visual page builder
- a client-rendered admin SPA
- the public storefront

CMS responsibilities include:
- authentication-gated admin screens
- product create/edit workflows
- category create/edit workflows
- build status visibility
- validation feedback
- controlled rich-text authoring through TOAST UI Editor

---

## 2. CMS architecture rules

CMS routes live under `/cms/**`.
All CMS pages and fragments are server-rendered.
htmx may be used for partial refreshes and form interactions, but the contract remains HTML.

Rules:
- no browser-facing JSON admin protocol
- no admin SPA state layer
- no frontend access to privileged tokens
- no client-only authorization checks
- no editor-driven trust boundary

---

## 3. Layout expectations

All CMS screens should share one consistent admin layout.

Recommended layout regions:
- top header
- primary navigation
- page title and actions area
- flash/feedback area
- main content panel
- optional secondary status/sidebar area

The CMS should feel operationally consistent across pages.
Do not create one-off layouts for each screen without strong reason.

---

## 4. Navigation model

Minimum CMS navigation should include:
- Dashboard
- Products
- Categories
- Build Status
- Logout

Optional future navigation may include:
- Orders
- Inventory
- Settings

Rules:
- current section must be visually clear
- navigation should remain usable without client-side hydration
- links should degrade gracefully as normal HTML navigation

---

## 5. Required CMS screens

The CMS must include at minimum:
- login page
- dashboard
- product list
- product create form
- product edit form
- category list
- category create form
- category edit form
- build status panel or page

Each required screen must be operationally usable, not placeholder-only.

---

## 6. Tailwind design tokens

All CMS templates must share a consistent design token system. Use these conventions across all CMS views.

### Button hierarchy

```
Primary action:   bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded
Secondary action: bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded
Danger action:    bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded
```

### Text scale

```
Page title:       text-2xl font-bold text-gray-900
Section heading:  text-lg font-semibold text-gray-900
Body text:        text-sm text-gray-700
Helper/muted:     text-xs text-gray-500
```

### Spacing scale

```
Section gap:      space-y-6
Field gap:        space-y-4
Inline gap:       gap-x-3
Card padding:     p-6
Page padding:     px-4 py-6 sm:px-6 lg:px-8
```

### Feedback states

```
Success:  bg-green-50 text-green-800 border border-green-200
Warning:  bg-yellow-50 text-yellow-800 border border-yellow-200
Error:    bg-red-50 text-red-800 border border-red-200
Info:     bg-blue-50 text-blue-800 border border-blue-200
```

### Form field pattern

```
Label:    block text-sm font-medium text-gray-700
Input:    block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm
Error:    mt-1 text-sm text-red-600
```

Use these tokens consistently. Do not invent per-page variations.

---

## 7. Form design principles

CMS forms are server-authoritative.

Rules:
- use normal HTML forms as the baseline
- htmx may enhance submission or partial refreshes
- every field must have a clear label
- required fields must be visually identifiable
- validation errors must be rendered server-side
- field-level errors should appear near the relevant field when practical
- form-wide blocking errors should appear near the top of the form

Do not rely on client-side validation as the only validation layer.

---

## 8. Product form guidelines

Product create/edit should expose at minimum:
- SKU, name, slug
- price, compare price, stock
- short description
- description_markdown via TOAST UI Editor
- categories, tags
- active, visible, featured
- meta title, meta description
- sort order
- image upload controls

Rules:
- keep pricing fields grouped
- keep visibility/state fields grouped
- keep SEO fields grouped
- keep media management clearly separated from textual metadata
- avoid mixing operational and presentation settings without headings

---

## 9. Category form guidelines

Category create/edit should expose at minimum:
- name, slug, description, image, visible, sort order, meta title, meta description

Rules:
- category fields should be simpler than product fields
- do not overload category screens with product-specific controls
- keep SEO and visibility clearly labeled

---

## 10. List screen guidelines

Product and category list pages should be operationally efficient.

Recommended features:
- obvious create action
- tabular or structured list layout
- edit links per row
- visibility/state indicators
- empty state handling
- search/filter hooks if implemented

Minimum visible product list columns:
- name, SKU, slug, price, stock, active/visible state

Minimum visible category list columns:
- name, slug, visible state, sort order

---

## 11. Dashboard guidelines

The dashboard should prioritize operational clarity.

Recommended dashboard blocks:
- quick links to products and categories
- current build status
- last build result summary
- last build timestamp
- counts or lightweight operational summaries when available

Do not overcomplicate the dashboard with decorative widgets.

---

## 12. Build status UI guidelines

Build status must be easy to inspect from the CMS.

Recommended data points:
- current queue state
- whether a build is running
- last changed / last built timestamps
- most recent build result
- recent log excerpt or status summary

Rules:
- polling or fragment refresh is acceptable and preferred for phase one
- build status UI must not require websocket coupling
- failures must be visually distinct from success
- build failures must not be hidden behind collapsed technical details only

---

## 13. TOAST UI Editor usage rules

TOAST UI Editor is allowed only on product create/edit pages.

Rules:
- Markdown is the canonical stored content
- editor output is not the rendering contract
- derived HTML must be sanitized server-side before persistence or export
- the editor must not be loaded on unrelated CMS pages unless clearly needed
- editor configuration should remain minimal and deterministic

---

## 14. Feedback and messaging

CMS feedback should be explicit and operational.

Use clear server-rendered feedback for:
- successful save, validation failure, login failure, logout success, build failure, stock/slug conflicts

Good feedback should be:
- concise, specific, tied to the relevant action, visible without requiring browser console inspection

---

## 15. Security-sensitive UI rules

The CMS UI must not imply that browser state is trusted.

Rules:
- never expose admin tokens in the DOM for convenience
- never rely on hidden form fields for authorization
- never rely on localStorage for privileged decisions
- destructive or important actions must still validate server-side

---

## 16. Accessibility and usability baseline

Must do:
- provide labels for form controls
- preserve keyboard navigability
- keep focus behavior predictable
- keep button text explicit
- ensure error states are visible in text, not color only
- keep link/button distinction clear

Do not build an admin UI that only works when heavily scripted.

---

## 17. Fragment and partial usage in CMS

CMS may use runtime fragments for:
- build status refresh, inline validation blocks, table refreshes, contextual side panels

Rules:
- fragment responses must remain HTML
- fragment markup must match CMS layout conventions
- avoid over-fragmenting basic pages without a clear UX benefit

---

## 18. Empty states and edge cases

Every CMS screen must handle empty states explicitly.

Examples:
- no products yet, no categories yet, no recent builds yet, missing product images, build log unavailable

Guidelines:
- empty states should explain what to do next
- empty states should include the relevant create action when possible
- empty states should not look like broken pages

---

## 19. Implementation checklist

Before closing CMS UI work, verify:
- all required CMS screens exist
- all CMS routes are protected server-side
- forms render labels and server-side validation feedback
- TOAST UI Editor is restricted to product create/edit
- build status is visible and understandable
- list views are usable without client-side JSON rendering
- Tailwind design tokens are used consistently across all CMS views
- feedback states are clear
- layout and navigation are consistent across screens
- no privileged browser-side shortcuts were introduced
