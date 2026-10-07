import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_record_behavior():
    subprocess.run(['node', '--test', 'tools/tests/practice_record.test.js'], cwd=ROOT, check=True, capture_output=True)


def test_local_page_and_canonical_feedback_integration():
    html = (ROOT / 'app/record/index.html').read_text()
    assert "connect-src 'none'" in html
    assert 'aria-live="polite"' in html
    assert 'clear-confirmation' in html
    assert '../templates/index.html#tpl-learning-portfolio' in html
    for name in ('record.js', 'record-storage.js', 'record-core.js'):
        source = (ROOT / 'app/record' / name).read_text()
        for forbidden in ('fetch(', 'XMLHttpRequest', 'WebSocket', 'confirm(', 'alert(', 'prompt(', '.innerHTML'):
            assert forbidden not in source
        assert (ROOT / 'site/platform/record' / name).read_text() == source
    for name in ('chat.js', 'critique.js'):
        source = (ROOT / 'app/chat' / name).read_text()
        assert 'PracticeRecordStorage.attach' in source
    assert '!cfg.sample && window.PracticeRecordStorage' in (ROOT / 'app/chat/chat.js').read_text()
    assert 'record/index.html' in (ROOT / 'site/platform/index.html').read_text()
    assert '../record/index.html' in (ROOT / 'site/platform/templates/index.html').read_text()
