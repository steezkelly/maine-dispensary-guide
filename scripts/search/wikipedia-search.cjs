#!/usr/bin/env node
/**
 * Wikipedia Research CLI
 * Usage: node wikipedia-search.cjs "your search query"
 * 
 * Uses Wikipedia API for background research, fact-checking, and
 * finding authoritative sources. Free, no API key required.
 */

const https = require('https');

const query = process.argv.slice(2).join(' ');

if (!query) {
  console.log(`
📚 Wikipedia Research CLI

Usage:
  node wikipedia-search.cjs "your search query"
  
Examples:
  node wikipedia-search.cjs "cannabis regulation Maine"
  node wikipedia-search.cjs "cannabis extracts"
  node wikipedia-search.cjs "Maine cannabis law history"
  
Notes:
  - Returns article summaries and source citations
  - Good for background research and fact verification
  - Not a replacement for web search (limited to Wikipedia)
`);
  process.exit(0);
}

const params = new URLSearchParams({
  action: 'query',
  list: 'search',
  srsearch: query,
  format: 'json',
  origin: '*',
  srlimit: '10'
});

const options = {
  hostname: 'en.wikipedia.org',
  path: `/w/api.php?${params}`,
  method: 'GET',
  headers: {
    'User-Agent': 'Maine-Dispensary-Guide/1.0 (research tool)'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      
      if (json.error) {
        console.error(`❌ Wikipedia API Error: ${json.error.info}`);
        process.exit(1);
      }
      
      const results = json.query?.search || [];
      
      if (results.length === 0) {
        console.log('No Wikipedia articles found.');
        return;
      }
      
      console.log(`\n📚 Wikipedia results for: "${query}"\n`);
      
      results.forEach((r, i) => {
        const title = r.title.replace(/<[^>]+>/g, '');
        const snippet = r.snippet.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"');
        
        console.log(`${i + 1}. ${title}`);
        console.log(`   https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`);
        console.log(`   ${snippet.substring(0, 180)}...`);
        console.log('');
      });
      
      console.log(`(${results.length} articles)`);
      
      if (results.length > 0) {
        console.log('\n💡 Tip: Visit any article to find citations you can reference');
        console.log('   in your content for E-E-A-T signals.\n');
      }
      
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
