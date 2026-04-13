# Codex project customization bundle

This bundle is designed for the Hugo 0.160.1 + PocketBase 0.36+ self-hosted ecommerce boilerplate.

## Included

- `.agents/skills/` repo-local skills
- `.codex/agents/` custom subagents
- `CODEX_SYSTEM_PROMPT.txt`
- `TASK_PROMPT_TEMPLATE.txt`

## Recommended placement inside your repo

- Copy `.agents/skills/` into the repository root.
- Copy `.codex/agents/` into the repository root.
- Merge the contents of `CODEX_SYSTEM_PROMPT.txt` into your Codex system prompt or project instructions workflow.
- Use `TASK_PROMPT_TEMPLATE.txt` when you want Codex to explicitly invoke subagents and skills for larger tasks.

## Suggested first custom agents

- `contract-auditor`
- `pb-runtime-guard`
- `hugo-seo-builder`
- `verification-reviewer`

## Suggested first skills

- `architecture-guardrails`
- `pb-hooks-es5`
- `checkout-safety`
- `build-orchestration`
- `cms-auth-session`
- `hugo-export-seo`
- `migration-discipline`
- `manual-verification`
- `contract-review`
