// src/lib/ga4.ts
//
// Typed constants + small helpers for GA4 custom events.
// MDG event taxonomy (kept stable — GA4 reports pivot on these names).
//
// Engagement signals that feed the "User stickiness", "Avg engagement time
// per active user", and "Pageviews per active user" dashboard layer:
//   - scroll_depth     fired at 25/50/75/100% thresholds per page
//   - page_engaged     fired at 30s if tab focused, OR on visibility→visible
//   - faq_open         fired when a <details data-faq> toggles open
//   - cta_view         fired when a [data-cta-id] enters viewport
//
// Convention: every event MUST carry page_path + page_title. These two
// dimensions are the join keys for the weekly engagement cron.

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export const GA4_EVENT = {
  SCROLL_DEPTH: 'scroll_depth',
  PAGE_ENGAGED: 'page_engaged',
  FAQ_OPEN: 'faq_open',
  CTA_VIEW: 'cta_view',
  // Existing events owned by other components — referenced here only so
  // future authors discover them via autocomplete.
  LEAD_CAPTURE: 'lead_capture',
  AFFILIATE_CLICK: 'affiliate_click',
} as const;

export type Ga4EventName = typeof GA4_EVENT[keyof typeof GA4_EVENT];

export interface Ga4PageContext {
  page_path: string;
  page_title: string;
  page_type?: string; // 'guide' | 'blog' | 'home' | 'operator' | 'directory' | ...
}

let ctx: Ga4PageContext | null = null;

/**
 * Called from Layout.astro on every page. Captures path + title once so the
 * four engagement listeners can stamp every event with stable dimensions.
 */
export function setGa4Context(c: Ga4PageContext): void {
  ctx = c;
}

export function getGa4Context(): Ga4PageContext {
  if (ctx) return ctx;
  // Fallback: derive from window so gtag fires even if init script order
  // shifts. Title is what GA4 will see anyway.
  return {
    page_path: typeof window !== 'undefined' ? window.location.pathname : '',
    page_title: typeof document !== 'undefined' ? document.title : '',
  };
}

/**
 * Fire a GA4 event. No-op during SSR (no window) and silent if gtag
 * hasn't loaded yet — both situations are safe because Enhanced
 * Measurement's auto-events still cover the underlying signal.
 */
export function track(event: Ga4EventName, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', event, { ...getGa4Context(), ...params });
}