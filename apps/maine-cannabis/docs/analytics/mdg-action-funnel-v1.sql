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
)
SELECT
  CASE
    WHEN placement_id = 'editorial_next_step' THEN 'editorial_next_step'
    WHEN placement_id = 'contextual_conversion_action' THEN 'contextual_conversion_action'
    WHEN placement_id = 'auto_related_module' THEN 'auto_related_module'
    ELSE 'other_meaningful_cta'
  END AS reporting_module,
  e.source_path, e.action_id, e.action_family, e.placement_id, e.destination_family,
  s.destination_path,
  e.event_count AS exposures,
  COALESCE(s.event_count, 0) AS selects,
  COALESCE(a.destination_arrivals, 0) AS same_site_destination_arrivals,
  COALESCE(att.active_attention_events, 0) AS destination_active_attention_events
FROM exposures e
LEFT JOIN selects s USING (source_path, action_id, action_family, placement_id, destination_family)
LEFT JOIN arrivals a ON a.source_path = e.source_path AND a.destination_path = s.destination_path
LEFT JOIN attention att ON att.source_path = e.source_path AND att.destination_path = s.destination_path
ORDER BY reporting_module, exposures DESC;
