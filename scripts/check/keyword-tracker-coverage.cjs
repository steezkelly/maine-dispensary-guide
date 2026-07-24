#!/usr/bin/env node
/**
 * keyword-tracker-coverage.cjs
 *
 * Read-only audit of keyword-tracker.json coverage across the MDG site.
 * For each cluster owner, verifies:
 *   - Page exists as a .astro file
 *   - FAQPage JSON-LD is present (if the page has an FAQ section)
 *   - Primary source citations are present (legislature.maine.gov, maine.gov/dafs/ocp, etc.)
 *   - Internal links to other cluster members exist
 *   - "Last reviewed" date is present and not stale (>90 days)
 *
 * Usage:
 *   node scripts/check/keyword-tracker-coverage.cjs
 *   node scripts/check/keyword-tracker-coverage.cjs --json   # machine-readable output
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..');
const PAGES_DIR = path.join(REPO, 'apps', 'maine-cannabis', 'src', 'pages');
const TRACKER_FILE = path.join(REPO, 'apps', 'maine-cannabis', 'src', 'data', 'keyword-tracker.json');

const PRIMARY_SOURCE_PATTERNS = [
  /legislature\.maine\.gov/,
  /maine\.gov\/dafs\/ocp/,
  /extension\.umaine\.edu/,
  /maine\.gov\/pfr/,
  /maine\.gov\/sos/,
];

const STALE_DAYS = 90;

function urlToFilePath(url) {
  let rel = url.replace(/^\//, '');
  if (rel === '') rel = 'index';
  return path.join(PAGES_DIR, rel + '.astro');
}

function extractFrontmatter(text) {
  const lines = text.split('\n');
  if (!lines[0].trim().startsWith('---')) return '';
  let closeLine = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith('---')) { closeLine = i; break; }
  }
  if (closeLine === -1) return text;
  return lines.slice(1, closeLine).join('\n');
}

function extractModifiedDate(fm) {
  const m = fm.match(/modifiedDate:\s*['"](\d{4}-\d{2}-\d{2})['"]/);
  return m ? m[1] : null;
}

function hasFaqSection(text) {
  return /<Faq\b|<details\s+data-faq|<section[^>]*class="[^"]*faq/i.test(text);
}

function hasFaqPageSchema(text) {
  // The Faq component auto-emits FAQPage JSON-LD at build time.
  // Check for Faq component usage in the source, which guarantees
  // FAQPage schema in the rendered output.
  return /<Faq\b/.test(text) || /FAQPage/.test(text);
}

function countPrimarySources(text) {
  let count = 0;
  for (const pattern of PRIMARY_SOURCE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

function extractInternalLinks(text) {
  const links = [];
  const re = /href="\/([^"]+)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    links.push('/' + m[1]);
  }
  return links;
}

function daysSince(dateStr) {
  const then = new Date(dateStr + 'T00:00:00Z');
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function auditCluster(cluster) {
  const results = [];
  const ownerUrls = Object.keys(cluster.owners || {});

  for (const url of ownerUrls) {
    const owner = cluster.owners[url];
    const filePath = urlToFilePath(url);
    const exists = fs.existsSync(filePath);

    const result = {
      url,
      type: owner.type,
      exists,
      faqSection: false,
      faqPageSchema: false,
      primarySourceCount: 0,
      internalLinksToCluster: [],
      missingInternalLinks: [],
      modifiedDate: null,
      daysSinceModified: null,
      isStale: false,
      issues: [],
    };

    if (!exists) {
      result.issues.push('PAGE_MISSING');
      results.push(result);
      continue;
    }

    const text = fs.readFileSync(filePath, 'utf8');
    const fm = extractFrontmatter(text);

    // FAQ checks
    result.faqSection = hasFaqSection(text);
    result.faqPageSchema = hasFaqPageSchema(text);
    if (result.faqSection && !result.faqPageSchema) {
      result.issues.push('FAQ_WITHOUT_SCHEMA');
    }

    // Primary source citations
    result.primarySourceCount = countPrimarySources(text);
    if (result.primarySourceCount === 0) {
      result.issues.push('NO_PRIMARY_SOURCES');
    }

    // Internal links to other cluster members
    const internalLinks = extractInternalLinks(text);
    for (const otherUrl of ownerUrls) {
      if (otherUrl === url) continue;
      if (internalLinks.includes(otherUrl)) {
        result.internalLinksToCluster.push(otherUrl);
      } else {
        result.missingInternalLinks.push(otherUrl);
      }
    }
    if (result.missingInternalLinks.length > 0 && ownerUrls.length > 1) {
      result.issues.push('MISSING_CLUSTER_CROSS_LINKS');
    }

    // Modified date / staleness
    result.modifiedDate = extractModifiedDate(fm);
    if (result.modifiedDate) {
      result.daysSinceModified = daysSince(result.modifiedDate);
      result.isStale = result.daysSinceModified > STALE_DAYS;
      if (result.isStale) {
        result.issues.push('STALE_MODIFIED_DATE');
      }
    } else {
      result.issues.push('NO_MODIFIED_DATE');
    }

    results.push(result);
  }

  return results;
}

function main() {
  const jsonMode = process.argv.includes('--json');

  if (!fs.existsSync(TRACKER_FILE)) {
    console.error(`keyword-tracker.json not found at ${TRACKER_FILE}`);
    process.exit(2);
  }

  const tracker = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
  const clusters = tracker.clusters || [];

  const report = {
    generatedAt: new Date().toISOString(),
    clusterCount: clusters.length,
    clusters: [],
    summary: {
      totalPages: 0,
      missingPages: 0,
      faqWithoutSchema: 0,
      noPrimarySources: 0,
      missingCrossLinks: 0,
      stalePages: 0,
      noModifiedDate: 0,
    },
  };

  for (const cluster of clusters) {
    const results = auditCluster(cluster);
    report.clusters.push({
      id: cluster.id,
      label: cluster.label,
      ownerCount: Object.keys(cluster.owners || {}).length,
      results,
    });

    for (const r of results) {
      report.summary.totalPages++;
      if (r.issues.includes('PAGE_MISSING')) report.summary.missingPages++;
      if (r.issues.includes('FAQ_WITHOUT_SCHEMA')) report.summary.faqWithoutSchema++;
      if (r.issues.includes('NO_PRIMARY_SOURCES')) report.summary.noPrimarySources++;
      if (r.issues.includes('MISSING_CLUSTER_CROSS_LINKS')) report.summary.missingCrossLinks++;
      if (r.issues.includes('STALE_MODIFIED_DATE')) report.summary.stalePages++;
      if (r.issues.includes('NO_MODIFIED_DATE')) report.summary.noModifiedDate++;
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Human-readable output
  console.log('=== Keyword Tracker Coverage Audit ===');
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Clusters: ${report.clusterCount}`);
  console.log('');

  for (const c of report.clusters) {
    console.log(`--- Cluster: ${c.label} (${c.id}) ---`);
    console.log(`Owners: ${c.ownerCount}`);
    for (const r of c.results) {
      const status = r.issues.length === 0 ? 'OK' : r.issues.join(', ');
      console.log(`  ${r.url}`);
      console.log(`    type: ${r.type}`);
      console.log(`    exists: ${r.exists}`);
      console.log(`    faqSection: ${r.faqSection}, faqPageSchema: ${r.faqPageSchema}`);
      console.log(`    primarySources: ${r.primarySourceCount}`);
      console.log(`    crossLinks: ${r.internalLinksToCluster.length}/${c.ownerCount - 1}`);
      console.log(`    modified: ${r.modifiedDate || 'N/A'} (${r.daysSinceModified !== null ? r.daysSinceModified + 'd ago' : 'unknown'})`);
      console.log(`    status: ${status}`);
    }
    console.log('');
  }

  console.log('=== Summary ===');
  console.log(`Total pages audited: ${report.summary.totalPages}`);
  console.log(`Missing pages: ${report.summary.missingPages}`);
  console.log(`FAQ without schema: ${report.summary.faqWithoutSchema}`);
  console.log(`No primary sources: ${report.summary.noPrimarySources}`);
  console.log(`Missing cross-links: ${report.summary.missingCrossLinks}`);
  console.log(`Stale (>90d): ${report.summary.stalePages}`);
  console.log(`No modified date: ${report.summary.noModifiedDate}`);
}

if (require.main === module) {
  main();
}

module.exports = { auditCluster, urlToFilePath };