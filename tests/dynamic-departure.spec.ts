import { test, expect } from '@playwright/test';
import { calculateDynamicDepartureDate, getEffectiveStayDeparture } from '../src/lib/domain/pms-service';

test.describe('Dynamic Stay Departure Date Domain Logic', () => {
  test('Stay within scheduled time keeps original expected departure date', () => {
    const arrival = new Date('2026-09-07T14:00:00Z');
    const scheduledExp = new Date('2026-09-08T11:00:00Z');
    const now = new Date('2026-09-07T19:00:00Z');

    const result = calculateDynamicDepartureDate({
      arrivalAt: arrival,
      expectedDepartureAt: scheduledExp,
      checkoutType: 'FIXED_TIME',
      gracePeriodMinutes: 0,
      now,
    });

    expect(result.isExtended).toBe(false);
    expect(result.extensionNights).toBe(0);
    expect(result.effectiveDepartureAt.toISOString()).toBe(scheduledExp.toISOString());
  });

  test('Guest staying past standard checkout deadline & grace dynamically advances departure date by 1 day', () => {
    // Arrived Sept 7 at 2:00 PM, scheduled departure Sept 8 at 11:00 AM
    const arrival = new Date('2026-09-07T14:00:00Z');
    const scheduledExp = new Date('2026-09-08T11:00:00Z');
    // Now is Sept 8 at 2:30 PM (past 1:00 PM checkout grace)
    const now = new Date('2026-09-08T14:30:00Z');

    const result = calculateDynamicDepartureDate({
      arrivalAt: arrival,
      expectedDepartureAt: scheduledExp,
      checkoutType: 'FIXED_TIME',
      gracePeriodMinutes: 0,
      now,
    });

    expect(result.isExtended).toBe(true);
    expect(result.extensionNights).toBe(1);
    expect(result.billableNights).toBe(2);
    // Departure date moves forward to Sept 9
    expect(result.effectiveDepartureAt.getUTCDate()).toBe(9);
  });

  test('Guest staying 2 days past scheduled checkout dynamically advances departure date by 2 days', () => {
    const arrival = new Date('2026-09-07T14:00:00Z');
    const scheduledExp = new Date('2026-09-08T11:00:00Z');
    // Now is Sept 9 at 3:00 PM (night 3 began)
    const now = new Date('2026-09-09T15:00:00Z');

    const result = calculateDynamicDepartureDate({
      arrivalAt: arrival,
      expectedDepartureAt: scheduledExp,
      checkoutType: 'FIXED_TIME',
      gracePeriodMinutes: 0,
      now,
    });

    expect(result.isExtended).toBe(true);
    expect(result.extensionNights).toBe(2);
    expect(result.billableNights).toBe(3);
    // Dynamic departure date should be Sept 10
    expect(result.effectiveDepartureAt.getUTCDate()).toBe(10);
  });

  test('24-Hour Cycle billing dynamically advances departure timestamp by multiples of 24 hours', () => {
    // Arrived Sept 7 at 15:00, initial expected Sept 8 at 15:00
    const arrival = new Date('2026-09-07T15:00:00Z');
    const scheduledExp = new Date('2026-09-08T15:00:00Z');
    // Now is Sept 8 at 17:00 (past 24h mark)
    const now = new Date('2026-09-08T17:00:00Z');

    const result = calculateDynamicDepartureDate({
      arrivalAt: arrival,
      expectedDepartureAt: scheduledExp,
      checkoutType: '24_HOURS',
      gracePeriodMinutes: 0,
      now,
    });

    expect(result.isExtended).toBe(true);
    expect(result.effectiveDepartureAt.toISOString()).toBe('2026-09-09T15:00:00.000Z');
  });

  test('Advance multi-night booking is never shortened before its scheduled departure', () => {
    // Booked 4 nights: Sept 7 to Sept 11
    const arrival = new Date('2026-09-07T14:00:00Z');
    const scheduledExp = new Date('2026-09-11T11:00:00Z');
    // Current time is Sept 9 at 16:00 (Night 3)
    const now = new Date('2026-09-09T16:00:00Z');

    const result = calculateDynamicDepartureDate({
      arrivalAt: arrival,
      expectedDepartureAt: scheduledExp,
      checkoutType: 'FIXED_TIME',
      now,
    });

    // Departure date remains Sept 11 (not reduced to Sept 10!)
    expect(result.isExtended).toBe(false);
    expect(result.effectiveDepartureAt.getUTCDate()).toBe(11);
  });

  test('getEffectiveStayDeparture handles in-house stays and room rateHandling', () => {
    const stay = {
      status: 'IN_HOUSE',
      arrivalAt: new Date('2026-09-07T14:00:00Z'),
      expectedDepartureAt: new Date('2026-09-08T11:00:00Z'),
      roomAssignments: [
        { rateHandling: 'FIXED_TIME:0', endsAt: null },
      ],
    };

    const now = new Date('2026-09-08T15:00:00Z');
    const dep = getEffectiveStayDeparture(stay, now);

    expect(dep.isExtended).toBe(true);
    expect(dep.effectiveDepartureAt.getUTCDate()).toBe(9);
  });
});

test.describe('Dynamic Departure in PMS & Billing UI', () => {
  test('PMS Front Desk renders departure date and indicators properly', async ({ page }) => {
    await page.goto('http://127.0.0.1:3001/pms?tab=inhouse');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Verify in-house table has Departure column
    const depHeader = page.locator('th').filter({ hasText: /Departure/i });
    await expect(depHeader).toBeVisible();

    // Verify rows render a valid departure date
    const firstRowDep = page.locator('tbody tr td').nth(6);
    await expect(firstRowDep).toBeVisible();
    const depText = await firstRowDep.textContent();
    expect(depText).toBeTruthy();
  });

  test('Billing Page renders Expected Departure and updates dynamically', async ({ page }) => {
    await page.goto('http://127.0.0.1:3001/billing');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1200);

    // Verify Expected Departure block in stay header
    const expLabel = page.locator('span').filter({ hasText: /Expected Departure|Checked Out At/i }).first();
    await expect(expLabel).toBeVisible();

    // Verify left directory list contains arrival -> departure dates
    const dateRow = page.locator('.font-mono').filter({ hasText: /→/ }).first();
    await expect(dateRow).toBeVisible();
  });
});
