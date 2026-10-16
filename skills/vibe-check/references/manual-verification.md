# What a grep cannot see

The scanner reads files. These checks need a browser, a dashboard, or a real
send. Work through them after Step 1, and mark anything you could not reach as
**not checked** rather than PASS.

## In a browser, fresh profile, DevTools open

**Tags before consent** — the highest-value five minutes in this whole list.
Open a new private window, DevTools → Network, hard reload. Before touching the
banner, filter for `google`, `facebook`, `hotjar`, `clarity`, `segment`,
`posthog`. Expect zero. Check Application → Storage for non-essential cookies
and localStorage keys. Then click **Reject** and confirm it is still zero. A
banner whose Reject button does nothing is the most common real-world failure.

**Fonts** — filter Network for `fonts.g`. Zero requests. Fonts arrive via CSS
frameworks and third-party widgets too, so check after the page is fully
interactive, not just on first paint.

**Keyboard** — unplug the mouse, or just commit to not touching it. Tab through
a whole flow: landing → signup → core action → settings → cancel. You need to
reach every control, always see focus, escape every modal, and never get
trapped. Nothing reveals an inaccessible app faster.

**Contrast** — use DevTools' contrast checker on real text, not a swatch.
Body text ≥ 4.5:1, large text and meaningful borders ≥ 3:1. Check hover,
disabled and placeholder states, and dark mode. Placeholder text and disabled
buttons are where this fails most.

**Checkout, as a new customer** — are the renewal terms visible next to the pay
button, without scrolling and without opening the terms? Is consent to the
recurring charge separate and unticked? Then subscribe and try to cancel in the
same medium you signed up in.

**The AI surface** — is it visibly stated in the interface that this is an AI,
at the start and still mid-conversation? Does the bot ever imply it is a person?

**Automated pass** — these catch things eyes miss:
```bash
npx @axe-core/cli http://localhost:3000
npx lighthouse http://localhost:3000 --only-categories=accessibility,best-practices
```

## In your hosted dashboards

**Supabase** — Database → Policies: every table in an exposed schema has RLS
enabled, and no policy is `using (true)` on user data. Run the **Security
Advisor**; it reports RLS-off tables directly. Policies live here, not in the
repo, so the repo cannot prove this either way.

**Firebase** — Rules Playground in the console. Simulate an unauthenticated read
on a user document. It must be denied. `allow read, write: if true` is open to
the internet, and so is a rule gated only on a date that has passed.

**The outside test** — the only one that really settles it:
```bash
curl "https://YOUR_PROJECT.supabase.co/rest/v1/your_table?select=*" \
  -H "apikey: YOUR_ANON_KEY"
```
Rows coming back means anyone can get them.

**Stripe** — is automatic tax on? Is the customer portal enabled so cancellation
is self-serve? Does the product description match what the checkout page claims?

**Your built bundle** — the scanner reads `dist`/`build`/`.next` if they exist,
but they may be stale or absent:
```bash
npm run build
grep -ril "sk_live\|sk-ant\|sk-proj\|AKIA\|service_role" dist build .next 2>/dev/null
```

## Outside the codebase entirely

**DMCA agent** — search the Copyright Office directory at `dmca.copyright.gov`
for the business name. If it is not there, the §512(c) safe harbour is not there
either, whatever the terms page says. Confirm the published details match and the
registration is current.

**Email templates** — send yourself a real send from the production template, not
a preview. Click unsubscribe while logged out. It must work with no login and no
fee. Confirm a physical postal address is in the footer.

**Your privacy policy against reality** — list every third party that actually
receives user data (payment, database, email, analytics, model provider, error
tracking, support widget). Every one should be in the policy. Anything in the
policy that you do not use should come out: a policy that misdescribes your
practice is its own problem under FTC Act §5.

**Who actually uses it** — for the COPPA question, look at your real audience,
not your intended one: analytics age distribution, app store rating, the imagery
in your marketing, your support inbox. Actual knowledge of an under-13 user
starts the clock from the moment you have it.

**Licences** — `npx license-checker-rspack --summary`, then account for every
font, image, icon set and UI template by source and licence.

## The four scope questions

If the repo does not answer these, ask all four in one message. Many findings
change depending on the answers, and asking them one at a time is worse than
reporting under a stated assumption.

1. Do you have EU/UK visitors? (ePrivacy consent, GDPR, EAA accessibility, VAT)
2. Do you have California visitors? (CIPA, CCPA/CPRA, CalOPPA)
3. Can users upload or post content? (DMCA §512)
4. Do you charge money — and is any of it recurring? (ARL/ROSCA, refunds, tax)
