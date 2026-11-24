---
title: Editor Queue, November 13–24 Requests - Plan
type: feat
date: 2026-11-24
topic: editor-queue-nov-requests
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-brainstorm
execution: code
---

# Editor Queue, November 13–24 Requests - Plan

## Goal Capsule

- **Objective:** Every open row in the editor review queue (31 rows as of 2026-11-24) is applied, declined, or answered, and the home page carries Michael's and Abby's requested changes.
- **Product authority:** Damien's answers on 2026-11-24, recorded in Cockpit ask `sonsteng-magnum-opus-2026-11-24-1702-michael-abby-nov-requests` (qids `program-name`, `cover-page`, `skills-subheads`, `elise-editor`). Sources: the editor review queue (`GET /edit/v1/review`) on 2026-11-24; the apply daemon's journal for batch `batch-20261124T163201Z`. This plan follows `docs/plans/2026-11-02-1259-feat-john-nov-suggestions-plan.md`, which shipped in PRs #118 and #119.
- **Open blockers:** None. Elise Carlson's bio waits on her (R9).

## Product Contract

### Summary

Clear the editor queue that built up after the November 2 plan shipped. Repair the two editor defects behind it: a blanked paragraph blocks its whole batch, and line breaks vanish on the page. Then build Michael's cover page, skills sub-headers, and new editor, and settle the program name.

### Problem Frame

On November 24, Abby merged two intro paragraphs by blanking the second. The schema rejects an empty paragraph, so the validator failed the batch and all three of her edits went to `accepted_blocked`. Editors also keep typing line breaks into headings and paragraphs, and the page collapses them, so the breaks never show. Meanwhile, John and Michael edited from stale pages, which left drifted rows, and Michael's "TEST" probes still sit in the queue.

### Requirements

**Editor defects**

- R1. When an editor blanks a paragraph and the edit is accepted, the paragraph disappears from the page, and the rest of the batch still applies.
- R2. Line breaks an editor types inside a heading or paragraph show on the page.

**Queue clearance**

- R3. Abby's three intro edits (`intro.after_skills` p2, p3, p4) and her latest Authors bio apply as written, with typo and spacing fixes only.
- R4. For each block, the latest substantive edit wins. John's November 19 edit to the Module I "first premise" paragraph and his November 22 edit to the hero's first paragraph ("living document" → "living teaching and learning method") apply with a light touch, and the "TEST" prefix comes out.
- R5. These rows close as declined, each with a one-line note:
  - Michael's "TEST" probes.
  - Edits that differ from live text only by dropped bold or italics.
  - The three companion rows that rename the Minnesota matters m12 and m15 to "Meridian." Those are real-tier Minnesota matters, so the rename runs the wrong way.
- R6. Editorial-flag comments that the current text has already resolved close with a note. Flags that still apply get fixed under R2, R3, or R7.
- R7. Each comment from Abby and Michael gets a reply in the editor. Abby's report that she cannot see edited comments in the side rail gets investigated, and the reply either names the fix or explains what she should expect.

**Home page and authorship**

- R8. "Legal Practicum" becomes the one program name in reader-facing copy. "Legal Practice Practicum" and "Legal Practicum System" leave it, and so does "the System" used as a name. (session-settled: user-directed: chosen over "Legal Practicum System" and "Legal Practice Practicum"; matches the domain, the page title, and the templates)
- R9. Elise Carlson joins as Editor. The byline reads "John Sonsteng and Damien Riehl, with Abby Breit and Elise Carlson, Editors," and the Authors section gives her a card with name and title. A bio follows when she sends one. (session-settled: user-directed: chosen over adding her to the Authors list only, and over waiting for John)
- R10. A full-height cover panel sits above the home-page hero, carrying Michael's three lines: "LEGAL PRACTICUMS," "Law Practice and Law Management PRACTICE READY," and "John Sonsteng and Damien Riehl." (session-settled: user-directed: chosen over replacing the hero eyebrow)
- R11. The "Law practice skills" column shows two sub-headers. The first 7 skills, through "Computer legal research," sit under "Learned through the general law school curriculum," and the rest sit under "Learned through the lawyer's own experience." (session-settled: user-directed: Michael's wording, as asked)
- R12. Editors can edit the cover lines and sub-headers in the editor, like the rest of the home-page copy.

### Key Flows

- F1. **Editor merges two paragraphs:** Abby folds p4's sentence into p3 and blanks p4. The edit is accepted, the daemon applies it, and the page shows one paragraph where there were two. **Covers R1, R3.**

### Acceptance Examples

- AE1. After deploy, the queue shows no `pending`, `drift`, `needs_human`, or `accepted_blocked` rows from before this work, and a reply sits under each of Abby's and Michael's comments. **Covers R3–R7.**
- AE2. A test batch that blanks one paragraph and edits another applies both edits, and the validator passes. **Covers R1.**
- AE3. A search of reader-facing pages finds no "Legal Practice Practicum" and no "Legal Practicum System." **Covers R8.**
- AE4. On a phone, the cover panel and the skills sub-headers stay readable and pass the existing accessibility audit. **Covers R10, R11.**

### Scope Boundaries

- **Elise's editor access:** Not part of this work. Damien grants editor sign-in separately if she needs one.
- **Colors and fonts:** Still deferred, as in the November 2 plan.
- **Public repository flip:** Still gated by R12 of the November 2 plan; this work does not change that gate.
- **Drawdown branches** (`drawdown/so-1` through `so-6`): Chief's lane, untouched here.
- **Cover-page byline:** The cover carries Michael's two-name line as written; the editors appear in the byline under R9.

### Outstanding Questions

- **Resolve before planning:** None.
- **Deferred to planning:**
  - **Blank-paragraph handling:** Should the schema accept an empty paragraph that the renderer skips, or should the apply engine delete the key? Either satisfies R1.
  - **Side-rail visibility:** Why Abby cannot see edited comments in the side rail (R7) needs a reproduction on her editor scope before anyone names a fix.
