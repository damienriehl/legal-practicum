"""The firm exercise uses the existing template renderer and linked dashboard."""
import re
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
import build_site as bs
STEM = 'running-the-firm-with-technology'
ANCHOR = 'tpl-' + STEM


def test_exercise_renders_in_business_teaching_order_and_links_resolve():
    templates = bs.load_curriculum()['templates']
    stems = [t['stem'] for t in templates]
    assert stems.index(STEM) == stems.index('engagement-letter-checklist') + 1
    assert stems.index(STEM) < stems.index('learning-portfolio')


def test_objectives_mapping_and_supervision_contract():
    source = (ROOT / 'data/curriculum/templates' / (STEM + '.md')).read_text()
    objectives = re.findall(r'^- (The student will demonstrate .+)', source, re.M)
    assert len(objectives) == 3
    assert all(' by ' in objective for objective in objectives)
    for identity in ('SK-PM-10', 'TSK-080', 'TSK-082', 'TSK-083', 'TSK-084', 'TSK-085'):
        assert identity in source
    for term in ('realization', 'collection', 'AR over 90 days', 'trust balance',
                 'fee revenue against plan', 'book of business', 'trailing-12-month snapshot',
                 'Never paste client-identifying information', 'ABA Formal Opinion 512 (2024)',
                 'Model Rules 7.1–7.3', 'Model Rules 1.1, 1.6, and 5.3', '1–7 score'):
        assert term in source
    for block in source.split('\n\n'):
        assert re.search(r'\{#b:[0-9a-f]{8}\}$', block.strip()), block


def test_exercise_language_and_feedback_contract():
    from test_platform_language_contract import (
        forbidden_educational_grading, forbidden_old_wording,
    )

    source = (ROOT / 'data/curriculum/templates' / (STEM + '.md')).read_text()
    assert forbidden_educational_grading(source) is None
    assert forbidden_old_wording(source) is None
    assert len(re.findall(r'\bAI\b', source)) <= 2
    for term in ('technology', 'tech', 'evolving technology'):
        assert term in source
    assert 'the tool does not make professional decisions for you' in source
    feedback = source.split('## Assessment and feedback', 1)[1]
    assert 'Lead feedback with what works and how to keep doing it' in feedback
    assert 'specific, manageable next steps' in feedback
    assert 'Keep feedback formative; never label work “good” or “bad.”' in feedback
    instrument = json.loads((ROOT / 'data/curriculum/assessment-instrument.json').read_text())
    headings = '; '.join(d['heading'] for d in instrument['content']['dimensions'])
    assert f'**{headings}**' in feedback


def test_generated_exercise_and_links(tmp_path, monkeypatch):
    monkeypatch.setattr(bs, 'OUT', str(tmp_path))
    bs.EDMAP.reset()
    corpus = bs.load_corpus()
    bs.build_templates(corpus)
    bs.build_modules(corpus)
    bs.build_firm_dashboard(corpus)
    page = (tmp_path / 'templates/index.html').read_text()
    assert f'id="{ANCHOR}"' in page
    assert 'The student will demonstrate financial judgment' in page
    assert '{#b:' not in page
    for name in ('firm/index.html', 'modules/m3.html'):
        html = (tmp_path / name).read_text()
        assert f'../templates/index.html#{ANCHOR}' in html
    exercise = page.split(f'id="{ANCHOR}"', 1)[1].split('</section>', 1)[0]
    for href in re.findall(r'href="([^"]+)"', exercise):
        link = urlsplit(href)
        target = (tmp_path / 'templates' / link.path).resolve()
        assert target.is_file(), href
        if link.fragment:
            assert f'id="{link.fragment}"' in target.read_text()
