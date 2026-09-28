---
artifact_contract: "ce-handoff/v1"
created_at: "2026-09-28T03:00:00Z"
title: "Packet C readiness restored; apply engine no longer reports silent no-ops as applied"
summary: "The Publisher readiness audit is green (ready_to_prepare). A real apply-engine bug that reported an unchanged edit as applied is fixed. The release queue holds no reviewable operations yet."
keywords: ["packet-c", "release-readiness", "apply-engine", "noop", "reconcile-noop"]
repository: "legal-practicum"
branch: "main"
head: "421dec605c6ed22b0e740d08b2ec12c75947399e"
---

# Packet C readiness restored; apply engine no longer reports silent no-ops as applied

## Where things stand

- **Readiness is green.** `tools/prod_release_readiness.py` (against the editor Worker host, not the
  Access-protected editor domain) reports `ready: true, reason: ready_to_prepare`, every invariant 0.
  Routine release stays config-off with its timer disabled, as Packet C requires.
- **The queue has nothing to review yet.** The one queued batch (`batch-20260927T202056Z`) carries no review
  operations. A meaningful Packet C review needs at least one real editor change to flow through apply first.
- **The apply daemon is running** on `421dec6` with the fix below.

## What happened

1. The Packet C readiness check failed with `unreconciled_applied_suggestions: 1`.
2. That suggestion (Packet A's editor round-trip on `data/curriculum/m1.md#bd3a87cb4`) had been reported
   **applied**, but its apply commit `7009a81` changed only the build stamp.
3. **Root cause** (PR #84): the editor map stores raw Markdown as `original_text`, while the submission was plain
   rendered text identical to the current rendering. `span_splice` restored the italic markers, rebuilt the
   original source byte-for-byte, and the writer "replaced" it with identical bytes. The engine now rejects such
   splices and, after writing, turns any change-requesting group whose own isolated effect leaves source bytes
   unchanged into `needs_human` (measured per group; atomic abandonment keeps valid co-tenants on the replay path).
4. **Ledger repair** (PRs #81, #82, #83, #85): an append-only no-op receipt table and a
   `reconcile-noop` endpoint (exact / normalized / rendered, Worker-verified; finalize is exact-only; text-free
   dry-run diagnostics). The record was reconciled with `match: "rendered"`: its submitted text hashes to the
   block's current rendering in the Worker-bundled map, and Git shows the commit changed no source file.
5. **Also fixed:** the daemon checkout had diverged from `origin/main` (apply commit never pushed); the Packet C
   instructions pointed the readiness check at an Access-protected host; `docs/TODO.md` closed T06 and T09 (#80).

Learnings: `docs/solutions/worker/2026-09-27-noop-applies-escape-review-coverage.md`,
`docs/solutions/worker/2026-09-27-apply-reported-applied-without-source-change.md`.
Plans: `docs/plans/2026-09-27-1916-fix-noop-apply-review-coverage-plan.md`,
`docs/plans/2026-09-27-2130-fix-apply-silent-noop-plan.md`.

## Open items

- **Packet C human review** waits for a real editor change to reach the queue (then Damien reviews at the
  Publisher page and authorizes the exact candidate).
- **Known test failures on this host:** 3 tests in `tools/tests/test_prove_queues_empty.py` expect uutils
  coreutils 0.8.0; the host has 0.10.0. They fail identically on `main`; not caused by this work.
- Packets B (Anthropic unvalidated; legacy key revocation) and E (sign-ins, materials, calibration) remain
  human-gated, unchanged tonight.

## Operational detail

Deploy IDs, rollback targets, and evidence files live in the private companion outside Git.
