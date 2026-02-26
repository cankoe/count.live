import { test, expect } from '@playwright/test';

test.describe('Health checks', () => {
  test('homepage returns 200 with valid HTML containing "count.live"', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain('count.live');
    expect(body).toMatch(/<html[\s>]/i);
  });

  test('security headers are present', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);

    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  test('static assets loadable', async ({ request }) => {
    const css = await request.get('/styles.css');
    expect(css.status()).toBe(200);

    const js = await request.get('/script.js');
    expect(js.status()).toBe(200);
  });

  test('service worker /sw.js returns 200', async ({ request }) => {
    const response = await request.get('/sw.js');
    expect(response.status()).toBe(200);
  });
});
