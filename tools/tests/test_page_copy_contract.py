"""Keep source indentation from rendering as line breaks in page copy."""

import json
import re
from pathlib import Path


COPY_DIR = Path(__file__).resolve().parents[2] / "data" / "copy"


def indented_line_breaks(value, path):
    if isinstance(value, dict):
        for key, child in value.items():
            yield from indented_line_breaks(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from indented_line_breaks(child, f"{path}[{index}]")
    elif isinstance(value, str) and re.search(r"\n[ \t]{2,}", value):
        yield path


def test_page_copy_has_no_indented_line_breaks():
    violations = [
        location
        for path in sorted(COPY_DIR.glob("*.json"))
        for location in indented_line_breaks(json.loads(path.read_text(encoding="utf-8")), path.name)
    ]
    assert not violations, "Indented line breaks in page copy: " + ", ".join(violations)


def test_indented_line_break_canary():
    copy = json.loads(r'{"lines": ["Heading\nSubheading", "Wrapped\n \ttext", "Wrapped\n  text"]}')
    assert list(indented_line_breaks(copy, "canary.json")) == [
        "canary.json.lines[1]",
        "canary.json.lines[2]",
    ]
