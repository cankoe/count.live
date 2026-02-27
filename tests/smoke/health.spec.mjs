import { test, expect } from '@playwright/test';

test.describe('Health checks', () => {
  test('homepage loads with valid HTML containing "count.live"', async ({ page }) => {
    const response = await page.goto('/');
    expect(response.status()).toBe(200);

    const body = await page.content();
    expect(body).toContain('count.live');
    expect(body).toMatch(/<html[\s>]/i);
  });

  test('security headers are present', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('static assets loadable', async ({ page }) => {
    // Navigate first to establish context, then fetch assets
    const cssResponse = await page.goto('/styles.css');
    expect(cssResponse.status()).toBe(200);

    const jsResponse = await page.goto('/script.js');
    expect(jsResponse.status()).toBe(200);
  });

  test('service worker /sw.js returns 200', async ({ page }) => {
    const response = await page.goto('/sw.js');
    expect(response.status()).toBe(200);
  });
});
