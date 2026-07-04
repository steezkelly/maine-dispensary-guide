# MDG Session Passdown — 2026-07-04 (session end)

## State at session close
- Branch: `main`
- HEAD: `a65eb49a`
- Working tree clean (only `docs/AFFILIATE_OUTREACH.md` is dirty — left by parallel session, do NOT touch it)
- Production: deployed via Vercel auto on push; the new pages shipped this session will go live ~5 min after their commits
- Build state: fresh dist/, 244+ routes
- Memory updated with `OPTIMAL VERIFY PATTERN` block

## What was shipped this session (commits, oldest → newest)
1. `73164eb4` — created skill `cannabis-content-ymyl-audit`
2. `a74dddb1` — vendor directory expanded 9→14 items (closes B2B GSC queries)
3. `e0619385` — new `cannabis-edible-dose-calculator-maine` page (has CSS bug, see below)
4. `a85fcd8a` — fixed CSS syntax error in dose calculator (stray `<style>` tag)
5. `8f7c5fbf` — plan doc update
6. `42ef6465` — plan doc update (verify pattern docs)
7. `3dfb9aac` — Caribou YMYL correction
8. `64c97855` — Opt-In Tracker Caribou row YMYL correction
9. `286db878` — Dover-Foxcroft YMYL correction
10. `ccb90e70` — Dexter + Milo primary-source accuracy fixes
11. `d827b749` — Cannabis edibles compliance guide YMYL audit (100mg→200mg, 15%→10%, fabricated LD 1713→real PL 2025 c. 390)
12. `a65eb49a` — plan doc final update

## Six YMYL corrections shipped
1. Caribou guide (medical-only, 2 dispensaries, not 5 adult-use)
2. Opt-In Tracker Caribou row (added Sept 2024 retail ban)
3. Dover-Foxcroft guide (Dab Bar claim removed — operator domain parked)
4. Dexter guide (full address, phone, hours, 33-town service area)
5. Milo guide (phone added)
6. Edibles compliance guide (per-package cap, variance, fabricated bill number)

## MANDATORY: Load the skill before doing YMYL content work
Skill: `/home/steve/.hermes/skills/software-development/cannabis-content-ymyl-audit/SKILL.md`
This document exists because every YMYL content change should follow its discipline.
Hint: `skill_view(name='cannabis-content-ymyl-audit')` at session start if the work involves cannabis or other regulated-operator topics.

## MANDATORY: Use the optimal verify pattern
DO NOT use `npx astro check` standalone (3 min, lags the host) or `npm run build` alone.
USE the project's blessed pre-push gate:
```
cd /home/steve/projects/maine-dispensary-guide && node scripts/git/pre-push-verify.cjs --skip-smoke-200 --skip-smoke-img-200 --skip-sitemap-postprocess --skip-docs-vs-code
```
On a clean tree (no .astro/.ts changes) this is ~0.05s. With one file changed: ~40s.
The `--skip-*` flags are CORRECT for local iteration — smoke checks hit the live site (mainedispensaryguide.com) and consume bandwidth; run them once before final push if you want them.
Run the FULL pre-push-verify (no skips) once before pushing. Only run `--fast-only` for sub-second parse-only checks when iterating on a single file's frontmatter.

## Host environment
- GMKTec NUCBOX G3 Plus, 16 GB DDR4, Manjaro, KDE/Wayland
- Buildable; free -m should show >1 GB available
- Build times 15-22s typical
- User feedback: do NOT close Firefox while running heavy verify (the user explicitly shut Firefox to free PC for verification)
- Push method: `git push --no-verify origin main` (pre-push hook requires dist/)
- Git identity per-commit: `git -c user.name="Hermes" -c user.email="hermes@nous.local" commit ...`

## Tooling
- mmx-cli v1.0.16 at `/home/steve/.local/bin/mmx` (use for AI hero images with `--prompt`, `--aspect-ratio 16:9`, `--out-dir`, `--out-prefix`, `--quiet`)
- ImageMagick `convert` + `avifenc` for 6-variant image pipeline
- Parallel web search + extract via `hermes_tools` (or `from hermes_tools import ...` in execute_code)

## Quick TODO queue (ranked by impact)

### HIGH — YMYL audit continued
The 6 corrections shipped this session leave a queue. The pattern: directory-only sourcing (Weedmaps, public dispensary listings, parked operator domains) is the dominant failure mode. The next session should:

1. **Audit Opt-In Tracker Aroostook rows** end-to-end against The County / Bangor Daily News / Portland Press Herald reporting. Specifically: Houlton, Presque Isle, Fort Fairfield, Caribou (other Aroostook towns). The tracker has 200+ rows; most are correct, but check each Maine row against primary sources.

2. **Audit town guides with directory-only sourcing** for the same dispensary-count / opt-in-status pattern. Highest priority: 
   - Houlton (built round 94+ — verify primary sourcing)
   - Presque Isle (built round 91 — same)
   - Milo and Dover-Foxcroft corrections already shipped (rounds 96, 98)
   - Any other town guide whose body contradicts its Opt-In Tracker row

3. **Audit the consumer-facing Maine cannabis laws pages** (maine-cannabis-laws, maine-cannabis-license, maine-metrc-compliance-guide, maine-cannabis-cultivation-guide, maine-cannabis-market, roi-calculator, maine-cannabis-cultivation-license-2026). These all paraphrase OCP/Title 28-B content. Spot-check each against the statute text.

### MEDIUM — Operator-facing density
The session shipped 5+ YMYL fixes. Operators rely on these for real business decisions. Additional high-value operator content:
- `maine-cannabis-business-insurance` — currently a thin stub; could be expanded
- `maine-cannabis-budtender-careers` — added FAQ in round 85; verify it actually answers what budtenders ask
- Vendor directory B2B sections — added round 100; verify entries are still valid

### MEDIUM — Consumer-facing depth
The dose calculator + terpene article cover two of the three priority consumer-product topics. Still gaps:
- **Edibles deeper guide** — distinct from compliance; consumer-side "which edible is right for me"
- **Tincture/sublingual guide** — major consumption method not covered
- **Cannabis topicals guide** — increasingly important category

### LOW — Useful but not blocking
- Pull the next GSC export when available; measure whether Sprints 85-88 work + this session's changes moved queries into top 10
- Test whitespace-rendering of the comparison table in the edibles compliance guide on mobile (Massachusetts has a different package cap; the table may need a separate mobile layout)
- Add a "Last verified" indicator to all session-built pages that already include verification badges, for YMYL audit-traceability

## Architectural patterns to preserve

- **Cite primary sources for every YMYL claim.** The Maine Revised Statutes (https://legislature.maine.gov/statutes/), local Maine news (The County, Bangor Daily News, Portland Press Herald), and operator sites that are NOT parked are primary; Weedmaps / Leafbuyer / Yelp are secondary.
- **Always include a verification badge** ("Last verified 2026-07-04") on operator-facing pages, with a recovery path ("Verify directly with the operator") for stale data.
- **JSON-LD must round-trip** through Python's `json.loads()` after extraction. Don't rely on visual diff.
- **CSS `<style>` blocks** — if patching in a new one, make sure the surrounding `<style>` is properly closed (the dose calculator caught one bug this way).
- **Image variants pipeline** for new hero images: 6 files per source (.jpg/.webp/.avif × 1280x720/640x360). Use the helper Python script.
- **Orphan pages** — `find-a-dispensary` uses JSON `"href":` form which the orphan detector doesn't match. Add an HTML `<a href="...">` in the parent guide's Related Guides section.

## DO NOT TOUCH
- `docs/AFFILIATE_OUTREACH.md` — modified by parallel session, not committed, leave it alone
- The `/home/steve/.local/bin/mmx` install — it's a user-installed tool

## Session start checklist for the next agent
1. `cd /home/steve/projects/maine-dispensary-guide`
2. `git log --oneline -20` — confirm you see `a65eb49a` at HEAD
3. `git status` — should show only `docs/AFFILIATE_OUTREACH.md` as modified
4. `free -m` — confirm >1 GB available
5. `skill_view(name='cannabis-content-ymyl-audit')` — load the YMYL skill if doing content work
6. `cat /home/steve/.hermes/memories/MEMORY.md` — read the project's persistent notes
7. Pick up from the YMYL audit queue (HIGH priority, ranked above)

---
End of session.
