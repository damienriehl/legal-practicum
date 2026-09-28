---
title: "Net no-op applies need Worker-verified review coverage"
lane: worker
tags: [review-ledger, no-op, apply, audit, reconciliation]
status: resolved
related: ["app/worker/src/editor-store-core.js", "tools/apply_suggestions.py", "docs/prod-release-operations.md"]
---

# Failure mode

An accepted editor round-trip restored the original wording. Apply finalized the
suggestion as applied, but Python `build_review_revisions` omitted the source
because `_atomic_review_operations` returned no operations. The production audit
then reported an unreconciled applied suggestion. The one-time legacy migration
was already closed, so it could not repair this newer attribution gap.

# Prevention

Record append-only `production_noop_applications` inside the done-finalize
transaction for uncovered, Worker-verified no-ops. Historical remediation uses
the admin-bearer/CSRF `reconcile-noop` endpoint with atomic per-ID validation and
idempotent receipts. Audit counts include these receipts, and overlap with review
revisions or legacy exclusions remains a zero-expected invariant. No-op coverage
never becomes an operation, decision, or release member.

Normalization parity alone is insufficient evidence: Python's review tokenizer
retains whitespace and punctuation. Require exact stored string equality for
prose and JSON scalar edits, which implies normalized equality and identical
Python token sequences. Python's oversized-input fallback also returns no
operations for exact equality. Exclude structural and page-override actions;
structural operations can carry intent even with identical text. Hash normalized
text synchronously for attribution, without awaiting inside the transaction.

Tests connect the Worker predicate to actual Python operation generation, test
atomic rejection/rollback and replay, and exercise the real route and Durable
Object. The SQL test adapter must return rows for CTE queries: treating only
queries beginning with SELECT as row-producing silently made the audit's WITH
query appear to report zero violations.
