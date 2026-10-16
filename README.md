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

[**Install page**](https://vynemastudio.github.io/vibe-check/) · [Sample report](examples/sample-report.md) · [Sources](SOURCES.md)

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
This adds `.cursor/rules/vibe-check.mdc` and `.cursor/vibe-check/scan.mjs`. Then ask in chat: *"vibe check my app"*.

### Codex
Run this in your project folder:
```bash
curl -fsSL https://vynemastudio.github.io/vibe-check/install.sh | bash -s -- --codex
```
This adds `.vibe-check/scan.mjs` and a short, idempotent section to `AGENTS.md`.

### Manual
Download [`vibe-check-skill.zip`](https://vynemastudio.github.io/vibe-check/vibe-check-skill.zip) and unzip it to `~/.claude/skills/vibe-check`, or anywhere your agent can read it. Then point the agent at `SKILL.md`.

## Sample report

From the [demo app](examples/sample-report.md), a weekend-built notes app:

```text
  ▲ VIBE CHECK v1.0.0   scanning shipfast-notes/ (8 files)
  ────────────────────────────────────────────────────────────────
   FAIL   google-fonts  Google Fonts loaded from Google's servers
            index.html:8  <link href="https://fonts.googleapis.com/css2?family=Inter:w
            risk  If you have EU visitors: each page view sends their IP to Google. A Munich
                  court (LG München I, 2022) awarded €100 damages to one visitor under GDPR.
            fix   Self-host the .woff2 files and remove the googleapis <link> and preconnect.

   FAIL   tracking-before-consent  Session replay starts before consent
            analytics.js:3  rrweb.record({
   FAIL   auto-renew-terms  Auto-renew terms hidden at checkout
            checkout.html:9  <p style="font-size:9px;color:#eee">Subscription renews auto
   PASS   can-spam  Marketing email without unsubscribe/postal address
   ...
  3 FAIL  ·  0 NEEDS REVIEW  ·  8 PASS
```

After the fixes: `0 FAIL · 5 NEEDS REVIEW · 11 PASS` (the five reviews are judgement calls such as COPPA and CCPA scope).

## The 16 checks

`scan.mjs` runs all 16 checks and reports PASS, FAIL or NEEDS REVIEW. The column below shows where a human or the AI agent still has to make the final call.

| # | Check | Law / rule (where it applies) | Verified figure | How |
|---|---|---|---|---|
| `google-fonts` | Google Fonts from Google's servers | GDPR (EU visitors) | €100 to one visitor (LG München I, 2022) | Scanner |
| `tracking-before-consent` | Session replay before consent | CIPA §631/§637.2; ePrivacy | $5,000 per violation (courts split) | Scanner |
| `auto-renew-terms` | Hidden auto-renew terms, no online cancel | California ARL §17602–17603 | Unconsented renewals deemed a "gift"; online cancel since 1 Jul 2025 | Scanner |
| `coppa-age-gate` | Children's data / age gate | COPPA (child-directed or actual knowledge) | Up to $53,088 per violation | Agent |
| `can-spam` | Marketing email without unsubscribe/address | CAN-SPAM | Up to $53,088 per email | Scanner + Agent |
| `dmca-agent` | User uploads, no DMCA agent | 17 U.S.C. §512(c) | $6 registration; no fine, but you lose safe harbor | Scanner + Agent |
| `secrets-exposed` | Secrets in frontend / committed `.env` | Security; breach-notice laws | n/a | Scanner |
| `open-database` | Open Firebase rules / Supabase without RLS | Security; breach-notice laws | n/a | Scanner + Agent |
| `privacy-policy-terms` | Privacy policy and terms | CalOPPA §22575, GDPR Art. 13, app stores | n/a | Scanner + Agent |
| `cookie-consent-banner` | Trackers before cookie consent | ePrivacy Art. 5(3), GDPR (EU/UK) | n/a | Scanner |
| `ccpa-do-not-sell` | "Do Not Sell or Share" link | CCPA (only above thresholds) | $2,663 / $7,988 intentional | Agent |
| `accessibility-basics` | Accessibility basics | ADA Title III; European Accessibility Act | n/a | Scanner + Agent |
| `ai-disclosure` | AI chatbot / AI content disclosure | EU AI Act Art. 50 (from 2 Aug 2026); Cal. B&P §17941 | n/a | Scanner + Agent |
| `refund-policy` | Refund / withdrawal policy | EU 14-day withdrawal; processor rules | n/a | Agent |
| `sales-tax-vat` | Sales tax / VAT on digital sales | EU OSS; US economic nexus | Informational | Agent |
| `third-party-licences` | Open-source, font, image and model licences | Licence terms | n/a | Agent |

All figures are maximums or specific rulings, not likely outcomes, and they're never added together. Full wording and links are in [SOURCES.md](SOURCES.md), verified on 15 Oct 2026.

## Repo layout

```
skills/vibe-check/        the skill (SKILL.md, references/, scripts/scan.mjs)
.claude-plugin/           Claude Code plugin + marketplace manifests
.cursor/rules/            Cursor rule
AGENTS.md                 Codex / AGENTS.md section (installed by --codex)
SOURCES.md                every legal figure with primary sources
test/run.mjs              test suite (npm test), run in CI
docs/                     GitHub Pages install site, install.sh, skill zip
examples/                 real sample report
scripts/build-zip.sh      rebuilds docs/vibe-check-skill.zip
```

## Contributing

PRs are welcome, especially new framework detections, false-positive fixes and corrected legal figures.

1. Every legal claim needs a primary source in `SOURCES.md`, with conditional wording.
2. Keep `scan.mjs` zero-dependency and fast. A regex hit is a lead, so prefer NEEDS REVIEW over a shaky FAIL.
3. Run `npm test` and `./scripts/build-zip.sh` before you open a PR. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Disclaimer

Vibe Check is an educational tool. It isn't legal advice, it doesn't create a lawyer–client relationship, and a clean report doesn't mean your app complies with any law. Penalty figures are statutory maximums or single rulings, shown for context. Laws change and depend on your facts, so consult a qualified lawyer.

---

Made by **Vynema Studio** · [@vynemastudio](https://instagram.com/vynemastudio) on Instagram · MIT licence
