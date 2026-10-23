---
title: "fix: apply rollback finalizes gate-classified rows on build/parity/deploy failure"
type: fix
status: completed
date: 2026-10-23
---

# fix: apply rollback finalizes gate-classified rows on build/parity/deploy failure

## Problem

`run_apply` classifies claimed rows into drift, needs_human, and candidate
patches before it patches. The validator-red rollback finalizes all three lists.
The build-failure, parity-mismatch, and deploy-failure rollbacks finalized only
`accepted_blocked`, so drift/needs_human rows stayed `in_flight` under their
lease until a later reconcile. On 2026-10-23 batch `batch-20261023T165516Z`
stranded 6 needs_human rows this way for one lease window.

## Decision

All three downstream rollbacks pass `needs_human` and `drift` to the rolled-back
finalize, matching the validator-red path. No status-machine change: the Worker
already permits `in_flight -> drift | needs_human`.

## Verification

- New parametrized regression test
  `test_downstream_failure_finalizes_gate_classified_rows[build|parity|deploy]`
  in `tools/tests/test_coverage_apply_rollback.py` fails on the old code and
  passes on the fix.
- Apply and daemon suites plus full `tools/tests` (the three pre-existing
  failures are unchanged).
