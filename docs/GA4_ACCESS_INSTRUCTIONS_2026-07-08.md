# GA4 Access for Service Account — 5-Minute Setup

**Date:** 2026-07-08
**Owner:** Steve (operator)
**Agent:** Gaia / Hermes
**Why:** GSC integration works. GA4 integration is wired (`apps/maine-cannabis/scripts/seo/ga4-lead-capture-daily.cjs`) but the Google Cloud service account that powers GSC has not been granted access to the GA4 property. Until granted, the daily GA4 lead-capture dump cannot run.

## Service account to grant

`mdg-analytics-reader@maine-dispensary-guide.iam.gserviceaccount.com`

(this is the **same** service account already used for GSC. Verified that GSC access works — same keyfile at `~/.config/maine-dispensary-guide/gcp-mdg-reader.json` mints tokens successfully.)

## What to do (5 minutes)

1. Open **https://analytics.google.com/** in a browser. Log in with the Google account that owns the MDG GA4 property.
2. Click **Admin** (bottom-left gear icon).
3. In the **Property column** (middle), click **Property Access Management**.
4. Click the blue **+** button → **Add users**.
5. Paste: `mdg-analytics-reader@maine-dispensary-guide.iam.gserviceaccount.com`
6. Set **Role** to **Viewer** (read-only is sufficient for the daily dump).
7. Check **Notify this user by email** if you want — not required.
8. Click **Add**.

Confirmation dialog appears immediately. Within 60 seconds, the GA4 Data API will accept requests from this service account.

## Verify it worked (run in your terminal)

```bash
source ~/.local/share/hermes-cli-tools/venv/bin/activate
GA4_PROPERTY_ID=$(grep -oE '"analyticsId":\s*"G-[A-Z0-9]+"' \
    /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/src/data/site-config.json \
    | sed 's/.*G-\([A-Z0-9]*\).*/\1/' | tr 'A-Z' 'a-z' | tr -d '\n')
# Note: GA4_PROPERTY_ID above is the Measurement ID, not the numeric Property ID.
# Find the NUMERIC Property ID at:
#   analytics.google.com → Admin → Property Settings → "Property ID" (top right)
# Replace the placeholder in the script env with the numeric ID, e.g.:
export GA4_PROPERTY_ID=123456789  # <-- get this from GA Admin
GA4_PROPERTY_ID=$GA4_PROPERTY_ID node /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/scripts/seo/ga4-lead-capture-daily.cjs
```

Expected output if access is granted:
```
[ga4-lead-capture-daily] OK — N rows | M lead_capture events | appended to ga4-lead-capture.jsonl
```

If access is NOT yet granted (or wrong Property ID):
```
[ga4-lead-capture-daily] FAIL — GA4 access not granted to service account yet.
... detailed instructions ...
```

## What this unlocks

- Daily `lead_capture` event dump → `apps/maine-cannabis/data/ga4-lead-capture.jsonl`
- Per-form conversion rate (the GA4 dashboard panel you mentioned)
- CTR-loser detection on lead forms (separate from GSC)
- Cross-device attribution once the `user_id` dimension is wired in `LeadFormTracker.astro`

## Cron wiring

Once access is granted, I'll wire the daily cron (parallels the GSC dump):
```
0 8 * * * /home/steve/.local/bin/node /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/scripts/seo/ga4-lead-capture-daily.cjs >> /home/steve/.local/log/ga4-lead-capture.log 2>&1
```

Until `crond` is enabled on Manjaro (`sudo systemctl start crond`), you can run it manually any time:
```
GA4_PROPERTY_ID=123456789 node apps/maine-cannabis/scripts/seo/ga4-lead-capture-daily.cjs
```
