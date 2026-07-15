const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');

const MARKET_STATS = resolve(__dirname, '..', 'market-stats.astro');

function marketStatsVideo() {
  const source = readFileSync(MARKET_STATS, 'utf8');
  const video = source.match(/<video\b[\s\S]*?<\/video>/)?.[0];
  assert.ok(video, 'market-stats should retain its explainer video');
  return video;
}

test('market-stats explainer waits for an explicit user play action', () => {
  const video = marketStatsVideo();

  assert.doesNotMatch(video, /\bautoplay\b/, 'the explainer must not start automatically');
  assert.match(video, /\bcontrols\b/, 'visitors need a visible way to start playback');
});
