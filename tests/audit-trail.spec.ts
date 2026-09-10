import { test, expect } from "@playwright/test";

test.describe("Compliance & Operations Audit Trail", () => {
  test("Audit Trail page renders KPIs, category tabs, and filters", async ({ page }) => {
    await page.goto("http://127.0.0.1:3001/audit-log");
    await page.waitForLoadState("networkidle");

    // Header verification
    await expect(page.locator("h1:has-text('Compliance & Operations Audit Trail')")).toBeVisible();
    await expect(page.locator("text=Live & Tamper-Evident")).toBeVisible();

    // Action buttons
    await expect(page.locator("button:has-text('Refresh')")).toBeVisible();
    await expect(page.locator("button:has-text('Export CSV')")).toBeVisible();
    await expect(page.locator("button:has-text('Print Report')")).toBeVisible();

    // KPI cards
    await expect(page.locator("text=Total Audited Events").first()).toBeVisible();
    await expect(page.locator("text=Financial & Billing").first()).toBeVisible();
    await expect(page.locator("text=Front Desk & Stays").first()).toBeVisible();
    await expect(page.locator("text=Admin & Governance").first()).toBeVisible();

    // Category filter tabs
    await expect(page.locator("button:has-text('All Events')")).toBeVisible();
    await expect(page.locator("button:has-text('Cash In/Out & Expenses')")).toBeVisible();
    await expect(page.locator("button:has-text('Night Audit')")).toBeVisible();

    // Filter controls
    await expect(page.locator('input[placeholder*="Search receipt #, room #"]')).toBeVisible();
    await expect(page.locator("select").first()).toBeVisible();

    // Table headers
    await expect(page.locator("th:has-text('Timestamp')")).toBeVisible();
    await expect(page.locator("th:has-text('Actor / Staff')")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Operation", exact: true })).toBeVisible();
    await expect(page.locator("th:has-text('Entity')")).toBeVisible();
    await expect(page.locator("th:has-text('Operational Summary / Impact')")).toBeVisible();
  });

  test("Category filtering updates the audit list", async ({ page }) => {
    await page.goto("http://127.0.0.1:3001/audit-log");
    await page.waitForLoadState("networkidle");

    // Click on Financial & Billing category tab
    const financialTab = page.locator("button:has-text('Financial & Billing')").first();
    await financialTab.click();
    await page.waitForTimeout(500);

    // Verify row or events filtered
    const countText = await page.locator("text=/Showing .* events/").textContent();
    expect(countText).toBeTruthy();

    // Click on Front Desk & Stays
    const frontDeskTab = page.locator("button:has-text('Front Desk & Stays')").first();
    await frontDeskTab.click();
    await page.waitForTimeout(500);

    // Check that check-in or stay events are displayed
    const tableBody = page.locator("tbody");
    await expect(tableBody).toBeVisible();
  });

  test("Clicking an event opens the Detailed Audit Inspector Modal", async ({ page }) => {
    await page.goto("http://127.0.0.1:3001/audit-log");
    await page.waitForLoadState("networkidle");

    // Find the first inspect button or table row
    const firstInspectButton = page.locator("tbody tr button:has-text('Inspect')").first();
    await expect(firstInspectButton).toBeVisible();
    await firstInspectButton.click();

    // Modal should be visible
    const modal = page.locator(".fixed.inset-0.z-50");
    await expect(modal).toBeVisible();

    // Modal should have metadata
    await expect(modal.locator("text=Actor / Staff")).toBeVisible();
    await expect(modal.locator("text=Target Entity")).toBeVisible();
    await expect(modal.locator("text=Audit ID")).toBeVisible();

    // Close Inspector button
    const closeBtn = modal.locator("button:has-text('Close Inspector')");
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Modal should be dismissed
    await expect(modal).not.toBeVisible();
  });

  test("Search filters table records dynamically", async ({ page }) => {
    await page.goto("http://127.0.0.1:3001/audit-log");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator('input[placeholder*="Search receipt #, room #"]');
    await searchInput.fill("NON_EXISTENT_QUERY_12345");
    await page.waitForTimeout(300);

    // Should display empty state
    await expect(page.locator("text=No audit events match your criteria")).toBeVisible();

    // Clear search
    await searchInput.fill("");
    await page.waitForTimeout(300);
    await expect(page.locator("tbody tr")).not.toHaveCount(0);
  });
});
