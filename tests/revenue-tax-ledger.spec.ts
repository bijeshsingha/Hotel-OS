import { test, expect } from "@playwright/test";

test.describe("Revenue & Tax Ledger Report", () => {
  test("Revenue & Tax Ledger tab loads with KPIs, interactive filters, populated records, and print modal", async ({ page }) => {
    // Navigate to Reports page
    await page.goto("http://127.0.0.1:3001/reports");
    await page.waitForLoadState("networkidle");

    // Verify Revenue & Tax Ledger tab exists in segmented control
    const revenueTab = page.locator("button", { hasText: "Revenue & Tax Ledger" });
    await expect(revenueTab).toBeVisible();

    // Click on Revenue & Tax Ledger tab
    await revenueTab.click();
    await page.waitForTimeout(600);

    // Verify Executive KPI cards render properly
    await expect(page.locator("text=Gross Recognized Revenue")).toBeVisible();
    await expect(page.locator("text=Net Taxable Base Turnover")).toBeVisible();
    await expect(page.locator("text=Total GST Output Tax")).toBeVisible();
    await expect(page.locator("text=Departmental Split")).toBeVisible();

    // Verify filters are present
    const searchInput = page.locator('input[placeholder*="Search by Guest, Room #"]');
    await expect(searchInput).toBeVisible();

    // Verify table has records and is NOT blank
    const tableRows = page.locator("table tbody tr");
    const rowCount = await tableRows.count();
    console.log(`Found ${rowCount} revenue ledger rows.`);
    expect(rowCount).toBeGreaterThan(10);

    // Verify specific guest/room column data exists
    await expect(page.locator("table tbody").getByText("Room Tariff").first()).toBeVisible();

    // Capture screenshot of the populated Revenue & Tax Ledger for documentation
    await page.screenshot({
      path: "C:/Users/bijes/.gemini/antigravity-ide/brain/4aeb8de2-776a-411f-8dec-2cbfc09a3bfd/revenue_tax_ledger.png",
      fullPage: false,
    });

    // Test Search filter
    await searchInput.fill("ROOM");
    await page.waitForTimeout(300);
    const filteredByRoomCount = await tableRows.count();
    expect(filteredByRoomCount).toBeGreaterThan(0);
    await searchInput.fill("");

    // Test Department dropdown filter
    const deptSelect = page.locator("select", { hasText: "All Departments" });
    await deptSelect.selectOption("FNB");
    await page.waitForTimeout(300);
    const fnbCount = await tableRows.count();
    console.log(`F&B count: ${fnbCount}`);
    await deptSelect.selectOption("ALL");

    // Test Print Tax Ledger modal
    const printBtn = page.locator("button", { hasText: "Print Tax Ledger" }).first();
    await expect(printBtn).toBeVisible();
    await printBtn.click();
    await page.waitForTimeout(400);

    // Verify print modal appears
    await expect(page.locator("text=REVENUE & GST OUTPUT JOURNAL")).toBeVisible();
    await expect(page.locator("text=Hotel Ambarish Grand Residency").first()).toBeVisible();

    // Capture print modal screenshot
    await page.screenshot({
      path: "C:/Users/bijes/.gemini/antigravity-ide/brain/4aeb8de2-776a-411f-8dec-2cbfc09a3bfd/revenue_tax_print_modal.png",
      fullPage: false,
    });

    // Close modal
    const closeBtn = page.locator(".fixed.inset-0.z-50 button:has(svg.lucide-x)");
    await closeBtn.evaluate((b) => (b as HTMLElement).click());
    await page.waitForTimeout(300);
    await expect(page.locator("text=REVENUE & GST OUTPUT JOURNAL")).not.toBeVisible();
  });
});
