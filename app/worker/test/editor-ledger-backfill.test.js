// Pre-window release-ledger backfill (Damien, 2026-09-25): production already
// carries these apply batches through the pre-user lane, which never recorded a
// release. The backfill appends one terminal, marked record; it must never edit
// existing evidence rows, never act as Publisher authorization, and never make
// the observer frontier or the queue proof accept malformed batches in general.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeCore } from "./editor-sql-helper.mjs";
import { editorFetch } from "../src/editor.js";
import { resolveOpaqueToken, mintCookieValue, COOKIE_NAME } from "../src/editor-auth.js";

const LIVE = "0159c1115e28df58b0511ba5fbbadd4f1435b4d2";
const sha = (n) => n.toString(16).padStart(40, "0");

// Legacy apply batches predate generator_id: finalize without one leaves it null.
function seedLegacyBatch(core, batchId, id, at, { generatorId = null, commit = sha(at) } = {}) {
  core.now = () => at;
  core.suggest({ id, editor:"slot:john", scope:"edit", origin:"human", kind:"prose",
    source_ref:`data/copy/home.json#${id}`, original_text:"old", original_hash:"hash",
    new_text:"new", map_version:"v1" }, {}, { directApply:true });
  assert.equal(core.claimBatch(batchId, { base_sha:"dev-base", ids:[id] }).ok, true);
  assert.equal(core.finalize(batchId, { phase:"done", applied:[id], commit_sha:commit,
    ...(generatorId ? { generator_id:generatorId } : {}) }).ok, true);
  return { batch_id:batchId, commit_sha:commit };
}

function seedFrontier(core) {
  return [
    seedLegacyBatch(core, "batch-a", "suggestion-a", 1100),
    seedLegacyBatch(core, "batch-b", "suggestion-b", 1200),
    seedLegacyBatch(core, "batch-c", "suggestion-c", 1300, { generatorId:"sha256:" + "3".repeat(64) }),
  ];
}

function backfill(batches, over = {}) {
  return { id:"ledger-backfill-1", idempotency_key:"backfill-idem-1", request_digest:"digest-1",
    actor:"service:release", credential_channel:"bearer", target_environment:"production",
    live_production_sha:LIVE, ancestry_verified:true,
    provenance:{ pages_release_sha:LIVE, worker_release_sha:LIVE }, batches, ...over };
}

function evidenceSnapshot(core) {
  return {
    batches:core._all("SELECT * FROM apply_batches ORDER BY batch_id"),
    suggestions:core._all("SELECT * FROM suggestions ORDER BY id"),
    reviews:core._all("SELECT * FROM production_review_revisions ORDER BY id"),
    operations:core._all("SELECT * FROM production_review_operations ORDER BY operation_id"),
    published:core._all("SELECT * FROM production_published_operations ORDER BY operation_id"),
    members:core._all("SELECT * FROM production_release_members ORDER BY release_id,suggestion_id"),
  };
}

function releaseRows(core) {
  return {
    releases:core._all("SELECT * FROM production_releases ORDER BY id"),
    batches:core._all("SELECT * FROM production_release_batches ORDER BY release_id,ordinal"),
    events:core._all("SELECT * FROM production_release_events ORDER BY id"),
  };
}

test("backfill appends one marked terminal record and empties the frontier", () => {
  const core = makeCore(() => 1000);
  const batches = seedFrontier(core);
  const before = evidenceSnapshot(core);
  assert.equal(core.productionPreparationContext().batches.length, 3);
  core.now = () => 5000;
  const result = core.backfillProductionLedger(backfill(batches));
  assert.equal(result.ok, true, JSON.stringify(result));
  const release = result.release;
  assert.equal(release.state, "complete");
  assert.equal(release.release_kind, "ledger_backfill");
  assert.equal(release.target_batch_id, "batch-c");
  assert.equal(release.base_sha, LIVE);
  assert.equal(release.candidate_sha, LIVE);
  assert.equal(release.authorization_key, null);
  assert.equal(release.authorization_digest, null);
  assert.equal(release.fencing_token, null);
  assert.equal(release.credential_channel, "bearer");
  assert.match(release.evidence_hash, /^[0-9a-f]{64}$/);
  assert.match(release.membership_hash, /^[0-9a-f]{64}$/);
  assert.deepEqual(release.batches.map((b) => [b.batch_id,b.commit_sha]),
    batches.map((b) => [b.batch_id,b.commit_sha]));
  assert.deepEqual(release.suggestion_ids, [], "backfill records batches, never release members");
  assert.deepEqual(release.events.map((e) => e.type), ["ledger_backfilled"]);
  assert.deepEqual(evidenceSnapshot(core), before, "existing evidence rows are untouched");
  const context = core.productionPreparationContext();
  assert.deepEqual(context.batches, []);
  assert.equal(context.active_release, null);
  assert.equal(context.base_sha, LIVE);
  assert.equal(context.blocked_reason, undefined);
  // The DEV apply daemon now reads the recorded production frontier.
  core.now = () => 6000;
  core.suggest({ id:"suggestion-d", editor:"slot:john", scope:"edit", origin:"human", kind:"prose",
    source_ref:"data/copy/home.json#suggestion-d", original_text:"old", original_hash:"hash",
    new_text:"new", map_version:"v1" }, {}, { directApply:true });
  assert.equal(core.claimBatch("batch-d", { base_sha:"dev-base", ids:["suggestion-d"] }).prod_base, LIVE);
});

test("exact replay is idempotent and a changed replay conflicts", () => {
  const core = makeCore(() => 1000);
  const batches = seedFrontier(core);
  core.now = () => 5000;
  const first = core.backfillProductionLedger(backfill(batches));
  assert.equal(first.ok, true);
  const rows = releaseRows(core);
  const again = core.backfillProductionLedger(backfill(batches));
  assert.equal(again.ok, true);
  assert.equal(again.replay, true);
  assert.deepEqual(again.release, first.release);
  assert.deepEqual(core.backfillProductionLedger(backfill(batches, { request_digest:"digest-2" })),
    { ok:false, reason:"idempotency_conflict" });
  assert.deepEqual(core.backfillProductionLedger(backfill(batches, { id:"other" })),
    { ok:false, reason:"idempotency_conflict" });
  assert.deepEqual(releaseRows(core), rows, "replays append nothing");
});

test("backfill is bootstrap-only: any existing release refuses a new identity", () => {
  const core = makeCore(() => 1000);
  const batches = seedFrontier(core);
  core.now = () => 5000;
  assert.equal(core.backfillProductionLedger(backfill(batches)).ok, true);
  core.now = () => 5100;
  const later = seedLegacyBatch(core, "batch-late", "suggestion-late", 5200);
  core.now = () => 5300;
  assert.deepEqual(core.backfillProductionLedger(backfill([later], {
    id:"ledger-backfill-2", idempotency_key:"backfill-idem-2" })),
  { ok:false, reason:"release_history_exists" });
  assert.deepEqual(core.backfillProductionLedger(backfill(batches, {
    id:"ledger-backfill-2", idempotency_key:"backfill-idem-2" })),
  { ok:false, reason:"release_history_exists" }, "already-published batches are refused");

  const prepared = makeCore(() => 1000);
  const preparedBatches = seedFrontier(prepared);
  assert.equal(prepared.prepareProductionRelease({ id:"release-1", idempotency_key:"idem-1",
    request_digest:"d", actor:"service:builder", credential_channel:"bearer",
    target_environment:"production", target_batch_id:"batch-c", base_sha:"prod-base",
    candidate_sha:preparedBatches[2].commit_sha, generator_id:"sha256:" + "3".repeat(64),
    evidence_hash:"e", manifest_hash:"m", ancestry_verified:true }).ok, false,
  "legacy null-generator batches remain unpreparable by the normal lane");
  prepared.sql.exec("INSERT INTO production_releases (id,idempotency_key,request_digest,state,actor,credential_channel,target_environment,target_batch_id,base_sha,candidate_sha,generator_id,evidence_hash,manifest_hash,membership_hash,created_at,updated_at) VALUES ('r','k','d','prepared','a','bearer','production','batch-a','b','c','g','e','m','h',1,1)");
  assert.deepEqual(prepared.backfillProductionLedger(backfill(preparedBatches)),
    { ok:false, reason:"release_history_exists" });
});

test("wrong sha, unknown batch, gaps, and partial sets write nothing", () => {
  const core = makeCore(() => 1000);
  const batches = seedFrontier(core);
  const before = { ...evidenceSnapshot(core), ...releaseRows(core) };
  const refused = (input, reason) => {
    assert.deepEqual(core.backfillProductionLedger(input), { ok:false, reason });
    assert.deepEqual({ ...evidenceSnapshot(core), ...releaseRows(core) }, before);
  };
  refused(backfill([batches[0], { ...batches[1], commit_sha:sha(9) }, batches[2]]), "commit_mismatch");
  refused(backfill([...batches, { batch_id:"batch-missing", commit_sha:sha(10) }]), "unknown_batch");
  refused(backfill([batches[0], batches[2]]), "noncontiguous_membership");
  refused(backfill([batches[1], batches[2]]), "noncontiguous_membership");
  refused(backfill([batches[1], batches[0], batches[2]]), "noncontiguous_membership");
  refused(backfill([batches[0], batches[0]]), "validation_error");
  refused(backfill([]), "validation_error");
  refused(backfill([{ batch_id:"batch-a", commit_sha:"ABC" }]), "validation_error");
  refused(backfill(batches, { live_production_sha:"" }), "validation_error");
  refused(backfill(batches, { live_production_sha:LIVE.slice(0, 39) }), "validation_error");
  refused(backfill(batches, { provenance:{ pages_release_sha:LIVE, worker_release_sha:sha(1) } }),
    "provenance_mismatch");
  refused(backfill(batches, { provenance:{ pages_release_sha:"", worker_release_sha:"" } }),
    "provenance_mismatch");
  refused(backfill(batches, { ancestry_verified:"true" }), "nonancestor_candidate");
  refused(backfill(batches, { credential_channel:"access" }), "service_bearer_required");
  refused(backfill(batches, { target_environment:"dev" }), "wrong_target");
  refused(backfill(batches, { extra:"field" }), "validation_error");
  core.sql.exec("UPDATE apply_batches SET phase='evidence_missing' WHERE batch_id='batch-b'");
  assert.deepEqual(core.backfillProductionLedger(backfill([batches[0]])),
    { ok:false, reason:"missing_batch_evidence" });
});

test("a prefix backfill leaves later batches honestly pending", () => {
  const core = makeCore(() => 1000);
  const batches = seedFrontier(core);
  core.now = () => 5000;
  assert.equal(core.backfillProductionLedger(backfill(batches.slice(0, 2))).ok, true);
  assert.deepEqual(core.productionPreparationContext().batches.map((b) => b.batch_id), ["batch-c"]);
});

test("a backfilled record grants no claim, transition, restore, or authorization", () => {
  const core = makeCore(() => 1000);
  const batches = seedFrontier(core);
  core.now = () => 5000;
  assert.equal(core.backfillProductionLedger(backfill(batches)).ok, true);
  const rows = releaseRows(core);
  assert.deepEqual(core.claimAuthorizedProductionRelease({ actor:"service:release",
    credential_channel:"bearer" }), { ok:true, release:null });
  assert.equal(core.claimAuthorizedProductionRelease({ id:"ledger-backfill-1", actor:"service:release",
    credential_channel:"bearer" }).ok, false);
  assert.equal(core.authorizeProductionRelease({ id:"ledger-backfill-1", idempotency_key:"a",
    request_digest:"a", actor:"slot:damien", credential_channel:"access" }).ok, false);
  assert.equal(core.transitionProductionRelease({ id:"ledger-backfill-1", state:"complete",
    fencing_token:"", actor:"service:release", credential_channel:"bearer" }).ok, false);
  assert.equal(core.claimProductionRestore({ id:"ledger-backfill-1", actor:"service:release",
    credential_channel:"bearer" }).ok, false);
  assert.deepEqual(releaseRows(core), rows);
});

// ---- routed endpoint: scope isolation and the real frontier read ------------
const env = (stub) => ({
  PROD_RELEASE_LEDGER:"true", SESSION_SIGNING_KEY:"test-signing-key",
  EDIT_TOKEN_SCOPES:JSON.stringify({ release:{ release_service:1 }, observer:{ release_observer:1 },
    admin:{ admin:1 }, damienadmin:{ edit:1, admin:1, publisher:1 } }),
  EDIT_TOKEN_RELEASE:"release-secret", EDIT_TOKEN_OBSERVER:"observer-secret",
  EDIT_TOKEN_ADMIN:"admin-secret", EDIT_TOKEN_DAMIENADMIN:"publisher-secret",
  EDIT_ORIGIN:"https://edit.example", EDITOR:{ getByName:() => stub },
});

function coreStub(core) {
  return {
    backfillProductionLedger:async (input) => core.backfillProductionLedger(input),
    productionPreparationContext:async (options) => core.productionPreparationContext(options),
  };
}

function backfillRequest(body, { token = "release-secret", headers = {} } = {}) {
  return new Request("https://edit.example/edit/v1/prod/releases/backfill", { method:"POST",
    headers:{ "Content-Type":"application/json", "X-Edit-Request":"1",
      ...(token ? { Authorization:`Bearer ${token}` } : {}), ...headers },
    body:JSON.stringify(body) });
}

function wireBody(batches, over = {}) {
  return { id:"ledger-backfill-1", idempotency_key:"backfill-idem-1", live_production_sha:LIVE,
    ancestry_verified:true, provenance:{ pages_release_sha:LIVE, worker_release_sha:LIVE },
    batches, ...over };
}

async function observerFrontier(core) {
  const response = await editorFetch(new Request(
    "https://edit.example/edit/v1/prod/releases/frontier",
    { headers:{ Authorization:"Bearer observer-secret" } }), env(coreStub(core)), {});
  assert.equal(response.status, 200);
  return (await response.json()).context;
}

test("routed backfill accepts only the release-service bearer", async () => {
  const core = makeCore(() => 1000);
  const batches = seedFrontier(core);
  let calls = 0;
  const stub = { backfillProductionLedger:async (input) => { calls++; return core.backfillProductionLedger(input); } };
  for (const token of ["observer-secret", "admin-secret", "publisher-secret", "wrong-secret", null]) {
    const response = await editorFetch(backfillRequest(wireBody(batches), { token }), env(stub), {});
    assert.ok([401, 403].includes(response.status), `${token} -> ${response.status}`);
  }
  // A signed cookie for the release slot itself (and for a Publisher) is still
  // not the bearer channel.
  for (const token of ["release-secret", "publisher-secret"]) {
    const matched = await resolveOpaqueToken(env(stub), token);
    assert.ok(matched?.slot, token);
    const value = await mintCookieValue("test-signing-key", { slot:matched.slot, stamp:matched.stamp });
    const response = await editorFetch(backfillRequest(wireBody(batches), { token:null,
      headers:{ Cookie:`${COOKIE_NAME}=${value}`, Origin:"https://edit.example" } }), env(stub), {});
    assert.equal(response.status, 403, `cookie ${token} -> ${response.status}`);
  }
  assert.equal(calls, 0, "refused callers never reach the Durable Object");
  const noCsrf = new Request("https://edit.example/edit/v1/prod/releases/backfill", { method:"POST",
    headers:{ Authorization:"Bearer release-secret" }, body:JSON.stringify(wireBody(batches)) });
  assert.equal((await editorFetch(noCsrf, env(stub), {})).status, 403);
  assert.equal((await editorFetch(backfillRequest(wireBody(batches)),
    { ...env(stub), PROD_RELEASE_LEDGER:"false" }, {})).status, 404);
  assert.equal(calls, 0);
  assert.equal(core._all("SELECT id FROM production_releases").length, 0);
});

test("routed backfill binds the request digest and empties the observer frontier", async () => {
  const core = makeCore(() => 1000);
  const batches = seedFrontier(core);
  const before = await observerFrontier(core);
  assert.equal(before.batches.length, 3);
  assert.equal(before.batches.filter((b) => b.generator_id === null).length, 2);
  core.now = () => 5000;
  const created = await editorFetch(backfillRequest(wireBody(batches)), env(coreStub(core)), {});
  assert.equal(created.status, 201);
  const release = (await created.json()).release;
  assert.equal(release.release_kind, "ledger_backfill");
  assert.equal(release.actor, "slot:release");
  const replay = await editorFetch(backfillRequest(wireBody(batches)), env(coreStub(core)), {});
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).replay, true);
  const changed = await editorFetch(backfillRequest(wireBody(batches.slice(0, 2))), env(coreStub(core)), {});
  assert.equal(changed.status, 409);
  assert.equal((await changed.json()).error.code, "idempotency_conflict");
  const unknown = await editorFetch(backfillRequest(wireBody(batches, { surprise:1 })), env(coreStub(core)), {});
  assert.equal(unknown.status, 400);
  const after = await observerFrontier(core);
  assert.deepEqual(after, { active_release:null,
    operation_frontier:{ pending_operation_count:0, blocked_state:"unblocked" },
    base_sha:LIVE, batches:[] });
});
