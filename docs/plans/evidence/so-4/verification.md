# so-4 accessibility verification — 2026-10-27

**Closeout is incomplete.** This build-stage run retained fresh local results and
checked live reachability. It did not obtain rendered accessibility measurements,
authenticated keyboard results, deployed asset identity, or Playwright screenshots.
No browser-dependent check is reported as passing.

## Provenance and scope

- Item: `so-4`, planned; branch: `drawdown/so-4`.
- Work source: [editor overlay accessibility plan](../../2026-10-24-0640-fix-editor-overlay-a11y-plan.md),
  already committed in `637664550d2745d918d7249f1b61698a18987520`.
- Starting tree: clean. The inherited repairs from `6f04bdc` and `4b9c093` are
  present. No production code, test, daemon, timer or publication configuration
  changed in this run.
- Source fingerprints, commands and local outcomes: [local-audit.json](local-audit.json).
- Live observations and the complete blocked-case ledger: [live-results.json](live-results.json).
- Runtime: Node `v22.22.1`, Python `3.14.4`; observations dated 2026-10-27 UTC.

The chief campaign plan and the named October 23 editorial handoff remain absent
from the supplied sandbox. No repository or ancestor `AGENTS.md` or `CLAUDE.md`
was found. The run followed the supplied standing rules and this item's plan;
the controller still needs to check the campaign Goal Capsule and R11, R15, R16,
R17, R19 and R20 against this receipt. This is not a claim to have read those
missing sources.

## Local results

| Check | Result | Scope and limits |
|---|---|---|
| Site build and link/leak checks | PASS | 20 matters, 78 HTML pages; internal links and instructor, marker and history leak checks pass. |
| Instructor bundle generation | PASS | 60 documents, 2,658 editable blocks; generated outside the public site. |
| Worker data generation | PASS | Editor map, instructor bundle, history (353 documents) and client bundle generated; history leak assertion passes. |
| Python suite | FAIL | 3,078 passed, 2 failed, 1 skipped; 22,068 subtests passed. |
| Focused accessibility contract | PASS | All 7 existing tests; static checks only. |
| Tools Node suite | PASS | All 50 tests, no failures or skips. |
| Worker Node suite | PASS | 1,493 passed, 1 skipped, no failures across 1,494 tests; the assessment-review browser test skips without Puppeteer. |
| Editor and audit JavaScript syntax | PASS | Existing client, verifier and audit parse successfully. |
| Editor client browser assertions | BLOCKED | Required hardcoded Puppeteer module is missing; zero assertions executed. |
| Default rendered accessibility sweep | BLOCKED | Puppeteer is unavailable; no FAIL/WARN counts or page measurements were produced. |
| Chrome startup probe | BLOCKED | The installed browser exits 134: `socket() failed: Permission denied (13)`. |
| Historical CSS negative controls | BLOCKED | Browser startup is unavailable; neither historical CSS control was run. |

The broad Python failures were observed without production or test edits:

- `tools/tests/test_coverage_apply_pipeline.py::test_curriculum_formatting_only_edit_cannot_report_applied`
  expects 653 source bytes; the current fixture supplies 746.
- `tools/tests/test_platform_semantic_contract.py::TestPlatformSemanticContract::test_clean_fresh_production_build_matches_baseline`
  reports full-corpus differences in text, headings, links and `editor_blocks`.

Both failures remain unresolved and outside this item's overlay scope. No fixture
was rewritten and no assertion was weakened. Their presence prevents describing
the required local gates as all passing.

Static inspection confirms inherited color, focus-selector, 44px button-height,
warning-tag, measured-banner-clearance and skip-link stacking rules. It does not
establish actual contrast, visible keyboard focus, responsive layout or rail
alignment. No application defect was reproduced, so KTD1 did not authorize a
frontend repair. No new test was added for this documentation-only receipt.

## Live results

Unauthenticated HTTP GET probes returned 403 for all five required routes and
both editor assets. That status does not identify whether the denial came from
the service or an intermediary. The connected computer-use inventory reported
zero browsers and zero apps; there was no existing authorized session to inspect.
No credentials, cookies or browser storage were read or exported.

- All **20 core cases** remain blocked: five routes, two type modes and two widths.
- All **16 role keyboard cases** remain blocked: home/module, admin/author,
  standard/large type and desktop/phone.
- Actual authenticated role, loaded overlay, live banner state, contrast,
  dimensions, fonts and deployed asset fingerprints remain unobserved.
- Forward/reverse Tab stops inspected: **0**. Skip-link visibility, Help growth,
  type switching, viewport resizing and gutter alignment remain unverified.
- Playwright screenshots captured: **0**. There is no screenshot path to report.

The paused-heartbeat case remains blocked locally as well. The daemon was not
stopped to manufacture a live warning. No new WARN class was accepted; the
[existing conformance policy](../../../uat/accessibility-conformance.md) remains in effect.

## Controller continuation

U8 is incomplete. U9 records that incomplete result without closing R5/R8 or the
plan's Definition of Done. These are controller follow-ups; no decision or new
authorization from Damien is established as necessary.

1. Supply/check the missing campaign excerpts and editorial handoff.
2. Run the existing editor verifier and default audit in a browser-capable
   environment with Puppeteer available. Resolve the verifier's absolute import
   through that runtime as the plan specifies; `NODE_PATH` alone cannot do it.
3. Run both historical CSS negative controls in isolated copies, then retain
   repaired-CSS results and compare WARN classes with the unchanged policy.
4. Use existing authorized admin and author sessions to finish the exact live
   matrix in the plan. Compare served editor CSS/JS with the recorded source
   hashes or a trusted deployment receipt. Capture cropped Playwright banner and
   footer images under this directory, excluding identities and private content.
5. Resolve or route the two existing Python-suite failures separately, and
   reconcile the final receipt with all required gates before claiming closure.

No migration, data rewrite, package release or new service is proposed. No remote
is configured; publication and deployment remain with the campaign controller.

The receipt was checked for unique matrix coverage, matching source fingerprints,
consistent test totals, working repository links and public-safe paths. The
generated build-stamp change was backed up and restored; generated bundles are
not part of the commit. These documentation checks do not complete U8.
