---
name: vibe-check
description: Scans a vibe-coded web app for common legal and compliance gaps before launch — Google Fonts/GDPR, trackers firing before consent, exposed API keys, open database rules, missing privacy policy or terms, CCPA opt-out, DMCA agent for user uploads, COPPA age gates, CAN-SPAM unsubscribe, auto-renewal terms, accessibility basics, AI disclosure, refund policy, tax and third-party licences. Produces a PASS / FAIL / NEEDS REVIEW report with file:line evidence and a concrete fix for each finding. Use when the user is about to ship, deploy, launch or go live, or asks for a compliance, legal, privacy, GDPR, accessibility or pre-launch review of their app.
license: MIT
metadata:
  author: Vynema Studio
  version: 1.0.0
  homepage: https://github.com/vynemastudio/vibe-check
---

# vibe-check

A pre-launch compliance review for a web app that was built fast. You run a
static scanner for the mechanical checks, then reason about the ones that need
judgement, and hand back one report: **PASS / FAIL / NEEDS REVIEW** per check,
each with `file:line` evidence and a fix the user can act on today.

## Non-negotiable rules

Read these before anything else. They are what makes this skill trustworthy
rather than harmful.

1. **This is not legal advice, and you must say so.** Every report ends with the
   disclaimer in [references/report-format.md](references/report-format.md).
   Never tell the user they are "compliant", "legally safe", "covered",
   "protected" or "done". You are reporting observations about their code.
2. **Write conditionally and accurately.** Most of these laws apply only in
   certain situations. Say "if you have EU visitors…", "this may apply if…",
   "COPPA applies only where the service is child-directed or you have actual
   knowledge of under-13 users". Never state a requirement as universal when it
   is jurisdictional or threshold-based.
3. **Never invent a number.** Do not state a penalty, a deadline, a case or a
   statute that is not in [references/checks.md](references/checks.md) or
   [SOURCES.md](../../SOURCES.md). If the user asks for a figure you do not
   have, say you do not have it and that it should be verified with a lawyer.
   In particular: a missing DMCA agent is **not** a fine — the consequence is
   losing the §512 safe harbour. Never attach a "$150,000 fine" to it.
4. **Every finding needs evidence or an explicit absence.** Either cite
   `path/to/file.ts:42`, or say plainly "no file in the project contains X".
   A finding with neither is a guess, and guesses are worse than silence here.
5. **Do not fix anything unless asked.** Report first. The user decides what to
   change. If they then ask you to fix something, fix it.
6. **Never print a secret you find.** Report the location and the kind of key
   (`src/pay.ts:12 — Stripe live secret key`). Never echo the value, not into
   the report, not into the chat, not into a file.

## Step 1 — run the scanner

The scanner ships with this skill. It is zero-dependency Node (18+), reads
files only, writes nothing, and makes no network requests.

```bash
node "${CLAUDE_SKILL_DIR}/scripts/scan.mjs" . --json
```

If `${CLAUDE_SKILL_DIR}` is not available in your environment, locate it:

```bash
node "$(find ~/.claude/skills ~/.claude/plugins .claude/skills -name scan.mjs -path '*vibe-check*' 2>/dev/null | head -1)" . --json
```

If the scanner cannot be found or Node is unavailable, say so and do the whole
review by hand using [references/checks.md](references/checks.md) — the grep
patterns are listed there for exactly this case. Do not silently skip checks.

Useful flags: `--json` (parse this), `--md` (ready-made markdown report),
`--only <ids>` / `--skip <ids>`, `--max-evidence 30`, `--list`. The plain
(no-flag) output is a human terminal report — show the user that one if they
asked to "run the scan", and parse `--json` when you are writing the report
yourself.

Exit code is `1` when any check FAILs, `0` otherwise. That is intentional —
mention it if the user wants this in CI.

## Step 2 — verify and extend what the scanner found

The scanner greps. You reason. For each of its results, do the work it cannot:

- **Confirm FAILs are real.** Open the cited lines. A tracker inside dead code,
  a "secret" that is a documented public key, a `<img>` in a code sample inside
  a markdown file — these are false positives. Downgrade them and say why.
- **Resolve NEEDS REVIEW items.** Most are answerable by reading the repo. Does
  that consent banner actually gate the `gtag` call, or just render a bar? Does
  the cancellation route actually cancel, or open a mailto? Read the code and
  decide. Only leave an item as NEEDS REVIEW when it genuinely needs a human —
  the user's thresholds, their markets, their contracts, their risk appetite.
- **Check what greps cannot see.** Walk
  [references/manual-verification.md](references/manual-verification.md): colour
  contrast against the real tokens, keyboard traps, whether the hosted Supabase
  or Firebase rules match the ones in the repo, what the live email templates
  contain, whether the DMCA agent is actually registered.
- **Ask about scope once, not repeatedly.** Four facts change many outcomes:
  Do you have EU/UK visitors? California visitors? Do users upload content? Do
  you charge money, and is it recurring? If the repo does not answer these, ask
  all four together in a single message, then report. Do not block on the
  answer — report under a stated assumption if the user does not reply.

Read [references/checks.md](references/checks.md) for the full detail on each
check: what it covers, exactly when it applies, the citation, how to verify it
by hand, and the fix.

## Step 3 — write the report

Follow [references/report-format.md](references/report-format.md) exactly. The
shape, in short:

1. A one-line verdict and the counts.
2. A status table — every check, so the user sees what was *not* a problem too.
3. FAILs first, in descending severity. Each one: what, where
   (`file:line`), why it may matter (with the citation), and the fix as
   something they can paste or do.
4. NEEDS REVIEW items, each with the specific question the user has to answer.
5. PASSes compressed to one line each.
6. The disclaimer. Verbatim.

Offer, at the end, to fix the FAILs one at a time. Do not start fixing.

## Keeping it honest

- If you could not check something, say "not checked" — never PASS by default.
- A PASS means the scanner found positive evidence, or the check provably does
  not apply to this project. It does not mean "fine".
- If the user pushes you to declare them compliant, decline plainly once,
  restate what the report does say, and move on.
- Laws change. The citations in this skill carry dates. If a date is more than
  a year old relative to today and the user is making a consequential decision,
  say that it is worth re-verifying.

## Files in this skill

| File | What it holds |
| :-- | :-- |
| `scripts/scan.mjs` | the zero-dependency static scanner |
| `references/checks.md` | all 16 checks in full: scope, citation, manual verification, fix |
| `references/report-format.md` | the exact report template and the disclaimer |
| `references/manual-verification.md` | the browser and dashboard checks a grep cannot do |
