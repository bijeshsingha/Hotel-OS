import { test, expect } from '@playwright/test';

const ROUTES_TO_AUDIT = [
  { path: '/', name: 'Dashboard' },
  { path: '/pms', name: 'PMS Front Desk' },
  { path: '/billing', name: 'Billing & Invoicing' },
  { path: '/pos', name: 'POS Terminal' },
  { path: '/housekeeping', name: 'Housekeeping' },
  { path: '/maintenance', name: 'Maintenance' },
  { path: '/night-audit', name: 'Night Audit' },
  { path: '/reports', name: 'Reports & Analytics' },
  { path: '/companies', name: 'Companies Directory' },
  { path: '/checkin-queue', name: 'Check-in Queue' },
];

test.describe('Hotel OS Responsive & Visual Design Audit', () => {

  for (const route of ROUTES_TO_AUDIT) {
    test(`${route.name} (${route.path}) has zero horizontal window overflow`, async ({ page }) => {
      // Navigate to route
      await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(500);

      // Verify no horizontal overflow on document
      const overflowInfo = await page.evaluate(() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = document.documentElement.clientWidth;
        const innerWidth = window.innerWidth;
        return {
          scrollWidth,
          clientWidth,
          innerWidth,
          isOverflowing: scrollWidth > clientWidth + 2,
        };
      });

      expect(overflowInfo.isOverflowing, `Route ${route.path} has horizontal overflow: scrollWidth=${overflowInfo.scrollWidth}, clientWidth=${overflowInfo.clientWidth}`).toBe(false);
    });
  }

  test('Theme toggle switches cleanly between Dark and Light mode', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const themeButton = page.locator('button[title*="Mode"]').first();
    if (await themeButton.isVisible()) {
      await themeButton.click();
      await page.waitForTimeout(300);

      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      await themeButton.click();
      await page.waitForTimeout(300);
      const isDarkAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'));

      expect(isDark).not.toBe(isDarkAfter);
    }
  });

  test('Mobile navigation drawer opens and closes without breaking layout', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'mobile') {
      await page.goto('/pms', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const hamburger = page.locator('button[aria-label="Open mobile menu"]');
      if (await hamburger.isVisible()) {
        await hamburger.click();
        await page.waitForTimeout(300);

        // Verify still no overflow with drawer open
        const isOverflowing = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
        });
        expect(isOverflowing).toBe(false);
      }
    }
  });
});
