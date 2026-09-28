"""Apply orchestration with real local child programs and offline wire boundaries."""
import io
import json
import urllib.error

import pytest

from test_coverage_apply_suggestions import ap, write


@pytest.mark.parametrize('failed', [None, 'build_worker_personas', 'build_instructor_bundle'])
def test_real_build_children_run_in_order_and_stop_at_failure(tmp_path, failed):
    names = ['build_site', 'build_worker_personas', 'build_instructor_bundle']
    for name in names:
        write(tmp_path, 'tools/' + name + '.py',
              'from pathlib import Path\nimport sys\n'
              f'with Path("calls.txt").open("a") as f: f.write({name!r} + "\\n")\n'
              f'print({name!r})\nsys.exit({7 if name == failed else 0})\n')
    ok, detail = ap.SubprocessPipeline().build(str(tmp_path))
    expected = names if failed is None else names[:names.index(failed) + 1]
    assert (tmp_path / 'calls.txt').read_text().splitlines() == expected
    assert ok is (failed is None)
    if failed:
        assert detail['step'] == failed and failed in detail['stdout']
    else:
        assert detail['stdout'].splitlines() == names


def test_regenerated_map_and_validation_report_are_read_from_child_outputs(tmp_path):
    bundle = {'pages': {'page.html': [{'source_ref': 'data/example.json#title', 'original_hash': 'h'}]}}
    write(tmp_path, 'tools/build_site.py', 'from pathlib import Path\n'
          'Path("build").mkdir(exist_ok=True)\n'
          f'Path("build/editor-map.generated.json").write_text({json.dumps(bundle)!r})\n')
    write(tmp_path, 'tools/validate_spine.py', 'from pathlib import Path\nimport sys\n'
          'Path(sys.argv[sys.argv.index("--json")+1]).write_text(\'{"errors":[],"fixture":true}\')\n'
          'print("validated")\n')
    pipeline = ap.SubprocessPipeline()
    index = pipeline.regenerate_map(str(tmp_path))
    assert index == {'data/example.json#title': {'source_ref': 'data/example.json#title', 'original_hash': 'h', 'page': 'page.html', 'occurrences': []}}
    ok, detail = pipeline.validate(str(tmp_path))
    assert ok and detail['report'] == {'errors': [], 'fixture': True}
    assert detail['stdout'] == 'validated\n'


@pytest.mark.parametrize('envelope', ['items', 'suggestions'])
def test_real_rpc_serialization_and_claimed_membership_filter(monkeypatch, envelope):
    requests = []
    def transport(request, timeout):
        requests.append(request)
        return io.BytesIO(json.dumps({envelope: [{'id': 'wanted'}, {'id': 'other'}]}).encode())
    monkeypatch.setattr(ap.urllib.request, 'urlopen', transport)
    client = ap.HttpRpcClient('https://example.invalid/', 'synthetic-token', timeout=5)
    assert client.fetch_batch_rows('batch', ['wanted']) == [{'id': 'wanted'}]
    client.reconcile()
    client.claim('batch', 'base')
    client.finalize('batch', phase='done', base_sha='base', applied=['wanted'])
    assert requests[0].method == 'GET'
    assert [r.full_url.rsplit('/', 1)[-1] for r in requests] == ['review', 'reconcile', 'claim', 'finalize']
    assert json.loads(requests[1].data) == {}
    assert json.loads(requests[2].data) == {'batch_id': 'batch', 'base_sha': 'base'}
    assert json.loads(requests[3].data) == {'batch_id': 'batch', 'phase': 'done', 'base_sha': 'base', 'applied': ['wanted']}
    assert all(r.get_header('Authorization') == 'Bearer synthetic-token' for r in requests)


def test_rpc_http_error_decodes_invalid_utf8_without_echoing_token(monkeypatch):
    def unavailable(request, timeout):
        raise urllib.error.HTTPError(request.full_url, 503, 'unavailable', {}, io.BytesIO(b'bad \xff response'))
    monkeypatch.setattr(ap.urllib.request, 'urlopen', unavailable)
    with pytest.raises(ap.ApplyError, match='HTTP 503') as result:
        ap.HttpRpcClient('https://example.invalid', 'synthetic-token').reconcile()
    assert 'synthetic-token' not in str(result.value)
    assert 'bad � response' in str(result.value)


@pytest.fixture(scope="module")
def curriculum_map(tmp_path_factory):
    """Exercise the production map builder on tracked source in a scratch tree."""
    import shutil
    import subprocess
    from pathlib import Path

    root = Path(ap.REPO_ROOT)
    scratch = tmp_path_factory.mktemp("curriculum-map")
    tracked = subprocess.check_output(
        ["git", "ls-files", "-z", "tools", "data", "app", "site"], cwd=root
    ).decode().split("\0")
    for rel in filter(None, tracked):
        if Path(rel).suffix in (".pem", ".key"):
            continue
        target = scratch / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(root / rel, target)
    index = ap.SubprocessPipeline().regenerate_map(str(scratch))
    import build_site
    walker = build_site._BlockWalker()
    walker.feed((scratch / "site/platform/modules/m1.html").read_text())
    ref = "data/curriculum/m1.md#bd3a87cb4"
    rendered = "".join(walker.candidates[index[ref]["index"]]["text"])
    return scratch, index, ref, rendered


def test_curriculum_formatting_only_edit_cannot_report_applied(curriculum_map):
    scratch, index, ref, rendered = curriculum_map
    block = index[ref]
    raw = block["original_text"]
    assert len(raw.encode()) == 653
    assert len(rendered.encode()) == 651
    # These are the production incident's exact length/prefix/suffix facts.
    assert raw.encode()[:223] == rendered.encode()[:223]
    assert raw.encode()[-383:] == rendered.encode()[-383:]
    assert raw[223:] != rendered[223:]
    assert ap.strip_inline_formatting(raw) == rendered
    row = dict(id="format-only", kind="prose", source_ref=ref,
               original_text=raw, original_hash=block["original_hash"],
               new_text=rendered)
    members, = ap._group_outcomes([row], index).values()
    status, patches = ap._gate_group(members, index, str(scratch))
    assert status == ap.OUT_NEEDS_HUMAN
    assert patches == []


def test_curriculum_real_plain_edit_reaches_source(curriculum_map, tmp_path):
    import shutil
    scratch, index, ref, rendered = curriculum_map
    rel = ref.split("#")[0]
    target = tmp_path / rel
    target.parent.mkdir(parents=True)
    shutil.copyfile(scratch / rel, target)
    before = target.read_bytes()
    new = rendered.replace("deceptively modest:", "deceptively modest;")
    row = dict(id="real-edit", kind="prose", source_ref=ref,
               original_hash=index[ref]["original_hash"], new_text=new)
    members, = ap._group_outcomes([row], index).values()
    status, patches = ap._gate_group(members, index, str(tmp_path))
    assert status == ""
    assert ap._apply_patch_files(str(tmp_path), patches) == {"real-edit": True}
    assert target.read_bytes() != before
    assert target.read_text() == before.decode().replace(
        "deceptively modest:", "deceptively modest;")
    assert "*think, read, and carry themselves as a lawyer*" in target.read_text()
