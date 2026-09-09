import { test } from '@playwright/test';
import * as path from 'path';

test('capture dynamic departure screenshots', async ({ page }) => {
  const artifactDir = 'C:\\Users\\bijes\\.gemini\\antigravity-ide\\brain\\4aeb8de2-776a-411f-8dec-2cbfc09a3bfd';

  // 1. PMS Front Desk - In-House Roster
  await page.goto('http://127.0.0.1:3001/pms?tab=inhouse');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(artifactDir, 'dynamic_departure_pms.png'),
    fullPage: false,
  });

  // 2. Billing & Folio Page
  await page.goto('http://127.0.0.1:3001/billing');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(artifactDir, 'dynamic_departure_billing.png'),
    fullPage: false,
  });
});
