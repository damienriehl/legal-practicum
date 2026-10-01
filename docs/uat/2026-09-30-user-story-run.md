# User-story run — 2026-09-30

Plan: `docs/plans/2026-09-30-1750-test-user-story-run-plan.md`.
Surfaces: PROD (`https://legalpracticum.org`, release `daea1e1`), DEV (`https://sonsteng-dev.damienriehl.com`), and a local build of the fix branch.

## Automated leg

`tools/verify_persona_journeys.js` against both public environments (run files are local build output under `build/uat/runs/`):

| Environment | Result |
| --- | --- |
| PROD | 44/44 journeys acceptable (the ten `*-deliberate-canary` rows fail by design) |
| DEV | 44/44 journeys acceptable |

Access-gated editor and Publisher journeys keep their live signed-in leg NOT RUN (no service token impersonates a signer). `edit.legalpracticum.org` answered with the Cloudflare Access login redirect, as designed.
The live-provider interview turn is NOT RUN: it needs a provider key, and automation cannot pass the managed Turnstile challenge on production.

## Judged walk

Chrome DevTools at 1440x900 and 390x844 (mobile emulation). Paths: pitch, platform home, matter library and filters, a matter packet, client interview (keyless and bring-your-own-key states), critique, skills browser, firm dashboard, hours log, templates.

Severity: P0 blocks a common path or leaks data; P1 misleads or strands a user on a common path; P2 is friction or an accessibility miss; P3 is polish.

| ID | Sev | Surface | Finding | Disposition |
| --- | --- | --- | --- | --- |
| F1 | P2 | Pitch | No doctype, so the pitch rendered in Quirks Mode | Fixed; verifier now rejects a missing doctype |
| F2 | P3 | Pitch | The lede repeats the headline ("Training the next generation of lawyers ...") | OPEN: copy adopted on 2026-08-17 (`d57da25`); a wording change belongs to the authors |
| F3 | P2 | Pitch | The eight reaction note fields had only a placeholder, no accessible name | Fixed |
| F4 | P2 | Pitch | Reaction choices showed the selection by color only | Fixed: `aria-pressed` and labelled groups |
| F5 | P2 | Matter library | Filter labels were detached from their controls at desktop width | Fixed |
| F6 | P2 | Interview | Header read "SONSTENG · CONSULTATION"; the rest of the site is Legal Practicum | Fixed; the brand links home |
| F7 | P2 | Interview, critique | No way back to the matter packet or home | Fixed; the packet link accepts only a strict relative matter path |
| F8 | P1 | Interview | When Cloudflare escalated to an interactive check, the page failed open after 8 s, said "reload", hid the checkbox from assistive technology, and never reconnected after the user passed | Fixed: one notice pointing at the check, no premature failure, automatic reconnect, SEND reconnects first |
| F9 | P3 | Bring your own key | An obviously malformed key saved with no warning | Fixed: non-blocking format warning; the key is never echoed |
| F10 | P2 | Hours log | Page ignored the platform theme, header, breadcrumb and Large Type toggle | Fixed |
| F11 | P2 | Firm dashboard | "$627K" broke onto two lines in its KPI card | Fixed |
| F12 | P2 | Skills browser | Internal dataset notes (repo paths, field names) printed in the page intro | Fixed: moved into a closed "About this data" section |
| F13 | P2 | Matter page, phone | Long skill chips were clipped mid-word | Fixed |
| F14 | P3 | Critique | The empty-submit notice appeared below the fold, so the button seemed to do nothing | Fixed: notice scrolls into view, focus returns to the field |
| F15 | P3 | Platform, phone | The header stack uses about 40% of the first screen | OPEN: layout redesign, out of scope for a bounded fix |
| F16 | P3 | Templates | "how it's assessment and feedback" reads as a typo | OPEN: spine content, routed to the editor lane |
| F17 | P3 | Pitch, phone | The Comments button crowds "Expand all sections" | OPEN: minor |
| F18 | P2 | Hours log | Cramped vertical rhythm: buttons touching inputs and the next heading; card heading at display size | Fixed |
| F19 | P3 | Hours log | An untouched week showed "3 issue(s) must be corrected" in error styling | Fixed: issues appear after the first edit or an export attempt |
| F20 | P3 | Adopter path | The Worker test suite hangs in the adopter journey: a browser test added on 2026-09-27 cannot launch Chrome in the stripped environment and keeps the process alive after its timeout | OPEN: `docs/plans/2026-09-30-2000-fix-review-p2-followups-plan.md` (R5) |

## Adopter path (README quickstart)

`tools/verify_persona_journeys.js --bindings` against the pushed branch commit, local leg:

| Journey | Result |
| --- | --- |
| adopter-clone-serve | PASS |
| adopter-byok-boundary | PASS |
| adopter-worker-dry-run | PASS |
| adopter-validate-build | PASS |
| adopter-worker-tests | FAIL: hangs (F20); pre-existing on `main` since 2026-09-27 |

## Verification of fixes

- Full `tools/preflight.sh` with browser legs on the fix branch: 22/22 gates pass (includes the accessibility audit, platform layout matrix, interview and critique matrix, weekly-hours client, and the local persona-journey leg).
- `tools/tests/verify_generated_page_fixes.js` (new): F5, F10, F11, F13 at 1440, 1024 and 390 px, standard and Large Type: pass.
- `tools/tests/chat_connection.test.js` (new): six F8 connection scenarios pass.
- Judged re-walk of the local build: F1, F5-F8, F10-F13, F18, F19 confirmed by screenshot. Standards mode lengthens the pitch by about 9 px per section, with no visible defect.

## What reaches PROD, and when

DEV and PROD serve the same content build. PROD is released only through the Publisher lane (`docs/prod-release-operations.md`), so these fixes reach `legalpracticum.org` with the next Publisher-authorized release; until then F8 remains live on PROD. Code review of the fix branch (verdict: Ready with fixes, no P0/P1) found two P2 defects in the new code (a queued SEND dropped in one late-token ordering; the critique back link never receives its packet parameter). They are specified in `docs/plans/2026-09-30-2000-fix-review-p2-followups-plan.md` and wait for the Codex worker fleet, which was unavailable that evening. The fixes are on `main` and, for the Worker-independent static pages, deployable to DEV with `deploy/deploy-dev.sh`.
