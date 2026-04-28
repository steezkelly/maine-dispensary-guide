import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.PREVIEW_URL || 'https://mainedispensaryguide.com';

test.describe('Smoke Tests', () => {
  test('homepage loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    expect(errors.filter(e => !e.includes('vercel.com/api'))).toHaveLength(0);
  });

  test('homepage has correct aria-label on stage selector', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const select = page.locator('select').first();
    const ariaLabel = await select.getAttribute('aria-label');
    expect(ariaLabel).toBe('Which best describes you?');
  });

  test('homepage has hero section with PineTree icons', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const pineTreeSvgs = page.locator('svg');
    await expect(pineTreeSvgs.first()).toBeVisible();
  });

  test('homepage title is correct', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/How to Open a Maine Dispensary/);
  });

  test('download/founders-bible page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE_URL}/download/founders-bible`);
    await page.waitForLoadState('networkidle');

    const relevantErrors = errors.filter(e =>
      !e.includes('vercel.com/api') &&
      !e.includes('Failed to load resource')
    );
    expect(relevantErrors).toHaveLength(0);
    const h1 = page.locator('h1').first();
    await expect(h1).toBeAttached();
  });

  test('newsletter page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE_URL}/newsletter`);
    await page.waitForLoadState('networkidle');

    const relevantErrors = errors.filter(e =>
      !e.includes('vercel.com/api') &&
      !e.includes('Failed to load resource')
    );
    expect(relevantErrors).toHaveLength(0);
    const h1 = page.locator('h1').first();
    await expect(h1).toBeAttached();
  });

  test('newsletter page has PineTree icons', async ({ page }) => {
    await page.goto(`${BASE_URL}/newsletter`);
    await page.waitForLoadState('networkidle');

    const svgs = page.locator('svg');
    await expect(svgs.first()).toBeVisible();
    const svgCount = await svgs.count();
    expect(svgCount).toBeGreaterThan(0);
  });

  test('guides index page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE_URL}/guides`);
    await page.waitForLoadState('networkidle');

    expect(errors.filter(e => !e.includes('vercel.com/api'))).toHaveLength(0);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('portland dispensary guide loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE_URL}/guides/portland-dispensary-guide`);
    await page.waitForLoadState('networkidle');

    expect(errors.filter(e => !e.includes('vercel.com/api'))).toHaveLength(0);
    await expect(page.locator('article')).toBeVisible();
  });

  test('no broken hero images (404s)', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('response', response => {
      if (response.status() === 404 && response.url().includes('/images/')) {
        failedRequests.push(response.url());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    expect(failedRequests).toHaveLength(0);
  });
});

test.describe('Accessibility Quick Checks', () => {
  test('homepage has skip link', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('a[href="#main-content"]')).toBeAttached();
  });

  test('homepage stage selector has aria-label', async ({ page }) => {
    await page.goto(BASE_URL);
    const select = page.locator('select').first();
    await expect(select).toHaveAttribute('aria-label');
  });
});