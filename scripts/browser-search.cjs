#!/usr/bin/env node
/**
 * Browser Search CLI (using agent-browser)
 * Usage: node browser-search.cjs "your search query"
 * 
 * Fallback search using headless browser automation with Bing.
 * 
 * Requires: npm install -g agent-browser && agent-browser install
 */

const { execSync } = require('child_process');

const query = process.argv.slice(2).join(' ');

if (!query) {
  console.log(`
🔍 Browser Search CLI (agent-browser fallback)

Usage:
  node browser-search.cjs "your search query"
  
Examples:
  node browser-search.cjs "cannabis Maine dispensary regulations 2026"
  node browser-search.cjs "280E tax deduction cannabis"
  
Notes:
  - Uses headless Chrome via agent-browser with Bing
  - Fallback when Brave Search API is rate-limited
  - Slower than API but more reliable for scraping
  
Requires:
  npm install -g agent-browser
  agent-browser install
`);
  process.exit(0);
}

function run(command) {
  try {
    return execSync(command, { 
      encoding: 'utf-8', 
      timeout: 45000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (err) {
    return err.stdout || err.message;
  }
}

function searchWithBrowser() {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://www.bing.com/search?q=${encodedQuery}`;
  const sessionName = `bing-search-${Date.now()}`;
  
  try {
    console.log(`\n🔍 Searching Bing: "${query}"\n`);
    
    run(`agent-browser --session-name ${sessionName} open "${url}"`);
    run(`agent-browser --session-name ${sessionName} wait --load networkidle`);
    
    const result = run(`agent-browser --session-name ${sessionName} get text body`);
    run(`agent-browser --session-name ${sessionName} close`);
    
    const lines = result.split('\n').filter(l => l.trim());
    let results = [];
    let currentResult = null;
    let inSearchResults = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes(' Cannabis') || line.includes(' cannabis')) {
        if (currentResult && currentResult.title) {
          results.push(currentResult);
        }
        currentResult = { title: line.trim(), url: '' };
      }
      
      if (line.includes('https://') && currentResult && !currentResult.url) {
        const match = line.match(/https?:\/\/[^\s<]+/);
        if (match) {
          currentResult.url = match[0].substring(0, 100);
        }
      }
      
      if (results.length >= 10) break;
    }
    
    if (currentResult && currentResult.title && results.length < 10) {
      results.push(currentResult);
    }
    
    results = results.filter(r => r.title && r.title.length > 10).slice(0, 10);
    
    if (results.length === 0) {
      console.log('Raw output (first 800 chars):\n');
      console.log(result.substring(0, 800));
      return;
    }
    
    console.log('📋 Search Results (via Bing):\n');
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.title}`);
      if (r.url) console.log(`   ${r.url}`);
      console.log('');
    });
    
  } catch (err) {
    console.error('Browser search failed:', err.message.substring(0, 200));
    console.error('\nMake sure agent-browser is installed:');
    console.error('  npm install -g agent-browser');
    console.error('  agent-browser install');
  }
}

searchWithBrowser();
