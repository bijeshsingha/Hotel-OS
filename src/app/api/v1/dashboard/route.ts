import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ensurePropertyDateSynchronized } from "@/lib/domain/night-audit-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    // Auto-sync property business date to today
    await ensurePropertyDateSynchronized(propertyId);

    const property = await prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
      include: {
        organization: {
          include: {
            properties: {
              include: {
                rooms: { where: { active: true } },
                stays: { where: { status: "IN_HOUSE" } },
              },
            },
          },
        },
        rooms: {
          where: { active: true },
          include: { roomState: true, blocks: { where: { status: "ACTIVE" } } },
        },
      },
    });

    const currentDate = property.businessDate;
    const todayStart = new Date(`${currentDate}T00:00:00.000Z`);
    const todayEnd = new Date(`${currentDate}T23:59:59.999Z`);

    // 1. Current property live room stats
    const totalRooms = property.rooms.length;
    const inHouseStays = await prisma.stay.count({
      where: { propertyId, status: "IN_HOUSE" },
    });

    const outOfOrderRooms = property.rooms.filter(
      (r) => r.roomState?.sellabilityStatus === "OUT_OF_ORDER" || r.blocks.length > 0
    ).length;

    const availableRooms = Math.max(0, totalRooms - inHouseStays - outOfOrderRooms);
    const occupancyPct = totalRooms > 0 ? Math.round((inHouseStays / totalRooms) * 1000) / 10 : 0;

    // Housekeeping room counts
    const dirtyRooms = property.rooms.filter((r) => r.roomState?.housekeepingStatus === "DIRTY").length;
    const cleanRooms = property.rooms.filter((r) => r.roomState?.housekeepingStatus === "CLEAN").length;
    const inspectedRooms = property.rooms.filter((r) => r.roomState?.housekeepingStatus === "INSPECTED").length;

    // 2. Arrivals & Departures
    const arrivalsToday = await prisma.reservation.count({
      where: { propertyId, arrivalDate: currentDate, status: { in: ["CONFIRMED", "TENTATIVE"] } },
    });

    const rawArrivals = await prisma.reservation.findMany({
      where: { propertyId, arrivalDate: currentDate, status: { in: ["CONFIRMED", "TENTATIVE"] } },
      include: {
        primaryGuest: true,
        rooms: true,
      },
      take: 6,
    });

    const arrivalsList = rawArrivals.map((r) => ({
      id: r.id,
      confirmationNo: r.confirmationNo,
      primaryGuestName: r.primaryGuest?.name || "Guest",
      status: r.status,
      roomCount: r.rooms.length || 1,
    }));

    const allInHouseStays = await prisma.stay.findMany({
      where: { propertyId, status: "IN_HOUSE" },
      include: {
        primaryGuest: { select: { name: true, phone: true } },
        roomAssignments: { where: { endsAt: null }, include: { room: true } },
        folio: { select: { balance: true } },
      },
    });

    const todayDepartures = allInHouseStays
      .filter((s) => s.expectedDepartureAt.toISOString().split("T")[0] === currentDate)
      .map((s) => ({
        id: s.id,
        guestName: s.primaryGuest?.name || "Guest",
        roomNumbers: s.roomAssignments.map((ra) => ra.room.number).join(", ") || "Assigned",
        balance: s.folio?.balance || 0,
        departureTime: s.expectedDepartureAt.toISOString(),
      }));

    const departuresToday = todayDepartures.length;

    // 3. Financial calculations for today
    const dayEntries = await prisma.folioEntry.findMany({
      where: { propertyId, serviceDate: currentDate, status: "POSTED" },
    });

    const roomRevenue = dayEntries
      .filter((e) => e.chargeCode === "ROOM_TARIFF")
      .reduce((sum, e) => sum + e.taxableAmount, 0);

    const fbRevenue = dayEntries
      .filter((e) => e.chargeCode === "RESTAURANT_FOOD" || e.chargeCode.includes("FB"))
      .reduce((sum, e) => sum + e.taxableAmount, 0);

    const otherRevenue = dayEntries
      .filter((e) => e.chargeCode !== "ROOM_TARIFF" && !e.chargeCode.includes("FB") && e.chargeCode !== "RESTAURANT_FOOD")
      .reduce((sum, e) => sum + e.taxableAmount, 0);

    const totalTaxes = dayEntries.reduce((sum, e) => sum + (e.totalAmount - e.taxableAmount), 0);
    const grossRevenue = roomRevenue + fbRevenue + otherRevenue;

    const adr = inHouseStays > 0 ? Math.round(roomRevenue / inHouseStays) : 4850;
    const revpar = totalRooms > 0 ? Math.round(roomRevenue / totalRooms) : 3650;

    // 4. Payments, Collections & Hourly Velocity
    const todayPayments = await prisma.payment.findMany({
      where: {
        propertyId,
        status: "SUCCEEDED",
        receivedAt: { gte: todayStart, lte: todayEnd },
      },
      select: { amount: true, method: true, receivedAt: true },
    });

    const collectionsByMethod: Record<string, number> = {
      UPI: 0,
      CASH: 0,
      CARD: 0,
      OTA_VCC: 0,
      BANK_TRANSFER: 0,
      DIRECT_BILL: 0,
    };
    for (const p of todayPayments) {
      collectionsByMethod[p.method] = (collectionsByMethod[p.method] || 0) + p.amount;
    }
    const totalTodayCollections = Object.values(collectionsByMethod).reduce((sum, v) => sum + v, 0);

    // Hourly collections distribution
    const hourlyMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyMap[h] = 0;
    for (const p of todayPayments) {
      const hr = new Date(p.receivedAt).getHours();
      hourlyMap[hr] = (hourlyMap[hr] || 0) + p.amount;
    }
    const hourlyCollections = Object.entries(hourlyMap).map(([hr, amt]) => ({
      hour: `${String(hr).padStart(2, "0")}:00`,
      amount: amt,
    }));

    // 5. Today's Expenses & Till Position
    const todayExpenses = await prisma.expense.findMany({
      where: {
        propertyId,
        status: "PAID",
        OR: [
          { businessDate: currentDate },
          { paidAt: { gte: todayStart, lte: todayEnd } },
        ],
      },
      select: { totalAmount: true, paymentMethod: true, category: true },
    });
    const totalTodayExpenses = todayExpenses.reduce((sum, e) => sum + e.totalAmount, 0);

    const baseOpening = property.openingCashBalance || 0;
    const todayCashIn = collectionsByMethod["CASH"] || 0;
    const todayCashOut = todayExpenses
      .filter((e) => e.paymentMethod === "CASH")
      .reduce((sum, e) => sum + e.totalAmount, 0);
    const netCashInHand = Math.round((baseOpening + todayCashIn - todayCashOut) * 100) / 100;

    // 6. Outstanding Folio Balances & High-Dues
    const openFolios = await prisma.folio.findMany({
      where: { propertyId, status: "OPEN" },
      include: {
        stay: {
          include: {
            primaryGuest: { select: { name: true, phone: true } },
            roomAssignments: { where: { endsAt: null }, include: { room: true } },
          },
        },
      },
      orderBy: { balance: "desc" },
    });

    const outstandingFolioBalance = openFolios.reduce((sum, f) => sum + f.balance, 0);
    const urgentFolios = openFolios
      .filter((f) => f.balance > 0 && f.stay)
      .slice(0, 5)
      .map((f) => ({
        id: f.id,
        stayId: f.stayId,
        guestName: f.stay?.primaryGuest?.name || "Guest",
        roomNumbers: f.stay?.roomAssignments.map((ra) => ra.room.number).join(", ") || "—",
        balance: f.balance,
      }));

    // 7. Kitchen & Dining Status
    const openKots = await prisma.kOT.count({
      where: { propertyId, status: { in: ["QUEUED", "PREPARING", "READY"] } },
    });

    // 8. 14-day history for charts
    const metricSnapshots = await prisma.metricSnapshot.findMany({
      where: { propertyId },
      orderBy: { businessDate: "asc" },
    });

    const historyMap = new Map<string, any>();
    for (const m of metricSnapshots) {
      const row = historyMap.get(m.businessDate) || { date: m.businessDate };
      row[m.metricCode] = m.value;
      historyMap.set(m.businessDate, row);
    }
    const trendHistory = Array.from(historyMap.values()).slice(-14);

    // 9. Multi-property comparative overview
    const propertiesComparison = property.organization.properties.map((p) => {
      const pTotal = p.rooms.length;
      const pInHouse = p.stays.length;
      const pOcc = pTotal > 0 ? Math.round((pInHouse / pTotal) * 100) : 0;
      return {
        id: p.id,
        name: p.displayName,
        code: p.code,
        city: p.stateCode === "18" ? "Guwahati, Assam" : "Shillong, Meghalaya",
        totalRooms: pTotal,
        inHouseStays: pInHouse,
        occupancyPct: pOcc,
        status: p.status,
      };
    });

    return NextResponse.json({
      property: {
        id: property.id,
        code: property.code,
        name: property.displayName,
        legalName: property.legalName,
        gstin: property.gstin,
        stateCode: property.stateCode,
        businessDate: currentDate,
        currency: property.currency,
        openingCashBalance: property.openingCashBalance,
      },
      kpis: {
        totalRooms,
        inHouseStays,
        availableRooms,
        occupancyPct,
        adr,
        revpar,
        roomRevenue,
        fbRevenue,
        otherRevenue,
        grossRevenue,
        totalTaxes,
        totalTodayCollections,
        totalTodayExpenses,
        outstandingFolioBalance,
        arrivalsToday,
        departuresToday,
        openKots,
        outOfOrderRooms,
        dirtyRooms,
        cleanRooms,
        inspectedRooms,
      },
      cashDrawerPosition: {
        openingBalance: baseOpening,
        cashIn: todayCashIn,
        cashOut: todayCashOut,
        netCashInHand,
      },
      collectionsByMethod,
      hourlyCollections,
      arrivalsList,
      todayDepartures,
      urgentFolios,
      trendHistory,
      propertiesComparison,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
