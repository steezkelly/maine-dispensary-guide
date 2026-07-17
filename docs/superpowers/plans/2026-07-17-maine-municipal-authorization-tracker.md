# Maine Municipal Authorization Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the incomplete and contradictory Maine cannabis municipal tracker with a complete, primary-source-backed directory of all incorporated Maine municipalities.

**Architecture:** A Node generator combines Maine GeoLibrary’s municipality registry with OCP’s public activity-level authorization report and emits one immutable JSON snapshot. The Astro page renders three data-driven, alphabetical tables from that snapshot. It never treats absence from OCP as a vote to opt out.

**Tech Stack:** Node.js built-ins, Astro 6, JSON data import, Node test runner.

## Global Constraints

- Use only the official OCP public Power BI report and Maine GeoLibrary municipality registry for current data.
- Include 485 incorporated municipalities: 23 cities, 431 towns, 31 plantations.
- Preserve OCP’s four independent activity fields: retail, cultivation, manufacturing, testing.
- Use `no_recorded_retail_authorization` for absence from OCP; do not infer `explicit_opt_out`.
- Alphabetize each public status table by municipality name.
- All public dates must derive from dataset metadata; never hard-code April 2026 or a review date.
- Do not add dependencies, commit, push, or update `main`.

---

### Task 1: Deterministic authoritative-data generator

**Files:**
- Create: `scripts/data/refresh-maine-municipal-authorization.cjs`
- Create: `scripts/data/tests/refresh-maine-municipal-authorization.test.cjs`
- Create: `apps/maine-cannabis/src/data/maine-municipal-authorization.json`

**Interfaces:**
- Produces `buildDataset({ geoRows, ocpRows, retrievedAt })` returning `{ meta, municipalities }`.
- Produces `writeDataset(outputPath, dataset)` only after `validateDataset(dataset)` succeeds.
- `municipalities` rows: `{ name, county, municipality_type, retail, cultivation, manufacturing, testing, status }`.

- [ ] **Step 1: Write the failing tests**

```js
test('buildDataset covers every incorporated municipality and preserves OCP activity flags', () => {
  const dataset = buildDataset({ geoRows: fixtureGeoRows, ocpRows: fixtureOcpRows, retrievedAt: '2026-07-17T00:00:00.000Z' });
  assert.equal(dataset.meta.municipality_count, 485);
  assert.deepEqual(dataset.meta.municipality_type_counts, { city: 23, town: 431, plantation: 31 });
  assert.equal(dataset.municipalities.find((row) => row.name === 'Alpha').retail, 'Y');
});

test('does not infer an explicit opt-out from missing OCP authorization', () => {
  const dataset = buildDataset({ geoRows: fixtureGeoRows, ocpRows: [], retrievedAt: '2026-07-17T00:00:00.000Z' });
  assert.equal(dataset.municipalities[0].status, 'no_recorded_retail_authorization');
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run: `node --test scripts/data/tests/refresh-maine-municipal-authorization.test.cjs`

Expected: FAIL because the generator module does not yet exist.

- [ ] **Step 3: Implement the minimal generator**

- Fetch and parse GeoLibrary records with statuses `C`, `T`, and `P`.
- Fetch the OCP public report’s `tblMunicipality` activity rows.
- Reconcile names only through explicit normalizations and reject unmatched incorporated-municipality records.
- Assign `retail_authorized` when Retail is `Y`; otherwise assign `no_recorded_retail_authorization`.
- Sort by `name` using `localeCompare('en')`.
- Include source URLs, OCP refresh timestamp, retrieval timestamp, and counts in `meta`.

- [ ] **Step 4: Run GREEN and produce the checked-in snapshot**

Run:

```bash
node --test scripts/data/tests/refresh-maine-municipal-authorization.test.cjs
node scripts/data/refresh-maine-municipal-authorization.cjs --output apps/maine-cannabis/src/data/maine-municipal-authorization.json
```

Expected: tests pass and the JSON has exactly 485 rows.

### Task 2: Render the complete tracker from generated data

**Files:**
- Modify: `apps/maine-cannabis/src/pages/guides/maine-cannabis-opt-in-tracker.astro`
- Create: `apps/maine-cannabis/src/pages/guides/__tests__/maine-cannabis-opt-in-tracker.test.cjs`

**Interfaces:**
- Consumes `maine-municipal-authorization.json`.
- Renders summary count, source/retrieved date, and three status tables from dataset rows.

- [ ] **Step 1: Write failing rendered-page assertions**

```js
test('tracker consumes the generated municipality dataset and does not retain stale date claims', () => {
  const page = fs.readFileSync(TRACKER, 'utf8');
  assert.match(page, /maine-municipal-authorization\.json/);
  assert.doesNotMatch(page, /April 2026|Last reviewed <strong>2026-/);
  assert.match(page, /no_recorded_retail_authorization/);
});

test('tracker has a distinct non-decision category and no inferred opt-out rows', () => {
  const page = fs.readFileSync(TRACKER, 'utf8');
  assert.match(page, /No recorded retail authorization/);
  assert.match(page, /Explicit opt-outs/);
  assert.doesNotMatch(page, /Ashland[\s\S]{0,200}Opted Out/);
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run: `node --test apps/maine-cannabis/src/pages/guides/__tests__/maine-cannabis-opt-in-tracker.test.cjs`

Expected: FAIL because the page still imports no generated complete dataset and contains stale dates.

- [ ] **Step 3: Implement the page replacement**

- Import the generated JSON.
- Derive the three sorted arrays from `status` in frontmatter.
- Update title, description, methodology, and source disclaimer with metadata values.
- Render source/update dates from metadata in one place.
- Render activity status fields and municipality type, but not uncited vote years, fees, or active-licensee claims.
- Add an in-page search input that filters table rows client-side without a framework dependency.

- [ ] **Step 4: Run GREEN**

Run: `node --test apps/maine-cannabis/src/pages/guides/__tests__/maine-cannabis-opt-in-tracker.test.cjs`

Expected: PASS.

### Task 3: Regression verification

**Files:**
- Modify only files from Tasks 1–2 if a failing test identifies a defect.

- [ ] **Step 1: Run focused suites**

```bash
node --test scripts/data/tests/refresh-maine-municipal-authorization.test.cjs
node --test apps/maine-cannabis/src/pages/guides/__tests__/maine-cannabis-opt-in-tracker.test.cjs
```

Expected: all tests pass.

- [ ] **Step 2: Run project iteration verification**

Run: `npm run verify:iterate`

Expected: exit 0.

- [ ] **Step 3: Run one isolated build after lightweight checks**

Run: `npm run build:isolated`

Expected: exit 0; generated static output lives under the feature worktree.

- [ ] **Step 4: Inspect and report scope**

Run:

```bash
git diff --check origin/main...HEAD
git status --short
git diff --name-only origin/main...HEAD
```

Expected: no whitespace errors and only contract-allowed paths changed.
