import { prisma } from "../db/prisma";

export interface DailyReportFilter {
  propertyId: string;
  date?: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
  cycle?: "12_TO_12";
}

export interface HourlyBucket {
  hour: number;
  hourLabel: string; // e.g. "12 AM", "1 AM", "12 PM", "11 PM"
  collections: number;
  expenses: number;
  revenue: number;
  transactionsCount: number;
}

export interface DailyReportResult {
  reportDate: string; // YYYY-MM-DD
  cycle: string; // "12:00 AM – 12:00 AM (Midnight to Midnight)"
  startTime: string;
  endTime: string;
  generatedAt: string;
  property: {
    id: string;
    code: string;
    displayName: string;
    legalName: string;
    gstin: string | null;
    businessDate: string;
    timezone: string;
  };
  financialSummary: {
    grossRevenue: number;
    roomRevenue: number;
    fbRevenue: number;
    otherRevenue: number;
    taxableAmount: number;
    totalTax: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalCollections: number;
    collectionsCount: number;
    totalExpenses: number;
    expensesCount: number;
    netCashFlow: number;
    cashDrawerPosition: {
      cashIn: number;
      cashOut: number;
      netCashInHand: number;
    };
  };
  collectionsByMethod: Record<string, number>;
  collectionsBySource: Record<string, number>;
  expensesByCategory: Record<string, number>;
  expensesByMethod: Record<string, number>;
  pmsMetrics: {
    totalRooms: number;
    roomsSold: number;
    availableRooms: number;
    occupancyPct: number;
    adr: number;
    revpar: number;
    inHouseGuestsCount: number;
    checkInsCount: number;
    checkOutsCount: number;
  };
  hourlyActivity: HourlyBucket[];
  recentTransactions: any[];
}

/**
 * Returns Date boundaries for 12 AM to 12 AM (00:00:00.000 to 23:59:59.999)
 */
export function getMidnightDayBoundaries(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  // Construct UTC/local range
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  // Local dates as well for flexible comparison
  const localStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  const localEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

  return {
    startUtc: start,
    endUtc: end,
    localStart,
    localEnd,
    dateStr,
  };
}

/**
 * Formats hour index (0..23) to 12-hour format string (e.g., "12 AM", "1 AM", "12 PM")
 */
function getHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

/**
 * Generates the full 12 AM to 12 AM Midnight Daily Manager Report
 */
export async function getDailyMidnightReport(
  propertyId: string,
  targetDate?: string
): Promise<DailyReportResult> {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: {
      rooms: { where: { active: true } },
    },
  });

  const reportDate = targetDate || property.businessDate;
  const { localStart, localEnd, startUtc, endUtc } = getMidnightDayBoundaries(reportDate);

  // 1. Fetch Collections within the 12 AM - 12 AM Window
  const payments = await prisma.payment.findMany({
    where: {
      propertyId,
      status: "SUCCEEDED",
      receivedAt: {
        gte: localStart < startUtc ? localStart : startUtc,
        lte: localEnd > endUtc ? localEnd : endUtc,
      },
    },
    include: {
      folio: {
        include: {
          stay: {
            include: {
              primaryGuest: true,
              roomAssignments: { include: { room: true } },
            },
          },
        },
      },
    },
    orderBy: { receivedAt: "desc" },
  });

  // 2. Fetch Expenses within the 12 AM - 12 AM Window
  const expenses = await prisma.expense.findMany({
    where: {
      propertyId,
      status: "PAID",
      OR: [
        { businessDate: reportDate },
        {
          paidAt: {
            gte: localStart < startUtc ? localStart : startUtc,
            lte: localEnd > endUtc ? localEnd : endUtc,
          },
        },
      ],
    },
    orderBy: { paidAt: "desc" },
  });


  // 3. Fetch Folio Entries (Charges) for this service date / 12-to-12 window
  const folioEntries = await prisma.folioEntry.findMany({
    where: {
      propertyId,
      status: "POSTED",
      OR: [
        { serviceDate: reportDate },
        {
          postedAt: {
            gte: localStart < startUtc ? localStart : startUtc,
            lte: localEnd > endUtc ? localEnd : endUtc,
          },
        },
      ],
    },
  });

  // 4. Fetch Stays for Occupancy & Guest Counts
  const stays = await prisma.stay.findMany({
    where: {
      propertyId,
    },
    include: {
      primaryGuest: true,
      roomAssignments: { include: { room: true } },
      folio: true,
    },
  });

  // Filter in-house on this date
  const inHouseStays = stays.filter((s) => {
    if (s.status === "IN_HOUSE") return true;
    const arr = s.arrivalAt.toISOString().split("T")[0];
    const dep = s.expectedDepartureAt.toISOString().split("T")[0];
    return reportDate >= arr && reportDate <= dep;
  });

  const checkInsCount = stays.filter((s) => {
    const arr = s.arrivalAt.toISOString().split("T")[0];
    return arr === reportDate;
  }).length;

  const checkOutsCount = stays.filter((s) => {
    const dep = s.expectedDepartureAt.toISOString().split("T")[0];
    return dep === reportDate && (s.status === "CHECKED_OUT" || s.status === "IN_HOUSE");
  }).length;

  // 5. Aggregate Collections
  const collectionsByMethod: Record<string, number> = {
    UPI: 0,
    CASH: 0,
    CARD: 0,
    OTA_VCC: 0,
    BANK_TRANSFER: 0,
    DIRECT_BILL: 0,
    CHEQUE: 0,
  };

  const collectionsBySource: Record<string, number> = {
    ADVANCE_DEPOSIT: 0,
    FOLIO_SETTLEMENT: 0,
    POS_RESTAURANT: 0,
    OTA_COLLECTION: 0,
    DIRECT_PAYMENT: 0,
  };

  let totalCollections = 0;
  const formattedCollections = payments.map((p) => {
    let payerName = "Guest";
    let roomNumber = "—";

    if (p.payerSnapshot) {
      try {
        const parsed = JSON.parse(p.payerSnapshot);
        if (parsed.name) payerName = parsed.name;
      } catch (e) {}
    }
    if (p.folio?.stay?.primaryGuest?.name) {
      payerName = p.folio.stay.primaryGuest.name;
    }
    if (p.folio?.stay?.roomAssignments?.[0]?.room?.number) {
      roomNumber = p.folio.stay.roomAssignments[0].room.number;
    }

    const refLower = (p.reference || "").toLowerCase();
    const methodUpper = (p.method || "").toUpperCase();

    let sourceCategory = "FOLIO_SETTLEMENT";
    let sourceLabel = "Folio Settlement";

    if (
      p.reservationId ||
      refLower.includes("grc-deposit") ||
      refLower.includes("advance") ||
      refLower.includes("deposit") ||
      refLower.includes("kiosk")
    ) {
      sourceCategory = "ADVANCE_DEPOSIT";
      sourceLabel = "Advance Deposit";
    } else if (
      p.orderId ||
      refLower.includes("pos") ||
      refLower.includes("order-") ||
      refLower.includes("restaurant") ||
      refLower.includes("dining")
    ) {
      sourceCategory = "POS_RESTAURANT";
      sourceLabel = "Restaurant / POS Direct";
    } else if (
      methodUpper === "OTA_VCC" ||
      methodUpper === "DIRECT_BILL" ||
      refLower.includes("ota") ||
      refLower.includes("makemytrip") ||
      refLower.includes("booking.com") ||
      refLower.includes("agoda")
    ) {
      sourceCategory = "OTA_COLLECTION";
      sourceLabel = "OTA / Channel VCC";
    } else if (p.folioId) {
      sourceCategory = "FOLIO_SETTLEMENT";
      sourceLabel = "Folio Settlement";
    } else {
      sourceCategory = "DIRECT_PAYMENT";
      sourceLabel = "Direct Collection";
    }

    totalCollections += p.amount;
    const m = p.method || "CASH";
    collectionsByMethod[m] = (collectionsByMethod[m] || 0) + p.amount;
    collectionsBySource[sourceCategory] = (collectionsBySource[sourceCategory] || 0) + p.amount;

    return {
      id: p.id,
      receiptNo: p.receiptNo,
      date: p.receivedAt.toISOString().split("T")[0],
      time: p.receivedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      timestamp: p.receivedAt,
      flow: "INFLOW",
      party: payerName,
      roomNumber,
      amount: p.amount,
      method: p.method,
      sourceCategory,
      sourceLabel,
      reference: p.reference && !p.reference.startsWith("GRC-DEPOSIT-") ? p.reference : "—",
    };
  });

  // 6. Aggregate Expenses
  const expensesByCategory: Record<string, number> = {
    DRIVER_COMMISSION: 0,
    VENDOR_PAYMENT: 0,
    STAFF_ADVANCE: 0,
    FB_PURCHASE: 0,
    MAINTENANCE: 0,
    HOUSEKEEPING: 0,
    PETTY_CASH: 0,
    UTILITIES: 0,
    GUEST_REFUND: 0,
    OTHER: 0,
  };

  const expensesByMethod: Record<string, number> = {
    CASH: 0,
    UPI: 0,
    BANK_TRANSFER: 0,
    CHEQUE: 0,
  };

  let totalExpenses = 0;
  const formattedExpenses = expenses.map((e) => {
    totalExpenses += e.totalAmount;
    const cat = e.category || "OTHER";
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + e.totalAmount;
    const m = e.paymentMethod || "CASH";
    expensesByMethod[m] = (expensesByMethod[m] || 0) + e.totalAmount;

    return {
      id: e.id,
      voucherNo: e.voucherNo,
      date: e.paidAt.toISOString().split("T")[0],
      time: e.paidAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      timestamp: e.paidAt,
      flow: "OUTFLOW",
      party: e.payeeName,
      category: e.category,
      description: e.description,
      amount: -e.totalAmount,
      totalAmount: e.totalAmount,
      method: e.paymentMethod,
      reference: e.reference || "Voucher Record",
    };
  });

  // 7. Cash Drawer Position
  const cashIn = collectionsByMethod["CASH"] || 0;
  const cashOut = expensesByMethod["CASH"] || 0;
  const netCashInHand = cashIn - cashOut;
  const netCashFlow = totalCollections - totalExpenses;

  // 8. Revenue & Tax Calculations
  let roomRevenue = 0;
  let fbRevenue = 0;
  let otherRevenue = 0;
  let taxableAmount = 0;
  let totalTax = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  folioEntries.forEach((entry) => {
    taxableAmount += entry.taxableAmount;
    const entryTax = entry.totalAmount - entry.taxableAmount;
    totalTax += entryTax;

    if (entry.chargeCode === "ROOM_TARIFF") {
      roomRevenue += entry.taxableAmount;
    } else if (entry.chargeCode === "RESTAURANT_FOOD" || entry.chargeCode.includes("FB")) {
      fbRevenue += entry.taxableAmount;
    } else {
      otherRevenue += entry.taxableAmount;
    }

    if (entry.taxComponentsJson) {
      try {
        const comps = JSON.parse(entry.taxComponentsJson);
        cgstAmount += comps.cgstAmount || 0;
        sgstAmount += comps.sgstAmount || 0;
        igstAmount += comps.igstAmount || 0;
      } catch (e) {
        cgstAmount += entryTax / 2;
        sgstAmount += entryTax / 2;
      }
    } else {
      cgstAmount += entryTax / 2;
      sgstAmount += entryTax / 2;
    }
  });

  const grossRevenue = taxableAmount + totalTax;

  // 9. PMS Key Performance Indicators
  const totalRooms = property.rooms.length;
  const roomsSold = inHouseStays.length;
  const availableRooms = Math.max(0, totalRooms - roomsSold);
  const occupancyPct = totalRooms > 0 ? Math.round((roomsSold / totalRooms) * 1000) / 10 : 0;
  const adr = roomsSold > 0 ? Math.round((roomRevenue / roomsSold) * 100) / 100 : 0;
  const revpar = totalRooms > 0 ? Math.round((roomRevenue / totalRooms) * 100) / 100 : 0;

  // 10. Hourly Breakdown (00:00 to 23:59) for 12 AM to 12 AM Cycle
  const hourlyBuckets: HourlyBucket[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    hourLabel: getHourLabel(i),
    collections: 0,
    expenses: 0,
    revenue: 0,
    transactionsCount: 0,
  }));

  // Map payments into hourly buckets
  formattedCollections.forEach((c) => {
    const hr = new Date(c.timestamp).getHours();
    if (hr >= 0 && hr < 24) {
      hourlyBuckets[hr].collections += c.amount;
      hourlyBuckets[hr].transactionsCount += 1;
    }
  });

  // Map expenses into hourly buckets
  formattedExpenses.forEach((e) => {
    const hr = new Date(e.timestamp).getHours();
    if (hr >= 0 && hr < 24) {
      hourlyBuckets[hr].expenses += e.totalAmount;
      hourlyBuckets[hr].transactionsCount += 1;
    }
  });

  // Map folio revenue into hourly buckets
  folioEntries.forEach((fe) => {
    const hr = new Date(fe.postedAt).getHours();
    if (hr >= 0 && hr < 24) {
      hourlyBuckets[hr].revenue += fe.totalAmount;
    }
  });

  // Combine and sort recent transactions
  const allTransactions = [
    ...formattedCollections.map((c) => ({
      id: c.id,
      recordId: c.receiptNo,
      type: "COLLECTION",
      flow: "INFLOW",
      party: c.party,
      particulars: `Room ${c.roomNumber} (${c.sourceLabel})`,
      method: c.method,
      amount: c.amount,
      time: c.time,
      date: c.date,
      timestamp: c.timestamp,
    })),
    ...formattedExpenses.map((e) => ({
      id: e.id,
      recordId: e.voucherNo,
      type: "EXPENSE",
      flow: "OUTFLOW",
      party: e.party,
      particulars: `${(e.category || "").replace(/_/g, " ")}: ${e.description}`,
      method: e.method,
      amount: -e.totalAmount,
      time: e.time,
      date: e.date,
      timestamp: e.timestamp,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    reportDate,
    cycle: "12:00 AM – 12:00 AM (Midnight to Midnight)",
    startTime: `${reportDate} 00:00:00`,
    endTime: `${reportDate} 23:59:59`,
    generatedAt: new Date().toISOString(),
    property: {
      id: property.id,
      code: property.code,
      displayName: property.displayName,
      legalName: property.legalName,
      gstin: property.gstin,
      businessDate: property.businessDate,
      timezone: property.timezone,
    },
    financialSummary: {
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      roomRevenue: Math.round(roomRevenue * 100) / 100,
      fbRevenue: Math.round(fbRevenue * 100) / 100,
      otherRevenue: Math.round(otherRevenue * 100) / 100,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      cgstAmount: Math.round(cgstAmount * 100) / 100,
      sgstAmount: Math.round(sgstAmount * 100) / 100,
      igstAmount: Math.round(igstAmount * 100) / 100,
      totalCollections: Math.round(totalCollections * 100) / 100,
      collectionsCount: formattedCollections.length,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      expensesCount: formattedExpenses.length,
      netCashFlow: Math.round(netCashFlow * 100) / 100,
      cashDrawerPosition: {
        cashIn: Math.round(cashIn * 100) / 100,
        cashOut: Math.round(cashOut * 100) / 100,
        netCashInHand: Math.round(netCashInHand * 100) / 100,
      },
    },
    collectionsByMethod,
    collectionsBySource,
    expensesByCategory,
    expensesByMethod,
    pmsMetrics: {
      totalRooms,
      roomsSold,
      availableRooms,
      occupancyPct,
      adr,
      revpar,
      inHouseGuestsCount: inHouseStays.length,
      checkInsCount,
      checkOutsCount,
    },
    hourlyActivity: hourlyBuckets,
    recentTransactions: allTransactions.slice(0, 50),
  };
}

/**
 * Saves a 12 AM Midnight Snapshot to database for historical audit records
 */
export async function saveMidnightSnapshot(
  propertyId: string,
  businessDate: string,
  actorId?: string
) {
  const report = await getDailyMidnightReport(propertyId, businessDate);
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
  });

  const metricsToStore = [
    { code: "OCCUPANCY_PCT", val: report.pmsMetrics.occupancyPct },
    { code: "ADR", val: report.pmsMetrics.adr },
    { code: "REVPAR", val: report.pmsMetrics.revpar },
    { code: "ROOM_REVENUE", val: report.financialSummary.roomRevenue },
    { code: "FB_REVENUE", val: report.financialSummary.fbRevenue },
    { code: "GROSS_REVENUE", val: report.financialSummary.grossRevenue },
    { code: "TOTAL_TAX", val: report.financialSummary.totalTax },
    { code: "TOTAL_COLLECTIONS", val: report.financialSummary.totalCollections },
    { code: "TOTAL_EXPENSES", val: report.financialSummary.totalExpenses },
    { code: "NET_CASH_DRAWER", val: report.financialSummary.cashDrawerPosition.netCashInHand },
  ];

  for (const m of metricsToStore) {
    await prisma.metricSnapshot.upsert({
      where: {
        propertyId_businessDate_metricCode: {
          propertyId,
          businessDate,
          metricCode: m.code,
        },
      },
      create: {
        organizationId: property.organizationId,
        propertyId,
        businessDate,
        metricCode: m.code,
        value: m.val,
      },
      update: {
        value: m.val,
        calculatedAt: new Date(),
      },
    });
  }

  // Record in audit log
  await prisma.auditLog.create({
    data: {
      organizationId: property.organizationId,
      propertyId,
      actorId,
      action: "DAILY_MIDNIGHT_REPORT_GENERATED",
      targetType: "DAILY_REPORT",
      targetId: `${propertyId}_${businessDate}`,
      afterJson: JSON.stringify({
        date: businessDate,
        cycle: report.cycle,
        summary: report.financialSummary,
        pms: report.pmsMetrics,
      }),
    },
  });

  return report;
}
