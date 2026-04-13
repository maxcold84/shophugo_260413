---
name: contract-review
description: Review planned or completed changes against AGENTS.md and the revised focused contract documents before finalizing work.
---

Use this skill when a task spans multiple layers or when you need to confirm that code, docs, and architecture still agree.

## Review order
Read and compare in this order:
1. `AGENTS.md`
2. `docs/implementation-contract.md`
3. the focused contract document for the touched area
4. the actual code and migrations
5. any updated docs

## What to look for
- contract drift between docs and code
- internal contradictions between focused docs
- implementation details that violate stated invariants
- schema/doc mismatches
- test strategy gaps for changed behavior

## High-signal questions
1. Does the implemented behavior match the strongest applicable document?
2. Did the task accidentally widen scope beyond phase one?
3. Is any reference pattern now inconsistent with the prose contract?
4. Do docs need an update because behavior changed?
5. Would a new engineer implement the same thing from the docs alone?

## Severity rubric
- Critical: security, stock, order integrity, or architecture boundary violations
- High: durable build/export/auth drift likely to cause production issues
- Medium: unclear ownership, schema ambiguity, incomplete docs, missing validation detail
- Low: wording, naming, or consistency improvements

## Finish by reporting
- findings grouped by severity
- exact files affected
- recommended fixes
- whether the architecture remains compliant
