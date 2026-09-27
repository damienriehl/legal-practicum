// Browser-level regression for the signer-review override control (Packet A2
// UAT, 2026-09-27): the page must render a VISIBLE, reachable submit button with
// the real served CSS, and a submitted override must persist and render after
// the reload. Serves the real view, asset server, endpoint, and a real
// node:sqlite EditorStoreCore under the /edit CSP. Skips when puppeteer is not
// installed (set PUP_DIR to its package dir); set ASSESSMENT_SHOTS_DIR to keep
// screenshots.
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

async function buttonReport(page) {
  return page.$eval("#assessment-override-form button[type=submit]", (button) => {
    const style = getComputedStyle(button);
    const rect = button.getBoundingClientRect();
    const form = getComputedStyle(button.closest("section"));
    return {
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      color: style.color,
      background: style.backgroundColor,
      border: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
      sectionBackground: form.backgroundColor,
      width: rect.width,
      height: rect.height,
    };
  });
}

test("override submit button is visible at desktop and phone widths and records an override",
  { skip: puppeteer ? false : "puppeteer not installed", timeout: 60_000 }, async () => {
    const core = seededCore();
    const { server, origin } = await startServer(core);
    const shots = process.env.ASSESSMENT_SHOTS_DIR;
    if (shots) mkdirSync(shots, { recursive: true });
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    try {
      const page = await browser.newPage();
      const failures = [];
      page.on("console", (message) => {
        if (message.type() === "error" && !/Failed to load resource/.test(message.text())) {
          failures.push(message.text());
        }
      });
      page.on("response", (response) => {
        if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) {
          failures.push(`${response.status()} ${response.url()}`);
        }
      });
      page.on("pageerror", (error) => failures.push(String(error)));
      for (const [label, viewport] of [["desktop", { width: 1280, height: 900 }],
        ["phone", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
        await page.setViewport(viewport);
        await page.goto(`${origin}/edit/assessments/${AUDIT_ID}`, { waitUntil: "networkidle0" });
        const report = await buttonReport(page);
        await page.$eval("#assessment-override-form button[type=submit]",
          (button) => button.scrollIntoView({ block: "center" }));
        if (shots) await page.screenshot({ path: join(shots, `override-${label}.png`) });
        assert.equal(report.display === "none", false, JSON.stringify(report));
        assert.equal(report.visibility, "visible", JSON.stringify(report));
        assert.equal(report.opacity, "1", JSON.stringify(report));
        assert.ok(report.height >= 44, `touch target ${report.height}px < 44px`);
        assert.ok(report.width >= 44, `touch target ${report.width}px < 44px`);
        // The label must contrast with what it sits on: a transparent button
        // with white text on the white section card is the UAT regression.
        assert.notEqual(report.background, "rgba(0, 0, 0, 0)", JSON.stringify(report));
        assert.notEqual(report.color, report.background, JSON.stringify(report));
        assert.notEqual(report.background, report.sectionBackground, JSON.stringify(report));
        // Every override control stays inside its card (no phone overflow).
        const overflow = await page.$eval(".as-override", (section) => {
          const box = section.getBoundingClientRect();
          return [...section.querySelectorAll("select, textarea, button")]
            .filter((el) => el.getBoundingClientRect().right > box.right + 0.5)
            .map((el) => el.id || el.tagName);
        });
        assert.deepEqual(overflow, [], `${label}: controls overflow the override card`);
        // Keyboard reachable: tab from the textarea lands on the button.
        await page.focus("#assessment-note");
        await page.keyboard.press("Tab");
        const focused = await page.evaluate(() => ({
          id: document.activeElement?.textContent,
          outline: getComputedStyle(document.activeElement).outlineStyle,
        }));
        assert.equal(focused.id, "Record signed override");
        assert.notEqual(focused.outline, "none");
      }
      assert.deepEqual(failures, []);

      // End to end: fill, submit via keyboard, reload, and see the override.
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(`${origin}/edit/assessments/${AUDIT_ID}`, { waitUntil: "networkidle0" });
      await page.select("#assessment-heading", "issues");
      await page.select("#assessment-score", "6");
      await page.type("#assessment-note", "Signer judgment after reviewing the evidence.");
      await page.focus("#assessment-override-form button[type=submit]");
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle0" }),
        page.keyboard.press("Enter"),
      ]);
      const text = await page.$eval("main", (main) => main.textContent);
      assert.doesNotMatch(text, /No human overrides have been recorded/);
      assert.match(text, /Signer judgment after reviewing the evidence\./);
      assert.match(text, /Human override by/);
      const stored = core.readAssessmentAudit({ id: AUDIT_ID,
        scopes: { "assessment-review": { granted: true, ver: 1 } } });
      assert.equal(stored.record.overrides.length, 1);
      assert.equal(stored.record.overrides[0].author, REVIEWER.editor);
      assert.deepEqual(stored.record.overrides[0].value,
        { heading_id: "issues", note: "Signer judgment after reviewing the evidence.", score: 6 });
      if (shots) await page.screenshot({ path: join(shots, "override-recorded.png"), fullPage: true });
    } finally {
      await browser.close();
      server.close();
    }
  });
