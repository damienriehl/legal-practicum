import { test } from "node:test";
import assert from "node:assert/strict";
import { worker, durableObject, EditorStore } from "./coverage-runtime-helper.mjs";
import { reviewNoopReconcileEndpoint } from "../src/editor-endpoints.js";

const origin = "https://editor.example.test";
const path = "/edit/v1/publisher/review/reconcile-noop";
const auth = { editor:"service:test",credential_channel:"bearer",scopes:{ admin:{ granted:true } } };
function diagnostic(id, original, proposed, prefix, suffix, extra = {}) {
  return { id,noop_verified:original === proposed,normalized_match:true,rendered_match:false,
    kind:"prose",op:null,source_ref:"source",group_id:null,
    apply_batch_id:"batch",batch_phase:"done",batch_commit_sha:"commit",
    original_type:"string",new_type:"string",original_length:Buffer.byteLength(original),
    new_length:Buffer.byteLength(proposed),common_prefix_bytes:prefix,common_suffix_bytes:suffix,...extra };
}
async function fixture(t) {
  const db = await durableObject(EditorStore); t.after(db.close);
  const env = { EDITOR:{ getByName:() => db.object },EDIT_ORIGIN:origin,
    SESSION_SIGNING_KEY:"noop-test-signing",EDIT_TOKEN_ADMIN:"noop-test-token",
    EDIT_TOKEN_SCOPES:JSON.stringify({ admin:{ admin:1 } }) };
  const request = (body, headers = {}) => new Request(origin + path,{ method:"POST",
    headers:{ origin,"x-edit-request":"1","authorization":"Bearer noop-test-token",...headers },
    body:typeof body === "string" ? body : JSON.stringify(body) });
  return { db,env,request,call:body => worker.fetch(request(body),env,{}) };
}

test("reconcile-noop route runs through real auth, endpoint and Durable Object; receipts contain no text", async t => {
  const { db,call } = await fixture(t);
  const core = db.object.core;
  core.suggest({ id:"historic",editor:"slot:test",scope:"edit",origin:"human",kind:"prose",
    source_ref:"source",original_text:"Private unchanged wording",original_hash:"hash",
    new_text:"Private unchanged wording",map_version:"v1" },{}, { directApply:true });
  core.claimBatch("batch",{ ids:["historic"] });
  db.sql.exec("UPDATE suggestions SET status='applied'");
  db.sql.exec("UPDATE apply_batches SET phase='done',commit_sha='commit'");
  const dry = await call({ dry_run:true });
  assert.equal(dry.status,200);
  assert.deepEqual(await dry.json(),{ ok:true,dry_run:true,suggestions:[diagnostic("historic","Private unchanged wording","Private unchanged wording",25,25)] });
  assert.equal(core.productionReleaseAudit().counts.noop_applications,0);
  const first = await call({ suggestion_ids:["historic"],actor:"forged",noop_verified:true });
  assert.equal(first.status,201);
  assert.deepEqual(await first.json(),{ ok:true,replay:false,inserted:1,suggestion_ids:["historic"] });
  assert.equal(core._one("SELECT actor FROM production_noop_applications").actor,"slot:admin");
  assert.equal((await call({ suggestion_ids:["historic"] })).status,200);
  assert.deepEqual((await (await call({ dry_run:true })).json()).suggestions,[]);
  db.sql.exec("UPDATE apply_batches SET commit_sha='changed'");
  assert.equal((await call({ suggestion_ids:["historic"] })).status,409);
});

for (const [name,actor,headers,code] of [
  ["missing CSRF",auth,{ "x-edit-request":"" },"csrf_failed"],
  ["foreign origin",auth,{ origin:"https://foreign.example" },"csrf_failed"],
  ["Access admin",{ ...auth,credential_channel:"access" },{},"forbidden"],
  ["cookie admin",{ ...auth,credential_channel:"cookie" },{},"forbidden"],
  ["non-admin bearer",{ ...auth,scopes:{ admin:{ granted:false } } },{},"forbidden"],
  ["missing auth",null,{},"forbidden"],
]) test(`reconcile-noop rejects ${name}`, async t => {
  const { request,env,db } = await fixture(t);
  const response = await reviewNoopReconcileEndpoint(request({ dry_run:true },headers),env,actor);
  assert.equal(response.status,403);
  assert.equal((await response.json()).error.code,code);
  assert.equal(db.object.core.productionReleaseAudit().counts.noop_applications,0);
});

for (const body of ["{", "null", "[]", "true", "{}", '{"dry_run":true,"suggestion_ids":[]}',
  JSON.stringify({ suggestion_ids:["x","x"] }),JSON.stringify({ suggestion_ids:["x".repeat(257)] }),
  JSON.stringify({ suggestion_ids:Array.from({ length:101 },(_,i) => String(i)) }),
  JSON.stringify({ suggestion_ids:["missing"] })])
  test(`reconcile-noop HTTP rejects invalid body ${body.slice(0,35)}`, async t => {
    const { call } = await fixture(t);
    assert.equal((await call(body)).status,400);
  });

test("reconcile-noop enforces actual byte limit despite a misleading content-length", async t => {
  const { env,request } = await fixture(t);
  const response = await reviewNoopReconcileEndpoint(request(JSON.stringify({ padding:"x".repeat(1024 * 1024) }),{
    "content-length":"1" }),env,auth);
  assert.equal(response.status,413);
});

test("reconcile-noop HTTP exposes normalized match without text and enforces receipt match on replay", async t => {
  const { db,call } = await fixture(t);
  const core = db.object.core;
  core.suggest({ id:"norm",editor:"slot:test",scope:"edit",origin:"human",kind:"prose",
    source_ref:"source",original_text:"‘Private  wording’",original_hash:"hash",
    new_text:"'Private wording'",map_version:"v1" },{}, { directApply:true });
  core.claimBatch("batch",{ ids:["norm"] });
  db.sql.exec("UPDATE suggestions SET status='applied'");
  db.sql.exec("UPDATE apply_batches SET phase='done',commit_sha='commit'");
  assert.deepEqual(await (await call({ dry_run:true })).json(),{
    ok:true,dry_run:true,suggestions:[diagnostic("norm","‘Private  wording’","'Private wording'",0,0)] });
  const refused = await call({ suggestion_ids:["norm"] });
  assert.equal(refused.status,400);
  assert.deepEqual(await refused.json(),{ ok:false,reason:"not_noop" });
  const body = { suggestion_ids:["norm"],match:"normalized" };
  const first = await call(body);
  assert.equal(first.status,201);
  assert.deepEqual(await first.json(),{ ok:true,replay:false,inserted:1,suggestion_ids:["norm"] });
  assert.equal((await call(body)).status,200);
  const conflict = await call({ suggestion_ids:["norm"],match:"exact" });
  assert.equal(conflict.status,409);
  assert.deepEqual(await conflict.json(),{ ok:false,reason:"idempotency_conflict" });
  assert.equal((await call({ ...body,match:"invalid" })).status,400);
});

for (const [id,original,proposed,kind,prefix,suffix,normalized] of [
  ["exact","HTTP_SECRET_EXACT_é","HTTP_SECRET_EXACT_é","prose",20,20,true],
  ["normalized","HTTP_SECRET_NORM  é","HTTP_SECRET_NORM é","json_scalar",17,3,true],
  ["real","HTTP_SECRET_CHANGE_é_tail","HTTP_SECRET_CHANGE_ê_tail","prose",20,5,false],
  ["structural","HTTP_SECRET_MOVE_é","HTTP_SECRET_MOVE_é","move",19,19,false],
]) test(`HTTP dry-run exposes ${id} diagnostics without text or fragments`, async t => {
  const { db,call } = await fixture(t);
  const core = db.object.core;
  assert.equal(core.suggest({ id,editor:"slot:test",scope:"edit",origin:"human",kind,
    source_ref:"source",group_id:"group",original_text:original,original_hash:"hash",
    new_text:proposed,map_version:"v1" },{}, { directApply:true }).ok,true);
  db.sql.exec("UPDATE suggestions SET status='accepted' WHERE id=?",id);
  assert.equal(core.claimBatch("batch",{ ids:[id] }).ok,true);
  db.sql.exec("UPDATE suggestions SET status='applied'");
  db.sql.exec("UPDATE apply_batches SET phase='done',commit_sha='commit'");
  const response = await call({ dry_run:true });
  assert.equal(response.status,200);
  const serialized = await response.text();
  for (const marker of [original,proposed,"HTTP_SECRET_","original_text","new_text"])
    assert.equal(serialized.includes(marker),false,marker);
  assert.deepEqual(JSON.parse(serialized),{ ok:true,dry_run:true,suggestions:[
    diagnostic(id,original,proposed,prefix,suffix,{ kind,op:kind === "move" ? "move" : null,
      group_id:"group",noop_verified:id === "exact",normalized_match:normalized })] });
  assert.equal(core.productionReleaseAudit().counts.noop_applications,0);
});

import { lookupBlocks } from "../src/editor-map.js";

test("HTTP rendered opt-in uses bundled evidence, rejects forged verification, and replays without text", async t => {
  const { db,call } = await fixture(t);
  const core = db.object.core;
  const source_ref = "data/curriculum/m1.md#bd3a87cb4";
  const block = lookupBlocks(source_ref)[0];
  for (const [id,ref,proposed] of [["rendered",source_ref,block.original_text.replaceAll("*","")],
    ["real",source_ref,"HTTP_RENDERED_SECRET_EDIT"],["missing","missing",block.original_text.replaceAll("*","")]]) {
    assert.equal(core.suggest({ id,editor:"slot:test",scope:"edit",origin:"human",kind:"prose",
      source_ref:ref,original_text:block.original_text,original_hash:block.original_hash,
      new_text:proposed,map_version:"v1" },{}, { directApply:true }).ok,true);
  }
  db.sql.exec("UPDATE suggestions SET status='accepted'");
  assert.equal(core.claimBatch("batch",{ ids:["rendered","real","missing"] }).ok,true);
  db.sql.exec("UPDATE suggestions SET status='applied'");
  db.sql.exec("UPDATE apply_batches SET phase='done',commit_sha='commit'");
  async function response(body, status) {
    const result = await call(body); assert.equal(result.status,status);
    const serialized = await result.text();
    for (const marker of [block.original_text,"HTTP_RENDERED_SECRET_EDIT","original_text","new_text"])
      assert.equal(serialized.includes(marker),false);
    return JSON.parse(serialized);
  }
  const dry = await response({ dry_run:true },200);
  for (const row of dry.suggestions) {
    assert.equal(row.rendered_match,row.id === "rendered");
    assert.equal(row.noop_verified,false); assert.equal(row.normalized_match,false);
  }
  for (const match of ["exact","normalized"])
    assert.equal((await response({ suggestion_ids:["rendered"],match },400)).reason,"not_noop");
  for (const id of ["real","missing"])
    assert.equal((await response({ suggestion_ids:["rendered",id],match:"rendered",
      rendered_match:true,original_hash:block.original_hash },400)).reason,"not_noop");
  assert.equal(core.productionReleaseAudit().counts.noop_applications,0);
  const body = { suggestion_ids:["rendered"],match:"rendered" };
  assert.equal((await response(body,201)).inserted,1);
  assert.equal((await response(body,200)).replay,true);
  for (const match of ["exact","normalized"])
    assert.equal((await response({ ...body,match },409)).reason,"idempotency_conflict");
  assert.equal(core._one("SELECT match FROM production_noop_applications").match,"rendered");
  assert.equal(core.productionReleaseAudit().counts.noop_applications_rendered,1);
});
