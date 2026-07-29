/**
 * Funnel configuration — Q3 2026 Industry Report tripwire funnel.
 *
 * Drop real values in here; the funnel page reads from this file.
 * No value here is a secret — Stripe Payment Links and the Meta Pixel ID
 * are both public, client-side identifiers.
 */

export const funnelConfig = {
  // --- Stripe Payment Links (create in Stripe Dashboard → Payment Links) ---
  // Basic Report: $1 one-time (anchor $19.99). Product: "Q3 2026 Report — Basic"
  // Pro Report:   $29 one-time (anchor $49).    Product: "Q3 2026 Report — Pro"
  // Leave as empty string until created; the page disables the button + shows
  // a "checkout coming soon" note when empty so the page never 404s a buyer.
  stripe: {
    basicPaymentLink: "", // e.g. "https://buy.stripe.com/xxxxxxxx"
    proPaymentLink: "",   // e.g. "https://buy.stripe.com/yyyyyyyy"
    // When creating Payment Links in Stripe, set success_url to:
    //   https://mainedispensaryguide.com/report/q3-2026-thanks?session_id={CHECKOUT_SESSION_ID}
    // This routes buyers to the download + Pro upsell page.
  },

  // --- Meta Pixel (Meta Events Manager → Connect Data Sources → Web) ---
  // Public pixel ID, safe to ship in client-side code.
  metaPixelId: "", // e.g. "1234567890123456"

  // --- Pricing (display only; the actual charge is set in Stripe) ---
  // Decisions-not-data ladder: $29 Report (anchor $97), $99 Pro (anchor $297).
  // Round-ish numbers over x7 to avoid the "internet-marketer playbook" smell
  // for a prestige B2B buyer. Subject to A/B test ($29 vs $27).
  pricing: {
    basic: { anchor: "$97", offer: "$29", label: "The Report" },
    pro: { anchor: "$297", offer: "$99", label: "Pro Intelligence Package" },
  },

  // --- Assets ---
  // The free sample delivered on the landing page (the "something for free").
  freeSamplePdf: "/downloads/maine-cannabis-industry-report-q3-2026.pdf",
} as const;

export type FunnelConfig = typeof funnelConfig;
