# Market-Stats Explainer — No-Autoplay Decision Record

**Date:** 2026-07-14
**Status:** implemented on a dedicated feature branch; pending PR review and deployment
**Authority:** Steve explicitly approved the no-autoplay direction.

## Decision

The explainer video on `/market-stats` must wait for a deliberate visitor action. The change removes the HTML `autoplay` attribute while preserving the video poster, native controls, muted state, inline-playback support, loop behavior, and metadata-only preload.

## Scope

- Branch: `fix/market-stats-no-autoplay-20260714`
- Source: `apps/maine-cannabis/src/pages/market-stats.astro`
- Regression: `apps/maine-cannabis/src/pages/__tests__/market-stats-video.test.cjs`
- Pull request: https://github.com/steezkelly/maine-dispensary-guide/pull/32

This is a narrow UX correction. It does not change analytics implementation, publish a production deployment, or authorize autonomous optimization.

## Verification

1. The focused regression first failed because the source contained `autoplay`.
2. The source was changed to require explicit playback while retaining visible native controls.
3. The focused Node test passed.
4. `npm run verify:iterate` passed.
5. The pre-push verification passed: parsed Astro, filtered Astro check, sitemap, docs-vs-code, compressed-frontmatter, and hero-image checks.

## Coordination

This decision record intentionally lives in a dated low-conflict document. It avoids modifying `BOT_COLLABORATION_HUB.md` during parallel design/integration work, consistent with the Round 17 coordination decision.
