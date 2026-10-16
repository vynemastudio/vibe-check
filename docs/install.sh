#!/usr/bin/env bash
#
#  vibe-check installer
#  https://github.com/vynemastudio/vibe-check   ·   MIT   ·   Vynema Studio
#
#    curl -fsSL https://vynemastudio.github.io/vibe-check/install.sh | bash
#
#  Installs the vibe-check agent skill for Claude Code, Cursor and/or Codex.
#  Downloads a handful of text files. No sudo. No dependencies beyond curl (or
#  wget) and Node 18+ to actually run the scanner.
#
set -euo pipefail

VERSION="1.0.0"
REPO="vynemastudio/vibe-check"
BASE="${VIBE_CHECK_BASE:-https://raw.githubusercontent.com/${REPO}/main}"

# ────────────────────────────────── style ──────────────────────────────────
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  LIME=$'\033[38;5;154m'; RED=$'\033[38;5;203m'; AMBER=$'\033[38;5;215m'
  GREY=$'\033[38;5;245m'; BOLD=$'\033[1m'; OFF=$'\033[0m'
else
  LIME=""; RED=""; AMBER=""; GREY=""; BOLD=""; OFF=""
fi

say()  { printf '%s\n' "$*"; }
info() { printf '  %s\n' "$*"; }
ok()   { printf '  %s✓%s %s\n' "$LIME" "$OFF" "$*"; }
warn() { printf '  %s!%s %s\n' "$AMBER" "$OFF" "$*"; }
die()  { printf '\n  %s✗ %s%s\n\n' "$RED" "$*" "$OFF" >&2; exit 1; }

banner() {
  say ""
  printf '  %s%s vibe-check %s  %spre-launch legal & compliance scan%s\n' \
    "$BOLD" "$LIME" "$OFF" "$BOLD" "$OFF"
  printf '  %sv%s · Vynema Studio · educational tool, not legal advice%s\n' \
    "$GREY" "$VERSION" "$OFF"
  say ""
}

usage() {
  cat <<EOF

  vibe-check installer v${VERSION}

  USAGE
    curl -fsSL https://vynemastudio.github.io/vibe-check/install.sh | bash
    curl -fsSL https://vynemastudio.github.io/vibe-check/install.sh | bash -s -- --claude

  TARGETS
    --claude      Claude Code skill  →  ~/.claude/skills/vibe-check/
    --cursor      Cursor rule        →  ./.cursor/rules/vibe-check.mdc
    --codex       Codex instructions →  ./AGENTS.md  (+ ./.vibe-check/)
    --project     Claude Code, but into ./.claude/skills/ so you can commit it
    --all         everything that applies here

  OPTIONS
    --dry-run     show what would happen, write nothing
    --uninstall   remove what this installer added
    --force       overwrite without asking
    -h, --help    this screen
    -v, --version print version

  With no target flag and an interactive terminal, you get a short menu.
  Piped with no flags, it installs to whatever it detects.

EOF
}

# ──────────────────────────────── download ─────────────────────────────────
if command -v curl >/dev/null 2>&1; then
  FETCH() { curl -fsSL "$1"; }
elif command -v wget >/dev/null 2>&1; then
  FETCH() { wget -qO- "$1"; }
else
  die "Need curl or wget. Install one, or clone the repo: git clone https://github.com/${REPO}"
fi

TMP=""
cleanup() { [ -n "$TMP" ] && rm -rf "$TMP"; }
trap cleanup EXIT INT TERM

# get <remote-path> <local-destination>
get() {
  local src="$1" dst="$2" body
  if ! body="$(FETCH "${BASE}/${src}")" || [ -z "$body" ]; then
    die "Could not download ${src} from ${BASE}
     Check your connection, or clone the repo instead:
       git clone https://github.com/${REPO}"
  fi
  if [ "$DRY_RUN" = "1" ]; then
    info "${GREY}would write${OFF} $dst  ${GREY}($(printf '%s' "$body" | wc -c | tr -d ' ') bytes)${OFF}"
    return 0
  fi
  mkdir -p "$(dirname "$dst")"
  printf '%s\n' "$body" > "$dst"
}

backup_if_present() {
  local f="$1"
  [ -e "$f" ] || return 0
  [ "$DRY_RUN" = "1" ] && { info "${GREY}would back up${OFF} $f"; return 0; }
  cp "$f" "${f}.vibe-check-backup"
  warn "existing file backed up to ${f}.vibe-check-backup"
}

# ───────────────────────────── the skill payload ───────────────────────────
SKILL_FILES="SKILL.md references/checks.md references/report-format.md references/manual-verification.md scripts/scan.mjs"

install_skill_tree() {
  local root="$1" f
  for f in $SKILL_FILES; do
    get "skills/vibe-check/${f}" "${root}/${f}"
  done
  [ "$DRY_RUN" = "1" ] || chmod +x "${root}/scripts/scan.mjs" 2>/dev/null || true
}

# ──────────────────────────────── installers ───────────────────────────────
install_claude() {
  local root="$HOME/.claude/skills/vibe-check"
  say ""
  info "${BOLD}Claude Code${OFF} ${GREY}→ ~/.claude/skills/vibe-check/${OFF}"
  install_skill_tree "$root"
  ok "installed"
  info "${GREY}Use it:${OFF} open Claude Code and type ${BOLD}/vibe-check${OFF},"
  info "${GREY}       or just say \"vibe-check my app before I ship\".${OFF}"
}

install_project() {
  local root="./.claude/skills/vibe-check"
  say ""
  info "${BOLD}Claude Code (this project)${OFF} ${GREY}→ ./.claude/skills/vibe-check/${OFF}"
  install_skill_tree "$root"
  ok "installed — commit it to share with your team"
}

install_cursor() {
  say ""
  info "${BOLD}Cursor${OFF} ${GREY}→ ./.cursor/rules/vibe-check.mdc${OFF}"
  backup_if_present "./.cursor/rules/vibe-check.mdc"
  get ".cursor/rules/vibe-check.mdc" "./.cursor/rules/vibe-check.mdc"
  get "skills/vibe-check/scripts/scan.mjs" "./.cursor/vibe-check/scan.mjs"
  [ "$DRY_RUN" = "1" ] || chmod +x "./.cursor/vibe-check/scan.mjs" 2>/dev/null || true
  ok "installed"
  info "${GREY}Use it:${OFF} ask Cursor \"vibe-check this app before I ship\""
}

install_codex() {
  local target="./AGENTS.md"
  local begin="<!-- ─────────────────── vibe-check (begin) ─────────────────── -->"
  local end="<!-- ──────────────────── vibe-check (end) ───────────────────── -->"

  say ""
  info "${BOLD}Codex${OFF} ${GREY}→ ./AGENTS.md${OFF}"

  TMP="$(mktemp -d)"
  if ! FETCH "${BASE}/AGENTS.md" > "${TMP}/snippet.md" || [ ! -s "${TMP}/snippet.md" ]; then
    die "Could not download AGENTS.md from ${BASE}"
  fi

  get "skills/vibe-check/scripts/scan.mjs" "./.vibe-check/scan.mjs"
  [ "$DRY_RUN" = "1" ] || chmod +x "./.vibe-check/scan.mjs" 2>/dev/null || true

  if [ "$DRY_RUN" = "1" ]; then
    if [ -f "$target" ] && grep -qF "vibe-check (begin)" "$target"; then
      info "${GREY}would replace the existing vibe-check block in${OFF} $target"
    else
      info "${GREY}would append the vibe-check block to${OFF} $target"
    fi
    ok "dry run"
    return 0
  fi

  if [ ! -f "$target" ]; then
    cp "${TMP}/snippet.md" "$target"
    ok "created AGENTS.md"
    info "${GREY}Use it:${OFF} ask Codex \"vibe-check this app before I ship\""
    return 0
  fi

  # The snippet without its own "# AGENTS.md" heading, for merging.
  awk 'NR==1 && /^# AGENTS\.md$/ { next } { print }' "${TMP}/snippet.md" > "${TMP}/block.md"

  # Everything the user already had, minus any previous vibe-check block, with
  # trailing blank lines squeezed so repeat installs do not grow the file.
  awk '
    index($0, "vibe-check (begin)") { skip = 1 }
    !skip                          { print }
    index($0, "vibe-check (end)")  { skip = 0 }
  ' "$target" | awk '
    /^[[:space:]]*$/ { blanks++; next }
    { while (blanks-- > 0) print ""; blanks = 0; print }
  ' > "${TMP}/kept.md"

  backup_if_present "$target"

  # Build in a temp file and move into place. Never redirect into a file you
  # are still reading — the redirect truncates it first.
  { cat "${TMP}/kept.md"; printf '\n'; cat "${TMP}/block.md"; } > "${TMP}/merged.md"
  mv "${TMP}/merged.md" "$target"

  if grep -qF "vibe-check (begin)" "${TMP}/kept.md" 2>/dev/null; then
    ok "updated the existing vibe-check block"
  elif [ -s "${TMP}/kept.md" ]; then
    ok "appended to your existing AGENTS.md, leaving your own notes intact"
  else
    ok "wrote AGENTS.md"
  fi
  info "${GREY}Use it:${OFF} ask Codex \"vibe-check this app before I ship\""
}

uninstall() {
  say ""
  info "${BOLD}Uninstalling${OFF}"
  local removed=0
  for d in "$HOME/.claude/skills/vibe-check" "./.claude/skills/vibe-check" "./.cursor/vibe-check" "./.vibe-check"; do
    if [ -d "$d" ]; then
      if [ "$DRY_RUN" = "1" ]; then info "${GREY}would remove${OFF} $d"; else rm -rf "$d"; ok "removed $d"; fi
      removed=1
    fi
  done
  if [ -f "./.cursor/rules/vibe-check.mdc" ]; then
    if [ "$DRY_RUN" = "1" ]; then info "${GREY}would remove${OFF} ./.cursor/rules/vibe-check.mdc"
    else rm -f "./.cursor/rules/vibe-check.mdc"; ok "removed ./.cursor/rules/vibe-check.mdc"; fi
    removed=1
  fi
  if [ -f "./AGENTS.md" ] && grep -qF "vibe-check (begin)" "./AGENTS.md"; then
    if [ "$DRY_RUN" = "1" ]; then
      info "${GREY}would strip the vibe-check block from${OFF} ./AGENTS.md"
    else
      TMP="$(mktemp -d)"
      awk '
        index($0, "vibe-check (begin)") { skip = 1 }
        !skip                          { print }
        index($0, "vibe-check (end)")  { skip = 0 }
      ' "./AGENTS.md" > "${TMP}/kept.md"
      mv "${TMP}/kept.md" "./AGENTS.md"
      ok "stripped the vibe-check block from ./AGENTS.md"
    fi
    removed=1
  fi
  [ "$removed" = "0" ] && info "${GREY}nothing to remove here${OFF}"
  say ""
  exit 0
}

# ────────────────────────────────── args ───────────────────────────────────
DRY_RUN=0; FORCE=0; DO_UNINSTALL=0
WANT_CLAUDE=0; WANT_PROJECT=0; WANT_CURSOR=0; WANT_CODEX=0; ANY_FLAG=0

while [ $# -gt 0 ]; do
  case "$1" in
    --claude)    WANT_CLAUDE=1;  ANY_FLAG=1 ;;
    --project)   WANT_PROJECT=1; ANY_FLAG=1 ;;
    --cursor)    WANT_CURSOR=1;  ANY_FLAG=1 ;;
    --codex)     WANT_CODEX=1;   ANY_FLAG=1 ;;
    --all)       WANT_CLAUDE=1; WANT_CURSOR=1; WANT_CODEX=1; ANY_FLAG=1 ;;
    --dry-run)   DRY_RUN=1 ;;
    --force)     FORCE=1 ;;
    --uninstall) DO_UNINSTALL=1 ;;
    -h|--help)   usage; exit 0 ;;
    -v|--version) printf '%s\n' "$VERSION"; exit 0 ;;
    *) die "Unknown option: $1  (try --help)" ;;
  esac
  shift
done

banner
[ "$DO_UNINSTALL" = "1" ] && uninstall
[ "$DRY_RUN" = "1" ] && warn "dry run — nothing will be written"

# ───────────────────────────────── detect ─────────────────────────────────
HAS_CLAUDE=0; HAS_CURSOR=0; HAS_CODEX=0
[ -d "$HOME/.claude" ] && HAS_CLAUDE=1
{ [ -d "./.cursor" ] || [ -f "./.cursorrules" ]; } && HAS_CURSOR=1
[ -f "./AGENTS.md" ] && HAS_CODEX=1

if [ "$ANY_FLAG" = "0" ]; then
  info "${BOLD}Detected here${OFF}"
  [ "$HAS_CLAUDE" = "1" ] && ok "Claude Code  ${GREY}(~/.claude)${OFF}"   || info "${GREY}·  Claude Code — not found${OFF}"
  [ "$HAS_CURSOR" = "1" ] && ok "Cursor       ${GREY}(./.cursor)${OFF}"   || info "${GREY}·  Cursor — not found in this directory${OFF}"
  [ "$HAS_CODEX" = "1" ]  && ok "Codex        ${GREY}(./AGENTS.md)${OFF}" || info "${GREY}·  Codex — no AGENTS.md in this directory${OFF}"
  say ""

  if [ -t 0 ] || [ -r /dev/tty ]; then
    cat <<EOF
  ${BOLD}Where should vibe-check go?${OFF}

    ${LIME}1${OFF}  Claude Code      ${GREY}~/.claude/skills/vibe-check/  (all your projects)${OFF}
    ${LIME}2${OFF}  Cursor           ${GREY}./.cursor/rules/vibe-check.mdc  (this project)${OFF}
    ${LIME}3${OFF}  Codex            ${GREY}./AGENTS.md  (this project)${OFF}
    ${LIME}4${OFF}  This project     ${GREY}./.claude/skills/ — committable, for your team${OFF}
    ${LIME}a${OFF}  All of the above
    ${LIME}q${OFF}  Quit

EOF
    printf '  Choice [1]: '
    REPLY=""
    if [ -r /dev/tty ]; then read -r REPLY < /dev/tty || true; else read -r REPLY || true; fi
    say ""
    case "${REPLY:-1}" in
      1)   WANT_CLAUDE=1 ;;
      2)   WANT_CURSOR=1 ;;
      3)   WANT_CODEX=1 ;;
      4)   WANT_PROJECT=1 ;;
      a|A) WANT_CLAUDE=1; WANT_CURSOR=1; WANT_CODEX=1 ;;
      q|Q) info "nothing installed."; say ""; exit 0 ;;
      *)   die "Did not understand \"${REPLY}\". Re-run with --claude, --cursor, --codex or --all." ;;
    esac
  else
    # Non-interactive with no flags: install what is actually here.
    WANT_CLAUDE="$HAS_CLAUDE"; WANT_CURSOR="$HAS_CURSOR"; WANT_CODEX="$HAS_CODEX"
    if [ "$WANT_CLAUDE$WANT_CURSOR$WANT_CODEX" = "000" ]; then
      warn "no supported tool detected and no terminal to ask."
      say ""
      info "Re-run with a target, for example:"
      info "  ${BOLD}curl -fsSL https://vynemastudio.github.io/vibe-check/install.sh | bash -s -- --claude${OFF}"
      say ""
      exit 0
    fi
    info "${GREY}no flags and no terminal — installing to what was detected${OFF}"
  fi
fi

# ───────────────────────────── confirm & install ───────────────────────────
if [ "$WANT_CLAUDE" = "1" ] && [ -d "$HOME/.claude/skills/vibe-check" ] && [ "$FORCE" = "0" ] && [ "$DRY_RUN" = "0" ]; then
  warn "~/.claude/skills/vibe-check already exists — updating it in place"
fi

[ "$WANT_CLAUDE" = "1" ]  && install_claude
[ "$WANT_PROJECT" = "1" ] && install_project
[ "$WANT_CURSOR" = "1" ]  && install_cursor
[ "$WANT_CODEX" = "1" ]   && install_codex

# ─────────────────────────────── node check ────────────────────────────────
say ""
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  if [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
    ok "node $(node -v) — the scanner will run"
  else
    warn "node $(node -v) found; the scanner needs 18 or newer"
  fi
else
  warn "node not found — install Node 18+ so the scanner can run (the agent"
  info "  ${GREY}instructions still work without it, using grep fallbacks)${OFF}"
fi

# ──────────────────────────────── outro ────────────────────────────────────
cat <<EOF

  ${BOLD}Next${OFF}
    Open your coding agent in the project you want to check and say:
      ${LIME}vibe-check my app before I ship${OFF}

  ${GREY}Checks:${OFF}      https://github.com/${REPO}#the-16-checks
  ${GREY}Sources:${OFF}     https://github.com/${REPO}/blob/main/SOURCES.md
  ${GREY}Uninstall:${OFF}   curl -fsSL https://vynemastudio.github.io/vibe-check/install.sh | bash -s -- --uninstall

  ${AMBER}Educational tool, not legal advice.${OFF} ${GREY}A clean report is not a
  compliance certificate. For anything consequential, talk to a lawyer.${OFF}

  ${GREY}Made by Vynema Studio · @vynemastudio on Instagram${OFF}

EOF
