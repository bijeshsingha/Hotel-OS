import { prisma } from "../db/prisma";
import { getMidnightDayBoundaries } from "./daily-report-service";
import { resolveSelectedProperty } from "../config/property-config";
import { isEntryForRoom } from "./folio-service";

export interface ComprehensiveReportParams {
  propertyId?: string | null;
  date?: string; // YYYY-MM-DD
}

export interface AdminModificationRecord {
  id: string;
  occurredAt: string;
  timeFormatted: string;
  actorName: string;
  action: string;
  actionLabel: string;
  category: "ADMIN_CONFIG" | "ROOM_OPERATION" | "FINANCIAL_ADJUSTMENT" | "GRC_RECORD" | "SYSTEM_AUDIT";
  targetType: string;
  targetId: string;
  reason: string;
  summary: string;
  before: any;
  after: any;
}

export interface ComprehensiveHotelReport {
  generatedAt: string;
  reportDate: string;
  dayCycle: string;
  property: {
    id: string;
    code: string;
    displayName: string;
    legalName: string;
    gstin: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    businessDate: string;
    openingCashBalance: number;
  };
  money: {
    // Revenue & Turnover
    grossRevenue: number;
    roomRevenue: number;
    fbRevenue: number;
    ancillaryRevenue: number;
    taxableTurnover: number;
    totalTaxes: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;

    // Collections
    totalCollections: number;
    collectionsCount: number;
    collectionsByMethod: Record<string, number>;
    collectionsBySource: Record<string, number>;
    internalTransfers: {
      transferredDueToMaster: number;
      advanceAllocatedFromPool: number;
    };

    // Expenses
    totalExpenses: number;
    expensesCount: number;
    expensesByCategory: Record<string, number>;
    expensesByMethod: Record<string, number>;

    // Cash Drawer Reconciliation
    cashDrawer: {
      openingBalance: number;
      cashIn: number;
      cashOut: number;
      netCashInHand: number;
    };
    netCashFlow: number;
  };
  rooms: {
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    occupancyPct: number;
    adr: number;
    revpar: number;
    inHouseGuestsCount: number;
    arrivalsToday: number;
    departuresToday: number;
    roomStates: {
      inspected: number;
      clean: number;
      dirty: number;
      maintenance: number;
    };
    inHouseRoster: Array<{
      stayId: string;
      roomNumber: string;
      roomType: string;
      guestName: string;
      phone: string;
      checkInDate: string;
      expectedDeparture: string;
      totalCharges: number;
      totalPaid: number;
      balanceDue: number;
    }>;
  };
  adminModifications: {
    totalModificationsCount: number;
    records: AdminModificationRecord[];
  };
  recentTransactions: Array<{
    id: string;
    flow: "INFLOW" | "OUTFLOW";
    recordNo: string;
    timeFormatted: string;
    party: string;
    description: string;
    amount: number;
    method: string;
  }>;
}

/**
 * Returns human-friendly action label and category for audit logs
 */
function parseAuditAction(action: string): { label: string; category: AdminModificationRecord["category"] } {
  switch (action) {
    case "OPENING_CASH_BALANCE_SET":
      return { label: "Opening Cash Balance Adjusted", category: "FINANCIAL_ADJUSTMENT" };
    case "ADMIN_UPDATE_HOTEL_DETAILS":
    case "HOTEL_PROFILE_UPDATE":
      return { label: "Hotel Profile & Tax Details Modified", category: "ADMIN_CONFIG" };
    case "ADMIN_UPDATE_ROOM_RATES":
    case "RATE_MATRIX_UPDATE":
      return { label: "Room Rate Matrix Overridden", category: "ADMIN_CONFIG" };
    case "ADMIN_UPDATE_GRC":
    case "ADMIN_UPDATE_GRC_SYNCHRONIZED":
      return { label: "Guest Registration Card (GRC) Modified", category: "GRC_RECORD" };
    case "ADMIN_DELETE_GRC":
    case "ADMIN_DELETE_GRC_PRESERVED_IN_BACKUP":
      return { label: "Guest Registration Card Voided / Deleted", category: "GRC_RECORD" };
    case "ROOM_MOVE":
      return { label: "Room Move / Swap Initiated", category: "ROOM_OPERATION" };
    case "ROOM_STATE_CHANGE":
      return { label: "Room Status Changed", category: "ROOM_OPERATION" };
    case "DELETE_FOLIO_CHARGE":
      return { label: "Folio Charge Deleted / Voided", category: "FINANCIAL_ADJUSTMENT" };
    case "PAYMENT_EDIT":
      return { label: "Payment Transaction Edited", category: "FINANCIAL_ADJUSTMENT" };
    case "FOLIO_DISCOUNT_APPLIED":
      return { label: "Manager Discount Applied", category: "FINANCIAL_ADJUSTMENT" };
    case "NIGHT_AUDIT_CLOSE":
      return { label: "Night Audit Business Day Closed", category: "SYSTEM_AUDIT" };
    case "REPORT_EMAILED":
      return { label: "Operational Report Emailed via SMTP", category: "SYSTEM_AUDIT" };
    default:
      return { label: action.replace(/_/g, " "), category: "ADMIN_CONFIG" };
  }
}

/**
 * Generates the Comprehensive Hotel Master Report for the selected property
 */
export async function getComprehensiveHotelReport(
  params: ComprehensiveReportParams
): Promise<ComprehensiveHotelReport> {
  // 1. Resolve Target Property (from params or .env)
  const property = await resolveSelectedProperty(params.propertyId);
  if (!property) {
    throw new Error("No property configured in Hotel OS. Please check SELECTED_HOTEL_ID in .env");
  }

  const propertyId = property.id;
  const reportDate = params.date || property.businessDate || new Date().toISOString().split("T")[0];
  const { localStart, localEnd, startUtc, endUtc } = getMidnightDayBoundaries(reportDate);

  const filterWindow = {
    gte: localStart < startUtc ? localStart : startUtc,
    lte: localEnd > endUtc ? localEnd : endUtc,
  };

  // 2. Query Financial Data: Payments & Collections
  const payments = await prisma.payment.findMany({
    where: {
      propertyId,
      status: "SUCCEEDED",
      receivedAt: filterWindow,
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

  // 3. Query Expenses
  const expenses = await prisma.expense.findMany({
    where: {
      propertyId,
      status: "PAID",
      OR: [
        { businessDate: reportDate },
        { paidAt: filterWindow },
      ],
    },
    orderBy: { paidAt: "desc" },
  });

  // 4. Query Folio Charges for Revenue
  const folioEntries = await prisma.folioEntry.findMany({
    where: {
      propertyId,
      status: "POSTED",
      type: "CHARGE",
      OR: [
        { serviceDate: reportDate },
        { postedAt: filterWindow },
      ],
    },
  });

  // 5. Query Rooms & Stays for PMS metrics
  const [allRooms, stays, reservationsToday] = await Promise.all([
    prisma.room.findMany({
      where: { propertyId, active: true },
      include: { roomType: true, roomState: true },
    }),
    prisma.stay.findMany({
      where: { propertyId },
      include: {
        primaryGuest: true,
        roomAssignments: { include: { room: { include: { roomType: true } } } },
        folio: {
          include: {
            entries: { where: { status: "POSTED" } },
            payments: { where: { status: "SUCCEEDED" } },
          },
        },
      },
    }),
    prisma.reservation.findMany({
      where: {
        propertyId,
        arrivalDate: reportDate,
        status: { in: ["CONFIRMED", "TENTATIVE"] },
      },
    }),
  ]);

  // 6. Query Admin & Operational Modifications from AuditLog
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      propertyId,
      occurredAt: filterWindow,
    },
    orderBy: { occurredAt: "desc" },
  });

  // 7. Process Financials: Collections & Outstanding
  // Compute Outstanding Dues across all active folios (in-house + open checkouts)
  const openFolios = await prisma.folio.findMany({
    where: {
      propertyId,
      status: "OPEN",
    },
    select: { balance: true },
  });
  const inHouseOutstanding = stays
    .filter((s) => s.status === "IN_HOUSE")
    .reduce((sum, s) => {
      const ch = s.folio?.entries.reduce((a, b) => a + b.totalAmount, 0) || 0;
      const pd = s.folio?.payments.filter(p => p.method !== "TRANSFER" && p.method !== "ADVANCE_ALLOCATION").reduce((a, b) => a + b.amount, 0) || 0;
      return sum + Math.max(0, ch - pd);
    }, 0);
  const openFoliosOutstanding = openFolios.reduce((sum, f) => sum + Math.max(0, f.balance), 0);
  const totalOutstanding = Math.max(inHouseOutstanding, openFoliosOutstanding);

  const collectionsByMethod = {
    CASH: 0,
    UPI: 0,
    BTC: 0,
    CARD: 0,
    BANK_TRANSFER: 0,
    CHEQUE: 0,
    OUTSTANDING: Math.round(totalOutstanding * 100) / 100,
  };

  const collectionsBySource: Record<string, number> = {
    ADVANCE_DEPOSIT: 0,
    FOLIO_SETTLEMENT: 0,
    POS_RESTAURANT: 0,
    BAR_BEVERAGE: 0,
    BANQUET_ADVANCE: 0,
    DIRECT_PAYMENT: 0,
  };

  let totalCollections = 0;
  let totalTransferredDue = 0;
  let totalAdvanceAllocated = 0;
  let validPaymentsCount = 0;

  payments.forEach((p) => {
    const rawMethod = (p.method || "").toUpperCase().trim();

    // 1. Separate internal folio transfers & advance pool allocations
    if (rawMethod === "TRANSFER" || (p.reference || "").toLowerCase().includes("transferred due")) {
      totalTransferredDue += p.amount;
      return;
    }
    if (rawMethod === "ADVANCE_ALLOCATION" || (p.reference || "").toLowerCase().includes("allocated from group")) {
      totalAdvanceAllocated += p.amount;
      return;
    }

    // 2. Map tender modes: DIRECT_BILL -> BTC, OTA_VCC -> CARD, BANK_TRANSFER -> BANK_TRANSFER
    let targetMethod = rawMethod;
    if (targetMethod === "DIRECT_BILL") targetMethod = "BTC";
    else if (targetMethod === "OTA_VCC") targetMethod = "CARD";
    else if (targetMethod === "BANK_TRANSFER" || targetMethod === "BANK TRASFER") targetMethod = "BANK_TRANSFER";
    else if (!["CASH", "UPI", "BTC", "CARD", "BANK_TRANSFER", "CHEQUE"].includes(targetMethod)) {
      targetMethod = "UPI";
    }

    totalCollections += p.amount;
    validPaymentsCount++;
    (collectionsByMethod as any)[targetMethod] = ((collectionsByMethod as any)[targetMethod] || 0) + p.amount;

    let snapshot: any = {};
    if (p.payerSnapshot) {
      try {
        snapshot = JSON.parse(p.payerSnapshot);
      } catch (e) {}
    }

    const refLower = (p.reference || "").toLowerCase();
    let src = "FOLIO_SETTLEMENT";
    if (snapshot.category?.includes("BAR") || refLower.includes("bar")) {
      src = "BAR_BEVERAGE";
    } else if (snapshot.category?.includes("BANQUET") || refLower.includes("banquet")) {
      src = "BANQUET_ADVANCE";
    } else if (p.orderId || refLower.includes("pos") || refLower.includes("dining")) {
      src = "POS_RESTAURANT";
    } else if (p.reservationId || refLower.includes("deposit") || refLower.includes("advance")) {
      src = "ADVANCE_DEPOSIT";
    } else if (p.folioId) {
      src = "FOLIO_SETTLEMENT";
    } else {
      src = "DIRECT_PAYMENT";
    }
    collectionsBySource[src] = (collectionsBySource[src] || 0) + p.amount;
  });

  // 8. Process Financials: Expenses
  const expensesByCategory: Record<string, number> = {
    OWNER_PAYOUT: 0,
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
  expenses.forEach((e) => {
    totalExpenses += e.totalAmount;
    const cat = e.category || "OTHER";
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + e.totalAmount;
    const m = (e.paymentMethod || "CASH").toUpperCase();
    expensesByMethod[m] = (expensesByMethod[m] || 0) + e.totalAmount;
  });

  // 9. Process Financials: Cash Drawer Reconciliation
  const priorCutoff = filterWindow.gte;
  const [priorCashPayments, priorCashExpenses] = await Promise.all([
    prisma.payment.findMany({
      where: {
        propertyId,
        method: "CASH",
        status: "SUCCEEDED",
        receivedAt: { lt: priorCutoff },
      },
      select: { amount: true },
    }),
    prisma.expense.findMany({
      where: {
        propertyId,
        status: "PAID",
        paymentMethod: "CASH",
        paidAt: { lt: priorCutoff },
      },
      select: { totalAmount: true },
    }),
  ]);

  const priorCashIn = priorCashPayments.reduce((s, p) => s + p.amount, 0);
  const priorCashOut = priorCashExpenses.reduce((s, e) => s + e.totalAmount, 0);
  const baseOpening = property.openingCashBalance || 0;
  const openingBalance = Math.round((baseOpening + priorCashIn - priorCashOut) * 100) / 100;

  const cashIn = collectionsByMethod["CASH"] || 0;
  const cashOut = expensesByMethod["CASH"] || 0;
  const netCashInHand = Math.round((openingBalance + cashIn - cashOut) * 100) / 100;
  const netCashFlow = totalCollections - totalExpenses;

  // 10. Process Financials: Revenue & GST Journal
  let roomRevenue = 0;
  let fbRevenue = 0;
  let ancillaryRevenue = 0;
  let taxableTurnover = 0;
  let totalTaxes = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  folioEntries.forEach((entry) => {
    taxableTurnover += entry.taxableAmount || 0;
    const tax = entry.totalAmount - (entry.taxableAmount || 0);
    totalTaxes += tax;

    const code = (entry.chargeCode || "").toUpperCase();
    if (code === "ROOM_TARIFF" || code === "STAY_EXTENSION") {
      roomRevenue += entry.taxableAmount || 0;
    } else if (code.includes("FOOD") || code.includes("RESTAURANT") || code.includes("DINING")) {
      fbRevenue += entry.taxableAmount || 0;
    } else {
      ancillaryRevenue += entry.taxableAmount || 0;
    }

    if (entry.taxComponentsJson) {
      try {
        const comp = JSON.parse(entry.taxComponentsJson);
        cgstAmount += Number(comp.cgstAmount || 0);
        sgstAmount += Number(comp.sgstAmount || 0);
        igstAmount += Number(comp.igstAmount || 0);
      } catch (e) {
        cgstAmount += tax / 2;
        sgstAmount += tax / 2;
      }
    } else {
      cgstAmount += tax / 2;
      sgstAmount += tax / 2;
    }
  });

  const grossRevenue = taxableTurnover + totalTaxes;

  // 11. Process Rooms & Occupancy KPIs
  const inHouseStays = stays.filter((s) => {
    if (s.status === "IN_HOUSE") return true;
    const arr = s.arrivalAt.toISOString().split("T")[0];
    const dep = s.expectedDepartureAt.toISOString().split("T")[0];
    return reportDate >= arr && reportDate <= dep;
  });

  const totalRooms = allRooms.length;
  const occupiedRooms = inHouseStays.length;
  const vacantRooms = Math.max(0, totalRooms - occupiedRooms);
  const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 1000) / 10 : 0;
  const adr = occupiedRooms > 0 ? Math.round(roomRevenue / occupiedRooms) : 0;
  const revpar = totalRooms > 0 ? Math.round(roomRevenue / totalRooms) : 0;

  // Headcount & Flow
  let inHouseGuestsCount = 0;
  inHouseStays.forEach((s) => {
    inHouseGuestsCount += (s.adults || 1) + (s.children || 0);
  });

  const arrivalsToday = stays.filter(
    (s) => s.arrivalAt.toISOString().split("T")[0] === reportDate
  ).length + reservationsToday.length;

  const departuresToday = stays.filter(
    (s) => (s.actualDepartureAt || s.expectedDepartureAt).toISOString().split("T")[0] === reportDate
  ).length;

  // Room status distribution
  let inspected = 0;
  let clean = 0;
  let dirty = 0;
  let maintenance = 0;

  allRooms.forEach((r) => {
    const hk = (r.roomState?.housekeepingStatus || "CLEAN").toUpperCase();
    const sellability = (r.roomState?.sellabilityStatus || "AVAILABLE").toUpperCase();
    if (sellability === "OUT_OF_ORDER" || sellability === "UNDER_REPAIR" || sellability === "MAINTENANCE") {
      maintenance++;
    } else if (hk === "INSPECTED") {
      inspected++;
    } else if (hk === "CLEAN") {
      clean++;
    } else {
      dirty++;
    }
  });

  // In-House Roster summary
  const inHouseRoster = inHouseStays.map((s) => {
    const roomNumber = s.roomAssignments[0]?.room?.number || "Unassigned";
    const roomType = s.roomAssignments[0]?.room?.roomType?.name || "Standard";
    const totalCharges = s.folio?.entries.reduce((sum, e) => sum + e.totalAmount, 0) || 0;
    const totalPaid = s.folio?.payments.reduce((sum, p) => sum + p.amount, 0) || 0;
    const balanceDue = Math.round((totalCharges - totalPaid) * 100) / 100;

    return {
      stayId: s.id,
      roomNumber,
      roomType,
      guestName: s.primaryGuest.name,
      phone: s.primaryGuest.phone || "-",
      checkInDate: s.arrivalAt.toISOString().split("T")[0],
      expectedDeparture: s.expectedDepartureAt.toISOString().split("T")[0],
      totalCharges: Math.round(totalCharges * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      balanceDue,
    };
  });

  // 12. Process Admin & Operational Modifications Audit Records
  const adminRecords: AdminModificationRecord[] = auditLogs.map((log) => {
    const { label, category } = parseAuditAction(log.action);
    let beforeObj = null;
    let afterObj = null;
    try {
      if (log.beforeJson) beforeObj = JSON.parse(log.beforeJson);
    } catch (e) {}
    try {
      if (log.afterJson) afterObj = JSON.parse(log.afterJson);
    } catch (e) {}

    // Generate descriptive change summary
    let summary = log.reason || label;
    if (log.action === "OPENING_CASH_BALANCE_SET") {
      const prevBal = beforeObj?.openingCashBalance ?? 0;
      const newBal = afterObj?.openingCashBalance ?? 0;
      summary = `Opening cash float modified from ₹${prevBal.toLocaleString("en-IN")} to ₹${newBal.toLocaleString("en-IN")}. ${log.reason || ""}`;
    } else if (log.action === "ADMIN_UPDATE_HOTEL_DETAILS") {
      summary = `Property profile or tax metadata updated by admin. ${log.reason || ""}`;
    } else if (log.action === "ROOM_MOVE") {
      summary = `Guest transferred from Room ${beforeObj?.fromRoom || "-"} to Room ${afterObj?.toRoom || "-"}. ${log.reason || ""}`;
    } else if (log.action === "ADMIN_UPDATE_GRC" || log.action === "ADMIN_UPDATE_GRC_SYNCHRONIZED") {
      summary = `Guest Registration Card details adjusted in admin records. ${log.reason || ""}`;
    }

    return {
      id: log.id,
      occurredAt: log.occurredAt.toISOString(),
      timeFormatted: log.occurredAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      actorName: log.actorName || "Staff Administrator",
      action: log.action,
      actionLabel: label,
      category,
      targetType: log.targetType,
      targetId: log.targetId,
      reason: log.reason || "Routine Administrative Action",
      summary,
      before: beforeObj,
      after: afterObj,
    };
  });

  // 13. Combined Recent Transactions (Inflows and Outflows)
  const recentTransactions = [
    ...payments.map((p) => {
      let party = "Guest";
      if (p.payerSnapshot) {
        try {
          const snap = JSON.parse(p.payerSnapshot);
          if (snap.name) party = snap.name;
        } catch (e) {}
      }
      if (p.folio?.stay?.primaryGuest?.name) {
        party = p.folio.stay.primaryGuest.name;
      }
      const rawMethod = (p.method || "").toUpperCase().trim();
      const isInternal = rawMethod === "TRANSFER" || rawMethod === "ADVANCE_ALLOCATION";
      const displayMethod = rawMethod === "DIRECT_BILL" ? "BTC" : (rawMethod === "OTA_VCC" ? "CARD" : rawMethod);

      return {
        id: p.id,
        flow: "INFLOW" as const,
        recordNo: p.receiptNo,
        timeFormatted: p.receivedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        party: isInternal ? `${party} (Internal Reconciled)` : party,
        description: isInternal
          ? rawMethod === "TRANSFER"
            ? "Transferred Due to Master Folio"
            : "Allocated from Group Advance Pool"
          : `Collection via ${displayMethod} (${p.reference || "Direct Settlement"})`,
        amount: p.amount,
        method: displayMethod,
      };
    }),
    ...expenses.map((e) => ({
      id: e.id,
      flow: "OUTFLOW" as const,
      recordNo: e.voucherNo,
      timeFormatted: e.paidAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      party: e.payeeName,
      description: `Expense: ${e.category.replace(/_/g, " ")} - ${e.description}`,
      amount: -e.totalAmount,
      method: e.paymentMethod,
    })),
  ].sort((a, b) => b.recordNo.localeCompare(a.recordNo));

  return {
    generatedAt: new Date().toISOString(),
    reportDate,
    dayCycle: "12:00 AM – 12:00 AM Midnight",
    property: {
      id: property.id,
      code: property.code,
      displayName: property.displayName,
      legalName: property.legalName,
      gstin: property.gstin,
      address: property.address,
      phone: property.phone,
      email: property.email,
      businessDate: property.businessDate,
      openingCashBalance: baseOpening,
    },
    money: {
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      roomRevenue: Math.round(roomRevenue * 100) / 100,
      fbRevenue: Math.round(fbRevenue * 100) / 100,
      ancillaryRevenue: Math.round(ancillaryRevenue * 100) / 100,
      taxableTurnover: Math.round(taxableTurnover * 100) / 100,
      totalTaxes: Math.round(totalTaxes * 100) / 100,
      cgstAmount: Math.round(cgstAmount * 100) / 100,
      sgstAmount: Math.round(sgstAmount * 100) / 100,
      igstAmount: Math.round(igstAmount * 100) / 100,

      totalCollections: Math.round(totalCollections * 100) / 100,
      collectionsCount: validPaymentsCount,
      collectionsByMethod,
      collectionsBySource,
      internalTransfers: {
        transferredDueToMaster: Math.round(totalTransferredDue * 100) / 100,
        advanceAllocatedFromPool: Math.round(totalAdvanceAllocated * 100) / 100,
      },

      totalExpenses: Math.round(totalExpenses * 100) / 100,
      expensesCount: expenses.length,
      expensesByCategory,
      expensesByMethod,

      cashDrawer: {
        openingBalance,
        cashIn,
        cashOut,
        netCashInHand,
      },
      netCashFlow: Math.round(netCashFlow * 100) / 100,
    },
    rooms: {
      totalRooms,
      occupiedRooms,
      vacantRooms,
      occupancyPct,
      adr,
      revpar,
      inHouseGuestsCount,
      arrivalsToday,
      departuresToday,
      roomStates: {
        inspected,
        clean,
        dirty,
        maintenance,
      },
      inHouseRoster,
    },
    adminModifications: {
      totalModificationsCount: adminRecords.length,
      records: adminRecords,
    },
    recentTransactions: recentTransactions.slice(0, 30),
  };
}
