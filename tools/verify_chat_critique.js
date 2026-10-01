/* Mock-only browser gate for interview and critique behavior/layout.
   Default: file:// app/chat/test.html. For a repo-root static server:
   CHAT_HARNESS_URL=http://127.0.0.1:8000/app/chat/test.html node tools/verify_chat_critique.js */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const MATRIX = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'platform_browser_matrix.json'), 'utf8')
);
const HARNESS = process.env.CHAT_HARNESS_URL || 'file://' + path.join(REPO, 'app', 'chat', 'test.html');
const QUERY = {
  interview: '?view=chat&matter=m05&persona=m05.per.halvard&title=State%20v.%20Halvard&client=Devon%20Halvard&scenario=normal',
  critique: '?view=critique&matter=m05&title=Suppression%20Memo%20Critique'
};

function loadPuppeteer() {
  const candidates = [
    process.env.PUP_DIR,
    'puppeteer',
    '/home/damienriehl/.npm/_npx/7d92d9a2d2ccc630/node_modules/puppeteer'
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (_) {}
  }
  throw new Error('Puppeteer unavailable (set PUP_DIR or install puppeteer)');
}

async function setTypeMode(page, large) {
  await page.evaluateOnNewDocument(
    (on) => localStorage.setItem('sonsteng-type-lg', on ? '1' : '0'),
    large
  );
}

async function inspectLayout(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const inProduct = (element) => !element.closest('#harness');
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter((element) => visible(element) && inProduct(element));
    let previousLevel = 0;
    const jumps = [];
    headings.forEach((heading) => {
      const level = +heading.tagName[1];
      if (previousLevel && level > previousLevel + 1) jumps.push(`h${previousLevel}->h${level}`);
      previousLevel = level;
    });
    const controls = [...document.querySelectorAll('button,input,textarea,select')]
      .filter((element) => visible(element) && inProduct(element))
      .map((element) => ({
        text: (element.textContent || element.getAttribute('aria-label') || '').trim(),
        w: element.getBoundingClientRect().width,
        h: element.getBoundingClientRect().height
      }))
      .filter((control) => control.w < 24 || control.h < 24);
    return {
      h1: headings.filter((heading) => heading.tagName === 'H1').length,
      jumps,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      large: document.documentElement.classList.contains('type-lg'),
      controls
    };
  });
}

async function exerciseInterview(page) {
  await page.waitForFunction(
    () => window.SonstengChat && window.SonstengChat.getState() === 'IDLE' && sessionStorage.getItem('sonsteng_sess'),
    {timeout: 10000}
  );
  await page.evaluate(() => window.SonstengChat.send('Please tell me what happened from the beginning.'));
  await page.waitForFunction(
    () => window.SonstengChat && window.SonstengChat.getTurns() === 1,
    {timeout: 15000}
  );
  const reply = await page.$eval('#stream', (element) => element.textContent);
  if (!reply.includes('It was late')) throw new Error('mock interview outcome changed');
}

async function exerciseCritique(page) {
  await page.type(
    '#deliverable',
    'The stop should be suppressed because the officer lacked reasonable articulable suspicion. The icy road explains the observed movement.'
  );
  await page.click('.paste button[type=submit]');
  await page.waitForSelector('.crit-card', {timeout: 10000});
  const text = await page.$eval('#result-mount', (element) => element.textContent);
  if (!text.includes('Issue framing') || !text.includes('26 / 40')) {
    throw new Error('mock critique outcome changed');
  }
}

async function verifyLargeType(page, initialLarge) {
  const found = await page.evaluate((startsLarge) => {
    const buttons = [...document.querySelectorAll('button')];
    const largeButton = buttons.find((candidate) => candidate.textContent.trim() === 'LARGE TYPE');
    const standardButton = buttons.find((candidate) => candidate.textContent.trim() === 'STANDARD');
    if (!largeButton || !standardButton) return false;
    const active = () => document.documentElement.classList.contains('type-lg');
    const pressed = () => largeButton.getAttribute('aria-pressed') === 'true';
    if (active() !== startsLarge || pressed() !== startsLarge) return false;
    (startsLarge ? standardButton : largeButton).click();
    if (active() === startsLarge || pressed() === startsLarge) return false;
    if (!active()) largeButton.click();
    return active() && pressed();
  }, initialLarge);
  if (!found) throw new Error('Large Type control missing or mode transition did not update');
}

function assertLayout(layout) {
  const errors = [];
  if (layout.h1 !== 1) errors.push(`H1=${layout.h1}`);
  if (layout.jumps.length) errors.push(`heading jumps ${layout.jumps}`);
  if (layout.overflow > 1) errors.push(`overflow ${layout.overflow}px`);
  if (layout.controls.length) {
    errors.push(`undersize controls ${JSON.stringify(layout.controls.slice(0, 4))}`);
  }
  if (!layout.large) errors.push('Large Type class absent');
  if (errors.length) throw new Error(errors.join(' | '));
}

async function runCase(browser, viewport, large, surface) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await setTypeMode(page, large);
  try {
    await page.goto(HARNESS + QUERY[surface], {waitUntil: 'networkidle0', timeout: 30000});
    await page.waitForSelector(surface === 'interview' ? '#composer-input' : '#deliverable', {timeout: 10000});
    if (surface === 'interview') await exerciseInterview(page);
    else await exerciseCritique(page);
    await verifyLargeType(page, large);
    assertLayout(await inspectLayout(page));
    console.log(`PASS ${surface} ${viewport.name} ${large ? 'large-start' : 'baseline-start'}`);
    return true;
  } catch (error) {
    console.error(`FAIL ${surface} ${viewport.name} ${large ? 'large' : 'baseline'} — ${error.message}`);
    return false;
  } finally {
    await page.close();
  }
}

async function exerciseRegressions(browser) {
  const page = await browser.newPage();
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  async function open(query) {
    await page.goto(HARNESS + query, {waitUntil: 'networkidle0'});
    await page.waitForSelector('#composer-input, #deliverable');
  }
  try {
    await page.setViewport({width: 1440, height: 900});
    await page.evaluateOnNewDocument(() => { sessionStorage.clear(); localStorage.clear(); });
    for (const view of ['chat', 'critique']) {
      for (const packet of ['../matters/m05-halvard/', 'https://example.org/', '../matters/../', '../matters/M05/', '../matters/m05/?x=1', '']) {
        await open('?view=' + view + '&packet=' + encodeURIComponent(packet));
        const links = await page.evaluate(() => [...document.querySelectorAll('#root-mount a')].map(a => [a.textContent, a.getAttribute('href')]));
        assert(links.some(([label, href]) => label.includes('LEGAL PRACTICUM') && href === '../index.html'), 'F6/F7 home link');
        const back = links.find(([label]) => label === '← Back to the matter');
        const safe = packet === '../matters/m05-halvard/';
        assert(safe ? back && back[1] === packet : view === 'critique' ? back && back[1] === '../matters/index.html' : !back, 'F7 packet validation');
      }
    }
    await open('?view=chat');
    await page.evaluate(() => window.SonstengBYOK.open());
    for (const [provider, good] of [['anthropic', 'sk-ant-mock'], ['openai', 'sk-mock'], ['google', 'AIzamock']]) {
      for (const key of ['abc', good]) {
        const result = await page.evaluate((provider, key) => {
          document.querySelector('#byok-provider').value = provider;
          document.querySelector('#byok-key').value = key;
          document.querySelector('.byok-form').requestSubmit();
          return {status: document.querySelector('.byok-status').textContent, saved: window.SonstengBYOK.get().api_key === key,
            exposed: document.querySelector('#root-mount').textContent.includes(key)};
        }, provider, key);
        assert(result.saved && result.status.includes('Warning:') === (key === 'abc') && !result.exposed, 'F9 advisory and masking');
      }
    }
    for (const motion of ['reduce', 'no-preference']) {
      await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: motion}]);
      await open('?view=critique');
      await page.click('.paste button[type=submit]');
      await page.waitForFunction(() => {
        const notice = document.querySelector('.oversize');
        if (!notice) return false;
        const rect = notice.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= innerHeight && document.activeElement.id === 'deliverable';
      });
      assert(await page.$eval('.oversize', el => el.textContent.includes('Nothing to critique yet')), 'F14 visible empty notice');
    }
    await open('?view=chat&scenario=turnstile_interactive');
    assert(await page.$eval('#cf-turnstile', el => !el.hasAttribute('aria-hidden') && !!el.getAttribute('aria-label')), 'F8 accessible check');
    await page.evaluate(() => { window.SonstengChat.send('Tell me what happened.'); window.SonstengChat.submit(); });
    await new Promise(resolve => setTimeout(resolve, 8500));
    assert(await page.evaluate(() => window.__MINT_COUNT__() === 0), 'F8 interactive timer suspended');
    assert(await page.$$eval('.stage-direction[role=status]', els => els.length === 1 && els[0].textContent === 'Complete the verification check (bottom right) to connect.'), 'F8 single direction');
    await page.click('#cf-turnstile button');
    await page.waitForFunction(() => window.SonstengChat.getTurns() === 1);
    assert(await page.evaluate(() => window.__MINT_COUNT__() === 1 && !document.querySelector('.stage-direction[role=status]')), 'F8 queued send deduplicated');
    await open('?view=chat&scenario=turnstile_late');
    const lateTokenState = () => page.evaluate(() => ({
      mintCount: window.__MINT_COUNT__(),
      hasSession: !!sessionStorage.getItem('sonsteng_sess'),
      turns: window.SonstengChat.getTurns(),
      state: window.SonstengChat.getState(),
      notices: [...document.querySelectorAll('.stage-direction[role=status]')].map(el => el.textContent)
    }));
    let beforeLateToken;
    try {
      await page.waitForSelector('.stage-direction[role=status]');
      beforeLateToken = await lateTokenState();
      assert(beforeLateToken.mintCount === 1 && !beforeLateToken.hasSession && beforeLateToken.notices.length === 1 && beforeLateToken.notices[0].startsWith('Verification could not be completed.'), 'tokenless failure before verification');
      await page.click('#cf-turnstile button');
      await page.waitForFunction(() => !!sessionStorage.getItem('sonsteng_sess'));
      const afterLateToken = await lateTokenState();
      assert(afterLateToken.mintCount === 2 && afterLateToken.notices.length === 0, 'one successful automatic mint clears the notice');
      await page.type('#composer-input', 'Tell me what happened after verification.');
      await page.click('.composer button[type=submit]');
      await page.waitForFunction(() => window.SonstengChat.getTurns() === 1);
      assert(await page.evaluate(() => window.__MINT_COUNT__() === 2), 'SEND reuses the recovered session');
    } catch (error) {
      throw new Error('F8 late token auto-mint — ' + error.message + '; expected 1 failed tokenless mint then exactly 1 successful mint, no notice, and usable SEND; observed ' + JSON.stringify({beforeLateToken, current: await lateTokenState()}));
    }
    await open('?view=chat&scenario=mint_retry');
    await page.waitForSelector('.stage-direction[role=status]', {timeout: 12000});
    await page.evaluate(() => window.SonstengChat.send('Reconnect and send.'));
    await page.waitForFunction(() => window.SonstengChat.getTurns() === 1);
    for (const carveout of ['sample=1', 'bypass=mock-bypass']) {
      await open('?view=chat&scenario=turnstile_interactive&' + carveout);
      await page.evaluate(() => window.onloadTurnstileCallback());
      assert(await page.$('#cf-turnstile') === null, 'F8 carve-out has no widget');
      assert(await page.evaluate(() => window.__MINT_COUNT__()) === (carveout.startsWith('sample') ? 0 : 1), 'F8 carve-out mint contract');
    }
    console.log('PASS W2 regressions F6 F7 F8 F9 F14');
    return true;
  } catch (error) {
    console.error('FAIL W2 regressions — ' + error.message);
    return false;
  } finally { await page.close(); }
}

async function run() {
  const puppeteer = loadPuppeteer();
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_BIN || process.env.CHROMIUM_PATH || '/snap/bin/chromium',
    headless: process.env.HEADFUL !== '1' && process.env.HEADLESS !== '0',
    userDataDir: path.join('/tmp', `sonsteng-chat-${process.pid}`),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-crash-reporter', '--disable-breakpad']
  });
  let failures = 0;
  let total = 0;
  for (const viewport of MATRIX.viewports) {
    for (const large of [false, true]) {
      for (const surface of ['interview', 'critique']) {
        total++;
        if (!await runCase(browser, viewport, large, surface)) failures++;
      }
    }
  }
  total++;
  if (!await exerciseRegressions(browser)) failures++;
  await browser.close();
  console.log(`CHAT/CRITIQUE SUMMARY ${total - failures}/${total} PASS`);
  process.exit(failures ? 1 : 0);
}

run().catch((error) => {
  console.error('BROWSER GATE ERROR:', error.message);
  process.exit(1);
});
