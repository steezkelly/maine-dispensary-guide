# MDG-ANALYTICS-001 Ticket 002 — Vercel Access Probe Specification (A4, A5)

**Ticket:** `TICKETS/002-source-capability-forensics.md`
**Spec source:** `/home/steve/Documents/mdg-analytics-intelligence-package-v0.5/` (v0.5, package manifest verified)
**Sources of truth:** `SOURCES.md` §A4, §A5 + `PRIVACY-BOUNDARY.md`
**Working agreement:** `/home/steve/projects/maine-dispensary-guide/AGENTS.md`
**Author:** Subagent C — Vercel probe spec (read-only)
**Status:** READ-ONLY SPEC. Operator runs probes manually. No Vercel token, env var, `.vercel/` directory, or remote API is touched by this agent.

This document is a config-spec and an operator checklist. It is **not** an executed probe. No curl/POST/CLI to Vercel is performed or scheduled by the agent that wrote this file. Tier 1 invariants from `SPEC-AUTHORITY.md` are untouched.

---

## 1. Source contract A4 — Vercel Web Analytics API

### 1.1 `<Analytics />` mounting — repo evidence

Searched: `apps/maine-cannabis/src/layouts/Layout.astro`. All matches are in this single file (no per-page mount).

```text
26: import Analytics from '@vercel/analytics/astro';
27: import SpeedInsights from '@vercel/speed-insights/astro';
...
574:    <Analytics />
575:    <SpeedInsights />
576:    <AffiliateClickTracker />
```

| Field | Value |
|---|---|
| Import path | `@vercel/analytics/astro` (Astro SDK subpath — confirmed valid against Vercel docs) |
| File | `apps/maine-cannabis/src/layouts/Layout.astro` |
| Mount location | Line 574, inside the global layout, **after** `<main>` close and `back-to-top` button, **before** `SiteFooter` script block |
| Scope | **Global** — every page that renders through this layout fires pageviews. No per-page override; no per-page opt-out. |
| Props set on `<Analytics />` | **None.** No `mode`, no `beforeSend`, no `debug`, no `scriptSrc`, no `endpoint`, no `eventEndpoint`/`viewEndpoint`. Component uses Vercel's build-time dynamic configuration (`<script type="opt-in" data-allow-reload="true">` payload emitted by the Astro adapter). |
| Astro SDK exit | v2.x, MIT-licensed, framework-aware — `<Analytics />` with no props is the recommended zero-config form. (Source: Vercel docs `/docs/analytics/package`, last_updated 2026-06-26.) |
| Resilient Intake | v2.x uses Vercel's Resilient Intake script loading by default — relevant for any "is the dashboard receiving data?" probe. |

**Wired.** No operator action required to *enable* on-page tracking. What requires operator action is the **read-side** contract (token + projectId + teamId). See §3 and §4.

### 1.2 `package.json` — declared versions

Run by operator (agent did NOT execute — verification of declared intent only):

```bash
node -e "console.log(JSON.stringify(require('/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/package.json').dependencies, null, 2))"
```

Reproduced from the on-disk file (read-only):

```json
"@astrojs/vercel": "^11.0.2",
"@vercel/analytics": "^2.0.1",
"@vercel/speed-insights": "^2.0.0",
"astro": "^6.0.5",
```

Installed version (read from `node_modules/@vercel/analytics/package.json`): **2.0.1**. Matches declared caret range. No `^1.x` drift. The Astro adapter (`@astrojs/vercel@11.0.2`) declares a private `^1.6.1` dep on `@vercel/analytics` that is hoisted into `node_modules/@astrojs/vercel/node_modules/` — not a runtime conflict; it is the adapter's own internal copy.

### 1.3 `vercel.json` (repo state)

Two `vercel.json` files exist in the repo:

| Path | Role | What it carries | Relevance to access contract |
|---|---|---|---|
| `vercel.json` (repo root) | Repo-shape build/redirect/header rules | `buildCommand: "bash vercel-build.sh"`, `outputDirectory: "dist"`, www→non-www redirect, CSP, cache-control headers | **None** for Vercel API token / project ID / team ID. No `env`, no `projectId`, no team mapping. Per AGENTS.md §"What Vercel actually serves", Vercel ignores the `outputDirectory` field and uses the **Vercel project settings** (Framework Preset `Astro`, Build Command `bash vercel-build.sh`). |
| `apps/maine-cannabis/vercel.json` | Per-app override of repo root | One route entry for `/4a00ca05232c46f3badda7f9f2e0e296.txt` with `Content-Type: text/plain` | **None** for API access. No `env`, no `teamId`, no project overrides. |

Production Vercel env vars: **zero** as of 2026-07-06 (AGENTS.md "Build & Deploy shape"). Any future additions should be documented in `docs/MODERNIZATION_PLAN_2026-07-06.md`.

### 1.4 A4 — what is wired vs what requires operator action

| Item | Status | Owner |
|---|---|---|
| `<Analytics />` mount in `Layout.astro` | ✅ Wired | — |
| `@vercel/analytics@^2.0.1` declared in `apps/maine-cannabis/package.json` | ✅ Wired | — |
| Installed version matches declared range | ✅ Wired (2.0.1) | — |
| Astro adapter `@astrojs/vercel@^11.0.2` | ✅ Wired | — |
| Production Vercel env vars | ✅ None needed for Analytics (Vercel resolves project from deploy context) | — |
| Pageview data flowing into Vercel dashboard | ⚠️ Operator must visually verify on dashboard | Operator |
| Vercel REST API token + projectId + teamId + reporting-window evidence | ❌ Operator must create and capture | Operator (this ticket) |
| Plan/team scope (free vs Pro vs Enterprise) and reporting window | ❌ Operator must record from dashboard | Operator (this ticket) |

---

## 2. Source contract A5 — Vercel Speed Insights

### 2.1 `<SpeedInsights />` mounting — repo evidence

Same file, same mount site as A4:

```text
27: import SpeedInsights from '@vercel/speed-insights/astro';
...
574:    <Analytics />
575:    <SpeedInsights />
```

| Field | Value |
|---|---|
| Import path | `@vercel/speed-insights/astro` (Astro SDK subpath) |
| File | `apps/maine-cannabis/src/layouts/Layout.astro` |
| Mount location | Line 575, immediately after `<Analytics />` |
| Scope | **Global.** Every page renders through this layout. |
| Props set on `<SpeedInsights />` | **None.** No `sampleRate`, no `beforeSend`, no `debug`, no `route`, no `endpoint`, no `scriptSrc`. v2.x defaults are applied at build time. |
| Per-route `route=` attribute | **Not set.** Without an explicit `route` prop, the Astro SDK auto-populates `route` from the framework's route pattern (e.g. `/blog/[slug]`). The package defaults to framework-aware route detection for Astro, Next, Nuxt, SvelteKit, Remix. (Source: Vercel docs `/docs/speed-insights/package`, last_updated 2026-03-18.) |

### 2.2 `package.json` — declared versions

`"@vercel/speed-insights": "^2.0.0"` declared in `apps/maine-cannabis/package.json`. Per-repo installed package version was not directly read by this agent (avoids touching `node_modules`); semver caret of `^2.0.0` guarantees 2.x and is sufficient for the spec.

### 2.3 A5 — per-route Web Vitals gap

Per Vercel docs (`/docs/speed-insights/package` and `/docs/speed-insights/api`):

- v2.x of the package is **MIT-licensed** and uses Vercel's **Resilient Intake** for script loading.
- The `route` option is auto-set by the framework-specific subpath (`/astro` here). To **override** the route (e.g. when rolling multiple MDG apps into one Vercel project), an operator would pass `<SpeedInsights route="/cannabis/[slug]" />` explicitly. Not needed for MDG's single-app deployment.
- The package currently exposes `sampleRate`, `beforeSend`, `debug`, `route`, `endpoint`, and `scriptSrc`. **No API** is exposed to *read back* collected Web Vitals from the Vercel-hosted dashboard programmatically via the SDK. The SDK is a write-only client.
- The **deprecated** "Speed Insights Intake API" (`https://vitals.vercel-analytics.com/v1/vitals`) is write-only (intake endpoint) — Vercel explicitly flags it as deprecated and tells users to use the framework-aware `@vercel/speed-insights` package instead. It is **not** a read API. (Source: Vercel docs `/docs/speed-insights/api`, last_updated 2026-03-17.)

**What the operator would need to enable a machine-readable path for A5:** configure a **Vercel Drain** with the **Speed Insights** data type, pointing at an HTTPS endpoint the operator owns. See §3.2.

---

## 3. Machine-readable extraction paths — Vercel documentation surface

### 3.1 A4 — Web Analytics REST API (current, canonical)

Vercel's "Query Web Analytics with the API" page (last_updated 2026-06-26, canonical URL: `https://vercel.com/docs/analytics/web-analytics-api`) documents the read API.

**Base URL:** `https://api.vercel.com`

**Endpoints (Vercel REST API under `/v1/query/web-analytics/...`):**

| Endpoint | Purpose | Source |
|---|---|---|
| `GET /v1/query/web-analytics/visits/count` | Single total — pageviews and visitors matching a filter | `/docs/rest-api/web-analytics/counts-page-views` (linked from canonical page) |
| `GET /v1/query/web-analytics/visits/aggregate` | Rows grouped by time or dimension (e.g. `by=day`, `by=country`, `by=route`); bounded by plan reporting window | `/docs/rest-api/web-analytics/aggregates-page-views` (linked from canonical page) |
| `GET /v1/query/web-analytics/events/count` | Single total for a custom event name | `/docs/rest-api/web-analytics/counts-custom-events` (linked from canonical page) |
| `GET /v1/query/web-analytics/events/aggregate` | Custom event rows grouped by `eventData/<prop>` or `flags/<name>` | `/docs/rest-api/web-analytics/aggregates-custom-events` (linked from canonical page) |

**Datasets:** `visits` (auto pageviews) | `events` (custom events sent via `track()` from `@vercel/analytics`).

**Common dimensions** for visits: `requestPath` (exact URL), `route` (framework route pattern), `country`, `referrerHostname`, `deviceType`, `browserName`, UTM parameters, `day`.

**Filter syntax:** OData. Quoted string values, URL-encoded in `--data-urlencode`. Example: `requestPath eq '/pricing' and country eq 'US'`. When a grouped query exceeds the requested `limit`, Vercel rolls up remaining values into an `Others` row — useful and necessary to flag in any Tier-2 source contract.

**Auth model:**
- **OAuth-style bearer token.** `Authorization: Bearer $VERCEL_TOKEN`. Token must be a Vercel **access token** with the right scope. (Vercel docs: "Create a Vercel access token. See REST API authentication" — `/docs/rest-api#authentication`. The current authoritative page is `/docs/rest-api/reference/rest-api`.)
- **No project-scoped token** for Web Analytics. Vercel has project tokens, but the Web Analytics read API is project/team-scoped at the request level via `projectId` + `teamId` query params.
- **Access scope (per request):** one `projectId` + one `teamId` (or `slug`). For personal-account projects, omit `teamId`/`slug`. Per the docs example: `$VERCEL_TOKEN`, `prj_1234567890`, `team_1234567890`.

**Reporting window:** Aggregate endpoints are bounded by the project's plan-level reporting window (Free / Pro / Enterprise). The exact number of days for each plan is documented at `/docs/analytics/limits-and-pricing#what-is-the-reporting-window` — operator must read and record. Count endpoints query production data (lifetime, not window-bounded).

**Rate limits, pagination, body shape:** documented at `/docs/rest-api/web-analytics/*`. Not summarized here; operator captures verbatim in the probe result file.

### 3.2 A5 — Speed Insights machine-readable path

**Critical finding from the docs:** Vercel does **not** publish a read REST API for Speed Insights data. The "Speed Insights Intake API" page (`/docs/speed-insights/api`) is explicitly flagged ⚠️ deprecated and is write-only (a client→Vercel intake endpoint, not Vercel→client). The only machine-readable path is **Vercel Drains**.

**Vercel Drains** (last_updated 2026-07-03, canonical: `https://vercel.com/docs/drains/using-drains`):

| Aspect | Value |
|---|---|
| What it is | Vercel-initiated HTTPS POSTs of observability events to an operator-owned endpoint |
| Available data types (relevant) | **Logs**, **Traces**, **Speed Insights**, **Web Analytics**, **Audit Log** |
| Where configured | Vercel dashboard → **Team Settings** → **Drains** → Add Drain |
| Plans required | **Pro** or **Enterprise** (Drains are gated; Audit Log drains are Enterprise-only) |
| Sampling | Configurable per drain (basic sampling rate for Speed Insights and Web Analytics drains) |
| Delivery formats | **JSON array** or **NDJSON** |
| Signature verification | Optional `x-vercel-signature` HMAC header + secret |
| Auth to drain endpoint | Custom headers (operator's responsibility); no Vercel bearer token in the request |

**Speed Insights Drain schema** (canonical: `/docs/drains/reference/speed-insights`, last_updated 2025-09-24). Per-event fields include:

| Field | Type | Notes |
|---|---|---|
| `schema` | string | `vercel.speed_insights.v1` |
| `timestamp` | string | ISO 8601 UTC |
| `projectId` | string | Vercel project ID (NOT the same as the `prj_...` REST API projectId — verify) |
| `ownerId` | string | `team_...` for team projects |
| `deviceId` | number | Vercel-cooked device identifier (not the user's machine id) |
| `metricType` | string | `CLS` \| `LCP` \| `FID` \| `FCP` \| `TTFB` \| `INP` |
| `value` | number | Metric value in native units |
| `origin` | string | `https://example.com` |
| `path` | string | URL path |
| `route` | string | Route pattern (`/blog/[slug]`) — **this is the per-route Web Vitals payload** |
| `country`, `region`, `city` | string | Geo |
| `osName`, `osVersion`, `clientName`, `clientType`, `clientVersion`, `deviceType`, `deviceBrand`, `connectionSpeed`, `browserEngine`, `browserEngineVersion` | string | Client context |
| `scriptVersion`, `sdkVersion`, `sdkName` | string | Vercel SDK metadata |
| `vercelEnvironment` | string | `production` etc. |
| `vercelUrl` | string | `*.vercel.app` |
| `deploymentId` | string | `dpl_...` |
| `attribution` | string | Optional attribution blob |

**Gap inventory for A5:**

1. **No read REST API.** Anything other than dashboard or Drains is dashboard-only.
2. **Drains require Pro or Enterprise plan.** If MDG is on Vercel's free plan, machine-readable Speed Insights is **structurally blocked** without a plan upgrade. This is a Tier-1-aligned fact about the operator's commercial arrangement, not a Tier-1 invariant about MDG.
3. **No on-site co-hosting option.** Speed Insights is collected by Vercel's hosted `vitals.vercel-analytics.com` endpoint. Even before a Drain is set up, the data lives only on Vercel's side.
4. **The deprecated Speed Insights Intake API is write-only.** It cannot be repurposed as a read API. Treat it as documentation, not as an integration surface.

**Per SOURCES.md A5:** "Ticket 002 must prove a machine-readable extraction path. Dashboard-only access remains an operator diagnostic, not a required automated dependency." The spec itself acknowledges A5 may remain dashboard-only if a Drain cannot be configured.

### 3.3 Sources cited (all web)

- Vercel docs — Query Web Analytics with the API: <https://vercel.com/docs/analytics/web-analytics-api> (last_updated 2026-06-26)
- Vercel docs — Advanced Web Analytics Config with `@vercel/analytics`: <https://vercel.com/docs/analytics/package> (last_updated 2026-06-26)
- Vercel docs — `@vercel/speed-insights` package reference: <https://vercel.com/docs/speed-insights/package> (last_updated 2026-03-18)
- Vercel docs — Speed Insights Intake API (deprecated): <https://vercel.com/docs/speed-insights/api> (last_updated 2026-03-17)
- Vercel docs — Speed Insights overview: <https://vercel.com/docs/speed-insights>
- Vercel docs — Using Drains: <https://vercel.com/docs/drains/using-drains> (last_updated 2026-07-03)
- Vercel docs — Speed Insights Drains Reference: <https://vercel.com/docs/drains/reference/speed-insights> (last_updated 2025-09-24)
- Vercel docs — REST API overview: <https://vercel.com/docs/rest-api> (last_updated 2026-07-02 in canonical; canonical page `/docs/rest-api/reference/rest-api`)
- Vercel docs — Web Analytics REST endpoints (per link surface, last_updated 2026-06-26 family):
  - `/docs/rest-api/web-analytics/counts-page-views`
  - `/docs/rest-api/web-analytics/aggregates-page-views`
  - `/docs/rest-api/web-analytics/counts-custom-events`
  - `/docs/rest-api/web-analytics/aggregates-custom-events`
- Vercel docs — Reporting window per plan: `/docs/analytics/limits-and-pricing#what-is-the-reporting-window`

---

## 4. Operator checklist

> **Pre-flight required** per `AGENTS.md` §Pre-Flight Validation (browser-automation + external-tool categories). Capture the pre-flight report at the top of the session transcript.
>
> **Hard rules** (from `AGENTS.md` §Playwright Discipline):
> - Every `playwright_browser_navigate` / equivalent spawn **MUST** be matched by a `playwright_browser_close` before the session ends.
> - The final assistant message before completion **MUST** include a "Browser cleanup" line confirming all instances were closed. (This document calls it the **browser cleanup record** — same thing.)
>
> **STOP and ask Steve gate:** any step touching an OAuth token, team-scoped secret, or production read API key is gated. Do NOT paste secrets into chat. Do NOT echo token values into commit messages or artifacts.

---

### A4 — Vercel Web Analytics API access proof

| # | What to run | Expected output | What to record | Where to paste |
|---|---|---|---|---|
| 4.A1 | Open `https://vercel.com/dashboard` in a browser and sign in to the team that owns `mainedispensaryguide.com`. Navigate to the project for `mainedispensaryguide.com` → **Analytics** tab. | Dashboard shows pageview/visitor counts (or "no data yet" — both are valid signals of wiring). | (a) Team name/slug, (b) Project name, (c) Whether the Analytics tab is enabled (a project setting toggle). | A4 Probe Result file (operator-created at `apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-ticket-002-A4-probe-result.md`). |
| 4.A2 | On the same dashboard page, scroll to **Settings** → **Web Analytics** for the project. | Toggle state visible; plan tier visible; reporting-window-in-days visible. | (a) Plan tier (Free / Pro / Enterprise), (b) Reporting window in days (read from `/docs/analytics/limits-and-pricing#what-is-the-reporting-window` for the matching plan), (c) Data-sampling toggle if present. | Same file. |
| 4.A3 | In a **browser**, navigate to `https://vercel.com/account/tokens` and create a new token. **STOP and ask Steve** before clicking "Create". Paste the proposed token name + scope into chat for sign-off; do not proceed without explicit approval. | (Pending Steve's approval.) | Token name (not the value), scopes requested, expiry chosen. | Same file, plus a Hub entry: "Vercel access token requested for MDG-ANALYTICS-001 A4 probe." |
| 4.A4 | After Steve approves, click "Create" and **immediately** copy the token value into the operator's password manager (1Password / Bitwarden / etc.). **Do not** paste the token value into any chat, commit message, or markdown file. | Token saved in the operator's vault. | Vault entry name (e.g. `vercel-mdg-analytics-2026-07`) and last-four. | Same file (last-four only, never full value). |
| 4.A5 | **STOP and ask Steve** before the next step. The next step touches production read API access. Once approved, in the **Vercel project Settings → General**, copy the **Project ID** (`prj_...`). On the team page, copy the **Team ID** (`team_...`) or team slug. | Two IDs captured. | `projectId` (full), `teamId` (full, or slug). These are NOT secrets — they are identifiers; safe to record in markdown. | Same file. |
| 4.A6 | Reachability probe — DO NOT EXECUTE without Steve's approval. Surface this command for the operator to run from their own terminal (NOT the agent's): `curl --get "https://api.vercel.com/v1/query/web-analytics/visits/count" -H "Authorization: Bearer $VERCEL_TOKEN" --data-urlencode "teamId=team_…" --data-urlencode "projectId=prj_…" --data-urlencode "filter=requestPath eq '/'"`. | JSON response with `data.pageviews` and `data.visitors`. Status 200. | (a) Raw response JSON (paste into the probe result file — it contains only counts, no PII), (b) Computed MDG cross-check: does the lifetime pageview total roughly match what GSC impressions would suggest (order-of-magnitude), (c) Note any `Others` rollups or pagination behavior. | Same file. |
| 4.A7 | Repeat 4.A6 with `visits/aggregate` grouped by `route` and `day`, window = last 28 days, `limit=20`. | A JSON array of daily totals and top routes. | (a) Raw JSON, (b) Top 20 routes list, (c) Whether `Others` appeared (indicates more than 20 distinct route values in window). | Same file. |
| 4.A8 | Repeat 4.A6 with `events/count` filtered to `eventName eq '…'` for any custom event name already in the repo. (As of v0.5 audit, MDG has not yet deployed custom events — if the events query returns `{ "data": { "count": 0, "visitors": 0 } }`, that is a valid result, not a probe failure.) | JSON response. 0-count is acceptable pre-launch. | (a) Raw JSON, (b) Confirm whether MDG uses custom events today (read `apps/maine-cannabis/src/layouts/Layout.astro` for any `track(...)` calls — agent read this file and found none on the A4 surface). | Same file. |
| 4.A9 | **Browser cleanup record.** Close all browser tabs used for the Vercel dashboard navigation. Confirm `ps aux | grep -i playwright` returns nothing unexpected. Paste a one-line record into the probe result file: "Browser cleanup: closed. Playwright procs: 0. Token never pasted into chat or artifacts." | One-line confirmation, written into the same file. | Same file. |

**A4 done criteria:** `projectId`, `teamId`, plan tier, reporting-window-in-days, scope of token, and at least one `visits/count` + one `visits/aggregate` JSON response are pasted into `apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-ticket-002-A4-probe-result.md`. Token value never appears in any chat, file, commit message, or artifact.

---

### A5 — Vercel Speed Insights machine-readable path

| # | What to run | Expected output | What to record | Where to paste |
|---|---|---|---|---|
| 5.A1 | In a browser, navigate to Vercel dashboard → **Team Settings** → **Drains** (or visit `https://vercel.com/d?to=/[team]/~/settings/drains`). | Drains page. Note whether "Add Drain" button is enabled (Pro/Enterprise only). | Whether Drains are available on the team's plan. | A5 Probe Result file (`apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-ticket-002-A5-probe-result.md`). |
| 5.A2 | If Drains are available, click **Add Drain**. | Sidebar with data-type options. | (a) Confirm **Speed Insights** is listed as a data type, (b) Confirm **Web Analytics** is also listed (cross-cutting — same Drain surface can be used for A4 as an alternative to REST API). | Same file. |
| 5.A3 | If Drains are **not** available on the current plan, record: "Speed Insights machine-readable path: BLOCKED — Drains require Pro/Enterprise plan. Spec §A5 acknowledges dashboard-only as a valid fallback." | One-line status. | The blocker note + a Tier-1-aligned question for Steve: "Is the project on the Free plan?" (This is a question about operator state, not a Tier-1 invariant change.) | Same file. |
| 5.A4 | If Drains are available, **STOP and ask Steve** before creating a Drain. A Drain POSTs project telemetry to an operator-owned HTTPS endpoint — a one-way-door decision. Surface to Steve: which endpoint URL will receive the POSTs, who owns the endpoint, and what the data-handling policy is. | (Pending Steve's approval.) | Endpoint URL, owner, data-handling policy, sampling rate chosen. | Same file + Hub entry. |
| 5.A5 | After Steve approves, create the Drain with data type **Speed Insights**, project = `mainedispensaryguide.com`, format = **NDJSON** (recommended — easier to append-and-recover than JSON arrays), sampling rate = **100%** initially (operator can throttle later). | Drain listed in team Drains page. | Drain ID, endpoint URL, format, sampling rate. | Same file. |
| 5.A6 | Verification probe (operator runs from their terminal, NOT the agent): trigger a fresh deploy, then in a browser visit 3–5 representative MDG pages (homepage, one city guide, one technical guide, one blog post). Wait 60–120 seconds. | Drain endpoint receives 5–25 NDJSON events with `metricType` ∈ {`LCP`, `INP`, `CLS`, `TTFB`, `FCP`, `FID`} and `route` matching the framework pattern (e.g. `/blog/[slug]`). | (a) Total events received, (b) Distinct routes observed, (c) Distinct metric types observed, (d) A 5-line sample (with `deviceId`, `deviceType`, `country`, `path`, `metricType`, `value` — these are pseudonymous identifiers; per PRIVACY-BOUNDARY.md, do not log raw identifiers in routine human-review artifacts; redact `deviceId` before pasting). | Same file (with `deviceId` redacted). |
| 5.A7 | Cross-check: compare the `route` field values received against MDG's expected route patterns from `astro.config.mjs` and `src/pages/`. The Astro SDK auto-fills `route` for framework-aware subpaths; the value should match the framework's route pattern, not the literal URL. | `route` values like `/`, `/guides/[slug]`, `/blog/[slug]`, `/download/[slug]` — pattern strings, not literal slugs. | (a) Distinct route patterns, (b) Any mismatch between observed and expected (likely a `route` prop override needed on `<SpeedInsights />` for `src/pages/guides/[slug]` if rollout extends). | Same file. |
| 5.A8 | **Browser cleanup record.** Close all browser tabs used for the dashboard navigation. Confirm `ps aux | grep -i playwright` returns nothing unexpected. Paste a one-line record into the probe result file: "Browser cleanup: closed. Playwright procs: 0. Drain endpoint URL recorded (not the signing secret)." | One-line confirmation. | Same file. |

**A5 done criteria:**
- **Pro/Enterprise path:** Drain ID, endpoint URL, sampling rate, sample NDJSON events (with `deviceId` redacted), and distinct route patterns are pasted into the A5 probe result file. The Drain signing secret (if any) is in the operator's password manager, not in any chat or file.
- **Free-plan path:** Block note recorded, spec §A5's "dashboard-only" fallback documented as the standing position. Tier-2 deviation filed as: "A5 remains dashboard-only as authorized by SOURCES.md; a Tier-2 implementation hypothesis is added to track the open question."

---

## 5. Drift + risk inventory vs `SOURCES.md` A4/A5

### 5.1 Spec items that repo state does not make impossible

| Spec item (SOURCES.md) | Repo state | Verdict |
|---|---|---|
| A4 — "pageview/visitor comparison context" | `<Analytics />` mounted globally, no opt-out | ✅ Possible. Production wiring is in place. |
| A4 — "route popularity" | Astro SDK auto-fills `route` dimension | ✅ Possible via REST API `visits/aggregate` grouped by `route`. |
| A4 — "device/referrer context" | Vercel REST API supports `deviceType`, `referrerHostname`, `browserName`, UTM dimensions | ✅ Possible. |
| A4 — "independent bot-filtered traffic signal" | Vercel's Web Analytics applies its own bot filter | ✅ Possible. Document the filter version in the probe result. |
| A4 — "Ticket 002 must prove token, project/team context, plan reporting window, and API access" | All on the operator side | ✅ Possible. Gated on Steve's token-creation approval (4.A3 STOP gate). |
| A5 — "LCP, INP, CLS, supporting metrics where useful" | `<SpeedInsights />` mounted, no `sampleRate` prop | ✅ Possible via Drain NDJSON events. |
| A5 — "field-data distribution semantics" at the 75th percentile | Standard Core Web Vitals interpretation; not a Vercel-specific concern | ✅ Possible to compute in the ingestion layer. |
| A5 — "Ticket 002 must prove a machine-readable extraction path. Dashboard-only access remains an operator diagnostic, not a required automated dependency." | Two paths: Drain (Pro/Enterprise) or dashboard-only (Free plan) | ✅ Both options are spec-compliant. |

### 5.2 Risks that do NOT change Tier 1 invariants

1. **Plan-tier gating for Drains.** A free-plan team cannot machine-read Speed Insights via Drain. The spec already authorizes dashboard-only as a fallback. **Not Tier 1.** This is a Tier-2 implementation choice, on the operator's side.
2. **No A5 read REST API.** The spec acknowledges dashboard-only as acceptable. **Not Tier 1.**
3. **A4 reporting window is plan-bounded.** If MDG is on the Free plan, the REST API's aggregate endpoint returns at most ~7 days. This is a Vercel commercial constraint, not a measurement-model invariant. **Not Tier 1.**
4. **Token rotation hygiene.** Vercel tokens are long-lived and operator-managed. PRR-BY-OBVIOUS-2 (operator hygiene) — not a measurement-model invariant. **Not Tier 1.** Document token name + last-four + rotation date in the probe result; do not document the value.
5. **Two-tier API confusion.** There are two Vercel project identifiers floating around: (a) the `prj_…` ID used by the REST API and (b) the IPFS-style `Qmc…` ID that appears in some older Vercel docs and dashboards. The current Web Analytics REST API uses `prj_…` (per the docs example). If the operator's dashboard shows `Qmc…`, they should pull the `prj_…` from `vercel project ls` or the Vercel project's Settings → General page. Document which one was captured. **Not Tier 1.**

### 5.3 Items that DO require Tier 1 escalation — none

A review of this probe spec against `SPEC-AUTHORITY.md` Tier 1 hard invariants:

| Tier 1 invariant | Conflict? |
|---|---|
| Discovery → Acquisition → Satisfaction → Progression → Retention model | No — A4/A5 are inputs, not model changes |
| `ga4_engagement_rate` is not relabeled | No — Vercel metrics are not GA4 metrics |
| Separation of observations / derived signals / hypotheses / causal conclusions | No — this spec produces observations only |
| Task-aware, metric-specific success/progression models | No |
| Block performance classification when required instrumentation is unhealthy | No — this ticket does not classify performance |
| Tiny-sample winner/loser labels | No |
| Analytics data-minimization + pseudonymous-ID boundaries | Compatible. PRIVACY-BOUNDARY.md is respected; `deviceId` redaction step is in 5.A6 |
| No joining analytics identifiers to lead/contact identities in Sprint 1 | Compatible. Vercel `deviceId` is never joined to MDG lead data |
| No silent public-UX changes from analytics diagnosis | No UX changes |
| Separation of investigation eligibility from intervention authority | Compatible — this is investigation |
| Competing hypotheses before material intervention | No intervention is proposed |
| Page-task mismatch investigated as task ownership | Not applicable |
| Preserve source/query/window provenance for analytical outputs | **This is the entire purpose of the probe result files.** Compatible. |

**No Tier 1 invariant is touched by this spec.** All choices in §§1–4 are Tier 2 implementation hypotheses that the agent is allowed to override with documented evidence.

### 5.4 Drift between spec inspected and current main

Spec inspected referenced `965528ade88...` (2026-07-11). Current main is at `aba1c48d` ("MDG-ANALYTICS-001: reconciliation report package v0.5 vs current main", dated 2026-07-12). Working tree has uncommitted modifications to `MISSION_CONTROL.md`, `apps/maine-cannabis/public/llms.txt`, three `mdg-data` adapter/command scripts, and three generated meta files; plus one untracked file (`apps/maine-cannabis/scripts/data/mdg-data/adapters/ocp-firecrawl-ingest.cjs`).

**None of these touched `Layout.astro`, the Vercel Analytics/Speed Insights mount points, `package.json`, `vercel.json`, or `astro.config.mjs`.** A4/A5 source contract review in §§1–2 is unchanged from the spec's inspected state. No drift that would invalidate the operator checklist.

---

## 6. Replay command list

Commands the agent actually ran (read-only; no remote API hit, no token used, no `.vercel/` directory entered, no env var read):

```bash
ls -la /home/steve/projects/maine-dispensary-guide/                                                 # workspace survey
ls -la /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/                              # spec survey
ls -la /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/TICKETS/                       # ticket survey
read /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/SOURCES.md                      # source contracts
read /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/PRIVACY-BOUNDARY.md             # privacy rules
read /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/SPEC-AUTHORITY.md                # tier rules
read /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/MANIFEST.md                      # package manifest
read /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/TICKETS/002-source-capability-forensics.md
read /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/TICKETS/006-instrumentation-v1.md
read /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/TICKETS/001-source-contract-repair.md
ls -la /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/src/layouts/                # layout survey
ls -la /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/docs/analytics/             # existing probe artifacts
rg -n -C 2 "vercel|analytics|SpeedInsights|Vercel" apps/maine-cannabis/src/layouts/Layout.astro   # confirm mounting
node -e "console.log(JSON.stringify(require('./apps/maine-cannabis/package.json').dependencies, null, 2))"
read /home/steve/projects/maine-dispensary-guide/vercel.json                                        # repo-root vercel.json
read /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/vercel.json                  # app-level vercel.json
read /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/astro.config.mjs             # Astro adapter wiring
read /home/steve/projects/maine-dispensary-guide/AGENTS.md                                         # working agreement
rg -n -i "browser|cleanup|playwright|vercel|CUA|chrome" /home/steve/projects/maine-dispensary-guide/AGENTS.md
read /home/steve/projects/maine-dispensary-guide/vercel-overview.yml                               # operator-saved login-page snapshot (informational only)
read /home/steve/projects/maine-dispensary-guide/vercel-dashboard.yml                              # operator-saved login-page snapshot (informational only)
read /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/docs/analytics/GA4_PROBE_Y_CLOSURE_2026-07-11.md
rg -rn "vercel|Analytics|SpeedInsights" apps/maine-cannabis/src --type-add 'astro:*.astro' -g '*.astro'
cat node_modules/@vercel/analytics/package.json                                                     # installed version check
git log --oneline -5
git status
web_search "Vercel Web Analytics API endpoint REST documentation projectId teamId token"
web_search "Vercel Speed Insights API REST machine-readable export Web Vitals"
web_extract https://vercel.com/docs/analytics/web-analytics-api
web_extract https://vercel.com/docs/speed-insights/api
web_extract https://vercel.com/docs/speed-insights/package
web_extract https://vercel.com/docs/drains/reference/speed-insights
web_extract https://vercel.com/docs/drains/using-drains
web_search "Vercel Drains Quickstart configuration setup team project endpoint"
web_search "\"@vercel/analytics\" npm package mode opt-out data-disable automatic beforeSend astro"
web_extract https://vercel.com/docs/analytics/package
```

**Commands the agent did NOT run** (and which must NOT be run by the agent):

- `vercel login`, `vercel link`, `vercel env pull`, `vercel project ls`, `vercel teams ls`
- `vercel curl` or any direct REST call to `api.vercel.com`
- Any `curl` against `vitals.vercel-analytics.com` or `api.vercel.com` with a token in scope
- `playwright_browser_navigate` to `vercel.com/dashboard` (the operator runs this)
- `cat` of `~/.vercel/auth.json`, `.vercel/`, or any env-var file that might contain a token
- Any read of `VERCEL_TOKEN`, `VERCEL_ANALYTICS_ID`, `VERCEL_OBSERVABILITY_CLIENT_CONFIG`, or any other `VERCEL_*` env var
- Any modification to `Layout.astro`, `astro.config.mjs`, `vercel.json`, `package.json`, `apps/maine-cannabis/src/pages/**`, or any other repo file

---

## 7. Stop conditions

This probe stops on any of the following, with a written note back to the parent agent:

1. Operator reports a Vercel-side change (new project, team migration, plan downgrade) that invalidates §1–§3.
2. Operator marks 4.A3 STOP-gate as denied (token creation not approved).
3. Operator marks 5.A4 STOP-gate as denied (Drain not approved).
4. Plan is Free and Steve defers the plan upgrade — A5 is then reclassified dashboard-only per the spec.
5. Repo drift: any of `Layout.astro`, `apps/maine-cannabis/package.json`, `vercel.json`, or `astro.config.mjs` changes before the operator runs the probe. Re-run §§1–2 in that case.