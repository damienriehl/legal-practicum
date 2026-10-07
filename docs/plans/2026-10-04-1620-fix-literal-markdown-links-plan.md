---
title: Literal markdown links and pitch spacing - Plan
type: fix
date: 2026-10-04
topic: literal-markdown-links
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Literal markdown links and pitch spacing - Plan

## Goal Capsule

**Objective.** Fix three defects found in the DEV visual check after PRs #98 and #99.

**Open blockers.** None.

## Product Contract

### Requirements

- R1. The platform's curriculum renderer (`markdown()` in `tools/build_site.py`) does not
  render `[text](href)` links, so the new "Running the firm with technology" template and the
  Module III pointer sentence show literal markdown on DEV (`[firm dashboard](../firm/index.html)`,
  `[Running the firm with technology](../templates/index.html#tpl-…)`). Rewrite both sentences
  as plain prose that names the page or template; do not add link parsing to the shared renderer,
  which the editor's canonical-text comparison relies on. The generated firm-page link remains the
  working link.
- R2. Add a build-level guard test: no built page under `site/platform/` contains a literal
  markdown link (`](` followed by a relative path, `#`, or `http`). Replace the vacuous link
  assertions in `tools/tests/test_firm_technology_exercise.py` (they matched the literal text)
  with assertions that the template and Module III name the exercise in plain text and that the
  firm page carries a real `<a href="../templates/index.html#tpl-running-the-firm-with-technology">`.
- R3. The firm dashboard's link to the exercise sits bare in the filter toolbar. Give it a short
  visible lead-in (for example "Exercise:") so it reads as content, not a control.
- R4. On the pitch (`site/index.html`), the "Assessment and feedback you can see" heading sits
  flush against the sample-feedback card above it. Give it the same top spacing the page uses
  between other blocks, via the page's existing spacing tokens.

## Implementation Units

- U1 (Codex worker). R1-R4, then rebuild the site, personas and instructor bundle (never run
  `data/taxonomy/_build_taxonomy.py`), refresh pinned semantic-baseline hashes if they change,
  and pass the gates.

## Verification Contract

`bash tools/preflight.sh` (full), parity, and a DEV visual check of the template, Module III,
firm page and pitch after deploy.
