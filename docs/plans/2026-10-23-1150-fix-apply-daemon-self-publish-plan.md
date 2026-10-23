---
title: "fix: apply daemon publishes its own commits instead of wedging on them"
type: fix
status: completed
date: 2026-10-23
---

# fix: apply daemon publishes its own commits instead of wedging on them

## Problem

The direct-apply daemon commits each accepted batch to local `main` in its
dedicated checkout (`apply: batch …`, author `apply@sonsteng.local`). Nothing in
the daemon ever pushes that commit; publication to `origin/main` happened only
when an operator merged or pushed from the daemon checkout by hand
(`docs/direct-apply-daemon.md`, "Consequence — main is checked out in the daemon
worktree").

The stale-checkout deploy guard (added in `474eecf`, 2026-10-03) refuses any
transaction while the deploy branch is ahead of its upstream (`diverged`). So the
first apply after any manual push leaves the checkout one commit ahead, and every
later tick refuses, permanently, on the daemon's own commit:

- 2026-10-05 14:50 to 2026-10-06 22:35: first wedge, cleared by a hand merge
  (`8c5c891 merge: reconcile daemon checkout with origin/main`).
- 2026-10-07 09:48: batch `batch-20261007T144833Z` committed `a3aa3eb` locally,
  deployed DEV, and was never pushed. From 09:55 every tick logged
  `deploy REFUSED: guarded deploy checkout refused (diverged)` and exited 1,
  through 2026-10-23, with 38 accepted suggestions queued.

## Decision

Keep the guard's protection against a hand-diverged checkout, and make the
daemon the publisher of its own commits:

1. **Guard self-publish.** When the deploy branch is strictly ahead (behind == 0)
   and every ahead commit is a non-merge commit the daemon itself writes
   (`apply: batch …` authored by `apply@sonsteng.local`, or a
   `revert(history): …` commit from `execute_revert`), the guard pushes the
   branch to its recorded upstream with a plain, non-force push, re-fetches, and
   requires zero ahead and behind before permitting the transaction. A push or
   verification failure refuses with a new `publish_failed` reason (alerted
   like other refusals). Any other ahead commit, or ahead plus behind, still
   refuses as `diverged`. The guard never forces, resets, rebases, or merges a
   diverged history.
2. **Publish at the end of the transaction.** After a successful apply and DEV
   deploy (and after a successful revert publish), the daemon runs the same
   guard once more, so the commit reaches `origin/main` in the same tick. This
   step is non-gating: if it fails, the next tick's guard retries it.

Rejected alternatives: auto-merging upstream into a diverged checkout (can
conflict and would deploy an unreviewed merge); pushing only at the end of the
transaction without the guard path (a rebuild/deploy failure between commit and
push would still wedge the next tick).

## Unwedge

`a3aa3eb` was a pure fast-forward of `origin/main` (`git push --dry-run` showed
`543b20b..a3aa3eb`, no newer upstream work), so it was pushed normally under the
daemon flock with the timer paused; then the fixed code fast-forwarded into the
daemon checkout and the timer resumed.

## Verification

- Unit tests in `tools/tests/test_direct_apply_daemon.py` cover: daemon-only
  ahead commits publish and permit; foreign ahead commits refuse `diverged`
  without pushing; ahead plus behind refuses; push failure refuses
  `publish_failed`; the end-of-transaction publish runs after deploy and is
  non-gating.
- Live: journal shows the 38 queued suggestions applied, rebuilt, deployed, and
  published, exit 0, and the next tick exits 0 with the checkout level with
  `origin/main`.
