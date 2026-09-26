#!/usr/bin/env python3
"""Reviewed, append-only release-ledger backfill (Damien's decision, 2026-09-25).

Production already carries a set of DEV apply batches that the pre-user lane
(docs/pre-user-prod-deploy.md) shipped without recording a release, so the
ledger still lists them as pending publication and the Day Zero queue proof
cannot pass. This operator tool records exactly the reviewed batch set as
already published, and only after it proves locally, for every batch:

* the batch commit exists in the canonical repository and is an ancestor of
  the live production SHA (``git merge-base --is-ancestor``); and
* both production provenance surfaces (Pages ``/`` and the production Worker's
  ``/edit/release-provenance``) report that same live SHA, length-checked.

It then reads the release-service frontier, requires it to list exactly the
reviewed batches (or, on a retry, to be already empty at the live SHA), calls
``POST /edit/v1/prod/releases/backfill`` once with a fixed idempotency key, and
re-reads the frontier. The Worker appends one terminal record marked
``release_kind: ledger_backfill``; it never edits existing evidence rows.

The release-service bearer is read from standard input only (one line) and is
sent only to the allowlisted ledger origin. Provenance reads carry no
credential. Every HTTP read disables redirects. The receipt is written once,
mode 0600, and never contains the bearer.
"""

import argparse
import datetime
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import urllib.error
import urllib.request

LEDGER_ORIGIN = "https://sonsteng-chat.damienriehl.workers.dev"
BACKFILL_PATH = "/edit/v1/prod/releases/backfill"
FRONTIER_PATH = "/edit/v1/prod/releases/frontier"
# (surface, URL, the exact success status that surface answers with)
PROVENANCE_SURFACES = (
    ("pages", "https://legalpracticum.org/", 200),
    ("worker",
     "https://sonsteng-chat-production.damienriehl.workers.dev/edit/release-provenance", 204),
)
USER_AGENT = "sonsteng-ledger-backfill/1.0"
SHA_RE = re.compile(r"[0-9a-f]{40}")
IDENTIFIER_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9._:-]{0,127}")
BEARER_RE = re.compile(r"[A-Za-z0-9._~+/=-]{16,4096}")
MAX_BATCHES = 1000
MAX_BATCH_ID_BYTES = 256
MAX_RESPONSE_BYTES = 1024 * 1024
MAX_BATCHES_FILE_BYTES = 256 * 1024
HTTP_TIMEOUT_SECONDS = 20
GIT_TIMEOUT_SECONDS = 60


class BackfillError(Exception):
    """A bounded, credential-free refusal category."""


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args, **_kwargs):
        return None


def _default_opener():
    return urllib.request.build_opener(_NoRedirect).open


def _utc(now):
    return now.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _sha(value, what):
    if not isinstance(value, str) or len(value) != 40 or not SHA_RE.fullmatch(value):
        raise BackfillError(f"{what}-malformed")
    return value


def _reject_duplicate_keys(pairs):
    keys = [key for key, _value in pairs]
    if len(keys) != len(set(keys)):
        raise BackfillError("json-duplicate-key")
    return dict(pairs)


def _loads(raw, what):
    try:
        return json.loads(raw.decode("utf-8"), object_pairs_hook=_reject_duplicate_keys)
    except BackfillError:
        raise
    except (UnicodeDecodeError, ValueError) as error:
        raise BackfillError(f"{what}-not-json") from error


def read_bearer(stream):
    if stream.isatty():
        raise BackfillError("bearer-stdin-is-a-terminal")
    raw = stream.buffer.read(4098) if hasattr(stream, "buffer") else stream.read(4098)
    if isinstance(raw, str):
        raw = raw.encode("utf-8", "surrogateescape")
    if raw.endswith(b"\n"):
        raw = raw[:-1]
    if raw.endswith(b"\r"):
        raw = raw[:-1]
    try:
        bearer = raw.decode("ascii")
    except UnicodeDecodeError as error:
        raise BackfillError("bearer-stdin-malformed") from error
    if not BEARER_RE.fullmatch(bearer):
        raise BackfillError("bearer-stdin-malformed")
    return bearer


def read_batches(path):
    path = pathlib.Path(path)
    try:
        raw = path.read_bytes()
    except OSError as error:
        raise BackfillError("batches-file-unreadable") from error
    if len(raw) > MAX_BATCHES_FILE_BYTES:
        raise BackfillError("batches-file-too-large")
    batches = _loads(raw, "batches-file")
    if not isinstance(batches, list) or not 1 <= len(batches) <= MAX_BATCHES:
        raise BackfillError("batches-file-malformed")
    seen = set()
    for batch in batches:
        if not isinstance(batch, dict) or set(batch) != {"batch_id", "commit_sha"}:
            raise BackfillError("batches-file-malformed")
        batch_id = batch["batch_id"]
        if (not isinstance(batch_id, str) or not batch_id
                or len(batch_id.encode("utf-8")) > MAX_BATCH_ID_BYTES or batch_id in seen):
            raise BackfillError("batches-file-malformed")
        seen.add(batch_id)
        _sha(batch["commit_sha"], "batch-commit-sha")
    return [{"batch_id": b["batch_id"], "commit_sha": b["commit_sha"]} for b in batches]


def _git(repo, argv, run):
    return run(["git", "-C", str(repo), *argv], capture_output=True, text=True,
               timeout=GIT_TIMEOUT_SECONDS, env={"LC_ALL": "C", "PATH": "/usr/bin:/bin"},
               check=False)


def verify_commit(repo, sha, run):
    result = _git(repo, ["rev-parse", "--verify", "--quiet", "--end-of-options",
                         sha + "^{commit}"], run)
    resolved = result.stdout.strip()
    if result.returncode != 0 or len(resolved) != 40 or resolved != sha:
        raise BackfillError("commit-not-in-repository")


def is_ancestor(repo, ancestor, descendant, run):
    result = _git(repo, ["merge-base", "--is-ancestor", ancestor, descendant], run)
    if result.returncode == 0:
        return True
    if result.returncode == 1:
        return False
    raise BackfillError("git-ancestry-check-failed")


def _read_bounded(response):
    raw = response.read(MAX_RESPONSE_BYTES + 1)
    if len(raw) > MAX_RESPONSE_BYTES:
        raise BackfillError("response-too-large")
    return raw


def read_provenance(opener):
    observed = {}
    for surface, url, expected_status in PROVENANCE_SURFACES:
        request = urllib.request.Request(url, method="GET", headers={"User-Agent": USER_AGENT})
        try:
            with opener(request, timeout=HTTP_TIMEOUT_SECONDS) as response:
                status = response.getcode()
                release_sha = response.headers.get("X-Release-SHA", "")
        except urllib.error.HTTPError as error:
            raise BackfillError(f"{surface}-provenance-status-{error.code}") from None
        except (urllib.error.URLError, OSError) as error:
            raise BackfillError(f"{surface}-provenance-unreachable") from error
        if status != expected_status:
            raise BackfillError(f"{surface}-provenance-status-{status}")
        observed[surface] = {"url": url, "status": status,
                             "release_sha": _sha(release_sha, f"{surface}-provenance-sha")}
    return observed


def _ledger(opener, bearer, path, body=None):
    data = None if body is None else json.dumps(
        body, sort_keys=True, separators=(",", ":")).encode("utf-8")
    headers = {"Authorization": "Bearer " + bearer, "Accept": "application/json",
               "User-Agent": USER_AGENT}
    if data is not None:
        headers.update({"Content-Type": "application/json", "X-Edit-Request": "1"})
    request = urllib.request.Request(LEDGER_ORIGIN + path, data=data,
                                     method="GET" if data is None else "POST", headers=headers)
    try:
        with opener(request, timeout=HTTP_TIMEOUT_SECONDS) as response:
            return response.getcode(), _loads(_read_bounded(response), "ledger-response"), data
    except urllib.error.HTTPError as error:
        try:
            payload = _loads(_read_bounded(error), "ledger-response")
        except BackfillError:
            payload = None
        code = None
        if isinstance(payload, dict) and isinstance(payload.get("error"), dict):
            code = payload["error"].get("code")
        if not isinstance(code, str) or not IDENTIFIER_RE.fullmatch(code):
            code = "unknown"
        return error.code, {"error": code}, data
    except (urllib.error.URLError, OSError) as error:
        raise BackfillError("ledger-unreachable") from error


def read_frontier(opener, bearer):
    status, payload, _data = _ledger(opener, bearer, FRONTIER_PATH)
    if status != 200 or not isinstance(payload, dict) or payload.get("ok") is not True:
        raise BackfillError(f"frontier-status-{status}")
    context = payload.get("context")
    if not isinstance(context, dict) or not isinstance(context.get("batches"), list):
        raise BackfillError("frontier-malformed")
    pairs = []
    for batch in context["batches"]:
        if not isinstance(batch, dict):
            raise BackfillError("frontier-malformed")
        pairs.append({"batch_id": batch.get("batch_id"), "commit_sha": batch.get("commit_sha")})
    return {
        "active_release_present": context.get("active_release") is not None,
        "blocked_reason": context.get("blocked_reason"),
        "base_sha": context.get("base_sha"),
        "batches": pairs,
    }


def _frontier_summary(frontier):
    return {"active_release_present": frontier["active_release_present"],
            "base_sha": frontier["base_sha"], "batch_count": len(frontier["batches"]),
            "blocked": frontier["blocked_reason"] is not None}


def _release_summary(release):
    if not isinstance(release, dict):
        return None
    keys = ("id", "state", "release_kind", "target_batch_id", "base_sha", "candidate_sha",
            "evidence_hash", "membership_hash")
    return {key: release.get(key) for key in keys}


def _write_receipt(path, receipt, bearer):
    serialized = json.dumps(receipt, indent=2, sort_keys=True) + "\n"
    if bearer and bearer in serialized:
        raise BackfillError("receipt-would-contain-bearer")
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        handle.write(serialized)
        handle.flush()
        os.fsync(handle.fileno())


def run_backfill(args, *, bearer, opener, run, utc_now, receipt):
    live = _sha(args.live_production_sha, "live-production-sha")
    batches = read_batches(args.batches_file)
    receipt["batches"] = batches

    provenance = read_provenance(opener)
    receipt["provenance"] = provenance
    for surface, observed in provenance.items():
        if observed["release_sha"] != live:
            raise BackfillError(f"{surface}-provenance-not-live-production-sha")

    repo = pathlib.Path(args.repo)
    verify_commit(repo, live, run)
    ancestry = []
    for batch in batches:
        verify_commit(repo, batch["commit_sha"], run)
        ancestor = is_ancestor(repo, batch["commit_sha"], live, run)
        ancestry.append({**batch, "is_ancestor_of_live": ancestor})
        if not ancestor:
            receipt["ancestry"] = ancestry
            raise BackfillError("batch-commit-not-ancestor-of-live-production")
    receipt["ancestry"] = ancestry

    before = read_frontier(opener, bearer)
    receipt["frontier_before"] = _frontier_summary(before)
    if before["active_release_present"] or before["blocked_reason"] is not None:
        raise BackfillError("frontier-not-backfillable")
    if before["batches"] == batches:
        receipt["frontier_before"]["matches_reviewed_batches"] = True
    elif not before["batches"] and before["base_sha"] == live:
        # A retry after the record landed: the Worker must answer as an exact replay.
        receipt["frontier_before"]["matches_reviewed_batches"] = False
    else:
        raise BackfillError("frontier-does-not-match-reviewed-batches")

    body = {"id": args.release_id, "idempotency_key": args.idempotency_key,
            "live_production_sha": live, "ancestry_verified": True,
            "provenance": {"pages_release_sha": provenance["pages"]["release_sha"],
                           "worker_release_sha": provenance["worker"]["release_sha"]},
            "batches": batches}
    receipt["request_sha256"] = hashlib.sha256(json.dumps(
        body, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()
    if args.dry_run:
        receipt["outcome"] = "dry-run-verified"
        return 0
    if not receipt["frontier_before"]["matches_reviewed_batches"] and not args.allow_replay:
        raise BackfillError("frontier-already-empty-pass-allow-replay-to-confirm")

    receipt["posted_utc"] = _utc(utc_now())
    status, payload, _data = _ledger(opener, bearer, BACKFILL_PATH, body)
    receipt["response"] = {"status": status}
    if status not in (200, 201) or not isinstance(payload, dict) or payload.get("ok") is not True:
        receipt["response"]["error"] = (payload or {}).get("error") if isinstance(payload, dict) else None
        raise BackfillError("ledger-refused-backfill")
    release = payload.get("release")
    receipt["response"].update({"replay": payload.get("replay") is True,
                                "release": _release_summary(release)})
    if (status == 200) != (payload.get("replay") is True):
        raise BackfillError("ledger-response-inconsistent")
    summary = receipt["response"]["release"] or {}
    if (summary.get("id") != args.release_id or summary.get("state") != "complete"
            or summary.get("release_kind") != "ledger_backfill"
            or summary.get("candidate_sha") != live
            or summary.get("target_batch_id") != batches[-1]["batch_id"]):
        raise BackfillError("ledger-response-does-not-match-request")

    after = read_frontier(opener, bearer)
    receipt["frontier_after"] = _frontier_summary(after)
    if after["active_release_present"] or after["blocked_reason"] is not None:
        raise BackfillError("frontier-after-not-empty")
    if after["base_sha"] != live:
        raise BackfillError("frontier-after-base-not-live-production-sha")
    if after["batches"]:
        raise BackfillError("frontier-after-not-empty")
    receipt["outcome"] = "replayed" if receipt["response"]["replay"] else "recorded"
    return 0


def build_parser():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--repo", required=True, help="canonical repository for ancestry proofs")
    parser.add_argument("--live-production-sha", required=True)
    parser.add_argument("--batches-file", required=True,
                        help='reviewed JSON list of {"batch_id","commit_sha"} in frontier order')
    parser.add_argument("--release-id", required=True)
    parser.add_argument("--idempotency-key", required=True)
    parser.add_argument("--receipt-path", required=True)
    parser.add_argument("--dry-run", action="store_true",
                        help="prove everything and read the frontier, but do not POST")
    parser.add_argument("--allow-replay", action="store_true",
                        help="confirm an already-recorded backfill as an exact replay")
    return parser


def main(argv=None, *, stdin=None, stdout=None, opener=None, run=subprocess.run,
         utc_now=None):
    stdin = sys.stdin if stdin is None else stdin
    stdout = sys.stdout if stdout is None else stdout
    opener = _default_opener() if opener is None else opener
    utc_now = utc_now or (lambda: datetime.datetime.now(datetime.timezone.utc))
    args = build_parser().parse_args(argv)
    for value, what in ((args.release_id, "release-id"), (args.idempotency_key, "idempotency-key")):
        if not IDENTIFIER_RE.fullmatch(value):
            print(f"error: {what} malformed", file=stdout)
            return 2
    receipt_path = pathlib.Path(args.receipt_path)
    if not receipt_path.is_absolute() or receipt_path.exists() or receipt_path.is_symlink() \
            or not receipt_path.parent.is_dir():
        print("error: receipt path must be absolute, absent, and in an existing directory",
              file=stdout)
        return 2
    receipt = {"tool": "prod_ledger_backfill", "started_utc": _utc(utc_now()),
               "ledger_origin": LEDGER_ORIGIN, "release_id": args.release_id,
               "idempotency_key": args.idempotency_key,
               "live_production_sha": args.live_production_sha, "dry_run": args.dry_run,
               "outcome": None, "error": None}
    bearer = None
    code = 1
    try:
        bearer = read_bearer(stdin)
        code = run_backfill(args, bearer=bearer, opener=opener, run=run, utc_now=utc_now,
                            receipt=receipt)
    except BackfillError as error:
        receipt["outcome"] = "refused"
        receipt["error"] = str(error)
        code = 1
    except subprocess.TimeoutExpired:
        receipt["outcome"] = "refused"
        receipt["error"] = "git-timeout"
        code = 1
    receipt["finished_utc"] = _utc(utc_now())
    try:
        _write_receipt(receipt_path, receipt, bearer)
    except (BackfillError, OSError) as error:
        print(f"error: receipt not written ({type(error).__name__})", file=stdout)
        return 1
    print(json.dumps({"outcome": receipt["outcome"], "error": receipt["error"],
                      "receipt": str(receipt_path)}, sort_keys=True), file=stdout)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
