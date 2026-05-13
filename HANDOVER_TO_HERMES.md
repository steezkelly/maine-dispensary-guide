# Handover Document: Maine Dispensary Guide
## From: Windows Laptop (Steve's OpenCode) → Linux Mint PC (Hermes-Agent)
**Date: May 12, 2026 EDT**
**Prepared by: OpenCode (MiniMax-M2.7) on Windows Laptop**

---

## EXECUTIVE SUMMARY

This document is the **complete source of truth** for the Maine Dispensary Guide project. It tells the hermes-agent everything they need to know to pick up where this laptop left off. Read it in full before touching any code.

**Live Site:** https://mainedispensaryguide.com
**Repository:** GitHub (origin/main is clean and pushed)
**Score:** 100/100 (A) — 0 ERRORS
**Pages:** 79 total routes

---

## 1. PROJECT STATE (AS OF MAY 12, 2026)

### Deployment
- **Live URL:** https://mainedispensaryguide.com
- **Host:** Vercel (Static Mode, `output: 'static'`)
- **Build:** `npm run build` — 79 pages, clean
- **Domain:** Registered at Porkbun, DNS pointing to Vercel
- **HTTPS:** Active (Porkbun SSL + Vercel)

### Quality Scores
| Metric | Value |
|--------|-------|
| SquirrelScan Score | **100/100 (A) — 0 ERRORS** |
| Accessibility | 99/100 (26 minor contrast warnings — non-blocking) |
| Content Quality | ~90/100 average |
| Promo words | 0 (cleaned in Sprint 55) |
| AI phrases | 0 (cleaned in Sprint 55) |

### Content Inventory
| Type | Count |
|------|-------|
| City Guides | 14 (Auburn, Augusta, Bangor, Biddeford, Brunswick, Kittery, Lewiston, OOB, Portland, Saco, Sanford, Scarborough, South Portland, Waterville, Westbrook) |
| Technical Guides | 33 (banking, business-plan, costs, cultivation, delivery-rules, edibles-compliance, extraction-licensing, funding-guide, inventory-management, licensing, marketing-compliance, packaging, POS, product-testing, real-estate, regulations, security, staffing-licensing, vendor-directory, waste-management, workers-comp, and more) |
| Blog Posts | 9 (ROI, psilocybin, ibogaine, Trump psychedelic EO, how-to, and others) |
| Founder Stories | 4 |
| Resource Hubs | 2 (education, official-resources) |
| Admin Pages | 2 (link-dashboard, seo-dashboard — both noindex) |
| Other Pages | index, about, contact, privacy, glossary, directory, download-checklist, founders-bible, etc. |
| **TOTAL** | **79 routes** |

### Tech Stack
- **Framework:** Astro 6.0 with `mdx` and `sitemap` integrations
- **Adapter:** Vercel (Static Mode)
- **Design System:** "Heritage Authority" — Fraunces/Jakarta typography, warm bone #F2F2E2, forest green #2D5016
- **TypeScript:** Strict mode (`astro/tsconfigs/strict`)
- **Monorepo:** Turborepo workspace (`apps/maine-cannabis` + `packages/ui` + `packages/layouts`)
- **CSS:** CSS variables, no Tailwind

---

## 2. WHAT'S WORKING (INFRASTRUCTURE)

### Email Outreach (Data Available in Repo) ✅
- **Purelymail SMTP** — steve@mainedispensaryguide.com configured (credentials in `config/credentials/mainedispensaryguide.env`)
- **20 Maine cannabis contacts** researched and saved to `scripts/data/maine-cannabis-contacts.json`
- **20 citation outreach contacts** saved to `scripts/data/maine-citation-contacts.json`
- **Drip campaign templates** — were in EmailPipeline (Windows, not transferred); contact data is in repo, rebuild templates on Linux
- **Outreach strategy** documented in `link-outreach.md`
- **Note:** EmailPipeline (Windows-specific, Phase 1 only) was NOT transferred — rebuild on Linux using the contact data and templates above

### fal.ai Image Generation ✅
- **Integrated:** `scripts/image/fal-image-gen.cjs`
- **Model used:** FLUX 2 Pro (`flux-2-pro`) — 25s generation, $0.03/image
- **API Key location:** `C:\Users\Steve\Documents\DO_NOT_EXPOSE_THIS_KEY.txt`
- **74 hero images** generated and saved to `public/images/heroes/`
- **Manifests:** `scripts/manifests/hero-regen-flux-dev.json`, `hero-regen-flux-pro-5.json`

### Search Tools ✅
- **Brave Search** (`scripts/search/brave-search.cjs`) — primary, requires API key
- **Wikipedia Search** (`scripts/search/wikipedia-search.cjs`) — secondary, free, no key
- **Playwright MCP** — browser automation for live-site testing

### Lead Capture ✅
- **Formspree form** on all lead capture pages: `https://formspree.io/f/xvgzlowz`
- **PDF Magnet** ("Founders Bible") — source at `ROADMAP_FOUNDERS_BIBLE.md`, PDF at `public/pdfs/founders-bible-2026.pdf`
- **Download page:** `/download/founders-bible/`

### Analytics ✅
- **GA4:** `G-614GHG67ZQ` (hardcoded in Layout.astro)
- **Vercel Analytics + Speed Insights:** Built-in
- **Bing Webmaster:** Verified (`msvalidate.01` in Layout.astro)

---

## 3. CRITICAL: CREDENTIALS & SECRETS

These are **NOT in the repo**. You must transfer them manually.

### 3.1 fal.ai API Key
- **File:** `C:\Users\Steve\Documents\DO_NOT_EXPOSE_THIS_KEY.txt`
- **Transfer:** Copy this file or its contents to mint-pc
- **Linux path suggestion:** `~/.config/maine-dispensary-guide/fal-api-key.txt`

### 3.2 Brave Search API Key
- **File:** Not saved — get from https://brave.com/search/api/
- **Transfer:** Set in `.env` on mint-pc as `BRAVE_SEARCH_API_KEY=your-key`
- **Free tier:** 1000 req/month

### 3.3 Purelymail SMTP Credentials
- **File:** `config/credentials/mainedispensaryguide.env` (in repo but gitignored)
- **Contents:** App Password and SMTP details for steve@mainedispensaryguide.com
- **Transfer:** Copy this file to mint-pc at same relative path

### 3.4 OpenCode/minimax API Key
- **File:** `C:\Users\Steve\.config\opencode\opencode.json` (contains MINIMAX_API_KEY)
- **Transfer:** Copy `~/.config/opencode/` directory to mint-pc at `~/.config/opencode/`
- **IMPORTANT:** This contains the MiniMax Coding Plan API key — treat as secret

### 3.5 Formspree (No action needed)
- Form ID `xvgzlowz` is hardcoded in forms — no key needed, it's the form endpoint

---

## 4. OPENCODE CONFIGURATION (MUST COPY)

The OpenCode agent framework is configured in `~/.config/opencode/` on Windows. **Copy this entire directory to mint-pc.**

### 4.1 Files to Copy
```
~/.config/opencode/
├── opencode.json              # Main config: MCP servers, agents, plugins
├── oh-my-opencode-slim.json   # 6-agent Pantheon system (orchestrator, oracle, librarian, explorer, designer, fixer)
├── opencode-minimax-easy-vision.json  # Vision plugin config
└── (other config files)
```

### 4.2 OpenCode Plugins Installed
- **oh-my-opencode-slim** — 6-agent Pantheon system (orchestrator, oracle, librarian, explorer, designer, fixer, council, observer)
- **opencode-minimax-easy-vision** — Enables vision/图像分析 for Observer agent via MiniMax MCP

### 4.3 Model Configuration
All agents use **MiniMax-M2.7** (from `minimax-coding-plan/MiniMax-M2.7`)
- orchestrator: high reasoning
- oracle: high reasoning
- librarian: medium reasoning
- explorer: low reasoning
- designer: medium reasoning
- fixer: low reasoning

### 4.4 Custom OpenCode Commands (in AGENTS.md)
```bash
/humanizer [url]        # Humanize AI content
/fix-patterns [pattern] # Automated regex fixer (use --dry-run first)
/humanize-review        # Editorial review
/audit [pattern]        # Content quality audit
/expand [topic]         # Research and expand topic
/expand-all [pattern]    # Batch expand
/sprint-close           # End-of-sprint checklist
```

---

## 5. IMPORTANT TECHNICAL NOTES

### 5.1 LSP Does NOT Work for Astro
- The TypeScript LSP (`lsp_diagnostics`) fails on `.astro` files with "typescript.tsdk required" error
- **Workaround:** Use `npx astro check src/pages/example.astro` for type checking
- This is a known incompatibility between OpenCode Desktop and Astro 6.0
- Build/deploy is NOT affected — site builds cleanly

### 5.2 Workspace Protocol Issue
- We tried using `workspace:*` protocol for monorepo packages — npm 11.9.0 threw `UNSUPPORTEDPROTOCOL`
- The `*` version works now that deploy context was fixed
- **Do NOT add `workspace:*` back** to package.json

### 5.3 Vercel: Two Projects Exist
There are TWO Vercel projects serving mainedispensaryguide.com:
1. **Old (orphan):** `maine-cannabis-5tt6gfp6a-steezkellys-projects.vercel.app` — still aliased
2. **New (active):** `project-1-o9j6qi8gm-steezkellys-projects.vercel.app` — where latest build lands

**Action needed:** In Vercel dashboard, migrate `mainedispensaryguide.com` alias from old project to new `project-1` project. Then delete the orphaned project.

### 5.4 CDN Cache Issue
- Vercel CDN may aggressively cache deployments
- Multiple `vercel --prod` CLI deploys show "Aliased: mainedispensaryguide.com" but curl returns stale content
- **Workaround:** Purge Vercel dashboard cache manually after deploy

### 5.5 Turborepo Build Cache
- `.turbo/` cache directory should be excluded from transfer (it's in `.gitignore`)
- First build on mint-pc will be a cold build — that's fine

### 5.6 Windows vs Linux Paths
- All scripts use Windows-style paths in some places
- AGENTS.md notes: use `path.basename()` for path splitting — `f.split('/').pop()` fails on Windows
- Scripts have been verified working but path handling may need review on Linux

---

## 6. PENDING ITEMS (DO THESE NEXT)

### Priority 1: Verify & Build
```bash
# 1. Clone repo on mint-pc
git clone https://github.com/steelkelley/project-1.git
cd project-1

# 2. Install dependencies
npm install

# 3. Set up credentials
cp .env.example .env
# Edit .env with Brave Search API key

# 4. Copy fal.ai key
mkdir -p ~/.config/maine-dispensary-guide/
# Copy fal.ai key from transfer medium to ~/.config/maine-dispensary-guide/fal-api-key.txt

# 5. Verify build
npm run build

# 6. Typecheck
npx astro check
```

### Priority 2: Copy OpenCode Config
```bash
# Copy entire ~/.config/opencode/ from Windows to mint-pc
# Use scp, USB drive, or cloud sync

# On mint-pc:
# ~/.config/opencode/opencode.json must have MINIMAX_API_KEY
# Restart opencode-cli after copying
```

### Priority 3: Verify Email Outreach Data
```bash
# Review contact data and templates already in repo:
ls scripts/data/maine-cannabis-contacts.json
ls scripts/data/maine-citation-contacts.json
ls templates/mainedispensaryguide/
cat link-outreach.md
# Rebuild email automation on Linux using these as source material
```

### Priority 4: Open Remaining Items

| Item | Owner | Notes |
|------|-------|-------|
| **Vercel project cleanup** | User (manual) | Delete orphaned Vercel project in Vercel dashboard |
| **GSC indexing check** | User (manual) | Log in to Google Search Console, check 42 non-indexed pages |
| **Mantis Ad Network** | Future | Apply at mantis.ad when traffic hits 5K+ pageviews/month |
| **Email outreach rebuild** | Agent | Use contacts + templates in repo to rebuild on Linux |

---

## 7. KEY FILES TO UNDERSTAND

### For Operations
| File | Purpose |
|------|---------|
| `AGENTS.md` | **READ FIRST** — Commands, Do/Don't, conventions |
| `BOT_COLLABORATION_HUB.md` | Full project history and sprint log (1,700+ lines) |
| `reference/project-status.md` | Live metrics, scores, content inventory |
| `reference/workflows.md` | Pre-flight, end-of-sprint, Windows patterns |

### For Content
| File | Purpose |
|------|---------|
| `ROADMAP_FOUNDERS_BIBLE.md` | PDF magnet source document |
| `link-outreach.md` | Outreach strategy, contact research, competitor analysis |
| `CONTENT_QUEUE.md` | Pending content topics |
| `CONTENT_PROMPTS.md` | Content generation prompts |

### For Technical
| File | Purpose |
|------|---------|
| `reference/reference.md` | Tool documentation (scripts, APIs, integrations) |
| `astro.config.mjs` | Astro configuration (do NOT modify without flagging) |
| `turbo.json` | Build pipeline (do NOT modify without flagging) |
| `vercel.json` | Vercel config, CSP headers, www→non-www redirect |

### For Maintenance
| File | Purpose |
|------|---------|
| `scripts/search/brave-search.cjs` | Primary search tool |
| `scripts/search/wikipedia-search.cjs` | Secondary research tool |
| `scripts/link/link-architect.cjs` | Glossary term linker |
| `scripts/git/delta-typecheck.cjs` | Typecheck only changed files |
| `scripts/git/sprint-handoff.cjs` | Generate Hub entry from git history |
| `scripts/content/audit-fix-loop.cjs` | Content quality audit |

---

## 8. PROJECT STRUCTURE

```
project-1/
├── apps/
│   └── maine-cannabis/           # Main Astro site
│       └── src/
│           ├── layouts/Layout.astro  # Main layout, ALL global CSS, JSON-LD
│           ├── components/          # Local overrides (GuideSidebar, Search, etc.)
│           └── pages/              # Routes (guides, founders, blog, resources, admin)
├── packages/
│   ├── ui/                       # Shared UI components (imported as @network/ui)
│   └── layouts/                  # Shared layouts (imported as @network/layouts)
├── scripts/                      # CLI tools (search, link, image, git, content, seo)
├── reference/                    # Technical docs
├── public/
│   ├── images/heroes/            # 74 hero images
│   ├── images/infographics/     # 12 infographic images
│   └── pdfs/                    # PDF magnet
├── BOT_COLLABORATION_HUB.md      # Project history (READ THIS)
├── AGENTS.md                    # Operational rules (READ THIS)
└── .env.example                  # Environment variable template
```

---

## 9. DESIGN SYSTEM (Heritage Authority)

### Colors (CSS Variables)
```css
--color-background: #F2F2E2;        /* Warm Bone (light mode) */
--color-background-dark: #061A1B;  /* Deep Spruce (dark mode) */
--color-primary: #2D5016;          /* Forest Green */
--color-accent: #588157;           /* Sage Green */
--color-soft-green: #7A9A6A;       /* Soft Green (was #A3B18A — contrast fixed) */
--color-text-dark: #1A1A1A;        /* Near black */
--color-text-light: #F2F2E2;       /* Warm Bone */
```

### Typography
- **Headings:** Fraunces (serif, Google Fonts)
- **Body:** Jakarta Sans (sans-serif, Google Fonts)
- **No emoji** in UI — use geometric icons (◆ ▲ ✦)

### Conventions
- **Slash-less internal links:** `/about` NOT `/about/`
- **CSS variables only** — never hardcode colors
- **Semantic HTML** — `<nav>`, `<main>`, `<article>`
- **No pure white on dark backgrounds** — use Warm Bone #F2F2E2

---

## 10. KNOWN ISSUES & LIMITATIONS

| Issue | Status | Workaround |
|-------|--------|------------|
| LSP doesn't work for Astro | Known | Use `npx astro check` instead |
| Vercel CDN cache | Known | Manual cache purge in Vercel dashboard |
| Two Vercel projects | Needs cleanup | Delete old project in Vercel dashboard |
| GSC 42 pages not indexed | Needs investigation | User needs to log in and check |
| E-E-A-T field data | Time-based | Needs real traffic to update |

---

## 11. SPRINT HISTORY (RECENT COMPLETED)

### Sprint 57 (Apr 25) ✅
- OCP Open Data Page built (`maine-ocp-license-map.astro`)
- Newsletter page built
- Mantis Ad Network docs added to reference.md
- Outbound link nofollow audit (Leafly, Ganjapreneur)

### Sprint 56 (Apr 24) ✅
- 13 thin pages expanded to 1,500+ words
- Citation outreach contacts researched (20 Maine contacts in `scripts/data/maine-cannabis-contacts.json`)
- Drip campaign concepts designed (EmailPipeline on Windows — templates not in repo)

### Sprint 55 (Apr 24) ✅
- PDF Magnet landing page built
- Content humanized (36 promo words, 21 AI phrases removed)
- 3 thinnest pages expanded (index, events, insurance)
- FAQ schema added to 13 thin pages
- Nav keyboard accessibility fixed

### Sprint 53 (Apr 23) ✅
- JSON-LD parse errors fixed (set:html → set:text)
- Duplicate main landmark fixed
- Homepage aria-label fixed
- 32 inline JSON-LD scripts converted to set:text

### Sprint 48 (Apr 22) ✅
- E-E-A-T author bylines (4 pen names)
- Full 79-page author byline rollout
- Typecheck errors fixed (0 errors)
- Navigation redesign (5-column topic dropdown)

---

## 12. WHAT NOT TO DO

- **Do NOT** modify `astro.config.mjs` without flagging in Hub
- **Do NOT** modify `vercel.json` without flagging in Hub
- **Do NOT** run `npm run build` unannounced — always warn first
- **Do NOT** propose or build state-specific hubs for states other than Maine
- **Do NOT** use trailing slashes in internal links
- **Do NOT** use pure white (#FFF) on dark backgrounds
- **Do NOT** leave Playwright browser open (100-750 MB memory leak per instance)

---

## 13. FIRST ACTIONS ON MINT-PC

1. **Read AGENTS.md** — `cat AGENTS.md` before doing anything else
2. **Read BOT_COLLABORATION_HUB.md** — understand sprint history
3. **Clone repo** — `git clone` to mint-pc
4. **Install deps** — `npm install`
5. **Copy credentials** — fal.ai key, Brave Search key, Purelymail credentials
6. **Copy OpenCode config** — `~/.config/opencode/` from Windows
7. **Verify build** — `npm run build`
8. **Typecheck** — `npx astro check`
9. **Read reference/project-status.md** — understand current metrics
10. **Review pending items** — Section 6 above

---

## 14. TRANSFER CHECKLIST

Use this to verify you've transferred everything:

- [ ] fal.ai API key (`C:\Users\Steve\Documents\DO_NOT_EXPOSE_THIS_KEY.txt`)
- [ ] Brave Search API key (from brave.com/search/api/)
- [ ] Purelymail SMTP credentials (`config/credentials/mainedispensaryguide.env`)
- [ ] OpenCode config directory (`~/.config/opencode/`)
- [ ] MiniMax API key (in `~/.config/opencode/opencode.json`)

**Note:** EmailPipeline was Windows-specific and NOT transferred. Contact data and templates are in the repo — rebuild on Linux.

---

## 15. CONTACT & OWNERSHIP

- **Owner:** Steve Kelly (steve@mainedispensaryguide.com)
- **Domain:** Registered at Porkbun
- **Hosting:** Vercel (project-1)
- **Repository:** GitHub `project-1`
- **Primary Agent:** Hermes-Agent (mint-pc)
- **Previous Agent:** OpenCode MiniMax-M2.7 (Windows laptop)

---

*Document generated: May 12, 2026 EDT*
*Generation reason: Laptop → Mint PC handover — comprehensive passdown*
*Version: 1.0*
