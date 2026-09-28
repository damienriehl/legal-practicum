import { test } from "node:test";
import assert from "node:assert/strict";
import { worker, durableObject, EditorStore } from "./coverage-runtime-helper.mjs";
import { reviewNoopReconcileEndpoint } from "../src/editor-endpoints.js";

const origin = "https://editor.example.test";
const path = "/edit/v1/publisher/review/reconcile-noop";
const auth = { editor:"service:test",credential_channel:"bearer",scopes:{ admin:{ granted:true } } };
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
  assert.deepEqual(await dry.json(),{ ok:true,dry_run:true,suggestions:[{ id:"historic",noop_verified:true,normalized_match:true }] });
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
    ok:true,dry_run:true,suggestions:[{ id:"norm",noop_verified:false,normalized_match:true }] });
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
