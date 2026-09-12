import { test, expect } from '@playwright/test';
import { prisma } from '../src/lib/db/prisma';
import { postManualFolioCharge, sync24HourFolioCharges, deleteFolioCharge } from '../src/lib/domain/folio-service';

test.describe('Manual Stay Extension & Room Tariff Charges Protection', () => {
  test('Manual extension charge with ROOM_TARIFF is not deleted or overwritten by sync24HourFolioCharges', async () => {
    // Find an open folio
    const folio = await prisma.folio.findFirst({
      where: { status: 'OPEN' },
      include: {
        windows: true,
        stay: { include: { roomAssignments: { include: { room: true } } } },
      },
    });

    expect(folio).not.toBeNull();
    if (!folio) return;

    const roomNo = folio.stay?.roomAssignments[0]?.room?.number || '101';

    // 1. Post a manual extension charge using ROOM_TARIFF
    const manualCharge = await postManualFolioCharge({
      folioId: folio.id,
      folioWindowId: folio.windows[0].id,
      chargeCode: 'ROOM_TARIFF',
      description: `Stay Extension Fee (Room ${roomNo})`,
      amount: 1750,
      qty: 1,
      isInclusive: true,
      sacHsn: '996311',
      customTaxRate: 5,
    });

    expect(manualCharge.id).toBeTruthy();
    expect(manualCharge.totalAmount).toBe(1750);
    expect(manualCharge.sourceType).toBe('MANUAL_CHARGE');

    // 2. Trigger automated 24-hr cycle sync (which previously deleted excess ROOM_TARIFF entries)
    await sync24HourFolioCharges({ folioId: folio.id });

    // 3. Verify entry still exists in DB with unchanged amount
    const entryAfterSync = await prisma.folioEntry.findUnique({
      where: { id: manualCharge.id },
    });

    expect(entryAfterSync).not.toBeNull();
    expect(entryAfterSync!.totalAmount).toBe(1750);
    expect(entryAfterSync!.unitAmount).toBe(1750);
    expect(entryAfterSync!.description).toBe(`Stay Extension Fee (Room ${roomNo})`);

    // 4. Verify staff can delete their manual charge if needed
    const deleteResult = await deleteFolioCharge({
      folioId: folio.id,
      entryId: manualCharge.id,
      reason: 'Test cleanup',
    });

    expect(deleteResult.success).toBe(true);

    const deletedCheck = await prisma.folioEntry.findUnique({
      where: { id: manualCharge.id },
    });
    expect(deletedCheck).toBeNull();
  });

  test('Manual charge with STAY_EXTENSION charge code is persisted and displayed cleanly', async () => {
    const folio = await prisma.folio.findFirst({
      where: { status: 'OPEN' },
      include: {
        windows: true,
        stay: { include: { roomAssignments: { include: { room: true } } } },
      },
    });

    expect(folio).not.toBeNull();
    if (!folio) return;

    const roomNo = folio.stay?.roomAssignments[0]?.room?.number || '101';

    // Post charge with new dedicated STAY_EXTENSION code
    const extCharge = await postManualFolioCharge({
      folioId: folio.id,
      folioWindowId: folio.windows[0].id,
      chargeCode: 'STAY_EXTENSION',
      description: `Late Departure Stay Extension (Room ${roomNo})`,
      amount: 2200,
      qty: 1,
      isInclusive: true,
      sacHsn: '996311',
      customTaxRate: 5,
    });

    expect(extCharge.id).toBeTruthy();
    expect(extCharge.chargeCode).toBe('STAY_EXTENSION');

    // Sync folio
    await sync24HourFolioCharges({ folioId: folio.id });

    // Verify still intact
    const checked = await prisma.folioEntry.findUnique({
      where: { id: extCharge.id },
    });
    expect(checked).not.toBeNull();
    expect(checked!.totalAmount).toBe(2200);

    // Clean up
    await deleteFolioCharge({
      folioId: folio.id,
      entryId: extCharge.id,
      reason: 'Test cleanup',
    });
  });

  test('System nightly charges (PMS_NIGHTLY_CHARGE) remain protected against manual deletion', async () => {
    const systemCharge = await prisma.folioEntry.findFirst({
      where: {
        sourceType: 'PMS_NIGHTLY_CHARGE',
        status: 'POSTED',
        folio: { status: 'OPEN' },
      },
    });

    if (systemCharge) {
      await expect(
        deleteFolioCharge({
          folioId: systemCharge.folioId,
          entryId: systemCharge.id,
        })
      ).rejects.toThrow(/System-generated room tariff charges cannot be deleted/);
    }
  });

  test('Billing UI renders Stay Extension category in Post Charge modal', async ({ page }) => {
    await page.goto('http://127.0.0.1:3001/billing');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Click "Post Charge" button
    const postChargeBtn = page.locator('button').filter({ hasText: /Post Charge/i }).first();
    await expect(postChargeBtn).toBeVisible();
    await postChargeBtn.click();

    // Verify modal appears
    const modal = page.locator('div').filter({ hasText: /Post Charge to Room/i }).first();
    await expect(modal).toBeVisible();

    // Verify dropdown has STAY_EXTENSION option
    const extOption = page.locator('option[value="STAY_EXTENSION"]');
    await expect(extOption).toBeAttached();
    const optText = await extOption.textContent();
    expect(optText).toContain('Stay Extension Charge');

    // Close modal
    const closeBtn = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
    await closeBtn.click();
  });
});
