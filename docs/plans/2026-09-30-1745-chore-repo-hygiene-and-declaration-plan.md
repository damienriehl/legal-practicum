---
title: Repository hygiene, deploy-state check, and cockpit declaration - Plan
type: chore
date: 2026-09-30
topic: repo-hygiene-2026-09-30
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Repository hygiene, deploy-state check, and cockpit declaration - Plan

## Goal Capsule

**Objective.** Leave the repository with nothing unpushed, unmerged, or dirty; with DEV and PROD state measured and recorded; and with a committed, public-safe `.cockpit-repo.json` so the Cockpit can grade PROD and UAT instead of reporting `missing`.

**Means.** Measure first, change only what the measurements show. Commit per unit on a branch, mirror per-unit commits to the private twin, open one PR, review, merge.

**Open blockers.** None. PROD advancement is governed by the Publisher lane (Packet C) and is recorded, not attempted (see KTD2).

## Product Contract

### State measured at session start (2026-09-30, 22:30 UTC)

- `main` = `origin/main` = twin mirror `refs/replica/home/main` = `af745f5`. No open PRs, no open issues, no stashes, no unmerged branches.
- Main checkout (detached at `af745f5`) holds three untracked items: `.claude/` (machine-local settings, a private resume note, an empty worktrees dir), `.codex/hooks.json` (Cockpit hook wiring with machine-local paths), and `docs/handoffs/2026-09-18-codex-pickup.md` (a "nothing to do here" pickup note superseded by the 2026-09-28 handoff and PRs #80-#86).
- DEV site (`sonsteng-dev.damienriehl.com`) and PROD site (`legalpracticum.org`) both serve spine build `82e13f14`, equal to `main`.
- DEV Worker `x-release-sha` = `de9d49c`. Every later commit on `main` touches only `tools/` and `docs/`, so DEV runs current Worker code.
- PROD Pages and PROD Worker `x-release-sha` = `daea1e1` (the 2026-09-27 Packet D window). `main` is 44 commits ahead; the drift is engineering code (Worker ledger/no-op receipt endpoints, BYOK copy, API contract doc), with no `data/` change.
- `.cockpit-repo.json` does not exist, so Cockpit grades `shipped` and `uat` as `missing`.
- Known red tests: 3 in `tools/tests/test_prove_queues_empty.py` pin uutils coreutils 0.8.0 output; the host has 0.10.0 (recorded in the 2026-09-28 handoff).

### Requirements

- R1. The main checkout reports a clean `git status`, without deleting anything that lacks a verified backup.
- R2. Machine-local agent files (`.claude/settings.local.json`, `.claude/RESUME.md`, `.claude/worktrees/`, `.codex/`) are ignored so they never reappear as dirt or get committed.
- R3. `.cockpit-repo.json` exists at the repo root, validates against `cockpit/docs/repo-facts.md`, carries no credentials or private hosts, and is force-added (root JSON is ignored).
- R4. The host-version-pinned tests pass on any uutils coreutils version while still asserting the behavior they protect.
- R5. Work lands on `main` through a reviewed PR; per-unit commits are mirrored to the twin before the public push.
- R6. DEV and PROD deploy state is re-measured after merge and recorded in the receipt.

### Scope

In: `.gitignore`, `.cockpit-repo.json`, `tools/tests/test_prove_queues_empty.py` (and `tools/prove_queues_empty.py` only if the test exposes a real parsing defect), this plan, a receipt.
Out: Packets B and E (Damien's), Packet C Publisher review, retirement of older handoffs (their tasks were not re-audited this session), the sibling launcher worktree `cockpit/sonsteng-magnum-opus/20260930-start` (clean, no unique commits; owned by the launcher).

## Planning Contract

### Key Technical Decisions

- KTD1. **Retire the stale pickup note by backup-then-remove.** Copy it to `~/.local/state/ce-handoffs/sonsteng-magnum-opus/` (mode 600), verify the byte-identical copy, then remove it from the checkout. It has no tracked history, so the private copy is its backup. Decision Bar: a backed-up delete is released to best practice.
- KTD2. **No PROD deploy this session.** PROD is released through the Publisher ledger (`docs/prod-release-operations.md`); its frontier is the Packet D pair at `daea1e1`. A direct deploy of `main` would move PROD off the ledger's verified base and could turn Packet C readiness red. `docs/day-zero-migration-operations.md` (OQ-12) already records that the pre-user direct lane cannot be proven still valid. The drift carries no content change and no user-facing defect, so waiting costs nothing. Two engineers following this repository's release design reach the same answer; receipt, not a question.
- KTD3. **No DEV deploy unless merged work touches `app/worker/` or `site/`.** DEV already runs current code.
- KTD4. **Declaration shape.** `kind: app`; `prod.url: https://legalpracticum.org/`; no `version_url` (the provenance SHA is a response header, and the checker reads bodies); `deploy` names the Publisher-authorized lane; `dev.url` records the DEV site; `uat` is written by the user-story plan (`docs/plans/2026-09-30-1750-test-user-story-run-plan.md`), seeded `in_progress` until that run finishes.
- KTD5. **Test fix goes to a Codex worker** per `worker_route: codex`; the orchestrator verifies.

## Implementation Units

- U1. **Ignore machine-local agent files.** Add the four paths to `.gitignore` under a commented heading. Verify `git status --short` in the main checkout no longer lists `.claude/` or `.codex/`.
- U2. **Retire the pickup note** per KTD1. Verify: `cmp` of backup vs original before removal; main checkout status clean afterwards.
- U3. **Seed `.cockpit-repo.json`** per KTD4; `git add -f`. Verify with `python3 tools/cockpit_repo_facts.py --repo <worktree> --state-file <scratch>` from the cockpit repo; expect PROD `reachable`, UAT `declared`.
- U4. **Make the coreutils-pinned tests version-tolerant** (Codex worker). Assert the semantic result (queue emptiness proof) rather than a version-specific string, or skip with a stated reason only where the output genuinely differs by design. Verify: `python3 -m pytest tools/tests/test_prove_queues_empty.py -q` green on this host.
- U5. **Ship.** Push per-unit commits to the twin mirror; open PR; `ce-code-review`; merge; fast-forward the daemon checkout under its lock (`.locks/daemon.lock`); re-measure DEV/PROD provenance (R6).

## Verification Contract

- `bash tools/preflight.sh --no-browser` after running the generators (`build_site.py --check`, `build_instructor_bundle.py`, `bundle-editor-data.mjs`): all gates pass, including the three previously red tests.
- Main checkout `git status --short` prints nothing.
- Cockpit checker grades the declaration without parse errors.

## Definition of Done

- Merged PR on `main`, twin mirror equal to `origin/main`, no open PRs, clean trees.
- Receipt in the session outcome listing: backup path of the retired note (private only), DEV/PROD SHAs after merge, and the KTD2 no-PROD rationale.
