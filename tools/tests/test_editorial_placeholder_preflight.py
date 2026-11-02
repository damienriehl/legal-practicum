import pathlib


def test_preflight_runs_editorial_guard_after_generation_and_in_no_browser_mode():
    script = (pathlib.Path(__file__).parents[1] / "preflight.sh").read_text(encoding="utf-8")
    build = script.index('run "site build + link/leak sweeps"')
    guard = script.index('run "editorial placeholders (public artifact)"')
    browser = script.index("# ---- browser gates")
    assert build < guard < browser
    assert "check_editorial_placeholders.py site/platform" in script

