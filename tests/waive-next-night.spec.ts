import { test, expect } from '@playwright/test';
import { calculate24HrBillableDays } from '../src/lib/domain/pms-service';

test.describe('Grace Period & Waive Next Night Domain Logic', () => {
  test('1-night stay does NOT waive the only night (must remain 1 night)', () => {
    // Check-in today at 2 PM, check-out today at 6 PM (4 hours elapsed)
    const arrival = new Date('2026-09-09T14:00:00Z');
    const departure = new Date('2026-09-09T18:00:00Z');

    // Attempting to waive next night (1440) on a 1-night stay
    const result = calculate24HrBillableDays(arrival, departure, 'FIXED_TIME', 1440);

    expect(result.billableDays).toBe(1);
    expect(result.gracePeriodApplied).toBe(false);
    expect(result.checkoutDeadlineText).toContain('Waive not applicable: 1 night stay');
  });

  test('2-night stay waives only the 2nd night, billing 1 night', () => {
    // Check-in Sept 8 at 12:00 PM, departure Sept 9 at 4:00 PM
    // (Sept 8-9 is 1 night, past Sept 9 12 PM + grace rolls into Night 2 = 2 nights total)
    const arrival = new Date('2026-09-08T12:00:00Z');
    const departure = new Date('2026-09-09T16:00:00Z');

    // Without waive: 2 nights
    const normal = calculate24HrBillableDays(arrival, departure, 'FIXED_TIME', 0);
    expect(normal.billableDays).toBe(2);

    // With waive next night (1440): Night 2 waived, 1 night billed
    const waived = calculate24HrBillableDays(arrival, departure, 'FIXED_TIME', 1440);
    expect(waived.billableDays).toBe(1);
    expect(waived.gracePeriodApplied).toBe(true);
    expect(waived.checkoutDeadlineText).toContain('Next Night Waived • 1 of 2 Billed');
  });

  test('3-night stay waives only the 3rd night, billing 2 nights', () => {
    // Check-in Sept 7 at 12:00 PM, departure Sept 9 at 4:00 PM (3 nights stayed)
    const arrival = new Date('2026-09-07T12:00:00Z');
    const departure = new Date('2026-09-09T16:00:00Z');

    // Without waive: 3 nights
    const normal = calculate24HrBillableDays(arrival, departure, 'FIXED_TIME', 0);
    expect(normal.billableDays).toBe(3);

    // With waive next night (1440): Night 3 waived, 2 nights billed (NOT 1!)
    const waived = calculate24HrBillableDays(arrival, departure, 'FIXED_TIME', 1440);
    expect(waived.billableDays).toBe(2);
    expect(waived.gracePeriodApplied).toBe(true);
    expect(waived.checkoutDeadlineText).toContain('Next Night Waived • 2 of 3 Billed');
  });

  test('5-night stay waives only the 5th night, billing 4 nights', () => {
    // Check-in Sept 5 at 12:00 PM, departure Sept 9 at 4:00 PM (5 nights stayed)
    const arrival = new Date('2026-09-05T12:00:00Z');
    const departure = new Date('2026-09-09T16:00:00Z');

    // Without waive: 5 nights
    const normal = calculate24HrBillableDays(arrival, departure, 'FIXED_TIME', 0);
    expect(normal.billableDays).toBe(5);

    // With waive next night (1440): Night 5 waived, 4 nights billed (NOT 1!)
    const waived = calculate24HrBillableDays(arrival, departure, 'FIXED_TIME', 1440);
    expect(waived.billableDays).toBe(4);
    expect(waived.gracePeriodApplied).toBe(true);
    expect(waived.checkoutDeadlineText).toContain('Next Night Waived • 4 of 5 Billed');
  });

  test('24-Hours cycle checkout type waives only the latest rollover cycle', () => {
    // 50 hours elapsed = 2 completed 24h blocks + 2 hours remainder = 3 nights
    const arrival = new Date('2026-09-07T10:00:00Z');
    const departure = new Date('2026-09-09T12:00:00Z'); // 50h

    // Without waive: 3 nights
    const normal = calculate24HrBillableDays(arrival, departure, '24_HOURS', 0);
    expect(normal.billableDays).toBe(3);

    // With waive next night (1440): MUST BE 2, NOT 1!
    const waived = calculate24HrBillableDays(arrival, departure, '24_HOURS', 1440);
    expect(waived.billableDays).toBe(2);
    expect(waived.gracePeriodApplied).toBe(true);
    expect(waived.checkoutDeadlineText).toContain('Next Night Waived • 2 of 3 Billed');
  });
});

test.describe('Sidebar Sticky Scroll & UI Validation', () => {
  test('Sidebar stays pinned below header when page is scrolled down', async ({ page }) => {
    await page.goto('http://127.0.0.1:3001/billing');
    await page.waitForLoadState('networkidle');

    // Get initial sidebar bounding box
    const sidebarBefore = await page.locator('aside').first().boundingBox();
    expect(sidebarBefore).not.toBeNull();
    const initialTop = sidebarBefore!.y;

    // Scroll the page down 600px
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(300);

    // Get sidebar bounding box after scroll
    const sidebarAfter = await page.locator('aside').first().boundingBox();
    expect(sidebarAfter).not.toBeNull();

    // Verify sidebar top position relative to viewport did NOT move up into negative or under header
    expect(Math.abs(sidebarAfter!.y - initialTop)).toBeLessThanOrEqual(2);

    // Verify the first navigation item is still fully visible in viewport
    const firstNavItem = page.locator('aside a').first();
    await expect(firstNavItem).toBeVisible();
  });

  test('Billing UI disables Waive Next Night for 1-night stay', async ({ page }) => {
    const stayId = 'cmtu3k8160007n610g65o4s1j';
    await page.goto(`/billing?stayId=${stayId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Find the grace period dropdown
    const graceSelect = page.locator('select').filter({ hasText: /Hours \/ None/i }).first();
    await expect(graceSelect).toBeVisible();

    // Check if the Waive Next Night option is disabled for a 1-night stay
    const waiveOption = graceSelect.locator('option[value="1440"]');
    await expect(waiveOption).toBeDisabled();
    const optionText = await waiveOption.textContent();
    expect(optionText).toContain('Not applicable');
  });
});
