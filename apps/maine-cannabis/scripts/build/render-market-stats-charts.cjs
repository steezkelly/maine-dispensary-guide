'use strict';

/**
 * apps/maine-cannabis/scripts/build/render-market-stats-charts.cjs
 *
 * Node-native renderer that loads the §8.1 chart-source JSON and emits
 * one inline-SVG file per chart. The page then renders the same SVG
 * by importing the file as a string. No external SVG / PNG / D3 / chart
 * library is used.
 *
 * The renderer validates each chart against a small contract:
 *   - every chart has a stable id
 *   - bar / horizontal_bar / stacked_bar / tier_list charts all carry the
 *     required shape
 *   - numeric values are finite and non-negative
 *   - the kind string maps to a renderer function
 *
 * Output paths are absolute, inside the repo's public/ tree. The chart
 * data is the same payload used by the chart components; one source of
 * truth, two consumers.
 *
 * Run with: node apps/maine-cannabis/scripts/build/render-market-stats-charts.cjs
 */

const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { resolve, dirname } = require('node:path');

const REPO = resolve(__dirname, '..', '..');
const DATA = resolve(REPO, 'src/data/market-stats/chart-sources.json');
const OUT_DIR = resolve(REPO, 'public/images/charts/market-stats');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

// --- Renderers ----------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';

function escapeText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function scaleForBar(values, width, padding) {
  const max = Math.max.apply(null, values);
  if (max <= 0) return () => 0;
  const usable = width - padding * 2;
  return (v) => padding + (v / max) * usable;
}

function renderBar(chart) {
  // Horizontal bars because the page column is narrow; vertical bars would
  // be unreadable at 600px width. Each row gets a label, a bar, and a
  // numeric value. The bar kind drives fill color.
  const padding = 16;
  const rowH = 36;
  const gap = 8;
  const labelW = 220;
  const valueW = 64;
  const barAreaW = 360;
  const width = padding * 2 + labelW + barAreaW + valueW;
  const height = padding * 2 + chart.data.length * (rowH + gap);
  const values = chart.data.map((d) => Number(d.value));
  const scale = scaleForBar(values, barAreaW, 0);
  const yFor = (i) => padding + i * (rowH + gap);

  const fillFor = (kind) => {
    if (kind === 'maine') return '#1F4D3A';
    if (kind === 'peak')  return '#8C5A3A';
    if (kind === 'low' || kind === 'national_equiv' || kind === 'baseline') return '#3D5A40';
    if (kind === 'high' || kind === 'under_count' || kind === 'national_single' || kind === 'excess_280e') return '#B85C3A';
    return '#3D5A40';
  };

  const rows = chart.data.map((d, i) => {
    const y = yFor(i);
    const barW = scale(Number(d.value));
    const fill = fillFor(d.kind);
    return [
      `<text x="${padding}" y="${y + rowH * 0.65}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" fill="#0E1A14">${escapeText(d.label)}</text>`,
      `<rect x="${padding + labelW}" y="${y + 4}" width="${barW.toFixed(1)}" height="${rowH - 8}" rx="2" fill="${fill}"/>`,
      `<text x="${padding + labelW + barAreaW + 8}" y="${y + rowH * 0.65}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" fill="#0E1A14" text-anchor="start">${escapeText(d.value.toLocaleString('en-US'))}</text>`,
    ].join('');
  }).join('');

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="${SVG_NS}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title-${chart.id} chart-caption-${chart.id}">`,
    `<title id="chart-title-${chart.id}">${escapeText(chart.title)}</title>`,
    `<desc id="chart-caption-${chart.id}">${escapeText(chart.caption)}</desc>`,
    rows,
    `</svg>`,
  ].join('');
}

function renderStackedBar(chart) {
  const padding = 16;
  const rowH = 56;
  const labelW = 220;
  const barW = 520;
  const valueW = 80;
  const width = padding * 2 + labelW + barW + valueW;
  const height = padding * 2 + rowH;
  const values = chart.data.map((d) => Number(d.value));
  const total = values.reduce((a, b) => a + b, 0);
  let xCursor = padding + labelW;
  const fillFor = (kind) => {
    if (kind === 'baseline') return '#3D5A40';
    if (kind === 'excess_280e') return '#8C5A3A';
    return '#3D5A40';
  };
  const segments = chart.data.map((d) => {
    const w = (Number(d.value) / total) * barW;
    const x = xCursor;
    const segment = `<rect x="${x.toFixed(1)}" y="${padding + 8}" width="${w.toFixed(1)}" height="${rowH - 16}" fill="${fillFor(d.kind)}"><title>${escapeText(d.label)}: $${d.value}B</title></rect>`;
    xCursor += w;
    return segment;
  }).join('');
  const labels = chart.data.map((d, i) => {
    const offset = values.slice(0, i).reduce((a, b) => a + b, 0) / total * barW;
    const mid = padding + labelW + offset + (Number(d.value) / total * barW) / 2;
    return `<text x="${mid.toFixed(1)}" y="${padding + rowH - 12}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" font-weight="600" fill="#F2F2E2" text-anchor="middle">$${d.value}B</text>`;
  }).join('');

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="${SVG_NS}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title-${chart.id} chart-caption-${chart.id}">`,
    `<title id="chart-title-${chart.id}">${escapeText(chart.title)}</title>`,
    `<desc id="chart-caption-${chart.id}">${escapeText(chart.caption)}</desc>`,
    `<text x="${padding}" y="${padding + 28}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" font-weight="600" fill="#0E1A14">$27B total federal tax since 2018</text>`,
    segments,
    labels,
    `</svg>`,
  ].join('');
}

function renderHorizontalBar(chart) {
  const padding = 16;
  const rowH = 32;
  const gap = 4;
  const labelW = 200;
  const valueW = 60;
  const barAreaW = 360;
  const width = padding * 2 + labelW + barAreaW + valueW;
  const height = padding * 2 + chart.data.length * (rowH + gap);
  const values = chart.data.map((d) => Number(d.value));
  const scale = scaleForBar(values, barAreaW, 0);
  const yFor = (i) => padding + i * (rowH + gap);
  const fillFor = (kind) => {
    if (kind === 'maine') return '#1F4D3A';
    if (kind === 'low') return '#3D5A40';
    if (kind === 'high') return '#8C5A3A';
    return '#3D5A40';
  };
  const rows = chart.data.map((d, i) => {
    const y = yFor(i);
    const barW = scale(Number(d.value));
    const fill = fillFor(d.kind);
    return [
      `<text x="${padding}" y="${y + rowH * 0.65}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" fill="#0E1A14">${escapeText(d.label)}</text>`,
      `<rect x="${padding + labelW}" y="${y + 4}" width="${barW.toFixed(1)}" height="${rowH - 8}" rx="2" fill="${fill}"/>`,
      `<text x="${padding + labelW + barAreaW + 8}" y="${y + rowH * 0.65}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" fill="#0E1A14">${Number(d.value).toFixed(1)}%</text>`,
    ].join('');
  }).join('');

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="${SVG_NS}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title-${chart.id} chart-caption-${chart.id}">`,
    `<title id="chart-title-${chart.id}">${escapeText(chart.title)}</title>`,
    `<desc id="chart-caption-${chart.id}">${escapeText(chart.caption)}</desc>`,
    rows,
    `</svg>`,
  ].join('');
}

function renderTierList(chart) {
  const padding = 16;
  const rowH = 84;
  const gap = 12;
  const width = 720;
  const height = padding * 2 + chart.tiers.length * rowH + (chart.tiers.length - 1) * gap;
  const fillFor = (kind) => {
    if (kind === 'schedule_iii') return '#1F4D3A';
    if (kind === 'schedule_i')  return '#8C5A3A';
    if (kind === 'hemp_pending') return '#B85C3A';
    return '#3D5A40';
  };
  const textForFill = (kind) => {
    if (kind === 'hemp_pending') return '#F2F2E2';
    return '#F2F2E2';
  };
  const rows = chart.tiers.map((t, i) => {
    const y = padding + i * (rowH + gap);
    const fill = fillFor(t.kind);
    const fg = textForFill(t.kind);
    return [
      `<rect x="${padding}" y="${y}" width="${width - padding * 2}" height="${rowH}" rx="6" fill="${fill}"/>`,
      `<text x="${padding + 16}" y="${y + 26}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="16" font-weight="700" fill="${fg}">${escapeText(t.label)}</text>`,
      `<text x="${padding + 16}" y="${y + 46}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" font-weight="600" fill="${fg}" opacity="0.85">${escapeText(t.status)}</text>`,
      `<text x="${padding + 16}" y="${y + 66}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" fill="${fg}" opacity="0.9">${escapeText(t.covers)}</text>`,
    ].join('');
  }).join('');

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="${SVG_NS}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title-${chart.id} chart-caption-${chart.id}">`,
    `<title id="chart-title-${chart.id}">${escapeText(chart.title)}</title>`,
    `<desc id="chart-caption-${chart.id}">${escapeText(chart.caption)}</desc>`,
    rows,
    `</svg>`,
  ].join('');
}

const RENDERERS = {
  bar: renderBar,
  stacked_bar: renderStackedBar,
  horizontal_bar: renderHorizontalBar,
  tier_list: renderTierList,
};

function validateChart(chart, index) {
  assert.equal(typeof chart.id, 'string', `chart #${index} id must be a string`);
  assert.ok(/^[a-z0-9-]+$/.test(chart.id), `chart #${index} id must be kebab-case`);
  assert.equal(typeof chart.title, 'string', `chart #${index} title must be a string`);
  assert.equal(typeof chart.source, 'string', `chart #${index} source must be a string`);
  assert.equal(typeof chart.caption, 'string', `chart #${index} caption must be a string`);
  assert.equal(typeof chart.observation_period, 'string', `chart #${index} observation_period must be a string`);
  assert.equal(typeof chart.kind, 'string', `chart #${index} kind must be a string`);
  assert.ok(RENDERERS[chart.kind], `chart #${index} (${chart.id}) has unknown kind "${chart.kind}"`);
  if (chart.kind === 'tier_list') {
    assert.ok(Array.isArray(chart.tiers) && chart.tiers.length >= 2,
      `chart #${index} (${chart.id}) tier_list must have >= 2 tiers`);
    chart.tiers.forEach((t, j) => {
      assert.equal(typeof t.label, 'string', `chart #${index} tier #${j} label must be a string`);
      assert.equal(typeof t.status, 'string', `chart #${index} tier #${j} status must be a string`);
      assert.equal(typeof t.covers, 'string', `chart #${index} tier #${j} covers must be a string`);
    });
  } else {
    assert.ok(Array.isArray(chart.data) && chart.data.length >= 2,
      `chart #${index} (${chart.id}) must have >= 2 data points`);
    chart.data.forEach((d, j) => {
      assert.equal(typeof d.label, 'string', `chart #${index} data #${j} label must be a string`);
      const v = Number(d.value);
      assert.ok(Number.isFinite(v) && v >= 0, `chart #${index} data #${j} value must be a finite non-negative number, got ${d.value}`);
    });
  }
}

function fileNameForId(id) {
  return `${id}.svg`;
}

function main() {
  const data = readJson(DATA);
  assert.ok(Array.isArray(data.charts), 'market-stats-chart-sources.json must contain a charts array');
  data.charts.forEach(validateChart);
  ensureDir(OUT_DIR);
  const written = data.charts.map((chart) => {
    const renderer = RENDERERS[chart.kind];
    const svg = renderer(chart);
    const path = resolve(OUT_DIR, fileNameForId(chart.id));
    writeFileSync(path, svg);
    return { id: chart.id, path };
  });
  return { charts: written, dir: OUT_DIR };
}

if (require.main === module) {
  const result = main();
  process.stderr.write(`render-market-stats-charts.cjs: wrote ${result.charts.length} SVGs to ${result.dir}\n`);
  result.charts.forEach((c) => process.stderr.write(`  - ${c.id}\n`));
}

module.exports = { main, RENDERERS, validateChart, renderBar, renderStackedBar, renderHorizontalBar, renderTierList };
