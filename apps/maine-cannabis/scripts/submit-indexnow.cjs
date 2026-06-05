#!/usr/bin/env node
/**
 * IndexNow URL submission helper for mainedispensaryguide.com.
 *
 * Usage:
 *   node scripts/submit-indexnow.cjs <url1> [url2 ...]
 *   node scripts/submit-indexnow.cjs --from-sitemap
 *
 * The IndexNow key is served by the Vercel route at
 * /4a00ca05232c46f3badda7f9f2e0e296.txt. We do not hardcode the key in
 * source control — instead we read it live from the site, then submit.
 *
 * IndexNow pushes to: Bing, Yandex, Seznam.cz, and Naver. Google is
 * not part of the program, but submitting here still helps long-tail
 * discovery of new pages.
 */

const https = require('node:https');
const { URL } = require('node:url');

const SITE = 'mainedispensaryguide.com';
const KEY_PATH = '/4a00ca05232c46f3badda7f9f2e0e296.txt';
const SITEMAP = `https://${SITE}/sitemap-0.xml`;
const INDEXNOW_ENDPOINT = 'api.indexnow.org';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`GET ${url} → ${res.statusCode}`));
        return;
      }
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(body.trim()));
    }).on('error', reject);
  });
}

function fetchSitemapUrls(sitemapUrl) {
  return fetchText(sitemapUrl).then((xml) => {
    const urls = [];
    const re = /<loc>([^<]+)<\/loc>/g;
    let m;
    while ((m = re.exec(xml)) !== null) urls.push(m[1]);
    return urls;
  });
}

function submit(urls, key) {
  const payload = JSON.stringify({
    host: SITE,
    key,
    keyLocation: `https://${SITE}${KEY_PATH}`,
    urlList: urls,
  });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'POST',
        host: INDEXNOW_ENDPOINT,
        path: '/indexnow',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 202) {
            resolve({ status: res.statusCode, count: urls.length });
          } else {
            reject(new Error(`IndexNow ${res.statusCode}: ${body || '(empty)'}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  let urls = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const fromSitemap = process.argv.includes('--from-sitemap');

  if (fromSitemap) {
    console.log(`Fetching URLs from ${SITEMAP}...`);
    urls = await fetchSitemapUrls(SITEMAP);
    console.log(`Found ${urls.length} URLs.`);
  }

  if (urls.length === 0) {
    console.error('Usage: node scripts/submit-indexnow.cjs <url1> [url2 ...]');
    console.error('       node scripts/submit-indexnow.cjs --from-sitemap');
    process.exit(1);
  }

  console.log(`Fetching IndexNow key from https://${SITE}${KEY_PATH}...`);
  const key = await fetchText(`https://${SITE}${KEY_PATH}`);
  console.log(`Key: ${key.slice(0, 8)}...`);

  console.log(`Submitting ${urls.length} URL(s) to IndexNow...`);
  const result = await submit(urls, key);
  console.log(`OK — HTTP ${result.status}, ${result.count} URL(s) submitted.`);
}

main().catch((err) => {
  console.error('IndexNow submission failed:', err.message);
  process.exit(1);
});
