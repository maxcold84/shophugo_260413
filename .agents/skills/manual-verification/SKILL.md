---
name: manual-verification
description: Run the repository’s manual smoke-test mindset after changes to critical ecommerce flows.
---

Use this skill near the end of a task when behavior changed in auth, CMS CRUD, build pipeline, cart, checkout, export, or SEO.

## Verification mindset
Phase one prioritizes manual verification with structured scenarios.
Do not stop at “the code looks right.” Check the actual operational flow.

## Always map the task to scenarios
Choose the relevant scenarios from `docs/testing-strategy.md`, including as needed:
- Fresh start
- CMS authentication
- Product CRUD
- Category CRUD
- Build pipeline
- Build lock and recovery
- Guest cart flow
- Authenticated cart and merge
- Checkout prepare
- Checkout submit and stock decrement
- SEO output

## Minimum reporting format
For each scenario you touch, report:
- what was checked
- expected result
- actual observed or reasoned result
- gaps not validated

## High-priority regressions to watch
- login page blocked by over-broad `/cms/**` auth guard
- missing or invalid CSRF checks on privileged POST routes
- stale-lock recovery unreachable because `queue_dirty` is false
- guest cart treated as authoritative instead of draft intent
- order success path possible without successful stock decrement
- robots blocking public asset delivery
- export shape drift breaking Hugo templates

## Finish by reporting
- scenarios covered
- unresolved risks
- recommended follow-up checks
