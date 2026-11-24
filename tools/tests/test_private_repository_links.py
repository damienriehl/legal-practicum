"""Guard the public source links in fresh and committed site builds."""

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "tests"))

import build_site as bs  # noqa: E402
from fresh_site_build import build_fresh_site  # noqa: E402

REPO = "https://github.com/damienriehl/legal-practicum"


def _assert_public_repository_links(root):
    matters = root / "matters"
    expected_pages = [
        root / "about" / "content-license.html",
        root / "adopt" / "index.html",
        matters / "index.html",
        *sorted(matters.glob("page-*.html")),
    ]
    for page in expected_pages:
        assert f'href="{REPO}"' in page.read_text(encoding="utf-8"), page.relative_to(root)

    stale_pages = [
        str(page.relative_to(root))
        for page in sorted(root.rglob("*.html"))
        if "public soon" in page.read_text(encoding="utf-8").lower()
    ]
    assert not stale_pages


def test_repository_is_public_and_url_is_allowed():
    assert bs.PUBLIC_SOURCE_REPOSITORY == REPO
    assert bs.PUBLIC_SOURCE_REPOSITORY_LIVE is True
    assert REPO in bs._EXTERNAL_ALLOW


def test_committed_site_links_public_repository():
    _assert_public_repository_links(ROOT / "site" / "platform")


def test_fresh_site_links_public_repository():
    tmp, out, _ = build_fresh_site(prefix="repo-public-")
    try:
        _assert_public_repository_links(Path(out))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_repository_license_text_keeps_its_github_source():
    assert REPO in (ROOT / "CONTENT-LICENSE.md").read_text(encoding="utf-8")
