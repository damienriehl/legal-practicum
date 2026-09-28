---
title: "Gemini thinking tokens can consume the entire output budget"
lane: worker
tags: [google, gemini, debrief, thinking-tokens, truncation, observability]
status: resolved
related: ["app/worker/src/providers/google.js", "app/worker/src/debrief.js", "app/worker/src/index.js", "PR #49", "PR #51", "PR #52", "PR #75"]
---

# Symptom and cause

Google debrief returned `502 validation_error: The debrief exceeded the provider
output limit`. Both attempts ended with `finishReason: MAX_TOKENS` even after
PR #49 doubled `maxOutputTokens` from 1200 to 2400 on retry. Chat stayed healthy.
Gemini 2.5 Flash thinks by default; thinking tokens consumed the shared output
budget, leaving little or no structured JSON. A larger cap did not fix allocation.

# Fix and missed call site

PR #51 set `generationConfig.thinkingConfig = { thinkingBudget: 0 }` for Google
debrief and critique in `app/worker/src/debrief.js` and
`app/worker/src/providers/google.js`. Callers opt in because Gemini Pro rejects
zero; chat stayed unchanged. Truncation logs gained numeric prompt, candidate,
thought, and total usage counts. Live `debrief-oracle-content` then passed.

2026-09-27: the memo assessment grader was a missed structured-output call site,
returning 502 with `unparseable grader output`. PR #75 disabled thinking for both
BYOK and budgeted Google grader calls in `app/worker/src/index.js` using
`grader.provider === "google" ? 0 : undefined`.

# Prevention

When fixing one structured-output path, audit every call site, including alternate
funding paths; sharing a provider adapter does not ensure identical caller options.
Check `thoughtsTokenCount` and candidate text before increasing caps or retries.
Test the grader's provider options as well as debrief and critique options.
