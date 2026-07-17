# Maine Municipal Authorization Tracker — Design

**Status:** User-approved for implementation, 2026-07-17

## Problem

The published tracker contains a 34-row JSON snapshot, a separately hard-coded partial opt-in table, and ten rows called “opted out.” It also presents conflicting dates: an April 2026 table timestamp and a July review date. The page does not cover the statewide municipality universe and conflates “no authorization recorded” with an explicit opt-out.

## Primary sources

1. Maine OCP, Adult Use Opt-in Communities public Power BI report:
   `https://www.maine.gov/dafs/ocp/open-data/adult-use/opt-in-communities`
2. Maine GeoLibrary, GEOCODES table in the Maine Town and Townships Boundary Polygons service:
   `https://services1.arcgis.com/RbMX0mRVOFNTdLzd/arcgis/rest/services/Maine_Town_and_Townships_Boundary_Polygons/FeatureServer/1`

The OCP report has activity-level `Y`/`N` authorization fields for Retail, Growing/Cultivation, Manufacturing, and Testing. It does not establish that an unlisted municipality explicitly opted out; it also does not establish an active licensee exists.

## Scope and data model

The generated dataset contains all 485 incorporated municipalities from the GeoLibrary registry:

- 23 cities
- 431 towns
- 31 plantations

Each row has `name`, `county`, `municipality_type`, `retail`, `cultivation`, `manufacturing`, `testing`, and `status`.

`status` is exactly one of:

- `retail_authorized`: OCP records retail authorization as `Y`.
- `explicit_opt_out`: a separately maintained, primary-source-supported record; this release ships an empty list rather than inventing votes.
- `no_recorded_retail_authorization`: OCP does not record retail authorization for the municipality. This is a non-decision / unrecorded-authorization state, not an opt-out claim.

The release metadata includes the two primary-source URLs, OCP model refresh timestamp, retrieval timestamp, municipality-universe date, and the count of every category. A rendered page must derive all visible update dates from this metadata.

## Presentation

The page has an accurate title, a methodology callout, summary counts, and three alphabetically sorted, searchable tables:

1. Retail authorized
2. Explicit opt-outs (empty until primary evidence exists)
3. No recorded retail authorization / no decision

Rows display all OCP activity fields, not a fabricated vote date or fee. The copy explains that OCP authorization does not prove an active business operates in the municipality. Plantations are included in the statewide directory.

## Data refresh

`scripts/data/refresh-maine-municipal-authorization.cjs` is a reproducible, no-dependency command. It fetches the public OCP Power BI report and the GeoLibrary GEOCODES table, constructs the generated dataset deterministically, and writes it only with an explicit output path. It fails if OCP source data cannot be read, names cannot be reconciled, or the 485-municipality invariant does not hold.

## Tests and verification

Tests use fixtures rather than live network requests. They prove that:

- the generator covers 485 incorporated municipalities and reports the city/town/plantation breakdown;
- retail-authorized rows are alphabetically sorted and retain OCP activity flags;
- absence from OCP is labelled `no_recorded_retail_authorization`, never `explicit_opt_out`;
- the tracker consumes generated metadata and has no April 2026 / manually written review-date claim;
- all three table categories render.

Verification includes focused Node tests, `npm run verify:iterate`, and a single isolated production build after lightweight checks pass.
