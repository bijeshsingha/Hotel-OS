import { prisma } from "../db/prisma";
import { calculateGST } from "../gst/calculator";

export interface NightAuditChecklist {
  businessDate: string;
  openArrivalsCount: number;
  openDeparturesCount: number;
  openKotsCount: number;
  unpostedStaysCount: number;
  inHouseStaysCount: number;
  canClose: boolean;
  warnings: string[];
}

export async function runNightAuditChecks(propertyId: string): Promise<NightAuditChecklist> {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
  });

  const currentDate = property.businessDate;

  // 1. Pending Arrivals
  const pendingArrivals = await prisma.reservation.count({
    where: {
      propertyId,
      arrivalDate: currentDate,
      status: { in: ["CONFIRMED", "TENTATIVE"] },
    },
  });

  // 2. Pending Departures
  const inHouseStays = await prisma.stay.findMany({
    where: {
      propertyId,
      status: "IN_HOUSE",
    },
    include: {
      folio: {
        include: {
          entries: { where: { serviceDate: currentDate, chargeCode: "ROOM_TARIFF" } },
        },
      },
    },
  });

  const pendingDepartures = inHouseStays.filter((s) => {
    const depDate = s.expectedDepartureAt.toISOString().split("T")[0];
    return depDate === currentDate;
  }).length;

  // 3. Open KOTs / POS Orders
  const openOrders = await prisma.order.count({
    where: {
      propertyId,
      status: { in: ["OPEN", "KOT_SENT", "PARTIALLY_READY", "READY", "BILLED"] },
    },
  });

  // 4. Unposted Room Charges
  const unpostedStays = inHouseStays.filter((s) => {
    const hasNightlyCharge = (s.folio?.entries.length || 0) > 0;
    return !hasNightlyCharge;
  });

  const warnings: string[] = [];
  if (pendingArrivals > 0) warnings.push(`${pendingArrivals} confirmed arrivals not checked in.`);
  if (pendingDepartures > 0) warnings.push(`${pendingDepartures} due-out departures not checked out.`);
  if (openOrders > 0) warnings.push(`${openOrders} open restaurant orders / KOTs active.`);
  if (unpostedStays.length > 0) warnings.push(`${unpostedStays.length} in-house rooms require nightly charge posting.`);

  return {
    businessDate: currentDate,
    openArrivalsCount: pendingArrivals,
    openDeparturesCount: pendingDepartures,
    openKotsCount: openOrders,
    unpostedStaysCount: unpostedStays.length,
    inHouseStaysCount: inHouseStays.length,
    canClose: openOrders === 0 && unpostedStays.length === 0,
    warnings,
  };
}

export async function postNightlyRoomCharges(propertyId: string) {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
  });

  const currentDate = property.businessDate;

  const inHouseStays = await prisma.stay.findMany({
    where: {
      propertyId,
      status: "IN_HOUSE",
    },
    include: {
      folio: {
        include: {
          windows: true,
          entries: {
            where: {
              serviceDate: currentDate,
              chargeCode: "ROOM_TARIFF",
            },
          },
        },
      },
      roomAssignments: {
        where: { endsAt: null },
        include: {
          room: { include: { roomType: true } },
        },
      },
    },
  });

  const postedResults = [];

  for (const stay of inHouseStays) {
    if (!stay.folio || stay.folio.status !== "OPEN") continue;

    // Idempotency: skip if already posted for this date
    if (stay.folio.entries.length > 0) {
      postedResults.push({
        stayId: stay.id,
        status: "ALREADY_POSTED",
      });
      continue;
    }

    const activeAssignment = stay.roomAssignments[0];
    const room = activeAssignment?.room;
    
    // Determine exact agreed rate for this stay/room
    let baseTariff = 3200;
    const isComp = activeAssignment?.rateHandling === "COMPLIMENTARY" || activeAssignment?.moveReason === "AGREED_RATE:0";
    
    if (isComp) {
      baseTariff = 0;
    } else if (activeAssignment?.moveReason?.startsWith("AGREED_RATE:")) {
      baseTariff = Number(activeAssignment.moveReason.replace("AGREED_RATE:", "")) || 3200;
    } else {
      // Look up initial posted room charge on this folio to maintain exact tariff consistency
      const prevEntry = await prisma.folioEntry.findFirst({
        where: { folioId: stay.folio.id, chargeCode: "ROOM_TARIFF" },
        orderBy: { createdAt: "asc" },
      });
      if (prevEntry && prevEntry.unitAmount !== undefined) {
        baseTariff = prevEntry.unitAmount;
      }
    }

    const gst = isComp || baseTariff === 0
      ? { taxableAmount: 0, taxAmount: 0, totalAmount: 0, components: [] }
      : calculateGST({
          grossOrBaseAmount: baseTariff,
          isInclusive: true,
          sacHsn: "996311",
          supplierStateCode: property.stateCode || "18",
          customTaxRate: 5,
        });

    const primaryWindow = stay.folio.windows[0];

    const entry = await prisma.folioEntry.create({
      data: {
        organizationId: property.organizationId,
        propertyId: property.id,
        folioId: stay.folio.id,
        folioWindowId: primaryWindow.id,
        serviceDate: currentDate,
        type: "CHARGE",
        chargeCode: "ROOM_TARIFF",
        description: isComp || baseTariff === 0
          ? `Room Tariff - Room ${room?.number || "Stay"} (${currentDate} - COMPLIMENTARY)`
          : `Room Tariff - Room ${room?.number || "Stay"} (${currentDate})`,
        qty: 1,
        unitAmount: baseTariff,
        taxableAmount: gst.taxableAmount,
        taxComponentsJson: JSON.stringify(gst.components),
        totalAmount: gst.totalAmount,
        sourceType: "PMS_NIGHTLY_CHARGE",
        status: "POSTED",
      },
    });

    await prisma.folio.update({
      where: { id: stay.folio.id },
      data: {
        balance: { increment: gst.totalAmount },
      },
    });

    postedResults.push({
      stayId: stay.id,
      roomNumber: room?.number,
      totalPosted: gst.totalAmount,
      status: "POSTED",
    });
  }

  return postedResults;
}

export async function closeOperationalDay(
  propertyId: string,
  actorId?: string,
  overridesJson?: string
) {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: { rooms: { where: { active: true } } },
  });

  const currentDate = property.businessDate;

  // 1. Calculate operational metrics for the day
  const totalRooms = property.rooms.length;
  const inHouseStays = await prisma.stay.count({
    where: { propertyId, status: "IN_HOUSE" },
  });

  const roomsSold = inHouseStays;
  const occupancyPct = totalRooms > 0 ? (roomsSold / totalRooms) * 100 : 0;

  // Charges posted on this date
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

  const adr = roomsSold > 0 ? roomRevenue / roomsSold : 0;
  const revpar = totalRooms > 0 ? roomRevenue / totalRooms : 0;

  // Receipts collected today
  const payments = await prisma.payment.findMany({
    where: { propertyId, status: "SUCCEEDED" },
  });
  const netReceipts = payments.reduce((sum, p) => sum + p.amount, 0);

  // 2. Snapshot metrics in database
  const metricsToStore = [
    { code: "OCCUPANCY_PCT", val: Math.round(occupancyPct * 10) / 10 },
    { code: "ADR", val: Math.round(adr * 100) / 100 },
    { code: "REVPAR", val: Math.round(revpar * 100) / 100 },
    { code: "ROOM_REVENUE", val: Math.round(roomRevenue * 100) / 100 },
    { code: "FB_REVENUE", val: Math.round(fbRevenue * 100) / 100 },
    { code: "GROSS_REVENUE", val: Math.round(grossRevenue * 100) / 100 },
    { code: "TOTAL_TAX", val: Math.round(totalTaxes * 100) / 100 },
    { code: "NET_RECEIPTS", val: Math.round(netReceipts * 100) / 100 },
  ];

  for (const m of metricsToStore) {
    await prisma.metricSnapshot.upsert({
      where: {
        propertyId_businessDate_metricCode: {
          propertyId,
          businessDate: currentDate,
          metricCode: m.code,
        },
      },
      create: {
        organizationId: property.organizationId,
        propertyId,
        businessDate: currentDate,
        metricCode: m.code,
        value: m.val,
      },
      update: {
        value: m.val,
      },
    });
  }

  // 3. Mark Operational Day closed
  const opDay = await prisma.operationalDay.upsert({
    where: {
      propertyId_businessDate: {
        propertyId,
        businessDate: currentDate,
      },
    },
    create: {
      organizationId: property.organizationId,
      propertyId,
      businessDate: currentDate,
      status: "CLOSED",
      closedAt: new Date(),
      closedById: actorId,
      overridesJson,
    },
    update: {
      status: "CLOSED",
      closedAt: new Date(),
      closedById: actorId,
      overridesJson,
    },
  });

  await prisma.nightAuditRun.create({
    data: {
      organizationId: property.organizationId,
      propertyId,
      operationalDayId: opDay.id,
      status: "COMPLETED",
      checklistSnapshot: JSON.stringify({ inHouseStays, roomsSold, totalRooms }),
      totalsSnapshot: JSON.stringify({
        roomRevenue,
        fbRevenue,
        totalTaxes,
        grossRevenue,
        occupancyPct,
        adr,
        revpar,
      }),
      completedById: actorId,
      completedAt: new Date(),
    },
  });

  // 4. Advance Business Date by 1 day
  const curr = new Date(currentDate);
  curr.setDate(curr.getDate() + 1);
  const nextBusinessDate = curr.toISOString().split("T")[0];

  await prisma.property.update({
    where: { id: propertyId },
    data: { businessDate: nextBusinessDate },
  });

  // Open new Operational Day
  await prisma.operationalDay.create({
    data: {
      organizationId: property.organizationId,
      propertyId,
      businessDate: nextBusinessDate,
      status: "OPEN",
      openedById: actorId,
    },
  });

  // 5. Audit Log
  await prisma.auditLog.create({
    data: {
      organizationId: property.organizationId,
      propertyId,
      actorId,
      action: "NIGHT_AUDIT_CLOSE",
      targetType: "OPERATIONAL_DAY",
      targetId: opDay.id,
      afterJson: JSON.stringify({
        closedDate: currentDate,
        nextDate: nextBusinessDate,
        roomRevenue,
        fbRevenue,
        occupancyPct,
      }),
    },
  });

  return {
    closedDate: currentDate,
    nextBusinessDate,
    summary: {
      roomsSold,
      occupancyPct: Math.round(occupancyPct * 10) / 10,
      roomRevenue,
      fbRevenue,
      grossRevenue,
      totalTaxes,
    },
  };
}
