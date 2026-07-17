'use strict';
/**
 * scripts/analytics/ga4-bigquery.cjs
 *
 * BigQuery client for the 8 named reports (R1-R8) of Ticket 007.
 *
 * Per v3 §3.1, the actual dataset uses `events_intraday_*` shards
 * (72h retention). The 31-column schema matches the v2 spec exactly.
 *
 * Sanitization (v3 §3.3): prohibited fields per v3 §3.2 are stripped
 * before BQ returns rows; sanitized raw_record_json is what's stored.
 *
 * No pseudonymous identifiers (user_pseudo_id, session_id) are
 * persisted — see ga4-source-ingest.cjs §5 (compute-and-discard
 * pattern during ingest).
 *
 * Per-day routing (v3 §8): this client returns rows for BQ only when
 * `event_date >= today - 3 days`. Historical > 3-day data is Data-API-only.
 */

const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'maine-dispensary-guide';
const DATASET_ID = process.env.GA4_BQ_DATASET || 'analytics_532778727';
const PROPERTY_ID = process.env.GA4_PROPERTY_ID || '532778727';
const PROPERTY_TIMEZONE = 'America/New_York';

/**
 * The full standard GA4 BQ export column list. We DO NOT select
 * any field outside this list — the §3.2 blocklist runs at the
 * SQL level via the SELECT projection.
 *
 * Prohibited fields (per v3 §3.2): user_id (raw), geo.metro,
 * geo.city_id, device.category raw in some contexts, device.advertising_id,
 * device.language raw, privacy_info.*, ip_address (if exposed),
 * user_agent (if exposed), device.operating_system_version raw,
 * geo.continent, app_info.*.
 */
const ALLOWED_TOP_LEVEL = [
  'event_date',
  'event_timestamp',
  'event_name',
  'event_previous_timestamp',
  'event_value_in_usd',
  'event_bundle_sequence_id',
  'event_server_timestamp_offset',
  'user_first_touch_timestamp',
  'is_active_user',
  'batch_event_index',
  'batch_page_id',
  'batch_ordering_id',
  'stream_id',
  'platform'
];

const ALLOWED_DEVICE_FIELDS = [
  'device.category',
  'device.web_info.browser',
  'device.operating_system',
  'device.language',
  'device.web_info.hostname'
];

const ALLOWED_GEO_FIELDS = [
  'geo.country',
  'geo.region',
  'geo.city'
];

const ALLOWED_TRAFFIC_FIELDS = [
  'traffic_source.source',
  'traffic_source.medium',
  'traffic_source.name'
];

const ALLOWED_EVENT_PARAM_KEYS = [
  'percent',
  'trigger',
  'faq_id',
  'cta_id',
  'position',
  'page_title',
  'page_referrer',
  'percent',
  'duration',
  'progress_bucket',
  'progress_model',
  'section_id',
  'section_index',
  'faq_index',
  'action_id',
  'action_family',
  'placement_id',
  'destination_family',
  'search_surface',
  'result_count_bucket',
  'result_id',
  'result_type',
  'result_position',
  'interaction_type',
  'control_id',
  'store_id',
  'selection_surface',
  'dataset_slug',
  'format',
  'source_id',
  'source_family',
  'conversion_id',
  'surface_id',
  'scenario_version'
];

/**
 * Blocklisted event-param keys (per v3 §11). Blocklisted before any
 * row is returned from queryBqReport(). Silent drop with per-run
 * counter.
 */
const BLOCKED_EVENT_PARAM_PATTERNS = [
  /email/i, /phone/i, /name/i, /address/i, /ssn/i, /dob/i,
  /token/i, /key/i, /secret/i, /password/i,
  /consent/i, /privacy/i,
  /^_/, /^internal/, /^debug/, /^test/, /^dryrun/, /^dry_run/,
  /uuid/i, /^.*_ip$/i
];

/**
 * Get a BigQuery client. Lazy: only constructs when first called.
 */
function getClient() {
  return new BigQuery({ projectId: PROJECT_ID });
}

/**
 * Filter an event_param record (key, value, int_value, etc.) per
 * the allowlist. Returns the sanitized params object and a count
 * of dropped params.
 *
 * @param {Array<{key:string,value:any,int_value:any,float_value:any,double_value:any}>} eventParams
 * @returns {{ sanitized: Array, dropped: number }}
 */
function sanitizeEventParams(eventParams) {
  if (!Array.isArray(eventParams)) return { sanitized: [], dropped: 0 };
  const sanitized = [];
  let dropped = 0;
  for (const p of eventParams) {
    const k = (p.key || '').toLowerCase();
    const blocked = BLOCKED_EVENT_PARAM_PATTERNS.some((re) => re.test(k));
    if (blocked || !ALLOWED_EVENT_PARAM_KEYS.includes(k)) { dropped++; continue; }
    sanitized.push(p);
  }
  return { sanitized, dropped };
}

/**
 * Build the BQ mirror SQL for a given named report.
 *
 * For most reports the BQ mirror is a per-day aggregation. Completed dates
 * are read from `events_*`; only the current date reads `events_intraday_*`.
 * R7/R8 (custom event dimensions) require extracting the custom-dim keys
 * from `event_params`.
 */
function buildBqSql(reportKey, from, to, propertyDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(propertyDate || ''))) {
    throw new TypeError('an explicit GA4 property date snapshot is required');
  }
  const rangeFilter = `_TABLE_SUFFIX BETWEEN REPLACE('${from}','-','') AND REPLACE('${to}','-','')`;
  const currentDaySuffix = `REPLACE('${propertyDate}','-','')`;
  // Daily exports are the durable source for completed GA4 dates. The
  // intraday table is retained only for the current date so a day cannot be
  // double-counted when the daily shard appears.
  const tab = `(
    SELECT *, CONCAT('${PROJECT_ID}.${DATASET_ID}.events_', _TABLE_SUFFIX) AS _mdg_source_table
    FROM \`${PROJECT_ID}.${DATASET_ID}.events_*\`
    WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{8}$')
      AND ${rangeFilter}
      AND _TABLE_SUFFIX < ${currentDaySuffix}
    UNION ALL
    SELECT *, CONCAT('${PROJECT_ID}.${DATASET_ID}.events_intraday_', _TABLE_SUFFIX) AS _mdg_source_table
    FROM \`${PROJECT_ID}.${DATASET_ID}.events_intraday_*\`
    WHERE ${rangeFilter}
      AND _TABLE_SUFFIX = ${currentDaySuffix}
  )`;
  const pageLocationSql = `(SELECT value.string_value FROM UNNEST(event_params) WHERE key='page_location')`;
  const pagePathSql = `IF(
    REGEXP_CONTAINS(${pageLocationSql}, r'^[a-zA-Z][a-zA-Z0-9+.-]*://'),
    COALESCE(NULLIF(REGEXP_EXTRACT(${pageLocationSql}, r'^[a-zA-Z][a-zA-Z0-9+.-]*://[^/]+([^?#]*)'), ''), '/'),
    COALESCE(NULLIF(REGEXP_EXTRACT(${pageLocationSql}, r'^([^?#]*)'), ''), '/')
  )`;

  switch (reportKey) {
    case 'R1_pageview_daily': {
      // page-level time series: rows for every (date, page, title).
      // Note: pagePath / pageTitle in BQ come from the page_location
      // event_param or the document_location_url field. We pick page_location.
      return `
        SELECT
          event_date,
          ${pagePathSql} AS pagePath,
          (SELECT value.string_value FROM UNNEST(event_params) WHERE key='page_title') AS pageTitle,
          COUNT(*) AS screenPageViews,
          COUNT(DISTINCT user_pseudo_id) AS totalUsers,
          COUNT(DISTINCT CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key='ga_session_id') AS STRING)
                || ':' || user_pseudo_id) AS sessions,
          ANY_VALUE(_mdg_source_table) AS bq_source_table
        FROM ${tab}
        WHERE event_name IN ('page_view')
        GROUP BY event_date, pagePath, pageTitle
      `;
    }
    case 'R2_session_metrics_daily': {
      // GA4 does not populate session-scoped attribution in events_intraday_*.
      // Do not manufacture a non-equivalent BQ channel dimension for reconciliation.
      throw new Error('R2 session-scoped attribution is not available from events_intraday_*; BigQuery reconciliation is intentionally unavailable for this report');
    }
    case 'R3_event_count_daily': {
      return `
        SELECT event_date, ${pagePathSql} AS pagePath, event_name, COUNT(*) AS eventCount,
          ANY_VALUE(_mdg_source_table) AS bq_source_table
        FROM ${tab}
        WHERE event_name IN ('page_view', 'scroll', 'scroll_depth', 'click', 'page_engaged', 'fa_open', 'faq_open', 'cta_view', 'lead_capture', 'affiliate_click', 'user_engagement', 'session_start')
        GROUP BY event_date, pagePath, event_name
      `;
    }
    case 'R4_geo_daily': {
      return `
        SELECT event_date, geo.country, geo.region, geo.city,
          COUNT(DISTINCT user_pseudo_id) AS totalUsers,
          COUNT(DISTINCT CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key='ga_session_id') AS STRING)
                || ':' || user_pseudo_id) AS sessions,
          ANY_VALUE(_mdg_source_table) AS bq_source_table
        FROM ${tab}
        GROUP BY event_date, geo.country, geo.region, geo.city
      `;
    }
    case 'R5_device_daily': {
      return `
        SELECT event_date, device.category AS deviceCategory,
          device.web_info.browser AS browser,
          device.operating_system AS operatingSystem,
          COUNT(DISTINCT user_pseudo_id) AS totalUsers,
          COUNT(DISTINCT CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key='ga_session_id') AS STRING)
                || ':' || user_pseudo_id) AS sessions,
          ANY_VALUE(_mdg_source_table) AS bq_source_table
        FROM ${tab}
        GROUP BY event_date, deviceCategory, browser, operatingSystem
      `;
    }
    case 'R6_new_vs_returning_daily': {
      // new vs returning requires per-day first-touch comparison; simplified BQ mirror:
      return `
        WITH session_events AS (
          SELECT
            event_date,
            -- Classify after grouping events into a session so a new user's
            -- follow-on events cannot also create a returning-session row.
            CASE
              WHEN COUNTIF(event_name = 'first_visit') > 0 THEN 'new'
              ELSE 'returning'
            END AS newVsReturning,
            user_pseudo_id,
            CONCAT(
              user_pseudo_id,
              ':',
              CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key='ga_session_id') AS STRING)
            ) AS session_key,
            MAX(IF(
              COALESCE(
                (SELECT value.string_value FROM UNNEST(event_params) WHERE key='session_engaged'),
                CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key='session_engaged') AS STRING)
              ) = '1',
              1,
              0
            )) AS session_engaged,
            ANY_VALUE(_mdg_source_table) AS bq_source_table
          FROM ${tab}
          WHERE (SELECT value.int_value FROM UNNEST(event_params) WHERE key='ga_session_id') IS NOT NULL
          GROUP BY event_date, user_pseudo_id, session_key
        )
        SELECT event_date, newVsReturning,
          COUNT(DISTINCT user_pseudo_id) AS totalUsers,
          COUNT(DISTINCT session_key) AS sessions,
          COUNT(DISTINCT IF(session_engaged = 1, session_key, NULL)) AS engagedSessions,
          ANY_VALUE(bq_source_table) AS bq_source_table
        FROM session_events
        GROUP BY event_date, newVsReturning
      `;
    }
    case 'R7_custom_event_faq_daily': {
      return `
        SELECT event_date,
          ${pagePathSql} AS pagePath,
          (SELECT value.string_value FROM UNNEST(event_params) WHERE key='faq_id') AS faq_id,
          COUNT(*) AS eventCount,
          ANY_VALUE(_mdg_source_table) AS bq_source_table
        FROM ${tab}
        WHERE event_name = 'faq_open'
        GROUP BY event_date, pagePath, faq_id
      `;
    }
    case 'R8_custom_event_cta_daily': {
      return `
        SELECT event_date,
          ${pagePathSql} AS pagePath,
          (SELECT value.string_value FROM UNNEST(event_params) WHERE key='cta_id') AS cta_id,
          COUNT(*) AS eventCount,
          ANY_VALUE(_mdg_source_table) AS bq_source_table
        FROM ${tab}
        WHERE event_name = 'cta_view'
        GROUP BY event_date, pagePath, cta_id
      `;
    }
    default:
      throw new Error('Unknown report key: ' + reportKey);
  }
}

/**
 * Query a single named report from BigQuery.
 *
 * Returns a sanitized row array: prohibited fields stripped, event_params
 * allowlisted per §3.4, user_pseudo_id replaced with `[REDACTED-PSEUDO]`,
 * session_id replaced with `[REDACTED-SESSION]`.
 *
 * @param {string} reportKey
 * @param {string} from - YYYY-MM-DD
 * @param {string} to - YYYY-MM-DD
 * @param {string} propertyDate - frozen GA4 property-local date for this ingestion run
 * @returns {Promise<{ report_key, report_id, from, to, rowCount, rows, sanitization: { dropped_params: number }, fetched_at_utc }>}
 */
async function queryBqReport(reportKey, from, to, propertyDate) {
  if (reportKey === 'R2_session_metrics_daily') {
    return {
      status: 'unavailable_intraday',
      compat_status: 'not_comparable',
      report_key: reportKey,
      report_id: reportKey.replace(/^R\d+_/, ''),
      from, to,
      property_date_snapshot: propertyDate,
      rowCount: 0,
      rows: [],
      sanitization: { dropped_params: 0, sanitized_rows: 0 },
      reason: 'session-scoped attribution is unavailable from events_intraday_*',
      fetched_at_utc: new Date().toISOString()
    };
  }
  const client = getClient();
  const sql = buildBqSql(reportKey, from, to, propertyDate);

  try {
    const [rows] = await client.query({ query: sql, location: 'US' });

    let droppedTotal = 0;
    const sanitizedRows = rows.map((r) => {
      // Apply sanitized-evidence contract per v3 §3.3
      const sanitized = {
        event_date: r.event_date,
        event_timestamp: r.event_timestamp,
        event_name: r.event_name,
        stream_id: r.stream_id,
        platform: r.platform,
        traffic_source: r.traffic_source ? {
          source: r.traffic_source.source,
          medium: r.traffic_source.medium,
          name: r.traffic_source.name
        } : null,
        device: r.device ? {
          category: r.device.category,
          browser: r.device.web_info?.browser,
          operating_system: r.device.operating_system,
          language: r.device.language,
          hostname: r.device.web_info?.hostname
        } : null,
        geo: r.geo ? {
          country: r.geo.country,
          region: r.geo.region,
          city: r.geo.city
        } : null,
        user_pseudo_id: '[REDACTED-PSEUDO]',  // never stored raw
        session_id: '[REDACTED-SESSION]',
        is_active_user: r.is_active_user,
        metrics: {}
      };

      // Add metric values per report definition
      const REPORT_METRICS = {
        R1_pageview_daily: ['screenPageViews', 'totalUsers', 'sessions'],
        R2_session_metrics_daily: ['sessions', 'engagedSessions', 'engagementRate', 'averageSessionDuration', 'bounceRate'],
        R3_event_count_daily: ['eventCount'],
        R4_geo_daily: ['totalUsers', 'sessions'],
        R5_device_daily: ['totalUsers', 'sessions'],
        R6_new_vs_returning_daily: ['totalUsers', 'sessions', 'engagedSessions'],
        R7_custom_event_faq_daily: ['eventCount'],
        R8_custom_event_cta_daily: ['eventCount']
      };
      const metricsToCopy = REPORT_METRICS[reportKey] || [];
      for (const m of metricsToCopy) {
        if (r[m] !== undefined) sanitized.metrics[m] = r[m];
      }

      // Capture report-specific dimension fields into a flat row_key
      sanitized.row_key = {};
      const REPORT_DIMENSIONS = {
        R1_pageview_daily: ['event_date', 'pagePath', 'pageTitle'],
        R2_session_metrics_daily: ['event_date', 'sessionDefaultChannelGroup'],
        R3_event_count_daily: ['event_date', 'pagePath', 'event_name'],
        R4_geo_daily: ['event_date', 'country', 'region', 'city'],
        R5_device_daily: ['event_date', 'deviceCategory', 'browser', 'operatingSystem'],
        R6_new_vs_returning_daily: ['event_date', 'newVsReturning'],
        R7_custom_event_faq_daily: ['event_date', 'pagePath', 'faq_id'],
        R8_custom_event_cta_daily: ['event_date', 'pagePath', 'cta_id']
      };
      const dims = REPORT_DIMENSIONS[reportKey] || [];
      for (const d of dims) {
        if (d === 'event_date') sanitized.row_key[d] = r.event_date;
        else if (d === 'event_name') sanitized.row_key[d] = r.event_name;
        else if (d === 'pagePath') sanitized.row_key[d] = r.pagePath;
        else if (d === 'pageTitle') sanitized.row_key[d] = r.pageTitle;
        else if (d === 'sessionDefaultChannelGroup') sanitized.row_key[d] = r.sessionDefaultChannelGroup;
        else if (d === 'country') sanitized.row_key[d] = r.country;
        else if (d === 'region') sanitized.row_key[d] = r.region;
        else if (d === 'city') sanitized.row_key[d] = r.city;
        else if (d === 'deviceCategory') sanitized.row_key[d] = r.deviceCategory;
        else if (d === 'browser') sanitized.row_key[d] = r.browser;
        else if (d === 'operatingSystem') sanitized.row_key[d] = r.operatingSystem;
        else if (d === 'newVsReturning') sanitized.row_key[d] = r.newVsReturning;
        else if (d === 'faq_id') sanitized.row_key[d] = r.faq_id;
        else if (d === 'cta_id') sanitized.row_key[d] = r.cta_id;
      }

      // Sanitize event_params
      if (r.event_params) {
        const { sanitized: params, dropped } = sanitizeEventParams(r.event_params);
        droppedTotal += dropped;
        // Note: in a BQ aggregate query, event_params is not directly
        // accessible per aggregate row. Most aggregates don't return it.
        if (params.length) sanitized.event_params = params;
      }

      // source_provenance: re-query pointer (v3 §3.3)
      sanitized.source_provenance = {
        bq_table: r.bq_source_table || `${PROJECT_ID}.${DATASET_ID}.events_intraday_${(r.event_date || '').replace(/-/g, '')}`,
        bq_row_offset: r._offset || null,
        fetched_at_utc: new Date().toISOString(),
        stream_id: r.stream_id
      };

      return sanitized;
    });

    return {
      status: 'ok',
      report_key: reportKey,
      report_id: reportKey.replace(/^R\d+_/, ''),
      from, to,
      property_date_snapshot: propertyDate,
      rowCount: rows.length,
      rows: sanitizedRows,
      sanitization: { dropped_params: droppedTotal, sanitized_rows: sanitizedRows.length },
      fetched_at_utc: new Date().toISOString()
    };
  } catch (e) {
    return {
      status: 'failed',
      report_key: reportKey,
      report_id: reportKey.replace(/^R\d+_/, ''),
      from, to,
      property_date_snapshot: propertyDate,
      rowCount: 0,
      rows: [],
      sanitization: { dropped_params: 0, sanitized_rows: 0 },
      error: { code: e.code || 'unknown', message: String(e.message || e) },
      fetched_at_utc: new Date().toISOString()
    };
  }
}

module.exports = {
  PROJECT_ID,
  DATASET_ID,
  PROPERTY_ID,
  PROPERTY_TIMEZONE,
  ALLOWED_EVENT_PARAM_KEYS,
  getClient,
  sanitizeEventParams,
  buildBqSql,
  queryBqReport
};
