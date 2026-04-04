#!/usr/bin/env node
/**
 * Content Quality Analyzer
 * Analyzes Astro/HTML content for:
 * - Readability scores (Flesch-Kincaid)
 * - Promotional/corporate word detection
 * - AI-sounding phrase detection
 * - Content density metrics
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Promotional/AI-sounding words to detect
const PROMOTIONAL_WORDS = [
  'pivotal', 'crucial', 'remarkable', 'breathtaking', 'stunning',
  'vibrant', 'nestled', 'fantastic', 'outstanding', 'exceptional',
  'transformative', 'game-changer', 'unparalleled', 'unmatched',
  'first-mover', 'best-in-class', 'world-class', 'cutting-edge',
  'holistic', 'utilized', 'leverage', 'synergy', 'paradigm',
  'streamline', 'optimize', 'enhance', 'empower', 'revolutionize'
];

// AI-sounding phrases
const AI_PHRASES = [
  'stands as a testament', 'plays a pivotal role', 'it is important to note',
  'in conclusion', 'additionally', 'furthermore', 'moreover',
  'on the other hand', 'as previously mentioned', 'it is worth noting',
  'with this in mind', 'taking this into consideration', 'in today\'s landscape'
];

// Filler phrases
const FILLER_PHRASES = [
  'due to the fact that', 'in order to', 'for the purpose of',
  'in light of the fact that', 'at this point in time', 'in the event that'
];

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

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  
  const syllables = word.match(/[aeiouy]{1,2}/g);
  return syllables ? syllables.length : 1;
}

function calculateFleschKincaid(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.match(/[a-zA-Z]/));
  
  if (sentences.length === 0 || words.length === 0) return 0;
  
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = totalSyllables / words.length;
  
  // Flesch Reading Ease
  const readingEase = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  
  // Flesch-Kincaid Grade Level
  const gradeLevel = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;
  
  return {
    readingEase: Math.max(0, Math.min(100, Math.round(readingEase))),
    gradeLevel: Math.max(0, Math.round(gradeLevel * 10) / 10),
    sentences: sentences.length,
    words: words.length,
    syllables: totalSyllables,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100
  };
}

function detectPromotionalWords(text) {
  const lowerText = text.toLowerCase();
  const found = [];
  
  for (const word of PROMOTIONAL_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) {
      found.push({ word, count: matches.length });
    }
  }
  
  return found.sort((a, b) => b.count - a.count);
}

function detectAiPhrases(text) {
  const lowerText = text.toLowerCase();
  const found = [];
  
  for (const phrase of AI_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    const matches = text.match(regex);
    if (matches) {
      found.push({ phrase, count: matches.length });
    }
  }
  
  return found.sort((a, b) => b.count - a.count);
}

function detectFillerPhrases(text) {
  const lowerText = text.toLowerCase();
  const found = [];
  
  for (const phrase of FILLER_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    const matches = text.match(regex);
    if (matches) {
      found.push({ phrase, count: matches.length });
    }
  }
  
  return found.sort((a, b) => b.count - a.count);
}

function getReadingLevel(fleschScore) {
  if (fleschScore >= 90) return '5th grade';
  if (fleschScore >= 80) return '6th grade';
  if (fleschScore >= 70) return '7th grade';
  if (fleschScore >= 60) return '8th-9th grade';
  if (fleschScore >= 50) return '10th-12th grade';
  if (fleschScore >= 30) return 'College';
  return 'College graduate';
}

function analyzeFile(filePath) {
  console.log(`\n📄 Analyzing: ${path.basename(filePath)}\n`);
  
  let html;
  try {
    html = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`❌ Error reading file: ${err.message}`);
    return;
  }
  
  const text = stripHtml(html);
  const flesch = calculateFleschKincaid(text);
  const promoWords = detectPromotionalWords(text);
  const aiPhrases = detectAiPhrases(text);
  const filler = detectFillerPhrases(text);
  
  console.log('═'.repeat(50));
  console.log('📊 READABILITY METRICS');
  console.log('═'.repeat(50));
  console.log(`  Words:           ${flesch.words.toLocaleString()}`);
  console.log(`  Sentences:       ${flesch.sentences}`);
  console.log(`  Avg words/sent:  ${flesch.avgWordsPerSentence}`);
  console.log(`  Syllables:       ${flesch.syllables}`);
  console.log(`  Reading Ease:    ${flesch.readingEase}/100 (${getReadingLevel(flesch.readingEase)})`);
  console.log(`  Grade Level:     ${flesch.gradeLevel}`);
  
  console.log('\n' + '═'.repeat(50));
  console.log('⚠️  PROMOTIONAL WORDS DETECTED');
  console.log('═'.repeat(50));
  
  if (promoWords.length === 0) {
    console.log('  ✅ None detected');
  } else {
    promoWords.forEach(({ word, count }) => {
      console.log(`  "${word}" - ${count} occurrence${count > 1 ? 's' : ''}`);
    });
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('🤖 AI-SOUNDING PHRASES');
  console.log('═'.repeat(50));
  
  if (aiPhrases.length === 0) {
    console.log('  ✅ None detected');
  } else {
    aiPhrases.forEach(({ phrase, count }) => {
      console.log(`  "${phrase}" - ${count} occurrence${count > 1 ? 's' : ''}`);
    });
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('📝 FILLER PHRASES');
  console.log('═'.repeat(50));
  
  if (filler.length === 0) {
    console.log('  ✅ None detected');
  } else {
    filler.forEach(({ phrase, count }) => {
      console.log(`  "${phrase}" - ${count} occurrence${count > 1 ? 's' : ''}`);
    });
  }
  
  // Overall score
  const totalIssues = promoWords.reduce((sum, w) => sum + w.count, 0) +
                      aiPhrases.reduce((sum, p) => sum + p.count, 0) +
                      filler.reduce((sum, f) => sum + f.count, 0);
  
  console.log('\n' + '═'.repeat(50));
  console.log('📈 OVERALL CONTENT SCORE');
  console.log('═'.repeat(50));
  
  const wordCount = flesch.words;
  const density = wordCount >= 800 ? '✅ Good (800+ words)' :
                  wordCount >= 500 ? '⚠️  Medium (500-799 words)' :
                  '❌ Thin (< 500 words)';
  
  const readability = flesch.readingEase >= 60 ? '✅ Readable (60+)' :
                     flesch.readingEase >= 40 ? '⚠️  Difficult (40-59)' :
                     '❌ Very Difficult (< 40)';
  
  const tone = totalIssues <= 3 ? '✅ Natural' :
               totalIssues <= 10 ? '⚠️  Some Corporate Tone' :
               '❌ Overly Promotional';
  
  console.log(`  Content Density: ${density}`);
  console.log(`  Readability:     ${readability}`);
  console.log(`  Tone:             ${tone}`);
  console.log(`  Total Issues:     ${totalIssues}`);
  
  const score = Math.max(0, 100 - (totalIssues * 5) - (wordCount < 500 ? 20 : 0) - (flesch.readingEase < 60 ? 10 : 0));
  console.log(`\n  🏆 Content Quality Score: ${score}/100`);
  
  return {
    file: filePath,
    score,
    flesch,
    promoWords,
    aiPhrases,
    filler,
    totalIssues
  };
}

function analyzeGlob(pattern) {
  const glob = require('glob');
  const files = glob.sync(pattern);
  
  if (files.length === 0) {
    console.log(`No files found matching: ${pattern}`);
    return [];
  }
  
  console.log(`\n🔍 Found ${files.length} files matching: ${pattern}\n`);
  
  const results = files.map(f => analyzeFile(f));
  
  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 SUMMARY ACROSS ALL FILES');
  console.log('═'.repeat(50));
  
  const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
  const totalWords = results.reduce((sum, r) => sum + r.flesch.words, 0);
  const totalPromo = results.reduce((sum, r) => sum + r.promoWords.reduce((s, w) => s + w.count, 0), 0);
  const totalAiPhrases = results.reduce((sum, r) => sum + r.aiPhrases.reduce((s, p) => s + p.count, 0), 0);
  
  console.log(`  Files Analyzed:    ${results.length}`);
  console.log(`  Total Words:      ${totalWords.toLocaleString()}`);
  console.log(`  Avg Quality Score: ${avgScore}/100`);
  console.log(`  Total Promo Words: ${totalPromo}`);
  console.log(`  Total AI Phrases:  ${totalAiPhrases}`);
  
  // Sort by score (lowest first = most issues)
  const sorted = [...results].sort((a, b) => a.score - b.score);
  
  if (sorted.length > 1) {
    console.log('\n  🔴 Files needing attention (lowest scores):');
    sorted.slice(0, 5).forEach(r => {
      console.log(`    ${r.score}/100 - ${path.basename(r.file)}`);
    });
  }
  
  return results;
}

function analyzeUrl(urlStr) {
  console.log(`\n🌐 Fetching: ${urlStr}\n`);
  
  const protocol = urlStr.startsWith('https') ? https : http;
  
  protocol.get(urlStr, { headers: { 'User-Agent': 'Mozilla/5.0 Content Quality Analyzer' } }, (res) => {
    let data = '';
    
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      // Save to temp file and analyze
      const tmpFile = path.join(require('os').tmpdir(), 'content_analysis_' + Date.now() + '.html');
      fs.writeFileSync(tmpFile, data);
      analyzeFile(tmpFile);
      fs.unlinkSync(tmpFile);
    });
  }).on('error', err => {
    console.error(`❌ Error fetching URL: ${err.message}`);
  });
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
📊 Content Quality Analyzer

Usage:
  node content-quality.cjs <file.html>           Analyze single file
  node content-quality.cjs "**/*.astro"          Analyze all .astro files
  node content-quality.cjs --url <https://...>   Analyze URL

Examples:
  node content-quality.cjs ./src/pages/guides/bangor-dispensary-guide.astro
  node content-quality.cjs "./src/pages/guides/*.astro"
  node content-quality.cjs --url https://example.com/page
`);
  process.exit(0);
}

if (args[0] === '--url') {
  if (!args[1]) {
    console.error('❌ Please provide a URL after --url');
    process.exit(1);
  }
  analyzeUrl(args[1]);
} else if (args[0].startsWith('http')) {
  analyzeUrl(args[0]);
} else {
  analyzeGlob(args[0]);
}
