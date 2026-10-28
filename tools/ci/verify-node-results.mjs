#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const resultPath = process.argv[2];
if (!resultPath) {
  console.error("usage: verify-node-results.mjs <node TAP output>");
  process.exit(2);
}

let tap;
try {
  tap = await readFile(resultPath, "utf8");
} catch (error) {
  console.error(`node result is unavailable: ${error.message}`);
  process.exit(1);
}

const target = "in-place override: per-heading button, inline radio scale, keyboard, round trip, cancel, errors, phone fit";
const lines = tap.split(/\r?\n/);
const result = lines.find((line) => /^\s*(?:ok|not ok)\s+\d+\s+-\s+/.test(line) && line.includes(target));

if (!result) {
  console.error("assessment browser regression is absent from Node results");
  process.exit(1);
}
if (!/^\s*ok\b/.test(result) || /#\s*SKIP\b/i.test(result)) {
  console.error(`assessment browser regression did not execute successfully: ${result.trim()}`);
  process.exit(1);
}

console.log("assessment browser regression executed successfully");
