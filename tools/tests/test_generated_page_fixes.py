"""Regression contracts for user-story findings F5 and F10–F13."""

import re
from html import unescape
from pathlib import Path
from urllib.parse import parse_qs, urlsplit


ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "site/platform"


def test_generated_critique_links_include_matter_packet():
    links = []
    for path in SITE.rglob("*.html"):
        for href in re.findall(r'href="([^"]+)"', path.read_text()):
            url = urlsplit(unescape(href))
            if url.path.endswith("chat/critique.html"):
                links.append(href)
                packet = parse_qs(url.query).get("packet", [])
                assert len(packet) == 1, (path, href)
                assert re.fullmatch(r"\.\./matters/[a-z0-9-]+/", packet[0]), (path, href)
                assert (SITE / "chat" / packet[0] / "index.html").is_file(), (path, href)
    assert links, "no generated critique links found"


def test_catalog_fields_wrap_with_their_labels():
    page = (SITE / "matters/index.html").read_text()
    fields = re.findall(r'<div class="lib-field">(.*?)</div>', page, re.S)
    assert len(fields) == 4
    for field, name in zip(fields, ("search", "shape", "tier", "fee")):
        assert f'for="catalog-{name}"' in field
        assert f'id="catalog-{name}"' in field
    css = (SITE / "platform.css").read_text()
    assert re.search(r'\.lib-toolbar\{[^}]*flex-wrap:wrap[^}]*align-items:end', css)
    assert re.search(r'\.lib-field\{[^}]*min-width:0', css)


def test_hours_uses_shared_shell_without_overriding_global_styles():
    source = (ROOT / "app/hours/index.html").read_text()
    assert (SITE / "hours/index.html").read_text() == source
    for asset in ("../assets/fonts.css", "../assets/theme.css", "../platform.css",
                  "../assets/type-preference.js", "../platform.js"):
        assert f'"{asset}"' in source
    for contract in ('class="masthead__brand"', 'class="masthead__docket mono"',
                     'id="type-toggle" aria-pressed="false"', 'aria-label="Breadcrumb"',
                     '>Home</a>', '>Hours</span>', 'tabindex="-1"'):
        assert contract in source
    css = (ROOT / "app/hours/hours.css").read_text()
    for obsolete in (":root{", "html.type-lg{", "body{", "header{", "Arial", "Georgia"):
        assert obsolete not in css
    assert "connect-src 'none'" in source
    for name in ("hours-core.js", "hours.js"):
        assert (SITE / "hours" / name).read_bytes() == (ROOT / "app/hours" / name).read_bytes()


def test_kpi_values_stay_on_one_line_and_scale_to_the_card():
    css = (SITE / "platform.css").read_text()
    rule = re.search(r'\.kpi-tile__value\{([^}]+)', css)[1]
    assert "white-space:nowrap" in rule
    assert "font-size:clamp(" in rule
    assert "cqi" in rule
    assert re.search(r'\.kpi-hero \.kpi-tile__value\{font-size:clamp\(', css)


def test_dataset_notes_are_collapsed_after_all_skills():
    page = (SITE / "skills/index.html").read_text()
    notes = re.search(r'<details class="data-notes">(.*?)</details>', page, re.S)
    assert notes
    assert '<summary>About this data</summary>' in notes[1]
    assert len(re.findall(r'<p\b', notes[1])) == 3
    assert 'exercise_refs' in notes[1]
    assert page.index('id="ext-h"') < notes.start()
    assert 'Taxonomy source descriptions' not in page
    assert 'exercise_refs' not in page[:notes.start()]


def test_all_chip_variants_can_wrap_inside_the_viewport():
    css = (SITE / "platform.css").read_text()
    rule = re.search(r'\.chip\{([^}]+)', css)[1]
    for declaration in ("max-width:100%", "min-width:0", "white-space:normal", "overflow-wrap:anywhere"):
        assert declaration in rule
