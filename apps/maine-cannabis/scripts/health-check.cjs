#!/usr/bin/env node
/**
 * Cross-platform health check script for Maine Dispensary Guide
 * Replaces PowerShell-only health-check.ps1
 * Usage: node scripts/health-check.cjs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://mainedispensaryguide.com';
const GUIDES_DIR = path.join(__dirname, '..', 'src', 'pages', 'guides');

console.log('🚀 Starting Project Health Audit...\n');

const results = [];

function check(name, fn) {
  try {
    const result = fn();
    results.push({ name, status: 'OK', detail: result });
    console.log(`✅ ${name}: ${result}`);
  } catch (err) {
    results.push({ name, status: 'FAIL', detail: err.message });
    console.log(`❌ ${name}: ${err.message}`);
  }
}

// 1. DNS status
check('DNS', () => {
  try {
    execSync(`nslookup ${SITE_URL}`, { stdio: 'pipe' });
    return 'Active';
  } catch {
    throw new Error('DNS resolution failed');
  }
});

// 2. SSL/HTTPS status
check('SSL/HTTPS', () => {
  try {
    const output = execSync(`curl -sI ${SITE_URL} 2>/dev/null | head -5`, { encoding: 'utf8' });
    if (output.includes('200') || output.includes('301')) {
      return 'OK';
    }
    throw new Error('Unexpected response');
  } catch {
    throw new Error('Connection failed');
  }
});

// 3. Guide count
check('Guide Pages', () => {
  if (!fs.existsSync(GUIDES_DIR)) return '0 (directory missing)';
  const files = fs.readdirSync(GUIDES_DIR).filter(f => f.endsWith('.astro') && f !== 'index.astro');
  return `${files.length} files`;
});

// 4. Build artifacts
check('Build Output', () => {
  const distPath = path.join(__dirname, '..', '..', '..', 'dist');
  if (fs.existsSync(distPath)) {
    const count = fs.readdirSync(distPath).length;
    return `OK (${count} items)`;
  }
  throw new Error('No dist directory');
});

// 5. Node/NPM versions
check('Node', () => {
  return execSync('node --version', { encoding: 'utf8' }).trim();
});

check('NPM', () => {
  return execSync('npm --version', { encoding: 'utf8' }).trim();
});

// Summary
const failures = results.filter(r => r.status === 'FAIL');
console.log(`\n📊 Summary: ${results.length} checks, ${results.length - failures.length} passed, ${failures.length} failed`);

if (failures.length > 0) {
  console.log('\n⚠️  Failed checks:');
  failures.forEach(f => console.log(`   - ${f.name}: ${f.detail}`));
  process.exit(1);
}
