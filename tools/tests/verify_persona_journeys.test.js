'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  attributeMatches,
  bindingReviewCount,
  collapseWhitespace,
  controlNameMatches,
  decorateBindingAttempt,
  fetchBuild,
  filenameMatches,
  liveRegionTextMatches,
  navigationIsReady,
  normalizeControlName,
  requireElement,
  selectControlCandidate,
  uatWorkspacePath,
  waitForAttribute,
} = require('../verify_persona_journeys.js');

test('binding output preserves the red-team REVIEW count separately from its verdict', () => {
  const attempt = {journey: 'd6-redteam', verdict: 'PASS'};
  const output = [
    'REVIEW  d4-verify-speed                    ambiguous planted-fact response — inspect: "I could not tell you."',
    '-'.repeat(90),
    'PASS 11  FAIL 0  REVIEW 1  (of 12)',
    'REVIEW items need a human read of the quoted reply.',
  ].join('\n');

  assert.equal(bindingReviewCount(output), 1);
  assert.equal(bindingReviewCount('PASS ordinary-binding'), null);
  assert.deepEqual(decorateBindingAttempt(attempt, output), {
    journey: 'd6-redteam',
    verdict: 'PASS',
    review_count: 1,
  });
  assert.deepEqual(decorateBindingAttempt(attempt, 'PASS ordinary-binding'), attempt);
  assert.equal(Object.hasOwn(decorateBindingAttempt(attempt, 'PASS ordinary-binding'), 'review_count'), false);
});

test('URL waits require both the expected location and a complete document', () => {
  assert.equal(navigationIsReady('/platform/skills/', 'https://example.test/platform/skills/', 'loading'), false);
  assert.equal(navigationIsReady('/platform/skills/', 'https://example.test/platform/skills/', 'interactive'), false);
  assert.equal(navigationIsReady('/platform/skills/', 'https://example.test/platform/skills/', 'complete'), true);
  assert.equal(navigationIsReady('#SK-LP-07', 'https://example.test/platform/skills/#SK-LP-07', 'complete'), true);
  assert.equal(navigationIsReady('/platform/skills/', 'https://example.test/platform/', 'complete'), false);
});

test('attribute matching supports exact values, includes, and absent attributes', () => {
  assert.equal(attributeMatches('true', 'true', undefined), true);
  assert.equal(attributeMatches('false', 'true', undefined), false);
  assert.equal(attributeMatches('/downloads/packet.zip', undefined, 'packet.zip'), true);
  assert.equal(attributeMatches(null, null, undefined), true);
  assert.equal(attributeMatches('', null, undefined), false);
});

test('attribute waits poll until the expected value is observed', async () => {
  const values = ['false', 'false', 'true'];
  let attempts = 0;
  const handle = {
    evaluate: async (_reader, attribute) => {
      assert.equal(attribute, 'aria-pressed');
      const value = values[Math.min(attempts, values.length - 1)];
      attempts += 1;
      return value;
    },
  };

  assert.deepEqual(
    await waitForAttribute(handle, 'aria-pressed', 'true', undefined, 1000),
    {matched: true, actual: 'true'},
  );
  assert.equal(attempts, 3);
});

test('control lookup polls briefly for a selector that appears after navigation', async () => {
  const handle = {id: 'late-control'};
  let attempts = 0;
  const page = {
    $: async (selector) => {
      assert.equal(selector, '#SK-LP-07 > summary');
      attempts += 1;
      return attempts < 3 ? null : handle;
    },
  };

  assert.equal(
    await requireElement(page, {op: 'click', selector: '#SK-LP-07 > summary'}, {timeout: 1000}),
    handle,
  );
  assert.equal(attempts, 3);
});

test('whitespace collapse normalizes text assertion content', () => {
  assert.equal(collapseWhitespace('  19,077\n\tMinnesota   attorneys  '), '19,077 Minnesota attorneys');
  assert.equal(collapseWhitespace(null), '');
});

test('download filename patterns support glob wildcards literally', () => {
  assert.equal(filenameMatches('m05-*.zip', 'm05-dwi-meridian-student-materials.zip'), true);
  assert.equal(filenameMatches('packet-?.zip', 'packet-1.zip'), true);
  assert.equal(filenameMatches('packet-?.zip', 'packet-10.zip'), false);
  assert.equal(filenameMatches('matter[1].zip', 'matter[1].zip'), true);
  assert.equal(filenameMatches('matter[1].zip', 'matter1.zip'), false);
});

test('control names collapse whitespace and compare case-insensitively', () => {
  assert.equal(normalizeControlName('  The\n  Evidence  '), 'the evidence');
  assert.equal(controlNameMatches('THE EVIDENCE', 'The Evidence'), true);
  assert.equal(controlNameMatches('Open the library →', 'open the library'), true);
  assert.equal(controlNameMatches('The Demonstration', 'The Evidence'), false);
});

test('name lookup prefers a visible match over an earlier hidden match', () => {
  const candidates = [
    {index: 0, name: 'The Evidence', visible: false},
    {index: 1, name: 'THE EVIDENCE', visible: true},
  ];

  assert.deepEqual(selectControlCandidate(candidates, 'The Evidence'), candidates[1]);
});

test('name lookup distinguishes a hidden match from no match', () => {
  const hidden = {index: 0, name: 'The Evidence', visible: false};

  assert.deepEqual(selectControlCandidate([hidden], 'the evidence'), hidden);
  assert.equal(selectControlCandidate([hidden], 'Open'), null);
});

test('name lookup ranks an exact link above an earlier visible containing container', () => {
  const candidates = [
    {index: 0, name: 'Module 1 — Foundational Fact gathering Client counseling', visible: true, interactive: false, tabIndex: 0},
    {index: 1, name: 'Fact gathering', visible: true, interactive: true, tabIndex: 0},
  ];

  assert.deepEqual(selectControlCandidate(candidates, 'Fact gathering'), candidates[1]);
});

test('name lookup excludes a non-interactive tabindex minus-one main', () => {
  const main = {index: 0, name: 'Module 1 — Foundational Fact gathering', visible: true, interactive: false, tabIndex: -1};
  const link = {index: 1, name: 'Fact gathering', visible: true, interactive: true, tabIndex: 0};

  assert.deepEqual(selectControlCandidate([main, link], 'Fact gathering'), link);
  assert.equal(selectControlCandidate([main], 'Fact gathering'), null);
});

test('name lookup prefers the shortest visible name among substring-only matches', () => {
  const candidates = [
    {index: 0, name: 'Taxonomy Skills browser 26 surveyed skills across the curriculum', visible: true},
    {index: 1, name: 'Skills browser 26 surveyed', visible: true},
  ];

  assert.deepEqual(selectControlCandidate(candidates, 'Skills browser'), candidates[1]);
});

test('live-region text comparison uses collapsed case-sensitive DOM text', () => {
  assert.equal(liveRegionTextMatches(['20 matters', 'page 1 of 1'], '20 matters'), true);
  assert.equal(liveRegionTextMatches(['20 MATTERS', 'PAGE 1 OF 1'], '20 matters'), false);
});

test('UAT workspace paths stay under the repository build tree and sanitize components', () => {
  const expected = path.resolve(__dirname, '..', '..', 'build', 'uat', 'downloads', 'run-01', 'journey-phone-0');

  assert.equal(uatWorkspacePath('downloads', 'run 01', 'journey/phone/0'), expected);
  assert.throws(() => uatWorkspacePath('screenshots', 'run-01'), /unsupported UAT workspace kind/);
  assert.throws(() => uatWorkspacePath('downloads', '..', '..', 'escaped'), /unsafe UAT workspace component/);
  assert.throws(() => uatWorkspacePath('profiles', '.'), /unsafe UAT workspace component/);
});

test('binding provenance requests the environment Worker release endpoint with GET', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  const requests = [];
  global.fetch = async (...args) => {
    requests.push(args);
    return new Response('', {headers: {'x-release-sha': 'release-123'}});
  };

  assert.deepEqual(await fetchBuild(null, null, 'dev', true), {
    spine_build_id: null,
    git_base_sha: null,
    release_sha: 'release-123',
  });
  assert.deepEqual(await fetchBuild(null, null, 'prod', true), {
    spine_build_id: null,
    git_base_sha: null,
    release_sha: 'release-123',
  });
  assert.deepEqual(requests.map(([url, options]) => ({url: String(url), method: options.method, redirect: options.redirect})), [
    {
      url: 'https://sonsteng-chat.damienriehl.workers.dev/edit/release-provenance',
      method: 'GET',
      redirect: 'manual',
    },
    {
      url: 'https://sonsteng-chat-production.damienriehl.workers.dev/edit/release-provenance',
      method: 'GET',
      redirect: 'manual',
    },
  ]);
  assert.ok(requests.every(([, options]) => options.signal instanceof AbortSignal));
});

test('unreachable binding provenance records nulls and reports the reason', async (t) => {
  const originalFetch = global.fetch;
  const originalWarn = console.warn;
  const warnings = [];
  t.after(() => { global.fetch = originalFetch; console.warn = originalWarn; });
  global.fetch = async () => { throw new Error('offline fixture'); };
  console.warn = (message) => warnings.push(message);

  assert.deepEqual(await fetchBuild(null, null, 'prod', true), {
    spine_build_id: null,
    git_base_sha: null,
    release_sha: null,
  });
  assert.match(warnings.join('\n'), /release provenance unavailable.*offline fixture/i);
});

// Exercise the real step dispatcher without adding a test-only production export.
// DOM geometry and animation frames are deterministic; browser callbacks run intact.
function actionFixture({movingForever = false, hidden = false, detached = false, noFrames = false, staticTarget = false, offscreen = true} = {}) {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const {createRequire} = require('node:module');
  const runner = path.resolve(__dirname, '../verify_persona_journeys.js');
  let frame = 0;
  let actedAt = null;
  let disposed = false;
  let scrolled = false;
  const window = {scrollX: 40, scrollY: 100, innerWidth: 800, innerHeight: 600};
  const targetY = offscreen ? 1000 : 200;
  const element = {
    isConnected: !detached,
    checkVisibility: () => !hidden,
    scrollIntoView: () => { scrolled = true; window.scrollY = Math.max(0, targetY - (window.innerHeight - 30) / 2); },
    getBoundingClientRect: () => ({x: staticTarget ? 20 : movingForever ? frame * 4 : Math.min(frame, 5) * 4, y: targetY - window.scrollY, width: 80, height: 30}),
  };
  const context = vm.createContext({
    require: createRequire(runner), module: {exports: {}}, __dirname: path.dirname(runner),
    setTimeout, clearTimeout,
    requestAnimationFrame: (callback) => noFrames ? 0 : setTimeout(() => { frame++; callback(); }, 5),
    cancelAnimationFrame: clearTimeout,
  });
  vm.runInContext(fs.readFileSync(runner, 'utf8') + '\nmodule.exports.performStep = performStep;', context);
  const handle = {
    evaluate: async (callback, ...args) => callback(element, ...args),
    isIntersectingViewport: async ({threshold}) => {
      assert.equal(threshold, 1);
      const box = element.getBoundingClientRect();
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= window.innerWidth && box.y + box.height <= window.innerHeight;
    },
    click: async () => { actedAt = frame; },
    focus: async () => { actedAt = frame; },
    dispose: async () => { disposed = true; },
  };
  const page = {
    $: async () => handle,
    waitForFunction: async (callback, _options, target, ...args) => {
      if (!callback(element, ...args)) throw new Error('visibility timeout');
    },
  };
  return {
    run: (op, timeout = 100) => context.module.exports.performStep(page, {op, selector: '#moving', timeout_ms: timeout}, {}),
    state: () => ({actedAt, disposed, scrolled, scrollX: window.scrollX, scrollY: window.scrollY, box: element.getBoundingClientRect()}),
  };
}

for (const op of ['click', 'focus']) {
  test(`${op} preserves window scroll position for an already-visible static target`, async () => {
    const fixture = actionFixture({staticTarget: true, offscreen: false});
    const before = fixture.state();
    await fixture.run(op, 1000);
    const after = fixture.state();
    assert.equal(after.scrollX, before.scrollX);
    assert.equal(after.scrollY, before.scrollY);
    assert.equal(after.scrolled, false);
    assert.ok(after.actedAt >= 2, 'action ran before stability was measured');
    assert.equal(after.disposed, true);
  });

  test(`${op} scrolls an off-screen static target into view before acting`, async () => {
    const fixture = actionFixture({staticTarget: true});
    const before = fixture.state();
    assert.ok(before.box.y >= 600);
    await fixture.run(op, 1000);
    const after = fixture.state();
    assert.notEqual(after.scrollY, before.scrollY);
    assert.equal(after.scrolled, true);
    assert.ok(after.box.y >= 0 && after.box.y + after.box.height <= 600);
    assert.ok(after.actedAt >= 2, 'action ran before stability was measured');
    assert.equal(after.disposed, true);
  });

  test(`${op} waits for consecutive stable frames after scrolling a moving target`, async () => {
    const fixture = actionFixture();
    await fixture.run(op, 1000);
    assert.ok(fixture.state().actedAt >= 6, 'action ran before the target settled');
    assert.equal(fixture.state().scrolled, true);
    assert.equal(fixture.state().disposed, true);
  });

  test(`${op} rejects a never-stable target within the timeout and releases its handle`, async () => {
    const fixture = actionFixture({movingForever: true});
    const started = Date.now();
    await assert.rejects(fixture.run(op), new RegExp(`${op}: control not stable.*#moving.*100ms`));
    assert.ok(Date.now() - started < 500, 'stability timeout was not bounded');
    assert.equal(fixture.state().actedAt, null);
    assert.equal(fixture.state().disposed, true);
  });
}

test('stability deadline still fires when animation frames stop', async () => {
  const fixture = actionFixture({noFrames: true});
  await assert.rejects(fixture.run('click'), /control not stable/);
  assert.equal(fixture.state().actedAt, null);
  assert.equal(fixture.state().disposed, true);
});

for (const state of ['hidden', 'detached']) {
  test(`a ${state} target is never clicked and retains the visibility failure`, async () => {
    const fixture = actionFixture({[state]: true});
    await assert.rejects(fixture.run('click'), /click: control not visible \(#moving\)/);
    assert.equal(fixture.state().actedAt, null);
    assert.equal(fixture.state().disposed, true);
  });
}
