// RSS 2.0 feed for /about/corrections.
//
// Astro static endpoint. Generates a static XML file at build time. Pulls
// from the same src/data/corrections-log.ts the HTML page consumes, so
// appending an entry to CORRECTIONS regenerates both surfaces on next
// build.
//
// Consumers: any RSS reader (Feedly, NetNewsWire, Reeder, etc.). The
// `application/rss+xml` content type is widely-recognized; readers will
// auto-detect from <link rel="alternate" type="application/rss+xml">
// when we wire it into the HTML page <head>.

import type { APIRoute } from 'astro';
import {
  CORRECTIONS,
  SEVERITY_META,
  CATEGORY_META,
  LATEST_CORRECTION_DATE
} from '../../../data/corrections-log';

export const prerender = true;

const SITE_URL = 'https://mainedispensaryguide.com';
const FEED_URL = `${SITE_URL}/about/corrections/feed.xml`;
const PAGE_URL = `${SITE_URL}/about/corrections`;

// XML-safe escape for any text appearing inside an element body. We
// escape the five XML metacharacters; the resulting string is safe to
// drop inside any XML element or attribute.
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// RFC-822 / RFC-2822 date format expected by RSS 2.0. JS Date -> "Mon, 16
// Jul 2026 00:00:00 GMT". We use UTC because our ISO `date` strings are
// date-only and don't carry a timezone; UTC midnight is the canonical
// fallback for date-only stamps.
function rfc822(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toUTCString();
}

export const GET: APIRoute = () => {
  // Newest first — the canonical ordering for corrections.
  const sorted = [...CORRECTIONS].sort((a, b) => (a.date < b.date ? 1 : -1));

  const items = sorted.map((c) => {
    const link = `${PAGE_URL}#${c.slug}`;
    const sev = SEVERITY_META[c.severity].label;
    const cat = CATEGORY_META[c.category].label;
    // description: keep concise so feed readers don't truncate. The
    // canonical prose lives at the entry anchor.
    const description = `Severity: ${sev}. Topic: ${cat}. What was wrong: ${c.what_was_wrong} What is correct: ${c.what_is_correct}`;
    const categories = [
      `<category>severity:${c.severity}</category>`,
      `<category>topic:${c.category}</category>`
    ].join('');
    return [
      '    <item>',
      `      <title>${xmlEscape(c.title)}</title>`,
      `      <link>${xmlEscape(link)}</link>`,
      `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
      `      <pubDate>${rfc822(c.date)}</pubDate>`,
      `      <description><![CDATA[${description}]]></description>`,
      `      ${categories}`,
      '    </item>'
    ].join('\n');
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Maine Dispensary Guide — Editorial Corrections Log</title>
    <link>${xmlEscape(PAGE_URL)}</link>
    <description>Every material correction to a Maine Dispensary Guide guide, blog post, or compliance citation, with severity, topic, what was wrong, what is correct, and primary sources.</description>
    <language>en-US</language>
    <atom:link href="${xmlEscape(FEED_URL)}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${rfc822(LATEST_CORRECTION_DATE)}</lastBuildDate>
    <generator>Maine Dispensary Guide static-site build</generator>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8'
    }
  });
};