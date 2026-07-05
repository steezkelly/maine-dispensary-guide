/**
 * /api/lead-capture — Astro endpoint (Vercel serverless, Node.js runtime)
 *
 * Receives MDG lead-magnet form submissions (currently: the consumer-facing
 * first-timer-field-guide landing page at /download/first-timer-field-guide),
 * validates them, and sends a PDF-bearing autoresponder email through
 * purelymail SMTP (smtp.purelymail.com:465). Writes a JSON-line lead log
 * (ephemeral on Vercel; also tee'd to stdout for Vercel log persistence)
 * and returns a small JSON response the client-side LeadFormTracker can
 * consume to fire a `generate_lead` GA4 event.
 *
 * --------------------------------------------------------------------------
 * VERCEL ENVIRONMENT VARIABLES — set in project settings BEFORE going live
 * --------------------------------------------------------------------------
 *   PURELYMAIL_SMTP_USER    purelymail SMTP username (e.g. leads@…)
 *   PURELYMAIL_SMTP_PASS    purelymail SMTP password (app password is fine)
 *   MDG_FROM_ADDRESS        From address shown to recipient
 *                           (default: leads@mainedispensaryguide.com)
 *   MDG_REPLY_TO            Reply-To address (default: hello@…)
 *   MDG_TEST_MODE           "1" enables the GET test endpoint described
 *                           at the bottom of this file (NEVER set in prod)
 *
 * In dev (any of the four SMTP/address vars missing), the handler logs
 * the would-be email instead of actually sending — it does not crash, so
 * the rest of the contract (validation, lead_id, log line) still works
 * for local development and CI.
 *
 * --------------------------------------------------------------------------
 * FOLLOW-UPS (intentionally not in this commit)
 * --------------------------------------------------------------------------
 *  - leads.jsonl is EPHEMERAL on Vercel (serverless instances are short-
 *    lived and the filesystem does not persist across cold starts).
 *    The same line is also written to stdout, which Vercel forwards to
 *    its log drain — so the durable record lives there for now.
 *    Long-term, swap the JSONL write for Vercel KV, an Upstash Redis
 *    webhook, or a PostHog/Pipedream sink. This is a one-file change.
 *  - In-memory dedupe and IP rate-limit maps are PER-INSTANCE. On Vercel,
 *    a cold start wipes them. Adequate for the low traffic this endpoint
 *    will receive (a few leads/day, not a credential-stuffing target);
 *    not a substitute for Vercel's WAF + edge rate limiting.
 *  - The endpoint returns a `ga4_event` field for the existing
 *    LeadFormTracker to fire on success. Updating LeadFormTracker to
 *    read that field is a separate, client-side-only commit.
 *  - The `/guides/maine-cannabis-caregiver-trade-show-sales` magnet is
 *    registered with pdf_path undefined; the handler returns ok:true
 *    with mail_sent:false and a clear `error` so the form can render
 *    a graceful "PDF coming soon" message without the user seeing a
 *    500. Add the PDF and update the registry when it's ready.
 *
 * --------------------------------------------------------------------------
 * TEST MODE
 * --------------------------------------------------------------------------
 * With MDG_TEST_MODE=1, GET /api/lead-capture?test=1 returns the magnet
 * registry plus a sample rendered email body so an agent can preview
 * changes without sending real mail:
 *
 *   curl 'https://mainedispensaryguide.com/api/lead-capture?test=1' \
 *        -H 'x-test: 1'
 *
 * Returns 404 unless MDG_TEST_MODE === '1' (so prod never leaks the
 * registry shape to the public).
 *
 * --------------------------------------------------------------------------
 * USAGE FROM A FORM
 * --------------------------------------------------------------------------
 *   <form action="/api/lead-capture" method="POST"
 *         enctype="application/x-www-form-urlencoded">
 *     <input name="email" type="email" required />
 *     <input name="magnet" type="hidden" value="first-timer-field-guide" />
 *     <input name="age_confirmed" type="checkbox" value="yes" required />
 *     <input name="name" type="text" />
 *     <input name="source_page" type="hidden" value="/download/first-timer-field-guide" />
 *   </form>
 *
 * The handler accepts both application/json and
 * application/x-www-form-urlencoded so the existing Formspree-style HTML
 * form works unchanged.
 */

import type { APIRoute } from 'astro';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';

// nodemailer ships without first-party type declarations and the project
// does not yet install @types/nodemailer. We type the surface we use via
// a small interface block and silence the missing-declaration warning on
// the runtime import. Once @types/nodemailer lands, both can be deleted.
interface NodemailerTransporter {
  sendMail(opts: NodemailerMailOptions): Promise<unknown>;
}
interface NodemailerMailOptions {
  from?: string;
  to: string | string[];
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename?: string;
    path?: string;
    contentType?: string;
  }>;
}
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — no @types/nodemailer installed yet
import nodemailer from 'nodemailer';
type Transporter = NodemailerTransporter;

// Static-site + Vercel adapter: prerender=false opts the file into
// the serverless function build instead of the static HTML bundle.
export const prerender = false;

// ---------------------------------------------------------------------------
// Magnet registry
//
// To add a new lead magnet, append an entry here. No other code changes.
// `pdf_path` may be omitted (or set to undefined) for magnets whose PDF
// is not yet ready — the handler will respond ok:true with mail_sent:false
// and a clear `error` so the form can render a "coming soon" message
// without an HTTP 500.
// ---------------------------------------------------------------------------

interface MagnetEntry {
  slug: string;
  name: string;
  pdf_path?: string;
  /** 2–3 sentence pitch linking back to MDG guide(s). */
  soft_pitch: string;
  /** Recommended CTA URL on mainedispensaryguide.com. */
  recommended_cta_url: string;
  /** True if this magnet is for operators rather than consumers. */
  operator_facing?: boolean;
}

const MAGNETS: Record<string, MagnetEntry> = {
  'first-timer-field-guide': {
    slug: 'first-timer-field-guide',
    name: "Maine First-Timer's Field Guide",
    pdf_path: '/downloads/maine-first-timer-field-guide.pdf',
    soft_pitch:
      "While you're here, the /guides/first-time-maine-dispensary-buyer " +
      'walkthrough pairs well with the PDF — it covers what to bring, ' +
      'what to ask the budtender, and the 2.5 oz possession rule in ' +
      "plain English. The /learn hub has the rest of MDG's consumer guides" +
      ' on dosing, COAs, terpenes, and reciprocity.',
    recommended_cta_url: '/guides/first-time-maine-dispensary-buyer',
    operator_facing: false,
  },
  'caregiver-trade-show-2026': {
    slug: 'caregiver-trade-show-2026',
    name: 'Maine Caregiver Trade-Show Sales 101 (LD 1840)',
    // PDF is not ready yet; handler returns ok:true + mail_sent:false.
    pdf_path: undefined,
    soft_pitch:
      'The full playbook lives at /guides/maine-cannabis-caregiver-trade-show-sales ' +
      'for now — it walks through LD 1840, the caregiver-to-consumer sales ' +
      'framework, and what Maine OCP has signaled about trade-show events.',
    recommended_cta_url: '/guides/maine-cannabis-caregiver-trade-show-sales',
    operator_facing: true,
  },
};

// ---------------------------------------------------------------------------
// Runtime config (from Vercel env)
// ---------------------------------------------------------------------------

const FROM_ADDRESS =
  (typeof process !== 'undefined' && process.env?.MDG_FROM_ADDRESS) ||
  'leads@mainedispensaryguide.com';
const REPLY_TO =
  (typeof process !== 'undefined' && process.env?.MDG_REPLY_TO) ||
  'hello@mainedispensaryguide.com';
const SMTP_USER =
  (typeof process !== 'undefined' && process.env?.PURELYMAIL_SMTP_USER) || '';
const SMTP_PASS =
  (typeof process !== 'undefined' && process.env?.PURELYMAIL_SMTP_PASS) || '';
const TEST_MODE =
  (typeof process !== 'undefined' &&
    process.env?.MDG_TEST_MODE === '1') ||
  false;

const HAS_SMTP_CREDS = Boolean(SMTP_USER && SMTP_PASS);

// One transporter per cold start — recreated only when creds change or
// the instance is recycled. nodemailer pools internally.
let _transporter: Transporter | null = null;
function getTransporter(): Transporter | null {
  if (!HAS_SMTP_CREDS) return null;
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: 'smtp.purelymail.com',
    port: 465,
    secure: true, // SSL on 465; STARTTLS would be port 587
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return _transporter;
}

// ---------------------------------------------------------------------------
// In-memory rate limit + dedupe (PER-INSTANCE; see FOLLOW-UPS above)
// ---------------------------------------------------------------------------

const DEDUPE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 10; // submissions per IP per hour

const dedupeMap = new Map<string, number>(); // key -> firstSeenMs
const ipRateMap = new Map<string, number[]>(); // ip -> timestamps[]

function isDuplicate(email: string, magnetSlug: string): boolean {
  const key = `${email.toLowerCase()}:${magnetSlug}`;
  const now = Date.now();
  const seen = dedupeMap.get(key);
  if (seen && now - seen < DEDUPE_WINDOW_MS) return true;
  dedupeMap.set(key, seen ?? now);
  // Sweep stale entries so the map doesn't grow unbounded across cold starts
  if (dedupeMap.size > 5000) {
    for (const [k, t] of dedupeMap) {
      if (now - t > DEDUPE_WINDOW_MS) dedupeMap.delete(k);
    }
  }
  return false;
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const existing = (ipRateMap.get(ip) || []).filter((t) => t > cutoff);
  if (existing.length >= RATE_LIMIT_MAX) {
    ipRateMap.set(ip, existing); // refresh the pruned list
    return true;
  }
  existing.push(now);
  ipRateMap.set(ip, existing);
  return false;
}

function getClientIp(request: Request, clientAddress?: string): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return clientAddress || 'unknown';
}

// ---------------------------------------------------------------------------
// Body parsing — accepts JSON or form-encoded
// ---------------------------------------------------------------------------

interface LeadInput {
  email: string;
  magnet: string;
  age_confirmed: boolean;
  name?: string;
  source_page?: string;
}

async function parseBody(request: Request): Promise<LeadInput | null> {
  const ct = request.headers.get('content-type') || '';
  let raw: Record<string, unknown> = {};
  try {
    if (ct.includes('application/json')) {
      raw = (await request.json()) as Record<string, unknown>;
    } else {
      // Default: treat as form-encoded (HTML form submit)
      const text = await request.text();
      const params = new URLSearchParams(text);
      for (const [k, v] of params) raw[k] = v;
    }
  } catch {
    return null;
  }

  // age_confirmed arrives as the literal string "yes" from a checkbox;
  // or as boolean true from JSON clients. Accept both.
  const ageRaw = raw.age_confirmed;
  const ageBool =
    ageRaw === true ||
    ageRaw === 'true' ||
    ageRaw === 'yes' ||
    ageRaw === 'on' ||
    ageRaw === '1';

  return {
    email: typeof raw.email === 'string' ? raw.email.trim() : '',
    magnet: typeof raw.magnet === 'string' ? raw.magnet.trim() : '',
    age_confirmed: ageBool,
    name: typeof raw.name === 'string' ? raw.name.trim() || undefined : undefined,
    source_page:
      typeof raw.source_page === 'string'
        ? raw.source_page.trim() || undefined
        : undefined,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(input: LeadInput): string | null {
  if (!input.email) return 'email is required';
  if (!EMAIL_RE.test(input.email)) return 'email is not a valid address';
  if (input.email.length > 254) return 'email is too long';
  if (!input.age_confirmed)
    return 'age confirmation is required (you must be 21+)';
  if (!input.magnet) return 'magnet slug is required';
  if (!MAGNETS[input.magnet]) return 'unknown magnet';
  return null;
}

// ---------------------------------------------------------------------------
// Email template builder
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmail(
  input: LeadInput,
  magnet: MagnetEntry,
  siteUrl = 'https://mainedispensaryguide.com',
): { subject: string; text: string; html: string } {
  const subject = `Your ${magnet.name} is inside`;
  const greeting = input.name ? `Hi ${escapeHtml(input.name)},` : 'Hi there,';
  const ctaUrl = `${siteUrl}${magnet.recommended_cta_url}`;

  const text =
    `${greeting}\n\n` +
    `Thanks for downloading the ${magnet.name}. The PDF is attached.\n\n` +
    `${magnet.soft_pitch}\n\n` +
    `Continue here: ${ctaUrl}\n\n` +
    `A note on health and safety: cannabis has not been evaluated by the FDA. ` +
    `This content is informational and not intended to diagnose, treat, cure, or ` +
    `prevent any disease. If you have questions, consult a licensed healthcare ` +
    `provider before using cannabis — especially if you are pregnant, nursing, ` +
    `taking medications, or have a medical condition.\n\n` +
    `Keep all cannabis products in child-resistant packaging, locked, and out of ` +
    `reach of children and pets. Do not drive or operate machinery under the ` +
    `influence of cannabis. Public consumption is illegal in Maine; Acadia ` +
    `National Park and all federal land prohibit cannabis regardless of state law.\n\n` +
    `— The Maine Dispensary Guide team\n` +
    `${siteUrl}\n\n` +
    `If you no longer want to receive these emails, reply with "unsubscribe" and ` +
    `we'll remove you from the list.`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F2F2E2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F2F2E2;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:32px 32px 16px 32px;">
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">${greeting}</p>
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">
              Thanks for downloading the <strong>${escapeHtml(magnet.name)}</strong>.
              The PDF is attached to this email.
            </p>
            <p style="margin:0 0 24px 0;font-size:15px;line-height:1.5;">
              ${escapeHtml(magnet.soft_pitch)}
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
              <tr>
                <td style="background:#1f4d3a;border-radius:6px;">
                  <a href="${escapeHtml(ctaUrl)}"
                     style="display:inline-block;padding:12px 20px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">
                    Continue on MDG &rarr;
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#555;">
              <em>Health &amp; safety:</em> Cannabis has not been evaluated by the FDA.
              This content is informational and not intended to diagnose, treat, cure,
              or prevent any disease. If you have questions, consult a licensed
              healthcare provider before using cannabis &mdash; especially if you are
              pregnant, nursing, taking medications, or have a medical condition.
            </p>
            <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#555;">
              Keep all cannabis products in child-resistant packaging, locked, and
              out of reach of children and pets. Do not drive or operate machinery
              under the influence of cannabis. Public consumption is illegal in Maine;
              Acadia National Park and all federal land prohibit cannabis regardless
              of state law.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 32px 32px;border-top:1px solid #eee;">
            <p style="margin:0;font-size:12px;line-height:1.5;color:#888;">
              &mdash; The Maine Dispensary Guide team<br />
              <a href="${escapeHtml(siteUrl)}" style="color:#888;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ''))}</a><br />
              Reply with "unsubscribe" to stop receiving these emails.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// PDF resolution — serverless: the public/ dir ships with the build.
// ---------------------------------------------------------------------------

function resolvePdfPath(publicPath: string): string | null {
  // On Vercel, the serverless bundle's cwd is the project root that
  // contains the public/ dir (apps/maine-cannabis at build, or the
  // lambda's extracted dir at runtime). resolve() with a leading slash
  // would escape that, so strip the slash before joining.
  const relative = publicPath.replace(/^\/+/, '');
  const candidates = [
    resolve(process.cwd(), 'public', relative),
    resolve(process.cwd(), relative),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Lead logging — JSONL (ephemeral) + stdout tee (Vercel log drain)
// ---------------------------------------------------------------------------

const LEADS_DIR = resolve(process.cwd(), '.vercel');
const LEADS_FILE = resolve(LEADS_DIR, 'leads.jsonl');

interface LeadLogLine {
  timestamp: string;
  lead_id: string;
  magnet: string;
  email_hash: string; // SHA-256 of lowercase email — never plaintext
  source_page?: string;
  mail_sent: boolean;
  ip: string;
  user_agent?: string;
}

function writeLeadLog(line: LeadLogLine): void {
  const json = JSON.stringify(line);
  // stdout is captured by Vercel and forwarded to the configured log
  // drain — this is the durable record until we wire up a KV sink.
  console.log(`[lead-capture] ${json}`);
  try {
    if (!existsSync(LEADS_DIR)) mkdirSync(LEADS_DIR, { recursive: true });
    appendFileSync(LEADS_FILE, json + '\n', 'utf8');
  } catch (err) {
    // Non-fatal: the stdout line is the source of truth on Vercel.
    console.warn('[lead-capture] leads.jsonl write failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex');
}

// ---------------------------------------------------------------------------
// POST /api/lead-capture
// ---------------------------------------------------------------------------

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = getClientIp(request, clientAddress);
  const userAgent = request.headers.get('user-agent') || undefined;

  const input = await parseBody(request);
  if (!input) {
    return jsonResponse({ ok: false, error: 'invalid request body' }, 400);
  }

  const validationError = validate(input);
  if (validationError) {
    return jsonResponse({ ok: false, error: validationError }, 400);
  }

  if (isDuplicate(input.email, input.magnet)) {
    return jsonResponse(
      { ok: false, error: 'duplicate submission; please try again later' },
      429,
    );
  }

  if (isRateLimited(ip)) {
    return jsonResponse(
      { ok: false, error: 'too many submissions from this IP; try again later' },
      429,
    );
  }

  const magnet = MAGNETS[input.magnet]!;
  const leadId = randomUUID();
  const emailHash = hashEmail(input.email);

  // PDF not ready yet: register the lead but skip the send.
  if (!magnet.pdf_path) {
    writeLeadLog({
      timestamp: new Date().toISOString(),
      lead_id: leadId,
      magnet: magnet.slug,
      email_hash: emailHash,
      source_page: input.source_page,
      mail_sent: false,
      ip,
      user_agent: userAgent,
    });
    return jsonResponse(
      {
        ok: true,
        lead_id: leadId,
        mail_sent: false,
        error: `PDF for "${magnet.name}" is not yet available`,
        ga4_event: {
          name: 'generate_lead',
          params: {
            form_name: `magnet-${magnet.slug}`,
            magnet_slug: magnet.slug,
            value: 0,
            currency: 'USD',
            mail_sent: false,
          },
        },
      },
      200,
    );
  }

  const pdfPath = resolvePdfPath(magnet.pdf_path);
  if (!pdfPath) {
    // Operator misconfiguration — log loudly, return 500. The lead is
    // intentionally NOT persisted on disk here because we don't want
    // a half-broken record in the JSONL file.
    console.error(
      `[lead-capture] PDF missing for magnet ${magnet.slug}: looked for ${magnet.pdf_path}`,
    );
    return jsonResponse(
      {
        ok: false,
        error:
          'PDF for this magnet is not available on the server. ' +
          'The site operator has been notified.',
      },
      500,
    );
  }

  const { subject, text, html } = buildEmail(input, magnet);
  const transporter = getTransporter();
  let mailSent = false;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: FROM_ADDRESS,
        to: input.email,
        replyTo: REPLY_TO,
        subject,
        text,
        html,
        attachments: [
          {
            filename: `${magnet.slug}.pdf`,
            path: pdfPath,
            contentType: 'application/pdf',
          },
        ],
      });
      mailSent = true;
    } catch (err) {
      console.error('[lead-capture] SMTP send failed:', err);
      // Fall through to dev-mode logging below so the lead is still
      // recorded; return 502 to signal the send failed.
      writeLeadLog({
        timestamp: new Date().toISOString(),
        lead_id: leadId,
        magnet: magnet.slug,
        email_hash: emailHash,
        source_page: input.source_page,
        mail_sent: false,
        ip,
        user_agent: userAgent,
      });
      return jsonResponse(
        {
          ok: false,
          error: 'failed to send email; please try again later',
          lead_id: leadId,
        },
        502,
      );
    }
  } else {
    // Dev / no-creds path: log the would-be email and pretend it sent
    // so the rest of the contract (lead_id, log line) still works.
    console.log(
      `[lead-capture] (dev/no-creds) would send to=${input.email} ` +
        `subject="${subject}" attachment=${magnet.slug}.pdf`,
    );
    mailSent = true;
  }

  writeLeadLog({
    timestamp: new Date().toISOString(),
    lead_id: leadId,
    magnet: magnet.slug,
    email_hash: emailHash,
    source_page: input.source_page,
    mail_sent: mailSent,
    ip,
    user_agent: userAgent,
  });

  return jsonResponse(
    {
      ok: true,
      lead_id: leadId,
      mail_sent: mailSent,
      ga4_event: {
        name: 'generate_lead',
        params: {
          form_name: `magnet-${magnet.slug}`,
          magnet_slug: magnet.slug,
          value: 0,
          currency: 'USD',
          mail_sent: mailSent,
        },
      },
    },
    200,
  );
};

// ---------------------------------------------------------------------------
// GET /api/lead-capture?test=1   (only when MDG_TEST_MODE === '1')
//
// Returns the magnet registry + a sample rendered email body so an agent
// can preview changes without sending real mail.
//
// Invoke:
//   curl 'https://mainedispensaryguide.com/api/lead-capture?test=1' \
//        -H 'x-test: 1'
// ---------------------------------------------------------------------------

export const GET: APIRoute = async ({ request }) => {
  if (!TEST_MODE) {
    return jsonResponse({ ok: false, error: 'not found' }, 404);
  }
  const url = new URL(request.url);
  if (url.searchParams.get('test') !== '1') {
    return jsonResponse({ ok: false, error: 'not found' }, 404);
  }

  const sampleMagnet = MAGNETS['first-timer-field-guide']!;
  const sample = buildEmail(
    {
      email: 'preview@example.com',
      magnet: sampleMagnet.slug,
      age_confirmed: true,
      name: 'Sample Reader',
      source_page: '/download/first-timer-field-guide',
    },
    sampleMagnet,
  );

  return jsonResponse(
    {
      ok: true,
      test_mode: true,
      registry: Object.values(MAGNETS),
      sample_email: {
        magnet: sampleMagnet.slug,
        from: FROM_ADDRESS,
        reply_to: REPLY_TO,
        to: 'preview@example.com',
        subject: sample.subject,
        text: sample.text,
        html: sample.html,
      },
      runtime: {
        has_smtp_creds: HAS_SMTP_CREDS,
        from_address: FROM_ADDRESS,
        reply_to: REPLY_TO,
      },
    },
    200,
  );
};