import { test, expect } from '@playwright/test';

test.describe('OG Tags and Social Metadata', () => {
  test('HTML contains og:title meta tag with the countdown title', async ({ request }) => {
    const response = await request.get('/?date=2030-01-01T00:00:00&title=OG+Test');
    const html = await response.text();

    expect(html).toContain('og:title');
    expect(html).toContain('OG Test');
  });

  test('HTML contains og:image pointing to favicon-og.png', async ({ request }) => {
    const response = await request.get('/?date=2030-01-01T00:00:00&title=OG+Test');
    const html = await response.text();

    expect(html).toContain('og:image');
    expect(html).toContain('favicon-og.png');
  });
});
