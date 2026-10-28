---
title: "Real-tier caption jurisdiction checks - Plan"
type: test
date: 2026-10-27
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Real-tier caption jurisdiction checks - Plan

## Goal Capsule

- **Objective:** Maintainers catch a real-tier matter caption that conflicts with its declared jurisdiction before accepting a content change.
- **Means:** Deterministic source-data checks in the existing Python test suite (KTD1–KTD3).
- **Authority:** The supplied `so-2` mandate and standing drawdown rules govern this expansion. The chief repository's `docs/plans/2026-10-26-0705-feat-codex-drawdown-campaign-plan.md` remains the campaign authority; its Goal Capsule and campaign R11, R15, R16, R17, R19 and R20 were unavailable in this clone. The source limitation and required controller reconciliation are recorded below. Local R-IDs in this document are separate from campaign R-IDs.
- **Execution profile:** This stage produces and locally commits only this plan on `drawdown/so-2`. The later build stage implements, simplifies, reviews and verifies it. Local work follows the campaign's Astra direction; cloud build work uses the cloud default, with Astra and Fable review at the campaign gate.
- **Delivery owner:** The controller scans, pushes and opens the PR; the campaign merge gate merges it. This clone must not acquire a remote or credentials.
- **Stop conditions:** Do not claim build completion until the `so-1` caption corrections are present and the required checks pass. Do not bypass a failing contract with exclusions, skips or weakened assertions.

## Product Contract

### Summary

Add an offline regression contract for the real-tier captions that feed the generated matter pages and catalog.
It checks the source records against the frozen manifest and checks jurisdiction-bearing caption forms against the local jurisdiction canons.

### Problem Frame

At baseline `02988e4`, the manifest declares ten real-tier matters across six jurisdictions.
The `matter.json` captions for `m12` and `m15` contain Meridian jurisdiction wording despite their Minnesota declarations; their manifest captions contain the intended Minnesota wording.
`tools/validate_spine.py` checks manifest agreement for jurisdiction and tier but omits caption from `_check_a5_manifest`.
`tools/build_site.py` loads the individual matter records and uses their captions for the pages and catalog, so manifest correctness alone does not protect readers.
These are static observations, not passing or failing test results; no tests or builds ran during planning.

### Requirements

**Caption regression coverage**

- R1. The existing Python suite must deterministically detect real-tier matter captions that disagree with their declared jurisdiction and canonical manifest caption.
- R2. The checks must cover every real-tier matter without requiring network access, an LLM, credentials or generated site files.
- R3. Failures must identify the matter, repo-relative source path and field sufficiently for a maintainer to correct the source.

**Preservation and delivery**

- R4. Add positive and negative tests proving the guard works; retain every existing test and preserve existing behavior.
- R5. Keep this branch to `so-2`, following campaign R11, R15–R17, R19 and R20 as supplied in the mandate.

### Scope Boundaries

This item changes test tooling only. It requires no schema migration, data rewrite, package release or outside service.
The apply daemon, its timer and deployment paths remain outside the item.
No frontend changes are planned, so this scope does not require a Playwright screenshot.
If a frontend change becomes necessary, stop the scope expansion and apply the mandate's screenshot requirement before acceptance.

A general legal-correctness engine and a scan of every state name in free-form prose are not included: party names and teaching material can legitimately mention other places.
An extension beyond structured captions needs a separately established content contract.
A new publication hook or CI workflow is also unnecessary here because the existing Python test discovery includes the new test file.

#### Deferred to Follow-Up Work

- `so-1` owns the editorial caption corrections, the historical-name correction and the leaked editor-note removal.
- `so-3` owns unresolved editorial-placeholder rejection during publication.
- `so-4` owns fresh live verification of the editor-overlay accessibility work.
- `so-5` owns CI installation for the existing suites and accessibility audits.

## Planning Contract

### Verified Starting State and Dependencies

The working tree was clean on `drawdown/so-2` at `02988e4`.
There is no repository `AGENTS.md` or `CLAUDE.md` in this checkout or its available Git history; the user-supplied instructions apply.
The available `docs/plans/2026-10-24-0640-fix-editor-overlay-a11y-plan.md` was read for boundaries, without reopening that item's work.

Two prerequisites remain for build acceptance:

1. **Controller source reconciliation:** The chief campaign plan and `docs/handoffs/2026-10-23-editorial-review-batch-20261023T172555Z.md` are absent from the provided checkout and available history. Before implementation, the controller or build stage must read the campaign Goal Capsule and the cited campaign R-IDs, plus the editorial handoff, and reconcile any additional constraints. This plan does not claim those documents were reviewed.
2. **Earlier-item dependency:** `so-1`'s corrections are not present at the inspected baseline. Fixtures and guard code can be built independently, but the current-corpus acceptance check must not pass until the corrected sources arrive through the controller's normal branch/base handling. Do not copy `so-1` edits into this branch or preserve known bad captions as accepted exceptions.

### Key Technical Decisions

- KTD1. **Keep the guard in one new test module.** `tools/tests/test_real_tier_captions.py` will contain small test-local checking helpers and `unittest.TestCase` coverage, discoverable by both unittest and the existing pytest suite. `tools/preflight.sh` already discovers `tools/tests/`; no runner, CLI, runtime-validator or publication changes are needed for R1–R2.
- KTD2. **Use the manifest and canons as independent comparisons.** Select manifest entries with `tier: real`, load their individual `matter.json` files, and reconcile that set with the real-tier matter records on disk. Check their identity, tier and jurisdiction agreement before comparing captions. Resolve each jurisdiction through `data/jurisdictions/real/` and require a matching canon code. Compare caption text after Unicode whitespace collapse only, including nonbreaking spaces; preserve substantive spelling, case and punctuation. This uses the frozen-caption contract in `docs/content-style-guide.md` rather than duplicating all ten captions in test constants.
- KTD3. **Check explicit jurisdiction slots separately from caption equality.** For `criminal_dwi`, require the state's canonical `name` in the prosecuting-state prefix. For `attorney_discipline`, require the canonical `adjective` in the attorney-jurisdiction suffix. Apply these rules to both manifest and matter captions so changing both to the same wrong state cannot evade the guard. Use the declared shape, corroborated against the manifest. Other shapes keep KTD2's canonical-caption check and do not need to invent a jurisdiction phrase.
- KTD4. **Prove detection with mutations of valid inputs.** The repository has already documented false-green checks in `docs/solutions/editor/2026-07-28-checks-that-cannot-fail.md`. The same checking helpers must process the current corpus and the negative fixtures, so a test of an unused duplicate checker cannot satisfy R4.

### Assumptions

For this item, “matter caption” means the structured `caption` values in `data/matters/manifest.json` and `data/matters/*/matter.json`, which supply the generated UI.
The frozen manifest remains the editorial authority for party wording; this guard cannot adjudicate a coordinated substantive rewrite of a jurisdiction-neutral caption in both sources.
KTD3 independently protects the two observed jurisdiction-bearing forms.
This is a repository-consistency check, not a verification of current substantive law; the local canons and source contracts are sufficient research inputs.

### Patterns and Sources

- `tools/tests/test_no_committed_pii.py`: unittest corpus checks paired with canaries that prove a guard can detect violations; reuse the test structure, not its unrelated data-scanning scope.
- `tools/tests/test_midstate_contract.py`: valid canonical content plus deliberately corrupted caption fixtures.
- `tools/validate_spine.py`, `_check_a5_manifest`: existing manifest/tier agreement and the caption omission.
- `tools/build_site.py`, `load_corpus`, `build_matter_library` and the matter-page builders: source captions flow into published output.
- `docs/content-style-guide.md`: frozen manifest fields and jurisdiction canons.

## Implementation Units

### U1. Check the real-tier source corpus

**Goal:** A normal Python test run reports caption inconsistencies before a change is accepted.

**Requirements:** R1–R3, R5. **Dependencies:** Controller source reconciliation; `so-1` is required for current-corpus acceptance.

**Files:** Create `tools/tests/test_real_tier_captions.py`. Read the manifest, individual matter records and jurisdiction canons without changing them.

**Approach:** Implement KTD1–KTD3 with a small fixture-friendly checker and a current-corpus unittest. Keep file loading separate enough that fixtures can exercise the same checks. Sort traversal and diagnostics for repeatable output. Assert nonempty coverage and report missing records or canons as failures, never skips.

**Patterns to follow:** The unittest corpus-and-canary structure cited above.

**Test scenarios:**

1. After `so-1`, every real-tier manifest row and every on-disk real-tier record participates and passes; the ten current real-tier matters are the observed baseline, not a permanently hardcoded count.
2. A missing matter file, empty real-tier selection, unlisted real-tier record or unknown jurisdiction fails with the relevant source identified.
3. A matter whose tier, jurisdiction or shape changes away from its manifest declaration fails instead of disappearing from coverage.
4. Ordinary spaces and nonbreaking spaces compare equivalently; a changed party name or jurisdiction word does not.
5. Valid jurisdiction-neutral captions and the existing juvenile caption containing its canonical legal reference pass without a new state-name requirement.
6. Fictional-tier Meridian captions remain outside this real-tier contract.

**Verification:** The new test is collected by both unittest and pytest. On the corrected corpus it passes without building the site or reaching a service. Diagnostics satisfy R3.

### U2. Prove the guard catches editorial regressions

**Goal:** A permissive or disconnected checker cannot produce a false green result.

**Requirements:** R1–R5. **Dependencies:** U1; synthetic fixture checks do not depend on `so-1` landing.

**Files:** Extend `tools/tests/test_real_tier_captions.py` with synthetic in-memory or temporary-directory fixtures.

**Approach:** Apply KTD4 to valid fixtures using generic party names. Derive expected state wording from the local canons. Do not edit repository data during tests.

**Execution note:** Establish valid fixture baselines, then show each isolated mutation raises the intended failure through the same helper used by U1.

**Test scenarios:**

1. Reintroduce Meridian into a Minnesota DWI prefix, including the observed nonbreaking-space variation; the check rejects it.
2. Reintroduce the Meridian attorney designation into a Minnesota discipline caption; the check rejects it.
3. Change both manifest and matter captions to the same wrong real state for each jurisdiction-bearing shape; independent canon checks still reject them.
4. Corrupt only the manifest caption, then only the matter caption; each fails with the responsible source or disagreement identified.
5. Keep valid state words inside a synthetic party name in a jurisdiction-neutral caption; canonical agreement passes without a broad place-name ban.
6. Re-run identical valid and invalid fixtures to confirm stable results and diagnostic ordering.

**Verification:** Every negative fixture fails for its intended inconsistency, every positive control passes, and the existing suites retain their assertions.

## Verification Contract

These are build-stage checks; none ran during planning.

| Check | Build-stage evidence |
|---|---|
| Focused standard-library run | `python3 -m unittest discover -s tools/tests -p 'test_real_tier_captions.py' -v` collects and passes the new corpus checks and canaries after `so-1`. |
| Python regression suite | `python3 -m pytest tools/tests/ -q` includes the new module and keeps existing tests passing. |
| Tooling Node regression suite | `node --test tools/tests/*.test.js` keeps the existing tooling behavior passing. |
| Worker regression suite | Use the local generation prerequisites in `README.md`, then run `node --test test/*.test.js` from `app/worker/`; no live probes or credentials. |
| Scope and evidence | Only the new test module and necessary plan/evidence records change. No source-data, generated frontend, daemon, timer, schema, CI or deploy edits belong to this item. Record exact commands, exit results and environment limitations in the build receipt. |

Re-verify the starting state in the build stage before changing files.
A sandbox or baseline failure remains an explicit limitation until resolved; do not describe it as a pass or disable a test to accommodate it.
Avoid the broad deployment/preflight wrapper in this restricted clone; the relevant offline suites above provide the requested evidence without acquiring credentials.

## Definition of Done

- U1 and U2 satisfy R1–R5 with both valid-corpus and mutation evidence.
- The controller has reconciled the missing authority inputs and the accepted source baseline includes the `so-1` caption corrections.
- Existing tests remain intact and passing, with no unreported acceptance failures.
- The final diff contains no abandoned attempts, temporary fixtures, private matter text or machine-local paths.
- Local commits remain on `drawdown/so-2` for controller publication and campaign review. This plan-only stage ends after its document commit; implementation belongs to the separately requested build stage.
