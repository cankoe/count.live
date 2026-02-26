import { test, expect } from '@playwright/test';

test.describe('Countdown rendering', () => {
  test('countdown page loads and shows title', async ({ page }) => {
    await page.goto('/?date=2030-01-01&title=Smoke+Test');
    await expect(page.locator('body')).toContainText('Smoke Test');
  });

  test('builder page loads and is interactive', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#builder-view')).toBeVisible();
  });
});
