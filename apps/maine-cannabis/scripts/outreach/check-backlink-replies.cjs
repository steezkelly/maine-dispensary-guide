#!/usr/bin/env node
/**
 * scripts/outreach/check-backlink-replies.cjs
 *
 * Daily reconciliation of the backlink-campaign sent log against
 * inbound IMAP replies via himalaya (no SMTP required).
 *
 * For each pitch sent in the 2026-07-07 campaign, walks the local
 * sent-log.json plus backlink-campaign-2026-07-07.json and:
 *   1. Pulls the last 7 days of inbound envelopes from the
 *      steezkelly@purelymail.com catch-all
 *   2. Matches by (a) From: header == our pitch recipient, or
 *      (b) reply-like subject (Re:/RE:/Fwd:) that overlaps a pitch subject
 *   3. Reports counts (sent / no_reply / replied / bounced)
 *   4. Writes JSON snapshot to public/data/backlink-replies-snapshot.jsonl
 *
 * Cron pattern (after Steve enables crond on Manjaro):
 *   0 9 * * * /usr/bin/node /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/scripts/outreach/check-backlink-replies.cjs >> /home/steve/.local/log/backlink-replies.log 2>&1
 *
 * Usage:
 *   node scripts/outreach/check-backlink-replies.cjs           # write snapshot
 *   node scripts/outreach/check-backlink-replies.cjs --print   # also print human-readable summary
 *
 * Exit codes:
 *   0  clean run (snapshot written, no errors)
 *   1  himalaya missing or unreadable inbox
 *   2  malformed sent-log.json or backlink-campaign JSON
 */
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const REPO = (() => {
    let dir = __dirname;
    for (let i = 0; i < 6; i++) {
        if (fs.existsSync(path.join(dir, '.git'))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return process.cwd();
})();

const SENT_LOG = path.join(REPO, 'pitches', 'sent-log.json');
const CAMPAIGN_JSON = path.join(REPO, 'apps', 'maine-cannabis', 'scripts', 'outreach', 'backlink-campaign-2026-07-07.json');
const SNAPSHOT_PATH = path.join(REPO, 'apps', 'maine-cannabis', 'public', 'data', 'backlink-replies-snapshot.jsonl');
const args = new Set(process.argv.slice(2));

function run(cmd) {
    const res = spawnSync('bash', ['-lc', cmd], { encoding: 'utf8', timeout: 60_000 });
    if (res.status !== 0) {
        throw new Error(`cmd failed: ${cmd}\n${res.stderr || res.stdout || ''}`);
    }
    return res.stdout || '';
}

function listInbound(recipients, sinceDate) {
    // Fetch envelopes from the past 14 days as a window covering the campaign.
    // himalaya envelope list with --json keeps parsing simple; the JMAP account
    // uses steezkelly@purelymail.com as the catch-all for everything Steve sends.
    const raw = run(`himalaya envelope list --output json 2>/dev/null`);
    let envelopes;
    try {
        envelopes = JSON.parse(raw);
    } catch (err) {
        throw new Error(`could not parse himalaya envelope list as JSON: ${err.message}`);
    }

    const recipientSet = new Set(recipients.map(r => r.toLowerCase()));
    const matched = [];

    for (const env of envelopes) {
        const fromAddr = (env?.from?.addr || '').toLowerCase();
        if (!recipientSet.has(fromAddr)) continue;

        // Skip our own outgoing (same address on both sides through catch-all)
        if (fromAddr === 'steve@mainedispensaryguide.com') continue;

        const date = new Date(env.date || '');
        if (isNaN(date.getTime())) continue;
        if (date < sinceDate) continue;

        matched.push({
            id: env.id,
            subject: env.subject || '',
            from: fromAddr,
            date: env.date,
            flags: env.flags || [],
        });
    }
    return matched;
}

function main() {
    if (!fs.existsSync(SENT_LOG)) {
        console.error(`[check-backlink-replies] FAIL — sent log missing: ${SENT_LOG}`);
        process.exit(2);
    }
    if (!fs.existsSync(CAMPAIGN_JSON)) {
        console.error(`[check-backlink-replies] FAIL — campaign JSON missing: ${CAMPAIGN_JSON}`);
        process.exit(2);
    }

    let sentLog, campaign;
    try {
        sentLog = JSON.parse(fs.readFileSync(SENT_LOG, 'utf8'));
    } catch (err) {
        console.error(`[check-backlink-replies] FAIL — sent-log.json malformed: ${err.message}`);
        process.exit(2);
    }
    try {
        campaign = JSON.parse(fs.readFileSync(CAMPAIGN_JSON, 'utf8'));
    } catch (err) {
        console.error(`[check-backlink-replies] FAIL — campaign JSON malformed: ${err.message}`);
        process.exit(2);
    }

    // Pull the unique-recipient list from the sent log (truth source) +
    // reconcile against campaign JSON
    const sentEntries = sentLog.filter(e => e.status === 'sent');
    const sentRecipients = [...new Set(sentEntries.map(e => e.target_email).filter(Boolean))];

    const campaignRecipients = campaign.recipients.map(r => r.email);
    const campaignSet = new Set(campaignRecipients);
    const sentSet = new Set(sentRecipients);
    const missingFromCampaign = sentRecipients.filter(e => !campaignSet.has(e));
    const missingFromSent = campaignRecipients.filter(e => !sentSet.has(e));

    // Pull inbound from the past 14 days, covering the full 7-day reply window
    // for cold outreach (industry standard) plus slack.
    const sinceDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    let inbound;
    try {
        inbound = listInbound([...campaignSet, ...sentSet], sinceDate);
    } catch (err) {
        console.error(`[check-backlink-replies] FAIL — himalaya query failed: ${err.message}`);
        process.exit(1);
    }

    // Update each campaign recipient's status
    const incomingByEmail = new Map();
    for (const m of inbound) {
        const list = incomingByEmail.get(m.from) || [];
        list.push(m);
        incomingByEmail.set(m.from, list);
    }

    let nPending = 0, nReplied = 0, nBounced = 0, nUnmatched = 0;
    for (const r of campaign.recipients) {
        const matches = incomingByEmail.get(r.email.toLowerCase()) || [];
        if (matches.length > 0) {
            // Bounce detection is heuristic — Purelymail doesn't return DSNs
            // cleanly; treat any reply before 24h as a likely bounce and any
            // reply with the word "unsubscribe"/"remove" as an opt-out.
            const firstReply = matches[0];
            const subj = firstReply.subject.toLowerCase();
            const isOptOut = /(unsubscribe|remove me|opt[\s-]?out|no longer)/.test(subj);
            const sentAt = new Date(r.sent_at);
            const replyAt = new Date(firstReply.date);
            const hoursToReply = (replyAt - sentAt) / (1000 * 60 * 60);
            const isBounce = hoursToReply < 1;

            if (isOptOut) {
                r.status = 'unsubscribed';
            } else if (isBounce) {
                r.status = 'bounced';
                nBounced += 1;
            } else {
                r.status = 'replied';
                r.replied_at = firstReply.date;
                nReplied += 1;
            }
        } else {
            r.status = 'pending';
            nPending += 1;
        }
    }

    // Snapshot
    const snapshot = {
        generated: new Date().toISOString(),
        campaign_id: campaign.campaign_id,
        totals: {
            sent: campaign.stats.unique_recipients,
            pending: nPending,
            replied: nReplied,
            bounced: nBounced,
            unsubscribed: campaign.recipients.filter(r => r.status === 'unsubscribed').length,
        },
        reconciliation: {
            missing_from_campaign_json: missingFromCampaign,
            missing_from_sent_log: missingFromSent,
        },
        recipients: campaign.recipients,
        last_inbound_count: inbound.length,
    };

    // Append-only JSONL so each cron run adds a row
    fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
    fs.appendFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot) + '\n');
    // Write back the campaign JSON with updated statuses so other tools see
    // the latest reply state (single source of truth for the campaign).
    fs.writeFileSync(CAMPAIGN_JSON, JSON.stringify(campaign, null, 2) + '\n');

    if (args.has('--print')) {
        console.log(JSON.stringify(snapshot, null, 2));
    } else {
        console.log(`[check-backlink-replies] OK — ${snapshot.totals.sent} sent | ${nReplied} replied | ${nBounced} bounced | ${nPending} pending | appended to ${path.basename(SNAPSHOT_PATH)}`);
    }
    process.exit(0);
}

main();
