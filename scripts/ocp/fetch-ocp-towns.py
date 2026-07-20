#!/usr/bin/env python3
"""Regenerate the OCP-licensed-towns block for /find-a-dispensary.

The script discovers the current CSV links from the official OCP adult-use and
medical-use search pages. OCP updates those links monthly, so no dated inline
file URL is hard-coded here.
"""
import csv
import io
import json
import re
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime
from urllib.parse import urljoin

OCP_AU_PAGE_URL = "https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search"
OCP_CG_PAGE_URL = "https://www.maine.gov/dafs/ocp/open-data/medical-use/registrant-search"
CSV_HREF_RE = re.compile(r'''href=["']([^"']+\.csv)["']''', re.IGNORECASE)
LAST_UPDATED_RE = re.compile(r"last updated\s*([^<)]+)", re.IGNORECASE)


def fetch_text(url):
    print(f"Fetching {url} ...", file=sys.stderr)
    with urllib.request.urlopen(url, timeout=30) as response:
        return response.read().decode("utf-8")


def discover_csv(page_url):
    html = fetch_text(page_url)
    match = CSV_HREF_RE.search(html)
    if not match:
        raise RuntimeError(f"No CSV link found on {page_url}")
    updated = LAST_UPDATED_RE.search(html)
    if not updated:
        raise RuntimeError(f"No published update date found on {page_url}")
    published = updated.group(1).strip().rstrip(".")
    return urljoin(page_url, match.group(1)), datetime.strptime(published, "%B %d, %Y").date().isoformat()


def fetch_csv(page_url):
    csv_url, updated = discover_csv(page_url)
    return io.StringIO(fetch_text(csv_url)), csv_url, updated


# OCP source rows use both the official municipality name and this abbreviation.
# Canonicalize before deduplicating or counting so one place is never rendered twice.
TOWN_ALIASES = {
    "Baring Plt": "Baring Plantation",
}


def norm(value):
    normalized = value.strip().lower().replace("-", " ").title()
    return TOWN_ALIASES.get(normalized, normalized)


def build_town_data(au_rows, cg_rows):
    """Build display rows plus complete, deduplicated source counts.

    The display intentionally gives adult-use stores priority when a municipality
    has both program types. Aggregate caregiver metrics must nevertheless count
    every caregiver storefront, including those in adult-use municipalities.
    """
    au_stores = defaultdict(list)
    au_seen = set()
    for row in au_rows:
        if row.get("LICENSE_STATUS") != "Active" or row.get("LICENSE_TYPE", "").strip() != "Store":
            continue
        dba = row.get("DBA", "").strip()
        if not dba:
            continue
        city = norm(row.get("LICENSE_CITY", ""))
        key = (dba.lower(), city.lower())
        if not city or key in au_seen:
            continue
        au_seen.add(key)
        au_stores[city].append(dba)

    cg_stores = defaultdict(list)
    cg_seen = set()
    for row in cg_rows:
        town = row.get("RETAIL_TOWN", "").strip()
        if not town:
            continue
        dba = row.get("REGISTRANT_DBA", "").strip() or row.get("REGISTRANT_NAME", "").strip()
        city = norm(town)
        key = (dba.lower(), city.lower())
        if not dba or key in cg_seen:
            continue
        cg_seen.add(key)
        cg_stores[city].append(dba)

    output = []
    for city in sorted(set(au_stores) | set(cg_stores)):
        au_list = au_stores.get(city, [])
        cg_list = cg_stores.get(city, [])
        if au_list:
            output.append({"n": city, "t": "au", "c": len(au_list), "s": au_list[:3]})
        elif cg_list:
            output.append({"n": city, "t": "med", "c": len(cg_list), "s": cg_list[:3]})

    counts = {
        "auStores": sum(len(stores) for stores in au_stores.values()),
        "auMunicipalities": len(au_stores),
        "caregiverStorefronts": sum(len(stores) for stores in cg_stores.values()),
        "caregiverMunicipalities": len(cg_stores),
    }
    return output, counts


def main():
    au_csv, au_url, au_updated = fetch_csv(OCP_AU_PAGE_URL)
    cg_csv, cg_url, cg_updated = fetch_csv(OCP_CG_PAGE_URL)
    output, counts = build_town_data(csv.DictReader(au_csv), csv.DictReader(cg_csv))

    print(json.dumps(output, indent=2))
    print(f"Source date: {au_updated} (adult-use), {cg_updated} (medical)", file=sys.stderr)
    print(f"Counts: {json.dumps(counts, sort_keys=True)}", file=sys.stderr)
    print(
        f"Adult-use CSV: {au_url}; medical CSV: {cg_url}; {len(output)} towns total",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
