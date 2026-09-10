import { test, expect } from "@playwright/test";

test.describe("Reports - Expense Register & Direct Income Recording", () => {
  test("Expense Register tab renders with KPIs, filters, and records", async ({ page }) => {
    // Navigate to Reports page
    await page.goto("http://127.0.0.1:3001/reports");
    await page.waitForLoadState("networkidle");

    // Verify Expense Register tab exists in segmented control
    const expenseTab = page.locator("button", { hasText: "Expense Register" });
    await expect(expenseTab).toBeVisible();

    // Click on Expense Register tab
    await expenseTab.click();
    await page.waitForTimeout(500);

    // Verify Expense KPI cards
    await expect(page.locator("text=Total Expenses (Outflows)")).toBeVisible();
    await expect(page.locator("text=Cash In Drawer Impact")).toBeVisible();
    await expect(page.locator("text=UPI & Bank Outflows")).toBeVisible();
    await expect(page.locator("text=Top Expense Category")).toBeVisible();

    // Verify filters are present
    const searchInput = page.locator('input[placeholder*="Search by Voucher #"]');
    await expect(searchInput).toBeVisible();

    // Verify table header
    await expect(page.locator("text=Operational Expense Register")).toBeVisible();
  });

  test("Record Direct Income modal supports Bar Food Bill with optional guest name & KOT input", async ({ page }) => {
    await page.goto("http://127.0.0.1:3001/cashier-shift");
    await page.waitForLoadState("networkidle");

    // Click Record Income
    const recordIncomeBtn = page.locator("button", { hasText: "Record Income" }).first();
    await expect(recordIncomeBtn).toBeVisible();
    await recordIncomeBtn.click();
    await page.waitForTimeout(300);

    // Verify modal header
    await expect(page.locator("text=Record Direct Income / Non-Resident Collection")).toBeVisible();

    // Verify dropdown has category options
    const categorySelect = page.locator(".fixed.inset-0.z-50 select").first();
    await expect(categorySelect).toBeVisible();

    // Select Bar Food Orders
    await categorySelect.selectOption("BAR_FOOD_BILL");

    // Verify notice about bar food only
    await expect(page.locator("text=Bar liquor is untracked. Only record food orders served to the bar counter.")).toBeVisible();

    // Verify guest name input is optional
    await expect(page.locator("text=Guest / Customer Name (Optional)")).toBeVisible();

    // Fill KOT number and Amount without requiring guest name
    await page.locator('input[placeholder*="KOT-104"]').fill("KOT-882");
    await page.locator('input[placeholder*="1850"]').fill("1850");

    // Submit
    const submitBtn = page.locator(".fixed.inset-0.z-50 button", { hasText: "Record Collection" });
    await submitBtn.click();

    // Verify success feedback
    await expect(page.locator("text=recorded successfully!")).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify the transaction appears in the Cashier transactions table with KOT details
    await expect(page.locator("text=KOT-882").first()).toBeVisible();
  });

  test("Banquet Advance requires guest name/phone and supports Corporate Company & GST details", async ({ page }) => {
    await page.goto("http://127.0.0.1:3001/cashier-shift");
    await page.waitForLoadState("networkidle");

    // Click Record Income
    const recordIncomeBtn = page.locator("button", { hasText: "Record Income" }).first();
    await recordIncomeBtn.click();
    await page.waitForTimeout(300);

    // Select Banquet & Event Advance Booking
    const categorySelect = page.locator(".fixed.inset-0.z-50 select").first();
    await categorySelect.selectOption("BANQUET_EVENT_ADVANCE");

    // Verify Guest Contact Person & Mobile are marked mandatory (*)
    await expect(page.locator("text=Client / Host Name *")).toBeVisible();
    await expect(page.locator("text=Mobile Phone Number *")).toBeVisible();

    // Fill banquet details with corporate company & GST
    await page.locator('input[placeholder*="Rajesh Barua"]').fill("Mr. Bikash Barua");
    await page.locator('input[placeholder*="9876543210"]').fill("9864012345");
    await page.locator('input[placeholder*="Northeast Infotech Corp"]').fill("Northeast Infotech Corp");
    await page.locator('input[placeholder*="18AAAAA0000A1Z5"]').fill("18AAACN9988P1ZX");
    await page.locator('input[placeholder*="1850"]').fill("25000");

    // Submit
    const submitBtn = page.locator(".fixed.inset-0.z-50 button", { hasText: "Record Collection" });
    await submitBtn.click();

    // Verify success feedback
    await expect(page.locator("text=recorded successfully!")).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify company name appears in ledger table
    await expect(page.locator("text=Northeast Infotech Corp").first()).toBeVisible();
  });

  test("Record Expense modal records voucher and updates Expense Register", async ({ page }) => {
    await page.goto("http://127.0.0.1:3001/reports");
    await page.waitForLoadState("networkidle");

    // Navigate to Expense Register
    const expenseTab = page.locator("button", { hasText: "Expense Register" });
    await expenseTab.click();
    await page.waitForTimeout(500);

    // Click Record Expense button
    const recordExpenseBtn = page.locator("button", { hasText: "Record Expense" }).first();
    await expect(recordExpenseBtn).toBeVisible();
    await recordExpenseBtn.click();
    await page.waitForTimeout(300);

    // Verify modal
    await expect(page.locator("text=Record Cash/Bank Expense Voucher")).toBeVisible();

    // Fill expense form
    await page.locator('input[placeholder*="Raju Driver"]').fill("Guwahati Dairy & Milk Suppliers");
    await page.locator('input[placeholder*="500"]').fill("1450");
    await page.locator('input[placeholder*="Details of expense"]').fill("Morning milk & paneer supply for kitchen");

    // Submit
    const submitBtn = page.locator("button", { hasText: "Record Expense Voucher" });
    await submitBtn.click();

    // Verify success
    await expect(page.locator("text=Expense recorded! Voucher: EXP-")).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify voucher appears in Expense Register
    await expect(page.locator("text=Guwahati Dairy & Milk Suppliers").first()).toBeVisible();
    await expect(page.locator("text=Morning milk & paneer supply for kitchen").first()).toBeVisible();
  });
});
