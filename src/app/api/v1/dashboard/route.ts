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

    // 1. Current property live stats
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

    // Arrivals & Departures
    const arrivalsToday = await prisma.reservation.count({
      where: { propertyId, arrivalDate: currentDate, status: { in: ["CONFIRMED", "TENTATIVE"] } },
    });

    const staysList = await prisma.stay.findMany({
      where: { propertyId, status: "IN_HOUSE" },
    });
    const departuresToday = staysList.filter((s) => {
      return s.expectedDepartureAt.toISOString().split("T")[0] === currentDate;
    }).length;

    // Financial calculations for today
    const dayEntries = await prisma.folioEntry.findMany({
      where: { propertyId, serviceDate: currentDate, status: "POSTED" },
    });

    const roomRevenue = dayEntries
      .filter((e) => e.chargeCode === "ROOM_TARIFF")
      .reduce((sum, e) => sum + e.taxableAmount, 0);

    const fbRevenue = dayEntries
      .filter((e) => e.chargeCode === "RESTAURANT_FOOD" || e.chargeCode.includes("FB"))
      .reduce((sum, e) => sum + e.taxableAmount, 0);

    const totalTaxes = dayEntries.reduce((sum, e) => sum + (e.totalAmount - e.taxableAmount), 0);
    const grossRevenue = roomRevenue + fbRevenue;

    const adr = inHouseStays > 0 ? Math.round(roomRevenue / inHouseStays) : 4850;
    const revpar = totalRooms > 0 ? Math.round(roomRevenue / totalRooms) : 3650;

    // Total outstanding folio balance
    const folios = await prisma.folio.findMany({
      where: { propertyId, status: "OPEN" },
    });
    const outstandingFolioBalance = folios.reduce((sum, f) => sum + f.balance, 0);

    // Open KOTs count
    const openKots = await prisma.kOT.count({
      where: { propertyId, status: { in: ["QUEUED", "PREPARING", "READY"] } },
    });

    // 2. Fetch 14-day history for charts
    const metricSnapshots = await prisma.metricSnapshot.findMany({
      where: { propertyId },
      orderBy: { businessDate: "asc" },
    });

    // Pivot snapshots into date rows
    const historyMap = new Map<string, any>();
    for (const m of metricSnapshots) {
      const row = historyMap.get(m.businessDate) || { date: m.businessDate };
      row[m.metricCode] = m.value;
      historyMap.set(m.businessDate, row);
    }
    const trendHistory = Array.from(historyMap.values()).slice(-14);

    // 3. Multi-property comparative overview
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
        grossRevenue,
        totalTaxes,
        outstandingFolioBalance,
        arrivalsToday,
        departuresToday,
        openKots,
        outOfOrderRooms,
        dirtyRooms,
        cleanRooms,
        inspectedRooms,
      },
      trendHistory,
      propertiesComparison,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
