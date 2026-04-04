#!/usr/bin/env node
/**
 * SearXNG Search CLI
 * Usage: node searxng-search.cjs "your search query"
 * 
 * SearXNG is a privacy-respecting meta-search engine that aggregates
 * results from multiple search providers (Google, Bing, DuckDuckGo, etc.)
 * 
 * Environment variables:
 *   SEARXNG_INSTANCE_URL   - Set your SearXNG instance URL
 *   SEARXNG_API_KEY        - API key if required by instance
 * 
 * NOTE: Public SearXNG instances often have rate limits or bot protection.
 * For reliable use, self-host an instance or use a private instance.
 * See: https://docs.searxng.org/admin/installation.html
 */

const https = require('https');

const INSTANCE_URL = process.env.SEARXNG_INSTANCE_URL;
const API_KEY = process.env.SEARXNG_API_KEY;
const ENDPOINT = '/search';

const query = process.argv.slice(2).join(' ');

function showHelp() {
  console.log(`
🔍 SearXNG Search CLI

Usage:
  node searxng-search.cjs "your search query"
  
Environment variables:
  SEARXNG_INSTANCE_URL   - Set your SearXNG instance URL
  SEARXNG_API_KEY        - API key if required by instance

Examples:
  node searxng-search.cjs "Maine cannabis dispensary regulations 2026"
  node searxng-search.cjs "280E tax deduction cannabis Maine"
  
  # Using a specific instance:
  $env:SEARXNG_INSTANCE_URL = "https://your-instance.com"
  node searxng-search.cjs "your query"

Note: Public instances at https://searx.space often have:
  - Rate limiting (429 errors)
  - Bot protection (CAPTCHA/challenge pages)
  - Inconsistent uptime

For reliable use, self-host your own instance:
  https://docs.searxng.org/admin/installation.html
  https://github.com/searxng/searxng-docker
`);
}

if (!query) {
  showHelp();
  process.exit(0);
}

const params = new URLSearchParams({
  q: query,
  format: 'json',
  language: 'en'
});

function searchWithInstance(baseUrl) {
  return new Promise((resolve, reject) => {
    const instanceHost = baseUrl.replace(/^https?:\/\//, '');
    
    const options = {
      hostname: instanceHost,
      path: `${ENDPOINT}?${params}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    if (API_KEY) {
      options.headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const contentType = res.headers['content-type'] || '';
          
          if (!contentType.includes('application/json') && !contentType.includes('text/json')) {
            if (data.includes('bot') || data.includes('captcha') || data.includes('challenge')) {
              reject(new Error('Bot protection detected'));
              return;
            }
            if (data.includes('404') || data.includes('Not Found')) {
              reject(new Error('Instance returned 404'));
              return;
            }
            reject(new Error(`Unexpected content-type: ${contentType}`));
            return;
          }
          
          const json = JSON.parse(data);
          
          if (json.error) {
            reject(new Error(`${json.error}`));
            return;
          }
          
          resolve({ json, data, baseUrl });
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', err => {
      reject(new Error(`Connection error: ${err.message}`));
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

function displayResults(json, query, instanceUrl) {
  const results = json.results || [];
  
  if (results.length === 0) {
    console.log('No results found.');
    return;
  }
  
  console.log(`\n🔍 Results for: "${query}" (via SearXNG)\n`);
  console.log(`Instance: ${instanceUrl}\n`);
  
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.title}`);
    console.log(`   ${r.url}`);
    if (r.content) {
      const plainText = r.content.replace(/<[^>]+>/g, '').substring(0, 200);
      console.log(`   ${plainText}...`);
    }
    if (r.engine) {
      console.log(`   Source: ${r.engine}`);
    }
    console.log('');
  });
  
  console.log(`(${results.length} results from ${json.number_of_results || '?'} total)`);
  
  if (json.answers && json.answers.length > 0) {
    console.log('\n💡 Answers:');
    json.answers.forEach(a => console.log(`   - ${a}`));
  }
  
  if (json.suggestions && json.suggestions.length > 0) {
    console.log('\n📝 Suggestions:');
    json.suggestions.forEach(s => console.log(`   - ${s}`));
  }
}

async function runSearch() {
  const instancesToTry = INSTANCE_URL 
    ? [INSTANCE_URL] 
    : ['https://etsi.me', 'https://kantan.cat', 'https://o5.gg'];
  
  let lastError = null;
  
  for (const instance of instancesToTry) {
    try {
      const { json, baseUrl } = await searchWithInstance(instance);
      displayResults(json, query, baseUrl);
      return;
    } catch (err) {
      lastError = err;
      console.error(`⚠️ ${instance}: ${err.message}`);
    }
  }
  
  console.error(`\n❌ All SearXNG instances failed.`);
  console.error(`Last error: ${lastError?.message || 'Unknown error'}`);
  console.error(`\nRecommendations:`);
  console.error(`  1. Self-host your own instance:`);
  console.error(`     docker run -d -p 8080:8080 searxng/searxng`);
  console.error(`     Then: $env:SEARXNG_INSTANCE_URL="http://localhost:8080"`);
  console.error(`  2. Check instance status at: https://searx.space`);
  console.error(`  3. Or use Brave Search instead (more reliable):`);
  console.error(`     $env:BRAVE_SEARCH_API_KEY="your-key"`);
  console.error(`     node scripts/brave-search.cjs "your query"`);
  process.exit(1);
}

runSearch();
