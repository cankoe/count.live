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

  test('clicking delete removes a history card', async ({ page }) => {
    // Start clean — clear storage then seed exactly 2 entries
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('countdownHistory', JSON.stringify([
        { url: 'https://count.live/?date=2030-01-01T00:00:00&title=First', title: 'First', date: '2030-01-01T00:00:00', bg: '1a1a2e', fg: 'ffffff', visitedAt: 1 },
        { url: 'https://count.live/?date=2030-06-01T00:00:00&title=Second', title: 'Second', date: '2030-06-01T00:00:00', bg: '1a1a2e', fg: 'ffffff', visitedAt: 2 },
      ]));
    });
    await page.reload();

    const cards = page.locator('.history-card');
    await expect(cards).toHaveCount(2);

    // Trigger delete on first card via JS
    await page.evaluate(() => {
      document.querySelector('.history-delete').dispatchEvent(new MouseEvent('click', { bubbles: false }));
    });

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
