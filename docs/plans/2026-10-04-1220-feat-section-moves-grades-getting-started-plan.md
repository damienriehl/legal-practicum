---
title: Section moves in the editor, long-exercise grade label, getting-started page - Plan
type: feat
date: 2026-10-04
topic: john-triage-next
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Section moves, long-exercise grade label, getting-started page - Plan

## Goal Capsule

**Objective.** Build three items Damien accepted in the 2026-10-04 triage of John Sonsteng's
requests (Cockpit record `sonsteng-magnum-opus-2026-10-04-1557-john-requests-triage`): L51 section
moves in the editor, L20 letter grades for long exercises, and L36/L55/L59 a getting-started page.
The pitch rewrite and brochure are separate work.

**Open blockers.** None.

## Product Contract

### Requirements

- R1 (L51). An editor can move a whole section (a heading plus every block under it, up to the
  next heading of the same or higher level) one place up or down among its sibling sections, from
  "Move section up" / "Move section down" controls on the heading. Like paragraph moves, it is a
  structural suggestion that waits for Damien's approval, then applies through the existing apply
  engine and redeploy. Paragraph moves keep working unchanged. Labels follow the plain-language
  editor (always labelled, Large Type friendly).
- R2 (L20). On long exercises that already carry a letter-grade map (non-memo matter rubrics), the
  rubric states that the letter grade governs the exercise and the point total is a consistency
  check. The memo 7-point instrument keeps "competent" and no letter translation (2026-08-20
  decision).
- R3 (L36, L55, L59). A "Getting started at your school" page on the platform: who administers the
  practicum (a practicum director), a sample structure that fits each school (dean, associate dean,
  faculty, practicum teaching faculty, teaching team), and that the director and teaching team
  supervise the AI feedback and assessment. Linked from the platform home or about area. Plain,
  persuasive, non-academic tone; "AI" used sparingly, rotating with "technology".

### Key Decisions

- Section moves reuse the structural-suggestion pipeline (new structural kind) rather than a new
  channel, so approval, history, revert, and the production ledger keep working.
- A move swaps a section with its adjacent sibling section; sections never move across a parent
  heading boundary.

## Implementation Units

- U1 (Codex worker). R1 across `tools/structural_ops.py` (new op with the existing `_verify` gate),
  `tools/apply_suggestions.py`, the Worker's structural validation and kinds
  (`app/worker/src/editor-endpoints.js`, `editor-store-core.js` structural kinds), any production
  ledger or reconciliation code that enumerates structural kinds, and the editor client controls
  (`app/editor/editor.js`). Tests at every layer, including an end-to-end apply of a section move.
- U2 (Codex worker). R2 in `tools/build_site.py` rubric rendering and its tests.
- U3 (Codex worker). R3 as a generated platform page with copy in `data/copy/`.

## Verification Contract

`bash tools/preflight.sh` (full), `python3 tools/check_build_parity.py`, and a live DEV check that
a heading shows the section-move controls in the editor.
