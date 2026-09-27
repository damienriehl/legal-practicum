---
title: "Day Zero rehearsals must include live preconditions and post-mutation steps"
lane: orchestration
tags: [day-zero, rehearsal, release, preflight, verifier]
status: resolved
related: ["docs/day-zero-migration-operations.md", "tools/canonical_ref_cas.py", "tools/preflight.sh"]
---

# Failure

The Day Zero window needed multiple attempts because preconditions were first
exercised live: stale ledger batches from an unrecorded release lane;
host-state-dependent tests in preflight; a verifier checkout moved by the
compare-and-swap (CAS); an unauthenticated push under a hardened Git environment;
and the harness permission policy.

# Prevention

Rehearse against the real remote and authentication under the exact hardened
environment and harness policy. Check ledger state across every release lane.
Simulate the entire sequence, including checks and recovery after mutation;
a successful pre-mutation check says nothing about the state left for the next step.
Keep reviewed verifier sources pinned outside mutation targets so advancing a
release cannot replace the code needed to verify or restore it.
Use the [Day Zero operations runbook](../../day-zero-migration-operations.md)
for the operational gates and receipt requirements.
