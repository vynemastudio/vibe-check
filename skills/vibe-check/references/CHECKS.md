# Vibe Check: the 16 checks

Detailed criteria, search hints, verified figures and fixes. Figures are verified in [SOURCES.md](SOURCES.md).


### VC01 Google Fonts loaded from Google's servers (GDPR)
- Search: `rg -n "fonts\.googleapis\.com|fonts\.gstatic\.com"`; also `next/font/google` (OK: Next self-hosts at build time), `@import url(.*googleapis`.
- FAIL if any page loads fonts from `fonts.googleapis.com` / `fonts.gstatic.com` at runtime without prior consent.
- Why: each page view sends the visitor's IP address to Google. On 20 Jan 2022 the Munich Regional Court (LG München I, 3 O 17493/20) held this violated GDPR without consent and ordered the site operator to pay **€100 damages to the one visitor who sued**, plus an injunction. Applies if you have visitors in the EU/EEA. (Later Munich ruling 4 O 13063/22, 2023, rejected mass "crawler" claims: the risk is real but modest.)
- Fix: self-host the `.woff2` files (e.g. `@fontsource/*` packages, `next/font/google`, or download via google-webfonts-helper) and serve `@font-face` from your own domain. Remove the `<link>`/`@import` and any `preconnect` to Google font hosts.

### VC02 Session replay / analytics before consent (CIPA, GDPR/ePrivacy)
- Search: `rg -n -i "hotjar|fullstory|logrocket|clarity\.ms|mouseflow|smartlook|posthog.*(session_recording|disable_session_recording)|rrweb|record\(|openreplay|heap|mixpanel|segment|gtag|googletagmanager|fbq\("`.
- FAIL if a session-recording or keystroke-capturing script initialises on page load before the user has consented (no consent gate wrapping it), or records input fields unmasked.
- Why: plaintiffs have sued under the California Invasion of Privacy Act (Cal. Penal Code §631) arguing session replay is wiretapping; §637.2 provides statutory damages of **$5,000 per violation** (or 3× actual damages). Courts are split and many cases are dismissed: but defence is expensive. In the EU, non-essential trackers need prior consent (ePrivacy Art. 5(3)).
- Fix: load the script only after an explicit opt-in (consent banner with Accept/Reject of equal prominence); mask all inputs (`maskAllInputs: true` or vendor equivalent); never record password/payment fields; disclose recording in the privacy policy.

### VC03 Auto-renewing subscription without clear terms or online cancel (California ARL)
- Search: `rg -n -i "subscription|recurring|interval|renew|trial|stripe|checkout|paddle|lemonsqueezy|price_id|mode: ?['\"]subscription"`; inspect the checkout UI text near the pay button and any cancel/billing-portal flow.
- FAIL if the checkout for a recurring plan does not clearly and conspicuously show, before purchase and near the button: that it auto-renews, the price and billing frequency, the renewal term, and how to cancel; or there is no affirmative consent (e.g. checkbox/clear button text); or there is no way to cancel online. NEEDS REVIEW if terms are only in a linked ToS or in small/low-contrast text.
- Why: under California's Automatic Renewal Law (Bus. & Prof. Code §17600 et seq.), if a business charges for an auto-renewal without the required clear disclosure and affirmative consent, goods/services provided can be **deemed an unconditional gift** to the consumer (§17603). Since 1 July 2025 (AB 2863), consumers who signed up online must be able to cancel online, at will (§17602(d)). Applies if you sell subscriptions to California consumers. The FTC also polices negative-option marketing under ROSCA.
- Fix: put renewal terms right above the button ("Renews automatically at $19/month until you cancel. Cancel anytime in Settings → Billing."), require an unticked consent checkbox or explicit button text, email an acknowledgment with terms and cancel instructions, and add a one-click online cancel (e.g. Stripe Customer Portal).

### VC04 Age gate / children's data (COPPA)
- Search: signup forms, `birth|dob|age|kids|children|school|student|teen|grade`, marketing copy.
- Only relevant if the app is **directed to children under 13** (content, audience, characters) or you have **actual knowledge** you collect personal info from under-13s. A generic adult/B2B tool without a birthdate field is not automatically in breach → NEEDS REVIEW at most, with the question asked.
- FAIL if child-directed (or has kid signups) and collects personal info with no verifiable parental consent flow.
- Why: FTC civil penalties up to **$53,088 per violation** (16 CFR 1.98; 2025 level, unchanged for 2026).
- Fix: if child-directed, implement verifiable parental consent and data minimisation or redesign for 13+. If general audience, state "13+" in Terms and delete data if you learn a user is under 13. A neutral age screen helps.

### VC05 Commercial email without unsubscribe or postal address (CAN-SPAM)
- Search: `rg -n -i "sendgrid|resend|postmark|mailgun|nodemailer|ses|mailchimp|loops|sendEmail|send_mail"`; open templates for marketing/newsletters.
- FAIL if marketing/commercial emails lack a working unsubscribe link or a valid physical postal address (PO box / registered virtual address OK). Transactional emails (receipts, password resets) are mostly exempt.
- Why: CAN-SPAM (15 U.S.C. §7704): FTC civil penalties up to **$53,088 per email** in violation. Opt-outs must be honoured within 10 business days. Missing unsubscribe also wrecks deliverability (Gmail/Yahoo bulk-sender rules require one-click unsubscribe).
- Fix: add footer with unsubscribe link + `List-Unsubscribe` / `List-Unsubscribe-Post` headers, and a postal address; suppress unsubscribed users.

### VC06 User uploads without a DMCA designated agent
- Search: `rg -n -i "upload|multer|formidable|presigned|putObject|storage\.from|uploadthing|cloudinary|avatar|attachment"`.
- If users can upload/post content: NEEDS REVIEW unless the repo/legal pages show a DMCA policy with a designated agent.
- Why: to qualify for the DMCA §512(c) safe harbor for user-uploaded content, you must designate an agent with the U.S. Copyright Office (**$6 fee**, renew every 3 years) and post the agent's contact on your site. Without it you **lose the safe harbor**: you can then be held liable for users' infringement under ordinary copyright law (statutory damages $750–$30,000 per work, up to $150,000 if willful, 17 U.S.C. §504(c)). There is no "fine" for not registering.
- Fix: register at copyright.gov/dmca-directory, add `/dmca` page with agent contact and takedown process, implement a repeat-infringer policy.

### VC07 Secrets / API keys in frontend code
- Search: `rg -n "sk_live_|sk_test_|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|-----BEGIN .*PRIVATE KEY|service_role|xox[bp]-|ghp_[A-Za-z0-9]{36}"`; check `NEXT_PUBLIC_*`, `VITE_*`, `REACT_APP_*` variables holding secret keys; check `.env` committed (`git ls-files | rg "\.env"`).
- FAIL if a secret (server key, OpenAI/Stripe secret, Supabase `service_role`) is shipped to the browser or committed. Publishable keys (Stripe `pk_`, Firebase web config, Supabase anon key) are OK *if* backend rules restrict access.
- Why: leaked keys get abused within hours (bills, data theft); a breach may trigger notification duties (all US states, GDPR Art. 33: 72 hours).
- Fix: move calls server-side, rotate the leaked key now, add `.env*` to `.gitignore`, add a secret scanner (gitleaks) to CI.

### VC08 Exposed database rules
- Search: `firestore.rules`, `database.rules.json`, `storage.rules` for `allow read, write: if true` / `".read": true`; Supabase tables without `enable row level security`; public S3 buckets; Mongo/Postgres URLs in client code.
- FAIL if any user-data collection is world-readable or writable.
- Fix: require auth and ownership (`request.auth.uid == resource.data.owner`), enable RLS with per-user policies, test with an unauthenticated client.

### VC09 Privacy policy and terms (CalOPPA, GDPR, app stores)
- Search for routes/pages: `privacy`, `terms`, `tos`, footer links.
- FAIL if the app collects personal info (accounts, emails, analytics) and has no reachable privacy policy. NEEDS REVIEW if it exists but omits trackers/processors actually found in code.
- Why: CalOPPA (Cal. Bus. & Prof. Code §22575) requires a conspicuously posted privacy policy for commercial sites collecting personally identifiable info from California residents; GDPR Art. 13 requires notice; Apple/Google stores require one.
- Fix: add `/privacy` and `/terms`, linked in footer and signup; list data collected, purposes, processors (from the code scan), retention, rights, contact.

### VC10 Cookie / tracker consent (EU/UK)
- FAIL if non-essential cookies/trackers (analytics, ads pixels, replay) load before consent and the app has EU/UK visitors. PASS if loading is gated on opt-in with a reject option equally easy.
- Fix: consent manager; block scripts until opt-in; record consent.

### VC11 CCPA "Do Not Sell or Share" link (where applicable)
- Only applies if the business meets CCPA thresholds (e.g. annual gross revenue over **$26,625,000** (2025 adjusted), or buys/sells/shares personal info of 100,000+ CA consumers/households, or earns 50%+ of revenue from selling/sharing it) **and** sells or shares personal info (incl. cross-context behavioural ads pixels). Most tiny apps: NEEDS REVIEW, note "likely not applicable yet".
- Why: CPPA/AG fines up to **$2,663 per violation, $7,988 per intentional violation** or involving known under-16s (Civil Code §1798.155, 2025 amounts). Also honour Global Privacy Control signals.
- Fix: footer link "Do Not Sell or Share My Personal Information", GPC support, update privacy policy.

### VC12 Accessibility basics (WCAG 2.1/2.2 AA)
- Search: `<img` without `alt`, icon-only `<button>` without `aria-label`, inputs without `<label>`, `outline: none` without replacement, `user-scalable=no`, low-contrast text tokens, click handlers on `div`.
- FAIL for clear violations found; otherwise NEEDS REVIEW and suggest an axe/Lighthouse run.
- Why: ADA Title III website lawsuits and demand letters in the US; the European Accessibility Act applies to many consumer e-commerce services from 28 June 2025 (micro-enterprises providing services exempt).
- Fix: alt text, labels, focus styles, contrast ≥ 4.5:1, keyboard navigation.

### VC13 AI chatbot / AI content disclosure
- Search: `openai|anthropic|gemini|llm|chat|completion|generateText|ai/react`.
- NEEDS REVIEW / FAIL if users chat with an AI without being told it's AI, or AI-generated media is published without labelling.
- Why: EU AI Act Art. 50 transparency obligations apply from **2 Aug 2026** (tell people they're interacting with AI unless obvious; mark synthetic content). California's BOT Act (Bus. & Prof. Code §17941) bars undisclosed bots used to incentivise a sale or influence a vote. Also check the model provider's usage policies.
- Fix: "You're chatting with an AI assistant" label in the chat UI; label generated images/text; don't let the bot pose as a human.

### VC14 Refund / cancellation policy
- NEEDS REVIEW if paid features exist and no refund policy is linked at checkout. Note: EU/UK consumers have a 14-day withdrawal right for distance sales; for digital content it can be waived only with express consent and acknowledgement before delivery. App stores and payment processors (Stripe, Paddle) require a stated policy.
- Fix: `/refunds` page linked at checkout; for EU digital goods, add the consent + acknowledgement checkbox.

### VC15 Sales tax / VAT on digital sales (note)
- Always informational (NEEDS REVIEW if selling to consumers internationally). EU VAT on digital services is due at the customer's country rate from the first euro of B2C cross-border sales above €10,000/yr EU-wide (OSS scheme); many US states tax SaaS/digital goods after economic-nexus thresholds (often $100,000 sales).
- Fix: use a merchant of record (Paddle, Lemon Squeezy) or enable Stripe Tax; consult an accountant.

### VC16 Open-source, font, image and model licences
- Check `package.json`/lockfiles for GPL/AGPL in distributed or network-served code (`npx license-checker --summary`), fonts with non-web licences, stock/AI images without licence notes, copied code, model terms (e.g. use restrictions).
- NEEDS REVIEW with list; FAIL only for clear issues (e.g. AGPL server code with no source offer, missing required attribution).
- Fix: keep a `THIRD_PARTY_NOTICES` file, swap problematic deps, keep licence receipts for assets.

