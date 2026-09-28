---
title: Cover net no-op applied suggestions in the production review ledger - Plan
type: fix
date: 2026-09-27
topic: noop-apply-review-coverage
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
---

# Cover net no-op applied suggestions in the production review ledger - Plan

## Problem

Packet C (Publisher review → exact candidate → canary) cannot start. The read-only
readiness report (`tools/prod_release_readiness.py`, 2026-09-27) returns
`ready: false, reason: invariant_failure` with `unreconciled_applied_suggestions: 1`.
Any nonzero invariant is a rollout stop (`app/worker/API-CONTRACTS.md`).

Root cause: the 2026-09-27 Packet A editor round-trip ended with the original
wording, so its one accepted suggestion was a net no-op. The apply engine applied it
(commit `7009a81`, only `.build-stamp.json` changed) and finalized it as `applied`,
but `build_review_revisions` (`tools/apply_suggestions.py`) skips a source whose patch
yields no operations (`if not operations: continue`). No review revision and no
legacy exclusion covers the suggestion, so the audit's coverage query counts it as
unreconciled forever. The only prior remedy, `POST /publisher/review/reconcile-legacy`,
is permanently closed after its first receipt (2026-08-11).

The production frontier was present at claim time (one `complete` release), so this is
not the null-`prod_base` bootstrap path.

## Scope

In: the Worker ledger (`app/worker/src/editor-store-core.js`, endpoint wiring in
`app/worker/src/editor.js` / `editor-endpoints.js`), its tests, the Python apply
engine only if needed for evidence/logging, and the operator docs
(`app/worker/API-CONTRACTS.md`, `docs/prod-release-operations.md`).

Out: release preparation/authorization logic, the legacy reconciliation endpoint,
Publisher UI, any production data change other than the remediation call in U3.

## Key decisions

- **Coverage is Worker-verified, never client-asserted.** A suggestion counts as a
  no-op only when the Worker's own stored `original_text` and `new_text` are equal
  under the Worker's `text-norm.js` `normalize` (the Python `text_norm` parity
  implementation). A client cannot hide a real change by labelling it a no-op. If the
  Worker check is stricter than Python's tokenized comparison, the suggestion stays
  uncovered and the audit keeps failing closed — acceptable.
- **A dedicated table, not a legacy exclusion.** No-op coverage is recorded in a new
  append-only table (e.g. `production_noop_applications`: suggestion_id PK, batch_id,
  commit_sha, normalized hash, created_at, actor/source). It never becomes an
  operation, decision, or release member. The audit's `covered` CTE adds it.
- **Forward fix in finalize.** On `phase === "done"`, every `applied` id not covered by
  a review revision in the same call is checked; Worker-verified no-ops are recorded
  inside the same transaction. Non-no-op uncovered ids keep today's behavior.
  Idempotent on replay.
- **Narrow remediation for historic rows.** One admin-bearer + CSRF endpoint
  (same auth as `reconcile-legacy`), e.g. `POST /edit/v1/publisher/review/reconcile-noop`,
  body `{ suggestion_ids: [...] }` (bounded). Atomic: every id must be `applied`,
  uncovered, in a `done` batch with a commit SHA, and Worker-verified no-op, or
  nothing is written. Exact replay is idempotent. Returns only IDs and counts, no text.
  A `dry_run: true` body (ids omitted) returns the uncovered applied suggestion IDs
  with a per-ID `noop_verified` boolean and writes nothing, so the operator never
  needs to read suggestion text to find the IDs.
- Add an invariant/count for visibility (e.g. `noop_applications` in counts) and keep
  `legacy_exclusion_review_overlap`-style overlap checks for the new table.

## Implementation units

- **U1 Worker ledger + finalize.** Schema, verified no-op recording in finalize,
  audit coverage + counts, overlap invariant. Tests: no-op applied suggestion is
  covered after finalize; real change without revision stays unreconciled; client
  cannot cover a non-no-op; replay idempotent; whitespace-only vs content change.
- **U2 Remediation endpoint.** Route, auth parity with `reconcile-legacy`, atomic
  validation, idempotent replay, text-free response. Tests for every rejection path.
- **U3 Operate (orchestrator, not worker).** Deploy the editor Worker through the
  normal path, call the remediation endpoint for the one suggestion, re-run
  `tools/prod_release_readiness.py`, and require `unreconciled_applied_suggestions: 0`.
- **U4 Docs.** API contract and prod-release operations entries; a
  `docs/solutions/` learning.

## Verification

- `cd app/worker && npm test` green; `python3 -m pytest tools/tests -q` green;
  `tools/preflight.sh` green.
- Live: readiness report shows all invariants 0 after U3.

## Definition of done

Merged, Worker deployed, remediation receipt recorded (IDs only) in the private
handoff store, readiness invariants all 0, and Packet C's human review can begin.
