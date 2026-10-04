---
title: Small accepted items from the John-requests triage - Plan
type: feat
date: 2026-10-04
topic: john-triage-small-builds
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Small accepted items from the John-requests triage - Plan

## Goal Capsule

**Objective.** Build the small, self-contained items Damien accepted in the 2026-10-04 triage of
John Sonsteng's requests (Cockpit record `sonsteng-magnum-opus-2026-10-04-1557-john-requests-triage`).
The pitch rewrite as persuasion, the brochure, the national audience page, gamification, letter
grades for long exercises, the getting-started page, and section moves in the editor are separate
work, not active scope here.

**Product authority.** Damien's triage answers (row IDs below match the triage record).

**Open blockers.** None.

## Product Contract

### Requirements

- R1 (L18). Feedback tone: AI feedback and assessment prompts, and the content style guide, state
  the rule: lead with what works and how to keep doing it, give specific next steps, stay formative,
  and never call work "good" or "bad".
- R2 (L22). The pitch's survey proof section says the surveys were conducted by mail at first and
  the most recent online.
- R3 (L28). A short student orientation template ("What to expect"): the practicum rewards steady,
  week-by-week work rather than cramming, and explains why work cannot be postponed.
- R4 (L61). A client questionnaire template students prepare for each client, alongside the
  client interview plan.
- R5 (L62). An end-of-course reflection questionnaire template: how the course went and whether
  the student's objectives for practicing law changed.
- R6 (L46, revised). Fewer "AI" mentions, without the cumbersome "evolving technology and AI" in
  every spot: use "AI", "tech", "technology", and "evolving technology" interchangeably. In this
  unit, apply it to the one heading that now reads "Extension skills for evolving technology and AI";
  the pitch body follows in the pitch rewrite.

### Key Decisions

- "Evolving technology" is not mandatory wording; terms rotate and "AI" appears less.
  (session-settled: user-directed — chosen over "evolving technology and AI" everywhere: it is
  cumbersome, and academia is pushing back on AI.)
- The free resource collection is called the "library" or "catalog", never "headquarters".
  (session-settled: user-directed — "headquarters" implies people, not resources.) The site already
  says "Matter Library", so no change is needed.

### Scope Boundaries

- Out: the pitch rewrite and everything it absorbs (L44, L64, L48, L45, L43, L35, L49, L08, L47,
  L53, L39, L40, L15, L16, L31, L72 messaging, L11), the brochure (L38), firms and bar associations
  (L70), gamification (L32), letter grades for long exercises (L20), the getting-started page
  (L36, L55, L59), section moves in the editor (L51), and the firm-management exercise (L50).

## Implementation Units

- U1 (Codex worker). R1-R6 in the content sources (`docs/content-style-guide.md`, the worker's AI
  feedback prompt sources, `site/index.html` proof section, `data/curriculum/templates/`, and the
  `ext-h` heading in `tools/build_site.py`); rebuild all bundles; keep contracts green.

## Verification Contract

`bash tools/preflight.sh` (full) and `python3 tools/check_build_parity.py`.
