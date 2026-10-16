<div align="center">

# ▲ Vibe Check

**Before you ship, vibe-check it.**

A free AI skill that scans your vibe-coded web app for common legal and compliance gaps, then tells you exactly what to fix.

[![License: MIT](https://img.shields.io/badge/license-MIT-C5FF4A?style=flat-square&labelColor=0B0E13)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-skill-C5FF4A?style=flat-square&labelColor=0B0E13)](#claude-code)
[![Cursor](https://img.shields.io/badge/Cursor-rule-C5FF4A?style=flat-square&labelColor=0B0E13)](#cursor)
[![Codex](https://img.shields.io/badge/Codex-AGENTS.md-C5FF4A?style=flat-square&labelColor=0B0E13)](#codex)
[![Checks](https://img.shields.io/badge/checks-16-F5F5F2?style=flat-square&labelColor=0B0E13)](#the-16-checks)
[![Dependencies](https://img.shields.io/badge/dependencies-0-F5F5F2?style=flat-square&labelColor=0B0E13)](skills/vibe-check/scripts/scan.mjs)

[**Install page**](https://vynemastudio.github.io/vibe-check/) · [Sample report](examples/sample-report.md) · [Sources](skills/vibe-check/references/SOURCES.md)

</div>

> **Educational, not legal advice.** Vibe Check finds common gaps in code. It can't tell you your app is "compliant" or "legally safe". Laws depend on your users, location and facts. Talk to a qualified lawyer before relying on it.

## 30-second quickstart

```bash
# 1. Install (auto-detects Claude Code, Cursor and Codex)
curl -fsSL https://vynemastudio.github.io/vibe-check/install.sh | bash

# 2. Open your app in your AI agent and say:
vibe check my app
```

Want just the scanner, with no AI? You only need Node 18+:

```bash
node ~/.claude/skills/vibe-check/scripts/scan.mjs .        # coloured terminal report
node ~/.claude/skills/vibe-check/scripts/scan.mjs . --md   # markdown  (also --json)
```

The exit code is `1` if any check FAILs, so it drops straight into CI.

## Install options

### Claude Code
Plugin marketplace:
```
/plugin marketplace add vynemastudio/vibe-check
/plugin install vibe-check@vynemastudio
```
Or as a personal skill: `curl -fsSL https://vynemastudio.github.io/vibe-check/install.sh | bash -s -- --claude` (installs to `~/.claude/skills/vibe-check`).

### Cursor
Run this in your project folder:
```bash
curl -fsSL https://vynemastudio.github.io/vibe-check/install.sh | bash -s -- --cursor
```
This adds `.cursor/rules/vibe-check.mdc` and `.cursor/vibe-check/`. Then ask in chat: *"vibe check my app"*.

### Codex
Run this in your project folder:
```bash
curl -fsSL https://vynemastudio.github.io/vibe-check/install.sh | bash -s -- --codex
```
This adds `.agents/vibe-check/` and a short, idempotent section to `AGENTS.md`.

### Manual
Download [`vibe-check-skill.zip`](https://vynemastudio.github.io/vibe-check/vibe-check-skill.zip) and unzip it to `~/.claude/skills/vibe-check`, or anywhere your agent can read it. Then point the agent at `SKILL.md`.

## Sample report

From the [demo app](examples/sample-report.md), a weekend-built notes app:

```text
  ▲ VIBE CHECK v1.0.0   scanning shipfast-notes/ (8 files)
  ────────────────────────────────────────────────────────────────
   FAIL   VC01  Google Fonts loaded from Google's servers
            index.html:8  <link href="https://fonts.googleapis.com/css2?family=Inter:w
            risk  If you have EU visitors: each page view sends their IP to Google. A Munich
                  court (LG München I, 2022) awarded €100 damages to one visitor under GDPR.
            fix   Self-host the .woff2 files and remove the googleapis <link> and preconnect.

   FAIL   VC02  Session replay starts before consent
            analytics.js:3  rrweb.record({
   FAIL   VC03  Auto-renew terms hidden at checkout
            checkout.html:9  <p style="font-size:9px;color:#eee">Subscription renews auto
   PASS   VC05  Marketing email without unsubscribe/postal address
   ...
  3 FAIL  ·  0 NEEDS REVIEW  ·  8 PASS
```

After the fixes: `0 FAIL · 0 NEEDS REVIEW · 11 PASS`.

## The 16 checks

`Scanner` means `scan.mjs` decides the check statically. `Agent` means the AI reasons about it from `SKILL.md`.

| # | Check | Law / rule (where it applies) | Verified figure | How |
|---|---|---|---|---|
| VC01 | Google Fonts from Google's servers | GDPR (EU visitors) | €100 to one visitor (LG München I, 2022) | Scanner |
| VC02 | Session replay before consent | CIPA §631/§637.2; ePrivacy | $5,000 per violation (courts split) | Scanner |
| VC03 | Hidden auto-renew terms, no online cancel | California ARL §17602–17603 | Unconsented renewals deemed a "gift"; online cancel since 1 Jul 2025 | Scanner |
| VC04 | Children's data / age gate | COPPA (child-directed or actual knowledge) | Up to $53,088 per violation | Agent |
| VC05 | Marketing email without unsubscribe/address | CAN-SPAM | Up to $53,088 per email | Scanner + Agent |
| VC06 | User uploads, no DMCA agent | 17 U.S.C. §512(c) | $6 registration; no fine, but you lose safe harbor | Scanner + Agent |
| VC07 | Secrets in frontend / committed `.env` | Security; breach-notice laws | n/a | Scanner |
| VC08 | Open Firebase rules / Supabase without RLS | Security; breach-notice laws | n/a | Scanner + Agent |
| VC09 | Privacy policy and terms | CalOPPA §22575, GDPR Art. 13, app stores | n/a | Scanner + Agent |
| VC10 | Trackers before cookie consent | ePrivacy Art. 5(3), GDPR (EU/UK) | n/a | Scanner |
| VC11 | "Do Not Sell or Share" link | CCPA (only above thresholds) | $2,663 / $7,988 intentional | Agent |
| VC12 | Accessibility basics | ADA Title III; European Accessibility Act | n/a | Scanner + Agent |
| VC13 | AI chatbot / AI content disclosure | EU AI Act Art. 50 (from 2 Aug 2026); Cal. B&P §17941 | n/a | Scanner + Agent |
| VC14 | Refund / withdrawal policy | EU 14-day withdrawal; processor rules | n/a | Agent |
| VC15 | Sales tax / VAT on digital sales | EU OSS; US economic nexus | Informational | Agent |
| VC16 | Open-source, font, image and model licences | Licence terms | n/a | Agent |

All figures are maximums or specific rulings, not likely outcomes, and they're never added together. Full wording and links are in [SOURCES.md](skills/vibe-check/references/SOURCES.md), verified on 15 Oct 2026.

## Repo layout

```
skills/vibe-check/        the skill (SKILL.md, references/, scripts/scan.mjs)
.claude-plugin/           Claude Code plugin + marketplace manifests
.cursor/rules/            Cursor rule
AGENTS.snippet.md         Codex / AGENTS.md section
docs/                     GitHub Pages install site, install.sh, skill zip
examples/                 real sample report
scripts/build-zip.sh      rebuilds docs/vibe-check-skill.zip
```

## Contributing

PRs are welcome, especially new framework detections, false-positive fixes and corrected legal figures.

1. Every legal claim needs a primary source in `SOURCES.md`, with conditional wording.
2. Keep `scan.mjs` zero-dependency and fast. A regex hit is a lead, so prefer NEEDS REVIEW over a shaky FAIL.
3. Run `node skills/vibe-check/scripts/scan.mjs <some-app>` and `./scripts/build-zip.sh` before you open a PR.

## Disclaimer

Vibe Check is an educational tool. It isn't legal advice, it doesn't create a lawyer–client relationship, and a clean report doesn't mean your app complies with any law. Penalty figures are statutory maximums or single rulings, shown for context. Laws change and depend on your facts, so consult a qualified lawyer.

---

Made by **Vynema Studio** · [@vynemastudio](https://instagram.com/vynemastudio) on Instagram · MIT licence
