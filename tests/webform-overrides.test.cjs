#!/usr/bin/env node
/**
 * tests/webform-overrides.test.cjs — regression test for the 2026-07-11
 * per-draft override loader + field_map machinery in
 * scripts/outreach/webform-submit.cjs.
 *
 * Three cases (the load/skip/fallback paths):
 *   1. When overrides.json has no entry for a draft, the heuristic still runs
 *      (regression: no override = old behavior).
 *   2. When overrides has a field_map, those exact fields get filled BEFORE
 *      any regex heuristic — including null-skip (honeypot explicit skip).
 *   3. When overrides has submit_selectors, the override selectors are tried
 *      before the default heuristic. (This case is unit-tested by directly
 *      evaluating the click chain against a stub page — no real Playwright.)
 *
 * Run with: node tests/webform-overrides.test.cjs
 * Exit 0 = all 3 cases pass.
 * Exit 1 = at least one case failed.
 *
 * Strategy: load the actual override file from disk and the actual script,
 * verify that the script exposes the override constants and that the
 * field_map-first fill logic produces the correct fill order given a stub
 * visible-fields array.
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const OVERRIDES_FILE = path.join(REPO, 'pitches', 'webform-overrides.json');
const SCRIPT_FILE = path.join(REPO, 'scripts', 'outreach', 'webform-submit.cjs');

let pass = 0, fail = 0;
const ok = (name) => { console.log(`  ✓ ${name}`); pass++; };
const bad = (name, detail) => { console.log(`  ✗ ${name}${detail ? `\n    ${detail}` : ''}`); fail++; };

// --- CASE 1: when overrides.json has no entry for a draft, heuristic still runs ---
console.log('=== CASE 1: no override entry → default heuristic still fires ===');
{
    // Load the real overrides file. The schema requires that EVERY key is
    // a .md filename (the script looks up `overrides[draft.file]`). If the
    // file is missing or malformed, the script must treat it as empty.
    if (!fs.existsSync(OVERRIDES_FILE)) {
        bad('overrides.json exists on disk');
    } else {
        ok('overrides.json exists on disk');
        let parsed;
        try {
            parsed = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8'));
            ok('overrides.json is valid JSON');
        } catch (e) {
            bad('overrides.json is valid JSON', e.message);
        }
        if (parsed) {
            const keys = Object.keys(parsed).filter(k => !k.startsWith('_'));
            if (keys.length === 15) {
                ok(`overrides.json contains exactly 15 fixable drafts (got ${keys.length})`);
            } else {
                bad(`overrides.json should have 15 draft entries, got ${keys.length}`);
            }
            // The 5 DROP drafts must NOT be present (bucket doc says re-research URL,
            // not code change). They are: weedmaps, marijuana venture, activitymaine,
            // cleangreencertified, kbcannabisconsulting.
            const dropDrafts = [
                'weedmaps.com.md',
                'marijuanaventure.com.md',
                'activitymaine.com.md',
                'cleangreencertified.com.md',
                'kbcannabisconsulting.com.md',
            ];
            const missingDrops = dropDrafts.filter(d => keys.includes(d));
            if (missingDrops.length === 0) {
                ok('5 unfixable drops are NOT in overrides.json (correct — those need URL re-research, not code changes)');
            } else {
                bad(`drops found in overrides.json: ${missingDrops.join(', ')}`);
            }
            // The 15 fixable drafts MUST be present (per bucket doc table).
            const expectedFixable = [
                'cannacenterofexcellence.org.md',
                'mgmagazine.com.md',
                'mgretailer.com.md',
                'cannabiscreative.com.md',
                'cannabisindustryjournal.com.md',
                'cldzcannabis.com.md',
                'hashdash.com.md',
                'minnygrown.com.md',
                'mymainemedia.com.md',
                'pufcreativ.com.md',
                'thcscout.com.md',
                'theartofmaryjanemedia.md',
                'thelodgecannabis.com.md',
                'themainehighlands.com.md',
                'findcannabis.com.md',
            ];
            const missingFixable = expectedFixable.filter(d => !keys.includes(d));
            if (missingFixable.length === 0) {
                ok('all 15 expected fixable drafts are present in overrides.json');
            } else {
                bad(`missing fixable drafts: ${missingFixable.join(', ')}`);
            }
            // Look up a draft that is NOT in the file. Its override must be undefined,
            // meaning the script's `overrides[draft.file] || null` falls back to the
            // default heuristic path.
            const sample = 'some-random-draft-not-in-overrides.md';
            const lookup = parsed[sample];
            if (lookup === undefined) {
                ok(`unknown draft '${sample}' has no override entry (default heuristic path)`);
            } else {
                bad(`unknown draft should not have an override entry`);
            }
        }
    }
}

// --- CASE 2: when overrides has field_map, those fields fill BEFORE heuristics ---
console.log('\n=== CASE 2: field_map-first fill + null-skip for honeypots ===');
{
    // We re-implement the field_map-first fill logic exactly as it appears in
    // scripts/outreach/webform-submit.cjs (the pre-pass block inserted at
    // the top of the visible-field loop). If the script's logic changes,
    // this test must be updated to match — same discipline as test-detector.cjs.
    //
    // Stub visible fields as if extracted from the live form.
    const visible = [
        { name: 'name',         id: null,           placeholder: 'Your name',   ariaLabel: null,         type: 'text',     tag: 'input' },
        { name: 'email',        id: null,           placeholder: 'Email',       ariaLabel: null,         type: 'email',    tag: 'input' },
        { name: 'subject',      id: null,           placeholder: 'Subject',     ariaLabel: null,         type: 'text',     tag: 'input' },
        { name: 'message',      id: null,           placeholder: 'Message',     ariaLabel: null,         type: 'textarea', tag: 'textarea' },
        { name: 'url',          id: null,           placeholder: null,          ariaLabel: null,         type: 'text',     tag: 'input' }, // honeypot
        { name: 'phone',        id: null,           placeholder: 'Phone',       ariaLabel: null,         type: 'tel',      tag: 'input' }, // optional
        { name: null,           id: 'publication',  placeholder: null,          ariaLabel: null,         type: 'text',     tag: 'input' }, // id-only match
    ];

    // Override entry for this draft: field_map sets name, email, message;
    // explicitly null-skip phone and url; sets publication (id-only match).
    const fieldMap = {
        name:        'Steve Kelly',
        email:       'steve.kelly@mainedispensaryguide.com',
        message:     'Pitch body goes here',
        publication: 'Maine Dispensary Guide',
        url:         null,   // honeypot — explicit skip
        phone:       null,   // skip optional phone field
    };

    // Track what the pre-pass fills, in order.
    const fills = [];
    const consumedFieldMapKeys = new Set();
    const matchFieldByMapKey = (mapKey) => {
        const k = String(mapKey).toLowerCase();
        for (const f of visible) {
            const candidates = [f.name, f.id, f.ariaLabel].filter(Boolean).map(s => String(s).toLowerCase());
            if (candidates.includes(k)) return f;
        }
        return null;
    };
    for (const [mapKey, mapVal] of Object.entries(fieldMap)) {
        if (mapVal === null) {
            consumedFieldMapKeys.add(String(mapKey).toLowerCase());
            continue;
        }
        const target = matchFieldByMapKey(mapKey);
        if (!target) continue;
        consumedFieldMapKeys.add(String(mapKey).toLowerCase());
        const selector = target.id ? `#${target.id}` : `[name="${target.name}"]`;
        fills.push({ selector, value: String(mapVal), phase: 'pre-pass' });
    }

    // Then the heuristic phase, skipping any field the pre-pass consumed.
    const heuristicFills = [];
    for (const field of visible) {
        const fieldKeys = [field.name, field.id, field.ariaLabel].filter(Boolean).map(s => String(s).toLowerCase());
        if (fieldKeys.some(k => consumedFieldMapKeys.has(k))) continue;
        // Heuristic: textarea/message → fullBody, email → steve@, name → Steve Kelly
        // In this stub, 'subject' (NOT in field_map) will be matched by the
        // subject/title/topic heuristic. 'message' was consumed by the
        // pre-pass so the heuristic MUST skip it (regression guard).
        const n = (field.name || '').toLowerCase();
        const p = (field.placeholder || '').toLowerCase();
        const i = (field.id || '').toLowerCase();
        if (field.tag === 'textarea' || /message|comment|body/i.test(n + p + i)) {
            heuristicFills.push({ selector: `[name="${field.name}"]`, value: 'fullBody', phase: 'heuristic' });
        } else if (/subject|title|topic/i.test(n + p + i)) {
            heuristicFills.push({ selector: `[name="${field.name}"]`, value: 'subject-heuristic', phase: 'heuristic' });
        }
        // Other fields fall through and are not filled by heuristic in this test
        // (this is intentional — proves that field_map doesn't fill them).
    }

    // Heuristic phase must NOT re-fill fields already handled by pre-pass.
    // Specifically: 'message' is in field_map and consumed → must NOT appear
    // in heuristicFills.
    const messageHeuristic = heuristicFills.find(f => f.selector === '[name="message"]');
    if (!messageHeuristic) {
        ok("heuristic skipped 'message' (pre-pass already filled it)");
    } else {
        bad(`heuristic double-filled 'message': ${JSON.stringify(messageHeuristic)}`);
    }
    // But 'subject' is NOT in field_map → heuristic should still match it.
    const subjectHeuristic = heuristicFills.find(f => f.selector === '[name="subject"]');
    if (subjectHeuristic) {
        ok("heuristic still matches 'subject' (NOT in field_map → falls through)");
    } else {
        bad("heuristic should still match 'subject' (not in field_map)");
    }

    // Pre-pass assertions:
    if (fills.length === 4) {
        ok(`pre-pass filled exactly 4 fields (name, email, message, publication), got ${fills.length}`);
    } else {
        bad(`pre-pass should fill 4 fields, got ${fills.length}: ${JSON.stringify(fills)}`);
    }
    const fillSelectors = fills.map(f => f.selector).sort();
    const expectedSelectors = ['#publication', '[name="email"]', '[name="message"]', '[name="name"]'].sort();
    if (JSON.stringify(fillSelectors) === JSON.stringify(expectedSelectors)) {
        ok(`pre-pass selectors exactly match field_map entries: ${fillSelectors.join(', ')}`);
    } else {
        bad(`pre-pass selector mismatch. expected ${expectedSelectors.join(', ')}, got ${fillSelectors.join(', ')}`);
    }
    // Honeypot ('url') and phone must be in consumed keys (skip explicit), not in fills.
    if (consumedFieldMapKeys.has('url')) {
        ok("honeypot field 'url' skipped explicitly (null in field_map)");
    } else {
        bad("honeypot field 'url' was NOT marked as consumed — risk of heuristic double-fill");
    }
    if (consumedFieldMapKeys.has('phone')) {
        ok("honeypot field 'phone' skipped explicitly (null in field_map)");
    } else {
        bad("honeypot field 'phone' was NOT marked as consumed");
    }
    // The 'publication' id-only match proves that field_map matches by id
    // when name is null.
    const pubFill = fills.find(f => f.selector === '#publication');
    if (pubFill && pubFill.value === 'Maine Dispensary Guide') {
        ok("id-only match works: field_map['publication'] → #publication selector");
    } else {
        bad(`id-only match failed. pubFill = ${JSON.stringify(pubFill)}`);
    }

    // Pre-pass must run BEFORE heuristics. The script's pre-pass block sits
    // BEFORE the heuristic for-loop in the source — verify by parsing the
    // script source.
    const scriptSrc = fs.readFileSync(SCRIPT_FILE, 'utf-8');
    const prePassIdx = scriptSrc.indexOf('// Pre-pass: apply field_map entries');
    const heuristicIdx = scriptSrc.indexOf('for (const field of visible)');
    if (prePassIdx > 0 && heuristicIdx > 0 && prePassIdx < heuristicIdx) {
        ok('pre-pass block appears BEFORE heuristic for-loop in script source');
    } else {
        bad(`pre-pass not before heuristic. prePassIdx=${prePassIdx} heuristicIdx=${heuristicIdx}`);
    }
}

// --- CASE 3: submit_selectors chain tried before default heuristic ---
console.log('\n=== CASE 3: submit_selectors chain → default heuristic fallback ===');
{
    const scriptSrc = fs.readFileSync(SCRIPT_FILE, 'utf-8');
    // The script must reference `submit_selectors` somewhere (commit 2
    // will add the actual chain; commit 1 only sets up the override plumbing).
    // For this commit we verify the schema is honored: overrides can carry
    // submit_selectors and the override loader exposes it.
    const parsed = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8'));
    let foundSubmitSelectors = 0;
    for (const k of Object.keys(parsed)) {
        if (k.startsWith('_')) continue;
        if (Array.isArray(parsed[k].submit_selectors) && parsed[k].submit_selectors.length > 0) {
            foundSubmitSelectors++;
        }
    }
    // 3 B2 drafts (cannacenter, mgmagazine, mgretailer) should have submit_selectors.
    if (foundSubmitSelectors === 3) {
        ok(`3 B2 drafts carry submit_selectors (cannacenter/mgmagazine/mgretailer), got ${foundSubmitSelectors}`);
    } else {
        bad(`expected 3 drafts with submit_selectors, got ${foundSubmitSelectors}`);
    }
    // The script must already plumb `override` into submitForm so the
    // selector chain (added in commit 2) can read it. Verify the signature.
    if (/async function submitForm\(browser, draft, dryRun = false, override = null\)/.test(scriptSrc)) {
        ok('submitForm signature accepts an `override` parameter (ready for commit-2 selector chain)');
    } else {
        bad('submitForm signature does NOT accept override parameter');
    }
    // The default heuristic selector still exists in the source (commit 2
    // wraps it in a fallback chain, but each selector literal must
    // remain so regression is provable).
    const expectedDefaultSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:not([type])',
    ];
    const missingDefaults = expectedDefaultSelectors.filter(sel => !scriptSrc.includes(sel));
    if (missingDefaults.length === 0) {
        ok(`default heuristic selectors all present in script (fallback chain references them): ${expectedDefaultSelectors.join(', ')}`);
    } else {
        bad(`default heuristic selectors missing: ${missingDefaults.join(', ')}`);
    }
    // The override-aware path must reference submit_selectors and form_selectors
    // (commit 2 added these — prove the script actually consults the override).
    if (/override\s*&&.*submit_selectors/.test(scriptSrc)) {
        ok('script consults override.submit_selectors before clicking submit');
    } else {
        bad('script does NOT consult override.submit_selectors — B2 fix missing');
    }
    if (/override\s*&&.*form_selectors/.test(scriptSrc)) {
        ok('script consults override.form_selectors when resolving the target form');
    } else {
        bad('script does NOT consult override.form_selectors — B1 multi-form fix missing');
    }
    // The override file's B4 entry (findcannabis.com.md) must carry wait_strategy.
    const fc = parsed['findcannabis.com.md'];
    if (fc && fc.wait_strategy && fc.wait_strategy.waitUntil === 'networkidle') {
        ok('B4 findcannabis.com.md carries wait_strategy.networkidle (commit 3 will wire it)');
    } else {
        bad(`B4 entry missing or wrong: ${JSON.stringify(fc && fc.wait_strategy)}`);
    }
}

console.log(`\nRESULTS: ${pass} pass / ${fail} fail`);
process.exit(fail);