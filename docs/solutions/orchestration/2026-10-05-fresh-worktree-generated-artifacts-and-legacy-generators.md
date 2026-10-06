---
title: "Fresh worktrees fail gates for reasons that are not the change; one generator silently reverts the domain"
date: 2026-10-05
category: orchestration
module: tools/preflight.sh, data/taxonomy/_build_taxonomy.py, app/worker/scripts/bundle-editor-data.mjs
problem_type: workflow_issue
component: build
symptoms:
  - "Worker unit tests failed in a new worktree: history tests found 0 documents"
  - "bundle-editor-data reported MISSING editor-map and instructor bundle when run first"
  - "After a worker ran data/taxonomy/_build_taxonomy.py, every taxonomy @id switched to the retired sonsteng.damienriehl.com domain"
  - "A merged PR (#98) broke the browser persona-journey gate because it had only run preflight --no-browser"
  - "Rebasing a content branch over another content branch conflicted in ~75 generated files"
root_cause: missing_workflow_step
resolution_type: workflow_improvement
severity: medium
tags: [worktree, generated-artifacts, preflight, taxonomy, legacy-generator, rebase, codex-workers]
---

# Fresh worktrees fail gates for reasons that are not the change; one generator silently reverts the domain

Learned while shipping PRs #98-#104 (pitch rewrite, firm exercise, brochure, practice record).

## Generate in this order before running preflight in a new worktree

Untracked artifacts (`build/history-bundle.generated.json`, `app/worker/editor-data/*`) do not
exist in a fresh worktree, and the bundler needs the generators' outputs first:

```bash
python3 tools/build_site.py --check
python3 tools/build_worker_personas.py
python3 tools/build_instructor_bundle.py
python3 tools/build_history.py          # ~353 docs; 66 means the editor map was missing
node app/worker/scripts/bundle-editor-data.mjs
bash tools/preflight.sh
git checkout -- site/platform/data/.build-stamp.json   # stamp only changes git_base_sha
```

Without this, the worker history tests fail on an empty bundle and look like a regression.

## Never run `data/taxonomy/_build_taxonomy.py`

It is a legacy generator. It rewrites every `@id` in `data/taxonomy/*.json` to the retired
`sonsteng.damienriehl.com` domain and the gates do not catch it. Edit the taxonomy JSON (and the
generator source, if names change) directly. Say so explicitly in every worker brief that
touches `data/`.

## Run the full preflight, browser gates included, before merging content

`--no-browser` skips the persona journeys, which pin counts (for example the number of
`.template-doc` sections). PR #98 added a template, passed `--no-browser`, and broke the gate
for the next branch. The full run takes about ten minutes.

## Do not rebase content branches over each other; reapply sources and regenerate

Two branches that both rebuild `site/platform/**` conflict in dozens of generated files.
Resolving those by taking one side was blocked as destructive. What worked: start a new branch
from `origin/main`, apply only the source diff (`git diff <base> <commit> -- . ':(exclude)site/platform/**' ...`
then `git apply -3`), and regenerate outputs from the merged sources. Pinned semantic-baseline
hashes are regenerated with `tools/platform_semantic_contract.py`, never hand-edited.

## Smaller traps

- `codex-run.sh` often exits 2 ("no verified payload") even though the worker's edits landed;
  check the tree and rerun the gates yourself.
- The editor-client browser gate can time out under load (load average ~5); rerun it alone
  before treating a timeout as a regression.
- A test that asserts a URL appears in rendered HTML passes when the markdown link renders as
  literal text. `markdown()` in `tools/build_site.py` does not parse links; PR #100 added a
  guard against literal `](` in built pages.
- The chrome-devtools browser is a snap: it cannot read files under `/tmp`, and the upload tool
  only accepts workspace paths. To test file import, build a `File` in page script and dispatch
  it to the input instead.
