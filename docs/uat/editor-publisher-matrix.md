# Real-browser Editor and Publisher UAT matrix

All browser checks run headless or on an isolated display. They never fall back to a foreground
browser. Before backfill, record the editing Worker's prior version, prove old-version reads of the
migrated store, activate/read back the old and new versions, and smoke the Publisher/status API while
the release executor remains config-off. A failed rollback proof blocks backfill.

Run this matrix on the real box with trusted browser exit codes. Use disposable, non-sensitive
wording. Record release IDs, hashes, timestamps, and screenshots only; never tokens or edited
content in operational logs. Repository tests and a mocked browser are preparation, not a pass.

## John-like editing journey

For each row, sign in through a clean Chrome/Edge profile as John, open the real Edit door, change
one harmless value, save, observe its truthful status, and verify DEV. Then restore the wording
through the normal audited workflow.

| Leaf / canary | Expected Edit behavior | Locked neighbor canary |
|---|---|---|
| skill name | Edit is available; saved plain text reaches DEV | skill ID / `@id` offers no Edit |
| alternate name | Edit is available when present | canonical crosswalk IRI offers no Edit |
| task name and description | Each authored scalar edits independently | task ID, module, category, Bloom value stay locked |
| subtask name | The authored name is its own edit leaf | subtask ID stays locked |
| subtask description | The authored description is its own edit leaf | survey/crosswalk structure stays locked |
| taxonomy introduction / note | Human-authored page wording edits normally | generated counts and structural labels stay locked |

Positive canary: a valid wording edit must save. Negative canary: a forged request against one
locked ID must fail, proving the absence check can catch a bypass. Paste hostile-looking plain text
(`<script>`, quotes, bidi controls, and markup punctuation) into a disposable leaf and confirm it is
either rejected by normalization or displayed inertly on every preview/history surface.

After DEV apply, both John and the review surface must say **Available on DEV — waiting for Publisher**
(or an equivalently explicit two-stage explanation). Confirm the anonymous public page
is unchanged. A save, Approver decision, page reload, timer tick, and preview preparation must each
leave PROD unchanged.

Repeat the core save/status journey at phone width, 200% zoom/large type, keyboard-only, and with a
screen-reader semantics inspection. Confirm focus returns after cancel/error and status changes are
announced without color dependence.

## Damien Publisher journey

1. Sign in through Access with human Publisher scope and open **Production Publisher** from review.
2. Confirm each cumulative per-source change renders as atomic semantic redlines: red struck
   deletion, blue underlined addition, and only conservatively detected green moved-from/moved-to.
   With color disabled, textual labels must retain the same meaning. Decide siblings Accept,
   Reject, Ask question, and unanswered; a question requires text and holds only itself.
3. Reload before submission and confirm actor-bound drafts survive. Cause one autosave failure,
   verify Submit remains blocked and Retry is explicit, then recover. Submit once and confirm the
   attributed immutable receipt records every answered decision without inferring unanswered as
   accepted. The browser must never possess or call the trusted preparation bearer.
4. Review the immutable prepared preview: every accepted operation/group, held exclusion,
   review receipt, attribution, count, target,
   base/candidate SHA, manifest/evidence/membership hashes, and active-lane state.
5. Confirm Approver-only, Admin-only, Editor, AI, cookie, and service-bearer identities cannot perform
   the human authorization action. Confirm replay of the identical request is idempotent and a stale
   or mutated binding fails closed.
6. Use the single explicit checkbox/button gesture to authorize the exact candidate. Confirm a later DEV
   edit is not added to it.
7. Under supervision, enable and run the executor only after the operations checklist passes. Verify
   its phase journal and provider receipts contain identifiers/hashes, not edited text or secrets.
8. Verify the **anonymous public** Pages copy and the **authenticated editor map** report the same
   candidate provenance before the release is called Published.
9. Exercise one partial-failure/restart canary and one recorded-pair restoration drill. Later releases
   must remain fenced until both targets match the recorded SHA.

Positive leak canary: put distinctive disposable text in an accepted operation and different
distinctive text in rejected, questioned, and unanswered siblings. PROD must contain the accepted
canary and none of the three held canaries. Then make a later same-source DEV edit and prove the
draft/submitted decision and unexecuted preview become stale rather than silently retargeting.

Run desktop, 480px, keyboard-only, color-disabled, punctuation-only, exact-move, ambiguous-move,
question-validation, stale-review, and failed-release recovery journeys in background/headless
Chrome. `HEADFUL=1` is human opt-in only; browser UAT must not take desktop focus by default.

## Evidence record

Record browser/version, viewport, Access actor, DEV apply batch IDs, prepared/authorized release ID,
base/candidate SHA, manifest hash, Pages deployment ID digest, Worker version ID digest, live
provenance results, restoration result, and clean-git proof. Mark every skipped live step **NOT RUN**,
never pass. Any new product choice goes to a new Decision Sheet; implementation defects belong in
code/tests and are fixed without re-asking Damien.

## Evidence record — 2026-08-17 background pass

This record covers the autonomous, non-credentialed preparation leg only. It does not claim that a
human Publisher reviewed or authorized a candidate, that production changed, or that the recovery
drill ran.

| Field | Evidence |
|---|---|
| Observed at | `2026-08-17T15:33:29-05:00` |
| Browser | Chromium `151.0.7922.108` (snap), headless |
| Editor viewports | Desktop; Large Type / 200%; mobile `390x844` |
| Publisher harness viewport | Puppeteer default `800x600`; keyboard submission path included |
| Editor browser matrix | `89/89 PASS` via `EDITOR_HEADLESS=1 HEADLESS=1 node app/editor/verify-editor.js` |
| Publisher browser contract | `PUBLISHER CLIENT PASS` via `node tools/verify_publisher_client.mjs` |
| Publisher Worker contracts | `editor-publisher-ui`, `editor-publisher-review`, and `editor-publisher-release`: `3/3 PASS` |
| Screenshot digest — desktop | `sha256:d6ec99d57e1df04bf359279c6ce16edab174bedc09c8fa6856936eb65056e826` |
| Screenshot digest — Large Type | `sha256:d6ec99d57e1df04bf359279c6ce16edab174bedc09c8fa6856936eb65056e826` |
| Screenshot digest — mobile | `sha256:aba7946f10ee772463ba0a57f3e000ac3a0c7e4f2be78e340fc43e743f295033` |
| Screenshot retention | Disposable local files removed after digest capture; no edited content retained |
| Clean-git proof | canonical `main` clean at `0a193f6bbbefb4045b4b50551c1c7de7acae78e6` |
| Access actor | **NOT RUN** — requires Damien's authenticated Publisher session |
| DEV apply batch IDs | **NOT RUN** — no live edit was made in this background pass |
| Prepared release ID | **NOT RUN** |
| Authorized release ID | **NOT RUN** |
| Base/candidate SHA | **NOT RUN** |
| Manifest/evidence/membership hashes | **NOT RUN** |
| Pages deployment ID digest | **NOT RUN** |
| Worker version ID digest | **NOT RUN** |
| Live provenance result | **NOT RUN** |
| Exact-pair restoration result | **NOT RUN** |

The next step is the human leg: Damien reviews the one reconciled backfilled revision, submits the
decision, and authorizes the resulting immutable candidate. The supervised process-scoped canary
and exact-pair recovery drill remain required afterward; production stays config-off until both are
recorded.

## Evidence record — 2026-08-21 post-merge autonomous recheck

This record rechecks the merged implementation and DEV deployment. It does not upgrade any human or
production field from **NOT RUN**.

| Field | Evidence |
|---|---|
| Observed at | `2026-08-21T12:17:13-05:00` |
| Merged source exercised | `d18b657ba010cf800f1cd5faafad50d20bc5ed04` |
| DEV Worker version | `5ae43990-84b2-4772-9cde-73bde49246f7` |
| DEV generated build ID | `25fe75a7b465b205` |
| Editor browser matrix | `89/89 PASS` via `EDITOR_HEADLESS=1 HEADLESS=1 node app/editor/verify-editor.js` |
| Editor viewports | Desktop; Large Type / 200%; mobile `390x844` |
| Publisher browser contract | `PUBLISHER CLIENT PASS` via `node tools/verify_publisher_client.mjs` |
| Screenshot digest — desktop | `sha256:45a1135861b9cc05acfc0853479c234e831a49a2df285d0840a328742a0bb8ec` |
| Screenshot digest — Large Type | `sha256:45a1135861b9cc05acfc0853479c234e831a49a2df285d0840a328742a0bb8ec` |
| Screenshot digest — mobile | `sha256:772a507136ba2f8724f55e57349f7d82d920daedbba9ceeb14edee9c94edf52b` |
| Screenshot retention | Disposable local files moved to Trash after digest capture; no edited content retained in Git |
| Access door | Unauthenticated request redirects to Cloudflare Access |
| Access actor | **NOT RUN** — authenticated Damien session still required |
| Live edit and DEV apply batch IDs | **NOT RUN** — no live authored edit was made |
| Prepared / authorized release ID | **NOT RUN** |
| Production provider IDs and provenance | **NOT RUN** |
| Production canary and exact-pair restoration | **NOT RUN** |

Production remains configuration-off. The new repository-only streaming smoke, Day Zero migration
rehearsal, and legacy-environment migrator are preparation evidence only; they do not substitute for
the credentialed or supervised rows above.

## Evidence record — 2026-08-23 domain cutover

This record covers the autonomous U10 infrastructure leg. It does not claim the
human-authenticated edit that still requires an allowlisted identity session.

| Field | Evidence |
|---|---|
| Public property | `https://legalpracticum.org/platform/` returned HTTP 200 from Cloudflare Pages |
| DEV Worker version | `cc86efd2-636d-4823-be8e-a07810487bbf` |
| New Access door | Unauthenticated `/edit/v1/status` returned 302 to the Access team login |
| Access policy parity | Same IdP, one allow policy, three email selectors, `730h` session |
| Old Access application | Retired; API returns unknown application |
| Legacy editor host | HTTP 308 to `edit.legalpracticum.org`, path and query preserved |
| Public aliases | `www.legalpracticum.org` and `sonsteng.damienriehl.com` return path/query-preserving HTTP 308s to the apex |
| Production release config | Provenance URL points to `legalpracticum.org`; release remains config-off |
| Repository verification | Full preflight: 21 passed, 0 failed, 0 skipped |
| Access actor | **NOT RUN** — requires an allowlisted human identity session |
| Authenticated suggestion round-trip | **NOT RUN** — queued in the domain-cutover human gate sheet |

## Evidence record — 2026-08-23 live provider validation

This record covers credential-safe DEV provider checks. Credentials were read only from protected
machine state and were never printed, committed, or included in reports. The live Worker remained
DEV-only; production publication remained configuration-off.

| Provider / field | Evidence |
|---|---|
| Merged repair | PR #24, merge commit `f8d8dd47f29ec397e548fa375ee0f4ca5659d957` |
| DEV Worker version | `c4d21de6-ea7d-454f-905a-d0203d800af0` |
| Google | **PASS** with `gemini-2.5-flash`: normalized streaming, two delta events, one terminal event, non-empty output, normalized usage, and byte-identical replay |
| Google usage observed | 4,894 input tokens; 49 output tokens; zero cache-read input tokens |
| Google maintenance finding | The former `gemini-2.0-flash` default is retired upstream. The Worker default, allowlist, tests, Wrangler environments, and published API contract now agree on `gemini-2.5-flash`. |
| OpenAI credential | **VALID** — the provider model-list endpoint returned HTTP 200 |
| OpenAI generation | **BLOCKED EXTERNAL** — the provider returned HTTP 429 `insufficient_quota` / `credit_balance_exhausted`; the Worker correctly mapped the upstream failure to its safe error surface |
| Anthropic | **NOT RUN** — no currently authorized active credential was available. Legacy credential-shaped files were not read or tested without explicit authority. |
| Repository verification | Full preflight: 21 passed, 0 failed, 0 skipped; Python: 804 passed and 21,681 subtests; Worker: 44 test files passed; editor: 89/89; accessibility: zero failures; layout: 284/284; chat/critique: 28/28; cost: 13/13 |

Google's U19 live-provider row is complete. OpenAI needs account credit, not a code change. Anthropic
needs a current credential or an explicit, narrowly scoped authorization to test a discovered legacy
credential without exposing it. The authenticated assessment exercise remains separate human UAT.

## Evidence record — 2026-09-27 Packet D / U15 / U16b

Packet D executed once under the supervised migration procedure in
`docs/day-zero-migration-operations.md`. This records the completed migration and restoration drill;
the earlier dated browser and human Publisher rows retain their original scope.

| Field | Evidence |
|---|---|
| Window | `packet-d-2026-09-27.w6`, 2026-09-27 15:46:55–19:19:54 UTC; **COMPLETED** |
| Reviewed release | `c317eb345360127661485e6d96faa06bdddc6071` (standalone operations clone, unmoved by CAS); verifier blob `bfc4dd5d1913381cbc4419a70b8723eebc9581f1` |
| Pre-window authenticated CAS dry run | **PASS**: `remote_push_auth_probe: "passed"`, mutations `[]`, readbacks `c317eb3` |
| Step 1a (DEV to PRIOR_SHA) | **PASS**: DEV Worker `c8dc8485-56de-42ae-80e6-466c65ed8962` names `c317eb3` (from `55b11188-e526-444a-abac-715add75ef7d`); observer GET 200, unblocked |
| Opening queue proof | **PASS**: launcher rc 0, validator rc 0, verifier `c317eb3`/`bfc4dd5d`, phase `opening`, reason `unprepared`, frontier `{0, unblocked}` |
| Prior pair | SHA `0159c1115e28df58b0511ba5fbbadd4f1435b4d2`, Pages `c97f0e28-1524-48b7-abd7-c1429923a7ba`, Worker `9830359d-1081-45ee-a921-06b11a233bbc` |
| Phase 1 / Phase 2 | **PASS** (6 phases) / **PASS** (8 phases, verify-only); `production_mutations: 0` both |
| Candidate | `daea1e165f1ab56d3eeac22de3bb08ceab572726`, one commit on `c317eb3`: 345 entries (325 modified, 20 sidecars), 187 files rewritten, 1236 dates, 368 identifier replacements |
| OQ-8 checks 1–2 | **PASS**: 73 == 73 editor page keys against both prior SHAs; personas 59 / fact_map 59 / rubrics 20 identical |
| CAS forward | dry run under fence **PASS**; live (Damien, 19:08:52 UTC) **PASS**: `succeeded`, mutations `local-main-cas, worktree-alignment, remote-main-cas, remote-tracking-main-cas`, all readbacks `daea1e1`, push probe passed |
| Step 6 OQ-10 regen | **PASS**: spine `82e13f14…2aa5` in all three generated Worker inputs; tree clean |
| Step 6 production Worker | **PASS**: version `52f259e1-dc1f-4141-ae1d-7212c1d51b40`, `VIEW OK` before deploy; OQ-8 check 3: Worker 204 names `daea1e1` while Pages still 200 `0159c11` |
| Step 6 Pages | **PASS**: header `X-Release-SHA: daea1e1` on attempt 2 of the bounded 60 s retry |
| Step 7 new pair | **PASS**: inspector sha `daea1e1`, Pages `1e41693a-624a-4b7d-9363-c77baf04947d`, Worker `52f259e1-dc1f-4141-ae1d-7212c1d51b40` |
| Step 8 DEV/editor | **PASS on retry** (see deviations): DEV static spine `82e13f14…2aa5`; DEV Worker `ac329f1f-3512-4402-86fe-25ea8476a7ec`, `VIEW OK`, 204 `daea1e1` |
| Step 9 restoration drill | **PASS**: prior pair readback exact (Pages rollback rc 0); back to new pair readback exact |
| Step 10 all-surface proof | **PASS**: canonical `main` (remote, local, HEAD) `daea1e1`; production pair and both headers `daea1e1`; DEV Worker 204 `daea1e1`; DEV static spine matches (compared from the controlled worktree) |
| Closing queue proof | **PASS**: rc 0, validator 0, same verifier identity and window binding, phase `closing`, server dates after opening (19:19:43 vs 15:49:08 GMT), `{0, unblocked}` |
| Timers after close | apply active/enabled, editorial active/enabled, digest active/enabled, prod-release inactive/disabled (prior policy); first apply tick no-op |
| U16b | **PASS**: `validate_spine --strict --enforce-day-zero-offsets --enforce-legal-practicum-identifiers` rc 0; checked dates 1236, offset dates 1236, identifier files 522, base values 368, old-base occurrences **0**; 0 ERROR, 7 WARN |
| Ledger / release backfill | `ledger-backfill-20260925`: Damien-approved append-only backfill of 11 legacy DEV apply batches, each an ancestor of `0159c11`; recorded once before attempt 2, never re-run; history reverts remain on hold |
| Prepared release ID | No Publisher candidate prepared in this window; both queue proofs reported reason `unprepared`, 0 batches. `ledger-backfill-20260925` is the ledger backfill ID, not a prepared candidate. |
| Authorized release ID | No Publisher authorization ID reported for this manual migration; Damien supervised Packet D and performed live CAS forward at 19:08:52 UTC. |
| Step 8 deviation | Inherited `umask 077` staged 0600/0700 modes carried by rsync; DEV returned 403/404 for about 3 minutes (19:13:45–19:16:30 UTC). Static proof failed closed after 70 s before DEV Worker change. Retry under `umask 022` passed; production unaffected. |
| Other deviations | Pages propagation required retry 2 within 60 s; carried forward bounded provenance retries, Pages rollback fallback (not needed), step 1a.3 before 1a.2, editorial timer stopped with apply, and successful push-auth probe required in CAS receipt; Wrangler 4.142.0 |

### Packet D attempts 1–6

| Attempt | Window | Stop point | Cause | Result |
|---|---|---|---|---|
| 1 | `packet-d-2026-09-25.w1` | step 2 opening queue proof | `frontier-response-malformed`: 11 legacy DEV apply batches (10 with null `generator_id`) still listed pending | Prior state proved; led to the ledger backfill decision |
| — | pre-window, 2026-09-25/26 | ledger backfill | Damien-approved append-only backfill `ledger-backfill-20260925`, 11 batches | Recorded once; frontier 0 batches, base `0159c11`; never re-run |
| 2 | `packet-d-2026-09-26.w2` | step 4 Phase 1 rehearsal | `rehearsal phase failed: preflight` at `42c2c53` | Prior state proved; fixed in tooling |
| 3 | `packet-d-2026-09-26.w3` | pre-window (not opened) | readonly launcher pinned the daemon checkout, so the closing proof could not pass after a CAS forward | Not opened; PR #69 (standalone ops clone) |
| 4 | `packet-d-2026-09-26.w4` | live CAS forward | push unauthenticated; `incomplete`, remote unchanged | Local bookkeeping inverted to prior; prior state proved; PR #70 (push-auth probe) |
| 5 | `packet-d-2026-09-26.w5` | before live CAS forward | operator agent execution policy refused the live forward command | No mutation beyond DEV step 1a; prior state proved |
| 6 | `packet-d-2026-09-27.w6` | — | Damien ran the live forward; operator ran the rest | **COMPLETED**: candidate `daea1e1` on `main`, production, DEV, and editor |

## Evidence record — 2026-09-27 Packet A completed

Damien completed Packet A. These human results close the U10 authenticated editor
round-trip and assessment signer UAT gates; earlier dated NOT RUN rows remain historical.

| Field | Evidence |
|---|---|
| Human tester / date | Damien / 2026-09-27 |
| A1 — editor round-trip (U10) | **PASS** — “done, looks good”; original wording restored as part of the completed round-trip |
| Editor page / suggestion and restoration batch IDs | Not captured; no IDs inferred |
| A2 — assessment audit | `memo-assessment-55a1292a-b56a-49be-a4b5-6ff0ca01b76d` |
| A2 — desktop, scores, 390px | **PASS** |
| A2 — initial override attempt | **FAIL** — invisible submit button made submission impossible; fixed in PR #76 |
| A2 — override after fix | **PASS** — Damien confirmed the override persisted; override receipt ID not captured |
| Shipped follow-ups | PR #75: memo grader Gemini thinking-budget 502 fix; PR #74: journey click stability; PR #77: in-place per-heading override UX at Damien's request, with Median always derived |
| Automated sweep evidence | `build/codex/packet-a-sweep-report.md` (counts summarized below; predates the human completion and follow-ups) |
| Local preflight | 22 passed, 0 failed, 0 skipped; Python: 2,936 passed, 1 skipped, 21,693 subtests; editor: 89/89 assertions |
| Browser revalidation | Local 44/44; DEV initially 42/44, then affected journeys 12/12 on rerun; read-only production 44/44 |
| Binding revalidation | Local 41/41; DEV 3/3; production 1/1 |
| Accessibility | Local: 0 FAIL, 85 WARN across 23 cases; live: 0 FAIL, 126 WARN across 12 cases |
| Red-team | Offline: 0/8 leaks; live: 9 PASS, 0 FAIL, 5 REVIEW of 14, with all five REVIEW responses judged correct by the sweep agent |
| Post-migration checks | 187/187 files returned 200 on both environments; production 180 byte-identical and 7 edge-only differences; 677/677 date offsets matched, with 642 public and 35 instructor-only literals |

The sweep made no production content changes and did not prepare A2. Its pending
human checklist is superseded by Damien's results above. Other packets and the
separate Publisher release/recovery drills are not closed by this record.
