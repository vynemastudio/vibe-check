# Sources

Every legal figure, date, case and citation used anywhere in vibe-check — in the
scanner, the skill, the Cursor rule, the `AGENTS.md` snippet, the website and
the README — is listed here with a link.

**Verified:** 15 October 2026. **Scanner version:** 1.0.0.

If you find something out of date or wrong, please
[open an issue](https://github.com/vynemastudio/vibe-check/issues) — accuracy is
the whole point of this project, and a wrong number is worse than no number.

> Educational reference, not legal advice. Primary sources are linked first where
> they exist; secondary sources are law-firm or practitioner analysis, used for
> dates and current status.

---

## Things we deliberately do **not** claim

Worth stating up front, because these are the figures that circulate in
AI-generated compliance checklists and are wrong:

- **"Missing a DMCA agent is a $150,000 fine."** No. Failing to designate an
  agent is not a penalty at all. The consequence is losing the **17 U.S.C.
  §512(c)** safe harbour, so ordinary copyright claims over user uploads can be
  brought against you directly. The $150,000 figure is the ceiling for statutory
  damages per work for *wilful infringement* in a successful suit — a different
  thing, and not a consequence of the missing registration.
- **"COPPA requires every site to have an age gate."** No. COPPA applies only
  where the service is directed to children under 13, or where the operator has
  actual knowledge of collecting personal information from an under-13 user.
- **"GDPR fines are €20 million for using Google Fonts."** No. The Munich case
  awarded **€100** in damages to one plaintiff. GDPR's administrative fine
  ceilings are a separate regime applied by supervisory authorities on very
  different facts.
- **"The €10,000 EU VAT threshold means you can ignore VAT until then."** Only
  if you are **established in the EU**. A non-EU seller has no such threshold and
  registers from the first B2C sale.
- **"CIPA claims are dead after SB 690."** No. SB 690 removed the *private*
  right of action only for **§638.51** pen-register/trap-and-trace claims about
  website and app activity. §631 and §632 claims remain available to private
  plaintiffs.

---

## 1. GDPR and Google Fonts

**Claim:** On 20 January 2022 the Landgericht München I, case **3 O 17493/20**,
held that embedding Google Fonts remotely without consent unlawfully transmitted
the visitor's IP address to Google, and awarded **€100** in damages plus an
injunction.

- Judgment discussion (German): [LHR Rechtsanwälte — *LG München zur Einbindung von Google Fonts ohne Einwilligung*](https://www.lhr-law.de/magazin/datenschutzrecht/google-fonts/)
- Judgment summary (German): [at.legal — *LG München, Urteil vom 20. Januar 2022, 3 O 17493/20*](https://www.at.legal/rechtsprechung/lg-muenchen-urteil-vom-20-januar-2022-3-o-17493-20)
- Analysis (German): [Forge12 — *Google Fonts verstößt gegen die DSGVO*](https://www.forge12.com/de/blog/google-fonts-verstoesst-gegen-die-dsgvo-lg-muenchen-20-01-2022)
- Analysis (English): [Aigner Business Solutions — *Damages due to unlawful integration of Google Fonts*](https://aigner-business-solutions.com/en/blog/damages-due-to-unlawful-integration-of-google-fonts-guide-beyond-the-individual-case/)
- Context on what the rulings did and did not say: [Packetra — *Google Fonts and GDPR: What the Rulings Said*](https://packetra.com/articles/google-fonts-gdpr)

**Note on weight:** this is a single first-instance German judgment, not EU-wide
law. We cite it because the reasoning (no lawful basis for disclosing an IP to a
third party when the font renders fine from your own server) has been followed
elsewhere and drove a large wave of German warning letters — not because it
binds anyone outside that case.

---

## 2. ePrivacy / cookie and tracker consent

**Claim:** ePrivacy Directive 2002/58/EC **Art. 5(3)** requires prior informed
consent before storing or accessing information on a user's device, for anything
not strictly necessary — including analytics cookies. GDPR supplies the consent
standard.

- Primary text: [ePrivacy Directive 2002/58/EC, Art. 5](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32002L0058)
- EDPB Guidelines 2/2023 on the technical scope of Art. 5(3), which read it
  broadly enough to cover tracking beyond cookies:
  [EDPB guidelines](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en) ·
  [Hunton analysis](https://www.hunton.com/privacy-and-cybersecurity-law-blog/edpb-publishes-guidelines-to-clarify-scope-of-eu-cookie-notice-and-consent-requirements) ·
  [Bird & Bird analysis](https://www.twobirds.com/en/insights/2023/global/draft-guidelines-on-the-scope-of-cookie-rules-edpbs-expansive-interpretation)
- Consent standard (pre-ticked boxes are not consent): [*Planet49*, CJEU C-673/17](https://en.wikipedia.org/wiki/German_Federation_of_Consumer_Organisations_v_Planet49_GmbH)
- Analytics specifically: [CookieYes — *Do you need consent for analytics cookies?*](https://www.cookieyes.com/knowledge-base/cookie-consent/do-you-need-consent-for-analytics-cookies/)

---

## 3. CIPA — session replay, pixels and chat wiretapping claims

**Claim:** **Cal. Penal Code §637.2** gives a private right of action with
statutory damages of **$5,000 per violation** or three times actual damages,
whichever is greater, with no proof of harm required. **SB 690**, signed in 2026
and effective **1 January 2027**, removes the private right of action for
**§638.51** pen-register/trap-and-trace claims arising from website, online
application and mobile application activity — those become Attorney
General-only. **§631** (wiretapping) and **§632** (confidential recording) are
unchanged and remain available to private plaintiffs.

- Primary text: [Cal. Penal Code §637.2](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=637.2&lawCode=PEN)
- SB 690 signed, scope and effective date: [DLA Piper](https://www.dlapiper.com/en-us/insights/publications/2026/10/california-governor-newsom-signs-sb-690) · [Stinson](https://www.stinson.com/newsroom-publications-california-bill-limiting-cipa-claims-becomes-law) · [K&L Gates](https://www.klgates.com/thought-leadership/California-Narrows-CIPA-Litigation-SB-690-Ends-Pen-Register-and-Trap-and-Trace-Claims-10-8-2026)
- What survives SB 690 (§631/§632): [Baker Donelson — *SB 690 and the Narrowing of CIPA: … What It Leaves Behind*](https://www.bakerdonelson.com/sb-690-and-the-narrowing-of-cipa-what-californias-pen-register-carve-out-does-and-what-it-leaves-behind) · [Fenwick](https://www.fenwick.com/insights/publications/california-legislature-passes-sb-690-narrowing-private-rights-action-under)
- Session replay as a litigation target: [Kolmogorov Law](https://www.kolmogorovlaw.com/california-invasion-of-privacy-act-cipa-business-lawsuits) · [Usercentrics — CIPA overview](https://usercentrics.com/us/knowledge-hub/california-invasion-of-privacy-act-cipa/)

---

## 4. Secrets in client code

No single statute. The consequences cited are:

- GDPR **Art. 32** (security of processing) and **Art. 33** (72-hour breach
  notification): [Art. 32](https://gdpr-info.eu/art-32-gdpr/) · [Art. 33](https://gdpr-info.eu/art-33-gdpr/)
- Firebase Web API keys are public by design — this is why vibe-check never
  reports an `AIza…` key as a leak:
  [Firebase docs — *Learn about using and managing API keys*](https://firebase.google.com/docs/projects/api-keys)
- Supabase: the anon key is public; RLS is the protection:
  [Supabase — *Understanding API keys*](https://supabase.com/docs/guides/api/api-keys)

---

## 5. Open database rules

No statute of its own; breach duties follow. Vendor guidance:

- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Security Advisor / production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Firebase — Security Rules](https://firebase.google.com/docs/rules)

---

## 6. CalOPPA — privacy policy

**Claim:** Cal. Bus. & Prof. Code **§22575 et seq.** requires a conspicuously
posted privacy policy with specified contents; an operator violates it only by
failing to post within **30 days** of being notified of non-compliance, with
penalties then up to **$2,500 per violation** through the Unfair Competition Law. (Separately,
where the CCPA applies, its fines are up to **$2,663 / $7,988** per violation /
intentional violation; see §7.)

- Primary text: [CalOPPA, Cal. B&P Code div. 8, ch. 22](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=8.&chapter=22.&lawCode=BPC)
- Overview: [Consumer Federation of California — CalOPPA](https://consumercal.org/about-cfc/cfc-education-foundation/california-online-privacy-protection-act-caloppa-3/) · [CookieYes guide](https://www.cookieyes.com/blog/caloppa/) · [Termly guide](https://termly.io/resources/articles/caloppa/)
- GDPR transparency duties for EU users: [Art. 13](https://gdpr-info.eu/art-13-gdpr/) · [Art. 14](https://gdpr-info.eu/art-14-gdpr/)

---

## 7. CCPA / CPRA — "Do Not Sell or Share"

**Claim:** Thresholds (any one of): gross annual revenue over **$26,625,000** (CPI-adjusted from 1 Jan 2025);
buying, selling or sharing the personal information of **100,000 or more**
California consumers or households in a year; or deriving **50% or more** of
annual revenue from selling personal information. Businesses that sell or share
must provide a clear and conspicuous opt-out link. "Sharing" expressly covers
disclosure for cross-context behavioural advertising. Administrative fines from
1 Jan 2025: up to **$2,663 per violation** and **$7,988 per intentional
violation** or violation involving known minors under 16.

- CPI-adjusted fines and thresholds: [CPPA — CPI adjustments](https://cppa.ca.gov/regulations/cpi_adjustment.html)

- Official: [California Attorney General — CCPA](https://oag.ca.gov/privacy/ccpa)
- Primary text: [Cal. Civ. Code §1798.135](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.135&lawCode=CIV)
- Regulator: [California Privacy Protection Agency](https://cppa.ca.gov/)
- Thresholds and the opt-out link: [Ketch](https://www.ketch.com/regulatory-compliance/california-consumer-privacy-act-ccpa) · [Cookiebot — CCPA vs CPRA](https://www.cookiebot.com/en/ccpa-vs-cpra-differences-guide/) · [Mandatly — *Do You Need an Opt-Out Link?*](https://mandatly.com/knowledge-base/do-you-need-opt-out-link)
- Global Privacy Control: [globalprivacycontrol.org](https://globalprivacycontrol.org/)

---

## 8. DMCA designated agent

**Claim:** **17 U.S.C. §512(c)(2)** requires designating an agent as a threshold
condition for the §512(c) safe harbour. Registration is through the online
directory at `dmca.copyright.gov`; paper designations no longer count; the fee is
**$6** per designation, amendment or resubmission.

- Official FAQ, including the fee and the online-only requirement:
  [U.S. Copyright Office — DMCA Directory FAQs](https://www.copyright.gov/dmca-directory/faq.html)
- Register here: [dmca.copyright.gov](https://dmca.copyright.gov)
- Primary text: [17 U.S.C. §512](https://www.law.cornell.edu/uscode/text/17/512)
- Threshold nature of the requirement: [BrownWinick — *What is a Designated DMCA Agent, and Why You Need One*](https://www.brownwinick.com/insights/what-is-a-designated-dmca-agent-and-why-you-need-one)

---

## 9. COPPA

**Claim:** COPPA applies only where a service is directed to children under 13,
or the operator has actual knowledge of collecting personal information from an
under-13 child. The FTC published amendments to the COPPA Rule on **22 April
2025**, effective **23 June 2025**, with full compliance required by **22 April
2026**. Civil penalty: up to **$53,088 per violation** (FTC Act §5(m)(1)(A);
16 C.F.R. §1.98, from 17 Jan 2025; no 2026 adjustment).

- Penalty figure: [eCFR 16 CFR 1.98](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-A/part-1/subpart-L) · [FTC 2026 notice](https://www.federalregister.gov/documents/2026/09/15/2026-18853/civil-penalty-inflation-adjustments)

- Primary text: [15 U.S.C. §§6501–6506](https://www.law.cornell.edu/uscode/text/15/chapter-91) · [16 C.F.R. Part 312](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312)
- Official rulemaking record: [FTC — *16 CFR Part 312: COPPA Final Rule Amendments*](https://www.ftc.gov/legal-library/browse/federal-register-notices/16-cfr-part-312-coppa-final-rule-amendments)
- Federal Register as published, 22 April 2025: [90 FR, No. 76](https://www.govinfo.gov/content/pkg/FR-2025-04-22/pdf/2025-05904.pdf)
- Compliance deadline of 22 April 2026: [Perkins Coie](https://perkinscoie.com/insights/blog/ftc-finally-publishes-amended-coppa-rule-compliance-deadlines-set) · [Latham & Watkins](https://www.lw.com/en/insights/ftc-publishes-updates-to-coppa-rule) · [Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2025/04/ftc-announces-significant-amendments-to-coppa)
- FTC business guidance: [Complying with COPPA: Frequently Asked Questions](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)

---

## 10. CAN-SPAM

**Claim:** CAN-SPAM Act **15 U.S.C. §7704**, FTC Rule **16 C.F.R. Part 316**.
Maximum civil penalty is **$53,088 per non-compliant email**, in force since
**17 January 2025** (raised from $51,744) and **unchanged for 2026** because the
government-wide inflation adjustment for 2026 was cancelled.

- Primary text: [15 U.S.C. §7704](https://www.law.cornell.edu/uscode/text/15/7704) · [16 C.F.R. Part 316](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-316)
- The penalty table itself: [16 C.F.R. §1.98 — Adjustment of civil monetary penalty amounts](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-A/part-1/subpart-L/section-1.98)
- The January 2025 adjustment to $53,088: [Federal Register, 90 FR No. 11, 17 Jan 2025](https://www.govinfo.gov/content/pkg/FR-2025-01-17/pdf/2025-01361.pdf)
- No adjustment for 2026 (so the 2025 figure still applies): [Federal Register — *No Adjustment to Civil Monetary Penalty Amounts*](https://www.federalregister.gov/documents/2026/07/07/2026-13629/no-adjustment-to-civil-monetary-penalty-amounts)
- Practitioner confirmation of the frozen figure: [emailexpert](https://emailexpert.com/can-spam-penalties-frozen-at-53088-per-email-after-the-shutdown-cancels-this-years-rise/)
- FTC business guidance: [CAN-SPAM Act: A Compliance Guide for Business](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
- EU/UK are stricter (consent-based): [ePrivacy Directive Art. 13](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32002L0058) · [UK PECR](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/)

---

## 11. Automatic renewals

**Claim:** California ARL, **Cal. B&P Code §17600 et seq.**, amended by
**AB 2863** (signed 24 September 2024), applying to contracts entered, amended
or extended on or after **1 July 2025**, adding reminder duties including an
annual reminder. **§17603** deems goods sent without the affirmative consent
required by §17602 an **unconditional gift** the consumer may keep without
paying, including shipping. Federal **ROSCA**, 15 U.S.C. §8403, still applies;
the FTC's **Negative Option Rule ("click-to-cancel") was vacated** by the Eighth
Circuit on **8 July 2025** on procedural grounds, and the FTC restarted the
rulemaking in 2026.

- Primary text: [Cal. B&P Code §§17600–17606](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=7.&chapter=1.&part=3.&lawCode=BPC&article=9.) · [§17603 (Justia, 2025 code)](https://law.justia.com/codes/california/code-bpc/division-7/part-3/chapter-1/article-9/section-17603/)
- AB 2863, what it changed and the 1 July 2025 applicability: [Wilson Sonsini — *California Amends Automatic Renewal Law (Again)*](https://www.wsgr.com/en/insights/california-amends-automatic-renewal-law-again.html) · [AB 2863 committee analysis](https://apcp.assembly.ca.gov/system/files/2024-04/ab-2863-schiavo-apcp-analysis.pdf)
- ROSCA: [15 U.S.C. §8403](https://www.law.cornell.edu/uscode/text/15/8403)
- Click-to-cancel vacated: [Sidley](https://www.sidley.com/en/insights/newsupdates/2025/07/us-ftc-click-to-cancel-rule-struck-down) · [Cooley](https://www.cooley.com/news/insight/2025/2025-07-11-click-to-cancel-just-got-cancelled-eighth-circuit-vacates-entirety-of-ftcs-negative-option-rule) · [DLA Piper](https://www.dlapiper.com/en/insights/publications/2025/07/ftcs-click-to-cancel-rule-voided)
- Rulemaking restarted, ROSCA enforcement continuing: [Gibson Dunn](https://www.gibsondunn.com/ftc-restarts-negative-option-rulemaking-after-eighth-circuit-vacatur-enforcement-under-rosca-continues/) · [Goodwin (Feb 2026)](https://www.goodwinlaw.com/en/insights/publications/2026/02/alerts-practices-ba-ftcs-click-to-cancel-rule-gets-new-life)
- Class-action landscape: [Jeffer Mangels (Mar 2026)](https://articles.jeffer.com/2026/03/11/californias-automatic-renewal-laws-how-to-defend-a-growing-wave-of-class-action-lawsuits-targeting-subscription-based-businesses/)

---

## 12. Accessibility

**Claim:** The current W3C Recommendation is **WCAG 2.2**. DOJ's 2024 ADA
**Title II** rule set WCAG 2.1 Level AA for state and local government; on
**20 April 2026** DOJ issued an interim final rule extending compliance to
**26 April 2027** (large entities) and **26 April 2028** (smaller entities and
special districts). The **European Accessibility Act** has required accessible
consumer e-commerce services since **28 June 2025** via **EN 301 549** (WCAG 2.1
AA for web content); **micro-enterprises** providing services — fewer than 10
employees and annual turnover or balance sheet total of **€2 million** or less —
are exempt from the service requirements.

- Standard: [WCAG 2.2 (W3C Recommendation)](https://www.w3.org/TR/WCAG22/) · [How to Meet WCAG (quick reference)](https://www.w3.org/WAI/WCAG22/quickref/)
- ADA Title II rule: [ada.gov — Fact sheet on the web and mobile app accessibility rule](https://www.ada.gov/resources/2024-03-08-web-rule/)
- April 2026 deadline extension: [Consumer Financial Services Law Monitor](https://www.consumerfinancialserviceslawmonitor.com/2026/04/doj-extends-title-ii-ada-web-accessibility-rule-compliance-deadlines-for-state-and-local-governments/) · [Archer](https://www.archerlaw.com/en/blogs/your-campus-counsel/doj-extends-ada-web-accessibility-deadline-to-april-2027) · [titleii.org summary](https://titleii.org/title-ii-updates)
- European Accessibility Act: [Directive (EU) 2019/882](https://eur-lex.europa.eu/eli/dir/2019/882/oj) · [EN 301 549](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/)
- EAA e-commerce scope and micro-enterprise exemption: [accessible.org](https://accessible.org/eaa-ecommerce-services-requirements/) · [Going Stellar — who is exempt](https://goingstellar.ro/research/european-accessibility-act-online-stores/)
- Testing tools: [axe-core CLI](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/cli) · [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/)

---

## 13. AI disclosure

**Claim:** EU AI Act **Art. 50** (Regulation (EU) 2024/1689) transparency
obligations apply from **2 August 2026** and were **not** postponed by the
Digital AI Omnibus, Regulation (EU) **2026/1744** (in force 27 July 2026), which
moved Annex III high-risk obligations to **2 December 2027** and Annex I to
**2 August 2028**. The Art. 50(2) machine-readable marking duty had a grace
period to **2 December 2026** for systems already on the market before 2 August
2026. Penalties for Art. 50 non-compliance reach **€15 million or 3% of
worldwide annual turnover**, whichever is higher. California's B.O.T. Act,
**Cal. B&P Code §17941**, operative since 1 July 2019, makes it unlawful to use
a bot to mislead about its artificial identity in order to incentivise a
commercial transaction or influence a vote; **disclosure is the safe harbour**,
and enforcement runs through the UCL with civil penalties up to **$2,500 per
violation**.

- Primary text: [EU AI Act Art. 50](https://artificialintelligenceact.eu/article/50/) · [Regulation (EU) 2024/1689 (full text)](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- Art. 50 in force from 2 Aug 2026 and not delayed: [Usercentrics — *EU AI Act Deal: Digital Omnibus Now in Force*](https://usercentrics.com/knowledge-hub/eu-ai-act-high-risk-delay-article-50-transparency-consent/) · [hard2bit — *AI Act Article 50: AI transparency from 2 August 2026*](https://hard2bit.com/en/blog/ai-act-article-50-ai-transparency-chatbots-deepfakes/)
- Digital Omnibus deadline changes: [Cooley CDP](https://cdp.cooley.com/digital-ai-omnibus-delays-key-deadlines-introduces-new-rules/) · [ActuIA — obligations in force under Omnibus 2026/1744](https://www.actuia.com/en/news/ai-act-obligations-in-force-and-delays-under-omnibus-2026-1744/)
- California SB 1001 / §17941: [SB 1001 bill text](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=201720180SB1001) · [Cal. B&P Code §17941](https://california.public.law/codes/business_and_professions_code_section_17941)
- Content provenance marking: [C2PA specification](https://c2pa.org/specifications/)

---

## 14. Refunds and the EU right of withdrawal

**Claim:** EU **Consumer Rights Directive 2011/83/EU** gives consumers a
**14-day** right of withdrawal on distance sales. For digital content delivered
immediately, the right is lost only with the consumer's express prior consent to
begin **and** their acknowledgement that they thereby lose it.

- Primary text: [Directive 2011/83/EU](https://eur-lex.europa.eu/eli/dir/2011/83/oj) — Art. 9 (withdrawal period), Art. 16(m) (digital content exception)
- Official consumer-facing summary: [Your Europe — Guarantees and returns](https://europa.eu/youreurope/citizens/consumers/shopping/guarantees-returns/index_en.htm)
- FTC Act §5: [15 U.S.C. §45](https://www.law.cornell.edu/uscode/text/15/45)

---

## 15. Sales tax and VAT on digital goods

**Claim:** For EU B2C digital services, VAT is due in the customer's member
state and declared via the **One Stop Shop**. The **€10,000** annual
cross-border threshold is available only to sellers **established in the EU**; a
non-EU seller registers from the first B2C sale via the non-Union OSS. In the
US, economic nexus follows **South Dakota v. Wayfair** (2018), with thresholds
varying by state and many states taxing SaaS.

- Official: [European Commission — VAT One Stop Shop](https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en)
- The €10,000 threshold and place-of-supply mechanics: [vatcalc — EU VAT on B2C digital services](https://www.vatcalc.com/eu/eu-vat-on-b2c-digital-services-after-1-july-2021-moss-oss/) · [1stopVAT — place of supply for EU B2C distance sales](https://1stopvat.com/vat-cross-border-eu-distance-sales-rules-strategies/)
- US economic nexus: [*South Dakota v. Wayfair, Inc.*, 585 U.S. 162 (2018)](https://supreme.justia.com/cases/federal/us/585/17-494/)
- Implementation: [Stripe Tax docs](https://docs.stripe.com/tax)

---

## 16. Third-party licences

- [SPDX licence list](https://spdx.org/licenses/) — canonical identifiers
- [GNU AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.en.html) — the network-use clause that surprises hosted apps
- [SIL Open Font License 1.1](https://openfontlicense.org/) — what most Google Fonts use
- [Google Fonts licensing FAQ](https://developers.google.com/fonts/faq#what_does_it_mean_that_the_fonts_are_open_source)
- [Choose a License](https://choosealicense.com/) — for picking your own

---

## Tooling formats referenced by this project

- [Claude Code — Agent Skills (`SKILL.md`)](https://code.claude.com/docs/en/skills)
- [Claude Code — Marketplace reference (`marketplace.json`)](https://code.claude.com/docs/en/plugins/marketplace-reference)
- [Claude Code — Plugin manifest reference (`plugin.json`)](https://code.claude.com/docs/en/plugins/manifest-reference)
- [Agent Skills overview (platform docs)](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Cursor — project rules (`.cursor/rules/*.mdc`)](https://cursor.com/docs/context/rules)
- [AGENTS.md convention](https://agents.md/)

---

## Quick reference: verified figures (checked 15 Oct 2026)

| Claim used | Verified figure / wording | Source |
|---|---|---|
| Google Fonts, Munich | LG München I, 20 Jan 2022, case 3 O 17493/20: loading Google Fonts dynamically (IP sent to Google) without consent violated the visitor's rights under GDPR; **€100 damages** (plus interest) to the one claimant and an injunction. | [gesetze-bayern.de](https://www.gesetze-bayern.de/Content/Document/Y-300-Z-BECKRS-B-2022-N-612) · [rewis.io](https://rewis.io/urteile/urteil/lhm-20-01-2022-3-o-1749320/) |
| Google Fonts, mass claims curbed | LG München I, 30 Mar 2023, 4 O 13063/22: no claim where the "visitor" used a crawler / did not personally visit. | [gesetze-bayern.de](https://www.gesetze-bayern.de/Content/Document/Y-300-Z-BECKRS-B-2023-N-6354) |
| Session replay / CIPA | Cal. Penal Code §637.2(a): greater of **$5,000 per violation** or 3× actual damages; no actual damages required. Ninth Circuit 2025 (Thomas v. Papa John's) affirmed dismissal of a direct §631 claim; courts split on vendor/aiding theories. | [leginfo §637.2](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=637.2) · [NatLawReview](https://natlawreview.com/article/ninth-circuit-scrutinizes-california-wiretap-law-will-website-chat-and-analytics) |
| Auto-renew / ARL | B&P §17603: goods/products sent under an auto-renewal without the affirmative consent required by §17602 are **"deemed an unconditional gift"**. §17602(d) (AB 2863, contracts from 1 Jul 2025): online sign-ups must be cancellable online, at will. | [§17603](https://california.public.law/codes/business_and_professions_code_section_17603) · [§17602](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=17602) · [CA AG alert](https://oag.ca.gov/news/press-releases/attorney-general-bonta-issues-consumer-alert-california%E2%80%99s-automatic-renewal-law) |
| COPPA & CAN-SPAM | FTC Act §5(m)(1)(A) civil penalty **$53,088 per violation** (16 CFR 1.98, from 17 Jan 2025). **No 2026 adjustment** (OMB M-26-11; FTC notice 15 Sep 2026). | [eCFR 16 CFR 1.98](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-A/part-1/subpart-L) · [FTC 2026 notice](https://www.federalregister.gov/documents/2026/09/15/2026-18853/civil-penalty-inflation-adjustments) |
| DMCA agent | **$6** per designation/amendment/resubmission; expires after **3 years** unless renewed; required for §512(c) safe harbor. Not registering is not itself fined — you lose the safe harbor. Statutory damages for infringement: $750–$30,000 per work, up to $150,000 if willful (17 U.S.C. §504(c)). | [Copyright Office FAQ](https://www.copyright.gov/dmca-directory/faq.html) · [37 CFR 201.38](https://www.law.cornell.edu/cfr/text/37/201.38) · [17 U.S.C. §504](https://www.law.cornell.edu/uscode/text/17/504) |
| CCPA | From 1 Jan 2025: fines up to **$2,663 per violation / $7,988 per intentional violation** or involving known under-16s; "business" revenue threshold **$26,625,000**. | [CPPA thresholds](https://cppa.ca.gov/regulations/cpi_adjustment.html) |
| EU AI Act | Art. 50 transparency (tell users they're talking to AI; label synthetic content) applies from **2 Aug 2026**; not delayed by the Digital Omnibus. | [AI Act Service Desk](https://ai-act-service-desk.ec.europa.eu/en/ai-act/faq/when-does-enforcement-start) · [EC FAQ Art. 50](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act) |
| CalOPPA | Bus. & Prof. Code §22575: commercial sites collecting PII from California residents must conspicuously post a privacy policy. | [leginfo §22575](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=22575) |

## Corrections to figures in the reference reel and the Gemini notes
- **DMCA "$150,000 fine per image" — wrong.** There's no fine for not registering a $6 agent. You lose the safe harbor, so you can be sued for users' infringement; $150,000 per work is the *maximum for willful* infringement.
- **COPPA / CAN-SPAM "~$53,000+" / "$51,744"** → the current figure is exactly **$53,088** (2025 level, still in force for 2026).
- **Google Fonts "€100 per visitor"** → overstated. One court awarded €100 to **one** claimant; a 2023 Munich ruling rejected mass crawler claims.
- **CIPA "$5,000 per session"** → the statute says $5,000 **per violation**. Plaintiffs argue each session is a violation; courts are split and many cases are dismissed.
- **ARL "unconditional gift"** → accurate, but conditional: it applies when the auto-renewal was charged without the required clear disclosure and affirmative consent.
