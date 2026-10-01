/* Headless contract check for the built weekly-hours editor.
   Run: EDITOR_HEADLESS=1 node app/hours/verify-hours.js */
'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');
const puppeteer = require('/home/damienriehl/.npm/_npx/7d92d9a2d2ccc630/node_modules/puppeteer');

const ROOT = path.join(__dirname, '..', '..', 'site');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  const file = path.resolve(ROOT, '.' + decodeURIComponent(pathname), pathname.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    res.writeHead(err ? 404 : 200, {'Content-Type': {'.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript'}[path.extname(file)] || 'application/octet-stream'});
    res.end(err ? 'Not found' : data);
  });
});
let browser;
const results = [];
function check(name, value) {
  results.push(!!value);
  console.log((value ? 'PASS' : 'FAIL') + '  ' + name);
}

(async function () {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = 'http://127.0.0.1:' + server.address().port;
  const PAGE = origin + '/platform/hours/';
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_BIN || '/snap/bin/chromium',
    headless: process.env.EDITOR_HEADLESS !== '0',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const external = [];
  const failed = [];
  async function newPage() {
    const tab = await browser.newPage();
    await tab.setRequestInterception(true);
    tab.on('request', req => {
      const url = new URL(req.url());
      if (url.protocol !== 'data:' && url.origin !== origin) {
        external.push(req.url()); req.abort();
      } else req.continue();
    });
    tab.on('requestfailed', req => failed.push(`${req.url().slice(0, 160)}: ${req.failure()?.errorText || 'failed'}`));
    tab.on('response', res => { if (res.status() >= 400) failed.push(`${res.url()}: HTTP ${res.status()}`); });
    return tab;
  }
  const page = await newPage();
  await page.setViewport({width: 390, height: 844});
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('sonsteng.weekly-hours.v1', '{"storage_version":99,"opaque":"future bytes"}');
    localStorage.setItem('sonsteng-type-lg', '1');
  });
  await page.goto(PAGE, {waitUntil: 'load'});
  await page.evaluate(() => document.fonts.ready);
  const large = await page.evaluate(() => ({
    active: document.documentElement.classList.contains('type-lg'),
    body: parseFloat(getComputedStyle(document.body).fontSize),
    heading: parseFloat(getComputedStyle(document.querySelector('#privacy-title')).fontSize),
    title: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
    fonts: [...document.fonts].every(font => font.status !== 'error'),
  }));
  check('saved Large Type preference applies before interaction', large.active);
  check('shared embedded fonts load under the hours CSP', large.fonts);
  check('card heading is a clear step below the page title', large.heading < large.title * 0.8);
  await page.click('#type-toggle');
  const normal = await page.evaluate(() => ({
    body: parseFloat(getComputedStyle(document.body).fontSize),
    heading: parseFloat(getComputedStyle(document.querySelector('#privacy-title')).fontSize),
  }));
  check('Large Type visibly enlarges body and heading text', large.body > normal.body && large.heading > normal.heading);
  await page.click('#type-toggle');
  check('Large Type toggle restores the preference', await page.$eval('#type-toggle', n => n.getAttribute('aria-pressed') === 'true'));
  await page.click('[data-mode="persistent"]');
  const quarantined = await page.$eval('#storage-status', n => n.textContent);
  await page.type('#learner-id', 'synthetic-change');
  const preserved = await page.evaluate(() => localStorage.getItem('sonsteng.weekly-hours.v1'));
  check('future storage envelope is quarantined', /byte-preserved|preserved/.test(quarantined));
  check('older client does not overwrite future bytes', preserved === '{"storage_version":99,"opaque":"future bytes"}');
  check('import remains disabled while future bytes are quarantined',
    /disabled|preserve/i.test(await page.$eval('#import-preview', n => {
      document.querySelector('#preview-import').click(); return n.textContent;
    })));
  check('mobile viewport has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('live region is present', await page.$eval('#announcer', n => n.getAttribute('aria-live') === 'polite'));
  await page.close();

  const weeks = await newPage();
  await weeks.evaluateOnNewDocument(() => localStorage.clear());
  await weeks.goto(PAGE, {waitUntil: 'load'});
  await weeks.click('[data-mode="persistent"]');
  check('untouched week has no validation error', await weeks.$eval('#validation', n => n.textContent === '' && !n.classList.contains('error')));
  await weeks.click('#next-week');
  check('navigation alone does not expose validation errors', await weeks.$eval('#validation', n => n.textContent === ''));
  await weeks.click('#previous-week');
  for (const selector of ['#export-json', '#export-csv', '#export-clear']) {
    await weeks.click(selector);
    check(selector + ' attempt exposes errors and keeps invalid export guarded', await weeks.$eval('#validation', n => n.classList.contains('error') && /issue/.test(n.textContent)));
  }
  await weeks.evaluate(() => { window.confirm = () => true; });
  await weeks.click('#clear');
  check('clear restores untouched validation state', await weeks.$eval('#validation', n => n.textContent === '' && !n.classList.contains('error')));
  const spacing = await weeks.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect();
    return rect('#add-entry').top - rect('.identity').bottom >= 16 &&
      rect('#contribution-heading').top - rect('#add-entry').bottom >= 24;
  });
  check('form and section spacing separates the add-entry row', spacing);
  await weeks.type('#learner-id', 'learner-synthetic-nav');
  check('first edit exposes validation errors', await weeks.$eval('#validation', n => n.classList.contains('error') && /issue/.test(n.textContent)));
  await weeks.type('#offering-id', 'offering-synthetic-nav');
  await weeks.click('#add-entry');
  await weeks.type('.entry input[type="text"]', 'Synthetic retained project');
  await weeks.click('#next-week');
  await weeks.click('#previous-week');
  check('previous and next week navigation preserves each weekly draft',
    await weeks.$eval('.entry input[type="text"]', n => n.value) === 'Synthetic retained project');
  await weeks.evaluate(() => { window.confirm = () => true; });
  await weeks.click('#clear');
  check('clear removes the storage key instead of recreating an empty envelope',
    await weeks.evaluate(() => localStorage.getItem('sonsteng.weekly-hours.v1')) === null);
  await weeks.close();

  const unavailable = await newPage();
  await unavailable.evaluateOnNewDocument(() => {
    Storage.prototype.setItem = function () { throw new Error('synthetic storage failure'); };
  });
  await unavailable.goto(PAGE, {waitUntil: 'load'});
  await unavailable.click('[data-mode="persistent"]');
  check('storage probe failure degrades to visible export-only mode',
    /unavailable|export-only/i.test(await unavailable.$eval('#storage-status', n => n.textContent)));
  await unavailable.close();
  check('built page loads every local asset', failed.length === 0);
  check('no request leaves the page origin', external.length === 0);
  if (failed.length) console.error(failed);
  if (external.length) console.error(external.map(url => url.slice(0, 160)));
  if (results.some(x => !x)) process.exitCode = 1;
}()).catch(err => { console.error(err); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server.listening) await new Promise(resolve => server.close(resolve));
});
