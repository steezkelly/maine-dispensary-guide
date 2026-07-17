#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const manifestPath = process.env.ANSWER_ENGINE_BENCHMARK_MANIFEST_PATH
  ? path.resolve(process.env.ANSWER_ENGINE_BENCHMARK_MANIFEST_PATH)
  : path.resolve(__dirname, '../../docs/analytics/answer-engine-benchmark-manifest.v1.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const expectedIntents = new Set([
  'consumer local discovery',
  'operator compliance',
  'licensing',
  'market data',
  'source-backed factual questions',
]);

function fail(message) {
  throw new Error(`answer-engine benchmark manifest: ${message}`);
}

if (manifest.manifestVersion !== '1.0.0') fail('manifestVersion must be 1.0.0');
if (manifest.scope?.geography !== 'Maine only') fail('scope must remain Maine only');
if (!Array.isArray(manifest.benchmarkQueries) || manifest.benchmarkQueries.length < 9) fail('requires at least 9 active benchmark queries');

const seenIds = new Set();
const seenIntents = new Set();
for (const entry of manifest.benchmarkQueries) {
  if (!entry.id || seenIds.has(entry.id)) fail(`query id must be unique: ${entry.id}`);
  seenIds.add(entry.id);
  if (!expectedIntents.has(entry.intent)) fail(`unexpected intent: ${entry.intent}`);
  seenIntents.add(entry.intent);
  if (!/^https:\/\/mainedispensaryguide\.com\/(?!.*\/$)/.test(entry.canonicalMdgUrl)) fail(`${entry.id} needs a slashless canonical MDG URL`);
  if (!Array.isArray(entry.requiredFactualClaims) || entry.requiredFactualClaims.length === 0) fail(`${entry.id} needs required factual claims`);
  for (const claim of entry.requiredFactualClaims) {
    if (!claim.claim || !Array.isArray(claim.primarySourceReferences) || claim.primarySourceReferences.length === 0) fail(`${entry.id} claim needs a primary source reference`);
    if (claim.primarySourceReferences.some((reference) => !/^https:\/\/(www\.)?maine\.gov\//.test(reference) && !/^https:\/\/www\.metrc\.com\/partner\/maine\/$/.test(reference))) {
      fail(`${entry.id} has a non-primary-source reference`);
    }
  }
  if (!entry.queryOwner || !/^\d{4}-\d{2}-\d{2}$/.test(entry.reviewDate)) fail(`${entry.id} needs owner and ISO review date`);
}
for (const intent of expectedIntents) if (!seenIntents.has(intent)) fail(`missing intent group: ${intent}`);

const activeRetailStores = manifest.benchmarkQueries.find((entry) => entry.id === 'market-retail-stores');
const deferredRetailStores = manifest.deferredQueries?.find((entry) => entry.id === 'market-retail-stores');
if (activeRetailStores && deferredRetailStores) fail('market-retail-stores cannot be both active and deferred');
const retailStatsPath = process.env.ANSWER_ENGINE_RETAIL_STATS_PATH
  ? path.resolve(process.env.ANSWER_ENGINE_RETAIL_STATS_PATH)
  : path.resolve(__dirname, '../../apps/maine-cannabis/src/data/site-stats.json');
const retailStats = JSON.parse(fs.readFileSync(retailStatsPath, 'utf8'));
if (activeRetailStores) {
  if (retailStats.activeAdultUseRetailStores !== activeRetailStores.requiredAnswer?.value) {
    fail('market-retail-stores must remain deferred while its canonical page disagrees with the source-reviewed answer');
  }
} else {
  if (!deferredRetailStores || deferredRetailStores.status !== 'deferred') fail('market-retail-stores needs a deferred query record');
  if (deferredRetailStores.canonicalMdgUrl !== 'https://mainedispensaryguide.com/market-stats') fail('deferred market-retail-stores needs the market-stats canonical URL');
  if (!deferredRetailStores.reason || !deferredRetailStores.resumeCondition) fail('deferred market-retail-stores needs a reason and resume condition');
  if (!Array.isArray(deferredRetailStores.requiredAnswer?.primarySourceReferences) || deferredRetailStores.requiredAnswer.primarySourceReferences.length === 0) {
    fail('deferred market-retail-stores needs primary-source provenance');
  }

  const renderedValue = deferredRetailStores.canonicalPageObservation?.renderedValue;
  if (deferredRetailStores.canonicalPageObservation?.sourcePath !== 'apps/maine-cannabis/src/data/site-stats.json'
    || deferredRetailStores.canonicalPageObservation?.sourceField !== 'activeAdultUseRetailStores'
    || retailStats.activeAdultUseRetailStores !== renderedValue) {
    fail('deferred market-retail-stores needs provenance for the value currently rendered by its canonical page');
  }
  if (renderedValue === deferredRetailStores.requiredAnswer?.value) fail('market-retail-stores must be active when its canonical page and required answer agree');
}

if (!manifest.observationRecord?.requiredFields?.includes('evidenceReference')) fail('observation record needs evidenceReference');
if (!manifest.crawlerDiscoverabilityRecord?.rule?.includes('never an answer-inclusion result')) fail('crawler checks must remain separate');
if (!manifest.ga4ReferralReport?.interpretation?.some((rule) => rule.includes('market share'))) fail('GA4 market-share caveat is required');

console.log(`PASS: ${manifest.benchmarkQueries.length} Maine-only benchmark queries across ${seenIntents.size} intent groups.`);
