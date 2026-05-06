import { test, expect } from '@playwright/test';

test.describe('Sharing and Export', () => {
  test('copy button exists on builder page when a URL is generated', async ({ page }) => {
    await page.goto('/');

    // Set a date so the URL output is populated
    const dateInput = page.locator('#b-date');
    await dateInput.fill('2030-06-15T12:00');

    // The copy button should be present in the builder
    const copyBtn = page.locator('#copy-btn');
    await expect(copyBtn).toBeVisible();
  });

  test('calendar action is available from more actions on the builder page', async ({ page }) => {
    await page.goto('/');

    await page.locator('#publish-more summary').click();

    const calendarBtn = page.locator('#calendar-btn');
    await expect(calendarBtn).toBeVisible();
  });
});
