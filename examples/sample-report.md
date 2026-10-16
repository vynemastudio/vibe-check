# Sample report: Shipfast Notes demo app

Real output of `scan.mjs` on the demo app (a tiny "weekend build" landing page and checkout), before and after fixing the three issues it found.

## Before

```text

  ▲ VIBE CHECK v1.0.0   scanning shipfast-notes/ (8 files)
  ────────────────────────────────────────────────────────────────
   FAIL   VC01  Google Fonts loaded from Google's servers
            index.html:8  <link href="https://fonts.googleapis.com/css2?family=Inter:w
            index.html:7  <link rel="preconnect" href="https://fonts.googleapis.com">
            risk  If you have EU visitors: each page view sends their IP to Google. A Munich court (LG München I, 2022) awarded €100 damages to one visitor under GDPR.
            fix   Self-host the .woff2 files (@fontsource/*, next/font/google) and remove the googleapis <link>/@import and preconnect.

   FAIL   VC02  Session replay starts before consent
            analytics.js:3  rrweb.record({
            risk  If you have California visitors: plaintiffs sue under CIPA (Cal. Penal Code §637.2: $5,000 per violation); courts are split. In the EU/UK, non-essential trackers need prior opt-in.
            fix   Start the recorder only after explicit opt-in (Accept/Reject equally prominent) and mask all inputs (maskAllInputs: true).

   FAIL   VC03  Auto-renew terms hidden at checkout
            checkout.html:9  <p style="font-size:9px;color:#eee">Subscription renews auto
            checkout.html:8  <button id="pay" class="cta">Start free trial</button>
            risk  If you sell subscriptions to California consumers: renewals charged without clear terms and affirmative consent can be treated as an unconditional gift (B&P §17603); online sign-ups must be cancellable online since 1 Jul 2025.
            fix   Show price, frequency, "renews until you cancel" and the cancel path right above the button; add an unticked consent checkbox and a one-click online cancel (e.g. Stripe Customer Portal).

   PASS   VC05  Marketing email without unsubscribe/postal address
   PASS   VC06  User uploads without a DMCA designated agent
   PASS   VC07  Secret keys in frontend or committed .env
   PASS   VC08  Database rules open to everyone
   PASS   VC09  Privacy policy and terms linked
   PASS   VC10  Analytics/ad trackers load before cookie consent
   PASS   VC12  Accessibility basics (WCAG 2.2 AA)
   PASS   VC13  AI chatbot / AI content not disclosed
  ────────────────────────────────────────────────────────────────
  3 FAIL  ·  0 NEEDS REVIEW  ·  8 PASS
  VC04 COPPA, VC11 CCPA, VC14 refunds, VC15 tax/VAT and VC16 licences need judgement: run the full skill.
  Educational check, not legal advice. Laws change and depend on your facts. Confirm with a qualified lawyer before relying on this.

```

Markdown mode (`--md`), which the skill uses inside Claude Code, Cursor and Codex:

#### Vibe Check: `shipfast-notes/` (8 files)

**3 FAIL · 0 NEEDS REVIEW · 8 PASS** (automated checks)

##### 🔴 FAIL · VC01 Google Fonts loaded from Google's servers
- `index.html:8` `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">`
- `index.html:7` `<link rel="preconnect" href="https://fonts.googleapis.com">`
- **Risk:** If you have EU visitors: each page view sends their IP to Google. A Munich court (LG München I, 2022) awarded €100 damages to one visitor under GDPR.
- **Fix:** Self-host the .woff2 files (@fontsource/*, next/font/google) and remove the googleapis <link>/@import and preconnect.

##### 🔴 FAIL · VC02 Session replay starts before consent
- `analytics.js:3` `rrweb.record({`
- **Risk:** If you have California visitors: plaintiffs sue under CIPA (Cal. Penal Code §637.2: $5,000 per violation); courts are split. In the EU/UK, non-essential trackers need prior opt-in.
- **Fix:** Start the recorder only after explicit opt-in (Accept/Reject equally prominent) and mask all inputs (maskAllInputs: true).

##### 🔴 FAIL · VC03 Auto-renew terms hidden at checkout
- `checkout.html:9` `<p style="font-size:9px;color:#eee">Subscription renews automatically at $29 per month after 7 days.</p>`
- `checkout.html:8` `<button id="pay" class="cta">Start free trial</button>`
- **Risk:** If you sell subscriptions to California consumers: renewals charged without clear terms and affirmative consent can be treated as an unconditional gift (B&P §17603); online sign-ups must be cancellable online since 1 Jul 2025.
- **Fix:** Show price, frequency, "renews until you cancel" and the cancel path right above the button; add an unticked consent checkbox and a one-click online cancel (e.g. Stripe Customer Portal).

##### 🟢 PASS · VC05 Marketing email without unsubscribe/postal address

##### 🟢 PASS · VC06 User uploads without a DMCA designated agent

##### 🟢 PASS · VC07 Secret keys in frontend or committed .env

##### 🟢 PASS · VC08 Database rules open to everyone

##### 🟢 PASS · VC09 Privacy policy and terms linked

##### 🟢 PASS · VC10 Analytics/ad trackers load before cookie consent

##### 🟢 PASS · VC12 Accessibility basics (WCAG 2.2 AA)

##### 🟢 PASS · VC13 AI chatbot / AI content not disclosed

_VC04 COPPA, VC11 CCPA, VC14 refunds, VC15 tax/VAT and VC16 licences need judgement: run the full skill._

> Educational check, not legal advice. Laws change and depend on your facts. Confirm with a qualified lawyer before relying on this.

## After the fix

Fixes applied: self-hosted the Inter `.woff2` files, started rrweb only after opt-in with `maskAllInputs: true`, and moved the renewal terms above the button with a consent checkbox and an online cancel link.

```text

  ▲ VIBE CHECK v1.0.0   scanning shipfast-notes/ (9 files)
  ────────────────────────────────────────────────────────────────
   PASS   VC01  Google Fonts loaded from Google's servers
   PASS   VC02  Session replay starts before consent
   PASS   VC03  Auto-renew terms hidden at checkout
   PASS   VC05  Marketing email without unsubscribe/postal address
   PASS   VC06  User uploads without a DMCA designated agent
   PASS   VC07  Secret keys in frontend or committed .env
   PASS   VC08  Database rules open to everyone
   PASS   VC09  Privacy policy and terms linked
   PASS   VC10  Analytics/ad trackers load before cookie consent
   PASS   VC12  Accessibility basics (WCAG 2.2 AA)
   PASS   VC13  AI chatbot / AI content not disclosed
  ────────────────────────────────────────────────────────────────
  0 FAIL  ·  0 NEEDS REVIEW  ·  11 PASS
  VC04 COPPA, VC11 CCPA, VC14 refunds, VC15 tax/VAT and VC16 licences need judgement: run the full skill.
  Educational check, not legal advice. Laws change and depend on your facts. Confirm with a qualified lawyer before relying on this.

```
