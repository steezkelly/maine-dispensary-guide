#!/usr/bin/env node
'use strict';

/**
 * Safe W13/W14 n8n provisioner.
 *
 * - Keeps fetched workflow JSON and credential references in memory only.
 * - Prints only workflow IDs, active/version state, settings, node names/types,
 *   and SHA-256 hashes.
 * - Refuses an unknown W13 normalization or Insert Lead contract.
 * - Creates/updates W14 inactive; activation is intentionally unsupported.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const W13_ID = 'UdQ56USYaWRcfocT';
const W13_NORMALIZE_CURRENT_SHA256 = '7e2484c9db7e412ebb688d5fb72c795fc0619c33c5e7464f421b7722603b44f1';
const W13_INSERT_QUERY_CURRENT_SHA256 = '263aa31835bb5e9e746b2310f91c076e19473a119a91d584f5776013788dbb78';
const W13_INSERT_REPLACEMENT_CURRENT_SHA256 = '908f07c3977bafc2ace9daae61b58f4fec2c7d176793956bbd106bca96bb02af';
const W14_NAME = 'W14: Durable Lead Asset Fulfillment';
const LOCAL_PORT = Number(process.env.W14_N8N_TUNNEL_PORT || 15683);
const API_BASE = `http://127.0.0.1:${LOCAL_PORT}/api/v1`;

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function privacySettings(existing = {}) {
  return {
    ...existing,
    executionOrder: 'v1',
    saveExecutionProgress: false,
    saveDataSuccessExecution: 'none',
    saveDataErrorExecution: 'none',
    saveManualExecutions: false,
  };
}

function buildNormalizeCode() {
  return `// W13 + W14: validate intake and derive stable asset identity only from
// an exact server-observed page_path. Client-provided asset IDs are ignored.
//
// TRUST BOUNDARY: page_path arrives in the POST body and is client-supplied.
// The frozen routeContract below is the sole authority for asset mapping.
// Unknown or forged paths produce promised_asset=null and the lead is stored
// as not_applicable — it never enters the W14 fulfillment queue. All mapped
// assets are public PDFs; the route contract prevents arbitrary asset claims
// but does not cryptographically bind the path to a server-rendered form.
// A future hardening pass should use per-asset webhook endpoints or a signed
// form token. See ADR 2026-07-27-w14-durable-lead-asset-fulfillment.md.
const raw = $input.first().json.body || {};
const email = (raw.email || '').toString().trim().toLowerCase();
const pagePath = (raw.page_path || '').toString().trim();
const fromName = (raw.name || '').toString().trim();
const subject = (raw.subject || '').toString().trim() || 'lead: ' + pagePath;
const messageBody = (raw.message_body || raw.message || '').toString().trim();
const consentTs = (raw.consent_ts || new Date().toISOString());
const userAgent = (raw.user_agent || '').toString().trim().slice(0, 500) || null;
const referrer = (raw.referrer || '').toString().trim().slice(0, 500) || null;
const utmSource = (raw.utm_source || '').toString().trim().slice(0, 200) || null;
const utmMedium = (raw.utm_medium || '').toString().trim().slice(0, 200) || null;
const utmCampaign = (raw.utm_campaign || '').toString().trim().slice(0, 200) || null;

const routeContract = Object.freeze({
  '/download-checklist': Object.freeze({ form_name: 'download_checklist', promised_asset: 'maine_dispensary_roadmap_2026' }),
  '/download/founders-bible': Object.freeze({ form_name: 'founders_bible', promised_asset: 'maine_cannabis_founders_bible_2026' }),
  '/download/first-timer-field-guide': Object.freeze({ form_name: 'first_timer_field_guide', promised_asset: 'maine_first_timer_field_guide' }),
  '/download/metrc-reconciliation-checklist': Object.freeze({ form_name: 'metrc_checklist', promised_asset: 'maine_metrc_reconciliation_checklist' }),
  '/download/compliance-self-assessment': Object.freeze({ form_name: 'compliance_self_assessment', promised_asset: 'maine_dispensary_compliance_self_assessment' }),
  '/download/maine-cannabis-industry-report-q3-2026': Object.freeze({ form_name: 'q3_2026_industry_report', promised_asset: 'maine_cannabis_industry_report_q3_2026' }),
  '/market-stats': Object.freeze({ form_name: 'market_stats_data_request', promised_asset: null }),
});

const route = routeContract[pagePath] || null;
const formName = route ? route.form_name : 'mdg_lead_intake';
const promisedAsset = route ? route.promised_asset : null;
const assetId = promisedAsset;
const leadType = promisedAsset ? 'lead_magnet' : (raw.lead_type || 'general').toString().trim().toLowerCase();
const successPath = pagePath || '/';

if (!email || !pagePath) throw new Error('missing_required');
if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) throw new Error('invalid_email');

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}

const sourceMessageId = 'api_post:' + fnv1a(email + '|' + pagePath + '|' + formName + '|' + (raw.ts || ''));
return [{ json: {
  email,
  from_name: fromName,
  subject,
  lead_type: leadType,
  promised_asset: promisedAsset,
  message_body: messageBody,
  page_path: pagePath,
  referrer,
  user_agent: userAgent,
  utm_source: utmSource,
  utm_medium: utmMedium,
  utm_campaign: utmCampaign,
  consent_ts: consentTs,
  asset_id: assetId,
  source_message_id: sourceMessageId,
  transport_kind: 'api_post',
  form_name: formName,
  success_path: successPath,
  received_at: new Date().toISOString(),
} }];`;
}

function updatedInsertContract() {
  return {
    query: `INSERT INTO mdg_leads (
  from_email, from_name, subject, lead_type, promised_asset, message_body,
  received_at, page_path, referrer, user_agent, consent_ts, asset_id,
  source_message_id, transport_kind, utm_source, utm_medium, utm_campaign,
  form_name, success_path, fulfillment_status
) VALUES (
  $1, $2, $3, $4, $5, $6,
  $7, $8, $9, $10, $11, $12,
  $13, $14, $15, $16, $17,
  $18, $19, $20
) RETURNING id;`,
    queryReplacement: `={{ [
  $json.email, $json.from_name, $json.subject, $json.lead_type, $json.promised_asset, $json.message_body,
  $json.received_at, $json.page_path, $json.referrer, $json.user_agent, $json.consent_ts, $json.asset_id,
  $json.source_message_id, $json.transport_kind, $json.utm_source, $json.utm_medium, $json.utm_campaign,
  $json.form_name, $json.success_path, $json.promised_asset ? 'pending' : 'not_applicable'
].map(v => v === undefined ? null : v) }}`,
  };
}

function pgNode(id, name, position, query, replacement, postgresCredential) {
  return {
    id, name, position,
    type: 'n8n-nodes-base.postgres',
    typeVersion: 2.5,
    parameters: {
      operation: 'executeQuery',
      query,
      options: replacement ? { queryReplacement: replacement } : {},
    },
    credentials: { postgres: postgresCredential },
    retryOnFail: false,
  };
}

function buildW14Workflow(postgresCredential, smtpCredential) {
  if (!postgresCredential || !postgresCredential.id || !smtpCredential || !smtpCredential.id) {
    throw new Error('credential references are required in memory');
  }

  const nodes = [
    {
      id: '9a34aa36-9b8c-4bd9-9207-001400000001',
      name: 'Manual checkpoint trigger',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [-900, 160],
      parameters: {},
    },
    {
      id: '9a34aa36-9b8c-4bd9-9207-001400000002',
      name: 'Every 5 minutes offset 2',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [-900, 0],
      parameters: { rule: { interval: [{ field: 'cronExpression', expression: '2/5 * * * *' }] } },
    },
    pgNode(
      '9a34aa36-9b8c-4bd9-9207-001400000003', 'Reconcile stale states', [-680, 80],
      'SELECT * FROM public.mdg_w14_reconcile_stale();', null, postgresCredential,
    ),
    pgNode(
      '9a34aa36-9b8c-4bd9-9207-001400000004', 'Claim one due lead', [-460, 80],
      'SELECT * FROM public.mdg_w14_claim($1, now());',
      "={{ [ 'w14:' + $execution.id ] }}", postgresCredential,
    ),
    pgNode(
      '9a34aa36-9b8c-4bd9-9207-001400000005', 'Prepare durable send', [-240, 80],
      'SELECT * FROM public.mdg_w14_prepare_send($1::bigint, $2, now());',
      "={{ [ $json.lead_id, 'w14:' + $execution.id ] }}", postgresCredential,
    ),
    {
      id: '9a34aa36-9b8c-4bd9-9207-001400000006',
      name: 'Ready only',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [-20, 80],
      parameters: { jsCode: "const item = $input.first(); return item && item.json.ready === true ? [item] : [];" },
    },
    {
      id: '9a34aa36-9b8c-4bd9-9207-001400000007',
      name: 'Submit one SMTP message',
      type: 'n8n-nodes-mdg-smtp-send.mdgSmtpSend',
      typeVersion: 1,
      position: [200, 80],
      retryOnFail: false,
      parameters: {
        leadId: '={{ $json.lead_id }}',
        attemptId: '={{ $json.attempt_id }}',
        attemptNumber: '={{ $json.attempt_number }}',
        fromEmail: '={{ $json.sender_identity }}',
        toEmail: '={{ $json.recipient_email }}',
        subject: '={{ $json.subject }}',
        canonicalUrl: '={{ $json.canonical_url }}',
        templateVersion: '={{ $json.template_version }}',
        messageId: '={{ $json.outbound_message_id }}',
      },
      credentials: { smtp: smtpCredential },
    },
    pgNode(
      '9a34aa36-9b8c-4bd9-9207-001400000008', 'Mark fulfilled', [460, 0],
      'SELECT public.mdg_w14_mark_success($1::bigint, $2::bigint, $3, now()) AS transitioned;',
      '={{ [ $json.lead_id, $json.attempt_id, $json.provider_message_id ] }}', postgresCredential,
    ),
    pgNode(
      '9a34aa36-9b8c-4bd9-9207-001400000009', 'Mark bounded failure', [460, 160],
      'SELECT public.mdg_w14_mark_failure($1::bigint, $2::bigint, $3, $4, $5, now()) AS fulfillment_status;',
      '={{ [ $json.lead_id, $json.attempt_id, $json.failure_class, $json.error_code, $json.error_stage ] }}', postgresCredential,
    ),
  ];

  const connections = {
    'Manual checkpoint trigger': { main: [[{ node: 'Reconcile stale states', type: 'main', index: 0 }]] },
    'Every 5 minutes offset 2': { main: [[{ node: 'Reconcile stale states', type: 'main', index: 0 }]] },
    'Reconcile stale states': { main: [[{ node: 'Claim one due lead', type: 'main', index: 0 }]] },
    'Claim one due lead': { main: [[{ node: 'Prepare durable send', type: 'main', index: 0 }]] },
    'Prepare durable send': { main: [[{ node: 'Ready only', type: 'main', index: 0 }]] },
    'Ready only': { main: [[{ node: 'Submit one SMTP message', type: 'main', index: 0 }]] },
    'Submit one SMTP message': {
      main: [
        [{ node: 'Mark fulfilled', type: 'main', index: 0 }],
        [{ node: 'Mark bounded failure', type: 'main', index: 0 }],
      ],
    },
  };

  return {
    name: W14_NAME,
    nodes,
    connections,
    settings: privacySettings({ timezone: 'America/New_York' }),
  };
}

function waitForPort(port, timeoutMs = 8000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const socket = net.createConnection({ host: '127.0.0.1', port });
      socket.once('connect', () => { socket.destroy(); resolve(); });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) reject(new Error('n8n SSH tunnel did not become ready'));
        else setTimeout(probe, 100);
      });
    };
    probe();
  });
}

function startTunnel() {
  const identity = process.env.W14_N8N_SSH_KEY || path.join(os.homedir(), '.ssh/g3nuc-admin-ed25519');
  return spawn('ssh', [
    '-N', '-L', `127.0.0.1:${LOCAL_PORT}:127.0.0.1:5678`,
    '-i', identity,
    '-o', 'BatchMode=yes',
    '-o', 'ExitOnForwardFailure=yes',
    process.env.W14_N8N_SSH_TARGET || 'steve@192.168.1.202',
  ], { stdio: 'ignore' });
}

function readApiKey() {
  const keyFile = process.env.N8N_API_KEY_FILE;
  if (!keyFile) throw new Error('N8N_API_KEY_FILE is required');
  const key = fs.readFileSync(keyFile, 'utf8').trim();
  if (!key) throw new Error('N8N_API_KEY_FILE is empty');
  return key;
}

async function request(apiKey, method, endpoint, body) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'X-N8N-API-KEY': apiKey,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`n8n API ${method} ${endpoint} failed with HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
}

async function listWorkflows(apiKey) {
  const all = [];
  let cursor = null;
  do {
    const endpoint = `/workflows?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const page = await request(apiKey, 'GET', endpoint);
    all.push(...page.data);
    cursor = page.nextCursor || null;
  } while (cursor);
  return all;
}

function sanitizedWorkflow(workflow) {
  const normalize = workflow.nodes.find((node) => node.name === 'Normalize & Validate');
  return {
    id: workflow.id,
    name: workflow.name,
    active: workflow.active,
    versionId: workflow.versionId,
    settings: {
      saveExecutionProgress: workflow.settings && workflow.settings.saveExecutionProgress,
      saveDataSuccessExecution: workflow.settings && workflow.settings.saveDataSuccessExecution,
      saveDataErrorExecution: workflow.settings && workflow.settings.saveDataErrorExecution,
      saveManualExecutions: workflow.settings && workflow.settings.saveManualExecutions,
    },
    nodes: workflow.nodes.map((node) => ({ name: node.name, type: node.type, typeVersion: node.typeVersion })),
    normalize_sha256: normalize ? sha256(normalize.parameters.jsCode) : undefined,
  };
}

function assertKnownW13(w13) {
  const normalize = w13.nodes.find((node) => node.name === 'Normalize & Validate');
  const insert = w13.nodes.find((node) => node.name === 'Insert Lead');
  if (!normalize || !insert) throw new Error('W13 required nodes are missing');

  const intendedNormalizeHash = sha256(buildNormalizeCode());
  const currentNormalizeHash = sha256(normalize.parameters.jsCode);
  if (![W13_NORMALIZE_CURRENT_SHA256, intendedNormalizeHash].includes(currentNormalizeHash)) {
    throw new Error(`W13 Normalize & Validate has unknown SHA-256 ${currentNormalizeHash}`);
  }

  const intendedInsert = updatedInsertContract();
  const queryHashes = [W13_INSERT_QUERY_CURRENT_SHA256, sha256(intendedInsert.query)];
  const replacementHashes = [W13_INSERT_REPLACEMENT_CURRENT_SHA256, sha256(intendedInsert.queryReplacement)];
  if (!queryHashes.includes(sha256(insert.parameters.query)) ||
      !replacementHashes.includes(sha256(insert.parameters.options.queryReplacement))) {
    throw new Error('W13 Insert Lead has an unknown query/replacement contract');
  }
  return { normalize, insert };
}

function updateW13Body(w13) {
  const { normalize, insert } = assertKnownW13(w13);
  normalize.parameters.jsCode = buildNormalizeCode();
  const intendedInsert = updatedInsertContract();
  insert.parameters.query = intendedInsert.query;
  insert.parameters.options = { ...insert.parameters.options, queryReplacement: intendedInsert.queryReplacement };
  return {
    name: w13.name,
    nodes: w13.nodes,
    connections: w13.connections,
    settings: privacySettings(w13.settings || {}),
  };
}

async function main() {
  const mode = process.argv[2] || '--inspect';
  if (!['--inspect', '--apply-inactive'].includes(mode)) {
    throw new Error('usage: provision-w14-workflows.cjs [--inspect|--apply-inactive]');
  }

  const tunnel = startTunnel();
  try {
    await waitForPort(LOCAL_PORT);
    const apiKey = readApiKey();
    const w13 = await request(apiKey, 'GET', `/workflows/${W13_ID}`);
    assertKnownW13(w13);
    const summaries = { w13_before: sanitizedWorkflow(w13) };

    const workflows = await listWorkflows(apiKey);
    const w14Matches = workflows.filter((workflow) => workflow.name === W14_NAME);
    if (w14Matches.length > 1) throw new Error('multiple W14 workflows already exist');

    if (mode === '--inspect') {
      if (w14Matches.length === 1) {
        const w14 = await request(apiKey, 'GET', `/workflows/${w14Matches[0].id}`);
        summaries.w14 = sanitizedWorkflow(w14);
      } else {
        summaries.w14 = { status: 'absent' };
      }
      process.stdout.write(`${JSON.stringify(summaries, null, 2)}\n`);
      return;
    }

    const smtpId = process.env.W14_SMTP_CREDENTIAL_ID;
    const smtpName = process.env.W14_SMTP_CREDENTIAL_NAME || 'W14 SMTP';
    if (!smtpId) throw new Error('W14_SMTP_CREDENTIAL_ID is required for apply');

    const insertNode = w13.nodes.find((node) => node.name === 'Insert Lead');
    const postgresCredential = insertNode.credentials && insertNode.credentials.postgres;
    if (!postgresCredential || !postgresCredential.id) throw new Error('W13 Postgres credential reference missing');
    const smtpCredential = { id: smtpId, name: smtpName };
    const desiredW14 = buildW14Workflow(postgresCredential, smtpCredential);

    let w14;
    if (w14Matches.length === 0) {
      w14 = await request(apiKey, 'POST', '/workflows', desiredW14);
    } else {
      const currentW14 = await request(apiKey, 'GET', `/workflows/${w14Matches[0].id}`);
      if (currentW14.active) throw new Error('refusing to mutate active W14 workflow');
      w14 = await request(apiKey, 'PUT', `/workflows/${currentW14.id}`, desiredW14);
    }
    if (w14.active) throw new Error('W14 unexpectedly active after inactive provision');

    const desiredW13Body = updateW13Body(structuredClone(w13));
    const currentW13Body = {
      name: w13.name,
      nodes: w13.nodes,
      connections: w13.connections,
      settings: w13.settings || {},
    };
    const updatedW13 = sha256(JSON.stringify(currentW13Body)) === sha256(JSON.stringify(desiredW13Body))
      ? w13
      : await request(apiKey, 'PUT', `/workflows/${W13_ID}`, desiredW13Body);
    summaries.w13_after = sanitizedWorkflow(updatedW13);
    summaries.w14 = sanitizedWorkflow(w14);
    process.stdout.write(`${JSON.stringify(summaries, null, 2)}\n`);
  } finally {
    tunnel.kill('SIGTERM');
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`W14 provisioner failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  assertKnownW13,
  buildNormalizeCode,
  buildW14Workflow,
  privacySettings,
  sha256,
  updatedInsertContract,
};
