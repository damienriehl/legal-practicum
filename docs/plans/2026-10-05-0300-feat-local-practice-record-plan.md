---
title: Local-first practice record and recognition (L32 phase 1) - Plan
type: feat
date: 2026-10-05
topic: local-practice-record
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
---

# Local-first practice record and recognition (L32 phase 1) - Plan

## Goal Capsule

**Objective.** Answer the accepted triage item l32 (Cockpit record
`sonsteng-magnum-opus-2026-10-04-1557-john-requests-triage`) without creating student data on a
server. On 2026-08-18 John wrote that schools adopt only when they see a reward, and Damien
floated "high scores … in their school? country? world?" Phase 1 gives students visible
recognition for practice and revision, kept in their own browser. Shared leaderboards (phase 2)
need accounts and a privacy decision and are put to Damien after this build.

**Product authority.** Damien accepted l32; the handoff noted it "needs its own brainstorm
(privacy)". Under the Decision Bar this phase is built on the privacy-preserving recommendation
and the phase-2 question is asked afterwards.

**Open blockers.** None.

## Brainstorm (requirements)

### Constraints found

- Students have no accounts or persistent identity. `/v1/session` issues an anonymous one-day
  token kept in `sessionStorage`; transcripts are never stored server-side
  (`site/platform/data/api-contracts.md` around lines 417-421).
- `docs/plans/2026-08-06-001-feat-august-decision-wave-plan.md` puts "account system, school
  tenancy, durable learner-record API, roster, gradebook, LMS integration" out of scope.
- The interview debrief (`/v1/debrief`, rendered in `site/platform/chat/chat.js`) and the
  critique (`/v1/critique`, `site/platform/chat/critique.js`) return scorecards that are only
  shown in the browser.
- Precedent: the weekly hours log (`site/platform/hours/`) is local-first and student-owned,
  with a storage-choice disclosure (persistent, this tab only, or memory), a pseudonymous
  learner ID, and JSON/CSV export; its page states the data never leaves the device.

### Decisions (recommended, built provisionally)

- No server, no account, no ranking against other students in phase 1. Recognition celebrates
  practice and revision, which is what the method teaches, and follows the feedback-tone rule
  (lead with what works; never "good" or "bad").
- Saving is an explicit student action, never automatic.

### Requirements

- R1. A "My practice record" page at `site/platform/record/` (generated like the hours page, in
  the platform's visual system) that reuses the hours log's storage-choice disclosure pattern and
  privacy statement: entries stay on this device unless the student exports them.
- R2. After an interview debrief scorecard or a critique scorecard renders, the student sees an
  "Add to my practice record" control. It stores only: date, matter id and title, activity type
  (interview or written critique), and the summary scores already shown. Never transcript text,
  draft text or the session token.
- R3. Milestones computed locally from the record, shown as recognition the student can print:
  first interview, first written critique, first revision (a later entry for the same matter and
  activity), improvement on a revision, practice across several matters, and practice across
  several skill areas. Plain wording that recognizes effort and progress; no ranks or
  comparisons with others.
- R4. Export the record as JSON and CSV, a printable summary for the Learning Portfolio, and
  import JSON to restore on another device. Clear-all with a confirmation that is not a browser
  `confirm()` dialog.
- R5. Linked from the platform home and from the Learning Portfolio template, and from the two
  feedback surfaces once something is saved.
- R6. Same rules as the rest of the platform: "AI" used sparingly, plain language, Large Type,
  WCAG AA, keyboard accessible, phone width, no external requests.

## Implementation Units

- U1 (Codex worker). R1-R6: generator support for the new page (copy in `data/copy/` if the
  pattern calls for it), client code with milestone logic in a small testable module, the save
  control in `chat.js` and `critique.js`, tests (Node unit tests for record and milestone logic;
  build tests for the page and links; extend browser checks where preflight already covers the
  chat/critique and hours clients), rebuild site, personas and instructor bundle.

## Verification Contract

`bash tools/preflight.sh` (full), then a DEV check: run a sample critique, save it, see the
record and a milestone, export and re-import, at desktop and phone width.

## Phase 2 (not built)

Shared leaderboards or school-wide recognition need student identity and server storage. Put to
Damien as a decision after phase 1 ships.
