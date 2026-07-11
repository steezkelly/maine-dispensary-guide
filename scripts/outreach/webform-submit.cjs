#!/usr/bin/env node
/**
 * webform-submit.cjs — Playwright-based web-form submitter for MDG outreach.
 *
 * Reads drafts from /home/steve/pitches/drafts/*.md and submits the pitch body
 * to each draft's contact URL. Per-form dedup via a JSON log file. Per-form
 * failure isolation: one bad submission doesn't kill the rest.
 *
 * IMPORTANT: This script does NOT submit emails — only web forms. The pitch
 * is the body of the .md file (everything after the "---" separator).
 *
 * Dedup window: 60 minutes (matches send-email.cjs dedup window).
 *
 * Exit codes:
 *   0  all submissions attempted (each one succeeded, was skipped as dup,
 *      or was logged as a per-form failure — none caused process exit)
 *   1  catastrophic failure (Playwright not installed, log file unwritable,
 *      no drafts found)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DRAFTS_DIR = '/home/steve/pitches/drafts';
const LOG_FILE = '/home/steve/projects/maine-dispensary-guide/pitches/webform-sent-log.json';
const OVERRIDES_FILE = '/home/steve/projects/maine-dispensary-guide/pitches/webform-overrides.json';
const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 60 minutes

// Drafts to skip (no public contact form, or operator decision to skip)
const SKIP_LIST = new Set([
    'muckrack.com.md',  // journalist database, no public contact form
]);

/**
 * Load the per-draft overrides file. Returns {} if missing or malformed.
 * Schema:
 *   {
 *     "<draftFile.md>": {
 *       "url_override":     "https://...",         // alternate contact URL
 *       "form_selectors":   ["form#listing"],      // which form to target
 *       "submit_selectors": ["button.send-btn"],   // submit button selectors
 *       "field_map":        { name: "Steve", email: "steve@...", phone: null, ... },
 *       "wait_strategy":    { waitUntil: 'networkidle', waitForNavigation: true, ... },
 *       "extra_selectors":  { success: [...], error: [...] }
 *     }
 *   }
 */
function loadOverrides() {
    if (!fs.existsSync(OVERRIDES_FILE)) return {};
    try {
        const raw = fs.readFileSync(OVERRIDES_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (err) {
        console.error(`[WARN] Could not parse ${OVERRIDES_FILE}: ${err.message} — proceeding without overrides`);
        return {};
    }
}

/**
 * Parse a draft markdown file into structured fields.
 * Format:
 *   # Pitch — <name>
 *   **Type:** <type>
 *   **To:** <recipient/channel description>
 *   **From:** Steve Kelly, ...
 *   **Subject:** <subject>
 *   **Last reviewed:** <date>
 *   ---
 *   <body — the actual pitch text>
 */
function parseDraft(text) {
    const parts = text.split(/^---\s*$/m);
    const frontmatter = parts[0] || '';
    const body = (parts[1] || '').trim();

    const get = (key) => {
        const m = frontmatter.match(new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+)`, 'i'));
        return m ? m[1].trim() : null;
    };

    // Extract URL from the To: line — most reliable: take first http(s) URL
    const toLine = get('To') || '';
    const urlMatch = toLine.match(/https?:\/\/[^\s\)\,]+/);
    const url = urlMatch ? urlMatch[0].replace(/[.,;:\] ]+$/, '') : null;

    return {
        type: get('Type'),
        to: toLine,
        from: get('From'),
        subject: get('Subject'),
        url,
        body,
    };
}

function loadLog() {
    if (!fs.existsSync(LOG_FILE)) return { submissions: [] };
    try {
        return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    } catch {
        return { submissions: [] };
    }
}

function saveLog(log) {
    const tmp = LOG_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(log, null, 2));
    fs.renameSync(tmp, LOG_FILE);
}

function isDuplicate(log, draftFile, url) {
    const now = Date.now();
    return log.submissions.find(entry => {
        if (entry.draftFile !== draftFile) return false;
        if (entry.url !== url) return false;
        if (entry.status !== 'success' && entry.status !== 'attempted') return false;
        const sentAt = new Date(entry.timestamp).getTime();
        return (now - sentAt) < DEDUP_WINDOW_MS;
    });
}

/**
 * Submit one form. Returns {status, message, screenshot?}.
 *
 * Detection strategy for success (in order):
 *   1. URL change away from the form URL (redirect to thank-you page)
 *   2. Page contains success-indicator strings (case-insensitive)
 *   3. No error-indicator strings AND page loads normally
 *
 * Detection strategy for failure:
 *   1. URL stays on form URL AND error-indicator strings present
 *   2. Form validation messages visible (browser-native :invalid styling)
 *   3. HTTP error page (4xx/5xx status)
 *
 * Honeypot safety:
 *   - Never fill ANY input with `position:absolute` left:-9999px or
 *     `display:none` or `visibility:hidden` styling
 *   - Never fill inputs with `tabindex="-1"`
 *   - Never fill inputs with `autocomplete="off"` AND `name` containing
 *     `url`, `website`, `phone`, `address` (likely honeypots)
 */
async function submitForm(browser, draft, dryRun = false, override = null) {
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    // Apply url_override if set (B1 fix — alternate contact path)
    const targetUrl = (override && override.url_override) || draft.url;

    const result = {
        status: 'unknown',
        message: '',
        url: targetUrl,
        overrideApplied: !!override,
    };

    try {
        // 1. Navigate to the form URL
        const response = await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });

        if (!response) {
            result.status = 'fail';
            result.message = 'No response from URL';
            return result;
        }
        if (response.status() >= 400) {
            result.status = 'fail';
            result.message = `HTTP ${response.status()} on initial load`;
            return result;
        }

        // 2. Wait a beat for JS challenges (Cloudflare Turnstile, etc.)
        await page.waitForTimeout(2000);

        // 3. Find ALL forms on the page
        const forms = await page.$$('form');
        if (forms.length === 0) {
            result.status = 'fail';
            result.message = 'No <form> elements found on page';
            return result;
        }

        // 4. Resolve the target form. If the override specifies
        //    form_selectors (B1/B2 — pages with multiple forms or
        //    forms inside iframes), find by those selectors first.
        //    Otherwise fall back to the first form (or the first one
        //    with method=POST, as before).
        let targetForm = null;
        if (override && Array.isArray(override.form_selectors) && override.form_selectors.length > 0) {
            for (const sel of override.form_selectors) {
                try {
                    const f = await page.$(sel);
                    if (f) { targetForm = f; break; }
                } catch { /* invalid selector — try next */ }
            }
        }
        if (!targetForm) {
            targetForm = forms[0];
            for (const f of forms) {
                const method = await f.evaluate(el => (el.method || 'GET').toUpperCase());
                if (method === 'POST') { targetForm = f; break; }
            }
        }

        // 5. Inspect inputs in the form — identify honeypots vs real fields
        const fieldInfo = await targetForm.evaluate(form => {
            const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
            return inputs.map(inp => {
                const style = window.getComputedStyle(inp);
                const cs = inp.getBoundingClientRect();
                return {
                    tag: inp.tagName.toLowerCase(),
                    type: inp.type || null,
                    name: inp.name || null,
                    id: inp.id || null,
                    placeholder: inp.placeholder || null,
                    ariaLabel: inp.getAttribute('aria-label') || null,
                    required: inp.required || false,
                    // Honeypot detection
                    isHoneypot:
                        style.position === 'absolute' && parseFloat(style.left) < 0 ||
                        style.display === 'none' ||
                        style.visibility === 'hidden' ||
                        inp.tabIndex === -1 ||
                        (inp.autocomplete === 'off' && /url|website|phone|address/i.test(inp.name || '')),
                    // Position info (hidden honeypots are usually off-screen)
                    visible: cs.width > 0 && cs.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
                    value: inp.value || null,
                };
            });
        });

        const honeypots = fieldInfo.filter(f => f.isHoneypot);
        const visible = fieldInfo.filter(f => f.visible && !f.isHoneypot);

        if (dryRun) {
            result.status = 'dryrun';
            result.message = `form found, ${visible.length} visible fields, ${honeypots.length} honeypots (skipped)`;
            result.fieldInfo = fieldInfo;
            return result;
        }

        // 6. Fill visible fields by heuristic matching
        // Build the pitch body — first 500 chars for short fields, full body for message/textarea
        const shortBody = draft.body.length > 400
            ? draft.body.slice(0, 400) + '...'
            : draft.body;
        const fullBody = draft.body + '\n\n— Steve Kelly\nsteve.kelly@mainedispensaryguide.com\nMaine Dispensary Guide\nmainedispensaryguide.com';

        let filledCount = 0;

        // Resolve per-draft override (B3 field_map machinery).
        // field_map keys are matched against the field's name / id / aria-label
        // (case-insensitive exact match). A null value means "skip explicitly"
        // (honeypot / do-not-fill). An absent key falls through to the regex
        // heuristics below. Only fields present in field_map consume the entry;
        // fields with no entry fall through to heuristics unchanged.
        const fieldMap = (override && override.field_map) || null;
        // track which field_map keys we've consumed (so the heuristic doesn't
        // double-fill a field that the map already filled)
        const consumedFieldMapKeys = new Set();
        const matchFieldByMapKey = (mapKey) => {
            const k = String(mapKey).toLowerCase();
            for (const f of visible) {
                const candidates = [f.name, f.id, f.ariaLabel].filter(Boolean).map(s => String(s).toLowerCase());
                if (candidates.includes(k)) return f;
            }
            return null;
        };

        // Pre-pass: apply field_map entries that target a real, visible field.
        // Honeypots / skipped fields (null in the map) skip with a clear log line.
        if (fieldMap) {
            for (const [mapKey, mapVal] of Object.entries(fieldMap)) {
                if (mapVal === null) {
                    // Explicit null = skip. Do nothing, but record intent for logs.
                    consumedFieldMapKeys.add(String(mapKey).toLowerCase());
                    continue;
                }
                const target = matchFieldByMapKey(mapKey);
                if (!target) continue;
                consumedFieldMapKeys.add(String(mapKey).toLowerCase());
                try {
                    const selector = target.id
                        ? `#${target.id}`
                        : `[name="${target.name}"]`;
                    await page.fill(selector, String(mapVal));
                    filledCount++;
                } catch (e) {
                    // Selector may have changed (or be inside an iframe); skip silently
                }
            }
        }

        for (const field of visible) {
            // If field_map already handled this field (exact name/id/aria match), skip heuristic
            const fieldKeys = [field.name, field.id, field.ariaLabel]
                .filter(Boolean).map(s => String(s).toLowerCase());
            if (fieldKeys.some(k => consumedFieldMapKeys.has(k))) continue;

            let value = null;
            const nameL = (field.name || '').toLowerCase();
            const placeholderL = (field.placeholder || '').toLowerCase();
            const idL = (field.id || '').toLowerCase();

            if (field.tag === 'textarea' ||
                /message|comment|body|note|inquiry|question|pitch|content|message_body/i.test(nameL + placeholderL + idL)) {
                value = fullBody;
            } else if (field.type === 'email' || /email/i.test(nameL + placeholderL + idL)) {
                value = 'steve.kelly@mainedispensaryguide.com';
            } else if (field.type === 'tel' || /phone|tel/i.test(nameL + placeholderL + idL)) {
                continue; // skip phone fields — don't fill honeypots or required-but-unwanted
            } else if (/name/i.test(nameL + placeholderL + idL) && !/company|business|brand|publication/i.test(nameL + placeholderL + idL)) {
                value = 'Steve Kelly';
            } else if (/company|business|brand|publication|org/i.test(nameL + placeholderL + idL)) {
                value = 'Maine Dispensary Guide';
            } else if (/subject|title|topic/i.test(nameL + placeholderL + idL)) {
                value = draft.subject || 'Maine Dispensary Guide partnership inquiry';
            } else if (/website|url|site/i.test(nameL + placeholderL + idL)) {
                value = 'https://mainedispensaryguide.com';
            } else if (/city|town|location|state/i.test(nameL + placeholderL + idL)) {
                value = 'Portland, Maine';
            } else if (field.type === 'text' || field.tag === 'textarea') {
                // Default for unlabeled text fields
                value = fullBody;
            }

            if (value) {
                try {
                    await page.fill(`[name="${field.name}"]`, value);
                    filledCount++;
                } catch (e) {
                    // field may have changed; try by id
                    if (field.id) {
                        try {
                            await page.fill(`#${field.id}`, value);
                            filledCount++;
                        } catch {}
                    }
                }
            }
        }

        // 7. Click submit button. If override provides submit_selectors
        //    (B2 — non-standard submit elements like .send-btn, a.btn-submit,
        //    div[role=button], JS-bound onclick), try each one first, then
        //    fall back to the default heuristic chain. Click happens via
        //    page.evaluate on the form so we can iterate selectors.
        const submitClicked = await targetForm.evaluate((form, customSelectors) => {
            const trySelectors = (sels) => {
                for (const sel of sels) {
                    let el = null;
                    try { el = form.querySelector(sel); } catch { /* invalid selector */ }
                    if (el) { el.click(); return sel; }
                }
                return null;
            };
            if (Array.isArray(customSelectors) && customSelectors.length > 0) {
                const hit = trySelectors(customSelectors);
                if (hit) return hit;
            }
            // Default heuristic fallback
            const fallback = trySelectors([
                'button[type="submit"]',
                'input[type="submit"]',
                'button:not([type])',
            ]);
            return fallback;
        }, (override && Array.isArray(override.submit_selectors)) ? override.submit_selectors : null);

        if (!submitClicked) {
            result.status = 'fail';
            result.message = 'No submit button found in form';
            return result;
        }
        // Annotate which selector path actually fired (override vs default)
        // — useful for the dedup log and for the human-review screenshot path.
        if (override && Array.isArray(override.submit_selectors) && override.submit_selectors.includes(submitClicked)) {
            result.submitSelectorSource = 'override';
        } else {
            result.submitSelectorSource = 'default';
        }
        result.submitSelector = submitClicked;

        // 8. Wait for navigation/response. If override.wait_strategy.waitUntil
        //    is set, use that value; otherwise default to 'networkidle'.
        //    Per-draft control is what unblocks the B4 SPA forms
        //    (findcannabis.com's claim-your-listing page destroys the
        //    execution context on submit; 'networkidle' is the right wait).
        const waitUntil = (override && override.wait_strategy && override.wait_strategy.waitUntil) || 'networkidle';
        try {
            await page.waitForLoadState(waitUntil, { timeout: 15000 });
        } catch {
            // Some forms don't navigate; continue
        }
        await page.waitForTimeout(2000);

        // 9. Detect success/failure via DOM selectors, NOT text substring matching.
        //    Substring matching for "error"/"success" produces false positives because
        //    those words appear in any GravityForms/WordPress JS bundle even when
        //    the form actually succeeded. We use explicit selectors for known form
        //    frameworks + a generic "visible success-message element" check.
        const finalUrl = page.url();
        const urlChanged = finalUrl !== draft.url;

        // Take a screenshot for human review of ambiguous cases
        let screenshotPath = null;
        const takeScreenshot = async () => {
            try {
                screenshotPath = `/tmp/webform-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
                await page.screenshot({ path: screenshotPath, fullPage: false });
            } catch {}
        };

        // Selector-based detection. Each selector targets a known form framework's
        // success indicator. Returns the selector that matched, or null.
        const detectResult = await page.evaluate(() => {
            const isVisible = (el) => {
                if (!el) return false;
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style.display !== 'none'
                    && style.visibility !== 'hidden'
                    && parseFloat(style.opacity) > 0
                    && rect.width > 0
                    && rect.height > 0;
            };

            // 1. GravityForms (WordPress) — confirmation message element
            const gfConfirmation = document.querySelector('.gform_confirmation_message');
            if (isVisible(gfConfirmation)) {
                return { kind: 'success', source: 'gform_confirmation_message', text: gfConfirmation.textContent.trim().slice(0, 200) };
            }

            // 2. Contact Form 7 (WordPress) — sent-ok class
            const cf7Sent = document.querySelector('.wpcf7-mail-sent-ok, .wpcf7-response-output.wpcf7-mail-sent-ok');
            if (isVisible(cf7Sent)) {
                return { kind: 'success', source: 'cf7_sent_ok', text: cf7Sent.textContent.trim().slice(0, 200) };
            }

            // 3. WPForms — confirmation message
            const wpformsConfirmation = document.querySelector('.wpforms-confirmation-container, .wpforms-confirmation');
            if (isVisible(wpformsConfirmation)) {
                return { kind: 'success', source: 'wpforms_confirmation', text: wpformsConfirmation.textContent.trim().slice(0, 200) };
            }

            // 4. Generic — element with role=alert containing success-ish text
            const alerts = document.querySelectorAll('[role="alert"], .alert, .success, .confirmation, .thank-you, [data-success]');
            for (const el of alerts) {
                if (!isVisible(el)) continue;
                const text = el.textContent.toLowerCase();
                if (/thank|received|success|got it|we('ll| will) (be in touch|respond|reply)|message (sent|received)/i.test(text)) {
                    return { kind: 'success', source: 'generic_alert', text: el.textContent.trim().slice(0, 200) };
                }
            }

            // 5. Error detection — visible validation error near fields
            //    Look for elements with role=alert or .error class near form fields
            const errorEls = document.querySelectorAll('[role="alert"], .gfield_error, .gform_validation_error, .error, .invalid, .help-block');
            let visibleErrors = [];
            for (const el of errorEls) {
                if (isVisible(el)) {
                    const text = el.textContent.trim();
                    if (text.length > 0 && text.length < 200) {
                        visibleErrors.push(text);
                    }
                }
            }
            if (visibleErrors.length > 0) {
                return { kind: 'fail', source: 'visible_error', errors: visibleErrors };
            }

            // 6. URL changed away from form URL AND no visible errors — likely success
            //    (Many forms redirect to /thanks or similar)
            if (urlChanged) {
                return { kind: 'success', source: 'url_change', text: `redirected to ${window.location.href}` };
            }

            return { kind: 'ambiguous', source: 'none' };
        });

        // Wire up the screenshot path for the result
        result.screenshot = screenshotPath;

        // Log the detection result
        result.detection = detectResult;

        if (detectResult.kind === 'success') {
            result.status = 'success';
            result.message = `Success via ${detectResult.source}: ${detectResult.text || ''} (filled ${filledCount} fields, skipped ${honeypots.length} honeypots)`;
        } else if (detectResult.kind === 'fail') {
            result.status = 'fail';
            result.message = `Visible validation errors: ${detectResult.errors.slice(0, 3).join(' | ')}`;
        } else {
            // Ambiguous — take screenshot for human review
            await takeScreenshot();
            result.status = 'attempted';
            result.message = `Ambiguous result (filled ${filledCount} fields, skipped ${honeypots.length} honeypots). Screenshot saved: ${screenshotPath || 'FAILED'}`;
        }
    } catch (err) {
        result.status = 'fail';
        result.message = `Exception: ${err.message}`;
    } finally {
        await context.close();
    }

    return result;
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const singleDraft = args.find(a => a.startsWith('--draft='))?.split('=')[1];
    const forceResend = args.includes('--force-resend');

    // 1. Load drafts
    if (!fs.existsSync(DRAFTS_DIR)) {
        console.error(`[FAIL] drafts directory not found: ${DRAFTS_DIR}`);
        process.exit(1);
    }

    const allFiles = fs.readdirSync(DRAFTS_DIR).filter(f =>
        f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md'
    );
    const drafts = allFiles
        .filter(f => !SKIP_LIST.has(f))
        .map(f => {
            const text = fs.readFileSync(path.join(DRAFTS_DIR, f), 'utf-8');
            return { file: f, ...parseDraft(text) };
        })
        .filter(d => d.url); // skip drafts without parseable URLs

    if (singleDraft) {
        const single = drafts.find(d => d.file === singleDraft);
        if (!single) {
            console.error(`[FAIL] draft not found: ${singleDraft}`);
            process.exit(1);
        }
        drafts.length = 0;
        drafts.push(single);
    }

    if (drafts.length === 0) {
        console.error('[FAIL] no drafts with parseable URLs found');
        process.exit(1);
    }

    console.log(`[INFO] ${drafts.length} draft(s) loaded${dryRun ? ' (DRY RUN)' : ''}`);
    console.log(`[INFO] Skipped: ${[...SKIP_LIST].join(', ') || 'none'}`);

    // 2. Load per-draft overrides (B3/B2/B4 machinery)
    const overrides = loadOverrides();
    const overrideKeys = Object.keys(overrides);
    if (overrideKeys.length > 0) {
        console.log(`[INFO] Loaded ${overrideKeys.length} per-draft override(s) from ${OVERRIDES_FILE}`);
    } else {
        console.log(`[INFO] No overrides file at ${OVERRIDES_FILE} — all drafts use default heuristic`);
    }

    // 3. Load dedup log
    const log = loadLog();
    if (forceResend) {
        console.log('[INFO] --force-resend: ignoring dedup window');
    }

    // 3. Launch browser — try the bundled chromium first, fall back to
    // any version in the cache (the cache has chromium-1228 but the
    // MDG-installed playwright wants 1223).
    let browser;
    const candidates = [
        '/home/steve/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
        '/home/steve/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell',
    ];
    try {
        const fs2 = require('fs');
        const exe = candidates.find(p => fs2.existsSync(p));
        if (exe) {
            console.log(`[INFO] Using cached chromium: ${exe}`);
            browser = await chromium.launch({
                headless: true,
                executablePath: exe,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        } else {
            browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        }
    } catch (err) {
        console.error(`[FAIL] Playwright launch failed: ${err.message}`);
        process.exit(1);
    }

    // 4. Process each draft
    let success = 0, attempted = 0, failed = 0, skipped = 0;
    for (const draft of drafts) {
        if (!forceResend && isDuplicate(log, draft.file, draft.url)) {
            console.log(`[SKIP] ${draft.file}: dedup hit (sent within last 60 min)`);
            skipped++;
            continue;
        }

        const draftOverride = overrides[draft.file] || null;
        if (draftOverride) {
            const keys = Object.keys(draftOverride);
            console.log(`[${dryRun ? 'DRY' : 'SEND'}] ${draft.file} → ${draft.url} (override: ${keys.join(', ')})`);
        } else {
            console.log(`[${dryRun ? 'DRY' : 'SEND'}] ${draft.file} → ${draft.url}`);
        }
        const result = await submitForm(browser, draft, dryRun, draftOverride);

        if (result.status === 'success') { success++; console.log(`  ✓ ${result.message}`); }
        else if (result.status === 'attempted') { attempted++; console.log(`  ⚠ ${result.message}`); }
        else if (result.status === 'fail') { failed++; console.log(`  ✗ ${result.message}`); }
        else if (result.status === 'dryrun') { console.log(`  ◇ ${result.message}`); }

        // Log every attempt (success, attempted, fail, dryrun) for dedup tracking
        if (!dryRun && (result.status === 'success' || result.status === 'attempted' || result.status === 'fail')) {
            log.submissions.push({
                draftFile: draft.file,
                url: draft.url,
                status: result.status,
                message: result.message,
                timestamp: new Date().toISOString(),
            });
            saveLog(log);
        }
    }

    await browser.close();

    console.log(`\n=== Summary ===`);
    console.log(`Total drafts: ${drafts.length}`);
    console.log(`Skipped (dedup): ${skipped}`);
    if (!dryRun) {
        console.log(`Success: ${success}`);
        console.log(`Attempted (ambiguous): ${attempted}`);
        console.log(`Failed: ${failed}`);
        console.log(`Log: ${LOG_FILE}`);
    }
}

main().catch(err => {
    console.error(`[FATAL] ${err.message}`);
    process.exit(1);
});