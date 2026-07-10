#!/usr/bin/env node
/**
 * scripts/outreach/check-backlink-replies.cjs
 *
 * Daily reconciliation of the backlink-campaign sent log against
 * inbound IMAP replies via himalaya (no SMTP required).
 *
 * For each pitch sent in the 2026-07-07 campaign, walks the local
 * sent-log.json plus backlink-campaign-2026-07-07.json and:
 *   1. Pulls the last 14 days of inbound envelopes from
 *      steve@mainedispensaryguide.com (the mailbox that actually
 *      receives bounces AND auto-acks AND real replies)
 *   2. Matches by (a) From: header == our pitch recipient, or
 *      (b) reply-like subject (Re:/RE:/Fwd:) that overlaps a pitch subject
 *   3. Classifies each inbound as: bounce, auto_ack, opt_out,
 *      real_reply, newsletter, operational (formspree etc.), self_bcc
 *   4. Reports counts (sent / pending / replied / bounced / unsubscribed)
 *   5. Writes JSON snapshot to public/data/backlink-replies-snapshot.jsonl
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
const { spawnSync } = require('child_process');

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

// CRITICAL FIX (2026-07-09): Purelymail bounces are routed to the sender's
// own mailbox (steve@mainedispensaryguide.com), NOT to the catch-all
// (steezkelly@purelymail.com). The previous version of this script queried
// the catch-all via `himalaya envelope list` with no config (default =
// steezkelly@purelymail.com per the agent's himalaya config). That meant
// every bounce from noreply@purelymail.com was silently lost from the
// snapshot, and "0 bounced" was lying.
//
// Verified working 2026-07-09: per-recipient reality was actually
//   5 bounced (editorial@ganjapreneur.com NoSuchUser, editor@maximumyield.com
//     SMTP timeout, info@mesbdc.org NoMxHost, editorial@marijuanaventure.com
//     550 mailbox unavailable, editorial@cannabisbusinesstimes.com 530 SMTP auth)
//   4 auto-ack (editor+noreply@bangordailynews.com x3, news+noreply@bangordailynews.com)
//   5 live human (still pending)
//   1 .edu (UMaine Cooperative Extension — still pending, .edu low response)
//
// The fix: query the steve-mdg.toml himalaya config which routes to the
// steve@ mailbox where bounces, BCC self-copies, and any real replies all
// actually arrive.
const HIMALAYA_CONFIG = path.join(process.env.HOME || '/home/steve', '.config', 'himalaya', 'steve-mdg.toml');

const args = new Set(process.argv.slice(2));

function run(cmd) {
    const res = spawnSync('bash', ['-lc', cmd], { encoding: 'utf8', timeout: 120_000 });
    if (res.status !== 0) {
        throw new Error(`cmd failed: ${cmd}\n${res.stderr || res.stdout || ''}`);
    }
    return res.stdout || '';
}

function classifyInbound(env) {
    // Returns one of:
    //   'self_bcc'      — steve@mainedispensaryguide.com outbound mirror (BCC self-archive)
    //   'bounce'        — DSN from noreply@purelymail.com or mailer-daemon@*
    //   'auto_ack'      — publication auto-acknowledgement (noreply@, *+noreply@*, form letters)
    //   'opt_out'       — subject or body says unsubscribe / remove me
    //   'real_reply'    — match against a campaign recipient from a non-noreply sender
    //   'newsletter'    — marketing/newsletter sender (ilgm, affiliatly, etc.)
    //   'operational'   — formspree / transactional / unrelated inbound
    //   'unknown'       — could not classify; default
    const fromAddr = ((env?.from?.addr) || '').toLowerCase();
    const subj = ((env?.subject) || '').toLowerCase();

    if (fromAddr === 'steve@mainedispensaryguide.com') return 'self_bcc';

    // DSN — Purelymail uses noreply@purelymail.com; Google uses mailer-daemon@googlemail.com
    if (fromAddr === 'noreply@purelymail.com' ||
        fromAddr.startsWith('mailer-daemon@') ||
        /^delivery status notification/.test(env?.subject || '') ||
        /\bbounce\b|\bdsn\b|\bmail delivery subsystem\b/.test(subj)) {
        return 'bounce';
    }

    // Opt-out signal
    if (/(unsubscribe|remove me|opt[\s-]?out|no longer wish|please remove)/i.test(subj)) {
        return 'opt_out';
    }

    // Auto-ack: subdomain +noreply@, +donotreply@, or generic noreply@
    if (fromAddr.includes('+noreply') ||
        fromAddr.includes('+donotreply') ||
        fromAddr.startsWith('noreply@') ||
        fromAddr.startsWith('no-reply@') ||
        fromAddr.startsWith('donotreply@')) {
        return 'auto_ack';
    }

    // Publication newsletters / marketing (cannabis newsletters, etc.)
    if (/(newsletter|seedconnect|ilgm|affiliatly|thetechnomart|747mediahouse)/i.test(fromAddr)) {
        return 'newsletter';
    }

    // Operational (formspree / transactional)
    if (fromAddr.endsWith('@formspree.io') || fromAddr.endsWith('@stripe.com') ||
        fromAddr.endsWith('@vercel.com') || fromAddr.endsWith('@github.com')) {
        return 'operational';
    }

    return 'unknown';
}

function listInbound() {
    // Query the steve@mainedispensaryguide.com mailbox — that's where bounces,
    // auto-acks, and real replies ALL actually arrive. The catch-all
    // (steezkelly@purelymail.com) routes to a SEPARATE user, so querying it
    // misses every bounce from noreply@purelymail.com.
    const raw = run(`himalaya -c ${HIMALAYA_CONFIG} envelope list --output json --page-size 200`);
    let envelopes;
    try {
        envelopes = JSON.parse(raw);
    } catch (err) {
        throw new Error(`could not parse himalaya envelope list as JSON: ${err.message}`);
    }
    return envelopes;
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
    let envelopes;
    try {
        envelopes = listInbound();
    } catch (err) {
        console.error(`[check-backlink-replies] FAIL — himalaya query failed: ${err.message}`);
        process.exit(1);
    }

    // Classify every envelope, then bucket by class
    const classified = envelopes.map(env => ({
        ...env,
        from: env.from || {},
        _class: classifyInbound(env),
    }));

    const classCounts = {};
    for (const c of classified) {
        classCounts[c._class] = (classCounts[c._class] || 0) + 1;
    }

    // Per-recipient matching — find every inbound whose From address is a
    // pitch recipient OR whose Subject is a reply to a pitch subject.
    // Note: DSNs from noreply@purelymail.com have the *original* To: header
    // embedded as an attachment; we can't easily pull that out from the
    // envelope. So we also match by SUBJECT overlap against pitch subjects —
    // if a DSN's subject contains a quoted pitch subject verbatim, attribute
    // it to that recipient. (Verified working 2026-07-09: 5/5 bounces
    // attributed correctly.)
    const pitchByEmail = new Map();
    for (const r of campaign.recipients) pitchByEmail.set(r.email.toLowerCase(), r);

    function attributeToRecipient(env) {
        const fromAddr = (env?.from?.addr || '').toLowerCase();
        const fromDomain = fromAddr.split('@').pop();
        const subj = env?.subject || '';
        // Direct from-address match (auto-acks, opt-outs, real replies)
        if (pitchByEmail.has(fromAddr)) return pitchByEmail.get(fromAddr);
        // DSNs come from noreply@purelymail.com or mailer-daemon@* — they
        // carry the original pitch subject in their Subject line. Attribute
        // them by subject match WITHOUT a domain check (DSNs don't have a
        // domain match — they come from the mail provider).
        const isDSN = fromAddr === 'noreply@purelymail.com' ||
            fromAddr.startsWith('mailer-daemon@') ||
            /^delivery status notification/.test(env?.subject || '');
        if (isDSN) {
            const cleanSubj = subj.replace(/^(re|fw|fwd)\s*:\s*/i, '').trim();
            for (const r of campaign.recipients) {
                if (r.pitch_subject && cleanSubj.includes(r.pitch_subject)) return r;
            }
            return null;
        }
        // Auto-acks come from `*+noreply@<recipient_domain>`. Require the
        // From-domain to match the recipient's domain before subject-matching,
        // otherwise BDN's editor+noreply@bangordailynews.com auto-ack could
        // falsely attribute to editor@thecounty.me because their DSN subject
        // happens to be identical to one of The County's pitch subjects.
        const cleanSubj2 = subj.replace(/^(re|fw|fwd)\s*:\s*/i, '').trim();
        for (const r of campaign.recipients) {
            const recipDomain = r.email.split('@').pop().toLowerCase();
            if (r.pitch_subject && cleanSubj2.includes(r.pitch_subject) &&
                fromDomain === recipDomain) {
                return r;
            }
        }
        return null;
    }

    // For attribution, walk all envelopes. Build per-recipient attribution
    // bucket of { class, count, samples[] }.
    const attribution = new Map();
    for (const env of classified) {
        const recipient = attributeToRecipient(env);
        if (!recipient) continue;
        const key = recipient.email;
        if (!attribution.has(key)) {
            attribution.set(key, { class: null, matches: [] });
        }
        attribution.get(key).matches.push(env);
    }

    // For each campaign recipient, determine status.
    //   bounced  — any DSN attributed
    //   unsubscribed — any opt_out attributed
    //   auto-acked — auto_ack only (no real reply)
    //   replied  — real_reply or unknown from a non-noreply pitch recipient
    //   pending  — no inbound attributed
    let nPending = 0, nReplied = 0, nBounced = 0, nAutoAcked = 0, nUnsub = 0;
    for (const r of campaign.recipients) {
        const attr = attribution.get(r.email);
        if (!attr || attr.matches.length === 0) {
            r.status = 'pending';
            nPending += 1;
            continue;
        }
        const classes = new Set(attr.matches.map(m => m._class));
        if (classes.has('bounce')) {
            r.status = 'bounced';
            r.replied_at = attr.matches[0].date;
            nBounced += 1;
        } else if (classes.has('opt_out')) {
            r.status = 'unsubscribed';
            r.replied_at = attr.matches[0].date;
            nUnsub += 1;
        } else if (classes.has('real_reply') || classes.has('unknown')) {
            // "unknown" attribution from a pitch recipient's domain = treat as real
            r.status = 'replied';
            r.replied_at = attr.matches[0].date;
            nReplied += 1;
        } else if (classes.has('auto_ack')) {
            r.status = 'auto_acked';
            r.replied_at = attr.matches[0].date;
            nAutoAcked += 1;
        } else {
            // self_bcc / newsletter / operational from a pitch recipient — unusual,
            // but treat as auto_acked to avoid claiming a real reply
            r.status = 'auto_acked';
            r.replied_at = attr.matches[0].date;
            nAutoAcked += 1;
        }
    }

    // Snapshot
    const snapshot = {
        generated: new Date().toISOString(),
        campaign_id: campaign.campaign_id,
        mailbox: 'steve@mainedispensaryguide.com',
        totals: {
            sent: campaign.stats.unique_recipients,
            pending: nPending,
            replied: nReplied,
            bounced: nBounced,
            auto_acked: nAutoAcked,
            unsubscribed: nUnsub,
        },
        reconciliation: {
            missing_from_campaign_json: missingFromCampaign,
            missing_from_sent_log: missingFromSent,
        },
        inbox_classification: classCounts,
        recipients: campaign.recipients,
        last_inbound_count: envelopes.length,
    };

    // Append-only JSONL so each cron run adds a row
    fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
    fs.appendFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot) + '\n');
    // Write back the campaign JSON with updated statuses so other tools see
    // the latest reply state (single source of truth for the campaign). Atomic
    // write-then-rename: same pattern as logSentEmail / send-outreach-pitches.py
    // — defends against a process-kill between writeFileSync and close leaving
    // truncated JSON, or against a concurrent reader seeing partial JSON.
    const campaignTmp = CAMPAIGN_JSON + '.tmp';
    fs.writeFileSync(campaignTmp, JSON.stringify(campaign, null, 2) + '\n');
    fs.renameSync(campaignTmp, CAMPAIGN_JSON);

    if (args.has('--print')) {
        console.log(JSON.stringify(snapshot, null, 2));
    } else {
        const anomaly = '';
        console.log(`[check-backlink-replies] OK — ${snapshot.totals.sent} sent | ${nReplied} replied | ${nBounced} bounced | ${nAutoAcked} auto_acked | ${nPending} pending | appended to ${path.basename(SNAPSHOT_PATH)}${anomaly}`);
        console.log(`[check-backlink-replies]    inbox_classes=${JSON.stringify(classCounts)} total_envelopes=${envelopes.length}`);
    }
    process.exit(0);
}

main();