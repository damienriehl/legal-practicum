import { test } from "node:test";
import assert from "node:assert/strict";
import { makeCore } from "./editor-sql-helper.mjs";

function suggestion(core, id, original = "Same text", proposed = original, kind = "prose") {
  core.suggest({ id,editor:"slot:test",scope:"edit",origin:"human",kind,
    source_ref:"data/copy/home.json#lead",original_text:original,original_hash:"hash",
    new_text:proposed,map_version:"v1" },{}, { directApply:true });
  core.sql.exec("UPDATE suggestions SET status='accepted' WHERE id=?",id);
  assert.equal(core.claimBatch(`batch-${id}`,{ ids:[id],base_sha:"base" }).ok,true);
}
function finish(core, id, extra = {}) {
  return core.finalize(`batch-${id}`,{ phase:"done",applied:[id],commit_sha:"commit",...extra });
}
function diagnostic(id, original, proposed, prefix, suffix, extra = {}) {
  return { id,noop_verified:original === proposed,normalized_match:true,rendered_match:false,
    kind:"prose",op:null,source_ref:"data/copy/home.json#lead",group_id:null,
    apply_batch_id:`batch-${id}`,batch_phase:"done",batch_commit_sha:"commit",
    original_type:"string",new_type:"string",original_length:Buffer.byteLength(original),
    new_length:Buffer.byteLength(proposed),common_prefix_bytes:prefix,common_suffix_bytes:suffix,...extra };
}
function rows(core) { return core._all("SELECT * FROM production_noop_applications"); }

test("finalize covers exact no-op text atomically and replay preserves its receipt", () => {
  const core = makeCore(() => 1000);
  suggestion(core,"same");
  assert.equal(finish(core,"same").ok,true);
  assert.equal(core.productionReleaseAudit().counts.noop_applications,1);
  assert.equal(core.productionReleaseAudit().invariants.unreconciled_applied_suggestions,0);
  const before = rows(core);
  assert.equal(before[0].match,"exact");
  assert.equal(core.productionReleaseAudit().counts.noop_applications_normalized,0);
  assert.equal(finish(core,"same").ok,true);
  assert.deepEqual(rows(core),before);
});

for (const [name,oldText,newText,kind] of [
  ["content","Old","New","prose"], ["whitespace","Same text","Same  text","prose"],
  ["quotes","‘Same’","'Same'","prose"], ["unicode","é","e\u0301","prose"],
  ["structural","Same","Same","move"], ["override revert","Same","Same","page_override_revert"],
]) test(`finalize leaves ${name} changes uncovered despite client no-op assertions`, () => {
  const core = makeCore();
  suggestion(core,"change",oldText,newText,kind);
  assert.equal(finish(core,"change",{ noop_verified:true,noop_applications:["change"] }).ok,true);
  assert.equal(core.productionReleaseAudit().counts.noop_applications,0);
  assert.equal(core.productionReleaseAudit().invariants.unreconciled_applied_suggestions,1);
});

function historic(core, id = "historic", original = "Same text", proposed = original) {
  suggestion(core,id,original,proposed);
  core.sql.exec("UPDATE suggestions SET status='applied' WHERE id=?",id);
  core.sql.exec("UPDATE apply_batches SET phase='done',commit_sha='commit' WHERE batch_id=?",`batch-${id}`);
}
const reconcile = (core, ids, extra = {}) => core.reconcileNoopReview({
  actor:"service:test",suggestion_ids:ids,...extra });
function cover(core, id, type) {
  if (type === "legacy") core.sql.exec(
    "INSERT INTO production_legacy_exclusions VALUES (?,?,?,?,?,?,?,?)",id,"migration","source",`batch-${id}`,"commit","reason","hash",1000);
  else core.sql.exec(`INSERT INTO production_review_revisions
    (id,source_ref,source_revision,prod_base,original_hash,proposed_hash,original_text,proposed_text,commit_sha,suggestion_ids_json,operations_json,evidence_digest,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,"revision","source","commit","base","old","new","Old","New","commit",JSON.stringify([id]),"[]","digest",1000);
}

test("dry run discovers only uncovered applied IDs without text or writes; remediation replays", () => {
  const core = makeCore();
  historic(core); historic(core,"real","Old","New"); historic(core,"covered"); cover(core,"covered","legacy");
  assert.deepEqual(core.reconcileNoopReview({ actor:"service:test",dry_run:true }),{
    ok:true,dry_run:true,suggestions:[diagnostic("historic","Same text","Same text",9,9),diagnostic("real","Old","New",0,0,{ normalized_match:false })] });
  assert.equal(rows(core).length,0);
  assert.deepEqual(reconcile(core,["historic"]),{ ok:true,replay:false,inserted:1,suggestion_ids:["historic"] });
  const receipt = rows(core);
  assert.deepEqual(reconcile(core,["historic"]),{ ok:true,replay:true,inserted:0,suggestion_ids:["historic"] });
  assert.deepEqual(rows(core),receipt);
  assert.equal(core.productionReleaseAudit().invariants.unreconciled_applied_suggestions,1);
});

for (const [name,reason,mutate] of [
  ["missing","suggestion_not_applied",core => core.sql.exec("DELETE FROM suggestions WHERE id='bad'")],
  ["pending","suggestion_not_applied",core => core.sql.exec("UPDATE suggestions SET status='pending' WHERE id='bad'")],
  ["unfinished batch","batch_not_done",core => core.sql.exec("UPDATE apply_batches SET phase='merged' WHERE batch_id='batch-bad'")],
  ["missing batch","batch_not_done",core => core.sql.exec("DELETE FROM apply_batches WHERE batch_id='batch-bad'")],
  ["missing commit","batch_not_done",core => core.sql.exec("UPDATE apply_batches SET commit_sha=NULL WHERE batch_id='batch-bad'")],
  ["empty commit","batch_not_done",core => core.sql.exec("UPDATE apply_batches SET commit_sha=' ' WHERE batch_id='batch-bad'")],
  ["real change","not_noop",core => core.sql.exec("UPDATE suggestions SET new_text='Changed' WHERE id='bad'")],
  ["null texts","not_noop",core => core.sql.exec("UPDATE suggestions SET original_text=NULL,new_text=NULL WHERE id='bad'")],
  ["legacy coverage","already_covered",core => cover(core,"bad","legacy")],
  ["revision coverage","already_covered",core => cover(core,"bad","revision")],
]) test(`reconcile rejects ${name} atomically`, () => {
  const core = makeCore(); historic(core,"good"); historic(core,"bad"); mutate(core);
  assert.deepEqual(reconcile(core,["good","bad"]),{ ok:false,reason });
  assert.equal(rows(core).length,0);
});

test("replay rejects changed batch evidence without writing other IDs", () => {
  const core = makeCore(); historic(core,"first"); historic(core,"second");
  reconcile(core,["first"]);
  core.sql.exec("UPDATE apply_batches SET commit_sha='different' WHERE batch_id='batch-first'");
  assert.equal(reconcile(core,["second","first"]).reason,"idempotency_conflict");
  assert.equal(rows(core).length,1);
});

for (const ids of [undefined,[],["a","a"],[""],[" "],[null],[1],["a".repeat(257)],["é".repeat(129)],Array.from({ length:101 },(_,i) => `id-${i}`)])
  test(`reconcile bounds reject ${JSON.stringify(ids)?.slice(0,30)}`, () => {
    assert.equal(reconcile(makeCore(),ids).reason,"validation_error");
  });

test("reconcile rejects ambiguous modes and invalid actor; accepts maximum bounded IDs", () => {
  const core = makeCore();
  for (const input of [null,[],{}, { actor:"x",dry_run:"true" },
    { actor:"x",dry_run:true,suggestion_ids:[] },{ actor:"x".repeat(257),dry_run:true }])
    assert.equal(core.reconcileNoopReview(input).reason,"validation_error");
  const ids = Array.from({ length:100 },(_,i) => `${i}`.padEnd(256,"x"));
  for (const id of ids) historic(core,id);
  assert.equal(reconcile(core,ids).inserted,100);
});

for (const type of ["legacy","revision"]) test(`audit detects no-op overlap with ${type} coverage`, () => {
  const core = makeCore(); historic(core); reconcile(core,["historic"]); cover(core,"historic",type);
  assert.equal(core.productionReleaseAudit().invariants.noop_application_coverage_overlap,1);
});

test("finalize respects existing revision coverage, done phase, batch binding and commit evidence", () => {
  const core = makeCore(); suggestion(core,"covered"); cover(core,"covered","revision");
  finish(core,"covered"); assert.equal(rows(core).length,0);
  suggestion(core,"later"); finish(core,"later",{ phase:"merged" }); assert.equal(rows(core).length,0);
  finish(core,"later",{ commit_sha:null }); // Retains the previously recorded commit.
  assert.equal(rows(core).length,1);
  suggestion(core,"no-commit"); finish(core,"no-commit",{ commit_sha:null }); assert.equal(rows(core).length,1);
  suggestion(core,"other"); finish(core,"covered",{ applied:["other"] }); assert.equal(rows(core).length,1);
});

test("finalize rolls back statuses and no-op coverage on invalid review revision", () => {
  const core = makeCore(); suggestion(core,"same");
  assert.equal(finish(core,"same",{ review_revisions:[{ commit_sha:"different" }] }).reason,"revision_mismatch");
  assert.equal(core._one("SELECT status FROM suggestions").status,"in_flight");
  assert.equal(core._one("SELECT phase FROM apply_batches").phase,"claimed");
  assert.equal(rows(core).length,0);
});

test("no-op insert errors roll back the entire finalize transaction", () => {
  const core = makeCore(); suggestion(core,"same");
  core.sql.exec("CREATE TRIGGER reject_noop BEFORE INSERT ON production_noop_applications BEGIN SELECT RAISE(ABORT,'test rollback'); END;");
  assert.throws(() => finish(core,"same"),/test rollback/);
  assert.equal(core._one("SELECT status FROM suggestions").status,"in_flight");
  assert.equal(core._one("SELECT phase FROM apply_batches").phase,"claimed");
});

import { normHash } from "../src/text-norm.js";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtempSync,writeFileSync,readFileSync,openSync,closeSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("Worker predicate is no looser than actual Python review operation generation", async () => {
  const cases = [["Same","Same"],["",""],["a ".repeat(1100),"a ".repeat(1100)],
    ["Same text","Same  text"],["‘Same’","'Same'"],["é","e\u0301"],["Old","New"]];
  // File-backed stdio also works in sandboxes that prohibit child-process pipes.
  const temp = mkdtempSync(join(tmpdir(),"noop-parity-"));
  writeFileSync(join(temp,"input.json"),JSON.stringify(cases));
  const fds = [openSync(join(temp,"input.json"),"r"),openSync(join(temp,"output.json"),"w"),openSync(join(temp,"error.log"),"w")];
  let expected;
  try {
    const python = spawnSync("python3",["-c",`import json, sys
from types import SimpleNamespace
from tools.apply_suggestions import _atomic_review_operations
cases=json.load(sys.stdin)
print(json.dumps([not _atomic_review_operations(SimpleNamespace(source_ref='source',group_id=None,op=None,original_text=a,new_text=b,suggestion_id='id',created_at=1), 'commit', 'base') for a,b in cases]))`],{
      cwd:fileURLToPath(new URL("../../../",import.meta.url)),stdio:fds,timeout:10000 });
    assert.equal(python.status,0,readFileSync(join(temp,"error.log"),"utf8"));
    expected = JSON.parse(readFileSync(join(temp,"output.json"),"utf8"));
  } finally {
    for (const fd of fds) closeSync(fd);
    rmSync(temp,{ recursive:true,force:true });
  }
  for (let i = 0; i < cases.length; i++) {
    const core = makeCore(); historic(core,"text",...cases[i]);
    const verified = core.reconcileNoopReview({ actor:"service:test",dry_run:true }).suggestions[0].noop_verified;
    assert.equal(verified,expected[i]);
    if (verified) {
      reconcile(core,["text"]);
      assert.equal(rows(core)[0].normalized_hash,await normHash(cases[i][0]));
    }
  }
});

test("finalize records supplied revision coverage before considering a no-op receipt", () => {
  const core = makeCore(); suggestion(core,"same","‘Same’","'Same'");
  const review = { id:"revision",source_ref:"data/copy/home.json#lead",source_revision:"commit",
    prod_base:"base",commit_sha:"commit",original_hash:"old",proposed_hash:"new",
    original_text:"Old",proposed_text:"New",suggestion_ids:["same"],
    operations:[{ id:"operation",decision_id:"operation",kind:"replace",source_ref:"data/copy/home.json#lead",
      source_revision:"commit",prod_base:"base",base_range:[0,3],proposed_range:[0,3],old_text:"Old",new_text:"New" }] };
  assert.equal(finish(core,"same",{ review_revisions:[review] }).ok,true);
  assert.equal(rows(core).length,0);
  assert.equal(core.productionReleaseAudit().invariants.unreconciled_applied_suggestions,0);
});

test("remediation rolls back all inserts on a storage error and mixed replay inserts only new IDs", () => {
  const core = makeCore(); historic(core,"first"); historic(core,"second");
  core.sql.exec("CREATE TRIGGER reject_second BEFORE INSERT ON production_noop_applications WHEN NEW.suggestion_id='second' BEGIN SELECT RAISE(ABORT,'test rollback'); END;");
  assert.throws(() => reconcile(core,["first","second"]),/test rollback/);
  assert.equal(rows(core).length,0);
  core.sql.exec("DROP TRIGGER reject_second");
  reconcile(core,["first"]);
  assert.equal(reconcile(core,["first","second"]).inserted,1);
  core.initSchema();
  assert.equal(rows(core).length,2);
});

test("finalize rejects changed no-op commit evidence and rolls back the batch update", () => {
  const core = makeCore(); suggestion(core,"same"); finish(core,"same");
  const before = rows(core);
  assert.deepEqual(finish(core,"same",{ commit_sha:"changed" }),{ ok:false,reason:"idempotency_conflict" });
  assert.deepEqual(finish(core,"same",{ applied:undefined,commit_sha:"changed" }),{ ok:false,reason:"idempotency_conflict" });
  assert.equal(core._one("SELECT commit_sha FROM apply_batches").commit_sha,"commit");
  assert.deepEqual(rows(core),before);
});

for (const commit_sha of [null,"commit"]) test(`audit withdraws no-op coverage after rollback with commit ${commit_sha} and restores it when done`, () => {
  const core = makeCore(); suggestion(core,"same"); finish(core,"same");
  const receipt = rows(core);
  assert.equal(core.finalize("batch-same",{ phase:"rolled_back",commit_sha }).ok,true);
  let audit = core.productionReleaseAudit();
  assert.equal(audit.invariants.noop_receipts_without_done_batch,1);
  assert.equal(audit.invariants.unreconciled_applied_suggestions,1);
  assert.equal(audit.counts.noop_applications,1);
  assert.deepEqual(rows(core),receipt);
  assert.equal(core.finalize("batch-same",{ phase:"done",commit_sha }).ok,true);
  audit = core.productionReleaseAudit();
  assert.equal(audit.invariants.noop_receipts_without_done_batch,0);
  assert.equal(audit.invariants.unreconciled_applied_suggestions,0);
  assert.deepEqual(rows(core),receipt);
});

for (const [name,sql] of [
  ["commit mismatch","UPDATE apply_batches SET commit_sha='different' WHERE batch_id='batch-same'"],
  ["null commit","UPDATE apply_batches SET commit_sha=NULL WHERE batch_id='batch-same'"],
  ["missing batch","DELETE FROM apply_batches WHERE batch_id='batch-same'"],
]) test(`audit rejects no-op receipt with ${name}`, () => {
  const core = makeCore(); suggestion(core,"same"); finish(core,"same");
  const receipt = rows(core);
  core.sql.exec(sql);
  const audit = core.productionReleaseAudit();
  assert.equal(audit.invariants.noop_receipts_without_done_batch,1);
  assert.equal(audit.invariants.unreconciled_applied_suggestions,1);
  assert.deepEqual(rows(core),receipt);
});

test("replay rejects changed original text that remains an exact no-op without changing receipts", () => {
  const core = makeCore(); historic(core,"first"); historic(core,"second");
  assert.equal(reconcile(core,["first"]).ok,true);
  const receipt = rows(core);
  core.sql.exec("UPDATE suggestions SET original_text='Different text',new_text='Different text' WHERE id='first'");
  assert.deepEqual(reconcile(core,["second","first"]),{ ok:false,reason:"idempotency_conflict" });
  assert.deepEqual(rows(core),receipt);
});

test("audit counts a no-op receipt overlapping both legacy and revision coverage once", () => {
  const core = makeCore(); historic(core);
  assert.equal(reconcile(core,["historic"]).ok,true);
  cover(core,"historic","legacy"); cover(core,"historic","revision");
  assert.equal(core.productionReleaseAudit().invariants.noop_application_coverage_overlap,1);
});

for (const kind of ["prose","json_scalar"]) {
  for (const [name,original,proposed] of [
    ["quotes","‘Same’","'Same'"], ["whitespace","Same  text","Same text"],
    ["unicode","é","e\u0301"],
  ]) test(`finalize leaves normalized-only ${kind} ${name} unreconciled with a revision array`, () => {
    const core = makeCore(); suggestion(core,"norm",original,proposed,kind);
    assert.equal(finish(core,"norm",{ review_revisions:[] }).ok,true);
    assert.deepEqual(rows(core),[]);
    assert.equal(core.productionReleaseAudit().counts.noop_applications_normalized,0);
    assert.equal(core.productionReleaseAudit().invariants.unreconciled_applied_suggestions,1);
    assert.equal(finish(core,"norm",{ review_revisions:[] }).ok,true);
    assert.deepEqual(rows(core),[]);
    assert.equal(core.productionReleaseAudit().invariants.unreconciled_applied_suggestions,1);
  });
  test(`finalize records exact ${kind} evidence with a revision array`, async () => {
    const core = makeCore(); suggestion(core,"same","Same","Same",kind);
    assert.equal(finish(core,"same",{ review_revisions:[] }).ok,true);
    const receipt = rows(core);
    assert.equal(receipt.length,1);
    assert.equal(receipt[0].match,"exact");
    assert.equal(receipt[0].source,"finalize");
    assert.equal(receipt[0].normalized_hash,await normHash("Same"));
    assert.equal(core.productionReleaseAudit().counts.noop_applications_normalized,0);
    assert.equal(core.productionReleaseAudit().invariants.unreconciled_applied_suggestions,0);
    assert.equal(finish(core,"same",{ review_revisions:[] }).ok,true);
    assert.deepEqual(rows(core),receipt);
  });
}

test("finalize cannot certify a whitespace-only change from an empty revision array or match opt-in", () => {
  const core = makeCore(); suggestion(core,"whitespace","Same text","Same  text");
  assert.equal(finish(core,"whitespace",{ review_revisions:[],match:"normalized" }).ok,true);
  assert.deepEqual(rows(core),[]);
  assert.equal(core.productionReleaseAudit().counts.noop_applications,0);
  assert.equal(core.productionReleaseAudit().invariants.unreconciled_applied_suggestions,1);
});

for (const review_revisions of [undefined,null,[]]) {
  for (const [kind,original,proposed] of [
    ["prose","Old","New"], ["json_scalar","Old","New"],
    ["move","Same","Same"], ["page_override_revert","Same","Same"],
  ]) test(`finalize keeps ${kind} real/structural change uncovered with revisions ${JSON.stringify(review_revisions)}`, () => {
    const core = makeCore(); suggestion(core,"change",original,proposed,kind);
    assert.equal(finish(core,"change",{ review_revisions }).ok,true);
    assert.equal(rows(core).length,0);
  });
  test(`finalize remains exact-only with revisions ${JSON.stringify(review_revisions)}`, () => {
    const core = makeCore(); suggestion(core,"norm","Same  text","Same text");
    finish(core,"norm",{ review_revisions });
    assert.equal(rows(core).length,0);
    assert.equal(core.productionReleaseAudit().invariants.unreconciled_applied_suggestions,1);
  });
}

test("normalized reconciliation requires explicit match and replays only the same match", async () => {
  const core = makeCore(); historic(core,"norm","‘Same  text’","'Same text'"); historic(core,"other");
  const dry = core.reconcileNoopReview({ actor:"service:test",dry_run:true });
  assert.deepEqual(dry.suggestions[0],diagnostic("norm","‘Same  text’","'Same text'",0,0));
  assert.deepEqual(reconcile(core,["norm"]),{ ok:false,reason:"not_noop" });
  assert.equal(reconcile(core,["norm"],{ match:"normalized" }).inserted,1);
  const receipt = rows(core);
  assert.equal(receipt[0].match,"normalized");
  assert.equal(receipt[0].source,"reconcile-noop");
  assert.equal(receipt[0].normalized_hash,await normHash("‘Same  text’"));
  assert.equal(reconcile(core,["norm"],{ match:"normalized" }).replay,true);
  assert.deepEqual(reconcile(core,["other","norm"]),{ ok:false,reason:"idempotency_conflict" });
  assert.deepEqual(rows(core),receipt);
  assert.equal(reconcile(core,["other"]).inserted,1);
  assert.equal(reconcile(core,["other"],{ match:"normalized" }).reason,"idempotency_conflict");
});

for (const match of [null,"",true,"loose",1]) test(`reconcile rejects invalid match ${match}`, () => {
  assert.equal(reconcile(makeCore(),["id"],{ match }).reason,"validation_error");
});

test("normalized reconciliation rejects real content changes atomically", () => {
  const core = makeCore(); historic(core,"norm","‘Same’","'Same'"); historic(core,"real","Old","New");
  assert.equal(reconcile(core,["norm","real"],{ match:"normalized" }).reason,"not_noop");
  assert.equal(rows(core).length,0);
});

test("schema migration preserves pre-existing receipts and defaults match to exact", () => {
  const core = makeCore(); historic(core); reconcile(core,["historic"]);
  core.sql.exec("ALTER TABLE production_noop_applications DROP COLUMN match");
  const before = rows(core)[0];
  core.initSchema(); core.initSchema();
  assert.deepEqual({ ...rows(core)[0] },{ ...before,match:"exact" });
  assert.equal(reconcile(core,["historic"]).replay,true);
  assert.equal(core.productionReleaseAudit().counts.noop_applications_normalized,0);
});

test("finalize replays exact evidence regardless of revision array presence", () => {
  const core = makeCore(); suggestion(core,"same");
  finish(core,"same",{ review_revisions:[] });
  const receipt = rows(core);
  assert.equal(receipt[0].match,"exact");
  assert.deepEqual(finish(core,"same"),{ ok:true });
  assert.deepEqual(rows(core),receipt);
});

for (const [id,original,proposed,kind,prefix,suffix,normalized] of [
  ["exact","SECRET_EXACT_é","SECRET_EXACT_é","prose",15,15,true],
  ["normalized","SECRET_NORM  é","SECRET_NORM é","json_scalar",12,3,true],
  ["real","SECRET_CHANGE_é_tail","SECRET_CHANGE_ê_tail","prose",15,5,false],
  ["structural","SECRET_MOVE_é","SECRET_MOVE_é","move",14,14,false],
]) test(`dry-run diagnostics for ${id} contain only metadata and byte counts`, () => {
  const core = makeCore(); historic(core,id,original,proposed);
  core.sql.exec("UPDATE suggestions SET kind=?,group_id='group' WHERE id=?",kind,id);
  const result = core.reconcileNoopReview({ actor:"test",dry_run:true });
  assert.deepEqual(result.suggestions,[diagnostic(id,original,proposed,prefix,suffix,{
    kind,op:kind === "move" ? "move" : null,group_id:"group",
    noop_verified:id === "exact",normalized_match:normalized })]);
  const serialized = JSON.stringify(result);
  for (const marker of [original,proposed,"SECRET_","original_text","new_text"])
    assert.equal(serialized.includes(marker),false,marker);
  assert.equal(rows(core).length,0);
});

for (const [original,proposed,original_type,new_type,oldLength,newLength,prefix,suffix] of [
  [null,"SECRET_NULL_NEW","null","string",null,15,null,null],
  ["SECRET_NULL_OLD",null,"string","null",15,null,null,null],
  [null,null,"null","null",null,null,null,null],
  ["","","string","string",0,0,0,0],
  ["é","éx","string","string",2,3,2,0],
  [new Uint8Array([65,66]),"SECRET_BLOB_NEW","object","string",null,15,null,null],
]) test(`dry-run reports stored types and nullable lengths: ${original_type}/${new_type}/${oldLength}`, () => {
  const core = makeCore(); historic(core);
  core.sql.exec("UPDATE suggestions SET original_text=?,new_text=?",original,proposed);
  core.sql.exec("DELETE FROM apply_batches");
  const result = core.reconcileNoopReview({ actor:"test",dry_run:true });
  const row = result.suggestions[0];
  assert.deepEqual([row.original_type,row.new_type,row.original_length,row.new_length,
    row.common_prefix_bytes,row.common_suffix_bytes],
    [original_type,new_type,oldLength,newLength,prefix,suffix]);
  assert.equal(row.batch_phase,null); assert.equal(row.batch_commit_sha,null);
  assert.equal(row.apply_batch_id,"batch-historic");
  assert.equal(JSON.stringify(result).includes("SECRET_"),false);
});

test("dry-run bounds every metadata string in UTF-8 bytes and limits discovery to 100 rows", () => {
  const core = makeCore();
  for (let i = 0; i < 101; i++) historic(core,String(i).padStart(3,"0"));
  const boundary = "é".repeat(128), oversized = "é".repeat(129);
  core.sql.exec("UPDATE suggestions SET source_ref=?,group_id=?",boundary,oversized);
  core.sql.exec("UPDATE suggestions SET id=?,kind=?,apply_batch_id=? WHERE id='099'",oversized,oversized,oversized);
  core.sql.exec("UPDATE apply_batches SET batch_id=?,phase=?,commit_sha=? WHERE batch_id='batch-099'",oversized,oversized,oversized);
  core.sql.exec("DELETE FROM suggestions WHERE id='100'");
  let result = core.reconcileNoopReview({ actor:"test",dry_run:true });
  const last = result.suggestions.at(-1);
  assert.equal(last.source_ref,boundary);
  for (const key of ["id","kind","group_id","apply_batch_id","batch_phase","batch_commit_sha"])
    assert.equal(last[key],null,key);
  core.sql.exec("UPDATE suggestions SET source_ref=?",oversized);
  historic(core,"extra1"); historic(core,"extra2");
  result = core.reconcileNoopReview({ actor:"test",dry_run:true });
  assert.equal(result.suggestions.length,100);
  assert.equal(result.suggestions[0].source_ref,null);
  for (const row of result.suggestions) for (const value of Object.values(row))
    if (typeof value === "string") assert.ok(Buffer.byteLength(value) <= 256);
});

import { lookupBlocks } from "../src/editor-map.js";
import { normalize } from "../src/text-norm.js";
import { sha256HexSync } from "../src/integrity-digest.js";
const renderedRef = "data/curriculum/m1.md#bd3a87cb4";
function renderedSuggestion(core, id = "rendered") {
  const block = lookupBlocks(renderedRef)[0];
  suggestion(core,id,block.original_text,block.original_text.replaceAll("*",""));
  core.sql.exec("UPDATE suggestions SET source_ref=? WHERE id=?",renderedRef,id);
  assert.equal(finish(core,id,{ review_revisions:[],match:"rendered" }).ok,true);
  return block;
}

test("rendered hash is synchronous normHash parity, including the real bundled curriculum block", async () => {
  const block = lookupBlocks(renderedRef)[0];
  for (const text of [block.original_text,"‘Café’\r\n—  e\u0301\u00a0…", "", "🙂".repeat(100)])
    assert.equal(sha256HexSync(normalize(text)),await normHash(text));
  assert.equal(sha256HexSync(normalize(block.original_text.replaceAll("*",""))),block.original_hash);
});

test("raw Markdown versus bundled rendering requires rendered opt-in and preserves receipt on replay", async () => {
  const core = makeCore(); const block = renderedSuggestion(core);
  assert.equal(rows(core).length,0); // Even an explicit finalize match cannot loosen it.
  const dry = core.reconcileNoopReview({ actor:"test",dry_run:true });
  assert.equal(dry.suggestions[0].noop_verified,false);
  assert.equal(dry.suggestions[0].normalized_match,false);
  assert.equal(dry.suggestions[0].rendered_match,true);
  for (const match of ["exact","normalized"])
    assert.deepEqual(reconcile(core,["rendered"],{ match }),{ ok:false,reason:"not_noop" });
  const first = reconcile(core,["rendered"],{ match:"rendered" });
  assert.equal(first.inserted,1);
  const receipt = rows(core);
  assert.equal(receipt[0].match,"rendered");
  assert.equal(receipt[0].normalized_hash,await normHash(block.original_text));
  assert.equal(reconcile(core,["rendered"],{ match:"rendered" }).replay,true);
  for (const match of ["exact","normalized"])
    assert.equal(reconcile(core,["rendered"],{ match }).reason,"idempotency_conflict");
  assert.deepEqual(rows(core),receipt);
  const audit = core.productionReleaseAudit();
  assert.equal(audit.counts.noop_applications_rendered,1);
  assert.equal(audit.counts.noop_applications_normalized,0);
  assert.equal(audit.invariants.unreconciled_applied_suggestions,0);
  for (const result of [dry,first]) for (const marker of [block.original_text,"original_text","new_text"])
    assert.equal(JSON.stringify(result).includes(marker),false);
});

for (const [name,reason,mutate] of [
  ["real edit","not_noop",c => c.sql.exec("UPDATE suggestions SET new_text='Real changed wording' WHERE id='bad'")],
  ["missing map","not_noop",c => c.sql.exec("UPDATE suggestions SET source_ref='missing' WHERE id='bad'")],
  ["structural","not_noop",c => c.sql.exec("UPDATE suggestions SET kind='move' WHERE id='bad'")],
  ["override","not_noop",c => c.sql.exec("UPDATE suggestions SET kind='page_override' WHERE id='bad'")],
  ["pending","suggestion_not_applied",c => c.sql.exec("UPDATE suggestions SET status='pending' WHERE id='bad'")],
  ["unfinished","batch_not_done",c => c.sql.exec("UPDATE apply_batches SET phase='merged' WHERE batch_id='batch-bad'")],
  ["missing commit","batch_not_done",c => c.sql.exec("UPDATE apply_batches SET commit_sha=NULL WHERE batch_id='batch-bad'")],
  ["legacy","already_covered",c => cover(c,"bad","legacy")],
  ["revision","already_covered",c => cover(c,"bad","revision")],
]) test(`rendered reconciliation rejects ${name} atomically`, () => {
  const core = makeCore(); renderedSuggestion(core,"good"); renderedSuggestion(core,"bad"); mutate(core);
  assert.deepEqual(reconcile(core,["good","bad"],{ match:"rendered",rendered_match:true }),{ ok:false,reason });
  assert.equal(rows(core).length,0);
});

test("rendered verification accepts scalar and repeated equal hashes but refuses ambiguous render sites", () => {
  const core = makeCore(); renderedSuggestion(core);
  core.sql.exec("UPDATE suggestions SET kind='json_scalar'");
  const blocks = lookupBlocks(renderedRef);
  const count = blocks.length;
  try {
    blocks.push({ ...blocks[0] });
    assert.equal(core.reconcileNoopReview({ actor:"test",dry_run:true }).suggestions[0].rendered_match,true);
    blocks.push({ ...blocks[0],original_hash:"different" });
    assert.equal(core.reconcileNoopReview({ actor:"test",dry_run:true }).suggestions[0].rendered_match,false);
    assert.equal(reconcile(core,["rendered"],{ match:"rendered" }).reason,"not_noop");
  } finally { blocks.splice(count); }
  assert.equal(reconcile(core,["rendered"],{ match:"rendered" }).inserted,1);
});
