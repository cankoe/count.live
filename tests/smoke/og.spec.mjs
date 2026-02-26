import { test, expect } from '@playwright/test';

test.describe('Open Graph', () => {
  test('countdown URL returns HTML with og:title meta tag', async ({ request }) => {
    const response = await request.get('/?date=2030-01-01&title=SmokeTest');
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toMatch(/<meta[^>]+property=["']og:title["'][^>]*>/i);
  });

  test('/og-image returns SVG image', async ({ request }) => {
    const response = await request.get('/og-image?title=SmokeTest');
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('image/svg+xml');
  });
});
