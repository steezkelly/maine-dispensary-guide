/**
 * tests/test-detector.cjs — regression test for webform-submit.cjs's
 * success/failure detection heuristic.
 *
 * Per the 2026-07-10 incident where the substring-match heuristic produced
 * 12+ false negatives on GravityForms/WordPress forms (because those frameworks'
 * JS bundles contain the string "error" even on success pages), this test
 * proves the new DOM-selector-based detector works correctly.
 *
 * Run with: node tests/test-detector.cjs
 * Exit 0 = all 4 detector cases pass.
 * Exit 1 = at least one case failed.
 *
 * NOTE: The detector function is duplicated here (not imported) so this
 * test is self-contained and doesn't require Playwright to be loaded into
 * the production script's import graph. If webform-submit.cjs's detector
 * changes, update the DETECTOR constant here to match.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Detector function — MUST mirror the one in scripts/outreach/webform-submit.cjs
const DETECTOR = `
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

const gfConfirmation = document.querySelector('.gform_confirmation_message');
if (isVisible(gfConfirmation)) return { kind: 'success', source: 'gform_confirmation_message', text: gfConfirmation.textContent.trim().slice(0, 200) };

const cf7Sent = document.querySelector('.wpcf7-mail-sent-ok, .wpcf7-response-output.wpcf7-mail-sent-ok');
if (isVisible(cf7Sent)) return { kind: 'success', source: 'cf7_sent_ok', text: cf7Sent.textContent.trim().slice(0, 200) };

const wpformsConfirmation = document.querySelector('.wpforms-confirmation-container, .wpforms-confirmation');
if (isVisible(wpformsConfirmation)) return { kind: 'success', source: 'wpforms_confirmation', text: wpformsConfirmation.textContent.trim().slice(0, 200) };

const alerts = document.querySelectorAll('[role="alert"], .alert, .success, .confirmation, .thank-you, [data-success]');
for (const el of alerts) {
    if (!isVisible(el)) continue;
    const text = el.textContent.toLowerCase();
    if (/thank|received|success|got it|we('ll| will) (be in touch|respond|reply)|message (sent|received)/i.test(text)) {
        return { kind: 'success', source: 'generic_alert', text: el.textContent.trim().slice(0, 200) };
    }
}

const errorEls = document.querySelectorAll('[role="alert"], .gfield_error, .gform_validation_error, .error, .invalid, .help-block');
let visibleErrors = [];
for (const el of errorEls) {
    if (isVisible(el)) {
        const text = el.textContent.trim();
        if (text.length > 0 && text.length < 200) visibleErrors.push(text);
    }
}
if (visibleErrors.length > 0) return { kind: 'fail', source: 'visible_error', errors: visibleErrors };

return { kind: 'ambiguous', source: 'none' };
`;

const TEST_CASES = [
    {
        name: 'GravityForms success page',
        html: `<!DOCTYPE html><html><body><div class="gform_confirmation_message">Thanks for contacting us! We will get in touch with you shortly.</div></body></html>`,
        expected: { kind: 'success', source: 'gform_confirmation_message' },
    },
    {
        name: 'Contact Form 7 success',
        html: `<!DOCTYPE html><html><body><div class="wpcf7-mail-sent-ok">Your message was sent successfully.</div></body></html>`,
        expected: { kind: 'success', source: 'cf7_sent_ok' },
    },
    {
        name: 'Visible validation error',
        html: `<!DOCTYPE html><html><body><div class="gform_validation_error" style="display:block;visibility:visible;opacity:1">There was a problem with your submission.</div></body></html>`,
        expected: { kind: 'fail', source: 'visible_error' },
    },
    {
        name: 'Ambiguous page (no markers)',
        html: `<!DOCTYPE html><html><body><div>Just some page with no form indicators.</div></body></html>`,
        expected: { kind: 'ambiguous', source: 'none' },
    },
];

async function main() {
    const candidates = [
        '/home/steve/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
        '/home/steve/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell',
    ];
    const exe = candidates.find(p => fs.existsSync(p));
    if (!exe) {
        console.error('[FAIL] No cached chromium binary found');
        process.exit(1);
    }
    const browser = await chromium.launch({
        headless: true,
        executablePath: exe,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    let pass = 0, fail = 0;
    const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'webform-test-'));

    for (const tc of TEST_CASES) {
        const page = await browser.newPage();
        const htmlPath = path.join(tmpDir, 'tc.html');
        fs.writeFileSync(htmlPath, tc.html);
        await page.goto(`file://${htmlPath}`);

        const result = await page.evaluate(new Function(`return (function() { ${DETECTOR} })()`));

        const ok = result.kind === tc.expected.kind && result.source === tc.expected.source;
        if (ok) {
            console.log(`  ✓ ${tc.name}: ${result.kind}/${result.source}`);
            pass++;
        } else {
            console.log(`  ✗ ${tc.name}: expected ${tc.expected.kind}/${tc.expected.source}, got ${result.kind}/${result.source}`);
            console.log(`    result: ${JSON.stringify(result)}`);
            fail++;
        }
        await page.close();
    }

    await browser.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });

    console.log(`\nRESULTS: ${pass} pass / ${fail} fail`);
    process.exit(fail);
}

main().catch(err => {
    console.error(`[FATAL] ${err.message}`);
    process.exit(1);
});
