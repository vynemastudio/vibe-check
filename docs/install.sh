#!/usr/bin/env bash
# Vibe Check installer: https://vynemastudio.github.io/vibe-check
#   curl -fsSL https://vynemastudio.github.io/vibe-check/install.sh | bash
#   ... | bash -s -- --claude | --cursor | --codex | --all
# Claude Code: installs to ~/.claude/skills/vibe-check (all projects).
# Cursor / Codex: installs into the current project (.cursor/ or .agents/ + AGENTS.md).
set -euo pipefail
REPO="vynemastudio/vibe-check"; REF="${VIBECHECK_REF:-main}"
L=$'\033[1;38;5;155m'; R=$'\033[1;38;5;203m'; D=$'\033[2m'; B=$'\033[1m'; X=$'\033[0m'
[ -t 1 ] || { L=; R=; D=; B=; X=; }
say(){ printf '%s\n' "$*"; }
want_claude=0; want_cursor=0; want_codex=0; explicit=0
for a in "$@"; do case "$a" in
  --claude) want_claude=1; explicit=1;; --cursor) want_cursor=1; explicit=1;; --codex) want_codex=1; explicit=1;;
  --all) want_claude=1; want_cursor=1; want_codex=1; explicit=1;;
  -h|--help) sed -n '2,6p' "$0" 2>/dev/null || true; say "flags: --claude --cursor --codex --all"; exit 0;;
  *) say "${R}unknown flag:${X} $a"; exit 2;; esac; done

say ""; say "  ${L}▲ VIBE CHECK${X} ${D}installer${X}"; say ""
if [ "$explicit" = 0 ]; then
  { command -v claude >/dev/null 2>&1 || [ -d "$HOME/.claude" ]; } && want_claude=1
  { [ -d .cursor ] || command -v cursor >/dev/null 2>&1; } && want_cursor=1
  { command -v codex >/dev/null 2>&1 || [ -d "$HOME/.codex" ] || [ -f AGENTS.md ]; } && want_codex=1
  if [ $((want_claude+want_cursor+want_codex)) = 0 ]; then say "  ${D}No agent detected, installing for Claude Code.${X}"; want_claude=1; fi
fi

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
if [ -n "${VIBECHECK_SRC:-}" ]; then SRC="$VIBECHECK_SRC"
else
  curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$REF" | tar -xz -C "$TMP"
  SRC="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -1)"
fi
SKILL="$SRC/skills/vibe-check"
[ -f "$SKILL/SKILL.md" ] || { say "${R}Download failed: SKILL.md not found.${X}"; exit 1; }
copy(){ rm -rf "$1"; mkdir -p "$1"; cp -R "$SKILL"/. "$1"/; }

is_project=0; { [ -d .git ] || [ -f package.json ] || [ -f pyproject.toml ]; } && is_project=1
proj_warn(){ [ "$is_project" = 1 ] || say "  ${D}note: $(pwd) doesn't look like a project root. Run this inside your app's folder for $1.${X}"; }

if [ "$want_claude" = 1 ]; then
  copy "$HOME/.claude/skills/vibe-check"
  say "  ${L}✓${X} Claude Code  ${D}→ ~/.claude/skills/vibe-check${X}"
fi
if [ "$want_cursor" = 1 ]; then
  proj_warn Cursor
  copy ".cursor/vibe-check"; mkdir -p .cursor/rules; cp "$SRC/.cursor/rules/vibe-check.mdc" .cursor/rules/
  say "  ${L}✓${X} Cursor       ${D}→ .cursor/rules/vibe-check.mdc + .cursor/vibe-check/${X}"
fi
if [ "$want_codex" = 1 ]; then
  proj_warn Codex
  copy ".agents/vibe-check"
  if [ -f AGENTS.md ] && grep -q 'vibe-check:start' AGENTS.md; then
    awk '/<!-- vibe-check:start -->/{skip=1} !skip{print} /<!-- vibe-check:end -->/{skip=0}' AGENTS.md > "$TMP/a" && mv "$TMP/a" AGENTS.md
  fi
  { [ -s AGENTS.md ] && printf '\n'; cat "$SRC/AGENTS.snippet.md"; } >> AGENTS.md
  say "  ${L}✓${X} Codex        ${D}→ AGENTS.md + .agents/vibe-check/${X}"
fi
say ""
say "  ${B}Next:${X} open your app and ask your agent: ${L}\"vibe check my app\"${X}"
say "  ${D}Or scan right now: node ~/.claude/skills/vibe-check/scripts/scan.mjs .${X}"
say "  ${D}Educational check, not legal advice.${X}"; say ""
