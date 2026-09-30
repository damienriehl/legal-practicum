---
title: User-story run across the Legal Practicum's common paths - Plan
type: test
date: 2026-09-30
topic: user-story-run-2026-09-30
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# User-story run across the Legal Practicum's common paths - Plan

## Goal Capsule

**Objective.** Walk the paths real visitors take through the Legal Practicum on PROD and DEV, judge UI and UX quality (not only whether the MVP path completes), list every error found, fix the bounded ones, and record the result in `.cockpit-repo.json`'s `uat` block (`status`, `date`, `open_failures`).

**Means.** Two legs. The automated leg reruns the existing persona harness (`tools/verify_persona_journeys.js`, 70 journeys against `docs/uat/user-stories.md`) against PROD and DEV. The judged leg is a human-style walk in Chrome DevTools MCP at desktop and phone widths, where the orchestrator reads screenshots and the accessibility tree and grades clarity, hierarchy, feedback, error recovery, and consistency. Fixes go to Codex workers; the orchestrator verifies.

**Open blockers.** None for the run. Access-gated editor and Publisher journeys keep their live human leg NOT RUN, and live-provider interview turns need a provider key; both are recorded as such (see KTD3), not treated as failures.

## Product Contract

### Paths walked (most common first)

- P1. **Prospective reader** — pitch home (`/`), proof disclosures, expand/collapse all, public nav, the cost-per-credit worksheet, the jump into the platform. Desktop and 390px phone.
- P2. **Student orientation** — platform home, curriculum module page, skills browser, matter library with filters, one matter's packet (facts, law, rubric), packet download, firm dashboard, weekly hours.
- P3. **Student interview and critique** — open "Interview the client" on a matter, the keyless state and the ADD YOUR KEY flow (entry, validation, error copy, removal), the sample/scripted consultation, memo critique form validation and its error recovery.
- P4. **Instructor** — skill-to-rubric navigation, print view of the matter library, the boundary on private instructor material.
- P5. **Open-source adopter** — README quickstart: clone-equivalent local serve of `site/`, Worker unit tests, BYOK boundary, `wrangler deploy --dry-run`.
- P6. **Author/editor (John, Roger) and Publisher** — `edit.legalpracticum.org` must present the Access door (302 to Access login); the headless editor and Publisher harnesses run in preflight. The live signed-in leg is NOT RUN.

### Requirements

- R1. Every path above is walked on PROD; P1-P3 also on DEV (DEV-only journeys per their bindings).
- R2. A row is PASS only with a recorded artifact (harness exit and run file, or a screenshot read by the orchestrator). A skipped live step is NOT RUN, never PASS.
- R3. Every error and every UX defect found is listed with path, surface, severity (P0-P3), and disposition: fixed-and-reproved, OPEN with reason, or NOT RUN with prerequisite.
- R4. Bounded defects are fixed on the branch, verified locally and through preflight, and shipped to DEV when they touch `site/` or `app/worker/`.
- R5. The run's summary is appended to `docs/uat/persona-uat-record.md`, and `.cockpit-repo.json` `uat` is set: `done` when no open failures remain in walked paths, otherwise `in_progress`, with `open_failures` as short public-safe strings.

### Scope

In: public surfaces, the local adopter path, harness bindings, bounded fixes in `site/` generators (`tools/build_site.py`), `app/chat/`, `app/worker/`, and the pitch.
Out: Packet B/E actions, Packet C Publisher review, live-provider spend beyond an existing UAT credential, new features, design-level redesigns (recorded OPEN with a follow-up plan instead).

## Planning Contract

### Key Technical Decisions

- KTD1. **Reuse the harness; do not rewrite it.** It already maps 70 journeys to the stories and records artifacts. The judged walk covers what assertions cannot: whether the page reads well and guides the user.
- KTD2. **Fixes reach PROD only through the Publisher lane.** Per the hygiene plan's KTD2, this session does not direct-deploy PROD. A fix counts as fixed-and-reproved when proven locally and on DEV; its PROD arrival rides the next Publisher release, noted per row.
- KTD3. **Live-provider and Access legs.** If a UAT provider credential file is already provisioned (search `~/.config/sonsteng*` by listing only), use it by path for the DEV live-stream smoke; otherwise record NOT RUN. Never read or print a key; never pass one to a Codex worker.
- KTD4. **Severity bar.** P0 blocks a common path or leaks data; P1 misleads or strands a user on a common path; P2 is friction or a WCAG AA miss off the main path; P3 is polish. P0/P1 must be fixed before `uat.status` may be `done`.

## Implementation Units

- U1. **Automated leg.** Run `node tools/verify_persona_journeys.js --base https://legalpracticum.org --env-label prod` and the same with the DEV base and `--env-label dev`; render the record with `tools/render_persona_uat_record.py`. Triage every FAIL as harness drift vs product defect.
- U2. **Judged walk.** Chrome DevTools MCP: for each path P1-P4, desktop (1440x900) and phone (390x844); read the screenshot and a11y snapshot at each step; check console errors and failed network requests. Record findings in a scratch findings list.
- U3. **Adopter path.** Follow README quickstart verbatim in a scratch clone of the branch; note every step that fails or confuses.
- U4. **Fix fan-out.** One Codex worker per independent defect cluster with a spec naming the file, the observed behavior, the expected behavior, and the test to add. Orchestrator verifies each diff, reruns the affected journey or page, and commits per unit.
- U5. **Record.** Append the run summary and defect table to `docs/uat/persona-uat-record.md`; write the `uat` block; ship with the hygiene PR or a follow-up PR; deploy DEV if R4 applies and re-walk the fixed paths on DEV.

## Verification Contract

- Harness run files for PROD and DEV exist under `build/uat/runs/` with no unexplained FAIL.
- Every finding in the table has a disposition and evidence.
- `bash tools/preflight.sh` (full, with browser legs) passes on the final branch head.

## Definition of Done

- `.cockpit-repo.json` `uat` reflects the run (`date: 2026-09-30`), committed and merged.
- Findings table in `docs/uat/persona-uat-record.md`; fixes merged; DEV re-walked for fixed paths.
