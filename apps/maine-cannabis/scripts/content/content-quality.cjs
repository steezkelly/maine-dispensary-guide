#!/usr/bin/env node
/**
 * content-quality.cjs
 *
 * Unified content quality pipeline: audit + humanize + auto-fix in one pass.
 *
 * Usage:
 *   node scripts/content/content-quality.cjs                    # Full audit + humanize, dry-run
 *   node scripts/content/content-quality.cjs --apply            # Apply fixes
 *   node scripts/content/content-quality.cjs --files "src/pages/blog/*.astro"  # Target files
 *   node scripts/content/content-quality.cjs --humanize-only    # Skip audit, just humanize
 *   node scripts/content/content-quality.cjs --audit-only      # Skip humanization, just audit
 *   node scripts/content/content-quality.cjs --min-score 3     # Min humanity score threshold
 *   node scripts/content/content-quality.cjs --format json     # JSON output
 *   node scripts/content/content-quality.cjs --verbose          # Show per-pattern details
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// EMBEDDED AI PATTERN LIBRARY (same as fix-patterns.cjs)
// ============================================================================

const AI_PATTERNS = [
  // Inflated significance
  { pattern: /\bgroundbreaking\b/gi, replacement: 'notable', category: 'inflated-significance' },
  { pattern: /\brevolutionize[sd]?\b/gi, replacement: 'improve', category: 'inflated-significance' },
  { pattern: /\bgame[- ]?changer\b/gi, replacement: 'significant development', category: 'inflated-significance' },
  { pattern: /\btransformative\b/gi, replacement: 'meaningful', category: 'inflated-significance' },
  { pattern: /\bpioneering\b/gi, replacement: 'early', category: 'inflated-significance' },
  { pattern: /\bdisruptive\b/gi, replacement: 'new', category: 'inflated-significance' },
  { pattern: /\bgame[- ]?changing\b/gi, replacement: 'important', category: 'inflated-significance' },
  { pattern: /\bearth[- ]?shattering\b/gi, replacement: 'notable', category: 'inflated-significance' },

  // Promotional language
  { pattern: /\bworld[- ]?class\b/gi, replacement: 'high-quality', category: 'promotional' },
  { pattern: /\bcutting[- ]?edge\b/gi, replacement: 'current', category: 'promotional' },
  { pattern: /\bindustry[- ]?leading\b/gi, replacement: 'competitive', category: 'promotional' },
  { pattern: /\baward[- ]?winning\b/gi, replacement: 'recognized', category: 'promotional' },
  { pattern: /\bbest[- ]?in[- ]?class\b/gi, replacement: 'effective', category: 'promotional' },
  { pattern: /\bnext[- ]?generation\b/gi, replacement: 'new', category: 'promotional' },
  { pattern: /\bunmatched\b/gi, replacement: 'high', category: 'promotional' },
  { pattern: /\bunparalleled\b/gi, replacement: 'significant', category: 'promotional' },
  { pattern: /\bst pioneering\b/gi, replacement: 'strong', category: 'promotional' },
  { pattern: /\bst-in-class\b/gi, replacement: 'effective', category: 'promotional' },

  // AI filler phrases
  { pattern: /\bIn today's (rapidly )?evolving landscape\b/gi, replacement: 'Currently', category: 'ai-filler' },
  { pattern: /\bIt is important to note that\b/gi, replacement: 'Note that', category: 'ai-filler' },
  { pattern: /\bAs the industry continues to evolve\b/gi, replacement: 'As the industry grows', category: 'ai-filler' },
  { pattern: /\bIt should be noted that\b/gi, replacement: 'Note that', category: 'ai-filler' },
  { pattern: /\bIn conclusion, it is worth noting\b/gi, replacement: 'In summary', category: 'ai-filler' },
  { pattern: /\bIt goes without saying that\b/gi, replacement: 'Clearly', category: 'ai-filler' },
  { pattern: /\bThis (specialty|product|service) is designed to\b/gi, replacement: 'This helps to', category: 'ai-filler' },
  { pattern: /\bPowered by (cutting[- ]?edge|advanced|state[- ]?of[- ]?the[- ]?art) (?:AI|technology|algorithms)\b/gi, replacement: 'Using modern technology', category: 'ai-filler' },
  { pattern: /\bLeveraging (?:cutting[- ]?edge|advanced|state[- ]?of[- ]?the[- ]?art) (?:AI|technology|algorithms)\b/gi, replacement: 'Using modern tools', category: 'ai-filler' },
  { pattern: /\bWe offer a wide array of\b/gi, replacement: 'We offer several', category: 'ai-filler' },
  { pattern: /\bA wide array of\b/gi, replacement: 'Several', category: 'ai-filler' },
  { pattern: /\bbroad spectrum of\b/gi, replacement: 'range of', category: 'ai-filler' },
  { pattern: /\bTo maximize (?:your )?(?:efficiency|productivity|results)\b/gi, replacement: 'To improve', category: 'ai-filler' },
  { pattern: /\b(?:seamlessly|effortlessly) (?:integrate|manage|handle)\b/gi, replacement: 'integrate', category: 'ai-filler' },
  { pattern: /\bAt the forefront of\b/gi, replacement: 'Leading in', category: 'ai-filler' },
  { pattern: /\b(?:seamless|effortless) experience\b/gi, replacement: 'smooth experience', category: 'ai-filler' },
  { pattern: /\bCutting[- ]?edge (?:technology|solutions|innovations)\b/gi, replacement: 'modern technology', category: 'ai-filler' },
  { pattern: /\bholistic approach to\b/gi, replacement: 'approach to', category: 'ai-filler' },
  { pattern: /\brobust (?:solution|platform|system)\b/gi, replacement: 'reliable system', category: 'ai-filler' },
  { pattern: /\bscalable (?:solution|platform|system)\b/gi, replacement: 'flexible system', category: 'ai-filler' },

  // Copula avoidance (is/are → various workarounds)
  { pattern: /\bthe process is\b/gi, replacement: 'the process helps', category: 'copula-avoidance' },
  { pattern: /\bThis solution is\b/gi, replacement: 'This solution helps', category: 'copula-avoidance' },
  { pattern: /\bour platform is\b/gi, replacement: 'our platform helps', category: 'copula-avoidance' },
  { pattern: /\bThe system is\b/gi, replacement: 'The system helps', category: 'copula-avoidance' },

  // Corporate speak
  { pattern: /\bsynergy\b/gi, replacement: 'collaboration', category: 'corporate-speak' },
  { pattern: /\bcircle back\b/gi, replacement: 'follow up', category: 'corporate-speak' },
  { pattern: /\blow[- ]?hanging fruit\b/gi, replacement: 'easy wins', category: 'corporate-speak' },
  { pattern: /\bdeep[- ]?dive\b/gi, replacement: 'thorough review', category: 'corporate-speak' },
  { pattern: /\bmove the needle\b/gi, replacement: 'make progress', category: 'corporate-speak' },
  { pattern: /\bparadigm shift\b/gi, replacement: 'significant change', category: 'corporate-speak' },
  { pattern: /\bbleeding[- ]?edge\b/gi, replacement: 'new technology', category: 'corporate-speak' },
  { pattern: /\bvalue[- ]?add\b/gi, replacement: 'benefit', category: 'corporate-speak' },
  { pattern: /\bactionable (?:insights?|recommendations?)\b/gi, replacement: 'useful recommendations', category: 'corporate-speak' },
  { pattern: /\bstrategic (?:partnership|alliance)\b/gi, replacement: 'partnership', category: 'corporate-speak' },
  { pattern: /\bdeliverables\b/gi, replacement: 'results', category: 'corporate-speak' },
  { pattern: /\b(?:go[- ]?to[- ]?market|GTM) strategy\b/gi, replacement: 'market entry strategy', category: 'corporate-speak' },
  { pattern: /\b(?:end[- ]?to[- ]?end|E2E) solution\b/gi, replacement: 'complete solution', category: 'corporate-speak' },
  { pattern: /\b(?:best[- ]?in[- ]?breed|best-of-breed)\b/gi, replacement: 'effective', category: 'corporate-speak' },
  { pattern: /\bleverage\b/gi, replacement: 'use', category: 'corporate-speak' },
  { pattern: /\boptimize\b/gi, replacement: 'improve', category: 'corporate-speak' },
  { pattern: /\bempower\b/gi, replacement: 'enable', category: 'corporate-speak' },
  { pattern: /\bscalable\b/gi, replacement: 'flexible', category: 'corporate-speak' },
  { pattern: /\bstreamline\b/gi, replacement: 'simplify', category: 'corporate-speak' },

  // Collaborative artifacts / committee speak
  { pattern: /\blet's dive in(to)?\b/gi, replacement: 'here is', category: 'collaborative' },
  { pattern: /\blet's explore\b/gi, replacement: 'here is', category: 'collaborative' },
  { pattern: /\bfeel free to\b/gi, replacement: 'please', category: 'collaborative' },
  { pattern: /\bI hope this (?:helps|resonates)\b/gi, replacement: 'This information is useful', category: 'collaborative' },
  { pattern: /\b(?<![a-z])TL;DR\b/gi, replacement: 'Summary', category: 'collaborative' },
  { pattern: /\b(?:FWIW|imho|imo)\b/gi, replacement: '', category: 'collaborative' },
  { pattern: /\b(?:NB|n.b.)\b/gi, replacement: 'Note', category: 'collaborative' },
  { pattern: /\b(?<![a-z])PS[:\s]\b/gi, replacement: 'Also:', category: 'collaborative' },
  { pattern: /\b(?:FYI|For your information)\b/gi, replacement: '', category: 'collaborative' },
  { pattern: /\b(?:SMB|SME)s?\b/gi, replacement: 'small businesses', category: 'collaborative' },
  { pattern: /\bthought leadership\b/gi, replacement: 'expertise', category: 'collaborative' },
  { pattern: /\b(?:let's|let us) (?:take a moment|consider)\b/gi, replacement: 'consider', category: 'collaborative' },

  // Additional patterns to catch
  { pattern: /\b(?:comprehensive|end-to-end) solution\b/gi, replacement: 'effective solution', category: 'boilerplate' },
  { pattern: /\b(?:state-of-the-art|state of the art)\b/gi, replacement: 'modern', category: 'boilerplate' },
  { pattern: /\b(?:win[- ]?win|win-win) scenario\b/gi, replacement: 'beneficial outcome', category: 'boilerplate' },
  { pattern: /\b(?:future[- ]?proof|future-proof)\b/gi, replacement: 'lasting', category: 'boilerplate' },
  { pattern: /\b(?:top[- ]?tier|top tier)\b/gi, replacement: 'high-quality', category: 'boilerplate' },
  { pattern: /\b(?:best[- ]?in[- ]?class|best-in-class)\b/gi, replacement: 'effective', category: 'boilerplate' },
  { pattern: /\b(?:one[- ]?stop|one-stop) (?:shop|solution)\b/gi, replacement: 'complete solution', category: 'boilerplate' },
  { pattern: /\b(?:problem[- ]?free|stress[- ]?free|hassle[- ]?free)\b/gi, replacement: 'straightforward', category: 'boilerplate' },
  { pattern: /\b(?:cutting[- ]?edge|cutting edge) technology\b/gi, replacement: 'modern technology', category: 'boilerplate' },
  { pattern: /\bpioneering (?:technology|solution|approach)\b/gi, replacement: 'effective approach', category: 'boilerplate' },
  { pattern: /\b(?:highly|daily) dynamic\b/gi, replacement: 'active', category: 'boilerplate' },
  { pattern: /\b(?:highly|daily) adaptive\b/gi, replacement: 'flexible', category: 'boilerplate' },
  { pattern: /\b(?:fully )?integrated\b/gi, replacement: 'connected', category: 'boilerplate' },
  { pattern: /\b(?:highly|daily) specialized\b/gi, replacement: 'specialized', category: 'boilerplate' },
  { pattern: /\b(?:user[- ]?centric|user-centric|user-friendly)\b/gi, replacement: 'practical', category: 'boilerplate' },
  { pattern: /\b(?:innovation[- ]?driven|innovation-driven)\b/gi, replacement: 'creative', category: 'boilerplate' },
  { pattern: /\b(?:solution[- ]?oriented|solution-oriented)\b/gi, replacement: 'practical', category: 'boilerplate' },
  { pattern: /\b(?:result[- ]?oriented|result-oriented)\b/gi, replacement: 'effective', category: 'boilerplate' },
  { pattern: /\b(?:performance[- ]?driven|performance-driven)\b/gi, replacement: 'effective', category: 'boilerplate' },
  { pattern: /\b(?:data[- ]?driven|data-driven)\b/gi, replacement: 'analytical', category: 'boilerplate' },
  { pattern: /\b(?:tech[- ]?forward|tech-forward)\b/gi, replacement: 'modern', category: 'boilerplate' },
  { pattern: /\b(?:next[- ]?gen|next-gen) (?:technology|solution|platform)\b/gi, replacement: 'modern solution', category: 'boilerplate' },
  { pattern: /\b(?:mission[- ]?critical)\b/gi, replacement: 'important', category: 'boilerplate' },
  { pattern: /\b(?:high[- ]?performance|high-performance)\b/gi, replacement: 'effective', category: 'boilerplate' },
  { pattern: /\b(?:high[- ]?impact|high-impact)\b/gi, replacement: 'significant', category: 'boilerplate' },
  { pattern: /\b(?:enterprise[- ]?grade|enterprise-grade)\b/gi, replacement: 'professional', category: 'boilerplate' },
  { pattern: /\b(?:production[- ]?ready|production-ready)\b/gi, replacement: 'functional', category: 'boilerplate' },
  { pattern: /\b(?:mission[- ]?critical)\b/gi, replacement: 'essential', category: 'boilerplate' },
  { pattern: /\b(?:production[- ]?level|production-level)\b/gi, replacement: 'professional', category: 'boilerplate' },
  { pattern: /\b(?:real[- ]?time|real-time) (?:updates?|feedback|reporting)\b/gi, replacement: 'timely updates', category: 'boilerplate' },
  { pattern: /\b(?:fully )?customizable\b/gi, replacement: 'flexible', category: 'boilerplate' },
  { pattern: /\b(?:seamlessly|easily) (?:integrate|connect|implement)\b/gi, replacement: 'integrate', category: 'boilerplate' },
  { pattern: /\b(?:easily|quickly) (?:deploy|set up|configure)\b/gi, replacement: 'deploy', category: 'boilerplate' },
  { pattern: /\b(?:intuitive|user[- ]?friendly) (?:interface|design|dashboard)\b/gi, replacement: 'simple interface', category: 'boilerplate' },
  { pattern: /\b(?:secure|trusted|safe) (?:platform|system|solution)\b/gi, replacement: 'reliable system', category: 'boilerplate' },
  { pattern: /\b(?:cloud[- ]?based|cloud based)\b/gi, replacement: 'web-based', category: 'boilerplate' },
  { pattern: /\b(?:AI[- ]?powered|AI-powered|AI[- ]?driven|AI-driven)\b/gi, replacement: 'automated', category: 'boilerplate' },
  { pattern: /\b(?:ML[- ]?powered|ML-powered|ML[- ]?driven|ML-driven)\b/gi, replacement: 'automated', category: 'boilerplate' },
  { pattern: /\b(?:automated|intelligent) (?:insights?|recommendations?|analysis)\b/gi, replacement: 'useful recommendations', category: 'boilerplate' },
  { pattern: /\b(?:advanced|powerful) (?:analytics|reporting|dashboard)\b/gi, replacement: 'detailed reports', category: 'boilerplate' },
  { pattern: /\b(?:real[- ]?time|real-time) (?:analytics|tracking|monitoring)\b/gi, replacement: 'regular reports', category: 'boilerplate' },
  { pattern: /\b(?:centralized|unified) (?:dashboard|platform|view)\b/gi, replacement: ' dashboard', category: 'boilerplate' },
  { pattern: /\b(?:centralized|unified) (?:solution|system|approach)\b/gi, replacement: 'integrated system', category: 'boilerplate' },
  { pattern: /\b(?:streamlined|optimized|enhanced) (?:workflow|process|operations)\b/gi, replacement: 'effective workflow', category: 'boilerplate' },
  { pattern: /\b(?:streamlined|simplified) (?:experience|interface|navigation)\b/gi, replacement: 'simple experience', category: 'boilerplate' },
  { pattern: /\b(?:improved|enhanced) (?:performance|efficiency|speed)\b/gi, replacement: 'better performance', category: 'boilerplate' },
  { pattern: /\b(?:advanced|modern) (?:technology|features?|functionality)\b/gi, replacement: 'modern features', category: 'boilerplate' },
  { pattern: /\b(?:powerful|flexible|scalable) (?:platform|solution|system)\b/gi, replacement: 'effective system', category: 'boilerplate' },
  { pattern: /\b(?:innovative|cutting[- ]?edge) (?:approach|solution|technology)\b/gi, replacement: 'effective approach', category: 'boilerplate' },
  { pattern: /\b(?:comprehensive|complete) (?:solution|platform|system)\b/gi, replacement: 'effective solution', category: 'boilerplate' },
  { pattern: /\b(?:flexible|adaptable|customizable) (?:solution|platform|system)\b/gi, replacement: 'practical solution', category: 'boilerplate' },
  { pattern: /\b(?:user[- ]?centric|user[- ]?focused) (?:design|experience|interface)\b/gi, replacement: 'practical design', category: 'boilerplate' },
  { pattern: /\b(?:data[- ]?centric|data[- ]?driven) (?:approach|strategy|analysis)\b/gi, replacement: 'analytical approach', category: 'boilerplate' },
  { pattern: /\b(?:outcome[- ]?focused|result[- ]?oriented) (?:approach|strategy|solution)\b/gi, replacement: 'effective approach', category: 'boilerplate' },
  { pattern: /\b(?:agile|lean) (?:methodology|approach|process)\b/gi, replacement: 'efficient approach', category: 'boilerplate' },
  { pattern: /\b(?:end[- ]?to[- ]?end|complete) (?:solution|service|support)\b/gi, replacement: 'complete service', category: 'boilerplate' },
  { pattern: /\b(?:all[- ]?in[- ]?one|all-in-one) (?:solution|platform|tool)\b/gi, replacement: 'integrated solution', category: 'boilerplate' },
  { pattern: /\b(?:turnkey|ready[- ]?to[- ]?use) (?:solution|platform|system)\b/gi, replacement: 'ready solution', category: 'boilerplate' },
  { pattern: /\b(?:plug[- ]?and[- ]?play|plug and play)\b/gi, replacement: 'easy to use', category: 'boilerplate' },
  { pattern: /\b(?:set[- ]?it[- ]?and[- ]?forget[- ]?it|set it and forget it)\b/gi, replacement: 'simple to maintain', category: 'boilerplate' },
  { pattern: /\b(?:future[- ]?proof|futured[- ]?proof) (?:technology|platform|solution)\b/gi, replacement: 'lasting solution', category: 'boilerplate' },
  { pattern: /\b(?:mission[- ]?critical|critical) (?:application|system|process)\b/gi, replacement: 'important system', category: 'boilerplate' },
  { pattern: /\b(?:business[- ]?critical|critical) (?:application|system|process)\b/gi, replacement: 'important system', category: 'boilerplate' },
  { pattern: /\b(?:high[- ]?availability|high availability) (?:system|platform|solution)\b/gi, replacement: 'reliable system', category: 'boilerplate' },
  { pattern: /\b(?:mission[- ]?critical|critical) (?:operation|process|workflow)\b/gi, replacement: 'important process', category: 'boilerplate' },
];

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_MIN_WORDS = 800;
const DEFAULT_MIN_SCORE = 1; // Exit code 1 if below this score

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate word count (strip HTML tags)
 */
function countWords(content) {
  const text = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.split(' ')
    .filter(w => w.length > 0)
    .length;
}

/**
 * Check if content has frontmatter
 */
function hasFrontmatter(content) {
  return content.startsWith('---');
}

/**
 * Extract frontmatter from content
 */
function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : '';
}

/**
 * Check if frontmatter has a field
 */
function hasFrontmatterField(content, field) {
  const fm = extractFrontmatter(content);
  const regex = new RegExp(`^\\s*${field}:`, 'm');
  return regex.test(fm);
}

/**
 * Get all internal links from content
 */
function getInternalLinks(content) {
  const hrefRegex = /href="([^"#]+)"/g;
  const links = [];
  let match;
  while ((match = hrefRegex.exec(content)) !== null) {
    links.push(match[1]);
  }
  return links;
}

/**
 * Check if a file path exists (relative to base)
 */
function fileExists(filePath, baseDir) {
  try {
    const fullPath = path.join(baseDir, filePath);
    return fs.existsSync(fullPath);
  } catch {
    return false;
  }
}

/**
 * Check if a file path exists (relative to base)
 */
function globToRegex(pattern) {
  // Split by ** to handle recursive globs
  const parts = pattern.split('**');
  let regexStr = '';

  for (let i = 0; i < parts.length; i++) {
    // Escape special regex chars except * and ?
    let part = parts[i].replace(/[.+^${}()|[\]\\]/g, function(m) {
      return '\\' + m;
    });
    // Replace * with .* and ? with .
    part = part.replace(/\*/g, '.*').replace(/\?/g, '.');

    regexStr += part;

    // Add path separator matcher between ** segments
    if (i < parts.length - 1) {
      regexStr += '.*';
    }
  }

  return new RegExp(regexStr);
}

/**
 * Check if a path matches a glob pattern
 * Simple version that handles basic * and ** globs
 */
function matchesPattern(relPath, pattern) {
  // Normalize path separators
  const normalized = relPath.replace(/\\/g, '/');
  // Remove .astro extension for comparison
  const pathWithoutExt = normalized.replace(/\.astro$/, '');

  // Handle simple glob patterns like "src/pages/blog/*.astro"
  const patternWithoutExt = pattern.replace(/\.astro$/, '');

  // Simple case: no globs, do exact match
  if (!patternWithoutExt.includes('*')) {
    return pathWithoutExt === patternWithoutExt;
  }

  // Convert glob to regex - simpler approach
  // Replace ** with a placeholder, then * with regex
  let regexStr = patternWithoutExt
    .replace(/\*\*/g, '\x00')  // placeholder for **
    .replace(/\*/g, '[^/]*')    // * matches anything except /
    .replace(/\x00/g, '.*');    // ** becomes .*

  // Escape regex special chars except our placeholders
  regexStr = regexStr.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  const regex = new RegExp('^' + regexStr + '$');
  return regex.test(pathWithoutExt);
}

// ============================================================================
// PATTERN MATCHING & HUMANIZATION
// ============================================================================

/**
 * Find all AI patterns in content
 */
function findPatterns(content) {
  const found = [];
  for (const { pattern, replacement, category } of AI_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      found.push({
        category,
        pattern: pattern.source,
        replacement,
        count: matches.length
      });
    }
  }
  return found;
}

/**
 * Apply all AI patterns to content (returns { content, count })
 */
function humanizeContent(content) {
  let count = 0;
  let result = content;

  for (const aiPattern of AI_PATTERNS) {
    // Use the original RegExp object directly, not pattern.source
    // This preserves flags and avoids issues with {} in replacement strings
    const regex = aiPattern.pattern;
    const matches = result.match(regex);
    if (matches) {
      count += matches.length;
      result = result.replace(regex, aiPattern.replacement);
    }
  }

  return { content: result, count };
}

/**
 * Calculate humanity score (1-5) based on pattern count
 */
function calculateHumanityScore(patternCount) {
  if (patternCount === 0) return 5;
  if (patternCount <= 2) return 4;
  if (patternCount <= 5) return 3;
  if (patternCount <= 10) return 2;
  return 1;
}

// ============================================================================
// AUDIT FUNCTIONS
// ============================================================================

/**
 * Audit a single file
 */
function auditFile(filePath, baseDir, options = {}) {
  const { minWords = DEFAULT_MIN_WORDS } = options;

  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(baseDir, filePath).replace(/\\/g, '/');
  const wordCount = countWords(content);

  const issues = [];

  // Check thin content
  if (wordCount < minWords) {
    issues.push(`THIN_CONTENT:${wordCount}`);
  }

  // Check missing meta description
  if (!hasFrontmatterField(content, 'description')) {
    issues.push('MISSING_DESCRIPTION');
  }

  // Check missing title
  if (!hasFrontmatterField(content, 'title')) {
    issues.push('MISSING_TITLE');
  }

  // Check broken internal links
  const links = getInternalLinks(content);
  const srcDir = path.dirname(filePath);
  for (const link of links) {
    // Only check relative links (not external, not anchors)
    if (link.startsWith('/') && !link.startsWith('//')) {
      // Check if linked page exists
      const linkTarget = link.replace(/^\//, ''); // remove leading slash
      const fullTarget = path.join(baseDir, linkTarget);
      if (!fs.existsSync(fullTarget)) {
        issues.push(`BROKEN_LINK:${link}`);
      }
    }
  }

  return {
    path: relPath,
    wordCount,
    issues,
    rawContent: content
  };
}

// ============================================================================
// FILE DISCOVERY
// ============================================================================

/**
 * Find all .astro files matching a pattern
 */
function findAstroFiles(baseDir, pattern) {
  // Use glob like fix-patterns.cjs does
  const { globSync } = require('glob');

  try {
    const files = globSync(pattern, {
      cwd: baseDir,
      absolute: true,
      ignore: ['**/node_modules/**']
    });
    return files
      .filter(f => f.endsWith('.astro'))
      .map(f => {
        const relPath = path.relative(baseDir, f).replace(/\\/g, '/');
        return { fullPath: f, relPath };
      });
  } catch (err) {
    console.error(`Error finding files with pattern "${pattern}": ${err.message}`);
    return [];
  }
}

// ============================================================================
// REPORTING
// ============================================================================

/**
 * Format output as human-readable text
 */
function formatTextReport(results) {
  const lines = [];
  const passFiles = [];
  const reviewFiles = [];

  for (const file of results) {
    if (file.status === 'pass') {
      passFiles.push(file);
    } else {
      reviewFiles.push(file);
    }
  }

  lines.push('=== Content Quality Report ===');
  lines.push(`Total files: ${results.length}`);
  lines.push(`Avg humanity score: ${(results.reduce((a, r) => a + r.humanityScore, 0) / results.length).toFixed(1)}/5\n`);

  if (reviewFiles.length > 0) {
    lines.push('Files needing review:');
    for (const file of reviewFiles) {
      const scoreStr = `${file.humanityScore}/5`;
      const flag = file.humanityScore >= 4 ? '!' : '⚠️';
      const issues = file.issues.length > 0 ? ` (${file.issues.join(', ')})` : '';
      lines.push(`  ${flag}  ${file.path} — score ${scoreStr} (${file.patternCount} patterns found)${issues}`);
    }
    lines.push('');
  }

  if (passFiles.length > 0) {
    lines.push('Files fully humanized:');
    for (const file of passFiles) {
      lines.push(`  ✅ ${file.path}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format output as JSON
 */
function formatJsonReport(results) {
  const summary = {
    pass: results.filter(f => f.status === 'pass').length,
    review: results.filter(f => f.status === 'review').length,
    fail: results.filter(f => f.status === 'fail').length
  };

  return JSON.stringify({
    timestamp: new Date().toISOString(),
    totalFiles: results.length,
    avgHumanityScore: parseFloat((results.reduce((a, r) => a + r.humanityScore, 0) / results.length).toFixed(1)),
    files: results.map(f => ({
      path: f.path,
      humanityScore: f.humanityScore,
      patternCount: f.patternCount,
      issues: f.issues,
      status: f.status
    })),
    summary
  }, null, 2);
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

function runPipeline(options = {}) {
  const {
    apply = false,
    humanizeOnly = false,
    auditOnly = false,
    minScore = DEFAULT_MIN_SCORE,
    format = 'text',
    verbose = false,
    pattern = '**/*.astro',
    minWords = DEFAULT_MIN_WORDS
  } = options;

  // Determine base directory from script location
  // Script is at apps/maine-cannabis/scripts/content/content-quality.cjs
  // Project root is 3 levels up: apps/maine-cannabis
  const scriptPath = process.argv[1] || __filename;
  const scriptDir = path.dirname(scriptPath);
  const projectRoot = path.resolve(scriptDir, '..', '..');
  const pagesDir = path.join(projectRoot, 'src', 'pages');

  // Find files - use projectRoot as cwd like fix-patterns.cjs does
  const files = findAstroFiles(projectRoot, pattern);

  if (files.length === 0) {
    console.error(`No .astro files found matching: ${pattern}`);
    process.exit(1);
  }

  const results = [];
  let totalPatterns = 0;

  for (const { fullPath, relPath } of files) {
    // Step 1: Audit (skip if humanize-only)
    let auditResult = null;
    if (!humanizeOnly) {
      auditResult = auditFile(fullPath, projectRoot, { minWords });
    }

    // Step 2: Humanize (skip if audit-only)
    let humanizeResult = null;
    let humanityScore = 5;
    let patternCount = 0;

    if (!auditOnly) {
      const content = fs.readFileSync(fullPath, 'utf8');
      humanizeResult = humanizeContent(content);
      patternCount = humanizeResult.count;
      humanityScore = calculateHumanityScore(patternCount);
      totalPatterns += patternCount;

      // Apply if requested
      if (apply) {
        fs.writeFileSync(fullPath, humanizeResult.content);
      }
    }

    // Build result
    const result = {
      path: relPath,
      humanityScore,
      patternCount,
      issues: auditResult ? auditResult.issues : [],
      status: humanityScore >= 4 && (!auditResult || auditResult.issues.length === 0) ? 'pass' : 'review'
    };

    results.push(result);

    // Verbose output per file
    if (verbose && !auditOnly) {
      const statusIcon = humanityScore >= 4 ? '✅' : '⚠️';
      console.log(`${statusIcon} ${relPath}: score ${humanityScore}/5 (${patternCount} patterns)`);
      if (auditResult && auditResult.issues.length > 0) {
        for (const issue of auditResult.issues) {
          console.log(`    └─ ${issue}`);
        }
      }
    }
  }

  // Output report
  if (format === 'json') {
    console.log(formatJsonReport(results));
  } else {
    console.log(formatTextReport(results));
  }

  // Exit code check
  const minScoringFile = results.reduce((min, r) =>
    r.humanityScore < min.humanityScore ? r : min, results[0]);

  if (minScoringFile && minScoringFile.humanityScore < minScore) {
    console.error(`\n❌ File "${minScoringFile.path}" has humanity score ${minScoringFile.humanityScore}/5 (minimum: ${minScore}/5)`);
    process.exit(1);
  }

  if (verbose) {
    console.log(`\nTotal patterns found: ${totalPatterns}`);
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

function parseArgs(args) {
  const options = {
    apply: false,
    humanizeOnly: false,
    auditOnly: false,
    minScore: DEFAULT_MIN_SCORE,
    format: 'text',
    verbose: false,
    pattern: '**/*.astro',
    minWords: DEFAULT_MIN_WORDS
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--humanize-only') {
      options.humanizeOnly = true;
    } else if (arg === '--audit-only') {
      options.auditOnly = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--format' && args[i + 1]) {
      options.format = args[++i];
    } else if (arg === '--min-score' && args[i + 1]) {
      options.minScore = parseInt(args[++i], 10);
    } else if (arg === '--min-words' && args[i + 1]) {
      options.minWords = parseInt(args[++i], 10);
    } else if (arg === '--files' && args[i + 1]) {
      options.pattern = args[++i];
    } else if (!arg.startsWith('--')) {
      options.pattern = arg;
    }
  }

  return options;
}

function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  try {
    runPipeline(options);
  } catch (err) {
    console.error('Error running content quality pipeline:', err.message);
    process.exit(1);
  }
}

main();