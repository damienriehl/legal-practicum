"""Contracts for the recording-reconciled platform language decisions."""

from __future__ import annotations

import json
import os
import re
import shutil
import sys
import unittest
from html.parser import HTMLParser
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)
ROOT = os.path.dirname(TOOLS)
sys.path.insert(0, TOOLS)
sys.path.insert(0, HERE)

from fresh_site_build import build_fresh_site  # noqa: E402


AUTHORED = [
    os.path.join(ROOT, "data", "copy", "home.json"),
    os.path.join(ROOT, "data", "copy", "getting-started.json"),
    *[os.path.join(ROOT, "data", "curriculum", name) for name in ("m1.md", "m2.md", "m3.md")],
]
AUTHORED += [
    os.path.join(root, name)
    for root, _dirs, names in os.walk(os.path.join(ROOT, "data", "matters"))
    for name in names
    if name == "exercise.json"
]
AUTHORED += [str(path) for path in Path(ROOT, "data", "curriculum", "templates").glob("*.md")]


def learner_text(paths=AUTHORED):
    return "\n".join(Path(path).read_text(encoding="utf-8") for path in paths)


LEGITIMATE_DOMAIN_USES = (
    "creamery grader",
    "first-grader",
    "seven-percent grade",
    "grades the offense",
)


def forbidden_educational_grading(text):
    scrubbed = text
    for phrase in LEGITIMATE_DOMAIN_USES:
        scrubbed = re.sub(re.escape(phrase), "", scrubbed, flags=re.I)
    return re.search(r"\bgrad(?:e|ed|er|ers|es|ing)\b", scrubbed, re.I)


def forbidden_advocate_stem(text):
    return re.search(r"\badvocat\w*", text, re.I)


class ReaderCopyParser(HTMLParser):
    """Inspect rendered words and accessible labels, excluding technical names."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.excluded = None
        self.words = []
        self.matter_labels = []
        self.label_depth = 0
        self.stack = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"script", "style"}:
            self.excluded = tag
        classes = attrs.get("class", "").split()
        label = tag in {"h1", "h2", "h3", "h4", "h5", "h6", "title", "option"} or any(
            value in classes for value in ("chip", "matter-shape", "matter-card__caption"))
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img",
                       "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append((tag, label))
            self.label_depth += label
        for name in ("alt", "title", "aria-label", "placeholder"):
            if name in attrs:
                self.words.append(attrs[name])
                if label:
                    self.matter_labels.append(attrs[name])
        if tag == "input" and attrs.get("type") in {"submit", "button", "reset"}:
            self.words.append(attrs.get("value", ""))
        if tag == "meta" and attrs.get("name") == "description":
            self.words.append(attrs.get("content", ""))

    def handle_endtag(self, tag):
        if tag == self.excluded:
            self.excluded = None
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                self.label_depth -= sum(label for _, label in self.stack[index:])
                del self.stack[index:]
                break

    def handle_data(self, data):
        if not self.excluded:
            self.words.append(data)
            if self.label_depth:
                self.matter_labels.append(data)


def reader_copy(source):
    parser = ReaderCopyParser()
    parser.feed(source)
    return " ".join(parser.words), " ".join(parser.matter_labels)


def forbidden_old_wording(text, *, jury=False):
    forms = r"\b(?:magnum\s+opus|the\s+opus|trusted\s+advisors|critiques?|centaur|human\s*\+\s*ai)\b"
    if jury:
        forms += r"|\bjury\b"
    return re.search(forms, text, re.I)


class TestPlatformLanguageContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp, cls.site, _editor_map = build_fresh_site("platform-language-")

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_authored_learner_language_uses_locked_vocabulary(self):
        text = learner_text()
        self.assertIsNone(forbidden_educational_grading(text))
        self.assertIn("assessment and feedback", text.lower())
        self.assertIn("Planning Guide and Checklist", text)

    def test_authored_technology_language_uses_kd3_contract(self):
        paths = [*Path(ROOT, "data/copy").glob("*.json"),
                 *Path(ROOT, "data/curriculum").glob("*.md"),
                 *Path(ROOT, "data/taxonomy").glob("*.json"),
                 *Path(ROOT, "data/matters").glob("*/exercise/exercise.json")]
        def leaves(value):
            if isinstance(value, dict):
                for child in value.values():
                    yield from leaves(child)
            elif isinstance(value, list):
                for child in value:
                    yield from leaves(child)
            elif isinstance(value, str):
                yield value
        for path in paths:
            with self.subTest(path=str(path)):
                source = path.read_text()
                text = " ".join(leaves(json.loads(source))) if path.suffix == ".json" else source
                self.assertIsNone(re.search(r"\bcentaur\b|\bhuman\s*\+\s*ai\b", text, re.I))

    def test_generated_learner_surfaces_use_locked_vocabulary(self):
        learner_pages = [
            Path(self.site, "index.html"),
            Path(self.site, "getting-started", "index.html"),
            Path(self.site, "templates", "index.html"),
            *Path(self.site, "modules").glob("*.html"),
        ]
        rendered = "\n".join(path.read_text(encoding="utf-8") for path in learner_pages)
        self.assertIsNone(forbidden_educational_grading(rendered))
        self.assertIn("Planning Guide and Checklist", rendered)

    def test_hand_authored_pitch_page_uses_locked_vocabulary(self):
        # The pitch page is hand-authored and lives outside site/platform/, so every
        # generator-scoped gate misses it. It is also the most public surface we own.
        # Without this assertion "grading" survives here indefinitely: it did, five
        # times, from the vocabulary lock on 2026-08-06 until the 2026-08-17 audit.
        pitch = Path(ROOT, "site", "index.html").read_text(encoding="utf-8")
        self.assertIsNone(forbidden_educational_grading(pitch))
        self.assertIsNone(forbidden_advocate_stem(pitch))
        self.assertIn(
            "Training the next generation of lawyers as trusted legal advisors.",
            pitch,
        )

        readme = Path(ROOT, "README.md").read_text(encoding="utf-8")
        self.assertIsNone(forbidden_advocate_stem(readme))

    def test_mutation_canary_detects_forbidden_pitch_language(self):
        pitch = Path(ROOT, "site", "index.html").read_text(encoding="utf-8")
        self.assertIsNotNone(forbidden_educational_grading(pitch + "\nWork is graded."))
        self.assertIsNotNone(forbidden_advocate_stem(pitch + "\nThey become advocates."))

    def test_reader_visible_copy_uses_johns_locked_vocabulary(self):
        public_pages = [Path(ROOT, "site", name) for name in
                        ("index.html", "cost-per-credit.html")]
        pages = public_pages + list(Path(self.site).rglob("*.html"))
        for page in pages:
            with self.subTest(page=str(page)):
                words, labels = reader_copy(page.read_text(encoding="utf-8"))
                self.assertIsNone(forbidden_old_wording(words, jury=page == public_pages[0]))
                if "matters" in page.parts and not any(
                        part in page.parts for part in ("exercise", "case-file", "facts", "law")):
                    self.assertIsNone(forbidden_old_wording(labels, jury=True))
        matter_copy = json.loads(Path(ROOT, "data/copy/matters.json").read_text())
        self.assertIsNone(forbidden_old_wording(json.dumps(matter_copy["shape_labels"]), jury=True))
        # These JavaScript literals become feedback UI text at runtime.
        source = Path(ROOT, "app/chat/critique.js").read_text()
        for line in source.splitlines():
            if any(marker in line for marker in ("el(", "oversizeOrNotice(",
                                                 "textContent =", "title: Q.get")):
                for literal in re.findall(r"'([^'\n]*)'", line):
                    if " " in literal:
                        self.assertIsNone(forbidden_old_wording(literal), literal)

    def test_mutation_canary_detects_old_reader_wording_and_preserves_domain_scope(self):
        pitch = Path(ROOT, "site/index.html").read_text()
        for old in ("Magnum Opus", "The Opus", "trusted advisors", "jury", "critique", "critiques", "centaur", "Human + AI", "human+AI"):
            with self.subTest(old=old):
                words, _ = reader_copy(pitch + "<p>" + old + "</p>")
                self.assertIsNotNone(forbidden_old_wording(words, jury=True))
        for markup in ('<h2>Jury trial</h2>', '<span class="chip">Jury trial</span>',
                       '<p class="matter-card__caption">Jury trial</p>',
                       '<h2 aria-label="Jury trial">Matter</h2>'):
            _, labels = reader_copy(markup)
            self.assertIsNotNone(forbidden_old_wording(labels, jury=True))
        words, labels = reader_copy(
            '<h1>Matter</h1><p>The jury decides the case.</p>'
            '<a href="/chat/critique.html" class="critique">Open feedback</a>'
            '<script>handleCritique("/v1/critique")</script>'
            '<!-- The Opus -->')
        self.assertIsNone(forbidden_old_wording(words))
        self.assertIsNone(forbidden_old_wording(labels, jury=True))
        for markup in ('<button aria-label="Submit for critique">Submit</button>',
                       '<input type="submit" value="Submit for critique">',
                       '<p>Trusted <strong>advisors</strong></p>',
                       '<div><input><h2>Jury <em>trial</em></h2></div>'):
            words, _ = reader_copy(markup)
            self.assertIsNotNone(forbidden_old_wording(words, jury=True))

    def test_technology_feedback_and_scripted_sample_are_both_accurately_labelled(self):
        home = json.loads(Path(ROOT, "data", "copy", "home.json").read_text(encoding="utf-8"))
        copy = json.dumps(home)
        self.assertIn("Technology gives the first-pass assessment and feedback, at any hour.", copy)
        self.assertRegex(copy, r"Scripted sample, not a live AI client")
        self.assertNotRegex(copy, r"(?i)(human|alumni).{0,40}speaker")

    def test_mutation_canary_detects_forbidden_learner_language(self):
        mutated = learner_text() + "\nYour submission is graded."
        self.assertIsNotNone(forbidden_educational_grading(mutated))

    def test_legitimate_domain_grader_is_not_in_the_learner_input_scope(self):
        for phrase in LEGITIMATE_DOMAIN_USES:
            self.assertIsNone(forbidden_educational_grading(phrase))

    def test_no_alumni_assessment_or_notification_route_in_runtime(self):
        source_root = Path(ROOT, "app", "worker", "src")
        runtime = "\n".join(path.read_text(encoding="utf-8") for path in source_root.rglob("*.js"))
        self.assertNotRegex(runtime, r"(?i)/[^\s\"']*alumni|notify\w*\([^)]*alumni")
        validation = Path(source_root, "validate.js").read_text(encoding="utf-8")
        self.assertIn("Alumni routing fields are not supported.", validation)


if __name__ == "__main__":
    unittest.main()


def test_long_exercise_letter_grade_governs_only_mapped_rubrics():
    import build_site as bs
    mapped = bs.build_rubric_section({"_rubric": {
        "declared_total": 100, "criteria": [],
        "letter_grade_map": [{"grade": "A", "points": 90}, {"grade": "B", "points": 80}],
    }}, "matters/test/index.html")
    assert "LETTER GRADE GOVERNS THIS EXERCISE · A ≥ 90 · B ≥ 80" in mapped
    assert "points are a consistency check" in mapped
    assert "ASSESSMENT BANDS" not in mapped
    unmapped = bs.build_rubric_section({"_rubric": {"declared_total": 7}}, "index.html")
    assert "LETTER GRADE" not in unmapped
    instrument = json.loads(Path(ROOT, "data", "curriculum", "assessment-instrument.json").read_text())
    assert instrument["content"]["presentation"]["score_4_label"] == "competent"
    assert instrument["content"]["presentation"]["letter_grade_translation"] == "prohibited"
