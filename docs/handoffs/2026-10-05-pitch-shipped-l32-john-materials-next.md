---
artifact_contract: "ce-handoff/v1"
created_at: "2026-10-06T00:30:00Z"
title: "Pitch, brochure, firms page and practice record shipped to PROD; waiting on John's materials"
summary: "John's accepted triage items are built and live on PROD (PRs #98-#104). Open: Darngood and Roger's materials from John; deferred triage items."
keywords: ["john", "pitch", "brochure", "firms", "practice-record", "l32", "darngood", "prod"]
repository: "legal-practicum"
resume_focus: "When John's Darngood PDF or Roger's materials arrive, ingest them; otherwise re-offer deferred triage items"
---

# Pitch, brochure, firms page and practice record shipped; waiting on John's materials

Supersedes `docs/handoffs/2026-10-04-john-triage-and-pitch-rewrite-next.md` (retired in this
commit; its open items are carried below).

## Where things stand (all merged to `main`, live on DEV and PROD at 82273eb)

| PR | What | Plan |
|---|---|---|
| #98 | L50 "Running the firm with technology" template | `docs/plans/2026-10-04-1405-feat-firm-technology-exercise-plan.md` |
| #99 | Pitch rewritten as persuasion; "centaur" removed site-wide | `docs/plans/2026-10-04-1400-feat-pitch-persuasion-rewrite-plan.md` |
| #100 | Literal markdown links fixed; guard against `](` in built pages | `docs/plans/2026-10-04-1620-fix-literal-markdown-links-plan.md` |
| #101 | Two-page brochure (L38) and firms and bar associations page (L70) | `docs/plans/2026-10-04-2015-feat-brochure-and-firms-page-plan.md` |
| #103 | Local-first practice record and milestones (L32 phase 1) | `docs/plans/2026-10-05-0300-feat-local-practice-record-plan.md` |
| #102, #104 | Production deploy records | `docs/uat/pre-user-prod-deploys.md` (last two blocks) |

PROD was deployed twice on 2026-10-05 under `docs/pre-user-prod-deploy.md`; the rollback pairs
are in those records. The Publisher release daemon stays config-off.

## Damien's decisions this session (Cockpit records; read with `cockpit-answer inspect`)

- `sonsteng-magnum-opus-2026-10-04-2102-pitch-persuasion-review`: keep the pitch spine as
  built (Midstate fourth, not first); zero "AI" in the pitch; generic paid-help wording; keep the
  ABA Standards 302/303 framing (26 skills credited to the surveys, not the ABA or MSBA).
- `sonsteng-magnum-opus-2026-10-05-0346-l32-recognition`: ship the practice record to PROD; **no
  shared rankings** (recognition stays private and student-owned; no student accounts).
- Damien said the brochure and firms page "look good" and asked to push to PROD.
- Housekeeping approved and done: superseded branch `feat/pitch-persuasion-rewrite` deleted,
  stale build-stamp stash dropped, merged local branches removed.

## Open

1. **John's materials (blocked on John; Damien sends).** A draft email asking for the Darngood v.
   Landers & PUDS PDF and Roger's materials is in Damien's Gmail drafts, unsent. When the PDF
   arrives: ingest Darngood as the showcase with Midstate as a second example (triage l12/l34;
   Damien's note: "Ingest Darngood in ADDITION to Midstate"). Roger's materials: l11, TODO T24.
2. **Deferred triage items** remain open on `sonsteng-magnum-opus-2026-10-04-1557-john-requests-triage`
   (l04-l07, l37, l42, l52, l56, l57, l60, l68, l71). Re-offer at a checkpoint; do not build.
3. **Polish (optional):** the brochure leaves white space at the foot of both printed pages.
4. **Cockpit ideation:** `cockpit-ideate completed` was not run for these cycles.

## Read before working here

- `docs/solutions/orchestration/2026-10-05-fresh-worktree-generated-artifacts-and-legacy-generators.md`:
  generation order in a fresh worktree, never run `data/taxonomy/_build_taxonomy.py`, run the full
  (browser) preflight before merging content, and reapply-and-regenerate instead of rebasing
  content branches.
- Earlier gotchas still apply: edit canonical sources (no render-time rewriting); after editing
  `data/`, rebuild site, personas and instructor bundle; Decision Sheet submits can fail silently,
  so check `cockpit-answer inspect`.
- The editor Worker (DEV) bundles the editor map; redeploy it (`app/worker`, `wrangler deploy`)
  after content changes, as the apply engine does.

## Retire when

John's materials are ingested (or Damien drops the ask) and the deferred items have been
re-offered.
