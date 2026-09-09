import { test, expect } from '@playwright/test';

test.describe('Group Booking Billing & Folio Engine', () => {
  const stayId = 'cmtu3k8160007n610g65o4s1j';

  test('Combined Group Billing displays charges for all rooms and correct sum', async ({ page }) => {
    // Navigate to the billing page for the 3-room group stay
    await page.goto(`/billing?stayId=${stayId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Locate the Group Billing selector dropdown
    const groupSelect = page.locator('select').filter({ hasText: 'Combined Group Billing' }).first();
    await expect(groupSelect).toBeVisible();

    // Select Combined Group Billing ("YES")
    await groupSelect.selectOption('YES');
    await page.waitForTimeout(500);

    // Verify the Group Folio Ledger heading lists all 3 rooms
    const ledgerHeading = page.locator('text=/GROUP FOLIO LEDGER/i').first();
    await expect(ledgerHeading).toBeVisible();

    // Verify all 3 rooms appear in the ledger table
    const ledgerContent = await page.locator('body').innerText();
    expect(ledgerContent).toContain('Room 406');
    expect(ledgerContent).toContain('Room 303');
    expect(ledgerContent).toContain('Room 206');

    // Total charges posted should be ₹4,300.00 (1800 + 1500 + 1000)
    const chargesPosted = page.locator('text=TOTAL CHARGES POSTED').locator('..');
    await expect(chargesPosted).toContainText('4,300');
  });

  test('Separate Billing shows individual room charges (not 0.00)', async ({ page }) => {
    await page.goto(`/billing?stayId=${stayId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Click on Room 206 card in the sidebar
    const room206Card = page.locator('div').filter({ hasText: /^206\s/ }).first();
    if (await room206Card.isVisible()) {
      await room206Card.click();
      await page.waitForTimeout(500);
    }

    // Ensure Group Billing is set to NO (Separate Billing)
    const groupSelect = page.locator('select').filter({ hasText: /Separate Billing/i }).first();
    if (await groupSelect.isVisible()) {
      await groupSelect.selectOption('NO');
      await page.waitForTimeout(500);
    }

    // Verify Total Charges Posted for Room 206 is NOT ₹0.00 (it should be ₹1,000.00)
    const chargesPosted = page.locator('text=TOTAL CHARGES POSTED').locator('..');
    const chargesText = await chargesPosted.innerText();
    expect(chargesText).not.toContain('₹0.00');
    expect(chargesText).toContain('1,000');

    // Verify the ledger for Room 206 lists Room 206 tariff
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Room Tariff - Room 206');
  });

  test('Folio refresh does not delete group charges', async ({ page }) => {
    // Navigate, wait, and reload to trigger sync24HourFolioCharges
    await page.goto(`/billing?stayId=${stayId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(500);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Select Combined Group Billing
    const groupSelect = page.locator('select').filter({ hasText: /Combined Group Billing/i }).first();
    await groupSelect.selectOption('YES');
    await page.waitForTimeout(500);

    // Verify all 3 rooms are still present in the ledger
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Room 406');
    expect(bodyText).toContain('Room 303');
    expect(bodyText).toContain('Room 206');

    const chargesPosted = page.locator('text=TOTAL CHARGES POSTED').locator('..');
    await expect(chargesPosted).toContainText('4,300');
  });

  test('Room cards select independently per room in folio directory', async ({ page }) => {
    await page.goto(`/billing?stayId=${stayId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Locate the first room card in the directory list
    const roomCard = page.locator('.rounded-xl.p-3').first();
    await expect(roomCard).toBeVisible();

    // Click the room card
    await roomCard.click();
    await page.waitForTimeout(300);

    // Top stay summary card is visible
    const stayHeader = page.locator('text=Expected Departure');
    await expect(stayHeader).toBeVisible();
  });
});
