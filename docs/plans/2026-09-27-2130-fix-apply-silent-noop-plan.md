---
title: Apply engine reports "applied" for an edit that never reached its source - Plan
type: fix
date: 2026-09-27
topic: apply-silent-noop
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
---

# Apply engine reports "applied" for an edit that never reached its source - Plan

## Problem (evidence)

On 2026-09-27 the direct-apply daemon logged `flushing 1 accepted suggestion(s) as
batch-20260927T202056Z` then `applied 1, rebuilt, deployed main`. Its commit `7009a81`
changed only `site/platform/data/.build-stamp.json`: no source file and no regenerated page.

Text-free facts about the suggestion (`cb8e1ee2-87ce-4fcb-8bbb-e518bda37b33`), read from the
production ledger's `reconcile-noop` dry run:

- kind `prose`, no op, no group; source_ref `data/curriculum/m1.md#bd3a87cb4`
  (editor map occurrence: `modules/m1.html`, index 5)
- stored original 653 UTF-8 bytes, new 651 bytes; common prefix 223 bytes, common suffix 383
  bytes, so the edit deletes 2 bytes near byte 223 (a punctuation edit, for example ", ")
- batch phase `done`, commit `7009a81`

`data/curriculum/m1.md` last changed 2026-08-07 (`a869c61`). Every earlier apply commit (11 of
them) changed its source file. The same day, before this apply, the Day Zero migration
(`daea1e1`, 11:03) materialized dates and `legalpracticum.org` identifiers across the corpus.
That is a prime suspect (for example, the rendered/stored text vs the source template diverging
so the patch locates nothing, or replaces a span with identical bytes), but it is unproven.

Consequences: the ledger marks a real edit applied although canonical never changed. The
production review audit then counts it unreconciled (release rollout stop). Worse, any editor's
edit (John's, Roger's) could silently vanish while the UI reports success.

## Scope

In: `tools/apply_suggestions.py` and the build/map/source-locator code it depends on
(`tools/build_site.py`, the pipeline and text-norm helpers), their tests in `tools/tests/`,
and docs (`docs/direct-apply-daemon.md`, a `docs/solutions/` learning).
Out: Worker ledger changes, live data changes, deployments.

## Units

- **U1 Reproduce.** Build a deterministic offline reproduction against the current tree:
  locate block `bd3a87cb4` in `data/curriculum/m1.md` through the same source index the engine
  builds (`pipeline.regenerate_map`), take its rendered text (expected 653 bytes; if not, record
  the actual length and why), delete the 2 bytes at offset 223, and drive the real gate and patch
  path (`_group_outcomes` / `_gate_group` / patch writing) in a scratch copy. Record whether the
  source file changes and where the engine loses the edit. Write a failing test for it.
- **U2 Fail closed.** Whatever the root cause, the engine must never report `applied` for a
  group whose patches leave every source file byte-identical while the suggestion's new text
  differs from the source text. Such a group becomes `needs_human` (or `drift`, matching existing
  semantics, with a bounded reason) and is not counted as applied. Test it.
- **U3 Root-cause fix.** Fix the actual defect so this kind of edit (a prose edit to a block on a
  Day-Zero-materialized page, or whatever U1 proves) applies to its source correctly. Test with
  the real block.
- **U4 Docs.** `docs/direct-apply-daemon.md` note and
  `docs/solutions/worker/2026-09-27-apply-reported-applied-without-source-change.md`.

## Verification

`python3 -m pytest tools/tests -q` green except the 3 known host-coreutils failures in
`test_prove_queues_empty.py` (they fail identically on main); `cd app/worker && node --test
test/*.test.js` still green; `tools/preflight.sh` subsets that run offline.

## Remediation of the live row (orchestrator, after the fix)

Decided after U1 shows what happened. The canonical text is currently the pre-edit text, and
Damien's Packet A round-trip intended to end on the original wording, so no content change is
owed; the ledger record must be corrected without inventing a canonical change.
