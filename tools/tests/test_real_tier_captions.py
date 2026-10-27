"""Regression contract for real-tier matter captions and jurisdictions."""

import copy
import json
import tempfile
import unittest
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]


def normalized(value):
    """Collapse Unicode whitespace without weakening punctuation or case checks."""
    return " ".join(str(value).split())


def check_real_tier_captions(root):
    """Return stable, source-specific violations of the real-tier contract."""
    root = Path(root)
    manifest_path = Path("data/matters/manifest.json")
    manifest = json.loads((root / manifest_path).read_text(encoding="utf-8"))
    rows = [row for row in manifest.get("matters", []) if row.get("tier") == "real"]
    errors = []
    if not rows:
        errors.append(f"{manifest_path}: matters: no real-tier matters declared")

    declared_slugs = {row.get("slug") for row in rows}
    matter_paths = sorted((root / "data/matters").glob("*/matter.json"))
    records = {}
    for path in matter_paths:
        record = json.loads(path.read_text(encoding="utf-8"))
        if record.get("tier") == "real":
            rel = path.relative_to(root)
            records[path.parent.name] = (rel, record)
            if path.parent.name not in declared_slugs:
                errors.append(f"{rel}: tier: real-tier record is not listed in {manifest_path}")

    for row in sorted(rows, key=lambda item: (str(item.get("id")), str(item.get("slug")))):
        matter_id = row.get("id", "<missing id>")
        slug = row.get("slug")
        rel = Path("data/matters") / str(slug) / "matter.json"
        if slug not in records:
            errors.append(f"{rel}: matter {matter_id}: missing real-tier matter record")
            continue
        record_rel, record = records[slug]

        for field in ("id", "tier", "jurisdiction", "shape"):
            if record.get(field) != row.get(field):
                errors.append(
                    f"{record_rel}: matter {matter_id}: {field}: {record.get(field)!r} "
                    f"does not match {manifest_path} value {row.get(field)!r}"
                )

        jurisdiction = row.get("jurisdiction")
        canon_rel = Path("data/jurisdictions/real") / f"{str(jurisdiction).lower()}.json"
        canon_path = root / canon_rel
        if not canon_path.is_file():
            errors.append(f"{canon_rel}: matter {matter_id}: jurisdiction: unknown canon {jurisdiction!r}")
            continue
        canon = json.loads(canon_path.read_text(encoding="utf-8"))
        if canon.get("code") != jurisdiction:
            errors.append(
                f"{canon_rel}: matter {matter_id}: code: {canon.get('code')!r} "
                f"does not match declared jurisdiction {jurisdiction!r}"
            )

        manifest_caption = normalized(row.get("caption", ""))
        matter_caption = normalized(record.get("caption", ""))
        if matter_caption != manifest_caption:
            errors.append(
                f"{record_rel}: matter {matter_id}: caption: does not match "
                f"{manifest_path} caption"
            )

        shape = row.get("shape")
        captions = ((manifest_path, manifest_caption), (record_rel, matter_caption))
        if shape == "criminal_dwi":
            expected = normalized(canon.get("name", "")) + " v. "
            for source, caption in captions:
                if not caption.startswith(expected):
                    errors.append(
                        f"{source}: matter {matter_id}: caption: criminal_dwi caption must "
                        f"start with {expected!r} for jurisdiction {jurisdiction}"
                    )
        elif shape == "attorney_discipline":
            expected = f", a {normalized(canon.get('adjective', ''))} Attorney"
            for source, caption in captions:
                if not caption.endswith(expected):
                    errors.append(
                        f"{source}: matter {matter_id}: caption: attorney_discipline caption "
                        f"must end with {expected!r} for jurisdiction {jurisdiction}"
                    )

    return sorted(errors)


class RealTierCaptionContract(unittest.TestCase):
    def assertValid(self, root):
        self.assertEqual(check_real_tier_captions(root), [])

    def fixture(self, *, shape="criminal_dwi", caption="State of Minnesota v. Alex Example"):
        temp = tempfile.TemporaryDirectory()
        root = Path(temp.name)
        row = {
            "id": "m90", "slug": "m90-example-mn", "tier": "real",
            "jurisdiction": "MN", "shape": shape, "caption": caption,
        }
        record = copy.deepcopy(row)
        manifest = root / "data/matters/manifest.json"
        matter = root / "data/matters/m90-example-mn/matter.json"
        canon = root / "data/jurisdictions/real/mn.json"
        for path, value in (
            (manifest, {"matters": [row]}),
            (matter, record),
            (canon, {"code": "MN", "name": "State of Minnesota", "adjective": "Minnesota"}),
        ):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(value), encoding="utf-8")
        return temp, root, row, record

    def rewrite(self, root, relative, value):
        (root / relative).write_text(json.dumps(value), encoding="utf-8")

    def test_current_corpus_satisfies_contract_and_has_coverage(self):
        self.assertValid(REPO)
        manifest = json.loads((REPO / "data/matters/manifest.json").read_text())
        self.assertTrue(any(row.get("tier") == "real" for row in manifest["matters"]))

    def test_unicode_whitespace_is_equivalent_but_party_drift_is_not(self):
        temp, root, row, record = self.fixture()
        self.addCleanup(temp.cleanup)
        record["caption"] = "State\u00a0of  Minnesota v. Alex\tExample"
        self.rewrite(root, "data/matters/m90-example-mn/matter.json", record)
        self.assertValid(root)
        record["caption"] = "State of Minnesota v. Avery Example"
        self.rewrite(root, "data/matters/m90-example-mn/matter.json", record)
        self.assertRegex("\n".join(check_real_tier_captions(root)), r"matter m90: caption")

    def test_dwi_meridian_and_coordinated_wrong_state_are_rejected(self):
        temp, root, row, record = self.fixture()
        self.addCleanup(temp.cleanup)
        for caption in ("State\u00a0of Meridian v. Alex Example", "State of California v. Alex Example"):
            row["caption"] = record["caption"] = caption
            self.rewrite(root, "data/matters/manifest.json", {"matters": [row]})
            self.rewrite(root, "data/matters/m90-example-mn/matter.json", record)
            errors = check_real_tier_captions(root)
            self.assertTrue(any("must start with 'State of Minnesota v. '" in e for e in errors))
            self.assertEqual(errors, check_real_tier_captions(root))

    def test_discipline_meridian_and_coordinated_wrong_state_are_rejected(self):
        valid = "In re Petition against Alex Example, a Minnesota Attorney"
        temp, root, row, record = self.fixture(shape="attorney_discipline", caption=valid)
        self.addCleanup(temp.cleanup)
        for caption in (
            "In re Petition against Alex Example, a Meridian Attorney",
            "In re Petition against Alex Example, a California Attorney",
        ):
            row["caption"] = record["caption"] = caption
            self.rewrite(root, "data/matters/manifest.json", {"matters": [row]})
            self.rewrite(root, "data/matters/m90-example-mn/matter.json", record)
            errors = check_real_tier_captions(root)
            self.assertTrue(any("must end with ', a Minnesota Attorney'" in e for e in errors))

    def test_each_caption_source_is_identified_when_corrupted(self):
        temp, root, row, record = self.fixture()
        self.addCleanup(temp.cleanup)
        row["caption"] = "State of Minnesota v. Manifest Error"
        self.rewrite(root, "data/matters/manifest.json", {"matters": [row]})
        errors = check_real_tier_captions(root)
        self.assertTrue(any("data/matters/m90-example-mn/matter.json" in e for e in errors))
        row["caption"] = record["caption"]
        record["caption"] = "State of Minnesota v. Matter Error"
        self.rewrite(root, "data/matters/manifest.json", {"matters": [row]})
        self.rewrite(root, "data/matters/m90-example-mn/matter.json", record)
        self.assertTrue(any("data/matters/m90-example-mn/matter.json" in e for e in check_real_tier_captions(root)))

    def test_missing_empty_unlisted_and_unknown_sources_fail(self):
        temp, root, row, record = self.fixture()
        self.addCleanup(temp.cleanup)
        (root / "data/matters/m90-example-mn/matter.json").unlink()
        self.assertTrue(any("missing real-tier matter record" in e for e in check_real_tier_captions(root)))
        self.rewrite(root, "data/matters/manifest.json", {"matters": []})
        self.rewrite(root, "data/matters/m90-example-mn/matter.json", record)
        errors = check_real_tier_captions(root)
        self.assertTrue(any("no real-tier matters" in e for e in errors))
        self.assertTrue(any("not listed" in e for e in errors))
        self.rewrite(root, "data/matters/manifest.json", {"matters": [row]})
        (root / "data/jurisdictions/real/mn.json").unlink()
        self.assertTrue(any("unknown canon 'MN'" in e for e in check_real_tier_captions(root)))

    def test_identity_tier_jurisdiction_and_shape_drift_cannot_hide(self):
        for field, value in (("id", "m91"), ("tier", "fictional"),
                             ("jurisdiction", "CA"), ("shape", "auto_negligence")):
            with self.subTest(field=field):
                temp, root, _, record = self.fixture()
                try:
                    record[field] = value
                    self.rewrite(root, "data/matters/m90-example-mn/matter.json", record)
                    errors = check_real_tier_captions(root)
                    self.assertTrue(any(f": {field}:" in e or "missing real-tier" in e for e in errors))
                finally:
                    temp.cleanup()

    def test_neutral_caption_allows_state_words_and_fictional_tier_is_ignored(self):
        caption = "Minnesota Holdings v. California Products"
        temp, root, row, record = self.fixture(shape="auto_negligence", caption=caption)
        self.addCleanup(temp.cleanup)
        self.assertValid(root)
        fictional = copy.deepcopy(record)
        fictional.update(id="m01", slug="m01-meridian", tier="fictional",
                          jurisdiction="MERIDIAN", caption="State of Meridian v. Example")
        path = root / "data/matters/m01-meridian/matter.json"
        path.parent.mkdir(parents=True)
        path.write_text(json.dumps(fictional), encoding="utf-8")
        self.assertValid(root)

    def test_juvenile_legal_reference_needs_no_invented_state_phrase(self):
        caption = "In re J.C., a Minor (Cal. Welf. & Inst. Code § 602)"
        temp, root, _, _ = self.fixture(shape="juvenile_delinquency", caption=caption)
        self.addCleanup(temp.cleanup)
        self.assertValid(root)


if __name__ == "__main__":
    unittest.main()
