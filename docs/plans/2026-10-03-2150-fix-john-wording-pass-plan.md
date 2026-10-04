---
title: John's wording corrections since 2026-08-12 - Plan
type: fix
date: 2026-10-03
topic: john-wording-pass
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
---

# John's wording corrections since 2026-08-12 - Plan

## Goal Capsule

**Objective.** Apply John Sonsteng's outstanding wording corrections to every surface a reader
sees, before Damien sends John the note inviting him into the editor. This plan owns the wording
pass only; the pitch rewrite as persuasion, the brochure, the adoption model, and the Darngood v.
Landers & PUDS case file are separate future work, not active scope.

**Product authority.** Damien, in the 2026-10-03 brainstorm, choosing among John's own requests
(emails 2026-08-14 through 2026-08-28 and the 2026-08-28 call). A private ledger of those requests
lives outside the repo; this plan restates each one it acts on.

**Open blockers.** None.

## Product Contract

### Summary

One pass across the public pitch and platform copy: the "Magnum Opus" label is gone, "jury" is off
the pitch and matter labels, headlines say "evolving technology and AI", and the copy uses "trusted
legal advisors", "feedback" over "critique", and "demonstrate" for student performance objectives and "objective" for teaching aims.
The byline gains consistent middle initials. Each new term joins the locked-vocabulary contract.

### Problem Frame

John has sent wording corrections for seven weeks and the live site reflects almost none. The repo
absorbed his input only through the 2026-08-12 call (`docs/decisions/2026-08-12-john-pitch-docket-outcomes.md`).
He is about to use the editor freely; the first thing he would notice is his own words ignored. If
regenerated copy changes the same paragraphs after he starts editing, his edits and the generator
could also collide, so this lands first.

### Requirements

- R1. No reader-visible "Magnum Opus" or "The Opus" anywhere on the public site or platform. The
  label is dropped, not replaced; a nav item that needed it reads "The Practicum".
- R2. "Jury" is removed from the pitch and from matter labels (cards, titles, captions). Exercise
  and case-file content that describes the law keeps the word.
- R3. Headline-level copy (hero, eyebrows, section headings, taglines) says "evolving technology
  and AI" where it now says "AI". Body text that names the tool keeps "AI".
- R4. "Trusted advisors" reads "trusted legal advisors".
- R5. Reader-visible "critique" reads "feedback" (for example "instant feedback", "expert
  feedback"). Web addresses, file names, API names, and code identifiers do not change.
- R6. Curriculum and template prose uses "demonstrate" rather than "learn" or "know" only for
  student performance objectives. Descriptions of learning, historical findings, and completed
  learning retain their original words. Teaching aims use "objective" rather than "outcome".
- R7. Every author byline reads "John O. Sonsteng · Damien A. Riehl · Roger S. Haydock".
- R8. The locked-vocabulary contract fails if any banned form returns to reader-visible copy
  ("Magnum Opus", "trusted advisors" without "legal", "jury" in the pitch or matter labels,
  "critique" in reader-visible copy), with a mutation canary like the existing ones.

### Key Decisions

- Drop the label rather than replace it. (session-settled: user-directed — chosen over "Seminal
  work", "Groundbreaking", and "Innovative and groundbreaking": no grand label fits John's 09-09
  view that the practicum is nothing radical.)
- Jury comes off labels only. (session-settled: user-directed — chosen over converting the m03/m13
  exercises to bench trials and over stripping every instance: exercise content stays intact.)
- AI wording changes at headline level only. (session-settled: user-approved — chosen over
  replacing all 23 pitch mentions now and over deferring entirely; the centaur section waits for
  the pitch rewrite.)
- Bylines carry middle initials. (session-settled: user-approved — chosen over no initials and
  leaving the mixed form; matches John's and Roger's published names.)
- "Trusted legal advisors" supersedes the 2026-08-06 wording pinned by TODO T03 and its contract
  test; John called the old phrase an error on 2026-08-16.
- The license and copyright line keep their legal form; this pass covers reader-facing bylines.

### Scope Boundaries

- Out: body-text AI wording and the centaur (Human + AI) section; the pitch rewrite as persuasion
  (Restructure, Eureka, practice-ready opener, yes/no Q&A); the brochure; incentives and the
  adoption model; the Darngood v. Landers & PUDS case file; "broad spectrum of students" framing;
  repo, directory, and identifier names containing "magnum-opus".

### Success Criteria

- A reader-visible sweep of the built public site and platform finds none of the banned forms.
- The strict build, canonical editor-hash checks, semantic baseline checks, and vocabulary
  mutation canaries pass. Record full-suite exit codes and environment restrictions truthfully.

## Implementation Units

- U1. Copy changes R1-R7 in the canonical sources: the hand-authored
  `site/index.html` and `site/cost-per-credit.html`, `data/copy/*.json`, `data/curriculum/**`,
  `data/matters/**`, taxonomy prose and template content, and reader-visible strings in `tools/build_site.py` and `app/chat/*.html|js`; rebuild the
  platform with `python3 tools/build_site.py`. Update pinned tests that assert the old wording
  (`tools/tests/test_platform_language_contract.py`, `tools/tests/test_identity_rights_contract.py`,
  `tools/tests/test_verify_pitch.py`, and any others the change trips) to the new wording.
- U2. R8: extend the vocabulary contract and add a canary.

## Canonical copy and baseline update path

Edit reader-visible wording in canonical `data/**` and hand-authored HTML; preserve keys,
identity seeds, paths and URLs. Do not rewrite copy during rendering or normalize editor hashes
against transformed text. Restore `cfg.title` directly. The centaur heading, AI badge and human-anchored, AI-amplified quote keep their HEAD wording.
The coverage diagram label after Stage reads `<span>AI</span>` as explicitly requested.
The extension heading reads “Extension skills for evolving technology and AI”.
Taxonomy identity seeds, including the generator’s seed-name lookup, remain unchanged;
reader-visible task names in canonical `tasks.json` use feedback.

After source edits, regenerate taxonomy editability metadata with
`python3 tools/build_taxonomy_contract.py`, then run `python3 tools/build_site.py`. Refresh the
semantic fixture by calling `platform_semantic_contract.capture_site` with the fresh production
site and its generated editor map, validating the snapshot, then serializing
`platform_semantic_contract.freeze_snapshot(snapshot)` into
`tools/tests/fixtures/platform-semantic-baseline.json`. Review the field changes and copy only
the resulting `links` and `editor_blocks` digests to the corresponding pinned assertions in
`test_platform_browser_matrix.py`; preserve the reading-order pin. Restore the original
canonical hash assertion in `test_editable_coverage.py`. Keep the vocabulary mutation canaries.

## Verification Contract

This correction pass runs the requested build check, tools pytest suite, Worker tests, and
wording grep sweeps locally. No credentials or deployment are used.

## Definition of Done

Corrections are regenerated and verified locally. Do not commit, push, or deploy this pass.

## Local correction receipt

- `python3 tools/build_taxonomy_contract.py`: exit 0.
- `python3 tools/build_site.py`: exit 0.
- `python3 tools/build_site.py --check`: exit 0.
- `python3 -m pytest tools/tests -q`: exit 1; 2,965 passed, 2 skipped,
  21,791 subtests passed, one failure and 12 setup errors. All failures/errors
  are in `test_canonical_ref_cas.py`, where local HTTP socket creation is denied
  with `PermissionError: [Errno 1] Operation not permitted`.
- Focused vocabulary, editor coverage, semantic and browser matrix checks:
  exit 0; 63 passed and 15,006 subtests passed.
- `cd app/worker && node --test test/*.test.js`: interrupted with exit 130
  after stream-permission errors and a stall; no complete Worker pass is claimed.
- `grep -rn "reader_feedback_copy" tools app || echo "OK: no render-time rewrite"`:
  exit 0; `OK: no render-time rewrite`.
- `grep -rniE "magnum opus|trusted advisors" site --include=*.html | head`:
  exit 0; no output.
- `grep -rnci "critique" data/copy data/curriculum | grep -v ":0$" | head`:
  exit 0; no output.
- Semantic fixture refreshed through capture, validation and freeze; matched
  the already-corrected fixture. Page identities and reading order remain unchanged.
- Build stamp retained because the canonical-content fingerprint changed.
- Six R6 sentences remain: four student performance sentences and two teaching
  objective sentences. Descriptive and completed learning retain their wording,
  including “The trades of lawyering, learned on real-shaped matters…”.
- Requested centaur heading, CSS badge and pull quote match HEAD; diagram label
  reads `AI`. Extension heading: “Extension skills for evolving technology and AI”.
- Canonical editor hashing and direct `cfg.title` rendering verified.
- `git diff --check`: exit 0. No commit, push, deployment or credential access.
