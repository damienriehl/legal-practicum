"""Full-corpus and perturbation tests for presentation-only Platform work."""

from __future__ import annotations

import copy
import json
import os
import shutil
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)
sys.path.insert(0, TOOLS)

from fresh_site_build import build_fresh_site  # noqa: E402
import platform_semantic_contract as contract  # noqa: E402

BASELINE = os.path.join(HERE, "fixtures", "platform-semantic-baseline.json")


class TestPlatformSemanticContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp, cls.site, editor_map = build_fresh_site("semantic-contract-")
        cls.actual = contract.capture_site(cls.site, editor_map)
        with open(BASELINE, encoding="utf-8") as fh:
            cls.baseline = json.load(fh)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_getting_started_content_links_and_editability(self):
        page = self.actual["pages"]["getting-started/index.html"]
        text = " ".join(page["text"])
        for phrase in ("practicum director", "dean", "associate dean", "faculty",
                       "practicum teaching faculty", "teaching team", "Adapt",
                       "supervise the technology’s feedback and assessment",
                       "Faculty keep teaching the way they teach now"):
            self.assertIn(phrase, text)
        for word in ("critique", "grading", "demonstrate", "objective"):
            self.assertNotIn(word, text.lower())
        links = {link["href"] for link in page["links"]}
        self.assertTrue({"../matters/index.html", "../templates/index.html"} <= links)
        home_links = {link["href"] for link in self.actual["pages"]["index.html"]["links"]}
        self.assertIn("getting-started/index.html", home_links)
        refs = {block["source_ref"] for block in page["editor_blocks"]}
        for section, fields in {
            "hero": ("eyebrow", "heading", "lede"),
            "leadership": ("heading", "body"), "structure": ("heading", "body"),
            "oversight": ("heading", "body"),
            "resources": ("heading", "body", "library_label", "templates_label"),
        }.items():
            for field in fields:
                self.assertIn("data/copy/getting-started.json#" + section + "." + field, refs)

    def mutate(self, field, value, page="index.html"):
        changed = copy.deepcopy(self.actual)
        changed["pages"][page][field] = value
        return contract.compare_snapshots(self.baseline, changed)

    def test_clean_fresh_production_build_matches_baseline(self):
        self.assertEqual(contract.compare_snapshots(self.baseline, self.actual), [])

    def test_authored_assets_and_interactive_pages_are_excluded(self):
        pages = self.actual["pages"]
        self.assertNotIn("assets/preview.html", pages)
        self.assertNotIn("chat/index.html", pages)
        self.assertNotIn("chat/critique.html", pages)
        self.assertIn("index.html", pages)
        self.assertIn("getting-started/index.html", pages)
        self.assertIn("firm/index.html", pages)
        self.assertIn("modules/m1.html", pages)

    def test_authored_text_canary_fires(self):
        values = list(self.actual["pages"]["index.html"]["text"])
        values[0] += " MUTATED"
        self.assertTrue(any("text changed" in e for e in self.mutate("text", values)))

    def test_link_destination_canary_fires(self):
        values = copy.deepcopy(self.actual["pages"]["index.html"]["links"])
        values[0]["href"] = "changed-destination.html"
        self.assertTrue(any("links changed" in e for e in self.mutate("links", values)))

    def test_heading_order_canary_fires(self):
        values = list(reversed(self.actual["pages"]["index.html"]["headings"]))
        self.assertTrue(any("headings changed" in e for e in self.mutate("headings", values)))

    def test_every_editor_identity_dimension_has_a_canary(self):
        page = next(p for p, v in self.actual["pages"].items() if v["editor_blocks"])
        for mutation in ("delete", "duplicate", "id", "source", "kind", "text"):
            changed = copy.deepcopy(self.actual)
            blocks = changed["pages"][page]["editor_blocks"]
            if mutation == "delete":
                blocks.pop()
            elif mutation == "duplicate":
                blocks.append(copy.deepcopy(blocks[0]))
            elif mutation == "id":
                blocks[0]["source_ref"] += "changed"
            elif mutation == "source":
                blocks[0]["source_ref"] = "data/other.md#b00000000"
            else:
                blocks[0]["original_text" if mutation == "text" else "kind"] += " changed"
            self.assertTrue(contract.compare_snapshots(self.baseline, changed), mutation)

    def test_reading_order_canary_fires_without_identity_loss(self):
        page = next(p for p, v in self.actual["pages"].items()
                    if len(v["reading_order"]) > 1)
        changed = copy.deepcopy(self.actual)
        changed["pages"][page]["reading_order"][:2] = reversed(
            changed["pages"][page]["reading_order"][:2])
        errors = contract.compare_snapshots(self.baseline, changed)
        self.assertTrue(any("reading_order" in e or "attachment order" in e for e in errors))

    def test_positional_and_source_resolvability_canaries_fire(self):
        changed = copy.deepcopy(self.actual)
        changed["integrity_errors"] = [
            "x.html: duplicate editor placement index",
            "x.html: unresolvable editor source_ref 'missing.md#b00000000'",
        ]
        errors = contract.compare_snapshots(self.baseline, changed)
        self.assertTrue(any("placement index" in e for e in errors))
        self.assertTrue(any("unresolvable" in e for e in errors))

    def test_presentational_wrapper_and_class_changes_are_ignored(self):
        html = '<main><div class="old"><h1>Title</h1><p>Body</p></div></main>'
        restyled = '<main class="new"><section><h1 class="display">Title</h1><p>Body</p></section></main>'
        def parsed(source):
            p = contract._SemanticHTMLParser()
            p.feed(source)
            return p.text, p.headings, p.links
        self.assertEqual(parsed(html), parsed(restyled))


if __name__ == "__main__":
    unittest.main()
