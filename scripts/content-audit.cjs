#!/usr/bin/env node
/**
 * Content Audit - Full Site Analysis
 * Comprehensive audit of SEO, GEO, accessibility, and content quality
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Promotional/AI words
const PROMO_WORDS = [
  'pivotal', 'crucial', 'remarkable', 'breathtaking', 'stunning',
  'vibrant', 'nestled', 'fantastic', 'outstanding', 'exceptional',
  'transformative', 'game-changer', 'unparalleled', 'unmatched',
  'first-mover', 'world-class', 'cutting-edge', 'holistic'
];

const AI_PHRASES = [
  'stands as a testament', 'plays a pivotal role', 'it is important to note',
  'in conclusion', 'additionally', 'furthermore', 'moreover',
  'experts believe', 'industry reports'
];

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text) {
  return text.split(/\s+/).filter(w => w.match(/[a-zA-Z]/)).length;
}

function checkSeoElements(html) {
  const issues = [];
  const checks = [];
  
  // Title check
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  checks.push({
    name: 'Title tag',
    status: titleMatch ? '✅' : '❌',
    detail: titleMatch ? titleMatch[1].substring(0, 60) + '...' : 'Missing'
  });
  if (!titleMatch) issues.push('Missing <title> tag');
  
  // Meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  checks.push({
    name: 'Meta description',
    status: descMatch ? '✅' : '❌',
    detail: descMatch ? descMatch[1].substring(0, 60) + '...' : 'Missing'
  });
  if (!descMatch) issues.push('Missing meta description');
  
  // Canonical
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  checks.push({
    name: 'Canonical URL',
    status: canonicalMatch ? '✅' : '⚠️',
    detail: canonicalMatch ? 'Present' : 'Missing'
  });
  
  // OG tags
  const ogTitle = html.includes('og:title');
  const ogDesc = html.includes('og:description');
  const ogImage = html.includes('og:image');
  checks.push({
    name: 'Open Graph tags',
    status: (ogTitle && ogDesc && ogImage) ? '✅' : '⚠️',
    detail: `title:${ogTitle?'✅':'❌'} desc:${ogDesc?'✅':'❌'} img:${ogImage?'✅':'❌'}`
  });
  
  // JSON-LD structured data
  const jsonLd = html.includes('application/ld+json');
  checks.push({
    name: 'JSON-LD schema',
    status: jsonLd ? '✅' : '⚠️',
    detail: jsonLd ? 'Present' : 'Missing'
  });
  
  // H1 count
  const h1Count = (html.match(/<h1/gi) || []).length;
  checks.push({
    name: 'H1 heading',
    status: h1Count === 1 ? '✅' : '⚠️',
    detail: h1Count === 0 ? 'Missing' : h1Count > 1 ? `${h1Count} found (should be 1)` : 'Exactly 1'
  });
  if (h1Count !== 1) issues.push(`H1 count: ${h1Count} (should be 1)`);
  
  // Image alt attributes
  const imgsWithoutAlt = (html.match(/<img(?![^>]*alt=[^>]*)([^>]*)>/gi) || []).length;
  checks.push({
    name: 'Images with alt',
    status: imgsWithoutAlt === 0 ? '✅' : '⚠️',
    detail: imgsWithoutAlt > 0 ? `${imgsWithoutAlt} missing alt` : 'All have alt'
  });
  if (imgsWithoutAlt > 0) issues.push(`${imgsWithoutAlt} images missing alt attributes`);
  
  return { checks, issues };
}

function checkContentQuality(html) {
  const text = stripHtml(html);
  const wordCount = countWords(text);
  const issues = [];
  const checks = [];
  
  // Word count
  checks.push({
    name: 'Word count',
    status: wordCount >= 800 ? '✅' : wordCount >= 500 ? '⚠️' : '❌',
    detail: `${wordCount} words ${wordCount < 800 ? '(target: 800+)' : ''}`
  });
  if (wordCount < 800) issues.push(`Thin content: ${wordCount} words`);
  
  // Promotional words
  let promoCount = 0;
  for (const word of PROMO_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) promoCount += matches.length;
  }
  
  checks.push({
    name: 'Promotional words',
    status: promoCount === 0 ? '✅' : promoCount <= 3 ? '⚠️' : '❌',
    detail: promoCount === 0 ? 'Clean' : `${promoCount} found`
  });
  if (promoCount > 5) issues.push(`Excessive promotional tone: ${promoCount} buzzwords`);
  
  // AI phrases
  let aiPhraseCount = 0;
  for (const phrase of AI_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    const matches = text.match(regex);
    if (matches) aiPhraseCount += matches.length;
  }
  
  checks.push({
    name: 'AI-sounding phrases',
    status: aiPhraseCount === 0 ? '✅' : '⚠️',
    detail: aiPhraseCount === 0 ? 'Clean' : `${aiPhraseCount} found`
  });
  if (aiPhraseCount > 3) issues.push(`AI tone detected: ${aiPhraseCount} phrases`);
  
  // Internal links
  const internalLinks = (html.match(/href=["']\//gi) || []).length;
  checks.push({
    name: 'Internal links',
    status: internalLinks >= 3 ? '✅' : internalLinks > 0 ? '⚠️' : '❌',
    detail: `${internalLinks} found`
  });
  
  // External links
  const externalLinks = (html.match(/href=["']https?:\/\//gi) || []).length;
  checks.push({
    name: 'External links',
    status: externalLinks > 0 ? '✅' : '⚠️',
    detail: `${externalLinks} found`
  });
  
  return { checks, issues, wordCount, promoCount, aiPhraseCount };
}

function calculateScore(checks, issues, wordCount) {
  let score = 100;
  
  // Deduct for issues
  score -= issues.length * 5;
  
  // Deduct for warnings
  const warnings = checks.filter(c => c.status === '⚠️').length;
  score -= warnings * 2;
  
  // Deduct for thin content
  if (wordCount < 500) score -= 20;
  else if (wordCount < 800) score -= 10;
  
  // Deduct for bad SEO checks
  const badSeo = checks.filter(c => c.status === '❌').length;
  score -= badSeo * 10;
  
  return Math.max(0, Math.min(100, score));
}

function auditFile(filePath) {
  let html;
  try {
    html = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return { file: filePath, error: err.message };
  }
  
  const seo = checkSeoElements(html);
  const content = checkContentQuality(html);
  const allIssues = [...seo.issues, ...content.issues];
  const score = calculateScore([...seo.checks, ...content.checks], allIssues, content.wordCount);
  
  return {
    file: filePath,
    relativePath: path.relative(process.cwd(), filePath),
    seo,
    content,
    issues: allIssues,
    score,
    checks: [...seo.checks, ...content.checks]
  };
}

function auditSite(pattern) {
  const files = glob.sync(pattern);
  
  if (files.length === 0) {
    console.log(`No files found: ${pattern}`);
    return [];
  }
  
  console.log(`\n🔍 Auditing ${files.length} files...\n`);
  
  const results = files.map(f => auditFile(f)).filter(r => !r.error);
  
  // Sort by score (lowest = worst first)
  const sorted = [...results].sort((a, b) => a.score - b.score);
  
  // Summary
  const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
  const totalWords = results.reduce((sum, r) => sum + r.content.wordCount, 0);
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  
  console.log('═'.repeat(70));
  console.log('📊 SITE AUDIT SUMMARY');
  console.log('═'.repeat(70));
  console.log(`  Pages audited:     ${results.length}`);
  console.log(`  Average score:     ${avgScore}/100`);
  console.log(`  Total words:       ${totalWords.toLocaleString()}`);
  console.log(`  Total issues:      ${totalIssues}`);
  console.log(`  Avg words/page:    ${Math.round(totalWords / results.length)}`);
  
  // Score distribution
  const excellent = results.filter(r => r.score >= 90).length;
  const good = results.filter(r => r.score >= 70 && r.score < 90).length;
  const needsWork = results.filter(r => r.score >= 50 && r.score < 70).length;
  const poor = results.filter(r => r.score < 50).length;
  
  console.log('\n  📈 Score Distribution:');
  console.log(`     ✅ Excellent (90+): ${excellent}`);
  console.log(`     ✅ Good (70-89):    ${good}`);
  console.log(`     ⚠️  Needs Work (50-69): ${needsWork}`);
  console.log(`     ❌ Poor (<50):      ${poor}`);
  
  // Top issues
  const issueCounts = {};
  results.forEach(r => {
    r.issues.forEach(issue => {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    });
  });
  
  const topIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  if (topIssues.length > 0) {
    console.log('\n  🔴 Most Common Issues:');
    topIssues.forEach(([issue, count]) => {
      console.log(`     ${count}x: ${issue}`);
    });
  }
  
  // Priority fixes
  if (sorted.length > 0 && sorted[0].score < 70) {
    console.log('\n' + '═'.repeat(70));
    console.log('🎯 TOP 5 PRIORITY FIXES');
    console.log('═'.repeat(70));
    sorted.slice(0, 5).forEach(r => {
      console.log(`\n  ${r.score}/100 - ${path.basename(r.file)}`);
      r.issues.slice(0, 3).forEach(issue => {
        console.log(`    → ${issue}`);
      });
    });
  }
  
  return results;
}

function showDetailedAudit(filePath) {
  const result = auditFile(filePath);
  
  if (result.error) {
    console.log(`❌ Error: ${result.error}`);
    return;
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log(`📄 ${result.relativePath}`);
  console.log(`   Score: ${result.score}/100`);
  console.log('═'.repeat(70));
  
  console.log('\n  🔍 SEO CHECKS:');
  result.seo.checks.forEach(c => {
    console.log(`     ${c.status} ${c.name}: ${c.detail}`);
  });
  
  console.log('\n  📝 CONTENT CHECKS:');
  result.content.checks.forEach(c => {
    console.log(`     ${c.status} ${c.name}: ${c.detail}`);
  });
  
  if (result.issues.length > 0) {
    console.log('\n  ⚠️  ISSUES:');
    result.issues.forEach(issue => {
      console.log(`     → ${issue}`);
    });
  } else {
    console.log('\n  ✅ No issues found');
  }
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
📊 Content Audit - Full Site Analysis

Comprehensive audit of SEO, content quality, and GEO readiness.

Usage:
  node content-audit.cjs <pattern>         Audit matching files
  node content-audit.cjs --detail <file>    Show detailed audit

Examples:
  node content-audit.cjs "./src/pages/guides/*.astro"
  node content-audit.cjs --detail ./src/pages/index.astro
`);
  process.exit(0);
}

if (args[0] === '--detail') {
  if (!args[1]) {
    console.error('❌ Please provide a file path');
    process.exit(1);
  }
  showDetailedAudit(args[1]);
} else {
  auditSite(args[0]);
}
