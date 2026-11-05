"""The source repository stays private (Damien, 2026-11-05): no generated page
may link to it until PUBLIC_SOURCE_REPOSITORY_LIVE flips, and flipping that one
switch must bring every repository link back."""

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "tests"))

import build_site as bs  # noqa: E402
from fresh_site_build import build_fresh_site  # noqa: E402

REPO = "https://github.com/damienriehl/legal-practicum"
TEXT_EXT = (".html", ".htm", ".json", ".csv", ".md", ".txt", ".js", ".css", ".svg", ".xml")


def _files_naming_repo(root):
    hits = []
    for path in Path(root).rglob("*"):
        if path.is_file() and path.suffix in TEXT_EXT:
            if REPO in path.read_text(encoding="utf-8", errors="ignore"):
                hits.append(str(path.relative_to(root)))
    return sorted(hits)


def test_switch_is_off_and_url_stays_sanctioned():
    assert bs.PUBLIC_SOURCE_REPOSITORY == REPO
    assert bs.PUBLIC_SOURCE_REPOSITORY_LIVE is False
    # Flipping the switch must need no allow-list edit.
    assert REPO in bs._EXTERNAL_ALLOW


def test_committed_site_never_names_the_private_repository():
    assert _files_naming_repo(ROOT / "site") == []


def test_fresh_build_with_switch_off_never_names_the_repository():
    tmp, out, _ = build_fresh_site(prefix="repo-off-")
    try:
        assert _files_naming_repo(out) == []
        matters = Path(out, "matters", "index.html").read_text(encoding="utf-8")
        assert "will be public soon" in matters
        license_page = Path(out, "about", "content-license.html").read_text(encoding="utf-8")
        assert "Licensed under CC BY 4.0. The source repository will be public soon." in license_page
        adopt = Path(out, "adopt", "index.html").read_text(encoding="utf-8")
        assert "will be public soon" in adopt
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_repository_license_text_keeps_its_github_source():
    # The renderer rewrites only the site's copy; the repo's own file is untouched.
    assert REPO in (ROOT / "CONTENT-LICENSE.md").read_text(encoding="utf-8")


def test_private_repository_sweep_flags_a_leak(tmp_path, monkeypatch):
    monkeypatch.setattr(bs, "OUT", str(tmp_path))
    (tmp_path / "page.html").write_text('<a href="%s">x</a>' % REPO, encoding="utf-8")
    assert bs.check_private_repository_links() == ["page.html"]
    monkeypatch.setattr(bs, "PUBLIC_SOURCE_REPOSITORY_LIVE", True)
    assert bs.check_private_repository_links() == []


def test_private_authored_url_is_suppressed_until_live(monkeypatch):
    assert bs.public_repository_url("") == ""
    assert bs.public_repository_url(REPO) == ""
    assert bs.public_repository_url("https://example.org/fork") == "https://example.org/fork"
    monkeypatch.setattr(bs, "PUBLIC_SOURCE_REPOSITORY_LIVE", True)
    assert bs.public_repository_url("") == REPO
    assert bs.public_repository_url(REPO) == REPO


def test_flipping_the_switch_renders_every_repository_link(monkeypatch):
    monkeypatch.setattr(bs, "PUBLIC_SOURCE_REPOSITORY_LIVE", True)
    tmp, out, _ = build_fresh_site(prefix="repo-on-")
    try:
        href = 'href="%s"' % REPO
        matters = Path(out, "matters", "index.html").read_text(encoding="utf-8")
        assert href in matters
        assert "View complete public source repository" in matters
        adopt = Path(out, "adopt", "index.html").read_text(encoding="utf-8")
        assert href in adopt
        license_page = Path(out, "about", "content-license.html").read_text(encoding="utf-8")
        assert "Source: " + REPO in license_page
        assert "will be public soon" not in matters + license_page
        saved_out = bs.OUT
        bs.OUT = out
        try:
            _, errors = bs.check_links()
            assert bs.check_private_repository_links() == []
        finally:
            bs.OUT = saved_out
        assert not [e for e in errors if "EXTERNAL" in e]
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
