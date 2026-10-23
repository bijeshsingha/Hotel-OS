import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { reportDayBounds, validateReportRange, matchesReportPeriod } from "../src/lib/reports/report-dates";
import { nextReportRoomAssignment, summarizeReportLedger, allocateReportAmounts } from "../src/lib/reports/report-ledger";
import { reportCsv, reportWorkbook } from "../src/lib/reports/report-export";
import { prisma } from "../src/lib/db/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { POST as verify } from "../src/app/api/v1/auth/verify/route";
import { GET as getReport } from "../src/app/api/v1/reports/route";
import { GET as getExecutive } from "../src/app/api/v1/reports/executive/route";
import { getExecutiveReport } from "../src/lib/domain/executive-report-service";
import { generateExecutiveReportExcel } from "../src/lib/domain/executive-report-excel";

if (!process.env.HOTEL_OS_TEST_DATABASE_URL?.endsWith("report-test.db") || process.env.DATABASE_URL !== process.env.HOTEL_OS_TEST_DATABASE_URL) throw new Error("Run only with the disposable reporting fixture runner.");
process.env.APP_ORIGIN = "http://reports.test";
let cookie = "";
const request = (type: string, extra = "") => new Request(`http://reports.test/api/v1/reports?propertyId=report-property&type=${type}&date=2026-10-23${extra}`, { headers: { Cookie: cookie } });
const component = (cgstAmount: number, sgstAmount: number, igstAmount = 0) => JSON.stringify({ cgstAmount, sgstAmount, igstAmount });
const entries = [
  { id: "room-charge", chargeCode: "ROOM_TARIFF", description: 'Room 101, tariff "special" ₹', taxableAmount: 100, totalAmount: 105, taxComponentsJson: component(2.5, 2.5) },
  { id: "food-charge", chargeCode: "RESTAURANT_FOOD", sourceType: "MANUAL_CHARGE", description: "KOT #TEST-001: Kitchen order, shared", taxableAmount: 100, totalAmount: 118, taxComponentsJson: component(0, 0, 18) },
  { id: "discount", chargeCode: "ROOM_TARIFF", description: "Room 101 discount", type: "ADJUSTMENT", taxableAmount: -10, totalAmount: -10.5, taxComponentsJson: component(-0.25, -0.25) },
];
before(async () => {
  await prisma.organization.create({ data: { id: "report-org", legalName: "Synthetic Reports", displayName: "Synthetic Reports" } });
  await prisma.property.create({ data: { id: "report-property", organizationId: "report-org", code: "TEST-REPORT", legalName: "Synthetic Reports", displayName: "Synthetic Reports", businessDate: "2026-10-23", timezone: "Asia/Kolkata" } });
  await prisma.role.create({ data: { id: "report-owner-role", code: "ORG_OWNER", name: "Owner" } });
  const password = randomUUID();
  await prisma.user.create({ data: { id: "report-owner", name: "Synthetic Owner", email: "reports@example.invalid", passwordHash: hashPassword(password), memberships: { create: { organizationId: "report-org", propertyGrants: { create: { propertyId: "report-property", roleId: "report-owner-role" } } } } } });
  const login = await verify(new Request("http://reports.test/api/v1/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: "reports@example.invalid", password }) }));
  assert.equal(login.status, 200);
  cookie = login.headers.get("set-cookie")!.split(";")[0];
  await prisma.roomType.create({ data: { id: "report-room-type", propertyId: "report-property", organizationId: "report-org", code: "TEST", name: "Synthetic, Deluxe" } });
  for (const number of ["100", "101", "102"]) await prisma.room.create({ data: { id: `report-room-${number}`, propertyId: "report-property", organizationId: "report-org", roomTypeId: "report-room-type", number } });
  await prisma.guest.create({ data: { id: "report-guest", organizationId: "report-org", name: 'कुमार, "Test"', phone: "001234567890", addressJson: JSON.stringify({ streetAddress: "1, Test Street", city: "Synthetic", pinZipCode: "001234" }) } });
  await prisma.stay.create({ data: { id: "report-stay", organizationId: "report-org", propertyId: "report-property", primaryGuestId: "report-guest", status: "IN_HOUSE", arrivalAt: new Date("2026-10-22T06:00:00Z"), expectedDepartureAt: new Date("2026-10-24T06:00:00Z") } });
  for (const number of ["100", "101", "102"]) await prisma.roomAssignment.create({ data: { stayId: "report-stay", roomId: `report-room-${number}`, startsAt: new Date("2026-10-22T06:00:00Z"), ...(number === "100" ? { endsAt: new Date("2026-10-22T07:00:00Z") } : {}) } });
  await prisma.folio.create({ data: { id: "report-folio", organizationId: "report-org", propertyId: "report-property", stayId: "report-stay", balance: 99999 } });
  await prisma.folioWindow.create({ data: { id: "report-window", folioId: "report-folio" } });
  for (const entry of [...entries, { ...entries[0], id: "reversed", status: "REVERSED", totalAmount: 999 }, { ...entries[0], id: "backdated", serviceDate: "2026-10-22" }, { ...entries[0], id: "future", serviceDate: "2026-10-24" }]) {
    await prisma.folioEntry.create({ data: { organizationId: "report-org", propertyId: "report-property", folioId: "report-folio", folioWindowId: "report-window", serviceDate: "2026-10-23", postedAt: new Date("2026-10-23T09:00:00Z"), type: "CHARGE", qty: 1, unitAmount: entry.totalAmount, ...entry } });
  }
  for (const [id, amount, receivedAt, status, reference] of [
    ["paid-tagged", 40, "2026-10-23T09:00:00Z", "SUCCEEDED", "Room 101"],
    ["paid-shared", 20, "2026-10-23T10:00:00Z", "SUCCEEDED", "Shared"],
    ["failed", 500, "2026-10-23T11:00:00Z", "FAILED", ""],
    ["before", 1, "2026-10-22T18:29:59.999Z", "SUCCEEDED", ""],
    ["last-ms", 2, "2026-10-23T18:29:59.999Z", "SUCCEEDED", ""],
    ["next-day", 4, "2026-10-23T18:30:00Z", "SUCCEEDED", ""],
  ] as const) await prisma.payment.create({ data: { id, receiptNo: id, organizationId: "report-org", propertyId: "report-property", folioId: "report-folio", amount, receivedAt: new Date(receivedAt), status, reference, method: status === "FAILED" ? "CHEQUE" : "UPI" } });
  await prisma.expense.create({ data: { organizationId: "report-org", propertyId: "report-property", voucherNo: "TEST-EXP", businessDate: "2026-10-22", paidAt: new Date("2026-10-23T09:00:00Z"), category: "OTHER", payeeName: "Synthetic Vendor", description: "Backdated synthetic", amount: 10, totalAmount: 10, paymentMethod: "CASH", status: "PAID" } });
  await prisma.outlet.create({ data: { id: "report-outlet", organizationId: "report-org", propertyId: "report-property", code: "TEST", name: "Synthetic Restaurant" } });
  for (const [id, status, stayId] of [["pos-paid", "PAID", null], ["pos-open", "OPEN", "report-stay"], ["pos-void", "VOIDED", null]] as const) {
    await prisma.order.create({ data: { id, organizationId: "report-org", propertyId: "report-property", outletId: "report-outlet", orderNo: id, status, stayId, createdAt: new Date("2026-10-23T08:00:00Z"), items: { create: { nameSnapshot: "Synthetic Dish", qty: 1, unitPrice: 100, total: 100, status: "SERVED" } } } });
  }
  await prisma.pOSBill.create({ data: { organizationId: "report-org", propertyId: "report-property", id: "paid-pos-bill", billNo: "TEST-BILL", orderId: "pos-paid", createdAt: new Date("2026-10-23T08:00:00Z"), subtotal: 100, taxTotal: 5, totalAmount: 105, status: "PAID" } });
  await prisma.payment.create({ data: { id: "pos-receipt", organizationId: "report-org", propertyId: "report-property", receiptNo: "POS-RECEIPT", orderId: "pos-paid", amount: 105, method: "UPI", receivedAt: new Date("2026-10-23T09:00:00Z") } });
  await prisma.payment.create({ data: { id: "banquet-receipt", organizationId: "report-org", propertyId: "report-property", receiptNo: "BANQUET-ADV", amount: 50, method: "UPI", payerSnapshot: JSON.stringify({ name: "Synthetic Company", category: "BANQUET_EVENT_ADVANCE" }), receivedAt: new Date("2026-10-23T09:00:00Z") } });
});
after(async () => { await prisma.$disconnect(); });

test("property timezone days do not overlap; DST days keep 23/25 hours", () => {
  const india = reportDayBounds("2026-10-23");
  assert.equal(india.startUtc.toISOString(), "2026-10-22T18:30:00.000Z");
  assert.equal(india.endUtc.toISOString(), "2026-10-23T18:29:59.999Z");
  assert.equal(reportDayBounds("2026-10-24").startUtc.getTime(), india.endUtc.getTime() + 1);
  assert.equal(reportDayBounds("2026-03-08", "America/New_York").endUtc.getTime() - reportDayBounds("2026-03-08", "America/New_York").startUtc.getTime() + 1, 23 * 3600000);
  assert.equal(reportDayBounds("2026-11-01", "America/New_York").endUtc.getTime() - reportDayBounds("2026-11-01", "America/New_York").startUtc.getTime() + 1, 25 * 3600000);
  assert.equal(reportDayBounds("2026-10-23", "UTC").startUtc.toISOString(), "2026-10-23T00:00:00.000Z");
});
test("invalid/reversed report dates and ranges are rejected", () => {
  for (const date of ["bad", "2026-02-30", "2026-13-01", "2026-1-2"]) assert.throws(() => validateReportRange(date), RangeError);
  assert.throws(() => validateReportRange("2026-10-24", "2026-10-23"), RangeError);
});
test("date presets use hotel calendar and bound future records", () => {
  assert.equal(matchesReportPeriod("2026-10-22T19:00:00Z", "TODAY", "2026-10-23"), true);
  assert.equal(matchesReportPeriod("2026-10-17", "LAST_7_DAYS", "2026-10-23"), true);
  assert.equal(matchesReportPeriod("2026-10-16", "LAST_7_DAYS", "2026-10-23"), false);
  assert.equal(matchesReportPeriod("2026-10-24", "LAST_7_DAYS", "2026-10-23"), false);
  assert.equal(matchesReportPeriod("bad", "TODAY", "2026-10-23"), false);
});
test("recorded mixed GST, signed adjustments, reversals and zero amounts reconcile", () => {
  const result = summarizeReportLedger([...entries.map(e => ({ type: "CHARGE", ...e })), { ...entries[0], type: "CHARGE", status: "REVERSED" }, { ...entries[0], type: "PAYMENT" }]);
  assert.equal(result.total.gross, 212.5);
  assert.equal(result.total.base, 190);
  assert.equal(result.total.tax, 22.5);
  assert.equal(result.total.igst, 18);
  assert.equal(result.grossTurnover, 223);
  assert.equal(result.streams.food.base, 100);
  assert.equal(result.streams.food.tax, 18);
  assert.equal(result.roomBase, 90);
});
test("room allocation never duplicates shared payments or loses a paise", () => {
  assert.deepEqual(allocateReportAmounts(["101", "102"], [{ amount: 40, text: "Room 101" }, { amount: 20, text: "Shared" }]), [50, 10]);
  assert.deepEqual(allocateReportAmounts(["101", "102", "103"], [{ amount: 0.02, text: "" }]), [0.01, 0.01, 0]);
  assert.deepEqual(allocateReportAmounts(["101", "102"], [{ amount: -0.01, text: "" }]), [-0.01, 0]);
  assert.deepEqual(allocateReportAmounts(["101", "102"], [{ amount: 10, text: "Room 1010" }]), [5, 5]);
});
test("room transfers select the actual next assignment, not unrelated later rooms", () => {
  const source = { id: "old", roomId: "100", startsAt: new Date("2026-10-22T06:00:00Z"), endsAt: new Date("2026-10-23T06:00:00Z") };
  const next = { id: "next", roomId: "101", startsAt: new Date("2026-10-23T06:00:00Z"), endsAt: null };
  const unrelated = { id: "later", roomId: "102", startsAt: new Date("2026-10-24T06:00:00Z"), endsAt: null };
  assert.equal(nextReportRoomAssignment(source, [unrelated, next, source])?.id, "next");
  assert.equal(nextReportRoomAssignment(source, [unrelated, source]), undefined);
  const legacySource = { ...source, moveReason: "Guest moved from Room 100 to Room 102" };
  const recordedLater = { ...unrelated, room: { number: "102" }, startsAt: new Date("2026-10-23T06:54:00Z") };
  assert.equal(nextReportRoomAssignment(legacySource, [recordedLater, next])?.id, "later", "Preserve explicitly documented legacy transfers with a delayed receiving assignment");
});
test("legacy CSV has Excel BOM, correct commas/quotes/newlines and protected text", () => {
  const csv = reportCsv(["Name", "Amount"], [['कुमार, "Test"\n₹ ➔', 0], ["=HYPERLINK(\"bad\")", -1.5]]);
  assert.deepEqual([...Buffer.from(csv).subarray(0, 3)], [239, 187, 191]);
  assert.ok(csv.includes('"कुमार, ""Test""\n₹ ➔","0"'));
  assert.ok(csv.includes("\r\n\"'=HYPERLINK"));
});
test("Excel preserves Unicode, quotes, leading zeros and numeric cells without formulas", async () => {
  const bytes = await reportWorkbook({ title: "Synthetic ₹ report", property: "Test", period: "2026-10-23", headers: ["Name", "Phone", "Amount (INR)"], rows: [['कुमार, "Test" ➔ ₹', "001234567890123456789", 1234.5], ["=SUM(A1:A2)", "+91000000000", 0]] });
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const sheet = wb.worksheets[0];
  assert.equal(sheet.getCell("A6").value, 'कुमार, "Test" ➔ ₹');
  assert.equal(sheet.getCell("B6").value, "001234567890123456789");
  assert.equal(sheet.getCell("C6").value, 1234.5);
  assert.equal(sheet.getCell("C7").value, 0);
  assert.equal(sheet.getCell("A7").type, ExcelJS.ValueType.String);
  assert.equal(sheet.views[0].state, "frozen");
  assert.ok(sheet.autoFilter);
});
test("all seven Reports API sections load without a server error", async () => {
  for (const type of ["COMPREHENSIVE_AUDIT", "INHOUSE_OUTSTANDING", "ROOM_TRANSFERS", "FINAL_BILLS", "EXPENSES", "REVENUE", "FNB"]) {
    const response = await getReport(request(type));
    const body = await response.json();
    assert.equal(response.status, 200, `${type}: ${JSON.stringify(body)}`);
  }
});
test("guest dues shows active rooms, returns UI fields, excludes future charges and reconciles paid totals", async () => {
  const body = await (await getReport(request("INHOUSE_OUTSTANDING"))).json();
  assert.deepEqual(body.rooms.map((r: any) => r.roomNumber).sort(), ["101", "102"]);
  assert.equal(body.summary.totalOccupiedRooms, 2);
  assert.equal(body.summary.totalBilledAmount, 317.5);
  assert.equal(body.summary.totalCollectedAmount, 63);
  assert.equal(body.rooms.reduce((sum: number, r: any) => sum + r.totalPaid, 0), 63);
  assert.ok(body.rooms.every((r: any) => r.checkIn && r.expectedDeparture && typeof r.surplusCredit === "number"));
  assert.ok(body.rooms[0].residentialAddress.includes("1, Test Street"));
});
test("final bills uses posted signed amounts, includes IGST and never invents invoice numbers", async () => {
  const body = await (await getReport(request("FINAL_BILLS"))).json();
  const bill = body.bills[0];
  assert.equal(bill.grossTotal, 422.5);
  assert.equal(bill.totalTax, 32.5);
  assert.equal(bill.totalIgst, 18);
  assert.equal(bill.balance, 355.5);
  assert.equal(bill.invoiceNo, "Not invoiced");
  assert.equal(bill.paymentMethod, "UPI");
  assert.equal(bill.paymentsList.length, 5);
});
test("executive report counts only the service date and exact collection day; workbook uses actual tax", async () => {
  const report = await getExecutiveReport({ propertyId: "report-property", startDate: "2026-10-23", endDate: "2026-10-23" });
  assert.equal(report.revenueAndCollections.categories.grossTurnover, 328);
  assert.equal(report.revenueAndCollections.categories.netRevenue, 317.5);
  assert.equal(report.summary.totalCollections.current, 217);
  assert.equal(report.summary.totalExpenses.current, 0);
  assert.equal(report.summary.cashPaidOut, 10, "A backdated voucher still affects the drawer on its actual payout day");
  assert.equal(report.summary.expectedClosingCash, -10);
  assert.equal(report.charts.dailyTrend.reduce((sum: number, day: any) => sum + day.totalRevenue, 0), Math.round(317.5));
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await generateExecutiveReportExcel(report) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets.find(s => s.name.includes("Revenue"))!;
  const food = sheet.getRows(1, sheet.rowCount)!.find(r => r.getCell(1).value === "Food & Beverage Revenue")!;
  assert.equal(food.getCell(2).value, 200);
  assert.equal(food.getCell(3).value, 23);
  assert.equal(food.getCell(4).value, 223);
  assert.equal(typeof food.getCell(5).value, "number");
  assert.equal(workbook.worksheets.length, 7);
  assert.equal(report.summary.roomsSold.current, 2, "Historical moved rooms must not inflate occupancy");
  assert.equal(report.summary.adr.current, 45, "ADR excludes recorded tax and includes the signed discount");
});
test("dining uses recorded bills, exports manual KOT and standalone receipts, and excludes duplicate/open/void settlements", async () => {
  const body = await (await getReport(request("FNB"))).json();
  assert.equal(body.rows.length, 4);
  assert.equal(body.rows.find((row: any) => row.id === "pos-open").settlementType, "UNSETTLED");
  assert.equal(body.rows.find((row: any) => row.id === "pos-paid").totalTax, 5);
  assert.equal(body.rows.find((row: any) => row.id === "food-charge").totalAmount, 118);
  assert.equal(body.rows.find((row: any) => row.id === "banquet-receipt").totalTax, null);
  assert.equal(body.rows.filter((row: any) => row.id === "pos-receipt").length, 0);
  assert.equal(body.summary.grossCollection, 273);
  assert.equal(body.summary.directSettledAmount, 155);
  assert.equal(body.summary.folioPostedAmount, 118);
  assert.equal(body.summary.openOrderValue, 105);
  assert.equal(body.summary.gstCollected, 23);
  assert.equal(body.summary.unverifiedTaxAmount, 50);
});
test("daily audit and revenue journal include counter-paid POS once, without treating advances as earned sales", async () => {
  const audit = await (await getReport(request("COMPREHENSIVE_AUDIT"))).json();
  assert.equal(audit.money.grossRevenue, 317.5);
  const journal = await (await getReport(request("REVENUE"))).json();
  assert.equal(journal.rows.filter((row: any) => row.sourceType === "POS_BILL").length, 1);
  assert.equal(journal.summary.totalGrossRevenue, 527.5);
  assert.equal(journal.summary.totalTax, 37.5);
});
test("API validates input and financial reports remain authenticated", async () => {
  assert.equal((await getReport(new Request("http://reports.test/api/v1/reports?type=REVENUE"))).status, 401);
  const invalid = new Request("http://reports.test/api/v1/reports?propertyId=report-property&date=2026-02-30", { headers: { Cookie: cookie } });
  assert.equal((await getReport(invalid)).status, 400);
  const reversed = new Request("http://reports.test/api/v1/reports/executive?propertyId=report-property&startDate=2026-10-24&endDate=2026-10-23", { headers: { Cookie: cookie } });
  assert.equal((await getExecutive(reversed)).status, 400);
});
