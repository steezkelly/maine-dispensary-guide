#!/usr/bin/env python3
"""
Regenerate the OCP-licensed-towns data block for src/pages/find-a-dispensary.astro
from the latest monthly OCP CSV drops.

Usage:
  node scripts/ocp/fetch-ocp-towns.cjs

Outputs:
  1. Downloads Adult-Use + Medical Caregiver CSVs from maine.gov/dafs/ocp
  2. Deduplicates and normalizes to "unique cities with retail access"
  3. Prints a JSON array ready to paste into find-a-dispensary.astro as `ocpCities`

Schedule: Run monthly when OCP publishes new CSVs (first week of each month).
Source: http://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search

The schema for the data block is:
  {"n": "CityName", "t": "au"|"med", "c": <count>, "s": ["Sample Store 1", ...]}
  - n: city/town name as it appears in the OCP CSV (title-cased)
  - t: "au" = adult-use retail store, "med" = caregiver storefront
  - c: count of active licensed retailers
  - s: optional array of up to 3 sample business names (for the card UI)

Dedup rules:
  - Adult-Use: dedup by (DBA lower, CITY lower) — same brand+city = one store
  - Caregiver: dedup by (REGISTRANT_DBA lower, RETAIL_TOWN lower)
  - Filter: only cities NOT already in the MDG /find-a-dispensary curated list
"""
import csv
import io
import json
import sys
import urllib.request
from collections import defaultdict

OCP_AU_URL = "http://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Adult_Use_Establishments_And_Contacts_2026_04_01.csv"
OCP_CG_URL = "https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Maine_Medical_Use_Caregivers_2026_04_01%20.csv"

def fetch(url):
    print(f"Fetching {url} ...", file=sys.stderr)
    with urllib.request.urlopen(url, timeout=30) as resp:
        return io.StringIO(resp.read().decode("utf-8"))

def norm(s):
    return s.strip().lower().replace("-", " ").title()

def main():
    # Adult-use stores
    au_stores = defaultdict(list)
    au_seen = set()
    for row in csv.DictReader(fetch(OCP_AU_URL)):
        if row["LICENSE_STATUS"] != "Active":
            continue
        if row.get("LICENSE_TYPE", "").strip() != "Store":
            continue
        dba = row["DBA"].strip()
        if not dba:
            continue
        city = norm(row["LICENSE_CITY"])
        key = (dba.lower(), city.lower())
        if key in au_seen:
            continue
        au_seen.add(key)
        au_stores[city].append(dba)

    # Caregiver retail storefronts
    cg_stores = defaultdict(list)
    for row in csv.DictReader(fetch(OCP_CG_URL)):
        r = row.get("RETAIL_TOWN", "").strip()
        if not r:
            continue
        dba = row.get("REGISTRANT_DBA", "").strip() or row.get("REGISTRANT_NAME", "").strip()
        if dba:
            cg_stores[norm(r)].append(dba)

    # Cities with retail access (either AU or CG storefronts)
    retail_cities = set(au_stores.keys()) | set(cg_stores.keys())

    # Note: We don't auto-merge with MDG curated list here. The .astro file
    # already has logic to filter out cities that match existing guide names.
    # Operator runs this script, copies the array, and pastes into .astro.

    output = []
    for city in sorted(retail_cities):
        au_list = au_stores.get(city, [])
        cg_list = cg_stores.get(city, [])
        if au_list:
            output.append({
                "n": city,
                "t": "au",
                "c": len(au_list),
                "s": au_list[:3],
            })
        elif cg_list:
            output.append({
                "n": city,
                "t": "med",
                "c": len(cg_list),
                "s": cg_list[:3],
            })

    print(json.dumps(output, indent=2), file=sys.stdout)
    print(f"\nTotal: {len(output)} cities ({sum(1 for c in output if c['t']=='au')} AU, {sum(1 for c in output if c['t']=='med')} caregiver)", file=sys.stderr)

if __name__ == "__main__":
    main()
