---
artifact_contract: "ce-handoff/v1"
created_at: "2026-10-01T01:30:00Z"
title: "User-story run shipped (PR #87); review P2 follow-ups wait for the Codex fleet"
summary: "Hygiene and a full user-story run landed on main and DEV. Two code-review P2s, two hardening items and one adopter-path hang are specified in a follow-up plan that was not executed because Codex was down."
keywords: ["uat", "turnstile", "review-followups", "cockpit-repo-json", "adopter-path"]
repository: "legal-practicum"
branch: "main"
head: "8b600b6ae0fbb5e98124d8e750f88eb8c321f4db"
---

# User-story run shipped (PR #87); review P2 follow-ups wait for the Codex fleet

## Where things stand

- **Merged:** PR #87 (hygiene, `.cockpit-repo.json`, 15 UAT fixes, run record). `main` = `8b600b6`, mirrored to the twin.
- **DEV:** static site redeployed from `main`; persona harness 44/44 on DEV after the deploy. The DEV Worker needed no deploy (no `app/worker/` change).
- **PROD:** unchanged at the Packet D pair. It advances only through the Publisher lane (Packet C), so F8 (interview verification, P1) stays live on PROD until the next authorized release.
- **Declaration:** `.cockpit-repo.json` `uat` is `in_progress` with the open items listed there.

## Next session: do this first

1. Check Codex works (`codex exec` with a trivial prompt answers).
2. Execute `docs/plans/2026-09-30-2000-fix-review-p2-followups-plan.md` (R1-R5) with Codex workers. Dispatch them **one at a time or via `agents/worker-wrapper.sh`**, not several `codex-run.sh` calls at once (see the gotcha below).
3. Full `bash tools/preflight.sh`, re-run `adopter-worker-tests`, merge, redeploy DEV, then update `uat.open_failures` (and set `status: done` once only the PROD-release item and the P3 copy/design notes remain, or keep `in_progress`, whichever matches the record).

## Gotchas learned this session

- `codex-run.sh` is not safe for concurrent dispatch: parallel invocations share temp files and each wrapper adopts the newest job id, so three wrappers watched one job. Dispatch through the companion directly and track job ids per dispatch.
- Read-only Codex reviewers cannot write their artifact files; collect their compact returns with the companion `result` command.
- The adopter journeys clone the public repo at the current commit; they fail until the branch is pushed.
- `adopter-worker-tests` hangs (F20) in a browser test added on 2026-09-27; kill the hung `node --test` process tree, since the harness retries it.

## Retire when

The follow-up plan is merged and verified, and its learnings (if any) land in `docs/solutions/`.
