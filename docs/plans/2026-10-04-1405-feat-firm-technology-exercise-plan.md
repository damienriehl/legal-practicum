---
title: Running the firm with technology (L50 exercise) - Plan
type: feat
date: 2026-10-04
topic: firm-technology-exercise
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Running the firm with technology (L50 exercise) - Plan

## Goal Capsule

**Objective.** Add the exercise Damien accepted as l50 in the 2026-10-04 triage of John
Sonsteng's requests (Cockpit record `sonsteng-magnum-opus-2026-10-04-1557-john-requests-triage`).
On the 2026-08-28 call, John said he wants students to learn "how to use AI to manage their firm
to do their marketing … more than just writing briefs." Today the taxonomy has SK-PM-10 ("Data
and matter hygiene with AI tools") and Module III teaches management and marketing (TSK-071 to
TSK-094) against the Ellingboe & Ravndal firm dashboard, but no exercise has students use
technology to run or market the firm.

**Open blockers.** None.

## Product Contract

### Requirements

- R1. A new course template, "Running the firm with technology", is authored as markdown under
  `data/curriculum/templates/` and rendered by the existing templates pipeline
  (`CURRICULUM_TEMPLATES` in `tools/build_site.py`) onto the platform templates page, in
  teaching order after the business-of-law templates.
- R2. The exercise is worked against the firm dashboard data the platform already publishes
  (realization, collection, AR over 90 days, trust balance, fee revenue against plan, book of
  business). Students use a technology tool of the school's choice to:
  1. draft a one-page monthly management memo to the partners from the dashboard figures, then
     check every number against the dashboard themselves;
  2. draft a client-development and marketing plan for one practice area, including a short
     website or directory blurb, that complies with the advertising and solicitation rules
     (Model Rules 7.1-7.3) with no false or misleading claims;
  3. write a short firm policy on using technology with client information: confidentiality
     (Rule 1.6), competence (Rule 1.1), and supervision of nonlawyer assistance (Rule 5.3),
     citing ABA Formal Opinion 512 (2024) on generative AI tools as a starting point.
- R3. The exercise follows the house conventions: objectives written as "The student will
  demonstrate … by …", the feedback-tone rule (lead with what works, never "good" or "bad",
  formative), feedback assessed on the seven-heading 1-7 instrument, and "AI" used sparingly,
  rotating with "technology" and "tech". Students never paste client-identifying information
  into a tool; the matters are fictional, but the habit is the lesson.
- R4. Module III's curriculum (`data/curriculum/m3.md`) gains one sentence that points to the
  exercise from its management-skills paragraph, and the firm dashboard page links to it. The
  exercise maps to SK-PM-10 and the marketing and budgeting tasks it exercises (TSK-080,
  TSK-082, TSK-083 to TSK-085) wherever the taxonomy or crosswalk records template coverage.

### Scope boundaries

- No new matter, no new dashboard data, no tool integration. The exercise is tool-agnostic.

## Implementation Units

- U1 (Codex worker). Author the template, register it in `CURRICULUM_TEMPLATES`, add the M3
  sentence and the firm-page link, stamp block ids with the repo's stamping tool, regenerate
  taxonomy and editability metadata if needed, rebuild the site, personas and instructor bundle
  in the documented order, and keep the new build stamp. Tests: the template renders on the
  templates page, objectives use "demonstrate", the language contract passes, and the links
  resolve.

## Verification Contract

`bash tools/preflight.sh` (full), `python3 tools/check_build_parity.py`, and a rendered check
of the templates page on DEV after merge.

## Delivery

Branch `feat/l50-firm-ai-exercise` → PR → review → merge → DEV deploy. If the pitch rewrite
merges first, rebase and regenerate the build outputs rather than hand-merging generated files.
