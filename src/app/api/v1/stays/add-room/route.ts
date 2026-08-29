import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateGST } from "@/lib/gst/calculator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      stayId,
      roomId,
      agreedTariff,
      isComplimentary,
      extraBeds = 0,
      extraBedRate = 500,
      actorId,
    } = body;

    if (!stayId) {
      return NextResponse.json({ error: "stayId is required." }, { status: 400 });
    }
    if (!roomId) {
      return NextResponse.json({ error: "roomId is required." }, { status: 400 });
    }

    // 1. Fetch Stay with existing Folio, Guest, and Property
    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
      include: {
        property: true,
        primaryGuest: true,
        roomAssignments: { where: { endsAt: null }, include: { room: true } },
        folio: {
          include: {
            windows: true,
          },
        },
      },
    });

    if (!stay) {
      return NextResponse.json({ error: "Stay not found." }, { status: 404 });
    }

    if (stay.status !== "IN_HOUSE") {
      return NextResponse.json(
        { error: `Cannot add room to stay with status ${stay.status}. Guest must be IN_HOUSE.` },
        { status: 400 }
      );
    }

    // 2. Fetch Room & verify vacancy
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { roomState: true, roomType: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    if (room.roomState?.occupancyStatus === "OCCUPIED") {
      return NextResponse.json(
        { error: `Room ${room.number} is already occupied.` },
        { status: 400 }
      );
    }

    const property = stay.property;
    const serviceDateStr = property.businessDate || new Date().toISOString().split("T")[0];

    // Calculate nights remaining
    const start = new Date(stay.arrivalAt);
    const end = new Date(stay.expectedDepartureAt);
    const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    // 3. Determine Rate
    const isFree = Boolean(isComplimentary || agreedTariff === 0);
    let finalRate = 3200;
    if (isFree) {
      finalRate = 0;
    } else if (agreedTariff !== undefined && agreedTariff !== null && agreedTariff !== "") {
      finalRate = Number(agreedTariff);
    } else if (room.roomTypeId) {
      const rateVersion = await prisma.ratePlanVersion.findFirst({
        where: { roomTypeId: room.roomTypeId, active: true },
        orderBy: { createdAt: "desc" },
      });
      if (rateVersion?.pricingJson) {
        try {
          const pricing = JSON.parse(rateVersion.pricingJson);
          if (pricing.basePrice) finalRate = Number(pricing.basePrice);
        } catch {}
      }
    }

    // 4. Create RoomAssignment
    const assignment = await prisma.roomAssignment.create({
      data: {
        stayId: stay.id,
        roomId: room.id,
        startsAt: new Date(),
        moveReason: `AGREED_RATE:${finalRate}`,
        rateHandling: isFree ? "COMPLIMENTARY" : "RETAIN_RATE",
      },
    });

    // 5. Update RoomState to OCCUPIED
    await prisma.roomState.upsert({
      where: { roomId: room.id },
      create: {
        organizationId: property.organizationId,
        propertyId: property.id,
        roomId: room.id,
        occupancyStatus: "OCCUPIED",
        housekeepingStatus: room.roomState?.housekeepingStatus || "CLEAN",
        sellabilityStatus: "SELLABLE",
      },
      update: {
        occupancyStatus: "OCCUPIED",
        lastChangedAt: new Date(),
      },
    });

    // 6. Post charges to Folio if Folio exists
    let totalBalanceAdded = 0;
    if (stay.folio) {
      const primaryWindow = stay.folio.windows[0] || (await prisma.folioWindow.create({
        data: {
          folioId: stay.folio.id,
          name: "Guest Window",
          windowNumber: 1,
          payerType: "GUEST",
          status: "OPEN",
        },
      }));

      const totalStayPrice = finalRate * nights;
      const roomGst = isFree
        ? { taxableAmount: 0, taxAmount: 0, totalAmount: 0, components: [] }
        : calculateGST({
            grossOrBaseAmount: totalStayPrice,
            isInclusive: true,
            sacHsn: "996311",
            supplierStateCode: property.stateCode || "18",
            customTaxRate: 5,
          });

      await prisma.folioEntry.create({
        data: {
          organizationId: property.organizationId,
          propertyId: property.id,
          folioId: stay.folio.id,
          folioWindowId: primaryWindow.id,
          serviceDate: serviceDateStr,
          type: "CHARGE",
          chargeCode: "ROOM_TARIFF",
          description: isFree
            ? `Room Tariff - Room ${room.number} (${nights} Night${nights > 1 ? "s" : ""} - COMPLIMENTARY)`
            : `Room Tariff - Room ${room.number} (${nights} Night${nights > 1 ? "s" : ""})`,
          qty: nights,
          unitAmount: finalRate,
          taxableAmount: roomGst.taxableAmount,
          taxComponentsJson: JSON.stringify(roomGst.components),
          totalAmount: roomGst.totalAmount,
          sourceType: "PMS_NIGHTLY_CHARGE",
          status: "POSTED",
        },
      });

      totalBalanceAdded += roomGst.totalAmount;

      // Post Extra Bed if requested
      if (extraBeds > 0) {
        const extraBedTotal = extraBeds * extraBedRate * nights;
        const extraBedGst = calculateGST({
          grossOrBaseAmount: extraBedTotal,
          isInclusive: true,
          sacHsn: "996311",
          supplierStateCode: property.stateCode || "18",
          customTaxRate: 5,
        });

        await prisma.folioEntry.create({
          data: {
            organizationId: property.organizationId,
            propertyId: property.id,
            folioId: stay.folio.id,
            folioWindowId: primaryWindow.id,
            serviceDate: serviceDateStr,
            type: "CHARGE",
            chargeCode: "EXTRA_PAX",
            description: `Extra Pax - Room ${room.number} (${extraBeds} Pax x ₹${extraBedRate}/night x ${nights} Night${nights > 1 ? "s" : ""})`,
            qty: extraBeds * nights,
            unitAmount: extraBedRate,
            taxableAmount: extraBedGst.taxableAmount,
            taxComponentsJson: JSON.stringify(extraBedGst.components),
            totalAmount: extraBedGst.totalAmount,
            sourceType: "PMS_NIGHTLY_CHARGE",
            status: "POSTED",
          },
        });

        totalBalanceAdded += extraBedGst.totalAmount;
      }

      // Update Folio Balance
      await prisma.folio.update({
        where: { id: stay.folio.id },
        data: {
          balance: { increment: totalBalanceAdded },
        },
      });
    }

    // 7. Record Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: property.organizationId,
        propertyId: property.id,
        actorId,
        action: "STAY_ADD_ROOM",
        targetType: "STAY",
        targetId: stay.id,
        afterJson: JSON.stringify({
          addedRoomId: room.id,
          roomNumber: room.number,
          agreedRate: finalRate,
          isComplimentary: isFree,
          balanceAdded: totalBalanceAdded,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Room ${room.number} added to Stay successfully.`,
      assignment,
      stayId: stay.id,
      roomNumber: room.number,
      totalPosted: totalBalanceAdded,
    });
  } catch (error: any) {
    console.error("Error adding room to stay:", error);
    return NextResponse.json({ error: error.message || "Failed to add room to stay" }, { status: 500 });
  }
}
