import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const verifier = fileURLToPath(new URL("../ci/verify-node-results.mjs", import.meta.url));
const target = "in-place override: per-heading button, inline radio scale, keyboard, round trip, cancel, errors, phone fit";

function verify(contents) {
  const dir = mkdtempSync(join(tmpdir(), "node-results-"));
  const result = join(dir, "results.tap");
  writeFileSync(result, contents);
  return spawnSync(process.execPath, [verifier, result], { encoding: "utf8" });
}

test("browser result verifier accepts only an explicit successful execution", () => {
  assert.equal(verify(`ok 7 - ${target}\n`).status, 0);
  for (const output of [
    `not ok 7 - ${target}\n`,
    `ok 7 - ${target} # SKIP puppeteer not installed\n`,
    "ok 1 - another test\n",
    "not TAP at all\n",
  ]) assert.notEqual(verify(output).status, 0, output);
});
