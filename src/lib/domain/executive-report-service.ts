import { prisma } from "../db/prisma";
import { resolveSelectedProperty } from "../config/property-config";
import { getMidnightDayBoundaries } from "./daily-report-service";

export interface ExecutiveReportParams {
  propertyId?: string | null;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export interface MetricComparison {
  current: number;
  previous: number;
  changeAmount: number;
  pctChange: number; // e.g. +14.2% or -5.1%
  trend: "UP" | "DOWN" | "NEUTRAL";
}

export interface ExecutiveSummaryMetrics {
  // Guests & Bookings
  checkInsCount: MetricComparison;
  checkInAdults: number;
  checkInChildren: number;
  checkInRoomsCount: number;
  checkOutsCount: MetricComparison;
  inHouseGuestsCount: MetricComparison;
  inHouseRoomsCount: number;

  // Inventory & Occupancy
  totalRooms: number;
  availableRoomNights: number;
  roomsSold: MetricComparison;
  occupancyPct: MetricComparison;

  // Revenue (Earned)
  roomRevenue: MetricComparison;
  foodRevenue: MetricComparison;
  otherRevenue: MetricComparison;
  totalRevenue: MetricComparison;

  // Collections & Expenses
  totalCollections: MetricComparison;
  totalExpenses: MetricComparison;
  futureAdvancesReceived: MetricComparison;

  // Receivables
  totalOutstanding: MetricComparison;
  roomsOver5kCount: MetricComparison;

  // Performance KPI
  adr: MetricComparison;
  revpar: MetricComparison;

  // Cash Position
  openingCash: number;
  cashReceived: number;
  cashPaidOut: number;
  expectedClosingCash: number;
  actualClosingCash: number | null;
  cashDiscrepancy: number | null;
}

export interface RevenueBreakdown {
  categories: {
    roomRevenue: number;
    fbRevenue: number;
    otherRevenue: number;
    taxableAmount: number;
    totalTax: number;
    discountsAmount: number;
    grossTurnover: number;
    netRevenue: number;
  };
  collectionsByMethod: Record<string, number>;
  collectionsBySource: Record<string, number>;
  bookingChannels: Record<string, number>;
  transactions: Array<{
    id: string;
    receiptNo: string;
    receivedAt: string;
    receivedAtFormatted: string;
    payerName: string;
    roomOrBookingRef: string;
    category: string;
    paymentMethod: string;
    amount: number;
    reference: string;
    status: string;
  }>;
}

export interface OutstandingRoomAccount {
  id: string;
  roomNumber: string;
  guestName: string;
  phone: string;
  bookingRef: string;
  stayDates: string;
  status: "IN_HOUSE" | "CHECKED_OUT";
  totalCharges: number;
  paymentsApplied: number;
  advancesApplied: number;
  balanceDue: number;
  roomCharges: number;
  foodCharges: number;
  otherCharges: number;
  ageDays: number;
  folioId: string;
  stayId: string;
}

export interface FutureBookingAdvance {
  id: string;
  guestName: string;
  bookingRef: string;
  arrivalDate: string;
  departureDate: string;
  amountReceived: number;
  paymentMethod: string;
  receiptDate: string;
  receiptNo: string;
  bookingStatus: string;
  isUnapplied: boolean;
}

export interface ExpenseReportSection {
  totalExpenses: number;
  cashExpenses: number;
  nonCashExpenses: number;
  byCategory: Record<string, number>;
  byDepartment: Record<string, number>;
  byMethod: Record<string, number>;
  byVendor: Record<string, number>;
  expensesList: Array<{
    id: string;
    voucherNo: string;
    date: string;
    description: string;
    category: string;
    payeeName: string;
    amount: number;
    taxAmount: number;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    reference: string;
  }>;
}

export interface CashReconciliationSection {
  openingBalance: number;
  cashCollections: number;
  cashExpenses: number;
  expectedClosingCash: number;
  actualClosingCash: number | null;
  discrepancy: number | null;
  collectionsByInstrument: {
    cash: number;
    upi: number;
    card: number;
    bankTransfer: number;
    cheque: number;
    other: number;
  };
}

export interface ExecutiveChartPoint {
  date: string;
  label: string;
  roomRevenue: number;
  foodRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  collections: number;
  expenses: number;
  roomsSold: number;
  occupancyPct: number;
  adr: number;
  revpar: number;
}

export interface ExecutiveReportResult {
  property: {
    id: string;
    code: string;
    displayName: string;
    legalName: string;
    gstin: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    timezone: string;
    currency: string;
    businessDate: string;
  };
  filter: {
    startDate: string;
    endDate: string;
    daysCount: number;
    previousStartDate: string;
    previousEndDate: string;
    timezone: string;
    generatedAt: string;
  };
  summary: ExecutiveSummaryMetrics;
  revenueAndCollections: RevenueBreakdown;
  highReceivables: {
    threshold: number;
    totalOverThresholdCount: number;
    totalOverThresholdAmount: number;
    totalOutstandingAllRooms: number;
    accounts: OutstandingRoomAccount[];
  };
  futureAdvances: {
    receivedInPeriod: number;
    totalUnappliedHeld: number;
    items: FutureBookingAdvance[];
  };
  expenses: ExpenseReportSection;
  cashReconciliation: CashReconciliationSection;
  charts: {
    dailyTrend: ExecutiveChartPoint[];
    revenueSplit: Array<{ name: string; value: number }>;
    collectionsByMethod: Array<{ name: string; value: number }>;
    expensesByCategory: Array<{ name: string; value: number }>;
    receivablesAging: Array<{ name: string; count: number; amount: number }>;
  };
  insights: {
    dailyBrief: string[];
    upcomingArrivalsNext48h: number;
    upcomingDeparturesNext48h: number;
    cancellationsCount: number;
    overdueCheckedOutCount: number;
    netOperationalSurplus: number; // Total Revenue - Total Expenses (labeled Operational Surplus)
  };
}

/**
 * Calculates percentage change and difference between two periods
 */
function compareMetrics(current: number, previous: number): MetricComparison {
  const diff = Math.round((current - previous) * 100) / 100;
  let pct = 0;
  if (previous > 0) {
    pct = Math.round(((current - previous) / previous) * 1000) / 10;
  } else if (current > 0) {
    pct = 100;
  }
  return {
    current: Math.round(current * 100) / 100,
    previous: Math.round(previous * 100) / 100,
    changeAmount: diff,
    pctChange: pct,
    trend: diff > 0 ? "UP" : diff < 0 ? "DOWN" : "NEUTRAL",
  };
}

/**
 * Helper to compute date range window
 */
function getRangeDateList(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  let curr = new Date(startStr);
  const end = new Date(endStr);
  while (curr <= end) {
    dates.push(curr.toISOString().split("T")[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

/**
 * Core Executive Reporting Engine
 */
export async function getExecutiveReport(
  params: ExecutiveReportParams
): Promise<ExecutiveReportResult> {
  const targetProperty = await resolveSelectedProperty(params.propertyId);
  if (!targetProperty) {
    throw new Error("No property configured. Please check SELECTED_HOTEL_ID or database.");
  }
  const propertyId = targetProperty.id;
  const businessDate = targetProperty.businessDate || new Date().toISOString().split("T")[0];

  const startDate = params.startDate || businessDate;
  const endDate = params.endDate || businessDate;

  // Calculate previous equivalent period
  const startD = new Date(startDate);
  const endD = new Date(endDate);
  const daysDiff = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const prevEndD = new Date(startD);
  prevEndD.setDate(prevEndD.getDate() - 1);
  const prevStartD = new Date(prevEndD);
  prevStartD.setDate(prevStartD.getDate() - (daysDiff - 1));

  const prevStartDate = prevStartD.toISOString().split("T")[0];
  const prevEndDate = prevEndD.toISOString().split("T")[0];

  // Boundaries for DB range queries
  const { localStart: curLocalStart, startUtc: curStartUtc } = getMidnightDayBoundaries(startDate);
  const { localEnd: curLocalEnd, endUtc: curEndUtc } = getMidnightDayBoundaries(endDate);
  const curStart = curLocalStart < curStartUtc ? curLocalStart : curStartUtc;
  const curEnd = curLocalEnd > curEndUtc ? curLocalEnd : curEndUtc;

  const { localStart: prevLocalStart, startUtc: prevStartUtc } = getMidnightDayBoundaries(prevStartDate);
  const { localEnd: prevLocalEnd, endUtc: prevEndUtc } = getMidnightDayBoundaries(prevEndDate);
  const prevStart = prevLocalStart < prevStartUtc ? prevLocalStart : prevStartUtc;
  const prevEnd = prevLocalEnd > prevEndUtc ? prevLocalEnd : prevEndUtc;

  // 1. Fetch Rooms & Inventory
  const rooms = await prisma.room.findMany({
    where: { propertyId, active: true },
    include: { roomType: true },
  });
  const totalRoomsCount = rooms.length;
  const availableRoomNights = totalRoomsCount * daysDiff;
  const prevAvailableRoomNights = totalRoomsCount * daysDiff;

  // 2. Fetch Stays & Reservations (Current & Previous)
  const stays = await prisma.stay.findMany({
    where: { propertyId },
    include: {
      primaryGuest: true,
      roomAssignments: { include: { room: true } },
      folio: {
        include: {
          entries: { where: { status: "POSTED" } },
          payments: { where: { status: "SUCCEEDED" } },
        },
      },
      reservationRoom: {
        include: { reservation: true },
      },
    },
  });

  const reservations = await prisma.reservation.findMany({
    where: { propertyId },
    include: { primaryGuest: true },
  });

  // Calculate Stays for Current Period
  let curCheckInsCount = 0;
  let curCheckInAdults = 0;
  let curCheckInChildren = 0;
  let curCheckInRoomsCount = 0;
  let curCheckOutsCount = 0;
  const inHouseStaysNow: typeof stays = [];

  const dateList = getRangeDateList(startDate, endDate);

  // Measure occupied room nights across the date range
  let curOccupiedRoomNights = 0;
  const curOccupiedStayIds = new Set<string>();

  for (const dateStr of dateList) {
    for (const s of stays) {
      if (s.status === "CANCELLED") continue;
      const arr = s.arrivalAt.toISOString().split("T")[0];
      const dep = (s.actualDepartureAt || s.expectedDepartureAt).toISOString().split("T")[0];

      // Stay active on this night
      if (dateStr >= arr && dateStr < dep) {
        curOccupiedRoomNights += s.roomAssignments.length > 0 ? s.roomAssignments.length : 1;
        curOccupiedStayIds.add(s.id);
      }
    }
  }

  // Check-ins & checkouts occurring during the date range
  for (const s of stays) {
    const arr = s.arrivalAt.toISOString().split("T")[0];
    const dep = (s.actualDepartureAt || s.expectedDepartureAt).toISOString().split("T")[0];

    if (arr >= startDate && arr <= endDate) {
      curCheckInsCount++;
      curCheckInAdults += s.adults || 1;
      curCheckInChildren += s.children || 0;
      curCheckInRoomsCount += s.roomAssignments.length > 0 ? s.roomAssignments.length : 1;
    }

    if (dep >= startDate && dep <= endDate && (s.status === "CHECKED_OUT" || s.status === "IN_HOUSE")) {
      curCheckOutsCount++;
    }

    // Currently in-house as of endDate
    if (s.status === "IN_HOUSE" || (arr <= endDate && dep > endDate && s.status !== "CHECKED_OUT")) {
      inHouseStaysNow.push(s);
    }
  }

  // Previous Period Stay Metrics
  let prevOccupiedRoomNights = 0;
  let prevCheckInsCount = 0;
  let prevCheckOutsCount = 0;
  const prevDateList = getRangeDateList(prevStartDate, prevEndDate);

  for (const dateStr of prevDateList) {
    for (const s of stays) {
      if (s.status === "CANCELLED") continue;
      const arr = s.arrivalAt.toISOString().split("T")[0];
      const dep = (s.actualDepartureAt || s.expectedDepartureAt).toISOString().split("T")[0];
      if (dateStr >= arr && dateStr < dep) {
        prevOccupiedRoomNights += s.roomAssignments.length > 0 ? s.roomAssignments.length : 1;
      }
    }
  }

  for (const s of stays) {
    const arr = s.arrivalAt.toISOString().split("T")[0];
    const dep = (s.actualDepartureAt || s.expectedDepartureAt).toISOString().split("T")[0];
    if (arr >= prevStartDate && arr <= prevEndDate) prevCheckInsCount++;
    if (dep >= prevStartDate && dep <= prevEndDate) prevCheckOutsCount++;
  }

  // 3. Fetch Folio Entries (Earned Revenue)
  const curFolioEntries = await prisma.folioEntry.findMany({
    where: {
      propertyId,
      status: "POSTED",
      OR: [
        { serviceDate: { gte: startDate, lte: endDate } },
        { postedAt: { gte: curStart, lte: curEnd } },
      ],
    },
  });

  const prevFolioEntries = await prisma.folioEntry.findMany({
    where: {
      propertyId,
      status: "POSTED",
      OR: [
        { serviceDate: { gte: prevStartDate, lte: prevEndDate } },
        { postedAt: { gte: prevStart, lte: prevEnd } },
      ],
    },
  });

  // Categorize Revenue
  const categorizeEntries = (entries: typeof curFolioEntries) => {
    let roomRev = 0;
    let fbRev = 0;
    let otherRev = 0;
    let taxable = 0;
    let tax = 0;
    let discounts = 0;

    for (const entry of entries) {
      const code = (entry.chargeCode || "").toUpperCase();
      const desc = (entry.description || "").toUpperCase();
      const amt = entry.totalAmount;
      const isNegative = amt < 0;

      if (entry.type === "ADJUSTMENT" || isNegative) {
        discounts += Math.abs(amt);
        continue;
      }

      taxable += entry.taxableAmount || amt;
      tax += Math.max(0, amt - (entry.taxableAmount || amt));

      if (code.includes("ROOM") || code.includes("TARIFF") || code.includes("BED") || code.includes("PAX")) {
        roomRev += amt;
      } else if (code.includes("FOOD") || code.includes("RESTAURANT") || code.includes("BEVERAGE") || code.includes("FB") || desc.includes("DINING")) {
        fbRev += amt;
      } else {
        otherRev += amt;
      }
    }

    const netRev = Math.max(0, roomRev + fbRev + otherRev - discounts);
    return {
      roomRev,
      fbRev,
      otherRev,
      taxable,
      tax,
      discounts,
      netRev,
      totalRev: roomRev + fbRev + otherRev,
    };
  };

  const curRevenue = categorizeEntries(curFolioEntries);
  const prevRevenue = categorizeEntries(prevFolioEntries);

  // 4. Fetch Payments & Collections
  const curPayments = await prisma.payment.findMany({
    where: {
      propertyId,
      status: "SUCCEEDED",
      receivedAt: { gte: curStart, lte: curEnd },
    },
    include: {
      folio: {
        include: {
          stay: {
            include: {
              primaryGuest: true,
              roomAssignments: { include: { room: true } },
              reservationRoom: { include: { reservation: true } },
            },
          },
        },
      },
    },
    orderBy: { receivedAt: "desc" },
  });

  const prevPayments = await prisma.payment.findMany({
    where: {
      propertyId,
      status: "SUCCEEDED",
      receivedAt: { gte: prevStart, lte: prevEnd },
    },
  });

  const collectionsByMethod: Record<string, number> = {
    CASH: 0,
    UPI: 0,
    CARD: 0,
    BANK_TRANSFER: 0,
    CHEQUE: 0,
    OTHER: 0,
  };

  const collectionsBySource: Record<string, number> = {
    GUEST_PAYMENT: 0,
    BOOKING_ADVANCE: 0,
    PREVIOUS_DUES: 0,
    OTHER: 0,
  };

  const bookingChannels: Record<string, number> = {
    DIRECT: 0,
    WALK_IN: 0,
    OTA: 0,
    CORPORATE: 0,
  };

  let curTotalCollections = 0;
  const transactionItems: RevenueBreakdown["transactions"] = [];

  for (const p of curPayments) {
    const amt = p.amount;
    curTotalCollections += amt;

    // Method breakdown
    const m = (p.method || "").toUpperCase();
    if (m.includes("CASH")) collectionsByMethod.CASH += amt;
    else if (m.includes("UPI")) collectionsByMethod.UPI += amt;
    else if (m.includes("CARD")) collectionsByMethod.CARD += amt;
    else if (m.includes("BANK") || m.includes("NEFT") || m.includes("RTGS") || m.includes("IMPS")) collectionsByMethod.BANK_TRANSFER += amt;
    else if (m.includes("CHEQUE")) collectionsByMethod.CHEQUE += amt;
    else collectionsByMethod.OTHER += amt;

    // Source breakdown
    let payerName = "Guest";
    let roomOrBookingRef = "-";
    let channel = "DIRECT";

    if (p.payerSnapshot) {
      try {
        const snap = JSON.parse(p.payerSnapshot);
        if (snap.name) payerName = snap.name;
      } catch {}
    }

    if (p.folio?.stay) {
      const st = p.folio.stay;
      payerName = st.primaryGuest?.name || payerName;
      if (st.roomAssignments.length > 0) {
        roomOrBookingRef = `Rm ${st.roomAssignments.map((ra) => ra.room.number).join(", ")}`;
      }
      if (st.reservationRoom?.reservation) {
        channel = (st.reservationRoom.reservation.source || "DIRECT").toUpperCase();
      }
      collectionsBySource.GUEST_PAYMENT += amt;
    } else if (p.reservationId) {
      collectionsBySource.BOOKING_ADVANCE += amt;
      roomOrBookingRef = `Res #${p.reservationId.slice(-6)}`;
    } else {
      collectionsBySource.OTHER += amt;
    }

    if (channel.includes("OTA") || channel.includes("AGODA") || channel.includes("MMT") || channel.includes("BOOKING")) {
      bookingChannels.OTA = (bookingChannels.OTA || 0) + amt;
    } else if (channel.includes("WALK")) {
      bookingChannels.WALK_IN = (bookingChannels.WALK_IN || 0) + amt;
    } else if (channel.includes("CORP") || channel.includes("COMPANY") || channel.includes("B2B")) {
      bookingChannels.CORPORATE = (bookingChannels.CORPORATE || 0) + amt;
    } else {
      bookingChannels.DIRECT = (bookingChannels.DIRECT || 0) + amt;
    }

    transactionItems.push({
      id: p.id,
      receiptNo: p.receiptNo || `REC-${p.id.slice(-6).toUpperCase()}`,
      receivedAt: p.receivedAt.toISOString(),
      receivedAtFormatted: p.receivedAt.toLocaleTimeString("en-IN", {
        timeZone: targetProperty.timezone,
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      }),
      payerName,
      roomOrBookingRef,
      category: p.folio ? "Folio Settlement" : p.reservationId ? "Advance Deposit" : "Direct Income",
      paymentMethod: p.method,
      amount: amt,
      reference: p.reference || "Verified",
      status: p.status,
    });
  }

  const prevTotalCollections = prevPayments.reduce((sum, p) => sum + p.amount, 0);

  // 5. Fetch Expenses
  const curExpenses = await prisma.expense.findMany({
    where: {
      propertyId,
      status: "PAID",
      OR: [
        { businessDate: { gte: startDate, lte: endDate } },
        { paidAt: { gte: curStart, lte: curEnd } },
      ],
    },
    orderBy: { paidAt: "desc" },
  });

  const prevExpenses = await prisma.expense.findMany({
    where: {
      propertyId,
      status: "PAID",
      OR: [
        { businessDate: { gte: prevStartDate, lte: prevEndDate } },
        { paidAt: { gte: prevStart, lte: prevEnd } },
      ],
    },
  });

  const expByCategory: Record<string, number> = {};
  const expByDepartment: Record<string, number> = {};
  const expByMethod: Record<string, number> = {};
  const expByVendor: Record<string, number> = {};
  let curTotalExpenses = 0;
  let curCashExpenses = 0;

  for (const exp of curExpenses) {
    const amt = exp.totalAmount || exp.amount;
    curTotalExpenses += amt;

    const cat = exp.category || "OTHER";
    expByCategory[cat] = (expByCategory[cat] || 0) + amt;

    // Approximate department
    let dept = "Front Office";
    if (cat.includes("FB") || cat.includes("FOOD")) dept = "Food & Beverage";
    else if (cat.includes("HOUSEKEEPING") || cat.includes("HK")) dept = "Housekeeping";
    else if (cat.includes("MAINTENANCE") || cat.includes("REPAIR")) dept = "Engineering & Maintenance";
    else if (cat.includes("SALARY") || cat.includes("STAFF")) dept = "Human Resources & Payroll";
    else if (cat.includes("UTILITIES") || cat.includes("POWER")) dept = "Operations";
    expByDepartment[dept] = (expByDepartment[dept] || 0) + amt;

    const meth = (exp.paymentMethod || "CASH").toUpperCase();
    expByMethod[meth] = (expByMethod[meth] || 0) + amt;
    if (meth.includes("CASH")) {
      curCashExpenses += amt;
    }

    const vend = exp.payeeName || "General Vendor";
    expByVendor[vend] = (expByVendor[vend] || 0) + amt;
  }

  const prevTotalExpenses = prevExpenses.reduce((sum, e) => sum + (e.totalAmount || e.amount), 0);

  // 6. Future Booking Advances
  // Advances received in period for arrivals in the future
  const futureAdvancesList: FutureBookingAdvance[] = [];
  let curFutureAdvancesReceived = 0;

  // Query deposits created or received
  const deposits = await prisma.deposit.findMany({
    where: {
      propertyId,
      createdAt: { gte: curStart, lte: curEnd },
    },
    include: {
      reservation: { include: { primaryGuest: true } },
    },
  });

  for (const dep of deposits) {
    if (dep.reservation && dep.reservation.arrivalDate > endDate) {
      curFutureAdvancesReceived += dep.originalAmount;
      futureAdvancesList.push({
        id: dep.id,
        guestName: dep.reservation.primaryGuest?.name || "Guest",
        bookingRef: dep.reservation.confirmationNo,
        arrivalDate: dep.reservation.arrivalDate,
        departureDate: dep.reservation.departureDate,
        amountReceived: dep.originalAmount,
        paymentMethod: "Advance Deposit",
        receiptDate: dep.createdAt.toISOString().split("T")[0],
        receiptNo: `DEP-${dep.id.slice(-6).toUpperCase()}`,
        bookingStatus: dep.reservation.status,
        isUnapplied: dep.status === "AVAILABLE",
      });
    }
  }

  // Also check payments tagged with reservationId
  for (const p of curPayments) {
    if (p.reservationId && !deposits.some((d) => d.paymentId === p.id)) {
      const res = reservations.find((r) => r.id === p.reservationId);
      if (res && res.arrivalDate > endDate) {
        curFutureAdvancesReceived += p.amount;
        futureAdvancesList.push({
          id: p.id,
          guestName: res.primaryGuest?.name || "Guest",
          bookingRef: res.confirmationNo,
          arrivalDate: res.arrivalDate,
          departureDate: res.departureDate,
          amountReceived: p.amount,
          paymentMethod: p.method,
          receiptDate: p.receivedAt.toISOString().split("T")[0],
          receiptNo: p.receiptNo || `REC-${p.id.slice(-6).toUpperCase()}`,
          bookingStatus: res.status,
          isUnapplied: true,
        });
      }
    }
  }

  // Total unapplied advances currently held
  const allHeldDeposits = await prisma.deposit.findMany({
    where: {
      propertyId,
      status: "AVAILABLE",
    },
  });
  const totalUnappliedHeldAdvances = allHeldDeposits.reduce((sum, d) => sum + d.availableAmount, 0);

  // 7. Receivables & Rooms with > ₹5,000 Outstanding
  // Compute outstanding balances across all open or recently checked-out stays
  const receivablesAccounts: OutstandingRoomAccount[] = [];
  let totalOutstandingAll = 0;
  let roomsOver5kCount = 0;
  let totalOver5kAmount = 0;

  for (const s of stays) {
    if (s.status === "CANCELLED") continue;
    const folio = s.folio;
    if (!folio) continue;

    // Calculate balance as of endDate: charges posted <= curEnd minus payments received <= curEnd
    const chargesUpToDate = folio.entries
      .filter((e) => e.status === "POSTED" && e.postedAt <= curEnd)
      .reduce((sum, e) => sum + e.totalAmount, 0);

    const paymentsUpToDate = folio.payments
      .filter((p) => p.status === "SUCCEEDED" && p.receivedAt <= curEnd)
      .reduce((sum, p) => sum + p.amount, 0);

    const balanceDue = Math.round((chargesUpToDate - paymentsUpToDate) * 100) / 100;
    if (balanceDue > 0) {
      totalOutstandingAll += balanceDue;
    }

    if (balanceDue > 5000) {
      roomsOver5kCount++;
      totalOver5kAmount += balanceDue;

      // Charge breakdown
      let roomCharges = 0;
      let foodCharges = 0;
      let otherCharges = 0;
      for (const e of folio.entries) {
        if (e.status !== "POSTED" || e.postedAt > curEnd) continue;
        const code = (e.chargeCode || "").toUpperCase();
        if (code.includes("ROOM") || code.includes("TARIFF")) roomCharges += e.totalAmount;
        else if (code.includes("FOOD") || code.includes("RESTAURANT") || code.includes("FB")) foodCharges += e.totalAmount;
        else otherCharges += e.totalAmount;
      }

      const arrStr = s.arrivalAt.toISOString().split("T")[0];
      const depStr = (s.actualDepartureAt || s.expectedDepartureAt).toISOString().split("T")[0];
      const ageDays = Math.max(0, Math.round((new Date(endDate).getTime() - new Date(arrStr).getTime()) / (1000 * 60 * 60 * 24)));

      const roomNumbers = s.roomAssignments.map((ra) => ra.room.number).join(", ") || "Unassigned";

      receivablesAccounts.push({
        id: folio.id,
        roomNumber: roomNumbers,
        guestName: s.primaryGuest?.name || "Guest",
        phone: s.primaryGuest?.phone || "-",
        bookingRef: s.reservationRoom?.reservation?.confirmationNo || `STAY-${s.id.slice(-6).toUpperCase()}`,
        stayDates: `${arrStr} to ${depStr}`,
        status: s.status === "CHECKED_OUT" ? "CHECKED_OUT" : "IN_HOUSE",
        totalCharges: Math.round(chargesUpToDate * 100) / 100,
        paymentsApplied: Math.round(paymentsUpToDate * 100) / 100,
        advancesApplied: 0,
        balanceDue,
        roomCharges: Math.round(roomCharges * 100) / 100,
        foodCharges: Math.round(foodCharges * 100) / 100,
        otherCharges: Math.round(otherCharges * 100) / 100,
        ageDays,
        folioId: folio.id,
        stayId: s.id,
      });
    }
  }

  // Sort receivables descending by balanceDue
  receivablesAccounts.sort((a, b) => b.balanceDue - a.balanceDue);

  // 8. Performance Metrics (ADR, RevPAR, Occupancy)
  const curOccupancyPct = availableRoomNights > 0 ? (curOccupiedRoomNights / availableRoomNights) * 100 : 0;
  const prevOccupancyPct = prevAvailableRoomNights > 0 ? (prevOccupiedRoomNights / prevAvailableRoomNights) * 100 : 0;

  const curAdr = curOccupiedRoomNights > 0 ? curRevenue.roomRev / curOccupiedRoomNights : 0;
  const prevAdr = prevOccupiedRoomNights > 0 ? prevRevenue.roomRev / prevOccupiedRoomNights : 0;

  const curRevpar = availableRoomNights > 0 ? curRevenue.roomRev / availableRoomNights : 0;
  const prevRevpar = prevAvailableRoomNights > 0 ? prevRevenue.roomRev / prevAvailableRoomNights : 0;

  // 9. Cash Position & Drawer Reconciliation
  const openingCash = targetProperty.openingCashBalance || 0;
  const cashReceived = collectionsByMethod.CASH || 0;
  const cashPaidOut = curCashExpenses || 0;
  const expectedClosingCash = Math.round((openingCash + cashReceived - cashPaidOut) * 100) / 100;

  // 10. Daily Chart Trend Points
  const chartPoints: ExecutiveChartPoint[] = [];
  for (const dateStr of dateList) {
    const { localStart: ds, localEnd: de, startUtc: su, endUtc: eu } = getMidnightDayBoundaries(dateStr);
    const dayStart = ds < su ? ds : su;
    const dayEnd = de > eu ? de : eu;

    // Day revenue
    const dayEntries = curFolioEntries.filter(
      (e) => e.serviceDate === dateStr || (e.postedAt >= dayStart && e.postedAt <= dayEnd)
    );
    const dayRev = categorizeEntries(dayEntries);

    // Day collections
    const dayPayments = curPayments.filter((p) => p.receivedAt >= dayStart && p.receivedAt <= dayEnd);
    const dayCol = dayPayments.reduce((sum, p) => sum + p.amount, 0);

    // Day expenses
    const dayExpRecords = curExpenses.filter(
      (e) => e.businessDate === dateStr || (e.paidAt >= dayStart && e.paidAt <= dayEnd)
    );
    const dayExp = dayExpRecords.reduce((sum, e) => sum + (e.totalAmount || e.amount), 0);

    // Day rooms sold
    let dayRoomsSold = 0;
    for (const s of stays) {
      if (s.status === "CANCELLED") continue;
      const arr = s.arrivalAt.toISOString().split("T")[0];
      const dep = (s.actualDepartureAt || s.expectedDepartureAt).toISOString().split("T")[0];
      if (dateStr >= arr && dateStr < dep) {
        dayRoomsSold += s.roomAssignments.length > 0 ? s.roomAssignments.length : 1;
      }
    }

    const dayOcc = totalRoomsCount > 0 ? (dayRoomsSold / totalRoomsCount) * 100 : 0;
    const dayAdr = dayRoomsSold > 0 ? dayRev.roomRev / dayRoomsSold : 0;
    const dayRevpar = totalRoomsCount > 0 ? dayRev.roomRev / totalRoomsCount : 0;

    chartPoints.push({
      date: dateStr,
      label: new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      roomRevenue: Math.round(dayRev.roomRev),
      foodRevenue: Math.round(dayRev.fbRev),
      otherRevenue: Math.round(dayRev.otherRev),
      totalRevenue: Math.round(dayRev.totalRev),
      collections: Math.round(dayCol),
      expenses: Math.round(dayExp),
      roomsSold: dayRoomsSold,
      occupancyPct: Math.round(dayOcc * 10) / 10,
      adr: Math.round(dayAdr),
      revpar: Math.round(dayRevpar),
    });
  }

  // 11. Receivables Aging Buckets
  const agingBuckets = [
    { name: "0-3 Days", min: 0, max: 3, count: 0, amount: 0 },
    { name: "4-7 Days", min: 4, max: 7, count: 0, amount: 0 },
    { name: "8-14 Days", min: 8, max: 14, count: 0, amount: 0 },
    { name: "15+ Days", min: 15, max: 9999, count: 0, amount: 0 },
  ];

  for (const acc of receivablesAccounts) {
    for (const b of agingBuckets) {
      if (acc.ageDays >= b.min && acc.ageDays <= b.max) {
        b.count++;
        b.amount += acc.balanceDue;
        break;
      }
    }
  }

  // 12. Insights & Briefing
  const now = new Date();
  const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];

  const upcomingArrivals = reservations.filter(
    (r) => r.arrivalDate >= todayStr && r.arrivalDate <= next48h && (r.status === "CONFIRMED" || r.status === "TENTATIVE")
  ).length;

  const upcomingDepartures = inHouseStaysNow.filter((s) => {
    const dep = s.expectedDepartureAt.toISOString().split("T")[0];
    return dep >= todayStr && dep <= next48h;
  }).length;

  const cancellationsCount = reservations.filter(
    (r) => r.status === "CANCELLED" && r.updatedAt >= curStart && r.updatedAt <= curEnd
  ).length;

  const overdueCheckedOut = receivablesAccounts.filter((a) => a.status === "CHECKED_OUT").length;

  const dailyBrief: string[] = [];
  dailyBrief.push(
    `Occupancy for ${startDate === endDate ? startDate : `${startDate} to ${endDate}`} averaged ${Math.round(curOccupancyPct)}% across ${totalRoomsCount} active rooms.`
  );
  if (curTotalCollections > curRevenue.totalRev) {
    dailyBrief.push(
      `Net collections (₹${Math.round(curTotalCollections).toLocaleString("en-IN")}) exceeded earned revenue (₹${Math.round(curRevenue.totalRev).toLocaleString("en-IN")}), reflecting strong advance payments and past dues recovery.`
    );
  } else {
    dailyBrief.push(
      `Earned revenue stood at ₹${Math.round(curRevenue.totalRev).toLocaleString("en-IN")} against ₹${Math.round(curTotalCollections).toLocaleString("en-IN")} collected in the period.`
    );
  }
  if (roomsOver5kCount > 0) {
    dailyBrief.push(
      `Attention required: ${roomsOver5kCount} room account${roomsOver5kCount > 1 ? "s" : ""} carry balances exceeding ₹5,000, totaling ₹${Math.round(totalOver5kAmount).toLocaleString("en-IN")}.`
    );
  } else {
    dailyBrief.push("No room accounts currently hold balances exceeding ₹5,000.");
  }
  if (curCashExpenses > 0) {
    dailyBrief.push(
      `Cash outflows totaled ₹${Math.round(curCashExpenses).toLocaleString("en-IN")}; expected drawer closing balance is ₹${Math.round(expectedClosingCash).toLocaleString("en-IN")}.`
    );
  }

  return {
    property: {
      id: targetProperty.id,
      code: targetProperty.code,
      displayName: targetProperty.displayName,
      legalName: targetProperty.legalName,
      gstin: targetProperty.gstin,
      address: targetProperty.address,
      phone: targetProperty.phone,
      email: targetProperty.email,
      timezone: targetProperty.timezone,
      currency: targetProperty.currency,
      businessDate: targetProperty.businessDate,
    },
    filter: {
      startDate,
      endDate,
      daysCount: daysDiff,
      previousStartDate: prevStartDate,
      previousEndDate: prevEndDate,
      timezone: targetProperty.timezone,
      generatedAt: new Date().toLocaleString("en-IN", { timeZone: targetProperty.timezone }),
    },
    summary: {
      checkInsCount: compareMetrics(curCheckInsCount, prevCheckInsCount),
      checkInAdults: curCheckInAdults,
      checkInChildren: curCheckInChildren,
      checkInRoomsCount: curCheckInRoomsCount,
      checkOutsCount: compareMetrics(curCheckOutsCount, prevCheckOutsCount),
      inHouseGuestsCount: compareMetrics(
        inHouseStaysNow.reduce((sum, s) => sum + (s.adults + s.children), 0),
        0
      ),
      inHouseRoomsCount: inHouseStaysNow.reduce(
        (sum, s) => sum + (s.roomAssignments.length > 0 ? s.roomAssignments.length : 1),
        0
      ),
      totalRooms: totalRoomsCount,
      availableRoomNights,
      roomsSold: compareMetrics(curOccupiedRoomNights, prevOccupiedRoomNights),
      occupancyPct: compareMetrics(curOccupancyPct, prevOccupancyPct),
      roomRevenue: compareMetrics(curRevenue.roomRev, prevRevenue.roomRev),
      foodRevenue: compareMetrics(curRevenue.fbRev, prevRevenue.fbRev),
      otherRevenue: compareMetrics(curRevenue.otherRev, prevRevenue.otherRev),
      totalRevenue: compareMetrics(curRevenue.totalRev, prevRevenue.totalRev),
      totalCollections: compareMetrics(curTotalCollections, prevTotalCollections),
      totalExpenses: compareMetrics(curTotalExpenses, prevTotalExpenses),
      futureAdvancesReceived: compareMetrics(curFutureAdvancesReceived, 0),
      totalOutstanding: compareMetrics(totalOutstandingAll, 0),
      roomsOver5kCount: compareMetrics(roomsOver5kCount, 0),
      adr: compareMetrics(curAdr, prevAdr),
      revpar: compareMetrics(curRevpar, prevRevpar),
      openingCash,
      cashReceived,
      cashPaidOut,
      expectedClosingCash,
      actualClosingCash: null,
      cashDiscrepancy: null,
    },
    revenueAndCollections: {
      categories: {
        roomRevenue: curRevenue.roomRev,
        fbRevenue: curRevenue.fbRev,
        otherRevenue: curRevenue.otherRev,
        taxableAmount: curRevenue.taxable,
        totalTax: curRevenue.tax,
        discountsAmount: curRevenue.discounts,
        grossTurnover: curRevenue.totalRev + curRevenue.tax,
        netRevenue: curRevenue.netRev,
      },
      collectionsByMethod,
      collectionsBySource,
      bookingChannels,
      transactions: transactionItems,
    },
    highReceivables: {
      threshold: 5000,
      totalOverThresholdCount: roomsOver5kCount,
      totalOverThresholdAmount: Math.round(totalOver5kAmount * 100) / 100,
      totalOutstandingAllRooms: Math.round(totalOutstandingAll * 100) / 100,
      accounts: receivablesAccounts,
    },
    futureAdvances: {
      receivedInPeriod: Math.round(curFutureAdvancesReceived * 100) / 100,
      totalUnappliedHeld: Math.round(totalUnappliedHeldAdvances * 100) / 100,
      items: futureAdvancesList,
    },
    expenses: {
      totalExpenses: Math.round(curTotalExpenses * 100) / 100,
      cashExpenses: Math.round(curCashExpenses * 100) / 100,
      nonCashExpenses: Math.round((curTotalExpenses - curCashExpenses) * 100) / 100,
      byCategory: expByCategory,
      byDepartment: expByDepartment,
      byMethod: expByMethod,
      byVendor: expByVendor,
      expensesList: curExpenses.map((e) => ({
        id: e.id,
        voucherNo: e.voucherNo || `EXP-${e.id.slice(-6).toUpperCase()}`,
        date: e.businessDate || e.paidAt.toISOString().split("T")[0],
        description: e.description,
        category: e.category,
        payeeName: e.payeeName,
        amount: e.amount,
        taxAmount: e.taxAmount || 0,
        totalAmount: e.totalAmount || e.amount,
        paymentMethod: e.paymentMethod,
        paymentStatus: e.status,
        reference: e.reference || "-",
      })),
    },
    cashReconciliation: {
      openingBalance: openingCash,
      cashCollections: cashReceived,
      cashExpenses: cashPaidOut,
      expectedClosingCash,
      actualClosingCash: null,
      discrepancy: null,
      collectionsByInstrument: {
        cash: collectionsByMethod.CASH || 0,
        upi: collectionsByMethod.UPI || 0,
        card: collectionsByMethod.CARD || 0,
        bankTransfer: collectionsByMethod.BANK_TRANSFER || 0,
        cheque: collectionsByMethod.CHEQUE || 0,
        other: collectionsByMethod.OTHER || 0,
      },
    },
    charts: {
      dailyTrend: chartPoints,
      revenueSplit: [
        { name: "Room Revenue", value: Math.round(curRevenue.roomRev) },
        { name: "Food & Beverage", value: Math.round(curRevenue.fbRev) },
        { name: "Other Services", value: Math.round(curRevenue.otherRev) },
      ].filter((x) => x.value > 0),
      collectionsByMethod: Object.entries(collectionsByMethod)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .filter((x) => x.value > 0),
      expensesByCategory: Object.entries(expByCategory)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .filter((x) => x.value > 0),
      receivablesAging: agingBuckets.map((b) => ({
        name: b.name,
        count: b.count,
        amount: Math.round(b.amount),
      })),
    },
    insights: {
      dailyBrief,
      upcomingArrivalsNext48h: upcomingArrivals,
      upcomingDeparturesNext48h: upcomingDepartures,
      cancellationsCount,
      overdueCheckedOutCount: overdueCheckedOut,
      netOperationalSurplus: Math.round((curRevenue.totalRev - curTotalExpenses) * 100) / 100,
    },
  };
}
