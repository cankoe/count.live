import { test, expect } from '@playwright/test';

test.describe('Open Graph', () => {
  test('countdown URL has og:title meta tag', async ({ page }) => {
    await page.goto('/?date=2030-01-01&title=SmokeTest');
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
  });

  test('favicon-og.png is loadable', async ({ page }) => {
    const response = await page.goto('/favicon-og.png');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  });
});
