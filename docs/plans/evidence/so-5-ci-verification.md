# so-5 CI verification

## Scope and baseline

The build started from plan commit `25ebf7b`. The named editorial handoff was not in
this checkout, as the plan anticipated; the editor accessibility plan was present and
reviewed. This change adds CI only: it does not alter frontend behavior, publication,
data, migrations, daemons, or timers.

The local environment supplied Python 3.12 and Node 20. The workflow declares Python
3.12 and Node 24 because the Worker coverage helpers require Node APIs newer than the
repository's former Node 20 documentation. Hosted Actions execution remains a separate
controller receipt.

## Checks and negative proofs

- `tools/ci/prepare.sh` runs site, instructor, history, and Worker bundle generation in
  dependency order. Disposable-repository tests cover success from a nested directory
  under a path containing spaces and failure at every stage.
- The Node TAP verifier accepts the named assessment browser regression only when it is
  explicitly successful. Tests reject failed, skipped, absent, and malformed results.
- Python unittest and pytest, both Node globs, and all three existing accessibility
  invocations are separate workflow steps or matrix entries. Accessibility fail-fast is
  disabled, command status is preserved through logging, and only named diagnostics are
  retained after failure.

## Local receipt

The preparation helper completed successfully. Its history stage generated 353
documents, then Worker bundling copied all three generated data inputs.

The focused preparation tests passed (2 tests), and the Node verifier test passed. The
tools Node suite passed all 51 tests. Native unittest discovered 529 tests, but the
host lacked `jsonschema` and PyYAML and also exposed a pre-existing semantic-baseline
mismatch; the run therefore reported 7 import errors and 1 failure. Pytest stopped at
collection with the same 7 missing-dependency errors. Installing the declared packages
was blocked by this lane's denied package-network access.

The Worker suite cannot pass under the host's Node 20 because `node:sqlite` is absent;
the CI baseline deliberately supplies Node 24. The accessibility audit likewise could
not run because Puppeteer was unavailable and package installation was blocked. These
are unverified environment-limited checks, not passes. Workflow YAML parsing and the
public-safe diff check passed. Hosted Actions execution remains the controller's
separate receipt for the proposed revision.
