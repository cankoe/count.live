import { test, expect } from '@playwright/test';

test.describe('Embed Mode', () => {
  test('embed=1 param adds embed-mode class to body', async ({ page }) => {
    await page.goto('/?date=2030-01-01T00:00:00&embed=1');

    const body = page.locator('body');
    await expect(body).toHaveClass(/embed-mode/);
  });

  test('embed mode hides builder elements and corner actions are minimal', async ({ page }) => {
    await page.goto('/?date=2030-01-01T00:00:00&embed=1');

    // Builder should not be visible in embed mode
    const builder = page.locator('#builder-view');
    await expect(builder).not.toBeVisible();

    // Countdown should be visible
    const countdown = page.locator('#countdown-view');
    await expect(countdown).toBeVisible();
  });
});
