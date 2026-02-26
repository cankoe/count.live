import { test, expect } from '@playwright/test';

test.describe('Countdown View', () => {
  test('navigating with date param shows countdown view', async ({ page }) => {
    await page.goto('/?date=2030-01-01T00:00:00&title=Test+Countdown');

    const countdown = page.locator('#countdown-view');
    await expect(countdown).toBeVisible();

    const builder = page.locator('#builder-view');
    await expect(builder).not.toBeVisible();
  });

  test('title displays correctly', async ({ page }) => {
    await page.goto('/?date=2030-01-01T00:00:00&title=Test+Countdown');

    const title = page.locator('#title');
    await expect(title).toHaveText('Test Countdown');
  });

  test('countdown digits are visible and non-zero for a future date', async ({ page }) => {
    await page.goto('/?date=2030-01-01T00:00:00&title=Future+Event');

    // Wait for countdown units to appear
    const units = page.locator('#countdown .unit');
    await expect(units.first()).toBeVisible();

    // At least one value should be non-zero
    const values = page.locator('#countdown .value');
    const count = await values.count();
    expect(count).toBeGreaterThan(0);

    // Collect all displayed values; at least one must be > 0
    let hasNonZero = false;
    for (let i = 0; i < count; i++) {
      const text = await values.nth(i).textContent();
      if (parseInt(text, 10) > 0) {
        hasNonZero = true;
        break;
      }
    }
    expect(hasNonZero).toBe(true);
  });

  test('past date shows end message', async ({ page }) => {
    await page.goto('/?date=2020-01-01T00:00:00&title=Past');

    const endMessage = page.locator('#countdown .end-message');
    await expect(endMessage).toBeVisible();
  });

  test('page title contains countdown info for active countdown', async ({ page }) => {
    await page.goto('/?date=2030-01-01T00:00:00&title=My+Event');

    // The page title should contain the event title, not the default builder title
    await expect(page).not.toHaveTitle('count.live - Free Online Countdown Timer | Create & Share');

    // It should contain the event name
    await expect(page).toHaveTitle(/My Event/);
  });
});
