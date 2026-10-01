'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../../app/chat/chat.js'), 'utf8');

function room(options = {}) {
  const timers = new Map(), requests = [], notices = [], elements = new Map();
  let callbacks, nextTimer = 0, sends = 0;
  const context = {
    cfg: {sample: false, bypass: '', ...options}, session: null, refs: {input: {value: 'draft'}},
    state: 'IDLE', S: {IDLE: 'IDLE'}, Promise, encodeURIComponent, URLSearchParams,
    location: {search: '?view=chat&scenario=turnstile_late'},
    meta: () => 'mock-sitekey', maxTurns: 20,
    setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    document: {
      getElementById: id => elements.get(id),
      createElement: () => ({style: {}, attrs: {}, appendChild() {}, setAttribute(k, v) { this.attrs[k] = v; }}),
      head: {appendChild() {}},
      body: {appendChild(el) { elements.set(el.id, el); }}
    },
    window: {turnstile: {render(el, opts) { callbacks = opts; return 'widget'; }, reset() { callbacks['before-interactive-callback'](); }}},
    connectionNotice(text) { notices.splice(0, notices.length, text); },
    api(path) {
      requests.push(path);
      if (options.browserMock) return context.window.__SONSTENG_MOCK__({path, method: 'GET'});
      return Promise.resolve(options.response ? options.response(path, requests.length) : {
        ok: path.includes('cf_ts=') || path.includes('bypass='),
        data: path.includes('cf_ts=') || path.includes('bypass=') ? {session_token: 'session'} : {error: {code: 'turnstile_failed'}}
      });
    },
    saveSession() {}, updateCounter() {}, committed: () => [],
    send() { sends++; context.state = 'SENDING'; }
  };
  vm.createContext(context);
  if (options.browserMock) {
    elements.set('hlog', {textContent: ''});
    const html = fs.readFileSync(require('node:path').join(__dirname, '../../app/chat/test.html'), 'utf8');
    const start = html.indexOf('/* ===== in-page mock:');
    vm.runInContext(html.slice(start, html.indexOf('/* ===== load the right app', start)), context);
  }
  vm.runInContext(source.slice(source.indexOf('  var turnstile = (function'), source.indexOf('  /* ============================================================================\n     Scripted-sample')), context);
  vm.runInContext(source.slice(source.indexOf('  function submit()'), source.indexOf('  function send(text)')), context);
  context.turnstile.init();
  return {context, requests, notices, elements, callbacks: () => options.browserMock ? context.window.__TURNSTILE__ : callbacks, sends: () => sends,
    tick() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); }};
}
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

test('managed interactive check suspends timeout; queued double SEND mints and sends once', async () => {
  const r = room();
  r.context.mintSession();
  r.callbacks()['before-interactive-callback']();
  r.context.submit(); r.context.submit();
  r.tick(); await flush();
  assert.equal(r.requests.length, 0);
  assert.deepEqual(r.notices, ['Complete the verification check (bottom right) to connect.']);
  assert.equal(r.elements.get('cf-turnstile').attrs['aria-hidden'], undefined);
  assert.equal(r.elements.get('cf-turnstile').attrs['aria-label'], 'Connection verification');
  r.callbacks()['after-interactive-callback']();
  r.callbacks().callback('mock-token'); await flush();
  assert.equal(r.requests.length, 1);
  assert.equal(r.sends(), 1);
});

test('late token automatically reconnects after tokenless timeout failure', async () => {
  const r = room();
  r.context.mintSession(); r.tick(); await flush();
  assert.equal(r.context.session, null);
  r.callbacks().callback('mock-token'); await flush();
  assert.equal(r.requests.length, 2);
  assert.ok(r.context.session);
});

test('browser late-token fixture fails tokenless first, then mints once and enables SEND', async () => {
  const r = room({browserMock: true});
  r.context.mintSession();
  r.tick(); await flush();
  r.tick(); await flush();
  assert.equal(r.requests.length, 1, 'expected one tokenless mint before verification');
  assert.equal(r.requests[0], '/v1/session');
  assert.equal(r.context.session, null);
  assert.match(r.notices[0], /^Verification could not be completed\./);
  r.callbacks()['after-interactive-callback']();
  r.callbacks().callback('mock-verification-token'); await flush();
  r.tick(); await flush();
  assert.equal(r.requests.length, 2);
  assert.match(r.requests[1], /cf_ts=mock-verification-token/);
  assert.ok(r.context.session);
  r.context.submit(); await flush();
  assert.equal(r.sends(), 1);
  assert.equal(r.requests.length, 2, 'SEND must reuse the successful session');
});

test('late token arriving during tokenless request is used after failure', async () => {
  let answer;
  const r = room({response: (path, n) => n === 1 ? new Promise(resolve => { answer = resolve; }) : {ok: true, data: {session_token: 'session'}}});
  r.context.mintSession(); r.tick(); await flush();
  r.callbacks().callback('mock-token');
  answer({ok: false, data: {error: {code: 'turnstile_failed'}}}); await flush();
  assert.equal(r.requests.length, 2);
  assert.ok(r.requests[1].includes('cf_ts=mock-token'));
  assert.ok(r.context.session);
});

test('SEND retries a failed mint and sends the retained draft', async () => {
  const r = room({response: (path, n) => n === 1 ? {ok: false} : {ok: true, data: {session_token: 'session'}}});
  r.context.mintSession(); r.tick(); await flush();
  r.context.submit();
  r.callbacks().callback('fresh-mock-token'); await flush();
  assert.equal(r.requests.length, 2);
  assert.equal(r.sends(), 1);
});

test('sample and bypass never render an interactive widget', async () => {
  for (const cfg of [{sample: true}, {bypass: 'mock-bypass'}]) {
    const r = room(cfg);
    r.context.window.onloadTurnstileCallback();
    await r.context.mintSession();
    assert.equal(r.elements.size, 0);
    assert.equal(r.requests.length, cfg.sample ? 0 : 1);
  }
});
