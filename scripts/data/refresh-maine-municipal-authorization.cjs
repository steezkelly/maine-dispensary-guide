'use strict';

const fs = require('node:fs');
const https = require('node:https');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const OCP_PAGE_URL = 'https://www.maine.gov/dafs/ocp/open-data/adult-use/opt-in-communities';
const GEO_QUERY_URL = 'https://services1.arcgis.com/RbMX0mRVOFNTdLzd/arcgis/rest/services/Maine_Town_and_Townships_Boundary_Polygons/FeatureServer/1/query?where=1%3D1&outFields=COMMONNAME%2CCOUNTY%2CSTATUS&returnGeometry=false&f=json&resultRecordCount=5000';
const OCP_FIELDS = ['ID', 'Municipality', 'Retail', 'Growing', 'Manufacturing', 'Testing', 'UpdateDate', 'Latitude', 'Longitude'];
const TYPE_BY_STATUS = { C: 'city', T: 'town', P: 'plantation' };
// OCP includes these unorganized jurisdictions, which are outside the incorporated 485-municipality scope and absent from the GeoLibrary municipality layer.
const KNOWN_UNINCORPORATED_OCP_JURISDICTIONS = new Set([
  'Alder Stream (No.2, R.5)', 'Beattie (No.2, R.8)', 'Chain of Ponds (No.2, R.6)', 'Davis (No.3, R.3)',
  'Gorham Gore (No.1, R.9)', 'Jim Pond (No.1, R.5)', 'Kibby (No.1, R.6)', 'Massachusetts Gore (No.3, R.6)',
  'Mt. Abram (No.4, R.1 B.K.P., W.K.P.)', 'No.2, R.7 W.B.K.P.', 'Seven Ponds (No.3, R.5)',
  'Skinner (No.1, R.7)', 'Stetsontown (No.3, R.4)', 'Tim Pond (No.2, R.4)', 'Twp 6', 'Wyman (No.3, R.4 B.K.P., W.K.P)',
].map(normalizeName));

function request(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const requestHeaders = { 'user-agent': 'MDG municipal authorization refresh/1.0', accept: 'application/json, text/html;q=0.9', ...headers };
    const req = https.request(url, { method, headers: requestHeaders }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        let payload = Buffer.concat(chunks);
        if (res.headers['content-encoding'] === 'gzip') payload = zlib.gunzipSync(payload);
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`${method} ${url} returned HTTP ${res.statusCode}`));
        resolve(payload.toString('utf8'));
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function normalizeName(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/plantation/g, 'plt')
    .replace(/township/g, 'twp')
    .replace(/[^a-z0-9]/g, '');
}

function decodePowerBiRows(response) {
  const dataSet = response.results?.[0]?.result?.data?.dsr?.DS?.[0];
  const rowSet = dataSet?.PH?.[0]?.DM0;
  if (!dataSet || !Array.isArray(rowSet)) throw new Error('OCP Power BI response did not contain tblMunicipality rows');
  const dictionaries = dataSet.ValueDicts || {};
  const schema = rowSet[0]?.S || [];
  const dictionaryByIndex = schema.map((column) => column.DN);
  const previous = Array(OCP_FIELDS.length).fill(null);

  return rowSet.map((encoded) => {
    const values = [];
    const cells = encoded.C || [];
    let cellIndex = 0;
    const repeatMask = encoded.R || 0;
    for (let index = 0; index < OCP_FIELDS.length; index += 1) {
      let value;
      if (Math.floor(repeatMask / (2 ** index)) % 2 === 1) {
        value = previous[index];
      } else {
        value = cells[cellIndex] ?? null;
        cellIndex += 1;
        const dictionary = dictionaries[dictionaryByIndex[index]];
        if (dictionary && Number.isInteger(value)) value = dictionary[value];
      }
      values.push(value);
    }
    previous.splice(0, previous.length, ...values);
    return Object.fromEntries(OCP_FIELDS.map((field, index) => [field, values[index]]));
  });
}

async function fetchOcpRows() {
  const page = await request(OCP_PAGE_URL, { headers: { accept: 'text/html' } });
  const iframe = page.match(/<iframe[^>]+src="([^"]+)"/i)?.[1]?.replaceAll('&amp;', '&');
  if (!iframe) throw new Error('OCP page did not expose its public Power BI report');
  const encodedDescriptor = new URL(iframe).searchParams.get('r');
  if (!encodedDescriptor) throw new Error('OCP Power BI report did not expose a public descriptor');
  const resourceKey = JSON.parse(Buffer.from(encodedDescriptor, 'base64url').toString('utf8')).k;
  if (!resourceKey) throw new Error('OCP Power BI resource descriptor had no public key');

  const embed = await request(iframe, { headers: { accept: 'text/html' } });
  const redirectCluster = embed.match(/resolvedClusterUri = '([^']+)'/)?.[1];
  if (!redirectCluster) throw new Error('OCP Power BI report did not expose its Government-cloud cluster');
  const api = redirectCluster.replace('-redirect.', '-api.').replace(/\/$/, '');
  const requestId = crypto.randomUUID();
  const commonHeaders = { 'X-PowerBI-ResourceKey': resourceKey, ActivityId: crypto.randomUUID(), RequestId: requestId };
  const models = JSON.parse(await request(`${api}/public/reports/${resourceKey}/modelsAndExploration?preferReadOnlySession=true`, { headers: commonHeaders }));
  const model = models.models?.[0];
  if (!model?.id) throw new Error('OCP Power BI report did not expose a query model');

  const select = OCP_FIELDS.map((field) => ({ Column: { Expression: { SourceRef: { Source: 't' } }, Property: field }, Name: `t.${field}` }));
  const query = {
    version: '1.0.0',
    queries: [{ Query: { Commands: [{ SemanticQueryDataShapeCommand: {
      Query: { Version: 2, From: [{ Name: 't', Entity: 'tblMunicipality', Type: 0 }], Select: select },
      Binding: { DataReduction: { DataVolume: 6, Primary: { Window: { Count: 1000 } } }, Primary: { Groupings: [{ Projections: OCP_FIELDS.map((_, index) => index), Subtotal: 1 }] }, Version: 1 },
      ExecutionMetricsKind: 1,
    } }] } }],
    cancelQueries: [],
    modelId: model.id,
  };
  const response = JSON.parse(await request(`${api}/public/reports/querydata?synchronous=true`, {
    method: 'POST',
    headers: { ...commonHeaders, 'content-type': 'application/json' },
    body: JSON.stringify(query),
  }));
  return { rows: decodePowerBiRows(response), modelRefreshTime: model.LastRefreshTime || model.lastRefreshTime || null };
}

async function fetchGeoRows() {
  const response = JSON.parse(await request(GEO_QUERY_URL));
  if (!Array.isArray(response.features)) throw new Error('Maine GeoLibrary response did not contain municipality features');
  return response.features.map((feature) => feature.attributes);
}

function buildDataset({ geoRows, ocpRows, retrievedAt, modelRefreshTime = null }) {
  if (typeof modelRefreshTime !== 'string' || !modelRefreshTime.trim()) throw new Error('OCP model refresh timestamp is required');
  if (typeof retrievedAt !== 'string' || !retrievedAt.trim()) throw new Error('dataset retrieval timestamp is required');

  const allGeoByName = new Map(geoRows.map((row) => [normalizeName(row.COMMONNAME), row]));
  const municipalities = geoRows
    .filter((row) => TYPE_BY_STATUS[row.STATUS])
    .map((row) => ({ name: row.COMMONNAME.trim(), county: row.COUNTY.trim(), municipality_type: TYPE_BY_STATUS[row.STATUS] }))
    .sort((left, right) => left.name.localeCompare(right.name, 'en'));
  const byName = new Map(municipalities.map((row) => [normalizeName(row.name), row]));
  const authorizationByName = new Map();
  const excludedOcpJurisdictions = new Set();

  for (const row of ocpRows) {
    const normalizedName = normalizeName(row.Municipality);
    const geoRow = allGeoByName.get(normalizedName);
    if (!geoRow) {
      if (!KNOWN_UNINCORPORATED_OCP_JURISDICTIONS.has(normalizedName)) throw new Error(`unmatched OCP municipality: ${row.Municipality}`);
      excludedOcpJurisdictions.add(row.Municipality);
      continue;
    }
    if (!TYPE_BY_STATUS[geoRow.STATUS]) {
      excludedOcpJurisdictions.add(geoRow.COMMONNAME.trim());
      continue;
    }
    if (![row.Retail, row.Growing, row.Manufacturing, row.Testing].every((value) => value === 'Y' || value === 'N')) {
      throw new Error(`OCP authorization flags must be Y or N for ${row.Municipality}`);
    }
    const municipality = byName.get(normalizedName);
    if (!municipality) throw new Error(`incorporated OCP municipality did not reconcile: ${row.Municipality}`);
    const prior = authorizationByName.get(municipality.name) || { retail: 'N', cultivation: 'N', manufacturing: 'N', testing: 'N' };
    authorizationByName.set(municipality.name, {
      retail: row.Retail === 'Y' || prior.retail === 'Y' ? 'Y' : 'N',
      cultivation: row.Growing === 'Y' || prior.cultivation === 'Y' ? 'Y' : 'N',
      manufacturing: row.Manufacturing === 'Y' || prior.manufacturing === 'Y' ? 'Y' : 'N',
      testing: row.Testing === 'Y' || prior.testing === 'Y' ? 'Y' : 'N',
    });
  }

  const rows = municipalities.map((municipality) => {
    const authorization = authorizationByName.get(municipality.name) || { retail: 'N', cultivation: 'N', manufacturing: 'N', testing: 'N' };
    return {
      ...municipality,
      ...authorization,
      status: authorization.retail === 'Y' ? 'retail_authorized' : 'no_recorded_retail_authorization',
    };
  });
  const municipalityTypeCounts = Object.fromEntries(['city', 'town', 'plantation'].map((type) => [type, rows.filter((row) => row.municipality_type === type).length]));
  const statusCounts = Object.fromEntries(['retail_authorized', 'explicit_opt_out', 'no_recorded_retail_authorization'].map((status) => [status, rows.filter((row) => row.status === status).length]));
  const dataset = {
    meta: {
      source_url: OCP_PAGE_URL,
      geography_source_url: GEO_QUERY_URL.replace(/\?.*$/, ''),
      ocp_model_refreshed_at: modelRefreshTime,
      retrieved_at: retrievedAt,
      municipality_count: rows.length,
      municipality_type_counts: municipalityTypeCounts,
      status_counts: statusCounts,
      ocp_jurisdictions_excluded_from_incorporated_scope: [...excludedOcpJurisdictions].sort((left, right) => left.localeCompare(right, 'en')),
      methodology: 'OCP Y/N fields record municipal authorization by activity. Absence of OCP-recorded retail authorization is not an explicit opt-out.',
    },
    municipalities: rows,
  };
  validateDataset(dataset);
  return dataset;
}

function validateDataset(dataset) {
  const { municipality_count: count, municipality_type_counts: types } = dataset.meta;
  if (count !== 485 || types.city !== 23 || types.town !== 431 || types.plantation !== 31) throw new Error(`expected 485 incorporated municipalities (23 cities, 431 towns, 31 plantations); received ${count}`);
  if (dataset.municipalities.some((row) => row.status === 'explicit_opt_out')) throw new Error('explicit opt-outs require separately maintained primary-source evidence');
}

function parseOutputPath(args) {
  const outputIndex = args.indexOf('--output');
  if (outputIndex === -1 || !args[outputIndex + 1]) throw new Error('usage: refresh-maine-municipal-authorization.cjs --output <path>');
  return args[outputIndex + 1];
}

async function main() {
  const output = parseOutputPath(process.argv.slice(2));
  const [geoRows, ocp] = await Promise.all([fetchGeoRows(), fetchOcpRows()]);
  const dataset = buildDataset({ geoRows, ocpRows: ocp.rows, retrievedAt: new Date().toISOString(), modelRefreshTime: ocp.modelRefreshTime });
  fs.mkdirSync(require('node:path').dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(dataset, null, 2)}\n`);
  console.log(`wrote ${dataset.meta.municipality_count} municipalities to ${output}`);
}

if (require.main === module) main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });

module.exports = { buildDataset, decodePowerBiRows, fetchGeoRows, fetchOcpRows, normalizeName, validateDataset };
