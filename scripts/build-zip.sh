#!/usr/bin/env bash
#
#  Build docs/vibe-check-skill.zip — the "Download skill (.zip)" button on the
#  website. The zip is committed so GitHub Pages can serve it without a build
#  step, so this script aims to be reproducible: fixed timestamps, sorted
#  entries, no platform extras. Re-run it whenever the skill changes.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/docs/vibe-check-skill.zip"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

VERSION="$(node -e 'import("'"$ROOT"'/skills/vibe-check/scripts/scan.mjs").then(m=>process.stdout.write(m.VERSION))')"

# ── stage: a single vibe-check/ directory, so it extracts straight into
#    ~/.claude/skills/ and just works ──
DEST="$STAGE/vibe-check"
mkdir -p "$DEST/references" "$DEST/scripts"

cp "$ROOT/skills/vibe-check/SKILL.md"                            "$DEST/SKILL.md"
cp "$ROOT/skills/vibe-check/references/checks.md"                "$DEST/references/checks.md"
cp "$ROOT/skills/vibe-check/references/report-format.md"         "$DEST/references/report-format.md"
cp "$ROOT/skills/vibe-check/references/manual-verification.md"   "$DEST/references/manual-verification.md"
cp "$ROOT/skills/vibe-check/scripts/scan.mjs"                    "$DEST/scripts/scan.mjs"
cp "$ROOT/LICENSE"                                               "$DEST/LICENSE"
cp "$ROOT/SOURCES.md"                                            "$DEST/SOURCES.md"

cat > "$DEST/INSTALL.txt" <<EOF
vibe-check v${VERSION} — pre-launch legal & compliance scanner
https://github.com/vynemastudio/vibe-check   ·   MIT   ·   Vynema Studio

Educational tool, not legal advice. A clean report is not a compliance
certificate. Every citation in this skill is sourced in SOURCES.md.


WHAT IS IN HERE

  SKILL.md                            the skill, with YAML frontmatter
  references/checks.md                all 16 checks: scope, citation, fix
  references/report-format.md         the report template and disclaimer
  references/manual-verification.md   the browser/dashboard checks a grep
                                      cannot do
  scripts/scan.mjs                    the scanner — zero dependencies,
                                      Node 18+, read-only, no network
  SOURCES.md                          every legal citation, with links


INSTALL — CLAUDE CODE

  Unzip, then move the vibe-check folder into your skills directory:

    mkdir -p ~/.claude/skills
    mv vibe-check ~/.claude/skills/

  For a project-scoped skill your team gets from git, use
  .claude/skills/vibe-check/ inside the repo instead, and commit it.

  Then type /vibe-check, or say "vibe-check my app before I ship".


INSTALL — CURSOR

  Put the rule at .cursor/rules/vibe-check.mdc in your project:

    https://github.com/vynemastudio/vibe-check/blob/main/.cursor/rules/vibe-check.mdc

  and the scanner at .cursor/vibe-check/scan.mjs:

    mkdir -p .cursor/vibe-check
    cp vibe-check/scripts/scan.mjs .cursor/vibe-check/scan.mjs


INSTALL — CODEX / ANY AGENTS.md AGENT

  Append the vibe-check block from this repo's AGENTS.md to your project's
  AGENTS.md, and put the scanner where the agent can run it:

    mkdir -p .vibe-check
    cp vibe-check/scripts/scan.mjs .vibe-check/scan.mjs


JUST THE SCANNER

    node vibe-check/scripts/scan.mjs /path/to/your/app

  Flags: --json  --md  --only <ids>  --skip <ids>  --list  --quiet
         --no-color  --max-evidence <n>  --exit-zero

  Exit code is 1 when any check FAILs, 0 otherwise — so it works in CI.


EASIER NEXT TIME

    curl -fsSL https://vynemastudio.github.io/vibe-check/install.sh | bash
EOF

# ── reproducible zip: fixed mtime, sorted paths, no macOS resource forks ──
find "$STAGE" -exec touch -t 202601010000 {} +

rm -f "$OUT"
cd "$STAGE"

if command -v zip >/dev/null 2>&1; then
  export ZIP_OPTS=""
  # -X drops extra platform attributes; -r recurses; -q quiet; -9 max compress
  find vibe-check -type f | LC_ALL=C sort | zip -q -X -9 "$OUT" -@
elif command -v python3 >/dev/null 2>&1; then
  python3 - "$OUT" <<'PY'
import os, sys, zipfile
out = sys.argv[1]
paths = []
for base, _dirs, files in os.walk('vibe-check'):
    for f in files:
        paths.append(os.path.join(base, f))
paths.sort()
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in paths:
        zi = zipfile.ZipInfo(p, date_time=(2026, 1, 1, 0, 0, 0))
        zi.external_attr = 0o644 << 16
        zi.compress_type = zipfile.ZIP_DEFLATED
        with open(p, 'rb') as fh:
            z.writestr(zi, fh.read())
PY
else
  printf 'build-zip: need either the "zip" command or python3\n' >&2
  exit 1
fi

SIZE="$(cd "$ROOT" && wc -c < docs/vibe-check-skill.zip | tr -d ' ')"
printf 'built docs/vibe-check-skill.zip  (v%s, %s bytes, %s files)\n' \
  "$VERSION" "$SIZE" "$(find "$STAGE/vibe-check" -type f | wc -l | tr -d ' ')"
