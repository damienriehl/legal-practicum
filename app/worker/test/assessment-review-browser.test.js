// Browser-level regression for the in-place signer override (2026-09-27): each
// heading card offers a visible "Override score" disclosure beside its score;
// the inline 1-7 radio group, reason, and Record/Cancel run through the real
// served CSS/JS, the real endpoint, and a real node:sqlite EditorStoreCore under
// the /edit CSP. Skips when puppeteer is not installed (set PUP_DIR to its
// package dir); set ASSESSMENT_SHOTS_DIR to keep screenshots.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import {
  assessmentPageEndpoint,
  assessmentOverrideEndpoint,
} from "../src/assessment-endpoints.js";
import { serveAsset } from "../src/editor-assets.js";
import { editSecurityHeaders } from "../src/editor-http.js";
import { MEMO_HEADING_IDS } from "../src/validate.js";
import { makeCore } from "./editor-sql-helper.mjs";

const require = createRequire(import.meta.url);
function loadPuppeteer() {
  const candidates = [process.env.PUP_DIR, "puppeteer",
    "/home/damienriehl/.npm/_npx/7d92d9a2d2ccc630/node_modules/puppeteer"].filter(Boolean);
  for (const candidate of candidates) {
    try { return require(candidate); } catch { /* try next */ }
  }
  return null;
}
const puppeteer = loadPuppeteer();

const REVIEWER = {
  editor: "slot:damienadmin",
  slot: "damienadmin",
  credential_channel: "access",
  scopes: {
    edit: { granted: true, ver: 1 },
    instructor: { granted: true, ver: 1 },
    admin: { granted: true, ver: 1 },
  },
};
const CONFIG = {
  schema_version: "memo-assessment-threshold-resolution/v1",
  source: "default",
  source_id: "memo-seven-heading-1-7",
  version: "1.1.0",
  content_hash: "sha256:instrument",
  competence_score: 4,
  redo_eligible_below: 6,
  resolution: "instructor>school>default",
  locally_supplied: false,
  authority_status: "canonical_default",
  verified_institutional_authority: false,
};
const AUDIT_ID = "assessment-audit-browser";

function seededCore() {
  const core = makeCore(() => Date.now());
  const instrument = { id: "memo-seven-heading-1-7", version: "1.1.0", content_hash: "sha256:instrument" };
  const providers = [{ provider: "openai", model: "gpt-test", mode: "byok" }];
  const written = core.recordAssessmentAudit({
    id: AUDIT_ID,
    assessment_use: "formative",
    evidence: { submission: "The governing rule requires notice." },
    result: {
      schema_version: "1.0.0",
      assessment_use: "formative",
      summative_eligible: false,
      summative_blockers: ["human_human_calibration", "provider_terms_review"],
      instrument,
      threshold_configuration: CONFIG,
      providers,
      headings: MEMO_HEADING_IDS.map((heading_id) => ({
        heading_id, score: 4,
        observations: [{ evidence_spans: ["The governing rule requires notice."], rationale: "Adequate." }],
      })),
    },
    provenance: { config: CONFIG, instrument, providers },
    summative_blockers: ["human_human_calibration", "provider_terms_review"],
    retention: { days: 30 },
  });
  assert.equal(written.ok, true, JSON.stringify(written));
  return core;
}

async function startServer(core) {
  const env = { EDITOR: { getByName: () => core } };
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const url = `http://${req.headers.host}${req.url}`;
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
    });
    const path = new URL(url).pathname;
    let response;
    if (path.startsWith("/edit/assessments/") && req.method === "GET") {
      response = await assessmentPageEndpoint(request, env, REVIEWER);
    } else if (path.startsWith("/edit/assets/")) {
      response = serveAsset(path.slice("/edit/assets/".length)) || new Response("", { status: 404 });
    } else if (path === "/edit/v1/assessment-override" && req.method === "POST") {
      response = await assessmentOverrideEndpoint(request, env, REVIEWER);
    } else {
      response = new Response("", { status: 404 });
    }
    const headers = { ...editSecurityHeaders(), ...Object.fromEntries(response.headers) };
    res.writeHead(response.status, headers);
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  env.EDIT_ORIGIN = origin;
  return { server, origin };
}

const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { width: 1280, height: 900 };

async function noHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

async function toggleReport(page) {
  return page.$$eval(".as-override-toggle", (buttons) => buttons.map((button) => {
    const style = getComputedStyle(button);
    const rect = button.getBoundingClientRect();
    return {
      text: button.textContent,
      expanded: button.getAttribute("aria-expanded"),
      hidden: button.hidden,
      display: style.display,
      visibility: style.visibility,
      color: style.color,
      background: style.backgroundColor,
      width: rect.width,
      height: rect.height,
      scoreBeside: button.closest(".as-score-group")?.querySelector(".as-score")?.textContent || "",
    };
  }));
}

async function editorReport(page, headingId) {
  return page.$eval(`#heading-${headingId}`, (card) => {
    const form = card.querySelector(".as-inline-override");
    const box = card.getBoundingClientRect();
    const faces = [...form.querySelectorAll(".as-scale-face")].map((face) => {
      const rect = face.getBoundingClientRect();
      return { w: rect.width, h: rect.height, right: rect.right };
    });
    return {
      hidden: form.hidden,
      display: getComputedStyle(form).display,
      legend: form.querySelector("legend")?.textContent,
      radios: [...form.querySelectorAll("input[type=radio]")].map((radio) => radio.value),
      checked: form.querySelector("input[type=radio]:checked")?.value || null,
      faces,
      overflow: [...form.querySelectorAll("*")]
        .filter((el) => el.getBoundingClientRect().right > box.right + 0.5)
        .map((el) => el.className || el.tagName),
      active: document.activeElement === form.querySelector("input[type=radio]") ? "first-radio" :
        document.activeElement?.name || document.activeElement?.className || document.activeElement?.tagName,
      expanded: card.querySelector(".as-override-toggle").getAttribute("aria-expanded"),
      note: form.querySelector("textarea").value,
      error: form.querySelector(".as-inline-error").hidden ? null : form.querySelector(".as-inline-error").textContent,
    };
  });
}

async function shot(page, dir, name, selector) {
  if (!dir) return;
  if (selector) await page.$eval(selector, (el) => el.scrollIntoView({ block: "center" }));
  await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));
  await page.screenshot({ path: join(dir, name) });
}

test("in-place override: per-heading button, inline radio scale, keyboard, round trip, cancel, errors, phone fit",
  { skip: puppeteer ? false : "puppeteer not installed", timeout: 90_000 }, async () => {
    const core = seededCore();
    const { server, origin } = await startServer(core);
    const shots = process.env.ASSESSMENT_SHOTS_DIR;
    if (shots) mkdirSync(shots, { recursive: true });
    const url = `${origin}/edit/assessments/${AUDIT_ID}`;
    const scopes = { "assessment-review": { granted: true, ver: 1 } };
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    try {
      const page = await browser.newPage();
      const failures = [];
      let expectFailures = false;
      page.on("console", (message) => {
        if (message.type() === "error" && !/Failed to load resource/.test(message.text())) {
          failures.push(message.text());
        }
      });
      page.on("response", (response) => {
        if (!expectFailures && response.status() >= 400 && !response.url().endsWith("/favicon.ico")) {
          failures.push(`${response.status()} ${response.url()}`);
        }
      });
      page.on("pageerror", (error) => failures.push(String(error)));

      // 1. Collapsed: one visible, >=44px Override button beside every score.
      for (const [label, viewport] of [["1280", DESKTOP], ["390", PHONE]]) {
        await page.setViewport(viewport);
        await page.goto(url, { waitUntil: "networkidle0" });
        const toggles = await toggleReport(page);
        assert.equal(toggles.length, MEMO_HEADING_IDS.length);
        for (const toggle of toggles) {
          assert.equal(toggle.text, "Override score");
          assert.equal(toggle.hidden, false, JSON.stringify(toggle));
          assert.notEqual(toggle.display, "none");
          assert.equal(toggle.visibility, "visible");
          assert.equal(toggle.expanded, "false");
          assert.match(toggle.scoreBeside, /^Score [1-7]$/);
          assert.ok(toggle.height >= 44 && toggle.width >= 44, `${label}: ${JSON.stringify(toggle)}`);
          assert.notEqual(toggle.color, toggle.background);
        }
        assert.equal(await page.$eval(".as-results-help", (el) => el.hidden), false);
        assert.equal(await page.$("#assessment-override-form"), null, "bottom form removed");
        assert.equal(await noHorizontalScroll(page), true, `${label}: horizontal scroll`);
        await shot(page, shots, `${label}-collapsed.png`, "#heading-issues");
      }

      // 2. Expand at phone width: fits in two rows, targets >=44px, no overflow.
      await page.setViewport(PHONE);
      await page.goto(url, { waitUntil: "networkidle0" });
      await page.click("#heading-issues .as-override-toggle");
      let editor = await editorReport(page, "issues");
      assert.equal(editor.hidden, false);
      assert.equal(editor.expanded, "true");
      assert.equal(editor.active, "first-radio", "focus moves into the editor");
      assert.deepEqual(editor.radios, ["1", "2", "3", "4", "5", "6", "7"]);
      for (const face of editor.faces) assert.ok(face.w >= 44 && face.h >= 44, JSON.stringify(face));
      assert.deepEqual(editor.overflow, [], "phone: inline editor overflows the card");
      assert.equal(await noHorizontalScroll(page), true, "phone expanded: horizontal scroll");
      await shot(page, shots, "390-expanded.png", "#override-editor-issues");
      await page.click("#heading-issues .as-cancel");

      // 3. Desktop keyboard round trip through the real endpoint and store.
      await page.setViewport(DESKTOP);
      await page.goto(url, { waitUntil: "networkidle0" });
      await page.evaluate(() => { window.__noReload = true; });
      await page.focus("#heading-issues .as-override-toggle");
      await page.keyboard.press("Enter");
      editor = await editorReport(page, "issues");
      assert.equal(editor.hidden, false);
      assert.equal(editor.display, "grid");
      assert.equal(editor.legend, "Replacement score for Issues");
      assert.equal(editor.active, "first-radio");
      // Arrow keys move within the radio group: 1 -> 2 -> ... -> 6.
      for (let i = 0; i < 5; i += 1) await page.keyboard.press("ArrowRight");
      editor = await editorReport(page, "issues");
      assert.equal(editor.checked, "6");
      const radioOutline = await page.$eval("#override-editor-issues input:checked + .as-scale-face",
        (face) => getComputedStyle(face).outlineStyle);
      assert.notEqual(radioOutline, "none", "radio focus is visible");
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement.id), "override-note-issues");
      await page.keyboard.type("Signer judgment after reviewing the evidence.");
      await shot(page, shots, "1280-expanded.png", "#override-editor-issues");
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement.textContent), "Record override");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() =>
        /Override recorded\./.test(document.getElementById("assessment-override-status").textContent));
      const after = await page.evaluate(() => {
        const card = document.getElementById("heading-issues");
        return {
          stillSamePage: window.__noReload === true,
          score: card.querySelector(".as-score").textContent,
          text: card.textContent,
          editorHidden: card.querySelector(".as-inline-override").hidden,
          expanded: card.querySelector(".as-override-toggle").getAttribute("aria-expanded"),
          toggleHidden: card.querySelector(".as-override-toggle").hidden,
          focusIsToggle: document.activeElement === card.querySelector(".as-override-toggle"),
          log: document.getElementById("assessment-override-log").textContent,
          status: document.getElementById("assessment-override-status").textContent,
        };
      });
      assert.equal(after.stillSamePage, true, "updated in place, no reload");
      assert.equal(after.score, "Score 6");
      assert.match(after.text, /Human override by .+\. The derived score was 4\./);
      assert.equal(after.editorHidden, true);
      assert.equal(after.expanded, "false");
      assert.equal(after.toggleHidden, false);
      assert.equal(after.focusIsToggle, true, "focus returns to the card's button");
      assert.doesNotMatch(after.log, /No human overrides have been recorded/);
      assert.match(after.log, /Signer judgment after reviewing the evidence\./);
      assert.match(after.status, /Issues is now scored 6/);
      let stored = core.readAssessmentAudit({ id: AUDIT_ID, scopes });
      assert.equal(stored.record.overrides.length, 1);
      assert.equal(stored.record.overrides[0].author, REVIEWER.editor);
      assert.deepEqual(stored.record.overrides[0].value,
        { heading_id: "issues", note: "Signer judgment after reviewing the evidence.", score: 6 });
      await shot(page, shots, "1280-after-submit.png", "#heading-issues");
      await page.reload({ waitUntil: "networkidle0" });
      const reloaded = await page.evaluate(() => ({
        score: document.querySelector("#heading-issues .as-score").textContent,
        text: document.getElementById("heading-issues").textContent,
        log: document.getElementById("assessment-override-log").textContent,
        current: document.querySelector("#override-editor-issues .is-current input").value,
      }));
      assert.equal(reloaded.score, "Score 6");
      assert.match(reloaded.text, /Human override by/);
      assert.match(reloaded.log, /Signer judgment after reviewing the evidence\./);
      assert.equal(reloaded.current, "6", "the editor marks the effective score as current");

      // 4. Cancel restores the collapsed, empty state and returns focus.
      await page.click("#heading-governing_law .as-override-toggle");
      await page.click("#override-editor-governing_law input[value='2'] + .as-scale-face");
      await page.type("#override-note-governing_law", "Draft that will be cancelled.");
      await page.click("#heading-governing_law .as-cancel");
      editor = await editorReport(page, "governing_law");
      assert.equal(editor.hidden, true);
      assert.equal(editor.expanded, "false");
      assert.equal(await page.evaluate(() =>
        document.activeElement === document.querySelector("#heading-governing_law .as-override-toggle")), true);
      await page.keyboard.press("Enter");
      editor = await editorReport(page, "governing_law");
      assert.equal(editor.hidden, false);
      assert.equal(editor.checked, null, "cancel cleared the score");
      assert.equal(editor.note, "", "cancel cleared the reason");
      await page.keyboard.press("Escape");
      assert.equal((await editorReport(page, "governing_law")).hidden, true, "Escape closes the editor");

      // 5. Errors are inline in the card, with focus management.
      await page.click("#heading-governing_law .as-override-toggle");
      await page.click("#override-editor-governing_law .as-record");
      editor = await editorReport(page, "governing_law");
      assert.match(editor.error, /Choose a replacement score/);
      assert.equal(editor.active, "first-radio");
      await page.click("#override-editor-governing_law input[value='3'] + .as-scale-face");
      await page.click("#override-editor-governing_law .as-record");
      editor = await editorReport(page, "governing_law");
      assert.match(editor.error, /Give a reason/);
      assert.equal(await page.evaluate(() => document.activeElement.id), "override-note-governing_law");
      assert.equal(await page.$eval("#override-note-governing_law", (el) => el.getAttribute("aria-invalid")), "true");
      // Server failure: the real endpoint is bypassed with a 500 once.
      await page.type("#override-note-governing_law", "Reason for a failing request.");
      await page.setRequestInterception(true);
      const intercept = (request) => {
        if (request.url().endsWith("/edit/v1/assessment-override")) {
          request.respond({ status: 500, contentType: "application/json", body: "{}" });
        } else {
          request.continue();
        }
      };
      page.on("request", intercept);
      expectFailures = true;
      await page.click("#override-editor-governing_law .as-record");
      await page.waitForFunction(() => !document.querySelector("#override-error-governing_law").hidden &&
        /server/.test(document.querySelector("#override-error-governing_law").textContent));
      const failed = await page.evaluate(() => ({
        focusIsError: document.activeElement?.id === "override-error-governing_law",
        submitDisabled: document.querySelector("#override-editor-governing_law .as-record").disabled,
        note: document.getElementById("override-note-governing_law").value,
        status: document.getElementById("assessment-override-status").textContent,
      }));
      page.off("request", intercept);
      await page.setRequestInterception(false);
      expectFailures = false;
      assert.equal(failed.focusIsError, true);
      assert.equal(failed.submitDisabled, false);
      assert.equal(failed.note, "Reason for a failing request.", "the reason is kept");
      assert.match(failed.status, /was not recorded/);
      stored = core.readAssessmentAudit({ id: AUDIT_ID, scopes });
      assert.equal(stored.record.overrides.length, 1, "failed request stored nothing");

      // 6. Phone after-submit state and full-page overflow check.
      await page.setViewport(PHONE);
      await page.goto(url, { waitUntil: "networkidle0" });
      assert.equal(await noHorizontalScroll(page), true);
      await shot(page, shots, "390-after-submit.png", "#heading-issues");
      if (shots) await page.screenshot({ path: join(shots, "390-full.png"), fullPage: true });
      assert.deepEqual(failures, []);
    } finally {
      await browser.close();
      server.close();
    }
  });
