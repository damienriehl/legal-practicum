/* Focused headless regression checks for F5 and F10–F13; run after build_site.py. */
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '../../site/platform');
let puppeteer;
for (const candidate of [process.env.PUP_DIR, 'puppeteer', '/home/damienriehl/.npm/_npx/7d92d9a2d2ccc630/node_modules/puppeteer'].filter(Boolean)) {
  try { puppeteer = require(candidate); break; } catch (_) {}
}
async function run() {
  assert(puppeteer, 'Puppeteer unavailable');
  const browser = await puppeteer.launch({headless: true,
    executablePath: process.env.CHROME_BIN || '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-crash-reporter', '--disable-breakpad']});
  try {
    for (const width of [1440, 1024, 390]) for (const large of [false, true]) {
      const page = await browser.newPage();
      await page.setViewport({width, height: 900});
      await page.evaluateOnNewDocument(value => localStorage.setItem('sonsteng-type-lg', value ? '1' : '0'), large);
      for (const route of ['matters/index.html', 'firm/index.html', 'skills/index.html', 'matters/m01-arbitration-meridian/index.html', 'hours/index.html']) {
        await page.goto(pathToFileURL(path.join(root, route)).href);
        await page.evaluate(() => document.fonts.ready);
        const errors = await page.evaluate(() => {
          const errors = [];
          const box = el => el.getBoundingClientRect();
          if (document.documentElement.scrollWidth > innerWidth + 1) errors.push('page overflow');
          for (const field of document.querySelectorAll('.lib-field')) {
            const label = box(field.querySelector('label'));
            const control = box(field.querySelector('input,select'));
            if (label.bottom > control.top + 1 || Math.abs(label.left - control.left) > 1) errors.push('detached label');
          }
          const apply = document.querySelector('.lib-toolbar button');
          if (apply) {
            const sameRow = [...document.querySelectorAll('.lib-field input,.lib-field select')].filter(el => Math.abs(box(el).top - box(apply).top) < 5);
            if (sameRow.some(el => Math.abs(box(el).bottom - box(apply).bottom) > 1)) errors.push('Apply alignment');
          }
          for (const value of document.querySelectorAll('.kpi-tile__value')) {
            const range = document.createRange(); range.selectNodeContents(value);
            if (range.getClientRects().length !== 1 || value.scrollWidth > value.clientWidth + 1) errors.push('KPI wraps or overflows');
          }
          for (const chip of document.querySelectorAll('.chip')) {
            const rect = box(chip);
            if (rect.width && (rect.right > innerWidth + 1 || chip.scrollWidth > chip.clientWidth + 1)) errors.push('chip clipped');
          }
          const notes = document.querySelector('.data-notes');
          if (notes && notes.open) errors.push('dataset notes visible');
          return errors;
        });
        assert.deepEqual(errors, [], `${route} ${width} large=${large}`);
        if (route.startsWith('hours/')) {
          assert.equal(await page.$eval('.breadcrumb', el => el.textContent.replace(/\s/g, '')), 'Home/Hours');
          await page.click('#type-toggle');
          assert.equal(await page.$eval('html', el => el.classList.contains('type-lg')), !large);
          await page.click('#type-toggle');
          assert(await page.$eval('body', el => getComputedStyle(el).fontFamily.includes('Spectral')));
        }
        console.log(`PASS ${route} ${width} large=${large}`);
      }
      await page.close();
    }
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
