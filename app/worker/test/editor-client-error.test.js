import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientErrorEndpoint } from '../src/editor-endpoints.js';

const auth = { editor: 'slot:john' };
const payload = { kind: 'send-failed', page: 'matters/m05-dwi-meridian/index.html', status: 0 };
function request(body = payload, headers = { 'X-Edit-Request': '1' }) {
  return new Request('https://editor.example/edit/v1/client-error', {
    method: 'POST', headers, body: JSON.stringify(body),
  });
}
function environment(ok = true) {
  const calls = [];
  return { calls, BUDGET: { getByName(name) {
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
    for (const log of logs) {
      assert.equal(log.ev, 'editor_client_error');
      assert.deepEqual(Object.keys(log).sort(), ['ev', 'kind', 'page', 'status', 't']);
    }
    assert.equal((await clientErrorEndpoint(request(), environment(false), auth)).status, 429);
    assert.equal(logs.length, 4);
  } finally { console.log = original; }
});
