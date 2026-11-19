import os
import pathlib
import subprocess


REPO = pathlib.Path(__file__).parents[2]
PREPARE = REPO / "tools" / "ci" / "prepare.sh"
COMMANDS = [
    ("python3", "tools/build_site.py", "--check"),
    ("python3", "tools/build_instructor_bundle.py"),
    ("python3", "tools/build_history.py", "--check"),
    ("node", "app/worker/scripts/bundle-editor-data.mjs"),
]


def _fixture(tmp_path, fail_at=None):
    root = tmp_path / "repository with spaces"
    bin_dir = root / "bin"
    bin_dir.mkdir(parents=True)
    log = root / "calls.log"
    for executable in ("python3", "node"):
        script = bin_dir / executable
        script.write_text(
            "#!/usr/bin/env bash\n"
            'printf "%s\\n" "$*" >> "$CI_CALL_LOG"\n'
            '[[ "$*" != "$CI_FAIL_AT" ]]\n',
            encoding="utf-8",
        )
        script.chmod(0o755)
    env = {
        **os.environ,
        "PATH": f"{bin_dir}:{os.environ['PATH']}",
        "CI_REPO_ROOT": str(root),
        "CI_CALL_LOG": str(log),
        "CI_FAIL_AT": fail_at or "",
    }
    return root, log, env


def _run(tmp_path, fail_at=None):
    root, log, env = _fixture(tmp_path, fail_at)
    nested = root / "nested" / "directory"
    nested.mkdir(parents=True)
    result = subprocess.run(["bash", str(PREPARE)], cwd=nested, env=env, check=False)
    calls = log.read_text(encoding="utf-8").splitlines()
    return result, calls


def test_prepare_runs_generators_in_dependency_order_from_nested_path(tmp_path):
    result, calls = _run(tmp_path)
    assert result.returncode == 0
    assert calls == [" ".join(command[1:]) for command in COMMANDS]


def test_prepare_stops_after_each_failed_generator(tmp_path):
    expected = [" ".join(command[1:]) for command in COMMANDS]
    for index, failed in enumerate(expected):
        result, calls = _run(tmp_path / str(index), failed)
        assert result.returncode != 0
        assert calls == expected[: index + 1]
