---
title: Apply daemon wedged on its own unpushed commit
date: 2026-10-23
category: worker
tags: [apply-daemon, deploy-guard, git]
---

# Symptom

From 2026-10-07 09:55 to 2026-10-23 every `sonsteng-apply` tick logged
`deploy REFUSED: guarded deploy checkout refused (diverged)` and exited 1
(about 700 failures a day) while 38 accepted suggestions queued. The same wedge
ran 2026-10-05 14:50 to 10-06 22:35 and was cleared by a hand merge.

# Cause

The apply engine commits each batch to local `main` in the daemon checkout.
Nothing pushed it: publication was a manual step. The stale-checkout guard
(`474eecf`) refuses any ahead commit as `diverged`, so the first apply after a
manual push made the checkout ahead by the daemon's *own* commit, and every
later tick refused. The guard could not tell hand divergence from its own
output.

# Fix (PR #107)

- The guard self-publishes: a clean checkout strictly ahead only by
  daemon-written non-merge commits (`apply: batch …` by `apply@sonsteng.local`,
  or `revert(history): …`) is pushed with a plain non-force push, re-fetched,
  and re-counted. Push failure refuses `publish_failed`. Foreign commits or
  ahead-plus-behind still refuse `diverged`.
- Each completed apply/revert also runs the guard again so the commit reaches
  origin in the same tick (non-gating; the next tick retries).

# Lesson

A safety guard that refuses "local commits" must account for the commits the
same process creates. If a daemon writes to a branch it also guards, it owns
publishing that branch; otherwise its own success becomes its failure state.
Test the guard against the daemon's real output, not only hand-made commits.
