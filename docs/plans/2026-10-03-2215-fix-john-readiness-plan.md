---
title: John-readiness pass - make the author-editor path bulletproof, simple, and steady - Plan
type: fix
date: 2026-10-03
topic: john-readiness-2026-10-03
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# John-readiness pass - Plan

## Goal Capsule

**Objective.** Before Damien sends John Sonsteng anything, every surface John touches must be
(1) bulletproof, (2) dead simple, and (3) look the same to him while the platform keeps changing
underneath. John is 85 and in poor health. He will do "anything he likes" and will not remember
instructions, so each screen must explain itself.

**Decision record.** Cockpit ask `sonsteng-magnum-opus-2026-10-03-2133-john-readiness`:
hold the note until this pass is done; a 6-month sign-in for his door; the agent runs the UAT
programmatically and fixes what it finds; John's scope is open-ended.

**Constraint found.** Cloudflare Access caps application sessions at one month, and the editor
app is already at `730h`. The 6-month answer cannot be met inside Access. This plan makes the
monthly re-sign-in painless (U2) and records the cap for Damien.

## Live walk findings (2026-10-03, DEV, real Access sign-in with an emailed code)

| ID | Severity | Finding |
| --- | --- | --- |
| J11 | P0 | Every matter page and the Skills page fail inside the editor: HTTP 500 with the text "Not found." Worker logs: `too many SQL variables ... SQLITE_ERROR`. Durable Object SQLite allows at most 100 bound parameters per statement; `editor-store-core.js` chunks `IN (...)` lists at 400 and leaves some unchunked. Node tests use ordinary SQLite (limit 32766), so they never caught it. The Matter Library links all lead to this error. |
| J9 | P0 | When the Access session expires, editor API calls receive a 302 to the cross-origin Access login. The browser blocks the redirect, `api()` reports a network error, and the page loops on "That didn't send - it will retry automatically" with no route back in. |
| J8 | P1 | Entering edit mode shows the source HTML's hard line breaks and indentation inside the paragraph ("jurisdiction / tiers"). John would "fix" the formatting and create junk edits. |
| J10 | P1 | History is a raw list of developer file paths (`data/copy/firm.json` ...), unstyled, with no way back to the practicum. Unusable for John. |
| J5 | P1 | The editing bar speaks in jargon: "EDITING", "Your edits appear on the editing site automatically (~2 min)", "VIEW AS STUDENT" (which leaves for `sonsteng-dev.damienriehl.com`), "HISTORY", "Bigger change...". No way to get help. |
| J3 | P1 | At standard size the per-paragraph Edit and Comment controls are bare pencil/bubble icons; labels appear only in Large Type. |
| J2 | P2 | Two Large Type controls (the bar's STANDARD/LARGE TYPE and the page's "A+ LARGE TYPE"). |
| J4 | P2 | "SHARED TEXT" labels across headings are jargon. |
| J12 | P1 | Client-side editor failures (401, network, CSRF, conflict) never reach Damien. |
| J13 | P0 | The direct-apply daemon refuses every tick while its checkout is behind `origin/main`, and nothing fast-forwards it. Every merge to `main` therefore stalls John's auto-apply ("Auto-apply paused") until an operator updates the checkout by hand. On 2026-10-03 it was 4 commits behind; the orchestrator fast-forwarded it. `deploy-dev.sh` defaults to the same stale local `main`. |
| J1 | P2 | The Access sign-in page is small Cloudflare-branded text with a random hostname and no explanation. The code email also carries a "finish logging in" link, simpler than typing six digits. |

## Product Contract

Applies to non-admin editor slots (John, Roger). Damien's admin view keeps its tools.

- R1 (J11). No Durable Object SQL statement binds more than 100 parameters. Chunk every
  `IN (...)` list at 90 or fewer. Add a test guard that wraps the store's `sql.exec` and fails any
  statement binding more than 100 parameters, and run the store tests under it. Matter pages and
  Skills render inside the editor.
- R2 (J9). The editor detects a lost sign-in (fetch with `redirect: 'manual'` yields
  `opaqueredirect`, or a 401) and never loops. It saves the draft locally first, then shows one
  plain panel: "You've been signed out. Your words are saved." with one large button,
  "Sign in again", that reloads the current page through the Access door, and the sentence
  "We'll email you a link - just click it." After sign-in the saved draft is restored.
- R3 (J8). Edit mode shows the paragraph as it reads on the page: source whitespace collapsed,
  no hard breaks or indentation. Pressing Done with no real change sends nothing.
- R4 (J5, J10, J2, J4, J3). John's bar is plain and short:
  - One sentence: "You're editing the practicum. Click EDIT beside any paragraph to change it. Changes save on their own."
  - Buttons, in plain words: "Suggest a bigger change" and "Help".
  - "Help" opens a small panel: what EDIT and COMMENT do, that nothing can be broken, and how to
    reach Damien. Damien's phone number comes from an optional Worker var
    (`EDITOR_HELP_CONTACT`); without it, the panel says "Leave a comment - Damien reads every one."
  - Remove HISTORY and VIEW AS STUDENT from non-admin slots. Undo stays available per paragraph.
  - Hide the page's own "A+ LARGE TYPE" button in editor mode; the bar's control is the one control.
  - Large Type is ON by default for non-admin slots, remembered per browser.
  - Edit and Comment always show their text labels, at every size.
  - Replace the "SHARED TEXT" label with nothing visible; keep the warning only inside edit mode as
    "This wording also appears on other pages."
- R5 (J12). The editor reports client-side failures (sign-in lost, send failed after retries,
  conflict, server error) to a new same-origin endpoint, rate-limited, with no paragraph text.
  The Worker logs a structured `editor_client_error` event and records it in the existing store
  so the home-box ntfy digest can alert Damien. Reuse existing alert plumbing; add no new secret.
- R6 (J1). Customize the Access login design text to explain the step in plain words
  (Cloudflare configuration, done by the orchestrator through the authorized Cloudflare API).
- R8 (J13). Before its freshness guard, the daemon fast-forwards its checkout with
  `git merge --ff-only` from the fetched upstream when the tree is clean and the branch matches.
  It still refuses (and alerts) when the tree is dirty, the branch diverged, or the fast-forward
  fails. `deploy-dev.sh` with no argument deploys `origin/main` after a fetch, not the local ref.
- R7. Update `docs/editor-guide-for-john.md` to match the new UI exactly, and add the John path to
  the persona harness so a deploy cannot silently change what he sees.

## Implementation Units

- U1 (Codex worker A). R1 in `app/worker/src/editor-store-core.js` plus the bind-count guard in
  the worker tests.
- U2 (Codex worker B). R2, R3, R4, R5 in `app/editor/`, `app/worker/src/editor-inject.js`,
  `editor-endpoints.js`, `editor.css`, with tests in `app/worker/test/` and
  `app/editor/verify-editor.js`.
- U4 (Codex worker C). R8 in `tools/direct_apply_daemon.py` and `deploy/deploy-dev.sh`, with
  tests beside the existing daemon freshness tests.
- U3 (orchestrator). R6 via the Cloudflare API; R7 docs; deploy the DEV Worker; re-walk live.

## Verification Contract

Worker unit tests, `bash tools/preflight.sh` (full), then a second live walk on DEV through the
real Access door: every matter page and Skills render in the editor; a simulated expired session
shows the sign-in panel instead of looping; edit mode shows clean text; John's bar matches R4.

## Definition of Done

Merged on `main`; DEV Worker and static site deployed; the second live walk passes; the guide
matches the UI; Damien gets the note to send.


## Follow-ups

- F2 (R5/J12) done: `/edit/v1/client-error` now persists metadata-only errors
  after the existing atomic BudgetCounter gate (30 reports/day). The migrated
  `client_errors` table retains at most 1000 rows and prunes records older than
  30 days on insert. Admin-only `/edit/v1/client-errors?since=<epoch ms>` returns
  the oldest 200 new records. `tools/digest_push.py` consumes them through the
  existing ntfy digest, alerts even when suggestions are unchanged, and persists
  its high-water mark after successful publication. No paragraph text or new
  secret is used. Signed-out telemetry remains best-effort: expired Access can
  also block the authenticated reporting endpoint.
