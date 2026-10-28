import json
import pathlib
import subprocess
import sys
import tempfile
import unittest
import zipfile

import pytest

TOOLS = pathlib.Path(__file__).parents[1]
sys.path.insert(0, str(TOOLS))

from check_editorial_placeholders import ScanError, scan_artifact  # noqa: E402


class EditorialPlaceholderCanary(unittest.TestCase):
    """Keep the publication defect visible to the stdlib test runner too."""

    def test_generated_style_html_rejects_zopa_note(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            write(root, "index.html", "<p>WHAT <em>DOES</em> ZOPA STAND FOR?</p>")
            self.assertEqual(scan_artifact(root)[0].rule_id, "editorial-zopa-question")

    def test_clean_instructional_copy_passes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            write(root, "lesson.md", "ZOPA means zone of possible agreement. What is yours?")
            self.assertEqual(scan_artifact(root), [])


def write(root, name, value):
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding="utf-8")
    return path


@pytest.mark.parametrize("value", [
    "WHAT DOES ZOPA STAND FOR", "what does\u00a0zopa stand for?",
    "WHAT  DOES\n ZOPA STAND FOR", "[TODO]", "[FIXME: revise]", "TODO: revise",
])
def test_recognized_markers_are_rejected(tmp_path, value):
    write(tmp_path, "page.txt", value)
    findings = scan_artifact(tmp_path)
    assert len(findings) == 1
    assert findings[0].location.startswith("page.txt:")


def test_html_decodes_and_joins_inline_text_but_not_blocks(tmp_path):
    write(tmp_path, "index.html", """
      <!-- TODO: ignored --><script>FIXME: ignored</script><style>[TBD]</style>
      <p>WHAT <em>DOES</em> ZOPA STAND FOR</p>
      <p>WHAT DOES</p><p>ZOPA STAND FOR</p>
      <details><summary>Open</summary><span aria-label="TODO: label">fine</span></details>
    """)
    findings = scan_artifact(tmp_path)
    assert [(item.rule_id, item.location) for item in findings] == [
        ("editorial-zopa-question", "index.html:3"),
        ("editorial-directive", "index.html:5"),
    ]


def test_json_csv_and_zip_are_scanned_without_cross_value_matches(tmp_path):
    write(tmp_path, "values.json", json.dumps(["WHAT DOES", "ZOPA STAND FOR", "[TBD]"]))
    write(tmp_path, "values.csv", '"WHAT DOES","ZOPA STAND FOR"\n')
    with zipfile.ZipFile(tmp_path / "student.zip", "w") as archive:
        archive.writestr("lesson.md", "**WHAT DOES ZOPA STAND FOR?**")
    findings = scan_artifact(tmp_path)
    assert [(item.rule_id, item.location) for item in findings] == [
        ("editorial-zopa-question", "student.zip!lesson.md:1"),
        ("editorial-bracketed-marker", 'values.json:1:$[2]'),
    ]


def test_legitimate_instructional_and_form_content_passes(tmp_path):
    write(tmp_path, "lesson.md", "What makes a good negotiation? ZOPA means zone of possible "
          "agreement. [Client name]\nSignature: ______\n- [ ] Prepare\nTBD Bank is a name.")
    write(tmp_path, "form.html", '<input placeholder="Client name" aria-label="Your answer">')
    assert scan_artifact(tmp_path) == []


@pytest.mark.parametrize("setup", ["empty", "json", "zip", "symlink"])
def test_incomplete_scans_fail_closed(tmp_path, setup):
    if setup == "json":
        write(tmp_path, "bad.json", "{")
    elif setup == "zip":
        (tmp_path / "bad.zip").write_bytes(b"not a zip")
    elif setup == "symlink":
        write(tmp_path, "ok.txt", "clean")
        (tmp_path / "linked.txt").symlink_to(tmp_path / "ok.txt")
    with pytest.raises(ScanError):
        scan_artifact(tmp_path)


def test_cli_reports_only_rule_and_location(tmp_path):
    secret_prose = "TODO: private surrounding matter"
    write(tmp_path, "page.txt", secret_prose)
    result = subprocess.run([sys.executable, str(TOOLS / "check_editorial_placeholders.py"),
                             str(tmp_path)], capture_output=True, text=True)
    assert result.returncode == 1
    assert "editorial-directive: page.txt:1" in result.stderr
    assert "private surrounding matter" not in result.stderr

