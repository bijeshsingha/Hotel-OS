import { test } from "@playwright/test";
import * as path from "path";

test("capture expense register and direct income screenshots", async ({ page }) => {
  const artifactDir = "C:\\Users\\bijes\\.gemini\\antigravity-ide\\brain\\4aeb8de2-776a-411f-8dec-2cbfc09a3bfd";

  await page.goto("http://127.0.0.1:3001/reports");
  await page.waitForLoadState("networkidle");

  // 1. Switch to Cashier Shift Sheet tab
  const cashierTab = page.locator("button", { hasText: "Cashier Shift Sheet" });
  await cashierTab.click();
  await page.waitForTimeout(800);

  // 2. Open and Capture Bar Food Orders Modal (Optional guest name, KOT field)
  const recordIncomeBtn = page.locator("button", { hasText: "Record Direct Income" }).first();
  await recordIncomeBtn.click();
  await page.waitForTimeout(400);

  const categorySelect = page.locator("select").filter({ hasText: "Bar Food Orders (Kitchen Food Bill)" });
  await categorySelect.selectOption("BAR_FOOD_BILL");
  await page.locator('input[placeholder*="KOT-104"]').fill("KOT-104");
  await page.locator('input[placeholder*="1500"]').fill("2100");
  await page.waitForTimeout(400);

  await page.screenshot({
    path: path.join(artifactDir, "record_bar_food_income_modal.png"),
    fullPage: false,
  });

  // 3. Switch to Banquet Advance & Corporate Booking Details
  await categorySelect.selectOption("BANQUET_EVENT_ADVANCE");
  const corporateBtn = page.locator("button", { hasText: "Corporate / Company" });
  await corporateBtn.click();
  await page.locator('input[placeholder*="Tata Consultancy"]').fill("Assam Tea Exports Pvt Ltd");
  await page.locator('input[placeholder*="18AABCT1332L1Z1"]').fill("18AAACA1234F1Z9");
  await page.locator('input[placeholder*="Mr. Rajesh Sharma"]').fill("Mr. Sanjeev Baruah");
  await page.locator('input[placeholder*="9876543210"]').fill("9864099887");
  await page.locator('input[placeholder*="1500"]').fill("45000");
  await page.waitForTimeout(400);

  await page.screenshot({
    path: path.join(artifactDir, "record_banquet_corporate_modal.png"),
    fullPage: false,
  });

  // 4. Close modal and capture Cashier Shift Sheet with all transactions
  await page.locator("button:has-text('Cancel')").click();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(artifactDir, "cashier_shift_sheet_with_income.png"),
    fullPage: false,
  });
});
