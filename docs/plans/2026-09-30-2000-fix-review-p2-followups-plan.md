---
title: Code-review P2 follow-ups from the 2026-09-30 user-story run - Plan
type: fix
date: 2026-09-30
topic: review-p2-followups-2026-09-30
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Code-review P2 follow-ups from the 2026-09-30 user-story run - Plan

## Goal Capsule

**Objective.** Close the two confirmed P2 findings and two hardening items from the ce-code-review of PR #87 (verdict: Ready with fixes, no P0/P1).

**Why deferred.** PR #87 merged on its review verdict. These fixes were specified the same evening, but the Codex worker fleet was unavailable (OpenAI partial degradation; the Codex CLI hung even on a trivial prompt for more than 30 minutes). The worker policy keeps implementation with Codex workers, so the work waits for the fleet.

## Product Contract

### Requirements

- R1. (#1, P2, validator-confirmed) In `app/chat/chat.js` (around `submit()` and the Turnstile token callback), a SEND pressed while a tokenless session mint is in flight is never sent if a Turnstile token then arrives and the tokenless mint fails, even though the late-token recovery mint succeeds. The queued submission must be sent exactly once after recovery, keeping single-flight minting and the IDLE / unchanged-draft guards.
- R2. (#2, P2, validator-confirmed) `critique_href()` in `tools/build_site.py` emits only `matter` and `title`, so the critique page's validated "Back to the matter" link always falls back to the library. Emit the `packet` parameter the way `chat_href()` does.
- R3. (hardening) The session-mint request has no deadline. Since minting is single-flight, a stalled `/v1/session` response blocks recovery and every SEND retry. Add an abortable deadline to the mint request only (not to streaming chat turns). Clear the in-flight mint on every terminal path and show the existing retryable connection notice.
- R4. (testing gap) No routine gate runs `tools/tests/*.test.js` (`chat_connection.test.js`, `hours_validation.test.js`). Add a headless `tools/preflight.sh` gate that runs `node --test tools/tests/*.test.js`, including in `--no-browser` mode.

- R5. (UAT F20, P3) `app/worker/test/assessment-review-browser.test.js` (added 2026-09-27) hangs the whole `node --test test/*.test.js` run in the adopter journey (`tools/uat_adopter_journey.sh worker-tests`). That journey strips the environment to `HOME` and `PATH`, Chrome never finishes launching, and the test's 90 s timeout fires but its HTTP server and browser keep the process alive. The fix: the test must always close its server and browser, so a launch that never completes cannot hang the suite. Bound the launch itself, or skip with a stated reason when the browser cannot start. The adopter journey must then pass.

## Implementation Units

- U1. R1, with a regression in `tools/tests/chat_connection.test.js`: queue SEND, deliver the token during the pending tokenless mint, fail the first mint, succeed the recovery mint, and assert one send and two mints.
- U2. R2, plus a Python test that every generated critique link carries a packet parameter matching `^\.\./matters/[a-z0-9-]+/$`. Regenerate with `python3 tools/build_site.py --check`, then restore `site/platform/data/.build-stamp.json`.
- U3. R3, plus a Node test for the timeout path: no duplicate concurrent mints, and recovery after the timeout.
- U4. R4.
- U5. R5; verify with `node tools/verify_persona_journeys.js --bindings --only adopter-worker-tests --env-label local` against a pushed commit.

## Verification Contract

`node --test tools/tests/*.test.js`; `bash tools/preflight.sh` (full, with browser legs) passes all gates; re-walk the interview and critique pages locally (back link reaches the matter; queued SEND sends once).

## Definition of Done

Merged on `main`; DEV static site redeployed with `deploy/deploy-dev.sh`; PROD arrives with the next Publisher-authorized release.
