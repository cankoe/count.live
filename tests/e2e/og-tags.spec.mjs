import { test, expect } from '@playwright/test';

test.describe('OG Tags and Social Metadata', () => {
  test('HTML contains og:title meta tag with the countdown title', async ({ request }) => {
    const response = await request.get('/?date=2030-01-01T00:00:00&title=OG+Test');
    const html = await response.text();

    // The worker injects og:title with the title param value
    expect(html).toContain('og:title');
    expect(html).toContain('OG Test');
  });

  test('HTML contains og:image meta tag with image URL', async ({ request }) => {
    const response = await request.get('/?date=2030-01-01T00:00:00&title=OG+Test');
    const html = await response.text();

    // The worker injects og:image pointing to /og-image endpoint
    expect(html).toContain('og:image');
    expect(html).toContain('/og-image');
  });

  test('/og-image endpoint returns SVG image', async ({ request }) => {
    const response = await request.get('/og-image?title=Test');

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('image/svg+xml');
  });

  test('/og-image includes formatted target date', async ({ request }) => {
    const response = await request.get('/og-image?title=Test&date=2027-01-01T00:00:00');
    const svg = await response.text();

    expect(svg).toContain('January');
    expect(svg).toContain('2027');
  });

  test('/og-image includes count.live branding', async ({ request }) => {
    const response = await request.get('/og-image?title=Test');
    const svg = await response.text();

    expect(svg).toContain('count.live');
  });
});
