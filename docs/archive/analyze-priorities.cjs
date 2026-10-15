#!/usr/bin/env node
/**
 * analyze-priorities.cjs
 * Wrapper around analyze-quality.js that outputs prioritized fix recommendations.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ANALYZER = 'C:\\Users\\Steve\\.agents\\skills\\content-ops\\scripts\\analyze-quality.js';
const GUIDE_DIR = 'project-1/src/pages/guides';

const PROMO_PATTERNS = [
  'best-in-class', 'cutting-edge', 'game-changing', 'industry-leading',
  'next-generation', 'paradigm-shifting', 'revolutionary', 'state-of-the-art',
  'unmatched', 'unparalleled'
];

const EMPTY_MODIFIERS = [
  'very ', 'really ', 'extremely ', 'incredibly ', 'absolutely ',
  'completely ', 'totally ', 'perfectly ', 'utterly ', 'highly ',
  'quite ', 'rather ', 'fairly ', 'pretty ', 'somewhat '
];

function runAnalyzer(filePath) {
  try {
    const output = execSync(`node "${ANALYZER}" "${filePath}"`, {
      encoding: 'utf-8',
      timeout: 30000
    });
    
    const lines = output.split('\n');
    let score, wordCount, flesch, emptyMods;
    
    for (const line of lines) {
      const scoreMatch = line.match(/Score:\s*(\d+)/);
      const wordMatch = line.match(/([\d,]+)\s+words/);
      const fleschMatch = line.match(/Flesch\s+(\d+)/);
      const modMatch = line.match(/Empty modifiers:\s*(\d+)/);
      
      if (scoreMatch) score = parseInt(scoreMatch[1]);
      if (wordMatch) wordCount = parseInt(wordMatch[1].replace(/,/g, ''));
      if (fleschMatch) flesch = parseInt(fleschMatch[1]);
      if (modMatch) emptyMods = parseInt(modMatch[1]);
    }
    
    if (!score || !wordCount) return null;
    
    return { score, wordCount, flesch: flesch || 0, emptyMods: emptyMods || 0 };
  } catch (e) {
    console.error(`Error analyzing ${filePath}: ${e.message}`);
    return null;
  }
}

function getAvailableFixes(r) {
  const fixes = [];
  let fixPoints = 0;
  
  if (r.flesch < 30) {
    fixes.push(`Flesch ${r.flesch}→30`);
    fixPoints += 5;
  } else if (r.flesch < 40) {
    fixes.push(`Flesch ${r.flesch}→40`);
    fixPoints += 5;
  } else if (r.flesch < 50) {
    fixes.push(`Flesch ${r.flesch}→50`);
    fixPoints += 5;
  }
  
  if (r.wordCount < 800) {
    const needed = 800 - r.wordCount;
    fixes.push(`+${needed} words`);
    fixPoints += 10;
  }
  
  if (r.emptyMods > 0) {
    const emFix = Math.min(r.emptyMods, 5) * 2;
    fixes.push(`${r.emptyMods} empty mods`);
    fixPoints += emFix;
  }
  
  return { fixes, fixPoints };
}

function main() {
  const files = glob.sync(`${GUIDE_DIR}/*.astro`);
  
  if (files.length === 0) {
    console.error('No files found.');
    process.exit(1);
  }
  
  const results = [];
  
  for (const f of files) {
    const result = runAnalyzer(f);
    if (result) {
      const { fixes, fixPoints } = getAvailableFixes(result);
      results.push({
        file: path.basename(f),
        path: f,
        ...result,
        fixes,
        fixPoints
      });
    }
  }
  
  results.sort((a, b) => a.score - b.score);
  
  console.log('\n=== CONTENT QUALITY PRIORITY MATRIX ===\n');
  console.log(`${results.length} files | Target: 85/100 avg\n`);
  console.log('FILE                          SCORE  FLESCH  WORDS  AVAILABLE FIXES');
  console.log('----------------------------  -----  ------  -----  -----------------');
  
  let totalScore = 0;
  let totalFixable = 0;
  
  for (const r of results) {
    totalScore += r.score;
    totalFixable += r.fixPoints;
    
    const fixStr = r.fixes.length > 0 ? r.fixes.join(', ') : '—';
    const flag = r.fixPoints >= 15 ? '●●●' : r.fixPoints >= 10 ? '●●○' : r.fixPoints >= 5 ? '●●○' : '○○○';
    
    console.log(
      `${r.file.padEnd(30)} ${String(r.score).padStart(5)}/100  ` +
      `F${String(r.flesch).padStart(3)}   ${String(r.wordCount).padStart(5)}  ` +
      `${flag} ${fixStr}`
    );
  }
  
  const avgScore = Math.round(totalScore / results.length);
  const potentialAvg = Math.round((totalScore + totalFixable) / results.length);
  
  console.log('\n--- SUMMARY ---');
  console.log(`Current avg: ${avgScore}/100`);
  console.log(`Total fixable: ${totalFixable} points`);
  console.log(`If all fixed: ${potentialAvg}/100 avg`);
  console.log('\nFLAGS: [15+]=best, [10+]=good, [5+]=worth doing, [<5]=low priority');
}

main();
