# Workflows — Maine Dispensary Guide

> Operational procedures for this Windows-based development environment.

## Pre-Flight Validation (Windows / Complex Operations)

Before implementing features that use file operations, browser automation, or shell commands:

1. Verify tool availability: run `--version` or `--help` for the primary tool
2. Test a minimal operation in a temp location (touch a test file, navigate to a test URL)
3. Confirm the target directory exists and is writable
4. Check for Windows-incompatible patterns: `f.split('/').pop()` → use `path.basename()` instead

This prevents cascading failures in long sessions. **183 command failures in a recent 14-day period** were concentrated in the most ambitious sessions — most were path/permission issues caught late.

## End-of-Sprint Checklist

At the end of every sprint, run before declaring the session done:

1. `git status` — confirm all changes committed
2. Compare `BOT_COLLABORATION_HUB.md` latest entry against `project-todos.md` — catch completed items still marked pending
3. `npm run build` — confirm production build succeeds
4. `npx vercel --prod --yes` — confirm deploy completed cleanly

Commit and push any stragglers. This check has caught desync issues where `project-todos.md` still had items marked pending even after they'd been completed in a prior session.

## Windows-Specific Patterns

When working in this Windows environment:

1. **Use `workdir` parameter** instead of `cd && command` chains in bash calls
2. **WSL available** — for Unix-only utilities (tail, grep, etc.), use `wsl bash -c "command"` instead of PowerShell equivalents
   - Example: `wsl bash -c "tail -20 file.txt"` instead of `Get-Content file.txt | Select-Object -Last 20`
3. **Use `path.basename()`** for cross-platform path splitting — `f.split('/').pop()` fails on Windows `\`
4. **Git CRLF warnings** — commit anyway unless the file is binary; `LF will be replaced by CRLF` is a warning, not an error
5. **WSL paths** — when using `wsl bash -c`, use Linux-style paths (e.g., `/mnt/c/Users/Steve/...` or relative paths from wsl's cwd)

For comprehensive PowerShell patterns and Unix→PowerShell reference, see `reference/environment.md`.

## Todo Checkpoint Workflow (Multi-Hour Sessions)

For sessions expected to exceed 30 minutes, use explicit phase checkpoints:

```
TODOs:
[ ] Phase 1: Understand project structure
[ ] Phase 2: Implement feature
[ ] Phase 3: Verify and test
[ ] Phase 4: Document changes
```

## Image Generation Pipeline (SPRINT 42 Lessons)

### The Problem
Manual image pipeline was error-prone across 86 images (74 heroes + 12 infographics):
1. Generate via `fal-image-gen.cjs` → get fal.media URL
2. Download to `public/images/heroes/`
3. Extract Unsplash photo ID, convert to slug, rename
4. Run `update-hero-images.cjs` to replace URLs in pages
5. Manually verify each image was actually embedded

### What Failed
- **No content policy research upfront** — "cannabis shop" was rejected by fal.ai. Had to work around per-image, slowing batch generation significantly.
- **No correlation check** — Could not answer "are all generated images actually embedded in pages?" without manually grepping.
- **URL replacement had no dry-run** — Had to read files back to verify correctness.
- **Windows path handling** — `f.split('/').pop()` fails on Windows `\` — caused filename extraction errors.

### The Better Workflow

**Step 0 — Research first:**
Before batch generating images, research content policy constraints:
- Test a prompt with the target keyword before committing to batch
- Identify banned terms (e.g., "cannabis shop", "dispensary exterior") and their alternatives (e.g., "coastal business storefront")

**Step 1 — Create manifest:**
Build a JSON manifest describing all images to generate:
```json
[
  {
    "slug": "portland-dispensary-guide",
    "prompt": "Maine coastal cityscape...",
    "model": "flux-2-pro",
    "target": "src/pages/guides/portland-dispensary-guide.astro",
    "field": "heroImage"
  }
]
```

**Step 2 — Run unified pipeline:**
```bash
node scripts/image-pipeline.cjs manifest.json    # normal run
node scripts/image-pipeline.cjs manifest.json --force   # regenerate all
```

**Step 3 — Audit before deploying:**
```bash
node scripts/image-audit.cjs all    # full audit
node scripts/image-audit.cjs heroes # heroes only
node scripts/image-audit.cjs infographics --schema  # infographic schema check
```

**Step 4 — Verify URL replacement (pre/post):**
```bash
# Before replacement
grep -c "images.unsplash.com" src/pages/guides/
# Should return count of Unsplash URLs

# After replacement
grep -c "images.unsplash.com" src/pages/guides/
# Should return 0

grep -c "/images/heroes/" src/pages/guides/
# Should return count of local hero references
```

### fal.ai Content Policy (Known Rejections)

**Important:** fal.ai's Acceptable Use Policy does NOT explicitly ban cannabis imagery. The `content_policy_violation` errors come from the underlying models (Flux, Ideogram) which apply their own safety filters. These are model-specific, not platform-wide.

**Known rejected terms (model-level filters):**
| Banned Term | Alternative |
|------------|-------------|
| cannabis shop | coastal business storefront |
| dispensary exterior | Maine storefront, wellness business |
| marijuana plant close-up | botanical illustration, green leaf study |
| psychedelic mushroom | fungal illustration, organic pattern |

**Test any cannabis/cannabis-adjacent imagery with a single image before batch.** If rejected, try:
1. Remove the flagged keyword entirely
2. Use indirect descriptors ("wellness business", "botanical", "coastal storefront")
3. Try a different model (flux-schnell has looser filters than flux-2-pro)

### Available Scripts
| Script | Purpose |
|--------|---------|
| `scripts/image-pipeline.cjs` | Unified generate + download + update (SPRINT 42 improvement) |
| `scripts/image-audit.cjs` | Audit generated vs. embedded vs. orphaned images |
| `scripts/fal-image-gen.cjs` | Direct fal.ai generation (single image) |
| `scripts/download-heroes.cjs` | Download hero images from fal.media URLs |
| `scripts/download-infographics.cjs` | Download infographic images |
| `scripts/update-hero-images.cjs` | Replace Unsplash URLs with local paths |

### Image Directory Structure
```
public/images/
├── heroes/          # 74 hero images (1200x400)
├── infographics/     # 12 infographic images (800x592)
└── content/         # Reserved for in-body content images (empty as of SPRINT 42)
```
