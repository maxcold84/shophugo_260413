---
name: manual-verification
description: Run the repository’s manual smoke-test mindset after changes to critical ecommerce flows.
---

Use this skill near the end of a task when behavior changed in auth, CMS CRUD, build pipeline, cart, checkout, export, or SEO.

## Compose with pocketbase-alt-port
When verification needs a disposable local PocketBase runtime, use `.agents/skills/pocketbase-alt-port/SKILL.md` together with this skill.
Prefer:
- `powershell -ExecutionPolicy Bypass -File pocketbase/ensure-alt-port.ps1 -Port <preferred-port> -Dev`
- reusing the currently running repo-local verification port before launching another one
- checking `/`, `/cms/login`, and `/fragments/cart/checkout-summary` before deeper scenario testing

Use this composition when:
- custom CMS or fragment routes may be masked by the wrong server process
- the shared/global PocketBase binary may be using another install's default paths
- you need to compare two local runtimes without stopping the user's main dev server

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
