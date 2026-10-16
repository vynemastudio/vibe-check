# The 16 checks, in full

For each check: **what it is**, **when it actually applies**, **the citation**,
**how to verify by hand**, and **the fix**.

Every figure here is sourced in [SOURCES.md](../../../SOURCES.md) with a link.
Do not state a number that is not on this page.

> Educational reference, not legal advice. These are the common gaps, written
> conditionally because most of these laws apply only in specific situations.

---

## 1. `google-fonts` — Google Fonts loaded from Google's servers

**What** A `<link>` or `@import` to `fonts.googleapis.com` / `fonts.gstatic.com`
makes the visitor's browser connect to Google directly, disclosing their IP
address — before any consent banner can intervene, because it happens during
page load.

**Applies if** any EU/EEA visitor can reach your pages. There is no revenue or
headcount threshold.

**Citation** On 20 January 2022 the Landgericht München I (Regional Court of
Munich I), case **3 O 17493/20**, held that embedding Google Fonts remotely
without consent was an unlawful transmission of the visitor's IP address and
awarded the plaintiff **€100** in damages, with an injunction. The ruling
triggered a wave of German warning letters. A single first-instance German
judgment is not EU-wide law, but the reasoning — no lawful basis for disclosing
an IP to a third party when the font renders fine from your own server —
travels, and several other German courts have followed it.

**Verify by hand**
```bash
grep -rn "fonts.googleapis.com\|fonts.gstatic.com" --include="*.html" --include="*.css" --include="*.ts*" --include="*.js*" .
```
Then load the site with DevTools → Network and filter for `google`. Zero
requests is the goal. Watch for fonts pulled in indirectly by a CSS framework,
an email template, or a third-party widget.

**Fix** Self-host.
```bash
npx fontsource-cli add inter      # or download from fonts.google.com
```
Copy the `.woff2` files to `/public/fonts/`, then:
```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin-400.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```
Delete every remote reference. Keep the OFL or Apache-2.0 licence file beside
the font files. **Next.js**: `next/font/google` downloads and self-hosts at
build time — that is already fine, no runtime request to Google. The same
analysis applies to any third-party font CDN (Typekit, Fontshare, Bunny).

---

## 2. `tracking-before-consent` — analytics, pixels or session replay firing before consent

**What** Analytics, ad pixels and session-replay scripts that run on page load,
before the visitor has agreed to anything. Session replay is the sharper
version: it records mouse movement, clicks, scrolling and often keystrokes, and
ships them to a third party.

**Applies if** you have EU/EEA or UK visitors (consent), or California visitors
(wiretapping theories). Practically: if your site is on the public internet.

**Citation**
- **EU**: ePrivacy Directive 2002/58/EC **Art. 5(3)** requires prior informed
  consent before storing or accessing information on a user's device, for
  anything not strictly necessary — analytics cookies included. The EDPB's
  Guidelines 2/2023 read Art. 5(3) broadly enough to cover most tracking
  techniques, not only cookies. GDPR supplies the consent standard: freely
  given, specific, informed, unambiguous, and as easy to withdraw as to give.
- **California**: plaintiffs have brought hundreds of claims under the
  California Invasion of Privacy Act, arguing that a third-party replay or chat
  vendor is an undisclosed eavesdropper. **Cal. Penal Code §637.2** gives a
  private right of action for **$5,000 per violation** or three times actual
  damages, whichever is greater, with no proof of harm required.
  **Important nuance**: SB 690, signed in 2026 and effective 1 January 2027,
  removes the *private* right of action for **pen register / trap-and-trace
  claims under §638.51** arising from website and app activity — those become
  Attorney General-only. It does **not** touch §631 (wiretapping) or §632
  (confidential recording), which remain fully available to private plaintiffs.
  So the exposure narrows; it does not disappear.

**Verify by hand** Open a fresh browser profile, DevTools → Network, hard
reload. Before you click anything in the banner, there must be **zero** requests
to analytics or pixel hosts, and no non-essential cookies in Application →
Storage. Then click **Reject** and confirm the same. A banner that reports a
choice but loads the tags regardless is the most common failure, and the one
that looks compliant from the outside.

**Fix** Gate every non-essential tag behind an actual opt-in:
```js
if (getConsent('analytics') === 'granted') loadAnalytics();
```
For Google tags, ship Consent Mode v2 with denied defaults:
```js
gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied' });
// only after the visitor accepts:
gtag('consent', 'update', { analytics_storage: 'granted' });
```
If you keep session replay, turn on input masking so form fields are never
captured:

| Vendor | Masking |
| :-- | :-- |
| Hotjar | `data-hj-suppress` on the element |
| FullStory | `class="fs-exclude"` or `fs-mask` |
| Microsoft Clarity | `data-clarity-mask="true"` |
| PostHog | `class="ph-no-capture"`, or `session_recording.maskAllInputs` |
| Sentry Replay | `Replay({ maskAllText: true, maskAllInputs: true })` |
| LogRocket | `dom: { inputSanitizer: true }` |

Disclose each vendor by name in your privacy policy. Consider a cookieless,
self-hosted analytics option — fewer obligations because less data leaves.

---

## 3. `cookie-consent-banner` — consent mechanism for EU visitors

**What** Whether a consent layer exists at all, and whether it meets the
standard rather than just existing.

**Applies if** you set any non-essential cookie, or read/write any non-essential
local storage, for an EU/EEA or UK visitor. Strictly necessary cookies — your
own session cookie, a CSRF token, a load-balancer cookie — need no consent.

**Citation** ePrivacy Directive Art. 5(3) as implemented in each member state's
national law, with GDPR Art. 4(11) and Art. 7 supplying what "consent" means.

**Verify by hand** The things regulators actually penalise:
- "Reject all" is present, one click, and as visually prominent as "Accept all".
  A greyed-out link next to a bright Accept button is a known failure pattern.
- Nothing is pre-ticked. Continuing to scroll is not consent. Closing the banner
  is not consent.
- Categories can be accepted individually.
- A persistent link (footer is fine) re-opens preferences so consent can be
  withdrawn as easily as it was given.
- The decision is recorded with a timestamp and the banner version.

**Fix** Free, self-hosted options that avoid adding a new processor:
```bash
npm i vanilla-cookieconsent     # no vendor account
npm i @c15t/react               # open-source consent management
```
The library matters far less than the behaviour. Get the five bullets above
right and almost any library works; get them wrong and no library saves you.

---

## 4. `secrets-exposed` — keys and credentials reachable by the public

**What** Secret keys hardcoded in client-side code, shipped in a browser bundle,
hidden behind a public env prefix (`NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`,
`PUBLIC_`, `EXPO_PUBLIC_`), or committed in a `.env` file.

**Applies** always.

**Citation** Not a statute of its own. It becomes one through the door it opens:
GDPR **Art. 32** (security of processing) and **Art. 33** (72-hour breach
notification), US state breach-notification statutes, and your payment or model
provider's terms, which generally allow immediate termination for a leaked key.

**Anything behind a public env prefix is public.** Those prefixes mean "inline
this value into the JavaScript the browser downloads". It is not hidden; it is
published.

**Known non-issue — do not report it as a leak:** a Firebase Web API key
(`AIza…`) is a public project identifier by design. Firebase expects it in
client code. What protects Firebase data is your Security Rules
(check 5), not key secrecy.

**Verify by hand**
```bash
npm run build && grep -ril "sk_live\|sk-ant\|sk-proj\|AKIA\|service_role" dist build .next 2>/dev/null
git log --all -p -- .env | head          # did it ever get committed?
npx gitleaks detect --no-git             # broader sweep
```

**Fix, in this order**
1. **Rotate the key first.** Revoke it in the provider dashboard before you
   touch the code. Cleanup without rotation fixes nothing — the key is already
   out.
2. Move the call server-side: an API route, server action or edge function
   holds the key; the browser calls your endpoint. Add auth and rate limiting
   to that endpoint, or you have swapped a key leak for an open proxy.
3. Keep only publishable/anon keys behind public prefixes.
4. Untrack and ignore:
   ```bash
   git rm --cached .env
   printf '.env*\n!.env.example\n' >> .gitignore
   ```
5. Git history still contains it. Either purge with `git-filter-repo` and
   force-push, or accept that rotation already neutralised it.
6. Add a guard so it cannot recur: a `gitleaks` pre-commit hook, or secret
   scanning in CI.

---

## 5. `open-database` — database left world-readable or world-writable

**What** Supabase tables with Row Level Security off or a `using (true)` policy;
Firebase rules granting public read/write; a database exposed to `0.0.0.0/0`.
The anon key is in the browser, so anyone who views source can use it.

**Applies** always, if the browser talks to your database directly.

**Citation** Not a statute — the single most common cause of real data loss in
fast-built apps. The legal consequences arrive afterwards, as breach duties:
GDPR Arts. 32–34, and state breach-notification laws.

**Verify by hand** This is the one check worth doing from the outside. Take your
**anon/public** key and try to read a row you do not own:
```bash
curl "https://YOUR_PROJECT.supabase.co/rest/v1/your_table?select=*" \
  -H "apikey: YOUR_ANON_KEY"
```
If rows come back, so can anyone's. Supabase also ships a **Security Advisor**
in the dashboard — run it; it catches tables with RLS off directly. For
Firebase, use the Rules Playground in the console.

Policies usually live in the hosted dashboard, not in the repo, so a repo scan
cannot confirm them. Check the dashboard.

**Fix** Deny by default, then allow narrowly.
```sql
alter table public.posts enable row level security;

create policy "owner reads own rows" on public.posts
  for select using (auth.uid() = user_id);

create policy "owner writes own rows" on public.posts
  for insert with check (auth.uid() = user_id);
```
Never ship `using (true)` on a table holding user data. Enable RLS on **every**
table in an exposed schema, including join tables and views. Firebase:
```
match /users/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```
`allow read, write: if true` is open to the internet. So is a rule gated only on
`request.time < <some date>` once that date passes.

---

## 6. `privacy-policy-terms` — privacy policy and terms published

**What** Whether both documents exist, are reachable, and describe what the code
actually does.

**Applies if** you operate a commercial website or online service and collect any
personally identifiable information from consumers — an email address counts.

**Citation**
- **CalOPPA**, Cal. Bus. & Prof. Code **§22575 et seq.**: a commercial operator
  collecting PII from California residents must conspicuously post a privacy
  policy stating the categories of PII collected, the categories of third
  parties it is shared with, the process for review and correction, how
  material changes are announced, the effective date, and how the operator
  responds to Do Not Track signals. Violation arises only if the operator fails
  to post within **30 days of being notified** of non-compliance; penalties then
  run through the Unfair Competition Law, up to **$2,500 per violation**. (CCPA fines, where the CCPA also applies, are a separate scale: up to **$2,663 per violation** or **$7,988 per intentional violation** (CPPA, from 1 Jan 2025).)
- **GDPR Arts. 13–14** set a much longer list of required disclosures if you
  have EU/EEA users: legal basis per purpose, retention periods, international
  transfers, data subject rights, and the controller's identity.
- Terms of service are not statutorily mandated, but without them you have no
  limitation of liability, no governing law, no acceptable-use rules, and no
  stated basis for terminating an abusive account.

**Verify by hand** Both linked from the footer of every page; the privacy policy
also linked from every form that collects data. Then read the policy against the
code: does it name every processor the app actually sends data to — Stripe,
Supabase, Resend, your analytics vendor, your model provider? Does it claim
something you do not do?

**Fix** Write them from your real data flows. A generated template that names
services you do not use, or omits ones you do, is itself a misrepresentation —
and under the FTC Act a privacy policy that does not match your practice is the
classic deception claim. Make a list of every third party that receives user
data, then write the policy around that list.

---

## 7. `ccpa-do-not-sell` — "Do Not Sell or Share My Personal Information"

**What** A conspicuous opt-out link, working without an account, plus honouring
the Global Privacy Control browser signal.

**Applies if** *both*: you meet a CCPA threshold, **and** you sell or share
personal information. The thresholds (any one): gross annual revenue over
**$26,625,000** (CPI-adjusted from 1 Jan 2025); or buying, selling or sharing the personal information of
**100,000 or more** California consumers or households in a year; or deriving
**50% or more** of annual revenue from selling personal information.

"Sharing" is the trap. It explicitly covers disclosing personal information for
**cross-context behavioural advertising** — so a Meta or TikTok pixel on your
site is "sharing" even though no money changes hands.

**Citation** CCPA as amended by the CPRA, Cal. Civ. Code **§1798.135**, and the
CPPA's implementing regulations. Note that most startups are under the
thresholds; the honest finding is often "this does not apply yet". Where it
does apply, CPPA administrative fines reach **$2,663 per violation** or
**$7,988 per intentional violation** (or one involving known under-16s), from
1 Jan 2025.

**Verify by hand** Is the link on every page, labelled "Do Not Sell or Share My
Personal Information" (or the standard "Your Privacy Choices" link with its
icon)? Does it work logged out? Does clicking it actually stop the downstream
sharing, or only set a cookie? Does `navigator.globalPrivacyControl` get
respected?

**Fix**
```js
if (navigator.globalPrivacyControl) disableAdTech();   // GPC is a valid opt-out
```
Propagate the signal to the platforms — Google restricted data processing, Meta
Limited Data Use. Describe the right and the mechanism in your privacy policy.
If you are under the thresholds, write a dated note recording why it does not
apply, and re-check when you grow. Several other states (Colorado, Connecticut,
Texas, Oregon and more) now require honouring universal opt-out signals too.

---

## 8. `dmca-agent` — designated agent for user-uploaded content

**What** A DMCA agent registered with the U.S. Copyright Office, published on
your site, backed by a takedown process and a repeat-infringer policy.

**Applies if** users can upload or post material that you store and serve —
images, video, audio, documents, or text.

**Citation** **17 U.S.C. §512(c)(2)**. Designating an agent is a threshold
condition for the §512(c) safe harbour: courts treat it as a gate, not a factor.
Registration is through the online **DMCA Designated Agent Directory** at
`dmca.copyright.gov` — the old paper designations no longer count — and the fee
is **$6** per designation, amendment or resubmission.

**Be precise about the consequence.** Not designating an agent is **not** a fine
and **not** a penalty. The consequence is that you do not have the safe harbour,
so an infringement claim over something a user uploaded can be brought against
you directly, with ordinary copyright remedies available. Do **not** describe
this as a "$150,000 fine" — statutory damages up to $150,000 per work exist for
*wilful infringement* in a successful suit, which is a different thing entirely
and not a consequence of the missing registration.

**Verify by hand** Search the Copyright Office directory for your business name.
If it is not there, you do not have the safe harbour, regardless of what your
terms say. Then confirm the published contact details match the registration,
and that the registration is current — designations must be kept up to date and
re-confirmed every three years.

**Fix**
1. Register at `dmca.copyright.gov` — about ten minutes, $6.
2. Publish the agent's name, address, phone and email at `/dmca` or in your
   terms.
3. Write the takedown process and follow it: receive, review, remove or disable
   expeditiously, notify the uploader, handle counter-notices.
4. Adopt and actually enforce a repeat-infringer termination policy, and say so
   in your terms. Courts have denied the safe harbour to providers who had a
   policy on paper and ignored it.
5. Diarise the renewal.

---

## 9. `coppa-age-gate` — age gate for under-13 users

**What** Whether you collect age at all, and whether a child-directed service
gets verifiable parental consent before collecting anything.

**Applies ONLY IF** one of two things is true: your site, app or service is
**directed to children under 13**, **or** you have **actual knowledge** that you
collect personal information from a child under 13. A general-audience product
is outside COPPA until one of those is true. Do not report this as a universal
requirement — it is the single most over-claimed item in compliance checklists.

Child-directed is judged on the whole picture: subject matter, visual and audio
content, use of animated characters or child-oriented activities, music, the age
of models, celebrities who appeal to children, advertising placement, and
audience evidence.

**Citation** COPPA, **15 U.S.C. §§6501–6506**; the COPPA Rule, **16 C.F.R.
Part 312**. The FTC published substantial amendments on **22 April 2025**
(effective 23 June 2025) with **full compliance required by 22 April 2026** —
the first major update since 2013. COPPA violations are enforced as FTC rule
violations: a civil penalty of up to **$53,088 per violation** (16 C.F.R. §1.98,
in force from 17 Jan 2025 and not adjusted for 2026). They expanded "personal information" to
include biometric identifiers and government-issued identifiers, added approved
methods of verifiable parental consent, required separate consent before
disclosing a child's data to third parties for advertising, and added written
data-retention policy and security requirements.

**Verify by hand** Look at who actually uses the product, not who you intended.
Check your analytics age distribution, your app store rating, your marketing
copy and imagery, and your support inbox. If you ever receive a message that
tells you a user is 11, you have actual knowledge from that moment.

**Fix — general audience, staying out of scope**
- Collect **date of birth**, not "are you over 13?" — a neutral age screen that
  does not telegraph the right answer, placed before any account creation or
  data collection, that does not let the user simply retry.
- Block or divert under-13 signups and persist the decision.
- State in your terms that the service is not for children under 13.
- Have a documented path to delete an account once you learn a user is under 13.

**Fix — actually child-directed**
- Verifiable parental consent **before** any collection (16 C.F.R. §312.5).
- Separate consent before any disclosure to third parties for advertising.
- Direct notice to parents plus an online notice; parental review and deletion
  rights; a written retention policy, retaining only as long as necessary.
- Turn off behavioural ad tech and third-party analytics on child-directed
  surfaces. This is the most common enforcement theory by a wide margin.
- Note that state laws (age-appropriate design codes, teen privacy statutes)
  may reach 13–17 year-olds even where COPPA does not.

---

## 10. `can-spam` — unsubscribe and postal address in commercial email

**What** Whether commercial messages carry a working opt-out and a real physical
address.

**Applies to** any email whose **primary purpose is commercial**. Purely
transactional or relationship messages — receipts, password resets, shipping
notices, account notices — are exempt from the opt-out and address requirements,
but must still not use deceptive headers or subject lines. A "receipt" with a
promotional banner stapled to it can flip into commercial.

**Citation** CAN-SPAM Act, **15 U.S.C. §7704**; FTC Rule **16 C.F.R. Part 316**.
Each non-compliant message can draw a civil penalty up to **$53,088**. That is
the FTC's inflation-adjusted maximum, in force since 17 January 2025 (raised
from $51,744) and **unchanged for 2026** — the annual adjustment was cancelled
government-wide for 2026, so the 2025 figure still applies. Because it is
per-message, a single bad campaign multiplies fast.

**Verify by hand** Send yourself a real send from the production template. Click
the unsubscribe link while logged out. It must work with no login, no fee and no
information beyond the email address. Then check the footer actually contains a
physical address.

**Fix** Every commercial message needs all of:
- a clear opt-out that keeps working for at least **30 days** after you send
- opt-outs honoured within **10 business days**
- your valid physical postal address — a street address, a registered PO box, or
  a registered private mailbox
- accurate From / Reply-To and a non-deceptive subject line
- an advertisement disclosure where the message is an ad

```html
<p>You received this because you signed up at example.com.
   <a href="{{unsubscribe_url}}">Unsubscribe</a><br>
   Vynema Studio, 123 Example Street, Suite 4, City, ST 12345</p>
```
Add the one-click headers for bulk mail — the mailbox providers now effectively
require them:
```
List-Unsubscribe: <https://example.com/u/{{token}}>, <mailto:unsub@example.com>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```
**EU/UK is stricter**: ePrivacy and the UK PECR generally require *consent*
before marketing email, with only a narrow soft opt-in for existing customers.
CAN-SPAM's opt-out model is not enough there.

---

## 11. `auto-renew-terms` — auto-renewing subscriptions

**What** Clear renewal terms at the point of sale, affirmative consent to the
recurring charge, and cancellation that is as easy as signing up.

**Applies if** you charge on a recurring basis, or convert a free trial into a
paid plan.

**Citation**
- **California ARL**, Cal. Bus. & Prof. Code **§17600 et seq.**, amended by
  **AB 2863** (signed 24 September 2024), applying to contracts entered,
  amended or extended on or after **1 July 2025**. The amendments rewrote
  §§17601–17602 and added renewal reminder duties, including an **annual**
  reminder delivered through the medium used to subscribe, identifying the
  product, the amount and frequency of charges, and how to cancel.
- **§17603** is the one with teeth: goods, wares, merchandise or products sent
  to a consumer under an automatic renewal or continuous service agreement
  **without first obtaining affirmative consent** as required by §17602 are
  deemed an **unconditional gift** — the consumer may keep, use or dispose of
  them with no obligation to pay, including no obligation to pay shipping.
- **Federal ROSCA**, 15 U.S.C. §8403, still applies. The FTC's "click-to-cancel"
  **Negative Option Rule was vacated** by the Eighth Circuit on 8 July 2025 on
  procedural grounds (the FTC skipped a required preliminary regulatory
  analysis). The FTC restarted the rulemaking in 2026, and it continues to
  enforce against negative-option practices under ROSCA and FTC Act §5. Do not
  treat the vacatur as permission.
- Many states have their own auto-renewal statutes — New York GBL §527-a,
  Illinois, Oregon, Colorado, Virginia, Washington, Delaware and others. Build
  to the strictest you are exposed to.

**Verify by hand** Go through your own checkout as a new customer. Are the
renewal terms visible **next to the pay button**, without scrolling, without
opening the terms? Is consent to the recurring charge a separate, unticked
action? Then subscribe and try to cancel — in the same medium you signed up in,
with no phone call and no retention maze.

**Fix** Immediately adjacent to the pay button, visually set apart:
- that it renews automatically until cancelled
- the recurring amount and the billing frequency
- the length of any free or discounted period and the price it becomes
- the deadline to cancel before the next charge, and how to cancel

Then:
1. Take affirmative consent for the recurring charge **separately** from the
   purchase — an unticked checkbox next to those terms.
2. Send a post-purchase acknowledgement containing the terms and the
   cancellation method, in a form the customer can keep.
3. Offer self-serve online cancellation. Stripe:
   `stripe.billingPortal.sessions.create({ customer })`.
4. Send renewal reminders, including the annual one.
5. For auto-converting trials, disclose the conversion price and date up front.

---

## 12. `accessibility-basics` — WCAG fundamentals

**What** Alt text, form labels, a document language, visible focus, keyboard
operability, and colour contrast.

**Applies to** any public-facing web product. In the US, private-sector web
accessibility claims are brought under ADA Title III and do not wait for a
regulation to exist.

**Citation**
- **ADA**. DOJ's 2024 rule under **Title II** set **WCAG 2.1 Level AA** for
  state and local government web content; in April 2026 DOJ issued an interim
  final rule extending those deadlines by a year, to **26 April 2027** for
  large entities and **26 April 2028** for smaller entities and special
  districts. Title II does not bind private companies — but private-sector
  Title III litigation is large and growing, and courts commonly reference
  WCAG as the practical standard.
- **European Accessibility Act** (Directive (EU) 2019/882): consumer
  e-commerce services sold into the EU have had to be accessible since
  **28 June 2025**, via **EN 301 549**, which for web content tracks
  **WCAG 2.1 Level AA**. It reaches any business selling online to EU
  consumers regardless of where the business sits. **Micro-enterprises
  providing services** — fewer than 10 employees and turnover or balance sheet
  total of €2 million or less — are exempt from the service requirements, and
  that exemption covers many small startups. It does not extend to products.
- The current W3C Recommendation is **WCAG 2.2**. Build to 2.2 AA; it is a
  superset of 2.1 AA.

**What a static scan catches** `<img>` with no `alt`, form controls with no
label / `id` / `aria-label`, missing `lang`, positive `tabindex`, click handlers
on non-interactive elements, focus outlines removed with no `:focus-visible`
replacement.

**What it cannot catch, and you must do by hand**
- **Keyboard**: unplug the mouse. Tab through every page. You must reach and
  operate every control, always see where focus is, escape every modal, and
  never get trapped.
- **Contrast**: body text ≥ **4.5:1**, large text and meaningful UI borders
  ≥ **3:1**. Check the real tokens, including hover, disabled and placeholder
  states, and dark mode. Low-contrast grey on a dark background is the single
  most common vibe-coded failure, because it looks deliberate.
- **Semantics**: heading order, landmark regions, whether a screen reader can
  make sense of the page at all.
- **Motion**: honour `prefers-reduced-motion`.

**Fix**
```html
<img src="/chart.png" alt="Revenue grew from $2k to $9k over six months">
<img src="/divider.svg" alt="">            <!-- decorative: empty alt -->
<label for="email">Email</label><input id="email" type="email">
<button aria-label="Close dialog"><XIcon aria-hidden="true" /></button>
<html lang="en">
```
```css
:focus-visible { outline: 2px solid #C5FF4A; outline-offset: 2px; }
```
Then run a real audit — static text analysis catches maybe a third of issues:
```bash
npx @axe-core/cli http://localhost:3000
npx lighthouse http://localhost:3000 --only-categories=accessibility
```
Automated tools in turn catch only part of what a real user would hit. For a
product people depend on, get a human audit.

---

## 13. `ai-disclosure` — AI chatbot and AI-generated content disclosure

**What** Telling people they are interacting with an AI, and labelling synthetic
content as synthetic.

**Applies if** a user can interact with an AI system directly, or you publish
AI-generated or AI-manipulated content.

**Citation**
- **EU AI Act**, Regulation (EU) 2024/1689, **Art. 50**. The transparency
  obligations apply from **2 August 2026** and were **not** postponed by the
  Digital AI Omnibus (Regulation (EU) 2026/1744), which delayed high-risk
  obligations to December 2027 / August 2028 but left Art. 50 on its original
  date. The only relief was for **Art. 50(2)** machine-readable marking of
  AI-generated content: systems already on the market before 2 August 2026 had
  until **2 December 2026**. Art. 50 requires: informing people they are
  interacting with an AI system unless it is obvious from context; marking
  synthetic audio, image, video and text in a machine-readable way; disclosing
  deepfakes and AI-manipulated content; and informing people exposed to emotion
  recognition or biometric categorisation. Non-compliance penalties run up to
  **€15 million or 3% of worldwide annual turnover**, whichever is higher.
- **California B.O.T. Act**, Cal. Bus. & Prof. Code **§17941**, operative since
  1 July 2019: unlawful to use a bot to communicate with a person in California
  with intent to mislead about its artificial identity, in order to incentivise
  a transaction or influence a vote. **Disclosing that it is a bot is the safe
  harbour** — the disclosure must be clear, conspicuous and reasonably designed
  to inform. Enforced through the Unfair Competition Law, with civil penalties
  up to **$2,500 per violation**. Informational and entertainment bots outside
  the commercial-transaction and electoral contexts are largely out of scope.
- Several other states (Colorado, Utah and more) have their own AI or chatbot
  disclosure rules; some regulate AI companions specifically. Check your markets.

**Verify by hand** Open the chat as a new user. Is it stated — visibly, in the
interface, not only in the terms — that this is an AI? Is it still visible
mid-conversation? Does the bot ever claim or imply it is a person? For generated
images or copy you publish, is there a visible label and embedded provenance?

**Fix**
- Chat, voice and agent surfaces: say so at the start and keep it persistent in
  the UI. A header reading "AI assistant — answers may be inaccurate" does the
  job.
- Synthetic output: label it where it is published **and** mark it
  machine-readably — C2PA Content Credentials, or metadata plus a visible label.
- Deepfakes and AI-manipulated likenesses: label clearly and prominently.
- Never let the bot assert it is human.
- Disclose AI use in your privacy policy: which provider receives the data,
  whether it trains on it, how long it is retained. Check your model provider's
  usage policies and output terms.

---

## 14. `refund-policy` — refund and cancellation policy

**What** A published refund policy, visible before payment.

**Applies if** you take money.

**Citation** No single US federal mandate for a refund policy, but: **FTC Act
§5** reaches charging customers without disclosing your terms; the card networks
require merchants to make the refund policy available; and in the EU the
**Consumer Rights Directive 2011/83/EU** gives consumers a **14-day right of
withdrawal** on distance sales. For digital content delivered immediately, that
right is lost **only** if you obtained the consumer's express prior consent to
begin **and** their acknowledgement that they thereby lose the withdrawal right.
Without that flow, the right survives and a refund is owed.

**Fix** Publish it, link it from checkout, restate it in the receipt. Say what is
refundable, the window, how to request, how long it takes, and what happens to
access on refund. "No refunds" is a legitimate policy — but it must be disclosed
before payment, and it does not override EU/UK statutory rights or chargeback
rules. For instant digital delivery to EU/UK consumers, add the express waiver:

> ☐ Start my access now. I understand I lose my 14-day right to withdraw once
> access begins.

Unticked by default.

---

## 15. `sales-tax-vat` — tax on digital goods (advisory only)

**What** Whether you are set up to collect and remit the right tax. This check
never fails a build; it is a note, because the answer depends on facts a scanner
cannot see.

**Applies if** you sell to consumers across a border.

**Citation**
- **EU**: for B2C supplies of digital services, VAT is due in the **customer's**
  member state at that state's rate, declared through the **One Stop Shop**. The
  **€10,000** annual cross-border threshold, below which you may keep charging
  your home rate, is available **only to sellers established in the EU** — a
  non-EU seller registers from the **first** B2C sale, via the non-Union OSS.
- **UK**: separate VAT regime since Brexit; no EU threshold applies.
- **US**: economic nexus after **South Dakota v. Wayfair** (2018). Thresholds
  vary by state, and many states tax SaaS and digital products. There is no
  single national rule.

**Fix** Two things to get right while the volume is small:
1. Turn on automatic tax in your payment provider and store evidence of the
   customer's location with every transaction. Stripe:
   `automatic_tax: { enabled: true }`, plus `tax_id_collection` for B2B.
2. Decide whether you are the **seller of record**. A merchant-of-record
   platform (Paddle, Lemon Squeezy, Polar, Gumroad) takes on the VAT and
   sales-tax registration and remittance. Raw Stripe does not — that stays with
   you.

Then confirm with an accountant. This is the one item on the list where a
professional is cheaper than the alternative, and the mess compounds monthly.

---

## 16. `third-party-licences` — code, fonts, images, model terms

**What** Whether you have the right to ship everything you shipped.

**Applies** always. You almost certainly included someone else's work.

**Citation** Copyright, plus the terms of each individual licence. The specific
traps: **copyleft** terms (GPL, AGPL, SSPL) that can reach your own source —
AGPL in a hosted web app is the one that surprises people, because network use
triggers the source-provision obligation; **font EULAs**, where a desktop
licence usually does not permit `@font-face` webfont embedding; **stock image
and icon licences** that forbid redistribution or require attribution; and
**model provider terms** governing what you may do with generated output.

**Verify by hand**
```bash
npx license-checker-rspack --summary        # or: npm ls --all
```
Look for GPL / AGPL / SSPL / CC-BY-NC / "commercial licence required". For every
image, icon set, audio clip and UI template: where did it come from and under
what licence? "Found it on Google Images" is not a licence. Many free UI kit
tiers forbid resale or require a visible credit link.

**Fix** Keep one honest file — `CREDITS.md` or `THIRD-PARTY-NOTICES.md` — listing
each third-party asset, its source and its licence. Ship licence text where the
licence requires it (Google Fonts are OFL or Apache-2.0: keep the licence file
beside the `.woff2` files you self-host). Add your own `LICENSE` file — without
one, nobody may legally reuse your code, including a future collaborator. If you
shipped AI-generated assets, record which model produced them and confirm the
provider's terms permit commercial use.
