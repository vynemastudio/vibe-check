# AGENTS.md

<!-- ─────────────────── vibe-check (begin) ─────────────────── -->
<!-- Installed by vibe-check — https://github.com/vynemastudio/vibe-check -->
<!-- Remove everything between these markers to uninstall. -->

## vibe-check — pre-launch legal & compliance review

When the user is about to ship, deploy, launch or go live, or asks for a
compliance, legal, privacy, GDPR, CCPA, COPPA, accessibility, security or
pre-launch review, run this review and produce one report: **PASS / FAIL /
NEEDS REVIEW** per check, each with `file:line` evidence and a concrete fix.

### Non-negotiable rules

1. **Not legal advice, and say so.** End every report with the disclaimer
   below, verbatim. Never tell the user they are "compliant", "legally safe",
   "covered", "protected" or "done".
2. **Write conditionally.** Most of these laws apply only in certain
   situations — "if you have EU visitors…", "this may apply if…". COPPA applies
   **only** where the service is child-directed or you have actual knowledge of
   under-13 users; never state it as universal.
3. **Never invent a figure.** Use only the numbers below or in
   [`SOURCES.md`](https://github.com/vynemastudio/vibe-check/blob/main/SOURCES.md).
   A missing DMCA agent is **not** a fine — the consequence is losing the §512
   safe harbour. Never attach "$150,000" to it.
4. **Evidence or explicit absence.** Either `src/pay.ts:42`, or "no file in the
   project contains X". Never a finding with neither.
5. **Report first. Fix only when asked.**
6. **Never print a secret's value** — report its location and kind only.

### Step 1 — run the scanner

Zero-dependency Node (18+), reads files only, writes nothing, no network calls.

```bash
node .vibe-check/scan.mjs . --json
```

If that path is missing, find it, or do the review by hand with the grep
patterns at the end:

```bash
find . ~/.vibe-check ~/.claude/skills -name scan.mjs -path '*vibe-check*' 2>/dev/null | head -1
```

Flags: `--json` to parse, `--md` for a ready-made report, `--only <ids>`,
`--skip <ids>`, `--max-evidence 30`, `--list`. Exit code is `1` when any check
FAILs, which makes it usable in CI.

### Step 2 — the 16 checks

Confirm every scanner FAIL by opening the cited line — dead code and
documentation examples are false positives, and should be downgraded with a
reason. Resolve NEEDS REVIEW items by reading the code wherever you can.

| Check | FAIL when | The rule, conditionally stated |
| :-- | :-- | :-- |
| `google-fonts` | `fonts.googleapis.com` / `fonts.gstatic.com` in source | Sends every EU visitor's IP to Google before any consent is possible. LG München I, 20 Jan 2022, **3 O 17493/20**, awarded **€100** plus an injunction. Fix: self-host the `.woff2` files. `next/font/google` self-hosts at build time and is fine. |
| `tracking-before-consent` | analytics, ad pixels or session replay with no consent gate | EU: ePrivacy **Art. 5(3)** requires prior consent for anything non-essential. California: CIPA claims — **Cal. Penal Code §637.2** allows **$5,000 per violation** or 3× actual damages, no proof of harm needed. SB 690 (effective 1 Jan 2027) makes §638.51 pen-register claims AG-only for websites; §631/§632 claims survive. Session replay also needs input masking. |
| `cookie-consent-banner` | trackers present with no consent library or gate | Reject must be as easy as Accept, nothing pre-ticked, categories granular, consent withdrawable from a persistent link. |
| `secrets-exposed` | live keys in client code, in the built bundle, or a committed `.env` | Rotate the key **first**, then move the call server-side. Anything behind `NEXT_PUBLIC_` / `VITE_` / `REACT_APP_` / `PUBLIC_` is published, not hidden. A Firebase `AIza…` web key is a public identifier by design — not a leak; Firestore rules are the protection. |
| `open-database` | RLS disabled, `using (true)`, `allow read, write: if true`, or `0.0.0.0/0` | The anon key sits in the browser. Deny by default and scope every policy to `auth.uid()`. Policies usually live in the hosted dashboard, so verify there, and test from outside with only the anon key. |
| `privacy-policy-terms` | either document missing | CalOPPA, **Cal. B&P §22575** — violation only after failing to post within **30 days** of notice, then up to **$2,500** per violation via the UCL (CCPA fines, if it applies, are separate: **$2,663 / $7,988**). GDPR **Arts. 13–14** if you have EU users. The policy must name the processors the code actually uses. |
| `ccpa-do-not-sell` | ad or cross-context pixels present with no opt-out link | CCPA/CPRA, **Cal. Civ. Code §1798.135**. Applies only if a threshold is met (**>$26.625M** gross annual revenue, or buying/selling/sharing the PI of **100,000+** California consumers or households, or **≥50%** of revenue from selling PI) **and** you sell or share — ad pixels count as sharing. Honour `navigator.globalPrivacyControl`. Fines up to **$2,663** per violation / **$7,988** intentional. |
| `dmca-agent` | user uploads or UGC with no DMCA agent, takedown process or repeat-infringer policy | **17 U.S.C. §512(c)(2)** — designation is a threshold condition for the safe harbour. Register in the online directory at `dmca.copyright.gov`; the fee is **$6**. No agent means no safe harbour — it is **not** a fine. |
| `coppa-age-gate` | child-directed signals with no age collection or parental-consent flow | **15 U.S.C. §§6501–6506**; COPPA Rule **16 C.F.R. Part 312**. Amended rule published **22 Apr 2025** (effective 23 Jun 2025), full compliance required by **22 Apr 2026**; civil penalty up to **$53,088** per violation. Applies only if child-directed or on actual knowledge of an under-13 user. Collect date of birth, not "are you over 13?". |
| `can-spam` | email sending with no unsubscribe or no physical postal address | **15 U.S.C. §7704**; FTC Rule **16 C.F.R. Part 316**. Up to **$53,088 per email** — the FTC inflation-adjusted figure in force since 17 Jan 2025 and unchanged for 2026. Purely transactional mail is exempt from the opt-out duty but not from the no-deception duty. EU/UK generally require consent first. |
| `auto-renew-terms` | recurring billing with no renewal disclosure at the point of sale, or no self-serve cancellation | California ARL, **B&P §17600 et seq.**, amended by **AB 2863** for contracts entered, amended or extended from **1 Jul 2025**; **§17603** deems goods sent without the required affirmative consent an **unconditional gift**. Federal ROSCA still applies — the FTC's click-to-cancel Negative Option Rule was vacated in July 2025 and is being re-proposed, so do not rely on it being gone. |
| `accessibility-basics` | missing `alt`, unlabelled form controls, no `lang`, positive `tabindex`, click handler on a `div` | Target **WCAG 2.2 AA**. US private-sector exposure is ADA Title III litigation. The EU **European Accessibility Act** has applied to consumer e-commerce since **28 Jun 2025** (EN 301 549 → WCAG 2.1 AA); **micro-enterprises** providing services (<10 staff and ≤€2M turnover/balance sheet) are exempt from the service duties. Contrast and keyboard operability need a real browser. |
| `ai-disclosure` | a user-facing AI chat surface with no disclosure text | EU AI Act **Art. 50** (Reg. (EU) 2024/1689) applies from **2 Aug 2026** and was **not** delayed by the Digital AI Omnibus (which moved high-risk duties to Dec 2027 / Aug 2028); the Art. 50(2) machine-readable marking duty had a grace period to **2 Dec 2026** for systems already on the market. California B.O.T. Act, **B&P §17941** — disclosing that it is a bot is the safe harbour; UCL penalties up to **$2,500** per violation. |
| `refund-policy` | payments with no refund or cancellation policy | FTC Act §5 for charging without disclosed terms. EU **CRD 2011/83/EU** gives a **14-day** right of withdrawal; for digital content delivered immediately you need the consumer's express consent to begin **plus** acknowledgement that the right is thereby lost. |
| `sales-tax-vat` | advisory note only — never fails a run | EU: VAT is due in the customer's member state, declared via the One Stop Shop. The **€10,000** cross-border threshold is available to **EU-established** sellers only, so a non-EU seller registers from the first B2C sale. US: economic nexus after **Wayfair** (2018), with thresholds varying by state and many states taxing SaaS. |
| `third-party-licences` | no `LICENSE` file, self-hosted fonts with no licence file, restrictive dependencies | Copyleft (GPL/AGPL/SSPL) can reach your own source — AGPL in a hosted web app especially. Desktop font EULAs usually forbid `@font-face` embedding. Keep a `CREDITS.md` recording every asset's source and licence. |

### Step 3 — the report

Order worst-first. For each failure: **what**, **where** (`file:line`), **why it
may matter** (with the citation and its date), and a **fix** the user can paste
or do in ten minutes. Then NEEDS REVIEW items, each stating the specific
question the user has to answer. Then PASSes, one line each. Then a **Not
checked** section — an unchecked item must never appear as a PASS.

Mark as NEEDS REVIEW anything needing a browser (colour contrast, keyboard
traps, whether tags really wait for consent), a hosted dashboard (Supabase or
Firebase rules), or a fact only the user knows (revenue thresholds, markets,
whether the DMCA agent is actually registered).

If the repo does not answer them, ask all four scope questions in one message:
EU/UK visitors? California visitors? Can users upload content? Do you charge,
and is any of it recurring?

Close by offering to fix the failures. Do not start fixing.

### Grep patterns, if the scanner is unavailable

```bash
grep -rn "fonts.googleapis.com\|fonts.gstatic.com" --include="*.html" --include="*.css" --include="*.ts*" --include="*.js*" .
grep -rn "googletagmanager\|gtag(\|fbq(\|hotjar\|clarity.ms\|fullstory\|logrocket\|posthog\|mixpanel" --include="*.ts*" --include="*.js*" --include="*.html" .
grep -rn "sk_live_\|sk-ant-api\|sk-proj-\|AKIA\|ghp_\|service_role\|-----BEGIN .*PRIVATE KEY" .
grep -rn "disable row level security\|using (true)\|allow read, write: if true\|\"\.read\": true" .
grep -rn "privacy\|terms\|unsubscribe\|refund\|DMCA\|do not sell" --include="*.ts*" --include="*.js*" --include="*.html" --include="*.md" .
grep -rn "<img" --include="*.html" --include="*.tsx" --include="*.jsx" . | grep -v "alt="
```

### Disclaimer — include verbatim in every report

> **Educational, not legal advice.** This report describes patterns found in
> your code. It cannot see your contracts, your data flows, your markets, your
> thresholds or your risk appetite, and it does not cover every law that might
> apply to you. A clean report is not a compliance certificate, and nothing
> here creates a lawyer–client relationship. Laws change and differ by
> jurisdiction — for anything consequential, get advice from a qualified lawyer
> in the places you operate.
>
> Citations and dates: https://github.com/vynemastudio/vibe-check/blob/main/SOURCES.md

<!-- ──────────────────── vibe-check (end) ───────────────────── -->
