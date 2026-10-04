import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../editor/editor.js', import.meta.url), 'utf8');
function node(tag = 'div') {
  const attrs = {}, classes = new Set(), events = {}, children = [];
  return {
    tag, attrs, classes, events, children, textContent: '', innerHTML: '', hidden: false, style: {},
    classList: { add(...names) { names.forEach(n => classes.add(n)); }, remove(...names) { names.forEach(n => classes.delete(n)); },
      contains(n) { return classes.has(n); }, toggle(n, on) { if (on) classes.add(n); else classes.delete(n); } },
    appendChild(child) { child.parentNode = this; children.push(child); return child; },
    insertBefore(child) { child.parentNode = this; children.push(child); return child; },
    setAttribute(k, v) { attrs[k] = v; }, removeAttribute(k) { delete attrs[k]; },
    addEventListener(k, fn) { events[k] = fn; }, focus() {},
  };
}
function textNode(value) {
  return { nodeType: 3, nodeValue: value, get textContent() { return this.nodeValue; } };
}
function textBlock(tag = 'p') {
  const block = node(tag);
  Object.defineProperty(block, 'textContent', {
    get() { return this.children.map(child => child.textContent).join(''); },
    set(value) { this.children.length = 0; this.appendChild(textNode(value)); }
  });
  return block;
}
function harness({ role = 'editor', contact = '', stored = {}, blockedStorage = false } = {}) {
  const body = node('body'), root = node('html'), requests = [], timers = new Map();
  let clock = 0, reloads = 0;
  const memory = new Map(Object.entries(stored));
  const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k) };
  const document = {
    body, documentElement: root, readyState: 'loading',
    createElement: node, createElementNS: (ns, tag) => node(tag), addEventListener() {},
    createTreeWalker(root, whatToShow) {
      assert.equal(whatToShow, 4);
      const texts = [];
      function visit(parent) {
        for (const child of parent.children || []) {
          if (child.nodeType === 3) texts.push(child);
          else visit(child);
        }
      }
      visit(root);
      let index = 0;
      return { nextNode() { return texts[index++] || null; } };
    },
    getElementById(id) { return id === 'editor-map-data' ? { textContent: JSON.stringify({ page: 'index.html', viewer_role: role, help_contact: contact, student_view_url: 'https://example.org/platform/', blocks: [] }) } : null; },
  };
  const window = { addEventListener() {}, requestAnimationFrame() {}, crypto: null };
  for (const name of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(window, name, { get() { if (blockedStorage) throw new Error('disabled'); return storage; } });
  }
  const context = {
    window, document, NodeFilter: { SHOW_TEXT: 4 }, location: { pathname: '/edit/index.html', reload() { reloads++; } }, TextEncoder,
    setTimeout(fn) { timers.set(++clock, fn); return clock; }, clearTimeout(id) { timers.delete(id); }, setInterval() {},
    fetch: async (url, opts) => { requests.push({ url, opts }); return { ok: true, status: 200, json: async () => ({}) }; },
  };
  runInNewContext(source.replace("  if (document.readyState === 'loading')", `  window.testClient = { api: api, makeSession: makeSession, makeEditable: makeEditable,
    sendSuggestion: sendSuggestion, armRetry: armRetry, buildBanner: buildBanner, reconcileDraft: reconcileDraft,
    finishEditing: finishEditing, wireBlock: wireBlock,
    scheduleAutoSave: scheduleAutoSave, signedOut: function () { return signedOut; } };
  if (document.readyState === 'loading')`), context);
  return { context, window, client: window.testClient, memory, body, root, requests, timers, get reloads() { return reloads; } };
}
function session(h, text = 'Source\n    paragraph.') {
  const block = textBlock(); block.textContent = text; block.parentNode = h.body;
  const s = h.client.makeSession({ index: 0, source_ref: 'data/copy/test.json#body.b12345678', kind: 'prose', original_text: text, original_hash: 'hash' }, block, true, false);
  s._status = node('span');
  return s;
}
test('R2 opaque Access redirect and 401 save drafts, cancel timers, and show one reload panel', async () => {
  for (const response of [{ type: 'opaqueredirect', status: 0 }, { status: 401 }]) {
    const h = harness(), s = session(h);
    s.dirty = true; s.snapshot = 'John’s unsent words'; s.suggestionId = 'draft-id';
    h.client.scheduleAutoSave(s);
    h.context.fetch = async (url, opts) => {
      h.requests.push({ url, opts });
      return url.endsWith('/client-error') ? { ok: true, status: 200, json: async () => ({}) } : response;
    };
    await h.client.api('/suggest', { body: { new_text: s.snapshot } });
    await h.client.api('/pending', { method: 'GET' });
    assert.equal(h.client.signedOut(), true);
    assert.equal(h.timers.size, 0);
    assert.equal(h.body.children.length, 1);
    const panel = h.body.children[0];
    assert.equal(panel.children[0].textContent, "You've been signed out. Your words are saved.");
    assert.equal(panel.children[1].textContent, 'Sign in again');
    assert.equal(panel.children[2].textContent, "We'll email you a link - just click it.");
    h.client.makeEditable(s, true);
    h.client.finishEditing();
    assert.equal(s.dirty, true);
    panel.children[1].events.click(); assert.equal(h.reloads, 1);
    assert.equal(h.requests[0].opts.redirect, 'manual');
    const draft = [...h.memory.entries()].find(([k]) => k.startsWith('sonsteng_edit_draft:'));
    assert.equal(JSON.parse(draft[1]).new_text, s.snapshot);
    const resumed = harness({ stored: Object.fromEntries(h.memory) });
    const restored = session(resumed); resumed.client.reconcileDraft(restored);
    assert.equal(restored.snapshot, s.snapshot);
    assert.equal(restored.suggestionId, 'draft-id');
    assert.equal(h.requests.filter(r => r.url.endsWith('/suggest')).length, 1);
    const report = JSON.parse(h.requests.find(r => r.url.endsWith('/client-error')).opts.body);
    assert.deepEqual(report, { kind: 'signed-out', page: 'index.html', status: 401 });
  }
});
test('R3 edit entry collapses source text nodes in place and whitespace-only Done sends nothing', () => {
  const h = harness(), s = session(h);
  const sourceNode = s.el.children[0];
  h.client.wireBlock(s);
  h.client.makeEditable(s, true);
  assert.equal(s.el.textContent, 'Source paragraph.');
  assert.equal(s.el.children[0], sourceNode);
  assert.equal(sourceNode.nodeValue, 'Source paragraph.');
  assert.equal(s.dirty, false);
  assert.equal(h.window.SonstengEditor.normalize(s.originalText), h.window.SonstengEditor.normalize(s.el.textContent));
  sourceNode.nodeValue = '  Source\n    paragraph.  ';
  s.el.events.input();
  assert.equal(s.dirty, false);
  h.client.finishEditing();
  assert.equal(s.el.children[0], sourceNode);
  assert.equal(h.requests.length, 0);
  assert.equal(s.dirty, false);
});
test('F1 edit entry and unchanged Done preserve inline links without sending', () => {
  const h = harness(), block = textBlock(), link = textBlock('a');
  const leading = textNode('  Source\n    '), linked = textNode('paragraph\t  text');
  const trailing = textNode('.\n  ');
  link.setAttribute('href', '/guide');
  link.appendChild(linked);
  block.appendChild(leading); block.appendChild(link); block.appendChild(trailing);
  Object.defineProperty(block, 'innerHTML', {
    get() { return this.children.map(child => child === link
      ? '<a href="' + link.attrs.href + '">' + link.textContent + '</a>'
      : child.textContent).join(''); },
    set() { assert.fail('Edit entry and unchanged Done must not rewrite innerHTML'); }
  });
  block.parentNode = h.body;
  const s = h.client.makeSession({ index: 0, source_ref: 'linked', kind: 'prose',
    original_text: block.textContent, original_hash: 'hash' }, block, true, false);
  s._status = node('span');
  h.client.wireBlock(s); h.client.makeEditable(s, true);
  const collapsed = 'Source <a href="/guide">paragraph text</a>.';
  assert.equal(block.innerHTML, collapsed);
  assert.equal(block.textContent, 'Source paragraph text.');
  assert.equal(block.children.length, 3);
  assert.equal(block.children[0], leading);
  assert.equal(block.children[1], link);
  assert.equal(block.children[2], trailing);
  assert.equal(link.children[0], linked);
  assert.equal(leading.nodeValue, 'Source ');
  assert.equal(linked.nodeValue, 'paragraph text');
  assert.equal(trailing.nodeValue, '.');
  assert.equal(s.dirty, false);
  assert.equal('contenteditable' in block.attrs, true);
  h.client.finishEditing();
  assert.equal(block.innerHTML, collapsed);
  assert.equal(block.children.length, 3);
  assert.equal(block.children[0], leading);
  assert.equal(block.children[1], link);
  assert.equal(block.children[2], trailing);
  assert.equal(link.children[0], linked);
  assert.equal(link.attrs.href, '/guide');
  assert.equal('contenteditable' in block.attrs, false);
  assert.equal(h.requests.length, 0);
  assert.equal(s.dirty, false);
});
test('R4 author bar, help contact, type defaults and preferences; admin keeps tools', () => {
  for (const options of [{}, { contact: 'Contact Damien through the office' }, { blockedStorage: true },
    { stored: { 'sonsteng-type-lg': '0' } }, { role: 'admin' }]) {
    const h = harness(options); h.client.buildBanner();
    const banner = h.body.children[0], children = banner.children;
    const author = options.role !== 'admin';
    assert.equal(h.root.classes.has('type-lg'), author && !options.stored);
    assert.equal(children.some(n => n.attrs.href === '/edit/history/'), !author);
    assert.equal(children.some(n => n.attrs.href === 'https://example.org/platform/'), !author);
    assert.equal(h.window.SonstengEditor.bannerText(), author
      ? "You're editing the practicum. Click EDIT beside any paragraph to change it. Changes save on their own."
      : 'You’re editing — changes go to Damien for review.');
    if (author) {
      const help = children.find(n => n.textContent === 'Help'); help.events.click();
      const panel = children.find(n => n.className === 'editor-help');
      assert.equal(panel.hidden, false);
      assert.equal(panel.children[1].textContent, options.contact || 'Leave a comment - Damien reads every one.');
      assert.ok(children.some(n => n.textContent === 'Suggest a bigger change'));
      const toggle = children.find(n => n.className === 'segmented-toggle');
      toggle.children[0].events.click();
      assert.equal(h.root.classes.has('type-lg'), false);
      if (!options.blockedStorage) assert.equal(h.memory.get('sonsteng-type-lg'), '0');
    }
  }
});
test('R5 conflicts and 5xx are reported once without recursive telemetry', async () => {
  const h = harness();
  h.window.__EDITOR_MOCK__ = req => {
    h.requests.push(req);
    return { ok: false, status: req.path === '/conflict' ? 409 : 503, data: {} };
  };
  await h.client.api('/conflict'); await h.client.api('/server'); await h.client.api('/server');
  const reports = h.requests.filter(r => r.path === '/client-error');
  assert.equal(reports.length, 2);
  assert.equal(reports[0].body.kind, 'conflict');
  assert.equal(reports[1].body.kind, 'server-error');
  for (const r of reports) assert.equal(Object.keys(r.body).sort().join(','), 'kind,page,status');
});
test('R5 exhausted automatic retries report failure and stop retrying', async () => {
  const h = harness(), s = session(h);
  s.dirty = true; s.snapshot = 'Unsent words'; s._lastFailureStatus = 0;
  for (let i = 0; i < 4; i++) { h.timers.clear(); h.client.armRetry(s); }
  assert.equal(h.timers.size, 0);
  await Promise.resolve();
  assert.equal(JSON.parse(h.requests[0].opts.body).kind, 'send-failed');
});
