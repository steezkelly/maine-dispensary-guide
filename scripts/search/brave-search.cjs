#!/usr/bin/env node
/**
 * Brave Search CLI
 * Usage: node brave-search.cjs "your search query"
 */

const https = require('https');
const zlib = require('zlib');

const API_KEY = process.env.BRAVE_SEARCH_API_KEY;
const BASE_URL = 'api.search.brave.com';
const ENDPOINT = '/res/v1/web/search';

if (!API_KEY) {
  console.error('❌ BRAVE_SEARCH_API_KEY environment variable not set.');
  console.error('   Set it with: $env:BRAVE_SEARCH_API_KEY="your-key"');
  process.exit(1);
}

const query = process.argv.slice(2).join(' ');

if (!query) {
  console.log(`
🔍 Brave Search CLI

Usage:
  node brave-search.cjs "your search query"
  $env:BRAVE_SEARCH_API_KEY="your-key"  # Set API key first

Examples:
  node brave-search.cjs "Maine cannabis dispensary regulations 2026"
  node brave-search.cjs "280E tax deduction cannabis Maine"
`);
  process.exit(0);
}

const options = {
  hostname: BASE_URL,
  path: `${ENDPOINT}?${new URLSearchParams({
    q: query,
    count: '10',
    country: 'us',
    search_lang: 'en'
  })}`,
  method: 'GET',
  headers: {
    'X-Subscription-Token': API_KEY,
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip'
  }
};

const req = https.request(options, (res) => {
  const encoding = res.headers['content-encoding'];
  let decompressed = res;
  
  if (encoding === 'gzip') {
    decompressed = res.pipe(zlib.createGunzip());
  } else if (encoding === 'deflate') {
    decompressed = res.pipe(zlib.createInflate());
  }
  
  let data = '';
  decompressed.on('data', chunk => data += chunk);
  decompressed.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.error) {
        console.error(`❌ API Error: ${json.error}`);
        process.exit(1);
      }
      const results = json.web?.results || [];
      if (results.length === 0) {
        console.log('No results found.');
        return;
      }
      console.log(`\n🔍 Results for: "${query}"\n`);
      results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.title}`);
        console.log(`   ${r.url}`);
        if (r.description) {
          console.log(`   ${r.description.replace(/<[^>]+>/g, '').substring(0, 150)}...`);
        }
        console.log('');
      });
      console.log(`(${results.length} results)`);
    } catch (e) {
      console.error('Failed to parse response:', e.message);
      process.exit(1);
    }
  });
});

req.on('error', err => {
  console.error('Request failed:', err.message);
  process.exit(1);
});

req.end();