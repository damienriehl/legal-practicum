# Pre-user production deploy record

Procedure: `docs/pre-user-prod-deploy.md`. Authority: Q1 in
`docs/decisions/2026-09-02-resume-and-uat-decision-sheet.md`. One block per deploy, newest last.

```
Date (UTC): 2026-09-02 16:10–16:20
Candidate SHA: edd940634fb930bbb0a30c74a50b9d9df8dec38d (main after PR #32)
Previous Worker version / Pages deployment: 2f49415a-db5f-4a31-9d16-fe5f5015a6bd / 12465c64-8c97-4420-87ae-3b222c9f6eef (source 6837ae9)
New Worker version / Pages deployment: c788b114-f643-479c-989b-a65a7f2119a5 / 3fe768ba (https://3fe768ba.sonsteng.pages.dev)
Worker provenance: 204 + sha
Pages provenance: 200 + sha on / and /platform/
DEV/production parity: SAME except build stamp (/, /platform/, /platform/matters/, /platform/skills/)
Operator: orchestrating agent under Damien's 2026-09-02 authority
```

```
Date (UTC): 2026-09-02 17:55–18:00
Candidate SHA: 0643a54924b3fdd082f74944d131753de0dc4c06 (main after PR #34)
Previous Worker version / Pages deployment: c788b114-f643-479c-989b-a65a7f2119a5 / 3fe768ba
New Worker version / Pages deployment: cb2e029d-5e75-4cfe-83f7-62687581ee98 / dbff9a7b (https://dbff9a7b.sonsteng.pages.dev)
Worker provenance: 204 + sha (after propagation)
Pages provenance: 200 + sha on / and /platform/
DEV/production parity: DEV redeployed from origin/main by deploy/deploy-dev.sh in the same window
Operator: orchestrating agent under Damien's 2026-09-02 authority
```

```
Date (UTC): 2026-09-02 20:20–20:24
Candidate SHA: 76064635d57260faec19637f297a017fb8d7f2b1 (main after PR #37; carries PR #35 and PR #36)
Previous Worker version / Pages deployment: cb2e029d-5e75-4cfe-83f7-62687581ee98 / dbff9a7b (0643a54)
New Worker version / Pages deployment: 5cc72a1c-0ad1-45e7-af86-b1c763885c86 / 32bb3b9e (https://32bb3b9e.sonsteng.pages.dev)
Worker provenance: 204 + sha
Pages provenance: 200 + sha on /, /platform/, /platform/matters/
DEV/production parity: SAME spine-build 3c6cab1f6a10220c; DEV redeployed from origin/main by deploy/deploy-dev.sh at 20:16
Operator: Damien (ran the orchestrator's runbook script after the agent's production upload was blocked by the session's permission classifier); preconditions verified by the orchestrating agent; full preflight 21/21 on the candidate
Note: wrangler warned that EDIT_ACCESS_* and PUBLIC_* vars are defined at the top level but not under env.production.vars (pre-existing; the editor is served by the default Worker deploy, not production)
```

```
Date (UTC): 2026-09-02 21:33–21:36
Candidate SHA: 49e24f4f301ea509017d2c4dfa3105adfb7e0b2b (main after PR #40; carries PR #38 aria-live counters, PR #39 pitch contrast Remedy A, PR #40 bot-gate sequencing)
Previous Worker version / Pages deployment: 5cc72a1c-0ad1-45e7-af86-b1c763885c86 / 32bb3b9e (7606463)
New Worker version / Pages deployment: 6932fea4-cf7f-48fe-9d94-679eda21eca2 / 37a2f2f0 (https://37a2f2f0.sonsteng.pages.dev)
Worker provenance: 204 + sha
Pages provenance: 200 + sha on /, /platform/, /platform/matters/
DEV/production parity: SAME spine-build 3c6cab1f6a10220c; DEV redeployed from origin/main by deploy/deploy-dev.sh at 21:22
Operator: orchestrating agent under Damien's 2026-09-02 authority (Wrangler permission granted inline at ~21:05Z); preconditions verified: clean worktree at origin/main, full preflight 21/21 on the candidate, production dry-run clean
```

```
Date (UTC): 2026-09-07 13:25–13:27
Candidate SHA: 8601b327e74dd915d1cc5e1008cd7f9791a42a41 (main after PR #55; carries the 2026-09-03 decision cycle: PR #45 revalidation tool, #46 preflight gate 22 + DEV clean URLs, #47 red-team harness and H1 classifier, #48 apply-daemon stale-deploy guard, #49 + #51 debrief truncation and Gemini thinking budget, #52 tests, #53 UAT record, #54 solutions)
Previous Worker version / Pages deployment: 6932fea4-cf7f-48fe-9d94-679eda21eca2 / 37a2f2f0 (49e24f4)
New Worker version / Pages deployment: 5410598b-dbcd-4ed0-88f4-e07cf86fcd05 / 256a9d6d (https://256a9d6d.sonsteng.pages.dev)
Worker provenance: 204 + sha
Pages provenance: 200 + sha on /, /platform/, /platform/matters/
DEV/production parity: SAME spine-build 3c6cab1f6a10220c; DEV Worker at 3fe1050 (2026-09-06) and DEV compose at 6c6ae09 (2026-09-06)
Operator: orchestrating agent under Damien's 2026-09-02 authority, on his inline 2026-09-07 answer to ask sonsteng-magnum-opus-2026-09-07-1315-prod-promotion (J1); preconditions verified: clean worktree at origin/main, full preflight 22/22 with 44/44 persona journeys on the candidate, production dry-run clean
```

```
Date (UTC): 2026-09-19 13:25–13:29
Candidate SHA: 0159c1115e28df58b0511ba5fbbadd4f1435b4d2 (main after PR #61)
Previous Worker version / Pages deployment: 5410598b-dbcd-4ed0-88f4-e07cf86fcd05 / 256a9d6d-f4b7-403a-b821-89c52594d90f (source 8601b327e74dd915d1cc5e1008cd7f9791a42a41)
New Worker version / Pages deployment: 9830359d-1081-45ee-a921-06b11a233bbc / c97f0e28 (https://c97f0e28.sonsteng.pages.dev)
Worker provenance: 204 + candidate SHA; seven smoke checks passed (provenance, normal CSS, inherited asset names returning 404, unauthenticated editor 404, session Turnstile gate 403)
Pages provenance: 200 + candidate SHA on /, /platform/, /platform/matters/, /platform/skills/
DEV/production parity: SAME except permitted spine-build metadata on all four checked pages; no DEV deployment performed
Operator: orchestrating agent under Damien's explicit 2026-09-19 authorization to push to production
Validation: full preflight 22/22; Python 2378 passed, 1 skipped, 21693 subtests; JavaScript 1209 passed; persona journeys 44/44; layout 284/284; interview/critique 28/28; accessibility 0 failures, 85 existing warnings
Release checks: merged tree identical to tested branch; clean isolated checkout at origin/main; fresh site, persona, instructor, editor-map and history artifacts; bundle parity and leak checks passed; production dry run passed; no schema or configuration changes
Review: production-fixes-20260919 complete, ready to merge; one test-comment correction applied before commit; earlier coverage review coverage-20260919 complete
Note: Python urllib's default client received a public-site 403; curl GETs returned 200 and verified all four pages and matching provenance. Wrangler's documented DEV-only variable warnings were unchanged.
```

```
Date (UTC): 2026-09-27 15:46:55–19:19:54 (Packet D Day Zero, packet-d-2026-09-27.w6)
Candidate SHA: daea1e165f1ab56d3eeac22de3bb08ceab572726 (one commit on c317eb345360127661485e6d96faa06bdddc6071)
Previous Worker version / Pages deployment: 9830359d-1081-45ee-a921-06b11a233bbc / c97f0e28-1524-48b7-abd7-c1429923a7ba (source 0159c1115e28df58b0511ba5fbbadd4f1435b4d2)
New Worker version / Pages deployment: 52f259e1-dc1f-4141-ae1d-7212c1d51b40 / 1e41693a-624a-4b7d-9363-c77baf04947d
Worker provenance: 204 + x-release-sha: daea1e1; new version at 100%
Pages provenance: 200 + x-release-sha: daea1e1; matched on attempt 2 of bounded 60 s retry
DEV/production parity: candidate SHA on production, DEV, and editor; DEV static spine 82e13f14…2aa5 matches candidate; DEV Worker ac329f1f-3512-4402-86fe-25ea8476a7ec returned 204 + daea1e1 (previous step-1a version c8dc8485-56de-42ae-80e6-466c65ed8962)
Operator: operator under Damien's supervised Packet D authority; Damien ran live CAS forward at 19:08:52 UTC; operator ran all other steps
Validation: Phase 1 six phases PASS; Phase 2 eight verify-only phases PASS, each with production_mutations: 0; U16b strict enforcement rc 0, 1236/1236 offset dates, 522 identifier files, 368 base values, 0 old-base occurrences, 0 ERROR, 7 WARN
Release checks: opening and closing queue proofs PASS, frontier {0, unblocked}; OQ-8 page keys 73/73 against both prior SHAs, personas 59 / fact_map 59 / rubrics 20 identical; OQ-10 generated Worker inputs agree, tree clean; CAS readbacks and all-surface proof daea1e1; exact prior pair restored and intended new pair reactivated, each with inspector readback
Note: ledger-backfill-20260925 recorded once before attempt 2 for 11 legacy DEV apply batches, all ancestors of 0159c11; not re-run; history reverts remain on hold. Step 8 static deployment retried after restrictive inherited modes caused DEV 403/404 from 19:13:45 to 19:16:30 UTC; retry with umask 022 passed before DEV Worker change; production unaffected. Apply, editorial, and digest timers active/enabled; prod-release inactive/disabled; first apply tick no-op. See docs/uat/editor-publisher-matrix.md for attempt history.
```

```
Date (UTC): 2026-10-05 02:31–02:46
Candidate SHA: ac3d9fbc0c13838db6e982112cbcc25b6e0ac183 (main after PR #101; includes #98 firm exercise, #99 persuasion pitch, #100 literal-link fix, #101 brochure and firms page)
Previous Worker version / Pages deployment: 52f259e1-dc1f-4141-ae1d-7212c1d51b40 / 1e41693a-624a-4b7d-9363-c77baf04947d (source daea1e165f1ab56d3eeac22de3bb08ceab572726)
New Worker version / Pages deployment: c2aac993-92b6-48fb-9903-0ecedbf9da1e / 444c4a5c (https://444c4a5c.sonsteng.pages.dev)
Worker provenance: 204 + candidate SHA (attempt 2 of bounded retry); /v1/session 403 Turnstile gate as expected
Pages provenance: 200 + candidate SHA on /, /platform/, /brochure, /firms, /platform/templates/, /platform/firm/, /cost-per-credit
DEV/production parity: SAME except spine-build metadata on /, /platform/, /brochure, /firms, /platform/templates/ (0 differing lines otherwise)
Operator: orchestrating agent under Damien's explicit 2026-10-04 instruction ("Please push to prod") and the 2026-09-02 pre-user authority
Validation: full preflight 25/25 on a clean isolated checkout at the candidate SHA after fresh site, persona, instructor, history and editor-data generation; production dry run clean with no Access-hostname route
Release checks: tracked tree clean at origin/main after restoring the build stamp; no schema or configuration changes; Publisher release daemon remains config-off and its timer disabled
```
