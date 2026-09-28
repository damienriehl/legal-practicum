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

The follow-up finding in batch `batch-20260927T202056Z`, commit `7009a81`,
exposed a distinction between stored and fresh originals: the commit changed
only `.build-stamp.json`, yet exact stored equality reported `noop_verified:false`.
`_gate_group` accepts a fresh source block when its normalized hash agrees with
the stored original hash, then puts the fresh block text into `Patch.original_text`.
`_atomic_review_operations` compares that fresh text to `new_text`;
`build_review_revisions` omits the source when no operations result. Thus fresh
and new can be byte-identical while stored original and new differ only in
quotes, whitespace, or Unicode normalization. Python production code needs no
change; a gate-to-revision regression test preserves this mechanism.

Finalize now selects normalized stored equality only when
`Array.isArray(review_revisions)` is true (including an empty array) and no
revision covers the suggestion. The current client with a production frontier
would have emitted operations and a covering revision for changed bytes. With
absent/null review evidence, keep exact stored equality: Python's tokenizer
retains whitespace and punctuation, so normalization alone does not prove a
byte-level no-op. Both predicates exclude structural and page-override actions.
Receipts record `match: "exact" | "normalized"`; the additive schema migration
marks pre-existing rows `exact`. Hashing remains synchronous SHA-256 of normalized
stored original text.

Historical dry-run returns only IDs and the exact `noop_verified` and
`normalized_match` booleans. Before opting into `match: "normalized"`, the operator
must confirm with `git show --stat <commit_sha>` that the done batch changed no
source file. Write mode defaults to exact and validates all IDs atomically.
Replay must use the same match; differing match values conflict. Audit exposes
`noop_applications_normalized` while keeping all coverage invariants unchanged.

Tests connect the Worker predicate to actual Python operation generation, test
atomic rejection/rollback and replay, and exercise the real route and Durable
Object. The SQL test adapter must return rows for CTE queries: treating only
queries beginning with SELECT as row-producing silently made the audit's WITH
query appear to report zero violations.
