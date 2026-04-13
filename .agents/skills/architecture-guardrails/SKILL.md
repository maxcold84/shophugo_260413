---
name: architecture-guardrails
description: Enforce the static-first hypermedia-driven architecture boundaries for Hugo 0.160.1 + PocketBase 0.36+ work.
---

Use this skill whenever a task changes routes, page rendering, fragments, or system boundaries.

## Goal
Protect the core architecture:
- Hugo 0.160.1 owns public crawlable storefront pages and SEO-critical rendering.
- PocketBase 0.36+ owns runtime state, privileged actions, validation, fragments, checkout, and build orchestration.
- The browser contract is HTML documents and HTML fragments.
- Do not introduce a browser-facing JSON application API.
- Do not drift into SPA architecture.

## Required checks
Before editing, verify all of the following:
1. Which layer owns the change: Hugo, PocketBase, or client enhancement.
2. Whether the task would accidentally create a browser-facing JSON contract.
3. Whether the change belongs in a static page, runtime fragment, CMS surface, or build/export flow.
4. Whether the change affects a focused contract document that must also be updated.

## Hard rules
- Pages are static. State is dynamic.
- PocketBase is the only long-running application process.
- htmx is transport for HTML fragments only.
- Alpine.js is for micro-interactions only.
- localStorage is convenience state only and never authoritative.
- Keep CMS and storefront concerns separated.
- Keep fragment responses HTML-only.

## Forbidden drift signals
Stop and redesign if the proposed change includes any of these:
- JSON payloads for storefront rendering
- client-rendered product listing or detail views from JSON
- React/Vue/Next/Nuxt adoption
- a new Node.js or Go runtime service
- moving SEO-critical content out of Hugo static output
- using PocketBase as a page builder instead of data/runtime authority

## Output checklist
When you finish, summarize:
- ownership decision
- any contract docs touched
- whether the browser contract remained HTML-only
- whether the static-first HDA architecture was preserved
