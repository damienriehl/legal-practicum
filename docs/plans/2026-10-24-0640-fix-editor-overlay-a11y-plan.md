---
title: "fix: editor overlay accessibility on real pages"
type: fix
status: active
date: 2026-10-24
---

# fix: editor overlay accessibility on real pages

## Goal Capsule

On 2026-10-24 Damien reported that the footer on `edit.legalpracticum.org/edit/index.html`
looked like it failed WCAG contrast. A live audit of five editor pages, in both type modes,
confirmed it: the editor overlay paints locked (computed) text `--ink-soft` (#5f5046), and on
the forest-green footer (#30483a) that measures **1.29:1** against the 4.5:1 minimum. The
public site renders the same footer at 9.55:1, so the editor overlay introduces the failure.

Make the editor overlay meet WCAG 2.2 AA wherever it lands, and close the audit gap that let
this ship: `tools/a11y_audit.js` audits built pages and a bare editor harness, never real
pages with the overlay applied.

## Live audit baseline (2026-10-24, DEV, Damien's own editor session)

Pages: `/edit/index.html`, `/edit/getting-started/index.html`, `/edit/modules/m2.html`,
`/edit/matters/m12-discipline-mn/index.html`, `/edit/matters/m15-dwi-mn/law/index.html`.

- **FAIL text-contrast, every page, both modes:** `strong.eb--locked` "Legal Practicum" and
  the `span.eb--locked` byline and host line in `.site-footer`, 1.29:1.
- **Not measured by the audit, computed by hand:** the `.eb--locked:focus-visible` outline uses
  claret (#78363e), which measures 1.13:1 on the footer green, below the 3:1 focus-indicator floor.
- **WARN target-size-aaa:** `button.editor-banner__bigger` ("Describe a change across this
  matter", "Help") at 32px tall. The accepted classes in
  `docs/uat/accessibility-conformance.md` do not cover this control.

## Requirements

- R1. Locked text inherits its context's color, so it keeps the contrast of whatever surface it
  sits on. A dotted underline drawn from `currentColor` and the help cursor keep it
  distinguishable from editable text.
- R2. The locked-text focus indicator draws from `currentColor`, so it contrasts with every
  surface the text can contrast with.
- R3. Editor banner buttons reach the project's 44px minimum target height without breaking the
  banner layout at desktop or phone width.
- R4. `tools/a11y_audit.js` gains an editor-overlay case: for real built platform pages, load
  `app/editor/editor.css` and apply the locked-text marking that `installLockedPassages()` in
  `app/editor/editor.js` applies, then run the same audit. That case must FAIL against the
  pre-fix CSS and PASS after it. Preflight runs it with the existing audit (no new gate script).
- R5. Record the change in `docs/uat/accessibility-conformance.md`.

## Implementation Units

### U1. Locked text and focus indicator inherit context (R1, R2)
Files: `app/editor/editor.css` (`.eb--locked`, `.eb--locked:focus-visible`).

### U2. Banner buttons meet 44px (R3)
Files: `app/editor/editor.css` (`.editor-banner__bigger`).

### U3. Audit covers the overlay on real pages (R4, R5)
Files: `tools/a11y_audit.js`, `tools/preflight.sh` only if the default sweep does not already
include the new case, `docs/uat/accessibility-conformance.md`.

### U4. Keyboard focus never hides under the banner (R6)
Files: `app/editor/editor.js` (banner install, near `classList.add('has-editor-banner')`),
`app/editor/editor.css` (`html.has-editor-banner body` padding rules, `.skip-link` stacking).

Added 2026-10-24 after a live keyboard probe. In the non-admin (author) view, the banner sits
`position: sticky` and wraps to about 220px at phone width. With no scroll padding, tabbing
backward left 8 of 40 focus stops fully hidden behind it, and the "Skip to content" link
appeared under the banner at both widths. That violates WCAG 2.2 AA 2.4.11 Focus Not Obscured
(Minimum). The admin view's fixed banner reserves a fixed `3.6rem` (`4.6rem` under 640px),
which a wrapped banner exceeds.

- R6. Measure the banner's rendered height, and keep it current as the banner wraps or Help
  expands, by writing a CSS custom property (`--eb-banner-h`) from a `ResizeObserver`. Use it for
  `scroll-padding-top` in both modes and for the fixed-mode `body` top padding; keep the existing
  rem values as fallbacks. A focused skip link stacks above the banner.

## Verification Contract

- New overlay audit case fails on the pre-fix CSS (red) and passes after (green).
- `node tools/a11y_audit.js` default sweep: 0 FAIL.
- Worker suite (`cd app/worker && node --test test/*.test.js`) stays green.
- After deploy, the live audit of the five baseline pages reports 0 FAIL, and a screenshot of
  the editor footer and banner, desktop and phone width, shows the fix.

## Scope Boundaries

- No change to the public site's palette or the footer design.
- No change to what locked text does (dialog, role, keyboard handling).

## Follow-up after merge (2026-10-24)

After PR #111 merged, the repaired cross-model Codex review found two defects that the
in-process review missed. Both were confirmed against the live site or the repository tokens.

### U5. Locked focus ring wins over the theme (R2, corrected)
`site/platform/assets/theme.css` declares `[tabindex]:focus-visible { outline: … var(--claret) }`.
It ties `.eb--locked:focus-visible` at (0,2,0), and it loads after the prepended `editor.css`, so
it wins. Live, tabbing to "Legal Practicum" in the footer showed `rgb(120, 54, 62)` on
`rgb(48, 72, 58)`, 1.13:1. Raise the selector to `.eb--locked[tabindex]:focus-visible` and keep
`currentColor` (9.55:1 on the footer).

### U6. Paused-banner tag meets 4.5:1
`.editor-banner--warn` turns the banner claret (#78363e), and the `.editor-banner__tag` keeps
`--brass-lite-text` (#d3ae5c): 4.17:1 at 0.72rem. In the warn state the tag uses the banner's
light ink (`--ink-invert`, 8.42:1).

### U7. The audit sees both states
- Focus indicators: in the editor-overlay case, keyboard-focus each locked value and FAIL when
  its computed outline contrasts less than 3:1 with the surface behind it.
- Warn banner: audit the editor harness in its stale-heartbeat warn state too (direct apply on,
  heartbeat older than the stale threshold), so `editor-banner--warn` renders.
- Each new check must FAIL against the pre-U5/U6 CSS and PASS after.
