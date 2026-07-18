const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('NewsletterInvitation preserves the native Formspree and lead-tracker contract', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../NewsletterInvitation.astro'), 'utf8');
  assert.match(source, /action="https:\/\/formspree\.io\/f\/xvgzlowz"/);
  assert.match(source, /method="POST"/);
  assert.match(source, /<input type="email" name="email" required autocomplete="email" \/>/);
  assert.match(source, /<select name="stage">/);
  assert.match(source, /<input type="hidden" name="_subject" value="MDG homepage newsletter signup" \/>/);
  assert.match(source, /<button class="btn btn-primary newsletter-form__submit" type="submit" data-cta-id=\{submitCtaId\}>/);
  assert.match(source, /<LeadFormTracker\s+formSelector="\.newsletter-form"\s+formName="newsletter_homepage"\s*\/>/);
  assert.doesNotMatch(source, /preventDefault|fetch\(/);
});

test('LatestIntelligence renders a dated editorial list with a single index CTA', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../LatestIntelligence.astro'), 'utf8');
  assert.match(source, /<ol class="latest-intelligence__list">/);
  assert.match(source, /<time class="latest-intelligence__date" datetime=\{item\.date\}>/);
  assert.match(source, /<a class="latest-intelligence__link" href=\{item\.href\}>\{item\.title\}<\/a>/);
  assert.match(source, /allItems = items\.slice\(0, 8\)/);
  assert.match(source, /<a class="editorial-text-link" href="\/blog">Browse the research desk/);
});

test('TrustLayer renders methodology and corrections routes as compact proof links', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../TrustLayer.astro'), 'utf8');
  assert.match(source, /<ul class="trust-layer__list">/);
  assert.match(source, /aria-labelledby="trust-title"/);
  assert.match(source, /<a class="editorial-text-link" href=\{link\.href\}>/);
});