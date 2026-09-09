import { test } from '@playwright/test';

test('capture sticky sidebar while scrolled down and grace period dropdown', async ({ page }) => {
  const stayId = 'cmtu3k8160007n610g65o4s1j';
  await page.goto(`http://127.0.0.1:3001/billing?stayId=${stayId}`);
  await page.waitForLoadState('networkidle');

  // Scroll the page down 400px
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(300);

  // Take screenshot while scrolled down to prove sidebar does NOT move up
  await page.screenshot({
    path: 'C:/Users/bijes/.gemini/antigravity-ide/brain/4aeb8de2-776a-411f-8dec-2cbfc09a3bfd/sidebar_scrolled_sticky.png',
    fullPage: false
  });
});
