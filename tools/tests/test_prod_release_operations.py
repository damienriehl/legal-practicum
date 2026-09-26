"""Repository contracts that keep every PROD writer behind the release ledger."""

from pathlib import Path
import importlib.util


ROOT = Path(__file__).resolve().parents[2]


def _daemon_module():
    path = ROOT / "tools/prod_release_daemon.py"
    spec = importlib.util.spec_from_file_location("prod_release_daemon", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(module)
    return module


def test_legacy_prod_deployer_is_disabled_and_points_to_ledger_lane():
    source = (ROOT / "deploy/deploy-prod.sh").read_text(encoding="utf-8")

    assert "DISABLED: direct PROD deploy bypasses the Publisher release ledger" in source
    assert "prod_release_daemon.py" in source
    assert "wrangler" not in source
    assert "creds.env" not in source


def test_production_direct_apply_is_off_while_dev_remains_on():
    config = (ROOT / "app/worker/wrangler.jsonc").read_text(encoding="utf-8")

    assert config.count('"DIRECT_APPLY": "true"') == 2  # default DEV + named DEV
    assert config.count('"DIRECT_APPLY": "false"') == 1  # production only
    assert config.count('\\"release\\":{\\"release_service\\":1}') == 2


def test_prod_daemon_is_a_config_off_noop(monkeypatch):
    daemon = _daemon_module()
    monkeypatch.delenv("SONSTENG_PROD_RELEASE_ENABLED", raising=False)
    monkeypatch.delenv("SONSTENG_PROD_RELEASE_BEARER", raising=False)

    assert daemon.main([]) == 0


def test_installer_uses_dedicated_checkout_shared_flock_and_config_off_template():
    source = (ROOT / "tools/install-prod-release-daemon.sh").read_text(encoding="utf-8")

    assert ".local/share/sonsteng-daemon/checkout" in source
    assert ".locks/daemon.lock" in source
    assert "SONSTENG_PROD_RELEASE_ENABLED=false" in source
    assert "SONSTENG_PROD_BOOTSTRAP_BASE_SHA=" in source
    assert "SONSTENG_PROD_PAGES_BRANCH=main" in source
    assert "SONSTENG_PROD_RECOVERY_REGISTRY=" in source
    daemon = (ROOT / "tools/prod_release_daemon.py").read_text(encoding="utf-8")
    assert "--restore-release-id" in daemon
    assert "RecordedPairRestorer" in daemon
    assert "sonsteng-prod-release.service" in source
    assert "sonsteng-prod-release.timer" in source
    assert "systemctl --user enable --now" not in source


def test_operations_docs_cover_bypasses_credentials_and_real_uat():
    operations = (ROOT / "docs/prod-release-operations.md").read_text(encoding="utf-8")
    uat = (ROOT / "docs/uat/editor-publisher-matrix.md").read_text(encoding="utf-8")

    for phrase in [
        "Approval is not publication",
        "deploy/deploy-prod.sh",
        "automatic Pages builds",
        "direct branch writers",
        "SONSTENG_PROD_RELEASE_ENABLED=false",
        "rotation",
        "revocation",
        "Never copy credentials",
        "trusted candidate builder",
        "first-tick configuration digest",
        "process-scoped one-shot canary",
        "prior editing Worker version ID",
        "old Worker can read the migrated Durable Object state",
        "timer remains stopped and disabled",
        "compensate by stopping and disabling the timer",
        "TLS-only",
        "independent production scope",
    ]:
        assert phrase in operations
    for phrase in [
        "skill name",
        "alternate name",
        "subtask name",
        "subtask description",
        "locked ID",
        "Available on DEV — waiting for Publisher",
        "Production Publisher",
        "anonymous public",
        "authenticated editor map",
    ]:
        assert phrase in uat


def test_installed_service_declares_config_digest_and_one_shot_mode_but_stays_off():
    source = (ROOT / "tools/install-prod-release-daemon.sh").read_text(encoding="utf-8")
    assert "SONSTENG_PROD_EXPECTED_CONFIG_DIGEST=" in source
    assert "SONSTENG_PROD_RELEASE_MODE=routine" in source
    assert "SONSTENG_PROD_CANARY_RELEASE_ID=" in source
    assert "systemctl --user enable --now" not in source
    digest_tool = (ROOT / "tools/print_prod_release_config_digest.py").read_text(encoding="utf-8")
    assert "CONFIG_DIGEST_KEYS" in digest_tool
    assert "--env-file" in digest_tool


def test_production_release_lane_pins_wrangler_major_everywhere():
    executor = (ROOT / "tools/prod_release_executor.py").read_text(encoding="utf-8")
    assert 'WRANGLER_COMMAND = ("npx", "wrangler@4")' in executor
    assert '["npx", "wrangler"' not in executor
    assert '"npx wrangler' not in executor


def test_legacy_bootstrap_is_operator_only_and_has_no_publication_authority():
    bootstrap = (ROOT / "tools/prod_release_bootstrap.py").read_text(encoding="utf-8")
    daemon = (ROOT / "tools/prod_release_daemon.py").read_text(encoding="utf-8")

    assert "SONSTENG_PROD_BOOTSTRAP_AUTHORITY" in bootstrap
    assert "SONSTENG_PROD_RELEASE_ENABLED" in bootstrap
    assert "SONSTENG_PROD_RELEASE_BEARER" in bootstrap
    assert "ProductionCandidateBuilder" not in bootstrap
    assert "LedgerHTTP" not in bootstrap
    assert "prod_release_bootstrap" not in daemon


def test_day_zero_verifier_sources_use_standalone_pinned_operations_clone():
    runbook = (ROOT / "docs/day-zero-migration-operations.md").read_text(encoding="utf-8")
    ops = "/home/damienriehl/.local/share/sonsteng-ops/checkout"
    assert "/home/damienriehl/.local/share/sonsteng-daemon/checkout" not in runbook
    assert "Run this from the dedicated daemon checkout" not in runbook
    assert runbook.count(f"OPS_REPO={ops}\n") == 2
    assert 'trusted_git clone --no-local -- "$CANONICAL_REMOTE_URL" "$OPS_REPO"' in runbook
    assert 'trusted_git -C "$OPS_REPO" checkout --detach "$REVIEWED_OPS_COMMIT"' in runbook
    assert ('OBSERVED_GATE_VALUE=$(trusted_git -C "$OPS_REPO" '
            'rev-parse --path-format=absolute --git-common-dir) || exit 1\n'
            'test "$OBSERVED_GATE_VALUE" = "$OPS_REPO/.git"') in runbook
    assert ('OBSERVED_GATE_VALUE=$(trusted_git -C "$OPS_REPO" '
            'rev-parse --abbrev-ref HEAD) || exit 1\n'
            'test "$OBSERVED_GATE_VALUE" = HEAD') in runbook
    assert ('OBSERVED_GATE_VALUE=$(trusted_git -C "$OPS_REPO" '
            'rev-parse --verify HEAD) || exit 1\n'
            'test "$OBSERVED_GATE_VALUE" = "$REVIEWED_OPS_COMMIT"') in runbook
    assert runbook.count(
        'OPS_STATUS=$(trusted_git -C "$OPS_REPO" status --porcelain --untracked-files=all) || exit 1\n'
        'test -z "$OPS_STATUS" || exit 1'
    ) == 2
    preflight = runbook.split("Before pencils-down or either timer is changed,", 1)[1].split("queue_proof_preflight_rc=$?", 1)[0]
    assert f"/usr/bin/git -C {ops} rev-parse --verify 'HEAD^{{commit}}'" in preflight
    assert f"/usr/bin/git -C {ops} rev-parse '<reviewed-release-commit-SHA>:tools/prove_queues_empty.py'" in preflight
    assert f"/usr/bin/git -C {ops} hash-object -- {ops}/tools/prove_queues_empty.py" in preflight
    assert f") 9<{ops}/tools/prove_queues_empty.py" in preflight
    assert "builtin exec -c /usr/bin/env -i LC_ALL=C" in preflight
    assert "/usr/bin/python3 -I -B --check-hash-based-pycs always" in preflight
    reviewer = runbook.split("After review, the reviewer records", 1)[1].split("Before opening, the supervisor", 1)[0]
    assert reviewer.count(f"/usr/bin/git -C {ops}") == 2
