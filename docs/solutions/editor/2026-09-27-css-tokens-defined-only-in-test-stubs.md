---
title: "Test-only CSS tokens hid the assessment submit button"
lane: editor
tags: [css, assessment, test-stubs, browser, visibility]
status: resolved
related: ["app/editor/assessment-review.css", "app/editor/editor.css", "app/worker/src/editor-assets.js", "app/worker/test/assessment-review.test.js", "app/worker/test/assessment-review-browser.test.js", "PR #76"]
---

# Failure

Packet A's signer override initially could not be submitted: the button was
white on transparent. `app/editor/assessment-review.css` used `--pp-*` custom
properties defined only in the stub `EDITOR_CSS` in
`app/worker/src/editor-assets.js`, not the real `app/editor/editor.css`.
Tests supplied a dependency that production did not have.

# Fix and prevention

PR #76 made the assessment page CSS self-contained by defining its tokens.
Damien subsequently confirmed the override persisted (PASS).
Keep page CSS dependencies explicit. Add a static check that every `var()`
reference resolves to a defined property, and a browser visibility test using
real production styles that checks the submit button's foreground/background.
A successful click handler test cannot establish that a person can see the control.
