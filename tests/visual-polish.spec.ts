import { test, expect } from '@playwright/test';

test('capture sidebar hover expand and compact dock polish', async ({ page }) => {
  await page.goto('http://127.0.0.1:3001/billing');
  await page.evaluate(() => localStorage.setItem('hotel_sidebar_collapsed', 'true'));
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Screenshot compact dock state (rest state)
  await page.screenshot({
    path: 'C:/Users/bijes/.gemini/antigravity-ide/brain/4aeb8de2-776a-411f-8dec-2cbfc09a3bfd/sidebar_hover_dock_rest.png',
    fullPage: false
  });

  // Hover over the sidebar dock
  const sidebarContainer = page.locator('aside').first();
  await sidebarContainer.hover();
  await page.waitForTimeout(250);

  // Screenshot hover-expanded state
  await page.screenshot({
    path: 'C:/Users/bijes/.gemini/antigravity-ide/brain/4aeb8de2-776a-411f-8dec-2cbfc09a3bfd/sidebar_hover_expanded.png',
    fullPage: false
  });

  // Move mouse away to main content
  await page.locator('main').first().hover();
  await page.waitForTimeout(250);

  // Verify that the page has zero horizontal window overflow
  const isOverflowing = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
  });
  expect(isOverflowing).toBe(false);
});
