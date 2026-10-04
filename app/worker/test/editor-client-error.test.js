import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientErrorEndpoint, clientErrorsEndpoint } from '../src/editor-endpoints.js';

import { makeCore } from './editor-sql-helper.mjs';

const auth = { editor: 'slot:john' };
const payload = { kind: 'send-failed', page: 'matters/m05-dwi-meridian/index.html', status: 0 };
function request(body = payload, headers = { 'X-Edit-Request': '1' }) {
  return new Request('https://editor.example/edit/v1/client-error', {
    method: 'POST', headers, body: JSON.stringify(body),
  });
}
function environment(ok = true) {
  const calls = [];
  const core = makeCore();
  return { calls, core, EDITOR: { getByName: () => core }, BUDGET: { getByName(name) {
    assert.equal(name, 'global-v1');
    return { claimAssessmentRequest(identity, max) { calls.push({ identity, max }); return { ok }; } };
  } } };
}
test('client errors require authentication and CSRF before logging', async () => {
  const env = environment();
  assert.equal((await clientErrorEndpoint(request(), env, {})).status, 403);
  assert.equal((await clientErrorEndpoint(request(payload, {}), env, auth)).status, 403);
  assert.equal((await clientErrorEndpoint(request(payload, { 'X-Edit-Request': '1', Origin: 'https://evil.example' }), { ...env, EDIT_ORIGIN: 'https://editor.example' }, auth)).status, 403);
  assert.equal(env.calls.length, 0);
});
test('client error validation excludes text, queries, oversized and malformed bodies', async () => {
  const env = environment();
  for (const body of [null, [], { ...payload, text: 'private paragraph' },
    { ...payload, page: 'index.html?token=private' }, { ...payload, page: '../private' },
    { ...payload, page: 'a'.repeat(257) }, { ...payload, kind: 'anything' },
    { ...payload, status: -1 }, { ...payload, status: 600 }, { ...payload, status: '500' }]) {
    assert.equal((await clientErrorEndpoint(request(body), env, auth)).status, 400);
  }
  assert.equal((await clientErrorEndpoint(request({ ...payload, page: 'a'.repeat(2000) }), env, auth)).status, 413);
  assert.equal(env.calls.length, 0);
});
test('client error rate limiting uses the atomic identity gate and logs only metadata', async () => {
  const logs = [], original = console.log;
  console.log = message => logs.push(JSON.parse(message));
  try {
    const env = environment();
    for (const kind of ['signed-out', 'send-failed', 'conflict', 'server-error']) {
      assert.equal((await clientErrorEndpoint(request({ ...payload, kind }), env, auth)).status, 200);
    }
    assert.deepEqual(env.calls[0], { identity: 'editor-client-error:JOS', max: 30 });
    assert.equal(logs.length, 4);
    const items = env.core.listClientErrors(0);
    assert.equal(items.length, 4);
    assert.deepEqual(items.map(i => i.kind), ['signed-out', 'send-failed', 'conflict', 'server-error']);
    assert.ok(items.every(i => i.attribution === 'JOS'));
    assert.deepEqual(Object.keys(items[0]).sort(), ['at', 'attribution', 'kind', 'page', 'status']);
    for (const log of logs) {
      assert.equal(log.ev, 'editor_client_error');
      assert.deepEqual(Object.keys(log).sort(), ['ev', 'kind', 'page', 'status', 't']);
    }
    const limited = environment(false);
    assert.equal((await clientErrorEndpoint(request(), limited, auth)).status, 429);
    assert.deepEqual(limited.core.listClientErrors(0), []);
    assert.equal(logs.length, 4);
  } finally { console.log = original; }
});

test('client errors migrate existing stores idempotently, prune 30 days and cap at 1000', () => {
  let now = 100000;
  const core = makeCore(() => now);
  const exec = core.sql.exec.bind(core.sql);
  core.sql.exec = (query, ...binds) => {
    assert.ok(binds.length < 90, 'client error SQL must stay under 90 bound parameters');
    return exec(query, ...binds);
  };
  core.sql.exec("DROP TABLE client_errors");
  core.sql.exec("DELETE FROM editor_schema_migrations WHERE id='client-errors-v1'");
  core.initSchema(); core.initSchema();
  const report = { ...payload, attribution: 'JOS', text: 'must never be stored' };
  core.recordClientError(report);
  now += 30 * 86400000;
  core.recordClientError(report);
  assert.equal(core.listClientErrors(0).length, 2); // exactly 30 days remains
  now++;
  core.recordClientError(report);
  assert.equal(core.listClientErrors(0).length, 2);
  for (let i = 0; i < 1001; i++) core.recordClientError(report);
  assert.equal(core.sql.exec("SELECT COUNT(*) AS n FROM client_errors").toArray()[0].n, 1000);
  const first = core.listClientErrors(0);
  assert.equal(first.length, 200);
  assert.ok(first.every(i => Object.keys(i).sort().join(',') === 'at,attribution,kind,page,status'));
  const second = core.listClientErrors(first.at(-1).at);
  assert.equal(second.length, 200);
  assert.ok(second[0].at > first.at(-1).at); // no loss at same-clock timestamps
  assert.equal(core.sql.exec("SELECT COUNT(*) AS n FROM editor_schema_migrations WHERE id='client-errors-v1'").toArray()[0].n, 1);
});

test('client error reads are admin gated and validate the epoch cursor', async () => {
  const env = environment();
  const get = since => new Request('https://editor.example/edit/v1/client-errors' + since);
  for (const identity of [{}, auth, { scopes: { admin: { granted: false } } }])
    assert.equal((await clientErrorsEndpoint(get('?since=0'), env, identity)).status, 403);
  const admin = { scopes: { admin: { granted: true } } };
  for (const since of ['', '-1', '1.2', 'NaN', 'Infinity', '9007199254740992', '1e3', ' '])
    assert.equal((await clientErrorsEndpoint(get('?since=' + encodeURIComponent(since)), env, admin)).status, 400);
  env.core.recordClientError({ ...payload, attribution: 'JOS' });
  const response = await clientErrorsEndpoint(get('?since=0'), env, admin);
  const result = await response.json();
  assert.equal(result.ok, true); assert.equal(result.items.length, 1);
  const after = await clientErrorsEndpoint(get('?since=' + result.items[0].at), env, admin);
  assert.deepEqual((await after.json()).items, []);
});
