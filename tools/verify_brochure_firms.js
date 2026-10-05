#!/usr/bin/env node
'use strict';
// Uses the same Puppeteer lookup and browser overrides as tools/shot.js.
// Artifacts stay in /tmp, or in the directory passed as the first argument.
const fs = require('fs');
const path = require('path');
const os = require('os');
const {execFileSync} = require('child_process');
const {pathToFileURL} = require('url');
let puppeteer;
for (const candidate of [process.env.PUP_DIR, 'puppeteer', '/home/damienriehl/.npm/_npx/7d92d9a2d2ccc630/node_modules/puppeteer'].filter(Boolean)) {
  try { puppeteer = require(candidate); break; } catch (_) {}
}
if (!puppeteer) throw new Error('Puppeteer unavailable (set PUP_DIR or install puppeteer)');
const ROOT = path.resolve(__dirname, '..');
const out = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'brochure-firms-'));
fs.mkdirSync(out, {recursive: true});
async function run() {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_BIN || process.env.CHROMIUM_PATH || '/snap/bin/chromium',
    headless: true,
    userDataDir: path.join(out, 'browser-profile'),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-crash-reporter', '--disable-breakpad']
  });
  let checks = 0;
  const failures = [];
  function assert(label, condition) {
    checks++;
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}`);
    if (!condition) failures.push(label);
  }
  try {
    for (const name of ['brochure', 'firms']) {
      const page = await browser.newPage();
      const requests = [], errors = [];
      page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(pathToFileURL(path.join(ROOT, 'site', `${name}.html`)).href, {waitUntil: 'networkidle0'});
      await page.evaluate(() => document.fonts.ready);
      for (const width of [1440, 390]) {
        await page.setViewport({width, height: 1000, deviceScaleFactor: 1});
        for (const mode of ['standard', 'large']) {
          await page.click(`#type-${mode}`);
          const layout = await page.evaluate(() => ({
            fits: document.documentElement.scrollWidth <= innerWidth,
            large: document.documentElement.classList.contains('type-lg'),
            selected: document.querySelector('[aria-pressed="true"]').id,
            size: parseFloat(getComputedStyle(document.body).fontSize)
          }));
          assert(`${name} ${width}px ${mode}: fits viewport and selects type mode`,
            layout.fits && layout.large === (mode === 'large') && layout.selected === `type-${mode}` &&
            layout.size === (mode === 'large' ? 22.5 : 18));
          await page.screenshot({path: path.join(out, `${name}-${width}-${mode}.png`), fullPage: true});
        }
      }
      // Preference survives reload, and the skip link moves focus to main.
      await page.reload({waitUntil: 'load'});
      assert(`${name}: type preference survives reload`, await page.$eval('#type-large', el => el.getAttribute('aria-pressed') === 'true'));
      await page.focus('.skip-link');
      await page.keyboard.press('Enter');
      assert(`${name}: skip link focuses main`, await page.evaluate(() => document.activeElement.id === 'main'));
      assert(`${name}: no external requests or script errors`, !requests.length && !errors.length);
      if (name === 'brochure') {
        for (const mode of ['standard', 'large']) {
          await page.click(`#type-${mode}`);
          // Closed license disclosures must also print in full.
          await page.$eval('.license-proof', (el, mode) => { el.open = mode === 'standard'; }, mode);
          const pdf = path.join(out, `brochure-letter-${mode}.pdf`);
          await page.pdf({path: pdf, format: 'Letter', preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false});
          const info = execFileSync('pdfinfo', [pdf], {encoding: 'utf8'});
          const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
          assert(`brochure US Letter ${mode}: exactly 2 pages (actual ${pages})`, pages === 2);
          assert(`brochure US Letter ${mode}: 612 × 792 points`, /Page size:\s+612 x 792 pts/.test(info));
          const front = execFileSync('pdftotext', ['-f', '1', '-l', '1', pdf, '-'], {encoding: 'utf8'});
          const back = execFileSync('pdftotext', ['-f', '2', '-l', '2', pdf, '-'], {encoding: 'utf8'});
          assert(`brochure ${mode}: front and back content prints through the byline`,
            front.includes('Practice ready.') && front.includes('between live sessions.') &&
            back.includes('What you get') && back.includes('CC BY 4.0') && back.includes('You betcha!') &&
            back.includes('legalpracticum.org') && back.includes('Roger S. Haydock'));
        }
      }
      await page.close();
    }
  } finally { await browser.close(); }
  console.log(`brochure_firms: ${checks - failures.length}/${checks} checks passed; ${failures.length} failed`);
  console.log(`Artifacts: ${out}`);
  if (failures.length) process.exitCode = 1;
}
run().catch(error => {
  console.error(error);
  console.error('brochure_firms: ERROR; browser verification incomplete');
  process.exitCode = 1;
});
