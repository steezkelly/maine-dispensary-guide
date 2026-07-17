-- MDG CTA funnel v1. Replace `PROJECT.analytics_XXXXXX` before running.
-- Privacy boundary: this query never selects user_pseudo_id, event timestamps,
-- or campaign/user identifiers. It joins aggregate same-site paths/referrers.
-- Destination arrival is navigation evidence, not a lead or task-success claim.
DECLARE start_date STRING DEFAULT '20260701';
DECLARE end_date STRING DEFAULT '20260731';
DECLARE site_host STRING DEFAULT 'mainedispensaryguide.com';

WITH event_params AS (
  SELECT
    event_name,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_path') AS page_path,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'action_id') AS action_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'action_family') AS action_family,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'placement_id') AS placement_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'destination_family') AS destination_family,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'destination_path') AS destination_path,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') AS page_location,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_referrer') AS page_referrer,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'same_site_source_path') AS same_site_source_path
  FROM `PROJECT.analytics_XXXXXX.events_*`
  WHERE _TABLE_SUFFIX BETWEEN start_date AND end_date
),
actions AS (
  SELECT
    page_path AS source_path, action_id, action_family, placement_id, destination_family,
    destination_path, event_name, COUNT(*) AS event_count
  FROM event_params
  WHERE event_name IN ('mdg_action_exposure', 'mdg_action_select')
    AND action_id IS NOT NULL AND action_family IS NOT NULL AND placement_id IS NOT NULL
  GROUP BY 1,2,3,4,5,6,7
),
exposures AS (
  SELECT * FROM actions WHERE event_name = 'mdg_action_exposure'
),
selects AS (
  SELECT * FROM actions WHERE event_name = 'mdg_action_select'
),
arrivals AS (
  SELECT
    REGEXP_EXTRACT(page_location, r'https?://[^/]+(/[^?#]*)') AS destination_path,
    REGEXP_EXTRACT(page_referrer, r'https?://[^/]+(/[^?#]*)') AS source_path,
    COUNT(*) AS destination_arrivals
  FROM event_params
  WHERE event_name = 'page_view'
    AND REGEXP_CONTAINS(page_referrer, CONCAT(r'^https?://(www\.)?', site_host, r'(/|$)'))
  GROUP BY 1,2
),
attention AS (
  -- The active-attention event carries only a normalized same-site source path;
  -- direct, search, and external-referrer visits have no joinable source.
  SELECT page_path AS destination_path, same_site_source_path AS source_path,
    COUNT(*) AS active_attention_events
  FROM event_params
  WHERE event_name = 'mdg_active_attention' AND same_site_source_path IS NOT NULL
  GROUP BY 1,2
),
selected_destinations AS (
  -- A source/destination pair may have many CTA IDs. It is intentionally
  -- de-duplicated before joining path-level outcomes.
  SELECT DISTINCT source_path, destination_path
  FROM selects
  WHERE destination_family = 'internal_route' AND destination_path IS NOT NULL
),
action_rows AS (
  -- CTA-level measurements stop at selection. Arrival and attention have no
  -- action-level attribution key, so joining them here would duplicate them.
  SELECT
    'action_cta' AS reporting_grain,
    CASE
      WHEN e.placement_id = 'editorial_next_step' THEN 'editorial_next_step'
      WHEN e.placement_id = 'contextual_conversion_action' THEN 'contextual_conversion_action'
      WHEN e.placement_id = 'auto_related_module' THEN 'auto_related_module'
      ELSE 'other_meaningful_cta'
    END AS reporting_module,
    e.source_path, e.action_id, e.action_family, e.placement_id, e.destination_family,
    s.destination_path,
    e.event_count AS exposures,
    COALESCE(s.event_count, 0) AS selects,
    CAST(NULL AS INT64) AS same_site_destination_arrivals,
    CAST(NULL AS INT64) AS destination_active_attention_events,
    'not_action_attributable' AS outcome_attribution
  FROM exposures e
  LEFT JOIN selects s USING (source_path, action_id, action_family, placement_id, destination_family)
),
destination_outcome_rows AS (
  -- These are path-level outcomes, not CTA outcomes: no action ID is present.
  SELECT
    'source_destination_outcome' AS reporting_grain,
    'unattributable_destination_outcome' AS reporting_module,
    d.source_path,
    CAST(NULL AS STRING) AS action_id,
    CAST(NULL AS STRING) AS action_family,
    CAST(NULL AS STRING) AS placement_id,
    'internal_route' AS destination_family,
    d.destination_path,
    CAST(NULL AS INT64) AS exposures,
    CAST(NULL AS INT64) AS selects,
    COALESCE(a.destination_arrivals, 0) AS same_site_destination_arrivals,
    COALESCE(att.active_attention_events, 0) AS destination_active_attention_events,
    'unattributable_to_individual_cta' AS outcome_attribution
  FROM selected_destinations d
  LEFT JOIN arrivals a USING (source_path, destination_path)
  LEFT JOIN attention att USING (source_path, destination_path)
)
SELECT * FROM action_rows
UNION ALL
SELECT * FROM destination_outcome_rows
ORDER BY reporting_grain, reporting_module, exposures DESC, same_site_destination_arrivals DESC;
