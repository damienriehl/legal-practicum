# Accessibility Conformance

This record closes decision D5 from the persona UAT program. It records an accepted baseline, not a
suppression list and not a change to the audit.

- **Target.** The project targets WCAG 2.2 Level AA.
- **Command.** Run `node tools/a11y_audit.js` from the repository root against the built site.
- **Recorded result.** At production SHA `49e24f4`, the final persona UAT run reported 0 FAIL and
  126 WARN across twelve audited page cases.
- **Gate effect.** Any FAIL remains build-blocking. WARN findings remain visible and countable, but
  the exact accepted baseline below is not open remediation work.

## Accepted WARN baseline

The audit names this rule `target-size-aaa`. It applies only after a control has met the 24 by 24 CSS
pixel minimum enforced for WCAG 2.2 criterion 2.5.8 at Level AA. It then reports a WARN when a
non-chip native control misses either dimension of the project's standing 44 by 44 CSS pixel check,
which is based on WCAG criterion 2.5.5 at Level AAA.

The retained repository record contains the 126 finding total and the three dominant control classes
below, but not the JSON finding file needed to reconstruct separate historical counts or name any
remainder. D5 accepts that frozen 126-finding result as a whole. For later runs, only the three named
control classes are accepted for comparison. The count column preserves that limit instead of
assigning estimates.

| Control class | Rule | Count at `49e24f4` | Rationale | Accepted by | Revisit trigger |
|---|---|---:|---|---|---|
| Skip links | `target-size-aaa`, WCAG 2.5.5 AAA, project 44 by 44 rule | Not retained separately | They meet the AA target-size gate and provide keyboard access to the main region. | Damien, 2026-09-03 | Platform redesign |
| Header wordmarks | `target-size-aaa`, WCAG 2.5.5 AAA, project 44 by 44 rule | Not retained separately | They meet the AA target-size gate and retain the established header design. | Damien, 2026-09-03 | Platform redesign |
| Compact `button.hot` rows | `target-size-aaa`, WCAG 2.5.5 AAA, project 44 by 44 rule | Not retained separately | They meet the AA target-size gate and are compact controls in the editor test harness. | Damien, 2026-09-03 | Platform redesign |
| **Frozen result** | Historical WARN set | **126** | Accept AA now and revisit the 44 by 44 project preference with the platform redesign. This total is not an acceptance of an unnamed class in a later run. | Damien, 2026-09-03 | Platform redesign |

## Reopening conditions

For this record, a WARN class is the audit check name paired with the control class described in the
table. Acceptance reopens when either condition occurs:

- **Any FAIL.** A FAIL at any audited page or mode reopens conformance work and keeps the audit gate
  failing.
- **New WARN class.** A WARN whose check name or control class is not represented in the table is
  new work and is not covered by D5.

An increased or changed `target-size-aaa` finding must be compared with the recorded control classes.
The decision does not automatically accept a new control class merely because it uses the same rule
name.

## Editor overlay coverage — 2026-10-24

The default audit now also loads `app/editor/editor.css` on every non-interactive platform matrix
page in both type modes and marks `[data-eb-locked]` elements as the editor does (class, button role,
and keyboard focus). This covers locked footer text on the green surface. Locked text, its dotted
underline, and its focus outline now use the surrounding text color. The banner's
`button.editor-banner__bigger` controls now have a 44 CSS pixel minimum height; they are not an
accepted target-size warning class.

## Editor overlay verification attempt — 2026-10-27

The fresh `so-4` run at source revision `6376645` **does not close the overlay
accessibility plan**. The site build, all 50 tools Node tests and all 7 focused
accessibility contract tests pass. The broad Python suite reports 3,078 passed,
2 failed and 1 skipped; the two existing curriculum/semantic-baseline failures
remain unresolved outside the overlay scope.
The Worker suite reports 1,493 passed, 1 skipped and no failures after the
documented local data generators complete.

The rendered audit and editor verifier could not start because Puppeteer is
missing, and the installed Chrome binary separately failed on the sandbox's
Unix-socket restriction. No connected authenticated browser was available. All
five live page probes and both editor asset probes returned HTTP 403. All 20
core live cases and 16 role-specific keyboard cases therefore remain blocked,
with no new contrast measurements, FAIL/WARN totals or Playwright screenshots.

The audit source includes the follow-up locked-focus and paused-warning checks,
but this run did not execute them or their historical CSS negative controls.
Static inspection and historical contrast ratios are not fresh rendered proof.
The accepted WARN classes and reopening conditions above remain unchanged.

See the [verification receipt](../plans/evidence/so-4/verification.md),
[local gate results](../plans/evidence/so-4/local-audit.json) and
[live case ledger](../plans/evidence/so-4/live-results.json) for evidence and the
controller's remaining verification work.
