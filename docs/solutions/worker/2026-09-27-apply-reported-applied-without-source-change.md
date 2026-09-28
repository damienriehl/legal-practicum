---
title: Formatted prose reported applied without a source change
date: 2026-09-27
category: worker
---

# Symptom and reproduction

Suggestion `cb8e1ee2-87ce-4fcb-8bbb-e518bda37b33` was recorded as applied in
`7009a81`, which changed only a generated build stamp. Canonical still held the
pre-edit text. Offline reproduction uses the real regenerated source index for
`data/curriculum/m1.md#bd3a87cb4`, `modules/m1.html`, index 5.

The plan's initial punctuation-deletion hypothesis was wrong: raw Markdown is
653 UTF-8 bytes, rendered text is 651 bytes. Dropping the two italic delimiters
around `think, read, and carry themselves as a lawyer` gives a common prefix of
223 bytes and suffix of 383 bytes, matching every supplied length fact. Deleting
two contiguous bytes at rendered offset 223 instead removes `th` and is already
rejected as `needs_human`. Day Zero is not needed to trigger this defect.

Before the fix, submitting the unchanged rendered text produced:

```text
raw/plain bytes, prefix/suffix: 653 651 223 383
gate: '' patch old==new: True
write outcomes: {'repro': True}
source_changed: False
```

These facts prove the local failure mechanism and strongly identify the incident;
the live payload was not read, and lengths alone do not uniquely prove its bytes.

# Cause and correction

`build_site._extract_page_blocks` stores raw source as `original_text` but hashes
the rendered DOM. `_gate_group` therefore correctly accepts the rendered hash.
`span_splice` restores unchanged inline markup to plain editor text. For an
unchanged rendering, that restoration returns exactly the original raw source.
The Markdown writer previously treated one matched occurrence as success even
when replacing it with identical bytes; orchestration counted that patch as
applied. Existing tests covered real edits around formatting and unsafe span
edits, but did not assert that a formatting-only submission cannot be applied.

The formatting gate now rejects an identical reconstructed span. An independent
source-byte guard applies each change-requesting group alone to pre-apply
snapshots in a `TemporaryDirectory`, mirroring target paths through
`safe_data_path` and using `apply_file_patches`. Schema snapshots preserve scalar
coercion semantics (for example, a number field currently containing an integer
must still accept a fractional value). A group whose isolated writes leave all
target files byte-identical is rejected. The real combined write also retains
its file-level byte check for files whose member patches all reported success.
Existing whole-group rollback and bounded replay
handle the refusal; replay uses the same helper. This checks each group's net
effect, not whether every member of a partially effective group changed.
Genuine prose edits around preserved formatting still apply. Exact fresh-text
no-op semantics outside this formatting defect remain unchanged.

Regression coverage lives in `test_coverage_apply_pipeline.py` (real builder,
real curriculum block, actual writer) and `test_apply_suggestions.py` (a writer
that returns success without writing, whole-group rejection, independent edit
retention). Both refusal tests were run red before their fixes.

PR #84 review exposed a gap in the original file-level guard: an already-adjacent
structural move returns success without changing bytes, but an independent prose
edit in the same file put that path in the shared `changed` set. Both groups then
appeared effective and finalized as applied. The per-group isolated application
closes that attribution gap. A real transaction regression reproduced the false
applied move before the correction and now verifies that only the prose edit
lands. A second regression confirms two real prose edits in the same file both
remain applied. The existing silent-writer and real curriculum regressions remain
required checks.

A further PR #84 review found that the combined-write guard also rejected valid
independent groups when a failed patch atomically abandoned their shared file's
write. The guard now considers a file's unchanged bytes only when every member
patch reported success. If any member failed, successful co-tenants keep their
results so rollback removes the invalid group and replays the valid one. The
per-group isolated check still runs, including on replay. A real transaction
regression pairs a valid prose edit with an invalid split on separate Markdown
blocks: it failed before this correction because both rows became `needs_human`,
and now verifies that only the split is rejected and the prose edit lands with
the rest of the file unchanged.

# Operator remediation

Do not replay the row into canonical: Packet A intended to finish with the
original wording, which canonical already has. After checking the actual stored
payload against this reproduction, correct the false applied classification to
`needs_human` with an auditable reason linking the original batch/commit and this
incident; then close the obsolete request through an authorized rejected or
superseded disposition if supported. Preserve original payload and history.
Do not invent a canonical revision or edit the stored text to make an audit pass.

The existing `reconcile-noop` exact/normalized predicates do not strip Markdown
markers, so this formatting-only case does not qualify for that endpoint. If
there is no supported correction operation for applied rows, the orchestrator
needs a separately reviewed, narrowly scoped ledger correction. No ledger or
live data was modified by this fix.
