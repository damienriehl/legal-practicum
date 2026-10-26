---
title: "Editor overlay accessibility closeout - Plan"
type: fix
date: 2026-10-24
updated: 2026-10-26
artifact_contract: ce-unified-plan/v1
product_contract_source: drawdown-so-4
execution: code
---

# Editor overlay accessibility closeout - Plan

## Goal Capsule

- **Objective:** Editors can read the overlay and use the keyboard on real practicum pages without losing text or focus behind the banner.
- **Means:** Re-verify the merged repairs and retain fresh local and live evidence (KTD1, KTD2).
- **Authority:** Drawdown item `so-4` only, governed by the chief repository's `docs/plans/2026-10-26-0705-feat-codex-drawdown-campaign-plan.md` Goal Capsule and campaign R11, R15, R16, R17, R19, R20, followed by repository instructions and this plan. Campaign IDs are distinct from this plan's R-IDs.
- **Execution boundary:** This revision is planning only. The build stage performs U8 and U9 and repairs only reproduced violations of R1–R7. Existing U1–U7 retain their IDs for traceability.
- **Delivery:** Work stays on `drawdown/so-4`. The lane commits locally; the controller scans, pushes and opens the PR, and the campaign merge gate handles merging. Any deployment follows the repository's normal path.
- **Stop conditions:** R9 governs prohibited actions. Missing browser access or runtime support blocks only the affected verification; it never counts as a passing result or justifies claiming live closure.

## Product Contract

### Summary

Close the October 24 accessibility work with fresh measurements and screenshots of the deployed editor.
Preserve the existing fixes, audit gates and accepted warning policy.

### Problem Frame

The original audit found locked footer text at 1.29:1, a claret focus outline at 1.13:1, and banner controls only 32px tall.
The public footer measured 9.55:1, so the overlay introduced the text failure.
A phone keyboard probe found 8 of 40 reverse-tab stops hidden under the author's roughly 220px sticky banner; the skip link also appeared underneath it.
The fixed admin banner could outgrow its reserved `3.6rem` clearance (`4.6rem` below 640px).

PR #111 implemented the first repairs.
Review then found that the later theme rule still won the locked-focus cascade and that the paused-banner tag measured only 4.17:1 at 0.72rem.
PR #112 repaired those defects, but historical measurements do not establish the current deployed result.

### Requirements

**Overlay behavior — original requirements retained**

- R1. Locked text inherits its context's color, with a `currentColor` dotted underline and help cursor distinguishing it from editable text.
- R2. The locked-text focus indicator uses `currentColor` and wins over the later theme rule, meeting the project's 3:1 outline-contrast check on its actual surface.
- R3. Editor banner buttons reach the project's 44px minimum target height without breaking the banner layout at desktop or phone width.
- R6. A `ResizeObserver` keeps `--eb-banner-h` current as the banner wraps or Help expands; use it for scroll clearance in both roles and body padding in fixed admin mode, retaining the rem fallbacks. A focused skip link stacks above the banner.
- R7. The paused-banner tag uses the banner's light ink and meets 4.5:1; the audit exercises both the locked-focus check and stale-heartbeat warning state.

**Verification and evidence**

- R4. The default `tools/a11y_audit.js` sweep covers real built platform pages with editor CSS and the locked-text marking from `installLockedPassages()`. Overlay, focus and warning checks must fail with the corresponding pre-fix CSS and pass with repaired CSS, through the existing preflight gate.
- R5. Record fresh results and their limits in `docs/uat/accessibility-conformance.md`, retaining its accepted WARN classes and reopening conditions.
- R8. Closeout requires the Verification Contract's local gates and live matrix, with dated measurements and Playwright screenshots committed under `docs/plans/evidence/so-4/`. An inaccessible page, missing role or skipped check remains an explicit gap.

**Campaign boundaries**

- R9. Preserve existing tests and normal publication controls; do not touch the apply daemon or timer, read credential material, change security settings, spend, send messages, add remotes, find credentials, force-push, or delete unbacked data. No schema migration, data rewrite, package release or new outside service belongs to `so-4`.

Product Contract preservation: R1–R6 retain their meaning; R6 moves from U4 into Requirements, R7 names the existing U5–U7 follow-up obligations, and R8–R9 state the campaign closeout contract.

### Scope Boundaries

The public palette, footer design and locked-value interaction semantics stay unchanged.
No new audit framework or CI workflow is needed: the existing gate already runs the overlay cases.
Reconsider that choice only if fresh evidence shows the existing checks cannot prove R1–R7.

### Deferred to Follow-Up Work

Editorial corrections, jurisdiction-caption checks, placeholder rejection and CI are the other mandate items (`so-1`, `so-2`, `so-3`, `so-5`).
Do not fold them into this branch, including when a broad suite exposes an unrelated failure.

## Planning Contract

### Starting State Re-verified on 2026-10-26

The clean `drawdown/so-4` checkout starts at `02988e4`, the merge of PR #112.
Static inspection confirms the following; no test, build or live probe was run during this planning stage.

| Evidence | Current implementation | Verification still needed |
|---|---|---|
| `6f04bdc`, PR #111 | U1–U4 code is present in `app/editor/editor.css`, `app/editor/editor.js`, `tools/a11y_audit.js` and `app/editor/verify-editor.js` | Fresh rendered and keyboard results |
| `4b9c093`, PR #112 | U5–U7 selector, light warning tag and audit cases are present | Fresh red/green evidence and deployed-asset check |
| `tools/a11y_audit.js` | Default sweep prepends editor CSS, marks locked values, checks their focused outlines, and audits `auto_apply_paused` in both type modes | Default viewport is only 1280×900; supplied URL arguments select baseline-only cases without the locked-focus loop |
| `app/editor/verify-editor.js` | B2 checks rail alignment after banner growth | It does not prove the original reverse-tab or focused-skip-link failures are gone |
| `tools/build_site.py` | Generated `.skip-link` has z-index 100; editor banner has z-index 40 | Stacking numbers alone do not establish visible keyboard focus |
| `docs/uat/accessibility-conformance.md` | Describes the initial overlay change and preserves the warning policy | Does not retain a fresh five-page live closeout receipt |

The chief campaign plan and `docs/handoffs/2026-10-23-editorial-review-batch-20261023T172555Z.md` are absent from the supplied sandbox.
No repository or ancestor `AGENTS.md` or `CLAUDE.md` was found there.
This revision uses the supplied campaign rules and the available plan, code and git history; it does not claim to have read the missing files.
The controller must supply or check the missing source excerpts before build execution, limited to the campaign Goal Capsule and cited R-IDs.

### Key Technical Decisions

- KTD1. **Verify before changing the frontend.** U1–U7 already landed; U8 re-establishes their behavior before authorizing a narrow repair. Any reproduced defect receives a regression case in the existing audit or editor verifier before its fix.
- KTD2. **Keep local and live evidence distinct.** Use the current default audit for its supported local cases, then Playwright on actual authenticated editor pages for the live matrix. Passing URL arguments to the current audit cannot substitute for keyboard, type-mode and role verification.
- KTD3. **Observe live sessions without editing content or service state.** Use existing authorized browser sessions in place, never exported cookies, tokens or storage files. Exercise paused heartbeat through the existing local harness scenario; do not stop the daemon to manufacture a live warning.
- KTD4. **Record only public-safe evidence.** Store selector-level measurements, counts, source revision, observed role, viewport, type mode, timestamp and screenshot references. Crop screenshots to footer or banner controls, excluding account identity, comments and private content; never retain raw authenticated HTML, headers or browser state.

### Assumptions and Runtime Dependencies

The live target remains `https://edit.legalpracticum.org`, as named in the original baseline and `README.md`; availability and current deployment identity are build-stage checks.
The data-spine build stamp alone does not prove which editor CSS or JavaScript was deployed: compare the served asset fingerprints with the checked source or a trusted deployment receipt.

Browser dependencies must come from the supplied toolchains/cache or the controller's browser-capable environment.
`tools/a11y_audit.js` supports `PUP_DIR` and `CHROME_BIN`; `app/editor/verify-editor.js` currently hardcodes a Puppeteer location and supports `EDITOR_CHROME_BIN` for Chromium.
Resolve that mismatch through the runtime environment, without claiming that `NODE_PATH` overrides an absolute import or changing unrelated tooling for this item.
Unix-socket/browser startup failures in the sandbox are environment failures, not application failures or passes.

An existing authenticated admin session and author session are prerequisites for the role checks.
If either is unavailable, finish local evidence and every reachable live case, then return the missing access as a controller follow-up.
Only a need that truly requires Damien belongs in `Needs your decision`, with setting, minutes and the exact checks it unblocks.

## Implementation Units

U1–U7 describe the inherited repairs.
They are present in the starting revision; U8 verifies them and reopens only a reproduced defect.

### U1. Locked text and focus indicator inherit context

Requirements: R1, R2. Files: `app/editor/editor.css` (`.eb--locked`).
Keep the inherited text, dotted underline and help cursor; rendered proof belongs to U8.

### U2. Banner buttons meet 44px

Requirements: R3. Files: `app/editor/editor.css` (`.editor-banner__bigger`).
Keep the 44px minimum height; measure wrapped layouts in U8.

### U3. Audit covers the overlay on real pages

Requirements: R4, R5. Files: `tools/a11y_audit.js`, `docs/uat/accessibility-conformance.md`.
`tools/preflight.sh` already runs the default sweep; no new gate wiring is planned.

### U4. Keyboard focus stays visible around the banner

Requirements: R6. Files: `app/editor/editor.js`, `app/editor/editor.css`; tests: `app/editor/verify-editor.js`.
Preserve measured banner clearance and rail relayout; U8 verifies actual keyboard visibility and the generated skip link from `tools/build_site.py`.

### U5. Locked focus ring wins over the theme

Requirements: R2. Files: `app/editor/editor.css`, `site/platform/assets/theme.css` (reference only).
The corrected `.eb--locked[tabindex]:focus-visible` selector beats the theme's later `[tabindex]:focus-visible` rule.
The original tied selectors yielded claret `#78363e` on green `#30483a`, 1.13:1; the repaired historical reading was 9.55:1.

### U6. Paused-banner tag meets 4.5:1

Requirements: R7. Files: `app/editor/editor.css`.
The inherited warning-state rule uses `--ink-invert`, historically 8.42:1, replacing `--brass-lite-text` (`#d3ae5c`, 4.17:1).

### U7. The audit sees both states

Requirements: R2, R4, R7. Files: `tools/a11y_audit.js`, `app/editor/test-harness.html`.
Preserve keyboard-visible outline checks and `auto_apply_paused`; U8 rechecks their ability to catch the original defects.

### U8. Verify the repaired overlay locally and live

- **Goal:** Produce fresh proof for R1–R4 and R6–R8, including the checks the current audit does not perform.
- **Dependencies:** U1–U7 in the current checkout; runtime and source prerequisites above. Live checks follow any necessary repair and its normal deployment.
- **Files:** `docs/plans/evidence/so-4/verification.md`, `docs/plans/evidence/so-4/local-audit.json`, `docs/plans/evidence/so-4/live-results.json`, and screenshots in that directory. Regression repairs, only when a defect is reproduced: `app/editor/editor.css`, `app/editor/editor.js`; test paths: `app/editor/verify-editor.js`, `tools/a11y_audit.js`, `app/editor/test-harness.html`, `tools/tests/test_a11y_audit_contract.py`.
- **Approach:** Follow KTD1–KTD4 and the Verification Contract. Preserve a dated case ledger with pass, fail and blocked outcomes. Use real keyboard navigation for focus visibility; direct element focus alone proves only the outline branch. Keep checks read-only on the live site.
- **Patterns:** Mirror production stylesheet order from `app/worker/src/editor-inject.js`. Follow `docs/solutions/editor/2026-07-28-checks-that-cannot-fail.md` for negative controls and `docs/solutions/editor/2026-09-27-css-tokens-defined-only-in-test-stubs.md` for real styles.
- **Execution note:** Start with the existing gates. If a case fails, capture a failing regression in the listed test path before making the smallest repair within its inherited unit.
- **Verification:** Every required case has a result with evidence, and every repaired defect has failing-before/passing-after proof. No skipped browser check is reported as green.

### U9. Publish the conformance receipt in the repository

- **Goal:** Make the scope and limits of the fresh result reviewable (R5, R8).
- **Dependencies:** U8 results, including any unresolved blocked cases.
- **Files:** `docs/uat/accessibility-conformance.md`, `docs/plans/evidence/so-4/verification.md` and the evidence files named by U8.
- **Approach:** Link the new measurements and screenshots, distinguishing local simulation from actual deployed observation. Explain the follow-up focus and warning-tag coverage. Preserve the original WARN decisions; new classes receive explicit disposition, never automatic acceptance.
- **Test expectation:** None for documentation itself; reconcile its claims with U8's case ledger, exit statuses and image files.
- **Verification:** The conformance record states complete closure only when the Definition of Done holds; otherwise it names the exact remaining checks without discarding completed work.

## Verification Contract

### Local Gates and Regression Scenarios

Use the build prerequisites in `README.md`: `tools/build_site.py --check`, `tools/build_instructor_bundle.py` and `app/worker/scripts/bundle-editor-data.mjs` generate the ignored inputs before the worker suite.
Do not hand-edit generated platform pages or commit unrelated generated changes.

| Check | Build-stage command or test surface | Required result |
|---|---|---|
| Site build | `python3 tools/build_site.py --check` | Successful build and link/leak checks |
| Python tests | `python3 -m pytest tools/tests/ -q` | Existing tests pass, including `tools/tests/test_a11y_audit_contract.py` |
| Tools Node tests | `node --test tools/tests/*.test.js` | Existing tests pass |
| Worker tests | `node --test test/*.test.js` from `app/worker` | Existing suite passes after documented generators |
| Editor client | `node app/editor/verify-editor.js` | Zero failed assertions; preserve the full assertion set |
| Accessibility | `node tools/a11y_audit.js` | Zero FAIL, WARN classes compared with the conformance policy |
| Negative controls | Current audit against isolated copies using CSS before `6f04bdc` and before `4b9c093` | Detect original footer contrast, focus outline and warning-tag defects; repaired CSS passes |

Run negative controls in isolated copies with the original tracked files preserved, never by leaving regressed CSS in the working branch or changing the live page.
Retain only sanitized summaries from those runs; historical 44-FAIL and 68-FAIL totals in commit messages are context, not fresh acceptance thresholds.

For a reproduced defect, the regression must exercise the failing behavior:

1. Locked footer title, byline and host text retain normal-text contrast on the actual green surface, with production CSS order.
2. Keyboard-visible locked outlines meet R2 despite the later theme selector.
3. Normal and paused banners retain readable tags; the paused case uses `auto_apply_paused` without changing service state.
4. Banner buttons meet R3 at both widths and type sizes without clipping or horizontal overflow.
5. Forward and reverse Tab navigation keep focus visible as Help expands, type size changes and the banner wraps in both roles.
6. The focused skip link appears above the banner and reaches the main region; banner growth keeps gutter rails aligned with their passages.

### Live Matrix and Screenshots

Audit these original baseline routes on `https://edit.legalpracticum.org`:

| Page family | Route |
|---|---|
| Home | `/edit/index.html` |
| Getting started | `/edit/getting-started/index.html` |
| Module | `/edit/modules/m2.html` |
| Matter | `/edit/matters/m12-discipline-mn/index.html` |
| Law | `/edit/matters/m15-dwi-mn/law/index.html` |

The core matrix is five routes × STANDARD/LARGE TYPE × desktop 1280×900/phone 390×844: 20 cases.
Record the actual authenticated role, confirm the editor overlay loaded, and wait for fonts and banner measurements before collecting each case.
A sign-in screen or a public page without the overlay is a blocked case.

In every core case, run the rendered-DOM accessibility checks and explicitly exercise the locked-outline branch from `tools/a11y_audit.js`, checking actual fonts, colors and dimensions.
Require zero FAIL and disposition of each WARN class under the existing conformance policy.
Use Tab and Shift+Tab to verify visibility around the banner rather than deriving it from CSS values.

On home and the long module page, repeat keyboard verification in both actual admin and author sessions, at both widths and type sizes.
Cover the first 40 stops in each direction where available, continue to footer locked values, and record the number inspected.
Open and close Help in the author view, resize across the phone layout, switch type size, and confirm R6 after each height change.
Role-mocked harness results remain local evidence and cannot stand in for an unavailable live role.

Capture Playwright screenshots of banner and footer at both widths and type modes, with a focused locked footer value visible.
Use names such as `home-admin-standard-desktop-footer.png` and `home-author-large-phone-banner-help.png` under `docs/plans/evidence/so-4/`, and link every image from the receipt.
Document the observed live banner state; if it is not paused, its paused-state proof remains explicitly local under KTD3.
Screenshots support the measurements rather than replacing them.

## Definition of Done

- U8's required local and live cases pass, including both role-specific keyboard checks, with no outstanding overlay FAIL or unresolved new WARN class.
- Served editor assets are tied to the verified source or trusted deployment receipt; a data-only build stamp is insufficient.
- Any code repair preserves every existing test and adds a regression proving the reproduced failure.
- U9 links fresh, public-safe measurements and Playwright screenshots; the receipt records revision, timestamp and any limitations.
- Only `so-4` files are committed. Experimental changes and negative-control artifacts do not remain in the tracked diff.
- The controller receives the local branch and evidence paths. Missing access or runtime support yields an incomplete closeout with exact follow-up work, never a claim that live verification passed.
