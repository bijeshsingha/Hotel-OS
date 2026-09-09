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
    await page.goto("http://127.0.0.1:3001/reports");
    await page.waitForLoadState("networkidle");

    // Open Cashier Shift Sheet
    const cashierTab = page.locator("button", { hasText: "Cashier Shift Sheet" });
    await cashierTab.click();
    await page.waitForTimeout(500);

    // Click Record Direct Income
    const recordIncomeBtn = page.locator("button", { hasText: "Record Direct Income" });
    await expect(recordIncomeBtn).toBeVisible();
    await recordIncomeBtn.click();
    await page.waitForTimeout(300);

    // Verify modal header
    await expect(page.locator("text=Record Direct Collection / Income")).toBeVisible();

    // Verify dropdown options have proper professional hospitality names
    const categorySelect = page.locator("select").filter({ hasText: "Bar Food Orders (Kitchen Food Bill)" });
    await expect(categorySelect).toBeVisible();

    const options = await categorySelect.locator("option").allTextContents();
    expect(options).toContain("Bar Food Orders (Kitchen Food Bill)");
    expect(options).toContain("Banquet & Event Advance Deposit");
    expect(options).toContain("Direct Non-Resident Walk-In Dining");
    expect(options).toContain("Ancillary & Other Outlet Collections");

    // Select Bar Food Orders
    await categorySelect.selectOption("BAR_FOOD_BILL");

    // Verify guest name input is optional (has (Optional) in label/placeholder)
    await expect(page.locator("text=Guest / Party Name (Optional)")).toBeVisible();

    // Fill KOT number and Amount without requiring guest name
    await page.locator('input[placeholder*="KOT-104"]').fill("KOT-882");
    await page.locator('input[placeholder*="1500"]').fill("1850");
    await page.locator('input[placeholder*="Slip #8812"]').fill("Bar Food Slip #12");

    // Submit
    const submitBtn = page.locator("button", { hasText: "Record Collection & Issue Receipt" });
    await submitBtn.click();

    // Verify success feedback
    await expect(page.locator("text=Direct collection recorded! Receipt: REC-")).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify the transaction appears in the Cashier transactions table with KOT details
    await expect(page.locator("text=Bar Counter (Food)").first()).toBeVisible();
    await expect(page.locator("text=KOT-882").first()).toBeVisible();
  });

  test("Banquet Advance requires guest name/phone and supports Corporate Company & GST details", async ({ page }) => {
    await page.goto("http://127.0.0.1:3001/reports");
    await page.waitForLoadState("networkidle");

    // Open Cashier Shift Sheet
    const cashierTab = page.locator("button", { hasText: "Cashier Shift Sheet" });
    await cashierTab.click();
    await page.waitForTimeout(500);

    // Click Record Direct Income
    const recordIncomeBtn = page.locator("button", { hasText: "Record Direct Income" });
    await recordIncomeBtn.click();
    await page.waitForTimeout(300);

    // Select Banquet & Event Advance Deposit
    const categorySelect = page.locator("select").filter({ hasText: "Bar Food Orders (Kitchen Food Bill)" });
    await categorySelect.selectOption("BANQUET_EVENT_ADVANCE");

    // Verify Guest Contact Person & Mobile are marked mandatory (*)
    await expect(page.locator("text=Contact Person / Host Name *")).toBeVisible();
    await expect(page.locator("text=Contact Mobile Number *")).toBeVisible();

    // Verify KOT and POS Slip fields are explicitly hidden for Banquet
    await expect(page.locator("text=KOT / Kitchen Slip #")).not.toBeVisible();
    await expect(page.locator("text=Bill / POS Slip / UTR #")).not.toBeVisible();

    // Select Corporate / Company booking
    const corporateBtn = page.locator("button", { hasText: "Corporate / Company" });
    await corporateBtn.click();
    await page.waitForTimeout(200);

    // Verify corporate fields appear
    await expect(page.locator("text=Company / Organization Name *")).toBeVisible();
    await expect(page.locator("text=Company GSTIN (15 Digits)")).toBeVisible();

    // Fill form details
    await page.locator('input[placeholder*="Tata Consultancy"]').fill("Northeast Infotech Corp");
    await page.locator('input[placeholder*="18AABCT1332L1Z1"]').fill("18AAACN9988P1ZX");
    await page.locator('input[placeholder*="Mr. Rajesh Sharma"]').fill("Mr. Bikash Barua");
    await page.locator('input[placeholder*="9876543210"]').fill("9864012345");
    await page.locator('input[placeholder*="Annual Conference"]').fill("Q3 Corporate Leadership Summit");
    await page.locator('input[placeholder*="1500"]').fill("25000");

    // Submit
    const submitBtn = page.locator("button", { hasText: "Record Collection & Issue Receipt" });
    await submitBtn.click();

    // Verify success feedback
    await expect(page.locator("text=Direct collection recorded! Receipt: REC-")).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify company & banquet advance appear in transactions
    await expect(page.locator("text=Northeast Infotech Corp").first()).toBeVisible();
    await expect(page.locator("text=Banquet & Event Advance Deposit").first()).toBeVisible();
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
