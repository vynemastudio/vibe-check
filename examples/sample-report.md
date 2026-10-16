# Sample report

This is what vibe-check hands back after a real run. The scanner found the
mechanical issues; the agent then opened the cited lines, downgraded one false
positive, and turned the rest into decisions.

The project is a fictional AI sticker app, **Snapmoji** — a small Vite + Supabase
app with Stripe subscriptions, user image uploads and a newsletter. The same
fixture lives in `test/fixtures/` if you want to reproduce it.

> Want just the scanner's raw output instead? `node scan.mjs . --md`.

---

# vibe-check — Snapmoji

**10 FAIL · 5 NEEDS REVIEW · 1 PASS** · scanned 6 files · 15 October 2026

Deal with the Stripe key first — it is a live secret sitting in a browser bundle,
which means anyone can charge cards against your account right now. After that,
the tracking and consent cluster is what would most likely draw a complaint:
Google Analytics, Hotjar session replay and Google Fonts all fire before the
visitor can agree to anything, and there is no consent mechanism in the codebase
at all.

## Status

| Check | Status | In one line |
| :-- | :-- | :-- |
| Secrets exposed | 🔴 FAIL | Live Stripe key + OpenAI key in client code and `.env` |
| Open database | 🔴 FAIL | RLS explicitly disabled on `public.stickers` |
| Tracking before consent | 🔴 FAIL | GA + Hotjar on load, no consent gate, no input masking |
| Cookie consent banner | 🔴 FAIL | No consent library or gate anywhere |
| Google Fonts | 🔴 FAIL | Loaded from `fonts.googleapis.com` |
| Privacy policy & terms | 🔴 FAIL | Neither document exists |
| DMCA agent | 🔴 FAIL | Image uploads, no agent or takedown process |
| CAN-SPAM | 🔴 FAIL | Newsletter send with no unsubscribe, no postal address |
| Auto-renew terms | 🔴 FAIL | Stripe subscription, no renewal disclosure, no cancel path |
| Accessibility basics | 🔴 FAIL | 4 defects: missing `alt`, unlabelled input, `onclick` div, no `lang` |
| AI disclosure | 🟡 NEEDS REVIEW | OpenAI used; is any output user-facing? |
| COPPA age gate | 🟡 NEEDS REVIEW | Not child-directed, but no age collected either |
| Refund policy | 🟡 NEEDS REVIEW | Payments live, no refund policy found |
| Sales tax / VAT | 🟡 NEEDS REVIEW | Advisory: no tax handling configured |
| Third-party licences | 🟡 NEEDS REVIEW | No `LICENSE` file; self-hosted font has no licence |
| Do Not Sell / Share | 🟢 PASS | No ad or cross-context pixels found |

## 🔴 Failures

### 1. Live Stripe secret key in client-side code

**Where**
- `src/checkout.js:2` — Stripe live secret key, assigned to a module constant
- `.env:1` — OpenAI project key, in a file that is **tracked by git**
- `.env:2` — `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`, a secret behind a
  browser-exposed prefix

**Why it matters** `src/checkout.js` ships to the browser, so the key is public
the moment you deploy. A live Stripe secret key allows charges, refunds and
reading your full customer list. The `NEXT_PUBLIC_` prefix is not a hiding
place — it means "inline this into the JavaScript the browser downloads". If
customer data is exposed as a result, breach-notification duties may follow:
GDPR Arts. 33–34 for EU customers, and US state breach statutes.

**Fix**
1. **Rotate all three keys now**, in the Stripe, OpenAI and Supabase dashboards,
   before touching any code. Cleanup without rotation fixes nothing.
2. Move the charge server-side so the key never reaches the browser:
   ```js
   // server/checkout.js — runs on your server only
   import Stripe from 'stripe';
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

   export async function createCheckout(email) {
     return stripe.checkout.sessions.create({
       mode: 'subscription',
       line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
       customer_email: email,
       success_url: 'https://snapmoji.app/welcome',
     });
   }
   ```
3. The client calls your endpoint instead. Add auth and rate limiting to it, or
   you have traded a key leak for an open proxy.
4. Untrack the env file:
   ```bash
   git rm --cached .env
   printf '.env*\n!.env.example\n' >> .gitignore
   ```
5. Git history still holds the keys. Rotation in step 1 already neutralised
   them; purge with `git-filter-repo` if the repo is public.
6. Add `npx gitleaks protect --staged` as a pre-commit hook.

---

### 2. Row Level Security disabled on a table holding user data

**Where** `supabase/migrations/0001_init.sql:9` —
`alter table public.stickers disable row level security;`

**Why it matters** Your anon key is in the browser by design. With RLS off,
anyone who views source can read every row of `public.stickers` — every user's
`user_id` and image URL — with a single `curl`. This is the most common cause of
real data loss in fast-built apps, and the legal consequences arrive afterwards
as breach duties (GDPR Arts. 32–34 and state breach-notification laws).

**Verify it yourself** — this takes ten seconds and settles the question:
```bash
curl "https://YOUR_PROJECT.supabase.co/rest/v1/stickers?select=*" \
  -H "apikey: YOUR_ANON_KEY"
```
Rows coming back means anyone can get them.

**Fix**
```sql
alter table public.stickers enable row level security;

create policy "owners read their own stickers" on public.stickers
  for select using (auth.uid() = user_id);

create policy "owners insert their own stickers" on public.stickers
  for insert with check (auth.uid() = user_id);
```
Also make `user_id` `not null`, or a row with a null owner is unreachable by any
policy and effectively orphaned. Then run the **Security Advisor** in the
Supabase dashboard — policies live there, not in this repo, so the migration
file alone cannot prove the live state.

---

### 3. Analytics and session replay fire before any consent

**Where**
- `index.html:8` — `googletagmanager.com/gtag/js?id=G-ABCD1234XY`
- `index.html:11` — `gtag('config', …)` on load
- `index.html:17` — Hotjar loader, injected on load
- No consent library or consent gate anywhere in the project

**Why it matters** Two separate exposures.

*EU:* ePrivacy Directive **Art. 5(3)** requires prior informed consent before
non-essential tags store or read anything on a visitor's device. Both of these
run during page load, so consent is impossible by construction.

*California:* Hotjar records mouse movement, clicks, scrolling and — with no
masking configured — text typed into your email field. Recording visitors
together with a third party has driven a large wave of CIPA claims;
**Cal. Penal Code §637.2** allows **$5,000 per violation** or three times actual
damages, with no proof of harm required. (SB 690, effective 1 January 2027,
narrows this by making §638.51 pen-register claims Attorney General-only for
websites, but §631 and §632 claims remain available to private plaintiffs.)

**Fix**
1. Stop loading either tag on page load. Gate both:
   ```js
   if (getConsent('analytics') === 'granted') {
     loadAnalytics();   // injects gtag and Hotjar
   }
   ```
2. For Google tags, ship Consent Mode v2 with denied defaults:
   ```js
   gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied' });
   // only after the visitor clicks Accept:
   gtag('consent', 'update', { analytics_storage: 'granted' });
   ```
3. Mask the inputs Hotjar can see, whatever you decide about consent:
   ```html
   <input type="email" data-hj-suppress>
   ```
4. Name both vendors in your privacy policy (see failure 6).

**Then verify in a browser.** Fresh profile, DevTools → Network, hard reload.
Before you click anything there must be zero requests to `googletagmanager.com`
and `static.hotjar.com`. Then click Reject and confirm the same. A banner that
records a choice but loads the tags regardless is the most common real-world
failure, and it looks compliant from the outside.

---

### 4. No consent mechanism at all

**Where** No match for any consent library or consent gate across the project.

**Why it matters** Follows directly from failure 3 — the tags exist and nothing
can gate them.

**Fix** Add a consent layer that actually blocks. A self-hosted option avoids
introducing another processor:
```bash
npm i vanilla-cookieconsent
```
The library matters far less than the behaviour. Get these five right:
- nothing non-essential loads until the visitor opts in
- "Reject all" is one click and as prominent as "Accept all"
- nothing is pre-ticked; scrolling and dismissing are not consent
- categories can be accepted individually
- a persistent footer link re-opens preferences, so consent is withdrawable

---

### 5. Google Fonts loaded from Google's servers

**Where** `index.html:6` —
`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter…">`

**Why it matters** This makes every visitor's browser connect to Google
directly, disclosing their IP address during page load — before any banner could
intervene. On 20 January 2022 the Landgericht München I (case **3 O 17493/20**)
held that this was an unlawful transmission without a lawful basis and awarded
the plaintiff **€100** plus an injunction. One first-instance German judgment is
not EU-wide law, but the reasoning has been followed and it drove a large wave of
German warning letters. The fix is cheap enough that the analysis barely matters.

**Fix**
```bash
npx fontsource-cli add inter
```
Copy the `.woff2` files to `public/fonts/`, then replace the `<link>`:
```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin-400.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```
Keep the OFL licence file beside the fonts — that closes part of the licence
finding below too. It also makes the page faster: one fewer DNS lookup and TLS
handshake on the critical path.

---

### 6. No privacy policy and no terms of service

**Where** No file or route matching privacy, terms, tos or legal.

**Why it matters** You collect email addresses (`index.html:29`), store user
images (`supabase/migrations/0001_init.sql`), and send data to Stripe, Supabase,
Resend, OpenAI, Google Analytics and Hotjar. CalOPPA (**Cal. B&P §22575**)
requires a commercial operator collecting PII from California residents to post a
privacy policy naming the categories collected and the categories of third
parties it is shared with; a violation arises after failing to post within **30
days** of notice, with UCL penalties up to **$2,500 per violation** (CCPA fines, if the CCPA
applies, are separate: up to $2,663 / $7,988 per intentional violation). If you have
EU users, GDPR **Arts. 13–14** require considerably more. Without terms you also
have no limitation of liability, no governing law, and no stated basis for
terminating an abusive account.

**Fix** Write them from your real data flows, not from a template. Start with
the list of processors above — every one of them belongs in the policy, and
nothing you do not use should be in it. A policy that misdescribes your practice
is its own problem under FTC Act §5. Link both from the footer of every page,
and link the privacy policy from the email signup form.

---

### 7. Image uploads with no DMCA agent

**Where** `index.html:33` — `<input type="file" accept="image/*">`, with uploads
stored in `public.stickers`. No match for DMCA, designated agent, or takedown
anywhere.

**Why it matters** Users can upload images you store and serve, so **17 U.S.C.
§512(c)** is in play. Designating an agent is a threshold condition for the safe
harbour — courts treat it as a gate, not a factor. Without it you simply do not
have the defence, so an infringement claim over something a user uploaded can be
brought against you directly.

**To be precise:** this is **not** a fine and **not** a penalty. The consequence
is losing a defence.

**Fix** About ten minutes and $6:
1. Register at [dmca.copyright.gov](https://dmca.copyright.gov) — $6 per
   designation. Paper designations no longer count.
2. Publish the agent's name, address, phone and email at `/dmca`.
3. Write the notice-and-takedown process and follow it.
4. Adopt and enforce a repeat-infringer termination policy, and say so in your
   terms. Courts have denied the safe harbour to providers who had the policy on
   paper and ignored it.
5. Diarise the renewal — designations must be kept current.

---

### 8. Newsletter with no unsubscribe link and no postal address

**Where** `src/mailer.js:6` — `sendNewsletter()` sends to a list via Resend. The
HTML body is `<h1>New packs!</h1><p>Check out what we shipped this week.</p>` —
no opt-out, no address.

**Why it matters** This is a commercial message, not a transactional one, so
CAN-SPAM (**15 U.S.C. §7704**) applies in full. Each non-compliant email can draw
a civil penalty up to **$53,088** — the FTC's inflation-adjusted maximum, in
force since 17 January 2025 and unchanged for 2026. It is per-message, so one
campaign to a few thousand addresses multiplies badly. If any recipient is in the
EU or UK, ePrivacy and PECR are stricter still: you generally need consent
*before* sending, not just an opt-out after.

**Fix** Footer on every commercial template:
```html
<p>You received this because you signed up at snapmoji.app.
   <a href="{{unsubscribe_url}}">Unsubscribe</a><br>
   Snapmoji, 123 Example Street, Suite 4, City, ST 12345</p>
```
Plus the one-click headers, which mailbox providers now effectively require:
```
List-Unsubscribe: <https://snapmoji.app/u/{{token}}>, <mailto:unsub@snapmoji.app>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```
The link must keep working for at least 30 days after the send, needs no login
and no fee, and opt-outs must be honoured within 10 business days. Your
transactional mail (receipts, password resets) is exempt from the opt-out
requirement, but still must not use deceptive headers.

---

### 9. Stripe subscription with no renewal disclosure and no cancellation path

**Where** `src/checkout.js:8` — `mode: "subscription"` with a recurring price.
No match for auto-renewal language, and no cancellation route or billing portal
call anywhere.

**Why it matters** California's ARL (**Cal. B&P §17600 et seq.**, as amended by
AB 2863 for contracts from 1 July 2025) requires clear and conspicuous renewal
terms before the charge, affirmative consent to the recurring charge, and
cancellation in the medium used to subscribe. **§17603** is the sharp end: goods
sent without the required affirmative consent are deemed an **unconditional
gift** the consumer may keep without paying. Federal ROSCA also still applies —
the FTC's click-to-cancel rule was vacated in July 2025 and is being re-proposed,
so do not read the vacatur as permission.

**Fix** Immediately next to the pay button, visually set apart from the rest:

> **$9/month, renews automatically until you cancel.** Cancel any time in
> Settings → Billing before your next renewal date.
>
> ☐ I agree to the recurring charge above.

Unticked by default, and separate from the purchase action itself. Then:
```js
// one route, and cancellation is self-serve
const session = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: 'https://snapmoji.app/settings',
});
```
Send a post-purchase acknowledgement containing the terms and the cancellation
method, and send renewal reminders including an annual one.

---

### 10. Four accessibility defects

**Where**
- `index.html:2` — `<html>` with no `lang` attribute
- `index.html:26` — `<img src="/hero.png">` with no `alt`
- `index.html:29` — `<input type="email">` with no label, `id` or `aria-label`
- `index.html:32` — `onclick` on a `<div>` with no `role` and no `tabindex`,
  so "Upgrade to Pro" cannot be reached by keyboard at all

**Why it matters** Target is **WCAG 2.2 Level AA**. In the US, private-sector
web accessibility claims are brought under ADA Title III and do not wait for a
regulation. If you sell to EU consumers, the European Accessibility Act has
applied to consumer e-commerce since **28 June 2025** via EN 301 549 — though
**micro-enterprises** providing services (fewer than 10 employees and ≤€2M
turnover or balance sheet) are exempt from the service requirements, which may
well cover you today.

The `onclick` div is the one that actually locks people out: a keyboard user
cannot upgrade.

**Fix**
```html
<html lang="en">
<img src="/hero.png" width="600" alt="Six emoji stickers generated from one selfie">
<label for="email">Email</label>
<input id="email" type="email" placeholder="you@example.com" data-hj-suppress>
<button type="button" onclick="openUpgrade()">Upgrade to Pro</button>
```
```css
:focus-visible { outline: 2px solid #C5FF4A; outline-offset: 2px; }
```
Then do the two things no scanner can:
- **Keyboard**: unplug the mouse and tab through signup → upload → upgrade. Reach
  everything, always see focus, escape every modal.
- **Contrast**: body text ≥ 4.5:1, large text and meaningful borders ≥ 3:1 —
  including hover, disabled and placeholder states, and dark mode.
```bash
npx @axe-core/cli http://localhost:5173
```

## 🟡 Needs review

### AI disclosure

**What the scan found** `package.json:4` depends on `openai`, but no chat UI and
no AI disclosure text anywhere in the project.

**The question you need to answer** Is any model output shown to users? If
there is a chat or assistant surface, EU AI Act **Art. 50(1)** — in force since
2 August 2026 — requires telling people they are interacting with an AI, in the
interface and not only in the terms. If you publish generated images or copy,
Art. 50(2) adds machine-readable marking of synthetic content, and California's
B.O.T. Act (**B&P §17941**) makes concealing a bot's artificial identity unlawful
in commercial contexts, with disclosure as the safe harbour.

**If output is user-facing** add a persistent line in the AI surface — "AI
assistant · answers may be inaccurate" — and label generated assets where they
are published. Also disclose in your privacy policy which provider receives the
data and whether it trains on it.

---

### COPPA age gate

**What the scan found** No child-directed signals — nothing in the copy, naming
or imagery aimed at children. Also no date-of-birth or age collection anywhere.

**The question you need to answer** COPPA applies only if the service is
directed to children under 13, or you have actual knowledge of an under-13 user.
Nothing here looks child-directed, so it probably does not apply. But a sticker
app has obvious appeal to children, and with no age collected you have no way to
notice a 10-year-old signing up — and actual knowledge starts the clock from the
moment you have it.

**Suggested** collect **date of birth** at signup (not "are you over 13?"),
block under-13 accounts, state in your terms that the service is not for
children under 13, and keep a documented deletion path for when you learn a user
is under 13. The amended COPPA Rule required full compliance by 22 April 2026, so
if you ever become child-directed, the obligations are live immediately.

---

### Refund policy

**What the scan found** Stripe is wired up (`src/checkout.js:4`); no refund,
cancellation or money-back language anywhere.

**The question you need to answer** What is your refund policy, and is it
visible before payment? "No refunds" is legitimate, but it must be disclosed
pre-payment and it does not override statutory rights. If you sell to EU or UK
consumers, the Consumer Rights Directive gives a **14-day** right of withdrawal
— and for digital content delivered immediately you lose that exception unless
you take express consent to begin *plus* acknowledgement that the right is
thereby lost:

> ☐ Start my access now. I understand I lose my 14-day right to withdraw once
> access begins.

---

### Sales tax / VAT (advisory)

**What the scan found** Payments configured, no tax handling. This check never
fails a run — it is a note.

**The question you need to answer** Are you the seller of record? Raw Stripe
leaves VAT and sales-tax registration and remittance with you; a
merchant-of-record platform (Paddle, Lemon Squeezy, Polar) takes it on. For EU
B2C digital sales, VAT is due in the customer's member state via the One Stop
Shop — and the €10,000 cross-border threshold is for **EU-established** sellers
only, so a non-EU seller registers from the first sale. In the US, economic nexus
thresholds vary by state and many tax SaaS.

**Do now, while volume is small** turn on `automatic_tax: { enabled: true }` in
Stripe and store the customer's location with every transaction. Then ask an
accountant. This is the one item where a professional is cheaper than the
alternative.

---

### Third-party licences

**What the scan found**
- No `LICENSE` file at the project root
- `public/fonts/` will hold a self-hosted font after failure 5 is fixed, with no
  licence file beside it

**The question you need to answer** Can you ship everything you shipped? Run:
```bash
npx license-checker-rspack --summary
```
and look for GPL / AGPL / SSPL / CC-BY-NC. AGPL in a hosted web app is the one
that surprises people. Then account for every image and icon by source and
licence — "found it on Google Images" is not a licence.

**Suggested** add your own `LICENSE` (without one nobody may legally reuse your
code), keep the OFL text beside the `.woff2` files, and start a `CREDITS.md`
recording each asset's source and licence.

## 🟢 Passed

- **Do Not Sell or Share** — no advertising or cross-context behavioural pixels
  found, so the CCPA/CPRA opt-out link may not be required. You are also very
  likely under all three thresholds. Re-check the moment you add a Meta or TikTok
  pixel, because that is "sharing" even though no money changes hands.

## Not checked

These need something a source scan cannot reach. None of them is a PASS.

- **Live Supabase policies.** The migration says RLS is off; the hosted project
  is the source of truth. Run the Security Advisor in the dashboard.
- **Colour contrast and keyboard operability.** Needs a real browser against your
  actual tokens. See failure 10.
- **Whether tags really wait for consent** once a banner is added. Needs a
  DevTools Network check with a fresh profile.
- **Production email templates.** Only `src/mailer.js` was visible; if templates
  live in the Resend dashboard, check those footers too.
- **Whether a DMCA agent is registered.** Search the Copyright Office directory
  for the business name.
- **Your CCPA thresholds, markets and audience.** Only you know these.

---

### Disclaimer

**Educational, not legal advice.** This report describes patterns found in your
code. It cannot see your contracts, your data flows, your markets, your
thresholds or your risk appetite, and it does not cover every law that might
apply to you. A clean report is not a compliance certificate, and nothing here
creates a lawyer–client relationship. Laws change and differ by jurisdiction —
for anything consequential, get advice from a qualified lawyer in the places you
operate.

Citations and dates: [SOURCES.md](../SOURCES.md)
Generated with [vibe-check](https://github.com/vynemastudio/vibe-check) by Vynema Studio.

---

Want me to fix these? I'd start with the Stripe key — that one is live.
