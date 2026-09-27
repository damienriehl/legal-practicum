import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { renderAssessmentReviewPage } from '../src/assessment-view.js';

const source = readFileSync(new URL('../../editor/assessment-review.js', import.meta.url), 'utf8');
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const tick = () => new Promise((resolve) => setImmediate(resolve));

// Minimal DOM doubles: selectors, bubbling targets, reset, focus and replacement.
// The controller itself runs in the VM; no save/refresh logic is reimplemented.
function harness() {
  let document;
  class Element {
    constructor(tag, attrs = {}, children = []) {
      this.tag = tag;
      this.attrs = attrs;
      this.id = attrs.id;
      this.hidden = !!attrs.hidden;
      this.disabled = false;
      this.value = attrs.value || '';
      this.checked = false;
      this.textContent = attrs.text || '';
      this.dataset = {};
      this.children = children;
      for (const child of children) child.parent = this;
      this.classList = { add: (name) => { this.attrs.class = `${this.attrs.class || ''} ${name}`; } };
    }
    matches(selector) {
      if (selector.includes(',')) return selector.split(',').some((s) => this.matches(s.trim()));
      if (selector.includes(' ')) {
        const [ancestor, self] = selector.split(' ');
        return this.matches(self) && !!this.parent?.closest(ancestor);
      }
      const tag = selector.match(/^[a-z]+/)?.[0];
      if (tag && tag !== this.tag) return false;
      const cls = selector.match(/\.([\w-]+)/)?.[1];
      if (cls && !(this.attrs.class || '').split(' ').includes(cls)) return false;
      return [...selector.matchAll(/\[([^=\]]+)(?:=([^\]]+))?\]/g)].every(([, key, value]) =>
        value === undefined ? key in this.attrs : this.attrs[key] === value.replaceAll('"', ''));
    }
    querySelectorAll(selector) {
      return this.children.flatMap((child) => [ ...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector) ]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector) || null; }
    setAttribute(key, value) { this.attrs[key] = String(value); }
    getAttribute(key) { return this.attrs[key] ?? null; }
    removeAttribute(key) { delete this.attrs[key]; }
    focus() {
      for (let node = this; node; node = node.parent) if (node.hidden) return;
      document.activeElement = this;
    }
    reset() { for (const field of this.querySelectorAll('input, textarea')) { field.value = field.attrs.value || ''; field.checked = false; } }
    replaceWith(next) {
      const index = this.parent.children.indexOf(this);
      this.parent.children[index] = next;
      next.parent = this.parent;
      this.parent = null;
    }
  }
  function card(id, score = 4) {
    const toggle = new Element('button', { class: 'as-override-toggle', hidden: true, 'aria-controls': `form-${id}`, 'aria-expanded': 'false' });
    const form = new Element('form', { id: `form-${id}`, class: 'as-inline-override', hidden: true }, [
      ...Array.from({ length: 7 }, (_, i) => new Element('input', { type: 'radio', name: 'score', value: String(i + 1) })),
      new Element('textarea', { name: 'note' }),
      new Element('p', { id: `error-${id}`, class: 'as-inline-error', hidden: true }),
      new Element('button', { type: 'submit', class: 'as-record', text: 'Record override' }),
      new Element('button', { class: 'as-cancel' }),
    ]);
    form.dataset = { headingId: id, headingLabel: id.toUpperCase() };
    const result = new Element('article', { id: `heading-${id}`, class: 'as-heading', text: `Score ${score}` }, [toggle, form]);
    return result;
  }
  const main = new Element('main', { 'data-assessment-id': 'audit-1' }, [card('a'), card('b'),
    new Element('section', { id: 'assessment-override-log' }),
    new Element('p', { id: 'assessment-override-status' })]);
  main.dataset.assessmentId = 'audit-1';
  const listeners = {};
  main.addEventListener = (name, callback) => { listeners[name] = callback; };
  document = {
    querySelector: () => main,
    getElementById: (id) => main.querySelectorAll(`[id="${id}"]`)[0] || null,
    importNode: (node) => node,
  };
  const requests = [];
  let reloads = 0;
  const context = { document, crypto: { randomUUID: () => 'test-id' },
    location: { href: 'https://example.test/review', reload: () => { reloads++; } },
    fetch: (url, options) => { const d = deferred(); requests.push({ url, options, ...d }); return d.promise; },
    DOMParser: class { parseFromString(snapshot) {
      return { getElementById: (id) => id === 'assessment-override-log'
        ? new Element('section', { id, text: snapshot.log })
        : card(id.replace('heading-', ''), snapshot.score) };
    } },
  };
  // Expose only the existing private refresh function to test its defensive
  // sequencing independently of the UI's serialization. Its body is unchanged.
  runInNewContext(source.replace('  enhance(main);', '  globalThis.refresh = refreshFromServer;\n  enhance(main);'), context);
  const get = (id) => document.getElementById(id);
  const form = (id) => get(`form-${id}`);
  const fire = (type, target, extra = {}) => listeners[type]({ target, preventDefault() {}, ...extra });
  const fill = (id) => {
    fire('click', get(`heading-${id}`).querySelector('.as-override-toggle'));
    form(id).querySelector('input').checked = true;
    form(id).querySelector('textarea').value = `Reason ${id}`;
    return form(id);
  };
  return { get, form, fire, fill, requests, document, refresh: context.refresh, get reloads() { return reloads; } };
}
const ok = (snapshot) => ({ ok: true, text: async () => snapshot });

for (const action of ['cancel', 'toggle', 'escape']) {
  for (const succeeds of [false, true]) {
    test(`pending ${action} cannot close/reset the form before ${succeeds ? 'success' : 'failure'}`, async () => {
      const h = harness();
      const form = h.fill('a');
      const saving = h.fire('submit', form);
      const toggle = h.get('heading-a').querySelector('.as-override-toggle');
      const cancel = form.querySelector('.as-cancel');
      if (action === 'escape') h.fire('keydown', form.querySelector('textarea'), { key: 'Escape' });
      else h.fire('click', action === 'cancel' ? cancel : toggle);
      assert.equal(form.hidden, false, 'pending form must stay open');
      assert.equal(form.querySelector('textarea').value, 'Reason a');
      assert.equal(form.querySelector('input').checked, true);
      assert.equal(cancel.disabled, true);
      assert.equal(toggle.disabled, true);
      assert.match(h.get('assessment-override-status').textContent, /Saving…/);
      h.requests[0].resolve(succeeds ? ok() : { ok: false, status: 500 });
      if (succeeds) {
        await tick();
        h.fire('keydown', form.querySelector('textarea'), { key: 'Escape' });
        assert.equal(form.hidden, false, 'refresh is part of the pending save');
        h.requests[1].resolve(ok({ score: 1, log: 'a' }));
      }
      await saving;
      if (succeeds) {
        assert.equal(h.form('a').hidden, true);
        assert.equal(h.document.activeElement, h.get('heading-a').querySelector('.as-override-toggle'));
      } else {
        assert.equal(form.hidden, false);
        assert.equal(form.querySelector('textarea').value, 'Reason a');
        assert.equal(form.querySelector('input').checked, true);
        assert.equal(h.document.activeElement, form.querySelector('.as-inline-error'));
        assert.equal(cancel.disabled, false);
        assert.equal(toggle.disabled, false);
      }
      for (const id of ['a', 'b']) {
        assert.equal(h.form(id).querySelector('button[type=submit]').disabled, false);
        assert.equal(h.form(id).querySelector('button[type=submit]').textContent, 'Record override');
      }
    });
  }
}

test('page-wide save lock spans POST and delayed refresh; both committed overrides remain visible', async () => {
  const h = harness();
  const a = h.fill('a');
  const b = h.fill('b');
  const first = h.fire('submit', a);
  h.fire('submit', b);
  h.fire('submit', a);
  assert.equal(h.requests.length, 1, 'no concurrent or duplicate POST');
  for (const form of [a, b]) {
    const record = form.querySelector('button[type=submit]');
    assert.equal(record.disabled, true);
    assert.equal(record.getAttribute('aria-disabled'), 'true');
    assert.equal(record.textContent, 'Saving…');
  }
  assert.deepEqual(JSON.parse(h.requests[0].options.body), {
    id: 'assessment-override-test-id', assessment_id: 'audit-1', heading_id: 'a', score: 1, note: 'Reason a',
  });
  assert.equal(h.requests[0].options.headers['X-Edit-Request'], '1');
  assert.equal(h.requests[0].options.credentials, 'same-origin');
  h.requests[0].resolve(ok());
  await tick();
  const body = deferred();
  h.requests[1].resolve({ ok: true, text: () => body.promise });
  await tick();
  h.fire('submit', b);
  assert.equal(h.requests.length, 2, 'lock persists while GET body is delayed');
  body.resolve({ score: 1, log: 'a' });
  await first;
  const second = h.fire('submit', b);
  h.requests[2].resolve(ok());
  await tick();
  h.requests[3].resolve(ok({ score: 1, log: 'a,b' }));
  await second;
  assert.equal(h.get('assessment-override-log').textContent, 'a,b');
  assert.equal(h.get('heading-a').textContent, 'Score 1');
  assert.equal(h.get('heading-b').textContent, 'Score 1');
});

test('stale refresh body cannot roll back either the card or shared log', async () => {
  const h = harness();
  const older = h.refresh('a');
  const body = deferred();
  h.requests[0].resolve({ ok: true, text: () => body.promise });
  await tick();
  const newer = h.refresh('a');
  h.requests[1].resolve(ok({ score: 7, log: 'a,b' }));
  await newer;
  body.resolve({ score: 1, log: 'a' });
  await older;
  assert.equal(h.get('assessment-override-log').textContent, 'a,b');
  assert.equal(h.get('heading-a').textContent, 'Score 7');
});

test('page explains that overrides require JavaScript without offering a broken form', async () => {
  const html = await renderAssessmentReviewPage({ id: 'audit-1' }).text();
  assert.match(html, /<noscript>.*overrid.*requires JavaScript.*<\/noscript>/i);
});
