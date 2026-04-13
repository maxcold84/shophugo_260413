# AGENTS.md Integration Changes

This package adds an integrated `AGENTS.md` that combines:

- the original repository architecture guidance
- revised contract clarifications from the document review
- Codex-oriented repo-local skill guidance
- Codex subagent usage rules

## Main additions

- Exact version targets: Hugo 0.160.1, PocketBase 0.36+
- Phase one authenticated cart is explicitly retained
- Full customer account UI remains out of scope
- Checkout atomicity / compensation guidance added
- Build stale-lock recovery independence clarified
- Export timing clarified
- Guest cart sync contract clarified
- `build_state`, `products.tags`, and `cms_sessions.admin_ref` clarified
- `robots.txt` public asset rule clarified
- Codex execution section added
