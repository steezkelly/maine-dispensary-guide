# SCRIPTS.md — Maine Dispensary Guide Script Inventory

**Last updated:** 2026-04-20 (Sprint 48)
**Total scripts:** 31 (18 active, 13 deleted)

---

## Cluster Map

```
scripts/
├── content/          # Content quality auditing and fixing
├── git/              # Git workflow helpers (typecheck, handoff)
├── image/            # AI image generation and auditing
├── link/             # Internal link building automation
├── search/           # Web and research search tools
└── [flat]            # Ops scripts (email, health, maintenance)
```

---

## content/ — Content Quality

### `audit-fix-loop.cjs`
**Purpose:** Scans .astro files for thin content and missing meta descriptions.
**Usage:**
```bash
node scripts/content/audit-fix-loop.cjs                    # Dry-run (report only)
node scripts/content/audit-fix-loop.cjs --apply           # Apply fixes
node scripts/content/audit-fix-loop.cjs --url https://...  # Custom target
```
**Notes:** Dry-run by default. `--apply` flag required to modify files. Adds template paragraphs, FAQ skeletons, and meta descriptions.

---

## git/ — Git Workflow

### `pre-push-verify.cjs`
**Purpose:** Fail-closed verification and release-governance gate for changed Astro/TypeScript code, root Node scripts, generated-data dependencies, and governed release-policy surfaces. It replaces the previous `delta-typecheck.cjs` and runs the shared governance inventory before any diff-dependent early exit.

**Maintained passes, in order:**
1. Release-governance contracts for the canonical hook, CI, package-script authorities, verifier, and active operating guidance.
2. autoRelated-freshness validation without mutating or staging generated files.
3. Fast esbuild parsing for changed Astro frontmatter.
4. `--fast-only` / `--data-only` assertions when requested.
5. Root Node syntax checks.
6. Changed-file-filtered `npx astro check`.
7. Optional preview or explicitly authorized production smoke checks.
8. sitemap-postprocess, docs-vs-code, compressed-frontmatter, and hero-image-naming checks.

**Usage:**
```bash
node scripts/git/pre-push-verify.cjs                         # complete non-smoke gate
node scripts/git/pre-push-verify.cjs --fast-only             # governance + freshness + fast parse
node scripts/git/pre-push-verify.cjs --ref=origin/main       # exact origin/main..HEAD range
: "${BASE_SHA:?Set BASE_SHA to the exact base commit}"
: "${CANDIDATE_SHA:?Set CANDIDATE_SHA to the exact candidate commit}"
node scripts/git/pre-push-verify.cjs --ref="$BASE_SHA" --target="$CANDIDATE_SHA" # immutable object range used by the hook
MDG_PREVIEW_URL=https://your-exact-preview.vercel.app node scripts/git/pre-push-verify.cjs --ref=origin/main --with-smoke
```

`--ref` always names the base of `<base>..<candidate>`; the candidate defaults to `HEAD`. `--target` is accepted only with `--ref`, must resolve to the checked-out `HEAD`, and requires a clean working tree so all filesystem-based checks inspect that exact object. Empty, bare, duplicate, or unknown options fail closed with exit `2`; a dirty explicit-target worktree exits `3`.

**Exit codes:**
- `0` clean
- `1` esbuild parse error
- `2` invalid/unknown exact-range option or ref, or Astro check error
- `3` environment/repository error
- `6` sitemap-postprocess failure or required checker absent
- `7` docs-vs-code failure or required checker absent
- `8` compressed-frontmatter failure or required checker absent
- `9` hero-image-naming failure or required checker absent
- `10` root Node syntax failure
- `11` data-only diff assertion failure
- `12` smoke target or smoke assertion failure
- `13` autoRelated-freshness failure or required input absent
- `16` release-governance failure or required governance input absent

**Notes:** Auto-wired as a pre-push git hook via `core.hooksPath .githooks` (see `install-hooks.cjs`). Hook failures are release blockers: repair the verifier or hook, rerun the focused governance contracts, and retry the normal push. Bypassing the hook is forbidden.

### `install-hooks.cjs`
**Purpose:** Set `core.hooksPath` to `.githooks/` so the pre-push hook ships with the repo. Idempotent. Run once per clone.

**Usage:**
```bash
node scripts/git/install-hooks.cjs
# or via npm:
npm run hooks:install
```

### `delta-typecheck.cjs`
**DEPRECATED 2026-06-07.** Replaced by `pre-push-verify.cjs`. Kept in tree for now for reference; the hardcoded `C:/Users/Steve/OpenCode Projects/project-1` path is the bug. Use `pre-push-verify.cjs` instead.

### `sprint-handoff.cjs`
**Purpose:** Generate a structured sprint summary entry for BOT_COLLABORATION_HUB.md from git history.
**Usage:**
```bash
node scripts/git/sprint-handoff.cjs
```
**Output:** Commits, files changed (categorized), line diff, and a ready-to-paste Hub entry.
**Notes:** Handles uncommitted changes + committed changes separately.

---

## image/ — AI Image Generation + Audit

### `fal-image-gen.cjs`
**Purpose:** CLI for fal.ai image generation (FLUX 2 Pro, FLUX Dev, FLUX Schnell, Ideogram 3).
**Usage:**
```bash
node scripts/image/fal-image-gen.cjs "aerial view of Portland Maine waterfront" flux-2-pro 1024 768
node scripts/image/fal-image-gen.cjs "city guide hero" flux-schnell 1024 576
```
**Models:** `flux-schnell` (fast/cheap), `flux-dev`, `flux-2-pro` (quality), `ideogram-3` (text)
**API Key:** Stored in `C:\Users\Steve\Documents\DO_NOT_EXPOSE_THIS_KEY.txt`

### `image-pipeline.cjs`
**Purpose:** Batch generate + download + path-update for multiple images.
**Usage:** (run from project root, configure prompts inside script)
```bash
node scripts/image/image-pipeline.cjs
```

### `image-audit.cjs`
**Purpose:** Verify all generated images are embedded in pages and no orphans exist.
**Usage:**
```bash
node scripts/image/image-audit.cjs
```

---

## link/ — Internal Link Building

### `link-architect.cjs`
**Purpose:** Link glossary terms to `/glossary/#anchor` in all guide pages.
**Usage:**
```bash
node scripts/link/link-architect.cjs
```
**Notes:** Runs on all .astro files. Deduplicates existing links.

### `add-contextual-links.cjs`
**Purpose:** Add contextual inline links to guide pages based on topic matching.
**Usage:**
```bash
node scripts/link/add-contextual-links.cjs
```

### `add-related-guides.cjs`
**Purpose:** Add "Related Guides" section to pages based on topic intersection.
**Usage:**
```bash
node scripts/link/add-related-guides.cjs
```

### `add-nearby-markets.cjs`
**Purpose:** Add "Nearby Markets" links to city guide pages.
**Usage:**
```bash
node scripts/link/add-nearby-markets.cjs
```

### `link-remaining-orphans.cjs`
**Purpose:** Find and fix pages with zero internal links pointing to them.
**Usage:**
```bash
node scripts/link/link-remaining-orphans.cjs
```

### `fix-links.cjs`
**Purpose:** One-off link patching (Biddeford redirect fix, etc.).
**Usage:** (configure target inside script)
```bash
node scripts/link/fix-links.cjs
```

---

## search/ — Web & Research Search

### `brave-search.cjs`
**Purpose:** Primary web search via Brave Search API (1000 req/month free).
**Usage:**
```bash
node scripts/search/brave-search.cjs "Maine cannabis licensing requirements OCP"
```
**Notes:** Falls back to browser-search.cjs if MCP is unavailable.

### `wikipedia-search.cjs`
**Purpose:** Free research search using Wikipedia API. Good for citations.
**Usage:**
```bash
node scripts/search/wikipedia-search.cjs "Maine cannabis law"
```

### `browser-search.cjs`
**Purpose:** Fallback search using Playwright MCP browser when other methods unavailable.
**Usage:**
```bash
node scripts/search/browser-search.cjs "query"
```

---

## [flat] — Operations Scripts

### `send-email.cjs`
**Purpose:** Send emails via Purelymail SMTP for domain warm-up campaigns.
**Usage:**
```bash
node scripts/send-email.cjs --to "recipient@example.com" --subject "Subject" --body "Body text"
```
**Credentials:** Purelymail app password stored in `config/credentials/mainedispensaryguide.env`
  (legacy fallback: `MAINE_DISPENSARYGUIDE_SMTP_CREDENTIALS` / `EMAIL_PIPELINE_CREDENTIALS` env var, then `C:\\Users\\Steve\\Documents\\purelymail-smtp.txt`).
**Tracking:** `public/data/email-tracking.json`

### `track-email.cjs`
**Purpose:** Track email opens/replies in the email tracking JSON.
**Usage:**
```bash
node scripts/track-email.cjs --message-id "abc123" --opened
```

### `add-image-schema.cjs`
**Purpose:** Add ImageObject JSON-LD schema to pages with hero images.
**Usage:**
```bash
node scripts/add-image-schema.cjs
```

### `update-hero-images.cjs`
**Purpose:** Batch update hero image references across guide pages.
**Usage:** (configure new image URLs inside script)
```bash
node scripts/update-hero-images.cjs
```

### `health-check.ps1`
**Purpose:** PowerShell health check — validates build, links, and deployment.
**Usage:**
```bash
npm run health-check
```

### `cleanup-opencode.ps1`
**Purpose:** Clean up OpenCode Desktop temporary files and reset LSP state.
**Usage:**
```bash
powershell -ExecutionPolicy Bypass -File scripts/cleanup-opencode.ps1
```

### `diagnose-opencode.ps1`
**Purpose:** Diagnose OpenCode Desktop issues (LSP, agent communication).
**Usage:**
```bash
powershell -ExecutionPolicy Bypass -File scripts/diagnose-opencode.ps1
```

### `self-improving-maintenance.ps1`
**Purpose:** Run self-improving skill maintenance (memory cleanup, correction analysis).
**Usage:**
```bash
powershell -ExecutionPolicy Bypass -File scripts/self-improving-maintenance.ps1
```

---

## Deleted Scripts (Stale/Deprecated)

| Script | Reason Deleted |
|--------|-----------------|
| `orphan-count.cjs` | Replaced by `link/link-remaining-orphans.cjs` |
| `verify-links.cjs` | Functionality covered by `link/fix-links.cjs` |
| `fix-flesch.ps1` | Not used, readability scores not tracked |
| `check-deploy.ps1` | Redundant with `health-check.ps1` |
| `auto-link.ps1` | Replaced by `link/add-contextual-links.cjs` |
| `searxng-search.cjs` | Replaced by `search/brave-search.cjs` |
| `test_fal_image.ps1` | Replaced by `fal-image-gen.cjs` |
| `download-heroes.cjs` | Replaced by `image/image-pipeline.cjs` |
| `download-infographics.cjs` | Not needed, embedded in pipeline |
| `fix-old-orchard.js` | One-off, now archived |
| `analyze-launch-checklist.cjs` | Not used |
| `setup-maintenance-schedule.ps1` | Not used |
| `playwright-mcp-search.md` | Deprecated, use `browser-search.cjs` |

---

## Usage Summary

| Task | Script |
|------|--------|
| Typecheck only changed files | `git/delta-typecheck.cjs` |
| Generate Hub entry from git | `git/sprint-handoff.cjs` |
| Audit content quality | `content/audit-fix-loop.cjs --dry-run` |
| Fix content issues | `content/audit-fix-loop.cjs --apply` |
| Generate AI image | `image/fal-image-gen.cjs "prompt" [model]` |
| Batch generate images | `image/image-pipeline.cjs` |
| Verify image references | `image/image-audit.cjs` |
| Link glossary terms | `link/link-architect.cjs` |
| Add contextual links | `link/add-contextual-links.cjs` |
| Fix orphan pages | `link/link-remaining-orphans.cjs` |
| Web search | `search/brave-search.cjs "query"` |
| Wikipedia research | `search/wikipedia-search.cjs "topic"` |
| Send outreach email | `send-email.cjs --to "x" --subject "x" --body "x"` |
| Health check | `npm run health-check` |

---

*For agent collaboration, see `BOT_COLLABORATION_HUB.md`. For workflows, see `reference/workflows.md`.*
