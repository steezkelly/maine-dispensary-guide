#!/usr/bin/env node
/**
 * Maine Cannabis News Monitoring & Content Response Pipeline
 * Automated news scanning, deduplication, scoring, and brief generation.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

// ============================================================================
// CONFIGURATION
// ============================================================================

const SEARCH_TERMS = [
  'Maine cannabis regulations 2026',
  'Maine marijuana licensing OCP 2026',
  'Maine dispensary tax increase 2026',
  'LD 1942 Maine cannabis',
  'LD 1847 Maine marijuana testing',
  'Maine cannabis patient advisory 2026',
  'Maine cannabis policy update 2026',
  'maine.gov cannabis news 2026'
];

const BRIEFS_DIR = path.join(__dirname, 'briefs');

// ============================================================================
// CLI PARSING
// ============================================================================

const args = process.argv.slice(2);
const flags = {
  watch: args.includes('--watch'),
  respondAll: args.includes('--respond-all'),
  format: 'text',
  daysBack: 7,
  briefUrl: null
};

const formatIdx = args.indexOf('--format');
if (formatIdx !== -1 && args[formatIdx + 1]) {
  flags.format = args[formatIdx + 1];
}

const daysIdx = args.indexOf('--days-back');
if (daysIdx !== -1 && args[daysIdx + 1]) {
  flags.daysBack = parseInt(args[daysIdx + 1], 10);
}

const briefIdx = args.indexOf('--brief');
if (briefIdx !== -1 && args[briefIdx + 1]) {
  flags.briefUrl = args[briefIdx + 1];
}

// ============================================================================
// BRAVE SEARCH API
// ============================================================================

const API_KEY = process.env.BRAVE_SEARCH_API_KEY;
const BASE_URL = 'api.search.brave.com';
const ENDPOINT = '/res/v1/web/search';

/**
 * Call Brave Search API directly
 * @param {string} query - Search query
 * @param {number} count - Number of results
 * @returns {Promise<Array>} Array of search results
 */
function braveSearch(query, count = 10) {
  return new Promise((resolve, reject) => {
    if (!API_KEY) {
      // Fallback to CLI
      try {
        const output = execSync(`node "${path.join(__dirname, '..', 'search', 'brave-search.cjs')}" "${query}"`, {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024
        });
        // Parse CLI output - simplified for fallback
        resolve([]);
      } catch (e) {
        console.warn('⚠️  BRAVE_SEARCH_API_KEY not set, using mock data');
        resolve(getMockResults(query));
      }
      return;
    }

    const params = new URLSearchParams({
      q: query,
      count: String(count),
      country: 'us',
      search_lang: 'en'
    });

    const options = {
      hostname: BASE_URL,
      path: `${ENDPOINT}?${params}`,
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
            resolve([]);
            return;
          }
          const results = json.web?.results || [];
          resolve(results.map(r => ({
            title: r.title || '',
            url: r.url || '',
            description: r.description || '',
            published: r.age || ''
          })));
        } catch (e) {
          console.error('Failed to parse response:', e.message);
          resolve([]);
        }
      });
    });

    req.on('error', err => {
      console.error('Request failed:', err.message);
      resolve([]);
    });

    req.end();
  });
}

// ============================================================================
// MOCK DATA (when API key not available)
// ============================================================================

function getMockResults(query) {
  const now = new Date();
  const mockStories = [
    {
      title: 'Maine OCP Announces New Dispensary Licensing Round for 2026',
      url: 'https://www.pressherald.com/2026/04/15/maine-ocp-new-licensing-round',
      description: 'The Office of Cannabis Policy opens applications for new dispensary licenses across Maine, marking the first expansion since 2024.',
      published: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      title: 'Maine Legislature Passes LD 1942 on Cannabis Tax Reform',
      url: 'https://www.mainebiz.com/2026/04/10/maine-legislature-ld-1942-cannabis-tax',
      description: 'Bill would increase cannabis excise tax from 10% to 14% for adult-use marijuana products, revenue directed to municipal shares.',
      published: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      title: 'Maine Cannabis Testing Labs Face USDA Audit Results',
      url: 'https://bangordailynews.com/2026/04/08/maine-cannabis-testing-audit',
      description: 'Emergency advisory issued for pesticide contamination findings at two licensed testing facilities. Immediate recall recommended.',
      published: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      title: 'Portland Dispensary License Approval Process Update',
      url: 'https://www.pressherald.com/2026/04/05/portland-dispensary-license-approval',
      description: 'City council approves streamlined licensing process for new dispensaries in Portland metro area.',
      published: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      title: 'Maine Cannabis Compliance Violations Result in $50K Fine',
      url: 'https://www.pressherald.com/2026/04/02/maine-cannabis-compliance-fine',
      description: 'State regulators issue fine to Bangor dispensary for inventory tracking violations, first enforcement action of 2026.',
      published: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Filter by days-back
  const cutoff = new Date(now.getTime() - flags.daysBack * 24 * 60 * 60 * 1000);
  return mockStories.filter(s => new Date(s.published) >= cutoff);
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

/**
 * Normalize title for comparison: lowercase, strip punctuation, extra spaces
 */
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deduplicate stories by headline similarity
 */
function deduplicateStories(stories) {
  const seen = new Map();
  const normalized = new Set();

  return stories.filter(story => {
    const norm = normalizeTitle(story.title);
    if (normalized.has(norm)) {
      return false;
    }
    normalized.add(norm);
    return true;
  });
}

// ============================================================================
// SCORING
// ============================================================================

/**
 * Score a story by impact (0-10)
 */
function scoreStory(story) {
  let score = 0;
  const title = story.title.toLowerCase();
  const desc = (story.description || '').toLowerCase();

  if (/tax|revenue|fee/i.test(title)) score += 3;
  if (/license|approval|denial|application/i.test(title)) score += 2;
  if (/compliance|violation|fine|ban|revocation/i.test(title)) score += 3;
  if (/pesticide|contamination|safety|recall|advisory/i.test(title)) score += 4;
  if (/emergency|immediate|breaking/i.test(desc)) score += 2;
  if (/maine\.gov|pressherald|mainebiz|bangordaily/i.test(story.url)) score += 1;
  if (/first ever|first-time|landmark/i.test(title)) score += 2;

  return Math.min(score, 10);
}

/**
 * Categorize story based on score
 */
function categorizeStory(score) {
  if (score >= 7) return 'breaking';
  if (score >= 4) return 'notable';
  return 'background';
}

/**
 * Recommend action based on category
 */
function recommendAction(category, score) {
  switch (category) {
    case 'breaking':
      return 'AUTO_CREATE';
    case 'notable':
      return 'MANUAL_REVIEW';
    default:
      return 'LOG_ONLY';
  }
}

// ============================================================================
// BRIEF GENERATION
// ============================================================================

let briefCounter = 0;

/**
 * Generate content brief for a story
 */
function generateBrief(story, score, category, action) {
  briefCounter++;
  const date = new Date().toISOString().split('T')[0];
  const slug = normalizeTitle(story.title).replace(/\s+/g, '-').substring(0, 50);
  const id = `brief-${date}-${String(briefCounter).padStart(3, '0')}`;

  // Determine content type based on category and keywords
  let contentType = 'news-item';
  const title = story.title.toLowerCase();
  if (/regulation|policy|legislation|ld \d/i.test(title)) {
    contentType = category === 'breaking' ? 'blog-post' : 'guide-update';
  } else if (/dispensary|license|application/i.test(title)) {
    contentType = 'guide-update';
  } else if (/recall|contamination|emergency/i.test(title)) {
    contentType = 'blog-post';
  }

  // Generate angle
  let angle = '';
  if (score >= 7) {
    angle = `Breaking: ${story.title}. This development requires immediate attention for Maine cannabis operators and patients.`;
  } else if (score >= 4) {
    angle = `${story.title}. This update affects Maine cannabis businesses and may require updates to existing guide content.`;
  } else {
    angle = `${story.title}. Background information for Maine cannabis industry monitoring.`;
  }

  // Key points
  const keyPoints = [];
  if (/tax|fee|revenue/i.test(title)) {
    keyPoints.push('Financial impact on Maine cannabis businesses');
    keyPoints.push('Pricing implications for consumers');
  }
  if (/license|approval|application/i.test(title)) {
    keyPoints.push('Opportunities for new market entrants');
    keyPoints.push('Timeline and process details');
  }
  if (/compliance|violation|fine/i.test(title)) {
    keyPoints.push('Compliance requirements for operators');
    keyPoints.push('Risk assessment for existing businesses');
  }
  if (/pesticide|contamination|safety|recall/i.test(title)) {
    keyPoints.push('Product safety implications');
    keyPoints.push('Patient health considerations');
  }

  // Existing pages to update
  const existingPages = [];
  if (/tax|fee|revenue/i.test(title)) {
    existingPages.push('/guides/portland-dispensary-guide');
    existingPages.push('/guides/maine-cannabis-taxes');
  }
  if (/license|approval/i.test(title)) {
    existingPages.push('/guides/maine-dispensary-license-guide');
    existingPages.push('/guides/maine-licensing-ocp');
  }
  if (/compliance|violation/i.test(title)) {
    existingPages.push('/guides/maine-cannabis-compliance');
  }

  // Suggested links
  const suggestedLinks = [story.url];
  if (story.url.includes('maine.gov')) {
    suggestedLinks.push('https://www.maine.gov/cannabis');
  }

  // Tone
  let tone = 'informational';
  if (score >= 7) tone = 'breaking-alert';
  else if (/analysis|implications/i.test(title)) tone = 'analysis';

  // Agent prompt
  const agentPrompt = `Write a ${contentType === 'blog-post' ? 'blog post' : 'content update'} about "${story.title}".

Use the following facts:
- ${story.description}
- Source: ${story.url}
- Published: ${story.published || 'recently'}

Key points to cover:
${keyPoints.map(p => `- ${p}`).join('\n') || '- General overview of the development'}

${existingPages.length > 0 ? `Existing pages that may need updates:\n${existingPages.map(p => `- ${p}`).join('\n')}` : ''}

Tone: ${tone}

Write for the Maine Dispensary Guide audience: cannabis operators, entrepreneurs, and patients seeking accurate compliance information.`;

  return {
    id,
    timestamp: new Date().toISOString(),
    story: {
      title: story.title,
      url: story.url,
      source: extractDomain(story.url),
      published: story.published
    },
    impactScore: score,
    category,
    recommendedAction: action,
    contentBrief: {
      type: contentType,
      headline: story.title,
      angle,
      keyPoints: keyPoints.length > 0 ? keyPoints : ['General overview of the development'],
      existingPagesToUpdate: existingPages,
      suggestedLinks,
      tone
    },
    agentPrompt
  };
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// ============================================================================
// FILE OUTPUT
// ============================================================================

/**
 * Save brief to JSON file
 */
function saveBrief(brief) {
  if (!fs.existsSync(BRIEFS_DIR)) {
    fs.mkdirSync(BRIEFS_DIR, { recursive: true });
  }

  const slug = normalizeTitle(brief.story.title).replace(/\s+/g, '-').substring(0, 50);
  const date = new Date().toISOString().split('T')[0];
  const filename = `${date}-${slug}.json`;
  const filepath = path.join(BRIEFS_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(brief, null, 2), 'utf8');
  return filepath;
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

async function runPipeline() {
  console.log('\n📰 Maine Cannabis News Monitor');
  console.log('═══════════════════════════════════════');

  let allStories = [];

  // Step 1: News Scan across all search terms
  console.log('\n🔍 Scanning news sources...');
  for (const term of SEARCH_TERMS) {
    const results = await braveSearch(term);
    allStories = allStories.concat(results);
    if (results.length > 0) {
      console.log(`   ✓ "${term}" returned ${results.length} results`);
    }
  }

  if (allStories.length === 0) {
    console.log('\n⚠️  No stories found. Using mock data for demonstration.');
    allStories = getMockResults('Maine cannabis');
  }

  console.log(`\n📊 Total raw stories: ${allStories.length}`);

  // Step 2: Deduplication
  const uniqueStories = deduplicateStories(allStories);
  console.log(`🗑️  After deduplication: ${uniqueStories.length} unique stories`);

  // Step 3: Scoring & Categorization
  const scoredStories = uniqueStories.map(story => {
    const score = scoreStory(story);
    const category = categorizeStory(score);
    const action = recommendAction(category, score);
    return { story, score, category, action };
  });

  const breaking = scoredStories.filter(s => s.category === 'breaking');
  const notable = scoredStories.filter(s => s.category === 'notable');
  const background = scoredStories.filter(s => s.category === 'background');

  // Step 4: Brief Generation
  const briefs = [];
  const storiesToBrief = [...breaking, ...notable];

  for (const item of storiesToBrief) {
    const brief = generateBrief(item.story, item.score, item.category, item.action);
    briefs.push(brief);
    const savedPath = saveBrief(brief);
    console.log(`\n📄 Brief generated: ${brief.id}`);
    console.log(`   Saved to: ${savedPath}`);
    console.log(`   Score: ${item.score}/10 (${item.category})`);
    console.log(`   Action: ${item.action}`);
  }

  // Step 5: Output
  if (flags.format === 'json') {
    const output = {
      timestamp: new Date().toISOString(),
      summary: {
        breaking: breaking.length,
        notable: notable.length,
        background: background.length,
        total: uniqueStories.length,
        daysBack: flags.daysBack
      },
      stories: scoredStories,
      briefs
    };
    console.log('\n' + JSON.stringify(output, null, 2));
  } else {
    console.log('\n═══════════════════════════════════════');
    console.log('📰 SCAN RESULTS');
    console.log('═══════════════════════════════════════');
    console.log(`\n   Breaking stories: ${breaking.length}`);
    breaking.forEach(s => console.log(`   • [BREAKING] ${s.story.title} (${s.score}/10)`));

    console.log(`\n   Notable stories: ${notable.length}`);
    notable.forEach(s => console.log(`   • [NOTABLE] ${s.story.title} (${s.score}/10)`));

    console.log(`\n   Background stories: ${background.length}`);

    console.log('\n═══════════════════════════════════════');
    console.log('💡 RECOMMENDED ACTIONS');
    console.log('═══════════════════════════════════════');
    if (breaking.length > 0) {
      console.log('\n   Breaking stories ready for content creation:');
      breaking.forEach(s => {
        const brief = briefs.find(b => b.story.title === s.story.title);
        if (brief) {
          console.log(`\n   [${brief.id}] ${s.story.title}`);
          console.log(`   → ${brief.agentPrompt.substring(0, 100)}...`);
        }
      });
    }
    if (notable.length > 0) {
      console.log('\n   Notable stories for manual review:');
      notable.forEach(s => console.log(`   • ${s.story.title}`));
    }
    if (background.length > 0) {
      console.log('\n   Background stories logged (no action needed):');
      background.slice(0, 3).forEach(s => console.log(`   • ${s.story.title}`));
      if (background.length > 3) {
        console.log(`   ... and ${background.length - 3} more`);
      }
    }
  }

  return { breaking, notable, background, briefs };
}

// ============================================================================
// SINGLE BRIEF MODE
// ============================================================================

async function generateSingleBrief(url) {
  console.log(`\n📄 Generating brief for: ${url}`);

  // Fetch URL content
  const story = await fetchUrlMetadata(url);

  const score = scoreStory(story);
  const category = categorizeStory(score);
  const action = recommendAction(category, score);

  const brief = generateBrief(story, score, category, action);
  const savedPath = saveBrief(brief);

  console.log(`\n✅ Brief generated: ${brief.id}`);
  console.log(`   Saved to: ${savedPath}`);
  console.log(`   Score: ${score}/10 (${category})`);
  console.log(`   Action: ${action}`);
  console.log('\n' + JSON.stringify(brief, null, 2));

  return brief;
}

/**
 * Fetch URL metadata (simplified)
 */
function fetchUrlMetadata(url) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsMonitor/1.0)'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          // Extract title from HTML
          const titleMatch = data.match(/<title[^>]*>([^<]+)<\/title>/i);
          const descMatch = data.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);

          resolve({
            title: titleMatch ? titleMatch[1].trim() : url,
            url,
            description: descMatch ? descMatch[1].trim() : 'No description available',
            published: new Date().toISOString()
          });
        });
      });

      req.on('error', () => {
        resolve({
          title: url,
          url,
          description: 'Could not fetch description',
          published: new Date().toISOString()
        });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          title: url,
          url,
          description: 'Request timeout',
          published: new Date().toISOString()
        });
      });

      req.end();
    } catch (e) {
      resolve({
        title: url,
        url,
        description: 'Invalid URL',
        published: new Date().toISOString()
      });
    }
  });
}

// ============================================================================
// WATCH MODE
// ============================================================================

let watchInterval = null;

function startWatch() {
  console.log('\n🔄 WATCH MODE - Scanning every 6 hours');
  console.log('   Press Ctrl+C to stop\n');

  // Run immediately, then every 6 hours
  runPipeline();

  watchInterval = setInterval(() => {
    console.log('\n⏰ Scheduled scan triggered');
    runPipeline();
  }, 6 * 60 * 60 * 1000); // 6 hours = 21600000ms
}

function stopWatch() {
  if (watchInterval) {
    clearInterval(watchInterval);
    watchInterval = null;
    console.log('\n⏹️  Watch mode stopped');
  }
}

// ============================================================================
// MAIN ENTRY
// ============================================================================

async function main() {
  try {
    // Single brief mode
    if (flags.briefUrl) {
      await generateSingleBrief(flags.briefUrl);
      process.exit(0);
    }

    // Watch mode
    if (flags.watch) {
      startWatch();
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        stopWatch();
        process.exit(0);
      });
      process.on('SIGTERM', () => {
        stopWatch();
        process.exit(0);
      });
      return;
    }

    // Respond all mode
    if (flags.respondAll) {
      const result = await runPipeline();
      if (result.breaking.length > 0) {
        console.log('\n🚀 AUTO-RESPOND MODE: Creating content for breaking stories...');
        for (const brief of result.briefs.filter(b => b.recommendedAction === 'AUTO_CREATE')) {
          console.log(`\n📝 Content prompt for: ${brief.story.title}`);
          console.log('─'.repeat(50));
          console.log(brief.agentPrompt);
          console.log('─'.repeat(50));
        }
      }
      console.log('\n✅ Auto-respond complete. Check briefs directory for generated briefs.');
      process.exit(0);
    }

    // Default: scan and report
    await runPipeline();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// CLI help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📰 Maine Cannabis News Monitor

Usage:
  node news-response.cjs                    # Scan + report (dry-run)
  node news-response.cjs --watch             # Continuous mode (every 6 hours)
  node news-response.cjs --respond-all      # Auto-create content
  node news-response.cjs --brief <url>     # Generate brief from specific URL
  node news-response.cjs --days-back 3      # Scan last 3 days (default 7)
  node news-response.cjs --format json      # JSON output

Environment:
  BRAVE_SEARCH_API_KEY   Brave Search API key (optional, uses mock data if not set)

Examples:
  node news-response.cjs
  node news-response.cjs --format json
  node news-response.cjs --brief https://www.pressherald.com/maine-cannabis-news
`);
  process.exit(0);
}

main();
