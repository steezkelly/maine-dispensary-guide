'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { buildDataset } = require('../refresh-maine-municipal-authorization.cjs');

function geoRows() {
  const rows = [];
  for (let index = 1; index <= 23; index += 1) rows.push({ COMMONNAME: `City ${String(index).padStart(3, '0')}`, COUNTY: 'Alpha', STATUS: 'C' });
  for (let index = 1; index <= 431; index += 1) rows.push({ COMMONNAME: `Town ${String(index).padStart(3, '0')}`, COUNTY: 'Bravo', STATUS: 'T' });
  for (let index = 1; index <= 31; index += 1) rows.push({ COMMONNAME: `Plantation ${String(index).padStart(3, '0')}`, COUNTY: 'Charlie', STATUS: 'P' });
  return rows;
}

test('buildDataset covers all incorporated municipalities and retains OCP activity authorization', () => {
  const dataset = buildDataset({
    geoRows: geoRows(),
    ocpRows: [{ Municipality: 'Town 002', Retail: 'Y', Growing: 'N', Manufacturing: 'Y', Testing: 'N', UpdateDate: '2026-07-09T20:34:15.803Z' }],
    retrievedAt: '2026-07-17T12:00:00.000Z',
    modelRefreshTime: '2026-07-09T20:34:15.803',
  });

  assert.equal(dataset.meta.municipality_count, 485);
  assert.deepEqual(dataset.meta.municipality_type_counts, { city: 23, town: 431, plantation: 31 });
  assert.equal(dataset.municipalities.find((row) => row.name === 'Town 002').retail, 'Y');
  assert.equal(dataset.municipalities.find((row) => row.name === 'Town 002').manufacturing, 'Y');
  assert.deepEqual(dataset.municipalities.map((row) => row.name), [...dataset.municipalities.map((row) => row.name)].sort((left, right) => left.localeCompare(right, 'en')));
});

test('buildDataset does not infer an explicit opt-out when OCP has no retail record', () => {
  const dataset = buildDataset({
    geoRows: geoRows(),
    ocpRows: [],
    retrievedAt: '2026-07-17T12:00:00.000Z',
    modelRefreshTime: '2026-07-09T20:34:15.803',
  });

  const municipality = dataset.municipalities.find((row) => row.name === 'Town 001');
  assert.equal(municipality.status, 'no_recorded_retail_authorization');
  assert.deepEqual(
    { retail: municipality.retail, cultivation: municipality.cultivation, manufacturing: municipality.manufacturing, testing: municipality.testing },
    { retail: 'unknown', cultivation: 'unknown', manufacturing: 'unknown', testing: 'unknown' },
  );
  assert.equal(dataset.meta.status_counts.explicit_opt_out, 0);
});

test('buildDataset fails closed for an unknown OCP municipality or missing OCP refresh metadata', () => {
  assert.throws(() => buildDataset({
    geoRows: geoRows(),
    ocpRows: [{ Municipality: 'Unknown Municipality', Retail: 'Y', Growing: 'N', Manufacturing: 'N', Testing: 'N' }],
    retrievedAt: '2026-07-17T12:00:00.000Z',
    modelRefreshTime: '2026-07-09T20:34:15.803',
  }), /unmatched OCP municipality/i);

  assert.throws(() => buildDataset({
    geoRows: geoRows(),
    ocpRows: [],
    retrievedAt: '2026-07-17T12:00:00.000Z',
    modelRefreshTime: null,
  }), /OCP model refresh timestamp/i);
});

test('buildDataset records known unincorporated OCP jurisdictions outside the incorporated scope', () => {
  const dataset = buildDataset({
    geoRows: geoRows(),
    ocpRows: [{ Municipality: 'Twp 6', Retail: 'Y', Growing: 'Y', Manufacturing: 'Y', Testing: 'Y' }],
    retrievedAt: '2026-07-17T12:00:00.000Z',
    modelRefreshTime: '2026-07-09T20:34:15.803',
  });
  assert.deepEqual(dataset.meta.ocp_jurisdictions_excluded_from_incorporated_scope, ['Twp 6']);
  assert.equal(dataset.meta.status_counts.retail_authorized, 0);
});
