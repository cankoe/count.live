import { test, expect } from '@playwright/test';

test.describe('Builder View', () => {
  test('homepage loads and shows builder when no date param is present', async ({ page }) => {
    await page.goto('/');

    const builder = page.locator('#builder-view');
    await expect(builder).toBeVisible();

    const countdown = page.locator('#countdown-view');
    await expect(countdown).not.toBeVisible();
  });

  test('builder form has date and title inputs', async ({ page }) => {
    await page.goto('/');

    const dateInput = page.locator('#b-date');
    await expect(dateInput).toBeVisible();

    const titleInput = page.locator('#b-title');
    await expect(titleInput).toBeVisible();
  });

  test('typing a title updates the URL output in real time', async ({ page }) => {
    await page.goto('/');

    // Set a date first so the URL output has content
    const dateInput = page.locator('#b-date');
    await dateInput.fill('2030-06-15T12:00');

    const titleInput = page.locator('#b-title');
    await titleInput.fill('My Test Event');

    const urlOutput = page.locator('#url-output');
    await expect(urlOutput).toContainText('My%20Test%20Event');
  });

  test('theme preset buttons exist and are clickable', async ({ page }) => {
    await page.goto('/');

    // Theme presets are rendered dynamically into #theme-presets
    const themePresets = page.locator('#theme-presets');
    await expect(themePresets).toBeVisible();

    // There should be multiple theme buttons (dark, light, neon, pastel, ocean, sunset, forest)
    const themeButtons = themePresets.locator('.theme-btn');
    await expect(themeButtons).toHaveCount(7);

    // Click a theme button and verify it does not throw
    await themeButtons.first().click();
  });

  test('setting a date updates the URL output', async ({ page }) => {
    await page.goto('/');

    const dateInput = page.locator('#b-date');
    await dateInput.fill('2030-12-25T00:00');

    const urlOutput = page.locator('#url-output');
    await expect(urlOutput).toContainText('2030-12-25');
  });
});
