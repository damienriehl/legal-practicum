import datetime
import email.message
import importlib.util
import io
import json
import os
import pathlib
import stat
import subprocess
import urllib.error

import pytest

TOOLS = pathlib.Path(__file__).parents[1]
spec = importlib.util.spec_from_file_location("prod_ledger_backfill",
                                              TOOLS / "prod_ledger_backfill.py")
backfill = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backfill)

BEARER = "release-bearer-sentinel-0123456789"


def _git(repo, *argv):
    return subprocess.run(["git", "-C", str(repo), *argv], check=True, capture_output=True,
                          text=True, env={"LC_ALL": "C", "PATH": "/usr/bin:/bin",
                                          "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@e",
                                          "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@e",
                                          "GIT_CONFIG_GLOBAL": "/dev/null",
                                          "GIT_CONFIG_NOSYSTEM": "1"}).stdout.strip()


@pytest.fixture
def repo(tmp_path):
    root = tmp_path / "repo"
    root.mkdir()
    _git(root, "init", "-q", "-b", "main")
    shas = []
    for index in range(3):
        (root / "f.txt").write_text(str(index))
        _git(root, "add", "f.txt")
        _git(root, "commit", "-q", "-m", f"c{index}")
        shas.append(_git(root, "rev-parse", "HEAD"))
    _git(root, "checkout", "-q", "-b", "side", shas[0])
    (root / "g.txt").write_text("side")
    _git(root, "add", "g.txt")
    _git(root, "commit", "-q", "-m", "side")
    side = _git(root, "rev-parse", "HEAD")
    return {"root": root, "batches": shas[:2], "live": shas[2], "side": side}


class Response:
    def __init__(self, status, body=b"", headers=None):
        self._status, self._body = status, body
        self.headers = email.message.Message()
        for key, value in (headers or {}).items():
            self.headers[key] = value

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def getcode(self):
        return self._status

    def read(self, size=-1):
        return self._body if size < 0 else self._body[:size]


class FakeWorld:
    """Provenance surfaces plus a minimal release-service ledger."""

    def __init__(self, live, batches, *, pages_sha=None, worker_sha=None,
                 pages_status=200, worker_status=204):
        self.live, self.batches = live, [dict(b) for b in batches]
        self.pages_sha = live if pages_sha is None else pages_sha
        self.worker_sha = live if worker_sha is None else worker_sha
        self.pages_status, self.worker_status = pages_status, worker_status
        self.base_sha, self.recorded, self.requests = None, None, []
        self.refuse = None

    def __call__(self, request, timeout):
        assert timeout > 0
        self.requests.append(request)
        url = request.full_url
        if url == "https://legalpracticum.org/":
            return Response(self.pages_status, headers={"X-Release-SHA": self.pages_sha})
        if url.endswith("/edit/release-provenance"):
            return Response(self.worker_status, headers={"X-Release-SHA": self.worker_sha})
        assert url.startswith(backfill.LEDGER_ORIGIN + "/")
        assert request.get_header("Authorization") == "Bearer " + BEARER
        if url.endswith(backfill.FRONTIER_PATH):
            body = {"ok": True, "context": {"active_release": None, "base_sha": self.base_sha,
                                            "batches": [{**b, "generator_id": None,
                                                         "suggestion_ids": ["s"]}
                                                        for b in self.batches]}}
            return Response(200, json.dumps(body).encode())
        if url.endswith(backfill.BACKFILL_PATH):
            assert request.get_header("X-edit-request") == "1"
            payload = json.loads(request.data)
            if self.refuse:
                raise urllib.error.HTTPError(url, 409, "conflict", {}, io.BytesIO(
                    json.dumps({"error": {"code": self.refuse, "message": "x"}}).encode()))
            replay = self.recorded is not None
            if replay and payload != self.recorded:
                raise urllib.error.HTTPError(url, 409, "conflict", {}, io.BytesIO(
                    b'{"error":{"code":"idempotency_conflict","message":"x"}}'))
            self.recorded = payload
            self.batches, self.base_sha = [], self.live
            release = {"id": payload["id"], "state": "complete", "release_kind": "ledger_backfill",
                       "target_batch_id": payload["batches"][-1]["batch_id"],
                       "base_sha": self.live, "candidate_sha": self.live,
                       "evidence_hash": "e" * 64, "membership_hash": "m" * 64}
            return Response(200 if replay else 201, json.dumps(
                {"ok": True, **({"replay": True} if replay else {}), "release": release}).encode())
        raise AssertionError(url)


class Stdin(io.StringIO):
    def isatty(self):
        return False


def _run(tmp_path, repo, world, *, batches=None, extra=(), bearer=BEARER, name="receipt.json"):
    batches_file = tmp_path / "batches.json"
    if batches is None:
        batches = [{"batch_id": f"batch-{i}", "commit_sha": sha}
                   for i, sha in enumerate(repo["batches"])]
    batches_file.write_text(json.dumps(batches))
    receipt = tmp_path / name
    out = io.StringIO()
    code = backfill.main([
        "--repo", str(repo["root"]), "--live-production-sha", repo["live"],
        "--batches-file", str(batches_file), "--release-id", "ledger-backfill-20260925",
        "--idempotency-key", "ledger-backfill-20260925-v1", "--receipt-path", str(receipt),
        *extra], stdin=Stdin(bearer + "\n"), stdout=out, opener=world,
        utc_now=lambda: datetime.datetime(2026, 9, 25, 23, 0, tzinfo=datetime.timezone.utc))
    written = json.loads(receipt.read_text()) if receipt.exists() else None
    return code, written, receipt


def _world(repo, **kwargs):
    return FakeWorld(repo["live"], [{"batch_id": f"batch-{i}", "commit_sha": sha}
                                    for i, sha in enumerate(repo["batches"])], **kwargs)


def test_records_reviewed_batches_and_proves_frontier_empty(tmp_path, repo):
    world = _world(repo)
    code, receipt, path = _run(tmp_path, repo, world)
    assert code == 0, receipt
    assert receipt["outcome"] == "recorded"
    assert receipt["error"] is None
    assert [a["is_ancestor_of_live"] for a in receipt["ancestry"]] == [True, True]
    assert receipt["provenance"]["pages"]["release_sha"] == repo["live"]
    assert receipt["provenance"]["worker"]["status"] == 204
    assert receipt["frontier_before"]["batch_count"] == 2
    assert receipt["frontier_after"] == {"active_release_present": False, "base_sha": repo["live"],
                                         "batch_count": 0, "blocked": False}
    assert receipt["response"]["release"]["release_kind"] == "ledger_backfill"
    assert world.recorded["ancestry_verified"] is True
    assert world.recorded["provenance"] == {"pages_release_sha": repo["live"],
                                            "worker_release_sha": repo["live"]}
    assert stat.S_IMODE(os.stat(path).st_mode) == 0o600
    assert BEARER not in path.read_text()
    for request in world.requests:
        if not request.full_url.startswith(backfill.LEDGER_ORIGIN):
            assert request.get_header("Authorization") is None, "provenance reads carry no bearer"


def test_dry_run_proves_without_posting(tmp_path, repo):
    world = _world(repo)
    code, receipt, _ = _run(tmp_path, repo, world, extra=("--dry-run",))
    assert code == 0
    assert receipt["outcome"] == "dry-run-verified"
    assert world.recorded is None
    assert not any(r.full_url.endswith(backfill.BACKFILL_PATH) for r in world.requests)


def test_retry_requires_explicit_replay_and_then_confirms_it(tmp_path, repo):
    world = _world(repo)
    assert _run(tmp_path, repo, world)[0] == 0
    code, receipt, _ = _run(tmp_path, repo, world, name="retry.json")
    assert code == 1
    assert receipt["error"] == "frontier-already-empty-pass-allow-replay-to-confirm"
    code, receipt, _ = _run(tmp_path, repo, world, extra=("--allow-replay",), name="replay.json")
    assert code == 0
    assert receipt["outcome"] == "replayed"
    assert receipt["response"]["replay"] is True


def test_non_ancestor_commit_is_refused_before_any_ledger_call(tmp_path, repo):
    world = _world(repo)
    batches = [{"batch_id": "batch-0", "commit_sha": repo["batches"][0]},
               {"batch_id": "batch-1", "commit_sha": repo["side"]}]
    world.batches = batches
    code, receipt, _ = _run(tmp_path, repo, world, batches=batches)
    assert code == 1
    assert receipt["error"] == "batch-commit-not-ancestor-of-live-production"
    assert receipt["ancestry"][-1]["is_ancestor_of_live"] is False
    assert not any(r.full_url.startswith(backfill.LEDGER_ORIGIN) for r in world.requests)


def test_commit_absent_from_repository_is_refused(tmp_path, repo):
    world = _world(repo)
    batches = [{"batch_id": "batch-0", "commit_sha": "f" * 40}]
    code, receipt, _ = _run(tmp_path, repo, world, batches=batches)
    assert (code, receipt["error"]) == (1, "commit-not-in-repository")


@pytest.mark.parametrize("over,error", [
    ({"pages_sha": ""}, "pages-provenance-sha-malformed"),
    ({"worker_sha": "a" * 39}, "worker-provenance-sha-malformed"),
    ({"worker_sha": "A" * 40}, "worker-provenance-sha-malformed"),
    ({"pages_sha": "b" * 40}, "pages-provenance-not-live-production-sha"),
    ({"worker_sha": "c" * 40}, "worker-provenance-not-live-production-sha"),
    ({"pages_status": 204}, "pages-provenance-status-204"),
    ({"worker_status": 200}, "worker-provenance-status-200"),
])
def test_provenance_is_length_checked_and_must_agree(tmp_path, repo, over, error):
    world = _world(repo, **over)
    code, receipt, _ = _run(tmp_path, repo, world)
    assert (code, receipt["error"]) == (1, error)
    assert world.recorded is None


def test_live_sha_argument_is_length_checked(tmp_path, repo):
    world = _world(repo)
    repo = {**repo, "live": repo["live"][:39]}
    code, receipt, _ = _run(tmp_path, repo, world)
    assert (code, receipt["error"]) == (1, "live-production-sha-malformed")


def test_frontier_must_list_exactly_the_reviewed_batches(tmp_path, repo):
    world = _world(repo)
    world.batches.append({"batch_id": "batch-new", "commit_sha": repo["live"]})
    code, receipt, _ = _run(tmp_path, repo, world)
    assert (code, receipt["error"]) == (1, "frontier-does-not-match-reviewed-batches")
    assert world.recorded is None


def test_worker_refusal_is_recorded_with_its_bounded_code(tmp_path, repo):
    world = _world(repo)
    world.refuse = "release_history_exists"
    code, receipt, _ = _run(tmp_path, repo, world)
    assert (code, receipt["error"]) == (1, "ledger-refused-backfill")
    assert receipt["response"] == {"status": 409, "error": "release_history_exists"}


@pytest.mark.parametrize("batches", [
    [], [{"batch_id": "b", "commit_sha": "a" * 39}], [{"batch_id": "b"}],
    [{"batch_id": "b", "commit_sha": "a" * 40, "generator_id": None}],
    [{"batch_id": "b", "commit_sha": "a" * 40}, {"batch_id": "b", "commit_sha": "c" * 40}],
    [{"batch_id": "", "commit_sha": "a" * 40}],
])
def test_batches_file_is_strict(tmp_path, repo, batches):
    code, receipt, _ = _run(tmp_path, repo, _world(repo), batches=batches)
    assert code == 1
    assert receipt["error"] in {"batches-file-malformed", "batch-commit-sha-malformed"}


@pytest.mark.parametrize("bearer", ["", "short", "has space in it 0123456789", "x" * 4097])
def test_bearer_stdin_is_strict(tmp_path, repo, bearer):
    world = _world(repo)
    code, receipt, _ = _run(tmp_path, repo, world, bearer=bearer)
    assert (code, receipt["error"]) == (1, "bearer-stdin-malformed")
    assert world.requests == []


def test_receipt_path_must_be_fresh(tmp_path, repo):
    (tmp_path / "receipt.json").write_text("{}")
    code, receipt, _ = _run(tmp_path, repo, _world(repo))
    assert code == 2
    assert receipt == {}
