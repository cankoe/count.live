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
    await expect(urlOutput).toHaveAttribute('title', /My%20Test%20Event/);
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
    await expect(urlOutput).toHaveAttribute('title', /2030-12-25/);
  });

  test('documentation accordion expands to full content height', async ({ page }) => {
    await page.goto('/');

    const docHeader = page.locator('#builder-help .accordion-item').first().locator('.accordion-header');
    await docHeader.click();

    const docContent = page.locator('#builder-help .accordion-item').first().locator('.accordion-content');
    await expect(docContent).toBeVisible();

    const fullyExpanded = await docContent.evaluate((el) => {
      const maxHeight = parseFloat(el.style.maxHeight);
      return Number.isFinite(maxHeight) ? maxHeight >= el.scrollHeight - 2 : false;
    });

    expect(fullyExpanded).toBeTruthy();
  });

  test('examples section is collapsible and placed below recent', async ({ page }) => {
    await page.goto('/');

    const isBelowRecent = await page.evaluate(() => {
      const recent = document.getElementById('history-section');
      const examples = document.getElementById('builder-examples');
      if (!recent || !examples) return false;
      return Boolean(recent.compareDocumentPosition(examples) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(isBelowRecent).toBeTruthy();

    const examplesItem = page.locator('#builder-examples .accordion-item').first();
    await expect(examplesItem).not.toHaveClass(/open/);

    const examplesHeader = page.locator('#builder-examples .accordion-header').first();
    await examplesHeader.click();
    await expect(examplesItem).toHaveClass(/open/);

    const exampleCards = page.locator('#builder-examples .example-card');
    await expect(exampleCards).toHaveCount(6);

    const visibleCardCount = await exampleCards.evaluateAll((els) =>
      els.filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      }).length
    );
    expect(visibleCardCount).toBe(6);

    await expect(page.locator('#carousel-prev')).toHaveCount(0);
    await expect(page.locator('#carousel-next')).toHaveCount(0);
  });

  test('recent section shows lightweight metadata cards without iframes', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('countdownHistory', JSON.stringify([
        {
          url: 'https://count.live/?date=2030-01-15T16:30:00-05:00&title=Quarterly%20Review',
          title: 'Quarterly Review',
          subtitle: '',
          date: '2030-01-15T16:30:00-05:00',
          bg: '112233',
          fg: 'fefefe',
          visitedAt: Date.now()
        }
      ]));
    });

    await page.goto('/');

    await expect(page.locator('#history-section')).toBeVisible();
    await expect(page.locator('#history-list iframe')).toHaveCount(0);

    const card = page.locator('#history-list .history-card').first();
    await expect(card).toContainText('Quarterly Review');
    await expect(card).toContainText('2030');

    const historyTheme = await card.evaluate((el) => {
      return {
        bg: el.style.getPropertyValue('--history-bg').trim(),
        fg: el.style.getPropertyValue('--history-fg').trim()
      };
    });

    expect(historyTheme.bg).toBe('#112233');
    expect(historyTheme.fg).toBe('#fefefe');
  });

  test('canva and notion helper buttons open guided embed modals', async ({ page }) => {
    await page.goto('/');

    const canvaBtn = page.locator('#canva-btn');
    await expect(canvaBtn).toBeVisible();

    await canvaBtn.click();
    await expect(page.locator('#canva-modal')).toHaveClass(/open/);
    await expect(page.locator('#canva-modal')).toContainText('Apps > Embeds');
    await page.locator('#canva-modal .modal-close').click();
    await expect(page.locator('#canva-modal')).not.toHaveClass(/open/);

    await page.locator('#publish-more summary').click();
    const notionBtn = page.locator('#notion-btn');
    await expect(notionBtn).toBeVisible();

    await notionBtn.click();
    await expect(page.locator('#notion-modal')).toHaveClass(/open/);
    await expect(page.locator('#notion-modal')).toContainText('/embed');
    await page.locator('#notion-modal .modal-close').click();
    await expect(page.locator('#notion-modal')).not.toHaveClass(/open/);
  });

  test('preview rail promotes copy, Canva, and website embed actions', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#copy-btn')).toContainText('Copy link');
    await expect(page.locator('#canva-btn')).toContainText('Use in Canva');
    await expect(page.locator('#embed-btn')).toContainText('Embed on website');

    const moreActions = page.locator('#publish-more');
    await expect(moreActions).toContainText('More actions');
    await expect(moreActions).toContainText('Use in Notion');
    await expect(moreActions).toContainText('Open in new tab');
    await expect(moreActions).toContainText('Add to calendar');
  });

  test('preview toggle uses finished-state wording', async ({ page }) => {
    await page.goto('/');

    const previewToggle = page.locator('#preview-end-btn');
    await expect(previewToggle).toHaveText('Preview finished state');

    await previewToggle.click();
    await expect(previewToggle).toHaveText('Preview live countdown');

    await previewToggle.click();
    await expect(previewToggle).toHaveText('Preview finished state');
  });

  test('guided embed modals close on Escape', async ({ page }) => {
    await page.goto('/');

    await page.locator('#canva-btn').click();
    await expect(page.locator('#canva-modal')).toHaveClass(/open/);

    await page.keyboard.press('Escape');
    await expect(page.locator('#canva-modal')).not.toHaveClass(/open/);
  });

  test('guided embed modals move focus in and return it to the trigger', async ({ page }) => {
    await page.goto('/');

    const canvaBtn = page.locator('#canva-btn');
    await canvaBtn.click();
    await expect(page.locator('#canva-modal .modal')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(canvaBtn).toBeFocused();
  });

  test('publish panel becomes subdued when the date is cleared', async ({ page }) => {
    await page.goto('/');

    await page.locator('#b-date').fill('');

    await expect(page.locator('#publish-status')).toHaveText('Pick a date in step 1 to generate your shareable link.');
    await expect(page.locator('#copy-btn')).toBeDisabled();
    await expect(page.locator('#url-output')).toBeDisabled();
  });

  test('publish panel re-enables and exposes a real URL after clearing then re-entering a date', async ({ page }) => {
    await page.goto('/');

    const dateInput = page.locator('#b-date');
    const copyBtn = page.locator('#copy-btn');
    const urlOutput = page.locator('#url-output');

    await dateInput.fill('2030-06-15T12:00');
    await expect(copyBtn).toBeEnabled();
    const enabledUrl = await urlOutput.evaluate((el) => el.dataset.fullUrl || '');
    expect(enabledUrl).toMatch(/^https?:\/\//);
    expect(enabledUrl).toContain('2030-06-15');

    await dateInput.fill('');
    await expect(copyBtn).toBeDisabled();
    const disabledUrl = await urlOutput.evaluate((el) => el.dataset.fullUrl || '');
    expect(disabledUrl).toBe('');
    // Regression guard: the placeholder title should never leak through as a "URL"
    await expect(urlOutput).toHaveAttribute('title', 'Set a date first');

    await dateInput.fill('2030-12-25T09:30');
    await expect(copyBtn).toBeEnabled();
    const reEnabledUrl = await urlOutput.evaluate((el) => el.dataset.fullUrl || '');
    expect(reEnabledUrl).toMatch(/^https?:\/\//);
    expect(reEnabledUrl).toContain('2030-12-25');
  });

  test('mobile layout keeps event setup ahead of preview and publish', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const positions = await page.evaluate(() => {
      const basicsTop = document.getElementById('builder-basics')?.getBoundingClientRect().top ?? 0;
      const previewTop = document.getElementById('preview-frame')?.getBoundingClientRect().top ?? 0;
      return { basicsTop, previewTop };
    });

    expect(positions.basicsTop).toBeLessThan(positions.previewTop);
  });

  test('tablet layout keeps event setup ahead of preview and publish', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 900 });
    await page.goto('/');

    const positions = await page.evaluate(() => {
      const basicsTop = document.getElementById('builder-basics')?.getBoundingClientRect().top ?? 0;
      const previewTop = document.getElementById('preview-frame')?.getBoundingClientRect().top ?? 0;
      return { basicsTop, previewTop };
    });

    expect(positions.basicsTop).toBeLessThan(positions.previewTop);
  });
});
