#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${CI_REPO_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

cd "$ROOT"
python3 tools/build_site.py --check
python3 tools/build_instructor_bundle.py
python3 tools/build_history.py --check
node app/worker/scripts/bundle-editor-data.mjs
