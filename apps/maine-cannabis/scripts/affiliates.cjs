#!/usr/bin/env node
/**
 * Affiliate program tracker for maine-dispensary-guide.com.
 *
 * Subcommands:
 *   list                 — print all programs + current status
 *   link <program>       — print the working affiliate link for a program
 *   inbox-check          — connect to Purelymail IMAP, scan for new approval/rejection emails, print findings
 *   mark <program> <status>  — update status field in this script (status: applied|approved|rejected|pending|dormant)
 *
 * Purelymail credentials live at /home/steve/Documents/purelymail-smtp.txt (format: user|password).
 * Affiliate programs are defined inline below — single source of truth.
 *
 * To add a new program: add an entry to the PROGRAMS array, then run `node affiliates.cjs list`.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// --- Purelymail IMAP config (used by Python helper, not Node directly) ---
const IMAP_HOST = 'imap.purelymail.com';
const CREDS_PATH = path.join(os.homedir(), 'Documents', 'purelymail-smtp.txt');

// --- Affiliate program registry (single source of truth) ---
// status: applied | approved | rejected | pending | dormant
// commission: displayed for reference; check dashboard for current rate
const PROGRAMS = [
  {
    id: 'ilgm',
    name: 'ILGM (I Love Growing Marijuana)',
    platform: 'affiliatly',
    affiliateId: '8112',
    commission: '20% (up to 30% with performance)',
    signupBonus: '$10',
    status: 'approved',
    approvedAt: '2026-05-14',
    applyUrl: 'https://www.affiliatly.com/af-1021567/affiliate.panel?mode=register',
    dashboardUrl: 'https://www.affiliatly.com/af-1021567/affiliate.panel',
    linkTemplate: (id) => `https://ilgm.com?aff=${id}`,
    linkAltTemplate: (id) => `https://ilovegrowingmarijuana.com/<page>?aff=${id}`,
    matchSenders: ['affiliatly.com', 'ilgm.com'],
    notes: '20% standard, 30% with performance. $10 signup bonus. Reset link expires 24h.',
  },
  {
    id: 'msnl',
    name: 'MSNL Seeds',
    platform: 'msnl-internal',
    affiliateId: null,
    commission: 'up to 35%',
    signupBonus: null,
    status: 'pending',
    approvedAt: null,
    applyUrl: 'https://www.msnlseeds.com/affiliates-program',
    dashboardUrl: 'https://www.msnlseeds.com/affiliate-program/',
    linkTemplate: (id) => id ? `https://www.msnlseeds.com/?aff=${id}` : null,
    linkAltTemplate: null,
    matchSenders: ['msnlseeds.com', 'msnl.com'],
    notes: 'Applied 2026-05-13 via Playwright. No approval email. Dashboard never acknowledged. Needs Steve to log in and check status.',
  },
  {
    id: 'seedconnect',
    name: 'The Seed Connect',
    platform: 'seedconnect-internal',
    affiliateId: null,
    commission: '20-30% tiered',
    signupBonus: '$100',
    status: 'pending',
    approvedAt: null,
    applyUrl: 'https://affiliates.theseedconnect.com/register',
    dashboardUrl: 'https://affiliates.theseedconnect.com/',
    linkTemplate: (id) => id ? `https://theseedconnect.com/?aff=${id}` : null,
    linkAltTemplate: null,
    matchSenders: ['theseedconnect.com'],
    notes: 'Welcome email 2026-05-13 was generic (sent on registration, not approval). $100 bonus status unknown. Needs dashboard check.',
  },
  {
    id: 'greenavenger',
    name: 'Green Avenger Seeds',
    platform: 'woocommerce',
    affiliateId: null,
    commission: '10-25% tiered',
    signupBonus: null,
    status: 'pending',
    approvedAt: null,
    applyUrl: 'https://www.greenavengerseeds.com/become-a-green-avenger-seeds-affiliate/',
    dashboardUrl: 'https://www.greenavengerseeds.com/wp-content/plugins/affiliates/',
    linkTemplate: (id) => id ? `https://www.greenavengerseeds.com/?ref=${id}` : null,
    linkAltTemplate: null,
    matchSenders: ['greenavengerseeds.com', 'greenavenger.com'],
    notes: 'Applied 2026-05-13 via Playwright (WooCommerce registration). No emails received. Needs dashboard check.',
  },
  {
    id: 'seedsman',
    name: 'SeedsMan',
    platform: 'postaffiliatepro',
    affiliateId: null,
    commission: '35%',
    signupBonus: null,
    status: 'dormant',
    approvedAt: null,
    applyUrl: 'https://seedsman.postaffiliatepro.com/affiliates/signup.php',
    dashboardUrl: 'https://seedsman.postaffiliatepro.com/affiliates/',
    linkTemplate: null,
    linkAltTemplate: null,
    matchSenders: ['seedsman.com', 'postaffiliatepro.com'],
    notes: 'INELIGIBLE — requires 500 visits/mo OR 1,000 social followers. Revisit when site traffic grows.',
  },
];

// --- Subcommand: list ---
function cmdList() {
  console.log('\n=== Affiliate Programs (as of ' + new Date().toISOString().slice(0, 10) + ') ===\n');
  for (const p of PROGRAMS) {
    const statusEmoji = {
      approved: '✅', pending: '🟡', rejected: '❌', dormant: '⏸️', applied: '📨',
    }[p.status] || '?';
    const idStr = p.affiliateId ? `[ID: ${p.affiliateId}]` : '[no ID yet]';
    console.log(`${statusEmoji} ${p.id.padEnd(13)} ${p.name.padEnd(34)} ${p.commission.padEnd(28)} ${idStr}`);
    if (p.approvedAt) console.log(`     approved: ${p.approvedAt}`);
    if (p.signupBonus) console.log(`     signup bonus: ${p.signupBonus}`);
    if (p.notes) console.log(`     note: ${p.notes}`);
    console.log('');
  }
  console.log('Total: ' + PROGRAMS.length + ' programs');
  console.log('Approved: ' + PROGRAMS.filter(p => p.status === 'approved').length);
  console.log('Pending: ' + PROGRAMS.filter(p => p.status === 'pending').length);
  console.log('');
}

// --- Subcommand: link ---
function cmdLink(programId) {
  const p = PROGRAMS.find(p => p.id === programId);
  if (!p) {
    console.error(`Unknown program: ${programId}`);
    console.error('Run: node affiliates.cjs list');
    process.exit(1);
  }
  if (!p.linkTemplate) {
    console.error(`${p.id} has no linkTemplate (status: ${p.status}). Cannot generate link.`);
    process.exit(1);
  }
  if (!p.affiliateId) {
    console.error(`${p.id} has no affiliateId yet. Log into the dashboard to get one.`);
    process.exit(1);
  }
  const link = p.linkTemplate(p.affiliateId);
  console.log(`Program: ${p.name}`);
  console.log(`Affiliate ID: ${p.affiliateId}`);
  console.log(`Commission: ${p.commission}`);
  console.log(`\nLink:\n  ${link}\n`);
  if (p.linkAltTemplate) {
    console.log(`Alt (per-page) template:\n  ${p.linkAltTemplate(p.affiliateId)}\n`);
  }
}

// --- Subcommand: mark ---
function cmdMark(programId, newStatus) {
  const validStatuses = ['applied', 'approved', 'rejected', 'pending', 'dormant'];
  if (!validStatuses.includes(newStatus)) {
    console.error(`Invalid status: ${newStatus}. Valid: ${validStatuses.join(', ')}`);
    process.exit(1);
  }
  const p = PROGRAMS.find(p => p.id === programId);
  if (!p) {
    console.error(`Unknown program: ${programId}`);
    process.exit(1);
  }
  p.status = newStatus;
  if (newStatus === 'approved') {
    p.approvedAt = new Date().toISOString().slice(0, 10);
  }
  console.log(`Marked ${programId} as ${newStatus}.`);
  console.log('NOTE: This change is in-memory only. Edit PROGRAMS in this file to persist.');
  console.log('      (Intentional — affiliate IDs come from dashboards, not from automation.)');
}

// --- Subcommand: inbox-check ---
// Spawns Python to scan the Purelymail inbox. We use Python because the
// imaplib + TLS handshake needs to happen in a clean connection per call
// (the IMAP server rate-limits rapid sequential SEARCHes).
function cmdInboxCheck(opts = {}) {
  const days = parseInt(opts.days || '30', 10);

  if (!fs.existsSync(CREDS_PATH)) {
    console.error(`Credentials file not found: ${CREDS_PATH}`);
    process.exit(1);
  }

  const allSenders = [].concat(...PROGRAMS.map(p => p.matchSenders));
  // Run each sender as a separate IMAP SEARCH (Purelymail's IMAP doesn't handle
  // large multi-OR queries well). Python does the searches sequentially.
  const python = `
import imaplib, email, sys
USER, PWD = open(${JSON.stringify(CREDS_PATH)}).read().strip().split('|')
M = imaplib.IMAP4_SSL('${IMAP_HOST}', 993, timeout=20)
M.login(USER, PWD)
M.select('INBOX', readonly=True)
senders = ${JSON.stringify(allSenders)}
seen = set()
for s in senders:
    typ, data = M.search(None, f'FROM "{s}"')
    ids = data[0].split() if data[0] else []
    for mid in ids:
        if mid in seen:
            continue
        seen.add(mid)
        typ, msg_data = M.fetch(mid, '(RFC822.HEADER)')
        raw = msg_data[0][1]
        msg = email.message_from_bytes(raw)
        sender = msg.get('From', '')
        subj = msg.get('Subject', '')
        date = msg.get('Date', '')
        print(f'--MSG--|{date}|{sender}|{subj}')
M.close(); M.logout()
`;

  console.log(`Scanning Purelymail inbox for affiliate-related senders...`);
  // Use async spawn (NOT spawnSync) because the spawnSync child hangs on
  // the IMAP TLS connection in node 22+ — async spawn with proper stdio
  // inheritance works correctly.
  const { spawn } = require('node:child_process');
  const py = spawn('python3', ['-c', python], { encoding: 'utf8' });
  let stdout = '';
  let stderr = '';
  py.stdout.on('data', d => stdout += d.toString());
  py.stderr.on('data', d => stderr += d.toString());
  py.on('close', (code) => {
    if (code !== 0) {
      console.error('Python exited with code', code, 'stderr:', stderr);
      process.exit(1);
    }
    if (stderr) console.error('Python stderr:', stderr);
    const lines = stdout.split('\n');
    const messages = [];
    for (const line of lines) {
      if (line.startsWith('--MSG--|')) {
        const parts = line.slice(8).split('|');
        messages.push({ date: parts[0], sender: parts[1], subject: parts[2] });
      }
    }
    console.log(`\n=== Inbox scan: ${messages.length} affiliate-related emails ===\n`);
    for (const p of PROGRAMS) {
      const matches = messages.filter(m =>
        p.matchSenders.some(s => m.sender.toLowerCase().includes(s.toLowerCase()))
      );
      if (matches.length === 0) {
        console.log(`${p.id}: no emails`);
      } else {
        console.log(`${p.id}: ${matches.length} email(s)`);
        for (const m of matches) {
          console.log(`  ${(m.date || '').slice(0, 25)} | ${(m.sender || '').slice(0, 50)} | ${(m.subject || '').slice(0, 70)}`);
        }
      }
      console.log('');
    }
  });
  py.on('error', (err) => {
    console.error('Python error:', err.message);
    process.exit(1);
  });
}

// --- Main ---
const args = process.argv.slice(2);
const subcmd = args[0];
const subargs = args.slice(1);

switch (subcmd) {
  case 'list': cmdList(); break;
  case 'link':
    if (!subargs[0]) { console.error('Usage: affiliates.cjs link <program-id>'); process.exit(1); }
    cmdLink(subargs[0]);
    break;
  case 'mark':
    if (!subargs[0] || !subargs[1]) { console.error('Usage: affiliates.cjs mark <program-id> <status>'); process.exit(1); }
    cmdMark(subargs[0], subargs[1]);
    break;
  case 'inbox-check':
    cmdInboxCheck({ days: subargs[0] || '30' });
    break;
  case undefined:
  case 'help':
  case '--help':
  case '-h':
    console.log('Usage: node affiliates.cjs <subcommand> [args]');
    console.log('');
    console.log('Subcommands:');
    console.log('  list                    List all affiliate programs and statuses');
    console.log('  link <program-id>       Print working affiliate link for a program');
    console.log('  mark <id> <status>      Update status (in-memory; edit file to persist)');
    console.log('  inbox-check [days]      Scan Purelymail inbox for affiliate emails (default 30 days)');
    console.log('');
    console.log('Program IDs:', PROGRAMS.map(p => p.id).join(', '));
    break;
  default:
    console.error(`Unknown subcommand: ${subcmd}`);
    console.error('Run: node affiliates.cjs help');
    process.exit(1);
}
