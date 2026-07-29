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
  },

  // --- Meta Pixel (Meta Events Manager → Connect Data Sources → Web) ---
  // Public pixel ID, safe to ship in client-side code.
  metaPixelId: "", // e.g. "1234567890123456"

  // --- Pricing (display only; the actual charge is set in Stripe) ---
  pricing: {
    basic: { anchor: "$19.99", offer: "$1", label: "Basic Report" },
    pro: { anchor: "$49", offer: "$29", label: "Pro Report" },
  },

  // --- Assets ---
  // The free sample delivered on the landing page (the "something for free").
  freeSamplePdf: "/downloads/maine-cannabis-industry-report-q3-2026.pdf",
} as const;

export type FunnelConfig = typeof funnelConfig;
