#!/usr/bin/env bash
# Rebuild docs/vibe-check-skill.zip from skills/vibe-check (run before committing skill changes).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f docs/vibe-check-skill.zip
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
cp -R skills/vibe-check "$TMP/vibe-check"
cp LICENSE "$TMP/vibe-check/LICENSE"
cp .cursor/rules/vibe-check.mdc AGENTS.snippet.md "$TMP/vibe-check/"
python3 - "$TMP" docs/vibe-check-skill.zip <<'PY'
import os, sys, zipfile
src, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for d, dirs, fs in os.walk(src):
        dirs.sort()
        for f in sorted(fs):
            p = os.path.join(d, f); a = os.path.relpath(p, src)
            i = zipfile.ZipInfo(a, (2026, 10, 15, 0, 0, 0))
            i.external_attr = (0o755 if os.access(p, os.X_OK) else 0o644) << 16
            i.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(i, open(p, 'rb').read())
PY
echo "built docs/vibe-check-skill.zip ($(du -h docs/vibe-check-skill.zip | cut -f1))"
