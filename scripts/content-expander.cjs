#!/usr/bin/env node
/**
 * Content Expander
 * Identifies thin content and suggests expansion areas
 * Provides templates and prompts for deepening content
 * 
 * WRITING RULES (content-quality.cjs scoring):
 * - Score = 100 - (issues×5) - (wordCount<500?20:0) - (readability<60?10:0)
 * - Avg words/sentence: target 9-12 (max 15). Long sentences kill readability.
 * - Avoid: exceptional, first-mover, cutting-edge, leverage (verb), utilize,
 *          optimize, enhance, empower, game-changer, pivotal, synergy
 * - Avoid AI phrases: plays a pivotal role, it is important to note, 
 *          additionally, furthermore, moreover, in conclusion
 * - Avoid filler: due to the fact that, in order to, for the purpose of
 * - Rule of thumb: If a sentence runs longer than your thumb, break it.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SITE_URL = 'https://mainedispensaryguide.com';

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeadings(html) {
  const headings = [];
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
  const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi);
  const h3Match = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi);
  
  if (h1Match) h1Match.forEach(h => headings.push({ level: 1, text: stripHtml(h) }));
  if (h2Match) h2Match.forEach(h => headings.push({ level: 2, text: stripHtml(h) }));
  if (h3Match) h3Match.forEach(h => headings.push({ level: 3, text: stripHtml(h) }));
  
  return headings;
}

function estimateReadingTime(wordCount) {
  const minutes = Math.ceil(wordCount / 200);
  return minutes;
}

function analyzeContentDensity(filePath) {
  let html;
  try {
    html = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return { error: err.message };
  }
  
  const text = stripHtml(html);
  const wordCount = text.split(/\s+/).filter(w => w.match(/[a-zA-Z]/)).length;
  const headings = extractHeadings(html);
  const sections = headings.filter(h => h.level === 2);
  
  const avgWordsPerSection = sections.length > 0 ? Math.round(wordCount / sections.length) : wordCount;
  
  return {
    file: filePath,
    relativePath: path.relative(process.cwd(), filePath),
    wordCount,
    headingCount: headings.length,
    sectionCount: sections.length,
    avgWordsPerSection,
    readingTime: estimateReadingTime(wordCount),
    headings,
    isThin: wordCount < 800,
    isMedium: wordCount >= 800 && wordCount < 1200,
    isDense: wordCount >= 1200
  };
}

function suggestExpansions(analysis) {
  const suggestions = [];
  
  if (analysis.isThin) {
    suggestions.push({
      type: 'CRITICAL',
      priority: 1,
      issue: `Thin content: ${analysis.wordCount} words (target: 800+)`,
      action: 'Expand existing sections significantly or add new substantive sections'
    });
  }
  
  if (analysis.avgWordsPerSection < 100) {
    suggestions.push({
      type: 'SHALLOW',
      priority: 2,
      issue: `Shallow sections: ~${analysis.avgWordsPerSection} words/section`,
      action: 'Each section needs 150-300 words of explanatory content'
    });
  }
  
  if (analysis.sectionCount < 4) {
    suggestions.push({
      type: 'STRUCTURE',
      priority: 3,
      issue: `Limited structure: only ${analysis.sectionCount} main sections`,
      action: 'Add 2-4 more H2 sections to create comprehensive coverage'
    });
  }
  
  const headingTexts = analysis.headings.map(h => h.text.toLowerCase());
  
  const commonSections = [
    { keywords: ['cost', 'investment', 'budget', 'fee'], suggest: 'Cost breakdown section with specific numbers' },
    { keywords: ['requirement', 'license', 'eligibility'], suggest: 'Requirements section with legal citations' },
    { keywords: ['location', 'real estate', 'zoning'], suggest: 'Location selection criteria and zoning info' },
    { keywords: ['competition', 'market', 'opportunity'], suggest: 'Competitive landscape analysis' },
    { keywords: ['step', 'process', 'how to', 'guide'], suggest: 'Step-by-step process explanation' },
    { keywords: ['risk', 'challenge', 'pitfall'], suggest: 'Risk assessment and mitigation strategies' },
    { keywords: ['faq', 'question', 'common'], suggest: 'FAQ section with common reader questions' },
    { keywords: ['resource', 'link', 'contact'], suggest: 'Resource links and next steps' }
  ];
  
  for (const section of commonSections) {
    const hasSection = headingTexts.some(h => 
      section.keywords.some(k => h.includes(k))
    );
    if (!hasSection) {
      suggestions.push({
        type: 'MISSING',
        priority: 4,
        issue: `Missing section: "${section.suggest}"`,
        action: section.suggest
      });
    }
  }
  
  return suggestions.sort((a, b) => a.priority - b.priority);
}

function generateExpansionTemplate(analysis) {
  const title = analysis.headings.find(h => h.level === 1)?.text || 'Untitled';
  
  return `
## EXPANSION TEMPLATE: ${title}

### Current State
- **Word Count:** ${analysis.wordCount} words
- **Sections:** ${analysis.sectionCount} main topics
- **Reading Time:** ${analysis.readingTime} min
- **Status:** ${analysis.isThin ? '🔴 THIN' : analysis.isMedium ? '⚠️ MEDIUM' : '✅ GOOD'}

### Suggested Expansions

${suggestExpansions(analysis).map((s, i) => `${i + 1}. [${s.type}] ${s.issue}
   → ${s.action}`).join('\n\n')}

### Natural Voice Writing Rules (for content-quality.cjs scoring)

When writing or expanding content, FOLLOW THESE RULES:

#### ❌ AVOID - These cost 5 points each:
- **Promotional words:** exceptional, first-mover, cutting-edge, leverage (verb), 
  utilize, optimize, enhance, empower, game-changer, pivotal, synergy, 
  paradigm, transformative, holistic, revolutionary, groundbreaking
- **AI phrases:** plays a pivotal role, it is important to note, in conclusion,
  additionally, furthermore, moreover, on the other hand, as previously mentioned,
  it is worth noting, taking this into consideration, in today's landscape
- **Filler:** due to the fact that, in order to, for the purpose of,
  in light of the fact that, at this point in time, in the event that

#### ✅ DO - These improve readability:
- **Break long sentences.** Target 9-12 words/sentence. If it runs longer than
  your thumb, split it in two.
- **Use simple words.** "use" not "utilize", "help" not "leverage", 
  "improve" not "optimize", "boost" not "enhance"
- **Write like you talk.** Read aloud. If it sounds robotic, rewrite.
- **Lead with the point.** Front-load keywords.

#### Example Transformations:
❌ "The dispensary offers exceptional products at competitive prices."
✅ "The dispensary stocks good products at fair prices."

❌ "This represents a first-mover advantage in the emerging market."
✅ "Opening here first gives you an edge over later competitors."

❌ "Additionally, the market data shows significant growth potential."
✅ "The market data also shows strong growth." (or just cut it)

### Expansion Prompts

Use these prompts to expand content:

#### Prompt 1: Deep Dive on [Specific Topic]
\`\`\`
Research [topic] in detail for Maine cannabis dispensary context.
What specific numbers, regulations, and local insights should be included?
Write 2-3 paragraphs. Keep sentences short (9-12 words avg).
Avoid: exceptional, first-mover, leverage (verb), utilize, optimize.
\`\`\`

#### Prompt 2: Reader Questions
\`\`\`
What questions would a first-time dispensary founder ask after reading this?
Answer 3-4 common questions with Maine-specific details.
Use short sentences. Sound like a person, not a robot.
\`\`\`

#### Prompt 3: Examples and Case Studies
\`\`\`
Find a real example or case study relevant to this content.
Include specific operator names, locations, and outcomes if available.
Write in natural voice with short sentences.
\`\`\`

#### Prompt 4: Expand Existing Section
\`\`\`
Take the "[Section Name]" section and expand it by 200+ words.
Add: why it matters, common mistakes, Maine-specific context.
Keep sentences short. Avoid AI-sounding phrases.
\`\`\`
`;
}

function analyzeSite(pattern) {
  const files = glob.sync(pattern);
  
  if (files.length === 0) {
    console.log(`No files found: ${pattern}`);
    return [];
  }
  
  console.log(`\n🔍 Analyzing ${files.length} files...\n`);
  
  const analyses = files.map(f => analyzeContentDensity(f));
  
  const sorted = [...analyses].sort((a, b) => a.wordCount - b.wordCount);
  
  console.log('═'.repeat(70));
  console.log('📊 CONTENT DENSITY ANALYSIS');
  console.log('═'.repeat(70));
  
  sorted.forEach((a, i) => {
    if (a.error) {
      console.log(`\n❌ ${path.basename(a.file)}: ${a.error}`);
      return;
    }
    
    const status = a.isThin ? '🔴' : a.isMedium ? '⚠️' : '✅';
    console.log(`\n${status} ${i + 1}. ${path.basename(a.file)}`);
    console.log(`   Words: ${a.wordCount} | Sections: ${a.sectionCount} | Read: ${a.readingTime}min`);
  });
  
  const totalWords = analyses.reduce((sum, a) => sum + (a.error ? 0 : a.wordCount), 0);
  const avgWords = Math.round(totalWords / analyses.length);
  const thinFiles = analyses.filter(a => !a.error && a.isThin).length;
  const mediumFiles = analyses.filter(a => !a.error && a.isMedium).length;
  const goodFiles = analyses.filter(a => !a.error && a.isDense).length;
  
  console.log('\n' + '═'.repeat(70));
  console.log('📈 SITE-WIDE SUMMARY');
  console.log('═'.repeat(70));
  console.log(`  Total Pages:     ${analyses.length}`);
  console.log(`  Total Words:    ${totalWords.toLocaleString()}`);
  console.log(`  Avg Words/Page: ${avgWords}`);
  console.log(`  🔴 Thin (<800): ${thinFiles}`);
  console.log(`  ⚠️  Medium:      ${mediumFiles}`);
  console.log(`  ✅ Dense (1200+): ${goodFiles}`);
  
  if (thinFiles > 0) {
    console.log('\n' + '═'.repeat(70));
    console.log('🎯 PRIORITY EXPANSION TARGETS');
    console.log('═'.repeat(70));
    sorted.filter(a => !a.error && a.isThin).slice(0, 5).forEach(a => {
      console.log(`  ${a.wordCount} words - ${path.basename(a.file)}`);
      const suggestions = suggestExpansions(a);
      suggestions.slice(0, 2).forEach(s => {
        console.log(`    → ${s.action}`);
      });
    });
  }
  
  return analyses;
}

function showExpansionGuide(filePath) {
  const analysis = analyzeContentDensity(filePath);
  
  if (analysis.error) {
    console.log(`❌ Error: ${analysis.error}`);
    return;
  }
  
  console.log(generateExpansionTemplate(analysis));
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
📖 Content Expander

Identifies thin content and provides expansion guidance.

Usage:
  node content-expander.cjs <file.html>           Analyze single file
  node content-expander.cjs "./src/**/*.astro"   Analyze glob pattern
  node content-expander.cjs --guide <file>      Show expansion template

Examples:
  node content-expander.cjs ./src/pages/guides/bangor-dispensary-guide.astro
  node content-expander.cjs "./src/pages/guides/*-dispensary-guide.astro"
  node content-expander.cjs --guide ./src/pages/guides/bangor-dispensary-guide.astro
`);
  process.exit(0);
}

if (args[0] === '--guide') {
  if (!args[1]) {
    console.error('❌ Please provide a file path after --guide');
    process.exit(1);
  }
  showExpansionGuide(args[1]);
} else {
  analyzeSite(args[0]);
}