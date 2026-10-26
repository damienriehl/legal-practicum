---
title: "So-1 editorial review corrections - Plan"
type: fix
date: 2026-10-26
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
item_id: so-1
item_kind: planned
---

# So-1 editorial review corrections - Plan

## Goal Capsule

**Objective:** Learners see accurate matter captions and historical attribution, with the flagged editor note resolved in the negotiation template.

**Means:** Correct the existing canonical content and regenerate its published forms, with focused regression coverage (KTD1–KTD3).

**Authority:** The controller's `so-1` mandate and standing drawdown rules govern this item. The chief repository's `docs/plans/2026-10-26-0705-feat-codex-drawdown-campaign-plan.md` remains the campaign authority. Its Goal Capsule and cited R11, R15, R16, R17, R19, and R20 were unavailable in this checkout; the mappings below come from the supplied mandate, not a verified reading of that plan. Repository conventions apply within that scope.

**Delivery:** This stage commits only this plan on `drawdown/so-1`. A later build stage runs `lfg` on the reconciled plan and commits locally. The controller handles scanning, push, and PR creation; the campaign gate handles merge and required reviews. No remote, login, or deployment is added to this clone (campaign R15/R19).

**Stop condition:** The missing authority inputs in D1 must be reconciled before implementation handoff. No product decision or credential from Damien is currently identified.

## Product Contract

### Summary

Repair the editorial defects attributed to the 2026-10-23 batch, keeping the correction limited to the review's named files. Preserve the rest of the accepted editorial changes and the site's current presentation.

### Problem Frame

At baseline `02988e4aa21eb71002aec08cfb50eac03d589aa1`, the two affected Minnesota matters still have Meridian captions, the Module II introduction gives Langdell the wrong first name, and the SSNP template exposes an unresolved editor question. These defects appear in the canonical source changes of batch commit `5d91318038f9873a88d1c4849ba0e9e64e067089`.

### Requirements

**Editorial corrections**

- R1. Restore the two flagged real-tier captions to their frozen manifest values while retaining each matter's identity, `tier`, and `jurisdiction`.
- R2. Identify the historical educator as Christopher Columbus Langdell in the Module II introduction.
- R3. Resolve the flagged SSNP editor question in learner-facing prose, retaining the teaching explanation of ZOPA.

**Preservation and proof**

- R4. Preserve unrelated accepted edits, Markdown block identities, matter identities, navigation, and existing tests.
- R5. Add focused tests for these corrections against canonical sources and freshly generated outputs; existing checks must remain effective.
- R6. Commit Playwright screenshots of the changed learner-facing pages under `docs/plans/evidence/so-1/`, and report their paths in the build-stage handoff using `SCREENSHOT: <path>`.

R1–R3 trace to mandate item `so-1`. R4–R6 carry the supplied campaign R15/R16 guardrails into this planned correction; they do not implement the later expansion items.

### Scope Boundaries

Canonical edit candidates are the four files in the baseline table below, subject to D1. Derived output regeneration and correction-specific tests are part of this item.

No daemon or timer changes, deployment-path changes, schema migration, bulk data rewrite, package release, outside service, or credential/security-setting change is needed. Do not revert the whole editorial batch or edit generated pages by hand. Public artifacts contain paths and verification facts, not matter narratives or private reviewer material.

#### Deferred to Follow-Up Work

- `so-2`: generalized caption/jurisdiction consistency checks across the corpus.
- `so-3`: generalized publication rejection of unresolved editorial placeholders.
- `so-4`: live closure of the editor-overlay accessibility plan.
- `so-5`: CI for the existing suites and accessibility audits.

Other wording defects noticed in the same batch stay outside this item unless the named review explicitly includes them within `so-1`.

## Planning Contract

### Verified starting state

The checkout was clean on `drawdown/so-1` at the baseline commit, with no git remote. No repository or ancestor `AGENTS.md`/`CLAUDE.md` file was present; the instructions supplied with the task apply. Static source and history inspection found:

| Source | Current defect | Correction evidence |
|---|---|---|
| `data/matters/m12-discipline-mn/matter.json` | `caption` names Meridian although `tier` is `real` and `jurisdiction` is `MN` | `data/matters/manifest.json` and the batch's parent retain the Minnesota caption |
| `data/matters/m15-dwi-mn/matter.json` | `caption` names Meridian and contains inserted nonbreaking spaces; metadata remains real/MN | Same manifest and parent comparison |
| `data/curriculum/m2.md` | Block `f1301bb5` names Charles Langdell | [Harvard Law School's historical account](https://hls.harvard.edu/today/then-now/) identifies Christopher Columbus Langdell |
| `data/curriculum/templates/ssnp.md` | Block `924b9379` retains the editor question named in the mandate | Batch diff confirms its insertion; [Harvard's Program on Negotiation](https://www.pon.harvard.edu/tag/zone-of-possible-agreement/) supplies the expansion, “zone of possible agreement” |

The current `tools/validate_spine.py` A5 manifest check compares structural fields but omits `caption`. This explains why structural validation alone is insufficient evidence for R1; extending A5 is reserved for `so-2`.

`docs/plans/2026-10-24-0640-fix-editor-overlay-a11y-plan.md` was read as required context. Its live-verification work belongs to `so-4`.

No tests, build, browser run, or live verification occurred in this plan stage. The baseline is static evidence only.

### Dependencies and unresolved inputs

**D1 — controller input, blocking implementation handoff:** Neither the chief campaign plan nor `docs/handoffs/2026-10-23-editorial-review-batch-20261023T172555Z.md` is available here. The review path is also absent from available git history. The controller must supply the campaign Goal Capsule and cited requirements, plus the review's public-safe file-level findings, before authorizing execution of this plan. Reconcile those inputs with the four observed defects and revise the plan if they differ. Do not infer the missing review's full contents or claim its flags are closed. No credential discovery or remote access is needed to transfer these inputs.

### Assumptions

- The four candidates above are the complete `so-1` file set. Batch history supports that inference, but only D1 can confirm the review's actual list.
- Expanding ZOPA in the existing paragraph, then removing the note, satisfies R3. D1 must confirm that the review requires no different correction.
- Browser execution is deferred to the build stage. This clone's Unix-socket restriction may prevent browser startup; that would be an evidence gap to report to the controller, never a passing result.

### Key Technical Decisions

- KTD1. **Restore the manifest's existing caption values.** `docs/content-style-guide.md` freezes those values and their identities. The two source strings can be corrected without changing any schema or introducing new naming policy (R1/R4).
- KTD2. **Edit the two existing curriculum blocks in place.** Preserve their durable block IDs and surrounding accepted edits. Use the full verified name for R2; for R3, expand ZOPA at its existing occurrence and remove the editor question after D1 reconciliation.
- KTD3. **Test this batch through the existing build entry point.** Add `tools/tests/test_editorial_batch_20261023.py` using `unittest.TestCase`, compatible with the existing pytest suite. Reuse `tools/tests/fresh_site_build.py` and the parsing patterns in `tools/tests/test_platform_language_contract.py`; avoid assertions against stale checked-in HTML alone.
- KTD4. **Treat generated artifacts and semantic snapshots as derived evidence.** Follow `README.md` and `docs/solutions/orchestration/2026-10-05-fresh-worktree-generated-artifacts-and-legacy-generators.md`. A source edit changes the shared spine stamp, so unrelated pages may change only in generated metadata. Refresh semantic digests only after comparing fresh before/after captures and establishing that every semantic change belongs to R1–R3. Never bless unrelated baseline drift or weaken comparison/canary tests.
- KTD5. **Keep campaign ownership and model decisions intact.** Local work uses Astra; cloud build stages use the default Sol model, with Astra and Fable review at the campaign gate (session-settled: user-directed — chosen over the Sol-first local ladder and a mandatory cloud Astra override: preserve the campaign's stated execution split). No review credentials or extra deployment lane are introduced here.

### Sequence

Resolve D1 and recheck the branch's current sources. U1 and U2 may then be completed in either order; U3 follows both. Capture baseline test results at build start so existing failures are distinguishable from regressions.

## Implementation Units

### U1. Restore the two Minnesota captions

**Goal:** Correct the two affected matters without changing their identities.

**Requirements:** R1, R4, R5. **Dependencies:** D1.

**Files:** `data/matters/m12-discipline-mn/matter.json`, `data/matters/m15-dwi-mn/matter.json`, and new `tools/tests/test_editorial_batch_20261023.py`. Read `data/matters/manifest.json` as the authority; do not modify it.

**Approach:** Apply KTD1 and KTD3. Preserve all non-caption values and formatting outside the edited scalar. Cover both source and rendered/exported instances through the current builder.

**Test scenarios:**

1. Each affected source caption equals its existing manifest value, with `tier=real` and `jurisdiction=MN` unchanged.
2. Each fresh matter page, facts-page heading, law-page heading, and catalog record carries the corrected caption rather than the erroneous value.
3. Each exported matter JSON and student archive's `matter.json` carries the same corrected caption.
4. The corresponding fictional-tier matters `m02` and `m05` retain their existing Meridian captions; no global replacement alters them.
5. Generated interview and feedback links for the two corrected matters carry the corrected caption in the decoded `title` query value; their destination paths and all other query values remain unchanged.

**Verification:** The focused tests fail against the original wrong strings and pass after correction. The source diff changes only the two caption values.

### U2. Correct the attribution and resolve the template note

**Goal:** Repair the two flagged curriculum passages in their existing blocks.

**Requirements:** R2–R5. **Dependencies:** D1.

**Files:** `data/curriculum/m2.md`, `data/curriculum/templates/ssnp.md`, and `tools/tests/test_editorial_batch_20261023.py`.

**Approach:** Apply KTD2 and KTD3. Retain the current curriculum structure, credit/hour statements, and neighboring editorial changes.

**Test scenarios:**

1. The introduction's source block and fresh `modules/m2.html` contain the correct full name and no incorrect first-name attribution.
2. The SSNP source block and its fresh `templates/index.html#tpl-ssnp` section contain the expansion “zone of possible agreement” and no unresolved editor question.
3. The corrected SSNP paragraph still explains reservation points and the possibility of impasse.
4. The two durable block IDs and their editor-map source references survive the correction; neither block is deleted or duplicated.

**Verification:** Positive content assertions and targeted absence assertions pass on fresh output. The source diff is limited to the two corrections.

### U3. Regenerate and verify the published forms

**Goal:** Make the corrected canonical content reach every existing delivery surface with reviewable evidence.

**Requirements:** R1–R6. **Dependencies:** U1, U2.

**Files:** Derived `site/platform/` outputs, `app/worker/personas/personas.generated.json`, `tools/tests/test_editorial_batch_20261023.py`, and `docs/plans/evidence/so-1/`. `tools/tests/fixtures/platform-semantic-baseline.json` is a conditional derived update under KTD4; existing test code and assertions remain intact.

**Approach:** Regenerate through the existing tools, including ignored editor/history/instructor bundles needed by tests. Inspect the catalog, print-all view, firm book-of-business CSV, data catalog, student archives, and editor map for the affected content. Do not hand-edit generated HTML, add ignored bundles, or run the legacy taxonomy generator.

**Test scenarios:**

1. Fresh generated captions agree across HTML, catalog/data JSON, CSV, and the two student archives; no instructor-only content enters a student archive.
2. Before/after semantic captures retain page IDs, navigation paths, block references, and reading order. Only the two corrected matters' chat and feedback links change their caption-derived `title` query values; all other query values remain unchanged. Expected text, headings, editor text, and link differences trace only to R1–R3.
3. Playwright shows the two matter pages, Module II introduction, and SSNP paragraph at desktop and phone widths without clipping or horizontal overflow.

**Verification:** The Verification Contract passes, tracked generated changes are explained, and the R6 screenshots show the corrected passages.

## Verification Contract

These checks belong to the build stage. Add correction-specific assertions before changing the source and retain failing-then-passing evidence; do not delete, skip, or loosen an existing test.

Prepare a fresh checkout's generated inputs in the repository's documented order: site build, worker personas, instructor bundle, history bundle, then worker editor-data bundling. The corresponding entry points are `python3 tools/build_site.py --check`, `python3 tools/build_worker_personas.py`, `python3 tools/build_instructor_bundle.py`, `python3 tools/build_history.py`, and `node app/worker/scripts/bundle-editor-data.mjs`.

| Check | Command or evidence | Passing result |
|---|---|---|
| Focused regressions | `python3 -m unittest discover -s tools/tests -p 'test_editorial_batch_20261023.py' -v` | R1–R5 scenarios pass on fresh output |
| Full Python suite | `python3 -m pytest tools/tests/ -q` | Existing pytest and unittest tests pass |
| Tools Node suite | `node --test tools/tests/*.test.js` | Existing tools tests pass |
| Worker suite | `node --test test/*.test.js` from `app/worker` | Existing worker tests pass with generated prerequisites present |
| Spine and generated parity | `python3 tools/validate_spine.py` and `python3 tools/check_build_parity.py` | No integrity/parity failures |
| Full repository gate | `bash tools/preflight.sh` | All required checks pass, including browser and accessibility legs |
| Visual evidence | Playwright captures at 1280px and 390px | Corrected passages are legible and within the viewport |

`tools/shot.js` uses Puppeteer and therefore does not satisfy the mandate's Playwright evidence requirement. Use Playwright available through the execution environment and its dependency cache. Save screenshots as `docs/plans/evidence/so-1/{m12,m15,module2,ssnp}-{desktop,mobile}.png`; expand those names to eight actual files. Capture the relevant paragraph or heading after fonts settle, inspect the images, and record page, viewport, and tested commit in a public-safe evidence note in that directory.

If sockets or unavailable browser tooling prevent a check, record the exact failed check and let the controller obtain it in a capable environment. A `--no-browser` run or unrelated historical screenshot cannot close R6 or the full preflight requirement. Do not change security settings to make a check run.

A pre-existing semantic-baseline failure is not authorization to replace the whole baseline. Compare fresh before/after builds under KTD4 and report unrelated drift to the controller. Keep partial evidence explicit until the required checks are complete.

## Definition of Done

- D1 is reconciled and the actual review's `so-1` file-level findings map to R1–R3.
- U1 and U2 correct the canonical sources while preserving unrelated editorial work and identities.
- U3 produces current derived output, passing verification, and the R6 screenshot evidence.
- The diff contains only this item's source edits, focused tests, justified derived artifacts, and public-safe evidence; no abandoned implementation attempts remain.
- The build handoff reports exact checks, any unresolved environment failures, screenshot paths, branch, plan, and `KIND: planned`.
- Commits remain on `drawdown/so-1` for the controller. Any browser-evidence or authority gap remains visible; no claim of publication, deployment, or complete review closure is made without evidence.
