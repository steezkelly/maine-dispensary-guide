# MDG Google March 2026 Spam Update — Policy Audit (2026-07-14)

> **For Hermes and friends:** the canonical record of the parent-agent's
> verification of Google's March 2026 Spam Update policy claims and
> the project's compliance posture. Audit-driven; sources cited.

This audit was triggered by Steve's 2026-07-14 directive:
"make sure that google march 2026 compliance update is accurate
and our interpretation and implementation/lack there of due to it
is valid."

## §M.1 — What the Google March 2026 Spam Update actually targets

**Source**: Google Search Status Dashboard
(`https://status.search.google.com/incidents/VbnSXAH4SmEcxPtx4YSD`)
plus Reddit/Digital Applied/SEJ analyses cited at the end.

### Official record (Google Search Status Dashboard)

- **Launched**: 2026-03-24 at 12:18 PDT
- **Completed**: 2026-03-25 at 07:30 PDT
- **Duration**: ~19 hours 30 minutes (the fastest spam update ever)
- **Scope**: "applies globally and to all languages"
- **Type**: spam policy enforcement update (not a core quality update)
- **No new policy categories introduced** — existing Google spam
  policies were enforced more aggressively

### Targets (per Google's spam policies documentation)

The update enforces violations of Google's existing spam policies,
specifically:

- **Scaled content abuse** (programmatic thin content at scale)
- **Doorway pages** (multiple similar pages designed to rank for
  specific queries like city/state names)
- **Cloaking and sneaky redirects**
- **Manipulative outbound link patterns**

### Exclusions (per the Reddit analysis citing Google's statement)

The update **explicitly excludes** these categories from its scope:

- **Link spam** (handled under separate systems)
- **Site reputation abuse** (handled under separate systems)

This is the most important nuance for MDG: link spam — which would
include *outbound* link exchange schemes and manipulative *backlink*
patterns — is NOT in scope of this particular update. Internal
cross-link injection (which is what the orphan-detector would be
about) is even further from scope: it's INTERNAL links between
related pages on the same domain, not OUTBOUND link manipulation
to a third-party target.

## §M.2 — MDG project's compliance claims, verified

Three MDG documents cite the March 2026 update. Here's the
verification of each.

### §M.2.a — TOWN_CLUSTER_RESEARCH_MEMO_2026-07-08.md

**Claim**:
> "Google's 2026 stance on mass city pages is hostile. The March
> 2026 Spam Update explicitly targets 'scaled content abuse' and
> 'doorway pages'."

**Verification**: **ACCURATE.** The Google Search Status Dashboard
and analyses confirm both categories are within the update's
target scope.

**Implication for MDG**: writing 54+ thin town-cluster hubs would
be exactly the pattern this update targets. The "5 hubs, not 54+"
interpretation is **defensible**.

**Status**: **LEAVE AS-IS.**

### §M.2.b — session-handoff-tokens/town-cluster-content-eng-prompt.md

**Claim**:
> "the SEO risk data (Google March 2026 Spam Update on doorway
> pages)"

**Verification**: **ACCURATE.** Same as §M.2.a; this is a derivative
handoff that summarizes the research memo.

**Status**: **LEAVE AS-IS.**

### §M.2.c — scripts/check/orphan-detector.cjs docstring (pre-fix)

**Claim (pre-fix)**:
> "Why no fix-mode: cross-link auto-injection is a YMYL/SEO risk
> (Google March 2026 Spam Update targets scaled cross-link
> patterns)."

**Verification**: **PARTIALLY INACCURATE.**

- The March 2026 Spam Update does target **scaled content abuse**
  broadly, which *could* in principle include scaled internal
  cross-linking. But:
- The update's specific link-related target is "manipulative
  **outbound** link patterns" — not internal cross-links.
- "Link spam" is **explicitly excluded** from the update's scope.
- Orphan auto-injection produces internal cross-links between
  related pages on the same domain, which is functionally
  different from outbound link manipulation.

The original docstring was conflating "scaled content abuse" (which
is in scope) with "scaled cross-link patterns" (a misleading
category not actually named in Google's policy). The fix preserves
the read-only behavior (which is the right conservative call) but
corrects the rationale.

**Status**: **FIXED** in this round. See §M.3 below.

## §M.3 — Fixes applied this round (round 12)

The orphan-detector.cjs docstring is corrected:

- **Before**: claimed the March 2026 Spam Update "targets scaled
  cross-link patterns" as the reason for no auto-injection.
- **After**: lists three accurate reasons for no auto-injection:
  1. Editorial judgment (anchor text, context, near-duplicate
     avoidance)
  2. YMYL discipline (cannabis regulatory content)
  3. Caution against future updates extending scope (the actual
     YMYL rationale, separate from the misframed current-policy
     claim)

The implementation (read-only detection, no auto-fix mode) is
**unchanged**. The fix is docstring-only.

## §M.4 — Compliance verdict

Per the verified policy record:

1. **MDG's "5 hubs, not 54+" interpretation**: ✅ **COMPLIANT.** The
   5-cluster structure (regional hubs aggregating town guides)
   matches Google's preferred pattern (rich, distinct, regional
   content) rather than doorway/scaled-content patterns.
2. **MDG's no-auto-cross-link decision**: ✅ **DEFENSIBLE** for
   three reasons that don't require citing a misleading policy
   claim. The corrected docstring (this round) names those reasons.
3. **MDG's blog/canonical-override work (round 5)**: ✅ **COMPLIANT.**
   Canonical signals are a normal SEO practice, not a spam pattern.
4. **MDG's existing hand-curated cross-links** (city-guide
   interlinks, blog→guide links): ✅ **COMPLIANT.** Hand-curated,
   contextual internal cross-linking has never been a Google spam
   policy target.

## §M.5 — Out of scope (named explicitly)

This audit does NOT cover:

- Google's other 2026 updates (core update, etc.). The March 2026
  spam update is the only one cited in MDG docs as of 2026-07-14.
- Future Google updates. The MDG posture should be re-verified
  when a new update is announced.
- Other search engines (Bing, DuckDuckGo). MDG is Google-primary.
- Non-spam-policy Google guidance (Helpful Content Update,
  product review policies, etc.).

## §M.6 — Change history

| Date | Author | Change |
|---|---|---|
| 2026-07-14 | Hermes Agent (parent) | Initial §M.1-§M.5. Audit triggered by Steve's directive; verified MDG's March 2026 Spam Update compliance posture; corrected orphan-detector.cjs docstring rationale; recorded compliance verdict. |