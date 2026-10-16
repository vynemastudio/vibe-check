# Report format

Use this shape every time. It is designed so the user can act on it in one pass
and share it without it over-claiming.

## Rules for the writing

- **Status words only**: `PASS`, `FAIL`, `NEEDS REVIEW`. Nothing else.
- **Evidence or explicit absence.** Either `src/pay.ts:42`, or "no file in the
  project contains an unsubscribe link". Never a finding with neither.
- **Conditional phrasing for every legal statement.** "If you have EU visitors,
  this may…" not "You are violating…". You are reporting code observations
  against general rules, with no knowledge of the user's actual situation.
- **No invented numbers.** Only figures from
  [checks.md](checks.md) / [SOURCES.md](../../../SOURCES.md), with their dates.
- **Never print a secret's value.** Location and kind only.
- **One fix per finding, concrete enough to act on.** Code the user can paste,
  or a step they can do in ten minutes. "Review your consent strategy" is not a
  fix.
- **Order by severity, not by check order.** What would hurt most, first.

## Template

````markdown
# vibe-check — <project name>

**<n> FAIL · <n> NEEDS REVIEW · <n> PASS** · scanned <n> files · <date>

<One or two sentences: the single most important thing to deal with, and
whether anything here should block the launch.>

## Status

| Check | Status | In one line |
| :-- | :-- | :-- |
| Google Fonts (GDPR) | 🔴 FAIL | Loaded from Google's CDN in 3 places |
| Secrets in frontend | 🔴 FAIL | Live Stripe key in the client bundle |
| Privacy policy & terms | 🟡 NEEDS REVIEW | Both exist; do they match the code? |
| … | | |

## 🔴 Failures

### 1. Live Stripe secret key in client-side code

**Where** `src/lib/checkout.ts:12` — Stripe live secret key
**Also** `dist/assets/index-a4f21c.js:1` — the same key, in the built bundle

**Why it matters** Anything in a browser bundle is public. A live secret key
lets anyone charge cards, issue refunds and read your customer list. If customer
data is exposed as a result, breach-notification duties may follow — GDPR
Arts. 33–34 if you have EU customers, and US state breach statutes.

**Fix**
1. Rotate the key in the Stripe dashboard now, before changing any code.
2. Move the charge server-side:
   ```ts
   // app/api/checkout/route.ts  — key never leaves the server
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
   ```
3. Call `/api/checkout` from the client. Add auth and rate limiting to it.
4. `git rm --cached .env` and add `.env*` to `.gitignore`.

---

### 2. <next failure, same shape>

## 🟡 Needs review

### Cookie consent banner

**What the scan found** `components/CookieBar.tsx:1` renders a banner, and
`app/layout.tsx:28` loads `gtag` unconditionally on line 28 — above the banner
in the component tree.

**The question you need to answer** Does the banner actually gate the tag, or
only record a preference? Open DevTools → Network with a fresh profile and
confirm zero requests to `googletagmanager.com` before you click Accept.

**If it does not gate** that is a FAIL under ePrivacy Art. 5(3) for EU
visitors — see the fix in the failures section pattern.

---

### <next item>

## 🟢 Passed

- **Open database rules** — RLS enabled on all 4 tables, every policy scoped to
  `auth.uid()` (`supabase/migrations/0002_rls.sql`). Verify the hosted project
  matches.
- **COPPA age gate** — no child-directed signals found; COPPA likely does not
  apply. Confirm you have no actual knowledge of under-13 users.
- …

## Not checked

<Anything you could not reach: hosted dashboard rules, live email templates,
colour contrast without a browser. Be explicit — an unchecked item must never
appear as a PASS.>

---

### Disclaimer

**Educational, not legal advice.** vibe-check reports patterns found in your
code. It cannot see your contracts, your data flows, your markets, your
thresholds or your risk appetite, and it does not cover every law that might
apply to you. A clean report is not a compliance certificate, and nothing here
creates a lawyer–client relationship. Laws change and differ by jurisdiction —
for anything consequential, get advice from a qualified lawyer in the places you
operate.

Citations and dates: [SOURCES.md](https://github.com/vynemastudio/vibe-check/blob/main/SOURCES.md)
Generated with [vibe-check](https://github.com/vynemastudio/vibe-check) by Vynema Studio.
````

## Then

Close with one short offer:

> Want me to fix these? I'd start with the Stripe key — that one is live.

And stop. Do not begin fixing until the user says so.
