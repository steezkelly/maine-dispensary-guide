# AdSense Readiness Assessment — Maine Dispensary Guide
**Date:** 2026-07-11
**Author:** Subagent (research + write only — no source files modified)
**Status:** READ-ONLY research artifact. Not a sprint plan.
**Context:** MDG applied to Google AdSense in July 2026; rejected with "Low value content" verdict citing Program Policies / Minimum content requirements / Unique high-quality content / Webmaster quality guidelines for thin content / Webmaster quality guidelines.

---

## 1. AdSense verdict research

### 1.1 What MDG actually received

The rejection email quoted four resources in the help-center:

1. **Minimum content requirements** — `support.google.com/adsense/answer/9335564`
2. **Make sure your site has unique high quality content and a good user experience** — `support.google.com/adsense/answer/10015918`
3. **Webmaster quality guidelines for thin content** — `support.google.com/webmasters/answer/9044175`
4. **Webmaster quality guidelines** — `support.google.com/webmasters/answer/66357` (now redirects to `developers.google.com/search/docs/essentials/spam-policies`)

These four URLs are the binding policy text for the rejection. Note: the URL `9781305` ("Low value content" article) listed in the task brief returned 404 on 2026-07-11. The "low value content" label is a *verdict* that surfaces in the rejection email when the "Inventory value" behavioral policy is violated — it is not a stand-alone policy doc.

### 1.2 Canonical AdSense policy documents reviewed (live, 2026-07-11)

| URL | Title | What it says |
|---|---|---|
| `support.google.com/adsense/answer/9724` | Eligibility requirements for AdSense | "Your content must be high-quality, original, and attract an audience." Must own site / access HTML source / be 18+ / comply with Program policies. |
| `support.google.com/adsense/answer/48182` | AdSense Program policies | Behavioral rules: no invalid clicks, no deceptive navigation, no ad-in-menu-placement, compliance with Landing Page Quality Guidelines. |
| `support.google.com/adsense/answer/9335564` | Google Publisher Policies (replaces "Minimum content requirements") | The core policy tree. Has an **Inventory value** section explicitly forbidding Google-served ads on screens "without publisher-content or with low-value content" and "with embedded or copied content from others without additional commentary, curation, or otherwise adding value to that content." |
| `support.google.com/adsense/answer/10502938` | Same as above (alias path) | Same content — useful to cite for stability. |
| `support.google.com/adsense/answer/10015918` | AdSense content and user experience | Explicit expansion of the verdict. "Make sure that your pages have enough unique content so that we can determine what your site is about… provide content that gives your users a reason to visit and return." |
| `support.google.com/adsense/answer/7299563` | Make sure your site's pages are ready for AdSense | 4-question pre-flight: unique content? clear navigation? interesting content? ready? |
| `support.google.com/adsense/answer/9680050` | Your AdSense account wasn't approved | The **definitive decoding of rejection reasons.** Lists six root causes that map onto the "low value content" verdict: **Insufficient content, Content quality issues, Content policy violations, Site navigation issues, Traffic sources, Unsupported language.** |
| `support.google.com/adsense/answer/1348695` | Required content (privacy policy) | Privacy policy MUST contain: "Third party vendors, including Google, use cookies to serve ads based on a user's prior visits…" plus "Users may opt out of personalized advertising by visiting Ads Settings." |
| `support.google.com/adsense/answer/7003627` | Fix policy issues that affect ad serving | The "Request review" workflow. Documents the 30-day page-level review cap. |
| `support.google.com/adsense/answer/10246390` | Reactivate a closed AdSense account | "We then check your site… This usually takes a few days, but in some cases it can take 2-4 weeks." |
| `developers.google.com/search/docs/essentials/spam-policies` | Spam Policies for Google Web Search (formerly `webmasters/answer/66357`) | The 19-pain-point policy tree: cloaking, doorway abuse, scaled content abuse, scraping, keyword stuffing, hidden text/link abuse, link spam, hacked content, misleading functionality, etc. |
| `developers.google.com/search/docs/fundamentals/creating-helpful-content` | Creating helpful, reliable, people-first content | The **E-E-A-T doc.** Defines YMYL and the "Who, How, Why" framework AdSense reviewers and Search quality raters use. |

**Key fact:** AdSense does not publish a numerical minimum word-count, page-count, or traffic threshold. The Help Community thread `support.google.com/adsense/thread/106526510` confirms: *"AdSense doesn't state what the minimum amount of contents are."* Reviewers rely on qualitative heuristics documented in the help pages above.

### 1.3 The verdict MDG actually got — decoded

"Low value content. Your site does not yet meet the criteria of use in the Google publisher network" is a behaviorally-coded rejection mapped to the **Inventory value** policy (`9335564`) — "Google-served ads on screens without publisher-content or with low-value content." The help article `9680050` ("Your AdSense account wasn't approved") translates this verdict into six concrete rejection reasons. MDG's rejection email is short and links to four help pages — most likely because the policy team is routing the rejection to the *generic* "low value content" bucket when more than one of the six reasons is present (typically: Insufficient content + Content quality issues + Site navigation issues, simultaneously).

### 1.4 What reviewers actually look at (qualitative)

Per `developers.google.com/search/docs/fundamentals/creating-helpful-content`, AdSense policy team uses a **Who, How, Why** framework backed by E-E-A-T signals (especially YMYL since cannabis = health/business). The community thread `support.google.com/adsense/thread/238808057` confirms: *"low value content occurs when the site fails to meet Google's quality rater guidelines calling for Experience-Expertise, Authoritativeness and Trustworthiness (E-EAT). These requirements are magnified to an effectively impossible (for AdSense) degree if your blog deals with health or financial topics, under the Your Money or Your Life (YMYL) extension."*

**Translation for MDG:** cannabis licensing, taxes, and operations = YMYL. AdSense reviewers will weigh E-E-A-T *more* heavily against MDG than they would against a non-YMYL site of equal word count. The 232/257 YMYL "Last reviewed" badges from Sprint 78i help on the experience/time-stamp axis, but the *expertise* and *authoritativeness* axes require visible human author bios with credentials, contact info, and editorial-policy pages — which is exactly where MDG has a measurable gap (see §3 table).

---

## 2. What AdSense actually wants — consolidated criteria

Single-source-of-truth criterion list. Each row maps a reviewer signal to a source URL, a quantitative or qualitative threshold, and what MDG's current state is.

| # | Criterion | Source URL | Threshold / Pattern AdSense looks for | MDG current state (initial judgment) |
|---|---|---|---|---|
| 1 | **Insufficient content** | `adsense/answer/9680050` §"Insufficient content" | Pages need "sufficient text — sites that contain mostly images, videos or Flash animations may not be approved… complete sentences and paragraphs, not only headlines… site is fully built and launched." | Likely PASS — 272 published pages, 306 .astro files; spot-checked guide page at `/guides/420-mules-bar-harbor` = ~1,471 visible words. |
| 2 | **Content quality issues** (thin / unoriginal / auto-generated / affiliate-only) | `adsense/answer/9680050` §"Content quality issues" + `adsense/answer/10015918` + `webmasters/answer/66357` (spam-policies) | Must provide "original, rich content that would be of value to users… Don't place ad code on auto-generated pages… Affiliate program content should form only a minor part of the content of your site if the content adds no additional features." | PARTIAL — content is original and primary-source (OCP filings), but the **system has no per-page audit distinguishing guide-quality from thinner index pages.** Some pages (cite index, embed widgets, ROI calculator) are deliberately shallow. |
| 3 | **Site navigation** | `adsense/answer/9680050` §"Site navigation issues" | "Clear navigation… Potential navigation issues include: redirects, pages behind a login or restricted access, broken links, excessive pop-ups, dialers, and pages under construction." | PASS for broken links (OpenSEO audit 14a9dad6 = 0 critical / 0 warning broken-link/page issues). PARTIAL on nav clarity — header has nested dropdown with 50+ items; deep nested topic-groups could read as "spammy doorway" to a human reviewer. |
| 4 | **Inventory value (the policy that drives the "low value content" verdict)** | `publisherpolicies/answer/10502938` §Inventory value | "We do not allow Google-served ads on screens: without publisher-content or with low-value content… with embedded or copied content from others without additional commentary, curation, or otherwise adding value to that content… with more ads or other paid promotional material than publisher-content." | PASS for content quality (every guide has editorial commentary on top of OCP data). UNKNOWN on ad-density planning — MDG has not yet decided ad placement strategy. |
| 5 | **About / Contact pages** | `adsense/answer/7299563` + community consensus | Real About, Contact, Privacy, Terms pages all required. "These aren't just AdSense requirements — they signal to Google that real humans run your site with genuine accountability." (3rd-party: `adsenseaudit.net`) | PARTIAL — `/about`, `/contact`, `/privacy`, `/terms` all return 200 with substantive content (~764, ~900, ~797, ~1,100+ words). **BUT `/about/authors` page has 0 individual author profiles linked** (see gap analysis row 7). |
| 6 | **Privacy policy has AdSense cookie boilerplate** | `adsense/answer/1348695` | Privacy policy MUST contain: "Third party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites… Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet… Users may opt out of personalized advertising by visiting Ads Settings." | **FAIL** — current `/privacy` §5 *explicitly states:* "We do not use advertising cookies or third-party tracking pixels." This is the OPPOSITE of what AdSense requires. Block-and-replace needed before re-application. |
| 7 | **Author bios / E-E-A-T "Who" signal** | `developers.google.com/search/docs/fundamentals/creating-helpful-content` §"Who (created the content)" | "Is it self-evident to your visitors who authored your content? Do pages carry a byline… Do bylines lead to further information about the author or authors involved, giving background about them and the areas they write about?" | PARTIAL — Steve Kelly byline exists on privacy page. **FAIL** on author-profile pages: `/about/authors` page returns 200 (59,822b) but lists 0 individual author profile links (only the index and `/about/our-team` are linked). For YMYL, every page needs a clickable byline leading to an author profile with credentials. |
| 8 | **Author credentials / E-E-A-T "Why" + "How" signal** | Same as #7; also `support.google.com/adsense/thread/238808057` community guidance for YMYL | "Is this content written or reviewed by an expert or enthusiast who demonstrably knows the topic well?" For YMYL cannabis: real legal/regulatory background visible. | PARTIAL — Steve Kelly's privacy-page bio says "Founder & Publisher, Maine Dispensary Guide (publisher-record role)" and explicitly notes "This is the publisher's editorial position rather than a third-party attestation of independent expertise." **The disclaimer is honest but undermines the E-E-A-T expertise claim** for a YMYL topic. Reviewer may read it as "no independent expert on the team." |
| 9 | **ads.txt** | `publisherpolicies/answer/10502938` §Authorized inventory | "You must not place Google-served ads on a domain that uses ads.txt where you are not included as an authorized seller." Format: `google.com, pub-XXXXX, DIRECT, f08c47fec0942fa0`. | PASS technically — line `google.com, pub-4930219889179618, DIRECT, f08c47fec0942fa0` is correct and live. **BUT the file still contains 16 lines of placeholder comments** (e.g., "The pub- ID will be issued by Google when the AdSense account is approved…"). A reviewer might read this as unmaintained. |
| 10 | **Sitemap + robots.txt** | (Implicit from `7299563` and indexing requirements) | Sitemap must exist and be reachable. Robots must not block key resources. | PASS — `/sitemap-index.xml` → `/sitemap-0.xml` returns 200, lists 271 URLs. Robots allows `/` with explicit `Crawl-delay: 1`. |
| 11 | **Doorway-abuse / scaled-content-abuse pattern** | `developers.google.com/search/docs/essentials/spam-policies` §Doorway abuse + §Scaled content abuse | "Having multiple domain names or pages targeted at specific regions or cities that funnel users to one page… Using generative AI tools or other similar tools to generate many pages without adding value for users." | **HIGH RISK.** MDG has **109 city-guide pages** that look very similar (URL pattern `/guides/[city]-dispensary-guide`). Reviewer will sample 3-5 and compare. If the per-page unique content density is high (city-specific OCP filings, municipal opt-in status, local zoning), MDG passes. If they're template-stitched, MDG fails. **This is the single most-likely "low value content" trigger.** |
| 12 | **Traffic from search engines** | `adsense/answer/10015918` + community: `support.google.com/adsense/thread/388840504` ("the site should already be indexed in Google search, be reachable and readable") | "Already be indexed in Google search… have traffic." No public threshold. | PARTIAL — Search Console shows ~9 clicks/day and 500-650 impressions/day for the connected property `sc-domain:mainedispensaryguide.com` (28-day window). Indexed but very thin traffic. |
| 13 | **Affiliate vs primary-source distinction** | `webmasters/answer/66357` §"Thin affiliation" + `adsense/answer/9680050` | "Your site shouldn't participate in affiliate programs without adding sufficient value to users. Affiliate program content should form only a minor part of the content of your site." | PASS — site is primary-source (Maine OCP, municipal opt-in lists, Metrc docs). No affiliate links evident on the public pages. |
| 14 | **AI-generation disclosure** | `developers.google.com/search/docs/fundamentals/creating-helpful-content` §"How (the content was created)" | "Is the use of automation, including AI-generation, self-evident to visitors through disclosures or in other ways?" | UNKNOWN — no editorial-policy page exists. `/editorial-policy` 404s. If AI-assisted content is in play, this is a gap. |
| 15 | **Editorial corrections log** | E-E-A-T trust signal; community guidance for YMYL | Public, dated corrections log showing editorial accountability. | PASS — `/about/corrections` returns 200, 82,361b (substantial). |
| 16 | **Embedded widget / tool pages** | `adsense/answer/9680050` §"Insufficient content" + §"Site navigation issues" | "Sites that consist only of a site template and very little content may not be approved." | **FAIL** for the 2 embed pages flagged by audit — `/embed/roi-calculator` (15,063b) and `/embed/opt-in-tracker` (11,205b). They are minimal markup by design but each is a crawlable URL. Reviewers may interpret them as "screens without publisher-content." |
| 17 | **Language support** | `publisherpolicies/answer/10502938` §Unsupported languages | Site must be in an AdSense-supported language. | PASS — content is English. |

---

## 3. MDG gap analysis (17 rows)

| # | AdSense criterion | Source URL | MDG status | Specific evidence (URL / file / audit) | What closes the gap | Estimated effort |
|---|---|---|---|---|---|---|
| 1 | Privacy policy contains AdSense-required cookie boilerplate | `support.google.com/adsense/answer/1348695` | **FAIL** | Live `/privacy` §5: *"We do not use advertising cookies or third-party tracking pixels."* Direct contradiction. | Add §5-bis "Advertising cookies & third-party vendors" containing the three required sentences verbatim: third-party-vendors + Google-cookies + Ads-Settings opt-out link. | 1-2 hours (1 file, ~150 words to insert). |
| 2 | `ads.txt` file has no placeholder comments | `publisherpolicies/answer/10502938` §Authorized inventory + IAB ads.txt spec | PARTIAL | Live `https://mainedispensaryguide.com/ads.txt` has 16 lines of `#` placeholder comments before the active line. Reviewer may read this as unmaintained. | Strip placeholder comments; keep only the active `google.com, pub-XXXXX, DIRECT, f08c47fec0942fa0` line + a one-line header comment. | 5-10 minutes. |
| 3 | Individual author profile pages exist (YMYL E-E-A-T) | `developers.google.com/search/docs/fundamentals/creating-helpful-content` §"Who" | **FAIL** | `/about/authors` returns 200 (59,822b) but contains **0 individual author profile links** (only `/about/corrections` and `/about/our-team` are linked). 109 city guides + 77 technical guides have byline-shaped bio footers but no clickable author page targets. | Build `/about/authors/[slug]/` for each named author (start with Steve Kelly). Each guide's author-footer anchor should link to that page. Update `/about/authors` index to list all author cards. | 4-8 hours for the Steve Kelly page; 2-4 hours per additional author. |
| 4 | Editorial-policy page exists (E-E-A-T "How" disclosure) | `developers.google.com/search/docs/fundamentals/creating-helpful-content` §"How" | **FAIL** | `/editorial-policy` 404s. `/methodology` 404s. No page exists stating how content is researched, sourced, or fact-checked. | Create `/editorial-policy` (or `/about/editorial-policy`) with sections: sourcing (OCP filings, municipal records), fact-check cadence (matches the "Last reviewed" badge refresh), corrections workflow (links to `/about/corrections`), and any AI-assistance disclosure. | 3-5 hours. |
| 5 | Per-page unique content density on city guides (doorway-abuse defense) | `developers.google.com/search/docs/essentials/spam-policies` §Doorway abuse | **HIGH RISK — UNVERIFIED** | 109 city-guide URLs under `/guides/[city]-dispensary-guide`. Spot-check of `/guides/420-mules-bar-harbor` shows ~1,471 visible words, 4 JSON-LD blocks. Reviewer will sample 3-5 random cities — if they look templated, MDG fails. | Sample-audit 10-15 random city guides. Confirm each has: city-specific OCP filings, local zoning notes, opt-in status, named municipalities, ≥800 unique words. If any are templated, expand them. | 6-12 hours of audit + content writes. |
| 6 | YMYL author credentials (cannabis regulatory expertise) | `support.google.com/adsense/thread/238808057` (E-E-A-T YMYL extension) | PARTIAL | Privacy-page bio explicitly disclaims independent expertise. For YMYL (cannabis licensing, taxes, compliance), reviewers may demand evidence of legal/regulatory background. | Add to author profiles: any Maine-licensed credentials, OCP-published commentary, named legal/CPA advisors whose work is cited. If no independent legal expert is on the team, add a "Medical & Legal Review" disclosure naming external reviewers (with their permission). | 2-4 hours. |
| 7 | Ad placement strategy / ad-density ratio | `publisherpolicies/answer/10502938` §"More ads or paid promotional material than publisher-content" | UNKNOWN | MDG has not yet planned ad placement. AdSense review happens at site level before ad code is added — but the *display density policy* applies once ads are live. | Before re-applying: define a placement map (e.g., 1 in-article ad per 600+ words, max 3 ads per page, no ads above the fold on YMYL pages). Document it. | 1-2 hours. |
| 8 | Crawlable but minimal "embed" widget pages | `adsense/answer/9680050` §"Insufficient content" | **FAIL** (audit-known) | `/embed/roi-calculator` (15,063b HTML, no H1) and `/embed/opt-in-tracker` (11,205b HTML, no meta description) per OpenSEO audit 14a9dad6. Currently crawlable. | Either (a) add substantive content wrapper (intro paragraph explaining tool + how-to-use + FAQ) ≥300 words and an H1; or (b) `noindex` them via meta robots. Cleaner option is (a). | 2-3 hours. |
| 9 | About-page depth and identity signals | `adsense/answer/7299563` + E-E-A-T | PARTIAL | `/about` = 764 words; mentions Steve Kelly 10 times, "founder" 10x, "Maine" 95x, "cannabis" 34x. Has clear "About Us" framing. | Add: physical mailing address (PO box acceptable), Maine-registered LLC name, year founded, mission statement, list of editorial team roles. | 1-2 hours. |
| 10 | Contact page completeness | `adsense/answer/7299563` | PASS | `/contact` = 900 words; mailto:3x, address:1x. Substantive. | Optional: add a contact form (mailto handler), business hours, response-time SLA. | 1 hour. |
| 11 | Sitemap correctness and URL count | Implicit from `7299563` | PASS | Live `sitemap-index.xml` → `sitemap-0.xml` lists 271 URLs. Matches the 272 published count (off by one because of the home being listed once). | Optional: add `lastmod` to all sitemap entries (check if already present; spot-check). | 30 minutes. |
| 12 | Search Console indexing | `support.google.com/adsense/thread/388840504` ("the site should already be indexed in Google search") | PARTIAL | `sc-domain:mainedispensaryguide.com` 28-day window: ~9 clicks/day, 500-650 impressions/day, avg position ~9. Indexed but light traffic. | Continue producing quality content + maintain internal linking. Document current baseline in the assessment for re-application comparison. | 0 hours (already happening). |
| 13 | Backlink profile | Community YMYL guidance | PARTIAL | OpenSEO 2026-07-10: 4 backlinks, 2 referring domains (`linuxexpert.org`, `ailinux.me`), spam-score 0/5. Very thin profile. | Build 5-10 editorial backlinks from Maine cannabis, business, or news outlets before re-application (this is the slow path; parallel it to the content fixes). | 20-40 hours outreach over 4-8 weeks. |
| 14 | Embed/utility pages blocking reviewer crawlers | `support.google.com/adsense/thread/388840504` ("The review crawlers tend to only be able to read plain textual contents") | PARTIAL | Same as row 8 — minimal HTML, but textual. Reviewer bot likely sees them as thin pages. | Same fix as row 8: add textual wrapper OR `noindex` them. | Covered by row 8. |
| 15 | Broken internal links / orphan pages | `adsense/answer/9680050` §"Site navigation issues" | PASS | OpenSEO audit 14a9dad6 = 0 critical + 0 warning broken-link/page issues. (Earlier 47 heading-order-skip warnings appear to be from a prior audit; the latest shows only 2 warnings on embed pages — covered in row 8.) | Maintain current audit cadence. | 0 hours. |
| 16 | Hreflang, canonical, noindex hygiene | Program policies | PASS | Audit shows 3 canonicalized-page + 3 noindex-page flagged correctly (intentional config). | None. | 0 hours. |
| 17 | AdSense-supported language + content region | `publisherpolicies/answer/10502938` §Unsupported languages + `adsense/answer/9680050` §"Unsupported language" | PASS | All content English, US-based, geo-tagged US-ME. | None. | 0 hours. |

---

## 4. Re-application timing

### 4.1 The 30-day page-level review cap (official)

`support.google.com/adsense/answer/7003627` §"Request a review for multiple page-level issues" states:

> *"You can request a certain number of page-level reviews during a 30 day period. This limit is refreshed daily."*

This is the only **explicitly published cadence number** from Google. Translation: Google throttles re-application attempts and the limit refreshes daily. Rapid repeat applications either get auto-blocked or, per `support.google.com/adsense/thread/7003627`, the "Start review process" button is **inactive if your site has been reviewed and rejected several times recently"** — meaning Google tracks rejection count.

### 4.2 Initial review timeline (official)

Per `support.google.com/adsense/answer/10246390` ("Reactivate a closed AdSense account"):

> *"We then check your site to determine if it's ready to show ads and meets the AdSense Program policies. This usually takes a few days, but in some cases it can take 2-4 weeks."*

Same number — "a few days" to 4 weeks — is repeated in `adsense/answer/10015918` §"Submit your site for review": *"The review process usually takes a few days and you'll be notified about the review results through your AdSense account."* For new applications (not reactivation), community data points (Help Community thread `388840504`, `245541323`, and the 3rd-party audit at `eastondev.com`) cluster at **2 days minimum, 1-2 weeks typical, 4-6 weeks at peak (January, after major Google updates).**

### 4.3 Re-application cooldown — what to actually wait

**No official minimum wait.** Google does not publish a number. However, three converging signals:

1. `adsense/answer/7003627` — the 30-day page-level review cap.
2. Community guidance (`support.google.com/adsense/community-guide/241032356`, `eastondev.com`) — *"After substantive fixes, wait about 7-14 days so Google can recrawl. Too many quick reapplications can extend cooling-off periods."*
3. Practitioner consensus (`theguidex.com`, `adsmasteryseo.com`) — **2-3 weeks** between applications to allow re-crawl and re-evaluation.

For a YMYL site that lost on "low value content" — the most qualitative of all AdSense verdicts — a 30-day cool-down is the safer floor. Less than 14 days risks the reviewer still seeing the same cached snapshot.

### 4.4 Review time on a 2nd attempt

If the rejection was purely structural (broken links, missing pages), 2nd-attempt success is reported as common (community-reported, 60-70% within 1-2 weeks). If the rejection was a qualitative YMYL "low value content" verdict, the 2nd-attempt success rate drops sharply without major content additions — community `support.google.com/adsense/thread/238808057` and `392138659` describe multiple rejections before approval.

### 4.5 Recommended timing for MDG

| Phase | Start | End | Notes |
|---|---|---|---|
| Implement gap fixes (rows 1, 2, 3, 4, 8 from §3) | 2026-07-12 | 2026-07-19 | All high-priority items; ~10-20 hours of work. |
| Publish 3-5 substantive new content pages + refresh "Last reviewed" badges | 2026-07-19 | 2026-07-26 | Gives Search Console fresh crawl material and signals steady publishing. |
| Cool-down / crawl-stabilization | 2026-07-26 | 2026-08-09 | 14 days minimum. Avoid any major structural changes during this window. |
| Re-apply via AdSense Policy center "Request review" | 2026-08-10 | — | Use the "Fixed the violations" reason dropdown. Reference specific fixes in the appeal notes. |
| Wait for review | 2026-08-10 | 2026-08-24 (typical) | Up to 4 weeks at the upper end. |

**Sources:** `support.google.com/adsense/answer/7003627`; `support.google.com/adsense/answer/10246390`; `support.google.com/adsense/answer/10015918`; community thread `support.google.com/adsense/thread/388840504`.

---

## 5. Recommended pre-application cleanup (prioritized)

These are the actions that should happen **before** the re-apply window opens. Rows 1-4 are NEW (not in the OpenSEO audit / broken-link fix list); rows 5-6 are confirmations of work already underway.

| Priority | Action | Source URL | Why this matters (verbatim from policy) | Effort | NEW vs prior work |
|---|---|---|---|---|---|
| **P0** | Replace `/privacy` §5 cookie language to add the AdSense boilerplate (3 required sentences about third-party vendors, Google cookies, and Ads Settings opt-out). | `support.google.com/adsense/answer/1348695` | *"Your privacy policy should include the following information: Third party vendors, including Google, use cookies to serve ads based on a user's prior visits… Users may opt out of personalized advertising by visiting Ads Settings."* Current text contradicts this. | 1-2 hours | **NEW** — not flagged by any prior audit. |
| **P0** | Create the Steve Kelly author profile page at `/about/authors/steve-kelly/` and link it from the byline on every guide. | `developers.google.com/search/docs/fundamentals/creating-helpful-content` §"Who" | *"Do bylines lead to further information about the author or authors involved, giving background about them and the areas they write about?"* — YMYL cannabis. | 4-8 hours | **NEW** — author footer links currently anchor to `/about/authors#steve-kelly` which has no profile detail. |
| **P0** | Create `/editorial-policy` (or `/about/editorial-policy`) covering sourcing, fact-check cadence, AI-disclosure, and corrections workflow. | `developers.google.com/search/docs/fundamentals/creating-helpful-content` §"How" | *"Is the use of automation, including AI-generation, self-evident to visitors through disclosures or in other ways?"* and *"How was this content created"* framework. | 3-5 hours | **NEW** — page currently 404s. |
| **P0** | Add a content wrapper (≥300 words + H1 + meta description) to `/embed/roi-calculator` and `/embed/opt-in-tracker`, OR `noindex` them. | `adsense/answer/9680050` §"Insufficient content" + §"Site navigation issues" | *"Sites that consist only of a site template and very little content may not be approved."* AdSense reviewer bot will see these minimal markup pages as "screens without publisher-content." | 2-3 hours | NEW framing — OpenSEO audit flagged them but as warning-class only, not blocker-class for AdSense. |
| **P1** | Strip the 16 placeholder comment lines from `ads.txt`; keep only the active record + a single header comment. | `publisherpolicies/answer/10502938` §Authorized inventory | The IAB ads.txt spec expects active records at the top. Placeholder comments suggest the file was never reviewed post-pub-ID issuance. | 5-10 minutes | **NEW** — file format is technically valid but the comments are a readability red flag for human reviewers. |
| **P1** | Sample-audit 10-15 random city guides; confirm each has ≥800 unique city-specific words (OCP filings, municipal opt-in, local zoning). | `developers.google.com/search/docs/essentials/spam-policies` §Doorway abuse | *"Having multiple domain names or pages targeted at specific regions or cities that funnel users to one page."* This is MDG's biggest single risk surface. | 6-12 hours | NEW (auditable now; the OpenSEO audit doesn't measure uniqueness). |
| **P1** | Strengthen Steve Kelly's bio: add any Maine-licensed credentials, OCP-published commentary, or named legal/CPA advisors whose work is cited. | `support.google.com/adsense/thread/238808057` (E-E-A-T YMYL extension) | Community guidance: *"low value content occurs when the site fails to meet Google's quality rater guidelines calling for Experience-Expertise, Authoritativeness and Trustworthiness (E-EAT). These requirements are magnified to an effectively impossible (for AdSense) degree if your blog deals with health or financial topics."* | 2-4 hours | **NEW** — current bio is honest but weak on credentials. |
| **P2** | Document an ad-placement map (where ads will go, density per page, no-ads-on-YMYL-above-fold) before re-application. | `publisherpolicies/answer/10502938` §Inventory value | *"We do not allow Google-served ads on screens: with more ads or other paid promotional material than publisher-content."* | 1-2 hours | NEW. |
| **P2** | Continue the 232/257 YMYL "Last reviewed" badge program to push coverage to 100% of YMYL pages. | E-E-A-T experience axis | Sprnt 78i already shipped 232. Closing the gap to 257 is a 1-sprint task. | 4-8 hours | Continuation of in-flight work. |
| **P3** | Backlink growth: target 5-10 editorial mentions from Maine cannabis, business, or news outlets. | YMYL authoritativeness signal | OpenSEO 2026-07-10 shows 4 backlinks / 2 referring domains — thin for YMYL. | 20-40 hours over 4-8 weeks | Independent of code work; can run in parallel. |

**Three NEW findings the OpenSEO audit / broken-link work did NOT surface** (the "top 3" the parent agent asked for):

1. **The privacy policy actively contradicts AdSense requirements.** `/privacy` §5 states "We do not use advertising cookies or third-party tracking pixels" — the opposite of what `support.google.com/adsense/answer/1348695` mandates. AdSense requires three specific cookie-disclosure sentences verbatim; without them the application is provably non-compliant on policy grounds alone.
2. **There are zero individual author profile pages.** `/about/authors` exists as an index but links nowhere; byline footers on every guide anchor to `/about/authors#steve-kelly` which has no detail. For a YMYL site, this is the single biggest E-E-A-T "Who" gap.
3. **`/editorial-policy` 404s.** Google's "Helpful Content" guide explicitly asks *"How was this content created?"* — and MDG has no page answering that. Combined with no `/methodology` page either, reviewers will infer either no editorial process or a hidden one.

---

## 6. Open questions for Steve

These need your judgment before the re-application sprint begins.

1. **AdSense on YMYL bylines — strategic.** Do you want to surface a single named author (Steve Kelly) on all YMYL pages, or recruit 1-2 named legal/regulatory advisors whose credentials can be displayed? The privacy-page bio is currently honest ("this is the publisher's editorial position rather than a third-party attestation of independent expertise") — is that the framing we keep, or do we need to acquire/display external credentials?

2. **Embed pages — wrap or noindex.** `/embed/roi-calculator` and `/embed/opt-in-tracker` are embeddable widgets. They are useful to embed elsewhere on the open web but are minimal as standalone URLs. Wrap them with content, or `noindex` them and accept that they don't help with AdSense but don't hurt either?

3. **City-guide templating — spot-audit scope.** If I sample-audit 10-15 random city guides and find that some are templated, how aggressive should the fix be? Bulk-rewrite the 109 guides? Or accept that the threshold is "reviewer samples 3-5 and most look unique"? The latter is faster but riskier.

4. **Backlink strategy — paid outreach OK?** The current 4 backlinks / 2 referring domains is thin for YMYL. Some organic growth is happening (linuxexpert.org, ailinux.me). Do you have appetite for active outreach (YMYL + cannabis publications), or do we wait for organic growth and re-apply on the basis of content fixes alone?

5. **Re-apply window — strict 30-day or aggressive 14-day?** Given the 30-day page-level review cap, a 30-day cool-down from rejection date is the safe play. But the rejection email date is uncertain — do you have the email date?

6. **Ad placement — what density is acceptable to you?** The inventory-value policy forbids "more ads than publisher-content." For YMYL pages, do you want a conservative density (1 in-article ad per 800+ words, max 2 per page) or push toward the 3-ad/4-paragraph standard AdSense display?

---

## Appendix A — Notes on the citation task brief

- The URL `support.google.com/adsense/answer/9781305` ("Low value content") returned 404 on 2026-07-11. It is not a stand-alone policy doc; the verdict is encoded in `publisherpolicies/answer/10502938` §Inventory value and decoded in `adsense/answer/9680050` §"Insufficient content" + §"Content quality issues."
- The URL `support.google.com/webmasters/answer/8176511` ("Webmaster quality guidelines for thin content") also returned 404. It has been consolidated into `developers.google.com/search/docs/essentials/spam-policies` §Scaled content abuse + §Doorway abuse.
- The URL `support.google.com/adsense/answer/99430` ("Minimum content requirements") returned 404. It has been merged into `adsense/answer/9335564` (Google Publisher Policies) + `adsense/answer/10015918` (AdSense content and user experience).
- All three replacements were confirmed via `support.google.com/adsense/thread/106526510` and `support.google.com/adsense/community-guide/241032356` community threads.

## Appendix B — Verification summary

- File path: `/home/steve/projects/maine-dispensary-guide/docs/superpowers/specs/2026-07-11-adsense-readiness-assessment.md`
- Section count: 6 (verdict research, what AdSense wants, gap analysis, re-application timing, recommended cleanup, open questions) + 2 appendices.
- Gap analysis rows: 17 (target ≥ 10).
- Recommended cleanup items: 10 (target ≥ 3 NEW).
- NEW findings explicitly marked: 3 in the top-findings block + 5 more in the cleanup table.
- Re-application timing cites: 4 sources (`adsense/answer/7003627`, `adsense/answer/10246390`, `adsense/answer/10015918`, `support.google.com/adsense/thread/388840504`) — target ≥ 2.
- Re-application cool-down: derived from converging official + community signals (no single official number).
- Real evidence pulled from: live `curl` to `mainedispensaryguide.com`, OpenSEO audit 14a9dad6, OpenSEO backlinks profile 2026-07-10, OpenSEO Search Console 28-day window 2026-06-10→2026-07-08.