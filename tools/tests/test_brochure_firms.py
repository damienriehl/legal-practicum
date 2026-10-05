"""Marketing copy contracts; actual pagination lives in the browser gate."""
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
import verify_pitch as pitch


@pytest.mark.parametrize('name', ['brochure', 'firms'])
def test_companion_pages_meet_pitch_gate_and_link_to_pitch_and_cost(name):
    page = ROOT / 'site' / f'{name}.html'
    assert pitch.verify_page(page) == []
    parser = pitch._parse(page)
    assert pitch.visible_counts(parser)[1] == 0
    links = {element.attrs.get('href') for element in parser.elements}
    assert {'index.html', 'cost-per-credit.html'} <= links
    assert any(element.attrs.get('class') == 'byline' for element in parser.elements)


@pytest.mark.parametrize('name', ['brochure', 'firms'])
@pytest.mark.parametrize('word', ['AI', 'centaur', 'Magnum Opus', 'jury', 'critique', 'diversity',
                                  'revolutionary', 'unlock', 'leverage', 'seamless', 'game-changing'])
def test_forbidden_visible_copy_is_rejected(tmp_path, name, word):
    source = (ROOT / 'site' / f'{name}.html').read_text()
    page = tmp_path / f'{name}.html'
    page.write_text(source.replace('<main id="main" tabindex="-1">',
                                   f'<main id="main" tabindex="-1"><p>{word}</p>'))
    assert any('visible' in error for error in pitch.verify_page(page))


@pytest.mark.parametrize('location', ['<header>John</header>', '<footer>Damien</footer>', '<p>Haydock</p>'])
def test_authors_belong_only_in_byline(tmp_path, location):
    parser = pitch.PageParser()
    parser.feed(location)
    assert any('only in the byline' in error for error in pitch._companion_language_errors(parser, 'brochure'))


def test_brochure_keeps_tagline_school_opener_and_routes():
    parser = pitch._parse(ROOT / 'site/brochure.html')
    text = pitch.visible_text(parser)
    for phrase in ['Good in theory. Better in practice. Practice ready.',
                   'Your school can be a leader in innovative legal education, with graduates who are practice ready.',
                   'Knowledge. Skills. The effective, appropriate use of evolving technology.',
                   'You betcha!', 'legalpracticum.org']:
        assert phrase in text
    assert any(element.attrs.get('href') == 'firms.html' for element in parser.elements)
    source = (ROOT / 'site/index.html').read_text()
    assert 'href="brochure.html"' in source.split('<header class="hero">')[1].split('</header>')[0]
    assert 'href="firms.html"' in source.split('<section id="free"')[1].split('</section>')[0]


def test_firms_word_range_is_enforced():
    parser = pitch.PageParser()
    parser.feed('<p>Practice.</p>')
    assert any('expected 400–700' in error for error in pitch._companion_language_errors(parser, 'firms'))


def test_print_gate_is_required_by_browser_preflight():
    source = (ROOT / 'tools/preflight.sh').read_text()
    assert 'run_node tools/verify_brochure_firms.js' in source
    verifier = (ROOT / 'tools/verify_brochure_firms.js').read_text()
    assert "format: 'Letter'" in verifier
    assert 'pages === 2' in verifier
    assert "['standard', 'large']" in verifier
