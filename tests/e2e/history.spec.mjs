import { test, expect } from '@playwright/test';

test.describe('Countdown History', () => {
  test('visiting a countdown saves it to history on builder page', async ({ page }) => {
    // Visit a countdown first
    await page.goto('/?date=2030-01-01T00:00:00&title=History+Test');
    await expect(page.locator('#countdown-view')).toBeVisible();

    // Go back to builder
    await page.goto('/');
    await expect(page.locator('#builder-view')).toBeVisible();

    // History section should be visible with the countdown we just visited
    const section = page.locator('#history-section');
    await expect(section).toBeVisible();

    const card = page.locator('.history-card').first();
    await expect(card).toBeVisible();
  });

  test('history cards show iframe previews', async ({ page }) => {
    await page.goto('/?date=2030-01-01T00:00:00&title=Preview+Test');
    await page.goto('/');

    const iframe = page.locator('.history-iframe-wrap iframe').first();
    await expect(iframe).toBeAttached();
  });

  test('clicking delete removes a history card', async ({ page }) => {
    // Start clean
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('countdownHistory'));

    // Visit two countdowns
    await page.goto('/?date=2030-01-01T00:00:00&title=Keep+Me');
    await page.goto('/?date=2030-06-01T00:00:00&title=Delete+Me');
    await page.goto('/');

    const cards = page.locator('.history-card');
    await expect(cards).toHaveCount(2);

    // Click delete button (force: true since it's opacity:0 until hover)
    await cards.first().locator('.history-delete').click({ force: true });

    await expect(cards).toHaveCount(1);
  });

  test('clear button removes all history', async ({ page }) => {
    await page.goto('/?date=2030-01-01T00:00:00&title=Clear+Test');
    await page.goto('/');

    await expect(page.locator('#history-section')).toBeVisible();
    await page.locator('#history-clear').click();
    await expect(page.locator('#history-section')).not.toBeVisible();
  });

  test('history section is hidden when no history exists', async ({ page }) => {
    // Clear any existing history
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('countdownHistory'));
    await page.reload();

    await expect(page.locator('#history-section')).not.toBeVisible();
  });
});
