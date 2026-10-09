import ExcelJS from "exceljs";
import { ExecutiveReportResult } from "./executive-report-service";

/**
 * Generates a multi-sheet .xlsx workbook for the Executive Report
 */
export async function generateExecutiveReportExcel(
  report: ExecutiveReportResult
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hotel OS Management System";
  workbook.created = new Date();
  workbook.modified = new Date();

  const brandFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" }, // Slate 900
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: "Arial",
    size: 10,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" }, // Slate 100
  };

  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };

  const borderTotal: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "double", color: { argb: "FF000000" } },
  };

  // Helper to add property banner
  const addReportHeader = (sheet: ExcelJS.Worksheet, title: string) => {
    sheet.addRow([report.property.displayName.toUpperCase()]);
    sheet.getCell("A1").font = { name: "Arial", size: 14, bold: true, color: { argb: "FF0F172A" } };

    sheet.addRow([
      `Report: ${title} | Period: ${report.filter.startDate} to ${report.filter.endDate} (${report.filter.daysCount} Day${report.filter.daysCount > 1 ? "s" : ""})`,
    ]);
    sheet.getCell("A2").font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } };

    sheet.addRow([
      `Legal Entity: ${report.property.legalName} | GSTIN: ${report.property.gstin || "N/A"} | Timezone: ${report.property.timezone} | Generated: ${report.filter.generatedAt}`,
    ]);
    sheet.getCell("A3").font = { name: "Arial", size: 9, color: { argb: "FF64748B" } };
    sheet.addRow([]); // Blank spacer
  };

  // -------------------------------------------------------------
  // 1. SHEET: Executive Summary & Definitions
  // -------------------------------------------------------------
  const summarySheet = workbook.addWorksheet("Executive Summary");
  addReportHeader(summarySheet, "Executive KPI Summary & Definitions");

  summarySheet.addRow(["Metric Category", "Metric Name", "Current Period", "Previous Period", "Change Amount", "Change %"]);
  const sumHeaderRow = summarySheet.lastRow!;
  sumHeaderRow.eachCell((cell) => {
    cell.fill = brandFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });

  const summaryData = [
    // Performance
    ["Occupancy & Inventory", "Rooms Sold (Nights)", report.summary.roomsSold.current, report.summary.roomsSold.previous, report.summary.roomsSold.changeAmount, `${report.summary.roomsSold.pctChange}%`],
    ["Occupancy & Inventory", "Occupancy Rate (%)", `${report.summary.occupancyPct.current}%`, `${report.summary.occupancyPct.previous}%`, `${report.summary.occupancyPct.changeAmount}%`, `${report.summary.occupancyPct.pctChange}%`],
    ["Occupancy & Inventory", "Average Daily Rate (ADR)", report.summary.adr.current, report.summary.adr.previous, report.summary.adr.changeAmount, `${report.summary.adr.pctChange}%`],
    ["Occupancy & Inventory", "Revenue Per Available Room (RevPAR)", report.summary.revpar.current, report.summary.revpar.previous, report.summary.revpar.changeAmount, `${report.summary.revpar.pctChange}%`],
    ["Occupancy & Inventory", "Total Available Rooms", report.summary.totalRooms, report.summary.totalRooms, 0, "0%"],
    
    // Guest Movement
    ["Guest Movement", "Check-In Bookings", report.summary.checkInsCount.current, report.summary.checkInsCount.previous, report.summary.checkInsCount.changeAmount, `${report.summary.checkInsCount.pctChange}%`],
    ["Guest Movement", "Check-In Adults", report.summary.checkInAdults, "-", "-", "-"],
    ["Guest Movement", "Check-In Children", report.summary.checkInChildren, "-", "-", "-"],
    ["Guest Movement", "Check-Out Count", report.summary.checkOutsCount.current, report.summary.checkOutsCount.previous, report.summary.checkOutsCount.changeAmount, `${report.summary.checkOutsCount.pctChange}%`],
    ["Guest Movement", "In-House Guests", report.summary.inHouseGuestsCount.current, "-", "-", "-"],
    ["Guest Movement", "In-House Rooms Occupied", report.summary.inHouseRoomsCount, "-", "-", "-"],

    // Financial Revenue
    ["Earned Revenue", "Room Tariff Revenue", report.summary.roomRevenue.current, report.summary.roomRevenue.previous, report.summary.roomRevenue.changeAmount, `${report.summary.roomRevenue.pctChange}%`],
    ["Earned Revenue", "Food & Beverage Revenue", report.summary.foodRevenue.current, report.summary.foodRevenue.previous, report.summary.foodRevenue.changeAmount, `${report.summary.foodRevenue.pctChange}%`],
    ["Earned Revenue", "Other Services Revenue", report.summary.otherRevenue.current, report.summary.otherRevenue.previous, report.summary.otherRevenue.changeAmount, `${report.summary.otherRevenue.pctChange}%`],
    ["Earned Revenue", "Total Earned Revenue", report.summary.totalRevenue.current, report.summary.totalRevenue.previous, report.summary.totalRevenue.changeAmount, `${report.summary.totalRevenue.pctChange}%`],

    // Collections & Expenses
    ["Cash Flow & Receivables", "Total Collections Received", report.summary.totalCollections.current, report.summary.totalCollections.previous, report.summary.totalCollections.changeAmount, `${report.summary.totalCollections.pctChange}%`],
    ["Cash Flow & Receivables", "Total Recorded Expenses", report.summary.totalExpenses.current, report.summary.totalExpenses.previous, report.summary.totalExpenses.changeAmount, `${report.summary.totalExpenses.pctChange}%`],
    ["Cash Flow & Receivables", "Future Booking Advances Received", report.summary.futureAdvancesReceived.current, report.summary.futureAdvancesReceived.previous, report.summary.futureAdvancesReceived.changeAmount, `${report.summary.futureAdvancesReceived.pctChange}%`],
    ["Cash Flow & Receivables", "Total Outstanding Receivables", report.summary.totalOutstanding.current, "-", "-", "-"],
    ["Cash Flow & Receivables", "Accounts with > ₹5,000 Outstanding", report.summary.roomsOver5kCount.current, "-", "-", "-"],

    // Cash Drawer
    ["Cash Position", "Opening Cash Balance", report.summary.openingCash, "-", "-", "-"],
    ["Cash Position", "Cash Receipts In", report.summary.cashReceived, "-", "-", "-"],
    ["Cash Position", "Cash Outflows / Expenses", report.summary.cashPaidOut, "-", "-", "-"],
    ["Cash Position", "Expected Closing Cash", report.summary.expectedClosingCash, "-", "-", "-"],
  ];

  for (const row of summaryData) {
    const added = summarySheet.addRow(row);
    added.eachCell((cell, colNum) => {
      cell.border = borderThin;
      if ([3, 4, 5].includes(colNum) && typeof cell.value === "number") {
        cell.numFmt = "#,##0.00";
      }
    });
  }

  summarySheet.addRow([]);
  summarySheet.addRow(["Statutory Metric Definitions & Formulas"]);
  summarySheet.lastRow!.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF0F172A" } };
  summarySheet.addRow(["ADR (Average Daily Rate)", "Net Room Revenue ÷ Rooms Sold (Nights)", "Excludes taxes, F&B, and complimentary/house use units."]);
  summarySheet.addRow(["RevPAR (Revenue Per Available Room)", "Net Room Revenue ÷ Available Room Nights", "Total room capacity available over the duration of the period."]);
  summarySheet.addRow(["Occupancy %", "Rooms Sold ÷ Available Room Nights × 100", "Total occupied room nights divided by total inventory capacity."]);
  summarySheet.addRow(["Earned Revenue", "Accrued value of services rendered in stay period", "Distinct from cash collections; recognized upon service delivery."]);
  summarySheet.addRow(["Collections", "Actual gross monies received via Cash, UPI, Card, or Bank", "Includes booking advances and settlement of past guest accounts."]);
  summarySheet.addRow(["Cash Reconciliation", "Opening Cash + Cash Received − Cash Paid Out", "Expected physical drawer total at handover or end of day."]);

  // -------------------------------------------------------------
  // 2. SHEET: Revenue Breakdown
  // -------------------------------------------------------------
  const revSheet = workbook.addWorksheet("Revenue Breakdown");
  addReportHeader(revSheet, "Earned Revenue Breakdown & Taxes");

  revSheet.addRow(["Revenue Stream / Component", "Taxable Amount (₹)", "Taxes / GST (₹)", "Total Earned Amount (₹)", "% Contribution"]);
  const revHeaderRow = revSheet.lastRow!;
  revHeaderRow.eachCell((cell) => {
    cell.fill = brandFill;
    cell.font = headerFont;
  });

  const totRev = report.revenueAndCollections.categories.grossTurnover || 1;
  const revRows = [
    ["Room Tariff Revenue", report.revenueAndCollections.categories.roomRevenue * 0.88, report.revenueAndCollections.categories.roomRevenue * 0.12, report.revenueAndCollections.categories.roomRevenue, `${Math.round((report.revenueAndCollections.categories.roomRevenue / totRev) * 100)}%`],
    ["Food & Beverage Revenue", report.revenueAndCollections.categories.fbRevenue * 0.95, report.revenueAndCollections.categories.fbRevenue * 0.05, report.revenueAndCollections.categories.fbRevenue, `${Math.round((report.revenueAndCollections.categories.fbRevenue / totRev) * 100)}%`],
    ["Other Ancillary Services", report.revenueAndCollections.categories.otherRevenue * 0.82, report.revenueAndCollections.categories.otherRevenue * 0.18, report.revenueAndCollections.categories.otherRevenue, `${Math.round((report.revenueAndCollections.categories.otherRevenue / totRev) * 100)}%`],
    ["Manager Discounts / Deductions", -report.revenueAndCollections.categories.discountsAmount, 0, -report.revenueAndCollections.categories.discountsAmount, "-"],
  ];

  for (const r of revRows) {
    const row = revSheet.addRow(r);
    row.eachCell((cell, colNum) => {
      cell.border = borderThin;
      if ([2, 3, 4].includes(colNum) && typeof cell.value === "number") {
        cell.numFmt = "#,##0.00";
      }
    });
  }

  const revTotalRow = revSheet.addRow([
    "Net Operational Revenue",
    report.revenueAndCollections.categories.taxableAmount,
    report.revenueAndCollections.categories.totalTax,
    report.revenueAndCollections.categories.netRevenue,
    "100%",
  ]);
  revTotalRow.font = { bold: true };
  revTotalRow.fill = totalFill;
  revTotalRow.eachCell((cell, colNum) => {
    cell.border = borderTotal;
    if ([2, 3, 4].includes(colNum)) cell.numFmt = "#,##0.00";
  });

  // -------------------------------------------------------------
  // 3. SHEET: Collections & Payment Methods
  // -------------------------------------------------------------
  const colSheet = workbook.addWorksheet("Collections & Receipts");
  addReportHeader(colSheet, "Collections, Payment Methods & Receipts");

  colSheet.addRow(["Payment Method Breakdown"]);
  colSheet.lastRow!.font = { bold: true, size: 11 };
  colSheet.addRow(["Payment Method", "Amount Collected (₹)", "% Share"]);
  colSheet.lastRow!.eachCell((c) => { c.fill = brandFill; c.font = headerFont; });

  const totCol = report.summary.totalCollections.current || 1;
  for (const [m, amt] of Object.entries(report.revenueAndCollections.collectionsByMethod)) {
    const r = colSheet.addRow([m, amt, `${Math.round((amt / totCol) * 100)}%`]);
    r.getCell(2).numFmt = "#,##0.00";
    r.eachCell((c) => { c.border = borderThin; });
  }

  colSheet.addRow([]);
  colSheet.addRow(["Itemized Transaction Receipt Ledger"]);
  colSheet.lastRow!.font = { bold: true, size: 11 };

  colSheet.addRow(["Receipt #", "Date & Time", "Payer / Guest Name", "Room / Reference", "Category", "Payment Method", "Amount (₹)", "Transaction Reference", "Status"]);
  colSheet.lastRow!.eachCell((c) => { c.fill = brandFill; c.font = headerFont; });

  for (const t of report.revenueAndCollections.transactions) {
    const r = colSheet.addRow([
      t.receiptNo,
      t.receivedAtFormatted,
      t.payerName,
      t.roomOrBookingRef,
      t.category,
      t.paymentMethod,
      t.amount,
      t.reference,
      t.status,
    ]);
    r.getCell(7).numFmt = "#,##0.00";
    r.eachCell((c) => { c.border = borderThin; });
  }

  // -------------------------------------------------------------
  // 4. SHEET: Outstanding Balances (> ₹5,000)
  // -------------------------------------------------------------
  const recSheet = workbook.addWorksheet("Outstanding Receivables");
  addReportHeader(recSheet, "Guest Accounts with Balance > ₹5,000");

  recSheet.addRow(["Room #", "Primary Guest", "Contact", "Booking Ref", "Stay Dates", "Status", "Total Charges (₹)", "Payments (₹)", "Balance Due (₹)", "Room Due (₹)", "F&B Due (₹)", "Other Due (₹)", "Age (Days)"]);
  recSheet.lastRow!.eachCell((c) => { c.fill = brandFill; c.font = headerFont; });

  for (const acc of report.highReceivables.accounts) {
    const r = recSheet.addRow([
      acc.roomNumber,
      acc.guestName,
      acc.phone,
      acc.bookingRef,
      acc.stayDates,
      acc.status,
      acc.totalCharges,
      acc.paymentsApplied,
      acc.balanceDue,
      acc.roomCharges,
      acc.foodCharges,
      acc.otherCharges,
      acc.ageDays,
    ]);
    [7, 8, 9, 10, 11, 12].forEach((idx) => {
      r.getCell(idx).numFmt = "#,##0.00";
    });
    r.eachCell((c) => { c.border = borderThin; });
  }

  const recTotRow = recSheet.addRow([
    "TOTAL RECEIVABLES (> ₹5k)",
    "", "", "", "", "",
    report.highReceivables.accounts.reduce((s, a) => s + a.totalCharges, 0),
    report.highReceivables.accounts.reduce((s, a) => s + a.paymentsApplied, 0),
    report.highReceivables.totalOverThresholdAmount,
    "", "", "", "",
  ]);
  recTotRow.font = { bold: true };
  recTotRow.fill = totalFill;
  recTotRow.eachCell((c, colNum) => {
    c.border = borderTotal;
    if ([7, 8, 9].includes(colNum)) c.numFmt = "#,##0.00";
  });

  // -------------------------------------------------------------
  // 5. SHEET: Future Booking Advances
  // -------------------------------------------------------------
  const advSheet = workbook.addWorksheet("Future Advances");
  addReportHeader(advSheet, "Advances Received for Future Bookings");

  advSheet.addRow(["Summary of Advances"]);
  advSheet.lastRow!.font = { bold: true };
  advSheet.addRow(["Advances Received in Period (₹)", report.futureAdvances.receivedInPeriod]);
  advSheet.addRow(["Total Unapplied Advances Currently Held (₹)", report.futureAdvances.totalUnappliedHeld]);
  advSheet.getCell("B6").numFmt = "#,##0.00";
  advSheet.getCell("B7").numFmt = "#,##0.00";

  advSheet.addRow([]);
  advSheet.addRow(["Receipt #", "Guest Name", "Booking Confirmation #", "Arrival Date", "Departure Date", "Amount (₹)", "Payment Method", "Receipt Date", "Booking Status"]);
  advSheet.lastRow!.eachCell((c) => { c.fill = brandFill; c.font = headerFont; });

  for (const adv of report.futureAdvances.items) {
    const r = advSheet.addRow([
      adv.receiptNo,
      adv.guestName,
      adv.bookingRef,
      adv.arrivalDate,
      adv.departureDate,
      adv.amountReceived,
      adv.paymentMethod,
      adv.receiptDate,
      adv.bookingStatus,
    ]);
    r.getCell(6).numFmt = "#,##0.00";
    r.eachCell((c) => { c.border = borderThin; });
  }

  // -------------------------------------------------------------
  // 6. SHEET: Expense Register
  // -------------------------------------------------------------
  const expSheet = workbook.addWorksheet("Expenses Register");
  addReportHeader(expSheet, "Hotel Operating Expenses & Payments");

  expSheet.addRow(["Expense Summary by Category"]);
  expSheet.lastRow!.font = { bold: true };
  expSheet.addRow(["Category", "Amount Paid (₹)", "% Share"]);
  expSheet.lastRow!.eachCell((c) => { c.fill = brandFill; c.font = headerFont; });

  const totExp = report.expenses.totalExpenses || 1;
  for (const [cat, amt] of Object.entries(report.expenses.byCategory)) {
    const r = expSheet.addRow([cat, amt, `${Math.round((amt / totExp) * 100)}%`]);
    r.getCell(2).numFmt = "#,##0.00";
    r.eachCell((c) => { c.border = borderThin; });
  }

  expSheet.addRow([]);
  expSheet.addRow(["Itemized Expense Vouchers"]);
  expSheet.lastRow!.font = { bold: true };
  expSheet.addRow(["Voucher #", "Payment Date", "Description / Narration", "Category", "Payee / Vendor", "Amount (₹)", "Payment Method", "Status", "Reference"]);
  expSheet.lastRow!.eachCell((c) => { c.fill = brandFill; c.font = headerFont; });

  for (const e of report.expenses.expensesList) {
    const r = expSheet.addRow([
      e.voucherNo,
      e.date,
      e.description,
      e.category,
      e.payeeName,
      e.totalAmount,
      e.paymentMethod,
      e.paymentStatus,
      e.reference,
    ]);
    r.getCell(6).numFmt = "#,##0.00";
    r.eachCell((c) => { c.border = borderThin; });
  }

  // -------------------------------------------------------------
  // 7. SHEET: Cash Position & Reconciliation
  // -------------------------------------------------------------
  const cashSheet = workbook.addWorksheet("Cash Reconciliation");
  addReportHeader(cashSheet, "Cash Position & Movement Reconciliation");

  cashSheet.addRow(["Cash Drawer Movement Formula"]);
  cashSheet.lastRow!.font = { bold: true, size: 11 };
  cashSheet.addRow(["Component", "Amount (₹)", "Notes"]);
  cashSheet.lastRow!.eachCell((c) => { c.fill = brandFill; c.font = headerFont; });

  const cashMovements = [
    ["Opening Cash Balance", report.cashReconciliation.openingBalance, "Carried forward from drawer opening / previous close"],
    ["(+) Cash Received / Collections", report.cashReconciliation.cashCollections, "Physical cash receipts from guest payments and advances"],
    ["(-) Cash Expenses & Outflows", -report.cashReconciliation.cashExpenses, "Physical cash paid out for operational expenses & petty cash"],
    ["(=) Expected Closing Cash Balance", report.cashReconciliation.expectedClosingCash, "Calculated system cash balance in drawer"],
  ];

  for (const m of cashMovements) {
    const r = cashSheet.addRow(m);
    r.getCell(2).numFmt = "#,##0.00";
    r.eachCell((c) => { c.border = borderThin; });
  }

  cashSheet.addRow([]);
  cashSheet.addRow(["Payment Collections by Instrument"]);
  cashSheet.lastRow!.font = { bold: true };
  cashSheet.addRow(["Instrument", "Total Collected (₹)"]);
  cashSheet.lastRow!.eachCell((c) => { c.fill = brandFill; c.font = headerFont; });

  const instruments = [
    ["Cash (Physical Drawer)", report.cashReconciliation.collectionsByInstrument.cash],
    ["UPI / QR Collections", report.cashReconciliation.collectionsByInstrument.upi],
    ["Credit / Debit Cards", report.cashReconciliation.collectionsByInstrument.card],
    ["Bank Transfer (NEFT/RTGS)", report.cashReconciliation.collectionsByInstrument.bankTransfer],
    ["Cheques", report.cashReconciliation.collectionsByInstrument.cheque],
    ["Other Payments", report.cashReconciliation.collectionsByInstrument.other],
  ];

  for (const inst of instruments) {
    const r = cashSheet.addRow(inst);
    r.getCell(2).numFmt = "#,##0.00";
    r.eachCell((c) => { c.border = borderThin; });
  }

  // Auto-fit column widths across all sheets
  workbook.eachSheet((sheet) => {
    sheet.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const str = String(cell.value || "");
        if (str.length > maxLen && str.length < 60) {
          maxLen = str.length;
        }
      });
      col.width = Math.min(maxLen + 3, 50);
    });
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
