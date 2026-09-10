import { test, expect } from "@playwright/test";

test.describe("Dedicated Cashier Shift Entry Ledger (/cashier-shift)", () => {
  test("Sidebar displays Cashier Shift navigation item and navigates properly", async ({ page }) => {
    await page.goto("http://127.0.0.1:3001/pms");
    await page.waitForLoadState("networkidle");

    // If on mobile/tablet (< 1024px), open the mobile menu drawer
    const mobileMenuBtn = page.locator("button[aria-label='Open mobile menu']");
    if (await mobileMenuBtn.isVisible()) {
      await mobileMenuBtn.click();
    }

    // Click on Cashier Shift in sidebar or mobile drawer
    const cashierLink = page.locator("a[href='/cashier-shift']:visible").first();
    await expect(cashierLink).toBeVisible();
    await cashierLink.click();

    await page.waitForURL("**/cashier-shift");
    await expect(page.locator("h1:has-text('Cashier Shift Entry Ledger')")).toBeVisible();
  });

  test("Cashier Shift page renders KPIs, date stepper, filters, and ledger table", async ({ page }) => {
    await page.goto("http://127.0.0.1:3001/cashier-shift");
    await page.waitForLoadState("networkidle");

    // Header verification
    await expect(page.locator("h1:has-text('Cashier Shift Entry Ledger')")).toBeVisible();
    await expect(page.locator("text=Active Shift & Till Reconciler")).toBeVisible();

    // Action buttons
    await expect(page.locator("button:has-text('Record Income')")).toBeVisible();
    await expect(page.locator("button:has-text('Record Expense')")).toBeVisible();
    await expect(page.locator("button:has-text('Shift Handover Sheet')")).toBeVisible();
    await expect(page.locator("button:has-text('Export CSV')")).toBeVisible();

    // KPI Cards
    await expect(page.locator("text=Cash In Drawer Handover")).toBeVisible();
    await expect(page.locator("text=Total Inflows (Income & Receipts)")).toBeVisible();
    await expect(page.locator("text=Total Outflows (Expenses & Payouts)")).toBeVisible();
    await expect(page.locator("text=Net Day Cash Flow")).toBeVisible();

    // Filter controls
    await expect(page.locator("button:has-text('All Flows')")).toBeVisible();
    await expect(page.locator("button:has-text('Inflows (+)')")).toBeVisible();
    await expect(page.locator("button:has-text('Outflows (-)')")).toBeVisible();
    await expect(page.locator('input[placeholder*="Search voucher #, receipt #"]')).toBeVisible();

    // Ledger table headers
    await expect(page.locator("th:has-text('Voucher / Receipt')")).toBeVisible();
    await expect(page.locator("th:has-text('Type & Flow')")).toBeVisible();
    await expect(page.locator("th:has-text('Party / Payee / Guest')")).toBeVisible();
    await expect(page.locator("th:has-text('Particulars & Category')")).toBeVisible();
    await expect(page.locator("th:has-text('Amount (INR)')")).toBeVisible();
  });

  test("Date stepper allows navigating to previous and next days", async ({ page }) => {
    await page.goto("http://127.0.0.1:3001/cashier-shift");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const dateInput = page.locator("input[type='date']").first();
    const initialDate = await dateInput.inputValue();

    // Click Previous Day button
    const prevBtn = page.locator("button[title='Previous Business Day']");
    await prevBtn.click();
    await page.waitForTimeout(400);

    const prevDate = await dateInput.inputValue();
    expect(prevDate).not.toBe(initialDate);

    // Click Next Day button to restore back to initial date
    const nextBtn = page.locator("button[title='Next Business Day']");
    await nextBtn.click();
    await page.waitForTimeout(400);
    const restoredDate = await dateInput.inputValue();
    expect(restoredDate).toBe(initialDate);
  });

  test("Record Direct Income modal opens with customized categories and conditional fields", async ({ page }) => {
    await page.goto("http://127.0.0.1:3001/cashier-shift");
    await page.waitForLoadState("networkidle");

    const recordIncomeBtn = page.locator("button:has-text('Record Income')").first();
    await recordIncomeBtn.click();

    // Modal should be visible
    const modal = page.locator(".fixed.inset-0.z-50");
    await expect(modal).toBeVisible();
    await expect(modal.locator("text=Record Direct Income / Non-Resident Collection")).toBeVisible();

    // Category options
    const categorySelect = modal.locator("select").first();
    await expect(categorySelect).toBeVisible();

    // Verify Bar Food notice
    await expect(modal.locator("text=Bar liquor is untracked. Only record food orders served to the bar counter.")).toBeVisible();
    await expect(modal.locator('input[placeholder*="KOT-104"]')).toBeVisible();

    // Switch to Banquet & Event Advance
    await categorySelect.selectOption("BANQUET_EVENT_ADVANCE");
    await page.waitForTimeout(300);

    // Verify Banquet client & company fields
    await expect(modal.locator("text=Banquet Client & Event Specification")).toBeVisible();
    await expect(modal.locator('input[placeholder*="Rajesh Barua"]')).toBeVisible();
    await expect(modal.locator('input[placeholder*="Northeast Infotech Corp"]')).toBeVisible();

    // Close modal
    await modal.locator("button:has-text('Cancel')").click();
    await expect(modal).not.toBeVisible();
  });

  test("Record Expense modal opens with voucher categories and payee fields", async ({ page }) => {
    await page.goto("http://127.0.0.1:3001/cashier-shift");
    await page.waitForLoadState("networkidle");

    const recordExpenseBtn = page.locator("button:has-text('Record Expense')").first();
    await recordExpenseBtn.click();

    const modal = page.locator(".fixed.inset-0.z-50");
    await expect(modal).toBeVisible();
    await expect(modal.locator("text=Record Petty Cash Voucher / Expense")).toBeVisible();

    // Verify fields
    await expect(modal.locator('input[placeholder*="Guwahati Milk & Dairy"]')).toBeVisible();
    await expect(modal.locator('input[placeholder*="1450"]')).toBeVisible();

    // Close modal
    await modal.locator("button:has-text('Cancel')").click();
    await expect(modal).not.toBeVisible();
  });

  test("Shift Handover Sheet modal opens with denomination table and sign-off lines", async ({ page }) => {
    await page.goto("http://127.0.0.1:3001/cashier-shift");
    await page.waitForLoadState("networkidle");

    const handoverBtn = page.locator("button:has-text('Shift Handover Sheet')").first();
    await handoverBtn.click();

    const modal = page.locator(".fixed.inset-0.z-50");
    await expect(modal).toBeVisible();

    // Denomination verification
    await expect(modal.locator("text=Physical Cash Drawer Denomination Count")).toBeVisible();
    await expect(modal.locator("text=Total Physical Cash Counted")).toBeVisible();
    await expect(modal.locator("text=Cash Drawer Variance")).toBeVisible();

    // Signatures
    await expect(modal.locator("text=Outgoing Cashier")).toBeVisible();
    await expect(modal.locator("text=Incoming Cashier")).toBeVisible();
    await expect(modal.locator("text=Duty Manager / Auditor")).toBeVisible();

    // Close modal
    await modal.locator("button:has(svg.lucide-x)").click();
    await expect(modal).not.toBeVisible();
  });

  test("Reports page has clean tabs without Cashier Shift Sheet or Front Desk Room Rack", async ({ page }) => {
    await page.goto("http://127.0.0.1:3001/reports");
    await page.waitForLoadState("networkidle");

    // Verify Front Desk Room Rack & Cashier Shift Sheet tabs are NOT present in reports
    await expect(page.locator("button:has-text('Front Desk Room Rack')")).not.toBeVisible();
    await expect(page.locator("button:has-text('Cashier Shift Sheet')")).not.toBeVisible();

    // Verify dedicated Cashier Shift link/pill is present on Reports page
    const cashierLedgerLink = page.locator("a:has-text('Cashier Shift Ledger')");
    await expect(cashierLedgerLink).toBeVisible();

    // Verify remaining 5 clean audit tabs are present
    await expect(page.locator("button:has-text('Room Transfers & Moves')")).toBeVisible();
    await expect(page.locator("button:has-text('Final Bills & Invoices')")).toBeVisible();
    await expect(page.locator("button:has-text('Expense Register')")).toBeVisible();
    await expect(page.locator("button:has-text('Revenue & Tax Ledger')")).toBeVisible();
    await expect(page.locator("button:has-text('Kitchen & Dining Collections')")).toBeVisible();
  });
});
