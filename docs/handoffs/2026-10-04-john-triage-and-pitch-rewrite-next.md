---
artifact_contract: "ce-handoff/v1"
created_at: "2026-10-04T18:30:00Z"
title: "John's requests triaged; small items shipped; next is the pitch-rewrite brainstorm"
summary: "John-readiness, wording, and triage builds are merged and live on DEV (PRs #91-#96). Damien triaged John's 53 open requests; the accepted pitch items await a ce-brainstorm."
keywords: ["john", "triage", "pitch-rewrite", "editor", "section-moves"]
repository: "legal-practicum"
session: "12d3a347-dc23-553a-ab47-1728d29346b1"
written_at: "2026-10-04T18:23:54.042Z"
head: "f4e18e7a037323f2fea521230abf7c901d65a578"
worktree: "/home/damienriehl/worktrees/sonsteng-magnum-opus-ho"
branch: "docs/handoff-20261004-john-triage"
---

# John's requests triaged; next is the pitch-rewrite brainstorm

## Where things stand (all merged to `main`, live on DEV)

- **#91** review P2 follow-ups R1-R5.
- **#92** John-readiness: Durable Object SQL limit (matter pages 500), signed-out recovery panel,
  self-updating direct-apply daemon, plain non-admin editor bar, client-error alerts in the digest.
  Plan: `docs/plans/2026-10-03-2215-fix-john-readiness-plan.md`.
- **#93** John's wording corrections (no "Magnum Opus", no "jury" in labels, "trusted legal
  advisors", "feedback", bylines with initials). Plan: `docs/plans/2026-10-03-2150-fix-john-wording-pass-plan.md`.
- **#94** small triage items (feedback-tone rule, survey method, three templates).
  Plan: `docs/plans/2026-10-04-1140-feat-john-triage-small-builds-plan.md`.
- **#95/#96** section moves in the editor (headings show only "Move section up/down"),
  long-exercise letter-grade label, "Getting started at your school" page.
  Plan: `docs/plans/2026-10-04-1220-feat-section-moves-grades-getting-started-plan.md`.
- PROD is unchanged; it advances only through a Publisher-authorized release.

## Decision records (Cockpit)

- Triage of John's 53 open requests: `sonsteng-magnum-opus-2026-10-04-1557-john-requests-triage`
  (53 answered; read with `cockpit-answer inspect <record> --qid lNN`). Notes on l46, l58, l12, l51.
- Wording scope: `sonsteng-magnum-opus-2026-10-04-0222-john-wording-scope`.
- John-readiness: `sonsteng-magnum-opus-2026-10-03-2133-john-readiness`; Help contact:
  `...-john-help-contact` (comment prompt, no phone number).
- John's verbatim requests live in Damien's private Google Sheet "John Sonsteng — requests ledger
  (since 2026-08-12)" (row IDs L01-L72 match the triage qids).

## Next session: do this first

1. **Pitch rewrite as persuasion (ce-brainstorm with Damien).** Accepted scope: l44, l64, l48, l45
   (school-neutral opener), l43, l35, l49, l46 (rotate AI/tech/technology/evolving technology; fewer
   "AI"), l08 (humans first, AI a tool; rework the centaur section), l47, l53, l39, l40, l15, l16,
   l31, l72 (free materials + paid implementation services), l11. Rejected: l41. Brochure (l38) and
   the firms/bar-associations page (l70) follow the rewrite.
2. **Then build without asking:** l50 firm-management/marketing exercise; l32 gamification needs
   its own brainstorm (privacy).
3. **Ask John (Damien sends):** the Darngood v. Landers & PUDS PDF (l34); Darngood becomes the
   showcase with Midstate as a second exemplar (l12, Damien's note).
4. Deferred items stay open on the triage record; re-offer at checkpoints.

## Gotchas learned

- Codex workers' edits land but `codex-run.sh` reports exit 2 (companion loses job IDs); verify the
  working tree yourself.
- Never let a worker add render-time text rewriting; edit canonical sources (editor compares edits
  against canonical text).
- After editing `data/`, rebuild site + personas + instructor bundle and keep the new build stamp,
  or bundle parity fails.
- Decision Sheet submits can fail silently (only a "copy" event reached the server); check
  `cockpit-answer inspect` before assuming answers arrived.

## Retire when

The pitch-rewrite brainstorm has a plan in `docs/plans/` and the Ask-John items are resolved.
