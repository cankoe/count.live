import { test, expect } from '@playwright/test';

test.describe('Themes and Styling', () => {
  test('custom bg and fg colors are applied via URL params', async ({ page }) => {
    await page.goto('/?date=2030-01-01T00:00:00&bg=ff0000&fg=00ff00');

    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(255, 0, 0)');
    await expect(body).toHaveCSS('color', 'rgb(0, 255, 0)');
  });

  test('font param applies the correct font family', async ({ page }) => {
    await page.goto('/?date=2030-01-01T00:00:00&font=mono');

    const body = page.locator('body');
    const fontFamily = await body.evaluate((el) => getComputedStyle(el).fontFamily);

    // The mono font stack includes 'SF Mono' and 'Courier New'
    const hasMono = fontFamily.includes('Courier New') || fontFamily.includes('SF Mono') || fontFamily.includes('monospace');
    expect(hasMono).toBe(true);
  });

  test('favicon is updated to a dynamic data URI', async ({ page }) => {
    await page.goto('/?date=2030-01-01T00:00:00&bg=ff0000&fg=00ff00');

    // The script updates the favicon to a data:image/svg+xml URI
    const faviconHref = await page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute('href');
    expect(faviconHref).toContain('data:image/svg');
  });
});
