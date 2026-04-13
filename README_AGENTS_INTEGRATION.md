# Codex Repo Customization with Integrated AGENTS.md

This package is a drop-in customization set for the self-hosted ecommerce boilerplate.

## Included

- `AGENTS.md` — integrated replacement version with:
  - Hugo 0.160.1 and PocketBase 0.36+ pinning
  - revised contract clarifications
  - Codex repo-local skills guidance
  - subagent usage rules
- `.agents/skills/*` — repo-local skills
- `.codex/agents/*` — custom subagents
- `CODEX_SYSTEM_PROMPT.txt` — optional high-authority Codex prompt
- `TASK_PROMPT_TEMPLATE.txt` — reusable task prompt template

## Recommended placement

Copy these into the repository root:

- `AGENTS.md` → repository root
- `.agents/skills/...` → repository root
- `.codex/agents/...` → repository root
- `CODEX_SYSTEM_PROMPT.txt` and `TASK_PROMPT_TEMPLATE.txt` → optional reference files in repository root or internal docs

## Why this AGENTS.md version exists

It keeps the original project architecture intact while explicitly adding:

- authenticated cart remains in phase one
- no full customer account UI in phase one
- checkout success requires successful authoritative stock decrement
- explicit compensating failure handling when full transaction rollback is unavailable
- stale-lock recovery independent of `queue_dirty`
- export after lock acquisition and immediately before Hugo invocation
- guest cart sync via POST + HTML form encoding
- deterministic `products.tags`
- text `cms_sessions.admin_ref`
- `build_state` singleton expectation
- robots rules must not block public `/api/files/`

## Suggested Codex flow

1. Read `AGENTS.md`
2. Read `docs/implementation-contract.md`
3. Read the focused contract doc for the task
4. Invoke matching repo-local skills
5. Spawn subagents only for large or cross-cutting work
6. Make minimal contract-preserving edits
7. Summarize impacts and verification

## Notes

- `AGENTS.md` remains the highest-priority instruction layer inside the repository.
- The skills and custom subagents are meant to reduce drift, not replace the docs.
- Keep the revised contract docs in sync with real implementation behavior.
