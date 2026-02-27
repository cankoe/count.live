import { test, expect } from '@playwright/test';

test.describe('Open Graph', () => {
  test('countdown URL returns HTML with og:title meta tag', async ({ page }) => {
    await page.goto('/?date=2030-01-01&title=SmokeTest');

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
  });

  test('/og-image returns SVG image', async ({ page }) => {
    const response = await page.goto('/og-image?title=SmokeTest');
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('image/svg+xml');
  });
});
