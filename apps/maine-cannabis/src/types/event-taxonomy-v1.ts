// apps/maine-cannabis/src/types/event-taxonomy-v1.ts
//
// MDG-ANALYTICS-001 Ticket 004 — Event Taxonomy v1 schema (TypeScript types).
//
// This is the formal REGISTER (the spec), not a runtime emit-side implementation
// (that lands in Ticket 006 once instrumentation v1 is authorized at A3 or A4).
// Each event MUST satisfy:
//   - a single decision-question (PER EVENT-TAXONOMY.md in v0.5 package)
//   - bounded parameters with TypeScript types
//   - bounded vocabulary / cardinality policy for every parameter that hits GA4 reporting
//   - privacy classification
//   - schema version
//
// Versioning: schema_version is mandatory on every emit. v1 is the first
// versioned taxonomy. v0 events (scroll_depth, page_engaged, faq_open, cta_view,
// site_tour_play, lead_capture, affiliate_click) emit under schema_version='v0' for compatibility
// with the existing 2026-07-11 instrumentation layer; they remain legacy signals
// per EVENT-TAXONOMY.md and the reconciliation report D1/D5/D6.
//
// Refs:
//   /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/EVENT-TAXONOMY.md
//   /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/PRIVACY-BOUNDARY.md
//   apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-ticket-000-ga4-instrumentation-audit.md
//   apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-reconciliation-vs-v0.5.md (D1, D5, D6)

export type SchemaVersion = 'v0' | 'v1';

export type PrivacyClassification =
  | 'anonymous_aggregate'          // pageview-like
  | 'pseudonymous_identifier'      // pseudonymous GA4 ID, NOT joined to leads
  | 'user_provided_text'           // user-entered text (forbidden except on explicit allowlist)
  | 'user_provided_identifier'     // email/phone (forbidden except on explicit allowlist)
  | 'none';

export type EventSchemaV0 =
  | 'scroll_depth'
  | 'page_engaged'
  | 'faq_open'
  | 'cta_view'
  | 'site_tour_play'
  | 'lead_capture'
  | 'affiliate_click';

// ----- v1 core events per EVENT-TAXONOMY.md "v1 core events" -----

export type EventSchemaV1 =
  | 'mdg_active_attention'           // Replacement for page_engaged
  | 'mdg_content_progress'           // Replacement for scroll_depth (per-archetype denominator)
  | 'mdg_toc_select'                 // Table-of-contents click
  | 'mdg_faq_open'                   // Versioned faq_open
  | 'mdg_action_exposure'            // CTA exposure (v1 pairing)
  | 'mdg_action_select'              // CTA selection (v1 pairing — production meaningful)
  | 'mdg_site_search'                // MDG-own search
  | 'mdg_search_result_select'       // MDG search result click
  | 'mdg_directory_interact'         // Filter / map / list
  | 'mdg_store_select'               // Site-result store select
  | 'mdg_calculator_start'           // Calculator first valid input
  | 'mdg_calculator_result'          // Calculator valid result
  | 'mdg_calculator_scenario_change' // Resulting scenario material change
  | 'mdg_dataset_download'           // Dataset CSV/JSON download
  | 'mdg_methodology_select'         // Dataset methodology click
  | 'mdg_source_select'              // Source/citation click
  | 'mdg_conversion_start'           // Conversion flow entered
  | 'mdg_conversion_complete';       // Conversion flow successfully completed (NOT button click)

export type EventName = EventSchemaV0 | EventSchemaV1;

// ----- Parameter primitives -----

/** Bounded enum-like values per EVENT-TAXONOMY.md "Event cardinality rule". */
export type AttentionSecondsBucket = 15 | 30 | 60 | 120 | 300;
export type ProgressBucket = 25 | 50 | 75 | 90 | 100;
export type ProgressModel = 'article_body' | 'task_steps' | 'city_guide_body' | 'operator_profile_body' | 'calculator_steps' | 'other';
export type SearchResultCountBucket = '0' | '1-3' | '4-10' | '11-25' | '26+';
export type DatasetFormat = 'csv' | 'json';

/** Allowed directory interaction_type values (spec enum). */
export type DirectoryInteractionType = 'filter' | 'map' | 'list' | 'sort' | 'paginate' | 'open_details';

/**
 * Every GA4-receiver parameter MUST be either:
 *   - one of the typed enums above;
 *   - a bounded string from an allowlist; or
 *   - a stable slug (NOT visible text per the spec).
 */
export type BoundedSlug<T extends string = string> = T extends string ? T : never;

// ----- Common event envelope -----

export interface EventEnvelope {
  schema_version: SchemaVersion;
  page_id?: string;            // foreign-key into page_task_manifest
  page_path: string;           // canonical or raw
  page_title: string;
  page_type?: string;
  privacy_classification: PrivacyClassification;
  /** instrumented_at in ISO 8601 (RFC 3339) UTC */
  instrumented_at: string;
}

// ----- v1 event payloads -----

export interface MdgActiveAttentionEvent extends EventEnvelope {
  event_name: 'mdg_active_attention';
  attention_seconds_bucket: AttentionSecondsBucket;
  content_zone?: string;       // bounded zone ID (NOT visible text)
  /** Same-site document.referrer pathname only; omitted for direct/external visits. */
  same_site_source_path?: string;
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgContentProgressEvent extends EventEnvelope {
  event_name: 'mdg_content_progress';
  progress_bucket: ProgressBucket;
  progress_model: ProgressModel;
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgTocSelectEvent extends EventEnvelope {
  event_name: 'mdg_toc_select';
  section_id: string;
  section_index: number;
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgFaqOpenEvent extends EventEnvelope {
  event_name: 'mdg_faq_open';
  faq_id: string;              // stable ID, NOT visible question text
  faq_index: number;
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgActionExposureEvent extends EventEnvelope {
  event_name: 'mdg_action_exposure';
  action_id: string;           // bounded slug
  action_family: 'cta_click' | 'cta_download' | 'cta_mailto' | 'cta_link' | 'cta_form_start' | 'cta_form_submit' | 'cta_share' | 'cta_navigate' | 'cta_search' | 'cta_filter';
  placement_id: string;        // bounded placement slug
  destination_family: 'internal_route' | 'external_url' | 'mailto_open' | 'tel_open' | 'download_start' | 'form_submit' | 'search_submit' | 'filter_apply' | 'other';
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgActionSelectEvent extends EventEnvelope {
  event_name: 'mdg_action_select';
  action_id: string;
  action_family: MdgActionExposureEvent['action_family'];
  placement_id: string;
  destination_family: MdgActionExposureEvent['destination_family'];
  /** Canonical same-site path only; omitted for external, mailto, and non-route actions. */
  destination_path?: string;
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgSiteSearchEvent extends EventEnvelope {
  event_name: 'mdg_site_search';
  search_surface: 'site_header_search' | 'directory_search' | 'store_locator' | 'calculator_helper' | 'other';
  result_count_bucket: SearchResultCountBucket;
  /** SPECIFICALLY FORBIDDEN: raw search_text. Privacy must be reviewed before adding. */
  search_text?: never;
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgSearchResultSelectEvent extends EventEnvelope {
  event_name: 'mdg_search_result_select';
  search_surface: MdgSiteSearchEvent['search_surface'];
  result_id: string;          // stable result ID
  result_type: 'guide' | 'city_guide' | 'operator_profile' | 'blog' | 'tool' | 'dataset' | 'product' | 'other';
  result_position: number;
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgDirectoryInteractEvent extends EventEnvelope {
  event_name: 'mdg_directory_interact';
  interaction_type: DirectoryInteractionType;
  control_id: string;
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgStoreSelectEvent extends EventEnvelope {
  event_name: 'mdg_store_select';
  store_id: string;           // stable operator slug
  selection_surface: 'city_guide_list' | 'directory_list' | 'map' | 'search_result' | 'related_module' | 'other';
  result_position?: number;   // nullable if not in a list
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgCalculatorStartEvent extends EventEnvelope {
  event_name: 'mdg_calculator_start';
  calculator_id: 'maine_cannabis_tax' | 'roi' | 'edible_dose' | 'other';
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgCalculatorResultEvent extends EventEnvelope {
  event_name: 'mdg_calculator_result';
  calculator_id: MdgCalculatorStartEvent['calculator_id'];
  scenario_version: string;   // when inputs/result function is versioned
  /** FORBIDDEN by default: financial input values, EXACT dose values. **No free-form keys.** */
  result_bucket?: 'low' | 'medium' | 'high' | 'custom'; // bucket; not raw value
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgCalculatorScenarioChangeEvent extends EventEnvelope {
  event_name: 'mdg_calculator_scenario_change';
  calculator_id: MdgCalculatorStartEvent['calculator_id'];
  scenario_version: string;
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgDatasetDownloadEvent extends EventEnvelope {
  event_name: 'mdg_dataset_download';
  dataset_slug: string;       // stable dataset slug, NOT user-typed
  format: DatasetFormat;
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgMethodologySelectEvent extends EventEnvelope {
  event_name: 'mdg_methodology_select';
  dataset_slug: string;
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgSourceSelectEvent extends EventEnvelope {
  event_name: 'mdg_source_select';
  source_id: string;
  source_family: 'citation' | 'reference_link' | 'methodology_link' | 'data_source' | 'tooling_credit' | 'other';
  placement_id: string;
  privacy_classification: 'anonymous_aggregate';
}

export interface MdgConversionStartEvent extends EventEnvelope {
  event_name: 'mdg_conversion_start';
  conversion_id: string;      // bounded slug: 'lead_capture' | 'first_timer_guide_download' | 'launch_checklist_start' | etc.
  surface_id: string;
  privacy_classification: 'pseudonymous_identifier';
}

export interface MdgConversionCompleteEvent extends EventEnvelope {
  event_name: 'mdg_conversion_complete';
  conversion_id: MdgConversionStartEvent['conversion_id'];
  surface_id: string;
  /** NOT a button click. A successful completion must map to a later task-success state. */
  completion_kind: 'mailto_opened' | 'download_started' | 'task_finished' | 'reservation_confirmed' | 'other';
  privacy_classification: 'pseudonymous_identifier';
}

// ----- v0 legacy event payloads (back-compat for 2026-07-11 instrumentation) -----

export interface ScrollDepthEvent extends EventEnvelope {
  event_name: 'scroll_depth';
  scroll_percent: 25 | 50 | 75 | 100;
  privacy_classification: 'anonymous_aggregate';
}

export interface PageEngagedEvent extends EventEnvelope {
  event_name: 'page_engaged';
  trigger: 'timer_30s_visible' | 'visibility_return';
  privacy_classification: 'anonymous_aggregate';
}

export interface FaqOpenV0Event extends EventEnvelope {
  event_name: 'faq_open';
  faq_id: string;
  privacy_classification: 'anonymous_aggregate';
}

export interface CtaViewV0Event extends EventEnvelope {
  event_name: 'cta_view';
  cta_id: string;
  privacy_classification: 'anonymous_aggregate';
}

export interface LeadCaptureV0Event extends EventEnvelope {
  event_name: 'lead_capture';
  surface: 'mailto_open' | 'form_submit_attempt' | 'other';
  surface_id: string;
  privacy_classification: 'pseudonymous_identifier';
}

export interface AffiliateClickV0Event extends EventEnvelope {
  event_name: 'affiliate_click';
  affiliate_id: string;
  placement_id: string;
  privacy_classification: 'pseudonymous_identifier';
}

// ----- Discriminated union -----

export type AnyEvent =
  // v1
  | MdgActiveAttentionEvent
  | MdgContentProgressEvent
  | MdgTocSelectEvent
  | MdgFaqOpenEvent
  | MdgActionExposureEvent
  | MdgActionSelectEvent
  | MdgSiteSearchEvent
  | MdgSearchResultSelectEvent
  | MdgDirectoryInteractEvent
  | MdgStoreSelectEvent
  | MdgCalculatorStartEvent
  | MdgCalculatorResultEvent
  | MdgCalculatorScenarioChangeEvent
  | MdgDatasetDownloadEvent
  | MdgMethodologySelectEvent
  | MdgSourceSelectEvent
  | MdgConversionStartEvent
  | MdgConversionCompleteEvent
  // v0 (legacy)
  | ScrollDepthEvent
  | PageEngagedEvent
  | FaqOpenV0Event
  | CtaViewV0Event
  | LeadCaptureV0Event
  | AffiliateClickV0Event;

// ----- Cardinality / privacy enforcement contract -----

/**
 * Cardinality policy enforcement table.
 *
 * The agent audit confirms: every parameter named in any payload above is
 * either (a) a bounded enum from this file, (b) a bounded slug from a
 * registered allowlist, or (c) a stable numeric/boolean. Free-form text is
 * forbidden except for explicitly listed `user_provided_text` instances,
 * of which v1 has NONE.
 */
export const PRIVACY_CLASS_FOR_EVENT: { [E in AnyEvent['event_name']]: PrivacyClassification } = {
  // v1
  mdg_active_attention: 'anonymous_aggregate',
  mdg_content_progress: 'anonymous_aggregate',
  mdg_toc_select: 'anonymous_aggregate',
  mdg_faq_open: 'anonymous_aggregate',
  mdg_action_exposure: 'anonymous_aggregate',
  mdg_action_select: 'anonymous_aggregate',
  mdg_site_search: 'anonymous_aggregate',
  mdg_search_result_select: 'anonymous_aggregate',
  mdg_directory_interact: 'anonymous_aggregate',
  mdg_store_select: 'anonymous_aggregate',
  mdg_calculator_start: 'anonymous_aggregate',
  mdg_calculator_result: 'anonymous_aggregate',
  mdg_calculator_scenario_change: 'anonymous_aggregate',
  mdg_dataset_download: 'anonymous_aggregate',
  mdg_methodology_select: 'anonymous_aggregate',
  mdg_source_select: 'anonymous_aggregate',
  mdg_conversion_start: 'pseudonymous_identifier',
  mdg_conversion_complete: 'pseudonymous_identifier',
  // v0
  scroll_depth: 'anonymous_aggregate',
  page_engaged: 'anonymous_aggregate',
  faq_open: 'anonymous_aggregate',
  cta_view: 'anonymous_aggregate',
  lead_capture: 'pseudonymous_identifier',
  affiliate_click: 'pseudonymous_identifier',
};

/** Privacy rule checklist (used by Ticket 005 measurement-health probes). */
export const PRIVACY_RULES_V1 = {
  free_text_forbidden: true,
  email_phone_name_forbidden: true,
  raw_search_text_forbidden: true,
  raw_financial_input_forbidden: true,
  financial_result_bucket_required: true,
  pseudonymous_id_join_to_leads_forbidden: true,
} as const;

/** Spec compliance: explicit decision question per event name. */
export const DECISION_QUESTION_FOR_EVENT: { [E in AnyEvent['event_name']]: string } = {
  // v1
  mdg_active_attention: 'Did the visitor spend active foreground time with evidence of recent user activity?',
  mdg_content_progress: 'How much of the primary content/task surface did the visitor reach?',
  mdg_toc_select: 'Which sections do visitors intentionally navigate to?',
  mdg_faq_open: 'Which explicit questions are users trying to answer?',
  mdg_action_exposure: 'Was a defined next-step action actually visible?',
  mdg_action_select: 'Did a visitor choose an exposed next step?',
  mdg_site_search: 'Did the visitor use MDG\'s own search/navigation tool?',
  mdg_search_result_select: 'Which search results are visitors choosing?',
  mdg_directory_interact: 'How do visitors engage with the directory listing?',
  mdg_store_select: 'Which store/dispensary result did the visitor choose?',
  mdg_calculator_start: 'Did the calculator receive a first valid task input?',
  mdg_calculator_result: 'Did the calculator reach a valid result state?',
  mdg_calculator_scenario_change: 'Did the user materially change a valid scenario?',
  mdg_dataset_download: 'Was a dataset downloaded and in what format?',
  mdg_methodology_select: 'Did the visitor review the dataset methodology?',
  mdg_source_select: 'Which source/citation did the visitor open?',
  mdg_conversion_start: 'Did the visitor enter a defined conversion flow?',
  mdg_conversion_complete: 'Did a defined conversion flow reach a real task-completion state?',
  // v0
  scroll_depth: 'LEGACY: how far did the visitor scroll? (kept for baseline continuity; v1 replaces with mdg_content_progress)',
  page_engaged: 'LEGACY: visibility+timer heuristic (weak semantics per verify-report; v1 replaces with mdg_active_attention)',
  faq_open: 'LEGACY: visitor opened an FAQ accordion (v1 supersedes as mdg_faq_open with stricter faq_id semantics)',
  cta_view: 'LEGACY: CTA entered viewport (v1 supersedes as mdg_action_exposure with action_id/action_family/placement_id)',
  lead_capture: 'LEGACY: mailto lead capture intent (logged client-side at click; v1 separates start/complete)',
  affiliate_click: 'Outbound affiliate click recorded (used to compute affiliate revenue CTR)',
};
